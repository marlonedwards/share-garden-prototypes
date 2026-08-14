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
//   guess-settings  which mode the player is in, easy until they change it
//   guess-shelf     which puzzles are solved, which were revealed, and how
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
  /** five catalog tickers that easy mode offers alongside the answer */
  decoys?: string[];
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

/**
 * The pips on the scoreline, and the whole budget a puzzle has to spend. In
 * hard mode only hints draw on it, so it is the ladder and nothing else. In
 * easy mode a wrong pick costs the same as a hint, out of the same four, and
 * running the budget out on a wrong pick ends the puzzle.
 */
export const PIP_BUDGET = HINT_LADDER.length;

export interface PuzzleState {
  puzzleId: string;
  /** how many hints have been dealt, 0 to 4 */
  hints: number;
  /** wrong guesses, as typed, in the order they were made */
  guesses: string[];
  /** tickers of the options picked wrong in easy mode, in the order picked */
  picks: string[];
  status: "playing" | "solved" | "failed";
}

export function newPuzzle(puzzleId: string): PuzzleState {
  return { puzzleId, hints: 0, guesses: [], picks: [], status: "playing" };
}

/** The hints dealt so far, in ladder order. Never repeats and never reorders. */
export function dealtHints(state: PuzzleState): HintKey[] {
  return HINT_LADDER.slice(0, state.hints) as HintKey[];
}

export function hasHint(state: PuzzleState, key: HintKey): boolean {
  return HINT_LADDER.indexOf(key) < state.hints;
}

/** Pips filled in on the scoreline: every hint dealt and every option missed. */
export function pipsSpent(state: PuzzleState): number {
  return Math.min(PIP_BUDGET, state.hints + state.picks.length);
}

export function pipsLeft(state: PuzzleState): number {
  return PIP_BUDGET - pipsSpent(state);
}

export function canDealHint(state: PuzzleState): boolean {
  return state.status === "playing" && state.hints < HINT_LADDER.length && pipsLeft(state) > 0;
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

// ------------------------------------------------------------- the options

/**
 * Easy mode's six buttons: the answer and the puzzle's five curated decoys, in
 * an order that is fixed for the puzzle and the same on every machine, so a
 * player comparing notes and a screenshot taken a month apart both agree.
 */

/** FNV-1a over the puzzle id, so the shuffle below is the puzzle's own. */
export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small deterministic generator, the same one the deal-order tests pin. */
export function seededRandom(seed: number): Random {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function byTicker(ticker: string, catalog: Company[]): Company | null {
  return catalog.find((c) => c.ticker === ticker) ?? null;
}

/** The answer as the catalog writes it, falling back to the puzzle itself. */
function answerCompany(puzzle: Puzzle, catalog: Company[]): Company {
  return (
    byTicker(puzzle.ticker, catalog) ?? {
      name: puzzle.name,
      ticker: puzzle.ticker,
      sector: puzzle.sector,
      aliases: puzzle.aliases,
    }
  );
}

/** The six options, shuffled by the puzzle's own seed. Buttons show the name. */
export function puzzleOptions(puzzle: Puzzle, catalog: Company[] = COMPANIES): Company[] {
  const options = [answerCompany(puzzle, catalog)];
  for (const ticker of puzzle.decoys ?? []) {
    const c = byTicker(ticker, catalog);
    if (c && c.ticker !== puzzle.ticker && !options.some((o) => o.ticker === c.ticker)) options.push(c);
  }
  return shuffle(options, seededRandom(seedFromId(puzzle.id)));
}

/** Why an option is no longer pickable, or null while it still is. */
export type OptionOut = "picked" | "sector" | null;

export interface OptionView {
  company: Company;
  out: OptionOut;
}

/**
 * What each button is doing. A pick that missed stays on screen greyed out, and
 * once the sector hint is paid for, everything in the wrong trade goes with it,
 * which is what that hint buys in easy mode.
 */
export function optionViews(
  state: PuzzleState,
  puzzle: Puzzle,
  catalog: Company[] = COMPANIES,
): OptionView[] {
  const ruled = hasHint(state, "sector");
  return puzzleOptions(puzzle, catalog).map((company) => {
    let out: OptionOut = null;
    if (state.picks.includes(company.ticker)) out = "picked";
    else if (ruled && company.sector !== puzzle.sector) out = "sector";
    return { company, out };
  });
}

export function canPick(state: PuzzleState, puzzle: Puzzle, ticker: string, catalog: Company[] = COMPANIES): boolean {
  if (state.status !== "playing") return false;
  const view = optionViews(state, puzzle, catalog).find((o) => o.company.ticker === ticker);
  return view !== undefined && view.out === null;
}

/**
 * Picking an option. The right one solves it. A wrong one greys out and costs a
 * pip, and a wrong one made with no pips left ends the puzzle the same way
 * reveal answer does, because there was nothing left to spend.
 */
export function submitPick(
  state: PuzzleState,
  puzzle: Puzzle,
  ticker: string,
  catalog: Company[] = COMPANIES,
): GuessResult {
  if (!canPick(state, puzzle, ticker, catalog)) return { state, correct: false, ignored: true };
  if (ticker === puzzle.ticker) {
    return { state: { ...state, status: "solved" }, correct: true, ignored: false };
  }
  const spent = pipsLeft(state) === 0;
  return {
    state: { ...state, picks: [...state.picks, ticker], status: spent ? "failed" : "playing" },
    correct: false,
    ignored: false,
  };
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

// ------------------------------------------------------------- the two modes

/**
 * Easy deals six names and asks which one. Hard hands over an empty box and the
 * whole market. Easy is where everybody starts, because a player who cannot
 * name a single chart still gets to be right some of the time.
 */
export type Mode = "easy" | "hard";

export interface Settings {
  mode: Mode;
}

export const DEFAULT_SETTINGS: Settings = { mode: "easy" };

export type SectorVerdict = "same" | "different" | null;

/**
 * Does the company just guessed work in the same trade as the answer. Hard mode
 * tags every wrong guess with it. Unknown names get nothing rather than a guess.
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

/**
 * The reveal's result line. Under par is the brag; a fail is simply revealed.
 * Par counts pips, so in easy mode a name picked wrong reads as a hint spent,
 * which is exactly what it cost.
 */
export function resultLine(state: PuzzleState, puzzle: Puzzle): string {
  if (state.status !== "solved") return "revealed";
  const spent = pipsSpent(state);
  const opened = spent === 0 ? "solved with no hints" : `solved with ${hintWords(spent)}`;
  const diff = puzzle.par - spent;
  if (diff === 0) return `${opened}, at par`;
  const word = COUNT_WORDS[Math.min(Math.abs(diff), 5)];
  return `${opened}, ${word} ${diff > 0 ? "under" : "over"} par`;
}

// ------------------------------------------------------------- the shelf

export type ShelfMark = "solved" | "revealed";

/**
 * One card's worth of memory. The mark is all a card has ever needed; the rest
 * is how it went, and a card shelved before the game kept that record simply
 * has none, so the detail line goes quiet rather than making anything up.
 */
export interface ShelfEntry {
  mark: ShelfMark;
  mode?: Mode;
  /** wrong guesses in hard, wrong picks in easy */
  guesses?: number;
  hints?: number;
}

/** What the collection knows: one entry per puzzle a player has finished. */
export type Shelf = Record<string, ShelfEntry>;

export const EMPTY_SHELF: Shelf = {};

/** The entry a finished puzzle earns, in whichever mode it was played. */
export function shelfEntry(state: PuzzleState, mode: Mode): ShelfEntry {
  return {
    mark: state.status === "solved" ? "solved" : "revealed",
    mode,
    guesses: mode === "easy" ? state.picks.length : state.guesses.length,
    hints: state.hints,
  };
}

/**
 * Marking a puzzle. A solve is the better mark and outranks a reveal, so a
 * puzzle solved on a later pass stops reading as revealed, and nothing a
 * player has already earned is ever taken away.
 */
export function markShelf(shelf: Shelf, id: string, entry: ShelfEntry): Shelf {
  if (shelf[id]?.mark === "solved") return shelf;
  return { ...shelf, [id]: entry };
}

export function shelfMark(shelf: Shelf, id: string): ShelfMark | null {
  return shelf[id]?.mark ?? null;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The quiet second line on a played card: which mode, what it cost, how it
 * ended. A card from before the game recorded any of that gets nothing.
 */
export function shelfDetail(entry: ShelfEntry | null): string {
  if (!entry || !entry.mode) return "";
  const parts = [`${entry.mark} in ${entry.mode}`];
  const wrong = entry.guesses ?? 0;
  if (wrong > 0) {
    parts.push(
      entry.mode === "easy"
        ? plural(wrong, "wrong pick", "wrong picks")
        : plural(wrong, "wrong guess", "wrong guesses"),
    );
  }
  const hints = entry.hints ?? 0;
  if (hints > 0) parts.push(plural(hints, "hint", "hints"));
  return parts.join(", ");
}

export function shelfCounts(shelf: Shelf, ids: string[]): { solved: number; revealed: number; locked: number } {
  let solved = 0;
  let revealed = 0;
  for (const id of ids) {
    const mark = shelf[id]?.mark;
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

/**
 * The stored settings, whatever shape they are in. The key used to hold an
 * easy-mode flag that was off by default; nobody's browser should crash over
 * that, and nobody should be dropped into hard mode by it either, so anything
 * that is not the word hard reads as easy.
 */
export function readSettings(raw: unknown): Settings {
  const mode = (raw as { mode?: unknown } | null)?.mode;
  return { mode: mode === "hard" ? "hard" : "easy" };
}

export function loadSettings(): Settings {
  return readSettings(readJson<unknown>(SETTINGS_KEY));
}

export function saveSettings(settings: Settings): void {
  writeJson(SETTINGS_KEY, settings);
}

/**
 * The shelf as it was left, in either shape it has ever been written in: the
 * bare "solved" strings of the first collection, and the entries the game
 * writes now. Only puzzles the pool still recognises come back.
 */
export function readShelf(raw: unknown, ids: string[]): Shelf {
  const stored = (raw ?? {}) as Record<string, unknown>;
  const shelf: Shelf = {};
  for (const id of ids) {
    const held = stored[id];
    if (held === "solved" || held === "revealed") {
      shelf[id] = { mark: held };
      continue;
    }
    if (!held || typeof held !== "object") continue;
    const e = held as Partial<ShelfEntry>;
    if (e.mark !== "solved" && e.mark !== "revealed") continue;
    const entry: ShelfEntry = { mark: e.mark };
    if (e.mode === "easy" || e.mode === "hard") entry.mode = e.mode;
    if (Number.isFinite(e.guesses)) entry.guesses = Number(e.guesses);
    if (Number.isFinite(e.hints)) entry.hints = Number(e.hints);
    shelf[id] = entry;
  }
  return shelf;
}

export function loadShelf(ids: string[]): Shelf {
  return readShelf(readJson<unknown>(SHELF_KEY), ids);
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
