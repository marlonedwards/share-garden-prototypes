// Sizes the position to the trend: the share of worth held in stock follows
// where this month sits between the twelve month low and high, rebalancing
// only when the target drifts more than 5% of worth away.
function trendSizerBot(prices, shares, cash) {
  const price = prices[prices.length - 1];
  if (!(price > 0)) return { buy: 0 };
  const window = prices.slice(-12);
  const lo = Math.min(...window);
  const hi = Math.max(...window);
  const target = hi > lo ? (price - lo) / (hi - lo) : 0.5;
  const worth = cash + shares * price;
  const targetShares = (target * worth) / price;
  if (Math.abs(targetShares - shares) * price < worth * 0.05) return { buy: 0 };
  return { buy: targetShares - shares };
}
