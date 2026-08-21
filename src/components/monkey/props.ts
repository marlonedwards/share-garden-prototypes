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

export interface GuideProps {
  line: string | null;
  onShown?: () => void;
  /** optional: fired when the bubble has faded out */
  onDone?: () => void;
  /** optional: max width of the bubble in px */
  width?: number;
}
