import { useState } from "react";
import { Link } from "react-router-dom";
import { FIELD_ENTRIES, FieldEntry, MarbleState, guideState, marbleState } from "../lib/fieldGuide";

// The marble shelf and field guide in one screen. Playing opens a card;
// only a correct quick-check answer clears its marble. Cleared glass,
// cloudy glass (still setting), or an empty ring (not met yet).

const SUB = "#6e6e73";
const RAILS: { key: FieldEntry["rail"]; title: string }[] = [
  { key: "own", title: "What you own" },
  { key: "spread", title: "How you spread it" },
  { key: "wrong", title: "What can go wrong" },
];

function Marble({ entry, state, active, onClick }: {
  entry: FieldEntry; state: MarbleState; active: boolean; onClick: () => void;
}) {
  const base: React.CSSProperties = {
    width: 64, height: 64, borderRadius: "50%", position: "relative", cursor: "pointer", flexShrink: 0,
    transition: "transform 0.15s, box-shadow 0.15s",
    transform: active ? "scale(1.08)" : undefined,
  };
  if (state === "cleared") {
    base.background = `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.92), ${entry.color}55 55%, ${entry.color}bb)`;
    base.boxShadow = `inset 0 0 0 1.5px rgba(30,45,80,0.14), 0 10px 20px -10px ${entry.color}99`;
  } else if (state === "cloudy") {
    base.background = "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(228,230,236,0.7) 55%, rgba(206,210,220,0.85))";
    base.boxShadow = "inset 0 0 0 1.5px rgba(30,45,80,0.10), 0 8px 16px -10px rgba(24,34,60,0.3)";
  } else {
    base.background = "transparent";
    base.border = "2px dashed rgba(0,0,0,0.16)";
  }
  return (
    <button onClick={onClick} title={entry.title} style={base} aria-label={entry.title}>
      {state !== "empty" && (
        <span style={{ position: "absolute", left: "24%", top: "14%", width: "20%", height: "11%", background: "rgba(255,255,255,0.95)", borderRadius: "50%", transform: "rotate(-25deg)" }} />
      )}
    </button>
  );
}

export default function FieldGuidePage() {
  const s = guideState();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = FIELD_ENTRIES.find((e) => e.id === openId) ?? null;
  const cleared = FIELD_ENTRIES.filter((e) => marbleState(e.id, s) === "cleared").length;

  const stateLine = (st: MarbleState, unlocked: boolean) =>
    st === "cleared" ? "You proved this one."
      : st === "cloudy" ? "Still setting. Get its quick-check question right to clear it."
      : unlocked ? "Card open. Its marble clears when you answer its quick-check question right."
      : "You have not met this one in play yet.";

  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: "#1d1d1f", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/orb" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#1d1d1f" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          scenarios
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <span className="text-lg font-semibold tracking-tight">Field guide</span>
        <span className="ml-auto text-[13px] tnum" style={{ color: SUB }}>{cleared} of {FIELD_ENTRIES.length} proved</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <p className="text-[14px] max-w-xl" style={{ color: SUB }}>
          Every idea you meet in play gets a card here. Its marble clears when you prove it on a
          quick check, not when you finish a run. Nothing is ever taken back.
        </p>

        {RAILS.map((rail) => (
          <div key={rail.key} className="mt-7">
            <div className="text-[13px] font-semibold mb-3" style={{ color: SUB }}>{rail.title}</div>
            <div className="flex flex-wrap gap-4">
              {FIELD_ENTRIES.filter((e) => e.rail === rail.key).map((e) => (
                <div key={e.id} className="flex flex-col items-center gap-1.5" style={{ width: 84 }}>
                  <Marble entry={e} state={marbleState(e.id, s)} active={openId === e.id}
                    onClick={() => setOpenId(openId === e.id ? null : e.id)} />
                  <span className="text-[11px] text-center leading-tight" style={{ color: SUB }}>{e.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {open && (
          <div className="mt-8 rounded-2xl bg-white border border-black/8 shadow-sm p-5 pop-in max-w-xl">
            <div className="text-[16px] font-semibold tracking-tight">{open.title}</div>
            <p className="text-[13.5px] mt-1.5" style={{ color: "#3a3a3c" }}>
              {s.unlocked.includes(open.id) || marbleState(open.id, s) !== "empty"
                ? open.copy
                : "Play until you meet this one. Its card opens on its own."}
            </p>
            <div className="mt-2.5 flex items-baseline gap-3">
              <span className="text-[12px]" style={{ color: SUB }}>{stateLine(marbleState(open.id, s), s.unlocked.includes(open.id))}</span>
            </div>
            {(s.unlocked.includes(open.id) || marbleState(open.id, s) !== "empty") && (
              <a href={open.url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-[12.5px]"
                style={{ color: "#0071e3", textDecoration: "none", borderBottom: "1px dotted #0071e3" }}>
                Read more
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
