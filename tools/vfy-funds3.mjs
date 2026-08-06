import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:4325";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE.ERR: " + m.text()); });

const screen = () => page.locator("main > div.pop-in");
const cont = () => screen().locator("button").filter({ hasText: /^(Continue|Finish)$/ }).first();
const stepNo = async () => (await page.locator("main span.tnum").first().innerText());

await page.goto(`${BASE}/#/orb/learn/funds`);
await wait(700);
await page.evaluate(() => localStorage.clear());
await page.reload();
await wait(700);

// walk to step 5 (flop) using clicks, interacting
async function satisfy() {
  if (!(await cont().isDisabled())) return;
  const btns = screen().locator(".rounded-2xl.bg-white button");
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    try { await btns.nth(i).click({ timeout: 700 }); } catch { }
    await wait(150);
    if (!(await cont().isDisabled())) return;
  }
}
for (let i = 0; i < 4; i++) { await satisfy(); await cont().click(); await wait(400); }
console.log("now at", await stepNo());
await satisfy();
await wait(300);
const flopText = await screen().locator(".rounded-2xl.bg-white").innerText();
console.log("step5 answered flop:", /Alone, that bet/.test(flopText));

// jump back to step 1 via in-app back arrow x4
for (let i = 0; i < 4; i++) { await page.locator("header button").first().click(); await wait(250); }
console.log("after 4 back:", await stepNo());
// keyboard right arrow forward x4
for (let i = 0; i < 4; i++) { await page.keyboard.press("ArrowRight"); await wait(250); }
console.log("after 4 ArrowRight:", await stepNo(), "| contDisabled:", await cont().isDisabled());
const flop2 = await screen().locator(".rounded-2xl.bg-white").innerText();
console.log("step5 state kept:", /Alone, that bet/.test(flop2));

// check screen re-answer protection: go to step 4 (check) and try clicking another option
await page.locator("header button").first().click(); await wait(400);
console.log("at", await stepNo());
const opts = screen().locator(".rounded-2xl.bg-white button");
console.log("check options disabled after answer:", await opts.first().isDisabled());

// hand-typed deep URL gating
await page.goto(`${BASE}/#/orb/learn/funds?step=7`);
await wait(700);
console.log("fresh mount ?step=7 lands on:", await stepNo());
await page.goto(`${BASE}/#/orb/mini/funds`);
await wait(600);
console.log("legacy /orb/mini/funds ->", page.url(), await stepNo());

console.log(errors.length ? errors : "no console errors");
await browser.close();
