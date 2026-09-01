// Stack, home: Duolingo's desktop frame in the felt skin. Center is the
// lesson path, the right sidebar surfaces the other rooms, and starting
// a lesson takes over the whole frame. Contract: docs/stack-desktop-spec.md.
//
// Checkpoint build: the lesson takeover renders its items statically for
// the look-pass; the engine (scoring, pay, requeue) wires in next.

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  COMPANIES, FRIENDS, StackState, REVIEW_PAY, ARCADE_PAY, ARCADE_PAID_PLAYS,
  lessonKey, lotsOf, money, nextLesson, priceAt, unitUnlocked,
} from "../lib/stack/model";
import { ContentItem, LESSON1, UNITS_CONTENT } from "../content/stackContent";
import { BillsGlyph, ChartPic, FELT, FeltPage, pieceEl } from "../components/stack/kit";
import { TopBar, useStackState } from "../components/stack/TopBar";

// ---------------- static item previews (the look, not the logic)

function TeachPicPreview(props: { pic: string }) {
  const p = props.pic;
  if (p === "two-rides" || p === "week-vs-decade") {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div className="stk-card"><ChartPic kind="wild" />{p === "week-vs-decade" && <Cap t="one week" />}</div>
        <div className="stk-card"><ChartPic kind={p === "two-rides" ? "calm" : "up"} />{p === "week-vs-decade" && <Cap t="ten years" />}</div>
      </div>
    );
  }
  if (p === "two-stands") {
    return (
      <div className="stk-card" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        {pieceEl("cream", 60, "$40")}
        {pieceEl("cream", 60, "$80")}
      </div>
    );
  }
  if (p === "recap-pieces") {
    return (
      <div className="stk-card" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {(["red", "slate", "black", "cream", "gold"] as const).map((c) => (
          <span key={c}>{pieceEl(c, 44)}</span>
        ))}
      </div>
    );
  }
  if (p === "gold-piece") {
    return <div className="stk-card" style={{ display: "flex", justifyContent: "center" }}>{pieceEl("gold", 52)}</div>;
  }
  if (p === "fund-equals") {
    return (
      <div className="stk-card" style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
        {pieceEl("gold", 58)}
        <span className="stk-slab" style={{ fontSize: 20, color: "#8a7c5c" }}>=</span>
        <div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "3px 0" }}>
            {(["red", "slate", "black", "cream", "red"] as const).map((c, i) => (
              <span key={i}>{pieceEl(c, 19)}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "3px 0" }}>
            {(["slate", "cream", "red", "black", "slate"] as const).map((c, i) => (
              <span key={i}>{pieceEl(c, 19)}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  // live-price, fee-leak and the rest: one chart card
  return <div className="stk-card"><ChartPic kind={p === "fee-leak" ? "up" : "calm"} height={56} /><Cap t={p === "fee-leak" ? "same fund, 2% fee" : "$69.85"} /></div>;
}

function Cap(props: { t: string }) {
  return <div className="stk-slab" style={{ fontSize: 13, fontWeight: 600, color: "#8a7c5c", textAlign: "center", paddingTop: 4 }}>{props.t}</div>;
}

function ItemPreview(props: { item: ContentItem; onNext: () => void }) {
  const it = props.item;
  if (it.type === "teach") {
    return (
      <>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 30, margin: "4px 2px 14px" }}>{it.word}</div>
        <TeachPicPreview pic={it.pic} />
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16.5, textAlign: "center", padding: "16px 0 4px" }}>{it.line}</div>
        <div style={{ marginTop: "auto" }} />
        <button className="stk-btn green" style={{ width: "100%" }} onClick={props.onNext}>Got it</button>
      </>
    );
  }
  if (it.type === "paydrop") {
    return (
      <div style={{ textAlign: "center", marginTop: 40, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 14.5, color: FELT.inkDim, marginBottom: 10 }}>{LESSON1.paySub}</div>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 56 }}>$80.00</div>
        <div style={{ display: "flex", gap: 7, justifyContent: "center", padding: "20px 0 6px" }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ display: "inline-flex", width: 56, height: 26, borderRadius: 4, background: "#4d9d67", border: "1.5px solid rgba(0,0,0,0.22)", boxShadow: "0 2.5px 0 rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" }}>
              <b className="stk-slab" style={{ fontSize: 13, color: "#f7f2e2" }}>$20</b>
            </span>
          ))}
        </div>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16.5, padding: "10px 0" }}>{LESSON1.payLine}</div>
        <div style={{ marginTop: "auto" }} />
        <button className="stk-btn green" style={{ width: "100%" }} onClick={props.onNext}>Take it</button>
      </div>
    );
  }
  if (it.type === "firstbuy") {
    const rows = [
      { id: "nke", can: true },
      { id: "pfe", can: true },
      { id: "aapl", can: false },
    ];
    return (
      <>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "4px 2px 14px" }}>{it.q}</div>
        {rows.map((r) => {
          const c = COMPANIES[r.id];
          return (
            <div key={r.id} className="stk-card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 11, opacity: r.can ? 1 : 0.55, cursor: r.can ? "pointer" : "default" }} onClick={r.can ? props.onNext : undefined}>
              {pieceEl(c.color, 48, c.name[0])}
              <div>
                <div className="stk-slab" style={{ fontWeight: 700, fontSize: 17 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: FELT.cardDim }}>{c.blurb}</div>
              </div>
              <b className="stk-slab" style={{ marginLeft: "auto", fontSize: 15.5, textAlign: "right" }}>
                {money(c.px[0])}
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: r.can ? FELT.upInk : "#8a7c5c" }}>{r.can ? "yours today" : "save up"}</span>
              </b>
            </div>
          );
        })}
      </>
    );
  }
  if (it.type === "choice") {
    return (
      <>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "4px 2px 14px" }}>{it.q}</div>
        {it.options.map((o, i) => (
          <div key={i} className="stk-card" style={{ marginBottom: 11, cursor: "pointer" }} onClick={props.onNext}>
            {typeof o === "string" ? (
              <span className="stk-slab" style={{ fontWeight: 600, fontSize: 15.5 }}>{o}</span>
            ) : (
              <>
                <ChartPic kind={o.pic === "gold-piece" ? "calm" : o.pic} />
                {o.caption ? <Cap t={o.caption} /> : null}
              </>
            )}
          </div>
        ))}
      </>
    );
  }
  // other kinds get their real desktop stage in the engine pass
  return (
    <>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "4px 2px 14px" }}>
        {"q" in it ? (it as { q: string }).q : ""}
      </div>
      <div className="stk-card"><ChartPic kind="calm" height={64} /></div>
      <div style={{ marginTop: "auto" }} />
      <button className="stk-btn green" style={{ width: "100%" }} onClick={props.onNext}>Continue</button>
    </>
  );
}

function LessonPreview(props: { u: number; l: number; onClose: () => void }) {
  const lesson = UNITS_CONTENT[props.u].lessons[props.l];
  const [idx, setIdx] = useState(0);
  const item = lesson.items[idx];
  const pct = Math.round(((idx + 1) / lesson.items.length) * 100);
  const next = () => {
    if (idx + 1 >= lesson.items.length) props.onClose();
    else setIdx(idx + 1);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: FELT.bg, zIndex: 40, display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "22px 24px 0", display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="26" height="26" viewBox="0 0 26 26" style={{ opacity: 0.6, cursor: "pointer", flex: "none" }} onClick={props.onClose} data-quit>
          <path d="M6 6 L20 20 M20 6 L6 20" stroke={FELT.ink} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ flex: 1, height: 12, borderRadius: 999, background: "rgba(0,0,0,0.3)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: FELT.gold, boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)", transition: "width 0.35s ease" }} />
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "18px 24px 28px", flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <ItemPreview item={item} onNext={next} />
      </div>
    </div>
  );
}

// ---------------- sidebar

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
          {left ? `${left} paid wins left · ${money(ARCADE_PAY)} each` : "Paid out today"}
        </div>
        <Link to="/guess" className="stk-btn green" style={{ textDecoration: "none", padding: "9px 18px", fontSize: 13.5 }}>Play</Link>
      </div>

      <div className="stk-glass" data-side="friends">
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 8 }}>Friends</div>
        {FRIENDS.map((f) => {
          const w = f.worth[s.day - 1];
          const y = f.worth[Math.max(0, s.day - 2)];
          const chg = (w / y - 1) * 100;
          return (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0" }}>
              {pieceEl("cream", 26, f.name[0])}
              <span style={{ fontSize: 13.5 }}>{f.name}</span>
              <span style={{ marginLeft: "auto", textAlign: "right" }}>
                <b className="stk-slab" style={{ fontSize: 13.5, display: "block" }}>{money(w)}</b>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: chg >= 0 ? FELT.up : FELT.dn }}>
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

// ---------------- the page

export default function Stack() {
  const [s, update] = useStackState();
  const [preview, setPreview] = useState<{ u: number; l: number } | null>(null);

  return (
    <FeltPage>
      <TopBar state={s} update={update} active="learn" />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "10px 24px 48px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 28, alignItems: "start" }}>
        <div>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "6px 0 2px" }}>Learn</div>
          <div style={{ fontSize: 14, color: FELT.inkDim, marginBottom: 14 }}>Learn daily. Own what you learn.</div>
          {typeof s.dayChg === "number" && Math.abs(s.dayChg) > 0.005 && s.day > 1 ? (
            <div style={{ background: s.dayChg >= 0 ? "#dff0e2" : "#f6ded9", color: s.dayChg >= 0 ? "#1d4a2b" : FELT.redDark, borderRadius: 12, padding: "12px 15px", fontSize: 14.5, margin: "8px 0 14px", boxShadow: "0 4px 0 rgba(0,0,0,0.25)" }}>
              Overnight your stocks {s.dayChg >= 0 ? "grew" : "fell"} {money(Math.abs(s.dayChg))}.
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
                      onClick={open ? () => setPreview({ u, l: i }) : undefined}
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
      {preview ? <LessonPreview u={preview.u} l={preview.l} onClose={() => setPreview(null)} /> : null}
    </FeltPage>
  );
}
