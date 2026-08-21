// The board: the round dial the troop throws at on levels 2 and 3, the calendar
// strip it throws at on level 1, and the rail both shrink into once the tape
// runs. Contract: docs/monkey-spec.md section 5, docs/monkey-handoff.md.
//
// One SVG, one element tree, two forms. Switching between `open` and `rail`
// never remounts anything: every wedge is a unit-radius sector path whose group
// carries translate and scale, every calendar cell and every dart is a group
// carrying a translate, and the form change is a transform change the browser
// tweens. That is what lets the board shrink into the rail while the darts stay
// pinned exactly where they landed and the tape never pauses.
//
// Nothing here reads a clock or a price. The page hands it the board it wants
// drawn, and the same props always draw the same picture: the dart jitter is a
// hash of the dart's own index, never Math.random, so a re-render cannot move a
// dart that has already landed.

import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardProps } from "./props";
import { UI_FONT } from "../../lib/type";
import {
  EASE, INK, MOVE_MS, MUTED, PANEL, SKY, SIZE, WEIGHT, reducedMotion, tint,
} from "../../lib/monkey/look";

// The throw beat is two seconds for the whole troop, whatever the troop is
// throwing. Ten darts land 180ms apart on level 1, but level 3's thirty darts
// at that spacing would run five and a half seconds and hold the round open,
// so the step is the two seconds divided by the darts, floored so the last
// levels do not machine gun and capped so the first one keeps its rhythm.
export const THROW_MS = 1900;
const STEP_MIN = 55;
const STEP_MAX = 190;
const LAND_MS = 260;

export function dartStepMs(total: number): number {
  if (total <= 1) return STEP_MAX;
  return Math.max(STEP_MIN, Math.min(STEP_MAX, THROW_MS / (total - 1)));
}

// The rail's width, section 5's "a rail along the right edge".
export const RAIL_WIDTH = 200;

// The pinned dart's tip is not the middle of its own image: it sits about a
// quarter across and four fifths down. Anchoring on the tip is what makes a
// dart look stuck in a wedge rather than laid on top of one.
const TIP_X = 0.25;
const TIP_Y = 0.82;

// ------------------------------------------------------------ the jitter

// A dart's scatter inside its target, from its own index alone. Two darts on
// one wedge have to sit apart, and they have to sit in the same place every
// time the board redraws, so the offset is a hash and never a random.
function hash01(n: number): number {
  let h = (n + 1) * 2654435761;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return ((h >>> 0) % 100000) / 100000;
}

function jitter(i: number): { a: number; b: number; spin: number } {
  return {
    a: hash01(i * 3 + 1) * 2 - 1,
    b: hash01(i * 3 + 2) * 2 - 1,
    spin: (hash01(i * 3 + 3) * 2 - 1) * 16,
  };
}

// ------------------------------------------------------------- the words

// A name that will not fit on one line breaks at its widest space rather than
// shrinking under the 12px floor. Two lines is the limit; a single long word
// simply runs, because a truncated company name is worse than a wide one.
function fitLines(name: string, maxPx: number, size: number): string[] {
  const per = size * 0.55;
  if (name.length * per <= maxPx) return [name];
  const words = name.split(" ");
  if (words.length < 2) return [name];
  let best = 1;
  let bestGap = Infinity;
  for (let k = 1; k < words.length; k += 1) {
    const left = words.slice(0, k).join(" ").length;
    const right = words.slice(k).join(" ").length;
    const gap = Math.abs(left - right);
    if (gap < bestGap) { bestGap = gap; best = k; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function priceText(p: number): string {
  if (!(p > 0)) return "";
  return p >= 100 ? `$${Math.round(p)}` : `$${p.toFixed(2)}`;
}

// ------------------------------------------------------------ the geometry

// A sector of the unit circle, starting at twelve o'clock, so the whole wedge
// is one constant path and the form change is a scale on its group.
function sectorPath(i: number, n: number): string {
  if (n <= 1) return "M 0 0 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0";
  const from = (i / n) * Math.PI * 2 - Math.PI / 2;
  const to = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
  const big = to - from > Math.PI ? 1 : 0;
  return [
    "M 0 0",
    `L ${Math.cos(from).toFixed(6)} ${Math.sin(from).toFixed(6)}`,
    `A 1 1 0 ${big} 1 ${Math.cos(to).toFixed(6)} ${Math.sin(to).toFixed(6)}`,
    "Z",
  ].join(" ");
}

function midAngle(i: number, n: number): number {
  if (n <= 1) return -Math.PI / 2;
  return ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
}

interface Place { x: number; y: number }

interface Layout {
  // the dial
  cx: number; cy: number; r: number;
  // where a wedge's label block sits, and how wide it may be
  label: Place[];
  labelWidth: number;
  labelAnchor: "middle" | "start";
  labelSize: number;
  // the legend row a wedge's tap target covers in rail form, null in open form
  row: { x: number; y: number; w: number; h: number }[] | null;
  // calendar cells
  cell: Place[];
  cellW: number; cellH: number;
  // the stock name block on the calendar
  titleX: number; titleY: number;
  dartPx: number;
}

function boardLayout(n: number, form: "open" | "rail", w: number, h: number): Layout {
  if (form === "open") {
    const r = Math.max(80, Math.min((h - 96) / 2, (w - 120) / 2));
    const cx = w / 2;
    const cy = 40 + r;
    const labelSize = n > 6 ? 14 : SIZE.body;
    const label: Place[] = [];
    for (let i = 0; i < n; i += 1) {
      const a = midAngle(i, n);
      const at = n === 1 ? 0 : 0.54;
      label.push({ x: cx + Math.cos(a) * r * at, y: cy + Math.sin(a) * r * at });
    }
    return {
      cx, cy, r, label,
      labelWidth: n === 1 ? r * 1.4 : Math.max(64, (2 * Math.PI * r * 0.54) / n - 10),
      labelAnchor: "middle",
      labelSize,
      row: null,
      cell: [], cellW: 0, cellH: 0, titleX: 0, titleY: 0,
      dartPx: 40,
    };
  }
  // The rail: the dial at the top using the full width, and the names moved out
  // of the wedges into a legend under it, because a tenth of a 180px dial is
  // thirty pixels of arc and the type contract has a floor of twelve.
  const r = Math.min(82, (w - 28) / 2);
  const cx = w / 2;
  // the darts stand proud of the rim, so the dial hangs low enough that a rail
  // with a clipping parent does not shave their flights off
  const cy = 22 + r;
  const rowH = Math.max(28, Math.min(38, (h - (cy + r + 20)) / Math.max(1, n)));
  const top = cy + r + 16;
  const label: Place[] = [];
  const row: Layout["row"] = [];
  for (let i = 0; i < n; i += 1) {
    const y = top + i * rowH;
    label.push({ x: 14, y: y + rowH / 2 });
    row.push({ x: 6, y, w: w - 12, h: rowH - 4 });
  }
  return {
    cx, cy, r, label, labelWidth: w - 76, labelAnchor: "start", labelSize: 13, row,
    cell: [], cellW: 0, cellH: 0, titleX: 0, titleY: 0,
    dartPx: 26,
  };
}

function calendarLayout(months: number, form: "open" | "rail", w: number, h: number): Layout {
  const base: Layout = {
    cx: 0, cy: 0, r: 0, label: [], labelWidth: 0, labelAnchor: "middle",
    labelSize: SIZE.body, row: null, cell: [], cellW: 0, cellH: 0,
    titleX: 0, titleY: 0, dartPx: form === "open" ? 40 : 26,
  };
  if (form === "open") {
    const pad = 24;
    const gap = 4;
    const cellW = Math.max(1, (w - pad * 2 - gap * (months - 1)) / months);
    const cellH = Math.max(56, Math.min(96, h - 150));
    const top = 96;
    for (let i = 0; i < months; i += 1) {
      base.cell.push({ x: pad + i * (cellW + gap), y: top });
    }
    return { ...base, cellW, cellH, titleX: w / 2, titleY: 48 };
  }
  const pad = 8;
  const gap = 3;
  const top = 64;
  const cellW = w - pad * 2;
  const cellH = Math.max(16, (h - top - 12 - gap * (months - 1)) / months);
  for (let i = 0; i < months; i += 1) {
    base.cell.push({ x: pad, y: top + i * (cellH + gap) });
  }
  return { ...base, cellW, cellH, titleX: pad, titleY: 30 };
}

// --------------------------------------------------------------- the board

export default function Board(props: BoardProps) {
  const {
    mode, form, tickers, names, openPrices, months, darts, thrown,
    onDartLanded, onThrowDone, chips, dead, focus, onFocus, width, height, instant,
  } = props;

  const n = mode === "calendar" ? 1 : tickers.length;
  const still = reducedMotion();

  // The throw beat. Darts land one by one; once they are down they are down,
  // and nothing about a later render can lift them again.
  const total = darts.length;
  const [landed, setLanded] = useState(() => (thrown && (instant || still) ? total : thrown ? 0 : 0));
  const wasThrown = useRef(thrown);
  const landedCb = useRef(onDartLanded);
  const doneCb = useRef(onThrowDone);
  landedCb.current = onDartLanded;
  doneCb.current = onThrowDone;

  useEffect(() => {
    if (!thrown) {
      setLanded(0);
      wasThrown.current = false;
      return;
    }
    if (wasThrown.current) return;
    wasThrown.current = true;
    if (instant || still || total === 0) {
      setLanded(total);
      for (let i = 0; i < total; i += 1) landedCb.current?.(i, total);
      doneCb.current?.();
      return;
    }
    const step = dartStepMs(total);
    const timers: number[] = [];
    for (let i = 0; i < total; i += 1) {
      timers.push(window.setTimeout(() => {
        setLanded(i + 1);
        landedCb.current?.(i, total);
      }, i * step));
    }
    timers.push(window.setTimeout(() => doneCb.current?.(), (total - 1) * step + LAND_MS));
    return () => { timers.forEach((t) => window.clearTimeout(t)); };
  }, [thrown, total, instant, still]);

  const layout = useMemo(
    () => (mode === "calendar"
      ? calendarLayout(months, form, width, height)
      : boardLayout(n, form, width, height)),
    [mode, months, form, width, height, n],
  );

  const deadSet = useMemo(() => new Set(dead), [dead]);

  // Where every dart's tip lands, in board coordinates, for this form. Computed
  // for both forms from the same jitter, so a form change moves a dart and
  // never re-rolls it.
  const dartAt = useMemo(() => darts.map((d, i) => {
    const j = jitter(i);
    if (mode === "calendar") {
      const at = Math.max(0, Math.min(months - 1, d.at));
      const c = layout.cell[at] ?? { x: 0, y: 0 };
      return {
        x: c.x + layout.cellW * (0.5 + j.a * 0.22),
        y: c.y + layout.cellH * (0.5 + j.b * 0.22),
        spin: j.spin,
      };
    }
    const at = Math.max(0, Math.min(Math.max(0, n - 1), d.at));
    const half = n <= 1 ? Math.PI : Math.PI / n;
    const a = midAngle(at, n) + j.a * half * 0.55;
    const rad = layout.r * (n <= 1 ? 0.42 + j.b * 0.28 : 0.80 + j.b * 0.13);
    return {
      x: layout.cx + Math.cos(a) * rad,
      y: layout.cy + Math.sin(a) * rad,
      spin: j.spin,
    };
  }), [darts, mode, months, n, layout]);

  const move = still ? "none" : `transform ${MOVE_MS}ms ${EASE}`;

  return (
    <svg
      data-board-form={form}
      data-board-mode={mode}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        display: "block",
        fontFamily: UI_FONT,
        transition: still ? "none" : `width ${MOVE_MS}ms ${EASE}, height ${MOVE_MS}ms ${EASE}`,
        overflow: "visible",
      }}
    >
      <style>{`
        @keyframes monkey-dart-land {
          0%   { transform: translate(0, -26px) scale(1.35, 0.72); opacity: 0 }
          55%  { transform: translate(0, 3px) scale(0.86, 1.16); opacity: 1 }
          100% { transform: translate(0, 0) scale(1, 1); opacity: 1 }
        }
      `}</style>

      {/* ------------------------------------------------- the dial or the strip */}
      {mode === "board" && (
        <g>
          <circle
            cx={layout.cx}
            cy={layout.cy}
            r={layout.r + 8}
            fill={PANEL}
            style={{ transition: still ? "none" : `all ${MOVE_MS}ms ${EASE}` }}
          />
        </g>
      )}

      {mode === "calendar" && (
        <g
          data-wedge={tickers[0] ?? ""}
          onClick={() => tickers[0] && onFocus(tickers[0])}
          style={{ cursor: "pointer" }}
        >
          <text
            x={layout.titleX}
            y={layout.titleY}
            textAnchor={form === "open" ? "middle" : "start"}
            fill={INK}
            style={{ fontSize: form === "open" ? 22 : 15, fontWeight: WEIGHT.heading }}
          >
            {names[0] ?? ""}
          </text>
          <text
            x={layout.titleX}
            y={layout.titleY + (form === "open" ? 24 : 18)}
            textAnchor={form === "open" ? "middle" : "start"}
            fill={MUTED}
            style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}
          >
            {priceText(openPrices[0] ?? 0)}
          </text>
          {/* the player's chip on the calendar sits beside the stock name,
              because a month is not a holding and a chip on one would say the
              player bought that month */}
          <Chip
            shares={chips[tickers[0]] ?? 0}
            x={form === "open"
              ? layout.titleX + (names[0] ?? "").length * 6 + 30
              : layout.titleX + 92}
            y={layout.titleY - 6}
            move={move}
          />
        </g>
      )}

      {/* --------------------------------------------------------- the wedges */}
      {mode === "board" && tickers.map((t, i) => {
        const focused = focus === t;
        const gone = deadSet.has(t);
        const lines = fitLines(names[i] ?? t, layout.labelWidth, layout.labelSize);
        const p = layout.label[i] ?? { x: 0, y: 0 };
        const row = layout.row?.[i];
        return (
          <g
            key={t}
            data-wedge={t}
            data-wedge-focus={focused ? "1" : "0"}
            data-wedge-dead={gone ? "1" : "0"}
            onClick={() => onFocus(t)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={sectorPath(i, n)}
              fill={gone ? "#E6E1D7" : focused ? tint(SKY, 0.34) : tint(SKY, 0.10 + (i % 3) * 0.045)}
              style={{
                transform: `translate(${layout.cx}px, ${layout.cy}px) scale(${layout.r})`,
                transition: move,
              }}
            />
            {/* the seam between wedges is a gap in the fill, never a hairline */}
            {n > 1 && (
              <path
                d={sectorPath(i, n)}
                fill="none"
                stroke={PANEL}
                strokeWidth={3 / Math.max(1, layout.r)}
                style={{
                  transform: `translate(${layout.cx}px, ${layout.cy}px) scale(${layout.r})`,
                  transition: move,
                }}
              />
            )}
            {/* the wedge's own number, so the dial and the rail's legend read as
                one thing */}
            <text
              x={layout.cx + Math.cos(midAngle(i, n)) * layout.r * (n > 1 ? 0.93 : 0)}
              y={layout.cy + Math.sin(midAngle(i, n)) * layout.r * (n > 1 ? 0.93 : 0) + 4}
              textAnchor="middle"
              fill={gone ? MUTED : INK}
              style={{ fontSize: 12, fontWeight: WEIGHT.emphasis, transition: move, pointerEvents: "none" }}
            >
              {n > 1 ? String(i + 1) : ""}
            </text>

            {row && (
              <rect
                x={row.x} y={row.y} width={row.w} height={row.h} rx={10}
                fill={focused ? tint(SKY, 0.20) : "transparent"}
                style={{ transition: move }}
              />
            )}

            <g
              style={{
                transform: `translate(${p.x}px, ${p.y}px)`,
                transition: move,
                pointerEvents: "none",
              }}
            >
              {lines.map((line, k) => (
                <text
                  key={k}
                  x={0}
                  y={(k - (lines.length - 1) / 2) * (layout.labelSize + 3) - (form === "rail" ? 5 : 6)}
                  textAnchor={layout.labelAnchor}
                  fill={gone ? MUTED : INK}
                  style={{ fontSize: layout.labelSize, fontWeight: WEIGHT.emphasis }}
                >
                  {line}
                </text>
              ))}
              <text
                x={0}
                y={(lines.length - 1) / 2 * (layout.labelSize + 3) + (form === "rail" ? 11 : 14)}
                textAnchor={layout.labelAnchor}
                fill={MUTED}
                style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}
              >
                {gone ? "zero" : priceText(openPrices[i] ?? 0)}
              </text>
              {/* the small mark a dead wedge carries; the words are the page's */}
              {gone && (
                <path
                  d="M -6 -6 L 6 6 M 6 -6 L -6 6"
                  stroke={MUTED}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  transform={`translate(${layout.labelAnchor === "start" ? layout.labelWidth + 10 : 0}, ${layout.labelAnchor === "start" ? 0 : -layout.labelSize - 14})`}
                />
              )}
            </g>

            <Chip
              shares={chips[t] ?? 0}
              x={form === "open"
                ? layout.cx + Math.cos(midAngle(i, n)) * layout.r * (n > 1 ? 0.24 : 0.55)
                : (row ? row.x + row.w - 26 : 0)}
              y={form === "open"
                ? layout.cy + Math.sin(midAngle(i, n)) * layout.r * (n > 1 ? 0.24 : 0.55)
                : (row ? row.y + row.h / 2 : 0)}
              move={move}
            />
          </g>
        );
      })}

      {/* ------------------------------------------------- the calendar's cells */}
      {mode === "calendar" && layout.cell.map((c, i) => (
        <g
          key={i}
          data-month={i}
          onClick={() => tickers[0] && onFocus(tickers[0])}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={c.x}
            y={c.y}
            width={layout.cellW}
            height={layout.cellH}
            rx={form === "open" ? 10 : 6}
            fill={tint(SKY, i % 2 === 0 ? 0.13 : 0.08)}
            style={{ transition: still ? "none" : `x ${MOVE_MS}ms ${EASE}, y ${MOVE_MS}ms ${EASE}` }}
          />
          <text
            x={c.x + layout.cellW / 2}
            y={c.y + (form === "open" ? layout.cellH - 10 : layout.cellH / 2 + 4)}
            textAnchor="middle"
            fill={MUTED}
            style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}
          >
            {i + 1}
          </text>
        </g>
      ))}

      {/* ---------------------------------------------------------- the darts */}
      <g data-darts>
        {darts.map((d, i) => {
          const at = dartAt[i];
          const down = i < landed;
          const px = layout.dartPx;
          return (
            <g
              key={`${d.monkey}-${i}`}
              data-dart-monkey={d.monkey}
              data-dart-at={d.at}
              style={{
                transform: `translate(${at.x}px, ${at.y}px)`,
                transition: move,
                opacity: down ? 1 : 0,
                pointerEvents: "none",
              }}
            >
              <g
                style={{
                  transformOrigin: "0px 0px",
                  animation: down && !still ? `monkey-dart-land ${LAND_MS}ms ${EASE} both` : undefined,
                }}
              >
                <image
                  href="/monkey/dart-pinned.png"
                  width={px}
                  height={px}
                  x={-px * TIP_X}
                  y={-px * TIP_Y}
                  transform={`rotate(${at.spin})`}
                  style={{ transition: still ? "none" : `width ${MOVE_MS}ms ${EASE}, height ${MOVE_MS}ms ${EASE}` }}
                />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// The player's chip: one sky circle, sized by how many shares are in it, with
// the count inside in tabular digits. It is never a monkey's colour and never a
// dart, because the one thing on this board that is not random is you.
function Chip({ shares, x, y, move }: { shares: number; x: number; y: number; move: string }) {
  if (!(shares > 0)) return null;
  const r = Math.max(13, Math.min(24, 12 + Math.sqrt(shares) * 2.2));
  return (
    <g
      data-chip={shares}
      style={{ transform: `translate(${x}px, ${y}px)`, transition: move, pointerEvents: "none" }}
    >
      <circle r={r} fill={SKY} />
      <text
        y={4}
        textAnchor="middle"
        fill="#FFFFFF"
        style={{ fontSize: 12, fontWeight: WEIGHT.heading, fontVariantNumeric: "tabular-nums" }}
      >
        {shares}
      </text>
    </g>
  );
}
