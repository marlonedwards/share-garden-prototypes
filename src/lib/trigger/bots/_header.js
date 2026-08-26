/**
 * Your bot plays the run one tick at a time, seeing exactly what you see:
 * the tape ticks ticks_per_month times each market month, and on every tick
 * your bot is shown the same price the screen shows and trades at it.
 *
 * @param {number[]} prices - every tick price so far; the last entry is the price right now
 * @param {number} shares - what you hold right now, fractional shares allowed
 * @param {number} cash - what you have left to spend
 * @returns {{buy: number}} - positive buys that many shares, negative sells them,
 *   zero does nothing. Buying more than cash covers, or selling more than
 *   you hold, stops the run.
 *
 * Also in scope:
 *   max_shares_can_buy(prices, shares, cash)
 *   max_shares_can_sell(prices, shares, cash)
 *   ticks_per_month - so a strategy can still think in months
 *
 * Pick the player on the last line.
 */
