import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { roundPcts } from "../lib/orbModel";
import { OrbCardOpts, downloadOrbCard, shareOrbCard } from "../lib/orbCard";
import { useOrbName } from "../lib/orbIdentity";
import PlanMarble from "../components/PlanMarble";
import {
  KIND_META,
  MAX_PLAN_LINES,
  READY_ASSETS,
  READY_AS_OF,
  READY_MIRROR_LINE,
  ReadyLine,
  ReadyPath,
  ResolvedLine,
  clearReadyPlan,
  loadReadyPlan,
  mirrorLines,
  planSlices,
  resolvePlan,
  saveReadyPlan,
} from "../lib/readyAssets";

// The finale: Ready to invest? One door, two paths, one mirror.
//
// "I'm planning my first orb" builds a paper plan from the curated shelf in
// src/lib/readyAssets.ts; "I already own some" is the same flow framed as
// typing in what you hold. The flow follows the layout law in
// docs/course-style.md: screens replace each other (door, shelf, sizes,
// mirror), each screen shows at most one card, and the live marble stays on
// screen while the student edits. The twenty-asset shelf scrolls inside its
// card so the whole step, Continue included, fits one viewport like every
// other stepped screen. It ends in a printable one-page plan to discuss with
// a parent or a teacher.
//
// Standards (details beside each reading in src/lib/readyAssets.ts):
//   CEE Investing 8-2b, 8-5a, 8-5b, 8-6a; CEE Investing 12-2c for coins.
//
// The route is /orb/ready (mounted in src/main.tsx); the select screen links
// it as the final lesson card and shows the saved marble beside the named orb
// (src/pages/OrbSelect.tsx). Everything persists in localStorage only.
// FUTURE WORK NOTE: live prices later; today the shelf is a dated snapshot.

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const ACCENT = "#0071e3";

const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");

// The "about how much" column: whole counts print whole ("about 4 shares",
// "about 1 share"), tenths appear only when they carry information, and every
// sub-unit slice holds to the same two decimals.
function fmtHoldings(dollars: number, price: number | undefined, kind: string): string {
  if (!price || dollars <= 0) return "";
  const unit = kind === "coin" ? "coin" : "share";
  const s = dollars / price;
  if (s >= 100) return `about ${Math.round(s).toLocaleString("en-US")} ${unit}s`;
  if (s >= 0.995) {
    const tenths = Math.round(s * 10) / 10;
    if (Number.isInteger(tenths)) return tenths === 1 ? `about 1 ${unit}` : `about ${tenths} ${unit}s`;
    return `about ${tenths.toFixed(1)} ${unit}s`;
  }
  if (s >= 0.005) return `about ${s.toFixed(2)} of one ${unit}`;
  return `a very small slice of one ${unit}`;
}

const TONE_STYLE: Record<"watch" | "steady" | "note", { bg: string; border: string; dot: string }> = {
  watch: { bg: "rgba(255,159,10,0.10)", border: "rgba(178,80,0,0.28)", dot: "#b25000" },
  steady: { bg: "rgba(48,209,88,0.10)", border: "rgba(36,138,61,0.30)", dot: "#248a3d" },
  note: { bg: "#f4f4f6", border: "rgba(0,0,0,0.10)", dot: "#6e6e73" },
};

function nextCustomKey(lines: ReadyLine[]): string {
  let n = 0;
  for (const l of lines) {
    const m = /^custom-(\d+)$/.exec(l.key);
    if (m) n = Math.max(n, parseInt(m[1], 10));
  }
  return `custom-${n + 1}`;
}

// The three builder screens replace each other; the door stands before them.
type Screen = "door" | "pick" | "size" | "mirror";
const STEP_INDEX: Record<Exclude<Screen, "door">, number> = { pick: 0, size: 1, mirror: 2 };

function Dots({ step }: { step: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === step ? ACCENT : "rgba(0,0,0,0.16)" }} />
      ))}
    </span>
  );
}

export default function ReadyMode() {
  const saved = useMemo(loadReadyPlan, []);
  const hasSaved = !!saved && saved.lines.length > 0;
  const [path, setPath] = useState<ReadyPath | null>(hasSaved ? saved!.path : null);
  const [screen, setScreen] = useState<Screen>(hasSaved ? "size" : "door");
  const [lines, setLines] = useState<ReadyLine[]>(hasSaved ? saved!.lines : []);
  const [customName, setCustomName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [orbName] = useOrbName();

  // A plan only persists once it has at least one line; before that, a reload
  // still opens on the door, so the two-path choice is never one-way.
  useEffect(() => {
    if (path && lines.length > 0) {
      saveReadyPlan({ path, lines, savedAt: new Date().toISOString() });
    } else {
      clearReadyPlan();
    }
  }, [path, lines]);

  // screens replace each other; each one starts at the top
  useEffect(() => {
    setConfirmClear(false);
    window.scrollTo(0, 0);
  }, [screen]);

  const resolved = useMemo(() => resolvePlan(lines), [lines]);
  const funded = useMemo(() => resolved.filter((l) => l.dollars > 0), [resolved]);
  const total = funded.reduce((s, l) => s + l.dollars, 0);
  const slices = useMemo(() => planSlices(lines), [lines]);
  const mirror = useMemo(() => mirrorLines(lines), [lines]);
  const pcts = useMemo(() => roundPcts(funded.map((l) => l.dollars)), [funded]);

  const atCap = lines.length >= MAX_PLAN_LINES;

  const toggleAsset = (id: string) => {
    setLines((ls) => {
      if (ls.some((l) => l.assetId === id)) return ls.filter((l) => l.assetId !== id);
      if (ls.length >= MAX_PLAN_LINES) return ls;
      return [...ls, { key: id, assetId: id, dollars: 100 }];
    });
  };
  const addCustom = () => {
    const name = customName.trim();
    if (!name || atCap) return;
    setLines((ls) => (ls.length >= MAX_PLAN_LINES ? ls : [...ls, { key: nextCustomKey(ls), label: name, dollars: 100 }]));
    setCustomName("");
  };
  // Money inputs accept digits and at most one dot with two decimals, so a
  // held-down key or a pasted mess can never become a nonsense plan.
  const sanitizeDollars = (raw: string): string => {
    let s = raw.replace(/[^0-9.]/g, "");
    const dot = s.indexOf(".");
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
    if (s.length > 1 && s[0] === "0" && s[1] !== ".") s = s.replace(/^0+/, "") || "0";
    if (parseFloat(s) > 9_999_999) s = "9999999";
    return s;
  };
  const setDollars = (key: string, raw: string) => {
    const d = parseFloat(raw);
    const v = Number.isFinite(d) ? Math.max(0, Math.min(d, 9_999_999)) : 0;
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, dollars: v } : l)));
  };
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));
  const startOver = () => {
    clearReadyPlan();
    setLines([]);
    setPath(null);
    setScreen("door");
    setConfirmClear(false);
  };
  const back = () => {
    if (screen === "pick") setScreen("door");
    else if (screen === "size") setScreen("pick");
    else if (screen === "mirror") setScreen("size");
  };

  // The shareable card: the same marble and lines as the mirror, drawn to a
  // PNG. Save downloads it; Share hands it to the phone's share sheet where
  // the browser supports files, and falls back to the download where it can't.
  const cardOpts = (): OrbCardOpts => ({
    comp: slices,
    value: total,
    headline: orbName ? `This is ${orbName}.` : "This is my orb.",
    subline: `${path === "own" ? "What I hold" : "My first orb, on paper"} · ${printDate}`,
    rows: [...resolved].filter((l) => l.dollars > 0).sort((a, b) => b.dollars - a.dollars).slice(0, 4)
      .map((l) => ({ color: l.color, label: l.name, right: usd(l.dollars) })),
    footer: "Made in The Orb · Share Garden",
  });
  const saveCardImage = () => downloadOrbCard(cardOpts(), "my-orb.png");
  const shareCard = () => shareOrbCard(cardOpts(), "my-orb.png", orbName || "My orb");

  const added = new Set(lines.map((l) => l.assetId).filter(Boolean));
  const customLines = resolved.filter((l) => l.kind === "custom");
  const otherPath: ReadyPath = path === "first" ? "own" : "first";
  const printDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const pathEyebrow = path === "first" ? "Planning my first orb" : "What I already own";
  const orbHeading = path === "first" ? "The orb you are planning" : "The orb you already hold";

  // The compact live marble that stays on screen while the student edits. The
  // strip is sticky, so scrolling the shelf or the lines never hides it.
  const marbleStrip = (
    <div className="mt-5 sticky top-0 z-10 -mx-6 px-6 py-2 flex items-center gap-4"
      style={{ background: "rgba(245,245,247,0.94)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <PlanMarble slices={slices} total={total} size={104} ariaLabel="Your marble, drawn live from your lines" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold" style={{ color: SUB }}>{orbHeading}</div>
        {total > 0 ? (
          <>
            <div className="text-[24px] tnum font-semibold tracking-tight">{usd(total)}</div>
            <div className="text-[11.5px]" style={{ color: SUB }}>
              {lines.length === 1 ? "It holds 1 line." : `It holds ${lines.length} lines.`}
            </div>
          </>
        ) : (
          <p className="text-[12px] leading-snug max-w-[230px]" style={{ color: SUB }}>
            The marble is empty glass. It fills as your lines take dollars.
          </p>
        )}
      </div>
    </div>
  );

  const stepHeader = (eyebrow: string, definition: string, story: string) => (
    <>
      <div className="flex items-center gap-3">
        <button onClick={back} aria-label="Back one step"
          className="w-7 h-7 -ml-1.5 rounded-full flex items-center justify-center transition hover:bg-black/5" style={{ color: SUB }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {screen !== "door" && <Dots step={STEP_INDEX[screen as Exclude<Screen, "door">]} />}
        <span className="text-[12px] font-semibold tracking-wide" style={{ color: SUB }}>{eyebrow}</span>
      </div>
      <p className="mt-3 text-[20px] font-semibold tracking-tight leading-snug">{definition}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "#3a3a3c" }}>{story}</p>
    </>
  );

  const continueButton = (label: string, disabled: boolean, onClick: () => void) => (
    <div className="mt-6 flex justify-end">
      <button onClick={onClick} disabled={disabled}
        className="text-[13.5px] font-medium px-6 py-2.5 rounded-full text-white transition disabled:opacity-35"
        style={{ background: ACCENT }}>
        {label}
      </button>
    </div>
  );

  return (
    <div className="min-h-full" style={{ background: "#f5f5f7", color: INK, colorScheme: "light" }}>
      <style>{`
        .rd-print { display: none; }
        @media print {
          @page { size: letter portrait; margin: 0.5in; }
          html, body { background: #ffffff !important; }
          .rd-noprint { display: none !important; }
          .rd-print { display: block !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* ------------------------------ screen ------------------------------ */}
      <div className="rd-noprint">
        <header className="flex items-center gap-4 px-6 sm:px-10 h-14">
          <Link to="/orb" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: INK }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            scenarios
          </Link>
          <div className="h-5 w-px bg-black/10" />
          <span className="text-lg font-semibold tracking-tight">Ready to invest?</span>
          <span className="ml-auto text-[11px] flex-shrink-0 hidden sm:inline" style={{ color: "#a1a1a6" }}>
            CEE Investing 8-2b · 8-5 · 8-6a · 12-2c
          </span>
        </header>

        {screen === "door" || path === null ? (
          /* ------------------------------ the door -------------------------- */
          <main className="max-w-2xl mx-auto px-6 pt-8 pb-16">
            <div className="text-[12px] font-semibold tracking-wide" style={{ color: SUB }}>The last lesson · One door, two paths</div>
            <p className="mt-1.5 text-[22px] font-semibold tracking-tight leading-snug">
              A plan is a set of choices you write down before any money moves.
            </p>
            <p className="mt-2 text-[14px] leading-relaxed max-w-xl" style={{ color: "#3a3a3c" }}>
              You have carried a marble through booms, crashes, and slow recoveries. This page points
              everything you practiced at your own money. It will not tell you what to buy. It will
              show you the shape of what you are thinking, the way a mirror shows you a haircut.
            </p>

            <div className="mt-6 rounded-3xl bg-white border border-black/8 shadow-sm p-2 grid sm:grid-cols-2">
              <button onClick={() => { setPath("first"); setScreen("pick"); }}
                className="text-left rounded-2xl p-5 transition hover:bg-black/[0.03]">
                <div className="text-[12px] font-semibold" style={{ color: ACCENT }}>Path one</div>
                <div className="mt-1 text-[18px] font-semibold tracking-tight">I'm planning my first orb</div>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: SUB }}>
                  You have not bought anything real yet. Build the orb you are thinking about, in real
                  names and real dollars, and look at its shape before a single dollar moves.
                </p>
                <div className="mt-4 text-[13px] font-medium" style={{ color: ACCENT }}>Open this door</div>
              </button>
              <button onClick={() => { setPath("own"); setScreen("pick"); }}
                className="text-left rounded-2xl p-5 transition hover:bg-black/[0.03] border-t border-black/8 sm:border-t-0 sm:border-l">
                <div className="text-[12px] font-semibold" style={{ color: ACCENT }}>Path two</div>
                <div className="mt-1 text-[18px] font-semibold tracking-tight">I already own some</div>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: SUB }}>
                  Maybe a relative gave you a stock, or you bought a coin with birthday money. Type in
                  what you own and let the mirror show you what you are already carrying.
                </p>
                <div className="mt-4 text-[13px] font-medium" style={{ color: ACCENT }}>Open this door</div>
              </button>
            </div>

            <p className="mt-8 text-[12.5px] text-center" style={{ color: SUB }}>{READY_MIRROR_LINE}</p>
          </main>
        ) : screen === "pick" ? (
          /* ------------------------------ step 1: the shelf ------------------ */
          <main className="max-w-2xl mx-auto px-6 pt-6 pb-8">
            {stepHeader(
              `Step 1 of 3 · ${pathEyebrow}`,
              "An asset is one thing you can own that has a price of its own.",
              path === "first"
                ? `The shelf below holds twenty real assets with prices from ${READY_AS_OF}. Broad funds sit first because a wide basket is the plain move, not the fancy one. Tap each line you are thinking about, and type in anything the shelf does not carry.`
                : `The shelf below holds twenty real assets with prices from ${READY_AS_OF}. Tap each thing you already hold, and type in anything the shelf does not carry.`
            )}
            {marbleStrip}

            <section className="mt-5 rounded-3xl bg-white border border-black/8 shadow-sm p-5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-[15px] font-semibold tracking-tight">The shelf</h2>
                <span className="text-[12px]" style={{ color: SUB }}>
                  Prices are rounded closing prices as of {READY_AS_OF}, and real prices have moved since then. The shelf scrolls.
                </span>
              </div>

              <div className="mt-1 overflow-y-auto pr-1 -mr-1"
                style={{ maxHeight: "clamp(160px, 20vh, 300px)", overscrollBehavior: "contain" }}>
              {KIND_META.map((k) => (
                <div key={k.kind} className="mt-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div className="text-[12.5px] font-semibold">{k.label}</div>
                    <div className="text-[11.5px]" style={{ color: SUB }}>{k.gloss}</div>
                  </div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                    {READY_ASSETS.filter((a) => a.kind === k.kind).map((a) => {
                      const isAdded = added.has(a.id);
                      return (
                        <button key={a.id} onClick={() => toggleAsset(a.id)} title={a.note}
                          disabled={!isAdded && atCap}
                          aria-pressed={isAdded}
                          className="flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition disabled:opacity-45"
                          style={{
                            background: isAdded ? "rgba(0,113,227,0.06)" : "#fafafc",
                            borderColor: isAdded ? "rgba(0,113,227,0.35)" : "rgba(0,0,0,0.08)",
                          }}>
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.color }} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-medium truncate">{a.name}</span>
                            <span className="block text-[10.5px]" style={{ color: SUB }}>{a.ticker}</span>
                          </span>
                          <span className="flex-shrink-0 text-right">
                            <span className="block text-[12px] tnum font-medium">{usd(a.price)}</span>
                            <span className="block text-[10.5px] font-medium" style={{ color: isAdded ? ACCENT : "#a1a1a6" }}>
                              {isAdded ? "Added · tap to remove" : "Add"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              </div>

              <div className="mt-4 pt-4 border-t border-black/8">
                <div className="text-[12.5px] font-medium">Type in something else</div>
                <p className="text-[11.5px] mt-0.5" style={{ color: SUB }}>
                  A typed line counts toward the marble's size and spread, and the mirror reads it like a single name.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input value={customName} maxLength={28}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
                    placeholder="What is it called?"
                    className="text-[13px] rounded-lg border border-black/10 bg-white px-3 py-1.5 outline-none focus:border-black/25 transition min-w-0 flex-1"
                    style={{ maxWidth: 240 }} />
                  <button onClick={addCustom} disabled={!customName.trim() || atCap}
                    className="text-[12.5px] font-medium px-4 py-1.5 rounded-full text-white transition disabled:opacity-35"
                    style={{ background: ACCENT }}>
                    Add
                  </button>
                </div>
                {customLines.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {customLines.map((l) => (
                      <span key={l.key} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]"
                        style={{ background: "rgba(0,113,227,0.06)", borderColor: "rgba(0,113,227,0.35)" }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                        {l.name}
                        <button onClick={() => removeLine(l.key)} aria-label={`Remove ${l.name}`}
                          className="w-4 h-4 rounded-full flex items-center justify-center transition hover:bg-black/5" style={{ color: SUB }}>
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                            <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {atCap && (
                <p className="mt-3 text-[12px]" style={{ color: "#b25000" }}>
                  The shelf closes at twelve lines. A plan that fits on one printed page is a plan you can actually read.
                </p>
              )}
            </section>

            {continueButton("Continue", lines.length === 0, () => setScreen("size"))}
          </main>
        ) : screen === "size" ? (
          /* ------------------------------ step 2: dollar sizes --------------- */
          <main className="max-w-2xl mx-auto px-6 pt-6 pb-16">
            {stepHeader(
              `Step 2 of 3 · ${pathEyebrow}`,
              "Position size is the share of your money that rides on one line.",
              path === "first"
                ? "Give each line a dollar amount and watch the marble above take shape. The dollars stay on paper, which is exactly why this is the safest place to practice."
                : "Type about how many dollars each line is worth today. The marble above puts everything you hold into one glass, the same way every era in this course did."
            )}
            {marbleStrip}

            <section className="mt-5 rounded-3xl bg-white border border-black/8 shadow-sm p-5">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight">Your lines</h2>
                <span className="text-[12px]" style={{ color: SUB }}>
                  {path === "first" ? "Each line is one thing you would buy." : "Each line is one thing you hold."}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {resolved.map((l: ResolvedLine) => (
                  <div key={l.key} className="rounded-xl border border-black/8 px-3.5 py-2.5" style={{ background: "#fafafc" }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <span className="text-[13px] font-medium">{l.name}</span>
                        <span className="ml-1.5 text-[11px] whitespace-nowrap" style={{ color: SUB }}>{l.sub}</span>
                      </div>
                      <button onClick={() => removeLine(l.key)} aria-label={`Remove ${l.name}`}
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition hover:bg-black/5"
                        style={{ color: SUB }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                          <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 pl-[22px]">
                      <span className="text-[13px]" style={{ color: SUB }}>$</span>
                      <input
                        type="text" inputMode="decimal" autoComplete="off"
                        value={drafts[l.key] ?? String(l.dollars)}
                        onChange={(e) => {
                          const raw = sanitizeDollars(e.target.value);
                          setDrafts((d) => ({ ...d, [l.key]: raw }));
                          setDollars(l.key, raw);
                        }}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={() => setDrafts((d) => { const { [l.key]: _gone, ...rest } = d; return rest; })}
                        className="tnum w-28 text-[13.5px] font-medium text-right rounded-lg border border-black/10 bg-white px-2 py-1 outline-none focus:border-black/25 transition"
                        aria-label={`Dollars for ${l.name}`}
                      />
                      <span className="text-[11px] tnum" style={{ color: "#a1a1a6" }}>
                        {fmtHoldings(l.dollars, l.price, l.kind)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setScreen("pick")} className="mt-3 text-[12.5px] font-medium transition hover:opacity-75" style={{ color: ACCENT }}>
                Add or remove lines on the shelf.
              </button>
            </section>

            {continueButton("Continue", total <= 0, () => setScreen("mirror"))}
          </main>
        ) : (
          /* ------------------------------ step 3: the mirror ----------------- */
          <main className="max-w-2xl mx-auto px-6 pt-6 pb-16">
            {stepHeader(
              `Step 3 of 3 · ${pathEyebrow}`,
              "Concentration is the share of an orb that leans on one name.",
              "The mirror below reads your plan the way this course read every era, by looking backward at crashes that already happened. When the shape looks like something you could hold through a bad year, print it and talk it over with a parent or a teacher."
            )}

            <div className="mt-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
              <PlanMarble slices={slices} total={total} size={190} ariaLabel="Your marble, drawn from your plan" />
              <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                <div className="text-[11px] font-semibold" style={{ color: SUB }}>{orbHeading}</div>
                <div className="text-[30px] tnum font-semibold tracking-tight">{usd(total)}</div>
                <div className="mt-2 flex flex-col gap-1">
                  {funded.map((l, i) => (
                    <div key={l.key} className="flex items-center gap-2 text-[12px]">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className="tnum flex-shrink-0" style={{ color: SUB }}>{usd(l.dollars)} · {pcts[i]}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <section className="mt-5 rounded-3xl bg-white border border-black/8 shadow-sm p-5">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight">The mirror</h2>
                <span className="text-[11.5px]" style={{ color: SUB }}>Every reading looks backward.</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {mirror.map((m, i) => {
                  const t = TONE_STYLE[m.tone];
                  return (
                    <div key={i} className="rounded-xl border px-3.5 py-2.5 flex gap-2.5"
                      style={{ background: t.bg, borderColor: t.border }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0 mt-[5px]" style={{ background: t.dot }} />
                      <p className="text-[12.5px] leading-relaxed">{m.text}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="mt-6 flex flex-col gap-2.5 max-w-sm mx-auto">
              <div className="flex justify-center gap-2.5 flex-wrap">
                <button onClick={saveCardImage} disabled={total <= 0}
                  className="text-[13.5px] font-medium px-5 py-2.5 rounded-full text-white transition disabled:opacity-35"
                  style={{ background: ACCENT }}>
                  Save as image
                </button>
                <button onClick={shareCard} disabled={total <= 0}
                  className="text-[13.5px] font-medium px-5 py-2.5 rounded-full border transition disabled:opacity-35"
                  style={{ color: ACCENT, borderColor: "rgba(0,113,227,0.4)", background: "#fff" }}>
                  Share
                </button>
              </div>
              <button onClick={() => window.print()} disabled={total <= 0}
                className="text-[12.5px] font-medium transition disabled:opacity-35 hover:opacity-75"
                style={{ color: SUB }}>
                Print this plan instead
              </button>
              <p className="text-[11.5px] text-center" style={{ color: SUB }}>
                The card is a picture of your marble and its lines. The printed page adds three
                questions to ask a parent or a teacher together.
              </p>
              {confirmClear ? (
                <div className="flex items-center justify-center gap-3 text-[12px] flex-wrap">
                  <span style={{ color: SUB }}>Clear every line and go back to the door?</span>
                  <button onClick={startOver} className="font-medium transition hover:opacity-75" style={{ color: "#b2251d" }}>
                    Yes, clear it
                  </button>
                  <button onClick={() => setConfirmClear(false)} className="font-medium transition hover:opacity-75" style={{ color: ACCENT }}>
                    Keep my lines
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4 text-[12px]">
                  <button onClick={() => setPath(otherPath)} className="font-medium transition hover:opacity-75" style={{ color: ACCENT }}>
                    {otherPath === "own" ? "Switch to: I already own some" : "Switch to: I'm planning my first orb"}
                  </button>
                  <span style={{ color: "#d2d2d7" }}>·</span>
                  <button onClick={() => setConfirmClear(true)} className="font-medium transition hover:opacity-75" style={{ color: SUB }}>
                    Start over
                  </button>
                </div>
              )}
              <p className="mt-1 text-[12.5px] text-center" style={{ color: SUB }}>{READY_MIRROR_LINE}</p>
            </div>
          </main>
        )}
      </div>

      {/* ------------------------------ print sheet ------------------------ */}
      <div className="rd-print px-2" style={{ background: "#ffffff", color: INK }}>
        <h1 className="text-[26px] font-semibold tracking-tight leading-tight">
          {path === "own" ? "The orb I hold today" : "My first orb, on paper"}
        </h1>
        <p className="text-[11px] mt-1" style={{ color: SUB }}>
          Built with Share Garden on {printDate}.{orbName ? ` The orb's name is ${orbName}.` : ""} Prices
          are rounded closing prices as of {READY_AS_OF}, and real prices have moved since then.
        </p>

        <div className="mt-2 flex items-center gap-6">
          <PlanMarble slices={slices} total={total} size={150} ariaLabel="Your marble, drawn from your plan" />
          <div>
            <div className="text-[11px] font-semibold" style={{ color: SUB }}>
              {path === "own" ? "What it is worth today" : "Planned size"}
            </div>
            <div className="text-[30px] tnum font-semibold tracking-tight">{usd(total)}</div>
            <div className="text-[11px]" style={{ color: SUB }}>
              {funded.length} {funded.length === 1 ? "line" : "lines"}
            </div>
          </div>
        </div>

        <table className="mt-2 w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-left" style={{ color: SUB }}>
              <th className="font-semibold py-1 pr-2">Name</th>
              <th className="font-semibold py-1 pr-2">What it is</th>
              <th className="font-semibold py-1 pr-2 text-right">Dollars</th>
              <th className="font-semibold py-1 pr-2 text-right">Share of orb</th>
              <th className="font-semibold py-1 text-right">About how much</th>
            </tr>
          </thead>
          <tbody>
            {funded.map((l, i) => (
              <tr key={l.key} style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
                <td className="py-1 pr-2 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: l.color }} />
                  {l.name}
                </td>
                <td className="py-1 pr-2" style={{ color: SUB }}>{l.sub}</td>
                <td className="py-1 pr-2 text-right tnum">{usd(l.dollars)}</td>
                <td className="py-1 pr-2 text-right tnum">{pcts[i]}%</td>
                <td className="py-1 text-right tnum" style={{ color: SUB }}>{fmtHoldings(l.dollars, l.price, l.kind) || "typed in"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3">
          <div className="text-[12px] font-semibold">What the mirror said</div>
          <div className="mt-1 flex flex-col gap-1">
            {mirror.map((m, i) => (
              <p key={i} className="text-[10.5px] leading-snug flex gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[4px]" style={{ background: TONE_STYLE[m.tone].dot }} />
                <span>{m.text}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[12px] font-semibold">Talk it over with an adult</div>
          <ol className="mt-1 flex flex-col gap-1 text-[10.5px] leading-snug list-decimal pl-4">
            <li>Which slice would hurt the most if its price fell by half, and would we hold it or sell it?</li>
            <li>How long could this money stay put before we would need it back? Emergency money lives in savings, not in the market.</li>
            <li>What one change would make this orb harder to break?</li>
          </ol>
        </div>

        <div className="mt-4 flex gap-8 text-[10px]" style={{ color: SUB }}>
          <div className="flex-1">
            <div style={{ borderBottom: "1px solid rgba(0,0,0,0.4)", height: 22 }} />
            <div className="mt-0.5">Student</div>
          </div>
          <div className="flex-1">
            <div style={{ borderBottom: "1px solid rgba(0,0,0,0.4)", height: 22 }} />
            <div className="mt-0.5">Parent or teacher</div>
          </div>
          <div className="w-28">
            <div style={{ borderBottom: "1px solid rgba(0,0,0,0.4)", height: 22 }} />
            <div className="mt-0.5">Date</div>
          </div>
        </div>

        <p className="mt-3 text-[10px]" style={{ color: "#a1a1a6" }}>
          {READY_MIRROR_LINE} Share Garden · The Orb.
        </p>
      </div>
    </div>
  );
}
