import { useEffect, useRef, useState } from "react";
import { useSim } from "../lib/useSim";
import { ASSETS, fmtMoney, fmtPct, Market } from "../engine/market";
import { spriteUrl, useSpriteUrls } from "../lib/sprites";
import TimeControls from "../components/TimeControls";
import Shell, { MapRow } from "../components/Shell";

interface Crop {
  id: string; name: string; ticker: string; sprite: string;
  family: string; sector: string; kind: "growth" | "income"; blurb: string;
}
// The crops you can plant. Each maps to a core asset; the (i) card ties the
// crop to its botanical family and the market sector that family stands for.
const CROPS: Crop[] = [
  { id: "nova", name: "Tomatoes", ticker: "NOVA", sprite: "p-tomato", family: "Nightshades", sector: "Technology", kind: "growth", blurb: "Fast, flashy, and blight-prone. Everyone overplants them. A growth crop: no dividend, you only profit when you harvest." },
  { id: "pepr", name: "Peppers", ticker: "PEPR", sprite: "p-pepper", family: "Nightshades", sector: "Technology", kind: "growth", blurb: "Same family as tomatoes, so the same blight takes both at once. Owning both is not real diversification." },
  { id: "volt", name: "Corn", ticker: "VOLT", sprite: "p-corn", family: "Grasses", sector: "Energy", kind: "income", blurb: "A steady staple. Drops a little harvest each season, a dividend, and keeps standing." },
  { id: "iron", name: "Pumpkins", ticker: "IRON", sprite: "p-pumpkin", family: "Gourds", sector: "Industrials", kind: "income", blurb: "Cyclical and sturdy. Pays a small yield through the season." },
  { id: "cane", name: "Berries", ticker: "CANE", sprite: "p-berry", family: "Berries", sector: "Consumer", kind: "income", blurb: "Slow to establish, then a reliable picker. Pays income each season." },
  { id: "aura", name: "Garlic", ticker: "AURA", sprite: "p-garlic", family: "Alliums", sector: "Health", kind: "income", blurb: "Defensive. Holds value when the market turns, and pays a steady yield." },
];
const cropOf = (id: string) => CROPS.find((c) => c.id === id)!;
const assetOf = (id: string) => ASSETS.find((a) => a.id === id)!;

// slot positions inside the raised bed (percent of the bed box), back row then front
const SLOTS = [
  { x: 33, y: 48 }, { x: 50, y: 44 }, { x: 67, y: 48 },
  { x: 28, y: 63 }, { x: 50, y: 60 }, { x: 72, y: 63 },
];
const GROW_DAYS = 16;
const PLANT_COST = 150;
const SPRITE_KEYS = ["bed-wide", "coop-field", "coins", "p-tomato", "p-pepper", "p-corn", "p-pumpkin", "p-berry", "p-garlic", "p-sprout"];

function MiniSpark({ data, up }: { data: number[]; up: boolean }) {
  const s = data.slice(-20);
  if (s.length < 2) return <svg width="52" height="16" />;
  const lo = Math.min(...s), hi = Math.max(...s), rng = hi - lo || 1;
  const pts = s.map((v, i) => `${(i / (s.length - 1)) * 52},${(15 - ((v - lo) / rng) * 14).toFixed(1)}`).join(" ");
  return <svg width="52" height="16"><polyline points={pts} fill="none" stroke={up ? "#5b8a4a" : "#c7502f"} strokeWidth="1.5" /></svg>;
}

export default function Garden() {
  const { m, speed, setSpeed, act, reset, done } = useSim({ seed: 42, cash: 1000, maxStep: 150 });
  const [planted, setPlanted] = useState<Record<string, number>>({});
  const [market, setMarket] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [coins, setCoins] = useState<{ key: number; slot: number; amt: string }[]>([]);
  const coinKey = useRef(0);
  const lastDiv = useRef(0);
  const urls = useSpriteUrls(SPRITE_KEYS);
  const sp = (k: string) => urls[k] || spriteUrl(k);

  const nw = m.netWorth();
  const pnl = (nw - m.start) / m.start;
  const benchPnl = (m.benchmark - m.start) / m.start;
  const ev = m.activeEvent();
  const affected = (sector: string) => !!ev && (ev.scope === "market" || ev.scope === sector);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(""), 1800); };

  // which bed slot each holding occupies (assigned on plant, stable)
  const order = Object.keys(planted).sort((a, b) => planted[a] - planted[b]);
  const slotOf = (id: string) => order.indexOf(id);

  const buy = (id: string) => {
    const cost = Math.min(PLANT_COST, m.cash);
    if (cost < 10) { flash("Not enough coins"); return; }
    const already = !!m.holdings[id];
    act((mk) => mk.buy(id, cost));
    if (!already) setPlanted((p) => (Object.keys(p).length >= SLOTS.length ? p : { ...p, [id]: m.step }));
    flash(`Planted ${cropOf(id).name}. That is a buy of ${fmtMoney(cost)}.`);
    if (speed === 0) setSpeed(1);
  };
  const harvest = (id: string) => {
    const h = m.holdings[id];
    if (!h) return;
    const proceeds = h.shares * m.prices[id];
    act((mk) => mk.sellFraction(id, 1));
    setPlanted((p) => { const n = { ...p }; delete n[id]; return n; });
    flash(`Harvested ${cropOf(id).name} for ${fmtMoney(proceeds)}. That is a sell.`);
  };

  // dividend coins from income crops
  useEffect(() => {
    if (m.step > 0 && m.step % 12 === 0 && m.step !== lastDiv.current) {
      lastDiv.current = m.step;
      const drops: { key: number; slot: number; amt: string }[] = [];
      for (const id of order) {
        const c = cropOf(id), h = m.holdings[id];
        if (c.kind === "income" && h) drops.push({ key: coinKey.current++, slot: slotOf(id), amt: fmtMoney(h.shares * m.prices[id] * assetOf(id).yield) });
      }
      if (drops.length) { setCoins((x) => [...x, ...drops]); setTimeout(() => setCoins((x) => x.filter((d) => !drops.find((n) => n.key === d.key))), 1200); }
    }
  }, [m.step]);

  const growth = (id: string) => { const s = planted[id]; return s == null || !m.holdings[id] ? 0 : Math.min(1, Math.max(0.18, (m.step - s) / GROW_DAYS)); };
  const coopH = m.holdings["coop"];

  return (
    <Shell title="Share Garden" tag="the gardening bet" accent="#7fb069"
      blurb="One bed. Go to market to plant. Tend, harvest, repeat."
      aside={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-[11px] tracking-[0.03em] font-medium text-white/40 mb-3">The translation</div>
          <MapRow left="Open the market" right="the exchange" color="#9bd45f" />
          <MapRow left="Plant a seed" right="buy a stock" color="#9bd45f" />
          <MapRow left="Harvest" right="sell a position" color="#9bd45f" />
          <MapRow left="Fruit that keeps giving" right="dividends" color="#cf9d3f" />
          <MapRow left="The co-op field" right="an index fund" color="#7ee0c0" />
          <MapRow left="One botanical family" right="a sector" color="#ff8a94" />
          <p className="mt-4 text-xs text-white/45 leading-relaxed">You have one bed. Everything you own grows in it together, so you feel your whole portfolio at a glance. The market is a screen you visit to buy, exactly like a real exchange. Each crop's card ties its family to the market sector it stands for.</p>
        </div>
      }>
      <div className="device device-landscape flex flex-col select-none" style={{ background: "linear-gradient(#bfe3ea 0%, #cfe9df 30%, #a9c47f 30%, #86a85f 100%)" }}>
        {/* HUD */}
        <div className="h-11 flex items-center gap-3 px-4 flex-shrink-0" style={{ background: "rgba(43,32,24,0.85)" }}>
          <div className="flex items-center gap-1.5">
            <img src={sp("coins")} className="h-6 w-6" alt="" style={{ imageRendering: "pixelated" }} />
            <span className="text-[15px] font-semibold text-[#ffe6a8] tnum">{fmtMoney(m.cash)}</span>
          </div>
          <div className="h-5 w-px bg-white/15" />
          <div className="text-white/90 text-[13px]">Garden worth <span className="font-semibold tnum text-white">{fmtMoney(nw)}</span></div>
          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium tnum" style={{ background: pnl >= 0 ? "#9bd45f22" : "#ff8a9422", color: pnl >= 0 ? "#bfe89a" : "#ff8a94" }}>{fmtPct(pnl)}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-white/55 tnum hidden sm:inline">co-op pace {fmtPct(benchPnl)}</span>
            <TimeControls speed={speed} setSpeed={setSpeed} step={m.step} accent="#9bd45f" compact />
          </div>
        </div>

        {/* scene */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute top-3 right-6 h-9 w-9 rounded-full" style={{ background: "radial-gradient(circle,#fff3c4,#ffd97a)", boxShadow: "0 0 26px #ffe9a6" }} />
          <div className="absolute inset-x-0 bottom-0 top-[30%] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(92deg, rgba(70,96,44,0.16) 0 2px, transparent 2px 54px)", maskImage: "linear-gradient(to bottom, transparent, #000 40%)", WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 40%)" }} />

          {/* the one raised bed */}
          <div className="absolute" style={{ left: "6%", bottom: "8%", width: "440px" }}>
            <img src={sp("bed-wide")} className="w-full" alt="" style={{ imageRendering: "pixelated" }} />
            {/* plants growing in the bed */}
            {order.map((id) => {
              const c = cropOf(id), g = growth(id), slot = slotOf(id);
              const pos = SLOTS[slot] ?? SLOTS[0];
              const h = m.holdings[id]; if (!h) return null;
              const value = h.shares * m.prices[id];
              const wilt = affected(assetOf(id).sector);
              const coin = coins.find((cn) => cn.slot === slot);
              return (
                <button key={id} onClick={() => harvest(id)} className="absolute" title={`Harvest ${c.name}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: "26%", transform: "translate(-50%,-100%)", zIndex: 10 + slot }}>
                  <img src={sp(g < 0.4 ? "p-sprout" : c.sprite)} className="w-full drop-shadow" alt=""
                    style={{ imageRendering: "pixelated", transformOrigin: "bottom center", transform: `scale(${0.5 + g * 0.5}) ${wilt ? "rotate(-4deg)" : ""}`, filter: wilt ? "grayscale(0.55) brightness(0.82)" : "none", transition: "transform .5s, filter .5s" }} />
                  {g >= 1 && <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1 py-px rounded-full text-[8px] font-bold text-black" style={{ background: "#ffe08a" }}>ripe</div>}
                  {coin && <div className="absolute -top-3 left-1/2 -translate-x-1/2 float-coin"><span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#ffcf8a] whitespace-nowrap" style={{ background: "rgba(43,32,24,0.85)" }}>+{coin.amt}</span></div>}
                </button>
              );
            })}
          </div>

          {/* market / plant button */}
          <button onClick={() => setMarket(true)} className="absolute -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold text-[#26331c] shadow-lg hover:brightness-105 z-30" style={{ background: "#bfe07a", left: "27%", top: "8px" }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1 L6 9 M2.5 5.5 L6 9 L9.5 5.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Go to market
          </button>

          {/* co-op field (index) */}
          <button onClick={() => (coopH ? harvest("coop") : buyCoop())} className="absolute right-[3%] bottom-[9%] group" style={{ width: "150px" }}>
            <div style={{ filter: affected("index") ? "grayscale(0.4) brightness(0.85)" : "none" }}>
              <img src={sp("coop-field")} className="w-full drop-shadow-lg" alt="" style={{ imageRendering: "pixelated", opacity: coopH ? 1 : 0.92 }} />
              {!coopH && <div className="absolute inset-0 grid place-items-center"><span className="px-2 py-1 rounded-full text-[10px] font-semibold text-black animate-pulse" style={{ background: "#7ee0c0" }}>buy into the co-op</span></div>}
            </div>
            <div className="text-center -mt-1">
              <div className="text-[11px] font-semibold text-[#243b32]">Co-op field</div>
              {coopH ? <div className="text-[11px] font-semibold tnum" style={{ color: "#1c5c48" }}>{fmtMoney(coopH.shares * m.prices["coop"])}</div> : <div className="text-[9px] text-[#243b32]/70">the index. it tends itself.</div>}
            </div>
          </button>

          {ev && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] pop-in shadow-lg" style={{ background: "rgba(43,32,24,0.92)" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff8a94" }} />
              <span className="font-semibold text-white">{ev.label}.</span>
              <span className="text-white/70">{ev.blurb}</span>
            </div>
          )}
          {toast && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full text-[11px] font-medium text-white pop-in" style={{ background: "rgba(28,46,36,0.94)" }}>{toast}</div>}
        </div>

        {/* footer */}
        <div className="h-9 flex items-center gap-4 px-4 text-[10px] flex-shrink-0" style={{ background: "rgba(43,32,24,0.9)" }}>
          <span className="text-white/45">tap a ripe crop to</span>
          <span className="text-[#ffcf8a] font-medium">harvest (sell)</span>
          <span className="text-white/30">/ income crops drop coins each season</span>
          <span className="ml-auto text-white/45 tnum">dividends {fmtMoney(m.dividendsCollected)}</span>
        </div>

        {/* MARKET screen */}
        {market && <MarketScreen m={m} sp={sp} info={info} setInfo={setInfo} onBuy={buy} onClose={() => setMarket(false)} />}

        {done && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={reset}>
            <div className="text-center pop-in">
              <div className="text-white/60 text-sm">The season is over. Time for the great harvest.</div>
              <div className="text-4xl font-semibold text-white tnum my-2">{fmtMoney(nw)}</div>
              <div className="tnum mb-2" style={{ color: pnl >= benchPnl ? "#bfe89a" : "#ff8a94" }}>your garden {fmtPct(pnl)} / co-op field {fmtPct(benchPnl)}</div>
              <div className="text-xs text-white/55 max-w-[280px] mx-auto">{pnl >= benchPnl ? "You beat the co-op field this run. Rare. Most seasons, patience wins." : "The co-op field you left alone out-yielded the crops you fussed over. That is the whole game."}</div>
              <button className="mt-5 px-5 py-2 rounded-full text-sm font-semibold text-black" style={{ background: "#9bd45f" }}>Plant a new season</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );

  function buyCoop() { const cost = Math.min(250, m.cash); if (cost < 10) { flash("Not enough coins"); return; } act((mk) => mk.buy("coop", cost)); flash(`Bought into the co-op field. That is the index.`); if (speed === 0) setSpeed(1); }
}

function MarketScreen({ m, sp, info, setInfo, onBuy, onClose }: {
  m: Market; sp: (k: string) => string; info: string | null; setInfo: (s: string | null) => void; onBuy: (id: string) => void; onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: "#efe6d3" }}>
      <div className="h-11 flex items-center px-4 flex-shrink-0" style={{ background: "#2a2018" }}>
        <span className="font-display text-[17px] font-semibold text-[#f4efe1]">Market</span>
        <span className="ml-3 text-[11px] text-[#c9b892]">the exchange, where seeds are bought and sold</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] font-semibold text-[#ffe6a8] tnum">{fmtMoney(m.cash)}</span>
          <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-full bg-white/10 text-white/70 hover:text-white">
            <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6"><path d="M2 2 L10 10 M10 2 L2 10" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2">
        {CROPS.map((c) => {
          const price = m.prices[c.id];
          const chg = m.changePct(c.id, Math.max(1, m.step));
          const up = chg >= 0;
          const held = m.holdings[c.id];
          const open = info === c.id;
          return (
            <div key={c.id} className="rounded-xl mb-1.5 overflow-hidden" style={{ background: "#f7f1e4", border: "1px solid #e0d4bb" }}>
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="h-11 w-11 rounded-lg grid place-items-center flex-shrink-0" style={{ background: "#ece0c8" }}>
                  <img src={sp(c.sprite)} className="h-10 w-10 object-contain" alt="" style={{ imageRendering: "pixelated" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#3a2f23]">{c.name}</span>
                    <span className="text-[10px] text-[#8a7a5e] tnum">{c.ticker}</span>
                    <span className="text-[9px] px-1.5 py-px rounded-full" style={{ background: "#e6dcc4", color: "#7a6a4e" }}>{c.family} / {c.sector}</span>
                  </div>
                  <div className="text-[10px] text-[#8a7a5e]">{c.kind === "income" ? "pays dividends" : "growth, no dividend"}{held ? ` / you own ${fmtMoney(held.shares * price)}` : ""}</div>
                </div>
                <MiniSpark data={m.history[c.id]} up={up} />
                <div className="text-right w-[64px]">
                  <div className="text-[13px] font-bold text-[#3a2f23] tnum">{fmtMoney(price)}</div>
                  <div className="text-[11px] tnum" style={{ color: up ? "#3f7a3a" : "#c7502f" }}>{fmtPct(chg)}</div>
                </div>
                <button onClick={() => setInfo(open ? null : c.id)} className="h-6 w-6 grid place-items-center rounded-full flex-shrink-0" style={{ background: "#e6dcc4", color: "#7a6a4e" }} title="About this crop">
                  <span className="text-[12px] font-serif italic font-bold">i</span>
                </button>
                <button onClick={() => onBuy(c.id)} disabled={m.cash < 10} className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-[#26331c] disabled:opacity-40 flex-shrink-0" style={{ background: "#bfe07a" }}>Plant</button>
              </div>
              {open && (
                <div className="px-3 pb-2.5 pt-0.5 text-[11px] leading-relaxed text-[#5a4d3a]" style={{ background: "#f0e8d6" }}>
                  <span className="font-semibold text-[#3a2f23]">{c.name} are {c.family}, which stand for the {c.sector} sector.</span> {c.blurb}
                </div>
              )}
            </div>
          );
        })}
        <div className="text-center text-[10px] text-[#8a7a5e] py-2">Buying plants a seed in your one garden bed. Come back any time to buy more or check prices.</div>
      </div>
    </div>
  );
}
