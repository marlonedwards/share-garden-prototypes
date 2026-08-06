// Second adversarial pass: state retention walking backwards through every
// screen, keyboard advance, and re-entry behaviour. Throwaway.
import { chromium } from "playwright";
import { mkdirSync } from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4322";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => problems.push("PAGEERROR " + e.message));
await page.goto(`${BASE}/#/orb/learn/cash`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await wait(700);

const card = () => page.locator("main .bg-white.border:visible").first();
const cont = () => page.locator("main button:visible").filter({ hasText: /^(Continue|Finish)$/ }).first();
const info = () => page.locator("main span.tnum").first().innerText();

const RIGHT = ["Fewer pairs than it could on day one", "Price tags drifting up a few percent every year"];
const play = async () => {
  for (const txt of RIGHT) {
    const o = card().locator("button:visible", { hasText: txt });
    if (await o.count()) { await o.first().click(); await wait(250); return; }
  }
  const sl = page.locator("main input[type=range]:visible");
  if (await sl.count()) { await sl.first().focus(); for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight"); await wait(250); return; }
  const rows = card().locator("div.flex.flex-wrap");
  if (await rows.count() === 3) {
    const homes = ["The jar", "The jar", "Somewhere it can earn"];
    for (let i = 0; i < 3; i++) { await rows.nth(i).locator("button", { hasText: homes[i] }).first().click(); await wait(150); }
    return;
  }
  for (let i = 0; i < 8; i++) {
    const b = card().locator("button:visible:not([disabled])");
    if (!(await b.count())) break;
    await b.nth(Math.min(i, (await b.count()) - 1)).click(); await wait(200);
    if (!(await cont().isDisabled())) return;
  }
};

// Forward to the last step, playing correctly.
for (let s = 0; s < 7; s++) {
  if (await cont().isDisabled()) await play();
  if (await cont().isDisabled()) { problems.push(`stuck at ${await info()}`); break; }
  if (s < 6) {
    // Alternate between the button and the right-arrow key.
    if (s % 2 === 0) { await cont().click(); } else { await page.keyboard.press("ArrowRight"); }
    await wait(350);
    const now = await info();
    if (!now.includes(`${s + 2} of`)) problems.push(`advance from step ${s + 1} landed on "${now}" (${s % 2 === 0 ? "click" : "ArrowRight"})`);
  }
}
console.log("at:", await info());

// Now walk backwards with the in-lesson back arrow and confirm every stage
// still holds its finished state (Continue enabled, no reset).
for (let s = 6; s > 0; s--) {
  await page.locator("header button").first().click();
  await wait(350);
  const now = await info();
  const dis = await cont().isDisabled();
  const body = await card().innerText();
  console.log(`back -> ${now} contDisabled=${dis}`);
  console.log("   card:", body.replace(/\n+/g, " | ").slice(0, 150));
  if (dis) problems.push(`${now}: stage state lost walking back (Continue re-locked)`);
  await page.screenshot({ path: `${OUT}cash-back-${s}.png` });
}

// Forward again by keyboard to the end without re-playing anything.
for (let s = 0; s < 6; s++) { await page.keyboard.press("ArrowRight"); await wait(250); }
console.log("forward again ->", await info());
if (!(await info()).includes("7 of")) problems.push("could not walk forward again without redoing interactions");
const finishDisabled = await cont().isDisabled();
if (finishDisabled) problems.push("Finish re-locked on return to the last step");

// Re-entering the lesson fresh: does it restart at step 1 and re-lock?
await page.goto(`${BASE}/#/orb/learn/cash`);
await wait(600);
console.log("re-entry ->", await info(), "contDisabled=", await cont().isDisabled());
const guide = await page.evaluate(() => localStorage.getItem("field-guide"));
console.log("field-guide:", guide);

// Wrong-answer path: does the marble go cloudy and stay unretryable?
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/cash?step=1`);
await page.reload(); await wait(600);
for (let s = 0; s < 4; s++) {
  if (await cont().isDisabled()) {
    if (s === 3) { await card().locator("button:visible").first().click(); await wait(300); }
    else await play();
  }
  if (s < 3) { await cont().click(); await wait(300); }
}
const afterWrong = await page.evaluate(() => localStorage.getItem("field-guide"));
console.log("after wrong answer:", afterWrong, "| step:", await info());
await page.screenshot({ path: `${OUT}cash-wrong.png` });

await browser.close();
console.log("\n===== PROBLEMS =====");
console.log(problems.length ? problems.map((p) => " - " + p).join("\n") : " none");
