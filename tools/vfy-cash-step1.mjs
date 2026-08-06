import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.ORB_BASE ?? "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(`${BASE}/#/orb/learn/cash`);
for (const t of [300, 900, 2500]) {
  await wait(t === 300 ? 300 : 600);
  const btns = await page.locator("main button").evaluateAll((els) => els.map((e) => `${e.innerText.replace(/\n/g, "|")} [vis=${e.offsetParent !== null} dis=${e.disabled}]`));
  console.log(`t=${t}`, JSON.stringify(btns));
}
await page.screenshot({ path: OUT + "cash-s1-load.png" });
const b = page.locator("main button").filter({ hasNotText: "Continue" }).first();
console.log("clicking:", await b.innerText());
await b.click();
await wait(1200);
console.log("continue disabled:", await page.getByRole("button", { name: "Continue" }).isDisabled());
console.log(await page.locator("main").innerText());
await page.screenshot({ path: OUT + "cash-s1-after-click.png" });
await browser.close();
