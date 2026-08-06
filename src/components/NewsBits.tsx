import { Clipping } from "../lib/headlines";
import { fmtMoney } from "../engine/market";

// Headline clippings and the live ticker: the era talking in its own words.
// Clippings render real headlines as designed newspaper cards; the ticker
// runs the cast's prices under the stage so the market feels alive between
// moments. Text-only by design: real words, no copyrighted images.

export function ClippingCard({ clip }: { clip: Clipping }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-4 pop-in rounded-xl border border-black/10 shadow-lg overflow-hidden"
      style={{ background: "rgba(255,255,255,0.97)", width: 400, backdropFilter: "blur(10px)" }}>
      <div className="px-4 pt-2.5 pb-1 flex items-baseline justify-between border-b border-black/10">
        <span className="text-[11px] font-semibold" style={{ letterSpacing: "0.02em" }}>{clip.source}</span>
        <span className="text-[10.5px] tnum" style={{ color: "#6e6e73" }}>{clip.date}</span>
      </div>
      <div className="px-4 py-2.5">
        <div className="text-[16px] font-bold leading-snug" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {clip.headline}
        </div>
        {clip.sub && (
          <div className="text-[11.5px] mt-1 leading-snug" style={{ color: "#3a3a3c", fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: "italic" }}>
            {clip.sub}
          </div>
        )}
      </div>
    </div>
  );
}

export interface TickerItem {
  name: string;
  price: number;
  delta: number;   // vs previous month; 0 when flat or unknown
  dead?: boolean;
  // shown instead of the price, for an asset with no market price to show
  // (a company that has not listed yet: "lists Apr 2019")
  note?: string;
}

export function Ticker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const cell = (it: TickerItem, i: number) => (
    <span key={i} className="inline-flex items-baseline gap-1.5 px-4">
      <span style={{ color: "#6e6e73" }}>{it.name}</span>
      {it.note ? (
        <span style={{ color: "#a1a1a6" }}>{it.note}</span>
      ) : it.dead ? (
        <span style={{ color: "#a1a1a6" }}>gone</span>
      ) : (
        <>
          <span className="tnum font-medium">{fmtMoney(it.price)}</span>
          {it.delta !== 0 && (
            <span className="tnum" style={{ color: it.delta > 0 ? "#248a3d" : "#d70015" }}>
              {it.delta > 0 ? "▲" : "▼"}{Math.abs(it.delta * 100).toFixed(1)}%
            </span>
          )}
        </>
      )}
    </span>
  );
  return (
    <div className="absolute left-0 right-0 bottom-0 overflow-hidden border-t border-black/5"
      style={{ height: 26, background: "rgba(255,255,255,0.65)", backdropFilter: "blur(8px)" }}>
      <style>{`
        @keyframes sg-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
      <div className="whitespace-nowrap text-[11px] leading-[26px]"
        style={{ display: "inline-block", animation: "sg-ticker 28s linear infinite" }}>
        {items.map(cell)}
        {items.map((it, i) => cell(it, i + items.length))}
      </div>
    </div>
  );
}
