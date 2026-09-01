// Stack's shared UI kit: the felt skin, the slab numerals charter, the
// checker discs, the strategy cards, and the little chart pictures.
// Pages compose these; the model layer does the thinking.

import { CSSProperties, ReactNode, useEffect } from "react";
import { Company, money } from "../../lib/stack/model";
import { CARD_LINES } from "../../content/stackContent";

// The slab charter: Stack's own numerals face, exempt from clean-type
// (docs/stack-desktop-spec.md, carried from the sketch). Loaded only on
// Stack pages.
export const SLAB = '"Roboto Slab", Georgia, serif';

export function useSlabFont(): void {
  useEffect(() => {
    if (document.getElementById("stack-slab-font")) return;
    const link = document.createElement("link");
    link.id = "stack-slab-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

export const FELT = {
  bg: "radial-gradient(120% 90% at 50% 0%, #2f7350 0%, #266243 46%, #1d5237 100%)",
  ink: "#f2e9d2",
  inkDim: "rgba(242,233,210,0.65)",
  card: "#f4ecd6",
  cardInk: "#2a2419",
  cardDim: "#6f6248",
  green: "#3d8c5b",
  greenDark: "#1e4a30",
  red: "#c05545",
  redDark: "#6e241b",
  gold: "#ecdcae",
  goldDark: "#a68d58",
  up: "#8fd8a8",
  dn: "#f0a89b",
  upInk: "#3d6b47",
  dnInk: "#a33325",
};

// One stylesheet for the pieces and cards; injected once per page.
export function StackStyles() {
  return (
    <style>{`
      .stk-slab { font-family: ${SLAB}; }
      .stk-chip {
        display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
        font-family: ${SLAB}; font-weight: 700; font-size: 14.5px;
        padding: 7px 13px; border-radius: 999px;
        background: rgba(0,0,0,0.28); color: ${FELT.ink};
        box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.08);
        white-space: nowrap;
      }
      .stk-btn {
        display: inline-flex; align-items: center; justify-content: center;
        border: none; cursor: pointer; font-family: ${SLAB}; font-weight: 700;
        font-size: 15px; padding: 11px 22px; border-radius: 12px;
        background: ${FELT.gold}; color: ${FELT.cardInk};
        box-shadow: 0 5px 0 ${FELT.goldDark}; transition: transform 0.08s ease;
      }
      .stk-btn:active { transform: translateY(2px); box-shadow: 0 3px 0 ${FELT.goldDark}; }
      .stk-btn.green { background: ${FELT.green}; color: ${FELT.ink}; box-shadow: 0 5px 0 ${FELT.greenDark}; }
      .stk-btn.green:active { box-shadow: 0 3px 0 ${FELT.greenDark}; }
      .stk-btn.quiet { background: rgba(0,0,0,0.25); color: rgba(242,233,210,0.85); box-shadow: none; }
      .stk-card {
        background: ${FELT.card}; color: ${FELT.cardInk}; border-radius: 14px;
        padding: 14px 16px; box-shadow: 0 5px 0 rgba(0,0,0,0.28);
      }
      .stk-glass {
        background: rgba(0,0,0,0.22); color: ${FELT.ink}; border-radius: 14px;
        padding: 13px 15px; box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.06);
      }
      .stk-node {
        display: flex; align-items: center; gap: 13px; background: rgba(0,0,0,0.18);
        border-radius: 13px; padding: 12px 15px; margin-bottom: 9px; cursor: pointer;
        transition: transform 0.08s ease;
      }
      .stk-node:not(.lock):hover { transform: translateY(-1px); }
      .stk-node:not(.lock):active { transform: scale(0.99); }
      .stk-node.lock { opacity: 0.55; cursor: default; }

      .stk-pc { border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: none; }
      .stk-pc.cream { background: radial-gradient(circle at 50% 38%, #f7edd0, #ecdcae 66%, #dcc98f 67%); border: 3px dashed rgba(90,70,30,0.25); }
      .stk-pc.red { background: radial-gradient(circle at 50% 38%, #d95c4e, #b23a2e 66%, #9c3226 67%); border: 3px dashed rgba(255,255,255,0.35); }
      .stk-pc.black { background: radial-gradient(circle at 50% 38%, #4a443c, #322d26 66%, #262119 67%); border: 3px dashed rgba(255,255,255,0.25); }
      .stk-pc.slate { background: radial-gradient(circle at 50% 38%, #9aa4ab, #7a8288 66%, #6a7278 67%); border: 3px dashed rgba(255,255,255,0.3); }
      .stk-pc.gold { background: radial-gradient(circle at 50% 38%, #f0d98a, #ddbf5e 66%, #c7a848 67%); border: 3px dashed rgba(120,90,20,0.35); }

      .stk-disc {
        width: 74px; height: 18px; border-radius: 9px; margin-top: -8px; position: relative; flex: none;
        display: flex; align-items: center; justify-content: center;
        --face: #f7edd0; --edge: #dcc98f; --stripe: rgba(90,70,30,0.3);
        background: repeating-linear-gradient(90deg, var(--stripe) 0 6px, transparent 6px 19px), linear-gradient(180deg, var(--face), var(--edge));
        box-shadow: 0 2px 2px rgba(0,0,0,0.3); transition: transform 0.15s ease;
      }
      .stk-disc.red { --face: #d95c4e; --edge: #9c3226; --stripe: rgba(247,237,208,0.7); }
      .stk-disc.slate { --face: #9aa4ab; --edge: #6a7278; --stripe: rgba(247,237,208,0.7); }
      .stk-disc.black { --face: #4a443c; --edge: #262119; --stripe: rgba(247,237,208,0.55); }
      .stk-disc.gold { --face: #f0d98a; --edge: #c7a848; --stripe: rgba(120,90,20,0.35); }
      .stk-disc b {
        display: none; font-family: ${SLAB}; font-size: 10.5px; font-weight: 700;
        color: #f7f2e2; background: rgba(42,36,25,0.55); border-radius: 7px;
        padding: 0 6px; position: relative; z-index: 3;
      }
      .stk-col.sel .stk-disc { margin-top: 4px; }
      .stk-col.sel .stk-disc b { display: block; }
      .stk-disc.cap::before {
        content: ""; position: absolute; left: 2px; right: 2px; top: -9px; height: 14px;
        border-radius: 50%; background: radial-gradient(circle at 50% 38%, var(--face), var(--edge));
        border: 2px dashed var(--stripe);
      }
      .stk-disc.pick { outline: 3px solid #ffffff; outline-offset: -1px; transform: translateY(-3px); z-index: 2; }
      .stk-disc.ghost { background: transparent; border: 2px dashed rgba(255,255,255,0.3); box-shadow: none; }
      .stk-disc.mini { width: 30px; height: 9px; border-radius: 4.5px; margin-top: -4px; box-shadow: 0 1px 1px rgba(0,0,0,0.3); }
      .stk-disc.mini::before { display: none; }
      .stk-bill {
        width: 64px; height: 15px; border-radius: 3px; margin-top: -7px; position: relative; flex: none;
        background: linear-gradient(180deg, #5cae76, #3e8b58); border: 1px solid rgba(0,0,0,0.28);
        box-shadow: 0 2px 2px rgba(0,0,0,0.25);
      }
      .stk-bill::after {
        content: ""; position: absolute; left: 25px; right: 25px; top: -1px; bottom: -1px;
        background: rgba(242,233,210,0.65); border-radius: 1px;
      }
      .stk-col { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
      .stk-tag {
        font-family: ${SLAB}; font-weight: 700; font-size: 12.5px; background: rgba(0,0,0,0.3);
        border-radius: 9px; padding: 4px 11px; margin-bottom: 11px; text-align: center;
        color: ${FELT.ink}; line-height: 1.3;
      }
      .stk-discs { display: flex; flex-direction: column-reverse; align-items: center; }

      .stk-scard {
        width: 128px; height: 178px; border-radius: 12px; background: ${FELT.card};
        color: ${FELT.cardInk}; box-shadow: 0 6px 0 rgba(0,0,0,0.3);
        display: flex; flex-direction: column; align-items: center; padding: 10px 10px 12px;
        position: relative; flex: none; transition: transform 0.12s ease; cursor: pointer;
      }
      .stk-scard:hover { transform: translateY(-6px); }
      .stk-scard .ring { position: absolute; inset: 5px; border-radius: 9px; border: 2px solid rgba(90,70,30,0.25); pointer-events: none; }
      .stk-scard.locked {
        background: rgba(0,0,0,0.28); color: ${FELT.inkDim}; box-shadow: none;
        border: 2px dashed rgba(242,233,210,0.3); cursor: default;
      }
      .stk-scard.locked:hover { transform: none; }
      .stk-scard.risky .ring { border-color: rgba(176,58,46,0.55); }

      @keyframes stk-drop { from { transform: translateY(-26px); opacity: 0; } }
      .stk-drop { animation: stk-drop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1); }
    `}</style>
  );
}

// ---------------- little pictures

export function pieceEl(color: Company["color"], size: number, label?: string, style?: CSSProperties) {
  return (
    <span className={`stk-pc ${color}`} style={{ width: size, height: size, ...style }}>
      {label ? (
        <b className="stk-slab" style={{ fontSize: Math.round(size * 0.34), color: "rgba(0,0,0,0.5)" }}>{label}</b>
      ) : null}
    </span>
  );
}

export function DiscStack(props: {
  color: Company["color"];
  labels: string[]; // bottom-up, one per lot (the price paid)
  picked?: number[];
  selected?: boolean;
}) {
  const n = props.labels.length;
  return (
    <div className="stk-discs">
      {props.labels.map((label, i) => (
        <span
          key={i}
          className={`stk-disc ${props.color}${i === n - 1 ? " cap" : ""}${props.picked?.includes(i) ? " pick" : ""}`}
          data-lot={i}
        >
          <b>{label}</b>
        </span>
      ))}
    </div>
  );
}

// Simple card art per strategy card, in the game's own language.
function cardArt(id: string) {
  if (id === "buy") {
    return (
      <svg width="64" height="52" viewBox="0 0 64 52" aria-hidden>
        <path d="M32 4 L44 20 H37 V34 H27 V20 H20 Z" fill="#3d8c5b" />
        <ellipse cx="32" cy="42" rx="17" ry="7" fill="#b23a2e" />
        <ellipse cx="32" cy="38.5" rx="17" ry="7" fill="#d95c4e" stroke="rgba(0,0,0,0.2)" />
      </svg>
    );
  }
  if (id === "sell") {
    return (
      <svg width="64" height="52" viewBox="0 0 64 52" aria-hidden>
        <ellipse cx="20" cy="16" rx="13" ry="5.5" fill="#d95c4e" stroke="rgba(0,0,0,0.2)" />
        <path d="M34 22 L46 22 M41 17 L47 22.5 L41 28" stroke="#3d8c5b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <rect x="18" y="34" width="28" height="10" rx="2" fill="#3e8b58" />
        <rect x="18" y="30" width="28" height="10" rx="2" fill="#5cae76" stroke="rgba(0,0,0,0.18)" />
        <circle cx="32" cy="35" r="3.2" fill="rgba(255,255,255,0.5)" />
      </svg>
    );
  }
  if (id === "schedule") {
    return (
      <svg width="64" height="52" viewBox="0 0 64 52" aria-hidden>
        <polyline points="4,40 18,32 32,36 46,24 60,18" fill="none" stroke="#8a7c5c" strokeWidth="2.5" />
        {[10, 25, 40, 55].map((x, i) => (
          <circle key={i} cx={x} cy={[36.5, 33, 31.5, 20.5][i]} r="4.4" fill="#2a2419" />
        ))}
      </svg>
    );
  }
  if (id === "the500") {
    return (
      <svg width="64" height="52" viewBox="0 0 64 52" aria-hidden>
        <circle cx="32" cy="26" r="17" fill="#f0d98a" stroke="#c7a848" strokeWidth="3" strokeDasharray="5 4" />
        <text x="32" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily={SLAB} fill="#7a5f1c">500</text>
      </svg>
    );
  }
  // options
  return (
    <svg width="64" height="52" viewBox="0 0 64 52" aria-hidden>
      <path d="M8 40 L28 24 L44 32 L58 12" fill="none" stroke="#8a7c5c" strokeWidth="2.5" />
      <path d="M46 8 L58 12 L52 22" fill="none" stroke="#3d8c5b" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 44 L58 40 L52 30" fill="none" stroke="#b23a2e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StrategyCard(props: {
  id: string;
  locked?: boolean;
  lockLabel?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const def = CARD_LINES[props.id];
  if (props.locked) {
    return (
      <div className="stk-scard locked" aria-label={`Locked card: ${props.lockLabel ?? ""}`}>
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden>
            <rect x="4" y="14" width="22" height="17" rx="4" fill="rgba(242,233,210,0.35)" />
            <path d="M9 14 V10 a6 6 0 0 1 12 0 V14" fill="none" stroke="rgba(242,233,210,0.35)" strokeWidth="3.5" />
          </svg>
        </div>
        <div className="stk-slab" style={{ fontWeight: 700, fontSize: 12.5, textAlign: "center" }}>{props.lockLabel}</div>
      </div>
    );
  }
  return (
    <div
      className={`stk-scard${props.id === "options" ? " risky" : ""}`}
      onClick={props.onClick}
      style={props.active ? { outline: "3px solid #ffffff", outlineOffset: -1, transform: "translateY(-8px)" } : undefined}
      data-card={props.id}
    >
      <span className="ring" />
      <div className="stk-slab" style={{ fontWeight: 700, fontSize: 17, marginTop: 4 }}>{def.name}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>{cardArt(props.id)}</div>
      <div style={{ fontSize: 11.5, textAlign: "center", color: FELT.cardDim, lineHeight: 1.35 }}>{def.line}</div>
    </div>
  );
}

// ---------------- chart pictures (static)

const PTS = {
  up: "0,44 50,40 100,34 150,30 200,22 250,18 300,10",
  wild: "0,40 22,12 44,36 66,8 88,44 110,18 132,46 154,10 176,34 198,6 220,38 242,16 264,40 286,12 300,22",
  calm: "0,44 30,42 60,38 90,39 120,33 150,32 180,28 210,27 240,22 270,20 300,16",
  spike: "0,44 60,40 120,34 170,10 200,6 230,16 260,38 300,46",
  strat: "0,42 40,28 80,36 120,20 160,28 200,14 240,24 280,10 300,14",
};

function ptsY(pts: string, x: number): number {
  const P = pts.split(" ").map((s) => s.split(",").map(Number));
  for (let i = 1; i < P.length; i++) {
    if (x <= P[i][0]) {
      const t = (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
      return P[i - 1][1] + t * (P[i][1] - P[i - 1][1]);
    }
  }
  return P[P.length - 1][1];
}

export function ChartPic(props: { kind: string; height?: number }) {
  const h = props.height ?? 52;
  const k = props.kind;
  let line = "";
  let color = FELT.green;
  let dots: { x: number; r: number }[] = [];
  if (k === "up") line = PTS.up;
  else if (k === "calm") line = PTS.calm;
  else if (k === "wild") { line = PTS.wild; color = "#b23a2e"; }
  else if (k === "spike") { line = PTS.spike; color = "#b23a2e"; }
  else if (k === "dots-steady") { line = PTS.strat; color = "#8a7c5c"; dots = [22, 90, 158, 226, 294].map((x) => ({ x, r: 5 })); }
  else if (k === "dots-lump") { line = PTS.strat; color = "#8a7c5c"; dots = [{ x: 40, r: 8 }]; }
  else if (k === "dots-chase") { line = PTS.strat; color = "#8a7c5c"; dots = [40, 120, 200, 280].map((x) => ({ x, r: 5 })); }
  return (
    <svg viewBox={`0 0 300 ${h}`} style={{ display: "block", width: "100%", height: Math.round(h * 0.95) }} aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth={2.5} points={line} />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={ptsY(line, d.x)} r={d.r} fill="#2a2419" />
      ))}
    </svg>
  );
}

// ---------------- small svg glyphs

export function FlameGlyph() {
  return (
    <svg width="14" height="15" viewBox="0 0 15 16" aria-hidden>
      <path fill="#e8853c" d="M7.6 0c.9 3.4 4.9 4.6 4.9 8.6a5.4 5.4 0 0 1-10.8 0c0-2.7 2.1-3.6 2.8-6 .9 1.2 1.8 1.6 3.1-2.6z" />
      <path fill="#f3b64f" d="M7.5 6.5c.5 1.9 2.4 2.5 2.4 4.5a2.6 2.6 0 0 1-5.2 0c0-1.5 1-2 1.4-3.2.4.6.8.8 1.4-1.3z" />
    </svg>
  );
}

export function BillsGlyph() {
  return (
    <svg width="18" height="13" viewBox="0 0 19 14" aria-hidden>
      <rect x="1" y="6" width="17" height="7" rx="1.5" fill="#3e8b58" />
      <rect x="1" y="3.4" width="17" height="7" rx="1.5" fill="#4d9d67" stroke="rgba(0,0,0,.18)" />
      <rect x="1" y="0.8" width="17" height="7" rx="1.5" fill="#5cae76" stroke="rgba(0,0,0,.18)" />
      <circle cx="9.5" cy="4.3" r="2.1" fill="rgba(255,255,255,.5)" />
    </svg>
  );
}

export function ChipsGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" aria-hidden>
      <ellipse cx="7.5" cy="10.6" rx="6" ry="3.4" fill="#b03a2e" />
      <ellipse cx="7.5" cy="7.8" rx="6" ry="3.4" fill="#cd4a3c" stroke="rgba(0,0,0,.2)" />
      <ellipse cx="7.5" cy="5" rx="6" ry="3.4" fill="#d95c4e" stroke="rgba(0,0,0,.2)" />
    </svg>
  );
}

export function Bear(props: { size?: number }) {
  const s = props.size ?? 46;
  return (
    <svg width={s} height={Math.round(s * 0.91)} viewBox="0 0 100 90" style={{ flex: "none" }} aria-hidden>
      <circle cx="25" cy="20" r="11" fill="#5f4130" />
      <circle cx="75" cy="20" r="11" fill="#5f4130" />
      <circle cx="25" cy="20" r="5" fill="#a3785a" />
      <circle cx="75" cy="20" r="5" fill="#a3785a" />
      <ellipse cx="50" cy="49" rx="31" ry="28" fill="#5f4130" />
      <path d="M32 37 l11 5 M68 37 l-11 5" stroke="#1e1d1a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="39" cy="49" r="3.4" fill="#1e1d1a" />
      <circle cx="61" cy="49" r="3.4" fill="#1e1d1a" />
      <ellipse cx="50" cy="66" rx="16" ry="12" fill="#a3785a" />
      <ellipse cx="50" cy="61" rx="5.5" ry="4" fill="#1e1d1a" />
      <path d="M44 72 Q50 69 56 72" stroke="#1e1d1a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Bull(props: { size?: number }) {
  const s = props.size ?? 74;
  return (
    <svg width={s} height={Math.round(s * 0.9)} viewBox="0 0 100 90" aria-hidden>
      <path fill="#f2e6c4" d="M24 32 Q8 28 5 12 Q21 13 30 24z" />
      <path fill="#f2e6c4" d="M76 32 Q92 28 95 12 Q79 13 70 24z" />
      <ellipse fill="#8a5a3b" cx="19" cy="40" rx="10" ry="7" />
      <ellipse fill="#8a5a3b" cx="81" cy="40" rx="10" ry="7" />
      <ellipse fill="#8a5a3b" cx="50" cy="50" rx="31" ry="27" />
      <circle fill="#74492e" cx="41" cy="28" r="7" />
      <circle fill="#74492e" cx="51" cy="26" r="7" />
      <circle fill="#74492e" cx="60" cy="29" r="6" />
      <circle cx="39" cy="48" r="3.6" fill="#1e1d1a" />
      <circle cx="61" cy="48" r="3.6" fill="#1e1d1a" />
      <ellipse fill="#c98d6b" cx="50" cy="68" rx="18" ry="11.5" />
      <circle cx="43.5" cy="68" r="2.7" fill="#1e1d1a" opacity="0.5" />
      <circle cx="56.5" cy="68" r="2.7" fill="#1e1d1a" opacity="0.5" />
    </svg>
  );
}

// ---------------- page scaffolding

export function FeltPage(props: { children: ReactNode }) {
  useSlabFont();
  return (
    <div style={{ minHeight: "100vh", background: FELT.bg, color: FELT.ink, colorScheme: "light" }}>
      <StackStyles />
      {props.children}
    </div>
  );
}

export function UpDn(props: { value: number; suffix?: string }) {
  const up = props.value >= 0;
  return (
    <span style={{ fontSize: 12.5, fontWeight: 600, color: up ? FELT.up : FELT.dn }}>
      {up ? "+" : "-"}
      {money(Math.abs(props.value)).slice(1) === "" ? "" : "$" + Math.abs(props.value).toFixed(2)}
      {props.suffix}
    </span>
  );
}
