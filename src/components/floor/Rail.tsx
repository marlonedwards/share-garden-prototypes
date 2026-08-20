// The rail: every stock in the era, one row each, name and live price and a
// small trend arrow. No sparklines, because one chart at a time is the rule
// (docs/floor-spec.md section 2). Tapping a row focuses it; the tape does not
// pause for that and no trade happens. A company whose series has reached zero
// grays out and reads `gone`, and one that is not public yet says the month it
// lists and cannot be focused or bought.
//
// The arrow reads three months, not twelve. Twelve months of a five year era is
// most of what the player has seen, so at the March 2020 gate a twelve month
// arrow was still green while the situation line said the market had fallen by
// a third. Three months is also the horizon the shared engine judges a headline
// on, so the arrow and the truth labels answer the same question.

import { RunState, Ticker, isDead, priceAt } from "../../lib/tape/engine";
import { isListed, listsOn, nameOf, price as fmtPrice } from "../../lib/floor/campaign";

const UP = "#4ADE80";
const DOWN = "#E5484D";
const MUTED = "#8794A6";

export const TREND_MONTHS = 3;

export function trendOf(run: RunState, ticker: Ticker): number {
  const now = priceAt(run, ticker);
  const then = priceAt(run, ticker, Math.max(0, run.t - TREND_MONTHS));
  if (!(now > 0) || !(then > 0)) return 0;
  return now / then - 1;
}

// A bar, not the word "flat": a word in the arrow column reads as a different
// kind of information from the two glyphs it sits between.
const ARROW_BOX = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: 12,
  height: 18,
  fontSize: 12,
} as const;

function Arrow({ trend }: { trend: number }) {
  const flat = Math.abs(trend) < 0.02;
  return (
    <span
      data-trend={flat ? "flat" : trend > 0 ? "up" : "down"}
      aria-label={flat ? "flat" : trend > 0 ? "up" : "down"}
      style={{ ...ARROW_BOX, color: flat ? MUTED : trend > 0 ? UP : DOWN }}
    >
      {flat
        ? <span style={{ width: 9, height: 2, borderRadius: 1, background: MUTED }} />
        : trend > 0 ? "▲" : "▼"}
    </span>
  );
}

export default function Rail({
  run, focus, onFocus, phone,
}: {
  run: RunState;
  focus: Ticker;
  onFocus: (ticker: Ticker) => void;
  phone: boolean;
}) {
  if (phone) {
    return (
      <div data-rail className="flex gap-2 overflow-x-auto overflow-y-hidden w-full items-center" style={{ height: 36 }}>
        {run.tickers.map((ticker) => {
          const listed = isListed(run, ticker);
          const dead = isDead(run, ticker);
          const on = ticker === focus;
          return (
            <button
              key={ticker}
              type="button"
              data-rail-row={ticker}
              data-focused={on ? "1" : "0"}
              data-listed={listed ? "1" : "0"}
              disabled={!listed}
              onClick={() => listed && onFocus(ticker)}
              className="flex-none rounded-full px-3 flex items-center gap-2"
              style={{
                height: 32,
                background: on ? "rgba(232,241,250,0.12)" : "#1F2733",
                border: `1px solid ${on ? "rgba(232,241,250,0.35)" : "#2C3644"}`,
                color: dead || !listed ? MUTED : "#E8EDF4",
              }}
            >
              <span style={{ fontSize: 12 }}>{nameOf(ticker)}</span>
              {!listed ? (
                <span style={{ fontSize: 12, color: MUTED }}>lists {listsOn(run, ticker)}</span>
              ) : dead ? (
                <span style={{ fontSize: 12, color: MUTED }}>gone</span>
              ) : (
                <>
                  <span className="tnum" style={{ fontSize: 12 }}>{fmtPrice(priceAt(run, ticker))}</span>
                  <Arrow trend={trendOf(run, ticker)} />
                </>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      data-rail
      className="rounded-2xl overflow-hidden flex-none self-start"
      style={{ background: "#1F2733", border: "1px solid #2C3644", width: 232 }}
    >
      {run.tickers.map((ticker) => {
        const listed = isListed(run, ticker);
        const dead = isDead(run, ticker);
        const on = ticker === focus;
        return (
          <button
            key={ticker}
            type="button"
            data-rail-row={ticker}
            data-focused={on ? "1" : "0"}
            data-listed={listed ? "1" : "0"}
            disabled={!listed}
            onClick={() => listed && onFocus(ticker)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 justify-between"
            style={{
              background: on ? "rgba(232,241,250,0.10)" : "transparent",
              borderLeft: `2px solid ${on ? "#E8EDF4" : "transparent"}`,
              color: dead || !listed ? MUTED : "#E8EDF4",
            }}
          >
            <span style={{ fontSize: 13, lineHeight: "17px" }}>{nameOf(ticker)}</span>
            {!listed ? (
              <span className="flex-none" style={{ fontSize: 12, color: MUTED }}>lists {listsOn(run, ticker)}</span>
            ) : dead ? (
              <span style={{ fontSize: 12, color: MUTED }}>gone</span>
            ) : (
              <span className="flex items-center gap-1.5 flex-none">
                <span className="tnum" style={{ fontSize: 13 }}>{fmtPrice(priceAt(run, ticker))}</span>
                <Arrow trend={trendOf(run, ticker)} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
