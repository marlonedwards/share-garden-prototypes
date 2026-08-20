// The headline ticker: one continuous strip under the chart. It scrolls off the
// tape rather than off a wall clock, so it slows with a slow era, and it stops
// dead the moment a gate pauses the tape. Tapping a headline does nothing.
// They are weather (docs/floor-spec.md section 3).
//
// Layout is a pure function of the sample: each headline wants to reach the
// right edge at its own month, and is pushed later only far enough to clear the
// one in front of it. A headline pushed more than three months past its own
// month is dropped rather than shown late, which keeps the strip honest about
// when things were said and thins a crowded stretch instead of queueing it.

import { useMemo } from "react";
import { PlacedHeadline } from "../../lib/tape/headlines";

export const PX_PER_MONTH = 190;
const GAP = 56;
const LATE_MONTHS = 3;

interface Laid {
  item: PlacedHeadline;
  start: number;   // pixels of tape travel before it touches the right edge
  width: number;
}

// A close enough measure of a nowrap 13px system line, deliberately generous so
// two headlines never touch.
function widthOf(text: string): number {
  return Math.round(text.length * 7 + 32);
}

export function layout(items: PlacedHeadline[], startIndex: number): Laid[] {
  const out: Laid[] = [];
  let free = -Infinity;
  for (const item of items) {
    const runIndex = item.monthIndex - startIndex;
    if (runIndex < 0) continue;
    const want = runIndex * PX_PER_MONTH;
    const start = Math.max(want, free);
    if (start - want > LATE_MONTHS * PX_PER_MONTH) continue;
    const width = widthOf(item.text);
    out.push({ item, start, width });
    free = start + width + GAP;
  }
  return out;
}

export default function Ticker({
  items, startIndex, t, width, height,
}: {
  items: PlacedHeadline[];
  startIndex: number;
  t: number;
  width: number;
  height: number;
}) {
  const laid = useMemo(() => layout(items, startIndex), [items, startIndex]);
  const scroll = t * PX_PER_MONTH;
  const visible = laid.filter((l) => {
    const x = width + l.start - scroll;
    return x > -l.width - 8 && x < width + 8;
  });

  return (
    <div
      data-ticker
      data-count={visible.length}
      className="relative overflow-hidden w-full"
      style={{ height, borderTop: "1px solid #2C3644", borderBottom: "1px solid #2C3644" }}
    >
      {visible.map((l) => (
        <div
          key={l.item.id}
          data-headline={l.item.id}
          className="absolute whitespace-nowrap"
          style={{
            left: 0,
            top: 0,
            transform: `translateX(${Math.round(width + l.start - scroll)}px)`,
            lineHeight: `${height}px`,
            fontSize: 13,
            color: "#B7C2D0",
          }}
        >
          {l.item.text}
        </div>
      ))}
    </div>
  );
}
