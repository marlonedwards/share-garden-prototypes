// Flips a coin each month and trades a random size.
function randomBot(prices, shares, cash) {
  if (Math.random() < 0.5) {
    return { buy: Math.random() * max_shares_can_buy(prices, shares, cash) };
  }
  return { buy: -Math.random() * max_shares_can_sell(prices, shares, cash) };
}
