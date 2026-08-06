import { useRef, useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 1 · Cash. What money does, and inflation as the quiet leak.
// Standards: CEE Saving 8-1 (reasons people save); CEE Investing 12-4 ladder
// (real versus nominal return, taught here as buying power).
// W1 port of the original cash mini; W2 deepens this module in place.

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const ACCENT = "#0071e3";

// Whole-dollar money, so every number in a row wears the same format.
const fmtWhole = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ---- screen 1 stage: count the jar today, then years later, then years
// after that. Time is relative on purpose: no calendar years appear anywhere.

const JAR_MOMENTS = ["Today", "Four years later", "Eight years later"];

function JarStage({ onComplete }: StageProps) {
  const [counts, setCounts] = useState(0);
  const moment = JAR_MOMENTS[Math.min(counts, JAR_MOMENTS.length) - 1];
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-center gap-5">
        <svg width="72" height="88" viewBox="0 0 72 88" aria-hidden="true">
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
            style={{ background: "#0071e3" }}>
            {counts === 0 ? "Count the jar" : counts >= JAR_MOMENTS.length ? "Counted three times" : "Count it again, years later"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- screen 2 stage: the years slider, sneakers versus the jar

function LeakStage({ onComplete }: StageProps) {
  const [year, setYear] = useState(0);
  // Meeting the concept unlocks its field-guide card once, on the first drag,
  // not on every onChange tick.
  const unlocked = useRef(false);
  const price = Math.round(50 * Math.pow(1.045, year));
  const pairs = Math.floor(100 / price);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">Years in the jar</span>
        <span className="text-[20px] font-semibold tnum">{year}</span>
      </div>
      <input type="range" min={0} max={8} step={1} value={year}
        onChange={(e) => {
          const y = parseInt(e.target.value, 10);
          setYear(y);
          if (!unlocked.current) {
            unlocked.current = true;
            unlockEntry("inflation");
          }
          if (y >= 8) onComplete();
        }}
        className="w-full mt-2" aria-label="Years in the jar" />
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>The jar</div>
          <div className="text-[20px] font-semibold tnum">$100</div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>Sneakers, per pair</div>
          <div className="text-[20px] font-semibold tnum">{fmtWhole(price)}</div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>Pairs it buys</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: pairs < 2 ? "#d70015" : INK }}>{pairs}</div>
        </div>
      </div>
      <p className="text-[12.5px] mt-3" style={{ color: SUB }}>
        Drag all the way to year eight and watch the pairs column.
      </p>
    </div>
  );
}

// ---- screen 3 stage: the loud risk and the quiet risk, one card, two tabs

const RISKS = {
  loud: "A crash arrives and prices fall fast. The jar does not lose a single dollar, and this is the one day the jar looks like a genius.",
  quiet: "Nothing crashes. Prices simply drift up a few percent every year, and the jar buys a little less each time Maya counts it.",
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

const cash: LessonConfig = {
  id: "cash",
  title: "What cash does",
  sub: "The number stays while the buying power shrinks",
  standard: "CEE Saving 8-1 · Investing 12-4 ladder",
  marble: { concept: "inflation", color: "#8e8e93" },
  screens: [
    {
      eyebrow: "Basics 1 · Cash",
      definition: "Cash is money that keeps its number no matter what happens in the market.",
      story:
        "Maya's lemonade stand had a good summer, and she keeps $100 of it in a jar under the counter. A crash on the news cannot touch that jar. Count it in any year you like, and it answers with the same number.",
      stage: JarStage,
      gated: true,
    },
    {
      eyebrow: "Basics 1 · Cash",
      definition: "Inflation is the slow rise of prices that makes each dollar buy a little less.",
      story:
        "While the jar sits still, the world around it moves. Sneakers cost $50 a pair today, and most years the price creeps up a few percent. Drag time forward and watch what the same $100 can carry home.",
      stage: LeakStage,
      gated: true,
    },
    {
      eyebrow: "Basics 1 · Cash",
      definition: "Risk is the chance that your money ends up buying less than you planned.",
      story:
        "Cash faces two different dangers, and only one of them makes the news. Money that needs to grow cannot live in a jar, so Maya keeps jar money for spending soon and for emergencies, and she lets the rest go somewhere it can earn. Tap both cards to meet the two risks.",
      stage: TwoRisksStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "A dollar that only sits still ends up carrying home a little less every year.",
      story:
        "Maya counted the jar for eight years and watched the sneakers climb the whole time. Answer one question to clear the inflation marble in your field guide.",
      // CEE Saving 8-1; concept: inflation
      check: {
        id: "learn-cash-1",
        concept: "inflation",
        prompt: "Cash sits in a jar for eight years. What happens?",
        options: [
          "Nothing happens, because cash is perfectly safe",
          "The number stays the same while its buying power quietly shrinks",
          "It grows a little every year",
          "It becomes worthless",
        ],
        answer: 1,
        explain:
          "Safe from crashes is not the same as safe. Prices drift up, and the jar buys a little less every year.",
      },
    },
  ],
};

export default cash;
