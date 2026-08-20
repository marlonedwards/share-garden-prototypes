// The Floor's campaign layer: the era ladder, the money that carries between
// eras, the composite baselines the debrief judges you against, the stars, and
// the localStorage save. Contract: docs/floor-spec.md, on top of the shared
// engine in docs/tape-shared.md.
//
// Nothing in here touches React or the DOM. The engine owns prices, trades and
// conservation; this file owns everything that is true of a campaign rather
// than of one run, and it builds its numbers out of engine primitives so the
// two can never drift apart.

import {
  EraId, INDEX_TICKER, RunState, Ticker, Trade,
  advanceTo, eraMonths, eraTickers, isDead, lastIndex, priceAt, sell, seriesOf, wholeShares,
} from "../tape/engine";

// --------------------------------------------------------------- the ladder

export interface Level {
  era: EraId;
  title: string;   // the wave name the suite already uses
  years: string;   // "2007 to 2015"
  card: string;    // the level card line, copy table section 6
  months: number;  // the era's length, asserted against the data at load
  speed: number;   // market months per real second
}

export const CAMPAIGN_START = 2000;

export const LADDER: Level[] = [
  { era: "covid", title: "The 2020s", years: "2019 to 2024", card: "The 2020s. 2019 to 2024.", months: 72, speed: 0.8 },
  { era: "inflation", title: "The inflation years", years: "2021 to 2024", card: "The inflation years. 2021 to 2024.", months: 48, speed: 1.0 },
  { era: "gfc", title: "The crash", years: "2007 to 2015", card: "The crash. 2007 to 2015.", months: 108, speed: 1.2 },
  { era: "dotcom", title: "The dot-com bust", years: "2000 to 2007", card: "The dot-com bust. 2000 to 2007.", months: 96, speed: 1.4 },
  { era: "crypto", title: "The crypto winter", years: "2018 to 2025", card: "The crypto winter. 2018 to 2025.", months: 85, speed: 1.6 },
];

export function levelOf(era: EraId): Level {
  const found = LADDER.find((l) => l.era === era);
  if (!found) throw new Error(`no level for era ${era}`);
  return found;
}

export function levelIndexOf(era: EraId): number {
  return LADDER.findIndex((l) => l.era === era);
}

// ---------------------------------------------------------------- the names

// Real companies written the way the companies write them, the same policy the
// rest of the suite follows. Keys are the tickers in the baked era files.
const NAMES: Record<Ticker, string> = {
  AAPL: "Apple",
  AMZN: "Amazon",
  NVDA: "Nvidia",
  TSLA: "Tesla",
  ZM: "Zoom",
  PTON: "Peloton",
  GME: "GameStop",
  C: "Citigroup",
  AIG: "AIG",
  F: "Ford",
  GE: "General Electric",
  WMT: "Walmart",
  XOM: "ExxonMobil",
  LEH: "Lehman Brothers",
  MSFT: "Microsoft",
  CSCO: "Cisco",
  INTC: "Intel",
  KO: "Coca-Cola",
  JNJ: "Johnson & Johnson",
  WCOM: "WorldCom",
  ETYS: "eToys",
  PG: "Procter & Gamble",
  TLT: "iShares 20+ Year Treasury Bond",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "LTC-USD": "Litecoin",
  "XRP-USD": "XRP",
  "DOGE-USD": "Dogecoin",
  BCC: "BitConnect",
};

export function nameOf(ticker: Ticker): string {
  return NAMES[ticker] ?? ticker;
}

// ------------------------------------------------------------------- months

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2008-09" reads as "September 2008" on the desk header.
export function readMonth(month: string): string {
  const [y, m] = month.split("-");
  const i = Number(m) - 1;
  return `${MONTH_NAMES[i] ?? m} ${y}`;
}

// ------------------------------------------------------------------- money

// One money implementation for both timing games. The Floor used to switch to
// cents below a thousand dollars, which made the worth readout jitter between
// two shapes every time a run crossed the line; Trigger's whole dollars are the
// house rule and this file re-exports them rather than keeping a second copy.
export { money, price, signedMoney } from "../trigger/format";

export function pct(r: number): string {
  return `${Math.abs(r * 100) >= 10 ? Math.round(Math.abs(r) * 100) : (Math.abs(r) * 100).toFixed(1)}%`;
}

export function countOf(n: number): string {
  return n.toLocaleString("en-US");
}

// ------------------------------------------------------------ the listing

// Some series in the baked era files are backfilled before the company was
// public: eraCovid carries Zoom at a flat 72.47 for January to April 2019 and
// Peloton at a flat 25.10 for January to September 2019, because the file
// repeats the first real close backwards to keep every series the same length.
// The data is not edited. Instead the game refuses to list a company until its
// first real trading month, so a backfilled stretch can never be sold as a
// guaranteed motionless asset.
//
// The rule is computed, not hardcoded: a leading run of identical closes is
// backfill, and the last month of that run is the first real close. Three
// months is the shortest run treated as backfill, which is what keeps a real
// two month coincidence (Dogecoin opens 2018 at 0.006 twice) out of it. Across
// all five era files the rule fires on exactly ZM and PTON.
const MIN_BACKFILL = 3;
const LISTING_CACHE = new Map<string, number>();

export function listingIndexOf(era: EraId, ticker: Ticker): number {
  const key = `${era}:${ticker}`;
  const hit = LISTING_CACHE.get(key);
  if (hit !== undefined) return hit;
  const p = seriesOf(era, ticker);
  let run = 1;
  while (run < p.length && p[run] === p[0]) run += 1;
  const at = run >= MIN_BACKFILL ? run - 1 : 0;
  LISTING_CACHE.set(key, at);
  return at;
}

// The same month as a position in the run's own slice.
export function listedFrom(run: RunState, ticker: Ticker): number {
  return listingIndexOf(run.era, ticker) - run.startIndex;
}

export function isListed(run: RunState, ticker: Ticker, t: number = run.t): boolean {
  return t >= listedFrom(run, ticker);
}

// "lists April 2019", the rail's line for a company that is not public yet.
export function listsOn(run: RunState, ticker: Ticker): string {
  const at = Math.max(0, Math.min(lastIndex(run), listedFrom(run, ticker)));
  return readMonth(run.months[at]);
}

// A company you can act on right now: listed, alive, and priced.
export function isTradeable(run: RunState, ticker: Ticker, t: number = run.t): boolean {
  return isListed(run, ticker, t) && !isDead(run, ticker, t) && priceAt(run, ticker, t) > 0;
}

// What the desk should open on. The era's first name is whatever the data file
// listed first, which in the crypto winter is Bitcoin at ten thousand dollars a
// coin, so a normal carry opens on an asset it cannot touch. The desk opens on
// the first name the money can actually buy instead, and falls back to the
// cheapest live one when nothing is affordable.
export function openingFocus(run: RunState, cash: number = run.cash): Ticker {
  let cheapest: Ticker = run.tickers[0];
  let low = Infinity;
  for (const ticker of run.tickers) {
    if (!isTradeable(run, ticker)) continue;
    const p = priceAt(run, ticker);
    if (p <= cash) return ticker;
    if (p < low) {
      low = p;
      cheapest = ticker;
    }
  }
  return cheapest;
}

// ---------------------------------------------------------------- baselines

// The Floor's "doing nothing" is not the engine's single-ticker holding
// baseline: it is all in on era open, spread equally across the era's stocks
// (docs/floor-spec.md section 4). Each slice buys whole shares under the
// engine's own rule, so this and a real run cannot disagree about what a
// dollar buys, and the leftovers stay cash.
export function compositeHolding(era: EraId, startCash: number): number {
  const tickers = eraTickers(era);
  if (tickers.length === 0) return startCash;
  const slice = startCash / tickers.length;
  let cash = startCash;
  let held = 0;
  for (const ticker of tickers) {
    const p = seriesOf(era, ticker);
    const open = p[0];
    if (!(open > 0)) continue;
    const shares = wholeShares(slice, open);
    cash -= shares * open;
    held += shares * p[p.length - 1];
  }
  return cash + held;
}

// The same dollars in the total-return index across the era's months.
export function indexMultiple(era: EraId): number {
  const p = seriesOf(era, INDEX_TICKER);
  if (!(p[0] > 0)) return 1;
  return p[p.length - 1] / p[0];
}

export function compositeIndex(era: EraId, startCash: number): number {
  return startCash * indexMultiple(era);
}

// The campaign baselines: the same two rules run through every era in order,
// each era starting with what the last one left. Never trading at all means
// never touching the equal-weight basket you were handed; the index the whole
// way means every era's dollars sat in the index instead.
export function campaignHolding(start = CAMPAIGN_START, levels: Level[] = LADDER): number {
  let cash = start;
  for (const level of levels) cash = compositeHolding(level.era, cash);
  return cash;
}

export function campaignIndex(start = CAMPAIGN_START, levels: Level[] = LADDER): number {
  let cash = start;
  for (const level of levels) cash = compositeIndex(level.era, cash);
  return cash;
}

// --------------------------------------------------------------- the stars

export type StarId = "couch" | "pace" | "alive";

export const STAR_NAMES: Record<StarId, string> = {
  couch: "Beat the couch",
  pace: "Kept pace",
  alive: "Lived to tell",
};

export const STAR_ORDER: StarId[] = ["couch", "pace", "alive"];

export interface StarInput {
  worth: number;         // worth at the era's last month
  holding: number;       // the composite holding baseline
  index: number;         // the index baseline
  minWorth: number;      // the lowest worth the run ever touched
  openingWorth: number;  // what the era opened with
}

export function starsFor(s: StarInput): StarId[] {
  const out: StarId[] = [];
  if (s.worth > s.holding) out.push("couch");
  if (s.worth >= 0.9 * s.index) out.push("pace");
  if (s.minWorth >= 0.5 * s.openingWorth) out.push("alive");
  return out;
}

export const STARS_POSSIBLE = LADDER.length * STAR_ORDER.length;

// ------------------------------------------------------------- the trade log

export interface Realized {
  ticker: Ticker;
  shares: number;
  dollars: number;   // signed profit on the shares this sell closed out
  month: string;
  era: EraId;
}

interface Lot {
  shares: number;
  price: number;
}

// Every sell closes the oldest shares first, the same way Takeover's ledger
// reads its acquisitions back. A company that dies while you hold it sells at
// zero on era settlement, so the loss lands here rather than vanishing.
export function realizedFrom(trades: Trade[], era: EraId): Realized[] {
  const lots: Record<Ticker, Lot[]> = {};
  const out: Realized[] = [];
  for (const trade of trades) {
    if (trade.kind === "buy") {
      (lots[trade.ticker] ??= []).push({ shares: trade.shares, price: trade.price });
      continue;
    }
    let left = trade.shares;
    let cost = 0;
    const queue = lots[trade.ticker] ?? [];
    while (left > 0 && queue.length > 0) {
      const lot = queue[0];
      const take = Math.min(left, lot.shares);
      cost += take * lot.price;
      lot.shares -= take;
      left -= take;
      if (lot.shares <= 0) queue.shift();
    }
    const closed = trade.shares - left;
    if (closed <= 0) continue;
    out.push({
      ticker: trade.ticker,
      shares: closed,
      dollars: closed * trade.price - cost,
      month: trade.month,
      era,
    });
  }
  return out;
}

export interface BiggestMoves {
  win: Realized | null;
  loss: Realized | null;
}

export function biggestOf(realized: Realized[]): BiggestMoves {
  let win: Realized | null = null;
  let loss: Realized | null = null;
  for (const r of realized) {
    if (r.dollars > 0 && (win === null || r.dollars > win.dollars)) win = r;
    if (r.dollars < 0 && (loss === null || r.dollars < loss.dollars)) loss = r;
  }
  return { win, loss };
}

// ------------------------------------------------------------------- broke

// The cheapest share a live company is asking for right now. Infinity when
// every company in the era is dead, which no era file allows but which costs
// nothing to survive.
export function cheapestLive(run: RunState): number {
  let cheapest = Infinity;
  for (const ticker of run.tickers) {
    if (!isTradeable(run, ticker)) continue;
    const p = priceAt(run, ticker);
    if (p < cheapest) cheapest = p;
  }
  return cheapest;
}

// Broke is no holdings worth anything and not enough cash for one share of the
// cheapest live company. Shares in a company that went to zero are not
// holdings, they are a hole.
export function isBroke(run: RunState): boolean {
  for (const ticker of run.tickers) {
    if ((run.holdings[ticker] ?? 0) > 0 && priceAt(run, ticker) > 0) return false;
  }
  const cheapest = cheapestLive(run);
  return Number.isFinite(cheapest) && run.cash < cheapest;
}

// --------------------------------------------------------------- settlement

// Era companies do not follow you into the next decade, so every position is
// sold at its last real close. It runs through the engine's own sell() rather
// than a sum written here, which keeps conservation honest and puts the
// settlement into the trade log where the campaign ledger can read it: a
// company that died is sold at zero, and that loss is a real realized loss.
export function settleRun(run: RunState): RunState {
  let settled = advanceTo(run, lastIndex(run));
  for (const ticker of settled.tickers) {
    if ((settled.holdings[ticker] ?? 0) > 0) settled = sell(settled, ticker);
  }
  return settled;
}

// ------------------------------------------------------------------ the save

export const RUN_KEY = "floor-run";
export const PROGRESS_KEY = "floor-progress";
export const BEST_KEY = "floor-best";

export const SAVE_VERSION = 3;

export type Phase = "level" | "run" | "gate" | "debrief" | "settle" | "broke" | "end";

export interface LedgerRow {
  era: EraId;
  title: string;
  entered: number;
  left: number;
  stars: StarId[];
}

export interface GateRecord {
  gateId: string;
  month: string;
  headline: string;
  choice: string;
  shares: number;      // what the choice actually traded
  ticker: Ticker | "";
  kind: "buy" | "sell" | "hold";
  watch: string;       // the ticker or "market" the aftermath reads
  priceThen: number;
  priceAfter: number;
  afterMonth: string;
}

export interface Progress {
  v: number;
  seedBase: number;
  levelIndex: number;
  cash: number;             // what the next era opens with
  ledger: LedgerRow[];
  realized: Realized[];     // every closed-out position, for the biggest moves
  pinned: EraId | null;     // a ?era= run keeps the ladder out of the way
}

export interface SavedRun {
  era: EraId;
  t: number;
  cash: number;
  holdings: Record<Ticker, number>;
  trades: Trade[];
  startCash: number;
  speed: number;
  minWorth: number;
  fired: string[];
  focus: Ticker;
  gates: GateRecord[];
  track: number[];          // worth at each month boundary the tape has passed
}

export interface RunSave {
  v: number;
  phase: Phase;
  progress: Progress;
  run: SavedRun | null;
}

export function freshProgress(seedBase: number, pinned: EraId | null = null): Progress {
  return {
    v: SAVE_VERSION,
    seedBase,
    levelIndex: pinned ? levelIndexOf(pinned) : 0,
    cash: CAMPAIGN_START,
    ledger: [],
    realized: [],
    pinned,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readSave(): RunSave | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunSave;
    if (!parsed || parsed.v !== SAVE_VERSION) return null;
    if (!parsed.progress || !Array.isArray(parsed.progress.ledger)) return null;
    if (!Array.isArray(parsed.progress.realized)) parsed.progress.realized = [];
    return parsed;
  } catch {
    return null;
  }
}

export function writeSave(save: RunSave): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(RUN_KEY, JSON.stringify(save));
    store.setItem(PROGRESS_KEY, JSON.stringify(save.progress));
  } catch {
    // a full or blocked store never costs the player their run in memory
  }
}

export function clearSave(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(RUN_KEY);
    store.removeItem(PROGRESS_KEY);
  } catch {
    // ignore
  }
}

export function readBest(): number {
  const store = storage();
  if (!store) return 0;
  const raw = Number(store.getItem(BEST_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export function writeBest(worth: number): number {
  const store = storage();
  const best = Math.max(readBest(), worth);
  if (store) {
    try {
      store.setItem(BEST_KEY, String(best));
    } catch {
      // ignore
    }
  }
  return best;
}

// --------------------------------------------------------------- the ledger

// The ledger's arithmetic has to close: every row leaves with what the next
// row enters with, and the last row's exit is the campaign's final worth.
export function ledgerCloses(ledger: LedgerRow[], start = CAMPAIGN_START): boolean {
  let cash = start;
  for (const row of ledger) {
    if (Math.abs(row.entered - cash) > 0.01) return false;
    cash = row.left;
  }
  return true;
}

export function ledgerFinal(ledger: LedgerRow[], start = CAMPAIGN_START): number {
  return ledger.length === 0 ? start : ledger[ledger.length - 1].left;
}

export function starsIn(ledger: LedgerRow[]): number {
  return ledger.reduce((n, row) => n + row.stars.length, 0);
}

// The ladder's month counts are written down twice, here and in the baked era
// files. They have to agree or a level card lies about its own length.
export function ladderMatchesData(): string[] {
  const bad: string[] = [];
  for (const level of LADDER) {
    const months = eraMonths(level.era).length;
    if (months !== level.months) bad.push(`${level.era} ladder says ${level.months} months, data has ${months}`);
  }
  return bad;
}
