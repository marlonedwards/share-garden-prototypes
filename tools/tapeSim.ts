// Headless harness for the shared tape engine. It asserts every invariant in
// docs/tape-shared.md section 7, one printed line each, and exits nonzero if
// any of them fails.
//
//   1  worth is unchanged across any trade at the instant of the trade
//   2  buying never spends more cash than exists, shares are always integers
//   3  the holding baseline equals a zero-trade run replayed through the engine
//   4  the perfect-timing baseline is never below the holding baseline
//   5  truth labels are a pure function of pool and series, same seed same run
//   6  every era pool yields a legal sample mix for 100 consecutive seeds
//   7  a series that reaches zero marks the company dead
//
// Invariants 5 and 6 need src/data/headlinePool.ts, which another author owns.
// While that file is missing they report SKIPPED and the same code paths are
// exercised against a fixture pool built here, so a break still shows up.
//
// Run it with: npx tsx tools/tapeSim.ts
//
// The repo carries no @types/node and needs none for one exit code.
declare const process: { exit(code: number): never };

import {
  ERA_IDS, EraId, INDEX_TICKER, RunConfig, RunState, Ticker,
  advanceTo, buy, canBuy, eraMonths, eraTickers, holdingBaseline, lastIndex,
  monthIndexOf, newRun, perfectBaseline, priceAt, replayHolding, sell,
  seriesOf, worthOf,
} from "../src/lib/tape/engine";
import {
  PooledHeadline, Slant, candidatesFor, forwardReturn, labelHeadline,
  sampleHeadlines,
} from "../src/lib/tape/headlines";

// ---------------------------------------------------------------- reporting

interface Check {
  n: number;
  title: string;
  fails: string[];
  notes: string[];
  skipped: boolean;
  reason: string;
}

const checks: Check[] = [];

function invariant(n: number, title: string): Check {
  const c: Check = { n, title, fails: [], notes: [], skipped: false, reason: "" };
  checks.push(c);
  return c;
}

function want(c: Check, ok: boolean, why: string): void {
  if (!ok && c.fails.length < 8) c.fails.push(why);
  else if (!ok) c.fails.push("");
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

// A relative comparison, because these are dollars carried in floats.
function near(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

const START_CASH = 1000;
const SPEED = 1.6;

function cfgFor(era: EraId, ticker: Ticker): RunConfig {
  return { era, tickers: [ticker], startCash: START_CASH, speed: SPEED };
}

// ------------------------------------------------- 1 and 2, trades and money

const c1 = invariant(1, "worth is unchanged across any trade");
const c2 = invariant(2, "cash is never overspent, shares are whole");

let tradesChecked = 0;

for (const era of ERA_IDS) {
  for (const ticker of eraTickers(era)) {
    let run: RunState = newRun(cfgFor(era, ticker));
    const end = lastIndex(run);
    for (let t = 0; t <= end; t += 0.37) {
      run = advanceTo(run, Math.min(t, end));
      // buy all, sell half, sell the rest, checking each side of every trade
      for (const move of ["buy-all", "sell-half", "sell-all", "buy-over"] as const) {
        const before = worthOf(run);
        const cashBefore = run.cash;
        const heldBefore = run.holdings[ticker];
        const after =
          move === "buy-all" ? buy(run, ticker)
          : move === "buy-over" ? buy(run, ticker, run.cash * 10)
          : move === "sell-half" ? sell(run, ticker, Math.floor(heldBefore / 2))
          : sell(run, ticker);
        if (after === run) continue;
        tradesChecked++;
        const now = worthOf(after);
        want(c1, near(before, now), `${era} ${ticker} ${move} at t=${t.toFixed(2)} worth ${before} to ${now}`);
        want(c2, after.cash >= 0, `${era} ${ticker} ${move} left cash ${after.cash}`);
        want(c2, Number.isInteger(after.holdings[ticker]), `${era} ${ticker} ${move} left ${after.holdings[ticker]} shares`);
        if (move.startsWith("buy")) {
          want(c2, after.cash <= cashBefore + 1e-12, `${era} ${ticker} ${move} raised cash`);
          const spent = cashBefore - after.cash;
          want(c2, spent <= cashBefore + 1e-12, `${era} ${ticker} ${move} spent ${spent} of ${cashBefore}`);
        }
        run = after;
      }
    }
  }
}
c1.notes.push(`${tradesChecked} trades across ${ERA_IDS.length} eras`);
c2.notes.push(`${tradesChecked} trades, cash never below zero`);

// --------------------------------------------------------- 3, holding replay

const c3 = invariant(3, "holding baseline equals the replayed run");
let replayed = 0;

for (const era of ERA_IDS) {
  for (const ticker of eraTickers(era)) {
    replayed++;
    const cfg = cfgFor(era, ticker);
    const played = replayHolding(cfg);
    const computed = holdingBaseline(newRun(cfg), ticker);
    want(c3, near(worthOf(played), computed),
      `${era} ${ticker} replay ${worthOf(played)} vs baseline ${computed}`);
    want(c3, played.trades.length <= 1, `${era} ${ticker} replay made ${played.trades.length} trades`);
    // a run that never trades at all is still exactly its starting cash
    const idle = advanceTo(newRun(cfg), lastIndex(newRun(cfg)));
    want(c3, near(worthOf(idle), START_CASH), `${era} ${ticker} idle run drifted to ${worthOf(idle)}`);
  }
}

c3.notes.push(`${replayed} era and ticker pairs replayed, idle runs hold at ${START_CASH}`);

// ------------------------------------------------------ 4, the perfect ceiling

const c4 = invariant(4, "perfect timing is never below holding");
let widest = 0;
let widestAt = "";

for (const era of ERA_IDS) {
  for (const ticker of eraTickers(era)) {
    const run = newRun(cfgFor(era, ticker));
    const perfect = perfectBaseline(run, ticker);
    const hold = holdingBaseline(run, ticker);
    want(c4, perfect >= hold - 1e-9 * Math.max(1, hold),
      `${era} ${ticker} perfect ${perfect} below holding ${hold}`);
    if (hold > 0 && perfect / hold > widest) {
      widest = perfect / hold;
      widestAt = `${era} ${ticker}`;
    }
  }
}
c4.notes.push(`widest ceiling is ${widestAt} at ${widest.toExponential(2)} times holding`);

// ----------------------------------------------------------------- 7, deaths

const c7 = invariant(7, "a series that reaches zero kills the company");

const DEAD: Array<[EraId, Ticker]> = [
  ["gfc", "LEH"], ["dotcom", "WCOM"], ["dotcom", "ETYS"], ["crypto", "BCC"],
];

for (const [era, ticker] of DEAD) {
  const values = seriesOf(era, ticker);
  const run = newRun(cfgFor(era, ticker));
  const death = run.death[ticker];
  want(c7, death !== null, `${era} ${ticker} never registered a death`);
  if (death === null) continue;
  want(c7, values[death] === 0, `${era} ${ticker} death month close is ${values[death]}`);
  want(c7, priceAt(run, ticker, death) === 0, `${era} ${ticker} prices above zero when dead`);
  want(c7, priceAt(run, ticker, lastIndex(run)) === 0, `${era} ${ticker} comes back to life`);

  // bought alive, then held through the death: the loss lands the moment the
  // close is zero, and nothing can be bought after
  const alive = Math.max(0, death - 2);
  const held = buy(advanceTo(run, alive), ticker);
  want(c7, held.holdings[ticker] > 0, `${era} ${ticker} could not be bought while alive`);
  const beforeDeath = worthOf(held);
  const dead = advanceTo(held, death);
  want(c7, near(worthOf(dead), dead.cash), `${era} ${ticker} worth ${worthOf(dead)} is not just cash ${dead.cash}`);
  want(c7, worthOf(dead) < beforeDeath, `${era} ${ticker} lost nothing when it died`);
  want(c7, !canBuy(dead, ticker), `${era} ${ticker} is still buyable when dead`);
  want(c7, buy(dead, ticker) === dead, `${era} ${ticker} accepted a trade when dead`);
  c7.notes.push(`${ticker} dies ${eraMonths(era)[death]}`);
}

// ---------------------------------------------------------- the pool, or not

const poolUrl = new URL("../src/data/headlinePool.ts", import.meta.url).href;
let pool: PooledHeadline[] | null = null;
try {
  const mod = await import(/* @vite-ignore */ poolUrl);
  const found = mod?.HEADLINE_POOL;
  if (Array.isArray(found)) pool = found as PooledHeadline[];
} catch {
  pool = null;
}

// A fixture pool built from the series themselves, so the labeling and
// sampling paths still run while the authored pool is missing. Every era gets
// entries that the data makes into signals, lies, and quiet months alike.
function fixturePool(): PooledHeadline[] {
  const out: PooledHeadline[] = [];
  for (const era of ERA_IDS) {
    const months = eraMonths(era);
    const subjects: string[] = ["market", ...eraTickers(era).slice(0, 3)];
    for (let m = 0; m < months.length; m += 2) {
      const subject = subjects[m % subjects.length];
      const r = forwardReturn(era, subject, m);
      const rises = (r ?? 0) > 0;
      const slants: Slant[] = ["up", "down", "steady"];
      for (const slant of slants) {
        const text =
          slant === "up" ? "Buyers step in early"
          : slant === "down" ? "Sellers keep the upper hand"
          : "The desk expects a quiet month";
        out.push({ era, month: months[m], about: subject, text, slant });
      }
      if (rises) out.push({ era, month: months[m], about: subject, text: "Confidence returns to the floor", slant: "up" });
    }
  }
  return out;
}

const usingFixture = pool === null;
const activePool = pool ?? fixturePool();

// ------------------------------------------------------- 5, labels are a rule

const c5 = invariant(5, "truth labels are pure, same seed same run");
if (usingFixture) {
  c5.skipped = true;
  c5.reason = "SKIPPED (pool not present yet), fixture pool exercised instead";
}

let labelsChecked = 0;
for (const entry of activePool) {
  const from = monthIndexOf(entry.era, entry.month);
  if (from < 0) continue;
  const to = entry.monthEnd ? monthIndexOf(entry.era, entry.monthEnd) : from;
  for (let m = from; m <= Math.max(from, to); m++) {
    const a = labelHeadline(entry, m);
    const b = labelHeadline(entry, m);
    labelsChecked++;
    want(c5, a === b, `${entry.era} ${entry.month} label flipped ${a} to ${b}`);
  }
}

for (const era of ERA_IDS) {
  const end = eraMonths(era).length - 1;
  for (const seed of [1, 7, 4242, 90210]) {
    const a = sampleHeadlines({ era, pool: activePool, seed, startIndex: 0, endIndex: end });
    const b = sampleHeadlines({ era, pool: activePool, seed, startIndex: 0, endIndex: end });
    want(c5, JSON.stringify(a) === JSON.stringify(b), `${era} seed ${seed} drew two different runs`);
    for (const item of a.items) {
      want(c5, !(("label" in (item as object)) || ("truth" in (item as object))),
        `${era} seed ${seed} leaked a label onto the play surface`);
      const direct = labelHeadline(
        { era, month: item.month, about: item.about, text: item.text, slant: item.slant },
        item.monthIndex,
      );
      want(c5, a.labels[item.id] === direct, `${era} seed ${seed} sample label disagrees with the rule`);
    }
  }
}
// The fallback path, forced: headlines about a company that is already at zero
// can only ever be noise, so no draw can reach the mix and the built sample
// takes over. It still has to be the same sample for the same seed.
const deadPool: PooledHeadline[] = eraMonths("gfc")
  .slice(monthIndexOf("gfc", "2009-01"))
  .map((month) => ({ era: "gfc" as EraId, month, about: "LEH", text: "The wind-down grinds on", slant: "steady" as Slant }));
const fa = sampleHeadlines({ era: "gfc", pool: deadPool, seed: 11, startIndex: monthIndexOf("gfc", "2009-01"), endIndex: eraMonths("gfc").length - 1 });
const fb = sampleHeadlines({ era: "gfc", pool: deadPool, seed: 11, startIndex: monthIndexOf("gfc", "2009-01"), endIndex: eraMonths("gfc").length - 1 });
want(c5, fa.fallback, "an all-noise pool did not reach the fallback");
want(c5, JSON.stringify(fa) === JSON.stringify(fb), "the fallback drew two different runs for one seed");

c5.notes.push(`${labelsChecked} labels, ${usingFixture ? "fixture" : "authored"} pool of ${activePool.length}`);
c5.notes.push(`fallback is deterministic on an all-noise pool of ${deadPool.length}`);

// ------------------------------------------------------- 6, the mix, 100 seeds

const c6 = invariant(6, "every era yields a legal mix for 100 seeds");
if (usingFixture) {
  c6.skipped = true;
  c6.reason = "SKIPPED (pool not present yet), fixture pool exercised instead";
}

for (const era of ERA_IDS) {
  const end = eraMonths(era).length - 1;
  const cands = candidatesFor(era, activePool, 0, end);
  let fallbacks = 0;
  let illegal = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const s = sampleHeadlines({ era, pool: activePool, seed, startIndex: 0, endIndex: end });
    if (s.fallback) fallbacks++;
    if (!s.mix.legal) {
      illegal++;
      want(c6, false, `${era} seed ${seed} mix ${s.mix.signal}s ${s.mix.lie}l ${s.mix.noise}n of ${s.mix.total}`);
    }
  }
  c6.notes.push(`${era} ${cands.length} in window, ${100 - illegal}/100 legal, ${fallbacks} by fallback`);
}

// ------------------------------------------------------------------- output

console.log(`tape sim, ${ERA_IDS.length} eras, pool ${usingFixture ? "missing" : `${activePool.length} entries`}`);
console.log("");

let failed = 0;
for (const c of checks.sort((a, b) => a.n - b.n)) {
  const bad = c.fails.filter((f) => f !== "").length;
  const status = c.skipped ? "SKIP" : bad > 0 ? "FAIL" : "PASS";
  if (!c.skipped && bad > 0) failed++;
  const tail = c.skipped ? c.reason : (c.notes[0] ?? "");
  console.log(`${status}  ${c.n}  ${pad(c.title, 46)}  ${tail}`);
  for (const note of c.notes.slice(c.skipped ? 0 : 1)) console.log(`         ${note}`);
  for (const f of c.fails) {
    if (f !== "") console.log(`         ${f}`);
  }
  if (bad > 8) console.log(`         and ${bad - 8} more`);
}

console.log("");
if (failed > 0) {
  console.log(`${failed} invariant${failed === 1 ? "" : "s"} failed`);
  process.exit(1);
}
const skipped = checks.filter((c) => c.skipped);
if (skipped.length > 0) {
  const bad = skipped.filter((c) => c.fails.some((f) => f !== ""));
  console.log(`all testable invariants pass, ${skipped.length} skipped until src/data/headlinePool.ts lands`);
  if (bad.length > 0) {
    console.log("the fixture run found breakage in the skipped paths, see the lines above");
    process.exit(1);
  }
} else {
  console.log("all seven invariants pass");
}
process.exit(0);
