// Monkey Trade: ten monkeys throw darts and sit on what they hit, you trade,
// and the round ends by telling you how many of them you beat.
// Contract: docs/monkey-spec.md, sections 2, 3, 6, 7 and 12, and the build
// contract in docs/monkey-handoff.md. The round rules live in
// src/lib/monkey/round.ts, the tape in src/lib/tape/engine.ts, the chart is
// Trigger's unmodified, and the desk is The Floor's. This file owns the
// phases, the clock, the trades, the guide's four lines and the end card.
//
// The year is hidden while the tape runs. Nothing in this page's DOM carries a
// year or an era name until the end card: the clock counts months into the
// round, and the chart is handed a synthetic month axis (see playMonths).

import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Chart, { ChartTrade } from "../components/trigger/Chart";
import Desk, { DeskColumn, Pour, cashColumn } from "../components/monkey/Desk";
import { settleRun } from "../lib/floor/campaign";
import {
  RunState, Ticker,
  advanceTo, buy, isDead, lastIndex, maxShares, priceAt, sell, worthAt, worthOf,
} from "../lib/tape/engine";
import { decisionsOf } from "../lib/trigger/decisions";
import { money, plural } from "../lib/trigger/format";
import {
  Deal, LEVELS, LEVEL_IDS, LevelId, MONKEYS,
  beatenLine, bestFor, bestMonkey, clockLabel, companyName, deadLine,
  dealFromParams, dealRound, endLead, eraRevealText, indexLine, indexWorth,
  isUnlocked, levelLocked, monkeyFinalWorth, monkeyLine, newPlayerRun,
  randomSeed, rankAt, recordRound, worstMonkey, youLine,
} from "../lib/monkey/round";
import { UI_FONT } from "../lib/type";
// The stage team's parts.
import Board, { RAIL_WIDTH } from "../components/monkey/Board";
import Button from "../components/monkey/Button";
import Guide from "../components/monkey/Guide";
import Strip, { SETTLED_HEIGHT, STRIP_HEIGHT } from "../components/monkey/Strip";
import {
  GREEN, GROUND, INK, MUTED, PANEL, RADIUS, SIZE, SKY, TIES, WEIGHT,
} from "../lib/monkey/look";
import {
  armAudio, buyTick, dartThock, guidePop, loadMuted, passDown, passUp,
  rankReveal, sellThud, setMuted, settleRun as settlePourSound,
} from "../lib/monkey/sound";
import { endGuideLine, guideLine as lineFor } from "../content/monkey";

type Phase = "levels" | "open" | "play" | "end";
type Moment = "open" | "firstTrade" | "crash" | "end";

// The tape commits to React on this cadence, not every frame; the run itself
// advances on every frame. The Floor's number, for the same reason.
const COMMIT_MS = 50;
const SETTLE_MS = 1200;
// The throw beat is about two seconds; this is the floor under it, in case a
// board never reports its last dart.
const THROW_MAX_MS = 2600;
const GUIDE_MS = 4200;
// A buy pours one tick per share, and a hundred share buy is not a hundred
// audible ticks, so the run is capped and stepped.
const MAX_TICKS = 12;
const TICK_MS = 45;

const PAGE_PAD = 16;
const HEADER_H = 44;
const GAP = 12;
const STRIP_PAD = 12;
// The guide's bubble hangs above its own slot on the rank strip, so the strip's
// panel carries the headroom for it. Without this the line covers the clock.
const GUIDE_ROOM = 64;
const TRADE_H = 52;
const DESK_PAD = 8;
const COL_GAP = 10;

function readNumber(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// The month axis the chart carries while the year is hidden.
//
// Chart.tsx is used unmodified and it takes its labels off the month strings
// themselves: a tick is a month ending "-01" and its label is the string's
// first four characters. Handing it the real months would print years into the
// DOM, which section 2 forbids during play, so the play chart is handed a
// synthetic array instead: the tick months are the label right-padded to four
// characters, every other month is a string that is not a January. SVG text
// collapses the padding away, so the axis reads 1, 6, 12, 18, 24. The end card
// hands the same chart the real months and gets real years back.
const MONTH_STEP = 6;

export function playMonths(count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    const tick = n === 1 || n % MONTH_STEP === 0;
    out.push(tick ? `${String(n).padStart(4, " ")}-01` : `m${i}-07`);
  }
  return out;
}

// Months holding anything, off the trade log the way decisions.ts does it, but
// counted on the total shares held rather than on one ticker's first buy and
// first sell. Trigger's monthsInMarket() closes the span on any sell at all and
// only ever reopens on a later buy, which is exact for a one-stock game that
// only ever sells out; this game has Sell 1 and Sell 5 and up to ten wedges, so
// selling five of twenty shares would take the player out of a market they are
// still standing in.
function monthsHolding(run: RunState): number {
  const end = lastIndex(run);
  let shares = 0;
  let openedAt: number | null = null;
  let held = 0;
  for (const trade of run.trades) {
    shares += trade.kind === "buy" ? trade.shares : -trade.shares;
    if (shares > 0 && openedAt === null) openedAt = trade.at;
    else if (shares <= 0 && openedAt !== null) {
      held += trade.at - openedAt;
      openedAt = null;
    }
  }
  if (openedAt !== null) held += end - openedAt;
  return held;
}

function easeOut(p: number): number {
  const c = p < 0 ? 0 : p > 1 ? 1 : p;
  return 1 - Math.pow(1 - c, 3);
}

const Card = forwardRef<HTMLDivElement, { children: React.ReactNode; style?: React.CSSProperties }>(
  function Card({ children, style }, ref) {
    return (
      <div ref={ref} style={{ background: PANEL, borderRadius: RADIUS, ...style }}>{children}</div>
    );
  },
);

export default function Monkey() {
  const [params, setParams] = useSearchParams();
  const levelParam = params.get("level");
  const seedParam = params.get("seed");
  // Either half pins: dealFromParams fills the other one in, so a half
  // written link still plays rather than dropping you on the level cards.
  const pinned = levelParam !== null || seedParam !== null;
  const turbo = Math.min(120, readNumber(params, "turbo", 1));

  const [viewW, setViewW] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  const [viewH, setViewH] = useState(() => (typeof window === "undefined" ? 950 : window.innerHeight));
  useEffect(() => {
    const onResize = () => { setViewW(window.innerWidth); setViewH(window.innerHeight); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [phase, setPhase] = useState<Phase>("levels");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [focus, setFocus] = useState<Ticker>("");
  const [thrown, setThrown] = useState(false);
  const [throwDone, setThrowDone] = useState(false);
  const [guideLine, setGuideLine] = useState<string | null>(null);
  const [guideCount, setGuideCount] = useState(0);
  const [settle, setSettle] = useState<{ from: number; to: number; at: number } | null>(null);
  const [settleP, setSettleP] = useState(0);
  const [pour, setPour] = useState<Pour | null>(null);
  const [muted, setMutedState] = useState(false);
  const [tick, setTick] = useState(0);
  const [saveTick, setSaveTick] = useState(0);

  const runRef = useRef<RunState | null>(null);
  const dealRef = useRef<Deal | null>(null);
  const phaseRef = useRef<Phase>("levels");
  const focusRef = useRef<Ticker>("");
  const spokenRef = useRef<Set<Moment>>(new Set());
  const beatenRef = useRef(0);
  const scaleRef = useRef(0);
  const pourId = useRef(0);
  const tickTimers = useRef<number[]>([]);
  const guideTimer = useRef(0);
  const recordedRef = useRef(false);
  // The round is over once the months run out. This is its own ref because the
  // render pass writes phaseRef back from the phase state, and the phase state
  // stays "play" for the 1.2 seconds the settle pour runs: without a latch the
  // frame after the last one would end the round again, and again.
  const overRef = useRef(false);
  const endRoundRef = useRef<(finished: RunState) => void>(() => {});
  const chartBox = useRef<HTMLDivElement | null>(null);
  const [chartW, setChartW] = useState(1300);
  const boardBox = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState({ w: 620, h: 520 });

  runRef.current = run;
  dealRef.current = deal;
  phaseRef.current = phase;
  focusRef.current = focus;

  // ------------------------------------------------------------- the gesture

  // No AudioContext is built before a gesture, so the whole module is armed by
  // the first pointer or key anywhere on the page and never again.
  useEffect(() => {
    setMutedState(loadMuted());
    const arm = () => armAudio();
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  useEffect(() => () => {
    tickTimers.current.forEach((t) => window.clearTimeout(t));
    window.clearTimeout(guideTimer.current);
  }, []);

  // --------------------------------------------------------------- the guide

  const speak = useCallback((moment: Moment, line: string | null) => {
    if (!line) return;
    if (spokenRef.current.has(moment)) return;
    spokenRef.current.add(moment);
    setGuideCount(spokenRef.current.size);
    setGuideLine(line);
    guidePop();
    window.clearTimeout(guideTimer.current);
    if (moment === "end") return;      // the end card's line stays put
    guideTimer.current = window.setTimeout(() => setGuideLine(null), GUIDE_MS);
  }, []);

  // ---------------------------------------------------------------- the deal

  const openRound = useCallback((level: LevelId, seed: number) => {
    const d = dealRound(level, seed);
    const opened = newPlayerRun(d);
    spokenRef.current = new Set();
    recordedRef.current = false;
    overRef.current = false;
    scaleRef.current = 0;
    beatenRef.current = 0;
    window.clearTimeout(guideTimer.current);
    setDeal(d);
    dealRef.current = d;
    setRun(opened);
    runRef.current = opened;
    setFocus(d.tickers[0]);
    focusRef.current = d.tickers[0];
    setGuideLine(null);
    setGuideCount(0);
    setSettle(null);
    setSettleP(0);
    setPour(null);
    setThrown(false);
    setThrowDone(false);
    setPhase("open");
    phaseRef.current = "open";
  }, []);

  const showLevels = useCallback(() => {
    setPhase("levels");
    phaseRef.current = "levels";
    overRef.current = true;
    setDeal(null);
    setRun(null);
    setGuideLine(null);
    setGuideCount(0);
    setSettle(null);
    window.clearTimeout(guideTimer.current);
  }, []);

  // A pinned url deals that round and skips straight to its open phase, locks
  // ignored, the way the siblings' ?seed= does. Editing the url re-deals, and
  // editing the pin away lands on the level cards: the hash router does not
  // remount the page, so nothing else would notice the round was cancelled.
  const pinKey = pinned ? `${levelParam ?? ""}|${seedParam ?? ""}` : null;
  const lastPin = useRef<string | null>(null);
  useEffect(() => {
    if (pinKey === null) {
      if (lastPin.current !== null) {
        lastPin.current = null;
        showLevels();
      }
      return;
    }
    lastPin.current = pinKey;
    const d = dealFromParams(levelParam, seedParam);
    openRound(d.level, d.seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey]);

  // The darts fly on entry to the open phase, one beat, once.
  useEffect(() => {
    if (phase !== "open" || thrown) return;
    const id = window.setTimeout(() => setThrown(true), 60);
    return () => window.clearTimeout(id);
  }, [phase, thrown]);

  // A board that never reports its last dart still has to hand the round over.
  useEffect(() => {
    if (!thrown || throwDone) return;
    const id = window.setTimeout(() => setThrowDone(true), THROW_MAX_MS);
    return () => window.clearTimeout(id);
  }, [thrown, throwDone]);

  useEffect(() => {
    if (!throwDone || !deal || phase !== "open") return;
    speak("open", lineFor(deal.level, "open"));
  }, [throwDone, deal, phase, speak]);

  // ----------------------------------------------------------------- the tape

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let acc = 0;
    let hidden = document.hidden;
    const onVis = () => { hidden = document.hidden; prev = performance.now(); };
    document.addEventListener("visibilitychange", onVis);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.25, (now - prev) / 1000);
      prev = now;
      const state = runRef.current;
      const d = dealRef.current;
      if (!state || !d || phaseRef.current !== "play" || overRef.current || hidden) return;

      const end = lastIndex(state);
      const next = Math.min(end, state.t + dt * turbo * state.speed);
      const advanced = advanceTo(state, next);
      runRef.current = advanced;

      acc += dt * 1000;
      if (acc >= COMMIT_MS || advanced.t >= end) {
        acc = 0;
        setRun(advanced);
        setTick((n) => n + 1);
      }
      if (advanced.t >= end) endRoundRef.current(advanced);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [turbo]);

  // ---------------------------------------------------------------- the rank

  const worth = run ? worthOf(run) : 0;
  const liveRank = useMemo(
    () => (deal && run ? rankAt(deal, worthOf(run), run.t) : null),
    // tick is what says the tape moved; run alone commits on the same cadence
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deal, run, tick],
  );
  const beaten = liveRank?.beaten ?? 0;

  // Passing a monkey and being passed are the only two things the strip says
  // out loud while the tape runs.
  useEffect(() => {
    if (phase !== "play") { beatenRef.current = beaten; return; }
    if (beaten > beatenRef.current) passUp();
    else if (beaten < beatenRef.current) passDown();
    beatenRef.current = beaten;
  }, [beaten, phase]);

  // The crash month is the guide's third line, level two only.
  useEffect(() => {
    if (phase !== "play" || !deal || !run) return;
    if (deal.crashIndex === null) return;
    if (run.t < deal.crashIndex) return;
    speak("crash", lineFor(deal.level, "crash"));
  }, [phase, deal, run, tick, speak]);

  // --------------------------------------------------------------- the trades

  const runTicks = useCallback((shares: number) => {
    const of = Math.min(MAX_TICKS, Math.max(1, shares));
    tickTimers.current.forEach((t) => window.clearTimeout(t));
    tickTimers.current = [];
    for (let i = 0; i < of; i++) {
      tickTimers.current.push(window.setTimeout(() => buyTick(i, of), i * TICK_MS));
    }
  }, []);

  const trade = useCallback((fn: (r: RunState) => RunState) => {
    const state = runRef.current;
    const d = dealRef.current;
    if (!state || !d) return;
    const ticker = focusRef.current;
    const before = state.holdings[ticker] ?? 0;
    const next = fn(state);
    if (next === state) return;
    const after = next.holdings[ticker] ?? 0;
    runRef.current = next;
    setRun(next);
    setTick((n) => n + 1);
    pourId.current += 1;
    if (after > before) {
      setPour({ id: pourId.current, ticker, kind: "buy" });
      runTicks(after - before);
    } else if (after < before) {
      setPour({ id: pourId.current, ticker, kind: "sell" });
      sellThud();
    }
    speak("firstTrade", lineFor(d.level, "firstTrade"));
  }, [runTicks, speak]);

  useEffect(() => {
    if (!pour) return;
    const id = window.setTimeout(() => setPour(null), 340);
    return () => window.clearTimeout(id);
  }, [pour]);

  const focusOn = useCallback((ticker: Ticker) => {
    focusRef.current = ticker;
    setFocus(ticker);
  }, []);

  // ------------------------------------------------------------------- start

  const start = useCallback(() => {
    if (!runRef.current) return;
    setPhase("play");
    phaseRef.current = "play";
  }, []);

  // ------------------------------------------------------------- the end

  // The round ends when the months run out: every position sells at the last
  // real prices over the 1.2 second pour, then the rank. The player's own run
  // is what the end card reads, so the pour's automatic sells never count as
  // trades the player made.
  const endRound = useCallback((finished: RunState) => {
    if (overRef.current) return;
    overRef.current = true;
    const settled = settleRun(finished);
    setSettle({ from: finished.cash, to: settled.cash, at: performance.now() });
    setSettleP(0);
    settlePourSound();
    window.setTimeout(() => {
      setSettle(null);
      setSettleP(0);
      setPhase("end");
    }, SETTLE_MS);
  }, []);
  endRoundRef.current = endRound;

  const ending = useMemo(() => {
    if (!deal || !run) return null;
    const last = lastIndex(run);
    const finalWorth = worthAt(run, last);
    const ranked = rankAt(deal, finalWorth, last);
    const best = bestMonkey(deal);
    const worst = worstMonkey(deal);
    let biggest = 0;
    for (const t of deal.tickers) {
      const scoped: RunState = { ...run, trades: run.trades.filter((tr) => tr.ticker === t) };
      for (const dec of decisionsOf(scoped, t)) biggest = Math.max(biggest, Math.abs(dec.delta));
    }
    const held = Math.round(monthsHolding(run));
    return {
      finalWorth,
      beaten: ranked.beaten,
      order: ranked.order,
      win: ranked.beaten >= 5,
      best, worst,
      bestLine: monkeyLine(deal, best, monkeyFinalWorth(deal, best)),
      worstLine: monkeyLine(deal, worst, monkeyFinalWorth(deal, worst)),
      trades: run.trades.length,
      held,
      biggest,
      index: indexWorth(deal),
    };
  }, [deal, run, phase]);

  // The end card records the round, reveals the rank and speaks the last line.
  useEffect(() => {
    if (phase !== "end" || !deal || !ending || recordedRef.current) return;
    recordedRef.current = true;
    recordRound(deal.level, ending.beaten);
    setSaveTick((n) => n + 1);
    rankReveal(ending.win);
    speak("end", endGuideLine(deal.level, ending.beaten));
  }, [phase, deal, ending, speak]);

  // The pour is its own clock; only the drawn amounts ease.
  useEffect(() => {
    if (!settle) return;
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (performance.now() - settle.at) / SETTLE_MS);
      setSettleP(p);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [settle]);

  // ------------------------------------------------------------------ layout

  const chartH = Math.round(viewH / 3);
  const topH = Math.max(320, viewH - PAGE_PAD * 2 - HEADER_H - GAP * 2 - chartH);
  const stripBandH = STRIP_HEIGHT + GUIDE_ROOM + STRIP_PAD * 2;
  const deskH = Math.max(180, topH - stripBandH - TRADE_H - COL_GAP * 2 - DESK_PAD * 2);
  const leftW = Math.max(600, viewW - PAGE_PAD * 2 - RAIL_WIDTH - GAP);

  useLayoutEffect(() => {
    const box = chartBox.current;
    if (!box) return;
    const measure = () => setChartW(Math.max(240, Math.round(box.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [phase]);

  // The open board takes the whole slot it is given rather than the play
  // stage's numbers, which are a third of the window shorter.
  useLayoutEffect(() => {
    const box = boardBox.current;
    if (!box) return;
    const measure = () => setBoardSize({
      w: Math.max(280, Math.round(box.clientWidth)),
      h: Math.max(240, Math.round(box.clientHeight)),
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [phase]);

  // ------------------------------------------------------------------- desk

  const settleEase = settle ? easeOut(settleP) : 0;
  const columns: DeskColumn[] = useMemo(() => {
    if (!run) return [];
    const cashDraw = settle ? settle.from + (settle.to - settle.from) * settleEase : undefined;
    const out: DeskColumn[] = [cashColumn(run.cash, cashDraw)];
    for (const ticker of run.tickers) {
      const shares = run.holdings[ticker] ?? 0;
      if (shares <= 0) continue;
      const p = priceAt(run, ticker);
      const dollars = shares * p;
      out.push({
        key: ticker, ticker, shares, price: p, dollars,
        dead: isDead(run, ticker),
        draw: settle ? dollars * (1 - settleEase) : undefined,
      });
    }
    return out;
  }, [run, settle, settleEase, tick]);

  const meterH = deskH - 44;
  if (run && scaleRef.current === 0 && run.startCash > 0) {
    scaleRef.current = (0.85 * meterH) / run.startCash;
  }
  for (const col of columns) {
    if (col.dollars > 0) {
      const need = (0.98 * meterH) / col.dollars;
      if (need < scaleRef.current) scaleRef.current = need;
    }
  }

  // -------------------------------------------------------------- the chips

  const chips = useMemo(() => {
    const out: Record<Ticker, number> = {};
    if (!deal || !run) return out;
    for (const t of deal.tickers) out[t] = run.holdings[t] ?? 0;
    return out;
  }, [deal, run, tick]);

  const deadNow = useMemo(() => {
    if (!deal || !run) return [];
    return deal.tickers.filter((t) => isDead(run, t));
  }, [deal, run, tick]);

  const openPrices = useMemo(
    () => (deal && run ? deal.tickers.map((t) => run.prices[t][0] ?? 0) : []),
    [deal, run],
  );

  const dartList = useMemo(() => {
    if (!deal) return [];
    return deal.monkeys.flatMap((m) => m.darts.map((at) => ({ monkey: m.index, at })));
  }, [deal]);

  // -------------------------------------------------------------- the chart

  const chartTrades: ChartTrade[] = useMemo(() => {
    if (!run || !focus) return [];
    return run.trades
      .filter((tr) => tr.ticker === focus)
      .map((tr) => ({ at: tr.at, price: tr.price, side: tr.kind }));
  }, [run, focus, tick]);

  const series = run && focus ? run.prices[focus] ?? [] : [];
  const monthLabels = phase === "end" ? deal?.months ?? [] : playMonths(series.length);

  // ------------------------------------------------------------- the buttons

  const price = run && focus ? priceAt(run, focus) : 0;
  const held = run && focus ? run.holdings[focus] ?? 0 : 0;
  const dead = run && focus ? isDead(run, focus) : false;
  const canBuy = (n?: number) =>
    !!run && !!focus && !dead && maxShares(run, focus, n === undefined ? undefined : price * n) > 0;

  const tradesLive = phase === "open" || phase === "play";

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }, [muted]);

  const mute = (
    <button
      type="button"
      data-action="mute"
      onClick={toggleMute}
      style={{
        fontFamily: UI_FONT, fontSize: 14, color: MUTED, background: "transparent",
        border: "none", cursor: "pointer", padding: "4px 8px",
      }}
    >
      {muted ? "Sound off" : "Sound on"}
    </button>
  );

  // ------------------------------------------------------------------ levels

  const goLevels = useCallback(() => {
    if (pinned) {
      const next = new URLSearchParams(params);
      next.delete("level");
      next.delete("seed");
      setParams(next, { replace: true });
    }
    showLevels();
  }, [pinned, params, setParams, showLevels]);

  const levelsScreen = (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 64px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>Monkey Trade</h1>
        {mute}
      </div>
      <p style={{ fontSize: 16, color: MUTED, marginTop: 8 }}>
        Ten monkeys threw darts. Beat them if you can.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 32 }}>
        {LEVEL_IDS.map((id) => {
          const open = isUnlocked(id);
          const best = bestFor(id);
          return (
            <Card key={`${id}-${saveTick}`} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{LEVELS[id].card}</div>
              <div style={{ fontSize: 14, color: MUTED, minHeight: 38 }}>
                {open ? LEVELS[id].proves : levelLocked()}
              </div>
              <div className="tnum" style={{ fontSize: 14, color: best > 0 ? INK : "transparent", minHeight: 20 }}>
                {best > 0 ? `Best: beat ${best} of ${MONKEYS}` : "."}
              </div>
              <div>
                <Button
                  action={`throw-${id}`}
                  disabled={!open}
                  onClick={() => openRound(id, randomSeed())}
                >
                  Throw
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ marginTop: 28 }}>
        <Link to="/" style={{ fontSize: 14, color: SKY }}>Back to the games</Link>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ header

  const cashDrawn = run ? (settle ? settle.from + (settle.to - settle.from) * settleEase : run.cash) : 0;

  const header = run && deal ? (
    <div
      style={{
        height: HEADER_H, display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flex: "none", whiteSpace: "nowrap",
      }}
    >
      <div className="tnum" data-clock={Math.floor(run.t)} style={{ fontSize: 18, fontWeight: 600 }}>
        {clockLabel(deal, run.t)}
      </div>
      <div className="tnum" data-beaten={beaten} style={{ fontSize: 18, fontWeight: 600, color: beaten >= 5 ? GREEN : INK }}>
        {beatenLine(beaten)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span className="tnum" data-worth={worth.toFixed(4)} style={{ fontSize: 18, fontWeight: 600 }}>
          {`worth ${money(worth)}`}
        </span>
        <span className="tnum" data-cash={cashDrawn.toFixed(4)} style={{ fontSize: 18, color: MUTED }}>
          {`cash ${money(cashDrawn)}`}
        </span>
        {mute}
      </div>
    </div>
  ) : null;

  // ------------------------------------------------------------- trade row

  const tradeRow = (
    <div style={{ height: TRADE_H, display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
      <Button action="buy1" tone="green" disabled={!tradesLive || !canBuy(1)} onClick={() => trade((r) => buy(r, focus, price))}>Buy 1</Button>
      <Button action="buy5" tone="green" disabled={!tradesLive || !canBuy(5)} onClick={() => trade((r) => buy(r, focus, price * 5))}>Buy 5</Button>
      <Button action="buymax" tone="green" disabled={!tradesLive || !canBuy()} onClick={() => trade((r) => buy(r, focus))}>Buy max</Button>
      <div style={{ width: 16 }} />
      <Button action="sell1" tone="red" disabled={!tradesLive || held < 1} onClick={() => trade((r) => sell(r, focus, 1))}>Sell 1</Button>
      <Button action="sell5" tone="red" disabled={!tradesLive || held < 1} onClick={() => trade((r) => sell(r, focus, 5))}>Sell 5</Button>
      <Button action="sellall" tone="red" disabled={!tradesLive || held < 1} onClick={() => trade((r) => sell(r, focus))}>Sell all</Button>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 14, color: MUTED }}>
        {focus ? `${companyName(focus)} ${dead ? "went to zero" : `at $${price.toFixed(2)}`}` : ""}
      </span>
    </div>
  );

  const desk = run ? (
    <Desk
      columns={columns}
      scale={scaleRef.current}
      height={deskH}
      focus={focus}
      onFocus={focusOn}
      settling={settle !== null}
      phone={false}
      pour={pour}
    />
  ) : null;

  // -------------------------------------------------------------- open phase

  const openScreen = run && deal ? (
    <div style={{ padding: PAGE_PAD, display: "flex", flexDirection: "column", gap: GAP, height: "100vh" }}>
      {header}
      <div style={{ flex: 1, display: "flex", gap: GAP, minHeight: 0 }}>
        <Card ref={boardBox} style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, padding: 16, overflow: "hidden" }}>
          <Board
            mode={deal.target === "calendar" ? "calendar" : "board"}
            form="open"
            tickers={deal.tickers}
            names={deal.tickers.map(companyName)}
            openPrices={openPrices}
            months={deal.months.length}
            darts={dartList}
            thrown={thrown}
            onDartLanded={(i, of) => dartThock(i, of)}
            onThrowDone={() => setThrowDone(true)}
            chips={chips}
            dead={deadNow}
            focus={focus}
            onFocus={focusOn}
            width={boardSize.w}
            height={boardSize.h}
          />
        </Card>
        <div style={{ flex: "0 0 380px", width: 380, display: "flex", flexDirection: "column", gap: GAP, minHeight: 0 }}>
          <div style={{ minHeight: 76 }}>
            <Guide line={guideLine} />
          </div>
          {desk}
        </div>
      </div>
      <Card style={{ padding: "4px 14px", display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
        {tradeRow}
        <Button action="start" tone="sky" size="lg" disabled={!throwDone} onClick={start}>Start</Button>
      </Card>
    </div>
  ) : null;

  // -------------------------------------------------------------- play phase

  const playScreen = run && deal && liveRank ? (
    <div style={{ padding: PAGE_PAD, display: "flex", flexDirection: "column", gap: GAP, height: "100vh" }}>
      {header}
      <div style={{ height: topH, display: "flex", gap: GAP, flex: "none" }}>
        <div style={{ width: leftW, display: "flex", flexDirection: "column", gap: COL_GAP, minWidth: 0 }}>
          <Card style={{ height: stripBandH, padding: STRIP_PAD, paddingTop: STRIP_PAD + GUIDE_ROOM, flex: "none" }}>
            <Strip
              slots={liveRank.order.map((s) => ({ who: s.who, worth: s.worth }))}
              guideIndex={deal.guideIndex}
              guideLine={guideLine}
              settled={false}
              mood={null}
              playerInitial="Y"
              ties={TIES}
              width={leftW - STRIP_PAD * 2}
              height={STRIP_HEIGHT}
            />
          </Card>
          {desk}
          {tradeRow}
        </div>
        <Board
          mode={deal.target === "calendar" ? "calendar" : "board"}
          form="rail"
          tickers={deal.tickers}
          names={deal.tickers.map(companyName)}
          openPrices={openPrices}
          months={deal.months.length}
          darts={dartList}
          thrown
          instant
          chips={chips}
          dead={deadNow}
          focus={focus}
          onFocus={focusOn}
          width={RAIL_WIDTH}
          height={topH}
        />
      </div>
      <div
        ref={chartBox}
        data-chart="monkey"
        data-chart-labels="months"
        style={{ height: chartH, flex: "none", background: PANEL, borderRadius: RADIUS, padding: 8, overflow: "hidden" }}
      >
        <Chart
          series={series}
          months={monthLabels}
          t={run.t}
          livePrice={price}
          width={chartW - 16}
          height={chartH - 16}
          trades={chartTrades}
          chip
          lineColor={INK}
          textColor={MUTED}
          gridColor="rgba(60,60,60,0.14)"
        />
      </div>
    </div>
  ) : null;

  // -------------------------------------------------------------- the end

  const endScreen = run && deal && ending ? (
    <div style={{ padding: PAGE_PAD, height: "100vh", display: "flex", flexDirection: "column", gap: GAP }}>
      <div data-end-card style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "8px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ fontSize: SIZE.end, fontWeight: WEIGHT.heading, letterSpacing: "-0.02em" }}>{endLead(ending.beaten)}</div>
          {mute}
        </div>

        <Card style={{ padding: 10 }}>
          <Strip
            slots={ending.order.map((s) => ({ who: s.who, worth: s.worth }))}
            guideIndex={deal.guideIndex}
            guideLine={null}
            settled
            mood={ending.win ? "cheer" : "slump"}
            playerInitial="Y"
            ties={TIES}
            width={Math.min(1200, viewW - 100)}
            height={SETTLED_HEIGHT}
          />
        </Card>

        <div className="tnum" style={{ fontSize: SIZE.rank, fontWeight: WEIGHT.heading }}>{youLine(ending.finalWorth)}</div>

        <div style={{ fontSize: SIZE.body }}>{ending.bestLine}</div>
        <div style={{ fontSize: SIZE.body }}>{ending.worstLine}</div>

        <div style={{ display: "flex", gap: 28, fontSize: SIZE.small, color: MUTED }}>
          <span className="tnum">{`${ending.trades} ${plural(ending.trades, "trade", "trades")} made.`}</span>
          <span className="tnum">{`${ending.held} of ${deal.months.length} months in the market.`}</span>
          <span className="tnum">{`Biggest single decision: ${money(ending.biggest)}.`}</span>
        </div>

        <div style={{ fontSize: SIZE.small, color: MUTED }}>{indexLine(ending.index)}</div>

        <div data-era-reveal style={{ fontSize: SIZE.lead, fontWeight: WEIGHT.emphasis }}>{eraRevealText(deal)}</div>

        <div
          data-chart="monkey"
          data-chart-labels="years"
          style={{ height: 208, background: PANEL, borderRadius: RADIUS, padding: 8, flex: "none" }}
        >
          <Chart
            series={series}
            months={deal.months}
            t={lastIndex(run)}
            width={Math.min(1200, viewW - 100)}
            height={192}
            trades={chartTrades}
            chip={false}
            lineColor={INK}
            textColor={MUTED}
            gridColor="rgba(60,60,60,0.14)"
          />
        </div>

        {deal.dead.map((t) => (
          <div key={t} style={{ fontSize: SIZE.small, color: MUTED }}>{deadLine(t)}</div>
        ))}

        <Guide line={guideLine} width={640} persist />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "0 24px 8px", flex: "none" }}>
        <Button action="again" tone="green" size="lg" onClick={() => openRound(deal.level, randomSeed())}>Play again</Button>
        {deal.level < 3 && isUnlocked((deal.level + 1) as LevelId) && (
          <Button action="next" tone="sky" size="lg" onClick={() => openRound((deal.level + 1) as LevelId, randomSeed())}>Next level</Button>
        )}
        <Button action="levels" tone="grey" size="lg" onClick={goLevels}>Levels</Button>
      </div>
    </div>
  ) : null;

  return (
    <div
      data-monkey-phase={phase}
      data-guide-count={guideCount}
      data-settling={settle ? "1" : "0"}
      style={{
        minHeight: "100%", background: GROUND, color: INK, fontFamily: UI_FONT,
        colorScheme: "light",
      }}
    >
      <style>{`
        [data-monkey-phase] button:not(:disabled):active { transform: translateY(3px); }
        [data-monkey-phase] .tnum { font-variant-numeric: tabular-nums; }
      `}</style>
      {phase === "levels" && levelsScreen}
      {phase === "open" && openScreen}
      {phase === "play" && playScreen}
      {phase === "end" && endScreen}
    </div>
  );
}
