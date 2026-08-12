// The overlays, all six of them, in one place. Every one of these renders
// content only: a centred panel that fits inside region B, over a scrim the
// shell owns, with the market and the table still visible and still correct
// underneath. That single rule is what makes The Tally feel like one screen
// instead of a slideshow.
//
//   ChapterCardOverlay     the chapter's opening card         spec 4.2
//   FrontPageOverlay       the paper beat, as headlines       loop doc
//   DebutOverlay           a card type, met once              loop doc
//   UnitUpgradeOverlay     the earned ceremony                spec 2
//   ChapterSummaryOverlay  what the chapter did, read back    spec 4.6
//   RunOverOverlay         the forensic report, or the win    spec 4.5
//   CollectorsBoxOverlay   the three shelves                  spec 5

export { default as ChapterCardOverlay } from "./ChapterCard";
export type { ChapterCardOverlayProps } from "./ChapterCard";

export { default as FrontPageOverlay } from "./FrontPage";
export type { FrontPageOverlayProps } from "./FrontPage";

export { default as DebutOverlay } from "./Debut";
export type { DebutOverlayProps } from "./Debut";

export { default as UnitUpgradeOverlay } from "./UnitUpgrade";
export type { UnitUpgradeOverlayProps } from "./UnitUpgrade";

export { default as ChapterSummaryOverlay } from "./ChapterSummary";
export type { ChapterSummaryOverlayProps } from "./ChapterSummary";

export { default as RunOverOverlay } from "./RunOver";
export type { RunOverOverlayProps } from "./RunOver";

export { default as CollectorsBoxOverlay } from "./CollectorsBox";
export type { CollectorsBoxOverlayProps } from "./CollectorsBox";
