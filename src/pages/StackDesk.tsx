// The Desk: Stack's profile page IS the trading desk. Your chip stacks
// on the felt shelf, your hand of strategy cards below, a small worth
// chart beside. All trading is card play; the checkpoint build shows the
// desk and the hand, and the card actions wire in with the engine pass.
// Contract: docs/stack-desktop-spec.md.

import { useMemo, useState } from "react";
import {
  CardId, COMPANIES, FRIENDS, StackState, hasCard, lotsOf, money, priceAt, putIn,
} from "../lib/stack/model";
import { CONCEPT_CARDS } from "../content/stackContent";
import { FELT, FeltPage, StrategyCard, pieceEl } from "../components/stack/kit";
import { TopBar, useStackState } from "../components/stack/TopBar";

type Subtab = "desk" | "friends" | "collection";

// worth of the stocks you held at each day so far, against what you had
// put in by then; cash stays out so deposits never read as growth
function seriesFor(s: StackState): { worth: number[]; putin: number[] } {
  const worth: number[] = [];
  const putin: number[] = [];
  for (let d = 1; d <= s.day; d++) {
    let w = 0;
    let p = 0;
    for (const id of Object.keys(s.lots)) {
      for (const lot of lotsOf(s, id)) {
        if (lot.d <= d) {
          w += priceAt(id, d);
          p += lot.p;
        }
      }
    }
    worth.push(w);
    putin.push(p);
  }
  return { worth, putin };
}

function WorthChart(props: { state: StackState }) {
  const { worth, putin } = useMemo(() => seriesFor(props.state), [props.state]);
  const all = worth.concat(putin);
  const hi = Math.max(...all, 1);
  const lo = Math.min(...all, 0);
  const span = Math.max(hi - lo, 1);
  const W = 300;
  const H = 92;
  const x = (i: number) => (worth.length === 1 ? W / 2 : (i / (worth.length - 1)) * W);
  const y = (v: number) => H - 8 - ((v - lo) / span) * (H - 20);
  const line = (arr: number[]) => arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const diff = worth[worth.length - 1] - putin[putin.length - 1];
  return (
    <div className="stk-glass" data-worthchart>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 4 }}>Your stocks over time</div>
      <div style={{ fontSize: 12.5, color: FELT.inkDim, marginBottom: 8 }}>
        {money(worth[worth.length - 1])} on {money(putin[putin.length - 1])} put in
        {Math.abs(diff) > 0.005 ? (
          <span style={{ color: diff >= 0 ? FELT.up : FELT.dn }}> · {diff >= 0 ? "up" : "down"} {money(Math.abs(diff))}</span>
        ) : null}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: 88 }} aria-hidden>
        <polyline fill="none" stroke="rgba(242,233,210,0.55)" strokeWidth={2} strokeDasharray="6 5" points={line(putin)} />
        <polyline fill="none" stroke="#8fd8a8" strokeWidth={2.5} points={line(worth)} />
      </svg>
      <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: FELT.inkDim, paddingTop: 4 }}>
        <span><span style={{ display: "inline-block", width: 16, height: 3, background: "#8fd8a8", borderRadius: 2, verticalAlign: "middle", marginRight: 5 }} />worth</span>
        <span><span style={{ display: "inline-block", width: 16, height: 3, background: "rgba(242,233,210,0.55)", borderRadius: 2, verticalAlign: "middle", marginRight: 5, borderBottom: "1px dashed transparent" }} />put in</span>
      </div>
    </div>
  );
}

function Shelf(props: {
  state: StackState;
  sel: string | null;
  picks: number[];
  onStack: (id: string) => void;
  onLot: (id: string, i: number) => void;
}) {
  const s = props.state;
  const held = Object.keys(s.lots);
  const bills = Math.max(1, Math.min(10, Math.round(s.cash / 25)));
  return (
    <div style={{ background: "rgba(0,0,0,0.16)", borderRadius: 18, padding: "20px 12px 26px", boxShadow: "inset 0 3px 10px rgba(0,0,0,0.28)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-evenly", minHeight: 210 }} data-shelf>
        {held.map((id) => {
          const c = COMPANIES[id];
          const ls = lotsOf(s, id);
          const p = priceAt(id, s.day);
          const yv = priceAt(id, Math.max(1, s.day - 1));
          const chg = (p / yv - 1) * 100;
          const selected = props.sel === id;
          return (
            <div
              key={id}
              className={`stk-col${selected ? " sel" : ""}`}
              data-stack={id}
              onClick={() => props.onStack(id)}
            >
              <div className="stk-tag">
                {c.name}
                <div style={{ fontSize: 11, fontWeight: 600, color: chg >= 0 ? FELT.up : FELT.dn }}>
                  {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                </div>
              </div>
              <div className="stk-discs">
                {ls.map((lot, i) => (
                  <span
                    key={i}
                    className={`stk-disc ${c.color}${i === ls.length - 1 ? " cap" : ""}${selected && props.picks.includes(i) ? " pick" : ""}`}
                    data-lot={`${id}:${i}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onLot(id, i);
                    }}
                  >
                    <b>{money(lot.p)}</b>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {held.length === 0 ? (
          <div className="stk-col" style={{ cursor: "default" }}>
            <div className="stk-tag" style={{ opacity: 0.7 }}>Lessons pay</div>
            <div className="stk-discs">
              <span className="stk-disc ghost" />
              <span className="stk-disc ghost" />
              <span className="stk-disc ghost" />
            </div>
          </div>
        ) : null}
        <div className="stk-col" style={{ cursor: "default" }} data-cashcol>
          <div className="stk-tag">
            Cash
            <div style={{ fontSize: 11, fontWeight: 600 }}>{money(s.cash)}</div>
          </div>
          <div className="stk-discs">
            {Array.from({ length: bills }, (_, i) => (
              <span key={i} className="stk-bill" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hand(props: { state: StackState; active: CardId | null; onCard: (c: CardId) => void }) {
  const s = props.state;
  return (
    <div data-hand>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16, margin: "20px 2px 12px" }}>Your cards</div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        {(["buy", "sell"] as CardId[]).map((id) =>
          hasCard(s, id) ? (
            <StrategyCard key={id} id={id} active={props.active === id} onClick={() => props.onCard(id)} />
          ) : (
            <StrategyCard key={id} id={id} locked lockLabel="Lesson 1" />
          ),
        )}
        {hasCard(s, "schedule") ? (
          <StrategyCard id="schedule" active={props.active === "schedule"} onClick={() => props.onCard("schedule")} />
        ) : (
          <StrategyCard id="schedule" locked lockLabel="Unit 1 chest" />
        )}
        {hasCard(s, "the500") ? (
          <StrategyCard id="the500" active={props.active === "the500"} onClick={() => props.onCard("the500")} />
        ) : (
          <StrategyCard id="the500" locked lockLabel="Unit 2 chest" />
        )}
        {hasCard(s, "options") ? (
          <StrategyCard id="options" active={props.active === "options"} onClick={() => props.onCard("options")} />
        ) : (
          <StrategyCard id="options" locked lockLabel="The last chest" />
        )}
      </div>
    </div>
  );
}

function FriendsTab(props: { state: StackState }) {
  const s = props.state;
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ fontSize: 14, color: FELT.inkDim, margin: "2px 0 14px" }}>Same paychecks, different choices.</div>
      {FRIENDS.map((f) => {
        const w = f.worth[s.day - 1];
        const y = f.worth[Math.max(0, s.day - 2)];
        const chg = (w / y - 1) * 100;
        return (
          <div key={f.name} className="stk-card" style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 10 }}>
            {pieceEl("cream", 40, f.name[0])}
            <div>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>{f.name}</div>
              <div style={{ fontSize: 13, color: FELT.cardDim }}>{money(w)} · {f.streakBase + s.day} day streak</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ display: "flex", gap: 7, alignItems: "flex-end", justifyContent: "flex-end" }}>
                {f.stacks.map(([color, n], i) => (
                  <span key={i} style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center" }}>
                    {Array.from({ length: n }, (_, j) => (
                      <span key={j} className={`stk-disc mini ${color}`} />
                    ))}
                  </span>
                ))}
              </div>
              <div className="stk-slab" style={{ fontSize: 12.5, fontWeight: 600, color: chg >= 0 ? FELT.upInk : FELT.dnInk }}>
                {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CollectionTab(props: { state: StackState }) {
  const s = props.state;
  const conceptIds = Object.keys(CONCEPT_CARDS);
  return (
    <div>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16, margin: "2px 2px 10px" }}>Concept cards</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, maxWidth: 700 }}>
        {conceptIds.map((id) => {
          const def = CONCEPT_CARDS[id];
          const owned = s.conceptCards.includes(id);
          return owned ? (
            <div key={id} className="stk-card" style={{ padding: "12px 13px" }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 14.5 }}>{def.name}</div>
              <div style={{ fontSize: 12, color: FELT.cardDim, marginTop: 3 }}>{def.line}</div>
            </div>
          ) : (
            <div key={id} className="stk-glass" style={{ padding: "12px 13px", border: "2px dashed rgba(242,233,210,0.25)", boxShadow: "none" }}>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 14.5, color: "rgba(242,233,210,0.4)" }}>?</div>
              <div style={{ fontSize: 12, color: "rgba(242,233,210,0.4)", marginTop: 3 }}>Unit {def.unit + 1} chest</div>
            </div>
          );
        })}
      </div>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16, margin: "22px 2px 10px" }}>
        Companies met · {s.learned.length} of 500
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12, maxWidth: 700 }}>
        {s.learned.map((id) => {
          const c = COMPANIES[id];
          return (
            <div key={id} className="stk-card" style={{ padding: "12px 13px", display: "flex", gap: 11, alignItems: "center" }}>
              {pieceEl(c.color, 36, c.name[0])}
              <div>
                <div className="stk-slab" style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: FELT.cardDim }}>{c.blurb}</div>
              </div>
            </div>
          );
        })}
        {s.learned.length === 0 ? (
          <div style={{ fontSize: 13.5, color: FELT.inkDim }}>Lessons introduce companies.</div>
        ) : null}
      </div>
    </div>
  );
}

export default function StackDesk() {
  const [s, update] = useStackState();
  const [sub, setSub] = useState<Subtab>("desk");
  const [sel, setSel] = useState<string | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [activeCard, setActiveCard] = useState<CardId | null>(null);

  const paid = putIn(s);
  const selCo = sel && s.lots[sel] ? COMPANIES[sel] : null;

  return (
    <FeltPage>
      <TopBar state={s} update={update} active="desk" />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "10px 24px 48px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0 16px" }}>
          {(["desk", "friends", "collection"] as Subtab[]).map((t) => (
            <span
              key={t}
              className="stk-chip"
              data-sub={t}
              onClick={() => setSub(t)}
              style={sub === t ? { background: FELT.gold, color: FELT.cardInk, boxShadow: "0 3px 0 rgba(0,0,0,0.25)" } : undefined}
            >
              {t === "desk" ? "The Desk" : t === "friends" ? "Friends" : "Collection"}
            </span>
          ))}
        </div>

        {sub === "desk" ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 28, alignItems: "start" }}>
            <div>
              <Shelf
                state={s}
                sel={sel}
                picks={picks}
                onStack={(id) => {
                  if (sel === id) {
                    setSel(null);
                    setPicks([]);
                  } else {
                    setSel(id);
                    setPicks([]);
                  }
                }}
                onLot={(id, i) => {
                  if (sel !== id) {
                    setSel(id);
                    setPicks([i]);
                  } else {
                    setPicks(picks.includes(i) ? picks.filter((x) => x !== i) : [...picks, i]);
                  }
                }}
              />
              <Hand state={s} active={activeCard} onCard={(c) => setActiveCard(activeCard === c ? null : c)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <WorthChart state={s} />
              {selCo ? (
                <div className="stk-card" data-selpanel>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    {pieceEl(selCo.color, 38, selCo.name[0])}
                    <div>
                      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>
                        {selCo.name} · {lotsOf(s, selCo.id).length}
                      </div>
                      <div style={{ fontSize: 12.5, color: FELT.cardDim }}>
                        avg {money(lotsOf(s, selCo.id).reduce((a, l) => a + l.p, 0) / lotsOf(s, selCo.id).length)} · worth{" "}
                        {money(lotsOf(s, selCo.id).length * priceAt(selCo.id, s.day))}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: FELT.cardDim, marginTop: 8 }}>
                    {picks.length
                      ? `${picks.length} picked · ${money(picks.length * priceAt(selCo.id, s.day))}. Play your Sell card to sell them.`
                      : "Tap shares to pick them."}
                  </div>
                </div>
              ) : (
                <div className="stk-glass" style={{ fontSize: 13, color: FELT.inkDim }}>
                  {paid > 0 ? "Tap a stack to see its lots." : "Finish a lesson, then play your Buy card here."}
                </div>
              )}
            </div>
          </div>
        ) : sub === "friends" ? (
          <FriendsTab state={s} />
        ) : (
          <CollectionTab state={s} />
        )}
      </main>
    </FeltPage>
  );
}
