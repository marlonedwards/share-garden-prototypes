import { Link } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  title: string;
  accent: string;
  blurb: string;
  children: ReactNode;
  aside?: ReactNode;
}

// Page chrome shared by the three prototypes. A title bar with a back link,
// a one-line thesis, and a centered stage. `aside` holds the metaphor legend.
export default function Shell({ title, accent, blurb, children, aside }: Props) {
  return (
    <div className="min-h-full text-white/90" style={{ background: "radial-gradient(1200px 700px at 50% -10%, #16202f, #0a0d13 60%)" }}>
      <header className="flex items-center gap-4 px-5 sm:px-8 h-16 border-b border-white/8">
        <Link to="/" className="text-sm text-white/55 hover:text-white transition flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Gallery
        </Link>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-lg font-bold tracking-tight" style={{ color: accent }}>{title}</span>
        </div>
        <div className="ml-auto text-[13px] text-white/45 max-w-[40%] text-right hidden md:block">{blurb}</div>
      </header>

      <main className="px-4 sm:px-8 py-8 flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
        <div className="flex-shrink-0">{children}</div>
        {aside && <div className="w-full max-w-sm lg:pt-2">{aside}</div>}
      </main>
    </div>
  );
}

// A single metaphor-mapping row for the legend panels.
export function MapRow({ left, right, color }: { left: string; right: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/6 last:border-0">
      <div className="text-sm font-medium" style={{ color: color ?? "#fff" }}>{left}</div>
      <div className="flex-1 border-t border-dashed border-white/12" />
      <div className="text-sm text-white/55">{right}</div>
    </div>
  );
}
