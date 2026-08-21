// The one button in Monkey Trade, so the page's trade row, the level cards and
// the end card all press the same way. Contract: docs/monkey-spec.md section 9.
//
// The Duolingo button is a fill sitting on a 4px darker band. Pressing does not
// darken the face, it collapses the band: the face travels down two pixels and
// the band loses two, so the whole button keeps its box and the press is felt
// rather than seen. No border, no hairline, 16px radius, 600 weight, sentence
// case, 16px text.

import { CSSProperties, ReactNode, useState } from "react";
import { UI_FONT } from "../../lib/type";
import {
  BUTTON_EDGE, BUTTON_PRESS, GREEN, GREEN_EDGE, GREY, GREY_EDGE, GOLD, GOLD_EDGE,
  INK, MUTED, RADIUS, RED, RED_EDGE, SIZE, SKY, SKY_EDGE, WEIGHT,
} from "../../lib/monkey/look";

export type Tone = "green" | "red" | "sky" | "gold" | "grey";

const FACE: Record<Tone, { fill: string; edge: string; ink: string }> = {
  green: { fill: GREEN, edge: GREEN_EDGE, ink: "#FFFFFF" },
  red: { fill: RED, edge: RED_EDGE, ink: "#FFFFFF" },
  sky: { fill: SKY, edge: SKY_EDGE, ink: "#FFFFFF" },
  gold: { fill: GOLD, edge: GOLD_EDGE, ink: INK },
  grey: { fill: GREY, edge: GREY_EDGE, ink: INK },
};

export default function DuoButton({
  children, onClick, tone = "green", size = "md", disabled = false,
  action, wide = false, style, title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** the data-action the walk looks for */
  action?: string;
  wide?: boolean;
  style?: CSSProperties;
  title?: string;
}) {
  const [down, setDown] = useState(false);
  const face = FACE[tone];
  const pressed = down && !disabled;
  const pad = size === "sm" ? "8px 14px" : size === "lg" ? "16px 28px" : "12px 20px";
  const text = size === "sm" ? SIZE.small + 1 : size === "lg" ? SIZE.lead : SIZE.body;

  const box: CSSProperties = {
    display: "inline-block",
    width: wide ? "100%" : undefined,
    borderRadius: RADIUS,
    background: disabled ? GREY_EDGE : face.edge,
    padding: 0,
    border: "none",
    cursor: disabled ? "default" : "pointer",
    font: "inherit",
    ...style,
  };

  return (
    <button
      type="button"
      data-action={action}
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onBlur={() => setDown(false)}
      style={box}
    >
      <span
        style={{
          display: "block",
          borderRadius: RADIUS,
          background: disabled ? GREY : face.fill,
          color: disabled ? MUTED : face.ink,
          fontFamily: UI_FONT,
          fontSize: text,
          fontWeight: WEIGHT.button,
          lineHeight: "20px",
          padding: pad,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          transform: `translateY(${pressed ? BUTTON_PRESS : 0}px)`,
          marginBottom: pressed ? BUTTON_EDGE - BUTTON_PRESS : BUTTON_EDGE,
          transition: "transform 60ms ease-out, margin-bottom 60ms ease-out",
        }}
      >
        {children}
      </span>
    </button>
  );
}
