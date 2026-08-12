// The game's chrome, in one place.
//
// Sprint B's mandate is that the board stops being whitespace with text in it
// and starts being a physical thing: every region of the game is a panel with a
// frame, a fill a step deeper than whatever it sits on, a soft highlight along
// its top edge, and a radius from one small set. The palette does not move a
// shade: the page is still warm paper, the ink is still near black, the target
// is still gold and the one accent is still blue. Nothing here is dark, and
// nothing here is a pixel typeface: the pixel language belongs to the blocks.
//
// Buttons are the other half. There is one button in this game and it is drawn
// once, as a class rather than as a style object, because hover and press and
// disabled are states a stylesheet knows how to hold and a React component only
// ever has to re-implement. A button is a chunky thing with a lip under it: it
// sits up by two pixels, it lifts on hover, and it drops onto its lip when it is
// pressed. Every button in the game wears one of five faces and nothing else.

import type { CSSProperties } from "react";

export const SANS = '"Helvetica Neue", Inter, -apple-system, system-ui, sans-serif';

export const INK = "#1D1D1F";
export const SUB = "#6E6E73";
export const ACCENT = "#0071E3";
export const PAGE = "#FAF9F7";
export const GOLD = "#B57A00";
export const GAIN = "#1A8A52";
export const LOSS = "#C0392B";

// The frames. Two weights only: a hairline-plus at 1.5px for panels inside
// panels, and 2px for the pieces of furniture the eye should find first.
export const LINE = "rgba(46,38,24,0.17)";
export const LINE_HARD = "rgba(46,38,24,0.30)";

// The fills, each a step deeper than the one above it, all of them warm.
export const FILL_PANEL = "#F2F0EA";
export const FILL_DEEP = "#E9E5DC";
export const FILL_PLAQUE = "#FFFEFB";
// the stage the record is built on, and the rail beside it, one step deeper
export const STAGE_TOP = "#E9E8E3";
export const STAGE_BOTTOM = "#DDDBD4";
export const RAIL_FILL = "#D9D6CD";

// The radii, and there are three of them.
export const R = { chip: 8, panel: 11, board: 14 };

// The soft light along a panel's top edge, which is what makes a fill read as a
// surface rather than as a rectangle of colour.
export const TOP_LIGHT = "inset 0 1.5px 0 rgba(255,255,255,0.80)";
export const TOP_LIGHT_SOFT = "inset 0 1px 0 rgba(255,255,255,0.55)";

// A panel: a fill, a frame, a radius, and the highlight. Everything that is a
// region of the board goes through here so no two regions can drift apart.
export function panel(opts: {
  fill?: string;
  radius?: number;
  hard?: boolean;
  inset?: boolean;
} = {}): CSSProperties {
  const { fill = FILL_PANEL, radius = R.panel, hard = false, inset = false } = opts;
  return {
    background: fill,
    // two pixels, always: a browser rounds a one and a half pixel border down to
    // one on an ordinary screen, and a one pixel frame is the minimal chrome
    // this pass exists to leave behind. The weight is constant and the colour is
    // what says how loud a frame is.
    border: `2px solid ${hard ? LINE_HARD : LINE}`,
    borderRadius: radius,
    boxShadow: inset
      ? `inset 0 2px 4px rgba(46,38,24,0.10), inset 0 -1px 0 rgba(255,255,255,0.7)`
      : `${TOP_LIGHT}, 0 1px 2px rgba(46,38,24,0.05)`,
    boxSizing: "border-box",
  };
}

// A plaque: the sunk white box a number is set in, so a figure reads as a
// reading off an instrument rather than as a word in a paragraph.
export function plaque(radius = R.chip): CSSProperties {
  return {
    background: FILL_PLAQUE,
    border: `1.5px solid ${LINE}`,
    borderRadius: radius,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 0 rgba(46,38,24,0.06)",
    boxSizing: "border-box",
  };
}

// The gold sub-panel the target lives in. It is the one framed thing on the
// board that is not neutral, because the target is the one number that is not a
// fact about what happened but a fact about what is being asked.
export function goldPanel(radius = R.chip): CSSProperties {
  return {
    background: "linear-gradient(180deg, #FFFBF0, #FDF3DC)",
    border: `1.5px solid rgba(181,122,0,0.52)`,
    borderRadius: radius,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
    boxSizing: "border-box",
  };
}

// ------------------------------------------------------------- the buttons

const UI_ID = "tally-ui-chrome";

export type ButtonFace = "primary" | "ink" | "plain" | "gold" | "ghost";

export function btn(face: ButtonFace, extra?: string): string {
  return `tally-btn tally-btn--${face}${extra ? ` ${extra}` : ""}`;
}

// The size of a button, which is the only thing about it an inline style is
// allowed to set, because the size is the one thing that scales with the board.
export function btnSize(ui: number, size: "sm" | "md" | "lg" = "md"): CSSProperties {
  const s = { sm: [11.5, 5, 10], md: [13, 7, 14], lg: [14.5, 9, 20] }[size];
  return {
    fontSize: Math.round(s[0] * ui * 2) / 2,
    padding: `${Math.round(s[1] * ui)}px ${Math.round(s[2] * ui)}px`,
  };
}

export function ensureTallyUI(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(UI_ID)) return;
  const el = document.createElement("style");
  el.id = UI_ID;
  el.textContent = `
.tally-btn {
  font-family: ${SANS};
  font-weight: 700;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  border-radius: ${R.panel}px;
  border: 1.5px solid transparent;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  -webkit-user-select: none;
  user-select: none;
  transition: transform .11s cubic-bezier(.2,.8,.3,1), box-shadow .11s ease,
              background .14s ease, color .14s ease, opacity .16s ease;
}
.tally-btn:focus-visible { outline: 2.5px solid ${ACCENT}; outline-offset: 2px; }
.tally-btn:disabled { cursor: default; }
.tally-btn:not(:disabled):hover { transform: translateY(-1px); }
.tally-btn:not(:disabled):active { transform: translateY(2px); }
/* a press the game holds for a moment after the pointer has gone, so a tap on a
   touch screen still shows the button going down */
.tally-btn.is-down:not(:disabled) { transform: translateY(2px); filter: brightness(0.94); }

.tally-btn--primary {
  background: linear-gradient(180deg, #2E8BEA, ${ACCENT});
  color: #FFFFFF;
  border-color: #0663C2;
  box-shadow: 0 2.5px 0 #0A57A6, 0 3px 7px rgba(10,60,120,0.20), ${TOP_LIGHT_SOFT};
}
.tally-btn--primary:not(:disabled):hover { background: linear-gradient(180deg, #4098EE, #0B7BEC); }
.tally-btn--primary:not(:disabled):active { box-shadow: 0 0.5px 0 #0A57A6, 0 1px 2px rgba(10,60,120,0.18); }
.tally-btn--primary:disabled {
  background: #C7C3BA; border-color: #B3AFA6; color: #FFFFFF;
  box-shadow: 0 2.5px 0 rgba(46,38,24,0.15);
}

.tally-btn--ink {
  background: linear-gradient(180deg, #3A3A3E, #202024);
  color: #FFFFFF;
  border-color: #141416;
  box-shadow: 0 2.5px 0 #0C0C0E, 0 3px 7px rgba(20,25,40,0.22), ${TOP_LIGHT_SOFT};
}
.tally-btn--ink:not(:disabled):hover { background: linear-gradient(180deg, #4A4A50, #2A2A2F); }
.tally-btn--ink:not(:disabled):active { box-shadow: 0 0.5px 0 #0C0C0E, 0 1px 2px rgba(20,25,40,0.2); }
.tally-btn--ink:disabled {
  background: #C7C3BA; border-color: #B3AFA6; color: #FFFFFF;
  box-shadow: 0 2.5px 0 rgba(46,38,24,0.15);
}

.tally-btn--plain {
  background: linear-gradient(180deg, #FFFFFF, #F4F1EA);
  color: ${INK};
  border-color: ${LINE_HARD};
  box-shadow: 0 2.5px 0 rgba(46,38,24,0.13), 0 2px 5px rgba(46,38,24,0.07), ${TOP_LIGHT};
}
.tally-btn--plain:not(:disabled):hover { background: linear-gradient(180deg, #FFFFFF, #FBF8F2); border-color: rgba(46,38,24,0.42); }
.tally-btn--plain:not(:disabled):active { box-shadow: 0 0.5px 0 rgba(46,38,24,0.13), 0 1px 2px rgba(46,38,24,0.07); }
.tally-btn--plain:disabled {
  background: #EFECE5; color: #A8A49B; border-color: rgba(46,38,24,0.14);
  box-shadow: 0 2.5px 0 rgba(46,38,24,0.08);
}

.tally-btn--gold {
  background: linear-gradient(180deg, #D89B1C, ${GOLD});
  color: #FFFFFF;
  border-color: #92650A;
  box-shadow: 0 2.5px 0 #7A5405, 0 3px 7px rgba(120,84,5,0.22), ${TOP_LIGHT_SOFT};
}
.tally-btn--gold:not(:disabled):hover { background: linear-gradient(180deg, #E5A828, #C08403); }
.tally-btn--gold:not(:disabled):active { box-shadow: 0 0.5px 0 #7A5405, 0 1px 2px rgba(120,84,5,0.2); }

.tally-btn--ghost {
  background: transparent;
  color: ${SUB};
  border-color: transparent;
  box-shadow: none;
  font-weight: 650;
}
.tally-btn--ghost:not(:disabled):hover {
  background: rgba(46,38,24,0.055);
  border-color: rgba(46,38,24,0.13);
  color: ${INK};
  transform: none;
}
.tally-btn--ghost:not(:disabled):active { background: rgba(46,38,24,0.10); transform: translateY(1px); }
.tally-btn--ghost:disabled { opacity: 0.4; }

/* a ghost button that is switched on, for the strip's toggles */
.tally-btn--ghost[aria-pressed="true"] {
  background: rgba(0,113,227,0.09);
  border-color: rgba(0,113,227,0.28);
  color: ${ACCENT};
}

/* a whole tile that behaves as one button: the chapter cards */
.tally-tile {
  transition: transform .12s cubic-bezier(.2,.8,.3,1), box-shadow .12s ease, border-color .14s ease;
}
.tally-tile--live:hover { transform: translateY(-2px); }

@media (prefers-reduced-motion: reduce) {
  .tally-btn, .tally-tile { transition: none !important; }
  .tally-btn:not(:disabled):hover, .tally-btn:not(:disabled):active,
  .tally-tile--live:hover { transform: none !important; }
}`;
  document.head.appendChild(el);
}
