// The Trigger walk. Every acceptance test in docs/trigger-spec.md section 9
// is one named check here, run at 1440x950 and at 390x844, against pinned
// ?era=&stock=&seed= urls so a failure is always reproducible by hand.
//
//   A_zero_input_run      a full run with no input ends at the starting cash
//   B_conservation        buy then sell at the same instant moves worth by $0
//   C_calculator_ruler    the calculator, the price and the meter agree
//   D_thickness_tracks    slab count holds, thickness follows the price
//   E_sell_pours_ticks    a sell becomes floor(value/10) ticks and a sliver
//   E_pour_animates       and it pours rather than snapping, both directions
//   F_same_seed_same_run  one seed, one headline sequence and one set of labels
//   G_headline_mix        at least 30% signal and 25% lies
//   H_years_and_axis      year labels at both sizes, the y axis never shrinks
//   I_leh_seller_wins     selling Lehman before September 2008 beats holding
//   J_spacebar            space toggles, and the button flips label and colour
//   J_desktop_keycap      the button carries a space keycap wide, none on phone
//   P_bot_scaffold_runs   the shipped scaffold plays a full run by itself
//   Q_bot_wrong_action_stops  an overspending bot freezes the tape mid run
//   Q_bot_compile_error_stays code that does not parse never leaves the card
//   O_scale_survives_trade   a buy and a sell leave the dollar ruler untouched
//   L_replay_without_scrolling  Play again is on screen the moment a run ends
//   M_calculator_is_largest  nothing on the run screen outsizes the calculator
//   N_calculator_fits_box    and the calculator fits its own box, no padding
//                            slack, swept across the whole length band
//
// B, F and G are also engine level invariants in tools/tapeSim.ts (1, 5 and 6).
// The versions here confirm the surface tells the same story the engine does.
//
// Judgment call: the walk drives the tape with a test only &turbo= url param
// that multiplies SPEED and nothing else. Without it a single full run is
// forty five to sixty seven real seconds and the suite would take ten minutes.
// It defaults off, so no player ever sees it.
//
// Usage: node tools/triggercheck.mjs

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:4318/#/trigger";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A trade pours over POUR_MS in src/components/trigger/Meter.tsx. Every pixel
// check below waits it out first, so the strip is read settled and the walk
// stays deterministic; E_pour_animates is the one check that reads it moving.
const POUR_MS = 320;
const POUR_SETTLE = 550;

// The same rules tools/cleancheck.mjs enforces, run here as well because that
// audit only ever sees the deal card: it loads a route and reads it, and the
// run and the end card live behind a button.
const TYPE_AUDIT = () => {
  const bad = [];
  const banned = /mono|grotesk|pixelify|fraunces|courier|consolas|menlo/i;
  for (const el of document.querySelectorAll("body *")) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const texty = own.length > 0 || el.tagName.toLowerCase() === "text";
    const label = (own || el.tagName.toLowerCase()).slice(0, 36);
    const fam = style.fontFamily || "";
    if (banned.test(fam)) bad.push(`font ${fam.slice(0, 30)} on "${label}"`);
    if (/georgia|times/i.test(fam) && !el.closest("[data-newsclip]")) bad.push(`serif on "${label}"`);
    if (texty && parseFloat(style.fontSize) < 12) bad.push(`${style.fontSize} on "${label}"`);
    if (style.textTransform === "uppercase") bad.push(`caps on "${label}"`);
    const ls = style.letterSpacing;
    if (ls && ls !== "normal" && parseFloat(ls) > 0.15) bad.push(`tracking ${ls} on "${label}"`);
  }
  return Array.from(new Set(bad));
};

let failures = 0;
let size = "";
let stage = "start";      // named so a crash says which section it died in

function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "pass" : "FAIL"}  ${size.padEnd(5)}  ${name.padEnd(22)}  ${detail}`);
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;

// One read of the whole surface in one javascript turn. The tape moves every
// frame, so two separate reads would disagree about the price and the check
// would be measuring the clock rather than the game.
// A long running evaluate dies if the dev server pushes a reload under it,
// which has nothing to do with the game. One retry turns that into a delay
// rather than a red gate.
async function tryTwice(fn) {
  try {
    return await fn();
  } catch {
    await wait(500);
    return fn();
  }
}

function meterOf(s) {
  if (!s.meter) throw new Error(`no strip on screen, phase=${s.root?.["data-phase"] ?? "gone"}`);
  return s.meter;
}

async function snap(page) {
  // A snapshot taken in the frame the run ends has no strip to read, which is
  // a race in the harness rather than a fault in the game: retry briefly while
  // the tape is still running.
  for (let attempt = 1; attempt <= 6; attempt++) {
    const s = await readAll(page);
    if (s.meter !== null || s.root?.["data-phase"] !== "run") return s;
    await wait(60);
  }
  return readAll(page);
}

async function readAll(page) {
  return page.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const out = {};
      for (const a of el.getAttributeNames()) out[a] = el.getAttribute(a);
      return out;
    };
    return {
      root: read("[data-trigger]"),
      meter: read("[data-meter]"),
      calc: document.querySelector("[data-calc]")?.textContent ?? "",
      meterBox: (() => {
        const m = document.querySelector("[data-meter]");
        return m ? Math.round(m.getBoundingClientRect().height) : 0;
      })(),
      button: (() => {
        const b = document.querySelector("[data-action]");
        // the label span, not the whole button: the desktop keycap sits
        // beside the label and is not part of it
        return b ? { label: (b.querySelector("[data-label]") ?? b).textContent, bg: getComputedStyle(b).backgroundColor, pos: b.getAttribute("data-position") } : null;
      })(),
    };
  });
}

// Fire one trade and watch the strip every frame until it stops moving. The
// dispatch and the sampling share a javascript turn, so no frame of the pour
// can slip past between two round trips to the browser.
async function pourTrace(page, ms = 700) {
  return page.evaluate((limit) => new Promise((done) => {
    const meter = () => document.querySelector("[data-meter]");
    const out = [];
    const t0 = performance.now();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true, cancelable: true }));
    const loop = () => {
      const m = meter();
      if (m) {
        out.push({
          t: performance.now() - t0,
          shares: Number(m.getAttribute("data-draw-shares")),
          cash: Number(m.getAttribute("data-draw-cash")),
          trueShares: Number(m.getAttribute("data-shares")),
          pouring: m.getAttribute("data-pouring"),
        });
      }
      if (performance.now() - t0 < limit) requestAnimationFrame(loop);
      else done(out);
    };
    requestAnimationFrame(loop);
  }), ms);
}

// Deal a pinned run and start it. Changing only the query inside the hash is a
// same document navigation, so the reload is what forces a fresh deal; both
// navigations are waited out explicitly, because firing the reload into a
// still committing goto destroys the execution context under the next check.
async function open(page, query) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(`${BASE}?${query}`, { waitUntil: "load" });
      await page.reload({ waitUntil: "load" });
      await page.waitForSelector("[data-start]", { timeout: 15000 });
      await page.click("[data-start]");
      await page.waitForSelector('[data-trigger][data-phase="run"]', { timeout: 15000 });
      return;
    } catch (e) {
      last = e;
      await wait(300);
    }
  }
  throw last;
}

// Deal a pinned run in bot mode. The editor prefills from localStorage, so
// the walk overwrites it whenever it brings its own bot, and hands the source
// back either way. It does not wait for a run phase: a bot that breaks a rule
// in its first month may go straight to the stopped card, so the caller says
// what it is waiting for.
async function openBot(page, query, code) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(`${BASE}?${query}`, { waitUntil: "load" });
      await page.reload({ waitUntil: "load" });
      await page.waitForSelector("[data-start]", { timeout: 15000 });
      await page.click('[data-mode="bot"]');
      await page.waitForSelector("[data-bot-code]", { timeout: 15000 });
      if (code !== undefined) await page.fill("[data-bot-code]", code);
      const source = await page.inputValue("[data-bot-code]");
      await page.click("[data-start]");
      return source;
    } catch (e) {
      last = e;
      await wait(300);
    }
  }
  throw last;
}

async function toEnd(page, ms = 90000) {
  try {
    await page.waitForSelector("[data-end]", { timeout: ms });
  } catch (e) {
    // say why the tape stopped rather than just that it did
    const why = await page.evaluate(() => {
      const el = document.querySelector("[data-trigger]");
      return {
        hidden: document.hidden,
        state: document.visibilityState,
        phase: el?.getAttribute("data-phase") ?? "no root",
        t: el?.getAttribute("data-t") ?? "?",
      };
    }).catch(() => null);
    throw new Error(`${e.message.split("\n")[0]} (${why ? `phase ${why.phase}, t ${why.t}, hidden ${why.hidden}/${why.state}` : "page unreadable"})`);
  }
}

async function reveal(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-reveal] > div")).map((el) => ({
      label: el.getAttribute("data-label"),
      text: el.textContent,
    })));
}

// Wait until the tape reaches a month, or give up.
async function untilMonth(page, month, ms = 30000) {
  const stop = Date.now() + ms;
  for (;;) {
    const m = await page.getAttribute("[data-trigger]", "data-month");
    if (m >= month) return m;
    if (Date.now() > stop) return null;
    await wait(40);
  }
}

async function run(page, tag) {
  size = tag;

  stage = "A_zero_input_run";
  // ---------------------------------------------------------------------- A
  await open(page, "era=covid&stock=AAPL&seed=3&turbo=30");
  await toEnd(page);
  {
    const end = await page.evaluate(() => {
      const el = document.querySelector("[data-end]");
      return { you: Number(el.getAttribute("data-you")), holding: Number(el.getAttribute("data-holding")), trades: Number(el.getAttribute("data-trade-count")), text: el.textContent };
    });
    const bothShown = end.text.includes("You: $1,000") && /Doing nothing: \$[\d,]+/.test(end.text);
    check("A_zero_input_run",
      end.trades === 0 && near(end.you, 1000, 0.005) && Math.abs(end.you - end.holding) > 1
        && bothShown,
      `you ${end.you.toFixed(2)}, doing nothing ${end.holding.toFixed(2)}, ${end.trades} trades`);
  }

  stage = "B_conservation";
  // ---------------------------------------------------------------------- B
  // Two space bars in one javascript turn, so the tape cannot move between
  // them and the two prices are the same price to the last digit.
  await open(page, "era=gfc&stock=AAPL&seed=7&turbo=1");
  await wait(700);
  {
    const before = await page.evaluate(() => {
      const el = document.querySelector("[data-trigger]");
      const cash = Number(el.getAttribute("data-cash"));
      const fire = () => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true, cancelable: true }));
      fire();
      fire();
      return cash;
    });
    await wait(120);
    const after = (await snap(page)).root;
    check("B_conservation",
      Number(after["data-shares"]) === 0 && near(Number(after["data-cash"]), before, 0.005)
        && after["data-position"] === "out",
      `cash ${before.toFixed(4)} to ${Number(after["data-cash"]).toFixed(4)}`);
  }

  stage = "O_scale_survives_trade";
  // ---------------------------------------------------------------------- O
  // The one dollar scale belongs to the run, not to the position. Section 6
  // of docs/tape-shared.md says no trade may move it, and the way it used to
  // move was indirect: the calculator changed height between in and out, the
  // chart row flexed, the strip resized and the ruler went with it. Compared
  // as strings, because "unchanged" here means unchanged, not close.
  // Read across the trade itself rather than around it: the ruler is allowed
  // to ease down as a rising price fills the strip, so sampling half a second
  // either side would measure the tape, not the trade.
  {
    await open(page, "era=gfc&stock=AAPL&seed=7&turbo=1");
    await wait(400);
    const o = await tryTwice(() => page.evaluate(() => new Promise((done) => {
      const read = () => {
        const m = document.querySelector("[data-meter]");
        return { scale: m.getAttribute("data-scale"), h: Math.round(m.getBoundingClientRect().height) };
      };
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const fire = () => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true, cancelable: true }));
      (async () => {
        const out = { flat: read() };
        fire();
        await frame();
        out.bought = read();
        fire();
        await frame();
        out.sold = read();
        done(out);
      })();
    })));
    const same = o.flat.scale === o.bought.scale && o.bought.scale === o.sold.scale;
    const still = o.flat.h === o.bought.h && o.bought.h === o.sold.h;
    check("O_scale_survives_trade", same && still,
      `scale ${o.flat.scale} to ${o.bought.scale} to ${o.sold.scale}, strip ${o.flat.h} to ${o.bought.h} to ${o.sold.h}px tall`);
  }

  stage = "C_calculator_ruler";
  // ---------------------------------------------------------------------- C
  await open(page, "era=gfc&stock=AAPL&seed=7&turbo=3");
  await wait(500);
  await page.keyboard.press("Space");
  await wait(POUR_SETTLE);
  {
    const s = await snap(page);
    const r = s.root;
    const m = meterOf(s);
    const text = s.calc;
    const parsed = /^([\d,]+) shares? x \$([\d,]+\.\d+) = \$([\d,]+)/.exec(text);
    const shares = Number(r["data-shares"]);
    const price = Number(r["data-price"]);
    const value = Number(r["data-value"]);
    const num = (s) => Number(String(s).replace(/[$,]/g, ""));
    const readShares = parsed ? num(parsed[1]) : NaN;
    const readPrice = parsed ? num(parsed[2]) : NaN;
    const readValue = parsed ? num(parsed[3]) : NaN;
    const scale = Number(m["data-scale"]);
    const columnH = Number(m["data-column-h"]);
    const parts = {
      held: shares > 0,
      shares: readShares === shares,
      price: near(readPrice, price, 0.005),
      line: near(readValue, shares * price, 0.5),      // the line rounds to the dollar
      // the attributes carry six decimals, so a tolerance below that is
      // measuring the rounding rather than the game
      value: near(value, shares * price, 1e-5 * Math.max(1, shares)),
      ruler: near(columnH, value * scale, 0.01),       // the one ruler, in pixels
    };
    const bad = Object.keys(parts).filter((k) => !parts[k]);
    check("C_calculator_ruler", bad.length === 0,
      `${text.trim()} | ${shares} x ${price.toFixed(2)} = ${value.toFixed(2)}, column ${columnH.toFixed(1)}px at ${scale.toFixed(4)}px per dollar${bad.length ? ` | broke ${bad.join(",")}` : ""}`);
  }

  stage = "D_thickness_tracks";
  // ---------------------------------------------------------------------- D
  // Ten tape months in a rising stock with no input. Zoom's 2019 to 2020 climb
  // is the clearest one in the set.
  await open(page, "era=covid&stock=AAPL&seed=5&turbo=3");
  await wait(300);
  await page.keyboard.press("Space");
  await wait(POUR_SETTLE);
  const d0 = await snap(page);
  await wait(10000 / 3);                                // ten tape months
  const d1 = await snap(page);
  {
    const p0 = Number(meterOf(d0)["data-price"]);
    const p1 = Number(meterOf(d1)["data-price"]);
    const s0 = Number(d0.meter["data-scale"]);
    const s1 = Number(d1.meter["data-scale"]);
    const h0 = Number(d0.meter["data-slab-h"]);
    const h1 = Number(d1.meter["data-slab-h"]);
    const sameCount = d0.meter["data-shares"] === d1.meter["data-shares"] && Number(d0.meter["data-shares"]) > 0;
    const ruler = near(h0, p0 * s0, 1e-4) && near(h1, p1 * s1, 1e-4);
    const rose = p1 > p0;
    // the scale only ever eases down, so thickness follows price exactly while
    // it holds and follows price on the new ruler once it has moved
    const ratio = s1 === s0 ? near(h1 / h0, p1 / p0, 1e-6) : s1 < s0;
    check("D_thickness_tracks", sameCount && ruler && rose && ratio,
      `${d0.meter["data-shares"]} slabs, price ${p0.toFixed(2)} to ${p1.toFixed(2)}, slab ${h0.toFixed(2)}px to ${h1.toFixed(2)}px`);
  }

  stage = "E_pour";
  // ---------------------------------------------------------------------- E
  // The sell and the buy back, each watched frame by frame from inside the
  // page so the pour cannot be missed between two round trips.
  {
    const held = Number(d1.meter["data-shares"]);
    const sell = await pourTrace(page);
    const buy = await pourTrace(page);
    const mid = (trace, from, to) => trace.some((s) => {
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      return s.shares > lo + 1e-6 && s.shares < hi - 1e-6;
    });
    const settled = (trace) => {
      const last = trace[trace.length - 1];
      return last.pouring === "0" && Math.abs(last.shares - last.trueShares) < 1e-3;
    };
    const bounded = (trace) => {
      const done = trace.find((s) => s.pouring === "0" && s.t > 0);
      return done !== undefined && done.t <= POUR_MS + 120;
    };
    const parts = {
      sellPours: mid(sell, held, 0),
      buyPours: buy.length > 1 && mid(buy, 0, Number(buy[buy.length - 1].trueShares)),
      settles: settled(sell) && settled(buy),
      bounded: bounded(sell) && bounded(buy),
    };
    const bad = Object.keys(parts).filter((k) => !parts[k]);
    const span = (t) => `${t.filter((s) => s.pouring === "1").length} moving frames`;
    check("E_pour_animates", bad.length === 0,
      `sell ${span(sell)}, buy ${span(buy)}, settled inside ${POUR_MS}ms${bad.length ? ` | broke ${bad.join(",")}` : ""}`);
  }

  // back out of the market for the settled reading
  await page.keyboard.press("Space");
  await wait(POUR_SETTLE);
  {
    const s = await snap(page);
    const r = s.root;
    const m = meterOf(s);
    const cash = Number(r["data-cash"]);
    const ticks = Number(m["data-ticks"]);
    const tickH = Number(m["data-tick-h"]);
    const scale = Number(m["data-scale"]);
    const sliver = (cash - ticks * 10) * scale;
    const parts = {
      flat: Number(r["data-shares"]) === 0,
      column: Number(m["data-column-h"]) === 0,
      ticks: ticks === Math.floor(cash / 10 + 1e-9),
      fixed: near(tickH, 10 * scale, 1e-4),
      sliver: sliver >= 0 && sliver < tickH,
    };
    const bad = Object.keys(parts).filter((k) => !parts[k]);
    check("E_sell_pours_ticks", bad.length === 0,
      `cash ${cash.toFixed(2)} became ${ticks} ticks of ${tickH.toFixed(2)}px plus a ${sliver.toFixed(2)}px sliver${bad.length ? ` | broke ${bad.join(",")}` : ""}`);
  }

  stage = "F_and_G";
  // ------------------------------------------------------------------- F, G
  const draws = [];
  for (const seed of [7, 7, 8]) {
    await open(page, `era=dotcom&stock=AMZN&seed=${seed}&turbo=30`);
    await toEnd(page);
    const items = await reveal(page);
    draws.push({ seed, items, key: items.map((i) => `${i.label}|${i.text}`).join("\n") });
  }
  {
    const same = draws[0].key === draws[1].key;
    const different = draws[2].key !== draws[0].key;
    check("F_same_seed_same_run", same && different && draws[0].key.length > 0,
      `seed 7 repeated ${same ? "identically" : "differently"}, seed 8 ${different ? "differs" : "matched"}`);

    const items = draws[0].items;
    const total = items.length;
    const signal = items.filter((i) => i.label === "signal").length;
    const lie = items.filter((i) => i.label === "lie").length;
    check("G_headline_mix",
      total > 0 && signal / total >= 0.3 && lie / total >= 0.25,
      `${signal} signal, ${lie} lies of ${total} (${Math.round(100 * signal / total)}% and ${Math.round(100 * lie / total)}%)`);

    const labelled = items.every((i) => /told the truth|meant nothing|pointed the wrong way/.test(i.text));
    check("G_reveal_copy", labelled, `${total} headlines carry one of the three labels`);
  }

  stage = "H_years_and_axis";
  // ---------------------------------------------------------------------- H
  await open(page, "era=gfc&stock=AAPL&seed=7&turbo=6");
  {
    const years = [];
    let ymax = -Infinity;
    let ymin = Infinity;
    let shrank = "";
    for (let i = 0; i < 40; i++) {
      const a = await page.evaluate(() => {
        const el = document.querySelector("[data-chart]");
        if (!el) return null;
        return {
          lo: Number(el.getAttribute("data-ymin")),
          hi: Number(el.getAttribute("data-ymax")),
          years: Array.from(el.querySelectorAll("text")).map((t) => t.textContent).filter((t) => /^\d{4}$/.test(t)).length,
        };
      });
      if (!a) break;
      years.push(a.years);
      if (a.hi < ymax - 1e-6) shrank = `top fell ${ymax} to ${a.hi}`;
      if (a.lo > ymin + 1e-6) shrank = `floor rose ${ymin} to ${a.lo}`;
      ymax = Math.max(ymax, a.hi);
      ymin = Math.min(ymin, a.lo);
      await wait(120);
    }
    const labels = Math.min(...years);
    check("H_years_and_axis", labels >= 2 && shrank === "",
      `${labels} year labels, axis ${ymin.toFixed(1)} to ${ymax.toFixed(1)}${shrank ? `, ${shrank}` : ", never shrank"}`);
  }

  stage = "M_and_N";
  // ------------------------------------------------------------------- M, N
  // The calculator is the hero of section 2, which is a claim about pixels:
  // nothing else on the run screen may be as large as it, and it must fit the
  // box it is given without borrowing the page padding.
  //
  // Both are swept rather than sampled. A fixed pair of readings per ticker
  // misses whole length bands, and the band that broke last time was 24 to 27
  // characters, where the size cap is not the binding constraint and the fit
  // is doing real work. Six runs across the share-count range, sampled every
  // 90ms while the price moves, walk the line through its lengths.
  {
    const seen = [];
    for (const [era, stock] of [
      ["covid", "PTON"], ["gfc", "F"], ["covid", "GME"],
      ["covid", "NVDA"], ["gfc", "AIG"], ["dotcom", "AMZN"],
    ]) {
      await open(page, `era=${era}&stock=${stock}&seed=1&turbo=6`);
      await wait(250);
      await page.keyboard.press("Space");
      await wait(POUR_SETTLE);
      const sweep = await tryTwice(() => page.evaluate((ms) => new Promise((done) => {
        const out = [];
        const range = document.createRange();
        const t0 = performance.now();
        let lastSize = -1;
        let other = 0;
        let label = "";
        const tick = () => {
          const calc = document.querySelector("[data-calc]")?.firstElementChild;
          if (calc) {
            const size = parseFloat(getComputedStyle(calc).fontSize);
            // the tallest other text only moves when the calculator moves,
            // and walking every node is expensive with a full meter on screen
            if (size !== lastSize) {
              lastSize = size;
              other = 0;
              label = "";
              for (const el of document.querySelectorAll("body *")) {
                if (el === calc || calc.contains(el)) continue;
                const st = getComputedStyle(el);
                if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) continue;
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) continue;
                const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
                if (own.length === 0 && el.tagName.toLowerCase() !== "text") continue;
                const s = parseFloat(st.fontSize);
                if (s > other) { other = s; label = (own || el.tagName).slice(0, 30); }
              }
            }
            // the line is nowrap inside a full width block, so its own box
            // never reports the overflow: a range over the text does
            range.selectNodeContents(calc);
            const text = calc.textContent;
            const box = calc.getBoundingClientRect();
            out.push({
              text, size, other, label,
              len: text.length,
              width: range.getBoundingClientRect().width,
              room: calc.clientWidth,
              right: box.right,
              viewport: window.innerWidth,
            });
          }
          if (performance.now() - t0 < ms) setTimeout(tick, 70);
          else done(out);
        };
        tick();
      }), 2600));
      for (const s of sweep) seen.push({ era, stock, ...s });
    }

    const small = seen.filter((s) => s.len > 0);
    const overflows = small.filter((s) => s.width > s.room + 0.5 || s.right > s.viewport + 1);
    const tightFit = small.reduce((a, b) => (b.room - b.width < a.room - a.width ? b : a));
    const band = small.map((s) => s.len);
    // proof the sweep actually walked the band that broke last time, kept two
    // clear of the four lengths in it so a frame of timing jitter cannot fail
    // a check about widths
    const covered = new Set(band.filter((n) => n >= 24 && n <= 27)).size;
    check("N_calculator_fits_box",
      overflows.length === 0 && covered >= 2,
      overflows.length
        ? `${overflows.length} of ${small.length} overflow, worst "${overflows[0].text.split("cash")[0].trim()}" ${overflows[0].width.toFixed(1)}px in ${overflows[0].room}px at ${overflows[0].size}px`
        : `${small.length} samples, lengths ${Math.min(...band)} to ${Math.max(...band)} with ${covered} of the 24 to 27 band, tightest "${tightFit.text.split("cash")[0].trim()}" ${tightFit.width.toFixed(1)}px in ${tightFit.room}px at ${tightFit.size}px`);

    const under = small.filter((s) => !(s.size > s.other));
    const tightBig = small.reduce((a, b) => (b.size - b.other < a.size - a.other ? b : a));
    check("M_calculator_is_largest", under.length === 0,
      under.length
        ? `${under.length} samples tie or lose, worst ${under[0].stock} calc ${under[0].size}px vs ${under[0].other}px "${under[0].label}"`
        : `tightest is ${tightBig.stock}, "${tightBig.text.split("cash")[0].trim()}" at ${tightBig.size}px over ${tightBig.other}px "${tightBig.label}"`);
  }

  // shots of a live run, taken while a position is open
  await open(page, "era=gfc&stock=AAPL&seed=7&turbo=2");
  await wait(500);
  await page.keyboard.press("Space");
  await wait(2500);
  await page.screenshot({ path: `${OUT}trigger-run-${tag}.png` });
  const typeInRun = await page.evaluate(TYPE_AUDIT);
  check("K_type_in_run", typeInRun.length === 0, typeInRun.length ? typeInRun.slice(0, 4).join("; ") : "no banned type mid run");

  stage = "J_spacebar";
  // ---------------------------------------------------------------------- J
  {
    const before = (await snap(page)).button;
    await page.keyboard.press("Space");
    await wait(150);
    const after = (await snap(page)).button;
    const ok = before.label !== after.label
      && before.bg !== after.bg
      && before.pos !== after.pos
      && [before.label, after.label].sort().join("/") === "Buy/Sell";
    check("J_spacebar", ok, `${before.label} ${before.bg} to ${after.label} ${after.bg}`);

    // and the button says so where a keyboard is likely: a space keycap on
    // the wide viewport, and a clean button on the phone
    const hint = await page.evaluate(() => {
      const el = document.querySelector("[data-action] [data-key-hint]");
      if (!el) return null;
      return { text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) };
    });
    const wantHint = tag === "wide";
    check("J_desktop_keycap",
      wantHint ? hint !== null && hint.text === "space" && hint.size >= 12 : hint === null,
      wantHint
        ? (hint ? `keycap "${hint.text}" at ${hint.size}px on the button` : "no keycap on the desktop viewport")
        : (hint ? `keycap "${hint.text}" leaked onto the phone button` : "no keycap on phone, as specced"));
  }

  stage = "I_leh_seller_wins";
  // ---------------------------------------------------------------------- I
  await open(page, "era=gfc&stock=LEH&seed=7&turbo=6");
  await wait(200);
  await page.keyboard.press("Space");                    // in at the first month
  const bought = await page.getAttribute("[data-trigger]", "data-month");
  await untilMonth(page, "2008-05");
  await page.keyboard.press("Space");                    // out before September
  const sold = await page.getAttribute("[data-trigger]", "data-month");
  await toEnd(page);
  {
    const end = await page.evaluate(() => {
      const el = document.querySelector("[data-end]");
      return { you: Number(el.getAttribute("data-you")), holding: Number(el.getAttribute("data-holding")), text: el.textContent };
    });
    check("I_leh_seller_wins",
      sold < "2008-09" && end.you > end.holding && /The company went to zero\./.test(end.text),
      `bought ${bought}, sold ${sold}, you ${end.you.toFixed(0)} over doing nothing ${end.holding.toFixed(0)}`);
  }
  await page.screenshot({ path: `${OUT}trigger-end-${tag}.png` });
  const typeAtEnd = await page.evaluate(TYPE_AUDIT);
  check("K_type_on_end_card", typeAtEnd.length === 0, typeAtEnd.length ? typeAtEnd.slice(0, 4).join("; ") : "no banned type on the end card");

  // A forty five second loop has to be replayable the instant it ends: Play
  // again must be on screen with the page untouched, and the reveal list is
  // the only thing allowed to need scrolling.
  const landing = await page.evaluate(() => {
    const shell = document.querySelector("[data-trigger]");
    const list = document.querySelector("[data-reveal]");
    const again = document.querySelector("[data-again]");
    const same = document.querySelector("[data-same]");
    const fits = (el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && b.top >= -1 && b.bottom <= window.innerHeight + 1
        && b.left >= -1 && b.right <= window.innerWidth + 1;
    };
    return {
      pageScroll: shell.scrollTop,
      pageScrolls: shell.scrollHeight > shell.clientHeight + 1,
      again: again ? fits(again) : false,
      same: same ? fits(same) : false,
      againTop: again ? Math.round(again.getBoundingClientRect().top) : -1,
      viewport: window.innerHeight,
      listScrolls: list ? list.scrollHeight > list.clientHeight + 1 : false,
      listHeight: list ? Math.round(list.clientHeight) : 0,
      rows: list ? list.children.length : 0,
      wide: shell.scrollWidth > shell.clientWidth + 1,
    };
  });
  check("L_replay_without_scrolling",
    landing.again && landing.same && landing.pageScroll === 0 && !landing.pageScrolls && !landing.wide,
    `Play again at y=${landing.againTop} of ${landing.viewport} with the page unscrolled, ${landing.rows} reveal rows in a ${landing.listHeight}px list that ${landing.listScrolls ? "scrolls" : "fits"}`);

  // and the reveal list still reaches its last row
  const listEnd = await page.evaluate(() => {
    const list = document.querySelector("[data-reveal]");
    list.scrollTop = list.scrollHeight;
    const last = list.lastElementChild?.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    return {
      at: Math.round(list.scrollTop),
      lastVisible: last ? last.bottom <= box.bottom + 2 && last.top >= box.top - 2 : false,
    };
  });
  await wait(200);
  await page.screenshot({ path: `${OUT}trigger-end-${tag}-bottom.png` });
  check("L_reveal_scrolls_to_end", listEnd.lastVisible,
    `reveal list scrolled ${listEnd.at}px to its last headline`);

  stage = "P_bot_scaffold_runs";
  // ---------------------------------------------------------------------- P
  // The shipped scaffold, untouched. It trades at random, so the promises are
  // only these: the editor really opens with the scaffold, the run finishes
  // with no input, at least one trade lands, and the card credits the bot.
  {
    const source = await openBot(page, "era=covid&stock=AAPL&seed=3&turbo=30");
    await toEnd(page);
    const end = await page.evaluate(() => {
      const el = document.querySelector("[data-end]");
      return {
        trades: Number(el.getAttribute("data-trade-count")),
        you: Number(el.getAttribute("data-you")),
        text: el.textContent,
      };
    });
    const scaffolded = source.includes("max_shares_can_buy") && source.includes("function bot");
    check("P_bot_scaffold_runs",
      scaffolded && end.trades >= 1 && /Bot: \$/.test(end.text) && Number.isFinite(end.you),
      `${end.trades} trades, bot ended at ${end.you.toFixed(2)}${scaffolded ? "" : ", editor missing the scaffold"}`);
    await page.screenshot({ path: `${OUT}trigger-bot-end-${tag}.png` });
  }

  stage = "Q_bot_wrong_action_stops";
  // ---------------------------------------------------------------------- Q
  // One share more than the cash covers, asked in the first month. The run
  // must stop with the broken rule on screen and the tape frozen where it
  // broke: data-t must not move once the stopped card is up.
  {
    const bad = "function bot(prices, shares, cash) {\n  return { buy: max_shares_can_buy(prices, shares, cash) + 1 };\n}";
    await openBot(page, "era=covid&stock=AAPL&seed=3&turbo=6", bad);
    await page.waitForSelector("[data-bot-error]", { timeout: 15000 });
    const stop = await page.evaluate(() => {
      const el = document.querySelector("[data-bot-error]");
      const root = document.querySelector("[data-trigger]");
      return {
        message: el.getAttribute("data-bot-error"),
        phase: root.getAttribute("data-phase"),
        t: root.getAttribute("data-t"),
        text: el.textContent,
      };
    });
    await wait(400);
    const later = await page.getAttribute("[data-trigger]", "data-t");
    check("Q_bot_wrong_action_stops",
      stop.phase === "error" && /bought/.test(stop.message) && /covers at most/.test(stop.message)
        && later === stop.t && /The bot broke a rule/.test(stop.text) && /Edit bot/.test(stop.text),
      `stopped at t ${stop.t} with "${stop.message}"`);
    await page.screenshot({ path: `${OUT}trigger-bot-stop-${tag}.png` });
    const typeOnStop = await page.evaluate(TYPE_AUDIT);
    check("K_type_on_stopped_card", typeOnStop.length === 0,
      typeOnStop.length ? typeOnStop.slice(0, 4).join("; ") : "no banned type on the stopped card");

    // and code that does not parse never leaves the deal card
    await openBot(page, "era=covid&stock=AAPL&seed=3&turbo=6", "function bot(");
    await page.waitForSelector("[data-bot-compile-error]", { timeout: 15000 });
    const card = await page.evaluate(() => ({
      phase: document.querySelector("[data-trigger]").getAttribute("data-phase"),
      error: document.querySelector("[data-bot-compile-error]").textContent,
    }));
    check("Q_bot_compile_error_stays",
      card.phase === "deal" && /does not parse/.test(card.error),
      `still on the deal card: "${card.error.slice(0, 70)}"`);

    // the editor as a first visit opens it, scaffold and all, audited and
    // shot: the stored source is cleared first because the walk has been
    // feeding the editor deliberately broken bots
    await page.evaluate(() => localStorage.removeItem("trigger-bot"));
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("[data-start]", { timeout: 15000 });
    await page.click('[data-mode="bot"]');
    await page.waitForSelector("[data-bot-code]", { timeout: 15000 });
    await page.screenshot({ path: `${OUT}trigger-bot-editor-${tag}.png` });
    const typeInEditor = await page.evaluate(TYPE_AUDIT);
    check("K_type_in_editor", typeInEditor.length === 0,
      typeInEditor.length ? typeInEditor.slice(0, 4).join("; ") : "no banned type around the editor");
  }
}

// One browser per viewport. The tape pauses with the tab, correctly, so a page
// sharing a browser with another page can open in the background and never
// advance; an isolated browser has nothing to be behind.
for (const [tag, w, h] of [["wide", 1440, 950], ["phone", 390, 844]]) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  // The tape pauses with the tab, correctly, so a page that opens in the
  // background never advances and every timing check waits out its timeout.
  // The second viewport is the one that lands there, so bring it forward and
  // say so plainly if it will not come.
  await page.bringToFront();
  await page.goto(BASE);
  for (let i = 0; i < 20 && await page.evaluate(() => document.hidden); i++) {
    await page.bringToFront();
    await wait(100);
  }
  if (await page.evaluate(() => document.hidden)) {
    failures += 1;
    console.log(`FAIL  ${tag}   page stayed hidden, the tape cannot run`);
    await page.close();
    continue;
  }
  page.on("pageerror", (e) => { failures += 1; console.log(`FAIL  ${tag}   pageerror              ${e.message}`); });
  try {
    await run(page, tag);
  } catch (e) {
    failures += 1;
    console.log(`FAIL  ${tag}   walk crashed in ${stage}: ${e.message}`);
  }
  await page.close();
  await browser.close();
}

console.log(failures === 0
  ? "\nTRIGGER: all checks pass at 1440x950 and 390x844"
  : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
