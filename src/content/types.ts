// Shared shapes for era content modules. Each era lives in its own file
// (era-dotcom.ts, era-payday.ts, era-gfc.ts, era-crypto.ts) so parallel
// writers never touch the same file; src/lib/scenarios.ts assembles them.
import { MarketEvent } from "../engine/market";
import { EraAsset, HistoryDataset } from "../engine/history";

// A gate pauses the tape at a real historical moment: a page of context the
// player could have known at the time, a choice they must commit to, and
// references they can follow out. The debrief quotes their choice back.
// Style contract: each gate's first context sentence states the concept at
// play, definition first, then the story elaborates it.
// Standards: tag every gate in the era modules with its CEE grade-8
// benchmark (or the 9-12 ladder where noted) in a code comment, in the same
// format as src/lib/checkpoints.ts, e.g.
// "CEE Investing 12-5b ladder (expectations are already in the price)".
export interface Gate {
  atStep: number;
  title: string;
  question: string;
  context: string[];
  // act: choosing this option pauses the tape so the player can actually make
  // the move they just committed to, instead of watching it resume without them
  options: { label: string; act?: boolean }[];
  refs?: { label: string; url: string }[];
}

// One section of an era briefing page. The lead is the bold, complete,
// textbook-clean definition sentence; the body elaborates it in story.
export interface BriefingSection {
  heading: string;
  lead: string;
  body: string[];
}

// The optional pre-play read at /orb/brief/:id. It is linked from the
// scenario card and from gate references, and it is never forced before play.
// Standards tagging lives in a code comment above each era's briefing object
// (checkpoints.ts format), not in a player-facing field.
export interface EraBriefingContent {
  title: string;
  deck: string;              // one-sentence standfirst under the title
  readTime: string;          // "about 2 minutes"
  sections: BriefingSection[];
  timeline: { date: string; text: string }[];
  sources: { label: string; url: string }[];
}

export interface ScenarioConfig {
  id: string;
  lesson: string;
  title: string;
  headerSub: string;
  cardLine: string;
  learn: string;
  dots: string[];
  time: string;
  dataset: HistoryDataset;
  indexKey: string;
  indexSub: string;          // rainbow orb card subtitle
  assets: EraAsset[];
  moments: MarketEvent[];
  gates: Gate[];
  startCash: number;
  income?: number;
  fractionalDefault: boolean;
  lastStep?: number;
  briefTitle: string;
  briefBody: string[];
  startLabel: string;
  endTitle: string;
  bullets: { c: string; text: string }[];
  cardSubline: string;
  briefing?: EraBriefingContent;
}

// Moment helper: a labeled banner at a real month, no price effect (the tape
// is real history; moments only narrate it).
export const mom = (atStep: number, days: number, label: string, blurb: string): MarketEvent =>
  ({ atStep, days, drift: 0, vol: 0, scope: "market", label, blurb });

// True when every cast member carries full scouting notes, so the brief beat
// can deal the scouting cards. Eras still waiting on their scouting pass fall
// back to the plain start button.
export function hasScouting(assets: EraAsset[]): boolean {
  return assets.length > 0 && assets.every(
    (a) => a.founded !== undefined && !!a.history && !!a.believers && !!a.doubters,
  );
}
