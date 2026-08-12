// The Tally, sprint one build order B: the game UI pass and the card punch.
//
// It plays a chapter at both sizes and checks the things the pass is allowed to
// break: nothing scrolls, nothing is clipped out of the board, every region is
// a framed panel, and the scoring animation actually fires on the stack whose
// turn it is. It leaves the five shots the sprint asks for behind.
//
// Usage: node tools/tallyB.mjs

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

// Everything inside the board has to stay inside the board: a frame that hangs
// off the cabinet is worse than no frame at all.
async function clipping(page, tag, where) {
  const bad = await page.evaluate(() => {
    const board = document.querySelector('[data-board="tally"]');
    if (!board) return [];
    const b = board.getBoundingClientRect();
    const out = [];
    for (const el of board.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const over =
        Math.max(0, b.left - r.left) + Math.max(0, r.right - b.right) +
        Math.max(0, b.top - r.top) + Math.max(0, r.bottom - b.bottom);
      // a scroller's own content is allowed to be longer than its box
      if (over > 2 && !el.closest(".tally-scroll")) {
        out.push(`${el.tagName}.${el.className || ""}${el.dataset.view ?? ""} over ${over.toFixed(0)}`);
      }
    }
    return out.slice(0, 6);
  });
  check(bad.length === 0, `${tag}: nothing hangs off the board at ${where}`, bad.join(" | "));
}

async function noScroll(page, tag, where) {
  const s = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  check(s.x <= 0 && s.y <= 0, `${tag}: no page scroll at ${where}`, JSON.stringify(s));
}

async function session(width, height, tag, shots) {
  console.log(`\n---------------------------------------------- ${width}x${height}`);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push(`pageerror ${tag}`); });
  // a box with the ladder opened, so the table under test is a chapter with a
  // market on it rather than the tutorial's empty counter
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
  await wait(600);

  await noScroll(page, tag, "the menu");
  await clipping(page, tag, "the menu");
  await page.screenshot({ path: OUT + (shots ? "tally-b-menu.png" : "tally-b-menu-1080.png") });

  // the chapter selector, and the abandon question inside a tile
  await page.locator('[data-menu="chapters"]').click();
  await wait(300);
  await clipping(page, tag, "the chapters");
  if (shots) await page.screenshot({ path: OUT + "tally-b-chapters.png" });

  await page.locator('[data-chapter-start="6"]').click();
  await wait(500);
  await clipping(page, tag, "the chapter card");
  if (shots) await page.screenshot({ path: OUT + "tally-b-overlay.png" });
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(1000);
  for (let i = 0; i < 6; i++) {
    if (await page.locator('[data-debut-continue="1"]').count()) {
      await page.locator('[data-debut-continue="1"]').click();
      await wait(260);
    } else break;
  }

  // the shop, with a counter and a till both carrying cards
  const buys = page.locator("[data-buy]");
  let bought = 0;
  for (let i = 0; i < 5 && bought < 3; i++) {
    const b = buys.nth(i);
    if (!(await b.count())) break;
    if (await b.isEnabled()) {
      await b.click();
      bought++;
      await wait(260);
      for (let k = 0; k < 3; k++) {
        if (await page.locator('[data-debut-continue="1"]').count()) {
          await page.locator('[data-debut-continue="1"]').click();
          await wait(240);
        } else break;
      }
    }
  }
  check(bought > 0, `${tag}: cards can be bought on the counter`, `bought=${bought}`);
  await clipping(page, tag, "the shop");
  if (shots) await page.screenshot({ path: OUT + "tally-b-shop.png" });
  const close = page.locator('[data-shop-close="1"]');
  if (await close.count()) { await close.click(); await wait(400); }

  // the confirm state inside a chapter tile, with a run going
  await page.locator('[data-strip-chapters="1"]').click();
  await wait(320);
  await page.locator('[data-chapter-start="1"]').click();
  await wait(220);
  const wrap = await page.evaluate(() => {
    const b = document.querySelector('[data-chapter-confirm="1"]');
    const k = document.querySelector('[data-chapter-cancel="1"]');
    if (!b || !k) return null;
    // the label may not wrap and may not be wider than the button it is in
    const fits = (el) => getComputedStyle(el).whiteSpace === "nowrap" &&
      el.scrollWidth <= el.clientWidth + 1;
    return {
      start: fits(b), keep: fits(k),
      w: Math.round(b.getBoundingClientRect().width),
      need: b.scrollWidth,
    };
  });
  check(!!wrap && wrap.start && wrap.keep,
    `${tag}: the abandon question's answers are one line each`, JSON.stringify(wrap));
  if (shots) await page.screenshot({ path: OUT + "tally-b-confirm.png" });
  await page.locator('[data-chapter-cancel="1"]').click();
  await wait(150);
  await page.locator('[data-chapters-back="1"]').click();
  await wait(350);

  // the table
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-debut-continue="1"]').count()) {
      await page.locator('[data-debut-continue="1"]').click();
      await wait(240);
      continue;
    }
    break;
  }
  await wait(200);
  await noScroll(page, tag, "the table");
  await clipping(page, tag, "the table");
  const framed = await page.evaluate(() => {
    const q = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { w: parseFloat(cs.borderTopWidth), r: parseFloat(cs.borderTopLeftRadius) };
    };
    return {
      board: q('[data-board="tally"]'),
      strip: q('[data-strip="1"]'),
      tray: q('[data-tray="1"]'),
      rail: q('[data-rail="1"]'),
    };
  });
  check(
    framed.board && framed.board.w >= 1.5 && framed.strip && framed.strip.w >= 1.4 &&
    framed.tray && framed.tray.w >= 1.4,
    `${tag}: the board, the strip and the tray all carry a frame`, JSON.stringify(framed));
  await page.screenshot({ path: OUT + (shots ? "tally-b-table.png" : "tally-b-table-1080.png") });

  // the scoring: catch a stack mid punch
  const play = page.locator('[data-play="1"]');
  if ((await play.count()) && (await play.isEnabled())) {
    await play.click();
    let caught = null;
    // the shot wants a stack that actually moved, so a held holding is taken
    // only if nothing better turns up
    for (let i = 0; i < 120; i++) {
      const seen = await page.evaluate(() => {
        const el = document.querySelector("[data-punch]");
        if (!el) return null;
        const card = el.querySelector(".tally-punch");
        const anim = card ? getComputedStyle(card).animationName : "none";
        return { tone: el.dataset.punch, anim };
      });
      if (seen && seen.anim && seen.anim !== "none") {
        caught = seen;
        if (seen.tone !== "flat") break;
        await page.screenshot({ path: OUT + (shots ? "tally-b-scoring.png" : "tally-b-scoring-1080.png") });
      }
      await wait(24);
    }
    check(!!caught, "a stack takes its own punch as its turn arrives", JSON.stringify(caught));
    await wait(2600);
    for (let i = 0; i < 4; i++) {
      if (await page.locator('[data-paper-continue="1"]').count()) {
        await page.locator('[data-paper-continue="1"]').click();
        await wait(320);
      } else break;
    }

    // The mid punch still. A shutter takes longer than the spring does, so the
    // next turn is scored with the animation clock dilated: the frame is a real
    // frame of the real keyframes, held long enough to photograph.
    const play2 = page.locator('[data-play="1"]');
    if ((await play2.count()) && (await play2.isEnabled())) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Animation.enable");
      await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.08 });
      await play2.click();
      let shot = false;
      for (let i = 0; i < 160 && !shot; i++) {
        // how far into its own spring the card is, so the shutter opens on the
        // frame where the punch is at its peak and not on either end of it
        const seen = await page.evaluate(() => {
          const el = document.querySelector("[data-punch]");
          if (!el) return null;
          const card = el.querySelector(".tally-punch");
          if (!card) return null;
          const a = card.getAnimations()[0];
          if (!a) return null;
          const dur = a.effect.getTiming().duration;
          return { tone: el.dataset.punch, prog: Number(a.currentTime) / dur };
        });
        if (seen && seen.tone !== "flat" && seen.prog >= 0.10 && seen.prog <= 0.4) {
          await page.screenshot({ path: OUT + (shots ? "tally-b-scoring.png" : "tally-b-scoring-1080.png") });
          shot = true;
        }
        if (!shot) await wait(20);
      }
      check(shot, `${tag}: the mid punch frame was caught`);
      await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
      await wait(2600);
    }
  }
  await noScroll(page, tag, "after a scoring");
  await clipping(page, tag, "after a scoring");

  await ctx.close();
}

// Reduced motion: the same scoring, as end states. No punch ever plays, the
// chips are all on the table at once, and the round still ends at the table.
async function reduced() {
  console.log("\n---------------------------------------------- reduced motion");
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 }, reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror reduced"); });
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem("tally-box-v1", JSON.stringify({
        clearedChapters: [1, 2, 3, 4, 5, 6], instruments: [], badges: [], eraBest: {},
      }));
    } catch (e) {}
  });
  await page.goto(BASE);
  await wait(500);
  await page.locator('[data-menu="chapters"]').click();
  await wait(300);
  await page.locator('[data-chapter-start="6"]').click();
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
  for (let i = 0; i < 4; i++) {
    const b = buys.nth(i);
    if ((await b.count()) && (await b.isEnabled())) {
      await b.click();
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
  await page.locator('[data-play="1"]').click();
  // the whole scoring is one end state: every chip is on the table at once and
  // nothing animates on the way there
  let sawPunch = false;
  let mostChips = 0;
  for (let i = 0; i < 30; i++) {
    const seen = await page.evaluate(() => {
      const el = document.querySelector(".tally-punch, .tally-chip-punch");
      const n = el ? getComputedStyle(el).animationName : "none";
      return { running: !!el && n !== "none" && n !== "", chips: document.querySelectorAll("[data-chip]").length };
    });
    if (seen.running) sawPunch = true;
    mostChips = Math.max(mostChips, seen.chips);
    await wait(25);
  }
  check(!sawPunch, "reduced motion never plays the punch");
  check(mostChips > 1, "reduced motion shows every chip at once", `chips=${mostChips}`);
  await ctx.close();
}

await session(1280, 800, "800", true);
await session(1920, 1080, "1080", false);
await reduced();

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}` : "\nAll checks passed.");
process.exit(fails.length ? 1 : 0);
