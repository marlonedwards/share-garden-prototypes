// The level selector. Eight tiles in ladder order, and picking an unlocked one
// starts a new run there.
//
// A locked chapter is a silhouette: the number is on it and nothing else is,
// because the shape of what you have not reached yet is the pull, and the name
// of a chapter you have not earned is part of the prize. Chapter one is always
// open and every chapter cleared for good opens the one it is, which is the
// same rule the run report already offers its start points under.
//
// The best figure is the era shelf's figure and it only exists for the era
// chapters, because BoxState.eraBest is keyed by era and an authored chapter
// has no era to be keyed by. Those tiles say cleared instead, which is the
// whole of what the box knows about them.
//
// As of the game UI pass a tile is a chunky card rather than a bordered
// paragraph: a framed panel with the chapter's number in its own chip, its
// state in another, and one button. Asking to abandon a run replaces the lower
// half of the tile rather than squeezing under it, and its two answers are full
// width and never break a label across two lines.

import { useState } from "react";
import { BoxState, startPoints } from "../../lib/tally/run";
import { CHAPTERS, chapterSubtitle } from "../../lib/tally/chapters";
import {
  FILL_DEEP, FILL_PLAQUE, GOLD, INK, LINE, LINE_HARD, R, SANS, SUB,
  btn, ensureTallyUI, panel, plaque,
} from "./ui";

const LOCKED = "#A9A69D";

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export interface ChapterSelectProps {
  ui: number;
  box: BoxState;
  // whether a run is going that starting a chapter would end
  liveRun: boolean;
  onPick: (chapter: number) => void;
  onBack: () => void;
}

export default function ChapterSelect(p: ChapterSelectProps) {
  const [confirm, setConfirm] = useState<number | null>(null);
  ensureTallyUI();
  const type = (n: number) => Math.round(n * p.ui * 2) / 2;
  const s = (n: number) => Math.round(n * p.ui);
  const open = startPoints(p.box);

  const pick = (id: number) => {
    if (p.liveRun) {
      setConfirm(id);
      return;
    }
    p.onPick(id);
  };

  return (
    <div
      data-screen="chapters"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: s(9),
        fontFamily: SANS,
        color: INK,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          ...panel({ fill: FILL_PLAQUE, radius: R.panel }),
          display: "flex",
          alignItems: "center",
          gap: s(10),
          flex: "none",
          padding: `${s(8)}px ${s(10)}px`,
        }}
      >
        <div style={{ fontSize: type(21), fontWeight: 820, letterSpacing: "-0.025em" }}>Chapters</div>
        <div style={{ fontSize: type(13), color: SUB, fontWeight: 600 }}>
          A chapter opens when you clear the one before it.
        </div>
        <button
          type="button"
          data-chapters-back="1"
          onClick={p.onBack}
          className={btn("plain")}
          style={{ marginLeft: "auto", fontSize: type(13), padding: `${s(6)}px ${s(15)}px` }}
        >
          Back
        </button>
      </div>

      <div
        className="tally-scroll"
        style={{
          ...panel({ fill: FILL_DEEP, radius: R.panel, inset: true }),
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          display: "grid",
          // four across on a board wide enough for four, two on the natural
          // board, and never a ragged row of five that reads as two shelves
          gridTemplateColumns: "repeat(auto-fill, minmax(max(210px, 23%), 1fr))",
          gap: s(9),
          alignContent: "center",
          gridAutoRows: `minmax(${s(112)}px, ${s(178)}px)`,
          padding: s(10),
        }}
      >
        {CHAPTERS.map((ch) => {
          const unlocked = open.includes(ch.id);
          const cleared = p.box.clearedChapters.includes(ch.id);
          const best = ch.source.kind === "era" ? p.box.eraBest[ch.source.eraId] ?? null : null;
          const asking = confirm === ch.id;
          const state = best !== null ? `best ${money(best)}` : cleared ? "cleared" : "open";
          return (
            <div
              key={ch.id}
              data-chapter-tile={ch.id}
              data-locked={unlocked ? "0" : "1"}
              className={`tally-tile${unlocked && !asking ? " tally-tile--live" : ""}`}
              style={{
                ...panel({ fill: unlocked ? FILL_PLAQUE : "#E3E0D8", radius: R.panel, hard: true }),
                borderColor: unlocked ? (asking ? "rgba(0,113,227,0.55)" : LINE_HARD) : "rgba(46,38,24,0.16)",
                borderStyle: unlocked ? "solid" : "dashed",
                boxShadow: unlocked
                  ? "inset 0 1.5px 0 rgba(255,255,255,0.85), 0 3px 0 rgba(46,38,24,0.10), 0 3px 8px rgba(46,38,24,0.07)"
                  : "inset 0 2px 4px rgba(46,38,24,0.09)",
                padding: `${s(10)}px ${s(11)}px ${s(11)}px`,
                display: "flex",
                flexDirection: "column",
                gap: s(5),
                minHeight: s(112),
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: s(6) }}>
                <span
                  style={{
                    ...plaque(6),
                    padding: `${s(2)}px ${s(7)}px`,
                    fontSize: type(11.5),
                    fontWeight: 750,
                    color: unlocked ? SUB : LOCKED,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  Chapter {ch.id}
                </span>
                {unlocked && (
                  <span
                    style={{
                      marginLeft: "auto",
                      padding: `${s(2)}px ${s(7)}px`,
                      borderRadius: 6,
                      border: `1.5px solid ${best !== null || cleared ? "rgba(181,122,0,0.42)" : LINE}`,
                      background: best !== null || cleared ? "rgba(181,122,0,0.09)" : "transparent",
                      fontSize: type(11.5),
                      fontWeight: 750,
                      color: best !== null ? INK : cleared ? GOLD : SUB,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {state}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: type(16),
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: unlocked ? INK : LOCKED,
                }}
              >
                {unlocked ? ch.name : "• • •"}
              </div>

              {/* The question replaces the tile's lower half rather than
                  crowding in under it, and its two answers are one line each. */}
              {asking ? (
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: s(6) }}>
                  <div style={{ fontSize: type(12.5), color: SUB, lineHeight: 1.4, fontWeight: 600 }}>
                    Starting here ends the run you have going.
                  </div>
                  <button
                    type="button"
                    data-chapter-confirm={ch.id}
                    onClick={() => p.onPick(ch.id)}
                    className={btn("primary")}
                    style={{
                      width: "100%",
                      fontSize: type(12.5),
                      padding: `${s(7)}px ${s(8)}px`,
                      borderRadius: R.chip,
                    }}
                  >
                    Start chapter {ch.id}
                  </button>
                  <button
                    type="button"
                    data-chapter-cancel={ch.id}
                    onClick={() => setConfirm(null)}
                    className={btn("plain")}
                    style={{
                      width: "100%",
                      fontSize: type(12.5),
                      padding: `${s(7)}px ${s(8)}px`,
                      borderRadius: R.chip,
                    }}
                  >
                    Keep the run
                  </button>
                </div>
              ) : (
                <>
                  {/* an era tile names its years; an authored one carries no
                      note at all, because a made up number is disclosed on the
                      card that prints it and not on the chapter that holds it */}
                  {(!unlocked || chapterSubtitle(ch)) && (
                    <div style={{ fontSize: type(12.5), color: unlocked ? SUB : LOCKED, lineHeight: 1.35 }}>
                      {unlocked ? chapterSubtitle(ch) : "locked"}
                    </div>
                  )}
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", paddingTop: s(6) }}>
                    {unlocked && (
                      <button
                        type="button"
                        data-chapter-start={ch.id}
                        onClick={() => pick(ch.id)}
                        className={btn("primary")}
                        style={{
                          marginLeft: "auto",
                          fontSize: type(12.5),
                          padding: `${s(6)}px ${s(15)}px`,
                          borderRadius: R.chip,
                        }}
                      >
                        Start
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
