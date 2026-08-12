import { Link } from "react-router-dom";

// First-week prototypes, preserved for reference and kept out of the way, plus
// the design sketches that come before a build.

// Live builds that are not part of the course ladder yet.
const PROBES = [
  {
    to: "/stack/s/gfc",
    name: "The Stack, both stages",
    note:
      "The same level, the same corridor, the same stars, with a toggle between the glass cylinder and " +
      "the countable blocks. Anything that changes when you flip it is the picture, not the game.",
  },
];

const OLD = [
  { to: "/pulse", name: "Pulse", note: "Pulse shows the whole market as a live ticker wall and treemap." },
  { to: "/prism", name: "Prism", note: "Prism draws the market as a 3D polygon landscape sized by market cap." },
  { to: "/garden-old", name: "Garden (first draft)", note: "This is the original garden loop, built before the metaphor law." },
];

// Static pages under public/, so they open outside the app shell.
const SKETCHES = [
  {
    href: `${import.meta.env.BASE_URL}sketches/tally.html`,
    name: "The Tally",
    note:
      "The game the tile chart was arguing for. Cards are what you own and blocks are what it is worth, " +
      "so a crash strips the wall and leaves every card on the table. Move the year on the crash exhibit, " +
      "flip the overlays and watch the board refuse to move, and play the unit upgrade. " +
      "Full spec in docs/tally-spec.md.",
  },
  {
    href: `${import.meta.env.BASE_URL}sketches/tile-chart.html`,
    name: "The tile chart",
    note:
      "A portfolio drawn as countable blocks instead of a shape whose volume you have to judge. " +
      "Scrub five years, switch between one holding and five, and change what a block is worth. " +
      "Argues for a TileStage that drops into the Stack's scenario in place of the cylinder.",
  },
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
        <span className="text-lg font-semibold tracking-tight">Experiments</span>
      </header>
      <main className="max-w-2xl mx-auto px-6 pt-10 pb-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Design sketches</h2>
        <p className="mt-1 text-[14px]" style={{ color: "#6e6e73" }}>
          Arguments made in pictures, before anything gets built. These open in their own tab.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {SKETCHES.map((sk) => (
            <a
              key={sk.href}
              href={sk.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md"
            >
              <div className="text-[15px] font-semibold tracking-tight">{sk.name}</div>
              <p className="text-[13px] mt-0.5" style={{ color: "#6e6e73" }}>{sk.note}</p>
            </a>
          ))}
        </div>

        <h2 className="mt-10 text-[15px] font-semibold tracking-tight">Built from the sketches</h2>
        <p className="mt-1 text-[14px]" style={{ color: "#6e6e73" }}>
          What the arguments above turned into. These run in the app.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {PROBES.map((pr) => (
            <Link key={pr.to} to={pr.to} className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
              <div className="text-[15px] font-semibold tracking-tight">{pr.name}</div>
              <p className="text-[13px] mt-0.5" style={{ color: "#6e6e73" }}>{pr.note}</p>
            </Link>
          ))}
        </div>

        <h2 className="mt-10 text-[15px] font-semibold tracking-tight">First-week prototypes</h2>
        <p className="mt-1 text-[14px]" style={{ color: "#6e6e73" }}>
          These earlier explorations come from the first build week. They taught us what didn't
          work: growth animations decoupled from value, geometry frozen at market cap, pedagogy
          as UI copy. They stay here for reference.
        </p>
        <div className="mt-4 flex flex-col gap-3">
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
