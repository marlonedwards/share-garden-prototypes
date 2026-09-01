import { Link } from "react-router-dom";
import { UI_FONT } from "../lib/type";

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
      <text x="44" y="58" textAnchor="middle" fontSize="12" fontWeight="600" fill="#F4F7FB" fontFamily={UI_FONT}>Roblox</text>
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

// Trigger's motif: one candle mid-flip between the two calls, in the game's
// own dark, one-stock language.
function TriggerMotif() {
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      <rect x="0" y="0" width="118" height="104" rx="14" fill="#0C0F14" />
      <path d="M14,70 L34,58 L50,64 L68,40 L86,46 L104,24" stroke="#2A3646" strokeWidth="2" fill="none" />
      <rect x="46" y="38" width="10" height="30" rx="2" fill="#3FAE6B" />
      <rect x="50" y="28" width="2" height="10" fill="#3FAE6B" />
      <circle cx="104" cy="24" r="4" fill="#3FAE6B" />
    </svg>
  );
}

// The Floor's motif: a short desk row across five eras, in the game's own
// flat, dark-arena language.
function FloorMotif() {
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      <rect x="0" y="0" width="118" height="104" rx="14" fill="#0C0F14" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={12 + i * 20} y={78 - [24, 40, 18, 52, 32][i]} width="14" height={[24, 40, 18, 52, 32][i]} rx="2" fill={i === 3 ? "#D98A00" : "#2A3646"} />
      ))}
    </svg>
  );
}

// Monkey Trade's motif: a dart board with one dart in it, in the game's own
// warm, sky and gold language.
function MonkeyMotif() {
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      <circle cx="52" cy="52" r="40" fill="#1CB0F6" />
      <circle cx="52" cy="52" r="30" fill="#FFFBF2" />
      <circle cx="52" cy="52" r="20" fill="#1CB0F6" />
      <circle cx="52" cy="52" r="10" fill="#FFFBF2" />
      <circle cx="52" cy="52" r="4" fill="#FFC800" />
      <path d="M52,12 V92 M12,52 H92" stroke="rgba(60,60,60,0.16)" strokeWidth="1.5" />
      <path d="M66,38 L104,14" stroke="#3C3C3C" strokeWidth="3" strokeLinecap="round" />
      <path d="M104,14 L96,12 L98,20 Z" fill="#FFC800" />
      <circle cx="66" cy="38" r="4.5" fill="#FFC800" />
    </svg>
  );
}

// Stack's motif, in the game's own language: two checker-chip stacks on
// felt beside one cream strategy card.
function StackMotif() {
  const disc = (x: number, y: number, face: string, edge: string, stripe: string) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="40" height="11" rx="5.5" fill={edge} />
      <rect x={x} y={y} width="40" height="8" rx="4" fill={face} />
      {[6, 18, 30].map((sx) => (
        <rect key={sx} x={x + sx} y={y} width="4" height="11" rx="1" fill={stripe} opacity="0.7" />
      ))}
    </g>
  );
  const red = ["#d95c4e", "#9c3226", "#f7edd0"] as const;
  const slate = ["#9aa4ab", "#6a7278", "#f7edd0"] as const;
  return (
    <svg width="118" height="104" viewBox="0 0 118 104" fill="none" aria-hidden>
      <rect x="0" y="0" width="118" height="104" rx="14" fill="#266243" />
      {[0, 1, 2, 3].map((i) => disc(12, 78 - i * 9, red[0], red[1], red[2]))}
      <ellipse cx="32" cy="52" rx="20" ry="6" fill="#d95c4e" stroke="#9c3226" strokeWidth="1.5" strokeDasharray="4 3" />
      {[0, 1].map((i) => disc(58, 78 - i * 9, slate[0], slate[1], slate[2]))}
      <ellipse cx="78" cy="70" rx="20" ry="6" fill="#9aa4ab" stroke="#6a7278" strokeWidth="1.5" strokeDasharray="4 3" />
      <g transform="rotate(6 92 40)">
        <rect x="74" y="14" width="36" height="50" rx="5" fill="#f4ecd6" />
        <rect x="77" y="17" width="30" height="44" rx="3.5" fill="none" stroke="rgba(90,70,30,0.35)" strokeWidth="2" />
        <path d="M92 26 L99 35 H95 V43 H89 V35 H85 Z" fill="#3d8c5b" />
        <rect x="82" y="50" width="20" height="3" rx="1.5" fill="rgba(0,0,0,0.18)" />
      </g>
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
          <Link to="/stack" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <StackMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Stack</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Learn stocks daily.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#266243" }}>Play Stack</div>
          </Link>

          <Link to="/tally" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <TallyMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">The Tally</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Build a wall out of what you own.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#B57A00" }}>Play the Tally</div>
          </Link>

          <Link to="/trigger" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <TriggerMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Trigger</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Time the market, if you can.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#14603C" }}>Play Trigger</div>
          </Link>

          <Link to="/floor" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <FloorMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">The Floor</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Trade five decades and keep what you make.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#B57A00" }}>Play the Floor</div>
          </Link>

          <Link to="/monkey" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <MonkeyMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Monkey Trade</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Beat the monkeys who threw darts.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#46A302" }}>Play Monkey Trade</div>
          </Link>

          <Link to="/takeover" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <TakeoverMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Takeover</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Eat every company smaller than you.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#14603C" }}>Play Takeover</div>
          </Link>

          <Link to="/worth" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <WorthMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Worth More</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Pick the company worth more.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#7C3AED" }}>Play Worth More</div>
          </Link>

          <Link to="/guess" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <GuessMotif />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Guess the Stock</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Name the company from its stock chart.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#14603C" }}>Play Guess the Stock</div>
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
              Hold one glass marble through real market history.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#0071e3" }}>Play the Orb</div>
          </Link>

          <Link to="/garden" className="group rounded-3xl bg-white border border-black/8 shadow-sm p-7 transition hover:shadow-md hover:-translate-y-0.5 flex flex-col">
            <div className="h-28 flex items-center justify-center mb-4">
              <img src={S("pumpkin")} alt="" style={{ height: 104 }} />
            </div>
            <div className="text-[22px] font-semibold tracking-tight">Share Garden</div>
            <p className="text-[13.5px] mt-1.5 flex-1 line-clamp-4" style={{ color: "#6e6e73" }}>
              Grow a garden that moves with the market.
            </p>
            <div className="mt-4 text-[13px] font-medium px-4 py-2 rounded-full text-white inline-flex items-center justify-center leading-none transition group-hover:brightness-110" style={{ background: "#3f6b3a" }}>Play Share Garden</div>
          </Link>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-5">
          <Link to="/objectives" className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
            <div className="text-[15px] font-semibold tracking-tight">Learning objectives</div>
            <p className="text-[13px] mt-1" style={{ color: "#6e6e73" }}>
              Every unit mapped to the standards it covers.
            </p>
          </Link>
          <Link to="/archive" className="rounded-2xl bg-white border border-black/8 shadow-sm p-5 transition hover:shadow-md">
            <div className="text-[15px] font-semibold tracking-tight">Experiments</div>
            <p className="text-[13px] mt-1" style={{ color: "#6e6e73" }}>
              Sketches and prototypes kept for reference.
            </p>
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link to="/orb/intro" className="text-[12.5px] font-medium transition hover:opacity-75" style={{ color: "#0071e3" }}>
            Start with the Orb's intro.
          </Link>
        </div>

        <p className="mt-10 text-[12.5px]" style={{ color: "#a1a1a6" }}>
          Free and open source, built on real market data.
        </p>
      </main>
    </div>
  );
}
