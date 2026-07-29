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
    thesis: "One bed you tend. Go to market to plant crops, watch them grow together, harvest to sell. A co-op field quietly beats the hot crop.",
    proves: "The metaphor maps market structure, not labor. Cozy and sticky.",
    art: <GardenThumbs />,
  },
  {
    to: "/pulse",
    slot: "A",
    name: "Pulse",
    kind: "the whole market",
    accent: "#56c7ff",
    thesis: "The entire market as one living map. Every tile is a company sized by its market cap, colored by how it is doing. Tap to buy.",
    proves: "The market at a glance. A shock sweeps a whole sector red.",
    art: (
      <svg viewBox="0 0 120 70" className="w-32 h-20">
        {[["0","0","46","40","#2f9e5e"],["0","41","46","29","#d24a4a"],["47","0","34","28","#3fbf74"],["47","29","34","41","#7a3636"],["82","0","38","20","#d24a4a"],["82","21","38","26","#2f9e5e"],["82","48","38","22","#46b06a"]].map((r,i)=>(
          <rect key={i} x={+r[0]+1} y={+r[1]+1} width={+r[2]-2} height={+r[3]-2} rx="1.5" fill={r[4]} />
        ))}
      </svg>
    ),
  },
  {
    to: "/prism",
    slot: "B",
    name: "Prism",
    kind: "the market as geometry",
    accent: "#9b8cff",
    thesis: "The same market rebuilt from pure shapes. Hex towers sized by market cap, glowing by performance. Tap a tower to trade.",
    proves: "Size and momentum you can feel. Structure as geometry.",
    art: (
      <svg viewBox="0 0 120 70" className="w-32 h-20">
        {[[34,44,16,"#46b06a"],[62,30,18,"#9b8cff"],[88,46,15,"#d24a4a"],[50,54,12,"#3fbf74"]].map(([cx,cy,r,c],i)=>{
          const pts=[0,60,120,180,240,300].map(a=>{const rad=a*Math.PI/180;return `${(cx as number)+ (r as number)*Math.cos(rad)},${(cy as number)+(r as number)*Math.sin(rad)}`;}).join(" ");
          return <polygon key={i} points={pts} fill={c as string} fillOpacity="0.92" stroke="#000" strokeOpacity="0.25" />;
        })}
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
