import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrbName } from "../lib/orbIdentity";
import { markClaimed } from "../lib/fieldGuide";

// First-visit onboarding: a fifteen-second ritual, then a short money
// conversation. The ritual is play, not reading: the orb appears, gets a
// name, and the player pours their first color, which teaches buy-means-pour
// by doing it. The conversation asks four plain-money questions with no orb
// jargon; knowledge answers mark concepts as claimed on the marble shelf, and
// every answer shapes which starting point gets highlighted afterward.
// Everything is skippable, and nothing here leaves the computer.

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const ACCENT = "#0071e3";

const POUR_COLORS = [
  { color: "#0a84ff", glow: "#7cc0ff" },
  { color: "#30d158", glow: "#8ff0ae" },
  { color: "#ff9f0a", glow: "#ffcf7a" },
  { color: "#bf5af2", glow: "#e0a9ff" },
];

interface Q {
  id: string;
  prompt: string;
  options: { label: string; claims?: string[]; knows?: boolean }[];
}

const QUESTIONS: Q[] = [
  {
    id: "hundred",
    prompt: "Someone hands you $100. What do you honestly do with it?",
    options: [
      { label: "Save all of it" },
      { label: "Spend some, save some" },
      { label: "Try to grow it somehow" },
      { label: "No idea, honestly" },
    ],
  },
  {
    id: "stock-money",
    prompt: "When you buy a share of a company's stock, where does your money usually go?",
    options: [
      { label: "To the company" },
      { label: "To whoever owned the share before me", claims: ["share", "market-price"], knows: true },
      { label: "To the stock market itself" },
      { label: "I have never thought about it" },
    ],
  },
  {
    id: "crash-gut",
    prompt: "Prices fall 30% in one month. Your honest gut says:",
    options: [
      { label: "Sell before it gets worse" },
      { label: "Wait it out" },
      { label: "Buy more while it is cheap" },
      { label: "I would have no idea what to do" },
    ],
  },
  {
    id: "index",
    prompt: "Have you heard of an index fund?",
    options: [
      { label: "Yes, and I could explain what it is", claims: ["index-fund", "diversification"], knows: true },
      { label: "I have heard the name" },
      { label: "Never heard of it" },
    ],
  },
];

type Stage = "arrive" | "name" | "pour" | "ask" | "done";

export function finishOnboarding(): void {
  try { localStorage.setItem("onboarded", "1"); } catch { /* private browsing */ }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [orbName, setOrbName] = useOrbName();
  const [stage, setStage] = useState<Stage>("arrive");
  const [lineCount, setLineCount] = useState(0);
  const [poured, setPoured] = useState<{ color: string; glow: string } | null>(null);
  const [qi, setQi] = useState(0);
  const [knows, setKnows] = useState(0);

  // the arrival lines appear one at a time, then the name step opens
  useEffect(() => {
    if (stage !== "arrive") return;
    const timers = [
      setTimeout(() => setLineCount(1), 500),
      setTimeout(() => setLineCount(2), 1600),
      setTimeout(() => setStage("name"), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const skip = () => {
    finishOnboarding();
    navigate("/orb", { replace: true });
  };

  const answer = (o: Q["options"][number]) => {
    (o.claims ?? []).forEach(markClaimed);
    if (o.knows) setKnows((k) => k + 1);
    if (qi + 1 < QUESTIONS.length) setQi(qi + 1);
    else setStage("done");
  };

  const finish = () => {
    const reco = knows >= 2 ? "era-dotcom" : knows === 1 ? "lesson-stocks" : "lesson-cash";
    try { localStorage.setItem("orb-reco", reco); } catch { /* fine */ }
    finishOnboarding();
    navigate("/orb", { replace: true });
  };

  const doneLine =
    knows >= 2
      ? "You already know your way around. The real history lessons are a good place for you to start, and the basics are always there."
      : knows === 1
      ? "You know some of this already. The stocks lesson is a good place to start, and it clears your first marbles fast."
      : "Everyone starts somewhere, and the course starts gentle. The cash lesson is two minutes, and it is the floor everything else stands on.";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(circle at 50% 30%, #ffffff 0%, #f5f5f7 55%, #eceef2 100%)", color: INK, colorScheme: "light" }}>
      <header className="flex items-center justify-end px-6 h-14 flex-shrink-0">
        <button onClick={skip} className="text-[13px] transition hover:opacity-80" style={{ color: SUB }}>
          Skip the intro
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center">
        {/* the orb itself, present through every stage */}
        <div className="w-40 h-40 rounded-full relative"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.96), rgba(238,243,250,0.5) 58%, rgba(214,224,238,0.7))",
            boxShadow: "inset 0 0 0 2px rgba(30,45,80,0.12), 0 24px 48px -20px rgba(24,34,60,0.45)",
            animation: "sg-orb-arrive 1.1s cubic-bezier(.2,.9,.3,1)",
          }}>
          {poured && (
            <div className="absolute inset-5 rounded-full overflow-hidden" style={{ filter: "blur(6px)" }}>
              <div className="w-full h-full pop-in"
                style={{ background: `radial-gradient(circle at 50% 65%, ${poured.color}, ${poured.glow} 75%)`, opacity: 0.85 }} />
            </div>
          )}
          <div className="absolute rounded-full" style={{ left: "24%", top: "13%", width: "20%", height: "11%", background: "rgba(255,255,255,0.95)", transform: "rotate(-25deg)" }} />
        </div>
        <style>{`@keyframes sg-orb-arrive { from { opacity: 0; transform: translateY(14px) scale(0.92); } to { opacity: 1; transform: none; } }`}</style>

        {stage === "arrive" && (
          <div className="mt-7 min-h-[72px]">
            {lineCount >= 1 && <p className="text-[21px] font-semibold tracking-tight pop-in">This is your orb.</p>}
            {lineCount >= 2 && <p className="text-[15px] mt-1.5 pop-in" style={{ color: SUB }}>It will hold everything you ever buy.</p>}
          </div>
        )}

        {stage === "name" && (
          <div className="mt-7 pop-in">
            <p className="text-[21px] font-semibold tracking-tight">This is your orb.</p>
            <p className="text-[15px] mt-1.5" style={{ color: SUB }}>Every orb needs a name.</p>
            <input
              autoFocus
              value={orbName}
              onChange={(e) => setOrbName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && orbName.trim()) setStage("pour"); }}
              placeholder="type a name"
              maxLength={24}
              className="mt-4 text-center text-[19px] font-semibold tracking-tight bg-transparent outline-none border-b border-black/15 focus:border-black/35 transition pb-1"
              style={{ width: "min(280px, 80vw)" }}
            />
            <div className="mt-5 flex items-center justify-center gap-4">
              <button onClick={() => setStage("pour")} disabled={!orbName.trim()}
                className="text-[13.5px] font-medium px-5 py-2 rounded-full text-white transition disabled:opacity-35"
                style={{ background: ACCENT }}>
                That is its name
              </button>
              <button onClick={() => setStage("pour")} className="text-[12.5px] transition hover:opacity-80" style={{ color: SUB }}>
                Name it later
              </button>
            </div>
          </div>
        )}

        {stage === "pour" && (
          <div className="mt-7 pop-in">
            <p className="text-[21px] font-semibold tracking-tight">
              {poured ? "That tap was a buy." : "Pour your first color."}
            </p>
            <p className="text-[15px] mt-1.5 max-w-sm mx-auto" style={{ color: SUB }}>
              {poured
                ? "Money went in, and color filled the glass. Every investment you ever make works exactly like that."
                : "Tap a color. Each one is a company you could own a piece of."}
            </p>
            {!poured ? (
              <div className="mt-5 flex items-center justify-center gap-4">
                {POUR_COLORS.map((c) => (
                  <button key={c.color} onClick={() => setPoured(c)} aria-label="Pour this color"
                    className="w-11 h-11 rounded-full transition hover:scale-110"
                    style={{ background: `radial-gradient(circle at 35% 30%, ${c.glow}, ${c.color})`, boxShadow: `0 8px 16px -8px ${c.color}`, flexShrink: 0 }} />
                ))}
              </div>
            ) : (
              <button onClick={() => setStage("ask")}
                className="mt-5 text-[13.5px] font-medium px-5 py-2 rounded-full text-white" style={{ background: ACCENT }}>
                Keep going
              </button>
            )}
          </div>
        )}

        {stage === "ask" && (
          <div className="mt-7 pop-in w-full max-w-md" key={qi}>
            <p className="text-[12px] font-semibold" style={{ color: SUB }}>
              {orbName ? `${orbName} wants to know you` : "Your orb wants to know you"} · {qi + 1} of {QUESTIONS.length}
            </p>
            <p className="text-[17px] font-semibold tracking-tight mt-1.5">{QUESTIONS[qi].prompt}</p>
            <div className="mt-3.5 flex flex-col gap-2">
              {QUESTIONS[qi].options.map((o) => (
                <button key={o.label} onClick={() => answer(o)}
                  className="text-left text-[13.5px] rounded-xl px-4 py-2.5 border border-black/10 bg-white transition hover:border-black/25">
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11.5px]" style={{ color: "#a1a1a6" }}>
              There are no wrong answers here. Honest ones make the course fit you better.
            </p>
          </div>
        )}

        {stage === "done" && (
          <div className="mt-7 pop-in max-w-md">
            <p className="text-[21px] font-semibold tracking-tight">
              {orbName ? `${orbName} is ready.` : "Your orb is ready."}
            </p>
            <p className="text-[14px] mt-2" style={{ color: SUB }}>{doneLine}</p>
            <button onClick={finish}
              className="mt-5 text-[13.5px] font-medium px-6 py-2.5 rounded-full text-white" style={{ background: ACCENT }}>
              Open the course
            </button>
            <p className="mt-3 text-[11.5px]" style={{ color: "#a1a1a6" }}>
              What you said here stays on this computer. You can replay this intro anytime from the course screen.
            </p>
          </div>
        )}
      </main>

      <footer className="pb-5 text-center flex-shrink-0">
        <Link to="/" className="text-[12px] transition hover:opacity-80" style={{ color: "#a1a1a6" }}>
          back to the gallery
        </Link>
      </footer>
    </div>
  );
}
