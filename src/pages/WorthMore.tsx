// Worth More: two companies, one hidden number, one guess.
//
// The board is the two companies and nothing else. Each one owns half the
// screen, painted in its own brand hue sunk deep enough to carry white type,
// edge to edge, with no page behind them. Wide screens split left and right,
// narrow screens split top and bottom, and a round badge sits on the seam:
// "vs" while you decide, a check or a cross the moment you answer, then the
// streak while the next challenger arrives.
//
// A right answer promotes the challenger: the whole strip of halves slides by
// one, the winner takes the anchor seat, and the next company arrives from
// the far side. A wrong answer ends the run on the spot.
//
// All the deciding lives in src/lib/worthMore.ts. This file draws and listens.
import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fmtMoney } from "../data/takeoverCompanies";
import {
  Company,
  Dealer,
  dayKey,
  drawFirst,
  drawNext,
  moneyIn,
  mulberry32,
  newDealer,
  onWhite,
  panelFlat,
  panelPaint,
  scaleLine,
  seedFrom,
} from "../lib/worthMore";

// the width at which the split turns from side by side into stacked
const NARROW = 700;

const COUNT_MS = 820;
const HOLD_MS = 640;
const REVEAL_MS = COUNT_MS + HOLD_MS;
const SLIDE_MS = 460;

const BEST_KEY = "worth-best";

const INK = "#141126";
const RIGHT = "#12A56C";
const NOPE = "#E0364F";

type Phase = "ask" | "reveal" | "dead";
type Pick = "more" | "less";
type Badge = "vs" | "right" | "wrong" | "streak";

interface Round {
  c: Company;
  line: string;
}

interface Run {
  dealer: Dealer;
  rng: () => number;
  rounds: Round[];
  idx: number;
  streak: number;
  phase: Phase;
  picked: Pick | null;
}

declare global {
  interface Window {
    __worth?: {
      anchor: { name: string; cap: number };
      challenger: { name: string; cap: number };
      streak: number;
      best: number;
      phase: Phase;
      picked: Pick | null;
      badge: Badge;
      stacked: boolean;
      line: string;
    };
  }
}

// ------------------------------------------------------------------ deal

// draw forward until the next challenger and the one waiting behind it both
// exist, so a correct answer always has a half to slide in
function grow(dealer: Dealer, rounds: Round[], rng: () => number, idx: number): Round[] {
  const out = rounds.slice();
  while (out.length < idx + 3) {
    const k = out.length;
    const prev = out[k - 1].c;
    const next = drawNext(dealer, prev, k - 1);
    out.push({ c: next, line: scaleLine(prev, next, rng) });
  }
  return out;
}

// The first run of the day is the shared daily deal, so friends compare the
// same gauntlet. Every play again after that reshuffles into new matchups
// (Marlon's call, Aug 17): the attempt counter salts the seed.
let attempt = 0;

function start(): Run {
  const seed = seedFrom(dayKey()) + attempt * 7919;
  attempt += 1;
  const dealer = newDealer(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const rounds = grow(dealer, [{ c: drawFirst(dealer), line: "" }], rng, 0);
  return { dealer, rng, rounds, idx: 0, streak: 0, phase: "ask", picked: null };
}

// ------------------------------------------------------------------ mark

const broken = new Set<string>();

function Mark({ c, size }: { c: Company; size: number }) {
  const [bad, setBad] = useState(() => broken.has(c.short));
  useEffect(() => setBad(broken.has(c.short)), [c.short]);

  // the short name has to sit inside the disc at any length, so the type
  // shrinks with the word instead of spilling over the edge
  const fs = Math.min(size * 0.23, (size * 1.2) / Math.max(3, c.short.length));

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: "#FFFFFF",
        display: "grid",
        placeItems: "center",
        boxShadow: `0 ${size * 0.07}px ${size * 0.24}px rgba(0,0,0,0.26)`,
        overflow: "hidden",
        flex: "none",
      }}
    >
      {bad ? (
        <span
          style={{
            color: onWhite(c.color),
            fontSize: fs,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {c.short}
        </span>
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}logos/${encodeURIComponent(c.short)}.png`}
          alt={c.name}
          style={{ width: size * 0.68, height: size * 0.68, objectFit: "contain" }}
          onError={() => {
            broken.add(c.short);
            setBad(true);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ half

type Seat = "past" | "anchor" | "challenger" | "next";

interface HalfProps {
  c: Company;
  seat: Seat;
  phase: Phase;
  stacked: boolean;
  style: CSSProperties;
  anchorName: string;
  count: number;
  onPick: (p: Pick) => void;
}

function Half({ c, seat, phase, stacked, style, anchorName, count, onPick }: HalfProps) {
  const asking = seat === "challenger" && phase === "ask";
  const disc = stacked ? 88 : 116;
  const nameSize = stacked
    ? Math.min(30, 380 / Math.max(9, c.name.length))
    : Math.min(44, 660 / Math.max(11, c.name.length));
  const valueSize = stacked ? 42 : 60;

  return (
    <section
      data-worth-panel={seat}
      data-worth-name={c.name}
      style={{
        ...style,
        position: "absolute",
        background: panelPaint(c.color),
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: stacked ? 12 : 18,
        padding: stacked ? "20px 22px" : "28px 32px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <Mark c={c} size={disc} />

      <div
        data-worth-title
        style={{
          fontSize: nameSize,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.08,
          textShadow: "0 2px 14px rgba(0,0,0,0.28)",
        }}
      >
        {c.name}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // tall enough for the two buttons, so an anchor half and a
          // challenger half stand at exactly the same height. On a phone the
          // block hugs the name, where vertical room is worth more than
          // symmetry; on a wide screen it sits centered in its own space.
          justifyContent: stacked ? "flex-start" : "center",
          minHeight: stacked ? 148 : 168,
        }}
      >
        {asking ? (
          <>
            <div style={{ fontSize: stacked ? 14 : 16, color: "rgba(255,255,255,0.88)" }}>
              Compared with {anchorName}
            </div>
            <div style={{ marginTop: stacked ? 12 : 16, display: "grid", gap: stacked ? 10 : 12 }}>
              <button data-worth="more" onClick={() => onPick("more")} style={pill(stacked)}>
                <Arrow up />
                Worth more
              </button>
              <button data-worth="less" onClick={() => onPick("less")} style={pill(stacked)}>
                <Arrow />
                Worth less
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                marginTop: stacked ? 4 : 8,
                fontSize: valueSize,
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                textShadow: "0 2px 18px rgba(0,0,0,0.3)",
              }}
            >
              {seat === "challenger" ? moneyIn(count, c.cap) : fmtMoney(c.cap)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function pill(stacked: boolean): CSSProperties {
  return {
    width: stacked ? 232 : 268,
    height: stacked ? 52 : 58,
    borderRadius: 999,
    background: "#FFFFFF",
    color: INK,
    fontSize: stacked ? 18 : 20,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.26)",
  };
}

function Arrow({ up }: { up?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={up ? "M8 13V3M3.5 7.5L8 3l4.5 4.5" : "M8 3v10M3.5 8.5L8 13l4.5-4.5"}
        fill="none"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ------------------------------------------------------------------ seam

function Seam({ badge, streak, size }: { badge: Badge; streak: number; size: number }) {
  const solid = badge === "right" ? RIGHT : badge === "wrong" ? NOPE : "#FFFFFF";
  const ink = badge === "right" || badge === "wrong" ? "#FFFFFF" : INK;
  return (
    <div
      data-worth-badge={badge}
      className="pointer-events-none absolute"
      style={{
        left: "50%",
        top: "50%",
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: size,
        background: solid,
        color: ink,
        display: "grid",
        placeItems: "center",
        boxShadow: "0 10px 34px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.14)",
        zIndex: 3,
        animation: "wmPop 300ms cubic-bezier(.2,1.2,.3,1)",
      }}
      key={badge + (badge === "streak" ? streak : 0)}
    >
      {badge === "right" && <Tick />}
      {badge === "wrong" && <Cross />}
      {badge === "vs" && (
        <span style={{ fontSize: size * 0.32, fontWeight: 700, letterSpacing: "-0.02em" }}>vs</span>
      )}
      {badge === "streak" && (
        <span style={{ fontSize: size * 0.44, fontWeight: 700, letterSpacing: "-0.03em" }}>
          {streak}
        </span>
      )}
    </div>
  );
}

function Tick() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ------------------------------------------------------------------ page

export default function WorthMore() {
  const [run, setRun] = useState<Run>(start);
  const [best, setBest] = useState(0);
  const [count, setCount] = useState(0);
  const [badge, setBadge] = useState<Badge>("vs");
  const [copied, setCopied] = useState(false);
  const [box, setBox] = useState({ w: 1440, h: 950 });
  const timer = useRef<number | null>(null);
  const settle = useRef<number | null>(null);
  const lock = useRef(false);

  const stacked = box.w < NARROW;
  const half = stacked ? box.h / 2 : box.w / 2;

  const anchor = run.rounds[run.idx].c;
  const challenger = run.rounds[run.idx + 1].c;
  const truth: Pick = challenger.cap > anchor.cap ? "more" : "less";
  const line = run.rounds[run.idx + 1].line;

  useEffect(() => {
    const raw = window.localStorage.getItem(BEST_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    if (Number.isFinite(n) && n > 0) setBest(n);
  }, []);

  // the split follows the window, both ways round
  useEffect(() => {
    const fit = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // the hidden number counts itself out on its own half
  useEffect(() => {
    if (run.phase === "ask") {
      setCount(0);
      return;
    }
    if (run.phase !== "reveal") return;
    let raf = 0;
    const t0 = performance.now();
    const target = challenger.cap;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / COUNT_MS);
      setCount(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run.phase, run.idx, challenger.cap]);

  useEffect(() => {
    window.__worth = {
      anchor: { name: anchor.name, cap: anchor.cap },
      challenger: { name: challenger.name, cap: challenger.cap },
      streak: run.streak,
      best,
      phase: run.phase,
      picked: run.picked,
      badge,
      stacked,
      line,
    };
  });

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (settle.current) window.clearTimeout(settle.current);
    },
    [],
  );

  const answer = useCallback(
    (pick: Pick) => {
      if (run.phase !== "ask" || lock.current) return;
      lock.current = true;
      const won = pick === truth;
      setRun((r) => ({ ...r, phase: "reveal", picked: pick }));
      setBadge(won ? "right" : "wrong");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        lock.current = false;
        if (won) {
          const rounds = grow(run.dealer, run.rounds, run.rng, run.idx + 1);
          setRun((r) => ({
            ...r,
            rounds,
            idx: r.idx + 1,
            streak: r.streak + 1,
            phase: "ask",
            picked: null,
          }));
          setBadge("streak");
          if (settle.current) window.clearTimeout(settle.current);
          settle.current = window.setTimeout(() => setBadge("vs"), SLIDE_MS + 380);
        } else {
          setBest((b) => {
            const next = Math.max(b, run.streak);
            window.localStorage.setItem(BEST_KEY, String(next));
            return next;
          });
          setRun((r) => ({ ...r, phase: "dead" }));
        }
      }, REVEAL_MS);
    },
    [run, truth],
  );

  const again = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (settle.current) window.clearTimeout(settle.current);
    lock.current = false;
    setCopied(false);
    setCount(0);
    setBadge("vs");
    setRun(start());
  }, []);

  // arrows for people who would rather not aim
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (run.phase === "dead" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        again();
        return;
      }
      if (run.phase !== "ask") return;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") answer("more");
      if (e.key === "ArrowDown" || e.key === "ArrowRight") answer("less");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run.phase, answer, again]);

  const share = `Worth More streak ${run.streak}. Ended on ${anchor.name} vs ${challenger.name}.`;

  const copy = () => {
    const nav = window.navigator;
    if (nav?.clipboard?.writeText) {
      nav.clipboard.writeText(share).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    }
  };

  const seats: Array<{ r: Round; i: number }> = [];
  for (let i = run.idx - 1; i <= run.idx + 2; i++) {
    if (i >= 0 && i < run.rounds.length) seats.push({ r: run.rounds[i], i });
  }

  const shift = -run.idx * half;
  const badgeSize = stacked ? 74 : 92;

  return (
    <main
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: panelFlat(anchor.color), color: "#FFFFFF" }}
    >
      <style>{`
        @keyframes wmPop { 0% { transform: scale(.6) } 55% { transform: scale(1.12) } 100% { transform: scale(1) } }
        @keyframes wmIn { from { opacity: 0; transform: translateY(16px) scale(.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>

      {/* the strip of halves: two fill the screen, the rest wait off the edge */}
      <div
        className="absolute inset-0"
        style={{
          transform: stacked ? `translateY(${shift}px)` : `translateX(${shift}px)`,
          transition: `transform ${SLIDE_MS}ms cubic-bezier(.3,1.05,.35,1)`,
        }}
      >
        {seats.map(({ r, i }) => {
          const rel = i - run.idx;
          const seat: Seat = rel < 0 ? "past" : rel === 0 ? "anchor" : rel === 1 ? "challenger" : "next";
          const style: CSSProperties = stacked
            ? { left: 0, top: i * half, width: box.w, height: half }
            : { left: i * half, top: 0, width: half, height: box.h };
          return (
            <Half
              key={`${i}-${r.c.name}`}
              c={r.c}
              seat={seat}
              phase={run.phase}
              stacked={stacked}
              style={style}
              anchorName={anchor.name}
              count={count}
              onPick={answer}
            />
          );
        })}
      </div>

      <Seam badge={badge} streak={run.streak} size={badgeSize} />

      {/* the scale line, tucked against the seam on the anchor side */}
      <div
        data-worth-line
        className="pointer-events-none absolute"
        style={{
          left: "50%",
          // along the bottom edge in both orientations, where it can never
          // crowd a company's number or the badge on the seam
          bottom: stacked ? 14 : 26,
          transform: "translateX(-50%)",
          maxWidth: "min(92vw, 560px)",
          textAlign: "center",
          fontSize: stacked ? 13 : 15,
          fontWeight: 500,
          padding: stacked ? "8px 16px" : "10px 20px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.34)",
          border: "1px solid rgba(255,255,255,0.22)",
          opacity: run.phase === "ask" ? 0 : 1,
          transition: "opacity 240ms ease",
          zIndex: 2,
        }}
      >
        {line}
      </div>

      <header
        className="absolute inset-x-0 top-0 flex items-center justify-between"
        style={{ padding: stacked ? "12px 14px" : "18px 22px", zIndex: 4 }}
      >
        <div>
          <div style={{ fontSize: stacked ? 18 : 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Worth More
          </div>
          {!stacked && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.76)", marginTop: 1 }}>
              Pick the company worth more.
            </div>
          )}
        </div>
        <div className="flex items-center" style={{ gap: stacked ? 6 : 10 }}>
          <Tag stacked={stacked}>Streak {run.streak}</Tag>
          <Tag stacked={stacked}>Best {best}</Tag>
          <Link to="/" style={{ textDecoration: "none" }}>
            <Tag stacked={stacked} quiet>
              Back
            </Tag>
          </Link>
        </div>
      </header>

      {run.phase === "dead" && (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ background: "rgba(8,6,20,0.66)", padding: 16, zIndex: 5 }}
        >
          <div
            data-worth="death"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 28,
              background: "#FFFCF6",
              color: INK,
              padding: stacked ? 20 : 28,
              boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
              animation: "wmIn 300ms cubic-bezier(.2,1.1,.3,1)",
            }}
          >
            <div
              style={{
                fontSize: stacked ? 24 : 30,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              You said {run.picked === "more" ? "worth more" : "worth less"}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <DeathRow c={anchor} stacked={stacked} />
              <DeathRow c={challenger} stacked={stacked} hot />
            </div>

            <div style={{ marginTop: 14, fontSize: stacked ? 14 : 15, color: "#6E6690" }}>
              {line}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <Score label="Streak" value={run.streak} />
              <Score label="Best" value={best} />
            </div>

            <div
              data-worth-share
              style={{
                marginTop: 16,
                fontSize: stacked ? 13 : 15,
                color: "#3B3363",
                background: "#F2F0FA",
                borderRadius: 14,
                padding: "12px 14px",
                lineHeight: 1.45,
              }}
            >
              {share}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                data-worth="again"
                onClick={again}
                style={{
                  flex: 2,
                  height: 54,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: RIGHT,
                  color: "#FFFFFF",
                  fontSize: 19,
                  fontWeight: 700,
                }}
              >
                Play again
              </button>
              <button
                onClick={copy}
                style={{
                  flex: 1,
                  height: 54,
                  borderRadius: 999,
                  cursor: "pointer",
                  background: "#FFFFFF",
                  color: INK,
                  fontSize: 17,
                  fontWeight: 700,
                  border: "2px solid rgba(20,17,38,0.14)",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Tag({
  children,
  stacked,
  quiet,
}: {
  children: ReactNode;
  stacked: boolean;
  quiet?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: stacked ? 12 : 14,
        fontWeight: 600,
        color: "#FFFFFF",
        padding: stacked ? "6px 10px" : "8px 14px",
        borderRadius: 999,
        background: quiet ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.2)",
        border: "1px solid rgba(255,255,255,0.28)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function DeathRow({ c, hot, stacked }: { c: Company; hot?: boolean; stacked: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 16,
        background: hot ? "rgba(224,54,79,0.09)" : "#F5F3FB",
        boxShadow: hot ? "inset 0 0 0 2px rgba(224,54,79,0.3)" : "none",
      }}
    >
      <div style={{ transform: "scale(1)", display: "flex" }}>
        <Mark c={c} size={38} />
      </div>
      <div style={{ fontSize: stacked ? 17 : 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
        {c.name}
      </div>
      <div
        style={{
          marginLeft: "auto",
          fontSize: stacked ? 18 : 21,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {fmtMoney(c.cap)}
      </div>
    </div>
  );
}

// the fact reads as one phrase, "Streak 5", never a caption stacked on a number
function Score({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 16,
        background: "#F5F3FB",
        padding: "10px 14px",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        fontSize: 15,
        color: "#6E6690",
      }}
    >
      {label}
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          color: INK,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
