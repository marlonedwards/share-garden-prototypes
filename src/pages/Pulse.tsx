import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSim } from "../lib/useSim";
import { MARKET, AssetDef, fmtMoney, fmtPct, sectorOf, Market } from "../engine/market";
import { groupedTreemap, TRect } from "../lib/treemap";
import TimeControls from "../components/TimeControls";
import TradePop from "../components/TradePop";
import Shell, { MapRow } from "../components/Shell";

function heat(c: number): string {
  const t = Math.max(-1, Math.min(1, c / 0.06));
  const n = [30, 40, 50];
  const tgt = t >= 0 ? [47, 200, 120] : [232, 72, 88];
  const k = Math.abs(t);
  const m = n.map((v, i) => Math.round(v + (tgt[i] - v) * k));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
const byId = (id: string) => MARKET.find((a) => a.id === id)!;

export default function Pulse() {
  const { m, speed, setSpeed, act, reset, done } = useSim({ seed: 71, cash: 1000, maxStep: 150 });
  const sceneRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 820, h: 400 });
  const [sel, setSel] = useState<AssetDef | null>(null);

  useLayoutEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDim({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setDim({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // layout is stable (by base market cap); only colors update each tick
  const rects: TRect[] = useMemo(
    () => groupedTreemap(MARKET.map((a) => ({ key: a.id, group: a.sector, value: a.marketCap })), dim.w, dim.h, 1.5),
    [dim.w, dim.h]
  );

  const nw = m.netWorth();
  const pnl = (nw - m.start) / m.start;
  const benchPnl = (m.benchmark - m.start) / m.start;
  const ev = m.activeEvent();
  const totalCap = MARKET.reduce((s, a) => s + m.liveCap(a.id), 0);

  return (
    <Shell title="Pulse" accent="#56c7ff"
      blurb="The whole market, mapped by size."
      aside={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-sm text-white/65 leading-relaxed mb-4">Every tile is a company, and sectors cluster together.</p>
          <MapRow left="Tile size" right="market cap" color="#56c7ff" />
          <MapRow left="Tile color" right="performance" color="#5fe39a" />
          <MapRow left="A block reddens" right="a sector selloff" color="#ff8a94" />
          <MapRow left="Bright border" right="you own it" color="#ffffff" />
          <p className="mt-4 text-[13px] text-white/45 leading-relaxed">Tap any tile to buy or sell.</p>
        </div>
      }>
      <div className="device device-landscape flex flex-col" style={{ background: "#0a0d13" }}>
        <div className="h-11 flex items-center gap-3 px-4 flex-shrink-0 border-b border-white/6">
          <div className="text-[16px] font-bold text-white tnum leading-tight">{fmtMoney(nw)}</div>
          <span className="px-1.5 py-0.5 rounded text-[12px] font-medium tnum" style={{ background: pnl >= 0 ? "#33d17a1e" : "#ff5d6c1e", color: pnl >= 0 ? "#5fe39a" : "#ff8a94" }}>{fmtPct(pnl)}</span>
          <span className="text-[12px] text-white/45 tnum">{fmtPct(pnl - benchPnl)} against the index</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px] text-white/45 tnum hidden sm:inline">${(totalCap / 1000).toFixed(1)}T in all</span>
            <TimeControls speed={speed} setSpeed={setSpeed} step={m.step} accent="#56c7ff" compact />
          </div>
        </div>

        <div ref={sceneRef} className="relative flex-1 min-h-0" style={{ background: "#0a0d13" }}>
          {rects.map((r) => {
            const a = byId(r.key);
            const chg = m.changePct(a.id, Math.max(1, m.step));
            const held = m.holdings[a.id];
            const big = r.w > 62 && r.h > 44;
            const mid = r.w > 44 && r.h > 24;
            return (
              <button key={r.key} onClick={() => setSel(a)}
                className="absolute overflow-hidden text-left"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: heat(chg), outline: held ? "2px solid rgba(255,255,255,0.9)" : "1px solid rgba(0,0,0,0.35)", outlineOffset: held ? "-2px" : "-0.5px", zIndex: held ? 2 : 1 }}>
                {mid && (
                  <div className="px-1 pt-0.5 leading-tight">
                    <div className="text-[12px] font-bold text-white/95 tnum">{a.symbol}</div>
                    {big && <div className="text-[12px] text-white/80 tnum">{fmtPct(chg)}</div>}
                  </div>
                )}
                {held && big && <div className="absolute bottom-0.5 right-1 text-[12px] font-bold text-white tnum">{fmtMoney(held.shares * m.prices[a.id])}</div>}
              </button>
            );
          })}

          {ev && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] pop-in shadow-lg" style={{ background: "rgba(10,13,19,0.9)", border: "1px solid #ff5d6c44" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff5d6c" }} />
              <span className="font-semibold text-white/90">{ev.label}</span>
              <span className="text-white/55 truncate max-w-[420px]">{ev.blurb}</span>
            </div>
          )}
          {m.positions().length === 0 && m.step < 2 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="px-3 py-1.5 rounded-full text-[13px] text-white/80" style={{ background: "rgba(10,13,19,0.7)" }}>Tap a tile to buy.</div>
            </div>
          )}
        </div>

        <div className="h-9 flex items-center gap-4 px-4 flex-shrink-0 border-t border-white/6 text-[12px] text-white/45">
          <span>A bigger tile is a bigger company.</span>
          <span className="text-[#5fe39a]">Green is up.</span>
          <span className="text-[#ff8a94]">Red is down.</span>
          <span className="ml-auto tnum">{fmtMoney(m.cash)} in cash</span>
        </div>

        {sel && <TradePop a={sel} m={m} act={act} onClose={() => setSel(null)} />}
        {done && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={reset}>
            <div className="text-center pop-in">
              <div className="text-white/55 text-sm">The season is over.</div>
              <div className="text-4xl font-bold text-white tnum my-2">{fmtMoney(nw)}</div>
              <div className="tnum mb-1 text-[13px]" style={{ color: pnl >= benchPnl ? "#5fe39a" : "#ff8a94" }}>You {fmtPct(pnl)}, the index {fmtPct(benchPnl)}</div>
              <div className="text-[13px] text-white/50 max-w-[260px] mx-auto mt-1">{pnl >= benchPnl ? "You beat the index this run." : "The index beat your picks."}</div>
              <button className="mt-5 px-5 py-2 rounded-full text-sm font-semibold text-black" style={{ background: "#56c7ff" }}>Run again</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
