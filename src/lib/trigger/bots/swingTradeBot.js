// Swing trading: bet that the price snaps back to its recent average. All
// in when the price sits 8% under the average of the last six months, all
// out when it sits 8% over. In a sideways, choppy market that harvests the
// wobble; in a long steady trend it exits early and misses the ride.
function swingTradeBot(prices, shares, cash) {
  // the last six months of ticks, excluding the current price itself
  const window = prices.slice(-6 * ticks_per_month - 1, -1);
  if (window.length === 0) return { buy: 0 };
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  const price = prices[prices.length - 1];
  if (!(avg > 0)) return { buy: 0 };
  // cheap against the recent past: buy everything
  if (price <= avg * 0.92) return { buy: max_shares_can_buy(prices, shares, cash) };
  // expensive against the recent past: sell everything
  if (price >= avg * 1.08) return { buy: -max_shares_can_sell(prices, shares, cash) };
  // inside the band: sit still
  return { buy: 0 };
}
