# Jared and Nick's feedback on the timing games (Aug 20 2026) and the Monkey Trade direction

Context: Marlon presented Trigger and The Floor (shipped overnight Aug 20,
`docs/overnight-aug20-report.md`) to Jared and Nick. Jared liked the
simulation model and asked for a more visual, leveled game on top of it.
Marlon's direction from this: a new game on the same tape engine, built off
The Floor's mechanics, with Tally's gamification feel and a monkey-darts
framing. This document keeps the raw input verbatim and then a distilled
summary. The spec that follows it is `docs/monkey-spec.md`.

## Jared, verbatim

> Hey Marlon, great to catch up today. Thanks for continuing to hammer away
> at this and try different things. I really like the new stock market
> simulation model you presented. As I mentioned, it would be great to see:
>
> Extending this visually into something more colorful and visually
> enticing (perhaps the history graph on top could be demoted to the bottom
> 1/3 of the screen.) I would explore a few different visual directions
> here. Perhaps give it references to existing games like Candy Crush or
> Duolingo or to the Robinhood UI.
>
> Develop distinct levels / challenges within the game. For now, aim for
> the three levels starting with just cash and one stock to trade. Level 2
> has 3 stocks. Level 3 has 10 stocks.

## Meeting notes, verbatim from Marlon

- we'll build off of the Floor game
- maybe # of stocks as the level, start with 1 and by the end you have so
  much to pick from etc.
- nick: what are the learning outcomes, educational outcomes. how can we
  reveal them through progresive disclosure - not showing everything at
  once, not being a tutorial, and not being like this is a stock...?
- games either have a time limit or a space limit - this game is probably
  time based
- financial life system - investing through the ages - Nick's idea
- explore Robinhood's UI, their microinteractions, how they make trading so
  addictive with their design patterns
- current game maybe too minimalistic

## Marlon's direction, verbatim

> so based off of this, I want to see if we can take some of the
> gamification stuff that we did with Tally (sound, great UI, great feel)
> and apply it to here. I like the idea of can you beat the monkeys (Monkey
> Trader) or something for the name Monkey Trade - inspired by any monkey
> beating the hedge funds
>
> https://www.forbes.com/sites/rickferri/2012/12/20/any-monkey-can-beat-the-market/
> by throwing darts
>
> so maybe it shows you how many monkeys you beat at the end of each round,
> at the start of each round, maybe three monkeys randomly throw their dart
> at stocks and you have to choose your own and then trade actively while
> they just sit in the three stocks they threw at? monkeys guide you through
> the game like the similar tutorial with the pig (use gpt via our cracked
> openrouter key to generate the darts/monkeys) maybe monkey in a suit?
>
> we should probably start a new game for this using the same engine though

## Distilled

What is being asked for, in priority order:

1. **A new game, same engine.** Monkey Trade (working name) lives beside
   Trigger and The Floor, on `src/lib/tape/` as it stands. The Floor's
   mechanics are the starting point: a desk, sized trades, real eras, gates,
   a settle, a debrief.
2. **Levels by stock count.** Level 1 is cash and one stock. Level 2 is
   three stocks. Level 3 is ten. Difficulty is the width of the choice, not
   the speed of the tape.
3. **The monkeys are the opponent and the guide.** At the start of a round,
   monkeys throw darts at the board and each sits in the stock the dart hit
   for the whole round (the Forbes framing: random picks that beat the
   professionals). You trade actively. At the end the round tells you how
   many monkeys you beat. The monkeys also carry the tutorial voice, the way
   the Piggy does in Tally, and they are rendered art, generated through the
   OpenRouter image pipeline `tools/gen_sprites_gpt.py` already uses.
4. **Visual direction, not minimalism.** Colorful and enticing, with the
   price chart demoted to the bottom third and the portfolio or the board
   taking the top. References to explore: Candy Crush, Duolingo, Robinhood
   (its microinteractions and why trading there feels addictive). Several
   visual directions, not one.
5. **Tally's feel.** Synthesized sound on every moment that already has a
   motion, the tactile UI, the sense of juice. `src/lib/tally/sound.ts` is
   the pattern.
6. **Learning outcomes through progressive disclosure.** Nick's question.
   The game has to teach something and reveal it as you play, without a
   tutorial and without "this is a stock" captions. Time-limited rounds,
   since this is a time game.
7. **Parked but noted.** Nick's "financial life system, investing through
   the ages" is a bigger frame that could hold levels later; it is not in
   this build.

What is settled by the existing contracts and does not reopen:

- The tape engine's rules: whole shares, conservation, baselines computed
  from the same series, seeded headlines with computed truth.
- The type contract in `docs/clean-type.md`. Color and juice are welcome;
  mini caps, monospace, and slop fonts are still banned.
- Real era data used exactly as it is.

What is open and needs Marlon's answers before a spec can be written is
worked through in the question rounds that produced `docs/monkey-spec.md`.
