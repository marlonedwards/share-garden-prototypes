// Practice: the arcade in the felt skin.
//
// GUESS THE STOCK: name the company from its chart, drawn like a real
// graph with price and time axes. Guesses are free; every wrong guess
// deals the next hint off the ladder (widen the chart to the whole
// history, then the business, then the company's total size).
//
// WORTH MORE: two companies, tap the one worth more all together.
//
// Only a clean first guess pays cash and a Buy card, and only for the
// first paid wins of the day. Contract: docs/stack-desktop-spec.md.

import { useEffect, useMemo, useState } from "react";
import {
  ARCADE_PAID_PLAYS, ARCADE_PAY, COMPANIES, arcadeLoss, arcadeWin,
  money, moneyBig,
} from "../lib/stack/model";
import { FELT, FeltPage, pieceEl } from "../components/stack/kit";
import { TopBar, useStackState } from "../components/stack/TopBar";

// ---------------- guess the stock

type GuessRound = { answer: string; options: string[]; wrongs: string[]; solved: boolean };

function newGuessRound(learned: string[]): GuessRound {
  const answer = learned[Math.floor(Math.random() * learned.length)];
  const others = Object.keys(COMPANIES).filter((id) => id !== answer);
  const wrong: string[] = [];
  while (wrong.length < 3) {
    const w = others[Math.floor(Math.random() * others.length)];
    if (!wrong.includes(w)) wrong.push(w);
  }
  const options = [answer, ...wrong].sort(() => Math.random() - 0.5);
  return { answer, options, wrongs: [], solved: false };
}

// the hint ladder, dealt one per wrong guess
function hintLines(round: GuessRound): string[] {
  const c = COMPANIES[round.answer];
  const lines: string[] = [];
  if (round.wrongs.length >= 1) lines.push("Zoomed out to the whole history.");
  if (round.wrongs.length >= 2) lines.push(c.blurb + ".");
  if (round.wrongs.length >= 3) lines.push("All together it's worth about " + moneyBig(c.cap) + ".");
  return lines;
}

// a readable graph: price on the left, time along the bottom
function ChartOf(props: { id: string; revealed: boolean; widened: boolean }) {
  const c = COMPANIES[props.id];
  const { path, yTicks, days } = useMemo(() => {
    const px = props.widened ? c.px : c.px.slice(0, 180);
    const mn = Math.min(...px);
    const mx = Math.max(...px);
    const span = mx - mn || 1;
    const X = (i: number) => 46 + (i / (px.length - 1)) * 286;
    const Y = (p: number) => 88 - ((p - mn) / span) * 76;
    return {
      path: px.map((p, i) => `${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join(" "),
      yTicks: [mx, (mn + mx) / 2, mn].map((p) => ({ y: Y(p), label: "$" + Math.round(p) })),
      days: px.length,
    };
  }, [c, props.widened]);
  const xLabels = [
    { x: 46, label: `${days} days ago`, anchor: "start" as const },
    { x: 189, label: `${Math.round(days / 2)} days ago`, anchor: "middle" as const },
    { x: 332, label: "today", anchor: "end" as const },
  ];
  return (
    <div className="stk-card">
      <svg viewBox="0 0 340 112" style={{ display: "block", width: "100%", height: 170 }} aria-hidden>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={46} x2={332} y1={t.y} y2={t.y} stroke="rgba(90,70,30,0.18)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={42} y={t.y + 3} textAnchor="end" fontSize={9.5} fontWeight={600} fill="#8a7c5c" fontFamily='"Roboto Slab", Georgia, serif'>
              {t.label}
            </text>
          </g>
        ))}
        <line x1={46} x2={332} y1={92} y2={92} stroke="rgba(90,70,30,0.35)" strokeWidth={1.5} />
        {xLabels.map((t, i) => (
          <text key={i} x={t.x} y={106} textAnchor={t.anchor} fontSize={9.5} fontWeight={600} fill="#8a7c5c" fontFamily='"Roboto Slab", Georgia, serif'>
            {t.label}
          </text>
        ))}
        <polyline fill="none" stroke="#3d8c5b" strokeWidth={2.2} points={path} />
      </svg>
      <div className="stk-slab" style={{ fontSize: 13, fontWeight: 600, color: "#8a7c5c", textAlign: "center", paddingTop: 4 }}>
        {props.revealed ? `${c.name} · ${c.blurb}` : "one company you know"}
      </div>
    </div>
  );
}

// ---------------- worth more: the higher-lower chain
// Left is the company you can see the worth of; right is the mystery.
// Right answer: worths show for a beat, then the right company slides
// into the left slot and a new mystery loads. Wrong answer ends the run.

type WorthRun = {
  left: string;
  right: string;
  picked: string | null; // which card was tapped this round
  streak: number;
  over: boolean;
};

const WORTH_POOL = () => Object.keys(COMPANIES).filter((id) => !COMPANIES[id].fund);

function nextChallenger(exclude: string[]): string {
  const pool = WORTH_POOL().filter((id) => !exclude.includes(id));
  return pool[Math.floor(Math.random() * pool.length)];
}

function newWorthRun(): WorthRun {
  const left = nextChallenger([]);
  return { left, right: nextChallenger([left]), picked: null, streak: 0, over: false };
}

function worthBest(): number {
  try { return parseInt(localStorage.getItem("stackv2-worthbest") ?? "0", 10) || 0; } catch { return 0; }
}

function saveWorthBest(n: number): void {
  try { if (n > worthBest()) localStorage.setItem("stackv2-worthbest", String(n)); } catch { /* fine */ }
}

// ---------------- the page

export default function StackPractice() {
  const [s, update] = useStackState();
  const [guessRound, setGuessRound] = useState<GuessRound | null>(null);
  const [worthRun, setWorthRun] = useState<WorthRun | null>(null);
  const [lastPaid, setLastPaid] = useState(false);
  const left = Math.max(0, ARCADE_PAID_PLAYS - s.arc.paidWins);
  const payLine = left
    ? `${left} paid wins left · first guess pays ${money(ARCADE_PAY)} + 1 Buy card`
    : "Paid out today, still fun";

  const settle = (cleanWin: boolean) => {
    if (cleanWin) {
      const { state: ns, paid } = arcadeWin(s);
      update(ns);
      setLastPaid(paid);
    } else {
      update(arcadeLoss(s));
      setLastPaid(false);
    }
  };

  const guess = (id: string) => {
    if (!guessRound || guessRound.solved || guessRound.wrongs.includes(id)) return;
    if (id === guessRound.answer) {
      settle(guessRound.wrongs.length === 0);
      setGuessRound({ ...guessRound, solved: true });
    } else {
      setGuessRound({ ...guessRound, wrongs: [...guessRound.wrongs, id] });
    }
  };

  const pickWorth = (id: string) => {
    if (!worthRun || worthRun.picked || worthRun.over) return;
    const other = id === worthRun.left ? worthRun.right : worthRun.left;
    const win = COMPANIES[id].cap > COMPANIES[other].cap;
    settle(win);
    const streak = win ? worthRun.streak + 1 : worthRun.streak;
    if (!win) saveWorthBest(streak);
    setWorthRun({ ...worthRun, picked: id, streak });
  };

  // right answer: hold the reveal for a beat, then the chain advances
  useEffect(() => {
    if (!worthRun?.picked || worthRun.over) return;
    const other = worthRun.picked === worthRun.left ? worthRun.right : worthRun.left;
    const won = COMPANIES[worthRun.picked].cap > COMPANIES[other].cap;
    const t = setTimeout(() => {
      if (won) {
        setWorthRun({
          left: worthRun.right,
          right: nextChallenger([worthRun.left, worthRun.right]),
          picked: null,
          streak: worthRun.streak,
          over: false,
        });
      } else {
        setWorthRun({ ...worthRun, over: true });
      }
    }, won ? 1600 : 1200);
    return () => clearTimeout(t);
  }, [worthRun]);

  const resultBar = (line: string) => (
    <div
      data-arcresult
      style={{
        borderRadius: 13, padding: "13px 15px", marginTop: 4,
        background: "#3d8c5b", color: FELT.ink,
        boxShadow: `0 5px 0 ${FELT.greenDark}`,
      }}
    >
      <span className="stk-slab" style={{ fontWeight: 700, fontSize: 16.5 }}>{line}</span>
    </div>
  );

  return (
    <FeltPage>
      <TopBar state={s} update={update} active="practice" />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "10px 24px 48px" }}>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "6px 0 2px" }}>Practice</div>
        <div style={{ fontSize: 14, color: FELT.inkDim, marginBottom: 16 }}>Win games, earn cash.</div>

        {!guessRound && !worthRun ? (
          <>
            <div className="stk-card" style={{ marginBottom: 12 }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 18 }}>Guess the Stock</div>
              <div style={{ fontSize: 13.5, color: FELT.cardDim, margin: "3px 0 10px" }}>Name the company from its chart</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: FELT.cardDim }}>{payLine}</span>
                <button
                  className="stk-btn green"
                  data-play
                  style={{ marginLeft: "auto", padding: "9px 20px", fontSize: 14, opacity: s.learned.length ? 1 : 0.5 }}
                  disabled={!s.learned.length}
                  onClick={() => { setGuessRound(newGuessRound(s.learned)); setLastPaid(false); }}
                >
                  {s.learned.length ? "Play" : "Learn first"}
                </button>
              </div>
            </div>
            <div className="stk-card" style={{ marginBottom: 12 }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 18 }}>Worth More</div>
              <div style={{ fontSize: 13.5, color: FELT.cardDim, margin: "3px 0 10px" }}>Tap the company worth more all together</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: FELT.cardDim }}>{payLine}</span>
                <button
                  className="stk-btn green"
                  data-playworth
                  style={{ marginLeft: "auto", padding: "9px 20px", fontSize: 14 }}
                  onClick={() => { setWorthRun(newWorthRun()); setLastPaid(false); }}
                >
                  Play
                </button>
              </div>
            </div>
          </>
        ) : guessRound ? (
          <>
            <ChartOf id={guessRound.answer} revealed={guessRound.solved} widened={guessRound.wrongs.length >= 1} />
            {hintLines(guessRound).length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }} data-hints>
                {hintLines(guessRound).map((line, i) => (
                  <div key={i} className="stk-glass stk-drop" style={{ padding: "8px 13px", fontSize: 13.5 }}>
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ height: 12 }} />
            {guessRound.options.map((id) => {
              const wrong = guessRound.wrongs.includes(id);
              const state = guessRound.solved
                ? id === guessRound.answer ? "right" : "dim"
                : wrong ? "wrong" : "idle";
              return (
                <div
                  key={id}
                  className="stk-card"
                  data-guess={id}
                  data-c={id === guessRound.answer ? 1 : 0}
                  onClick={state === "idle" ? () => guess(id) : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
                    cursor: state === "idle" ? "pointer" : "default",
                    opacity: state === "dim" || state === "wrong" ? 0.55 : 1,
                    outline: state === "right" ? "3.5px solid #3d8c5b" : state === "wrong" ? "3.5px solid #c05545" : undefined,
                  }}
                >
                  {pieceEl(COMPANIES[id].color, 32, COMPANIES[id].name[0])}
                  <span className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>{COMPANIES[id].name}</span>
                </div>
              );
            })}
            {guessRound.solved ? (
              <>
                {resultBar(
                  guessRound.wrongs.length === 0
                    ? lastPaid ? `+${money(ARCADE_PAY)} and a Buy card` : "Right, first try."
                    : `Right, with ${guessRound.wrongs.length} ${guessRound.wrongs.length > 1 ? "hints" : "hint"}.`,
                )}
                <button className="stk-btn green" data-again style={{ width: "100%", marginTop: 12 }} onClick={() => { setGuessRound(newGuessRound(s.learned)); setLastPaid(false); }}>
                  Play again
                </button>
              </>
            ) : null}
            <button className="stk-btn quiet" data-backarc style={{ width: "100%", marginTop: 10 }} onClick={() => setGuessRound(null)}>
              Back
            </button>
          </>
        ) : worthRun ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px" }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 21 }}>Which whole company is worth more?</div>
              <span className="stk-chip" data-worthstreak style={{ marginLeft: "auto", cursor: "default" }}>streak {worthRun.streak}</span>
              {worthBest() > 0 ? (
                <span className="stk-chip" style={{ cursor: "default", background: "rgba(0,0,0,0.16)" }}>best {worthBest()}</span>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[worthRun.left, worthRun.right].map((id, slot) => {
                const c = COMPANIES[id];
                const other = COMPANIES[id === worthRun.left ? worthRun.right : worthRun.left];
                const isHigher = c.cap > other.cap;
                const picked = worthRun.picked;
                const revealed = slot === 0 || picked !== null;
                const state = !picked ? "idle" : isHigher ? "right" : id === picked ? "wrong" : "dim";
                return (
                  <div
                    key={`${id}-${slot}`}
                    className="stk-card"
                    data-worth={id}
                    data-c={isHigher ? 1 : 0}
                    onClick={state === "idle" ? () => pickWorth(id) : undefined}
                    style={{
                      flex: 1, textAlign: "center", padding: "26px 16px 22px",
                      cursor: state === "idle" ? "pointer" : "default",
                      opacity: state === "dim" || state === "wrong" ? 0.6 : 1,
                      outline: state === "right" ? "3.5px solid #3d8c5b" : state === "wrong" ? "3.5px solid #c05545" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>{pieceEl(c.color, 54, c.name[0])}</div>
                    <div className="stk-slab" style={{ fontWeight: 700, fontSize: 18, marginTop: 10 }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: FELT.cardDim, marginTop: 3 }}>{c.blurb}</div>
                    <div className="stk-slab" style={{ fontWeight: 700, fontSize: 17, marginTop: 12, minHeight: 22, color: state === "right" ? FELT.upInk : FELT.cardInk }}>
                      {revealed ? moneyBig(c.cap) : "?"}
                    </div>
                  </div>
                );
              })}
            </div>
            {worthRun.picked && !worthRun.over &&
            COMPANIES[worthRun.picked].cap > COMPANIES[worthRun.picked === worthRun.left ? worthRun.right : worthRun.left].cap
              ? resultBar(lastPaid ? `+${money(ARCADE_PAY)} and a Buy card` : "Right.")
              : null}
            {worthRun.over ? (
              <>
                <div
                  data-worthover
                  style={{
                    borderRadius: 13, padding: "14px 16px", marginTop: 4, textAlign: "center",
                    background: "rgba(0,0,0,0.25)", color: FELT.ink,
                  }}
                >
                  <div className="stk-slab" style={{ fontWeight: 700, fontSize: 20 }}>Run over</div>
                  <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                    streak {worthRun.streak} · best {worthBest()}
                  </div>
                </div>
                <button className="stk-btn green" data-again style={{ width: "100%", marginTop: 12 }} onClick={() => setWorthRun(newWorthRun())}>
                  Play again
                </button>
              </>
            ) : null}
            <button className="stk-btn quiet" data-backarc style={{ width: "100%", marginTop: 10 }} onClick={() => setWorthRun(null)}>
              Back
            </button>
          </>
        ) : null}
      </main>
    </FeltPage>
  );
}
