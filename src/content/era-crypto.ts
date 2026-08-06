// Crypto winters, 2018 to 2024. Copy moved verbatim from the pre-split
// registry.
// W4 step 2 fills this era's scouting notes (founded, history, believers,
// doubters on every asset), its briefing page, its extra gates, and its
// five-item quiz. Until then the brief beat shows the plain start button.
// Coins have no founding company; founded holds the year the coin launched.
import eraCrypto from "../data/eraCrypto.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";

export const crypto: ScenarioConfig = {
  id: "crypto",
  lesson: "Lesson 5",
  title: "Crypto Winters",
  headerSub: "every coin price is real, 2018 to 2024",
  cardLine: "Seven years of real coin prices hold two crashes of 75% and two recoveries.",
  learn: "This era shows what volatility really feels like, and why bet size matters more than being right.",
  dots: ["#ff9f0a", "#bf5af2", "#ffd60a", "#64d2ff"],
  time: "about 6 minutes",
  dataset: eraCrypto as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It holds the boring stock market, sealed at the start.",
  assets: [
    { id: "BTC-USD", real: "Bitcoin",  name: "Coin Alpha",    desc: "It was the first coin, and fans call it digital gold.",       color: "#ff9f0a", glow: "#ffcf7a" },
    { id: "ETH-USD", real: "Ethereum",  name: "Coin Beta",     desc: "It wants to be a world computer that runs on its own coin.",  color: "#bf5af2", glow: "#e0a9ff" },
    { id: "LTC-USD", real: "Litecoin",  name: "Coin Gamma",    desc: "It is a faster copy of the first coin.",                      color: "#8e8e93", glow: "#c7c7cc" },
    { id: "XRP-USD", real: "XRP",  name: "Coin Delta",    desc: "It is a coin that wants banks as customers.",                 color: "#64d2ff", glow: "#b0e8ff" },
    { id: "DOGE-USD", real: "Dogecoin", name: "The Joke Coin", desc: "It started as a joke, and it kept going anyway.",             color: "#ffd60a", glow: "#ffe97a" },
    { id: "BCC", real: "BitConnect", name: "The Promise Coin", desc: "It promises 1% a day, guaranteed, forever.",                  color: "#ff375f", glow: "#ff8fa3" },
  ],
  moments: [
    mom(0, 3, "The hangover", "Coins just fell 60% from their peak. This is winter one."),
    mom(1, 2, "The Promise Coin shuts down", "The coin that guaranteed riches is gone overnight."),
    mom(26, 3, "The covid crash", "Everything falls at once. Coins fall hardest."),
    mom(46, 3, "Coin mania", "Coins hit records. Your barber has a coin tip."),
    mom(58, 3, "Winter two", "Prices are down three quarters from the top, again."),
    mom(74, 3, "Records again", "The survivors set new highs."),
  ],
  gates: [
    {
      atStep: 46,
      title: "November 2021",
      question: "Coins are at all-time records and your barber has a tip. Do you add more?",
      context: [
        "A mania is a bubble with a crowd: the price rises because it is rising, and everyone has a tip. Coin Alpha has multiplied thirty times over in three years. Stadiums are being renamed after coin companies. People post screenshots of life-changing profits every day.",
        "You lived through the first winter at the start of this run, and it began from a party that felt exactly like this one. Nobody in that crowd knew the top had passed until months after it did.",
      ],
      options: [{ label: "Buy more coins", act: true }, { label: "Take some profits", act: true }, { label: "Change nothing" }],
      refs: [{ label: "The 2021 crypto bubble", url: "https://en.wikipedia.org/wiki/Cryptocurrency_bubble" }],
    },
    {
      atStep: 58,
      title: "November 2022",
      question: "Coins are down three quarters for the second time. Was the first winter a lesson or a fluke?",
      context: [
        "Position size is how much of your money one thing gets, and it is the difference between an investor who can wait and one who has to sell.",
        "A giant coin exchange just collapsed with its customers' money inside. This is the second 75 percent winter in five years. The boring stock index is down about a fifth.",
      ],
      options: [{ label: "Sell what's left", act: true }, { label: "Hold" }, { label: "Buy the winter", act: true }],
      refs: [{ label: "The FTX collapse", url: "https://en.wikipedia.org/wiki/Bankruptcy_of_FTX" }],
    },
  ],
  startCash: 1000,
  fractionalDefault: true,
  lastStep: 83,
  briefTitle: "January 2018. Coins just crashed, and true believers are buying.",
  briefBody: [
    "You have $1,000 and seven wild years. Every price is real. One of these coins is a scam.",
    "The rainbow orb skips the coins entirely and holds the boring stock market.",
  ],
  startLabel: "Start in 2018",
  endTitle: "December 2024. Two winters came, and two springs followed.",
  bullets: [
    { c: "#ff9f0a", text: "Coins fell by three quarters, twice, and still ended higher. Almost nobody holds through that." },
    { c: "#64d2ff", text: "The boring rainbow orb grew steadily and never once made you feel sick." },
    { c: "#ffd60a", text: "Never bet money you will need soon on something that can drop 75%." },
  ],
  cardSubline: "This run lived the crypto winters, 2018 to 2024, on real prices.",
};
