import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ASSETS, MarketEvent, fmtMoney } from "../engine/market";
import { useSim } from "../lib/useSim";
import { CompSlice, FREE_ASSETS, roundPcts, valueToRadius } from "../lib/orbModel";
import { downloadOrbCard } from "../lib/orbCard";
import OrbScene, { LAYOUT, OrbSceneHandle } from "../components/OrbScene";
import {
  Btn, Dot, FluidCycler, GhostBtn, GrowthChart, RAINBOW_DOT, Sparkline,
  SpeedBtn, StageLabel, TradeChip, useFluidPref,
} from "../components/OrbUI";

// Freeplay: the seeded fictional market, every color, no script, no ending.
// Finish whenever you like and take your orb with you.

const STAGE_W = 1080;
const STAGE_H = 440;
const MAX_DAYS = 365;

const FREE_EVENTS: MarketEvent[] = [
  { atStep: 26, days: 5,  drift: 0.010,  vol: 0.010, scope: "tech",   label: "Tech rally",     blurb: "Everyone is piling into tech. Prices are running hot." },
  { atStep: 48, days: 7,  drift: -0.045, vol: 0.030, scope: "market", label: "Market crash",   blurb: "Every price is falling at once." },
  { atStep: 74, days: 6,  drift: -0.030, vol: 0.020, scope: "crypto", label: "Crypto wipeout", blurb: "Speculative coins are collapsing." },
  { atStep: 96, days: 6,  drift: -0.030, vol: 0.015, scope: "tech",   label: "Tech selloff",   blurb: "The whole tech sector is falling together." },
  { atStep: 120, days: 14, drift: 0.020, vol: 0.010, scope: "market", label: "Recovery",       blurb: "The market is climbing back." },
  { atStep: 190, days: 7,  drift: -0.040, vol: 0.030, scope: "market", label: "Another crash", blurb: "They keep happening. That's the deal." },
  { atStep: 240, days: 16, drift: 0.018, vol: 0.010, scope: "market", label: "Recovery",       blurb: "Patience pays, again." },
];

const RAINBOW_COMP: CompSlice[] = [
  ["#ff453a", "#ff9d97"], ["#ff9f0a", "#ffcf7a"], ["#ffd60a", "#ffe97a"], ["#30d158", "#8ff0ae"],
  ["#64d2ff", "#b0e8ff"], ["#0a84ff", "#7cc0ff"], ["#bf5af2", "#e0a9ff"],
].map(([color, glow], i) => ({ key: `r${i}`, color, glow, frac: 1 / 7 }));

export default function OrbFree() {
  const { m, speed, setSpeed, reset, act } = useSim({ cash: 1000, maxStep: MAX_DAYS, events: FREE_EVENTS });
  const [fluid, setFluid] = useFluidPref();
  const [tradeRow, setTradeRow] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const sceneRef = useRef<OrbSceneHandle>(null);
  const peakInvested = useRef(0);
  const crashSeen = useRef(false);
  const maxSeen = useRef(1000);

  const holdings = useMemo(
    () =>
      FREE_ASSETS.map((oa) => {
        const asset = ASSETS.find((a) => a.id === oa.id)!;
        const h = m.holdings[oa.id];
        return { oa, asset, shares: h?.shares ?? 0, value: (h?.shares ?? 0) * m.prices[oa.id] };
      }).filter((x) => x.shares > 1e-6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.step, m.cash, tradeRow, finished]
  );
  const invested = holdings.reduce((s, h) => s + h.value, 0);
  if (invested > peakInvested.current) peakInvested.current = invested;
  const pcts = roundPcts(holdings.map((h) => h.value));
  const comp: CompSlice[] = holdings.map((h) => ({
    key: h.oa.id, color: h.oa.color, glow: h.oa.glow, frac: invested > 0 ? h.value / invested : 0,
  }));
  const net = m.cash + invested;
  maxSeen.current = Math.max(maxSeen.current, invested, m.benchmark);
  const radiusScale = Math.min(1, 158 / valueToRadius(maxSeen.current));
  const peak = Math.max(...m.net);
  const drawdown = peak > 0 ? (net - peak) / peak : 0;
  if (drawdown < -0.15) crashSeen.current = true;

  const buy = (id: string, dollars: number) => {
    const oa = FREE_ASSETS.find((a) => a.id === id)!;
    act((mm) => { mm.buy(id, Math.min(dollars, mm.cash)); });
    sceneRef.current?.pour({ kind: "buy", color: oa.color, glow: oa.glow });
  };
  const sellFrac = (id: string, frac: number) => {
    const oa = FREE_ASSETS.find((a) => a.id === id)!;
    act((mm) => { mm.sellFraction(id, frac); });
    sceneRef.current?.pour({ kind: "sell", color: oa.color, glow: oa.glow });
  };

  const restart = () => {
    reset();
    setFinished(false);
    setTradeRow(null);
    peakInvested.current = 0;
    crashSeen.current = false;
    maxSeen.current = 1000;
  };

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
          <span className="text-lg font-semibold tracking-tight">Freeplay</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: "#6e6e73" }}>a toy market, no script</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] tnum" style={{ color: "#6e6e73" }}>Day {m.step}</span>
          <div className="flex items-center rounded-full bg-white border border-black/10 overflow-hidden shadow-sm">
            <SpeedBtn label={speed === 0 ? "Play" : "Pause"} active={false} onClick={() => setSpeed(speed === 0 ? 1 : 0)} />
            {[1, 2, 4].map((s) => (
              <SpeedBtn key={s} label={`${s}×`} active={speed === s} onClick={() => setSpeed(s)} />
            ))}
          </div>
          {!finished && m.step > 10 && (
            <button onClick={() => { setSpeed(0); setFinished(true); }} className="text-[13px] font-medium" style={{ color: "#0071e3" }}>Finish</button>
          )}
          <button onClick={restart} className="text-[13px] opacity-50 hover:opacity-90 transition">Restart</button>
        </div>
      </header>

      <main className="px-4 sm:px-8 pb-4 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center">
        <div className="flex flex-col items-center gap-5">
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
              showIndex
              ghostR={crashSeen.current ? valueToRadius(peakInvested.current) * radiusScale : 0}
              fluid={fluid}
              radiusScale={radiusScale}
            />
            <FluidCycler fluid={fluid} setFluid={setFluid} />
            <div className="absolute left-6 top-5">
              <div className="text-[12px] font-medium" style={{ color: "#6e6e73" }}>Net worth</div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[34px] leading-tight font-semibold tracking-tight tnum">{fmtMoney(net)}</span>
                {Math.abs(net - 1000) >= 1 && <DeltaLine net={net} bench={m.benchmark} />}
              </div>
            </div>
            <StageLabel x={LAYOUT.playerX} title="Your orb" sub={invested > 0 ? fmtMoney(invested) : "empty"} />
            <StageLabel x={LAYOUT.indexX} title="The rainbow orb" sub={`${fmtMoney(m.benchmark)} · $1,000 all-in day one`} />
            <StageLabel x={LAYOUT.resX} title="Cash" sub={fmtMoney(m.cash)} />
            {ev && !finished && (
              <div className="absolute left-1/2 -translate-x-1/2 top-5 px-4 py-2 rounded-full text-[13px] shadow-md pop-in border border-black/5"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", color: "#1d1d1f" }}>
                <span className="font-semibold">{ev.label}</span>
                <span style={{ color: "#6e6e73" }}> · {ev.blurb}</span>
              </div>
            )}
          </div>

          {finished && (
            <div className="z-20 w-[min(1080px,96vw)]">
              <div className="pop-in rounded-2xl border border-black/8 shadow-xl p-5 w-full" style={{ background: "rgba(255,255,255,0.92)" }}>
                <div className="text-[15px] font-semibold mb-1.5 tracking-tight">Day {m.step}. Your sandbox, your orb.</div>
                <div className="mb-3"><GrowthChart net={m.net} bench={m.bench} width={990} height={130} xLabels={["Day 0", `Day ${Math.floor(m.step / 2)}`, `Day ${m.step}`]} /></div>
                <ul className="flex flex-col gap-2 text-[13.5px]" style={{ color: "#3a3a3c" }}>
                  <li className="flex gap-2"><Dot c="#0a84ff" /><span>You finished with {fmtMoney(net)}. The rainbow orb has {fmtMoney(m.benchmark)}.</span></li>
                </ul>
                <div className="flex gap-2.5 mt-3">
                  <Btn onClick={() => downloadOrbCard({
                    comp,
                    value: net,
                    headline: "This is your orb.",
                    subline: `Freeplay · day ${m.step}`,
                    index: { label: "The rainbow orb", value: m.benchmark },
                    rows: [
                      ...holdings.slice().sort((a, b) => b.value - a.value).slice(0, 4)
                        .map((h) => ({ color: h.oa.color, label: h.asset.name, right: fmtMoney(h.value) })),
                      { color: "#bfe6cc", label: "Cash", right: fmtMoney(m.cash) },
                    ],
                    footer: "Share Garden · The Orb",
                  })}>Save your orb</Btn>
                  <GhostBtn onClick={() => setFinished(false)}>Keep playing</GhostBtn>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full max-w-xs flex flex-col gap-4">
          <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
            <div className="text-[13px] font-semibold mb-3" style={{ color: "#6e6e73" }}>Inside your orb</div>
            {holdings.length === 0 && (
              <div className="text-sm py-1" style={{ color: "#6e6e73" }}>Nothing here yet. Clear glass.</div>
            )}
            {holdings.map((h, hi) => {
              const pct = pcts[hi] ?? 0;
              const open = tradeRow === h.oa.id;
              return (
                <div key={h.oa.id} className="py-2 border-b border-black/5 last:border-0">
                  <button className="w-full flex items-center gap-3 text-left" onClick={() => setTradeRow(open ? null : h.oa.id)}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: h.oa.color, boxShadow: `0 0 0 3px ${h.oa.color}22` }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{h.asset.name}</div>
                      <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{h.shares.toFixed(1)} shares</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tnum">{fmtMoney(h.value)}</div>
                      <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{pct}%</div>
                    </div>
                  </button>
                  <div className="mt-1.5 ml-6 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: h.oa.color }} />
                  </div>
                  {open && (
                    <div className="ml-6 mt-2 flex flex-wrap items-center gap-1.5 pop-in">
                      <div className="w-full"><Sparkline width={180} height={40} data={m.history[h.oa.id]} color={h.oa.color} /></div>
                      {[100, 250].map((a) => (
                        <TradeChip key={a} disabled={m.cash < 1} onClick={() => buy(h.oa.id, a)}>
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
            <div className="pt-2">
              <div className="text-[11.5px] font-medium mb-1" style={{ color: "#6e6e73" }}>Add a color</div>
              {FREE_ASSETS.filter((oa) => !holdings.some((h) => h.oa.id === oa.id)).map((oa) => {
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
                          <TradeChip key={a} disabled={m.cash < 1} onClick={() => { buy(oa.id, a); setTradeRow(null); }}>
                            Buy ${Math.min(a, Math.floor(m.cash))}
                          </TradeChip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-black/8">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#bfe6cc", boxShadow: "inset 0 0 0 1.5px rgba(66,160,102,0.55)" }} />
              <div className="text-sm flex-1" style={{ color: "#6e6e73" }}>Cash</div>
              <div className="text-sm font-semibold tnum">{fmtMoney(m.cash)}</div>
            </div>
          </div>

          {!finished && m.net.length > 10 && (
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

function DeltaLine({ net, bench }: { net: number; bench: number }) {
  const up = net >= bench;
  return (
    <span className="text-[12px] font-semibold tnum px-2 py-0.5 rounded-full"
      style={{ color: up ? "#248a3d" : "#d70015", background: up ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.10)" }}>
      {(up ? "+$" : "−$") + Math.round(Math.abs(net - bench)).toLocaleString("en-US")} vs the rainbow orb
    </span>
  );
}
