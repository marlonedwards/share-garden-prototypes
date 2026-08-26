// Spends $100 at the start of each month until the cash runs out.
function dollarCostAverageBot(prices, shares, cash) {
  if ((prices.length - 1) % ticks_per_month !== 0) return { buy: 0 };
  const price = prices[prices.length - 1];
  if (!(price > 0)) return { buy: 0 };
  return { buy: Math.min(cash, 100) / price };
}
