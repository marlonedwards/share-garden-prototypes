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
  isUnlocked, levelCard, levelLocked, monkeyFinalWorth, monkeyLine, newPlayerRun,
  randomSeed, rankAt, recordRound, worstMonkey, youLine,
} from "../lib/monkey/round";
import { UI_FONT } from "../lib/type";
// The stage team's parts.
import Board, { RAIL_WIDTH } from "../components/monkey/Board";
import Button from "../components/monkey/Button";
import Guide from "../components/monkey/Guide";
import Strip, { SETTLED_HEIGHT, STRIP_GUIDE_ROOM, STRIP_HEIGHT } from "../components/monkey/Strip";
import Troop, { TROOP_HEIGHT } from "../components/monkey/Troop";
import {
  DESK, GREEN, GROUND, INK, LAYOUT, MUTED, PANEL, RADIUS, SIZE, SKY, TIES, WEIGHT,
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

// What the trade row says while no wedge is picked. The buttons act on the
// focused wedge, so with nothing focused they are dark and this is the only
// thing to read.
const PICK_HINT = "Tap a wedge to pick a stock";

// The grid, and there is only one. Every phase is a column of panels inside one
// gutter, every panel carries the same padding and the same radius, every gap
// between two panels is the same, and the header's text starts and ends on the
// panels' own edges. The numbers live in look.ts so the stage and the page
// cannot drift apart.
const GUTTER = LAYOUT.gutter;
const GAP = LAYOUT.gap;
const PAD = LAYOUT.pad;
const HEADER_H = LAYOUT.header;
const CONTROL_H = LAYOUT.control;

// The strip's panel: the strip's own band plus the room its bubble grows into,
// inside the one panel padding.
const STRIP_BAND = STRIP_HEIGHT + STRIP_GUIDE_ROOM + PAD * 2;

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
  // The round this page last dealt itself, "level|seed". The buttons write
  // their round into the url, which runs the pinning effect below again; this
  // is what tells that effect the params are its own writing and not a player
  // editing the link, so a deal is never doubled and a round in progress is
  // never reset under the player.
  const lastDealtRef = useRef<string | null>(null);
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
    lastDealtRef.current = `${level}|${seed}`;
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
    // Every board level opens with nothing picked: pre-focusing the first
    // wedge made one click of Buy max the dominant play and the board a
    // decoration. Level 1's calendar has a single stock and nothing to pick,
    // so it keeps its focus.
    const opening = d.target === "calendar" ? d.tickers[0] : "";
    setFocus(opening);
    focusRef.current = opening;
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

  // Every round dealt from a button pins itself: the url carries the level and
  // the seed it is actually playing, with replace semantics so the back button
  // is not filled with rounds, and a reload reproduces the round on screen.
  // The click is also the gesture that arms audio, so the first dart of a
  // round opened from a level card lands with a sound on it.
  const dealPinned = useCallback((level: LevelId, seed: number) => {
    armAudio();
    openRound(level, seed);
    const next = new URLSearchParams(params);
    next.set("level", String(level));
    next.set("seed", String(seed));
    setParams(next, { replace: true });
  }, [openRound, params, setParams]);

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
    // The page's own buttons write these params; re-dealing here would deal
    // the round twice and throw the darts over a round already being played.
    if (lastDealtRef.current === `${d.level}|${d.seed}`) return;
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
    // the open line counts the board this round was dealt, which is nine
    // wedges on level 3 and not the ten section 3's prose assumed
    speak("open", lineFor(deal.level, "open", deal.tickers.length));
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

  // Level 1's monkeys sit in cash until their own buy month, so for the first
  // half of the round a player one dollar up honestly beats all ten. The
  // number stays honest; the green does not arrive until there is a monkey in
  // the market to have beaten.
  const monkeysIn = useMemo(
    () => (deal && run ? deal.monkeys.some((m) => m.buyMonth <= run.t) : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deal, run, tick],
  );

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
    const heldMonths = monthsHolding(run);
    const held = Math.round(heldMonths);
    return {
      finalWorth,
      beaten: ranked.beaten,
      order: ranked.order,
      win: ranked.beaten >= 5,
      // A rank earned on bust windows alone, with no share ever held, is not
      // a win worth celebrating: the guide's line stays (rank-keyed, per
      // spec) but the troop's cheer, its confetti and its slump both need a
      // player who actually stood in the market at some point.
      neverInvested: heldMonths === 0,
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

  // The play stage, from the window down. The chart is the bottom third and
  // never more (section 6), the stage row is what is left over, and the desk
  // band is what is left of that once the rank strip and the trade row have
  // taken their fixed heights. Every number here is a difference of grid
  // tokens, so nothing is ever a pixel out.
  const stageW = viewW - GUTTER * 2;
  const chartH = Math.max(180, Math.min(340, Math.round(viewH * 0.30)));
  const topH = Math.max(300, viewH - GUTTER * 2 - HEADER_H - GAP * 2 - chartH);
  const leftW = Math.max(520, stageW - RAIL_WIDTH - GAP);
  // the desk's panel, and inside it the band of columns above the trade row
  const deskPanelH = Math.max(150, topH - STRIP_BAND - GAP);
  const deskH = Math.max(72, deskPanelH - PAD * 2 - CONTROL_H - GAP);

  // The open screen: the troop and the board share one panel on the left, the
  // desk takes the column on the right, and the trade row spans the foot of the
  // page exactly where it sits during play.
  const openStageH = Math.max(260, viewH - GUTTER * 2 - HEADER_H - GAP * 2 - (CONTROL_H + PAD * 2));
  const openRightW = 340;
  const troopH = openStageH >= 620 ? TROOP_HEIGHT : 78;

  // The end card, laid on the same grid: the lead, the settled strip, two
  // panels of the same height, and the buttons.
  const endRoom = Math.max(200,
    viewH - GUTTER * 2 - HEADER_H - (SETTLED_HEIGHT + PAD * 2) - GAP * 2);
  // a tall window gives its extra height to the settled strip, which is the end
  // card's first sentence and the thing the confetti falls through, rather than
  // to a column of six lines that would have to be spread out to fill it
  const endBodyH = Math.min(endRoom, 560);
  const endStripH = SETTLED_HEIGHT + (endRoom - endBodyH);
  const endColW = Math.floor((stageW - GAP) / 2);
  const endChartH = Math.max(140, endBodyH - PAD * 2 - 30 - GAP);

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

  // The desk's own ruler is set from the band it is actually drawn in, which is
  // the whole column at the round open and the band between the strip and the
  // trade row once the tape runs. The scale is set once and only ever eased
  // down, so the shorter band at the start of play brings it down and no trade
  // ever moves it again.
  const deskBand = phase === "open" ? openStageH - PAD * 2 : deskH;
  const meterH = deskBand - 40;
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

  // The end card's chart is a reveal, not a trade surface, so a round played
  // without ever picking a wedge still gets a line with real years on it: the
  // biggest position the player ended on, or the first wedge if they held
  // nothing at all.
  const endTicker = useMemo(() => {
    if (!deal || !run) return "";
    if (focus) return focus;
    let pick = deal.tickers[0] ?? "";
    let most = 0;
    for (const t of deal.tickers) {
      const n = run.holdings[t] ?? 0;
      if (n > most) { most = n; pick = t; }
    }
    return pick;
  }, [deal, run, focus]);
  const endSeries = run && endTicker ? run.prices[endTicker] ?? [] : [];
  const endTrades: ChartTrade[] = useMemo(() => {
    if (!run || !endTicker) return [];
    return run.trades
      .filter((tr) => tr.ticker === endTicker)
      .map((tr) => ({ at: tr.at, price: tr.price, side: tr.kind }));
  }, [run, endTicker]);
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

  // one height for all three level cards, so their buttons stand on one line
  const cardH = 232;

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
    <div
      style={{
        height: "100vh", padding: GUTTER, display: "flex", flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div style={{ height: HEADER_H, display: "flex", alignItems: "center", justifyContent: "flex-end", flex: "none" }}>
        {mute}
      </div>
      {/* the title, the three cards and the troop are one block, centred in
          what is left of the window, so a tall screen puts air above and below
          the composition rather than a hole in the middle of it */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 0, gap: 32 }}>
        <div style={{ width: "100%", maxWidth: 1120 }}>
          <h1 style={{ fontSize: 40, fontWeight: WEIGHT.heading, letterSpacing: "-0.02em", lineHeight: "46px" }}>
            Monkey Trade
          </h1>
          <p style={{ fontSize: SIZE.body, color: MUTED, marginTop: 8 }}>
            Ten monkeys threw darts. Beat them if you can.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: GAP, marginTop: 28 }}>
            {LEVEL_IDS.map((id) => {
              const open = isUnlocked(id);
              const best = bestFor(id);
              return (
                <Card
                  key={`${id}-${saveTick}`}
                  style={{
                    padding: PAD + 4, display: "flex", flexDirection: "column",
                    gap: 8, minHeight: cardH, boxSizing: "border-box",
                  }}
                >
                  <div style={{ fontSize: SIZE.lead, fontWeight: WEIGHT.heading }}>{levelCard(id)}</div>
                  <div style={{ fontSize: 15, color: MUTED, lineHeight: "22px" }}>
                    {open ? `${LEVELS[id].proves}.` : levelLocked()}
                  </div>
                  {/* the best line's row is reserved by its height, not by a
                      transparent full stop nobody can see but a reader can copy */}
                  <div className="tnum" style={{ fontSize: 15, color: INK, minHeight: 22, lineHeight: "22px" }}>
                    {best > 0 ? `Best: beat ${best} of ${MONKEYS}` : ""}
                  </div>
                  {/* every card's button stands on the same line, whatever the
                      words above it did */}
                  <div style={{ flex: 1 }} />
                  <div>
                    <Button
                      action={`throw-${id}`}
                      disabled={!open}
                      onClick={() => dealPinned(id, randomSeed())}
                    >
                      Throw
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
        {/* the troop stands under the cards. The game is called Monkey Trade and
            the screen that picks a round used to have no monkey on it, which is
            also what left half of a 1080 window empty */}
        <Troop
          darts={[]}
          thrown={false}
          count={MONKEYS}
          guideIndex={1}
          guideLine={null}
          ties={TIES}
          width={Math.min(1120, stageW)}
          height={TROOP_HEIGHT}
          instant
        />
      </div>
      <div style={{ height: HEADER_H, display: "flex", alignItems: "center", flex: "none" }}>
        <Link to="/" style={{ fontSize: 15, color: SKY }}>Back to the games</Link>
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
      <div className="tnum" data-clock={Math.floor(run.t)} style={{ fontSize: 18, fontWeight: WEIGHT.emphasis }}>
        {clockLabel(deal, run.t)}
      </div>
      <div
        className="tnum"
        data-beaten={beaten}
        style={{
          fontSize: SIZE.rank, fontWeight: WEIGHT.heading, lineHeight: `${HEADER_H}px`,
          color: beaten >= 5 && monkeysIn ? GREEN : INK,
        }}
      >
        {beatenLine(beaten)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span className="tnum" data-worth={worth.toFixed(4)} style={{ fontSize: 18, fontWeight: WEIGHT.emphasis }}>
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

  // Every button in the row is one size, so they share one height and one
  // baseline; Start is the same button, wider, because it is the one that ends
  // the round open rather than a seventh trade.
  const tradeRow = (
    <div
      style={{
        height: CONTROL_H, display: "flex", alignItems: "center", gap: 10, flex: "none",
      }}
    >
      <Button action="buy1" tone="green" disabled={!tradesLive || !focus || !canBuy(1)} onClick={() => trade((r) => buy(r, focus, price))}>Buy 1</Button>
      <Button action="buy5" tone="green" disabled={!tradesLive || !focus || !canBuy(5)} onClick={() => trade((r) => buy(r, focus, price * 5))}>Buy 5</Button>
      <Button action="buymax" tone="green" disabled={!tradesLive || !focus || !canBuy()} onClick={() => trade((r) => buy(r, focus))}>Buy max</Button>
      <div style={{ width: 20 }} />
      <Button action="sell1" tone="red" disabled={!tradesLive || !focus || held < 1} onClick={() => trade((r) => sell(r, focus, 1))}>Sell 1</Button>
      <Button action="sell5" tone="red" disabled={!tradesLive || !focus || held < 1} onClick={() => trade((r) => sell(r, focus, 5))}>Sell 5</Button>
      <Button action="sellall" tone="red" disabled={!tradesLive || !focus || held < 1} onClick={() => trade((r) => sell(r, focus))}>Sell all</Button>
      <div style={{ flex: 1, minWidth: 16 }} />
      <span
        data-trade-note
        style={{ fontSize: SIZE.body, color: MUTED, overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {focus
          ? `${companyName(focus)} ${dead ? "went to zero" : `now $${price.toFixed(2)}`}`
          : PICK_HINT}
      </span>
      {phase === "open" && (
        <Button action="start" tone="sky" disabled={!throwDone} onClick={start} style={{ minWidth: 132 }}>
          Start
        </Button>
      )}
    </div>
  );

  // -------------------------------------------------------------- open phase

  const openScreen = run && deal ? (
    <div
      style={{
        height: "100vh", padding: GUTTER, display: "flex", flexDirection: "column", gap: GAP,
        boxSizing: "border-box",
      }}
    >
      {header}
      <div style={{ height: openStageH, display: "flex", gap: GAP, flex: "none" }}>
        {/* the troop and the board it is about to throw at, one scene in one
            panel: the monkeys stand across the top of it and the dial fills
            everything under them */}
        <Card
          style={{
            flex: "1 1 0", minWidth: 0, padding: PAD, display: "flex", flexDirection: "column",
            gap: GAP, overflow: "hidden", boxSizing: "border-box",
          }}
        >
          <Troop
            darts={dartList}
            thrown={thrown}
            count={MONKEYS}
            guideIndex={deal.guideIndex}
            guideLine={guideLine}
            ties={TIES}
            width={Math.max(240, stageW - openRightW - GAP - PAD * 2)}
            height={troopH}
          />
          <div ref={boardBox} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
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
          </div>
        </Card>
        {/* the desk takes the right column at full height, so the thousand you
            start with is a stack you can count rather than a chip in a corner */}
        <div style={{ flex: `0 0 ${openRightW}px`, width: openRightW, minHeight: 0 }}>
          <Desk
            columns={columns}
            scale={scaleRef.current}
            height={openStageH - PAD * 2}
            focus={focus}
            onFocus={focusOn}
            settling={settle !== null}
            phone={false}
            pour={pour}
            band={openRightW - PAD * 2}
          />
        </div>
      </div>
      <Card style={{ padding: PAD, flex: "none" }}>
        {tradeRow}
      </Card>
    </div>
  ) : null;

  // -------------------------------------------------------------- play phase

  const playScreen = run && deal && liveRank ? (
    <div
      style={{
        height: "100vh", padding: GUTTER, display: "flex", flexDirection: "column", gap: GAP,
        boxSizing: "border-box",
      }}
    >
      {header}
      <div style={{ height: topH, display: "flex", gap: GAP, flex: "none" }}>
        <div style={{ width: leftW, display: "flex", flexDirection: "column", gap: GAP, minWidth: 0 }}>
          <Card style={{ height: STRIP_BAND, padding: PAD, paddingTop: PAD + STRIP_GUIDE_ROOM, flex: "none", boxSizing: "border-box" }}>
            <Strip
              slots={liveRank.order.map((s) => ({ who: s.who, worth: s.worth }))}
              guideIndex={deal.guideIndex}
              guideLine={guideLine}
              settled={false}
              mood={null}
              playerInitial="Y"
              ties={TIES}
              width={leftW - PAD * 2}
              height={STRIP_HEIGHT}
            />
          </Card>
          {/* the desk band and the trade row are one panel, the way section 6
              draws them: the buttons belong to the desk they act on */}
          <Desk
            columns={columns}
            scale={scaleRef.current}
            height={deskH}
            focus={focus}
            onFocus={focusOn}
            settling={settle !== null}
            phone={false}
            pour={pour}
            band={leftW - PAD * 2}
            footer={tradeRow}
          />
        </div>
        <div
          style={{
            width: RAIL_WIDTH, flex: "none", background: PANEL, borderRadius: RADIUS,
            height: topH, overflow: "hidden",
          }}
        >
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
      </div>
      <div
        ref={chartBox}
        data-chart="monkey"
        data-chart-labels="months"
        style={{
          height: chartH, flex: "none", background: PANEL, borderRadius: RADIUS,
          padding: PAD, overflow: "hidden", boxSizing: "border-box",
        }}
      >
        {focus ? (
          <Chart
            series={series}
            months={monthLabels}
            t={run.t}
            livePrice={price}
            width={chartW - PAD * 2}
            height={chartH - PAD * 2}
            trades={chartTrades}
            chip
            lineColor={INK}
            textColor={MUTED}
            gridColor="rgba(60,60,60,0.14)"
          />
        ) : (
          <div style={{
            height: chartH - PAD * 2, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: SIZE.body, color: MUTED,
          }}>
            {PICK_HINT}
          </div>
        )}
      </div>
    </div>
  ) : null;

  // -------------------------------------------------------------- the end

  const endScreen = run && deal && ending ? (
    <div
      data-end-card
      style={{
        height: "100vh", padding: GUTTER, display: "flex", flexDirection: "column", gap: GAP,
        boxSizing: "border-box",
      }}
    >
      <div style={{ height: HEADER_H, display: "flex", alignItems: "center", justifyContent: "space-between", flex: "none" }}>
        <div style={{ fontSize: SIZE.end, fontWeight: WEIGHT.heading, letterSpacing: "-0.02em", lineHeight: `${HEADER_H}px` }}>
          {endLead(ending.beaten)}
        </div>
        {mute}
      </div>

      <Card style={{ padding: PAD, flex: "none", boxSizing: "border-box" }}>
        <Strip
          slots={ending.order.map((s) => ({ who: s.who, worth: s.worth }))}
          guideIndex={deal.guideIndex}
          guideLine={null}
          settled
          mood={ending.neverInvested ? null : ending.win ? "cheer" : "slump"}
          playerInitial="Y"
          ties={TIES}
          width={stageW - PAD * 2}
          height={endStripH}
        />
      </Card>

      <div style={{ height: endBodyH, display: "flex", gap: GAP, flex: "none" }}>
        {/* what the round came to, in order, largest first (section 7) */}
        <Card
          style={{
            width: endColW, flex: "none", padding: PAD, display: "flex", flexDirection: "column",
            gap: 10, overflowY: "auto", boxSizing: "border-box",
          }}
        >
          <div className="tnum" style={{ fontSize: SIZE.rank, fontWeight: WEIGHT.heading, lineHeight: "34px" }}>
            {youLine(ending.finalWorth)}
          </div>
          {/* the two baskets and the round's own numbers, one block, so the
              card reads as three things and not as nine loose lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: SIZE.body, lineHeight: "24px" }}>{ending.bestLine}</div>
            <div style={{ fontSize: SIZE.body, lineHeight: "24px" }}>{ending.worstLine}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px", fontSize: 14, color: MUTED, lineHeight: "22px" }}>
              <span className="tnum">{`${ending.trades} ${plural(ending.trades, "trade", "trades")} made.`}</span>
              <span className="tnum">{`${ending.held} of ${deal.months.length} months in the market.`}</span>
              <span className="tnum">{`Biggest single decision: ${money(ending.biggest)}.`}</span>
            </div>
            <div style={{ fontSize: 14, color: MUTED, lineHeight: "22px" }}>{indexLine(ending.index)}</div>
            {deal.dead.map((t) => (
              <div key={t} style={{ fontSize: 14, color: MUTED, lineHeight: "22px" }}>{deadLine(t)}</div>
            ))}
          </div>
          <Guide line={guideLine} width={endColW - PAD * 2} persist />
          {/* the buttons stand at the foot of the card the round is summed up
              in, rather than in a row of their own under two panels that then
              had to be spread out to reach them */}
          <div style={{ flex: 1, minHeight: GAP }} />
          <div style={{ height: CONTROL_H, display: "flex", gap: GAP, alignItems: "center", flex: "none" }}>
            <Button action="again" tone="green" onClick={() => dealPinned(deal.level, randomSeed())}>Play again</Button>
            {deal.level < 3 && isUnlocked((deal.level + 1) as LevelId) && (
              <Button action="next" tone="sky" onClick={() => dealPinned((deal.level + 1) as LevelId, randomSeed())}>Next level</Button>
            )}
            <Button action="levels" tone="grey" onClick={goLevels}>Levels</Button>
          </div>
        </Card>

        {/* and what it was: the era named, with the chart redrawn on real years */}
        <Card
          style={{
            width: endColW, flex: "none", padding: PAD, display: "flex", flexDirection: "column",
            gap: GAP, boxSizing: "border-box",
          }}
        >
          <div data-era-reveal style={{ fontSize: SIZE.lead, fontWeight: WEIGHT.emphasis, lineHeight: "30px" }}>
            {eraRevealText(deal)}
          </div>
          <div data-chart="monkey" data-chart-labels="years" style={{ flex: 1, minHeight: 0 }}>
            <Chart
              series={endSeries}
              months={deal.months}
              t={lastIndex(run)}
              width={endColW - PAD * 2}
              height={endChartH}
              trades={endTrades}
              chip={false}
              lineColor={INK}
              textColor={MUTED}
              gridColor="rgba(60,60,60,0.14)"
            />
          </div>
        </Card>
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
