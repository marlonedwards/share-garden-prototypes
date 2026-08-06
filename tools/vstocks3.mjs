import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4324";
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("onboarded", "1"); } catch (e) {} });
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto(`${BASE}/#/orb`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/#/orb/learn/stocks`);
await wait(700);
const seq = [
  /Buy 1 share/, /whoever sold the share/, null, /A buyer walks up/, /A year passes/,
];
await page.getByRole("button", { name: /Buy 1 share/ }).click(); await wait(150);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
await page.getByRole("button", { name: /the lemonade stand$/ }).click(); await wait(150);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
await page.locator("main div:not(.hidden) > input[type=range]").fill("6"); await wait(150);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
await page.getByRole("button", { name: /An owner wants out/ }).click(); await wait(150);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
await page.getByRole("button", { name: /A year passes/ }).click(); await wait(150);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
for (const t of ["Sell the piece", "Vote when the stand", "Pour a free lemonade", "Order Maya"]) {
  await page.getByRole("button", { name: new RegExp(t) }).click(); await wait(80);
}
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
// answer check 1 WRONG on purpose
await page.getByRole("button", { name: /Nothing, until you sell/ }).click(); await wait(200);
await page.screenshot({ path: OUT + "stocks-wrong-check.png" });
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
await page.getByRole("button", { name: /The last buyer and seller agreed/ }).click(); await wait(200);
await page.getByRole("button", { name: /^Continue$/ }).click(); await wait(250);
await page.getByRole("button", { name: /^\$2\.00 in cash$/ }).click(); await wait(200);
// step back to the wrong check and confirm no retry
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(200);
await page.getByRole("button", { name: /Back one step/ }).click(); await wait(250);
const retry = await page.evaluate(() => {
  const d = [...document.querySelectorAll("main > div")].find((x) => !x.classList.contains("hidden") && x.querySelector("p"));
  return [...d.querySelectorAll(".rounded-2xl button")].map((b) => ({ t: b.textContent.slice(0, 30), dis: b.disabled }));
});
console.log("RETRY-STATE", JSON.stringify(retry));
await page.keyboard.press("ArrowRight"); await wait(200);
await page.keyboard.press("ArrowRight"); await wait(250);
await page.getByRole("button", { name: /^Finish$/ }).click(); await wait(600);
const st = await page.evaluate(() => ({ fg: localStorage.getItem("field-guide"), checks: localStorage.getItem("beta-checks") }));
console.log("FG", st.fg);
console.log("CHECKS", st.checks);
await page.screenshot({ path: OUT + "stocks-select-after.png", fullPage: true });
// old URL still works
await page.goto(`${BASE}/#/orb/mini/stocks`); await wait(600);
console.log("MINI URL step text:", await page.evaluate(() => document.querySelector("main span.tnum")?.textContent));
await page.screenshot({ path: OUT + "stocks-mini-url.png" });
console.log("ERRORS", errs);
await browser.close();
