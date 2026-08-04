// The Orb's scenario registry. Every era runs real monthly prices with
// abstracted company names and honest descriptions; the rainbow orb is always
// the real S&P 500 total return. One scenario per lesson, copy kept short.
import eraDotcom from "../data/eraDotcom.json";
import eraGfc from "../data/eraGfc.json";
import eraCrypto from "../data/eraCrypto.json";
import { MarketEvent } from "../engine/market";
import { EraAsset, HistoryDataset } from "../engine/history";

// A gate pauses the tape at a real historical moment: a page of context the
// player could have known at the time, a prediction they must commit to, and
// references they can follow out. The debrief quotes their choice back.
export interface Gate {
  atStep: number;
  title: string;
  question: string;
  context: string[];
  options: string[];
  refs?: { label: string; url: string }[];
}

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
  gates: Gate[];
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
      { id: "AMZN", real: "Amazon", name: "The Everything Store", desc: "Sells books on the internet. Says it will sell everything one day.", color: "#ff9f0a", glow: "#ffcf7a" },
      { id: "AAPL", real: "Apple", name: "Fruit Computers",      desc: "Makes stylish computers. A comeback story, maybe.",                  color: "#0a84ff", glow: "#7cc0ff" },
      { id: "MSFT", real: "Microsoft", name: "Colossus Software",    desc: "Its software runs almost every office computer on earth.",           color: "#64d2ff", glow: "#b0e8ff" },
      { id: "CSCO", real: "Cisco", name: "Router Works",         desc: "Builds the boxes and wires that connect the internet.",              color: "#bf5af2", glow: "#e0a9ff" },
      { id: "INTC", real: "Intel", name: "Chipworks",            desc: "Makes the chips inside most of the world's computers.",              color: "#ffd60a", glow: "#ffe97a" },
      { id: "KO", real: "Coca-Cola",   name: "Classic Cola",         desc: "Sells the same fizzy drink in nearly every country.",                color: "#ff453a", glow: "#ff9d97" },
      { id: "JNJ", real: "Johnson & Johnson",  name: "Bandage & Balm",       desc: "Medicine, baby shampoo, and half your bathroom cabinet.",            color: "#30d158", glow: "#8ff0ae" },
      { id: "XOM", real: "ExxonMobil",  name: "Giant Oil",            desc: "Pumps, refines, and sells oil around the world.",                    color: "#8e8e93", glow: "#c7c7cc" },
      { id: "WCOM", real: "WorldCom",   name: "The Phone Giant",      desc: "Wires phone calls and internet traffic across the country. A Wall Street favorite.", color: "#5e5ce6", glow: "#a8a5f5" },
      { id: "ETYS", real: "eToys",      name: "The Online Toy Store", desc: "Sells toys on the internet. Growing fast, losing money faster.",     color: "#ff6482", glow: "#ffa8bb" },
    ],
    moments: [
      mom(0, 2, "Dot-com mania", "Internet stocks have gone vertical. Everyone has a hot tip."),
      mom(2, 4, "The bubble pops", "The internet dream meets its bill. Tech is falling, hard."),
      mom(20, 3, "September 2001", "Markets close for a week, then drop. Fear is everywhere."),
      mom(30, 3, "The fraud", "The Phone Giant admits its profits were made up. It is not coming back."),
      mom(33, 3, "The bottom", "Three brutal years of falling prices. Most sellers are done."),
      mom(41, 4, "The climb back", "Quietly, prices are rising again."),
      mom(93, 3, "New highs", "After five years of recovery, the market sets a record."),
    ],
    gates: [
      {
        atStep: 1,
        title: "February 2000",
        question: "The internet party is at its loudest. Where does your $1,000 go?",
        context: [
          "Internet stocks have multiplied five times over in five years. Magazines say the old rules are dead. Companies with no profits are worth billions, because everyone believes someone will pay more tomorrow.",
          "Nobody on this screen knows it yet, but within two years hundreds of internet companies will be gone, and the survivors will be down by half or more.",
        ],
        options: ["All-in on the hottest tech", "Spread across everything", "Wait in cash"],
        refs: [{ label: "The dot-com bubble", url: "https://en.wikipedia.org/wiki/Dot-com_bubble" }],
      },
      {
        atStep: 33,
        title: "October 2002",
        question: "Three years of falling prices. Do you believe the market comes back?",
        context: [
          "The index has been cut nearly in half. The Phone Giant is gone in the biggest bankruptcy in American history. People who bragged about stocks in 2000 now call the market a casino.",
          "Every dollar invested this month buys almost twice the shares it did in 2000. It does not feel that way. It feels like catching a falling knife.",
        ],
        options: ["Buy while it's cheap", "Hold what I have", "Sell before it gets worse"],
        refs: [
          { label: "The 2002 downturn", url: "https://en.wikipedia.org/wiki/Stock_market_downturn_of_2002" },
          { label: "The WorldCom scandal", url: "https://en.wikipedia.org/wiki/WorldCom_scandal" },
        ],
      },
    ],
    startCash: 1000,
    fractionalDefault: false,
    briefTitle: "January 2000. The internet party is as loud as it will ever get.",
    briefBody: [
      "You have $1,000 and eight years. Every price is real. The names are made up; the companies were not. Not every name on this menu makes it to 2008.",
      "The rainbow orb puts the same $1,000 all-in on the real S&P 500. Prices are the era's real quotes.",
    ],
    startLabel: "Start in 2000",
    endTitle: "December 2007. You bought the top of a bubble and lived to tell it.",
    bullets: [
      { c: "#bf5af2", text: "The hottest tech names of 2000 all lost money over these eight years. The boring ones quietly won." },
      { c: "#ff9f0a", text: "The Everything Store fell hard, then ended the era up. Impatience gets punished before good businesses do." },
      { c: "#30d158", text: "Two names on this menu went to zero and stayed there. The real 2000 menu held thousands more like them. Charts of the past only show the survivors: that trick is called survivorship bias." },
    ],
    cardSubline: "The dot-com era · Jan 2000 to Dec 2007 · real prices",
  },
  {
    id: "payday",
    lesson: "Lesson 3",
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
      { id: "AMZN", real: "Amazon", name: "The Everything Store", desc: "Sells books on the internet. Says it will sell everything one day.", color: "#ff9f0a", glow: "#ffcf7a" },
      { id: "AAPL", real: "Apple", name: "Fruit Computers",      desc: "Makes stylish computers. A comeback story, maybe.",                  color: "#0a84ff", glow: "#7cc0ff" },
      { id: "MSFT", real: "Microsoft", name: "Colossus Software",    desc: "Its software runs almost every office computer on earth.",           color: "#64d2ff", glow: "#b0e8ff" },
      { id: "KO", real: "Coca-Cola",   name: "Classic Cola",         desc: "Sells the same fizzy drink in nearly every country.",                color: "#ff453a", glow: "#ff9d97" },
      { id: "JNJ", real: "Johnson & Johnson",  name: "Bandage & Balm",       desc: "Medicine, baby shampoo, and half your bathroom cabinet.",            color: "#30d158", glow: "#8ff0ae" },
      { id: "XOM", real: "ExxonMobil",  name: "Giant Oil",            desc: "Pumps, refines, and sells oil around the world.",                    color: "#8e8e93", glow: "#c7c7cc" },
    ],
    moments: [
      mom(2, 4, "The bubble pops", "The internet dream meets its bill. Tech is falling, hard."),
      mom(33, 3, "The bottom", "Your $50 buys more shares than it ever has."),
      mom(93, 3, "New highs", "The market sets a record. Your steady months paid for it."),
    ],
    gates: [
      {
        atStep: 3,
        title: "Spring 2000",
        question: "Prices are falling. Your $50 arrives anyway. What is your plan?",
        context: [
          "Steady investors call this dollar cost averaging: the same money every month buys more shares when prices fall and fewer when they rise.",
          "The hard part is that the plan feels worst exactly when it is working best.",
        ],
        options: ["Keep investing every month", "Pause until things calm down"],
        refs: [{ label: "Dollar cost averaging", url: "https://en.wikipedia.org/wiki/Dollar_cost_averaging" }],
      },
      {
        atStep: 33,
        title: "October 2002",
        question: "The market is at its lowest in five years. Your $50 buys more shares than ever. Stick to the plan?",
        context: [
          "Nobody rings a bell at the bottom. The people who kept buying through 2002 bought their cheapest shares of the decade this month, and none of them knew it at the time.",
        ],
        options: ["Stick to the plan", "Skip this month"],
        refs: [{ label: "Dollar cost averaging", url: "https://en.wikipedia.org/wiki/Dollar_cost_averaging" }],
      },
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
    id: "gfc",
    lesson: "Lesson 4",
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
      { id: "C", real: "Citigroup",    name: "Mega Bank",           desc: "One of the biggest banks on earth. Everyone trusts it.",   color: "#30d158", glow: "#8ff0ae" },
      { id: "AIG", real: "AIG",  name: "The Insurance Giant", desc: "Insures the whole world, and some things it shouldn't.",   color: "#bf5af2", glow: "#e0a9ff" },
      { id: "F", real: "Ford",    name: "The Carmaker",        desc: "A hundred years of building cars.",                        color: "#a2845e", glow: "#d4b795" },
      { id: "GE", real: "General Electric",   name: "General Everything",  desc: "Engines, light bulbs, TVs, and loans.",                    color: "#ffd60a", glow: "#ffe97a" },
      { id: "WMT", real: "Walmart",  name: "Everything Mart",     desc: "Sells everything, cheap, in every town.",                  color: "#64d2ff", glow: "#b0e8ff" },
      { id: "AAPL", real: "Apple", name: "Fruit Computers",     desc: "Just launched a phone.",                                   color: "#0a84ff", glow: "#7cc0ff" },
      { id: "XOM", real: "ExxonMobil",  name: "Giant Oil",           desc: "Pumps, refines, and sells oil around the world.",          color: "#8e8e93", glow: "#c7c7cc" },
      { id: "AMZN", real: "Amazon", name: "The Everything Store", desc: "The online store that survived the last crash.",          color: "#ff9f0a", glow: "#ffcf7a" },
      { id: "LEH", real: "Lehman Brothers", name: "The Old Bank", desc: "A 158-year-old investment bank at the center of Wall Street.", color: "#5e5ce6", glow: "#a8a5f5" },
    ],
    moments: [
      mom(9, 3, "The top", "Stocks set a record. Houses only go up, people say."),
      mom(20, 4, "The panic", "A giant bank fails overnight. Everything is falling."),
      mom(26, 3, "The bottom", "Prices are half off, and almost no one wants to buy."),
      mom(62, 3, "Quiet recovery", "Slowly, prices heal."),
      mom(74, 3, "New highs", "The market passes its 2007 record."),
    ],
    gates: [
      {
        atStep: 20,
        title: "September 2008",
        question: "A 158-year-old bank just died overnight. What do you do before tomorrow's open?",
        context: [
          "The Old Bank survived the Civil War, two world wars, and the Great Depression. This weekend it ran out of money and nobody saved it. It is the largest bankruptcy in American history.",
          "Banks will not lend to each other. The evening news says the word crisis every night. Nobody knows which giant falls next.",
        ],
        options: ["Sell everything", "Hold and ride it out", "Buy while everyone is scared"],
        refs: [{ label: "The Lehman bankruptcy", url: "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers" }],
      },
      {
        atStep: 26,
        title: "March 2009",
        question: "Stocks are half price. Everyone says the system is broken. Do you believe the recovery?",
        context: [
          "The index has fallen by more than half from its 2007 record. Magazines ask whether capitalism is finished. This month turns out to be the exact bottom, and nobody calls it at the time.",
        ],
        options: ["Buy", "Hold", "Stay out"],
        refs: [{ label: "The 2008 financial crisis", url: "https://en.wikipedia.org/wiki/2007%E2%80%932008_financial_crisis" }],
      },
    ],
    startCash: 1000,
    fractionalDefault: false,
    briefTitle: "January 2007. Everything is going up, especially houses.",
    briefBody: [
      "You have $1,000 and nine years. Every price is real. Some of these giants will nearly die. One will not make it.",
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
      { id: "BTC-USD", real: "Bitcoin",  name: "Coin Alpha",    desc: "The first one. Digital gold, fans say.",        color: "#ff9f0a", glow: "#ffcf7a" },
      { id: "ETH-USD", real: "Ethereum",  name: "Coin Beta",     desc: "A world computer that runs on its own coin.",   color: "#bf5af2", glow: "#e0a9ff" },
      { id: "LTC-USD", real: "Litecoin",  name: "Coin Gamma",    desc: "A faster copy of the first one.",               color: "#8e8e93", glow: "#c7c7cc" },
      { id: "XRP-USD", real: "XRP",  name: "Coin Delta",    desc: "A coin that wants banks as customers.",         color: "#64d2ff", glow: "#b0e8ff" },
      { id: "DOGE-USD", real: "Dogecoin", name: "The Joke Coin", desc: "Started as a joke. Kept going anyway.",         color: "#ffd60a", glow: "#ffe97a" },
      { id: "BCC", real: "BitConnect", name: "The Promise Coin", desc: "Promises 1% a day, guaranteed, forever.",       color: "#ff375f", glow: "#ff8fa3" },
    ],
    moments: [
      mom(0, 3, "The hangover", "Coins just fell 60% from their peak. Winter one."),
      mom(1, 2, "The Promise Coin shuts down", "The coin that guaranteed riches is gone overnight."),
      mom(26, 3, "The covid crash", "Everything falls at once. Coins fall hardest."),
      mom(46, 3, "Coin mania", "Coins hit records. Your barber has a coin tip."),
      mom(58, 3, "Winter two", "Down three quarters from the top. Again."),
      mom(74, 3, "Records again", "The survivors set new highs."),
    ],
    gates: [
      {
        atStep: 46,
        title: "November 2021",
        question: "Coins are at all-time records and your barber has a tip. Do you add more?",
        context: [
          "Coin Alpha has multiplied thirty times over in three years. Stadiums are being renamed after coin companies. People post screenshots of life-changing profits every day.",
          "The rule of every mania so far: the louder the party, the closer the exit.",
        ],
        options: ["Buy more coins", "Take some profits", "Change nothing"],
        refs: [{ label: "The 2021 crypto bubble", url: "https://en.wikipedia.org/wiki/Cryptocurrency_bubble" }],
      },
      {
        atStep: 58,
        title: "November 2022",
        question: "Coins are down three quarters. Again. Was the first winter a lesson or a fluke?",
        context: [
          "A giant coin exchange just collapsed with its customers' money inside. This is the second 75 percent winter in five years. The boring stock index is down about a fifth.",
          "Position size is the difference between an investor who can wait and one who has to sell.",
        ],
        options: ["Sell what's left", "Hold", "Buy the winter"],
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