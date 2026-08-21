// Headless harness for Monkey Trade's round rules. It asserts acceptance tests
// A, B, C, D, E and G from docs/monkey-spec.md section 14 against
// src/lib/monkey/round.ts, one printed line each, and exits nonzero if any of
// them fails. The tests that need a browser (F, H to N) belong to the walk.
//
//   A  same seed reproduces the window, the stocks and every dart and basket
//   B  every monkey buys whole shares, conserves worth, and walks a worth path
//      equal to a zero-trade engine run of its basket entered at its buy month
//   C  level 1 spreads ten buy months over the calendar, and a monkey that
//      bought in month one equals the engine's holding baseline to the cent
//   D  level 2's window carries the crash month, and selling everything at the
//      low finishes behind at least eight monkeys
//   E  level 3's board is every company alive at the window's open, a company
//      dying inside it is flagged, and three distinct wedges survive the death
//   G  beating five monkeys unlocks the next level and survives a reload
//
// It also prints the pinned deals tools/monkeycheck.mjs walks, between two
// markers, so the walk holds the live DOM against numbers computed here.
//
// Run it with: npx tsx tools/monkeySim.ts
//
// tools/tapeSim.ts owns the shared engine's seven invariants; nothing here
// touches src/lib/tape.

declare const process: { exit(code: number): never };

import {
  RunState, Ticker,
  advanceTo, buy, deathIndex, eraMonths, eraTickers, holdingBaseline, lastIndex,
  newRun, priceAt, sell, seriesOf, wholeShares, worthAt, worthOf,
} from "../src/lib/tape/engine";
import { listingIndexOf } from "../src/lib/floor/campaign";
import {
  BEST_KEY, Deal, LEVELS, LEVEL_IDS, LevelId, MONKEYS, Monkey, PROGRESS_KEY, START_CASH,
  allotmentOf, bestFor, clearSave, crashIndexOf, dealRound, deadLine, isUnlocked,
  lastMonthIndex, monkeyFinalWorth, monkeyLine, monkeyWorthAt, newPlayerRun, rank,
  readUnlocked, recordRound, runConfigFor,
} from "../src/lib/monkey/round";

// ---------------------------------------------------------------- reporting

interface Check {
  letter: string;
  title: string;
  fails: string[];
  notes: string[];
}

const checks: Check[] = [];

function check(letter: string, title: string): Check {
  const c: Check = { letter, title, fails: [], notes: [] };
  checks.push(c);
  return c;
}

function want(c: Check, ok: boolean, why: string): void {
  if (!ok) c.fails.push(why);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

// A cent, the tolerance every dollar comparison in the spec is written to.
const CENT = 0.005;

function near(a: number, b: number, tol = CENT): boolean {
  return Math.abs(a - b) <= tol;
}

function signatureOf(deal: Deal): string {
  return JSON.stringify({
    era: deal.era,
    start: deal.startIndex,
    end: deal.endIndex,
    tickers: deal.tickers,
    crash: deal.crashIndex,
    monkeys: deal.monkeys.map((m) => [m.index, m.darts, m.buyMonth, m.basket, Math.round(m.cashLeft * 100)]),
  });
}

function windowSignature(deal: Deal): string {
  return `${deal.era}:${deal.startIndex}:${deal.tickers.join(",")}`;
}

// ------------------------------------------------- A, a seed is the round

const cA = check("A", "a seed pins the window, the stocks and every dart");
const SEEDS = 160;

for (const level of LEVEL_IDS) {
  const sigs: string[] = [];
  const windows = new Set<string>();
  for (let seed = 1; seed <= SEEDS; seed++) {
    const once = dealRound(level, seed);
    const twice = dealRound(level, seed);
    want(cA, signatureOf(once) === signatureOf(twice), `level ${level} seed ${seed} dealt two different rounds`);
    want(cA, once.monkeys.length === MONKEYS, `level ${level} seed ${seed} dealt ${once.monkeys.length} monkeys`);
    want(cA, once.months.length === LEVELS[level].windowMonths, `level ${level} seed ${seed} window is ${once.months.length} months`);
    sigs.push(signatureOf(once));
    windows.add(windowSignature(once));
  }
  const distinct = new Set(sigs).size;
  let sameAsNeighbour = 0;
  for (let i = 1; i < sigs.length; i++) if (sigs[i] === sigs[i - 1]) sameAsNeighbour++;
  want(cA, distinct >= SEEDS - 2, `level ${level} only ${distinct} distinct rounds over ${SEEDS} seeds`);
  want(cA, sameAsNeighbour === 0, `level ${level} had ${sameAsNeighbour} neighbouring seeds deal the same round`);
  // level 2's window is fixed by the spec, so only the era and the three
  // stocks can vary there; levels 1 and 3 roll the window too.
  const wantWindows = level === 2 ? 4 : 12;
  want(cA, windows.size >= wantWindows, `level ${level} drew only ${windows.size} distinct window and stock sets`);
  cA.notes.push(`level ${level}: ${distinct}/${SEEDS} distinct rounds, ${windows.size} distinct window and stock sets`);
}

// -------------------------------------- B, whole shares, conservation, path

const cB = check("B", "monkey baskets are whole shares and their paths are engine runs");
const B_SEEDS = 50;
let pathsChecked = 0;
let monkeysChecked = 0;

// A zero-trade engine run of the same basket, built here rather than read from
// round.ts, entered at the monkey's buy month.
function replayMonkey(deal: Deal, monkey: Monkey): RunState {
  let run = newRun(runConfigFor(deal));
  if (monkey.buyMonth > 0) run = advanceTo(run, monkey.buyMonth);
  const allot = allotmentOf(deal, monkey);
  for (const ticker of deal.tickers) {
    if ((allot[ticker] ?? 0) > 0) run = buy(run, ticker, allot[ticker]);
  }
  return run;
}

for (const level of LEVEL_IDS) {
  for (let seed = 1; seed <= B_SEEDS; seed++) {
    const deal = dealRound(level, seed);
    const end = lastMonthIndex(deal);
    for (const monkey of deal.monkeys) {
      monkeysChecked++;
      const allot = allotmentOf(deal, monkey);
      let spent = 0;
      for (const ticker of deal.tickers) {
        const shares = monkey.basket[ticker] ?? 0;
        const priceThen = seriesOf(deal.era, ticker)[deal.startIndex + monkey.buyMonth];
        want(cB, Number.isInteger(shares), `level ${level} seed ${seed} monkey ${monkey.index} holds ${shares} shares of ${ticker}`);
        want(cB, shares >= 0, `level ${level} seed ${seed} monkey ${monkey.index} holds ${shares} shares of ${ticker}`);
        // the whole-share law written out here rather than borrowed: the buy
        // never costs more than the allotment, and one more share would
        const budget = allot[ticker] ?? 0;
        want(cB, shares * priceThen <= budget + 1e-9,
          `level ${level} seed ${seed} monkey ${monkey.index} spent ${shares * priceThen} of an allotment of ${budget} on ${ticker}`);
        want(cB, priceThen <= 0 || (shares + 1) * priceThen > budget + 1e-9,
          `level ${level} seed ${seed} monkey ${monkey.index} left ${budget - shares * priceThen} unspent on ${ticker} at ${priceThen}`);
        want(cB, priceThen > 0 || shares === 0,
          `level ${level} seed ${seed} monkey ${monkey.index} bought ${shares} of ${ticker} at ${priceThen}`);
        spent += shares * priceThen;
      }
      want(cB, monkey.cashLeft >= -1e-9, `level ${level} seed ${seed} monkey ${monkey.index} left ${monkey.cashLeft} cash`);
      want(cB, near(spent + monkey.cashLeft, START_CASH, 1e-9),
        `level ${level} seed ${seed} monkey ${monkey.index} conserved ${spent + monkey.cashLeft} of ${START_CASH}`);

      // the worth path against the replayed run, at the cent
      const replay = replayMonkey(deal, monkey);
      for (const ticker of deal.tickers) {
        want(cB, (replay.holdings[ticker] ?? 0) === (monkey.basket[ticker] ?? 0),
          `level ${level} seed ${seed} monkey ${monkey.index} replay holds ${replay.holdings[ticker]} of ${ticker}, deal says ${monkey.basket[ticker]}`);
      }
      want(cB, near(replay.cash, monkey.cashLeft), `level ${level} seed ${seed} monkey ${monkey.index} replay cash ${replay.cash} vs ${monkey.cashLeft}`);

      const samples = [monkey.buyMonth, monkey.buyMonth + 0.5, (monkey.buyMonth + end) / 2, end - 1, end, end + 3];
      for (const raw of samples) {
        const t = Math.max(monkey.buyMonth, Math.min(end, raw));
        pathsChecked++;
        want(cB, near(monkeyWorthAt(deal, monkey, t), worthAt(replay, t)),
          `level ${level} seed ${seed} monkey ${monkey.index} worth at t=${t} is ${monkeyWorthAt(deal, monkey, t)}, replay says ${worthAt(replay, t)}`);
      }
      // before its buy month a calendar monkey is a thousand dollars in cash
      for (let t = 0; t < monkey.buyMonth; t += 0.5) {
        want(cB, monkeyWorthAt(deal, monkey, t) === START_CASH,
          `level ${level} seed ${seed} monkey ${monkey.index} was worth ${monkeyWorthAt(deal, monkey, t)} at t=${t}, before buying`);
      }
    }
  }
}
cB.notes.push(`${monkeysChecked} monkeys over ${B_SEEDS} seeds a level, ${pathsChecked} worth samples to the cent`);

// ------------------------------------------------------ C, the calendar level

const cC = check("C", "level 1 spreads its buy months and month one is the baseline");
const C_SEEDS = 300;
let leanest = MONKEYS;

for (let seed = 1; seed <= C_SEEDS; seed++) {
  const deal = dealRound(1, seed);
  want(cC, deal.target === "calendar", `level 1 seed ${seed} threw at the ${deal.target}`);
  want(cC, deal.tickers.length === 1, `level 1 seed ${seed} dealt ${deal.tickers.length} stocks`);
  const ticker = deal.tickers[0];
  const openPrice = seriesOf(deal.era, ticker)[deal.startIndex];
  want(cC, listingIndexOf(deal.era, ticker) <= deal.startIndex,
    `level 1 seed ${seed} dealt ${ticker} before it listed`);
  want(cC, openPrice > 0 && openPrice <= START_CASH / 5,
    `level 1 seed ${seed} dealt ${ticker} at ${openPrice}, more than a fifth of the stake`);
  want(cC, seriesOf(deal.era, ticker)[deal.endIndex] > 0,
    `level 1 seed ${seed} dealt ${ticker}, which dies inside the window`);
  const months = new Set<number>();
  for (const monkey of deal.monkeys) {
    months.add(monkey.buyMonth);
    want(cC, monkey.darts.length === 1, `level 1 seed ${seed} monkey ${monkey.index} threw ${monkey.darts.length} darts`);
    want(cC, monkey.darts[0] === monkey.buyMonth, `level 1 seed ${seed} monkey ${monkey.index} bought off its dart`);
    want(cC, monkey.buyMonth >= 0 && monkey.buyMonth < deal.months.length,
      `level 1 seed ${seed} monkey ${monkey.index} bought in month ${monkey.buyMonth} of ${deal.months.length}`);
    want(cC, (monkey.basket[ticker] ?? 0) >= 1, `level 1 seed ${seed} monkey ${monkey.index} could not afford a share`);
    want(cC, Object.keys(monkey.basket).length === 1, `level 1 seed ${seed} monkey ${monkey.index} holds more than the one stock`);
  }
  want(cC, months.size >= 6, `level 1 seed ${seed} spread ten monkeys over only ${months.size} months`);
  if (months.size < leanest) leanest = months.size;

  // a monkey that bought in month one, built here, against the engine baseline
  const shares = wholeShares(START_CASH, openPrice);
  const first: Monkey = {
    index: 0, darts: [0], buyMonth: 0,
    basket: { [ticker]: shares },
    cashLeft: START_CASH - shares * openPrice,
  };
  const run = newPlayerRun(deal);
  const baseline = holdingBaseline(run, ticker);
  const worth = monkeyWorthAt(deal, first, lastMonthIndex(deal));
  want(cC, near(worth, baseline), `level 1 seed ${seed} month one monkey is ${worth}, the holding baseline is ${baseline}`);
  want(cC, near(worth, monkeyFinalWorth(deal, first)), `level 1 seed ${seed} final worth disagreed with the path`);
}
cC.notes.push(`${C_SEEDS} seeds, the leanest spread was ${leanest} distinct buy months of ten`);

// ------------------------------------------------------------- D, the crash

const cD = check("D", "level 2 carries the crash and selling at the low loses");
const D_SEEDS = 120;
const CRASH_MONTH: Record<string, string> = { gfc: "2008-10", covid: "2020-03" };
const eraSeen: Record<string, number> = {};
let worstBeat = MONKEYS;

// The panic seller, played through the engine: the same equal split every
// monkey buys, everything sold at the month the basket is worth least, and
// never bought back.
function sellAtTheLow(deal: Deal): number {
  const end = lastMonthIndex(deal);
  let opened = newPlayerRun(deal);
  const slice = START_CASH / deal.tickers.length;
  for (const ticker of deal.tickers) opened = buy(opened, ticker, slice);
  let low = worthAt(opened, 0);
  let at = 0;
  for (let i = 1; i <= end; i++) {
    const worth = worthAt(opened, i);
    if (worth < low) {
      low = worth;
      at = i;
    }
  }
  let sold = advanceTo(opened, at);
  for (const ticker of deal.tickers) sold = sell(sold, ticker);
  sold = advanceTo(sold, end);
  return worthOf(sold);
}

for (let seed = 1; seed <= D_SEEDS; seed++) {
  const deal = dealRound(2, seed);
  eraSeen[deal.era] = (eraSeen[deal.era] ?? 0) + 1;
  want(cD, deal.crashIndex !== null, `level 2 seed ${seed} found no crash month`);
  const crashMonth = deal.crashIndex === null ? "" : deal.months[deal.crashIndex];
  want(cD, crashMonth === CRASH_MONTH[deal.era],
    `level 2 seed ${seed} in ${deal.era} put the crash at ${crashMonth}, not ${CRASH_MONTH[deal.era]}`);
  want(cD, deal.tickers.length === 3, `level 2 seed ${seed} dealt ${deal.tickers.length} stocks`);
  for (const monkey of deal.monkeys) {
    want(cD, monkey.darts.length === 2, `level 2 seed ${seed} monkey ${monkey.index} threw ${monkey.darts.length} darts`);
  }

  const seller = sellAtTheLow(deal);
  const finals = deal.monkeys.map((m) => monkeyFinalWorth(deal, m));
  const ahead = finals.filter((w) => w > seller).length;
  want(cD, ahead >= 8, `level 2 seed ${seed} in ${deal.era}: selling at the low finished behind only ${ahead} monkeys`);
  if (ahead < worstBeat) worstBeat = ahead;
  const scored = rank(seller, finals);
  want(cD, scored.beaten === finals.filter((w) => w < seller).length, `level 2 seed ${seed} rank miscounted`);
  want(cD, scored.order.length === MONKEYS + 1, `level 2 seed ${seed} rank listed ${scored.order.length} slots`);
  for (let i = 1; i < scored.order.length; i++) {
    want(cD, scored.order[i - 1].worth >= scored.order[i].worth, `level 2 seed ${seed} rank came back out of order`);
  }
  // a tie goes to the monkey: matching a monkey exactly beats nobody, and the
  // monkey sits above you on the strip
  const tied = rank(finals[0], finals);
  want(cD, tied.beaten === finals.filter((w) => w < finals[0]).length, `level 2 seed ${seed} counted a tie as a win`);
  const meAt = tied.order.findIndex((slot) => slot.who === "you");
  const themAt = tied.order.findIndex((slot) => slot.who === 1);
  want(cD, themAt < meAt, `level 2 seed ${seed} put you above the monkey you tied`);
}
cD.notes.push(`${D_SEEDS} seeds, ${eraSeen["gfc"] ?? 0} in the crash and ${eraSeen["covid"] ?? 0} in the 2020s`);
cD.notes.push(`the low seller was behind at least ${worstBeat} of ten monkeys in every seed`);

// -------------------------------------------------------- E, the whole board

const cE = check("E", "level 3's board is the living companies and spreading survives a death");
const E_SEEDS = 120;
// five percent of the stake. The worst three wedge basket the dot-com file can
// deal is Cisco with WorldCom and eToys from March 2000, which finishes at
// $102.88, so a floor at fifty dollars is under every real outcome and still
// far above what going all in on the dying company leaves.
const SURVIVAL_FLOOR = START_CASH * 0.05;
let spreadSeen = 0;
let worstSpread = Infinity;
let deathSeeds = 0;

const dotcomTickers = eraTickers("dotcom");

for (let seed = 1; seed <= E_SEEDS; seed++) {
  const deal = dealRound(3, seed);
  // the board, recomputed here off the raw series
  const alive = dotcomTickers.filter((t) => seriesOf("dotcom", t)[deal.startIndex] > 0);
  want(cE, deal.tickers.join(",") === alive.join(","),
    `level 3 seed ${seed} dealt ${deal.tickers.join(",")} for a board of ${alive.join(",")}`);
  want(cE, deal.tickers.length >= 8, `level 3 seed ${seed} dealt a board of ${deal.tickers.length}`);

  const dying = deal.tickers.filter((t) => {
    const death = deathIndex(seriesOf("dotcom", t));
    return death !== null && death > deal.startIndex && death <= deal.endIndex;
  });
  want(cE, deal.dead.join(",") === dying.join(","),
    `level 3 seed ${seed} flagged ${deal.dead.join(",")} dead, the series say ${dying.join(",")}`);
  if (dying.length === 0) continue;
  deathSeeds++;

  for (const ticker of dying) {
    want(cE, deadLine(ticker).endsWith(" went to zero."), `level 3 seed ${seed} wrote "${deadLine(ticker)}"`);
    want(cE, seriesOf("dotcom", ticker)[deal.endIndex] === 0, `level 3 seed ${seed} says ${ticker} died and it did not`);
  }

  // every monkey whose three darts landed on three distinct wedges
  for (const monkey of deal.monkeys) {
    if (new Set(monkey.darts).size !== 3) continue;
    if (!monkey.darts.some((d) => dying.includes(deal.tickers[d]))) continue;
    spreadSeen++;
    const worth = monkeyFinalWorth(deal, monkey);
    if (worth < worstSpread) worstSpread = worth;
    want(cE, worth > 0, `level 3 seed ${seed} monkey ${monkey.index} spread across three wedges and finished at ${worth}`);
    want(cE, worth >= SURVIVAL_FLOOR,
      `level 3 seed ${seed} monkey ${monkey.index} spread across three wedges and finished at ${worth}, under the floor`);
    // and it beats going all in on the company that died
    for (const ticker of dying) {
      const open = seriesOf("dotcom", ticker)[deal.startIndex];
      const allIn = START_CASH - wholeShares(START_CASH, open) * open;
      want(cE, worth > allIn,
        `level 3 seed ${seed} monkey ${monkey.index} at ${worth} did not beat all in on ${ticker} at ${allIn}`);
    }
    want(cE, monkeyLine(deal, monkey, worth).startsWith(`Monkey ${monkey.index} sat on `),
      `level 3 seed ${seed} monkey ${monkey.index} line reads "${monkeyLine(deal, monkey, worth)}"`);
  }
}

// the same claim exhaustively, over every window the level can deal and every
// three wedge basket in it, so the floor is a fact about the data and not luck
let sweepWorst = Infinity;
let sweepDesc = "";
let combos = 0;
const dotcomMonths = eraMonths("dotcom").length;
for (let start = 0; start + 36 <= dotcomMonths; start++) {
  const end = start + 35;
  const board = dotcomTickers.filter((t) => seriesOf("dotcom", t)[start] > 0);
  const dying = board.filter((t) => {
    const death = deathIndex(seriesOf("dotcom", t));
    return death !== null && death > start && death <= end;
  });
  if (dying.length === 0) continue;
  for (let a = 0; a < board.length; a++) {
    for (let b = a + 1; b < board.length; b++) {
      for (let c = b + 1; c < board.length; c++) {
        const set = [board[a], board[b], board[c]];
        if (!set.some((t) => dying.includes(t))) continue;
        combos++;
        let cash = START_CASH;
        let held = 0;
        for (const ticker of set) {
          const values = seriesOf("dotcom", ticker);
          const shares = wholeShares(cash, values[start], START_CASH / 3);
          cash -= shares * values[start];
          held += shares * values[end];
        }
        const worth = cash + held;
        if (worth < sweepWorst) {
          sweepWorst = worth;
          sweepDesc = `${eraMonths("dotcom")[start]} ${set.join(" ")} at ${worth.toFixed(2)}`;
        }
      }
    }
  }
}
want(cE, sweepWorst >= SURVIVAL_FLOOR, `the worst three wedge basket in the file is ${sweepDesc}, under the floor`);
cE.notes.push(`${E_SEEDS} seeds, ${deathSeeds} windows with a death, ${spreadSeen} three wedge monkeys held against a floor of ${SURVIVAL_FLOOR}`);
cE.notes.push(`worst dealt three wedge basket ${worstSpread === Infinity ? "none" : worstSpread.toFixed(2)}, worst of all ${combos} in the file ${sweepDesc}`);

// ------------------------------------------------------------ G, the save

const cG = check("G", "beating five unlocks the next level and survives a reload");

// A localStorage the size of this test, and a reload is a second view of the
// same backing store.
const backing = new Map<string, string>();
function stubStore(): Storage {
  return {
    get length() { return backing.size; },
    clear: () => backing.clear(),
    getItem: (k: string) => (backing.has(k) ? (backing.get(k) as string) : null),
    key: (i: number) => Array.from(backing.keys())[i] ?? null,
    removeItem: (k: string) => { backing.delete(k); },
    setItem: (k: string, v: string) => { backing.set(k, String(v)); },
  } as Storage;
}

const globals = globalThis as unknown as { localStorage?: Storage };
want(cG, bestFor(1) === 0 && readUnlocked().join(",") === "1", "without a store the game did not fall back to level one only");

globals.localStorage = stubStore();
clearSave();

want(cG, isUnlocked(1), "level one was locked on a fresh store");
want(cG, !isUnlocked(2), "level two was open before anything was played");
want(cG, !isUnlocked(3), "level three was open before anything was played");

recordRound(1, 4);
want(cG, bestFor(1) === 4, `four beaten stored as ${bestFor(1)}`);
want(cG, !isUnlocked(2), "four beaten unlocked level two");
globals.localStorage = stubStore();   // a reload, same backing store
want(cG, bestFor(1) === 4, `four beaten did not survive the reload, read ${bestFor(1)}`);
want(cG, !isUnlocked(2), "four beaten unlocked level two after a reload");

recordRound(1, 5);
want(cG, bestFor(1) === 5, `five beaten stored as ${bestFor(1)}`);
want(cG, isUnlocked(2), "five beaten did not unlock level two");
want(cG, !isUnlocked(3), "five beaten on level one unlocked level three");
const rawProgress = backing.get(PROGRESS_KEY) ?? "";
want(cG, rawProgress.includes("2"), `the progress key reads ${rawProgress}`);
want(cG, (backing.get(BEST_KEY) ?? "").includes("5"), `the best key reads ${backing.get(BEST_KEY)}`);

globals.localStorage = stubStore();   // reload again
want(cG, isUnlocked(2), "the unlock did not survive a reload");
want(cG, bestFor(1) === 5, "the best rank did not survive a reload");

recordRound(1, 3);
want(cG, bestFor(1) === 5, `a worse round wrote the best back to ${bestFor(1)}`);
want(cG, isUnlocked(2), "a worse round locked level two again");

recordRound(2, 5);
want(cG, isUnlocked(3), "five beaten on level two did not unlock level three");
want(cG, readUnlocked().join(",") === "1,2,3", `unlocked reads ${readUnlocked().join(",")}`);

// a torn progress key never takes back an earned level
backing.set(PROGRESS_KEY, "not json");
want(cG, isUnlocked(2), "a torn progress key locked an earned level");

clearSave();
want(cG, !isUnlocked(2) && bestFor(1) === 0, "clearing the save left something behind");
delete globals.localStorage;
want(cG, readUnlocked().join(",") === "1", "the no window guard did not hold");
cG.notes.push("stub store, four then five then three on level one, five on level two, two reloads");

// ------------------------------------------------------------------ fixture

const fixture = {
  levels: LEVEL_IDS.map((l) => ({ level: l, months: LEVELS[l].windowMonths, speed: LEVELS[l].speed })),
  deals: [1, 2, 3].map((level) => {
    const deal = dealRound(level as LevelId, 7);
    return {
      level, seed: 7, era: deal.era,
      startMonth: deal.startMonth, endMonth: deal.endMonth,
      tickers: deal.tickers, dead: deal.dead,
      crashMonth: deal.crashIndex === null ? null : deal.months[deal.crashIndex],
      buyMonths: deal.monkeys.map((m) => m.buyMonth),
      finals: deal.monkeys.map((m) => Math.round(monkeyFinalWorth(deal, m) * 100) / 100),
    };
  }),
};

// ------------------------------------------------------------------- output

console.log("<<<FIXTURE");
console.log(JSON.stringify(fixture));
console.log("FIXTURE>>>");
console.log("");
console.log(`monkey sim, ${LEVEL_IDS.length} levels, ${MONKEYS} monkeys a round`);
console.log("");

let failed = 0;
for (const c of checks) {
  const status = c.fails.length > 0 ? "FAIL" : "PASS";
  if (c.fails.length > 0) failed++;
  console.log(`${status}  ${c.letter}  ${pad(c.title, 60)}  ${c.notes[0] ?? ""}`);
  for (const note of c.notes.slice(1)) console.log(`         ${note}`);
  for (const f of c.fails.slice(0, 8)) console.log(`         ${f}`);
  if (c.fails.length > 8) console.log(`         and ${c.fails.length - 8} more`);
}

console.log("");
if (failed > 0) {
  console.log(`${failed} acceptance test${failed === 1 ? "" : "s"} failed`);
  process.exit(1);
}
console.log("acceptance tests A, B, C, D, E and G pass");
process.exit(0);
