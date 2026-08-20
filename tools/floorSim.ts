// Headless harness for The Floor's campaign layer. It is the fixture side of
// docs/floor-spec.md's acceptance tests I and K: the baselines the debrief
// prints and the stars it awards are computed here a second time, straight off
// the baked JSON, and compared with what src/lib/floor/campaign.ts produces.
// It also prints the numbers as JSON between two markers, which
// tools/floorcheck.mjs reads back so the walk can hold the live DOM against a
// number this file computed rather than against itself. Printing rather than
// writing keeps this harness to the one file read the repo's tools/node-fs.d.ts
// declares, so no new node typings are needed for a fixture.
//
// Run it with: npx tsx tools/floorSim.ts
//
// tools/tapeSim.ts owns the shared engine's seven invariants and is not touched
// by anything here.

declare const process: { exit(code: number): never };

import {
  EraId, RunState, Ticker,
  advanceTo, buy, eraMonths, eraTickers, indexBaseline, lastIndex, maxShares, newRun,
  priceAt, sell, seriesOf, worthAt, worthOf,
} from "../src/lib/tape/engine";
import {
  CAMPAIGN_START, LADDER, LedgerRow, StarId,
  biggestOf, campaignHolding, campaignIndex, cheapestLive, compositeHolding, compositeIndex,
  isBroke, ladderMatchesData, ledgerCloses, ledgerFinal, realizedFrom, settleRun,
  starsFor, starsIn,
} from "../src/lib/floor/campaign";
import { GATES, gatesFor } from "../src/lib/floor/gates";

interface Check {
  name: string;
  fails: string[];
  notes: string[];
}

const checks: Check[] = [];

function check(name: string): Check {
  const c: Check = { name, fails: [], notes: [] };
  checks.push(c);
  return c;
}

function want(c: Check, ok: boolean, why: string): void {
  if (!ok) c.fails.push(why);
}

function near(a: number, b: number, tol = 0.005): boolean {
  return Math.abs(a - b) <= tol;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

// -------------------------------------------------- 1, the ladder is honest

const c1 = check("the ladder matches the baked data");
for (const problem of ladderMatchesData()) want(c1, false, problem);
c1.notes.push(LADDER.map((l) => `${l.era} ${l.months}mo at ${l.speed}`).join(", "));

// ------------------------------- 2, baselines recomputed off the raw series

// The composite holding baseline written a second time, deliberately without
// reusing compositeHolding, so agreement means something.
function holdingAgain(era: EraId, startCash: number): number {
  const tickers = eraTickers(era);
  const slice = startCash / tickers.length;
  let cash = startCash;
  let end = 0;
  for (const ticker of tickers) {
    const p = seriesOf(era, ticker);
    if (!(p[0] > 0)) continue;
    let shares = Math.floor(slice / p[0]);
    while (shares > 0 && shares * p[0] > slice) shares -= 1;
    cash -= shares * p[0];
    end += shares * p[p.length - 1];
  }
  return cash + end;
}

const c2 = check("era baselines agree with the raw series");
const fixture: Record<string, unknown> = { start: CAMPAIGN_START, eras: {} as Record<string, unknown> };

for (const level of LADDER) {
  const holding = compositeHolding(level.era, CAMPAIGN_START);
  const again = holdingAgain(level.era, CAMPAIGN_START);
  want(c2, near(holding, again), `${level.era} holding ${holding} vs ${again}`);

  // the index baseline is the engine's own, run on a fresh run of the era
  const run = newRun({ era: level.era, tickers: eraTickers(level.era), startCash: CAMPAIGN_START, speed: level.speed });
  const index = compositeIndex(level.era, CAMPAIGN_START);
  want(c2, near(index, indexBaseline(run)), `${level.era} index ${index} vs engine ${indexBaseline(run)}`);

  (fixture.eras as Record<string, unknown>)[level.era] = {
    months: eraMonths(level.era).length,
    holding: Number(holding.toFixed(2)),
    index: Number(index.toFixed(2)),
    idle: CAMPAIGN_START,
    tickers: eraTickers(level.era),
  };
}
c2.notes.push(LADDER.map((l) => `${l.era} hold ${compositeHolding(l.era, CAMPAIGN_START).toFixed(2)} index ${compositeIndex(l.era, CAMPAIGN_START).toFixed(2)}`).join(", "));

// ------------------------------------- 3, the campaign baselines chain right

const c3 = check("campaign baselines chain era by era");
{
  let hold = CAMPAIGN_START;
  let index = CAMPAIGN_START;
  for (const level of LADDER) {
    hold = compositeHolding(level.era, hold);
    index = compositeIndex(level.era, index);
  }
  want(c3, near(hold, campaignHolding()), `chained holding ${hold} vs ${campaignHolding()}`);
  want(c3, near(index, campaignIndex()), `chained index ${index} vs ${campaignIndex()}`);
  (fixture as Record<string, unknown>).campaign = {
    holding: Number(hold.toFixed(2)),
    index: Number(index.toFixed(2)),
  };
  c3.notes.push(`never trading ends at ${hold.toFixed(2)}, the index at ${index.toFixed(2)}`);
}

// ------------------------------------------------- 4, the stars at the edges

const c4 = check("stars are exact at their own boundaries");
{
  const base = { worth: 100, holding: 100, index: 100, minWorth: 100, openingWorth: 100 };
  want(c4, !starsFor(base).includes("couch"), "couch was earned at exactly the holding baseline");
  want(c4, starsFor({ ...base, worth: 100.01 }).includes("couch"), "couch was not earned a cent above holding");
  want(c4, starsFor({ ...base, worth: 90, index: 100 }).includes("pace"), "pace was not earned at exactly ninety percent");
  want(c4, !starsFor({ ...base, worth: 89.99, index: 100 }).includes("pace"), "pace was earned below ninety percent");
  want(c4, starsFor({ ...base, minWorth: 50 }).includes("alive"), "alive was not earned at exactly half");
  want(c4, !starsFor({ ...base, minWorth: 49.99 }).includes("alive"), "alive was earned below half");
  c4.notes.push("six boundary cases");
}

// --------------------------------- 5, three canned trade logs, real numbers

// Each log is played through the engine on the crash era and its stars are
// worked out here from the run's own numbers, then handed to starsFor.
interface Canned {
  name: string;
  play: (run: RunState) => RunState;
  expect: StarId[];
}

function playLog(era: EraId, speed: number, play: (r: RunState) => RunState): {
  worth: number; minWorth: number; stars: StarId[]; holding: number; index: number; run: RunState;
} {
  const start = newRun({ era, tickers: eraTickers(era), startCash: CAMPAIGN_START, speed });
  const run = play(start);
  const end = lastIndex(run);
  let minWorth = Infinity;
  for (let m = 0; m <= end; m++) minWorth = Math.min(minWorth, worthAt(run, m));
  const worth = worthAt(run, end);
  const holding = compositeHolding(era, CAMPAIGN_START);
  const index = compositeIndex(era, CAMPAIGN_START);
  return {
    worth, minWorth, holding, index, run,
    stars: starsFor({ worth, holding, index, minWorth, openingWorth: CAMPAIGN_START }),
  };
}

const c5 = check("three canned trade logs award the right stars");

const CANNED: Canned[] = [
  // Never trade: the money never moves, so it never halves, and nothing else
  // can be earned sitting in cash through a decade of growth.
  { name: "sat in cash", play: (r) => advanceTo(r, lastIndex(r)), expect: ["alive"] },
  // All in on Apple on the first month of the crash era and never touched.
  { name: "all in on Apple", play: (r) => advanceTo(buy(r, "AAPL"), lastIndex(r)), expect: ["couch", "pace", "alive"] },
  // All in on Lehman Brothers, held to zero.
  { name: "all in on Lehman", play: (r) => advanceTo(buy(r, "LEH"), lastIndex(r)), expect: [] },
];

for (const canned of CANNED) {
  const out = playLog("gfc", 1.2, canned.play);
  const got = out.stars.join(",");
  want(c5, got === canned.expect.join(","), `${canned.name} earned [${got}], expected [${canned.expect.join(",")}]`);
  c5.notes.push(`${pad(canned.name, 18)} worth ${out.worth.toFixed(2)}, low ${out.minWorth.toFixed(2)}, stars [${got}]`);
}
(fixture as Record<string, unknown>).canned = CANNED.map((canned) => {
  const out = playLog("gfc", 1.2, canned.play);
  return {
    name: canned.name,
    worth: Number(out.worth.toFixed(2)),
    minWorth: Number(out.minWorth.toFixed(2)),
    stars: out.stars,
  };
});

// ---------------------------------------------- 6, settlement and the ledger

const c6 = check("settlement carries exactly, the ledger closes");
{
  let cash = CAMPAIGN_START;
  const ledger: LedgerRow[] = [];
  for (const level of LADDER) {
    const start = newRun({ era: level.era, tickers: eraTickers(level.era), startCash: cash, speed: level.speed });
    // buy the first tradeable name, hold it, and let the era settle it back
    const played = advanceTo(buy(start, start.tickers[0]), lastIndex(start));
    const settled = settleRun(played);
    const end = lastIndex(played);
    want(c6, near(settled.cash, worthAt(played, end)), `${level.era} settled to ${settled.cash} but was worth ${worthAt(played, end)}`);
    for (const ticker of settled.tickers) {
      want(c6, (settled.holdings[ticker] ?? 0) === 0, `${level.era} still holds ${ticker} after settling`);
    }
    ledger.push({
      era: level.era,
      title: level.title,
      entered: cash,
      left: settled.cash,
      stars: [],
    });
    cash = settled.cash;
  }
  want(c6, ledgerCloses(ledger), "the ledger's rows do not chain");
  want(c6, near(ledgerFinal(ledger), cash), `the ledger ends at ${ledgerFinal(ledger)} but the campaign holds ${cash}`);
  want(c6, starsIn(ledger) === 0, "a starless ledger counted stars");
  c6.notes.push(`buying the first name each era carries ${CAMPAIGN_START} to ${cash.toFixed(2)}`);
}

// --------------------------------------------- 7, the realized ledger, FIFO

const c7 = check("realized moves close the oldest shares first");
{
  const start = newRun({ era: "gfc", tickers: eraTickers("gfc"), startCash: CAMPAIGN_START, speed: 1.2 });
  let run = buy(start, "AAPL", 400);           // about 4 shares near $85
  run = advanceTo(run, 24);
  run = buy(run, "AAPL", 400);                 // more, at a different price
  run = advanceTo(run, lastIndex(run));
  const settled = settleRun(run);
  const realized = realizedFrom(settled.trades, "gfc");
  want(c7, realized.length === 1, `expected one closing sell, got ${realized.length}`);
  const bought = settled.trades.filter((t) => t.kind === "buy");
  const cost = bought.reduce((n, t) => n + t.shares * t.price, 0);
  const sold = settled.trades.filter((t) => t.kind === "sell").reduce((n, t) => n + t.shares * t.price, 0);
  want(c7, near(realized.reduce((n, r) => n + r.dollars, 0), sold - cost, 0.01),
    `realized ${realized.reduce((n, r) => n + r.dollars, 0)} does not equal ${sold - cost}`);

  // a company that dies is a real realized loss, not a rounding hole
  let dead = buy(newRun({ era: "gfc", tickers: eraTickers("gfc"), startCash: CAMPAIGN_START, speed: 1.2 }), "LEH");
  dead = advanceTo(dead, lastIndex(dead));
  const deadRealized = realizedFrom(settleRun(dead).trades, "gfc");
  const { loss } = biggestOf(deadRealized);
  want(c7, loss !== null && loss.ticker === "LEH", "Lehman going to zero did not register a loss");
  want(c7, loss !== null && loss.dollars < -1500, `Lehman's loss came out at ${loss?.dollars}`);
  c7.notes.push(`Lehman closes at ${loss?.dollars.toFixed(2)} on ${loss?.shares} shares`);
}

// ---------------------------------------------------------------- 8, broke

const c8 = check("broke is no live holdings and not one cheap share");
{
  const start = newRun({ era: "gfc", tickers: eraTickers("gfc"), startCash: CAMPAIGN_START, speed: 1.2 });
  want(c8, !isBroke(start), "a fresh era with two thousand dollars read as broke");
  const spent: RunState = { ...start, cash: 0 };
  want(c8, isBroke(spent), "no cash and no shares did not read as broke");
  const holding = buy(start, "F");
  want(c8, !isBroke({ ...holding, cash: 0 }), "holding shares read as broke");

  // shares in a company that reached zero are a hole, not a holding
  let lehman = buy(start, "LEH");
  lehman = advanceTo(lehman, lastIndex(lehman));
  want(c8, priceAt(lehman, "LEH") === 0, "Lehman still prices above zero at the end of the era");
  want(c8, isBroke({ ...lehman, cash: 0 }), "worthless Lehman shares counted as holdings");
  c8.notes.push(`the cheapest live share on the first month of the crash is ${cheapestLive(start).toFixed(2)}`);
}

// ------------------------------------------------------- 9, the gate content

const c9 = check("every gate lands on a real month of its own era");
for (const gate of GATES) {
  const months = eraMonths(gate.era);
  const at = months.indexOf(gate.month);
  want(c9, at >= 0, `${gate.id} sits at ${gate.month}, which is not in ${gate.era}`);
  for (const choice of gate.choices) {
    if (choice.act.kind === "buy" || choice.act.kind === "sell") {
      want(c9, eraTickers(gate.era).includes(choice.act.ticker as Ticker),
        `${gate.id} trades ${choice.act.ticker}, which ${gate.era} does not carry`);
    }
  }
  if (gate.watch !== "market") {
    want(c9, eraTickers(gate.era).includes(gate.watch as Ticker), `${gate.id} watches ${gate.watch}, which ${gate.era} does not carry`);
  }
}
for (const level of LADDER) {
  const n = gatesFor(level.era).length;
  want(c9, n >= 2 && n <= 3, `${level.era} has ${n} gates, the spec allows two or three`);
}
c9.notes.push(`${GATES.length} gates across ${LADDER.length} eras, all real archived headlines`);
(fixture as Record<string, unknown>).gates = GATES.map((g) => ({ id: g.id, era: g.era, month: g.month, monthIndex: eraMonths(g.era).indexOf(g.month) }));

// -------------------------------------------- 10, a trade never changes worth

const c10 = check("a desk trade never changes worth at the instant");
{
  let checked = 0;
  for (const level of LADDER) {
    let run = newRun({ era: level.era, tickers: eraTickers(level.era), startCash: CAMPAIGN_START, speed: level.speed });
    const end = lastIndex(run);
    for (let t = 0; t <= end; t += 7) {
      run = advanceTo(run, Math.min(t, end));
      for (const ticker of run.tickers) {
        // Buy 5 is the desk button, which the page disables unless five are
        // affordable, so the fixture only asks for five when five are there.
        if (maxShares(run, ticker) < 5) continue;
        const before = worthOf(run);
        const five = buy(run, ticker, 5 * priceAt(run, ticker));
        if (five !== run) {
          checked++;
          want(c10, Math.abs(worthOf(five) - before) < 1e-6, `${level.era} ${ticker} buy 5 moved worth by ${worthOf(five) - before}`);
          want(c10, five.holdings[ticker] - run.holdings[ticker] === 5, `${level.era} ${ticker} buy 5 moved ${five.holdings[ticker] - run.holdings[ticker]} shares`);
          const back = sell(five, ticker, 5);
          want(c10, Math.abs(worthOf(back) - before) < 1e-6, `${level.era} ${ticker} sell 5 moved worth by ${worthOf(back) - before}`);
          run = back;
        }
      }
    }
  }
  c10.notes.push(`${checked} five share round trips across every era`);
}

// ------------------------------------------------------------------- output

console.log("<<<FIXTURE");
console.log(JSON.stringify(fixture));
console.log("FIXTURE>>>");
console.log("");
console.log(`floor sim, ${LADDER.length} eras, ${GATES.length} gates`);
console.log("");

let failed = 0;
for (const c of checks) {
  const status = c.fails.length > 0 ? "FAIL" : "PASS";
  if (c.fails.length > 0) failed++;
  console.log(`${status}  ${pad(c.name, 50)}  ${c.notes[0] ?? ""}`);
  for (const note of c.notes.slice(1)) console.log(`        ${note}`);
  for (const f of c.fails.slice(0, 8)) console.log(`        ${f}`);
  if (c.fails.length > 8) console.log(`        and ${c.fails.length - 8} more`);
}

console.log("");
if (failed > 0) {
  console.log(`${failed} check${failed === 1 ? "" : "s"} failed`);
  process.exit(1);
}
console.log("all campaign checks pass");
process.exit(0);
