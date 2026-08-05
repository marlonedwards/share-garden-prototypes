import { ReactNode, useState } from "react";
import { FluidStyle } from "./OrbScene";

// Shared UI atoms for the Orb pages (tutorial, era, select).

export function Card({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`pop-in rounded-2xl border border-black/8 shadow-xl p-5 ${wide ? "w-full" : ""}`}
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}>
      <div className="text-[15px] font-semibold mb-1.5 tracking-tight">{title}</div>
      <div className="text-sm leading-relaxed" style={{ color: "#3a3a3c" }}>{children}</div>
    </div>
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return (
    <div className="pop-in rounded-2xl px-5 py-3 text-[13px] text-center leading-relaxed shadow-lg border border-black/5"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", color: "#6e6e73" }}>
      {children}
    </div>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex gap-2.5 mt-3">{children}</div>;
}

export function Btn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40 shadow-sm"
      style={{ background: "#0071e3" }}>
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-5 py-2.5 rounded-full text-sm font-medium border border-black/15 bg-white transition hover:bg-black/5"
      style={{ color: "#1d1d1f" }}>
      {children}
    </button>
  );
}

export function TradeChip({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-2.5 py-1 rounded-full text-[12px] font-medium border border-black/12 bg-white transition hover:bg-black/5 disabled:opacity-35 tnum">
      {children}
    </button>
  );
}

export function Dot({ c }: { c: string }) {
  return <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c }} />;
}

export function DeltaChip({ value, suffix }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span className="text-[12px] font-semibold tnum px-2 py-0.5 rounded-full"
      style={{ color: up ? "#248a3d" : "#d70015", background: up ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.10)" }}>
      {(up ? "+" : "") + (value * 100).toFixed(1)}%{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

export function StageLabel({ x, title, sub, highlight }: { x: number; title: string; sub: string; highlight?: boolean }) {
  return (
    <div className="absolute text-center -translate-x-1/2 transition-opacity"
      style={{ left: `${x * 100}%`, top: "84%", opacity: highlight ? 1 : 0.85 }}>
      <div className="text-[13px] font-semibold tracking-tight">{title}</div>
      <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{sub}</div>
    </div>
  );
}

export function SpeedBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 text-[12.5px] font-medium transition"
      style={{ background: active ? "#1d1d1f" : "transparent", color: active ? "#fff" : "#1d1d1f" }}>
      {label}
    </button>
  );
}

export const RAINBOW_DOT = "conic-gradient(#ff453a, #ff9f0a, #ffd60a, #30d158, #64d2ff, #0a84ff, #bf5af2, #ff453a)";

export function useFluidPref(): [FluidStyle, (f: FluidStyle) => void] {
  const [fluid, setFluidState] = useState<FluidStyle>(() => (localStorage.getItem("orbFluid") as FluidStyle) || "waves");
  const setFluid = (f: FluidStyle) => { setFluidState(f); localStorage.setItem("orbFluid", f); };
  return [fluid, setFluid];
}

export const FLUIDS: { key: FluidStyle; label: string }[] = [
  { key: "waves", label: "Waves" },
  { key: "blobs", label: "Blobs" },
  { key: "bubbles", label: "Bubbles" },
  { key: "strata", label: "Layers" },
];

// compact ‹ style › cycler; costs no vertical space
export function FluidCycler({ fluid, setFluid }: { fluid: FluidStyle; setFluid: (f: FluidStyle) => void }) {
  const i = Math.max(0, FLUIDS.findIndex((f) => f.key === fluid));
  const cycle = (d: number) => setFluid(FLUIDS[(i + d + FLUIDS.length) % FLUIDS.length].key);
  return (
    <div className="absolute right-4 top-4 flex items-center rounded-full bg-white border border-black/10 shadow-sm overflow-hidden">
      <button onClick={() => cycle(-1)} aria-label="previous style" className="px-2 py-1.5 hover:bg-black/5 transition text-[13px]" style={{ color: "#6e6e73" }}>‹</button>
      <span className="text-[12px] font-medium w-16 text-center select-none">{FLUIDS[i].label}</span>
      <button onClick={() => cycle(1)} aria-label="next style" className="px-2 py-1.5 hover:bg-black/5 transition text-[13px]" style={{ color: "#6e6e73" }}>›</button>
    </div>
  );
}

// tiny price history line for trade rows
export function Sparkline({ data, color, width = 96, height = 26 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * (width - 2) + 1).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4) + 1).toFixed(1)}`);
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="2" fill={up ? "#248a3d" : "#d70015"} />
    </svg>
  );
}

// your orb vs the benchmark over the whole run, smoothed, with time ticks
export interface ChartMarker {
  step: number;
  kind: "buy" | "sell" | "gate" | "event";
  label: string;
}

const MARKER_STYLE: Record<ChartMarker["kind"], { fill: string; shape: "up" | "down" | "diamond" | "dot" }> = {
  buy:   { fill: "#0071e3", shape: "up" },
  sell:  { fill: "#d70015", shape: "down" },
  gate:  { fill: "#bf5af2", shape: "diamond" },
  event: { fill: "#a1a1a6", shape: "dot" },
};

export function GrowthChart({ net, bench, width = 320, height = 96, benchLabel = "the rainbow orb", xLabels, benchStroke = "url(#rb)", markers, cursorStep, onScrub, onLock, locked, tipFor }:
  { net: number[]; bench: number[]; width?: number; height?: number; benchLabel?: string; xLabels?: string[]; benchStroke?: string;
    markers?: ChartMarker[]; cursorStep?: number | null; onScrub?: (step: number | null) => void;
    onLock?: (step: number) => void; locked?: boolean; tipFor?: (step: number) => string }) {
  if (net.length < 2) return null;
  const all = [...net, ...bench];
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const sample = (data: number[]) => {
    const N = Math.min(90, data.length);
    return Array.from({ length: N }, (_, i) => data[Math.round((i / (N - 1)) * (data.length - 1))]);
  };
  const toPts = (data: number[]) => {
    const d = sample(data);
    return d.map((v, i) => [
      (i / (d.length - 1)) * (width - 4) + 2,
      height - 4 - ((v - min) / span) * (height - 8) + 2,
    ] as const);
  };
  // quadratic midpoint smoothing
  const smooth = (pts: readonly (readonly [number, number])[]) => {
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
    return d;
  };
  const lastStep = net.length - 1;
  const stepToX = (s: number) => (s / lastStep) * (width - 4) + 2;
  const xToStep = (x: number) => Math.max(0, Math.min(lastStep, Math.round(((x - 2) / (width - 4)) * lastStep)));
  const SNAP_PX = 7;
  const snappedStep = (clientX: number, el: SVGSVGElement) => {
    const x = clientX - el.getBoundingClientRect().left;
    let step = xToStep(x);
    if (markers) {
      let best: number | null = null, bestD = SNAP_PX + 1;
      for (const mk of markers) {
        const d = Math.abs(stepToX(mk.step) - x);
        if (d < bestD) { bestD = d; best = mk.step; }
      }
      if (best !== null) step = best;
    }
    return step;
  };
  const scrubAt = (clientX: number, el: SVGSVGElement) => {
    if (onScrub) onScrub(snappedStep(clientX, el));
  };
  const cursorLabels = cursorStep != null && markers ? markers.filter((mk) => mk.step === cursorStep).map((mk) => mk.label) : [];
  const glyph = (mk: ChartMarker, i: number) => {
    const x = stepToX(mk.step), y = height - 5;
    const s = MARKER_STYLE[mk.kind];
    const active = cursorStep === mk.step;
    const common = { fill: s.fill, opacity: active ? 1 : 0.75 } as const;
    return (
      <g key={`${mk.kind}-${mk.step}-${i}`}>
        <title>{mk.label}</title>
        {s.shape === "up" && <path d={`M ${x} ${y - 3.5} L ${x + 3.2} ${y + 2.5} L ${x - 3.2} ${y + 2.5} Z`} {...common} />}
        {s.shape === "down" && <path d={`M ${x} ${y + 2.5} L ${x + 3.2} ${y - 3.5} L ${x - 3.2} ${y - 3.5} Z`} {...common} />}
        {s.shape === "diamond" && <path d={`M ${x} ${y - 3.5} L ${x + 3} ${y - 0.5} L ${x} ${y + 2.5} L ${x - 3} ${y - 0.5} Z`} {...common} />}
        {s.shape === "dot" && <circle cx={x} cy={y - 0.5} r={2.4} {...common} />}
      </g>
    );
  };
  return (
    <div style={{ position: "relative" }}>
      {cursorStep != null && tipFor && (
        <div className="tnum" style={{
          position: "absolute",
          left: Math.max(4, Math.min(width - 190, stepToX(cursorStep) + 8)),
          top: -6,
          transform: "translateY(-100%)",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 10,
          boxShadow: "0 8px 20px -10px rgba(24,34,60,0.35)",
          padding: "6px 10px",
          fontSize: 11.5,
          lineHeight: 1.4,
          color: "#1d1d1f",
          pointerEvents: "none",
          zIndex: 5,
          maxWidth: 200,
        }}>
          <div className="font-semibold">{tipFor(cursorStep)}{locked ? " · pinned" : ""}</div>
          {cursorLabels.map((l) => (
            <div key={l} style={{ color: "#6e6e73" }}>{l}</div>
          ))}
          {!locked && onLock && cursorLabels.length === 0 && (
            <div style={{ color: "#a1a1a6" }}>click to pin</div>
          )}
        </div>
      )}
      <svg width={width} height={height} style={{ display: "block", cursor: onScrub ? "col-resize" : undefined, touchAction: "none" }}
        onMouseMove={onScrub ? (e) => scrubAt(e.clientX, e.currentTarget) : undefined}
        onMouseLeave={onScrub ? () => onScrub(null) : undefined}
        onClick={onLock ? (e) => onLock(snappedStep(e.clientX, e.currentTarget)) : undefined}
        onPointerDown={onScrub && !onLock ? (e) => scrubAt(e.clientX, e.currentTarget) : undefined}>
        {cursorStep != null && cursorStep < lastStep && (
          <rect x={stepToX(cursorStep)} y={0} width={width - 2 - stepToX(cursorStep)} height={height}
            fill="rgba(245,245,247,0.72)" pointerEvents="none" />
        )}
        <path d={smooth(toPts(bench))} fill="none" stroke={benchStroke} strokeWidth="1.8" strokeLinejoin="round" opacity="0.85" />
        <path d={smooth(toPts(net))} fill="none" stroke="#1d1d1f" strokeWidth="1.8" strokeLinejoin="round" />
        {markers && markers.map(glyph)}
        {cursorStep != null && (
          <line x1={stepToX(cursorStep)} y1={2} x2={stepToX(cursorStep)} y2={height - 2}
            stroke="#0071e3" strokeWidth={locked ? 1.6 : 1.2} strokeDasharray={locked ? undefined : "3 2.5"} pointerEvents="none" />
        )}
        <defs>
          <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff9f0a" /><stop offset="0.5" stopColor="#bf5af2" /><stop offset="1" stopColor="#0a84ff" />
          </linearGradient>
        </defs>
      </svg>
      {xLabels && xLabels.length > 1 && (
        <div className="flex justify-between mt-0.5 text-[10.5px] tnum" style={{ color: "#a1a1a6", width }}>
          {xLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
      <div className="flex gap-4 mt-1 text-[11.5px]" style={{ color: "#6e6e73" }}>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "#1d1d1f" }} />you</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: benchStroke === "url(#rb)" ? "linear-gradient(90deg,#ff9f0a,#bf5af2,#0a84ff)" : benchStroke }} />{benchLabel}</span>
      </div>
    </div>
  );
}

export function FluidSettings({ fluid, setFluid }: { fluid: FluidStyle; setFluid: (f: FluidStyle) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute right-4 top-4">
      <button onClick={() => setOpen(!open)} aria-label="settings"
        className="w-9 h-9 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center hover:bg-black/5 transition">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e6e73" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-black/8 shadow-xl p-3 pop-in z-30">
          <div className="text-[12px] font-semibold mb-2" style={{ color: "#6e6e73" }}>Orb liquid</div>
          {([["waves", "Flowing waves", "colors keep their true share"], ["blobs", "Floating blobs", "free lava lamp, panel has the numbers"]] as const).map(([key, label, sub]) => (
            <button key={key} onClick={() => { setFluid(key); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition hover:bg-black/5">
              <span className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0"
                style={{ borderColor: fluid === key ? "#0071e3" : "rgba(0,0,0,0.25)" }}>
                {fluid === key && <span className="w-2 h-2 rounded-full" style={{ background: "#0071e3" }} />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">{label}</span>
                <span className="block text-[11.5px]" style={{ color: "#6e6e73" }}>{sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
