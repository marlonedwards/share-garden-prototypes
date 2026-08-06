import { useRef, useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 2 · Savings. Interest is the bank paying you to wait; compounding is
// the curve that bends; emergency money lives here, not in the market.
// Standards: CEE Saving 8-1 (reasons people save); CEE Investing 8-7
// (compounding rewards regular, patient saving).
// W1 stub in full contract voice; W2-savings deepens this module and adds the
// "compounding" field-guide entry that this lesson's check clears.

const SUB = "#6e6e73";
const ACCENT = "#0071e3";

// ---- screen 1 stage: collect one year of interest

function InterestStage({ onComplete }: StageProps) {
  const [collected, setCollected] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>The savings account</div>
          <div className="text-[22px] font-semibold tnum">{collected ? "$104.00" : "$100.00"}</div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>The jar next door</div>
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
const RATE = 0.04;

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
  const pts = (f: (y: number) => number) =>
    Array.from({ length: YEARS_MAX + 1 }, (_, i) => `${x(i).toFixed(1)},${yPix(f(i)).toFixed(1)}`).join(" ");
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
        <polyline points={pts(simpleAt)} fill="none" stroke="#c7c7cc" strokeWidth="2" />
        <polyline points={pts(compoundAt)} fill="none" stroke={ACCENT} strokeWidth="2.5" />
        <circle cx={x(year)} cy={yPix(simpleAt(year))} r="3.5" fill="#c7c7cc" />
        <circle cx={x(year)} cy={yPix(compoundAt(year))} r="4" fill={ACCENT} />
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>Straight line: simple interest</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: SUB }}>
            ${simpleAt(year).toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>Bending curve: compound interest</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: ACCENT }}>
            ${compoundAt(year).toFixed(0)}
          </div>
        </div>
      </div>
      <p className="text-[12.5px] mt-1.5" style={{ color: SUB }}>
        Drag past year twenty and watch the gap between the two numbers grow.
      </p>
    </div>
  );
}

// ---- screen 3 stage: where does emergency money live, one card, three tabs

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
          <p className="text-[13px]" style={{ color: SUB }}>Tap a home to try it. Try all three to move on.</p>
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
        "Maya moves her jar money into a savings account that pays 4% a year. The bank is not being generous. It lends her money out while it waits and hands her a slice of what that lending earns. Collect her first year of interest below.",
      stage: InterestStage,
      gated: true,
    },
    {
      eyebrow: "Basics 2 · Savings",
      definition: "Compounding is interest earning interest of its own.",
      story:
        "In year one, Maya's $100 earns $4. In year two the bank pays interest on $104, not on $100, so the payment grows every year without her adding a dime. Drag the years and watch the flat line of simple interest fall behind the bending curve.",
      stage: CurveStage,
      gated: true,
    },
    {
      eyebrow: "Basics 2 · Savings",
      definition: "An emergency fund is money set aside for surprises, and it lives in savings, not in the market.",
      story:
        "Jordan asks why Maya does not put every dollar to work in other businesses. Maya's answer is the freezer breaking in July. Money she might need this year has to stay somewhere a bad market month cannot shrink it. Try each home for the freezer money.",
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
  ],
};

export default savings;
