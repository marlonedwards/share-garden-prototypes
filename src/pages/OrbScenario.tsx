import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fmtMoney } from "../engine/market";
import { HistoryMarket } from "../engine/history";
import { useSim } from "../lib/useSim";
import { CompSlice, roundPcts, valueToRadius } from "../lib/orbModel";
import { downloadOrbCard } from "../lib/orbCard";
import { getScenario } from "../lib/scenarios";
import OrbScene, { LAYOUT, OrbSceneHandle } from "../components/OrbScene";
import {
  Actions, Btn, Caption, Card, DeltaChip, Dot, FluidCycler, GhostBtn, GrowthChart,
  RAINBOW_DOT, Sparkline, SpeedBtn, StageLabel, TradeChip, useFluidPref,
} from "../components/OrbUI";

// One page, every era. The scenario config supplies the dataset, cast,
// moments, and copy; this page supplies the loop: brief, run (free trading,
// optional paydays), end. All eras run real prices; the rainbow orb is the
// real S&P 500 total return.

type Beat = "brief" | "run" | "payday" | "end";

const STAGE_W = 1080;
const STAGE_H = 440;

const RAINBOW_COMP: CompSlice[] = [
  ["#ff453a", "#ff9d97"], ["#ff9f0a", "#ffcf7a"], ["#ffd60a", "#ffe97a"], ["#30d158", "#8ff0ae"],
  ["#64d2ff", "#b0e8ff"], ["#0a84ff", "#7cc0ff"], ["#bf5af2", "#e0a9ff"],
].map(([color, glow], i) => ({ key: `r${i}`, color, glow, frac: 1 / 7 }));

export default function OrbScenario() {
  const { id } = useParams();
  const cfg = getScenario(id);
  const lastStep = cfg.lastStep ?? cfg.dataset.months.length - 1;

  const { m, speed, setSpeed, done, reset, act } = useSim<HistoryMarket>({
    maxStep: lastStep,
    make: () => new HistoryMarket({
      dataset: cfg.dataset, indexKey: cfg.indexKey, cash: cfg.startCash,
      income: cfg.income, moments: cfg.moments, lastStep,
    }),
  });
  const [beat, setBeat] = useState<Beat>("brief");
  const [fluid, setFluid] = useFluidPref();
  const [tradeRow, setTradeRow] = useState<string | null>(null);
  const [fractional, setFractional] = useState(cfg.fractionalDefault);
  const [payMode, setPayMode] = useState<"unset" | "auto" | "ask">("unset");
  const sceneRef = useRef<OrbSceneHandle>(null);
  const endCardRef = useRef<HTMLDivElement>(null);
  const peakInvested = useRef(0);
  const crashSeen = useRef(false);
  const lastPay = useRef(0);

  const holdings = useMemo(
    () =>
      cfg.assets.map((ea) => {
        const h = m.holdings[ea.id];
        return { ea, shares: h?.shares ?? 0, value: (h?.shares ?? 0) * m.prices[ea.id] };
      }).filter((x) => x.shares > 1e-6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.step, m.cash, beat, tradeRow, cfg]
  );
  const invested = holdings.reduce((s, h) => s + h.value, 0);
  if (invested > peakInvested.current) peakInvested.current = invested;
  const pcts = roundPcts(holdings.map((h) => h.value));
  const comp: CompSlice[] = holdings.map((h) => ({
    key: h.ea.id, color: h.ea.color, glow: h.ea.glow, frac: invested > 0 ? h.value / invested : 0,
  }));
  const net = m.cash + invested;
  const contributed = cfg.startCash + (cfg.income ?? 0) * m.step;
  const maxSeen = useRef(1000);
  maxSeen.current = Math.max(maxSeen.current, invested, m.benchmark, cfg.startCash);
  const radiusScale = Math.min(1, 158 / valueToRadius(maxSeen.current));
  const peak = Math.max(...m.net);
  const drawdown = peak > 0 ? (net - peak) / peak : 0;
  const inCrash = drawdown < -0.15;
  if (inCrash) crashSeen.current = true;

  // end of the tape
  useEffect(() => {
    if ((beat === "run" || beat === "payday") && (done || m.step >= lastStep)) { setSpeed(0); setBeat("end"); }
  });

  // paydays: pause and ask, or auto-invest by current orb weights
  useEffect(() => {
    if (!cfg.income || beat !== "run") return;
    if (m.step > lastPay.current) {
      lastPay.current = m.step;
      if (invested <= 0) return;                 // nothing to follow yet; cash just accumulates
      if (payMode === "auto") {
        act((mm) => {
          const inv = mm.invested();
          if (inv <= 0) return;
          for (const key of Object.keys(mm.holdings)) {
            const w = (mm.holdings[key].shares * mm.prices[key]) / inv;
            mm.buy(key, Math.min((cfg.income ?? 0) * w, mm.cash));
          }
        });
      } else {
        setSpeed(0);
        setBeat("payday");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.step, beat]);

  useEffect(() => {
    if (beat === "end") setTimeout(() => endCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 350);
  }, [beat]);

  const investIncomeNow = () => {
    act((mm) => {
      const inv = mm.invested();
      if (inv <= 0) return;
      for (const key of Object.keys(mm.holdings)) {
        const w = (mm.holdings[key].shares * mm.prices[key]) / inv;
        mm.buy(key, Math.min((cfg.income ?? 0) * w, mm.cash));
      }
    });
    sceneRef.current?.pour({ kind: "buy", color: "#30d158", glow: "#8ff0ae" });
  };

  const buy = (assetId: string, dollars: number) => {
    const ea = cfg.assets.find((a) => a.id === assetId)!;
    let spend = Math.min(dollars, m.cash);
    if (!fractional) {
      const n = Math.floor(spend / m.prices[assetId]);
      if (n < 1) return;
      spend = n * m.prices[assetId];
    }
    act((mm) => { mm.buy(assetId, spend); });
    sceneRef.current?.pour({ kind: "buy", color: ea.color, glow: ea.glow });
  };
  const sellFrac = (assetId: string, frac: number) => {
    const ea = cfg.assets.find((a) => a.id === assetId)!;
    let f = frac;
    if (!fractional) {
      const h = m.holdings[assetId];
      if (!h || h.shares < 1) f = 1;
      else f = Math.max(1, Math.floor(h.shares * frac + 1e-9)) / h.shares;
    }
    act((mm) => { mm.sellFraction(assetId, f); });
    sceneRef.current?.pour({ kind: "sell", color: ea.color, glow: ea.glow });
  };

  const restart = () => {
    reset();
    setBeat("brief");
    setTradeRow(null);
    setPayMode("unset");
    peakInvested.current = 0;
    crashSeen.current = false;
    lastPay.current = 0;
    maxSeen.current = 1000;
  };

  const saveCard = () => {
    downloadOrbCard({
      comp,
      value: net,
      headline: "This is your orb.",
      subline: cfg.cardSubline,
      index: { label: "The rainbow orb (real S&P 500)", value: m.benchmark },
      rows: [
        ...holdings.slice().sort((a, b) => b.value - a.value).slice(0, 4)
          .map((h) => ({ color: h.ea.color, label: h.ea.name, right: fmtMoney(h.value) })),
        { color: "#bfe6cc", label: "Cash", right: fmtMoney(m.cash) },
      ],
      footer: "Share Garden · The Orb",
    });
  };

  const running = beat === "run";
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
          <span className="text-lg font-semibold tracking-tight">{cfg.title}</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: "#6e6e73" }}>{cfg.headerSub}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] tnum" style={{ color: "#6e6e73" }}>{m.monthLabel()}</span>
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

      <main className="px-4 sm:px-8 pb-4 flex flex-col 2xl:flex-row gap-6 items-center 2xl:items-start justify-center">
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
              cashMax={Math.max(cfg.startCash, 1000)}
              showIndex={beat !== "brief"}
              ghostR={crashSeen.current ? valueToRadius(peakInvested.current) * radiusScale : 0}
              fluid={fluid}
              radiusScale={radiusScale}
            />
            <FluidCycler fluid={fluid} setFluid={setFluid} />
            <button onClick={() => setFractional(!fractional)}
              className="absolute right-4 top-14 text-[11.5px] font-medium px-3 py-1 rounded-full bg-white border border-black/10 shadow-sm hover:bg-black/5 transition"
              style={{ color: "#6e6e73" }}>
              {fractional ? "Fractional shares: on" : "Whole shares"}
            </button>
            <div className="absolute left-6 top-5">
              <div className="text-[12px] font-medium" style={{ color: "#6e6e73" }}>Net worth</div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[34px] leading-tight font-semibold tracking-tight tnum">{fmtMoney(net)}</span>
                {beat === "end"
                  ? <span className="text-[12px] font-semibold tnum px-2 py-0.5 rounded-full"
                      style={net >= m.benchmark
                        ? { color: "#248a3d", background: "rgba(52,199,89,0.12)" }
                        : { color: "#d70015", background: "rgba(255,59,48,0.10)" }}>
                      {(net >= m.benchmark ? "+$" : "−$") + Math.round(Math.abs(net - m.benchmark)).toLocaleString("en-US")} vs the rainbow orb
                    </span>
                  : inCrash
                  ? <DeltaChip value={drawdown} suffix="from the high" />
                  : Math.abs(net - contributed) >= 1 && <DeltaChip value={(net - contributed) / contributed} />}
              </div>
            </div>
            {crashSeen.current && peakInvested.current > invested * 1.08 && (
              <div className="absolute -translate-x-1/2 text-[12px] tnum"
                style={{ left: `${LAYOUT.playerX * 100}%`, top: STAGE_H * LAYOUT.groundY - 2 * valueToRadius(peakInvested.current) * radiusScale - 22, color: "#6e6e73" }}>
                the high · {fmtMoney(peakInvested.current)}
              </div>
            )}
            <StageLabel x={LAYOUT.playerX} title="Your orb" sub={invested > 0 ? fmtMoney(invested) : "empty"} />
            {beat !== "brief" && (
              <StageLabel x={LAYOUT.indexX} title="The rainbow orb" sub={`${fmtMoney(m.benchmark)} · ${cfg.income ? "same income, all-in" : "$1,000 all-in day one"}`} />
            )}
            <StageLabel x={LAYOUT.resX} title="Cash" sub={fmtMoney(m.cash)} />
            {running && ev && (
              <div className="absolute left-1/2 -translate-x-1/2 top-5 px-4 py-2 rounded-full text-[13px] shadow-md pop-in border border-black/5"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", color: "#1d1d1f" }}>
                <span className="font-semibold">{ev.label}</span>
                <span style={{ color: "#6e6e73" }}> · {ev.blurb}</span>
              </div>
            )}
          </div>

          <div ref={endCardRef} className={`z-20 ${beat === "end" ? "w-[min(1080px,96vw)]" : "w-[min(620px,92vw)]"}`}>
            {beat === "brief" && (
              <Card title={cfg.briefTitle}>
                {cfg.briefBody.map((p, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>{p}</p>
                ))}
                <Actions><Btn onClick={() => { setBeat("run"); setSpeed(1); }}>{cfg.startLabel}</Btn></Actions>
              </Card>
            )}
            {beat === "run" && speed > 0 && m.step < 4 && !cfg.income && (
              <Caption>Pause anytime to trade. The tape runs to the end either way.</Caption>
            )}
            {beat === "run" && speed > 0 && m.step < 4 && cfg.income && (
              <Caption>Buy your first colors, then your income can follow them every month.</Caption>
            )}
            {beat === "payday" && (
              <Card title={`Payday. ${fmtMoney(cfg.income ?? 0)} arrived.`}>
                <p>Invest it into your colors in their current mix, or keep it as cash.</p>
                <Actions>
                  <Btn onClick={() => { investIncomeNow(); setPayMode("auto"); setBeat("run"); setSpeed(1); }}>Invest, and do this automatically</Btn>
                  <GhostBtn onClick={() => { investIncomeNow(); setPayMode("ask"); setBeat("run"); setSpeed(1); }}>Invest, ask me each payday</GhostBtn>
                  <GhostBtn onClick={() => { setBeat("run"); setSpeed(1); }}>Keep as cash</GhostBtn>
                </Actions>
              </Card>
            )}
            {beat === "end" && (
              <Card title={cfg.endTitle} wide>
                <div className="flex gap-3 my-3">
                  <div className="flex-1 rounded-xl px-4 py-3 border"
                    style={{ background: net >= m.benchmark ? "#f0f7ff" : "#fafafc", borderColor: net >= m.benchmark ? "rgba(0,113,227,0.35)" : "rgba(0,0,0,0.08)" }}>
                    <div className="text-[12px] font-medium" style={{ color: "#6e6e73" }}>You finished with</div>
                    <div className="text-[24px] tracking-tight tnum" style={{ fontWeight: net >= m.benchmark ? 700 : 600 }}>{fmtMoney(net)}</div>
                  </div>
                  <div className="flex-1 rounded-xl px-4 py-3 border"
                    style={{ background: m.benchmark > net ? "#f0f7ff" : "#fafafc", borderColor: m.benchmark > net ? "rgba(0,113,227,0.35)" : "rgba(0,0,0,0.08)" }}>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#6e6e73" }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: RAINBOW_DOT }} />
                      The rainbow orb
                    </div>
                    <div className="text-[24px] tracking-tight tnum" style={{ fontWeight: m.benchmark > net ? 700 : 600 }}>{fmtMoney(m.benchmark)}</div>
                  </div>
                </div>
                {cfg.income && holdings.length > 0 && (() => {
                  const top = holdings.slice().sort((a, b) => b.value - a.value)[0];
                  const hh = m.holdings[top.ea.id];
                  const avg = hh && hh.shares > 0 ? (hh.cost > 0 ? hh.cost / hh.shares : 0) : 0;
                  return avg > 0 ? (
                    <p className="mb-3 text-[13px]" style={{ color: "#6e6e73" }}>
                      Your average cost for {top.ea.name}: <strong className="tnum" style={{ color: "#1d1d1f" }}>{fmtMoney(avg)}</strong> a share.
                      It closes at <strong className="tnum" style={{ color: "#1d1d1f" }}>{fmtMoney(m.prices[top.ea.id])}</strong>. Steady months bought the dips for you.
                    </p>
                  ) : null;
                })()}
                <div className="mb-3"><GrowthChart net={m.net} bench={m.bench} width={990} height={130} xLabels={[m.monthLabel(0), m.monthLabel(Math.floor(lastStep / 3)), m.monthLabel(Math.floor((2 * lastStep) / 3)), m.monthLabel(lastStep)]} /></div>
                <ul className="flex flex-col gap-2 text-[13.5px]" style={{ color: "#3a3a3c" }}>
                  {cfg.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2"><Dot c={b.c} /><span>{b.text}</span></li>
                  ))}
                </ul>
                <Actions>
                  <Btn onClick={saveCard}>Save your orb</Btn>
                  <GhostBtn onClick={restart}>Play again</GhostBtn>
                </Actions>
              </Card>
            )}
          </div>
        </div>

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
              const open = tradeRow === h.ea.id;
              return (
                <div key={h.ea.id} className="py-2 border-b border-black/5 last:border-0">
                  <button className="w-full flex items-center gap-3 text-left" onClick={() => setTradeRow(open ? null : h.ea.id)}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: h.ea.color, boxShadow: `0 0 0 3px ${h.ea.color}22` }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{h.ea.name}</div>
                      <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{fractional ? h.shares.toFixed(1) : Math.round(h.shares)} shares</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tnum">{fmtMoney(h.value)}</div>
                      <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{pct}%</div>
                    </div>
                  </button>
                  <div className="mt-1.5 ml-6 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: h.ea.color }} />
                  </div>
                  {open && (
                    <div className="ml-6 mt-2 flex flex-wrap items-center gap-1.5 pop-in">
                      <div className="w-full"><Sparkline width={180} height={40} data={m.history[h.ea.id]} color={h.ea.color} /></div>
                      {[100, 250].map((a) => (
                        <TradeChip key={a} disabled={fractional ? m.cash < 1 : Math.floor(Math.min(a, m.cash) / m.prices[h.ea.id]) < 1}
                          onClick={() => buy(h.ea.id, Math.min(a, m.cash))}>
                          Buy ${Math.min(a, Math.floor(m.cash))}
                        </TradeChip>
                      ))}
                      <TradeChip onClick={() => sellFrac(h.ea.id, 0.5)}>Sell half</TradeChip>
                      <TradeChip onClick={() => { sellFrac(h.ea.id, 1); setTradeRow(null); }}>Sell all</TradeChip>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-2">
              <div className="text-[11.5px] font-medium mb-1" style={{ color: "#6e6e73" }}>Add a color</div>
              {cfg.assets.filter((ea) => !holdings.some((h) => h.ea.id === ea.id)).map((ea) => {
                const open = tradeRow === `add-${ea.id}`;
                return (
                  <div key={ea.id}>
                    <button className="w-full flex items-center gap-2.5 py-1.5 text-left" title={ea.desc}
                      onClick={() => setTradeRow(open ? null : `add-${ea.id}`)}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ea.color }} />
                      <span className="text-[13px] flex-1 truncate">{ea.name}</span>
                      <span className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{fmtMoney(m.prices[ea.id])}</span>
                    </button>
                    {open && (
                      <div className="ml-5 mb-1.5 pop-in">
                        <div className="text-[11.5px] mb-1" style={{ color: "#6e6e73" }}>{ea.desc}</div>
                        <div className="mb-1.5"><Sparkline width={180} height={40} data={m.history[ea.id]} color={ea.color} /></div>
                        <div className="flex gap-1.5">
                          {[100, 250].map((a) => (
                            <TradeChip key={a} disabled={fractional ? m.cash < 1 : Math.floor(Math.min(a, m.cash) / m.prices[ea.id]) < 1}
                              onClick={() => { buy(ea.id, Math.min(a, m.cash)); setTradeRow(null); }}>
                              Buy ${Math.min(a, Math.floor(m.cash))}
                            </TradeChip>
                          ))}
                        </div>
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

          {beat !== "brief" && (
            <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: RAINBOW_DOT }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">The rainbow orb</div>
                  <div className="text-[12px]" style={{ color: "#6e6e73" }}>{cfg.indexSub}</div>
                </div>
                <div className="text-sm font-semibold tnum">{fmtMoney(m.benchmark)}</div>
              </div>
            </div>
          )}
          {beat !== "brief" && beat !== "end" && m.net.length > 10 && (
            <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
              <div className="text-[13px] font-semibold mb-2" style={{ color: "#6e6e73" }}>Growth</div>
              <GrowthChart net={m.net} bench={m.bench} width={272} height={80} xLabels={[m.monthLabel(0), m.monthLabel()]} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
