// Squarified treemap (Bruls, Huizing, van Wijk). Returns pixel rects for items
// sized proportionally to `value`, laid out to keep tiles close to square.

export interface TItem { key: string; value: number; }
export interface TRect { key: string; x: number; y: number; w: number; h: number; }

export function squarify(items: TItem[], W: number, H: number, x0 = 0, y0 = 0): TRect[] {
  const out: TRect[] = [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0 || W <= 0 || H <= 0) return out;
  const scale = (W * H) / total;
  const scaled = items.map((i) => ({ key: i.key, area: Math.max(i.value * scale, 1e-6) }));

  let x = x0, y = y0, w = W, h = H;
  let row: { key: string; area: number }[] = [];

  const worst = (r: { area: number }[], side: number, extra?: number) => {
    const areas = extra != null ? r.map((a) => a.area).concat(extra) : r.map((a) => a.area);
    if (!areas.length) return Infinity;
    const sum = areas.reduce((a, b) => a + b, 0);
    const mx = Math.max(...areas), mn = Math.min(...areas);
    const s2 = sum * sum;
    return Math.max((side * side * mx) / s2, s2 / (side * side * mn));
  };

  const layoutRow = () => {
    const sum = row.reduce((a, b) => a + b.area, 0);
    if (w <= h) {
      const rh = sum / w;
      let cx = x;
      for (const r of row) { const rw = r.area / rh; out.push({ key: r.key, x: cx, y, w: rw, h: rh }); cx += rw; }
      y += rh; h -= rh;
    } else {
      const rw = sum / h;
      let cy = y;
      for (const r of row) { const rh = r.area / rw; out.push({ key: r.key, x, y: cy, w: rw, h: rh }); cy += rh; }
      x += rw; w -= rw;
    }
  };

  let i = 0;
  while (i < scaled.length) {
    const side = Math.min(w, h);
    const nxt = scaled[i];
    if (row.length === 0 || worst(row, side, nxt.area) <= worst(row, side)) {
      row.push(nxt); i++;
    } else {
      layoutRow(); row = [];
    }
  }
  if (row.length) layoutRow();
  return out;
}

// Two-level: partition by group first (stable ordering), then items within.
export function groupedTreemap(
  items: (TItem & { group: string })[],
  W: number, H: number,
  gap = 0
): TRect[] {
  const groups = new Map<string, (TItem & { group: string })[]>();
  for (const it of items) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group)!.push(it); }
  const groupItems: TItem[] = [...groups.entries()].map(([key, arr]) => ({ key, value: arr.reduce((s, a) => s + a.value, 0) }));
  const groupRects = squarify(groupItems, W, H);
  const out: TRect[] = [];
  for (const gr of groupRects) {
    const arr = groups.get(gr.key)!.slice().sort((a, b) => b.value - a.value);
    const inner = squarify(arr, gr.w - gap * 2, gr.h - gap * 2, gr.x + gap, gr.y + gap);
    out.push(...inner);
  }
  return out;
}
