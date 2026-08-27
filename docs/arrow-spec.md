# Arrow, the spec

Settled August 27, 2026, from the AC call (docs/testing-feedback.md,
both August 27 entries) and two question rounds with Marlon. Thesis,
Nick's words: investing is not gambling, and the learning outcomes
exist to prove it. Drama, Jared's words: survive the temptation of
single stock trading. Audience: 18 to 24 plus. The garden
(docs/garden-idea.md) is parked for its younger audience, not deleted.
Route /arrow, name Arrow.

## 1. What it is

A 1:1 fake trading app, Robinhood-shaped, built from screenshots, and
framed as PRO TRADER: you manage other people's money. Each level is a
client with a real messy portfolio at a real historical snapshot and a
life deadline; hit the target and keep the client. The home chart is
the TOTAL PORTFOLIO line, the real app's own choice: one graph for how
the client is doing, the pie for why, individual stocks behind taps. You can rebalance
calmly at the close and let time run, or you can day-trade through the
open sessions, and the game never stops you: it just keeps score
honestly, and the score says what churn costs. Real company names,
real data, hindsight embraced: the game is about behavior under
temptation, not stock picking.

## 2. The day and the close

- **The open** runs live: an intraday path synthesized from that real
  day's open, high, low, and close. A day you engage with takes
  fifteen to thirty seconds. A day you leave alone flies by in about a
  second.
- **Live, no pausing.** The clock never stops. The close is breathing
  room, not a modal: prices freeze at 4:00 while time keeps rolling,
  and orders queued any time fill at the next open, which is exactly
  how market-on-open orders work. Stocks close; that is the point. (A
  market that never closes is a later-level temptation, see section
  8.) Intraday and interday cadence is tuned in build; Marlon has
  final say at the mock.
- **Design law: churn costs session time.** Holding fast-forwards;
  day trading makes every day long. The casino eats your evening by
  construction, and the player feels it in their thumbs.
- **Horizons escalate.** Level 1 spans about a month of trading days;
  mid levels a year; late levels several years. The deadline is always
  visible as a date.

**The day, in numbers.** All tunable; Marlon judges them live at the
stage. The clock never stops; interaction changes its speed, never its
state.

- **Cruise:** an untouched trading day takes about 2 seconds: the
  portfolio line draws the day's path, 4:00 stamps the day's gain or
  loss, a short after-hours tick, next open. A weekend is one blink.
- **Engaged:** opening a stock page, a trade ticket, or the options
  chain dilates time to about 20 seconds per day: the intraday path
  (synthesized from the real day's open, high, low, close) plays out,
  quotes tick a few times a second, market orders fill at the live
  synthesized price. Closing the sheet lets time accelerate again.
- **After hours:** every day has one, about 2 seconds at cruise,
  around 8 at engaged speed: prices frozen, the order queue open.
  Orders placed here fill at the next open. Long enough to rebalance
  calmly, never a pause.
- **The acceleration ladder:** each consecutive untouched day speeds
  cruise up, capping near 0.8 seconds a day after a week of holding;
  any interaction resets it. This is the churn-costs-time law in
  numbers: a month-long level 1 runs 45 to 90 seconds untouched and
  several minutes traded; a one-year level is 5 to 8 minutes for a
  holder; multi-year levels stay sane only for the patient.
- **The day's fixtures:** notifications land at the open of the day
  they concern, the movers list updates through the day, options decay
  reprices at each close, expiries settle Friday at 4:00, and earnings
  dates (later levels) are marked on the calendar strip in advance.

## 3. A person and a deadline

- Every level is somebody's mess with a reason: the cousin's
  meme-heavy account and tuition due in eighteen months; the engineer
  with everything in their employer; the retiree who is all cash and
  losing to prices. Four to ten real tickers plus cash, flawed by
  archetype, snapshotted at a real date.
- The goal is a dollar amount on a date, calibrated against the level
  window so that calm play wins: the sim must show that
  rebalance-once-and-hold clears the goal in at least four of five
  dealable windows per level. Churn and options lower the odds; the
  game never rigs a price to punish, the data does it.
- Missing the deadline fails the level; retry deals a fresh window.

## 4. The temptations, first build

- **Temptation is diegetic, never a call to action.** No pop-up ever
  says trade. The movers list sits there on a normal day; one curious
  tap starts the chase. Notifications report, they do not instruct.
- **Options, through the real ladder.** Reached from a stock's own
  page, never offered. Replicate Robinhood's actual options design,
  the strike ladder with the how-much-you-can-make framing, because
  that design IS the trick and reproducing it faithfully is the
  lesson's delivery mechanism. Weekly calls and puts, fixed strikes
  near the money, priced by a simple documented model off the real
  daily bars, decay visible day by day, expiry settling on the real
  price. The approval moment stays one quiet toast.
- **Margin, one rung higher.** Double buying power, daily interest,
  a margin call when equity thins. Unlocked after options, same
  satire.
- Deferred to later levels: the hype feed on the headline engine, evil
  companies (the pitch that was a lie), and the market that never
  closes.

## 5. The proof at settle

Both proofs from day one, in the player's own dollars:

- **The counterfactual card.** Your result beside two ghosts: the
  portfolio rebalanced once at the start and left alone, and the
  portfolio never touched at all. Plus the churn line: what your N
  trades earned or cost against riding, and what options bled.
- **The percentile.** Your result placed on a precomputed distribution
  of simulated traders on the same window: "You beat 34 of 100
  traders. Doing almost nothing beat 78." The distribution is baked
  per level by the sim, not computed live.
- **Three bullets**, rule pool carried from the street build and
  extended: overtrading cost, panic sells, peak buys, options decay
  paid, mover chasing (a buy within a day of a top-movers appearance),
  concentration held. One phrase each, dollar figures, no lectures.
- **The thesis is never said on screen.** No closing sermon: the score
  stands and the next client arrives. The settle card and the client
  roster are the game's entire voice.

## 6. The replica

- Built from screenshots, 1:1: graph with range tabs, the big number,
  green and red, the pie, the drawer of positions, the trade ticket.
  Fractional shares allowed, because the real app allows them and this
  is a replica, not a metaphor: the whole-share law belonged to the
  metaphor games.
- docs/clean-type.md explicitly does NOT bind inside /arrow: fidelity
  to the copied app is the design contract here. The site chrome
  around the route still complies.
- Phone-first: the app renders in a phone frame, centered on desktop.
  Sound and microinteraction juice reproduced where cheap.

## 7. Data, new bake required

- The baked eras are monthly; Arrow needs DAILY bars. New bake through
  the existing pipeline (tools/bake_era.mjs pattern): daily OHLC for a
  roster of recognizable names across at least three windows (a calm
  bull stretch, 2007 to 2009, 2020 to 2022), plus an index series for
  baselines. Dividends out of scope for v1.
- Intraday is synthesized deterministically per seed from each day's
  OHLC; the sim asserts the path touches all four prices.
- New module src/lib/arrow/ (day engine, orders at open, options
  pricing, margin, persona generation, targets, bullets, percentile).
  The monthly tape engine stays untouched.

## 8. Build order and checks

1. Data bake, then arrowSim clean: persona generation rules, target
   calibration clear rates, order queue at open, intraday touches
   OHLC, options decay and expiry settle to intrinsic, margin call
   math, percentile distribution generation, every bullet rule on
   constructed logs.
2. ONE mock screen built 1:1 from a screenshot, judged by Marlon for
   fidelity before any stage work.
3. Stage, then the walk: a full level 1 at phone viewport, the settle
   math, the counterfactual and percentile, zero console errors.

## 9. Open for Marlon

- The persona roster and their one-line stories.
- The notification copy pack (real-pattern reproductions).
- Unlock thresholds for options and margin.
- Horizon lengths per level, first pass at three levels.
- Whether the 24/7 market (the crypto tab that never lets you rest)
  arrives as a late-level temptation or stays cut.
