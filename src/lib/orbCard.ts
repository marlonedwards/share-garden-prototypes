// Renders "This is your orb" as a downloadable 1080x1350 image.
// Static re-render of the glass marble, no animation state needed.
import { CompSlice, hexToRgba, mixHex } from "./orbModel";

export interface OrbCardOpts {
  comp: CompSlice[];
  value: number;
  headline: string;        // e.g. "This is your orb."
  subline: string;         // e.g. "Dot-com era · Jan 2000 to Dec 2007"
  index?: { label: string; value: number };  // honest benchmark line
  rows: { color: string; label: string; right: string }[];
  footer: string;          // e.g. "Share Garden · The Orb"
}

const TAU = Math.PI * 2;

export function renderOrbCard(canvas: HTMLCanvasElement, o: OrbCardOpts): void {
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fbfbfd");
  bg.addColorStop(0.7, "#f2f3f6");
  bg.addColorStop(1, "#e9ebf0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const font = (px: number, weight = 600) => `${weight} ${px}px Inter, -apple-system, system-ui, sans-serif`;

  // headline
  ctx.fillStyle = "#1d1d1f";
  ctx.font = font(64, 700);
  ctx.textAlign = "center";
  ctx.fillText(o.headline, W / 2, 128);
  ctx.fillStyle = "#6e6e73";
  ctx.font = font(30, 500);
  ctx.fillText(o.subline, W / 2, 182);

  // the orb
  const cx = W / 2, cy = 560, r = 260;
  drawStaticOrb(ctx, cx, cy, r, o.comp);

  // value + benchmark
  ctx.fillStyle = "#1d1d1f";
  ctx.font = font(72, 700);
  ctx.fillText(o.value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), W / 2, cy + r + 130);
  if (o.index) {
    ctx.fillStyle = "#6e6e73";
    ctx.font = font(28, 500);
    ctx.fillText(`${o.index.label}: ${o.index.value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`, W / 2, cy + r + 178);
  }

  // composition rows
  ctx.textAlign = "left";
  const rowX = 200, rowW = W - 400;
  let y = cy + r + (o.index ? 246 : 210);
  for (const row of o.rows.slice(0, 5)) {
    ctx.fillStyle = row.color;
    ctx.beginPath(); ctx.arc(rowX, y - 10, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1d1d1f";
    ctx.font = font(30, 600);
    ctx.fillText(row.label, rowX + 36, y);
    ctx.font = font(30, 500);
    ctx.fillStyle = "#6e6e73";
    ctx.textAlign = "right";
    ctx.fillText(row.right, rowX + rowW, y);
    ctx.textAlign = "left";
    y += 58;
  }

  // footer
  ctx.fillStyle = "#a1a1a6";
  ctx.font = font(26, 500);
  ctx.textAlign = "center";
  ctx.fillText(o.footer, W / 2, H - 60);
}

// Exported so the Ready finale can draw the same marble live on its own
// canvases; the share-card path above is unchanged.
export function drawStaticOrb(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, comp: CompSlice[]): void {
  const groundY = cy + r;
  const dominant = comp.length ? comp.reduce((m, s) => (s.frac > m.frac ? s : m)) : null;

  // shadow + caustic
  const sh = ctx.createRadialGradient(cx, groundY + r * 0.05, 0, cx, groundY + r * 0.05, r * 0.95);
  sh.addColorStop(0, "rgba(24,34,60,0.2)");
  sh.addColorStop(1, "rgba(24,34,60,0)");
  ctx.fillStyle = sh;
  ctx.beginPath(); ctx.ellipse(cx, groundY + r * 0.05, r * 0.95, r * 0.16, 0, 0, TAU); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const base = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
  base.addColorStop(0, comp.length ? "rgba(255,255,255,0.55)" : "rgba(248,251,254,0.2)");
  base.addColorStop(1, comp.length ? "rgba(214,224,238,0.5)" : "rgba(210,222,238,0.3)");
  ctx.fillStyle = base;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  if (comp.length) {
    const core = r * 0.84;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, core, 0, TAU); ctx.clip();
    if (comp.length === 1) {
      const g = ctx.createRadialGradient(cx - core * 0.25, cy - core * 0.3, core * 0.1, cx, cy, core);
      g.addColorStop(0, comp[0].glow);
      g.addColorStop(0.7, comp[0].color);
      g.addColorStop(1, comp[0].color);
      ctx.globalAlpha = 0.74;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, core, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // wavy proportional regions, frozen mid-swirl
      const n = comp.length;
      const start = -Math.PI / 2 + 0.6;
      const bounds: number[] = [];
      let cum = 0;
      for (const s of comp) { bounds.push(start + cum * TAU); cum += s.frac; }
      bounds.push(start + TAU);
      const wv = (rho: number, k: number) => {
        const u = rho / core, kk = k % n;
        return (Math.sin(u * 3.1 + kk * 2.4) * 0.21 + Math.sin(u * 6.7 + kk * 1.3) * 0.095) * u;
      };
      const STEPS = 16, RIM = 14;
      ctx.filter = `blur(${core * 0.1}px)`;
      ctx.globalAlpha = 0.88;
      for (let i = 0; i < n; i++) {
        const a0 = bounds[i], a1 = bounds[i + 1];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 1; s <= STEPS; s++) {
          const rho = (core * s) / STEPS;
          const ang = a0 + wv(rho, i);
          ctx.lineTo(cx + Math.cos(ang) * rho, cy + Math.sin(ang) * rho);
        }
        const e0 = a0 + wv(core, i), e1 = a1 + wv(core, i + 1);
        for (let s = 1; s <= RIM; s++) {
          const ang = e0 + ((e1 - e0) * s) / RIM;
          ctx.lineTo(cx + Math.cos(ang) * core, cy + Math.sin(ang) * core);
        }
        for (let s = STEPS - 1; s >= 1; s--) {
          const rho = (core * s) / STEPS;
          const ang = a1 + wv(rho, i + 1);
          ctx.lineTo(cx + Math.cos(ang) * rho, cy + Math.sin(ang) * rho);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(cx, cy, core * 0.1, cx, cy, core);
        g.addColorStop(0, mixHex(comp[i].color, comp[i].glow, 0.35));
        g.addColorStop(1, comp[i].color);
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }
    ctx.restore();

    const shell = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 0.96);
    shell.addColorStop(0, "rgba(255,255,255,0)");
    shell.addColorStop(0.55, "rgba(255,255,255,0.22)");
    shell.addColorStop(1, "rgba(255,255,255,0.04)");
    ctx.fillStyle = shell;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    if (dominant) {
      const bg2 = ctx.createRadialGradient(cx, cy + r * 0.6, 0, cx, cy + r * 0.6, r * 0.55);
      bg2.addColorStop(0, hexToRgba(dominant.glow, 0.25));
      bg2.addColorStop(1, hexToRgba(dominant.glow, 0));
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.6, r * 0.55, r * 0.28, 0, 0, TAU); ctx.fill();
    }
  }

  // rim shade + floor light
  const rim = ctx.createRadialGradient(cx, cy - r * 0.08, r * 0.55, cx, cy, r);
  rim.addColorStop(0, "rgba(18,30,58,0)");
  rim.addColorStop(0.82, "rgba(18,30,58,0.05)");
  rim.addColorStop(0.97, "rgba(18,30,58,0.17)");
  rim.addColorStop(1, "rgba(18,30,58,0.08)");
  ctx.fillStyle = rim;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const fl = ctx.createRadialGradient(cx, cy + r * 0.95, 0, cx, cy + r * 0.95, r * 0.75);
  fl.addColorStop(0, "rgba(255,255,255,0.4)");
  fl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = fl;
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.93, r * 0.75, r * 0.2, 0, 0, TAU); ctx.fill();

  // speculars
  const spec = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.48, 0, cx - r * 0.38, cy - r * 0.48, r * 0.55);
  spec.addColorStop(0, "rgba(255,255,255,0.6)");
  spec.addColorStop(0.5, "rgba(255,255,255,0.12)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.save();
  ctx.translate(cx - r * 0.38, cy - r * 0.48);
  ctx.rotate(-0.5);
  ctx.scale(1, 0.62);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath(); ctx.ellipse(cx - r * 0.18, cy - r * 0.66, r * 0.075, r * 0.045, -0.5, 0, TAU); ctx.fill();
  ctx.restore();

  // Fresnel + edge
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = r * 0.02;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.985, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "rgba(30,45,80,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, TAU); ctx.stroke();
}

export function downloadOrbCard(o: OrbCardOpts, filename = "my-orb.png"): void {
  const canvas = document.createElement("canvas");
  renderOrbCard(canvas, o);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}
