// The run's past, rebuilt from the trade log, one column per month.
//
// The cylinder and the orb both drew a single shape and threw the last frame
// away, so a run had no history you could look at. The block stage keeps every
// column, which is what makes a drift toward one colour visible long before
// the crash that punishes it. Rebuilding from the log (rather than recording
// as we go) means the past is always exactly what happened, including after a
// restart or a rewind.
import { HistoryMarket } from "../engine/history";
import { ScenarioConfig } from "../content/types";
import { StackBand } from "../components/StackStage";
import { TileColumn } from "../components/TileStage";

// One column per month, every month. TileStage decides how many months a drawn
// column covers, because that depends on how much wall it has.
export function tileColumns(m: HistoryMarket, cfg: ScenarioConfig, upTo: number): TileColumn[] {
  const cols: TileColumn[] = [];
  const shares: Record<string, number> = {};
  let cash = cfg.startCash;
  let ti = 0;
  for (let t = 0; t <= upTo; t++) {
    if (t > 0) cash += cfg.income ?? 0;
    while (ti < m.trades.length && m.trades[ti].step <= t) {
      const tr = m.trades[ti++];
      if (tr.side === "buy") { shares[tr.id] = (shares[tr.id] ?? 0) + tr.shares; cash -= tr.dollars; }
      else { shares[tr.id] = (shares[tr.id] ?? 0) - tr.shares; cash += tr.dollars; }
    }
    // fixed bottom-up order: a colour always sits in the same slot, so
    // position carries identity alongside hue
    const bands: StackBand[] = [];
    for (const ea of cfg.assets) {
      const s = shares[ea.id] ?? 0;
      const price = m.history[ea.id]?.[t] ?? 0;
      if (s > 1e-6 && price > 0) {
        bands.push({ key: ea.id, color: ea.color, value: s * price, striped: ea.id === cfg.indexKey });
      }
    }
    cols.push({ bands, cash: Math.max(0, cash), index: m.bench[t] ?? cfg.startCash });
  }
  return cols;
}
