// Goes all in on the first tick and never touches it again.
function buyAndHoldBot(prices, shares, cash) {
  return { buy: max_shares_can_buy(prices, shares, cash) };
}
