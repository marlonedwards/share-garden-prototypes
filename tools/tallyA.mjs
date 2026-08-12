// The Tally, sprint one build order A: the shell around the game.
//
// It checks the five things the shell has to get right, at both sizes:
//   the board is the window at sixteen by nine and nothing scrolls
//   the menu offers Continue only when a saved run truly exists
//   the chapter tiles lock, and picking one starts a run there
//   the strip is reachable while an overlay covers the board body
//   the shop is a screen the body swaps to, and the run's seed is nowhere
//
// Usage: node tools/tallyA.mjs

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#/tally";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
function check(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) fails.push(label);
}

const browser = await chromium.launch();

async function session(width, height, tag) {
  console.log(`\n---------------------------------------------- ${width}x${height}`);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push(`pageerror ${tag}`); });
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);
  await wait(600);

  // ------------------------------------------------------------ the board
  const board = await page.evaluate(() => {
    const r = document.querySelector('[data-board="tally"]').getBoundingClientRect();
    return { w: r.width, h: r.height, iw: window.innerWidth, ih: window.innerHeight };
  });
  check(board.h <= board.ih && board.w <= board.iw, `${tag}: the board fits the window`,
    `${board.w.toFixed(1)}x${board.h.toFixed(1)} in ${board.iw}x${board.ih}`);
  const ratio = board.w / board.h;
  const off = Math.abs(ratio - 16 / 9) * board.h;
  if (width === 1920) {
    check(off < 1, `${tag}: the board is sixteen by nine within a pixel`, `off by ${off.toFixed(3)}px`);
    check(Math.round(board.h) === height - 14, `${tag}: the board takes the viewport height less the margin`, `${board.h}`);
  }

  const scroll = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
    bx: document.body.scrollWidth - window.innerWidth,
    by: document.body.scrollHeight - window.innerHeight,
  }));
  check(scroll.x <= 0 && scroll.y <= 0 && scroll.bx <= 0 && scroll.by <= 0,
    `${tag}: the page does not scroll`, JSON.stringify(scroll));

  // ------------------------------------------------------------- the menu
  check(await page.locator('[data-screen="menu"]').count() === 1, `${tag}: the menu is the first screen`);
  check(await page.locator('[data-menu="continue"]').count() === 0,
    `${tag}: a fresh profile is offered no run to continue`);
  const savedAtBoot = await page.evaluate(() => localStorage.getItem("tally-run-v1"));
  check(savedAtBoot === null, `${tag}: opening the page saved nothing`, String(savedAtBoot).slice(0, 24));
  for (const item of ["new", "chapters", "collection", "guide", "tutorial", "sound"]) {
    if (!(await page.locator(`[data-menu="${item}"]`).count())) fails.push(`${tag}: menu is missing ${item}`);
  }
  check(await page.locator('[data-menu="guide"]').getAttribute("href") === "#/orb/guide",
    `${tag}: the field guide is one press from the menu`);
  if (tag === "800") await page.screenshot({ path: OUT + "tally-a-menu.png" });

  // the chapter tiles, from the menu, on a fresh box
  await page.locator('[data-menu="chapters"]').click();
  await wait(300);
  const tiles = await page.locator("[data-chapter-tile]").count();
  const locked = await page.locator('[data-chapter-tile][data-locked="1"]').count();
  check(tiles === 8, `${tag}: eight chapters on the selector`, String(tiles));
  check(locked === 7, `${tag}: seven are locked on a fresh box`, String(locked));
  const silhouette = await page.locator('[data-chapter-tile="4"]').innerText();
  check(!/./.test(silhouette.split("\n")[1] ?? "") || silhouette.includes("• • •"),
    `${tag}: a locked chapter shows no details`, silhouette.replace(/\n/g, " | "));
  check(await page.locator('[data-chapter-start="4"]').count() === 0,
    `${tag}: a locked chapter cannot be started`);
  if (tag === "800") await page.screenshot({ path: OUT + "tally-a-chapters.png" });

  // picking chapter 1 with no run going starts it with no question asked
  await page.locator('[data-chapter-start="1"]').click();
  await wait(500);
  check(await page.locator('[data-board="tally"]').getAttribute("data-app-screen") === "game",
    `${tag}: picking an unlocked chapter starts a run there`);
  const runId = await page.evaluate(() => {
    const raw = localStorage.getItem("tally-run-v1");
    return raw ? JSON.parse(raw).runId : null;
  });
  check(!!runId, `${tag}: starting a run wrote the save`, String(runId));

  // --------------------------------------------- the strip, under an overlay
  check(await page.locator('[data-overlay="1"]').count() === 1, `${tag}: the chapter card is up`);
  const stripBox = await page.locator('[data-strip="1"]').boundingBox();
  const overlayBox = await page.locator('[data-overlay="1"]').boundingBox();
  check(overlayBox.y >= stripBox.y + stripBox.height - 1,
    `${tag}: the overlay layer starts below the strip`,
    `strip ends ${(stripBox.y + stripBox.height).toFixed(0)}, overlay starts ${overlayBox.y.toFixed(0)}`);
  await page.locator('[data-strip-chapters="1"]').click();
  await wait(300);
  check(await page.locator('[data-screen="chapters"]').count() === 1,
    `${tag}: the strip works while an overlay covers the body`);
  // a live run makes the pick ask first
  await page.locator('[data-chapter-start="1"]').click();
  await wait(200);
  check(await page.locator('[data-chapter-confirm="1"]').count() === 1,
    `${tag}: picking a chapter mid run asks first`);
  await page.locator('[data-chapter-cancel="1"]').click();
  await wait(150);
  await page.locator('[data-chapters-back="1"]').click();
  await wait(300);
  check(await page.locator('[data-board="tally"]').getAttribute("data-app-screen") === "game",
    `${tag}: Back from the selector returns to the game`);

  // ------------------------------------------------------ leaving and back
  await page.locator('[data-strip-menu="1"]').click();
  await wait(300);
  check(await page.locator('[data-menu="continue"]').count() === 1,
    `${tag}: leaving mid run leaves a run to continue`);
  await page.locator('[data-menu="continue"]').click();
  await wait(300);
  check(await page.locator('[data-board="tally"]').getAttribute("data-app-screen") === "game",
    `${tag}: Continue returns to the run`);

  // --------------------------------------------------------- a whole chapter
  const seenId = [];
  const scanForId = async (where) => {
    const text = await page.evaluate(() => document.body.innerText);
    if (runId && text.includes(runId)) seenId.push(where);
  };

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(900);
  const shopState = await page.evaluate(() => {
    const shop = document.querySelector("[data-shop]");
    const view = document.querySelector('[data-view="shop"]');
    const table = document.querySelector('[data-view="table"]');
    const cs = getComputedStyle(view);
    return {
      open: shop.getAttribute("data-shop"),
      shopOpacity: Number(cs.opacity),
      tableOpacity: Number(getComputedStyle(table).opacity),
      transition: cs.transition,
      inBody: !!document.querySelector('[data-body="1"] [data-view="shop"]'),
    };
  });
  check(shopState.open === "open" && shopState.shopOpacity > 0.9 && shopState.tableOpacity < 0.1,
    `${tag}: the shop is a screen the body swapped to`, JSON.stringify(shopState));
  check(shopState.inBody && /opacity/.test(shopState.transition),
    `${tag}: the swap is a crossfade inside the board body`);
  await scanForId("the shop");

  let summaries = 0;
  let turns = 0;
  let debuts = 0;
  let bought = 0;
  let shopShot = false;
  for (let i = 0; i < 140 && summaries < 2; i++) {
    if (await page.locator('[data-debut-continue="1"]').count()) {
      debuts++;
      await page.locator('[data-debut-continue="1"]').click();
      await wait(240);
      continue;
    }
    if (await page.locator('[data-paper-continue="1"]').count()) {
      await page.locator('[data-paper-continue="1"]').click();
      await wait(320);
      continue;
    }
    if (await page.getByRole("button", { name: "Continue", exact: true }).count()) {
      await scanForId("the chapter summary");
      const summary = await page.locator('[data-overlay="1"]').innerText();
      check(/Chapter \d+ of 8/.test(summary), `${tag}: the summary says where the ladder is`,
        (summary.match(/Chapter \d+ of 8[^\n]*/) ?? ["missing"])[0]);
      check(/Next: chapter \d+, .+ · \d+ turns/.test(summary) || !/cleared/.test(summary),
        `${tag}: a cleared chapter names the next one`,
        (summary.match(/Next:[^\n]*/) ?? ["no next line"])[0]);
      check(!/Run [A-Z0-9]/.test(summary), `${tag}: the summary has no run seed on it`);
      summaries++;
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await wait(700);
      continue;
    }
    if (await page.getByRole("button", { name: "Begin", exact: true }).count()) {
      await page.getByRole("button", { name: "Begin", exact: true }).click();
      await wait(1100);
      continue;
    }
    const close = page.locator('[data-shop-close="1"]');
    if (await page.evaluate(() => document.querySelector("[data-shop]").getAttribute("data-shop") === "open")) {
      const buy = page.locator("[data-buy]").first();
      if ((await buy.count()) && (await buy.isEnabled())) {
        await buy.click();
        bought++;
        await wait(260);
      }
      if (!shopShot && (await page.locator("[data-buy]").count()) > 0 && tag === "800") {
        await page.screenshot({ path: OUT + "tally-a-shop-screen.png" });
        shopShot = true;
      }
      await close.click();
      await wait(400);
      // the board itself, at the size the big screen gives it
      if (!shopShot && tag === "1080" && (await page.locator('[data-overlay="1"]').count()) === 0) {
        await page.screenshot({ path: OUT + "tally-a-1080.png" });
        shopShot = true;
      }
      continue;
    }
    const play = page.locator('[data-play="1"]');
    if ((await play.count()) && (await play.isEnabled())) {
      await play.click();
      turns++;
      await wait(1700);
      await scanForId(`turn ${turns}`);
      // every other turn, go shopping from the read beat
      if (turns % 2 === 0) {
        const open = page.locator('[data-shop-open="1"]');
        if (await open.count() && await open.isEnabled()) { await open.click(); await wait(400); }
      }
      continue;
    }
    await wait(300);
  }
  check(summaries === 2, `${tag}: two whole chapters play through, shop and all`,
    `turns=${turns}, debuts=${debuts}, bought=${bought}`);
  check(bought > 0 && debuts > 0, `${tag}: cards were bought from the shop screen`, `bought=${bought}`);
  check(seenId.length === 0, `${tag}: the run's seed appears nowhere on screen`, seenId.join(", "));

  const scroll2 = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  check(scroll2.x <= 0 && scroll2.y <= 0, `${tag}: still no page scroll after a chapter`, JSON.stringify(scroll2));

  await ctx.close();
}

// The same selector, with a box that has been played: the cleared chapters are
// open, the era chapters carry a best figure and the authored ones say cleared.
async function seeded() {
  console.log("\n---------------------------------------------- a played box");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror seeded"); });
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem("tally-box-v1", JSON.stringify({
        clearedChapters: [1, 2, 3, 4, 5, 6],
        instruments: [],
        badges: [],
        eraBest: { gfc: 12345 },
      }));
    } catch (e) {}
  });
  await page.goto(BASE);
  await wait(500);
  await page.locator('[data-menu="chapters"]').click();
  await wait(300);
  const locked = await page.locator('[data-chapter-tile][data-locked="1"]').count();
  // a chapter is a start point when it was cleared, which is the model's own
  // rule for start points, so clearing six opens six and not seven
  check(locked === 2, "a played box locks only what was never cleared", String(locked));
  const two = await page.locator('[data-chapter-tile="2"]').innerText();
  check(two.includes("cleared"), "an authored chapter that was cleared says so", two.replace(/\n/g, " | "));
  const six = await page.locator('[data-chapter-tile="6"]').innerText();
  check(six.includes("best $12,345"), "an era chapter carries its best figure", six.replace(/\n/g, " | "));
  const seven = await page.locator('[data-chapter-tile="7"]').innerText();
  check(!seven.includes("best"), "an era chapter never played carries no figure", seven.replace(/\n/g, " | "));
  await page.locator('[data-chapter-start="6"]').click();
  await wait(500);
  check(await page.locator('[data-board="tally"]').getAttribute("data-app-screen") === "game",
    "with no run going, a pick starts straight away");
  const started = await page.evaluate(() => {
    const raw = localStorage.getItem("tally-run-v1");
    return raw ? JSON.parse(raw).startChapter : null;
  });
  check(started === 6, "the run starts at the chapter that was picked", String(started));
  await ctx.close();
}

await session(1280, 800, "800");
await session(1920, 1080, "1080");
await seeded();

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}` : "\nAll checks passed.");
process.exit(fails.length ? 1 : 0);
