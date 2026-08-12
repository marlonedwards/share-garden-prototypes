// A filmstrip of one stack's punch, so the spring can be looked at rather than
// guessed at. It plays a turn in chapter 6 and shoots the stack row every few
// milliseconds from the moment a stack takes its hit.
//
// Usage: node tools/lab/punchstrip.mjs [tone]

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const WANT = process.argv[2] ?? "any";
const CH = process.argv[3] ?? "6";
const BASE = "http://localhost:4318/#/tally";
const OUT = new URL("../shots/lab/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem("tally-box-v1", JSON.stringify({
      clearedChapters: [1, 2, 3, 4, 5, 6, 7], instruments: [], badges: [], eraBest: {},
    }));
  } catch (e) {}
});
await page.goto(BASE);
await wait(500);
await page.locator('[data-menu="chapters"]').click();
await wait(300);
await page.locator(`[data-chapter-start="${CH}"]`).click();
await wait(400);
await page.getByRole("button", { name: "Begin", exact: true }).click();
await wait(900);
for (let i = 0; i < 6; i++) {
  if (await page.locator('[data-debut-continue="1"]').count()) {
    await page.locator('[data-debut-continue="1"]').click();
    await wait(240);
  } else break;
}
const buys = page.locator("[data-buy]");
let bought = 0;
// the same name three times over, so the stack has peek edges to tick
for (let i = 0; i < 6 && bought < 3; i++) {
  const b = buys.nth(2);
  if (!(await b.count())) break;
  if (await b.isEnabled()) {
    await b.click();
    bought++;
    await wait(240);
    for (let k = 0; k < 3; k++) {
      if (await page.locator('[data-debut-continue="1"]').count()) {
        await page.locator('[data-debut-continue="1"]').click();
        await wait(220);
      } else break;
    }
  }
}
await page.locator('[data-shop-close="1"]').click();
await wait(400);

// play turns until the wanted tone shows up
for (let turn = 0; turn < 6; turn++) {
  const play = page.locator('[data-play="1"]');
  if (!(await play.count()) || !(await play.isEnabled())) break;
  await play.click();
  let hit = null;
  for (let i = 0; i < 150; i++) {
    hit = await page.evaluate(() => {
      const el = document.querySelector("[data-punch]");
      if (!el) return null;
      const w = el.querySelector(".tally-punch");
      if (!w || getComputedStyle(w).animationName === "none") return null;
      return el.dataset.punch;
    });
    if (hit && (WANT === "any" || hit === WANT)) break;
    hit = null;
    await wait(16);
  }
  if (hit) {
    const row = page.locator('[data-tray="1"]');
    for (let f = 0; f < 10; f++) {
      await row.screenshot({ path: `${OUT}punch-${hit}-${String(f).padStart(2, "0")}.png` });
      await wait(16);
    }
    console.log("caught", hit);
    break;
  }
  await wait(3000);
  for (let i = 0; i < 4; i++) {
    if (await page.locator('[data-paper-continue="1"]').count()) {
      await page.locator('[data-paper-continue="1"]').click();
      await wait(300);
    } else break;
  }
}

await browser.close();
