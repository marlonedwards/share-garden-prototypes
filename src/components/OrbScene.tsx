import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { CompSlice, hexToRgba, mixHex, valueToRadius } from "../lib/orbModel";

// The whole Orb stage is one canvas: your marble, the sealed rainbow orb, the
// cash dish, and the liquid that moves between them. React owns the numbers;
// this component owns motion (springs, liquid, droplets, mist).
//
// Two liquid styles, user-switchable:
//   "waves"  wavy immiscible-liquid regions; each color's area stays exactly
//            its share of value, but the borders ripple and breathe
//   "blobs"  free-floating lava-lamp metaballs; most organic, area per color
//            approximate (the side panel carries the exact numbers)

export type FluidStyle = "waves" | "blobs" | "bubbles" | "strata";

export const LAYOUT = {
  playerX: 0.475,
  indexX: 0.795,
  resX: 0.155,
  groundY: 0.78,
  bowlW: 116,
  bowlH: 60,
};

export interface OrbSceneHandle {
  pour(opts: { kind: "buy" | "sell"; color: string; glow: string }): void;
  shock(target: "player" | "index", mag: number): void;
}

interface OrbState {
  value: number;
  comp: CompSlice[];
}

interface Props {
  width: number;
  height: number;
  player: OrbState;
  index: OrbState;
  cash: number;
  cashMax: number;
  showIndex: boolean;
  ghostR?: number;      // high-water radius (pre-scaled); dashed ring when above current
  fluid: FluidStyle;
  radiusScale?: number; // shared shrink factor so huge orbs still fit the stage
}

interface Blob {
  angle: number; angleV: number;
  orbit: number; orbitV: number; orbitPh: number;
  rJitter: number;
}

interface OrbAnim {
  r: number; v: number;            // radius spring
  turb: number;                    // agitation multiplier
  baseTurb: number;                // calm-state agitation it decays back to
  wob: number; wt: number;         // deflation wobble amplitude + clock
  blobs: Map<string, Blob[]>;
}

interface Droplet {
  t: number; dur: number;
  from: [number, number]; to: [number, number]; lift: number;
  size: number; color: string; glow: string;
  kind: "buy" | "sell";
}

interface Mist { x: number; y: number; vy: number; life: number; age: number; r: number; }

// deterministic per-blob params so screenshots are stable
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function prand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBlobs(key: string, n: number): Blob[] {
  const rnd = prand(hash32(key));
  const out: Blob[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      angle: rnd() * Math.PI * 2,
      angleV: 0.22 + rnd() * 0.3,
      orbit: 0.18 + rnd() * 0.44,
      orbitV: 0.3 + rnd() * 0.5,
      orbitPh: rnd() * Math.PI * 2,
      rJitter: 0.85 + rnd() * 0.3,
    });
  }
  return out;
}

const TAU = Math.PI * 2;

const OrbScene = forwardRef<OrbSceneHandle, Props>(function OrbScene(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const playerAnim = useRef<OrbAnim>({ r: 44, v: 0, turb: 1, baseTurb: 1, wob: 0, wt: 0, blobs: new Map() });
  const indexAnim = useRef<OrbAnim>({ r: valueToRadius(1000), v: 0, turb: 0.6, baseTurb: 0.6, wob: 0, wt: 0, blobs: new Map() });
  const droplets = useRef<Droplet[]>([]);
  const mist = useRef<Mist[]>([]);
  const idxAlpha = useRef(0);
  const shake = useRef(0);
  const mistClock = useRef(0);

  useImperativeHandle(ref, () => ({
    pour({ kind, color, glow }) {
      const { width, height } = propsRef.current;
      const gy = height * LAYOUT.groundY;
      const dishTop: [number, number] = [width * LAYOUT.resX, gy - LAYOUT.bowlH - 8];
      const orbTop: [number, number] = [width * LAYOUT.playerX, gy - playerAnim.current.r * 1.85];
      const [from, to] = kind === "buy" ? [dishTop, orbTop] : [orbTop, dishTop];
      for (let i = 0; i < 30; i++) {
        droplets.current.push({
          t: -i * 0.028, dur: 0.62 + Math.random() * 0.2,
          from: [from[0] + (Math.random() - 0.5) * 16, from[1] + (Math.random() - 0.5) * 8],
          to: [to[0] + (Math.random() - 0.5) * 20, to[1] + (Math.random() - 0.5) * 6],
          lift: 70 + Math.random() * 55,
          size: 4 + Math.random() * 4.5,
          color, glow, kind,
        });
      }
    },
    shock(target, mag) {
      const a = target === "player" ? playerAnim.current : indexAnim.current;
      a.v -= mag * 130;
      a.wob = Math.max(a.wob, mag);
      a.turb = Math.max(a.turb, 1 + mag * 2.6);
      if (target === "player") shake.current = Math.max(shake.current, mag * 5);
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const { width, height, player, index, cash, cashMax, showIndex, ghostR, fluid, radiusScale = 1 } = propsRef.current;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (shake.current > 0.1) {
        ctx.translate((Math.random() - 0.5) * shake.current, (Math.random() - 0.5) * shake.current * 0.6);
        shake.current *= Math.exp(-dt * 4);
      }

      const gy = height * LAYOUT.groundY;

      // cash dish -----------------------------------------------------------
      const resX = width * LAYOUT.resX;
      drawDish(ctx, resX, gy, LAYOUT.bowlW, LAYOUT.bowlH, Math.max(0, Math.min(1, cash / cashMax)), t);

      // idle-cash mist: money that just sits slowly fades
      mistClock.current += dt;
      if (cash > 1 && mistClock.current > 0.42) {
        mistClock.current = 0;
        mist.current.push({
          x: resX + (Math.random() - 0.5) * 40,
          y: gy - LAYOUT.bowlH - 4,
          vy: -(9 + Math.random() * 7),
          life: 1.8, age: 0, r: 4 + Math.random() * 4,
        });
      }
      for (const p of mist.current) {
        p.age += dt; p.y += p.vy * dt;
        const a = 0.10 * Math.sin(Math.PI * Math.min(1, p.age / p.life));
        if (a > 0.004) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
          g.addColorStop(0, `rgba(152, 210, 172, ${a})`);
          g.addColorStop(1, "rgba(152, 210, 172, 0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, TAU); ctx.fill();
        }
      }
      mist.current = mist.current.filter((p) => p.age < p.life);

      // orbs ----------------------------------------------------------------
      stepSpring(playerAnim.current, Math.max(44, valueToRadius(player.value) * radiusScale), dt);
      stepSpring(indexAnim.current, Math.max(44, valueToRadius(index.value) * radiusScale), dt);
      idxAlpha.current += ((showIndex ? 1 : 0) - idxAlpha.current) * Math.min(1, dt * 3);

      drawOrb(ctx, width * LAYOUT.playerX, gy, playerAnim.current, player.comp, t, false, fluid);
      if (idxAlpha.current > 0.01) {
        ctx.save();
        ctx.globalAlpha = idxAlpha.current;
        drawOrb(ctx, width * LAYOUT.indexX, gy, indexAnim.current, index.comp, t, true, fluid);
        ctx.restore();
      }

      // high-water ghost: the size your orb was before the crash
      if (ghostR && ghostR > playerAnim.current.r + 5) {
        ctx.save();
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = "rgba(30, 45, 80, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(width * LAYOUT.playerX, gy - ghostR, ghostR, 0, TAU); ctx.stroke();
        ctx.restore();
      }

      // droplets ------------------------------------------------------------
      for (const d of droplets.current) {
        d.t += dt / d.dur;
        if (d.t < 0 || d.t > 1) continue;
        const e = d.t < 0.5 ? 2 * d.t * d.t : 1 - Math.pow(-2 * d.t + 2, 2) / 2;
        const mx = (d.from[0] + d.to[0]) / 2;
        const my = Math.min(d.from[1], d.to[1]) - d.lift;
        const x = (1 - e) * (1 - e) * d.from[0] + 2 * (1 - e) * e * mx + e * e * d.to[0];
        const y = (1 - e) * (1 - e) * d.from[1] + 2 * (1 - e) * e * my + e * e * d.to[1];
        // clear liquid becomes essence mid-flight on a buy; drains back on a sell
        const mixT = d.kind === "buy" ? Math.min(1, Math.max(0, (e - 0.35) / 0.4)) : 1 - Math.min(1, Math.max(0, (e - 0.35) / 0.4));
        const col = mixHex("#a9dcbb", d.color, mixT);
        const g = ctx.createRadialGradient(x, y, 0, x, y, d.size);
        g.addColorStop(0, "rgba(255,255,255,0.9)");
        g.addColorStop(0.45, col);
        g.addColorStop(1, hexToRgba(d.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, d.size, 0, TAU); ctx.fill();
      }
      const finished = droplets.current.filter((d) => d.t >= 1);
      if (finished.length) {
        const buys = finished.filter((d) => d.kind === "buy").length;
        playerAnim.current.v += buys * 1.4;
      }
      droplets.current = droplets.current.filter((d) => d.t < 1);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // -- helpers -------------------------------------------------------------

  function stepSpring(a: OrbAnim, target: number, dt: number) {
    const k = 42, c = 9.5;
    a.v += (k * (target - a.r) - c * a.v) * dt;
    a.r += a.v * dt;
    if (a.r < 6) { a.r = 6; a.v = Math.abs(a.v) * 0.3; }
    a.turb += (a.baseTurb - a.turb) * Math.min(1, dt / 1.6);
    a.wob *= Math.exp(-dt / 1.1);
    a.wt += dt * (1 + a.turb * 0.4);
  }

  // wavy immiscible-liquid regions: proportional sectors whose borders ripple
  function fillWaves(ctx: CanvasRenderingContext2D, cx: number, cy: number, core: number, comp: CompSlice[], t: number, turb: number) {
    if (comp.length === 1) {
      const g = ctx.createRadialGradient(cx - core * 0.25, cy - core * 0.3, core * 0.1, cx, cy, core);
      g.addColorStop(0, comp[0].glow);
      g.addColorStop(0.7, comp[0].color);
      g.addColorStop(1, comp[0].color);
      ctx.globalAlpha = 0.74;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, core, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    const n = comp.length;
    const start = -Math.PI / 2 + t * 0.05 * turb;
    const bounds: number[] = [];
    let cum = 0;
    for (const s of comp) { bounds.push(start + cum * TAU); cum += s.frac; }
    bounds.push(start + TAU);
    const amp = 0.21 * Math.min(2.2, turb);
    const wv = (rho: number, k: number) => {
      const u = rho / core, kk = k % n;
      return (Math.sin(u * 3.1 + t * (0.6 + 0.12 * kk) * turb + kk * 2.4) * amp
        + Math.sin(u * 6.7 + t * (0.9 + 0.07 * kk) * turb + kk * 1.3) * amp * 0.45) * u;
    };
    const STEPS = 16, RIM = 14;
    ctx.save();
    ctx.filter = `blur(${Math.max(4, core * 0.1)}px)`;
    ctx.globalAlpha = 0.88;
    for (let i = 0; i < n; i++) {
      const a0 = bounds[i], a1 = bounds[i + 1];
      const k0 = i, k1 = i + 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 1; s <= STEPS; s++) {
        const rho = (core * s) / STEPS;
        const ang = a0 + wv(rho, k0);
        ctx.lineTo(cx + Math.cos(ang) * rho, cy + Math.sin(ang) * rho);
      }
      const e0 = a0 + wv(core, k0), e1 = a1 + wv(core, k1);
      for (let s = 1; s <= RIM; s++) {
        const ang = e0 + ((e1 - e0) * s) / RIM;
        ctx.lineTo(cx + Math.cos(ang) * core, cy + Math.sin(ang) * core);
      }
      for (let s = STEPS - 1; s >= 1; s--) {
        const rho = (core * s) / STEPS;
        const ang = a1 + wv(rho, k1);
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
    ctx.restore();
  }

  // free-floating lava-lamp metaballs; panel carries the exact numbers.
  // Blobs float in clear liquid, so many colors never mix into mud.
  function fillBlobs(ctx: CanvasRenderingContext2D, cx: number, cy: number, core: number, comp: CompSlice[], anim: OrbAnim, t: number) {
    ctx.fillStyle = "rgba(236,242,250,0.5)";
    ctx.beginPath(); ctx.arc(cx, cy, core, 0, TAU); ctx.fill();

    ctx.save();
    ctx.filter = `blur(${Math.max(6, core * 0.2)}px)`;
    for (const slice of comp) {
      if (slice.frac <= 0.001) continue;
      const nB = 1 + Math.min(3, Math.floor(slice.frac * 5));
      let blobs = anim.blobs.get(slice.key);
      if (!blobs || blobs.length < nB) { blobs = makeBlobs(slice.key, 4); anim.blobs.set(slice.key, blobs); }
      const rb = core * Math.sqrt(slice.frac / nB) * 1.2;
      for (let i = 0; i < nB; i++) {
        const b = blobs[i];
        const ang = b.angle + t * b.angleV * anim.turb;
        const orb = (b.orbit + 0.1 * Math.sin(t * b.orbitV * anim.turb + b.orbitPh)) * (core - rb * 0.45);
        const bx = cx + Math.cos(ang) * orb;
        const by = cy + Math.sin(ang) * orb * 0.92;
        const rr = rb * b.rJitter;
        const g = ctx.createRadialGradient(bx - rr * 0.25, by - rr * 0.25, rr * 0.1, bx, by, rr);
        g.addColorStop(0, slice.glow);
        g.addColorStop(0.65, slice.color);
        g.addColorStop(1, hexToRgba(slice.color, 0.4));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bx, by, rr, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // champagne: each color is a swarm of rising bubbles, count by share
  function fillBubbles(ctx: CanvasRenderingContext2D, cx: number, cy: number, core: number, comp: CompSlice[], t: number, turb: number) {
    ctx.fillStyle = "rgba(236,242,250,0.55)";
    ctx.beginPath(); ctx.arc(cx, cy, core, 0, TAU); ctx.fill();
    ctx.save();
    ctx.filter = "blur(1px)";
    for (const slice of comp) {
      if (slice.frac <= 0.001) continue;
      const n = Math.max(2, Math.round(slice.frac * 26));
      const rnd = prand(hash32(slice.key + "bub"));
      for (let i = 0; i < n; i++) {
        const bx0 = rnd() * 2 - 1;
        const size = 0.055 + rnd() * 0.05;
        const speed = (0.035 + rnd() * 0.05) * turb;
        const phase = rnd();
        const wobPh = rnd() * TAU;
        const cyc = (phase + t * speed) % 1;
        const yFrac = 0.86 - cyc * 1.72;           // rises bottom -> top
        const by = cy + core * yFrac;
        const halfW = Math.sqrt(Math.max(0.02, 1 - yFrac * yFrac));
        const bx = cx + core * (bx0 * halfW * 0.86 + Math.sin(t * 1.3 + wobPh) * 0.04);
        const rr = core * size;
        const edgeFade = Math.min(1, Math.min(cyc, 1 - cyc) / 0.08);
        const g = ctx.createRadialGradient(bx - rr * 0.3, by - rr * 0.3, rr * 0.15, bx, by, rr);
        g.addColorStop(0, hexToRgba(slice.glow, 0.95 * edgeFade));
        g.addColorStop(0.7, hexToRgba(slice.color, 0.9 * edgeFade));
        g.addColorStop(1, hexToRgba(slice.color, 0.35 * edgeFade));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bx, by, rr, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // density column: colors settle into layers, areas exact, interfaces wavy
  function fillStrata(ctx: CanvasRenderingContext2D, cx: number, cy: number, core: number, comp: CompSlice[], t: number, turb: number) {
    // height of a circular segment (from the bottom) holding `frac` of the area
    const segHeight = (frac: number): number => {
      if (frac <= 0) return 0;
      if (frac >= 1) return 2 * core;
      let lo = 0, hi = 2 * core;
      const target = frac * Math.PI * core * core;
      for (let i = 0; i < 24; i++) {
        const h = (lo + hi) / 2;
        const area = core * core * Math.acos(1 - h / core) - (core - h) * Math.sqrt(Math.max(0, 2 * core * h - h * h));
        if (area < target) lo = h; else hi = h;
      }
      return (lo + hi) / 2;
    };
    ctx.save();
    ctx.filter = `blur(${Math.max(2, core * 0.04)}px)`;
    ctx.globalAlpha = 0.88;
    let cum = 0;
    let prevTop = cy + core + 4;
    for (const slice of comp) {
      cum += slice.frac;
      const topY = cy + core - segHeight(Math.min(1, cum));
      const amp = core * 0.035 * Math.min(2, turb);
      ctx.beginPath();
      ctx.moveTo(cx - core - 4, prevTop);
      // wavy top edge of this layer
      const N = 20;
      for (let sIdx = 0; sIdx <= N; sIdx++) {
        const x = cx - core + (2 * core * sIdx) / N;
        const y = topY + Math.sin((sIdx / N) * 5.2 + t * 1.1 + cum * 9) * amp;
        if (sIdx === 0) ctx.lineTo(x - 4, y);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cx + core + 4, prevTop);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, topY, 0, prevTop);
      g.addColorStop(0, mixHex(slice.color, slice.glow, 0.3));
      g.addColorStop(1, slice.color);
      ctx.fillStyle = g;
      ctx.fill();
      prevTop = topY;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawOrb(ctx: CanvasRenderingContext2D, cx: number, groundY: number, a: OrbAnim, comp: CompSlice[], t: number, sealed: boolean, fluid: FluidStyle) {
    const r = a.r;
    const cy = groundY - r;
    const dominant = comp.length ? comp.reduce((m, s) => (s.frac > m.frac ? s : m)) : null;

    // contact shadow, then the caustic
    const sh = ctx.createRadialGradient(cx, groundY + r * 0.05, 0, cx, groundY + r * 0.05, r * 0.95);
    sh.addColorStop(0, "rgba(24, 34, 60, 0.22)");
    sh.addColorStop(1, "rgba(24, 34, 60, 0)");
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.ellipse(cx, groundY + r * 0.05, r * 0.95, r * 0.17, 0, 0, TAU); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, groundY + r * 0.05, r * 0.62, r * 0.09, 0, 0, TAU); ctx.clip();
    const caust = ctx.createRadialGradient(cx, groundY + r * 0.05, 0, cx, groundY + r * 0.05, r * 0.62);
    caust.addColorStop(0, "rgba(255,255,255,0.5)");
    caust.addColorStop(0.45, dominant ? hexToRgba(dominant.glow, 0.18) : "rgba(255,255,255,0.14)");
    caust.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = caust;
    ctx.fillRect(cx - r, groundY - r * 0.1, r * 2, r * 0.3);
    ctx.restore();

    // deflation wobble: squash and stretch anchored to the ground
    ctx.save();
    const w = a.wob * 0.055 * Math.sin(a.wt * 16);
    ctx.translate(cx, groundY);
    ctx.scale(1 + w, 1 - w);
    ctx.translate(-cx, -groundY);

    // interior
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();

    // when empty the marble is honestly clear: rim + specular only
    const base = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
    base.addColorStop(0, comp.length ? "rgba(255,255,255,0.55)" : "rgba(248,251,254,0.16)");
    base.addColorStop(0.55, comp.length ? "rgba(238,243,250,0.35)" : "rgba(234,240,248,0.12)");
    base.addColorStop(1, comp.length ? "rgba(214,224,238,0.5)" : "rgba(210,222,238,0.28)");
    ctx.fillStyle = base;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // the liquid core sits inside a clear glass shell
    if (comp.length) {
      const core = r * 0.84;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, core, 0, TAU); ctx.clip();
      if (fluid === "waves") fillWaves(ctx, cx, cy, core, comp, t, a.turb);
      else if (fluid === "bubbles") fillBubbles(ctx, cx, cy, core, comp, t, a.turb);
      else if (fluid === "strata") fillStrata(ctx, cx, cy, core, comp, t, a.turb);
      else fillBlobs(ctx, cx, cy, core, comp, a, t);
      // sheen over the liquid keeps the filled marble reading as glass
      const sheen = ctx.createRadialGradient(cx - core * 0.35, cy - core * 0.45, 0, cx - core * 0.35, cy - core * 0.45, core * 0.95);
      sheen.addColorStop(0, "rgba(255,255,255,0.30)");
      sheen.addColorStop(0.45, "rgba(255,255,255,0.08)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.beginPath(); ctx.arc(cx, cy, core, 0, TAU); ctx.fill();
      ctx.restore();

      // watery boundary where the colored core meets the clear shell
      const shell = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 0.96);
      shell.addColorStop(0, "rgba(255,255,255,0)");
      shell.addColorStop(0.55, "rgba(255,255,255,0.22)");
      shell.addColorStop(1, "rgba(255,255,255,0.04)");
      ctx.fillStyle = shell;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      // light passing through the liquid pools at the bottom
      if (dominant) {
        const bg = ctx.createRadialGradient(cx, cy + r * 0.6, 0, cx, cy + r * 0.6, r * 0.55);
        bg.addColorStop(0, hexToRgba(dominant.glow, 0.25));
        bg.addColorStop(1, hexToRgba(dominant.glow, 0));
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.6, r * 0.55, r * 0.28, 0, 0, TAU); ctx.fill();
      }
    }

    // inner rim shade
    const rim = ctx.createRadialGradient(cx, cy - r * 0.08, r * 0.55, cx, cy, r);
    rim.addColorStop(0, "rgba(18,30,58,0)");
    rim.addColorStop(0.82, "rgba(18,30,58,0.05)");
    rim.addColorStop(0.97, "rgba(18,30,58,0.17)");
    rim.addColorStop(1, "rgba(18,30,58,0.08)");
    ctx.fillStyle = rim;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // glass wall thickness along the bottom inside edge
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(20, 32, 62, 0.085)";
    ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.93, Math.PI * 0.3, Math.PI * 0.7); ctx.stroke();
    ctx.restore();

    // refracted floor light along the bottom inside edge
    const fl = ctx.createRadialGradient(cx, cy + r * 0.95, 0, cx, cy + r * 0.95, r * 0.75);
    fl.addColorStop(0, "rgba(255,255,255,0.4)");
    fl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = fl;
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.93, r * 0.75, r * 0.2, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // speculars
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
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
    ctx.save();
    ctx.translate(cx + r * 0.42, cy + r * 0.38);
    ctx.rotate(0.6);
    const bounce = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.34);
    bounce.addColorStop(0, "rgba(255,255,255,0.20)");
    bounce.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bounce;
    ctx.scale(1, 0.55);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();

    // Fresnel rim
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = Math.max(1.5, r * 0.02);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.985, 0, TAU); ctx.stroke();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = Math.max(1.4, r * 0.018);
    ctx.beginPath(); ctx.arc(cx, cy, r - ctx.lineWidth, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();

    // the sealed index wears a frosted shell
    if (sealed) {
      const frost = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
      frost.addColorStop(0, "rgba(255,255,255,0.03)");
      frost.addColorStop(0.85, "rgba(255,255,255,0.10)");
      frost.addColorStop(1, "rgba(255,255,255,0.24)");
      ctx.fillStyle = frost;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = Math.max(1.2, r * 0.014);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.955, 0, TAU); ctx.stroke();
    }

    // outer edge definition
    ctx.strokeStyle = "rgba(30,45,80,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r + 0.5, 0, TAU); ctx.stroke();

    ctx.restore();
  }

  // cash lives in a shallow glass dish so "size = value" stays reserved for orbs
  function drawDish(ctx: CanvasRenderingContext2D, cx: number, gy: number, w: number, h: number, fill: number, t: number) {
    const hw = w / 2, top = gy - h;

    const sh = ctx.createRadialGradient(cx, gy + 3, 0, cx, gy + 3, hw * 1.1);
    sh.addColorStop(0, "rgba(24,34,60,0.16)");
    sh.addColorStop(1, "rgba(24,34,60,0)");
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.ellipse(cx, gy + 3, hw * 1.1, 9, 0, 0, TAU); ctx.fill();
    const dc = ctx.createRadialGradient(cx, gy + 2.5, 0, cx, gy + 2.5, hw * 0.7);
    dc.addColorStop(0, "rgba(255,255,255,0.5)");
    dc.addColorStop(0.5, "rgba(150,210,170,0.25)");
    dc.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = dc;
    ctx.beginPath(); ctx.ellipse(cx, gy + 2.5, hw * 0.7, 6, 0, 0, TAU); ctx.fill();

    const bowl = (inset: number) => {
      const iw = hw - inset, bot = gy - inset * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx - iw, top + inset);
      ctx.lineTo(cx - iw, bot - 20);
      ctx.quadraticCurveTo(cx - iw, bot, cx - iw + 24, bot);
      ctx.lineTo(cx + iw - 24, bot);
      ctx.quadraticCurveTo(cx + iw, bot, cx + iw, bot - 20);
      ctx.lineTo(cx + iw, top + inset);
      ctx.closePath();
    };

    bowl(0);
    const glass = ctx.createLinearGradient(0, top, 0, gy);
    glass.addColorStop(0, "rgba(255,255,255,0.5)");
    glass.addColorStop(1, "rgba(212,223,238,0.55)");
    ctx.fillStyle = glass;
    ctx.fill();

    if (fill > 0.01) {
      ctx.save();
      bowl(3);
      ctx.clip();
      const level = gy - 4 - (h - 12) * fill;
      const wave = Math.sin(t * 1.6) * 1.0;
      const liq = ctx.createLinearGradient(0, level, 0, gy);
      liq.addColorStop(0, "rgba(150,215,172,0.75)");
      liq.addColorStop(1, "rgba(112,192,142,0.85)");
      ctx.fillStyle = liq;
      ctx.fillRect(cx - hw, level + wave, w, h);
      ctx.fillStyle = "rgba(192,231,204,0.9)";
      ctx.beginPath(); ctx.ellipse(cx, level + wave, hw - 4, 5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, level + wave, hw - 4, 5, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(30,45,80,0.14)";
    ctx.lineWidth = 1.2;
    bowl(0);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(cx, top + 1.5, hw, 6.5, 0, Math.PI, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(140,160,190,0.5)";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(cx, top + 1.5, hw, 6.5, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(cx, top + 2.6, hw, 6.5, 0, Math.PI * 0.08, Math.PI * 0.92); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx - hw + 7, top + 12); ctx.lineTo(cx - hw + 7, gy - 14); ctx.stroke();
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: props.width, height: props.height, display: "block" }}
    />
  );
});

export default OrbScene;
