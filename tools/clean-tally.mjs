// The clean type pass for The Tally, seen. It drives the real board at both
// sizes the contract names, walks the screens the pass touches, and leaves a
// shot of each one in tools/shots/clean-tally/.
//
// Usage: node tools/clean-tally.mjs

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const B = "http://localhost:4318/#/tally";
const OUT = "tools/shots/clean-tally/";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const log = (...a) => console.log(...a);

async function dismiss(page) {
  for (let i = 0; i < 20; i++) {
    const skip = page.locator('[data-tutorial-skip="1"]');
    if (await skip.count()) { await skip.first().click({ force: true }); await page.waitForTimeout(260); continue; }
    const paper = page.locator('[data-paper-continue="1"]');
    if (await paper.count()) { await paper.first().click({ force: true }); await page.waitForTimeout(320); continue; }
    const d = page.locator('[data-debut-continue="1"]');
    if (await d.count()) { await d.first().click({ force: true }); await page.waitForTimeout(260); continue; }
    break;
  }
}

async function run(tag, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto(B);
  await page.evaluate(() => {
    localStorage.removeItem("tally-run-v1");
    localStorage.setItem("tally-box-v1", JSON.stringify({
      clearedChapters: [1, 2, 3],
      instruments: ["SAVINGS", "BOND", "INDEX"],
      badges: ["wide-open", "iron-hand"],
      eraBest: {},
    }));
    localStorage.setItem("tally-tour-v1", "1");
  });
  await page.reload();
  await page.waitForTimeout(800);

  log(`\n== ${tag} ${width}x${height}`);
  await page.screenshot({ path: `${OUT}${tag}-1-menu.png` });
  log("  menu");

  await page.locator('[data-menu="collection"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${tag}-2-collection.png` });
  log("  collection");
  const close = page.locator("button:visible").filter({ hasText: /^Close$/ });
  if (await close.count()) await close.first().click();
  await page.waitForTimeout(300);

  await page.locator('[data-menu="chapters"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${tag}-3-chapters.png` });
  log("  chapters");

  // chapter 3 has a market, so the shop and the till have something in them
  await page.locator('[data-chapter-start="3"]').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}${tag}-4-chaptercard.png` });
  log("  chapter card");
  const begin = page.locator("button:visible").filter({ hasText: /^Begin$/ });
  if (await begin.count()) await begin.first().click();
  await page.waitForTimeout(700);
  await dismiss(page);

  // buy a few cards, twice on different turns, so a stack has lots in it
  for (let round = 0; round < 2; round++) {
    const open = page.locator('[data-shop-open="1"]');
    if (await open.count() && await open.first().isEnabled()) {
      await open.first().click();
      await page.waitForTimeout(500);
    }
    await dismiss(page);
    for (const tab of await page.locator("[data-buy]").all()) {
      if (await tab.isEnabled()) { await tab.click({ force: true }); await page.waitForTimeout(220); }
    }
    if (round === 0) {
      await page.screenshot({ path: `${OUT}${tag}-6-shop.png` });
      log("  shop");
    }
    const play = page.locator('[data-shop-play="1"]');
    if (await play.count() && await play.first().isEnabled()) {
      await play.first().click({ force: true });
      await page.waitForTimeout(900);
      const skip = page.locator('[data-skip="1"]');
      if (await skip.count()) { await skip.first().click({ force: true }); await page.waitForTimeout(600); }
      await dismiss(page);
    }
  }

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}${tag}-5-board.png` });
  log("  board");

  // the till, with a stack fanned into its lots
  const open2 = page.locator('[data-shop-open="1"]');
  if (await open2.count() && await open2.first().isEnabled()) {
    await open2.first().click();
    await page.waitForTimeout(500);
  }
  const lots = page.locator("[data-lots]");
  if (await lots.count()) { await lots.first().click({ force: true }); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${OUT}${tag}-8-till.png` });
  log("  till and lots");

  // a card, turned over, which is where the read lines live
  const face = page.locator("[data-till-stack] [data-card-name]");
  if (await face.count()) { await face.first().click({ force: true }); await page.waitForTimeout(500); }
  await page.screenshot({ path: `${OUT}${tag}-9-cardback.png` });
  log("  card back");
  await page.locator('[data-flip="open"]').first().click({ force: true, position: { x: 5, y: 5 } }).catch(() => {});
  await page.waitForTimeout(300);

  // a fresh chapter one, played end to end, for the summary overlay
  await page.goto(B);
  await page.evaluate(() => {
    localStorage.removeItem("tally-run-v1");
    localStorage.setItem("tally-tour-v1", "1");
  });
  await page.reload();
  await page.waitForTimeout(700);
  await page.locator('[data-menu="new"]').first().click({ force: true });
  const begin2 = page.locator("button:visible").filter({ hasText: /^Begin$/ });
  if (await begin2.count()) await begin2.first().click();
  await page.waitForTimeout(600);
  await dismiss(page);
  for (let i = 0; i < 20; i++) {
    await dismiss(page);
    const summary = page.locator("text=/^Chapter \\d (cleared|finished)$/");
    if (await summary.count()) break;
    const shut = page.locator('[data-shop-close="1"]:visible');
    if (await shut.count() && await shut.first().isEnabled()) {
      await shut.first().click({ force: true });
      await page.waitForTimeout(400);
    }
    const play = page.locator('[data-play="1"]:visible');
    if (!(await play.count())) break;
    const one = play.first();
    if (!(await one.isEnabled())) { await page.waitForTimeout(350); continue; }
    await one.click({ force: true });
    await page.waitForTimeout(900);
    const skip = page.locator('[data-skip="1"]');
    if (await skip.count()) { await skip.first().click({ force: true }); await page.waitForTimeout(500); }
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}${tag}-7-summary.png` });
  log("  summary");

  if (errs.length) log(`  page errors: ${errs.slice(0, 4).join(" | ")}`);
  else log("  no page errors");
  await page.close();
}

await run("wide", 1440, 950);
await run("phone", 390, 844);
await browser.close();
