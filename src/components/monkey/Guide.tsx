// The guide's bubble. One monkey talks, at most four times a level, one short
// line each, and the line fades on its own after about four seconds so it never
// waits on a tap and never interrupts the tape. Contract: docs/monkey-spec.md
// section 8.
//
// The bubble is a soft tint panel with a small tail, sentence case, 16px, ink
// on warm white. No caption above it, no icon, no dismiss.

import { useEffect, useRef, useState } from "react";
import type { GuideProps } from "./props";
import { UI_FONT } from "../../lib/type";
import { EASE, INK, RADIUS, SIZE, WEIGHT, reducedMotion } from "../../lib/monkey/look";

// The bubble sits on the strip's own warm panel, so a soft tint of the accent
// would disappear into it. Plain white on a small shadow is what makes it read
// as something the guide said rather than a paragraph on the stage.
const BUBBLE = "#FFFFFF";

export const GUIDE_HOLD_MS = 4000;
const FADE_MS = 320;

export default function Guide({ line, onShown, onDone, width = 260 }: GuideProps) {
  const [shown, setShown] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(onShown);
  const doneRef = useRef(onDone);
  shownRef.current = onShown;
  doneRef.current = onDone;

  useEffect(() => {
    if (!line) {
      setVisible(false);
      return;
    }
    setShown(line);
    setVisible(true);
    shownRef.current?.();
    const hold = window.setTimeout(() => setVisible(false), GUIDE_HOLD_MS);
    const clear = window.setTimeout(() => {
      setShown(null);
      doneRef.current?.();
    }, GUIDE_HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(clear);
    };
  }, [line]);

  if (!shown) return null;
  const still = reducedMotion();

  return (
    <div
      data-guide-line={shown}
      style={{
        width,
        maxWidth: "100%",
        background: BUBBLE,
        color: INK,
        borderRadius: RADIUS,
        padding: "10px 14px",
        boxShadow: "0 3px 0 rgba(60,60,60,0.10), 0 8px 18px rgba(60,60,60,0.08)",
        fontFamily: UI_FONT,
        fontSize: SIZE.body,
        fontWeight: WEIGHT.body,
        lineHeight: "22px",
        position: "relative",
        opacity: visible ? 1 : 0,
        transform: still ? "none" : `translateY(${visible ? 0 : 6}px)`,
        transition: still
          ? `opacity ${FADE_MS}ms linear`
          : `opacity ${FADE_MS}ms ease-out, transform 240ms ${EASE}`,
        pointerEvents: "none",
      }}
    >
      {shown}
      {/* the tail, pointing down at the guide's slot */}
      <span
        style={{
          position: "absolute",
          left: 22,
          bottom: -7,
          width: 14,
          height: 14,
          background: BUBBLE,
          borderRadius: 3,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}
