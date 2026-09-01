// Stack's top bar and the page-level state hook. Both pages share these;
// the model does the thinking, this draws chips and routes taps.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  StackState, demoState, loadState, money, resetState, saveState, tomorrow, totalWorth,
} from "../../lib/stack/model";
import { BillsGlyph, ChipsGlyph, FELT, FlameGlyph, SLAB } from "./kit";

function isDemo(): boolean {
  return /[?&]demo=1/.test(window.location.hash) || /[?&]demo=1/.test(window.location.search);
}

export function useStackState(): [StackState, (s: StackState) => void] {
  const [s, setS] = useState<StackState>(() => (isDemo() ? demoState() : loadState()));
  const update = (n: StackState) => {
    setS(n);
    if (!isDemo()) saveState(n);
  };
  return [s, update];
}

export function TopBar(props: {
  state: StackState;
  update: (s: StackState) => void;
  active: "learn" | "desk";
}) {
  const nav = useNavigate();
  const s = props.state;
  const chg = s.dayChg;
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 24px 6px", display: "flex", alignItems: "center", gap: 10 }}>
      <Link to="/stack" style={{ textDecoration: "none", color: FELT.ink, fontFamily: SLAB, fontWeight: 700, fontSize: 24, marginRight: 6 }}>
        Stack
      </Link>
      <Link
        to="/stack"
        className="stk-chip"
        style={{ textDecoration: "none", background: props.active === "learn" ? "rgba(0,0,0,0.42)" : undefined }}
      >
        Learn
      </Link>
      <Link
        to="/stack/desk"
        className="stk-chip"
        style={{ textDecoration: "none", background: props.active === "desk" ? "rgba(0,0,0,0.42)" : undefined }}
      >
        The Desk
      </Link>
      <span style={{ flex: 1 }} />
      <span className="stk-chip" style={{ cursor: "default" }} title={`Day ${s.day}`}>
        <FlameGlyph />
        {s.day}
      </span>
      <span className="stk-chip" style={{ cursor: "default" }} data-cash>
        <BillsGlyph />
        {money(s.cash)}
      </span>
      <span className="stk-chip" style={{ cursor: "default" }} data-worth>
        <ChipsGlyph />
        {money(totalWorth(s))}
        {typeof chg === "number" && Math.abs(chg) > 0.005 ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: chg >= 0 ? FELT.up : FELT.dn }}>
            {chg >= 0 ? "+" : "-"}${Math.abs(chg).toFixed(2)}
          </span>
        ) : null}
      </span>
      <button
        className="stk-btn quiet"
        style={{ padding: "8px 15px", fontSize: 13.5 }}
        data-tomorrow
        onClick={() => {
          const { state } = tomorrow(s);
          props.update(state);
        }}
      >
        Tomorrow
      </button>
      <button
        className="stk-btn quiet"
        style={{ padding: "8px 12px", fontSize: 12.5, opacity: 0.7 }}
        onClick={() => {
          resetState();
          props.update(loadState());
          nav("/stack");
        }}
      >
        Start over
      </button>
    </div>
  );
}
