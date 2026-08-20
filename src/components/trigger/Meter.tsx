// The flat unit strip: Jared's three rules with zero 3D and zero coin styling.
// Contract: docs/tape-shared.md section 6.
//
//   a share is a slab      one flat rectangle per share, thickness = price
//   growth is thickness    price moves retint every slab, never the count
//   cash is ticks          fixed $10 units, narrower, one neutral color
//
// One dollar scale for both columns. It is set once from the run's opening
// worth and only ever eased down, when a column would overflow the strip. It
// is never eased up and no trade can move it, which is what makes the two
// columns readable against each other: a sell that pours a slab column into
// ticks lands at the same height it left.
//
// A trade pours rather than snaps. The two columns are drawn from an eased
// position between the state before the trade and the state after it, so a
// sell visibly breaks the slab column down into ticks and a buy visibly fuses
// ticks back into slabs. Only the drawing moves: the numbers, the scale and
// every data attribute below report the true state throughout, so a harness
// reading the strip is never reading the animation. data-pouring says whether
// the pour is still running, and it always finishes inside POUR_MS.

import type { ReactElement } from "react";
import { useEffect, useReducer, useRef } from "react";

export interface MeterProps {
  shares: number;
  price: number;
  cash: number;
  startWorth: number;         // the run's opening worth, sets the scale
  width: number;
  height: number;
  animate?: boolean;          // false freezes the scale and the pour
  background?: string;
}

const UNIT = 10;              // one cash tick, in dollars
const SLAB = "#4ADE80";
const SLAB_EDGE = "rgba(12,15,20,0.55)";
const TICK = "#8794A6";
const FLOOR = "rgba(215,222,232,0.14)";
const FILL = 0.85;            // how much of the strip the opening worth fills
const EASE = 0.14;
export const POUR_MS = 320;   // how long a trade takes to pour

// Rects for one column of countable units. The count is fractional while a
// trade is pouring: the whole units are drawn solid and the remainder is drawn
// as a part unit on top, which is the same shape the cash sliver already had.
// Below three pixels a seam per unit is not readable, so the column draws
// solid and keeps a seam every ten units: still countable, in tens, which is
// how anyone counts a tall stack anyway.
function column(
  key: string, x: number, w: number, floorY: number,
  units: number, unitH: number, fill: string,
): ReactElement[] {
  const out: ReactElement[] = [];
  if (!(units > 0) || !(unitH > 0)) return out;
  const whole = Math.floor(units + 1e-9);
  const partH = (units - whole) * unitH;
  const seam = unitH >= 3 ? 1 : 0;
  if (seam > 0) {
    // A hundred identical seams read as a barcode, so every tenth unit gets a
    // wider break under it and the column counts in tens at a glance.
    const drawn = Math.min(whole, 400);
    for (let i = 0; i < drawn; i++) {
      const gap = i > 0 && i % 10 === 0 ? Math.min(3, seam + 2) : seam;
      const h = unitH - gap;
      if (h <= 0.2) continue;
      out.push(
        <rect key={`${key}s${i}`} x={x} y={floorY - (i + 1) * unitH + gap} width={w} height={h} fill={fill} rx={1} />,
      );
    }
  } else {
    const total = whole * unitH;
    if (total > 0.2) {
      out.push(<rect key={`${key}solid`} x={x} y={floorY - total} width={w} height={total} fill={fill} rx={1} />);
      // a seam every ten units, dropped once ten units are thinner than 2px,
      // where a seam would read as a smudge rather than a count
      if (unitH * 10 >= 2) {
        for (let i = 10; i < whole; i += 10) {
          out.push(
            <rect key={`${key}d${i}`} x={x} y={floorY - i * unitH} width={w} height={0.8} fill={SLAB_EDGE} />,
          );
        }
      }
    }
  }
  if (partH > 0.2) {
    out.push(
      <rect key={`${key}part`} x={x} y={floorY - whole * unitH - partH} width={w} height={partH}
        fill={fill} opacity={0.55} rx={1} />,
    );
  }
  return out;
}

export default function Meter({
  shares, price, cash, startWorth, width, height, animate = true, background = "transparent",
}: MeterProps) {
  const scale = useRef<{ h: number; v: number }>({ h: 0, v: 0 });
  const held = useRef({ shares, cash });
  const pour = useRef<{ shares: number; cash: number; at: number; live: boolean }>(
    { shares, cash, at: 0, live: false },
  );
  const [, repaint] = useReducer((n: number) => n + 1, 0);

  // A change in the share count is a trade, and a trade starts a pour from
  // wherever the strip is standing right now, so back to back trades do not
  // jump.
  const now = typeof performance === "undefined" ? 0 : performance.now();
  if (held.current.shares !== shares) {
    const from = pourAt(pour.current, held.current, now);
    pour.current = { shares: from.shares, cash: from.cash, at: now, live: animate };
  }
  held.current = { shares, cash };

  const eased = pour.current.live ? pourAt(pour.current, { shares, cash }, now) : { shares, cash, done: true };
  if (eased.done) pour.current.live = false;

  useEffect(() => {
    if (!pour.current.live) return;
    const raf = requestAnimationFrame(() => repaint());
    return () => cancelAnimationFrame(raf);
  });

  // Too small to draw, but still the meter: a strip that drops its identity
  // during a layout transient reads as a missing meter to anything watching.
  if (width < 8 || height < 20) {
    return (
      <svg
        width={Math.max(0, width)} height={Math.max(0, height)}
        data-meter="flat" data-scale="0" data-shares={shares}
        data-price={price.toFixed(6)} data-value={(shares * price).toFixed(6)}
        data-cash={cash.toFixed(6)} data-column-h="0" data-slab-h="0"
        data-ticks={Math.floor(cash / UNIT + 1e-9)} data-tick-h="0"
        data-pouring="0" data-draw-shares={shares} data-draw-cash={cash.toFixed(4)}
      />
    );
  }

  const base = (FILL * height) / Math.max(1, startWorth);
  // A strip that changes size keeps its ruler, rescaled to the new height, so
  // the same dollars still fill the same fraction of it. Resetting to the
  // opening scale here would throw away every easing the run has earned and,
  // worse, would let a layout shift move the ruler, which section 6 forbids.
  if (scale.current.h !== height) {
    scale.current = scale.current.h > 0 && scale.current.v > 0
      ? { h: height, v: (scale.current.v * height) / scale.current.h }
      : { h: height, v: base };
  }

  // the scale reads the true state, never the poured one, so a trade can
  // never move the ruler
  const value = shares * price;
  const tallest = Math.max(value, cash, 1);
  const want = (FILL * height) / tallest;
  if (want < scale.current.v) {
    scale.current.v = animate ? scale.current.v + (want - scale.current.v) * EASE : want;
  }
  const s = scale.current.v;

  const gap = Math.max(4, Math.round(width * 0.1));
  const shareW = Math.round((width - gap) * 0.62);
  const cashW = width - gap - shareW;
  const floorY = height - 6;

  const slabH = price * s;
  const columnH = value * s;
  const tickH = UNIT * s;
  const ticks = Math.floor(cash / UNIT + 1e-9);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      data-meter="flat"
      data-scale={s.toFixed(6)}
      data-shares={shares}
      data-price={price.toFixed(6)}
      data-value={value.toFixed(6)}
      data-cash={cash.toFixed(6)}
      data-column-h={columnH.toFixed(4)}
      data-slab-h={slabH.toFixed(6)}
      data-ticks={ticks}
      data-tick-h={tickH.toFixed(6)}
      data-pouring={pour.current.live ? "1" : "0"}
      data-draw-shares={eased.shares.toFixed(4)}
      data-draw-cash={eased.cash.toFixed(4)}
      style={{ display: "block", overflow: "hidden", background }}
    >
      <defs>
        <clipPath id="meter-clip">
          <rect x={0} y={0} width={width} height={floorY} />
        </clipPath>
      </defs>
      <g clipPath="url(#meter-clip)">
        {column("slab", 0, shareW, floorY, eased.shares, slabH, SLAB)}
        {column("tick", shareW + gap, cashW, floorY, eased.cash / UNIT, tickH, TICK)}
      </g>
      <rect x={0} y={floorY + 1} width={width} height={1} fill={FLOOR} />
    </svg>
  );
}

// Where the pour has got to: an ease out from the state the trade left toward
// the state it arrived at. Linear in dollars either way, so the two columns
// hand the same height to each other and the total never flickers.
function pourAt(
  from: { shares: number; cash: number; at: number; live: boolean },
  to: { shares: number; cash: number },
  now: number,
): { shares: number; cash: number; done: boolean } {
  if (!from.live) return { shares: to.shares, cash: to.cash, done: true };
  const p = Math.min(1, Math.max(0, (now - from.at) / POUR_MS));
  const e = 1 - Math.pow(1 - p, 3);
  return {
    shares: from.shares + (to.shares - from.shares) * e,
    cash: from.cash + (to.cash - from.cash) * e,
    done: p >= 1,
  };
}
