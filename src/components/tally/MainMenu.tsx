// The main menu. It is the first thing the page shows and the place a run is
// left from, so it is the one screen in the game that owns no game state: it
// only ever offers to start something or to open something.
//
// Continue is here exactly when a saved run exists, and nothing about opening
// this page creates one. A run is written to storage when a player starts or
// continues it, which is what makes the difference between "I have a run going"
// and "I looked at the title screen once" honest.
//
// As of the game UI pass this is a title screen rather than a list of links:
// the title stands in its own framed plaque with a small wall of the game's own
// blocks growing beside it, and the entries sit in a panel underneath in the
// one button language the rest of the game uses. The wall is the only motif
// allowed here, because the wall is what the game is about, and it is drawn out
// of the same block primitive the board draws, never out of a picture of one.

import { Link } from "react-router-dom";
import { Block } from "./Blocks";
import Piggy from "./Piggy";
import {
  FILL_PANEL, FILL_PLAQUE, INK, R, SANS, SUB, btn, ensureTallyUI, panel, plaque,
} from "./ui";

export interface MainMenuProps {
  ui: number;
  // whether a saved run truly exists, and the one line that says where it is
  hasSave: boolean;
  savedLine: string | null;
  muted: boolean;
  onContinue: () => void;
  onNewRun: () => void;
  onChapters: () => void;
  onCollection: () => void;
  onTutorial: () => void;
  onToggleSound: () => void;
}

// The motif: four columns of the game's own blocks, in the four ring colours,
// standing at four heights. It is a wall, which is the thing the whole game
// builds, and it is not decoration invented for the menu.
const MOTIF: { color: string; blocks: number }[] = [
  { color: "#2E9E63", blocks: 2 },
  { color: "#2A72D6", blocks: 4 },
  { color: "#D98A00", blocks: 3 },
  { color: "#7A6CD9", blocks: 5 },
];

function Motif({ size }: { size: number }) {
  const gap = Math.max(1, Math.round(size * 0.16));
  return (
    <span aria-hidden style={{ display: "flex", alignItems: "flex-end", gap }}>
      {MOTIF.map((col, i) => (
        <span key={i} style={{ display: "flex", flexDirection: "column-reverse", gap }}>
          {Array.from({ length: col.blocks }, (_, k) => (
            <Block key={k} size={size} color={col.color} />
          ))}
        </span>
      ))}
    </span>
  );
}

export default function MainMenu(p: MainMenuProps) {
  ensureTallyUI();
  const type = (n: number) => Math.round(n * p.ui * 2) / 2;
  const s = (n: number) => Math.round(n * p.ui);

  const entry: React.CSSProperties = {
    width: "100%",
    fontSize: type(16),
    padding: `${s(13)}px ${s(18)}px`,
    borderRadius: R.panel,
  };

  const linkish: React.CSSProperties = {
    ...entry,
    display: "block",
    textAlign: "center",
    textDecoration: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      data-screen="menu"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: s(13),
        fontFamily: SANS,
        color: INK,
      }}
    >
      <div
        style={{
          ...panel({ fill: FILL_PLAQUE, radius: R.board }),
          width: `min(${s(620)}px, 100%)`,
          padding: `${s(20)}px ${s(26)}px ${s(22)}px`,
          textAlign: "center",
        }}
      >
        {/* The piggy idles here and nowhere else outside its own tutorial: the
            menu is where the game says hello, and chapter 1 is where it
            explains itself. */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: s(14) }}>
          <Piggy pose="idle" size={s(72)} title="A pixel piggy bank" />
          <div style={{ fontSize: type(56), fontWeight: 850, letterSpacing: "-0.035em", lineHeight: 1 }}>
            The Tally
          </div>
          <Motif size={s(13)} />
        </div>
        <div style={{ fontSize: type(14), color: SUB, marginTop: s(11), lineHeight: 1.45, fontWeight: 550 }}>
          A run is eight chapters, and every chapter asks you to finish above a line.
        </div>
      </div>

      <div
        style={{
          ...panel({ fill: FILL_PANEL, radius: R.board }),
          width: `min(${s(620)}px, 100%)`,
          padding: s(13),
          display: "flex",
          flexDirection: "column",
          gap: s(8),
          boxSizing: "border-box",
        }}
      >
        {p.hasSave && (
          <button type="button" data-menu="continue" onClick={p.onContinue} className={btn("primary")} style={entry}>
            Continue run{p.savedLine ? ` · ${p.savedLine}` : ""}
          </button>
        )}
        <button
          type="button"
          data-menu="new"
          onClick={p.onNewRun}
          className={btn(p.hasSave ? "plain" : "primary")}
          style={entry}
        >
          New run
        </button>
        <button type="button" data-menu="chapters" onClick={p.onChapters} className={btn("plain")} style={entry}>
          Chapters
        </button>
        <div style={{ display: "flex", gap: s(8) }}>
          <button type="button" data-menu="collection" onClick={p.onCollection} className={btn("plain")} style={entry}>
            Collection
          </button>
          <Link to="/orb/guide" data-menu="guide" className={btn("plain")} style={linkish}>
            Field guide
          </Link>
          <button type="button" data-menu="tutorial" onClick={p.onTutorial} className={btn("plain")} style={entry}>
            Tutorial
          </button>
        </div>
      </div>

      <div
        style={{
          ...plaque(R.panel),
          display: "flex",
          alignItems: "center",
          gap: s(6),
          padding: s(4),
        }}
      >
        <button
          type="button"
          data-menu="sound"
          data-mute={p.muted ? "on" : "off"}
          aria-pressed={!p.muted}
          onClick={p.onToggleSound}
          className={btn("ghost")}
          style={{ fontSize: type(12), padding: `${s(5)}px ${s(11)}px`, borderRadius: R.chip }}
        >
          {p.muted ? "Sound off" : "Sound on"}
        </button>
        <Link
          to="/"
          className={btn("ghost")}
          style={{ fontSize: type(12), padding: `${s(5)}px ${s(11)}px`, borderRadius: R.chip, textDecoration: "none" }}
        >
          back
        </Link>
      </div>
    </div>
  );
}
