# Monkey Trade

Ten monkeys throw darts and sit on what they hit. You trade. At the end the
game tells you how many monkeys you beat.

Contract for the prototype build. Shared engine: `docs/tape-shared.md`, used
exactly as it stands. Route `/monkey`. Feedback that produced this:
`docs/monkey-feedback-aug20.md` (Jared and Nick, Aug 20); the decisions below
were taken with Marlon in the question rounds the same day and a hesitation
pass after. Ten word pitch: **Ten monkeys threw darts. Beat them if you can.**

The source of the framing is the Forbes piece Marlon linked, "Any monkey can
beat the market" (Rick Ferri, 2012): random dart-board portfolios beat most
professionals, because spreading money around and leaving it alone is hard
to beat. Every level of this game proves one piece of that by letting the
player lose to a monkey, or not.

---

## 1. What this game is and is not

- A new game beside Trigger and The Floor. Same tape engine, same era data,
  same whole-share money, same baselines. Nothing in `src/lib/tape/` changes.
- Built off The Floor's mechanics: sized trades (Buy 1 / 5 / max, Sell 1 / 5 /
  all), the flat-unit desk columns, the settle pour at the end of a round.
- No headline ticker and no gates. The monkeys are the only voice.
- A prototype, desktop only, one look. 1440x950 is the design target and the
  only viewport walked; the layout may not break at other desktop sizes but
  phone is explicitly out of scope until the next run. Duolingo is the look.
  Robinhood, phone, more eras, more art, and Nick's "investing through the
  ages" frame wait for the next run.
- Jared's flat-unit rules still hold: a share is a slab, growth is thickness,
  cash is ticks, one dollar scale per view.

## 2. The round

- $1,000 cash every level. A round is 60 seconds of tape over a slice of a
  real era. Fresh cash each level; nothing carries, so levels compare.
- `?level=&seed=` pin a round for walks and sharing. The seed fixes the
  window, the stocks, and every monkey's darts.
- The round opens paused on the board. The monkeys throw, then you place
  your opening trades with the normal buttons for as long as you like. Start
  runs the clock. You can keep trading all round. The monkeys never move
  after their opening buys.
- The round ends when the months run out. Everything sells at the last real
  prices with the pour, then the rank.
- **The year is hidden during play.** The clock reads "Month 14 of 24" and
  the chart's time axis reads months into the round (6, 12, 18, 24), so
  hindsight cannot drive the picks: a player who knows what 2008 did should
  not get to use it. The end card names the era and the years and the
  end-card chart carries real year labels. Time labels are on every chart at
  every moment either way, per the house rule.

## 3. Levels

Difficulty is the width of the choice, never the speed of the tape.

| Level | Stocks | Era and window | Speed | What the rank proves |
| --- | --- | --- | --- | --- |
| 1 | 1 | The 2020s, a random 24 month window | 0.4 mo/s | When you got in mattered less than staying in |
| 2 | 3 | A crash: either the crash, 2007-10 to 2010-03, or the 2020s, 2019-10 to 2022-03 | 0.5 | Crashes are survivable if you stay |
| 3 | 10 | The dot-com bust, a random 36 month window, the whole board | 0.6 | Spreading beats picking |

Speeds are set so every level is a 60 second round (24 / 0.4, 30 / 0.5,
36 / 0.6).

- **Level 1.** One random stock from the 2020s file that a $1,000 player can
  buy at least five shares of at the window's open. With one wedge the board
  cannot spread the troop, so on this level the monkeys throw at the
  **calendar**: each dart picks a random month inside the window, the monkey
  sits in cash until that month, goes all in, and holds to the end. Ten
  random entry points give ten different outcomes, and the player who trades
  in and out usually lands in the bottom half of them. That is the reveal.
- **Level 2.** Three random stocks from the chosen era, buyable at the open
  and alive through the window. The window always carries the crash and the
  recovery. Monkeys that sat through it recover; a player who sold at the
  bottom does not.
- **Level 3.** The dot-com file is the only era with ten assets, so the board
  is the whole file: Apple, Amazon, Microsoft, Cisco, Intel, Coca-Cola,
  Johnson & Johnson, Exxon, WorldCom, eToys. Companies already at zero when
  the window opens are not on the board; companies that die inside the window
  are the lesson. A monkey whose darts spread across three wedges survives
  eToys going to nothing; a player all in on it does not.
- Beat five of ten monkeys to unlock the next level. Replay any unlocked level
  freely. Best rank per level persists in localStorage `monkey-best`.
  Progress in `monkey-progress`.

## 4. The troop

- Ten monkeys in suits. At round open each throws its darts: on level 1 at
  the calendar (one dart, a buy month); on level 2 at the board, two darts;
  on level 3 at the board, three darts. A dart lands where the seeded RNG
  says; two darts on one wedge doubles that stock.
- Each monkey splits $1,000 equally across its darts and buys whole shares at
  the price of its buy month (the open on levels 2 and 3), remainder in cash,
  then holds to the end. Its worth path is computed from the same series by
  the same rules as yours. Conservation and whole shares apply to monkeys
  exactly as to the player.
- The end rank: you and the ten monkeys sorted by final worth. "You beat 7 of
  10 monkeys." Ties go to the monkey.
- One monkey is the guide. It wears the suit like the others and speaks in
  short lines at four moments at most per level (section 8). The other nine
  are silent.
- The index baseline from the shared engine appears once, on the end card,
  muted: "An index fund: $1,142." It is not a monkey and it is not scored.

## 5. The board

The round open and the picker, and the second motif Jared asked to see.

- The stocks are wedges on a round board. Level 2 has three wedges, level 3
  ten. Each wedge carries the company name and the opening price. On level 1
  the board is a calendar strip of the window's months instead, the single
  stock named above it, and the darts land on months.
- The throw: a short animated beat, darts landing one by one with a sound
  each, about two seconds for the whole troop. Darts stay pinned for the
  round, so you can always see where the monkeys sit.
- Tap a wedge to focus it; the trade buttons act on the focused wedge. Your
  holdings mark the wedge with your own chip, sized by shares.
- Once the tape runs, the board shrinks to a rail along the right edge, darts
  and chips still visible, and the stage takes over. Tap the rail to refocus;
  the tape never pauses for a focus switch.

## 6. The stage

Jared's ask, literally: the chart goes to the bottom third and the top two
thirds are your basket against the monkeys. Desktop 1440x950.

```
  Month 14 of 24            you beat 6 of 10      worth $1,184   cash $41
  +---------------------------------------------------+----------+
  |  the rank strip: ten monkey faces and you,        |          |
  |  ordered by worth, reordering live, each with     |  the     |
  |  its worth under it; the guide's line fades in    |  board   |
  |  beside the guide                                 |  as a    |
  +---------------------------------------------------+  rail:   |
  |  your desk: flat-unit columns, one per holding,   |  darts   |
  |  plus cash ticks, one dollar scale                |  and     |
  |                                                   |  chips   |
  |  [Buy 1] [Buy 5] [Buy max]  [Sell 1] [Sell 5] [Sell all]    |
  +---------------------------------------------------+----------+
  |  focused stock, line chart, month labels during play,        |  bottom third
  |  live price chip, trade dots                                 |
  +--------------------------------------------------------------+
```

- **The rank strip** is the monkeys' presence during play: ten faces and your
  avatar ordered by live worth, sliding into new positions as prices move,
  each with its worth in tabular digits. You always know how many you beat.
  The end card is this strip, settled and celebrated.
- **The desk** is The Floor's flat-unit strip: countable slabs per holding,
  $10 ticks for cash banded in tens, one dollar scale set from the opening
  $1,000 and only ever eased down. Buys pour ticks into a column; sells break
  slabs back to ticks. Reuse `src/components/floor/Desk.tsx` if its props fit;
  fork only if they do not.
- **The chart** is Trigger's shared component, unmodified: focused stock
  from the window's first month, fixed x range, time labels always (months
  into the round during play, years on the end card), y never scales down,
  trade dots. It is the bottom third and never more.

## 7. The end card

In order, largest first:

1. **You beat 7 of 10 monkeys.** The rank strip, settled, your slot lit.
   Beating five or more plays the celebration (the troop cheers, confetti in
   the look's colors); fewer plays the slump (the troop slumps, you included).
2. **You: $1,184.** Your final worth.
3. The best monkey and the worst monkey, each with its basket in plain
   words: "Monkey 4 sat on Apple and Amazon: $1,391." On level 1: "Monkey 4
   bought in month 9: $1,391."
4. Three small stats: trades made, months in the market of months total,
   biggest single decision in dollars (Trigger's decisions helper, reused).
5. **An index fund: $1,142.** One muted line.
6. **That was the dot-com bust, 2000 to 2003.** The era reveal, with the
   marked chart redrawn with real year labels.
7. The guide's line: the one idea this level proved, in plain words, in the
   guide's voice (section 8).
8. Buttons: Play again (new seed, same level), Next level when unlocked,
   Levels.

## 8. The guide and progressive disclosure

Nick's question, answered by restraint. One monkey talks. It speaks at most
four times a level, one line each, never a caption, never a tooltip, never
"this is a stock". Each level adds exactly one idea and the rank is the proof.

| Moment | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- |
| Round open | One stock for all of us. We each picked a random month to buy it and we will sit there. | Three wedges this time. We each threw twice. | Ten wedges. We each threw three darts and spread out. |
| Your first trade | Bold. We are just waiting for our month. | Moving already. Most of us never will. | Picking favorites. We did not bother. |
| The crash month (level 2 only) | | Everything is falling. We are not going anywhere. | |
| End card, you beat 5 or more | You beat most of us by trading. That almost never happens. Try it again and see. | You stayed in through the worst of it and came out ahead of most of us. | You spread out and it worked. Or you got lucky. Play it again. |
| End card, you beat fewer than 5 | Most of us beat you, and all we did was pick a month and sit. | Selling in a crash locks the loss in. We just waited. | A few random darts beat your picks. Spreading out is the trick. |

Lines are sentence case, plain words, no exclamation marks, no em dashes, per
`docs/clean-type.md`. The guide's lines live in `src/content/monkey.ts` so
they can be rewritten without touching code. The guide never interrupts the
tape: lines appear in the guide's slot on the rank strip and fade after about
four seconds.

## 9. The look

Duolingo, committed. Colorful, chunky, a mascot with personality, big
satisfying buttons, and everything the type contract allows.

- **Ground** warm white `#FFFBF2`; panels in soft tints of the accent colors;
  the desk band slightly warmer than the stage so the bottom reads as yours.
- **Color** green `#58CC02` for up and for your wins, red `#FF4B4B` for down,
  gold `#FFC800` for the rank lead and the celebration, sky `#1CB0F6` for the
  board and focus, ink `#3C3C3C` for text, `#777777` muted. Nothing is
  tinted by direction except what the palette names.
- **Shapes** 16px radii, thick bottom edges on buttons (the pressed-button
  look, 4px darker band that collapses on press), no hairlines, fills over
  borders.
- **Type** the system stack per `docs/clean-type.md`, 700 headings, 600
  buttons, 400 body, larger sizes than the dark games: body 16px, the rank
  line 28px, the end lead 40px. Tabular digits on every number. No mini caps,
  nothing under 12px, sentence case, no em dashes.
- **Motion** bouncy, 250 to 300ms with a small overshoot; the monkeys react
  on the strip (cheer when they pass you, slump when you pass them); the
  darts thock in with a squash; confetti on a rank of five or more.
- The chart keeps its one neutral line, here ink `#3C3C3C` on the warm
  ground, dots colored by side.
- `UI_FONT` everywhere. No webfont. Color and juice are welcome; slop fonts,
  letter-spaced labels, and uppercase are still banned.

## 10. Sound

Tally's pattern, `src/lib/tally/sound.ts`, copied to `src/lib/monkey/sound.ts`
and retuned. Synthesized, no audio files. **Sound is on** after the first
gesture, with a visible mute in the corner persisted in `monkey-muted`; Tally
started muted because its mix was unapproved, and this game's feel is the
point, so the house-bar reviewer judges the mix instead. Nothing plays under
prefers-reduced-motion, and no AudioContext is built before a gesture.

| Moment | Sound |
| --- | --- |
| a dart landing | a short thock, pitch stepping up dart by dart |
| a buy | Tally's tick, one per slab poured |
| a sell | Tally's thud, softer |
| passing a monkey on the strip | a small upward blip; being passed, a lower one |
| the settle pour | a descending run over the 1.2 seconds |
| the rank reveal | a rising three-note figure when you beat five or more, a low two-note when you do not |
| the guide speaking | one soft pop |

## 11. Art

Generated through the existing pipeline, `tools/gen_sprites_gpt.py`, model
`openai/gpt-image-1` via OpenRouter, key at `~/maju/.claude/openrouter.key`.
The pipeline paints on a flat ground, so sprites sit on badges or get their
ground keyed to the look's warm white; that suits Duolingo.

A new script `tools/gen_monkeys_gpt.py` produces:

- one suited monkey in poses: idle, winding up to throw, cheering, slumped,
  talking. **Generate each batch as one sprite sheet** (all poses in a single
  image, a grid) so the poses share one context and the character does not
  drift between generations; slice the sheet in the script. If five poses
  will not stay consistent, ship three (idle, cheer, slump) and log it.
  Individuality comes from a tie color per monkey set in code.
- a dart, and a dart pinned in a wedge.
- the board: drawn in SVG (wedge counts of three and ten must divide
  cleanly and carry live text), with a generated dart only. The level 1
  calendar strip is SVG too.
- your avatar for the rank strip: a plain circle with your initial, not a
  monkey. You are the one who is not random.

Assets land in `public/monkey/`. The run reviews every generated image for
slop before use: no text baked in, no extra limbs, consistent suit, clean
edges, legible at rank-strip size. Reject and regenerate until clean; a
reviewer signs off in the report.

## 12. Copy

| Where | String |
| --- | --- |
| Landing card | Monkey Trade |
| Landing description | Beat the monkeys who threw darts. |
| Level cards | Level 1. One stock. / Level 2. Three stocks. / Level 3. Ten stocks. |
| Level card button | Throw |
| Locked level | Beat five monkeys to open this |
| Clock | Month 14 of 24 |
| Round open button | Start |
| Rank, live | you beat 6 of 10 |
| End lead | You beat 7 of 10 monkeys. |
| End you | You: $1,184 |
| Monkey line, board | Monkey 4 sat on Apple and Amazon: $1,391. |
| Monkey line, calendar | Monkey 4 bought in month 9: $1,391. |
| Index | An index fund: $1,142. |
| Era reveal | That was the dot-com bust, 2000 to 2003. |
| Dead company | eToys went to zero. |
| Buttons | Start, Play again, Next level, Levels |

Sentence case, one phrase, no em dashes, nothing under 12px, no uppercase.
Monkeys are numbered one to ten, never named, in the prototype.

## 13. Files

```
src/pages/Monkey.tsx                 shell, level cards, the round, end card
src/components/monkey/Board.tsx      the dart board, the calendar strip, the rail form
src/components/monkey/Strip.tsx      the live rank strip, the end-card strip
src/components/monkey/Desk.tsx       only if The Floor's Desk must be forked
src/components/monkey/Guide.tsx      the guide's slot and fade
src/lib/monkey/round.ts              level table, windows, deal, darts, baskets,
                                     monkey worth paths, rank, persistence
src/lib/monkey/sound.ts              Tally's module, retuned
src/lib/monkey/look.ts               the palette and shape tokens
src/content/monkey.ts                the guide's lines
public/monkey/                       generated art
tools/gen_monkeys_gpt.py             art generation, sprite sheet and slicing
tools/monkeySim.ts                   node harness for the round rules
tools/monkeycheck.mjs                Playwright walk at 1440x950
```

Route in `src/main.tsx`, a card on the landing, `/monkey` in
`tools/cleancheck.mjs` ROUTES. The chart is `src/components/trigger/Chart.tsx`
unmodified.

## 14. Acceptance tests

All at 1440x950, pinned seeds.

**A.** Same level and seed reproduce the same window, stocks, and every
monkey's darts and basket; a different seed changes them.

**B.** Every monkey's opening buy obeys whole shares and conservation; its
worth path equals a zero-trade run of its basket through the shared engine,
entered at its buy month.

**C.** Level 1's ten monkeys hold the single stock from ten seeded buy
months, at least six of them distinct, and a monkey that bought in month one
equals the engine's holding baseline to the cent.

**D.** Level 2's window contains the crash month and a player who sells all
at the low and never rebuys finishes behind at least eight monkeys.

**E.** Level 3's board shows every dot-com company alive at the window's
open, a company dying mid-window shows "went to zero", and monkeys spread
across three wedges survive it.

**F.** The rank strip's order equals the sorted worths at every sampled
frame, and the live "you beat N of 10" equals the count below you.

**G.** Beating five monkeys unlocks the next level and persists across a
reload; fewer does not.

**H.** The desk obeys the three rules: buys pour ticks into slabs, sells
break slabs into ticks, one dollar scale that never moves on a trade,
countable units at round open.

**I.** The chart occupies the bottom third, carries month labels during play
and year labels on the end card, and the board shrinks to a rail when the
tape starts without pausing it.

**J.** No year or era name is visible anywhere during play; the end card
names both.

**K.** The guide speaks at most four times a level and its end-card line
matches the rank outcome.

**L.** Sound stays silent until a gesture, plays after one by default,
respects mute and reduced motion, and every listed moment plays exactly once.

**M.** The generated art passes review: no baked text, consistent suit, clean
edges, and the poses are distinguishable at rank-strip size.

**N.** The look passes the type contract: one typeface, nothing under 12px,
no uppercase or letter-spacing, sentence case throughout, cleancheck green on
the route.
