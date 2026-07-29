import { useEffect } from "react";
import { AssetDef, fmtMoney, fmtPct, sectorOf, Market } from "../engine/market";

// Shared buy/sell popover used by the market-cap views (Pulse, Prism).
export default function TradePop({ a, m, act, onClose, accent = "#56c7ff" }: {
  a: AssetDef; m: Market; act: (fn: (m: Market) => void) => void; onClose: () => void; accent?: string;
}) {
  const price = m.prices[a.id];
  const held = m.holdings[a.id];
  const sec = sectorOf(a.sector);
  const chg = m.changePct(a.id, Math.max(1, m.step));
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-30 grid place-items-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
      <div className="relative w-[300px] rounded-2xl border border-white/12 p-4 pop-in" style={{ background: "#141c2a" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: sec.color }} />
          <span className="text-white font-semibold">{a.symbol}</span>
          <span className="text-white/45 text-sm truncate">{a.name}</span>
          <span className="ml-auto text-sm tnum" style={{ color: chg >= 0 ? "#5fe39a" : "#ff8a94" }}>{fmtPct(chg)}</span>
        </div>
        <div className="text-xs text-white/45 mb-3">{sec.label} {a.kind === "crypto" ? "/ crypto" : "/ equity"} / cap {fmtMoney(m.liveCap(a.id))}B</div>
        {held && <div className="text-xs text-white/55 mb-2 tnum">You hold {fmtMoney(held.shares * price)} ({fmtPct((held.shares * price - held.cost) / held.cost)})</div>}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[100, 250, 500].map((d) => <button key={d} onClick={() => act((mk) => mk.buy(a.id, Math.min(d, mk.cash)))} disabled={m.cash < d} className="py-2 rounded-lg text-xs font-semibold disabled:opacity-30" style={{ background: "#33d17a1f", color: "#5fe39a" }}>+{d}</button>)}
          <button onClick={() => act((mk) => mk.buy(a.id, mk.cash))} disabled={m.cash < 1} className="py-2 rounded-lg text-xs font-semibold disabled:opacity-30" style={{ background: "#33d17a2f", color: "#7fe9ad" }}>Max</button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[0.5, 1].map((f) => <button key={f} onClick={() => act((mk) => mk.sellFraction(a.id, f))} disabled={!held} className="py-2 rounded-lg text-xs font-semibold disabled:opacity-25" style={{ background: "#ff5d6c1c", color: "#ff8a94" }}>Sell {f === 1 ? "all" : "half"}</button>)}
        </div>
        <div className="mt-3 text-[11px] text-white/40 tnum">cash {fmtMoney(m.cash)}</div>
      </div>
    </div>
  );
}
