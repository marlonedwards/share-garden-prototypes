import { useRef, useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 1 · Cash. What money does, cash as the number that never moves,
// inflation as the quiet leak, and why safe from crashes is not safe.
// Standards: CEE Saving 8-1 (reasons people save); CEE Investing 12-4 ladder
// (real versus nominal return, taught here as buying power).
// W2 deepening of the W1 port: 7 screens, 5 stages, 2 check items, both
// clearing the "inflation" marble. All time phrasing is relative; no calendar
// years appear anywhere in this module. Deterministic: no randomness.

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const ACCENT = "#0071e3";

// Whole-dollar money, so every number in a row wears the same format.
const fmtWhole = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ---- screen 1 stage: walk one dollar from the lemonade stand to the bakery.
// Money's job on one screen: it carries value from a sale now to a purchase
// later. Two taps, three tiles, each lighting as the dollar arrives.

const TRADE_TILES = [
  { key: "cup", label: "A cup sold" },
  { key: "dollar", label: "One dollar" },
  { key: "bread", label: "Bread, later" },
] as const;

function TradeGlyph({ kind, lit }: { kind: (typeof TRADE_TILES)[number]["key"]; lit: boolean }) {
  const stroke = lit ? INK : "#c7c7cc";
  const fill = lit ? "rgba(0,113,227,0.10)" : "#fafafc";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      {kind === "cup" && (
        <>
          <path d="M13 12 h18 l-3 22 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 z" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <line x1="24" y1="12" x2="30" y2="4" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {kind === "dollar" && (
        <>
          <rect x="6" y="13" width="32" height="18" rx="3" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <circle cx="22" cy="22" r="5.5" fill="none" stroke={stroke} strokeWidth="1.4" />
          <text x="22" y="25.5" textAnchor="middle" fontSize="9" fontWeight="700" fill={stroke}>$</text>
        </>
      )}
      {kind === "bread" && (
        <path d="M8 30 q0 -14 14 -14 q14 0 14 14 a3 3 0 0 1 -3 3 h-22 a3 3 0 0 1 -3 -3 z" fill={fill} stroke={stroke} strokeWidth="1.6" />
      )}
    </svg>
  );
}

function TradeStage({ onComplete }: StageProps) {
  // 0 = only the cup is lit, 1 = the dollar arrived, 2 = the bread is bought.
  const [stepIdx, setStepIdx] = useState(0);
  const advance = () => {
    const next = Math.min(stepIdx + 1, 2);
    setStepIdx(next);
    if (next >= 2) onComplete();
  };
  const captions = [
    "Maya hands over the cup and the dollar comes back.",
    "The dollar waits in her pocket. It does not spoil, and it does not melt.",
    "Next week the bakery accepts the same dollar for a loaf of bread.",
  ];
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {TRADE_TILES.map((t, i) => (
          <div key={t.key} className="flex items-center gap-2 sm:gap-4">
            {i > 0 && (
              <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true">
                <path d="M2 6 h13 m-4 -4 l4 4 l-4 4" fill="none"
                  stroke={stepIdx >= i ? ACCENT : "#d2d2d7"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <div className="flex flex-col items-center gap-1">
              <TradeGlyph kind={t.key} lit={stepIdx >= i} />
              <span className="text-[11px]" style={{ color: stepIdx >= i ? INK : "#c7c7cc" }}>{t.label}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[13px] mt-3 pop-in" key={stepIdx} style={{ color: "#3a3a3c" }}>
        {captions[stepIdx]}
      </p>
      <button
        onClick={advance}
        disabled={stepIdx >= 2}
        className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white disabled:opacity-40"
        style={{ background: ACCENT }}>
        {stepIdx === 0 ? "Sell the cup" : stepIdx === 1 ? "Spend it at the bakery" : "The trade is done"}
      </button>
    </div>
  );
}

// ---- screen 2 stage: count the jar today, then years later, then years
// after that. Time is relative on purpose: no calendar years appear anywhere.

const JAR_MOMENTS = ["Today", "Four years later", "Eight years later"];

function JarStage({ onComplete }: StageProps) {
  const [counts, setCounts] = useState(0);
  const moment = JAR_MOMENTS[Math.min(counts, JAR_MOMENTS.length) - 1];
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-center gap-5">
        <svg width="72" height="88" viewBox="0 0 72 88" aria-hidden="true" className="flex-shrink-0">
          <rect x="14" y="4" width="44" height="10" rx="3" fill="#d8dade" />
          <path d="M12 16 h48 v56 a12 12 0 0 1 -12 12 h-24 a12 12 0 0 1 -12 -12 z"
            fill="rgba(238,243,250,0.7)" stroke="rgba(30,45,80,0.18)" strokeWidth="1.5" />
          <text x="36" y="52" textAnchor="middle" fontSize="15" fontWeight="700" fill={INK} className="tnum">$100</text>
        </svg>
        <div className="min-w-0">
          {counts === 0 ? (
            <p className="text-[13.5px]" style={{ color: "#3a3a3c" }}>
              The jar is on the counter. Count it whenever you like.
            </p>
          ) : (
            <p className="text-[13.5px] pop-in" key={counts} style={{ color: "#3a3a3c" }}>
              {moment}, the jar holds exactly <strong className="tnum">$100</strong>.
              {counts >= JAR_MOMENTS.length
                ? " Eight years of counting, and the number has never moved once."
                : " The number is the same as the day it went in."}
            </p>
          )}
          <button
            onClick={() => {
              const next = counts + 1;
              setCounts(next);
              if (next >= JAR_MOMENTS.length) onComplete();
            }}
            disabled={counts >= JAR_MOMENTS.length}
            className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white disabled:opacity-40"
            style={{ background: ACCENT }}>
            {counts === 0 ? "Count the jar" : counts >= JAR_MOMENTS.length ? "Counted three times" : "Count it again, years later"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- screen 3 stage: the quiet leak, richer. The years slider drives three
// things at once: the sneaker price tag, the pairs the jar can carry home
// (with a pair visually fading out), and a jar whose printed number stays
// $100 while its buying-power level drains. Sneakers start at $40 and rise
// 4.5 percent a year, so the second pair drops away at year six.

const LEAK_BASE = 40;
const LEAK_RATE = 1.045;
const LEAK_MAX_YEARS = 8;

function leakPrice(year: number): number {
  return Math.round(LEAK_BASE * Math.pow(LEAK_RATE, year));
}

function SneakerGlyph({ faded }: { faded: boolean }) {
  return (
    <svg width="34" height="20" viewBox="0 0 34 20" aria-hidden="true"
      style={{ opacity: faded ? 0.18 : 1, transition: "opacity 300ms" }}>
      <path d="M3 14 q0 -8 6 -8 l5 0 q2 0 4 2 l4 4 q8 1 9 4 l0 1 a2 2 0 0 1 -2 2 l-24 0 a2 2 0 0 1 -2 -2 z"
        fill="rgba(0,113,227,0.12)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="10" y1="8" x2="12" y2="11" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="13" y1="7" x2="15" y2="10" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function LeakStage({ onComplete }: StageProps) {
  const [year, setYear] = useState(0);
  // Meeting the concept unlocks its field-guide card once, on the first drag,
  // not on every onChange tick.
  const unlocked = useRef(false);
  const price = leakPrice(year);
  const pairs = Math.floor(100 / price);
  // Buying power relative to day one, drawn as the jar's liquid level.
  const level = LEAK_BASE / price;
  const liquidH = Math.round(46 * level);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-center gap-5">
        <svg width="60" height="76" viewBox="0 0 60 76" aria-hidden="true" className="flex-shrink-0">
          <rect x="11" y="2" width="38" height="8" rx="3" fill="#d8dade" />
          <path d="M9 12 h42 v50 a10 10 0 0 1 -10 10 h-22 a10 10 0 0 1 -10 -10 z"
            fill="rgba(238,243,250,0.7)" stroke="rgba(30,45,80,0.18)" strokeWidth="1.5" />
          <rect x="11" y={64 - liquidH} width="38" height={liquidH} rx="4"
            fill="rgba(0,113,227,0.18)" style={{ transition: "all 300ms" }} />
          <text x="30" y="42" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={INK} className="tnum">$100</text>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium">Years in the jar</span>
            <span className="text-[20px] font-semibold tnum">{year}</span>
          </div>
          <input type="range" min={0} max={LEAK_MAX_YEARS} step={1} value={year}
            onChange={(e) => {
              const y = parseInt(e.target.value, 10);
              setYear(y);
              if (!unlocked.current) {
                unlocked.current = true;
                unlockEntry("inflation");
              }
              if (y >= LEAK_MAX_YEARS) onComplete();
            }}
            className="w-full mt-2" aria-label="Years in the jar" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>The jar says</div>
          <div className="text-[20px] font-semibold tnum">$100</div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>Sneakers, per pair</div>
          <div className="text-[20px] font-semibold tnum">{fmtWhole(price)}</div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>Pairs it buys</div>
          <div className="flex items-center justify-center gap-1 h-[30px]">
            <span className="text-[20px] font-semibold tnum">{pairs}</span>
            <SneakerGlyph faded={false} />
            <SneakerGlyph faded={pairs < 2} />
          </div>
        </div>
      </div>
      <p className="text-[12.5px] mt-3" style={{ color: year >= LEAK_MAX_YEARS ? "#d70015" : SUB }}>
        {year >= LEAK_MAX_YEARS
          ? "The jar still says $100, but it now carries home one pair of sneakers instead of two."
          : "Drag all the way to year eight and watch the level inside the jar."}
      </p>
    </div>
  );
}

// ---- screen 5 stage: the loud risk and the quiet risk, one card, two tabs

const RISKS = {
  loud: "A crash arrives and prices fall fast. The jar does not lose a single dollar, and this is the one day the jar looks like a genius.",
  quiet: "Nothing crashes. Price tags simply drift upward year after year, and the jar carries home a little less each time Maya counts it.",
} as const;

function TwoRisksStage({ onComplete }: StageProps) {
  const [shown, setShown] = useState<keyof typeof RISKS | null>(null);
  const [seen, setSeen] = useState<{ loud: boolean; quiet: boolean }>({ loud: false, quiet: false });
  const show = (k: keyof typeof RISKS) => {
    setShown(k);
    const next = { ...seen, [k]: true };
    setSeen(next);
    if (next.loud && next.quiet) onComplete();
  };
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex gap-2">
        {(["loud", "quiet"] as const).map((k) => (
          <button key={k} onClick={() => show(k)}
            className="text-[13px] font-medium rounded-full px-4 py-2 border transition"
            style={shown === k
              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
              : { background: "#fff", borderColor: "rgba(0,0,0,0.1)" }}>
            {k === "loud" ? "The loud risk" : "The quiet risk"}
          </button>
        ))}
      </div>
      <div className="mt-3 min-h-[62px]">
        {shown ? (
          <p key={shown} className="text-[13px] pop-in" style={{ color: "#3a3a3c" }}>{RISKS[shown]}</p>
        ) : (
          <p className="text-[13px]" style={{ color: SUB }}>Tap a risk to meet it. Meet both to move on.</p>
        )}
      </div>
    </div>
  );
}

// ---- screen 6 stage: sort three notes by the job each dollar has to do.
// Jar money holds its number for soon; money with years to wait needs a place
// where it can earn. Wrong picks stay pickable, with a nudge, until all three
// notes sit in the right home. Once all three are home the stage locks, so
// the player can never carry an enabled Continue away from a wrong board.

const SORT_ITEMS = [
  { label: "Bus fare for next week", home: "jar" },
  { label: "The emergency cushion", home: "jar" },
  { label: "Money with ten years to wait", home: "earn" },
] as const;

type SortHome = (typeof SORT_ITEMS)[number]["home"];

function SortStage({ onComplete }: StageProps) {
  const [picks, setPicks] = useState<(SortHome | null)[]>([null, null, null]);
  const [solved, setSolved] = useState(false);
  const pick = (i: number, home: SortHome) => {
    if (solved) return;
    const next = picks.map((p, j) => (j === i ? home : p));
    setPicks(next);
    if (SORT_ITEMS.every((it, j) => next[j] === it.home)) {
      setSolved(true);
      onComplete();
    }
  };
  const anyWrong = SORT_ITEMS.some((it, j) => picks[j] !== null && picks[j] !== it.home);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex flex-col gap-2.5">
        {SORT_ITEMS.map((it, i) => {
          const picked = picks[i];
          const right = picked === it.home;
          return (
            <div key={it.label} className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] flex-1 min-w-[140px]" style={{ color: "#3a3a3c" }}>{it.label}</span>
              {(["jar", "earn"] as const).map((h) => {
                const chosen = picked === h;
                const bg = chosen ? (right ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.10)") : "#fafafc";
                const border = chosen ? (right ? "rgba(36,138,61,0.45)" : "rgba(215,0,21,0.35)") : "rgba(0,0,0,0.08)";
                return (
                  <button key={h} onClick={() => pick(i, h)} disabled={solved}
                    className="text-[12px] font-medium rounded-full px-3 py-1.5 border transition"
                    style={{ background: bg, borderColor: border, cursor: solved ? "default" : "pointer" }}>
                    {h === "jar" ? "The jar" : "Somewhere it can earn"}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="text-[12.5px] mt-3" style={{ color: solved ? "#248a3d" : SUB }}>
        {solved
          ? "All three notes are home. Jar money waits; growing money works."
          : anyWrong
            ? "That home does not fit. Ask how soon Maya needs that one."
            : "Tap a home for each note."}
      </p>
    </div>
  );
}

const cash: LessonConfig = {
  id: "cash",
  title: "What cash does",
  sub: "The number stays while the buying power shrinks",
  standard: "CEE Saving 8-1 · Investing 12-4 ladder",
  marble: { concept: "inflation", color: "#8e8e93" },
  screens: [
    {
      eyebrow: "Basics 1 · Cash",
      definition: "Money is anything a whole community agrees to accept in trade for goods and work.",
      story:
        "Maya sells a cup of lemonade and takes home one dollar. The dollar is not lemonade, but the bakery will trade bread for it next week. Press the button under the tiles to walk the dollar from the stand to the bakery.",
      stage: TradeStage,
      gated: true,
    },
    {
      eyebrow: "Basics 1 · Cash",
      definition: "Cash is money that keeps its printed number no matter what happens around it.",
      story:
        "Maya keeps $100 of summer earnings in a jar under the counter. Nothing in the news can change that number. Count it whenever you like, in any year, and it answers with the same number.",
      stage: JarStage,
      gated: true,
    },
    {
      eyebrow: "Basics 1 · Cash",
      definition: "Inflation is the slow rise of prices that makes each dollar buy a little less.",
      story:
        "While the jar sits still, the price tags around it move. Sneakers cost $40 a pair today, and most years the tag creeps up a few percent. Drag time forward and watch what the same $100 can carry home.",
      stage: LeakStage,
      gated: true,
    },
    {
      eyebrow: "Quick check",
      definition: "A price that rises a few percent every year quietly outruns a number that never moves.",
      story:
        "Maya's jar and the sneaker shelf have been racing for eight years. Answer from what you just watched on the slider.",
      // CEE Investing 12-4 ladder (real vs nominal, as buying power); concept: inflation
      check: {
        id: "learn-cash-1",
        concept: "inflation",
        prompt: "The jar holds $100 for eight years while sneaker prices creep up. What can the jar buy at the end?",
        options: [
          "More pairs than it could on day one",
          "Exactly what it could on day one",
          "Fewer pairs than it could on day one",
          "Nothing at all",
        ],
        answer: 2,
        explain:
          "The number in the jar never changed, but every price tag around it did. That widening gap is inflation doing its quiet work.",
      },
    },
    {
      eyebrow: "Basics 1 · Cash",
      definition: "A crash is a sudden, steep fall in the prices of things people own to grow their money.",
      story:
        "Being safe from a crash is not the same as being safe from every risk. Cash faces two different dangers, and only one of them makes the news. Tap each risk below to meet it, and read which one the jar actually escapes.",
      stage: TwoRisksStage,
      gated: true,
    },
    {
      eyebrow: "Basics 1 · Cash",
      definition: "Cash does its best work on money you plan to spend soon.",
      story:
        "Maya splits her earnings by the job each dollar has to do. Some money must hold its number for next week, and some has years to wait. Sort her three notes into the right home.",
      stage: SortStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "A dollar that only sits still ends up carrying home a little less every year.",
      story:
        "Maya watched the jar for eight years while the sneaker shelf climbed the whole time. Clear the inflation marble with one more answer.",
      // CEE Saving 8-1; concept: inflation
      check: {
        id: "learn-cash-2",
        concept: "inflation",
        prompt: "Which danger to Maya's jar never shows up on the evening news?",
        options: [
          "A crash that cuts prices in half in a single week",
          "A thief walking off with the jar",
          "Price tags drifting up a few percent every year",
          "The bank closing early on a holiday",
        ],
        answer: 2,
        explain:
          "Crashes are loud and rare, and the jar shrugs them off. The drift in price tags is silent and steady, and it is the reason a jar cannot do a growing job.",
      },
    },
  ],
};

export default cash;
