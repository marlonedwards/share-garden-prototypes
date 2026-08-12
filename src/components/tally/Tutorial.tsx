// Chapter 1 is the tutorial, and the piggy bank is the only thing in the game
// that talks in the first person.
//
// The script is eight beats long and every beat is one sentence. The sentences
// name things: what a block is, what the wall is, what the gold line is, what
// payday is, what an empty shop means, and what a week of doing nothing does to
// a pile of money. Not one of them tells the player to do anything, because the
// reward function contract in docs/tally-spec.md section 8 binds the piggy
// harder than it binds anything else on the board: a mascot that gives advice is
// a mascot that has started scoring the game.
//
// A beat knows two things: where on the screen it belongs, and what it points
// at. It only shows when the game is on the screen it belongs to, so the script
// follows the player rather than the player following the script. A tap anywhere
// moves it on, and so does the action it is pointing at, because those are the
// same press. The piggy stands next to what it is talking about: under a thing
// it points up at, and to the right of a thing it points left at.
//
// A sentence about a thing has to say which thing, so a beat with an anchor
// also lights it: the board goes under a soft scrim and the thing the sentence
// is about sits in a clear window cut out of it, framed in the same chrome
// every other panel wears. The scrim is a picture and never a wall, so it takes
// no press of its own and nothing under it is any harder to reach than it was.
//
// Three gates decide when a beat is over, because a player who is tapping
// rather than reading should run out of taps:
//
//   TAP     the informational beats, which a tap anywhere moves on, but not for
//           the first six hundred milliseconds: the sentence fades up to full
//           over exactly that long, and a double tap can never spend two beats.
//   HOLD    payday, which stands until the blocks have finished landing.
//   ACTION  the Play key, which is the one beat that only its own press can
//           finish. The key pulses until it is pressed, so the invitation is in
//           the object rather than in the sentence, and the press that ends the
//           beat is the press that plays the week.
//
// The first bubble carries the way out. Skipping is one press, it is permanent,
// it is never gated by anything above, and the Tutorial button on the main menu
// is what brings the piggy back.

import { CSSProperties } from "react";
import Piggy, { PiggyPose } from "./Piggy";
import { ACCENT, FILL_PLAQUE, INK, LINE_HARD, R, SANS, SUB, btn, panel } from "./ui";

// Where in the game a beat belongs. The page hands the tutorial one of these
// every render and the script decides whether it has anything to say.
export interface TourWhere {
  // "chapter" while the chapter card is up, "plan" during play, "summary" after
  phase: string;
  // the board body's own beat: the table, the shop, and the two it never speaks
  // over
  beat: string;
  // which turn the chapter is on, so "a week has just passed" is only said once
  // a week has actually passed
  turn: number;
}

// Where the piggy stands relative to the thing it is talking about. "under"
// puts it below with its trotter up; "over" puts it above with its trotter
// down; "free" is for the two beats that are about the whole screen.
type Place = "under" | "over" | "free";

// What ends a beat. "tap" is a press anywhere once the sentence has been up
// long enough to read; "hold" waits for the moment it is narrating to finish;
// "action" waits for the one press the sentence is about.
export type Gate = "tap" | "hold" | "action";

// How long a sentence is on screen before a tap can spend it, and how long the
// beat that narrates payday stands whatever else happens. The first is also the
// length of the bubble's own fade, so the cue and the rule are one thing.
export const DWELL_MS = 600;
export const HOLD_MS = 900;

// The class the one action beat puts on the key it is about, and the accent the
// ring around that key is drawn in.
export const INVITE = "tally-invite";
const INVITE_RING = "rgba(0,113,227,0.58)";

export interface TourBeat {
  id: string;
  say: string;
  pose: PiggyPose;
  place: Place;
  // the element the beat is about, as a selector inside the board body
  anchor?: string;
  // how far along that element the piggy stands, as a fraction of its width.
  // A line that runs the whole board is still pointed at from somewhere, and
  // that somewhere should not be on top of the score.
  atX?: number;
  // what ends the beat, and, for an action beat, the element whose press ends
  // it. An action beat's element is the anchor by default.
  gate?: Gate;
  act?: string;
  fits: (w: TourWhere) => boolean;
}

// The script. Its order is the order the game actually happens in: the chapter
// card, then the shop that opens itself, then the table, then the first scoring,
// then the summary.
export const TOUR: TourBeat[] = [
  {
    id: "hello",
    say: "I am your piggy bank, and this chapter is just you and me.",
    pose: "idle",
    place: "free",
    fits: (w) => w.phase === "chapter",
  },
  {
    id: "payday",
    say: "Payday puts two blocks into your pocket every week.",
    pose: "up",
    place: "under",
    anchor: '[data-money="1"]',
    // the sentence is about blocks arriving, so it stands until they have
    // arrived: a tap cannot spend the moment it is describing
    gate: "hold",
    fits: (w) => w.phase === "plan" && w.beat === "shop",
  },
  {
    id: "counter",
    say: "There is nothing to buy yet, because first money has to exist.",
    pose: "up",
    place: "under",
    anchor: '[data-counter-note="1"]',
    fits: (w) => w.phase === "plan" && w.beat === "shop",
  },
  {
    id: "money",
    say: "Every green block is five real dollars of yours.",
    pose: "down",
    place: "over",
    anchor: '[data-money-row="1"]',
    fits: (w) => w.phase === "plan" && w.beat === "table" && w.turn === 0,
  },
  {
    id: "wall",
    say: "The wall is the record of what your money is worth, one column for every week.",
    pose: "up",
    place: "under",
    anchor: '[data-wall="1"]',
    fits: (w) => w.phase === "plan" && w.beat === "table" && w.turn === 0,
  },
  {
    id: "target",
    say: "That gold line is the target, and finishing above it clears the chapter.",
    pose: "up",
    place: "under",
    anchor: '[data-target-line="1"]',
    fits: (w) => w.phase === "plan" && w.beat === "table" && w.turn === 0,
  },
  {
    id: "read",
    say: "A pile that does nothing does not grow, and a week has just passed.",
    pose: "up",
    place: "under",
    anchor: '[data-read-line="1"]',
    atX: 0.2,
    fits: (w) => w.phase === "plan" && w.beat === "table" && w.turn >= 1,
  },
  {
    // The one beat that is about a press, and therefore the one beat that only
    // that press can finish. The sentence names what the key does and stops
    // there; the pulse is what does the inviting.
    id: "play",
    say: "The Play key runs the next week, and the wall writes down what happened.",
    pose: "down",
    place: "over",
    anchor: '[data-play="1"]',
    atX: 0.5,
    gate: "action",
    fits: (w) => w.phase === "plan" && w.beat === "table" && w.turn >= 1,
  },
  {
    id: "cleared",
    say: "You cleared it, and chapter 2 opens the bank.",
    pose: "celebrate",
    place: "free",
    fits: (w) => w.phase === "summary",
  },
];

// The beat the script is on, given where the player is. The index only ever
// moves forward: a beat whose screen has been left behind is a beat that has
// been had.
export function beatAt(index: number, where: TourWhere): number {
  for (let i = Math.max(0, index); i < TOUR.length; i++) {
    if (TOUR[i].fits(where)) return i;
  }
  return -1;
}

const BUBBLE_ID = "tally-tutorial-anims";

// The bubble's arrival is the dwell made visible: it rises in a fifth of the
// time and then finishes settling to full opacity exactly as the beat becomes
// something a tap can spend. The pulse on an action beat's key is the accent
// ring the game already uses for focus, breathing; under reduced motion the
// ring is simply there, which is the same affordance holding still.
export function ensureTutorialAnims(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(BUBBLE_ID)) return;
  const el = document.createElement("style");
  el.id = BUBBLE_ID;
  el.textContent = `
@keyframes tally-bubble-in {
  0%   { transform: translateY(6px) scale(0.97); opacity: 0; }
  38%  { transform: none; opacity: 0.86; }
  100% { transform: none; opacity: 1; }
}
@keyframes tally-scrim-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes tally-invite-pulse {
  0%, 100% { transform: scale(1);    border-color: ${INVITE_RING}; }
  50%      { transform: scale(1.04); border-color: rgba(0,113,227,0.16); }
}
/* The ring is the thing that breathes, and the key holds perfectly still under
   it: a target that moves is a target that is harder to hit, and the key keeps
   its own hover and its own press exactly as every other key has them. */
.tally-invite::after {
  content: "";
  position: absolute;
  left: -4px; right: -4px; top: -4px; bottom: -4px;
  border: 2.5px solid ${INVITE_RING};
  border-radius: ${R.panel + 3}px;
  pointer-events: none;
  animation: tally-invite-pulse 1500ms ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .tally-bubble, .tally-spotlight { animation: none !important; }
  /* the invitation still reads, as the accent ring standing still */
  .tally-invite::after { animation: none !important; border-color: ${ACCENT}; }
}`;
  document.head.appendChild(el);
}

// ------------------------------------------------------------- the spotlight

// The rectangle a beat is about, in board body pixels.
export interface TourRect { x: number; y: number; w: number; h: number }

export interface SpotlightProps {
  hole: TourRect;
  // the board body's own size, which is the size of the scrim
  width: number;
  height: number;
  ui: number;
  reduced: boolean;
}

const SCRIM = "rgba(46,38,24,0.34)";
const HOLE_ID = "tally-spotlight-hole";

// The board, dimmed, with a clear window where the sentence is pointing. It is
// drawn as one mask rather than as four bars around a gap so the corners are
// the game's own radius, and it takes no press at all: the thing in the window
// is exactly as reachable as it was before the light went down.
export function Spotlight(p: SpotlightProps) {
  ensureTutorialAnims();
  const pad = Math.round(10 * p.ui);
  const x = Math.max(0, p.hole.x - pad);
  const y = Math.max(0, p.hole.y - pad);
  const w = Math.max(0, Math.min(p.width - x, p.hole.w + pad * 2));
  const h = Math.max(0, Math.min(p.height - y, p.hole.h + pad * 2));
  return (
    <svg
      className="tally-spotlight"
      data-spotlight="1"
      data-spot-rect={`${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`}
      width={p.width}
      height={p.height}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        zIndex: 58,
        pointerEvents: "none",
        borderRadius: R.panel,
        animation: p.reduced ? undefined : "tally-scrim-in 200ms ease both",
      }}
      aria-hidden
    >
      <defs>
        <mask id={HOLE_ID}>
          <rect x={0} y={0} width={p.width} height={p.height} fill="#FFFFFF" />
          <rect x={x} y={y} width={w} height={h} rx={R.panel} ry={R.panel} fill="#000000" />
        </mask>
      </defs>
      <rect x={0} y={0} width={p.width} height={p.height} fill={SCRIM} mask={`url(#${HOLE_ID})`} />
      {/* the window's own edge, in the frame weight and colour every panel on
          the board wears */}
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, w - 2)}
        height={Math.max(0, h - 2)}
        rx={R.panel}
        ry={R.panel}
        fill="none"
        stroke={LINE_HARD}
        strokeWidth={2}
      />
    </svg>
  );
}

export interface PiggyBubbleProps {
  beat: TourBeat;
  // the sentence's own box, already placed by the page, in board body pixels
  left: number;
  top: number;
  width: number;
  ui: number;
  first: boolean;
  reduced: boolean;
  onSkip: () => void;
}

// The bubble, in the game's own chrome: a plaque with the two pixel frame every
// other panel on the board wears, and the piggy standing next to it in the pose
// that matches what it is pointing at.
export default function PiggyBubble(p: PiggyBubbleProps) {
  ensureTutorialAnims();
  const s = (n: number) => Math.round(n * p.ui);
  const type = (n: number) => Math.round(n * p.ui * 2) / 2;
  const piggy = s(56);

  const box: CSSProperties = {
    ...panel({ fill: FILL_PLAQUE, radius: R.panel, hard: true }),
    borderColor: LINE_HARD,
    width: p.width,
    boxSizing: "border-box",
    padding: `${s(9)}px ${s(12)}px ${s(9)}px`,
    boxShadow: "0 8px 22px rgba(46,38,24,0.16), inset 0 1.5px 0 rgba(255,255,255,0.85)",
    pointerEvents: "none",
  };

  // Two boxes, because the outer one owns where the group sits and the inner
  // one owns how it arrives, and a keyframe that animates transform cannot
  // share a box with a transform that is doing the placing.
  return (
    <div
      data-tutorial={p.beat.id}
      data-tutorial-pose={p.beat.pose}
      data-tutorial-gate={p.beat.gate ?? "tap"}
      style={{
        position: "absolute",
        left: p.left,
        top: p.top,
        zIndex: 60,
        // a beat that stands over the thing it names hangs by its own bottom
        // edge, because the page cannot know how tall a sentence is
        transform: p.beat.place === "under" ? undefined : "translateY(-100%)",
        fontFamily: SANS,
        color: INK,
        // the layer never takes a press: a tap goes through to the board and
        // moves the script on at the same time
        pointerEvents: "none",
      }}
    >
      <div
        className="tally-bubble"
        style={{
          display: "flex",
          alignItems: p.beat.place === "over" ? "flex-start" : "flex-end",
          gap: s(6),
          // the fade runs exactly as long as the dwell, so a sentence that has
          // finished arriving is a sentence a tap is allowed to spend
          animation: p.reduced
            ? undefined
            : `tally-bubble-in ${DWELL_MS}ms cubic-bezier(.2,.8,.3,1) both`,
        }}
      >
        <Piggy pose={p.beat.pose} size={piggy} still={p.reduced} />
        <div style={box}>
          <div
            data-tutorial-say={p.beat.id}
            style={{ fontSize: type(14), lineHeight: 1.45, fontWeight: 600, letterSpacing: "-0.01em" }}
          >
            {p.beat.say}
          </div>
          {p.first && (
            <button
              type="button"
              data-tutorial-skip="1"
              className={btn("ghost")}
              onClick={p.onSkip}
              style={{
                marginTop: s(5),
                fontSize: type(11.5),
                padding: `${s(4)}px ${s(9)}px`,
                borderRadius: R.chip,
                color: SUB,
                pointerEvents: "auto",
              }}
            >
              Skip the tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
