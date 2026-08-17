# Top Tick, spec draft (from the August 15 deep-development pass)

The line that keeps it distinct from Hold: Hold is a continuous input with a death state (the crash ends you). Top Tick is one discrete, irreversible decision, and nothing ever ends you: the tape always plays out in full, and the drama lives in watching the world continue after your choice. Hold is about nerve under pressure; Top Tick is about the impossibility of knowing you are at the top while you are at it.

## Daily structure

One tape per day, the same tape for everyone, Wordle model. One graded attempt per mode. Scarcity is what makes the share card mean something.

- The Daily: today's tape, anonymized. Easy and Hard play the same tape, separate leaderboards. Result locks at first tap.
- The Vault: the 30-tape collection, replayable, untimed; first-attempt result per tape remembered forever (same pattern as Guess the Stock's collection).
- Weekly cruelty rhythm: Monday/Tuesday clean parabolas, midweek slow grinds with ambiguous tops, Friday fake-outs (double tops), Saturday cliff divers, Sunday legends from the deep vault. Players learn the rhythm without being told.

Onboarding is five words on the start button: "One tap. Sell the top."

## Round mechanics

15 seconds nominal, actual length hidden and variable (13-17s). Real daily closes, 9 months to 3 years (250-500 points), constant candles-per-second within a round.

- The top lands uniformly at random between second 6 and second 13; minimum 6 seconds of pre-top footage; randomization kills clock-counting.
- The y-axis autoscales as new highs print, so the line always kisses the top of the screen; distance-from-ceiling is deliberately uninformative.
- No visible countdown; the round just ends.
- Fake-outs come free from real data (2017 Bitcoin had five 25%+ drawdowns on the way up); curate at least one fake-out tape per week.
- Never tapping = sold at the final drawn price; the trailing edge always includes real crash footage, so no-tap lands around 30-50% of peak and gets its own deadpan card ("Never sold. 31.2%").

Post-tap agony, the core of the game: your exit pins as a dotted line with the dollar price, the tape keeps drawing, and a live counter runs beneath — "left on the table: $412" climbing while price is above your exit, flipping to "dodged: $6,120" the moment it crosses under. Every tape is window-trimmed (never data-touched) so a few seconds of post-tap footage exist for any plausible tap. Never allow skip: the wait is the game.

## Scoring

Primary score: sell price divided by peak close in the window, one decimal, no bonuses. Anti-strategy:

- Tap instantly: tapes open at 25% of peak or less, so instant caps ~25%.
- Tap at the buzzer: round ends 1-4 seconds after the true top at unpredictable length, and real crashes are violently steep; buzzer-tapping eats the cliff.
- Tap safely mid-round (the real threat): keep the natural asymmetry of real bubbles (earliness punished linearly, lateness convexly) — do NOT soften the crash penalty; overstaying should hurt, that is the joke. The pressure against safe-tapping is percentile vs today's crowd: 82% raw at 45th percentile feels mediocre, and the crowd re-sharpens the knife daily.

96.8% vs 71% made visceral three ways:

1. Dollars: implicit $1,000 staked at the tape's open. "Your $1,000 became $9,640. Perfection paid $9,960. You left $320 on the table."
2. Identity bands, early and late named differently: 100.0% "The Top Tick" (gold, rare); 97-99.9 "Called the top"; 90-97 "Smart money"; 75-90 "Took profits"; 50-75 early "Left the party early" vs late "Overstayed"; below 50 early "Sold the ignition" vs late "Bagholder."
3. Historical percentile from real volume data: "You beat an estimated 93% of everyone who actually sold in 2017" (footnoted as estimated from traded volume).

## The reveal

1. Tape finishes. 400ms of nothing. 2. Camera pulls back: multi-year context draws in faded, dates and dollars fade onto the axes. 3. Name card, plain type: "Bitcoin. October 2015 to December 2018." 4. Peak flag: "$19,783. Dec 17, 2017." 5. Your flag: "You sold: $17,706. Dec 14, 2017," with "3 days early." 6. Score counts up, band stamps. 7. "Top 4% of today's 31,204 players," then the historical percentile line. 8. The money line. 9. Share / The Vault / "Tomorrow's tape at midnight."

## Share card

Portrait 1080x1350 (plus 1200x630 landscape), theme-aware. Header: "Top Tick #214" and date. Center: the full tape as one clean line, no axes; hollow circle on the true top, solid marker on your exit, thin vertical connector — the gap IS the card. Big number and band label, one flavor line ("Sold 3 days before the top"), streak footer. Spoiler rule: until the daily rolls over, the card says "Today's tape" and never names the asset; Vault and post-rollover cards name it in full. No emoji.

## The Vault: 30 tapes in five cruelty tiers (ordered by top-obviousness)

- Vertical manias: Bitcoin 2017, Ethereum 2017, Dogecoin 2021, Silver 1980, Oil 2008, Qualcomm 1999, Shanghai 2015, Volkswagen 2008 (short tape, brutal speed).
- Slow grinds: Nikkei 1989, Cisco 1998-2000, Gold 1970-1980, Dow 1927-1929, Tesla 2020, Microsoft 1999, Intel 2000, Yahoo 1998-2000.
- Double tops and fake-outs: Bitcoin 2021, Gold Jan 1980 retest, S&P 2007 twin peaks, Lumber 2021-2022, Zoom 2020, Peloton 2021, ARKK 2021, Uranium 2007.
- Cliff divers: GameStop 2021, LUNA 2022 (a genuine zero), Nasdaq 2000 (ultimate post-tap agony footage), Lehman 2008.
- Legends (Sunday, coarser data at lower candle rates): South Sea 1720, Mississippi 1719-1720, Dow 1929-1930 (the greatest dead-cat bounce ever recorded), Avon 1972-1974.

Tulips deliberately absent: surviving records are auction fragments, not a series; the about page says so in one sentence. Vault replays randomize trim, speed, and top position so shape memory does not hand over screen position; first-attempt medals are sacred.

## Easy and Hard

Same tape, same curve, separate leaderboards; the vault records which mode earned each medal.

- Easy ("with the ticker"): 20-second playback, a running "% off recent high" readout, and one mulligan — within 1.5 seconds of your tap, tap again to un-sell, once per round.
- Hard ("the naked tape"): 12 seconds, no y-axis until reveal, no readouts, playback speed drifts 0.8x-1.3x so rhythm-counting fails, round can end one second after the true top.

## Data

Entirely static: one JSON per tape ({asset, window, [date, close], volume where available, peak metadata, trim ranges}), ~few hundred KB total. Sources: Stooq/Yahoo dailies, exchange archives and CoinGecko for crypto, LBMA fixes for gold/silver (to 1968), FRED for WTI, Schwert's dataset for 1929 Dow dailies, Neal's published series for South Sea and Mississippi. Only server piece: a tiny endpoint aggregating today's tap distribution for percentiles; day one ships a playtest-seeded distribution labeled "early crowd."

## Failure modes and fixes

- Score compression (everyone 80-95): one decimal, rank by percentile, "days from top" as a second brag axis.
- Double-top gut punch: reveal absorbs it ("You sold the April top. So did most of the crowd"); percentile rescues cruel tapes.
- Shape recognition by finance people: trim/speed/endpoint randomization plus hidden y-axis means knowing "this is Bitcoin" without knowing the peak is 1.4 seconds away — exactly the position real 2017 holders were in.
- Early tap, long wait: the "left on the table" counter makes the wait the content; never allow skip.
- Session too thin: the daily is deliberately thin (the ritual); the Vault absorbs appetite; do not pad the daily.
- Wrong-side confusion at 71%: flag placement plus band names disambiguate wordlessly.
- Percentile cold start: seeded distribution, honestly labeled, replaced by live data.

## Siblings (same engine, distinct verbs, neither is Hold)

- Knife Catch (S): a famous crash draws downward and you get one tap to buy the bottom; asymmetry flips (early = catching the knife, late = missed discount), and the reveal pays twice — distance from bottom, then the forward window ("Bought the S&P on March 12, 2009. 2.1% off the bottom. $1,000 became $6,940"). Side effect: bottoms feel like the end of the world, never like opportunities.
- Dip or Trap (M): a chart freezes at exactly minus 30%, a three-second fuse burns, tap to buy or let it expire; the reveal fast-forwards a year and shows both futures (Amazon 2001 falls 60% more then forty-folds; Enron goes to zero). Five moments per daily run as a dollar portfolio. Side effect: a 30% discount, by itself, contains no information.
