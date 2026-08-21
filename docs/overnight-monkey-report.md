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
- **Level 3 only opens on windows where all ten companies are alive.** The
  house-bar review found boards of eight and nine wedges under a card that says
  "Ten stocks" and a guide that says "Ten wedges". The start is now filtered to
  the ones where every company on the file is openable, computed from the data
  rather than written down: eToys is at zero from April 2001 and WorldCom from
  December 2002, so the windows run January 2000 to March 2001. Two things fall
  out of that. Every window now reaches September 2002, the worst month the
  dot-com index has, so the end card's "that was the dot-com bust" is true of
  every seed; and every window carries both deaths, so the level's lesson is
  always on the board. The cost is fifteen windows instead of sixty-one, which
  the seed still spreads the darts across.
- **Level 1 windows have to rise overall.** The same rule level 2 already runs,
  now on the calendar level: on top of buyable, listed and alive, the dealt
  stock's last close must be at or above its first. Thirty-eight percent of the
  2020s windows ended below where they opened, and in those the winning monkey
  is the one whose dart landed latest, the one that sat in cash longest, which
  teaches timing rather than "when you got in mattered less than staying in".
  The window and the stock are drawn together and redrawn together, so no start
  is ever pinned with a pool the rule cannot fill. Every 2020s window has at
  least one rising stock in it, so the redraw lands on the first attempt for
  every seed today. The sim now asserts over 200 seeds that the month one monkey
  beats sitting in cash, by at least $8.96 in the leanest seed, and reports that
  the best monkey bought in the front half 152 times against 48 in the back.
- **Level 2 wedges have a mania cap of five times as well as a recovery
  floor.** The 2020s window was dealing Tesla at 17 times its open and GameStop
  at 30, which turns "crashes are survivable if you stay" into a rocket and
  hands out $16,896 monkeys. A wedge's last close over its first must now be at
  most 5x. That leaves the crash era Apple, Amazon, Ford and Walmart, unchanged,
  and the 2020s Apple, Amazon, Zoom and Peloton, four wedges each for a board of
  three, so the deal never fails and no loosening is needed. If a future file
  left fewer than three, the cap loosens to the smallest multiple that fills the
  board rather than failing; the recovery rule keeps its own older fallback to
  everything buyable. Acceptance test D stays green, with the low seller behind
  all ten monkeys in every seed.
- **The mania cap is shared, so level 1 runs it too.** `MAX_GAIN` is one
  constant for both levels rather than a level 2 rule. Level 1's rise rule lets
  a GameStop or a Tesla window through, because a lottery is a rising window,
  and those rounds finished with monkeys worth twenty to thirty nine thousand
  dollars against a thousand dollar stake, which reads as a jackpot rather than
  as staying in. Capping the dealt stock at five times its open leaves every one
  of the 2020s windows at least one candidate, so no window is lost, and the
  richest monkey over 200 seeds falls from $39,489 to $6,468. The sim asserts
  the cap per seed alongside the rise.
- **Level 3's windows were measured against the cash baseline and left
  alone.** The second house bar found that a player who never trades beats most
  of the troop on level 3, which disproves "Spreading beats picking" with an
  empty desk. Measured over all fifteen full-board starts, 200 seeded troops
  each, ten monkeys of three darts, cash-only against the troop and the median
  monkey's final worth:

  | window | index | cash beats five or more | mean beaten by cash | median monkey |
  | --- | --- | --- | --- | --- |
  | 2000-01 to 2002-12 | 0.66x | 100.0% | 9.87 | $487 |
  | 2000-02 to 2003-01 | 0.65x | 100.0% | 9.56 | $535 |
  | 2000-03 to 2003-02 | 0.59x | 100.0% | 9.61 | $482 |
  | 2000-04 to 2003-03 | 0.61x | 100.0% | 9.55 | $556 |
  | 2000-05 to 2003-04 | 0.67x | 100.0% | 9.69 | $592 |
  | 2000-06 to 2003-05 | 0.69x | 100.0% | 9.76 | $586 |
  | 2000-07 to 2003-06 | 0.71x | 100.0% | 9.46 | $620 |
  | 2000-08 to 2003-07 | 0.68x | 100.0% | 9.65 | $613 |
  | 2000-09 to 2003-08 | 0.73x | 100.0% | 9.18 | $695 |
  | 2000-10 to 2003-09 | 0.73x | 100.0% | 8.79 | $720 |
  | 2000-11 to 2003-10 | 0.84x | 92.5% | 6.67 | $862 |
  | 2000-12 to 2003-11 | 0.84x | 73.0% | 5.47 | $949 |
  | 2001-01 to 2003-12 | 0.85x | 89.0% | 6.41 | $912 |
  | 2001-02 to 2004-01 | 0.96x | 34.5% | 3.99 | $1,049 |
  | 2001-03 to 2004-02 | 1.03x | 31.5% | 3.83 | $1,128 |

  The rule levels 1 and 2 carry cannot be written here. It would read "a
  cash-only player beats fewer than five monkeys on at least ninety percent of
  troops", which means a cash-unlock rate at or under ten percent, and **no
  start comes near it**: the best is 31.5 percent, and the tightest threshold
  that still leaves three starts is 73 percent, a level where cash unlocks three
  troops out of four. So the windows are unchanged, all ten wedges and the bust
  coverage stay, and no assertion was added. The FIXTURE is unchanged for the
  same reason.
- **Why no window can carry level 3's lesson as written.** Every window where
  all ten dot-com companies are alive is a window where the market is under
  water: the index ends between 0.59x and 1.03x, and only the very last start
  clears one. The monkeys are spreads of a falling board, so cash beats them,
  and the level as specced asks the player to lose to a spread in a bust. What
  spreading actually does in these windows is cut ruin, not beat cash. Over
  every three wedge basket and every single wedge in the file:

  | window | median all-in | median spread | tenth percentile all-in | tenth percentile spread | all-in under $500 | spread under $500 |
  | --- | --- | --- | --- | --- | --- | --- |
  | 2000-01 to 2002-12 | $325 | $493 | $42 | $248 | 60% | 51% |
  | 2000-07 to 2003-06 | $743 | $638 | $7 | $399 | 50% | 28% |
  | 2001-03 to 2004-02 | $1,122 | $1,121 | $9 | $714 | 20% | 6% |

  Spreading is worth two to eighty times as much at the tenth percentile and
  ends under half the stake far less often, but its median is level with picking
  and both sit under a thousand dollars. Against the troop it is no better: a
  three wedge spread unlocks on 52.8 to 59.0 percent of troops and going all in
  on one wedge unlocks on 37.1 to 65.5 percent, and at the two least sunk
  windows all-in unlocks more often than spreading does. The honest fixes are
  outside the rules team's file: score level 3 against the troop's own median
  rather than against five of ten, or say the lesson as "spreading survives what
  picking does not" and put ruin on the end card, or give the dot-com file more
  months so a recovery window exists. Level 3 ships locked or as-is on the
  coordinator's call.
- **Level 3's windows are chosen by a measured rule, not a reasoned one.** The
  first two clauses are the kind levels 1 and 2 carry: the board is every
  company alive at the open per section 3, and the window has to cover the
  file's worst index month, computed rather than written down, which is
  September 2002. The third is measured, because what disproves level 3's lesson
  is not a wedge but the player's untouched cash: a window is only dealt if a
  cash-only player unlocks the level on at most one troop in ten, over 120
  seeded troops built with the same darts, the same equal split and the same
  whole-share rule the deal uses. Nine windows survive, July 2001 to September
  2002, all of them nine wedges with WorldCom dying inside. The audit is lazy
  and memoised by era and window width: 8ms on the first level 3 deal, nothing
  after. `boardSizeOf()` carries the count into `levelCard()` and the guide's
  open line, so no copy anywhere writes a wedge count down. Measured before and
  after: the house bar found cash alone beating a mean of 7.88 monkeys and
  unlocking 80 percent of seeds, and the sim now measures it beating a mean of
  1.98 and unlocking 8 of 200 seeds, 4.0 percent. The sim's E asserts the whole of it end to end.
- **The sim prints two re-pin tables.** Any change to the deal rules moves the
  rounds the walk's pinned seeds deal, so `tools/monkeySim.ts` now prints, above
  the check lines, what each of the first forty level 1 seeds deals and how the
  never-trading player and the buy-max-at-open player finish in it, and what
  level 3 deals on seeds 7 and 23. Level 1 seed 23 still satisfies the unlock
  walk after all four rules, the mania cap included: Apple from August 2019,
  never trading beats none of the ten and buying max at the open and holding
  beats all ten. Seeds 27 and 33 are the only others in the first forty that do
  both, if the pin ever has to move.

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

- **The troop stands over the board, and it throws.** The round opened on a
  screen with no monkeys on it: darts arrived out of nowhere, the guide's bubble
  pointed its tail at bare ground, and `monkey-throw.png` was generated and never
  drawn. `src/components/monkey/Troop.tsx` is the fix, a 96px band under the
  header holding all ten monkeys in tie order. Each one flips into the throw pose
  as its own dart flies and drops back to idle once it has landed, on the board's
  own schedule: `dartStepMs` is imported from `Board.tsx` rather than copied, so
  the two cannot drift, and a monkey with three darts counts them up and down
  instead of setting a flag, which is what lets its poses chain rather than
  fight. The guide talks in the talk pose with the bubble hanging off its own
  head, tail pointing up. Under reduced motion the troop stands still and idle.
- **The guide's tail is a prop now.** The bubble is drawn in two places and the
  monkey is above it in one and below it in the other, so `GuideProps.tail` names
  the edge the tail leaves from, the side it is measured from, and how far along.
  The default is the strip's old tail, pointing down, so nothing that already
  called `Guide` had to change.
- **The tie is on the chest, and the anchors were measured rather than guessed.**
  A coloured glyph under a monkey's feet reads as a fault, not as a suit. The
  overlay has to register on five poses that turn the body by up to forty pixels,
  so each pose was measured once: the tie's fill is the only light unsaturated
  ink inside the suit, so a mask of alpha over 200, saturation under 26 and value
  between 120 and 215 isolates it exactly in all five 512px frames. `TIE_ANCHOR`
  in `look.ts` holds that box per pose (knot middle, drop, width, lean) and the
  tie is two paths drawn in a hundred by hundred box placed from it, inside the
  sprite's own dark outline rather than over it. Confirmed by screenshot at 1x
  and at 2x on every pose the game draws: idle and talk on the live strip, throw
  in the troop mid beat, cheer and slump on the end card. The old 58px face is
  gone, so the small size confirmed is the 72px one the strip now draws.
- **The strip gave its headroom back.** Faces go from 58 to 72 and the worth from
  13 to 18, the tie row under the feet is gone, and the bubble now stands on its
  own monkey's head and grows upward out of the strip's own band instead of
  hanging above it in reserved space. It is 460 wide, which puts every line in
  `src/content/monkey.ts` on two lines at 16px, and it anchors to the near edge of
  the guide's slot and flips to the far edge once the guide climbs past the middle
  of the rank, so a guide at either end still draws inside the strip. Measured at
  1440x950 with the guide talking: the bubble clears both the clock and the "you
  beat" line by the whole header row.
- **`STRIP_GUIDE_ROOM` replaces the page's 64.** The strip's own band carries 32
  pixels of the bubble and the page has to leave 24 above it, exported so the two
  cannot disagree. Until the page takes it the strip band is 222 tall, down from
  240; with it the band is 182 and the desk gains 58 pixels. The page change is a
  one line swap and is written up in the handback.
- **A desk column's width scales with what the desk is holding.** The Floor plays
  ten wedges wide, so its 92px column is what fits there; this game opens on one
  holding and cash and two 92px columns in a stage 1,180 across read as empty
  panel with a stripe down the middle. `columnWidth()` draws one or two holdings
  at 160, ten at 92, and everything between off the same line, cash included, so
  the band never carries two column widths at once. Measured on level 3 with four
  holdings: five columns, 715 of 1,180 pixels painted, 61 percent. Level 1 with
  its single stock is the floor of this at 27 percent, which is two columns as
  wide as the rule allows. Nothing about the dollar scale or the flat unit rules
  moves: a wider column is a wider slab and never a taller one.
- **The wedge numbers moved out of the dial and the darts moved off the names.**
  The numbers sat at 0.93 of the radius, which is exactly where the darts land,
  so on level 3 the 7 came down under a dart beside "Johnson & Johnson". The open
  dial now carries a 26px ring of warm ground outside itself and the numbers live
  on that ring, clear of every dart and every name; the rail keeps its numbers
  inside, because its darts are packed into rows and its dial has no room to
  spare. The dart band tightened from 0.67 to 0.93 down to 0.72 to 0.90 and the
  name block pulled in from 0.54 to 0.50, which leaves about fifteen pixels of
  clear ground between the far corner of a two line name and the nearest dart
  tip.
- **The dial takes the middle of what it is given.** It used to hang from a fixed
  forty pixel top margin, which was invisible while the board owned the whole
  stage and became seventy five pixels of empty panel the moment the troop took a
  band off the top. Centred and re-measured, the level 3 dial draws at a 297px
  radius under the troop, against 345 before the troop and 261 if it had kept the
  old margin.
- **Level 1's calendar fills its card.** Twenty four cells 96px tall pinned 96px
  from the top left four hundred pixels of empty panel under them. The strip of
  months now takes a third of the height it is given and stands in the middle of
  it, with the stock's name above.
- **The mix, to the reviewer's numbers.** The dart thock is a triangle rather
  than a square and peaks at 0.035 rather than 0.055, because a square's odd
  harmonics turned thirty landings in two seconds into a buzz. A master
  `GainNode` at 0.8 sits between every note and the destination, built with the
  context and never rebuilt, so overlapping thocks cannot sum past a ceiling and
  there is one place to reach for if the game ever needs to duck itself. Both
  rank reveal figures peak at 0.08, more than twice a dart, which is what makes
  the one sound that says how the round went stand clear of the settle pour
  running under it. Every other parameter and every counter is untouched:
  `played` and `attempted` still count exactly what they counted.
- **The six red checks in the walk are a page gate the walk does not know about.**
  `F`, `H`, `J`, `K`, `N` and the screenshots all fail with the same
  `page.click: Timeout 15000ms exceeded`, and all six are clicking Buy 5 or Buy
  max straight out of `openRound`. The page now opens the round with nothing
  focused and disables the trade buttons until a wedge is picked, and
  `monkeycheck.mjs` never picks one. Proved rather than assumed: a copy of the
  walk with one wedge click added to `openRound` and nothing else changed runs
  all thirteen checks green against this stage, including `F` at 28 live frames
  with 98 ties held and `H` at 10 ticks of 15.2px on a scale that never moved.
  The copy was deleted. The walk needs the pick, not the stage.

- **The board's figures are labelled, "open $102" rather than "$102".** The
  rail legend and the open dial were printing the price at the window's open as
  a bare number while the trade row a few inches away read "Apple now $30.12",
  and two figures for the same company with only one of them named reads as two
  live prices. The word is written once, in `openPriceText`, and used by the
  dial, the rail legend and level 1's calendar title, all at 13px. It fits at
  ten wedges: the tightest box is the open dial's label, 84px of arc at
  `LABEL_AT`, and the longest line the word makes there is "open $30.12" at
  77px, so nothing was dropped and the dial keeps the word. Measured on the
  level 3 open at 1440x950, every one of the ten labels draws inside its wedge.
- **The rail legend's ten rows are tight, and this did not change it.** At ten
  stocks the row height floors at 26px while a name and its price line want
  about 29, so the price sits a little below its row's focus pill. It was that
  way before the word was added and the word does not widen a row; logged for
  whoever next touches `boardLayout`'s rail branch.

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
- **Buy ticks are capped at twelve per buy.** Buy max on a cheap stock would
  otherwise tick for many seconds, so `runTicks` clamps the run to
  `MAX_TICKS` regardless of shares bought.
- **The header's rank line rendered at 18px instead of section 9's 28px.**
  `[data-beaten]` now reads `SIZE.rank` at `WEIGHT.heading`, still tabular and
  still green at five or more beaten. The header row's height did not need to
  change: 28px text fits inside the existing 44px `HEADER_H`, so `topH` and the
  strip's 64px guide headroom are untouched and the chart stays exactly the
  bottom third.
- **The fix round after the first HOLD starts here.** Six findings, all in
  `src/pages/Monkey.tsx`, plus one ask each for the stage team and the harness.
- **Every round dealt from a button pins itself in the url.** `dealPinned()`
  wraps `openRound` and writes `?level=&seed=` with `setSearchParams(...,
  { replace: true })`, so Throw on a level card, Play again and Next level all
  leave the address bar reading the round on screen and a reload reproduces it.
  Replace rather than push, because a back button full of dealt rounds is not
  navigation anyone asked for; other params ride along, so a walk's `turbo`
  survives a Play again. Levels still strips both keys, as before.
- **The page tells its own writes apart from a player editing the link.**
  Writing the params runs the pinning effect again, which would deal the round
  a second time and throw the darts over a round already being played.
  `lastDealtRef` holds the last `level|seed` this page dealt, set inside
  `openRound` itself so both paths fill it, and the effect returns early when
  the params it reads are its own. An edited url still re-deals, because the
  key it carries is one the page never wrote.
- **Board levels open with nothing picked.** `openRound` focuses
  `d.tickers[0]` only when the level's target is the calendar. On levels 2 and
  3 the focus opens empty, all six trade buttons are dark, and the trade row
  reads "Tap a wedge to pick a stock" in muted 16px. Pre-focusing Apple made
  one click of Buy max the dominant play on level 3 and turned the board into a
  decoration; the board is the level's whole choice, so the round now waits for
  it. Level 1 keeps its focus: a calendar has one stock and nothing to pick.
- **Two things follow from an empty focus, and both are handled.** The play
  chart draws the focused stock, so with nothing picked it shows the same line
  of copy centred in the chart's own slot rather than a Chart handed an empty
  series, which would ask `Chart.tsx` to label an axis with no months on it.
  And the end card's chart is a reveal rather than a trade surface, so it falls
  back to the biggest position the player ended on, or the first wedge if they
  held nothing, which is what keeps real years on the end axis after a round
  played without a single pick.
- **The trade row's price line reads "Amazon now $88.83".** "at $131.88" sat
  next to the rail's opening price for the same stock with nothing to tell the
  two figures apart. This half is the page's and is fixed; the other half is
  the stage team's, below. The line moved from 14px to 16px so the hint and the
  price read at one size in one slot.
- **Ask for the stage team: label the rail's figure as the open.** The board's
  legend prints `priceText(openPrices[i])` inside `Board.tsx` (the wedge label
  block around line 543, and line 425 for level 1's calendar title), and
  `BoardProps` carries `openPrices` as numbers with no label prop, so the page
  cannot pass "open $102" through. A wedge currently reads "1 Apple $102" while
  the trade row reads "Apple now $30.12": two prices for one stock, neither
  labelled. Asked rather than edited, per this round's ownership.
- **The level cards' proves line takes a full stop** to match its own heading,
  added at the render rather than in `LEVELS[id].proves`, which is the rules
  team's table. The locked line is left as section 12 writes it, without one.
  The best-score row's height is now reserved by `minHeight` alone: the
  transparent "." that held it was invisible to a reader and a stray full stop
  to anything that copies the card's text.
- **Audio is armed on the Throw click itself.** The window-level arming
  listener fires on the same gesture, but ordering it against the first dart of
  a round opened from a level card is not something the page should be guessing
  at, so `dealPinned` calls `armAudio()` before it deals. A card-opened round
  now plays all ten thocks, verified by `window.__monkeySound.played.dartThock`
  at the end of the throw. A cold deep link still has no gesture to arm on and
  stays a known debt.
- **The rank line's green waits for a monkey to be in the market.** Level 1's
  troop sits in cash until each monkey's own buy month, so "you beat 10 of 10"
  is honest and stays, but it is not a win worth colouring: the green now needs
  `deal.monkeys.some((m) => m.buyMonth <= run.t)` as well as five beaten. On
  board levels every buy month is 0, so nothing changes there. Walked at
  1440x950: on one level 1 seed the header read five or more beaten from month
  0 and stayed ink until month 3, which is the earliest dart's month.
- **`tools/monkeycheck.mjs` needs a wedge tap before it trades on levels 2 and
  3.** The walk clicks `[data-action="buymax"]` straight after Start, which
  Playwright now waits on until it times out, because the button is correctly
  dark until a wedge is picked. Six checks fail on that one cause:
  `F_strip_order` (line 454), `H_desk_rules` (597 and 629), `J_no_year_in_play`
  (764), `K_guide_four` (805), `N_type_contract` (1025) and the screenshot pass
  (1050). The fix is one line before the first trade on any board level, taking
  the wedge from the DOM the walk already reads:
  `await page.click('[data-wedge="' + wedges[0] + '"]')`. Left to the harness
  owner rather than edited mid-round. `I_chart_third_rail` failed the same run
  for a different reason, an end card with no year on its axis, and that one
  was the page's: it is the end-card fallback above, and the check passes now.

- **The strip's headroom is the strip's own number, imported.** `GUIDE_ROOM =
  64` in `Monkey.tsx` was a second guess at a number `Strip.tsx` already
  exports as `STRIP_GUIDE_ROOM = 24`; the page now imports it, per the stage
  team's note, and there is one number instead of two. Measured at 1440x950 on
  level 3: the chart is still exactly 317px of 950, because it is
  `round(viewH / 3)` and never depended on the guide room, and the bubble's top
  edge sits at 98px against a clock whose bottom edge is 51.5px, so the line
  clears the header by 46px and still hangs inside the strip's own panel. The
  forty pixels the strip band gave back went to the desk, which is where the
  round is read.
- **The walk taps a wedge, and now says so out loud.** `openRound` takes a
  `pick` option, true by default, and calls a new `pickWedge` on levels 2 and
  3; level 1's calendar is one stock and opens focused, so it is left alone.
  The tap lands on the wedge's own `path.mk-face` rather than on its group,
  whose bounding box takes in the label and the chip and whose middle is not
  always inside the slice, and it is only believed once exactly one wedge
  reports `data-wedge-focus="1"`. `A_seed_pins_dom` now reads the untouched
  open before anything is tapped: level 3 lays out ten wedges, no wedge is
  focused, every trade button is dark, and one tap turns the three buys green
  and leaves the three sells dark with nothing held. Level 1 is held to the
  opposite claim, that its buys are live at the open.
- **`T_open_troop` is new.** All ten monkeys stand over the board at the round
  open on every level, numbered 1 to 10, each one drawn inside the window and
  each one carrying a face, and the guide's line is on screen once the darts
  are down. The bubble fades on its own after about four seconds, so it is
  polled for rather than read once, and the page's own `data-guide-count` is
  held against it as the reading that cannot be missed by arriving late.
  `Troop.tsx` already carried `data-troop-monkey`, so the stage was not
  touched.
- **The level 3 end card's guide line sits below the fold at 950px.** With two
  death lines under the chart the persisted line is half under the button row
  on a 1440x950 window. The end card is its own `overflow-y: auto` column, so
  the line is a scroll away rather than lost, and nothing in this pass moved
  it. Noted rather than fixed.
- **The level 3 end card's guide bubble is fixed, not just noted.** The scroll
  body was already sized right (`overflow-y: auto` on a `flex: 1` column
  against a `flex: none` button footer below it, the same shape as The
  Floor's debrief card); what did not fit was the content, 24px taller than
  the 842px it had at 1440x950 with two death lines under the chart. Tightened
  the card's own rhythm rather than the button row: the end-card column's gap
  10px to 8px, the strip's wrapping card's padding 10px to 6px, and the
  revealed chart 208px to 180px (`END_CHART_H`, with `Chart` handed
  `END_CHART_H - 16` as before). That drops the seed-7 level-3 total to 806px
  against the 842px available, so the guide's bounding box clears every
  button's by 56px and reads with nothing to scroll to. Walked headlessly:
  `getBoundingClientRect` on `[data-guide-line]` against the three action
  buttons reports no intersection and the bubble's own box sits entirely
  inside the viewport.
- **A zero-investment win no longer cheers.** Level 3's bust windows let a
  player who never enters the market beat five monkeys and see "You spread
  out and it worked" over a cheering troop and confetti, which reads as a
  strategy paying off rather than as three baskets happening to break. The
  guide's line is spec copy and stays keyed to the rank exactly as before;
  only the mood changed. `ending` now carries `neverInvested`, true when
  `monthsHolding(run)` is exactly zero, and the end card's `Strip` gets
  `mood={ending.neverInvested ? null : ending.win ? "cheer" : "slump"}`.
  `Strip.tsx` was not touched: a null mood already falls through to `idle` on
  every monkey and skips the confetti block, both by its own existing
  fallback chain. Walked across twelve level-3 seeds, Start clicked with no
  wedge ever tapped: every one read `data-strip-mood=""` with no
  `[data-confetti]` in the DOM, win or lose. A seed played normally (wedge
  picked, Buy max, held to the end) still reads `data-strip-mood="cheer"`
  with confetti present, so an earned win is untouched.

## Decision taken: level 3 deals a nine wedge board

**The question was whether level 3 could prove "spreading beats picking" on a
ten wedge board. Measured, it could not, so it does not any more.** The board is
ten wedges only while eToys is still trading, which ends in April 2001, so every
ten wedge window was a 36 month slice of the fall itself. Over all fifteen of
them, 200 seeded troops each, the index ended between 0.59x and 1.03x, a
cash-only player beat a mean of 3.83 to 9.87 monkeys, and cash unlocked the
level on 31.5 to 100 percent of troops. The rule levels 1 and 2 carry would have
needed cash unlocking on at most one troop in ten, which no ten wedge start came
near, and spreading was no better than picking against the troop there: a three
wedge spread unlocked 52.8 to 59.0 percent of troops against 37.1 to 65.5 for
going all in on a single wedge.

The nine wedge reading of section 3 was measured the same way, over the windows
that still cover September 2002 and still kill WorldCom inside themselves. The
index ends between 0.92x and 1.58x, the median monkey holds $1,078 to $1,717,
cash unlocks on 0.5 to 27.5 percent of troops, spreading beats picking on the
troop in sixteen of the eighteen windows, and the tenth percentile spread is
worth $660 to $997 where the tenth percentile single wedge is worth $0 to $17.
Spreading survives what picking does not, and cash no longer walks the level.

**What was implemented.** Level 3's windows are chosen by three clauses, all
computed from the data: the board is every company alive at the open, which is
section 3's own rule and leaves nine wedges once eToys is gone; the window
covers the file's worst index month, September 2002, so the end card's "that was
the dot-com bust" stays true; and a cash-only player unlocks the level on at
most one troop in ten, measured over 120 seeded troops a start with the same
darts, the same equal split and the same whole-share rule the deal itself uses.
Nine windows survive, July 2001 through September 2002. The audit runs once,
lazily, memoised by era and window width: eight milliseconds on the first level
3 deal and nothing after it. The wedge count is carried into the level card and
the guide's open line by `boardSizeOf()` rather than written down, so the copy
counts the board it was dealt.

**The reason it is nine and not ten.** Section 3 asks for both "the whole board"
and "companies already at zero when the window opens are not on the board", and
on this file those two sentences disagree from April 2001 on. Keeping ten wedges
meant keeping a window where the lesson is false. Keeping the lesson means
counting the board. Section 12's copy table row, "Level 3. Ten stocks.", is
superseded by that count; the level card now reads "Level 3. Nine stocks." and
the guide opens with "Nine wedges. We each threw three darts and spread out."

**The revert path is one constant.** `CASH_UNLOCK_LIMIT` in
`src/lib/monkey/round.ts` is the bar. Raising it to 1 drops the lesson clause
and hands level 3 every window that shows the bust, boards of eight to ten
wedges, with cash unlocking most of them: the copy follows the count on its own,
so nothing else has to move. The ten wedge only variant, `fullBoardStarts()`, is
in git at commit aafac8c if the whole board is ever wanted back.

**Level 3 is no longer proposed for locking.** It ships in the ladder with the
other two, and `?level=3&seed=` still opens any round directly for evaluation.

## Known debts

- The guide's end line is keyed to the rank outcome, per spec section 8, so
  a level 2 player who never sold can read "Selling in a crash locks the
  loss in." Keying the line to what the player did is a spec change for
  Marlon.
- Level 1's live rank is flat for the first half: every monkey is worth
  exactly $1,000 until its buy month, so a player one dollar up beats all
  ten. Inherent to the calendar design in section 3.
- Level 2 has three wedges and two darts, so only six baskets exist and the
  ten monkeys average about five distinct worths; several faces show the
  same number. Inherent to section 4's dart counts.
- Once worth grows several times, the shared dollar scale eases down until a
  $10 tick is under three pixels and the desk bands cash in tens; at very
  small cash balances the tick draws as a hairline. Same rule as The Floor.
- A round keeps its state in memory only; a reload during the sixty seconds
  loses it. Sixty seconds is short enough that this was not built.
- A deep-linked round (cold URL with seed) plays the first dart thocks
  before any gesture has armed audio, so they are silent by policy.
- The raw sprite sheets (about 4 MB) sit in public/monkey/ for the record
  and ship with the site; nothing references them at runtime.
- The dart monkeys beat the index by several times on rising windows, which
  is the real history of these files, not the Forbes claim that darts land
  near the index. A wider stock universe would close that gap.

## House bar

First review: HOLD. Mechanics green (chart 317 of 950 on every frame, strip
order exact on 353 frames with no duplicate x, no year leak, dollar scale
bit-identical across trades, one monkey's worth recomputed by hand to the
cent, fourteen guide lines byte-identical to the spec), but the dealt
windows could not carry the levels' lessons: level 3 dealt eight or nine
wedges on three seeds in four while the copy said ten, a dot-com window
with no bust was still named the bust, level 1's falling windows made the
cash-sitting monkey the winner, and level 2's 2020s window dealt Tesla at
17x. Also: no monkey on the open screen, tie glyph under the feet, an
empty stage, stale URL after Play again, a harsh square-wave thock with no
master gain. Fix round dispatched to three teams; second review below.

Second review: HOLD on one new finding, fourteen of the fifteen closed and
the desk density partly. Sound mix approved for default-on (quiet triangle
thock, one master bus, the rank reveal the loudest thing and clear of the
pour). Statistics off round.ts over 120 seeds a level: level 3 deals ten
wedges on every seed and every window covers 2002-09; level 1 rises on
every seed and the best monkey bought in the front half 90 of 120; level 2
has no wedge over 5x and no monkey over $3,000; doing nothing unlocks
level 2 on 0 of 120 seeds. The new blocker: the ten-wedge windows are by
construction the deepest bust windows, so on level 3 a player who never
trades beats a median of nine monkeys and unlocks 80% of seeds, and the
card can celebrate a player who never entered the market. Ten live wedges
and a window that reaches the recovery cannot both be had on the dot-com
file. Third pass below.

Also from the second review: acceptance test H's phrase "one dollar scale
that never moves on a trade" is stricter than section 6, which lets the
scale ease down when a column would overflow; a Buy 5 concentrating
dollars into one column can ease it. The desk follows section 6 and The
Floor verbatim; the test's wording is the looser of the two and the walk
samples a trade that does not overflow.

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
