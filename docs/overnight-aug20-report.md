# Overnight run report, August 20 2026

Build of Trigger and The Floor on the shared tape engine, per
docs/overnight-aug20-prompt.md. This file logs what was built, every judgment
call where a spec was silent, known debts, the acceptance checklist, and the
live links. Written as the run goes.

## Status

- Started from clean main at 63d7eb7.
- Engine landed: src/lib/tape/engine.ts, src/lib/tape/headlines.ts,
  tools/tapeSim.ts. Invariants 1 to 4 and 7 pass; 5 and 6 are coded and were
  proven against a scratch pool, and flip on automatically when the real
  headline pool lands.
- Headline pool landed: 663 entries. tapeSim passes all seven invariants
  against it, 100/100 legal seeds per era with zero fallback draws. A final
  copy polish pass and an independent headline audit are still to run.
- Route wiring done: /trigger and /floor routes, landing cards, and cleancheck
  ROUTES entries, all verified against the running dev server.
- Both games built. Trigger passed its verify loop after two fix rounds
  (calculator hierarchy on phone, animated pour, then a text-measurement
  overflow in the fit helper); The Floor verified CLEAN on its first round.
  The Floor reuses Trigger's chart component unmodified; no fork exists.
- House-bar review done: both games held with real findings. Trigger: the
  meter's ruler moved on trades, replay buried below ~29 reveal rows, the
  chart's opening y window turned a 2% move into a cliff, and the deal card
  never stated the premise. The Floor: the desk never drew a countable unit,
  the settle pour unmounted instead of pouring, the phone sell row was
  clipped and shifted under the thumb, level 5 opened with every button
  dead, the debrief overlay leaked the live desk through it, plus data
  honesty (ZM and PTON tradeable at flat pre-IPO backfill prices) and
  sibling drift (two money formats, two flat-unit visual languages). Fix
  rounds running at both teams.
- Both fix rounds landed. Trigger: calculator block reserves its tallest
  state so trades cannot flex the ruler (scale bit-identical across the
  trade instant), end card pins replay on screen with the reveal list as the
  one internal scroll, the shared chart opens with a minimum span so a small
  move cannot fill the frame, the deal card carries the spec's pitch line,
  ticks group in tens, safe-area padding on phone. The Floor: all thirteen
  findings closed, see the Floor fix round section.
- Confirmation review: Trigger SHIP, all four findings closed with
  pixel-sampled evidence and no new findings. The Floor closed thirteen of
  thirteen, but the pass surfaced two new defects confined to the debrief
  card: the sticky Continue bar occluded reveal rows on real runs (a fix
  round regression, invisible via beat shortcuts), and the worth chart's
  value labels collide when a finish lands near a baseline. A scoped fix
  round closed both (debrief card split into a scrolling body and a footer
  that owns Continue; collision-aware label layout with leader lines), and
  the reviewer confirmed both closed across four debriefs on three eras.
- Final verdicts: Trigger SHIP, The Floor SHIP.
- Deployed: commit cdea75a pushed to main, all six gates green (typecheck,
  build, tapeSim, cleancheck, triggercheck, floorcheck), live bundle
  verified to carry both games. The build's two CSS warnings pre-exist on
  main (old Tally walk scripts feeding Tailwind's scanner) and are not from
  this work.

## Live links

- Trigger: https://marlonedwards.github.io/share-garden-prototypes/#/trigger
- The Floor: https://marlonedwards.github.io/share-garden-prototypes/#/floor

## Acceptance checklist

Every acceptance test in each spec's final section maps to a named check in
the game's walk (tools/triggercheck.mjs, tools/floorcheck.mjs) or the sim
harnesses (tools/tapeSim.ts, tools/floorSim.ts). All pass at 1440x950 and
390x844 on pinned seeds.

Trigger (spec section 9):

| Test | Check | Note |
| --- | --- | --- |
| A | A_zero_input_run | zero-trade run ends at cash start, both numbers shown |
| B | B_conservation | two toggles in one JS turn, cash returns exactly; engine invariant 1 |
| C | C_calculator_ruler | visible line = shares x price = column height on the scale |
| D | D_thickness_tracks | slab count constant, thickness tracks price |
| E | E_sell_pours_ticks + E_pour_animates | tick count, fixed tick size, sliver, animated both ways |
| F | F_same_seed_same_run | seed 7 twice identical, seed 8 differs; engine invariant 5 |
| G | G_headline_mix + G_reveal_copy | mix >= 30/25, three exact label strings; engine invariant 6 |
| H | H_years_and_axis | year labels both viewports, y axis never shrinks |
| I | I_leh_seller_wins | sell before September 2008 beats holding |
| J | J_spacebar | label and color flip |
| extra | K_type_*, L_*, M_calculator_is_largest, N_calculator_fits_box, O_scale_survives_trade | type behind the Start gate, replay above the fold, hierarchy and fit sweeps, ruler stable across trades |

The Floor (spec section 9):

| Test | Check |
| --- | --- |
| A | A_focus_switch |
| B | B_buy_five |
| C | C_quiet_thicken |
| D | D_one_ruler |
| E | E_column_focus |
| F | F_gate_trade |
| G | G_settlement_carry |
| H | H_lehman_gone |
| I | I_baselines |
| J | J_resume |
| K | K_stars (fixtures in floorSim, one verified through the UI) |
| L | L_full_campaign |
| extra | type_contract, M_countable_unit, N_settle_pour, O_stable_trade_row, P_listing, Q_crypto_open, R_debrief_card, S_gate_balance, U_debrief_bottom, V_worth_labels |
- Headline audit complete. An independent verifier fact-checked all authored
  entries against real market history: 18 findings (misattributed tickers,
  events placed months off, one real clipping outside its dateline month),
  all fixed with compensating placements so no era lost its signal or lie
  supply, then re-verified CLEAN. Final pool: 669 entries, 638 authored and
  31 real, all seven sim invariants green, 100/100 legal seeds per era with
  zero fallback draws.

Pool author, where the contract was silent:

- Real headlines keep their original title case and punctuation, since they
  are quotations from named papers, not site copy.
- The Barron's "Burning Up" cover is judged by ETYS and the Bear Stearns
  clipping by C, because neither subject is a series in its era and a
  same-sector name is the honest proxy.
- The AIG rescue clipping sits at 2008-09, its printed date, rather than the
  colliding atStep the old clipping system used.
- Every authored line is mood only; where a specific event is named, it
  happened that month.

## Judgment calls

- Pool type contract (tape-shared.md section 5 shows the fields but not the
  export): `src/data/headlinePool.ts` exports `HEADLINE_POOL: PooledHeadline[]`
  with `{ era, month, monthEnd?, about, text, slant, real?, source?, date? }`.
  A month range is expressed as `month` plus optional `monthEnd`, inclusive.
  Real archived headlines from `src/lib/headlines.ts` are folded in with
  `real: true` and an authored slant, since the originals carry none.
- `about: "market"` is judged against `^SP500TR`, the only index series in the
  era files.

Engine team, where the contract was silent:

- Steady slant labeling: |r| < 4% is a signal, |r| >= 4% is a lie, no noise
  band for steady. The smallest rule consistent with the directional cases.
- Dead companies are encoded as 0 in the era files; death is the first index
  that is zero and never positive again. Nulls read as 0.
- "Cents kept" means no internal rounding: cash stays a full float and the UI
  rounds for display, so conservation is exact.
- Baselines take a focal ticker (default the first); The Floor passes its own
  when it needs a different holding baseline.
- Sampling takes the pool as an argument, never imports the data file, so the
  sim can inject fixtures.
- Sample count is min(round(span / 2.5), candidates); no headline repeats in a
  run, and placement prefers unclaimed months so headlines do not bunch.
- Truth labels ride in a sibling record keyed by id, never on the play
  surface; the sim asserts no label key leaks.
- Mix rejection falls back deterministically after 60 missed attempts, and the
  sim prints the per-era fallback count so a thin pool is visible, not silent.

Trigger team, where the contract was silent or fought itself:

- Spec departure, flagged loudly: the trigger spec says the crypto era deals
  BTC and ETH only, but with $1,000 and whole shares BTC is unbuyable at
  every month in the file, and ETH is unbuyable in 2018-01. Rule adopted: a
  run's window starts at the first month the dealt asset costs $1,000 or
  less, and an asset with no such month is not dealable. Crypto deals ETH
  only, from 2018-02. Whole-share math is non-negotiable, so the invariant
  won over the spec's letter.
- A test-only turbo URL param multiplies SPEED for the walks, divides the
  headline dwell to match, defaults off, changes nothing else.
- Slab seams draw every ten units once a per-share seam would fall under 3px,
  so tall columns stay countable in tens.
- Headline dwell adapts (1900/1200/800ms by backlog) so the feed never falls
  more than about three tape months behind.
- "The company went to zero." also shows mid-run under the button once the
  price is zero, not only on the end card.
- Editing the pinned URL re-deals live.

Floor team, where the contract was silent or fought itself:

- A test-only turbo URL param multiplies the tape rate; turbo=0 freezes the
  tape so walks can measure conservation at an instant. Defaults off.
- Columns draw one rectangle per share or per ten dollar tick while that
  rectangle is at least three pixels thick, then band up a power of ten at a
  time, seaming every block, and never past the column's own unit count; the
  caption always carries the exact number. Exact values stay on data
  attributes. Superseded the first build's 300-then-60-bands rule after the
  house-bar review found the desk never drew a countable unit.
- The debrief opens with positions still held at last real prices and
  Continue plays the 1.2 second settle pour, since the spec settles the era
  on Continue.
- The campaign end prints exactly the two baselines section 5 asks for,
  never trading at all and the index the whole way. The equal-weight basket
  compounded era by era was removed after the review; see the resolved open
  question below.
- The level card leads with the copy-table string and puts "Level 3 of 5"
  under it, because clean-type bans a label stacked above a heading.
- ?seed= always starts a fresh campaign, ignoring saves, so walks are
  reproducible.
- The chart component was reused from Trigger unmodified; no fork exists.

Floor fix round, after the house-bar review (all thirteen findings closed):

- The desk takes a share of the window rather than a strip at the bottom of
  it: 38% of the height on desktop and 30% on phone, with the chart taking
  whatever is left. Every other part of the desk screen has a fixed height,
  so the chart is the only thing that moves when the window does.
- The reveal list is the headlines that actually ran on the ticker, computed
  through the ticker's own layout function rather than off the sample, since
  the strip drops a headline it cannot show within three months of its month
  and a reveal that quotes a line you never read is not a reveal. All of them
  are listed, in an internal scroll, with the count stated above it.
- The listing rule is computed rather than hardcoded: a leading run of three
  or more identical closes is backfill and the company lists on the last
  month of that run. Across all five era files it fires on exactly Zoom
  (April 2019) and Peloton (September 2019). Unlisted means no focus, no
  buys, no desk column, and a rail row that reads "lists April 2019".
- The rail's trend arrow reads three months, not twelve, and carries no
  label. Three months is also the horizon the shared engine judges a headline
  on, so the arrow and the truth labels answer the same question.
- Money and price now come from src/lib/trigger/format.ts, one
  implementation for both games. The desk adopts Trigger's slab green and
  tick grey and its seams, so the flat unit is one representation.
- Gates and the broke card join the debrief in being fully opaque. Nothing
  that stops the tape lets the live desk read through it.
- Continue sticks to the bottom of the debrief card, because three gate
  quotes and forty headlines push it past the fold on a real run.

## Open questions for Marlon

- Resolved during the run: the first Floor build added a third campaign-end
  baseline, the equal-weight basket compounded era by era, which reached
  $2.76 million and read as the game mocking the player (the house-bar
  reviewer agreed it could not ship). The spec's letter asks exactly two
  full-campaign baselines, never trading at all and the index the whole way,
  so the compounded basket was removed. The per-era debrief keeps its
  spec-mandated equal-weight holding baseline. Nothing to decide unless you
  want the compounded number back.
- The campaign's landing copy promises five decades but the difficulty
  ladder runs 2019-2024, 2021-2024, 2007-2015, 2000-2007, 2018-2025: levels
  one and two overlap in time and the ladder moves backwards. The copy table
  was followed as written; reordering eras or rewording the pitch is yours
  to call.

## Known debts

- Trigger: a headline can surface up to about three tape months after its
  month when several land close together; visible only on real clippings,
  which print an exact date.
- Trigger: "best so far" copy reads awkwardly when the stored best is
  negative; the copy table's template was kept as written.
- Trigger: headlines are era-wide by the shared contract, so a Lehman run
  shows Ford and Walmart headlines too; a one-stock game might later want a
  bias toward the dealt company.
- Trigger: the end-card reveal list runs about 40 rows on a long era and
  scrolls rather than filtering to what actually aired.
- Trigger: the chart's opening seconds read compressed on long eras because
  the x range is fixed at the full era from the start, which the spec
  mandates.
- Engine: perfect timing on crypto is about 16,500 times holding for XRP,
  mathematically correct for the monthly optimum but a number end cards must
  frame carefully.

## Acceptance checklist

(filled in when the walk scripts land)
