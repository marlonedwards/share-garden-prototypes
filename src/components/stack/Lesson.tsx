// The lesson engine: full takeover stage, every item type as a visual
// event, one-line feedback, misses re-queued, first tries score. Ends on
// one numbers-only screen, and a capstone rolls straight into its chest.
// Copy comes from src/content/stackContent.ts; the model does the money.
// Contract: docs/stack-desktop-spec.md.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHEST_CARDS, ChestId, COMPANIES, Deck, L1_PREPAY, LESSON_DEAL, StackState,
  applyLesson, holdingsWorth, lessonKey, lotsOf, money,
  openChest, playBuy, priceAt, unopenedChest,
} from "../../lib/stack/model";
import {
  BreakSide, CARD_LINES, CONCEPT_CARDS, ChoiceOption, ContentItem, LESSON1, UNITS_CONTENT,
} from "../../content/stackContent";
import { Bear, Bull, ChartPic, FELT, StrategyCard, pieceEl } from "./kit";

// ---------------- session compilation

type Compiled = ContentItem & { requeued?: boolean };

function isScored(it: ContentItem): boolean {
  return !["teach", "dca", "paydrop", "firstbuy"].includes(it.type);
}

function compileSession(u: number, l: number, missKinds: Record<string, boolean>): Compiled[] {
  const lesson = UNITS_CONTENT[u].lessons[l];
  let items: Compiled[] = lesson.items.map((it) => ({ ...it }));
  if (lesson.capstone) {
    const head: Compiled[] = items.filter((i) => i.type === "teach");
    const rest: Compiled[] = items.filter((i) => i.type !== "teach");
    rest.sort((a, b) => (missKinds[b.type] ? 1 : 0) - (missKinds[a.type] ? 1 : 0));
    items = head.concat(rest);
  }
  return items;
}

// ---------------- tiny helpers

function TickMoney(props: { to: number; ms?: number; style?: React.CSSProperties; className?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const frame = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / (props.ms ?? 800));
      setV(props.to * k);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [props.to, props.ms]);
  return <span className={props.className} style={props.style}>{money(v)}</span>;
}

function Bills(props: { count: number; label?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setShown((n) => (n >= props.count ? n : n + 1)), 170);
    return () => clearInterval(h);
  }, [props.count]);
  return (
    <div style={{ display: "flex", gap: 7, justifyContent: "center", padding: "14px 0 4px", minHeight: 30 }}>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className="stk-drop" style={{ display: "inline-flex", width: 52, height: 24, borderRadius: 4, background: "#4d9d67", border: "1.5px solid rgba(0,0,0,0.22)", boxShadow: "0 2.5px 0 rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" }}>
          <b className="stk-slab" style={{ fontSize: 12, color: "#f7f2e2" }}>{props.label ?? "$20"}</b>
        </span>
      ))}
    </div>
  );
}

function Cap(props: { t: string }) {
  return <div className="stk-slab" style={{ fontSize: 13, fontWeight: 600, color: "#8a7c5c", textAlign: "center", paddingTop: 4 }}>{props.t}</div>;
}

function MiniCard(props: { name: string; n: number }) {
  return (
    <span className="stk-drop" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ width: 44, height: 60, borderRadius: 6, background: FELT.card, boxShadow: "0 3px 0 rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(90,70,30,0.25)" }}>
        <b className="stk-slab" style={{ fontSize: 11, color: FELT.cardInk }}>{props.name}</b>
      </span>
      <b className="stk-slab" style={{ fontSize: 12, color: FELT.ink }}>x{props.n}</b>
    </span>
  );
}

function DealtRow(props: { dealt: Partial<Deck> }) {
  const entries = (Object.keys(props.dealt) as (keyof Deck)[]).filter((k) => (props.dealt[k] ?? 0) > 0);
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "10px 0 2px" }}>
      {entries.map((k) => (
        <MiniCard key={k} name={CARD_LINES[k].name} n={props.dealt[k] ?? 0} />
      ))}
    </div>
  );
}

const PT = {
  up: "0,44 50,40 100,34 150,30 200,22 250,18 300,10",
  wild: "0,40 22,12 44,36 66,8 88,44 110,18 132,46 154,10 176,34 198,6 220,38 242,16 264,40 286,12 300,22",
  calm: "0,44 30,42 60,38 90,39 120,33 150,32 180,28 210,27 240,22 270,20 300,16",
  dca: "0,40 30,26 60,34 90,18 120,30 150,20 180,34 210,16 240,26 270,12 300,20",
};

function ptsYOf(pts: string, x: number): number {
  const P = pts.split(" ").map((s) => s.split(",").map(Number));
  for (let i = 1; i < P.length; i++) {
    if (x <= P[i][0]) {
      const t = (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
      return P[i - 1][1] + t * (P[i][1] - P[i - 1][1]);
    }
  }
  return P[P.length - 1][1];
}

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------- teach pictures

function TeachPic(props: { pic: string }) {
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
          {[0, 1].map((row) => (
            <div key={row} style={{ display: "flex", gap: 6, justifyContent: "center", padding: "3px 0" }}>
              {(row ? (["slate", "cream", "red", "black", "slate"] as const) : (["red", "slate", "black", "cream", "red"] as const)).map((c, i) => (
                <span key={i}>{pieceEl(c, 19)}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (p === "fee-leak") {
    return (
      <div className="stk-card">
        <svg viewBox="0 0 300 52" style={{ display: "block", width: "100%", height: 50 }} aria-hidden>
          <polyline fill="none" stroke="#3d8c5b" strokeWidth={2.5} points={PT.up} />
          <polyline fill="none" stroke="#c9913f" strokeWidth={2.5} points="0,44 50,42 100,38 150,36 200,31 250,29 300,24" />
        </svg>
        <Cap t="same fund, 2% fee" />
      </div>
    );
  }
  // live-price: a gently ticking chart
  return <LivePriceCard />;
}

function LivePriceCard() {
  const [pxText, setPxText] = useState("$69.85");
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const r = seededRng(13);
    const a = [50];
    for (let i = 0; i < 45; i++) a.push(a[a.length - 1] + (r() - 0.5) * 3);
    let p = 69.85;
    const h = setInterval(() => {
      a.push(a[a.length - 1] + (r() - 0.5) * 3);
      if (a.length > 46) a.shift();
      p = p * (1 + (r() - 0.5) * 0.004);
      setPxText(money(p));
      const mn = Math.min(...a);
      const mx = Math.max(...a);
      const span = Math.max(mx - mn, 0.0001);
      if (svgRef.current) {
        svgRef.current.innerHTML = `<polyline fill="none" stroke="#3d8c5b" stroke-width="2.5" points="${a
          .map((v, i) => `${((i / 45) * 300).toFixed(1)},${(52 - ((v - mn) / span) * 44).toFixed(1)}`)
          .join(" ")}"/>`;
      }
    }, 110);
    return () => clearInterval(h);
  }, []);
  return (
    <div className="stk-card">
      <svg ref={svgRef} viewBox="0 0 300 56" style={{ display: "block", width: "100%", height: 54 }} aria-hidden />
      <Cap t={pxText} />
    </div>
  );
}

// ---------------- shared option wrapper

function Opt(props: {
  children: React.ReactNode;
  state: "idle" | "right" | "wrong" | "dim";
  onPick?: () => void;
  c?: boolean;
}) {
  const outline =
    props.state === "right" ? { outline: "3.5px solid #3d8c5b" } :
    props.state === "wrong" ? { outline: "3.5px solid #c05545" } : {};
  return (
    <div
      className="stk-card"
      data-opt={props.state}
      data-c={props.c ? 1 : 0}
      onClick={props.state === "idle" ? props.onPick : undefined}
      style={{
        marginBottom: 11,
        cursor: props.state === "idle" && props.onPick ? "pointer" : "default",
        opacity: props.state === "dim" ? 0.55 : 1,
        transition: "opacity 0.2s ease",
        ...outline,
      }}
    >
      {props.children}
    </div>
  );
}

function Q(props: { t: string }) {
  return <div className="stk-slab" style={{ fontWeight: 700, fontSize: 24, margin: "4px 2px 16px" }}>{props.t}</div>;
}

// generic pick handling: mark, wait for the item's own animation, report
function usePick(onResult: (correct: boolean) => void, delayMs = 0) {
  const [picked, setPicked] = useState<number | null>(null);
  const [correctPick, setCorrectPick] = useState(false);
  const pick = (i: number, correct: boolean, extra?: () => void) => {
    if (picked !== null) return;
    setPicked(i);
    setCorrectPick(correct);
    extra?.();
    setTimeout(() => onResult(correct), delayMs);
  };
  const stateFor = (i: number, _isCorrect: boolean): "idle" | "right" | "wrong" | "dim" => {
    if (picked === null) return "idle";
    if (i === picked) return correctPick ? "right" : "wrong";
    return "dim";
  };
  return { picked, pick, stateFor };
}

// ---------------- item views

function ChoiceItem(props: { it: Extract<ContentItem, { type: "choice" }>; onResult: (c: boolean) => void }) {
  const order = useMemo(() => {
    const idxs = props.it.options.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs;
  }, [props.it]);
  const { pick, stateFor } = usePick(props.onResult);
  const renderOpt = (o: ChoiceOption) =>
    typeof o === "string" ? (
      <span className="stk-slab" style={{ fontWeight: 600, fontSize: 15.5 }}>{o}</span>
    ) : (
      <>
        {o.pic === "gold-piece" ? (
          <div style={{ display: "flex", justifyContent: "center" }}>{pieceEl("gold", 40)}</div>
        ) : (
          <ChartPic kind={o.pic} />
        )}
        {o.caption ? <Cap t={o.caption} /> : null}
      </>
    );
  return (
    <>
      <Q t={props.it.q} />
      {order.map((oi, slot) => (
        <Opt key={slot} c={oi === props.it.answer} state={stateFor(slot, oi === props.it.answer)} onPick={() => pick(slot, oi === props.it.answer)}>
          {renderOpt(props.it.options[oi])}
        </Opt>
      ))}
    </>
  );
}

function LiveItem(props: { it: Extract<ContentItem, { type: "live-up" | "live-down" | "live-vol" }>; onResult: (c: boolean) => void }) {
  const mode = props.it.type.slice(5) as "up" | "down" | "vol";
  const swap = useMemo(() => Math.random() < 0.5, []);
  const s0 = useRef<SVGSVGElement>(null);
  const s1 = useRef<SVGSVGElement>(null);
  const { pick, stateFor } = usePick(props.onResult);
  useEffect(() => {
    const r0 = seededRng(5);
    const r1 = seededRng(9);
    const a = [50];
    const b = [50];
    const step = () => {
      if (mode === "vol") { a.push(a[a.length - 1] + (r0() - 0.5) * 10); b.push(b[b.length - 1] + (r1() - 0.5) * 1.6); }
      else if (mode === "up") { a.push(a[a.length - 1] + (r0() - 0.38) * 3); b.push(b[b.length - 1] + (r1() - 0.62) * 3); }
      else { a.push(a[a.length - 1] + (r0() - 0.62) * 3); b.push(b[b.length - 1] + (r1() - 0.38) * 3); }
      if (a.length > 46) { a.shift(); b.shift(); }
    };
    for (let i = 0; i < 45; i++) step();
    const colors = mode === "vol" ? ["#b23a2e", "#3d8c5b"] : mode === "up" ? ["#3d8c5b", "#b23a2e"] : ["#b23a2e", "#3d8c5b"];
    const h = setInterval(() => {
      step();
      const draw = (svg: SVGSVGElement | null, arr: number[], color: string, lo?: number, hi?: number) => {
        if (!svg) return;
        const mn = lo ?? Math.min(...arr);
        const mx = hi ?? Math.max(...arr);
        const span = Math.max(mx - mn, 0.0001);
        svg.innerHTML = `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${arr
          .map((v, i) => `${((i / 45) * 300).toFixed(1)},${(56 - ((v - mn) / span) * 50).toFixed(1)}`)
          .join(" ")}"/>`;
      };
      if (mode === "vol") {
        const all = a.concat(b);
        const lo = Math.min(...all);
        const hi = Math.max(...all);
        draw(s0.current, a, colors[0], lo, hi);
        draw(s1.current, b, colors[1], lo, hi);
      } else {
        draw(s0.current, a, colors[0]);
        draw(s1.current, b, colors[1]);
      }
    }, 90);
    return () => clearInterval(h);
  }, [mode]);
  const charts = [
    { correct: true, ref: s0 },
    { correct: false, ref: s1 },
  ];
  const shown = swap ? [charts[1], charts[0]] : charts;
  return (
    <>
      <Q t={props.it.q} />
      {shown.map((c, slot) => (
        <Opt key={slot} c={c.correct} state={stateFor(slot, c.correct)} onPick={() => pick(slot, c.correct)}>
          <svg ref={c.ref} viewBox="0 0 300 62" style={{ display: "block", width: "100%", height: 60 }} aria-hidden />
        </Opt>
      ))}
    </>
  );
}

function PileItem(props: { it: Extract<ContentItem, { type: "pile" }>; onResult: (c: boolean) => void }) {
  const swap = useMemo(() => Math.random() < 0.5, []);
  const [fillA, setFillA] = useState(0);
  const [fillB, setFillB] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const { pick, stateFor } = usePick(props.onResult, 900);
  useEffect(() => {
    let a = 0;
    const h = setInterval(() => {
      a++;
      setFillA(Math.min(a, 54));
      setFillB(Math.min(Math.floor(a / 8), 7));
      if (a >= 56) clearInterval(h);
    }, 26);
    return () => clearInterval(h);
  }, []);
  const apple = (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(18, 1fr)", gap: 2, padding: "2px 8px", minHeight: 44 }}>
        {Array.from({ length: fillA }, (_, i) => (
          <span key={i}>{pieceEl("slate", 11)}</span>
        ))}
      </div>
      <Cap t={revealed ? "Apple, all together: $3.5 trillion" : "Apple · $232 a share"} />
    </>
  );
  const costco = (
    <>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", minHeight: 30, padding: "2px 0" }}>
        {Array.from({ length: fillB }, (_, i) => (
          <span key={i}>{pieceEl("cream", 22)}</span>
        ))}
      </div>
      <Cap t={revealed ? "Costco, all together: $400 billion" : "Costco · $912 a share"} />
    </>
  );
  const slots = swap ? [{ correct: false, el: costco }, { correct: true, el: apple }] : [{ correct: true, el: apple }, { correct: false, el: costco }];
  return (
    <>
      <Q t={props.it.q} />
      {slots.map((sl, i) => (
        <Opt key={i} c={sl.correct} state={stateFor(i, sl.correct)} onPick={() => pick(i, sl.correct, () => setRevealed(true))}>
          {sl.el}
        </Opt>
      ))}
    </>
  );
}

function RaceItem(props: { it: Extract<ContentItem, { type: "race" }>; onResult: (c: boolean) => void }) {
  const [raced, setRaced] = useState(false);
  const { pick, stateFor } = usePick(props.onResult, 1400);
  const colors = ["#3d8c5b", "#c9913f", "#c05545"];
  return (
    <>
      <Q t={props.it.q} />
      <div className="stk-card" style={{ marginBottom: 11 }}>
        <svg viewBox="0 0 300 92" style={{ display: "block", width: "100%", height: 88 }} aria-hidden>
          <polyline fill="none" stroke="#8a7c5c" strokeWidth={2.5} points="0,48 40,42 80,36 120,30 150,26 168,66" />
          {raced ? (
            <>
              <polyline fill="none" stroke="#3d8c5b" strokeWidth={4} points="168,66 200,52 240,34 300,14" />
              <polyline fill="none" stroke="#c9913f" strokeWidth={2.5} points="168,66 210,58 255,48 300,38" />
              <polyline fill="none" stroke="#c05545" strokeWidth={2.5} points="168,66 300,70" />
            </>
          ) : null}
          <circle cx="168" cy="66" r="3.5" fill="#2a2419" />
        </svg>
      </div>
      {props.it.choices.map((label, i) => (
        <Opt key={i} c={i === 0} state={stateFor(i, i === 0)} onPick={() => pick(i, i === 0, () => setRaced(true))}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 22, height: 4, borderRadius: 2, background: colors[i], flex: "none" }} />
            <span className="stk-slab" style={{ fontWeight: 600, fontSize: 14.5 }}>{label}</span>
          </div>
        </Opt>
      ))}
    </>
  );
}

function BreakItem(props: { it: Extract<ContentItem, { type: "break" }>; onResult: (c: boolean) => void }) {
  const [broke, setBroke] = useState(false);
  const { pick, stateFor } = usePick(props.onResult, 1100);
  const side = (sd: BreakSide, i: number) => (
    <Opt key={i} c={i === props.it.answer} state={stateFor(i, i === props.it.answer)} onPick={() => pick(i, i === props.it.answer, () => setBroke(true))}>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "3px 0" }}>
        {sd.pieces.map((c, pi) => (
          <span
            key={pi}
            style={broke && sd.gone.includes(pi) ? { filter: "grayscale(1)", opacity: 0.3, transform: "translateY(8px) rotate(14deg)", transition: `all 0.5s ease ${pi * 0.12}s`, display: "inline-flex" } : { transition: "all 0.5s ease", display: "inline-flex" }}
          >
            {pieceEl(c as never, 36)}
          </span>
        ))}
      </div>
      <Cap t={sd.label} />
    </Opt>
  );
  return (
    <>
      <Q t={props.it.q} />
      {props.it.sides.map((sd, i) => side(sd, i))}
    </>
  );
}

function DollarItem(props: { it: Extract<ContentItem, { type: "dollar" }>; onResult: (c: boolean) => void }) {
  const [shown, setShown] = useState(0);
  const { pick, stateFor } = usePick(props.onResult);
  useEffect(() => {
    const h = setInterval(() => setShown((n) => {
      if (n >= props.it.rows.length) { clearInterval(h); return n; }
      return n + 1;
    }), 260);
    return () => clearInterval(h);
  }, [props.it.rows.length]);
  return (
    <>
      <Q t={props.it.q} />
      {props.it.rows.slice(0, shown).map(([who, amt], i) => (
        <Opt key={i} c={i === props.it.answer} state={stateFor(i, i === props.it.answer)} onPick={() => pick(i, i === props.it.answer)}>
          <div className="stk-drop" style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 15 }}>{who}</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {i === props.it.answer ? pieceEl("red", 22) : null}
              <b className="stk-slab" style={{ fontSize: 15 }}>{amt}</b>
            </span>
          </div>
        </Opt>
      ))}
    </>
  );
}

function CoinRow(props: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", paddingTop: 6, minHeight: 18 }}>
      {Array.from({ length: props.count }, (_, i) => (
        <span key={i} className="stk-drop" style={{ width: 13, height: 13, borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #f0d98a, #c7a848)", border: "1px solid #a68d58" }} />
      ))}
    </div>
  );
}

type DripDrain = Extract<ContentItem, { type: "drip" | "drain" }>;

function DripItem(props: { it: DripDrain; onResult: (c: boolean) => void }) {
  const [coins, setCoins] = useState(0);
  const [vals, setVals] = useState(false);
  const { picked, pick, stateFor } = usePick(props.onResult, 1500);
  useEffect(() => {
    if (picked === null) return;
    const h = setInterval(() => setCoins((n) => (n >= 12 ? n : n + 1)), 90);
    const t = setTimeout(() => setVals(true), 1150);
    return () => { clearInterval(h); clearTimeout(t); };
  }, [picked]);
  return (
    <>
      <Q t={props.it.q} />
      <Opt c state={stateFor(0, true)} onPick={() => pick(0, true)}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "3px 0" }}>
          {[0, 1, 2].map((i) => <span key={i}>{pieceEl("red", 36)}</span>)}
        </div>
        <CoinRow count={Math.ceil(coins / 2)} />
        <Cap t={`profit split 3 ways${vals ? " · $4 a share" : ""}`} />
      </Opt>
      <Opt state={stateFor(1, false)} onPick={() => pick(1, false)}>
        <div style={{ display: "flex", gap: 5, justifyContent: "center", padding: "3px 0" }}>
          {Array.from({ length: 8 }, (_, i) => <span key={i}>{pieceEl("red", 23)}</span>)}
        </div>
        <CoinRow count={Math.floor(coins / 2)} />
        <Cap t={`profit split 8 ways${vals ? " · $1.50 a share" : ""}`} />
      </Opt>
    </>
  );
}

function DrainItem(props: { it: DripDrain; onResult: (c: boolean) => void }) {
  const [year, setYear] = useState(0);
  const { picked, pick, stateFor } = usePick(props.onResult, 2300);
  useEffect(() => {
    if (picked === null) return;
    const h = setInterval(() => setYear((y) => (y >= 30 ? y : y + 3)), 200);
    return () => clearInterval(h);
  }, [picked]);
  const gone = Math.max(0, Math.floor(year / 3) - 1);
  const card = (fee: string, correct: boolean, slot: number, rate: number) => (
    <Opt key={slot} c={correct} state={stateFor(slot, correct)} onPick={() => pick(slot, correct)}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5 }}>{fee}</span>
        <b className="stk-slab" style={{ marginLeft: "auto", fontSize: 15.5 }}>
          ${Math.round(10000 * Math.pow(rate, year)).toLocaleString()}
        </b>
      </div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", paddingTop: 6, minHeight: 18 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #f0d98a, #c7a848)", border: "1px solid #a68d58", opacity: !correct && i < gone ? 0 : 1, transform: !correct && i < gone ? "translateY(10px)" : "none", transition: "all 0.3s ease" }} />
        ))}
      </div>
    </Opt>
  );
  return (
    <>
      <Q t={props.it.q} />
      {card("0.05% a year", true, 0, 1.07)}
      {card("2% a year", false, 1, 1.05)}
      {picked !== null ? <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15, textAlign: "center", color: FELT.ink }}>year {year}</div> : null}
    </>
  );
}

function DcaItem(props: { it: Extract<ContentItem, { type: "dca" }>; onDone: (line: string) => void }) {
  const [taps, setTaps] = useState<{ x: number; y: number }[]>([]);
  const pts = props.it.fund ? PT.calm : PT.dca;
  const svgRef = useRef<SVGSVGElement>(null);
  const done = taps.length >= 4;
  useEffect(() => {
    if (!done) return;
    const avg = Math.round(taps.reduce((a, t) => a + (120 - t.y), 0) / 4);
    const xs = taps.map((t) => t.x).sort((a, b) => a - b);
    const minGap = Math.min(xs[1] - xs[0], xs[2] - xs[1], xs[3] - xs[2]);
    const line = minGap > 40 ? `Nice and steady. Average $${avg}.` : `Too bunched. Average $${avg}. Spread your buys.`;
    const t = setTimeout(() => props.onDone(line), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  return (
    <>
      <Q t={props.it.q} />
      <div className="stk-card">
        <svg
          ref={svgRef}
          viewBox="0 0 300 92"
          style={{ display: "block", width: "100%", height: 120, cursor: "crosshair" }}
          onClick={(e) => {
            if (done || !svgRef.current) return;
            const r = svgRef.current.getBoundingClientRect();
            const x = Math.max(4, Math.min(296, ((e.clientX - r.left) / r.width) * 300));
            setTaps([...taps, { x, y: ptsYOf(pts, x) }]);
          }}
        >
          <polyline fill="none" stroke={props.it.fund ? "#c7a848" : "#3d8c5b"} strokeWidth={2.5} points={pts} />
          {taps.map((t, i) => (
            <circle key={i} cx={t.x} cy={t.y} r={5.5} fill="#2a2419" />
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", minHeight: 48, paddingTop: 12 }}>
        {taps.map((t, i) => (
          <span key={i} className="stk-drop" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {pieceEl(props.it.fund ? "gold" : "red", 26)}
            <b className="stk-slab" style={{ fontSize: 11.5, color: FELT.ink }}>${Math.round(120 - t.y)}</b>
          </span>
        ))}
      </div>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15, textAlign: "center", padding: "8px 0" }}>
        {taps.length} of 4 buys placed
      </div>
    </>
  );
}

function TeachItem(props: { it: Extract<ContentItem, { type: "teach" }>; onNext: () => void }) {
  return (
    <>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 30, margin: "4px 2px 14px" }}>{props.it.word}</div>
      <TeachPic pic={props.it.pic} />
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16.5, textAlign: "center", padding: "16px 0 4px" }}>{props.it.line}</div>
      <div style={{ height: 26 }} />
      <button className="stk-btn green" style={{ width: "100%" }} onClick={props.onNext} data-cont>Got it</button>
    </>
  );
}

function PaydropItem(props: { onNext: () => void }) {
  return (
    <div style={{ textAlign: "center", marginTop: 34, display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ fontSize: 14.5, color: FELT.inkDim, marginBottom: 10 }}>{LESSON1.paySub}</div>
      <TickMoney to={L1_PREPAY} ms={750} className="stk-slab" style={{ fontWeight: 700, fontSize: 56 }} />
      <Bills count={4} />
      <DealtRow dealt={LESSON_DEAL} />
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16.5, padding: "10px 0" }}>{LESSON1.payLine}</div>
      <div style={{ height: 26 }} />
      <button className="stk-btn green" style={{ width: "100%" }} onClick={props.onNext} data-cont>Take it</button>
    </div>
  );
}

function FirstBuyItem(props: {
  q: string;
  state: StackState;
  update: (s: StackState) => void;
  onNext: () => void;
}) {
  const [ownedId, setOwnedId] = useState<string | null>(null);
  const [showCont, setShowCont] = useState(false);
  const [pxText, setPxText] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ownedId) return;
    const t = setTimeout(() => setShowCont(true), 1900);
    const r = seededRng(17);
    const a = [50];
    for (let i = 0; i < 45; i++) a.push(a[a.length - 1] + (r() - 0.5) * 3);
    let p = priceAt(ownedId, 1);
    const h = setInterval(() => {
      a.push(a[a.length - 1] + (r() - 0.5) * 3);
      if (a.length > 46) a.shift();
      p = p * (1 + (r() - 0.5) * 0.0035);
      setPxText(`${money(p)} and moving`);
      const mn = Math.min(...a);
      const mx = Math.max(...a);
      const span = Math.max(mx - mn, 0.0001);
      if (svgRef.current) {
        svgRef.current.innerHTML = `<polyline fill="none" stroke="#3d8c5b" stroke-width="2.5" points="${a
          .map((v, i) => `${((i / 45) * 300).toFixed(1)},${(58 - ((v - mn) / span) * 50).toFixed(1)}`)
          .join(" ")}"/>`;
      }
    }, 110);
    return () => { clearTimeout(t); clearInterval(h); };
  }, [ownedId]);

  if (ownedId) {
    const c = COMPANIES[ownedId];
    return (
      <>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div className="stk-drop" style={{ display: "flex", justifyContent: "center" }}>{pieceEl(c.color, 74, c.name[0])}</div>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 23, marginTop: 10 }}>1 share of {c.name}. Yours.</div>
        </div>
        <div className="stk-card" style={{ marginTop: 14 }}>
          <svg ref={svgRef} viewBox="0 0 300 64" style={{ display: "block", width: "100%", height: 62 }} aria-hidden />
          <Cap t={pxText} />
        </div>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 16, textAlign: "center", padding: "12px 0" }}>{LESSON1.ownLine}</div>
        <div style={{ height: 26 }} />
        {showCont ? <button className="stk-btn green" style={{ width: "100%" }} onClick={props.onNext} data-cont>Continue</button> : null}
      </>
    );
  }

  const rows = ["nke", "pfe", "aapl"];
  return (
    <>
      <Q t={props.q} />
      <div style={{ fontSize: 13.5, color: FELT.inkDim, margin: "-8px 2px 14px" }}>Your first Buy card pays for it.</div>
      {rows.map((id) => {
        const c = COMPANIES[id];
        const can = props.state.cash >= priceAt(id, props.state.day) && props.state.deck.buy > 0;
        return (
          <div
            key={id}
            className="stk-card"
            data-firstbuy={id}
            style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 11, opacity: can ? 1 : 0.55, cursor: can ? "pointer" : "default" }}
            onClick={
              can
                ? () => {
                    const next = playBuy(props.state, id, 1);
                    if (next) {
                      props.update(next);
                      setOwnedId(id);
                    }
                  }
                : undefined
            }
          >
            {pieceEl(c.color, 48, c.name[0])}
            <div>
              <div className="stk-slab" style={{ fontWeight: 700, fontSize: 17 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: FELT.cardDim }}>{c.blurb}</div>
            </div>
            <b className="stk-slab" style={{ marginLeft: "auto", fontSize: 15.5, textAlign: "right" }}>
              {money(priceAt(id, props.state.day))}
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: can ? FELT.upInk : "#8a7c5c" }}>
                {can ? "yours today" : "save up"}
              </span>
            </b>
          </div>
        );
      })}
    </>
  );
}

// ---------------- chest ceremony

export function ChestCeremony(props: {
  chest: ChestId;
  state: StackState;
  update: (s: StackState) => void;
  onDone: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const grant = CHEST_CARDS[props.chest];
  const reveals: { kind: "strategy" | "concept"; id: string }[] = [
    { kind: "strategy", id: grant.strategy },
    ...grant.concepts.map((c) => ({ kind: "concept" as const, id: c })),
  ];
  const title = props.chest === "unit1" ? "Unit 1 complete" : props.chest === "unit2" ? "Unit 2 complete" : "Everything complete";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, paddingTop: 30 }}>
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 28 }}>{title}</div>
      {!opened ? (
        <>
          <div
            data-chest
            style={{ marginTop: 40, cursor: "pointer" }}
            onClick={() => {
              props.update(openChest(props.state, props.chest));
              setOpened(true);
              setRevealed(1);
            }}
          >
            <svg width="180" height="140" viewBox="0 0 180 140" aria-hidden>
              <rect x="20" y="58" width="140" height="70" rx="10" fill="#6e4a26" stroke="#4a3016" strokeWidth="4" />
              <path d="M20 68 a70 34 0 0 1 140 0 v6 H20 Z" fill="#815a30" stroke="#4a3016" strokeWidth="4" />
              <rect x="80" y="60" width="20" height="26" rx="4" fill="#ecdcae" stroke="#a68d58" strokeWidth="3" />
              <rect x="20" y="70" width="140" height="8" fill="#4a3016" opacity="0.5" />
            </svg>
          </div>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15, color: FELT.inkDim, marginTop: 16 }}>Tap to open</div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 30 }}>
            {reveals.slice(0, revealed).map((r) =>
              r.kind === "strategy" ? (
                <span key={r.id} className="stk-drop" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <StrategyCard id={r.id} />
                  <b className="stk-slab" style={{ fontSize: 14, color: FELT.ink }}>x3</b>
                </span>
              ) : (
                <span key={r.id} className="stk-drop stk-card" style={{ width: 128, padding: "12px 13px", alignSelf: "flex-start" }}>
                  <div className="stk-slab" style={{ fontWeight: 700, fontSize: 14.5 }}>{CONCEPT_CARDS[r.id].name}</div>
                  <div style={{ fontSize: 11.5, color: FELT.cardDim, marginTop: 3 }}>{CONCEPT_CARDS[r.id].line}</div>
                </span>
              ),
            )}
          </div>
          <div style={{ marginTop: 34, width: "100%" }}>
            {revealed < reveals.length ? (
              <button className="stk-btn" style={{ width: "100%" }} onClick={() => setRevealed(revealed + 1)} data-cont>Next</button>
            ) : (
              <button className="stk-btn green" style={{ width: "100%" }} onClick={props.onDone} data-cont>Take them</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- the lesson shell

export default function Lesson(props: {
  u: number;
  l: number;
  state: StackState;
  update: (s: StackState) => void;
  onExit: () => void;
}) {
  const lesson = UNITS_CONTENT[props.u].lessons[props.l];
  const isReview = !!props.state.done[lessonKey(props.u, props.l)];
  const [queue, setQueue] = useState<Compiled[]>(() => compileSession(props.u, props.l, props.state.missKinds));
  const [idx, setIdx] = useState(0);
  const [firstCorrect, setFirstCorrect] = useState(0);
  const [flash, setFlash] = useState<{ ok: boolean; line: string } | null>(null);
  const [phase, setPhase] = useState<"items" | "end" | "chest">("items");
  const [endInfo, setEndInfo] = useState<{ pay: number; dealt: Partial<Deck>; payNote: string; endVal: number } | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const chestRef = useRef<ChestId | null>(null);
  const [, setChestTick] = useState(0);
  const total = useMemo(() => queue.filter((i) => isScored(i) && !i.requeued).length, [queue]);
  const item = queue[idx];
  // the lesson 1 prepay itself lands in the click handler that opened this
  // lesson (single-fire); this stage only draws it.

  // a review of lesson 1 skips the guided beats
  useEffect(() => {
    if (isReview && item && (item.type === "paydrop" || item.type === "firstbuy")) {
      advanceRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isReview]);

  const advance = () => {
    setFlash(null);
    if (idx + 1 >= queue.length) {
      finish();
    } else {
      setIdx(idx + 1);
    }
  };

  const finish = () => {
    const { state, pay, dealt, payNote } = applyLesson(props.state, props.u, props.l, firstCorrect, total);
    const endVal = lesson.prepay && !isReview ? holdingsWorth(state) : pay;
    props.update(state);
    setEndInfo({ pay, dealt, payNote, endVal });
    setPhase("end");
  };

  const onResult = (correct: boolean, it: Compiled) => {
    if (correct && !it.requeued) setFirstCorrect((n) => n + 1);
    if (correct) {
      setFlash({ ok: true, line: "right" in it ? (it as { right: string }).right : "" });
      setTimeout(advanceRef.current, 1200);
    } else {
      setQueue((q) => [...q, { ...it, requeued: true }]);
      props.update({ ...props.state, missKinds: { ...props.state.missKinds, [it.type]: true } });
      setFlash({ ok: false, line: "wrong" in it ? (it as { wrong: string }).wrong : "" });
    }
  };
  // keep the timer pointing at the freshest advance
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const pct = Math.round(((phase === "items" ? idx : queue.length) / Math.max(1, queue.length)) * 100);

  let body: React.ReactNode = null;
  if (phase === "chest") {
    // the chest id is pinned when the phase begins so the ceremony survives
    // the open (which clears the unopened flag) without vanishing; a second
    // earned chest (unit 2 capstone also completes the game) chains next
    body = chestRef.current ? (
      <ChestCeremony
        key={chestRef.current}
        chest={chestRef.current}
        state={props.state}
        update={props.update}
        onDone={() => {
          const another = unopenedChest(props.state);
          if (another) {
            chestRef.current = another;
            setChestTick((t) => t + 1);
          } else {
            props.onExit();
          }
        }}
      />
    ) : null;
  } else if (phase === "end" && endInfo) {
    const acc = total > 0 ? firstCorrect / total : 1;
    const buyables = lesson.meet.length ? lesson.meet : props.state.learned.slice(0, 3);
    body = (
      <>
        <div style={{ textAlign: "center" }}>
          <div className="stk-slab" style={{ fontWeight: 700, fontSize: 40, marginTop: 4 }}>{firstCorrect} of {total}</div>
          <div style={{ color: "rgba(242,233,210,0.75)", fontSize: 14 }}>first try</div>
          {endInfo.pay > 0 || endInfo.endVal > 0 ? (
            <>
              <Bills count={Math.min(4, Math.ceil((endInfo.pay || endInfo.endVal) / 20))} />
              <TickMoney to={endInfo.endVal} className="stk-slab" style={{ fontWeight: 700, fontSize: 32 }} />
            </>
          ) : (
            <div className="stk-slab" style={{ fontWeight: 700, fontSize: 32, marginTop: 10 }}>$0.00</div>
          )}
          <div style={{ fontSize: 12.5, color: "rgba(242,233,210,0.6)", marginBottom: 4 }}>{endInfo.payNote}</div>
          <DealtRow dealt={endInfo.dealt} />
        </div>
        {buyables.length ? (
          <>
            <div className="stk-slab" style={{ fontWeight: 700, fontSize: 15.5, margin: "12px 0 8px" }}>Buy what you met?</div>
            <div style={{ fontSize: 12.5, color: FELT.inkDim, marginBottom: 8 }}>One tap plays a Buy card for 1 share. Buy cards: {props.state.deck.buy}</div>
            {buyables.map((id) => {
              const c = COMPANIES[id];
              const p = priceAt(id, props.state.day);
              const owned = lotsOf(props.state, id).length;
              const hasCash = props.state.cash >= p;
              const hasCards = props.state.deck.buy > 0;
              const can = hasCash && hasCards;
              return (
                <div key={id} className="stk-card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
                  <span className={justBought === id ? "stk-drop" : undefined} style={{ display: "inline-flex" }}>{pieceEl(c.color, 34, c.name[0])}</span>
                  <div>
                    <div className="stk-slab" style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: FELT.cardDim }}>{money(p)} a share{owned ? ` · you hold ${owned}` : ""}</div>
                  </div>
                  {can ? (
                    <span
                      className="stk-btn green"
                      data-quickbuy={id}
                      style={{ marginLeft: "auto", padding: "8px 15px", fontSize: 13 }}
                      onClick={() => {
                        const next = playBuy(props.state, id, 1);
                        if (next) {
                          props.update(next);
                          setJustBought(id);
                        }
                      }}
                    >
                      Buy 1
                    </span>
                  ) : (
                    <span className="stk-btn quiet" style={{ marginLeft: "auto", padding: "8px 15px", fontSize: 12.5, cursor: "default" }}>
                      {hasCards ? `Save up · ${Math.round((props.state.cash / p) * 100)}%` : "No Buy cards"}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        ) : null}
        <div style={{ marginTop: 16, position: "relative", minHeight: acc >= 0.999 && !isReview ? 78 : 12 }}>
          {acc >= 0.999 && !isReview ? <span style={{ position: "absolute", right: 0, bottom: 0 }}><Bull /></span> : null}
        </div>
        <button
          className="stk-btn quiet"
          style={{ width: "100%" }}
          data-endlesson
          onClick={() => {
            const chest = unopenedChest(props.state);
            if (chest) {
              chestRef.current = chest;
              setPhase("chest");
            } else {
              props.onExit();
            }
          }}
        >
          {unopenedChest(props.state) ? "Open your chest" : "Keep the cash"}
        </button>
      </>
    );
  } else if (item) {
    const key = `${idx}-${item.type}`;
    if (item.type === "teach") body = <TeachItem key={key} it={item} onNext={advance} />;
    else if (item.type === "paydrop") body = isReview ? null : <PaydropItem key={key} onNext={advance} />;
    else if (item.type === "firstbuy") body = <FirstBuyItem key={key} q={item.q} state={props.state} update={props.update} onNext={advance} />;
    else if (item.type === "choice") body = <ChoiceItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "live-up" || item.type === "live-down" || item.type === "live-vol") body = <LiveItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "pile") body = <PileItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "race") body = <RaceItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "break") body = <BreakItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "dollar") body = <DollarItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "drip") body = <DripItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "drain") body = <DrainItem key={key} it={item} onResult={(c) => onResult(c, item)} />;
    else if (item.type === "dca") {
      body = (
        <DcaItem
          key={key}
          it={item}
          onDone={(line) => {
            setFlash({ ok: true, line });
            setTimeout(advanceRef.current, 1700);
          }}
        />
      );
    }
    // a review of lesson 1 skips the paydrop beat
    if (item.type === "paydrop" && isReview) {
      setTimeout(advanceRef.current, 0);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: FELT.bg, zIndex: 40, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "22px 24px 0", display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
        <svg width="26" height="26" viewBox="0 0 26 26" style={{ opacity: 0.6, cursor: "pointer", flex: "none" }} onClick={props.onExit} data-quit>
          <path d="M6 6 L20 20 M20 6 L6 20" stroke={FELT.ink} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ flex: 1, height: 12, borderRadius: 999, background: "rgba(0,0,0,0.3)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: FELT.gold, boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)", transition: "width 0.35s ease" }} />
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "18px 24px 28px", flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        {body}
        {flash ? (
          <div style={{ position: "sticky", bottom: 0, marginTop: 14 }}>
            <div
              className="stk-drop"
              data-flash={flash.ok ? "ok" : "no"}
              style={{
                borderRadius: 13,
                padding: "13px 15px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: flash.ok ? "#3d8c5b" : "#c05545",
                color: flash.ok ? FELT.ink : "#fff",
                boxShadow: `0 5px 0 ${flash.ok ? FELT.greenDark : FELT.redDark}`,
              }}
            >
              {!flash.ok ? <Bear /> : null}
              <span className="stk-slab" style={{ fontWeight: 700, fontSize: 17 }}>{flash.line}</span>
            </div>
          </div>
        ) : null}
      </div>
      {flash && !flash.ok ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 45 }} data-tapnext onClick={advance} />
      ) : null}
    </div>
  );
}
