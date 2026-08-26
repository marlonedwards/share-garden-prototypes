// Buys the dip, sells the rip: all in when the price sits 8% under its six
// month average, all out when it sits 8% over.
function swingTradeBot(prices, shares, cash) {
  const window = prices.slice(-6 * ticks_per_month - 1, -1);
  if (window.length === 0) return { buy: 0 };
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  const price = prices[prices.length - 1];
  if (!(avg > 0)) return { buy: 0 };
  if (price <= avg * 0.92) return { buy: max_shares_can_buy(prices, shares, cash) };
  if (price >= avg * 1.08) return { buy: -max_shares_can_sell(prices, shares, cash) };
  return { buy: 0 };
}
