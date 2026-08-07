import { useEffect, useRef } from "react";

// The Stack's stage: three glass cylinders on a shared dollar ruler.
// Cash on the left, the player's banded stack in the middle, the micro-band
// index on the right. Height is value, read off the wall; a bankrupt holding
// leaves a hatched grey seam in the stack that never heals. Canvas drawing
// adapted from the metaphor-lab probe (tools/lab/metaphor-cylinder.html).

export interface StackBand {
  key: string;
  color: string;
  value: number;
  dead?: boolean;   // render as the permanent seam
}

export interface StackStageProps {
  width: number;
  height: number;
  cash: number;
  bands: StackBand[];     // bottom-up draw order
  indexValue: number;
  playerLabel: string;
  goalLine?: { value: number; label: string };
  maxDollars: number;     // ruler top; parent keeps it monotonic so the scale never jumps around
}

const MICRO = ["#9bc4f5", "#f5b8b1", "#f7dc9a", "#a8e3bd", "#d9b8f0", "#f5c9e2", "#b8e0ea"];
const SEAM_H = 7;

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (sh: number) => Math.round(((n >> sh) & 255) * (1 - k));
  return `rgb(${f(16)},${f(8)},${f(0)})`;
}
function tint(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (sh: number) => Math.round(((n >> sh) & 255) + (255 - ((n >> sh) & 255)) * k);
  return `rgb(${f(16)},${f(8)},${f(0)})`;
}

function slabPath(g: CanvasRenderingContext2D, cx: number, y0: number, y1: number, rx: number, ry: number) {
  g.beginPath();
  g.moveTo(cx - rx, y0);
  g.lineTo(cx - rx, y1);
  g.ellipse(cx, y1, rx, ry, 0, Math.PI, 0, true);   // front bulge, not the back rim
  g.lineTo(cx + rx, y0);
  g.ellipse(cx, y0, rx, ry, 0, 0, Math.PI, true);
  g.closePath();
}

function bodyGrad(g: CanvasRenderingContext2D, cx: number, rx: number, hex: string) {
  const lg = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
  lg.addColorStop(0, shade(hex, 0.34));
  lg.addColorStop(0.16, shade(hex, 0.06));
  lg.addColorStop(0.36, tint(hex, 0.26));
  lg.addColorStop(0.62, shade(hex, 0.04));
  lg.addColorStop(1, shade(hex, 0.38));
  return lg;
}

function drawColumn(g: CanvasRenderingContext2D, cx: number, baseY: number, rx: number, bands: StackBand[], scale: number) {
  const ry = Math.max(3, rx * 0.3);
  let y = baseY;
  for (const b of bands) {
    if (b.dead) {
      const y0 = y - SEAM_H;
      slabPath(g, cx, y0, y, rx, ry);
      g.fillStyle = "#b7bcc6";
      g.fill();
      g.save();
      slabPath(g, cx, y0, y, rx, ry);
      g.clip();
      g.strokeStyle = "rgba(70,76,92,0.55)";
      g.lineWidth = 1.4;
      for (let x = -rx * 2; x < rx * 2; x += 5) {
        g.beginPath();
        g.moveTo(cx + x, y + ry);
        g.lineTo(cx + x + 10, y0 - ry);
        g.stroke();
      }
      g.restore();
      slabPath(g, cx, y0, y, rx, ry);
      g.strokeStyle = "rgba(40,46,60,0.5)";
      g.lineWidth = 1.2;
      g.stroke();
      y = y0 - 1.5;
      continue;
    }
    const h = Math.max(0, b.value * scale);
    if (h < 0.6) continue;
    const y0 = y - h;
    slabPath(g, cx, y0, y, rx, ry);
    g.fillStyle = bodyGrad(g, cx, rx, b.color);
    g.fill();
    g.beginPath();
    g.ellipse(cx, y0, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = tint(b.color, 0.34);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 1;
    g.stroke();
    y = y0 - 1.5;
  }
  const topY = y + 1.5;
  // glass shell over the whole column
  if (baseY - topY > 2) {
    slabPath(g, cx, topY, baseY, rx, ry);
    g.save();
    g.clip();
    const sg = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
    sg.addColorStop(0, "rgba(20,24,40,0.14)");
    sg.addColorStop(0.3, "rgba(255,255,255,0.12)");
    sg.addColorStop(0.65, "rgba(255,255,255,0)");
    sg.addColorStop(1, "rgba(20,24,40,0.16)");
    g.fillStyle = sg;
    g.fillRect(cx - rx, topY - ry, rx * 2, baseY - topY + ry * 2);
    g.fillStyle = "rgba(255,255,255,0.28)";
    g.fillRect(cx - rx * 0.6, topY - ry, rx * 0.15, baseY - topY + ry * 2);
    g.restore();
    slabPath(g, cx, topY, baseY, rx, ry);
    g.strokeStyle = "rgba(255,255,255,0.7)";
    g.lineWidth = 1.5;
    g.stroke();
    g.strokeStyle = "rgba(11,11,11,0.15)";
    g.lineWidth = 1;
    g.stroke();
  }
  // ground shadow
  g.save();
  g.beginPath();
  g.ellipse(cx, baseY + ry * 0.5, rx * 1.06, ry * 0.55, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(20,30,60,0.09)";
  g.fill();
  g.restore();
  return topY;
}

function drawMicro(g: CanvasRenderingContext2D, cx: number, baseY: number, rx: number, value: number, scale: number) {
  const H = value * scale;
  if (H < 1) return baseY;
  const ry = Math.max(3, rx * 0.3);
  const n = Math.max(24, Math.min(220, Math.round(H / 2.4)));
  const h = H / n;
  let y = baseY;
  for (let i = 0; i < n; i++) {
    const y1 = y;
    const y0 = y - Math.max(h - 0.7, 0.9);
    slabPath(g, cx, y0, y1, rx, ry);
    g.fillStyle = MICRO[i % MICRO.length];
    g.fill();
    y -= h;
  }
  const topY = baseY - H;
  slabPath(g, cx, topY, baseY, rx, ry);
  g.save();
  g.clip();
  const sg = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
  sg.addColorStop(0, "rgba(20,24,40,0.16)");
  sg.addColorStop(0.3, "rgba(255,255,255,0.10)");
  sg.addColorStop(0.65, "rgba(255,255,255,0)");
  sg.addColorStop(1, "rgba(20,24,40,0.18)");
  g.fillStyle = sg;
  g.fillRect(cx - rx, topY - ry, rx * 2, baseY - topY + ry * 2);
  g.restore();
  slabPath(g, cx, topY, baseY, rx, ry);
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 1.5;
  g.stroke();
  g.strokeStyle = "rgba(11,11,11,0.16)";
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
  g.strokeStyle = "rgba(11,11,11,0.14)";
  g.lineWidth = 0.9;
  g.stroke();
  g.save();
  g.beginPath();
  g.ellipse(cx, baseY + ry * 0.5, rx * 1.05, ry * 0.55, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(20,30,60,0.09)";
  g.fill();
  g.restore();
  return topY;
}

export default function StackStage(p: StackStageProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = p.width * dpr;
    canvas.height = p.height * dpr;
    const g = canvas.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, p.width, p.height);

    const baseY = p.height - 44;
    const scale = (p.height - 96) / Math.max(1, p.maxDollars);
    const font = (px: number, w = 500) => `${w} ${px}px Inter, -apple-system, system-ui, sans-serif`;

    // wall ruler
    const step = p.maxDollars > 3000 ? 1000 : p.maxDollars > 1500 ? 500 : 250;
    g.textBaseline = "middle";
    for (let v = 0; v <= p.maxDollars; v += step) {
      const y = baseY - v * scale;
      g.strokeStyle = "rgba(0,0,0,0.06)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(58, y);
      g.lineTo(p.width - 16, y);
      g.stroke();
      g.fillStyle = "#a1a1a6";
      g.font = font(11);
      g.textAlign = "right";
      g.fillText(`$${v.toLocaleString("en-US")}`, 52, y);
    }

    // goal line
    if (p.goalLine) {
      const y = baseY - p.goalLine.value * scale;
      g.strokeStyle = "#0071e3";
      g.lineWidth = 1.4;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.moveTo(58, y);
      g.lineTo(p.width - 16, y);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = "#0071e3";
      g.font = font(11.5, 600);
      g.textAlign = "right";
      g.fillText(p.goalLine.label, p.width - 20, y - 9);
    }

    // floor
    g.strokeStyle = "rgba(0,0,0,0.14)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(40, baseY);
    g.lineTo(p.width - 12, baseY);
    g.stroke();

    const cxCash = p.width * 0.2;
    const cxYou = p.width * 0.5;
    const cxIdx = p.width * 0.8;
    const rx = Math.min(56, p.width * 0.085);

    const cashTop = drawColumn(g, cxCash, baseY, rx * 0.68, [{ key: "cash", color: "#9fd6ae", value: p.cash }], scale);
    const youTop = drawColumn(g, cxYou, baseY, rx, p.bands, scale);
    const idxTop = drawMicro(g, cxIdx, baseY, rx * 0.9, p.indexValue, scale);

    const label = (x: number, topY: number, title: string, value: number) => {
      g.textAlign = "center";
      g.fillStyle = "#1d1d1f";
      g.font = font(12.5, 600);
      const txt = `$${Math.round(value).toLocaleString("en-US")}`;
      const w = g.measureText(txt).width + 16;
      const y = topY - 22;
      g.fillStyle = "rgba(255,255,255,0.95)";
      g.beginPath();
      g.roundRect(x - w / 2, y - 10, w, 20, 10);
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.1)";
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = "#1d1d1f";
      g.fillText(txt, x, y);
      g.fillStyle = "#6e6e73";
      g.font = font(11.5);
      g.fillText(title, x, baseY + 20);
    };
    label(cxCash, cashTop, "cash", p.cash);
    label(cxYou, youTop, p.playerLabel, p.bands.reduce((s, b) => s + (b.dead ? 0 : b.value), 0));
    label(cxIdx, idxTop, "the index", p.indexValue);
  });

  return <canvas ref={ref} style={{ width: p.width, height: p.height, display: "block" }} />;
}
