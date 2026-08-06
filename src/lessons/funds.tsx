import { useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 4 · Funds. The tripler you always miss; one purchase that owns
// everything; diversification as survival.
// Standards: CEE Investing 8-5b (diversified fund versus individual stocks);
// CEE Investing 8-5a (diversification within and among asset classes).
// W1 port of the original fund mini; W2-funds deepens this module in place.

const SUB = "#6e6e73";
const ACCENT = "#0071e3";

const FUND_CAST = [
  { name: "The Everything Store", color: "#ff9f0a" },
  { name: "Fruit Computers", color: "#0a84ff" },
  { name: "Colossus Software", color: "#64d2ff" },
  { name: "Router Works", color: "#bf5af2" },
  { name: "Chipworks", color: "#ffd60a" },
  { name: "Classic Cola", color: "#ff453a" },
  { name: "Bandage & Balm", color: "#30d158" },
  { name: "Giant Oil", color: "#8e8e93" },
];
// Deterministic year, fixed before anyone picks: Chipworks triples, Colossus
// Software is the flop at -24%, and the eight results average exactly +28%.
// Every screen in this lesson reads from this one table, so the story never
// contradicts itself no matter what the player chooses.
const FUND_RESULTS = [15, 31, -24, -8, 210, 8, 4, -12];
const FUND_TRIPLER = 4;   // Chipworks
const FUND_FLOP_IDX = 2;  // Colossus Software
const FUND_FLOP_PCT = 24; // magnitude of the flop's fall
const FUND_AVG = 28;

// ---- screen 1 stage: the year is over; turn the finished board face up.
// Backward-looking on purpose: the player reveals a result that already
// happened, and is never asked to forecast or rewarded for a lucky first tap.

function RevealBoardStage({ onComplete }: StageProps) {
  const [first, setFirst] = useState<number | null>(null);
  const revealed = first !== null;
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4 max-w-lg">
      <p className="text-[13px] font-medium">Every result is face down. Turn over any company first.</p>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {FUND_CAST.map((c, i) => (
          <button key={c.name} disabled={revealed}
            onClick={() => { setFirst(i); onComplete(); }}
            className="flex flex-col items-center gap-0.5">
            <span className="w-9 h-9 rounded-full transition"
              style={{
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), ${c.color}66 55%, ${c.color}cc)`,
                boxShadow: first === i ? `0 0 0 3px ${ACCENT}` : "inset 0 0 0 1px rgba(30,45,80,0.12)",
              }} />
            <span className="text-[10px] text-center leading-tight" style={{ color: SUB }}>{c.name}</span>
            <span className="text-[11px] font-semibold tnum"
              style={{ color: FUND_RESULTS[i] >= 0 ? "#248a3d" : "#d70015", visibility: revealed ? "visible" : "hidden" }}>
              {FUND_RESULTS[i] > 0 ? "+" : ""}{FUND_RESULTS[i]}%
            </span>
          </button>
        ))}
      </div>
      {revealed && (
        <p className="text-[12.5px] mt-2 pop-in" style={{ color: "#3a3a3c" }}>
          {first === FUND_TRIPLER
            ? `You turned over ${FUND_CAST[FUND_TRIPLER].name}, this year's tripler. Turning it first did not make it triple: the year was finished before you touched the board, and last January nothing marked it out.`
            : `Your first card finished at ${FUND_RESULTS[first!] > 0 ? "+" : ""}${FUND_RESULTS[first!]}%, while ${FUND_CAST[FUND_TRIPLER].name} tripled. On a finished board the tripler is easy to see, and last January nothing marked it out.`}
        </p>
      )}
    </div>
  );
}

// ---- screen 2 stage: the fused marble that will not open

function FusedStage({ onComplete }: StageProps) {
  const [shaken, setShaken] = useState(false);
  const [everShaken, setEverShaken] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-center gap-6">
        <button
          onClick={() => {
            setShaken(true);
            setEverShaken(true);
            unlockEntry("index-fund");
            onComplete();
            setTimeout(() => setShaken(false), 500);
          }}
          className="w-20 h-20 rounded-full flex-shrink-0"
          style={{
            background: "conic-gradient(from 200deg, #ff9f0a, #0a84ff 25%, #30d158 50%, #bf5af2 75%, #ff9f0a)",
            filter: "blur(0.5px)",
            boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.7), inset 0 0 0 4.5px rgba(30,45,80,0.25), 0 12px 24px -12px rgba(24,34,60,0.5)",
            animation: shaken ? "sg-shake 0.4s" : undefined,
          }}
          aria-label="The fused fund marble" />
        <style>{`@keyframes sg-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-2deg); } 75% { transform: translateX(4px) rotate(2deg); } }`}</style>
        <div className="min-w-0">
          <p className="text-[13px]" style={{ color: "#3a3a3c" }}>
            One fused marble holds all eight companies, tripler included, and it returned{" "}
            <strong className="tnum">+{FUND_AVG}%</strong> this year. It is sealed shut. Give it a
            shake and try to pull one color back out.
          </p>
          {everShaken && (
            <p className="text-[13px] mt-1.5 pop-in font-medium" style={{ color: ACCENT }}>
              It refuses. No single color comes back out.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- screen 3 stage: find the flop, the fund barely feels it

function FlopStage({ onComplete }: StageProps) {
  const [tapped, setTapped] = useState(false);
  const [miss, setMiss] = useState<number | null>(null);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4 max-w-lg">
      <p className="text-[13px] font-medium">
        {FUND_CAST[FUND_FLOP_IDX].name} fell {FUND_FLOP_PCT}% this year, the worst result of the
        eight. Find its marble and tap it.
      </p>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {FUND_CAST.map((c, i) => {
          const isFlop = i === FUND_FLOP_IDX;
          return (
            <button key={c.name} disabled={tapped}
              onClick={() => {
                if (isFlop) { setTapped(true); setMiss(null); unlockEntry("diversification"); onComplete(); }
                else setMiss(i);
              }}
              className="flex flex-col items-center gap-0.5"
              aria-label={c.name}>
              <span className="w-9 h-9 rounded-full transition"
                style={{
                  background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), ${c.color}66 55%, ${c.color}cc)`,
                  boxShadow: miss === i ? "0 0 0 2px rgba(0,0,0,0.25)" : "inset 0 0 0 1px rgba(30,45,80,0.12)",
                  opacity: tapped && isFlop ? 0.35 : 1,
                }} />
              <span className="text-[10px] text-center leading-tight" style={{ color: SUB }}>{c.name}</span>
            </button>
          );
        })}
      </div>
      {tapped ? (
        <p className="text-[12.5px] mt-2 pop-in" style={{ color: "#3a3a3c" }}>
          Alone, that bet loses a quarter of the money. Inside the fund it is one slice of eight,
          so it costs the marble about 3 points of its 28. The other seven carry it.
        </p>
      ) : miss !== null ? (
        <p key={miss} className="text-[12.5px] mt-2 pop-in" style={{ color: "#3a3a3c" }}>
          That marble is {FUND_CAST[miss].name}, and it is not the one. {FUND_CAST[FUND_FLOP_IDX].name} is
          still on the board.
        </p>
      ) : null}
    </div>
  );
}

const funds: LessonConfig = {
  id: "funds",
  title: "What a fund is",
  sub: "One purchase buys a piece of everything",
  standard: "CEE Investing 8-5a · 8-5b",
  marble: { concept: "index-fund", color: "#bf5af2" },
  screens: [
    {
      eyebrow: "Basics 4 · Funds",
      definition: "Stock picking is trying to choose in advance the few companies that will beat all the rest.",
      story:
        "Jordan studied these eight companies last January, sure he could spot the winner, and the year has now played out. One of the eight roughly triples each year, and even professional pickers usually earn less than the market's plain average over long stretches. Turn over one result, then read the board.",
      stage: RevealBoardStage,
      gated: true,
    },
    {
      eyebrow: "Basics 4 · Funds",
      definition: "An index fund is one purchase that buys a small piece of many companies at once.",
      story:
        "Instead of choosing, Jordan can buy all eight inside a single sealed marble. The tripler is in there, and so is the flop, and he collects the average of everything. Nobody can crack the marble open to chase one color.",
      stage: FusedStage,
      gated: true,
    },
    {
      eyebrow: "Basics 4 · Funds",
      definition: "Diversification means spreading your money across many holdings so that one failure cannot sink you.",
      story:
        "Spreading out will never make Jordan the biggest winner in the room. It is what keeps him in the game long enough to have a winner at all. Find this year's flop and see what it does to the whole marble.",
      stage: FlopStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "A fund's return is simply the average of every company sealed inside it.",
      story:
        "Jordan's marble carried the whole cast through the year, best and worst together. Answer one question to clear the index fund marble in your field guide.",
      // CEE Investing 8-5b; concept: index-fund
      check: {
        id: "learn-funds-1",
        concept: "index-fund",
        prompt: "Jordan buys the fund instead of picking one company. What does the fund actually deliver?",
        options: [
          "The best performer's result",
          "The average of everything inside it, winners included",
          "A promise that the money cannot shrink",
          "A win over the stock pickers every year",
        ],
        answer: 1,
        explain:
          "The tripler and the flop both sit inside the marble. Jordan collects the middle, and he never misses the winner entirely.",
      },
    },
  ],
};

export default funds;
