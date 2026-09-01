# Stack, desktop rebuild - spec v2

August 31, 2026. Agreed across five AskUserQuestion rounds with
Marlon. This is the contract for the from-zero desktop rebuild.
It supersedes stack-spec.md's layout, phone frame, and profile
sections. Everything not overridden here (curriculum, economy,
item types, plain language law, content authoring) carries over.

One line: Duolingo's desktop frame in Stack's felt skin, Tally's
touch on every interaction, and a new spine: every trading move
you learn becomes a card in a permanent deck.

## Why the rebuild

Marlon's verdict: the phone sketch "falls apart" next to Tally.
Root cause he named: many agents stitching UI changes instead of
one builder going deep. LAW: ONE agent builds this end to end.
No parallel UI implementors. Verifiers may read and report, never
patch.

## Carried laws (unchanged, binding)

- UNIT LAW: one checker piece = one share, minted at purchase,
  stamped with the price paid. Whole shares only. Cents exist in
  cash and prices.
- You can only buy what you have learned.
- Real daily closes in the real app; the demo runs the Tomorrow
  button as a fast clock.
- Lessons are the only base paycheck, accuracy-scaled (<75%
  nothing, 75-99% base, 100% base + bonus). Reviews pay reduced.
  Working numbers: $80 lesson 1 prepay, $50 base, $10 perfect,
  $15 review, arcade $5 x 3 paid wins a day.
- Streak = any market action. Misses re-queue, first tries score.
- Feedback: correct auto-advances with one short line, wrong pops
  the bear and waits. Lesson end is numbers only.
- PLAIN LANGUAGE LAW, extended (see Copy below).
- CONTENT AUTHORING: Marlon writes lesson copy. All words live in
  one editable content module with a guide at the top; the engine
  holds graphics and mechanics behind named pics and item types.
- Felt table palette stays: baize greens, cream cards, chunky
  offset shadows, slab numerals (Roboto Slab charter, exempt from
  clean-type). Checker pieces stay as the visual for shares.

## Copy (teens and up, just plainer)

- Reader: teens and up. Kid-friendly means CLEAR, not childish.
  Zero jargon, zero euphemism, zero cleverness to decode.
- Say "stock" and "share", not "piece", in all text. The checker
  piece is a picture, not a vocabulary word. "Pick your first
  stock", "You own 3 shares of Nike", "1 share of Nike. Yours."
- Company blurbs are literal category descriptions, never wit:
  - Apple: phones, computers, and the apps on them
  - Nike: shoes and athletic wear
  - Costco: warehouse stores you pay to shop in
  - Coca-Cola: soft drinks
  - Pfizer: medicines
  - Nvidia: computer chips
  - McDonald's: fast food restaurants
  - ExxonMobil: oil and gas
  - Johnson & Johnson: medicines and health products
  - The 500 fund: one share of 500 big companies
  (Marlon may rewrite these in the content file; these are the
  shipped defaults.)
- Model sentence for register: "More people are buying the stock
  than selling it."

## Desktop frame (Duolingo's shape, our skin)

Desktop-first. Phone polish is a later pass (Tally rule).

- HOME (route /stack): three zones.
  - Top bar: streak flame + day chip, cash chip, worth chip with
    the pinned overnight change. Tomorrow button (demo clock) and
    Start over live quietly at the far right.
  - Center column: the lesson path. Unit cards and lesson nodes,
    scrolling, current lesson highlighted red, done lessons
    cream-checked. Overnight banner appears here.
  - Right sidebar, three modules (order): 1) Cash + your stocks
    live: each holding with today's price and change, click
    through to The Desk. 2) Practice teaser: Guess the Stock,
    paid plays left today, one click to play. 3) Friends strip:
    fake friends with worth and streak, click through.
- LESSON: full takeover, Duolingo's own move. The lesson replaces
  the whole frame with a centered stage (~720px), progress bar and
  quit X on top. One focal point per moment; nothing ticks behind
  it.
- Buttons and interactions are Tally's: chunky, offset shadows,
  spring punches on the beats (answer lands, pay ticks, piece
  mints, card drawn, chest opens). Money NEVER moves from tapping
  a stock or a stack; only playing a card moves money.

## The card system (the new spine)

Balatro/MTG feel: your deck of trading moves grows as you learn.

- ALL TRADING IS CARD PLAY. There are no Buy/Sell buttons
  anywhere. Lesson 1 introduces the Buy card and the Sell card as
  part of the guided first buy ("This is your Buy card. Play it.").
- CARDS STACK AND CONSUME (settled Sep 1, supersedes the permanent
  deck): the hand shows counts under each card (Buy x45). ONE TRADE
  IS ONE CARD, any number of shares: buying picks a quantity with a
  +/- stepper and consumes one Buy card; selling the same with one
  Sell card.
- CARD SUPPLY (working figures): finishing a lesson deals +2 Buy
  +1 Sell with the pay; a perfect lesson deals +1 Buy more; a
  review deals +1 Buy and restocks +1 of that unit's strategy card
  once its chest is open (capstone reviews also restock Options
  once the endgame chest is open). Paid arcade wins deal +1 Buy
  beside the cash. Under 75% deals nothing, like the pay.
- EMPTY HAND IS A HARD STOP: zero Buy cards means no buying until
  a lesson deals more. The empty slot says "Lessons deal cards."
  This is the anti-day-trading lesson said as a mechanic.
- Chests deal strategy cards in bundles of three (Schedule x3,
  The 500 x3, Options x3) plus the unit's concept cards.
- Card anatomy (Tally minimal faces): front = name, art, one
  plain line ("Buy: pay the price, own a share"). No stats
  clutter. Concept cards same frame, different back color.
- V1 deck and sources:
  - BUY, SELL: lesson 1, handed to you.
  - SCHEDULE (the DCA card): unit 1 capstone chest. Play it on a
    stock: buys 1 share every market day while you can afford it.
    Autopilot badge sits on that stack; click the badge to stop.
  - THE 500 (the index card): unit 2 capstone chest. Play it:
    buys a share of the fund. (It is a Buy specialized to the
    fund, so the fund feels like a strategy, not just a ticker.)
  - OPTIONS: endgame chest (drops when both capstones are done).
    Simple playable, sandboxed: pick a stock you own, call (up)
    or put (down), 3-day expiry, pay a premium from cash. At
    expiry: win = the move in your direction on 1 share, capped
    loss = the premium, always. Its own teach card gates first
    play, and the card face carries a plain "risky" label. This
    is the LAST thing the game gives you, never the hook.
- Concept cards: collectible plain definitions (Volatility, The
  price, The price tag, A fund, The fee...). Unit capstone chests
  drop the unit's concept cards alongside its strategy card.
- CHESTS: unit capstone only (settled; no streak or per-lesson
  chests). Ceremony: capstone end screen -> chest rises -> one
  tap to open (acknowledgment gate) -> cards reveal one at a
  time with spring punches. One focal point throughout.

## The Desk (profile page, route /stack/desk)

Profile IS the trading desk.

- Top: felt shelf of chip stacks, the current good graphics kept:
  side-view edge-notched discs, top cap ellipse, name + day
  change tag, cash as a banded bill stack. Tap a stack: it fans
  out, each lot shows the price paid.
- Bottom: your HAND, the unlocked cards fanned Balatro-style.
- Playing cards:
  - BUY: play it, pick any learned stock, pick a quantity with the
    +/- stepper (capped by cash), confirm consumes one Buy card and
    mints the shares onto the stack with a punch.
  - SELL (settled Sep 1, supersedes tap-to-pick): click a stack,
    the +/- stepper picks a count, and the white outline climbs
    that many shares from the TOP of the stack (newest first,
    StackMarket's marking). Confirm consumes one Sell card and
    sells them.
  - SCHEDULE: play onto a stock, autopilot badge appears, one card
    consumed. Stopping the autopilot does not refund it.
  - THE 500: plays like Buy, fund only, stepper included.
  - OPTIONS: opens its small flow (owned stock, direction, premium
    shown), one card consumed with the premium; resolves at expiry
    with an end-of-day banner.
- Lesson-end quick-buy stays: the buy prompt at lesson end is a
  one-tap shortcut that plays your Buy card for you (same rules,
  same animation).
- Desk subtabs: Desk / Friends / Collection. Collection holds
  concept cards plus the field guide of companies met (blurbs,
  shares owned). Friends: fake friends, full transparency,
  mini chip stacks.
- Small worth chart lives on the Desk as a compact card beside
  the shelf (holdings are the hero): worth line over the dashed
  put-in line so deposits never read as growth.

## Lessons (same content, bigger stage)

- Curriculum: units 1 and 2 exactly as authored, all item types
  (teach, choice, live-up/down/vol, pile, race, break, dollar,
  drip, drain, dca, paydrop, firstbuy) rebuilt at desktop scale.
  Live charts rescale their window (no clamp flattening).
- Content module: the shipped stack-content structure carries
  over into the app (single editable file, same field names, guide
  comment at top). Marlon edits it; the plain-language pass and
  literal blurbs are the shipped defaults.
- Lesson 1 rewrite of record: "Pick your first stock." The mint
  line: "1 share of Nike. Yours." The own line: "It moves while
  you own it."

## V1 scope (settled)

Units 1 + 2, fast Tomorrow clock, fake friends, Guess the Stock
arcade, chests + full card system, The Desk, sidebar, collection.
Same working pay numbers. Phone later.

## Build process (binding)

- ONE agent implements everything: model layer (deck, chests,
  lots, market), pages, components, content module, walk suite.
  No parallel UI agents, no stitching.
- CHECKPOINT: after the static home and Desk layouts exist, a
  screenshot round goes to Marlon for a look-pass BEFORE lessons,
  cards, and chests get wired. Build pauses on his notes.
- Landing: Stack is game one ("Learn stocks daily."), Tally moves
  to second.
- No sound in v1. The spring animations carry the juice; sound is
  a later polish pass.
- Tally process: this spec is the contract; a Playwright walk
  suite drives every acceptance check below; an Opus-style
  critique pass reviews against the Tally bar before Marlon sees
  it.
- Routes: the rebuild owns /stack. The legacy OrbScenario "stack"
  variant at /stack/s/:id moves to /orb/stackview/s/:id with a
  redirect. Sketch stack.html stays deployed but gains a one-line
  banner linking to /stack.

## Acceptance checks

1. Home shows path, top bar, and all three sidebar modules; no
   horizontal scroll at 1440x900 and 1280x800.
2. Lesson takeover: sidebar and path fully hidden during items.
3. Lesson 1 hands Buy + Sell cards and ends with a first stock
   owned inside 60 seconds of play.
4. No Buy/Sell buttons exist; every trade is a card play; money
   never moves from clicking a stock, stack, or card face alone.
5. Unit 1 capstone chest opens with a gate and grants Schedule +
   unit 1 concept cards, exactly once.
6. Schedule played on Nike buys 1 share on each Tomorrow tick
   while affordable; badge click stops it.
7. Both capstones done -> endgame chest grants Options; Options
   teach card gates first play; loss never exceeds premium.
8. Sell flow: tap lots to white-outline, button totals correctly,
   cash and stacks reconcile to the cent.
9. Worth chip day change pins at day tick; a sale never shows as
   a loss.
10. Every string on screen comes from the content module or a
    named UI-strings table; a grep for banned words (piece as a
    noun in copy, jargon list) passes.
11. First-try accuracy, pay scaling, requeue, review pay, arcade
    daily cap all match the carried economy.
12. cleancheck-style walk: no em dashes, no emoji, slab usage
    only where the charter allows.

## Build record

Shipped Sep 1, 2026, one builder end to end. Model
src/lib/stack/model.ts, content src/content/stackContent.ts (Marlon
edits this one), engine src/components/stack/Lesson.tsx, pages
Stack/StackDesk/StackPractice.tsx, kit + TopBar in
src/components/stack/. Walk: tools/stackcheck.mjs (25 checks, plays
both units through the real engine, opens all three chests, trades
with every card, proves the options loss cap and the one-trade-one-
card law). Item options carry data-c markers for the walk, the
sketch's precedent.

## Open, not blocking

- Concept card list per unit (Marlon may edit names/lines in the
  content module).
- Options premium formula (shipped default: 2% of share price,
  rounded to cents; revisit after play).
- Whether friends' decks show in their profiles (v2).
- Phone layout pass.
