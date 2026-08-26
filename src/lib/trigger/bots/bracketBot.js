// Remembers what it paid: buys in, dumps the lot 20% above the entry price
// (take profit) or 10% below it (stop loss), then buys back in on the next
// tick. Ticks are what make the brackets bite: it reacts the moment a line
// is crossed, not at the end of the month.
let entry = 0;
function bracketBot(prices, shares, cash) {
  const price = prices[prices.length - 1];
  if (!(price > 0)) return { buy: 0 };
  if (shares === 0) {
    entry = price;
    return { buy: max_shares_can_buy(prices, shares, cash) };
  }
  if (price >= entry * 1.2 || price <= entry * 0.9) {
    return { buy: -max_shares_can_sell(prices, shares, cash) };
  }
  return { buy: 0 };
}
