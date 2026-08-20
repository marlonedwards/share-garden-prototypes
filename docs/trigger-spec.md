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
  name, the year it is, one sentence of era mood. One button: Start.
- SPEED = 1.6 months per second. Covid runs about 45 seconds, GFC about 67.
  No pause button; the run is short on purpose. Tab-hide pauses.
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
  There is deliberately no confirm step.
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
| Calculator in | 12 shares x $84.12 = $1,009 |
| Calculator out | cash $1,000 |
| End you | You: $1,184 |
| End baseline | Doing nothing: $1,391 |
| End ceiling | Perfect timing: $2,930. Nobody trades like this. |
| Reveal labels | told the truth / meant nothing / pointed the wrong way |
| Dead company end | The company went to zero. |
| Buttons | Play again, Same stock |

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
flip with the state.
