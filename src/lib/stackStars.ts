// The Stack's three named stars, judged from the trade log after the tape
// ends. They score the process, never the ending: how spread out the stack
// stayed, whether the money kept working without a fear-driven sell, and
// whether the run finished inside the goal band around the index.
//
// This is the reward function, so it is the curriculum. Nothing here pays out
// for picking the winner, and nothing pays out for a move the game could only
// grade with hindsight. Concentration that happens to win a run wins dollars
// and no stars, and the debrief says why.
import { HistoryMarket } from "../engine/history";
import { ScenarioConfig } from "../content/types";

export interface StackStars {
  spread: boolean;
  stayed: boolean;
  panicSells: number;
}

export function stackStars(m: HistoryMarket, cfg: ScenarioConfig): StackStars {
  const last = cfg.lastStep ?? cfg.dataset.months.length - 1;
  const buys = m.trades.filter((t) => t.side === "buy");
  if (buys.length === 0) return { spread: false, stayed: false, panicSells: 0 };
  const firstBuy = Math.min(...buys.map((t) => t.step));
  const shares: Record<string, number> = {};
  let ti = 0, investedMonths = 0, concentratedMonths = 0, months = 0, hw = 0;
  const netAt: number[] = [], hwAt: number[] = [];
  let buySpent = 0, sellGot = 0;
  for (let t = 0; t <= last; t++) {
    while (ti < m.trades.length && m.trades[ti].step <= t) {
      const tr = m.trades[ti++];
      if (tr.side === "buy") { shares[tr.id] = (shares[tr.id] ?? 0) + tr.shares; buySpent += tr.dollars; }
      else { shares[tr.id] = (shares[tr.id] ?? 0) - tr.shares; sellGot += tr.dollars; }
    }
    let invested = 0, top = 0;
    for (const id of Object.keys(shares)) {
      const v = shares[id] * (m.history[id]?.[t] ?? 0);
      invested += v;
      top = Math.max(top, v);
    }
    const cash = Math.max(0, cfg.startCash + (cfg.income ?? 0) * t - buySpent + sellGot);
    const net = cash + invested;
    hw = Math.max(hw, net);
    netAt.push(net);
    hwAt.push(hw);
    if (t > firstBuy) {
      months++;
      if (net > 0 && invested / net >= 0.6) investedMonths++;
      if (invested > 250 && top / invested > 0.6) concentratedMonths++;
    }
  }
  let panicSells = 0;
  for (const tr of m.trades) {
    if (tr.side === "sell" && hwAt[tr.step] > 0 && netAt[tr.step] / hwAt[tr.step] < 0.85) panicSells++;
  }
  return {
    spread: concentratedMonths <= 12,
    stayed: months > 0 && investedMonths / months >= 0.75 && panicSells === 0,
    panicSells,
  };
}
