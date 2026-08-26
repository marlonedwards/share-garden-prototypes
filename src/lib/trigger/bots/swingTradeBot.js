// Buys the dip, sells the rip: all in when this month sits 8% under the
// average of the six before it, all out when it sits 8% over.
function swingTradeBot(prices, shares, cash) {
  if (prices.length < 2) return { buy: 0 };
  const window = prices.slice(-7, -1);
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  const price = prices[prices.length - 1];
  if (!(avg > 0)) return { buy: 0 };
  if (price <= avg * 0.92) return { buy: max_shares_can_buy(prices, shares, cash) };
  if (price >= avg * 1.08) return { buy: -max_shares_can_sell(prices, shares, cash) };
  return { buy: 0 };
}
