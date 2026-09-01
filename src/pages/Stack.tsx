// Stack, home: Duolingo's desktop frame in the felt skin. Center is the
// lesson path, the right sidebar surfaces the other rooms, and starting
// a lesson takes over the whole frame with the real engine.
// Contract: docs/stack-desktop-spec.md.

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  COMPANIES, FRIENDS, L1_PREPAY, LESSON_DEAL, StackState, REVIEW_PAY, ARCADE_PAY,
  ARCADE_PAID_PLAYS, dealCards, lessonKey, lotsOf, money, nextLesson, priceAt, unitUnlocked,
} from "../lib/stack/model";
import { unopenedChest } from "../lib/stack/model";
import { UNITS_CONTENT } from "../content/stackContent";
import { BillsGlyph, FELT, FeltPage, pieceEl } from "../components/stack/kit";
import { TopBar, useStackState } from "../components/stack/TopBar";
import Lesson, { ChestCeremony } from "../components/stack/Lesson";

function Sidebar(props: { state: StackState }) {
  const s = props.state;
  const held = Object.keys(s.lots);
  const left = Math.max(0, ARCADE_PAID_PLAYS - s.arc.paidWins);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="stk-glass" data-side="stocks">
        <Link to="/stack/desk" style={{ textDecoration: "none", color: FELT.ink }}>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 8 }}>Your stocks</div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
          <BillsGlyph />
          <span style={{ fontSize: 13.5 }}>Cash</span>
          <b className="stk-slab" style={{ marginLeft: "auto", fontSize: 13.5 }}>{money(s.cash)}</b>
        </div>
        {held.length === 0 ? (
          <div style={{ fontSize: 13, color: FELT.inkDim, padding: "4px 0" }}>Lessons pay.</div>
        ) : (
          held.map((id) => {
            const c = COMPANIES[id];
            const n = lotsOf(s, id).length;
            const p = priceAt(id, s.day);
            const y = priceAt(id, Math.max(1, s.day - 1));
            const chg = (p / y - 1) * 100;
            return (
              <Link key={id} to="/stack/desk" style={{ textDecoration: "none", color: FELT.ink, display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
                {pieceEl(c.color, 26, c.name[0])}
                <span style={{ fontSize: 13.5 }}>{c.name} · {n}</span>
                <span style={{ marginLeft: "auto", textAlign: "right" }}>
                  <b className="stk-slab" style={{ fontSize: 13.5, display: "block" }}>{money(p)}</b>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: chg >= 0 ? FELT.up : FELT.dn }}>
                    {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </div>

      <div className="stk-glass" data-side="practice">
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>Practice</div>
        <div style={{ fontSize: 13.5, margin: "6px 0 2px" }}>Guess the Stock</div>
        <div style={{ fontSize: 12.5, color: FELT.inkDim, marginBottom: 10 }}>
          {left ? `${left} paid wins left · ${money(ARCADE_PAY)} + 1 Buy card each` : "Paid out today"}
        </div>
        <Link to="/stack/practice" className="stk-btn green" style={{ textDecoration: "none", padding: "9px 18px", fontSize: 13.5 }}>Play</Link>
      </div>

      <div className="stk-glass" data-side="friends">
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 8 }}>Friends</div>
        {FRIENDS.map((f) => {
          const w = f.worth[s.day - 1];
          return (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0" }}>
              {pieceEl("cream", 26, f.name[0])}
              <span style={{ fontSize: 13.5 }}>{f.name}</span>
              <span style={{ marginLeft: "auto", textAlign: "right" }}>
                <b className="stk-slab" style={{ fontSize: 13.5, display: "block" }}>{money(w)}</b>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: FELT.up }}>
                  {f.streakBase + s.day} day streak
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Stack() {
  const [s, update] = useStackState();
  const [active, setActive] = useState<{ u: number; l: number } | null>(null);
  const [chestOpen, setChestOpen] = useState(false);
  const waitingChest = unopenedChest(s);

  const startLesson = (u: number, l: number) => {
    const lesson = UNITS_CONTENT[u].lessons[l];
    const done = !!s.done[lessonKey(u, l)];
    if (lesson.prepay && !done) {
      // lesson 1 pays and deals its first cards up front, single-fire here
      let ns = { ...s, cash: Math.round((s.cash + L1_PREPAY) * 100) / 100 };
      ns = dealCards(ns, LESSON_DEAL);
      update(ns);
    }
    setActive({ u, l });
  };

  return (
    <FeltPage>
      <TopBar state={s} update={update} active="learn" />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "10px 24px 48px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 28, alignItems: "start" }}>
        <div>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "6px 0 2px" }}>Learn</div>
          <div style={{ fontSize: 14, color: FELT.inkDim, marginBottom: 14 }}>Learn daily. Own what you learn.</div>
          {waitingChest && !active ? (
            <button
              className="stk-btn"
              data-chestwaiting
              style={{ width: "100%", margin: "4px 0 12px" }}
              onClick={() => setChestOpen(true)}
            >
              A chest is waiting. Open it.
            </button>
          ) : null}
          {typeof s.dayChg === "number" && Math.abs(s.dayChg) > 0.005 && s.day > 1 ? (
            <div data-banner style={{ background: s.dayChg >= 0 ? "#dff0e2" : "#f6ded9", color: s.dayChg >= 0 ? "#1d4a2b" : FELT.redDark, borderRadius: 12, padding: "12px 15px", fontSize: 14.5, margin: "8px 0 14px", boxShadow: "0 4px 0 rgba(0,0,0,0.25)" }}>
              Overnight your stocks {s.dayChg >= 0 ? "grew" : "fell"} {money(Math.abs(s.dayChg))}.
              {s.lastReport.map((line, i) => (
                <div key={i} style={{ fontSize: 13, marginTop: 4 }}>{line.text}</div>
              ))}
            </div>
          ) : null}
          {UNITS_CONTENT.map((unit, u) => {
            const unlocked = unitUnlocked(s, u);
            const next = unlocked ? nextLesson(s, u) : -2;
            return (
              <div key={unit.name}>
                <div className="stk-card" style={{ margin: "12px 0" }}>
                  <div style={{ fontSize: 12.5, color: "#8a7c5c", fontWeight: 600 }}>Unit {u + 1}</div>
                  <div className="stk-slab" style={{ fontWeight: 700, fontSize: 18 }}>{unit.name}</div>
                  <div style={{ fontSize: 13, color: FELT.cardDim }}>{unit.sub}</div>
                </div>
                {unit.lessons.map((l, i) => {
                  const done = !!s.done[lessonKey(u, i)];
                  const isNext = unlocked && next === i;
                  const open = done || isNext;
                  return (
                    <div
                      key={l.title}
                      className={`stk-node${open ? "" : " lock"}`}
                      data-node={`${u}-${i}`}
                      onClick={open ? () => startLesson(u, i) : undefined}
                    >
                      {done
                        ? pieceEl("cream", 40, "✓")
                        : isNext
                          ? pieceEl("red", 40, "▶")
                          : <span className="stk-pc" style={{ width: 40, height: 40, background: "rgba(0,0,0,0.24)" }} />}
                      <div>
                        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>{l.title}</div>
                        <div style={{ fontSize: 13, color: FELT.inkDim }}>
                          {done
                            ? `Review pays ${money(REVIEW_PAY)}`
                            : l.meet.length
                              ? `Meet ${l.meet.map((id) => COMPANIES[id].name).join(" and ")}`
                              : l.sub ?? "The capstone"}
                        </div>
                      </div>
                      {isNext ? (
                        <span className="stk-slab" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 14, color: "#a7e3bc" }}>Start</span>
                      ) : done ? (
                        <span className="stk-slab" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 14, color: "rgba(242,233,210,0.5)" }}>Review</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <Sidebar state={s} />
      </main>
      {active ? (
        <Lesson
          u={active.u}
          l={active.l}
          state={s}
          update={update}
          onExit={() => setActive(null)}
        />
      ) : null}
      {chestOpen && waitingChest ? (
        <div style={{ position: "fixed", inset: 0, background: FELT.bg, zIndex: 40, display: "flex", flexDirection: "column" }}>
          <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "18px 24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
            <ChestCeremony key={waitingChest} chest={waitingChest} state={s} update={update} onDone={() => setChestOpen(false)} />
          </div>
        </div>
      ) : null}
    </FeltPage>
  );
}
