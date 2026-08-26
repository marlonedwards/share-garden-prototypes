// Trigger. One stock, one fast run, one button that is either in or out.
// Contract: docs/trigger-spec.md, shared engine: docs/tape-shared.md.
//
// The page owns the clock and nothing else. Every number on screen is read
// back out of the engine, so the calculator, the meter, the chart and the end
// card cannot disagree with each other: they are four drawings of one state.
//
// The tape lives in a ref rather than in state, because the space bar has to
// trade against the tape as it stands this frame, not against whatever React
// rendered last. State is a mirror of the ref, pushed once per frame.

import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Chart from "../components/trigger/Chart";
import type { ChartTrade } from "../components/trigger/Chart";
import CodeEditor from "../components/trigger/CodeEditor";
import Feed from "../components/trigger/Feed";
import type { FeedItem } from "../components/trigger/Feed";
import Meter from "../components/trigger/Meter";
import { HEADLINE_POOL } from "../data/headlinePool";
import type { EraId, RunState } from "../lib/tape/engine";
import {
  advance, baselines, buy, canBuy, isDead, isOver, lastIndex, monthAt,
  monthIndexOf, newRun, priceAt, runIndexOf, sell, wholeShares, worthAt, worthOf,
} from "../lib/tape/engine";
import type { HeadlineSample, PlacedHeadline } from "../lib/tape/headlines";
import { sampleHeadlines } from "../lib/tape/headlines";
import { UI_FONT } from "../lib/type";
import type { BotFn } from "../lib/trigger/bot";
import { TICKS_PER_MONTH, botAct, compileBot } from "../lib/trigger/bot";
import { BOT_FILES, BOT_SCAFFOLD } from "../lib/trigger/bots";
import type { Deal } from "../lib/trigger/deal";
import type { Level } from "../lib/trigger/levels";
import { LEVELS, levelById } from "../lib/trigger/levels";
import {
  ERA_MOOD, ERA_NAME, SPEED, START_CASH, companyName, dealFromParams,
  dealKey, dealRandom, dealRandomExcluding, longMonth, randomSeed, yearOf,
} from "../lib/trigger/deal";
import {
  bestDecision, decisionsOf, monthsInMarket, spansOf, worstDecision,
} from "../lib/trigger/decisions";
import { fitFontSize } from "../lib/trigger/fit";
import { money, price as fmtPrice, signedMoney } from "../lib/trigger/format";

const BG = "#0C0F14";
const PANEL = "#1F2733";
const TEXT = "#E8EDF4";
const MUTED = "#8794A6";
const UP = "#4ADE80";
const DOWN = "#E5484D";

const BEST_KEY = "trigger-best";
const BOT_KEY = "trigger-bot";
// Skip to end: the tape at ten times game speed, fast but still animated.
// Tunable; a hundred reads as a cut rather than a sprint.
const SKIP_SPEED = 10;
// The level batch: how many further markets a level's bot is run across
// after its watched run, each dealt at random from (company, era window).
const SIM_COUNT = 10;
// A headline sits for about two seconds, and gives way faster when the tape
// has already reached the next one, so the feed never falls far behind the
// month it is reporting on.
const DWELL = [1900, 1200, 800];

type Phase = "deal" | "run" | "end" | "error" | "sims" | "summary" | "markets";

// Who is on the trigger: you with the space bar, or a bot you wrote.
type Mode = "you" | "bot";

// The deal-phase screens: the top choice, then free play or a level's card.
// Level selection lives in the collapsible sidebar, not a screen of its own.
type Menu = "top" | "free" | "level";

interface Session {
  deal: Deal;
  sample: HeadlineSample;
}

// Where the bot's run stopped and why, on screen verbatim.
interface BotStop {
  message: string;
  month: string;
}

// The one key that drives the walkthrough forward and fires its prompted
// trades. The handler, the keycap on Next and the card copy all read from
// here, so rebinding it is a one line change.
const GUIDE_KEY = { code: "Space", key: " ", label: "space" };

// The manual walkthrough, data first: each card names an anchor on the run
// screen to sit beside and what the guide key does there, advance or the
// prompted trade. Rearranging the tour is editing this list.
interface GuideStep {
  anchor: "chart" | "xaxis" | "yaxis" | "meter" | "button";
  action: "next" | "buy" | "sell";
  title?: string;
  text?: string;
}

// The bot primer's scripted trace: three ticks of inputs and the action they
// draw, with a buy, a do nothing and a sell all on show. Clean numbers and
// no market attached, because the lesson is the shape of the function: the
// price list grows by one each tick, and the holdings carry the last action.
interface PrimerCycle {
  prices: number[];
  shares: number;
  cash: number;
  out: number;
  reading: string;
}

const BOT_PRIMER_CYCLES: PrimerCycle[] = [
  { prices: [100], shares: 0, cash: 1000, out: 10, reading: "buys 10 shares with all its cash" },
  { prices: [100, 110], shares: 10, cash: 0, out: 0, reading: "does nothing" },
  { prices: [100, 110, 120], shares: 10, cash: 0, out: -10, reading: "sells all 10 shares" },
];

const GUIDE_STEPS: GuideStep[] = [
  { anchor: "chart", action: "next", title: "The tape is paused." },
  { anchor: "xaxis", action: "next", text: "This is the time in the simulation." },
  {
    anchor: "yaxis", action: "next",
    text: "This is the price of a single share of the company, which changes over time.",
  },
  { anchor: "meter", action: "next", text: "Grey is your cash, which doesn't change in value." },
  {
    anchor: "button", action: "buy", title: "One control.",
    text: `Press ${GUIDE_KEY.label} to buy or sell. Press it now to turn all your cash into shares.`,
  },
  {
    anchor: "meter", action: "next",
    text: "Green are the shares you own. The total height is the value of all your shares, and it changes as the price of a single share grows or shrinks.",
  },
  {
    anchor: "button", action: "sell",
    text: `Press ${GUIDE_KEY.label} to sell all your shares, starting fresh with $1,000 in cash. Now is your time to prove yourself against the market.`,
  },
];

// One market of the parallel batch: its own deal, tape, headlines, and its
// own compiled bot, so a stateful strategy cannot bleed between markets.
interface Sim {
  deal: Deal;
  run: RunState;
  sample: HeadlineSample;
  bot: BotFn;
  tick: number;          // the last bot tick taken on this tape
  prices: number[];      // the tick prices this market's bot has been shown
  error: string | null;  // set when this market's bot broke a rule
}

// One batch market's outcome: where the bot played and what it earned over
// doing nothing there, or the rule it broke.
interface SimResult {
  era: EraId;
  ticker: string;
  month: string;         // the run's first month
  delta: number;
  error: string | null;
}

function makeRun(deal: Deal, speed: number): RunState {
  return newRun({
    era: deal.era,
    tickers: [deal.ticker],
    startCash: START_CASH,
    speed,
    startMonth: deal.startMonth,
  });
}

function makeSample(deal: Deal): HeadlineSample {
  return sampleHeadlines({
    era: deal.era,
    pool: HEADLINE_POOL,
    seed: deal.seed,
    startIndex: monthIndexOf(deal.era, deal.startMonth),
  });
}

function readBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // a locked down browser just loses the record, the run still plays
  }
}

// The bot survives a reload, because nobody wants to retype a strategy that
// took ten runs to tune. The scaffold is what a first visit opens with, and a
// stored copy of a retired scaffold, recognised by the monthly-cadence header
// sentence the tick contract replaced, gives way to the current shelf rather
// than pinning the past.
function readBotSource(): string {
  try {
    const stored = localStorage.getItem(BOT_KEY);
    if (stored === null || stored.includes("Your bot plays the run one month at a time.")) {
      return BOT_SCAFFOLD;
    }
    return stored;
  } catch {
    return BOT_SCAFFOLD;
  }
}

function writeBotSource(source: string): void {
  try {
    localStorage.setItem(BOT_KEY, source);
  } catch {
    // same posture as the best score: lost, not fatal
  }
}

const LEVELS_KEY = "trigger-levels";
// The two once-ever walkthroughs: one for the first manual run, one for the
// first bot run, wherever either happens first, levels or free play.
const GUIDE_YOU_KEY = "trigger-guide-you";
const GUIDE_BOT_KEY = "trigger-guide-bot";

// A locked down browser reads as "seen", because a guide that cannot record
// itself would otherwise fire on every single run.
function seenGuide(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return true;
  }
}

function markGuide(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // nothing to do; the guide will show again
  }
}

// Per level, the best delta over doing nothing this browser has seen. The
// level list doubles as the scoreboard: which players have run, and how each
// one did, with no other commentary.
function readLevelLog(): Record<number, number> {
  try {
    const raw = localStorage.getItem(LEVELS_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k);
      if (Number.isInteger(id) && typeof v === "number" && Number.isFinite(v)) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLevelLog(log: Record<number, number>): void {
  try {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(log));
  } catch {
    // lost, not fatal
  }
}

// A level's runnable and displayable source: the bot's own file plus the
// picker line, exactly what free play's scaffold would run for that bot.
function levelSource(player: string): string {
  return `${BOT_FILES[player] ?? ""}\nbot = ${player};`;
}

// The one listener for the guide key, capture phase, so a button that kept
// focus from an earlier click can neither swallow the key as its own
// activation nor double fire it, and the page never scrolls under it. The
// key itself is configured in GUIDE_KEY and nowhere else.
function useGuideKey(active: boolean, onFire: () => void): void {
  const fireRef = useRef(onFire);
  fireRef.current = onFire;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== GUIDE_KEY.code && e.key !== GUIDE_KEY.key) return;
      e.preventDefault();
      e.stopPropagation();
      fireRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active]);
}

const LABEL_COPY: Record<string, string> = {
  signal: "told the truth",
  noise: "meant nothing",
  lie: "pointed the wrong way",
};

const LABEL_COLOR: Record<string, string> = {
  signal: UP,
  noise: MUTED,
  lie: DOWN,
};

export default function Trigger() {
  const [params, setParams] = useSearchParams();
  // Test only: multiplies the tape speed so a walk does not have to sit
  // through a real minute. It changes nothing else and is off by default.
  const turbo = useMemo(() => {
    const n = Number(params.get("turbo"));
    return Number.isFinite(n) && n >= 1 ? Math.min(60, n) : 1;
  }, [params]);
  const speed = SPEED * turbo;

  const [session, setSession] = useState<Session>(() => {
    const deal = dealFromParams(params.get("era"), params.get("stock"), params.get("seed"));
    return { deal, sample: makeSample(deal) };
  });
  const { deal, sample } = session;
  const ticker = deal.ticker;

  const runRef = useRef<RunState>(makeRun(deal, speed));
  const [run, setRun] = useState<RunState>(runRef.current);
  const [phase, setPhase] = useState<Phase>("deal");
  const [best, setBest] = useState<number | null>(() => readBest());

  // the entry flow: which deal-phase screen is up, which level is open, and
  // the per-level scoreboard
  const [menu, setMenu] = useState<Menu>("top");
  const [levelId, setLevelId] = useState<number | null>(null);
  const [levelLog, setLevelLog] = useState<Record<number, number>>(() => readLevelLog());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // the bot: who plays this run (mode), the free-play tab choice, the source
  // in the editor, the compiled function, and the rule it broke if it stopped
  const [mode, setMode] = useState<Mode>("you");
  const [freeMode, setFreeMode] = useState<Mode>("you");
  const [botSource, setBotSource] = useState<string>(() => readBotSource());
  const [compileError, setCompileError] = useState<string | null>(null);
  const [botStop, setBotStop] = useState<BotStop | null>(null);
  const botRef = useRef<BotFn | null>(null);
  // the last tick the bot has acted on, and the tick prices it has been shown
  const botTickRef = useRef(-1);
  const botPricesRef = useRef<number[]>([]);

  // skip to end: a dt multiplier the clock reads every frame, one way per run
  const [fast, setFast] = useState(false);
  const fastRef = useRef(1);

  // the parallel batch: the markets in flight (a ref the sims clock owns and
  // a snapshot the stack renders from), every finished market kept for the
  // review screen, and the accumulated results
  const simsRef = useRef<Sim[]>([]);
  const [simsView, setSimsView] = useState<Sim[]>([]);
  const [markets, setMarkets] = useState<Sim[]>([]);
  const [simResults, setSimResults] = useState<SimResult[]>([]);

  // the running bot's source, behind the word bot on the trading panel
  const botSourceRef = useRef("");

  // the walkthroughs: the manual guide's step index (the clock holds while
  // it is non null), and the bot primer with the start it intercepted
  const [guide, setGuide] = useState<number | null>(null);
  const guideRef = useRef<number | null>(null);
  guideRef.current = guide;
  const [botGuide, setBotGuide] = useState(false);

  // headline feed
  const nextRef = useRef(0);
  const queueRef = useRef<PlacedHeadline[]>([]);
  const shownRef = useRef<PlacedHeadline | null>(null);
  const expiryRef = useRef(0);
  const [shown, setShown] = useState<PlacedHeadline | null>(null);

  // net worth spark
  const historyRef = useRef<number[]>([START_CASH]);
  const historyAtRef = useRef(0);
  const [history, setHistory] = useState<number[]>([START_CASH]);

  // One deal onto a clean tape: every ref the clock reads, the session, and
  // the pinned url move together. begin() and start() both go through here,
  // and so does the batch when it chains one simulation into the next.
  const resetRun = useCallback((next: Deal) => {
    runRef.current = makeRun(next, SPEED * turbo);
    nextRef.current = 0;
    queueRef.current = [];
    shownRef.current = null;
    expiryRef.current = 0;
    historyRef.current = [START_CASH];
    historyAtRef.current = 0;
    botTickRef.current = -1;
    botPricesRef.current = [];
    setSession({ deal: next, sample: makeSample(next) });
    setRun(runRef.current);
    setShown(null);
    setHistory([START_CASH]);
    setParams(
      { era: next.era, stock: next.ticker, seed: String(next.seed), ...(turbo > 1 ? { turbo: String(turbo) } : {}) },
      { replace: true },
    );
  }, [setParams, turbo]);

  const begin = useCallback((next: Deal) => {
    resetRun(next);
    fastRef.current = 1;
    setFast(false);
    setBotStop(null);
    setPhase("deal");
  }, [resetRun]);

  // Leaving the deal card always starts from a clean tape. The deal card can
  // be returned to, by editing the bot after a stopped run, so the run built
  // at mount or by begin() may already be half played by the time Start fires.
  // A level names its player; free play (level null) takes it from the tabs.
  const start = useCallback((level: Level | null) => {
    const asBot = level === null ? freeMode === "bot" : level.player !== "you";
    if (asBot) {
      // the first bot run anywhere gets the primer instead; it exits back
      // to this same card, where Run bot now runs
      if (!seenGuide(GUIDE_BOT_KEY)) {
        setBotGuide(true);
        return;
      }
      const editable = level === null || level.player === "editor";
      const source = editable ? botSource : levelSource(level.player);
      const compiled = compileBot(source);
      if ("error" in compiled) {
        setCompileError(compiled.error);
        return;
      }
      botRef.current = compiled.bot;
      botSourceRef.current = source;
      if (editable) writeBotSource(botSource);
    } else if (!seenGuide(GUIDE_YOU_KEY)) {
      // the first manual run anywhere opens on the walkthrough, tape held
      setGuide(0);
    }
    setMode(asBot ? "bot" : "you");
    setLevelId(level?.id ?? null);
    fastRef.current = 1;
    setFast(false);
    resetRun(deal);
    setCompileError(null);
    setBotStop(null);
    setPhase("run");
  }, [freeMode, botSource, deal, resetRun]);

  // The batch: SIM_COUNT markets dealt at random and run side by side at
  // skip speed, each with its own freshly compiled bot so a stateful
  // strategy cannot bleed between markets. Fresh from an end card the tally
  // starts over; Run 10 more keeps adding to it. No (company, timespan)
  // pair is dealt twice, within a batch or across the tally, until the pool
  // itself runs out.
  const startBatch = useCallback((fresh: boolean) => {
    const source = botSourceRef.current;
    const sims: Sim[] = [];
    const taken = fresh
      ? new Set<string>()
      : new Set(markets.map((m) => dealKey({ era: m.run.era, ticker: m.deal.ticker })));
    for (let i = 0; i < SIM_COUNT; i++) {
      const compiled = compileBot(source);
      if ("error" in compiled) return;      // it compiled once to get here
      const d = dealRandomExcluding(taken);
      taken.add(dealKey(d));
      sims.push({
        deal: d,
        run: makeRun(d, SPEED * turbo),
        sample: makeSample(d),
        bot: compiled.bot,
        tick: -1,
        prices: [],
        error: null,
      });
    }
    simsRef.current = sims;
    setSimsView([...sims]);
    if (fresh) {
      setMarkets([]);
      setSimResults([]);
    }
    setPhase("sims");
  }, [turbo, markets]);

  // A pinned link is allowed to change under the page: editing the query, or
  // following a shared url from another run, deals the run it names rather
  // than leaving the old one on screen.
  useEffect(() => {
    const eraParam = params.get("era");
    const stockParam = params.get("stock");
    const seedParam = params.get("seed");
    if (eraParam === null && stockParam === null && seedParam === null) return;
    const sameEra = eraParam === null || eraParam === deal.era;
    const sameStock = stockParam === null || stockParam === deal.ticker;
    const sameSeed = seedParam === null || Number(seedParam) === deal.seed;
    if (sameEra && sameStock && sameSeed) return;
    begin(dealFromParams(eraParam, stockParam, seedParam));
  }, [params, deal, begin]);

  // ------------------------------------------------------------- the clock
  useEffect(() => {
    if (phase !== "run") return;
    let raf = 0;
    let last = performance.now();
    const wake = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", wake);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (document.hidden) return;              // the tape pauses with the tab
      if (guideRef.current !== null) return;    // the walkthrough holds the clock

      const current = runRef.current;
      if (!isOver(current)) {
        // skip to end scales the seconds, not the engine: the tape still
        // draws every frame, it just burns market months faster
        runRef.current = advance(current, dt * fastRef.current);
        setRun(runRef.current);
      }
      const t = runRef.current.t;

      // The bot trades on tick boundaries: once per tick the tape has
      // reached, in order, however many a fast frame crossed, each at the
      // smoothstepped price the screen shows there, which is the human's own
      // granularity. Ticks at or past the final month are skipped because a
      // trade there cannot change the outcome, and a finished run deserves
      // an end card rather than a late verdict.
      if (mode === "bot" && botRef.current) {
        const maxTick = Math.ceil(lastIndex(runRef.current) * TICKS_PER_MONTH) - 1;
        const reach = Math.min(Math.floor(t * TICKS_PER_MONTH), maxTick);
        while (botTickRef.current < reach) {
          const tick = botTickRef.current + 1;
          const at = tick / TICKS_PER_MONTH;
          botPricesRef.current.push(priceAt(runRef.current, ticker, at));
          const acted = botAct(runRef.current, ticker, botRef.current, botPricesRef.current, at);
          if ("error" in acted) {
            setBotStop({ message: acted.error, month: monthAt(runRef.current, at) });
            setPhase("error");
            cancelAnimationFrame(raf);
            return;
          }
          botTickRef.current = tick;
          if (acted.run !== runRef.current) {
            runRef.current = acted.run;
            setRun(acted.run);
          }
        }
      }

      // worth samples for the corner spark, one every half month
      if (t - historyAtRef.current >= 0.5) {
        historyAtRef.current = t;
        historyRef.current = [...historyRef.current, worthOf(runRef.current)];
        setHistory(historyRef.current);
      }

      // headlines: queue anything the tape has reached, show one at a time
      const items = sample.items;
      while (nextRef.current < items.length
        && runIndexOf(runRef.current, items[nextRef.current].monthIndex) <= t) {
        queueRef.current.push(items[nextRef.current]);
        nextRef.current += 1;
      }
      if (now >= expiryRef.current && queueRef.current.length > 0) {
        const item = queueRef.current.shift() as PlacedHeadline;
        const dwell = DWELL[Math.min(DWELL.length - 1, queueRef.current.length)] / (turbo * fastRef.current);
        shownRef.current = item;
        expiryRef.current = now + dwell;
        setShown(item);
      }

      if (isOver(runRef.current)) setPhase("end");
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [phase, sample, turbo, mode, ticker]);

  // ---------------------------------------------------------- the sims clock
  // One clock, ten tapes: every frame advances every unfinished market at
  // skip speed and lets that market's own bot act, so the stack moves
  // together. When the slowest market ends, the batch joins the review list
  // and the accumulated results become the summary.
  useEffect(() => {
    if (phase !== "sims") return;
    let raf = 0;
    let last = performance.now();
    const wake = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", wake);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (document.hidden) return;

      let live = false;
      for (const sim of simsRef.current) {
        if (sim.error !== null || isOver(sim.run)) continue;
        sim.run = advance(sim.run, dt * SKIP_SPEED);
        const simTicker = sim.deal.ticker;
        const maxTick = Math.ceil(lastIndex(sim.run) * TICKS_PER_MONTH) - 1;
        const reach = Math.min(Math.floor(sim.run.t * TICKS_PER_MONTH), maxTick);
        while (sim.tick < reach) {
          const tick = sim.tick + 1;
          const at = tick / TICKS_PER_MONTH;
          sim.prices.push(priceAt(sim.run, simTicker, at));
          const acted = botAct(sim.run, simTicker, sim.bot, sim.prices, at);
          if ("error" in acted) {
            sim.error = acted.error;
            break;
          }
          sim.tick = tick;
          sim.run = acted.run;
        }
        if (sim.error === null && !isOver(sim.run)) live = true;
      }
      setSimsView([...simsRef.current]);

      if (!live) {
        const finished = simsRef.current;
        simsRef.current = [];
        setMarkets((prev) => [...prev, ...finished]);
        setSimResults((prev) => [
          ...prev,
          ...finished.map((sim) => {
            const end = lastIndex(sim.run);
            return {
              era: sim.run.era,
              ticker: sim.deal.ticker,
              month: sim.run.months[0],
              delta: sim.error === null
                ? worthAt(sim.run, end) - baselines(sim.run, sim.deal.ticker).holding
                : 0,
              error: sim.error,
            };
          }),
        ]);
        setPhase("summary");
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [phase]);

  // ------------------------------------------------------------ the trade
  const toggle = useCallback(() => {
    const g = guideRef.current;
    // a card that only wants Next ignores the trade controls entirely
    if (g !== null && GUIDE_STEPS[g].action === "next") return;
    const current = runRef.current;
    if (isOver(current)) return;
    const held = current.holdings[ticker] ?? 0;
    const next = held > 0 ? sell(current, ticker) : buy(current, ticker);
    if (next === current) return;
    runRef.current = next;
    setRun(next);
    if (g === null) return;
    if (GUIDE_STEPS[g].action === "buy") {
      setGuide(g + 1);
    } else {
      // the prompted sell: the walkthrough ends where a real run begins,
      // all cash on a clean tape with no practice trades, clock running
      markGuide(GUIDE_YOU_KEY);
      setGuide(null);
      runRef.current = makeRun(deal, speed);
      setRun(runRef.current);
    }
  }, [ticker, deal, speed]);

  const advanceGuide = useCallback(() => {
    setGuide((g) => (g === null ? null : Math.min(g + 1, GUIDE_STEPS.length - 1)));
  }, []);

  useGuideKey(phase === "run" && mode === "you", () => {
    const g = guideRef.current;
    if (g !== null && GUIDE_STEPS[g].action === "next") {
      advanceGuide();
      return;
    }
    toggle();
  });

  // best delta against doing nothing, kept across runs; yours, not a bot's,
  // so a lucky script cannot set a record you then chase by hand
  useEffect(() => {
    if (phase !== "end" || mode !== "you") return;
    const end = lastIndex(runRef.current);
    const delta = worthAt(runRef.current, end) - baselines(runRef.current, ticker).holding;
    const prior = readBest();
    if (prior === null || delta > prior) {
      writeBest(delta);
      setBest(delta);
    }
  }, [phase, mode, ticker]);

  // a finished level goes on the scoreboard: best delta over doing nothing
  useEffect(() => {
    if (phase !== "end" || levelId === null) return;
    const end = lastIndex(runRef.current);
    const delta = worthAt(runRef.current, end) - baselines(runRef.current, ticker).holding;
    setLevelLog((prev) => {
      const held = prev[levelId];
      if (held !== undefined && held >= delta) return prev;
      const next = { ...prev, [levelId]: delta };
      writeLevelLog(next);
      return next;
    });
  }, [phase, levelId, ticker]);

  // ----------------------------------------------------------- the viewport
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const phone = vp.w < 700;

  // The keycap hint only earns its place where a keyboard is likely: a wide
  // viewport driven by a mouse. A touch screen keeps the clean button, and a
  // laptop that narrows into the phone layout gives it up with the width.
  const [finePointer, setFinePointer] = useState(
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const on = () => setFinePointer(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const desktop = !phone && finePointer;

  const rowRef = useRef<HTMLDivElement | null>(null);
  const row = useBox(rowRef, phase);
  const rowW = row.w;
  // the batch stack and the market review both need real pixels for their
  // shrunken charts
  const simsBoxRef = useRef<HTMLDivElement | null>(null);
  const simsBox = useBox(simsBoxRef, phase);
  const marketsBoxRef = useRef<HTMLDivElement | null>(null);
  const marketsBox = useBox(marketsBoxRef, phase);

  // ------------------------------------------------------------- the facts
  const shares = run.holdings[ticker] ?? 0;
  const inMarket = shares > 0;
  const livePrice = priceAt(run, ticker);
  const value = shares * livePrice;
  const worth = worthOf(run);
  const dead = isDead(run, ticker);
  const series = run.prices[ticker];
  const months = run.months;
  const trades: ChartTrade[] = run.trades.map((tr) => ({ at: tr.at, price: tr.price, side: tr.kind }));

  const pad = phone ? 14 : 24;
  const meterW = phone ? 44 : 72;
  // the chart row takes whatever the rest of the column leaves it, so the
  // layout fills both viewports rather than stranding space above the button
  const chartH = Math.max(40, Math.round(row.h));
  const chartW = Math.max(40, rowW - meterW - 8);

  const feedItem: FeedItem | null = shown
    ? { id: shown.id, text: shown.text, real: shown.real, source: shown.source, date: shown.date }
    : null;

  const shell = (children: ReactNode, scroll: boolean) => (
    <div
      data-trigger="root"
      data-phase={phase}
      data-menu={menu}
      data-level={levelId ?? ""}
      data-era={deal.era}
      data-stock={ticker}
      data-seed={deal.seed}
      data-turbo={turbo}
      data-month={monthAt(run)}
      data-t={run.t.toFixed(4)}
      data-position={inMarket ? "in" : "out"}
      data-shares={shares}
      data-price={livePrice.toFixed(6)}
      data-value={value.toFixed(6)}
      data-cash={run.cash.toFixed(6)}
      data-worth={worth.toFixed(6)}
      style={{
        height: vp.h, width: "100%", background: BG, color: TEXT,
        fontFamily: UI_FONT, overflowY: scroll ? "auto" : "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {children}
    </div>
  );

  // ------------------------------------------------------------- deal card
  // Four screens share one dealt header. The flow: the card opens on free
  // play or levels; free play asks who plays, you or a bot; levels offer
  // Start (the next unplayed level) or the list. A level names its player,
  // shows its code when the player is a bot, and the end card's numbers are
  // the only commentary the ladder ever makes.
  if (phase === "deal") {
    const lvl = levelId !== null ? levelById(levelId) : null;
    const nextId = LEVELS.find((l) => levelLog[l.id] === undefined)?.id ?? 1;
    const wide = (menu === "free" && freeMode === "bot")
      || (menu === "level" && lvl !== null && lvl.player !== "you");

    const back = (to: Menu) => (
      <button
        data-back=""
        onClick={() => { setMenu(to); setSidebarOpen(false); }}
        style={{
          marginTop: 18, background: "transparent", border: "none",
          color: MUTED, fontSize: 14, fontFamily: UI_FONT, cursor: "pointer",
        }}
      >
        back
      </button>
    );

    const startButton = (label: string, level: Level | null, mt: number) => (
      <button
        data-start=""
        onClick={() => start(level)}
        style={{
          marginTop: mt, width: "100%", height: 60, borderRadius: 16, border: "none",
          background: UP, color: "#0C0F14", fontSize: 20, fontWeight: 600,
          fontFamily: UI_FONT, cursor: "pointer",
        }}
      >
        {label}
      </button>
    );

    const editorBlock = (
      <div style={{ textAlign: "left" }}>
        <p style={{ fontSize: 14, color: MUTED, marginTop: 14, lineHeight: 1.45 }}>
          A shelf of example bots; the last line picks the player. It is
          called on every tick of the tape, seeing the same prices you
          would, and answers with an action. Break a rule and the run
          stops.
        </p>
        <CodeEditor
          value={botSource}
          onChange={(next) => { setBotSource(next); setCompileError(null); }}
          height={300}
        />
        {compileError !== null && (
          <div data-bot-compile-error="" style={{ fontSize: 13, color: DOWN, marginTop: 8, lineHeight: 1.4 }}>
            {compileError}
          </div>
        )}
      </div>
    );

    // The collapsible sidebar, once a branch is chosen: every level with its
    // played state and dollars, a rule, and Free play under it. It is the
    // level selection; there is no separate screen for it.
    const goTo = (id: number | null) => {
      if (id === null) {
        setLevelId(null);
        setMenu("free");
      } else {
        setLevelId(id);
        setMenu("level");
      }
      setSidebarOpen(false);
    };

    const sideRow = (
      key: string, label: string, active: boolean, score: number | undefined,
      attrs: Record<string, string>, onClick: () => void,
    ) => (
      <button
        key={key}
        {...attrs}
        aria-current={active}
        onClick={onClick}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          gap: 8, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none",
          background: active ? "rgba(215,222,232,0.10)" : "transparent",
          color: TEXT, fontSize: 14, fontWeight: 600, fontFamily: UI_FONT,
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ flex: "1 1 auto" }}>{label}</span>
        {score !== undefined && (
          <span style={{
            flex: "0 0 auto", fontSize: 12, fontWeight: 400, whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums", color: score >= 0 ? UP : DOWN,
          }}>
            {signedMoney(score)}
          </span>
        )}
      </button>
    );

    const sidebar = menu !== "top" && (
      <>
        <button
          data-sidebar-toggle=""
          aria-label="level select"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((o) => !o)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 60,
            width: 36, height: 36, borderRadius: 10,
            border: "1px solid rgba(215,222,232,0.22)",
            background: PANEL, color: TEXT, fontSize: 16,
            fontFamily: UI_FONT, cursor: "pointer",
          }}
        >
          {sidebarOpen ? "×" : "☰"}
        </button>
        {sidebarOpen && (
          <>
            <div
              data-sidebar-backdrop=""
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)" }}
            />
            <div
              data-sidebar=""
              style={{
                position: "fixed", top: 0, bottom: 0, left: 0, width: 300, zIndex: 50,
                background: PANEL, borderRight: "1px solid rgba(215,222,232,0.14)",
                padding: "58px 12px 16px", overflowY: "auto", textAlign: "left",
              }}
            >
              {LEVELS.map((l) => sideRow(
                `lvl${l.id}`,
                `${l.id}. ${l.title}`,
                menu === "level" && levelId === l.id,
                levelLog[l.id],
                { "data-level-row": "", "data-level-id": String(l.id) },
                () => goTo(l.id),
              ))}
              <div style={{ height: 1, background: "rgba(215,222,232,0.18)", margin: "12px 2px" }} />
              {sideRow("free", "Free play", menu === "free", undefined, { "data-free-row": "" }, () => goTo(null))}
            </div>
          </>
        )}
      </>
    );

    // The bot primer, once ever: the inputs fed through the bot as a stepped
    // diagram, read before the first Run bot anywhere does anything. It ends
    // back on this card, code in view, Run bot armed.
    const botPrimer = botGuide && (
      <BotPrimer
        desktop={desktop}
        onSee={() => {
          markGuide(GUIDE_BOT_KEY);
          setBotGuide(false);
        }}
        onClose={() => setBotGuide(false)}
      />
    );

    return shell(
      <>
        {sidebar}
        {botPrimer}
        <div style={{
          minHeight: vp.h, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: pad, textAlign: "center",
        }}>
        <div style={{ maxWidth: wide ? 640 : 460, width: "100%" }}>
          <div style={{ fontSize: 15, color: MUTED }}>{ERA_NAME[deal.era]}</div>
          <h1 style={{
            fontSize: phone ? 34 : 46, fontWeight: 700, margin: "8px 0 0",
            letterSpacing: "-0.02em", lineHeight: 1.1,
          }}>
            {companyName(ticker)}
          </h1>
          <div style={{ fontSize: 18, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
            {longMonth(deal.startMonth)}
          </div>
          <p style={{ fontSize: 15, color: MUTED, marginTop: 14, lineHeight: 1.45 }}>
            {ERA_MOOD[deal.era]}
          </p>

          {menu === "top" && (
            <>
              <p data-pitch="" style={{ fontSize: 16, color: TEXT, marginTop: 14, lineHeight: 1.45 }}>
                One stock, one minute. Beat the person who did nothing.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
                <button
                  data-go-levels=""
                  onClick={() => { setLevelId(nextId); setMenu("level"); }}
                  style={{
                    width: "100%", height: 60, borderRadius: 16, border: "none",
                    background: UP, color: "#0C0F14", fontSize: 20, fontWeight: 600,
                    fontFamily: UI_FONT, cursor: "pointer",
                  }}
                >
                  Levels
                </button>
                <button
                  data-go-free=""
                  onClick={() => { setMenu("free"); setLevelId(null); }}
                  style={{
                    width: "100%", height: 60, borderRadius: 16,
                    border: "1px solid rgba(215,222,232,0.28)",
                    background: "transparent", color: TEXT, fontSize: 20, fontWeight: 600,
                    fontFamily: UI_FONT, cursor: "pointer",
                  }}
                >
                  Free play
                </button>
              </div>
            </>
          )}

          {menu === "free" && (
            <>
              <p data-pitch="" style={{ fontSize: 16, color: TEXT, marginTop: 14, lineHeight: 1.45 }}>
                One stock, one minute. Beat the person who did nothing.
              </p>
              <div style={{ fontSize: 15, color: MUTED, marginTop: 18 }}>
                You start with {money(START_CASH)} in cash.
              </div>
              {/* who plays: the space bar or a function you write */}
              <div data-mode-row="" style={{ display: "flex", gap: 8, marginTop: 22 }}>
                {(["you", "bot"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    data-mode={m}
                    aria-pressed={freeMode === m}
                    onClick={() => { setFreeMode(m); setCompileError(null); }}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, cursor: "pointer",
                      border: freeMode === m ? `1px solid rgba(215,222,232,0.45)` : "1px solid rgba(215,222,232,0.16)",
                      background: freeMode === m ? PANEL : "transparent",
                      color: freeMode === m ? TEXT : MUTED,
                      fontSize: 15, fontWeight: 600, fontFamily: UI_FONT,
                    }}
                  >
                    {m === "you" ? "You play" : "A bot plays"}
                  </button>
                ))}
              </div>
              {freeMode === "bot" && editorBlock}
              {startButton(freeMode === "bot" ? "Run bot" : "Play", null, freeMode === "bot" ? 16 : 26)}
              {best !== null && (
                <div data-best="" style={{ fontSize: 13, color: MUTED, marginTop: 14 }}>
                  best so far: {signedMoney(best)} over doing nothing
                </div>
              )}
              {back("top")}
            </>
          )}

          {menu === "level" && lvl !== null && (
            <>
              <div style={{ fontSize: 14, color: MUTED, marginTop: 18 }}>
                level {lvl.id} of {LEVELS.length}
              </div>
              <div style={{ fontSize: phone ? 22 : 26, fontWeight: 700, marginTop: 4 }}>
                {lvl.title}
              </div>
              <p style={{ fontSize: 15, color: TEXT, marginTop: 8, lineHeight: 1.45 }}>
                {lvl.line}
              </p>
              {lvl.player !== "you" && lvl.player !== "editor" && (
                <div style={{ textAlign: "left" }}>
                  {/* sized to the bot: a six line bot gets a six line panel */}
                  <CodeEditor
                    value={levelSource(lvl.player)}
                    onChange={() => {}}
                    height={Math.min(300, 20 + levelSource(lvl.player).trimEnd().split("\n").length * 19.5)}
                    readOnly
                  />
                </div>
              )}
              {lvl.player === "editor" && editorBlock}
              <div style={{ fontSize: 15, color: MUTED, marginTop: 14 }}>
                {lvl.player === "you" ? "You start" : "It starts"} with {money(START_CASH)} in cash.
              </div>
              {startButton(lvl.player === "you" ? "Play" : "Run bot", lvl, 16)}
              {levelLog[lvl.id] !== undefined && (
                <div data-best="" style={{ fontSize: 13, color: MUTED, marginTop: 14 }}>
                  best on this level: {signedMoney(levelLog[lvl.id])} over doing nothing
                </div>
              )}
              {back("top")}
            </>
          )}
          </div>
        </div>
      </>,
      true,
    );
  }

  // ------------------------------------------------------------ stopped bot
  // A wrong action froze the tape. This card is the verdict, not an end card:
  // an early stop has no honest final worth to compare against the baselines,
  // so it shows where the run stood and sends the author back to the editor.
  if (phase === "error" && botStop !== null) {
    return shell(
      <div style={{
        minHeight: vp.h, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: pad, textAlign: "center",
      }}>
        <div data-bot-error={botStop.message} style={{ maxWidth: 560, width: "100%" }}>
          <div style={{ fontSize: 15, color: MUTED }}>
            {companyName(ticker)}, {ERA_NAME[deal.era]}
          </div>
          <h1 style={{
            fontSize: phone ? 30 : 40, fontWeight: 700, margin: "8px 0 0",
            letterSpacing: "-0.02em", lineHeight: 1.1,
          }}>
            The bot broke a rule
          </h1>
          <div style={{ fontSize: 18, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
            {longMonth(botStop.month)}
          </div>
          <p data-bot-error-message="" style={{ fontSize: 16, color: DOWN, marginTop: 14, lineHeight: 1.5 }}>
            {botStop.message}.
          </p>
          <div style={{ fontSize: 15, color: MUTED, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
            The run stopped with the account worth {money(worthOf(run))}.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
            <button
              data-edit-bot=""
              onClick={() => setPhase("deal")}
              style={{
                flex: 1, height: 56, borderRadius: 14, border: "none", background: UP,
                color: "#0C0F14", fontSize: 18, fontWeight: 600, fontFamily: UI_FONT, cursor: "pointer",
              }}
            >
              Edit bot
            </button>
            <button
              data-again=""
              onClick={() => begin(dealRandom())}
              style={{
                flex: 1, height: 56, borderRadius: 14, border: `1px solid rgba(215,222,232,0.28)`,
                background: "transparent", color: TEXT, fontSize: 18, fontWeight: 600,
                fontFamily: UI_FONT, cursor: "pointer",
              }}
            >
              Play again
            </button>
          </div>
        </div>
      </div>,
      true,
    );
  }

  // -------------------------------------------------------------- the batch
  // Ten shrunken markets in one column, live and in parallel: who and where,
  // the running delta against just holding, the chart with its trade dots,
  // and the latest headline. The bot panel appears once, under the stack.
  if (phase === "sims") {
    const gaps = 6 * Math.max(0, simsView.length - 1);
    const rowH = Math.max(40, Math.floor((simsBox.h - gaps) / Math.max(1, simsView.length)));
    return shell(
      <div style={{
        height: vp.h, display: "flex", flexDirection: "column", padding: pad, gap: 10,
        maxWidth: 1080, margin: "0 auto",
        paddingBottom: `calc(${phone ? 24 : pad}px + env(safe-area-inset-bottom, 0px))`,
      }}>
        <div
          ref={simsBoxRef}
          data-sims=""
          style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
        >
          {simsView.map((sim, i) => (
            <SimRow key={i} sim={sim} width={Math.max(120, simsBox.w)} height={rowH} phone={phone} />
          ))}
        </div>
        <BotTrading fontSize={phone ? 16 : 18} phone={phone} pad={pad} source={botSourceRef.current} />
      </div>,
      false,
    );
  }

  // ---------------------------------------------------------- market review
  // Every finished batch market, one slice each, scrolling off the screen
  // once there are more than fit.
  if (phase === "markets") {
    const rowH = phone ? 68 : 84;
    return shell(
      <div style={{
        height: vp.h, display: "flex", flexDirection: "column", padding: pad, gap: 10,
        maxWidth: 1080, margin: "0 auto",
        paddingBottom: `calc(${phone ? 24 : pad}px + env(safe-area-inset-bottom, 0px))`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: phone ? 16 : 19, fontWeight: 600 }}>
            {markets.length} {markets.length === 1 ? "market" : "markets"}
          </span>
          <button
            data-back=""
            onClick={() => setPhase("summary")}
            style={{
              background: "transparent", border: "none", color: MUTED,
              fontSize: 14, fontFamily: UI_FONT, cursor: "pointer",
            }}
          >
            back
          </button>
        </div>
        <div
          ref={marketsBoxRef}
          data-markets=""
          style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}
        >
          {markets.map((sim, i) => (
            <div key={i} style={{ flex: "0 0 auto" }}>
              <SimRow sim={sim} width={Math.max(120, marketsBox.w - 12)} height={rowH} phone={phone} />
            </div>
          ))}
        </div>
      </div>,
      false,
    );
  }

  // ------------------------------------------------------------ batch summary
  // The batch's verdictless verdict: where the bot played, what each run
  // earned over doing nothing, and one counted fact. The reader does the rest.
  if (phase === "summary") {
    const lvl = levelId !== null ? levelById(levelId) : null;
    const nextLvl = lvl !== null ? levelById(lvl.id + 1) : null;
    const beat = simResults.filter((r) => r.error === null && r.delta > 0).length;
    const toNext = () => {
      begin(dealRandom());
      if (lvl === null) return;
      if (nextLvl !== null) {
        setLevelId(nextLvl.id);
        setMenu("level");
      } else {
        setMenu("level");
        setSidebarOpen(true);
      }
    };
    return shell(
      <div style={{
        minHeight: vp.h, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: pad, textAlign: "center",
      }}>
        <div data-sim-summary="" style={{ maxWidth: 560, width: "100%" }}>
          <div style={{ fontSize: 15, color: MUTED }}>
            {lvl !== null ? `level ${lvl.id}, ${lvl.title}` : "the batch"}
          </div>
          <h1 style={{
            fontSize: phone ? 30 : 40, fontWeight: 700, margin: "8px 0 0",
            letterSpacing: "-0.02em", lineHeight: 1.1,
          }}>
            One bot, {simResults.length} markets
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 18, textAlign: "left" }}>
            {simResults.map((r, i) => (
              <div
                key={i}
                data-sim-row=""
                style={{
                  display: "flex", justifyContent: "space-between", gap: 10,
                  borderTop: "1px solid rgba(215,222,232,0.10)", paddingTop: 6, fontSize: 14,
                }}
              >
                <span>{companyName(r.ticker)}, {ERA_NAME[r.era]}, {yearOf(r.month)}</span>
                {r.error === null ? (
                  <span style={{ color: r.delta >= 0 ? UP : DOWN, fontVariantNumeric: "tabular-nums" }}>
                    {signedMoney(r.delta)}
                  </span>
                ) : (
                  <span style={{ color: DOWN }}>broke a rule</span>
                )}
              </div>
            ))}
          </div>
          <div data-sim-beat="" style={{ fontSize: 15, color: TEXT, marginTop: 16 }}>
            It beat doing nothing in {beat} of {simResults.length} markets.
          </div>
          <div style={{ display: "flex", flexDirection: phone ? "column" : "row", gap: 10, marginTop: 22 }}>
            <button
              data-view-markets=""
              onClick={() => setPhase("markets")}
              style={{
                flex: 1, height: 56, borderRadius: 14, border: `1px solid rgba(215,222,232,0.28)`,
                background: "transparent", color: TEXT, fontSize: 17, fontWeight: 600,
                fontFamily: UI_FONT, cursor: "pointer",
              }}
            >
              View markets
            </button>
            <button
              {...(lvl !== null && nextLvl !== null ? { "data-next-level": "" } : {})}
              onClick={toNext}
              style={{
                flex: 1, height: 56, borderRadius: 14, border: "none", background: UP,
                color: "#0C0F14", fontSize: 17, fontWeight: 600, fontFamily: UI_FONT, cursor: "pointer",
              }}
            >
              {lvl !== null ? (nextLvl !== null ? "Next level" : "Level select") : "Play again"}
            </button>
            <button
              data-sim-batch=""
              onClick={() => startBatch(false)}
              style={{
                flex: 1, height: 56, borderRadius: 14, border: `1px solid rgba(215,222,232,0.28)`,
                background: "transparent", color: TEXT, fontSize: 17, fontWeight: 600,
                fontFamily: UI_FONT, cursor: "pointer",
              }}
            >
              Run {SIM_COUNT} more
            </button>
          </div>
        </div>
      </div>,
      true,
    );
  }

  // -------------------------------------------------------------- end card
  // In a level the buttons walk the ladder. A bot level leads with the batch,
  // the human level leads with the next level, and free play keeps its pair.
  if (phase === "end") {
    const lvl = levelId !== null ? levelById(levelId) : null;
    const nextLvl = lvl !== null ? levelById(lvl.id + 1) : null;
    const botLevel = lvl !== null && lvl.player !== "you";
    const toNext = () => {
      begin(dealRandom());
      if (lvl === null) return;
      if (nextLvl !== null) {
        setLevelId(nextLvl.id);
        setMenu("level");
      } else {
        // the top of the ladder: back to its own card with the sidebar
        // open, which is the level select
        setMenu("level");
        setSidebarOpen(true);
      }
    };
    const nextLabel = nextLvl !== null ? "Next level" : "Level select";
    return shell(
      <EndCard
        run={run}
        ticker={ticker}
        deal={deal}
        sample={sample}
        player={mode === "bot" ? "Bot" : "You"}
        phone={phone}
        pad={pad}
        vpH={vp.h}
        primaryLabel={lvl === null ? "Play again" : botLevel ? `Run ${SIM_COUNT} markets` : nextLabel}
        nextLevel={lvl !== null && !botLevel && nextLvl !== null}
        simBatch={botLevel}
        onPrimary={lvl === null ? () => begin(dealRandom()) : botLevel ? () => startBatch(true) : toNext}
        secondaryLabel={lvl === null ? "Same stock" : botLevel ? nextLabel : "Replay level"}
        secondaryNext={botLevel && nextLvl !== null}
        onSecondary={
          lvl === null
            ? () => begin({ ...deal, seed: randomSeed() })
            : botLevel
              ? toNext
              : () => { begin(dealRandom()); setMenu("level"); }
        }
      />,
      false,
    );
  }

  // --------------------------------------------------------------- the run
  // The space bar trades whole shares; a bot trades floats, and its share
  // count keeps two decimals rather than pretending to be round.
  const sharesLabel = Number.isInteger(shares) ? String(shares) : shares.toFixed(2);
  const calcLine = `${sharesLabel} ${shares === 1 ? "share" : "shares"} x ${fmtPrice(livePrice)} = ${money(value)}`;
  const cashLine = `cash ${money(run.cash)}`;
  const bigLine = inMarket ? calcLine : cashLine;

  // The calculator is the hero, so it is sized first, from a real measurement
  // of the real line, and everything else on the run screen is then held below
  // it. The big line gets the whole width; only the small line under it shares
  // a row with the corner spark.
  const sparkW = phone ? 86 : 120;
  const sparkH = phone ? 26 : 32;
  const bigBase = phone ? 32 : 46;
  const full = Math.max(180, rowW);
  const bigRoom = inMarket ? full : full - sparkW - 12;
  const bigSize = fitFontSize(bigLine, bigRoom, bigBase, 18);
  // nothing else on this screen may reach the calculator, and nothing may
  // fall under the twelve pixel floor
  const under = (base: number) => Math.max(12, Math.min(base, bigSize - 2));
  const smallSize = under(phone ? 15 : 17);
  const buttonSize = Math.max(14, Math.min(phone ? 22 : 24, bigSize - 3));

  // The calculator swaps which of its two lines is the big one, so its natural
  // height changes with the position. That would move the chart row, which
  // would resize the meter, which would move the one dollar ruler, and a trade
  // is never allowed to do that. The block is given the height of its tallest
  // possible state and its content sits at the bottom of it, so nothing below
  // the chart ever moves once a run has started.
  const sparkRowH = Math.ceil(under(12) * 1.25) + 3 + sparkH;
  const calcH = Math.ceil(bigBase * 1.15) + 4 + sparkRowH;
  const deadH = Math.ceil(under(13) * 1.4) + 8;

  // The first-run walkthrough, over the paused tape: one small card per
  // step, each placed beside the thing it names. The layout is static while
  // the guide holds the clock, so the card can measure the screen once per
  // step and sit exactly where it points.
  const guideCard = guide !== null && (
    <GuideCard
      step={GUIDE_STEPS[guide]}
      index={guide}
      total={GUIDE_STEPS.length}
      desktop={desktop}
      pad={pad}
      onNext={advanceGuide}
    />
  );

  return shell(
    <>
    {guideCard}
    <div style={{
      height: vp.h, display: "flex", flexDirection: "column", padding: pad, gap: phone ? 10 : 14,
      maxWidth: 1080, margin: "0 auto",
      // the button is the thing a thumb reaches for, so it keeps clear of the
      // phone's home indicator
      paddingBottom: `calc(${phone ? 24 : pad}px + env(safe-area-inset-bottom, 0px))`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: under(phone ? 16 : 19), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {longMonth(monthAt(run))}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: under(phone ? 14 : 16), color: MUTED }}>{ERA_NAME[deal.era]}</span>
          {/* one way per run, and drawn as the remote's fast forward */}
          {!fast && (
            <button
              data-skip=""
              aria-label="skip to end"
              onClick={() => { fastRef.current = SKIP_SPEED; setFast(true); }}
              style={{
                display: "flex", alignItems: "center", padding: "6px 9px", borderRadius: 8,
                border: "1px solid rgba(215,222,232,0.28)", background: "transparent",
                color: MUTED, cursor: "pointer",
              }}
            >
              <svg width="20" height="11" viewBox="0 0 20 11" aria-hidden="true">
                <path d="M0 0 L7.5 5.5 L0 11 Z" fill="currentColor" />
                <path d="M8.5 0 L16 5.5 L8.5 11 Z" fill="currentColor" />
                <rect x="17.6" y="0" width="2.4" height="11" fill="currentColor" />
              </svg>
            </button>
          )}
        </span>
      </div>

      <div ref={rowRef} style={{ display: "flex", gap: 8, alignItems: "stretch", flex: "1 1 auto", minHeight: 0 }}>
        <div data-chart-panel="" style={{ background: PANEL, borderRadius: 12, overflow: "hidden" }}>
          <Chart
            series={series}
            months={months}
            t={run.t}
            livePrice={livePrice}
            width={chartW}
            height={chartH}
            trades={trades}
            background={PANEL}
          />
        </div>
        <div data-meter-panel="" style={{ background: PANEL, borderRadius: 12, overflow: "hidden", width: meterW }}>
          <Meter
            shares={shares}
            price={livePrice}
            cash={run.cash}
            startWorth={START_CASH}
            width={meterW}
            height={chartH}
          />
        </div>
      </div>

      <Feed item={feedItem} height={phone ? 84 : 80} maxSize={under(19)} />

      <div
        data-calc=""
        data-calc-size={bigSize}
        style={{ height: calcH, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      >
        <div style={{
          fontSize: inMarket ? bigSize : smallSize,
          fontWeight: inMarket ? 700 : 400,
          color: inMarket ? TEXT : MUTED,
          opacity: inMarket ? 1 : 0.7,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.15,
          whiteSpace: "nowrap",
        }}>
          {calcLine}
        </div>
        <div style={{
          marginTop: 4, display: "flex", alignItems: "flex-end",
          justifyContent: "space-between", gap: 12,
        }}>
          <div style={{
            fontSize: inMarket ? smallSize : bigSize,
            fontWeight: inMarket ? 400 : 700,
            color: inMarket ? MUTED : TEXT,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.15,
            whiteSpace: "nowrap",
          }}>
            {cashLine}
          </div>
          <Spark values={history} width={sparkW} height={sparkH} labelSize={under(12)} />
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        {/* reserved whether or not the company is dead, so the news of it
            cannot move the chart row and with it the dollar ruler */}
        <div style={{ height: deadH, fontSize: under(13), color: MUTED, paddingBottom: 8, textAlign: "center" }}>
          {dead ? "The company went to zero." : ""}
        </div>
        {mode === "bot" ? (
          <BotTrading fontSize={buttonSize} phone={phone} pad={pad} source={botSourceRef.current} />
        ) : (
          <button
            data-action=""
            data-position={inMarket ? "in" : "out"}
            onClick={toggle}
            disabled={!inMarket && !canBuy(run, ticker)}
            style={{
              width: "100%", height: phone ? 64 : 72, borderRadius: 16, border: "none",
              background: inMarket ? DOWN : UP,
              color: inMarket ? "#FFFFFF" : "#0C0F14",
              opacity: !inMarket && !canBuy(run, ticker) ? 0.45 : 1,
              fontSize: buttonSize, fontWeight: 600, fontFamily: UI_FONT,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            }}
          >
            <span data-label="">{inMarket ? "Sell" : "Buy"}</span>
            {desktop && <Key label="space" />}
          </button>
        )}
      </div>
    </div>
    </>,
    false,
  );
}

// The size of a box, live. Both drawing surfaces are sized in real pixels
// rather than scaled, so nothing on them stretches and no label distorts.
function useBox(ref: MutableRefObject<HTMLDivElement | null>, dep: unknown) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setBox((prev) => (Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5
        ? prev
        : { w: r.width, h: r.height }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, dep]);
  return box;
}

// A keycap on the button, the command-bar hotkey convention: the key drawn
// as a small cap beside the action it fires. Colors ride on currentColor so
// one chip serves both the green Buy face and the red Sell face. Hidden from
// the accessibility tree; a screen reader should hear Buy, not Buy space.
function Key({ label }: { label: string }) {
  return (
    <span
      data-key-hint=""
      aria-hidden="true"
      style={{
        fontSize: 13, fontWeight: 600, lineHeight: 1,
        padding: "3px 8px 4px", borderRadius: 6,
        border: "1px solid currentColor", borderBottomWidth: 2,
        opacity: 0.65,
      }}
    >
      {label}
    </span>
  );
}

// The net worth line, in the corner, labeled, and never bigger than this.
function Spark(
  { values, width, height, labelSize = 12 }:
  { values: number[]; width: number; height: number; labelSize?: number },
) {
  const n = values.length;
  let lo = values[0];
  let hi = values[0];
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (hi - lo < 1e-6) hi = lo + 1;
  const x = (i: number) => (n < 2 ? 0 : (i / (n - 1)) * width);
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const rose = values[n - 1] >= values[0];
  return (
    <div data-spark="" style={{ flex: "0 0 auto", textAlign: "right", width }}>
      <div style={{ fontSize: labelSize, color: MUTED, marginBottom: 3 }}>net worth</div>
      <svg width={width} height={height} style={{ display: "block" }}>
        <path d={d} fill="none" stroke={rose ? UP : DOWN} strokeWidth={1.6}
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// One walkthrough card, placed beside its anchor: the chart, its x axis, its
// y axis near the starting price, the meter, or the action button. Fixed and
// measured from the live layout, which is static while the guide holds the
// clock. Next advances on click or on the guide key; the prompted trades
// have no Next, because the same key is the trade there.
function GuideCard(
  { step, index, total, desktop, pad, onNext }:
  { step: GuideStep; index: number; total: number; desktop: boolean; pad: number; onNext: () => void },
) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(320, vw - pad * 2);
      const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
      const chart = rect("[data-chart-panel]");
      const meter = rect("[data-meter-panel]");
      const button = rect("[data-action]");
      const clampX = (x: number) => Math.max(pad, Math.min(x, vw - w - pad));
      let s: CSSProperties = { left: clampX(vw / 2 - w / 2), top: vh * 0.3 };
      if (step.anchor === "chart" && chart !== null) {
        s = { left: clampX(chart.left + chart.width / 2 - w / 2), top: chart.top + chart.height * 0.3 };
      }
      if (step.anchor === "xaxis" && chart !== null) {
        // fully under the panel, so the year labels it names stay readable
        s = { left: clampX(chart.left + chart.width / 2 - w / 2), top: chart.bottom + 8 };
      }
      if (step.anchor === "yaxis" && chart !== null) {
        s = { left: clampX(chart.left + 16), top: chart.top + chart.height * 0.42 };
      }
      if (step.anchor === "meter" && meter !== null) {
        s = { left: clampX(meter.left - w - 12), top: meter.top + meter.height * 0.32 };
      }
      if (step.anchor === "button" && button !== null) {
        s = { left: clampX(button.left + button.width / 2 - w / 2), bottom: vh - button.top + 12 };
      }
      setStyle({ ...s, width: w });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [step, pad]);

  if (style === null) return null;
  return (
    <div
      data-guide-card=""
      data-step={index}
      data-anchor={step.anchor}
      style={{ position: "fixed", zIndex: 50, ...style }}
    >
      <div style={{
        background: PANEL, border: "1px solid rgba(215,222,232,0.3)", borderRadius: 12,
        padding: 14, textAlign: "left", boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
      }}>
        {step.title !== undefined && (
          <div style={{ fontSize: 15, fontWeight: 700 }}>{step.title}</div>
        )}
        {step.text !== undefined && (
          <p style={{
            fontSize: 14, color: TEXT, lineHeight: 1.5,
            margin: step.title !== undefined ? "6px 0 0" : 0,
          }}>
            {step.text}
          </p>
        )}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, marginTop: 10,
        }}>
          <span style={{ fontSize: 12, color: MUTED }}>{index + 1} of {total}</span>
          {step.action === "next" && (
            <button
              data-guide-next=""
              onClick={onNext}
              style={{
                height: 38, padding: "0 16px", borderRadius: 10, border: "none",
                background: UP, color: "#0C0F14", fontSize: 14, fontWeight: 600,
                fontFamily: UI_FONT, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              Next {desktop && <Key label={GUIDE_KEY.label} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// The bot primer, drawn rather than written: the three inputs as small
// panels, the prices an explicit array whose head wears the pointer, shares
// and cash echoing the meter's own slabs and ticks, arrows curving into a
// chip that is the bot, and the decision as a badge on its far side. The
// guide key steps the scripted ticks of BOT_PRIMER_CYCLES; it exits with
// See this bot, back to the card that holds the code.
function BotPrimer(
  { onSee, onClose, desktop }:
  { onSee: () => void; onClose: () => void; desktop: boolean },
) {
  const last = BOT_PRIMER_CYCLES.length + 1;
  const [frame, setFrame] = useState(0);
  const cycle = Math.max(0, frame - 2);
  const c = BOT_PRIMER_CYCLES[Math.min(cycle, BOT_PRIMER_CYCLES.length - 1)];
  const showBot = frame >= 1;
  const showOut = frame >= 2;
  const done = frame >= last;

  useGuideKey(true, () => setFrame((f) => Math.min(f + 1, last)));

  // the diagram's fixed geometry: input panels left, the chip centre, the
  // decision right, and the arrow layer drawn from the same numbers so the
  // pieces cannot drift apart; narrow screens pan the diagram instead of
  // shrinking its type
  const DW = 520;
  const DH = 256;
  const PANEL_W = 200;
  const ROWS = [
    { y: 0, h: 92, cy: 46 },
    { y: 104, h: 70, cy: 139 },
    { y: 186, h: 70, cy: 221 },
  ];
  const CHIP = { x: 300, y: 107, s: 64 };
  const chipCy = CHIP.y + CHIP.s / 2;
  const BADGE = { x: 404, y: 104, w: 116 };

  const panel = (
    key: string, row: { y: number; h: number }, label: string, body: ReactNode,
  ) => (
    <div
      key={key}
      style={{
        position: "absolute", left: 0, top: row.y, width: PANEL_W, height: row.h,
        background: "rgba(215,222,232,0.05)", border: "1px solid rgba(215,222,232,0.16)",
        borderRadius: 10, padding: "6px 10px",
      }}
    >
      <div style={{ fontSize: 12, color: MUTED }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>{body}</div>
    </div>
  );

  // frame 0's annotations sit to the right of the boxes, in the lane the
  // arrows will use once the bot appears
  const ANNOTATIONS = [
    "every price so far",
    "only changes if you buy or sell",
    "what you buy shares with and sell them for",
  ];

  const pricesBody = (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 4, paddingBottom: 18 }}>
      <span style={{ fontSize: 13, color: MUTED }}>[</span>
      {c.prices.map((p, i) => {
        const head = i === c.prices.length - 1;
        return (
          <span key={i} style={{ position: "relative", display: "inline-flex" }}>
            <span
              data-primer-price=""
              style={{
                padding: "3px 7px", borderRadius: 7, fontSize: 13,
                fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                border: head ? `1px solid ${UP}` : "1px solid rgba(215,222,232,0.28)",
                color: head ? UP : TEXT,
              }}
            >
              ${p}
            </span>
            {head && (
              // anchored so the arrow's own centre sits under the chip's
              // centre, the caption trailing off to the right
              <span
                data-primer-head=""
                style={{
                  position: "absolute", top: "100%", left: "50%",
                  transform: "translateX(-6px)", marginTop: 2,
                  fontSize: 12, color: UP, whiteSpace: "nowrap",
                }}
              >
                {"\u25b2"} current price
              </span>
            )}
          </span>
        );
      })}
      <span style={{ fontSize: 13, color: MUTED }}>]</span>
    </div>
  );

  const outColor = c.out > 0 ? UP : c.out < 0 ? DOWN : MUTED;
  const blurb = frame === 0
    ? "These are the three things your bot will be handed."
    : frame === 1
      ? "This is your bot. It sees these inputs and makes a decision every time there is a new price."
      : frame === 2
        ? "Its first decision. Press Next to watch the bot at work."
        : done
          ? `In the game this runs ${TICKS_PER_MONTH} times a market month, the moment the price updates. The middle of the bot is any JavaScript.`
          : "";

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 65, background: "rgba(0,0,0,0.5)" }} />
      <div
        data-bot-guide=""
        data-primer-step={frame}
        style={{
          position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: "min(600px, calc(100vw - 32px))", zIndex: 70,
          background: PANEL, border: "1px solid rgba(215,222,232,0.25)",
          borderRadius: 16, padding: 20, textAlign: "left",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700 }}>Before your first bot run</div>

        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <div style={{ position: "relative", width: DW, height: DH }}>
            {showBot && (
              <svg
                aria-hidden="true"
                width={DW}
                height={DH}
                viewBox={`0 0 ${DW} ${DH}`}
                style={{ position: "absolute", inset: 0 }}
              >
                <defs>
                  <marker
                    id="primer-arrow" viewBox="0 0 8 8" refX="7" refY="4"
                    markerWidth="7" markerHeight="7" orient="auto-start-reverse"
                  >
                    <path d="M0 0 L8 4 L0 8 Z" fill="rgba(215,222,232,0.55)" />
                  </marker>
                </defs>
                <g stroke="rgba(215,222,232,0.4)" strokeWidth="1.5" fill="none">
                  <path d={`M${PANEL_W + 2} ${ROWS[0].cy} C 254 ${ROWS[0].cy}, 254 ${chipCy - 8}, ${CHIP.x - 6} ${chipCy - 8}`} markerEnd="url(#primer-arrow)" />
                  <path d={`M${PANEL_W + 2} ${ROWS[1].cy} L ${CHIP.x - 6} ${ROWS[1].cy}`} markerEnd="url(#primer-arrow)" />
                  <path d={`M${PANEL_W + 2} ${ROWS[2].cy} C 254 ${ROWS[2].cy}, 254 ${chipCy + 8}, ${CHIP.x - 6} ${chipCy + 8}`} markerEnd="url(#primer-arrow)" />
                  <path d={`M${CHIP.x + CHIP.s + 4} ${chipCy} L ${BADGE.x - 6} ${chipCy}`} markerEnd="url(#primer-arrow)" />
                </g>
              </svg>
            )}

            {panel("prices", ROWS[0], "prices", pricesBody)}
            {panel(
              "shares", ROWS[1], "shares",
              <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.shares}</span>,
            )}
            {panel(
              "cash", ROWS[2], "cash in wallet",
              <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(c.cash)}</span>,
            )}
            {frame === 0 && ROWS.map((row, i) => (
              <div
                key={`note${i}`}
                style={{
                  position: "absolute", left: PANEL_W + 16, top: row.y,
                  width: DW - PANEL_W - 16, height: row.h,
                  display: "flex", alignItems: "center",
                  fontSize: 13, color: MUTED, lineHeight: 1.35, textAlign: "left",
                }}
              >
                {ANNOTATIONS[i]}
              </div>
            ))}

            {showBot && (
              <div data-primer-bot="" style={{ position: "absolute", left: CHIP.x, top: CHIP.y, width: CHIP.s, textAlign: "center" }}>
                <svg width={CHIP.s} height={CHIP.s} viewBox="0 0 64 64" aria-hidden="true">
                  <g fill="rgba(215,222,232,0.45)">
                    {[20, 32, 44].map((p) => (
                      <g key={p}>
                        <rect x={p - 2} y={4} width={4} height={8} rx={1} />
                        <rect x={p - 2} y={52} width={4} height={8} rx={1} />
                        <rect x={4} y={p - 2} width={8} height={4} rx={1} />
                        <rect x={52} y={p - 2} width={8} height={4} rx={1} />
                      </g>
                    ))}
                  </g>
                  <rect x={12} y={12} width={40} height={40} rx={9} fill={PANEL} stroke="rgba(215,222,232,0.6)" strokeWidth={1.5} />
                  <rect x={24} y={24} width={16} height={16} rx={4} fill="none" stroke={UP} strokeWidth={1.5} />
                </svg>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>bot</div>
              </div>
            )}

            {showBot && (
              <div
                data-primer-out={showOut ? c.out : ""}
                style={{
                  position: "absolute", left: BADGE.x, top: BADGE.y, width: BADGE.w,
                  minHeight: 70, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 3,
                  borderRadius: 12, textAlign: "center",
                  border: showOut ? `1px solid ${outColor}` : "1px dashed rgba(215,222,232,0.3)",
                  color: showOut ? outColor : MUTED,
                }}
              >
                {showOut ? (
                  <>
                    <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
                      {c.out > 0 && <path d="M11 1 L20 12 L14 12 L14 17 L8 17 L8 12 L2 12 Z" fill={UP} />}
                      {c.out < 0 && <path d="M11 17 L2 6 L8 6 L8 1 L14 1 L14 6 L20 6 Z" fill={DOWN} />}
                      {c.out === 0 && <rect x="4" y="7" width="14" height="4" rx="2" fill={MUTED} />}
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {c.out > 0 ? `buy ${c.out}` : c.out < 0 ? `sell ${-c.out}` : "hold"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>{`{ buy: ${c.out} }`}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 600 }}>?</span>
                )}
              </div>
            )}
          </div>
        </div>

        {blurb !== "" && (
          <p style={{ fontSize: 14, color: TEXT, margin: "14px 0 0", lineHeight: 1.5 }}>{blurb}</p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
          <span style={{ fontSize: 12, color: MUTED }}>
            {showOut ? `tick ${cycle + 1} of ${BOT_PRIMER_CYCLES.length}` : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              data-back=""
              onClick={onClose}
              style={{
                background: "transparent", border: "none", color: MUTED,
                fontSize: 14, fontFamily: UI_FONT, cursor: "pointer",
              }}
            >
              back
            </button>
            {done ? (
              <button
                data-bot-see=""
                onClick={onSee}
                style={{
                  height: 44, padding: "0 24px", borderRadius: 12, border: "none",
                  background: UP, color: "#0C0F14", fontSize: 16, fontWeight: 600,
                  fontFamily: UI_FONT, cursor: "pointer",
                }}
              >
                See this bot
              </button>
            ) : (
              <button
                data-primer-next=""
                onClick={() => setFrame((f) => Math.min(f + 1, last))}
                style={{
                  height: 38, padding: "0 16px", borderRadius: 10, border: "none",
                  background: UP, color: "#0C0F14", fontSize: 14, fontWeight: 600,
                  fontFamily: UI_FONT, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                Next {desktop && <Key label={GUIDE_KEY.label} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// The bot's standing panel: same footprint as the action button so the layout
// above it never moves. The word bot shows and hides the running source, read
// only, in a fixed overlay so nothing in the layout can shift.
function BotTrading(
  { fontSize, phone, pad, source }:
  { fontSize: number; phone: boolean; pad: number; source: string },
) {
  const [show, setShow] = useState(false);
  return (
    <>
      <div
        data-bot-live=""
        style={{
          width: "100%", height: phone ? 64 : 72, borderRadius: 16, flex: "0 0 auto",
          border: "1px solid rgba(215,222,232,0.18)", background: PANEL,
          color: MUTED, fontSize, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <span>The&nbsp;</span>
        <button
          data-bot-word=""
          aria-expanded={show}
          onClick={() => setShow((v) => !v)}
          style={{
            background: "transparent", border: "none", padding: 0,
            color: TEXT, fontSize, fontWeight: 600,
            fontFamily: UI_FONT, cursor: "pointer",
            textDecoration: "underline", textDecorationStyle: "dotted",
            textUnderlineOffset: 4,
          }}
        >
          bot
        </button>
        <span>&nbsp;is trading</span>
      </div>
      {show && (
        <div
          data-bot-code-view=""
          style={{
            position: "fixed", left: pad, bottom: phone ? 108 : 130, zIndex: 50,
            width: `min(520px, calc(100vw - ${pad * 2}px))`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          }}
        >
          <CodeEditor
            value={source}
            onChange={() => {}}
            height={Math.min(phone ? 250 : 340, 20 + source.trimEnd().split("\n").length * 19.5)}
            readOnly
          />
        </div>
      )}
    </>
  );
}

// One market of the batch: the run screen shrunk to a strip. Who and where,
// the live delta against just holding so far, the growing chart with its
// trade dots, and the latest headline the tape has reached.
function SimRow(
  { sim, width, height, phone }:
  { sim: Sim; width: number; height: number; phone: boolean },
) {
  const ticker = sim.deal.ticker;
  const run = sim.run;
  const price = priceAt(run, ticker);
  // the holding baseline as it stands now, not at the end: the same whole
  // share rule the engine's baseline uses, priced at this instant
  const p = run.prices[ticker];
  const held = wholeShares(run.startCash, p[0]);
  const holdNow = run.startCash - held * p[0] + held * price;
  const delta = worthOf(run) - holdNow;
  const infoW = phone ? 92 : 150;
  const newsW = phone ? 0 : 210;
  const chartW = Math.max(40, width - infoW - newsW - (phone ? 8 : 16));
  const trades: ChartTrade[] = run.trades.map((tr) => ({ at: tr.at, price: tr.price, side: tr.kind }));
  let news = "";
  for (const item of sim.sample.items) {
    if (runIndexOf(run, item.monthIndex) > run.t) break;
    news = item.text;
  }
  return (
    <div data-sim-market="" style={{ display: "flex", gap: 8, alignItems: "stretch", height, minHeight: 0 }}>
      <div style={{
        width: infoW, flex: "0 0 auto", display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 2, textAlign: "left", minWidth: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {companyName(ticker)}
        </div>
        <div style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ERA_NAME[run.era]}
        </div>
        <div style={{
          fontSize: 12, fontVariantNumeric: "tabular-nums",
          color: sim.error !== null ? DOWN : delta >= 0 ? UP : DOWN,
        }}>
          {sim.error !== null ? "broke a rule" : signedMoney(delta)}
        </div>
      </div>
      <div style={{ flex: "1 1 auto", background: PANEL, borderRadius: 8, overflow: "hidden", minWidth: 0 }}>
        <Chart
          series={p}
          months={run.months}
          t={run.t}
          livePrice={price}
          width={chartW}
          height={height}
          trades={trades}
          chip={false}
          background={PANEL}
        />
      </div>
      {!phone && (
        <div style={{ width: newsW, flex: "0 0 auto", display: "flex", alignItems: "center", minWidth: 0 }}>
          <span style={{
            fontSize: 12, color: MUTED, lineHeight: 1.35, textAlign: "left",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {news}
          </span>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ end card

interface EndProps {
  run: RunState;
  ticker: string;
  deal: Deal;
  sample: HeadlineSample;
  player: "You" | "Bot";     // whose hand was on the trigger this run
  phone: boolean;
  pad: number;
  vpH: number;
  primaryLabel: string;      // Play again, Run 10 markets, or Next level
  secondaryLabel: string;    // Same stock, Next level, or Replay level
  nextLevel: boolean;        // marks the primary as the walk's data-next-level
  simBatch: boolean;         // marks the primary as the walk's data-sim-batch
  secondaryNext: boolean;    // marks the secondary as data-next-level instead
  onPrimary: () => void;
  onSecondary: () => void;
}

function EndCard({
  run, ticker, deal, sample, player, phone, pad, vpH,
  primaryLabel, secondaryLabel, nextLevel, simBatch, secondaryNext, onPrimary, onSecondary,
}: EndProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const rowW = useBox(rowRef, "end").w;
  const end = lastIndex(run);
  const you = worthAt(run, end);
  const base = baselines(run, ticker);
  const delta = you - base.holding;
  const list = decisionsOf(run, ticker);
  const best = bestDecision(list);
  const worst = worstDecision(list);
  const held = monthsInMarket(run, ticker);
  const total = end;
  const spans = spansOf(run);
  const dead = isDead(run, ticker, end);
  const trades: ChartTrade[] = run.trades.map((tr) => ({ at: tr.at, price: tr.price, side: tr.kind }));
  const chartH = Math.round(vpH * (phone ? 0.22 : 0.26));
  const chartW = Math.max(40, rowW);

  const stat = (text: string) => (
    <div style={{ fontSize: phone ? 13 : 14, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{text}</div>
  );

  return (
    <div
      data-end=""
      data-you={you.toFixed(4)}
      data-holding={base.holding.toFixed(4)}
      data-delta={delta.toFixed(4)}
      data-perfect={base.perfect.toFixed(4)}
      data-index={base.index.toFixed(4)}
      data-trade-count={run.trades.length}
      data-months-in={held.toFixed(3)}
      data-months-total={total}
      style={{
        // A forty five second game has to be replayable the second it ends, so
        // the card is a fixed column: items 1 to 5 in their order, the reveal
        // list as the one scrolling region, and the buttons on screen without
        // touching the scroll wheel.
        height: vpH, display: "flex", flexDirection: "column", gap: phone ? 10 : 14,
        padding: pad, maxWidth: 1080, margin: "0 auto", overflow: "hidden",
        paddingBottom: `calc(${phone ? 24 : pad}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div>
        <div style={{ fontSize: 15, color: MUTED }}>
          {companyName(ticker)}, {ERA_NAME[deal.era]}
        </div>
        <div style={{
          fontSize: phone ? 38 : 52, fontWeight: 700, letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums", marginTop: 4,
        }}>
          {player}: {money(you)}
        </div>
        {dead && (
          <div style={{ fontSize: 15, color: MUTED, marginTop: 4 }}>The company went to zero.</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: phone ? 24 : 30, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          Doing nothing: {money(base.holding)}
        </div>
        {/* the score, on its own line so it cannot read as part of the
            baseline above it, in the words the deal card already uses */}
        <div data-delta-line="" style={{
          fontSize: phone ? 17 : 20, fontWeight: 700, marginTop: 6,
          fontVariantNumeric: "tabular-nums", color: delta >= 0 ? UP : DOWN,
        }}>
          {signedMoney(delta)} over doing nothing
        </div>
      </div>

      <div ref={rowRef} style={{ background: PANEL, borderRadius: 12, overflow: "hidden", flex: "0 0 auto" }}>
        <Chart
          series={run.prices[ticker]}
          months={run.months}
          t={end}
          livePrice={run.prices[ticker][end]}
          width={chartW}
          height={chartH}
          trades={trades}
          spans={spans}
          chip={false}
          background={PANEL}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {stat(`${run.trades.length} ${run.trades.length === 1 ? "trade" : "trades"}`)}
        {stat(`${Math.round(held)} of ${total} months in the market`)}
        {best && worst
          ? stat(`best decision ${signedMoney(best.delta)}, worst ${signedMoney(worst.delta)}`)
          : stat("no decisions to judge")}
      </div>

      <div style={{ fontSize: 15, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
        Perfect timing: {money(base.perfect)}. Nobody trades like this.
      </div>

      <div
        data-reveal=""
        style={{
          display: "flex", flexDirection: "column", gap: 6,
          flex: "1 1 auto", minHeight: 48, overflowY: "auto", overflowX: "hidden",
        }}
      >
        {sample.items.map((item) => {
          const label = sample.labels[item.id];
          return (
            <div
              key={item.id}
              data-label={label}
              style={{ borderTop: "1px solid rgba(215,222,232,0.10)", paddingTop: 6 }}
            >
              {phone ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                      {item.month}
                    </span>
                    <span style={{ fontSize: 13, color: LABEL_COLOR[label] }}>{LABEL_COPY[label]}</span>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.3 }}>{item.text}</div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: MUTED, fontVariantNumeric: "tabular-nums", flex: "0 0 auto", width: 62 }}>
                    {item.month}
                  </span>
                  <span style={{ fontSize: 15, flex: "1 1 auto", lineHeight: 1.3 }}>{item.text}</span>
                  <span style={{ fontSize: 13, color: LABEL_COLOR[label], flex: "0 0 auto", width: 160, textAlign: "right" }}>
                    {LABEL_COPY[label]}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, flex: "0 0 auto" }}>
        <button
          data-again=""
          {...(nextLevel ? { "data-next-level": "" } : {})}
          {...(simBatch ? { "data-sim-batch": "" } : {})}
          onClick={onPrimary}
          style={{
            flex: 1, height: 56, borderRadius: 14, border: "none", background: UP,
            color: "#0C0F14", fontSize: 18, fontWeight: 600, fontFamily: UI_FONT, cursor: "pointer",
          }}
        >
          {primaryLabel}
        </button>
        <button
          data-same=""
          {...(secondaryNext ? { "data-next-level": "" } : {})}
          onClick={onSecondary}
          style={{
            flex: 1, height: 56, borderRadius: 14, border: `1px solid rgba(215,222,232,0.28)`,
            background: "transparent", color: TEXT, fontSize: 18, fontWeight: 600,
            fontFamily: UI_FONT, cursor: "pointer",
          }}
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
