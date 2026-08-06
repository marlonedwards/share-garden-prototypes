// Replays real monthly prices (split-and-dividend-adjusted; index series are
// TOTAL RETURN, so comparisons are fair) through the same portfolio mechanics
// as the seeded engine. Scenario configs supply the dataset, the cast of
// abstracted-name companies, and the real moments. Optional monthly income
// supports the pay-yourself-first scenario; the benchmark receives the same
// income into the index, so the comparison stays honest.
import { Holding, MarketEvent } from "./market";

export interface EraAsset {
  id: string;        // data series key
  name: string;      // abstracted name
  real?: string;     // the actual company name, shown when real names are on
  desc: string;      // honest description of the real company
  color: string;
  glow: string;
  // Scouting notes for the pre-run cards, written strictly as of the era's
  // first month. All four must be present for the scouting deck to deal.
  founded?: number;  // the year the real company was founded
  history?: string;  // where the company stands entering the era
  believers?: string; // the bull case as people argued it at the time
  doubters?: string;  // the bear case as people argued it at the time
  // True for a delisted series rebuilt from the dated record instead of a
  // market data feed (docs/course-style.md names the four: WCOM, ETYS, LEH,
  // BCC). The scouting card discloses it wherever the price is shown.
  reconstructed?: boolean;
  // Optional replacement for the scouting card's default reconstruction
  // disclosure, for assets whose reconstruction needs an extra honest detail
  // (BCC also enters at a start-of-month price while every real series is a
  // month-end close).
  reconstructedNote?: string;
}

export interface HistoryDataset {
  months: string[];
  series: Record<string, number[]>;
}

export interface Trade {
  step: number;
  id: string;
  side: "buy" | "sell";
  dollars: number;
  shares: number;
}

export interface HistoryOpts {
  dataset: HistoryDataset;
  indexKey: string;
  cash: number;
  income?: number;       // added to cash each month; benchmark gets it too
  moments: MarketEvent[];
  lastStep?: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class HistoryMarket {
  step = 0;
  prices: Record<string, number> = {};
  history: Record<string, number[]> = {};
  cash: number;
  start: number;
  income: number;
  holdings: Record<string, Holding> = {};
  trades: Trade[] = [];
  dividendsCollected = 0;
  benchmark: number;
  private benchShares: number;
  net: number[] = [];
  bench: number[] = [];
  lastEvent: MarketEvent | null = null;
  readonly months: string[];
  readonly maxStep: number;
  private data: Record<string, number[]>;
  private indexKey: string;
  private moments: MarketEvent[];

  constructor(opts: HistoryOpts) {
    this.data = opts.dataset.series;
    this.months = opts.dataset.months;
    this.indexKey = opts.indexKey;
    this.moments = opts.moments;
    this.maxStep = Math.min(opts.lastStep ?? this.months.length - 1, this.months.length - 1);
    this.cash = opts.cash;
    this.start = opts.cash;
    this.income = opts.income ?? 0;
    for (const key of Object.keys(this.data)) {
      this.prices[key] = this.data[key][0];
      this.history[key] = [this.data[key][0]];
    }
    this.benchShares = opts.cash / this.data[this.indexKey][0];
    this.benchmark = opts.cash;
    this.net = [opts.cash];
    this.bench = [opts.cash];
  }

  monthLabel(step = this.step): string {
    const m = this.months[Math.min(step, this.months.length - 1)];
    const [y, mo] = m.split("-");
    return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${y}`;
  }

  activeEvent(): MarketEvent | null {
    for (const e of this.moments) {
      if (this.step >= e.atStep && this.step < e.atStep + e.days) return e;
    }
    return null;
  }

  tick(): void {
    if (this.step >= this.maxStep) return;
    this.step++;
    this.lastEvent = this.activeEvent();
    for (const key of Object.keys(this.data)) {
      this.prices[key] = this.data[key][this.step];
      this.history[key].push(this.prices[key]);
    }
    if (this.income > 0) {
      this.cash += this.income;
      this.benchShares += this.income / this.prices[this.indexKey];
    }
    this.benchmark = round2(this.benchShares * this.prices[this.indexKey]);
    this.net.push(round2(this.netWorth()));
    this.bench.push(this.benchmark);
  }

  invested(): number {
    let v = 0;
    for (const key of Object.keys(this.holdings)) {
      v += this.holdings[key].shares * this.prices[key];
    }
    return v;
  }

  netWorth(): number { return this.cash + this.invested(); }

  buy(assetId: string, dollars: number): boolean {
    const p = this.prices[assetId];
    if (!p || dollars <= 0 || dollars > this.cash + 1e-6) return false;
    const shares = dollars / p;
    const h = this.holdings[assetId] ?? { shares: 0, cost: 0 };
    h.shares += shares; h.cost += dollars;
    this.holdings[assetId] = h;
    this.cash -= dollars;
    this.trades.push({ step: this.step, id: assetId, side: "buy", dollars, shares });
    return true;
  }

  sellFraction(assetId: string, frac: number): number {
    const h = this.holdings[assetId];
    if (!h || h.shares <= 0) return 0;
    frac = Math.min(1, Math.max(0, frac));
    const shares = h.shares * frac;
    const proceeds = shares * this.prices[assetId];
    h.cost *= 1 - frac;
    h.shares -= shares;
    this.cash += proceeds;
    if (h.shares < 1e-6) delete this.holdings[assetId];
    this.trades.push({ step: this.step, id: assetId, side: "sell", dollars: proceeds, shares });
    return proceeds;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
