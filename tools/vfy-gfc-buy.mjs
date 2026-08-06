// Fourth pass: a real purchase during the gate pause must land in the orb.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
await p.getByRole("button", { name: /Scout the menu/ }).first().click();
await wait(500);
const n = await p.locator('button[aria-label^="card "]').count();
for (let i = 0; i < n; i++) { await p.locator(`button[aria-label="card ${i + 1}"]`).click(); await wait(80); }
await p.locator("button", { hasText: "Start in 2007" }).first().click();
await wait(700);
await p.locator("button", { hasText: /^4×$/ }).first().click();
for (let t = 0; t < 600; t++) { if ((await body()).includes("October 2007 ·")) break; await wait(250); }
await wait(400);
await p.locator("button").filter({ hasText: /^Buy more while it climbs$/ }).first().click();
await wait(900);
await p.locator("button").filter({ hasText: /^Everything Mart/ }).first().click();
await wait(500);
await p.locator("button").filter({ hasText: /^Buy \$250$/ }).first().click();
await wait(900);
const txt = await body();
console.log("AFTER BUY $250:", txt.slice(0, 420));
console.log("ORB PANEL:", txt.slice(txt.indexOf("Inside your orb")).slice(0, 300));
await p.screenshot({ path: OUT + "gfc-buy-landed.png" });
await browser.close();
console.log("DONE");
