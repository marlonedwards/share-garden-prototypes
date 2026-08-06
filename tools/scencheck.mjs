import { chromium } from "playwright";
import { wait, scout } from "./walkkit.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE.ERR:", msg.text().slice(0, 200)); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
const BASE = process.env.ORB_BASE ?? "http://localhost:4318";


// Every era now carries four to five gates, and each one pauses the tape until
// it is answered. Ride through a known list so the run reaches its end card.
async function rideGates(pairs) {
  for (const [title, answer] of pairs) {
    for (let i = 0; i < 40; i++) { await wait(500); if (await page.getByText(title).count()) break; }
    const btn = page.getByRole("button", { name: answer }).first();
    if (!(await btn.count())) { console.log("MISSING gate option:", title, answer); continue; }
    await btn.click();
    await wait(400);
    await page.getByText("4×", { exact: true }).click();
  }
}

await page.goto(`${BASE}/#/orb`);
await wait(1000);
await page.screenshot({ path: OUT + "select.png", fullPage: true });
console.log("shot select");

// 2008 era: quick run to end
await page.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
await page.screenshot({ path: OUT + "gfc-brief.png" });
await scout(page);
await page.getByRole("button", { name: "Start in 2007" }).click();
await wait(400);
await page.getByRole("button", { name: "Pause" }).click();
for (const [name, amt] of [["Mega Bank", "Buy $250"], ["Fruit Computers", "Buy $250"], ["Everything Mart", "Buy $250"]]) {
  // scope to buttons: the scrolling ticker repeats the same names in spans
  await page.getByRole("button", { name }).first().click();
  await wait(250);
  await page.getByRole("button", { name: amt }).last().click();
  await wait(500);
}
await page.getByText("4×", { exact: true }).click();
await rideGates([
  ["October 2007 ·", "Keep holding everything"],
  ["March 2008 ·", "Hold everything"],
  ["September 2008 ·", "Hold and ride it out"],
  ["March 2009 ·", "Hold"],
  ["March 2013 ·", "Stay with the plan"],
]);
for (let i = 0; i < 40; i++) { await wait(500); if (await page.getByText("You finished with").count()) break; }
console.log("gfc end card:", await page.getByText("You finished with").count());
await page.screenshot({ path: OUT + "gfc-end.png" });
console.log("shot gfc-end");

// payday: first payday card
await page.goto(`${BASE}/#/orb/s/payday`);
await wait(1000);
await scout(page);
await page.getByRole("button", { name: "Start earning" }).click();
await wait(400);
await page.getByRole("button", { name: "Pause" }).click();
await page.getByRole("button", { name: "The Everything Store" }).first().click();
await wait(250);
await page.getByRole("button", { name: /Buy \$/ }).last().click();
await wait(600);
await page.getByRole("button", { name: "Play" }).click();
await page.getByText("Your payday of").waitFor({ timeout: 15000 });
await wait(400);
await page.screenshot({ path: OUT + "payday-card.png" });
console.log("shot payday-card");
await page.getByRole("button", { name: "Invest, and do this automatically" }).click();
await page.getByText("4×", { exact: true }).click();
await rideGates([
  ["April 2000 ·", "Keep investing every month"],
  ["September 2001 ·", "Invest it like any other month"],
  ["October 2002 ·", "Stick to the plan"],
  ["June 2003 ·", "The plan does not wait"],
  ["October 2007 ·", "No. Invest it like every other month"],
]);
for (let i = 0; i < 40; i++) { await wait(500); if (await page.getByText("You finished with").count()) break; }
console.log("payday end card:", await page.getByText("You finished with").count());
await page.screenshot({ path: OUT + "payday-end.png" });
console.log("shot payday-end");

// crypto brief
await page.goto(`${BASE}/#/orb/s/crypto`);
await wait(1200);
await page.screenshot({ path: OUT + "crypto-brief.png" });
console.log("shot crypto-brief");

// freeplay
await page.goto(`${BASE}/#/orb/free`);
await wait(1000);
await page.getByRole("button", { name: "Nova Systems" }).first().click();
await wait(300);
await page.getByRole("button", { name: /Buy \$250/ }).last().click();
await wait(600);
await page.getByText("4×", { exact: true }).click();
await wait(8000);
await page.getByRole("button", { name: "Pause" }).click();
await page.screenshot({ path: OUT + "freeplay.png" });
console.log("shot freeplay");

// one-pager
await page.goto(`${BASE}/#/objectives`);
await wait(1200);
await page.screenshot({ path: OUT + "onepager.png", fullPage: true });
console.log("shot onepager");

await browser.close();
