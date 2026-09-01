// Practice: the arcade in the felt skin. Guess the Stock first: name the
// company from 180 days of its chart. The first paid wins of the day pay
// cash and deal a Buy card; after that it keeps score for fun.
// Contract: docs/stack-desktop-spec.md.

import { useMemo, useState } from "react";
import {
  ARCADE_PAID_PLAYS, ARCADE_PAY, COMPANIES, arcadeLoss, arcadeWin, money,
} from "../lib/stack/model";
import { FELT, FeltPage, pieceEl } from "../components/stack/kit";
import { TopBar, useStackState } from "../components/stack/TopBar";

type Round = { answer: string; options: string[] };

function newRound(learned: string[]): Round {
  const answer = learned[Math.floor(Math.random() * learned.length)];
  const others = Object.keys(COMPANIES).filter((id) => id !== answer);
  const wrong: string[] = [];
  while (wrong.length < 2) {
    const w = others[Math.floor(Math.random() * others.length)];
    if (!wrong.includes(w)) wrong.push(w);
  }
  const options = [answer, ...wrong].sort(() => Math.random() - 0.5);
  return { answer, options };
}

function ChartOf(props: { id: string; revealed: boolean }) {
  const c = COMPANIES[props.id];
  const pts = useMemo(() => {
    const px = c.px.slice(0, 180);
    const mx = Math.max(...px);
    const mn = Math.min(...px);
    return px
      .map((p, i) => `${((i / (px.length - 1)) * 300).toFixed(1)},${(80 - ((p - mn) / (mx - mn || 1)) * 72 + 4).toFixed(1)}`)
      .join(" ");
  }, [c]);
  return (
    <div className="stk-card">
      <svg viewBox="0 0 300 88" style={{ display: "block", width: "100%", height: 130 }} aria-hidden>
        <polyline fill="none" stroke="#3d8c5b" strokeWidth={2.5} points={pts} />
      </svg>
      <div className="stk-slab" style={{ fontSize: 13, fontWeight: 600, color: "#8a7c5c", textAlign: "center", paddingTop: 4 }}>
        {props.revealed ? `${c.name} · ${c.blurb}` : "180 days of one company you know"}
      </div>
    </div>
  );
}

export default function StackPractice() {
  const [s, update] = useStackState();
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [lastPaid, setLastPaid] = useState(false);
  const left = Math.max(0, ARCADE_PAID_PLAYS - s.arc.paidWins);

  const start = () => {
    if (!s.learned.length) return;
    setRound(newRound(s.learned));
    setPicked(null);
  };

  return (
    <FeltPage>
      <TopBar state={s} update={update} active="practice" />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "10px 24px 48px" }}>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "6px 0 2px" }}>Practice</div>
        <div style={{ fontSize: 14, color: FELT.inkDim, marginBottom: 16 }}>Win games, earn cash.</div>

        {!round ? (
          <>
            <div className="stk-card" style={{ marginBottom: 12 }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 18 }}>Guess the Stock</div>
              <div style={{ fontSize: 13.5, color: FELT.cardDim, margin: "3px 0 10px" }}>Name the company from its chart</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: FELT.cardDim }}>
                  {left ? `${left} paid wins left · ${money(ARCADE_PAY)} + 1 Buy card each` : "Paid out today, still fun"}
                </span>
                <button
                  className="stk-btn green"
                  data-play
                  style={{ marginLeft: "auto", padding: "9px 20px", fontSize: 14, opacity: s.learned.length ? 1 : 0.5 }}
                  disabled={!s.learned.length}
                  onClick={start}
                >
                  {s.learned.length ? "Play" : "Learn first"}
                </button>
              </div>
            </div>
            <div className="stk-card" style={{ opacity: 0.6, marginBottom: 12 }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16 }}>Worth More</div>
              <div style={{ fontSize: 13, color: FELT.cardDim }}>Soon</div>
            </div>
            <div className="stk-card" style={{ opacity: 0.6 }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16 }}>Time Machine</div>
              <div style={{ fontSize: 13, color: FELT.cardDim }}>Soon</div>
            </div>
          </>
        ) : (
          <>
            <ChartOf id={round.answer} revealed={picked !== null} />
            <div style={{ height: 12 }} />
            {round.options.map((id) => {
              const state =
                picked === null ? "idle" : id === round.answer ? "right" : id === picked ? "wrong" : "dim";
              return (
                <div
                  key={id}
                  className="stk-card"
                  data-guess={id}
                  onClick={
                    picked === null
                      ? () => {
                          setPicked(id);
                          if (id === round.answer) {
                            const { state: ns, paid } = arcadeWin(s);
                            update(ns);
                            setLastPaid(paid);
                          } else {
                            update(arcadeLoss(s));
                            setLastPaid(false);
                          }
                        }
                      : undefined
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                    cursor: picked === null ? "pointer" : "default",
                    opacity: state === "dim" ? 0.55 : 1,
                    outline: state === "right" ? "3.5px solid #3d8c5b" : state === "wrong" ? "3.5px solid #c05545" : undefined,
                  }}
                >
                  {pieceEl(COMPANIES[id].color, 32, COMPANIES[id].name[0])}
                  <span className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>{COMPANIES[id].name}</span>
                </div>
              );
            })}
            {picked !== null ? (
              <>
                <div
                  data-arcresult
                  style={{
                    borderRadius: 13, padding: "13px 15px", marginTop: 4,
                    background: picked === round.answer ? "#3d8c5b" : "#c05545",
                    color: picked === round.answer ? FELT.ink : "#fff",
                    boxShadow: `0 5px 0 ${picked === round.answer ? FELT.greenDark : FELT.redDark}`,
                  }}
                >
                  <span className="stk-slab" style={{ fontWeight: 700, fontSize: 16.5 }}>
                    {picked === round.answer
                      ? lastPaid
                        ? `+${money(ARCADE_PAY)} and a Buy card`
                        : "Right."
                      : `It was ${COMPANIES[round.answer].name}.`}
                  </span>
                </div>
                <button className="stk-btn green" data-again style={{ width: "100%", marginTop: 12 }} onClick={start}>
                  Play again
                </button>
              </>
            ) : null}
            <button className="stk-btn quiet" data-backarc style={{ width: "100%", marginTop: 10 }} onClick={() => setRound(null)}>
              Back
            </button>
          </>
        )}
      </main>
    </FeltPage>
  );
}
