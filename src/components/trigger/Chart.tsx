// The tape chart: one line, a fixed time window, a y axis that only ever
// widens, and year labels at every viewport. Written to be shared: Trigger
// draws its single stock with it and The Floor can draw any monthly series
// with it, so nothing game specific lives in here. Every input is a prop and
// the only state it keeps is the axis range, which is a property of the axis
// and not of either game.
//
// Contract: docs/trigger-spec.md sections 2 and 7, docs/tape-shared.md.
// Charts without time labels are banned in this repo, so the year row is not
// optional and does not thin out below two labels.

import { useRef } from "react";
import { UI_FONT } from "../../lib/type";

export interface ChartTrade {
  at: number;                 // fractional month position inside the series
  price: number;
  side: "buy" | "sell";
}

export interface ChartSpan {
  from: number;               // fractional month position
  to: number;
  kind: "in" | "out";
}

export interface ChartProps {
  series: number[];           // monthly closes for the whole window
  months: string[];           // "YYYY-MM", same length as series
  t: number;                  // draw the line up to this fractional month
  livePrice?: number;         // price at t, interpolated by the caller
  width: number;
  height: number;
  trades?: ChartTrade[];
  spans?: ChartSpan[];        // tinted background bands, for the end card
  chip?: boolean;             // live price chip at the line's right end
  lineColor?: string;
  background?: string;
  textColor?: string;
  gridColor?: string;
}

const LINE = "#D7DEE8";
const MUTED = "#8794A6";
const UP = "#4ADE80";
const DOWN = "#E5484D";

const PAD_T = 14;
const PAD_X = 10;
const AXIS_H = 24;
const LABEL_PX = 12;

// The narrowest the y window is ever allowed to be, as a fraction of the price
// it is centred on. The axis only ever widens from here.
export const MIN_SPAN = 0.4;

function monthYear(m: string): string {
  return m.slice(0, 4);
}

// Year ticks that never crowd: every January, thinned until the labels sit at
// least 46px apart, and never thinned below the first and last year.
function yearTicks(months: string[], plotW: number): number[] {
  const janus: number[] = [];
  for (let i = 0; i < months.length; i++) {
    if (months[i].endsWith("-01")) janus.push(i);
  }
  if (janus.length === 0) janus.push(0);
  if (janus[0] > 0 && janus[0] > months.length * 0.12) janus.unshift(0);
  const n = Math.max(1, months.length - 1);
  const gap = plotW / n;
  let step = 1;
  while (step < janus.length && gap * (janus[Math.min(step, janus.length - 1)] - janus[0]) < 46) {
    step += 1;
  }
  const out: number[] = [];
  for (let i = 0; i < janus.length; i += step) out.push(janus[i]);
  if (out.length < 2 && janus.length > 1) return [janus[0], janus[janus.length - 1]];
  return out;
}

export default function Chart({
  series, months, t, livePrice, width, height,
  trades = [], spans = [], chip = true,
  lineColor = LINE, background = "transparent", textColor = MUTED,
  gridColor = "rgba(215,222,232,0.12)",
}: ChartProps) {
  // The axis widens and never narrows. Reset when a new series arrives, which
  // is a new run, not a new frame.
  const axis = useRef<{ key: number[] | null; lo: number; hi: number }>({ key: null, lo: 0, hi: 1 });

  if (width < 40 || height < 40 || series.length < 2) {
    return <svg width={Math.max(0, width)} height={Math.max(0, height)} />;
  }

  const last = series.length - 1;
  const tt = t < 0 ? 0 : t > last ? last : t;
  const shown = Math.floor(tt);
  const live = livePrice === undefined ? series[shown] : livePrice;

  let lo = live;
  let hi = live;
  for (let i = 0; i <= shown; i++) {
    if (series[i] < lo) lo = series[i];
    if (series[i] > hi) hi = series[i];
  }
  // A run opens on a single price, which is no range at all, so the axis is
  // given a minimum window to sit in. That window has to be wide, because a
  // narrow one turns the first seconds into a lie: at a tenth of the price a
  // two percent move filled the frame and read as a cliff. At MIN_SPAN a move
  // has to be twenty percent before it reaches the top of the opening window,
  // which is the smallest setting where an ordinary early wobble still reads
  // as a wobble.
  //
  // Widening here, before the axis remembers the range, is what keeps the
  // axis monotonic: widen it afterwards and the first frame would report a
  // tall axis that the second frame shrinks.
  const span = Math.max(1e-9, Math.abs((lo + hi) / 2) * MIN_SPAN);
  if (hi - lo < span) {
    const mid = (lo + hi) / 2;
    lo = mid - span / 2;
    hi = mid + span / 2;
  }
  if (axis.current.key !== series) {
    axis.current = { key: series, lo, hi };
  } else {
    if (lo < axis.current.lo) axis.current.lo = lo;
    if (hi > axis.current.hi) axis.current.hi = hi;
  }
  let alo = axis.current.lo;
  let ahi = axis.current.hi;
  if (ahi - alo < 1e-9) ahi = alo + 1;
  const padY = (ahi - alo) * 0.08;
  alo -= padY;
  ahi += padY;

  const plotW = width - PAD_X * 2;
  const plotH = height - PAD_T - AXIS_H;
  const x = (i: number) => PAD_X + (i / last) * plotW;
  const y = (v: number) => PAD_T + plotH - ((v - alo) / (ahi - alo)) * plotH;

  const pts: string[] = [];
  for (let i = 0; i <= shown; i++) {
    pts.push(`${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(series[i]).toFixed(1)}`);
  }
  if (tt > shown) pts.push(`L${x(tt).toFixed(1)} ${y(live).toFixed(1)}`);
  const path = pts.join(" ");

  const ticks = yearTicks(months, plotW);
  const endX = x(tt);
  const endY = y(live);

  const priceText = live >= 1000
    ? `$${Math.round(live).toLocaleString("en-US")}`
    : `$${live.toFixed(2)}`;
  const chipW = 14 + priceText.length * 7.6;
  const chipH = 22;
  const chipX = Math.min(width - PAD_X - chipW, endX + 9);
  const chipY = Math.min(PAD_T + plotH - chipH, Math.max(PAD_T, endY - chipH / 2));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      data-chart="tape"
      data-ymin={alo.toFixed(4)}
      data-ymax={ahi.toFixed(4)}
      style={{ display: "block", background, fontFamily: UI_FONT, overflow: "visible" }}
    >
      {spans.map((s, i) => {
        const x0 = x(Math.max(0, Math.min(last, s.from)));
        const x1 = x(Math.max(0, Math.min(last, s.to)));
        if (x1 - x0 < 0.4) return null;
        return (
          <rect
            key={`span${i}`}
            x={x0} y={PAD_T} width={x1 - x0} height={plotH}
            fill={s.kind === "in" ? "rgba(74,222,128,0.16)" : "rgba(135,148,166,0.24)"}
          />
        );
      })}

      <line
        x1={PAD_X} x2={width - PAD_X}
        y1={PAD_T + plotH} y2={PAD_T + plotH}
        stroke={gridColor} strokeWidth={1}
      />
      {ticks.map((i) => (
        <g key={`yr${i}`}>
          <line
            x1={x(i)} x2={x(i)} y1={PAD_T} y2={PAD_T + plotH}
            stroke={gridColor} strokeWidth={1}
          />
          <text
            x={x(i)} y={PAD_T + plotH + 16}
            fill={textColor} fontSize={LABEL_PX} fontFamily={UI_FONT}
            textAnchor={i === 0 ? "start" : i >= last - 2 ? "end" : "middle"}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {monthYear(months[i])}
          </text>
        </g>
      ))}

      <path d={path} fill="none" stroke={lineColor} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />

      {trades.map((tr, i) => (
        <circle
          key={`tr${i}`}
          cx={x(Math.max(0, Math.min(last, tr.at)))}
          cy={y(tr.price)}
          r={4.5}
          fill={tr.side === "buy" ? UP : DOWN}
          stroke="#0C0F14"
          strokeWidth={1.5}
        />
      ))}

      {chip && (
        <g data-chip="price">
          <circle cx={endX} cy={endY} r={3.5} fill={lineColor} />
          <rect x={chipX} y={chipY} width={chipW} height={chipH} rx={6}
            fill="#1F2733" stroke="rgba(215,222,232,0.22)" strokeWidth={1} />
          <text
            x={chipX + chipW / 2} y={chipY + 15}
            fill="#E8EDF4" fontSize={13} fontWeight={600} fontFamily={UI_FONT}
            textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {priceText}
          </text>
        </g>
      )}
    </svg>
  );
}
