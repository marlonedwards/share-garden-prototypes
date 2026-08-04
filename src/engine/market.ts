// Shared deterministic market engine. Same seed -> same run, every time.
// One universe of assets grouped by sector; a factor model gives correlated
// returns (market factor + sector factor + idiosyncratic). Scheduled events
// (storm/blight/rally) inject transient drift. Powers all three prototypes:
// Pulse renders assets as tickers, Garden as crops, Flows as sector nodes.

export type Kind = "stock" | "crypto" | "index" | "cash";
export type Payout = "growth" | "income";

export interface AssetDef {
  id: string;
  symbol: string;      // ticker for Pulse
  crop: string;        // crop name for Garden
  sprite: string;      // sprite key for Garden
  name: string;        // plain-language name / company-ish
  sector: string;      // correlation group
  kind: Kind;
  mu: number;          // daily drift
  sigma: number;       // daily idiosyncratic vol
  beta: number;        // exposure to the market factor
  payout: Payout;      // dividends (income) vs capital gain (growth)
  yield: number;       // per-payout dividend fraction (income assets)
  marketCap: number;   // $B, used to size the treemap / prism tiles
}

export interface Sector {
  id: string;
  label: string;
  color: string;       // hue used across all three views
  loading: number;     // exposure to its own sector factor
}

export const SECTORS: Sector[] = [
  { id: "tech",     label: "Technology",  color: "#56c7ff", loading: 1.0 },
  { id: "energy",   label: "Energy",      color: "#ffb454", loading: 0.9 },
  { id: "industry", label: "Industrials", color: "#9bd45f", loading: 0.8 },
  { id: "consumer", label: "Consumer",    color: "#ff9ecf", loading: 0.7 },
  { id: "health",   label: "Health",      color: "#7ee0c0", loading: 0.6 },
  { id: "crypto",   label: "Crypto",      color: "#9b8cff", loading: 1.6 },
];

// Fictional tickers / cultivars (never real companies, per spec).
// The core set carries the Garden crops; each also has a marketCap.
export const ASSETS: AssetDef[] = [
  { id: "nova", symbol: "NOVA", crop: "Tomato",    sprite: "tomato",    name: "Nova Systems",   sector: "tech",     kind: "stock",  mu: 0.0011, sigma: 0.030, beta: 1.3, payout: "growth", yield: 0,     marketCap: 1850 },
  { id: "pepr", symbol: "PEPR", crop: "Pepper",    sprite: "carrot",    name: "Pepr Labs",      sector: "tech",     kind: "stock",  mu: 0.0009, sigma: 0.028, beta: 1.2, payout: "growth", yield: 0,     marketCap: 940 },
  { id: "volt", symbol: "VOLT", crop: "Corn",      sprite: "corn",      name: "Volt Energy",    sector: "energy",   kind: "stock",  mu: 0.0006, sigma: 0.022, beta: 0.9, payout: "income", yield: 0.010, marketCap: 720 },
  { id: "iron", symbol: "IRON", crop: "Pumpkin",   sprite: "pumpkin",   name: "Iron Works",     sector: "industry", kind: "stock",  mu: 0.0005, sigma: 0.019, beta: 0.8, payout: "income", yield: 0.008, marketCap: 560 },
  { id: "cane", symbol: "CANE", crop: "Melon",     sprite: "blueberry", name: "Cane & Co",      sector: "consumer", kind: "stock",  mu: 0.0005, sigma: 0.017, beta: 0.7, payout: "income", yield: 0.009, marketCap: 680 },
  { id: "aura", symbol: "AURA", crop: "Garlic",    sprite: "garlic",    name: "Aura Health",    sector: "health",   kind: "stock",  mu: 0.0006, sigma: 0.015, beta: 0.5, payout: "income", yield: 0.011, marketCap: 500 },
  { id: "btx",  symbol: "BTX",  crop: "Sunflower", sprite: "blueberry", name: "Bitrix",         sector: "crypto",   kind: "crypto", mu: 0.0016, sigma: 0.060, beta: 1.8, payout: "growth", yield: 0,     marketCap: 1150 },
  { id: "etna", symbol: "ETNA", crop: "Mushroom",  sprite: "garlic",    name: "Etna Chain",     sector: "crypto",   kind: "crypto", mu: 0.0014, sigma: 0.055, beta: 1.7, payout: "growth", yield: 0,     marketCap: 640 },
  { id: "coop", symbol: "CO-OP",crop: "Co-op Field",sprite: "coop-field",name: "Co-op Index Fund",sector: "index",  kind: "index",  mu: 0.0007, sigma: 0.008, beta: 1.0, payout: "income", yield: 0.004, marketCap: 0 },
];

// Expanded market universe for the market-cap views (Pulse treemap + Prism).
// Params default by sector; per-asset idiosyncratic noise still differentiates them.
const SP: Record<string, { mu: number; sigma: number; beta: number; payout: Payout; y: number; kind: Kind }> = {
  tech:     { mu: 0.0010, sigma: 0.028, beta: 1.25, payout: "growth", y: 0,     kind: "stock" },
  energy:   { mu: 0.0006, sigma: 0.023, beta: 0.95, payout: "income", y: 0.010, kind: "stock" },
  industry: { mu: 0.0005, sigma: 0.020, beta: 0.85, payout: "income", y: 0.008, kind: "stock" },
  consumer: { mu: 0.0005, sigma: 0.017, beta: 0.70, payout: "income", y: 0.009, kind: "stock" },
  health:   { mu: 0.0006, sigma: 0.016, beta: 0.55, payout: "income", y: 0.011, kind: "stock" },
  crypto:   { mu: 0.0015, sigma: 0.058, beta: 1.75, payout: "growth", y: 0,     kind: "crypto" },
};
function u(id: string, symbol: string, name: string, sector: string, cap: number): AssetDef {
  const p = SP[sector];
  return { id, symbol, crop: "", sprite: "", name, sector, kind: p.kind, mu: p.mu, sigma: p.sigma, beta: p.beta, payout: p.payout, yield: p.y, marketCap: cap };
}
const UNIVERSE: AssetDef[] = [
  u("luma", "LUMA", "Lumascale", "tech", 1520), u("heli", "HELI", "Helion AI", "tech", 1240), u("qbit", "QBIT", "Qubit Foundry", "tech", 780), u("pixl", "PIXL", "Pixl Media", "tech", 430), u("crtx", "CRTX", "Cortex Labs", "tech", 990), u("nmbs", "NMBS", "Nimbus Cloud", "tech", 320),
  u("sola", "SOLA", "Solara Power", "energy", 540), u("atls", "ATLS", "Atlas Oil", "energy", 810), u("embr", "EMBR", "Ember Gas", "energy", 270), u("terr", "TERR", "Terra Grid", "energy", 360),
  u("grdr", "GRDR", "Girder Steel", "industry", 400), u("haul", "HAUL", "Haul Freight", "industry", 300), u("rvet", "RVET", "Rivet Machines", "industry", 210), u("cran", "CRAN", "Crane Systems", "industry", 150),
  u("hrth", "HRTH", "Hearth Goods", "consumer", 630), u("crav", "CRAV", "Crave Foods", "consumer", 350), u("loom", "LOOM", "Loom Apparel", "consumer", 250), u("vlvt", "VLVT", "Velvet Retail", "consumer", 180),
  u("mend", "MEND", "Mendwell", "health", 540), u("vitl", "VITL", "Vital Pharma", "health", 410), u("cura", "CURA", "Cura Bio", "health", 310), u("gnme", "GNME", "Genome Labs", "health", 720),
  u("zeed", "ZEED", "Zed Protocol", "crypto", 380), u("orbt", "ORBT", "Orbit Coin", "crypto", 230),
];
// tradeable market map (everything except the index fund)
export const MARKET: AssetDef[] = [...ASSETS.filter((a) => a.kind !== "index"), ...UNIVERSE];
// every asset the engine simulates (core + universe)
export const ALL_ASSETS: AssetDef[] = [...ASSETS, ...UNIVERSE];

export interface MarketEvent {
  atStep: number;
  days: number;
  drift: number;       // added daily drift over the window
  vol: number;         // extra vol over the window
  scope: "market" | string; // "market" or a sector id
  label: string;
  blurb: string;
}

// A deterministic season of events - the emotional-discipline + blight lessons.
export const EVENTS: MarketEvent[] = [
  { atStep: 26, days: 5,  drift: 0.010, vol: 0.010, scope: "tech",     label: "Tech rally",     blurb: "Everyone is piling into tech. Prices are running hot." },
  { atStep: 48, days: 7,  drift: -0.028, vol: 0.030, scope: "market",   label: "The Storm",      blurb: "A market-wide crash. Every position is bleeding at once." },
  { atStep: 74, days: 6,  drift: -0.045, vol: 0.020, scope: "crypto",   label: "Crypto flush",   blurb: "Speculative names are getting wiped out." },
  { atStep: 96, days: 6,  drift: -0.038, vol: 0.015, scope: "tech",     label: "Tech blight",    blurb: "A sector-wide selloff. If you were all-in on tech, it hurts." },
  { atStep: 124, days: 8, drift: 0.014, vol: 0.010, scope: "market",   label: "Recovery",       blurb: "The market is climbing back. Patience is paying off." },
];

// ---- deterministic RNG (mulberry32) + normal via Box-Muller ----
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Holding { shares: number; cost: number; }
export interface Position { asset: AssetDef; shares: number; cost: number; value: number; pnl: number; }

export interface PricePoint { step: number; price: number; }

export class Market {
  step = 0;
  prices: Record<string, number> = {};
  history: Record<string, number[]> = {};
  cash: number;
  start: number;
  holdings: Record<string, Holding> = {};
  dividendsCollected = 0;
  benchmark: number;        // "index gardener" net worth, buys CO-OP at t0 and holds
  private benchShares: number;
  private rand: () => number;
  net: number[] = [];       // player net-worth history
  bench: number[] = [];     // benchmark history
  lastEvent: MarketEvent | null = null;
  feeDrag: number;          // annualized-ish fee skim on idle mistakes (garden weeds), 0 by default
  events: MarketEvent[];    // scenario event season, EVENTS by default

  constructor(seed = 12345, startingCash = 1000, feeDrag = 0, events: MarketEvent[] = EVENTS) {
    this.rand = mulberry32(seed);
    this.events = events;
    this.cash = startingCash;
    this.start = startingCash;
    this.feeDrag = feeDrag;
    for (const a of ALL_ASSETS) {
      const base = a.kind === "crypto" ? 40 + this.rand() * 30 : a.kind === "index" ? 100 : 20 + this.rand() * 80;
      this.prices[a.id] = round2(base);
      this.history[a.id] = [this.prices[a.id]];
    }
    this.benchShares = startingCash / this.prices["coop"];
    this.benchmark = startingCash;
    this.net = [startingCash];
    this.bench = [startingCash];
  }

  private normal(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.rand();
    while (v === 0) v = this.rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  activeEvent(): MarketEvent | null {
    for (const e of this.events) {
      if (this.step >= e.atStep && this.step < e.atStep + e.days) return e;
    }
    return null;
  }

  // advance one day
  tick(): void {
    this.step++;
    const ev = this.activeEvent();
    this.lastEvent = ev;
    const marketShock = this.normal() * 0.010 + (ev?.scope === "market" ? ev.drift : 0);
    const sectorShock: Record<string, number> = {};
    for (const s of SECTORS) {
      let sh = this.normal() * 0.012 * s.loading;
      if (ev && ev.scope === s.id) sh += ev.drift;
      sectorShock[s.id] = sh;
    }
    const evVol = ev?.vol ?? 0;
    for (const a of ALL_ASSETS) {
      const idio = this.normal() * (a.sigma + evVol);
      const ret = a.mu + a.beta * marketShock + (sectorShock[a.sector] ?? 0) + idio;
      this.prices[a.id] = round2(Math.max(0.5, this.prices[a.id] * Math.exp(ret)));
      this.history[a.id].push(this.prices[a.id]);

      // dividends: income assets pay a small yield every 12 days into cash
      if (a.payout === "income" && this.step % 12 === 0) {
        const h = this.holdings[a.id];
        if (h && h.shares > 0) {
          const div = h.shares * this.prices[a.id] * a.yield;
          this.cash += div;
          this.dividendsCollected += div;
        }
      }
    }
    // fee drag (garden weeds / expense ratio): skim from cash-equivalent slowly
    if (this.feeDrag > 0) this.cash = Math.max(0, this.cash - this.invested() * this.feeDrag);

    // the buy-and-hold benchmark reinvests the index fund's own dividends
    if (this.step % 12 === 0) {
      const coop = ALL_ASSETS.find((a) => a.id === "coop")!;
      this.benchShares *= 1 + coop.yield;
    }

    this.benchmark = round2(this.benchShares * this.prices["coop"]);
    this.net.push(round2(this.netWorth()));
    this.bench.push(this.benchmark);
  }

  invested(): number {
    let v = 0;
    for (const a of ALL_ASSETS) {
      const h = this.holdings[a.id];
      if (h) v += h.shares * this.prices[a.id];
    }
    return v;
  }

  netWorth(): number { return this.cash + this.invested(); }

  positions(): Position[] {
    const out: Position[] = [];
    for (const a of ALL_ASSETS) {
      const h = this.holdings[a.id];
      if (h && h.shares > 1e-6) {
        const value = h.shares * this.prices[a.id];
        out.push({ asset: a, shares: h.shares, cost: h.cost, value, pnl: value - h.cost });
      }
    }
    return out;
  }

  buy(assetId: string, dollars: number): boolean {
    const p = this.prices[assetId];
    if (dollars <= 0 || dollars > this.cash + 1e-6) return false;
    const shares = dollars / p;
    const h = this.holdings[assetId] ?? { shares: 0, cost: 0 };
    h.shares += shares; h.cost += dollars;
    this.holdings[assetId] = h;
    this.cash -= dollars;
    return true;
  }

  // sell a fraction (0..1) of a holding
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
    return proceeds;
  }

  changePct(assetId: string, lookback = 1): number {
    const h = this.history[assetId];
    const i = Math.max(0, h.length - 1 - lookback);
    if (h.length < 2) return 0;
    return (h[h.length - 1] - h[i]) / h[i];
  }

  // live market cap = base cap scaled by price move since t0 (drives tile size)
  liveCap(assetId: string): number {
    const a = ALL_ASSETS.find((x) => x.id === assetId);
    const h = this.history[assetId];
    if (!a || !h || !h.length) return 0;
    return a.marketCap * (this.prices[assetId] / h[0]);
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 });
}
export function fmtPct(n: number): string {
  const s = (n * 100).toFixed(n >= 0.1 || n <= -0.1 ? 1 : 2);
  return (n >= 0 ? "+" : "") + s + "%";
}
export function sectorOf(id: string): Sector {
  return SECTORS.find((s) => s.id === id) ?? SECTORS[0];
}
