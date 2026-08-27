# Wall Street, the spec

Route /street. Settled with Marlon August 25 in two interview rounds
after the monkey v3 MVP and the week's graveyard. The synthesis: Tally's
look and layered wall, The Floor's quick verbs, the monkey as live
rival, blackjack pacing. Five words: build a wall of money.

Standing contracts that bind here: docs/tape-shared.md (engine, read
only), docs/clean-type.md (type and copy), the unit law (blocks never
resize, their count changes), learning lives in the settle and summary
(Jared's recovered ask, docs/monkey-feedback-aug20.md addendum).

## 1. The picture

Tally's wall, live. A block is a fixed dollar unit ($25). The wall grows
one column per month as the tape plays, column height = your worth that
month in blocks, layered bottom to top by what you hold: cash color
first, then one color per stock. History stays on screen, so the wall IS
the chart, and the color bands ARE diversification, visible at a glance
with zero captions. Style base is Tally's parchment, cards, rails, and
buttons (src/components/tally/ui.ts is the reference), colorful per
Jared, chart-as-wall filling the screen.

## 2. The hand

- About 30 seconds: a hidden 12-month window of real prices, dealt by
  the monkey3 sampler rules exactly (equities only, one era, shared
  months, $2 to $150 opens, seeded, no window repeats in a session).
  Names and dates hidden in play, revealed at settle.
- You start with $1,000. Cards along the bottom, one per stock, Tally
  tabs with the Floor's speed: Buy puts about $250 of whole shares on
  the wall in one tap, Sell takes the same off. Blocks fly to and from
  the wall; money never moves from tapping a card face.
- No bills or windfalls in v1; the moment mechanic returns as a later
  level's disclosure once the core loop is proven.

## 3. The monkey

The impulse monkey. Its own smaller wall runs beside yours, same
$1,000. It buys its random pick at the open, then makes 2 or 3 seeded
impulse trades during the hand, each announced with a thock and a one
phrase line ("Monkey sold B, all in on A") as its wall recolors. It
never speaks otherwise; the tutorial died with the piggy.

The copy trap is emergent, not scripted: players only mirror monkey
trades that already look right, which means entering after the move,
which is chasing. The summary names it when it happens (section 5).

## 4. Winning

- **Target clears the level.** Tally's target rail: a dashed line on
  the wall, "Target $1,240". The target is window-relative so no deal
  is unwinnable: a factor of the riding line (equal split at open,
  held), 0.90 at level 1, 0.95 at level 2, 0.98 at level 3. Factors
  are tunable; the sim must show a do-nothing player clears level 1
  in at least four of five hands.
- **The monkey is the flex.** Beating it is the streak and the tally
  in the corner, never the door.
- Levels are Jared's ladder: one stock, three, ten (as many as the
  window holds, minimum eight), targets tightening. Finishing a five
  hand summary opens the next level, never the win count.

## 5. Settle and summary

- Settle, every hand: target cleared or missed, you against monkey
  against riding, then the reveal: real companies, real months, and
  from level 2 the window's headlines with their truth labels. One
  button: Deal again.
- Summary, every five hands: the five results, and three rule-based
  bullets from the trade log (the monkey3 rule pool carries over:
  sells given up, panic sells, peak buys, concentration, sitting out,
  with the always-computable fallbacks), plus one new rule with top
  priority when it fires: **copying the monkey** (a player trade in
  the same stock, same direction, within a month after a monkey
  trade: "You copied the monkey 3 times; it cost $84").

## 6. Code, reuse, checks

- src/lib/street/round.ts grows out of src/lib/monkey3/round.ts:
  sampler, riding line, bullets, progress carry over; the monkey plan
  gains impulse trades; targets and copy detection are new. monkey3
  stays untouched at /monkey3 as the shelf.
- Live wall components are new (Tally's wall is turn-based); Tally's
  ui.ts styles and sound patterns (src/lib/tally/sound.ts) are the
  base. Fixed-height wells everywhere: nothing may resize as values
  move, the v3 MVP's one visual failure.
- tools/streetSim.ts asserts: sampler rules, target fairness (the
  do-nothing clear rate per level), monkey impulse trades conserve
  value through the engine, copy detection on constructed logs,
  bullets always three, unlock path.
- tools/streetcheck.mjs walks two hands at 1440x950 and 390x844, the
  settle math, and the summary, with zero console errors.
- Desktop and phone both first-class; on phone the cards row scrolls,
  the wall fits the width.

## 7. Open for Marlon

- Block value ($25 is the guess) and target factors after the sim
  measures clear rates.
- Whether the monkey's announcements name the stock letter or stay
  wordless thock plus recolor.
- Whether beating the monkey earns anything durable (a streak is the
  spec's guess) beyond the corner tally.
