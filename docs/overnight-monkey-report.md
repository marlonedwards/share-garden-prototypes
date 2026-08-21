# Overnight run report, Monkey Trade, August 20 2026

Build of Monkey Trade on the shared tape engine, per docs/monkey-spec.md.
Logs what was built, every judgment call where the spec was silent, known
debts, playtest notes, the acceptance checklist, the art review sign-off,
and the live link. Written as the run goes.

## Status

- Started from clean main at d00f5d6. Dev server on 4318.
- Era check before the deal: eraDotcom.json carries ten companies (AAPL,
  AMZN, MSFT, CSCO, INTC, KO, JNJ, XOM, WCOM, ETYS) plus the index; covid
  carries seven, gfc nine, inflation five, crypto six. The spec's "only the
  dot-com file has ten" holds. "The 2020s" is eraCovid.json (2019-01 to
  2024-12); "the crash" is eraGfc.json.

## Judgment calls

(filled in by each team as it goes)

### Art team

- **The ground is keyed by the model, not by the script.** Section 11 assumed
  the pipeline paints on a flat ground that code then keys. It does not: across
  two batches gpt-image-1 ignored a named background hex entirely and returned a
  gold and then a dark brown gradient with a soft glow behind every figure, so a
  corner flood fill left a halo. Batch 3 asked gpt-image-1 for
  `background: "transparent"` instead and got a real alpha channel with clean
  edges. The script keeps the flood fill path as a fallback for any sheet that
  comes back opaque.
- **No ground shadow.** The spec's art note allows a tiny shadow under each
  figure. The generator drew it as a soft glow that survived keying as a dirty
  fringe, so the prompt now bans shadows outright. The game can lay its own flat
  shadow under a monkey in CSS if the strip wants one.
- **Slicing is content aware, not a fixed grid.** The model does not honour cell
  geometry, so the script finds each figure by projecting an ink mask, takes its
  tight box, then places every figure on a shared square canvas at a shared
  scale with the feet on one baseline. Poses keep their relative height, which is
  what makes a rank strip read. A nominal grid slice is the fallback when the
  projection does not find the expected number of bands.
- **Sheet size.** One 1536x1024 sheet, 3 by 2, five poses and one empty cell.
  Cells land at 512x512 after normalisation, which is the floor the run asked
  for and nine times the 56px rank strip size.
- **Tie colour.** The tie came back a plain flat grey, so a per monkey tie tint
  in code is possible. The suit is a dark navy and the fur a medium brown, both
  consistent across the five poses.
- **Kept for the record.** `public/monkey/sheet-monkey.png` and `sheet-dart.png`
  are the raw generations, pixel for pixel, only recompressed losslessly. They
  are not loaded by the game. The candidate folder does not keep a second copy
  of them; `--reslice` falls back to the promoted sheet.

### Rules team

- **The level is mixed into the seed.** `roundRng(level, seed)` hashes the two
  together before handing them to the engine's mulberry32, so `?level=2&seed=7`
  is a different round from `?level=1&seed=7` rather than the same darts thrown
  at a different board.
- **The guide is monkey one, on every level and every seed.** Nothing in the
  spec asks it to move, and a fixed guide lets the strip reserve its slot.
- **A doubled wedge buys one position, not two.** Allotments are aggregated per
  ticker before any share is bought, so two darts on Apple spend $1,000 on Apple
  in a single whole-share buy instead of two $500 buys that each round down.
- **Level 2 wedges have to carry their own recovery.** On top of listed,
  buyable and alive, a level 2 stock's last close must be at or above its first.
  Section 3 promises that monkeys who sat through the crash recover, and the
  crash window otherwise deals Citigroup at 0.10 times and AIG at 0.03 times,
  which teaches the opposite. Consequence, and a known debt: the crash era's
  pool is exactly Apple, Amazon, Ford and Walmart, so crash rounds repeat their
  three stocks more often than the 2020s rounds do.
- **The crash month is computed, not authored.** It is the month the index
  falls hardest inside the window, which lands on October 2008 in the crash and
  March 2020 in the 2020s, the two months section 3 names.
- **Level 1 redraws until six of the ten buy months are distinct.** A plain
  draw falls short about once in every 280 seeds, which would make acceptance
  test C true of almost all seeds instead of all of them. The redraw runs on the
  same seeded stream, with a forced spread as a last resort.
- **A calendar dart may land on any month of the window, the last one
  included.** A monkey that buys in the final month simply finishes on its
  thousand dollars, which is a real outcome and not a bug.
- **Board order.** Level 3 keeps the era file's order, so the wedges read Apple
  to eToys the way section 3 lists them. Level 2's three wedges keep the order
  the seed picked them in, so the board is not always alphabetical.
- **Board membership uses The Floor's listing rule unchanged.** A leading run of
  three or more identical closes is backfill, so a company is never dealt before
  its first real trading month, and a company already at zero when the window
  opens is not a wedge.
- **A dart whose allotment cannot buy one share leaves that money in cash.**
  Conservation still closes and the monkey is simply that much less invested;
  this only bites on late dot-com windows where Apple runs past a third of the
  stake.
- **A monkey is worth exactly its thousand dollars in cash until its buy
  month.** The worth path is piecewise: the stake before entry, the engine's own
  `worthAt` on a zero-trade run after it. That is what "entered at its buy
  month" means.
- **Names and money come from the siblings.** `companyName` from
  `src/lib/trigger/deal.ts` and `money` from `src/lib/trigger/format.ts`, so
  Exxon reads "Exxon Mobil" the way Trigger writes it rather than the "Exxon"
  of the spec's prose. A monkey that could not buy anything reads "sat in cash".
- **Save shapes.** `monkey-best` is a JSON object keyed by level number,
  `monkey-progress` a JSON array of unlocked level ids. Unlocked levels are
  derived from the best ranks as well as read from progress, so a cleared or
  torn progress key can never take back a level the player has already earned.
  Both reads fall back to level one only when there is no window.
- **Acceptance test E's survival floor is five percent of the stake.** An
  exhaustive sweep of every 36 month window and every three wedge basket in the
  dot-com file puts the worst possible outcome at $102.88 (Cisco with WorldCom
  and eToys from March 2000), so a $50 floor is under every real outcome and
  still far above the $43 that going all in on a dying company can leave. The
  sim asserts the sweep as well as the dealt monkeys.
- **`tools/monkeySim.ts` prints a FIXTURE block** in floorSim's format, three
  pinned deals at seed 7 with their windows, boards, crash months, buy months
  and final worths, so `tools/monkeycheck.mjs` can hold the live DOM against
  numbers this harness computed.
- **Rank compares worth to the cent, not the raw float.** A monkey holding
  whole shares bought with exactly $1,000 can carry float dust
  (999.9999999999999) that a raw compare would read as behind a player worth
  exactly 1000, though the two are the same dollar and cent. `rank()` and
  `bestMonkey`/`worstMonkey` now round both sides with `Math.round(w * 100)`
  before comparing, monkeys still win ties on the player, and monkeys tied
  against each other order by index ascending. This is why a fresh round's
  header reads "you beat 0 of 10" instead of "1 of 10" the instant the round
  opens. Worth itself is computed and displayed exactly as before; only the
  comparison rounds.

### Stage team

- **The Floor's desk is forked, not restyled.** Its slab green, tick grey,
  seam, dead grey, panel gradient, border and both text colours are module
  constants and inline literals; no prop reaches any of them, so the warm ground
  cannot be had by props. `src/components/monkey/Desk.tsx` is the copy, with
  every prop name (columns, scale, height, focus, onFocus, settling, phone,
  pour) and every data attribute (data-desk, data-stack, data-dollars,
  data-shares, data-price, data-units, data-unit-band, data-banded, data-sliver,
  data-column, data-scale, data-tick-px, data-pour, data-settling) unchanged, so
  the two desks stay one representation with two palettes. The band, sliver and
  scale arithmetic is copied verbatim, which is what keeps the three flat rules
  true: buys pour ticks into slabs, sells break slabs into ticks, and the one
  dollar scale is a prop the desk never touches. Only three things changed
  besides colour: names come from Trigger's `companyName` rather than The
  Floor's `nameOf`, so the desk and `monkeyLine` write "Exxon Mobil" the same
  way; `focus` widens to `Ticker | null`, because the round opens with nothing
  focused; and the labels move from 12px to 13px on the warmer ground.
- **The tie is drawn, not tinted.** The art report's read that a flat grey tie
  could be tinted in code did not survive sampling: the suit sits around
  rgb(64,72,88) and the tie within about thirty values of it, so no threshold
  separates them without keying the lapels too, and the tie's own box drifts
  about six percent of the frame between poses, so a fixed overlay misregisters
  on the slump. Section 11's escape hatch is taken: a small tie glyph, knot and
  blade, drawn in SVG under each face in the monkey's colour. It is identical in
  every pose, legible at strip size, and costs no asset.
- **TIES is eleven long, not ten.** Index 0 holds the muted grey and is never a
  monkey, so `TIES[monkey.index]` reads straight through without an off-by-one
  at every call site. The ten colours are the look's own five plus five that
  hold up beside them on the warm ground.
- **The throw beat is two seconds total, not 180ms a dart.** Ten darts 180ms
  apart is the 1.8 seconds section 5 asks for, but level 3 throws thirty and the
  same spacing would run five and a half seconds and hold the round open. The
  step is `1900 / (darts - 1)`, floored at 55ms so the last level does not
  machine gun and capped at 190ms so the first one keeps its rhythm. Measured:
  thirty darts land in 2.25 seconds including the landing squash.
- **The rail moves the names out of the wedges.** A tenth of a 180px dial is
  about thirty pixels of arc and the type contract's floor is twelve, so the
  rail form keeps the dial with its darts, chips and wedge numbers at the top
  and slides the same name and price text elements into a legend under it, at
  13px. The wedge number is drawn on the rim in both forms, so the dial and the
  legend read as one thing. Nothing is remounted to do it: verified by tagging
  every dart and wedge node, switching forms, and finding all thirty darts and
  all ten wedges to be the same elements afterwards.
- **Wedges are unit-radius sector paths.** Each wedge's `d` is a sector of the
  unit circle and its group carries `translate(cx, cy) scale(r)`, so a form
  change is a transform change the browser tweens rather than a path the game
  has to rebuild. That is what lets the board shrink into the rail while the
  darts stay pinned and the tape never pauses.
- **Darts anchor on the tip, not the middle.** The pinned dart's point sits
  about a quarter across and four fifths down its own image, so the image is
  offset by that fraction. A dart centred on its box looks laid on a wedge; a
  dart anchored on its tip looks stuck in one.
- **A dart's scatter is a hash of its index.** Two darts on one wedge have to
  sit apart and have to sit in the same place every redraw, so the offset and
  the spin come from a hash of the dart's own index. No render path calls
  Math.random, which is also what lets the same props always draw the same
  board.
- **The calendar's chip sits beside the stock name.** A month is not a holding,
  so a chip on one would say the player bought that month. The single stock's
  chip goes next to its name, which is where section 5's "your holdings mark
  the wedge" lands when there is only one wedge.
- **A dead wedge is a muted fill, a small cross and the word "zero".** The
  sentence ("eToys went to zero.") is the page's, per the brief; the board only
  says which wedge it is.
- **The strip's DOM order is the rank order and its keys are the players.**
  The handoff asks for both, and React reorders keyed nodes rather than
  rebuilding them, so a monkey that climbs two places is the same element at a
  new transform. Positions are absolute and animated by transform alone, which
  is why a reorder is a slide and never a reflow. Verified: eleven slot nodes
  survive a reorder and the DOM order matches the rank.
- **The number under a face appears on the end card only.** During play the
  troop is told apart by tie colour, which is what the art was built for; the
  end card names "Monkey 4" because its own lines do. Every slot carries the
  number in `title` and in `data-slot-who` throughout.
- **The sound module counts `attempted` as well as `played`.** Acceptance test L
  has to assert two different things: that every listed moment fired exactly
  once, and that mute and reduced motion really do silence it.
  `window.__monkeySound.played` counts only calls that reached an oscillator and
  `.attempted` counts every call the game made. Verified under reduced motion:
  thirty attempts, zero plays, and no AudioContext before the gesture.
- **Confetti is deterministic and reduced motion gets none.** Twenty-four pieces
  in the look's four colours, placed by a hash of their own index, so the same
  rank always celebrates the same way. Under reduced motion the confetti is not
  drawn at all rather than drawn still, because a frozen scatter of paper reads
  as a bug.
- **The guide's bubble owns its own fade.** `Guide` holds the line for four
  seconds and fades it over 320ms without being told to, so the page can set a
  line and forget it and the tape is never waiting on a dismissal. It reports
  back through `onShown` and `onDone`.
- **The button is a face on a band, and the press collapses the band.** Pressing
  moves the face down two pixels and takes two off the band, so the button keeps
  its box and the press is felt rather than seen. `DuoButton` is the default
  export of `src/components/monkey/Button.tsx` so the page's trade row, level
  cards and end card all press the same way.
- **The rail column is 216 wide so its dial can be 200.** At the old 200 the
  dial came out 164px across with a 180px panel ring, and a tenth of that is
  arc nobody can read. `RAIL_WIDTH` is now 216 and the dial takes every pixel
  the column has left after its ring, which is a 200px board and the smallest
  one on which ten wedges still separate. The page reads the constant to size
  its own left column, so the sixteen pixels come out of the stage and nothing
  else had to move.
- **The rail's darts are packed, not scattered.** Level 3's thirty scattered
  darts landed with pairs 1.5px apart on the small dial, which is a smear and
  not a count. In rail form a dart shrinks from 26px to a 12px dot and takes a
  numbered place in its own wedge: down the wedge by index, into a second lane
  only past five, spaced 13px, so the closest pair on the same wedge now sits
  12.9px apart and you can count the monkeys on a wedge at a glance. The place
  is a pure function of the dart's index among the darts sharing its target, so
  the packing is deterministic and the open to rail change is still a move of
  the same nodes rather than a reshuffle of new ones. Verified: the walk's
  rail check still passes with nine clock steps across the flip.
- **Level 1's rail packs into rows and moves its month number left.** A month
  is a row rather than a wedge there, so the darts on a month sit in a row of
  dots at its right edge and the month's own number moves from the middle of
  the row to its left edge, out of their way. Ten dots on twenty-four rows
  reads as a count without a single overlap.
- **The focused wedge is one outline for the whole board.** A stroke inside
  each wedge's own group had its neighbour's fill drawn over half of it, so the
  focus ring is a single path drawn after every wedge, its `d` following the
  focused wedge and its stroke going transparent when nothing is focused. It is
  never unmounted, so focus never costs a node. In the rail the legend row
  behind the focused name also takes a solid bar of the focus colour and the
  name goes to heading weight, because two soft tints beside each other is not
  an answer to "which stock will Buy 5 buy".
- **A wedge looks pressable before it is pressed.** Section 5 says tap a wedge
  to focus it and nothing on the board said so. Every wedge and every calendar
  cell now carries the pointer, and hovering one pulls it nine pixels out of
  the dial along its own mid angle and lifts its fill to a stronger tint of the
  focus blue. The pull is a class the board only adds in open form and only
  when reduced motion is off; the fill and the pointer stay in both forms,
  because the rail is tappable too.
- **The confetti lands instead of leaving.** Twenty-four pieces fell straight
  through the strip and out of the bottom, so two seconds after a winning card
  painted there was nothing left to see, which is why four winning end cards
  came back with no confetti in them. Fifty-six pieces now drop into the
  settled strip over two and a half seconds and each one comes to rest in a
  scatter over the troop, then the whole pile fades together over 400ms, so the
  celebration runs about 2.85 seconds and every moment of it is a strip full of
  paper. The pile stops short of the worths, because the rank line is the end
  card's first sentence and paper on a number is a number nobody can read. The
  fall owns the transform and the fade owns the opacity, which is what lets one
  shared fade end fifty-six different falls. Verified by screenshot at 800ms
  and at 2000ms after `[data-end-card]` on level 1 seed 23: 56 pieces visible
  at both, none at 3200ms. Still hash placed, still none under reduced motion.

### Page team

- **The play chart's month axis is a synthetic month array, not a fork of the
  chart.** `Chart.tsx` is used unmodified and it takes its labels off the month
  strings it is handed: a tick is a month ending `-01` and its label is that
  string's first four characters. Handing it the real months would print years
  into the DOM, which section 2 forbids during play. So `playMonths(n)` in
  `src/pages/Monkey.tsx` builds a parallel array where the tick months are the
  label right-padded to four characters (`"   6-01"`) and every other month is
  a string that is not a January. SVG collapses the padding, so the axis reads
  1, 6, 12, 18, 24 and the DOM carries no year. The end card hands the same
  chart `deal.months` and gets real years back. This was chosen over hiding the
  axis and drawing a second one, which is more code and two axis styles to keep
  in step.
- **The settle pour reports as `data-monkey-phase="play"`.** The handoff names
  four phase values and the pour is not one of them, so the 1.2 seconds between
  the last month and the end card stay on `play` with a separate
  `data-settling="1"` on the page root beside the desk's own.
- **The round-over latch is its own ref.** The render pass writes `phaseRef`
  back from the phase state and the phase state stays `play` through the pour,
  so `phaseRef` alone let the frame after the last one end the round again, and
  again: the walk caught the settle sound firing 108 times and a `Play again`
  click being stomped back to the end card by a queue of stale timers.
  `overRef` latches instead, and is cleared only by a new deal.
- **Months in the market is counted on total shares held, not on Trigger's
  `monthsInMarket`.** That helper closes the span on any sell at all and only
  reopens on a later buy, which is exact for a one-stock game that only sells
  out; this game has Sell 1 and Sell 5 and up to ten wedges, so selling five of
  twenty shares would report a player out of a market they are still standing
  in. `monthsHolding()` walks the same trade log on the running total instead.
- **The biggest single decision is computed per wedge.** `decisionsOf` prices
  every trade in a run against one ticker, so the run is sliced per ticker and
  the largest magnitude across the slices is what the end card prints.
- **The desk was taken from `src/components/monkey/Desk.tsx`,** the stage
  team's fork, with the same props The Floor's takes. It paints its own warm
  band, so the page does not wrap it in a second panel.
- **The guide's bubble gets its own headroom on the rank strip.** `Strip` hangs
  the bubble above the guide's slot, which put the line over the clock; the
  strip's panel now carries 64px of top padding and the desk is that much
  shorter. Only the play stage pays this; the open phase and the end card render
  `Guide` directly.
- **Only one `[data-guide-line]` is ever in the DOM.** The play stage passes the
  line to `Strip`, which owns the bubble; the open phase and the end card render
  `Guide` themselves and pass `Strip` a null line, so the end card's line is the
  spec's item 7 rather than a bubble over a settled monkey.
- **`?level=` or `?seed=` alone pins.** `dealFromParams` fills the other half
  in, so a half written link plays rather than dropping the player on the level
  cards. Editing the pin away lands on the level cards: the hash router does not
  remount the page, so nothing else would notice the round was cancelled.
- **Buy 1 and Buy 5 are budgets, not counts.** They call the engine's `buy` with
  `price * n`, so the whole-share rule stays the engine's and a player who
  cannot afford five shares buys what the budget covers rather than nothing.
- **The end card reads the player's run, never the settled one.** The pour's
  automatic sells would otherwise count as trades made, draw as trade dots on
  the revealed chart, and move the biggest decision. `settleRun` is used only
  for the cash figure the pour eases to.
- **Buy ticks are stepped and capped.** One tick per share bought, at most
  twelve, 45ms apart, so a 144 share buy is a run and not a wall.
- **`window.__monkeySound` is left to `sound.ts`.** It counts calls that
  reached an oscillator, which is the number acceptance test L wants; counting
  in the page would count intent and double every entry.
- **The header's `data-cash` reports the drawn cash during the pour** so the
  attribute and the number on screen never disagree. They are equal at every
  other moment.
- **Live rank, the strip's order and the header's count all come from one
  `rankAt` call** per commit, so acceptance test F cannot fail one and pass the
  other.

## Known debts

## Playtest notes

Two blind playtests at real speed (no turbo), a Sonnet tester over about
fifteen rounds across all three levels and a Haiku tester over three rounds,
each playing as a high school student who has never traded.

First ten seconds:
- The level card button reads "Throw" and takes a beat to connect to
  starting a round; the header line bridges it. Copy table kept as written.
- Start is disabled for the two seconds the darts land, with no hint why.
- Nothing says that tapping a wedge is how you choose the stock the buttons
  act on; testers found it by poking. Fixed with a pointer cursor and hover
  lift on wedges.
- "Buy max" and the worth versus cash pair read as unexplained to the Haiku
  tester; the first buy explains both.

What felt dead:
- Levels 1 and 3 have two guide lines before the round and none during it,
  so the middle forty seconds run with no commentary. The spec defines no
  mid-round moment for those levels; logged, not changed.
- Level 3: with the focused wedge neither held nor affordable every trade
  button is grey at once. Correct, but unexplained.
- The rail dial at ten wedges smeared thirty darts into an unreadable blob.
  Fixed in the rail form.

What they learned without being told, in the testers' words:
- Level 1: when you buy in matters less than whether you stay invested.
- Level 2: crashes are survivable if you hold; the crash line landed as the
  desk was cratering.
- Level 3: concentrating in favourites loses to monkeys who spread across
  sectors when WorldCom and eToys go to nothing.
- End-card lines matched play on every level except one level 2 run where a
  player who never sold still read "Selling in a crash locks the loss in",
  since the lines are keyed to the rank outcome, not the trades. Spec
  section 8 as written; logged as a debt.

Opponents: the live strip reordering every tick and the plain-words baskets
on the end card kept the troop present and legible. Testers noted the troop
shares one face and one mood (the whole troop cheers or slumps on your
outcome), which is spec section 7 as written.

Sound, from the play counters and the module's parameters: dart thocks only
during the throw and equal to the dart count; buy ticks from the player and
from monkeys reaching their month, up to about fifteen a round on level 3,
short and quiet; pass blips up to about thirteen up and twelve down in a busy
round, bursty at month boundaries, never per frame, 70 to 80ms each at low
gain; settle run and rank reveal exactly once; guide pop two to four a level.
Nothing fires per frame.

Broken, as reported, and what happened to each:
- The end card's guide line faded after four seconds: fixed, it persists.
- No confetti seen on four winning end cards: the fall was too brief to
  catch in a screenshot; lengthened to about three seconds.
- Two faces hidden under others on the live strip: fixed (the slide
  animation was cancelled by React's node moves; see Judgment calls).
- Mid-round resets during the session were hot reloads from concurrent
  edits, not a defect; but a round keeps its state in memory only, so a
  reload during the sixty seconds loses it. Logged as a debt.

## Art review

Three batches, model `openai/gpt-image-1` through OpenRouter, one sprite sheet
per batch so the five poses share a single generation context.

- **Batch 1, rejected.** Character and poses were right, but the model painted a
  gold gradient ground with a soft drop shadow behind each figure instead of the
  flat `#FFFBF2` the prompt named. Keying the corners left a gold halo around
  every slice, visible at 56px.
- **Batch 2, rejected.** The background instruction was moved to the front of the
  prompt and every shadow banned. The model went further the wrong way: a dark
  brown gradient with an outer glow, and it filled the sixth cell that was asked
  to stay empty with a sixth monkey cropped at the waist.
- **Batch 3, passed.** Asked gpt-image-1 for `background: "transparent"` rather
  than a named hex. Real alpha, clean outlines, five consistent poses plus both
  darts. Reviewer found zero rejects.

Reviewer sign-off, verbatim:

> SIGN-OFF: batch 3 passes, zero rejects. Character stays consistent across
> every pose (same fur brown, same slate suit and grey tie, same face shape),
> edges are clean with no jagged cell fragments or baked-in text, and all five
> poses plus both dart states hold up at small size.

> 56px distinguishability: idle, cheer and slump are clearly distinguishable.
> Cheer's raised-arms silhouette is unmistakable against the other two. Idle and
> slump both keep arms down, but slump's bowed head, hunched shoulder line and
> downturned mouth versus idle's upright head and closed smile still read apart
> at 56px, confirmed in strip56.png.

Shipped in `public/monkey/`, every figure 512x512 RGBA with a transparent ground:
`monkey-idle.png`, `monkey-throw.png`, `monkey-cheer.png`, `monkey-slump.png`,
`monkey-talk.png`, `dart.png`, `dart-pinned.png`. The raw sheets stay beside them
as `sheet-monkey.png` (1536x1024, 3 by 2, five poses and one empty cell) and
`sheet-dart.png`. The passing candidate batch with its 56px previews is kept at
`public/monkey/candidates/batch3/`; the two rejected batches are deleted. The
generator is `tools/gen_monkeys_gpt.py`.

## Acceptance checklist

## Live link
