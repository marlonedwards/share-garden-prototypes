# Monkey Trade build handoff

The stage team owns src/components/monkey/* , src/lib/monkey/look.ts,
src/lib/monkey/sound.ts, src/content/monkey.ts. The page team owns
src/pages/Monkey.tsx, the route in src/main.tsx, the landing card, and the
/monkey entry in tools/cleancheck.mjs ROUTES. Neither touches
src/lib/monkey/round.ts without telling the orchestrator; src/lib/tape/ is
read only; src/components/trigger/Chart.tsx is used unmodified.

The stage team writes src/components/monkey/props.ts FIRST (within its first
few minutes), exporting these types, and tells the orchestrator when it is
in place. The page team imports from it and may stub components until the
real ones land. Field names below are the contract; add optional fields
freely, never rename or remove.

```ts
import type { Ticker } from "../../lib/tape/engine";

export interface Dart { monkey: number; at: number }   // wedge index on board levels, month offset (0-based run index) on level 1
export interface BoardProps {
  mode: "board" | "calendar";
  form: "open" | "rail";           // open = big picker at round open, rail = right edge during play
  tickers: Ticker[];               // wedge order; level 1 has exactly one
  names: string[];                 // display names, same order
  openPrices: number[];            // price at window open, same order
  months: number;                  // calendar mode: number of months in the window
  darts: Dart[];                   // every monkey's darts
  thrown: boolean;                 // false = darts not yet thrown; flipping to true plays the throw beat
  onDartLanded?: (i: number, of: number) => void;  // per dart, for sound
  onThrowDone?: () => void;
  chips: Record<Ticker, number>;   // player shares per ticker, drawn as a chip sized by shares
  dead: Ticker[];                  // tickers currently at zero
  focus: Ticker | null;
  onFocus: (t: Ticker) => void;
  width: number; height: number;
}
export type Pose = "idle" | "throw" | "cheer" | "slump" | "talk";
export interface StripSlot { who: "you" | number; worth: number; pose?: Pose }
export interface StripProps {
  slots: StripSlot[];              // already sorted best first (from round.ts rank().order)
  guideIndex: number;              // monkey index that talks (1)
  guideLine: string | null;        // current line or null; Strip shows it in the guide's slot and fades it ~4s
  settled: boolean;                // end card form: bigger, your slot lit
  mood: "cheer" | "slump" | null;  // end card: troop cheers or slumps
  playerInitial: string;           // "Y" by default
  ties: string[];                  // tie colour per monkey index 1..10 (index 0 unused ok)
  width: number; height?: number;
}
export interface GuideProps { line: string | null; onShown?: () => void }
```

Desk: reuse src/components/floor/Desk.tsx with its existing props (columns,
scale, height, focus, onFocus, settling, pour). Fork to
src/components/monkey/Desk.tsx only if the Duolingo look cannot be reached
by props; if forked, keep the prop names identical.

Sound (src/lib/monkey/sound.ts), copied from src/lib/tally/sound.ts and
retuned, exports exactly:
armAudio(), loadMuted(), setMuted(b), isMuted(), dartThock(step, of),
buyTick(step, of), sellThud(), passUp(), passDown(), settleRun(),
rankReveal(win: boolean), guidePop(). Mute key `monkey-muted`, default
unmuted. Nothing plays before armAudio() has run after a gesture; nothing
plays under prefers-reduced-motion.

Look (src/lib/monkey/look.ts) exports the palette and shape tokens from
spec section 9 as named constants (GROUND, GREEN, RED, GOLD, SKY, INK,
MUTED, RADIUS, BUTTON_EDGE, TIES[]).

Content (src/content/monkey.ts) exports GUIDE_LINES keyed by level and
moment: open, firstTrade, crash, endWin, endLose, per spec section 8.

Test hooks the walk needs, data attributes on the DOM:
- [data-monkey-phase] = "levels" | "open" | "play" | "end" on the page root
- [data-clock] = run index t (number) on the clock element; clock text "Month N of M"
- [data-worth], [data-cash] exact numbers on the header
- [data-beaten] on the live "you beat N of 10"
- each strip slot: [data-slot-who]="you"|"3", [data-slot-worth]=exact number, in DOM order = rank order
- the board root: [data-board-form]="open"|"rail", each dart [data-dart-monkey][data-dart-at], each wedge [data-wedge]=ticker
- chart wrapper: [data-chart] with [data-chart-labels]="months"|"years"
- desk per column: Floor's existing attributes
- guide line element: [data-guide-line] with a [data-guide-count] of lines spoken this round on the page root
- sound: window.__monkeySound = { played: Record<string, number> } incremented per sound name, only in dev/test (guard with import.meta.env.DEV or always; cheap)
- buttons carry data-action: start, buy1, buy5, buymax, sell1, sell5, sellall, again, next, levels, throw-1..3, mute
- end card root [data-end-card], era reveal [data-era-reveal]
- a test-only `?turbo=N` URL param multiplies the tape rate (siblings did the same); turbo=0 freezes the tape.
