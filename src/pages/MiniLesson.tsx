import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fmtMoney } from "../engine/market";
import { CheckItem } from "../lib/checkpoints";
import { unlockEntry } from "../lib/fieldGuide";
import QuickCheck from "../components/QuickCheck";

// Four asset-type mini-lessons, each two to three minutes: what a share is,
// what a fund is, what cash does, what a coin is. Every one busts a single
// misconception and ends with one check item that clears its field-guide
// marble. Bespoke interactions, no sim engine needed.

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const ACCENT = "#0071e3";

interface MiniDef {
  id: string;
  title: string;
  sub: string;
  standard: string;
  check: CheckItem;
}

const MINIS: MiniDef[] = [
  {
    id: "share",
    title: "What a share is",
    sub: "One small piece of a real company",
    standard: "CEE Investing 8-4",
    check: {
      id: "mini-share",
      concept: "share",
      prompt: "The price of your share fell from $10 to $4. What do you own now?",
      options: [
        "Less of the company than before",
        "The same 1 of 100 pieces, worth less right now",
        "Nothing, until you sell",
        "Four shares instead of one",
      ],
      answer: 1,
      explain: "Ownership is counted in pieces, not dollars. The price is what the last buyer paid; your piece did not shrink.",
    },
  },
  {
    id: "fund",
    title: "What a fund is",
    sub: "One purchase that buys a piece of everything",
    standard: "CEE Investing 8-5b",
    check: {
      id: "mini-fund",
      concept: "index-fund",
      prompt: "What does buying an index fund actually guarantee?",
      options: [
        "The best performer's result",
        "The average of everything inside it, winners included",
        "That you cannot lose money",
        "Beating the stock pickers every year",
      ],
      answer: 1,
      explain: "The fund holds the tripler and the flop alike. You get the middle, and you never miss the winner entirely.",
    },
  },
  {
    id: "cash",
    title: "What cash does",
    sub: "The number that stays while the power shrinks",
    standard: "CEE Investing 12-4 ladder · Saving 8-1",
    check: {
      id: "mini-cash",
      concept: "inflation",
      prompt: "Cash sits in a jar for eight years. What happens?",
      options: [
        "Nothing. Cash is perfectly safe",
        "The number stays the same while its buying power quietly shrinks",
        "It grows a little every year",
        "It becomes worthless",
      ],
      answer: 1,
      explain: "Safe from crashes is not the same as safe. Prices drift up, and the jar buys a little less every year.",
    },
  },
  {
    id: "coin",
    title: "What a coin is",
    sub: "A place in line, not a piece of a business",
    standard: "CEE Investing 12-2c ladder",
    check: {
      id: "mini-coin",
      concept: "position-size",
      prompt: "What decides whether a 75% coin winter is a story you tell or a disaster you live?",
      options: [
        "Selling at the perfect moment",
        "How big the bet was next to everything else you have",
        "Which coin you picked",
        "Pure luck",
      ],
      answer: 1,
      explain: "Position size is the one thing you fully control. Small enough to hold is the whole game.",
    },
  },
];

// ---------- share: a 100-piece company disc, a price that moves, a count that doesn't

function ShareLesson({ onDone }: { onDone: () => void }) {
  const [bought, setBought] = useState(false);
  const [answered, setAnswered] = useState<number | null>(null);
  const [profitSeen, setProfitSeen] = useState(false);
  const [price, setPrice] = useState(10);
  const C = 2 * Math.PI * 62;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-8 flex-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="62" fill="none" stroke="#e8eaef" strokeWidth="26"
            strokeDasharray={`${(C / 100) * 0.72} ${(C / 100) * 0.28}`} />
          {bought && (
            <circle cx="90" cy="90" r="62" fill="none" stroke={ACCENT} strokeWidth="26"
              strokeDasharray={`${C / 100} ${C - C / 100}`} strokeDashoffset={-C * 0.25} />
          )}
          <text x="90" y="86" textAnchor="middle" fontSize="13" fill={INK} fontWeight="600">The Lemonade Stand</text>
          <text x="90" y="103" textAnchor="middle" fontSize="11" fill={SUB}>cut into 100 pieces</text>
        </svg>
        <div className="max-w-sm">
          <p className="text-[14px]">A real company, cut into 100 equal pieces. Each piece is a share.</p>
          {!bought ? (
            <button onClick={() => { setBought(true); unlockEntry("share"); }}
              className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white" style={{ background: ACCENT }}>
              Buy 1 share for $10
            </button>
          ) : (
            <p className="mt-3 text-[14px] font-medium" style={{ color: ACCENT }}>You own 1 of 100 pieces.</p>
          )}
        </div>
      </div>

      {bought && answered === null && (
        <div className="pop-in">
          <p className="text-[14px] font-medium">Quick question: where did your $10 go?</p>
          <div className="mt-2 flex gap-2 flex-wrap">
            <button onClick={() => setAnswered(0)} className="text-[13px] rounded-full px-4 py-2 border border-black/10 bg-white">To the company</button>
            <button onClick={() => setAnswered(1)} className="text-[13px] rounded-full px-4 py-2 border border-black/10 bg-white">To whoever sold me the share</button>
          </div>
        </div>
      )}
      {answered !== null && (
        <p className="text-[13.5px] pop-in" style={{ color: "#3a3a3c" }}>
          {answered === 1 ? "Right. " : "Almost everyone guesses the company. "}
          Your $10 went to the person who owned the share before you. The company got its money
          once, long ago, when the share was first sold. Ever since, shares just change hands.
        </p>
      )}

      {answered !== null && !profitSeen && (
        <button onClick={() => { setProfitSeen(true); unlockEntry("dividend"); }}
          className="self-start text-[13px] font-medium px-4 py-2 rounded-full text-white" style={{ background: "#30d158" }}>
          A year passes. The stand earns $200 profit
        </button>
      )}
      {profitSeen && (
        <p className="text-[13.5px] pop-in" style={{ color: "#3a3a3c" }}>
          Your piece of that profit: <strong className="tnum">$2</strong>. One hundredth of everything
          the stand earns is yours, whether the price moved or not. When a company pays that out in
          cash, it is called a dividend.
        </p>
      )}

      {profitSeen && (
        <div className="pop-in rounded-2xl bg-white border border-black/8 p-4 max-w-md">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium">Now drag the price.</span>
            <span className="text-[22px] font-semibold tnum">{fmtMoney(price)}</span>
          </div>
          <input type="range" min={4} max={16} step={1} value={price}
            onChange={(e) => setPrice(parseInt(e.target.value, 10))} className="w-full mt-2" />
          <p className="text-[12.5px] mt-1.5" style={{ color: SUB }}>
            The price is what the last buyer paid. Your ownership: <strong>still 1 of 100 pieces</strong>,
            at any price on this slider.
          </p>
          <button onClick={onDone} className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white" style={{ background: ACCENT }}>
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- fund: pick one to win, miss the tripler, then buy the middle

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
const FUND_OTHERS = [-24, 15, -8, 31, 4, -12];

function FundLesson({ onDone }: { onDone: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const [fused, setFused] = useState(false);
  const [shaken, setShaken] = useState(false);

  const results = useMemo(() => {
    if (pick === null) return null;
    const r = new Array(FUND_CAST.length).fill(0);
    r[pick] = 8;
    const tripler = FUND_CAST.findIndex((_, i) => i !== pick);
    r[tripler] = 210;
    let oi = 0;
    for (let i = 0; i < r.length; i++) if (i !== pick && i !== tripler) r[i] = FUND_OTHERS[oi++];
    return { r, tripler };
  }, [pick]);
  const avg = results ? Math.round(results.r.reduce((a, b) => a + b, 0) / results.r.length) : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px]">Eight companies. Pick the one that will do best this year.</p>
      <div className="flex gap-3 flex-wrap max-w-lg">
        {FUND_CAST.map((c, i) => (
          <button key={c.name} disabled={pick !== null}
            onClick={() => { setPick(i); unlockEntry("index-fund"); }}
            className="flex flex-col items-center gap-1 w-24">
            <span className="w-12 h-12 rounded-full transition"
              style={{
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), ${c.color}66 55%, ${c.color}cc)`,
                boxShadow: pick === i ? `0 0 0 3px ${ACCENT}` : "inset 0 0 0 1px rgba(30,45,80,0.12)",
              }} />
            <span className="text-[11px] text-center leading-tight" style={{ color: SUB }}>{c.name}</span>
            {results && (
              <span className="text-[12px] font-semibold tnum"
                style={{ color: results.r[i] >= 0 ? "#248a3d" : "#d70015" }}>
                {results.r[i] > 0 ? "+" : ""}{results.r[i]}%
              </span>
            )}
          </button>
        ))}
      </div>
      {results && (
        <p className="text-[13.5px] pop-in max-w-lg" style={{ color: "#3a3a3c" }}>
          Your pick did fine: +8%. But {FUND_CAST[results.tripler].name} tripled, and you did not
          have it. Every year has a tripler, and nobody knows which one in advance. Try any other
          pick next run and the tripler moves.
        </p>
      )}
      {results && !fused && (
        <button onClick={() => setFused(true)}
          className="self-start text-[13px] font-medium px-4 py-2 rounded-full text-white" style={{ background: ACCENT }}>
          Now buy all eight at once
        </button>
      )}
      {fused && (
        <div className="pop-in flex items-center gap-6">
          <button onClick={() => { setShaken(true); setTimeout(() => setShaken(false), 500); }}
            className="w-20 h-20 rounded-full flex-shrink-0"
            style={{
              background: "conic-gradient(from 200deg, #ff9f0a, #0a84ff 25%, #30d158 50%, #bf5af2 75%, #ff9f0a)",
              filter: "blur(0.5px)",
              boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.7), inset 0 0 0 4.5px rgba(30,45,80,0.25), 0 12px 24px -12px rgba(24,34,60,0.5)",
              animation: shaken ? "sg-shake 0.4s" : undefined,
            }}
            aria-label="The fused fund marble" />
          <style>{`@keyframes sg-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-2deg); } 75% { transform: translateX(4px) rotate(2deg); } }`}</style>
          <div className="max-w-sm">
            <p className="text-[13.5px]" style={{ color: "#3a3a3c" }}>
              One fused marble holding all eight, tripler included: <strong className="tnum">+{avg}%</strong>,
              the middle of everything. It is sealed. Try to open it.
              {shaken && <span style={{ color: ACCENT }}> It refuses. No single color comes back out.</span>}
            </p>
            <button onClick={onDone} className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white" style={{ background: ACCENT }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- cash: the jar that keeps its number and loses its power

function CashLesson({ onDone }: { onDone: () => void }) {
  const [year, setYear] = useState(0);
  const price = Math.round(50 * Math.pow(1.045, year));
  const pairs = Math.floor(100 / price);
  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <p className="text-[14px]">$100 goes into a jar. Sneakers cost $50 a pair. Drag time forward.</p>
      <div className="rounded-2xl bg-white border border-black/8 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium">Years in the jar</span>
          <span className="text-[20px] font-semibold tnum">{year}</span>
        </div>
        <input type="range" min={0} max={8} step={1} value={year}
          onChange={(e) => { setYear(parseInt(e.target.value, 10)); unlockEntry("inflation"); }} className="w-full mt-2" />
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[11px]" style={{ color: SUB }}>The jar</div>
            <div className="text-[19px] font-semibold tnum">$100</div>
          </div>
          <div>
            <div className="text-[11px]" style={{ color: SUB }}>Sneakers</div>
            <div className="text-[19px] font-semibold tnum">{fmtMoney(price)}</div>
          </div>
          <div>
            <div className="text-[11px]" style={{ color: SUB }}>Pairs it buys</div>
            <div className="text-[19px] font-semibold tnum" style={{ color: pairs < 2 ? "#d70015" : INK }}>{pairs}</div>
          </div>
        </div>
      </div>
      <p className="text-[13.5px]" style={{ color: "#3a3a3c" }}>
        The jar never loses a dollar, and it never stops losing power. That quiet leak is
        inflation, and it is why money that must grow cannot live in a jar.
      </p>
      {year >= 8 && (
        <button onClick={onDone} className="self-start text-[13px] font-medium px-4 py-2 rounded-full text-white pop-in" style={{ background: ACCENT }}>
          Got it
        </button>
      )}
    </div>
  );
}

// ---------- coin: a place in line, and the bet size that decides everything

function CoinLesson({ onDone }: { onDone: () => void }) {
  const [flipped, setFlipped] = useState<{ share: boolean; coin: boolean }>({ share: false, coin: false });
  const [bet, setBet] = useState<number | null>(null);
  const end = bet !== null ? 1000 - bet + bet * 0.25 : null;
  const feeling = bet === 100 ? "A story you tell." : bet === 500 ? "A bruise you feel." : "A disaster you live.";
  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <p className="text-[14px]">Two things you can buy. Flip both cards.</p>
      <div className="flex gap-3">
        {(["share", "coin"] as const).map((kind) => (
          <button key={kind} onClick={() => setFlipped((f) => ({ ...f, [kind]: true }))}
            className="flex-1 rounded-2xl border border-black/8 bg-white p-4 text-left min-h-[110px]">
            <div className="text-[13px] font-semibold">{kind === "share" ? "A share" : "A coin"}</div>
            {flipped[kind] ? (
              <p className="text-[12.5px] mt-1 pop-in" style={{ color: "#3a3a3c" }}>
                {kind === "share"
                  ? "Opens onto a business: stores, products, profits, people. It earns whether anyone trades it or not."
                  : "Opens onto itself: a place in line, worth what the next person in line will pay. Nothing underneath."}
              </p>
            ) : (
              <p className="text-[12px] mt-1" style={{ color: SUB }}>tap to flip</p>
            )}
          </button>
        ))}
      </div>
      {flipped.share && flipped.coin && (
        <div className="pop-in">
          <p className="text-[14px] font-medium">
            It is November 2021 and you have $1,000. Coins are at records. How much goes in?
          </p>
          <div className="mt-2 flex gap-2">
            {[100, 500, 1000].map((b) => (
              <button key={b} onClick={() => { setBet(b); unlockEntry("position-size"); }}
                className="text-[13px] rounded-full px-4 py-2 border transition"
                style={bet === b ? { background: ACCENT, color: "#fff", borderColor: ACCENT } : { background: "#fff", borderColor: "rgba(0,0,0,0.1)" }}>
                {fmtMoney(b)}
              </button>
            ))}
          </div>
        </div>
      )}
      {bet !== null && end !== null && (
        <div className="pop-in rounded-2xl bg-white border border-black/8 p-4">
          <p className="text-[13.5px]" style={{ color: "#3a3a3c" }}>
            The real winter comes: the coin falls 75% over the next year. Your {fmtMoney(bet)} becomes{" "}
            <strong className="tnum">{fmtMoney(bet * 0.25)}</strong>. You end with{" "}
            <strong className="tnum">{fmtMoney(end)}</strong> of your $1,000.
          </p>
          <p className="text-[13.5px] mt-1 font-medium">{feeling}</p>
          <p className="text-[12.5px] mt-1" style={{ color: SUB }}>
            Same coin, same winter, three different lives. The only difference was the size of the bet.
          </p>
          <button onClick={onDone} className="mt-3 text-[13px] font-medium px-4 py-2 rounded-full text-white" style={{ background: ACCENT }}>
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- shell

export default function MiniLesson() {
  const { id } = useParams();
  const def = MINIS.find((mm) => mm.id === id) ?? MINIS[0];
  const [checking, setChecking] = useState(false);

  const body = () => {
    const done = () => setChecking(true);
    switch (def.id) {
      case "share": return <ShareLesson onDone={done} />;
      case "fund": return <FundLesson onDone={done} />;
      case "cash": return <CashLesson onDone={done} />;
      default: return <CoinLesson onDone={done} />;
    }
  };

  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: INK, colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/orb" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: INK }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          scenarios
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">{def.title}</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: SUB }}>{def.sub}</span>
        </div>
        <span className="ml-auto text-[11px]" style={{ color: "#a1a1a6" }}>{def.standard}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        {body()}
        {checking && (
          <div className="mt-6 rounded-2xl bg-white border border-black/8 shadow-sm p-5 max-w-lg pop-in">
            <QuickCheck scenario={`mini-${def.id}`} items={[def.check]} gateMs={[]} />
            <div className="mt-3 flex gap-4">
              <Link to="/orb/guide" className="text-[13px] font-medium" style={{ color: ACCENT }}>See your marbles</Link>
              <Link to="/orb" className="text-[13px]" style={{ color: SUB }}>Back to scenarios</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
