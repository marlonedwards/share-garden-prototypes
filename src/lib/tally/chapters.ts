// The eight chapters: their prices, their units, their stakes and their
// targets. This module is the curriculum, expressed as arithmetic.
//
// Two rules drive every number in here.
//
// 1. THE WALL STAYS COUNTABLE. A column is never taller than forty blocks and
//    never shorter than eight, so a player can count it at a glance. The unit
//    is exactly x4 and it promotes only between chapters, which means a single
//    chapter can never grow the wall by more than five times. Every stake,
//    every income and every authored series in this file is tuned inside that
//    box.
//
// 2. THE TARGET IS THE LESSON. A chapter's target is 95% of what buying the
//    basket on turn one and never trading again would have produced, and that
//    one rule does the teaching by arithmetic: cash stops clearing after
//    chapter 2, tracking the market clears everything with a margin, and one
//    concentrated name clears sometimes and misses more often, because that is
//    what the real prices do.
//
// The targets are not typed in by hand. referenceLadder() plays the whole
// ladder with the reference strategy, using this file's own numbers, and the
// targets fall out of it. Retuning a chapter retunes its target, which is the
// only honest way to keep rule 7 of the reward function contract: if a chapter
// can be cleared by bad practice, the target moves, never the rules.
//
// Chapters 1 to 5 and 8 use authored illustrative series, the way the intro
// lessons use Maya's lemonade stand, and their chapter cards say so. Chapters
// 6 and 7 are the real datasets already shipped in src/data.
import { gfc } from "../../content/era-gfc";
import { crypto } from "../../content/era-crypto";
import { dotcom } from "../../content/era-dotcom";
import { ScenarioConfig } from "../../content/types";
import { HEADLINES, Clipping } from "../headlines";
import {
  TallyAsset, SAVINGS, BOND, INDEX_FUND, SAVINGS_ID, BOND_ID, INDEX_ID,
  SAVINGS_PRICE, eraAssets, blocksPerCard,
} from "./deck";

// ---------------------------------------------------------------- the unit

// The Tally's own ladder, exactly x4 at every step. This is not
// BLOCK_LADDER from src/lib/blocks.ts, which belongs to the older /stack
// prototype and starts at $50. The Tally starts at $5 because chapter 1 is a
// piggy bank, and a piggy bank counted in fifty dollar blocks is a lie.
export const TALLY_LADDER = [5, 20, 80, 320, 1280];

// the wall stays countable between these two, grouped in fives
export const WALL_MAX_BLOCKS = 40;
export const WALL_MIN_BLOCKS = 8;

// The unit promotes when the chapter you are about to start would put the wall
// over forty blocks at the current unit. It promotes one rung at a time, and
// it never promotes inside a chapter.
export function ceremonyStep(dollars: number, denom: number): number {
  const i = TALLY_LADDER.indexOf(denom);
  if (i < 0 || i === TALLY_LADDER.length - 1) return denom;
  return dollars / denom > WALL_MAX_BLOCKS ? TALLY_LADDER[i + 1] : denom;
}

// How many ceremonies fire between two chapters, and what the unit becomes.
// Consecutive ceremonies are allowed, because one x4 is not always enough.
export function promoteUnit(dollars: number, denom: number): { denom: number; ceremonies: number } {
  let d = denom;
  let n = 0;
  for (;;) {
    const next = ceremonyStep(dollars, d);
    if (next === d) break;
    d = next;
    n++;
  }
  return { denom: d, ceremonies: n };
}

// ------------------------------------------------------- illustrative cast

// The illustrative chapters borrow the course's own cast. Maya runs the
// lemonade stand in every intro lesson, so her stand is the first company a
// player ever owns a slice of.
export const LEMON_ID = "LEMON";
export const HARBOR_ID = "HARBOR";
export const BEACON_ID = "BEACON";
export const COPPER_ID = "COPPER";
export const NIMBUS_ID = "NIMBUS";
export const VANTAGE_ID = "VANTAGE";
export const CEDAR_ID = "CEDAR";
export const HALCYON_ID = "HALCYON";

const ILLUSTRATIVE_CAST: TallyAsset[] = [
  {
    id: LEMON_ID, name: "Maya's Lemonade",
    desc: "Maya's lemonade stand is cut into equal pieces, and one card is a few of those pieces.",
    suit: "own", sector: "retail", color: "#ffd60a", glow: "#ffe97a",
    carry: "settle", illustrative: true,
  },
  {
    id: HARBOR_ID, name: "Harbor Scooters",
    desc: "Harbor Scooters rents scooters by the pier, and it borrowed a great deal of money to buy them.",
    suit: "own", sector: "industry", color: "#a2845e", glow: "#d4b795",
    carry: "settle", illustrative: true,
  },
  {
    id: BEACON_ID, name: "Beacon Health",
    desc: "Beacon Health runs clinics, and people need clinics in every kind of year.",
    suit: "own", sector: "health", color: "#30d158", glow: "#8ff0ae",
    carry: "settle", illustrative: true,
  },
  {
    id: COPPER_ID, name: "Copper Power",
    desc: "Copper Power sells electricity, and its profit rises and falls with the price of fuel.",
    suit: "own", sector: "energy", color: "#8e8e93", glow: "#c7c7cc",
    carry: "settle", illustrative: true,
  },
  {
    id: NIMBUS_ID, name: "Nimbus Software",
    desc: "Nimbus Software rents its programs by the month, and it is growing faster than anything else on the table.",
    suit: "own", sector: "tech", color: "#0a84ff", glow: "#7cc0ff",
    carry: "settle", illustrative: true,
  },
  {
    id: VANTAGE_ID, name: "Vantage Rail",
    desc: "Vantage Rail moves freight across the country, and it has done it the same way for a century.",
    suit: "own", sector: "industry", color: "#a2845e", glow: "#d4b795",
    carry: "settle", illustrative: true,
  },
  {
    id: CEDAR_ID, name: "Cedar Homes",
    desc: "Cedar Homes builds houses, and it sells more of them in some decades than in others.",
    suit: "own", sector: "property", color: "#ff9f0a", glow: "#ffcf7a",
    carry: "settle", illustrative: true,
  },
  {
    id: HALCYON_ID, name: "Halcyon Health",
    desc: "Halcyon Health makes medicine, and it spends years testing every one of them.",
    suit: "own", sector: "health", color: "#30d158", glow: "#8ff0ae",
    carry: "settle", illustrative: true,
  },
];

// Every asset the game can put on a table, by id.
export const ASSETS: Record<string, TallyAsset> = {};
for (const a of [SAVINGS, BOND, INDEX_FUND, ...ILLUSTRATIVE_CAST]) ASSETS[a.id] = a;
for (const cfg of [gfc, crypto, dotcom]) for (const a of eraAssets(cfg)) ASSETS[a.id] = a;

export function assetOf(id: string): TallyAsset {
  const a = ASSETS[id];
  if (!a) throw new Error(`unknown Tally asset: ${id}`);
  return a;
}

// ------------------------------------------------------------ chapter shape

export type ChapterSource =
  | { kind: "era"; eraId: string; steps: number[] }
  | { kind: "authored"; series: Record<string, number[]>; marks: string[] };

export interface ChapterDef {
  id: number;
  name: string;
  // one or two complete sentences for the chapter card, in course voice
  tagline: string;
  // what the chapter teaches, for the collector's box and /objectives
  teaches: string;
  // what clearing it puts on the table for good
  unlockLabel: string;
  turnUnit: string;        // "a week", "a month", "a quarter", "a year", "ten years"
  turns: number;
  yearsPerTurn: number;    // how much real time one turn covers, for the rate cards
  denom: number;           // the unit this chapter expects to run at
  stakeBlocks: number;     // blocks handed over at the chapter card
  incomeBlocks: number;    // blocks that arrive on every single turn
  illustrative: boolean;
  market: string[];        // asset ids on the strip, in strip order, bottom up on the wall
  unlocks: string[];       // asset ids that first become buyable here
  fieldGuide: string[];    // field guide concepts that open when the chapter opens
  // What the calibration reference buys on turn one: the basket where the
  // chapter has one, and otherwise an equal spread across the growth cards,
  // which is the closest honest analogue a chapter without a rainbow card
  // allows. Chapters 3 and 4 are the only two that use the spread.
  referenceSpread: string[];
  source: ChapterSource;
  // Chapters 1 and 2 have no basket and no company to calibrate against, so
  // their floors are authored. Both are clearable by sitting in cash, and no
  // chapter after them is.
  fixedTarget?: number;
}

export interface Chapter extends ChapterDef {
  // the floor, in dollars, checked at the end of the last turn
  target: number;
  // what a run that starts here begins with, in dollars of cash, so a deep
  // start point is neither a handicap nor a gift
  freshStartDollars: number;
  // the unit a reference run is holding when this chapter opens
  openingDenom: number;
  // how many ceremonies fire on the way into this chapter, for a reference run
  ceremonies: number;
  // what the reference strategy finishes this chapter holding, in dollars
  referenceEnd: number;
  wallMinBlocks: number;
  wallMaxBlocks: number;
  // the labels down the wall, one per turn boundary
  marks: string[];
}

// ---------------------------------------------------------- savings, paid

// What a savings account pays, per chapter, per year. A savings card's worth
// never moves, so this number never touches a price: it is credited into cash
// at the end of every turn, on the savings a player was holding through that
// turn, and it is stated on the card face beside the card it belongs to.
//
// There are two rates and the split is deliberate. Chapters 1 to 5 run on
// authored numbers and say so on their chapter card, the way the course's own
// lessons run on Maya's lemonade stand, so they use a rate chunky enough that
// the payment is a number a player can see arrive at a five dollar block: at
// chapter 2's scale it pays a little over a dollar a turn on a full pile, and
// four turns of it buys another card. Chapters 6 to 8 are the honest ones, so
// they pay the honest rate, and 2 percent a year on a quarterly or yearly turn
// is exactly as small as a real deposit account is. Nothing anywhere is a
// reward for trading: this accrues from holding and from nothing else.
export const SAVINGS_RATE_ILLUSTRATIVE = 0.12;
export const SAVINGS_RATE = 0.02;

export function savingsRate(ch: ChapterDef): number {
  return ch.id <= 5 ? SAVINGS_RATE_ILLUSTRATIVE : SAVINGS_RATE;
}

// What one turn of holding pays, as a fraction of the savings held, at this
// chapter's rate over this chapter's span.
export function interestPerTurn(ch: ChapterDef): number {
  return Math.pow(1 + savingsRate(ch), ch.yearsPerTurn) - 1;
}

// ------------------------------------------------------- authored series

// A basket is the average of what it holds. The illustrative index series is
// literally computed that way rather than typed in, so "one card that holds
// all of them, and it is not the fastest one" is true by arithmetic instead of
// by assertion.
export function basketPath(members: number[][], startPrice: number): number[] {
  const n = members[0].length;
  const out: number[] = [];
  for (let t = 0; t < n; t++) {
    let sum = 0;
    for (const m of members) sum += m[t] / m[0];
    out.push(round2(startPrice * (sum / members.length)));
  }
  return out;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

// Chapter 3: a price moves, and your card count does not move with it. The
// stand has a bad month in the middle on purpose.
const LEMON_C3 = [40, 44, 39, 46, 55, 64, 72];
// Chapter 4: the same stand keeps climbing while the second name dies.
const LEMON_C4 = [72, 76, 71, 80, 85, 90, 93.6];
const HARBOR_C4 = [30, 26, 19, 11, 4, 0, 0];
// Chapter 5: four companies and the basket that holds them.
const LEMON_C5 = [93.6, 96, 99, 103, 107.64];
const BEACON_C5 = [50, 53, 57, 61, 65];
const COPPER_C5 = [25, 24, 21, 19, 18.75];
const NIMBUS_C5 = [120, 138, 160, 190, 228];
const INDEX_C5 = basketPath([LEMON_C5, BEACON_C5, COPPER_C5, NIMBUS_C5], 100);
// Chapter 8: forty years, one mark every ten. Cedar Homes has a flat decade
// in the middle, because property does that, and the basket still climbs.
const VANTAGE_C8 = [100, 132, 168, 224, 275];
const CEDAR_C8 = [100, 126, 160, 236, 320];
const HALCYON_C8 = [100, 148, 205, 285, 395];
const INDEX_C8 = basketPath([VANTAGE_C8, CEDAR_C8, HALCYON_C8], 100);

// ------------------------------------------------------------- era helpers

// The dotcom era is here on purpose and it is not dead code. Spec 13.2.1
// leaves chapter 7 as either dotcom or crypto, to be picked by playtest;
// crypto is cast in the chapter today and dotcom is the documented
// alternative, kept whole with its own headlines and its own behind-the-page
// copy so the swap stays a one line change.
export const ERAS: Record<string, ScenarioConfig> = { gfc, crypto, dotcom };

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

// every twelfth month from January 2007, ending on the era's last month, so a
// turn is a calendar year and the last column is December 2015
const GFC_STEPS = [0, 11, 23, 35, 47, 59, 71, 83, 95, 107];
// every third month from January 2018 to January 2023, so a turn is a quarter
const CRYPTO_STEPS: number[] = [];
for (let s = 0; s <= 60; s += 3) CRYPTO_STEPS.push(s);

// ------------------------------------------------------------- definitions

// CEE Personal Finance 8-1 (income and saving); concept: a pile that does
// nothing stays the same size
const CH1: ChapterDef = {
  id: 1,
  name: "The piggy bank",
  tagline: "Money you keep is a countable pile. Nothing here can go wrong, and nothing here grows on its own.",
  teaches: "A pile of money is a countable number of blocks, and a pile that does nothing stays the same size.",
  unlockLabel: "the wall",
  turnUnit: "a week", turns: 6, yearsPerTurn: 1 / 52,
  denom: 5, stakeBlocks: 8, incomeBlocks: 2,
  illustrative: true,
  market: [], unlocks: [], fieldGuide: [],
  referenceSpread: [],
  source: { kind: "authored", series: {}, marks: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"] },
  fixedTarget: 85,
};

// CEE Personal Finance 8-3 (saving and interest); concept: compounding
//
// The floor is authored rather than calibrated, because this chapter has no
// basket to calibrate against and because chapters 1 and 2 are the two a player
// can still clear sitting in cash. Under the arithmetic this chapter actually
// runs on: a pile that does nothing ends at $170, a pile put on deposit on turn
// one and left alone ends at $182, and a player who puts each payment back into
// another card ends at $184. The floor sits one block under the pile that did
// nothing, so doing nothing clears by a block and the bank clears by four.
const CH2: ChapterDef = {
  id: 2,
  name: "Savings",
  tagline: "A savings account pays you a little every month for leaving your money alone. The card itself never moves, up or down, and what it pays arrives as money.",
  teaches: "A savings card never moves, and the bank pays interest on every one you are holding.",
  unlockLabel: "the green ring",
  turnUnit: "a month", turns: 10, yearsPerTurn: 1 / 12,
  denom: 5, stakeBlocks: 4, incomeBlocks: 1,
  illustrative: true,
  market: [SAVINGS_ID], unlocks: [SAVINGS_ID], fieldGuide: [],
  referenceSpread: [SAVINGS_ID],
  source: {
    kind: "authored", series: {},
    marks: ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6", "Month 7", "Month 8", "Month 9", "Month 10", "Month 11"],
  },
  fixedTarget: 165,
};

// CEE Investing 8-1 (a share is ownership) with 8-2 (share prices change);
// concept: market-price
const CH3: ChapterDef = {
  id: 3,
  name: "Prices",
  tagline: "A share is one small piece of a real company, and its price changes every month. Your card count never changes with it.",
  teaches: "A price moves, and the number of cards you own does not move with it.",
  unlockLabel: "the amber ring",
  turnUnit: "a month", turns: 6, yearsPerTurn: 1 / 12,
  denom: 20, stakeBlocks: 3, incomeBlocks: 1,
  illustrative: true,
  market: [SAVINGS_ID, LEMON_ID], unlocks: [LEMON_ID], fieldGuide: ["market-price"],
  referenceSpread: [LEMON_ID],
  source: {
    kind: "authored",
    series: { [LEMON_ID]: LEMON_C3 },
    marks: ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6", "Month 7"],
  },
};

// CEE Investing 8-4 (the risk of owning a single company); concept:
// position-size
const CH4: ChapterDef = {
  id: 4,
  name: "Two names",
  tagline: "Position size is how much of your money you put on one company, and with two companies on the table, this is where you choose it.",
  teaches: "The first real choice, and one of the two names falls to nothing.",
  unlockLabel: "the discard pile and the stone",
  turnUnit: "a month", turns: 6, yearsPerTurn: 1 / 12,
  denom: 20, stakeBlocks: 3, incomeBlocks: 1,
  illustrative: true,
  market: [SAVINGS_ID, LEMON_ID, HARBOR_ID], unlocks: [HARBOR_ID], fieldGuide: ["position-size"],
  referenceSpread: [LEMON_ID, HARBOR_ID],
  source: {
    kind: "authored",
    series: { [LEMON_ID]: LEMON_C4, [HARBOR_ID]: HARBOR_C4 },
    marks: ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6", "Month 7"],
  },
};

// CEE Investing 8-5a (diversification within and among asset classes);
// concept: index-fund
const CH5: ChapterDef = {
  id: 5,
  name: "The fund",
  tagline: "An index fund is one purchase that holds every company on this table at once. It is never the fastest card here, and it is never the one that dies.",
  teaches: "One card holds all of them, and it is not the fastest one.",
  unlockLabel: "the rainbow ring",
  turnUnit: "a quarter", turns: 4, yearsPerTurn: 0.25,
  denom: 80, stakeBlocks: 3, incomeBlocks: 1,
  illustrative: true,
  market: [SAVINGS_ID, LEMON_ID, BEACON_ID, COPPER_ID, NIMBUS_ID, INDEX_ID],
  unlocks: [BEACON_ID, COPPER_ID, NIMBUS_ID, INDEX_ID],
  fieldGuide: ["index-fund"],
  referenceSpread: [INDEX_ID],
  source: {
    kind: "authored",
    series: {
      [LEMON_ID]: LEMON_C5, [BEACON_ID]: BEACON_C5, [COPPER_ID]: COPPER_C5,
      [NIMBUS_ID]: NIMBUS_C5, [INDEX_ID]: INDEX_C5,
    },
    marks: ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4", "Quarter 5"],
  },
};

// CEE Investing 8-4 (risks of owning single stocks), 8-5a (diversification)
// and the 12-5c ladder (downturns move asset prices); concepts: crash,
// panic-selling
const CH6: ChapterDef = {
  id: 6,
  name: "The panic",
  tagline: "These are the real prices from January 2007 to December 2015, and one of these banks does not come back. A whole industry falls in the same year.",
  teaches: "A real panic, on real prices, where every card with the same pip falls together.",
  unlockLabel: "the sector pips and the bond",
  turnUnit: "a year", turns: 9, yearsPerTurn: 1,
  denom: 80, stakeBlocks: 1, incomeBlocks: 1,
  illustrative: false,
  market: [SAVINGS_ID, BOND_ID, "C", "AIG", "LEH", "GE", "F", "WMT", "AAPL", "XOM", "AMZN", INDEX_ID],
  unlocks: [BOND_ID, "C", "AIG", "LEH", "GE", "F", "WMT", "AAPL", "XOM", "AMZN"],
  fieldGuide: ["crash", "panic-selling"],
  referenceSpread: [INDEX_ID],
  source: { kind: "era", eraId: "gfc", steps: GFC_STEPS },
};

// CEE Investing 12-2c ladder (speculative assets and the greater fool) with
// 12-5b (expectations are already in the price); concept: bubble
const CH7: ChapterDef = {
  id: 7,
  name: "The mania",
  tagline: "These are the real coin prices from January 2018 to January 2023. A coin is not a company, so it earns nothing, and its price is whatever the next buyer will pay.",
  teaches: "What a price with nothing behind it eventually does, twice, on real prices.",
  unlockLabel: "the red ring",
  turnUnit: "a quarter", turns: CRYPTO_STEPS.length - 1, yearsPerTurn: 0.25,
  denom: 320, stakeBlocks: 1, incomeBlocks: 1,
  illustrative: false,
  market: [SAVINGS_ID, BOND_ID, "BTC-USD", "ETH-USD", "LTC-USD", "XRP-USD", "DOGE-USD", "BCC", INDEX_ID],
  unlocks: ["BTC-USD", "ETH-USD", "LTC-USD", "XRP-USD", "DOGE-USD", "BCC"],
  fieldGuide: ["bubble"],
  referenceSpread: [INDEX_ID],
  source: { kind: "era", eraId: "crypto", steps: CRYPTO_STEPS },
};

// CEE Personal Finance 8-3 (compounding over long horizons) and CEE
// Investing 8-5b (time in the market); concept: compounding
const CH8: ChapterDef = {
  id: 8,
  name: "The long run",
  tagline: "Compounding is growth that goes on to grow by itself, so watch how many blocks each of these four ten year turns adds.",
  teaches: "What compounding actually looks like when nobody touches it.",
  unlockLabel: "the finale",
  turnUnit: "ten years", turns: 4, yearsPerTurn: 10,
  denom: 1280, stakeBlocks: 1, incomeBlocks: 1,
  illustrative: true,
  market: [SAVINGS_ID, BOND_ID, VANTAGE_ID, CEDAR_ID, HALCYON_ID, INDEX_ID],
  unlocks: [VANTAGE_ID, CEDAR_ID, HALCYON_ID],
  fieldGuide: ["compounding"],
  referenceSpread: [INDEX_ID],
  source: {
    kind: "authored",
    series: {
      [VANTAGE_ID]: VANTAGE_C8, [CEDAR_ID]: CEDAR_C8,
      [HALCYON_ID]: HALCYON_C8, [INDEX_ID]: INDEX_C8,
    },
    marks: ["Year 0", "Year 10", "Year 20", "Year 30", "Year 40"],
  },
};

export const CHAPTER_DEFS: ChapterDef[] = [CH1, CH2, CH3, CH4, CH5, CH6, CH7, CH8];

// ---------------------------------------------------------------- prices

// Every asset on a chapter's table has a price on every turn boundary,
// including the bond, which simply has a price that only ever goes up, and
// savings, whose price is the same number on every turn of every chapter.
// Unifying them means the wall, the card face and the trade log all use one
// code path, and a savings card holds shares the same way a company card does.
//
// carryPrice holds the last price the bond reached, so it is continuous across
// a whole run instead of restarting every chapter.
export function chapterPrices(
  ch: ChapterDef,
  carryPrice: Record<string, number> = {},
): Record<string, number[]> {
  const marks = ch.turns + 1;
  const out: Record<string, number[]> = {};
  for (const id of ch.market) {
    const asset = assetOf(id);
    // savings does not have a price series so much as a number it stands at,
    // and a card's worth is the dollars that went into it for as long as it is
    // held
    if (asset.carry === "flat") {
      out[id] = new Array(marks).fill(SAVINGS_PRICE);
      continue;
    }
    if (asset.carry === "rate") {
      const start = carryPrice[id] ?? (id === BOND_ID ? 100 : 10);
      const per = Math.pow(1 + (asset.ratePerYear ?? 0), ch.yearsPerTurn);
      const arr: number[] = [];
      for (let t = 0; t < marks; t++) arr.push(round2(start * Math.pow(per, t)));
      out[id] = arr;
      continue;
    }
    if (ch.source.kind === "era") {
      const cfg = ERAS[ch.source.eraId];
      const key = id === INDEX_ID ? cfg.indexKey : id;
      const series = cfg.dataset.series[key];
      out[id] = ch.source.steps.map((s) => series[s]);
      continue;
    }
    const authored = ch.source.series[id];
    if (!authored) throw new Error(`chapter ${ch.id} has no series for ${id}`);
    out[id] = authored;
  }
  return out;
}

// The label under each column of the wall.
export function chapterMarks(ch: ChapterDef): string[] {
  if (ch.source.kind === "era") {
    const cfg = ERAS[ch.source.eraId];
    return ch.source.steps.map((s) => monthLabel(cfg.dataset.months[s]));
  }
  return ch.source.marks;
}

// The month an era chapter's turn boundary lands on, for the front page and
// for anything that needs the honest date. Null for illustrative chapters.
export function chapterMonths(ch: ChapterDef): string[] | null {
  if (ch.source.kind !== "era") return null;
  const cfg = ERAS[ch.source.eraId];
  return ch.source.steps.map((s) => cfg.dataset.months[s]);
}

// ------------------------------------------------------------- the fine grid

// The wall draws a record, not a bar per decision, so it asks the chapter for
// the finest honest grid the chapter has. An era chapter carries a real monthly
// price for every month between two turn boundaries, so a nine turn chapter is
// about ninety six drawn columns and the shape of 2008 is visible inside the
// year it happened. An authored chapter has one price per turn and nothing
// underneath it, so its grid is its turns and the wall draws exactly what it
// drew before. Nothing here interpolates a price that was never quoted.
export interface WallSlot {
  // the turn boundary this slot closes. Slot 0 is the chapter's opening mark
  // and has turn 0; every other slot has turn t >= 1 and carries the holdings
  // the player was left with after turn t-1.
  turn: number;
  // how far through that turn's span the slot sits, in (0, 1]. The opening
  // slot is 0.
  frac: number;
  boundary: boolean;
  // the dataset month, for an era chapter
  step: number | null;
  label: string;
}

export function chapterSlots(ch: ChapterDef): WallSlot[] {
  const marks = chapterMarks(ch);
  if (ch.source.kind !== "era") {
    const out: WallSlot[] = [{ turn: 0, frac: 0, boundary: true, step: null, label: marks[0] ?? "" }];
    for (let t = 1; t <= ch.turns; t++) {
      out.push({ turn: t, frac: 1, boundary: true, step: null, label: marks[t] ?? "" });
    }
    return out;
  }
  const cfg = ERAS[ch.source.eraId];
  const steps = ch.source.steps;
  const out: WallSlot[] = [
    { turn: 0, frac: 0, boundary: true, step: steps[0], label: marks[0] ?? "" },
  ];
  for (let t = 1; t <= ch.turns; t++) {
    const from = steps[t - 1];
    const to = steps[t];
    const span = Math.max(1, to - from);
    for (let m = from + 1; m <= to; m++) {
      out.push({
        turn: t,
        frac: (m - from) / span,
        boundary: m === to,
        step: m,
        label: m === to ? marks[t] ?? "" : monthLabel(cfg.dataset.months[m] ?? ""),
      });
    }
  }
  return out;
}

// What one asset cost on the month a slot sits on. An era chapter reads the
// real month out of the dataset. Everything else, which is every rate
// instrument and every authored series, rides geometrically between the two
// turn boundaries it lies between, which is exact at both ends and is the only
// thing a savings account does anyway.
export function slotPrice(
  ch: ChapterDef,
  id: string,
  slot: WallSlot,
  boundaryPrices: number[] | undefined,
): number {
  const at = (t: number) => boundaryPrices?.[Math.max(0, Math.min(t, (boundaryPrices?.length ?? 1) - 1))] ?? 0;
  if (slot.turn === 0 || slot.frac >= 1) return at(slot.turn);
  const carry = assetOf(id).carry;
  if (ch.source.kind === "era" && slot.step !== null && carry !== "rate" && carry !== "flat") {
    const cfg = ERAS[ch.source.eraId];
    const key = id === INDEX_ID ? cfg.indexKey : id;
    const series = cfg.dataset.series[key];
    const p = series?.[slot.step];
    if (p !== undefined) return p;
  }
  const a = at(slot.turn - 1);
  const b = at(slot.turn);
  if (a <= 0 || b <= 0) return a + (b - a) * slot.frac;
  return a * Math.pow(b / a, slot.frac);
}

// A company that lists partway through an era slides in with a NEW flash on
// the month it actually listed, which is the only other honest way a card can
// enter the market.
export function listedTurn(ch: ChapterDef, assetId: string): number {
  if (ch.source.kind !== "era") return 0;
  const cfg = ERAS[ch.source.eraId];
  const ea = cfg.assets.find((a) => a.id === assetId);
  const at = ea?.listedAtStep ?? 0;
  if (at <= 0) return 0;
  for (let t = 0; t < ch.source.steps.length; t++) if (ch.source.steps[t] >= at) return t;
  return ch.turns;
}

// ------------------------------------------------------------ front pages

// The front page is how history arrives: up to three real headlines, each one
// line on its face, each opening at most two sentences behind a tap. The
// headlines are verbatim from src/lib/headlines.ts, which is verbatim from
// named publications on named dates. The two sentences behind them are
// written here, in the course voice, out of the dated record the era modules
// already carry. Nothing on this page is invented and nothing is paraphrased.
export interface FrontPageHeadline {
  date: string;
  source: string;
  face: string;      // verbatim, one line
  behind: string;    // at most two sentences, written in course voice
}

export interface FrontPage {
  turn: number;      // the turn whose resolve carries it
  month: string;     // the first dated month the beat carries
  // the last one, which is a different month whenever a turn spans more than
  // one dated moment. The masthead prints the span rather than pretending the
  // whole page belongs to its first date.
  monthEnd: string;
  headlines: FrontPageHeadline[];
  // one authored sentence reading the room, built only out of dated facts the
  // era content already carries. It is never a forecast and it never says what
  // to do, because the decision lives in the shop where the money is.
  mood: string;
}

// keyed by era id, then by the clipping's step
const BEHIND: Record<string, Record<number, string>> = {
  gfc: {
    9: "The index set a new record this month, and American house prices have nearly doubled since 2000. A record high is simply a price higher than any price before it, and by itself it says nothing about what comes next.",
    14: "An 85-year-old investment bank ran out of lenders in a single week and agreed to sell itself for about two dollars a share. That same stock traded above one hundred and seventy dollars at its peak fourteen months earlier.",
    20: "The Old Bank survived the Civil War, two world wars, and the Great Depression, and this weekend it ran out of money and nobody saved it. It is the largest bankruptcy in American history.",
    21: "The day after the bank died, the government lent $85 billion to the world's biggest insurer to keep it breathing, and took most of its ownership in return. Two weeks later Congress voted down a rescue plan and the Dow fell 777 points.",
    26: "The index has fallen by more than half from its 2007 record, and serious people are arguing that prices could fall by half again. Nobody standing in this month can tell that it is the bottom.",
    74: "This month the index finally closed above the record it set in October 2007, five and a half years after the crash began. Everyone who kept their plan through the fear has been made whole and more.",
  },
  crypto: {
    1: "The lending platform that guaranteed about 1 percent interest every day shut down within weeks of regulators in Texas and North Carolina ordering it to stop. Its coin lost more than 90 percent of its value in a day and never came back.",
    26: "For years, fans called the first coin digital gold and promised it would be the shelter in the next storm. The storm arrived this month, and it fell by nearly half in two days while the stock market fell about a third from its peak.",
    46: "The first coin touched an all-time record near $69,000 in the second week of this month, about sixteen times what it was worth at the bottom of the first winter three years earlier. Stadiums are being renamed after coin companies.",
    58: "One of the biggest coin exchanges in the world filed for bankruptcy this month with billions of dollars of its customers' money missing. A year earlier its founder was on magazine covers as the responsible face of the industry.",
  },
  dotcom: {
    2: "A financial weekly counted how many months the internet companies had left before their cash ran out. Within a year, most of the companies on that list were gone.",
    3: "The Nasdaq, the exchange where most technology stocks trade, fell 25 percent in five days, its worst week on record. For five straight years every dip had turned out to be a buying chance, and this one did not.",
    14: "The most hyped online toy store of the boom ran out of money after one bad Christmas and could not find a buyer. Its shares had nearly quadrupled on their first day of trading two years earlier.",
    20: "The stock market stayed closed for four trading days after the attacks of September 11, its longest pause since 1933. When it reopened, the Dow fell 684 points, its biggest one-day point drop up to that date.",
    29: "The Phone Giant admitted hiding $3.8 billion of costs to make fake profits look real. The smooth earnings its doubters could never explain were smooth because they were fiction.",
    33: "The index has fallen about 40 percent from its 2000 high, and people who bragged about stocks in 2000 now call the market a casino. Every dollar invested this month buys about one and a half times the shares it did at the start of 2000.",
    90: "The Dow closed above 14,000 for the first time, seven and a half years after the bubble burst. The recovery took longer than the boom did.",
  },
};

// The mood line: one sentence per paper beat, keyed the same way BEHIND is,
// by era id and by the step of the first clipping the beat carries. It reads
// the room out of facts that are already dated somewhere in src/content, and
// it obeys the same two rules the rest of the game does. It never forecasts,
// because prediction framing is banned, and it never tells a player what to
// do, because the decision lives in the shop where the money is.
const MOOD: Record<string, Record<number, string>> = {
  gfc: {
    9: "American house prices have nearly doubled since 2000, more families miss a payment every month, and the officials in charge keep saying the trouble is contained.",
    14: "Two of the oldest names on Wall Street ran out of lenders inside six months, and nobody standing in this month knows which giant goes next.",
    20: "The Old Bank survived the Civil War and the Great Depression and could not survive this weekend, and the government is lending $85 billion to keep the world's biggest insurer breathing.",
    26: "The index has fallen by more than half from its record, and every dollar spent this month buys twice the index it bought in October 2007.",
    74: "The index closed above its October 2007 record this month, five and a half years after the fall began.",
  },
  crypto: {
    1: "The platform that guaranteed about one percent interest every single day shut down this month, weeks after two states ordered it to stop.",
    26: "The coin that people called digital gold fell by nearly half in two days, in the same week the stock market had its worst rout since 1987.",
    46: "The first coin touched a record near $69,000 this month, and stadiums are being renamed after coin companies.",
    58: "One of the biggest coin exchanges in the world filed for bankruptcy this month with billions of dollars of its customers' money missing.",
  },
  // The dotcom era is chapter 7's documented alternative rather than the cast
  // it ships with today, so these lines exist for the same reason its
  // headlines and its behind-the-page copy do: the swap stays one line.
  dotcom: {
    2: "A financial weekly spent this month counting how many months of cash each internet company had left.",
    3: "The exchange where most technology stocks trade fell 25 percent in five days, and every dip for five straight years had been a buying chance until this one.",
    14: "The most hyped online toy store of the boom ran out of money after one bad Christmas and could not find a buyer.",
    20: "The market stayed shut for four trading days after the attacks of September 11, its longest pause since 1933.",
    29: "The Phone Giant admitted hiding $3.8 billion of costs, so the smooth profits its doubters could never explain were fiction.",
    33: "The index is about 40 percent below its 2000 high, and people who bragged about stocks two years ago now call the market a casino.",
    90: "The Dow closed above 14,000 for the first time, seven and a half years after the bubble burst.",
  },
};

// The month a clipping was actually published, read off its own printed date
// rather than off the dataset step it is pinned to. A clipping is pinned to the
// month its effect lands on, which is sometimes the month after the paper ran
// it, and a masthead has to say the date on the paper.
function clippingMonth(c: Clipping, fallback: string): string {
  const m = /^([A-Za-z]+)\s+\d{1,2},\s+(\d{4})$/.exec(c.date);
  if (!m) return fallback;
  const i = MONTH_NAMES.findIndex((n) => m[1].startsWith(n));
  return i < 0 ? fallback : `${MONTH_NAMES[i]} ${m[2]}`;
}

// Every front page whose date falls inside one resolved turn. A turn resolves
// from its own mark to the next one, so the span is the months after the
// current mark up to and including the next.
export function frontPagesForTurn(ch: ChapterDef, turn: number): FrontPage | null {
  if (ch.source.kind !== "era") return null;
  const steps = ch.source.steps;
  if (turn < 0 || turn + 1 >= steps.length) return null;
  const from = steps[turn];
  const to = steps[turn + 1];
  const clips = (HEADLINES[ch.source.eraId] ?? []).filter(
    (c: Clipping) => c.atStep > from && c.atStep <= to,
  );
  if (clips.length === 0) return null;
  const cfg = ERAS[ch.source.eraId];
  const behind = BEHIND[ch.source.eraId] ?? {};
  const mood = MOOD[ch.source.eraId] ?? {};
  const shown = clips.slice(0, 3);
  const last = shown[shown.length - 1];
  return {
    turn,
    month: clippingMonth(clips[0], monthLabel(cfg.dataset.months[clips[0].atStep])),
    monthEnd: clippingMonth(last, monthLabel(cfg.dataset.months[last.atStep])),
    mood: mood[clips[0].atStep] ?? "",
    // never more than three, because nobody is made to read a fourth line
    headlines: shown.map((c) => ({
      date: c.date,
      source: c.source,
      face: c.headline,
      behind: behind[c.atStep] ?? c.sub ?? "",
    })),
  };
}

// Every front page a chapter holds, for the chapter summary, where the record
// is re-readable after it was dismissed.
export function frontPagesForChapter(ch: ChapterDef): FrontPage[] {
  const out: FrontPage[] = [];
  for (let t = 0; t < ch.turns; t++) {
    const p = frontPagesForTurn(ch, t);
    if (p) out.push(p);
  }
  return out;
}

// ------------------------------------------------- the calibration reference

// The reference strategy, played straight through the ladder: on the first
// turn of every chapter, turn every block of cash into whole basket cards,
// then never trade again while income piles up as cash. It is the strategy
// the whole game exists to teach, and its result is what every target is 95%
// of.
//
// This is a compact model of the same rules src/lib/tally/run.ts enforces:
// cards cost two blocks and a savings card costs one, shares are what the price
// bought, savings pays its interest into cash at the end of every turn, company
// cards settle to cash when their market closes, and savings and the index fund
// carry.
// tools/tallySim.ts plays the identical strategy through the real engine and
// checks the two agree, so the shortcut can never drift away from the game.
interface RefHolding { assetId: string; shares: number }

export interface ReferenceRow {
  id: number;
  denom: number;
  ceremonies: number;
  stakeDollars: number;
  incomeDollars: number;
  turns: number;
  startDollars: number;
  endDollars: number;
  target: number;
  wallMinBlocks: number;
  wallMaxBlocks: number;
}

export function referenceLadder(defs: ChapterDef[] = CHAPTER_DEFS): ReferenceRow[] {
  const rows: ReferenceRow[] = [];
  let cash = 0;
  let holdings: RefHolding[] = [];
  let carryPrice: Record<string, number> = {};
  let denom = TALLY_LADDER[0];
  let stones = new Set<string>();

  for (const ch of defs) {
    const prices = chapterPrices(ch, carryPrice);

    // the index fund card is re-based onto this chapter's index series at its
    // own dollar value, so its worth is continuous and its shares are honest
    const idx = holdings.find((h) => h.assetId === INDEX_ID);
    if (idx && prices[INDEX_ID]) {
      const before = idx.shares * (carryPrice[INDEX_ID] ?? 0);
      idx.shares = before / prices[INDEX_ID][0];
    }
    // anything whose market has closed is sold at its last real price
    const open = new Set(ch.market);
    const kept: RefHolding[] = [];
    for (const h of holdings) {
      if (open.has(h.assetId) || stones.has(h.assetId)) { kept.push(h); continue; }
      cash += h.shares * (carryPrice[h.assetId] ?? 0);
    }
    holdings = kept;

    const stake = ch.stakeBlocks * ch.denom;
    cash += stake;

    const worthAt = (t: number) => {
      let v = cash;
      for (const h of holdings) {
        if (stones.has(h.assetId)) continue;
        const p = prices[h.assetId]?.[t];
        if (p !== undefined) v += h.shares * p;
      }
      return v;
    };

    // the ceremony is decided at the chapter card, on the wall the player is
    // about to start with, before the first income has arrived
    const before = worthAt(0);
    const step = promoteUnit(before, denom);
    denom = step.denom;

    const income = ch.incomeBlocks * denom;
    const spread = ch.referenceSpread.filter((id) => prices[id] && prices[id][0] > 0);
    const rate = interestPerTurn(ch);
    let min = before;
    let max = before;

    for (let t = 0; t < ch.turns; t++) {
      // plan: income arrives as blocks, every turn, in every chapter
      cash += income;
      // turn one, and only turn one: every block of cash becomes whole
      // basket cards, and the reference never trades again
      if (t === 0 && spread.length > 0) {
        for (;;) {
          const id = spread[0];
          const cost = blocksPerCard(id) * denom;
          if (cash + 1e-9 < cost) break;
          const p = prices[id][0];
          let h = holdings.find((x) => x.assetId === id);
          if (!h) { h = { assetId: id, shares: 0 }; holdings.push(h); }
          h.shares += cost / p;
          cash -= cost;
          // one purchase per name in turn, so a spread of two names is bought
          // in alternation exactly as the engine buys it
          spread.push(spread.shift() as string);
        }
      }
      // resolve: savings pays its interest into cash on what was held through
      // the turn, and prices tick to the next mark, and anything at zero is
      // stone
      const saved = holdings.find((h) => h.assetId === SAVINGS_ID);
      if (saved && rate > 0) cash += saved.shares * SAVINGS_PRICE * rate;
      for (const id of ch.market) {
        if (prices[id]?.[t + 1] === 0) stones.add(id);
      }
      const w = worthAt(t + 1);
      if (w < min) min = w;
      if (w > max) max = w;
    }

    const end = worthAt(ch.turns);
    // Floored to the unit rather than rounded to it. Rounding up could put a
    // target above what the reference itself produced, which would break
    // acceptance test 8, so the floor is the only safe clean number.
    const target = ch.fixedTarget ?? Math.floor((end * 0.95) / denom) * denom;

    rows.push({
      id: ch.id, denom, ceremonies: step.ceremonies,
      stakeDollars: stake, incomeDollars: income, turns: ch.turns,
      startDollars: before, endDollars: end, target,
      wallMinBlocks: min / denom, wallMaxBlocks: max / denom,
    });

    // carry the last price of everything, for the next chapter's continuity
    const nextCarry: Record<string, number> = { ...carryPrice };
    for (const id of ch.market) nextCarry[id] = prices[id][ch.turns];
    carryPrice = nextCarry;
  }
  return rows;
}

const REF = referenceLadder();

export const CHAPTERS: Chapter[] = CHAPTER_DEFS.map((def, i) => ({
  ...def,
  target: REF[i].target,
  freshStartDollars: REF[i].startDollars,
  openingDenom: REF[i].denom,
  ceremonies: REF[i].ceremonies,
  referenceEnd: REF[i].endDollars,
  wallMinBlocks: REF[i].wallMinBlocks,
  wallMaxBlocks: REF[i].wallMaxBlocks,
  marks: chapterMarks(def),
}));

export function chapterById(id: number): Chapter {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown chapter: ${id}`);
  return c;
}

// The chapter card, as data. Three things, stated once, never changed.
export interface ChapterCard {
  id: number;
  name: string;
  tagline: string;
  subtitle: string;      // "2007 to 2015, real prices", or empty for an authored one
  target: number;
  turns: number;
  turnUnit: string;
  denom: number;
  startBlocks: number;
  carriedCards: number;
}

// An era chapter's subtitle is the span it covers, and every company price in it
// is a real one. An authored chapter says nothing here at all: the disclosure a
// made up number owes the reader belongs on the card beside that number, where
// it is read, and every one of those cards carries a dotted underline and one
// sentence behind a tap, exactly as a reconstructed series does. See
// illustrativeHere in src/lib/tally/run.ts.
export function chapterSubtitle(ch: ChapterDef): string {
  if (ch.source.kind === "era") {
    const marks = chapterMarks(ch);
    return `${marks[0]} to ${marks[marks.length - 1]}, real prices`;
  }
  return "";
}

export function chapterCard(ch: Chapter, denom: number, startDollars: number, carriedCards: number): ChapterCard {
  const subtitle = chapterSubtitle(ch);
  return {
    id: ch.id, name: ch.name, tagline: ch.tagline, subtitle,
    target: ch.target, turns: ch.turns, turnUnit: ch.turnUnit,
    denom, startBlocks: Math.round(startDollars / denom), carriedCards,
  };
}
