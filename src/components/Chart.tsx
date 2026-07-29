interface Props {
  series: number[];
  benchmark?: number[];
  color?: string;
  benchColor?: string;
  fill?: boolean;
  height?: number;
  baseline?: number; // draw a faint dashed line at this value (e.g. starting cash)
}

// Lightweight SVG line/area chart. Auto-scales to min/max across both series.
export default function Chart({ series, benchmark, color = "#33d17a", benchColor = "#7f8ba0", fill = true, height = 120, baseline }: Props) {
  const w = 300;
  const h = height;
  const all = benchmark ? series.concat(benchmark) : series.slice();
  if (baseline != null) all.push(baseline);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-6) { hi = lo + 1; }
  const pad = (hi - lo) * 0.12;
  lo -= pad; hi += pad;
  const n = Math.max(series.length, 2);
  const x = (i: number) => (i / (n - 1)) * w;
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h;

  const path = (s: number[]) => s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = fill ? `${path(series)} L ${w} ${h} L 0 ${h} Z` : "";
  const gid = "g" + color.replace("#", "");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {baseline != null && (
        <line x1="0" x2={w} y1={y(baseline)} y2={y(baseline)} stroke="#ffffff" strokeOpacity="0.14" strokeDasharray="3 4" strokeWidth="1" />
      )}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      {benchmark && <path d={path(benchmark)} fill="none" stroke={benchColor} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.8" vectorEffect="non-scaling-stroke" />}
      <path d={path(series)} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
