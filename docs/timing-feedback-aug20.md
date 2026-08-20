# Elijah's timing-game feedback (Aug 2026) and the pivot off Coins

Context: after three rejections and the Coins sketch round, Marlon showed the
suite to Elijah. Marlon's direction from this: "orb one's mechanics, but with a
UI where you are trying to time the market based on the stock price and news
headlines scrolling by." He does not really like the coins. Two in-depth specs
for a trading game follow, integrating Jared's three-rule criteria
(`docs/coin-stacks-feedback-aug19.md`).

## Elijah, verbatim from the thread

- "They said they hated the orb because it's hard to conceptualize growth with
  3D objects" (Marlon relaying playtesters)
- "It's not even 3d"
- "Orb game's mechanics are the best IMO b.c. they're realistic and you can
  make money by timing market"
- "Just unlikely"
- "I think a game where you have realistic stock data, and AI generated
  headlines (random each time), but conflicting (as in real life, ie, you
  can't just look at headlines) and you buy / sell would be good"
- "And at the end it compares to just holding"
- On representation: "Just numbers. X shares Y dollars. Are you supposed to
  represent it somehow?"
- "Represented as real-time calculator: AAAA shares X $YYY / share = $BBB Net
  Worth"
- "Stock price over time, net worth over time could be there in the corner but
  the main focus would be realtime net worth, historical stock price (ex start
  of sim to now, or just last week), and you would be pulling the trigger to
  buy / sell"
- "It would run very fast, so hard to keep up"
- "At the end it compares to just holding vs trying to time"
- "I'd try starting w. One stock"

Marlon's own notes in the same thread: one chart at a time, main stock in the
center, side tab with the other stocks, buy/sell in real time.

## What this changes

- The loop is Elijah's: a fast live tape, one focal stock, buy/sell under
  pressure, conflicting headlines you cannot trust blindly, and an end card
  that scores you against just holding.
- The mechanics are the Orb's (real era data, real prices, the engine exists);
  the 3D object representation is dead with this audience.
- Jared's three rules remain the representation criteria the specs must
  answer, but coins as an aesthetic are not required by them: the rules are
  about a unit = one share, unit size = price, growth as unit growth, and
  selling converting to fixed-size cash units.
