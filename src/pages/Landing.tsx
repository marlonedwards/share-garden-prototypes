import { Link } from "react-router-dom";

// The demo's front door: four games, one curriculum, one honest engine.

const S = (name: string) => `${import.meta.env.BASE_URL}sprites/t/${name}.png`;

// The Tally's motif, in the game's own language and nothing else: a short wall
// of cash green blocks standing beside one white card with an amber ring. It is
// vector, so it stays crisp on a large display.
const TALLY_WALL: number[] = [3, 5, 4, 6];

function TallyMotif() {
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      {TALLY_WALL.map((count, col) =>
        Array.from({ length: count }, (_, i) => (
          <g key={`${col}-${i}`}>
            <rect
              x={6 + col * 13}
              y={90 - 11 - i * 13}
              width="11"
              height="11"
              rx="2"
              fill="#3FAE6B"
            />
            <rect
              x={6 + col * 13}
              y={90 - 11 - i * 13}
              width="11"
              height="3"
              rx="1.5"
              fill="rgba(255,255,255,0.42)"
            />
          </g>
        )),
      )}
      <g transform="rotate(-5 90 58)">
        <rect x="68" y="26" width="44" height="64" rx="6" fill="#ffffff" stroke="rgba(0,0,0,0.14)" />
        <rect x="71.5" y="29.5" width="37" height="57" rx="4" fill="none" stroke="#D98A00" strokeWidth="2.5" />
        <circle cx="78" cy="36.5" r="2.6" fill="#D98A00" />
        <rect x="76" y="72" width="21" height="3" rx="1.5" fill="rgba(0,0,0,0.14)" />
        <rect x="76" y="78" width="14" height="3" rx="1.5" fill="rgba(0,0,0,0.10)" />
      </g>
    </svg>
  );
}

// Guess the Stock's motif, in that game's own language: a small terminal well
// with one green line climbing across it, drawn the way the game draws.
const GUESS_LINE =
  "M10,74 L20,70 L28,76 L38,66 L46,69 L56,58 L64,62 L74,48 L82,53 L92,38 L100,43 L108,27";

function GuessMotif() {
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      <rect x="3" y="14" width="112" height="76" rx="6" fill="#0C0F14" stroke="#1F2733" />
      <path d="M10,40 H108 M10,60 H108" stroke="#1B2330" strokeWidth="1" />
      <path d="M38,20 V84 M74,20 V84" stroke="#1B2330" strokeWidth="1" />
      <path d={`${GUESS_LINE} L108,84 L10,84 Z`} fill="rgba(74,222,128,0.12)" />
      <path d={GUESS_LINE} fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="108" cy="27" r="3" fill="#4ADE80" />
    </svg>
  );
}

// Takeover's motif: a big disc closing in on a small one, in the game's own
// dark-arena language.
function TakeoverMotif() {
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      <rect x="0" y="0" width="118" height="104" rx="14" fill="#0C0F14" />
      <circle cx="44" cy="54" r="30" fill="#E2231A" />
      <text x="44" y="58" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F4F7FB" fontFamily="ui-monospace, Menlo, monospace">roblox</text>
      <circle cx="92" cy="40" r="12" fill="#10141B" stroke="#E8EDF4" strokeWidth="2" />
      <circle cx="20" cy="24" r="7" fill="#7ABA40" />
      <circle cx="98" cy="82" r="9" fill="#00A4EF" />
    </svg>
  );
}

// Worth More's motif: two versus cards and the question mark of the hidden
// value, in the game's own bright language.
function WorthMotif() {
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      <rect x="4" y="14" width="50" height="76" rx="10" fill="#7C3AED" />
      <circle cx="29" cy="42" r="13" fill="#ffffff" opacity="0.92" />
      <rect x="17" y="64" width="24" height="7" rx="3.5" fill="#ffffff" opacity="0.85" />
      <rect x="64" y="14" width="50" height="76" rx="10" fill="#F59E0B" />
      <circle cx="89" cy="42" r="13" fill="#ffffff" opacity="0.92" />
      <text x="89" y="76" textAnchor="middle" fontSize="22" fontWeight="800" fill="#ffffff">?</text>
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-[44px] leading-tight font-semibold tracking-tight">Games</h1>
        <p className="mt-3 text-[17px] max-w-2xl" style={{ color: "#6e6e73" }}>
          Money is a game and the ladder we climb
        </p>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link to="/takeover" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <TakeoverMotif />
            </div>
            <div className="text-[12px] font-semibold" style={{ color: "#2C8A55" }}>New game</div>
            <div className="text-[22px] font-semibold tracking-tight">Takeover</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Start as a lemonade stand and eat every company smaller than you. Real names,
              real market values. Click to split and lunge, dodge anything bigger, and see
              how much of the market you can swallow in ninety seconds.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#14603C" }}>Play Takeover</div>
          </Link>

          <Link to="/worth" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <WorthMotif />
            </div>
            <div className="text-[12px] font-semibold" style={{ color: "#7C3AED" }}>New game</div>
            <div className="text-[22px] font-semibold tracking-tight">Worth More</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Two companies, one question: which is worth more? Every answer reveals the real
              numbers, the winner stays on as your next opponent, and one wrong tap ends
              the streak.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#7C3AED" }}>Play Worth More</div>
          </Link>

          <Link to="/guess" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <GuessMotif />
            </div>
            <div className="text-[12px] font-semibold" style={{ color: "#2C8A55" }}>New game</div>
            <div className="text-[22px] font-semibold tracking-tight">Guess the Stock</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Guess the company from one real year of its stock chart. Guesses are free, five
              hints wait behind one button, and every answer comes with the one line of history
              that made the year look like that.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#14603C" }}>Play Guess the Stock</div>
          </Link>

          <Link to="/tally" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <TallyMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">The Tally</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Cards are what you own, and blocks are what it is worth. A crash strips the wall
              down and leaves every card sitting on the table. Eight chapters carry you from a
              piggy bank to real market history.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#B57A00" }}>Play the Tally</div>
          </Link>

          <Link to="/orb" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <div className="w-24 h-24 rounded-full relative"
                style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(238,243,250,0.4) 55%, rgba(214,224,238,0.65))", boxShadow: "inset 0 0 0 1.5px rgba(30,45,80,0.12), 0 14px 28px -14px rgba(24,34,60,0.4)" }}>
                <div className="absolute inset-2.5 rounded-full overflow-hidden" style={{ filter: "blur(6px)" }}>
                  <div className="w-full h-full" style={{ background: "conic-gradient(from 220deg, #0a84ff, #bf5af2 40%, #ff9f0a 75%, #0a84ff)" }} />
                </div>
                <div className="absolute rounded-full" style={{ left: "24%", top: "14%", width: "20%", height: "11%", background: "rgba(255,255,255,0.95)", transform: "rotate(-25deg)" }} />
              </div>
            </div>
            <div className="text-[22px] font-semibold tracking-tight">The Orb</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Your portfolio is one glass marble. Companies are colors, the sealed rainbow orb is
              the index, and crashes deflate prices, never your shares. Five short Basics lessons,
              a guided tutorial, six eras of real market history, and a final planning lesson run
              in order as one course, and an open sandbox waits beside them.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#0071e3" }}>Play the Orb</div>
          </Link>

          <Link to="/garden" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <img src={S("pumpkin")} alt="" style={{ height: 104 }} />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Share Garden</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Share Garden teaches the same first lesson in a garden. Plant size is the market price, selling is
              transplanting to another gardener, the co-op field is the index, and frost is the
              crash you tend through.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#3f6b3a" }}>Play Share Garden</div>
          </Link>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-5">
          <Link to="/objectives" className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
            <div className="text-[15px] font-semibold tracking-tight">Learning objectives</div>
            <p className="text-[13px] mt-1" style={{ color: "#6e6e73" }}>
              Every unit is mapped to CEE and Jump$tart standards, with the misconception it busts
              and its assessment hook. The whole page prints on one sheet.
            </p>
          </Link>
          <Link to="/archive" className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
            <div className="text-[15px] font-semibold tracking-tight">Experiments</div>
            <p className="text-[13px] mt-1" style={{ color: "#6e6e73" }}>
              Design sketches made before a build, and the first-week prototypes kept for reference.
            </p>
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link to="/orb/intro" className="text-[12.5px] font-medium transition hover:opacity-75" style={{ color: "#0071e3" }}>
            New here, or showing a friend? Play the Orb's intro.
          </Link>
        </div>

        <p className="mt-10 text-[12.5px]" style={{ color: "#a1a1a6" }}>
          Everything here is free and open source, with no accounts and no logins, and it runs
          in a browser on a Chromebook. A deterministic simulation engine replays real historical
          market data, and every number is inspectable.
        </p>
      </main>
    </div>
  );
}
