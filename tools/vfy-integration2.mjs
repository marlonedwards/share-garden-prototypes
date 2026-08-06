// Drives every intro lesson to the end, checks layout law per screen, then
// checks the select strip updates. node tools/vfy-integration2.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

// count visible white card components inside the lesson main
const cardCount = () => page.evaluate(() => {
  const main = document.querySelector("main") ?? document.body;
  return [...main.querySelectorAll("*")].filter((el) => {
    const c = el.className;
    if (typeof c !== "string") return false;
    if (!/(^|\s)rounded-(xl|2xl|3xl)(\s|$)/.test(c)) return false;
    if (!/bg-white|border-black\/8/.test(c)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 200 && r.height > 60;
  }).length;
});

const scrolls = () => page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 6);

async function poke() {
  // 1. quick-check options
  const cont0 = page.getByRole("button", { name: /^(Continue|Finish)$/ }).first();
  const opts = page.locator("button.text-left:visible");
  const nO = await opts.count();
  if (nO) {
    for (let i = 0; i < nO; i++) {
      try { await opts.nth(i).click({ timeout: 1200 }); } catch { }
      await wait(280);
      if (await cont0.isEnabled()) return;
    }
    return;
  }
  // 2. sliders
  const sl = page.locator("input[type=range]:visible");
  if (await sl.count()) {
    const nS = await sl.count();
    for (let j = 0; j < nS; j++) {
      const el = sl.nth(j);
      await el.focus();
      for (let i = 0; i < 40; i++) {
        await el.press("ArrowRight");
        await wait(40);
        if (await cont0.isEnabled()) return;
      }
      await el.press("End");
      await wait(300);
      if (await cont0.isEnabled()) return;
      for (let i = 0; i < 40; i++) { await el.press("ArrowLeft"); await wait(30); }
      await wait(200);
      if (await cont0.isEnabled()) return;
    }
  }
  // 3. any other visible button in the stage (not Continue, not the header)
  const btns = page.locator("main button:visible");
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    const t = (await btns.nth(i).innerText()).trim();
    if (/^(Continue|Finish)$/.test(t)) continue;
    const c = page.getByRole("button", { name: /^(Continue|Finish)$/ }).first();
    for (let k = 0; k < 8; k++) {
      try { await btns.nth(i).click({ timeout: 1200 }); } catch { break; }
      await wait(220);
      if (await c.isEnabled()) return;
    }
    if (await c.isEnabled()) return;
  }
  // 4. draggables / tap targets
  const taps = page.locator("main [role=button]:visible, main [tabindex]:visible");
  const m = Math.min(await taps.count(), 8);
  for (let i = 0; i < m; i++) { try { await taps.nth(i).click({ timeout: 1000 }); await wait(150); } catch { } }
}

for (const id of ["cash", "savings", "stocks", "funds", "coins"]) {
  await page.goto(`${BASE}/#/orb/learn/${id}`);
  await wait(700);
  const seen = [];
  let guard = 0;
  while (guard++ < 30) {
    const body = await page.locator("body").innerText();
    const prog = (body.match(/Step (\d+) of (\d+)/) || []);
    const cards = await cardCount();
    const sc = await scrolls();
    const isCheck = body.includes("Answer the question to move on.") || (await page.locator("button.text-left:visible").count()) > 0;
    seen.push(`${prog[0] || "?"} cards=${cards}${sc ? " SCROLLS" : ""}${isCheck ? " CHECK" : ""}`);
    await page.screenshot({ path: OUT + `lesson-${id}-s${prog[1] ?? guard}.png` });
    const cont = page.getByRole("button", { name: /^(Continue|Finish)$/ }).first();
    if (!(await cont.isEnabled())) await poke();
    if (!(await cont.isEnabled())) { seen.push("  !! STUCK, Continue never enabled"); break; }
    const last = prog[1] === prog[2];
    await cont.click();
    await wait(500);
    if (last || !page.url().includes("/learn/")) break;
  }
  console.log(`\n=== ${id} ===\n` + seen.join("\n") + `\nended at url ${page.url().split("#")[1]}`);
}

await page.goto(`${BASE}/#/orb`);
await wait(900);
const sel = await page.locator("body").innerText();
console.log("\nSELECT marbles line:", (sel.match(/\d+ of \d+ marbles/) || [])[0]);
console.log("strip states:", JSON.stringify(sel.match(/The marble is (cleared|still setting|waiting)\./g)));
await page.screenshot({ path: OUT + "select-after-lessons.png", fullPage: true });
await browser.close();
