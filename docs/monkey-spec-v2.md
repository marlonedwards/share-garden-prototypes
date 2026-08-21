# Monkey Trade, version 2: the dart is the trade

Supersedes the stage, trading, and layout sections of docs/monkey-spec.md.
Kept from v1 unchanged: the shared engine (docs/tape-shared.md, read only),
src/lib/monkey/round.ts and tools/monkeySim.ts (levels, windows, the
nine-wedge level 3, seeded monkey darts, rank, persistence), the sound
module, the guide's lines, the art, the type contract (docs/clean-type.md),
desktop only at 1440x950, no year or era name visible during play.
Decided with Marlon, August 21. Principle: **your dart is your position.**

## 1. The loop

1. The board appears with ten monkeys above it. They throw one by one,
   thock by thock, darts pinned where the seed says. About two seconds.
2. Your turn. "Throw your darts." You have the same number of darts as a
   monkey. Click a wedge (or a month on level 1); your dart flies in and
   pins there. Each dart is one equal share of your $1,000 (one dart on
   level 1, $500 each on level 2, $333 each on level 3), bought as whole
   shares at that moment, remainder cash. Two darts in one wedge is a
   double position. Start is live once at least one dart is thrown; you
   may start with darts still in hand (cash).
3. Start runs the tape, 60 seconds. Under every pinned dart a pile of
   flat slabs shows what that dart is worth now, one dollar scale for the
   whole board. The rank strip across the top (ten faces plus you, sorted
   by worth) reorders live.
4. Trade whenever, two verbs only. **Pull**: click one of your pinned
   darts; it comes back to your hand and its shares sell at the live
   price into cash. **Throw**: click a wedge with a dart in hand; that
   dart's cash share goes all in there. Monkeys never touch theirs.
5. The round ends when the months run out. Everything settles at the last
   real prices, then the end card: "You beat 7 of 10 monkeys." and the
   reveal.

No Buy 1/5/max, no Sell 1/5/all, no side rail, no focus state, no board
that shrinks. The board is the game the whole round.

## 2. The three boards

- **Level 1, one stock: the clock.** The board is a ring of 24 month
  segments with the company name and open price in the centre and a hand
  at month one. Monkeys throw at months (one dart each, seeded as now).
  You throw one dart at a month. During play the hand sweeps; when it
  reaches a dart, that dart lights and its pile appears: that player has
  gone in, all in at that month's price. Before the hand reaches your
  dart you may pull it and re-throw at any month still ahead of the hand.
  Once in, Pull sells to cash and Throw re-enters at a month ahead of the
  hand, which the hand then reaches. Monkeys never move.
  The reveal: the monkeys who went in early and sat are at the top.
- **Level 2, three stocks: three wedges.** Two darts each. The crash
  month hits mid-round; the guide says its line; you decide whether to
  pull.
- **Level 3, nine stocks: nine wedges.** Three darts each. WorldCom dies
  mid-round; a dart in it watches its pile vanish and the wedge greys with
  "went to zero".

## 3. The screen, 1440x950, one fixed layout per phase

```
  Month 14 of 24                   you beat 6 of 10             worth $1,184
  [ rank strip: ten faces and you, worth under each, 96px tall          ]
  [                                                                      ]
  [   the board, a fixed 520px dial (or clock), darts pinned,            ]
  [   a slab pile under each dart; your darts in hand shown at the       ]
  [   left with "Throw" hint; the guide's bubble at the right of the     ]
  [   board                                                              ]
  [                                                                      ]
  [ Start / Pull hint row, 56px                                          ]
  [ chart strip, 200px: focused stock line, months on the axis, dots     ]
```

Fixed pixel sizes from a mockup, not fluid math. The chart strip shows the
stock under your most recent dart (level 1: the one stock); dots sit on
the line at the month they happened. Nothing scrolls. Nothing is drawn
twice. No scrollbars.

## 4. The pile (Jared's flat units)

Under each pinned dart: one slab per share, thickness = price on the
board's one dollar scale, seamed so they are countable; remainder cash as
thin ticks. A pull breaks the pile into ticks that fly to your hand; a
throw fuses them into slabs. One scale per board, set at round open from
$1,000 across the dart count, eased down only when a pile would overflow
its slot. The scale never moves on a trade.

## 5. The end card

Largest first, one fixed column: "You beat 7 of 10 monkeys." with the
settled strip; "You: $1,184"; best and worst monkey in plain words; three
small stats; "An index fund: $1,142."; the era reveal with the chart in
real years; the guide's line; Play again, Next level, Levels. Celebration
only when you beat five or more and were in the market at least one month.

## 6. The look

Tally-clean with the monkeys: warm white ground, ink text, one accent
(the sky blue) for your darts and focus, green and red only for worth
movement, gold only for the leader. Generous space, strict alignment, one
grid (20px gutter, 12px gap, 16px radius, 16px padding). The monkeys and
darts carry all the character. Type per docs/clean-type.md.

## 7. Acceptance, all at 1440x950 on pinned seeds

A to E and G as v1 (the sim). Plus, in the walk:
- F  strip order equals sorted worths every sampled frame; beaten equals
     the count below you.
- H  a pull turns slabs into ticks and cash rises by shares times price
     at the instant; a throw does the reverse; the scale is bit identical
     across both.
- I  every trade dot lies within 2px of the chart line; every dart's tip
     lies inside its wedge or month segment; exactly one board in the DOM;
     no element overflows its panel; no scrollbars on any phase.
- J  no year or era name during play; the end card names both.
- K  the guide speaks at most four times.
- L  sound as v1, plus one thock per player throw and one pull sound.
- N  the type contract, and cleancheck green on the route.
- P  level 1: a dart enters when the hand reaches it, not before; a
     pulled dart can only be re-thrown ahead of the hand.
