import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (msg) => { if (msg.type() === "error") console.log("CONSOLE.ERR:", msg.text().slice(0, 200)); });
const OUT = new URL("./shots/orb/", import.meta.url).pathname;
const BASE = process.env.ORB_BASE ?? "http://localhost:4318";

await page.goto(`${BASE}/#/orb`);
await wait(1000);
await page.screenshot({ path: OUT + "select.png", fullPage: true });
console.log("shot select");

// 2008 era: quick run to end
await page.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
await page.screenshot({ path: OUT + "gfc-brief.png" });
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
await wait(22000);
await page.screenshot({ path: OUT + "gfc-end.png" });
console.log("shot gfc-end");

// payday: first payday card
await page.goto(`${BASE}/#/orb/s/payday`);
await wait(1000);
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
await wait(18000);
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
