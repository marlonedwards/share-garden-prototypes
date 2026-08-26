// Rides the trend: all in after two rising months, all out after two falling.
function momentumBot(prices, shares, cash) {
  const n = prices.length;
  if (n < 3) return { buy: 0 };
  if (prices[n - 1] > prices[n - 2] && prices[n - 2] > prices[n - 3]) {
    return { buy: max_shares_can_buy(prices, shares, cash) };
  }
  if (prices[n - 1] < prices[n - 2] && prices[n - 2] < prices[n - 3]) {
    return { buy: -max_shares_can_sell(prices, shares, cash) };
  }
  return { buy: 0 };
}
