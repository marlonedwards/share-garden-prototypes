interface Props {
  speed: number;
  setSpeed: (s: number) => void;
  step: number;
  accent?: string;
  compact?: boolean;
}

// SimCity-style pause / play / fast-forward. State by shape, no emoji.
export default function TimeControls({ speed, setSpeed, step, accent = "#56c7ff", compact }: Props) {
  const btn = (active: boolean) =>
    `grid place-items-center rounded-lg transition ${compact ? "h-8 w-8" : "h-10 w-11"} ` +
    (active ? "text-black" : "text-white/70 hover:text-white bg-white/5");
  const style = (active: boolean) => (active ? { background: accent } : undefined);

  return (
    <div className="flex items-center gap-1.5">
      <button aria-label="pause" className={btn(speed === 0)} style={style(speed === 0)} onClick={() => setSpeed(0)}>
        <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="1.5" width="3" height="9" rx="1" /><rect x="7" y="1.5" width="3" height="9" rx="1" /></svg>
      </button>
      <button aria-label="play" className={btn(speed === 1)} style={style(speed === 1)} onClick={() => setSpeed(1)}>
        <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><path d="M2.5 1.5 L10 6 L2.5 10.5 Z" /></svg>
      </button>
      <button aria-label="fast forward" className={btn(speed === 2)} style={style(speed === 2)} onClick={() => setSpeed(2)}>
        <svg width="15" height="13" viewBox="0 0 16 12" fill="currentColor"><path d="M1.5 1.5 L7 6 L1.5 10.5 Z" /><path d="M8.5 1.5 L14 6 L8.5 10.5 Z" /></svg>
      </button>
      <button aria-label="fastest" className={btn(speed === 4)} style={style(speed === 4)} onClick={() => setSpeed(4)}>
        <svg width="18" height="13" viewBox="0 0 20 12" fill="currentColor"><path d="M1 1.5 L6 6 L1 10.5 Z" /><path d="M7 1.5 L12 6 L7 10.5 Z" /><path d="M13 1.5 L18 6 L13 10.5 Z" /></svg>
      </button>
      <div className="ml-2 text-xs text-white/45 tnum">Day {step}</div>
    </div>
  );
}
