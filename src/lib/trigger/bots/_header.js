/**
 * Your bot plays the run one month at a time.
 *
 * @param {number[]} prices - every monthly price so far; the last entry is this month's
 * @param {number} shares - what you hold right now, fractional shares allowed
 * @param {number} cash - what you have left to spend
 * @returns {{buy: number}} - positive buys that many shares, negative sells them,
 *   zero does nothing. Buying more than cash covers, or selling more than
 *   you hold, stops the run.
 *
 * Helpers already in scope:
 *   max_shares_can_buy(prices, shares, cash)
 *   max_shares_can_sell(prices, shares, cash)
 *
 * Pick the player on the last line.
 */
