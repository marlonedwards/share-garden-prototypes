import { useRef, useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 2 · Savings. Interest is the bank paying you to wait; compounding is
// the curve that bends; emergency money lives here, not in the market.
// Standards: CEE Saving 8-1 (reasons people save); CEE Investing 8-7
// (compounding rewards regular, patient saving); the inflation check reaches
// into the CEE Investing 12-4 ladder (real versus nominal, taught as buying
// power).
// W2-savings build: seven screens, five stages, two checks. The lesson's two
// marbles are "compounding" (entry added to src/lib/fieldGuide.ts with this
// lesson) and "inflation" (reinforced from Basics 1).
// Time is relative on purpose: no calendar years appear anywhere.

const SUB = "#6e6e73";
const ACCENT = "#0071e3";

// One rate pair for the whole lesson, stated in the copy where it matters:
// the bank pays 4% a year, and on the inflation screen prices rise 3% a year.
const RATE = 0.04;
const INFLATION = 0.03;

// ---- screen 1 stage: collect one year of interest

function InterestStage({ onComplete }: StageProps) {
  const [collected, setCollected] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[12px]" style={{ color: SUB }}>The savings account</div>
          <div className="text-[22px] font-semibold tnum">{collected ? "$104.00" : "$100.00"}</div>
        </div>
        <div>
          <div className="text-[12px]" style={{ color: SUB }}>The jar next door</div>
          <div className="text-[22px] font-semibold tnum" style={{ color: SUB }}>$100.00</div>
        </div>
      </div>
      {collected && (
        <p className="text-[13px] mt-3 pop-in" style={{ color: "#3a3a3c" }}>
          The bank paid Maya <strong className="tnum">$4.00</strong> for waiting one year. The jar
          paid her nothing for the same wait.
        </p>
      )}
      <button
        onClick={() => { setCollected(true); onComplete(); }}
        disabled={collected}
        className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white disabled:opacity-40"
        style={{ background: ACCENT }}>
        {collected ? "Interest collected" : "Wait one year and collect the interest"}
      </button>
    </div>
  );
}

// ---- screen 2 stage: simple versus compound, the curve that bends

const YEARS_MAX = 30;

function simpleAt(y: number): number { return 100 + 100 * RATE * y; }
function compoundAt(y: number): number { return 100 * Math.pow(1 + RATE, y); }

function CurveStage({ onComplete }: StageProps) {
  const [year, setYear] = useState(0);
  // Meeting the concept unlocks its field-guide card once, on the first drag,
  // not on every onChange tick.
  const unlocked = useRef(false);
  // A wide, flat chart, so the whole stage fits a 1280x720 window with the
  // shell's Continue still on screen.
  const W = 360, H = 76, PAD = 8;
  const maxV = compoundAt(YEARS_MAX);
  const x = (y: number) => PAD + (y / YEARS_MAX) * (W - 2 * PAD);
  const yPix = (v: number) => H - PAD - ((v - 100) / (maxV - 100)) * (H - 2 * PAD);
  // Each line is drawn only up to the slider's year, so the bend reveals
  // itself as the player drags instead of being on screen from the start.
  const pts = (f: (y: number) => number, upTo: number) =>
    Array.from({ length: upTo + 1 }, (_, i) => `${x(i).toFixed(1)},${yPix(f(i)).toFixed(1)}`).join(" ");
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">Years of waiting</span>
        <span className="text-[20px] font-semibold tnum">{year}</span>
      </div>
      <input type="range" min={0} max={YEARS_MAX} step={1} value={year}
        onChange={(e) => {
          const y = parseInt(e.target.value, 10);
          setYear(y);
          if (!unlocked.current) {
            unlocked.current = true;
            unlockEntry("compounding");
          }
          if (y >= 20) onComplete();
        }}
        className="w-full mt-2" aria-label="Years of waiting" />
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-1" aria-hidden="true">
        <polyline points={pts(simpleAt, year)} fill="none" stroke="#c7c7cc" strokeWidth="2" />
        <polyline points={pts(compoundAt, year)} fill="none" stroke={ACCENT} strokeWidth="2.5" />
        <circle cx={x(year)} cy={yPix(simpleAt(year))} r="3.5" fill="#c7c7cc" />
        <circle cx={x(year)} cy={yPix(compoundAt(year))} r="4" fill={ACCENT} />
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[12px]" style={{ color: SUB }}>Straight line: simple interest</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: SUB }}>
            ${simpleAt(year).toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-[12px]" style={{ color: SUB }}>Bending curve: compound interest</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: ACCENT }}>
            ${compoundAt(year).toFixed(0)}
          </div>
        </div>
      </div>
      <p className="text-[12.5px] mt-1.5" style={{ color: SUB }}>
        Drag to year twenty and watch the gap between the two numbers grow.
      </p>
    </div>
  );
}

// ---- screen 3 stage: the back-loaded curve, one reveal per ten-year stretch

const STRETCHES = [
  { label: "Years 1 to 10", earned: Math.round(compoundAt(10) - 100) },
  { label: "Years 11 to 20", earned: Math.round(compoundAt(20) - compoundAt(10)) },
  { label: "Years 21 to 30", earned: Math.round(compoundAt(30) - compoundAt(20)) },
];

function StretchStage({ onComplete }: StageProps) {
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);
  const reveal = (i: number) => {
    const next = revealed.map((v, j) => (j === i ? true : v));
    setRevealed(next);
    if (next.every(Boolean)) onComplete();
  };
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="grid grid-cols-3 gap-2 text-center">
        {STRETCHES.map((s, i) => (
          <button key={s.label} onClick={() => reveal(i)} disabled={revealed[i]}
            className="rounded-xl border px-2 py-3 transition"
            style={{
              background: revealed[i] ? "#fafafc" : "#fff",
              borderColor: revealed[i] ? "rgba(0,113,227,0.35)" : "rgba(0,0,0,0.1)",
              cursor: revealed[i] ? "default" : "pointer",
            }}>
            <div className="text-[12px] tnum" style={{ color: SUB }}>{s.label}</div>
            {revealed[i] ? (
              <div className="text-[20px] font-semibold tnum pop-in" style={{ color: ACCENT }}>
                +${s.earned}
              </div>
            ) : (
              <div className="text-[20px] font-semibold" style={{ color: "#d2d2d7" }}>?</div>
            )}
          </button>
        ))}
      </div>
      <p className="text-[12.5px] mt-3" style={{ color: SUB }}>
        {revealed.every(Boolean)
          ? "The account, its 4% rate, and Maya's deposit never changed, yet each stretch out-earned the one before it."
          : "Reveal all three stretches to see what each one earned."}
      </p>
    </div>
  );
}

// ---- screen 4 stage: interest versus the quiet leak, buying power side by side

const YEARS_LEAK = 8;

function jarPowerAt(y: number): number { return 100 / Math.pow(1 + INFLATION, y); }
function acctPowerAt(y: number): number { return (100 * Math.pow(1 + RATE, y)) / Math.pow(1 + INFLATION, y); }

function KeepUpStage({ onComplete }: StageProps) {
  const [year, setYear] = useState(0);
  // Reinforcing a Basics 1 concept still opens its card for anyone who
  // arrived here first; unlockEntry is a no-op when it is already open.
  const unlocked = useRef(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">Years of rising prices</span>
        <span className="text-[20px] font-semibold tnum">{year}</span>
      </div>
      <input type="range" min={0} max={YEARS_LEAK} step={1} value={year}
        onChange={(e) => {
          const y = parseInt(e.target.value, 10);
          setYear(y);
          if (!unlocked.current) {
            unlocked.current = true;
            unlockEntry("inflation");
          }
          if (y >= YEARS_LEAK) onComplete();
        }}
        className="w-full mt-2" aria-label="Years of rising prices" />
      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[12px]" style={{ color: SUB }}>What the jar still buys</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: year > 0 ? "#d70015" : undefined }}>
            ${jarPowerAt(year).toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-[12px]" style={{ color: SUB }}>What the account still buys</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: ACCENT }}>
            ${acctPowerAt(year).toFixed(0)}
          </div>
        </div>
      </div>
      <p className="text-[12.5px] mt-3" style={{ color: SUB }}>
        In this stretch the bank pays 4% a year while prices rise 3% a year. Drag to year eight.
      </p>
    </div>
  );
}

// ---- screen 5 stage: where does emergency money live, one card, three tabs

const HOMES = {
  jar: ["The jar", "The freezer money is safe from crashes here, but inflation nibbles it every year while it waits."],
  savings: ["The savings account", "The money stays reachable, earns interest while it waits, and no market day can shrink it. This is the right home."],
  market: ["The market", "The week the freezer breaks could be the week prices are down 30%, and Maya would have to sell at the worst moment."],
} as const;

function EmergencyStage({ onComplete }: StageProps) {
  const [shown, setShown] = useState<keyof typeof HOMES | null>(null);
  const [tried, setTried] = useState<{ jar: boolean; savings: boolean; market: boolean }>({
    jar: false, savings: false, market: false,
  });
  const tryHome = (k: keyof typeof HOMES) => {
    setShown(k);
    const next = { ...tried, [k]: true };
    setTried(next);
    if (next.jar && next.savings && next.market) onComplete();
  };
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex gap-2 flex-wrap">
        {(["jar", "savings", "market"] as const).map((k) => (
          <button key={k} onClick={() => tryHome(k)}
            className="text-[13px] font-medium rounded-full px-4 py-2 border transition"
            style={shown === k
              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
              : { background: "#fff", borderColor: "rgba(0,0,0,0.1)" }}>
            {HOMES[k][0]}
          </button>
        ))}
      </div>
      <div className="mt-3 min-h-[62px]">
        {shown ? (
          <p key={shown} className="text-[13px] pop-in" style={{ color: "#3a3a3c" }}>{HOMES[shown][1]}</p>
        ) : (
          <p className="text-[13px]" style={{ color: SUB }}>Try all three homes.</p>
        )}
      </div>
    </div>
  );
}

const savings: LessonConfig = {
  id: "savings",
  title: "What savings do",
  sub: "The bank pays you to wait",
  standard: "CEE Saving 8-1 · Investing 8-7",
  marble: { concept: "compounding", color: "#ffd60a" },
  screens: [
    {
      eyebrow: "Basics 2 · Savings",
      definition: "Interest is money the bank pays you for letting it hold your cash.",
      story:
        "Maya moves her jar money into a savings account that pays 4% a year. The bank is not being generous. It lends her money out and hands her a slice of what the lending earns. Collect her first year of interest below.",
      stage: InterestStage,
      gated: true,
    },
    {
      eyebrow: "Basics 2 · Savings",
      definition: "Compounding is interest earning interest of its own.",
      story:
        "In year one, Maya's $100 earns $4. Simple interest is interest paid only on that first $100, so it adds the same $4 every year. Compounding pays on the interest too: in year two the bank pays on the whole $104, so the payment grows without her adding a dime. Drag the years and watch the straight line fall behind the bending curve.",
      stage: CurveStage,
      gated: true,
    },
    {
      eyebrow: "Basics 2 · Savings",
      definition: "Compound growth speeds up over time, so the last years of waiting pay the most.",
      story:
        "Jordan expects each stretch of waiting to pay the same. Maya opens the books, and the untouched account earned more in every stretch than the one before. Reveal what each ten years of waiting paid her.",
      stage: StretchStage,
      gated: true,
    },
    {
      eyebrow: "Basics 2 · Savings",
      definition: "Interest gives saved money a way to keep up when prices rise.",
      story:
        "Remember the jar, whose number never moved while sneaker prices crept up. Maya's account earns while prices climb, so its buying power can hold its ground here. In some years banks pay less than prices rise, and then even saved money buys a little less. Drag the years and compare what each hundred still buys.",
      stage: KeepUpStage,
      gated: true,
    },
    {
      eyebrow: "Basics 2 · Savings",
      definition: "An emergency fund is money set aside for surprises, and it lives in savings, not in the market.",
      story:
        "Jordan asks why Maya does not put every dollar to work. Maya's answer is the freezer breaking in July. Money she might need this year has to stay somewhere a bad market month cannot shrink it. Try each home for the freezer money.",
      stage: EmergencyStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "Money left in savings grows faster each year, because every payment starts earning too.",
      story:
        "Maya's bank pays her on last year's interest as well as on the money she put in. Answer one question to clear the compounding marble in your field guide.",
      // CEE Investing 8-7; concept: compounding (entry lives in src/lib/fieldGuide.ts)
      check: {
        id: "learn-savings-1",
        concept: "compounding",
        prompt: "In year two, the bank pays Maya interest on her interest. What is that called?",
        options: [
          "Compounding",
          "Simple interest",
          "Inflation",
          "A withdrawal",
        ],
        answer: 0,
        explain:
          "That growing payment is compounding at work. Left alone, each year's interest joins the pile and starts earning with it.",
      },
    },
    {
      eyebrow: "Prove it",
      definition: "A dollar that earns nothing has no answer when prices rise.",
      story:
        "Jordan likes the shoebox because no crash can touch it. Maya has counted a jar for eight years and knows the quieter danger. One last question finishes the lesson.",
      // CEE Saving 8-1, reaching into the Investing 12-4 ladder; concept:
      // inflation (reinforced from Basics 1 · Cash)
      check: {
        id: "learn-savings-2",
        concept: "inflation",
        prompt: "Jordan's emergency shoebox sat closed for eight years while prices rose. What happened to the money inside?",
        options: [
          "Its number and its buying power both stayed the same",
          "Its number stayed the same while its buying power shrank",
          "Its number shrank while prices stayed the same",
          "It earned interest for waiting",
        ],
        answer: 1,
        explain:
          "A shoebox pays nothing for the wait. The number held still while prices climbed, so the same bills bought less. In a savings account, interest gives that money a fighting chance to keep up.",
      },
    },
  ],
};

export default savings;
