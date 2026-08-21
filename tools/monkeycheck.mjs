// Monkey Trade's walk. Every acceptance test in docs/monkey-spec.md section 14
// that needs a browser is a named check here, run at 1440x950 on two pinned
// seeds, with the screenshots dropped in tools/shots/monkey/. One line per
// check, nonzero exit on any failure.
//
//   A_seed_pins_dom      the darts and the wedges the page draws are the ones
//                        tools/monkeySim.ts deals, and another seed is another
//                        board
//   C_level1_calendar    level 1 throws at a calendar of 24 cells, one dart a
//                        monkey, and every dart lands on a month
//   E_dead_company_line  a company that dies inside level 3's window is named
//                        on the end card and said to have gone to zero
//   F_strip_order        at every sampled frame of a live round the strip's DOM
//                        order is the worths sorted best first, a tie sits the
//                        monkey above you, and the live count of monkeys beaten
//                        is the count of slots below you
//   G_unlock_persists    a round that beats five unlocks the next level and the
//                        unlock survives a reload; a round that beats fewer
//                        leaves it locked
//   H_desk_rules         buys pour ticks into slabs, sells break slabs back
//                        into ticks, the dollar scale never moves on a trade,
//                        and a column is countable at round open
//   I_chart_third_rail   the chart is the bottom third, it carries month labels
//                        while the tape runs and year labels on the end card,
//                        and the board flips from the open picker to the rail
//                        without the clock pausing
//   J_no_year_in_play    no year and no era name anywhere in the open or play
//                        phases, text or attribute, and the end card names both
//   K_guide_four         the guide speaks at most four times a round, at least
//                        once after the throw, and its end card line is the one
//                        the rank outcome asks for
//   L_sound              silent until a gesture, then every listed moment plays
//                        exactly its count, mute stops it and reduced motion
//                        never reaches an oscillator
//   N_type_contract      one typeface, nothing under 12px, no uppercase, no
//                        positive tracking, no em dash and no exclamation mark,
//                        swept over all four phases
//   T_open_troop         the whole troop of ten stands over the board at the
//                        round open and the guide speaks once the darts are down
//
// Acceptance tests A to E and G are proven headlessly by tools/monkeySim.ts,
// which this file shells out to first: it prints the deals for seed 7 between
// two markers and the walk holds the live DOM against those numbers. If the sim
// fails, the walk stops before opening a browser. Test M is the generated art
// review, which is an eye and not an assertion; it prints here as a note so the
// table is the whole of section 14.
//
// The walk runs against the dev server, so the app can move under it: a reload,
// or a hot update, which remounts the tree and puts a pinned round back on its
// open phase. Both are counted, and a check that failed while one happened is
// walked a second time before it is believed.
//
// The page accepts a test-only ?turbo= multiplier on the tape, the same one The
// Floor and Trigger take. It changes the rate the tape burns months at and
// nothing else, and it is what makes a 60 second round walkable in two.
//
// Usage: node tools/monkeycheck.mjs

import { chromium } from "playwright";
import { execFileSync } from "child_process";
import { mkdirSync, readFileSync } from "fs";

const BASE = "http://localhost:4318";
const ROOT = new URL("..", import.meta.url).pathname;
const OUT = new URL("./shots/monkey/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const WIDE = { width: 1440, height: 950 };
// The two pinned seeds. Seed 7 is the one tools/monkeySim.ts prints its deals
// for. Seed 23 is the second pin, chosen off the sim because on level 1 it
// makes both of the rounds test G needs: never trading finishes behind all ten
// monkeys, and buying the stock at the open and holding it finishes ahead of
// all ten.
const PIN = 7;
const ALT = 23;
const MONKEYS = 10;
// Every level's wedge count comes off the fixture now, level 3's included. The
// board is whatever companies the window leaves alive, which is nine on the
// dot-com file rather than the ten section 3's prose assumes, so a number
// written down here would be a second source of truth that goes stale the
// first time the window rules move.
const DARTS = { 1: 1, 2: 2, 3: 3 };
const LEVELS = [1, 2, 3];
// The era names section 2 forbids on screen until the end card, lowercased.
const ERA_WORDS = ["dot-com", "dotcom", "2020s", "covid", "gfc", "crash", "inflation", "crypto"];
const ERA_NAME = { covid: "the 2020s", gfc: "the crash", dotcom: "the dot-com bust" };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------- the fixture

function fixture() {
  const out = execFileSync("npx", ["tsx", "tools/monkeySim.ts"], {
    cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24,
  });
  const start = out.indexOf("<<<FIXTURE");
  const end = out.indexOf("FIXTURE>>>");
  if (start < 0 || end < 0) throw new Error("tools/monkeySim.ts printed no fixture");
  return JSON.parse(out.slice(start + "<<<FIXTURE".length, end).trim());
}

let FIX;
try {
  FIX = fixture();
  console.log(`fixture from tools/monkeySim.ts: ${FIX.deals.length} deals on seed ${PIN}`);
} catch (e) {
  console.log(`FAIL fixture  tools/monkeySim.ts did not pass: ${e.message.split("\n")[0]}`);
  process.exit(1);
}

const dealOf = (level) => FIX.deals.find((d) => d.level === level);
const monthsOf = (level) => FIX.levels.find((l) => l.level === level).months;

// The guide's end card lines, read out of the content file rather than copied,
// so a rewrite there is a rewrite here.
function endLines() {
  const src = readFileSync(`${ROOT}src/content/monkey.ts`, "utf8");
  const out = {};
  for (const level of LEVELS) {
    const block = src.match(new RegExp(`\\n  ${level}: \\{([\\s\\S]*?)\\n  \\},`));
    if (!block) throw new Error(`src/content/monkey.ts has no lines for level ${level}`);
    const win = block[1].match(/endWin: "([^"]+)"/);
    const lose = block[1].match(/endLose: "([^"]+)"/);
    if (!win || !lose) throw new Error(`src/content/monkey.ts has no end lines for level ${level}`);
    out[level] = { win: win[1], lose: lose[1] };
  }
  return out;
}

let LINES;
try {
  LINES = endLines();
} catch (e) {
  console.log(`FAIL fixture  ${e.message}`);
  process.exit(1);
}

// --------------------------------------------------------------- reporting

const results = [];

function record(name, fails, note, status) {
  const state = status ?? (fails.length === 0 ? "PASS" : "FAIL");
  results.push({ name, fails, note, status: state });
  console.log(`${state.padEnd(4)} ${name.padEnd(20)} ${note ?? ""}`);
  for (const f of fails.slice(0, 5)) console.log(`       ${f}`);
  if (fails.length > 5) console.log(`       and ${fails.length - 5} more`);
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ------------------------------------------------------------ page helpers

const phaseOf = (page) => page.evaluate(() => {
  const el = document.querySelector("[data-monkey-phase]");
  return el ? el.getAttribute("data-monkey-phase") : null;
});

async function until(page, fn, budgetMs = 20000, stepMs = 60) {
  const stop = Date.now() + budgetMs;
  for (;;) {
    if (await fn()) return true;
    if (Date.now() > stop) return false;
    await wait(stepMs);
  }
}

// The walk runs against a dev server, which pulls the page out from under it
// whenever the app is edited: a reload, or a hot update, which swaps a module
// and remounts the tree without a navigation. A remount puts a pinned round
// back on its open phase with the tape at month zero, so a check walking a live
// round reads nonsense rather than the game.
//
// Both are counted. Every navigation the walk makes itself is counted too, so a
// load nobody asked for can be told apart from one the walk made, and a check
// that failed while the app moved underneath it gets one more go.
let mine = 0;
let disturbed = 0;

function watchLoads(page) {
  page.on("load", () => { if (mine > 0) mine -= 1; else disturbed += 1; });
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("[vite] hot updated") || t.includes("[vite] hmr update")) disturbed += 1;
  });
}

async function goto(page, url) {
  mine += 1;
  await page.goto(url);
}

async function reload(page) {
  mine += 1;
  await page.reload();
}

const clearSave = (page) => page.evaluate(() => {
  localStorage.removeItem("monkey-best");
  localStorage.removeItem("monkey-progress");
  localStorage.removeItem("monkey-muted");
});

const startReady = (page) => page.evaluate(() => {
  const b = document.querySelector('[data-action="start"]');
  return !!b && !b.disabled;
});

// The trade buttons act on the focused wedge, and a board level now opens with
// nothing focused: the dial is a pick and not a decoration, so every button is
// dark until the player taps a stock. A walk that means to trade taps first.
//
// The tap lands on the wedge's own sector rather than on its group, whose
// bounding box takes in the label and the chip and whose middle is not always
// inside the slice. A wedge that will not take a real click, which is what a
// dart drawn over its middle looks like to Playwright, is clicked through the
// DOM instead, and either way the tap is only believed once the board says a
// wedge is focused.
async function pickWedge(page, index = 0) {
  const faces = await page.$$('[data-board-form="open"] [data-wedge] path.mk-face');
  if (faces.length === 0) throw new Error("the open board drew no wedge to tap");
  const face = faces[Math.min(index, faces.length - 1)];
  try {
    await face.click({ timeout: 4000 });
  } catch {
    await face.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  }
  const took = await until(page, () => page.evaluate(
    () => document.querySelectorAll('[data-wedge][data-wedge-focus="1"]').length === 1,
  ), 4000);
  if (!took) throw new Error("tapping a wedge focused nothing");
}

// Which trade buttons the page is offering, and which of them are dark.
const tradeButtons = (page) => page.evaluate(() => Array.from(
  document.querySelectorAll('[data-action^="buy"], [data-action^="sell"]'),
).map((b) => ({ action: b.getAttribute("data-action"), disabled: !!b.disabled })));

// A pinned round, dealt from a clean save, waited on until its darts have
// landed and Start is live, with the first wedge tapped so the trade buttons
// are live. Level 1's calendar carries one stock and opens focused on it, so it
// is never tapped; pass pick: false to read a board level's untouched open.
async function openRound(page, level, seed, turbo = 0, { clear = true, pick = true } = {}) {
  await goto(page, `${BASE}/#/monkey?level=${level}&seed=${seed}&turbo=${turbo}`);
  if (clear) await clearSave(page);
  await reload(page);
  if (!await until(page, async () => (await phaseOf(page)) === "open", 20000)) {
    throw new Error(`level ${level} seed ${seed} never reached its open phase`);
  }
  if (!await until(page, () => startReady(page), 8000)) {
    throw new Error(`level ${level} seed ${seed} never finished throwing`);
  }
  if (pick && level !== 1) await pickWedge(page);
}

async function startTape(page) {
  await page.click('[data-action="start"]');
  if (!await until(page, async () => (await phaseOf(page)) !== "open", 6000)) {
    throw new Error("Start never took the round out of its open phase");
  }
}

async function playToEnd(page, budgetMs = 30000) {
  let lost = false;
  const done = await until(page, async () => {
    const p = await phaseOf(page);
    if (p === "open" || p === "levels") { lost = true; return true; }
    return p === "end";
  }, budgetMs, 80);
  if (lost) throw new Error(`the round was put back on its ${await phaseOf(page)} phase before it finished`);
  if (!done) throw new Error(`the round never reached its end card, it sat at ${await phaseOf(page)}`);
  await wait(160);
}

// The tape multiplier is read off the url every render, so a walk can freeze a
// round, set it up, and let it run again without reloading the page.
async function setTurbo(page, value) {
  await page.evaluate((v) => {
    const [path, query] = location.hash.slice(1).split("?");
    const p = new URLSearchParams(query ?? "");
    p.set("turbo", String(v));
    location.hash = `#${path}?${p.toString()}`;
  }, value);
  await wait(140);
}

// The three DOM reads the checks share. Each one returns null when the page is
// not there to read, which is what a dev server reload in the middle of a walk
// looks like, and readDom retries a null once before calling it a failure.
async function readDom(page, fn, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const v = await page.evaluate(fn);
    if (v !== null) return v;
    await wait(500);
  }
  return null;
}

const BOARD = () => {
  const root = document.querySelector("[data-board-form]");
  if (!root) return null;
  return {
    form: root.getAttribute("data-board-form"),
    mode: root.getAttribute("data-board-mode"),
    wedges: Array.from(document.querySelectorAll("[data-wedge]")).map((e) => e.getAttribute("data-wedge")),
    months: document.querySelectorAll("[data-month]").length,
    darts: Array.from(document.querySelectorAll("[data-dart-monkey]")).map((e) => ({
      monkey: Number(e.getAttribute("data-dart-monkey")),
      at: Number(e.getAttribute("data-dart-at")),
    })),
  };
};

const boardState = (page) => readDom(page, BOARD);

const boardSig = (b) => `${b.mode}|${b.wedges.join(",")}|${b.darts.map((d) => `${d.monkey}:${d.at}`).join(" ")}`;

const STRIP = () => {
  const root = document.querySelector("[data-monkey-phase]");
  if (!root) return null;
  const strip = document.querySelector("[data-strip]");
  const beaten = document.querySelector("[data-beaten]");
  return {
    phase: root.getAttribute("data-monkey-phase"),
    clock: Number(document.querySelector("[data-clock]")?.getAttribute("data-clock") ?? NaN),
    beaten: beaten ? Number(beaten.getAttribute("data-beaten")) : null,
    slots: strip
      ? Array.from(strip.querySelectorAll("[data-slot-who]")).map((e) => ({
        who: e.getAttribute("data-slot-who"),
        worth: Number(e.getAttribute("data-slot-worth")),
      }))
      : [],
  };
};

const stripState = (page) => readDom(page, STRIP);

const DESK = () => {
  const desk = document.querySelector("[data-desk]");
  if (!desk) return null;
  const cols = {};
  for (const el of desk.querySelectorAll("[data-stack]")) {
    cols[el.getAttribute("data-stack")] = {
      dollars: Number(el.getAttribute("data-dollars")),
      shares: Number(el.getAttribute("data-shares")),
      price: Number(el.getAttribute("data-price")),
      units: Number(el.getAttribute("data-units")),
      band: Number(el.getAttribute("data-unit-band")),
      unitPx: Number(el.getAttribute("data-unit-px")),
      height: el.getBoundingClientRect().height,
      seam: (() => {
        const u = el.querySelector('[data-unit="1"]');
        return u ? getComputedStyle(u).borderTopWidth : "none";
      })(),
    };
  }
  return { scale: desk.getAttribute("data-scale"), tickPx: desk.getAttribute("data-tick-px"), pour: desk.getAttribute("data-pour"), cols };
};

const deskState = (page) => readDom(page, DESK);

// Worth to the cent, the way src/lib/monkey/round.ts ranks it. A monkey that
// spent exactly a thousand dollars on whole shares carries float dust, so a raw
// compare would read a monkey sitting on the same dollar and cent as you as a
// monkey you had beaten. The walk reads the rank the way the game writes it.
const cents = (worth) => Math.round(worth * 100);

// The count of monkeys sitting below you on whatever strip is on screen, which
// is how the end card says what the header said while the tape ran.
function beatenOnStrip(state) {
  const you = state.slots.find((s) => s.who === "you");
  if (!you) return null;
  return state.slots.filter((s) => s.who !== "you" && cents(s.worth) < cents(you.worth)).length;
}

// ----------------------------------------------------------------- checks

// A. The seed is the round: the darts and the wedges the page draws are the
// ones the sim deals, the same seed draws them twice, and another seed does
// not draw them at all. And the open itself is a gate: level 3 lays out all ten
// stocks, and on a board level every trade button stays dark until a wedge is
// tapped, so the round starts with a pick rather than with one click of Buy max.
async function A_seed_pins_dom(page) {
  const fails = [];
  const notes = [];
  for (const level of LEVELS) {
    const deal = dealOf(level);
    await openRound(page, level, PIN, 0, { pick: false });
    const first = await boardState(page);
    if (first === null) { fails.push(`level ${level} drew no board`); continue; }

    // the untouched open, read before anything is tapped
    const dealtWedges = deal.tickers.length;
    if (level === 3 && first.wedges.length !== dealtWedges) {
      fails.push(`level 3 laid out ${first.wedges.length} wedges, the sim deals ${dealtWedges}`);
    }
    const untouched = await tradeButtons(page);
    const buysOf = (bs) => bs.filter((b) => b.action.startsWith("buy"));
    if (level === 1) {
      const dark = buysOf(untouched).filter((b) => b.disabled).map((b) => b.action);
      if (dark.length > 0) fails.push(`level 1 opens on its one stock and ${dark.join(", ")} were dark`);
    } else {
      const live = untouched.filter((b) => !b.disabled).map((b) => b.action);
      if (live.length > 0) {
        fails.push(`level ${level} opened with ${live.join(", ")} live before a wedge was tapped`);
      }
      const focused = await page.evaluate(() => document.querySelectorAll('[data-wedge][data-wedge-focus="1"]').length);
      if (focused !== 0) fails.push(`level ${level} opened with ${focused} wedges already focused`);
      await pickWedge(page);
      const tapped = await tradeButtons(page);
      const dark = buysOf(tapped).filter((b) => b.disabled).map((b) => b.action);
      if (dark.length > 0) fails.push(`level ${level}: a wedge was tapped and ${dark.join(", ")} stayed dark`);
      const sells = tapped.filter((b) => b.action.startsWith("sell") && !b.disabled).map((b) => b.action);
      if (sells.length > 0) fails.push(`level ${level}: ${sells.join(", ")} were live with nothing held`);
    }

    if (first.wedges.join(",") !== deal.tickers.join(",")) {
      fails.push(`level ${level} drew wedges ${first.wedges.join(",")}, the sim deals ${deal.tickers.join(",")}`);
    }
    const wantDarts = MONKEYS * DARTS[level];
    if (first.darts.length !== wantDarts) {
      fails.push(`level ${level} drew ${first.darts.length} darts, the sim throws ${wantDarts}`);
    }
    const perMonkey = new Map();
    for (const d of first.darts) perMonkey.set(d.monkey, (perMonkey.get(d.monkey) ?? 0) + 1);
    for (let i = 1; i <= MONKEYS; i++) {
      if (perMonkey.get(i) !== DARTS[level]) {
        fails.push(`level ${level} monkey ${i} threw ${perMonkey.get(i) ?? 0} darts, not ${DARTS[level]}`);
      }
    }
    if (level === 1) {
      // level 1's dart is its monkey's buy month, which the sim prints
      for (const d of first.darts) {
        const want = deal.buyMonths[d.monkey - 1];
        if (d.at !== want) fails.push(`level 1 monkey ${d.monkey} threw at month ${d.at}, the sim deals ${want}`);
      }
    } else {
      for (const d of first.darts) {
        if (!(d.at >= 0 && d.at < deal.tickers.length)) {
          fails.push(`level ${level} monkey ${d.monkey} threw at wedge ${d.at} of ${deal.tickers.length}`);
        }
      }
    }

    await openRound(page, level, PIN, 0);
    const again = await boardState(page);
    if (boardSig(again) !== boardSig(first)) fails.push(`level ${level} seed ${PIN} drew two different boards`);

    await openRound(page, level, ALT, 0);
    const other = await boardState(page);
    if (boardSig(other) === boardSig(first)) {
      fails.push(`level ${level} seed ${ALT} drew the same board as seed ${PIN}`);
    }
    notes.push(`L${level} ${first.darts.length} darts on ${first.wedges.length}`);
  }
  return { fails, note: notes.join(", ") };
}

// C. Level 1 throws at a calendar and not at a board: 24 cells, ten darts, one
// each, every one of them on a month inside the window.
async function C_level1_calendar(page) {
  const fails = [];
  await openRound(page, 1, PIN, 0);
  const b = await boardState(page);
  if (b === null) return { fails: ["level 1 drew no board"], note: "" };
  const months = monthsOf(1);
  if (b.mode !== "calendar") fails.push(`level 1 drew a ${b.mode}, not a calendar`);
  if (b.months !== months) fails.push(`the calendar drew ${b.months} cells, the level runs ${months} months`);
  if (months !== 24) fails.push(`level 1's window is ${months} months, section 5 asks for 24`);
  if (b.darts.length !== MONKEYS) fails.push(`the calendar took ${b.darts.length} darts, not ${MONKEYS}`);
  const monkeys = new Set(b.darts.map((d) => d.monkey));
  if (monkeys.size !== MONKEYS) fails.push(`${monkeys.size} monkeys threw at the calendar, not ${MONKEYS}`);
  for (const d of b.darts) {
    if (!(Number.isInteger(d.at) && d.at >= 0 && d.at < months)) {
      fails.push(`monkey ${d.monkey} threw at month ${d.at} of ${months}`);
    }
  }
  const spread = new Set(b.darts.map((d) => d.at)).size;
  if (spread < 6) fails.push(`ten darts landed on only ${spread} distinct months`);
  return { fails, note: `${b.months} cells, ${b.darts.length} darts on ${spread} distinct months` };
}

// E. A company that dies inside level 3's window is named on the end card and
// said to have gone to zero. The sim picks the seed: seed 7's board carries a
// death.
async function E_dead_company_line(page) {
  const fails = [];
  const deal = dealOf(3);
  if (deal.dead.length === 0) {
    return { fails: [`level 3 seed ${PIN} deals no death, so the line cannot be walked`], note: "" };
  }
  await openRound(page, 3, PIN, 40);
  await startTape(page);
  await playToEnd(page, 30000);
  const text = await page.evaluate(() => document.querySelector("[data-end-card]").innerText);
  const lines = text.split("\n").filter((l) => l.includes("went to zero"));
  if (lines.length !== deal.dead.length) {
    fails.push(`the end card wrote ${lines.length} death lines for ${deal.dead.length} dead companies`);
  }
  for (const line of lines) {
    if (!line.trim().endsWith("went to zero.")) fails.push(`a death line reads "${line.trim()}"`);
  }
  // and the company is named, not tickered
  if (deal.dead.includes("WCOM") && !text.includes("WorldCom went to zero.")) {
    fails.push(`WorldCom died in the window and the end card does not say so: "${lines.join(" | ")}"`);
  }
  return { fails, note: lines.map((l) => l.trim()).join(" ") };
}

// F. The rank strip is the sorted worths at every sampled frame, ties sit the
// monkey above you, and the header's count of monkeys beaten is the count of
// slots below you.
async function F_strip_order(page) {
  const fails = [];
  let frames = 0;
  let ties = 0;
  for (const level of [2, 3]) {
    await openRound(page, level, PIN, 12);
    // a position, so the player moves through the troop rather than sitting
    // still at the bottom of it all round
    await page.click('[data-action="buymax"]');
    await wait(120);
    await startTape(page);
    for (let i = 0; i < 14; i++) {
      const s = await stripState(page);
      if (s === null) { fails.push(`level ${level} frame ${i} found no page to read`); break; }
      if (s.phase !== "play") break;
      frames++;
      if (s.slots.length !== MONKEYS + 1) {
        fails.push(`level ${level} frame ${i} drew ${s.slots.length} slots, not ${MONKEYS + 1}`);
        break;
      }
      const you = s.slots.findIndex((x) => x.who === "you");
      if (you < 0) { fails.push(`level ${level} frame ${i} drew no slot for you`); break; }
      for (let k = 1; k < s.slots.length; k++) {
        const above = s.slots[k - 1];
        const below = s.slots[k];
        if (cents(above.worth) < cents(below.worth)) {
          fails.push(`level ${level} frame ${i}: ${above.who} at ${above.worth} sits above ${below.who} at ${below.worth}`);
          break;
        }
        if (cents(above.worth) === cents(below.worth)) {
          ties++;
          if (above.who === "you") {
            fails.push(`level ${level} frame ${i}: you sit above monkey ${below.who} on a tie at ${below.worth}`);
            break;
          }
        }
      }
      const below = beatenOnStrip(s);
      if (s.beaten !== below) {
        fails.push(`level ${level} frame ${i}: the header says ${s.beaten} beaten, ${below} monkeys sit below you`);
      }
      await wait(110);
    }
    await setTurbo(page, 60);
    await playToEnd(page, 25000);
    // the end card's strip is the same claim, settled
    const s = await stripState(page);
    if (s === null) { fails.push(`level ${level} drew no end card to read`); continue; }
    for (let k = 1; k < s.slots.length; k++) {
      if (cents(s.slots[k - 1].worth) < cents(s.slots[k].worth)) {
        fails.push(`level ${level} end card: ${s.slots[k - 1].who} sits above ${s.slots[k].who} out of order`);
        break;
      }
    }
  }
  if (frames < 12) fails.push(`only ${frames} live frames were sampled across two levels`);
  return { fails, note: `${frames} live frames, ${ties} ties held` };
}

// G. Beating five unlocks the next level and the unlock survives a reload.
// Beating fewer leaves it locked. Seed 23 on level 1 is both rounds: never
// trading finishes behind all ten, buying at the open and holding beats all ten.
async function G_unlock_persists(page) {
  const fails = [];
  const notes = [];

  const levelCards = async () => {
    await page.click('[data-action="levels"]');
    await until(page, async () => (await phaseOf(page)) === "levels", 6000);
    await reload(page);
    await until(page, async () => (await phaseOf(page)) === "levels", 12000);
    return page.evaluate(() => ({
      two: (() => {
        const b = document.querySelector('[data-action="throw-2"]');
        return b ? { there: true, locked: b.disabled } : { there: false, locked: true };
      })(),
      best: localStorage.getItem("monkey-best"),
      progress: localStorage.getItem("monkey-progress"),
      text: document.body.innerText,
    }));
  };

  // the losing round: never trade, finish on the opening thousand
  await openRound(page, 1, ALT, 40);
  await startTape(page);
  await playToEnd(page, 25000);
  const lost = await stripState(page);
  const lostBeaten = lost === null ? null : beatenOnStrip(lost);
  if (lostBeaten === null) fails.push("the losing end card drew no strip");
  else if (lostBeaten >= 5) fails.push(`the no trade round beat ${lostBeaten} monkeys, so it is not a losing line`);
  const hasNextAfterLoss = await page.evaluate(() => !!document.querySelector('[data-action="next"]'));
  if (hasNextAfterLoss) fails.push(`beating ${lostBeaten} of ten still offered Next level`);
  const afterLoss = await levelCards();
  if (!afterLoss.two.there) fails.push("the level cards drew no level two card");
  else if (!afterLoss.two.locked) fails.push(`beating ${lostBeaten} of ten unlocked level two`);
  if ((afterLoss.progress ?? "").includes("2")) fails.push(`the progress key reads ${afterLoss.progress} after a losing round`);
  notes.push(`lost with ${lostBeaten} beaten`);

  // the winning round: buy the stock at the open and sit on it
  await openRound(page, 1, ALT, 40);
  await page.click('[data-action="buymax"]');
  await wait(140);
  await startTape(page);
  await playToEnd(page, 25000);
  const won = await stripState(page);
  const wonBeaten = won === null ? null : beatenOnStrip(won);
  if (wonBeaten === null) fails.push("the winning end card drew no strip");
  else if (wonBeaten < 5) fails.push(`buying at the open and holding beat only ${wonBeaten} monkeys on seed ${ALT}`);
  const hasNext = await page.evaluate(() => !!document.querySelector('[data-action="next"]'));
  if (!hasNext) fails.push(`beating ${wonBeaten} of ten did not offer Next level`);
  const saved = await page.evaluate(() => ({
    best: localStorage.getItem("monkey-best"),
    progress: localStorage.getItem("monkey-progress"),
  }));
  if (!(saved.best ?? "").includes(String(wonBeaten))) {
    fails.push(`monkey-best reads ${saved.best} after beating ${wonBeaten}`);
  }
  if (!(saved.progress ?? "").includes("2")) fails.push(`monkey-progress reads ${saved.progress} after the win`);
  const afterWin = await levelCards();
  if (!afterWin.two.there) fails.push("the level cards drew no level two card after the win");
  else if (afterWin.two.locked) fails.push("the unlock did not survive the reload");
  if (!afterWin.text.includes(`Best: beat ${wonBeaten} of ${MONKEYS}`)) {
    fails.push(`the level card does not carry "Best: beat ${wonBeaten} of ${MONKEYS}"`);
  }
  notes.push(`won with ${wonBeaten} beaten, monkey-progress ${afterWin.progress}`);
  await clearSave(page);
  return { fails, note: notes.join(", ") };
}

// H. The desk's three rules. A buy pours ticks out of cash into a slab column,
// a sell breaks the slabs back into ticks, the one dollar scale is untouched by
// either, and a column at round open is a thing an eye can count.
async function H_desk_rules(page) {
  const fails = [];
  await openRound(page, 2, PIN, 0);

  const opened = await deskState(page);
  if (!opened) return { fails: ["the open phase drew no desk"], note: "" };
  const cash0 = opened.cols.cash;
  if (!cash0) return { fails: ["the desk drew no cash column at round open"], note: "" };
  // countable at round open, the way The Floor's M_countable_unit reads it
  if (!(cash0.unitPx >= 3)) fails.push(`a cash tick is ${cash0.unitPx}px, too thin to have a seam`);
  if (!(cash0.units >= 8)) fails.push(`the cash column draws ${cash0.units} units, too few to count`);
  if (cash0.seam === "0px" || cash0.seam === "none") fails.push("the cash ticks have no seam between them");
  if (!(cash0.height > 120)) fails.push(`the whole cash column is ${cash0.height}px tall`);
  const dollarsDrawn = cash0.units * cash0.band * 10;
  if (!near(dollarsDrawn, cash0.dollars, cash0.band * 10 + 0.01)) {
    fails.push(`${cash0.units} ticks of ${cash0.band} stand for ${dollarsDrawn} of ${cash0.dollars} in cash`);
  }

  // a buy of five
  await page.click('[data-action="buy5"]');
  await wait(120);
  const pouring = await deskState(page);
  const ticker = dealOf(2).tickers[0];
  const held = pouring.cols[ticker];
  if (!held) {
    fails.push(`buying five of ${ticker} drew no column for it`);
    return { fails, note: "" };
  }
  if (pouring.pour !== `buy:${ticker}`) fails.push(`the desk called the buy "${pouring.pour}"`);
  if (held.shares !== 5) fails.push(`buying five left ${held.shares} shares on the desk`);
  const spent = cash0.dollars - pouring.cols.cash.dollars;
  if (!near(spent, 5 * held.price, 0.01)) {
    fails.push(`five shares at ${held.price} cost ${spent}`);
  }
  if (!near(held.dollars, 5 * held.price, 0.01)) {
    fails.push(`five shares at ${held.price} are drawn as ${held.dollars}`);
  }
  const ticksGone = (cash0.units * cash0.band - pouring.cols.cash.units * pouring.cols.cash.band) * 10;
  if (!near(ticksGone, spent, pouring.cols.cash.band * 10 + cash0.band * 10)) {
    fails.push(`the cash column lost ${ticksGone} of ticks for a ${spent.toFixed(2)} buy`);
  }
  if (pouring.scale !== opened.scale) {
    fails.push(`the dollar scale moved on a buy, ${opened.scale} to ${pouring.scale}`);
  }
  // the slabs are the shares, not the dollars: one rectangle per share
  if (held.band === 1 && held.units !== 5) {
    fails.push(`five shares are drawn as ${held.units} slabs`);
  }

  // and a sell breaks them back into ticks
  await wait(420);
  await page.click('[data-action="sellall"]');
  await wait(160);
  const sold = await deskState(page);
  if (sold.pour !== `sell:${ticker}`) fails.push(`the desk called the sell "${sold.pour}"`);
  if (sold.cols[ticker]) fails.push(`selling everything left ${sold.cols[ticker].shares} shares drawn`);
  if (!near(sold.cols.cash.dollars, cash0.dollars, 0.01)) {
    fails.push(`the round trip left ${sold.cols.cash.dollars} of ${cash0.dollars} in cash on a frozen tape`);
  }
  if (!(sold.cols.cash.units > pouring.cols.cash.units)) {
    fails.push(`the sell put ${sold.cols.cash.units} ticks back where the buy took them from ${cash0.units} to ${pouring.cols.cash.units}`);
  }
  if (sold.scale !== opened.scale) {
    fails.push(`the dollar scale moved on a sell, ${opened.scale} to ${sold.scale}`);
  }
  return {
    fails,
    note: `${cash0.units} ticks of ${cash0.unitPx.toFixed(1)}px at open, scale ${opened.scale} through both trades`,
  };
}

// I. The chart is the bottom third, it carries month labels while the tape runs
// and year labels on the end card, and the board flips from the open picker to
// the rail without the clock pausing.
async function I_chart_third_rail(page) {
  const fails = [];
  await openRound(page, 2, PIN, 20);
  const before = await boardState(page);
  if (before === null) return { fails: ["the open phase drew no board"], note: "" };
  if (before.form !== "open") fails.push(`the board opened in its ${before.form} form`);

  await page.click('[data-action="start"]');
  // the flip and the tape, sampled together
  const samples = [];
  for (let i = 0; i < 18; i++) {
    samples.push(await page.evaluate(() => ({
      form: document.querySelector("[data-board-form]")?.getAttribute("data-board-form") ?? null,
      clock: Number(document.querySelector("[data-clock]")?.getAttribute("data-clock") ?? NaN),
      phase: document.querySelector("[data-monkey-phase]").getAttribute("data-monkey-phase"),
    })));
    await wait(55);
  }
  const live = samples.filter((s) => s.phase === "play");
  if (!live.some((s) => s.form === "rail")) fails.push("the board never flipped to the rail");
  for (let i = 1; i < live.length; i++) {
    if (live[i].clock < live[i - 1].clock) {
      fails.push(`the clock went back from month ${live[i - 1].clock} to ${live[i].clock}`);
      break;
    }
  }
  const rose = live.filter((s, i) => i > 0 && s.clock > live[i - 1].clock).length;
  if (rose < 2) fails.push(`the clock advanced ${rose} times across the flip, so the tape paused for it`);
  const flipAt = live.findIndex((s) => s.form === "rail");
  if (flipAt >= 0) {
    const across = live.slice(Math.max(0, flipAt - 1), flipAt + 9);
    const moved = across.length > 1 && across[across.length - 1].clock > across[0].clock;
    if (!moved) fails.push("the clock stood still across the flip itself");
  }

  const chart = await page.evaluate(() => {
    const el = document.querySelector("[data-chart]");
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { labels: el.getAttribute("data-chart-labels"), top: box.top, bottom: box.bottom, height: box.height, view: window.innerHeight };
  });
  if (!chart) fails.push("the play phase drew no chart");
  else {
    if (chart.labels !== "months") fails.push(`the play chart carries ${chart.labels} labels`);
    if (chart.height > chart.view / 3 + 8) {
      fails.push(`the chart is ${chart.height.toFixed(0)}px of a ${chart.view}px window, over a third`);
    }
    if (chart.bottom < chart.view - 24) fails.push(`the chart's bottom edge sits at ${chart.bottom.toFixed(0)} of ${chart.view}`);
    if (chart.top < chart.view / 2) fails.push(`the chart starts at ${chart.top.toFixed(0)}, above the halfway line`);
  }

  await setTurbo(page, 60);
  await playToEnd(page, 25000);
  const ended = await page.evaluate(() => {
    const el = document.querySelector("[data-chart]");
    return {
      labels: el ? el.getAttribute("data-chart-labels") : null,
      years: Array.from(el ? el.querySelectorAll("text") : []).map((t) => t.textContent.trim()).filter((s) => /^(19|20)\d{2}$/.test(s)),
    };
  });
  if (ended.labels !== "years") fails.push(`the end card's chart carries ${ended.labels} labels`);
  if (ended.years.length === 0) fails.push("the end card's chart printed no year on its axis");
  return {
    fails,
    note: chart ? `${chart.height.toFixed(0)}px of ${chart.view}, ${rose} clock steps across the flip, ${ended.years.length} years on the end axis` : "",
  };
}

// J. No year and no era name anywhere in the open or play phases, in the text
// or in an attribute, and the end card names both.
//
// Two attribute families are left out of the sweep on purpose. A value that is
// a plain number is a worth or a price and not a year, and geometry attributes
// carry pixel coordinates that can read as one. Everything else is swept.
const YEAR_SWEEP = (words) => {
  const out = [];
  const year = /(?<![\d.])(19|20)\d{2}(?![\d.])/;
  const geometry = new Set(["d", "points", "viewbox", "transform", "style", "x", "y", "x1", "x2", "y1", "y2",
    "cx", "cy", "r", "rx", "ry", "width", "height", "stroke-dasharray"]);
  const text = document.body.innerText ?? "";
  const hit = text.match(year);
  if (hit) {
    const at = text.indexOf(hit[0]);
    out.push(`the page reads "${text.slice(Math.max(0, at - 24), at + 24).replace(/\n/g, " ")}"`);
  }
  const low = text.toLowerCase();
  for (const w of words) {
    const at = low.indexOf(w);
    if (at >= 0) out.push(`the page reads "${text.slice(Math.max(0, at - 24), at + 24).replace(/\n/g, " ")}"`);
  }
  for (const el of document.querySelectorAll("*")) {
    for (const attr of el.attributes) {
      const name = attr.name.toLowerCase();
      if (geometry.has(name)) continue;
      const v = attr.value;
      if (v === "" || Number.isFinite(Number(v))) continue;
      const tag = el.tagName.toLowerCase();
      if (year.test(v)) out.push(`${tag}[${name}]="${v.slice(0, 48)}"`);
      const lv = v.toLowerCase();
      for (const w of words) if (lv.includes(w)) out.push(`${tag}[${name}]="${v.slice(0, 48)}" carries "${w}"`);
    }
  }
  return out;
};

async function J_no_year_in_play(page) {
  const fails = [];
  const notes = [];
  for (const level of LEVELS) {
    const deal = dealOf(level);
    await openRound(page, level, PIN, 14);
    for (const bad of await page.evaluate(YEAR_SWEEP, ERA_WORDS)) fails.push(`L${level} open: ${bad}`);
    await page.click('[data-action="buymax"]');
    await wait(120);
    await startTape(page);
    for (let i = 0; i < 3; i++) {
      await wait(300);
      if ((await phaseOf(page)) !== "play") break;
      for (const bad of await page.evaluate(YEAR_SWEEP, ERA_WORDS)) fails.push(`L${level} play: ${bad}`);
    }
    await setTurbo(page, 60);
    await playToEnd(page, 25000);
    const reveal = await page.evaluate(() => {
      const el = document.querySelector("[data-era-reveal]");
      return el ? el.textContent.trim() : null;
    });
    if (reveal === null) {
      fails.push(`L${level} end card carries no era reveal`);
      continue;
    }
    const era = ERA_NAME[deal.era] ?? deal.era;
    const from = deal.startMonth.slice(0, 4);
    const to = deal.endMonth.slice(0, 4);
    if (!reveal.includes(era)) fails.push(`L${level} reveal "${reveal}" does not name ${era}`);
    if (!reveal.includes(from) || !reveal.includes(to)) {
      fails.push(`L${level} reveal "${reveal}" does not carry ${from} to ${to}`);
    }
    notes.push(`L${level} "${reveal}"`);
  }
  return { fails, note: notes.join(" ") };
}

// K. The guide speaks at most four times a round, at least once after the
// throw, and its end card line is the one the rank outcome asks for.
async function K_guide_four(page) {
  const fails = [];
  const notes = [];
  const count = (p) => p.evaluate(() => Number(document.querySelector("[data-monkey-phase]").getAttribute("data-guide-count")));
  for (const level of LEVELS) {
    await openRound(page, level, PIN, 14);
    const opened = await count(page);
    // the first of the four is the open line, and on level 3 it counts the
    // board: the walk holds it against the content file's own output rather
    // than against a sentence copied into this file
    const openSaid = await page.evaluate(() => {
      const el = document.querySelector("[data-guide-line]");
      return el ? el.getAttribute("data-guide-line") : null;
    });
    if (openSaid !== null && openSaid !== dealOf(level).openLine) {
      fails.push(`L${level} opened with "${openSaid}", the content file asks for "${dealOf(level).openLine}"`);
    }
    if (opened < 1) fails.push(`L${level} spoke ${opened} lines by the time the darts had landed`);
    if (opened > 4) fails.push(`L${level} spoke ${opened} lines before the tape even started`);
    await page.click('[data-action="buymax"]');
    await wait(140);
    await startTape(page);
    let peak = opened;
    for (let i = 0; i < 16; i++) {
      if ((await phaseOf(page)) !== "play") break;
      const n = await count(page);
      peak = Math.max(peak, n);
      if (n > 4) { fails.push(`L${level} spoke ${n} lines while the tape ran`); break; }
      await wait(140);
    }
    await setTurbo(page, 60);
    await playToEnd(page, 25000);
    const ended = await count(page);
    peak = Math.max(peak, ended);
    if (ended > 4) fails.push(`L${level} spoke ${ended} lines over the round`);
    const state = await stripState(page);
    const beaten = state === null ? null : beatenOnStrip(state);
    const line = await page.evaluate(() => {
      const el = document.querySelector("[data-guide-line]");
      return el ? el.getAttribute("data-guide-line") : null;
    });
    const want = beaten >= 5 ? LINES[level].win : LINES[level].lose;
    if (line === null) fails.push(`L${level} end card carries no guide line`);
    else if (line !== want) fails.push(`L${level} beat ${beaten} and said "${line}", the content file asks for "${want}"`);
    notes.push(`L${level} ${peak} lines, beat ${beaten}`);
  }
  return { fails, note: notes.join(", ") };
}

// L. Sound stays silent until a gesture, plays after one by default, counts
// every listed moment exactly once, stops on mute, and never reaches an
// oscillator under reduced motion.
//
// The gesture has to land before the darts do, so the walk arms the page on the
// level cards and then edits the hash into a pinned round: the hash router does
// not remount the page, so the arming survives it and the seed stays pinned.
const READ_SOUND = () => {
  const s = window.__monkeySound;
  if (!s) return null;
  return { played: { ...s.played }, attempted: { ...s.attempted } };
};

async function armAndOpen(page) {
  await goto(page, `${BASE}/#/monkey`);
  await clearSave(page);
  await reload(page);
  await until(page, async () => (await phaseOf(page)) === "levels", 12000);
  return page;
}

async function hashTo(page, level, seed, turbo) {
  await page.evaluate(({ l, s, t }) => {
    location.hash = `#/monkey?level=${l}&seed=${s}&turbo=${t}`;
  }, { l: level, s: seed, t: turbo });
  if (!await until(page, async () => (await phaseOf(page)) === "open", 12000)) {
    throw new Error(`level ${level} seed ${seed} never opened from the hash`);
  }
  await until(page, () => startReady(page), 8000);
}

async function L_sound(browser) {
  const fails = [];
  const notes = [];
  const ctx = await browser.newContext({ viewport: WIDE, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  watchLoads(page);
  try {
    await armAndOpen(page);
    const cold = await page.evaluate(READ_SOUND);
    if (cold && Object.values(cold.played).some((n) => n > 0)) {
      fails.push(`something played before a gesture: ${JSON.stringify(cold.played)}`);
    }

    // the gesture, then a clean counter, then the round
    await page.keyboard.press("Shift");
    await page.evaluate(() => { window.__monkeySound = { played: {}, attempted: {} }; });
    await hashTo(page, 1, PIN, 30);
    const thrown = await page.evaluate(READ_SOUND);
    if (!thrown) {
      fails.push("the round played nothing at all after a gesture");
      return { fails, note: "" };
    }
    if (thrown.played.dartThock !== MONKEYS * DARTS[1]) {
      fails.push(`ten darts landed and ${thrown.played.dartThock ?? 0} thocks played`);
    }
    await page.click('[data-action="buy5"]');
    await wait(700);
    const bought = await page.evaluate(READ_SOUND);
    if (!(bought.played.buyTick > 0)) fails.push("a buy poured no ticks");
    await startTape(page);
    await playToEnd(page, 25000);
    const done = await page.evaluate(READ_SOUND);
    const guide = await page.evaluate(() => Number(document.querySelector("[data-monkey-phase]").getAttribute("data-guide-count")));
    if (done.played.rankReveal !== 1) fails.push(`the rank revealed ${done.played.rankReveal ?? 0} times`);
    if (done.played.settleRun !== 1) fails.push(`the settle ran ${done.played.settleRun ?? 0} times`);
    if (done.played.guidePop !== guide) {
      fails.push(`the guide spoke ${guide} lines and popped ${done.played.guidePop ?? 0} times`);
    }
    notes.push(`unmuted ${Object.entries(done.played).map(([k, v]) => `${k} ${v}`).join(" ")}`);

    // mute, then a whole new round, and nothing more reaches the speakers
    await page.click('[data-action="mute"]');
    await wait(120);
    // a fresh counter rather than a snapshot to subtract, so the reading holds
    // even if the dev server reloads the page under the walk
    await page.evaluate(() => { window.__monkeySound = { played: {}, attempted: {} }; });
    await hashTo(page, 1, ALT, 30);
    await page.click('[data-action="buy5"]');
    await wait(700);
    const muted = await page.evaluate(READ_SOUND);
    const heard = Object.entries(muted.played).filter(([, n]) => n > 0);
    if (heard.length > 0) fails.push(`muted and ${heard.map(([k, n]) => `${k} ${n}`).join(", ")} still played`);
    const asked = Object.values(muted.attempted).reduce((a, b) => a + b, 0);
    if (!(asked > 0)) fails.push("the muted round asked for no sound at all, so the mute proved nothing");
    notes.push(`muted, ${asked} moments asked and none played`);
    await clearSave(page);
  } finally {
    await page.close();
    await ctx.close();
  }

  // reduced motion: every moment is asked for and none of them is heard
  const quiet = await browser.newContext({ viewport: WIDE, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const still = await quiet.newPage();
  still.setDefaultTimeout(15000);
  watchLoads(still);
  try {
    await armAndOpen(still);
    await still.keyboard.press("Shift");
    await still.evaluate(() => { window.__monkeySound = { played: {}, attempted: {} }; });
    await hashTo(still, 1, PIN, 30);
    await still.click('[data-action="buy5"]');
    await wait(700);
    await startTape(still);
    await playToEnd(still, 25000);
    const s = await still.evaluate(READ_SOUND);
    const heard = Object.entries(s.played).filter(([, n]) => n > 0);
    const asked = Object.values(s.attempted).reduce((a, b) => a + b, 0);
    if (heard.length > 0) fails.push(`reduced motion played ${heard.map(([k, n]) => `${k} ${n}`).join(", ")}`);
    if (!(asked > 0)) fails.push("reduced motion asked for no sound, so the guard proved nothing");
    notes.push(`reduced motion asked ${asked} times and played 0`);
  } finally {
    await still.close();
    await quiet.close();
  }
  return { fails, note: notes.join("; ") };
}

// N. The type contract, swept over all four phases: one typeface, nothing under
// 12px, no uppercase, no positive tracking, no em dash and no exclamation mark.
const TYPE_AUDIT = () => {
  const bad = [];
  const seen = new Set();
  const fams = new Set();
  const banned = /mono|grotesk|pixelify|fraunces|courier|consolas|menlo|georgia|times/i;
  for (const el of document.querySelectorAll("body *")) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const tag = el.tagName.toLowerCase();
    const label = (own || el.getAttribute("aria-label") || el.getAttribute("title") || tag).slice(0, 42);
    const key = (k) => `${k}|${label}`;
    const fam = style.fontFamily || "";
    fams.add(fam);
    if (banned.test(fam) && !seen.has(key("font"))) { seen.add(key("font")); bad.push(`font ${fam.slice(0, 40)} on "${label}"`); }
    if (own.length > 0 || tag === "text") {
      const size = parseFloat(style.fontSize);
      if (size && size < 12 && !seen.has(key("size"))) { seen.add(key("size")); bad.push(`${size}px on "${label}"`); }
    }
    if (style.textTransform !== "none" && !seen.has(key("case"))) {
      seen.add(key("case"));
      bad.push(`text-transform ${style.textTransform} on "${label}"`);
    }
    const ls = style.letterSpacing;
    if (ls && ls !== "normal" && parseFloat(ls) > 0.01 && !seen.has(key("track"))) {
      seen.add(key("track"));
      bad.push(`tracking ${ls} on "${label}"`);
    }
    if (own.includes("\u2014") && !seen.has(key("dash"))) { seen.add(key("dash")); bad.push(`an em dash in "${label}"`); }
    if (own.includes("!") && !seen.has(key("bang"))) { seen.add(key("bang")); bad.push(`an exclamation mark in "${label}"`); }
  }
  return { bad, fams: Array.from(fams) };
};

const SYSTEM_STACK = readFileSync(`${ROOT}src/lib/type.ts`, "utf8")
  .match(/export const UI_FONT\s*=\s*\n?\s*'([^']+)'/)[1];
// Chromium hands BlinkMacSystemFont back from getComputedStyle as system-ui,
// which is the same face spelled the way the engine spells it, so the two names
// are folded together before the stacks are compared.
const normalize = (s) => s
  .replace(/["']/g, "")
  .replace(/blinkmacsystemfont/gi, "system-ui")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

async function N_type_contract(page) {
  const fails = [];
  const fams = new Set();
  const sweep = async (where) => {
    const out = await page.evaluate(TYPE_AUDIT);
    for (const bad of out.bad) fails.push(`${where}: ${bad}`);
    for (const f of out.fams) fams.add(f);
  };

  await goto(page, `${BASE}/#/monkey`);
  await clearSave(page);
  await reload(page);
  await until(page, async () => (await phaseOf(page)) === "levels", 12000);
  await wait(300);
  await sweep("levels");

  await openRound(page, 3, PIN, 20);
  await wait(300);
  await sweep("open");

  await page.click('[data-action="buymax"]');
  await wait(120);
  await startTape(page);
  await wait(500);
  await sweep("play");

  await setTurbo(page, 60);
  await playToEnd(page, 25000);
  await wait(400);
  await sweep("end");

  const want = normalize(SYSTEM_STACK);
  const strays = Array.from(fams).filter((f) => normalize(f) !== want);
  for (const f of strays.slice(0, 3)) fails.push(`a second typeface on the page: ${f.slice(0, 60)}`);
  return { fails, note: `${fams.size} typeface${fams.size === 1 ? "" : "s"} over four phases` };
}

// T. The troop is on screen at the round open. Ten monkeys stand over the board
// they are about to throw at, each one drawn and each one inside the window,
// and once the darts are down the guide says its line.
//
// The line fades on its own after about four seconds, so the bubble is polled
// for rather than read once, and the page's own count of lines spoken is held
// against it: the count is monotonic and cannot be missed by arriving late.
async function T_open_troop(page) {
  const fails = [];
  const notes = [];
  for (const level of LEVELS) {
    await openRound(page, level, PIN, 0, { pick: false });
    const troop = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("[data-troop-monkey]"));
      const inView = (e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= window.innerHeight;
      };
      return {
        count: all.length,
        indexes: all.map((e) => Number(e.getAttribute("data-troop-monkey"))).sort((a, b) => a - b),
        drawn: all.filter(inView).length,
        faces: all.filter((e) => e.querySelector("img, svg, canvas")).length,
      };
    });
    if (troop.count !== MONKEYS) {
      fails.push(`L${level} open drew ${troop.count} troop monkeys, not ${MONKEYS}`);
    }
    const want = Array.from({ length: MONKEYS }, (_, i) => i + 1).join(",");
    if (troop.count === MONKEYS && troop.indexes.join(",") !== want) {
      fails.push(`L${level} numbered its troop ${troop.indexes.join(",")}`);
    }
    if (troop.drawn !== troop.count) {
      fails.push(`L${level} drew ${troop.count} troop monkeys and ${troop.drawn} of them stood inside the window`);
    }
    if (troop.faces !== troop.count) {
      fails.push(`L${level} drew ${troop.count} troop monkeys and ${troop.faces} of them carried a face`);
    }

    const spoke = await until(page, () => page.evaluate(() => {
      const el = document.querySelector("[data-guide-line]");
      const line = el ? (el.getAttribute("data-guide-line") ?? "").trim() : "";
      return line.length > 0;
    }), 6000);
    const said = await page.evaluate(() => Number(
      document.querySelector("[data-monkey-phase]").getAttribute("data-guide-count"),
    ));
    if (!spoke) fails.push(`L${level} put no guide line on screen once the darts were down`);
    if (!(said >= 1)) fails.push(`L${level} counted ${said} guide lines by the end of the throw`);
    // and it is the line the content file writes for the board this round was
    // dealt, counted rather than copied: level 3's open line names its wedges
    const openLine = await page.evaluate(() => {
      const el = document.querySelector("[data-guide-line]");
      return el ? el.getAttribute("data-guide-line") : null;
    });
    const wantOpen = dealOf(level).openLine;
    if (spoke && openLine !== wantOpen) {
      fails.push(`L${level} opened with "${openLine}", the content file asks for "${wantOpen}"`);
    }
    notes.push(`L${level} ${troop.count} monkeys, ${said} line${said === 1 ? "" : "s"}`);
  }
  return { fails, note: notes.join(", ") };
}

// ------------------------------------------------------------ screenshots

async function shots(page) {
  for (const level of LEVELS) {
    await openRound(page, level, PIN, 8);
    await wait(500);
    await page.screenshot({ path: `${OUT}monkey-l${level}-open.png` });

    await page.click('[data-action="buymax"]');
    await wait(160);
    await startTape(page);
    await wait(900);
    await setTurbo(page, 0);
    await wait(400);
    if ((await phaseOf(page)) !== "play") throw new Error(`the level ${level} play shot landed on ${await phaseOf(page)}`);
    await page.screenshot({ path: `${OUT}monkey-l${level}-play.png` });

    await setTurbo(page, 60);
    await playToEnd(page, 25000);
    await wait(700);
    await page.screenshot({ path: `${OUT}monkey-l${level}-end.png` });
  }
  return { fails: [], note: "" };
}

// ------------------------------------------------------------------ the run

const CHECKS = [
  ["A_seed_pins_dom", A_seed_pins_dom],
  ["C_level1_calendar", C_level1_calendar],
  ["E_dead_company_line", E_dead_company_line],
  ["F_strip_order", F_strip_order],
  ["G_unlock_persists", G_unlock_persists],
  ["H_desk_rules", H_desk_rules],
  ["I_chart_third_rail", I_chart_third_rail],
  ["J_no_year_in_play", J_no_year_in_play],
  ["K_guide_four", K_guide_four],
  ["N_type_contract", N_type_contract],
  ["T_open_troop", T_open_troop],
];

// Which acceptance test each line of the table stands for, so the report can be
// read against docs/monkey-spec.md section 14 without a second document.
const LETTERS = [
  ["A", "tools/monkeySim.ts plus A_seed_pins_dom"],
  ["B", "tools/monkeySim.ts"],
  ["C", "tools/monkeySim.ts plus C_level1_calendar"],
  ["D", "tools/monkeySim.ts"],
  ["E", "tools/monkeySim.ts plus E_dead_company_line"],
  ["F", "F_strip_order"],
  ["G", "tools/monkeySim.ts plus G_unlock_persists"],
  ["H", "H_desk_rules"],
  ["I", "I_chart_third_rail"],
  ["J", "J_no_year_in_play"],
  ["K", "K_guide_four"],
  ["L", "L_sound"],
  ["M", "the art review, an eye and not an assertion"],
  ["N", "N_type_contract plus tools/cleancheck.mjs on the route"],
];

const started = Date.now();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: WIDE, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
const crashes = [];
page.on("pageerror", (e) => crashes.push(e.message));
watchLoads(page);

console.log(`\nmonkey trade, ${WIDE.width}x${WIDE.height}, seeds ${PIN} and ${ALT}\n`);

async function run(fn, arg) {
  try {
    return await fn(arg);
  } catch (e) {
    return { fails: [`threw: ${e.message.split("\n")[0]}`], note: "" };
  }
}

// A check that failed while the dev server reloaded or hot updated the page
// under it is not a reading of the game, so it is taken once more before it is
// believed.
async function attempt(name, fn, arg) {
  const was = disturbed;
  let out = await run(fn, arg);
  if (out.fails.length > 0 && disturbed > was) {
    const again = await run(fn, arg);
    out = { ...again, note: `${again.note ?? ""} (walked twice, the app was edited under the first)`.trim() };
  }
  return out;
}

for (const [name, fn] of CHECKS) {
  const done = await attempt(name, fn, page);
  record(name, done.fails, done.note);
}

const out = await attempt("L_sound", L_sound, browser);
record("L_sound", out.fails, out.note);

record("M_art_review", [], "the generated art is reviewed by eye, see the report", "note");

const shot = await attempt("screenshots", shots, page);
record("screenshots", shot.fails, shot.fails.length === 0 ? "tools/shots/monkey/monkey-l1..3-open|play|end.png" : shot.note);

if (crashes.length > 0) record("page_errors", crashes.slice(0, 5), `${crashes.length} thrown`);

await page.close();
await ctx.close();
await browser.close();

console.log("");
console.log("acceptance test        proven by");
for (const [letter, where] of LETTERS) console.log(`  ${letter}                    ${where}`);

console.log("");
const bad = results.filter((r) => r.status === "FAIL");
console.log(`${results.length} checks in ${Math.round((Date.now() - started) / 1000)}s`);
if (disturbed > 0) console.log(`the dev server moved the app ${disturbed} time${disturbed === 1 ? "" : "s"} under the walk`);
if (bad.length > 0) {
  console.log(`${bad.length} failing check${bad.length === 1 ? "" : "s"}`);
  for (const r of bad) console.log(`  ${r.name}: ${r.fails[0]}`);
  process.exit(1);
}
console.log("monkey trade walks clean");
process.exit(0);
