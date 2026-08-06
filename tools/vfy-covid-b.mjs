// Throwaway adversarial verification pass 2 for the covid era: play the whole
// tape, hit all five gates, capture headline clippings, the debrief and the
// five-item quick check. Screenshots to tools/shots/overnight/.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4333";

await page.goto(`${BASE}/#/orb/s/covid`);
await wait(1200);
const sm = page.getByRole("button", { name: "Scout the menu" });
if (await sm.count()) {
  await sm.click();
  await wait(400);
  for (let i = 1; i <= 12; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) { await c.click(); await wait(90); }
  }
}
await page.getByText("Start in 2019").click();
await wait(800);

// gate 1: commit money, then actually buy two positions
await page.getByRole("button", { name: "Put the money to work" }).click();
await wait(500);
if (await page.getByRole("button", { name: "Pause" }).count()) {
  await page.getByRole("button", { name: "Pause" }).click();
}
await wait(300);
for (const nm of ["Fruit Computers", "The Everything Store", "Arcade Chips"]) {
  const b = page.getByRole("button", { name: nm }).first();
  if (await b.count()) {
    await b.click();
    await wait(250);
    const buy = page.getByRole("button", { name: "Buy $250" }).last();
    if (await buy.count()) { await buy.click(); await wait(400); }
  }
}
await page.screenshot({ path: OUT + "covid-after-buys.png" });
console.log("HUD after buys:", (await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n+/g, " | "));
await page.getByText("4×", { exact: true }).click();

const gates = [
  ["March 2020 ·", "Hold and look away", "gate-mar2020"],
  ["January 2021 ·", "Watch from the side", "gate-jan2021"],
  ["November 2021 ·", "Change nothing", "gate-nov2021"],
  ["October 2022 ·", "Hold what I own", "gate-oct2022"],
];
let sawHeadline = 0;
for (const [title, answer, shot] of gates) {
  for (let i = 0; i < 40; i++) {
    await wait(700);
    const txt = await page.evaluate(() => document.body.innerText);
    if (/Wall Street Suffers|S&P 500 Closes At New Record|Pfizer's covid vaccine|Dumb Money|Peloton to halt|closes at record high/.test(txt)) {
      sawHeadline++;
      await page.screenshot({ path: OUT + `covid-headline-${sawHeadline}.png` });
      console.log("headline seen:", txt.match(/(Wall Street Suffers[^\n]*|S&P 500 Closes At New Record[^\n]*|Pfizer's covid vaccine[^\n]*|'Dumb Money'[^\n]*|Peloton to halt[^\n]*|S&P 500 closes at record high[^\n]*)/)?.[0]);
    }
    if (await page.getByText(title).count()) break;
  }
  const present = await page.getByText(title).count();
  console.log("gate", title, "present:", present);
  await page.screenshot({ path: OUT + `covid-${shot}.png` });
  if (!present) { console.log("MISSING GATE", title); continue; }
  console.log((await page.evaluate(() => document.body.innerText)).split("Net worth")[1]?.slice(0, 900).replace(/\n+/g, " | "));
  await page.getByRole("button", { name: answer }).click();
  await wait(400);
  const four = page.getByText("4×", { exact: true });
  if (await four.count()) await four.click();
}

for (let i = 0; i < 60; i++) { await wait(700); if (await page.getByText("You finished with").count()) break; }
console.log("end screen:", await page.getByText("You finished with").count());
await page.screenshot({ path: OUT + "covid-end.png", fullPage: true });
console.log("--- END TEXT ---\n" + (await page.evaluate(() => document.body.innerText)));
await browser.close();
