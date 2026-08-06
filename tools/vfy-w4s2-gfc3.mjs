// Third pass: does a real trade land during the act-flag pause, and is the
// clipped start button gfc-specific or shared with the other eras?
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

for (const [id, label] of [["dotcom", "Start in 2000"], ["gfc", "Start in 2007"], ["payday", null], ["crypto", null]]) {
  await p.goto(`${BASE}/#/orb/s/${id}`);
  await wait(1000);
  const sc = p.getByRole("button", { name: /Scout the menu/ }).first();
  if (!(await sc.count())) { console.log(id, "no scouting deck"); continue; }
  await sc.click();
  await wait(500);
  const n = await p.locator('button[aria-label^="card "]').count();
  for (let i = 0; i < n; i++) { await p.locator(`button[aria-label="card ${i + 1}"]`).click(); await wait(80); }
  await wait(400);
  const geo = await p.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Start in /.test(x.innerText.trim()));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { label: b.innerText.trim(), bottom: Math.round(r.bottom), viewport: window.innerHeight, clipped: r.bottom > window.innerHeight };
  });
  console.log(id, "cards", n, JSON.stringify(geo));
}

// real trade during the gate pause
await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1000);
await p.getByRole("button", { name: /Scout the menu/ }).first().click();
await wait(400);
const n = await p.locator('button[aria-label^="card "]').count();
for (let i = 0; i < n; i++) { await p.locator(`button[aria-label="card ${i + 1}"]`).click(); await wait(80); }
await p.locator("button", { hasText: "Start in 2007" }).first().click();
await wait(800);
const fast = p.locator("button", { hasText: /^4×$/ }).first();
if (await fast.count()) await fast.click();
for (let t = 0; t < 400; t++) {
  if (/October 2007\. The market just closed/.test(await body())) break;
  await wait(300);
}
await p.locator("button").filter({ hasText: /^Buy more while it climbs$/ }).first().click();
await wait(800);
const add = p.locator("button", { hasText: /^Add a color$/ }).first();
if (await add.count()) await add.click();
await wait(400);
const row = p.locator("button").filter({ hasText: /Everything Mart/ }).first();
console.log("row count", await row.count());
await row.click();
await wait(700);
await p.screenshot({ path: OUT + "w4s2-gfc3-tradepop.png" });
console.log("== POP ==", (await body()).slice(-900));
const buy = p.locator("button").filter({ hasText: /^(Buy|Confirm|Buy \$)/ }).first();
if (await buy.count()) { console.log("buy label:", (await buy.innerText()).trim()); await buy.click(); await wait(800); }
const txt = await body();
console.log("== AFTER BUY ==", txt.slice(0, 420));
await p.screenshot({ path: OUT + "w4s2-gfc3-afterbuy.png" });
await browser.close();
console.log("DONE3");
