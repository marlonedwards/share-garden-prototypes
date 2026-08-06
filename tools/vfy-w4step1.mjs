import { chromium } from "playwright";
import { mkdirSync } from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4328";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text().slice(0, 240)); });

// 1. select screen shows the briefing link
await page.goto(`${BASE}/#/orb`);
await wait(1200);
await page.screenshot({ path: OUT + "w4-select.png", fullPage: true });
console.log("briefing links on select:", await page.getByText("Read the era briefing first").count());

// 2. briefing route
await page.goto(`${BASE}/#/orb/brief/dotcom`);
await wait(900);
await page.screenshot({ path: OUT + "w4-brief-dotcom-top.png" });
await page.screenshot({ path: OUT + "w4-brief-dotcom-full.png", fullPage: true });
console.log("brief h1:", await page.locator("h1").innerText());
// unwritten era should redirect to the scenario
await page.goto(`${BASE}/#/orb/brief/gfc`);
await wait(900);
console.log("gfc brief url ->", page.url());

// 3. scouting deck gates the start button
await page.goto(`${BASE}/#/orb/s/dotcom`);
await wait(1400);
await page.screenshot({ path: OUT + "w4-scout-front.png" });
const start = page.getByRole("button", { name: "Start in 2000" });
console.log("start disabled before flipping:", await start.isDisabled());
const counter = page.locator("text=/Scouted \\d+ of \\d+/");
console.log("counter:", await counter.innerText());

// flip one card, screenshot the back
const card = page.getByRole("button", { name: /Flip the card for/ });
await card.click();
await wait(700);
await page.screenshot({ path: OUT + "w4-scout-back.png" });
console.log("after 1 flip:", await counter.innerText(), "start disabled:", await start.isDisabled());

// tap through the rest of the deck
for (let i = 0; i < 20; i++) {
  const done = await page.getByText("Every card is scouted.").count();
  if (done) break;
  await page.locator('div[style*="perspective"] button').first().click();
  await wait(220);
}
await wait(400);
await page.screenshot({ path: OUT + "w4-scout-done.png" });
console.log("all flipped:", await page.getByText("Every card is scouted.").count() > 0,
  "start disabled:", await start.isDisabled());

// 4. start actually runs
await start.click();
await wait(1200);
await page.screenshot({ path: OUT + "w4-run-after-start.png" });
console.log("start button gone:", await page.getByRole("button", { name: "Start in 2000" }).count() === 0);

// 5. gate card shows the briefing ref
await wait(1500);
await page.screenshot({ path: OUT + "w4-gate.png" });
console.log("gate briefing link:", await page.getByRole("link", { name: "The era briefing" }).count());

// 6. eras without scouting still start plainly
await page.goto(`${BASE}/#/orb/s/crypto`);
await wait(1200);
await page.screenshot({ path: OUT + "w4-crypto-brief.png" });
console.log("crypto scouting cards:", await page.getByText("Scout the menu before you start").count());

await browser.close();
