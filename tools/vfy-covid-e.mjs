// Throwaway pass 5: smoke the finale route and the covid card link from it.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
await page.goto("http://localhost:4333/#/orb/ready");
await wait(1200);
await page.screenshot({ path: OUT + "covid-ready-smoke.png", fullPage: true });
console.log("--- READY ---\n" + (await page.evaluate(() => document.body.innerText)).slice(0, 700));
await page.goto("http://localhost:4333/#/objectives");
await wait(1000);
const t = await page.evaluate(() => document.body.innerText);
console.log("one pager mentions covid:", /covid|Covid/.test(t), "| mentions inflation era:", /Lesson 7|The inflation/.test(t));
await browser.close();
