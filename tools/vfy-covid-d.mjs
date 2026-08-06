// Throwaway pass 4: the real-names toggle on the covid era.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
await page.goto("http://localhost:4333/#/orb/s/covid");
await wait(1000);
const sm = page.getByRole("button", { name: "Scout the menu" });
if (await sm.count()) {
  await sm.click();
  await wait(300);
  for (let i = 1; i <= 12; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) { await c.click(); await wait(70); }
  }
}
await page.getByText("Start in 2019").click();
await wait(600);
await page.getByRole("button", { name: "Put the money to work" }).click();
await wait(500);
if (await page.getByRole("button", { name: "Pause" }).count()) await page.getByRole("button", { name: "Pause" }).click();
await wait(300);
await page.getByRole("button", { name: "Real names" }).click();
await wait(500);
await page.screenshot({ path: OUT + "covid-realnames.png" });
const t = await page.evaluate(() => document.body.innerText);
console.log("real names on:", ["Apple", "Amazon", "Nvidia", "Tesla", "Zoom", "Peloton", "GameStop"].filter((n) => t.includes(n)).join(", "));
await browser.close();
