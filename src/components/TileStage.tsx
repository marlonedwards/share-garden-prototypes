import { useEffect, useRef } from "react";
import { StackBand, StackStageProps } from "./StackStage";
import { BLOCK_GROUP, allocateBlocks, blockDenom, blocksOf } from "../lib/blocks";

// The Stack's other stage: the same run drawn as countable blocks.
//
// StackStage puts portfolio value in the height of a glass cylinder, and the
// orb put it in a sphere's volume. Both ask the eye to judge a continuous
// quantity, which is the channel people read worst, and both draw one shape at
// a time, so the run has no visible past. This stage answers both at once:
//
//   one block   = a fixed number of dollars (src/lib/blocks.ts owns the ladder)
//   one column  = one time step
//   colour      = which holding, in a fixed bottom-up order, so position
//                 carries identity alongside hue
//   the past    = every earlier column stays on screen
//
// The goal corridor and the index are drawn in the same block units, because a
// goal you cannot count in the same currency as your stack is not a goal.
//
// Props are StackStage's, unchanged and with the same meanings, so this drops
// into the same slot. The additions are all optional: `columns` supplies the
// run's past (StackStage never needed one, having no memory), and the rest are
// presentation. Given no `columns`, this renders a single live column and
// still beats the cylinder on countability.

export interface TileColumn {
  bands: StackBand[];   // bottom-up, same fixed order as the live column
  cash: number;
  index: number;
}

export interface TileStageProps extends StackStageProps {
  columns?: TileColumn[];
  totalSteps?: number;                              // x extent, so the chart does not re-fit every month
  yearMarks?: { step: number; label: string }[];
  theme?: "day" | "night";
  focusFrom?: number;                               // highlight columns from here on (the year being tallied)
  // room the host page's own overlays take out of the stage, so nothing this
  // component draws lands underneath them
  chrome?: { top?: number; left?: number; right?: number };
  onPromote?: (denom: number, previous: number) => void;
}

const PAD_L = 56, PAD_R = 80, PAD_T = 24, PAD_B = 44;
const V_GAP = 0.17;      // vertical gap between blocks, as a fraction of block size
const GROUP_GAP = 0.5;   // extra gap every BLOCK_GROUP blocks, same units
const FUSE_MS = 1150;    // the denomination promotion: four blocks becoming one
const DROP_MS = 230;     // a new block landing
const STAGGER = 42;

interface Theme {
  ink: string; muted: string; faint: string;
  rule: string; floor: string;
  accent: string; corridorFill: string; corridorLine: string;
  index: string; cashLine: string;
  chipBg: string; chipLine: string; dead: string; focus: string;
}

const THEMES: Record<"day" | "night", Theme> = {
  day: {
    ink: "#1d1d1f", muted: "#6e6e73", faint: "#a1a1a6",
    rule: "rgba(0,0,0,0.055)", floor: "rgba(0,0,0,0.18)",
    accent: "#0071e3", corridorFill: "rgba(0,113,227,0.055)", corridorLine: "rgba(0,113,227,0.38)",
    index: "#59637a", cashLine: "rgba(58,112,84,0.62)",
    chipBg: "rgba(255,255,255,0.94)", chipLine: "rgba(0,0,0,0.10)", dead: "#b7bcc6",
    focus: "rgba(0,113,227,0.05)",
  },
  night: {
    ink: "#f2f5f8", muted: "#93a0b3", faint: "#6b7788",
    rule: "rgba(255,255,255,0.055)", floor: "rgba(255,255,255,0.26)",
    accent: "#f0b429", corridorFill: "rgba(240,180,41,0.045)", corridorLine: "rgba(240,180,41,0.45)",
    index: "#c3d0e2", cashLine: "rgba(150,175,215,0.42)",
    chipBg: "rgba(16,21,29,0.9)", chipLine: "rgba(255,255,255,0.14)", dead: "#5b6474",
    focus: "rgba(255,255,255,0.035)",
  },
};

// Block geometry for a given denomination. Kept as a function so the fusing
// animation can hold the old and the new geometry side by side.
//
// Two things are being solved at once. Vertically, the tallest column has to
// fit: that fixes how tall a block may be. Horizontally, a block should be
// about as wide as it is tall, or it stops reading as a unit. So the number of
// columns is not the number of months: the wall packs as many columns as it
// can at that block size and each column covers a stride of months. Nine years
// of monthly columns would squeeze the blocks to eight pixels; a stride of
// three or four keeps them chunky, and the whole past is still on screen.
function geom(maxDollars: number, denom: number, plotH: number, plotW: number, steps: number) {
  const maxBlocks = Math.max(1, Math.ceil(Math.max(1, maxDollars) / denom));
  const groups = Math.floor(maxBlocks / BLOCK_GROUP);
  const hUnit = plotH / (maxBlocks * (1 + V_GAP) + groups * GROUP_GAP);
  const wantCol = Math.max(2, hUnit / 0.84);
  const stride = Math.max(1, Math.ceil(Math.max(1, steps) / Math.max(1, Math.floor(plotW / wantCol))));
  const nCols = Math.max(1, Math.ceil(Math.max(1, steps) / stride));
  const colW = plotW / nCols;
  const bw = Math.max(1, colW * 0.84);
  // never taller than wide: when the wall runs out of height the blocks flatten
  // into bricks rather than becoming a scatter of dots
  const bh = Math.max(0.9, Math.min(hUnit, bw));
  const vGap = bh * V_GAP;
  const groupGap = bh * GROUP_GAP;
  // the y of the bottom edge of block `level` (level 0 sits on the floor)
  const bottom = (level: number) => -(level * (bh + vGap) + Math.floor(level / BLOCK_GROUP) * groupGap);
  return { maxBlocks, bw, bh, vGap, groupGap, bottom, stride, nCols, colW };
}

function font(px: number, w = 500) {
  return `${w} ${px}px "Helvetica Neue", Inter, -apple-system, system-ui, sans-serif`;
}

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

// One column's blocks, bottom-up: every holding in its fixed slot, then cash
// on top as hollow blocks. Cash is drawn, not hidden, because money that is
// not working is a visible part of the picture and "hold, and add to cash" has
// to cost something you can see.
function columnBlocks(bands: StackBand[], cash: number, denom: number) {
  const live = bands.filter((b) => !b.dead);
  const counts = allocateBlocks([...live.map((b) => Math.max(0, b.value)), Math.max(0, cash)], denom);
  const out: { color: string; striped?: boolean; cash?: boolean }[] = [];
  live.forEach((b, i) => {
    for (let k = 0; k < counts[i]; k++) out.push({ color: b.color, striped: b.striped });
  });
  for (let k = 0; k < counts[live.length]; k++) out.push({ color: "", cash: true });
  return out;
}

export default function TileStage(p: TileStageProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  // animation state, kept in refs so a redraw never fights React's render
  const drop = useRef({ from: 0, to: 0, at: 0 });
  const fuse = useRef({ from: 0, to: 0, at: 0 });
  const lastDenom = useRef(0);
  const promoted = useRef<((d: number, prev: number) => void) | undefined>(undefined);
  promoted.current = p.onPromote;

  const denom = blockDenom(p.maxDollars);
  const liveCount = blocksOf(
    p.bands.reduce((s, b) => s + (b.dead ? 0 : Math.max(0, b.value)), 0) + Math.max(0, p.cash),
    denom,
  );

  // a promotion is an event, not a redraw: announce it and start the fuse
  if (lastDenom.current === 0) lastDenom.current = denom;
  if (lastDenom.current !== denom) {
    const prev = lastDenom.current;
    lastDenom.current = denom;
    fuse.current = { from: prev, to: denom, at: performance.now() };
    if (promoted.current) setTimeout(() => promoted.current?.(denom, prev), 0);
  }
  if (drop.current.to !== liveCount) drop.current = { from: drop.current.to, to: liveCount, at: performance.now() };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d")!;
    const t = THEMES[p.theme ?? "day"];
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(p.width * dpr) || canvas.height !== Math.round(p.height * dpr)) {
        canvas.width = Math.round(p.width * dpr);
        canvas.height = Math.round(p.height * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, p.width, p.height);
      g.textBaseline = "middle";

      const now = performance.now();
      const allPast = p.columns ?? [];
      const steps = Math.max(1, p.totalSteps ?? allPast.length + 1);
      const baseY = p.height - PAD_B;
      const plotH = baseY - PAD_T;
      const plotW = p.width - PAD_L - PAD_R;
      const G = geom(p.maxDollars, denom, plotH, plotW, steps);
      const colW = G.colW;
      const nCols = G.nCols;
      // one column per stride of months, closing on the last month of each
      const past = allPast.filter((_, i) => i % G.stride === G.stride - 1);
      const toCol = (step: number) => Math.floor(step / G.stride);
      const yAt = (dollars: number) => baseY + G.bottom(Math.max(0, dollars) / denom);
      const colX = (i: number) => PAD_L + i * colW + (colW - G.bw) / 2;
      const chromeTop = p.chrome?.top ?? 0;
      const chromeLeft = p.chrome?.left ?? 0;
      const chromeRight = p.chrome?.right ?? 0;

      // ---- the block ruler. Lines are labelled in dollars, because dollars
      // are the thing being taught; the blocks between them are countable, so
      // the label is a check, not the reading.
      const stepBlocks = G.maxBlocks > 24 ? 10 : G.maxBlocks > 12 ? 5 : 2;
      g.font = font(10.5);
      g.textAlign = "right";
      for (let b = stepBlocks; b <= G.maxBlocks; b += stepBlocks) {
        const y = baseY + G.bottom(b);
        g.strokeStyle = t.rule;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(PAD_L - 8, y); g.lineTo(p.width - PAD_R + 10, y); g.stroke();
        if (y > chromeTop) {
          g.fillStyle = t.faint;
          g.fillText(`$${(b * denom).toLocaleString("en-US")}`, PAD_L - 12, y);
        }
      }

      // ---- the year being played, behind everything
      if (p.focusFrom !== undefined && toCol(p.focusFrom) < nCols) {
        const fc = toCol(p.focusFrom);
        g.fillStyle = t.focus;
        g.fillRect(PAD_L + fc * colW, PAD_T - 6, (nCols - fc) * colW, plotH + 12);
      }

      // ---- the goal corridor, in the same block units as the stack
      if (p.corridor) {
        const yHi = yAt(p.corridor.hi), yLo = yAt(p.corridor.lo);
        g.fillStyle = t.corridorFill;
        g.fillRect(PAD_L - 8, yHi, plotW + 18, Math.max(2, yLo - yHi));
        g.strokeStyle = t.corridorLine;
        g.lineWidth = 1;
        g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(PAD_L - 8, yHi); g.lineTo(p.width - PAD_R + 10, yHi); g.stroke();
        g.beginPath(); g.moveTo(PAD_L - 8, yLo); g.lineTo(p.width - PAD_R + 10, yLo); g.stroke();
        g.setLineDash([]);
        // anchored at the left end of the band, where the value chips never
        // go, so the goal is always readable whatever the stack is doing
        g.textAlign = "left";
        g.fillStyle = t.accent;
        g.font = font(11, 650);
        const label = `${p.corridor.label} · ${blocksOf(p.corridor.lo, denom)} to ${blocksOf(p.corridor.hi, denom)} blocks`;
        const ly = Math.max(PAD_T + 10, yHi - 9);
        g.fillText(label, ly < chromeTop ? Math.max(PAD_L - 8, chromeLeft + 10) : PAD_L - 8, ly);
      }

      if (p.goalLine) {
        const y = yAt(p.goalLine.value);
        g.strokeStyle = t.accent;
        g.lineWidth = 1.4;
        g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(PAD_L - 8, y); g.lineTo(p.width - PAD_R + 10, y); g.stroke();
        g.setLineDash([]);
        g.textAlign = "right";
        g.fillStyle = t.accent;
        g.font = font(11, 650);
        g.fillText(p.goalLine.label, p.width - PAD_R + 6 - chromeRight, y - 10);
      }

      // ---- floor
      g.strokeStyle = t.floor;
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(PAD_L - 14, baseY + 0.5); g.lineTo(p.width - PAD_R + 12, baseY + 0.5); g.stroke();

      // ---- year ticks, labelled in the middle of the year they open
      const marks = p.yearMarks ?? [];
      g.font = font(10.5);
      g.textAlign = "center";
      marks.forEach((mark, i) => {
        const x = PAD_L + toCol(mark.step) * colW;
        g.strokeStyle = t.rule;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, PAD_T - 6); g.lineTo(x, baseY + 4); g.stroke();
        const end = i + 1 < marks.length ? PAD_L + toCol(marks[i + 1].step) * colW : p.width - PAD_R;
        g.fillStyle = t.faint;
        g.fillText(mark.label, (x + end) / 2, baseY + 16);
      });

      // ---- the blocks
      const paintBlock = (x: number, y: number, w: number, h: number, fill: string, opts?: { cash?: boolean; striped?: boolean; top?: boolean; alpha?: number }) => {
        const s = Math.min(w, h);
        const r = s > 7 ? (opts?.top ? Math.min(3.5, s * 0.3) : Math.min(1.6, s * 0.2)) : 0.5;
        if (opts?.alpha !== undefined) g.globalAlpha = opts.alpha;
        g.beginPath();
        g.roundRect(x, y, w, h, r);
        if (opts?.cash) {
          // money that is not working is drawn quiet: an outline, no fill, so
          // it is still countable but never competes with the holdings. A
          // stack that is mostly cash looks mostly empty, which is the truth.
          g.strokeStyle = t.cashLine;
          g.lineWidth = 1;
          g.stroke();
        } else {
          g.fillStyle = fill;
          g.fill();
          if (s > 5) {
            // one light top edge: enough to read as a solid object without
            // turning the block into a gradient you have to judge
            g.fillStyle = "rgba(255,255,255,0.22)";
            g.fillRect(x + r, y + 0.5, w - r * 2, Math.max(1, h * 0.16));
          }
          if (opts?.striped && s > 4) {
            g.save();
            g.beginPath(); g.roundRect(x, y, w, h, r); g.clip();
            g.strokeStyle = "rgba(255,255,255,0.5)";
            g.lineWidth = Math.max(0.7, s * 0.1);
            for (let d = -h; d < w + h; d += Math.max(2.4, s * 0.34)) {
              g.beginPath(); g.moveTo(x + d, y + h); g.lineTo(x + d + h, y); g.stroke();
            }
            g.restore();
          }
        }
        g.globalAlpha = 1;
      };

      const paintColumn = (i: number, blocks: ReturnType<typeof columnBlocks>, live: boolean) => {
        const x = colX(i);
        for (let k = 0; k < blocks.length; k++) {
          const b = blocks[k];
          let y = baseY + G.bottom(k) - G.bh;
          let alpha = live ? 1 : 0.9;
          if (live && !reduced) {
            // new blocks land: they fall the last few pixels, one after the
            // other, so growth is something you watch arrive rather than a
            // number that slid up
            const age = now - drop.current.at - (blocks.length - 1 - k) * STAGGER;
            if (k >= drop.current.from && age < DROP_MS) {
              const e = easeOut(Math.max(0, age) / DROP_MS);
              y -= (1 - e) * (G.bh * 2.6 + 10);
              alpha = Math.max(0, e);
            }
          }
          paintBlock(x, y, G.bw, G.bh, b.color, { cash: b.cash, striped: b.striped, top: k === blocks.length - 1, alpha });
        }
      };

      for (let i = 0; i < past.length && i < nCols; i++) {
        paintColumn(i, columnBlocks(past[i].bands, past[i].cash, denom), false);
      }
      const liveIdx = Math.min(past.length, nCols - 1);
      const liveBlocks = columnBlocks(p.bands, p.cash, denom);
      paintColumn(liveIdx, liveBlocks, true);

      // ---- the promotion: the old tower collapsing four-into-one. The ruler
      // changing is not a rendering problem to hide; it is the moment the
      // number gets big enough to need a bigger unit, and that is free
      // curriculum.
      const fuseAge = now - fuse.current.at;
      if (fuse.current.from > 0 && fuseAge < FUSE_MS && !reduced) {
        const e = easeOut(Math.min(1, fuseAge / FUSE_MS));
        const oldDenom = fuse.current.from;
        const OG = geom(p.maxDollars, oldDenom, plotH, plotW, steps);
        const oldBlocks = columnBlocks(p.bands, p.cash, oldDenom);
        const x = colX(liveIdx);
        for (let k = 0; k < oldBlocks.length; k++) {
          const parent = Math.floor(k / (denom / oldDenom));
          const y0 = baseY + OG.bottom(k) - OG.bh;
          const y1 = baseY + G.bottom(parent) - G.bh;
          const bh = OG.bh + (G.bh - OG.bh) * e;
          const bw = OG.bw + (G.bw - OG.bw) * e;
          paintBlock(x + (G.bw - bw) / 2, y0 + (y1 - y0) * e, bw, bh, oldBlocks[k].color,
            { cash: oldBlocks[k].cash, striped: oldBlocks[k].striped, alpha: 1 - e * e });
        }
        const bannerY = PAD_T + plotH * 0.32;
        g.globalAlpha = Math.min(1, 2.2 - fuseAge / (FUSE_MS * 0.5));
        g.textAlign = "center";
        g.fillStyle = t.chipBg;
        g.strokeStyle = t.accent;
        g.lineWidth = 1.4;
        const msg = `every block is now $${denom.toLocaleString("en-US")}`;
        g.font = font(17, 700);
        const bw = g.measureText(msg).width + 44;
        g.beginPath(); g.roundRect(PAD_L + plotW / 2 - bw / 2, bannerY - 30, bw, 60, 12);
        g.fill(); g.stroke();
        g.fillStyle = t.ink;
        g.fillText(msg, PAD_L + plotW / 2, bannerY - 10);
        g.font = font(12.5, 500);
        g.fillStyle = t.muted;
        g.fillText("four blocks just became one", PAD_L + plotW / 2, bannerY + 12);
        g.globalAlpha = 1;
      }

      // ---- the index, in the same block units. A dashed step line, because
      // the index is the path, not a wall.
      const idxAt = (i: number) => (i < past.length ? past[i].index : p.indexValue);
      g.strokeStyle = t.index;
      g.lineWidth = 1.6;
      g.setLineDash([5, 4]);
      g.beginPath();
      for (let i = 0; i <= liveIdx; i++) {
        const x0 = PAD_L + i * colW, x1 = x0 + colW;
        const y = yAt(idxAt(i)) - G.bh / 2;
        if (i === 0) g.moveTo(x0, y); else g.lineTo(x0, y);
        g.lineTo(x1, y);
      }
      g.stroke();
      g.setLineDash([]);

      // ---- names and numbers
      const chip = (x: number, y: number, title: string, value: string, color: string, align: CanvasTextAlign = "left") => {
        g.font = font(12.5, 700);
        const w = Math.max(g.measureText(value).width, g.measureText(title).width) + 20;
        // never let a chip walk off the canvas or under the host's own chrome
        const bx = Math.max(4, Math.min(align === "right" ? x - w : x, p.width - 6 - w));
        g.fillStyle = t.chipBg;
        g.strokeStyle = t.chipLine;
        g.lineWidth = 1;
        g.beginPath(); g.roundRect(bx, y - 17, w, 34, 8); g.fill(); g.stroke();
        g.textAlign = "left";
        g.fillStyle = color;
        g.font = font(10.5, 600);
        g.fillText(title, bx + 10, y - 7);
        g.fillStyle = t.ink;
        g.font = font(13, 700);
        g.fillText(value, bx + 10, y + 8);
      };

      const invested = p.bands.reduce((s, b) => s + (b.dead ? 0 : Math.max(0, b.value)), 0);
      const liveTop = baseY + G.bottom(Math.max(liveBlocks.length, 1)) - G.bh;
      const clampY = (y: number) => Math.max(Math.max(PAD_T, chromeTop) + 18, Math.min(y, baseY - 18));
      // the two value chips can land on the same line when the stack is
      // tracking the index closely, which is exactly when both numbers matter
      const idxY = clampY(yAt(p.indexValue) + 2);
      let playerY = clampY(liveTop - 14);
      if (Math.abs(playerY - idxY) < 38) playerY = clampY(playerY <= idxY ? idxY - 38 : idxY + 38);
      chip(colX(liveIdx) + G.bw + 12, playerY,
        `${p.playerLabel} · ${liveBlocks.length} ${liveBlocks.length === 1 ? "block" : "blocks"}`,
        `$${Math.round(invested + p.cash).toLocaleString("en-US")}`, t.muted);
      const idxBlocks = blocksOf(p.indexValue, denom);
      chip(p.width - 8 - chromeRight, idxY,
        `the index · ${idxBlocks} ${idxBlocks === 1 ? "block" : "blocks"}`,
        `$${Math.round(p.indexValue).toLocaleString("en-US")}`, t.index, "right");

      // ---- what a block is worth, always on screen
      g.textAlign = "left";
      g.font = font(11.5, 650);
      g.fillStyle = t.muted;
      let legend = `one block = $${denom.toLocaleString("en-US")}`;
      if (p.cash > denom * 0.5) legend += `   ·   hollow blocks are cash, ${blocksOf(p.cash, denom)} of ${liveBlocks.length}`;
      g.fillText(legend, PAD_L - 12, baseY + 32);

      // ---- names that went to zero sink under the floor, so they leave a
      // permanent mark without ever being counted as money you still have
      const gone = p.bands.filter((b) => b.dead);
      if (gone.length > 0) {
        const s = 10;
        g.textAlign = "right";
        g.font = font(10.5, 500);
        g.fillStyle = t.faint;
        g.fillText("went to zero", p.width - PAD_R + 6 - chromeRight - gone.length * (s + 4) - 8, baseY + 26);
        gone.forEach((b, i) => {
          const x = p.width - PAD_R + 6 - chromeRight - (gone.length - i) * (s + 4);
          const y = baseY + 20;
          g.save();
          g.beginPath(); g.roundRect(x, y, s, s, 1.5); g.clip();
          g.fillStyle = t.dead;
          g.fillRect(x, y, s, s);
          g.strokeStyle = "rgba(0,0,0,0.35)";
          g.lineWidth = 1;
          for (let d = -s; d < s * 2; d += 4) { g.beginPath(); g.moveTo(x + d, y + s); g.lineTo(x + d + s, y); g.stroke(); }
          g.restore();
        });
      }

      const animating = !reduced && (now - drop.current.at < DROP_MS + liveBlocks.length * STAGGER || fuseAge < FUSE_MS);
      raf.current = animating ? requestAnimationFrame(draw) : 0;
    };

    draw();
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  });

  return <canvas ref={ref} style={{ width: p.width, height: p.height, display: "block" }} />;
}
