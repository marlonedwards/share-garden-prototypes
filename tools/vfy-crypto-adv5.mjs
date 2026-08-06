// Adversarial pass 5: does an act option that implies SELLING actually let
// the player sell? Buys at gate 1, then takes "Take some profits" at gate 4
// and "Sell what's left" at gate 5 and tries to execute the move.
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4331";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
const body = async () => await p.evaluate(() => document.body.innerText);
const fast = async () => { const b = p.locator("button", { hasText: /^4×$/ }).first(); if (await b.count()) await b.click().catch(() => {}); };

await p.goto(`${BASE}/#/orb/s/crypto`);
await wait(1400);
await p.getByRole("button", { name: "Scout the menu" }).click();
await wait(500);
for (let i = 1; i <= 6; i++) { await p.getByRole("button", { name: `card ${i}`, exact: true }).click(); await wait(250); }
await p.locator("button", { hasText: "Start in 2018" }).first().click();
await wait(1200);
await p.getByRole("button", { name: "Buy other coins instead", exact: true }).click();
await wait(1400);
await p.getByRole("button", { name: /Coin Alpha/ }).first().click();
await wait(400);
await p.locator("button", { hasText: /^Buy \$250$/ }).first().click();
await wait(600);
console.log("bought:", !/Nothing is here yet/.test(await body()));
await p.locator("button", { hasText: /^1×$/ }).first().click();
await wait(400); await fast();

const answers = { 2: "Hold on", 3: "Watch from the side", 4: "Take some profits", 5: "Sell what's left" };
let n = 1;
for (let i = 0; i < 1600 && n < 5; i++) {
  await wait(200);
  const t = await body();
  if (!/Read more:/.test(t)) continue;
  n++;
  await p.getByRole("button", { name: answers[n], exact: true }).click();
  await wait(1600);
  if (n === 4 || n === 5) {
    await p.screenshot({ path: OUT + `adv5-gate${n}-pause.png` });
    console.log(`gate${n}: paused =`, /paused for your move/.test(await body()));
    // open the holding row and look for a sell control
    const row = p.getByRole("button", { name: /Coin Alpha/ }).first();
    if (await row.count()) { await row.click(); await wait(500); }
    await p.screenshot({ path: OUT + `adv5-gate${n}-sellui.png` });
    const labels = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => (b.textContent || "").trim()).filter((s) => s && s.length < 30));
    console.log(`gate${n} buttons:`, JSON.stringify(labels.slice(0, 30)));
    const sell = p.locator("button", { hasText: /Sell/ }).first();
    if (await sell.count()) {
      const before = (await body()).match(/Net worth\s*\n\$([\d,]+)/)?.[1];
      await sell.click(); await wait(700);
      const after = (await body()).match(/Net worth\s*\n\$([\d,]+)/)?.[1];
      const cash = (await body()).match(/Cash\s*\n\$([\d,.]+)/)?.[1];
      console.log(`gate${n} sold: netbefore=${before} netafter=${after} cash=${cash}`);
    } else console.log(`gate${n}: NO SELL CONTROL FOUND`);
  }
  const play = p.locator("button", { hasText: /^1×$/ }).first();
  if (await play.count()) await play.click().catch(() => {});
  await wait(300); await fast();
}
console.log("ERRORS:", errs.length ? errs.join("\n") : "none");
await browser.close();
