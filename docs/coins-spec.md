# Coins

A trading game where a coin is a share, its height is its price, and dollars are
the ruler everything is measured against.

Contract for the build. The feedback that produced it is in
`docs/coin-stacks-feedback-aug19.md`, with Jared's reference images in
`docs/reference/coin-stacks/`. Type rules in `docs/clean-type.md` apply to every
string here.

Route `/coins`. Ten word pitch: **Every coin is one share. It grows. Don't go
broke.**

**Visual contract: `public/sketches/coins.html`**, live at
`http://localhost:4318/sketches/coins.html`. It is a flat two dimensional
stand-in for the three.js scene running wave one's real prices at every constant
in this document, with a scrubber, buy and sell, and the ruler. Build against
what it does, not against the AI renders. It already proves the three rules and
it found one bug in this spec, recorded in section 3.

The frame worth copying is what it produces at January 2024 after buying ten
Nvidia, ten Peloton, ten Amazon and fifteen Apple in January 2019. Nvidia's ten
coins were a hairline and are now a fat green stack, Peloton's ten have
collapsed from a tall black column to a squashed puck, Apple towers over both,
and $2,000 has become $5,339. Same shelf, same ruler, no legend needed, and
every coin still countable.

---

## 1. The law

Jared's three rules collapse into a single invariant, and every decision below
is downstream of it.

> **Height is dollars. One ruler, every object on screen, always.**

| Object | Height |
| --- | --- |
| One share coin | that share's price today |
| One dollar chip | its denomination, fixed at $10 |
| A company's stack | shares owned x price = what the position is worth |
| The cash column | your cash |

Three consequences the player can see without being told:

1. A stack rises with no new coins when a price rises. You did not get more
   shares; your shares got bigger.
2. A buy is an even swap of height. The chips you spend and the coin you get are
   the same height at the instant of the trade. Profit only ever shows up later,
   as thickness.
3. A cheap company and an expensive one at the same position value are the same
   height, built of different coins. Share count is not size.

**Nothing on screen may violate this.** No decorative scaling, no minimum coin
height, no "just make it look nice" compression. If a coin is 2px, it is 2px.

---

## 2. Jared's three rules, and where each one lives

| His rule | Where it shows | Acceptance test |
| --- | --- | --- |
| 1. A coin is one share, height = share price, variable between stocks | Every stack on the shelf, at every moment | Test A |
| 2. Growth and decline are coins growing and shrinking, not coins being added | The tape running with no input | Test B |
| 3. Selling converts a share into fixed size dollar coins | The sell animation, and the wave ceremony | Tests C and D |

The tests are in section 12 and are written so he can check them himself in
under a minute.

On his "coins of a set size" phrasing: within one stack at one moment, every
coin is identical. The variation is between companies and over time. That is
what section 1 encodes.

---

## 3. The ruler, exactly

One number governs the whole scene.

```
S = pixels per dollar          // world units per dollar, one global value
shareCoinHeight  = price * S
dollarChipHeight = 10 * S      // DENOM = $10, fixed
stackHeight      = shares * price * S
cashColumnHeight = cash * S
```

**Setting S**

```
STAGE_H = usable stage height in px (760 desktop, 460 phone)
S opens each wave at STAGE_H * 0.85 / worthAtWaveOpen

tallest = max(cash, max over holdings of shares * price)
if (tallest * S > STAGE_H * 0.92)
    S eases toward STAGE_H * 0.85 / tallest at 0.12 a frame
```

**The camera must not move when you trade.** This is the rule the whole section
exists to protect, and getting it wrong was the loudest note in review: fitting
to the tallest column rescaled the entire board every time you bought, so buying
Nvidia made Apple and Amazon shrink even though nothing about them had changed.

Setting S once from the wave's opening worth is safe, and conservation is why.
A trade never changes what you are worth, and no single column can be taller
than your worth, so a frame that fits your opening worth can never be overflowed
by any amount of buying. The only thing that can push a column past the top is a
price going up, which is a market event and worth a camera move.

The ratchet is monotonic. S never increases, or a decline would be hidden by the
frame creeping back in and rule 2 would stop reading.

**The space above the stacks is not dead space.** With the money split across
several companies each column is naturally a fraction of the frame, and the
emptiness above them is the room they grow into. Over wave one an opening basket
goes from filling the bottom third to touching the ruler at $4,000. Watching
that happen is rule 2, and an auto-fitting camera destroys it by definition,
because it normalises away the growth it is supposed to show.

At $2,000 of starting cash and `STAGE_H = 760`, wave one opens at
`S = 0.323 px/$` and holds there for as long as you are worth about $2,000:

| Company | Price | Coin | A ten share stack |
| --- | --- | --- | --- |
| GameStop | $2.84 | 0.9px | 9px |
| Nvidia | $3.59 | 1.2px | 12px |
| Tesla | $20.47 | 6.6px | 66px |
| Peloton | $25.10 | 8.1px | 81px |
| Apple | $41.61 | 13px | 134px |
| Zoom | $72.47 | 23px | 234px |
| Amazon | $85.94 | 28px | 278px |
| dollar chip | $10 | 3.2px | |

Those are opening thicknesses, and they are the floor rather than the norm. By
January 2024 the same Nvidia share is $62 and its coin is 20px even after the
camera has pulled back, because the company grew seventeen times over.

A 2px GameStop wafer beside a 59px Amazon slab is rule 1, unarguable, in one
screenshot, and a ten coin stack of either is a real stack rather than a lozenge.
That spread is the reason the shelves in section 5 were chosen, and the $2,000
opening balance is what makes positions run ten to twenty coins deep instead of
one or two.

**No line for worth, and none for where you started.** Both were built and both
were cut. They are totals, and once the money is split a total is several times
taller than any single column, so either they sit off the top of the frame or
they force the whole board into the bottom third. The wall carries the dollar
ruler; the HUD carries `worth` and `started with`.

**Overflow of instance counts.** A stack draws one mesh instance per share up to
2,000. Beyond that the lower part of the column draws as a solid shaft with a
repeating stripe texture at exactly the coin pitch, so the height stays honest
and the seams stay visible. Same rule for the cash column.

---

## 4. Money model

```ts
cash: number                       // dollars, float, cents kept
holdings: Record<Ticker, number>   // whole shares only
worth = cash + sum(shares * price)
```

- Start of run: `cash = 2000`, no holdings. Enough to hold ten to twenty shares
  of most of the shelf, which is what makes a position look like a stack of
  coins rather than one or two lozenges.
- Whole shares only. No fractional shares, no fees, no spread, no shorting, no
  margin. Jared said keep it simple and these are the things "simple" means.
- Cash keeps cents. The cash column draws `floor(cash / 10)` whole chips plus a
  partial chip on top for the remainder. A player with $53.40 sees five chips
  and a sliver, which is the right amount of honesty about cents.

---

## 5. The tape: waves

A run rolls forward through real market history. When a decade's data runs out,
the next one loads and your money carries. There is no target line and no timer.

**1 real second = 1 market month.** Prices interpolate smoothly between monthly
closes with a smoothstep, so coins grow continuously rather than stepping once a
second. Rule 2 depends on this; do not step.

| Wave | Data | Months | Speed | Length | Why it is here |
| --- | --- | --- | --- | --- | --- |
| 1 | `eraCovid.json` 2019-01 to 2024-12 | 72 | 1.0 mo/s | 1:12 | Friendliest opening, and Nvidia at $3.59 growing to $139 is the best demonstration of rule 2 in the whole dataset |
| 2 | `eraGfc.json` 2007-01 to 2015-12 | 108 | 1.25 mo/s | 1:26 | The crash. Lehman's coin goes to nothing on screen |
| 3 | `eraDotcom.json` 2000-01 to 2007-12 | 96 | 1.5 mo/s | 1:04 | Brutal. Two companies go to zero |

Full survival is about three and a half minutes. The waves are ordered by
difficulty rather than by date, so each wave card names its years plainly and
the framing is "a new market opens", never "time passes". The order is a single
`WAVES` array; reordering it to chronological is a one line change if that reads
better in play.

**Shelves.** Drop `^SP500TR` from the shelf in every wave; it is kept for the end
card only. Otherwise use every ticker in the file.

- Wave 1: AAPL, AMZN, NVDA, TSLA, ZM, PTON, GME (7)
- Wave 2: C, AIG, F, GE, WMT, AAPL, XOM, AMZN, LEH (9)
- Wave 3: AAPL, AMZN, MSFT, CSCO, INTC, KO, JNJ, XOM, WCOM, ETYS (10)

Prices come out of the bake exactly as they are. Do not re-adjust for splits;
the files already carry the price level each era actually quoted, which is what
makes the coin heights truthful.

Two honesty notes on wave 1, since it is the one he will play first. Its series
are split adjusted, unlike the dotcom and GFC bakes which carry era-real quoted
prices, so Amazon reads $86 in 2019 rather than the $1,700 it actually traded
at. And Zoom listed in April 2019 while Peloton listed in September, so their
first months are backfilled rather than quoted. Neither affects any rule in this
spec, both would embarrass us if he noticed them first, so wave 1 either starts
at 2019-10 (60 months, all seven listed) or the two backfilled companies join
the shelf on their real listing month. Take the second option if it is cheap;
a company appearing on the shelf mid-wave is a good beat anyway.

**Delisting.** A series that reaches 0 is a company that died: WCOM, ETYS, LEH,
and any other zero. As the price falls the coin thins to nothing on its own,
which is the whole point. At 0 the stack is empty, the base plate goes grey and
reads `gone`, and the company cannot be bought. Shares held are worth nothing.
No warning, no grace, no refund.

**Wave turnover.** When the months run out:

1. The tape stops.
2. Every holding sells at its last price. Each stack's coins fall into the cash
   trough and break into chips, all of it at once. This is rule 3 performed at
   full scale, once per wave, and it is the best moment in the game. Give it
   1.2 seconds and a sound.
3. A card: the decade's name, the years, and what you are worth.
4. Next wave loads with a new shelf and your cash.

**Fail.** You are out when you hold nothing and your cash is below the cheapest
share on the shelf. In practice this is reachable only by being wiped out in a
bankruptcy, which is the intended way to lose.

**Score.** Final worth. Best run in `localStorage` under `coins-best`, storing
`{ worth, wave, biggestWin }`, following the `takeover-best` pattern in
`src/pages/Takeover.tsx`.

---

## 6. The two objects

They must never be mistaken for each other. This is the thing Jared explicitly
worried about and the thing Marlon's poker chip question was really about.

**Share coin**
- Diameter 76 world units, wide enough to carry a logo on the top face. Height =
  price x S.
- Body in the company's brand colour, matte, low roughness, no bevel gloss, with
  the side wall shaded across its width so it reads as a cylinder.
- **A visible seam between every pair of stacked coins.** This is the difference
  between a stack of coins and one smooth tube, and it was the first thing
  called out in review. Dark on a light coin, light on a dark one, so Peloton's
  black stack separates as clearly as Amazon's orange. In the flat sketch the
  line a player actually sees is the front bulge of each coin's underside, since
  the coin above covers the one below's top face entirely.
- The top coin of a stack carries the company logo on its top face, lying flat,
  on a light inset disc. The baked marks are dark and some carry their own
  background, so the inset disc is what makes every one of them legible. Coins
  below the top carry nothing.
- Never drawn transparent. A company you do not own shows one solid coin resting
  on its plate, so a share's price is always readable as a height and not only
  as a number.
- Sits on a base plate that carries the name and the price.
- Zoom has no mark in `public/logos`; it falls back to its ticker on the inset
  disc, the same fallback Takeover uses. Baking a `zoom.png` would close that.

**Dollar chip**
- Diameter 44 world units, noticeably narrower than any share coin.
- Height always 10 x S. Identical to every other chip on screen, forever.
- One matte neutral colour, the same in every wave, never branded.
- A `$` engraved on the top face.
- Lives in the cash trough at the left of the shelf, which has its own base
  plate labelled `cash`.

The read: branded, chunky, varied, on a named plinth = things you own. Narrow,
grey, identical, in a trough = money. A player should be able to point at the
screen and say which is which before anyone explains it.

---

## 7. Layout

**Desktop, 1440x950**

```
  $5,339                                    January 2024
  cash $230, started with $2,000            the 2020s

  ----------------------------------------------  $3,000
                             #
                             #
  ----------------------------------------------  $2,000
                             #
                             #       #
  ----------------------------------------------  $1,000
              #              #       #
      _   #   #    _    _    #       #
 [$] [GME][NVDA][TSLA][PTON][AAPL][ZM][AMZN]
```

- Back wall carries horizontal ruler lines at round dollar values, chosen so
  four to eight lines are visible. Labels right aligned, 13px, muted. This is
  the only furniture on the wall.
- Shelf runs cheapest share first, so the wafer and the slab are the two ends of
  the same row and rule 1 reads left to right.
- A company you do not own still shows one coin on its plate.
- HUD is worth, cash, what you started with, the date, and the wave name.
  Nothing else.

**Phone, 390x844**

- Stage is 60vh. Shelf pans horizontally with about 3.5 stacks visible.
- The cash trough is pinned to the left edge and does not pan, so money is
  always on screen next to whatever you are looking at.
- The company panel is a bottom sheet.
- Every rule in section 12 must hold at this width. Mobile is first class here.

**Explicitly not built**, all of it visible in his reference images: XP, levels,
a mascot, streaks, a five tab nav, a news feed, a market mood face, a watchlist,
a leaderboard, a rebalance button, an add funds button. They are chrome around a
portfolio viewer. The game is the shelf.

---

## 8. Interaction

**Tap a stack** opens its panel and slows the tape to 0.35x. Not a pause: the
market keeps breathing while you decide, and the clock visibly slows so the
change is never a surprise. Tap away to close and resume.

**The panel** carries, in this order:
- Company name, written the way the company writes it.
- Price now, live, with the month's change.
- What you own, in shares, and what it is worth.
- The last twelve months as twelve coins laid left to right at their historical
  thicknesses. This is the chart, drawn out of the same object on the same
  ruler. **Do not add a line chart.** A sparkline beside the stack teaches
  players to read the sparkline and ignore the coins, which quietly proves the
  metaphor unnecessary.
- `Buy 1` `Buy 5` `Buy max`, then `Sell 1` `Sell 5` `Sell all`, following the
  convention already validated in Tally.

Buttons disable rather than disappear when unaffordable.

---

## 9. Animation

Every one of these is a rule being demonstrated. None is decoration.

| Beat | What happens | Time |
| --- | --- | --- |
| Growth | Coin height tweens continuously with the interpolated price. No pop, no bounce. | continuous |
| Buy | The exact chips being spent lift out of the trough, fly together, and fuse into one share coin that lands on the stack at the same total height. | 450ms |
| Sell | The reverse. The top coin lifts off, falls to the trough, and breaks into chips plus a sliver. | 450ms |
| Delisting | The coin has already thinned to nothing on its own. At zero the base plate greys and the label changes. | 300ms |
| Wave turnover | Every stack converts at once. | 1200ms |
| Ratchet | S eases down, whole scene rescales together. | 600ms |

The buy and sell animations are the only place a player learns rule 3, so
conservation of height must be exact and visible. Do not fake it with a
crossfade.

---

## 10. Rendering

**three.js, dark and lit like a game.** The earlier "clean and plain" direction
was reversed in review: his words were that it does not have to be in the clean
Apple style. Read that as permission to make the scene look like a game rather
than a chart, and take the reference images as the register to aim at, without
their XP bars and mascots.

- Dark room. Backdrop is a vertical gradient, roughly `#131C31` to `#0A0F1C`,
  with a pool of cool light behind the shelf so the coins sit in a room and not
  a void.
- The table is its own darker gradient with a lit front edge, and every stack
  drops a soft contact shadow onto it.
- Coins are lit hard enough to read as metal: a bright specular band about a
  third of the way across the body, deep falloff at both edges, and a lifted
  top face. Brand colour still owns the coin.
- Text `#F2F5FA`, muted `#8B99AC`, ruler lines white at 7 percent.
- Still no bloom and no chrome bevels, and `docs/clean-type.md` still governs
  every string. The type contract is about typefaces and sizes, not about
  colour, and none of this touches it.

**The camera must be orthographic.** A perspective camera makes distant stacks
shorter than near ones, which breaks the one ruler law outright. Use an
orthographic camera with a 12 to 18 degree downward tilt: you see coin tops, and
vertical proportions stay exact across the whole shelf.

Implementation notes:
- One `InstancedMesh` per company, `CylinderGeometry(1, 1, 1, 48)`, per instance
  Y scale and Y position. Thousands of instances are fine.
- The logo on the top coin is a separate thin disc mesh with a texture, so no
  per instance textures are needed.
- Logos load from `public/logos/<key>.png`. Use `encodeURI`, not
  `encodeURIComponent`, or `at&t`, `j&j`, `p&g` and `d&b` silently lose their
  logos. That bug is already documented in `src/pages/Takeover.tsx`.
- Labels are HTML overlay divs positioned by projecting world anchors each
  frame, the screen space pattern Takeover already uses. Canvas or texture text
  will not survive `tools/cleancheck.mjs` and will not look clean at phone DPI.
- Budget: 60fps on a 2020 phone, twelve draw calls or fewer.

---

## 11. Files

```
src/lib/coins/engine.ts     pure model: waves, tape, prices, buy, sell, worth,
                            ruler scale, delisting, fail. No three.js import.
src/lib/coins/waves.ts      wave definitions off the era JSONs, plus display
                            data per ticker (name, logo key, brand colour),
                            reusing src/data/takeoverCompanies.ts and
                            src/data/companyCatalog.ts where they already carry it
src/components/coins/Stage.tsx    the three.js scene
src/components/coins/Labels.tsx   screen space labels
src/components/coins/Panel.tsx    the company panel and bottom sheet
src/pages/Coins.tsx         page shell, HUD, wave cards, end cards
tools/coinsSim.ts           npx tsx harness asserting tests A to G on the model
tools/coinscheck.mjs        Playwright walk at 1440x950 and 390x844
```

Route `/coins` in `src/main.tsx`. Card on the Landing grid with the description
`Buy shares, watch the coins grow.` Add `/coins` to the `ROUTES` list in
`tools/cleancheck.mjs`.

---

## 12. Acceptance tests

A to E are the ones to run in front of Jared. All of them must also pass at
390px.

**A. Rule 1.** At any single moment, for any two companies, the drawn thickness
of one share coin divided by the other equals the ratio of their prices, within
one pixel. Measure two on screen and divide.

**B. Rule 2.** Watch a rising company for ten seconds with no input. Its coin
count is unchanged. Its column is taller. Its measured coin thickness has grown
by the same ratio the price grew.

**C. Rule 3, selling.** Sell one share at price P. The cash column grows by
exactly `P * S`. The number of whole chips added is `floor(P / 10)`, with the
remainder as a sliver. Total drawn height across the whole board is unchanged at
the instant of the trade.

**D. Rule 3, buying.** The reverse, exactly. The chips consumed and the coin
gained are the same height.

**E. One ruler.** A dollar chip is the same height in every column, in every
wave, at every moment, given the current S.

**F. Death.** Lehman's stack reaches zero height and the plate reads `gone`.

**G. The camera.** After a doubling, S has decreased, the ruler labels read
twice what they did, and no coin has grown in drawn thickness by more than the
price actually grew. After a crash the columns stay visibly short for several
seconds before the frame recovers.

**H. Share count is not size.** Buy $860 of Nvidia at $3.59 and $860 of Amazon
at $85.94 in the opening month. Two hundred and forty coins stand next to ten,
and the two columns are exactly the same height. This is the best single frame
the game produces and it is worth staging deliberately.

**I. The seam.** Ten shares of any company read as ten coins, not as one tube,
including Peloton, whose coin is nearly black.

---

## 13. Copy

Every string, so nothing gets invented at build time. Sentence case, one phrase,
no em dashes, no lists of three, nothing under 12px.

| Where | String |
| --- | --- |
| Landing card | Coins |
| Landing description | Buy shares, watch the coins grow. |
| HUD | worth, cash |
| Wave 1 card | The 2020s |
| Wave 2 card | The crash |
| Wave 3 card | The dot-com bust |
| Wave card line | You are worth $1,412. |
| Turnover line | Everything sells. |
| Dead company plate | gone |
| Panel own line | You own 5. |
| Broke card | You went broke. |
| End card | You finished with $3,140. |
| End card compare | The market turned $500 into $1,180. |

The end card comparison uses `^SP500TR` from the same era files over the same
months. It is one honest number and it costs nothing.

---

## 14. Not in v1

Deliberately out, with the reason, so none of it creeps in:

- **Dividends.** A chip dropping out of a stack into the trough is the obvious
  move and it is a good one. Jared said stocks only, for now.
- **Index funds.** Marlon raised that neither dividends nor funds are expressible
  in this representation yet. That concern is real and unanswered; a fund is
  probably a coin laminated out of many thin slices. Not now.
- **Splits.** One thick coin cleaving into two half thickness coins, same column
  height, more shares, is the single best teaching moment available in this
  metaphor. Hold it for v2.
- **Fifty to a hundred holdings**, his third image. At that count a coin is
  sub-pixel and rule 1 is dead. The honest answer is that a coin is a zoom
  level, not a fact that survives every scale: many holdings become a yard of
  columns where only heights read, and tapping one flies back down to coins.
  Worth building, worth not faking.
- Levels, lessons, XP, streaks, news, mascots.

---

## 15. What to send him

The link is
`https://marlonedwards.github.io/share-garden-prototypes/#/coins` once it is
pushed to main.

Suggested note, which sets up tests A to C so he checks the rules rather than
the art:

> Here is the model. Four things to try. Look at GameStop next to Amazon: same
> screen, same ruler, one coin is a wafer and one is a slab, because that is
> what a share of each costs. Buy thirty GameStop and one Amazon and the two
> columns come out about the same height, which is share count against share
> price in one picture. Then watch Nvidia for ten seconds without touching
> anything: the coins never multiply, they just get fatter, and the column rises
> because of it. Then sell one share and watch it break into dollar coins that
> are all the same size. The art is deliberately plain for now.
