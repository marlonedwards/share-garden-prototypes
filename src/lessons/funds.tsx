import { useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 4 · Funds. The tripler you always miss; one purchase that owns
// everything; diversification as survival; the honest cost of picking.
// Standards: CEE Investing 8-5b (diversified fund versus individual stocks);
// CEE Investing 8-5a (diversification within and among asset classes).
// Screen 2 draws on the 9-12 ladder: active professional management usually
// trails the plain index over long runs.
// W2-funds deepening of the W1 port: 7 screens, 5 stages, 2 check items.

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
// One-word column labels for the tight comparison table on small screens.
const FUND_SHORT = ["Everything", "Fruit", "Colossus", "Router", "Chipworks", "Cola", "Bandage", "Oil"];
const FUND_TRIPLER = 4;   // Chipworks
const FUND_FLOP_IDX = 2;  // Colossus Software
const FUND_FLOP_PCT = 24; // magnitude of the flop's fall
const FUND_AVG = 28;
// The flop's cost to the fund: one slice of eight, so 24 / 8 = 3 points.
const FUND_FLOP_COST = FUND_FLOP_PCT / FUND_CAST.length;
// What the seven non-triplers averaged this year: (15+31-24-8+8+4-12)/7 = +2.
const OTHERS_AVG = Math.round(
  FUND_RESULTS.filter((_, i) => i !== FUND_TRIPLER).reduce((a, b) => a + b, 0) /
  (FUND_RESULTS.length - 1)
);

// Two earlier finished years for the moving-tripler stage. Each year has
// exactly one company at roughly triple (+200 or more), a different one each
// time, and each row averages to a clean fund return (+32%, then +30%, then
// this year's +28%). The numbers are tuned so that NO single company's
// three-year road beats the fund's (best single road: Fruit Computers at
// $205 versus the fund's $220 from $100), which the reveal copy states, so
// the claim is arithmetically true, not rhetorical.
const RUN_A = [215, 26, 18, -30, -35, 11, 29, 22];  // three years ago, avg +32
const RUN_B = [-45, 24, 21, 205, -30, 17, 26, 22];  // two years ago, avg +30
const THREE_YEARS = [
  { label: "Three years ago", results: RUN_A, avg: 32, tripler: 0 },
  { label: "Two years ago", results: RUN_B, avg: 30, tripler: 3 },
  { label: "This year", results: FUND_RESULTS, avg: FUND_AVG, tripler: FUND_TRIPLER },
];

function growHundred(returns: number[]): number {
  return Math.round(returns.reduce((v, r) => v * (1 + r / 100), 100));
}

// ---- screen 1 stage: the year is over; turn the finished board face up.
// Backward-looking on purpose: the player reveals a result that already
// happened, and is never asked to forecast or rewarded for a lucky first tap.

function RevealBoardStage({ onComplete }: StageProps) {
  const [first, setFirst] = useState<number | null>(null);
  const revealed = first !== null;
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4 max-w-lg">
      <p className="text-[13px] font-medium">Every result is face down. Tap any company, and the whole board turns face up.</p>
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
            <span className="text-[12px] text-center leading-tight" style={{ color: SUB }}>{c.name}</span>
            <span className="text-[12px] font-semibold tnum"
              style={{ color: FUND_RESULTS[i] >= 0 ? "#248a3d" : "#d70015", visibility: revealed ? "visible" : "hidden" }}>
              {FUND_RESULTS[i] > 0 ? "+" : ""}{FUND_RESULTS[i]}%
            </span>
          </button>
        ))}
      </div>
      {revealed && (
        <div className="pop-in">
          <div className="mt-3 flex items-baseline gap-5">
            <div>
              <div className="text-[12px]" style={{ color: SUB }}>{FUND_CAST[FUND_TRIPLER].name}</div>
              <div className="text-[21px] font-semibold tnum" style={{ color: "#248a3d" }}>+{FUND_RESULTS[FUND_TRIPLER]}%</div>
            </div>
            <div>
              <div className="text-[12px]" style={{ color: SUB }}>The other seven, averaged</div>
              <div className="text-[21px] font-semibold tnum">+{OTHERS_AVG}%</div>
            </div>
          </div>
          <p className="text-[12.5px] mt-2" style={{ color: "#3a3a3c" }}>
            {first === FUND_TRIPLER
              ? `You tapped ${FUND_CAST[FUND_TRIPLER].name}, this year's tripler. Tapping it did not make it triple: the year was finished before you touched the board, and before the year began nothing marked it out.`
              : `The card you tapped finished at ${FUND_RESULTS[first!] > 0 ? "+" : ""}${FUND_RESULTS[first!]}%, while ${FUND_CAST[FUND_TRIPLER].name} tripled. On a finished board the tripler is easy to see, and before the year began nothing marked it out.`}
          </p>
        </div>
      )}
    </div>
  );
}

// ---- screen 2 stage: ten professional report cards, turned over at once.
// The SPIVA-style fact in plain words: scorekeepers who compare professional
// stock-picking funds with the plain index find that, over fifteen-year runs,
// roughly nine funds in ten finish behind it (SPIVA U.S. Scorecard,
// large-cap funds versus the S&P 500). Deterministic: card 7 is the one ahead.

const PRO_AHEAD_IDX = 6;

function ProScoreStage({ onComplete }: StageProps) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4 max-w-lg">
      <p className="text-[13px] font-medium">
        Ten teams of professional pickers are on the board, and each team spent the same fifteen years choosing stocks.
      </p>
      <div className="mt-2.5 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => {
          const ahead = i === PRO_AHEAD_IDX;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-full rounded-lg border text-center py-2 transition-all duration-300"
                style={{
                  transitionDelay: `${i * 60}ms`,
                  background: !flipped ? "#e8e8ed" : ahead ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.10)",
                  borderColor: !flipped ? "rgba(0,0,0,0.08)" : ahead ? "rgba(36,138,61,0.45)" : "rgba(215,0,21,0.30)",
                }}>
                <span className="text-[12px] font-semibold"
                  style={{ color: !flipped ? "#a1a1a6" : ahead ? "#248a3d" : "#d70015" }}>
                  {flipped ? (ahead ? "Ahead" : "Behind") : "· · ·"}
                </span>
              </div>
              <span className="text-[12px]" style={{ color: SUB }}>Pro {i + 1}</span>
            </div>
          );
        })}
      </div>
      {!flipped ? (
        <button
          onClick={() => { setFlipped(true); onComplete(); }}
          className="mt-3 text-[12.5px] font-medium px-4 py-2 rounded-full text-white"
          style={{ background: ACCENT }}>
          Turn over all ten report cards
        </button>
      ) : (
        <div className="pop-in">
          <div className="mt-3">
            <div className="text-[21px] font-semibold tnum">9 of 10</div>
            <div className="text-[12px]" style={{ color: SUB }}>teams finished behind the plain market average</div>
          </div>
          <p className="text-[12.5px] mt-2" style={{ color: "#3a3a3c" }}>
            The scorekeepers find close to that split every time they check, once the run gets
            long, and the one team that finished ahead was not marked out in advance.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- screen 3 stage: the fused marble that will not open

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
            One fused marble holds all eight companies, tripler included. It is sealed shut. Give
            it a shake and try to pull one color back out.
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

// ---- screen 5 stage: find the flop, the fund barely feels it

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
              <span className="text-[12px] text-center leading-tight" style={{ color: SUB }}>{c.name}</span>
            </button>
          );
        })}
      </div>
      {tapped ? (
        <div className="pop-in">
          <div className="mt-3 flex items-baseline gap-5">
            <div>
              <div className="text-[12px]" style={{ color: SUB }}>Held on its own</div>
              <div className="text-[21px] font-semibold tnum" style={{ color: "#d70015" }}>-{FUND_FLOP_PCT}%</div>
            </div>
            <div>
              <div className="text-[12px]" style={{ color: SUB }}>Cost to the fund's +{FUND_AVG}</div>
              <div className="text-[21px] font-semibold tnum">-{FUND_FLOP_COST} points</div>
            </div>
          </div>
          <p className="text-[12.5px] mt-2" style={{ color: "#3a3a3c" }}>
            Alone, that bet loses a quarter of the money. Inside the fund it is one slice of
            eight, and the other seven carry it.
          </p>
        </div>
      ) : miss !== null ? (
        <p key={miss} className="text-[12.5px] mt-2 pop-in" style={{ color: "#3a3a3c" }}>
          That marble is {FUND_CAST[miss].name}, and it is not the one. {FUND_CAST[FUND_FLOP_IDX].name} is
          still on the board.
        </p>
      ) : null}
    </div>
  );
}

// ---- screen 6 stage: the moving tripler across three finished years.
// The player looks BACKWARD at three years that already happened and asks
// which single company Jordan could have held the whole way. Every road is
// shown honestly; the best single road still finishes behind the fund, and
// the numbers above are tuned so that sentence is literally true.

function MovingTriplerStage({ onComplete }: StageProps) {
  const [pick, setPick] = useState<number | null>(null);
  const fundFinal = growHundred(THREE_YEARS.map((y) => y.avg));
  const triplerNames = THREE_YEARS.map((y) => FUND_CAST[y.tripler].name);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-4 max-w-lg">
      <p className="text-[13px] font-medium">
        Three years are finished. Tap the one company Jordan would have held the whole way.
      </p>
      <div className="mt-2.5 grid grid-cols-4 sm:grid-cols-8 gap-x-2 sm:gap-x-1.5 gap-y-1.5">
        {FUND_CAST.map((c, i) => (
          <button key={c.name}
            onClick={() => { setPick(i); onComplete(); }}
            className="flex flex-col items-center gap-0.5"
            aria-label={c.name}
            title={c.name}>
            <span className="w-8 h-8 rounded-full transition"
              style={{
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), ${c.color}66 55%, ${c.color}cc)`,
                boxShadow: pick === i ? `0 0 0 3px ${ACCENT}` : "inset 0 0 0 1px rgba(30,45,80,0.12)",
              }} />
            <span className="text-[12px] text-center leading-tight" style={{ color: SUB }}>{FUND_SHORT[i]}</span>
          </button>
        ))}
      </div>
      {pick !== null && (
        <div className="pop-in" key={pick}>
          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-[12px] tnum">
            <span className="font-medium" style={{ color: SUB }}></span>
            <span className="font-medium text-right" style={{ color: SUB }}>{FUND_CAST[pick].name}</span>
            <span className="font-medium text-right" style={{ color: SUB }}>The fund</span>
            {THREE_YEARS.map((y) => (
              <div key={y.label} className="contents">
                <span style={{ color: SUB }}>
                  {y.label}{y.tripler === pick ? " (its triple)" : ""}
                </span>
                <span className="text-right font-semibold"
                  style={{ color: y.results[pick] >= 0 ? "#248a3d" : "#d70015" }}>
                  {y.results[pick] > 0 ? "+" : ""}{y.results[pick]}%
                </span>
                <span className="text-right font-semibold" style={{ color: "#248a3d" }}>
                  +{y.avg}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-baseline gap-5">
            <div>
              <div className="text-[12px]" style={{ color: SUB }}>$100 in {FUND_CAST[pick].name}</div>
              <div className="text-[21px] font-semibold tnum">${growHundred(THREE_YEARS.map((y) => y.results[pick]))}</div>
            </div>
            <div>
              <div className="text-[12px]" style={{ color: SUB }}>$100 in the fund</div>
              <div className="text-[21px] font-semibold tnum" style={{ color: ACCENT }}>${fundFinal}</div>
            </div>
          </div>
          <p className="text-[12.5px] mt-2" style={{ color: "#3a3a3c" }}>
            The tripler moved: {triplerNames[0]} first, then {triplerNames[1]}, then {triplerNames[2]}.
            The fund held all three. Try every company, and not one road finishes ahead of the marble.
          </p>
        </div>
      )}
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
      eyebrow: "Funds · The finished board",
      definition: "Stock picking is trying to choose in advance the few companies that will beat all the rest.",
      story:
        "Jordan owns one piece of one company, his share of Maya's lemonade stand, and now he wants a bigger board. He studied these eight far larger companies before the year began, certain he could spot the winner. The year has now finished, and every result is waiting on the board.",
      stage: RevealBoardStage,
      gated: true,
    },
    {
      // CEE 9-12 ladder: active management usually trails the index over long
      // runs. SPIVA-style fact stated in plain words on this screen.
      eyebrow: "Funds · The professionals",
      definition: "Most professional stock pickers earn less than the market's plain average over long runs.",
      story:
        "Picking is hard even for people who do it all day. Professional stock pickers have research teams, company visits, and screens full of numbers. Scorekeepers compare their long results with the plain market average, and the report cards from one long run are in.",
      stage: ProScoreStage,
      gated: true,
    },
    {
      eyebrow: "Funds · One purchase",
      definition: "An index fund is one purchase that buys a small piece of many companies at once.",
      story:
        "Instead of choosing, Jordan can buy all eight inside a single sealed marble. The tripler is in there, and so is the flop. Nobody can crack the marble open to chase one color.",
      stage: FusedStage,
      gated: true,
    },
    {
      eyebrow: "Prove it · Index fund",
      definition: "A fund hands back the average of everything sealed inside it, winners and losers together.",
      story:
        "This year the eight results, best and worst together, averaged a gain of 28 percent, so the sealed marble grew by exactly that much. Answer one question to clear the index fund marble in your field guide.",
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
    {
      eyebrow: "Funds · The flop",
      definition: "Diversification means spreading your money across many holdings so that one failure cannot sink you.",
      story:
        "One of the eight had a miserable year, the worst result on the board. Jordan owns it inside the sealed marble, so the damage has already happened. The question is what the fall cost him.",
      stage: FlopStage,
      gated: true,
    },
    {
      eyebrow: "Funds · The moving tripler",
      definition: "A fund never misses a winner on its list, because it already owns every company on that list.",
      story:
        "The tripler was a different company in each of the last three finished years. Pick the one company Jordan could have held the whole time, then set his road beside the fund's.",
      stage: MovingTriplerStage,
      gated: true,
    },
    {
      eyebrow: "Prove it · Diversification",
      definition: "Spreading wide is what keeps an investor standing when a single bet fails.",
      story:
        "Maya's stand is Jordan's only piece of a single company, so one rained-out summer would touch everything he owns there. Inside a fund of eight, one bad year at one company is one slice of the story. Answer one more question to clear the diversification marble in your field guide.",
      // CEE Investing 8-5a; concept: diversification
      check: {
        id: "learn-funds-2",
        concept: "diversification",
        prompt: "One company inside a fund of eight loses a quarter of its value. What happens to the whole fund?",
        options: [
          "It loses about a quarter too",
          "It slips only a few points, because the other seven carry it",
          "It cannot fall at all",
          "It drops the loser and replaces it with a winner",
        ],
        answer: 1,
        explain:
          "The loss is real, but it is one slice of eight, so it costs the fund about 3 points. Spreading out means no single failure decides the whole story.",
      },
    },
  ],
};

export default funds;
