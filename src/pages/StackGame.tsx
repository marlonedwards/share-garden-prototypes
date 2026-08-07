import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fmtMoney } from "../engine/market";
import { HistoryMarket } from "../engine/history";
import { useSim } from "../lib/useSim";
import { getScenario } from "../lib/scenarios";
import { getOrbName } from "../lib/orbIdentity";
import { clippingAt } from "../lib/headlines";
import { ClippingCard } from "../components/NewsBits";
import StackStage, { StackBand } from "../components/StackStage";

// The Stack, playable slice. One level: the 2008 crash on real prices.
// The cylinder stage answers the growth critique (height on a wall ruler);
// the trade tokens answer the game-loop critique (every trade is scarce, and
// holding is a decision you can win with). Beat the index for three stars.

const STAGE_W = 980;
const STAGE_H = 460;
const TOKENS = 5;
const BUY = 250;

type Beat = "brief" | "run" | "end";

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
  const [tokens, setTokens] = useState(TOKENS);
  const [runId, setRunId] = useState(0);
  const maxSeen = useRef(1500);

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
    [m.step, m.cash, tokens, beat]
  );
  const invested = bands.reduce((s, b) => s + b.value, 0);
  const net = m.cash + invested;
  maxSeen.current = Math.max(maxSeen.current, net * 1.15, m.benchmark * 1.15);

  const done = beat === "end";
  const stars = net >= m.benchmark ? 3 : net >= m.benchmark * 0.9 ? 2 : net >= cfg.startCash ? 1 : 0;

  if (beat === "run" && (m.step >= lastStep)) {
    setSpeed(0);
    setBeat("end");
  }

  const spendToken = (fn: () => void) => {
    if (tokens <= 0 || beat !== "run") return;
    fn();
    setTokens((t) => t - 1);
  };
  const buy = (id: string) =>
    spendToken(() => { m.buy(id, Math.min(BUY, m.cash)); });
  const sellAll = (id: string) =>
    spendToken(() => { m.sellFraction(id, 1); });

  const restart = () => {
    reset();
    setBeat("brief");
    setTokens(TOKENS);
    maxSeen.current = 1500;
    setRunId((r) => r + 1);
  };

  const clip = beat === "run" ? clippingAt("gfc", m.step) : null;
  const ev = m.lastEvent;

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
          <span className="text-[13px] hidden sm:inline" style={{ color: "#6e6e73" }}>Level 1 · the 2008 crash · playable slice</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[13px] tnum" style={{ color: "#6e6e73" }}>{m.monthLabel()}</span>
          <div className="flex items-center gap-1.5" title="Every buy or sell costs one token. Holding is free.">
            <span className="text-[12px]" style={{ color: "#6e6e73" }}>Trades</span>
            {Array.from({ length: TOKENS }, (_, i) => (
              <span key={i} className="w-3.5 h-3.5 rounded-full border"
                style={{
                  background: i < tokens ? "#0071e3" : "transparent",
                  borderColor: i < tokens ? "#0071e3" : "rgba(0,0,0,0.2)",
                }} />
            ))}
          </div>
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
            goalLine={{ value: m.benchmark, label: "beat the index for 3 stars" }}
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
          <div className="pop-in rounded-2xl bg-white border border-black/8 shadow-lg p-5 w-[min(620px,92vw)]">
            <div className="text-[15px] font-semibold tracking-tight mb-1.5">
              January 2007. You have {fmtMoney(cfg.startCash)}, nine real years, and five trades.
            </div>
            <p className="text-[13.5px]" style={{ color: "#3a3a3c" }}>
              Every buy and every sell costs one token, and holding costs nothing. The index next
              to you never trades at all. End taller than it for three stars. One of these
              companies will not survive what is coming.
            </p>
            <button onClick={() => { setBeat("run"); setSpeed(2); }}
              className="mt-3 text-[13.5px] font-medium px-5 py-2 rounded-full text-white" style={{ background: "#0071e3" }}>
              Start in 2007
            </button>
          </div>
        )}

        {beat === "run" && (
          <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4 w-[min(980px,96vw)]">
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
                    <button onClick={() => buy(ea.id)} disabled={dead || tokens <= 0 || m.cash < 1}
                      className="text-[11.5px] font-medium px-2 py-0.5 rounded-full text-white transition disabled:opacity-30"
                      style={{ background: "#0071e3" }}>
                      Buy
                    </button>
                    {shares > 1e-6 && !dead && (
                      <button onClick={() => sellAll(ea.id)} disabled={tokens <= 0}
                        className="text-[11.5px] font-medium px-2 py-0.5 rounded-full border transition disabled:opacity-30"
                        style={{ color: "#0071e3", borderColor: "rgba(0,113,227,0.4)", background: "#fff" }}>
                        Sell
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px]" style={{ color: "#a1a1a6" }}>
              Buys are {fmtMoney(BUY)} at the current price. Holding never costs a token; that is the point.
            </p>
          </div>
        )}

        {done && (
          <div className="pop-in rounded-2xl bg-white border border-black/8 shadow-lg p-5 w-[min(620px,92vw)]">
            <div className="text-[22px] tracking-tight mb-1">
              {"★".repeat(stars)}{"☆".repeat(3 - stars)}
            </div>
            <div className="text-[15px] font-semibold tracking-tight mb-1.5">
              December 2015. You finished with {fmtMoney(net)}. The index finished with {fmtMoney(m.benchmark)}.
            </div>
            <p className="text-[13.5px]" style={{ color: "#3a3a3c" }}>
              {stars === 3
                ? `You beat a column that never traded once, with ${tokens} ${tokens === 1 ? "token" : "tokens"} to spare. That is rare, and it will not repeat on demand.`
                : stars === 2
                ? "You stayed close to a column that never traded once. Most people who trade more finish further behind it."
                : stars === 1
                ? "You ended above where you started, and the index shows what holding everything would have paid."
                : "The crash took more than you kept. Watch which trades cost you and run it again."}
            </p>
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
