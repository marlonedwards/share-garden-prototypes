// Guess the Stock: the whole model, pure and free of React.
//
// The page draws what this file computes and nothing more. Everything a puzzle
// knows how to do lives here: which hints have been dealt and in what order,
// whether a typed guess names the company, what the axis reads in percent or in
// dollars, what the running scorecard says, and which puzzle comes next.
//
// Storage is three keys and all of them are plain JSON:
//
//   guess-stats     the running scorecard, so it survives a reload
//   guess-cursor    the deal order and how far into it the player is
//   guess-settings  easy mode, off until a player turns it on
//   guess-shelf     which puzzles are solved and which were revealed
//
// Nothing here reaches for the DOM, so tools/guessSim.ts runs the same code the
// browser runs.
import { COMPANIES, Company } from "../../data/companyCatalog";

export type { Company };

export interface Puzzle {
  id: string;
  name: string;
  ticker: string;
  aliases: string[];
  sector: string;
  year: number;
  marketCap: string;
  story: string;
  par: number;
  /** ISO day stamps for every close, from the year before to the year after */
  dates: string[];
  /** split and dividend adjusted closes, rescaled to the mystery year's real quote */
  closes: number[];
  yearStartIndex: number;
  yearEndIndex: number;
  /** true when a split falls inside the baked window, so dollar labels drift from the era's quotes past it */
  splitAdjusted?: boolean;
}

// ------------------------------------------------------------- the ladder

export type HintKey = "widen" | "sector" | "price" | "size";

/**
 * The fixed order. One press of the hint button deals the next one along.
 * The year is not on it: every puzzle stamps its year on the axis from the
 * first second, so knowing when it happened is free and the game is about
 * knowing who it was.
 */
export const HINT_LADDER: readonly HintKey[] = ["widen", "sector", "price", "size"];

export interface PuzzleState {
  puzzleId: string;
  /** how many hints have been dealt, 0 to 5 */
  hints: number;
  /** wrong guesses, as typed, in the order they were made */
  guesses: string[];
  status: "playing" | "solved" | "failed";
}

export function newPuzzle(puzzleId: string): PuzzleState {
  return { puzzleId, hints: 0, guesses: [], status: "playing" };
}

/** The hints dealt so far, in ladder order. Never repeats and never reorders. */
export function dealtHints(state: PuzzleState): HintKey[] {
  return HINT_LADDER.slice(0, state.hints) as HintKey[];
}

export function hasHint(state: PuzzleState, key: HintKey): boolean {
  return HINT_LADDER.indexOf(key) < state.hints;
}

export function canDealHint(state: PuzzleState): boolean {
  return state.status === "playing" && state.hints < HINT_LADDER.length;
}

/** Deal the next hint. A finished puzzle and an exhausted ladder both no-op. */
export function dealHint(state: PuzzleState): PuzzleState {
  if (!canDealHint(state)) return state;
  return { ...state, hints: state.hints + 1 };
}

/** The line a revealed hint reads as, without its "> " marker. */
export function hintLine(puzzle: Puzzle, key: HintKey): { label: string; value: string } {
  switch (key) {
    case "widen":
      return { label: "widen", value: "one year either side" };
    case "sector":
      return { label: "sector", value: puzzle.sector };
    case "price":
      return { label: "price", value: "real dollars on the axis" };
    case "size":
      return { label: "size", value: `${puzzle.marketCap} at year end` };
  }
}

// ------------------------------------------------------------- matching

// Words that carry no identity, so a player never has to type them and never
// has to leave them out.
const FILLER = new Set([
  "the", "inc", "incorporated", "corp", "corporation", "co", "company",
  "companies", "ltd", "limited", "plc", "holdings", "holding", "group",
  "sa", "nv", "ag",
]);

/**
 * Fold a typed guess down to what it actually names: lower case, no
 * punctuation, no spaces, no corporate filler. "The Coca-Cola Company" and
 * "coca cola" land on the same string; "google" never lands on Meta.
 */
export function normalizeGuess(text: string): string {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
  const kept = tokens.filter((t) => !FILLER.has(t));
  return (kept.length ? kept : tokens).join("");
}

/** Every string that solves this puzzle: its name, its ticker, its aliases. */
export function answerKeys(puzzle: Puzzle): string[] {
  const keys = new Set<string>();
  for (const raw of [puzzle.name, puzzle.ticker, ...puzzle.aliases]) {
    const k = normalizeGuess(raw);
    if (k) keys.add(k);
  }
  return [...keys];
}

export function isCorrect(puzzle: Puzzle, text: string): boolean {
  const k = normalizeGuess(text);
  if (!k) return false;
  return answerKeys(puzzle).includes(k);
}

export interface GuessResult {
  state: PuzzleState;
  correct: boolean;
  /** true when the guess was blank or already made, so nothing happened */
  ignored: boolean;
}

/** Guessing is free and unlimited. A wrong guess only joins the guessed line. */
export function submitGuess(state: PuzzleState, puzzle: Puzzle, text: string): GuessResult {
  const typed = text.trim();
  if (state.status !== "playing" || !typed) {
    return { state, correct: false, ignored: true };
  }
  if (isCorrect(puzzle, typed)) {
    return { state: { ...state, status: "solved" }, correct: true, ignored: false };
  }
  const already = state.guesses.some((g) => normalizeGuess(g) === normalizeGuess(typed));
  if (already) return { state, correct: false, ignored: true };
  return {
    state: { ...state, guesses: [...state.guesses, typed.toLowerCase()] },
    correct: false,
    ignored: false,
  };
}

/** Reveal answer. Always available, never scolded, recorded as a fail. */
export function giveUp(state: PuzzleState): PuzzleState {
  if (state.status !== "playing") return state;
  return { ...state, status: "failed" };
}

// ------------------------------------------------------------- the catalog

/** Every string that names a catalog company, name and ticker and aliases. */
export function companyKeys(c: Company): string[] {
  return keyPairs(c).map((p) => p.key);
}

// the folded key alongside the words as the catalog writes them, so a
// suggestion row can show "apple computer" rather than "applecomputer"
function keyPairs(c: Company): { key: string; raw: string }[] {
  const seen = new Set<string>();
  const out: { key: string; raw: string }[] = [];
  for (const raw of [c.name, c.ticker, ...c.aliases]) {
    const key = normalizeGuess(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, raw });
  }
  return out;
}

export interface Suggestion {
  company: Company;
  /** the word that matched, as the catalog writes it, for the row to show */
  matched: string;
}

// A name or alias that starts with what was typed beats a ticker that does,
// and both beat a match buried in the middle of a word. Ties go to catalog
// order, which runs from the famous to the obscure inside each sector.
const EXACT = 0;
const NAME_PREFIX = 1;
const TICKER_PREFIX = 2;
const CONTAINS = 3;

function scoreCompany(c: Company, q: string): { score: number; matched: string } | null {
  const ticker = normalizeGuess(c.ticker);
  let best: { score: number; matched: string } | null = null;
  for (const { key, raw } of keyPairs(c)) {
    let score: number;
    if (key === q) score = EXACT;
    else if (key.startsWith(q)) score = key === ticker ? TICKER_PREFIX : NAME_PREFIX;
    else if (key.includes(q)) score = CONTAINS;
    else continue;
    if (!best || score < best.score) best = { score, matched: raw };
  }
  return best;
}

/**
 * The rows under the guess box. Typing g meets Alphabet through its google
 * alias, not only companies whose legal name happens to start with the letter.
 */
export function suggestCompanies(query: string, limit = 6, catalog: Company[] = COMPANIES): Suggestion[] {
  const q = normalizeGuess(query);
  if (!q) return [];
  const hits: { order: number; score: number; s: Suggestion }[] = [];
  catalog.forEach((company, order) => {
    const best = scoreCompany(company, q);
    if (best) hits.push({ order, score: best.score, s: { company, matched: best.matched } });
  });
  hits.sort((a, b) => a.score - b.score || a.order - b.order);
  return hits.slice(0, limit).map((h) => h.s);
}

/** The one company a string names exactly, or nothing. Never a near miss. */
export function findCompany(text: string, catalog: Company[] = COMPANIES): Company | null {
  const q = normalizeGuess(text);
  if (!q) return null;
  return catalog.find((c) => companyKeys(c).includes(q)) ?? null;
}

/** Only a catalog company can be submitted, so this is the gate the UI asks. */
export function isSubmittable(text: string, catalog: Company[] = COMPANIES): boolean {
  return findCompany(text, catalog) !== null;
}

// ------------------------------------------------------------- easy mode

export interface Settings {
  easy: boolean;
}

export const DEFAULT_SETTINGS: Settings = { easy: false };

export type SectorVerdict = "same" | "different" | null;

/**
 * Easy mode's whole tell: does the company just guessed work in the same trade
 * as the answer. Unknown names get nothing rather than a guess.
 */
export function sectorVerdict(guess: string, puzzle: Puzzle, catalog: Company[] = COMPANIES): SectorVerdict {
  const company = findCompany(guess, catalog);
  if (!company) return null;
  return company.sector === puzzle.sector ? "same" : "different";
}

export function verdictLabel(verdict: SectorVerdict): string {
  if (verdict === "same") return "same sector";
  if (verdict === "different") return "different sector";
  return "";
}

// ------------------------------------------------------------- the chart

export interface Window {
  start: number;
  end: number;
}

/**
 * The slice of days on screen. Before the widen hint that is the mystery year
 * alone; after it, everything the bake found on either side.
 */
export function visibleWindow(puzzle: Puzzle, widened: boolean): Window {
  if (!widened) return { start: puzzle.yearStartIndex, end: puzzle.yearEndIndex };
  return { start: 0, end: puzzle.closes.length - 1 };
}

/** Percent from the mystery year's first close, as a fraction: 0.24 is +24%. */
export function percentAt(puzzle: Puzzle, index: number): number {
  const base = puzzle.closes[puzzle.yearStartIndex];
  return puzzle.closes[index] / base - 1;
}

/** The dollar axis is the baked close itself, at the era's quoted scale. */
export function dollarAt(puzzle: Puzzle, index: number): number {
  return puzzle.closes[index];
}

export function seriesRange(values: number[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

const PERCENT_STEPS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25];

/** Percent gridlines that adapt to the year: a bad year gets -25% and -50%. */
export function percentTicks(min: number, max: number): number[] {
  const span = Math.max(max - min, 0.02);
  const step = PERCENT_STEPS.find((s) => span / s <= 4) ?? 50;
  const out: number[] = [];
  const first = Math.ceil((min - 1e-9) / step) * step;
  for (let v = first; v <= max + 1e-9; v += step) out.push(+v.toFixed(4));
  return out;
}

const DOLLAR_STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

export function dollarTicks(min: number, max: number): number[] {
  const span = Math.max(max - min, 0.01);
  const step = DOLLAR_STEPS.find((s) => span / s <= 4) ?? 2000;
  const out: number[] = [];
  const first = Math.ceil((min - 1e-9) / step) * step;
  for (let v = first; v <= max + 1e-9; v += step) out.push(+v.toFixed(3));
  return out;
}

export function formatPercent(v: number): string {
  const pct = Math.round(v * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function formatDollars(v: number): string {
  if (v >= 100) return `$${Math.round(v)}`;
  if (v >= 10) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(1)}`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export interface MonthMark {
  /** index into the puzzle's day arrays where this month begins */
  index: number;
  month: number;
  year: number;
  /** null when the month carries no label */
  label: string | null;
}

/**
 * Where the month gridlines fall inside a window, and which ones get a name.
 * Jan, Apr, Jul and Oct are labelled; once the year hint is dealt the label
 * carries the real year with it.
 */
export function monthMarks(puzzle: Puzzle, win: Window, showYear: boolean): MonthMark[] {
  const marks: MonthMark[] = [];
  let last = "";
  for (let i = win.start; i <= win.end; i++) {
    const stamp = puzzle.dates[i].slice(0, 7);
    if (stamp === last) continue;
    last = stamp;
    const year = Number(stamp.slice(0, 4));
    const month = Number(stamp.slice(5, 7)) - 1;
    const named = month % 3 === 0;
    const name = MONTHS[month];
    marks.push({
      index: i,
      month,
      year,
      label: named ? (showYear ? `${name} ${year}` : name) : null,
    });
  }
  return marks;
}

// ------------------------------------------------------------- scorecard

export interface Stats {
  played: number;
  solved: number;
  failed: number;
  streak: number;
  /** hints spent on solved puzzles, and the par of those same puzzles */
  hints: number;
  par: number;
}

export const EMPTY_STATS: Stats = { played: 0, solved: 0, failed: 0, streak: 0, hints: 0, par: 0 };

export function recordSolve(stats: Stats, hints: number, par: number): Stats {
  return {
    played: stats.played + 1,
    solved: stats.solved + 1,
    failed: stats.failed,
    streak: stats.streak + 1,
    hints: stats.hints + hints,
    par: stats.par + par,
  };
}

export function recordFail(stats: Stats): Stats {
  return { ...stats, played: stats.played + 1, failed: stats.failed + 1, streak: 0 };
}

function oneDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** The one quiet line under the game. Lower case, no scolding, no jargon. */
export function scorecardLine(stats: Stats): string {
  if (stats.played === 0) return "no puzzles yet";
  const parts = [`solved ${stats.solved} of ${stats.played}`, `streak ${stats.streak}`];
  if (stats.solved > 0) {
    parts.push(
      `${oneDecimal(stats.hints / stats.solved)} hints against par ${oneDecimal(stats.par / stats.solved)}`,
    );
  }
  return parts.join(" . ");
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five"];

function hintWords(n: number): string {
  return n === 1 ? "1 hint" : `${n} hints`;
}

/** The reveal's result line. Under par is the brag; a fail is simply revealed. */
export function resultLine(state: PuzzleState, puzzle: Puzzle): string {
  if (state.status !== "solved") return "revealed";
  const opened = state.hints === 0 ? "solved with no hints" : `solved with ${hintWords(state.hints)}`;
  const diff = puzzle.par - state.hints;
  if (diff === 0) return `${opened}, at par`;
  const word = COUNT_WORDS[Math.min(Math.abs(diff), 5)];
  return `${opened}, ${word} ${diff > 0 ? "under" : "over"} par`;
}

// ------------------------------------------------------------- the shelf

export type ShelfMark = "solved" | "revealed";

/** What the collection knows: one mark per puzzle a player has finished. */
export type Shelf = Record<string, ShelfMark>;

export const EMPTY_SHELF: Shelf = {};

/**
 * Marking a puzzle. A solve is the better mark and outranks a reveal, so a
 * puzzle solved on a later pass stops reading as revealed, and nothing a
 * player has already earned is ever taken away.
 */
export function markShelf(shelf: Shelf, id: string, mark: ShelfMark): Shelf {
  if (shelf[id] === "solved") return shelf;
  return { ...shelf, [id]: mark };
}

export function shelfMark(shelf: Shelf, id: string): ShelfMark | null {
  return shelf[id] ?? null;
}

export function shelfCounts(shelf: Shelf, ids: string[]): { solved: number; revealed: number; locked: number } {
  let solved = 0;
  let revealed = 0;
  for (const id of ids) {
    const mark = shelf[id];
    if (mark === "solved") solved++;
    else if (mark === "revealed") revealed++;
  }
  return { solved, revealed, locked: ids.length - solved - revealed };
}

/** The line on the collection's own header, in the same quiet voice. */
export function shelfLine(shelf: Shelf, ids: string[]): string {
  const { solved, revealed } = shelfCounts(shelf, ids);
  return `${solved} solved . ${revealed} revealed . ${ids.length} in the pool`;
}

// ------------------------------------------------------------- deal order

export interface Order {
  seq: string[];
  cursor: number;
}

export type Random = () => number;

/** Fisher-Yates, with the source of randomness handed in so tests can pin it. */
export function shuffle<T>(items: T[], rnd: Random = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The first run is the curated order, most iconic first. */
export function initialOrder(ids: string[]): Order {
  return { seq: ids.slice(), cursor: 0 };
}

export function currentId(order: Order): string {
  return order.seq[order.cursor];
}

/**
 * Step to the next puzzle. The pool is exhausted before anything repeats; when
 * it runs out the pool reshuffles and the new pass begins.
 */
export function advanceOrder(order: Order, ids: string[], rnd: Random = Math.random): Order {
  const next = order.cursor + 1;
  if (next < order.seq.length) return { seq: order.seq, cursor: next };
  let seq = shuffle(ids, rnd);
  if (seq.length > 1 && seq[0] === order.seq[order.seq.length - 1]) {
    seq = [...seq.slice(1), seq[0]];
  }
  return { seq, cursor: 0 };
}

// ------------------------------------------------------------- storage

export const STATS_KEY = "guess-stats";
export const CURSOR_KEY = "guess-cursor";
export const SETTINGS_KEY = "guess-settings";
export const SHELF_KEY = "guess-shelf";

function readJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // a browser with storage switched off still plays, it just forgets
  }
}

export function loadStats(): Stats {
  const s = readJson<Partial<Stats>>(STATS_KEY);
  if (!s) return EMPTY_STATS;
  return {
    played: Number(s.played) || 0,
    solved: Number(s.solved) || 0,
    failed: Number(s.failed) || 0,
    streak: Number(s.streak) || 0,
    hints: Number(s.hints) || 0,
    par: Number(s.par) || 0,
  };
}

export function saveStats(stats: Stats): void {
  writeJson(STATS_KEY, stats);
}

export function loadSettings(): Settings {
  const s = readJson<Partial<Settings>>(SETTINGS_KEY);
  return { easy: s?.easy === true };
}

export function saveSettings(settings: Settings): void {
  writeJson(SETTINGS_KEY, settings);
}

/** Only marks the pool still recognises survive a reload. */
export function loadShelf(ids: string[]): Shelf {
  const raw = readJson<Record<string, string>>(SHELF_KEY);
  const shelf: Shelf = {};
  if (!raw) return shelf;
  for (const id of ids) {
    const mark = raw[id];
    if (mark === "solved" || mark === "revealed") shelf[id] = mark;
  }
  return shelf;
}

export function saveShelf(shelf: Shelf): void {
  writeJson(SHELF_KEY, shelf);
}

/** A stored order is only trusted while it still matches the pool it came from. */
export function loadOrder(ids: string[]): Order {
  const o = readJson<Partial<Order>>(CURSOR_KEY);
  const known = new Set(ids);
  const seq = Array.isArray(o?.seq) ? o!.seq!.filter((id) => known.has(id)) : [];
  const cursor = Number(o?.cursor) || 0;
  if (seq.length !== ids.length || cursor < 0 || cursor >= seq.length) return initialOrder(ids);
  return { seq, cursor };
}

export function saveOrder(order: Order): void {
  writeJson(CURSOR_KEY, order);
}
