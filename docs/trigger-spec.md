# Trigger

One stock, one fast run, one button that is either in or out. At the end the
market tells you whether touching it was worth it.

Contract for the build. Shared engine: `docs/tape-shared.md`. Route `/trigger`.
Ten word pitch: **One stock, one minute. Beat the person who did nothing.**

This is Elijah's game built straight: realistic data, conflicting headlines,
buy and sell under pressure, and an end card against just holding. His frames
kept verbatim in `docs/timing-feedback-aug20.md`: the main focus is realtime
net worth and the historical price, "it would run very fast, so hard to keep
up", "I'd try starting w. One stock". A prior note: the chart-timing family was
shelved in the Aug 15 ideation round; Marlon explicitly reopened it for this
build on Aug 20.

---

## 1. The run

- A run deals one era and one stock from that era, random each time.
  `?era=&stock=&seed=` pins all three for walks and sharing.
- Start with $1,000 cash, all in cash, tape paused on a dealt card: company
  name, the year it is, one sentence of era mood. The card opens on a
  choice: **Free play** or **Levels**. Free play asks who plays, you or a
  bot you write (section 10); Levels is the ladder of real algorithms
  (section 11).
- SPEED = 1.6 months per second. Covid runs about 45 seconds, GFC about 67.
  No pause button; the run is short on purpose. Tab-hide pauses.
- A skip to end control sits by the era name on the run screen, drawn as
  the remote's fast forward: two arrows into a bar, aria label `skip to
  end`. Pressed, the tape runs at SKIP_SPEED (10) times pace, fast but
  still animated, one way, for that run only.
- The player is always fully in or fully out. **Buy** converts all cash to
  whole shares at the live price. **Sell** liquidates everything. There is
  nothing else to do, which is the point: the only skill expressible is when.
- The run ends when the months run out. No fail state; the punishment for bad
  timing is the end card.

**The deal pool**: every asset in the era files except `^SP500TR`. Companies
that go to zero (LEH, WCOM, ETYS, BCC) stay in at 1-in-8 weight: a run where
selling was the right answer is the best lesson the game owns, and holding
baseline finishing near zero while a seller survives is a legitimate win.
Crypto era deals BTC and ETH only; the meme coins price below a dollar and
the calculator reads silly.

## 2. Layout

Desktop 1440x950 and phone 390x844 are both first class; portrait is the
primary design and desktop widens it.

```
  March 2008                              the crash
  +------------------------------------------+
  |                                          |
  |   price since the start, line chart      |   right edge:
  |   year labels on the x axis              |   the meter
  |   live price chip on the right end       |   (section 4)
  |                                          |
  +------------------------------------------+
  "Lehman scrambles for a buyer"              <- one headline at a time

  12 shares x $84.12 = $1,009                 <- the calculator, the hero
  cash $0                                     net worth spark, corner

  [        SELL        ]                      <- one giant button
```

- **The chart** is the historical price from the run's first month to now,
  drawing rightward as the tape runs. X axis carries year labels always
  (charts without time labels are banned in this repo). No candles, no
  volume, one line. The full x range is fixed at the era's length from the
  start, so the line grows into the frame and never rescales horizontally;
  the y axis rescales only upward, never down, same monotonic rule as the
  meter.
- **The calculator** is Elijah's representation verbatim: shares x price =
  value, live, in large tabular-num digits. When out: `cash $1,000` large and
  the share line dimmed at zero. This line is the biggest text on screen.
- **The button** is one full-width action that reads Buy when out and Sell
  when in, green when out, red when in. Space bar triggers it on desktop.
  There is deliberately no confirm step. Where a keyboard is likely, wide
  viewport with hover and a fine pointer, the button carries a small `space`
  keycap beside its label, the command-bar hotkey convention; touch
  viewports never show it.
- **Buys and sells mark the chart**: a small dot at the price where each
  trade happened, so the end state carries your history. The end card reuses
  the marked chart.
- **Net worth over time** is a small sparkline in the corner, labeled, per
  Elijah's "could be there in the corner". It never gets bigger than that.

## 3. Headlines

One card at a time sliding through above the calculator, about one per 2.5
tape months, each visible about 2 seconds. Sampling, slants, and computed
truth labels per `docs/tape-shared.md` section 5. Real archived headlines
render with their serif-clipping treatment; authored ones render plain.

The run never tells you which were signal and which were lies while the tape
runs. The end card does.

## 4. The meter

Jared's three rules live on the right edge as the flat-unit strip defined in
`docs/tape-shared.md` section 6: your shares as one column of countable
slabs, thickness = price, and your cash as $10 ticks beside it, one shared
dollar scale set from the opening $1,000. Toggling in and out visibly pours
ticks into slabs and back. On phone the meter is a thin strip on the right
edge of the chart, 44px wide; it compresses, it never disappears.

The meter is secondary to the calculator on purpose. This game answers Elijah
first; the meter is the same truth drawn Jared's way, and the campaign game
gives it the starring role.

## 5. The end card

In order, largest first:

1. **You: $1,184.** One line, your final worth.
2. **Doing nothing: $1,391.** The holding baseline, judged by the same
   engine. The delta between the two is the score, colored, signed.
3. The marked chart: full run, your buy and sell dots on it, in and out
   spans tinted so time-out-of-market is visible at a glance.
4. Three small stats: trades made, months in the market of months total,
   best and worst single decision (largest dollar delta between a trade and
   the alternative of not trading that month; the engine computes both).
5. **Perfect timing: $2,930. Nobody trades like this.** One muted line, the
   ceiling from the shared engine, disclaimer always attached.
6. The headline reveal: the run's headlines listed with their computed labels
   (told the truth / meant nothing / pointed the wrong way). This is the
   only place labels appear, and it is the educational payload: some of what
   you reacted to was noise, and here is which.
7. Buttons: Play again (new deal), Same stock (same era and stock, new
   seed and headlines).

Best delta vs holding persists in localStorage `trigger-best`, shown on the
deal card as `best so far: +$212 over doing nothing`.

**Honest scoring note**: most runs will lose to holding, because that is what
the data does. The end card never moralizes about it; the numbers and the
reveal list carry the lesson, and the one-in-eight dead-company runs prove
selling is sometimes right, so the game is not rigged propaganda for
buy-and-hold either.

## 6. Copy

| Where | String |
| --- | --- |
| Landing card | Trigger |
| Landing description | Time the market, if you can. |
| Deal card button | Start |
| Deal card best line | best so far: +$212 over doing nothing |
| Button out | Buy |
| Button in | Sell |
| Button keycap, desktop only | space |
| Calculator in | 12 shares x $84.12 = $1,009 |
| Calculator out | cash $1,000 |
| End you | You: $1,184 |
| End baseline | Doing nothing: $1,391 |
| End ceiling | Perfect timing: $2,930. Nobody trades like this. |
| Reveal labels | told the truth / meant nothing / pointed the wrong way |
| Dead company end | The company went to zero. |
| Buttons | Play again, Same stock |
| Entry buttons | Levels / Free play |
| Mode tabs | You play / A bot plays |
| Deal card button, bot mode | Run bot |
| Sidebar rows | `5. Swing  +$212`, dollars only once played; `Free play` under the rule |
| Level card | level 5 of 10 |
| Level end buttons | human level: Next level, Replay level; bot level: Run 10 markets, Next level; Level select after the last |
| Skip control | the remote's fast forward, two arrows into a bar |
| Sim row | company, era, live delta, the chart, its latest headline |
| Batch summary | One bot, 10 markets; rows `Apple, the crash, 2007  +$212`; It beat doing nothing in 3 of 10 markets. |
| Batch summary buttons | View markets, Next level, Run 10 more |
| Bot panel | The bot is trading, the word bot clickable |
| Run screen, bot mode | The bot is trading |
| End you, bot mode | Bot: $1,184 |
| Stopped bot title | The bot broke a rule |
| Stopped bot buttons | Edit bot, Play again |

Sentence case, one phrase, no em dashes, nothing under 12px, no uppercase
labels. Era names reuse the wave names already in the suite: the 2020s, the
crash, the dot-com bust, the inflation years, the crypto winter.

## 7. Look

Dark trading floor, the Takeover ramp: background `#0C0F14`, panel `#1F2733`,
text `#E8EDF4`, muted `#8794A6`, up `#4ADE80`, down `#E5484D`. The chart line
stays one neutral color, `#D7DEE8`; do not tint it green and red by direction,
the calculator and the end card carry the judgment. Trade dots are colored by
side. In and out spans on the end-card chart tint the background, not the
line. `UI_FONT` everywhere. No mascot, no XP, no streaks.

## 8. Files

```
src/pages/Trigger.tsx              shell, deal card, end card
src/components/trigger/Chart.tsx   the growing line chart with trade dots
src/components/trigger/Meter.tsx   the flat-unit strip
src/components/trigger/Feed.tsx    the one-at-a-time headline card
src/components/trigger/CodeEditor.tsx  CodeMirror around the bot source
src/lib/trigger/bot.ts             the compiler and the action law
src/lib/trigger/bots/              one bot per file, filename = function name
src/lib/trigger/bots/assemble.ts   pure assembly: header + shelf + picker
src/lib/trigger/levels.ts          the level ladder, pure data
tools/botSim.ts                    fuzz harness, every bot on random tapes
tools/triggercheck.mjs             Playwright walk, both viewports
```

Plus the shared layer from `docs/tape-shared.md`. Route in `src/main.tsx`,
card on the Landing grid, route added to `tools/cleancheck.mjs` ROUTES.

## 9. Acceptance tests

All must pass at 1440x950 and 390x844. Walks pin `?era=gfc&stock=LEH&seed=7`
style URLs.

**A.** A full run with zero input ends with you equal to cash start, holding
baseline computed, and the end card showing both numbers different.

**B.** Buy then immediate sell changes worth by $0 (conservation, whole-share
remainder respected).

**C.** The calculator line always equals shares x live price to the cent, and
equals the meter's slab column height on the shared scale (rule 1 and the one
ruler in one check).

**D.** During ten seconds in a rising stock with no input, slab count is
constant and slab thickness grows by the price ratio (rule 2).

**E.** Selling pours the slab column into cash ticks of fixed size; tick
count = floor(value/10) with a sliver (rule 3).

**F.** Same seed, same era, same stock reproduces the identical headline
sequence and labels; a different seed changes the sample.

**G.** A run's headline mix is at least 30% signal and 25% lies.

**H.** The chart carries year labels at both viewports, and the y axis never
scales down mid-run.

**I.** An LEH run where the player sells before September 2008 beats the
holding baseline on the end card.

**J.** Space bar toggles the position on desktop; the button label and color
flip with the state. The button carries a `space` keycap at 1440x950 and
none at 390x844.

**P.** Bot mode with the untouched scaffold runs to the end card with no
input: at least one trade on the log and the card reading Bot: rather than
You:. Every other bot on the scaffold's shelf finishes a dead-company run
without breaking a rule.

**Q.** A bot that buys one share more than cash covers stops the run in its
first month, with the broken rule on screen and the tape frozen; code that
does not parse never leaves the deal card.

**R.** The ladder walks: the entry screen's Levels lands on the next
unplayed level's card, the sidebar toggle opens the level select with all
ten levels and Free play under the rule, a bot level's card shows its real
source read only, the run ends on a Bot: card leading with Run 10 markets,
ten markets run in parallel over one bot panel, the summary counts them and
View markets shows each slice, and Next level lands on the following
level's card.

**S.** Skip to end collapses a real-time run to about a tenth of its natural
length, end card included.

**T.** The word bot in The bot is trading shows the running source read only
and hides it again.

## 10. Bot mode

The deal card carries a choice of who plays. **You play** is the game as
specced above. **A bot plays** opens an editor on the card, prefilled with a
scaffold: a JSDoc header stating the contract, a shelf of example bots, from
a coin flipper through buy and hold, dollar cost averaging, swing trading,
momentum and a moving average crossover to a stateful bracket and a
self-rebalancing trend sizer, and a last line that picks the player,
`bot = randomBot`. The random default means the first Run bot always
produces a full run, and every bot on the shelf finishes any run without
breaking a rule. The source persists in localStorage `trigger-bot`; a
stored copy of the retired first-cut scaffold gives way to the current one.

- The player is whatever function `bot` names once the source has loaded:
  keep the shelf and repoint the last line, or define `function bot(...)`
  yourself. The bot takes `(prices, shares, cash)`: `prices` is every tick
  price the tape has shown so far, current price last; `shares` and `cash`
  are the account as it stands.
- The bot plays at the human's granularity, deliberately: the tape ticks
  `TICKS_PER_MONTH` (8) times a market month, about the cadence of a reflex
  on the space bar at game speed, and on every tick the bot sees the same
  smoothstepped price the screen shows and trades at it. Tick 0 included;
  ticks in the final month are skipped, where no trade can change the
  outcome. `ticks_per_month` is in scope so a strategy can still think in
  months.
- It returns an action `{ buy: n }`: positive n buys n shares at this
  month's close, negative n sells n shares, zero does nothing. Shares are
  fractional in bot mode; the whole-share law belongs to the space bar.
- Two helpers are in scope under these names:
  `max_shares_can_buy(prices, shares, cash)` and
  `max_shares_can_sell(prices, shares, cash)`.
- A wrong action stops the run: buying more than cash covers, selling more
  than held, buying a company priced at zero, returning anything that is not
  `{ buy: number }`, or throwing. The card that follows names the month and
  the rule broken, and Edit bot returns to the editor with the source
  intact. An early stop shows the account's worth where it froze; it never
  pretends to be an end card, because a half-played run has no honest final
  worth to hold against the baselines.
- Code that does not parse, or that never points `bot` at a function, never
  leaves the deal card: the error prints under the editor.
- On disk every bot is one file in `src/lib/trigger/bots/`, named after its
  function, with the contract header in `_header.js`. The shipped scaffold
  is assembled at build time from those files plus exactly one more fact,
  PLAYER in `bots/assemble.ts`, the bot the generated last line points at.
  Adding a bot is adding one file: SHELF_ORDER is presentation, not
  registration, and both the Playwright shelf walk and the fuzz harness
  discover new files on their own.
- `tools/botSim.ts` (npx tsx, like tapeSim) compiles every bot with the real
  compiler and plays it through the real action law, tick by tick, over a
  thousand seeded random tapes each: shock months, flat tapes, penny prices,
  unaffordable starts, and companies that die mid run. Math.random is
  replaced by the tape's seeded stream while a bot plays, so any failure
  reproduces from the printed tape number, randomBot included. A shelf bot
  that breaks a rule is a shipped crash, so any error is a red gate.
- The editor is CodeMirror 6: syntax highlighting, completion that knows the
  two helpers, and a live parse check in the gutter that reads the parser's
  own error nodes and so never executes the buffer. Code sits in a monospace
  face, the one scoped exception to the suite's no-mono law, exactly as the
  newspaper clippings sit in a serif; the walk's type audit scopes its ban
  around `[data-bot-code]`.
- During a bot run the space bar is dead and the button gives way to a panel
  reading The bot is trading, same footprint so the layout holds. The end
  card reads Bot: rather than You:, and a bot run never writes
  `trigger-best`: that record is yours.

## 11. Levels

Real algorithms over real data, in rising order of complexity, and no story:
each level names its player, shows the code when the player is a bot, and
the end card's numbers are the only commentary the game makes. The player
draws the conclusions. `src/lib/trigger/levels.ts` is the ladder as pure
data, and tools/botSim.ts checks every bot player it names exists on the
shelf.

1. You trade (the space bar) 2. Random 3. Buy and hold 4. Dollar cost
averaging 5. Swing 6. Momentum 7. Crossover 8. Brackets 9. Trend sizing
10. Your own bot (the writable editor as a level).

- The entry screen's **Levels** lands directly on the next unplayed level's
  card. Level selection is the collapsible sidebar: once a branch is chosen
  a toggle sits top left of the deal screens, and the drawer lists every
  level with its played state and dollars, then a rule, then **Free play**.
  Nothing is locked: the order is the complexity ramp, the player's path
  through it is their own.
- A level card shows `level N of 10`, the title, one mechanical sentence
  about the player, and, for shelf bots, the bot's own file read only in
  the editor with its picker line, exactly the source that runs.
- Every level run is a fresh random deal, the same pool free play draws
  from: the same algorithm meets different markets on different plays,
  which is the point.
- The best delta over doing nothing per level persists in localStorage
  `trigger-levels` and prints on the sidebar rows, colored and signed, so
  the level select doubles as the scoreboard of algorithms. An unplayed
  level simply has no dollars yet.
- After a bot level's watched run, the end card leads with **Run 10
  markets**: SIM_COUNT fresh random deals run in parallel at skip speed,
  stacked as shrunken market rows, each with its company and era, its live
  delta against holding so far, its chart with trade dots, and its latest
  headline; The bot is trading appears once beneath the stack, word still
  clickable. Every market has its own compiled bot, so a stateful strategy
  cannot bleed between markets; a market whose bot breaks a rule stops
  alone, reads broke a rule, and sits out the count. No (company, timespan)
  pair is dealt twice, within a batch or across the tally, until the pool
  itself runs out.
- When the slowest market ends, the summary lists every accumulated market
  with its delta over doing nothing, counts one fact (`It beat doing
  nothing in 3 of 10 markets.`), and offers **View markets**, **Next
  level**, and **Run 10 more**, which keeps adding to the same tally. View
  markets shows every finished run as its own slice, scrolling once there
  are more than fit on screen. The batch writes no level score; the
  scoreboard belongs to watched runs.
- During any bot run the word bot in The bot is trading shows and hides the
  running source, read only, in a fixed overlay that cannot move the chart
  row or the dollar ruler.
- The end card of a human level offers Next level and Replay level, with
  Level select in place of Next level after level 10. Free play keeps
  Play again and Same stock.
