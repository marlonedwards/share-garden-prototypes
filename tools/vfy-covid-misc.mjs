import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();

// real names toggle on the covid cast
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto("http://localhost:4333/#/orb/s/covid");
await wait(900);
await page.getByRole("button", { name: "Real names" }).click();
await wait(300);
await page.getByRole("button", { name: "Scout the menu" }).click();
await wait(400);
const t = await page.locator("body").innerText();
for (const n of ["Apple", "Amazon", "Nvidia", "Tesla", "Zoom", "Peloton", "GameStop"]) {
  console.log("real name", n, ":", t.includes(n));
}
await page.screenshot({ path: OUT + "covid-realnames.png" });

// mobile width gate
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
m.on("pageerror", (e) => console.log("M PAGEERROR:", e.message));
await m.goto("http://localhost:4333/#/orb/s/covid");
await wait(900);
await m.getByRole("button", { name: "Scout the menu" }).click();
await wait(300);
for (let i = 0; i < 8; i++) {
  const c = m.locator("button[aria-label^='Flip the card']");
  if (await c.count()) { await c.first().click(); await wait(200); }
  const n = m.locator("button[aria-label='next card']");
  if (await n.count()) { await n.click(); await wait(180); }
}
await m.screenshot({ path: OUT + "covid-m-scout.png", fullPage: true });
await m.getByText("Start in 2019").click();
await wait(700);
await m.screenshot({ path: OUT + "covid-m-gate.png", fullPage: true });
console.log("mobile hscroll:", await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
await m.goto("http://localhost:4333/#/orb/brief/covid");
await wait(600);
console.log("mobile brief hscroll:", await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
await m.screenshot({ path: OUT + "covid-m-brief.png" });
await browser.close();
