import { Link } from "react-router-dom";

// First-week prototypes, preserved for reference and kept out of the way.

const OLD = [
  { to: "/pulse", name: "Pulse", note: "Pulse shows the whole market as a live ticker wall and treemap." },
  { to: "/prism", name: "Prism", note: "Prism draws the market as a 3D polygon landscape sized by market cap." },
  { to: "/garden-old", name: "Garden (first draft)", note: "This is the original garden loop, built before the metaphor law." },
];

export default function Archive() {
  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#1d1d1f" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          gallery
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <span className="text-lg font-semibold tracking-tight">First-week prototypes</span>
      </header>
      <main className="max-w-2xl mx-auto px-6 pt-10 pb-16">
        <p className="text-[14px]" style={{ color: "#6e6e73" }}>
          These earlier explorations come from the first build week. They taught us what didn't
          work: growth animations decoupled from value, geometry frozen at market cap, pedagogy
          as UI copy. They stay here for reference.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {OLD.map((o) => (
            <Link key={o.to} to={o.to} className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
              <div className="text-[15px] font-semibold tracking-tight">{o.name}</div>
              <p className="text-[13px] mt-0.5" style={{ color: "#6e6e73" }}>{o.note}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
