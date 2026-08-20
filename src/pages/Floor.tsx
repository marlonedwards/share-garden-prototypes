// The Floor: the campaign. Five eras of real market history run as levels, one
// desk, one chart, a rail of the other stocks, headlines that lie, and money
// that carries from decade to decade.
//
// Contract: docs/floor-spec.md, on the shared engine in docs/tape-shared.md.
// This file is the shell the spec's file list asks for: level cards, the desk,
// the debrief and the campaign end. The parts that are their own thing live in
// src/components/floor/ and the campaign arithmetic lives in
// src/lib/floor/campaign.ts.
//
// The tape is the only clock. A frame advances the engine by the real seconds
// it burned; the React tree commits at about twenty a second, because a price
// that moves twenty times a second already looks continuous and the desk would
// rather spend the frames on being right than on being redrawn.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  EraId, RunState, Ticker,
  advanceTo, buy, eraMonths, eraTickers, isDead, lastIndex, maxShares,
  monthIndexOf, newRun, priceAt, sell, worthAt, worthOf,
} from "../lib/tape/engine";
import { HEADLINE_POOL } from "../data/headlinePool";
import { HeadlineSample, TruthLabel, sampleHeadlines } from "../lib/tape/headlines";
import {
  CAMPAIGN_START, GateRecord, LADDER, LedgerRow, Level, Phase, Progress,
  RunSave, SAVE_VERSION, STARS_POSSIBLE, STAR_NAMES, STAR_ORDER, StarId,
  biggestOf, campaignIndex, clearSave, compositeHolding, compositeIndex,
  countOf, isBroke, isListed, ledgerFinal, levelIndexOf, levelOf, money, nameOf, openingFocus,
  pct, price as fmtPrice,
  readBest, readMonth, readSave, realizedFrom, settleRun, signedMoney, starsFor, starsIn,
  writeBest, writeSave,
} from "../lib/floor/campaign";
import { AFTER_MONTHS, FloorGate, gatesFor } from "../lib/floor/gates";
// The chart is the Trigger team's generic tape chart, used as it is. Its props
// were built to take any monthly series, its axis resets on the series array it
// is handed (a focus switch hands it a different array, so the y range starts
// again for the new stock and only ever widens from there), and nothing in it
// knows which game is drawing. There was no reason to fork it.
import Chart from "../components/trigger/Chart";
import { UI_FONT } from "../lib/type";
import Desk, { DeskColumn, Pour, cashColumn } from "../components/floor/Desk";
import Gate from "../components/floor/Gate";
import Rail from "../components/floor/Rail";
import HeadlineTicker, { layout as tickerLayout } from "../components/floor/Ticker";

const BG = "#0C0F14";
const PANEL = "#1F2733";
const TEXT = "#E8EDF4";
const MUTED = "#8794A6";
const UP = "#4ADE80";
const DOWN = "#E5484D";

const COMMIT_MS = 50;
const SETTLE_MS = 1200;

// The desk is the spine of the game, so it gets a share of the window rather
// than a strip at the bottom of it. Everything else on the screen has a fixed
// height and the chart takes what is left, which is what keeps the trade
// buttons in the same place from the first frame to the last.
const HEADER_H = 26;
const CHART_TITLE_H = 30;
const TICKER_H = 30;
const RAIL_PHONE_H = 36;
const TRADE_BTN_H = 40;
const TRADE_ROW_H = TRADE_BTN_H;
const TRADE_ROW_H_PHONE = TRADE_BTN_H * 2 + 8;

const LABEL_COPY: Record<TruthLabel, string> = {
  signal: "told the truth",
  lie: "pointed the wrong way",
  noise: "meant nothing",
};

const LABEL_COLOR: Record<TruthLabel, string> = {
  signal: UP,
  lie: DOWN,
  noise: MUTED,
};

// The settle pour: dollars leave every column at the same time and land in
// cash. Eased out so the first half of the second carries most of the move.
function easeOut(p: number): number {
  const c = p < 0 ? 0 : p > 1 ? 1 : p;
  return 1 - Math.pow(1 - c, 3);
}

// --------------------------------------------------------------- small parts

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
      <span className="tnum" style={{ fontSize: 15, color: tone ?? TEXT, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Stars({ earned }: { earned: StarId[] }) {
  return (
    <div className="flex flex-wrap gap-2" data-stars={earned.join(",")}>
      {STAR_ORDER.map((id) => {
        const on = earned.includes(id);
        return (
          <span
            key={id}
            data-star={id}
            data-earned={on ? "1" : "0"}
            className="rounded-full px-3 py-1"
            style={{
              fontSize: 13,
              background: on ? "rgba(74,222,128,0.16)" : "rgba(135,148,166,0.10)",
              color: on ? UP : MUTED,
              border: `1px solid ${on ? "rgba(74,222,128,0.35)" : "rgba(135,148,166,0.22)"}`,
            }}
          >
            {STAR_NAMES[id]}
          </span>
        );
      })}
    </div>
  );
}

// The debrief's small worth chart: your line drawn, the two baselines as flat
// reference marks at the right edge, per docs/floor-spec.md section 4. Year
// labels along the bottom, because a chart without time labels is banned in
// this repo and this one covers a decade.
function WorthChart({ track, months, holding, index, width, height }: {
  track: number[]; months: string[]; holding: number; index: number; width: number; height: number;
}) {
  const padR = 96;
  const padB = 26;
  const plotW = Math.max(1, width - 10 - padR);
  const plotH = Math.max(1, height - 10 - padB);
  const values = track.length > 1 ? track : [track[0] ?? 0, track[0] ?? 0];
  const lo = Math.min(...values, holding, index) * 0.95;
  const hi = Math.max(...values, holding, index) * 1.05;
  const x = (i: number) => 10 + (i / Math.max(1, values.length - 1)) * plotW;
  const y = (v: number) => 10 + plotH - ((v - lo) / Math.max(hi - lo, 1e-9)) * plotH;
  const path = `M${values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("L")}`;

  // Every January inside the drawn window, thinned until the labels sit at
  // least 44px apart, and never fewer than the first and last year.
  const janus: number[] = [];
  for (let i = 0; i < values.length && i < months.length; i++) {
    if (i === 0 || months[i].endsWith("-01")) janus.push(i);
  }
  if (janus.length === 0) janus.push(0);
  let step = 1;
  while (step < janus.length && x(janus[Math.min(step, janus.length - 1)]) - x(janus[0]) < 54) step += 1;
  const ticks: number[] = [];
  for (let i = 0; i < janus.length; i += step) ticks.push(janus[i]);
  if (ticks.length < 2 && janus.length > 1) ticks.push(janus[janus.length - 1]);

  // The three right-edge values are the whole point of the chart, and a run
  // that finishes near a baseline used to draw two of them into one smear. So
  // the marks stay on their real values and the labels are laid out apart: sort
  // by height, push each one down to clear the one above it by LABEL_GAP, pull
  // the stack back up if it runs off the bottom, and draw a leader to the mark
  // for any label that had to move far enough to lose its line.
  const you = values[values.length - 1];
  const marks = [
    { key: "holding", v: holding, color: MUTED, dashed: true },
    { key: "index", v: index, color: "#93A7C6", dashed: true },
    { key: "you", v: you, color: TEXT, dashed: false },
  ].map((m) => ({ ...m, at: y(m.v), label: y(m.v) }));

  // A twelve pixel number sits in a fifteen pixel line box, so seventeen is one
  // line of type plus a sliver of air: touching is not colliding, but two
  // numbers with nothing between them still read as one.
  const LABEL_GAP = 17;
  const topStop = 8;
  const bottomStop = height - 8;
  const order = marks.slice().sort((a, b) => a.at - b.at);
  for (let i = 1; i < order.length; i++) {
    order[i].label = Math.max(order[i].label, order[i - 1].label + LABEL_GAP);
  }
  if (order[order.length - 1].label > bottomStop) {
    order[order.length - 1].label = bottomStop;
    for (let i = order.length - 2; i >= 0; i--) {
      order[i].label = Math.min(order[i].label, order[i + 1].label - LABEL_GAP);
    }
  }
  if (order[0].label < topStop) {
    order[0].label = topStop;
    for (let i = 1; i < order.length; i++) {
      order[i].label = Math.max(order[i].label, order[i - 1].label + LABEL_GAP);
    }
  }

  const dashEnd = 10 + plotW + 6;
  const textX = 10 + plotW + 12;
  return (
    <svg data-worth-chart width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", fontFamily: UI_FONT }}>
      <line x1={10} x2={10 + plotW} y1={10 + plotH} y2={10 + plotH} stroke="rgba(215,222,232,0.12)" strokeWidth={1} />
      {ticks.map((i) => (
        <g key={`yr${i}`} data-worth-year={months[i]?.slice(0, 4)}>
          <line x1={x(i)} x2={x(i)} y1={10} y2={10 + plotH} stroke="rgba(215,222,232,0.10)" strokeWidth={1} />
          <text
            x={x(i)} y={10 + plotH + 16} fill={MUTED} fontSize={12} className="tnum"
            textAnchor={i === 0 ? "start" : i >= values.length - 3 ? "end" : "middle"}
          >
            {months[i]?.slice(0, 4)}
          </text>
        </g>
      ))}
      {marks.filter((m) => m.dashed).map((m) => (
        <line
          key={`dash${m.key}`}
          x1={10 + plotW - 26} y1={m.at} x2={dashEnd} y2={m.at}
          stroke={m.color} strokeWidth={2} strokeDasharray="4 3"
        />
      ))}
      <path d={path} fill="none" stroke={TEXT} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(you)} r={3.5} fill={TEXT} />
      {marks.map((m) => (
        <g key={`label${m.key}`}>
          {Math.abs(m.label - m.at) > 2 && (
            <polyline
              points={`${m.dashed ? dashEnd : 10 + plotW + 3},${m.at.toFixed(1)} ${(dashEnd + 3).toFixed(1)},${m.at.toFixed(1)} ${(dashEnd + 5).toFixed(1)},${m.label.toFixed(1)} ${(textX - 2).toFixed(1)},${m.label.toFixed(1)}`}
              fill="none" stroke={m.color} strokeWidth={1} opacity={0.55}
            />
          )}
          <text data-worth-label={m.key} x={textX} y={m.label + 4} fill={m.color} fontSize={12} className="tnum">
            {money(m.v)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------- the run

interface Live {
  run: RunState;
  minWorth: number;
  fired: string[];
  track: number[];
  gates: GateRecord[];
}

function buildRun(era: EraId, startCash: number, speed: number): RunState {
  return newRun({ era, tickers: eraTickers(era), startCash, speed });
}

function readNumber(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default function Floor() {
  const [params] = useSearchParams();
  const pinnedEra = useMemo<EraId | null>(() => {
    const raw = params.get("era");
    return raw && LADDER.some((l) => l.era === raw) ? (raw as EraId) : null;
  }, [params]);
  // A test-only tape multiplier. It changes nothing but how many seconds the
  // walk has to sit through, and it is off unless the URL asks for it.
  const turbo = Math.min(120, readNumber(params, "turbo", 1));
  const beat = params.get("beat");
  const seedParam = params.get("seed");

  const [phone, setPhone] = useState(() => (typeof window === "undefined" ? false : window.innerWidth < 900));
  const [viewH, setViewH] = useState(() => (typeof window === "undefined" ? 950 : window.innerHeight));
  useEffect(() => {
    const onResize = () => {
      setPhone(window.innerWidth < 900);
      setViewH(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [phase, setPhase] = useState<Phase>("level");
  const [progress, setProgress] = useState<Progress>(() => ({
    v: SAVE_VERSION,
    seedBase: 1,
    levelIndex: 0,
    cash: CAMPAIGN_START,
    ledger: [],
    realized: [],
    pinned: null,
  }));
  const [live, setLive] = useState<Live | null>(null);
  const [focus, setFocus] = useState<Ticker>("");
  const [gate, setGate] = useState<FloorGate | null>(null);
  // The settle pour. `from` is where cash stood when Continue was pressed and
  // `to` is what the era settled to; the columns are drawn between the two for
  // SETTLE_MS while every position empties into cash at once.
  const [settle, setSettle] = useState<{ from: number; to: number; at: number } | null>(null);
  const [settleP, setSettleP] = useState(0);
  const [best, setBest] = useState(0);
  const [tick, setTick] = useState(0);
  const [booted, setBooted] = useState(false);
  const [conserved, setConserved] = useState(0);
  const [pour, setPour] = useState<Pour | null>(null);

  const liveRef = useRef<Live | null>(null);
  const phaseRef = useRef<Phase>("level");
  const scaleRef = useRef(0);
  const chartBox = useRef<HTMLDivElement | null>(null);
  const [chartW, setChartW] = useState(600);
  const [chartH, setChartH] = useState(320);

  liveRef.current = live;
  phaseRef.current = phase;

  // ----------------------------------------------------------------- booting

  const startEra = useCallback((prog: Progress, at: number, cash: number, jump: string | null) => {
    const level = LADDER[at];
    let run = buildRun(level.era, cash, level.speed);
    const gates = gatesFor(level.era);
    const fired: string[] = [];
    let openGate: FloorGate | null = null;
    let next: Phase = "run";

    if (jump === "gate" && gates.length > 0) {
      const first = gates[0];
      run = advanceTo(run, Math.max(0, monthIndexOf(level.era, first.month)));
      fired.push(first.id);
      openGate = first;
      next = "gate";
    } else if (jump === "debrief" || jump === "settle" || jump === "end") {
      run = advanceTo(run, lastIndex(run));
      for (const g of gates) fired.push(g.id);
      next = "debrief";
    }

    const track: number[] = [];
    for (let m = 0; m <= Math.floor(run.t); m++) track.push(worthAt(run, m));
    if (track.length === 0) track.push(worthOf(run));

    const built: Live = { run, minWorth: Math.min(...track), fired, track, gates: [] };
    scaleRef.current = 0;
    setLive(built);
    liveRef.current = built;
    // The crypto winter lists Bitcoin first and it costs ten thousand dollars a
    // coin, so opening on the data file's first name would open the desk on the
    // one asset a normal carry cannot touch. Open on what the money can buy.
    const opening = openingFocus(run, cash);
    focusRef.current = opening;
    setFocus(opening);
    setGate(openGate);
    setSettle(null);
    setSettleP(0);
    setProgress(prog);
    setPhase(next);
    phaseRef.current = next;
  }, []);

  useEffect(() => {
    setBest(readBest());
    const seedBase = seedParam !== null && Number.isFinite(Number(seedParam)) ? Number(seedParam) : Math.floor(Math.random() * 100000) + 1;

    if (pinnedEra) {
      const at = levelIndexOf(pinnedEra);
      const prog: Progress = { v: SAVE_VERSION, seedBase, levelIndex: at, cash: CAMPAIGN_START, ledger: [], realized: [], pinned: pinnedEra };
      if (beat === "level" || beat === null) {
        setProgress(prog);
        setPhase("level");
        setBooted(true);
        if (beat === null) startEra(prog, at, CAMPAIGN_START, null);
        return;
      }
      startEra(prog, at, CAMPAIGN_START, beat);
      setBooted(true);
      return;
    }

    // A pinned seed always starts the campaign over, so a walk gets the same
    // five eras whatever the last session left in the store.
    const saved = seedParam !== null ? null : readSave();
    if (saved && saved.progress.pinned === null) {
      setProgress(saved.progress);
      setBest(readBest());
      if (saved.run) {
        const level = LADDER[saved.progress.levelIndex];
        const base = buildRun(saved.run.era, saved.run.startCash, saved.run.speed);
        const run: RunState = {
          ...base,
          t: saved.run.t,
          cash: saved.run.cash,
          holdings: { ...base.holdings, ...saved.run.holdings },
          trades: saved.run.trades,
        };
        const restored: Live = {
          run,
          minWorth: saved.run.minWorth,
          fired: saved.run.fired,
          track: saved.run.track,
          gates: saved.run.gates,
        };
        scaleRef.current = 0;
        setLive(restored);
        liveRef.current = restored;
        const resumedFocus = saved.run.focus && run.tickers.includes(saved.run.focus) && isListed(run, saved.run.focus)
          ? saved.run.focus
          : openingFocus(run);
        focusRef.current = resumedFocus;
        setFocus(resumedFocus);
        const resumed: Phase = saved.phase === "gate" || saved.phase === "settle" ? "run" : saved.phase;
        setPhase(resumed === "level" && level ? "level" : resumed);
        phaseRef.current = resumed;
        setBooted(true);
        return;
      }
      setPhase(saved.phase === "end" ? "end" : "level");
      setBooted(true);
      return;
    }

    setProgress({ v: SAVE_VERSION, seedBase, levelIndex: 0, cash: CAMPAIGN_START, ledger: [], realized: [], pinned: null });
    setPhase("level");
    setBooted(true);
    // the boot reads the URL and the store once, on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------- the levels

  const level: Level = LADDER[Math.min(progress.levelIndex, LADDER.length - 1)];
  const run = live?.run ?? null;

  const sample: HeadlineSample = useMemo(() => {
    if (!run) return { items: [], labels: {}, mix: { signal: 0, lie: 0, noise: 0, total: 0, signalFrac: 0, lieFrac: 0, legal: false }, attempts: 0, fallback: false };
    const months = eraMonths(run.era).length;
    return sampleHeadlines({
      era: run.era,
      pool: HEADLINE_POOL,
      seed: progress.seedBase + levelIndexOf(run.era) * 101,
      count: Math.max(1, Math.round(months / 2)),
    });
  }, [run?.era, progress.seedBase]);

  // What the strip actually showed. The ticker drops a headline it cannot fit
  // within three months of its own month rather than showing it late, so the
  // debrief reads the run through the same function instead of through the
  // sample, and never quotes a line back that never went past.
  const aired = useMemo<HeadlineSample["items"]>(() => {
    if (!run) return [];
    const end = lastIndex(run);
    return tickerLayout(sample.items, run.startIndex)
      .map((l) => l.item)
      .filter((h) => h.monthIndex - run.startIndex <= end);
  }, [sample, run?.startIndex, run?.months.length]);

  // ---------------------------------------------------------------- the tape

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let acc = 0;
    let hidden = document.hidden;
    const onVis = () => {
      hidden = document.hidden;
      prev = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.25, (now - prev) / 1000);
      prev = now;
      const state = liveRef.current;
      if (!state || phaseRef.current !== "run" || hidden) return;

      const step = dt * turbo;
      const end = lastIndex(state.run);
      let next = Math.min(end, state.run.t + step * state.run.speed);

      // a gate stops the tape exactly on its month, never past it
      let hit: FloorGate | null = null;
      for (const g of gatesFor(state.run.era)) {
        if (state.fired.includes(g.id)) continue;
        const at = monthIndexOf(state.run.era, g.month);
        if (at < 0) continue;
        if (next >= at && (hit === null || at < monthIndexOf(state.run.era, hit.month))) hit = g;
      }
      if (hit) next = Math.min(next, monthIndexOf(state.run.era, hit.month));

      const advanced = advanceTo(state.run, next);
      const worth = worthOf(advanced);
      const track = state.track.slice();
      for (let m = track.length; m <= Math.floor(advanced.t); m++) track.push(worthAt(advanced, m));
      const updated: Live = {
        run: advanced,
        minWorth: Math.min(state.minWorth, worth),
        fired: hit ? [...state.fired, hit.id] : state.fired,
        track,
        gates: state.gates,
      };
      liveRef.current = updated;

      acc += dt * 1000;
      if (acc >= COMMIT_MS || hit || advanced.t >= end) {
        acc = 0;
        setLive(updated);
        setTick((n) => n + 1);
      }

      if (hit) {
        setLive(updated);
        setGate(hit);
        setPhase("gate");
        phaseRef.current = "gate";
        return;
      }
      if (advanced.t >= end) {
        setLive(updated);
        setPhase("debrief");
        phaseRef.current = "debrief";
        return;
      }
      if (isBroke(advanced)) {
        setLive(updated);
        setPhase("broke");
        phaseRef.current = "broke";
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [turbo]);

  // --------------------------------------------------------------- the chart

  // The chart draws to whatever its slot turned out to be, measured rather
  // than computed, so nothing on the page depends on the arithmetic being
  // right about a scrollbar or a safe area. The measure runs in a layout
  // effect, before paint, so the first frame is already the right size.
  useLayoutEffect(() => {
    const node = chartBox.current;
    if (!node) return;
    const measure = () => {
      setChartW(Math.max(240, node.clientWidth));
      setChartH(Math.max(140, node.clientHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [phase, phone]);

  // The crossfade is set in the same commit as the focus, not in an effect
  // after it, so the 200ms window is real from the first frame the new chart
  // is on screen.
  const [fading, setFading] = useState(false);
  const focusRef = useRef(focus);
  const fadeTimer = useRef(0);
  const focusOn = useCallback((ticker: Ticker) => {
    if (focusRef.current === ticker) return;
    focusRef.current = ticker;
    setFocus(ticker);
    setFading(true);
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => setFading(false), 200);
  }, []);

  // ---------------------------------------------------------------- the desk

  // A third of the window, not a strip: at 950px the drawn stack is over three
  // hundred pixels, which is what turns two thousand dollars of cash from a
  // featureless bar into twenty countable hundred dollar blocks.
  const deskH = phone
    ? Math.max(200, Math.min(300, Math.round(viewH * 0.30)))
    : Math.max(260, Math.min(460, Math.round(viewH * 0.38)));
  const openingWorth = run?.startCash ?? CAMPAIGN_START;

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
        key: ticker,
        ticker,
        shares,
        price: p,
        dollars,
        dead: isDead(run, ticker),
        draw: settle ? dollars * (1 - settleEase) : undefined,
      });
    }
    return out;
  }, [run, settle, settleEase, tick]);

  // The pour is its own clock. It runs for SETTLE_MS and nothing about the
  // engine moves while it does: only the drawn amounts ease.
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

  // One dollar scale for every column including cash, set once from the era's
  // opening worth and only ever eased down (docs/tape-shared.md section 6).
  const meterH = deskH - 44;
  if (scaleRef.current === 0 && openingWorth > 0) scaleRef.current = (0.85 * meterH) / openingWorth;
  for (const col of columns) {
    if (col.dollars > 0) {
      const need = (0.98 * meterH) / col.dollars;
      if (need < scaleRef.current) scaleRef.current = need;
    }
  }
  const scale = scaleRef.current;

  // --------------------------------------------------------------- the trades

  const trade = useCallback((fn: (r: RunState) => RunState) => {
    const state = liveRef.current;
    if (!state) return;
    const before = worthOf(state.run);
    const next = fn(state.run);
    if (next === state.run) return;
    // Conservation, measured at the instant rather than asserted: a trade moves
    // dollars between a column and cash and moves nothing else.
    setConserved(Math.abs(worthOf(next) - before));
    const made = next.trades[next.trades.length - 1];
    if (made) setPour({ id: next.trades.length, ticker: made.ticker, kind: made.kind });
    const updated: Live = { ...state, run: next, minWorth: Math.min(state.minWorth, worthOf(next)) };
    liveRef.current = updated;
    setLive(updated);
    setTick((n) => n + 1);
  }, []);

  const buyShares = (n: number) => trade((r) => buy(r, focus, n * priceAt(r, focus)));
  const buyMax = () => trade((r) => buy(r, focus));
  const sellShares = (n: number) => trade((r) => sell(r, focus, n));
  const sellAll = () => trade((r) => sell(r, focus));

  // ---------------------------------------------------------------- the gate

  const chooseGate = useCallback((index: number) => {
    const state = liveRef.current;
    const active = gate;
    if (!state || !active) return;
    const choice = active.choices[index];
    let next = state.run;
    if (choice.act.kind === "sell-all") {
      for (const ticker of next.tickers) {
        if ((next.holdings[ticker] ?? 0) > 0) next = sell(next, ticker);
      }
    } else if (choice.act.kind === "sell") {
      next = sell(next, choice.act.ticker);
    } else if (choice.act.kind === "buy") {
      next = buy(next, choice.act.ticker);
    }

    const made = next.trades.slice(state.run.trades.length);
    const shares = made.reduce((n, t) => n + t.shares, 0);
    const last = made[made.length - 1];
    if (last) setPour({ id: next.trades.length, ticker: last.ticker, kind: last.kind });
    const at = Math.max(0, monthIndexOf(active.era, active.month));
    const after = Math.min(at + AFTER_MONTHS, lastIndex(next));
    const watchTicker = active.watch === "market" ? "^SP500TR" : active.watch;
    const record: GateRecord = {
      gateId: active.id,
      month: active.month,
      headline: active.headline,
      choice: choice.label,
      shares,
      ticker: choice.act.kind === "buy" || choice.act.kind === "sell" ? choice.act.ticker : "",
      kind: choice.act.kind === "hold" ? "hold" : choice.act.kind === "buy" ? "buy" : "sell",
      watch: active.watch,
      priceThen: priceAt(next, watchTicker, at),
      priceAfter: priceAt(next, watchTicker, after),
      afterMonth: next.months[after] ?? next.months[lastIndex(next)],
    };

    const updated: Live = { ...state, run: next, gates: [...state.gates, record], minWorth: Math.min(state.minWorth, worthOf(next)) };
    liveRef.current = updated;
    setLive(updated);
    setGate(null);
    setPhase("run");
    phaseRef.current = "run";
  }, [gate]);

  // ------------------------------------------------------------- the debrief

  const debrief = useMemo(() => {
    if (!run) return null;
    const end = lastIndex(run);
    const worth = worthAt(run, end);
    const holding = compositeHolding(run.era, run.startCash);
    const index = compositeIndex(run.era, run.startCash);
    const stars = starsFor({ worth, holding, index, minWorth: live?.minWorth ?? worth, openingWorth: run.startCash });
    return { worth, holding, index, stars };
  }, [run, live?.minWorth, phase]);

  const continueEra = useCallback(() => {
    const state = liveRef.current;
    if (!state || !debrief) return;
    const settled = settleRun(state.run);
    setSettle({ from: state.run.cash, to: settled.cash, at: performance.now() });
    setSettleP(0);
    setPhase("settle");
    phaseRef.current = "settle";
    window.setTimeout(() => {
      const row: LedgerRow = {
        era: state.run.era,
        title: levelOf(state.run.era).title,
        entered: state.run.startCash,
        left: settled.cash,
        stars: debrief.stars,
      };
      const ledger = [...progress.ledger, row];
      const realized = [...progress.realized, ...realizedFrom(settled.trades, settled.era)];
      const nextIndex = progress.levelIndex + 1;
      const done = progress.pinned !== null || nextIndex >= LADDER.length;
      const nextProgress: Progress = { ...progress, levelIndex: done ? progress.levelIndex : nextIndex, cash: settled.cash, ledger, realized };
      setProgress(nextProgress);
      setSettle(null);
      setSettleP(0);
      if (done) {
        setBest(writeBest(settled.cash));
        setLive(null);
        liveRef.current = null;
        setPhase("end");
        phaseRef.current = "end";
        writeSave({ v: SAVE_VERSION, phase: "end", progress: nextProgress, run: null });
      } else {
        setLive(null);
        liveRef.current = null;
        setPhase("level");
        phaseRef.current = "level";
        writeSave({ v: SAVE_VERSION, phase: "level", progress: nextProgress, run: null });
      }
    }, SETTLE_MS);
  }, [debrief, progress]);

  const retryEra = useCallback(() => {
    startEra(progress, progress.levelIndex, progress.cash, null);
  }, [progress, startEra]);

  const openDesk = useCallback(() => {
    startEra(progress, progress.levelIndex, progress.cash, null);
  }, [progress, startEra]);

  const playAgain = useCallback(() => {
    clearSave();
    const seedBase = Math.floor(Math.random() * 100000) + 1;
    const fresh: Progress = { v: SAVE_VERSION, seedBase, levelIndex: 0, cash: CAMPAIGN_START, ledger: [], realized: [], pinned: null };
    setLive(null);
    liveRef.current = null;
    setProgress(fresh);
    setPhase("level");
    phaseRef.current = "level";
  }, []);

  // ------------------------------------------------------------- persistence

  useEffect(() => {
    if (!booted || progress.pinned !== null) return;
    const save = () => {
      const state = liveRef.current;
      const p = phaseRef.current;
      const body: RunSave = {
        v: SAVE_VERSION,
        phase: p === "gate" || p === "settle" ? "run" : p,
        progress,
        run: state
          ? {
            era: state.run.era,
            t: state.run.t,
            cash: state.run.cash,
            holdings: state.run.holdings,
            trades: state.run.trades,
            startCash: state.run.startCash,
            speed: state.run.speed,
            minWorth: state.minWorth,
            fired: state.fired,
            focus,
            gates: state.gates,
            track: state.track,
          }
          : null,
      };
      writeSave(body);
    };
    save();
    const id = window.setInterval(save, 1200);
    window.addEventListener("beforeunload", save);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", save);
      save();
    };
  }, [booted, progress, phase, focus]);

  // ------------------------------------------------------------------ render

  // Attributes the walk in tools/floorcheck.mjs reads. They carry the exact
  // numbers the rendered copy rounds, so a check can hold the desk against the
  // cent rather than against a dollar sign.
  const shell = (children: React.ReactNode) => (
    <div
      data-floor
      data-phase={phase}
      data-tape={live ? live.run.t.toFixed(5) : ""}
      data-trade-count={live ? live.run.trades.length : 0}
      data-worth={live ? worthOf(live.run).toFixed(4) : ""}
      data-cash={live ? live.run.cash.toFixed(4) : ""}
      data-conservation={conserved.toFixed(6)}
      className="min-h-screen w-full"
      style={{ background: BG, color: TEXT, fontFamily: "var(--font-sans)" }}
    >
      <style>{`@keyframes floor-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
      {children}
    </div>
  );

  if (!booted) {
    return shell(<div className="px-6 py-8" style={{ fontSize: 15, color: MUTED }}>Opening the desk.</div>);
  }

  // ------------------------------------------------------------- level card

  if (phase === "level") {
    const at = Math.min(progress.levelIndex, LADDER.length - 1);
    return shell(
      // Every beat's screen carries its own key so React swaps the whole card
      // instead of reusing the desk's nodes for it. A reused node is a node
      // that moved, and a node that moved at an era boundary is the layout
      // lurching under the player at exactly the moment they are reading.
      <div key="level" className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 text-center">
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.01em" }}>{LADDER[at].card}</h1>
        <div style={{ fontSize: 13, color: MUTED }}>Level {at + 1} of {LADDER.length}</div>
        <div className="tnum" data-carry={progress.cash.toFixed(2)} style={{ fontSize: 20, fontWeight: 600 }}>You bring {money(progress.cash)}</div>
        {best > 0 && <div className="tnum" style={{ fontSize: 13, color: MUTED }}>Best campaign so far {money(best)}</div>}
        <button
          type="button"
          data-open-desk
          onClick={openDesk}
          className="rounded-full px-6 py-3"
          style={{ background: TEXT, color: BG, fontSize: 15, fontWeight: 600 }}
        >
          Open the desk
        </button>
        <Link to="/" style={{ fontSize: 13, color: MUTED }}>Back to the games</Link>
      </div>,
    );
  }

  // ----------------------------------------------------------- campaign end

  if (phase === "end") {
    const final = ledgerFinal(progress.ledger);
    const levels = progress.ledger.map((row) => levelOf(row.era));
    const indexAll = campaignIndex(CAMPAIGN_START, levels);
    const { win, loss } = biggestOf(progress.realized);
    return shell(
      <div key="end" className="min-h-screen flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-[620px] flex flex-col gap-5">
          <h1 className="tnum" data-end-lead={final.toFixed(2)} style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.01em" }}>
            You finished with {money(final)}.
          </h1>

          <div className="rounded-2xl overflow-hidden" style={{ background: PANEL, border: "1px solid #2C3644" }}>
            {progress.ledger.map((row, i) => (
              <div
                key={row.era}
                data-ledger-row={row.era}
                className="px-4 py-3 flex items-baseline justify-between gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid #2C3644" }}
              >
                <span style={{ fontSize: 14 }}>{row.title}</span>
                <span className="tnum flex-none" style={{ fontSize: 14, color: MUTED }}>
                  <span data-entered={row.entered.toFixed(2)}>{money(row.entered)}</span>
                  <span style={{ padding: "0 8px" }}>to</span>
                  <span
                    data-left={row.left.toFixed(2)}
                    style={{ color: row.left > row.entered ? UP : row.left < row.entered ? DOWN : TEXT }}
                  >
                    {money(row.left)}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {/* Section 5 asks for exactly two full-campaign baselines: never
                trading at all, which is the cash the campaign started with and
                never spent, and the index the whole way. The equal-weight
                basket compounded across five eras used to sit here too and
                reached $2.76 million, which read as the game mocking whatever
                the player had actually made. The per-era debrief keeps that
                baseline, where it is one era wide and means something. */}
            <Stat label="Never trading:" value={money(CAMPAIGN_START)} />
            <Stat label="The market:" value={money(indexAll)} />
            <Stat
              label="Stars earned:"
              value={`${starsIn(progress.ledger)} of ${progress.pinned === null ? STARS_POSSIBLE : progress.ledger.length * STAR_ORDER.length}`}
            />
            {best > 0 && <Stat label="Best campaign:" value={money(best)} />}
          </div>

          <div className="flex flex-col gap-2" data-biggest>
            {win ? (
              <Stat label={`Biggest win, ${nameOf(win.ticker)}:`} value={signedMoney(win.dollars)} tone={UP} />
            ) : (
              <div style={{ fontSize: 13, color: MUTED }}>You never closed a position at a profit.</div>
            )}
            {loss ? (
              <Stat label={`Biggest loss, ${nameOf(loss.ticker)}:`} value={signedMoney(loss.dollars)} tone={DOWN} />
            ) : (
              <div style={{ fontSize: 13, color: MUTED }}>You never closed a position at a loss.</div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              data-play-again
              onClick={playAgain}
              className="rounded-full px-5 py-2.5"
              style={{ background: TEXT, color: BG, fontSize: 15, fontWeight: 600 }}
            >
              Play again
            </button>
            <Link to="/" className="rounded-full px-5 py-2.5" style={{ background: PANEL, color: TEXT, fontSize: 15, border: "1px solid #39434F" }}>
              Back to the games
            </Link>
          </div>
        </div>
      </div>,
    );
  }

  if (!run || !live) {
    return shell(<div className="px-6 py-8" style={{ fontSize: 15, color: MUTED }}>Opening the desk.</div>);
  }

  // ------------------------------------------------------------- the desk

  const focusPrice = priceAt(run, focus);
  const worth = worthOf(run);
  const held = run.holdings[focus] ?? 0;
  const focusListed = isListed(run, focus);
  const canBuyOne = focusListed && maxShares(run, focus) >= 1;
  const canBuyFive = focusListed && maxShares(run, focus) >= 5;
  const values = run.prices[focus] ?? [];
  const dots = run.trades
    .filter((t) => t.ticker === focus)
    .map((t) => ({ at: t.at, price: t.price, side: t.kind }));

  const button = (label: string, onClick: () => void, on: boolean, tone: "buy" | "sell") => (
    <button
      key={label}
      type="button"
      data-trade={label}
      disabled={!on}
      onClick={onClick}
      className="rounded-xl px-3 flex-1"
      style={{
        height: TRADE_BTN_H,
        background: on ? (tone === "buy" ? "rgba(74,222,128,0.14)" : "rgba(229,72,77,0.14)") : "rgba(135,148,166,0.07)",
        border: `1px solid ${on ? (tone === "buy" ? "rgba(74,222,128,0.42)" : "rgba(229,72,77,0.42)") : "rgba(135,148,166,0.18)"}`,
        color: on ? (tone === "buy" ? UP : DOWN) : "#5C6675",
        fontSize: 14,
        fontWeight: 600,
        cursor: on ? "pointer" : "default",
      }}
    >
      {label}
    </button>
  );

  // Phone splits the six into buys over sells rather than shrinking them: six
  // across 390px would wrap every label onto two lines.
  const tradeRow = phone ? (
    <div className="flex flex-col gap-2 w-full flex-none" data-trades style={{ height: TRADE_ROW_H_PHONE }}>
      <div className="flex gap-2 w-full">
        {button("Buy 1", () => buyShares(1), canBuyOne, "buy")}
        {button("Buy 5", () => buyShares(5), canBuyFive, "buy")}
        {button("Buy max", buyMax, canBuyOne, "buy")}
      </div>
      <div className="flex gap-2 w-full">
        {button("Sell 1", () => sellShares(1), held >= 1, "sell")}
        {button("Sell 5", () => sellShares(5), held >= 5, "sell")}
        {button("Sell all", sellAll, held >= 1, "sell")}
      </div>
    </div>
  ) : (
    <div className="flex gap-2 w-full flex-none" data-trades style={{ height: TRADE_ROW_H }}>
      {button("Buy 1", () => buyShares(1), canBuyOne, "buy")}
      {button("Buy 5", () => buyShares(5), canBuyFive, "buy")}
      {button("Buy max", buyMax, canBuyOne, "buy")}
      {button("Sell 1", () => sellShares(1), held >= 1, "sell")}
      {button("Sell 5", () => sellShares(5), held >= 5, "sell")}
      {button("Sell all", sellAll, held >= 1, "sell")}
    </div>
  );

  // The chart is the only part of the desk that flexes. Its slot is measured
  // and the drawing fills whatever the slot turned out to be, so a safe area
  // inset or a browser chrome change moves the chart and nothing else.
  const chartPane = (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{ background: PANEL, border: "1px solid #2C3644", flex: "1 1 auto", minHeight: 0 }}
    >
      <div className="px-3 flex items-center justify-between flex-none" style={{ height: CHART_TITLE_H }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{nameOf(focus)}</span>
        <span className="tnum" style={{ fontSize: 13, color: isDead(run, focus) ? MUTED : TEXT }}>
          {isDead(run, focus) ? "gone" : fmtPrice(focusPrice)}
        </span>
      </div>
      <div ref={chartBox} data-chart-slot className="w-full overflow-hidden" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <div
          data-chart-fade={fading ? "1" : "0"}
          data-chart-series={`${run.era}:${focus}`}
          key={focus}
          style={{ animation: "floor-fade-in 200ms ease" }}
        >
          <Chart
            months={run.months}
            series={values}
            t={run.t}
            width={chartW}
            height={chartH}
            trades={dots}
            livePrice={focusPrice}
          />
        </div>
      </div>
      <HeadlineTicker items={sample.items} startIndex={run.startIndex} t={run.t} width={chartW} height={TICKER_H} />
    </div>
  );

  // One line, never two. The header used to wrap when the numbers grew a digit
  // and unwrap when they shrank, which shoved everything under it up and down
  // by a row while the tape ran.
  const drawnCash = settle ? settle.from + (settle.to - settle.from) * settleEase : run.cash;
  const header = (
    <div
      data-header
      className="w-full flex items-center justify-between gap-3 flex-none overflow-hidden"
      style={{ height: HEADER_H, whiteSpace: "nowrap" }}
    >
      <div className="flex items-center gap-4">
        <Stat label="worth" value={money(worth)} />
        <Stat label="cash" value={money(drawnCash)} />
      </div>
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="tnum" style={{ fontSize: 14 }}>{readMonth(run.months[Math.min(Math.floor(run.t), lastIndex(run))])}</span>
        <span className="truncate" style={{ fontSize: 13, color: MUTED }}>{level.title}</span>
      </div>
    </div>
  );

  const desk = (
    <Desk
      columns={columns}
      scale={scale}
      height={deskH}
      focus={focus}
      onFocus={focusOn}
      settling={phase === "settle"}
      phone={phone}
      pour={pour}
    />
  );

  const overlay = () => {
    if (phase === "gate" && gate) {
      const watchTicker = gate.watch === "market" ? "^SP500TR" : gate.watch;
      return (
        <Gate
          gate={gate}
          month={run.months[Math.min(Math.floor(run.t), lastIndex(run))]}
          cash={run.cash}
          worth={worth}
          priceNow={gate.watch === "market" ? null : priceAt(run, watchTicker)}
          subject={gate.watch === "market" ? null : nameOf(watchTicker)}
          onChoose={chooseGate}
        />
      );
    }
    if (phase === "broke") {
      return (
        <div data-broke className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: BG }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>You went broke. Try the era again.</div>
          <div className="tnum" style={{ fontSize: 15, color: MUTED }}>This era opened with {money(run.startCash)}.</div>
          <button type="button" data-try-again onClick={retryEra} className="rounded-full px-5 py-2.5" style={{ background: TEXT, color: BG, fontSize: 15, fontWeight: 600 }}>
            Try again
          </button>
        </div>
      );
    }
    if (phase === "settle") {
      return (
        <div data-settling className="absolute left-0 right-0 bottom-0 z-20 flex justify-center pb-2 pointer-events-none">
          <span style={{ fontSize: 15, color: TEXT }}>Everything sells.</span>
        </div>
      );
    }
    if (phase === "debrief" && debrief) {
      return debriefCard(debrief);
    }
    return null;
  };

  function debriefCard(d: { worth: number; holding: number; index: number; stars: StarId[] }) {
    const width = phone ? 330 : 520;
    const overHolding = d.worth - d.holding;
    const overIndex = d.worth - d.index;
    const delta = (v: number) => (
      <span className="tnum" style={{ color: v >= 0 ? UP : DOWN, fontSize: 15 }}> {signedMoney(v)}</span>
    );
    return (
      // Fully opaque. At any transparency the live desk goes on moving behind
      // the reveal list and its numbers read straight through the words.
      //
      // Two bands, not one scroll with something floating over it: the card
      // fills the top band and Continue owns the bottom one. Continue used to
      // be sticky inside the scroll, which meant a real run's three gate quotes
      // pushed the reveal list under it and a headline row was always either
      // swallowed by the pill or sliced by the screen edge.
      <div data-debrief className="absolute inset-0 z-30 flex flex-col" style={{ background: BG }}>
        <div data-debrief-scroll className="flex-1 min-h-0 overflow-y-auto px-4 pt-6 pb-2">
          {/* The column is exactly as tall as the band it scrolls in, so the
              reveal list below takes whatever the card above it did not want:
              it stretches into the slack on a short debrief and gives its
              height back on a real run's tall one. */}
          <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 560, height: "100%" }}>
            <div className="flex flex-col gap-1">
              <div className="tnum" data-debrief-you={d.worth.toFixed(2)} style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em" }}>You: {money(d.worth)}</div>
              <div className="tnum" data-debrief-holding={d.holding.toFixed(2)} style={{ fontSize: 15, color: MUTED }}>
                Doing nothing: {money(d.holding)}{delta(overHolding)}
              </div>
              <div className="tnum" data-debrief-index={d.index.toFixed(2)} style={{ fontSize: 15, color: MUTED }}>
                The market: {money(d.index)}{delta(overIndex)}
              </div>
            </div>

            <div className="rounded-2xl px-2 py-2" style={{ background: PANEL, border: "1px solid #2C3644" }}>
              <WorthChart
                track={live!.track.length > 1 ? live!.track : [run!.startCash, d.worth]}
                months={run!.months}
                holding={d.holding}
                index={d.index}
                width={width}
                height={148}
              />
            </div>

            <Stars earned={d.stars} />

            {live!.gates.length > 0 && (
              <div className="flex flex-col gap-2" data-gate-log>
                {live!.gates.map((g) => {
                  const move = g.priceThen > 0 ? g.priceAfter / g.priceThen - 1 : 0;
                  const subject = g.watch === "market" ? "The market" : nameOf(g.watch);
                  const verb = move >= 0 ? "rose" : "fell";
                  return (
                    <div key={g.gateId} data-gate-quote={g.gateId} className="rounded-xl px-3 py-2" style={{ background: PANEL, border: "1px solid #2C3644" }}>
                      <div style={{ fontSize: 14 }}>You chose {g.choice}.</div>
                      <div className="tnum" style={{ fontSize: 13, color: MUTED }}>
                        {subject} {verb} {pct(move)} by {readMonth(g.afterMonth)}.
                        {g.shares > 0 && ` The move traded ${countOf(g.shares)} shares.`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* The list is every headline that actually ran on the ticker this
                era, laid out by the ticker's own function rather than by the
                sample, because a run's sample can hold a headline the strip
                never had room to show and a reveal that quotes something you
                never read is not a reveal. All of them are here: the list
                scrolls inside the card instead of stopping at the first nine.
                Month, headline, and what the next three months did to it, the
                same three columns as Trigger's end card. */}
            <div style={{ fontSize: 13, color: MUTED }}>
              {countOf(aired.length)} {aired.length === 1 ? "headline ran" : "headlines ran"} this era.
            </div>
            <div
              className="flex flex-col gap-1.5"
              data-reveal
              data-reveal-total={aired.length}
              style={{ flex: "1 1 auto", minHeight: phone ? 140 : 200, overflowY: "auto", overflowX: "hidden" }}
            >
              {aired.map((h) => {
                const label = sample.labels[h.id] ?? "noise";
                return phone ? (
                  <div key={h.id} data-reveal-row={h.id} data-label={label} style={{ borderTop: "1px solid rgba(215,222,232,0.10)", paddingTop: 6 }}>
                    <div className="flex justify-between gap-3">
                      <span className="tnum" style={{ fontSize: 12, color: MUTED }}>{h.month}</span>
                      <span style={{ fontSize: 12, color: LABEL_COLOR[label] }}>{LABEL_COPY[label]}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#B7C2D0", lineHeight: 1.35 }}>{h.text}</div>
                  </div>
                ) : (
                  <div key={h.id} data-reveal-row={h.id} data-label={label} className="flex items-baseline gap-3" style={{ borderTop: "1px solid rgba(215,222,232,0.10)", paddingTop: 6 }}>
                    <span className="tnum flex-none" style={{ fontSize: 12, color: MUTED, width: 58 }}>{h.month}</span>
                    <span className="flex-1" style={{ fontSize: 13, color: "#B7C2D0", lineHeight: 1.35 }}>{h.text}</span>
                    <span className="flex-none text-right" style={{ fontSize: 12, color: LABEL_COLOR[label], width: 148 }}>{LABEL_COPY[label]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Continue owns its own band at the foot of the card. Nothing scrolls
            through it and nothing hides behind it, and the way out of a
            debrief is never something to go looking for. */}
        <div
          data-debrief-foot
          className="w-full mx-auto flex-none px-4 pt-3"
          style={{ background: BG, borderTop: "1px solid rgba(215,222,232,0.10)", paddingBottom: "max(16px, env(safe-area-inset-bottom))", maxWidth: 592 }}
        >
          <button type="button" data-continue onClick={continueEra} className="rounded-full px-6 py-3" style={{ background: TEXT, color: BG, fontSize: 15, fontWeight: 600 }}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Both layouts are one window tall and never scroll: every part but the
  // chart has a height in pixels, the chart takes what is left, and the trade
  // buttons sit where they sat on the first frame for the whole era. The
  // bottom padding clears a phone's home indicator.
  const safeBottom = "max(12px, env(safe-area-inset-bottom))";

  if (phone) {
    return shell(
      <div
        key="desk"
        className="relative w-full flex flex-col gap-2 px-3 overflow-hidden"
        style={{ height: viewH, paddingTop: 12, paddingBottom: safeBottom }}
      >
        {header}
        {chartPane}
        <Rail run={run} focus={focus} onFocus={focusOn} phone />
        {desk}
        {tradeRow}
        {overlay()}
      </div>,
    );
  }

  return shell(
    <div
      key="desk"
      className="relative w-full flex flex-col gap-3 px-6 overflow-hidden"
      style={{ height: viewH, maxWidth: 1440, margin: "0 auto", paddingTop: 16, paddingBottom: 16 }}
    >
      {header}
      <div className="flex gap-3 items-stretch" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {chartPane}
          {tradeRow}
        </div>
        <Rail run={run} focus={focus} onFocus={focusOn} phone={false} />
      </div>
      {desk}
      {overlay()}
    </div>,
  );
}
