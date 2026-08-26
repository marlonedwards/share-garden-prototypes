// Brackets: buy in, remember the entry price, and put two orders around it.
// 20% above, take the profit; 10% below, cut the loss. Then buy back in on
// the next tick and bracket again. The ticks are what make it bite: a stop
// loss fires the moment the line is crossed, not at the end of the month.
//
// `entry` lives outside the function, so it survives between calls: that is
// how a bot keeps memory from one tick to the next.
let entry = 0;
function bracketBot(prices, shares, cash) {
  const price = prices[prices.length - 1];
  if (!(price > 0)) return { buy: 0 };
  if (shares === 0) {
    // flat: buy everything and remember what was paid
    entry = price;
    return { buy: max_shares_can_buy(prices, shares, cash) };
  }
  // holding: sell the lot the instant either bracket is crossed
  if (price >= entry * 1.2 || price <= entry * 0.9) {
    return { buy: -max_shares_can_sell(prices, shares, cash) };
  }
  return { buy: 0 };
}
