// The Desk: Stack's profile page IS the trading desk. Chip stacks on the
// felt shelf, your hand of strategy cards below, a small worth chart
// beside. ALL trading is card play: one trade consumes one card, the
// +/- stepper picks how many shares ride on it. Selling outlines the
// newest shares from the top of the stack.
// Contract: docs/stack-desktop-spec.md.

import { ReactNode, useMemo, useState } from "react";
import {
  CardId, COMPANIES, FRIENDS, StackState, cardCount, cardKnown, lotsOf, maxAffordable,
  money, optionPremium, playBuy, playOptions, playSchedule, playSell, playThe500,
  priceAt, putIn, stopSchedule,
} from "../lib/stack/model";
import { CARD_LINES, CONCEPT_CARDS } from "../content/stackContent";
import { FELT, FeltPage, StrategyCard, pieceEl } from "../components/stack/kit";
import { TopBar, useStackState } from "../components/stack/TopBar";

type Subtab = "desk" | "friends" | "collection";
type Flow =
  | { kind: "buy"; stock: string | null; n: number }
  | { kind: "the500"; n: number }
  | { kind: "schedule"; stock: string | null }
  | { kind: "options"; step: "teach" | "pick"; stock: string | null; dir: "up" | "down" };

// ---------------- worth chart (holdings vs put in; cash stays out)

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

const CHART_RANGES: [string, number][] = [["1D", 2], ["1W", 7], ["1M", 30], ["1Y", 365], ["ALL", Infinity]];

function WorthChart(props: { state: StackState }) {
  const [range, setRange] = useState("1D");
  const full = useMemo(() => seriesFor(props.state), [props.state]);
  const win = Math.min(CHART_RANGES.find(([r]) => r === range)?.[1] ?? Infinity, full.worth.length);
  const worth = full.worth.slice(-win);
  const putin = full.putin.slice(-win);
  const all = worth.concat(putin);
  const hi = Math.max(...all, 1);
  const lo = Math.min(...all, 0);
  const span = Math.max(hi - lo, 1);
  const W = 340;
  const H = 116;
  const x = (i: number) => (worth.length === 1 ? 189 : 46 + (i / (worth.length - 1)) * 286);
  const y = (v: number) => 88 - ((v - lo) / span) * 76;
  const line = (arr: number[]) => arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const diff = worth[worth.length - 1] - putin[putin.length - 1];
  const yTicks = [hi, (lo + hi) / 2, lo].map((v) => ({ y: y(v), label: "$" + Math.round(v) }));
  const shown = worth.length;
  const axisText = { fontSize: 9.5, fontWeight: 600, fill: "rgba(242,233,210,0.6)", fontFamily: '"Roboto Slab", Georgia, serif' } as const;
  const leftLabel = shown <= 2 ? "yesterday" : `${shown - 1} days ago`;
  return (
    <div className="stk-glass" data-worthchart>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>Your stocks</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
          {CHART_RANGES.map(([r]) => (
            <span
              key={r}
              data-range={r}
              onClick={() => setRange(r)}
              className="stk-slab"
              style={{
                fontSize: 10.5, fontWeight: 700, padding: "3px 7px", borderRadius: 7, cursor: "pointer",
                background: range === r ? FELT.gold : "rgba(0,0,0,0.22)",
                color: range === r ? FELT.cardInk : FELT.inkDim,
              }}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: FELT.inkDim, marginBottom: 8 }}>
        {money(worth[worth.length - 1])} on {money(putin[putin.length - 1])} put in
        {Math.abs(diff) > 0.005 ? (
          <span style={{ color: diff >= 0 ? FELT.up : FELT.dn }}> · {diff >= 0 ? "up" : "down"} {money(Math.abs(diff))}</span>
        ) : null}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: 110 }} aria-hidden>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={46} x2={332} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={42} y={t.y + 3} textAnchor="end" {...axisText}>{t.label}</text>
          </g>
        ))}
        <line x1={46} x2={332} y1={92} y2={92} stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} />
        {shown > 1 ? <text x={46} y={106} textAnchor="start" {...axisText}>{leftLabel}</text> : null}
        {shown > 3 ? <text x={189} y={106} textAnchor="middle" {...axisText}>{`${Math.round((shown - 1) / 2)} days ago`}</text> : null}
        <text x={332} y={106} textAnchor="end" {...axisText}>{`today · day ${props.state.day}`}</text>
        <polyline fill="none" stroke="rgba(242,233,210,0.55)" strokeWidth={2} strokeDasharray="6 5" points={line(putin)} />
        <polyline fill="none" stroke="#8fd8a8" strokeWidth={2.5} points={line(worth)} />
        {worth.length === 1 ? <circle cx={189} cy={y(worth[0])} r={3.5} fill="#8fd8a8" /> : null}
      </svg>
      <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: FELT.inkDim, paddingTop: 4 }}>
        <span><span style={{ display: "inline-block", width: 16, height: 3, background: "#8fd8a8", borderRadius: 2, verticalAlign: "middle", marginRight: 5 }} />worth</span>
        <span><span style={{ display: "inline-block", width: 16, height: 3, background: "rgba(242,233,210,0.55)", borderRadius: 2, verticalAlign: "middle", marginRight: 5 }} />put in</span>
      </div>
    </div>
  );
}

// ---------------- stepper

function Stepper(props: { n: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = (label: string, d: number, disabled: boolean) => (
    <button
      className="stk-btn"
      data-step={d > 0 ? "up" : "down"}
      disabled={disabled}
      onClick={() => props.onChange(Math.max(props.min, Math.min(props.max, props.n + d)))}
      style={{ padding: "6px 16px", fontSize: 18, opacity: disabled ? 0.4 : 1 }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
      {btn("−", -1, props.n <= props.min)}
      <b className="stk-slab" style={{ fontSize: 26, minWidth: 40, textAlign: "center" }} data-stepn>{props.n}</b>
      {btn("+", 1, props.n >= props.max)}
    </div>
  );
}

// ---------------- modal sheet

function Sheet(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,14,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={props.onClose}>
      <div className="stk-glass" data-sheet style={{ width: 420, maxHeight: "82vh", overflowY: "auto", background: "#1d5237", boxShadow: "0 14px 40px rgba(0,0,0,0.5)", padding: "18px 20px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 18 }}>{props.title}</div>
          <svg width="22" height="22" viewBox="0 0 26 26" style={{ marginLeft: "auto", opacity: 0.6, cursor: "pointer" }} onClick={props.onClose} data-sheetclose>
            <path d="M6 6 L20 20 M20 6 L6 20" stroke={FELT.ink} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        {props.children}
      </div>
    </div>
  );
}

function StockRow(props: { id: string; right: ReactNode; onClick?: () => void; dim?: boolean }) {
  const c = COMPANIES[props.id];
  return (
    <div
      className="stk-card"
      data-pickstock={props.id}
      onClick={props.dim ? undefined : props.onClick}
      style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9, opacity: props.dim ? 0.55 : 1, cursor: props.onClick && !props.dim ? "pointer" : "default", padding: "10px 13px" }}
    >
      {pieceEl(c.color, 34, c.name[0])}
      <div>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
        <div style={{ fontSize: 12, color: FELT.cardDim }}>{c.blurb}</div>
      </div>
      <span style={{ marginLeft: "auto", textAlign: "right" }}>{props.right}</span>
    </div>
  );
}

// ---------------- the page

export default function StackDesk() {
  const [s, update] = useStackState();
  const [sub, setSub] = useState<Subtab>("desk");
  const [sel, setSel] = useState<string | null>(null);
  const [sellN, setSellN] = useState(1);
  const [flow, setFlow] = useState<Flow | null>(null);

  const selLots = sel ? lotsOf(s, sel) : [];
  const selCo = sel && selLots.length ? COMPANIES[sel] : null;
  const pickedIdxs = selCo ? selLots.map((_, i) => i).slice(selLots.length - sellN) : [];

  const closeFlow = () => setFlow(null);

  const playCard = (c: CardId) => {
    if (cardCount(s, c) < 1) return;
    if (c === "buy") setFlow({ kind: "buy", stock: null, n: 1 });
    else if (c === "the500") setFlow({ kind: "the500", n: 1 });
    else if (c === "schedule") setFlow({ kind: "schedule", stock: null });
    else if (c === "options") setFlow({ kind: "options", step: s.optionsTaught ? "pick" : "teach", stock: null, dir: "up" });
    else if (c === "sell") {
      // Sell plays onto a stack: if none is selected yet, the shelf hint says so
      if (!sel) setSel(Object.keys(s.lots)[0] ?? null);
    }
  };

  // ---------------- flows

  let sheet: ReactNode = null;
  if (flow?.kind === "buy" || flow?.kind === "the500") {
    const isFund = flow.kind === "the500";
    const stock = isFund ? "voo" : flow.stock;
    if (!stock) {
      sheet = (
        <Sheet title="Play Buy: pick a stock" onClose={closeFlow}>
          {s.learned.filter((id) => !COMPANIES[id].fund).map((id) => (
            <StockRow
              key={id}
              id={id}
              dim={maxAffordable(s, id) < 1}
              onClick={() => setFlow({ kind: "buy", stock: id, n: 1 })}
              right={<b className="stk-slab" style={{ fontSize: 14 }}>{money(priceAt(id, s.day))}</b>}
            />
          ))}
          {s.learned.length === 0 ? <div style={{ fontSize: 13.5, color: FELT.inkDim }}>Lessons introduce companies.</div> : null}
        </Sheet>
      );
    } else {
      const max = Math.max(1, maxAffordable(s, stock));
      const n = Math.min(flow.n, max);
      const cost = n * priceAt(stock, s.day);
      const can = maxAffordable(s, stock) >= n && n >= 1;
      sheet = (
        <Sheet title={isFund ? "Play The 500" : `Play Buy: ${COMPANIES[stock].name}`} onClose={closeFlow}>
          <StockRow id={stock} right={<b className="stk-slab" style={{ fontSize: 14 }}>{money(priceAt(stock, s.day))}</b>} />
          <div style={{ padding: "10px 0 4px" }}>
            <Stepper
              n={n}
              min={1}
              max={max}
              onChange={(nn) => setFlow(isFund ? { kind: "the500", n: nn } : { kind: "buy", stock, n: nn })}
            />
            <div style={{ fontSize: 12.5, color: FELT.inkDim, textAlign: "center", paddingTop: 6 }}>
              shares · cash {money(s.cash)}
            </div>
          </div>
          <button
            className="stk-btn green"
            data-confirmbuy
            disabled={!can}
            style={{ width: "100%", marginTop: 10, opacity: can ? 1 : 0.5 }}
            onClick={() => {
              const next = isFund ? playThe500(s, n) : playBuy(s, stock, n);
              if (next) {
                update(next);
                closeFlow();
              }
            }}
          >
            {`Play 1 ${isFund ? "The 500" : "Buy"} card · ${n} ${n > 1 ? "shares" : "share"} · ${money(cost)}`}
          </button>
        </Sheet>
      );
    }
  } else if (flow?.kind === "schedule") {
    sheet = (
      <Sheet title="Play Schedule: pick a stock" onClose={closeFlow}>
        <div style={{ fontSize: 13, color: FELT.inkDim, marginBottom: 10 }}>{CARD_LINES.schedule.line} Stops any time, the card is spent.</div>
        {s.learned.map((id) => (
          <StockRow
            key={id}
            id={id}
            dim={s.autopilot.includes(id)}
            onClick={() => {
              const next = playSchedule(s, id);
              if (next) {
                update(next);
                closeFlow();
              }
            }}
            right={
              s.autopilot.includes(id)
                ? <span style={{ fontSize: 12, color: FELT.cardDim }}>already on</span>
                : <b className="stk-slab" style={{ fontSize: 14 }}>{money(priceAt(id, s.day))}</b>
            }
          />
        ))}
      </Sheet>
    );
  } else if (flow?.kind === "options") {
    if (flow.step === "teach") {
      sheet = (
        <Sheet title="Options" onClose={closeFlow}>
          <div className="stk-card" style={{ textAlign: "center", padding: "18px 16px" }}>
            <div className="stk-slab" style={{ fontWeight: 700, fontSize: 22 }}>A bet, not an investment</div>
            <div style={{ fontSize: 14, color: FELT.cardDim, marginTop: 8, lineHeight: 1.5 }}>
              You pay a premium to bet on where a price goes by a day. Right: you win the move. Wrong: the premium is gone. You can never lose more than you paid.
            </div>
          </div>
          <button
            className="stk-btn green"
            data-cont
            style={{ width: "100%", marginTop: 12 }}
            onClick={() => {
              update({ ...s, optionsTaught: true });
              setFlow({ kind: "options", step: "pick", stock: null, dir: "up" });
            }}
          >
            Got it
          </button>
        </Sheet>
      );
    } else {
      const owned = Object.keys(s.lots);
      sheet = (
        <Sheet title="Play Options" onClose={closeFlow}>
          {owned.length === 0 ? (
            <div style={{ fontSize: 13.5, color: FELT.inkDim }}>You bet on stocks you own. Buy first.</div>
          ) : !flow.stock ? (
            owned.map((id) => (
              <StockRow
                key={id}
                id={id}
                onClick={() => setFlow({ ...flow, stock: id })}
                right={<b className="stk-slab" style={{ fontSize: 14 }}>premium {money(optionPremium(id, s.day))}</b>}
              />
            ))
          ) : (
            <>
              <StockRow id={flow.stock} right={<b className="stk-slab" style={{ fontSize: 14 }}>{money(priceAt(flow.stock, s.day))}</b>} />
              <div style={{ display: "flex", gap: 10, margin: "8px 0 4px" }}>
                {(["up", "down"] as const).map((d) => (
                  <button
                    key={d}
                    className="stk-btn"
                    data-dir={d}
                    onClick={() => setFlow({ ...flow, dir: d })}
                    style={{ flex: 1, background: flow.dir === d ? (d === "up" ? FELT.green : FELT.red) : undefined, color: flow.dir === d ? "#fff" : undefined, boxShadow: flow.dir === d ? "0 5px 0 rgba(0,0,0,0.35)" : undefined }}
                  >
                    {d === "up" ? "Up" : "Down"}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: FELT.inkDim, textAlign: "center", padding: "6px 0" }}>
                3 market days · premium {money(optionPremium(flow.stock, s.day))} · lose at most the premium
              </div>
              <button
                className="stk-btn green"
                data-confirmoption
                disabled={s.cash < optionPremium(flow.stock, s.day)}
                style={{ width: "100%", marginTop: 8, opacity: s.cash < optionPremium(flow.stock, s.day) ? 0.5 : 1 }}
                onClick={() => {
                  const next = playOptions(s, flow.stock!, flow.dir);
                  if (next) {
                    update(next);
                    closeFlow();
                  }
                }}
              >
                {`Play 1 Options card · ${COMPANIES[flow.stock].name} ${flow.dir}`}
              </button>
            </>
          )}
        </Sheet>
      );
    }
  }

  // ---------------- hand

  const handCard = (c: CardId, lockLabel: string) => {
    const known = cardKnown(s, c);
    const count = cardCount(s, c);
    if (!known) return <StrategyCard key={c} id={c} locked lockLabel={lockLabel} />;
    return (
      <span key={c} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
        <span style={{ opacity: count > 0 ? 1 : 0.45, display: "inline-flex" }}>
          <StrategyCard id={c} onClick={() => playCard(c)} />
        </span>
        <b className="stk-slab" data-count={c} style={{ fontSize: 13.5, color: count > 0 ? FELT.ink : FELT.inkDim }}>
          x{count}
        </b>
        {count === 0 ? (
          <span style={{ fontSize: 11, color: FELT.inkDim }}>
            {c === "buy" || c === "sell" ? "Lessons deal cards" : "Reviews restock"}
          </span>
        ) : null}
      </span>
    );
  };

  // ---------------- desk tab

  const held = Object.keys(s.lots);
  const bills = Math.max(1, Math.min(10, Math.round(s.cash / 25)));
  const canSell = selCo && cardCount(s, "sell") > 0 && sellN >= 1 && sellN <= selLots.length;

  const deskTab = (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 28, alignItems: "start" }}>
      <div>
        <div style={{ background: "rgba(0,0,0,0.16)", borderRadius: 18, padding: "20px 12px 26px", boxShadow: "inset 0 3px 10px rgba(0,0,0,0.28)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-evenly", minHeight: 210 }} data-shelf>
            {held.map((id) => {
              const c = COMPANIES[id];
              const ls = lotsOf(s, id);
              const p = priceAt(id, s.day);
              const yv = priceAt(id, Math.max(1, s.day - 1));
              const chg = (p / yv - 1) * 100;
              const selected = sel === id;
              const auto = s.autopilot.includes(id);
              return (
                <div
                  key={id}
                  className={`stk-col${selected ? " sel" : ""}`}
                  data-stack={id}
                  onClick={() => {
                    if (sel === id) { setSel(null); } else { setSel(id); setSellN(1); }
                  }}
                >
                  <div className="stk-tag">
                    {c.name}
                    <div style={{ fontSize: 11, fontWeight: 600, color: chg >= 0 ? FELT.up : FELT.dn }}>
                      {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                    </div>
                    {auto ? (
                      <div
                        data-autopilot={id}
                        onClick={(e) => { e.stopPropagation(); update(stopSchedule(s, id)); }}
                        style={{ fontSize: 10.5, fontWeight: 700, color: "#f3b64f", cursor: "pointer" }}
                        title="Schedule is buying daily. Click to stop."
                      >
                        auto · stop
                      </div>
                    ) : null}
                  </div>
                  <div className="stk-discs">
                    {ls.map((lot, i) => (
                      <span
                        key={i}
                        className={`stk-disc ${c.color}${i === ls.length - 1 ? " cap" : ""}${selected && pickedIdxs.includes(i) ? " pick" : ""}`}
                        data-lot={`${id}:${i}`}
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

        <div data-hand>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16, margin: "20px 2px 12px" }}>Your cards</div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            {handCard("buy", "Lesson 1")}
            {handCard("sell", "Lesson 1")}
            {handCard("schedule", "Unit 1 chest")}
            {handCard("the500", "Unit 2 chest")}
            {handCard("options", "The last chest")}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WorthChart state={s} />
        {selCo ? (
          <div className="stk-card" data-selpanel>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              {pieceEl(selCo.color, 38, selCo.name[0])}
              <div>
                <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>
                  {selCo.name} · {selLots.length}
                </div>
                <div style={{ fontSize: 12.5, color: FELT.cardDim }}>
                  avg {money(selLots.reduce((a, l) => a + l.p, 0) / selLots.length)} · worth {money(selLots.length * priceAt(selCo.id, s.day))}
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 0 4px" }}>
              <Stepper n={Math.min(sellN, selLots.length)} min={1} max={selLots.length} onChange={setSellN} />
              <div style={{ fontSize: 12, color: FELT.cardDim, textAlign: "center", paddingTop: 5 }}>
                newest shares sell first
              </div>
            </div>
            <button
              className="stk-btn green"
              data-confirmsell
              disabled={!canSell}
              style={{ width: "100%", marginTop: 8, opacity: canSell ? 1 : 0.5 }}
              onClick={() => {
                if (!canSell || !sel) return;
                const next = playSell(s, sel, Math.min(sellN, selLots.length));
                if (next) {
                  update(next);
                  if (!next.lots[sel]) setSel(null);
                  setSellN(1);
                }
              }}
            >
              {cardCount(s, "sell") > 0
                ? `Play 1 Sell card · ${Math.min(sellN, selLots.length)} ${sellN > 1 ? "shares" : "share"} · ${money(Math.min(sellN, selLots.length) * priceAt(selCo.id, s.day))}`
                : "No Sell cards"}
            </button>
          </div>
        ) : (
          <div className="stk-glass" style={{ fontSize: 13, color: FELT.inkDim }}>
            {held.length ? "Click a stack to sell from it." : "Finish a lesson, then play your Buy card."}
          </div>
        )}
        {s.options.length ? (
          <div className="stk-glass" data-positions>
            <div className="stk-slab" style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>Open options</div>
            {s.options.map((o, i) => (
              <div key={i} style={{ fontSize: 12.5, color: FELT.inkDim, padding: "3px 0" }}>
                {COMPANIES[o.stock].name} {o.dir} · premium {money(o.premium)} · settles day {o.expires}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  // ---------------- friends and collection

  const friendsTab = (
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

  const collectionTab = (
    <div>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16, margin: "2px 2px 10px" }}>Concept cards</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, maxWidth: 700 }}>
        {Object.keys(CONCEPT_CARDS).map((id) => {
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
        {sub === "desk" ? deskTab : sub === "friends" ? friendsTab : collectionTab}
      </main>
      {sheet}
    </FeltPage>
  );
}
