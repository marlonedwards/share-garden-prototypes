# Monkey Trade, version 3: blackjack with the market

Supersedes docs/monkey-spec.md and docs/monkey-spec-v2.md as the game's
contract. Settled with Marlon August 25 from Jared's recovered follow-ups
(docs/monkey-feedback-aug20.md, addendum): ONE Random Monkey, the
learning in the end-of-level summary, three bullets on the trade
sequence. Revised the same day after an adversarial review against
Jared's and Nick's recorded feedback; all fourteen findings folded in.
The darts, the troop, the wedge board, the rank strip, and the era
campaign are gone. v1 stays live at /monkey until Marlon accepts v3.

The pattern, Marlon's words: as fun and as simple as blackjack. Short
hands, instant re-deal, the monkey is a rule you race. The lessons are
shown in the player's own dollars, never moralized in prose. Nick's
Game of Life frame stays parked; hands could group into ages later.

## 1. The barrel

The barrel holds the hand's random choices, and WHAT it holds is the
progressive disclosure: at level 1 it holds twelve month tiles (the
random axis is when), from level 2 it holds one tile per stock on the
desk (the random axis is which). The axis of chance changing is what a
new level introduces, visibly, without a caption.

## 2. The hand

1. **Deal.** A hidden 12-month window of real prices. Sampler rules:
   equities only (no BTC, ETH, DOGE, no TLT), every stock on one desk
   from the same era and the same real months, opening prices between
   $2 and $150 so $1,000 of whole shares is never degenerate and price
   magnitude leaks no identity, no window repeats within a session,
   seeded so any hand replays identically. Names and dates hidden in
   play, revealed at settle.
2. **The monkey draws.** Level 1: it draws a month tile and goes all in
   at that month, holding to the end, so random means something and
   holding from month one can honestly beat it. Level 2 up: it draws a
   stock tile and goes all in at month one. One draw, one second, then
   it sits beside its pile for the whole hand.
3. **You play.** Both start at $1,000. Level 1: one button, all in or
   all out at the live price. Levels 2 and 3: Buy and Sell per stock,
   whole shares, flat-unit desk strip, height is dollars. Chart in the
   bottom third (Jared's demotion), desk and monkey on top.
4. **The tape runs** about 24 seconds, 2 seconds a month, tuned in
   build. No headlines during play; they would name what the deal hid.
5. **The moment.** Once per hand, at a seeded month, the tape pauses
   about two seconds on a two-choice card at live prices. Level 1: a
   windfall ($200 lands: put it in, or hold it as cash). Level 2 up: a
   bill ($150 due: pay from cash, or sell something), windfall or bill
   seeded. It hits the monkey too, which answers by rule: windfalls go
   in, bills sell just enough. Every hand holds at least one real
   decision even for a player who has learned to sit still, and the
   comparison stays fair.
6. **Settle.** Everything sells at the last real prices. Jared's
   sentence: "You did $86 worse than Random Monkey." A tie is not a
   win and does not break a streak. The reveal names the company and
   the real months, and from level 2 lists the window's headlines with
   their computed truth labels (signal, noise, lie), which is where the
   headline layer now lives. One button: Deal again.

## 3. The session and the summary

- A corner tally: hands won against the monkey, current streak.
- Every five hands, the summary, where the learning happens (Jared,
  verbatim). The five-hand set is the honest statistical unit: your
  five hands against the monkey's five independent draws, the riding
  line as the stable third comparator, then three bullets.
- **The riding line**, defined at every level: $1,000 split equally
  across the desk at month one and held. At level 1 that is holding
  from the start, distinct from the monkey's random entry.
- **Three bullets, rule-based** from the trade log, no LLM, no fees
  invented. Priority pool: timing shortfall (what your round trips
  earned against riding those same months: "your 9 trades cost $112
  against riding"), panic selling (sold within two months of a drop,
  what staying paid), peak buying, concentration (levels 2 up), and
  sitting out (cash against the riding line). When fewer than three
  fire, always-computable fallbacks fill in: against the riding line,
  against the monkey's five, best and worst single trade. Each bullet
  is one phrase with a dollar figure, praise uses the same rules with
  the same numbers.

## 4. Levels and what each one teaches

Outcomes are design targets, never captions on screen.

- **Level 1, one stock.** Teaches timing against holding: entering
  early and staying usually beats a random entry, and beats your own
  churn. The moment is a windfall.
- **Level 2, three stocks.** Teaches spreading against concentration:
  the monkey is one lottery ticket, a spread desk rides through what
  sinks it. Bills arrive, the cash-needs lesson the monkey answers by
  rule and you answer under pressure.
- **Level 3, as many equities as the era holds** (nine in the dotcom
  era today; reaching Jared's ten is a data-baking task in the build
  order, never a reason to mix eras). Teaches that attention runs out
  before the desk does: wider choice, same $1,000, same 24 seconds.
- **Unlocks:** finishing a level's summary opens the next level.
  Beating the monkey is the tally and the streak, never the door, so
  the loop verb stays Deal again and nobody walls out of the levels
  Jared asked for.

## 5. Look, feel, sound

Colorful and enticing per Jared, and per Jared explicitly plural:
**three static direction mocks of the same mid-hand screen come first**,
one Candy Crush leaning, one Duolingo leaning on the v1 art, one
Robinhood leaning, and Marlon picks before the stage is built.
docs/clean-type.md binds all three: system stack, no mini caps,
one-phrase copy. Sound reuses the v1 module's thocks and settles.
Mobile is first-class: on narrow viewports the desk stacks above the
chart and trading works through a focused stock (tap a column to
focus, one Buy and Sell pair), The Floor's pattern, because ten
tradeable columns on a phone already failed in the v2 mockup.

## 6. Engine, code, walk

src/lib/tape/ unchanged and read-only: whole shares, conservation,
computed baselines, seeded windows. New code in src/lib/monkey3/.
Build order: rules and sim first (tools/monkey3sim.mjs asserting the
sampler filters, moment conservation on both sides, tie handling,
every bullet rule on constructed logs, riding-line math against the
engine's baselines), then the three direction mocks, then the stage,
then the walk (tools/monkey3check.mjs: a full seeded hand at 1440x950
and 390x844, settle math, the moment on both sides, bullet fallbacks,
the unlock path).

## 7. Route and acceptance

Build at /monkey3. On Marlon's acceptance /monkey serves v3 and v1
moves to /monkey1. The v2 build survives on the monkey-v2 branch;
main was reset to origin August 25.

## 8. Open for Marlon before build

- Hands per summary (five is the guess) and moment amounts ($200
  windfall, $150 bill are guesses).
- Whether the monkey has a name beyond Random Monkey.
- Whether level 1 keeps the single all-in button or shares Buy/Sell.
- Whether the monkey answering bills by rule reads as fair or as the
  monkey cheating, judged at the mock.
