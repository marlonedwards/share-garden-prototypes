import { Link } from "react-router-dom";
import { SCENARIOS as ERAS } from "../lib/scenarios";
import { useOrbName } from "../lib/orbIdentity";
import { FIELD_ENTRIES, guideState, marbleState } from "../lib/fieldGuide";

// Scenario select for the Orb. Each scenario is one lesson; the plain-language
// objective is right on the card. Standards mapping lives in the one-pager.

const SCENARIOS = [
  {
    to: "/orb/tutorial",
    lesson: "Lesson 1",
    title: "What a portfolio is",
    line: "Pour $1,000 into colors, meet the rainbow orb, ride out a crash.",
    learn: "What your money becomes when you buy a share, and why a crash doesn't take it away.",
    dots: ["#0a84ff", "#bf5af2", "#ff9f0a", "#30d158"],
    time: "about 5 minutes",
  },
  ...ERAS.map((e) => ({
    to: `/orb/s/${e.id}`,
    lesson: e.lesson,
    title: e.title.toLowerCase() === e.title ? e.title : e.title.charAt(0) + e.title.slice(1).toLowerCase(),
    line: e.cardLine,
    learn: e.learn,
    dots: e.dots,
    time: e.time,
  })),
  {
    to: "/orb/free",
    lesson: "Freeplay",
    title: "The sandbox",
    line: "A toy market or a real era, no script. Finish whenever you like.",
    learn: "Whatever you try. The rainbow orb is watching.",
    dots: ["#0a84ff", "#bf5af2", "#ff9f0a", "#30d158", "#64d2ff", "#ffd60a", "#ff453a", "#a2845e"],
    time: "open ended",
  },
];

export default function OrbSelect() {
  const [orbName, setOrbName] = useOrbName();
  const gs = guideState();
  const proved = FIELD_ENTRIES.filter((e) => marbleState(e.id, gs) === "cleared").length;
  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#1d1d1f" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          gallery
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <span className="text-lg font-semibold tracking-tight">The Orb</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <h1 className="text-[34px] font-semibold tracking-tight leading-tight">Your portfolio, in one picture.</h1>
        <p className="mt-2 text-[15px] max-w-xl" style={{ color: "#6e6e73" }}>
          Everything you own lives in one glass orb. Each company is a color. The orb's size is what
          it's all worth right now. Pick a scenario.
        </p>

        <div className="mt-6 rounded-3xl bg-white border border-black/8 shadow-sm p-6 flex items-center gap-6">
          <div className="w-24 h-24 rounded-full flex-shrink-0 relative"
            style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(238,243,250,0.45) 58%, rgba(214,224,238,0.65))", boxShadow: "inset 0 0 0 1.5px rgba(30,45,80,0.12), 0 14px 28px -14px rgba(24,34,60,0.4)" }}>
            <div className="absolute inset-4 rounded-full overflow-hidden" style={{ filter: "blur(7px)", opacity: 0.55 }}>
              <div className="w-full h-full" style={{ background: "conic-gradient(from 200deg, #0a84ff, #30d158 30%, #ff9f0a 60%, #bf5af2 85%, #0a84ff)" }} />
            </div>
            <div className="absolute rounded-full" style={{ left: "24%", top: "14%", width: "20%", height: "11%", background: "rgba(255,255,255,0.95)", transform: "rotate(-25deg)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold" style={{ color: "#0071e3" }}>This is your orb</div>
            <input
              value={orbName}
              onChange={(e) => setOrbName(e.target.value)}
              placeholder="Give it a name"
              maxLength={24}
              className="text-[21px] font-semibold tracking-tight bg-transparent outline-none w-full border-b border-transparent focus:border-black/15 transition"
            />
            <p className="text-[12.5px] mt-1" style={{ color: "#6e6e73" }}>
              It holds every investment you make, in every lesson. A crash can shrink it, but only
              selling empties it. Its name stays on this computer and goes nowhere else.
            </p>
          </div>
          <Link to="/orb/guide" className="flex-shrink-0 text-right group">
            <div className="text-[13px] font-medium" style={{ color: "#0071e3" }}>Field guide</div>
            <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{proved} of {FIELD_ENTRIES.length} marbles</div>
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {SCENARIOS.map((s) => (
            <Link key={s.to} to={s.to}
              className="group rounded-3xl bg-white border border-black/8 shadow-sm p-6 flex items-center gap-6 transition hover:shadow-md hover:-translate-y-0.5">
              <div className="w-20 h-20 rounded-full flex-shrink-0 relative"
                style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(238,243,250,0.4) 60%, rgba(214,224,238,0.6))", boxShadow: "inset 0 0 0 1px rgba(30,45,80,0.1), 0 6px 16px -8px rgba(24,34,60,0.35)" }}>
                <div className="absolute inset-3 rounded-full overflow-hidden flex flex-wrap items-center justify-center gap-0.5 p-1.5" style={{ filter: "blur(3px)", opacity: 0.9 }}>
                  {s.dots.map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div className="absolute rounded-full" style={{ left: "22%", top: "16%", width: "18%", height: "10%", background: "rgba(255,255,255,0.9)", transform: "rotate(-25deg)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold" style={{ color: "#0071e3" }}>{s.lesson}</div>
                <div className="text-[19px] font-semibold tracking-tight">{s.title}</div>
                <div className="text-[13.5px] mt-0.5" style={{ color: "#6e6e73" }}>{s.line}</div>
                <div className="text-[12.5px] mt-1.5" style={{ color: "#3a3a3c" }} title={s.learn}>
                  <span className="font-medium">You'll learn:</span> {s.learn}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[12px]" style={{ color: "#6e6e73" }}>{s.time}</div>
                <div className="mt-2 text-[13px] font-medium px-3.5 py-1.5 rounded-full text-white transition group-hover:brightness-110 flex items-center justify-center leading-none" style={{ background: "#0071e3" }}>Play</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
