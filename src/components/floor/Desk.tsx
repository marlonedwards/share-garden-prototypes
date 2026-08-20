// The desk: the portfolio strip across the bottom of The Floor. Jared's three
// flat rules drawn once, and the navigation at the same time.
// Contract: docs/tape-shared.md section 6, docs/floor-spec.md section 2.
//
//   a share is a slab       one flat rectangle per share, thickness = price
//   growth is thickness     price moves change thickness, never slab count
//   cash is ticks           fixed $10 units, narrower, one neutral color
//
// Every column, cash included, is drawn on one dollar scale set from the era's
// opening worth. A column's total height is always dollars x scale, so a slab
// is price x scale and a tick is exactly ten dollars of the same ruler.
//
// Countability has a floor. Two thousand dollars of cash is two hundred ten
// dollar ticks, and no desk is two hundred readable seams tall, so a column
// draws the smallest power of ten of its own unit that is at least three pixels
// thick: ticks while ticks are readable, then hundred dollar blocks of ten
// ticks, then thousand dollar blocks, each block seamed off from the next. The
// count under the column always says the exact number of shares or dollars, so
// a banded column reads as a number even when the eye stops counting. Trigger's
// meter bands the same way past ten units, in the same green and the same grey,
// so the two games draw one representation and not two.
//
// A settling era pours: the caller hands a column a `draw` value between where
// it stood and where it landed, and the column draws that instead of its true
// dollars. Only the drawing moves. data-dollars, data-shares and data-price
// report the true state throughout, and data-draw-dollars says what is on
// screen, the same split Trigger's meter uses.

import { CSSProperties } from "react";
import { Ticker } from "../../lib/tape/engine";
import { countOf, money, nameOf } from "../../lib/floor/campaign";

export const TICK_DOLLARS = 10;

// Below three pixels a seam per unit is not readable, which is what makes the
// column band up to the next power of ten.
export const MIN_UNIT_PX = 3;

// Trigger's palette, exactly: src/components/trigger/Meter.tsx.
const SLAB = "#4ADE80";
const TICK = "#8794A6";
const SEAM = "rgba(12,15,20,0.55)";
const DEAD = "#3A4250";

export interface DeskColumn {
  key: string;            // "cash" or the ticker
  ticker: Ticker | null;
  shares: number;         // 0 for cash
  price: number;          // 0 for cash
  dollars: number;
  dead: boolean;
  draw?: number;          // dollars to draw, when a pour is running
}

export function cashColumn(cash: number, draw?: number): DeskColumn {
  return { key: "cash", ticker: null, shares: 0, price: 0, dollars: cash, dead: false, draw };
}

// The smallest power of ten of this column's own unit that draws at least
// MIN_UNIT_PX. One tick, then ten ticks, then a hundred, and so on. It never
// bands past the column's own size: five shares worth two pixels between them
// draw as five seamless slivers, which is honest, rather than as nothing at
// all, which is what banding a five unit column into tens comes to.
export function bandOf(unitPx: number, units: number): number {
  if (!(unitPx > 0)) return 1;
  const cap = units >= 10 ? Math.pow(10, Math.floor(Math.log10(units))) : 1;
  let k = 1;
  while (k * unitPx < MIN_UNIT_PX && k * 10 <= cap) k *= 10;
  return k;
}

interface Drawn {
  units: number;        // whole rectangles
  band: number;         // shares or ticks each rectangle stands for
  unitPx: number;       // pixels per rectangle
  partPx: number;       // the remainder, drawn as a part unit on top
  totalPx: number;
}

function drawOf(col: DeskColumn, scale: number): Drawn {
  const isCash = col.ticker === null;
  const dollars = Math.max(0, col.draw ?? col.dollars);
  const unitDollars = isCash ? TICK_DOLLARS : col.price;
  const totalPx = dollars * scale;
  if (!(unitDollars > 0) || !(scale > 0) || !(totalPx > 0)) {
    return { units: 0, band: 1, unitPx: 0, partPx: 0, totalPx: Math.max(0, totalPx) };
  }
  // A settled position draws its exact share count rather than a division that
  // can land a hair under it.
  const raw = !isCash && col.draw === undefined ? col.shares : dollars / unitDollars;
  const band = bandOf(unitDollars * scale, raw);
  const unitPx = band * unitDollars * scale;
  const units = Math.floor(raw / band + 1e-9);
  return { units, band, unitPx, partPx: Math.max(0, totalPx - units * unitPx), totalPx };
}

function drawnShares(col: DeskColumn): number {
  if (col.draw === undefined || !(col.price > 0)) return col.shares;
  return Math.min(col.shares, Math.floor(col.draw / col.price + 1e-9));
}

function Stack({ col, height, scale }: {
  col: DeskColumn; height: number; scale: number;
}) {
  const isCash = col.ticker === null;
  const d = drawOf(col, scale);
  const color = col.dead ? DEAD : isCash ? TICK : SLAB;
  const seam = d.unitPx >= MIN_UNIT_PX;

  const unit: CSSProperties = {
    flex: "0 0 auto",
    height: d.unitPx,
    background: color,
    borderTop: seam ? `1px solid ${SEAM}` : "none",
  };

  return (
    <div style={{ height, display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%" }}>
      {d.partPx > 0.4 && (
        <div
          data-sliver={col.key}
          style={{
            height: Math.min(d.partPx, height),
            width: isCash ? "58%" : "100%",
            margin: "0 auto",
            background: color,
            opacity: 0.55,
            borderRadius: 2,
          }}
        />
      )}
      <div
        data-stack={col.key}
        data-dollars={col.dollars.toFixed(4)}
        data-draw-dollars={(col.draw ?? col.dollars).toFixed(4)}
        data-shares={col.shares}
        data-price={col.price.toFixed(6)}
        data-units={d.units}
        data-unit-band={d.band}
        data-unit-px={d.unitPx.toFixed(4)}
        data-banded={d.band > 1 ? "1" : "0"}
        style={{
          height: Math.min(height, d.units * d.unitPx),
          width: isCash ? "58%" : "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: d.units }, (_, i) => (
          <div key={i} data-unit={i} style={i === 0 ? { ...unit, borderTop: "none" } : unit} />
        ))}
      </div>
    </div>
  );
}

// The last trade, so the two columns the dollars moved between can say so. A
// buy pours ticks out of cash into a column and a sell breaks slabs back into
// ticks; the counts change in the same frame, and this is what makes the swap
// legible instead of instantaneous.
export interface Pour {
  id: number;
  ticker: Ticker;
  kind: "buy" | "sell";
}

export default function Desk({
  columns, scale, height, focus, onFocus, settling, phone, pour,
}: {
  columns: DeskColumn[];
  scale: number;
  height: number;
  focus: Ticker;
  onFocus: (ticker: Ticker) => void;
  settling: boolean;
  phone: boolean;
  pour: Pour | null;
}) {
  // The strip's height is the whole column button: the drawn stack, the name,
  // the count, and the button's own padding. Fixing it here is what keeps the
  // desk the same size whatever it is holding.
  const stackH = height - 44;
  return (
    <div
      data-desk
      data-scale={scale.toFixed(8)}
      data-tick-px={(TICK_DOLLARS * scale).toFixed(4)}
      data-desk-h={height}
      data-pour={pour ? `${pour.kind}:${pour.ticker}` : ""}
      data-settling={settling ? "1" : "0"}
      className="rounded-2xl px-3 pt-2 pb-2 w-full flex-none"
      style={{
        background: "linear-gradient(180deg, rgba(255,214,160,0.07), rgba(255,214,160,0.015) 46%), #242A33",
        border: "1px solid #333C49",
      }}
    >
      {/* Two names per direction, alternated by the trade's own number, because
          re-setting an animation to the name it already carries does not replay
          it and two buys in a row have to flash twice. */}
      <style>{`
        @keyframes floor-pour-in-a { from { background: rgba(74,222,128,0.30) } to { background: transparent } }
        @keyframes floor-pour-in-b { from { background: rgba(74,222,128,0.30) } to { background: transparent } }
        @keyframes floor-pour-out-a { from { background: rgba(229,72,77,0.30) } to { background: transparent } }
        @keyframes floor-pour-out-b { from { background: rgba(229,72,77,0.30) } to { background: transparent } }
      `}</style>
      {/* A fixed height, not a minimum: a column count that overflows scrolls
          inside the strip rather than growing it, so nothing above the desk
          ever moves. */}
      <div
        className="flex items-end gap-2 w-full overflow-x-auto overflow-y-hidden"
        style={{ height, justifyContent: "safe center" }}
      >
        {columns.map((col) => {
          const focused = col.ticker !== null && col.ticker === focus;
          const label = col.ticker === null ? "cash" : nameOf(col.ticker);
          // A buy fills the stock column and drains cash; a sell does the
          // reverse. Both ends of the move flash, in opposite directions.
          const inPour = pour !== null && (col.key === pour.ticker || col.key === "cash");
          const fills = pour !== null && (col.key === "cash" ? pour.kind === "sell" : pour.kind === "buy");
          return (
            <button
              key={col.key}
              type="button"
              data-column={col.key}
              onClick={() => col.ticker && onFocus(col.ticker)}
              className="flex flex-col items-stretch rounded-lg px-1 pt-1 pb-1 text-left"
              style={{
                width: phone ? 74 : 92,
                height: "100%",
                flex: "0 0 auto",
                animation: inPour
                  ? `floor-pour-${fills ? "in" : "out"}-${pour.id % 2 === 0 ? "a" : "b"} 320ms ease-out`
                  : undefined,
                background: focused ? "rgba(232,241,250,0.07)" : "transparent",
                outline: focused ? "1px solid rgba(232,241,250,0.20)" : "1px solid transparent",
                cursor: col.ticker ? "pointer" : "default",
              }}
            >
              <Stack col={col} height={stackH} scale={scale} />
              <div className="mt-1 truncate" style={{ fontSize: 12, lineHeight: "16px", color: col.dead ? "#8794A6" : "#E8EDF4" }}>
                {label}
              </div>
              {/* The count under a column reads what the column is drawing, so
                  a settle pour counts cash up and shares down instead of
                  sitting on the number the era ended with. */}
              <div className="tnum truncate" style={{ fontSize: 12, lineHeight: "16px", color: "#8794A6" }}>
                {col.ticker === null
                  ? money(col.draw ?? col.dollars)
                  : col.dead
                    ? "gone"
                    : `${countOf(drawnShares(col))} ${drawnShares(col) === 1 ? "share" : "shares"}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
