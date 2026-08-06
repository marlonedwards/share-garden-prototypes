// Second gfc pass: act-flag pause, real-names toggle on scouting cards,
// briefing link from the scenario select card, layout measurements.
import { chromium } from "playwright";
import fs from "node:fs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERROR:", m.text()); });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const shot = (n) => p.screenshot({ path: OUT + `w4s2-gfc2-${n}.png` });
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

// select screen: does the gfc card offer the briefing?
await p.goto(`${BASE}/#/orb`);
await wait(1200);
const sel = await body();
console.log("== SELECT ==", sel.slice(0, 1600));
console.log("gfc briefing link on select:", await p.locator('a[href*="/orb/brief/gfc"]').count());
await shot("00-select");

await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1200);
await p.getByRole("button", { name: /Scout the menu/ }).first().click();
await wait(600);
// real names toggle while the deck is open
await p.locator("button", { hasText: /^Real names$/ }).first().click();
await wait(500);
const rn = await body();
console.log("== REAL NAMES ON ==", rn.slice(rn.indexOf("Scout the menu before")).slice(0, 400));
await shot("01-realnames");
const backBtn = p.locator("button").filter({ hasText: /^(Real names|Made-up names|Story names)$/ }).first();
if (await backBtn.count()) { await backBtn.click(); await wait(400); }

// measure the start button against the fold
const n = await p.locator('button[aria-label^="card "]').count();
for (let i = 0; i < n; i++) { await p.locator(`button[aria-label="card ${i + 1}"]`).click(); await wait(120); }
await wait(400);
const geo = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "Start in 2007");
  const r = b.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, viewport: window.innerHeight, scrollH: document.documentElement.scrollHeight };
});
console.log("start button geometry:", JSON.stringify(geo));
await shot("02-start-fold");

await p.locator("button", { hasText: "Start in 2007" }).first().click();
await wait(1000);
const fast = p.locator("button", { hasText: /^4×$/ }).first();
if (await fast.count()) await fast.click();

// ride to gate 1 and take an act option
for (let t = 0; t < 400; t++) {
  const txt = await body();
  if (/October 2007\. The market just closed/.test(txt)) break;
  await wait(300);
}
console.log("at gate 1");
await p.locator("button").filter({ hasText: /^Buy more while it climbs$/ }).first().click();
await wait(900);
const after = await body();
console.log("== AFTER ACT OPTION ==", after.slice(0, 900));
console.log("paused caption present:", /tape is paused for your move/.test(after));
await shot("03-act-paused");

// actually trade: open a color and buy
const add = p.locator("button", { hasText: /^Add a color$/ }).first();
if (await add.count()) { await add.click(); await wait(500); }
const buyRow = p.locator("button").filter({ hasText: /Fruit Computers/ }).first();
if (await buyRow.count()) { await buyRow.click(); await wait(600); }
console.log("== TRADE POP ==", (await body()).slice(0, 900));
await shot("04-trade");
const buyBtn = p.locator("button").filter({ hasText: /^Buy/ }).first();
if (await buyBtn.count()) { await buyBtn.click(); await wait(700); }
console.log("== AFTER BUY ==", (await body()).slice(0, 700));
await shot("05-after-buy");

const play = p.locator("button", { hasText: /^Play$/ }).first();
if (await play.count()) { await play.click(); await wait(500); console.log("resumed"); }
await shot("06-resumed");
await browser.close();
console.log("DONE2");
