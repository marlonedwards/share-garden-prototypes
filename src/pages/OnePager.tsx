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
    name: "Basics 1. What cash does",
    note: "Seven screens follow Maya's dollar from the lemonade stand to the bakery. Two check items clear the inflation marble.",
    status: "Playable today",
    objective: (
      <>
        Across eight replayed years, the student will <b>explain</b> why a jar&apos;s printed number
        holds still while its buying power leaks, and <b>compare</b> the loud danger cash escapes
        with the quiet one it cannot.
      </>
    ),
    misconceptions: [
      "money in a jar is perfectly safe",
      "safe from crashes means safe from everything",
    ],
    assessment:
      "The slider stage replays eight years of sneaker prices against a $100 jar, and both check items price the gap the student just watched open. Clearing them earns the inflation marble in the field guide.",
    cites: [
      { src: "CEE", code: "Saving 8-1", gloss: "reasons people save for the future" },
      { src: "CEE", code: "Investing 12-4", gloss: "9 to 12 ladder. real versus nominal return, taught as buying power" },
    ],
  },
  {
    game: "The Orb",
    name: "Basics 2. What savings do",
    note: "Maya's account pays interest while Jordan's shoebox pays nothing. Two check items clear the compounding and inflation marbles.",
    status: "Playable today",
    objective: (
      <>
        The student will <b>contrast</b> simple and compound interest on the same axes and{" "}
        <b>explain</b> why emergency money lives in savings rather than in the market.
      </>
    ),
    misconceptions: [
      "every year of waiting pays the same",
      "a shoebox keeps money safe from everything",
    ],
    assessment:
      "The drag-the-years stage shows the straight simple-interest line falling behind the bending compound curve. The checks ask the student to name compounding when the bank pays interest on interest, and to read what eight closed-shoebox years did to buying power.",
    cites: [
      { src: "CEE", code: "Saving 8-1", gloss: "reasons people save for the future" },
      { src: "CEE", code: "Investing 8-7", gloss: "compounding rewards waiting; interest earns interest of its own" },
      { src: "CEE", code: "Investing 12-4", gloss: "9 to 12 ladder. real versus nominal return, taught as buying power" },
    ],
  },
  {
    game: "The Orb",
    name: "Basics 3. What a share is",
    note: "Maya's stand is divided into 100 equal pieces, and Jordan buys one on the open market. Three check items clear the share, market price, and dividend marbles.",
    status: "Playable today",
    objective: (
      <>
        The student will <b>explain</b> where the money goes when a share trades hands and{" "}
        <b>demonstrate</b> that the market price is only the newest trade.
      </>
    ),
    misconceptions: [
      "the company gets my money when I buy its stock",
      "a falling price means I own less of the company",
    ],
    assessment:
      "The trading-table stage lets the student push the price with one buyer or seller at a time. The three checks price a fall without changing ownership, name who set the $12 print, and pay a $2 dividend on a season when the price never moved.",
    cites: [
      { src: "CEE", code: "Investing 8-4", gloss: "stock buyers become part-owners; risks and rewards of stock" },
      { src: "CEE", code: "Investing 8-1", gloss: "return arrives as capital gain and/or regular income" },
    ],
  },
  {
    game: "The Orb",
    name: "Basics 4. What a fund is",
    note: "One sealed marble holds all eight companies on Jordan's board, the tripler and the flop together. Two check items clear the index fund and diversification marbles.",
    status: "Playable today",
    objective: (
      <>
        The student will <b>compare</b> picking one company with owning every company on the list,
        and <b>evaluate</b> what diversification does when a single holding fails.
      </>
    ),
    misconceptions: ["a smart picker can reliably choose next year's winner"],
    assessment:
      "The finished board reveals that the tripler was a different company in each of three years, and the professionals' report cards state the index's long-run record in plain words. Both checks price what the fund delivers, average and one-in-eight failure included.",
    cites: [
      { src: "CEE", code: "Investing 8-5b", gloss: "diversified fund versus individual stocks and bonds" },
      { src: "CEE", code: "Investing 8-5a", gloss: "diversification within and among asset classes" },
    ],
  },
  {
    game: "The Orb",
    name: "Basics 5. What a coin is",
    note: "A coin card opens onto nothing, while the share card opens onto a business. Two check items clear the position size and Ponzi marbles.",
    status: "Playable today",
    objective: (
      <>
        The student will <b>compare</b> a coin&apos;s monthly swings with an index fund&apos;s over
        the same replayed year and <b>evaluate</b> how position size decides what a 75 percent
        winter costs.
      </>
    ),
    misconceptions: [
      "picking the right coin matters more than the size of the bet",
      "a steady 10 percent every month is a great offer",
    ],
    assessment:
      "The student lives the same replayed coin winter at three position sizes, then taps through a Ponzi month by month until the new deposits stop arriving. Both checks are answered from what just happened on screen, and clearing them earns the last two Basics marbles.",
    cites: [
      { src: "CEE", code: "Investing 12-2c", gloss: "names cryptocurrencies as speculative, 9 to 12 ladder" },
      { src: "CEE", code: "Investing 8-6a", gloss: "compare rates of return, order investments by risk" },
    ],
  },
  {
    game: "The Orb",
    name: "Lesson 1. What a portfolio is",
    note: "The seeded tutorial opens the numbered ladder as Lesson 1. One shock hits and one recovery follows.",
    status: "Playable today",
    objective: (
      <>
        Given a portfolio of correlated assets, the student will <b>describe</b> what a market
        shock does to the orb&apos;s value and <b>explain</b> why share count does not change.
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
    note: "The prices are real, 2000 to 2007. The S&P 500 total return is the benchmark line.",
    status: "Playable today",
    objective: (
      <>
        Across a real bubble, the student will <b>compare</b> a concentrated portfolio to a broad
        index, and <b>evaluate</b> survivorship bias in the historical chart.
      </>
    ),
    misconceptions: ["a famous hot company is a safe bet"],
    assessment:
      "The run ends with concentrated versus index side by side. Two names on the 2000 menu go to zero mid-run, so survivorship bias is felt rather than just named. The debrief prices the student's own choices against the index.",
    cites: [
      { src: "CEE", code: "Investing 8-5b", gloss: "diversified fund versus individual stocks and bonds" },
      { src: "CEE", code: "Investing 8-6a", gloss: "compare rates of return, order investments by risk" },
      { src: "CEE", code: "Investing 12-5b, 12-5c", gloss: "9 to 12 ladder. news and downturns move asset prices" },
      { src: "Jump$tart", code: "Investing Std 2, gr 8 c, e", gloss: "single stocks versus funds; benefits of a long-term strategy" },
    ],
  },
  {
    game: "The Orb",
    name: "Lesson 3. Pay yourself first",
    note: "A monthly payday runs through the era's real prices, and dollar cost averaging does the teaching.",
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
    name: "Lesson 4. The 2008 crash",
    note: "The prices are real, 2007 to 2015. A giant bank and a giant insurer nearly die on screen.",
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
    name: "Lesson 5. Crypto winters",
    note: "The coin prices are real, 2018 to 2024. Two drawdowns of three quarters sit on the same axes as the stock index.",
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
    game: "The Orb",
    name: "Lesson 6. The covid years",
    note: "The prices are real, 2019 to 2024. The era holds the fastest crash in market history, a meme-stock mania, and the giveback that followed.",
    status: "Playable today",
    objective: (
      <>
        Across the covid market, the student will <b>explain</b> why the fastest crash on record
        could not be timed, and <b>evaluate</b> what happens to a price that assumes a temporary
        world is permanent.
      </>
    ),
    misconceptions: [
      "a crash this fast must be sold first and bought back later",
      "a crowd buying a stock means the business is worth more",
    ],
    assessment:
      "Sell in March 2020 and the debrief prices the exit against the record the index set again by August. The January 2021 gate records what the student did with the meme stock, and the quick check reads the stay-at-home darlings' 95 percent giveback against the index that never traded. Two cast members are still private in January 2019 and cannot be bought before their real listing months.",
    cites: [
      { src: "CEE", code: "Investing 12-5c", gloss: "9 to 12 ladder. downturns move asset prices; recoveries arrive unannounced" },
      { src: "CEE", code: "Investing 12-2c", gloss: "9 to 12 ladder. speculation, crowds, and short-term greed" },
      { src: "CEE", code: "Investing 12-5b", gloss: "9 to 12 ladder. expectations are already in the price" },
      { src: "CEE", code: "Investing 8-5a", gloss: "diversification within and among asset classes" },
    ],
  },
  {
    game: "The Orb",
    name: "Lesson 7. The inflation years",
    note: "The prices are real, 2021 to 2024. A long Treasury bond fund shares the menu with the stocks.",
    status: "Playable today",
    objective: (
      <>
        Across the fastest inflation in forty years, the student will <b>explain</b> why cash and
        long government bonds both lost buying power, and <b>evaluate</b> what diversification can
        and cannot do in a year when stocks and bonds fall together.
      </>
    ),
    misconceptions: [
      "cash is safe because its number never changes",
      "a government bond fund cannot lose money",
    ],
    assessment:
      "Flee to cash in 2022 and the debrief prices the escape in buying power, not just in dollars. The quick check reads the bond fund's 31 percent fall back against the payments the government never missed, and the October 2022 gate records what the student did at a bottom nobody could see.",
    cites: [
      { src: "CEE", code: "Investing 12-4", gloss: "9 to 12 ladder. real versus nominal return, taught as buying power" },
      { src: "CEE", code: "Investing 12-3", gloss: "9 to 12 ladder. bond prices fall when interest rates rise" },
      { src: "CEE", code: "Investing 8-5a", gloss: "diversification within and among asset classes" },
      { src: "CEE", code: "Investing 12-5c", gloss: "9 to 12 ladder. downturns move asset prices" },
      { src: "CEE", code: "Investing 8-5b", gloss: "diversified fund versus individual stocks and bonds" },
    ],
  },
  {
    game: "The Orb",
    name: "The last lesson. Ready to invest?",
    note: "The student builds a paper plan from twenty real assets, priced as of January 2, 2026. It prints as a one-page sheet.",
    status: "Playable today",
    objective: (
      <>
        Using real names and real prices, the student will <b>construct</b> a first portfolio on
        paper and <b>evaluate</b> its concentration, its position sizes, and what a 2008-sized
        fall would have done to it.
      </>
    ),
    misconceptions: [
      "a plan is something you carry in your head",
      "more lines always means more spread",
    ],
    assessment:
      "The mirror reads the plan by looking backward, the way the course read every era. It prices concentration against the dot-com collapses, coin size against the crypto winters, and a 2008-sized fall in the plan's own dollars. The printed sheet ends with three discussion questions and signature lines for the student and an adult.",
    cites: [
      { src: "CEE", code: "Investing 8-2b", gloss: "find the current prices of stocks and funds" },
      { src: "CEE", code: "Investing 8-5a", gloss: "diversification within and among asset classes" },
      { src: "CEE", code: "Investing 8-5b", gloss: "diversified fund versus individual stocks and bonds" },
      { src: "CEE", code: "Investing 8-6a", gloss: "compare rates of return, order investments by risk" },
      { src: "CEE", code: "Investing 12-2c", gloss: "names cryptocurrencies as speculative, 9 to 12 ladder" },
    ],
  },
  {
    game: "Share Garden",
    name: "Tutorial slice",
    note: "This slice is a deliberate A/B twin of Orb Lesson 1. Plant size is the current price, selling is transplanting to another gardener, and seeds are sold only at IPO.",
    status: "Playable today",
    objective: (
      <>
        Using the transplant rule, the student will <b>explain</b> why selling moves ownership to
        another investor rather than returning money to the company, and <b>contrast</b> what a
        market-wide frost does to plant size with what it does to plant count.
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
        .sg-root { font-size: 15px; }
        .t-lbl { font-size: 12px; line-height: 1.35; }
        .t-xs  { font-size: 13px; line-height: 1.5; }
        .t-sm  { font-size: 14px; line-height: 1.5; }
        .t-md  { font-size: 16px; line-height: 1.4; }
        .u-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .g4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .g3 { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 820px) {
          .u-grid { grid-template-columns: 11rem 1fr 15rem; gap: 18px; }
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
            Gallery
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
            <h1 className="sg-h1 text-[30px] leading-[1.05] font-bold tracking-tight">
              Share Garden · Learning objectives
            </h1>
            <p className="sg-thesis t-md mt-2 max-w-3xl" style={{ color: INK }}>
              Two games, one curriculum. Every unit is built to break a specific misconception.
            </p>
            <p className="t-xs mt-1 max-w-3xl" style={{ color: SUB }}>
              The Orb&apos;s course runs in two ladders, listed below in play order. Five short
              Basics lessons come first, and then seven numbered lessons follow. The seeded
              tutorial is Lesson 1, six real eras are Lessons 2 through 7, and the finale ends
              the course.
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
                Each unit ends with a short quick check written from the CEE outcome verbs. The
                items are history questions plus items built from the student's own run, like
                pricing the shares they sold in a panic. History gates pause the tape at real
                moments and record the student's commitment. The debrief quotes it back. The
                in-game fail state doubles as the formative assessment. Results stay on the
                device.
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
            Era menus include companies that did not survive; those delisted price series, like
            WorldCom, eToys, and Lehman Brothers, are reconstructed from the documented record.
            Every number in the games is inspectable, and the curriculum, the engine, and the data
            are in one public repository.
          </div>

        </div>
      </div>
    </div>
  );
}
