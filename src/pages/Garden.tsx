import { useEffect, useRef, useState } from "react";
import { useSim } from "../lib/useSim";
import { ASSETS, fmtMoney, fmtPct, Market } from "../engine/market";
import { spriteUrl, useSpriteUrls } from "../lib/sprites";
import TimeControls from "../components/TimeControls";
import Shell, { MapRow } from "../components/Shell";

interface Plot { id: string; sprite: string; label: string; x: number; y: number; }

// Curated garden: six cultivated crops + the co-op field. Positions are % of the scene.
const PLOTS: Plot[] = [
  { id: "nova", sprite: "tomato",    label: "Tomatoes", x: 32, y: 16 },
  { id: "volt", sprite: "corn",      label: "Corn",     x: 50, y: 11 },
  { id: "pepr", sprite: "carrot",    label: "Carrots",  x: 68, y: 17 },
  { id: "iron", sprite: "pumpkin",   label: "Pumpkins", x: 39, y: 52 },
  { id: "cane", sprite: "blueberry", label: "Berries",  x: 57, y: 49 },
  { id: "aura", sprite: "garlic",    label: "Garlic",   x: 75, y: 55 },
];
const GROW_DAYS = 16;
const PLANT_COST = 150;
const SPRITE_KEYS = ["coins", "coop-field", "bed-empty", "sprout", "tomato", "corn", "carrot", "pumpkin", "blueberry", "garlic"];

function assetById(id: string) { return ASSETS.find((a) => a.id === id)!; }

interface Coin { key: number; x: number; y: number; amt: string; }

export default function Garden() {
  const { m, speed, setSpeed, act, reset, done } = useSim({ seed: 42, cash: 1200, maxStep: 150 });
  const [planted, setPlanted] = useState<Record<string, number>>({});
  const [coins, setCoins] = useState<Coin[]>([]);
  const [toast, setToast] = useState<string>("");
  const coinKey = useRef(0);
  const lastDivStep = useRef(0);
  const urls = useSpriteUrls(SPRITE_KEYS);
  const sp = (k: string) => urls[k] || spriteUrl(k);

  const nw = m.netWorth();
  const pnl = (nw - m.start) / m.start;
  const benchPnl = (m.benchmark - m.start) / m.start;
  const ev = m.activeEvent();
  const affected = (sector: string) => !!ev && (ev.scope === "market" || ev.scope === sector);

  // dividend coins: income crops drop a coin every 12 days
  useEffect(() => {
    if (m.step > 0 && m.step % 12 === 0 && m.step !== lastDivStep.current) {
      lastDivStep.current = m.step;
      const drops: Coin[] = [];
      for (const p of PLOTS) {
        const a = assetById(p.id);
        const h = m.holdings[p.id];
        if (a.payout === "income" && h && h.shares > 0) {
          drops.push({ key: coinKey.current++, x: p.x + 4, y: Math.max(24, p.y + 6), amt: fmtMoney(h.shares * m.prices[p.id] * a.yield) });
        }
      }
      const coopH = m.holdings["coop"];
      if (coopH) drops.push({ key: coinKey.current++, x: 12, y: 34, amt: fmtMoney(coopH.shares * m.prices["coop"] * assetById("coop").yield) });
      if (drops.length) {
        setCoins((c) => [...c, ...drops]);
        setTimeout(() => setCoins((c) => c.filter((x) => !drops.find((d) => d.key === x.key))), 1200);
      }
    }
  }, [m.step]);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(""), 1600); };

  const plant = (id: string) => {
    if (m.holdings[id]) return;
    const cost = Math.min(PLANT_COST, m.cash);
    if (cost < 10) { flash("Not enough coins to plant"); return; }
    act((mk) => mk.buy(id, cost));
    setPlanted((p) => ({ ...p, [id]: m.step }));
    flash(`Planted ${PLOTS.find((p) => p.id === id)?.label ?? assetById(id).crop}. That is a buy.`);
    if (speed === 0) setSpeed(1);
  };

  const harvest = (id: string) => {
    const h = m.holdings[id];
    if (!h) return;
    const proceeds = h.shares * m.prices[id];
    act((mk) => mk.sellFraction(id, 1));
    setPlanted((p) => { const n = { ...p }; delete n[id]; return n; });
    flash(`Harvested ${fmtMoney(proceeds)}. That is a sell.`);
  };

  const growth = (id: string) => {
    const s = planted[id];
    if (s == null || !m.holdings[id]) return 0;
    return Math.min(1, Math.max(0.16, (m.step - s) / GROW_DAYS));
  };

  const coopH = m.holdings["coop"];
  const coopG = coopH ? Math.min(1, Math.max(0.16, (m.step - (planted["coop"] ?? m.step)) / GROW_DAYS)) : 0;

  return (
    <Shell title="Share Garden" tag="the gardening bet" accent="#7fb069"
      blurb="A market you tend. Structure, not labor."
      aside={
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-[11px] tracking-[0.03em] font-medium text-white/40 mb-3">The translation</div>
          <MapRow left="Plant a seed" right="buy a stock" color="#9bd45f" />
          <MapRow left="Harvest" right="sell a position" color="#9bd45f" />
          <MapRow left="Fruit that keeps giving" right="dividends" color="#cf9d3f" />
          <MapRow left="The co-op field" right="an index fund" color="#7ee0c0" />
          <MapRow left="Blight on one family" right="sector risk" color="#ff8a94" />
          <MapRow left="A monoculture" right="concentration risk" color="#ff8a94" />
          <p className="mt-4 text-xs text-white/45 leading-relaxed">
            The design law: the garden models the market's structure, not a gardener's labor. Watering is contributing, not a chore.
            The co-op field grows itself and, across a full season, quietly out-yields the hot crop you kept fussing over.
          </p>
        </div>
      }>
      <div className="device device-landscape flex flex-col select-none" style={{ background: "linear-gradient(#bfe3ea 0%, #d6ecdf 42%, #a9c47f 42%, #8fae66 100%)" }}>
        {/* top HUD */}
        <div className="h-11 flex items-center gap-3 px-4 flex-shrink-0" style={{ background: "rgba(43,32,24,0.82)" }}>
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
          {/* sun */}
          <div className="absolute top-3 right-5 h-10 w-10 rounded-full" style={{ background: "radial-gradient(circle,#fff3c4,#ffd97a)", boxShadow: "0 0 30px #ffe9a6" }} />
          {/* tilled-field furrows over the ground */}
          <div className="absolute inset-x-0 bottom-0 top-[42%] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(92deg, rgba(70,96,44,0.18) 0 2px, transparent 2px 52px)", WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 45%)", maskImage: "linear-gradient(to bottom, transparent, #000 45%)" }} />
          <div className="absolute inset-x-0 bottom-0 h-6 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(60,80,38,0.5), transparent)" }} />

          {/* co-op field (the index) */}
          <button onClick={() => (coopH ? harvest("coop") : plant("coop"))}
            className="absolute z-[5] group" style={{ left: "3%", top: "30%", width: "170px" }}>
            <div className="relative" style={{ filter: affected("index") ? "grayscale(0.4) brightness(0.85)" : "none", transition: "filter .5s" }}>
              <img src={sp("coop-field")} className="w-full drop-shadow-lg" alt="" style={{ imageRendering: "pixelated", transform: `scale(${coopH ? 0.85 + coopG * 0.15 : 0.8})`, transformOrigin: "bottom center", opacity: coopH ? 1 : 0.9 }} />
              {!coopH && <div className="absolute inset-0 grid place-items-center"><span className="px-2 py-1 rounded-full text-[11px] font-semibold text-black animate-pulse" style={{ background: "#7ee0c0" }}>plant the co-op field</span></div>}
            </div>
            <div className="text-center -mt-1">
              <div className="text-[11px] font-semibold text-[#2a3b34] drop-shadow">Co-op field</div>
              {coopH && <div className="text-[11px] font-semibold tnum" style={{ color: "#1c5c48" }}>{fmtMoney(coopH.shares * m.prices["coop"])}</div>}
              <div className="text-[9px] text-[#2a3b34]/70">the index. it tends itself.</div>
            </div>
          </button>

          {/* crop plots */}
          {PLOTS.map((p) => {
            const a = assetById(p.id);
            const h = m.holdings[p.id];
            const g = growth(p.id);
            const value = h ? h.shares * m.prices[p.id] : 0;
            const cost = h ? h.cost : 0;
            const up = value >= cost;
            const wilt = affected(a.sector);
            const ready = g >= 1;
            return (
              <button key={p.id} onClick={() => (h ? harvest(p.id) : plant(p.id))}
                className="absolute z-[6] group" style={{ left: `${p.x}%`, top: `${p.y}%`, width: "116px" }}>
                <div className="relative" style={{ height: "96px" }}>
                  {/* empty bed base */}
                  {!h && <img src={sp("bed-empty")} className="absolute bottom-0 left-0 w-full" alt="" style={{ imageRendering: "pixelated", opacity: 0.92 }} />}
                  {/* growing crop */}
                  {h && (
                    <img src={sp(g < 0.4 ? "sprout" : p.sprite)} className="absolute bottom-0 left-0 w-full drop-shadow-md" alt=""
                      style={{ imageRendering: "pixelated", transformOrigin: "bottom center",
                        transform: `scale(${0.55 + g * 0.45}) ${wilt ? "rotate(-4deg)" : ""}`,
                        filter: wilt ? "grayscale(0.6) brightness(0.8)" : "none", transition: "transform .5s, filter .5s" }} />
                  )}
                  {!h && <div className="absolute inset-0 grid place-items-center"><span className="h-6 w-6 rounded-full grid place-items-center text-black text-lg font-bold animate-pulse" style={{ background: "#e9f0c9cc" }}>+</span></div>}
                  {ready && <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full text-[9px] font-bold text-black pop-in" style={{ background: "#ffe08a" }}>ready</div>}
                </div>
                <div className="text-center leading-tight">
                  <div className="text-[10px] font-semibold text-[#2a3b34]">{p.label}</div>
                  {h && <div className="text-[10px] font-semibold tnum" style={{ color: up ? "#1c5c48" : "#a3373f" }}>{fmtMoney(value)} {up ? "" : "↓"}</div>}
                  {h && a.payout === "income" && <div className="text-[8px] text-[#8a6a1e]">drops fruit</div>}
                </div>
              </button>
            );
          })}

          {/* floating dividend coins */}
          {coins.map((c) => (
            <div key={c.key} className="absolute z-20 float-coin pointer-events-none" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow" style={{ background: "rgba(43,32,24,0.85)" }}>
                <img src={sp("coins")} className="h-4 w-4" alt="" style={{ imageRendering: "pixelated" }} />
                <span className="text-[11px] font-bold text-[#ffcf8a] tnum">+{c.amt}</span>
              </div>
            </div>
          ))}

          {/* event banner */}
          {ev && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] pop-in shadow-lg" style={{ background: "rgba(43,32,24,0.92)" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#ff8a94" }} />
              <span className="font-semibold text-white">{ev.label}.</span>
              <span className="text-white/70">{ev.blurb}</span>
            </div>
          )}

          {/* toast */}
          {toast && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full text-[11px] font-medium text-white pop-in" style={{ background: "rgba(28,46,36,0.94)" }}>{toast}</div>}
        </div>

        {/* footer legend */}
        <div className="h-9 flex items-center gap-4 px-4 text-[10px] flex-shrink-0" style={{ background: "rgba(43,32,24,0.9)" }}>
          <span className="text-white/45">tap a bed to</span>
          <span className="text-[#bfe89a] font-medium">plant (buy)</span>
          <span className="text-white/30">or</span>
          <span className="text-[#ffcf8a] font-medium">harvest (sell)</span>
          <span className="text-white/30">/ income crops</span>
          <span className="text-[#ffcf8a]">drop coins</span>
          <span className="ml-auto text-white/45 tnum">dividends {fmtMoney(m.dividendsCollected)}</span>
        </div>

        {done && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={reset}>
            <div className="text-center pop-in">
              <div className="text-white/60 text-sm">The season is over. Time for the great harvest.</div>
              <div className="text-4xl font-semibold text-white tnum my-2">{fmtMoney(nw)}</div>
              <div className="tnum mb-2" style={{ color: pnl >= benchPnl ? "#bfe89a" : "#ff8a94" }}>your garden {fmtPct(pnl)} {" / "} co-op field {fmtPct(benchPnl)}</div>
              <div className="text-xs text-white/55 max-w-[280px] mx-auto">{pnl >= benchPnl ? "You beat the co-op field this run. Rare. Most seasons, patience wins." : "The co-op field you left alone out-yielded the crops you fussed over. That is the whole game."}</div>
              <button className="mt-5 px-5 py-2 rounded-full text-sm font-semibold text-black" style={{ background: "#9bd45f" }}>Plant a new season</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
