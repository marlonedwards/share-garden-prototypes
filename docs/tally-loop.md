# The Tally, the table build

Status: agreed with Marlon, 11 August 2026. This supersedes four parts of
`docs/tally-spec.md`: the four-region layout law (section 6), the always-visible
market strip (section 3.3's presentation, not its honesty rule), the shape of a
turn (section 4.1), and one clause of section 2, which says every card costs two
blocks. Savings costs one, for the reason given under the loop below, and every
other card in the game still costs two. Everything else in that spec stands in
full: the two-unit economy, the chapters and their calibrated targets, the
ceremony, the badges, the collector's box, and all seven reward-function rules
in section 8.
The visual contract is variant A on `public/sketches/tally-variants.html`,
lifted as literally as possible.

## One board

The whole game is a single board and there is still exactly one layout, but as
of 11 August it is sized desktop first rather than phone first: the board takes
the window it is given, up to 960 wide and about 1.05 times as tall as it is
wide, centered on the warm page like a cabinet screen. The wall keeps whatever
height the header, the stacks row and the footer did not claim, and a wider
board buys more columns of the same card rather than bigger cards. The 420 by
640 rule this section used to state is amended rather than deleted: a window too
narrow for that natural board still gets the natural board scaled down whole, so
nothing breaks on a phone, and small screen polish is a later pass.

## The loop: one thing on screen at a time

```
THE TABLE     wall, your stacks, cash, one button: "Play March 2007"
   |
THE RESOLVE   the scoring moment, in two acts. First the cards: the wall goes
              down a shade and holds still while each stack in turn lifts,
              takes its hit and shows one chip carrying both of its numbers,
              the blocks it moved and, small underneath, the move that did it.
              Then the wall: the months inside the span sweep past, the closing
              column assembles band by band in the order the cards just scored,
              the count ticks with the landing blocks, and the cash band and
              the stakes line settle last. Skippable, always.
   |
THE PAPER     only on turns where a dated moment fell: verbatim headlines
              plus one authored mood line reading the room, one sentence.
   |
THE TABLE     and the round ends here, on the chart. The finished column is
              standing, the read line and the stakes line have moved, and if
              anything was on deposit the bank's payment lands beside your
              money as its own beat: one line, one soft chime, nothing to tap.
   |
THE SHOP      when the player asks for it, from the Shop button. Payday plays
              on the first opening of a turn: the income blocks slide in
              before anything can be spent. Then every unlocked card at
              today's real price, buy with blocks, sell to the till.
              One button back to the table.
```

The shop no longer opens itself after a resolve, and that is the whole of this
change: a round ends where the player can see what it did, and going shopping
is a decision like every other one. A turn can be played without ever opening
it. A card type's debut still fires on the turn its type first stands on the
counter, because the counter is where it stands.

The shop hides nothing, ever: every card seen this run is in it at its real
price, and blocks are the only scarcity. A card costs two blocks, with one
exception: a savings card costs one, because a deposit is the purchase whose
size a person sizes a dollar at a time, and a bank balance is a pile of green
cards a player can count. A savings card's worth never moves in either
direction, so the line where a price would be carries the rate instead, and the
bank pays that rate into cash at the end of every turn on the savings held
through it. A miss still ends the run; the forensic report and unlocked start
points are unchanged.

Blocks are grouped in fives down a column and never along a row: a column is
counted upward so a small break every fifth block is a rhythm, while a row is
read along its length and a break in it reads as a missing block. The break is
the same few pixels in every column of a stage, so the groups line up as
horizontal seams across the whole record, and the built record sits on clean
panel with the rules and the schedule kept to the months not yet played.

A plan's income and its trades stand on the column the plan was made on, which
is the live one, and they stay there when the turn is played. That is what lets
the resolve start counting from the column already standing in front of the
player, and no block that was standing ever leaves without lifting.

The resolve is where the player's choices pay or cost, so it is itemised
rather than blended. `turnTally(run)` splits the wall's change into one
signed block figure per holding plus the cash band, through the same largest
remainder allocation the wall itself is drawn with, so the parts always add
up to the whole; `tallySchedule` turns those figures into the timings. A turn
whose span carries a front page opens on a beat of stillness with the field
dimmed, and is paced slower throughout; a turn where three or more names fall
together is staggered and voiced heavier. None of that invents a number: it
is only how long the true ones are given to land.

The chapter no longer labels itself illustrative: Marlon took the line off the
chapter card and the chapter tiles on 12 August, because an era chapter's
subtitle is the years it covers and an authored one needs no subtitle at all,
and the card level disclosures stay exactly where they were, on the dotted price
of every authored rate and every reconstructed series, which is where honesty
rule 6 is actually satisfied.

## Cards

- The face is minimal: name, ring, pip, the real price, and its own worth in
  blocks. No permanent percent line, no share count on the face.
- The flip side holds the rest: shares held, the move, and the card type's
  one definition sentence.
- A card type's first appearance pauses the shop once: the card large, one
  definition sentence (reuse the first sentences already written in
  `src/lib/fieldGuide.ts`), one button. Never again after that; the sentence
  lives on the flip side for whoever taps.

## Voice

No narrator and no character. The objects speak: definitions on card backs,
history in the paper, consequences on the wall. Every player-facing string is
one complete sentence in the course voice, and none is ever required reading
beyond the debut sentence.

## Sound

Small synthesized sounds where the juice lives: a tick per block landing, a
lower thud when blocks leave, a paper snap, a payday chime. One mute toggle.
Off by default until Marlon approves the mix.

## What this retires

The four-region page at `src/pages/Tally.tsx` and its landscape components.
The model layer under `src/lib/tally/` carries over whole, with additions
only (shop phase state, debut tracking, mood lines, resolve deltas).
