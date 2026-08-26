// Rides the trend: all in after two rising months, all out after two falling.
function momentumBot(prices, shares, cash) {
  const n = prices.length;
  const m = ticks_per_month;
  if (n < 2 * m + 1) return { buy: 0 };
  const now = prices[n - 1];
  const oneAgo = prices[n - 1 - m];
  const twoAgo = prices[n - 1 - 2 * m];
  if (now > oneAgo && oneAgo > twoAgo) return { buy: max_shares_can_buy(prices, shares, cash) };
  if (now < oneAgo && oneAgo < twoAgo) return { buy: -max_shares_can_sell(prices, shares, cash) };
  return { buy: 0 };
}
