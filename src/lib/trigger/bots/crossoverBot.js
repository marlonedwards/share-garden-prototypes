// The moving average crossover, the classic trend filter: hold the stock
// while the short average sits above the long one, hold cash while it sits
// below. Slower to react than momentum, so it ignores small wobbles, and
// slower to exit, so it gives back more of a crash before stepping aside.
function crossoverBot(prices, shares, cash) {
  // needs a full year of ticks before the long average means anything
  if (prices.length < 12 * ticks_per_month) return { buy: 0 };
  const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  // the recent three months against the last twelve
  const fast = avg(prices.slice(-3 * ticks_per_month));
  const slow = avg(prices.slice(-12 * ticks_per_month));
  // being all in or all out already makes the repeated call a no op: the
  // maximum it can buy while invested, or sell while flat, is zero
  if (fast > slow) return { buy: max_shares_can_buy(prices, shares, cash) };
  if (fast < slow) return { buy: -max_shares_can_sell(prices, shares, cash) };
  return { buy: 0 };
}
