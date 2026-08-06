import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ASSETS, MarketEvent, fmtMoney } from "../engine/market";
import { useSim } from "../lib/useSim";
import { CompSlice, ORB_ASSETS, RAINBOW, orbAsset, roundPcts, valueToRadius } from "../lib/orbModel";
import OrbScene, { LAYOUT, OrbSceneHandle } from "../components/OrbScene";
import { downloadOrbCard } from "../lib/orbCard";
import { getOrbName } from "../lib/orbIdentity";
import {
  Actions, Btn, Caption, Card, DeltaChip, Dot, FluidCycler, GhostBtn, GrowthChart,
  RAINBOW_DOT, Sparkline, SpeedBtn, StageLabel, TradeChip, useFluidPref,
} from "../components/OrbUI";

// The Orb: Game B tutorial slice. Your portfolio is a glass marble of
// colored essence; the sealed rainbow orb beside it is the index. The market
// crash (day 48) drives the hold-vs-panic fork; recovery is the stay-in lesson.

type Beat = "intro" | "reservoir" | "shop" | "meetIndex" | "warn" | "run1" | "crash" | "run2" | "end";

const STAGE_W = 1080;
const STAGE_H = 440;
const END_STEP = 144;

// The Orb's own event season, in plain market language: no weather or
// garden metaphors. Tuned so the story lands: hold beats panic-sell
// decisively, and the rainbow orb wins overall.
const ORB_EVENTS: MarketEvent[] = [
  { atStep: 26, days: 5,  drift: 0.010,  vol: 0.010, scope: "tech",   label: "Tech rally",     blurb: "Everyone is piling into tech. Prices are running hot." },
  { atStep: 48, days: 7,  drift: -0.058, vol: 0.038, scope: "market", label: "Market crash",   blurb: "Every price is falling at once." },
  { atStep: 74, days: 6,  drift: -0.030, vol: 0.020, scope: "crypto", label: "Crypto wipeout", blurb: "Speculative coins are collapsing." },
  { atStep: 96, days: 6,  drift: -0.030, vol: 0.015, scope: "tech",   label: "Tech selloff",   blurb: "The whole tech sector is falling together." },
  { atStep: 116, days: 16, drift: 0.022, vol: 0.010, scope: "market", label: "Recovery",       blurb: "The market is climbing back. Patience is paying off." },
];

const RAINBOW_COMP: CompSlice[] = RAINBOW.map((c) => ({ key: c.id, color: c.color, glow: c.glow, frac: 1 / RAINBOW.length }));

const AMOUNTS = [100, 250, 500];

export default function OrbGame() {
  const orbName = getOrbName();
  const { m, speed, setSpeed, done, reset, act } = useSim({ cash: 1000, maxStep: END_STEP, events: ORB_EVENTS });
  const [beat, setBeat] = useState<Beat>("intro");
  const [choice, setChoice] = useState<"hold" | "sold" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState(250);
  const [fluid, setFluid] = useFluidPref();
  const sceneRef = useRef<OrbSceneHandle>(null);
  const endCardRef = useRef<HTMLDivElement>(null);
  const fired = useRef({ warn: false, crash: false, wipeout: false, selloff: false, jumped: false });
  const peakInvested = useRef(0);
  const loc = useLocation();

  const holdings = useMemo(
    () =>
      ORB_ASSETS.map((oa) => {
        const asset = ASSETS.find((a) => a.id === oa.id)!;
        const h = m.holdings[oa.id];
        return { oa, asset, shares: h?.shares ?? 0, value: (h?.shares ?? 0) * m.prices[oa.id] };
      }).filter((x) => x.shares > 1e-6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.step, m.cash, beat, selected]
  );
  const invested = holdings.reduce((s, h) => s + h.value, 0);
  if (invested > peakInvested.current) peakInvested.current = invested;
  const pcts = roundPcts(holdings.map((h) => h.value));
  const comp: CompSlice[] = holdings.map((h) => ({
    key: h.oa.id, color: h.oa.color, glow: h.oa.glow, frac: invested > 0 ? h.value / invested : 0,
  }));
  const net = m.cash + invested;

  // scripted jumps for review screenshots: #/orb?beat=crash etc.
  useEffect(() => {
    if (fired.current.jumped) return;
    fired.current.jumped = true;
    const q = new URLSearchParams(loc.search).get("beat");
    if (!q || q === "intro") return;
    if (q === "shop") { setBeat("shop"); return; }
    act((mm) => {
      mm.buy("nova", Math.floor(450 / mm.prices["nova"]) * mm.prices["nova"]);
      mm.buy("btx", Math.floor(350 / mm.prices["btx"]) * mm.prices["btx"]);
      const target = q === "mid" ? 30 : 55;
      while (mm.step < target) mm.tick();
      if (q === "endsold") for (const a of ORB_ASSETS) mm.sellFraction(a.id, 1);
      if (q === "end" || q === "endsold") while (mm.step < END_STEP) mm.tick();
      // scripted path holds $200 cash until the fork, so peak invested = peak net - 200
      peakInvested.current = Math.max(...mm.net) - 200;
    });
    if (q === "crash" || q === "end" || q === "endsold") { fired.current.warn = true; fired.current.crash = true; }
    if (q === "mid") setBeat("run1");
    else if (q === "crash") setBeat("crash");
    else if (q === "end") { setBeat("end"); setChoice("hold"); }
    else if (q === "endsold") { setBeat("end"); setChoice("sold"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // beat machine driven by the sim clock
  useEffect(() => {
    const s = m.step;
    const f = fired.current;
    const scene = sceneRef.current;
    if (beat === "run1") {
      if (s >= 44 && !f.warn) { f.warn = true; setSpeed(0); setBeat("warn"); return; }
      if (s >= 48 && !f.crash) {
        f.crash = true;
        scene?.shock("player", 1);
        scene?.shock("index", 0.25);
      }
      if (s >= 55) { setSpeed(0); setBeat("crash"); }
    } else if (beat === "run2") {
      if (s >= 75 && !f.wipeout) {
        f.wipeout = true;
        if (m.holdings["btx"]?.shares) scene?.shock("player", 0.55);
        scene?.shock("index", 0.12);
      }
      if (s >= 97 && !f.selloff) {
        f.selloff = true;
        if (m.holdings["nova"]?.shares || m.holdings["pepr"]?.shares) scene?.shock("player", 0.5);
        scene?.shock("index", 0.12);
      }
      if (done || s >= END_STEP) { setSpeed(0); setBeat("end"); }
    }
  });

  // bring the debrief into view when the run ends
  useEffect(() => {
    if (beat === "end") setTimeout(() => endCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 350);
  }, [beat]);

  const buy = (id: string, dollars: number) => {
    const oa = orbAsset(id)!;
    act((mm) => {
      const n = Math.floor(Math.min(dollars, mm.cash) / mm.prices[id]);
      if (n >= 1) mm.buy(id, n * mm.prices[id]);
    });
    sceneRef.current?.pour({ kind: "buy", color: oa.color, glow: oa.glow });
    setSelected(null);
  };

  const sellFrac = (id: string, frac: number) => {
    const oa = orbAsset(id)!;
    act((mm) => { mm.sellFraction(id, frac); });
    sceneRef.current?.pour({ kind: "sell", color: oa.color, glow: oa.glow });
  };

  const startMarket = () => setBeat("meetIndex");

  const beginTime = () => { setBeat("run1"); setSpeed(2); };

  const hold = () => { setChoice("hold"); setBeat("run2"); setSpeed(4); };

  const sellAll = () => {
    setChoice("sold");
    for (const h of holdings) sceneRef.current?.pour({ kind: "sell", color: h.oa.color, glow: h.oa.glow });
    act((mm) => { for (const a of ORB_ASSETS) mm.sellFraction(a.id, 1); });
    setTimeout(() => { setBeat("run2"); setSpeed(4); }, 1100);
  };

  const restart = () => {
    reset();
    setBeat("intro");
    setChoice(null);
    setSelected(null);
    peakInvested.current = 0;
    fired.current = { warn: false, crash: false, wipeout: false, selloff: false, jumped: true };
  };

  const showIndex = beat !== "intro" && beat !== "reservoir" && beat !== "shop";
  const running = beat === "run1" || beat === "run2";
  const canTrade = running || beat === "crash";
  const [tradeRow, setTradeRow] = useState<string | null>(null);
  const peak = Math.max(...m.net);
  const drawdown = peak > 0 ? (net - peak) / peak : 0;
  const ev = m.lastEvent;

  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/orb" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#1d1d1f" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          scenarios
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">The Orb</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: "#6e6e73" }}>your portfolio, in one picture</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] tnum" style={{ color: "#6e6e73" }}>Day {m.step}</span>
          {running && (
            <div className="flex items-center rounded-full bg-white border border-black/10 overflow-hidden shadow-sm">
              <SpeedBtn label={speed === 0 ? "Play" : "Pause"} active={false} onClick={() => setSpeed(speed === 0 ? 1 : 0)} />
              {[1, 2, 4].map((s) => (
                <SpeedBtn key={s} label={`${s}×`} active={speed === s} onClick={() => setSpeed(s)} />
              ))}
            </div>
          )}
          <button onClick={restart} className="text-[13px] opacity-50 hover:opacity-90 transition">Restart</button>
        </div>
      </header>

      <main className="px-4 sm:px-8 pb-10 flex flex-col 2xl:flex-row gap-6 items-center 2xl:items-start justify-center">
        <div className="flex flex-col items-center gap-5">
          {/* stage */}
          <div className="relative rounded-3xl overflow-hidden shadow-sm border border-black/5"
            style={{ width: STAGE_W, height: STAGE_H, background: "linear-gradient(180deg, #fbfbfd 0%, #f2f3f6 68%, #e8eaef 100%)" }}>
            <OrbScene
              ref={sceneRef}
              width={STAGE_W}
              height={STAGE_H}
              player={{ value: invested, comp }}
              index={{ value: m.benchmark, comp: RAINBOW_COMP }}
              cash={m.cash}
              cashMax={1000}
              showIndex={showIndex}
              ghostR={fired.current.crash ? valueToRadius(peakInvested.current) : 0}
              fluid={fluid}
            />
            <FluidCycler fluid={fluid} setFluid={setFluid} />
            {/* hero number: during the crash it shows the fall from the high, in red */}
            <div className="absolute left-6 top-5">
              <div className="text-[12px] font-medium" style={{ color: "#6e6e73" }}>Net worth</div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[34px] leading-tight font-semibold tracking-tight tnum">{fmtMoney(net)}</span>
                {beat === "crash"
                  ? <DeltaChip value={drawdown} suffix="from the high" />
                  : beat === "end"
                  ? <span className="text-[12px] font-semibold tnum px-2 py-0.5 rounded-full"
                      style={net >= m.benchmark
                        ? { color: "#248a3d", background: "rgba(52,199,89,0.12)" }
                        : { color: "#d70015", background: "rgba(255,59,48,0.10)" }}>
                      {(net >= m.benchmark ? "+$" : "−$") + Math.round(Math.abs(net - m.benchmark)).toLocaleString("en-US")} vs the rainbow orb
                    </span>
                  : Math.abs(net - 1000) >= 1 && <DeltaChip value={(net - 1000) / 1000} />}
              </div>
            </div>
            {/* ghost ring label */}
            {fired.current.crash && peakInvested.current > invested * 1.08 && (
              <div className="absolute -translate-x-1/2 text-[12px] tnum"
                style={{ left: `${LAYOUT.playerX * 100}%`, top: STAGE_H * LAYOUT.groundY - 2 * valueToRadius(peakInvested.current) - 22, color: "#6e6e73" }}>
                before the crash · {fmtMoney(peakInvested.current)}
              </div>
            )}
            {/* labels pinned to scene anchors */}
            <StageLabel x={LAYOUT.playerX} title={orbName || "Your orb"} sub={invested > 0 ? fmtMoney(invested) : "empty"} highlight={beat === "intro"} />
            {showIndex && (
              <StageLabel x={LAYOUT.indexX} title="The rainbow orb" sub={`${fmtMoney(m.benchmark)} · $1,000 all-in day one`} />
            )}
            <StageLabel x={LAYOUT.resX} title="Cash" sub={fmtMoney(m.cash)} highlight={beat === "reservoir"} />

            {/* event toast */}
            {running && ev && (
              <div className="absolute left-1/2 -translate-x-1/2 top-5 px-4 py-2 rounded-full text-[13px] shadow-md pop-in border border-black/5"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", color: "#1d1d1f" }}>
                <span className="font-semibold">{ev.label}</span>
                <span style={{ color: "#6e6e73" }}> · {ev.blurb}</span>
              </div>
            )}
          </div>
          {/* tutorial card */}
          <div ref={endCardRef} className={`z-20 ${beat === "end" ? "w-[min(1080px,96vw)]" : "w-[min(600px,92vw)]"}`}>
            {beat === "intro" && (
              <Card title="This is your portfolio.">
                <p>Everything you own in the market lives in this one glass orb. Right now it holds nothing.</p>
                <Actions><Btn onClick={() => setBeat("reservoir")}>Next</Btn></Actions>
              </Card>
            )}
            {beat === "reservoir" && (
              <Card title="And this is your cash.">
                <p>You have $1,000 of money-green liquid in the dish. Cash isn't in the market. It just sits there, and it slowly fades.</p>
                <Actions><Btn onClick={() => setBeat("shop")}>Next</Btn></Actions>
              </Card>
            )}
            {beat === "shop" && (
              <Card title={holdings.length === 0 ? "Turn money into ownership." : "Add another color, or let the market run."}>
                {holdings.length === 0 && (
                  <p className="mb-1">When you buy a piece of a company, or a crypto coin, your money becomes that color inside your orb. Pick one.</p>
                )}
                <div className="flex flex-col gap-1.5 my-2">
                  {ORB_ASSETS.map((oa) => {
                    const asset = ASSETS.find((a) => a.id === oa.id)!;
                    const sel = selected === oa.id;
                    return (
                      <button key={oa.id} onClick={() => setSelected(sel ? null : oa.id)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl border transition text-left"
                        style={{ borderColor: sel ? oa.color : "rgba(0,0,0,0.08)", background: sel ? `${oa.color}14` : "#fff" }}>
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: oa.color }} />
                        <span className="text-sm font-medium flex-1">{asset.name}</span>
                        <span className="text-[12px]" style={{ color: "#6e6e73" }}>{asset.sector === "crypto" ? "crypto" : asset.sector}</span>
                        <span className="text-sm tnum" style={{ color: "#6e6e73" }}>{fmtMoney(m.prices[oa.id])}/share</span>
                      </button>
                    );
                  })}
                </div>
                {selected && (
                  <div className="flex items-center gap-2 mb-1">
                    {AMOUNTS.map((a) => (
                      <button key={a} onClick={() => setAmount(a)} disabled={a > m.cash}
                        className="px-3.5 py-1.5 rounded-full text-sm border transition disabled:opacity-30"
                        style={{ borderColor: amount === a ? "#0071e3" : "rgba(0,0,0,0.12)", background: amount === a ? "#0071e30f" : "#fff", color: amount === a ? "#0071e3" : "#1d1d1f" }}>
                        ${a}
                      </button>
                    ))}
                    <span className="text-[12px] ml-1 tnum" style={{ color: "#6e6e73" }}>
                      {Math.floor(Math.min(amount, m.cash) / m.prices[selected])} whole shares
                    </span>
                    <div className="flex-1" />
                    <Btn onClick={() => buy(selected, Math.min(amount, m.cash))} disabled={m.cash < 1}>Pour it in</Btn>
                  </div>
                )}
                {!selected && holdings.length > 0 && (
                  <Actions><Btn onClick={startMarket}>Let the market run</Btn></Actions>
                )}
              </Card>
            )}
            {beat === "meetIndex" && (
          <Card title="Meet the rainbow orb.">
            <p>It holds a tiny piece of every company in the market, sealed together. It starts with the same $1,000 as you.</p>
            <p className="mt-2">Time is about to speed up. You can pause or trade whenever you like.</p>
            <Actions><Btn onClick={beginTime}>Start time</Btn></Actions>
          </Card>
        )}
        {beat === "warn" && (
          <Card title="Prices are slipping.">
            <p>Something is wrong. Every color is starting to fall. Watch your orb.</p>
            <Actions><Btn onClick={() => { setBeat("run1"); setSpeed(1); }}>Okay</Btn></Actions>
          </Card>
        )}
        {beat === "run1" && speed > 0 && (
              <Caption>
                Prices change every day, and your orb changes with them. The rainbow orb next to yours holds a small piece of everything in the market. Its colors are sealed together.
              </Caption>
            )}
            {beat === "crash" && (
              <Card title="The market is crashing.">
                <p>
                  You're down <strong className="tnum">{Math.abs(drawdown * 100).toFixed(0)}%</strong> from the top.
              But every color is still in your orb. You own what you owned yesterday. Only the price changed.
                </p>
                <p className="mt-2 font-medium">Prices are still falling. What do you do?</p>
                <Actions>
                  <button onClick={hold} className="px-5 py-2.5 rounded-full text-sm font-medium border border-black/15 transition hover:bg-black/5"
                    style={{ color: "#1d1d1f", background: "#fff" }}>
                    Hold on
                  </button>
                  <button onClick={sellAll} className="px-5 py-2.5 rounded-full text-sm font-medium border border-black/15 transition hover:bg-black/5"
                    style={{ color: "#1d1d1f", background: "#fff" }}>
                    Sell everything
                  </button>
                </Actions>
              </Card>
            )}
            {beat === "run2" && choice === "sold" && speed > 0 && (
              <Caption>You sold everything at crash prices. Your money is back in the dish, sitting still.</Caption>
            )}
            {beat === "run2" && choice === "hold" && speed > 0 && (
              <Caption>You're holding on. Time keeps moving.</Caption>
            )}
            {beat === "end" && (
              <Card title={choice === "sold" ? "The recovery happened without you." : "The market recovered."} wide>
                <p>
                  {choice === "sold"
                    ? "Your money sat in the dish while every orb filled back up."
                    : "You held on, and your orb filled back up."}
                </p>
                <div className="flex gap-3 my-3">
                  <div className="flex-1 rounded-xl px-4 py-3 border"
                    style={{ background: net >= m.benchmark ? "#f0f7ff" : "#fafafc", borderColor: net >= m.benchmark ? "rgba(0,113,227,0.35)" : "rgba(0,0,0,0.08)" }}>
                    <div className="text-[12px] font-medium" style={{ color: "#6e6e73" }}>You finished with</div>
                    <div className="text-[24px] tracking-tight tnum" style={{ fontWeight: net >= m.benchmark ? 700 : 600, color: net >= m.benchmark ? "#1d1d1f" : "#3a3a3c" }}>{fmtMoney(net)}</div>
                  </div>
                  <div className="flex-1 rounded-xl px-4 py-3 border"
                    style={{ background: m.benchmark > net ? "#f0f7ff" : "#fafafc", borderColor: m.benchmark > net ? "rgba(0,113,227,0.35)" : "rgba(0,0,0,0.08)" }}>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#6e6e73" }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: RAINBOW_DOT }} />
                      The rainbow orb
                    </div>
                    <div className="text-[24px] tracking-tight tnum" style={{ fontWeight: m.benchmark > net ? 700 : 600, color: m.benchmark > net ? "#1d1d1f" : "#3a3a3c" }}>{fmtMoney(m.benchmark)}</div>
                  </div>
                </div>
                <div className="mb-3"><GrowthChart net={m.net} bench={m.bench} width={990} height={130} xLabels={["Day 0", "Day 48", "Day 96", "Day 144"]} /></div>
            <ul className="flex flex-col gap-2 text-[13.5px]" style={{ color: "#3a3a3c" }}>
                  <li className="flex gap-2"><Dot c="#0a84ff" /><span>Where did the money go in the crash? <strong>Nowhere.</strong> A price is what a buyer would pay today, not money stored in a box.</span></li>
                  <li className="flex gap-2"><Dot c="#bf5af2" /><span>One color falls hard when its industry stumbles. The rainbow orb barely flinches. That's why it's so hard to beat.</span></li>
              <li className="flex gap-2"><Dot c="#30d158" /><span>And the money you spent on shares went to the investors who sold them to you. The companies got nothing. Prices are trades between people.</span></li>
                </ul>
                <Actions>
                  <Btn onClick={() => downloadOrbCard({
                    comp,
                    value: net,
                    headline: orbName ? `This is ${orbName}.` : "This is your orb.",
                    subline: choice === "sold" ? "Lesson 1 · sold in the crash" : "Lesson 1 · held through the crash",
                    index: { label: "The rainbow orb", value: m.benchmark },
                    rows: [
                      ...holdings.slice().sort((a, b) => b.value - a.value).slice(0, 4)
                        .map((h) => ({ color: h.oa.color, label: h.asset.name, right: fmtMoney(h.value) })),
                      { color: "#c7c7cc", label: "Cash", right: fmtMoney(m.cash) },
                    ],
                    footer: "Share Garden · The Orb",
                  })}>Save your orb</Btn>
                  <GhostBtn onClick={restart}>Play again</GhostBtn>
                  <span className="text-[12.5px] self-center" style={{ color: "#6e6e73" }}>
                    {choice === "sold" ? "Try holding on this time." : "Try selling during the crash and see what it costs."}
                  </span>
                </Actions>
              </Card>
            )}
          </div>
        </div>

        {/* right rail */}
        <div className="w-full max-w-xs flex flex-col gap-4">
          <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
            <div className="text-[13px] font-semibold mb-3" style={{ color: "#6e6e73" }}>Inside your orb</div>
            {holdings.length === 0 && (
              <div className="text-sm py-1" style={{ color: "#6e6e73" }}>
                {beat === "end" ? "Empty. You sold everything." : "Nothing here yet. Clear glass."}
              </div>
            )}
            {holdings.map((h, hi) => {
              const pct = pcts[hi] ?? 0;
              const open = tradeRow === h.oa.id;
              return (
                <div key={h.oa.id} className="py-2 border-b border-black/5 last:border-0">
                  <button className="w-full flex items-center gap-3 text-left" disabled={!canTrade}
                    onClick={() => canTrade && setTradeRow(open ? null : h.oa.id)}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: h.oa.color, boxShadow: `0 0 0 3px ${h.oa.color}22` }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{h.asset.name}</div>
                      <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{Math.round(h.shares)} {Math.round(h.shares) === 1 ? "share" : "shares"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tnum">{fmtMoney(h.value)}</div>
                      <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{pct}%</div>
                    </div>
                  </button>
                  <div className="mt-1.5 ml-6 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: h.oa.color }} />
                  </div>
                  {open && canTrade && (
                    <div className="ml-6 mt-2 flex flex-wrap items-center gap-1.5 pop-in">
                      <div className="w-full"><Sparkline width={180} height={40} data={m.history[h.oa.id]} color={h.oa.color} /></div>
                      {[100, 250].map((a) => (
                        <TradeChip key={a} disabled={m.cash < 1} onClick={() => buy(h.oa.id, Math.min(a, m.cash))}>
                          Buy ${Math.min(a, Math.floor(m.cash))}
                        </TradeChip>
                      ))}
                      <TradeChip onClick={() => sellFrac(h.oa.id, 0.5)}>Sell half</TradeChip>
                      <TradeChip onClick={() => { sellFrac(h.oa.id, 1); setTradeRow(null); }}>Sell all</TradeChip>
                    </div>
                  )}
                </div>
              );
            })}
            {canTrade && (
              <div className="pt-2">
                <div className="text-[11.5px] font-medium mb-1" style={{ color: "#6e6e73" }}>Add a color</div>
                {ORB_ASSETS.filter((oa) => !holdings.some((h) => h.oa.id === oa.id)).map((oa) => {
                  const asset = ASSETS.find((a) => a.id === oa.id)!;
                  const open = tradeRow === `add-${oa.id}`;
                  return (
                    <div key={oa.id}>
                      <button className="w-full flex items-center gap-2.5 py-1.5 text-left"
                        onClick={() => setTradeRow(open ? null : `add-${oa.id}`)}>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: oa.color }} />
                        <span className="text-[13px] flex-1 truncate">{asset.name}</span>
                        <span className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{fmtMoney(m.prices[oa.id])}</span>
                      </button>
                      {open && (
                        <div className="ml-5 mb-1.5 flex flex-wrap gap-1.5 pop-in">
                          <div className="w-full"><Sparkline width={180} height={40} data={m.history[oa.id]} color={oa.color} /></div>
                          {[100, 250].map((a) => (
                            <TradeChip key={a} disabled={m.cash < 1} onClick={() => { buy(oa.id, Math.min(a, m.cash)); setTradeRow(null); }}>
                              Buy ${Math.min(a, Math.floor(m.cash))}
                            </TradeChip>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-black/8">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#bfe6cc", boxShadow: "inset 0 0 0 1.5px rgba(66,160,102,0.55)" }} />
              <div className="text-sm flex-1" style={{ color: "#6e6e73" }}>Cash</div>
              <div className="text-sm font-semibold tnum">{fmtMoney(m.cash)}</div>
            </div>
          </div>

          {showIndex && (
            <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: RAINBOW_DOT }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">The rainbow orb</div>
                  <div className="text-[12px]" style={{ color: "#6e6e73" }}>a slice of everything, sealed</div>
                </div>
                <div className="text-sm font-semibold tnum">{fmtMoney(m.benchmark)}</div>
              </div>
            </div>
          )}
          {showIndex && beat !== "end" && m.net.length > 10 && (
            <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
              <div className="text-[13px] font-semibold mb-2" style={{ color: "#6e6e73" }}>Growth</div>
              <GrowthChart net={m.net} bench={m.bench} width={272} height={80} xLabels={["Day 0", `Day ${m.step}`]} />
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
