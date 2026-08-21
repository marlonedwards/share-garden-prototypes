// The desk, forked from src/components/floor/Desk.tsx for the warm look.
//
// Why a fork. The Floor's desk takes no colour props at all: its slab green,
// its tick grey, its seam, its dead grey, its panel gradient, its border and
// its two text colours are all module constants and inline literals tuned for a
// dark stage. There is no prop that reaches any of them, so the Duolingo ground
// cannot be reached by props and the file is copied instead. Every prop name is
// the one The Floor uses (columns, scale, height, focus, onFocus, settling,
// phone, pour) and every data attribute is the one its walk reads, so the two
// desks stay one representation with two palettes.
//
// The three flat rules are unchanged, because they are the specification and
// not the styling (docs/coin-stacks-feedback-aug19.md, docs/tape-shared.md
// section 6):
//
//   a share is a slab       one flat rectangle per share, thickness = price
//   growth is thickness     price moves change thickness, never slab count
//   cash is ticks           fixed $10 units, narrower, one neutral colour
//
// Every column, cash included, is drawn on one dollar scale set from the
// opening thousand. A column's total height is always dollars x scale, so a
// slab is price x scale and a tick is exactly ten dollars of the same ruler,
// and no trade ever moves the ruler. Buys pour ticks out of cash into a column
// and sells break slabs back into ticks; both ends of the move flash, in
// opposite directions, which is what makes the swap legible.
//
// Countability has a floor. A column draws the smallest power of ten of its own
// unit that is at least three pixels thick, and the count under the column
// always says the exact number, so a banded column still reads as a number.
//
// A column's width is the one thing the fork sizes differently, and it is a
// reading fix rather than a styling one. The Floor plays ten wedges wide, so its
// 92px column is what fits; this game opens on one holding and cash, and two
// 92px columns in a stage a thousand pixels across left the desk band reading as
// empty panel with a stripe in the middle. The width now scales with the count:
// a round holding one or two things draws them at 160, ten at 92, and the widths
// in between come off the same line. The dollar scale is untouched by this: a
// slab is still price times scale tall, so a wider column is a wider slab and
// never a taller one, and the three flat rules read exactly as before.

import { CSSProperties } from "react";
import { Ticker } from "../../lib/tape/engine";
import { companyName } from "../../lib/trigger/deal";
import { money } from "../../lib/trigger/format";
import { UI_FONT } from "../../lib/type";
import {
  DESK, GREEN, INK, MUTED, RADIUS, SEAM as SEAM_TOKEN, SIZE, WEIGHT, tint,
} from "../../lib/monkey/look";

export const TICK_DOLLARS = 10;

// A column is this wide when the desk holds one or two things, and this narrow
// when it holds ten. Cash counts as a column and takes the same width as the
// rest, so the band never draws two different column widths at once.
export const COL_WIDE = 160;
export const COL_NARROW = 92;
export const COL_PHONE = 74;

export function columnWidth(holdings: number, phone = false): number {
  if (phone) return COL_PHONE;
  const n = Math.max(0, holdings);
  if (n <= 2) return COL_WIDE;
  if (n >= 10) return COL_NARROW;
  return Math.round(COL_WIDE - ((COL_WIDE - COL_NARROW) * (n - 2)) / 8);
}

// Below three pixels a seam per unit is not readable, which is what makes the
// column band up to the next power of ten.
export const MIN_UNIT_PX = 3;

const SLAB = GREEN;              // a share
const TICK = "#C9A227";          // a ten dollar tick, warm and not a second green
const SEAM = SEAM_TOKEN;
const DEAD = "#CFC7B7";

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

function countOf(n: number): string {
  return n.toLocaleString("en-US");
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
            borderRadius: 3,
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
          borderRadius: 6,
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

// The last trade, so the two columns the dollars moved between can say so.
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
  focus: Ticker | null;
  onFocus: (ticker: Ticker) => void;
  settling: boolean;
  phone: boolean;
  pour: Pour | null;
}) {
  const stackH = height - 44;
  // holdings, not columns: cash is always there and is not a thing you picked.
  const colW = columnWidth(columns.filter((c) => c.ticker !== null).length, phone);
  return (
    <div
      data-desk
      data-scale={scale.toFixed(8)}
      data-tick-px={(TICK_DOLLARS * scale).toFixed(4)}
      data-desk-h={height}
      data-pour={pour ? `${pour.kind}:${pour.ticker}` : ""}
      data-settling={settling ? "1" : "0"}
      style={{
        background: DESK,
        borderRadius: RADIUS,
        padding: "8px 12px",
        width: "100%",
        flex: "none",
        fontFamily: UI_FONT,
      }}
    >
      {/* Two names per direction, alternated by the trade's own number, because
          re-setting an animation to the name it already carries does not replay
          it and two buys in a row have to flash twice. */}
      <style>{`
        @keyframes monkey-pour-in-a { from { background: ${tint(GREEN, 0.30)} } to { background: transparent } }
        @keyframes monkey-pour-in-b { from { background: ${tint(GREEN, 0.30)} } to { background: transparent } }
        @keyframes monkey-pour-out-a { from { background: rgba(255,75,75,0.26) } to { background: transparent } }
        @keyframes monkey-pour-out-b { from { background: rgba(255,75,75,0.26) } to { background: transparent } }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          width: "100%",
          height,
          overflowX: "auto",
          overflowY: "hidden",
          justifyContent: "safe center",
        }}
      >
        {columns.map((col) => {
          const focused = col.ticker !== null && col.ticker === focus;
          const label = col.ticker === null ? "cash" : companyName(col.ticker);
          const inPour = pour !== null && (col.key === pour.ticker || col.key === "cash");
          const fills = pour !== null && (col.key === "cash" ? pour.kind === "sell" : pour.kind === "buy");
          return (
            <button
              key={col.key}
              type="button"
              data-column={col.key}
              onClick={() => col.ticker && onFocus(col.ticker)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                textAlign: "left",
                border: "none",
                width: colW,
                height: "100%",
                flex: "0 0 auto",
                borderRadius: 12,
                padding: "4px 4px 4px",
                animation: inPour
                  ? `monkey-pour-${fills ? "in" : "out"}-${pour.id % 2 === 0 ? "a" : "b"} 320ms ease-out`
                  : undefined,
                background: focused ? tint("#1CB0F6", 0.16) : "transparent",
                cursor: col.ticker ? "pointer" : "default",
                fontFamily: UI_FONT,
              }}
            >
              <Stack col={col} height={stackH} scale={scale} />
              <div
                style={{
                  marginTop: 4,
                  fontSize: SIZE.small,
                  lineHeight: "16px",
                  fontWeight: WEIGHT.emphasis,
                  color: col.dead ? MUTED : INK,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </div>
              {/* The count under a column reads what the column is drawing, so a
                  settle pour counts cash up and shares down instead of sitting
                  on the number the round ended with. */}
              <div
                style={{
                  fontSize: SIZE.small,
                  lineHeight: "16px",
                  color: MUTED,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
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
