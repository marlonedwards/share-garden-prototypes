// The Tally, round seven: the tutorial's affordances.
//
// The lead's note was that the tour can be tapped through without being read,
// so three things changed and this harness is where all three are held to it:
//
//   THE SPOTLIGHT  a beat with an anchor dims the board and leaves the thing it
//                  is about in a clear window, and that window never takes a
//                  press of its own
//   THE GATES      payday stands until the blocks have landed, the Play beat is
//                  finished by the Play key and by nothing else, and the press
//                  that finishes it plays the week
//   THE DWELL      a tap a tenth of a second into a sentence does nothing, and
//                  the same tap seven tenths in moves the script on
//
// Reduced motion gets the same three: the scrim arrives at full state with no
// fade, the Play key wears a still accent ring instead of a pulse, the dwell is
// unchanged, and the whole tour still plays end to end.
//
// Usage: node tools/tallyR7.mjs

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#/tally";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// the two numbers Tutorial.tsx states, which this harness only ever reads
const DWELL = 600;
const HOLD = 900;

const SCRIPT_IDS = ["hello", "payday", "counter", "money", "wall", "target", "read", "play", "cleared"];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
function check(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) fails.push(label);
}

const browser = await chromium.launch();

async function open(reduced = false) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { console.log("PAGEERROR:", e.message); fails.push("pageerror"); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);
  await wait(600);
  return { ctx, page };
}

async function bubble(page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-tutorial]");
    if (!el) return null;
    return {
      id: el.getAttribute("data-tutorial"),
      gate: el.getAttribute("data-tutorial-gate"),
      say: (el.querySelector("[data-tutorial-say]")?.textContent ?? "").trim(),
    };
  });
}

const idOf = async (page) => (await bubble(page))?.id ?? "none";

// A press on a part of the board that does nothing of its own, which is the
// press an informational beat is spent by.
async function tap(page) {
  const at = await page.evaluate(() => {
    const shop = document.querySelector('[data-shop="open"]');
    const wall = document.querySelector('[data-view="table"] [data-wall="1"]');
    const el = shop ?? wall ?? document.querySelector('[data-body="1"]');
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * 0.72, y: r.top + r.height * 0.5 };
  });
  await page.mouse.click(at.x, at.y);
}

const paying = async (page) =>
  page.evaluate(() => document.querySelector("[data-shop]")?.getAttribute("data-paying"));

const tourDone = async (page) =>
  (await page.evaluate(() => localStorage.getItem("tally-tour-v1"))) === "1";

// The cutout, the thing it was cut around, and what a press in the middle of
// that thing would actually land on.
async function spot(page, sel) {
  return page.evaluate((s) => {
    const svg = document.querySelector('[data-spotlight="1"]');
    const el = document.querySelector(`[data-body="1"] ${s}`);
    if (!el) return { missing: true, hole: null, cover: 0 };
    const r = el.getBoundingClientRect();
    const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const out = {
      missing: false,
      anchor: { x: r.left, y: r.top, w: r.width, h: r.height },
      // the scrim is a picture and never a wall
      scrimTakesIt: !!(mid && mid.closest && mid.closest('[data-spotlight="1"]')),
      onAnchor: !!(mid && (mid === el || el.contains(mid))),
      hole: null,
      cover: 0,
      opacity: null,
      anim: null,
      z: null,
      bubbleZ: null,
    };
    if (!svg) return out;
    const sr = svg.getBoundingClientRect();
    out.host = { x: sr.left, y: sr.top, w: sr.width, h: sr.height };
    const [hx, hy, hw, hh] = (svg.getAttribute("data-spot-rect") ?? "").split(",").map(Number);
    const hole = { left: sr.left + hx, top: sr.top + hy, right: sr.left + hx + hw, bottom: sr.top + hy + hh };
    out.hole = { x: hole.left, y: hole.top, w: hw, h: hh };
    const ox = Math.max(0, Math.min(hole.right, r.right) - Math.max(hole.left, r.left));
    const oy = Math.max(0, Math.min(hole.bottom, r.bottom) - Math.max(hole.top, r.top));
    out.cover = (ox * oy) / Math.max(1, r.width * r.height);
    const cs = getComputedStyle(svg);
    out.opacity = Number(cs.opacity);
    out.anim = cs.animationName;
    out.z = Number(cs.zIndex);
    const bub = document.querySelector("[data-tutorial]");
    out.bubbleZ = bub ? Number(getComputedStyle(bub).zIndex) : null;
    return out;
  }, sel);
}

// One beat, lit. The window has to hold the whole of the thing the sentence is
// about with room around it, and nothing in that window may be one bit harder
// to press for having been lit.
async function lit(page, sel, label) {
  const s = await spot(page, sel);
  check(!s.missing && !!s.hole, `${label}: the board dims and it is the window`,
    s.hole ? `${Math.round(s.hole.x)},${Math.round(s.hole.y)} ${Math.round(s.hole.w)}x${Math.round(s.hole.h)}` : "no scrim");
  check(s.cover > 0.99, `${label}: the window holds the whole of it`,
    `cover=${(s.cover * 100).toFixed(1)}%`);
  if (s.hole && s.anchor && s.host) {
    // ten pixels of room on every side, except where the thing already runs to
    // the edge of the board body and there is no room to give it
    const edges = [
      [s.anchor.x - s.hole.x, s.hole.x <= s.host.x + 0.5],
      [s.anchor.y - s.hole.y, s.hole.y <= s.host.y + 0.5],
      [s.hole.x + s.hole.w - (s.anchor.x + s.anchor.w), s.hole.x + s.hole.w >= s.host.x + s.host.w - 0.5],
      [s.hole.y + s.hole.h - (s.anchor.y + s.anchor.h), s.hole.y + s.hole.h >= s.host.y + s.host.h - 0.5],
    ];
    const bad = edges.filter(([pad, atEdge]) => pad < 6 && !atEdge);
    check(bad.length === 0, `${label}: and it is given room to breathe`,
      edges.map(([pad]) => pad.toFixed(1)).join(" / "));
  }
  check(!s.scrimTakesIt, `${label}: the scrim never takes the press`, String(s.scrimTakesIt));
  check(s.bubbleZ !== null && s.z !== null && s.bubbleZ > s.z,
    `${label}: the piggy and its sentence stand over the scrim`, `${s.bubbleZ} over ${s.z}`);
  return s;
}

// The ring the one action beat puts around the key it is about.
async function ring(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-play="1"]');
    if (!el) return null;
    const cs = getComputedStyle(el, "::after");
    return {
      invited: el.getAttribute("data-invite") === "1",
      anim: cs.animationName,
      color: cs.borderTopColor,
      width: cs.borderTopWidth,
    };
  });
}

// The whole tour, walked by its own rules: an informational beat waits out its
// fade, a holding beat waits out the moment it narrates, and an action beat is
// finished by its own key.
async function walk(page, seen, notes = {}) {
  for (let i = 0; i < 70; i++) {
    const b = await bubble(page);
    if (b) {
      if (seen[seen.length - 1] !== b.id) seen.push(b.id);
      if (b.gate === "action") {
        notes.ring = await ring(page);
        await page.locator('[data-play="1"]').click();
        await wait(2600);
        continue;
      }
      await wait((b.gate === "hold" ? HOLD : DWELL) + 220);
      await tap(page);
      await wait(280);
      continue;
    }
    if (await tourDone(page)) return true;
    const begin = page.getByRole("button", { name: "Begin", exact: true });
    if (await begin.count()) { await begin.click(); await wait(900); continue; }
    if (await page.evaluate(() =>
      document.querySelector("[data-shop]")?.getAttribute("data-shop") === "open")) {
      await page.locator('[data-shop-close="1"]').click();
      await wait(520);
      continue;
    }
    const play = page.locator('[data-play="1"]');
    if ((await play.count()) && (await play.isEnabled().catch(() => false))) {
      await play.click();
      await wait(2400);
      continue;
    }
    await wait(300);
  }
  return false;
}

// ------------------------------------------------------------- the lit tour

console.log("\n--------------------------------------------- the lit tour");
{
  const { ctx, page } = await open();
  await page.locator('[data-menu="tutorial"]').click();
  await wait(700);

  // a beat about the whole screen lights nothing, because there is nothing on
  // the board it could be pointing at
  check(await idOf(page) === "hello", "the tour opens on the chapter card", await idOf(page));
  check(await page.locator("[data-spotlight]").count() === 0,
    "a beat with nothing to point at draws no scrim");

  // ---------------------------------------------------------- payday holds
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(200);
  let b = await bubble(page);
  check(b?.id === "payday", "Begin opens the shop on the payday beat", b?.id ?? "none");
  check(b?.gate === "hold", "and payday is the beat that holds", b?.gate ?? "none");
  check(await paying(page) === "1", "the blocks are still landing", String(await paying(page)));
  await lit(page, '[data-money="1"]', "the money row");
  await tap(page);
  await wait(140);
  check(await idOf(page) === "payday", "a tap while payday is landing spends nothing");
  await wait(HOLD);
  check(await paying(page) === "0", "payday finishes on its own", String(await paying(page)));
  await tap(page);
  await wait(240);
  check(await idOf(page) === "counter", "and then the same tap moves the script on");

  // ---------------------------------------------------------- the counter
  await lit(page, '[data-counter-note="1"]', "the counter note");
  await page.locator('[data-shop-close="1"]').click();
  await wait(700);
  check(await idOf(page) === "money", "the table opens on the money row", await idOf(page));
  await lit(page, '[data-money-row="1"]', "your money");

  // ------------------------------------------------------------ the dwell
  await wait(DWELL + 200);
  await tap(page);
  const t0 = Date.now();
  await wait(100);
  check(await idOf(page) === "wall", "a read sentence is spent by a tap", await idOf(page));

  // the same press, twice: once a tenth of a second into the sentence and once
  // seven tenths in
  await tap(page);
  const early = Date.now() - t0;
  await wait(140);
  check(await idOf(page) === "wall",
    "a tap inside the first six hundred milliseconds is not a read sentence", `at ${early}ms`);
  check(early < DWELL, "and that tap really was inside them", `${early}ms`);

  await lit(page, '[data-wall="1"]', "the wall");
  await page.screenshot({ path: OUT + "tally-r7-spotlight.png" });

  const rest = DWELL + 100 - (Date.now() - t0);
  if (rest > 0) await wait(rest);
  const late = Date.now() - t0;
  await tap(page);
  await wait(220);
  check(await idOf(page) === "target", "and the same tap after them is", `at ${late}ms`);
  await lit(page, '[data-target-line="1"]', "the gold line");

  // ------------------------------------------------------------- the read
  await wait(DWELL + 200);
  await tap(page);
  await wait(240);
  check(await bubble(page) === null, "the script has nothing to say on turn one");
  check(await page.locator("[data-spotlight]").count() === 0,
    "and the board is its own brightness again");
  await page.locator('[data-play="1"]').click();
  await wait(2600);
  check(await idOf(page) === "read", "the read beat is where the piggy speaks again", await idOf(page));
  await lit(page, '[data-read-line="1"]', "the read line");

  // ------------------------------------------------------- the Play beat
  await wait(DWELL + 200);
  await tap(page);
  await wait(240);
  b = await bubble(page);
  check(b?.id === "play", "the Play key is the last thing named", b?.id ?? "none");
  check(b?.gate === "action", "and it is the one beat its own press finishes", b?.gate ?? "none");
  check(b?.say === "The Play key runs the next week, and the wall writes down what happened.",
    "the sentence names the key rather than asking for it", b?.say ?? "");
  const r = await ring(page);
  check(!!r?.invited, "the key wears the invitation", JSON.stringify(r));
  check(r?.anim === "tally-invite-pulse", "which pulses until it is pressed", r?.anim ?? "none");
  await lit(page, '[data-play="1"]', "the Play key");
  const onKey = (await spot(page, '[data-play="1"]')).onAnchor;
  check(onKey, "and a press in the middle of it lands on the key itself", String(onKey));
  await page.screenshot({ path: OUT + "tally-r7-playbeat.png" });

  const before = (await page.locator('[data-play="1"]').textContent()) ?? "";
  await wait(DWELL + 400);
  await tap(page);
  await wait(200);
  await tap(page);
  await wait(200);
  check(await idOf(page) === "play", "a tap anywhere leaves the Play beat standing, however long it waits");
  const stillHere = (await page.locator('[data-play="1"]').textContent()) ?? "";
  check(stillHere === before, "and nothing was played by it", `${before} / ${stillHere}`);

  await page.locator('[data-play="1"]').click();
  await wait(2600);
  check(await bubble(page) === null, "the key's own press finishes the beat");
  const after = (await page.locator('[data-play="1"]').textContent()) ?? "";
  check(after !== before, "and it played the week at the same time", `${before} to ${after}`);
  check(await page.locator('[data-play="1"][data-invite="1"]').count() === 0,
    "the invitation comes off the key once it has been pressed");

  await ctx.close();
}

// ------------------------------------------------------------- the way out

console.log("\n---------------------------------------------- the way out");
{
  const { ctx, page } = await open();
  await page.locator('[data-menu="new"]').click();
  await wait(700);
  check(await idOf(page) === "hello", "a new run at chapter 1 starts the tour", await idOf(page));
  // the skip is exempt from every gate there is: it works on the frame it
  // appears on, dwell or no dwell
  const skip = page.locator('[data-tutorial-skip="1"]');
  const reachable = await page.evaluate(() => {
    const el = document.querySelector('[data-tutorial-skip="1"]');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!(mid && (mid === el || el.contains(mid)));
  });
  check(reachable, "the way out is what a press on it lands on", String(reachable));
  await skip.click();
  await wait(150);
  check(await bubble(page) === null, "one press ends the tour inside the dwell");
  check(await tourDone(page), "and it is remembered");
  check(await page.locator("[data-spotlight]").count() === 0, "the scrim goes with it");
  await ctx.close();
}

// -------------------------------------------------------- reduced motion

console.log("\n------------------------------------------ reduced motion");
{
  const { ctx, page } = await open(true);
  await page.locator('[data-menu="tutorial"]').click();
  await wait(700);
  const seen = [];
  check(await idOf(page) === "hello", "the tour opens", await idOf(page));
  seen.push("hello");

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await wait(240);
  check(await idOf(page) === "payday", "the tour reaches the shop", await idOf(page));
  seen.push("payday");
  const s = await spot(page, '[data-money="1"]');
  check(!!s.hole && s.cover > 0.99, "the scrim is there at once", `cover=${(s.cover * 100).toFixed(1)}%`);
  check(s.anim === "none", "with no fade on it", String(s.anim));
  check(s.opacity === 1, "and at its full state", String(s.opacity));

  // the dwell still applies, because reading takes the same time either way
  await wait(HOLD + 220);
  await tap(page);
  await wait(240);
  check(await idOf(page) === "counter", "payday still holds and still moves on", await idOf(page));
  seen.push("counter");
  await tap(page);
  await wait(140);
  check(await idOf(page) === "counter", "and the dwell is unchanged under reduced motion");

  const notes = {};
  const done = await walk(page, seen, notes);
  check(!!notes.ring?.invited, "the Play key still wears the invitation", JSON.stringify(notes.ring));
  check(notes.ring?.anim === "none", "as a ring that holds still", notes.ring?.anim ?? "none");
  check(notes.ring?.color === "rgb(0, 113, 227)", "and it is the accent the game already uses",
    `${notes.ring?.width} ${notes.ring?.color}`);
  check(done, "the whole tour plays end to end", seen.join(","));
  check(seen.join(",") === SCRIPT_IDS.join(","), "every beat, in order, and none twice", seen.join(","));
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}` : "\nAll checks passed.");
process.exit(fails.length ? 1 : 0);
