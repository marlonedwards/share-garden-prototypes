// Random: wakes up about once a month, flips a coin, and trades a random
// size. It exists to be beaten; it knows nothing about the price.
function randomBot(prices, shares, cash) {
  // the bot is called every tick, ticks_per_month times a month; sitting
  // out most calls makes it act on roughly one tick per month
  if (Math.random() > 1 / ticks_per_month) return { buy: 0 };
  // heads: buy a random fraction of everything cash can cover right now
  if (Math.random() < 0.5) {
    return { buy: Math.random() * max_shares_can_buy(prices, shares, cash) };
  }
  // tails: sell a random fraction of everything held
  return { buy: -Math.random() * max_shares_can_sell(prices, shares, cash) };
}
