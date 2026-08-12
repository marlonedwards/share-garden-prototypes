// Playtest round five, watched. It drives the real board at 1280x800 and checks
// the four things this round changed: no block that was standing vanishes when
// Play is pressed, chapter 7's numbers fit the rail without overflowing it, the
// scoring chips are on screen and loud, and three sells in a row from one stack
// count down while the unit price never moves.
import { chromium } from "playwright";

const B = "http://localhost:4318/#/tally";
const SHOTS = "tools/shots/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

const log = (...a) => console.log(...a);
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; log(`  ${ok ? "pass" : "FAIL"}  ${msg}`); };

async function fresh(chapter) {
  await page.goto(B);
  await page.evaluate((c) => {
    localStorage.removeItem("tally-run-v1");
    localStorage.setItem("tally-box-v1", JSON.stringify({
      clearedChapters: Array.from({ length: c }, (_, i) => i + 1),
      instruments: [], badges: [], eraBest: {},
    }));
  }, chapter);
  await page.reload();
  await page.waitForTimeout(700);
  // the game now opens on its main menu, so a run starts from there
  const newRun = page.locator('[data-menu="new"]');
  if (await newRun.count()) { await newRun.first().click(); await page.waitForTimeout(400); }
  const start = page.locator(`[aria-label="Start at chapter ${chapter}"]`);
  if (chapter > 1 && await start.count()) {
    await start.first().click();
    await page.waitForTimeout(400);
  }
  const begin = page.locator("button:visible").filter({ hasText: /^Begin$/ });
  if (await begin.count()) await begin.first().click();
  await page.waitForTimeout(500);
  await dismissGates();
}

async function dismissGates() {
  for (let i = 0; i < 14; i++) {
    const paper = page.locator('[data-paper-continue="1"]');
    if (await paper.count()) { await paper.first().click({ force: true }); await page.waitForTimeout(320); continue; }
    const d = page.locator('[data-debut-continue="1"]');
    if (await d.count()) { await d.first().click({ force: true }); await page.waitForTimeout(240); continue; }
    break;
  }
}

async function openShop() {
  const b = page.locator('[data-shop-open="1"]');
  if (await b.count() && await b.first().isEnabled()) await b.first().click();
  await page.waitForTimeout(200);
  await waitForCounter();
}

async function waitForCounter() {
  for (let i = 0; i < 30; i++) {
    const c = page.locator('[data-shop-close="1"]');
    if (await c.count() && await c.first().isEnabled()) return;
    await page.waitForTimeout(100);
  }
}

async function closeShop() {
  const c = page.locator('[data-shop-close="1"]');
  for (let i = 0; i < 20; i++) {
    await dismissGates();
    if (await c.count() && await c.first().isEnabled()) { await c.first().click({ force: true }); break; }
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(340);
}

async function buy(assetId, n) {
  let bought = 0;
  for (let i = 0; i < n; i++) {
    const b = page.locator(`[data-buy="${assetId}"]`);
    if (!(await b.count()) || !(await b.first().isEnabled())) break;
    await b.first().click();
    bought++;
    await page.waitForTimeout(110);
    await dismissGates();
  }
  return bought;
}

const columns = () => page.evaluate(() => {
  const out = {};
  for (const el of document.querySelectorAll("[data-col]")) {
    out[el.getAttribute("data-col")] = Number(el.getAttribute("data-col-blocks"));
  }
  return out;
});

async function play() {
  const b = page.locator('[data-play="1"]');
  if (!(await b.count()) || !(await b.first().isEnabled())) return false;
  await b.first().click({ force: true });
  return true;
}

async function finishResolve() {
  for (let i = 0; i < 90; i++) {
    if (!(await page.locator('[data-skip="1"]').count())) return;
    await page.waitForTimeout(150);
  }
}

// ---------------------------------------------- 1: nothing vanishes on Play

log("chapter 3: the standing column across Play");
await fresh(3);
await openShop();
await buy("SAVINGS", 2);
await closeShop();

for (const turn of [1, 2, 3]) {
  const before = await columns();
  const railBefore = await page.locator("[data-rail-count]").first().getAttribute("data-rail-count");
  if (!(await play())) break;
  // the first frames of the resolve, before anything has landed
  const frames = [];
  for (let i = 0; i < 4; i++) {
    frames.push(await columns());
    await page.waitForTimeout(16);
  }
  let worst = null;
  for (const frame of frames) {
    for (const k of Object.keys(before)) {
      const now = frame[k];
      if (now === undefined || now < before[k]) {
        worst = `column ${k} stood ${before[k]} and showed ${now}`;
      }
    }
  }
  check(worst === null, `turn ${turn}: every standing column held through Play (rail was ${railBefore})${worst ? `, ${worst}` : ""}`);
  await finishResolve();
  await dismissGates();
}

// ------------------------------------------------------- 1b: the grouping

log("\nchapter 2: the wall's grouping, on a tall column");
await fresh(2);
await openShop();
await buy("SAVINGS", 8);
await closeShop();
for (let t = 0; t < 4; t++) {
  if (!(await play())) break;
  await finishResolve();
  await dismissGates();
  await openShop();
  await buy("SAVINGS", 2);
  await closeShop();
}
await page.waitForTimeout(400);
await page.locator("[data-wall-geom]").first().screenshot({ path: SHOTS + "tally-r5-wall.png" });
log(`  ${await page.locator("[data-wall-geom]").first().getAttribute("data-wall-geom")}`);
log("  shot tally-r5-wall.png");

// -------------------------------------------------- 2: chapter 7's rail

log("\nchapter 7: the rail at the widest numbers on the ladder");
await fresh(7);
await closeShop();
await page.waitForTimeout(400);
const rail = await page.evaluate(() => {
  const el = document.querySelector('[data-rail="1"]');
  const box = el.getBoundingClientRect();
  const spills = [];
  for (const kid of el.querySelectorAll("*")) {
    const r = kid.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > box.right - 1 || r.left < box.left - 1) {
      spills.push(`${kid.textContent.slice(0, 28)} @ ${Math.round(r.right - box.right)}px`);
    }
  }
  return {
    width: Math.round(box.width),
    scroll: el.scrollWidth,
    client: el.clientWidth,
    height: Math.round(box.height),
    scrollH: el.scrollHeight,
    text: el.innerText.replace(/\n/g, " | "),
    spills,
  };
});
log(`  rail ${rail.width}px wide, reads "${rail.text}"`);
check(rail.scroll <= rail.client + 1, `nothing overflows the rail sideways (${rail.scroll} against ${rail.client})`);
check(rail.scrollH <= rail.height + 1, `nothing overflows the rail downward (${rail.scrollH} against ${rail.height})`);
check(rail.spills.length === 0, `no line reaches past the rail edge${rail.spills.length ? `: ${rail.spills.join(", ")}` : ""}`);
await page.locator('[data-rail="1"]').first().screenshot({ path: SHOTS + "tally-r5-rail.png" });
log("  shot tally-r5-rail.png");

// ------------------------------------------------------- 3: the scoring

log("\nchapter 6: the scoring chips");
await fresh(6);
await openShop();
await buy("INDEX", 2);
await closeShop();
await play();
let chipShot = false;
for (let i = 0; i < 60; i++) {
  const chips = await page.locator("[data-chip]").count();
  if (chips > 0) {
    await page.waitForTimeout(120);
    await page.screenshot({ path: SHOTS + "tally-r5-scoring.png" });
    const size = await page.evaluate(() => {
      const el = document.querySelector("[data-chip] span");
      const r = el.getBoundingClientRect();
      return { font: getComputedStyle(el).fontSize, w: Math.round(r.width), h: Math.round(r.height), label: el.textContent };
    });
    log(`  chip "${size.label}" at ${size.font}, ${size.w} by ${size.h}`);
    check(parseFloat(size.font) >= 15, "the chip type is at least 15px");
    chipShot = true;
    break;
  }
  await page.waitForTimeout(80);
}
check(chipShot, "a chip was on screen during the resolve");
await finishResolve();
await dismissGates();
log("  shot tally-r5-scoring.png");

// ---------------------------------------------------- 4: three sells in a row

log("\nchapter 6: three sells out of one stack");
await fresh(6);
const bought = [];
for (let t = 0; t < 3; t++) {
  await openShop();
  const n = await buy("INDEX", 1);
  const face = await page.locator('[data-market="INDEX"]').first().innerText();
  bought.push(face.replace(/\s+/g, " ").trim());
  await closeShop();
  if (n === 0) break;
  if (t < 2) { await play(); await finishResolve(); await dismissGates(); }
}
log(`  bought on three turns: ${bought.join(" / ")}`);

await openShop();
const sells = [];
const prices = [];
for (let i = 0; i < 3; i++) {
  const tab = page.locator('[data-till-stack="INDEX"] button').first();
  if (!(await tab.count())) break;
  const label = (await tab.textContent()).trim();
  const face = (await page.locator('[data-till-stack="INDEX"]').first().innerText()).replace(/\s+/g, " ").trim();
  const price = /\$[\d,]+\.\d\d/.exec(face)?.[0] ?? "";
  sells.push(label);
  prices.push(price);
  if (i === 0) {
    // clicking a tab scrolls the counter, and the shot is about the till
    await page.evaluate(() => { for (const el of document.querySelectorAll("[data-shop] .tally-scroll")) el.scrollTop = 0; });
    await page.waitForTimeout(120);
    await page.screenshot({ path: SHOTS + "tally-r5-sell.png" });
  }
  await tab.click();
  await page.waitForTimeout(220);
}
log(`  tabs: ${sells.join("  |  ")}`);
log(`  the card's own price each time: ${prices.join(", ")}`);
check(sells.length === 3, "three sells came out of the stack");
check(new Set(prices).size === 1 && prices[0] !== "", `the unit price never moved (${prices[0]})`);
const dollars = sells.map((s) => (/\$[\d,]+$/.exec(s) ?? [""])[0]);
check(new Set(dollars).size === dollars.length, `each sell handed back its own figure (${dollars.join(", ")})`);
// Round six took the countdown off the tab: a stack now carries Sell 1, Sell 5
// and Sell all, and the count lives on the collar under the card where it
// always was, so what this checks is that the tab is the one card tab every
// time and that each press hands back that one card's own money.
check(sells.every((s) => /^Sell 1 · \$[\d,]+$/.test(s)), `every press sold one card (${sells.join(", ")})`);
log("  shot tally-r5-sell.png");
await closeShop();

// -------------------------------------------------- 5: chapter 2, played once

log("\nchapter 2: the interest moment and the one block deposit");
await fresh(2);
await openShop();
const oneBlock = (await page.locator('[data-buy="SAVINGS"]').first().textContent()).trim();
const savingsFace = (await page.locator('[data-market="SAVINGS"]').first().innerText()).replace(/\s+/g, " ").trim();
await buy("SAVINGS", 6);
await closeShop();
let paid = null;
for (let t = 0; t < 3; t++) {
  if (!(await play())) break;
  await finishResolve();
  await dismissGates();
  const el = page.locator("[data-interest]");
  if (await el.count()) paid = await el.first().getAttribute("data-interest");
}
log(`  buy tab "${oneBlock}", card face "${savingsFace}"`);
check(paid !== null, `the bank's payment landed at the read beat (${paid})`);
await page.waitForTimeout(200);
await page.screenshot({ path: SHOTS + "tally-r5-ch2.png" });

// ------------------------------------------- 6: the type scale, both boards

const clipped = () => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("[data-board] *")) {
    const s = getComputedStyle(el);
    if (s.overflowX !== "hidden" && s.overflow !== "hidden") continue;
    // a shut shop is parked below the board on a transform, which counts as
    // overflow and is not one
    if (el.matches('[data-shop="closed"]') || el.querySelector('[data-shop="closed"]')) continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
      out.push(`${el.textContent.slice(0, 24)} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
    }
  }
  return out;
});

log("\nthe type scale, on both boards");
await fresh(6);
await closeShop();
await page.waitForTimeout(300);
const wide = await clipped();
check(wide.length === 0, `nothing is clipped at 1280 by 800${wide.length ? `: ${wide.join(" ; ")}` : ""}`);
await page.setViewportSize({ width: 430, height: 780 });
await page.waitForTimeout(400);
const narrow = await clipped();
check(narrow.length === 0, `nothing is clipped on the natural 420 board${narrow.length ? `: ${narrow.join(" ; ")}` : ""}`);
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(300);

log(`\n${errs.length ? `console: ${errs.slice(0, 4).join(" | ")}` : "no console errors"}`);
log(bad === 0 ? "\nALL CHECKS PASSED" : `\n${bad} check(s) failed`);
await browser.close();
