// Pass two: settle time at each gate before measuring the fold, and drive the
// act-flag path (an option that implies a trade must actually pause the tape).
import { chromium } from "playwright";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = new URL("./shots/overnight/", import.meta.url).pathname;
const BASE = "http://localhost:4330";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ");

const fold = () =>
  p.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((b) => b.offsetParent !== null);
    const lowest = btns.reduce((m, b) => Math.max(m, b.getBoundingClientRect().bottom), 0);
    return { docH: document.documentElement.scrollHeight, viewH: window.innerHeight, lowestBtn: Math.round(lowest) };
  });

await p.goto(`${BASE}/#/orb/s/gfc`);
await wait(1000);
await p.getByRole("button", { name: /Scout the menu/ }).first().click();
await wait(400);
const n = await p.locator('button[aria-label^="card "]').count();
for (let i = 0; i < n; i++) { await p.locator(`button[aria-label="card ${i + 1}"]`).click(); await wait(70); }
await p.locator("button").filter({ hasText: /^Start in 2007$/ }).first().click();
await wait(700);

// buy something first so the run is not empty
const add = p.locator("button", { hasText: /^Add a color$/ }).first();
if (await add.count()) {
  await add.click(); await wait(300);
  await p.locator("button").filter({ hasText: /Everything Mart/ }).first().click();
  await wait(500);
  const buy = p.locator("button").filter({ hasText: /^Buy/ }).first();
  if (await buy.count()) { await buy.click(); await wait(600); }
}
console.log("after first buy:", (await body()).slice(0, 260));

let hit = 0;
const acted = [];
for (let t = 0; t < 900; t++) {
  const txt = await body();
  if (/Read more:/.test(txt) && !/Take these lessons/.test(txt)) {
    hit++;
    await wait(900); // let the stage finish shrinking
    const f = await fold();
    console.log(`gate ${hit} settled fold`, JSON.stringify(f), f.docH > f.viewH ? "SCROLLS" : "fits");
    await p.screenshot({ path: OUT + `gfcv2-gate${hit}.png` });
    // take an act option this time
    const actOpt = p.locator("button").filter({ hasText: /^(Buy more while it climbs|Buy the fear|Buy while everyone is scared|Buy|Put spare cash in)$/ }).first();
    const label = (await actOpt.innerText()).trim();
    await actOpt.click();
    await wait(900);
    const after = await body();
    const paused = /paused for your move/.test(after);
    acted.push({ gate: hit, label, paused });
    console.log(`gate ${hit} act "${label}" -> paused for move: ${paused}`);
    if (hit === 3) await p.screenshot({ path: OUT + "gfcv2-actpause.png" });
    const play = p.locator("button").filter({ hasText: /^Play$/ }).first();
    if (await play.count()) await play.click();
    const f4 = p.locator("button", { hasText: /^4×$/ }).first();
    if (await f4.count()) await f4.click();
    continue;
  }
  if (/You finished with/.test(txt)) break;
  await wait(220);
}
console.log("gates:", hit, JSON.stringify(acted));
console.log("== END ==", (await body()).slice(0, 900));
await p.screenshot({ path: OUT + "gfcv2-end.png" });
await browser.close();
console.log("DONE2");
