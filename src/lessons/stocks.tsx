import { useRef, useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 3 · Stocks. A share is a piece of a company; the money goes to the
// seller (secondary market); the price is the last trade; prices move when
// buyers and sellers fall out of balance; dividends; what an owner can and
// cannot do. W2 deepened rebuild of the original share mini.
// Standards: CEE Investing 8-4 (stock buyers become part-owners); CEE
// Investing 8-1 (return arrives as capital gain and/or regular income). The
// buyers-and-sellers screen leans on the CEE 9-12 Investing ladder (asset
// prices emerge from trades between buyers and sellers, not from an
// administrator).

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
          {answered === 1 ? "You are right. " : "Almost everyone guesses the company. "}
          The $10 went to the neighbor who owned the share before Jordan. The stand got its money
          once, long ago, when the pieces were first sold. Ever since then, the pieces have simply
          changed hands.
        </p>
      )}
    </div>
  );
}

// ---- screen 3 stage: drag the price, the piece count holds still

function PriceStage({ onComplete }: StageProps) {
  const [price, setPrice] = useState(10);
  // Meeting the concept unlocks its field-guide card once, on the first drag,
  // not on every onChange tick.
  const unlocked = useRef(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>The last trade</div>
          <div className="text-[22px] font-semibold tnum">${price}</div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>Jordan's pieces</div>
          <div className="text-[22px] font-semibold tnum" style={{ color: ACCENT }}>1 of 100</div>
        </div>
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
        The price is what the last buyer paid. Drag it anywhere on the slider, and the number on
        the right refuses to move.
      </p>
    </div>
  );
}

// ---- screen 4 stage: send buyers and sellers, watch where the trades print

function CrowdStage({ onComplete }: StageProps) {
  const [buyers, setBuyers] = useState(0);
  const [sellers, setSellers] = useState(0);
  // Deterministic toy market: each unmatched buyer lifts the newest print by
  // a dollar, each unmatched seller lowers it by a dollar. Caps keep the
  // price inside the same $4 to $16 band the slider screen used.
  const price = 10 + buyers - sellers;
  const lean =
    buyers === sellers
      ? "The crowd is even, so trades keep printing near the old price."
      : buyers > sellers
        ? "Buyers outnumber sellers, so each new trade prints a little higher."
        : "Sellers outnumber buyers, so each new trade prints a little lower.";
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">The newest trade</span>
        <span className="text-[22px] font-semibold tnum">${price}</span>
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button
          onClick={() => { setBuyers((b) => b + 1); onComplete(); }}
          disabled={buyers >= 6}
          className="text-[13px] font-medium px-4 py-2 rounded-full text-white transition disabled:opacity-35"
          style={{ background: ACCENT }}>
          A buyer walks up
        </button>
        <button
          onClick={() => { setSellers((s) => s + 1); onComplete(); }}
          disabled={sellers >= 6}
          className="text-[13px] font-medium px-4 py-2 rounded-full border border-black/10 transition disabled:opacity-35"
          style={{ background: "#fff", color: INK }}>
          An owner wants out
        </button>
      </div>
      <p className="text-[12.5px] mt-3 tnum" style={{ color: SUB }}>
        Buyers waiting: {buyers} · Owners selling: {sellers}
      </p>
      <p className="text-[12.5px] mt-1.5 pop-in" style={{ color: "#3a3a3c" }}>{lean}</p>
    </div>
  );
}

// ---- screen 5 stage: a season of profit becomes a dividend

function DividendStage({ onComplete }: StageProps) {
  const [paid, setPaid] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      {!paid ? (
        <button
          onClick={() => { setPaid(true); unlockEntry("dividend"); onComplete(); }}
          className="text-[13px] font-medium px-4 py-2 rounded-full text-white"
          style={{ background: "#30d158" }}>
          A year passes. The stand earns $200 of profit.
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

// ---- screen 6 stage: what an owner can and cannot do

const OWNER_CALLS: { text: string; can: boolean }[] = [
  { text: "Sell the piece to any willing buyer", can: true },
  { text: "Vote when the stand chooses its leaders", can: true },
  { text: "Pour a free lemonade on a hot day", can: false },
  { text: "Order Maya to change the menu", can: false },
];

function OwnerStage({ onComplete }: StageProps) {
  const [flipped, setFlipped] = useState<boolean[]>(() => OWNER_CALLS.map(() => false));
  const done = flipped.every(Boolean);
  const flip = (i: number) => {
    if (flipped[i]) return;
    // Compute the next state here in the handler; updaters must stay pure, so
    // onComplete (a parent setState) never runs inside setFlipped.
    const next = flipped.map((v, j) => (j === i ? true : v));
    setFlipped(next);
    if (next.every(Boolean)) onComplete();
  };
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <p className="text-[13.5px] font-medium">Jordan owns 1 of 100 pieces. Tap each card: is this his call?</p>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {OWNER_CALLS.map((c, i) => (
          <button key={i} onClick={() => flip(i)}
            className="text-left text-[13px] rounded-xl px-3.5 py-2 border transition flex items-center justify-between gap-3"
            style={{
              background: flipped[i] ? (c.can ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.08)") : "#fafafc",
              borderColor: flipped[i] ? (c.can ? "rgba(36,138,61,0.45)" : "rgba(215,0,21,0.30)") : "rgba(0,0,0,0.08)",
              cursor: flipped[i] ? "default" : "pointer",
            }}>
            <span>{c.text}</span>
            <span className="text-[11px] font-semibold flex-shrink-0"
              style={{ color: flipped[i] ? (c.can ? "#248a3d" : "#d70015") : "#a1a1a6" }}>
              {flipped[i] ? (c.can ? "An owner can" : "Not an owner's call") : "tap"}
            </span>
          </button>
        ))}
      </div>
      {done && (
        <p className="text-[12.5px] mt-2.5 pop-in" style={{ color: "#3a3a3c" }}>
          Jordan holds a slice of the value and a vote. The day-to-day running of the stand stays
          with Maya.
        </p>
      )}
    </div>
  );
}

const stocks: LessonConfig = {
  id: "stocks",
  title: "What a share is",
  sub: "Buy a piece of Maya's stand and follow where the money goes",
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
        "Jordan did not buy his piece from Maya. Choose where you think his $10 went, and then see the answer.",
      stage: SellerStage,
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
      eyebrow: "Basics 3 · Stocks",
      definition: "A share's price rises when buyers outnumber sellers, and it falls when sellers outnumber buyers.",
      story:
        "A heat wave hits town, and everyone remembers the stand at once. Send buyers and sellers to the trading table one at a time, and watch which way the newest trade gets pushed.",
      stage: CrowdStage,
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
      definition: "A shareholder owns a slice of the company but does not get to run it.",
      story:
        "Jordan owns a piece of the stand, but Maya still runs it every day. Tap each card to find out where an owner's power ends.",
      stage: OwnerStage,
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
    {
      eyebrow: "Prove it",
      definition: "Nobody sets a share's price from above, because the price is only the record of the newest trade.",
      story:
        "The stand had a slow week, and the newest trade printed lower than the one before it. Answer one question to clear the market price marble.",
      // CEE 9-12 Investing ladder (prices emerge from trades); concept: market-price
      check: {
        id: "learn-stocks-2",
        concept: "market-price",
        prompt: "Every piece of the stand is marked $12 this morning. Who decided that number?",
        options: [
          "Maya picked it when she opened the stand",
          "The last buyer and seller agreed on it in a trade",
          "The bank posts a fresh number each month",
          "The town votes on it every summer",
        ],
        answer: 1,
        explain:
          "No one is in charge of the number. Each trade prints a new price, and the newest print is what every share is marked at until somebody trades again.",
      },
    },
    {
      eyebrow: "Prove it",
      definition: "A dividend rewards owners for holding, even in a season when the price goes nowhere.",
      story:
        "Summer ends, and Maya counts what the stand earned. Answer one last question to clear the dividend marble.",
      // CEE Investing 8-1 (return as regular income); concept: dividend
      check: {
        id: "learn-stocks-3",
        concept: "dividend",
        prompt:
          "The stand pays $200 of profit out to its 100 pieces. Jordan holds one piece, and the price sat still all season. What lands in his pocket?",
        options: [
          "$2.00 in cash",
          "Nothing, because the price did not move",
          "$200, because every owner gets the full amount",
          "An extra share instead of money",
        ],
        answer: 0,
        explain:
          "A dividend follows ownership, not the chart. One piece out of one hundred collects one hundredth of the payout, so Jordan gets two dollars even in a flat season.",
      },
    },
  ],
};

export default stocks;
