import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4324";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

// 1. deep-link gating on a clean slate
await page.goto(`${BASE}/#/orb`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/stocks?step=9`); await wait(700);
console.log("clean ?step=9 ->", await page.locator("main span.tnum").first().innerText(), "| url:", page.url());
await page.goto(`${BASE}/#/orb/learn/stocks?step=abc`); await wait(500);
console.log("?step=abc ->", await page.locator("main span.tnum").first().innerText());
await page.goto(`${BASE}/#/orb/learn/stocks?step=-4`); await wait(500);
console.log("?step=-4 ->", await page.locator("main span.tnum").first().innerText());
// legacy urls
await page.goto(`${BASE}/#/orb/mini/share`); await wait(600);
console.log("legacy /orb/mini/share ->", page.url(), "|", await page.locator("main span.tnum").first().innerText());

// 2. run to completion then check the select strip + field guide
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/stocks`); await wait(600);
const CUR = 'main > div[aria-hidden="false"]';
const cont = () => page.locator(`${CUR} button`, { hasText: /^(Continue|Finish)$/ }).first();
const btn = (re) => page.locator(`${CUR} button`, { hasText: re }).first();
await btn(/Buy 1 share/).click(); await wait(120); await cont().click(); await wait(200);
await btn(/whoever sold the share/).click(); await wait(120); await cont().click(); await wait(200);
await page.locator(`${CUR} input[type=range]`).fill("7"); await wait(120); await cont().click(); await wait(200);
await btn(/A buyer walks up/).click(); await wait(120); await cont().click(); await wait(200);
await btn(/A year passes/).click(); await wait(120); await cont().click(); await wait(200);
for (const t of [/Sell the piece/, /Vote when the stand/, /Pour a free lemonade/, /Order Maya/]) { await btn(t).click(); await wait(80); }
await cont().click(); await wait(200);
await btn(/The same 1 of 100 pieces/).click(); await wait(200); await cont().click(); await wait(200);
await btn(/The last buyer and seller agreed/).click(); await wait(200); await cont().click(); await wait(200);
await btn(/\$2\.00 in cash/).click(); await wait(200);
const g = await page.evaluate(() => JSON.parse(localStorage.getItem("field-guide")));
console.log("all-correct field-guide:", JSON.stringify(g));
await cont().click(); await wait(700);
console.log("after Finish, url:", page.url());
await page.screenshot({ path: OUT + "vfy-stocks-after-finish.png", fullPage: true });
await page.goto(`${BASE}/#/guide`); await wait(700);
await page.screenshot({ path: OUT + "vfy-stocks-guide.png", fullPage: true });
console.log("ERRORS:", errs.join("\n") || "(none)");
await browser.close();
