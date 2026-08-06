// Throwaway verifier part 2: play dotcom with real trades, then the quiz.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const B = "http://localhost:4332";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const shot = async (n) => { await page.screenshot({ path: OUT + n + ".png" }); console.log("shot", n); };

await page.goto(B + "/#/orb/s/dotcom");
await wait(1400);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(600);
for (let i = 0; i < 10; i++) { await page.locator('button[aria-label^="Scouting report"], button[aria-label^="Flip the card"]').first().click(); await wait(350); }
await page.getByRole("button", { name: "Start in 2000" }).click();
await wait(800);

// gate 1 fires one month in; take the act option so the tape pauses for a move
await page.locator("text=February 2000").first().waitFor({ timeout: 60000 });
await wait(500);
await page.getByRole("button", { name: "Spread across everything", exact: true }).click();
await wait(700);
await shot("dq-00-after-gate1");
await page.mouse.wheel(0, 600);
await wait(1200);
const rail = page.locator("div.max-w-xs");
console.log("rail count", await rail.count(), await rail.first().innerText().catch(()=>"n/a"));
await rail.getByText("The Phone Giant", { exact: true }).first().click();
await wait(300);
let chip = page.getByRole("button", { name: /^Buy \$250$/ }).first();
if (await chip.count()) { await chip.click(); await wait(500); }
await rail.getByText("Classic Cola", { exact: true }).first().click();
await wait(300);
chip = page.getByRole("button", { name: /^Buy \$250$/ }).first();
if (await chip.count()) { await chip.click(); await wait(500); }
await shot("dq-01-bought");
{
  const play = page.getByRole("button", { name: "Play", exact: true });
  if (await play.count()) await play.first().click();
  const x4 = page.getByRole("button", { name: "4×", exact: true });
  if (await x4.count()) await x4.first().click();
}

const gates = [
  ["April 2000", "Get out of tech"],
  ["September 2001", "Sell and wait for calm"],
  ["June 2002", "Hold and hope it survives"],
  ["October 2002", "Hold what I have"],
];
for (const [t, opt] of gates) {
  await page.locator(`text=${t}`).first().waitFor({ timeout: 120000 });
  await wait(400);
  await page.getByRole("button", { name: opt, exact: true }).click();
  await wait(500);
  // act options pause the tape; sell into the panic to trigger the run-aware item
  if (opt === "Sell and wait for calm") {
    const row = page.locator("div.max-w-xs").getByText("Classic Cola", { exact: true }).first();
    if (await row.count()) {
      await row.click(); await wait(300);
      const sh = page.getByRole("button", { name: "Sell half", exact: true }).first();
      if (await sh.count()) { await sh.click(); await wait(400); }
    }
    await shot("dq-02-panic-sold");
  }
  const play = page.getByRole("button", { name: "Play", exact: true });
  if (await play.count()) await play.first().click();
  const x4 = page.getByRole("button", { name: "4×", exact: true });
  if (await x4.count()) await x4.first().click();
  await wait(300);
}

for (let k = 0; k < 120; k++) {
  if (await page.getByRole("button", { name: "Quick check" }).count()) break;
  const p2 = page.getByRole("button", { name: "Play", exact: true });
  if (await p2.count()) await p2.first().click().catch(() => {});
  const x = page.getByRole("button", { name: "4\u00d7", exact: true });
  if (await x.count()) await x.first().click().catch(() => {});
  await wait(1500);
}
await page.getByRole("button", { name: "Quick check" }).waitFor({ timeout: 60000 });
await wait(800);
await page.getByRole("button", { name: "Quick check" }).click();
await wait(700);
await shot("dq-03-quiz-1");

for (let i = 0; i < 20; i++) {
  const body = await page.evaluate(() => {
    const c = [...document.querySelectorAll("main .rounded-2xl")].pop();
    return c ? c.innerText : "";
  });
  console.log(`===== QUIZ SCREEN ${i + 1} =====\n${body}\n`);
  const r = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
  console.log(`quiz layout: scrollH=${r.sh} innerH=${r.ih}`);
  if (i === 2) await shot("dq-04-quiz-mid");
  // click first option button that is not navigation
  const nextBtn = page.getByRole("button", { name: /^(Next|See how you did|Done)/ });
  if (await nextBtn.count()) { await nextBtn.first().click(); await wait(500); continue; }
  const opts = page.locator("main button").filter({ hasNotText: /Back to the debrief|Play again|Whole shares|Real names|‹|›|Quick check|Save your orb/ });
  const n = await opts.count();
  if (n === 0) break;
  await opts.nth(Math.min(1, n - 1)).click();
  await wait(600);
}
await shot("dq-05-quiz-end");
const final = await page.evaluate(() => {
  const c = [...document.querySelectorAll("main .rounded-2xl")].pop();
  return c ? c.innerText : "";
});
console.log("FINAL QUIZ CARD:\n" + final);
await browser.close();
