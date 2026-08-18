import { useEffect, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { SCENARIOS as ERAS } from "../lib/scenarios";
import { useOrbName } from "../lib/orbIdentity";
import { FIELD_ENTRIES, MarbleState, guideState, marbleState } from "../lib/fieldGuide";
import { LESSON_LADDER } from "../lessons";
import { loadReadyPlan, planSlices, planTotal } from "../lib/readyAssets";
import { startHereRoute } from "../lib/courseProgress";
import PlanMarble from "../components/PlanMarble";

// Scenario select for the Orb. Each scenario is one lesson; the plain-language
// objective is right on the card. Standards mapping lives in the one-pager.

const SCENARIOS: {
  to: string;
  lesson: string;
  title: string;
  line: string;
  learn: string;
  dots: string[];
  time: string;
  brief?: string;   // path to the era briefing, when one is written
}[] = [
  {
    to: "/orb/tutorial",
    lesson: "Lesson 1",
    title: "What a portfolio is",
    line: "Pour $1,000 into colors and ride out a crash.",
    learn: "What your money becomes when you buy a share.",
    dots: ["#0a84ff", "#bf5af2", "#ff9f0a", "#30d158"],
    time: "about 5 minutes",
  },
  ...ERAS.map((e) => ({
    to: `/orb/s/${e.id}`,
    lesson: e.lesson,
    title: e.title,
    line: e.cardLine,
    learn: e.learn,
    dots: e.dots,
    time: e.time,
    brief: e.briefing ? `/orb/brief/${e.id}` : undefined,
  })),
  {
    to: "/orb/ready",
    lesson: "The last lesson",
    title: "Ready to invest?",
    line: "Build a first plan in real names and real dollars.",
    learn: "How to put a first orb on paper and read its shape honestly.",
    dots: ["#0057b8", "#30d158", "#f7931a", "#64748b"],
    time: "about 10 minutes",
  },
  {
    to: "/orb/free",
    lesson: "Freeplay",
    title: "The sandbox",
    line: "Run a toy market or a real era with no script.",
    learn: "Whatever you decide to try.",
    dots: ["#0a84ff", "#bf5af2", "#ff9f0a", "#30d158", "#64d2ff", "#ffd60a", "#ff453a", "#a2845e"],
    time: "open ended",
  },
];

// A small marble that shows a lesson's quick-check state on the Start-here
// strip: cleared glass, cloudy glass, or an empty dashed ring.
function LessonMarble({ state, color }: { state: MarbleState; color: string }) {
  const base: React.CSSProperties = { width: 32, height: 32, borderRadius: "50%", position: "relative", display: "block", flexShrink: 0 };
  if (state === "cleared") {
    base.background = `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.92), ${color}55 55%, ${color}bb)`;
    base.boxShadow = `inset 0 0 0 1px rgba(30,45,80,0.14), 0 6px 12px -6px ${color}99`;
  } else if (state === "cloudy") {
    base.background = "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(228,230,236,0.7) 55%, rgba(206,210,220,0.85))";
    base.boxShadow = "inset 0 0 0 1px rgba(30,45,80,0.10)";
  } else if (state === "claimed") {
    // said they know it: the color rings still-empty glass until a check proves it
    base.background = "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(240,242,246,0.5))";
    base.boxShadow = `0 0 0 2.5px ${color}`;
  } else {
    base.background = "transparent";
    base.border = "1.5px dashed rgba(0,0,0,0.18)";
  }
  return (
    <span style={base} aria-hidden="true">
      {state !== "empty" && (
        <span style={{ position: "absolute", left: "24%", top: "14%", width: "20%", height: "11%", background: "rgba(255,255,255,0.95)", borderRadius: "50%", transform: "rotate(-25deg)" }} />
      )}
    </span>
  );
}

export default function OrbSelect() {
  const [orbName, setOrbName] = useOrbName();
  const navigate = useNavigate();
  // first visit: the intro ritual runs before the course screen
  useEffect(() => {
    try { if (!localStorage.getItem("onboarded")) navigate("/orb/intro", { replace: true }); } catch { /* fine */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const reco = (() => { try { return localStorage.getItem("orb-reco"); } catch { return null; } })();
  // re-read the field guide whenever a check clears a marble elsewhere
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    window.addEventListener("field-guide-change", bump);
    return () => window.removeEventListener("field-guide-change", bump);
  }, []);
  const gs = guideState();
  const proved = FIELD_ENTRIES.filter((e) => marbleState(e.id, gs) === "cleared").length;
  // the chip starts on the intro's recommendation and advances through the
  // course as stops are played; recomputed on every field-guide bump
  const startHere = startHereRoute(reco);
  // the marble saved by the "Ready to invest?" finale, shown beside the named orb
  const plan = loadReadyPlan();
  const planUsd = plan ? planTotal(plan.lines) : 0;
  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#1d1d1f" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Gallery
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <span className="text-lg font-semibold tracking-tight">The Orb</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <h1 className="text-[34px] font-semibold tracking-tight leading-tight">Your portfolio, in one picture.</h1>
        <div className="mt-2 flex items-baseline gap-2">
          <label htmlFor="orb-name" className="text-[13.5px]" style={{ color: "#6e6e73" }}>Your orb's name:</label>
          <input
            id="orb-name"
            value={orbName}
            onChange={(e) => setOrbName(e.target.value)}
            placeholder="Give it a name"
            maxLength={24}
            className="text-[15px] font-semibold tracking-tight bg-transparent outline-none border-b border-black/10 focus:border-black/30 transition"
            style={{ width: `${Math.max(11, orbName.length + 2)}ch` }}
          />
        </div>
        <p className="mt-2 text-[15px] max-w-xl" style={{ color: "#6e6e73" }}>
          Everything you own lives in one glass orb, and each company is a color.
        </p>

        <div className="mt-6 rounded-3xl bg-white border border-black/8 shadow-sm p-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {plan && planUsd > 0 ? (
            <Link to="/orb/ready" className="flex-shrink-0 transition hover:opacity-85"
              title="Your orb, drawn from the plan you saved in Ready to invest?">
              <PlanMarble slices={planSlices(plan.lines)} total={planUsd} size={96}
                ariaLabel="Your orb, drawn from your saved plan" />
            </Link>
          ) : (
            <div className="w-24 h-24 rounded-full flex-shrink-0 relative"
              style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(238,243,250,0.45) 58%, rgba(214,224,238,0.65))", boxShadow: "inset 0 0 0 1.5px rgba(30,45,80,0.12), 0 14px 28px -14px rgba(24,34,60,0.4)" }}>
              <div className="absolute inset-4 rounded-full overflow-hidden" style={{ filter: "blur(7px)", opacity: 0.55 }}>
                <div className="w-full h-full" style={{ background: "conic-gradient(from 200deg, #0a84ff, #30d158 30%, #ff9f0a 60%, #bf5af2 85%, #0a84ff)" }} />
              </div>
              <div className="absolute rounded-full" style={{ left: "24%", top: "14%", width: "20%", height: "11%", background: "rgba(255,255,255,0.95)", transform: "rotate(-25deg)" }} />
            </div>
          )}
          <div className="min-w-[180px] flex-1">
            <div className="text-[17px] font-semibold tracking-tight">{orbName || "Your orb"}</div>
            <p className="text-[12.5px] mt-0.5" style={{ color: "#6e6e73" }}>
              {plan && planUsd > 0
                ? `${plan.path === "own" ? "Holding" : "Planning"} $${Math.round(planUsd).toLocaleString("en-US")} across ${plan.lines.length} ${plan.lines.length === 1 ? "line" : "lines"}.`
                : "It holds every investment you make, in every lesson."}
            </p>
          </div>
          <Link to="/orb/guide" className="w-full sm:w-auto flex-shrink-0 text-left sm:text-right group">
            <div className="text-[13px] font-medium" style={{ color: "#0071e3" }}>Field guide</div>
            <div className="text-[12px] tnum" style={{ color: "#6e6e73" }}>{proved} of {FIELD_ENTRIES.length} marbles</div>
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-black/8 shadow-sm p-5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="text-[15px] font-semibold tracking-tight">Start here: the basics</div>
            <div className="text-[12px]" style={{ color: "#6e6e73" }}>Five short lessons, played in order.</div>
            <Link to="/orb/intro" className="ml-auto text-[12px] font-medium transition hover:opacity-75" style={{ color: "#0071e3" }}>
              Replay the intro
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {LESSON_LADDER.map((l, i) => {
              const st = marbleState(l.marble.concept, gs);
              return (
                <Link key={l.id} to={`/orb/learn/${l.id}`}
                  className="rounded-xl border border-black/8 p-3 flex flex-col items-start gap-2 transition hover:shadow-md hover:-translate-y-0.5"
                  style={{ background: "#fafafc" }}
                  title={st === "cleared" ? "This marble is cleared." : st === "cloudy" ? "This marble is still setting." : "This marble is not earned yet."}>
                  <div className="flex items-center gap-2 w-full">
                    <LessonMarble state={st} color={l.marble.color} />
                    <span className="ml-auto text-[12px] tnum whitespace-nowrap" style={{ color: "#a1a1a6" }}>{i + 1} of {LESSON_LADDER.length}</span>
                  </div>
                  <span className="text-[13px] font-medium leading-tight">{l.title}</span>
                  <span className="text-[12px] leading-tight" style={{ color: "#6e6e73" }}>
                    {st === "cleared" ? "The marble is cleared." : st === "cloudy" ? "The marble is still setting." : st === "claimed" ? "Prove it here." : "The marble is waiting."}
                  </span>
                  {startHere === `/orb/learn/${l.id}` && (
                    <span className="text-[12px] font-semibold px-2 py-[2px] rounded-full" style={{ background: "#e8f3ff", color: "#0057b8" }}>
                      Start here
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <div className="text-[15px] font-semibold tracking-tight">Then play the lessons</div>
          <div className="text-[12px]" style={{ color: "#6e6e73" }}>
            The tutorial and six real eras, played in order.
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-4">
          {SCENARIOS.map((s) => (
            <div key={s.to}>
            <Link to={s.to}
              className="group rounded-3xl bg-white border border-black/8 shadow-sm p-6 flex flex-wrap items-center gap-x-6 gap-y-3 transition hover:shadow-md hover:-translate-y-0.5">
              <div className="w-20 h-20 rounded-full flex-shrink-0 relative"
                style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(238,243,250,0.4) 60%, rgba(214,224,238,0.6))", boxShadow: "inset 0 0 0 1px rgba(30,45,80,0.1), 0 6px 16px -8px rgba(24,34,60,0.35)" }}>
                <div className="absolute inset-3 rounded-full overflow-hidden flex flex-wrap items-center justify-center gap-0.5 p-1.5" style={{ filter: "blur(3px)", opacity: 0.9 }}>
                  {s.dots.map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div className="absolute rounded-full" style={{ left: "22%", top: "16%", width: "18%", height: "10%", background: "rgba(255,255,255,0.9)", transform: "rotate(-25deg)" }} />
              </div>
              <div className="min-w-[180px] flex-1">
                <div className="text-[12px] font-semibold" style={{ color: "#0071e3" }}>
                  {s.lesson}
                  {startHere === s.to && (
                    <span className="ml-2 text-[12px] font-semibold px-2 py-[2px] rounded-full" style={{ background: "#e8f3ff", color: "#0057b8" }}>
                      Start here
                    </span>
                  )}
                </div>
                <div className="text-[19px] font-semibold tracking-tight">{s.title}</div>
                <div className="text-[13.5px] mt-0.5" style={{ color: "#6e6e73" }}>{s.line}</div>
                <div className="text-[13px] mt-1.5" style={{ color: "#3a3a3c" }}>{s.learn}</div>
              </div>
              <div className="w-full sm:w-auto flex-shrink-0 flex sm:block items-center gap-3 text-left sm:text-right">
                <div className="text-[12px]" style={{ color: "#6e6e73" }}>{s.time}</div>
                <div className="mt-2 text-[13px] font-medium px-3.5 py-1.5 rounded-full text-white transition group-hover:brightness-110 flex items-center justify-center leading-none" style={{ background: "#0071e3" }}>Play</div>
              </div>
            </Link>
            {s.brief && (
              <div className="mt-1.5 pl-8">
                <Link to={s.brief} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition hover:opacity-75"
                  style={{ color: "#0071e3" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 2.5 h7 a2 2 0 0 1 2 2 V 11.5 a1.6 1.6 0 0 0 -1.6 -1.6 H2 Z" />
                    <path d="M4.3 5 h4.4 M4.3 7.2 h4.4" />
                  </svg>
                  The era briefing is an optional 2 minute read.
                </Link>
              </div>
            )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
