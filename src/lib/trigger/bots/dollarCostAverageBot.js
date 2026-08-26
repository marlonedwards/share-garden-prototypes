// Spends $100 a month until the cash runs out.
function dollarCostAverageBot(prices, shares, cash) {
  const price = prices[prices.length - 1];
  if (!(price > 0)) return { buy: 0 };
  return { buy: Math.min(cash, 100) / price };
}
