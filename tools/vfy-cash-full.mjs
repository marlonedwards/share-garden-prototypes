// Finish the cash lesson correctly (the sort screen needs right answers) and
// check that a learn-cash row lands in beta-checks and the marble clears.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(`${BASE}/#/orb/learn/cash`);
await wait(800);

const cont = page.getByRole("button", { name: /^(Continue|Finish)$/ });
const clicks = [
  ["Sell the cup", "Spend it at the bakery"],
  ["Count the jar", "Count it again, years later"],
  [],                                   // slider screen
  ["Fewer pairs than it could on day one"],
  ["The loud risk", "The quiet risk"],
  null,                                 // sort screen, handled below
  ["Price tags drifting up a few percent every year"],
];
for (let step = 0; step < 7; step++) {
  const label = await page.locator("text=/^Step \\d+ of \\d+$/").first().innerText();
  const plan = clicks[step];
  if (plan === null) {
    for (const [row, home] of [["Bus fare for next week", "The jar"], ["The emergency cushion", "The jar"], ["Money with ten years to wait", "Somewhere it can earn"]]) {
      const r = page.locator("main div").filter({ has: page.getByText(row, { exact: true }) }).last();
      await r.getByRole("button", { name: home, exact: true }).click();
      await wait(350);
    }
  } else if (plan.length === 0) {
    const s = page.locator("main input[type=range]:visible").first();
    await s.focus();
    for (let k = 0; k < 30; k++) { await page.keyboard.press("ArrowRight"); await wait(20); }
  } else {
    for (const name of plan) {
      const b = page.getByRole("button", { name, exact: true });
      for (let k = 0; k < 10; k++) {
        if (!(await b.count())) break;
        await b.click();
        await wait(350);
        if (!(await cont.isDisabled())) break;
      }
    }
  }
  await wait(400);
  const dis = await cont.isDisabled();
  console.log(`${label} continue ${dis ? "LOCKED" : "open"}`);
  await page.screenshot({ path: `${OUT}cash-step${step + 1}.png` });
  if (dis) { console.log("STUCK"); break; }
  await cont.click();
  await wait(600);
}
console.log("landed on", page.url().split("#")[1]);
console.log("beta-checks:", await page.evaluate(() => localStorage.getItem("beta-checks")));
await wait(600);
const strip = await page.locator("text=Start here: the basics").locator("../..").innerText().catch(() => "n/a");
console.log("=== STRIP ===\n" + strip);
await page.screenshot({ path: OUT + "select-after-cash.png", fullPage: true });
await browser.close();
