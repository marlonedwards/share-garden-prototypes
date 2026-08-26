// The deal: which era and which stock a run hands you, and the names and words
// that go on the card. Game side only, so the shared engine stays a data layer.
// Contract: docs/trigger-spec.md section 1 and the copy table in section 6.

import type { EraId, Ticker } from "../tape/engine";
import { ERA_IDS, eraMonths, eraTickers, seriesOf } from "../tape/engine";

export const START_CASH = 1000;
export const SPEED = 1.6;

// The wave names the suite already uses, reused verbatim.
export const ERA_NAME: Record<EraId, string> = {
  covid: "the 2020s",
  gfc: "the crash",
  dotcom: "the dot-com bust",
  inflation: "the inflation years",
  crypto: "the crypto winter",
};

// One sentence of mood on the deal card. Present tense, one phrase, nothing
// invented: this is weather, not a claim about a company.
export const ERA_MOOD: Record<EraId, string> = {
  covid: "The world shuts down and the market runs anyway.",
  gfc: "The banks are about to find out what they own.",
  dotcom: "Anything with a website is worth a fortune.",
  inflation: "Prices climb and the Fed raises rates to stop them.",
  crypto: "The coins are a long way down from the top.",
};

// Real names written the way the companies write them, the Takeover policy.
export const COMPANY: Record<Ticker, string> = {
  AAPL: "Apple",
  AMZN: "Amazon",
  MSFT: "Microsoft",
  CSCO: "Cisco",
  INTC: "Intel",
  KO: "Coca-Cola",
  JNJ: "Johnson & Johnson",
  XOM: "Exxon Mobil",
  WCOM: "WorldCom",
  ETYS: "eToys",
  C: "Citigroup",
  AIG: "AIG",
  F: "Ford",
  GE: "General Electric",
  WMT: "Walmart",
  LEH: "Lehman Brothers",
  NVDA: "Nvidia",
  TSLA: "Tesla",
  ZM: "Zoom",
  PTON: "Peloton",
  GME: "GameStop",
  PG: "Procter & Gamble",
  TLT: "iShares 20+ Year Treasury Bond ETF",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "LTC-USD": "Litecoin",
  "XRP-USD": "XRP",
  "DOGE-USD": "Dogecoin",
  BCC: "Bitconnect",
};

export function companyName(ticker: Ticker): string {
  return COMPANY[ticker] ?? ticker;
}

// The four that go to zero. They stay in the pool at a eighth of the weight,
// because a run where selling was the right answer is the best lesson here.
export const DEAD_TICKERS = new Set<Ticker>(["LEH", "WCOM", "ETYS", "BCC"]);

const MIN_RUN_MONTHS = 12;

// A stock you cannot buy a single share of is not a deal. Whole shares are the
// engine's law, so the run window starts at the first month the dealt asset
// costs no more than the starting cash. This only ever bites in the crypto
// era: Ethereum shifts the window one month, Bitcoin never comes back under a
// thousand dollars and so cannot be dealt at all.
export function firstAffordableMonth(era: EraId, ticker: Ticker): string | null {
  const values = seriesOf(era, ticker);
  const months = eraMonths(era);
  for (let i = 0; i + MIN_RUN_MONTHS < values.length; i++) {
    if (values[i] > 0 && values[i] <= START_CASH) return months[i];
  }
  return null;
}

// Every asset in the era files except the index, with the crypto era cut to
// the two coins that do not price below a dollar.
export function eraPool(era: EraId): Ticker[] {
  let list = eraTickers(era);
  if (era === "crypto") list = list.filter((t) => t === "BTC-USD" || t === "ETH-USD");
  return list.filter((t) => firstAffordableMonth(era, t) !== null);
}

export function dealableEras(): EraId[] {
  return ERA_IDS.filter((e) => eraPool(e).length > 0);
}

export interface Deal {
  era: EraId;
  ticker: Ticker;
  seed: number;
  startMonth: string;
}

function weightOf(ticker: Ticker): number {
  return DEAD_TICKERS.has(ticker) ? 1 / 8 : 1;
}

function weightedPick(list: Ticker[], rnd: () => number): Ticker {
  const total = list.reduce((sum, t) => sum + weightOf(t), 0);
  let roll = rnd() * total;
  for (const t of list) {
    roll -= weightOf(t);
    if (roll <= 0) return t;
  }
  return list[list.length - 1];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1e9) + 1;
}

// One era, then one stock inside it, with the dead companies at an eighth.
export function dealRandom(rnd: () => number = Math.random): Deal {
  const eras = dealableEras();
  const era = eras[Math.min(eras.length - 1, Math.floor(rnd() * eras.length))];
  const ticker = weightedPick(eraPool(era), rnd);
  return { era, ticker, seed: randomSeed(), startMonth: firstAffordableMonth(era, ticker) as string };
}

// A deal's (company, timespan) identity. The start month is fixed by
// affordability per era and ticker, so the pair is the whole slice.
export function dealKey(d: { era: EraId; ticker: Ticker }): string {
  return `${d.era}:${d.ticker}`;
}

// Every pair the pool can deal, across every dealable era.
function allPairs(): { era: EraId; ticker: Ticker }[] {
  const out: { era: EraId; ticker: Ticker }[] = [];
  for (const era of dealableEras()) {
    for (const ticker of eraPool(era)) out.push({ era, ticker });
  }
  return out;
}

// A random deal that avoids already dealt (company, timespan) pairs, dead
// companies still at an eighth of the weight. The batch uses this so ten
// markets are ten different markets; when every pair is taken the exclusion
// resets rather than refusing to deal.
export function dealRandomExcluding(taken: ReadonlySet<string>, rnd: () => number = Math.random): Deal {
  let pool = allPairs().filter((c) => !taken.has(dealKey(c)));
  if (pool.length === 0) pool = allPairs();
  const total = pool.reduce((sum, c) => sum + weightOf(c.ticker), 0);
  let roll = rnd() * total;
  let pick = pool[pool.length - 1];
  for (const c of pool) {
    roll -= weightOf(c.ticker);
    if (roll <= 0) {
      pick = c;
      break;
    }
  }
  return {
    era: pick.era,
    ticker: pick.ticker,
    seed: randomSeed(),
    startMonth: firstAffordableMonth(pick.era, pick.ticker) as string,
  };
}

// A deal built from the url, falling back a piece at a time so a half written
// link still plays rather than erroring.
export function dealFromParams(
  eraParam: string | null, stockParam: string | null, seedParam: string | null,
): Deal {
  const eras = dealableEras();
  const era: EraId = eraParam && (ERA_IDS as string[]).includes(eraParam)
    ? (eraParam as EraId)
    : eras[Math.min(eras.length - 1, Math.floor(Math.random() * eras.length))];

  const pool = eraPool(era);
  // an explicit stock is honoured even when it is one nobody can afford, so a
  // pinned link always plays the run it names
  const ticker = stockParam && eraTickers(era).includes(stockParam)
    ? stockParam
    : pool.length > 0 ? weightedPick(pool, Math.random) : eraTickers(era)[0];

  const seedNum = seedParam === null ? NaN : Number(seedParam);
  const seed = Number.isFinite(seedNum) ? Math.floor(seedNum) : randomSeed();

  const start = firstAffordableMonth(era, ticker) ?? eraMonths(era)[0];
  return { era, ticker, seed, startMonth: start };
}

// "2008-03" reads as "March 2008" on the header and the deal card.
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function longMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const i = Number(m) - 1;
  return `${MONTH_NAMES[i] ?? m} ${y}`;
}

export function yearOf(ym: string): string {
  return ym.slice(0, 4);
}
