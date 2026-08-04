import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MarketEvent, fmtMoney } from "../engine/market";
import { useSim } from "../lib/useSim";
import { GrowthChart, Sparkline, SpeedBtn } from "../components/OrbUI";

// Share Garden 3.0. Time moves in deliberate weeks the player starts; plots
// are chosen by hand and remember what you paid and when; buying and selling
// live in a market stall that teaches what each crop is; the co-op field can
// be joined by buying strips; harvest baskets are produce the farm pays you
// for owning the plant; and one cultivar will not survive the season.

const END_STEP = 140;           // 20 deliberate weeks
const WEEK = 7;
const KILL_DAY = 98;            // tomato blight turns fatal after week 14
const PLOT_COUNT = 20;

interface Crop {
  id: string;
  crop: string;
  sprite: string;
  produce: string;
  color: string;
  isLike: string;
  goal: string;
  world: string;               // real-world connection line for the stall
}

const CROPS: Crop[] = [
  { id: "nova", crop: "Tomato",  sprite: "plant-tomato",  produce: "produce-tomatoes", color: "#ff453a",
    isLike: "Tomatoes are like fast-growing tech stocks: big jumps, big drops, no baskets.",
    goal: "Plant these if you want fast growth and can handle scary drops.",
    world: "In the real world: companies inventing new things, like apps and robots." },
  { id: "iron", crop: "Pumpkin", sprite: "plant-pumpkin", produce: "produce-pumpkin", color: "#ff9f0a",
    isLike: "Pumpkins are like steady factory stocks: slow, sturdy, and they drop harvest baskets.",
    goal: "Plant these if you want calm growers and baskets while you wait.",
    world: "In the real world: companies that build things, like trains and tools." },
  { id: "volt", crop: "Corn",    sprite: "plant-corn",    produce: "produce-corn", color: "#ffd60a",
    isLike: "Corn is like an energy stock: medium swings, and baskets all season long.",
    goal: "Plant these if you want some growth plus baskets along the way.",
    world: "In the real world: companies that make power, like fuel and electricity." },
  { id: "cane", crop: "Berry",   sprite: "plant-berry",   produce: "produce-berries", color: "#0a84ff",
    isLike: "Berries are like everyday grocery stocks: gentle movers that still drop harvest baskets.",
    goal: "Plant these if you want few surprises and dependable harvest baskets.",
    world: "In the real world: companies selling things everyone buys, like snacks and soap." },
];

const cropById = (id: string) => CROPS.find((c) => c.id === id)!;

const GARDEN_EVENTS: MarketEvent[] = [
  { atStep: 26, days: 5,  drift: 0.012,  vol: 0.010, scope: "tech",     label: "Tomato craze",  blurb: "Everyone in town wants tomato plants. Prices are running hot." },
  { atStep: 48, days: 7,  drift: -0.055, vol: 0.038, scope: "market",   label: "A hard frost",  blurb: "A deep frost settles over every garden at once." },
  { atStep: 74, days: 6,  drift: -0.028, vol: 0.018, scope: "consumer", label: "Berry glut",    blurb: "Too many berries this season. Prices sag." },
  { atStep: 84, days: 6,  drift: -0.030, vol: 0.015, scope: "industry", label: "Pumpkin rot",   blurb: "A wet month. Pumpkins are struggling everywhere." },
  { atStep: 96, days: 6,  drift: -0.045, vol: 0.020, scope: "tech",     label: "Tomato blight", blurb: "A blight is spreading through the tomato rows." },
  { atStep: 116, days: 16, drift: 0.022, vol: 0.010, scope: "market",   label: "Warm spell",    blurb: "Warm weeks. Every garden is filling back in." },
];

const SP = (name: string) => `${import.meta.env.BASE_URL}sprites/gpt/plants/t/${name}.png`;
const SG = (name: string) => `${import.meta.env.BASE_URL}sprites/gpt/t/${name}.png`;
const SPR = (name: string) => `${import.meta.env.BASE_URL}sprites/gpt/produce/t/${name}.png`;

const plantH = (price: number) => Math.max(24, Math.min(120, 18 + price * 0.55));

// ---- Stardew UI atoms ----------------------------------------------------
const INK = "#3d2f1f", SUB = "#8a7355", WOOD = "#6b543c", PARCH = "#fdf6e3", GREEN = "#3f6b3a";
const cardStyle = { background: PARCH, border: `2px solid ${WOOD}`, boxShadow: "4px 4px 0 rgba(107,84,60,0.22)" } as const;

function GCard({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`pop-in rounded-xl p-5 ${wide ? "w-full" : ""}`} style={cardStyle}>
      <div className="font-game text-[18px] font-bold mb-1.5" style={{ color: INK }}>{title}</div>
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
function GGhost({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
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

// a crop's history told in its own language: the plant at its last five weekly sizes
function GrowthStrip({ history, sprite }: { history: number[]; sprite: string }) {
  const pts: number[] = [];
  for (let wk = 4; wk >= 0; wk--) {
    const idx = Math.max(0, history.length - 1 - wk * 7);
    pts.push(history[idx]);
  }
  return (
    <div className="flex items-end gap-3 mt-2" style={{ height: 52 }}>
      {pts.map((p, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <img src={sprite} alt="" style={{ height: Math.max(10, Math.min(46, 8 + p * 0.22)), opacity: 0.45 + i * 0.14 }} />
          <span className="text-[9px]" style={{ color: "#8a7355" }}>{i === 4 ? "today" : `${4 - i}w ago`}</span>
        </div>
      ))}
    </div>
  );
}

// ---- field grid: side-on rows over the tilled-soil sprite ----------------

const isoPos = (i: number, cols: number, rows: number) => {
  const c = i % cols, r = Math.floor(i / cols);
  const x = FIELD_W * (0.14 + (c / (cols - 1)) * 0.72);
  const y = FIELD_H * (0.30 + (r / (rows - 1)) * 0.58);
  return { x, y, z: r * 10 + c };
};

type Lot = { plot: number; crop: string; paid: number; week: number };
type Basket = { plot: number; amount: number; key: number };

type Phase =
  | "intro" | "whatIs" | "sizePrice" | "coins" | "firstBuy" | "meetCoop"
  | "idle" | "running" | "eventPause" | "fork" | "extinct" | "end";

export default function GardenGame() {
  const { m, speed, setSpeed, reset, act } = useSim({ cash: 1000, maxStep: END_STEP, events: GARDEN_EVENTS, baseMs: 950 });
  const [phase, setPhase] = useState<Phase>("intro");
  const [week, setWeek] = useState(0);              // completed weeks
  const [choice, setChoice] = useState<"held" | "sold" | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [coopStrips, setCoopStrips] = useState(0);
  const [coopPaid, setCoopPaid] = useState(0);
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [selPlot, setSelPlot] = useState<number | null>(null);
  const [stallOpen, setStallOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ crop: string; paid: number; sold: number; key: number } | null>(null);
  const [cartFx, setCartFx] = useState<{ produce: string; key: number } | null>(null);
  const seenEvents = useRef(new Set<string>());
  const forkDone = useRef(false);
  const extinctDone = useRef(false);
  const lastDiv = useRef(0);
  const benchPeak = useRef(1000);
  const endCardRef = useRef<HTMLDivElement>(null);

  const invested = m.invested();
  const net = m.cash + invested;
  const peak = Math.max(...m.net);
  const drawdown = peak > 0 ? (net - peak) / peak : 0;
  benchPeak.current = Math.max(benchPeak.current, m.benchmark);
  const frosty = phase === "fork" || m.benchmark < benchPeak.current * 0.93;
  const ev = m.lastEvent;

  const holdings = useMemo(() => {
    const byCrop = new Map<string, { crop: Crop; lots: Lot[]; value: number }>();
    for (const lot of lots) {
      const c = cropById(lot.crop);
      const e = byCrop.get(lot.crop) ?? { crop: c, lots: [], value: 0 };
      e.lots.push(lot);
      e.value = e.lots.length * m.prices[lot.crop];
      byCrop.set(lot.crop, e);
    }
    return [...byCrop.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, m.step, phase]);
  const coopValue = coopStrips * m.prices["coop"];

  // week machine: run to the next multiple of 7, pausing at fresh weather
  useEffect(() => {
    if (phase !== "running") return;
    if (ev && !seenEvents.current.has(ev.label)) {
      seenEvents.current.add(ev.label);
      setSpeed(0);
      setPhase("eventPause");
      return;
    }
    if (m.step > 0 && m.step % WEEK === 0 && m.step / WEEK > week) {
      setSpeed(0);
      setWeek(m.step / WEEK);
      if (!extinctDone.current && m.step >= KILL_DAY) {
        extinctDone.current = true;
        act((mm) => mm.kill("nova"));
        setPhase("extinct");
      } else if (!forkDone.current && m.step >= 56 && lots.length > 0) {
        forkDone.current = true;
        setPhase("fork");
      } else if (m.step >= END_STEP) {
        setPhase("end");
      } else {
        setPhase("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.step, phase, ev]);

  // harvest baskets: produce appears on income-crop plots at each payout
  useEffect(() => {
    if (m.dividendsCollected > lastDiv.current + 0.5) {
      const gained = m.dividendsCollected - lastDiv.current;
      lastDiv.current = m.dividendsCollected;
      const incomeLots = lots.filter((l) => l.crop !== "nova");
      if (incomeLots.length) {
        const per = gained / incomeLots.length;
        setBaskets(incomeLots.slice(0, 6).map((l, i) => ({ plot: l.plot, amount: per, key: Date.now() + i })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.dividendsCollected]);

  useEffect(() => {
    if (phase === "end") setTimeout(() => endCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 350);
  }, [phase]);

  const weekStart = useRef({ net: 1000, bench: 1000 });
  const weekDivStart = useRef(0);
  const startWeek = () => {
    weekStart.current = { net, bench: m.benchmark };
    weekDivStart.current = m.dividendsCollected;
    setSelPlot(null); setStallOpen(false); setPhase("running"); setSpeed(1);
  };

  const plantAt = (cropId: string, plot: number) => {
    const price = m.prices[cropId];
    if (m.cash < price || lots.some((l) => l.plot === plot)) return;
    act((mm) => mm.buy(cropId, price));
    setLots((ls) => [...ls, { plot, crop: cropId, paid: price, week: Math.floor(m.step / WEEK) + 1 }]);
    setSelPlot(null);
  };
  const nextFreePlot = () => {
    for (let i = 0; i < PLOT_COUNT; i++) if (!lots.some((l) => l.plot === i)) return i;
    return null;
  };
  const transplantPlot = (plot: number) => {
    const lot = lots.find((l) => l.plot === plot);
    if (!lot || m.dead.has(lot.crop)) return;
    const crop = cropById(lot.crop);
    let sold = 0;
    act((mm) => {
      const h = mm.holdings[lot.crop];
      if (!h || h.shares <= 0) return;
      sold = mm.sellFraction(lot.crop, 1 / h.shares);
    });
    setLots((ls) => ls.filter((l) => l !== lot));
    setSelPlot(null);
    setReceipt({ crop: crop.crop, paid: lot.paid, sold, key: Date.now() });
    setCartFx({ produce: crop.produce, key: Date.now() + 1 });
    setTimeout(() => setCartFx(null), 2300);
    setTimeout(() => setReceipt(null), 5200);
  };
  const buyStrip = () => {
    const p = m.prices["coop"];
    if (m.cash < p) return;
    act((mm) => mm.buy("coop", p));
    setCoopStrips((n) => n + 1);
    setCoopPaid((v) => v + p);
  };
  const sellStrip = () => {
    if (coopStrips < 1) return;
    act((mm) => {
      const h = mm.holdings["coop"];
      if (h && h.shares > 0) mm.sellFraction("coop", 1 / h.shares);
    });
    setCoopStrips((n) => n - 1);
  };

  const keepTending = () => { if (choice) return; setChoice("held"); setPhase("idle"); };
  const transplantAll = () => {
    if (choice) return;
    setChoice("sold");
    const top = holdings.slice().sort((a, b) => b.value - a.value)[0];
    act((mm) => { for (const c of CROPS) mm.sellFraction(c.id, 1); });
    setLots([]);
    if (top) {
      setCartFx({ produce: top.crop.produce, key: Date.now() + 1 });
      setTimeout(() => setCartFx(null), 2300);
    }
    setPhase("idle");
  };

  const restart = () => {
    reset();
    setPhase("intro"); setWeek(0); setChoice(null); setLots([]); setCoopStrips(0); setCoopPaid(0);
    setBaskets([]); setSelPlot(null); setStallOpen(false); setReceipt(null);
    seenEvents.current = new Set(); forkDone.current = false; extinctDone.current = false;
    lastDiv.current = 0; benchPeak.current = 1000;
  };

  const inTutorial = ["intro", "whatIs", "sizePrice", "coins", "firstBuy", "meetCoop"].includes(phase);
  const canAct = phase === "idle" || phase === "fork" || phase === "firstBuy" || phase === "meetCoop";
  const selLot = selPlot !== null ? lots.find((l) => l.plot === selPlot) : undefined;

  // co-op field plants: five of every crop at town sizes; dead crops wither
  const coopPlants = Array.from({ length: 20 }, (_, i) => {
    const c = CROPS[i % 4];
    const dead = m.dead.has(c.id);
    return { sprite: dead ? SPR("plant-dead") : SP(c.sprite), h: dead ? 34 : plantH(m.prices[c.id]) * 0.85, key: `coop-${i}` };
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
          <span className="font-game text-xl font-bold" style={{ color: GREEN }}>Share Garden</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: SUB }}>your money, growing in the ground</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] tnum font-semibold" style={{ color: SUB }}>Week {Math.min(20, Math.floor(m.step / WEEK) + 1)} · Day {m.step}</span>
          {phase === "running" && (
            <div className="flex items-center rounded-lg overflow-hidden" style={{ background: PARCH, border: `2px solid ${WOOD}` }}>
              {[1, 2].map((s) => (
                <SpeedBtn key={s} label={`${s}×`} active={speed === s} onClick={() => setSpeed(s)} />
              ))}
            </div>
          )}
          {canAct && !inTutorial && (
            <GBtn onClick={() => setStallOpen(true)}>Market</GBtn>
          )}
          <button onClick={restart} className="text-[13px] opacity-60 hover:opacity-100 transition">Restart</button>
        </div>
      </header>

      <main className="px-4 sm:px-8 pb-4 flex flex-col 2xl:flex-row gap-6 items-center 2xl:items-start justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative rounded-2xl overflow-hidden transition-all duration-1000"
            style={{
              width: 1080, height: 500,
              border: `2px solid ${WOOD}`, boxShadow: "5px 5px 0 rgba(107,84,60,0.2)",
              background: frosty
                ? "linear-gradient(180deg, #dbe3e9 0%, #cdd6de 55%, #bfcad3 100%)"
                : "linear-gradient(180deg, #f4eeda 0%, #e3e8c3 45%, #cfdda6 100%)",
            }}>
            <div className="absolute left-6 top-5 z-20">
              <div className="text-[12px] font-semibold" style={{ color: SUB }}>Cash</div>
              <div className="flex flex-col items-start gap-1">
                <span className="font-game text-[32px] leading-tight font-bold tnum" style={{ color: INK }}>{fmtMoney(m.cash)}</span>
                {phase === "end"
                  ? <span className="text-[12px] font-bold tnum px-2 py-0.5 rounded-md" style={net >= m.benchmark ? { background: "#e4f0d8", color: GREEN, border: "1.5px solid #7ba36f" } : { background: "#fbe4de", color: "#a13a2a", border: "1.5px solid #c96a56" }}>{(net >= m.benchmark ? "+$" : "-$") + Math.round(Math.abs(net - m.benchmark)).toLocaleString("en-US")} vs the co-op field</span>
                  : null}
              </div>
            </div>

            {phase === "running" && ev && (
              <div className="absolute left-1/2 -translate-x-1/2 top-5 px-4 py-1.5 rounded-lg text-[13px] pop-in z-20"
                style={{ background: PARCH, border: `2px solid ${WOOD}`, color: INK }}>
                <span className="font-bold">{ev.label}</span>
                <span style={{ color: SUB }}> · {ev.blurb}</span>
              </div>
            )}
            {receipt && (
              <div key={receipt.key} className="absolute left-1/2 -translate-x-1/2 top-5 px-4 py-2 rounded-lg text-[13px] pop-in z-30"
                style={{ background: PARCH, border: `2px solid ${WOOD}`, color: INK }}>
                <span className="font-bold">{receipt.crop} sold to another gardener.</span>{" "}
                <span className="tnum" style={{ color: SUB }}>Paid {fmtMoney(receipt.paid)}, sold for {fmtMoney(receipt.sold)}.</span>{" "}
                <span className="tnum font-bold" style={{ color: receipt.sold >= receipt.paid ? GREEN : "#a13a2a" }}>
                  {receipt.sold >= receipt.paid ? "+" : "-"}{fmtMoney(Math.abs(receipt.sold - receipt.paid))} on this plant
                </span>
              </div>
            )}

            {frosty && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {Array.from({ length: 30 }, (_, i) => (
                  <span key={i} className="absolute rounded-full bg-white/85"
                    style={{ width: 4 + (i % 3), height: 4 + (i % 3), left: `${(i * 37) % 100}%`, top: -10, animation: `snowfall ${5 + (i % 5)}s linear -${(i * 1.7) % 8}s infinite` }} />
                ))}
              </div>
            )}
            <style>{`@keyframes snowfall { from { transform: translateY(0); opacity: 0.9; } to { transform: translateY(540px); opacity: 0.3; } }`}</style>

            <div className="absolute text-center" style={{ left: "9%", bottom: 110, transform: "translateX(-50%)" }}>
              <img src={SG("coins")} alt="" style={{ width: 80, opacity: m.cash > 1 ? 1 : 0.35, transition: "opacity 0.5s" }} />
            </div>
            <FieldTag x="9%" title="Cash" sub={fmtMoney(m.cash)} />

            {/* your plots: click to act */}
            <div className="absolute" style={{ left: "20%", bottom: 50 }}>
              <div className="relative" style={{ width: (5 + 4) * (TW / 2) + 40, height: (5 + 4) * (TH / 2) + 140 }}>
                {Array.from({ length: PLOT_COUNT }, (_, i) => {
                  const { x, y } = isoPos(i, 5, 4);
                  const occupied = lots.some((l) => l.plot === i);
                  const selected = selPlot === i;
                  return (
                    <button key={`plot${i}`} className="absolute" onClick={() => canAct && setSelPlot(selected ? null : i)}
                      style={{
                        left: x - TW / 2, top: y - TH / 2, width: TW, height: TH,
                        background: selected ? "#e8d27a" : frosty ? "#9d9186" : occupied ? "#8f6f43" : "#a5804f",
                        border: `1.5px solid ${selected ? "#b39322" : frosty ? "#7d7268" : "#7d5c33"}`,
                        clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
                        transition: "background 0.4s", cursor: canAct ? "pointer" : "default",
                      }} aria-label={`plot ${i + 1}`} />
                  );
                })}
                {lots.map((lot) => {
                  const { x, y, z } = isoPos(lot.plot, 5, 4);
                  const dead = m.dead.has(lot.crop);
                  const h = dead ? 36 : plantH(m.prices[lot.crop]);
                  return (
                    <img key={`lot${lot.plot}`} src={dead ? SPR("plant-dead") : SP(cropById(lot.crop).sprite)} alt=""
                      className="absolute pointer-events-none"
                      style={{
                        left: x, top: y + 4 - h, height: h, zIndex: z + 1, transform: "translateX(-50%)",
                        transition: "height 0.7s cubic-bezier(.3,1.1,.4,1), top 0.7s cubic-bezier(.3,1.1,.4,1)",
                        filter: frosty && !dead ? "saturate(0.65) brightness(0.94)" : "none",
                      }} />
                  );
                })}
                {baskets.map((b) => {
                  const { x, y, z } = isoPos(b.plot, 5, 4);
                  return (
                    <button key={b.key} className="absolute pop-in" onClick={() => setBaskets((bs) => bs.filter((x2) => x2.key !== b.key))}
                      title={`Harvest basket · +${fmtMoney(b.amount)} already in your cash`}
                      style={{ left: x + 8, top: y - 34, zIndex: z + 30 }}>
                      <img src={SPR("basket-full")} alt="harvest basket" style={{ height: 42 }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <FieldTag x="38%" title="Your garden" sub={lots.length > 0 ? `${lots.length} ${lots.length === 1 ? "plant" : "plants"} growing` : "empty and ready"} />

            {/* plot popover */}
            {selPlot !== null && canAct && (
              <div className="absolute z-30 rounded-xl p-3 pop-in" style={{ ...cardStyle, left: "42%", bottom: 180, width: 260 }}>
                {selLot ? (
                  <>
                    <div className="font-game text-[14px] font-bold">{cropById(selLot.crop).crop}</div>
                    <div className="text-[12px] tnum mb-1" style={{ color: SUB }}>
                      planted week {selLot.week} · you paid {fmtMoney(selLot.paid)}
                    </div>
                    <div className="text-[12px] tnum mb-2">
                      worth {fmtMoney(m.prices[selLot.crop])} today{" "}
                      <span style={{ color: m.prices[selLot.crop] >= selLot.paid ? GREEN : "#a13a2a" }}>
                        ({m.prices[selLot.crop] >= selLot.paid ? "+" : "-"}{fmtMoney(Math.abs(m.prices[selLot.crop] - selLot.paid))})
                      </span>
                    </div>
                    {m.dead.has(selLot.crop)
                      ? <div className="text-[12px]" style={{ color: "#a13a2a" }}>The blight took this cultivar. No one will buy it.</div>
                      : <GChip onClick={() => transplantPlot(selPlot)}>Sell this plant to another gardener · {fmtMoney(m.prices[selLot.crop])}</GChip>}
                  </>
                ) : (
                  <>
                    <div className="font-game text-[14px] font-bold">Empty plot</div>
                    <div className="text-[12px] mb-2" style={{ color: SUB }}>Pick a plant at the market and it will grow here.</div>
                    <GChip onClick={() => setStallOpen(true)}>Open the market</GChip>
                  </>
                )}
              </div>
            )}

            {/* co-op field */}
            {(!inTutorial || phase === "meetCoop") && (
              <>
                <div className="absolute" style={{ left: "60%", bottom: 50 }}>
                  <div className="relative" style={{ width: (5 + 4) * (TW / 2) + 40, height: (5 + 4) * (TH / 2) + 140 }}>
                    {Array.from({ length: 20 }, (_, i) => {
                      const { x, y } = isoPos(i, 5, 4);
                      return (
                        <div key={`cp${i}`} className="absolute" style={{
                          left: x - TW / 2, top: y - TH / 2, width: TW, height: TH,
                          background: frosty ? "#9d9186" : "#8f9a63",
                          border: `1.5px solid ${frosty ? "#7d7268" : "#71804a"}`,
                          clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)", transition: "background 1s",
                        }} />
                      );
                    })}
                    {coopPlants.map((p, i) => {
                      const { x, y, z } = isoPos(i, 5, 4);
                      return (
                        <img key={p.key} src={p.sprite} alt="" className="absolute pointer-events-none"
                          style={{ left: x - p.h * 0.42, top: y + 4 - p.h, height: p.h, zIndex: z + 1, transition: "height 0.7s", filter: frosty ? "saturate(0.65) brightness(0.94)" : "none" }} />
                      );
                    })}
                  </div>
                </div>
                <FieldTag x="79%" title="The co-op field"
                  sub={coopStrips > 0 ? `you own ${coopStrips} ${coopStrips === 1 ? "strip" : "strips"} · ${fmtMoney(coopValue)}` : `${fmtMoney(m.benchmark)} · every crop, tended together`} />
              </>
            )}

            {cartFx && (
              <div key={cartFx.key} className="absolute pointer-events-none z-20" style={{ left: "44%", bottom: 110, animation: "cartAway 2.2s ease-in forwards" }}>
                <div className="relative" style={{ width: 120 }}>
                  <img src={SG("cart")} alt="" style={{ width: 96 }} />
                  <img src={SPR(cartFx.produce)} alt="" style={{ position: "absolute", left: 26, bottom: 34, height: 40 }} />
                </div>
              </div>
            )}
            <style>{`@keyframes cartAway { 0% { transform: translateX(0); opacity: 1; } 15% { transform: translateX(40px) rotate(1deg); } 100% { transform: translateX(560px); opacity: 0; } }`}</style>
          </div>

          {/* cards under the stage */}
          <div ref={endCardRef} className={`z-20 ${phase === "end" ? "w-[min(1080px,96vw)]" : "w-[min(640px,92vw)]"}`}>
            {phase === "intro" && (
              <GCard title="This is your garden.">
                <p>Twenty empty plots, tilled and warm.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => setPhase("whatIs")}>Next</GBtn></div>
              </GCard>
            )}
            {phase === "whatIs" && (
              <GCard title="Every plant here is an investment.">
                <p>Buy a plant and it is yours, roots and all.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => setPhase("sizePrice")}>Next</GBtn></div>
              </GCard>
            )}
            {phase === "sizePrice" && (
              <GCard title="A plant's size is its price.">
                <p>When the town pays more, every plant of that crop grows. When the town pays less, they all shrink.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => setPhase("coins")}>Next</GBtn></div>
              </GCard>
            )}
            {phase === "coins" && (
              <GCard title="And this is your money.">
                <p>You have $1,000 in cash. Cash sitting still never grows. Plants can.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => { setPhase("firstBuy"); setStallOpen(true); }}>Visit the market</GBtn></div>
              </GCard>
            )}
            {phase === "firstBuy" && !stallOpen && (
              <GCard title={lots.length === 0 ? "The market is open." : "Good planting."}>
                {lots.length === 0
                  ? <p>Pick your first plant. It comes from another gardener, and your money goes to them.</p>
                  : <p>Your plant is in the ground. You can buy more, or move on.</p>}
                <div className="flex gap-2.5 mt-3">
                  <GBtn onClick={() => setStallOpen(true)}>Open the market</GBtn>
                  {lots.length > 0 && <GGhost onClick={() => setPhase("meetCoop")}>Meet the co-op field</GGhost>}
                </div>
              </GCard>
            )}
            {phase === "meetCoop" && (
              <GCard title="Meet the co-op field.">
                <p>It grows every crop at once, so one bad crop cannot ruin the whole harvest. You can buy a strip of it, and a strip is a slice of everything.</p>
                <div className="flex gap-2.5 mt-3">
                  <GBtn onClick={buyStrip} disabled={m.cash < m.prices["coop"]}>Buy one strip · {fmtMoney(m.prices["coop"])}</GBtn>
                  <GGhost onClick={() => setPhase("idle")}>{coopStrips > 0 ? "Done" : "Not yet"}</GGhost>
                </div>
                {coopStrips > 0 && <p className="mt-2 text-[12.5px]" style={{ color: SUB }}>You own {coopStrips} {coopStrips === 1 ? "strip" : "strips"}. It pays harvest baskets too.</p>}
              </GCard>
            )}
            {phase === "idle" && (
              <GCard title={week === 0 ? "Ready for week 1." : `Week ${week} is done.`}>
                <p>
                  {week === 0
                    ? "Each week you choose, then the market answers. Nothing moves until you say so."
                    : "Check your plots, visit the market, collect any baskets. Start the next week when you're ready."}
                </p>
                {week > 0 && (
                  <div className="mt-2 flex flex-col gap-0.5 text-[12.5px] tnum" style={{ color: SUB }}>
                    <span>Cash on hand: <strong style={{ color: INK }}>{fmtMoney(m.cash)}</strong></span>
                    {m.dividendsCollected - weekDivStart.current > 0.5 && (
                      <span>Harvest baskets this week paid you <strong style={{ color: GREEN }}>+{fmtMoney(m.dividendsCollected - weekDivStart.current)}</strong>. Click the baskets on your plots.</span>
                    )}
                    {lots.length + coopStrips > 0 && <span>If you sold everything today, it would sell for <strong style={{ color: INK }}>{fmtMoney(invested)}</strong>. You will not know for sure until you sell.</span>}
                    <span>The co-op field, left alone: {fmtMoney(weekStart.current.bench)} to <strong style={{ color: m.benchmark >= weekStart.current.bench ? GREEN : "#a13a2a" }}>{fmtMoney(m.benchmark)}</strong></span>
                  </div>
                )}
                <div className="flex gap-2.5 mt-3">
                  <GBtn onClick={startWeek}>Start week {week + 1}</GBtn>
                  <GGhost onClick={() => setStallOpen(true)}>Market</GGhost>
                </div>
              </GCard>
            )}
            {phase === "eventPause" && ev && (
              <GCard title={ev.label + "."}>
                <p>{ev.blurb}</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => { setPhase("running"); setSpeed(1); }}>Okay</GBtn></div>
              </GCard>
            )}
            {phase === "fork" && (
              <GCard title="The frost is here.">
                <p>
                  Every plant in town got smaller at once. Sold today, your garden would sell for about{" "}
                  <strong className="tnum">{Math.abs(drawdown * 100).toFixed(0)}%</strong> less than at the top.
                  But count your plots: you still own every plant, and your cash never moved.
                </p>
                <p className="mt-2 font-semibold">The cold hasn't broken. What do you do?</p>
                <div className="flex gap-2.5 mt-3">
                  <GGhost onClick={keepTending}>Keep tending</GGhost>
                  <GGhost onClick={transplantAll}>Sell everything to other gardeners</GGhost>
                </div>
              </GCard>
            )}
            {phase === "extinct" && (
              <GCard title="The tomato blight won.">
                <p>The tomato cultivar is gone for good. Tomato plants everywhere, in any garden, are worth nothing now.</p>
                <p className="mt-2">The co-op field lost its tomato row and barely felt it. The other crops carry it. This is why gardens spread out.</p>
                <div className="flex gap-2.5 mt-3"><GBtn onClick={() => setPhase("idle")}>Okay</GBtn></div>
              </GCard>
            )}
            {phase === "end" && (
              <GCard title={choice === "sold" ? "Season's end, and your beds were empty." : "Season's end."} wide>
                <div className="flex gap-3 my-3">
                  <div className="flex-1 rounded-lg px-4 py-3" style={{ background: net >= m.benchmark ? "#e9f2dc" : "#fffdf4", border: `2px solid ${net >= m.benchmark ? "#7ba36f" : WOOD}` }}>
                    <div className="text-[12px] font-semibold" style={{ color: SUB }}>Your cash, plus plants at closing prices</div>
                    <div className="font-game text-[24px] font-bold tnum">{fmtMoney(net)}</div>
                  </div>
                  <div className="flex-1 rounded-lg px-4 py-3" style={{ background: m.benchmark > net ? "#e9f2dc" : "#fffdf4", border: `2px solid ${m.benchmark > net ? "#7ba36f" : WOOD}` }}>
                    <div className="text-[12px] font-semibold" style={{ color: SUB }}>The co-op field, left alone</div>
                    <div className="font-game text-[24px] font-bold tnum">{fmtMoney(m.benchmark)}</div>
                  </div>
                </div>
                <div className="mb-3"><GrowthChart net={m.net.filter((_, i) => i % 7 === 0 || i === m.net.length - 1)} bench={m.bench.filter((_, i) => i % 7 === 0 || i === m.bench.length - 1)} width={990} height={130} benchLabel="the co-op field" benchStroke={GREEN} xLabels={["Week 1", "Week 8", "Week 14", "Week 20"]} /></div>
                <ul className="flex flex-col gap-2 text-[13.5px]" style={{ color: "#5a4a35" }}>
                  <li className="flex gap-2"><Bullet c="#ff453a" /><span>The tomato cultivar died and never came back. One crop is never a plan. The co-op field shrugged it off.</span></li>
                  {choice === "sold" ? (
                    <li className="flex gap-2"><Bullet c="#ff9f0a" /><span>You sold in the frost. Your plants grew back for their new owners, not for you.</span></li>
                  ) : (
                    <li className="flex gap-2"><Bullet c={GREEN} /><span>The frost shrank every plant, then the warm spell grew them back. Your plant count never changed. Only prices did.</span></li>
                  )}
                  <li className="flex gap-2"><Bullet c={WOOD} /><span>Every dollar you spent or received moved gardener to gardener. The farms never saw it.</span></li>
                </ul>
                <div className="flex gap-2.5 mt-3 items-center">
                  <GBtn onClick={restart}>Play again</GBtn>
                  <span className="text-[12.5px]" style={{ color: SUB }}>
                    {choice === "sold" ? "Try tending through the frost this time." : "Try the other choice and see what it costs."}
                  </span>
                </div>
              </GCard>
            )}
          </div>
        </div>

        {/* right rail: read-only summary */}
        <div className="w-full max-w-xs flex flex-col gap-4">
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="font-game text-[15px] font-bold mb-3" style={{ color: INK }}>In your garden</div>
            {holdings.length === 0 && coopStrips === 0 && (
              <div className="text-sm py-1" style={{ color: SUB }}>Nothing planted yet.</div>
            )}
            {holdings.map((h) => (
              <div key={h.crop.id} className="py-2 flex items-center gap-3" style={{ borderBottom: "1.5px solid rgba(107,84,60,0.18)" }}>
                <img src={m.dead.has(h.crop.id) ? SPR("plant-dead") : SP(h.crop.sprite)} alt="" style={{ height: 28 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{h.crop.crop}{m.dead.has(h.crop.id) && <span style={{ color: "#a13a2a" }}> · extinct</span>}</div>
                  <div className="text-[12px] tnum" style={{ color: SUB }}>{h.lots.length} {h.lots.length === 1 ? "plant" : "plants"} · avg paid {fmtMoney(h.lots.reduce((s, l) => s + l.paid, 0) / h.lots.length)}</div>
                </div>
                <div className="text-sm font-bold tnum">{fmtMoney(h.value)}</div>
              </div>
            ))}
            {coopStrips > 0 && (
              <div className="py-2 flex items-center gap-3" style={{ borderBottom: "1.5px solid rgba(107,84,60,0.18)" }}>
                <img src={SG("coop-field")} alt="" style={{ height: 26 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">Co-op strips</div>
                  <div className="text-[12px] tnum" style={{ color: SUB }}>{coopStrips} {coopStrips === 1 ? "strip" : "strips"} · avg paid {fmtMoney(coopPaid / coopStrips)}</div>
                </div>
                <div className="text-sm font-bold tnum">{fmtMoney(coopValue)}</div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-3 mt-1" style={{ borderTop: "2px solid rgba(107,84,60,0.25)" }}>
              <img src={SG("coins")} alt="" style={{ height: 22 }} />
              <div className="text-sm flex-1 font-semibold" style={{ color: SUB }}>Cash</div>
              <div className="text-sm font-bold tnum">{fmtMoney(m.cash)}</div>
            </div>
            {canAct && !inTutorial && (
              <div className="mt-3"><GBtn onClick={() => setStallOpen(true)}>Open the market</GBtn></div>
            )}
          </div>

          {!inTutorial && (
            <div className="rounded-xl p-5" style={cardStyle}>
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

        </div>
      </main>

      {/* market stall overlay */}
      {stallOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto py-10 px-4" style={{ background: "rgba(61,47,31,0.45)" }} onClick={() => setStallOpen(false)}>
          <div className="rounded-2xl p-6 w-[min(880px,95vw)]" style={{ ...cardStyle, boxShadow: "8px 8px 0 rgba(44,33,20,0.35)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-1">
              <img src={SG("market-stall")} alt="" style={{ height: 56 }} />
              <div className="flex-1">
                <div className="font-game text-[22px] font-bold" style={{ color: INK }}>The market</div>
                <div className="text-[13px]" style={{ color: SUB }}>Different goals, different crops: fast growth, steady baskets, or a calm garden.</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-semibold" style={{ color: SUB }}>Your cash</div>
                <div className="font-game text-[18px] font-bold tnum">{fmtMoney(m.cash)}</div>
              </div>
              <GGhost onClick={() => setStallOpen(false)}>Close</GGhost>
            </div>
            <div className="flex flex-col gap-2.5 mt-4 overflow-y-auto pr-1" style={{ maxHeight: "62vh" }}>
              {CROPS.map((c) => {
                const price = m.prices[c.id];
                const dead = m.dead.has(c.id);
                const owned = lots.filter((l) => l.crop === c.id).length;
                const affordable = Math.floor(m.cash / price);
                const free = nextFreePlot();
                return (
                  <div key={c.id} className="rounded-xl p-4" style={{ background: "#fffdf4", border: `1.5px solid ${WOOD}`, opacity: dead ? 0.6 : 1 }}>
                    <div className="flex items-center gap-3">
                      <img src={dead ? SPR("plant-dead") : SP(c.sprite)} alt="" style={{ height: 46 }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-game text-[16px] font-bold">{c.crop}</div>
                        <div className="text-[13px] tnum font-semibold" style={{ color: dead ? "#a13a2a" : INK }}>{dead ? "extinct" : `${fmtMoney(price)} per plant`}</div>
                      </div>
                      {owned > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md tnum" style={{ background: PARCH, border: `1.5px solid ${WOOD}`, color: SUB }}>you own {owned}</span>}
                    </div>
                    <p className="text-[12.5px] mt-2" style={{ color: "#5a4a35" }}>{c.isLike}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: SUB }}>{c.world}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: SUB }}>{c.goal}</p>
                    <GrowthStrip history={m.history[c.id]} sprite={dead ? SPR("plant-dead") : SP(c.sprite)} />
                    {!dead && (
                      <div className="flex items-center gap-2 mt-2">
                        <GChip disabled={affordable < 1 || free === null} onClick={() => plantAt(c.id, selPlot !== null && !selLot ? selPlot : (nextFreePlot() ?? 0))}>
                          Plant one · {fmtMoney(price)}
                        </GChip>
                        <span className="text-[11.5px] tnum" style={{ color: SUB }}>
                          {affordable >= 1 ? `your cash buys ${affordable}` : "not enough cash"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="rounded-xl p-4 order-first" style={{ background: "#f2f6e4", border: `2px solid ${GREEN}` }}>
                <div className="flex items-center gap-3">
                  <img src={SG("coop-field")} alt="" style={{ height: 46 }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-game text-[16px] font-bold">A strip of the co-op field</div>
                    <div className="text-[13px] tnum font-semibold">{fmtMoney(m.prices["coop"])} per strip</div>
                  </div>
                  {coopStrips > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md tnum" style={{ background: PARCH, border: `1.5px solid ${WOOD}`, color: SUB }}>you own {coopStrips}</span>}
                </div>
                <p className="text-[12.5px] mt-2" style={{ color: "#5a4a35" }}>A strip is like an index fund: one slice of every crop in town, in one buy.</p>
                <p className="text-[12px] mt-0.5" style={{ color: SUB }}>One bad crop cannot ruin the whole harvest, and it pays harvest baskets too. You cannot pull a single crop out.</p>
                <div className="flex items-center gap-2 mt-2">
                  <GChip disabled={m.cash < m.prices["coop"]} onClick={buyStrip}>Buy a strip · {fmtMoney(m.prices["coop"])}</GChip>
                  {coopStrips > 0 && <GChip onClick={sellStrip}>Sell a strip · {fmtMoney(m.prices["coop"])}</GChip>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bullet({ c }: { c: string }) {
  return <span className="w-2.5 h-2.5 rounded-sm mt-1 flex-shrink-0" style={{ background: c, border: "1px solid rgba(61,47,31,0.4)" }} />;
}

function FieldTag({ x, title, sub }: { x: string; title: string; sub: string }) {
  return (
    <div className="absolute text-center -translate-x-1/2 z-20" style={{ left: x, bottom: 12 }}>
      <div className="font-game text-[14px] font-bold">{title}</div>
      <div className="text-[12px] tnum" style={{ color: "#6b5a44" }}>{sub}</div>
    </div>
  );
}
