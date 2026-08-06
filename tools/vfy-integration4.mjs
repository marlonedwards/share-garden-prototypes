import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4336";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });

await page.goto(`${BASE}/#/orb/ready`);
await wait(600);
await page.getByRole("button", { name: /Path one/ }).click();
await wait(600);
for (const nm of ["Vanguard S&P 500", "Apple", "Bitcoin"]) {
  await page.locator("main button:visible", { hasText: nm }).first().click();
  await wait(300);
}
const cont = page.getByRole("button", { name: /^Continue$/ }).first();
console.log("step1 continue enabled after 3 adds:", await cont.isEnabled());
await cont.click();
await wait(700);
await page.screenshot({ path: OUT + "ready-step2.png", fullPage: true });
let b = await page.locator("body").innerText();
console.log("\n--- STEP2 ---\n", b.slice(0, 1400));
// set dollar amounts
const inputs = page.locator("main input[type=number]:visible, main input[inputmode=numeric]:visible, main input[type=text]:visible");
const ni = await inputs.count();
console.log("inputs on step2:", ni);
for (let i = 0; i < ni; i++) { await inputs.nth(i).fill(["500", "300", "200"][i] ?? "100"); await wait(200); }
await wait(400);
await page.screenshot({ path: OUT + "ready-step2-filled.png", fullPage: true });
const c2 = page.getByRole("button", { name: /^Continue$/ }).first();
if (await c2.count() && await c2.isEnabled()) { await c2.click(); await wait(800); }
await page.screenshot({ path: OUT + "ready-step3.png", fullPage: true });
b = await page.locator("body").innerText();
console.log("\n--- STEP3 (mirror) ---\n", b.slice(0, 2200));

await page.goto(`${BASE}/#/orb`);
await wait(800);
const sel = await page.locator("body").innerText();
console.log("\nSELECT shows saved plan:", /Your plan|What you hold/.test(sel), (sel.match(/\$[\d,]+/g) || []).slice(0, 3));
await page.screenshot({ path: OUT + "select-with-plan.png", fullPage: true });
await browser.close();
