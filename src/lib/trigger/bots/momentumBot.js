// Momentum: bet that whatever has been happening keeps happening. All in
// after two months of rising prices, all out after two months of falling.
// It rides long trends well and gets whipsawed in choppy markets, buying
// tops and selling bottoms.
function momentumBot(prices, shares, cash) {
  const n = prices.length;
  const m = ticks_per_month;
  // needs two whole months of history before it has an opinion
  if (n < 2 * m + 1) return { buy: 0 };
  // the price now, one month ago, and two months ago
  const now = prices[n - 1];
  const oneAgo = prices[n - 1 - m];
  const twoAgo = prices[n - 1 - 2 * m];
  if (now > oneAgo && oneAgo > twoAgo) return { buy: max_shares_can_buy(prices, shares, cash) };
  if (now < oneAgo && oneAgo < twoAgo) return { buy: -max_shares_can_sell(prices, shares, cash) };
  return { buy: 0 };
}
