import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
const BASE = process.env.ORB_BASE ?? "http://localhost:4318";

// scouting eras deal a card deck before the start button opens
const scout = async () => {
  const sm = page.getByRole("button", { name: "Scout the menu" });
  if (await sm.count()) {
    await sm.click();
    await wait(400);
    for (let i = 1; i <= 12; i++) {
      const c = page.locator(`button[aria-label="card ${i}"]`);
      if (await c.count()) { await c.click(); await wait(80); }
    }
  }
};

// 1. gate act-option pauses the tape for the move
await page.goto(`${BASE}/#/orb/s/gfc`);
await wait(1000);
await scout();
await page.getByText("Start in 2007").click();
await wait(300);
await page.getByText("4×", { exact: true }).click();
// answer the two gates before the panic, then take the act option there
for (const [eyebrow, answer] of [["October 2007 ·", "Keep holding everything"], ["March 2008 ·", "Hold everything"]]) {
  for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText(eyebrow).count()) break; }
  await page.getByRole("button", { name: answer }).click();
  await wait(300);
  await page.getByText("4×", { exact: true }).click();
}
for (let i = 0; i < 20; i++) { await wait(1000); if (await page.getByText("September 2008 ·").count()) break; }
await page.getByRole("button", { name: "Sell everything" }).click();
await wait(600);
console.log("paused-for-move caption:", await page.getByText("paused for your move").count());
const monthBefore = await page.locator("header span.tnum").first().textContent();
await wait(1500);
const monthAfter = await page.locator("header span.tnum").first().textContent();
console.log("tape actually paused:", monthBefore === monthAfter, `(${monthBefore})`);
await page.screenshot({ path: OUT + "gate-act-pause.png" });
await page.getByRole("button", { name: "Play", exact: true }).click();
await wait(600);
console.log("caption cleared after play:", (await page.getByText("paused for your move").count()) === 0);

// 2. run crypto to end for tooltip + pin + marble clearing
await page.goto(`${BASE}/#/orb/s/crypto`);
await wait(800);
await scout();
await page.getByText("Start in 2018").click();
await wait(600);
// the era opens on the January 2018 Ponzi gate; decline the Promise Coin
await page.getByRole("button", { name: "Keep my cash" }).click();
await wait(400);
await page.getByRole("button", { name: "Pause" }).click();
await wait(200);
await page.getByRole("button", { name: "Coin Alpha" }).first().click();
await wait(250);
await page.getByRole("button", { name: "Buy $250" }).last().click();
await wait(300);
await page.getByText("4×", { exact: true }).click();
// answer every mid-era gate the depth pass added, then both winters
for (const [eyebrow, answer] of [
  ["March 2020 ·", "Hold on"],
  ["April 2021 ·", "Stay with the boring market instead"],
  ["November 2021 ·", "Change nothing"],
  ["November 2022 ·", "Hold"],
]) {
  for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText(eyebrow).count()) break; }
  await page.getByRole("button", { name: answer, exact: true }).click();
  await wait(200);
  await page.getByText("4×", { exact: true }).click();
}
for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText("You finished with").count()) break; }
await wait(500);

// the end beat is a sequence of single screens; the chart is on screen two
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);

// tooltip on hover + click to pin
const chart = page.locator("svg[style*='col-resize']").first();
const box = await chart.boundingBox();
await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
await wait(400);
console.log("tooltip visible:", await page.getByText(/· you \$/).count());
await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
await page.mouse.move(box.x + box.width / 2, box.y - 250);
await wait(400);
console.log("pinned after click + leave:", await page.getByText("· pinned").count());
await page.screenshot({ path: OUT + "chart-pinned.png" });

// continue past the lessons screen, then the quiz replaces the stage
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await page.getByRole("button", { name: "Quick check" }).click();
await wait(500);

// answer quiz correctly to clear marbles (correct answers: idx 1,1,1 then run-index 1)
for (let q = 0; q < 8; q++) {
  if (!(await page.getByText(/^\d of \d$/).count())) break;
  await page.locator("button.text-left.text-\\[13px\\]").nth(1).click();
  await wait(400);
  await page.getByRole("button", { name: /Next|See results/ }).click();
  await wait(400);
}
await wait(300);

// 3. field guide shelf shows cleared marbles
await page.goto(`${BASE}/#/orb/guide`);
await wait(800);
const proved = await page.getByText(/of \d+ proved/).textContent();
console.log("guide header:", proved);
await page.getByRole("button", { name: "Position size" }).click();
await wait(400);
console.log("card copy:", await page.getByText("Position size is how much of your money").count());
console.log("proved line:", await page.getByText("You proved this one.").count());
await page.screenshot({ path: OUT + "guide-shelf.png", fullPage: true });

await browser.close();
