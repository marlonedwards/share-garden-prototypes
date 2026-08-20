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

import type { MutableRefObject, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Chart from "../components/trigger/Chart";
import type { ChartTrade } from "../components/trigger/Chart";
import Feed from "../components/trigger/Feed";
import type { FeedItem } from "../components/trigger/Feed";
import Meter from "../components/trigger/Meter";
import { HEADLINE_POOL } from "../data/headlinePool";
import type { RunState } from "../lib/tape/engine";
import {
  advance, baselines, buy, canBuy, isDead, isOver, lastIndex,
  monthAt, monthIndexOf, newRun, priceAt, runIndexOf, sell, worthAt, worthOf,
} from "../lib/tape/engine";
import type { HeadlineSample, PlacedHeadline } from "../lib/tape/headlines";
import { sampleHeadlines } from "../lib/tape/headlines";
import { UI_FONT } from "../lib/type";
import type { Deal } from "../lib/trigger/deal";
import {
  ERA_MOOD, ERA_NAME, SPEED, START_CASH, companyName, dealFromParams,
  dealRandom, longMonth, randomSeed,
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
// A headline sits for about two seconds, and gives way faster when the tape
// has already reached the next one, so the feed never falls far behind the
// month it is reporting on.
const DWELL = [1900, 1200, 800];

type Phase = "deal" | "run" | "end";

interface Session {
  deal: Deal;
  sample: HeadlineSample;
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

  const begin = useCallback((next: Deal) => {
    const nextSample = makeSample(next);
    runRef.current = makeRun(next, SPEED * turbo);
    nextRef.current = 0;
    queueRef.current = [];
    shownRef.current = null;
    expiryRef.current = 0;
    historyRef.current = [START_CASH];
    historyAtRef.current = 0;
    setSession({ deal: next, sample: nextSample });
    setRun(runRef.current);
    setShown(null);
    setHistory([START_CASH]);
    setPhase("deal");
    setParams(
      { era: next.era, stock: next.ticker, seed: String(next.seed), ...(turbo > 1 ? { turbo: String(turbo) } : {}) },
      { replace: true },
    );
  }, [setParams, turbo]);

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

      const current = runRef.current;
      if (!isOver(current)) {
        runRef.current = advance(current, dt);
        setRun(runRef.current);
      }
      const t = runRef.current.t;

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
        const dwell = DWELL[Math.min(DWELL.length - 1, queueRef.current.length)] / turbo;
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
  }, [phase, sample, turbo]);

  // ------------------------------------------------------------ the trade
  const toggle = useCallback(() => {
    const current = runRef.current;
    if (isOver(current)) return;
    const held = current.holdings[ticker] ?? 0;
    const next = held > 0 ? sell(current, ticker) : buy(current, ticker);
    if (next === current) return;
    runRef.current = next;
    setRun(next);
  }, [ticker]);

  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, toggle]);

  // best delta against doing nothing, kept across runs
  useEffect(() => {
    if (phase !== "end") return;
    const end = lastIndex(runRef.current);
    const delta = worthAt(runRef.current, end) - baselines(runRef.current, ticker).holding;
    const prior = readBest();
    if (prior === null || delta > prior) {
      writeBest(delta);
      setBest(delta);
    }
  }, [phase, ticker]);

  // ----------------------------------------------------------- the viewport
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const phone = vp.w < 700;

  const rowRef = useRef<HTMLDivElement | null>(null);
  const row = useBox(rowRef, phase);
  const rowW = row.w;

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
  if (phase === "deal") {
    return shell(
      <div style={{
        minHeight: vp.h, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: pad, textAlign: "center",
      }}>
        <div style={{ maxWidth: 460, width: "100%" }}>
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
          <p data-pitch="" style={{ fontSize: 16, color: TEXT, marginTop: 14, lineHeight: 1.45 }}>
            One stock, one minute. Beat the person who did nothing.
          </p>
          <div style={{ fontSize: 15, color: MUTED, marginTop: 18 }}>
            You start with {money(START_CASH)} in cash.
          </div>
          <button
            data-start=""
            onClick={() => { setPhase("run"); }}
            style={{
              marginTop: 26, width: "100%", height: 60, borderRadius: 16, border: "none",
              background: UP, color: "#0C0F14", fontSize: 20, fontWeight: 600,
              fontFamily: UI_FONT, cursor: "pointer",
            }}
          >
            Start
          </button>
          {best !== null && (
            <div data-best="" style={{ fontSize: 13, color: MUTED, marginTop: 14 }}>
              best so far: {signedMoney(best)} over doing nothing
            </div>
          )}
        </div>
      </div>,
      true,
    );
  }

  // -------------------------------------------------------------- end card
  if (phase === "end") {
    return shell(
      <EndCard
        run={run}
        ticker={ticker}
        deal={deal}
        sample={sample}
        phone={phone}
        pad={pad}
        vpH={vp.h}
        onAgain={() => begin(dealRandom())}
        onSame={() => begin({ ...deal, seed: randomSeed() })}
      />,
      false,
    );
  }

  // --------------------------------------------------------------- the run
  const calcLine = `${shares} ${shares === 1 ? "share" : "shares"} x ${fmtPrice(livePrice)} = ${money(value)}`;
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

  return shell(
    <div style={{
      height: vp.h, display: "flex", flexDirection: "column", padding: pad, gap: phone ? 10 : 14,
      maxWidth: 1080, margin: "0 auto",
      // the button is the thing a thumb reaches for, so it keeps clear of the
      // phone's home indicator
      paddingBottom: `calc(${phone ? 24 : pad}px + env(safe-area-inset-bottom, 0px))`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: under(phone ? 16 : 19), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {longMonth(monthAt(run))}
        </span>
        <span style={{ fontSize: under(phone ? 14 : 16), color: MUTED }}>{ERA_NAME[deal.era]}</span>
      </div>

      <div ref={rowRef} style={{ display: "flex", gap: 8, alignItems: "stretch", flex: "1 1 auto", minHeight: 0 }}>
        <div style={{ background: PANEL, borderRadius: 12, overflow: "hidden" }}>
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
        <div style={{ background: PANEL, borderRadius: 12, overflow: "hidden", width: meterW }}>
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

      <Feed item={feedItem} height={phone ? 74 : 70} maxSize={under(16)} />

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
          }}
        >
          {inMarket ? "Sell" : "Buy"}
        </button>
      </div>
    </div>,
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

// ------------------------------------------------------------------ end card

interface EndProps {
  run: RunState;
  ticker: string;
  deal: Deal;
  sample: HeadlineSample;
  phone: boolean;
  pad: number;
  vpH: number;
  onAgain: () => void;
  onSame: () => void;
}

function EndCard({ run, ticker, deal, sample, phone, pad, vpH, onAgain, onSame }: EndProps) {
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
          You: {money(you)}
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
          onClick={onAgain}
          style={{
            flex: 1, height: 56, borderRadius: 14, border: "none", background: UP,
            color: "#0C0F14", fontSize: 18, fontWeight: 600, fontFamily: UI_FONT, cursor: "pointer",
          }}
        >
          Play again
        </button>
        <button
          data-same=""
          onClick={onSame}
          style={{
            flex: 1, height: 56, borderRadius: 14, border: `1px solid rgba(215,222,232,0.28)`,
            background: "transparent", color: TEXT, fontSize: 18, fontWeight: 600,
            fontFamily: UI_FONT, cursor: "pointer",
          }}
        >
          Same stock
        </button>
      </div>
    </div>
  );
}
