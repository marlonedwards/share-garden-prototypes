# Hold: the one-button daily market game

Status: draft for Marlon's markup, August 13. Nothing here is built.
Supersedes nothing; this is the first spec of the post-Tally direction.

## 1. What this is

A daily game with one button. Every player in the world gets the same hidden
stretch of real market history each day. You start the round already
invested. The tape plays. The button says SELL EVERYTHING. If you press it,
the round keeps going and the button becomes BUY BACK. That is the entire
control surface, plus a zoom.

The verb of this game is holding. Everything else in the design exists to
make that verb dramatic.

## 2. The laws (from the August 12 review and the August 13 rounds)

1. Fun first. Playable as a game by someone with zero interest in finance.
2. No metaphors. The chart is a chart, the dollars are dollars, the year is
   a real year. Nothing on screen stands for something else.
3. Readable in one look. A falling line, a big number, a red button. If a
   screen needs explaining, the screen is wrong.
4. No tutorial. The first round is the tutorial by being playable.
5. Freedom to fail. Selling at the bottom is always allowed, instantly
   executed, and never scolded. The consequence is the lesson.
6. Honest data. Every price is a real daily close. Headlines are real,
   dated, and always appear after the move they explain. Nothing the player
   does moves a price. No reward for prediction.
7. Real time. The tape ticks whether you act or not. Pausing is not offered.

## 3. The round

- You start with $10,000 already in the market. Not cash. The decision to
  invest was made for you; this game is about what you do next.
- A round is 90 real trading days of a hidden window from market history,
  played at one day per second. A round takes 90 seconds if you never zoom.
- The stage shows: the chart drawing itself left to right, your stake as one
  big dollar number, the day counter, and the button.
- What the window is (year, market) is hidden until the reveal. The chart is
  unlabeled: no dates, no price axis numbers, just the shape and your money.

### The button

- HOLDING: the button reads SELL EVERYTHING, big and red. Pressing it sells
  the whole stake at the current day's real close, instantly. The number
  freezes. A marker drops on the chart.
- OUT: the tape keeps playing. The button becomes BUY BACK, big and black,
  and shows the live price. Pressing it puts the whole stake back in at the
  current close. Another marker drops.
- The player can flip as many times as they want. No partial amounts ever:
  all in or all out, one decision at a time. Every flip is logged.
- There are no fees in v1. Whipsaw is the fee. A player who sells low and
  buys back high pays it in the only currency that matters here.

### Headlines

- Real archived headlines from the window appear as dated newspaper cards,
  always one to two seconds after the price move they describe, exactly like
  the real world's ordering. Reusing the verified headline engine.
- Headlines are scenery and temptation. They are never a signal that pays.

## 4. Zoom: the second input and the actual curriculum

The same data at different zoom levels is the whole lesson of this game.

- In-round zoom: scroll or pinch between three lenses on the SAME tape.
  - DAYS: the default. Every wiggle, every headline card. Scary.
  - MONTHS: the window so far plus the two real years leading into it,
    compressed. The current drop gets context. Calmer.
  - YEARS: the ten real years leading into today. The live tape is a
    twitching tip at the right edge. Most drops look like texture.
- Zoom never shows the future. Context is always backward-looking, so
  nothing is spoiled and nothing is predicted.
- Zoom is free and instant. The button works at every zoom level. A player
  who discovers they cannot press SELL while zoomed out has learned the
  entire subject, and nobody said a word.

### The reveal (every round ends by zooming out)

1. The window finishes. The year and market are named: "You were holding
   the S&P 500. This was September 2008 to January 2009."
2. Your markers replay: every sell and buy-back, with the dollar cost or
   save of each flip against holding through. Plain numbers, no adjectives.
3. The camera pulls back. Your 90 days shrink into the full decade, then
   into the half-century, your window a small marked rectangle on the long
   climb. Your result line and the held-through line sit side by side.
4. The end card: days held, final stake, result versus holding through,
   your streak, and (when telemetry exists) your percentile among everyone
   who played today.

Some daily windows are years where selling early won. The reveal reports it
straight. History decides who was right, never the designer.

## 5. The daily shell

- One window per calendar day, the same for every player, drawn from a
  hand-built calendar that mixes calm years, grinding years, and monsters
  (1987, 2000, 2008, 2020, 1929). No difficulty ramp tied to the player:
  the whole world plays the same day, like Wordle.
- One scored round per day. Replays of today are allowed but marked
  practice and never change your recorded result (freedom to fail includes
  the freedom to have failed).
- Practice mode, one quiet link: unlimited rounds on random windows.
- Streak = consecutive days played (not won; there is no "won").
- Share card: a strip of 90 tiny cells, colored held or out, plus the
  result line. Instantly recognizable, spoiler-light, Wordle grammar.

## 6. What repeated play teaches (the long-term answer)

- Era literacy. The daily calendar is a history course in disguise. Each
  revealed year joins a collection screen: a shelf of years survived, each
  with its one-line record of what it was. A month of daily play is thirty
  real market episodes lived, not read about.
- A behavioral mirror. Lifetime stats accumulate: average exit day, rounds
  held through, and one running number in dollars: what flipping has cost
  or saved versus holding, across all recorded rounds. The game never says
  panic seller. It shows a number and lets the player name themselves.
- Horizon wisdom. Streak milestones unlock longer round formats played at
  faster ticks: a full year in 90 seconds, then a decade. Same button, same
  rules. At the decade zoom the SELL button becomes almost funny, and the
  player feels the exact boundary where trading turns into investing.

## 7. Every Payday (the sibling, decided after Hold is playable)

Same shell, opposite verb: cash arrives on a payday rhythm, the one button
is BUY at today's real price, and the reveal prints your average cost
against the player who bought every payday. Whether it ships as game two of
the one-button suite or as a BUY-day mode inside Hold is decided by
playtest, not by this spec. The zoom reveal applies identically (your buy
dots on the century chart). One verb per game remains the suite's identity.

## 8. Build shape

- Route /hold. Desktop-first like Tally: one portrait phone-shaped board
  centered full screen, zoom on scroll wheel and on two quiet lens dots.
  Chrome (sound, back) lives outside the board. Phone polish deferred.
- Visual system: the Apple-light product language from the sketch page
  (public/sketches/next-games.html, sections 2 and 3 are the contract for
  look and copy voice).
- Data: daily closes. New bake: full-history S&P 500 daily series plus the
  windows the calendar needs, via the existing bake pipeline. Headlines
  from src/lib/headlines.ts, extended per window as needed.
- Model layer pure and UI-free (src/lib/hold/), one source of truth for
  stake math; the UI never recomputes it. Percentile and telemetry are
  localStorage-first like beta checks; a backend percentile lands later.
- Copy rules: no em dashes, no emoji, no jargon a kid would not know,
  read lines one short sentence.

## 9. Acceptance tests (the harness contract)

1. Stake math: hold-through result equals the window's real return to the
   cent; any flip sequence reconciles against the daily closes exactly.
2. The button executes at the current day's close, never a lookahead price.
3. Headlines never render before their move's day completes.
4. Zoom lenses never draw a single future day.
5. The reveal's flip costs sum to the difference between the player's
   result and the hold-through result, always.
6. A player who never touches anything finishes the round and reaches the
   reveal (playable by watching; the null strategy is legal and complete).
7. Practice results never write to the daily record or streak.
8. Every date, price, and headline in a shipped window exists in the
   historical record.

## 10. Open questions for Marlon's markup

- Round length: 90 days at 1 day per second, or shorter (60) for snappier
  dailies?
- Buy-back label: BUY BACK versus GET BACK IN.
- Does the daily calendar name the game's market as S&P 500 in-round, or
  stay fully unlabeled until the reveal?
- Streak-unlocked longer formats: v1 or v2?
