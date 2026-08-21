import type { Ticker } from "../../lib/tape/engine";

/** One monkey's dart. `at` is a wedge index on board levels, a month offset
 *  (0-based run index) on level 1's calendar. */
export interface Dart {
  monkey: number;
  at: number;
}

export interface BoardProps {
  mode: "board" | "calendar";
  /** open = big picker at round open, rail = right edge during play */
  form: "open" | "rail";
  /** wedge order; level 1 has exactly one */
  tickers: Ticker[];
  /** display names, same order */
  names: string[];
  /** price at window open, same order */
  openPrices: number[];
  /** calendar mode: number of months in the window */
  months: number;
  /** every monkey's darts */
  darts: Dart[];
  /** false = darts not yet thrown; flipping to true plays the throw beat */
  thrown: boolean;
  /** per dart, for sound */
  onDartLanded?: (i: number, of: number) => void;
  onThrowDone?: () => void;
  /** player shares per ticker, drawn as a chip sized by shares */
  chips: Record<Ticker, number>;
  /** tickers currently at zero */
  dead: Ticker[];
  focus: Ticker | null;
  onFocus: (t: Ticker) => void;
  width: number;
  height: number;
  /** optional: skip the landing animation and draw darts already pinned */
  instant?: boolean;
}

export type Pose = "idle" | "throw" | "cheer" | "slump" | "talk";

export interface StripSlot {
  who: "you" | number;
  worth: number;
  pose?: Pose;
}

export interface StripProps {
  /** already sorted best first (from round.ts rank().order) */
  slots: StripSlot[];
  /** monkey index that talks (1) */
  guideIndex: number;
  /** current line or null; Strip shows it in the guide's slot and fades it ~4s */
  guideLine: string | null;
  /** end card form: bigger, your slot lit */
  settled: boolean;
  /** end card: troop cheers or slumps */
  mood: "cheer" | "slump" | null;
  playerInitial: string;
  /** tie colour per monkey index 1..10 (index 0 unused ok) */
  ties: string[];
  width: number;
  height?: number;
  /** optional: fired when the guide bubble has finished its fade */
  onGuideDone?: () => void;
}

/** Where the bubble's tail leaves it: which edge, and how far along that edge
 *  measured from the named side. The default is the tail the guide's slot on
 *  the rank strip wants, pointing down at the monkey under it. */
export interface GuideTail {
  edge: "top" | "bottom";
  from: "left" | "right";
  at: number;
}

export interface GuideProps {
  line: string | null;
  onShown?: () => void;
  /** optional: fired when the bubble has faded out */
  onDone?: () => void;
  /** optional: max width of the bubble in px */
  width?: number;
  /** optional: skip the hold/fade timers and keep the line shown until it
   *  changes (the end card's line, which stays up for good, section 7) */
  persist?: boolean;
  /** optional: where the tail points, for a bubble that hangs under its monkey
   *  rather than over it, or that sits at the right edge of the strip */
  tail?: GuideTail;
}

/** The open screen's troop: the ten monkeys standing over the board, throwing
 *  as their darts fly, with the guide's bubble hanging off the guide monkey. */
export interface TroopProps {
  /** every monkey's darts, in throw order: the same list the board is given, so
   *  a monkey throws on the beat its dart lands on */
  darts: Dart[];
  /** false = the troop is still holding its darts; flipping to true throws */
  thrown: boolean;
  /** how many monkeys are in the troop */
  count: number;
  /** the monkey that talks */
  guideIndex: number;
  /** the guide's current line, or null */
  guideLine: string | null;
  onGuideDone?: () => void;
  /** tie colour per monkey index 1..10 (index 0 unused ok) */
  ties: string[];
  width: number;
  /** optional: the band's height, 96 by default */
  height?: number;
  /** optional: skip the throw beat and stand the troop up already thrown */
  instant?: boolean;
}
