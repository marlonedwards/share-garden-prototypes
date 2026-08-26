// Dollar cost averaging: the same $100 at the start of every month, whatever
// the price, until the cash runs out. Buying a fixed number of dollars means
// it gets more shares when the price is low and fewer when it is high.
function dollarCostAverageBot(prices, shares, cash) {
  // prices grows by one entry per tick, so a length one past a multiple of
  // ticks_per_month means this tick is the first of a new month
  if ((prices.length - 1) % ticks_per_month !== 0) return { buy: 0 };
  const price = prices[prices.length - 1];
  // a company that has gone to zero cannot be bought
  if (!(price > 0)) return { buy: 0 };
  // $100 of shares at today's price, or whatever cash is left at the end
  return { buy: Math.min(cash, 100) / price };
}
