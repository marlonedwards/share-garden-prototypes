// Walks the inflation era end to end (docs/overnight-plan.md, W5): scout the
// menu, start in 2021, buy the bond fund and a stock, answer all five gates
// including one act gate that pauses the tape for a real trade, reach the
// debrief, and take the quick check. Pattern follows tools/checkwalk.mjs.
// Dev server: npx vite --port 4334 (override with ORB_BASE).
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

const BASE = process.env.ORB_BASE ?? "http://localhost:4334";

await page.goto(`${BASE}/#/orb/s/inflation`);
await wait(1000);

// the scouting deck deals five cards; all must flip before Start opens
const scout = async () => {
  const sm = page.getByRole("button", { name: "Scout the menu" });
  if (await sm.count()) {
    await sm.click();
    await wait(400);
    for (let i = 1; i <= 8; i++) {
      const c = page.locator(`button[aria-label="card ${i}"]`);
      if (await c.count()) { await c.click(); await wait(80); }
    }
  }
};
await scout();
await page.screenshot({ path: OUT + "inflation-brief.png" });
await page.getByText("Start in 2021").click();
await wait(600);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);

// buy the bond fund (the era's honest lesson) and a stock
for (const [assetName, amt] of [["The Steady Lender", "Buy $250"], ["Fruit Computers", "Buy $250"]]) {
  await page.getByRole("button", { name: assetName }).first().click();
  await wait(250);
  await page.getByRole("button", { name: amt }).last().click();
  await wait(400);
}
await page.screenshot({ path: OUT + "inflation-2021.png" });
await page.getByText("4×", { exact: true }).click();

// ride the tape through the non-act gates
for (const [eyebrow, answer] of [
  ["May 2021 ·", "Keep waiting in cash"],
  ["March 2022 ·", "Hold everything as planned"],
  ["July 2022 ·", "Hold and keep going"],
]) {
  for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText(eyebrow).count()) break; }
  console.log("gate", eyebrow, await page.getByText(eyebrow).count());
  await page.getByRole("button", { name: answer }).click();
  await wait(300);
  await page.getByText("4×", { exact: true }).click();
}

// the October 2022 bottom gate: Buy is an act option, so answering pauses
// the tape for the move instead of resuming without the player
for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText("October 2022 ·").count()) break; }
console.log("gate October 2022:", await page.getByText("October 2022 ·").count());
await page.screenshot({ path: OUT + "inflation-bottom-gate.png" });
await page.getByRole("button", { name: "Buy", exact: true }).click();
await wait(300);
if (await page.getByRole("button", { name: "Pause" }).count()) {
  await page.getByRole("button", { name: "Pause" }).click();
}
await wait(300);
await page.getByRole("button", { name: "Everything Mart" }).first().click();
await wait(300);
// whole-shares mode is this era's default and one Everything Mart share costs
// about $155 in October 2022, so Buy $100 renders disabled; $250 covers a share
await page.getByRole("button", { name: "Buy $250" }).last().click();
await wait(400);
await page.getByText("4×", { exact: true }).click();

// the January 2024 record gate
for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText("January 2024 ·").count()) break; }
console.log("gate January 2024:", await page.getByText("January 2024 ·").count());
await page.getByRole("button", { name: "Stay with the plan" }).click();
await wait(300);
await page.getByText("4×", { exact: true }).click();

// run to the end. The end beat is a sequence of single screens (score,
// rewind, lessons, quiz); continue through them to open the quick check.
for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText("You finished with").count()) break; }
await page.screenshot({ path: OUT + "inflation-end.png" });
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await page.getByRole("button", { name: "Quick check" }).click();
await wait(500);
console.log("quick check present:", await page.getByText("Quick check").count());
await page.screenshot({ path: OUT + "inflation-check.png", fullPage: true });

// answer all items (the second option every time, then Next); the five
// static inflation items all key their correct answer at index 1, so the
// static portion should score clean
for (let q = 0; q < 10; q++) {
  const counts = await page.getByText(/^\d of \d$/).count();
  if (!counts) break;
  const buttons = page.locator("button.text-left.text-\\[13px\\]");
  await buttons.nth(1).click();
  await wait(500);
  const next = page.getByRole("button", { name: /Next|See results/ });
  await next.click();
  await wait(500);
}
console.log("results score visible:", await page.getByText(/\d \/ \d/).count());
await page.screenshot({ path: OUT + "inflation-results.png", fullPage: true });
const stored = await page.evaluate(() => localStorage.getItem("beta-checks"));
console.log("localStorage beta-checks:", stored ? stored.slice(0, 300) : "EMPTY");

await browser.close();
