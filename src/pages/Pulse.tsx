import { useState, useEffect } from "react";
import { useSim } from "../lib/useSim";
import { ASSETS, AssetDef, fmtMoney, fmtPct, sectorOf, Market } from "../engine/market";
import Chart from "../components/Chart";
import TimeControls from "../components/TimeControls";
import Shell, { MapRow } from "../components/Shell";

function MiniSpark({ data, up }: { data: number[]; up: boolean }) {
  const s = data.slice(-24);
  if (s.length < 2) return <svg viewBox="0 0 60 16" width="60" height="16"><line x1="0" y1="8" x2="60" y2="8" stroke={up ? "#33d17a" : "#ff5d6c"} strokeWidth="1.5" /></svg>;
  const lo = Math.min(...s), hi = Math.max(...s);
  const rng = hi - lo || 1;
  const pts = s.map((v, i) => `${(i / (s.length - 1)) * 60},${(16 - ((v - lo) / rng) * 16).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 60 16" width="60" height="16" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={up ? "#33d17a" : "#ff5d6c"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AssetRow({ a, m, onTrade }: { a: AssetDef; m: Market; onTrade: (a: AssetDef) => void }) {
  const price = m.prices[a.id];
  const chg = m.changePct(a.id, 1);
  const dayChg = m.changePct(a.id, 5);
  const up = dayChg >= 0;
  const sec = sectorOf(a.sector);
  const held = m.holdings[a.id];
  const isCrypto = a.kind === "crypto";
  return (
    <button onClick={() => onTrade(a)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition text-left">
      <div className="h-9 w-9 rounded-lg grid place-items-center text-[11px] font-bold flex-shrink-0"
        style={{ background: isCrypto ? "linear-gradient(135deg,#9b8cff33,#9b8cff11)" : sec.color + "1e", color: isCrypto ? "#b9aeffff" : sec.color, border: `1px solid ${isCrypto ? "#9b8cff44" : sec.color + "33"}` }}>
        {isCrypto ? "◈" : a.symbol.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-white tnum">{a.symbol}</span>
          {isCrypto && <span className="text-[8px] px-1 py-px rounded bg-violet/15 text-violet" style={{ background: "#9b8cff22", color: "#b9aeff" }}>crypto</span>}
          {held && <span className="text-[9px] text-white/40">held</span>}
        </div>
        <div className="text-[11px] text-white/40 truncate">{a.name}</div>
      </div>
      <MiniSpark data={m.history[a.id]} up={up} />
      <div className="text-right w-[74px]">
        <div className="text-[13px] font-semibold text-white tnum">{fmtMoney(price)}</div>
        <div className="text-[11px] tnum" style={{ color: up ? "#33d17a" : "#ff5d6c" }}>{fmtPct(dayChg)}</div>
      </div>
    </button>
  );
}

function TradeSheet({ a, m, act, onClose }: { a: AssetDef; m: Market; act: (fn: (m: Market) => void) => void; onClose: () => void }) {
  const price = m.prices[a.id];
  const held = m.holdings[a.id];
  const sec = sectorOf(a.sector);
  const [flash, setFlash] = useState("");
  const buy = (d: number) => { act((mk) => mk.buy(a.id, Math.min(d, mk.cash))); setFlash("bought"); setTimeout(() => setFlash(""), 700); };
  const sell = (f: number) => { act((mk) => mk.sellFraction(a.id, f)); setFlash("sold"); setTimeout(() => setFlash(""), 700); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div className="relative rounded-t-3xl bg-panel border-t border-white/12 p-5 pb-7 pop-in" style={{ background: "#141c2a" }} onClick={(e) => e.stopPropagation()}>
        <button aria-label="close" onClick={onClose} className="absolute top-3 right-4 h-7 w-7 grid place-items-center rounded-full bg-white/8 text-white/60 hover:text-white">
          <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6"><path d="M2 2 L10 10 M10 2 L2 10" strokeLinecap="round" /></svg>
        </button>
        <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl grid place-items-center text-sm font-bold" style={{ background: sec.color + "1e", color: sec.color, border: `1px solid ${sec.color}33` }}>{a.symbol.slice(0, 2)}</div>
          <div className="flex-1">
            <div className="text-white font-semibold">{a.symbol} <span className="text-white/40 font-normal text-sm">{a.name}</span></div>
            <div className="text-xs text-white/45">{sec.label} {a.kind === "crypto" ? "/ crypto" : "/ equity"} {a.payout === "income" ? "/ pays dividends" : ""}</div>
          </div>
          <div className="text-right"><div className="text-white font-semibold tnum">{fmtMoney(price)}</div></div>
        </div>
        {held && <div className="text-xs text-white/50 mb-3 tnum">You hold {held.shares.toFixed(2)} shares worth {fmtMoney(held.shares * price)} ({fmtPct((held.shares * price - held.cost) / held.cost)})</div>}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[50, 100, 250].map((d) => <button key={d} onClick={() => buy(d)} disabled={m.cash < d} className="py-2.5 rounded-xl bg-up/15 text-up text-sm font-semibold disabled:opacity-30" style={{ background: "#33d17a1f", color: "#5fe39a" }}>+{fmtMoney(d)}</button>)}
          <button onClick={() => buy(m.cash)} disabled={m.cash < 1} className="py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30" style={{ background: "#33d17a2f", color: "#7fe9ad" }}>Max</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0.25, 0.5, 1].map((f) => <button key={f} onClick={() => sell(f)} disabled={!held} className="py-2.5 rounded-xl text-sm font-semibold disabled:opacity-25" style={{ background: "#ff5d6c1c", color: "#ff8a94" }}>Sell {f === 1 ? "all" : `${f * 100}%`}</button>)}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-white/45 tnum">Cash {fmtMoney(m.cash)}</span>
          {flash && <span className="font-medium" style={{ color: flash === "bought" ? "#5fe39a" : "#ff8a94" }}>{flash}</span>}
        </div>
      </div>
    </div>
  );
}

export default function Pulse() {
  const { m, speed, setSpeed, act, reset, done } = useSim({ seed: 71, cash: 1000, maxStep: 150 });
  const [trade, setTrade] = useState<AssetDef | null>(null);
  const [tab, setTab] = useState<"market" | "holdings">("market");
  const nw = m.netWorth();
  const pnl = (nw - m.start) / m.start;
  const benchPnl = (m.benchmark - m.start) / m.start;
  const ev = m.activeEvent();
  const positions = m.positions();

  return (
    <Shell title="Pulse" tag="no metaphor" accent="#56c7ff"
      blurb="The market as itself. The honest baseline."
      aside={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-[11px] tracking-[0.03em] font-medium text-white/40 mb-3">What it is</div>
          <p className="text-sm text-white/65 leading-relaxed mb-4">A straight, well-made trading sim. Assets read as what they are. Crypto looks and moves like crypto. The only teacher is the dashed index line you are trying to beat.</p>
          <MapRow left="Live price ticks" right="a seeded market" color="#56c7ff" />
          <MapRow left="Buy / Sell" right="build a portfolio" color="#56c7ff" />
          <MapRow left="Events" right="crash, rally, flush" color="#56c7ff" />
          <MapRow left="Dashed line" right="index benchmark" color="#7f8ba0" />
          <p className="mt-4 text-xs text-white/40 leading-relaxed">The case for it: no translation cost, instantly legible to anyone who has seen a brokerage app. The case against: it teaches by looking exactly like the apps we are trying to improve on.</p>
        </div>
      }>
      <div className="device device-portrait flex flex-col" style={{ background: "#0a0d13" }}>
        {/* status bar */}
        <div className="h-9 flex items-center justify-between px-5 text-[11px] text-white/40 tnum flex-shrink-0">
          <span>9:41</span><span className="font-semibold tracking-wide text-white/60">PULSE</span><span>day {m.step}</span>
        </div>

        {/* portfolio summary */}
        <div className="px-5 pt-1 pb-3 flex-shrink-0">
          <div className="text-[11px] text-white/45">Portfolio value</div>
          <div className="flex items-end gap-2">
            <div className="text-[34px] leading-none font-semibold text-white tnum">{fmtMoney(nw)}</div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] tnum">
            <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: pnl >= 0 ? "#33d17a1e" : "#ff5d6c1e", color: pnl >= 0 ? "#5fe39a" : "#ff8a94" }}>{fmtPct(pnl)}</span>
            <span className="text-white/40">vs index</span>
            <span style={{ color: pnl >= benchPnl ? "#5fe39a" : "#ff8a94" }}>{fmtPct(pnl - benchPnl)}</span>
          </div>
        </div>

        {/* chart */}
        <div className="px-2 flex-shrink-0 relative">
          <Chart series={m.net} benchmark={m.bench} color="#56c7ff" benchColor="#7f8ba0" height={110} baseline={m.start} />
          {positions.length === 0 && (
            <div className="absolute inset-x-0 bottom-4 text-center text-[11px] text-white/40 pointer-events-none">your line is flat until you buy. the dashed line is the index, moving without you.</div>
          )}
          {ev && (
            <div className="absolute top-1 left-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] pop-in" style={{ background: "#ff5d6c18", border: "1px solid #ff5d6c33" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff5d6c" }} />
              <span className="font-semibold text-white/85">{ev.label}</span>
              <span className="text-white/50 truncate">{ev.blurb}</span>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="px-4 py-2.5 flex items-center justify-between border-y border-white/6 flex-shrink-0">
          <TimeControls speed={speed} setSpeed={setSpeed} step={m.step} accent="#56c7ff" compact />
          <div className="text-[11px] text-white/45 tnum">cash {fmtMoney(m.cash)}</div>
        </div>

        {/* tabs */}
        <div className="flex px-4 pt-2.5 gap-4 text-[13px] flex-shrink-0">
          {(["market", "holdings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 capitalize transition ${tab === t ? "text-white border-b-2" : "text-white/40 border-b-2 border-transparent"}`} style={tab === t ? { borderColor: "#56c7ff" } : undefined}>
              {t}{t === "holdings" && positions.length ? ` (${positions.length})` : ""}
            </button>
          ))}
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
          {tab === "market" && ASSETS.filter((a) => a.kind !== "index").map((a) => <AssetRow key={a.id} a={a} m={m} onTrade={setTrade} />)}
          {tab === "holdings" && (positions.length ? positions.map((p) => <AssetRow key={p.asset.id} a={p.asset} m={m} onTrade={setTrade} />)
            : <div className="text-center text-white/35 text-sm mt-12 px-8">Nothing planted yet. Tap a name in Market, then press play and let the season run.</div>)}
          {m.dividendsCollected > 1 && tab === "holdings" && <div className="text-center text-[11px] text-white/40 mt-3 tnum">dividends collected {fmtMoney(m.dividendsCollected)}</div>}
        </div>

        {done && (
          <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={reset}>
            <div className="text-center pop-in">
              <div className="text-white/50 text-sm">Season complete</div>
              <div className="text-4xl font-semibold text-white tnum my-2">{fmtMoney(nw)}</div>
              <div className="tnum mb-1" style={{ color: pnl >= benchPnl ? "#5fe39a" : "#ff8a94" }}>{fmtPct(pnl)} you {" / "} {fmtPct(benchPnl)} index</div>
              <div className="text-xs text-white/45 max-w-[240px] mx-auto mt-2">{pnl >= benchPnl ? "You beat the index this run. Most players do not." : "The patient index fund beat you. That is the whole lesson."}</div>
              <button className="mt-5 px-5 py-2 rounded-full text-sm font-semibold text-black" style={{ background: "#56c7ff" }}>Run again</button>
            </div>
          </div>
        )}

        {trade && <TradeSheet a={trade} m={m} act={act} onClose={() => setTrade(null)} />}
      </div>
    </Shell>
  );
}
