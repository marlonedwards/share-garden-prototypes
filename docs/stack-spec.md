# Stack (learn stocks daily) - spec v1

August 30, 2026. AGREED across six AskUserQuestion rounds with
Marlon. Supersedes fivehundred-idea.md and compound-idea.md as the
active direction. One line: Duolingo x NYT Games for investing.
Daily lessons pay practice money that buys real whole shares at real
prices, and the streak quietly teaches DCA.

## Marlon's six pillars

1. Real Duolingo mapping: each unit is an asset type, ending with
   alternative assets and income generation accounts.
2. Lesson end pays money, spent on shares of companies.
3. Social: see your friend's stack of stocks.
4. Streak: come back every day to buy or sell. Teaches DCA by
   accident.
5. Track cost basis.
6. Design bar: Orb and Tally were the best feeling UIs shipped.

## Product law

- UNIT LAW: one checker piece = one share. A piece is minted at
  purchase and stamped with the price paid, so every piece is a lot.
  WHOLE SHARES ONLY (settled): expensive stocks are saving-up goals,
  and the day you mint a $900 Costco piece is a moment.
- CENTS EXIST (settled): cash and prices carry cents ($75.40), only
  shares refuse to split. Change from a buy comes back as coins.
- Cash is bills: stacks of $1, $10, $20, $100.
- Prices are real daily closes. The market never waits for you.
  The demo runs a fast pretend clock; the real app moves once a
  market day.
- You can only buy what you have learned. Companies enter your
  buyable universe by appearing in lessons or arcade games you
  played.

## The tree

Units in order, each an asset type:

1. Single stocks
2. Funds and ETFs
3. Bonds
4. Dividend and income stocks
5. Real assets (REITs, gold)
6. Alternatives (crypto, collectibles)
7. Capstone: income accounts (HYSA, CDs, treasuries), money that
   pays you

Lessons are concept lessons, Duolingo item shapes (choice, match,
sort), 5 to 7 items and about two minutes each. Real companies are
introduced through play as examples and land in the field guide when
met. Early lessons feature affordable names first (Pfizer near $28,
Coca-Cola near $70, Nike near $75) so the first session ends in a
whole real share.

## App structure (settled round 5)

- Three tabs: LEARN (the tree), PRACTICE (the arcade, Guess the
  Stock first), PROFILE (your portfolio, your friends and their
  portfolios, field guide as a subtab).
- Buying happens at lesson end: after pay lands, a prompt offers up
  to three stocks met in that lesson, grayed if you cannot afford a
  whole share, tap to buy. The money chip at the top opens the
  Exchange anytime, and buy/sell also lives in Profile.
- New day opens straight to the tree, no ceremony. Overnight
  movement shows ambiently on chips and stacks.

## Economy

- Lessons are the only base paycheck. Nothing else pays just for
  showing up.
- Accuracy scaling per lesson: under 75% pays nothing; 75 to 99%
  pays base; 100% pays base plus a bonus, scaled. Numbers open,
  working figures: base $50, perfect bonus $10.
- Mastery: re-doing a learned lesson pays reduced; three perfect
  reviews masters it for a one-time bonus.
- Real yield: dividend stocks, bonds and income accounts pay their
  actual yields into your cash on schedule. Late game, the
  portfolio itself becomes the paycheck, which is the curriculum's
  ending said as a mechanic.
- Practice arcade: Guess the Stock first, more games later (this is
  the NYT Games half). First few plays a day pay small amounts,
  after that it keeps score for fun. Content never ends.
- Streak: any market action keeps it alive (lesson, buy, or sell).
  A streak freeze can be bought ahead of time with investable cash,
  and feeling that opportunity cost is deliberate.

## Portfolio

- Each holding is a stack of pieces. Tap a stack and the lots fan
  out, each piece showing what you paid. Header shows shares, average
  cost, worth: "4 shares, avg $212, worth $230."
- Selling means picking pieces off the stack, lot by lot.
- Worth chart runs over a dashed put-in line so deposits never read
  as growth.
- SETTLED Aug 31: the portfolio is a felt table of physical
  side-view chip stacks (StackMarket's desk, better graphics), cash
  as a banded bill stack beside them. Selling is tap-to-pick: tap
  pieces to outline them in white, the sell button totals the picked
  lots. Chosen over the StackMarket quantity slider.
- SETTLED Aug 31, word law: teach cards visual-only (word, picture,
  one line under eight words), no footer explainers anywhere,
  correct feedback 2 to 3 words (wrong keeps one bear line), lesson
  end numbers only.
- SETTLED Aug 31, plain language law (overrides brevity when they
  conflict): everyday words only, no trader shorthand or euphemism.
  "Buyers piling in" and "which lets you sleep" were rejected; the
  model sentence is "More people are buying the stock than selling
  it."

## Social

- Friends see everything: holdings, amounts, worth, day change,
  streak. It is all play money earned the same way, so full
  transparency is fair and the envy is useful.
- Demo ships with fake friends.

## Field guide

- A collection page of every company ever met, in lessons or arcade,
  with shares owned and the fact you learned. The Orb field guide
  idea, upgraded to also be the buyable universe.

## Design (settled rounds 5 and 6)

- Tally's game feel and springiness WITHOUT the cards: stocks are
  checker pieces, cash is banded bills. Physical, chunky, one focal
  point per moment, spring punches on the beats (answer lands,
  paycheck arrives, piece minted onto a stack).
- OWN TYPE CHARTER (exempt from clean-type, like Arrow): slab
  currency numerals for money and headings, so numbers read printed.
- Two mascots: a young BULL as the companion on the good beats, the
  BEAR appears when you get it wrong (and maybe on red days).
- PALETTE SETTLED: FELT TABLE (variant A of the look check). Cream
  checkers on baize, red checker for the current lesson, chunky
  drops, cream cards, slab numerals.

## Item types (settled after three interview rounds)

Marlon's law: CONCEPTS OVER NUMBERS, VISUALS OVER TEXT. No item
exists to make someone remember a figure or a definition. Long
text matching is out. Rejected along the way: price check, count
it out, ballpark, match the business, your call, order the story
(round one, number trivia); shelf it, fix it, ticker type, zoom
out, one share can, odd chart out (round two).

Every lesson opens with a TEACH CARD: one concept word, one visual
that shows it, one takeaway line (settled shape, as mocked).

DYNAMIC LAW (Marlon, Aug 30, after playing the first build: "way too
textual and not fun"): an item is a visual event, not a form. Four
mechanics carry every lesson, all four chosen by Marlon:
- COMMIT THEN WATCH: the answer triggers the outcome as animation
  (the crash falls and behaviors race, pieces gray out and drop,
  fee coins leak off the stack, piles fill while totals count).
- DO THE STRATEGY: perform the concept (tap four buys onto the
  chart, watch the replay price each one, see your average).
- LIVE TICKING: prices and charts move while you decide.
- PHYSICAL MONEY: pay ticks up as bills land, buys drop a minted
  piece.
Feedback is ONE LINE in a colored bar: correct auto-advances in
about a second, wrong pops the bear and waits for a tap, misses
still re-queue. No verdict paragraphs anywhere. Questions are
under eight words.

The kept check shapes, all mocked in sketches/stack-screens.html:

1. SPOT IT (the workhorse): concept named in the question, two
   visuals stacked, tap one. Marlon's template. Skins: volatility,
   growth vs hype, portfolio survival, fee drag, dividends.
2. FOLLOW THE DOLLAR: a $100 sale flows through the company
   (workers, suppliers, bank, taxes), tap where the owner stands.
   Ownership made visual: profit is what is left.
3. THE WHOLE PILE: two companies as piles of pieces, tap which
   whole company is worth more. Market cap without the words.
4. RIDE IT OUT: a crash, then three lines diverge by owner
   behavior (kept buying, froze, sold). Tap the one that ends
   highest. The DCA reflex.
5. NAME THE STRATEGY (Marlon's shape): charts with buy dots, find
   the strategy (steady monthly dots, one lump dot, peak-chasing
   dots).

Plain choice items allowed sparingly. Misses RE-QUEUE until landed,
Duolingo style, but accuracy and pay score FIRST TRIES only.

Lesson end is ONE screen: accuracy, pay breakdown, and the buy
prompt for companies met in the lesson (mocked as "Lesson end").

Unit 1's lesson-by-lesson concept list: docs/stack-unit1.md.

## Demo build order

1. Home tree look-check variants. DONE, Marlon picked A, felt table.
2. Screens mock round: all remaining screens and the six item types
   in the felt skin, approved before any playable code.
3. Playable: Stocks and Funds units, Guess the Stock in the arcade,
   fake friends, fast clock, portfolio with piece lots, field guide.

## Flagged, not blocking

- Exact pay, bonus, review, and freeze prices (working figures: base
  $50, perfect bonus $10, sized so day one buys a whole share).
- How friend links work outside the demo.
- Which slab face carries the numerals (settled at look check).
- The bear's exact duties (wrong answers only, or red days too).
