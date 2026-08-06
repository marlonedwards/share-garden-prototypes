import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;

const BASE = process.env.ORB_BASE ?? "http://localhost:4318";

// crypto era: buy, gates, end, then scrub + quiz focus
await page.goto(`${BASE}/#/orb/s/crypto`);
await wait(1000);
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
await scout();
await page.getByText("Start in 2018").click();
await wait(600);
// the era opens on the January 2018 Ponzi gate; decline the Promise Coin
await page.getByRole("button", { name: "Keep my cash" }).click();
await wait(400);
await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
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
  await wait(300);
  await page.getByText("4×", { exact: true }).click();
}
for (let i = 0; i < 25; i++) { await wait(1000); if (await page.getByText("You finished with").count()) break; }
await wait(600);

// the end beat is now a sequence of single screens: score, rewind chart,
// lessons, quiz. The chart lives on the second screen.
await page.getByRole("button", { name: "Continue" }).click();
await wait(600);

// scrub: hover the big end chart at ~25% width, expect a rewind pill
const chart = page.locator("svg[style*='col-resize']").first();
const box = await chart.boundingBox();
console.log("scrub chart found:", !!box);
await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
await wait(500);
console.log("rewind pill:", await page.getByText("· rewind").count());
await page.screenshot({ path: OUT + "scrub-hover.png" });

// move off: back to final state
await page.mouse.move(box.x + box.width / 2, box.y - 200);
await wait(400);
console.log("pill gone after leave:", await page.getByText("· rewind").count() === 0);

// quiz: continue past the lessons screen and open the quick check. The quiz
// replaces the stage entirely (layout law), so the scene must be gone.
await page.getByRole("button", { name: "Continue" }).click();
await wait(500);
await page.getByRole("button", { name: "Quick check" }).click();
await wait(500);
console.log("quiz card present:", await page.getByText("Prove what this era taught you.").count());
console.log("stage gone on quiz (no Net worth):", (await page.getByText("Net worth").count()) === 0);
await page.screenshot({ path: OUT + "scrub-quiz.png", fullPage: true });

await browser.close();
