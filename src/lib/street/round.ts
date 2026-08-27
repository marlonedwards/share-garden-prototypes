// Wall Street: the hand, the impulse monkey, the target, the summary.
// Contract: docs/street-spec.md. Pure TypeScript over the tape engine and
// the monkey3 sampler; the page owns the clock and the wall.

import type { EraId, RunState, Ticker, Trade } from "../tape/engine";
import { loadEra, newRun, wholeShares, worthAt } from "../tape/engine";
import { mulberry32 } from "../tape/headlines";
import {
  HAND_ERAS, PRICE_MAX, PRICE_MIN, WINDOW_MONTHS, deskFloorOf, deskSizeOf,
  eligibleAt, randomSeed, windowKey,
} from "../monkey3/round";
import type { Level } from "../monkey3/round";

export type { Level } from "../monkey3/round";
export { WINDOW_MONTHS, randomSeed, windowKey } from "../monkey3/round";

export const START_CASH = 1000;
export const SPEED = 0.4;                  // months a second, 30s a hand
export const BUY_CHUNK = 250;
export const BLOCK_DOLLARS = 25;
export const HANDS_PER_SUMMARY = 5;

// The target is a fraction of the riding line so no deal is unwinnable:
// holding clears it, only churn falls under it.
export const TARGET_FACTOR: Record<Level, number> = { 1: 0.9, 2: 0.95, 3: 0.98 };

// A monkey move: out of `from`, all in on `to`. Null is cash.
export interface MonkeyMove {
  month: number;
  from: Ticker | null;
  to: Ticker | null;
}

export interface StreetHand {
  level: Level;
  seed: number;
  era: EraId;
  startIndex: number;
  startMonth: string;
  endMonth: string;
  tickers: Ticker[];
  monkeyStart: Ticker;
  monkeyMoves: MonkeyMove[];
  target: number;
}

// ------------------------------------------------------------- the sampler

export function dealHand(level: Level, seed: number, used: Set<string>): StreetHand {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 800; attempt++) {
    const era = HAND_ERAS[Math.floor(rng() * HAND_ERAS.length)];
    const months = loadEra(era).months;
    const startIndex = Math.floor(rng() * (months.length - WINDOW_MONTHS));
    const key = windowKey(era, startIndex);
    if (attempt < 400 && used.has(key)) continue;
    const eligible = eligibleAt(era, startIndex);
    if (eligible.length < deskFloorOf(level)) continue;
    const pool = [...eligible];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const tickers = pool.slice(0, deskSizeOf(level));
    const monkeyStart = tickers[Math.floor(rng() * tickers.length)];

    // Two or three impulse moves at distinct months, 2 to 10. Level 1 can
    // only toggle out and back in; higher levels hop between stocks.
    const count = 2 + (rng() < 0.5 ? 1 : 0);
    const monthsUsed = new Set<number>();
    while (monthsUsed.size < count) monthsUsed.add(2 + Math.floor(rng() * 9));
    const moveMonths = [...monthsUsed].sort((a, b) => a - b);
    const monkeyMoves: MonkeyMove[] = [];
    let held: Ticker | null = monkeyStart;
    for (const m of moveMonths) {
      let to: Ticker | null;
      if (held === null) {
        to = tickers[Math.floor(rng() * tickers.length)];
      } else if (level === 1) {
        to = null;
      } else {
        const others = tickers.filter((t) => t !== held);
        to = rng() < 0.2 ? null : others[Math.floor(rng() * others.length)];
      }
      monkeyMoves.push({ month: m, from: held, to });
      held = to;
    }

    const hand: StreetHand = {
      level, seed, era, startIndex,
      startMonth: months[startIndex],
      endMonth: months[startIndex + WINDOW_MONTHS],
      tickers, monkeyStart, monkeyMoves,
      target: 0,
    };
    hand.target = Math.round(ridingLine(hand) * TARGET_FACTOR[level]);
    return hand;
  }
  throw new Error("no dealable window");
}

export function newHandRun(hand: StreetHand): RunState {
  return newRun({
    era: hand.era,
    tickers: hand.tickers,
    startCash: START_CASH,
    speed: SPEED,
    startMonth: hand.startMonth,
    endMonth: hand.endMonth,
  });
}

// ---------------------------------------------------------------- prices

export function windowPrices(hand: StreetHand, ticker: Ticker): number[] {
  return loadEra(hand.era).series[ticker]
    .slice(hand.startIndex, hand.startIndex + WINDOW_MONTHS + 1)
    .map((v) => (v === null || !Number.isFinite(v) ? 0 : (v as number)));
}

function smoothPrice(prices: number[], t: number): number {
  const last = prices.length - 1;
  const tt = t < 0 ? 0 : t > last ? last : t;
  const m = Math.floor(tt);
  if (m >= last) return prices[last];
  const f = tt - m;
  const s = f * f * (3 - 2 * f);
  return prices[m] + (prices[m + 1] - prices[m]) * s;
}

// -------------------------------------------------------- the riding line

// Equal split across the desk at the open, held to the settle. The stable
// comparator, and the base the target is cut from.
export function ridingLine(hand: StreetHand): number {
  let cash = START_CASH;
  let worth = 0;
  const budget = START_CASH / hand.tickers.length;
  for (const t of hand.tickers) {
    const p = windowPrices(hand, t);
    if (!(p[0] > 0)) continue;
    const n = wholeShares(cash, p[0], budget);
    cash -= n * p[0];
    worth += n * p[WINDOW_MONTHS];
  }
  return worth + cash;
}

// ------------------------------------------------------------- the monkey

interface MonkeyState {
  cash: number;
  held: Ticker | null;
  shares: number;
}

// Month-by-month replay of the monkey's fixed rule: all in at the open,
// then each impulse move sells everything and goes all in on the next
// thing, whole shares, at that month's close.
export function monkeyStates(hand: StreetHand): MonkeyState[] {
  const out: MonkeyState[] = [];
  let cash = START_CASH;
  let held: Ticker | null = null;
  let shares = 0;
  const enter = (ticker: Ticker, month: number) => {
    const p = windowPrices(hand, ticker)[month];
    if (!(p > 0)) { held = null; shares = 0; return; }
    const n = wholeShares(cash, p);
    held = ticker; shares = n; cash -= n * p;
  };
  for (let m = 0; m <= WINDOW_MONTHS; m++) {
    if (m === 0) enter(hand.monkeyStart, 0);
    const move = hand.monkeyMoves.find((mv) => mv.month === m);
    if (move) {
      if (held) {
        const p = windowPrices(hand, held)[m];
        cash += shares * p;
        held = null; shares = 0;
      }
      if (move.to) enter(move.to, m);
    }
    out.push({ cash, held, shares });
  }
  return out;
}

export function monkeyWorthAt(hand: StreetHand, t: number): number {
  const states = monkeyStates(hand);
  const m = Math.max(0, Math.min(WINDOW_MONTHS, Math.floor(t)));
  const s = states[m];
  if (!s.held) return s.cash;
  return s.cash + s.shares * smoothPrice(windowPrices(hand, s.held), t);
}

export function monkeyFinalWorth(hand: StreetHand): number {
  return monkeyWorthAt(hand, WINDOW_MONTHS);
}

// One phrase per move, for the announcement line and the walk.
export function moveLine(hand: StreetHand, move: MonkeyMove): string {
  const letter = (t: Ticker) => String.fromCharCode(65 + hand.tickers.indexOf(t));
  if (move.from && move.to) return `Monkey sold ${letter(move.from)}, all in on ${letter(move.to)}.`;
  if (move.from) return `Monkey sold ${letter(move.from)}, went to cash.`;
  if (move.to) return `Monkey went all in on ${letter(move.to)}.`;
  return "Monkey sat still.";
}

// ------------------------------------------------------------- the result

export interface StreetResult {
  level: Level;
  seed: number;
  era: EraId;
  startMonth: string;
  endMonth: string;
  tickers: Ticker[];
  monkeyStart: Ticker;
  monkeyMoves: MonkeyMove[];
  target: number;
  you: number;
  monkey: number;
  riding: number;
  cleared: boolean;
  win: boolean;                        // strictly better; a tie is not a win
  trades: Trade[];
  prices: Record<Ticker, number[]>;
  finalHoldings: Record<Ticker, number>;
}

export function settleHand(hand: StreetHand, run: RunState): StreetResult {
  const you = Math.round(worthAt(run, WINDOW_MONTHS));
  const monkey = Math.round(monkeyFinalWorth(hand));
  const prices: Record<Ticker, number[]> = {};
  for (const t of hand.tickers) prices[t] = run.prices[t];
  return {
    level: hand.level,
    seed: hand.seed,
    era: hand.era,
    startMonth: hand.startMonth,
    endMonth: hand.endMonth,
    tickers: hand.tickers,
    monkeyStart: hand.monkeyStart,
    monkeyMoves: hand.monkeyMoves,
    target: hand.target,
    you,
    monkey,
    riding: Math.round(ridingLine(hand)),
    cleared: you >= hand.target,
    win: you > monkey,
    trades: [...run.trades],
    prices,
    finalHoldings: { ...run.holdings },
  };
}

// -------------------------------------------------------------- the copy

// A copy is a player trade in the same stock, same direction, within one
// month after a monkey move. Positive cost means copying lost money.
export interface CopyReport {
  count: number;
  cost: number;
}

function endPrice(r: StreetResult, t: Ticker): number {
  const p = r.prices[t];
  return p ? p[p.length - 1] : 0;
}

export function copyReport(r: StreetResult): CopyReport {
  let count = 0;
  let cost = 0;
  for (const tr of r.trades) {
    const copied = r.monkeyMoves.some((mv) => {
      const bought = tr.kind === "buy" && mv.to === tr.ticker;
      const sold = tr.kind === "sell" && mv.from === tr.ticker;
      return (bought || sold) && tr.at >= mv.month && tr.at <= mv.month + 1;
    });
    if (!copied) continue;
    count++;
    cost += tr.kind === "buy"
      ? tr.shares * (tr.price - endPrice(r, tr.ticker))
      : tr.shares * (endPrice(r, tr.ticker) - tr.price);
  }
  return { count, cost: Math.round(cost) };
}

// ------------------------------------------------------------ the bullets

const FIRES_AT = 10;

function sellsGaveUp(results: StreetResult[]): number {
  let sum = 0;
  for (const r of results)
    for (const tr of r.trades)
      if (tr.kind === "sell") sum += tr.shares * (endPrice(r, tr.ticker) - tr.price);
  return Math.round(sum);
}

function panicCost(results: StreetResult[]): number {
  let sum = 0;
  for (const r of results)
    for (const tr of r.trades) {
      if (tr.kind !== "sell") continue;
      const m = Math.floor(tr.at);
      const p = r.prices[tr.ticker];
      if (!p || m < 1 || !(p[m - 1] > 0)) continue;
      if (p[m] / p[m - 1] - 1 <= -0.06)
        sum += tr.shares * (endPrice(r, tr.ticker) - tr.price);
    }
  return Math.round(sum);
}

function peakCost(results: StreetResult[]): number {
  let sum = 0;
  for (const r of results)
    for (const tr of r.trades) {
      if (tr.kind !== "buy") continue;
      const p = r.prices[tr.ticker];
      if (!p) continue;
      if (tr.price >= 0.95 * Math.max(...p))
        sum += tr.shares * (tr.price - endPrice(r, tr.ticker));
    }
  return Math.round(sum);
}

function concentrationGap(results: StreetResult[]): number {
  let gap = 0;
  for (const r of results) {
    if (r.level === 1) continue;
    const values = r.tickers.map((t) => (r.finalHoldings[t] ?? 0) * endPrice(r, t));
    const total = values.reduce((a, b) => a + b, 0);
    if (total > 0 && Math.max(...values) >= 0.8 * r.you && r.riding > r.you)
      gap += r.riding - r.you;
  }
  return Math.round(gap);
}

function satOutGap(results: StreetResult[]): number {
  let gap = 0;
  for (const r of results)
    if (!r.trades.some((t) => t.kind === "buy") && r.riding > r.you) gap += r.riding - r.you;
  return Math.round(gap);
}

function bestTrade(results: StreetResult[]): number {
  let best = 0;
  for (const r of results)
    for (const tr of r.trades)
      if (tr.kind === "buy")
        best = Math.max(best, tr.shares * (endPrice(r, tr.ticker) - tr.price));
  return Math.round(best);
}

export function bulletsFor(results: StreetResult[]): string[] {
  const out: string[] = [];
  const copies = results.map(copyReport).reduce(
    (a, c) => ({ count: a.count + c.count, cost: a.cost + c.cost }),
    { count: 0, cost: 0 },
  );
  if (copies.count > 0 && Math.abs(copies.cost) >= FIRES_AT)
    out.push(copies.cost > 0
      ? `You copied the monkey ${copies.count} ${copies.count === 1 ? "time" : "times"}; it cost $${copies.cost}.`
      : `Copying the monkey paid $${-copies.cost} this time. It usually does not.`);
  const sells = sellsGaveUp(results);
  const panic = panicCost(results);
  const peak = peakCost(results);
  const conc = concentrationGap(results);
  const sat = satOutGap(results);
  if (sells >= FIRES_AT) out.push(`Your sells gave up $${sells} against holding to the settle.`);
  else if (sells <= -FIRES_AT) out.push(`Your sells dodged $${-sells} of losses.`);
  if (panic >= FIRES_AT) out.push(`Selling right after drops cost $${panic}.`);
  if (peak >= FIRES_AT) out.push(`Buying near the top cost $${peak}.`);
  if (conc >= FIRES_AT) out.push(`Riding one stock left $${conc} on the table against spreading out.`);
  if (sat >= FIRES_AT) out.push(`Sitting in cash gave up $${sat}.`);
  const you = results.reduce((a, r) => a + r.you, 0);
  const monkey = results.reduce((a, r) => a + r.monkey, 0);
  const riding = results.reduce((a, r) => a + r.riding, 0);
  if (out.length < 3)
    out.push(riding > you
      ? `Riding everything untouched would have finished $${riding - you} ahead of you.`
      : `You finished $${you - riding} ahead of just riding everything.`);
  if (out.length < 3)
    out.push(monkey > you
      ? `The monkey's ${results.length} hands made $${monkey - you} more than yours.`
      : `Your ${results.length} hands made $${you - monkey} more than the monkey's.`);
  if (out.length < 3) {
    const best = bestTrade(results);
    if (best >= FIRES_AT) out.push(`Your best buy grew $${best} by the settle.`);
  }
  if (out.length < 3) {
    const margin = results.reduce((a, r) => a + (r.you - r.target), 0);
    out.push(margin >= 0
      ? `You finished $${margin} over the target line.`
      : `You finished $${-margin} under the target line.`);
  }
  return out.slice(0, 3);
}

// ------------------------------------------------------------ persistence

export interface Progress {
  unlocked: Level;
  wins: number;
  hands: number;
  streak: number;
}

const KEY = "street-progress";

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p && p.unlocked >= 1) return p;
    }
  } catch {
    // fresh start
  }
  return { unlocked: 1, wins: 0, hands: 0, streak: 0 };
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage may be unavailable; the session still plays
  }
}

export function afterHand(p: Progress, r: StreetResult): Progress {
  return {
    ...p,
    hands: p.hands + 1,
    wins: p.wins + (r.win ? 1 : 0),
    streak: r.win ? p.streak + 1 : r.you === r.monkey ? p.streak : 0,
  };
}

// Finishing a level's summary opens the next level. Never the win count.
export function afterSummary(p: Progress, level: Level): Progress {
  const next = Math.min(3, level + 1) as Level;
  return { ...p, unlocked: next > p.unlocked ? next : p.unlocked };
}
