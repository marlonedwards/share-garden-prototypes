# Monkey Trade

Ten monkeys throw darts at a board and sit on what they hit. You trade. At the
end the game tells you how many monkeys you beat.

Contract for the prototype build. Shared engine: `docs/tape-shared.md`, used
exactly as it stands. Route `/monkey`. Feedback that produced this:
`docs/monkey-feedback-aug20.md` (Jared and Nick, Aug 20), and the decisions
below were taken with Marlon in the question rounds the same day. Ten word
pitch: **Ten monkeys threw darts. Beat them if you can.**

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
- A prototype. Three levels, the monkey loop end to end, generated monkey
  art, synthesized sound, two looks behind a toggle. Polish, more eras, more
  art, and Nick's "investing through the ages" frame wait for the next run.
- Jared's flat-unit rules still hold: a share is a slab, growth is thickness,
  cash is ticks, one dollar scale per view.

## 2. The round

- $1,000 cash every level. A round is a slice of a real era, 60 to 90
  seconds of tape at The Floor's speeds. Fresh cash each level; nothing
  carries, so levels compare.
- `?level=&seed=&look=` pin a round for walks and sharing. The seed fixes the
  window, the stocks, and every monkey's darts.
- The round opens paused on the board. The monkeys throw, then you place
  your opening trades with the normal buttons for as long as you like. Start
  runs the clock. You can keep trading all round. The monkeys never move.
- The round ends when the months run out. Everything sells at the last real
  prices with the pour, then the rank.

## 3. Levels

Difficulty is the width of the choice, never the speed of the tape.

| Level | Stocks | Era and window | Speed | What the rank proves |
| --- | --- | --- | --- | --- |
| 1 | 1 | The 2020s, a random 24 month window | 0.8 mo/s | Timing rarely beats holding |
| 2 | 3 | A crash: either the crash, 2007-10 to 2010-03, or the 2020s, 2019-10 to 2022-03 | 1.0 | Crashes are survivable if you stay |
| 3 | 10 | The dot-com bust, a random 36 month window, the whole board | 1.2 | Spreading beats picking |

- **Level 1.** One random stock from the 2020s file that a $1,000 player can
  buy at least five shares of at the window's open. Every monkey's dart lands
  on the only wedge, so the troop is ten copies of the holding baseline. Most
  players trade and finish behind monkeys who did nothing. That is the reveal.
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

- Ten monkeys in suits. At round open each throws its darts at the board:
  one dart on level 1, two on level 2, three on level 3. A dart lands on a
  wedge chosen by the seeded RNG; two darts on one wedge doubles that stock.
- Each monkey splits $1,000 equally across its darts and buys whole shares at
  the opening price, remainder in cash, then holds to the end. Its worth path
  is computed from the same series by the same rules as yours. Conservation
  and whole shares apply to monkeys exactly as to the player.
- The end rank: you and the ten monkeys sorted by final worth. "You beat 7 of
  10 monkeys." Ties go to the monkey.
- One monkey is the guide. It wears the suit like the others and speaks in
  short lines at four moments at most per level (section 8). The other nine
  are silent.
- The index baseline from the shared engine appears once, on the end card,
  muted: "An index fund: $1,142." It is not a monkey and it is not scored.

## 5. The board

The round open and the picker, and the second motif Jared asked to see.

- The stocks are wedges on a round board. Level 1 is one wedge, level 2
  three, level 3 ten. Each wedge carries the company name and the opening
  price.
- The throw: a short animated beat, darts landing wedge by wedge with a sound
  each, about two seconds for the whole troop. Darts stay pinned to their
  wedges for the round, so you can always see where the monkeys sit.
- Tap a wedge to focus it; the trade buttons act on the focused wedge. Your
  holdings mark the wedge with your own chip, sized by shares.
- Once the tape runs, the board shrinks to a rail along one edge, darts and
  chips still visible, and the stage takes over. Tap the rail to refocus; the
  tape never pauses for a focus switch.

## 6. The stage

Jared's ask, literally: the chart goes to the bottom third and the top two
thirds are your basket against the monkeys.

```
  Month 14 of 24            you beat 6 of 10      worth $1,184   cash $41
  +--------------------------------------------------------------+
  |  the rank strip: ten monkey faces and you, ordered by worth, |
  |  reordering live, each with its worth under it               |
  +--------------------------------------------------------------+
  |  your desk: flat-unit columns, one per holding, plus cash    |
  |  ticks, one dollar scale                                     |
  +--------------------------------------------------------------+
  |  the board as a rail        [Buy 1] [Buy 5] [Buy max]        |
  |                             [Sell 1] [Sell 5] [Sell all]     |
  +--------------------------------------------------------------+
  |  focused stock, line chart, year labels, live price chip     |  bottom third
  +--------------------------------------------------------------+
```

- **The rank strip** is the monkeys' presence during play: ten faces and your
  avatar ordered by live worth, sliding into new positions as prices move,
  each with its worth in tabular digits. You always know how many you beat.
  The end card is this strip, settled and celebrated.
- **The desk** is The Floor's flat-unit strip: countable slabs per holding,
  $10 ticks for cash banded in tens, one dollar scale set from the opening
  $1,000 and only ever eased down. Buys pour ticks into a column; sells break
  slabs back to ticks.
- **The chart** is Trigger's shared component, unmodified: focused stock
  from the window's first month, fixed x range, year labels always, y never
  scales down, trade dots. It is the bottom third and never more.
- **Phone**: the same parts stacked, rank strip on top, desk, rail as a chip
  row, trade buttons, chart at the bottom. Nothing behind a menu. Both
  viewports first class, neither primary.

## 7. The end card

In order, largest first:

1. **You beat 7 of 10 monkeys.** The rank strip, settled, your slot lit.
   Beating five or more plays the celebration; fewer plays the slump.
2. **You: $1,184.** Your final worth.
3. The best monkey and the worst monkey, each with its basket named in plain
   words: "Monkey 4 sat on Apple and Amazon: $1,391."
4. Three small stats: trades made, months in the market of months total,
   biggest single decision in dollars (the engine's best and worst decision
   from Trigger's decisions helper, reused).
5. **An index fund: $1,142.** One muted line.
6. The guide's line: the one idea this level proved, in plain words, in the
   guide's voice (section 8).
7. Buttons: Play again (new seed, same level), Next level when unlocked,
   Levels.

The era is named on the end card: "That was the dot-com bust, 2000 to 2003."
During play the month and year tick as in the other games.

## 8. The guide and progressive disclosure

Nick's question, answered by restraint. One monkey talks. It speaks at most
four times a level, one line each, never a caption, never a tooltip, never
"this is a stock". Each level adds exactly one idea and the rank is the proof.

| Moment | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- |
| Round open | We all threw at the same wedge. You can do better. | Three wedges this time. We each threw twice. | Ten wedges. We each threw three darts and spread out. |
| Your first trade | Bold. We are just sitting here. | Moving already. Most of us never will. | Picking favorites. We did not bother. |
| The crash month (level 2 only) | | Everything is falling. We are not going anywhere. | |
| End card, you beat 5 or more | You beat most of us by trading. That almost never happens. Try again and see. | You stayed in through the worst of it and came out ahead of most of us. | You spread out and it worked. Or you got lucky. Play it again. |
| End card, you beat fewer than 5 | Most of us beat you by doing nothing. Sitting still is harder than it looks. | Selling in a crash locks the loss in. We just waited. | A few random darts beat your picks. Spreading out is the trick. |

Lines are sentence case, plain words, no exclamation marks, no em dashes, per
`docs/clean-type.md`. The guide's lines live in `src/content/monkey.ts` so
they can be rewritten without touching code. The guide never interrupts the
tape: lines appear in the guide's slot on the rank strip and fade after about
four seconds.

## 9. Two looks, one switch

Marlon asked for Robinhood and Duolingo both, toggled. The prototype builds
both as themes over one layout, so the switch changes tokens and a handful of
shape rules, never structure.

| | Robinhood | Duolingo |
| --- | --- | --- |
| Ground | near black `#0B0E11` with white panels on the end card | warm white `#FFFBF2`, panels in soft color |
| Accent | one green `#00C805` for up, `#FF5000` for down, everything else neutral | chunky flat color, a green `#58CC02`, a gold, a sky blue, a red for down |
| Shapes | 8px radii, hairline borders, no shadows | 16px radii, thick bottom edges on buttons (the pressed-button look), no hairlines |
| Type | the system stack per clean-type, 400 and 600 weights | the system stack, 700 headings, larger sizes |
| Motion | quick, 150ms, confetti on a rank above five | bouncy, 300ms, the mascot reacts on the strip |
| The monkeys | the same sprites, smaller, on neutral ground | the same sprites, larger, on colored badges |

- A small switch in a corner flips the look, persisted in `monkey-look`,
  settable by `?look=robinhood|duolingo` for walks and sharing. Default is
  Duolingo, since the monkeys carry it.
- Both looks obey `docs/clean-type.md`: one typeface, no mini caps, nothing
  under 12px, sentence case. Color and juice are welcome; slop fonts are not.
- `UI_FONT` everywhere. No webfont.

## 10. Sound

Tally's pattern, `src/lib/tally/sound.ts`, copied to `src/lib/monkey/sound.ts`
and retuned. Synthesized, no audio files, muted by default with a toggle
beside the look switch, nothing under prefers-reduced-motion, no
AudioContext before a gesture.

| Moment | Sound |
| --- | --- |
| a dart landing | a short thock, pitch stepping up dart by dart |
| a buy | Tally's tick, one per slab poured |
| a sell | Tally's thud, softer |
| the settle pour | a descending run over the 1.2 seconds |
| the rank reveal | a rising three-note figure when you beat five or more, a low two-note when you do not |
| the guide speaking | one soft pop |

## 11. Art

Generated through the existing pipeline, `tools/gen_sprites_gpt.py`, model
`openai/gpt-image-1` via OpenRouter, key at `~/maju/.claude/openrouter.key`.
A new script `tools/gen_monkeys_gpt.py` produces, on transparent or flat
ground per the look:

- one suited monkey in five poses: idle, winding up to throw, cheering,
  slumped, talking. Same character, same suit, so the troop reads as ten of
  one kind; individuality comes from a tie color per monkey set in code.
- a dart, and a dart pinned in a wedge.
- the board: a round target with wedge dividers, generated once per wedge
  count (1, 3, 10) or drawn in SVG if the generated boards do not divide
  cleanly; the run decides and logs it.
- your avatar for the rank strip: a plain circle with your initial, not a
  monkey. You are the one who is not random.

Assets land in `public/monkey/`. The run reviews every generated image for
slop before use: no text baked in, no extra limbs, consistent suit, clean
edges. Reject and regenerate until clean; a reviewer signs off in the report.

## 12. Copy

| Where | String |
| --- | --- |
| Landing card | Monkey Trade |
| Landing description | Beat the monkeys who threw darts. |
| Level cards | Level 1. One stock. / Level 2. Three stocks. / Level 3. Ten stocks. |
| Level card button | Throw |
| Locked level | Beat five monkeys to open this |
| Round open button | Start |
| Rank, live | you beat 6 of 10 |
| End lead | You beat 7 of 10 monkeys. |
| End you | You: $1,184 |
| Monkey line | Monkey 4 sat on Apple and Amazon: $1,391. |
| Index | An index fund: $1,142. |
| Era reveal | That was the dot-com bust, 2000 to 2003. |
| Dead company | eToys went to zero. |
| Buttons | Start, Play again, Next level, Levels |
| Look toggle | Robinhood / Duolingo |

Sentence case, one phrase, no em dashes, nothing under 12px, no uppercase.
Monkeys are numbered one to ten, never named, in the prototype.

## 13. Files

```
src/pages/Monkey.tsx                 shell, level cards, the round, end card
src/components/monkey/Board.tsx      the dart board and its rail form
src/components/monkey/Strip.tsx      the live rank strip, the end-card strip
src/components/monkey/Desk.tsx       reuse The Floor's Desk if its props fit,
                                     fork only if they do not
src/components/monkey/Guide.tsx      the guide's slot and fade
src/components/monkey/Look.tsx       the look toggle and theme tokens
src/lib/monkey/round.ts              level table, windows, deal, monkey darts
                                     and baskets, rank, persistence
src/lib/monkey/sound.ts              Tally's module, retuned
src/content/monkey.ts                the guide's lines
public/monkey/                       generated art
tools/gen_monkeys_gpt.py             art generation
tools/monkeySim.ts                   node harness for the round rules
tools/monkeycheck.mjs                Playwright walk, both viewports, both looks
```

Route in `src/main.tsx`, a card on the landing, `/monkey` in
`tools/cleancheck.mjs` ROUTES. The chart is `src/components/trigger/Chart.tsx`
unmodified.

## 14. Acceptance tests

All at 1440x950 and 390x844, both looks, pinned seeds.

**A.** Same level and seed reproduce the same window, stocks, and every
monkey's darts and basket; a different seed changes them.

**B.** Every monkey's opening buy obeys whole shares and conservation; its
worth path equals a zero-trade run of its basket through the shared engine.

**C.** Level 1's ten monkeys all hold the single stock and each equals the
engine's holding baseline to the cent.

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

**I.** The chart sits in the bottom third at both viewports with year labels,
and the board shrinks to a rail when the tape starts without pausing it.

**J.** The look toggle flips tokens and shapes, persists, answers `?look=`,
and both looks pass the type contract.

**K.** The guide speaks at most four times a level, never while a sound of
its own is mid-play, and its end-card line matches the rank outcome.

**L.** Sound stays silent until a gesture, respects mute and reduced motion,
and every listed moment plays exactly once.

**M.** The generated art passes review: no baked text, consistent suit, clean
edges, and the five poses are distinguishable at rank-strip size.
