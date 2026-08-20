// The Floor's walk. Every acceptance test in docs/floor-spec.md section 9 is a
// named check here, run at 1440x950 and 390x844, on pinned seeds, with the
// screenshots dropped in tools/shots/. One line per check, nonzero exit on any
// failure.
//
//   A_focus_switch    B_buy_five      C_quiet_thicken   D_one_ruler
//   E_column_focus    F_gate_trade    G_settlement_carry
//   H_lehman_gone     I_baselines     J_resume          K_stars
//   L_full_campaign
//
// M to T are the August 20 house-bar review's findings, one check each:
//
//   M_countable_unit  the desk draws a unit an eye can count, in Trigger's
//                     colors, at era open on both viewports
//   N_settle_pour     the settle actually pours for its 1.2 seconds and the
//                     era boundary does not lurch
//   O_stable_trade_row  five seconds of live tape moves no trade button and
//                     none of them hang off the screen
//   P_listing         a company that is not public yet cannot be traded
//   Q_crypto_open     level five opens on something the carry can buy
//   R_debrief_card    opaque, year labelled, and the whole reveal list
//   S_gate_balance    both gate choices are drawn the same
//   T_one_money       whole dollars everywhere, with a signed delta
//   U_debrief_bottom  on a real played run, nothing in the reveal is drawn
//                     under the Continue bar or past the screen edge
//   V_worth_labels    the debrief chart's right-edge values never collide
//
// plus type_contract, an extra pass over docs/clean-type.md across every beat
// the site audit never reaches
//
// The numbers a check holds the DOM against are not written here: it shells out
// to `npx tsx tools/floorSim.ts` first, which computes the baselines and the
// canned star sets off the baked series and prints them as JSON. If the sim
// fails, the walk stops before opening a browser.
//
// The page accepts a test-only &turbo= multiplier on the tape. It changes the
// rate the tape burns months at and nothing else, it is off unless the URL asks
// for it, and it is what makes a full five era campaign walkable in seconds
// instead of twelve minutes.
//
// Usage: node tools/floorcheck.mjs

import { chromium } from "playwright";
import { execFileSync } from "child_process";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWS = [
  ["wide", 1440, 950],
  ["phone", 390, 844],
];

// ------------------------------------------------------------- the fixture

function fixture() {
  const out = execFileSync("npx", ["tsx", "tools/floorSim.ts"], {
    cwd: new URL("..", import.meta.url).pathname,
    encoding: "utf8",
    maxBuffer: 1 << 24,
  });
  const start = out.indexOf("<<<FIXTURE");
  const end = out.indexOf("FIXTURE>>>");
  if (start < 0 || end < 0) throw new Error("tools/floorSim.ts printed no fixture");
  return JSON.parse(out.slice(start + "<<<FIXTURE".length, end).trim());
}

let FIX;
try {
  FIX = fixture();
  console.log(`fixture from tools/floorSim.ts: ${Object.keys(FIX.eras).length} eras`);
} catch (e) {
  console.log(`FAIL fixture  tools/floorSim.ts did not pass: ${e.message.split("\n")[0]}`);
  process.exit(1);
}

// --------------------------------------------------------------- reporting

const results = [];

function record(view, name, fails, note) {
  results.push({ view, name, fails, note });
  const status = fails.length === 0 ? "ok  " : "FAIL";
  console.log(`${status} ${view.padEnd(5)} ${name.padEnd(20)} ${note ?? ""}`);
  for (const f of fails.slice(0, 4)) console.log(`       ${f}`);
  if (fails.length > 4) console.log(`       and ${fails.length - 4} more`);
}

function near(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

// ------------------------------------------------------------ page helpers

const num = async (page, sel, attr) => {
  const raw = await page.getAttribute(sel, attr);
  return raw === null || raw === "" ? NaN : Number(raw);
};

const phase = (page) => page.getAttribute("[data-floor]", "data-phase");

async function open(page, query) {
  await page.goto(`${BASE}/#/floor${query}`);
  await page.evaluate(() => {
    localStorage.removeItem("floor-run");
    localStorage.removeItem("floor-progress");
  });
  await page.reload();
  await wait(700);
}

// Clicks whatever the desk is waiting on: a level card, a gate, a debrief, a
// broke card. Returns the beat it dealt with, or null when the run is playing.
async function nudge(page, gateChoice = 0) {
  const p = await phase(page);
  if (p === "level") {
    await page.click("[data-open-desk]");
    await wait(320);
    return "level";
  }
  if (p === "gate") {
    await page.click(`[data-gate-choice="${gateChoice}"]`);
    await wait(180);
    return "gate";
  }
  if (p === "debrief") {
    await page.click("[data-continue]");
    await wait(1500);
    return "debrief";
  }
  if (p === "broke") {
    await page.click("[data-try-again]");
    await wait(320);
    return "broke";
  }
  return null;
}

// Plays forward until the page reaches one of the wanted phases, dealing with
// everything in the way. Returns the phase it stopped on.
async function playUntil(page, wanted, { gateChoice = 0, budgetMs = 60000 } = {}) {
  const stop = Date.now() + budgetMs;
  for (;;) {
    const p = await phase(page);
    if (wanted.includes(p)) return p;
    if (Date.now() > stop) return `timeout at ${p}`;
    if ((await nudge(page, gateChoice)) === null) await wait(120);
  }
}

// The tape multiplier is read off the URL every render, so a walk can set up a
// desk on a frozen tape and then let it run without reloading the page and
// losing the position it just built.
async function setTurbo(page, value) {
  await page.evaluate((v) => {
    const [path, query] = location.hash.slice(1).split("?");
    const p = new URLSearchParams(query ?? "");
    p.set("turbo", String(v));
    location.hash = `#${path}?${p.toString()}`;
  }, value);
  await wait(160);
}

async function heightOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().height : NaN;
  }, selector);
}

// ------------------------------------------------------------- the checks

// A. Focus switching never pauses the tape and never trades; the chart
// crossfades and the rail highlight moves.
async function A_focus_switch(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7");
  await wait(600);
  const t0 = await num(page, "[data-floor]", "data-tape");
  const trades0 = await num(page, "[data-floor]", "data-trade-count");
  const before = await page.getAttribute("[data-chart-series]", "data-chart-series");
  await page.click('[data-rail-row="AIG"]');
  const fade = await page.getAttribute("[data-chart-fade]", "data-chart-fade");
  await wait(500);
  const t1 = await num(page, "[data-floor]", "data-tape");
  const trades1 = await num(page, "[data-floor]", "data-trade-count");
  const after = await page.getAttribute("[data-chart-series]", "data-chart-series");
  const focused = await page.getAttribute('[data-rail-row="AIG"]', "data-focused");
  const oldFocused = await page.getAttribute('[data-rail-row="C"]', "data-focused");

  if (!(t1 > t0)) fails.push(`the tape paused on a focus switch, ${t0} to ${t1}`);
  if (trades1 !== trades0) fails.push(`focusing traded, ${trades0} to ${trades1}`);
  if (before === after) fails.push(`the chart still draws ${after} after focusing AIG`);
  if (fade !== "1") fails.push("the chart did not crossfade");
  if (focused !== "1") fails.push("the rail highlight did not move to AIG");
  if (oldFocused !== "0") fails.push("the rail kept Citigroup highlighted");
  return { fails, note: `tape ${t0.toFixed(2)} to ${t1.toFixed(2)}, chart ${after}` };
}

// B. Buy 5 pours exactly five slabs into the column and the matching ticks out
// of cash, and worth is unchanged at the instant.
async function B_buy_five(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&turbo=0");
  await page.click('[data-rail-row="AAPL"]');
  await wait(260);
  const cash0 = await num(page, "[data-floor]", "data-cash");
  const priceRaw = await page.getAttribute('[data-rail-row="AAPL"]', "data-focused");
  void priceRaw;
  await page.click('[data-trade="Buy 5"]');
  await wait(260);

  const conserved = await num(page, "[data-floor]", "data-conservation");
  const shares = await num(page, '[data-stack="AAPL"]', "data-shares");
  const units = await num(page, '[data-stack="AAPL"]', "data-units");
  const slabs = await page.locator('[data-stack="AAPL"] [data-unit]').count();
  const price = await num(page, '[data-stack="AAPL"]', "data-price");
  const cash1 = await num(page, "[data-floor]", "data-cash");
  // A cash unit is one ten dollar tick while ticks are readable, and a block of
  // ten of them once they are not; data-unit-band says which, and the drawn
  // count has to be the true dollars divided by whatever the band is.
  const band = await num(page, '[data-stack="cash"]', "data-unit-band");
  const drawn1 = await page.locator('[data-stack="cash"] [data-unit]').count();
  const units1 = await num(page, '[data-stack="cash"]', "data-units");
  const want1 = Math.floor(cash1 / (10 * band) + 1e-9);
  const was0 = Math.floor(cash0 / (10 * band) + 1e-9);

  if (shares !== 5) fails.push(`the column holds ${shares} shares, not five`);
  if (units !== 5 || slabs !== 5) fails.push(`the column drew ${slabs} slabs, not five`);
  if (conserved > 0.005) fails.push(`worth moved by ${conserved} at the instant of the trade`);
  if (!near(cash0 - cash1, 5 * price, 0.01)) fails.push(`cash fell ${cash0 - cash1} for five at ${price}`);
  if (!(units1 < was0)) fails.push(`cash still draws ${units1} units of ten, was ${was0}`);
  if (drawn1 !== units1) fails.push(`cash says ${units1} units and drew ${drawn1}`);
  if (units1 !== want1) fails.push(`cash draws ${units1} units of $${10 * band} for ${cash1} dollars, wanted ${want1}`);
  return { fails, note: `five slabs at ${price.toFixed(2)}, cash ${was0} to ${units1} units of $${10 * band}` };
}

// C. Ten quiet seconds in a rising era: the columns thicken and the slab count
// does not move.
async function C_quiet_thicken(page, view) {
  const fails = [];
  // Nvidia through the 2020s is the clearest rise the data owns.
  await open(page, "?era=covid&seed=7&turbo=0");
  await page.click('[data-rail-row="NVDA"]');
  await wait(240);
  await page.click('[data-trade="Buy 5"]');
  await wait(240);
  const slabs0 = await page.locator('[data-stack="NVDA"] [data-unit]').count();
  const h0 = await heightOf(page, '[data-stack="NVDA"]');
  const price0 = await num(page, '[data-stack="NVDA"]', "data-price");

  // ten tape seconds of the same desk, nothing touched
  await setTurbo(page, 6);
  const a = {
    slabs: await page.locator('[data-stack="NVDA"] [data-unit]').count(),
    h: await heightOf(page, '[data-stack="NVDA"]'),
    price: await num(page, '[data-stack="NVDA"]', "data-price"),
    trades: await num(page, "[data-floor]", "data-trade-count"),
  };
  await wait(1700);
  const b = {
    slabs: await page.locator('[data-stack="NVDA"] [data-unit]').count(),
    h: await heightOf(page, '[data-stack="NVDA"]'),
    price: await num(page, '[data-stack="NVDA"]', "data-price"),
    trades: await num(page, "[data-floor]", "data-trade-count"),
  };

  if (slabs0 !== 5) fails.push(`the frozen desk drew ${slabs0} slabs for five shares`);
  if (!(h0 > 0)) fails.push("the frozen column has no height");
  if (!(price0 > 0)) fails.push("the frozen column has no price");
  if (a.slabs !== b.slabs) fails.push(`the slab count moved from ${a.slabs} to ${b.slabs} with no trade`);
  if (a.trades !== b.trades) fails.push("a trade happened during the quiet seconds");
  if (!(b.price > a.price)) fails.push(`Nvidia did not rise, ${a.price} to ${b.price}`);
  if (!(b.h > a.h)) fails.push(`the column did not thicken, ${a.h} to ${b.h}`);
  // thickness follows price, on the one ruler
  if (a.h > 0 && !near(b.h / a.h, b.price / a.price, 0.06)) {
    fails.push(`thickness grew ${(b.h / a.h).toFixed(3)} while the price grew ${(b.price / a.price).toFixed(3)}`);
  }
  return { fails, note: `${a.slabs} slabs held, ${a.h.toFixed(1)}px to ${b.h.toFixed(1)}px` };
}

// D. One dollar scale: a $10 tick is the same pixels in every state, and each
// column's height is shares x price on that scale.
async function D_one_ruler(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&turbo=0");
  const scale = await num(page, "[data-desk]", "data-scale");
  const tickPx = await num(page, "[data-desk]", "data-tick-px");
  const tickA = await heightOf(page, '[data-stack="cash"] [data-unit]');

  await page.click('[data-rail-row="AAPL"]');
  await wait(200);
  await page.click('[data-trade="Buy 5"]');
  await wait(200);
  await page.click('[data-rail-row="XOM"]');
  await wait(200);
  await page.click('[data-trade="Buy 5"]');
  await wait(240);

  const scale2 = await num(page, "[data-desk]", "data-scale");
  const tickB = await heightOf(page, '[data-stack="cash"] [data-unit]');
  const bandB = await num(page, '[data-stack="cash"]', "data-unit-band");
  const columns = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-stack]")).map((el) => ({
      key: el.getAttribute("data-stack"),
      dollars: Number(el.getAttribute("data-dollars")),
      shares: Number(el.getAttribute("data-shares")),
      price: Number(el.getAttribute("data-price")),
      band: Number(el.getAttribute("data-unit-band")),
      units: Number(el.getAttribute("data-units")),
      unitPx: Number(el.getAttribute("data-unit-px")),
      drawn: el.querySelectorAll("[data-unit]").length,
      h: el.getBoundingClientRect().height,
    })),
  );

  if (!near(scale, scale2, 1e-9)) fails.push(`the ruler changed, ${scale} to ${scale2}`);
  if (!near(tickA, tickB, 0.05)) fails.push(`a cash unit measured ${tickA} then ${tickB}`);
  if (!near(tickB / bandB, tickPx, 0.05)) fails.push(`a cash unit of ${bandB} ticks is ${tickB}px, so a tick is ${(tickB / bandB).toFixed(3)}px, not ${tickPx}px`);
  for (const col of columns) {
    // Every column measures its own unit on the one ruler: a drawn unit is
    // exactly band units of ten dollars, or band shares at the live price.
    const unitDollars = col.key === "cash" ? 10 : col.price;
    const wantUnit = col.band * unitDollars * scale;
    if (!near(col.unitPx, wantUnit, 0.05)) {
      fails.push(`${col.key} draws a ${col.unitPx}px unit, the ruler says ${wantUnit.toFixed(3)}px`);
    }
    if (col.drawn !== col.units) fails.push(`${col.key} says ${col.units} units and drew ${col.drawn}`);
    if (!near(col.h, col.units * col.unitPx, 0.6)) {
      fails.push(`${col.key} draws ${col.h.toFixed(2)}px for ${col.units} units of ${col.unitPx}px`);
    }
    if (col.key !== "cash" && !near(col.dollars, col.shares * col.price, 0.02)) {
      fails.push(`${col.key} says ${col.dollars} for ${col.shares} at ${col.price}`);
    }
  }
  return { fails, note: `${columns.length} columns on one ruler, a tick is ${(tickB / bandB).toFixed(3)}px` };
}

// E. Tapping a desk column focuses that stock.
async function E_column_focus(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&turbo=0");
  await page.click('[data-rail-row="XOM"]');
  await wait(200);
  await page.click('[data-trade="Buy 5"]');
  await wait(200);
  await page.click('[data-rail-row="C"]');
  await wait(240);
  const before = await page.getAttribute("[data-chart-series]", "data-chart-series");
  await page.click('[data-column="XOM"]');
  await wait(340);
  const after = await page.getAttribute("[data-chart-series]", "data-chart-series");
  const focused = await page.getAttribute('[data-rail-row="XOM"]', "data-focused");

  if (before === after) fails.push(`the chart still draws ${after} after tapping the ExxonMobil column`);
  if (!String(after).endsWith(":XOM")) fails.push(`the chart draws ${after}, not ExxonMobil`);
  if (focused !== "1") fails.push("the rail did not follow the desk column");
  return { fails, note: `${before} to ${after}` };
}

// F. A gate pauses the tape, its choice executes a real trade at the live
// price, and the debrief quotes the choice with the price aftermath.
async function F_gate_trade(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&beat=gate&turbo=70");
  await wait(500);
  if ((await phase(page)) !== "gate") fails.push(`the walk did not land on a gate, it is at ${await phase(page)}`);
  const t0 = await num(page, "[data-floor]", "data-tape");
  await wait(600);
  const t1 = await num(page, "[data-floor]", "data-tape");
  if (!near(t0, t1, 1e-6)) fails.push(`the tape ran through the gate, ${t0} to ${t1}`);

  const trades0 = await num(page, "[data-floor]", "data-trade-count");
  const cash0 = await num(page, "[data-floor]", "data-cash");
  const worth0 = await num(page, "[data-floor]", "data-worth");
  const label = (await page.locator('[data-gate-choice="0"]').innerText()).trim();
  await page.click('[data-gate-choice="0"]');
  await wait(300);
  const trades1 = await num(page, "[data-floor]", "data-trade-count");
  const cash1 = await num(page, "[data-floor]", "data-cash");
  const conserved = await num(page, "[data-floor]", "data-conservation");
  void conserved;

  if (trades1 <= trades0) fails.push(`choosing "${label}" made no trade`);
  if (!(cash1 < cash0)) fails.push(`choosing "${label}" did not spend cash, ${cash0} to ${cash1}`);
  if (!(worth0 > 0)) fails.push("the gate showed no worth");

  const landed = await playUntil(page, ["debrief"], { budgetMs: 45000 });
  if (landed !== "debrief") {
    fails.push(`the run never reached a debrief, it stopped at ${landed}`);
    return { fails, note: label };
  }
  const quote = await page.locator('[data-gate-quote="gfc-record"]').count();
  if (quote === 0) {
    fails.push("the debrief did not quote the gate choice back");
    return { fails, note: label };
  }
  const text = await page.locator('[data-gate-quote="gfc-record"]').innerText();
  if (!text.includes(label)) fails.push(`the debrief quotes "${text.split("\n")[0]}", not "${label}"`);
  if (!/(rose|fell) \d/.test(text)) fails.push(`the debrief has no price aftermath: ${text.replace(/\n/g, " ")}`);
  return { fails, note: `${label}, ${text.split("\n")[1] ?? ""}` };
}

// G. Era settlement converts every position to cash at last real prices, and
// the next era opens with exactly that cash.
async function G_settlement_carry(page, view) {
  const fails = [];
  await open(page, "?seed=7&turbo=0");
  await playUntil(page, ["run"], { budgetMs: 20000 });
  await page.click('[data-rail-row="AAPL"]');
  await wait(160);
  await page.click('[data-trade="Buy max"]');
  await wait(160);
  await setTurbo(page, 80);
  const landed = await playUntil(page, ["debrief"], { budgetMs: 45000 });
  if (landed !== "debrief") {
    fails.push(`the first era never finished, it stopped at ${landed}`);
    return { fails, note: landed };
  }
  const you = await num(page, "[data-debrief-you]", "data-debrief-you");
  await page.click("[data-continue]");
  await wait(600);
  const settling = await page.locator("[data-settling]").count();
  await wait(1400);
  const at = await phase(page);
  if (at !== "level") {
    fails.push(`settling did not open the next level, it is at ${at}`);
    return { fails, note: at };
  }
  const carry = await num(page, "[data-carry]", "data-carry");
  if (settling === 0) fails.push("the settle moment never showed");
  if (!near(carry, you, 0.011)) fails.push(`the debrief said ${you} but the next era opens with ${carry}`);
  return { fails, note: `${you.toFixed(2)} carried to ${carry.toFixed(2)}` };
}

// H. Lehman goes to zero mid-era: the rail says gone, its column collapses,
// worth drops, and the run keeps running.
async function H_lehman_gone(page, view) {
  const fails = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "?era=gfc&seed=7&turbo=0");
  await playUntil(page, ["run"], { budgetMs: 15000 });
  await page.click('[data-rail-row="LEH"]');
  await wait(200);
  await page.click('[data-trade="Buy 5"]');
  await wait(200);
  const worth0 = await num(page, "[data-floor]", "data-worth");
  const held = await num(page, '[data-stack="LEH"]', "data-shares");
  await setTurbo(page, 12);

  const stop = Date.now() + 45000;
  for (;;) {
    const p = await phase(page);
    if (p === "gate") {
      await page.click('[data-gate-choice="1"]');
      await wait(160);
      continue;
    }
    const t = await num(page, "[data-floor]", "data-tape");
    if (t >= 22 || p === "debrief" || Date.now() > stop) break;
    await wait(120);
  }

  const dead = (await page.locator('[data-rail-row="LEH"]').innerText()).includes("gone");
  const dollars = await num(page, '[data-stack="LEH"]', "data-dollars");
  const columnH = await heightOf(page, '[data-stack="LEH"]');
  const worth1 = await num(page, "[data-floor]", "data-worth");

  if (held !== 5) fails.push(`the walk holds ${held} Lehman shares, not five`);
  if (!dead) fails.push("the rail does not read gone for Lehman");
  if (!(dollars < 0.01)) fails.push(`the Lehman column is still worth ${dollars}`);
  if (!(columnH < 1)) fails.push(`the Lehman column is still ${columnH}px tall`);
  if (!(worth1 < worth0)) fails.push(`worth did not fall, ${worth0} to ${worth1}`);
  if (errors.length > 0) fails.push(`the run threw: ${errors[0]}`);
  page.removeAllListeners("pageerror");
  return { fails, note: `worth ${worth0.toFixed(2)} to ${worth1.toFixed(2)}, column ${columnH.toFixed(2)}px` };
}

// I. The debrief's baselines match the numbers tools/floorSim.ts computed
// independently, to the cent.
async function I_baselines(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&beat=debrief");
  await wait(600);
  if ((await phase(page)) !== "debrief") fails.push(`the walk is at ${await phase(page)}, not a debrief`);
  const holding = await num(page, "[data-debrief-holding]", "data-debrief-holding");
  const index = await num(page, "[data-debrief-index]", "data-debrief-index");
  const you = await num(page, "[data-debrief-you]", "data-debrief-you");
  const want = FIX.eras.gfc;
  if (!near(holding, want.holding, 0.005)) fails.push(`doing nothing reads ${holding}, the sim says ${want.holding}`);
  if (!near(index, want.index, 0.005)) fails.push(`the market reads ${index}, the sim says ${want.index}`);
  if (!near(you, want.idle, 0.005)) fails.push(`a run with no trades reads ${you}, not ${want.idle}`);
  return { fails, note: `you ${you}, doing nothing ${holding}, the market ${index}` };
}

// J. Kill the tab mid-era and reopen: the run resumes from the persisted state.
async function J_resume(page, view) {
  const fails = [];
  await open(page, "?turbo=4");
  await playUntil(page, ["run"], { budgetMs: 15000 });
  await page.click('[data-rail-row="AAPL"]');
  await wait(200);
  await page.click('[data-trade="Buy 5"]');
  await wait(1800);
  const before = {
    t: await num(page, "[data-floor]", "data-tape"),
    trades: await num(page, "[data-floor]", "data-trade-count"),
    shares: await num(page, '[data-stack="AAPL"]', "data-shares"),
    cash: await num(page, "[data-floor]", "data-cash"),
  };
  await page.reload();
  await wait(900);
  const after = {
    phase: await phase(page),
    t: await num(page, "[data-floor]", "data-tape"),
    trades: await num(page, "[data-floor]", "data-trade-count"),
    shares: await num(page, '[data-stack="AAPL"]', "data-shares"),
    cash: await num(page, "[data-floor]", "data-cash"),
  };
  if (after.phase !== "run") fails.push(`the reopened tab is at ${after.phase}, not mid-era`);
  if (!(after.t >= before.t - 1.5)) fails.push(`the tape rewound from ${before.t} to ${after.t}`);
  if (after.trades !== before.trades) fails.push(`the trade log changed, ${before.trades} to ${after.trades}`);
  if (after.shares !== before.shares) fails.push(`the position changed, ${before.shares} to ${after.shares}`);
  if (!near(after.cash, before.cash, 0.02)) fails.push(`cash changed, ${before.cash} to ${after.cash}`);
  return { fails, note: `resumed at month ${after.t.toFixed(2)} holding ${after.shares}` };
}

// K. Stars compute correctly. The three canned logs are fixture-tested in
// tools/floorSim.ts; this is the once-through-the-UI verification of one of
// them, the run that sat in cash the whole crash.
async function K_stars(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&beat=debrief");
  await wait(600);
  const shown = (await page.getAttribute("[data-stars]", "data-stars")) ?? "";
  const canned = FIX.canned.find((c) => c.name === "sat in cash");
  const want = canned.stars.join(",");
  if (shown !== want) fails.push(`the debrief awarded [${shown}], the sim says [${want}]`);
  const alive = await page.getAttribute('[data-star="alive"]', "data-earned");
  const couch = await page.getAttribute('[data-star="couch"]', "data-earned");
  const pace = await page.getAttribute('[data-star="pace"]', "data-earned");
  if (alive !== "1") fails.push("Lived to tell was not earned by a run that never moved");
  if (couch !== "0") fails.push("Beat the couch was earned by a run that never traded");
  if (pace !== "0") fails.push("Kept pace was earned by a run that sat in cash");
  const names = await page.locator("[data-star]").allInnerTexts();
  const wanted = ["Beat the couch", "Kept pace", "Lived to tell"];
  for (const name of wanted) if (!names.includes(name)) fails.push(`the star "${name}" is not on the debrief`);
  return { fails, note: `[${shown}] on a run that never traded` };
}

// L. A full campaign is completable in a scripted walk, and the ledger's row
// arithmetic sums to the final worth.
async function L_full_campaign(page, view) {
  const fails = [];
  await open(page, "?seed=7&turbo=110");
  const landed = await playUntil(page, ["end"], { budgetMs: 300000 });
  if (landed !== "end") {
    fails.push(`the campaign never finished, it stopped at ${landed}`);
    return { fails, note: landed };
  }
  const rows = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-ledger-row]")).map((el) => ({
      era: el.getAttribute("data-ledger-row"),
      entered: Number(el.querySelector("[data-entered]").getAttribute("data-entered")),
      left: Number(el.querySelector("[data-left]").getAttribute("data-left")),
    })),
  );
  const final = await num(page, "[data-end-lead]", "data-end-lead");
  if (rows.length !== 5) fails.push(`the ledger has ${rows.length} rows, not five`);
  let cash = FIX.start;
  for (const row of rows) {
    if (!near(row.entered, cash, 0.011)) fails.push(`${row.era} entered with ${row.entered} but the run held ${cash}`);
    cash = row.left;
  }
  if (!near(final, cash, 0.011)) fails.push(`the lead says ${final} but the rows end at ${cash}`);
  const biggest = await page.locator("[data-biggest]").count();
  if (biggest === 0) fails.push("the end card has no biggest win or loss");
  const text = await page.locator("body").innerText();
  if (!text.includes("You finished with")) fails.push("the end card is missing its lead line");
  if (!/Stars earned:/.test(text)) fails.push("the end card is missing the star count");
  if (!/Never trading:/.test(text)) fails.push("the end card is missing the never trading baseline");
  if (!/The market:/.test(text)) fails.push("the end card is missing the index baseline");
  // The spec asks for exactly two full-campaign baselines. The equal-weight
  // basket compounded through five eras is not one of them: it comes out in
  // the millions and reads as the game mocking the player.
  if (/Doing nothing:/.test(text)) fails.push("the end card still prints the compounded holding baseline");
  const compounded = `$${Math.round(FIX.campaign.holding).toLocaleString("en-US")}`;
  if (text.includes(compounded)) fails.push(`the end card still prints the compounded basket, ${compounded}`);
  if (!text.includes(`$${FIX.campaign.index.toLocaleString("en-US", { maximumFractionDigits: 0 })}`)) {
    fails.push(`the end card does not print the index baseline the sim computed, ${FIX.campaign.index}`);
  }
  return { fails, note: `five eras, ${FIX.start} to ${final.toFixed(2)}` };
}

// ------------------------------------------- the house bar's own findings
//
// Everything below M is a check the spec's twelve letters never asked for and
// the August 20 house-bar review did. One check per finding, named for what it
// is defending rather than for a letter.

const OBSERVE_SHIFTS = () => {
  window.__cls = 0;
  window.__worst = null;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__cls += e.value;
      if (window.__worst === null || e.value > window.__worst.v) {
        const s = (e.sources || [])[0];
        const n = s && s.node;
        window.__worst = {
          v: e.value,
          what: n && n.nodeType === 1
            ? `${n.tagName.toLowerCase()} "${(n.textContent || "").slice(0, 28)}"`
            : "unknown",
        };
      }
    }
  }).observe({ type: "layout-shift", buffered: false });
};

// M. The desk draws a countable unit. At era open, on both viewports, the drawn
// unit is thick enough to have a seam and there are enough of them to count.
async function M_countable_unit(page, view) {
  const fails = [];
  const seen = [];
  for (const era of ["gfc", "covid", "crypto"]) {
    await open(page, `?era=${era}&seed=7&turbo=0`);
    await wait(400);
    const col = await page.evaluate(() => {
      const el = document.querySelector('[data-stack="cash"]');
      const unit = el.querySelector("[data-unit]:nth-child(2)");
      const style = unit ? getComputedStyle(unit) : null;
      return {
        units: Number(el.getAttribute("data-units")),
        band: Number(el.getAttribute("data-unit-band")),
        unitPx: Number(el.getAttribute("data-unit-px")),
        h: el.getBoundingClientRect().height,
        seam: style ? style.borderTopWidth : "none",
        fill: style ? style.backgroundColor : "",
      };
    });
    seen.push(`${era} ${col.units} units of ${col.unitPx.toFixed(1)}px`);
    if (!(col.unitPx >= 3)) fails.push(`${era}: a drawn unit is ${col.unitPx}px, too thin to have a seam`);
    if (!(col.units >= 8)) fails.push(`${era}: the cash column draws ${col.units} units, too few to count`);
    if (col.seam === "0px" || col.seam === "none") fails.push(`${era}: the units have no seam between them`);
    // Trigger's grey, so the two games draw one representation
    if (col.fill !== "rgb(135, 148, 166)") fails.push(`${era}: a cash tick is ${col.fill}, not Trigger's #8794A6`);
    if (!(col.h > 120)) fails.push(`${era}: the whole cash column is ${col.h}px tall`);
  }
  // and a stock column is Trigger's green
  await open(page, "?era=gfc&seed=7&turbo=0");
  await page.click('[data-rail-row="AAPL"]');
  await wait(200);
  await page.click('[data-trade="Buy 5"]');
  await wait(240);
  const slab = await page.evaluate(() => getComputedStyle(document.querySelector('[data-stack="AAPL"] [data-unit]')).backgroundColor);
  if (slab !== "rgb(74, 222, 128)") fails.push(`a slab is ${slab}, not Trigger's #4ADE80`);
  return { fails, note: seen.join(", ") };
}

// N. The settle pour actually pours: the columns stay mounted for the whole
// 1.2 seconds, cash climbs, the position drains, and the layout does not lurch
// when the era hands over to the next level card.
async function N_settle_pour(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&turbo=0");
  await playUntil(page, ["run"], { budgetMs: 15000 });
  await page.click('[data-rail-row="AAPL"]');
  await wait(160);
  await page.click('[data-trade="Buy max"]');
  await wait(160);
  await setTurbo(page, 90);
  const landed = await playUntil(page, ["debrief"], { gateChoice: 1, budgetMs: 45000 });
  if (landed !== "debrief") {
    fails.push(`the era never finished, it stopped at ${landed}`);
    return { fails, note: landed };
  }
  await page.evaluate(OBSERVE_SHIFTS);
  const started = Date.now();
  await page.click("[data-continue]");
  const frames = [];
  for (let i = 0; i < 7; i++) {
    frames.push(await page.evaluate(() => {
      const read = (k) => {
        const el = document.querySelector(`[data-stack="${k}"]`);
        return el ? Number(el.getAttribute("data-draw-dollars")) : null;
      };
      return {
        phase: document.querySelector("[data-floor]").getAttribute("data-phase"),
        cash: read("cash"),
        held: read("AAPL"),
        at: performance.now(),
      };
    }));
    await wait(150);
  }
  const pouring = frames.filter((f) => f.phase === "settle");
  const withBoth = pouring.filter((f) => f.held !== null);
  if (pouring.length < 4) fails.push(`the settle lasted ${pouring.length} samples, not a real 1.2 seconds`);
  if (withBoth.length < 4) fails.push(`the position column unmounted after ${withBoth.length} samples instead of draining`);
  for (let i = 1; i < withBoth.length; i++) {
    if (withBoth[i].cash < withBoth[i - 1].cash - 0.01) fails.push("cash fell during the pour");
    if (withBoth[i].held > withBoth[i - 1].held + 0.01) fails.push("the position grew during the pour");
  }
  if (withBoth.length >= 2) {
    const first = withBoth[0];
    const last = withBoth[withBoth.length - 1];
    if (!(last.cash > first.cash + 1)) fails.push(`cash did not climb, ${first.cash} to ${last.cash}`);
    if (!(last.held < first.held - 1)) fails.push(`the position did not drain, ${first.held} to ${last.held}`);
  }
  await playUntil(page, ["level", "end"], { budgetMs: 8000 });
  await wait(400);
  const cls = await page.evaluate(() => ({ cls: window.__cls, worst: window.__worst }));
  if (cls.cls > 0.05) {
    fails.push(`the era boundary shifted the layout by ${cls.cls.toFixed(3)}, worst ${cls.worst && cls.worst.what}`);
  }
  return {
    fails,
    note: `${withBoth.length} poured frames over ${Date.now() - started}ms, boundary shift ${cls.cls.toFixed(4)}`,
  };
}

// O. Nothing moves under the thumb. The trade buttons hold one box across five
// seconds of live tape and every one of them is inside the viewport.
async function O_stable_trade_row(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7");
  await playUntil(page, ["run"], { budgetMs: 15000 });
  await wait(600);
  await page.evaluate(OBSERVE_SHIFTS);
  const readBoxes = () => page.evaluate(() => {
    const out = {};
    for (const b of document.querySelectorAll("[data-trade]")) {
      const r = b.getBoundingClientRect();
      out[b.getAttribute("data-trade")] = [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)];
    }
    return { boxes: out, w: window.innerWidth, h: window.innerHeight, scroll: document.documentElement.scrollHeight };
  });
  const first = await readBoxes();
  const moved = new Set();
  for (let i = 0; i < 10; i++) {
    await wait(500);
    const now = await readBoxes();
    for (const [label, box] of Object.entries(now.boxes)) {
      const was = first.boxes[label];
      if (!was || box.some((v, j) => Math.abs(v - was[j]) > 1)) moved.add(`${label} ${was} to ${box}`);
    }
  }
  for (const [label, box] of Object.entries(first.boxes)) {
    const [l, t, r, b] = box;
    if (t < 0 || l < 0 || b > first.h || r > first.w) {
      fails.push(`${label} sits at ${box} in a ${first.w}x${first.h} window`);
    }
  }
  if (Object.keys(first.boxes).length !== 6) fails.push(`the desk drew ${Object.keys(first.boxes).length} trade buttons, not six`);
  for (const m of moved) fails.push(`a trade button moved: ${m}`);
  if (first.scroll > first.h + 1) fails.push(`the desk is ${first.scroll}px tall in a ${first.h}px window`);
  const cls = await page.evaluate(() => ({ cls: window.__cls, worst: window.__worst }));
  if (cls.cls > 0.05) fails.push(`five seconds of tape shifted the layout by ${cls.cls.toFixed(3)}, worst ${cls.worst && cls.worst.what}`);
  return { fails, note: `six buttons held one box, shift ${cls.cls.toFixed(4)}` };
}

// P. A company that is not public yet cannot be traded. eraCovid backfills Zoom
// and Peloton at a flat price for months before they listed; the game refuses
// to list them until their first real trading month.
async function P_listing(page, view) {
  const fails = [];
  await open(page, "?era=covid&seed=7&turbo=0");
  await wait(400);
  const rail = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-rail-row]")).map((el) => ({
      ticker: el.getAttribute("data-rail-row"),
      listed: el.getAttribute("data-listed"),
      disabled: el.disabled === true,
      text: el.innerText.replace(/\n/g, " "),
    })),
  );
  const zoom = rail.find((r) => r.ticker === "ZM");
  const peloton = rail.find((r) => r.ticker === "PTON");
  const apple = rail.find((r) => r.ticker === "AAPL");
  if (!zoom || zoom.listed !== "0") fails.push(`Zoom reads listed at the era open: ${zoom && zoom.text}`);
  if (!peloton || peloton.listed !== "0") fails.push(`Peloton reads listed at the era open: ${peloton && peloton.text}`);
  if (zoom && !/lists April 2019/.test(zoom.text)) fails.push(`the rail says "${zoom.text}" for Zoom`);
  if (peloton && !/lists September 2019/.test(peloton.text)) fails.push(`the rail says "${peloton.text}" for Peloton`);
  if (zoom && !zoom.disabled) fails.push("an unlisted Zoom can still be focused");
  if (apple && apple.listed !== "1") fails.push("Apple reads unlisted in January 2019");
  const focused = await page.getAttribute("[data-chart-series]", "data-chart-series");
  if (/:(ZM|PTON)$/.test(String(focused))) fails.push(`the desk opened focused on an unlisted company, ${focused}`);
  if (await page.locator('[data-stack="ZM"]').count()) fails.push("an unlisted Zoom has a desk column");

  // and it lists on its own month
  await open(page, "?era=covid&seed=7&turbo=40");
  const stop = Date.now() + 30000;
  let listed = "0";
  for (;;) {
    const t = await num(page, "[data-floor]", "data-tape");
    listed = await page.getAttribute('[data-rail-row="ZM"]', "data-listed");
    if (listed === "1" || t >= 12 || Date.now() > stop) break;
    await wait(100);
  }
  if (listed !== "1") fails.push("Zoom never listed inside the first year of the era");
  return { fails, note: "Zoom lists April 2019, Peloton September 2019" };
}

// Q. Level five opens on something the money can buy. The crypto file lists
// Bitcoin first at ten thousand dollars a coin.
async function Q_crypto_open(page, view) {
  const fails = [];
  await open(page, "?era=crypto&seed=7&turbo=0");
  await wait(400);
  const focused = await page.getAttribute("[data-chart-series]", "data-chart-series");
  const buys = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-trade]"))
      .filter((b) => b.getAttribute("data-trade").startsWith("Buy"))
      .map((b) => `${b.getAttribute("data-trade")}:${b.disabled ? "off" : "on"}`),
  );
  const btcFocused = String(focused).endsWith(":BTC-USD");
  const btcOnRail = await page.locator('[data-rail-row="BTC-USD"]').count();
  if (btcFocused) fails.push("the crypto era still opens focused on Bitcoin");
  if (btcOnRail === 0) fails.push("Bitcoin left the rail instead of staying on it unbuyable");
  if (!buys.includes("Buy 1:on")) fails.push(`no buy button is live at the crypto open: ${buys.join(" ")}`);

  // A pinned era opens with two thousand dollars, but the campaign carries
  // whatever level four left, which is smaller. The asset the desk opens on
  // has to be affordable on a normal carry, not only on a full purse.
  const CARRY = 1200;
  const opened = await page.evaluate(() => {
    const key = document.querySelector("[data-chart-series]").getAttribute("data-chart-series").split(":").slice(1).join(":");
    const row = document.querySelector(`[data-rail-row="${CSS.escape(key)}"]`);
    const m = row ? row.innerText.match(/\$([\d,.]+)/) : null;
    return { key, price: m ? Number(m[1].replace(/,/g, "")) : Infinity };
  });
  if (!(opened.price <= CARRY)) {
    fails.push(`the crypto era opens on ${opened.key} at $${opened.price}, which a $${CARRY} carry cannot buy`);
  }
  return { fails, note: `${focused} at $${opened.price}, ${buys.join(" ")}` };
}

// R. The debrief is a card, not a window onto the live desk: fully opaque, its
// worth chart carries year labels, and the reveal list holds every headline
// that ran rather than the first nine.
async function R_debrief_card(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&beat=debrief");
  await wait(700);
  const card = await page.evaluate(() => {
    const el = document.querySelector("[data-debrief]");
    const bg = getComputedStyle(el).backgroundColor;
    const rows = el.querySelectorAll("[data-reveal-row]").length;
    const total = Number(el.querySelector("[data-reveal]").getAttribute("data-reveal-total"));
    const years = Array.from(el.querySelectorAll("[data-worth-year]")).map((g) => g.getAttribute("data-worth-year"));
    const list = el.querySelector("[data-reveal]");
    const labels = Array.from(el.querySelectorAll("[data-reveal-row]")).map((r) => r.getAttribute("data-label"));
    return {
      bg,
      rows,
      total,
      years,
      scrolls: list.scrollHeight > list.clientHeight + 1,
      months: Array.from(el.querySelectorAll("[data-reveal-row]")).slice(0, 3).map((r) => r.innerText.split("\n")[0].trim()),
      labels: [...new Set(labels)],
      continueVisible: (() => {
        const b = el.querySelector("[data-continue]").getBoundingClientRect();
        return b.top >= 0 && b.bottom <= window.innerHeight;
      })(),
    };
  });
  const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(card.bg);
  if (alpha && Number(alpha[1]) < 1) fails.push(`the debrief is ${alpha[1]} opaque and the live desk reads through it`);
  if (card.rows !== card.total) fails.push(`the reveal shows ${card.rows} of ${card.total} headlines`);
  if (!(card.total >= 20)) fails.push(`the run only aired ${card.total} headlines`);
  if (!card.scrolls) fails.push("the reveal list does not scroll inside the card");
  if (card.years.length < 2) fails.push(`the worth chart carries ${card.years.length} year labels`);
  if (!/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(card.months[0] ?? "")) fails.push(`the reveal has no month column, first cell is "${card.months[0]}"`);
  if (!card.continueVisible) fails.push("Continue is below the fold under the reveal list");
  return { fails, note: `${card.rows} of ${card.total} rows, years ${card.years.join(" ")}` };
}

// S. Both gate choices are drawn the same. A primary and a secondary button is
// the desk telling you which one to take at the bottom of a crash.
async function S_gate_balance(page, view) {
  const fails = [];
  await open(page, "?era=covid&seed=7&beat=gate");
  await wait(700);
  const looks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-gate-choice]")).map((b) => {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return `${s.backgroundColor}|${s.color}|${s.borderTopColor}|${s.fontWeight}|${Math.round(r.width)}x${Math.round(r.height)}`;
    }),
  );
  if (looks.length !== 2) fails.push(`the gate drew ${looks.length} choices`);
  if (looks.length === 2 && looks[0] !== looks[1]) {
    fails.push(`the two choices are drawn differently: ${looks[0]} against ${looks[1]}`);
  }
  return { fails, note: looks[0] ?? "" };
}

// T. One money format. Whole dollars everywhere a total is read, so the worth
// readout does not change shape as a run crosses a thousand dollars.
async function T_one_money(page, view) {
  const fails = [];
  await open(page, "?era=gfc&seed=7&turbo=0");
  await wait(400);
  const header = await page.locator("[data-header]").innerText();
  if (/\$[\d,]+\.\d\d(?!\d)/.test(header)) fails.push(`the worth readout carries cents: ${header.replace(/\n/g, " ")}`);
  await open(page, "?era=gfc&seed=7&beat=debrief");
  await wait(600);
  const lines = await page.evaluate(() => {
    const el = document.querySelector("[data-debrief]");
    return [
      el.querySelector("[data-debrief-you]").innerText,
      el.querySelector("[data-debrief-holding]").innerText,
      el.querySelector("[data-debrief-index]").innerText,
    ].join(" | ");
  });
  if (/\$[\d,]+\.\d\d(?!\d)/.test(lines)) fails.push(`the debrief carries cents: ${lines}`);
  if (!/[-+]\$[\d,]+/.test(lines)) fails.push(`the debrief has no signed delta against the baselines: ${lines}`);
  return { fails, note: lines.replace(/\n/g, " ") };
}

// U and V are the debrief's two bottom-of-the-card faults, and both of them
// need a run that was actually played: `?beat=debrief` skips the gates, and it
// is the three gate quotes that push the reveal list down far enough to meet
// the Continue bar. So these two play the era through at turbo and read the
// card the player would be looking at.

// A row is only ever painted inside every scrolling box it sits in, so what the
// eye gets is the row's rect clipped by each clipping ancestor and by the
// window. Everything U judges, it judges on that painted rect.
const PAINTED_ROWS = () => {
  const card = document.querySelector("[data-debrief]");
  const foot = card.querySelector("[data-debrief-foot]").getBoundingClientRect();
  const clipOf = (el) => {
    let top = 0;
    let bottom = window.innerHeight;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if (o === "auto" || o === "scroll" || o === "hidden") {
        const r = p.getBoundingClientRect();
        top = Math.max(top, r.top);
        bottom = Math.min(bottom, r.bottom);
      }
    }
    return { top, bottom };
  };
  const rows = Array.from(card.querySelectorAll("[data-reveal-row]")).map((el) => {
    const r = el.getBoundingClientRect();
    const c = clipOf(el);
    return {
      id: el.getAttribute("data-reveal-row"),
      top: r.top,
      bottom: r.bottom,
      seenTop: Math.max(r.top, c.top),
      seenBottom: Math.min(r.bottom, c.bottom),
      text: el.innerText.replace(/\n/g, " ").slice(0, 40),
    };
  });
  return {
    bar: { top: foot.top, bottom: foot.bottom },
    rows,
    gates: card.querySelectorAll("[data-gate-quote]").length,
    h: window.innerHeight,
  };
};

// U. The reveal's scrollable region ends above the Continue bar. On a real
// played run, with the gate quotes in the card, no headline row is drawn under
// the bar and none is sliced by the bottom of the screen; and scrolling the
// reveal to its end leaves the last row whole, inside the window and clear of
// the bar.
async function U_debrief_bottom(page, view) {
  const fails = [];
  await open(page, "?era=covid&seed=11&turbo=90");
  const landed = await playUntil(page, ["debrief"], { gateChoice: 1, budgetMs: 180000 });
  if (landed !== "debrief") {
    fails.push(`the era never finished, it stopped at ${landed}`);
    return { fails, note: landed };
  }
  await wait(400);

  const before = await page.evaluate(PAINTED_ROWS);
  if (before.gates === 0) fails.push("the played run left no gate quotes, so this is not the tall card");
  if (before.rows.length === 0) fails.push("the debrief drew no reveal rows");
  for (const row of before.rows) {
    if (row.seenBottom <= row.seenTop) continue;
    if (row.seenBottom > before.bar.top + 0.5) {
      fails.push(`"${row.text}" is drawn down to ${row.seenBottom.toFixed(1)} under a bar that starts at ${before.bar.top.toFixed(1)}`);
    }
    if (row.seenBottom > before.h + 0.5 || row.seenTop < -0.5) {
      fails.push(`"${row.text}" is drawn at ${row.seenTop.toFixed(1)} to ${row.seenBottom.toFixed(1)} in a ${before.h}px window`);
    }
  }

  // and the end of the list is readable
  await page.evaluate(() => {
    const card = document.querySelector("[data-debrief]");
    for (const el of card.querySelectorAll("*")) {
      const o = getComputedStyle(el).overflowY;
      if (o === "auto" || o === "scroll") el.scrollTop = el.scrollHeight;
    }
  });
  await wait(300);
  const after = await page.evaluate(PAINTED_ROWS);
  const last = after.rows[after.rows.length - 1];
  if (last) {
    // a pixel and a half of slack, because a row boundary that lands on a
    // fraction of a device pixel is not a row anyone cannot read
    const whole = last.seenTop <= last.top + 1.5 && last.seenBottom >= last.bottom - 1.5;
    if (!whole) fails.push(`the last row "${last.text}" is still cut, ${last.top.toFixed(1)} to ${last.bottom.toFixed(1)} shown as ${last.seenTop.toFixed(1)} to ${last.seenBottom.toFixed(1)}`);
    if (last.bottom > after.bar.top + 0.5) fails.push(`the last row ends at ${last.bottom.toFixed(1)}, under a bar that starts at ${after.bar.top.toFixed(1)}`);
    if (last.top < -0.5 || last.bottom > after.h + 0.5) fails.push(`the last row sits at ${last.top.toFixed(1)} to ${last.bottom.toFixed(1)} in a ${after.h}px window`);
  }
  return {
    fails,
    note: `${before.rows.length} rows and ${before.gates} gate quotes, bar at ${before.bar.top.toFixed(1)} in ${before.h}px`,
  };
}

// V. The debrief chart's three right-edge values never collide. A run that
// finishes near a baseline used to draw two of them into one smear, so the
// labels are laid out apart from each other now.
async function V_worth_labels(page, view) {
  const fails = [];
  const seen = [];
  const runs = [
    ["covid", 11, 1],
    ["covid", 3, 0],
    ["gfc", 7, 1],
  ];
  for (const [era, seed, choice] of runs) {
    await open(page, `?era=${era}&seed=${seed}&turbo=90`);
    // Three real eras played end to end, so the budget is the walk's longest
    // rather than the default minute: on a loaded box a minute runs out inside
    // an era and reports a layout fault that is really a slow machine.
    const landed = await playUntil(page, ["debrief"], { gateChoice: choice, budgetMs: 180000 });
    if (landed !== "debrief") {
      fails.push(`${era} seed ${seed} never finished, it stopped at ${landed}`);
      continue;
    }
    await wait(400);
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-worth-label]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { key: el.getAttribute("data-worth-label"), text: el.textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      }),
    );
    if (labels.length !== 3) {
      fails.push(`${era} seed ${seed} drew ${labels.length} value labels, not three`);
      continue;
    }
    let tightest = Infinity;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const overlaps = a.top < b.bottom && b.top < a.bottom && a.left < b.right && b.left < a.right;
        if (overlaps) {
          fails.push(`${era} seed ${seed}: ${a.key} ${a.text} at ${a.top.toFixed(1)}-${a.bottom.toFixed(1)} runs into ${b.key} ${b.text} at ${b.top.toFixed(1)}-${b.bottom.toFixed(1)}`);
        }
        tightest = Math.min(tightest, Math.max(b.top - a.bottom, a.top - b.bottom));
      }
    }
    // every one of them still has to be inside the chart it belongs to
    const box = await page.evaluate(() => {
      const r = document.querySelector("[data-worth-chart]").getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, right: r.right };
    });
    for (const l of labels) {
      if (l.top < box.top - 0.5 || l.bottom > box.bottom + 0.5 || l.right > box.right + 0.5) {
        fails.push(`${era} seed ${seed}: ${l.key} ${l.text} sits outside the chart`);
      }
    }
    seen.push(`${era}/${seed} ${tightest.toFixed(1)}px apart`);
  }
  return { fails, note: seen.join(", ") };
}

// Extra, not one of the spec's letters: docs/clean-type.md across every beat.
// tools/cleancheck.mjs only ever sees /#/floor, which is the level card, so the
// desk, a gate, a debrief and the campaign end are audited here with the same
// rules that file uses.
const TYPE_AUDIT = () => {
  const bad = [];
  const seen = new Set();
  const banned = /mono|grotesk|pixelify|fraunces|courier|consolas|menlo/i;
  for (const el of document.querySelectorAll("body *")) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const tag = el.tagName.toLowerCase();
    const label = (own || el.getAttribute("aria-label") || tag).slice(0, 42);
    const key = (k) => `${k}|${label}`;
    const fam = style.fontFamily || "";
    if (banned.test(fam) && !seen.has(key("font"))) { seen.add(key("font")); bad.push(`font ${fam.slice(0, 34)} on "${label}"`); }
    if (/georgia|times/i.test(fam) && !el.closest("[data-newsclip]") && !seen.has(key("serif"))) { seen.add(key("serif")); bad.push(`serif on "${label}"`); }
    if (own.length > 0 || tag === "text") {
      const size = parseFloat(style.fontSize);
      if (size && size < 12 && !seen.has(key("size"))) { seen.add(key("size")); bad.push(`${size}px on "${label}"`); }
    }
    if (style.textTransform === "uppercase" && !seen.has(key("caps"))) { seen.add(key("caps")); bad.push(`uppercase on "${label}"`); }
    const ls = style.letterSpacing;
    if (ls && ls !== "normal" && parseFloat(ls) > 0.15 && !seen.has(key("track"))) { seen.add(key("track")); bad.push(`tracking ${ls} on "${label}"`); }
  }
  return bad;
};

async function type_contract(page, view) {
  const fails = [];
  const beats = [
    ["level", "?era=gfc&seed=7&beat=level"],
    ["desk", "?era=gfc&seed=7&turbo=0"],
    ["gate", "?era=gfc&seed=7&beat=gate"],
    ["debrief", "?era=gfc&seed=7&beat=debrief"],
  ];
  for (const [name, query] of beats) {
    await open(page, query);
    await wait(500);
    for (const bad of await page.evaluate(TYPE_AUDIT)) fails.push(`${name}: ${bad}`);
  }
  await page.click("[data-continue]");
  await wait(1800);
  for (const bad of await page.evaluate(TYPE_AUDIT)) fails.push(`end: ${bad}`);
  return { fails, note: `${beats.length + 1} beats audited` };
}

const CHECKS = [
  ["A_focus_switch", A_focus_switch],
  ["B_buy_five", B_buy_five],
  ["C_quiet_thicken", C_quiet_thicken],
  ["D_one_ruler", D_one_ruler],
  ["E_column_focus", E_column_focus],
  ["F_gate_trade", F_gate_trade],
  ["G_settlement_carry", G_settlement_carry],
  ["H_lehman_gone", H_lehman_gone],
  ["I_baselines", I_baselines],
  ["J_resume", J_resume],
  ["K_stars", K_stars],
  ["L_full_campaign", L_full_campaign],
  ["M_countable_unit", M_countable_unit],
  ["N_settle_pour", N_settle_pour],
  ["O_stable_trade_row", O_stable_trade_row],
  ["P_listing", P_listing],
  ["Q_crypto_open", Q_crypto_open],
  ["R_debrief_card", R_debrief_card],
  ["S_gate_balance", S_gate_balance],
  ["T_one_money", T_one_money],
  ["U_debrief_bottom", U_debrief_bottom],
  ["V_worth_labels", V_worth_labels],
  ["type_contract", type_contract],
];

// ------------------------------------------------------------ screenshots

async function shots(page, view) {
  // a real mid-run desk: build a position on a frozen tape, then let it run a
  // few months, stopping short of the era's first gate so the shot is the desk
  // and not an overlay
  await open(page, "?era=gfc&seed=7&turbo=0");
  await playUntil(page, ["run"], { budgetMs: 12000 });
  await page.click('[data-rail-row="AAPL"]');
  await wait(200);
  await page.click('[data-trade="Buy max"]');
  await wait(200);
  await setTurbo(page, 4);
  await wait(1100);
  await setTurbo(page, 0);
  await wait(300);
  if ((await phase(page)) !== "run") throw new Error(`the desk shot landed on ${await phase(page)}`);
  await page.screenshot({ path: `${OUT}floor-desk-${view}.png` });

  await open(page, "?era=gfc&seed=7&beat=gate");
  await wait(700);
  await page.screenshot({ path: `${OUT}floor-gate-${view}.png` });

  await open(page, "?era=gfc&seed=7&beat=debrief");
  await wait(700);
  await page.screenshot({ path: `${OUT}floor-debrief-${view}.png` });

  // the campaign end is the real one: five eras played through at speed
  await open(page, "?seed=7&turbo=110");
  const done = await playUntil(page, ["end"], { budgetMs: 300000 });
  if (done !== "end") throw new Error(`the campaign end shot stopped at ${done}`);
  await wait(400);
  await page.screenshot({ path: `${OUT}floor-end-${view}.png` });
}

// ------------------------------------------------------------------ the run

const browser = await chromium.launch();
let failed = 0;

for (const [view, w, h] of VIEWS) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  // A missing element should still be a failure rather than a stall, but eight
  // seconds was measuring the machine and not the desk: on a loaded box the
  // five era campaign lost its Continue click to the timeout while the very
  // same campaign, played again for the screenshots, finished. Twenty seconds
  // is long enough that only a button that is really not there runs it out.
  page.setDefaultTimeout(20000);
  const crashes = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  console.log(`\n${view} ${w}x${h}`);
  for (const [name, fn] of CHECKS) {
    let out;
    try {
      out = await fn(page, view);
    } catch (e) {
      out = { fails: [`threw: ${e.message.split("\n")[0]}`], note: "" };
    }
    if (out.fails.length > 0) failed += out.fails.length;
    record(view, name, out.fails, out.note);
  }
  try {
    await shots(page, view);
    console.log(`ok   ${view.padEnd(5)} screenshots         tools/shots/floor-*-${view}.png`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${view.padEnd(5)} screenshots         ${e.message.split("\n")[0]}`);
  }
  if (crashes.length > 0) {
    failed += crashes.length;
    console.log(`FAIL ${view.padEnd(5)} page errors         ${crashes[0]}`);
  }
  await page.close();
}

await browser.close();

console.log("");
const bad = results.filter((r) => r.fails.length > 0);
if (failed > 0) {
  console.log(`${failed} failure${failed === 1 ? "" : "s"} across ${bad.length} check${bad.length === 1 ? "" : "s"}`);
  for (const r of bad) console.log(`  ${r.view} ${r.name}`);
  process.exit(1);
}
console.log(`the floor walks clean: ${CHECKS.length} checks at both viewports`);
process.exit(0);
