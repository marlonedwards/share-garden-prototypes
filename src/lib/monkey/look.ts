// Monkey Trade's look: the palette and the shape tokens, in one place, so the
// stage and the page draw the same game. Contract: docs/monkey-spec.md
// section 9, on top of the binding type contract in docs/clean-type.md.
//
// Duolingo, committed. Warm white ground, panels in soft tints of the accent
// colours, thick bottom edges on the buttons, 16px radii, fills over borders,
// and no hairline anywhere. The type rules are not negotiable and they live
// here as tokens too: UI_FONT only, 700 headings, 600 buttons, 400 body,
// tabular digits on every number, nothing under 12px, sentence case, no
// uppercase, no letter-spacing, no monospace.

// ------------------------------------------------------------- the palette

export const GROUND = "#FFFBF2";   // warm white, the stage
export const GREEN = "#58CC02";    // up, and your wins
export const RED = "#FF4B4B";      // down
export const GOLD = "#FFC800";     // the rank lead and the celebration
export const SKY = "#1CB0F6";      // the board and focus
export const INK = "#3C3C3C";      // text
export const MUTED = "#777777";    // second-rank text

// The darker band under a button and under a slab. Not a border: a fill that
// the button sits on and collapses into when pressed.
export const GREEN_EDGE = "#48A800";
export const RED_EDGE = "#D93A3A";
export const GOLD_EDGE = "#E0AE00";
export const SKY_EDGE = "#1493CE";
export const GREY = "#E8E1D3";     // a neutral button face on the warm ground
export const GREY_EDGE = "#D2C9B7";

// The desk band sits slightly warmer than the stage so the bottom reads as
// yours, and panels are soft tints rather than outlined boxes.
export const PANEL = "#FFF4DE";
export const DESK = "#FBF0DC";
export const SEAM = "rgba(60,60,60,0.16)";

// A soft tint of any accent, for wedges and panels. Fills over borders, so a
// tint is an alpha of the accent laid on the warm ground rather than a wash
// mixed by hand.
export function tint(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ------------------------------------------------------------ the ten ties

// Individuality comes from a tie colour per monkey, set in code, because the
// sprite is one character in five poses. Index 0 is never a monkey (the troop
// is numbered one to ten), so it holds the muted grey and TIES[monkey.index]
// reads straight through.
export const TIES: string[] = [
  MUTED,
  "#FF4B4B",   // 1, the guide
  "#FF9600",
  "#FFC800",
  "#58CC02",
  "#1CB0F6",
  "#CE82FF",
  "#FF86D0",
  "#2B70C9",
  "#00A78E",
  "#A56644",
];

// -------------------------------------------------------------- the shapes

export const RADIUS = 16;
export const RADIUS_SM = 10;
export const BUTTON_EDGE = 4;      // the darker band under a button
export const BUTTON_PRESS = 2;     // how far the face travels when pressed

// Bouncy, 250 to 300ms, with a small overshoot. One curve for the whole game.
export const EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";
export const MOVE_MS = 280;

// ---------------------------------------------------------------- the type

export const SIZE = {
  small: 13,       // the floor is 12; captions sit here
  body: 16,
  lead: 20,
  rank: 28,        // the rank line
  end: 40,         // the end card's lead
};

export const WEIGHT = {
  body: 400,
  emphasis: 600,
  button: 600,
  heading: 700,
};

// Every changing number carries tabular digits, in the DOM and in SVG alike.
export const TNUM = { fontVariantNumeric: "tabular-nums" } as const;

export function reducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ------------------------------------------------------- the tie on the chest

// The tie used to be a glyph under the monkey's feet, which read as a fault
// rather than as a suit. It sits on the chest now, drawn over the sprite's own
// grey tie, so the colour that tells the troop apart is worn rather than
// stacked underneath.
//
// The overlay has to register on five different poses, so the knot was measured
// once per pose rather than guessed: every sprite is 512 square on a shared
// baseline, and the tie's fill is the only light, unsaturated ink inside the
// suit, so a mask of (alpha > 200, saturation < 26, value 120 to 215) isolates
// it exactly. The numbers below are that mask's box in the 512 frame: `cx` and
// `top` are the middle of the knot, `w` the widest part of the tie, `h` the drop
// from the knot to the point of the blade, and `deg` the lean measured between
// the knot's centre and the blade's. The throw and slump poses turn the body,
// which is why their boxes sit twenty to forty pixels off the idle one and why a
// single fixed overlay could never have registered on all five.
export interface TieAnchor {
  cx: number; top: number; w: number; h: number; deg: number;
}

export const TIE_ANCHOR: Record<string, TieAnchor> = {
  idle:  { cx: 254, top: 264, w: 24, h: 76, deg: 3 },
  throw: { cx: 268, top: 269, w: 20, h: 64, deg: 6 },
  cheer: { cx: 251, top: 265, w: 26, h: 73, deg: 1 },
  slump: { cx: 294, top: 267, w: 24, h: 66, deg: -5 },
  talk:  { cx: 239, top: 265, w: 25, h: 71, deg: 1 },
};

// The sprite frame the anchors are measured in.
export const SPRITE_PX = 512;

// The tie itself, in a hundred by hundred box: a knot that hangs from the
// collar and a blade that widens and comes to a point. The sprite keeps its own
// dark outline around both, so the colour is laid inside the line art rather
// than over it.
export const TIE_KNOT = "M -16 0 L 16 0 L 50 13 L 44 22 L -44 22 L -50 13 Z";
export const TIE_BLADE = "M -26 26 L 26 26 L 47 68 L 0 100 L -47 68 Z";

export function tieAnchor(pose: string): TieAnchor {
  return TIE_ANCHOR[pose] ?? TIE_ANCHOR.idle;
}
