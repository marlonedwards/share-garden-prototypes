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
// Two rules decide every number in here, and both came out of the craft pass:
//
//   the dial fits its box in both directions   the outer radius is half the
//   smaller side of whatever box the page hands in, so a wide short panel draws
//   a smaller board rather than a clipped one, at every desktop size.
//
//   a dart lands in a slot, not in a scatter   every dart on a wedge takes a
//   numbered place on one of up to three arcs inside that wedge, clear of the
//   name block and clear of the rim, with a hair of deterministic nudge on top.
//   Nothing here calls Math.random, so a re-render cannot move a dart that has
//   already landed and the same board always draws the same picture.
//
// Nothing here reads a clock or a price. The page hands it the board it wants
// drawn, and the same props always draw the same picture.

import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardProps } from "./props";
import { UI_FONT } from "../../lib/type";
import {
  EASE, GROUND, INK, MOVE_MS, MUTED, PANEL, SKY, SIZE, WEIGHT, reducedMotion, tint,
  art,
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

// The rail's width, section 5's "a rail along the right edge". The column is as
// wide as its longest legend row needs: a name and its opening price on one
// line, with room for the chip at the end. Level 3 deals names as long as
// "Johnson & Johnson", and a legend that wraps or drops half its prices is a
// list of fragments rather than a list.
export const RAIL_WIDTH = 276;
export const RAIL_PAD = 16;
const RAIL_ROW_H = 40;
const RAIL_ROW_MIN = 30;

// The pinned dart's tip is not the middle of its own image: it sits about a
// quarter across and four fifths down. Anchoring on the tip is what makes a
// dart look stuck in a wedge rather than laid on top of one.
const TIP_X = 0.25;
const TIP_Y = 0.82;

// Where a wedge writes its name, as a fraction of the dial's own radius, and
// how far out the darts' arcs sit. The name block is measured rather than
// assumed, so the arc that would run through it steps aside instead.
const LABEL_AT = 0.55;
const ARC_ONE = [0.74];
const ARC_TWO = [0.62, 0.80];
const ARC_THREE = [0.58, 0.71, 0.84];

interface Place { x: number; y: number }
interface Slot { a: number; rad: number }

// ------------------------------------------------------------ the nudge

// A dart's own hair of scatter, from its index alone. Two darts in one slot
// would sit exactly on each other; a hash of the index moves each one a
// fraction of a slot, the same fraction on every render.
function hash01(n: number): number {
  let h = (n + 1) * 2654435761;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return ((h >>> 0) % 100000) / 100000;
}

function nudge(i: number): { a: number; r: number; spin: number } {
  return {
    a: hash01(i * 3 + 1) * 2 - 1,
    r: hash01(i * 3 + 2) * 2 - 1,
    spin: (hash01(i * 3 + 3) * 2 - 1) * 13,
  };
}

// ------------------------------------------------------------- the words

// A name that will not fit on one line breaks at its widest space rather than
// shrinking under the 12px floor. Two lines is the limit; a single long word
// simply runs, because a truncated company name is worse than a wide one.
function textWidth(s: string, size: number): number {
  return s.length * size * 0.55;
}

function fitLines(name: string, maxPx: number, size: number): string[] {
  if (textWidth(name, size) <= maxPx) return [name];
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

// Every figure the board carries is the price at the window's open, never the
// price now: the trade row already reads "Apple now $30.12" while the tape
// runs, and a bare figure beside it was read as a second live price. The word
// is the whole of the difference, so it is written here once.
function openPriceText(p: number): string {
  const t = priceText(p);
  return t === "" ? "" : `open ${t}`;
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

// Where the darts on one wedge sit, and the whole of the tidiness. Up to three
// arcs inside the wedge, the darts dealt round the arcs by their own index and
// spaced evenly along each one, every arc inset from both seams and from the
// rim by the width of a dart. An arc that would run through the wedge's name
// block opens a gap in the middle for it, and any dart still landing on the
// block is walked along its arc until it is clear of it, so a troop that all
// threw at one stock never covers the name of the stock they threw at.
//
// The nudge is applied before the clearance rather than after it, which is the
// reason a dart can be scattered and guaranteed at the same time.
function wedgeSlots(
  m: number, mid: number, half: number, r: number, px: number,
  labelHalfW: number, labelHalfH: number,
  jit: (k: number) => { a: number; r: number },
): Slot[] {
  const out: Slot[] = new Array(m);
  if (m <= 0) return out;
  const arcs = m <= 4 ? ARC_ONE : m <= 10 ? ARC_TWO : ARC_THREE;
  // a dart is a picture that hangs off its own tip, so the clearance it needs
  // from a seam, from the rim and from a name is the picture, not the point
  const reach = px * 0.85;
  const lx = Math.cos(mid) * r * LABEL_AT;
  const ly = Math.sin(mid) * r * LABEL_AT;
  const onLabel = (a: number, rad: number): boolean => {
    if (labelHalfW <= 0) return false;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    // the dart's own box, hanging up and to the right of its tip, with a
    // margin for the spin
    const left = x - px * 0.42;
    const right = x + px * 0.92;
    const top = y - px * 0.98;
    const bottom = y + px * 0.34;
    return right > lx - labelHalfW && left < lx + labelHalfW
      && bottom > ly - labelHalfH && top < ly + labelHalfH;
  };
  for (let row = 0; row < arcs.length; row += 1) {
    const idx: number[] = [];
    for (let k = row; k < m; k += arcs.length) idx.push(k);
    const cnt = idx.length;
    if (cnt === 0) continue;
    const base = Math.min(r * arcs[row], r - reach);
    const pad = Math.min(half * 0.55, Math.asin(Math.min(1, reach / base)) + 0.03);
    const usable = Math.max(half * 0.12, half - pad);
    const straddle = base < r * LABEL_AT + labelHalfH + reach;
    const minOff = straddle
      ? Math.min(usable * 0.66, (labelHalfW + reach) / base)
      : 0;
    let step = 0;
    if (straddle) {
      const pairs = Math.ceil(cnt / 2);
      step = pairs > 1 ? (usable - minOff) / (pairs - 1) : 0;
    } else {
      const span = (cnt - 1) / 2;
      step = span > 0 ? usable / span : 0;
    }
    idx.forEach((k, i) => {
      let off: number;
      if (straddle) {
        const pair = Math.floor(i / 2);
        off = (i % 2 === 0 ? -1 : 1) * (minOff + pair * step);
      } else {
        off = (i - (cnt - 1) / 2) * step;
      }
      const j = jit(k);
      off += j.a * (step === 0 ? usable * 0.5 : step) * 0.16;
      off = Math.max(-usable, Math.min(usable, off));
      let rad = Math.min(r - reach, base + j.r * r * 0.012);
      if (labelHalfW > 0) {
        const dir = off < 0 ? -1 : 1;
        let guard = 0;
        while (guard < 80 && onLabel(mid + off, rad)) {
          off += dir * 0.015;
          guard += 1;
          if (Math.abs(off) > usable) { off = dir * usable; break; }
        }
        // a wedge too narrow to walk clear of its own name along one arc tries
        // the other arcs at the two ends of the wedge, which is what a ten
        // wedge board needs and a three wedge board never reaches
        if (onLabel(mid + off, rad)) {
          const dirs = [off, dir * usable, -dir * usable];
          const rads = [r - reach, r * 0.87, r * 0.79, r * 0.70, r * 0.60, r * 0.48]
            .map((v) => Math.min(r - reach, Math.max(px * 0.9, v)));
          let done = false;
          for (const cand of rads) {
            for (const d of dirs) {
              if (!onLabel(mid + d, cand)) { off = d; rad = cand; done = true; break; }
            }
            if (done) break;
          }
        }
      }
      out[k] = { a: mid + off, rad };
    });
  }
  return out;
}

interface Layout {
  // the dial: the wedges reach r, the rim ring runs from r out to outer
  cx: number; cy: number; r: number; outer: number;
  // a wedge's own number, and whether this board is wide enough to want one
  numAt: number; showNum: boolean;
  // where a wedge's name block sits, how wide it may be, and the box it takes,
  // which is what the darts step around
  label: Place[];
  labelWidth: number;
  labelSize: number;
  labelHalfW: number[];
  labelHalfH: number[];
  // the legend row a wedge owns in rail form, null in open form
  row: { x: number; y: number; w: number; h: number }[] | null;
  // calendar cells
  cell: Place[];
  cellW: number; cellH: number;
  titleX: number; titleY: number;
  dartPx: number;
}

function labelBoxes(
  n: number, r: number, cx: number, cy: number,
  names: string[], openPrices: number[], size: number, width: number,
): { label: Place[]; halfW: number[]; halfH: number[] } {
  const label: Place[] = [];
  const halfW: number[] = [];
  const halfH: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = midAngle(i, n);
    const at = n === 1 ? 0 : LABEL_AT;
    label.push({ x: cx + Math.cos(a) * r * at, y: cy + Math.sin(a) * r * at });
    const lines = fitLines(names[i] ?? "", width, size);
    const wide = Math.max(
      ...lines.map((l) => textWidth(l, size)),
      textWidth(openPriceText(openPrices[i] ?? 0), 13),
    );
    // the block is the name's lines and the open price under them, centred on
    // the label point
    const tall = lines.length * (size + 4) + 20;
    halfW.push(wide / 2 + 7);
    halfH.push(tall / 2 + 4);
  }
  return { label, halfW, halfH };
}

function boardLayout(
  n: number, form: "open" | "rail", w: number, h: number,
  names: string[], openPrices: number[],
): Layout {
  if (form === "open") {
    // The dial takes the middle of whatever box it is given and fits it in both
    // directions, which is the whole of the fix: it used to size off width and
    // hang its bottom under the trade row.
    const outer = Math.max(70, Math.floor(Math.min(w, h) / 2) - 2);
    const ring = Math.max(7, Math.round(outer * 0.05));
    const r = outer - ring;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);
    const labelSize = n > 6 || r < 170 ? 14 : SIZE.body;
    const chord = n <= 1 ? r * 1.5 : 2 * r * LABEL_AT * Math.sin(Math.PI / n);
    const labelWidth = Math.max(64, Math.min(chord - 14, r * 1.05));
    const boxes = labelBoxes(n, r, cx, cy, names, openPrices, labelSize, labelWidth);
    return {
      cx, cy, r, outer,
      numAt: r - Math.max(11, r * 0.06),
      // three wedges do not need numbering: the name is the label and the
      // number was chrome floating on an outer ring built for ten
      showNum: n >= 4,
      label: boxes.label,
      labelWidth,
      labelSize,
      labelHalfW: boxes.halfW,
      labelHalfH: boxes.halfH,
      row: null,
      cell: [], cellW: 0, cellH: 0, titleX: 0, titleY: 0,
      dartPx: Math.max(19, Math.min(34, r * 0.10)),
    };
  }
  // The rail: the dial at the top of the column and the names under it as a
  // list, because a tenth of a small dial is thirty pixels of arc and the type
  // contract has a floor of twelve. The two are solved together rather than one
  // after the other: the list takes the rows it needs at a legible height, the
  // dial takes what is left, and a nine wedge board in a 720 tall window ends
  // up with a small dial and nine readable rows instead of nine rows running
  // off the bottom of the column.
  const inner = w - RAIL_PAD * 2;
  const head = RAIL_PAD * 2 + 18;
  let outer = Math.max(46, Math.floor(inner / 2));
  let rowH = Math.max(RAIL_ROW_MIN, Math.min(RAIL_ROW_H, (h - head - outer * 2) / Math.max(1, n)));
  if (rowH * n > h - head - outer * 2) {
    outer = Math.max(46, Math.floor((h - head - RAIL_ROW_MIN * n) / 2));
    rowH = Math.max(20, Math.min(RAIL_ROW_H, (h - head - outer * 2) / Math.max(1, n)));
  }
  const ring = Math.max(5, Math.round(outer * 0.06));
  const r = outer - ring;
  const cx = Math.round(w / 2);
  const cy = RAIL_PAD + outer;
  const top = Math.round(cy + outer + 18);
  const label: Place[] = [];
  const row: Layout["row"] = [];
  for (let i = 0; i < n; i += 1) {
    const y = top + i * rowH;
    // the pill bleeds eight pixels to either side of the text, so the row's
    // words start on the dial's own left edge
    row.push({ x: RAIL_PAD - 8, y, w: w - (RAIL_PAD - 8) * 2, h: rowH - 2 });
    label.push({ x: RAIL_PAD, y: y + (rowH - 2) / 2 });
  }
  return {
    cx, cy, r, outer,
    numAt: r * 0.9, showNum: false,
    label, labelWidth: w - RAIL_PAD * 2 - 44, labelSize: 14,
    labelHalfW: [], labelHalfH: [],
    row,
    cell: [], cellW: 0, cellH: 0, titleX: 0, titleY: 0,
    dartPx: Math.max(8, Math.min(14, r * 0.11)),
  };
}

function calendarLayout(months: number, form: "open" | "rail", w: number, h: number): Layout {
  const base: Layout = {
    cx: 0, cy: 0, r: 0, outer: 0, numAt: 0, showNum: false,
    label: [], labelWidth: 0, labelSize: SIZE.body, labelHalfW: [], labelHalfH: [],
    row: null, cell: [], cellW: 0, cellH: 0, titleX: 0, titleY: 0, dartPx: 24,
  };
  if (form === "open") {
    const gap = 5;
    const cellW = Math.max(1, (w - gap * (months - 1)) / months);
    // The stock's name is pinned to the top of the box rather than floated over
    // the strip: the guide's bubble hangs off the troop into the top of this
    // panel, and a title in the middle of that band was read through it.
    const head = 118;
    const cellH = Math.max(110, Math.min(240, Math.min(h * 0.55, h - head - 8)));
    const top = Math.round(head + (h - head - cellH) * 0.44);
    for (let i = 0; i < months; i += 1) {
      base.cell.push({ x: i * (cellW + gap), y: top });
    }
    return {
      ...base, cellW, cellH,
      titleX: Math.round(w / 2), titleY: 84,
      dartPx: Math.max(14, Math.min(30, cellW * 0.78)),
    };
  }
  const gap = 3;
  const top = 58;
  const cellW = w - RAIL_PAD * 2;
  const cellH = Math.max(14, (h - top - RAIL_PAD - gap * (months - 1)) / months);
  for (let i = 0; i < months; i += 1) {
    base.cell.push({ x: RAIL_PAD, y: top + i * (cellH + gap) });
  }
  return { ...base, cellW, cellH, titleX: RAIL_PAD, titleY: 30, dartPx: 12 };
}

// The rail's darts are packed rather than scattered: on level 1 a month is a
// row, so its darts line up along the right of the row and the count on a month
// reads at a glance.
function railRow(k: number, m: number, cell: Place, cellW: number, cellH: number): Place {
  const right = cell.x + cellW - 9;
  const left = Math.max(cell.x + 34, right - (m - 1) * 13);
  return {
    x: m <= 1 ? right : left + (k * (right - left)) / (m - 1),
    y: cell.y + cellH / 2,
  };
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
  const [landed, setLanded] = useState(() => (thrown && (instant || still) ? total : 0));
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
      : boardLayout(n, form, width, height, names, openPrices)),
    [mode, months, form, width, height, n, names, openPrices],
  );

  const deadSet = useMemo(() => new Set(dead), [dead]);
  const focusIndex = focus === null ? -1 : tickers.indexOf(focus);

  // Where every dart's tip lands, in board coordinates, for this form. Computed
  // for both forms from the same slots, so a form change moves a dart along a
  // path and never re-rolls it.
  const dartAt = useMemo(() => {
    const perTarget = new Map<number, number[]>();
    darts.forEach((d, i) => {
      const list = perTarget.get(d.at);
      if (list) list.push(i); else perTarget.set(d.at, [i]);
    });
    const out: { x: number; y: number; spin: number }[] = new Array(darts.length);
    perTarget.forEach((list, target) => {
      if (mode === "calendar") {
        const at = Math.max(0, Math.min(months - 1, target));
        const c = layout.cell[at] ?? { x: 0, y: 0 };
        list.forEach((i, k) => {
          const j = nudge(i);
          if (form === "rail") {
            const p = railRow(k, list.length, c, layout.cellW, layout.cellH);
            out[i] = { x: p.x, y: p.y, spin: j.spin * 0.3 };
            return;
          }
          // the darts on a month stack up from the floor of its cell, so a
          // month three monkeys picked is visibly three deep and the strip
          // reads as a count without carrying a single number
          const step = layout.dartPx * 0.78;
          const floorY = layout.cellH - 34;
          const y = Math.max(layout.dartPx * 0.9, floorY - k * step);
          out[i] = {
            x: c.x + layout.cellW / 2 + j.a * layout.cellW * 0.06,
            y: c.y + y,
            spin: j.spin * 0.5,
          };
        });
        return;
      }
      const at = Math.max(0, Math.min(Math.max(0, n - 1), target));
      const half = n <= 1 ? Math.PI : Math.PI / n;
      const mid = midAngle(at, n);
      const slots = wedgeSlots(
        list.length, mid, half, layout.r, layout.dartPx,
        form === "rail" ? 0 : layout.labelHalfW[at] ?? 0,
        form === "rail" ? 0 : layout.labelHalfH[at] ?? 0,
        (k) => nudge(list[k]),
      );
      list.forEach((i, k) => {
        const s = slots[k] ?? { a: mid, rad: layout.r * 0.74 };
        out[i] = {
          x: layout.cx + Math.cos(s.a) * s.rad,
          y: layout.cy + Math.sin(s.a) * s.rad,
          spin: form === "rail" ? nudge(i).spin * 0.3 : nudge(i).spin,
        };
      });
    });
    return out;
  }, [darts, mode, months, n, form, layout]);

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
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes monkey-dart-land {
          0%   { transform: translate(0, -26px) scale(1.35, 0.72); opacity: 0 }
          55%  { transform: translate(0, 3px) scale(0.86, 1.16); opacity: 1 }
          100% { transform: translate(0, 0) scale(1, 1); opacity: 1 }
        }
        /* a wedge is a button and has to look like one before it is pressed:
           the pointer, a small pull out of the dial, and a stronger fill */
        .mk-pick { cursor: pointer }
        .mk-lift { transition: transform 170ms ${EASE} }
        .mk-lift:hover { transform: translate(var(--mk-lx), var(--mk-ly)) }
        .mk-pick:hover .mk-face { fill: var(--mk-hover) }
      `}</style>

      {/* the rim: the ring of board the wedges are set into, so the dial reads
          as a thing on the panel rather than as a pie chart of it */}
      {mode === "board" && (
        <circle
          data-dial-rim
          cx={layout.cx}
          cy={layout.cy}
          r={layout.outer}
          fill={tint(SKY, 0.46)}
          style={{ transition: still ? "none" : `all ${MOVE_MS}ms ${EASE}` }}
        />
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
            style={{ fontSize: form === "open" ? 20 : 15, fontWeight: WEIGHT.heading }}
          >
            {names[0] ?? ""}
          </text>
          <text
            x={layout.titleX + (form === "open" ? 0 : 0)}
            y={layout.titleY + (form === "open" ? 22 : 18)}
            textAnchor={form === "open" ? "middle" : "start"}
            fill={MUTED}
            style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}
          >
            {openPriceText(openPrices[0] ?? 0)}
          </text>
          {/* the player's chip on the calendar sits beside the stock name,
              because a month is not a holding and a chip on one would say the
              player bought that month */}
          <Chip
            shares={chips[tickers[0]] ?? 0}
            x={form === "open"
              ? layout.titleX + textWidth(names[0] ?? "", 20) / 2 + 28
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
        const p = layout.label[i] ?? { x: 0, y: 0 };
        const row = layout.row?.[i];
        // two tones, far enough apart to count the wedges by; an odd board
        // gets a third so no two neighbours share a tone
        const tones = n % 2 === 0 ? [0.12, 0.30] : [0.12, 0.30, 0.21];
        return (
          <g
            key={t}
            data-wedge={t}
            data-wedge-focus={focused ? "1" : "0"}
            data-wedge-dead={gone ? "1" : "0"}
            className={form === "open" && !still ? "mk-pick mk-lift" : "mk-pick"}
            onClick={() => onFocus(t)}
            style={{
              cursor: "pointer",
              ["--mk-lx" as string]: `${(Math.cos(midAngle(i, n)) * 8).toFixed(2)}px`,
              ["--mk-ly" as string]: `${(Math.sin(midAngle(i, n)) * 8).toFixed(2)}px`,
              ["--mk-hover" as string]: gone ? "#E0DACE" : tint(SKY, focused ? 0.66 : 0.36),
            }}
          >
            <path
              className="mk-face"
              d={sectorPath(i, n)}
              fill={gone ? "#E6E1D7" : focused ? tint(SKY, 0.62) : tint(SKY, tones[i % tones.length])}
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

            {/* the wedge's own number, inside the rim where the eye already is */}
            {layout.showNum && (
              <text
                x={layout.cx + Math.cos(midAngle(i, n)) * layout.numAt}
                y={layout.cy + Math.sin(midAngle(i, n)) * layout.numAt + 4}
                textAnchor="middle"
                fill={gone ? MUTED : INK}
                style={{
                  fontSize: 13,
                  fontWeight: WEIGHT.emphasis,
                  opacity: 0.55,
                  transition: move,
                  pointerEvents: "none",
                }}
              >
                {String(i + 1)}
              </text>
            )}

            {row ? (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={row.x} y={row.y} width={row.w} height={row.h} rx={10}
                  fill={focused ? tint(SKY, 0.30) : "transparent"}
                  style={{ transition: move }}
                />
                {/* the focused row carries a solid bar of the focus colour, so
                    the rail says which stock the trade buttons are aimed at */}
                <rect
                  x={row.x + 2} y={row.y + 5} width={4} height={Math.max(0, row.h - 10)} rx={2}
                  fill={focused ? SKY : "transparent"}
                />
                <RailRow
                  name={names[i] ?? t}
                  price={gone ? "zero" : openPriceText(openPrices[i] ?? 0)}
                  x={p.x}
                  y={p.y}
                  right={row.x + row.w - 44}
                  focused={focused}
                  gone={gone}
                />
              </g>
            ) : (
              <g
                style={{
                  transform: `translate(${p.x}px, ${p.y}px)`,
                  transition: move,
                  pointerEvents: "none",
                }}
              >
                {fitLines(names[i] ?? t, layout.labelWidth, layout.labelSize).map((line, k, all) => (
                  <text
                    key={k}
                    x={0}
                    y={(k - (all.length - 1) / 2) * (layout.labelSize + 4) - 6}
                    textAnchor="middle"
                    fill={gone ? MUTED : INK}
                    style={{
                      fontSize: layout.labelSize,
                      fontWeight: focused ? WEIGHT.heading : WEIGHT.emphasis,
                    }}
                  >
                    {line}
                  </text>
                ))}
                <text
                  x={0}
                  y={((fitLines(names[i] ?? t, layout.labelWidth, layout.labelSize).length - 1) / 2)
                    * (layout.labelSize + 4) + 14}
                  textAnchor="middle"
                  fill={MUTED}
                  style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}
                >
                  {gone ? "zero" : openPriceText(openPrices[i] ?? 0)}
                </text>
              </g>
            )}

            <Chip
              shares={chips[t] ?? 0}
              x={form === "open"
                ? layout.cx + Math.cos(midAngle(i, n)) * layout.r * (n > 1 ? 0.33 : 0.55)
                : (row ? row.x + row.w - 20 : 0)}
              y={form === "open"
                ? layout.cy + Math.sin(midAngle(i, n)) * layout.r * (n > 1 ? 0.33 : 0.55)
                : (row ? row.y + row.h / 2 : 0)}
              max={form === "rail" ? 15 : 24}
              move={move}
            />
          </g>
        );
      })}

      {/* the hub, drawn over the seams so the middle of the board is a middle
          and not a place where three wedges meet in a point */}
      {mode === "board" && n > 1 && (
        <circle
          cx={layout.cx}
          cy={layout.cy}
          r={Math.max(8, layout.r * 0.15)}
          fill={GROUND}
          style={{ transition: still ? "none" : `all ${MOVE_MS}ms ${EASE}`, pointerEvents: "none" }}
        />
      )}

      {/* the focused wedge's own outline. One element for the whole board,
          drawn after the wedges so a neighbour's fill cannot cover half of it,
          and never unmounted: an unfocused board draws it in no colour. */}
      {mode === "board" && (
        <path
          data-focus-ring
          d={sectorPath(Math.max(0, focusIndex), n)}
          fill="none"
          stroke={focusIndex >= 0 ? SKY : "transparent"}
          strokeWidth={(form === "rail" ? 4 : 5) / Math.max(1, layout.r)}
          strokeLinejoin="round"
          style={{
            transform: `translate(${layout.cx}px, ${layout.cy}px) scale(${layout.r})`,
            transition: move,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ------------------------------------------------- the calendar's cells */}
      {mode === "calendar" && layout.cell.map((c, i) => (
        <g
          key={i}
          data-month={i}
          className="mk-pick"
          onClick={() => tickers[0] && onFocus(tickers[0])}
          style={{
            cursor: "pointer",
            ["--mk-hover" as string]: tint(SKY, 0.30),
          }}
        >
          <rect
            className="mk-face"
            x={c.x}
            y={c.y}
            width={layout.cellW}
            height={layout.cellH}
            rx={form === "open" ? 8 : 6}
            fill={tint(SKY, i % 2 === 0 ? 0.16 : 0.10)}
            style={{ transition: still ? "none" : `x ${MOVE_MS}ms ${EASE}, y ${MOVE_MS}ms ${EASE}` }}
          />
          <text
            x={form === "open" ? c.x + layout.cellW / 2 : c.x + 10}
            y={c.y + (form === "open" ? layout.cellH - 10 : layout.cellH / 2 + 4)}
            textAnchor={form === "open" ? "middle" : "start"}
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
          const at = dartAt[i] ?? { x: 0, y: 0, spin: 0 };
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
                  href={art("dart-pinned.png")}
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

// One row of the rail's legend: the name and, on the same line when the column
// has the room for it, the price the window opened at. The row is a list row
// and not a caption, so its text sits on the middle of its own pill.
function RailRow({ name, price, x, y, right, focused, gone }: {
  name: string; price: string; x: number; y: number; right: number;
  focused: boolean; gone: boolean;
}) {
  const size = 14;
  // One line, always. The opening price is a column and not a suffix, so it
  // ends where every other row's ends and three rows read as a list; a row too
  // narrow for both drops the price rather than wrapping, because a wrapped
  // row cannot hold its height and a ten row legend has no height to give.
  const room = right - x - 14;
  const fits = textWidth(name, size) + textWidth(price, 13) <= room;
  return (
    <g>
      <text
        x={x} y={y + 5} fill={gone ? MUTED : INK}
        style={{ fontSize: size, fontWeight: focused ? WEIGHT.heading : WEIGHT.emphasis }}
      >
        {name}
      </text>
      {fits && (
        <text
          x={right} y={y + 5} textAnchor="end" fill={MUTED}
          style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}
        >
          {price}
        </text>
      )}
    </g>
  );
}

// The player's chip: one sky circle, sized by how many shares are in it, with
// the count inside in tabular digits. It is never a monkey's colour and never a
// dart, because the one thing on this board that is not random is you.
function Chip({ shares, x, y, move, max = 24 }: {
  shares: number; x: number; y: number; move: string; max?: number;
}) {
  if (!(shares > 0)) return null;
  const r = Math.max(13, Math.min(max, 12 + Math.sqrt(shares) * 2.2));
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
