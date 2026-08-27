// Wall Street: Tally's wall, live, with the impulse monkey racing beside.
// Contract: docs/street-spec.md. Tally's chrome is imported, never copied:
// panels, plaques, buttons, blocks and sound all come from the tally modules.

import { useCallback, useEffect, useRef, useState } from "react";
import { HEADLINE_POOL } from "../data/headlinePool";
import type { RunState, Ticker } from "../lib/tape/engine";
import {
  advanceTo, buy, canBuy, canSell, lastIndex, priceAt, sell, worthOf,
} from "../lib/tape/engine";
import { sampleHeadlines } from "../lib/tape/headlines";
import type { TruthLabel } from "../lib/tape/headlines";
import { companyName } from "../lib/trigger/deal";
import { BLOCK_GROUP, allocateBlocks, blockDenom, denomLabel } from "../lib/blocks";
import {
  armAudio, blockThud, blockTick, eventToll, isMuted, loadMuted, paydayChime,
  setMuted,
} from "../lib/tally/sound";
import {
  ACCENT, FILL_DEEP, GOLD, INK, PAGE, R, SANS, STAGE_BOTTOM, STAGE_TOP, SUB,
  btn, btnSize, ensureTallyUI, goldPanel, panel, plaque,
} from "../components/tally/ui";
import {
  Block, blockGap, blockGroupGap, columnHeightAt, fitBlockSize,
} from "../components/tally/Blocks";
import type { Level, Progress, StreetHand, StreetResult } from "../lib/street/round";
import {
  BUY_CHUNK, HANDS_PER_SUMMARY, WINDOW_MONTHS, afterHand, afterSummary,
  bulletsFor, dealHand, loadProgress, monkeyStates, monkeyWorthAt, moveLine,
  newHandRun, randomSeed, saveProgress, settleHand, windowKey,
} from "../lib/street/round";

const ART = `${import.meta.env.BASE_URL}monkey/`;
const LETTERS = "ABCDEFGHIJ";
const STOCK_COLORS = [
  "#E9B44C", "#4E8FD9", "#C0653F", "#7B9E56", "#8A6FB8",
  "#D98BA6", "#5FA8A0", "#B8A24C", "#9B7E62", "#647FA4",
];
const STAGE_H = 440;
const WALL_H = STAGE_H - 56;

type Phase = "draw" | "run" | "settle" | "summary";

function money(n: number): string {
  const v = Math.round(n);
  return v < 0 ? `-$${Math.abs(v)}` : `$${v}`;
}

function longMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(mo) - 1]} ${y}`;
}

// One column of the wall: layer values bottom to top, drawn in blocks.
interface Snapshot { values: number[] }   // [cash, ...stock values]

function layerSpecs(values: number[], denom: number) {
  const counts = allocateBlocks(values, denom);
  const specs: { cash?: boolean; color?: string }[] = [];
  counts.forEach((n, layer) => {
    for (let i = 0; i < n; i++)
      specs.push(layer === 0 ? { cash: true } : { color: STOCK_COLORS[(layer - 1) % STOCK_COLORS.length] });
  });
  return specs;
}

// A month's cluster: blocks pack two wide, bottom up, with Tally's counting
// seam every BLOCK_GROUP rows so the seams line up across the wall.
function WallColumn({ specs, size }: { specs: { cash?: boolean; color?: string }[]; size: number }) {
  const g = blockGap(size);
  const gg = blockGroupGap(size);
  const rows: { cash?: boolean; color?: string }[][] = [];
  for (let i = 0; i < Math.min(specs.length, 96); i += 2) rows.push(specs.slice(i, i + 2));
  return (
    <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", flex: "none" }}>
      {rows.map((row, i) => (
        <span key={i} style={{ marginBottom: i === 0 ? 0 : (i % BLOCK_GROUP === 0 ? g + gg : g), display: "flex", gap: g }}>
          {row.map((b, j) => <Block key={j} size={size} cash={b.cash} color={b.color} />)}
        </span>
      ))}
    </div>
  );
}

export default function Street() {
  ensureTallyUI();
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [level, setLevel] = useState<Level>(1);
  const [phase, setPhase] = useState<Phase>("draw");
  const [hand, setHand] = useState<StreetHand>(() => dealHand(1, randomSeed(), new Set()));
  const [result, setResult] = useState<StreetResult | null>(null);
  const [announce, setAnnounce] = useState<string>("");
  const [muted, setMutedState] = useState<boolean>(() => loadMuted());
  const [, setFrame] = useState(0);

  const runRef = useRef<RunState>(newHandRun(hand));
  const usedRef = useRef<Set<string>>(new Set([windowKey(hand.era, hand.startIndex)]));
  const resultsRef = useRef<StreetResult[]>([]);
  const snapsRef = useRef<Snapshot[]>([]);
  const movesFiredRef = useRef<Set<number>>(new Set());
  const lastTickRef = useRef<number | null>(null);
  const handNoRef = useRef(1);

  const run = runRef.current;

  const snapshotOf = useCallback((r: RunState, t: number): Snapshot => ({
    values: [r.cash, ...hand.tickers.map((tk) => (r.holdings[tk] ?? 0) * priceAt(r, tk, t))],
  }), [hand]);

  const deal = useCallback((lv: Level) => {
    const next = dealHand(lv, randomSeed(), usedRef.current);
    usedRef.current.add(windowKey(next.era, next.startIndex));
    runRef.current = newHandRun(next);
    snapsRef.current = [];
    movesFiredRef.current = new Set();
    lastTickRef.current = null;
    setHand(next);
    setResult(null);
    setAnnounce("");
    setPhase("draw");
  }, []);

  const pickLevel = useCallback((lv: Level) => {
    if (lv > progress.unlocked) return;
    resultsRef.current = [];
    handNoRef.current = 1;
    setLevel(lv);
    deal(lv);
  }, [progress.unlocked, deal]);

  // The barrel beat, then the tape.
  useEffect(() => {
    if (phase !== "draw") return;
    const id = setTimeout(() => setPhase("run"), 1500);
    return () => clearTimeout(id);
  }, [phase, hand]);

  // The clock. Snapshots on month boundaries, monkey moves announced live.
  useEffect(() => {
    if (phase !== "run") return;
    let alive = true;
    const step = (now: number) => {
      if (!alive) return;
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      let r = runRef.current;
      const before = Math.floor(r.t);
      r = advanceTo(r, r.t + dt * r.speed);
      runRef.current = r;
      const after = Math.floor(r.t);
      for (let m = before + 1; m <= after; m++) {
        snapsRef.current[m - 1] = snapshotOf(r, m - 1);
        const mv = hand.monkeyMoves.find((x) => x.month === m);
        if (mv && !movesFiredRef.current.has(m)) {
          movesFiredRef.current.add(m);
          eventToll();
          setAnnounce(moveLine(hand, mv));
        }
      }
      setFrame((n) => n + 1);
      if (r.t >= lastIndex(r)) {
        snapsRef.current[WINDOW_MONTHS] = snapshotOf(r, WINDOW_MONTHS);
        const res = settleHand(hand, r);
        resultsRef.current = [...resultsRef.current, res];
        setResult(res);
        setProgress((p) => {
          const np = afterHand(p, res);
          saveProgress(np);
          return np;
        });
        if (res.cleared) paydayChime();
        else blockThud(16, 20, { weight: 1.5 });
        setPhase("settle");
        return;
      }
      requestAnimationFrame(step);
    };
    lastTickRef.current = null;
    const id = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(id); };
  }, [phase, hand, snapshotOf]);

  const trade = useCallback((kind: "buy" | "sell", ticker: Ticker) => {
    armAudio();
    const r = runRef.current;
    if (kind === "buy") {
      const next = buy(r, ticker, BUY_CHUNK);
      if (next !== r) blockTick(8, 20);
      runRef.current = next;
    } else {
      const held = r.holdings[ticker] ?? 0;
      const price = priceAt(r, ticker);
      const n = Math.min(held, Math.max(1, Math.floor(BUY_CHUNK / Math.max(price, 1e-9))));
      const next = sell(r, ticker, n);
      if (next !== r) blockThud(8, 20);
      runRef.current = next;
    }
    setFrame((n) => n + 1);
  }, []);

  const openSummary = useCallback(() => setPhase("summary"), []);

  const closeSummary = useCallback((nextLevel: Level | null) => {
    setProgress((p) => {
      const np = afterSummary(p, level);
      saveProgress(np);
      return np;
    });
    resultsRef.current = [];
    handNoRef.current = 1;
    if (nextLevel) { setLevel(nextLevel); deal(nextLevel); }
    else deal(level);
  }, [level, deal]);

  const nextHand = useCallback(() => {
    handNoRef.current += 1;
    deal(level);
  }, [deal, level]);

  // Fixed geometry per hand: block money value and block pixel size never
  // move while values do. The v3 lesson, kept.
  const denom = blockDenom(Math.max(hand.target, 1000));
  const maxBlocks = Math.ceil((Math.max(hand.target, 1000) * 2.2) / denom);
  const size = fitBlockSize(Math.ceil(maxBlocks / 2), WALL_H - 30, 16);

  const t = run.t;
  const monthNow = Math.min(WINDOW_MONTHS, Math.floor(t));
  const yourWorth = worthOf(run);
  const monkeyWorth = monkeyWorthAt(hand, t);
  const summaryReady = resultsRef.current.length >= HANDS_PER_SUMMARY;
  const mStates = monkeyStates(hand);

  const yourColumns: Snapshot[] = [];
  for (let m = 0; m < monthNow; m++) yourColumns.push(snapsRef.current[m] ?? { values: [] });
  yourColumns.push(snapshotOf(run, t));

  const targetY = columnHeightAt(hand.target / denom / 2, size);

  return (
    <div style={{ minHeight: "100vh", background: PAGE, color: INK, fontFamily: SANS, padding: "14px 14px 30px" }}
      onPointerDown={() => armAudio()}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>

        <header style={{ ...panel(), display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Wall Street</div>
          {[1, 2, 3].map((lv) => (
            <button key={lv} className={btn("ghost")} style={btnSize(1, "sm")}
              aria-pressed={lv === level} disabled={lv > progress.unlocked}
              onClick={() => pickLevel(lv as Level)}>
              Level {lv}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ color: SUB, fontSize: 13.5 }}>
            Won {progress.wins} of {progress.hands}
            {progress.streak > 1 ? `, ${progress.streak} straight` : ""}
          </div>
          <button className={btn("ghost")} style={btnSize(1, "sm")}
            onClick={() => { const next = !isMuted(); setMuted(next); setMutedState(next); }}>
            {muted ? "Sound on" : "Sound off"}
          </button>
        </header>

        <div style={{ ...panel(), display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", minHeight: 40 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Hand {handNoRef.current} of {HANDS_PER_SUMMARY}
          </span>
          <span style={{ ...plaque(), padding: "2px 9px", fontSize: 13, color: SUB }}>
            {denomLabel(denom)}
          </span>
          <span style={{ color: SUB, fontSize: 13.5 }}>Month {monthNow} of {WINDOW_MONTHS}</span>
          <div style={{ flex: 1 }} />
          <span aria-live="polite" style={{ fontSize: 13.5, fontWeight: announce ? 700 : 400, color: announce ? INK : SUB, minWidth: 0 }}>
            {announce || "The monkey sits until it does not."}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <aside style={{ ...panel({ fill: FILL_DEEP }), width: 198, flex: "1 1 180px", maxWidth: 240, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...plaque(), padding: "8px 10px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>
                {Math.round(yourWorth / denom)} <span style={{ fontSize: 13, fontWeight: 400, color: SUB }}>blocks</span>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{money(yourWorth)}</div>
            </div>
            <div style={{ ...goldPanel(), padding: "7px 10px" }}>
              <div style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>Target {money(hand.target)}</div>
              <div style={{ fontSize: 12.5, color: SUB }}>{Math.ceil(hand.target / denom)} blocks</div>
            </div>
            <div style={{ ...plaque(), padding: "7px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <img src={`${ART}monkey-${phase === "settle" && result ? (result.win ? "slump" : "cheer") : "idle"}.png`}
                alt="the monkey" style={{ width: 40, flex: "none" }} />
              <div>
                <div style={{ fontSize: 12.5, color: SUB }}>Monkey</div>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{money(monkeyWorth)}</div>
              </div>
            </div>
          </aside>

          <section style={{
            flex: "10 1 560px", height: STAGE_H, borderRadius: R.board,
            border: "2px solid rgba(46,38,24,0.30)",
            background: `linear-gradient(180deg, ${STAGE_TOP}, ${STAGE_BOTTOM})`,
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.8)",
            display: "flex", overflow: "hidden",
          }}>
            <div style={{ flex: 2.2, position: "relative", padding: "10px 14px 26px" }}>
              <div style={{ position: "absolute", left: 14, top: 8, fontSize: 12.5, color: SUB }}>Your wall</div>
              <div style={{
                position: "absolute", left: 8, right: 8, bottom: 26 + targetY,
                borderTop: `2px dashed ${GOLD}`, opacity: 0.85,
              }} />
              <div style={{ position: "absolute", left: 8, right: 8, bottom: 25, borderTop: "2px solid rgba(46,38,24,0.35)" }} />
              <div style={{ position: "absolute", left: 14, right: 14, bottom: 4, top: 30, display: "flex", alignItems: "flex-end", justifyContent: "space-between", overflow: "hidden", paddingBottom: 22 }}>
                {Array.from({ length: WINDOW_MONTHS + 1 }, (_, m) => (
                  <div key={m} style={{ width: size * 2 + 4, display: "flex", justifyContent: "center" }}>
                    {m < yourColumns.length && <WallColumn specs={layerSpecs(yourColumns[m].values, denom)} size={size} />}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 2, background: "rgba(46,38,24,0.20)" }} />
            <div style={{ flex: 1, position: "relative", padding: "10px 12px 26px", background: "rgba(46,38,24,0.045)" }}>
              <div style={{ position: "absolute", left: 12, top: 8, fontSize: 12.5, color: SUB }}>Monkey's wall</div>
              <div style={{ position: "absolute", left: 8, right: 8, bottom: 25, borderTop: "2px solid rgba(46,38,24,0.35)" }} />
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 4, top: 30, display: "flex", alignItems: "flex-end", justifyContent: "space-between", overflow: "hidden", paddingBottom: 22 }}>
                {Array.from({ length: WINDOW_MONTHS + 1 }, (_, m) => {
                  const mSize = Math.max(4, Math.round(size * 0.62));
                  if (m > monthNow) return <div key={m} style={{ width: mSize * 2 + 3 }} />;
                  const st = mStates[Math.min(m, WINDOW_MONTHS)];
                  const stockValue = m === monthNow
                    ? monkeyWorth - st.cash
                    : monkeyWorthAt(hand, m) - st.cash;
                  const layerIndex = st.held ? hand.tickers.indexOf(st.held) : -1;
                  const values = [st.cash, ...hand.tickers.map((_, i) => (i === layerIndex ? Math.max(0, stockValue) : 0))];
                  return (
                    <div key={m} style={{ width: mSize * 2 + 3, display: "flex", justifyContent: "center" }}>
                      <WallColumn specs={layerSpecs(values, denom)} size={mSize} />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div style={{ ...panel(), padding: 10, display: "flex", gap: 10, alignItems: "stretch", overflowX: "auto", minHeight: 118 }}>
          {hand.tickers.map((tk, i) => {
            const shares = run.holdings[tk] ?? 0;
            const price = priceAt(run, tk);
            const dead = !(price > 0);
            return (
              <div key={tk} style={{ ...plaque(R.panel), padding: "8px 10px", width: 152, flex: "none", opacity: dead ? 0.55 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: STOCK_COLORS[i % STOCK_COLORS.length], flex: "none" }} />
                  <span style={{ fontWeight: 800, fontSize: 14 }}>Stock {LETTERS[i]}</span>
                  <span style={{ marginLeft: "auto", fontSize: 13, color: SUB }}>{dead ? "gone" : money(price)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: SUB, marginBottom: 6 }}>
                  {shares} {shares === 1 ? "share" : "shares"}, {money(shares * price)}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={btn("primary")} style={btnSize(1, "sm")}
                    disabled={phase !== "run" || !canBuy(run, tk)}
                    onClick={() => trade("buy", tk)}>
                    Buy
                  </button>
                  <button className={btn("plain")} style={btnSize(1, "sm")}
                    disabled={phase !== "run" || !canSell(run, tk)}
                    onClick={() => trade("sell", tk)}>
                    Sell
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, paddingLeft: 6 }}>
            <div style={{ ...plaque(), padding: "7px 12px", flex: "none" }}>
              <div style={{ fontSize: 12.5, color: SUB }}>Your money</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{money(run.cash)}</div>
            </div>
          </div>
        </div>
      </div>

      {phase === "draw" && (
        <StreetOverlay>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>The monkey draws from the barrel.</div>
          <div style={{ fontSize: 14.5, color: SUB }}>
            It went all in on stock {LETTERS[hand.tickers.indexOf(hand.monkeyStart)]}. It trades on impulse. Copy it at your peril.
          </div>
        </StreetOverlay>
      )}

      {phase === "settle" && result && (
        <StreetOverlay wide>
          <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 2, color: result.cleared ? INK : "#8A3A2E" }}>
            {result.cleared ? "Target cleared." : "Under the target."}
          </div>
          <div style={{ fontSize: 15, marginBottom: 10 }}>
            {result.you === result.monkey
              ? "A tie with the monkey."
              : result.win
                ? `You did ${money(result.you - result.monkey)} better than the monkey.`
                : `You did ${money(result.monkey - result.you)} worse than the monkey.`}
          </div>
          <div style={{ ...plaque(), padding: "8px 12px", fontSize: 14, marginBottom: 10, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <span>You <b>{money(result.you)}</b></span>
            <span>Monkey <b>{money(result.monkey)}</b></span>
            <span>Riding <b>{money(result.riding)}</b></span>
            <span style={{ color: GOLD }}>Target <b>{money(result.target)}</b></span>
          </div>
          <div style={{ textAlign: "left", borderTop: "1.5px solid rgba(46,38,24,0.17)", paddingTop: 8, marginBottom: 12 }}>
            {hand.tickers.map((tk, i) => (
              <div key={tk} style={{ fontSize: 13.5, marginBottom: 2 }}>
                <b>{LETTERS[i]}</b> was {companyName(tk)}, {longMonth(hand.startMonth)} to {longMonth(hand.endMonth)}
                {tk === hand.monkeyStart ? ", the monkey's draw" : ""}
              </div>
            ))}
            <RevealHeadlines hand={hand} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {summaryReady
              ? <button className={btn("gold")} style={btnSize(1, "lg")} onClick={openSummary}>See the summary</button>
              : <button className={btn("primary")} style={btnSize(1, "lg")} onClick={nextHand}>Deal again</button>}
          </div>
        </StreetOverlay>
      )}

      {phase === "summary" && (
        <StreetOverlay wide>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Five hands on the street.</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 10 }}>
            <tbody>
              {resultsRef.current.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1.5px solid rgba(46,38,24,0.14)" }}>
                  <td style={{ padding: "4px 6px", color: SUB }}>Hand {i + 1}</td>
                  <td style={{ padding: "4px 6px" }}>You {money(r.you)}</td>
                  <td style={{ padding: "4px 6px" }}>Monkey {money(r.monkey)}</td>
                  <td style={{ padding: "4px 6px", fontWeight: 700 }}>{r.cleared ? "Cleared" : "Missed"}</td>
                  <td style={{ padding: "4px 6px", color: r.win ? "#1A8A52" : SUB }}>{r.win ? "Beat it" : r.you === r.monkey ? "Tie" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "left", marginBottom: 12 }}>
            {bulletsFor(resultsRef.current).map((b, i) => (
              <div key={i} style={{ ...plaque(), padding: "7px 10px", fontSize: 14, marginBottom: 6 }}>{b}</div>
            ))}
          </div>
          {level < 3 && level + 1 > progress.unlocked && (
            <div style={{ ...goldPanel(), padding: "7px 12px", fontSize: 14.5, fontWeight: 700, marginBottom: 10, color: GOLD }}>
              Level {level + 1} is open.
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {level < 3 && (
              <button className={btn("primary")} style={btnSize(1, "md")} onClick={() => closeSummary((level + 1) as Level)}>
                Level {level + 1}
              </button>
            )}
            <button className={btn(level >= 3 ? "primary" : "plain")} style={btnSize(1, "md")} onClick={() => closeSummary(null)}>
              Keep playing
            </button>
          </div>
        </StreetOverlay>
      )}
    </div>
  );
}

function RevealHeadlines({ hand }: { hand: StreetHand }) {
  if (hand.level === 1) return null;
  const sample = sampleHeadlines({
    era: hand.era, pool: HEADLINE_POOL, seed: hand.seed, startIndex: hand.startIndex,
  });
  const within = sample.items
    .filter((h) => h.monthIndex >= hand.startIndex
      && h.monthIndex <= hand.startIndex + WINDOW_MONTHS
      && hand.tickers.includes(h.about))
    .slice(0, 3);
  if (!within.length) return null;
  return (
    <>
      {within.map((h) => {
        const label: TruthLabel = sample.labels[h.id];
        const color = label === "signal" ? "#1A8A52" : label === "lie" ? "#C0392B" : SUB;
        return (
          <div key={h.id} style={{ fontSize: 13.5, color: SUB, marginTop: 5 }}>
            "{h.text}"
            <span style={{
              fontSize: 12, color, border: `1.5px solid ${color}`, borderRadius: 999,
              padding: "0px 7px", marginLeft: 6,
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </>
  );
}

function StreetOverlay({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(46,38,24,0.38)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 30,
    }}>
      <div style={{
        ...panel({ fill: "#FFFEFB", hard: true, radius: R.board }),
        padding: "20px 22px", maxWidth: wide ? 600 : 440, width: "100%",
        textAlign: "center", maxHeight: "88vh", overflowY: "auto", fontFamily: SANS,
      }}>
        {children}
      </div>
    </div>
  );
}
