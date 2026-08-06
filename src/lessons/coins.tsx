import { useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 5 · Coins. A coin opens onto itself; position size decides whether a
// coin winter is a story or a disaster.
// Standards: CEE Investing 12-2c ladder (cryptocurrencies named as
// speculative); CEE Investing 8-6a (order investments by risk).
// W1 port of the original coin mini; W2-coins deepens this module in place.

const SUB = "#6e6e73";
const ACCENT = "#0071e3";

// Whole-dollar money, so every chip in a row wears the same format.
const fmtWhole = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ---- screen 1 stage: open each one, one card, two tabs

const UNDERNEATH = {
  share: "It opens onto a business: stores, products, profits, people. The business earns whether anyone trades the share or not.",
  coin: "It opens onto itself. It is a place in line, worth what the next person in line will pay, with nothing underneath.",
} as const;

function FlipStage({ onComplete }: StageProps) {
  const [shown, setShown] = useState<keyof typeof UNDERNEATH | null>(null);
  const [seen, setSeen] = useState<{ share: boolean; coin: boolean }>({ share: false, coin: false });
  const show = (k: keyof typeof UNDERNEATH) => {
    setShown(k);
    const next = { ...seen, [k]: true };
    setSeen(next);
    if (next.share && next.coin) onComplete();
  };
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex gap-2">
        {(["share", "coin"] as const).map((k) => (
          <button key={k} onClick={() => show(k)}
            className="text-[13px] font-medium rounded-full px-4 py-2 border transition"
            style={shown === k
              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
              : { background: "#fff", borderColor: "rgba(0,0,0,0.1)" }}>
            {k === "share" ? "A share" : "A coin"}
          </button>
        ))}
      </div>
      <div className="mt-3 min-h-[62px]">
        {shown ? (
          <p key={shown} className="text-[13px] pop-in" style={{ color: "#3a3a3c" }}>{UNDERNEATH[shown]}</p>
        ) : (
          <p className="text-[13px]" style={{ color: SUB }}>Tap one to see what sits underneath it. Open both to move on.</p>
        )}
      </div>
    </div>
  );
}

// ---- screen 2 stage: choose the bet size, live the winter

function BetStage({ onComplete }: StageProps) {
  const [bet, setBet] = useState<number | null>(null);
  const end = bet !== null ? 1000 - bet + bet * 0.25 : null;
  const feeling =
    bet === 100 ? "That loss is a story Jordan tells later."
    : bet === 500 ? "That loss is a bruise Jordan feels all year."
    : "That loss is a disaster Jordan has to live.";
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <p className="text-[13.5px] font-medium">Jordan has $1,000. How much goes into the coin?</p>
      <div className="mt-2 flex gap-2">
        {[100, 500, 1000].map((b) => (
          <button key={b}
            onClick={() => { setBet(b); unlockEntry("position-size"); onComplete(); }}
            className="text-[13px] rounded-full px-4 py-2 border transition tnum"
            style={bet === b
              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
              : { background: "#fff", borderColor: "rgba(0,0,0,0.1)" }}>
            {fmtWhole(b)}
          </button>
        ))}
      </div>
      {bet !== null && end !== null && (
        <div className="mt-3 pop-in">
          <p className="text-[13px]" style={{ color: "#3a3a3c" }}>
            The winter comes, and the coin falls 75% over the next year. Jordan's {fmtWhole(bet)}{" "}
            becomes <strong className="tnum">{fmtWhole(bet * 0.25)}</strong>, and he ends the year
            with <strong className="tnum">{fmtWhole(end)}</strong> of his $1,000.
          </p>
          <p className="text-[13.5px] mt-1.5 font-medium">{feeling}</p>
          <p className="text-[12.5px] mt-1" style={{ color: SUB }}>
            The same coin and the same winter make three different lives. The only difference is
            the size of the bet. Try the other sizes too.
          </p>
        </div>
      )}
    </div>
  );
}

const coins: LessonConfig = {
  id: "coins",
  title: "What a coin is",
  sub: "A coin has a price but no business underneath",
  standard: "CEE Investing 12-2c ladder · 8-6a",
  marble: { concept: "position-size", color: "#a2845e" },
  screens: [
    {
      eyebrow: "Basics 5 · Coins",
      definition: "A coin is a place in line, not a piece of a business.",
      story:
        "A share of Maya's stand opens onto something real: lemons, a corner, profit at the end of summer. A coin has no stand behind it, and its price is only what the next person in line will pay. Flip both cards and compare what sits underneath each one.",
      stage: FlipStage,
      gated: true,
    },
    {
      eyebrow: "Basics 5 · Coins",
      definition: "Position size is how much of your money one single bet gets.",
      story:
        "It is late 2021, Jordan has $1,000 saved, and coins are at records. In this replay the winter that follows cuts the coin by 75% no matter what he does. The one choice that is fully his is how much to put in. Choose a size and live the year that already happened.",
      stage: BetStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "The size of a bet decides how much one bad winter can take from you.",
      story:
        "Jordan lived the same coin winter three times, once at each size. Answer one question to clear the position size marble in your field guide.",
      // CEE Investing 12-2c ladder; concept: position-size
      check: {
        id: "learn-coins-1",
        concept: "position-size",
        prompt: "What decides whether a 75% coin winter is a story you tell or a disaster you live?",
        options: [
          "Selling at the perfect moment",
          "How big the bet was next to everything else you have",
          "Which coin you picked",
          "Pure luck",
        ],
        answer: 1,
        explain:
          "Position size is the one thing you fully control. Small enough to hold is the whole game.",
      },
    },
  ],
};

export default coins;
