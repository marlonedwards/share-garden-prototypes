// Buy and hold: everything into shares on the very first tick, then nothing
// for the rest of the run. The simplest strategy there is, and the one the
// end card's "doing nothing" baseline plays.
function buyAndHoldBot(prices, shares, cash) {
  // on the first tick this buys the maximum; on every later tick cash is
  // already zero, so the maximum is zero and the bot simply holds
  return { buy: max_shares_can_buy(prices, shares, cash) };
}
