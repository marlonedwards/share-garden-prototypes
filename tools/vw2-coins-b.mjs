// throwaway: routing, entry points and browser-back behaviour for W2 coins
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4326";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
page.on("pageerror", (e) => console.log("PAGEERROR " + e.message));

// legacy id + legacy path
for (const p of ["/#/orb/mini/coin", "/#/orb/learn/coin", "/#/orb/mini/coins"]) {
  await page.goto(BASE + p);
  await wait(600);
  console.log(`${p} -> ${page.url()}`);
}

// entry point from the select screen
await page.goto(`${BASE}/#/orb`);
await wait(800);
const links = await page.evaluate(() =>
  [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).filter((h) => h && h.includes("learn")));
console.log("select-screen lesson links:", JSON.stringify(links));
await page.screenshot({ path: `${OUT}vw2-coins-select.png` });

// browser back mid-lesson
await page.goto(`${BASE}/#/orb/learn/coins`);
await wait(600);
const cur = () => page.locator("main > div:not(.hidden)");
await cur().locator(".bg-white button").nth(0).click(); await wait(120);
await cur().locator(".bg-white button").nth(1).click(); await wait(120);
await cur().locator("button", { hasText: /^Continue$/ }).first().click(); await wait(350);
console.log("step now:", await page.locator("main span.tnum").first().innerText());
await page.goBack(); await wait(600);
console.log("after browser back: url=", page.url(), "step=", await page.locator("main span.tnum").first().innerText().catch(() => "n/a"));
await page.screenshot({ path: `${OUT}vw2-coins-browserback.png` });

// re-entering the lesson after finishing: does it restart cleanly?
await page.goto(`${BASE}/#/orb/learn/coins`);
await wait(600);
console.log("re-entry step:", await page.locator("main span.tnum").first().innerText());
const contDisabled = await page.locator("main > div:not(.hidden) button", { hasText: /^Continue$/ }).first().isDisabled();
console.log("re-entry continue disabled:", contDisabled);

await browser.close();
