// The finale's asset shelf and plan store: a curated menu of real, name-brand
// assets with static as-of prices, plus the saved-plan reader that the Ready
// page and the select screen both use.
//
// Prices are real closing prices rounded to friendly figures, as of the date
// in READY_AS_OF. They exist so the dollars-to-shares math is real, not so
// this page becomes a quote screen. Every shelf price is checked against the
// verified 2026-01-02 closes by tools/readycheck.mjs; run it after any edit
// here. FUTURE WORK NOTE: live prices later; until then this snapshot is the
// single source, and every surface that shows a price also shows the as-of
// date.
//
// Standards, tagged per docs/course-style.md:
//   CEE Investing 8-2b   find the current prices of stocks and funds
//   CEE Investing 8-5a/b diversification; diversified funds versus singles
//   CEE Investing 8-6a   compare investments and order them by risk
//   CEE Investing 12-2c  cryptocurrencies are speculative (9 to 12 ladder)
//
// Everything here is deterministic and everything stays in localStorage.
// No accounts, no network, nothing typed here leaves the computer.

import { CompSlice } from "./orbModel";

export type ReadyKind = "index" | "stock" | "bond" | "coin";

export interface ReadyAsset {
  id: string;
  name: string;     // the plain name a student knows
  ticker: string;   // the symbol a broker screen would show
  kind: ReadyKind;
  price: number;    // USD, rounded closing price as of READY_AS_OF
  color: string;    // essence hue, Finder-tag family (see orbModel)
  glow: string;     // lighter partner tone for gradient depth
  note: string;     // one complete, honest sentence
}

// Shown wherever a price from this file is shown.
export const READY_AS_OF = "January 2, 2026";

// Shelf order follows the course spine: the broad basket is the default, not
// the advanced move, so funds come first.
export const KIND_META: { kind: ReadyKind; label: string; gloss: string }[] = [
  { kind: "index", label: "Index funds", gloss: "One purchase holds hundreds or thousands of companies at once." },
  { kind: "stock", label: "Single stocks", gloss: "One share follows one company, with all of that company's ups and downs." },
  { kind: "bond", label: "A bond fund", gloss: "One share holds thousands of loans. It moves less than stocks, but it still moves." },
  { kind: "coin", label: "Coins", gloss: "No company stands behind a coin, and coins have the widest swings on this shelf." },
];

export const READY_ASSETS: ReadyAsset[] = [
  // ---- index funds ----
  { id: "voo", name: "Vanguard S&P 500", ticker: "VOO", kind: "index", price: 620, color: "#0057b8", glow: "#6ea8e8",
    note: "One share holds a slice of about five hundred of the largest American companies." },
  { id: "vti", name: "Vanguard Total Market", ticker: "VTI", kind: "index", price: 330, color: "#248a3d", glow: "#7cc98f",
    note: "One share holds a slice of the whole American stock market, thousands of companies at once." },
  { id: "vxus", name: "Vanguard Total International", ticker: "VXUS", kind: "index", price: 75, color: "#00a3a3", glow: "#66cccc",
    note: "One share holds a slice of thousands of companies outside the United States." },
  { id: "qqq", name: "Invesco QQQ", ticker: "QQQ", kind: "index", price: 610, color: "#7a5cc4", glow: "#b39ddb",
    note: "One share holds a slice of one hundred large companies, most of them technology names." },
  { id: "schd", name: "Schwab US Dividend Equity", ticker: "SCHD", kind: "index", price: 27, color: "#b25000", glow: "#e0955c",
    note: "One share holds a slice of about one hundred companies chosen for steady dividends." },
  // ---- single stocks ----
  { id: "aapl", name: "Apple", ticker: "AAPL", kind: "stock", price: 270, color: "#8e8e93", glow: "#d1d1d6",
    note: "Apple makes the iPhone, the Mac, and the software that runs them." },
  { id: "msft", name: "Microsoft", ticker: "MSFT", kind: "stock", price: 480, color: "#0a84ff", glow: "#7cc0ff",
    note: "Microsoft makes Windows and Office, and it rents cloud computers to other companies." },
  { id: "googl", name: "Alphabet", ticker: "GOOGL", kind: "stock", price: 310, color: "#64d2ff", glow: "#b0e8ff",
    note: "Alphabet owns Google search and YouTube." },
  { id: "amzn", name: "Amazon", ticker: "AMZN", kind: "stock", price: 230, color: "#ff9f0a", glow: "#ffcf7a",
    note: "Amazon runs the everything store and rents cloud computers to much of the internet." },
  { id: "nvda", name: "Nvidia", ticker: "NVDA", kind: "stock", price: 185, color: "#30d158", glow: "#8ff0ae",
    note: "Nvidia designs the chips that power games and artificial intelligence." },
  { id: "tsla", name: "Tesla", ticker: "TSLA", kind: "stock", price: 430, color: "#ff2d55", glow: "#ff8fa3",
    note: "Tesla builds electric cars and the batteries behind them, and its price swings hard in both directions." },
  { id: "brkb", name: "Berkshire Hathaway", ticker: "BRK.B", kind: "stock", price: 500, color: "#a2845e", glow: "#d4b795",
    note: "Berkshire Hathaway is one company that owns dozens of others, from insurance to railroads." },
  { id: "jpm", name: "JPMorgan Chase", ticker: "JPM", kind: "stock", price: 325, color: "#5e5ce6", glow: "#a8a6f0",
    note: "JPMorgan Chase is the largest bank in the United States." },
  { id: "wmt", name: "Walmart", ticker: "WMT", kind: "stock", price: 110, color: "#ffd60a", glow: "#ffe97a",
    note: "Walmart sells groceries and nearly everything else in more than ten thousand stores." },
  { id: "ko", name: "Coca-Cola", ticker: "KO", kind: "stock", price: 70, color: "#ff453a", glow: "#ff9d97",
    note: "Coca-Cola has sold the same drink for more than a century and has paid a dividend for more than sixty years." },
  { id: "dis", name: "Disney", ticker: "DIS", kind: "stock", price: 110, color: "#bf5af2", glow: "#e0a9ff",
    note: "Disney owns the parks, the films, and the streaming service that carries them." },
  { id: "v", name: "Visa", ticker: "V", kind: "stock", price: 345, color: "#1a1f71", glow: "#7b82c9",
    note: "Visa moves money between banks every time a card is tapped." },
  // ---- bond fund ----
  { id: "bnd", name: "Vanguard Total Bond Market", ticker: "BND", kind: "bond", price: 75, color: "#64748b", glow: "#a8b5c9",
    note: "One share holds a slice of thousands of loans to the government and to companies." },
  // ---- coins ----
  { id: "btc", name: "Bitcoin", ticker: "BTC", kind: "coin", price: 90000, color: "#f7931a", glow: "#ffc06e",
    note: "Bitcoin is the oldest coin, and its price has fallen by about three quarters twice since 2018." },
  { id: "eth", name: "Ether", ticker: "ETH", kind: "coin", price: 3100, color: "#627eea", glow: "#aab7f0",
    note: "Ether runs a network that other coins and apps are built on, and it swings as hard as Bitcoin does." },
];

export function readyAsset(id: string): ReadyAsset | undefined {
  return READY_ASSETS.find((a) => a.id === id);
}

// Deterministic colors for typed-in custom lines, assigned by position among
// the customs so the same plan always renders the same marble.
export const CUSTOM_COLORS: { color: string; glow: string }[] = [
  { color: "#98989d", glow: "#d1d1d6" },
  { color: "#b0794a", glow: "#ddb287" },
  { color: "#4a90a4", glow: "#9cc9d6" },
  { color: "#8a8f4a", glow: "#c4c98f" },
];

// ---------------------------------------------------------------------------
// The saved plan. localStorage only; no accounts; nothing leaves the browser.
// ---------------------------------------------------------------------------

export interface ReadyLine {
  key: string;       // unique within the plan
  assetId?: string;  // set when the line came from the shelf above
  label?: string;    // set when the line was typed in by hand
  dollars: number;
}

export type ReadyPath = "first" | "own";

export interface ReadyPlan {
  path: ReadyPath;
  lines: ReadyLine[];
  savedAt: string;   // ISO date of the last edit
}

const KEY = "orb-ready-plan";

// A plan holds at most this many lines, so the printed sheet is always one
// Letter page at 0.5in margins. The Ready page enforces the cap on entry;
// the loader enforces it on anything already stored.
export const MAX_PLAN_LINES = 12;

export function loadReadyPlan(): ReadyPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ReadyPlan>;
    if ((p.path !== "first" && p.path !== "own") || !Array.isArray(p.lines)) return null;
    const lines = p.lines
      .filter((l): l is ReadyLine => !!l && typeof l.key === "string" && typeof l.dollars === "number")
      .map((l) => ({ key: l.key, assetId: l.assetId, label: l.label, dollars: Math.max(0, l.dollars) }))
      .slice(0, MAX_PLAN_LINES);
    return { path: p.path, lines, savedAt: typeof p.savedAt === "string" ? p.savedAt : "" };
  } catch {
    return null;
  }
}

export function saveReadyPlan(plan: ReadyPlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
  } catch {
    // private browsing; the plan holds for this session only
  }
}

export function clearReadyPlan(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

// ---------------------------------------------------------------------------
// Derived views: resolved lines, marble slices, and the mirror's readings.
// ---------------------------------------------------------------------------

export interface ResolvedLine {
  key: string;
  name: string;
  sub: string;               // "VOO · index fund" or "typed in by hand"
  kind: ReadyKind | "custom";
  price?: number;            // absent for custom lines
  color: string;
  glow: string;
  dollars: number;
}

const KIND_WORD: Record<ReadyKind, string> = {
  index: "index fund",
  stock: "stock",
  bond: "bond fund",
  coin: "coin",
};

export function resolvePlan(lines: ReadyLine[]): ResolvedLine[] {
  let customIdx = 0;
  return lines.map((l) => {
    const a = l.assetId ? readyAsset(l.assetId) : undefined;
    if (a) {
      return {
        key: l.key, name: a.name, sub: `${a.ticker} · ${KIND_WORD[a.kind]}`,
        kind: a.kind, price: a.price, color: a.color, glow: a.glow, dollars: l.dollars,
      };
    }
    const c = CUSTOM_COLORS[customIdx % CUSTOM_COLORS.length];
    customIdx += 1;
    return {
      key: l.key, name: (l.label ?? "").trim() || "Something of mine", sub: "typed in by hand",
      kind: "custom", color: c.color, glow: c.glow, dollars: l.dollars,
    };
  });
}

export function planTotal(lines: ReadyLine[]): number {
  return lines.reduce((s, l) => s + Math.max(0, l.dollars), 0);
}

// The marble's liquid: one slice per funded line, area shares by dollars.
export function planSlices(lines: ReadyLine[]): CompSlice[] {
  const rl = resolvePlan(lines).filter((l) => l.dollars > 0);
  const total = rl.reduce((s, l) => s + l.dollars, 0);
  if (total <= 0) return [];
  return rl.map((l) => ({ key: l.key, color: l.color, glow: l.glow, frac: l.dollars / total }));
}

// One reading from the mirror. Tones only color the card; the words carry the
// judgment. Every reading looks backward at eras the course already played;
// none of them predicts anything.
export interface MirrorLine {
  tone: "watch" | "steady" | "note";
  text: string;
}

const usd = (v: number) =>
  "$" + Math.round(v).toLocaleString("en-US");

export function mirrorLines(lines: ReadyLine[]): MirrorLine[] {
  const rl = resolvePlan(lines).filter((l) => l.dollars > 0);
  const total = rl.reduce((s, l) => s + l.dollars, 0);
  if (rl.length === 0 || total <= 0) return [];

  const out: MirrorLine[] = [];
  const largest = rl.reduce((m, l) => (l.dollars > m.dollars ? l : m));
  const lf = largest.dollars / total;
  const pct = (f: number) => Math.round(f * 100);
  // set when the concentration reading already told the fund-majority story,
  // so the broad-fund reading below does not repeat it
  let largestIsFundMajority = false;

  // Concentration, read against the eras. CEE Investing 8-5a.
  if (rl.length === 1) {
    if (largest.kind === "index") {
      out.push({
        tone: "steady",
        text: `This plan is one broad fund. That is one line on the screen, but inside that one share are hundreds of companies, so the orb is far more spread out than it looks.`,
      });
    } else if (largest.kind === "bond") {
      out.push({
        tone: "note",
        text: `This plan is one bond fund. Inside it are thousands of separate loans, so it is spread out, but it holds no share of any company's growth.`,
      });
    } else if (largest.kind === "coin") {
      // the coin reading below carries the winters math for this plan
      out.push({
        tone: "watch",
        text: `Every dollar here rides one coin, with no company behind it and no other colors to catch it.`,
      });
    } else {
      out.push({
        tone: "watch",
        text: `Every dollar here lives in ${largest.name}. In 2002 WorldCom went to zero, and in 2008 Lehman Brothers went to zero, and both were giants until the day they were not. A one-name orb has no other colors to catch it.`,
      });
    }
  } else if (lf >= 0.5 && largest.kind === "index") {
    largestIsFundMajority = true;
    out.push({
      tone: "steady",
      text: `${largest.name} is ${pct(lf)} percent of this orb, and it is a broad fund, so those dollars are already spread across hundreds of companies.`,
    });
  } else if (lf >= 0.5) {
    out.push({
      tone: "watch",
      text: `${largest.name} is ${pct(lf)} percent of this orb. In the eras you played, the players who let one favorite grow past half watched a single bad year undo several good ones.`,
    });
  } else if (lf >= 0.3 && largest.kind !== "index") {
    out.push({
      tone: "watch",
      text: `${largest.name} is ${pct(lf)} percent of this orb. That is a large slice for a single name; in the dot-com era, the orbs that made it through were the ones where no single color could sink the whole marble.`,
    });
  } else {
    out.push({
      tone: "steady",
      text: `No single name is more than ${pct(lf)} percent of this orb. In every era in this course, that kind of spread is what let players keep holding through the bad year.`,
    });
  }

  // Broad-fund presence. CEE Investing 8-5b.
  const indexDollars = rl.filter((l) => l.kind === "index").reduce((s, l) => s + l.dollars, 0);
  const indexFrac = indexDollars / total;
  if (indexFrac === 0 && rl.length > 1) {
    out.push({
      tone: "watch",
      text: `There is no broad fund in this mix. In the eras you played, some companies never came back after a crash, and the broad index eventually did, so this orb carries every name's risk with no basket underneath.`,
    });
  } else if (indexFrac >= 0.5 && rl.length > 1 && !largestIsFundMajority) {
    out.push({
      tone: "steady",
      text: `Broad funds are ${pct(indexFrac)} percent of this orb. One fund share is a slice of hundreds of companies, so most of this orb does not depend on any single name.`,
    });
  } else if (indexFrac > 0 && rl.length > 1 && !largestIsFundMajority) {
    out.push({
      tone: "steady",
      text: `A broad fund holds ${pct(indexFrac)} percent of this orb. Those dollars are spread across hundreds of companies at once.`,
    });
  }

  // Coin position size. CEE Investing 12-2c; the coins lesson's core idea.
  const coinDollars = rl.filter((l) => l.kind === "coin").reduce((s, l) => s + l.dollars, 0);
  const coinFrac = coinDollars / total;
  if (coinFrac >= 0.25) {
    out.push({
      tone: "watch",
      text: `Coins are ${pct(coinFrac)} percent of this orb, about ${usd(coinDollars)}. In the winters of 2018 and 2022, coins lost about three quarters of their value, and a fall like those would have cut this slice to about ${usd(coinDollars * 0.25)}.`,
    });
  } else if (coinFrac > 0) {
    out.push({
      tone: "steady",
      text: `Coins are ${pct(coinFrac)} percent of this orb. In the 2022 winter, a slice this size would have lost about ${usd(coinDollars * 0.75)} while the rest of the orb stood, which is position size doing its job.`,
    });
  }

  // The quiet slice is not frozen. Ties back to the inflation era.
  const bondFrac = rl.filter((l) => l.kind === "bond").reduce((s, l) => s + l.dollars, 0) / total;
  if (bondFrac > 0 && rl.length > 1) {
    out.push({
      tone: "note",
      text: `The bond fund is the quiet slice of this orb, and quiet is not frozen. In 2022, when rates jumped, even bond funds fell hard before they steadied.`,
    });
  }

  // The crash rehearsal, always last. Backward framing only: this is what the
  // 2008 era already did, priced against this plan. CEE Investing 8-6a.
  out.push({
    tone: "note",
    text: `In 2008, the broad market fell about half from its peak. A fall like that one would have taken this ${usd(total)} orb to about ${usd(total / 2)} without taking away a single share. No chart said in advance when that fall would start or stop, which is why this course taught size and spread instead of timing.`,
  });

  return out;
}

// The exact sentence both paths show. Quoted in docs/overnight-plan.md.
export const READY_MIRROR_LINE = "This is a mirror, not advice. Nothing you type leaves this computer.";
