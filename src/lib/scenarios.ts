// The Orb's scenario registry. Every era runs real monthly prices with
// abstracted company names and honest descriptions; the rainbow orb is always
// the real S&P 500 total return. One scenario per lesson, copy kept short.
import eraDotcom from "../data/eraDotcom.json";
import eraGfc from "../data/eraGfc.json";
import eraCrypto from "../data/eraCrypto.json";
import { MarketEvent } from "../engine/market";
import { EraAsset, HistoryDataset } from "../engine/history";

export interface ScenarioConfig {
  id: string;
  lesson: string;
  title: string;
  headerSub: string;
  cardLine: string;
  learn: string;
  dots: string[];
  time: string;
  dataset: HistoryDataset;
  indexKey: string;
  indexSub: string;          // rainbow orb card subtitle
  assets: EraAsset[];
  moments: MarketEvent[];
  startCash: number;
  income?: number;
  fractionalDefault: boolean;
  lastStep?: number;
  briefTitle: string;
  briefBody: string[];
  startLabel: string;
  endTitle: string;
  bullets: { c: string; text: string }[];
  cardSubline: string;
}

const mom = (atStep: number, days: number, label: string, blurb: string): MarketEvent =>
  ({ atStep, days, drift: 0, vol: 0, scope: "market", label, blurb });

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: "dotcom",
    lesson: "Lesson 2",
    title: "The Dot-Com Era",
    headerSub: "real prices, 2000 to 2007",
    cardLine: "Real prices from the top of the bubble, 2000 to 2007. Names made up. Nothing else is.",
    learn: "Why buying at the top hurts, and what patience pays anyway.",
    dots: ["#ff9f0a", "#64d2ff", "#bf5af2", "#ffd60a", "#ff453a", "#30d158"],
    time: "about 7 minutes",
    dataset: eraDotcom as HistoryDataset,
    indexKey: "^SP500TR",
    indexSub: "the real S&P 500, sealed",
    assets: [
      { id: "AMZN", name: "The Everything Store", desc: "Sells books on the internet. Says it will sell everything one day.", color: "#ff9f0a", glow: "#ffcf7a" },
      { id: "AAPL", name: "Fruit Computers",      desc: "Makes stylish computers. A comeback story, maybe.",                  color: "#0a84ff", glow: "#7cc0ff" },
      { id: "MSFT", name: "Colossus Software",    desc: "Its software runs almost every office computer on earth.",           color: "#64d2ff", glow: "#b0e8ff" },
      { id: "CSCO", name: "Router Works",         desc: "Builds the boxes and wires that connect the internet.",              color: "#bf5af2", glow: "#e0a9ff" },
      { id: "INTC", name: "Chipworks",            desc: "Makes the chips inside most of the world's computers.",              color: "#ffd60a", glow: "#ffe97a" },
      { id: "KO",   name: "Classic Cola",         desc: "Sells the same fizzy drink in nearly every country.",                color: "#ff453a", glow: "#ff9d97" },
      { id: "JNJ",  name: "Bandage & Balm",       desc: "Medicine, baby shampoo, and half your bathroom cabinet.",            color: "#30d158", glow: "#8ff0ae" },
      { id: "XOM",  name: "Giant Oil",            desc: "Pumps, refines, and sells oil around the world.",                    color: "#8e8e93", glow: "#c7c7cc" },
    ],
    moments: [
      mom(0, 2, "Dot-com mania", "Internet stocks have gone vertical. Everyone has a hot tip."),
      mom(2, 4, "The bubble pops", "The internet dream meets its bill. Tech is falling, hard."),
      mom(20, 3, "September 2001", "Markets close for a week, then drop. Fear is everywhere."),
      mom(33, 3, "The bottom", "Three brutal years of falling prices. Most sellers are done."),
      mom(41, 4, "The climb back", "Quietly, prices are rising again."),
      mom(93, 3, "New highs", "After five years of recovery, the market sets a record."),
    ],
    startCash: 1000,
    fractionalDefault: false,
    briefTitle: "January 2000. The internet party is as loud as it will ever get.",
    briefBody: [
      "You have $1,000 and eight years. Every price is real. The names are made up; the companies were not.",
      "The rainbow orb puts the same $1,000 all-in on the real S&P 500. Prices are the era's real quotes.",
    ],
    startLabel: "Start in 2000",
    endTitle: "December 2007. You bought the top of a bubble and lived to tell it.",
    bullets: [
      { c: "#bf5af2", text: "The hottest tech names of 2000 all lost money over these eight years. The boring ones quietly won." },
      { c: "#ff9f0a", text: "The Everything Store fell hard, then ended the era up. Impatience gets punished before good businesses do." },
      { c: "#30d158", text: "This menu only shows survivors. The real 2000 menu held thousands of names, and plenty went to zero." },
    ],
    cardSubline: "The dot-com era · Jan 2000 to Dec 2007 · real prices",
  },
  {
    id: "gfc",
    lesson: "Lesson 3",
    title: "The 2008 Crash",
    headerSub: "real prices, 2007 to 2015",
    cardLine: "Real prices, 2007 to 2015. Banks fall, houses fall, patience wins.",
    learn: "What a real panic feels like, and who the recovery belongs to.",
    dots: ["#30d158", "#bf5af2", "#a2845e", "#ffd60a", "#0a84ff", "#ff9f0a"],
    time: "about 7 minutes",
    dataset: eraGfc as HistoryDataset,
    indexKey: "^SP500TR",
    indexSub: "the real S&P 500, sealed",
    assets: [
      { id: "C",    name: "Mega Bank",           desc: "One of the biggest banks on earth. Everyone trusts it.",   color: "#30d158", glow: "#8ff0ae" },
      { id: "AIG",  name: "The Insurance Giant", desc: "Insures the whole world, and some things it shouldn't.",   color: "#bf5af2", glow: "#e0a9ff" },
      { id: "F",    name: "The Carmaker",        desc: "A hundred years of building cars.",                        color: "#a2845e", glow: "#d4b795" },
      { id: "GE",   name: "General Everything",  desc: "Engines, light bulbs, TVs, and loans.",                    color: "#ffd60a", glow: "#ffe97a" },
      { id: "WMT",  name: "Everything Mart",     desc: "Sells everything, cheap, in every town.",                  color: "#64d2ff", glow: "#b0e8ff" },
      { id: "AAPL", name: "Fruit Computers",     desc: "Just launched a phone.",                                   color: "#0a84ff", glow: "#7cc0ff" },
      { id: "XOM",  name: "Giant Oil",           desc: "Pumps, refines, and sells oil around the world.",          color: "#8e8e93", glow: "#c7c7cc" },
      { id: "AMZN", name: "The Everything Store", desc: "The online store that survived the last crash.",          color: "#ff9f0a", glow: "#ffcf7a" },
    ],
    moments: [
      mom(9, 3, "The top", "Stocks set a record. Houses only go up, people say."),
      mom(20, 4, "The panic", "A giant bank fails overnight. Everything is falling."),
      mom(26, 3, "The bottom", "Prices are half off, and almost no one wants to buy."),
      mom(62, 3, "Quiet recovery", "Slowly, prices heal."),
      mom(74, 3, "New highs", "The market passes its 2007 record."),
    ],
    startCash: 1000,
    fractionalDefault: false,
    briefTitle: "January 2007. Everything is going up, especially houses.",
    briefBody: [
      "You have $1,000 and nine years. Every price is real. One of these giants will nearly die.",
      "The rainbow orb puts the same $1,000 all-in on the real S&P 500.",
    ],
    startLabel: "Start in 2007",
    endTitle: "December 2015. The crash came, and the world did not end.",
    bullets: [
      { c: "#bf5af2", text: "The Insurance Giant and Mega Bank lost about nine dollars of every ten and never came back. Even giants can be fragile." },
      { c: "#30d158", text: "The rainbow orb took the exact same crash, then made new highs. Spreading out is what saved it." },
      { c: "#ff9f0a", text: "Panic prices turned out to be the deals of the decade. Nobody rang a bell. The rainbow orb caught them automatically." },
    ],
    cardSubline: "The 2008 crash · Jan 2007 to Dec 2015 · real prices",
  },
  {
    id: "payday",
    lesson: "Lesson 4",
    title: "Pay Yourself First",
    headerSub: "invest a little every month, 2000 to 2007",
    cardLine: "You earn $50 a month through the roughest era we have. Invest it as it comes.",
    learn: "How steady monthly investing beats waiting for the perfect moment.",
    dots: ["#30d158", "#0a84ff", "#ff9f0a", "#30d158"],
    time: "about 6 minutes",
    dataset: eraDotcom as HistoryDataset,
    indexKey: "^SP500TR",
    indexSub: "gets the same $50 every month, sealed",
    assets: [
      { id: "AMZN", name: "The Everything Store", desc: "Sells books on the internet. Says it will sell everything one day.", color: "#ff9f0a", glow: "#ffcf7a" },
      { id: "AAPL", name: "Fruit Computers",      desc: "Makes stylish computers. A comeback story, maybe.",                  color: "#0a84ff", glow: "#7cc0ff" },
      { id: "MSFT", name: "Colossus Software",    desc: "Its software runs almost every office computer on earth.",           color: "#64d2ff", glow: "#b0e8ff" },
      { id: "KO",   name: "Classic Cola",         desc: "Sells the same fizzy drink in nearly every country.",                color: "#ff453a", glow: "#ff9d97" },
      { id: "JNJ",  name: "Bandage & Balm",       desc: "Medicine, baby shampoo, and half your bathroom cabinet.",            color: "#30d158", glow: "#8ff0ae" },
      { id: "XOM",  name: "Giant Oil",            desc: "Pumps, refines, and sells oil around the world.",                    color: "#8e8e93", glow: "#c7c7cc" },
    ],
    moments: [
      mom(2, 4, "The bubble pops", "The internet dream meets its bill. Tech is falling, hard."),
      mom(33, 3, "The bottom", "Your $50 buys more shares than it ever has."),
      mom(93, 3, "New highs", "The market sets a record. Your steady months paid for it."),
    ],
    startCash: 100,
    income: 50,
    fractionalDefault: true,
    briefTitle: "January 2000. You have $100 and a paycheck.",
    briefBody: [
      "Every month, $50 arrives in your dish. The market is about to get ugly. That is the point.",
      "The rainbow orb invests its $50 into the index every month, automatically.",
    ],
    startLabel: "Start earning",
    endTitle: "December 2007. You never guessed once.",
    bullets: [
      { c: "#30d158", text: "You bought every month, high or low. The cheap months bought you the most shares." },
      { c: "#0a84ff", text: "Nobody rings a bell at the bottom. Steady beats clever." },
      { c: "#ff9f0a", text: "The rainbow orb did the same thing with the whole market. That combination is very hard to beat." },
      { c: "#bf5af2", text: "If one of your colors won big, remember: one store did that. Most didn't, and nobody knew which in 2000." },
    ],
    cardSubline: "Pay yourself first · $50 a month, 2000 to 2007 · real prices",
  },
  {
    id: "crypto",
    lesson: "Lesson 5",
    title: "Crypto Winters",
    headerSub: "real coin prices, 2018 to 2024",
    cardLine: "Seven years of real coin prices. Two crashes of 75%. Two recoveries.",
    learn: "What volatility really feels like, and why bet size matters more than being right.",
    dots: ["#ff9f0a", "#bf5af2", "#ffd60a", "#64d2ff"],
    time: "about 6 minutes",
    dataset: eraCrypto as HistoryDataset,
    indexKey: "^SP500TR",
    indexSub: "the boring stock market, sealed",
    assets: [
      { id: "BTC-USD",  name: "Coin Alpha",    desc: "The first one. Digital gold, fans say.",        color: "#ff9f0a", glow: "#ffcf7a" },
      { id: "ETH-USD",  name: "Coin Beta",     desc: "A world computer that runs on its own coin.",   color: "#bf5af2", glow: "#e0a9ff" },
      { id: "LTC-USD",  name: "Coin Gamma",    desc: "A faster copy of the first one.",               color: "#8e8e93", glow: "#c7c7cc" },
      { id: "XRP-USD",  name: "Coin Delta",    desc: "A coin that wants banks as customers.",         color: "#64d2ff", glow: "#b0e8ff" },
      { id: "DOGE-USD", name: "The Joke Coin", desc: "Started as a joke. Kept going anyway.",         color: "#ffd60a", glow: "#ffe97a" },
    ],
    moments: [
      mom(0, 3, "The hangover", "Coins just fell 60% from their peak. Winter one."),
      mom(26, 3, "The covid crash", "Everything falls at once. Coins fall hardest."),
      mom(46, 3, "Coin mania", "Coins hit records. Your barber has a coin tip."),
      mom(58, 3, "Winter two", "Down three quarters from the top. Again."),
      mom(74, 3, "Records again", "The survivors set new highs."),
    ],
    startCash: 1000,
    fractionalDefault: true,
    lastStep: 83,
    briefTitle: "January 2018. Coins just crashed, and true believers are buying.",
    briefBody: [
      "You have $1,000 and seven wild years. Every price is real.",
      "The rainbow orb skips the coins entirely and holds the boring stock market.",
    ],
    startLabel: "Start in 2018",
    endTitle: "December 2024. Two winters, two springs.",
    bullets: [
      { c: "#ff9f0a", text: "Coins fell by three quarters, twice, and still ended higher. Almost nobody holds through that." },
      { c: "#64d2ff", text: "The boring rainbow orb grew steadily and never once made you feel sick." },
      { c: "#ffd60a", text: "Never bet money you will need soon on something that can drop 75%." },
    ],
    cardSubline: "Crypto winters · 2018 to 2024 · real prices",
  },
];

export function getScenario(id: string | undefined): ScenarioConfig {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
