// The gates the main walk cannot reach in one sitting: the debut panel, the
// front page, and the run over report. Shots land beside the rest in
// tools/shots/clean-tally/.
//
// Usage: node tools/clean-tally-gates.mjs

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const B = "http://localhost:4318/#/tally";
const OUT = "tools/shots/clean-tally/";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const log = (...a) => console.log(...a);

async function run(tag, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto(B);
  await page.evaluate(() => {
    localStorage.removeItem("tally-run-v1");
    localStorage.setItem("tally-tour-v1", "1");
    localStorage.setItem("tally-box-v1", JSON.stringify({
      clearedChapters: [1, 2, 3, 4, 5, 6, 7, 8], instruments: [], badges: [], eraBest: {},
    }));
  });
  await page.reload();
  await page.waitForTimeout(800);

  log(`\n== ${tag} ${width}x${height}`);
  await page.locator('[data-menu="chapters"]').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-chapter-start="6"]').first().click({ force: true });
  await page.waitForTimeout(500);
  const confirm = page.locator("[data-chapter-confirm]");
  if (await confirm.count()) { await confirm.first().click({ force: true }); await page.waitForTimeout(400); }
  const begin = page.locator("button:visible").filter({ hasText: /^Begin$/ });
  if (await begin.count()) await begin.first().click();
  await page.waitForTimeout(700);

  // the debut, which fires the first time a card type is on the counter
  const debut = page.locator('[data-debut-continue="1"]');
  if (await debut.count()) {
    await page.screenshot({ path: `${OUT}${tag}-a-debut.png` });
    log("  debut");
    while (await page.locator('[data-debut-continue="1"]').count()) {
      await page.locator('[data-debut-continue="1"]').first().click({ force: true });
      await page.waitForTimeout(300);
    }
  } else log("  no debut on the opening");

  // play until a front page lands
  let paper = false;
  for (let i = 0; i < 14; i++) {
    const p = page.locator('[data-paper-continue="1"]');
    if (await p.count()) {
      await page.screenshot({ path: `${OUT}${tag}-b-frontpage.png` });
      log("  front page");
      paper = true;
      await p.first().click({ force: true });
      await page.waitForTimeout(400);
      break;
    }
    while (await page.locator('[data-debut-continue="1"]').count()) {
      await page.locator('[data-debut-continue="1"]').first().click({ force: true });
      await page.waitForTimeout(280);
    }
    const shut = page.locator('[data-shop-close="1"]:visible');
    if (await shut.count() && await shut.first().isEnabled()) {
      await shut.first().click({ force: true });
      await page.waitForTimeout(350);
    }
    const play = page.locator('[data-play="1"]:visible');
    if (!(await play.count())) break;
    if (!(await play.first().isEnabled())) { await page.waitForTimeout(350); continue; }
    await play.first().click({ force: true });
    await page.waitForTimeout(800);
    const skip = page.locator('[data-skip="1"]');
    if (await skip.count()) { await skip.first().click({ force: true }); await page.waitForTimeout(450); }
  }
  if (!paper) log("  no front page reached");

  // and the run over report, by finishing a chapter under its target
  for (let i = 0; i < 40; i++) {
    while (await page.locator('[data-paper-continue="1"]').count()) {
      await page.locator('[data-paper-continue="1"]').first().click({ force: true });
      await page.waitForTimeout(320);
    }
    while (await page.locator('[data-debut-continue="1"]').count()) {
      await page.locator('[data-debut-continue="1"]').first().click({ force: true });
      await page.waitForTimeout(280);
    }
    const over = page.locator("button:visible").filter({ hasText: /^Start a new run at chapter/ });
    if (await over.count()) break;
    const cont = page.locator("button:visible").filter({ hasText: /^Continue$/ });
    if (await cont.count()) { await cont.first().click({ force: true }); await page.waitForTimeout(500); continue; }
    const shut = page.locator('[data-shop-close="1"]:visible');
    if (await shut.count() && await shut.first().isEnabled()) {
      await shut.first().click({ force: true });
      await page.waitForTimeout(350);
    }
    const play = page.locator('[data-play="1"]:visible');
    if (!(await play.count())) break;
    if (!(await play.first().isEnabled())) { await page.waitForTimeout(350); continue; }
    await play.first().click({ force: true });
    await page.waitForTimeout(750);
    const skip = page.locator('[data-skip="1"]');
    if (await skip.count()) { await skip.first().click({ force: true }); await page.waitForTimeout(420); }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${tag}-c-runover.png` });
  log("  run over");

  if (errs.length) log(`  page errors: ${errs.slice(0, 4).join(" | ")}`);
  else log("  no page errors");
  await page.close();
}

await run("wide", 1440, 950);
await run("phone", 390, 844);
await browser.close();
