// The run: state, turns, badges, forensics and persistence for The Tally.
//
// A run is a ladder of chapters played from a start point the player has
// unlocked. The tableau carries across chapters inside a run and nothing
// carries between runs except what a player earned: chapters cleared,
// instrument classes unlocked, badges, and field guide cards. One missed
// target ends the run.
//
// WHAT THE UI GETS FROM THIS FILE
//
// Everything the board needs is a function here, so no component ever
// recomputes game logic.
//
//   the header line     headerRail(run)
//   the wall            wallMonths(run), wallSlotCount(run), targetLine(run)
//   your stacks         tableau(run), run.cash
//   the shop            marketRows(run), pendingDebuts(run)
//   the resolve flash   resolveDeltas(run)
//   the overlays        chapterCardFor(run), run.frontPage, run.ceremony,
//                       chapterSummary(run), runReport(run)
//
// The board's loop is table, resolve, paper, table again, and the shop when the
// player asks for it, per docs/tally-loop.md. The model underneath it is
// unchanged: buying and selling mutate a working copy that resetPlan(run) can
// throw away, and endTurn(run) commits it and resolves. Income still arrives at
// the start of a plan, which is what the shop's payday beat is drawing when it
// slides the blocks in, and the interest a savings card pays is credited by
// endTurn itself, so a headless run and a played one are the same arithmetic.
// Nothing in here moves a price, ever: the player is a price taker in every
// chapter, which is rule 1 of the reward function contract in
// docs/tally-spec.md section 8.
//
// Every state shape in here is plain data, so a run serialises to JSON with no
// work, and localStorage is the only place anything is stored.
import { allocateBlocks, blocksOf, BLOCK_GROUP } from "../blocks";
import { unlockEntry } from "../fieldGuide";
import {
  Card, DebutKey, MarketRow, Suit, TallyAsset,
  CARD_DEFINITION, DEBUT_ORDER, DEBUT_TITLE, INDEX_ID, SAVINGS_ID, SAVINGS_PRICE,
  blocksPerCard, cardCost, cardWorth, fuseTableau, mintCard, priceRatio,
} from "./deck";
import {
  Chapter, ChapterCard, FrontPage,
  CHAPTERS, TALLY_LADDER, WALL_MAX_BLOCKS,
  assetOf, chapterById, chapterCard, chapterMarks, chapterPrices, chapterSlots,
  frontPagesForChapter, frontPagesForTurn, interestPerTurn, listedTurn,
  promoteUnit, savingsRate, slotPrice,
} from "./chapters";

export { BLOCK_GROUP };

// ---------------------------------------------------------------- log

// One committed move. The wall history is rebuilt from these rows rather than
// recorded as it goes, so the past is always exactly what happened, in the
// spirit of src/lib/tileColumns.ts.
export interface TradeEntry {
  chapter: number;
  turn: number;
  side: "buy" | "sell";
  assetId: string;
  cardUid: number;
  shares: number;
  price: number;
  dollars: number;
  blocks: number;
  denom: number;
}

// ---------------------------------------------------------------- state

export type TurnPhase = "chapter" | "plan" | "summary" | "over" | "won";

export interface Ceremony {
  from: number;
  to: number;
  steps: number;          // how many x4 fuses fired at this transition
  // display names, one entry per group of four that became one card, so the
  // overlay draws what it is handed and resolves nothing itself
  fusedNames: string[];
}

export interface Settlement {
  // companies whose market closed, sold at their last real price
  sold: { assetId: string; name: string; dollars: number }[];
  kept: { assetId: string; name: string }[];
  stones: { assetId: string; name: string }[];
  dollars: number;
}

export interface RunState {
  // a short string for retelling a run. It appears on the chapter summary and
  // the run report and never in the header rail, because a seed is for
  // telling a run afterwards, not for reading during one.
  runId: string;
  startedAt: number;
  startChapter: number;
  order: number[];
  at: number;
  phase: TurnPhase;

  denom: number;
  cash: number;
  cards: Card[];
  discard: Card[];
  stones: string[];
  carryPrice: Record<string, number>;
  nextUid: number;

  turn: number;
  prices: Record<string, number[]>;
  seen: string[];              // every asset id seen this run, face up forever

  chapterOpenCash: number;
  chapterOpenCards: Card[];
  chapterOpenWorth: number;

  log: TradeEntry[];
  plan: { cash: number; cards: Card[]; discard: Card[]; logLen: number } | null;

  read: string;
  // the dollars savings paid on the turn that just resolved, credited into cash
  // by endTurn and read by the table for the moment that says so. Zero on a
  // turn where nothing was on deposit.
  interest: number;
  frontPage: FrontPage | null;
  ceremony: Ceremony | null;
  settlement: Settlement | null;
  newAssets: string[];
  // asset ids whose price reached zero on this turn's resolve, so the table
  // can play the drain on exactly those cards and nothing else
  stonedIds: string[];

  badges: string[];
  cleared: number[];
  archive: { chapter: number; columns: WallColumn[] }[];

  // Card types whose one-time debut has already been shown. It lives in the
  // run rather than in the page so a refresh mid-chapter cannot make the game
  // explain the same word twice.
  seenDebuts: DebutKey[];
}

// ---------------------------------------------------------------- the box

// The collector's box. This is the only thing that survives a run.
export interface BoxState {
  clearedChapters: number[];
  instruments: string[];
  badges: string[];
  eraBest: Record<string, number>;
}

export const EMPTY_BOX: BoxState = { clearedChapters: [], instruments: [], badges: [], eraBest: {} };

export const RUN_KEY = "tally-run-v1";
export const BOX_KEY = "tally-box-v1";

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadBox(): BoxState {
  const s = store();
  if (!s) return { ...EMPTY_BOX };
  try {
    const raw = JSON.parse(s.getItem(BOX_KEY) ?? "{}");
    return {
      clearedChapters: raw.clearedChapters ?? [],
      instruments: raw.instruments ?? [],
      badges: raw.badges ?? [],
      eraBest: raw.eraBest ?? {},
    };
  } catch {
    return { ...EMPTY_BOX };
  }
}

export function saveBox(box: BoxState): void {
  const s = store();
  if (!s) return;
  try { s.setItem(BOX_KEY, JSON.stringify(box)); } catch { /* private browsing */ }
}

export function saveRun(run: RunState): void {
  const s = store();
  if (!s) return;
  try { s.setItem(RUN_KEY, JSON.stringify(run)); } catch { /* private browsing */ }
}

export function loadRun(): RunState | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(RUN_KEY);
    if (!raw) return null;
    const run = JSON.parse(raw) as RunState;
    // a run saved before debuts existed has met nothing yet, which is the
    // honest default: it will be told once and then never again
    if (!Array.isArray(run.seenDebuts)) run.seenDebuts = [];
    if (typeof run.interest !== "number") run.interest = 0;
    migrateSavings(run);
    return run;
  } catch {
    return null;
  }
}

// A run saved before savings stopped moving carries a savings price that had
// crept up and cards bought two blocks at a time. Nothing is added and nothing
// is taken away: every savings card keeps the dollars it was holding at the
// moment the run was saved, the price is flat from here so that worth can never
// move again, and every card bought from now on is one block. A card bought
// under the old economy therefore still draws the two blocks it is actually
// worth, because restating it as one would be deleting half of somebody's
// deposit to tidy up a rule change.
function migrateSavings(run: RunState): void {
  const series = run.prices?.[SAVINGS_ID];
  const now = series?.[Math.min(run.turn, series.length - 1)]
    ?? run.carryPrice?.[SAVINGS_ID] ?? SAVINGS_PRICE;
  if (series) run.prices[SAVINGS_ID] = series.map(() => SAVINGS_PRICE);
  if (run.carryPrice) run.carryPrice[SAVINGS_ID] = SAVINGS_PRICE;
  const k = now > 0 ? now / SAVINGS_PRICE : 1;
  if (k === 1) return;
  const rescale = (c: Card) => {
    if (c.assetId !== SAVINGS_ID) return;
    c.shares *= k;
    c.buyPrice = SAVINGS_PRICE;
  };
  run.cards?.forEach(rescale);
  run.chapterOpenCards?.forEach(rescale);
  run.discard?.forEach(rescale);
  // the wall is rebuilt from the log, so the log has to hold the same shares
  // the cards do or the record and the table would disagree
  for (const e of run.log ?? []) if (e.assetId === SAVINGS_ID) e.shares *= k;
}

export function clearSavedRun(): void {
  const s = store();
  if (!s) return;
  try { s.removeItem(RUN_KEY); } catch { /* private browsing */ }
}

// ---------------------------------------------------------------- the tour
//
// Chapter 1 is the tutorial, and the piggy that guides it is a thing that
// happens once. This flag is the whole of that memory: it is written when the
// script finishes or when the player skips it, and it outlives the run the way
// the collector's box does, because a player who has met the piggy has met the
// piggy whatever they do with the run afterwards. The Tutorial button on the
// menu ignores it, which is what makes the tutorial replayable.
export const TOUR_KEY = "tally-tour-v1";

export function tourDone(): boolean {
  const s = store();
  if (!s) return false;
  try { return s.getItem(TOUR_KEY) === "1"; } catch { return false; }
}

export function markTourDone(): void {
  const s = store();
  if (!s) return;
  try { s.setItem(TOUR_KEY, "1"); } catch { /* private browsing */ }
}

// Chapter 1 is always open, and every chapter a player has cleared is open
// too. Every unlock is an asset or a habit, never information nobody had at
// the time, which is rule 5 of the reward function contract.
export function startPoints(box: BoxState): number[] {
  const set = new Set<number>([1, ...box.clearedChapters]);
  return [...set].filter((n) => n >= 1 && n <= CHAPTERS.length).sort((a, b) => a - b);
}

// ---------------------------------------------------------------- helpers

function clone(run: RunState): RunState {
  return {
    ...run,
    cards: run.cards.map((c) => ({ ...c })),
    discard: run.discard.map((c) => ({ ...c })),
    log: [...run.log],
    stones: [...run.stones],
    seen: [...run.seen],
    newAssets: [...run.newAssets],
    stonedIds: [...run.stonedIds],
    badges: [...run.badges],
    cleared: [...run.cleared],
    seenDebuts: [...(run.seenDebuts ?? [])],
  };
}

export function chapterOf(run: RunState): Chapter {
  return chapterById(run.order[run.at]);
}

export function priceOf(run: RunState, assetId: string, turn = run.turn): number {
  const series = run.prices[assetId];
  if (!series) return run.carryPrice[assetId] ?? 0;
  return series[Math.min(turn, series.length - 1)];
}

export function worthOf(run: RunState, turn = run.turn): number {
  let v = run.cash;
  for (const c of run.cards) v += cardWorth(c, priceOf(run, c.assetId, turn));
  return v;
}

function unlock(id: string): void {
  if (typeof window === "undefined") return;
  unlockEntry(id);
}

// ------------------------------------------------------------ run lifecycle

// A run id short enough to say out loud and stable enough to retell a run
// with. It is derived from the clock, not from Math.random, because nothing
// in game logic is allowed to be random.
function makeRunId(now: number, startChapter: number): string {
  const base = Math.floor(now / 1000).toString(36).toUpperCase();
  return `${base.slice(-5)}-${startChapter}`;
}

export function newRun(startChapter = 1, now: number = Date.now()): RunState {
  const ch = chapterById(startChapter);
  const order = CHAPTERS.filter((c) => c.id >= startChapter).map((c) => c.id);
  const run: RunState = {
    runId: makeRunId(now, startChapter),
    startedAt: now,
    startChapter,
    order,
    at: 0,
    phase: "chapter",
    // A run that starts deep begins with what the reference strategy would
    // have been holding when it reached that chapter, handed over as cash, so
    // a deep start is neither a handicap nor a gift. The chapter's own stake
    // is added by openChapter, the same way it is for a run that arrived here
    // the long way, so it is counted exactly once.
    denom: ch.openingDenom,
    cash: ch.freshStartDollars - ch.stakeBlocks * ch.denom,
    cards: [],
    discard: [],
    stones: [],
    carryPrice: {},
    nextUid: 1,
    turn: 0,
    prices: {},
    seen: [],
    chapterOpenCash: 0,
    chapterOpenCards: [],
    chapterOpenWorth: 0,
    log: [],
    plan: null,
    read: "",
    interest: 0,
    frontPage: null,
    ceremony: null,
    settlement: null,
    newAssets: [],
    stonedIds: [],
    badges: [],
    cleared: [],
    archive: [],
    seenDebuts: [],
  };
  openChapter(run, true);
  return run;
}

// Everything that happens between the last turn of one chapter and the
// chapter card of the next: settlement, the stake, the ceremony, the new
// price table.
function openChapter(run: RunState, first: boolean): void {
  const ch = chapterOf(run);
  const prices = chapterPrices(ch, run.carryPrice);

  if (!first) {
    // The index fund card keeps its dollar value and is re-based onto the new
    // chapter's index series, so the card object survives a whole run.
    const idxPrice = prices[INDEX_ID]?.[0];
    if (idxPrice) {
      for (const c of run.cards) {
        if (c.assetId !== INDEX_ID || c.stone) continue;
        const value = c.shares * (run.carryPrice[INDEX_ID] ?? idxPrice);
        c.shares = value / idxPrice;
        c.buyPrice = c.buyPrice * (idxPrice / (run.carryPrice[INDEX_ID] ?? idxPrice));
      }
    }
    // A company whose market has closed is sold at its last real price and
    // comes back as cash. Inventing a price the company never had on a date it
    // did not trade would break honesty rule 6, and holding a card whose price
    // is frozen forever would be worse.
    const open = new Set(ch.market);
    const sold: Settlement["sold"] = [];
    const kept: Settlement["kept"] = [];
    const stoneRows: Settlement["stones"] = [];
    const keptCards: Card[] = [];
    let proceeds = 0;
    for (const c of run.cards) {
      if (c.stone) {
        keptCards.push(c);
        if (!stoneRows.some((s) => s.assetId === c.assetId)) {
          stoneRows.push({ assetId: c.assetId, name: assetOf(c.assetId).name });
        }
        continue;
      }
      if (open.has(c.assetId)) {
        keptCards.push(c);
        if (!kept.some((k) => k.assetId === c.assetId)) {
          kept.push({ assetId: c.assetId, name: assetOf(c.assetId).name });
        }
        continue;
      }
      const price = run.carryPrice[c.assetId] ?? 0;
      const dollars = c.shares * price;
      proceeds += dollars;
      const row = sold.find((s) => s.assetId === c.assetId);
      if (row) row.dollars += dollars;
      else sold.push({ assetId: c.assetId, name: assetOf(c.assetId).name, dollars });
    }
    run.cards = keptCards;
    run.cash += proceeds;
    run.settlement = sold.length || kept.length || stoneRows.length
      ? { sold, kept, stones: stoneRows, dollars: proceeds }
      : null;
  } else {
    run.settlement = null;
  }

  run.cash += ch.stakeBlocks * ch.denom;

  // The ceremony fires here, between chapters, never inside one, when the
  // chapter about to start would put the wall over forty blocks at the
  // current unit.
  let openWorth = run.cash;
  for (const c of run.cards) openWorth += cardWorth(c, prices[c.assetId]?.[0] ?? run.carryPrice[c.assetId] ?? 0);
  const step = promoteUnit(openWorth, run.denom);
  if (step.ceremonies > 0) {
    const fused = fuseTableau(run.cards);
    run.cards = fused.cards;
    run.ceremony = {
      from: run.denom,
      to: step.denom,
      steps: step.ceremonies,
      fusedNames: fused.fusedNames.map((id) => assetOf(id).name),
    };
    run.denom = step.denom;
  } else {
    run.ceremony = null;
  }

  run.prices = prices;
  run.turn = 0;
  run.phase = "chapter";
  run.chapterOpenCash = run.cash;
  run.chapterOpenCards = run.cards.map((c) => ({ ...c }));
  run.chapterOpenWorth = openWorth;
  run.frontPage = null;
  run.stonedIds = [];
  run.read = "";
  run.interest = 0;

  for (const id of ch.market) {
    if (listedTurn(ch, id) === 0 && !run.seen.includes(id)) run.seen.push(id);
  }
  run.newAssets = ch.unlocks.filter((id) => listedTurn(ch, id) === 0);
  for (const id of ch.fieldGuide) unlock(id);
}

// The chapter card is dismissed and the first plan phase begins. Income
// arrives as blocks, every turn, in every chapter, so no turn is a skip and
// dollar cost averaging is the default rather than a strategy.
export function beginChapter(run: RunState): RunState {
  const next = clone(run);
  next.phase = "plan";
  startPlan(next);
  return next;
}

function startPlan(run: RunState): void {
  const ch = chapterOf(run);
  run.cash += ch.incomeBlocks * run.denom;
  run.plan = {
    cash: run.cash,
    cards: run.cards.map((c) => ({ ...c })),
    discard: run.discard.map((c) => ({ ...c })),
    logLen: run.log.length,
  };
}

// ---------------------------------------------------------------- market

// Savings and the bond pay authored rates rather than real market prices, and
// they sit on the table in chapters 6 and 7, whose chapter card says these are
// real prices. In an illustrative chapter the chapter card already says so in
// one sentence and every number on the table is in the same boat, so the card
// faces stay clean; in a real price chapter the disclosure has to live on the
// face itself, next to the number it is about. That is honesty rule 6 of the
// reward function contract, kept where the number is shown.
function illustrativeHere(ch: Chapter, asset: TallyAsset): boolean {
  return !!asset.illustrative && !ch.illustrative;
}

export function marketRows(run: RunState): MarketRow[] {
  const ch = chapterOf(run);
  const rows: MarketRow[] = [];
  for (const id of ch.market) {
    const listed = listedTurn(ch, id);
    if (run.turn < listed) continue;
    const asset = assetOf(id);
    const price = priceOf(run, id);
    const stone = run.stones.includes(id);
    // a card leaves the market in exactly one way, and that is a real price
    // reaching zero
    if (stone) continue;
    const prev = run.turn > 0 ? priceOf(run, id, run.turn - 1) : null;
    const cost = cardCost(run.denom, id);
    rows.push({
      asset,
      price,
      move: prev && prev > 0 ? price / prev - 1 : null,
      sharesPerPurchase: price > 0 ? cost / price : 0,
      costDollars: cost,
      costBlocks: blocksPerCard(id),
      ratePerYear: id === SAVINGS_ID ? savingsRate(ch) : null,
      affordable: run.cash + 1e-6 >= cost && price > 0,
      owned: run.cards.filter((c) => c.assetId === id).length,
      isNew: run.newAssets.includes(id),
      stone: false,
      reconstructed: !!asset.reconstructed,
      illustrative: illustrativeHere(ch, asset),
    });
  }
  return rows;
}

export function canBuy(run: RunState, assetId: string): boolean {
  if (run.phase !== "plan") return false;
  const ch = chapterOf(run);
  if (!ch.market.includes(assetId)) return false;
  if (run.turn < listedTurn(ch, assetId)) return false;
  if (run.stones.includes(assetId)) return false;
  const price = priceOf(run, assetId);
  if (!price || price <= 0) return false;
  return run.cash + 1e-6 >= cardCost(run.denom, assetId);
}

// One purchase, two blocks, or one block for the savings card, at this turn's
// real price.
export function buy(run: RunState, assetId: string): RunState {
  if (!canBuy(run, assetId)) return run;
  const next = clone(run);
  const ch = chapterOf(next);
  const price = priceOf(next, assetId);
  const dollars = cardCost(next.denom, assetId);
  const card = mintCard(next.nextUid++, assetId, ch.id, next.turn, dollars, price);
  next.cards.push(card);
  next.cash -= dollars;
  next.log.push({
    chapter: ch.id, turn: next.turn, side: "buy", assetId, cardUid: card.uid,
    shares: card.shares, price, dollars, blocks: blocksPerCard(assetId), denom: next.denom,
  });
  afterTrade(next);
  return next;
}

// How many cards of one name this turn's money could buy, which is the whole
// of the convenience the shop's second tab offers. It is arithmetic on the cash
// already in hand and it is never a suggestion: the number exists so a player
// who has decided to buy five does not have to press a button five times.
export function maxBuy(run: RunState, assetId: string): number {
  if (!canBuy(run, assetId)) return 0;
  const cost = cardCost(run.denom, assetId);
  if (cost <= 0) return 0;
  return Math.floor((run.cash + 1e-6) / cost);
}

// The same purchase, n times over. Every card is minted by buy() itself and
// logs its own TradeEntry, so the wall replay, the badges and the forensics see
// five purchases rather than one big one, and a run that ran out of money part
// way through stops there rather than going into debt.
export function buyMany(run: RunState, assetId: string, n: number): RunState {
  let next = run;
  for (let i = 0; i < Math.max(0, Math.floor(n)); i++) {
    if (!canBuy(next, assetId)) break;
    next = buy(next, assetId);
  }
  return next;
}

export function canSell(run: RunState, cardUid: number): boolean {
  if (run.phase !== "plan") return false;
  const card = run.cards.find((c) => c.uid === cardUid);
  // a stone cannot be discarded, and that is the point of it
  return !!card && !card.stone;
}

// Selling is discarding. The card goes face up onto the pile and the blocks
// come back at today's price. A card is a unit, so there is no partial sell.
export function sell(run: RunState, cardUid: number): RunState {
  if (!canSell(run, cardUid)) return run;
  const next = clone(run);
  const ch = chapterOf(next);
  const i = next.cards.findIndex((c) => c.uid === cardUid);
  const card = next.cards[i];
  const price = priceOf(next, card.assetId);
  const dollars = cardWorth(card, price);
  next.cards.splice(i, 1);
  next.discard.push(card);
  next.cash += dollars;
  next.log.push({
    chapter: ch.id, turn: next.turn, side: "sell", assetId: card.assetId, cardUid: card.uid,
    shares: card.shares, price, dollars, blocks: blocksOf(dollars, next.denom), denom: next.denom,
  });
  return next;
}

// Several cards of one stack, sold one at a time in the order they are given,
// each through sell() and each logging its own entry. A stone in the list is
// simply not sold, because canSell refuses it.
export function sellMany(run: RunState, cardUids: number[]): RunState {
  let next = run;
  for (const uid of cardUids) next = sell(next, uid);
  return next;
}

// Nothing is committed until End turn, so a plan can always be thrown away.
export function resetPlan(run: RunState): RunState {
  if (!run.plan) return run;
  const next = clone(run);
  next.cash = run.plan.cash;
  next.cards = run.plan.cards.map((c) => ({ ...c }));
  next.discard = run.plan.discard.map((c) => ({ ...c }));
  next.log = next.log.slice(0, run.plan.logLen);
  return next;
}

// Field guide cards open the first time a concept appears in play, never
// before it has been met.
function afterTrade(run: RunState): void {
  // CEE Investing 8-5a (diversification within and among asset classes);
  // concept: diversification. It opens the first time three rings are on the
  // table at once, which is the first moment the word means anything.
  const suits = new Set<Suit>();
  for (const c of run.cards) suits.add(assetOf(c.assetId).suit);
  if (suits.size >= 3) unlock("diversification");
  // CEE Investing 8-7c (future value of a regular series); concept: dca. It
  // opens the first time one name has been bought on two different turns,
  // which is the habit itself rather than a description of it.
  const byName = new Map<string, Set<string>>();
  for (const c of run.cards) {
    const key = c.assetId;
    const set = byName.get(key) ?? new Set<string>();
    set.add(`${c.chapter}:${c.turn}`);
    byName.set(key, set);
  }
  for (const set of byName.values()) if (set.size >= 2) unlock("dca");
}

// ---------------------------------------------------------------- interest

// What the bank pays for the turn just played, on the savings that were on
// deposit through it. It accrues from holding and from nothing else: no trade
// earns it, no timing changes it, and buying a card and selling it back inside
// the same plan pays nothing at all, because the card is not there when the
// turn resolves. It is paid into cash, which is why it lands with the cash band
// and never inside a holding's chip.
export function savingsOnDeposit(cards: Card[]): number {
  let v = 0;
  for (const c of cards) if (c.assetId === SAVINGS_ID && !c.stone) v += c.shares * SAVINGS_PRICE;
  return v;
}

export function interestFor(run: RunState, cards: Card[] = run.cards): number {
  return savingsOnDeposit(cards) * interestPerTurn(chapterOf(run));
}

// ---------------------------------------------------------------- resolve

const WORDS = [
  "No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve",
];

function count(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}

// One line in the header rail says what just happened. One short sentence
// that fits a phone-width rail without an ellipsis, about the market only:
// income is the shop's payday beat and is never narrated twice.
function readLine(delta: number, stoned: string[], owning: boolean, variation?: string | null): string {
  if (stoned.length > 0) {
    return `${stoned.join(" and ")} went to zero and turned to stone.`;
  }
  if (variation) return variation;
  if (!owning) {
    return "Time passed, and the pile did not grow on its own.";
  }
  const n = Math.abs(delta);
  const blocks = `${count(n).toLowerCase()} ${n === 1 ? "block" : "blocks"}`;
  if (delta > 0) return `Prices rose, and the wall gained ${blocks}.`;
  if (delta < 0) return `The wall lost ${blocks}, and every card is still here.`;
  return "Prices held, and the wall stands where it stood.";
}

// Two other things a turn can be worth saying out loud. Both are read off the
// player's own log and the real prices, both are one flat sentence, and neither
// of them praises anybody: a card that has climbed back to what it cost, and a
// wall that has never stood taller in this chapter. They are variations on the
// market line rather than a new kind of line, they sit below the stone line, and
// they are printed only on the turn they actually happen.
function variationLine(run: RunState, prev: number): string | null {
  const ch = chapterOf(run);

  // A held name whose price crossed back above the share weighted price the
  // player actually paid for it, on this turn and not before. Nothing here is
  // scored and nothing is compared to an alternative: it is arithmetic on the
  // player's own purchases.
  for (const id of ch.market) {
    const mine = run.cards.filter((c) => c.assetId === id && !c.stone);
    if (mine.length === 0) continue;
    let shares = 0;
    let paid = 0;
    for (const c of mine) { shares += c.shares; paid += c.buyDollars; }
    if (shares <= 0 || paid <= 0) continue;
    const weighted = paid / shares;
    const from = priceOf(run, id, prev);
    const to = priceOf(run, id, run.turn);
    // strictly below and then strictly above, so a name bought on the previous
    // turn at exactly this price has not "come back" from anywhere
    if (from > 0 && from < weighted && to > weighted) {
      return `${assetOf(id).name} is back above what you paid.`;
    }
  }

  // A wall that has never stood taller in this chapter, said only on the turn it
  // takes the record back. Two guards keep it from being wallpaper: the chapter
  // has to have had a turn that took blocks off the wall, and the turn before
  // this one must not have been a record itself, so a long climb says it once at
  // the moment it passes the old peak rather than on every turn afterwards.
  const cols = wallColumns(run);
  if (cols.length >= 3) {
    const now = cols[cols.length - 1].totalBlocks;
    let best = 0;
    let bestBefore = 0;
    let fell = false;
    for (let i = 0; i < cols.length - 1; i++) {
      if (i < cols.length - 2) bestBefore = Math.max(bestBefore, cols[i].totalBlocks);
      best = Math.max(best, cols[i].totalBlocks);
      if (i > 0 && cols[i].totalBlocks < cols[i - 1].totalBlocks) fell = true;
    }
    const lastWasRecord = cols[cols.length - 2].totalBlocks > bestBefore;
    if (fell && now > best && !lastWasRecord) return "The wall has never been taller this chapter.";
  }

  return null;
}

// Commit the plan and resolve the turn. Prices tick to the next mark, a
// column lands on the wall, a price at zero turns its cards to stone, and any
// front page dated inside the span is collected for the overlay.
export function endTurn(run: RunState): RunState {
  if (run.phase !== "plan") return run;
  const next = clone(run);
  const ch = chapterOf(next);
  const beforeBlocks = blocksOf(worthOf(next), next.denom);

  next.turn += 1;
  next.plan = null;

  // the bank pays first, on what was on deposit through the turn, into cash
  const interest = interestFor(next);
  next.interest = interest;
  next.cash += interest;
  const interestBlocks = blocksOf(interest, next.denom);

  // ids for the table, which plays the drain on the cards that just turned,
  // and names for the read line, which is a sentence a person reads
  const stonedIds: string[] = [];
  const stonedNames: string[] = [];
  for (const id of ch.market) {
    if (next.stones.includes(id)) continue;
    if (priceOf(next, id) === 0) {
      next.stones.push(id);
      stonedIds.push(id);
      stonedNames.push(assetOf(id).name);
      next.cards = next.cards.map((c) => (c.assetId === id && !c.stone ? { ...c, stone: true } : c));
    }
  }
  next.stonedIds = stonedIds;
  next.frontPage = frontPagesForTurn(ch, next.turn - 1);

  next.newAssets = ch.market.filter((id) => listedTurn(ch, id) === next.turn);
  for (const id of next.newAssets) if (!next.seen.includes(id)) next.seen.push(id);

  const prev = next.turn - 1;

  if (next.turn >= ch.turns) {
    next.read = readLine(
      blocksOf(worthOf(next), next.denom) - beforeBlocks - interestBlocks,
      stonedNames,
      next.cards.length > 0,
      variationLine(next, prev),
    );
    next.phase = "summary";
    next.archive = [...next.archive, { chapter: ch.id, columns: wallColumns(next) }];
    return next;
  }

  startPlan(next);
  const afterBlocks = blocksOf(worthOf(next), next.denom);
  // the read line is about the market and nothing else, so the two things that
  // arrived rather than moved, the income and the bank's payment, come off it
  next.read = readLine(
    afterBlocks - beforeBlocks - ch.incomeBlocks - interestBlocks,
    stonedNames,
    next.cards.length > 0,
    variationLine(next, prev),
  );
  return next;
}

// ------------------------------------------------------------- the deltas

// What moved on the turn that just resolved, as data, so the flash can be
// drawn rather than computed by a component. This is the only moment change
// percentages exist in the game: they flash on the wall and on the cards that
// moved, and then they are gone. A permanent percent line on a card face would
// turn the game into a screen full of forecasts, which is exactly what the
// style contract bans.
export interface AssetDelta {
  assetId: string;
  name: string;
  color: string;
  from: number;          // price at the previous turn boundary
  to: number;            // price now
  movePct: number;       // as a fraction, so -0.402 is down 40.2 percent
  held: boolean;         // the player owns at least one card of this name
  stoned: boolean;       // its price reached zero on this resolve
}

export interface CardDelta {
  uid: number;
  assetId: string;
  movePct: number | null;   // null for a card bought on the turn that just ran
  worthFrom: number;
  worthTo: number;
}

export interface ResolveDeltas {
  turn: number;
  blocksFrom: number;
  blocksTo: number;
  assets: AssetDelta[];
  cards: CardDelta[];
}

// The move every card and every asset made across the resolve that produced
// this state. Called after endTurn, so run.turn is the turn that just closed.
export function resolveDeltas(run: RunState): ResolveDeltas {
  const ch = chapterOf(run);
  const prev = Math.max(0, run.turn - 1);
  const assets: AssetDelta[] = [];
  for (const id of ch.market) {
    const from = priceOf(run, id, prev);
    const to = priceOf(run, id, run.turn);
    if (from <= 0 && to <= 0) continue;
    const a = assetOf(id);
    assets.push({
      assetId: id,
      name: a.name,
      color: a.color,
      from,
      to,
      movePct: from > 0 ? to / from - 1 : 0,
      held: run.cards.some((c) => c.assetId === id),
      stoned: run.stonedIds.includes(id),
    });
  }
  const cards: CardDelta[] = run.cards.map((c) => {
    const from = priceOf(run, c.assetId, prev);
    const to = priceOf(run, c.assetId, run.turn);
    // a card bought on the turn that just ran has nothing to compare against,
    // and inventing one would be inventing a price it never paid
    const born = c.chapter === ch.id && c.turn >= prev;
    return {
      uid: c.uid,
      assetId: c.assetId,
      movePct: born || from <= 0 ? null : to / from - 1,
      worthFrom: born ? c.buyDollars : c.shares * from,
      worthTo: cardWorth(c, to),
    };
  });
  return {
    turn: run.turn,
    blocksFrom: blocksOf(worthOf(run, prev), run.denom),
    blocksTo: blocksOf(worthOf(run), run.denom),
    assets,
    cards,
  };
}

// -------------------------------------------------------- the turn's tally

// What each holding did to the wall on the turn that just resolved, so the
// resolve can score the player's cards one at a time instead of blending them
// into one sweep. This is the same arithmetic wallColumns and wallMonths do, run
// twice on the same holdings: once at the prices the turn opened on, once at the
// prices it closed on. Because both sides go through the same largest remainder
// allocation the wall is drawn with, the parts add up to the whole exactly:
//
//   sum(holdings[].blocks) + cashBlocks === blocksTo - blocksFrom
//
// and blocksFrom and blocksTo are the two numbers the header rail actually
// stood at, before the turn and after it. Nothing here is scored, ranked or
// compared to an alternative. It is the wall's own change, itemised.
export interface HoldingTally {
  assetId: string;
  name: string;
  color: string;
  // this name was already a stone before the turn, so it moved nothing and the
  // table has nothing to say about it
  wasStone: boolean;
  stonedNow: boolean;
  blocksFrom: number;
  blocksTo: number;
  blocks: number;          // the signed change, which is what the chip says
  dollarsFrom: number;
  dollarsTo: number;
  movePct: number;
}

export interface TurnTally {
  turn: number;
  // in the order tableau(run) hands the stacks out, which is the order the wall
  // stacks its bands, so the chip and the band are the same thread
  holdings: HoldingTally[];
  // what the cash band did: the income the turn credited and the interest the
  // bank paid, plus whatever the rounding moved between the bands and the cash
  // on top of them
  cashBlocks: number;
  cashBandBlocks: number;
  blocksFrom: number;
  blocksTo: number;
}

// One wall column's allocation for the holdings the run is carrying right now,
// priced at `turn`, with `cash` on top. `unstone` is the list of names that
// turned to stone on this very resolve: at the opening prices they were still
// worth what they were worth, and drawing them as stone there would be a lie
// about the column the player was looking at a second ago.
function bandsAt(run: RunState, turn: number, cash: number, unstone: string[]) {
  const ch = chapterOf(run);
  const rows: { assetId: string; dollars: number; stone: boolean }[] = [];
  for (const id of ch.market) {
    let dollars = 0;
    let stone = false;
    for (const c of run.cards) {
      if (c.assetId !== id) continue;
      if (c.stone && !unstone.includes(id)) { stone = true; continue; }
      dollars += c.shares * priceOf(run, id, turn);
    }
    if (dollars > 0 || stone) rows.push({ assetId: id, dollars, stone });
  }
  const values = rows.map((r) => r.dollars);
  values.push(Math.max(0, cash));
  const alloc = allocateBlocks(values, run.denom);
  return { rows, alloc };
}

// Called after endTurn, so run.turn is the turn that just closed.
export function turnTally(run: RunState): TurnTally {
  const ch = chapterOf(run);
  const prev = Math.max(0, run.turn - 1);
  // Income is credited at the start of the next plan and the bank's interest is
  // credited by the resolve itself, so the cash the wall stood on before this
  // resolve is the cash it stands on now less both of those. A turn that ended
  // a chapter never opened a next plan and never took an income.
  const income = run.phase === "plan" ? ch.incomeBlocks * run.denom : 0;
  const from = bandsAt(run, prev, run.cash - income - run.interest, run.stonedIds);
  const to = bandsAt(run, run.turn, run.cash, []);

  const holdings: HoldingTally[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < to.rows.length; i++) {
    const row = to.rows[i];
    const j = from.rows.findIndex((r) => r.assetId === row.assetId);
    const a = assetOf(row.assetId);
    const dollarsFrom = j >= 0 ? from.rows[j].dollars : 0;
    const blocksFrom = j >= 0 ? from.alloc[j] : 0;
    seen.add(row.assetId);
    holdings.push({
      assetId: row.assetId,
      name: a.name,
      color: a.color,
      wasStone: j >= 0 ? from.rows[j].stone : row.stone,
      stonedNow: run.stonedIds.includes(row.assetId),
      blocksFrom,
      blocksTo: to.alloc[i],
      blocks: to.alloc[i] - blocksFrom,
      dollarsFrom,
      dollarsTo: row.dollars,
      movePct: dollarsFrom > 0 ? row.dollars / dollarsFrom - 1 : 0,
    });
  }
  // A stone carried in from a chapter whose market has closed is on the table
  // but never on the wall. It is listed so the row of chips and the row of
  // stacks stay the same length, and it moves nothing.
  for (const c of run.cards) {
    if (seen.has(c.assetId)) continue;
    seen.add(c.assetId);
    const a = assetOf(c.assetId);
    holdings.push({
      assetId: c.assetId, name: a.name, color: a.color,
      wasStone: true, stonedNow: false,
      blocksFrom: 0, blocksTo: 0, blocks: 0,
      dollarsFrom: 0, dollarsTo: 0, movePct: 0,
    });
  }

  const cashTo = to.alloc[to.alloc.length - 1];
  const cashFrom = from.alloc[from.alloc.length - 1];
  return {
    turn: run.turn,
    holdings,
    cashBlocks: cashTo - cashFrom,
    cashBandBlocks: cashTo,
    blocksFrom: from.alloc.reduce((s, v) => s + v, 0),
    blocksTo: to.alloc.reduce((s, v) => s + v, 0),
  };
}

// The one line of plain arithmetic the score rail carries about the player's own
// goal. It is a fact and never a suggestion: how many turns are left and how far
// the wall still is from the gold line, or that it is already past it.
export function stakesLine(
  turn: number, turns: number, blocks: number, targetBlocks: number,
): { text: string; past: boolean } {
  if (blocks >= targetBlocks) return { text: "past the target", past: true };
  const left = Math.max(0, targetBlocks - blocks);
  const gap = `${left} ${left === 1 ? "block" : "blocks"} to go`;
  const turnsLeft = Math.max(1, turns - turn + 1);
  if (turnsLeft <= 1) return { text: `last turn · ${gap}`, past: false };
  return { text: `${turnsLeft} turns left · ${gap}`, past: false };
}

// ---------------------------------------------------------------- debuts

// A card type meeting the player for the first time. The shop pauses once, the
// card is drawn large, one sentence says what the type is, and it never
// happens again for that type in this run.
export interface Debut {
  key: DebutKey;
  title: string;
  definition: string;
  // the card that brought the type in, so the gate can draw a real card rather
  // than a diagram of one
  assetId: string;
}

// Which type this card counts as. A stone is its own type, because a price
// that reached zero is a different object from a price that fell.
export function debutKeyOf(run: RunState, assetId: string): DebutKey {
  if (run.stones.includes(assetId)) return "stone";
  return assetOf(assetId).suit;
}

// The debuts standing on the shop counter right now, in teaching order, that
// the player has never been shown. The stone counts the first time one is on
// the table, because a stone never appears in the market at all.
export function pendingDebuts(run: RunState): Debut[] {
  const seen = new Set<DebutKey>(run.seenDebuts ?? []);
  const first = new Map<DebutKey, string>();
  for (const row of marketRows(run)) {
    const key = row.asset.suit;
    if (!seen.has(key) && !first.has(key)) first.set(key, row.asset.id);
  }
  const stone = run.cards.find((c) => c.stone);
  if (stone && !seen.has("stone")) first.set("stone", stone.assetId);
  const out: Debut[] = [];
  for (const key of DEBUT_ORDER) {
    const assetId = first.get(key);
    if (!assetId) continue;
    out.push({ key, title: DEBUT_TITLE[key], definition: CARD_DEFINITION[key], assetId });
  }
  return out;
}

// Told once, and then never again. This is persisted with the run, so a
// refresh cannot re-fire it.
export function markDebutSeen(run: RunState, key: DebutKey): RunState {
  if ((run.seenDebuts ?? []).includes(key)) return run;
  const next = clone(run);
  next.seenDebuts = [...next.seenDebuts, key];
  return next;
}

// ---------------------------------------------------------------- the wall

export interface WallBand {
  assetId: string;
  name: string;
  color: string;
  blocks: number;
  dollars: number;
  stone: boolean;
}

export interface WallColumn {
  turn: number;
  label: string;
  bands: WallBand[];     // fixed bottom up order, so a colour keeps its slot
  cashBlocks: number;
  cashDollars: number;
  totalBlocks: number;
  totalDollars: number;
}

// The wall, rebuilt from the trade log rather than recorded as it goes, so
// the past is always exactly what happened. Parts always sum to the whole
// because the split uses the same largest remainder allocation the tile stage
// already uses.
export function wallColumns(run: RunState): WallColumn[] {
  const ch = chapterOf(run);
  const marks = chapterMarks(ch);
  const income = ch.incomeBlocks * run.denom;
  const rate = interestPerTurn(ch);
  const chapterLog = run.log.filter((t) => t.chapter === ch.id);

  let cash = run.chapterOpenCash;
  let cards = run.chapterOpenCards.map((c) => ({ ...c }));
  const stones = new Set<string>();

  const columnAt = (turn: number, liveCash: number, liveCards: Card[]): WallColumn => {
    const values: number[] = [];
    const rows: { assetId: string; dollars: number; stone: boolean }[] = [];
    for (const id of ch.market) {
      let dollars = 0;
      let stone = false;
      for (const c of liveCards) {
        if (c.assetId !== id) continue;
        if (c.stone || stones.has(id)) { stone = true; continue; }
        dollars += c.shares * (run.prices[id]?.[turn] ?? 0);
      }
      if (dollars > 0 || stone) rows.push({ assetId: id, dollars, stone });
    }
    for (const r of rows) values.push(r.dollars);
    values.push(Math.max(0, liveCash));
    const alloc = allocateBlocks(values, run.denom);
    const bands: WallBand[] = rows.map((r, i) => {
      const a = assetOf(r.assetId);
      return {
        assetId: r.assetId, name: a.name, color: a.color,
        blocks: alloc[i], dollars: r.dollars, stone: r.stone,
      };
    });
    const cashBlocks = alloc[alloc.length - 1];
    const totalDollars = values.reduce((s, v) => s + v, 0);
    return {
      turn,
      label: marks[turn] ?? "",
      bands,
      cashBlocks,
      cashDollars: Math.max(0, liveCash),
      totalBlocks: alloc.reduce((s, v) => s + v, 0),
      totalDollars,
    };
  };

  const cols: WallColumn[] = [columnAt(0, cash, cards)];
  for (let t = 0; t < run.turn; t++) {
    cash += income;
    for (const e of chapterLog) {
      if (e.turn !== t) continue;
      if (e.side === "buy") {
        cards.push({
          uid: e.cardUid, assetId: e.assetId, chapter: e.chapter, turn: e.turn,
          shares: e.shares, buyPrice: e.price, buyDollars: e.dollars, fused: 1, stone: false,
        });
        cash -= e.dollars;
      } else {
        cards = cards.filter((c) => c.uid !== e.cardUid);
        cash += e.dollars;
      }
    }
    // the bank pays on what was on deposit when the turn resolved, exactly as
    // endTurn credits it
    cash += savingsOnDeposit(cards) * rate;
    for (const id of ch.market) if ((run.prices[id]?.[t + 1] ?? 1) === 0) stones.add(id);
    cols.push(columnAt(t + 1, cash, cards));
  }
  // the newest column is the live one, so the blocks that arrived this turn
  // and anything bought in this plan are already on the wall
  cols[cols.length - 1] = columnAt(run.turn, run.cash, run.cards);
  return cols;
}

// ------------------------------------------------------- the wall, drawn

// The same wall at the resolution the chapter can honestly draw. wallColumns
// is the model the sim, the badges and the summary read, and it stays one
// column per turn because a turn is what a player decides. This is the display
// model: it walks the same trade log, but inside a turn's span it samples every
// month the chapter has a real price for, so nine yearly turns of 2007 to 2015
// draw as ninety six monthly columns and the panic is a shape rather than one
// short bar.
//
// Money is attributed to the column the player was looking at when they moved
// it. A plan's income and its trades land on the column that closes the turn
// they were decided in, because that column is the live one while the plan is
// being made, and the holdings then ride the monthly prices across the next
// turn's span. This is the one rule that keeps a standing block standing: the
// rightmost column is drawn from the live cash and cards, so if the record
// re-attributed that money to the next turn the moment Play was pressed, the
// income would vanish off the top of a column nobody touched. It does not, and
// the boundary column of turn t therefore stands at exactly the block count the
// turn's tally counts up from.
export interface WallSlotColumn extends WallColumn {
  slot: number;      // position in the chapter's fixed grid
  boundary: boolean; // this column closes a turn
}

export function wallMonths(run: RunState): WallSlotColumn[] {
  const ch = chapterOf(run);
  const slots = chapterSlots(ch);
  const income = ch.incomeBlocks * run.denom;
  const rate = interestPerTurn(ch);
  const chapterLog = run.log.filter((t) => t.chapter === ch.id);

  let cash = run.chapterOpenCash;
  let cards = run.chapterOpenCards.map((c) => ({ ...c }));
  const stones = new Set<string>();
  // a stone is a price that reached zero, so a company that has not listed yet
  // and has no price at all is not one
  const quoted = new Set<string>();

  const columnAt = (index: number, liveCash: number, liveCards: Card[]): WallSlotColumn => {
    const slot = slots[index];
    const values: number[] = [];
    const rows: { assetId: string; dollars: number; stone: boolean }[] = [];
    for (const id of ch.market) {
      const price = slotPrice(ch, id, slot, run.prices[id]);
      if (price > 0) quoted.add(id);
      else if (quoted.has(id)) stones.add(id);
      let dollars = 0;
      let stone = false;
      for (const c of liveCards) {
        if (c.assetId !== id) continue;
        if (c.stone || stones.has(id)) { stone = true; continue; }
        dollars += c.shares * price;
      }
      if (dollars > 0 || stone) rows.push({ assetId: id, dollars, stone });
    }
    for (const r of rows) values.push(r.dollars);
    values.push(Math.max(0, liveCash));
    const alloc = allocateBlocks(values, run.denom);
    const bands: WallBand[] = rows.map((r, i) => {
      const a = assetOf(r.assetId);
      return {
        assetId: r.assetId, name: a.name, color: a.color,
        blocks: alloc[i], dollars: r.dollars, stone: r.stone,
      };
    });
    return {
      slot: index,
      boundary: slot.boundary,
      turn: slot.turn,
      label: slot.label,
      bands,
      cashBlocks: alloc[alloc.length - 1],
      cashDollars: Math.max(0, liveCash),
      totalBlocks: alloc.reduce((s, v) => s + v, 0),
      totalDollars: values.reduce((s, v) => s + v, 0),
    };
  };

  // One plan settling: the turn's income arrives and the turn's trades go
  // through, in the order the player made them.
  const settle = (turn: number) => {
    cash += income;
    for (const e of chapterLog) {
      if (e.turn !== turn) continue;
      if (e.side === "buy") {
        cards.push({
          uid: e.cardUid, assetId: e.assetId, chapter: e.chapter, turn: e.turn,
          shares: e.shares, buyPrice: e.price, buyDollars: e.dollars, fused: 1, stone: false,
        });
        cash -= e.dollars;
      } else {
        cards = cards.filter((c) => c.uid !== e.cardUid);
        cash += e.dollars;
      }
    }
  };

  // the chapter's opening column is the live one while the first plan is being
  // made, so the first plan stands on it
  settle(0);
  const cols: WallSlotColumn[] = [columnAt(0, cash, cards)];
  let index = 1;
  for (let t = 0; t < run.turn; t++) {
    // every slot inside this turn's span carries the holdings the turn was
    // played with, priced month by month
    while (index < slots.length && slots[index].turn === t + 1) {
      if (slots[index].boundary) {
        // the turn closes here: the bank pays on what was on deposit through
        // it, and then the next plan's income and trades land on this column,
        // because this is the column the next plan is made on
        cash += savingsOnDeposit(cards) * rate;
        settle(t + 1);
      }
      cols.push(columnAt(index, cash, cards));
      index++;
    }
  }
  // the newest column is the live one, so the blocks that arrived this turn and
  // anything bought in this plan are already on the wall
  cols[cols.length - 1] = columnAt(cols.length - 1, run.cash, run.cards);
  return cols;
}

// How many columns the chapter's grid will ever hold, known from turn one so
// the wall never re-fits under the player.
export function wallSlotCount(run: RunState): number {
  return chapterSlots(chapterOf(run)).length;
}

// The slot each turn boundary lands on, for the marks under the floor and for
// the index line.
export function wallBoundarySlots(run: RunState): number[] {
  const slots = chapterSlots(chapterOf(run));
  const out: number[] = [];
  slots.forEach((s, i) => {
    if (s.boundary) out.push(i);
  });
  return out;
}

// The gold line, carried in dollars from turn one, because money is what a
// player wants and the block count is what they read off the wall.
export function targetLine(run: RunState): { dollars: number; blocks: number } {
  const ch = chapterOf(run);
  return { dollars: ch.target, blocks: blocksOf(ch.target, run.denom) };
}

// ---------------------------------------------------------------- rail

export interface HeaderRail {
  chapterId: number;
  chapterName: string;
  turn: number;
  turns: number;
  target: number;
  denom: number;
  worth: number;
  blocks: number;
  read: string;
}

export function headerRail(run: RunState): HeaderRail {
  const ch = chapterOf(run);
  return {
    chapterId: ch.id,
    chapterName: ch.name,
    turn: Math.min(run.turn + 1, ch.turns),
    turns: ch.turns,
    target: ch.target,
    denom: run.denom,
    worth: worthOf(run),
    blocks: blocksOf(worthOf(run), run.denom),
    read: run.read,
  };
}

export function chapterCardFor(run: RunState): ChapterCard {
  const ch = chapterOf(run);
  return chapterCard(ch, run.denom, run.chapterOpenWorth, run.chapterOpenCards.length);
}

// ---------------------------------------------------------------- table

export interface TableauStack {
  asset: TallyAsset;
  price: number;
  cards: { card: Card; worth: number; blocks: number; fallFromCost: number }[];
  totalWorth: number;
  totalBlocks: number;
  stone: boolean;
  // an authored rate on a table that runs on real prices, so the face says so
  illustrative: boolean;
  // what savings pays in this chapter, for the one card whose face carries a
  // rate instead of a price
  ratePerYear: number | null;
}

export function tableau(run: RunState): TableauStack[] {
  const ch = chapterOf(run);
  const order = ch.market.slice();
  for (const c of run.cards) if (!order.includes(c.assetId)) order.push(c.assetId);
  const out: TableauStack[] = [];
  for (const id of order) {
    const mine = run.cards.filter((c) => c.assetId === id);
    if (mine.length === 0) continue;
    const price = priceOf(run, id);
    const cards = mine.map((card) => ({
      card,
      worth: cardWorth(card, price),
      blocks: blocksOf(cardWorth(card, price), run.denom),
      fallFromCost: 1 - priceRatio(card, price),
    }));
    out.push({
      asset: assetOf(id),
      price,
      cards,
      totalWorth: cards.reduce((s, c) => s + c.worth, 0),
      totalBlocks: blocksOf(cards.reduce((s, c) => s + c.worth, 0), run.denom),
      stone: run.stones.includes(id),
      illustrative: illustrativeHere(ch, assetOf(id)),
      ratePerYear: id === SAVINGS_ID ? savingsRate(ch) : null,
    });
  }
  return out;
}

export function discardPile(run: RunState): { card: Card; asset: TallyAsset; soldFor: number }[] {
  return run.discard.map((card) => {
    const entry = [...run.log].reverse().find((e) => e.side === "sell" && e.cardUid === card.uid);
    return { card, asset: assetOf(card.assetId), soldFor: entry?.dollars ?? 0 };
  });
}

// ---------------------------------------------------------------- badges

export interface BadgeDef {
  id: string;
  name: string;
  copy: string;
  scope: "chapter" | "run";
}

// Behaviour, named and permanent, and deliberately outside the scoring loop,
// so no turn is ever won by obeying a rule. No badge pays for trading volume,
// for timing, or for a correct prediction.
export const BADGES: BadgeDef[] = [
  // CEE Investing 8-5a (diversification within and among asset classes);
  // concept: diversification
  { id: "wide-open", scope: "chapter", name: "Wide open",
    copy: "You finished a chapter holding four different rings." },
  // CEE Investing 8-7 with the 12-5c ladder (a plan decided in calm holds
  // through a downturn); concept: panic-selling
  { id: "iron-hand", scope: "chapter", name: "Iron hand",
    copy: "You cleared a chapter without discarding a single card." },
  // CEE Investing 8-7 with the 12-5c ladder (buying continues through a
  // downturn, and nobody can time the bottom); concept: dca. The wall low is
  // read off the record afterwards and never predicted.
  { id: "bought-the-fear", scope: "chapter", name: "Bought the fear",
    copy: "You bought on the turn the wall was at its lowest." },
  // CEE Investing 12-5c ladder (downturns and investor mood); concept:
  // panic-selling
  { id: "still-standing", scope: "chapter", name: "Still standing",
    copy: "You held a card through a fall of more than half and finished the chapter still holding it." },
  // CEE Investing 8-7c (future value of a regular series); concept: dca
  { id: "never-idle", scope: "chapter", name: "Never idle",
    copy: "You put blocks to work on every turn of a chapter." },
  // CEE Investing 8-4 (risks of owning single stocks); concept: survivorship
  { id: "stone-carrier", scope: "run", name: "Stone carrier",
    copy: "You finished a run holding a card that went bankrupt. There is no way to get rid of it, and that is the point." },
  // CEE Personal Finance 8-3 (compounding over long horizons) with CEE
  // Investing 8-5b (time in the market); concept: compounding
  { id: "long-hold", scope: "run", name: "Long hold",
    copy: "You finished a run still holding a card you bought in the first chapter you played." },
];

export function badgeById(id: string): BadgeDef {
  const b = BADGES.find((x) => x.id === id);
  if (!b) throw new Error(`unknown badge: ${id}`);
  return b;
}

function chapterBadges(run: RunState, ch: Chapter, cleared: boolean): string[] {
  const out: string[] = [];
  const mine = run.log.filter((e) => e.chapter === ch.id);

  // What counts as putting blocks to work: a purchase that was still on the
  // table when the turn resolved. Buying a card and selling it straight back
  // inside the same plan costs nothing, moves no money and takes no risk, so
  // it is not work and it never earns a badge. Rule 2 of the reward function
  // contract says no badge may pay for trading volume, and a wash trade is
  // volume and nothing else.
  const surviving = mine.filter(
    (e) => e.side === "buy"
      && !mine.some((s) => s.side === "sell" && s.cardUid === e.cardUid && s.turn === e.turn),
  );

  const suits = new Set<Suit>();
  for (const c of run.cards) suits.add(assetOf(c.assetId).suit);
  if (suits.size >= 4) out.push("wide-open");

  if (cleared && !mine.some((e) => e.side === "sell")) out.push("iron-hand");

  const cols = wallColumns(run);
  let lowTurn = 0;
  let low = Infinity;
  for (const col of cols) {
    if (col.totalBlocks < low) { low = col.totalBlocks; lowTurn = col.turn; }
  }
  // read off the wall after the fact, never predicted, and only a purchase
  // that survived the turn counts
  if (surviving.some((e) => e.turn === lowTurn)) out.push("bought-the-fear");

  for (const card of run.cards) {
    const series = run.prices[card.assetId];
    if (!series) continue;
    let worst = card.buyPrice;
    const from = card.chapter === ch.id ? card.turn : 0;
    for (let t = from; t <= ch.turns; t++) worst = Math.min(worst, series[t] ?? worst);
    if (card.buyPrice > 0 && worst / card.buyPrice < 0.5) { out.push("still-standing"); break; }
  }

  let everyTurn = ch.turns > 0;
  for (let t = 0; t < ch.turns; t++) {
    if (!surviving.some((e) => e.turn === t)) { everyTurn = false; break; }
  }
  if (everyTurn) out.push("never-idle");

  return out;
}

function runBadges(run: RunState): string[] {
  const out: string[] = [];
  if (run.cards.some((c) => c.stone)) out.push("stone-carrier");
  if (run.cards.some((c) => c.chapter === run.startChapter)) out.push("long-hold");
  return out;
}

// ---------------------------------------------------------------- summary

export interface ChapterSummary {
  runId: string;
  chapterId: number;
  chapterName: string;
  // the one sentence the chapter was built to teach, which is the thing a
  // player leaves a chapter with and therefore the loudest line on the panel
  teaches: string;
  target: number;
  finishedAt: number;
  cleared: boolean;
  denom: number;
  blocks: number;
  targetBlocks: number;
  badges: BadgeDef[];
  frontPages: FrontPage[];
  settlement: Settlement | null;
  // the plain sentence about what happens to the cards this chapter closes
  settlementNotice: string | null;
  nextChapter: number | null;
  // Where this chapter sits on the ladder, and what the next one is. The
  // summary always fires after the chapter's last turn, so there is never a
  // turn left in the chapter being read back: the only thing left to say is
  // how much ladder is left, which is what a run's seed used to sit in place
  // of. See docs/tally-sprint-1.md, decision 6.
  ladderPosition: number;
  ladderCount: number;
  nextChapterName: string | null;
  nextChapterTurns: number | null;
}

// Badges are never announced mid turn. They land here, one at a time.
export function chapterSummary(run: RunState): ChapterSummary {
  const ch = chapterOf(run);
  const worth = worthOf(run);
  const cleared = worth + 1e-6 >= ch.target;
  const earned = chapterBadges(run, ch, cleared).filter((b) => !run.badges.includes(b));
  const nextId = run.at + 1 < run.order.length ? run.order[run.at + 1] : null;

  let notice: string | null = null;
  if (cleared && nextId) {
    const nextCh = chapterById(nextId);
    const closing = run.cards.filter((c) => !c.stone && !nextCh.market.includes(c.assetId));
    if (closing.length > 0) {
      const names = [...new Set(closing.map((c) => assetOf(c.assetId).name))];
      notice = `The market for ${listNames(names)} closes when this chapter ends, so those cards are sold at their last price and the money comes back to you.`;
    }
  }

  return {
    runId: run.runId,
    chapterId: ch.id,
    chapterName: ch.name,
    teaches: ch.teaches,
    target: ch.target,
    finishedAt: worth,
    cleared,
    denom: run.denom,
    blocks: blocksOf(worth, run.denom),
    targetBlocks: blocksOf(ch.target, run.denom),
    badges: earned.map(badgeById),
    frontPages: frontPagesForChapter(ch),
    settlement: run.settlement,
    settlementNotice: notice,
    nextChapter: cleared ? nextId : null,
    ladderPosition: ch.id,
    ladderCount: CHAPTERS.length,
    nextChapterName: cleared && nextId ? chapterById(nextId).name : null,
    nextChapterTurns: cleared && nextId ? chapterById(nextId).turns : null,
  };
}

function listNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Take the summary and move on: to the next chapter, to the run report, or to
// the end of the ladder.
export function advance(run: RunState): RunState {
  const s = chapterSummary(run);
  const next = clone(run);
  next.badges = [...next.badges, ...s.badges.map((b) => b.id)];
  if (!s.cleared) {
    next.phase = "over";
    return next;
  }
  next.cleared = [...next.cleared, s.chapterId];
  const ch = chapterOf(next);
  const carry: Record<string, number> = { ...next.carryPrice };
  for (const id of ch.market) carry[id] = next.prices[id][ch.turns];
  next.carryPrice = carry;

  if (next.at + 1 >= next.order.length) {
    next.phase = "won";
    next.badges = [...next.badges, ...runBadges(next).filter((b) => !next.badges.includes(b))];
    return next;
  }
  next.at += 1;
  openChapter(next, false);
  return next;
}

// ---------------------------------------------------------------- forensics

export interface Forensics {
  runId: string;
  chapterId: number;
  chapterName: string;
  // the one sentence the chapter was built to teach, which is the thing a
  // player leaves a chapter with and therefore the loudest line on the panel
  teaches: string;
  target: number;
  finishedAt: number;
  // the single most concentrated moment of the chapter, from the trade log
  peak: {
    turn: number; label: string; assetId: string; name: string;
    blocks: number; totalBlocks: number;
  } | null;
  // what that card then did, in blocks, from that turn to the end
  after: { blocksBefore: number; blocksAfter: number; endLabel: string } | null;
  // the option that was on the table at the time and was let go. It is shown
  // once and never ranked, because nothing is ever scored against a
  // counterfactual.
  passedOn: { name: string; dollars: number; endDollars: number; endBlocks: number } | null;
  keptInstruments: { assetId: string; name: string }[];
  badges: BadgeDef[];
  unlockedStarts: number[];
}

export function runReport(run: RunState, box: BoxState = loadBox()): Forensics {
  const ch = chapterOf(run);
  const cols = wallColumns(run);

  // The peak is the earliest moment the wall was at its most concentrated, and
  // the final column is never eligible for it. A peak on the last column has
  // nothing after it, so the after clause would read "eighteen blocks to
  // eighteen blocks" and teach nobody anything. Ties go to the earlier column
  // for the same reason: the earlier one leaves the most room to mean
  // something.
  let peak: Forensics["peak"] = null;
  for (const col of cols.slice(0, -1)) {
    for (const band of col.bands) {
      if (col.totalBlocks <= 0) continue;
      const share = band.blocks / col.totalBlocks;
      const best = peak ? peak.blocks / peak.totalBlocks : 0;
      if (share > best) {
        peak = {
          turn: col.turn, label: col.label, assetId: band.assetId,
          name: band.name, blocks: band.blocks, totalBlocks: col.totalBlocks,
        };
      }
    }
  }

  let after: Forensics["after"] = null;
  let passedOn: Forensics["passedOn"] = null;
  if (peak) {
    const last = cols[cols.length - 1];
    const endBand = last.bands.find((b) => b.assetId === peak!.assetId);
    after = {
      blocksBefore: peak.blocks,
      blocksAfter: endBand?.blocks ?? 0,
      endLabel: last.label,
    };
    const idx = run.prices[INDEX_ID];
    const peakCol = cols.find((c) => c.turn === peak!.turn);
    const dollars = peakCol?.bands.find((b) => b.assetId === peak!.assetId)?.dollars ?? 0;
    if (idx && idx[peak.turn] > 0 && dollars > 0) {
      const shares = dollars / idx[peak.turn];
      const endDollars = shares * idx[run.turn];
      passedOn = {
        name: assetOf(INDEX_ID).name,
        dollars,
        endDollars,
        endBlocks: blocksOf(endDollars, run.denom),
      };
    }
  }

  const keptIds = [...new Set(run.cards.filter((c) => assetOf(c.assetId).carry !== "settle").map((c) => c.assetId))];
  const starts = [...new Set([1, ...box.clearedChapters, ...run.cleared])].sort((a, b) => a - b);

  return {
    runId: run.runId,
    chapterId: ch.id,
    chapterName: ch.name,
    teaches: ch.teaches,
    target: ch.target,
    finishedAt: worthOf(run),
    peak,
    after,
    passedOn,
    keptInstruments: keptIds.map((id) => ({ assetId: id, name: assetOf(id).name })),
    badges: run.badges.map(badgeById),
    unlockedStarts: starts,
  };
}

// Everything the run earned goes into the box, and nothing else survives.
export function bankRun(run: RunState, box: BoxState = loadBox()): BoxState {
  const next: BoxState = {
    clearedChapters: [...new Set([...box.clearedChapters, ...run.cleared])].sort((a, b) => a - b),
    instruments: [...new Set([...box.instruments, ...run.cards.map((c) => c.assetId), ...run.discard.map((c) => c.assetId)])],
    badges: [...new Set([...box.badges, ...run.badges])],
    eraBest: { ...box.eraBest },
  };
  for (const rec of run.archive) {
    const ch = chapterById(rec.chapter);
    if (ch.source.kind !== "era") continue;
    const end = rec.columns[rec.columns.length - 1]?.totalDollars ?? 0;
    if (end > (next.eraBest[ch.source.eraId] ?? 0)) next.eraBest[ch.source.eraId] = end;
  }
  saveBox(next);
  clearSavedRun();
  return next;
}

// ------------------------------------------------------------------ export

export { CHAPTERS, TALLY_LADDER, WALL_MAX_BLOCKS, CARD_DEFINITION };
export type { Chapter, ChapterCard, FrontPage, Card, DebutKey, MarketRow, TallyAsset };
