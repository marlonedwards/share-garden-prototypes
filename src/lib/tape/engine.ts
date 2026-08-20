// The tape: the shared engine under Trigger and The Floor. Contract:
// docs/tape-shared.md. Pure TypeScript, no React, no DOM, no timers. The UI
// owns the clock and calls advance() with the seconds it just burned; every
// function here is a pure transition over RunState.
//
// Prices are the baked monthly closes in src/data/era*.json, read exactly as
// they are. Between two closes the tape reads a smoothstep, so a number on
// screen moves continuously instead of stepping once a second.

import eraCovid from "../../data/eraCovid.json";
import eraGfc from "../../data/eraGfc.json";
import eraDotcom from "../../data/eraDotcom.json";
import eraInflation from "../../data/eraInflation.json";
import eraCrypto from "../../data/eraCrypto.json";

export type EraId = "dotcom" | "gfc" | "covid" | "inflation" | "crypto";
export type Ticker = string;

export interface EraData {
  months: string[];
  series: Record<Ticker, (number | null)[]>;
}

// The total-return index every era carries. It is never a playable holding:
// it is the index baseline and the judge for headlines about the market.
export const INDEX_TICKER = "^SP500TR";

export const ERA_IDS: EraId[] = ["dotcom", "gfc", "covid", "inflation", "crypto"];

const ERAS: Record<EraId, EraData> = {
  covid: eraCovid as EraData,
  gfc: eraGfc as EraData,
  dotcom: eraDotcom as EraData,
  inflation: eraInflation as EraData,
  crypto: eraCrypto as EraData,
};

export function loadEra(era: EraId): EraData {
  const data = ERAS[era];
  if (!data) throw new Error(`unknown era ${era}`);
  return data;
}

export function eraMonths(era: EraId): string[] {
  return loadEra(era).months;
}

// Playable tickers, index excluded, in the order the dataset lists them.
export function eraTickers(era: EraId): Ticker[] {
  return Object.keys(loadEra(era).series).filter((t) => t !== INDEX_TICKER);
}

export function monthIndexOf(era: EraId, month: string): number {
  return loadEra(era).months.indexOf(month);
}

// A close of null is read as zero. The baked files use zero for a company that
// has stopped trading, but a null tail means the same thing and costs nothing
// to survive.
export function seriesOf(era: EraId, ticker: Ticker): number[] {
  const raw = loadEra(era).series[ticker];
  if (!raw) throw new Error(`era ${era} has no series ${ticker}`);
  return raw.map((v) => (v === null || !Number.isFinite(v) ? 0 : (v as number)));
}

// The month a company is dead from: the first index whose close is zero and
// which is never positive again. Null while the company still trades.
export function deathIndex(values: number[]): number | null {
  let death: number | null = null;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] > 0) break;
    death = i;
  }
  return death;
}

// ------------------------------------------------------------------ the run

export interface RunConfig {
  era: EraId;
  tickers: Ticker[];      // what this run can trade, focal ticker first
  startCash: number;
  speed: number;          // market months per real second
  startMonth?: string;    // defaults to the era's first month
  endMonth?: string;      // inclusive, defaults to the era's last month
}

export interface Trade {
  kind: "buy" | "sell";
  ticker: Ticker;
  shares: number;
  price: number;
  at: number;             // fractional month position inside the run
  month: string;          // the month the tape was showing
  cash: number;           // cash after the trade
  worth: number;          // worth after the trade, which equals worth before
}

export interface RunState {
  era: EraId;
  months: string[];                     // the run's slice of the era
  startIndex: number;                   // where the slice starts in the era
  tickers: Ticker[];
  prices: Record<Ticker, number[]>;     // sliced closes, index series included
  death: Record<Ticker, number | null>; // slice index the company dies at
  speed: number;
  startCash: number;
  t: number;                            // fractional month position, 0 based
  cash: number;
  holdings: Record<Ticker, number>;     // whole shares only
  trades: Trade[];
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function newRun(cfg: RunConfig): RunState {
  const months = eraMonths(cfg.era);
  const start = cfg.startMonth ? months.indexOf(cfg.startMonth) : 0;
  const end = cfg.endMonth ? months.indexOf(cfg.endMonth) : months.length - 1;
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`era ${cfg.era} has no month window ${cfg.startMonth} to ${cfg.endMonth}`);
  }
  const keys = [...cfg.tickers];
  const index = loadEra(cfg.era).series[INDEX_TICKER];
  if (index && !keys.includes(INDEX_TICKER)) keys.push(INDEX_TICKER);

  const prices: Record<Ticker, number[]> = {};
  const death: Record<Ticker, number | null> = {};
  const holdings: Record<Ticker, number> = {};
  for (const t of keys) {
    const slice = seriesOf(cfg.era, t).slice(start, end + 1);
    prices[t] = slice;
    death[t] = deathIndex(slice);
    if (t !== INDEX_TICKER) holdings[t] = 0;
  }

  return {
    era: cfg.era,
    months: months.slice(start, end + 1),
    startIndex: start,
    tickers: [...cfg.tickers],
    prices,
    death,
    speed: cfg.speed,
    startCash: cfg.startCash,
    t: 0,
    cash: cfg.startCash,
    holdings,
    trades: [],
  };
}

export function lastIndex(run: RunState): number {
  return run.months.length - 1;
}

export function isOver(run: RunState): boolean {
  return run.t >= lastIndex(run);
}

// Fraction of the run already played, 0 to 1.
export function progress(run: RunState): number {
  return lastIndex(run) === 0 ? 1 : run.t / lastIndex(run);
}

// Headlines carry era month indices; the run carries slice indices. This is
// the one conversion between them, so neither game has to do the arithmetic.
export function runIndexOf(run: RunState, eraMonthIndex: number): number {
  return eraMonthIndex - run.startIndex;
}

export function monthAt(run: RunState, t: number = run.t): string {
  return run.months[clamp(Math.floor(t), 0, lastIndex(run))];
}

// The UI burns real seconds; the tape burns market months. No rewind: seconds
// below zero are ignored rather than played backwards.
export function advance(run: RunState, seconds: number): RunState {
  if (!(seconds > 0)) return run;
  return advanceTo(run, run.t + seconds * run.speed);
}

export function advanceTo(run: RunState, t: number): RunState {
  const next = clamp(t, run.t, lastIndex(run));
  return next === run.t ? run : { ...run, t: next };
}

// Smoothstep between the two closes the tape sits between, so the number eases
// into each month instead of jumping on the month boundary.
export function priceAt(run: RunState, ticker: Ticker, t: number = run.t): number {
  const p = run.prices[ticker];
  if (!p) return 0;
  const last = p.length - 1;
  const tt = clamp(t, 0, last);
  const m = Math.floor(tt);
  if (m >= last) return p[last];
  const f = tt - m;
  const s = f * f * (3 - 2 * f);
  return p[m] + (p[m + 1] - p[m]) * s;
}

export function isDead(run: RunState, ticker: Ticker, t: number = run.t): boolean {
  const d = run.death[ticker];
  return d !== null && d !== undefined && t >= d;
}

export function worthAt(run: RunState, t: number = run.t): number {
  let worth = run.cash;
  for (const ticker of Object.keys(run.holdings)) {
    const shares = run.holdings[ticker];
    if (shares > 0) worth += shares * priceAt(run, ticker, t);
  }
  return worth;
}

export function worthOf(run: RunState): number {
  return worthAt(run, run.t);
}

// ------------------------------------------------------------------- trades

// Float slop only. A share is never handed over for free: the count is walked
// back below until the cash covers it exactly.
const SLOP = 1e-9;

// The one whole-share rule, used by trades and by the holding baseline alike
// so the two can never drift apart.
export function wholeShares(cash: number, price: number, budget?: number): number {
  if (!(price > 0) || !(cash > 0)) return 0;
  const spend = Math.min(budget === undefined ? cash : budget, cash);
  if (!(spend > 0)) return 0;
  let n = Math.floor(spend / price);
  if ((n + 1) * price <= spend + SLOP && (n + 1) * price <= cash) n += 1;
  while (n > 0 && n * price > cash) n -= 1;
  return n;
}

export function maxShares(run: RunState, ticker: Ticker, budget?: number): number {
  return wholeShares(run.cash, priceAt(run, ticker), budget);
}

export function canBuy(run: RunState, ticker: Ticker): boolean {
  return maxShares(run, ticker) > 0;
}

export function canSell(run: RunState, ticker: Ticker): boolean {
  return (run.holdings[ticker] ?? 0) > 0;
}

// Buy up to budget dollars of a ticker, whole shares, remainder stays cash.
// A dead company prices at zero and cannot be bought, so this is a no-op.
export function buy(run: RunState, ticker: Ticker, budget?: number): RunState {
  if (!(ticker in run.holdings)) return run;
  const shares = maxShares(run, ticker, budget);
  if (shares <= 0) return run;
  const price = priceAt(run, ticker);
  const cash = run.cash - shares * price;
  const holdings = { ...run.holdings, [ticker]: run.holdings[ticker] + shares };
  const next: RunState = { ...run, cash, holdings };
  return { ...next, trades: [...run.trades, tradeOf(next, "buy", ticker, shares, price)] };
}

// Sell whole shares. Undefined shares means the whole position.
export function sell(run: RunState, ticker: Ticker, shares?: number): RunState {
  const held = run.holdings[ticker] ?? 0;
  const want = shares === undefined ? held : Math.floor(shares);
  const n = clamp(want, 0, held);
  if (n <= 0) return run;
  const price = priceAt(run, ticker);
  const cash = run.cash + n * price;
  const holdings = { ...run.holdings, [ticker]: held - n };
  const next: RunState = { ...run, cash, holdings };
  return { ...next, trades: [...run.trades, tradeOf(next, "sell", ticker, n, price)] };
}

function tradeOf(
  run: RunState, kind: "buy" | "sell", ticker: Ticker, shares: number, price: number,
): Trade {
  return {
    kind, ticker, shares, price,
    at: run.t,
    month: monthAt(run),
    cash: run.cash,
    worth: worthOf(run),
  };
}

// ---------------------------------------------------------------- baselines

export interface Baselines {
  holding: number;
  index: number;
  perfect: number;
}

// All in at the run's first month under the same whole-share rule, held to the
// end, remainder cash. Elijah's "just holding".
export function holdingBaseline(run: RunState, ticker: Ticker = run.tickers[0]): number {
  const p = run.prices[ticker];
  if (!p || !(p[0] > 0)) return run.startCash;
  const shares = wholeShares(run.startCash, p[0]);
  return run.startCash - shares * p[0] + shares * p[p.length - 1];
}

// The same starting dollars in the total-return index over the same months.
// An index fund sells fractions, so no whole-unit rule here.
export function indexBaseline(run: RunState): number {
  const p = run.prices[INDEX_TICKER];
  if (!p || !(p[0] > 0)) return run.startCash;
  return run.startCash * (p[p.length - 1] / p[0]);
}

// All in or out with a month of foresight: start * product of max(1, next/now).
// A ceiling only. No score ever depends on it.
export function perfectBaseline(run: RunState, ticker: Ticker = run.tickers[0]): number {
  const p = run.prices[ticker];
  if (!p) return run.startCash;
  let mult = 1;
  for (let i = 0; i + 1 < p.length; i++) {
    if (!(p[i] > 0)) continue;
    const step = p[i + 1] / p[i];
    if (step > 1) mult *= step;
  }
  return run.startCash * mult;
}

export function baselines(run: RunState, ticker: Ticker = run.tickers[0]): Baselines {
  return {
    holding: holdingBaseline(run, ticker),
    index: indexBaseline(run),
    perfect: perfectBaseline(run, ticker),
  };
}

// ------------------------------------------------------------------ run log

export interface RunSummary {
  era: EraId;
  firstMonth: string;
  lastMonth: string;
  startCash: number;
  worth: number;              // worth at the run's last month
  cash: number;
  holdings: Record<Ticker, number>;
  trades: Trade[];
  baselines: Baselines;
  beatHolding: boolean;
  beatIndex: boolean;
}

// The end-card facts, taken from the run as it stands. Call it once the tape
// has reached the last month.
export function summarize(run: RunState, ticker: Ticker = run.tickers[0]): RunSummary {
  const worth = worthAt(run, lastIndex(run));
  const base = baselines(run, ticker);
  return {
    era: run.era,
    firstMonth: run.months[0],
    lastMonth: run.months[lastIndex(run)],
    startCash: run.startCash,
    worth,
    cash: run.cash,
    holdings: { ...run.holdings },
    trades: [...run.trades],
    baselines: base,
    beatHolding: worth > base.holding,
    beatIndex: worth > base.index,
  };
}

// The holding baseline played through the engine rather than computed: all in
// on the first month, then nothing until the last. Invariant 3 checks that
// this and holdingBaseline() agree.
export function replayHolding(cfg: RunConfig, ticker?: Ticker): RunState {
  const start = newRun(cfg);
  const focal = ticker ?? start.tickers[0];
  return advanceTo(buy(start, focal), lastIndex(start));
}
