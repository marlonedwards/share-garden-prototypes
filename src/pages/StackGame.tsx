import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fmtMoney } from "../engine/market";
import { HistoryMarket } from "../engine/history";
import { useSim } from "../lib/useSim";
import { Gate, getScenario } from "../lib/scenarios";
import { getOrbName } from "../lib/orbIdentity";
import { clippingAt } from "../lib/headlines";
import { ClippingCard } from "../components/NewsBits";
import StackStage, { StackBand } from "../components/StackStage";

// The Stack, playable slice v2. The index is not the opponent; it is the
// path. The win is finishing inside a corridor around it, and the three
// stars are named behaviors, not an outcome: Spread out, Stayed in, On the
// path. Trades are free and unlimited; the level's difficulty is emotional,
// delivered by the era's real gates, which pause the tape at the exact
// moments people historically got it wrong.

const STAGE_W = 980;
const STAGE_H = 460;
const BUY = 250;
const CORRIDOR_LO = 0.88;
const CORRIDOR_HI = 1.12;

type Beat = "brief" | "run" | "gate" | "end";

export default function StackGame() {
  const cfg = getScenario("gfc");
  const lastStep = cfg.lastStep ?? cfg.dataset.months.length - 1;
  const { m, speed, setSpeed, reset } = useSim<HistoryMarket>({
    maxStep: lastStep,
    make: () => new HistoryMarket({
      dataset: cfg.dataset, indexKey: cfg.indexKey, cash: cfg.startCash,
      moments: cfg.moments, lastStep,
    }),
  });
  const [beat, setBeat] = useState<Beat>("brief");
  const [activeGate, setActiveGate] = useState<Gate | null>(null);
  const [pausedForMove, setPausedForMove] = useState(false);
  const [runId, setRunId] = useState(0);
  const firedGates = useRef<Set<number>>(new Set());
  const maxSeen = useRef(1500);

  // behavior ledger: the stars judge the process, not the ending
  const track = useRef({
    firstBuyStep: -1,
    months: 0,
    investedMonths: 0,
    concentratedMonths: 0,
    panicSells: 0,
    highWater: 0,
  });

  const orbName = getOrbName();
  const playerLabel = orbName ? orbName.replace(/\borb\b/i, "stack") : "your stack";

  const bands: StackBand[] = useMemo(
    () =>
      cfg.assets
        .map((ea) => {
          const h = m.holdings[ea.id];
          const shares = h?.shares ?? 0;
          const price = m.prices[ea.id] ?? 0;
          if (shares <= 1e-6) return null;
          if (price <= 0) return { key: ea.id, color: ea.color, value: 0, dead: true };
          return { key: ea.id, color: ea.color, value: shares * price };
        })
        .filter(Boolean) as StackBand[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.step, m.cash, beat, runId]
  );
  const invested = bands.reduce((s, b) => s + b.value, 0);
  const net = m.cash + invested;
  maxSeen.current = Math.max(maxSeen.current, net * 1.15, m.benchmark * 1.2);

  // per-month behavior bookkeeping
  useEffect(() => {
    const t = track.current;
    t.highWater = Math.max(t.highWater, net);
    if (t.firstBuyStep >= 0 && m.step > t.firstBuyStep) {
      t.months++;
      if (invested / Math.max(1, net) >= 0.6) t.investedMonths++;
      const top = bands.reduce((mx, b) => Math.max(mx, b.dead ? 0 : b.value), 0);
      if (invested > 250 && top / Math.max(1, invested) > 0.6) t.concentratedMonths++;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.step]);

  // gates: the level's engineered temptations
  useEffect(() => {
    if (beat !== "run") return;
    const g = cfg.gates.find((gg) => m.step >= gg.atStep && !firedGates.current.has(gg.atStep));
    if (g) {
      firedGates.current.add(g.atStep);
      setSpeed(0);
      setActiveGate(g);
      setBeat("gate");
    }
    if (m.step >= lastStep) {
      setSpeed(0);
      setBeat("end");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.step, beat]);

  useEffect(() => {
    if (speed > 0) setPausedForMove(false);
  }, [speed]);

  const answerGate = (label: string, act?: boolean) => {
    setActiveGate(null);
    setBeat("run");
    if (act) {
      setSpeed(0);
      setPausedForMove(true);
    } else {
      setSpeed(2);
    }
  };

  const drawdown = track.current.highWater > 0 ? net / track.current.highWater : 1;
  const buy = (id: string) => {
    if (beat !== "run" && beat !== "gate") return;
    m.buy(id, Math.min(BUY, m.cash));
    if (track.current.firstBuyStep < 0) track.current.firstBuyStep = m.step;
    setRunId((r) => r);
    setPausedForMove(true);
  };
  const sellAll = (id: string) => {
    if (beat !== "run" && beat !== "gate") return;
    m.sellFraction(id, 1);
    if (drawdown < 0.85) track.current.panicSells++;
    setPausedForMove(true);
  };

  const restart = () => {
    reset();
    setBeat("brief");
    setActiveGate(null);
    setPausedForMove(false);
    firedGates.current.clear();
    track.current = { firstBuyStep: -1, months: 0, investedMonths: 0, concentratedMonths: 0, panicSells: 0, highWater: 0 };
    maxSeen.current = 1500;
    setRunId((r) => r + 1);
  };

  // the three named stars
  const t = track.current;
  const corridorLo = m.benchmark * CORRIDOR_LO;
  const corridorHi = m.benchmark * CORRIDOR_HI;
  const starSpread = t.firstBuyStep >= 0 && t.concentratedMonths <= 12;
  const starStayed = t.firstBuyStep >= 0 && t.months > 0 && t.investedMonths / t.months >= 0.75 && t.panicSells === 0;
  const starPath = net >= corridorLo;
  const stars = [starSpread, starStayed, starPath].filter(Boolean).length;
  const aboveCorridor = net > corridorHi;

  const clip = beat === "run" ? clippingAt("gfc", m.step) : null;
  const ev = m.lastEvent;

  const StarRow = ({ ok, name, detail }: { ok: boolean; name: string; detail: string }) => (
    <div className="flex items-start gap-2.5">
      <span className="text-[16px] leading-tight" style={{ color: ok ? "#e8a800" : "#c7c7cc" }}>{ok ? "★" : "☆"}</span>
      <div>
        <div className="text-[13.5px] font-semibold">{name}</div>
        <div className="text-[12px]" style={{ color: "#6e6e73" }}>{detail}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/orb" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#1d1d1f" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          course
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">The Stack</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: "#6e6e73" }}>Level 1 · the 2008 crash · slice v2</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[13px] tnum" style={{ color: "#6e6e73" }}>{m.monthLabel()}</span>
          {beat === "run" && (
            <button onClick={() => setSpeed(speed === 0 ? 2 : 0)}
              className="text-[13px] font-medium px-4 py-1.5 rounded-full text-white" style={{ background: "#0071e3" }}>
              {speed === 0 ? "Play" : "Pause"}
            </button>
          )}
          <button onClick={restart} className="text-[13px] opacity-50 hover:opacity-90 transition">Restart</button>
        </div>
      </header>

      <main className="px-4 sm:px-8 pb-10 flex flex-col items-center gap-5">
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-black/5 bg-white"
          style={{ width: STAGE_W, maxWidth: "96vw" }}>
          <StackStage
            key={runId}
            width={STAGE_W}
            height={STAGE_H}
            cash={m.cash}
            bands={bands}
            indexValue={m.benchmark}
            playerLabel={playerLabel}
            corridor={{ lo: corridorLo, hi: corridorHi, label: "the path · finish inside this band" }}
            maxDollars={maxSeen.current}
          />
          {clip && <ClippingCard clip={clip} />}
          {!clip && beat === "run" && ev && (
            <div className="absolute left-1/2 -translate-x-1/2 top-4 px-4 py-2 rounded-full text-[13px] shadow-md pop-in border border-black/5"
              style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)" }}>
              <span className="font-semibold">{ev.label}</span>
              <span style={{ color: "#6e6e73" }}> · {ev.blurb}</span>
            </div>
          )}
        </div>

        {beat === "brief" && (
          <div className="pop-in rounded-2xl bg-white border border-black/8 shadow-lg p-5 w-[min(640px,92vw)]">
            <div className="text-[15px] font-semibold tracking-tight mb-1.5">
              January 2007. The index is not your opponent. It is your path.
            </div>
            <p className="text-[13.5px]" style={{ color: "#3a3a3c" }}>
              You have {fmtMoney(cfg.startCash)} and nine real years. Build a stack that looks like
              the one next to you and walk its path through the worst crash in a lifetime. Trade
              whenever you like; the tape will stop you at the moments where people historically
              got it wrong.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <StarRow ok name="Spread out" detail="No single company carries your stack for long." />
              <StarRow ok name="Stayed in" detail="Your money keeps working, and fear never makes your sells." />
              <StarRow ok name="On the path" detail="Finish inside the band around the index." />
            </div>
            <button onClick={() => { setBeat("run"); setSpeed(2); }}
              className="mt-4 text-[13.5px] font-medium px-5 py-2 rounded-full text-white" style={{ background: "#0071e3" }}>
              Start in 2007
            </button>
          </div>
        )}

        {beat === "gate" && activeGate && (
          <div className="pop-in rounded-2xl bg-white border border-black/8 shadow-lg p-5 w-[min(640px,92vw)]">
            <div className="text-[15px] font-semibold tracking-tight mb-1.5">
              {activeGate.title}. {activeGate.question}
            </div>
            {activeGate.context.slice(0, 2).map((p, i) => (
              <p key={i} className={`text-[13.5px] ${i > 0 ? "mt-2" : ""}`} style={{ color: "#3a3a3c" }}>{p}</p>
            ))}
            <div className="mt-3 flex flex-wrap gap-2">
              {activeGate.options.map((o) => (
                <button key={o.label} onClick={() => answerGate(o.label, o.act)}
                  className="text-[13px] rounded-full px-4 py-2 border border-black/10 bg-white transition hover:border-black/30">
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(beat === "run" || beat === "gate") && (
          <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4 w-[min(980px,96vw)]">
            {pausedForMove && speed === 0 && beat === "run" && (
              <p className="mb-2 text-[12.5px] font-medium" style={{ color: "#0057b8" }}>
                Paused for your move. Press Play when your stack looks right.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {cfg.assets.map((ea) => {
                const h = m.holdings[ea.id];
                const shares = h?.shares ?? 0;
                const price = m.prices[ea.id] ?? 0;
                const dead = price <= 0;
                return (
                  <div key={ea.id} className="flex items-center gap-2 rounded-xl border border-black/8 px-3 py-1.5"
                    style={{ background: "#fafafc", opacity: dead ? 0.55 : 1 }}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ea.color }} />
                    <span className="text-[12.5px] font-medium">{ea.name}</span>
                    <span className="text-[11.5px] tnum" style={{ color: "#6e6e73" }}>
                      {dead ? "gone" : fmtMoney(price)}
                    </span>
                    <button onClick={() => buy(ea.id)} disabled={dead || m.cash < 1}
                      className="text-[11.5px] font-medium px-2 py-0.5 rounded-full text-white transition disabled:opacity-30"
                      style={{ background: "#0071e3" }}>
                      Buy
                    </button>
                    {shares > 1e-6 && !dead && (
                      <button onClick={() => sellAll(ea.id)}
                        className="text-[11.5px] font-medium px-2 py-0.5 rounded-full border transition"
                        style={{ color: "#0071e3", borderColor: "rgba(0,113,227,0.4)", background: "#fff" }}>
                        Sell
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px]" style={{ color: "#a1a1a6" }}>
              Buys are {fmtMoney(BUY)} at the current price. Trades are free and unlimited; the
              stars judge how you behave, not how often you act.
            </p>
          </div>
        )}

        {beat === "end" && (
          <div className="pop-in rounded-2xl bg-white border border-black/8 shadow-lg p-5 w-[min(640px,92vw)]">
            <div className="text-[15px] font-semibold tracking-tight mb-2">
              December 2015. You finished with {fmtMoney(net)}. The path ended at {fmtMoney(m.benchmark)}.
            </div>
            <div className="flex flex-col gap-2.5">
              <StarRow ok={starSpread} name="Spread out"
                detail={starSpread
                  ? "No single company carried your stack for long."
                  : "One company carried most of your stack for over a year. That is a coin flip wearing your name."} />
              <StarRow ok={starStayed} name="Stayed in"
                detail={starStayed
                  ? "Your money kept working, and no sell happened deep in the red."
                  : t.panicSells > 0
                  ? `Fear made ${t.panicSells === 1 ? "one sell" : `${t.panicSells} sells`} while your stack was deep below its high. Those are the trades this level is about.`
                  : "Too much of the era went by with your money sitting out of the market."} />
              <StarRow ok={starPath} name="On the path"
                detail={starPath
                  ? aboveCorridor
                    ? "You finished above the band. Enjoy it, and know the index would not repeat the favor."
                    : "You finished inside the band around the index. That is the whole game, and most adults never manage it."
                  : "You fell out of the band. The index walked the same crash and finished the path without a single trade."} />
            </div>
            <div className="mt-3 flex gap-2.5">
              <button onClick={restart}
                className="text-[13.5px] font-medium px-5 py-2 rounded-full text-white" style={{ background: "#0071e3" }}>
                Play again
              </button>
              <Link to="/orb" className="text-[13.5px] font-medium px-5 py-2 rounded-full border"
                style={{ color: "#0071e3", borderColor: "rgba(0,113,227,0.4)", background: "#fff" }}>
                Back to the course
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
