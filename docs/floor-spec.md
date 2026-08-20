# The Floor

The campaign. Five eras of real market history run as levels, one desk, a main
chart, a rail of other stocks, headlines that lie, and money that carries from
decade to decade.

Contract for the build. Shared engine: `docs/tape-shared.md`. Route `/floor`.
Ten word pitch: **Trade five decades. Keep what the crashes leave you.**

This is the Orb's mechanics rebuilt as Elijah's desk: his one-chart-center,
side-tab layout is Marlon's own framing from the same thread ("main stock in
the center and then side tab with the other stocks and you can buy/sell real
time"). Jared's three rules star here: the portfolio IS the flat-unit
representation, and it is also the navigation.

---

## 1. The campaign

Five eras, ordered by difficulty, money carrying forward:

| Level | Era | Data | Months | Speed |
| --- | --- | --- | --- | --- |
| 1 | The 2020s | eraCovid | 72 | 0.8 mo/s |
| 2 | The inflation years | eraInflation | 48 | 1.0 |
| 3 | The crash | eraGfc | 108 | 1.2 |
| 4 | The dot-com bust | eraDotcom | 96 | 1.4 |
| 5 | The crypto winter | eraCrypto | 85 | 1.6 |

- Start of campaign: $2,000 cash. End of each era, every position settles at
  its last real price into cash (rule-6 honesty from Tally: era companies do
  not follow you), a debrief runs, and the next era opens with your cash.
- An era runs 90 seconds to 2 minutes of tape plus gate pauses. The campaign
  is a 10 to 12 minute sitting, resumable: campaign state persists in
  localStorage `floor-run` so closing the tab does not eat the run.
- **Broke** (no holdings and cash below the cheapest share) fails the era;
  retry restarts that era at its opening worth. Campaign progress in
  localStorage `floor-progress`.
- `?era=&seed=` pins a single era run for walks; `?beat=` jumps inside it,
  the house pattern.

## 2. Layout

One desk. Desktop 1440x950; phone 390x844 restacks the same parts.

```
  worth $2,412        cash $310          March 2008 . the crash
  +--------------------------------+  +--------------+
  |                                |  | C     $18.40 |   <- the rail
  |   focused stock, line chart    |  | AIG   $32.11 |
  |   year labels, live price chip |  | F      $4.90 |
  |                                |  | WMT   $51.20 |
  +--------------------------------+  | AAPL $128.44 |
  headline ticker scrolling ......    | XOM   $81.03 |
                                      +--------------+
  [Buy 1] [Buy 5] [Buy max]  [Sell 1] [Sell 5] [Sell all]

  +-- your desk: the portfolio strip -----------------+
  |  cash   LEH    AAPL   XOM                          |
  |  ticks  slabs  slabs  slabs      (tap = focus)     |
  +----------------------------------------------------+
```

- **The chart** is the focused stock only, one at a time per the thread. Same
  chart rules as Trigger: line from era start, fixed x range with year
  labels, y never scales down, trade dots.
- **The rail** lists every stock in the era: name, live price, and a tiny
  12-month trend arrow, no sparkline charts on the rail (one chart at a
  time is the rule). Tap to focus; the chart crossfades in 200ms; the tape
  never pauses for a focus switch. Dead companies gray out with `gone`.
- **Trade buttons** act on the focused stock: Buy 1, Buy 5, Buy max, Sell 1,
  Sell 5, Sell all, the house convention, disabled not hidden when
  unaffordable.
- **The desk** is the portfolio strip across the bottom: one column per
  holding as countable slabs plus the cash column as $10 ticks, one shared
  dollar scale per the shared-engine rules. Tapping a column focuses that
  stock, so Jared's representation is the nav, not an ornament. Buys pour
  ticks into the focused column; sells break slabs back into ticks; era
  settlement pours every column into cash at once, the best moment in the
  game, 1.2 seconds.
- **Phone**: chart on top, ticker under it, rail as a horizontal chip row,
  desk as the bottom strip above the trade buttons. Everything present,
  nothing hidden behind a menu.

## 3. Headlines and gates

- The ticker scrolls continuously under the chart: mixed slants, seeded
  sampling, computed truth, all per the shared engine. About one new
  headline per 2 tape months. Tapping a headline does nothing; they are
  weather.
- **Gates**: 2 or 3 per era, at authored months. The tape pauses, one
  headline moment fills the desk: the headline (real archived ones
  preferred, serif clipping treatment), one sentence of situation, and two
  choices framed as actions (sell it all / ride it out, double down / stay
  put). Choosing acts immediately through the normal trade engine at live
  prices, then the tape resumes. Gate choices are logged and quoted back in
  the debrief, the Orb pattern. Reuse gate content from `src/content/era-*.ts`
  where it fits the timing framing; author the rest to match its voice.
- Gates are the acknowledgment layer: nothing else ever pauses or surprises,
  per the standing house rule.

## 4. The debrief, per era

1. **You: $2,412. Doing nothing: $2,105. The market: $2,340.** Three columns
   on one small chart of worth over time, you as the drawn line, baselines
   as flat-right reference marks. Holding = all-in on era open spread
   equally across the era's stocks; the market = the index baseline from
   the shared engine.
2. Three named stars, computed post-hoc from the trade log, house pattern:
   - **Beat the couch**: finished above the holding baseline.
   - **Kept pace**: finished at 90% of the index outcome or better.
   - **Lived to tell**: worth never fell below half the era's opening worth.
3. Your gate choices quoted back, with what happened to the price after.
4. The headline reveal list with computed labels, same as Trigger.
5. Continue button; era settles to cash on continue.

## 5. The campaign end

- The ledger: era by era, what you entered with and what you left with.
- Final worth against two full-campaign baselines run through every era:
  never trading at all, and the index the whole way.
- Biggest single win and biggest single loss (position, dollars), computed
  from the trade log like Takeover's acquisition ledger.
- Stars earned, 15 possible. Best campaign worth in localStorage
  `floor-best`. Play again resets to level 1 with fresh seeds.

## 6. Copy

| Where | String |
| --- | --- |
| Landing card | The Floor |
| Landing description | Trade five decades and keep what you make. |
| Level card | The crash. 2007 to 2015. |
| Level card button | Open the desk |
| Rail dead company | gone |
| Gate choice examples | Sell it all / Ride it out |
| Debrief you | You: $2,412 |
| Debrief baseline | Doing nothing: $2,105 |
| Debrief index | The market: $2,340 |
| Stars | Beat the couch, Kept pace, Lived to tell |
| Era settle line | Everything sells. |
| Broke card | You went broke. Try the era again. |
| Campaign end lead | You finished with $6,120. |
| Buttons | Continue, Try again, Play again |

Same type contract as everything else. Star names appear only on the debrief
and the end card, never as mid-run toasts.

## 7. Look

Same dark floor as Trigger, same palette, same chart rules, so the two games
read as siblings. The desk strip gets slightly warmer panel lighting than the
chart so the eye knows the bottom band is yours. No mascot, no XP, no
streaks, no market-mood face.

## 8. Files

```
src/pages/Floor.tsx                 shell, level cards, debrief, campaign end
src/components/floor/Chart.tsx      reuse Trigger's chart component if clean,
                                    fork only if props diverge
src/components/floor/Rail.tsx       the stock rail
src/components/floor/Desk.tsx       the portfolio strip, flat units
src/components/floor/Gate.tsx       the pause moment
src/components/floor/Ticker.tsx     the scrolling headline strip
src/lib/floor/campaign.ts           era ladder, carry, persistence, stars
tools/floorcheck.mjs                Playwright walk, both viewports
```

Route in `src/main.tsx`, Landing card, cleancheck ROUTES entry.

## 9. Acceptance tests

All at both viewports; walks pin seeds.

**A.** Focus switching never pauses the tape and never trades; the chart
crossfades and the rail highlight moves.

**B.** Buy 5 on the focused stock pours exactly five slabs into its desk
column and the matching ticks out of cash; worth unchanged at the instant
(rules 1 and 3, conservation).

**C.** Ten quiet seconds in a rising era: desk columns thicken with no slab
count change (rule 2).

**D.** The desk shares one dollar scale: a $10 tick measures the same pixels
in every state, and column heights equal shares x price on that scale.

**E.** Tapping a desk column focuses that stock.

**F.** A gate pauses the tape, its choice executes a real trade at the live
price, and the debrief quotes the choice with the price aftermath.

**G.** Era settlement converts every position to cash at last real prices;
the next era opens with exactly that cash.

**H.** Lehman goes to zero mid-era 3: rail shows `gone`, its desk column
collapses, worth drops accordingly, no crash of the run.

**I.** Debrief baselines match tools/tapeSim.ts's independently computed
values to the cent.

**J.** Kill the tab mid-era, reopen: the run resumes from the persisted
state.

**K.** Stars compute correctly on three canned trade logs (one per star,
fixture-tested in the sim harness, then verified once through the UI).

**L.** Full campaign is completable start to finish in a scripted walk, and
the ledger's row arithmetic sums to the final worth.
