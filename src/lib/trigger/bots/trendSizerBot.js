// Trend sizing: instead of all in or all out, hold a fraction of your worth
// in shares that follows where the price sits in its own past year. At the
// twelve month high, fully invested; at the low, fully in cash; in between,
// in between. It never calls a top or a bottom, it just leans.
function trendSizerBot(prices, shares, cash) {
  const price = prices[prices.length - 1];
  if (!(price > 0)) return { buy: 0 };
  // where today sits between the last year's low and high, 0 to 1
  const window = prices.slice(-12 * ticks_per_month);
  const lo = Math.min(...window);
  const hi = Math.max(...window);
  const target = hi > lo ? (price - lo) / (hi - lo) : 0.5;
  // the shares that would put exactly that fraction of worth in stock
  const worth = cash + shares * price;
  const targetShares = (target * worth) / price;
  // only rebalance when the drift is worth the trade, 5% of worth, so the
  // log is not a smear of dust sized trades
  if (Math.abs(targetShares - shares) * price < worth * 0.05) return { buy: 0 };
  return { buy: targetShares - shares };
}
