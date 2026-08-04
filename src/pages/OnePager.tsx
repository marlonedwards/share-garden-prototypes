import { Link } from "react-router-dom";

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const ACCENT = "#0071e3";

type Status = "Playable today" | "Planned";

interface Cite {
  src: "CEE" | "Jump$tart";
  code: string;
  gloss: string;
}

interface Unit {
  game: string;
  name: string;
  note: string;
  status: Status;
  objective: JSX.Element;
  misconceptions: string[];
  assessment: string;
  cites: Cite[];
}

const UNITS: Unit[] = [
  {
    game: "The Orb",
    name: "Lesson 1. What a portfolio is",
    note: "Seeded simulation. One shock, one recovery.",
    status: "Playable today",
    objective: (
      <>
        Given a portfolio of correlated assets, the student will <b>predict</b> the outcome of a
        market shock and <b>explain</b> why share count does not change.
      </>
    ),
    misconceptions: [
      "money lost in a crash went somewhere",
      "the company gets my money when I buy its stock",
    ],
    assessment:
      "Panic-sell during the crash and the debrief quantifies the cost against the index, in dollars and in shares surrendered. Holding through produces the contrast case in the same run log.",
    cites: [
      { src: "CEE", code: "Investing 8-4", gloss: "stock buyers become part-owners; risks and rewards of stock" },
      { src: "CEE", code: "Investing 8-1", gloss: "return arrives as capital gain and/or regular income" },
      { src: "CEE", code: "Investing 8-5a", gloss: "diversification within and among asset classes" },
      { src: "Jump$tart", code: "Investing Std 3, gr 8 b, e", gloss: "how markets facilitate trades; panic selling and exuberant buying" },
    ],
  },
  {
    game: "The Orb",
    name: "Lesson 2. The dot-com era",
    note: "Real 2000 to 2007 prices. S&P 500 total return as the benchmark line.",
    status: "Playable today",
    objective: (
      <>
        Across a real bubble, the student will <b>compare</b> a concentrated portfolio to a broad
        index, and <b>evaluate</b> survivorship bias in the historical chart.
      </>
    ),
    misconceptions: ["a famous hot company is a safe bet"],
    assessment:
      "The run ends with concentrated versus index side by side. The debrief names survivorship bias and asks the student to account for the companies that are missing from the chart because they did not survive.",
    cites: [
      { src: "CEE", code: "Investing 8-5b", gloss: "diversified fund versus individual stocks and bonds" },
      { src: "CEE", code: "Investing 8-6a", gloss: "compare rates of return, order investments by risk" },
      { src: "CEE", code: "Investing 12-5b, 12-5c", gloss: "9 to 12 ladder. news and downturns move asset prices" },
      { src: "Jump$tart", code: "Investing Std 2, gr 8 c, e", gloss: "single stocks versus funds; benefits of a long-term strategy" },
    ],
  },
  {
    game: "The Orb",
    name: "Pay yourself first",
    note: "Dollar cost averaging against a monthly income stream.",
    status: "Playable today",
    objective: (
      <>
        The student will <b>demonstrate</b> how a fixed monthly investment buys more shares when
        prices fall, and <b>calculate</b> the resulting average cost per share.
      </>
    ),
    misconceptions: ["you need to time the market"],
    assessment:
      "The debrief prints your average cost per share next to the closing price, showing how the cheap months lowered it. The rainbow orb runs the same plan on the index beside you.",
    cites: [
      { src: "CEE", code: "Investing 8-7, 8-7c", gloss: "compounding rewards regular investing; future value of a regular series" },
      { src: "CEE", code: "Saving 8-1", gloss: "reasons people save for the future" },
      { src: "Jump$tart", code: "Investing Std 3, gr 8 f", gloss: "average cost per share under a dollar cost averaging strategy" },
      { src: "Jump$tart", code: "Investing Std 1, gr 8 d", gloss: "money invested regularly over time may grow exponentially" },
    ],
  },
  {
    game: "The Orb",
    name: "The 2008 crash",
    note: "Real 2007 to 2015 prices. A giant bank and a giant insurer nearly die on screen.",
    status: "Playable today",
    objective: (
      <>
        Using a real 2007 to 2015 dataset, the student will <b>contrast</b> a single company losing
        nine tenths of its value with an index that recovers to new highs, and <b>justify</b>{" "}
        diversification as the response.
      </>
    ),
    misconceptions: ["a giant company is a safe company"],
    assessment:
      "Concentrate in the bank before the panic and the debrief prices the choice against the index. The growth chart keeps both lines on the same axes for the whole run.",
    cites: [
      { src: "CEE", code: "Investing 8-5a", gloss: "diversification within and among asset classes" },
      { src: "CEE", code: "Investing 12-5c", gloss: "9 to 12 ladder. downturns move asset prices" },
      { src: "Jump$tart", code: "Investing Std 2, gr 8 e", gloss: "benefits of a long-term investing strategy" },
    ],
  },
  {
    game: "The Orb",
    name: "Crypto winters",
    note: "Real coin prices, 2018 to 2024. Two drawdowns of three quarters, on the same axes as the stock index.",
    status: "Playable today",
    objective: (
      <>
        The student will <b>compare</b> volatility across asset classes using real prices and{" "}
        <b>evaluate</b> what position size lets an investor hold through a 75 percent drawdown.
      </>
    ),
    misconceptions: ["if it went up a lot, it will keep going up"],
    assessment:
      "Ride a coin through both winters and the debrief compares the path you felt with the index line you could have held instead. Selling in either winter prices the exit.",
    cites: [
      { src: "CEE", code: "Investing 12-2c", gloss: "names cryptocurrencies as speculative, 9 to 12 ladder" },
      { src: "CEE", code: "Investing 8-6a", gloss: "compare rates of return, order investments by risk" },
    ],
  },
  {
    game: "Share Garden",
    name: "Tutorial slice",
    note: "Deliberate A/B twin of Orb Lesson 1. Plant size is current price. Selling is transplanting to another gardener. Seeds are sold only at IPO.",
    status: "Playable today",
    objective: (
      <>
        Using the transplant rule, the student will <b>explain</b> why selling moves ownership to
        another investor rather than returning money to the company, and <b>predict</b> what a
        market-wide frost does to plant size versus plant count.
      </>
    ),
    misconceptions: [
      "the company gets my money when I buy its stock",
      "money lost in a crash went somewhere",
    ],
    assessment:
      "Transplant everything away during the frost and the debrief prices the choice against the co-op field. The market card teaches that plants come from other gardeners, and your coins go to the seller, never the farm. Same item bank as Orb Lesson 1, so two metaphors are scored against one truth.",
    cites: [
      { src: "CEE", code: "Investing 8-4", gloss: "stock buyers become part-owners of a business" },
      { src: "CEE", code: "Investing 8-2b", gloss: "find the current prices of stocks and funds" },
      { src: "Jump$tart", code: "Investing Std 3, gr 8 b, d", gloss: "how markets facilitate trades; how to buy and sell shares" },
    ],
  },
];

interface Later {
  name: string;
  what: string;
  anchor: string;
}

const LATER: Later[] = [
  {
    name: "Dividends as cash flow",
    what: "Income that arrives whether or not the price moved, and what reinvesting it does.",
    anchor: "CEE Investing 8-4a, 12-2a.",
  },
  {
    name: "Where new money comes from",
    what: "The mechanism of money creation, not monetary policy and not politics.",
    anchor: "Beyond the personal finance frame. Anchored to CEE Investing 12-4, real versus nominal return.",
  },
];

const SPINES: { title: string; body: string; anchor: string }[] = [
  {
    title: "Indexed investing",
    body: "A broad basket is the default, not the advanced move. Every unit puts the index on the same chart as the student's choices.",
    anchor: "CEE Investing 8-5",
  },
  {
    title: "Staying in the market",
    body: "Time in beats timing. The fail states are all versions of getting out at the wrong moment, and each one is priced.",
    anchor: "CEE Investing 8-7 · Jump$tart Investing Std 3, gr 8 e",
  },
  {
    title: "Dividends and compounding",
    body: "Returns arrive as cash flow and as growth. Reinvestment is shown as a curve the student can bend.",
    anchor: "CEE Investing 8-1, 8-7 · Saving 8-5",
  },
];

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; fg: string }> = {
    "Playable today": { bg: "#e8f3ff", fg: "#0057b8" },
    Planned: { bg: "#f0f0f2", fg: "#6e6e73" },
  };
  const c = map[status];
  return (
    <span
      className="t-lbl inline-block rounded-full px-2 py-[2px] font-medium"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="t-lbl font-semibold mb-[2px]" style={{ color: SUB }}>
      {children}
    </div>
  );
}

export default function OnePager() {
  return (
    <div className="sg-root min-h-screen" style={{ background: "#f5f5f7", color: INK, colorScheme: "light" }}>
      <style>{`
        .sg-root { font-size: 13px; }
        .t-lbl { font-size: 9.5px; line-height: 1.35; }
        .t-xs  { font-size: 11px; line-height: 1.42; }
        .t-sm  { font-size: 12.5px; line-height: 1.45; }
        .t-md  { font-size: 14.5px; line-height: 1.35; }
        .u-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .g4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .g3 { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 820px) {
          .u-grid { grid-template-columns: 9.5rem 1fr 13.5rem; gap: 18px; }
          .g4 { grid-template-columns: repeat(4, 1fr); }
          .g3 { grid-template-columns: repeat(3, 1fr); }
        }
        @media print {
          @page { size: letter portrait; margin: 0.42in; }
          html, body { background: #ffffff !important; }
          .sg-noprint { display: none !important; }
          .sg-root { background: #ffffff !important; }
          .sg-sheet { max-width: 100% !important; padding: 0 !important; }
          .sg-card { box-shadow: none !important; border-color: #d2d2d7 !important; padding: 7px 9px !important; break-inside: avoid; page-break-inside: avoid; }
          .sg-stack { gap: 6px !important; }
          .sg-block { break-inside: avoid; page-break-inside: avoid; }
          .u-grid { grid-template-columns: 8rem 1fr 11.5rem !important; gap: 11px !important; }
          .g4 { grid-template-columns: repeat(4, 1fr) !important; gap: 7px !important; }
          .g3 { grid-template-columns: repeat(3, 1fr) !important; gap: 7px !important; }
          .t-lbl { font-size: 6.4pt !important; }
          .t-xs  { font-size: 7pt !important; line-height: 1.28 !important; }
          .t-sm  { font-size: 7.8pt !important; line-height: 1.3 !important; }
          .t-md  { font-size: 8.8pt !important; line-height: 1.25 !important; }
          .sg-h1 { font-size: 21pt !important; }
          .sg-thesis { font-size: 9.4pt !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="sg-noprint sticky top-0 z-10 border-b border-black/8" style={{ background: "rgba(245,245,247,0.85)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link to="/" className="t-sm font-medium hover:underline" style={{ color: ACCENT }}>
            gallery
          </Link>
          <button
            onClick={() => window.print()}
            className="t-sm font-medium rounded-full px-4 py-[6px] text-white"
            style={{ background: ACCENT }}
          >
            Print
          </button>
        </div>
      </div>

      <div className="sg-sheet max-w-5xl mx-auto px-6 py-8">
        <div className="sg-stack flex flex-col gap-3">

          {/* Title */}
          <div className="sg-block">
            <h1 className="sg-h1 font-display text-[30px] leading-[1.05] font-semibold tracking-tight">
              Share Garden · Learning objectives
            </h1>
            <p className="sg-thesis t-md mt-2 max-w-3xl" style={{ color: INK }}>
              Two games, one curriculum. Every unit is built to break a specific misconception.
            </p>
            <p className="t-xs mt-1" style={{ color: SUB }}>
              Grades 6 to 8, laddering to 9 to 12. Free and open source. Aligned to the 2021 National
              Standards for Personal Financial Education, co-published by the Council for Economic
              Education and the Jump$tart Coalition. Grade 8 benchmarks are the primary anchor.
              Jump$tart cross-references cite the 2015 fourth edition, which many districts still map to.
            </p>
          </div>

          {/* Units */}
          {UNITS.map((u) => (
            <div key={u.game + u.name} className="sg-card sg-block bg-white rounded-2xl border border-black/8 p-4">
              <div className="u-grid">
                <div>
                  <div className="t-lbl font-medium" style={{ color: SUB }}>{u.game}</div>
                  <div className="t-sm font-semibold mt-[1px]">{u.name}</div>
                  <div className="mt-[6px]"><StatusPill status={u.status} /></div>
                  <div className="t-xs mt-[6px]" style={{ color: SUB }}>{u.note}</div>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <div>
                    <Label>Objective</Label>
                    <div className="t-sm">{u.objective}</div>
                  </div>
                  <div>
                    <Label>Misconception busted</Label>
                    <div className="t-sm">
                      {u.misconceptions.map((m, i) => (
                        <span key={m}>
                          {i > 0 && <span style={{ color: SUB }}> · </span>}
                          <span style={{ color: "#a33" }}>&ldquo;{m}&rdquo;</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Assessment hook</Label>
                    <div className="t-xs" style={{ color: SUB }}>{u.assessment}</div>
                  </div>
                </div>

                <div>
                  <Label>Standards</Label>
                  <div className="flex flex-col gap-[5px]">
                    {u.cites.map((c) => (
                      <div key={c.code}>
                        <div className="t-xs font-semibold">
                          <span style={{ color: c.src === "CEE" ? ACCENT : "#7a5cc4" }}>{c.src}</span>{" "}
                          {c.code}
                        </div>
                        <div className="t-lbl" style={{ color: SUB }}>{c.gloss}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Spines */}
          <div className="sg-card sg-block rounded-2xl border border-black/8 p-4" style={{ background: "#eef4fb" }}>
            <div className="t-sm font-semibold mb-2">Three spines run through every unit</div>
            <div className="g3">
              {SPINES.map((s) => (
                <div key={s.title}>
                  <div className="t-sm font-semibold" style={{ color: ACCENT }}>{s.title}</div>
                  <div className="t-xs mt-[2px]">{s.body}</div>
                  <div className="t-lbl mt-[3px]" style={{ color: SUB }}>{s.anchor}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Later modules */}
          <div className="sg-card sg-block bg-white rounded-2xl border border-black/8 p-4">
            <div className="flex items-baseline gap-2 mb-2">
              <div className="t-sm font-semibold">Later modules</div>
              <div className="t-lbl" style={{ color: SUB }}>Specified and standards-mapped. Not yet playable.</div>
            </div>
            <div className="g4">
              {LATER.map((l) => (
                <div key={l.name}>
                  <div className="t-xs font-semibold">{l.name}</div>
                  <div className="t-xs mt-[2px]" style={{ color: SUB }}>{l.what}</div>
                  <div className="t-lbl mt-[3px]" style={{ color: ACCENT }}>{l.anchor}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Equity + measurement */}
          <div className="g3 sg-block">
            <div className="sg-card bg-white rounded-2xl border border-black/8 p-4">
              <div className="t-sm font-semibold mb-1">Access</div>
              <div className="t-xs" style={{ color: SUB }}>
                Free. Open source. No logins, no accounts, no student data collected. Runs in a
                browser on a school Chromebook. A teacher can hand out a URL and start the period.
              </div>
            </div>
            <div className="sg-card bg-white rounded-2xl border border-black/8 p-4">
              <div className="t-sm font-semibold mb-1">How outcomes are measured</div>
              <div className="t-xs" style={{ color: SUB }}>
                Each unit carries a short pre and post check written from the CEE learning outcome
                verbs. The in-game fail state doubles as the formative assessment, so the teacher
                sees the misconception fire before the student names it.
              </div>
            </div>
            <div className="sg-card bg-white rounded-2xl border border-black/8 p-4">
              <div className="t-sm font-semibold mb-1">The A/B, on purpose</div>
              <div className="t-xs" style={{ color: SUB }}>
                The Orb and Share Garden teach the same first lesson through rival metaphors, an orb
                of holdings and a garden bed. Same item bank, same truth. Classroom testers decide
                which one transfers.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sg-block t-xs pt-1" style={{ color: SUB }}>
            Built on a deterministic simulation engine plus real historical market data, including
            S&P 500 total return and 2000 to 2015 era datasets. Same seed, same run, every time.
            Every number in the games is inspectable, and the curriculum, the engine, and the data
            are in one public repository.
          </div>

        </div>
      </div>
    </div>
  );
}
