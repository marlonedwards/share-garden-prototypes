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
    <Shell title="Pulse" tag="the whole market" accent="#56c7ff"
      blurb="The entire market, mapped by size. Tap to buy."
      aside={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-[11px] tracking-[0.03em] font-medium text-white/40 mb-3">What it is</div>
          <p className="text-sm text-white/65 leading-relaxed mb-4">The market as a single living map. Every tile is a company; its area is its market cap, its color is how it is doing right now. Sectors cluster together, so you see money rotate between them and watch a shock sweep a whole block red.</p>
          <MapRow left="Tile size" right="market cap" color="#56c7ff" />
          <MapRow left="Tile color" right="performance" color="#5fe39a" />
          <MapRow left="A block reddens" right="a sector selloff" color="#ff8a94" />
          <MapRow left="Bright border" right="you own it" color="#ffffff" />
          <p className="mt-4 text-xs text-white/40 leading-relaxed">Tap any tile to buy or sell. The whole map turns red in the Storm, and the biggest tiles move the index most.</p>
        </div>
      }>
      <div className="device device-landscape flex flex-col" style={{ background: "#0a0d13" }}>
        <div className="h-11 flex items-center gap-3 px-4 flex-shrink-0 border-b border-white/6">
          <div>
            <div className="text-[10px] text-white/40 leading-none">Portfolio</div>
            <div className="text-[16px] font-semibold text-white tnum leading-tight">{fmtMoney(nw)}</div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium tnum" style={{ background: pnl >= 0 ? "#33d17a1e" : "#ff5d6c1e", color: pnl >= 0 ? "#5fe39a" : "#ff8a94" }}>{fmtPct(pnl)}</span>
          <span className="text-[11px] text-white/40 tnum">vs index {fmtPct(pnl - benchPnl)}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-white/40 tnum hidden sm:inline">mkt cap ${(totalCap / 1000).toFixed(1)}T</span>
            <TimeControls speed={speed} setSpeed={setSpeed} step={m.step} accent="#56c7ff" compact />
          </div>
        </div>

        <div ref={sceneRef} className="relative flex-1 min-h-0" style={{ background: "#0a0d13" }}>
          {rects.map((r) => {
            const a = byId(r.key);
            const chg = m.changePct(a.id, Math.max(1, m.step));
            const held = m.holdings[a.id];
            const big = r.w > 54 && r.h > 30;
            const mid = r.w > 34 && r.h > 20;
            return (
              <button key={r.key} onClick={() => setSel(a)}
                className="absolute overflow-hidden text-left"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: heat(chg), outline: held ? "2px solid rgba(255,255,255,0.9)" : "1px solid rgba(0,0,0,0.35)", outlineOffset: held ? "-2px" : "-0.5px", zIndex: held ? 2 : 1 }}>
                {mid && (
                  <div className="px-1 pt-0.5 leading-none">
                    <div className="text-[10px] font-bold text-white/95 tnum">{a.symbol}</div>
                    {big && <div className="text-[9px] text-white/80 tnum">{fmtPct(chg)}</div>}
                  </div>
                )}
                {held && <div className="absolute bottom-0.5 right-1 text-[8px] font-bold text-white tnum">{fmtMoney(held.shares * m.prices[a.id])}</div>}
              </button>
            );
          })}

          {ev && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] pop-in shadow-lg" style={{ background: "rgba(10,13,19,0.9)", border: "1px solid #ff5d6c44" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff5d6c" }} />
              <span className="font-semibold text-white/90">{ev.label}</span>
              <span className="text-white/55 truncate max-w-[420px]">{ev.blurb}</span>
            </div>
          )}
          {m.positions().length === 0 && m.step < 2 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="px-3 py-1.5 rounded-full text-xs text-white/80" style={{ background: "rgba(10,13,19,0.7)" }}>tap a tile to buy, then press play to run the season</div>
            </div>
          )}
        </div>

        <div className="h-8 flex items-center gap-3 px-4 flex-shrink-0 border-t border-white/6 text-[10px] text-white/40">
          <span>bigger tile = bigger company</span>
          <span className="text-[#5fe39a]">green up</span>
          <span className="text-[#ff8a94]">red down</span>
          <span className="ml-auto tnum">cash {fmtMoney(m.cash)}</span>
        </div>

        {sel && <TradePop a={sel} m={m} act={act} onClose={() => setSel(null)} />}
        {done && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={reset}>
            <div className="text-center pop-in">
              <div className="text-white/50 text-sm">Season complete</div>
              <div className="text-4xl font-semibold text-white tnum my-2">{fmtMoney(nw)}</div>
              <div className="tnum mb-1" style={{ color: pnl >= benchPnl ? "#5fe39a" : "#ff8a94" }}>you {fmtPct(pnl)} / index {fmtPct(benchPnl)}</div>
              <div className="text-xs text-white/45 max-w-[240px] mx-auto mt-1">{pnl >= benchPnl ? "You beat the index this run. Rare." : "The whole-market index beat your picks. Usually does."}</div>
              <button className="mt-5 px-5 py-2 rounded-full text-sm font-semibold text-black" style={{ background: "#56c7ff" }}>Run again</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
