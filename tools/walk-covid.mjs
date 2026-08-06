// Full walk of the covid era (2019-2024, 72 steps): scout the cards, start,
// answer all five gates, trade at the first act gate, ride to the end, and
// take the five-item quick check. Modeled on tools/checkwalk.mjs.
// Run: ORB_BASE=http://localhost:4333 node tools/walk-covid.mjs
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
const BASE = process.env.ORB_BASE ?? "http://localhost:4333";

await page.goto(`${BASE}/#/orb/s/covid`);
await wait(1000);
// scouting eras deal a card deck before the start button opens
const sm = page.getByRole("button", { name: "Scout the menu" });
if (await sm.count()) {
  await sm.click();
  await wait(400);
  for (let i = 1; i <= 12; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) { await c.click(); await wait(80); }
  }
}
await page.screenshot({ path: OUT + "walk-covid-scout.png" });
await page.getByText("Start in 2019").click();
await wait(600);

// the era opens on the January 2019 market-timing gate; commit to investing
console.log("gate Jan 2019:", await page.getByText("January 2019 ·").count());
await page.screenshot({ path: OUT + "walk-covid-gate1.png" });
await page.getByRole("button", { name: "Put the money to work" }).click();
await wait(400);
// an act answer pauses the tape for the move; only click Pause if it is running
if (await page.getByRole("button", { name: "Pause" }).count()) {
  await page.getByRole("button", { name: "Pause" }).click();
}
await wait(300);
for (const nm of ["Fruit Computers", "The Everything Store"]) {
  await page.getByRole("button", { name: nm }).first().click();
  await wait(250);
  await page.getByRole("button", { name: "Buy $250" }).last().click();
  await wait(400);
}
await page.getByText("4×", { exact: true }).click();

// ride the tape through the four remaining gates
for (const [title, answer] of [
  ["March 2020 ·", "Hold and look away"],
  ["January 2021 ·", "Watch from the side"],
  ["November 2021 ·", "Change nothing"],
  ["October 2022 ·", "Hold what I own"],
]) {
  for (let i = 0; i < 30; i++) { await wait(1000); if (await page.getByText(title).count()) break; }
  console.log("gate", title, await page.getByText(title).count());
  await page.screenshot({ path: OUT + `walk-covid-${title.slice(0, 3).toLowerCase()}${title.slice(-7, -2).trim()}.png` });
  await page.getByRole("button", { name: answer }).click();
  await wait(300);
  await page.getByText("4×", { exact: true }).click();
}

// run to the end and continue through the debrief screens to the quick check
for (let i = 0; i < 40; i++) { await wait(1000); if (await page.getByText("You finished with").count()) break; }
console.log("end screen:", await page.getByText("You finished with").count());
await page.screenshot({ path: OUT + "walk-covid-end.png", fullPage: true });
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await page.getByRole("button", { name: "Quick check" }).click();
await wait(500);
console.log("quick check present:", await page.getByText("Quick check").count());

// answer every item (always the second option, then Next / See results)
for (let q = 0; q < 10; q++) {
  const counts = await page.getByText(/^\d of \d$/).count();
  if (!counts) break;
  const buttons = page.locator("button.text-left.text-\\[13px\\]");
  await buttons.nth(1).click();
  await wait(500);
  await page.getByRole("button", { name: /Next|See results/ }).click();
  await wait(500);
}
console.log("results score visible:", await page.getByText(/\d \/ \d/).count());
await page.screenshot({ path: OUT + "walk-covid-check.png", fullPage: true });
const stored = await page.evaluate(() => localStorage.getItem("beta-checks"));
console.log("localStorage beta-checks:", stored ? stored.slice(0, 300) : "EMPTY");

await browser.close();
