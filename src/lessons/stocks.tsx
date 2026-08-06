import { useRef, useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 3 · Stocks. A share is a piece of a company; the money goes to the
// seller; a dividend is profit paid out; the price is the last trade.
// Standards: CEE Investing 8-4 (stock buyers become part-owners); CEE
// Investing 8-1 (return arrives as capital gain and/or regular income).
// W1 port of the original share mini; W2-stocks deepens this module in place.

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const ACCENT = "#0071e3";

// ---- screen 1 stage: the 100-piece disc, buy one piece

function BuyShareStage({ onComplete }: StageProps) {
  const [bought, setBought] = useState(false);
  const C = 2 * Math.PI * 62;
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-center gap-6 flex-wrap">
        <svg width="160" height="160" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="62" fill="none" stroke="#e8eaef" strokeWidth="26"
            strokeDasharray={`${(C / 100) * 0.72} ${(C / 100) * 0.28}`} />
          {bought && (
            <circle cx="90" cy="90" r="62" fill="none" stroke={ACCENT} strokeWidth="26"
              strokeDasharray={`${C / 100} ${C - C / 100}`} strokeDashoffset={-C * 0.25} />
          )}
          <text x="90" y="86" textAnchor="middle" fontSize="13" fill={INK} fontWeight="600">The Lemonade Stand</text>
          <text x="90" y="103" textAnchor="middle" fontSize="11" fill={SUB}>100 equal pieces</text>
        </svg>
        <div className="min-w-0 flex-1">
          {!bought ? (
            <button
              onClick={() => { setBought(true); unlockEntry("share"); onComplete(); }}
              className="text-[13px] font-medium px-4 py-2 rounded-full text-white"
              style={{ background: ACCENT }}>
              Buy 1 share for $10
            </button>
          ) : (
            <p className="text-[13.5px] pop-in font-medium" style={{ color: ACCENT }}>
              Jordan owns 1 of 100 pieces. The blue slice on the disc is his.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- screen 2 stage: where did the $10 go

function SellerStage({ onComplete }: StageProps) {
  const [answered, setAnswered] = useState<number | null>(null);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <p className="text-[13.5px] font-medium">Where did Jordan's $10 land?</p>
      <div className="mt-2 flex gap-2 flex-wrap">
        <button
          onClick={() => { setAnswered(0); onComplete(); }}
          disabled={answered !== null}
          className="text-[13px] rounded-full px-4 py-2 border border-black/10"
          style={{ background: answered === 0 ? "#f0f0f2" : "#fff" }}>
          It went to the lemonade stand
        </button>
        <button
          onClick={() => { setAnswered(1); onComplete(); }}
          disabled={answered !== null}
          className="text-[13px] rounded-full px-4 py-2 border border-black/10"
          style={{ background: answered === 1 ? "#f0f0f2" : "#fff" }}>
          It went to whoever sold the share
        </button>
      </div>
      {answered !== null && (
        <p className="text-[13px] mt-3 pop-in" style={{ color: "#3a3a3c" }}>
          {answered === 1 ? "Right. " : "Almost everyone guesses the company. "}
          The $10 went to the neighbor who owned the share before Jordan. The stand got its money
          once, long ago, when the pieces were first sold. Ever since then, the pieces have simply
          changed hands.
        </p>
      )}
    </div>
  );
}

// ---- screen 3 stage: a year of profit becomes a dividend

function DividendStage({ onComplete }: StageProps) {
  const [paid, setPaid] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      {!paid ? (
        <button
          onClick={() => { setPaid(true); unlockEntry("dividend"); onComplete(); }}
          className="text-[13px] font-medium px-4 py-2 rounded-full text-white"
          style={{ background: "#30d158" }}>
          A year passes. The stand earns $200 of profit
        </button>
      ) : (
        <div className="pop-in">
          <div className="text-[11px]" style={{ color: SUB }}>Jordan's share of the profit</div>
          <div className="text-[26px] font-semibold tnum">$2.00</div>
          <p className="text-[13px] mt-2" style={{ color: "#3a3a3c" }}>
            One hundredth of everything the stand earns belongs to Jordan, whether the share's
            price moved or not. When the stand pays that slice out in cash, the payment is his
            dividend.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- screen 4 stage: drag the price, the piece count holds still

function PriceStage({ onComplete }: StageProps) {
  const [price, setPrice] = useState(10);
  // Meeting the concept unlocks its field-guide card once, on the first drag,
  // not on every onChange tick.
  const unlocked = useRef(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">The last trade</span>
        <span className="text-[22px] font-semibold tnum">${price}</span>
      </div>
      <input type="range" min={4} max={16} step={1} value={price}
        onChange={(e) => {
          setPrice(parseInt(e.target.value, 10));
          if (!unlocked.current) {
            unlocked.current = true;
            unlockEntry("market-price");
          }
          onComplete();
        }}
        className="w-full mt-2" aria-label="The last trade price" />
      <p className="text-[12.5px] mt-1.5" style={{ color: SUB }}>
        The price is what the last buyer paid. Jordan's ownership stays at 1 of 100 pieces at
        every price on this slider.
      </p>
    </div>
  );
}

const stocks: LessonConfig = {
  id: "stocks",
  title: "What a share is",
  sub: "One share buys one small piece of a real company",
  standard: "CEE Investing 8-4 · 8-1",
  marble: { concept: "share", color: "#0a84ff" },
  screens: [
    {
      eyebrow: "Basics 3 · Stocks",
      definition: "A share is one small piece of a real company.",
      story:
        "Maya's lemonade stand has been divided into 100 equal pieces, and Jordan can buy one of them. From that moment, one hundredth of everything the stand earns belongs to Jordan, and so does one hundredth of everything the stand is worth.",
      stage: BuyShareStage,
      gated: true,
    },
    {
      eyebrow: "Basics 3 · Stocks",
      definition: "The stock market is mostly people trading shares with each other, not with the company.",
      story:
        "Jordan did not buy his piece from Maya. He bought it from a neighbor who wanted out. Lock in your guess about where the money went, and then see the answer.",
      stage: SellerStage,
      gated: true,
    },
    {
      eyebrow: "Basics 3 · Stocks",
      definition: "A dividend is a piece of the profit that a company pays to its owners in cash.",
      story:
        "Owning a share is not only about the price going up. The stand sells lemonade all summer, and part of what it earns can be handed straight to its one hundred owners. Press the button and let the season play out.",
      stage: DividendStage,
      gated: true,
    },
    {
      eyebrow: "Basics 3 · Stocks",
      definition: "The market price of a share is whatever the last buyer agreed to pay for one.",
      story:
        "On Monday somebody pays $12 for a piece of the stand, and suddenly every piece is marked $12. Nothing inside the stand changed over the weekend. Drag the price anywhere you like and watch the one number that never moves.",
      stage: PriceStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "Owning a share means owning a fixed fraction of the company, whatever its price does.",
      story:
        "Jordan owns 1 of Maya's 100 pieces no matter what the last trade says. Answer one question to clear the share marble in your field guide.",
      // CEE Investing 8-4; concept: share
      check: {
        id: "learn-stocks-1",
        concept: "share",
        prompt: "The price of your share fell from $10 to $4. What do you own now?",
        options: [
          "Less of the company than before",
          "The same 1 of 100 pieces, worth less right now",
          "Nothing, until you sell",
          "Four shares instead of one",
        ],
        answer: 1,
        explain:
          "Ownership is counted in pieces, not dollars. A falling price changes what your piece would sell for today, not how much of the stand is yours.",
      },
    },
  ],
};

export default stocks;
