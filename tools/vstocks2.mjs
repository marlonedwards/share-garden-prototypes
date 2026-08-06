import { chromium } from "playwright";
import { mkdirSync } from "fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4324";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const cur = () => page.evaluate(() => {
  const divs = [...document.querySelectorAll("main > div")].filter((d) => !d.classList.contains("hidden") && d.querySelector("p"));
  return divs.map((d) => d.innerText).join("\n@@@\n");
});
await page.goto(`${BASE}/#/orb`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/stocks`);
await wait(800);
await page.getByRole("button", { name: /Buy 1 share/ }).click(); await wait(250);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(300);
await page.getByRole("button", { name: /whoever sold the share/ }).click(); await wait(250);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(300);
await page.locator("main div:not(.hidden) > input[type=range]").fill("14"); await wait(250);
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(300);
console.log("BACK to s2:\n" + (await cur()));
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(300);
console.log("BACK to s1:\n" + (await cur()));
await page.screenshot({ path: OUT + "stocks-back-s1.png" });
await page.keyboard.press("ArrowRight"); await wait(300);
await page.keyboard.press("ArrowRight"); await wait(300);
console.log("FWD to s3:\n" + (await cur()));
await page.screenshot({ path: OUT + "stocks-fwd-s3.png" });
// crowd screen: check price math both ways
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(300);
for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /A buyer walks up/ }).click(); await wait(100); }
console.log("CROWD +3 buyers:\n" + (await cur()));
for (let i = 0; i < 6; i++) { await page.getByRole("button", { name: /An owner wants out/ }).click(); await wait(80); }
console.log("CROWD +3b/6s:\n" + (await cur()));
await page.screenshot({ path: OUT + "stocks-crowd-extreme.png" });
// field guide state after completing checks
await page.goto(`${BASE}/#/orb/learn/stocks`);
await wait(500);
const fg = await page.evaluate(() => localStorage.getItem("field-guide"));
console.log("FG after replay-nav:", fg);
await browser.close();
