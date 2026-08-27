// Monkey Trade v3: blackjack with the market. Contract: docs/monkey-spec-v3.md.
// The page owns the clock; every number on screen is read back out of the
// engine or the round module, so no two drawings can disagree.

import { useCallback, useEffect, useRef, useState } from "react";
import { HEADLINE_POOL } from "../data/headlinePool";
import type { RunState, Ticker } from "../lib/tape/engine";
import {
  advanceTo, buy, canBuy, canSell, isDead, lastIndex, priceAt, sell, worthOf,
} from "../lib/tape/engine";
import { sampleHeadlines } from "../lib/tape/headlines";
import type { PlacedHeadline, TruthLabel } from "../lib/tape/headlines";
import { companyName } from "../lib/trigger/deal";
import type { Hand, HandResult, Level, Progress } from "../lib/monkey3/round";
import {
  BILL, BUY_CHUNK, HANDS_PER_SUMMARY, LEVELS, WINDFALL, WINDOW_MONTHS,
  afterHand, afterSummary, bulletsFor, dealHand, grantWindfall, loadProgress,
  monkeyWorthAt, newHandRun, payBill, randomSeed, saveProgress, settleHand,
  windowKey,
} from "../lib/monkey3/round";

const BG = "#f6f5f0";
const CARD = "#ffffff";
const INK = "#2f2f33";
const MUTED = "#78736a";
const LINE = "#e4e0d7";
const YOU = "#1c7fd6";
const MONKEY = "#e58900";
const UP = "#3d9a50";
const DOWN = "#d64541";
const SLAB = ["#5aa9e6", "#f4a259", "#8cb369", "#bc4b51", "#7d7abc", "#e4b363", "#5b8e7d", "#c76d7e", "#8d99ae", "#b5838d"];

const ART = `${import.meta.env.BASE_URL}monkey/`;
const LETTERS = "ABCDEFGHIJ";
const PX_PER_DOLLAR = 0.11;

type Phase = "draw" | "run" | "moment" | "settle" | "summary";

function money(n: number): string {
  const v = Math.round(n);
  return v < 0 ? `-$${Math.abs(v)}` : `$${v}`;
}

function longMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(mo) - 1]} ${y}`;
}

interface Reveal {
  headlines: { h: PlacedHeadline; label: TruthLabel }[];
}

function revealFor(hand: Hand): Reveal {
  if (hand.level === 1) return { headlines: [] };
  const sample = sampleHeadlines({
    era: hand.era, pool: HEADLINE_POOL, seed: hand.seed, startIndex: hand.startIndex,
  });
  const within = sample.items.filter(
    (h) => h.monthIndex >= hand.startIndex && h.monthIndex <= hand.startIndex + WINDOW_MONTHS
      && hand.tickers.includes(h.about),
  );
  return { headlines: within.slice(0, 3).map((h) => ({ h, label: sample.labels[h.id] })) };
}

export default function Monkey3() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [level, setLevel] = useState<Level>(1);
  const [phase, setPhase] = useState<Phase>("draw");
  const [hand, setHand] = useState<Hand>(() => dealHand(1, randomSeed(), new Set()));
  const [selected, setSelected] = useState<Ticker | null>(null);
  const [result, setResult] = useState<HandResult | null>(null);
  const [, setFrame] = useState(0);

  const runRef = useRef<RunState>(newHandRun(hand));
  const usedRef = useRef<Set<string>>(new Set([windowKey(hand.era, hand.startIndex)]));
  const resultsRef = useRef<HandResult[]>([]);
  const momentDoneRef = useRef(false);
  const lastTickRef = useRef<number | null>(null);

  const run = runRef.current;
  const focal = selected && hand.tickers.includes(selected) ? selected : hand.tickers[0];

  const deal = useCallback((lv: Level) => {
    const next = dealHand(lv, randomSeed(), usedRef.current);
    usedRef.current.add(windowKey(next.era, next.startIndex));
    runRef.current = newHandRun(next);
    momentDoneRef.current = false;
    lastTickRef.current = null;
    setHand(next);
    setSelected(null);
    setResult(null);
    setPhase("draw");
  }, []);

  const pickLevel = useCallback((lv: Level) => {
    if (lv > progress.unlocked) return;
    resultsRef.current = [];
    setLevel(lv);
    deal(lv);
  }, [progress.unlocked, deal]);

  // The draw beat: the monkey pulls its tile, then the tape starts.
  useEffect(() => {
    if (phase !== "draw") return;
    const id = setTimeout(() => setPhase("run"), 1600);
    return () => clearTimeout(id);
  }, [phase, hand]);

  // The clock. Pauses at the moment's month, settles at the last month.
  useEffect(() => {
    if (phase !== "run") return;
    let alive = true;
    const step = (now: number) => {
      if (!alive) return;
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      let r = runRef.current;
      const target = r.t + dt * r.speed;
      if (!momentDoneRef.current && r.t < hand.moment.month && target >= hand.moment.month) {
        runRef.current = advanceTo(r, hand.moment.month);
        setFrame((n) => n + 1);
        setPhase("moment");
        return;
      }
      r = advanceTo(r, target);
      runRef.current = r;
      setFrame((n) => n + 1);
      if (r.t >= lastIndex(r)) {
        const res = settleHand(hand, r);
        resultsRef.current = [...resultsRef.current, res];
        setResult(res);
        setProgress((p) => {
          const np = afterHand(p, res);
          saveProgress(np);
          return np;
        });
        setPhase("settle");
        return;
      }
      requestAnimationFrame(step);
    };
    lastTickRef.current = null;
    const id = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(id); };
  }, [phase, hand]);

  const act = useCallback((fn: (r: RunState) => RunState) => {
    runRef.current = fn(runRef.current);
    setFrame((n) => n + 1);
  }, []);

  const closeMoment = useCallback((fn: (r: RunState) => RunState) => {
    momentDoneRef.current = true;
    runRef.current = fn(runRef.current);
    lastTickRef.current = null;
    setFrame((n) => n + 1);
    setPhase("run");
  }, []);

  const openSummary = useCallback(() => setPhase("summary"), []);

  const closeSummary = useCallback((nextLevel: Level | null) => {
    setProgress((p) => {
      const np = afterSummary(p, level);
      saveProgress(np);
      return np;
    });
    resultsRef.current = [];
    if (nextLevel) {
      setLevel(nextLevel);
      deal(nextLevel);
    } else deal(level);
  }, [level, deal]);

  const t = run.t;
  const monkeyWorth = monkeyWorthAt(hand, t);
  const yourWorth = worthOf(run);
  const monthNow = Math.min(WINDOW_MONTHS, Math.floor(t));
  const summaryReady = resultsRef.current.length >= HANDS_PER_SUMMARY;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: INK, padding: "18px 16px 40px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        <header style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ fontSize: 21, fontWeight: 700 }}>Monkey Trade</div>
          <div style={{ display: "flex", gap: 6 }}>
            {LEVELS.map((lv) => (
              <button key={lv} onClick={() => pickLevel(lv)} disabled={lv > progress.unlocked}
                style={{
                  font: "inherit", fontSize: 14, padding: "5px 12px", borderRadius: 999,
                  border: `1.5px solid ${lv === level ? INK : LINE}`,
                  background: lv === level ? INK : CARD,
                  color: lv > progress.unlocked ? "#b9b4aa" : lv === level ? "#fff" : INK,
                  cursor: lv > progress.unlocked ? "default" : "pointer",
                }}>
                Level {lv}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ color: MUTED, fontSize: 14 }}>
            Won {progress.wins} of {progress.hands}
            {progress.streak > 1 ? ` and ${progress.streak} in a row` : ""}
          </div>
        </header>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
          <section style={{ flex: "2 1 460px", background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Your desk</div>
              <div style={{ color: MUTED, fontSize: 14 }}>Month {monthNow} of {WINDOW_MONTHS}</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 17, fontWeight: 700, color: YOU }}>{money(yourWorth)}</div>
            </div>
            <Desk run={run} hand={hand} focal={focal} onFocus={setSelected} onAct={act} phase={phase} />
          </section>

          <section style={{ flex: "1 1 250px", background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ alignSelf: "stretch", display: "flex", alignItems: "baseline" }}>
              <div style={{ fontWeight: 700 }}>Random Monkey</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 17, fontWeight: 700, color: MONKEY }}>{money(monkeyWorth)}</div>
            </div>
            <img
              src={`${ART}monkey-${phase === "settle" && result ? (result.win ? "slump" : "cheer") : "idle"}.png`}
              alt="Random Monkey" style={{ width: 110, maxWidth: "100%" }} />
            <div style={{ color: MUTED, fontSize: 14, textAlign: "center", minHeight: 40 }}>
              {phase === "draw"
                ? "Drawing from the barrel."
                : hand.level === 1
                  ? monthNow < hand.monkey.entryMonth
                    ? `Waiting for month ${hand.monkey.entryMonth}.`
                    : `All in since month ${hand.monkey.entryMonth}.`
                  : `All in on stock ${LETTERS[hand.tickers.indexOf(hand.monkey.ticker)]}.`}
            </div>
          </section>
        </div>

        <section style={{ marginTop: 14, background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16 }}>
          <div style={{ color: MUTED, fontSize: 14, marginBottom: 6 }}>
            Stock {LETTERS[hand.tickers.indexOf(focal)]}, {money(priceAt(run, focal))} a share
          </div>
          <Chart run={run} ticker={focal} />
        </section>
      </div>

      {phase === "draw" && (
        <Overlay>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Random Monkey draws from the barrel.</div>
          <div style={{ fontSize: 15, color: MUTED }}>
            {hand.level === 1
              ? `It drew month ${hand.monkey.entryMonth}. It will buy then and sit.`
              : `It drew stock ${LETTERS[hand.tickers.indexOf(hand.monkey.ticker)]}. All in, and it will sit.`}
          </div>
        </Overlay>
      )}

      {phase === "moment" && (
        <Overlay>
          {hand.moment.kind === "windfall" ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{money(WINDFALL)} lands in your pocket.</div>
              <div style={{ fontSize: 15, color: MUTED, marginBottom: 14 }}>The monkey puts its share straight in.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <Btn primary disabled={!(priceAt(run, focal) > 0)}
                  onClick={() => closeMoment((r) => buy(grantWindfall(r), focal, WINDFALL))}>
                  Put it in
                </Btn>
                <Btn onClick={() => closeMoment(grantWindfall)}>Keep it as cash</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>A bill lands: {money(BILL)}.</div>
              <div style={{ fontSize: 15, color: MUTED, marginBottom: 14 }}>The monkey pays its own the same moment.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <Btn primary disabled={run.cash < BILL} onClick={() => closeMoment((r) => payBill(r, true))}>
                  Pay from cash
                </Btn>
                <Btn onClick={() => closeMoment((r) => payBill(r, false))}>Sell to pay it</Btn>
              </div>
            </>
          )}
        </Overlay>
      )}

      {phase === "settle" && result && (
        <Overlay wide>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {result.you === result.monkey
              ? "A tie with Random Monkey."
              : result.win
                ? `You did ${money(result.you - result.monkey)} better than Random Monkey.`
                : `You did ${money(result.monkey - result.you)} worse than Random Monkey.`}
          </div>
          <div style={{ color: MUTED, fontSize: 15, marginBottom: 12 }}>
            You {money(result.you)}, monkey {money(result.monkey)}, riding everything {money(result.riding)}.
          </div>
          <div style={{ textAlign: "left", borderTop: `1px solid ${LINE}`, paddingTop: 10, marginBottom: 12 }}>
            {hand.tickers.map((tk, i) => (
              <div key={tk} style={{ fontSize: 14, marginBottom: 2 }}>
                <b>{LETTERS[i]}</b> was {companyName(tk)}, {longMonth(hand.startMonth)} to {longMonth(hand.endMonth)}
                {tk === hand.monkey.ticker && hand.level > 1 ? ", the monkey's draw" : ""}
              </div>
            ))}
            {revealFor(hand).headlines.map(({ h, label }) => (
              <div key={h.id} style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>
                "{h.text}" <LabelChip label={label} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {summaryReady
              ? <Btn primary onClick={openSummary}>See the summary</Btn>
              : <Btn primary onClick={() => deal(level)}>Deal again</Btn>}
          </div>
        </Overlay>
      )}

      {phase === "summary" && (
        <Overlay wide>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            Five hands against Random Monkey.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 12 }}>
            <tbody>
              {resultsRef.current.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "4px 6px", color: MUTED }}>Hand {i + 1}</td>
                  <td style={{ padding: "4px 6px" }}>You {money(r.you)}</td>
                  <td style={{ padding: "4px 6px" }}>Monkey {money(r.monkey)}</td>
                  <td style={{ padding: "4px 6px", fontWeight: 700, color: r.win ? UP : r.you === r.monkey ? MUTED : DOWN }}>
                    {r.win ? "Won" : r.you === r.monkey ? "Tie" : "Lost"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "left", marginBottom: 14 }}>
            {bulletsFor(resultsRef.current).map((b, i) => (
              <div key={i} style={{ fontSize: 15, marginBottom: 6 }}>{b}</div>
            ))}
          </div>
          {level < 3 && level + 1 > progress.unlocked && (
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Level {level + 1} is open.</div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {level < 3 && <Btn primary onClick={() => closeSummary((level + 1) as Level)}>Level {level + 1}</Btn>}
            <Btn primary={level >= 3} onClick={() => closeSummary(null)}>Keep playing</Btn>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- desk

function Desk({ run, hand, focal, onFocus, onAct, phase }: {
  run: RunState; hand: Hand; focal: Ticker;
  onFocus: (t: Ticker) => void;
  onAct: (fn: (r: RunState) => RunState) => void;
  phase: Phase;
}) {
  const live = phase === "run";
  const one = hand.level === 1;
  const held = (run.holdings[focal] ?? 0) > 0;
  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", minHeight: 150 }}>
        <Column label="Cash" color="#9aa77f" value={run.cash} slabs={Math.max(0, Math.floor(run.cash / 50))} slabHeight={50 * PX_PER_DOLLAR} focused={false} onClick={() => undefined} dead={false} shares={null} />
        {hand.tickers.map((tk, i) => {
          const shares = run.holdings[tk] ?? 0;
          const price = priceAt(run, tk);
          return (
            <Column key={tk} label={`Stock ${LETTERS[i]}`} color={SLAB[i % SLAB.length]}
              value={shares * price} slabs={shares} slabHeight={Math.max(2, price * PX_PER_DOLLAR)}
              focused={tk === focal} onClick={() => onFocus(tk)} dead={isDead(run, tk)} shares={shares} />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {one ? (
          <Btn primary disabled={!live || (!held && !canBuy(run, focal))}
            onClick={() => onAct((r) => ((r.holdings[focal] ?? 0) > 0 ? sell(r, focal) : buy(r, focal)))}>
            {held ? "All out" : "All in"}
          </Btn>
        ) : (
          <>
            <Btn primary disabled={!live || !canBuy(run, focal)}
              onClick={() => onAct((r) => buy(r, focal, BUY_CHUNK))}>
              Buy {LETTERS[hand.tickers.indexOf(focal)]}
            </Btn>
            <Btn disabled={!live || !canSell(run, focal)}
              onClick={() => onAct((r) => sell(r, focal))}>
              Sell {LETTERS[hand.tickers.indexOf(focal)]}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

function Column({ label, color, value, slabs, slabHeight, focused, onClick, dead, shares }: {
  label: string; color: string; value: number; slabs: number; slabHeight: number;
  focused: boolean; onClick: () => void; dead: boolean; shares: number | null;
}) {
  const shown = Math.min(slabs, 40);
  return (
    <button onClick={onClick} style={{
      font: "inherit", background: "none", border: "none", padding: 4, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      opacity: dead ? 0.5 : 1, minWidth: 62,
      borderRadius: 10, outline: focused ? `2px solid ${INK}` : "none",
    }}>
      <div style={{ display: "flex", flexDirection: "column-reverse", gap: 1, minHeight: 96, justifyContent: "flex-start" }}>
        {Array.from({ length: shown }, (_, i) => (
          <div key={i} style={{
            width: 44, height: Math.max(2, slabHeight), background: color,
            border: "1px solid rgba(0,0,0,.25)", borderRadius: 2,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{money(value)}</div>
      <div style={{ fontSize: 13, color: MUTED }}>
        {dead ? `${label}, gone` : shares === null ? label : `${label}, ${shares} shares`}
      </div>
    </button>
  );
}

const INK2 = "#2f2f33";

function Chart({ run, ticker }: { run: RunState; ticker: Ticker }) {
  const W = 1020, H = 170, PAD = 10;
  const prices = run.prices[ticker] ?? [];
  const alive = prices.filter((p) => p > 0);
  const lo = alive.length ? Math.min(...alive) : 0;
  const hi = alive.length ? Math.max(...alive) : 1;
  const span = hi - lo || 1;
  const x = (m: number) => PAD + (m / WINDOW_MONTHS) * (W - PAD * 2);
  const y = (p: number) => H - PAD - ((p - lo) / span) * (H - PAD * 2);
  const steps = 60;
  const upTo = run.t;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const tt = (i / steps) * upTo;
    pts.push(`${x(tt).toFixed(1)},${y(priceAt(run, ticker, tt)).toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {Array.from({ length: WINDOW_MONTHS + 1 }, (_, m) => (
        <line key={m} x1={x(m)} y1={PAD} x2={x(m)} y2={H - PAD} stroke={LINE} strokeWidth={1} />
      ))}
      <polyline points={pts.join(" ")} fill="none" stroke={INK2} strokeWidth={2.5} strokeLinejoin="round" />
      {run.trades.filter((tr) => tr.ticker === ticker).map((tr, i) => (
        <circle key={i} cx={x(tr.at)} cy={y(tr.price)} r={4.5}
          fill={tr.kind === "buy" ? UP : DOWN} stroke="#fff" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// -------------------------------------------------------------- fragments

function Overlay({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(30,28,24,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 20,
    }}>
      <div style={{
        background: CARD, borderRadius: 16, padding: "22px 24px", maxWidth: wide ? 560 : 420,
        width: "100%", textAlign: "center", border: `1px solid ${LINE}`,
        maxHeight: "86vh", overflowY: "auto",
      }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, primary, disabled }: {
  children: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      font: "inherit", fontSize: 15, fontWeight: primary ? 700 : 400,
      padding: "9px 18px", borderRadius: 10, cursor: disabled ? "default" : "pointer",
      border: `1.5px solid ${disabled ? LINE : INK}`,
      background: primary && !disabled ? INK : CARD,
      color: disabled ? "#b9b4aa" : primary ? "#fff" : INK,
    }}>
      {children}
    </button>
  );
}

function LabelChip({ label }: { label: TruthLabel }) {
  const color = label === "signal" ? UP : label === "lie" ? DOWN : MUTED;
  return (
    <span style={{
      fontSize: 12.5, color, border: `1px solid ${color}`, borderRadius: 999,
      padding: "1px 8px", marginLeft: 6,
    }}>
      {label}
    </span>
  );
}
