import { useEffect, useMemo, useRef, useState } from "react";
import { EraAsset } from "../engine/history";
import { fmtMoney } from "../engine/market";

// Pre-run scouting deck for an era: one card per cast member, dealt as its
// own screen of the brief beat. The front shows the cast member's dot, name,
// founding (or launch) year, and starting price; the back is the scouting
// report, which holds where the cast member stands entering the era and what
// believers and doubters said at the time. A card counts as scouted once its report has
// been shown, and every way of reaching a card shows the report: tapping the
// front flips it, tapping a report advances to the next unread report, and
// the arrows, the arrow keys, and the pager dots land on a card with its
// report already open. Reading all of them unlocks the era's start button,
// which the page passes in through startSlot so the button, the pager, and
// the unlock hint all sit in one compact row under the deck.
// The deck's height is set by an invisible sizer that stacks every report in
// one grid cell, so the tallest report always fits at the current width and
// no sentence is ever clipped, on phones included.
// Everything here reads backward from the era's first month; nothing on a
// card hints at what the price does next. Series flagged as reconstructed
// say so wherever their price is shown, but the card never says why the
// series needed reconstructing: naming the delisting here would tell the
// player before the run which companies die. The why lives in the era
// briefing, which warns up front that it contains the ending.

export default function ScoutingCards({ assets, startPrices, name, onAllFlipped, startSlot, foundedLabel = "Founded" }: {
  assets: EraAsset[];
  startPrices: Record<string, number>;
  name: (ea: { name: string; real?: string }) => string;
  onAllFlipped: () => void;
  // the era's start button (and its unlock hint), rendered in the pager row
  startSlot?: React.ReactNode;
  // what the year on a card means for this era's cast: companies are
  // founded, but the crypto era passes "Launched" because coins launch
  foundedLabel?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const announced = useRef(false);
  const ea = assets[idx];
  const isBack = flipped.has(ea.id);
  const allFlipped = flipped.size >= assets.length;

  useEffect(() => {
    if (allFlipped && !announced.current) {
      announced.current = true;
      onAllFlipped();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFlipped]);

  const nextUnflipped = useMemo(() => {
    for (let d = 1; d <= assets.length; d++) {
      const j = (idx + d) % assets.length;
      if (!flipped.has(assets[j].id)) return j;
    }
    return null;
  }, [idx, flipped, assets]);

  // every navigation lands on the report side, so paging through the deck by
  // any means scouts the cards it visits and the counter always matches what
  // the player has actually been shown
  const visit = (j: number) => {
    setIdx(j);
    setFlipped((f) => {
      const n = new Set(f);
      n.add(assets[j].id);
      return n;
    });
  };
  const step = (d: number) => visit((idx + d + assets.length) % assets.length);

  // tap an unread front to flip it; tap a report to move to the next unread
  const tap = () => {
    if (!isBack) {
      setFlipped((f) => new Set(f).add(ea.id));
    } else if (nextUnflipped !== null) {
      visit(nextUnflipped);
    } else {
      step(1);
    }
  };

  // arrow keys page through the deck while it is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, flipped, assets]);

  const price = startPrices[ea.id] ?? 0;
  const faceStyle: React.CSSProperties = {
    position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", background: "#fff",
    boxShadow: "0 10px 24px -14px rgba(24,34,60,0.28)",
  };

  // one card's report, rendered both on the live back face and inside the
  // hidden sizer that gives the deck its height
  const report = (a: EraAsset) => (
    <>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 flex-shrink-0">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 self-center" style={{ background: a.color }} />
        <span className="text-[14px] font-semibold tracking-tight">{name(a)}</span>
        <span className="ml-auto text-[11.5px] tnum" style={{ color: "#6e6e73" }}>{foundedLabel} {a.founded} · starts at {fmtMoney(startPrices[a.id] ?? 0)}{a.reconstructed ? " · reconstructed series" : ""}</span>
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-1.5 pr-1">
        <p className="text-[12.5px] leading-snug" style={{ color: "#3a3a3c" }}>{a.history}</p>
        <div>
          <div className="text-[11px] font-semibold" style={{ color: "#248a3d" }}>Believers say</div>
          <p className="text-[12.5px] leading-snug" style={{ color: "#3a3a3c" }}>{a.believers}</p>
        </div>
        <div>
          <div className="text-[11px] font-semibold" style={{ color: "#d70015" }}>Doubters say</div>
          <p className="text-[12.5px] leading-snug" style={{ color: "#3a3a3c" }}>{a.doubters}</p>
        </div>
        {a.reconstructedNote && (
          <p className="text-[11px] leading-snug" style={{ color: "#6e6e73" }}>{a.reconstructedNote}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-[11.5px] font-medium" style={{ color: "#0071e3" }}>
        {allFlipped ? "The deck is done. The start button is open." : "Tap for the next card"}
      </div>
    </>
  );

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12px] font-semibold" style={{ color: "#6e6e73" }}>Scout the menu before you start</span>
        <span className="text-[12px] tnum" style={{ color: allFlipped ? "#248a3d" : "#6e6e73" }}>
          {allFlipped ? "Every card is scouted." : `Scouted ${flipped.size} of ${assets.length}`}
        </span>
      </div>

      <div style={{ perspective: 1200, display: "grid" }}>
        {/* invisible sizers: every report shares one grid cell, so the cell
            is always as tall as the tallest report at this width and no card
            ever clips a sentence */}
        {assets.map((a) => (
          <div key={a.id} aria-hidden
            style={{ gridArea: "1 / 1", visibility: "hidden", pointerEvents: "none", border: "1px solid transparent", minHeight: 244 }}
            className="px-5 py-3 flex flex-col gap-2">
            {report(a)}
          </div>
        ))}
        <button onClick={tap} className="block w-full text-left" style={{ gridArea: "1 / 1", position: "relative" }}
          aria-label={isBack ? `Scouting report for ${name(ea)}. Tap for the next card.` : `Flip the card for ${name(ea)}.`}>
          <div style={{
            position: "absolute", inset: 0, transformStyle: "preserve-3d",
            transition: "transform 0.45s cubic-bezier(.3,1.1,.35,1)",
            transform: isBack ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>
            {/* front: who is on the menu */}
            <div style={faceStyle} className="flex flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="w-9 h-9 rounded-full" style={{ background: ea.color, boxShadow: `0 0 0 6px ${ea.color}22, 0 6px 14px -6px ${ea.glow}` }} />
              <div className="text-[17px] font-semibold tracking-tight mt-1">{name(ea)}</div>
              <div className="text-[12.5px]" style={{ color: "#6e6e73" }}>{ea.desc}</div>
              <div className="flex gap-4 mt-1 text-[12.5px] tnum" style={{ color: "#3a3a3c" }}>
                <span><span style={{ color: "#6e6e73" }}>{foundedLabel} </span>{ea.founded}</span>
                <span><span style={{ color: "#6e6e73" }}>Starts at </span>{fmtMoney(price)}</span>
              </div>
              {ea.reconstructed && (
                <div className="text-[10.5px]" style={{ color: "#6e6e73" }}>
                  Its price series is reconstructed from the dated record.
                </div>
              )}
              <div className="text-[12px] font-medium mt-2" style={{ color: "#0071e3" }}>Tap to read the scouting report</div>
            </div>
            {/* back: the report, as it read at the time */}
            <div style={{ ...faceStyle, transform: "rotateY(180deg)" }} className="px-5 py-3 flex flex-col gap-2">
              {report(ea)}
            </div>
          </div>
        </button>
      </div>

      {/* one row holds the pager and the start button, so both are visible
          without scrolling on a laptop screen */}
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 mt-2.5 ${startSlot ? "" : "justify-center"}`}>
        <button onClick={() => step(-1)} aria-label="previous card"
          className="w-7 h-7 rounded-full bg-white border border-black/10 shadow-sm hover:bg-black/5 transition text-[14px] leading-none"
          style={{ color: "#6e6e73" }}>‹</button>
        <div className="flex items-center gap-1.5">
          {assets.map((a, i) => (
            <button key={a.id} onClick={() => visit(i)} aria-label={`card ${i + 1}`}
              className="rounded-full transition"
              style={{
                width: i === idx ? 9 : 7, height: i === idx ? 9 : 7,
                background: flipped.has(a.id) ? a.color : "rgba(0,0,0,0.14)",
                boxShadow: i === idx ? "0 0 0 2px rgba(0,113,227,0.35)" : undefined,
              }} />
          ))}
        </div>
        <button onClick={() => step(1)} aria-label="next card"
          className="w-7 h-7 rounded-full bg-white border border-black/10 shadow-sm hover:bg-black/5 transition text-[14px] leading-none"
          style={{ color: "#6e6e73" }}>›</button>
        {startSlot && <div className="ml-auto flex items-center gap-3">{startSlot}</div>}
      </div>
    </div>
  );
}
