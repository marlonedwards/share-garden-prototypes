// The block, drawn once, used everywhere. A block is a fixed number of
// dollars, and it is always square: the Neurath rule says a bigger quantity is
// more blocks, never a bigger shape, so every place that shows blocks (card
// faces, the tray, the ceremony, the summary) draws them through these three
// primitives and nothing ever invents its own square.
//
// Cash is green with a dollar glyph. Stone is flat grey with no highlight,
// because a stone is not money.
//
// Grouping is a column rule and only a column rule. A column stacks bottom up
// with a small break every five, the same ISOTYPE grouping the wall uses, so a
// column of twenty-three reads as four groups and three rather than a tower you
// squint at; the break is a rhythm and never a wound, so it is a few pixels and
// no more, and every column on a stage uses the same one, which is what makes
// the breaks line up as horizontal seams. A row of blocks never groups at all:
// a row is read along its length and a gap in it looks like a missing block.

import { BLOCK_GROUP } from "../../lib/blocks";

export const CASH_GREEN = "#3FAE6B";
export const STONE_GREY = "#A9AFBA";

// The two gaps a column is built from, as functions of the block, so the wall
// can work out where a given block count reaches to before it draws anything.
// A gold line at twenty blocks has to land exactly on top of the twentieth
// block or the line is a lie.
export function blockGap(size: number): number {
  return Math.max(1, size * 0.15);
}

// The counting break, at about a third of a block and never more than four
// pixels. It is the same number for every column on a stage, because the block
// is, so the breaks fall on one line across the whole record.
export function blockGroupGap(size: number): number {
  return Math.max(2, Math.min(4, size * 0.35));
}

// The exact height a column of this many blocks stands, gaps included.
export function columnHeight(count: number, size: number): number {
  if (count <= 0) return 0;
  const groups = Math.floor((count - 1) / BLOCK_GROUP);
  return count * size
    + groups * blockGroupGap(size)
    + (count - 1 + groups) * blockGap(size);
}

// The same height with the steps smoothed out, for a line that has to sit at
// a fractional number of blocks. It agrees with columnHeight at whole counts
// closely enough that a reader cannot see the difference.
export function columnHeightAt(count: number, size: number): number {
  if (count <= 0) return 0;
  const g = blockGap(size);
  return count * (size + g) - g + (count / BLOCK_GROUP) * blockGroupGap(size);
}

// The largest square block that lets a full column of `count` stand inside
// `height`. The wall calls this once with forty, the count a wall never
// exceeds, so a block is the same size on every turn of the chapter.
export function fitBlockSize(count: number, height: number, max = 24): number {
  for (let s = max; s >= 2; s -= 0.25) {
    if (columnHeight(count, s) <= height) return s;
  }
  return 2;
}

// The two motions a block has, in one stylesheet, added once. A block lands by
// dropping the last few pixels and leaves by lifting and fading, and both are
// removed by prefers-reduced-motion so the end state is all that shows.
const ANIM_ID = "tally-block-anims";

function ensureBlockAnims(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(ANIM_ID)) return;
  const el = document.createElement("style");
  el.id = ANIM_ID;
  el.textContent = `
@keyframes tally-block-land {
  from { transform: translateY(-7px); opacity: 0; }
  60%  { opacity: 1; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes tally-block-lift {
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(-10px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .tally-land, .tally-lift { animation: none !important; }
}`;
  document.head.appendChild(el);
}

export interface BlockSpec {
  color?: string;
  cash?: boolean;
  stone?: boolean;
}

export function Block({ size, color, cash, stone }: BlockSpec & { size: number }) {
  const fill = stone ? STONE_GREY : cash ? CASH_GREEN : color ?? "#8E8E93";
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(1, size * 0.13),
        background: fill,
        position: "relative",
        display: "inline-block",
        flex: "none",
      }}
    >
      {!stone && size >= 6 && (
        <span
          style={{
            position: "absolute",
            left: size * 0.13,
            right: size * 0.13,
            top: Math.max(0.5, size * 0.07),
            height: Math.max(1, size * 0.17),
            background: "rgba(255,255,255,0.4)",
            borderRadius: 1,
          }}
        />
      )}
      {cash && size >= 10 && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: size * 0.67,
            fontWeight: 800,
            color: "rgba(255,255,255,0.95)",
            lineHeight: 1,
            fontFamily: '"Helvetica Neue", Inter, system-ui, sans-serif',
          }}
        >
          $
        </span>
      )}
    </span>
  );
}

// A row of identical blocks, wrapping if the host is narrow, with one uniform
// gap and no grouping at all. Used on card faces (a card's own worth) and in
// report lines.
export function BlockRow({
  count, size, color, cash, stone, maxWidth,
}: BlockSpec & { count: number; size: number; maxWidth?: number }) {
  const blocks = [];
  for (let i = 0; i < count; i++) {
    blocks.push(<Block key={i} size={size} color={color} cash={cash} stone={stone} />);
  }
  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: Math.max(1, size * 0.18),
        justifyContent: "center",
        maxWidth,
        verticalAlign: "middle",
      }}
    >
      {blocks}
    </span>
  );
}

// How tall a column of this many blocks stands when the column is laid `wide`
// blocks to a row. A short chapter has few columns and a lot of width to spend,
// so it lays a turn two or three blocks wide and the blocks get bigger; a
// chapter with a hundred months lays one block to a row and stays brickwork.
// The visible gap still falls every BLOCK_GROUP rows, so a wall is countable
// in fives whichever way it is laid.
export function wallRows(count: number, wide: number): number {
  return Math.ceil(Math.max(0, count) / Math.max(1, wide));
}

export function wallHeight(count: number, size: number, wide: number): number {
  return columnHeight(wallRows(count, wide), size);
}

export function wallHeightAt(count: number, size: number, wide: number): number {
  return columnHeightAt(count / Math.max(1, wide), size);
}

// A column of blocks, bottom up, with the visible gap every BLOCK_GROUP rows so
// it stays countable at a glance. Takes a flat list already in bottom-up order.
//
// The optional animation props are what the resolve is made of. `landFrom` is
// the index the new blocks start at, so everything below it was already on the
// wall and everything above it drops in one at a time. `liftFrom` is the index
// the blocks that are leaving start at, and those lift and fade instead. A
// column with neither prop is a plain end state and costs nothing.
// `delay` is what the month sweep buys: the last column of a turn does not
// start dropping its blocks until the months before it have arrived, so the
// blocks land on a column that is already standing there.
export function BlockColumn({
  blocks, size, wide = 1, landFrom, liftFrom, stagger = 42, delay = 0, dropMs = 230, liftMs = 200,
}: {
  blocks: BlockSpec[];
  size: number;
  wide?: number;
  landFrom?: number;
  liftFrom?: number;
  stagger?: number;
  delay?: number;
  dropMs?: number;
  liftMs?: number;
}) {
  const gap = blockGap(size);
  const groupGap = blockGroupGap(size);
  const w = Math.max(1, Math.round(wide));
  const animating = landFrom !== undefined || liftFrom !== undefined;
  if (animating) ensureBlockAnims();

  const wrap = (i: number, block: JSX.Element): JSX.Element => {
    if (landFrom !== undefined && i >= landFrom) {
      return (
        <span
          key={`a${i}`}
          className="tally-land"
          style={{
            display: "block",
            lineHeight: 0,
            flex: "none",
            animation: `tally-block-land ${dropMs}ms cubic-bezier(.2,.8,.3,1) both`,
            animationDelay: `${delay + (i - landFrom) * stagger}ms`,
          }}
        >
          {block}
        </span>
      );
    }
    if (liftFrom !== undefined && i >= liftFrom) {
      return (
        <span
          key={`a${i}`}
          className="tally-lift"
          style={{
            display: "block",
            lineHeight: 0,
            flex: "none",
            animation: `tally-block-lift ${liftMs}ms ease-in both`,
            animationDelay: `${delay + (i - liftFrom) * stagger}ms`,
          }}
        >
          {block}
        </span>
      );
    }
    return block;
  };

  const rows: JSX.Element[] = [];
  const total = wallRows(blocks.length, w);
  for (let r = 0; r < total; r++) {
    if (r > 0 && r % BLOCK_GROUP === 0) {
      rows.push(<span key={`g${r}`} style={{ height: groupGap, flex: "none" }} />);
    }
    const cells: JSX.Element[] = [];
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (i >= blocks.length) break;
      const b = blocks[i];
      cells.push(wrap(i, <Block key={i} size={size} color={b.color} cash={b.cash} stone={b.stone} />));
    }
    rows.push(
      <span key={`r${r}`} style={{ display: "flex", gap, lineHeight: 0, flex: "none" }}>
        {cells}
      </span>,
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column-reverse",
        gap,
        alignItems: "flex-start",
      }}
    >
      {rows}
    </span>
  );
}
