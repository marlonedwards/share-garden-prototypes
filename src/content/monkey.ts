// The guide's lines, verbatim from docs/monkey-spec.md section 8, kept here so
// they can be rewritten without touching a component.
//
// One monkey talks. It speaks at most four times a level, one line each, never
// a caption, never a tooltip, never "this is a stock". Each level adds exactly
// one idea and the rank is the proof.
//
// Sentence case, plain words, no exclamation marks, no em dashes, per
// docs/clean-type.md. The crash moment exists on level 2 only, which is why it
// is optional here rather than an empty string on the other two: a line the
// guide never speaks should not be a line at all.

import type { LevelId } from "../lib/monkey/round";

export type GuideMoment = "open" | "firstTrade" | "crash" | "endWin" | "endLose";

export interface GuideLevelLines {
  open: string;
  firstTrade: string;
  crash?: string;
  endWin: string;
  endLose: string;
}

export const GUIDE_LINES: Record<LevelId, GuideLevelLines> = {
  1: {
    open: "One stock for all of us. We each picked a random month to buy it and we will sit there.",
    firstTrade: "Bold. We are just waiting for our month.",
    endWin: "You beat most of us by trading. That almost never happens. Try it again and see.",
    endLose: "Most of us beat you, and all we did was pick a month and sit.",
  },
  2: {
    open: "Three wedges this time. We each threw twice.",
    firstTrade: "Moving already. Most of us never will.",
    crash: "Everything is falling. We are not going anywhere.",
    endWin: "You stayed in through the worst of it and came out ahead of most of us.",
    endLose: "Selling in a crash locks the loss in. We just waited.",
  },
  3: {
    open: "Ten wedges. We each threw three darts and spread out.",
    firstTrade: "Picking favorites. We did not bother.",
    endWin: "You spread out and it worked. Or you got lucky. Play it again.",
    endLose: "A few random darts beat your picks. Spreading out is the trick.",
  },
};

// The line for a moment, or null when this level does not have one. The page
// counts a line only when it speaks, so a null here never burns one of the
// guide's four turns.
export function guideLine(level: LevelId, moment: GuideMoment): string | null {
  return GUIDE_LINES[level][moment] ?? null;
}

// The end card's line follows the rank outcome, which is what acceptance test K
// checks: five or more beaten is the win line, fewer is the lose line.
export function endGuideLine(level: LevelId, beaten: number, unlockAt = 5): string {
  return beaten >= unlockAt ? GUIDE_LINES[level].endWin : GUIDE_LINES[level].endLose;
}
