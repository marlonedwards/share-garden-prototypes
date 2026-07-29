import { Link } from "react-router-dom";
import { useSpriteUrls, spriteUrl } from "../lib/sprites";

function GardenThumbs() {
  const urls = useSpriteUrls(["tomato", "corn"]);
  return (
    <div className="flex items-end gap-1">
      <img src={urls["tomato"] || spriteUrl("tomato")} className="h-28 drop-shadow-xl" style={{ imageRendering: "pixelated" }} alt="" />
      <img src={urls["corn"] || spriteUrl("corn")} className="h-24 drop-shadow-xl" style={{ imageRendering: "pixelated" }} alt="" />
    </div>
  );
}

interface Card {
  to: string;
  slot: string;
  name: string;
  kind: string;
  accent: string;
  thesis: string;
  proves: string;
  art: JSX.Element;
}

const CARDS: Card[] = [
  {
    to: "/garden",
    slot: "C",
    name: "Share Garden",
    kind: "the gardening bet",
    accent: "#7fb069",
    thesis: "A market you tend. Plant to buy, harvest to sell, and a co-op field that quietly beats the hot crop.",
    proves: "The metaphor maps market structure, not labor. Cozy and sticky.",
    art: <GardenThumbs />,
  },
  {
    to: "/pulse",
    slot: "A",
    name: "Pulse",
    kind: "no metaphor",
    accent: "#56c7ff",
    thesis: "The market as itself. Stocks read as stocks, crypto as crypto. Live prices, buy and sell, the index line to beat.",
    proves: "The honest baseline. What a straight, well-made trading sim feels like.",
    art: (
      <svg viewBox="0 0 120 70" className="w-32 h-20">
        <polyline points="0,55 15,50 30,58 45,40 60,44 75,25 90,30 105,14 120,20" fill="none" stroke="#56c7ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="0,60 30,54 60,46 90,36 120,26" fill="none" stroke="#7f8ba0" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>
    ),
  },
  {
    to: "/flows",
    slot: "B",
    name: "Flows",
    kind: "the systems view",
    accent: "#9b8cff",
    thesis: "Money as a living field. Sectors are nodes, capital streams between them, and you steer where your money flows.",
    proves: "Diversification and correlation you can see. Structure, not soil.",
    art: (
      <svg viewBox="0 0 120 70" className="w-32 h-20">
        <line x1="24" y1="20" x2="60" y2="38" stroke="#9b8cff" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="96" y1="18" x2="60" y2="38" stroke="#56c7ff" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="30" y1="56" x2="60" y2="38" stroke="#ffb454" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="92" y1="54" x2="60" y2="38" stroke="#7ee0c0" strokeWidth="1.5" strokeOpacity="0.6" />
        <circle cx="24" cy="20" r="7" fill="#9b8cff" /><circle cx="96" cy="18" r="6" fill="#56c7ff" />
        <circle cx="30" cy="56" r="6" fill="#ffb454" /><circle cx="92" cy="54" r="5" fill="#7ee0c0" />
        <circle cx="60" cy="38" r="9" fill="#fff" fillOpacity="0.9" />
      </svg>
    ),
  },
];

export default function Landing() {
  return (
    <div className="min-h-full" style={{ background: "radial-gradient(1100px 600px at 50% -5%, #182234, #0a0d13 55%)" }}>
      <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20">
        <div className="text-[11px] tracking-[0.03em] font-medium text-white/35 mb-5">Share Garden / metaphor study</div>
        <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.02] max-w-3xl">
          One market. Three ways to feel it.
        </h1>
        <p className="mt-6 text-white/60 text-lg max-w-2xl leading-relaxed">
          The teaching goal is fixed: time in the market beats timing it, and a diversified index quietly wins.
          The open question is which world carries that lesson. Each prototype below runs the
          same deterministic market underneath. Same seed, same season, three lenses. Play them and pick the one that clicks.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <Link key={c.to} to={c.to}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col hover:border-white/25 hover:bg-white/[0.05] transition overflow-hidden">
              <div className="absolute -top-8 -right-6 text-[120px] font-display font-semibold leading-none select-none pointer-events-none opacity-[0.06]">{c.slot}</div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c.accent + "22", color: c.accent }}>{c.slot}</span>
                <span className="text-[11px] tracking-[0.03em] font-medium text-white/35">{c.kind}</span>
              </div>
              <div className="font-display text-2xl font-semibold text-white mb-3">{c.name}</div>
              <div className="h-24 flex items-center">{c.art}</div>
              <p className="mt-3 text-sm text-white/65 leading-relaxed">{c.thesis}</p>
              <div className="mt-4 pt-4 border-t border-white/8 text-xs text-white/45 leading-relaxed">{c.proves}</div>
              <div className="mt-4 text-sm font-medium flex items-center gap-1.5 transition group-hover:gap-2.5" style={{ color: c.accent }}>
                play it
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4.5 2 L8.5 6 L4.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-xs text-white/30 max-w-2xl leading-relaxed">
          Prototype study, not the product. The real Share Garden is a native build. These exist to settle the
          metaphor before the art and engine get committed. Best viewed on a laptop.
        </div>
      </div>
    </div>
  );
}
