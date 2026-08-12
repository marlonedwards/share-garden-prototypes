# The Tally: full design and build spec

Status: agreed in design interview, 10 August 2026. This document is the
contract. Implementors build from this; verifiers reject work that violates it.

Read `docs/course-style.md` first. Its voice rules, honesty rules and standards
rules apply here in full. Its **layout law is for stepped lessons and does not
apply to The Tally**, which has its own layout law in section 6. Where the two
appear to conflict, section 6 wins for this game only.

---

## 1. What it is, in one paragraph

The Tally is a solitaire built out of the real market. Every asset is a card you
can own more than one of, stacked. Every dollar is a block on a wall behind the
table. Cards are what you own; blocks are what it is worth. A chapter gives you
a money target and a fixed number of turns, and you clear it or the run ends. Runs escalate through a life and then through real market eras, and the
cards, chapters and badges you unlock carry forward forever. Nothing on screen
ever says "diversify": the rings on the cards make concentration obvious, and
the real prices do the punishing.

It replaces nothing. It becomes game one on the front door and the Orb stays as
game two, the visual explainer and the sandbox.

---

## 2. The two units, and why there are two

This is the whole metaphor and every other decision hangs off it.

| | what it is | what it does |
|---|---|---|
| **A card** | one purchase of one asset | what you **own** |
| **A block** | one fixed number of dollars | what it is **worth** |
| **Cash** | loose blocks, green with a `$` face | money not yet inside anything |

Cash has no container and no separate tray. It is simply the first thing on the
table, labelled with its dollar amount, sitting to the left of the cards.
A tray is a game object nobody has; money you have not spent is just money you
have not spent.

A card is **one purchase of a fixed size**, always costing the same: **two
blocks**. At a $50 block that is $100 of a company, bought at that turn's real
price. The card face shows the company's real share price, because the price is
still the thing being taught, and it shows what that one card is worth right
now in blocks.

Everything good follows from the split:

- **A crash takes blocks off the wall and does not touch a single card.** You
  own the same things. They are worth less. This is metaphor test six, the one
  the orb and the cylinder could never show, and here it is the default
  animation rather than a caption.
- **Selling is discarding.** Drag a card to the discard and collect blocks at
  today's price. The discard pile stays face up, so your trading history is a
  physical object on the table you have to look at.
- **Average cost is emergent.** Two cards of the same company bought two years
  apart are worth different amounts, and both are on the table. Nobody has to
  explain dollar cost averaging; it is visible.
- **A bankruptcy is a stone.** A card whose price reaches zero turns to a grey
  hatched stone card. It stays in your tableau forever, worth nothing, and it
  cannot be discarded. Gone is different from down, and it has a permanent
  physical presence.

### Denomination, and the earned upgrade

A block's value is fixed for a chapter and announced once at the chapter card.
The ladder is exactly ×4:

```
$5  →  $20  →  $80  →  $320  →  $1,280
```

It never changes mid-chapter and never changes automatically. It changes only
as an **earned ceremony**, on its own full-panel screen, when you have outgrown
the unit:

```
        YOU OUTGREW THIS UNIT

    ▓ ▓                 ▓
    ▓ ▓      →        (one)

  from now on, one block is $20
  and one card is four of your old ones

           [ Continue ]
```

Four blocks visibly fuse into one, **and four cards of the same name fuse into
one card**. Both units upgrade together, so a card is always two blocks. This
symmetry is not decoration; it is what keeps the economy constant while the
numbers grow, and it is the moment a player feels how much bigger their money
got.

Trigger: the ceremony fires between chapters, never inside one, when the
chapter you are about to start would put the wall over 40 blocks at the current
unit. The wall never exceeds 40 blocks, grouped in fives with a visible gap, so
it is always countable at a glance. This is the Neurath rule: more blocks, never
a bigger shape.

---

## 3. Cards

### Anatomy

```
╭──────────────────╮   ring  = asset class (section 3.1)
│ ●  Mega          │   pip ● = sector (section 3.2)
│    Bank          │   name area is ALWAYS two lines tall
│                  │
│      ▓▓ ▓▓       │   the card's own worth, in blocks
│                  │
│  $43.24 a share  │   the real price for that month
│  holds 2.3 shares│   what this one purchase actually bought
│  ▼ 6.2%          │   its move since your last turn
╰──────────────────╯
```

Rules for the face:

- Abstracted company name by default, real name behind the existing
  **Real names** toggle. Same `EraAsset.real` field the rest of the app uses.
- **The name area is a fixed two lines on every card**, so the price and the
  worth sit at the same height whatever the name is. Nothing on a card ever
  moves because the card next to it has a longer name.
- The share price is the real price for that month. Never rounded to a lie.
- **The card says how many shares it holds.** Without it the printed price is
  decoration: every card costs two blocks, so the price would do no mechanical
  work and a player would learn "cards cost two blocks" rather than "shares
  have prices". The share count is what the price actually bought, and it is
  what makes a later price change legible: same shares, different worth.
- The card's worth in blocks is its own, not the stack's. The stack shows a
  total on its collar.
- A reconstructed series (LEH, WCOM, ETYS, BCC) carries a small dotted underline
  on its price and a tap target that says so, exactly as the scouting cards do.
- No text on the card beyond the name, the price and the move. Everything else
  is on the back, on tap.

### 3.1 Suits: the ring is the asset class

| ring | class | what it means | example cards |
|---|---|---|---|
| green | Savings | money that grows slowly and does not fall | Savings Account |
| blue | Lending | you lent it, they pay you back | Government Bond, Company Bond |
| amber | Ownership | you own a slice of one company | Mega Bank, Fruit Computers |
| **rainbow** | Baskets | one card that holds many companies | **The Index Fund**, sector funds |
| red | Speculation | a price with no earnings behind it yet | new listings, coins |

The **basket ring is a rainbow**, a radial sweep that catches the light and
shines on hover. It is the one card in the deck that is visually special, and
it should feel like the wild card in Uno: the thing you are pleased to draw. It
is not mechanically wild. It is just the only card whose ring is every colour at
once, because it is the only card that is every colour at once.

### 3.2 Pips: the corner dot is the sector

Banks, tech, industry, energy, retail, health, property. A small filled dot with
a one-word tooltip.

The pip earns its place on exactly one day: September 2008, when every card
with a bank pip loses most of its worth in the same resolve. A player who
spread across five amber ownership cards that all carry a bank pip watches all
five fall together, and nothing has to say a word. **Sector correlation is real
in the data we already ship.** We are not inventing it; we are making it
visible.

### 3.3 The market: seen once, available forever

There is no hidden draw and no shuffled hand. **Every card you have seen this
run is face up in the market strip and buyable at its real price.** A market
that hides Fruit Computers from you on a Tuesday is a lie a sharp twelve year
old will catch, and the whole product rests on not lying.

Cards enter the market from two honest sources only:

1. **A chapter unlocks an instrument class.** Chapter 2 puts the savings card on
   the table; chapter 5 puts the index fund on it. This is the teaching ladder.
2. **The era lists a company.** `EraAsset.listedAtStep`, already real in the
   covid era. The card slides in with a `NEW` flash on the month it actually
   listed.

Cards leave in one way only: a real price reaching zero turns the card to stone.
It leaves the market and stays in your tableau if you held it.

The scarcity that makes a turn a decision is **blocks, not access**. You never
have enough blocks for everything you can see. That is the true constraint and
it is the only one we need.

---

## 4. The loop

### 4.1 A turn

Fully turn-based. Nothing moves until you commit. There is no play button, no
speed control, no tape running, and nothing that can be waited out.

```
1  PLAN      income arrives as blocks, every turn, in every chapter.
             drag blocks onto market cards to buy.
             drag your cards to the discard to sell.
             rearrange freely. nothing is committed.

2  COMMIT    one button: End turn.

3  RESOLVE   the wall grows one column, counted block by block.
             every card's price ticks to the next month.
             worth changes are shown on the cards that changed.
             an era event, if one falls here, plays over the wall.

4  READ      one line in the header rail says what just happened.
             new cards flash into the market.
```

The resolve is the payoff. It is the Balatro hand-scoring moment and it must be
built with that care: blocks land one at a time with weight, the count ticks up
or down a digit at a time, and the whole thing takes about 1.2 seconds and can
be skipped by tapping. **No number ever tweens.** Counting is the pleasure.

### 4.2 A chapter

A chapter is a level. It states three things on its opening card and never
changes them:

```
CHAPTER 6 · THE PANIC
2007 to 2015, real prices

  target      $1,300
  turns       9
  one block   $50
  you start   with 20 blocks and the cards you kept

              [ Begin ]
```

At the end of the last turn, the target is checked. Clear it and you take the
chapter reward. Miss it and the run is over.

### 4.3 A run

A run is a ladder of chapters. **The first run is a whole life, in order.**
Clearing a chapter unlocks it permanently as a start point, so later runs begin
deeper.

```
RUN 1    1▸2▸3▸4▸5▸6▸7▸8      all eight
RUN 2        3▸4▸5▸6▸7▸8      start at prices
RUN 5            5▸6▸7▸8      start at the fund
```

| # | chapter | turn = | teaches | unlocks |
|---|---|---|---|---|
| 1 | **The piggy bank** | a week | money you keep is a countable pile, and a pile that does nothing stays the same size | the wall |
| 2 | **Savings** | a month | one card that grows on its own, slowly, and never falls | green ring |
| 3 | **Prices** | a month | a price moves, and your card count does not move with it | amber ring |
| 4 | **Two names** | a month | the first real choice, and one of the two falls hard | the discard, the stone |
| 5 | **The fund** | a quarter | one card that holds all of them, and it is not the fastest one | rainbow ring |
| 6 | **The panic** | a year | 2008 on real prices, and a whole sector falls together | sector pips, the bond |
| 7 | **The mania** | a quarter | dotcom or crypto, and what a price with nothing behind it does | red ring |
| 8 | **The long run** | a year | forty years, very few moves, and what compounding actually looks like | the finale |

Chapters 1 to 5 use illustrative numbers, in the same way the existing intro
lessons use Maya's lemonade stand. They are labelled as illustration on the
chapter card. Chapters 6 to 8 use the real datasets already in `src/data`.

**Chapter 1 is an unfailable tutorial and is allowed to have no decision in it.**
It exists to teach what a block is before a card exists, it runs about ninety
seconds, and its target cannot be missed. Nobody expects a tutorial to be a
game, and pretending otherwise costs more than it earns. Every chapter after it
has a real target and can end the run.

### 4.4 The target, and why it is a floor and not a corridor

The target is a **floor**: a number of blocks to reach. There is no upper bound
and nothing ever penalises finishing rich. The old corridor's ceiling read as
"investing well is wrong", which is not a thing we believe.

Calibration rule, and it is load-bearing:

> **A chapter's target is set at about 95% of what buying the basket on turn one
> and never touching it would have produced.**

That single rule does all the teaching by arithmetic:

- Sitting in cash never clears a chapter after chapter 2.
- Tracking the market clears every chapter with a small margin.
- One concentrated name clears a chapter spectacularly some of the time and
  misses badly more often, because that is what the real prices do.
- Across an eight-chapter run, the compound probability of surviving on
  concentration alone is small. **Concentration wins rounds. Spreading wins
  runs.** Balatro's ante structure is doing the pedagogy for us.

**The target is stated in money, not blocks.** Money is what a player wants,
and the block count is what they read off the wall to see how close they are.
Stating it in blocks makes the unit the goal, which it is not. The gold line on
the wall carries the dollar figure, from turn one.

### 4.5 Stakes

One miss ends the run. There are no lives and no retries with known prices,
because replaying a known tape rewards memorising the future, and prediction
framing is banned.

The run-over screen is a forensic report, not a scold:

```
CHAPTER 6 · TARGET $1,300
you finished at $700

RUN OVER
────────────────────────────────────────────
turn 3   you put 14 of 16 blocks on one card
turn 6   that card lost two thirds
         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  →  ▓▓▓▓

         the index card you passed on
         finished the chapter at 31 blocks

KEPT   ✦ index fund   ■ bond   4 badges
       chapters 1 to 5 stay unlocked

       [ New run · start at chapter 5 ]
```

It names what you did and what it cost, from your own trade log, with the
blocks. It never says "you should have". It shows the alternative you could see
at the time and let go.

### 4.6 What carries between runs

- Chapters cleared, as permanent start points.
- Instrument classes unlocked, so the market strip starts richer.
- Badges in the collector's box.
- Field guide cards.

Blocks and cards do not carry. Each run starts at its chapter's stated stake.

---

## 5. The collector's box

Modelled on the Orb's silhouetted achievement slots: you can see the shape of
everything you have not earned yet, which is most of the pull.

Three shelves:

1. **Instruments.** Every card class, silhouetted until first owned. Tapping a
   collected one shows its field guide entry.
2. **Badges.** Behaviour, named and permanent. This is where spreading is
   rewarded, and it is deliberately **outside the scoring loop** so that no turn
   is ever won by obeying a rule. Starting set:
   - *Wide open* — finish a chapter holding four different rings.
   - *Iron hand* — clear a chapter without discarding a single card.
   - *Bought the fear* — buy on the turn the wall was at its lowest.
   - *Still standing* — hold a card through a fall of more than half and finish
     the chapter still holding it.
   - *Never idle* — put blocks to work on every turn of a chapter.
   - *Stone carrier* — finish a run holding a bankrupt card. There is no way to
     get rid of it, and that is the point.
   - *Long hold* — finish a run still holding a card you bought in the first
     chapter you played. This is where compounding gets its reward. It is
     deliberately a badge and not a marker on the card face: the face already
     carries a name, a ring, a pip, a worth, a price and a share count, and one
     more line is one too many.
3. **Eras.** One card per real era, showing your best run in it.

Badges are never announced mid-turn. They land on the chapter summary, one at a
time, with a small flip.

---

## 6. Layout law

This is the section that fixes the current build's biggest problem: the screen
is three cards that swap out on every beat, so nothing feels like one place.

### 6.1 Four regions, fixed, forever

The screen is four rows. **Every row keeps its height at every phase of every
turn.** No phase change ever moves a region, resizes a region, or adds or
removes one.

```
┌──────────────────────────────────────────────────────────────────┐
│ A  HEADER RAIL                                          56px     │
│    chapter · turn 4 of 9 · target $1,300 · block $50 · collection│
├──────────────────────────────────────────────────────────────────┤
│ B  THE WALL                              flex, aspect 16:7       │
│    the record. one column per turn. blocks are dollars.          │
│    the gold target line. the index line.                         │
│    ALL OVERLAYS RENDER HERE, INSIDE THIS PANEL.                  │
├──────────────────────────────────────────────────────────────────┤
│ C  THE MARKET                                          156px     │
│    every card seen this run, face up, scrolls sideways           │
├──────────────────────────────────────────────────────────────────┤
│ D  YOUR TABLE                                          208px     │
│    YOUR MONEY $300 ▓▓▓ | stacks you own | SOLD pile | [End turn] │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Overlays live inside the wall

The chapter card, the front page, the unit-upgrade ceremony, the chapter
summary and the run-over report **all render as a full-panel layer inside region
B**, over a scrim, with the market and the table still visible and still
correct underneath. This is the single rule that makes it feel like one screen
instead of a slideshow.

The only exception is the run-over report, which may take the whole viewport
after a beat, because the run is genuinely over.

### 6.3 Responsive

Everything is vector. There are no raster background assets, no textures, and
nothing that loses resolution on a large display.

| | wall | market | table |
|---|---|---|---|
| ≥ 1024 | aspect 16:7, min 320, max 460 | 156px, cards 104×140 | 200px |
| 768–1023 | aspect 3:2, min 300 | 140px, cards 92×124 | 184px |
| < 768 | aspect 4:3, min 260 | 132px, cards 84×114 | 176px |

Rules that hold at every size:

- The four regions never reorder and never collapse into each other.
- The market and the table scroll horizontally, never wrap to a second line.
- A block is always square. The wall picks how many turns one drawn column
  covers so that blocks stay as close to square as the panel allows. This logic
  already exists and works; keep it.
- The wall draws the record at the finest grain the chapter honestly has, which
  is one column a month wherever the chapter carries real monthly prices and one
  column a turn everywhere else. `wallColumns(run)` stays one column per turn and
  is what the sim, the badges and the summary read; `wallMonths(run)` is the
  display model, and its turn boundary columns are identical to it, which is what
  lets the header count read off the rightmost column. Nothing between two
  boundaries is ever invented: an authored chapter with one price a turn draws
  one column a turn.
- Page never scrolls horizontally. The whole game fits one viewport at
  1280 × 800 with no vertical scroll.

### 6.4 Look

- Page: warm off-white, the same family the rest of the app uses. Not dark.
- Wall: a single panel a few shades deeper than the page, so the tiles read as
  objects in a lit case.
- Blocks: flat vector squares with a crisp one-pixel-style highlight edge.
  Cash blocks are green with a `$` glyph. Every other colour is an asset colour
  already defined on `EraAsset`.
- Cards: white, thin ring in the suit colour, sector pip, real price.
  The basket ring is the one radial gradient in the game.
- Type: the app's existing sans. Tabular numerals everywhere a number can
  change. **No pixel or 8-bit typeface anywhere.** The pixel language is in the
  tiles only.
- Banned, per house rules: em dashes, emoji, uppercase letter-spaced monospace
  labels.

### 6.5 Motion

| moment | motion | duration |
|---|---|---|
| block lands | drops the last few pixels, staggered down the column | 230ms, 42ms stagger |
| block leaves | lifts and fades upward | 200ms |
| count | digit steps, one per block | 46ms per block |
| card bought | flies from the market strip to the tableau | 260ms |
| card discarded | flips face down into the pile | 220ms |
| card turns to stone | colour drains, hatch draws in | 700ms |
| unit upgrade | old tower collapses four into one | 1150ms |
| badge earned | single flip on the summary | 300ms |

`prefers-reduced-motion` removes every one of them and shows end states.

---

## 7. History without walls of text

The front page is the delivery mechanism. It appears as an overlay in region B
when a dated moment resolves.

```
╔════════════════════════════════════════════╗
║  SEPTEMBER 2008                            ║
╠════════════════════════════════════════════╣
║  158-YEAR-OLD BANK FAILS            ‹tap›  ║
║  ────────────────────────────────────────  ║
║  INSURER RESCUED FOR $85BN          ‹tap›  ║
║  ────────────────────────────────────────  ║
║  CONGRESS VOTES DOWN THE PLAN       ‹tap›  ║
╚════════════════════════════════════════════╝
              [ Keep going ]
```

Rules:

- **A headline on its face is one line.** Tapping opens at most two sentences.
  Nobody is ever made to read more than one line to continue.
- Headlines are verbatim from named publications on named dates, per the
  honesty rule already in `docs/course-style.md`. The existing
  `src/lib/headlines.ts` clippings are the source.
- The definition sentences that currently sit in `Gate.definition` do not go on
  this page. They move to the field guide card for that concept, which unlocks
  the moment the concept first appears in play. A player who wants the textbook
  sentence can get it in two taps. A player who does not, never sees it.
- The page also appears, in full and re-readable, on the chapter summary, so the
  record is never lost by dismissing it.

The existing `ScenarioConfig.gates` become front pages. Their `options` are
dropped: the decision now lives in the turn, where the money is.

---

## 8. The reward function contract

This is the section a verifier checks hardest. Insider Trading (Steam, February
2026) is the cautionary case: its optimal play is to dump and crash the price,
and reviewers finish it saying they learned nothing. Theming a deckbuilder in
stocks teaches nothing by itself. The reward function is the curriculum.

**Hard rules. A change that breaks any of these is rejected regardless of how
well it plays.**

1. No move may move a price. The player is a price taker in every chapter.
2. No reward, badge, bonus or unlock may pay for trading volume, for timing, or
   for a correct prediction.
3. Nothing is ever scored against a counterfactual. The game may show you an
   option you passed on and what it did, once, on the run-over screen. It may
   never rank your choice against it.
4. No baseline bonus for holding N suits. Spreading is rewarded only by the real
   prices and, outside the loop, by a badge.
5. Every unlock is an asset or a habit. Never a discount, never an edge, never
   information nobody had at the time.
6. Every number a card shows is a number that existed on that date.
7. A chapter can never be cleared by an action that would be bad practice with
   real money. If playtesting finds one, the target is retuned; the rule is not
   relaxed.

---

## 9. Metaphor map

Every mapping, and the test it answers. Jared's six tests are the left column.

| test | how The Tally answers it | mechanism |
|---|---|---|
| **Growth reads instantly, no number** | more blocks on the wall | the column is taller by a countable amount |
| **Decline, and it stings** | blocks lift off the wall and vanish, counted down one at a time | the resolve animation |
| **Many stocks visible at a glance** | a tableau of stacks in different rings | the table, region D |
| **One stock looks fragile before anything happens** | one tall stack, one ring colour, one pip | the rings do it without a word |
| **Diversification visible over time, not just now** | the wall keeps every past column, so composition drift is a shape you can see | region B keeps history |
| **Crash and recovery: you own the same things, worth less** | every card stays on the table, the blocks behind it go | **the two-unit split, section 2** |

Additional mappings the split gives us for free:

| concept | mapping |
|---|---|
| a share | a card |
| a share price | the number printed on the card |
| buying | blocks leave the tray, a card arrives |
| selling | a card goes to the discard, blocks return at today's price |
| cash drag | green blocks sitting in the tray doing nothing, visibly |
| dollar cost averaging | cards of one name bought at different prices, all on the table |
| an index fund | one card with a rainbow ring |
| sector risk | pips that all match |
| bankruptcy | a stone card you can never discard |
| compounding | chapter 8, where the wall runs off the top and the unit upgrades twice |
| a delisting | the card leaves the market, and stays in your tableau if you held it |

---

## 10. Fun requirements

Checked against the gamification tests from the design sketch.

| test | answer |
|---|---|
| clear objective per level | a block target on the wall from turn one |
| constrained moves | blocks are always scarcer than the market strip |
| escalating difficulty | eight chapters, rising targets, real eras that get nastier |
| visible progression between sessions | the collector's box, unlocked start chapters |
| a fail state that teaches | one miss ends the run, with a forensic report |
| a share artifact | the final wall plus the tableau, one image |
| **the reward function teaches the truth** | section 8, enforced |

And the things that make it feel good to touch, which are not optional:

- The resolve counts. It never tweens.
- Cards fly. Blocks land. The discard pile is a real pile that grows.
- The rainbow ring shines on hover. It should be the card you want.
- Badges flip in one at a time.
- The run seed appears on the chapter summary and the run report, never in the
  header rail while you are playing. A seed is for retelling a run, not for
  reading during one.
- You should be able to play a chapter without reading a single sentence, and
  the game should still have taught you something by the end of it.

---

## 11. Engine and data reuse

Build on what exists. Nothing here needs a new market engine.

| need | use |
|---|---|
| real monthly prices, index total return | `src/engine/history.ts`, `HistoryMarket` |
| era cast, colours, real names, listings | `src/content/era-*.ts`, `EraAsset` |
| datasets | `src/data/era*.json` |
| block denomination, largest-remainder allocation | `src/lib/blocks.ts` (built, keep) |
| the wall renderer | `src/components/TileStage.tsx` (built, refactor per section 6) |
| column history from the trade log | `src/lib/tileColumns.ts` (built, keep) |
| headlines and clippings | `src/lib/headlines.ts` |
| field guide unlocks | `src/lib/fieldGuide.ts` |
| standards tags | `src/lib/checkpoints.ts` format, in code comments |

New work, in build order:

1. `src/lib/tally/deck.ts` — card model, suits, pips, lots, stone cards.
2. `src/lib/tally/chapters.ts` — the eight chapters, targets, stakes, units.
3. `src/lib/tally/run.ts` — run state, unlocks, badges, persistence.
4. `src/components/tally/Wall.tsx` — region B, refactored from TileStage.
5. `src/components/tally/Card.tsx` — the card face, rings, pips, rainbow.
6. `src/components/tally/Market.tsx`, `Table.tsx`, `Tray.tsx`, `Discard.tsx`.
7. `src/components/tally/overlays/` — chapter, front page, upgrade, summary,
   run over. All render inside region B.
8. `src/pages/Tally.tsx` — the four-region shell, rewritten.
9. Front-door card on `src/pages/Landing.tsx`.
10. Chapters 1 to 5 content, then 6 to 8 on the real eras.

Retire: the current `/tally` year-turn prototype, the corridor scoring, and the
gate option buttons. Keep `/stack` and the cylinder toggle in the archive as the
argument for how we got here.

---

## 12. Standards and assessment

There is **no quiz screen**. The run is the assessment: the chapter summary and
the run-over report read back what you actually did, from your own trade log,
in blocks and cards.

If a hard assessment hook is later required, it must be built out of the game's
own objects. A question is a card you have to appraise or a wall you have to
read, never a paragraph with four radio buttons.

CEE and Jump$tart tags stay in code comments per `docs/course-style.md`, and
surface only in `/objectives`, which is for teachers. A player never sees a
standard code.

---

## 13. Accepted risks and open questions

### 13.1 The accepted risk: a chapter is solvable once and stays solved

Prices are fixed history, so "buy the basket on turn one and never touch it"
produces the same result every run. The target is calibrated at 95% of exactly
that, so it clears every chapter, every time. A player who finds it has solved
the game.

This was raised in review and the call was to **keep the systems clean rather
than add an expense mechanic to break it**. That is a real trade and this
document records it rather than hiding it:

- The strategy is correct, and teaching it is the point. A player who finds it
  has learned the thing the game exists to teach.
- The cost is that the game has a three to five run arc, not a fifty run one.
  **Design for that arc.** Do not build systems that only pay off at run twenty.
- The long tail lives in the collection: badges that ask for something other
  than optimal play, the era shelf, and starting deeper in the ladder.
- If playtesting shows the arc is too short to be worth the build, the fix
  already scoped is an expense that arrives on a turn you did not choose, so
  keeping an emergency fund trades against being fully invested. It is honest,
  it is already curriculum, and it is the one thing that makes all-in-basket
  incorrect without a rule saying so. Do not reach for anything else first.

### 13.2 Still open

1. Chapter 7 is dotcom or crypto. Both datasets exist. Pick by playtest.
2. Chapter 8 at forty years needs a dataset we do not have yet. Either extend an
   existing series or state clearly that it is illustrative.
3. Whether a card can be partially sold. Current answer: no. A card is a unit,
   and units are what make it countable.
4. Multi-select drag for buying several cards at once. Needed if a chapter has
   more than about eight turns worth of blocks.
5. Whether one miss ending a run is too harsh at chapter 7 of a first playthrough.
   Watch it in the first playtest.

## 14. Acceptance tests

A build is done when all of these pass on a 1280 × 800 laptop and on a phone.

1. No region changes height or position at any point in a full run.
2. No horizontal page scroll at any width from 360px to 2560px.
3. A crash resolve removes blocks and removes zero cards.
4. A bankrupt card becomes stone, cannot be discarded, and is still there at the
   end of the run.
5. The unit upgrade fires between chapters only, shows the four-into-one fuse
   for both blocks and cards, and never fires twice in one chapter.
6. The wall never exceeds 40 blocks and never falls below 8 within a chapter.
7. Every price shown matches the dataset for that month, to the cent.
8. A run cleared entirely by buying the rainbow card on turn one and never
   trading again clears every chapter. This is the calibration test.
9. A run played entirely in cash fails at chapter 3 or earlier.
10. Ten seeded runs of one concentrated name clear fewer than four full ladders.
11. No screen requires reading more than one sentence to continue.
12. `prefers-reduced-motion` produces a fully playable game with no animation.
