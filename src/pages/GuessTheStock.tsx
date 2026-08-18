// Guess the Stock: one real company, one real year, drawn whole and unlabelled.
//
// The page is one quiet panel: the chart, a line of pips, one hint button, and
// either six names to choose between or an empty box and the whole market.
// Everything it knows how to decide comes from src/lib/guess/model.ts, so this
// file only draws and listens.
//
// Easy is the mode everybody starts in, because a player who cannot name a
// single chart still gets to be right some of the time. Hard is the same game
// with the names taken away.
//
// The skin is the dark variant of public/sketches/marketguessr.html: page and
// panel #0C0F14, chart well #090C10, gridlines #1B2330, axis text #5B6979, one
// green line at #4ADE80 over a soft fill, amber #E8B84B for par. No volume
// bars, no ticker, no dollars until a hint pays for them.
//
// Type and words follow docs/clean-type.md: one typeface, sentence case, no
// labels stacked over values, nothing under 12px.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import raw from "../data/guessPuzzles.json";
import { UI_FONT } from "../lib/type";
import {
  HintKey, OptionView, Order, PIP_BUDGET, Puzzle, PuzzleState, Settings, Shelf, Stats, Suggestion,
  advanceOrder, canDealHint, currentId, dealHint, dealtHints, dollarAt, dollarTicks, findCompany,
  formatDollars, formatPercent, giveUp, hasHint, initialOrder, loadOrder,
  loadSettings, loadShelf, loadStats, markShelf, monthMarks, newPuzzle, normalizeGuess, optionViews,
  percentAt, percentTicks, pipsSpent, recordFail, recordSolve, resultLine, saveOrder, saveSettings,
  saveShelf, saveStats, scorecardLine, sectorVerdict, seriesRange, shelfDetail, shelfLine, shelfMark,
  shelfEntry, submitGuess, submitPick, suggestCompanies, verdictLabel, visibleWindow,
} from "../lib/guess/model";

const PUZZLES = raw as Puzzle[];
const IDS = PUZZLES.map((p) => p.id);

const C = {
  page: "#0C0F14",
  panel: "#0C0F14",
  border: "#1F2733",
  well: "#090C10",
  grid: "#1B2330",
  axis: "#5B6979",
  line: "#4ADE80",
  fill: "rgba(74,222,128,0.07)",
  body: "#D7DEE8",
  bright: "#E8EDF4",
  dim: "#93A1B4",
  amber: "#E8B84B",
  field: "#10151D",
  fieldEdge: "#2A3546",
  pipEdge: "#3A4656",
};

// The model writes its lines in one quiet lower case so the simulator can pin
// them. The page is the only place they are read, so the page gives them their
// capital and reads the model's separator as a dot.
function sentence(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function dotted(text: string): string {
  return text.replace(/ \. /g, " · ");
}

// A hint says what it bought, in a phrase, rather than a word with a value
// hung off a colon.
function hintSentence(puzzle: Puzzle, key: HintKey): string {
  switch (key) {
    case "widen":
      return "A year either side is on the chart";
    case "sector":
      return `This company is in ${puzzle.sector}`;
    case "price":
      return "The axis shows real dollars";
    case "size":
      return `Worth ${puzzle.marketCap} at the end of the year`;
  }
}

// The company as the market writes it, from whatever the player typed.
function properName(guess: string): string {
  return findCompany(guess)?.name ?? sentence(guess);
}

// ------------------------------------------------------------- the chart

interface ChartProps {
  puzzle: Puzzle;
  widened: boolean;
  dollars: boolean;
  /** the well's own width in real pixels, so axis type is the size it says */
  width: number;
}

const H = 272;
const PAD_L = 52;
const PAD_R = 10;
const PAD_T = 12;
const CHART_B = H - 24;
const AX_Y = H - 6;
const AXIS_TYPE = 12;

function Chart({ puzzle, widened, dollars, width }: ChartProps) {
  const W = Math.max(260, Math.round(width));
  const win = visibleWindow(puzzle, widened);
  const span = Math.max(1, win.end - win.start);
  const x = (i: number) => PAD_L + ((i - win.start) / span) * (W - PAD_L - PAD_R);

  const values: number[] = [];
  for (let i = win.start; i <= win.end; i++) {
    values.push(dollars ? dollarAt(puzzle, i) : percentAt(puzzle, i));
  }
  const { min, max } = seriesRange(values);
  const pad = (max - min) * 0.08 || Math.abs(max) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (CHART_B - PAD_T);

  const ticks = dollars ? dollarTicks(min, max) : percentTicks(min, max);
  const marks = monthMarks(puzzle, win, true);

  // the sketch closes the axis with December on the right edge. Widened, the
  // window ends in a different year, so the quarter labels carry it instead.
  const tail = widened ? "" : "Dec";
  // thin the month labels down to what fits without touching. A label is about
  // 56px wide at this size, so that is the room each one needs and the room the
  // December label keeps for itself at the right edge.
  const labelled: { at: number; text: string }[] = [];
  let lastX = -Infinity;
  for (const m of marks) {
    if (!m.label) continue;
    const px = x(m.index);
    const need = 66;
    if (px - lastX < need || px > W - PAD_R - (tail ? 128 : 40)) continue;
    lastX = px;
    labelled.push({ at: px, text: sentence(m.label) });
  }
  // three years of month lines is a hatch rather than a grid, so a long window
  // keeps the quarters and drops the rest
  const dense = marks.length <= 15;

  let path = `M${x(win.start).toFixed(1)},${y(values[0]).toFixed(1)}`;
  for (let i = 1; i < values.length; i++) {
    path += `L${x(win.start + i).toFixed(1)},${y(values[i]).toFixed(1)}`;
  }
  const area = `${path}L${x(win.end).toFixed(1)},${CHART_B}L${x(win.start).toFixed(1)},${CHART_B}Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }} aria-hidden>
      {widened && (
        <g>
          <rect
            x={x(puzzle.yearStartIndex)}
            y={PAD_T}
            width={Math.max(1, x(puzzle.yearEndIndex) - x(puzzle.yearStartIndex))}
            height={CHART_B - PAD_T}
            fill="rgba(146,164,190,0.07)"
          />
          {[puzzle.yearStartIndex, puzzle.yearEndIndex].map((i) => (
            <line key={i} x1={x(i)} y1={PAD_T} x2={x(i)} y2={CHART_B} stroke={C.fieldEdge} strokeWidth={1} />
          ))}
        </g>
      )}

      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD_L} y1={y(t)} x2={W - PAD_R} y2={y(t)} stroke={C.grid} strokeWidth={1} />
          <text
            x={PAD_L - 8}
            y={y(t) + 4}
            fill={C.axis}
            fontSize={AXIS_TYPE}
            fontFamily={UI_FONT}
            textAnchor="end"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {dollars ? formatDollars(t) : formatPercent(t)}
          </text>
        </g>
      ))}

      {dollars && puzzle.splitAdjusted && (
        <text x={W - PAD_R - 2} y={PAD_T + 10} fill={C.axis} fontSize={AXIS_TYPE} fontFamily={UI_FONT} textAnchor="end">
          Split adjusted
        </text>
      )}

      {marks.map((m) =>
        m.label || dense ? (
          <line
            key={m.index}
            x1={x(m.index)}
            y1={PAD_T}
            x2={x(m.index)}
            y2={CHART_B}
            stroke={C.grid}
            strokeWidth={m.label ? 1 : 0.5}
          />
        ) : null,
      )}

      <path d={area} fill={C.fill} stroke="none" />
      <path d={path} fill="none" stroke={C.line} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={x(win.end)} cy={y(values[values.length - 1])} r={2.6} fill={C.line} />

      {labelled.map((l) => (
        <text
          key={l.at}
          x={l.at + 4}
          y={AX_Y}
          fill={C.axis}
          fontSize={AXIS_TYPE}
          fontFamily={UI_FONT}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {l.text}
        </text>
      ))}
      {tail && (
        <text
          x={W - PAD_R}
          y={AX_Y}
          fill={C.axis}
          fontSize={AXIS_TYPE}
          fontFamily={UI_FONT}
          textAnchor="end"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {`${tail} ${puzzle.year}`}
        </text>
      )}
    </svg>
  );
}

// ------------------------------------------------------------- the page

const HINT_BTN: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  background: "rgba(74,222,128,0.1)",
  color: C.line,
  fontFamily: UI_FONT,
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 18px",
  borderRadius: 6,
  cursor: "pointer",
};

const QUIET_BTN: React.CSSProperties = {
  background: "none",
  border: 0,
  padding: 0,
  fontFamily: UI_FONT,
  fontSize: 13,
  color: C.axis,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

// The quiet list of wrong guesses in hard mode. Each one carries whether that
// company works in the same trade as the answer, which is the only thing hard
// mode gives back for a miss; the hint ladder is untouched by it.
function GuessedLine({ guesses, puzzle }: { guesses: string[]; puzzle: Puzzle }) {
  if (guesses.length === 0) return null;
  return (
    <div
      style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 2 }}
      data-testid="guessed"
    >
      {guesses.map((g) => {
        const verdict = sectorVerdict(g, puzzle);
        return (
          <div key={g}>
            {properName(g)}
            {verdict && (
              <>
                {", "}
                <span
                  data-testid="sector-tag"
                  style={{ color: verdict === "same" ? C.amber : C.axis }}
                >
                  {verdictLabel(verdict)}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Easy mode's six names, the answer among five that could each have drawn
// something like this. A name picked wrong stays on screen struck through, and
// once the sector hint is paid for, every name in the wrong trade goes quiet
// with it, so the hint does real work here rather than only naming a word.
function Options({
  views,
  shake,
  onPick,
}: {
  views: OptionView[];
  shake: number;
  onPick: (ticker: string) => void;
}) {
  return (
    <div
      key={shake}
      className={shake ? "guess-shake" : ""}
      data-testid="options"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
    >
      {views.map(({ company, out }) => (
        <button
          key={company.ticker}
          type="button"
          disabled={out !== null}
          onClick={() => onPick(company.ticker)}
          data-testid="option"
          data-ticker={company.ticker}
          data-state={out ?? "open"}
          style={{
            border: `1px solid ${out ? C.border : C.fieldEdge}`,
            background: out ? "#0A0D12" : C.field,
            color: out ? C.axis : C.bright,
            opacity: out ? 0.5 : 1,
            textDecoration: out === "picked" ? "line-through" : "none",
            fontFamily: UI_FONT,
            fontSize: 14,
            textAlign: "left",
            padding: "11px 13px",
            borderRadius: 6,
            cursor: out ? "default" : "pointer",
          }}
        >
          {company.name}
        </button>
      ))}
    </div>
  );
}

// The collection: the whole pool in stream order. A solved puzzle keeps its
// name, its year and the line of history behind it, with a green edge and a
// quiet line saying how it went; a revealed one keeps everything but the green
// edge; an unplayed one is a dark card carrying its year and nothing else,
// because the year is the only thing the game gives away before you play it.
// A card shelved before any of that was recorded says only Revealed, which is
// all it ever knew.
function Collection({
  puzzles,
  shelf,
  onClose,
}: {
  puzzles: Puzzle[];
  shelf: Shelf;
  onClose: () => void;
}) {
  return (
    <div data-testid="collection" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.bright, letterSpacing: "-0.01em" }}>
          Collection
        </span>
        <button
          type="button"
          onClick={onClose}
          data-testid="collection-close"
          style={{ ...QUIET_BTN, marginLeft: "auto" }}
        >
          Back to the puzzle
        </button>
      </div>
      <div style={{ fontSize: 13, color: C.axis }} className="tnum" data-testid="shelf-line">
        {dotted(shelfLine(shelf, puzzles.map((p) => p.id)))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          alignItems: "start",
          gap: 10,
        }}
      >
        {puzzles.map((p) => {
          const mark = shelfMark(shelf, p.id);
          const played = mark !== null;
          // how it went, when the card is new enough to remember
          const detail = shelfDetail(shelf[p.id] ?? null);
          return (
            <div
              key={p.id}
              data-testid="shelf-card"
              data-mark={mark ?? "locked"}
              style={{
                border: `1px solid ${mark === "solved" ? "rgba(74,222,128,0.35)" : C.border}`,
                background: played ? C.field : "#080A0E",
                borderRadius: 6,
                padding: "11px 12px",
                minHeight: 52,
                display: "flex",
                flexDirection: "column",
                gap: 5,
                opacity: played ? 1 : 0.55,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                {played ? (
                  <>
                    <span style={{ fontSize: 14, color: C.bright, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: 12.5, color: C.axis }} className="tnum">
                      {p.ticker} · {p.year}
                    </span>
                    {mark === "revealed" && !detail && (
                      <span data-testid="revealed-tag" style={{ marginLeft: "auto", fontSize: 12.5, color: C.axis }}>
                        Revealed
                      </span>
                    )}
                  </>
                ) : (
                  <span data-testid="locked-year" className="tnum" style={{ fontSize: 14, color: C.dim }}>
                    {p.year}
                  </span>
                )}
              </div>
              {played && (
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: C.dim }}>{p.story}</div>
              )}
              {detail && (
                <div data-testid="shelf-detail" className="tnum" style={{ fontSize: 12.5, color: C.axis }}>
                  {sentence(detail)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GuessTheStock() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pinned = params.get("p");

  const byId = useMemo(() => new Map(PUZZLES.map((p) => [p.id, p])), []);
  const [order, setOrder] = useState<Order>(() => (IDS.length ? loadOrder(IDS) : initialOrder(IDS)));
  const [stats, setStats] = useState<Stats>(() => loadStats());

  const puzzleId = pinned && byId.has(pinned) ? pinned : currentId(order);
  const puzzle = byId.get(puzzleId) ?? PUZZLES[0];

  const [state, setState] = useState<PuzzleState>(() => newPuzzle(puzzleId));
  const [typed, setTyped] = useState("");
  const [shake, setShake] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [shelf, setShelf] = useState<Shelf>(() => loadShelf(IDS));
  const [showCollection, setShowCollection] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // the chart is drawn at the width it is given, so a phone shrinks the window
  // rather than the type on it
  const wellRef = useRef<HTMLDivElement>(null);
  const [wellWidth, setWellWidth] = useState(512);

  // the rows under the box: only these can ever be submitted
  const suggestions: Suggestion[] = useMemo(() => suggestCompanies(typed), [typed]);

  // escape is the way out of the collection, the same as the back control
  useEffect(() => {
    if (!showCollection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCollection(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCollection]);

  // the well only changes width when the window does, or when the collection
  // hands the panel back
  useEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    const measure = () => setWellWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showCollection]);

  // one puzzle per id: changing the deal or the ?p= entry starts a clean one
  useEffect(() => {
    if (state.puzzleId !== puzzleId) {
      setState(newPuzzle(puzzleId));
      setTyped("");
      setOpen(false);
      setActive(-1);
    }
  }, [puzzleId, state.puzzleId]);

  const over = state.status !== "playing";
  const widened = hasHint(state, "widen") || over;
  const dollars = hasHint(state, "price") || over;
  const easy = settings.mode === "easy";
  const options = useMemo(() => optionViews(state, puzzle), [state, puzzle]);

  function finish(next: PuzzleState) {
    setState(next);
    const s =
      next.status === "solved" ? recordSolve(stats, pipsSpent(next), puzzle.par) : recordFail(stats);
    setStats(s);
    saveStats(s);
    const shelved = markShelf(shelf, puzzle.id, shelfEntry(next, settings.mode));
    setShelf(shelved);
    saveShelf(shelved);
  }

  // Easy mode's whole move. A miss greys the name out and burns a pip, and a
  // miss with nothing left to burn ends the puzzle, which the model decides.
  function pick(ticker: string) {
    const res = submitPick(state, puzzle, ticker);
    if (res.ignored) return;
    if (res.state.status === "playing") {
      setState(res.state);
      setShake((n) => n + 1);
    } else {
      finish(res.state);
    }
  }

  // Free typing is fine, but a guess is only ever a real company off the
  // catalog, so nothing reaches the puzzle except a name the market knows.
  function submitCompany(name: string) {
    const res = submitGuess(state, puzzle, name);
    setOpen(false);
    setActive(-1);
    if (res.ignored) {
      setTyped("");
      return;
    }
    setTyped("");
    if (res.correct) finish(res.state);
    else {
      setState(res.state);
      setShake((n) => n + 1);
    }
  }

  // enter on nothing the catalog knows: a small shake and the text stays put
  function refuse() {
    setShake((n) => n + 1);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pick = suggestions[active >= 0 ? active : 0];
    if (!pick) {
      refuse();
      return;
    }
    submitCompany(pick.company.name);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const from = active < 0 ? (step === 1 ? -1 : 0) : active;
      setActive((from + step + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  function onNext() {
    const nextOrder = advanceOrder(order, IDS);
    setOrder(nextOrder);
    saveOrder(nextOrder);
    setState(newPuzzle(currentId(nextOrder)));
    setTyped("");
    setOpen(false);
    setActive(-1);
    if (pinned) navigate("/guess", { replace: true });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const number = PUZZLES.findIndex((p) => p.id === puzzle.id) + 1;
  const revealedHints = dealtHints(state);
  const spent = pipsSpent(state);
  // the pips say how much is left; the line beside them says the same thing in
  // words, so no number on the page is standing on its own
  const spentPhrase = spent === 0 ? "No hints used" : spent === 1 ? "1 hint used" : `${spent} hints used`;

  return (
    <div style={{ minHeight: "100%", background: C.page, color: C.body, colorScheme: "dark", fontFamily: UI_FONT }}>
      <style>{`
        @keyframes guessShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          45% { transform: translateX(4px); }
          70% { transform: translateX(-2px); }
        }
        .guess-shake { animation: guessShake 320ms ease; }
        .guess-field::placeholder { color: ${C.axis}; }
        .guess-field:focus { outline: none; border-color: ${C.line}; }
      `}</style>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px 64px" }}>
        <Link
          to="/"
          style={{ fontSize: 13, color: C.axis, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
        >
          Back
        </Link>

        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "20px 18px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {showCollection ? (
            <Collection puzzles={PUZZLES} shelf={shelf} onClose={() => setShowCollection(false)} />
          ) : (
          <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.bright, letterSpacing: "-0.01em" }}>
              Guess the Stock
            </span>
            <span
              style={{ marginLeft: "auto", fontSize: 13, color: C.axis }}
              className="tnum"
              data-testid="puzzle-no"
            >
              Puzzle {number}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex", gap: 5 }} data-testid="pips">
              {Array.from({ length: PIP_BUDGET }, (_, i) => {
                const used = i < spent;
                return (
                  <i
                    key={i}
                    data-spent={used ? "yes" : "no"}
                    style={{
                      width: 9,
                      height: 9,
                      display: "block",
                      border: `1px solid ${used ? C.amber : C.pipEdge}`,
                      background: used ? C.amber : "transparent",
                    }}
                  />
                );
              })}
            </span>
            <span
              style={{ marginLeft: "auto", fontSize: 13, color: C.dim }}
              className="tnum"
              data-testid="ladder"
            >
              {spentPhrase}, par <span style={{ color: C.amber }}>{puzzle.par}</span>
            </span>
          </div>

          <div
            ref={wellRef}
            style={{ border: `1px solid ${C.border}`, background: C.well, borderRadius: 6, padding: "8px 6px 2px" }}
          >
            <Chart puzzle={puzzle} widened={widened} dollars={dollars} width={wellWidth - 12} />
          </div>

          {revealedHints.length > 0 && !over && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                borderLeft: `2px solid rgba(74,222,128,0.45)`,
                paddingLeft: 11,
              }}
              data-testid="revealed"
            >
              {revealedHints.map((key) => (
                <div key={key} style={{ fontSize: 13, color: C.dim }}>
                  {hintSentence(puzzle, key)}
                </div>
              ))}
            </div>
          )}

          {!over ? (
            easy ? (
            <>
              <Options views={options} shake={shake} onPick={pick} />
              <button
                type="button"
                onClick={() => setState(dealHint(state))}
                disabled={!canDealHint(state)}
                data-testid="hint"
                style={{ ...HINT_BTN, alignSelf: "flex-start", opacity: canDealHint(state) ? 1 : 0.35 }}
              >
                Hint
              </button>
              <button
                type="button"
                onClick={() => finish(giveUp(state))}
                data-testid="give-up"
                style={{ ...QUIET_BTN, alignSelf: "flex-start" }}
              >
                Reveal answer
              </button>
            </>
            ) : (
            <>
              <form onSubmit={onSubmit} style={{ display: "flex", gap: 9 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    ref={inputRef}
                    key={shake}
                    className={`guess-field${shake ? " guess-shake" : ""}`}
                    value={typed}
                    onChange={(e) => {
                      setTyped(e.target.value);
                      setOpen(true);
                      setActive(-1);
                    }}
                    onKeyDown={onKeyDown}
                    onFocus={() => setOpen(true)}
                    onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                    placeholder="Company or ticker"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    role="combobox"
                    aria-expanded={open && suggestions.length > 0}
                    aria-autocomplete="list"
                    data-testid="guess-input"
                    style={{
                      width: "100%",
                      border: `1px solid ${C.fieldEdge}`,
                      background: C.field,
                      borderRadius: 6,
                      padding: "11px 13px",
                      fontFamily: UI_FONT,
                      fontSize: 15,
                      color: C.bright,
                      caretColor: C.line,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setState(dealHint(state))}
                  disabled={!canDealHint(state)}
                  data-testid="hint"
                  style={{ ...HINT_BTN, opacity: canDealHint(state) ? 1 : 0.35 }}
                >
                  Hint
                </button>
              </form>

              {open && suggestions.length > 0 && (
                <div
                  data-testid="suggestions"
                  style={{
                    marginTop: -6,
                    background: C.field,
                    border: `1px solid ${C.fieldEdge}`,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  {suggestions.map((s, i) => {
                    // show the word that matched when it is not the name
                    // itself, so typing g finds Alphabet and reads google
                    const matched = normalizeGuess(s.matched);
                    const alias =
                      matched !== normalizeGuess(s.company.name) &&
                      matched !== normalizeGuess(s.company.ticker)
                        ? s.matched
                        : "";
                    return (
                      <div
                        key={s.company.ticker}
                        data-testid="suggestion"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          submitCompany(s.company.name);
                        }}
                        onMouseEnter={() => setActive(i)}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          padding: "8px 13px",
                          cursor: "pointer",
                          background: i === active ? "rgba(74,222,128,0.08)" : "transparent",
                          borderLeft: `2px solid ${i === active ? C.line : "transparent"}`,
                        }}
                      >
                        <span style={{ fontSize: 14, color: C.bright }}>{s.company.name}</span>
                        <span style={{ fontSize: 13, color: C.axis }}>{s.company.ticker}</span>
                        {alias && <span style={{ fontSize: 13, color: C.axis }}>· {alias}</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <GuessedLine guesses={state.guesses} puzzle={puzzle} />

              <button
                type="button"
                onClick={() => finish(giveUp(state))}
                data-testid="give-up"
                style={{ ...QUIET_BTN, alignSelf: "flex-start" }}
              >
                Reveal answer
              </button>
            </>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="reveal">
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: C.bright, letterSpacing: "-0.01em" }}>
                  {puzzle.name}
                </span>
                <span style={{ fontSize: 13, color: C.axis }} className="tnum">
                  {puzzle.ticker} · {puzzle.year}
                </span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: C.dim }} data-testid="story">
                {puzzle.story}
              </div>
              <div style={{ fontSize: 13, color: C.amber }} className="tnum" data-testid="result">
                {sentence(resultLine(state, puzzle))}
              </div>
              <GuessedLine guesses={state.guesses} puzzle={puzzle} />
              {state.picks.length > 0 && (
                <div style={{ fontSize: 13, color: C.axis, lineHeight: 1.6 }} data-testid="picked">
                  You picked{" "}
                  {state.picks
                    .map((t) => options.find((o) => o.company.ticker === t)?.company.name ?? t)
                    .join(", ")}
                </div>
              )}
              <button type="button" onClick={onNext} data-testid="next" style={{ ...HINT_BTN, alignSelf: "flex-start" }}>
                Next
              </button>
            </div>
          )}
          </>
          )}
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: C.axis }} className="tnum" data-testid="scorecard">
            {sentence(dotted(scorecardLine(stats)))}
          </div>
          <button
            type="button"
            onClick={() => setShowCollection((v) => !v)}
            data-testid="collection-open"
            style={{ ...QUIET_BTN, color: showCollection ? C.line : C.axis }}
          >
            Collection
          </button>
          <button
            type="button"
            onClick={() => {
              const next: Settings = { mode: easy ? "hard" : "easy" };
              setSettings(next);
              saveSettings(next);
            }}
            data-testid="mode-toggle"
            style={{ ...QUIET_BTN, marginLeft: "auto", color: easy ? C.axis : C.amber }}
          >
            {easy ? "Easy mode" : "Hard mode"}
          </button>
        </div>
      </div>
    </div>
  );
}
