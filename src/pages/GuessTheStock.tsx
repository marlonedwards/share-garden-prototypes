// Guess the Stock: one real company, one real year, drawn whole and unlabelled.
//
// The page is a terminal panel and nothing else: the chart, a line of pips for
// the hints, a box to type into, one hint button, and the quiet line of wrong
// guesses under it. Everything it knows how to decide comes from
// src/lib/guess/model.ts, so this file only draws and listens.
//
// The skin is the terminal variant of public/sketches/marketguessr.html: page
// and panel #0C0F14, chart well #090C10, gridlines #1B2330, axis text #5B6979,
// one green line at #4ADE80 over a soft fill, amber #E8B84B for the pips and
// par. No volume bars, no ticker, no dollars until a hint pays for them.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import raw from "../data/guessPuzzles.json";
import {
  HINT_LADDER, Order, Puzzle, PuzzleState, Settings, Shelf, Stats, Suggestion,
  advanceOrder, canDealHint, currentId, dealHint, dealtHints, dollarAt, dollarTicks,
  formatDollars, formatPercent, giveUp, hasHint, hintLine, initialOrder, loadOrder,
  loadSettings, loadShelf, loadStats, markShelf, monthMarks, newPuzzle, normalizeGuess, percentAt,
  percentTicks, recordFail, recordSolve, resultLine, saveOrder, saveSettings, saveShelf, saveStats,
  scorecardLine, sectorVerdict, seriesRange, shelfLine, shelfMark, submitGuess, suggestCompanies,
  verdictLabel, visibleWindow,
} from "../lib/guess/model";

const PUZZLES = raw as Puzzle[];
const IDS = PUZZLES.map((p) => p.id);

const MONO = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
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

// ------------------------------------------------------------- the chart

interface ChartProps {
  puzzle: Puzzle;
  widened: boolean;
  dollars: boolean;
}

const W = 532;
const H = 268;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 12;
const CHART_B = H - 22;
const AX_Y = H - 6;

function Chart({ puzzle, widened, dollars }: ChartProps) {
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

  // thin the month labels down to what fits without touching
  const labelled: { at: number; text: string }[] = [];
  let lastX = -Infinity;
  for (const m of marks) {
    if (!m.label) continue;
    const px = x(m.index);
    const need = 56;
    if (px - lastX < need || px > W - PAD_R - need * 0.6) continue;
    lastX = px;
    labelled.push({ at: px, text: m.label });
  }
  // the sketch closes the axis with december on the right edge. Widened, the
  // window ends in a different year, so the quarter labels carry it instead.
  const tail = widened ? "" : "dec";
  // three years of month lines is a hatch rather than a grid, so a long window
  // keeps the quarters and drops the rest
  const dense = marks.length <= 15;

  let path = `M${x(win.start).toFixed(1)},${y(values[0]).toFixed(1)}`;
  for (let i = 1; i < values.length; i++) {
    path += `L${x(win.start + i).toFixed(1)},${y(values[i]).toFixed(1)}`;
  }
  const area = `${path}L${x(win.end).toFixed(1)},${CHART_B}L${x(win.start).toFixed(1)},${CHART_B}Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }} aria-hidden>
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
          <text x={PAD_L - 6} y={y(t) + 3.5} fill={C.axis} fontSize={9} fontFamily={MONO} textAnchor="end">
            {dollars ? formatDollars(t) : formatPercent(t)}
          </text>
        </g>
      ))}

      {dollars && puzzle.splitAdjusted && (
        <text x={W - PAD_R - 2} y={PAD_T + 9} fill={C.axis} fontSize={8.5} fontFamily={MONO} textAnchor="end">
          split adjusted
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
        <text key={l.at} x={l.at + 3} y={AX_Y} fill={C.axis} fontSize={9} fontFamily={MONO}>
          {l.text}
        </text>
      ))}
      {tail && (
        <text x={W - PAD_R} y={AX_Y} fill={C.axis} fontSize={9} fontFamily={MONO} textAnchor="end">
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
  fontFamily: MONO,
  fontSize: 12,
  fontWeight: 700,
  padding: "10px 16px",
  borderRadius: 4,
  cursor: "pointer",
};

// The quiet line of wrong guesses. In easy mode each one carries whether that
// company works in the same trade as the answer, which is the only help the
// mode gives; the hint ladder is untouched by it.
function GuessedLine({ guesses, puzzle, easy }: { guesses: string[]; puzzle: Puzzle; easy: boolean }) {
  if (guesses.length === 0) return null;
  return (
    <div style={{ fontSize: 11, color: C.axis, lineHeight: 1.7 }} data-testid="guessed">
      guessed:{" "}
      {guesses.map((g, i) => {
        const verdict = easy ? sectorVerdict(g, puzzle) : null;
        return (
          <span key={g}>
            {i > 0 && " . "}
            <b style={{ color: C.dim, fontWeight: 400 }}>{g}</b>
            {verdict && (
              <span
                data-testid="sector-tag"
                style={{ marginLeft: 5, fontSize: 10, color: verdict === "same" ? C.amber : C.axis }}
              >
                ({verdictLabel(verdict)})
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// The collection: the whole pool in stream order. A solved puzzle keeps its
// name, its year and the line of history behind it; a revealed one is marked
// as revealed rather than solved; an unplayed one is a dark card carrying its
// year and nothing else, because the year is the only thing the game gives away
// before you play it.
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
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.bright }}>collection</span>
        <button
          type="button"
          onClick={onClose}
          data-testid="collection-close"
          style={{
            marginLeft: "auto",
            background: "none",
            border: 0,
            padding: 0,
            fontFamily: MONO,
            fontSize: 11,
            color: C.axis,
            cursor: "pointer",
          }}
        >
          back to the puzzle
        </button>
      </div>
      <div style={{ fontSize: 11, color: C.axis }} data-testid="shelf-line">
        {shelfLine(shelf, puzzles.map((p) => p.id))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {puzzles.map((p, i) => {
          const mark = shelfMark(shelf, p.id);
          const played = mark !== null;
          return (
            <div
              key={p.id}
              data-testid="shelf-card"
              data-mark={mark ?? "locked"}
              style={{
                border: `1px solid ${mark === "solved" ? "rgba(74,222,128,0.35)" : C.border}`,
                background: played ? C.field : "#080A0E",
                borderRadius: 4,
                padding: "9px 10px",
                minHeight: 44,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                opacity: played ? 1 : 0.55,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ fontSize: 10, color: C.axis }}>no. {i + 1}</span>
                {played ? (
                  <>
                    <span style={{ fontSize: 12.5, color: C.bright, fontWeight: 700 }}>{p.name}</span>
                    <span style={{ fontSize: 10.5, color: C.axis }}>{p.ticker}</span>
                    <span style={{ fontSize: 10.5, color: C.axis }}>{p.year}</span>
                    {mark === "revealed" && (
                      <span data-testid="revealed-tag" style={{ marginLeft: "auto", fontSize: 10, color: C.axis }}>
                        revealed
                      </span>
                    )}
                  </>
                ) : (
                  <span data-testid="locked-year" style={{ fontSize: 12.5, color: C.dim }}>
                    {p.year}
                  </span>
                )}
              </div>
              {played && (
                <div style={{ fontSize: 10.5, lineHeight: 1.5, color: C.dim }}>{p.story}</div>
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

  function finish(next: PuzzleState) {
    setState(next);
    const s = next.status === "solved" ? recordSolve(stats, next.hints, puzzle.par) : recordFail(stats);
    setStats(s);
    saveStats(s);
    const shelved = markShelf(shelf, puzzle.id, next.status === "solved" ? "solved" : "revealed");
    setShelf(shelved);
    saveShelf(shelved);
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

  return (
    <div style={{ minHeight: "100%", background: C.page, color: C.body, colorScheme: "dark", fontFamily: MONO }}>
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
          style={{ fontSize: 11, color: C.axis, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
        >
          back
        </Link>

        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "18px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {showCollection ? (
            <Collection puzzles={PUZZLES} shelf={shelf} onClose={() => setShowCollection(false)} />
          ) : (
          <>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.bright, letterSpacing: "0.01em" }}>
              guess the stock
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.axis }} data-testid="puzzle-no">
              no. {number}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, color: C.axis }}>
            <span>hints</span>
            <span style={{ display: "flex", gap: 4 }} data-testid="pips">
              {HINT_LADDER.map((key, i) => (
                <i
                  key={key}
                  style={{
                    width: 9,
                    height: 9,
                    display: "block",
                    border: `1px solid ${i < state.hints ? C.amber : C.pipEdge}`,
                    background: i < state.hints ? C.amber : "transparent",
                  }}
                />
              ))}
            </span>
            <span style={{ marginLeft: "auto", color: C.amber }}>par {puzzle.par}</span>
          </div>

          <div style={{ border: `1px solid ${C.border}`, background: C.well, borderRadius: 4, padding: "8px 6px 2px" }}>
            <Chart puzzle={puzzle} widened={widened} dollars={dollars} />
          </div>

          {revealedHints.length > 0 && !over && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }} data-testid="revealed">
              {revealedHints.map((key) => {
                const line = hintLine(puzzle, key);
                return (
                  <div key={key} style={{ fontSize: 11.5, color: C.dim, display: "flex", gap: 7 }}>
                    <span style={{ color: C.line }}>&gt;</span>
                    <span>
                      {line.label}: <b style={{ color: C.bright, fontWeight: 700 }}>{line.value}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!over ? (
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
                    placeholder="company or ticker"
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
                      borderRadius: 4,
                      padding: "10px 12px",
                      fontFamily: MONO,
                      fontSize: 13,
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
                  hint
                </button>
              </form>

              {open && suggestions.length > 0 && (
                <div
                  data-testid="suggestions"
                  style={{
                    marginTop: -4,
                    background: C.field,
                    border: `1px solid ${C.fieldEdge}`,
                    borderRadius: 4,
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
                          padding: "6px 12px",
                          cursor: "pointer",
                          background: i === active ? "rgba(74,222,128,0.08)" : "transparent",
                          borderLeft: `2px solid ${i === active ? C.line : "transparent"}`,
                        }}
                      >
                        <span style={{ fontSize: 12.5, color: C.bright }}>{s.company.name}</span>
                        <span style={{ fontSize: 11, color: C.axis }}>{s.company.ticker}</span>
                        {alias && <span style={{ fontSize: 10.5, color: C.axis }}>. {alias}</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <GuessedLine guesses={state.guesses} puzzle={puzzle} easy={settings.easy} />

              <button
                type="button"
                onClick={() => finish(giveUp(state))}
                data-testid="give-up"
                style={{
                  alignSelf: "flex-start",
                  background: "none",
                  border: 0,
                  padding: 0,
                  fontFamily: MONO,
                  fontSize: 11,
                  color: C.axis,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                reveal answer
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }} data-testid="reveal">
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.bright }}>{puzzle.name}</span>
                <span style={{ fontSize: 12, color: C.axis }}>
                  {puzzle.ticker} . {puzzle.year}
                </span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: C.dim }} data-testid="story">
                {puzzle.story}
              </div>
              <div style={{ fontSize: 11.5, color: C.amber }} data-testid="result">
                {resultLine(state, puzzle)}
              </div>
              <GuessedLine guesses={state.guesses} puzzle={puzzle} easy={settings.easy} />
              <button type="button" onClick={onNext} data-testid="next" style={{ ...HINT_BTN, alignSelf: "flex-start" }}>
                next
              </button>
            </div>
          )}
          </>
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontSize: 11, color: C.axis }} data-testid="scorecard">
            {scorecardLine(stats)}
          </div>
          <button
            type="button"
            onClick={() => setShowCollection((v) => !v)}
            data-testid="collection-open"
            style={{
              background: "none",
              border: 0,
              padding: 0,
              fontFamily: MONO,
              fontSize: 11,
              color: showCollection ? C.line : C.axis,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            collection
          </button>
          <button
            type="button"
            onClick={() => {
              const next = { easy: !settings.easy };
              setSettings(next);
              saveSettings(next);
            }}
            data-testid="easy-toggle"
            style={{
              marginLeft: "auto",
              background: "none",
              border: 0,
              padding: 0,
              fontFamily: MONO,
              fontSize: 11,
              color: settings.easy ? C.amber : C.axis,
              cursor: "pointer",
            }}
          >
            easy mode: {settings.easy ? "on" : "off"}
          </button>
        </div>
      </div>
    </div>
  );
}
