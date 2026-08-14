# Guess the Stock: build contract

Status: approved for build, August 14. Decided across the August 13-14
interview rounds; the visual contract is variant B (the terminal) in
public/sketches/marketguessr.html. This document is the authority; the
sketch is the authority on look and tone.

## 1. The game in one paragraph

A real company's real year, drawn as a full unlabeled daily chart. The
player types who it is. Guesses are free and unlimited. One Hint button
deals hints off a fixed ladder; each hint counts against the puzzle's par.
Solve it or give up, read the one-line story of what that year was, press
next, get another. No session limit, no daily gate. The game teaches
market history because getting good at it requires learning what famous
years looked like. Learning is a side effect; it is never announced.

## 2. Laws (inherited from the August 12 review, binding)

1. Fun first, no tutorial: the first puzzle is learnable by poking.
2. No metaphors: charts are charts, dollars are dollars, real company
   names throughout.
3. Readable in one look; anything needing explanation is redesigned.
4. Honest data: every close is real (split and dividend adjusted, rescaled
   to the real quoted price at the mystery year's first trading day, same
   technique as tools/bake_era.mjs). Stories are factual. Market caps are
   real year-end values, rounded.
5. Freedom to fail: give up is always available and never scolded.
6. Copy: no em dashes, no emoji, no ALL-CAPS shouting, no jargon a kid
   would not know. Inside the game the voice is lowercase terminal calm.

## 3. Screen and skin

- Route /guess, page src/pages/GuessTheStock.tsx. Desktop-first: one
  centered column, roughly 560px, dark page.
- Terminal skin exactly per sketch variant B: page/panel #0C0F14, panel
  border #1F2733, chart background #090C10, gridlines #1B2330, axis text
  #5B6979, price line #4ADE80 with area fill rgba(74,222,128,0.07), body
  text #D7DEE8, bright text #E8EDF4, amber accent #E8B84B for hint pips
  and par, hint button green-outline style, monospace stack
  "SF Mono", ui-monospace, Menlo, Consolas, monospace.
- Header row: "guess the stock" left, puzzle number right ("no. 12").
- Scoreline: "hints" + five square pips (amber when spent) + "par 3" right.
- The chart: full mystery year from the first second. All ~252 daily
  closes as one line. Y axis in percent from the first trading day of the
  year (ticks adapt to range, negative years get -25%, -50%). X axis Jan,
  Apr, Jul, Oct, Dec labels with month gridlines. No volume bars, no
  ticker, no dates beyond month names, no dollars.
- Revealed hints as lines above the input: "> sector: technology" style.
- Input row: text box placeholder "company or ticker", green block caret
  feel, plus the hint button labeled "hint" and nothing else.
- Below: "guessed: google . amazon" quiet line of wrong guesses in order.
- A quiet "reveal answer" link under the input row: gives up, ends the
  puzzle as a fail.
- Back navigation to the landing, quiet, outside the play column.

## 4. Rules

- Guessing: free, unlimited. Case-insensitive, punctuation-insensitive
  matching against the company's name, its ticker, and a per-puzzle alias
  list (example: meta, facebook, fb all solve Meta). Wrong guess: shake
  the box, append to the guessed line, nothing else.
- The Hint button deals, in this exact order, one press each:
  1. widen: the chart gains one real year of daily data on each side,
     mystery year shaded as a band; axis percent stays anchored to the
     mystery year's first day.
  2. sector: one plain word or two (technology, energy, retail, banks,
     autos, media, health, food).
  3. year: the real year stamps onto the axis (Jan 2007 ... Dec 2007) and
     into the revealed-hint line.
  4. price: the y axis flips from percents to real dollars at the era's
     quoted scale.
  5. size: market cap at the end of the mystery year, curated real value
     ("$174B at year end").
- Par: per puzzle, 2 to 4. Score for a solve is hints used vs par; under
  par is the brag. No stroke language anywhere.
- Give up ("reveal answer"): records a fail, shows the reveal.
- Reveal (solve or fail): company name, year, the one-line story, the
  chart relabeled with real months+year and real dollar axis, result line
  ("solved with 1 hint, one under par" or "revealed"), and a "next" button
  that deals the next puzzle immediately.
- Puzzle order: the curated sequence below for the first run (most iconic
  first), then endless shuffle with no repeats until the pool is
  exhausted, then reshuffle. Position persists.
- Running scorecard, always visible, one quiet line: solved count, current
  solve streak, average hints against average par. Persist in
  localStorage "guess-stats". A fail breaks the streak.
- Deterministic entry for tests: /guess?p=<id> loads a specific puzzle.

## 5. Data

- New bake script tools/bake_guess.mjs, patterned on tools/bake_era.mjs
  (Yahoo chart API, UA header, adjclose rescaled so the series starts at
  the real quoted first price of the mystery year; 1d interval; window
  from Jan 1 of year-1 through Dec 31 of year+1 for widen).
- Output src/data/guessPuzzles.json: per puzzle {id, name, ticker,
  aliases, sector, year, marketCap (string like "$174B"), story, par,
  dates (ISO), closes, yearStartIndex, yearEndIndex}. Round closes to 3
  decimals. Keep the file under ~2 MB.
- V1 pool (bake all; drop any ticker whose data fails and report drops):
  aapl-2007 (par 2, "$174B", the iPhone year),
  tsla-2020 (par 2), gme-2021 (par 2), nvda-2023 (par 2), nvda-2022,
  nflx-2011 (the Qwikster year), nflx-2013, meta-2022, amzn-1998 (par 3),
  msft-2000, csco-2000, intc-2000, ko-1985 (the New Coke year, par 3),
  ge-2017, zm-2020, mrna-2020, pton-2021, f-2021, xom-2022, ba-2020,
  dis-2020, amc-2021, jpm-2008, c-2008, ibm-1993, wmt-1999, sbux-2008,
  shop-2020, coin-2022, pypl-2021.
  Rule: a puzzle needs the full mystery calendar year of daily closes;
  surrounding years may be partial (IPO edge) and widen simply shows what
  exists. Stories: one factual sentence each, written plainly, no hype.
- Dead companies (Lehman 2008, Enron 2001) are phase 2: they need daily
  reconstructions and are explicitly out of v1.
- Sector and market cap are curated in the manifest inside the bake
  script, not fetched.

## 6. Landing

Guess the Stock becomes the first card on the landing page, ahead of the
Tally, with a motif in the game's own language (a small green terminal
chart line on dark) and one line of copy in the landing's existing voice:
guess the company from one real year of its stock chart. Existing cards
shift down; nothing else on the landing changes.

## 7. Model layer

src/lib/guess/model.ts (pure, no React): puzzle state machine (hints
dealt, guesses, solved/failed), matching normalizer, percent/dollar axis
math, scorecard reducer, order/shuffle with persisted cursor. The UI never
recomputes logic the model owns. localStorage keys: "guess-stats",
"guess-cursor".

## 8. Acceptance tests

Model and data (runnable via npx tsx tools/guessSim.ts):
1. Matching: name, ticker, and every alias solve their puzzle; case and
   punctuation never matter; near-misses (google for Meta) never match.
2. Ladder deals in the fixed order and never repeats a hint.
3. Every pool puzzle has at least 248 closes inside the mystery year and
   correct yearStartIndex/yearEndIndex; widen data exists on at least one
   side; par is 2 to 4; stories and sectors nonempty; no duplicate
   aliases across different companies in the pool.
4. Percent axis: value equals close/firstClose - 1 to within float noise;
   dollar axis equals baked closes exactly.
5. Scorecard: solve under par, at par, over par all record correctly;
   fail breaks streak; averages update; reload-safe.
6. Order: no repeats until the pool is exhausted.
7. Copy audit: no em dash characters anywhere in new files.

Walk (node tools/guesscheck.mjs, Playwright, screenshots to
tools/shots/guess/): cold open on ?p=aapl-2007, wrong guess shakes and
lands in the guessed line, two hints deal in order, solve by typing an
alias, reveal shows story and relabeled chart, next deals a new puzzle,
give-up path records a fail, scorecard text survives a reload.

## 9. Verification loop (all must pass before reporting done)

npx tsc --noEmit; node tools/bake_guess.mjs (fresh bake succeeds, at
least 20 puzzles); npx tsx tools/guessSim.ts; npm run build; node
tools/guesscheck.mjs. Implementor takes and critiques screenshots against
the sketch before handing off; verifier re-runs everything adversarially.
