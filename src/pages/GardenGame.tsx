import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ASSETS, MarketEvent, fmtMoney } from "../engine/market";
import { useSim } from "../lib/useSim";
import { roundPcts } from "../lib/orbModel";
import { GrowthChart, Sparkline, SpeedBtn } from "../components/OrbUI";

// Share Garden under the metaphor law, on an isometric grid. Plots never
// grow; only the plants in them do, because plant size IS the market price.
// The co-op field holds one plot of every crop in town, tended together.
// Frost follows the market itself and thaws as prices recover.

type Beat = "intro" | "coins" | "plant" | "meetCoop" | "run1" | "warn" | "frost" | "run2" | "end";

const END_STEP = 144;

interface Crop {
  id: string;
  crop: string;
  sprite: string;
  color: string;
  isLike: string;
  goal: string;
}

const CROPS: Crop[] = [
  { id: "nova", crop: "Tomato",  sprite: "plant-tomato",  color: "#ff453a",
    isLike: "Tomatoes are like fast-growing tech stocks: big jumps, big drops, no baskets.",
    goal: "Plant these if you want fast growth and can handle scary drops." },
  { id: "iron", crop: "Pumpkin", sprite: "plant-pumpkin", color: "#ff9f0a",
    isLike: "Pumpkins are like steady factory stocks: slow, sturdy, and they drop harvest baskets.",
    goal: "Plant these if you want calm growers and baskets while you wait." },
  { id: "volt", crop: "Corn",    sprite: "plant-corn",    color: "#ffd60a",
    isLike: "Corn is like an energy stock: medium swings, and baskets all season long.",
    goal: "Plant these if you want some growth plus baskets along the way." },
  { id: "cane", crop: "Berry",   sprite: "plant-berry",   color: "#0a84ff",
    isLike: "Berries are like everyday grocery stocks: gentle movers that still drop harvest baskets.",
    goal: "Plant these if you want few surprises and dependable harvest baskets." },
];

const GARDEN_EVENTS: MarketEvent[] = [
  { atStep: 26, days: 5,  drift: 0.012,  vol: 0.010, scope: "tech",     label: "Tomato craze",  blurb: "Everyone in town wants tomato plants. Prices are running hot." },
  { atStep: 48, days: 7,  drift: -0.055, vol: 0.038, scope: "market",   label: "A hard frost",  blurb: "A deep frost settles over every garden at once." },
  { atStep: 74, days: 6,  drift: -0.028, vol: 0.018, scope: "consumer", label: "Berry glut",    blurb: "Too many berries this season. Prices sag." },
  { atStep: 96, days: 6,  drift: -0.030, vol: 0.015, scope: "tech",     label: "Tomato blight", blurb: "A blight spreads through the tomato rows." },
  { atStep: 116, days: 16, drift: 0.022, vol: 0.010, scope: "market",   label: "Warm spell",    blurb: "Warm weeks. Every garden is filling back in." },
];

const SP = (name: string) => `${import.meta.env.BASE_URL}sprites/gpt/plants/t/${name}.png`;
const SG = (name: string) => `${import.meta.env.BASE_URL}sprites/gpt/t/${name}.png`;

// plant size IS the price
const plantH = (price: number) => Math.max(24, Math.min(120, 18 + price * 0.55));

// ---- Stardew-flavored UI atoms ------------------------------------------
const INK = "#3d2f1f", SUB = "#8a7355", WOOD = "#6b543c", PARCH = "#fdf6e3", GREEN = "#3f6b3a";

function GCard({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`pop-in rounded-xl p-5 ${wide ? "w-full" : ""}`}
      style={{ background: PARCH, border: `2px solid ${WOOD}`, boxShadow: "4px 4px 0 rgba(107,84,60,0.22)" }}>
      <div className="font-display text-[18px] font-bold mb-1.5" style={{ color: INK }}>{title}</div>
      <div className="text-sm leading-relaxed" style={{ color: "#5a4a35" }}>{children}</div>
    </div>
  );
}
function GBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
      style={{ background: GREEN, border: "2px solid #2c4c28", boxShadow: "2px 2px 0 rgba(44,76,40,0.35)" }}>
      {children}
    </button>
  );
}
function GGhost({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition hover:brightness-105"
      style={{ background: PARCH, border: `2px solid ${WOOD}`, color: INK, boxShadow: "2px 2px 0 rgba(107,84,60,0.22)" }}>
      {children}
    </button>
  );
}
function GChip({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-2.5 py-1 rounded-md text-[12px] font-semibold transition hover:brightness-105 disabled:opacity-35 tnum"
      style={{ background: "#fffdf4", border: `1.5px solid ${WOOD}`, color: INK }}>
      {children}
    </button>
  );
}
function GToast({ children }: { children: ReactNode }) {
  return (
    <div className="pop-in rounded-lg px-5 py-3 text-[13px] text-center" style={{ background: PARCH, border: `2px solid ${WOOD}`, color: SUB }}>
      {children}
    </div>
  );
}

// ---- isometric field -----------------------------------------------------
const TW = 62, TH = 31;

function IsoField({ cols, rows, plants, frosty, label }: {
  cols: number; rows: number; frosty: boolean; label: string;
  plants: { sprite: string; h: number; key: string }[];
}) {
  const W = (cols + rows) * (TW / 2) + 40;
  const H = (cols + rows) * (TH / 2) + 140;
  const ox = rows * (TW / 2) + 20;
  const baseY = 128;
  return (
    <div className="relative" style={{ width: W, height: H }} aria-label={label}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x = ox + (c - r) * (TW / 2);
        const y = baseY + (c + r) * (TH / 2);
        return (
          <div key={`p${i}`} className="absolute" style={{
            left: x - TW / 2, top: y - TH / 2, width: TW, height: TH,
            background: frosty ? "#9d9186" : "#a5804f",
            border: `1.5px solid ${frosty ? "#7d7268" : "#7d5c33"}`,
            clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
            transition: "background 1s",
          }} />
        );
      })}
      {plants.slice(0, cols * rows).map((p, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x = ox + (c - r) * (TW / 2);
        const y = baseY + (c + r) * (TH / 2);
        return (
          <img key={p.key} src={p.sprite} alt=""
            className="absolute"
            style={{
              left: x - p.h * 0.42, top: y + 4 - p.h, height: p.h, zIndex: c + r + 1,
              transition: "height 0.7s cubic-bezier(.3,1.1,.4,1), top 0.7s cubic-bezier(.3,1.1,.4,1)",
              filter: frosty ? "saturate(0.65) brightness(0.94)" : "none",
            }} />
        );
      })}
    </div>
  );
}

export default function GardenGame() {
  const { m, speed, setSpeed, done, reset, act } = useSim({ cash: 1000, maxStep: END_STEP, events: GARDEN_EVENTS });
  const [beat, setBeat] = useState<Beat>("intro");
  const [choice, setChoice] = useState<"held" | "sold" | null>(null);
  const [tradeRow, setTradeRow] = useState<string | null>(null);
  const fired = useRef({ warn: false, frost: false });
  const endCardRef = useRef<HTMLDivElement>(null);
  const lastDiv = useRef(0);
  const benchPeak = useRef(1000);
  const [harvestToast, setHarvestToast] = useState<string | null>(null);
  const [cartFx, setCartFx] = useState<{ sprite: string; proceeds: number; key: number } | null>(null);

  const holdings = useMemo(
    () =>
      CROPS.map((c) => {
        const asset = ASSETS.find((a) => a.id === c.id)!;
        const h = m.holdings[c.id];
        return { c, asset, plants: h?.shares ?? 0, cost: h?.cost ?? 0, value: (h?.shares ?? 0) * m.prices[c.id] };
      }).filter((x) => x.plants > 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.step, m.cash, beat, tradeRow]
  );
  const invested = holdings.reduce((s, h) => s + h.value, 0);
  const pcts = roundPcts(holdings.map((h) => h.value));
  const net = m.cash + invested;
  const peak = Math.max(...m.net);
  const drawdown = peak > 0 ? (net - peak) / peak : 0;
  const ev = m.lastEvent;
  benchPeak.current = Math.max(benchPeak.current, m.benchmark);
  // winter follows the market itself, and thaws as it recovers
  const frosty = beat === "warn" || beat === "frost" || m.benchmark < benchPeak.current * 0.93;

  // dividends arrive as harvest baskets
  useEffect(() => {
    if (m.dividendsCollected > lastDiv.current + 0.5) {
      const gained = m.dividendsCollected - lastDiv.current;
      lastDiv.current = m.dividendsCollected;
      setHarvestToast(`Harvest basket · +${fmtMoney(gained)} from your income crops`);
      const t = setTimeout(() => setHarvestToast(null), 2600);
      return () => clearTimeout(t);
    }
  }, [m.dividendsCollected]);

  // beat machine
  useEffect(() => {
    const s = m.step;
    const f = fired.current;
    if (beat === "run1") {
      if (s >= 44 && !f.warn) { f.warn = true; setSpeed(0); setBeat("warn"); return; }
      if (s >= 48) f.frost = true;
      if (s >= 55) { setSpeed(0); setBeat("frost"); }
    } else if (beat === "run2") {
      if (done || s >= END_STEP) { setSpeed(0); setBeat("end"); }
    }
  });

  useEffect(() => {
    if (beat === "end") setTimeout(() => endCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 350);
  }, [beat]);

  const plant = (id: string, count: number) => {
    act((mm) => {
      const price = mm.prices[id];
      const n = Math.min(count, Math.floor(mm.cash / price));
      if (n >= 1) mm.buy(id, n * price);
    });
  };
  const transplant = (id: string, frac: number) => {
    const crop = CROPS.find((c) => c.id === id)!;
    let proceeds = 0;
    act((mm) => {
      const h = mm.holdings[id];
      if (!h) return;
      const n = Math.max(1, Math.floor(h.shares * frac + 1e-9));
      proceeds = mm.sellFraction(id, n / h.shares);
    });
    if (proceeds > 0) {
      setCartFx({ sprite: crop.sprite, proceeds, key: Date.now() });
      setTimeout(() => setCartFx(null), 1400);
    }
  };

  const keepTending = () => { setChoice("held"); setBeat("run2"); setSpeed(4); };
  const transplantAll = () => {
    setChoice("sold");
    const top = holdings.slice().sort((a, b) => b.value - a.value)[0];
    const total = invested;
    act((mm) => { for (const c of CROPS) mm.sellFraction(c.id, 1); });
    if (top) {
      setCartFx({ sprite: top.c.sprite, proceeds: total, key: Date.now() });
      setTimeout(() => setCartFx(null), 1400);
    }
    setTimeout(() => { setBeat("run2"); setSpeed(4); }, 1200);
  };

  const restart = () => {
    reset();
    setBeat("intro");
    setChoice(null);
    setTradeRow(null);
    lastDiv.current = 0;
    benchPeak.current = 1000;
    fired.current = { warn: false, frost: false };
  };

  const running = beat === "run1" || beat === "run2";
  const canTrade = running || beat === "frost";
  const cropsAvailable = beat === "plant" && holdings.length === 0 ? CROPS.slice(1, 2) : CROPS;

  // your field: one sprite per whole plant, plots stay fixed
  const myPlants = holdings.flatMap((h) =>
    Array.from({ length: Math.round(h.plants) }, (_, i) => ({
      sprite: SP(h.c.sprite), h: plantH(m.prices[h.c.id]), key: h.c.id + i,
    }))
  );
  // co-op field: one plot of every crop; the same town plants at the same sizes
  const coopPlants = Array.from({ length: 12 }, (_, i) => {
    const c = CROPS[i % 4];
    return { sprite: SP(c.sprite), h: plantH(m.prices[c.id]) * 0.85, key: `coop-${i}` };
  });

  return (
    <div className="min-h-full" style={{ background: "#f3ead6", color: INK, colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: INK }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          gallery
        </Link>
        <div className="h-5 w-px" style={{ background: "rgba(107,84,60,0.3)" }} />
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-bold" style={{ color: GREEN }}>Share Garden</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: SUB }}>your money, growing in the ground</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] tnum" style={{ color: SUB }}>Day {m.step}</span>
          {running && (
            <div className="flex items-center rounded-lg overflow-hidden" style={{ background: PARCH, border: `2px solid ${WOOD}` }}>
              <SpeedBtn label={speed === 0 ? "Play" : "Pause"} active={false} onClick={() => setSpeed(speed === 0 ? 1 : 0)} />
              {[1, 2, 4].map((s) => (
                <SpeedBtn key={s} label={`${s}×`} active={speed === s} onClick={() => setSpeed(s)} />
              ))}
            </div>
          )}
          <button onClick={restart} className="text-[13px] opacity-60 hover:opacity-100 transition">Restart</button>
        </div>
      </header>

      <main className="px-4 sm:px-8 pb-4 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center">
        <div className="flex flex-col items-center gap-5">
          {/* the garden stage */}
          <div className="relative rounded-2xl overflow-hidden transition-all duration-1000"
            style={{
              width: 1080, height: 500,
              border: `2px solid ${WOOD}`,
              boxShadow: "5px 5px 0 rgba(107,84,60,0.2)",
              background: frosty
                ? "linear-gradient(180deg, #cfd8de 0%, #c2ccd4 55%, #b4c0ca 100%)"
                : "linear-gradient(180deg, #d3e5ad 0%, #c7dc9d 55%, #b7d08b 100%)",
            }}>
            <div className="absolute left-6 top-5 z-20">
              <div className="text-[12px] font-semibold" style={{ color: SUB }}>Net worth</div>
              <div className="flex flex-col items-start gap-1">
                <span className="font-display text-[32px] leading-tight font-bold tnum" style={{ color: INK }}>{fmtMoney(net)}</span>
                {beat === "frost"
                  ? <span className="text-[12px] font-bold tnum px-2 py-0.5 rounded-md" style={{ background: "#fbe4de", color: "#a13a2a", border: "1.5px solid #c96a56" }}>{(drawdown * 100).toFixed(1)}% from the high</span>
                  : Math.abs(net - 1000) >= 1 && <span className="text-[12px] font-bold tnum px-2 py-0.5 rounded-md" style={net >= 1000 ? { background: "#e4f0d8", color: GREEN, border: "1.5px solid #7ba36f" } : { background: "#fbe4de", color: "#a13a2a", border: "1.5px solid #c96a56" }}>{(net >= 1000 ? "+" : "") + ((net - 1000) / 10).toFixed(1)}%</span>}
              </div>
            </div>

            {running && ev && (
              <div className="absolute left-1/2 -translate-x-1/2 top-5 px-4 py-1.5 rounded-lg text-[13px] pop-in z-20"
                style={{ background: PARCH, border: `2px solid ${WOOD}`, color: INK }}>
                <span className="font-bold">{ev.label}</span>
                <span style={{ color: SUB }}> · {ev.blurb}</span>
              </div>
            )}
            {harvestToast && (
              <div className="absolute left-1/2 -translate-x-1/2 top-16 px-4 py-1.5 rounded-lg text-[13px] pop-in z-20"
                style={{ background: "#fff8dc", border: "2px solid #c9a53f", color: "#7a5b17" }}>
                {harvestToast}
              </div>
            )}

            {frosty && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {Array.from({ length: 30 }, (_, i) => (
                  <span key={i} className="absolute rounded-full bg-white/85"
                    style={{
                      width: 4 + (i % 3), height: 4 + (i % 3),
                      left: `${(i * 37) % 100}%`, top: -10,
                      animation: `snowfall ${5 + (i % 5)}s linear -${(i * 1.7) % 8}s infinite`,
                    }} />
                ))}
              </div>
            )}
            <style>{`@keyframes snowfall { from { transform: translateY(0); opacity: 0.9; } to { transform: translateY(540px); opacity: 0.3; } }`}</style>

            <div className="absolute text-center" style={{ left: "9%", bottom: 110, transform: "translateX(-50%)" }}>
              <img src={SG("coins")} alt="" style={{ width: 80, opacity: m.cash > 1 ? 1 : 0.35, transition: "opacity 0.5s" }} />
            </div>
            <FieldTag x="9%" title="Cash" sub={fmtMoney(m.cash)} />

            <div className="absolute" style={{ left: "20%", bottom: 50 }}>
              <IsoField cols={5} rows={4} frosty={frosty} label="your garden" plants={myPlants} />
            </div>
            <FieldTag x="38%" title="Your garden" sub={invested > 0 ? fmtMoney(invested) : "empty and ready"} />

            {beat !== "intro" && beat !== "coins" && beat !== "plant" && (
              <>
                <div className="absolute" style={{ left: "66%", bottom: 66 }}>
                  <IsoField cols={4} rows={3} frosty={frosty} label="the co-op field" plants={coopPlants} />
                </div>
                <FieldTag x="79%" title="The co-op field" sub={`${fmtMoney(m.benchmark)} · every crop, tended together`} />
              </>
            )}

            {holdings.length > 0 && (
              <div className="absolute flex flex-col items-start gap-1.5 z-20" style={{ left: "52%", bottom: 46 }}>
                {holdings.map((h) => (
                  <div key={h.c.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] tnum whitespace-nowrap"
                    style={{ background: PARCH, border: `1.5px solid ${WOOD}`, color: SUB }}>
                    <img src={SG("stake-tag")} alt="" style={{ height: 16 }} />
                    {h.c.crop} · you paid {fmtMoney(h.cost / Math.max(1, Math.round(h.plants)))} each
                  </div>
                ))}
              </div>
            )}

            {cartFx && (
              <div key={cartFx.key} className="absolute pointer-events-none z-20" style={{ left: "44%", bottom: 110, animation: "cartAway 1.3s ease-in forwards" }}>
                <div className="relative" style={{ width: 120 }}>
                  <img src={SG("cart")} alt="" style={{ width: 96 }} />
                  <img src={SP(cartFx.sprite)} alt="" style={{ position: "absolute", left: 24, bottom: 32, height: 52, transform: "rotate(-4deg)" }} />
                </div>
              </div>
            )}
            {cartFx && (
              <div key={`c${cartFx.key}`} className="absolute pointer-events-none float-coin text-[14px] font-bold tnum z-20"
                style={{ left: "9%", bottom: 170, color: GREEN, transform: "translateX(-50%)" }}>
                +{fmtMoney(cartFx.proceeds)}
              </div>
            )}
            <style>{`@keyframes cartAway { 0% { transform: translateX(0); opacity: 1; } 15% { transform: translateX(40px) rotate(1deg); } 100% { transform: translateX(560px); opacity: 0; } }`}</style>
          </div>

          {/* tutorial cards under the stage */}
          <div ref={endCardRef} className={`z-20 ${beat === "end" ? "w-[min(1080px,96vw)]" : "w-[min(640px,92vw)]"}`}>
            {beat === "intro" && (
              <GCard title="This is your garden.">
                <p>Every plant you grow here is an investment. A plant's size is its price today, and prices change every season.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => setBeat("coins")}>Next</GBtn></div>
              </GCard>
            )}
            {beat === "coins" && (
              <GCard title="And this is your money.">
                <p>You have $1,000 in coins. Coins in a pouch never grow. Plants can.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => setBeat("plant")}>Open the market</GBtn></div>
              </GCard>
            )}
            {beat === "plant" && (
              <GCard title={holdings.length === 0 ? "The market has one plant today." : "Plant more, or start the season."}>
                {holdings.length === 0 && (
                  <p className="mb-1">When you buy a plant you own it, roots and all. It comes from another gardener, and your coins go to them, not to the farm.</p>
                )}
                <p className="mb-2 text-[13px] font-semibold" style={{ color: SUB }}>Different goals, different crops: fast growth, steady baskets, or a calm garden.</p>
                <div className="flex flex-col gap-1.5 my-2">
                  {cropsAvailable.map((c) => {
                    const price = m.prices[c.id];
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "#fffdf4", border: `1.5px solid ${WOOD}` }}>
                        <img src={SP(c.sprite)} alt="" style={{ height: 40 }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold">{c.crop} <span className="tnum font-semibold" style={{ color: SUB }}>· {fmtMoney(price)}/plant</span></div>
                          <div className="text-[12.5px]" style={{ color: "#5a4a35" }}>{c.isLike}</div>
                          <div className="text-[12px]" style={{ color: SUB }}>{c.goal}</div>
                        </div>
                        <GChip disabled={m.cash < price} onClick={() => plant(c.id, 1)}>Plant 1</GChip>
                        <GChip disabled={m.cash < price * 3} onClick={() => plant(c.id, 3)}>Plant 3</GChip>
                      </div>
                    );
                  })}
                </div>
                {holdings.length > 0 && (
                  <div className="flex gap-2.5 mt-3"><GBtn onClick={() => setBeat("meetCoop")}>Start the season</GBtn></div>
                )}
              </GCard>
            )}
            {beat === "meetCoop" && (
              <GCard title="Meet the co-op field.">
                <p>It holds every crop at once, so one bad crop cannot sink the whole field. It comes as one piece, and you cannot pull a single crop out.</p>
                <p className="mt-2">It started worth $1,000, like your pouch. Time is about to speed up. You can pause or trade any day.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => { setBeat("run1"); setSpeed(2); }}>Start time</GBtn></div>
              </GCard>
            )}
            {beat === "run1" && speed > 0 && m.step < 12 && (
              <GToast>Watch closely. A plant's size is its price, and every plant of that crop in town grows and shrinks together.</GToast>
            )}
            {beat === "warn" && (
              <GCard title="The sky has gone gray.">
                <p>A hard frost is coming. Every garden in town is about to feel it.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => { setBeat("run1"); setSpeed(1); }}>Okay</GBtn></div>
              </GCard>
            )}
            {beat === "frost" && (
              <GCard title="The frost is here.">
                <p>
                  Frost came through town, so every plant got smaller at once. You're down{" "}
                  <strong className="tnum">{Math.abs(drawdown * 100).toFixed(0)}%</strong> from the top.
                  Count your rows: you still own every single plant you had.
                </p>
                <p className="mt-2 font-semibold">The cold hasn't broken yet. What do you do?</p>
                <div className="flex gap-2.5 mt-3">
                  <GGhost onClick={keepTending}>Keep tending</GGhost>
                  <GGhost onClick={transplantAll}>Transplant everything away</GGhost>
                </div>
              </GCard>
            )}
            {beat === "run2" && choice === "sold" && speed > 0 && (
              <GToast>Your plants live on in other gardens now. Your coins sit in the pouch.</GToast>
            )}
            {beat === "run2" && choice === "held" && speed > 0 && (
              <GToast>You're still tending. The season keeps turning.</GToast>
            )}
            {beat === "end" && (
              <GCard title={choice === "sold" ? "The warm spell came, and your beds were empty." : "The warm spell came."} wide>
                <div className="flex gap-3 my-3">
                  <div className="flex-1 rounded-lg px-4 py-3" style={{ background: net >= m.benchmark ? "#e9f2dc" : "#fffdf4", border: `2px solid ${net >= m.benchmark ? "#7ba36f" : WOOD}` }}>
                    <div className="text-[12px] font-semibold" style={{ color: SUB }}>You finished with</div>
                    <div className="font-display text-[24px] font-bold tnum">{fmtMoney(net)}</div>
                  </div>
                  <div className="flex-1 rounded-lg px-4 py-3" style={{ background: m.benchmark > net ? "#e9f2dc" : "#fffdf4", border: `2px solid ${m.benchmark > net ? "#7ba36f" : WOOD}` }}>
                    <div className="text-[12px] font-semibold" style={{ color: SUB }}>The co-op field</div>
                    <div className="font-display text-[24px] font-bold tnum">{fmtMoney(m.benchmark)}</div>
                  </div>
                </div>
                <div className="mb-3"><GrowthChart net={m.net} bench={m.bench} width={990} height={130} benchLabel="the co-op field" benchStroke={GREEN} xLabels={["Day 0", "Day 48", "Day 96", `Day ${m.step}`]} /></div>
                <ul className="flex flex-col gap-2 text-[13.5px]" style={{ color: "#5a4a35" }}>
                  <li className="flex gap-2"><Bullet c="#ff9f0a" /><span>Transplanted plants live on in someone else's garden. The coins moved gardener to gardener. The farm never saw them.</span></li>
                  <li className="flex gap-2"><Bullet c={GREEN} /><span>The frost shrank every plant in town, then the warm spell grew them back. Plant count never changed. Only the price did.</span></li>
                  <li className="flex gap-2"><Bullet c={WOOD} /><span>The co-op field grows every crop, so no single blight can ruin it. That is why it is so hard to beat.</span></li>
                </ul>
                <div className="flex gap-2.5 mt-3 items-center">
                  <GBtn onClick={restart}>Play again</GBtn>
                  <span className="text-[12.5px]" style={{ color: SUB }}>
                    {choice === "sold" ? "Try tending through the frost this time." : "Try transplanting away in the frost and see what it costs."}
                  </span>
                </div>
              </GCard>
            )}
          </div>
        </div>

        {/* right rail */}
        <div className="w-full max-w-xs flex flex-col gap-4">
          <div className="rounded-xl p-5" style={{ background: PARCH, border: `2px solid ${WOOD}`, boxShadow: "4px 4px 0 rgba(107,84,60,0.22)" }}>
            <div className="font-display text-[15px] font-bold mb-3" style={{ color: INK }}>In your garden</div>
            {holdings.length === 0 && (
              <div className="text-sm py-1" style={{ color: SUB }}>
                {beat === "end" ? "Empty beds. You transplanted everything." : "Nothing planted yet."}
              </div>
            )}
            {holdings.map((h, hi) => {
              const pct = pcts[hi] ?? 0;
              const open = tradeRow === h.c.id;
              return (
                <div key={h.c.id} className="py-2" style={{ borderBottom: "1.5px solid rgba(107,84,60,0.18)" }}>
                  <button className="w-full flex items-center gap-3 text-left" disabled={!canTrade}
                    onClick={() => canTrade && setTradeRow(open ? null : h.c.id)}>
                    <img src={SP(h.c.sprite)} alt="" style={{ height: 30 }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{h.c.crop}</div>
                      <div className="text-[12px] tnum" style={{ color: SUB }}>{Math.round(h.plants)} plants · paid {fmtMoney(h.cost / Math.max(1, Math.round(h.plants)))} each</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tnum">{fmtMoney(h.value)}</div>
                      <div className="text-[12px] tnum" style={{ color: SUB }}>{pct}%</div>
                    </div>
                  </button>
                  <div className="mt-1.5 ml-9 h-1.5 rounded-sm overflow-hidden" style={{ background: "rgba(107,84,60,0.15)" }}>
                    <div className="h-full" style={{ width: `${pct}%`, background: h.c.color }} />
                  </div>
                  {open && canTrade && (
                    <div className="ml-9 mt-2 flex flex-wrap items-center gap-1.5 pop-in">
                      <div className="w-full"><Sparkline width={180} height={40} data={m.history[h.c.id]} color={h.c.color} /></div>
                      <GChip disabled={m.cash < m.prices[h.c.id]} onClick={() => plant(h.c.id, 1)}>Plant 1</GChip>
                      <GChip onClick={() => transplant(h.c.id, 0.5)}>Transplant half</GChip>
                      <GChip onClick={() => { transplant(h.c.id, 1); setTradeRow(null); }}>Transplant all</GChip>
                    </div>
                  )}
                </div>
              );
            })}
            {canTrade && (
              <div className="pt-2">
                <div className="text-[11.5px] font-bold mb-1" style={{ color: SUB }}>The market</div>
                {CROPS.filter((c) => !holdings.some((h) => h.c.id === c.id)).map((c) => {
                  const open = tradeRow === `add-${c.id}`;
                  return (
                    <div key={c.id}>
                      <button className="w-full flex items-center gap-2.5 py-1.5 text-left"
                        onClick={() => setTradeRow(open ? null : `add-${c.id}`)}>
                        <img src={SP(c.sprite)} alt="" style={{ height: 24 }} />
                        <span className="text-[13px] font-semibold flex-1 truncate">{c.crop}</span>
                        <span className="text-[12px] tnum" style={{ color: SUB }}>{fmtMoney(m.prices[c.id])}</span>
                      </button>
                      {open && (
                        <div className="ml-8 mb-1.5 pop-in">
                          <div className="text-[11.5px] mb-1" style={{ color: "#5a4a35" }}>{c.isLike}</div>
                          <div className="mb-1.5"><Sparkline width={180} height={40} data={m.history[c.id]} color={c.color} /></div>
                          <div className="flex gap-1.5">
                            <GChip disabled={m.cash < m.prices[c.id]} onClick={() => { plant(c.id, 1); setTradeRow(null); }}>Plant 1</GChip>
                            <GChip disabled={m.cash < m.prices[c.id] * 3} onClick={() => { plant(c.id, 3); setTradeRow(null); }}>Plant 3</GChip>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3 pt-3 mt-1" style={{ borderTop: "2px solid rgba(107,84,60,0.25)" }}>
              <img src={SG("coins")} alt="" style={{ height: 22 }} />
              <div className="text-sm flex-1 font-semibold" style={{ color: SUB }}>Cash</div>
              <div className="text-sm font-bold tnum">{fmtMoney(m.cash)}</div>
            </div>
          </div>

          {beat !== "intro" && beat !== "coins" && beat !== "plant" && (
            <div className="rounded-xl p-5" style={{ background: PARCH, border: `2px solid ${WOOD}`, boxShadow: "4px 4px 0 rgba(107,84,60,0.22)" }}>
              <div className="flex items-center gap-3">
                <img src={SG("coop-field")} alt="" style={{ height: 34 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">The co-op field</div>
                  <div className="text-[12px]" style={{ color: SUB }}>every crop in town, tended together</div>
                </div>
                <div className="text-sm font-bold tnum">{fmtMoney(m.benchmark)}</div>
              </div>
            </div>
          )}
          {running && m.net.length > 10 && (
            <div className="rounded-xl p-5" style={{ background: PARCH, border: `2px solid ${WOOD}`, boxShadow: "4px 4px 0 rgba(107,84,60,0.22)" }}>
              <div className="font-display text-[15px] font-bold mb-2" style={{ color: INK }}>Growth</div>
              <GrowthChart net={m.net} bench={m.bench} width={272} height={80} benchLabel="the co-op field" benchStroke={GREEN} xLabels={["Day 0", `Day ${m.step}`]} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Bullet({ c }: { c: string }) {
  return <span className="w-2.5 h-2.5 rounded-sm mt-1 flex-shrink-0" style={{ background: c, border: "1px solid rgba(61,47,31,0.4)" }} />;
}

function FieldTag({ x, title, sub }: { x: string; title: string; sub: string }) {
  return (
    <div className="absolute text-center -translate-x-1/2 z-20" style={{ left: x, bottom: 12 }}>
      <div className="font-display text-[14px] font-bold">{title}</div>
      <div className="text-[12px] tnum" style={{ color: "#6b5a44" }}>{sub}</div>
    </div>
  );
}
