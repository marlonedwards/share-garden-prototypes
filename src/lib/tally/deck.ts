// The Tally's card model. Two units and nothing else: a card is one purchase
// of one asset, and a block is one fixed number of dollars. Everything in this
// file exists to keep those two units honest.
//
// A card costs exactly two blocks at the chapter's denomination, with one
// deliberate exception: a savings card costs one block, because a deposit is
// the one purchase whose size a person actually chooses a dollar at a time, and
// a stack of green one block cards is what a bank balance looks like on a
// table. What the card holds is SHARES, and shares are what the price bought on
// the turn the purchase happened. Worth is derived every turn from shares times price,
// never stored, so a crash can take blocks off the wall without touching a
// single card. That is the one metaphor test the orb and the cylinder both
// failed, and it is the reason the model splits this way.
//
// Three visual channels carry three different facts, and none of them is
// load bearing on its own:
//
//   the ring  = the asset class (savings, lending, ownership, basket, speculation)
//   the pip   = the sector, so a whole industry falling together is visible
//   the block colour = the asset's own identity on the wall
//
// The sector pip earns its place on exactly one date: September 2008, when
// every card carrying a bank pip loses most of its worth in the same resolve.
// That correlation is already in src/data/eraGfc.json. We are not inventing
// it, we are drawing it.
import { EraAsset } from "../../engine/history";
import { ScenarioConfig } from "../../content/types";
import { blocksOf } from "../blocks";

// ---------------------------------------------------------------- suits

// The ring is the asset class. These five are the whole deck.
export type Suit = "save" | "lend" | "own" | "basket" | "spec";

export const SUIT_LABEL: Record<Suit, string> = {
  save: "Savings",
  lend: "Lending",
  own: "Ownership",
  basket: "Baskets",
  spec: "Speculation",
};

// One sentence each, definition first, for the card back and the collector's
// box. These are player facing, so they follow the course style contract.
export const SUIT_DEFINITION: Record<Suit, string> = {
  save: "A savings card is money you keep at a bank that pays you to leave it there.",
  lend: "A lending card is money you lent to somebody who pays you back with interest.",
  own: "An ownership card is a slice of one real company.",
  basket: "A basket card is one purchase that holds many companies at once.",
  spec: "A speculation card is worth whatever the next buyer will pay.",
};

// ---------------------------------------------------------------- debuts

// A card type, for the one time it debuts and for the back of every card of
// that type ever after. The five suits are the deck; the stone is the sixth
// type, because a price that reached zero is a different object from a price
// that fell.
export type DebutKey = Suit | "stone";

export const DEBUT_ORDER: DebutKey[] = ["save", "lend", "own", "basket", "spec", "stone"];

// One sentence each, definition first, in the course voice. Three of them are
// the opening sentence of the field guide entry the concept already has in
// src/lib/fieldGuide.ts, so the game and the codex say the same thing in the
// same words:
//
//   own     the first sentence of the "share" entry
//   basket  the first sentence of the "index-fund" entry
//   spec    the deck's own SUIT_DEFINITION, because the field guide has an
//           entry for a bubble and none for speculation itself
//
// Savings, lending and the stone have no field guide entry that fits, so their
// sentences are written here, to the same rule: one complete sentence, the
// definition first, nothing about what to do next.
export const CARD_DEFINITION: Record<DebutKey, string> = {
  save: "A savings account is money you keep at a bank that pays you to leave it there.",
  lend: "A bond is a loan that pays you back with interest.",
  own: "A share is one small piece of a real company.",
  basket: "An index fund is one purchase that buys a tiny piece of hundreds of companies at once.",
  spec: "A speculation card is worth whatever the next buyer will pay.",
  stone: "A stone is a card whose price reached zero.",
};

// The heading over a debut, which is the name of the type rather than the name
// of the card that happened to bring it.
export const DEBUT_TITLE: Record<DebutKey, string> = {
  save: "Savings",
  lend: "Lending",
  own: "Ownership",
  basket: "Baskets",
  spec: "Speculation",
  stone: "The stone",
};

// Canonical ring colours. The UI must not invent its own, or two components
// will disagree about what green means.
export const RING_COLOR: Record<Suit, string> = {
  save: "#2E9E63",
  lend: "#2A72D6",
  own: "#D98A00",
  spec: "#D0453A",
  // the basket ring is the one gradient in the game, so its flat value is
  // only a fallback for places a gradient cannot go (a one pixel border, a
  // legend swatch)
  basket: "#7A6CD9",
};

// The rainbow ring, as a CSS value. It is a radial sweep of every other ring
// colour plus the two hues the deck does not otherwise use, because the
// basket card is the only card that is every colour at once.
export const BASKET_RING_GRADIENT =
  "conic-gradient(from 210deg, #D0453A, #D98A00, #E0C000, #2E9E63, #2A72D6, #5E5CE6, #A64FD0, #D0453A)";

// ---------------------------------------------------------------- pips

// The corner dot is the sector. "everything" is the honest label for the
// three instruments that are not one industry at all: savings, the bond, and
// the index fund.
export type Sector =
  | "banks" | "tech" | "industry" | "energy"
  | "retail" | "health" | "property" | "everything";

export const SECTOR_COLOR: Record<Sector, string> = {
  banks: "#5E5CE6",
  tech: "#0A84FF",
  industry: "#A2845E",
  energy: "#8E8E93",
  retail: "#64D2FF",
  health: "#30D158",
  property: "#FF9F0A",
  everything: "#8E8E93",
};

// the one word tooltip on the pip
export const SECTOR_LABEL: Record<Sector, string> = {
  banks: "Banks",
  tech: "Tech",
  industry: "Industry",
  energy: "Energy",
  retail: "Retail",
  health: "Health",
  property: "Property",
  everything: "Everything",
};

// ---------------------------------------------------------------- assets

// How an asset behaves when a chapter ends and its market closes.
//
//   settle  a company card from an era that is finishing. It is sold at its
//           last real price and comes back as cash, because inventing a price
//           the company never had would break honesty rule 6.
//   rate    the bond. It keeps growing at its stated rate through every
//           chapter, so its value is continuous.
//   flat    savings. Its price never moves at all, in any chapter, so a savings
//           card is worth exactly what was put into it for as long as it is
//           held. What the rate does instead is pay interest into cash on every
//           turn, which is the thing a bank actually does.
//   index   the index fund. Its dollar value carries, and the card is re-based
//           onto the next chapter's index series at that value, so the card
//           object survives the whole run.
export type Carry = "settle" | "rate" | "flat" | "index";

export interface TallyAsset {
  id: string;
  name: string;          // abstracted name, always shown by default
  real?: string;         // real name, behind the existing Real names toggle
  desc: string;
  suit: Suit;
  sector: Sector;
  color: string;         // the block colour this asset takes on the wall
  glow: string;
  carry: Carry;
  // annual growth for carry === "rate" instruments
  ratePerYear?: number;
  // a delisted series rebuilt from the dated record (LEH, WCOM, ETYS, BCC).
  // The card face carries a dotted underline and a tap target that says so.
  reconstructed?: boolean;
  // authored numbers rather than real market prices. Chapters 1 to 5 and 8
  // say so on their chapter card.
  illustrative?: boolean;
}

// The three instruments that outlive any single chapter. Their ids are fixed
// so a card bought in chapter 2 is still the same card in chapter 8.
export const SAVINGS_ID = "SAVINGS";
export const BOND_ID = "BOND";
export const INDEX_ID = "INDEX";

// Savings and the bond pay authored, illustrative rates. Real deposit and bond
// rates moved a great deal across 2007 to 2023, and modelling that honestly
// would need two more datasets we do not have, so the rate is stated once and
// labelled as illustration wherever it appears.
//
// The bond's rate also has to stay in the right order against the basket over
// forty years, or chapter 8 would quietly teach that lending beats owning. Over
// the forty years of chapter 8 the bond comes out at 2.7 times against 3.3
// times for the fund.
//
// The savings rate is not here, because it is not one number: it belongs to the
// chapter, and it is read off savingsRate() in chapters.ts. A savings card's
// worth never moves either way, so the rate never touches a price.
export const BOND_RATE = 0.025;

// Savings has no market price, and it never had one. It holds a fixed nominal
// so that shares times price is exactly the dollars that were put in, which is
// what lets one code path serve every card on the table without a savings
// account ever gaining or losing a cent of its own.
export const SAVINGS_PRICE = 10;

export const SAVINGS: TallyAsset = {
  id: SAVINGS_ID,
  name: "Savings Account",
  desc: "Money in a savings account keeps its value.",
  suit: "save", sector: "everything",
  color: "#2E9E63", glow: "#8FD9B2",
  carry: "flat", illustrative: true,
};

export const BOND: TallyAsset = {
  id: BOND_ID,
  name: "Government Bond",
  desc: "A bond is a loan you made to a government that pays you back with interest.",
  suit: "lend", sector: "everything",
  color: "#2A72D6", glow: "#9CC0F0",
  carry: "rate", ratePerYear: BOND_RATE, illustrative: true,
};

export const INDEX_FUND: TallyAsset = {
  id: INDEX_ID,
  name: "The Index Fund",
  real: "an S&P 500 index fund",
  desc: "An index fund is one purchase that buys a small piece of hundreds of companies at once.",
  suit: "basket", sector: "everything",
  color: "#7A6CD9", glow: "#C3BCF0",
  carry: "index",
};

export const UNIVERSAL_ASSETS: TallyAsset[] = [SAVINGS, BOND, INDEX_FUND];

// ---------------------------------------------------- era suit and pip maps

// Suit and sector for every cast member of the real eras. The sector map is
// the load bearing half: in September 2008 every bank pip falls in the same
// resolve, and the player is never told why.
interface Slot { suit: Suit; sector: Sector }

export const GFC_SLOTS: Record<string, Slot> = {
  C:    { suit: "own", sector: "banks" },
  AIG:  { suit: "own", sector: "banks" },
  LEH:  { suit: "own", sector: "banks" },
  GE:   { suit: "own", sector: "industry" },
  F:    { suit: "own", sector: "industry" },
  WMT:  { suit: "own", sector: "retail" },
  AAPL: { suit: "own", sector: "tech" },
  XOM:  { suit: "own", sector: "energy" },
  AMZN: { suit: "own", sector: "retail" },
};

// Coins are not companies, and the agreed pip palette has no crypto slot, so
// every coin carries the tech pip. That is the one thing they share, and it
// does the job the pip exists for: in March 2020 and again in 2022 every one
// of them falls in the same resolve.
export const CRYPTO_SLOTS: Record<string, Slot> = {
  "BTC-USD":  { suit: "spec", sector: "tech" },
  "ETH-USD":  { suit: "spec", sector: "tech" },
  "LTC-USD":  { suit: "spec", sector: "tech" },
  "XRP-USD":  { suit: "spec", sector: "tech" },
  "DOGE-USD": { suit: "spec", sector: "tech" },
  BCC:        { suit: "spec", sector: "tech" },
};

export const DOTCOM_SLOTS: Record<string, Slot> = {
  AAPL: { suit: "own", sector: "tech" },
  AMZN: { suit: "own", sector: "retail" },
  MSFT: { suit: "own", sector: "tech" },
  CSCO: { suit: "own", sector: "tech" },
  INTC: { suit: "own", sector: "tech" },
  KO:   { suit: "own", sector: "retail" },
  JNJ:  { suit: "own", sector: "health" },
  XOM:  { suit: "own", sector: "energy" },
  WCOM: { suit: "own", sector: "tech" },
  ETYS: { suit: "own", sector: "retail" },
};

export const ERA_SLOTS: Record<string, Record<string, Slot>> = {
  gfc: GFC_SLOTS,
  crypto: CRYPTO_SLOTS,
  dotcom: DOTCOM_SLOTS,
};

// Turns an era's cast into Tally assets. The era modules stay the single
// source of truth for names, real names, colours and reconstruction flags;
// this only adds the ring and the pip.
export function eraAssets(cfg: ScenarioConfig): TallyAsset[] {
  const slots = ERA_SLOTS[cfg.id] ?? {};
  const out: TallyAsset[] = [];
  for (const a of cfg.assets as EraAsset[]) {
    const slot = slots[a.id];
    if (!slot) continue;
    out.push({
      id: a.id,
      name: a.name,
      real: a.real,
      desc: a.desc,
      suit: slot.suit,
      sector: slot.sector,
      color: a.color,
      glow: a.glow,
      carry: "settle",
      reconstructed: a.reconstructed,
    });
  }
  return out;
}

// ---------------------------------------------------------------- cards

// One purchase. It records what it holds and what it cost, and it never
// records what it is worth, because worth is a function of today's price.
export interface Card {
  uid: number;
  assetId: string;
  chapter: number;       // the chapter id it was bought in
  turn: number;          // 0 based turn index inside that chapter
  shares: number;        // what the price actually bought
  buyPrice: number;      // the real price per share on that turn
  // two blocks at the denomination of the day, or one for a savings card
  buyDollars: number;
  // how many original two block purchases are fused inside this card. One
  // normally, four after a unit ceremony, sixteen after two.
  fused: number;
  // a price that reached zero. Worth nothing, cannot be discarded, stays in
  // the tableau for the rest of the run.
  stone: boolean;
}

export const CARD_BLOCKS = 2;

// The savings card is the one block card, and it is the only one. Everything
// else on every table costs two blocks, so the deposit stays the one purchase a
// player sizes for themselves and the bank balance is a countable pile of green
// cards rather than a number that quietly grew.
export const SAVINGS_BLOCKS = 1;

export function blocksPerCard(assetId: string): number {
  return assetId === SAVINGS_ID ? SAVINGS_BLOCKS : CARD_BLOCKS;
}

export function cardCost(denom: number, assetId = ""): number {
  return blocksPerCard(assetId) * denom;
}

// What one purchase bought, at the price of the day it was bought.
export function sharesFor(dollars: number, price: number): number {
  return price > 0 ? dollars / price : 0;
}

export function mintCard(
  uid: number, assetId: string, chapter: number, turn: number,
  dollars: number, price: number,
): Card {
  return {
    uid, assetId, chapter, turn,
    shares: sharesFor(dollars, price),
    buyPrice: price,
    buyDollars: dollars,
    fused: 1,
    stone: false,
  };
}

export function cardWorth(card: Card, price: number): number {
  if (card.stone) return 0;
  return card.shares * price;
}

export function cardBlocks(card: Card, price: number, denom: number): number {
  return blocksOf(cardWorth(card, price), denom);
}

// How far this card's price has fallen from what it paid, as a fraction.
// 0.5 means the price is half of what the card paid for it.
export function priceRatio(card: Card, price: number): number {
  return card.buyPrice > 0 ? price / card.buyPrice : 0;
}

// A stack is every card of one name, in the order they were bought.
export function stackOf(cards: Card[], assetId: string): Card[] {
  return cards.filter((c) => c.assetId === assetId);
}

export function stackWorth(cards: Card[], assetId: string, price: number): number {
  let v = 0;
  for (const c of cards) if (c.assetId === assetId) v += cardWorth(c, price);
  return v;
}

// A price reaching zero turns every card of that name to stone. Gone is
// different from down, and it has a permanent physical presence.
export function turnToStone(cards: Card[], assetId: string): Card[] {
  return cards.map((c) => (c.assetId === assetId && !c.stone ? { ...c, stone: true } : c));
}

// The unit ceremony: four blocks fuse into one, and four cards of the same
// name fuse into one card, so a card keeps the size it always had. Four two
// block cards become one two block card, and four one block savings cards
// become one savings card worth one new block, which is the whole reason the
// deposit sized card survives the ceremony without a special case.
//
// The remainder is the honest part. A name held one, two or three times has
// nothing to fuse with, so those cards stay exactly as they are. They are
// still real cards holding real shares; they simply hold fewer shares than a
// fresh two block purchase would buy at the new unit. Rounding them up would
// invent shares the player never bought, and rounding them away would delete
// shares they did buy, so neither is allowed.
export function fuseTableau(cards: Card[]): { cards: Card[]; fusedNames: string[] } {
  const byAsset = new Map<string, Card[]>();
  for (const c of cards) {
    const list = byAsset.get(c.assetId) ?? [];
    list.push(c);
    byAsset.set(c.assetId, list);
  }
  const out: Card[] = [];
  const fusedNames: string[] = [];
  for (const [assetId, list] of byAsset) {
    // stones never fuse: a stone is a permanent object, not a quantity
    const stones = list.filter((c) => c.stone);
    const live = list.filter((c) => !c.stone).sort((a, b) => a.uid - b.uid);
    out.push(...stones);
    let i = 0;
    for (; i + 4 <= live.length; i += 4) {
      const group = live.slice(i, i + 4);
      fusedNames.push(assetId);
      out.push({
        ...group[0],
        shares: group.reduce((s, c) => s + c.shares, 0),
        buyDollars: group.reduce((s, c) => s + c.buyDollars, 0),
        // the fused card keeps the oldest purchase's date, so the long hold
        // badge still knows when this money first went to work
        chapter: group[0].chapter,
        turn: group[0].turn,
        // a weighted average of what the four purchases paid, so the card's
        // own fall-from-cost is still true
        buyPrice: group.reduce((s, c) => s + c.buyPrice * c.shares, 0)
          / Math.max(1e-9, group.reduce((s, c) => s + c.shares, 0)),
        fused: group.reduce((s, c) => s + c.fused, 0),
      });
    }
    out.push(...live.slice(i));
  }
  out.sort((a, b) => a.uid - b.uid);
  return { cards: out, fusedNames };
}

// ---------------------------------------------------------------- market

// One row of the market strip. Every card seen this run is face up and
// buyable forever, so a row leaves only by turning to stone.
export interface MarketRow {
  asset: TallyAsset;
  price: number;
  // the move since the player's last turn, as a fraction. Null on the first
  // turn a card is visible, because there is nothing to compare it with.
  move: number | null;
  // what one purchase buys at today's price. Without this the printed price
  // would do no mechanical work.
  sharesPerPurchase: number;
  costDollars: number;
  costBlocks: number;
  // the rate a savings card pays in this chapter, so the face can print it.
  // Null on every card that is priced rather than rated.
  ratePerYear: number | null;
  affordable: boolean;
  owned: number;          // how many cards of this name are in the tableau
  isNew: boolean;         // slid in on this turn, gets the NEW flash
  stone: boolean;
  // a delisted series rebuilt from the dated record. The face carries a dotted
  // underline and a tap target that says so.
  reconstructed: boolean;
  // an authored rate standing in a chapter that runs on real prices. The face
  // carries the same dotted underline and its own sentence, because a chapter
  // card that says "real prices" must not be the only thing a player has to go
  // on when one number on the table is not one.
  illustrative: boolean;
}
