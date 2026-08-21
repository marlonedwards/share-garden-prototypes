// The troop, standing over the board while the round opens. Contract:
// docs/monkey-spec.md sections 4 and 5.
//
// The round used to open on a screen with no monkeys on it. Ten darts arrived
// out of the top of the frame, the guide's bubble pointed its tail at bare
// ground, and the one generated pose that shows a monkey actually throwing was
// never drawn. The game is called Monkey Trade and the monkeys were off stage
// for the only phase that is entirely theirs.
//
// So the troop lines up above the board and throws. Each monkey flips into the
// throw pose as its own dart flies and drops back to idle once it has landed,
// on the same schedule the board lands them (dartStepMs, imported rather than
// copied, so the two can never drift), and the guide talks in the talk pose
// with the bubble hanging off its own head. Tie colour is the only thing that
// tells them apart, which is what the art was built for.
//
// Nothing here reads a clock or a price. Given the same darts it always draws
// the same troop.

import { useEffect, useRef, useState } from "react";
import type { Pose, TroopProps } from "./props";
import { dartStepMs } from "./Board";
import Guide from "./Guide";
import { Face } from "./Strip";
import { MUTED, reducedMotion } from "../../lib/monkey/look";

// The band the troop stands in. Ninety six pixels is a monkey you can read the
// tie on, and it is what the open layout has to spare over a board that still
// draws its dial at full size.
export const TROOP_HEIGHT = 96;

// A monkey winds up a little before its dart lands and holds the pose a little
// after, so a troop throwing thirty darts in two seconds looks like a troop
// throwing rather than a row of blinking sprites.
const LEAD_MS = 150;
const HOLD_MS = 130;

// The guide's bubble hangs under its own monkey. It is wide enough that every
// line in src/content/monkey.ts falls on two lines at 16px.
const BUBBLE_W = 460;

export default function Troop({
  darts, thrown, count, guideIndex, guideLine, onGuideDone, ties,
  width, height = TROOP_HEIGHT, instant,
}: TroopProps) {
  const still = reducedMotion();

  // How many darts each monkey has in the air right now. A monkey on level 3
  // throws three, and its poses have to chain rather than fight, so this counts
  // up and down instead of setting a flag.
  const [flying, setFlying] = useState<Record<number, number>>({});
  const wasThrown = useRef(thrown);

  useEffect(() => {
    if (!thrown) {
      setFlying({});
      wasThrown.current = false;
      return;
    }
    if (wasThrown.current) return;
    wasThrown.current = true;
    if (instant || still || darts.length === 0) return;
    const step = dartStepMs(darts.length);
    const bump = (m: number, by: number) => setFlying((cur) => {
      const n = (cur[m] ?? 0) + by;
      const next = { ...cur };
      if (n > 0) next[m] = n;
      else delete next[m];
      return next;
    });
    const timers: number[] = [];
    darts.forEach((d, i) => {
      const at = i * step;
      timers.push(window.setTimeout(() => bump(d.monkey, 1), Math.max(0, at - LEAD_MS)));
      timers.push(window.setTimeout(() => bump(d.monkey, -1), at + HOLD_MS));
    });
    return () => { timers.forEach((t) => window.clearTimeout(t)); };
  }, [thrown, darts, instant, still]);

  const step = width / Math.max(1, count);
  const size = Math.max(48, Math.min(height, step - 10));

  // The guide stands in its own place in the line, and the bubble hangs off it
  // rather than out of the corner of the screen: clamped to the band so a guide
  // at either end still reads, with the tail left over its own monkey.
  const guideAt = Math.max(0, Math.min(count - 1, guideIndex - 1));
  const guideMid = (guideAt + 0.5) * step;
  const bubbleW = Math.min(BUBBLE_W, width);
  const bubbleX = Math.max(0, Math.min(width - bubbleW, guideMid - 64));

  return (
    <div
      data-troop
      style={{
        position: "relative",
        width,
        height,
        flex: "none",
        zIndex: 4,
      }}
    >
      {Array.from({ length: count }, (_, k) => {
        const index = k + 1;
        const throwing = (flying[index] ?? 0) > 0;
        const pose: Pose = throwing
          ? "throw"
          : index === guideIndex && guideLine
            ? "talk"
            : "idle";
        return (
          <div
            key={index}
            data-troop-monkey={index}
            data-troop-pose={pose}
            title={`Monkey ${index}`}
            style={{
              position: "absolute",
              left: k * step + (step - size) / 2,
              bottom: 0,
              width: size,
              height: size,
            }}
          >
            <Face pose={pose} size={size} tie={ties[index] ?? MUTED} />
          </div>
        );
      })}

      {/* the guide's line, hanging under the monkey that said it */}
      <div style={{ position: "absolute", top: height + 8, left: bubbleX, zIndex: 5 }}>
        <Guide
          line={guideLine}
          onDone={onGuideDone}
          width={bubbleW}
          tail={{ edge: "top", from: "left", at: Math.max(14, guideMid - bubbleX - 7) }}
        />
      </div>
    </div>
  );
}
