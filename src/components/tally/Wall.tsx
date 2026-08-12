// The wall, drawn as variant A draws it: a lit stage a few shades deeper than
// the board, a counting rule every five rows, dense brickwork for every month
// the chapter has already played, and a ruled schedule for the months it has
// not. The gold dashed line is the target, carrying its dollar figure from turn
// one, and the score rail on the left is what the wall stands at right now.
//
// Five rules do all the work here and none of them is negotiable:
//
//   a block is always square, and it is the same square on every turn of the
//   chapter, so the size is fitted once to a ceiling the chapter states at its
//   own start rather than to the wall as it grows;
//
//   the x extent is the chapter's whole grid from turn one, so the chart never
//   re-fits under the player and a column never moves sideways after it landed;
//
//   the record is dense. A chapter with a hundred months draws one block to a
//   row and buckets months together until they fit; a chapter with seven turns
//   lays a turn four or five blocks wide instead, so a short chapter is
//   brickwork rather than seven hairlines in a field;
//
//   the brickwork is contiguous. Every column sits one block gap from its
//   neighbour, the same gap that falls between two blocks inside a column, so
//   the record reads as one wall whose height varies rather than as a row of
//   separate piles. A turn boundary is marked on the axis under the floor, and
//   never by a gutter in the brickwork;
//
//   the past stays. Every column a chapter has resolved is still on the stage,
//   so composition drift is a shape rather than a sentence.
//
// Nothing floats over the brickwork. The count, the money, the target and the
// month all live on the rail down the left, at a fixed width that never moves
// between beats, so a wall that grows can never cover the number it is growing
// towards. The field keeps the blocks, the rules, the gold line and nothing
// else; the month marks sit under the floor where a chart's axis belongs.
//
// The resolve's second act lives here. While the cards score, the field is down
// a shade and nothing on it moves at all. Then the months inside the turn's span
// land left to right as quiet backdrop, and the column that closes the turn is
// built band by band in the order the cards just scored, so the column visibly
// assembles out of the holdings that made it. The cash band lands last and the
// stakes line settles after it. A tap anywhere on the stage jumps to the end
// state, always.

import { useMemo } from "react";
import { WallSlotColumn, stakesLine } from "../../lib/tally/run";
import { scheduleMark } from "../../lib/tally/text";
import { BlockColumn, BlockSpec, blockGap, fitBlockSize, wallHeight, wallHeightAt, wallRows } from "./Blocks";
import {
  GOLD, INK, LINE, LINE_HARD, RAIL_FILL, R, SANS, STAGE_BOTTOM, STAGE_TOP, SUB,
  TOP_LIGHT, goldPanel, plaque,
} from "./ui";

const PAD = 10;
// the same gold turned green for the one state that is not a distance any more
const GOLD_CLEAR = "#3E7A4B";

// how long one column takes to arrive, so the page can time the blocks that
// drop on the last one of a turn against the months that came before it
export const COLUMN_IN_MS = 180;

// the most blocks a wall ever carries, so the fitted size can hold anything
// the game's own tuning produces
const WALL_BLOCKS = 40;
// the record never gets coarser than this many drawn columns, because a wall
// with eight columns is a bar chart and this is meant to be a record
const MIN_COLUMNS = 12;
const MAX_BLOCK = 22;
// a turn can be laid up to this many blocks wide, but only while the wider
// brick costs nothing in block size, which is the same thing as saying only
// while the stage still has width going spare
const MAX_WIDE = 5;
// the axis strip under the floor line, where the marks live
const AXIS_H = 19;
// the score rail, at Balatro's blind panel position. It is wide enough for the
// longest thing the ladder ever prints on it, which is chapter 7's target, so
// no chapter's numbers ever break a phrase across two lines. As of the game UI
// pass it carries framed sub-panels rather than lines of text, so it is a
// little wider than it was.
const RAIL_MAX = 214;
const RAIL_MIN = 150;

export interface WallProps {
  columns: WallSlotColumn[];
  slots: number;
  boundarySlots: number[];
  marks: string[];
  yearsPerTurn: number;
  target: { dollars: number; blocks: number };
  countBlocks: number;
  // What the stakes line is allowed to know. It settles once, after the closing
  // column has finished standing up, so the arithmetic about the goal is the
  // last thing on the board that moves rather than a figure flickering under
  // every landing block. Left out, it is simply the count.
  stakesBlocks?: number;
  stakesTurn?: number;
  // null while the count is still stepping, because a dollar figure that
  // tweened alongside it would be a number nobody counted
  countDollars: number | null;
  nowLabel: string;
  // the turn the chapter is on, for the one line of arithmetic on the rail
  turn: number;
  turns: number;
  resolving: boolean;
  resolveKey: number;
  // Which act the resolve is on. On "cards" the wall is the wall the player
  // pressed Play on, a shade down and perfectly still: nothing arrives, nothing
  // lands and nothing assembles. On "wall" the months sweep in and the closing
  // column is built. "none" is the wall at rest between turns.
  act: "none" | "cards" | "wall";
  // one month's arrival, and one block's drop on the column that closes a turn
  monthStep: number;
  blockStagger: number;
  // The per holding tally. While this is a number the closing column is being
  // assembled band by band rather than dropped in one piece, and it is how many
  // blocks of that column are standing so far. The bands are stacked in the
  // order the tableau lays its stacks out, so the prefix the page counts up and
  // the prefix the wall draws are the same prefix.
  assemble: number | null;
  height: number;
  width: number;
  // how much room the board has, so the rail's type grows with the cabinet
  ui?: number;
  onSkip: () => void;
}

function specsFor(col: WallSlotColumn): BlockSpec[] {
  const out: BlockSpec[] = [];
  for (const band of col.bands) {
    for (let i = 0; i < band.blocks; i++) {
      out.push(band.stone ? { stone: true } : { color: band.color });
    }
  }
  for (let i = 0; i < col.cashBlocks; i++) out.push({ cash: true });
  return out;
}

const COL_ANIM_ID = "tally-col-anims";

function ensureColAnims(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(COL_ANIM_ID)) return;
  const el = document.createElement("style");
  el.id = COL_ANIM_ID;
  el.textContent = `
@keyframes tally-col-land {
  from { transform: translateY(-6px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes tally-score-beat {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .tally-col-land, .tally-score { animation: none !important; }
}`;
  document.head.appendChild(el);
}

// How the chapter's grid is laid out on the stage it was given. One block to a
// row wherever there are months enough to fill the width, and wider bricks
// where there are not. Every column costs its own width plus one block gap,
// and nothing widens that gap afterwards.
function fit(slots: number, ceiling: number, fieldW: number, fieldH: number) {
  // the gap, in block widths, that falls between two blocks and therefore
  // between two columns as well
  const G = 0.15;
  const measure = (wide: number) => {
    const sizeH = fitBlockSize(wallRows(ceiling, wide), fieldH, MAX_BLOCK);
    // what one column plus its gap costs, in block widths
    const per = wide + (wide - 1) * G + G;
    // the size at which every slot in the chapter gets its own column and they
    // exactly fill the width
    const sizeW = fieldW / (slots * per);
    let size = sizeH;
    let buckets = slots;
    if (sizeW < Math.min(sizeH, 5)) {
      // a chapter with a hundred months cannot draw a column a month at a size
      // worth looking at, so it keeps the height's block and buckets months
      // together until they fit
      const pitchAt = sizeH + blockGap(sizeH);
      buckets = Math.min(Math.max(1, Math.floor(fieldW / pitchAt)), slots);
    } else {
      size = Math.min(sizeH, sizeW);
    }
    // the gap has a one pixel floor, so a size solved from the ratio alone can
    // still spill by a pixel a column; the last word goes to the real geometry
    const spanAt = (s: number) => (wide * s + (wide - 1) * blockGap(s) + blockGap(s)) * buckets;
    for (let guard = 0; guard < 400 && size > 2 && spanAt(size) > fieldW; guard++) size -= 0.05;
    const colW = wide * size + (wide - 1) * blockGap(size);
    return { wide, size, colW, pitch: colW + blockGap(size), buckets };
  };
  let best = measure(1);
  for (let wide = 2; wide <= MAX_WIDE; wide++) {
    // a grid that already fills the stage has nothing to gain from a wider
    // brick, and a chapter with a hundred months is always in that case
    if (best.buckets * best.pitch >= fieldW * 0.95) break;
    const m = measure(wide);
    // and a wider brick is only worth it while there is still a record to read
    if (m.buckets < Math.min(slots, MIN_COLUMNS)) break;
    // a wider brick that has to shrink the block to fit is a worse wall, not a
    // fuller one, so the widening stops at the last size that cost nothing
    if (m.size < best.size) break;
    best = m;
  }
  const span = best.pitch * best.buckets;
  return { ...best, left: Math.max(0, (fieldW - span) / 2), span };
}

export default function Wall(p: WallProps) {
  const ui = Math.max(1, p.ui ?? 1);
  const t = (n: number) => Math.round(n * ui * 2) / 2;
  const s = (n: number) => Math.round(n * ui);
  const railW = Math.round(Math.max(RAIL_MIN * ui, Math.min(RAIL_MAX * ui, p.width * 0.215)));
  const axisH = s(AXIS_H);
  const pad = s(PAD);
  const fieldW = Math.max(40, p.width - railW - pad * 2);
  const fieldH = Math.max(60, p.height - pad * 2 - axisH - 1);

  // The ceiling the block size is fitted to. Forty is the most a wall ever
  // carries, but an early chapter peaks nearer twenty, and fitting every
  // chapter to forty draws chapter one as a sliver. A wall that somehow climbs
  // past the ceiling re-fits once to its own peak rounded up, because a column
  // drawn off the top of the stage is a lie about how much is there.
  const peak = p.columns.reduce((m, c) => Math.max(m, c.totalBlocks), 0);
  const assumed = Math.min(WALL_BLOCKS, Math.max(10, Math.round((p.target.blocks * 1.25) / 5) * 5));
  const ceiling = peak > assumed ? Math.max(WALL_BLOCKS, Math.ceil(peak / 5) * 5) : assumed;

  const g = useMemo(
    () => fit(Math.max(1, p.slots), ceiling, fieldW, fieldH),
    [p.slots, ceiling, fieldW, fieldH],
  );
  const { size, wide, colW, pitch, buckets, left } = g;

  const bucketOf = (slot: number) => Math.min(buckets - 1, Math.floor((slot * buckets) / Math.max(1, p.slots)));
  const xOf = (slot: number) => left + bucketOf(slot) * pitch;

  // one column per bucket, showing the latest month that bucket has reached
  const drawn = useMemo(() => {
    const out: (WallSlotColumn | null)[] = new Array(buckets).fill(null);
    for (const col of p.columns) {
      const b = bucketOf(col.slot);
      if (b >= 0 && b < buckets) out[b] = col;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.columns, buckets, p.slots]);

  // Act one is the wall the player pressed Play on, held exactly as it was, so
  // nothing on the stage is allowed to move while the cards are scoring.
  const cards = p.act === "cards";
  const live = p.columns.length ? p.columns[p.columns.length - 1] : null;
  const liveTurn = live ? live.turn : 0;
  let firstNew = drawn.length;
  if (p.resolving && !cards && liveTurn > 0) {
    for (let i = 0; i < drawn.length; i++) {
      const c = drawn[i];
      if (c && c.turn === liveTurn) { firstNew = i; break; }
    }
  }
  const lastDrawn = drawn.reduce((m, c, i) => (c ? i : m), -1);
  const prevTotal = (() => {
    if (firstNew <= 0) return 0;
    for (let i = firstNew - 1; i >= 0; i--) if (drawn[i]) return drawn[i]!.totalBlocks;
    return 0;
  })();
  const newTotal = live ? live.totalBlocks : 0;
  // the month sweep: column k of this turn arrives k steps in, and the blocks
  // the turn added drop on the last one once it is standing
  const sweepMs = Math.max(0, lastDrawn - firstNew) * p.monthStep;
  // the closing column is the one the tally builds, so while act two is running
  // it is neither swept in nor dropped in: it is stacked, a band at a time
  const assembling = p.resolving && !cards && p.assemble !== null;
  ensureColAnims();

  const targetY = Math.min(fieldH - 2, wallHeightAt(p.target.blocks, size, wide));
  const nowY = live ? Math.min(fieldH - 2, wallHeight(live.totalBlocks, size, wide)) : 0;

  // Where the record reaches to. Everything ruled belongs to the right of this
  // line: the counting rules and the schedule hairlines are the paper the wall
  // has not been built on yet, and a rule drawn behind standing blocks reads as
  // damage rather than as a measure. The built record sits on clean panel.
  const recordRight = lastDrawn >= 0 ? left + lastDrawn * pitch + colW + blockGap(size) / 2 : 0;

  // the counting rules, one every five rows, so a glance gives a number without
  // counting up to it
  const rules: number[] = [];
  for (let r = 5; r * (size + blockGap(size)) < fieldH; r += 5) {
    const y = wallHeightAt(r * wide, size, wide);
    if (y > fieldH - 4) break;
    rules.push(y);
  }

  // the schedule: a hairline at every turn boundary the player has not reached
  const future: number[] = [];
  p.boundarySlots.forEach((slot, i) => {
    if (i === 0) return;
    if (bucketOf(slot) <= lastDrawn) return;
    future.push(xOf(slot) - blockGap(size) / 2);
  });

  // the axis: every turn boundary the chapter has, marked under the floor,
  // thinned until the marks stop touching each other, and never printing the
  // same mark twice in a row, because a chapter ruled by year opens and closes
  // its first year on the same four digits
  const bounds = p.boundarySlots.map((slot, i) => ({
    x: xOf(slot) + colW / 2,
    label: scheduleMark(p.marks[i] ?? "", p.yearsPerTurn),
  }));
  let step = 1;
  if (bounds.length > 1) {
    const gapPx = Math.abs(bounds[1].x - bounds[0].x);
    step = Math.max(1, Math.ceil(46 / Math.max(1, gapPx)));
  }
  const axis: { x: number; label: string }[] = [];
  bounds.forEach((m, i) => {
    if (i % step !== 0 || !m.label) return;
    if (m.x > fieldW - 4) return;
    if (axis.length && axis[axis.length - 1].label === m.label) return;
    axis.push(m);
  });

  const dollars = p.countDollars === null
    ? "counting"
    : `$${p.countDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const stakes = stakesLine(
    p.stakesTurn ?? p.turn, p.turns, p.stakesBlocks ?? p.countBlocks, p.target.blocks,
  );

  return (
    <div
      data-wall="1"
      data-wall-act={p.act}
      data-wall-geom={`size=${size.toFixed(2)} wide=${wide} pitch=${pitch.toFixed(2)} buckets=${buckets} slots=${p.slots} rail=${railW} field=${fieldW.toFixed(0)}x${fieldH.toFixed(0)}`}
      onPointerDown={p.resolving ? p.onSkip : undefined}
      style={{
        position: "relative",
        height: p.height,
        borderRadius: R.panel,
        boxSizing: "border-box",
        background: `linear-gradient(180deg, ${STAGE_TOP} 0%, ${STAGE_BOTTOM} 100%)`,
        border: `2px solid ${LINE_HARD}`,
        boxShadow: `${TOP_LIGHT}, 0 1px 3px rgba(46,38,24,0.07)`,
        overflow: "hidden",
        fontFamily: SANS,
        cursor: p.resolving ? "pointer" : undefined,
        flex: "none",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* The score rail: everything the wall used to float over itself, on one
          left edge, top to bottom, and as of the game UI pass a stat panel
          rather than a column of sentences. The score sits in its own plaque,
          the target sits in a gold frame because the target is the one number
          on the board that is being asked rather than reported, and the stakes
          get a row of their own. Every line starts at the same x and every
          number is on its own line, so the longest chapter on the ladder cannot
          break a phrase in half or push a figure off the panel. */}
      <div
        data-rail="1"
        style={{
          width: railW,
          flex: "none",
          boxSizing: "border-box",
          padding: `${s(11)}px ${s(11)}px ${s(11)}px ${s(11)}px`,
          background: RAIL_FILL,
          borderRight: `2px solid ${LINE_HARD}`,
          boxShadow: TOP_LIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: s(8),
          textAlign: "left",
          overflow: "hidden",
        }}
      >
        {/* the score, in its plaque, and it beats every time a chip lands its
            total in here */}
        <div style={{ ...plaque(R.chip), padding: `${s(10)}px ${s(11)}px ${s(11)}px`, flex: "none" }}>
          <div
            data-rail-count={p.countBlocks}
            key={p.countBlocks}
            className="tally-score"
            style={{
              fontSize: t(44),
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: INK,
              fontVariantNumeric: "tabular-nums",
              transformOrigin: "left center",
              animation: "tally-score-beat 220ms cubic-bezier(.2,.8,.3,1) both",
            }}
          >
            {p.countBlocks}
          </div>
          <div style={{ fontSize: t(12), fontWeight: 700, color: SUB, marginTop: s(2) }}>
            {p.countBlocks === 1 ? "block" : "blocks"}
          </div>
          <div
            aria-hidden
            style={{ height: 1, background: LINE, margin: `${s(7)}px 0 ${s(6)}px` }}
          />
          <div
            style={{
              fontSize: t(15),
              fontWeight: 750,
              letterSpacing: "-0.02em",
              color: INK,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {dollars}
          </div>
        </div>

        <div style={{ flex: "1 1 auto", minHeight: 4 }} />

        {/* the target, in the gold it is drawn on the field in, with its dollars
            and its blocks on a line each */}
        <div
          style={{
            ...goldPanel(R.chip),
            padding: `${s(9)}px ${s(10)}px`,
            flex: "none",
            fontSize: t(13),
            fontWeight: 750,
            lineHeight: 1.32,
            color: GOLD,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: s(6) }}>
            <i
              aria-hidden
              style={{
                display: "inline-block",
                width: s(9),
                height: s(9),
                borderRadius: 2,
                background: GOLD,
                flex: "none",
              }}
            />
            target ${p.target.dollars.toLocaleString("en-US")}
          </div>
          <div style={{ whiteSpace: "nowrap" }}>{p.target.blocks} blocks</div>
        </div>

        {/* the same gold line's arithmetic, which is what makes a quiet turn a
            turn: how much is left and how long there is to do it in. It is a
            fact about the player's own goal and never a suggestion about it. */}
        <div
          data-stakes={stakes.text}
          style={{
            ...plaque(R.chip),
            padding: `${s(9)}px ${s(10)}px`,
            flex: "none",
            fontSize: t(13),
            fontWeight: 700,
            lineHeight: 1.32,
            color: stakes.past ? GOLD_CLEAR : GOLD,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {/* one half to a line, because the break belongs between the two
              facts and never inside either of them */}
          {stakes.text.split(" · ").map((half, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              {half}
            </div>
          ))}
        </div>

        <div style={{ flex: "1 1 auto", minHeight: 4 }} />

        <div
          style={{
            ...plaque(R.chip),
            padding: `${s(7)}px ${s(10)}px ${s(8)}px`,
            flex: "none",
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: t(11.5), fontWeight: 650, color: SUB }}>now</div>
          <div
            style={{
              fontSize: t(14),
              fontWeight: 750,
              color: INK,
              marginTop: 1,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.nowLabel || "not started"}
          </div>
        </div>
      </div>

      {/* the wall itself, and nothing written over it */}
      <div
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          padding: pad,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "relative",
            height: fieldH,
            // Act one: the field goes down a shade and holds perfectly still
            // while the cards score. It is a step back and not a curtain, so the
            // record stays readable the whole way through.
            filter: cards ? "saturate(0.62) brightness(0.96)" : undefined,
            opacity: cards ? 0.78 : 1,
            transition: "opacity .3s ease, filter .3s ease",
          }}
        >
          {/* the counting rules */}
          {rules.map((y, i) => (
            <div
              key={i}
              aria-hidden
              style={{ position: "absolute", left: recordRight, right: 0, bottom: y, height: 1, background: "rgba(0,0,0,0.055)" }}
            />
          ))}

          {/* the schedule the chapter has not played yet */}
          {future.map((x, i) => (
            <div
              key={i}
              aria-hidden
              style={{ position: "absolute", left: x, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.07)" }}
            />
          ))}

          {/* The column the tally is building, marked while it is being built.
              A chapter that draws a hundred months lays one block to a column,
              and a single block wide column assembling at the edge of a dense
              record is easy to miss; this is the thread from the card that is
              scoring to the place its blocks are going, and it goes away the
              moment the column is finished. */}
          {assembling && lastDrawn >= 0 && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: left + lastDrawn * pitch,
                bottom: 0,
                top: 0,
                width: pitch,
                background: "rgba(181,122,0,0.10)",
                borderRadius: 3,
                pointerEvents: "none",
              }}
            />
          )}

          {/* the record */}
          {drawn.map((col, i) => {
            if (!col) return null;
            const isLast = i === lastDrawn;
            // the closing column is built by the tally, so it is not one of the
            // months that sweep in behind it
            const isNew = p.resolving && !cards && i >= firstNew && !(assembling && isLast);
            const stacking = assembling && isLast;
            const landing = !assembling && !cards && isLast && p.resolving && newTotal > prevTotal;
            const lifting = !assembling && !cards && isLast && p.resolving && newTotal < prevTotal;
            const specs = specsFor(col);
            const before = lifting && firstNew > 0 ? drawn[firstNew - 1] : null;
            let drawnSpecs = before ? [...specs, ...specsFor(before).slice(newTotal)] : specs;
            // Every block already standing keeps its element and its key, so a
            // block that has landed never re-plays its landing; only the ones
            // the tally has just added are new, and a new block animates because
            // it is new.
            if (stacking) drawnSpecs = specs.slice(0, Math.max(0, p.assemble ?? 0));
            return (
              <div
                key={i}
                // the column and how many blocks it is standing, so a check can
                // watch a standing column across a resolve without counting
                // pixels
                data-col={i}
                data-col-blocks={drawnSpecs.length}
                className={isNew ? "tally-col-land" : undefined}
                style={{
                  position: "absolute",
                  left: left + i * pitch + (pitch - colW) / 2,
                  bottom: 0,
                  width: colW,
                  animation: isNew ? `tally-col-land ${COLUMN_IN_MS}ms cubic-bezier(.2,.8,.3,1) both` : undefined,
                  // the sweep is timed from the moment act two mounts these
                  // columns, which is the moment act two begins
                  animationDelay: isNew ? `${(i - firstNew) * p.monthStep}ms` : undefined,
                }}
              >
                <BlockColumn
                  key={stacking ? `b${p.resolveKey}` : landing || lifting ? `a${p.resolveKey}` : "s"}
                  blocks={drawnSpecs}
                  size={size}
                  wide={wide}
                  landFrom={stacking ? 0 : landing ? prevTotal : undefined}
                  liftFrom={lifting ? newTotal : undefined}
                  delay={landing || lifting ? sweepMs + COLUMN_IN_MS : 0}
                  stagger={stacking ? 0 : p.blockStagger}
                />
              </div>
            );
          })}

          {/* the gold target line; its figure is on the rail */}
          <div
            aria-hidden
            data-target-line="1"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: targetY,
              borderTop: `1.5px dashed ${GOLD}`,
              pointerEvents: "none",
            }}
          />

          {/* where the wall stands, as a mark and not as a sentence */}
          {!p.resolving && lastDrawn >= 0 && (
            <i
              aria-hidden
              style={{
                position: "absolute",
                left: left + lastDrawn * pitch + (pitch - colW) / 2,
                bottom: nowY + 3,
                width: colW,
                height: 3,
                background: GOLD,
                borderRadius: 1,
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* the floor, and the months under it */}
        <div aria-hidden style={{ height: 1.5, background: "rgba(46,38,24,0.28)", flex: "none" }} />
        <div style={{ position: "relative", height: axisH, flex: "none" }}>
          {axis.map((a, i) => {
            // a mark at the left end sits inside the stage rather than half off it
            const edge = a.x < 22;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: edge ? 0 : a.x,
                  top: s(4),
                  transform: edge ? undefined : "translateX(-50%)",
                  fontSize: t(10.5),
                  fontWeight: 600,
                  color: SUB,
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {a.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
