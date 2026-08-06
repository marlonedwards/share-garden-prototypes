import { useRef, useState } from "react";
import { unlockEntry } from "../lib/fieldGuide";
import { LessonConfig, StageProps } from "./types";

// Basics 5 · Coins. A coin opens onto itself; volatility is the ride; position
// size decides whether a coin winter is a story or a disaster; the Ponzi
// promise is the red flag you check every pitch against.
// Standards: CEE Investing 12-2c ladder (cryptocurrencies named as
// speculative); CEE Investing 8-6a (order investments by risk). The Ponzi
// screens teach fraud awareness under the same 12-2c ladder note.
// W2-coins deepening of the W1 port: adds the volatility, Ponzi-machine and
// red-flag stages plus the second check.

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

// ---- screen 2 stage: drag through a replay year, coin swings versus fund swings

// Deterministic monthly prices for one replay year, month 0 through 12. The
// coin's biggest monthly jump is about a third up and its biggest fall is
// about the same down; the fund never moves more than about 2% in a month.
const COIN_PATH = [100, 134, 96, 128, 91, 121, 158, 112, 143, 102, 131, 96, 124];
const FUND_PATH = [100, 102, 101, 103, 102, 104, 106, 105, 107, 108, 107, 109, 110];
const MONTHS_MAX = COIN_PATH.length - 1;

function moveAt(path: number[], m: number): number {
  if (m === 0) return 0;
  return ((path[m] - path[m - 1]) / path[m - 1]) * 100;
}

const fmtMove = (pct: number) => `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(0)}%`;

function SwingStage({ onComplete }: StageProps) {
  const [month, setMonth] = useState(0);
  // A wide, flat chart, so the whole stage fits a 1280x720 window with the
  // shell's Continue still on screen.
  const W = 360, H = 76, PAD = 8;
  const LO = 85, HI = 165;
  const x = (m: number) => PAD + (m / MONTHS_MAX) * (W - 2 * PAD);
  const yPix = (v: number) => H - PAD - ((v - LO) / (HI - LO)) * (H - 2 * PAD);
  const pts = (path: number[]) =>
    path.map((v, i) => `${x(i).toFixed(1)},${yPix(v).toFixed(1)}`).join(" ");
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">Months into the year</span>
        <span className="text-[20px] font-semibold tnum">{month}</span>
      </div>
      <input type="range" min={0} max={MONTHS_MAX} step={1} value={month}
        onChange={(e) => {
          const m = parseInt(e.target.value, 10);
          setMonth(m);
          if (m >= 9) onComplete();
        }}
        className="w-full mt-2" aria-label="Months into the year" />
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-1" aria-hidden="true">
        <polyline points={pts(FUND_PATH)} fill="none" stroke="#c7c7cc" strokeWidth="2" />
        <polyline points={pts(COIN_PATH)} fill="none" stroke={ACCENT} strokeWidth="2.5" />
        <circle cx={x(month)} cy={yPix(FUND_PATH[month])} r="3.5" fill="#c7c7cc" />
        <circle cx={x(month)} cy={yPix(COIN_PATH[month])} r="4" fill={ACCENT} />
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>The coin's move this month</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: ACCENT }}>
            {fmtMove(moveAt(COIN_PATH, month))}
          </div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: SUB }}>The fund's move this month</div>
          <div className="text-[20px] font-semibold tnum" style={{ color: SUB }}>
            {fmtMove(moveAt(FUND_PATH, month))}
          </div>
        </div>
      </div>
      <p className="text-[12.5px] mt-1.5" style={{ color: SUB }}>
        Drag most of the way through the year and compare the two numbers month by month.
      </p>
    </div>
  );
}

// ---- screen 3 stage: choose the bet size, live the winter

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

// ---- screen 5 stage: the payout machine, tap through the months

// Deterministic month table. Every member deposits $100 once and is owed $10 a
// month; payouts always come out of the newest deposits, and the founder
// pockets the rest. Members: 10, then 50, then 150, then still 150.
const PONZI_MONTHS = [
  {
    inflow: 1000, owed: 100,
    note: "Ten neighbors put in $100 each. Every payout arrives on time, and the founder pockets what is left.",
  },
  {
    inflow: 4000, owed: 500,
    note: "Word spreads, and forty more join. The new deposits cover every payout with room to spare, and the extra leaves in the founder's pocket.",
  },
  {
    inflow: 10000, owed: 1500,
    note: "One hundred more pile in. The app looks unstoppable, and the newest deposits are paying all one hundred fifty members.",
  },
  {
    inflow: 0, owed: 1500,
    note: "No one new signs up. There is no business earning anything, so there is nothing left to pay with.",
  },
];

function PonziStage({ onComplete }: StageProps) {
  const [month, setMonth] = useState(0); // 0 = not started; 1..4 = table rows
  const unlocked = useRef(false);
  const done = month >= PONZI_MONTHS.length;
  const row = month > 0 ? PONZI_MONTHS[month - 1] : null;
  const advance = () => {
    if (done) return;
    if (!unlocked.current) {
      unlocked.current = true;
      unlockEntry("ponzi");
    }
    const next = month + 1;
    setMonth(next);
    if (next >= PONZI_MONTHS.length) onComplete();
  };
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">The payout app</span>
        <span className="text-[12px] tnum" style={{ color: SUB }}>
          {month === 0 ? "Not open yet" : `Month ${month}`}
        </span>
      </div>
      {row ? (
        <div key={month} className="pop-in">
          <div className="mt-2.5 grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-[11px]" style={{ color: SUB }}>New money in</div>
              <div className="text-[20px] font-semibold tnum"
                style={{ color: row.inflow === 0 ? "#d70015" : "#1d1d1f" }}>
                {fmtWhole(row.inflow)}
              </div>
            </div>
            <div>
              <div className="text-[11px]" style={{ color: SUB }}>Payouts owed</div>
              <div className="text-[20px] font-semibold tnum">{fmtWhole(row.owed)}</div>
            </div>
          </div>
          <p className="mt-2 text-[13px]" style={{ color: "#3a3a3c" }}>{row.note}</p>
          {done && (
            <p className="mt-1.5 text-[13.5px] font-medium" style={{ color: "#d70015" }}>
              The app goes dark overnight, and the deposits go with it.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2.5 text-[13px]" style={{ color: SUB }}>
          The app promises members 10% every month. Tap through the months and watch the two
          numbers.
        </p>
      )}
      <button onClick={advance} disabled={done}
        className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white disabled:opacity-40"
        style={{ background: ACCENT }}>
        {month === 0 ? "Open the app's first month" : done ? "The months are over" : "Advance one month"}
      </button>
    </div>
  );
}

// ---- screen 6 stage: three pitches, one flag, tap each to check it

const PITCHES = {
  coin: [
    "A new coin",
    "The pitch says the price could triple or crash, and you might lose most of what you put in. That is honest risk, told to your face. A risky thing is not the same as a fake thing.",
  ],
  app: [
    "The payout app",
    "It promises 10% every month, never a down day, and it pays extra for recruiting friends. Real investments have down months. This is the flag, flying in the open.",
  ],
  fund: [
    "An index fund",
    "It owns hundreds of companies, and the pitch admits that some years it falls. Honest sellers name the bad years first.",
  ],
} as const;

function FlagStage({ onComplete }: StageProps) {
  const [shown, setShown] = useState<keyof typeof PITCHES | null>(null);
  const [checked, setChecked] = useState<{ coin: boolean; app: boolean; fund: boolean }>({
    coin: false, app: false, fund: false,
  });
  const check = (k: keyof typeof PITCHES) => {
    setShown(k);
    const next = { ...checked, [k]: true };
    setChecked(next);
    if (next.coin && next.app && next.fund) onComplete();
  };
  return (
    <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg">
      <div className="flex gap-2 flex-wrap">
        {(["coin", "app", "fund"] as const).map((k) => (
          <button key={k} onClick={() => check(k)}
            className="text-[13px] font-medium rounded-full px-4 py-2 border transition"
            style={shown === k
              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
              : { background: "#fff", borderColor: "rgba(0,0,0,0.1)" }}>
            {PITCHES[k][0]}
          </button>
        ))}
      </div>
      <div className="mt-3 min-h-[78px]">
        {shown ? (
          <p key={shown} className="text-[13px] pop-in" style={{ color: "#3a3a3c" }}>{PITCHES[shown][1]}</p>
        ) : (
          <p className="text-[13px]" style={{ color: SUB }}>Tap a pitch to hold it against the flag. Check all three to move on.</p>
        )}
      </div>
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
      definition: "A coin is a digital token with a price but no business underneath it.",
      story:
        "A share of Maya's stand opens onto lemons, a corner, and profit at the end of summer. Jordan hears about a coin his cousin bought. Behind its price there is no stand at all. Open both cards and compare what sits underneath.",
      stage: FlipStage,
      gated: true,
    },
    {
      eyebrow: "Basics 5 · Coins",
      definition: "Volatility is how far and how fast a price swings.",
      story:
        "Jordan tracks the coin next to an index fund through one replay year. Some months the coin jumps by a third, and some months it loses as much. Drag through the months and compare the sizes of the swings.",
      stage: SwingStage,
      gated: true,
    },
    {
      eyebrow: "Basics 5 · Coins",
      definition: "Position size is the share of your money that one single bet gets.",
      story:
        "Jordan has $1,000 saved and wants in. In this replay, a coin winter cuts the price by three quarters within a year, no matter what he does. The one choice that is fully his is the size. Pick one and live that year.",
      stage: BetStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "How big the bet was decides how much one bad stretch can take from you.",
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
    {
      eyebrow: "Basics 5 · Coins",
      definition: "A Ponzi scheme pays its old customers with money from its new customers and calls it profit.",
      story:
        "A new app promises Jordan 10% every month, paid on time, never a down day. Tap through the months and watch where the payout money actually comes from.",
      stage: PonziStage,
      gated: true,
    },
    {
      eyebrow: "Basics 5 · Coins",
      definition: "The Ponzi red flag is a big return promised with no down days.",
      story:
        "Jordan now hears three pitches in one week. Two of them are honest about risk, and one is the trap. Tap each pitch and hold it against the flag.",
      stage: FlagStage,
      gated: true,
    },
    {
      eyebrow: "Prove it",
      definition: "When the new customers stop arriving, a Ponzi's payments stop with them.",
      story:
        "The app went dark the month the sign-ups stopped. Answer one question to clear the Ponzi marble in your field guide.",
      // CEE Investing 12-2c ladder (speculative promises); concept: ponzi
      check: {
        id: "learn-coins-2",
        concept: "ponzi",
        prompt: "The app paid Jordan's neighbors 10% every month until it suddenly went dark. Where was the payout money coming from?",
        options: [
          "Profits from a business the app ran",
          "Deposits from the newest customers",
          "Interest from a bank",
          "A coin that kept rising",
        ],
        answer: 1,
        explain:
          "There was never a business, only a line of new deposits paying the people ahead of them. The month the line stopped growing, the payments stopped too.",
      },
    },
  ],
};

export default coins;
