# The tape: shared engine for Trigger and The Floor

One engine under both timing games. This document is the contract for the
shared layer; the games own nothing in here and this layer knows nothing about
either game's UI. Feedback that produced it: `docs/timing-feedback-aug20.md`
(Elijah's loop) and `docs/coin-stacks-feedback-aug19.md` (Jared's three
representation rules).

Type rules in `docs/clean-type.md` govern every string in both games. No
monospace anywhere, including the calculator readout: tabular-nums on the
system stack is the house way to keep digits steady.

---

## 1. Files

```
src/lib/tape/engine.ts      clock, price interpolation, portfolio, trades,
                            baselines, run log. Pure, no React, no DOM.
src/lib/tape/headlines.ts   pool selection, seeded RNG, truth labeling
src/data/headlinePool.ts    authored headline pool, per era
tools/tapeSim.ts            npx tsx harness asserting every invariant below
```

Era data is the existing baked JSONs in `src/data/` (dotcom, gfc, covid,
inflation, crypto), used exactly as they are. `^SP500TR` is the index series.
Real company names, written the way the companies write them, same policy as
Takeover.

---

## 2. The clock

- 1 real second = SPEED market months. SPEED is a game-level constant, not a
  user control. Trigger runs at 1.6, The Floor ramps 0.8 to 1.6 across eras.
- Prices interpolate between monthly closes with a smoothstep, so numbers and
  charts move continuously rather than stepping once a second.
- The tape pauses when the tab is hidden (visibilitychange) and during any
  gate or overlay. There is no rewind and no fast-forward.

## 3. Money

```ts
cash: number                       // dollars, cents kept
holdings: Record<Ticker, number>   // whole shares only
worth = cash + sum(shares * price)
```

Whole shares, no fees, no spread, no shorting, no margin. Buying spends
`floor(cash / price)` at most; remainders stay cash. Conservation invariant:
a trade never changes worth at the instant it executes.

## 4. Baselines

Computed by the engine from the same series, never approximated:

- **Holding**: all-in at the run's first month under the same whole-share
  rule, held to the end, remainder cash. This is Elijah's "just holding".
- **Index**: the same starting dollars in `^SP500TR` over the same months
  (fractional units allowed, an index fund sells fractions).
- **Perfect timing**: `start * product over months of max(1, p[m+1]/p[m])`,
  the all-in-or-out optimum with monthly moves. Shown only as a ceiling with
  a disclaimer; no score ever depends on it.

## 5. Headlines

Elijah's requirement, exactly: random each time, conflicting as in real life,
and you cannot win by reading them alone.

**The pool** (`src/data/headlinePool.ts`): at least 40 authored headlines per
era plus the verified real ones from `src/lib/headlines.ts` flagged `real`.
Each entry:

```ts
{ era: "gfc", month: "2008-09",     // placement, or a month range
  about: "LEH" | "market",          // which series judges it
  text: "Lehman scrambles for a buyer",
  slant: "up" | "down" | "steady" }
```

Authored text must be one phrase, present tense, no em dashes, nothing a real
paper could not have printed that month. Nothing invented about real
companies that did not happen; write mood, not fabricated facts.

**Truth is computed, not authored.** At load, each placed headline gets a
label from the actual forward move of its series:

```
r = p[m+3] / p[m] - 1            // clamped at series end
signal  if slant matches sign(r) and |r| >= 4%
lie     if slant opposes sign(r) and |r| >= 4%
noise   otherwise
```

**Sampling**: one headline per ~2.5 tape months, drawn with a seeded RNG so
`?seed=` pins a run for walks. A sample is rejected and redrawn unless the
run's mix lands at 30% or more signal and 25% or more lies. Labels are never
shown during play; the end card may reveal them in a debrief list.

## 6. Jared's three rules, flat

The representation both games share, with zero 3D and zero coin styling:

- **A share is a slab.** One flat rectangle per share, thickness = price on
  the current dollar scale, stacked into a column per holding. A visible seam
  between slabs keeps them countable.
- **Growth is thickness.** Price moves change every slab's thickness live;
  slabs are never added or removed except by a trade.
- **Cash is ticks.** Fixed-thickness units of $10, drawn narrower and in one
  neutral color, with a countable remainder sliver. Selling visibly breaks a
  slab into ticks; buying fuses ticks into a slab of the same total height.

One dollar scale per view, shared by every column including cash. Set once
from the run's opening worth (`0.85 * meterHeight / startWorth`) and only
eased down when a column would overflow; never eased up, and never changed by
a trade. Conservation makes overflow-by-buying impossible.

## 7. Engine invariants (tools/tapeSim.ts asserts all of these)

1. Worth is unchanged across any trade at the instant of the trade.
2. Buying never spends more cash than exists; shares are always integers.
3. Holding baseline equals a zero-trade run replayed through the engine.
4. Perfect-timing baseline is never below the holding baseline.
5. Truth labels are a pure function of pool + series; same seed, same run.
6. Every era pool yields a legal sample mix for 100 consecutive seeds.
7. A series that reaches zero marks the company dead; its shares price at 0,
   it cannot be bought, and worth reflects the loss immediately.
