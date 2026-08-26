// The classic crossover: in while the three month average sits above the
// twelve month average, out while it sits below.
function crossoverBot(prices, shares, cash) {
  if (prices.length < 12) return { buy: 0 };
  const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const fast = avg(prices.slice(-3));
  const slow = avg(prices.slice(-12));
  if (fast > slow) return { buy: max_shares_can_buy(prices, shares, cash) };
  if (fast < slow) return { buy: -max_shares_can_sell(prices, shares, cash) };
  return { buy: 0 };
}
