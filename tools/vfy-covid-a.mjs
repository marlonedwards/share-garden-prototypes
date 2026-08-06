// Throwaway adversarial verification pass 1 for the covid era: select screen,
// briefing page, scouting deck, first gate. Screenshots to tools/shots/overnight/.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4333";

await page.goto(`${BASE}/#/orb`);
await wait(1200);
await page.screenshot({ path: OUT + "covid-select.png", fullPage: true });
console.log("select has covid card:", await page.getByText("The covid years").count());

await page.goto(`${BASE}/#/orb/brief/covid`);
await wait(900);
await page.screenshot({ path: OUT + "covid-brief.png", fullPage: true });
console.log("briefing title:", await page.getByText("The world of January 2019").count());

await page.goto(`${BASE}/#/orb/s/covid`);
await wait(1200);
await page.screenshot({ path: OUT + "covid-intro.png" });
const bodyText = await page.evaluate(() => document.body.innerText);
console.log("--- INTRO TEXT ---\n" + bodyText.slice(0, 1200));

const sm = page.getByRole("button", { name: "Scout the menu" });
console.log("scout button:", await sm.count());
if (await sm.count()) {
  await sm.click();
  await wait(500);
  await page.screenshot({ path: OUT + "covid-scout1.png" });
  for (let i = 1; i <= 12; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) { await c.click(); await wait(120); }
  }
  await wait(300);
  await page.screenshot({ path: OUT + "covid-scout-flipped.png", fullPage: true });
  console.log("--- SCOUT TEXT ---\n" + (await page.evaluate(() => document.body.innerText)).slice(0, 1500));
}
const start = page.getByText("Start in 2019");
console.log("start button:", await start.count());
await start.click();
await wait(900);
await page.screenshot({ path: OUT + "covid-gate-2019.png" });
console.log("--- GATE1 TEXT ---\n" + (await page.evaluate(() => document.body.innerText)).slice(0, 1600));
await browser.close();
