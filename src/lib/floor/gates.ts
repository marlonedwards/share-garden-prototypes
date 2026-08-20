// The Floor's gates: two or three authored months per era where the tape stops
// and asks. Contract: docs/floor-spec.md section 3.
//
// Every headline here is a real archived one, carried from src/data/headlinePool.ts
// with its publication and date, so the pause is a moment that happened rather
// than a moment written. The situation line is one sentence in the era voice,
// reusing the framing of src/content/era-*.ts where the timing game can use it.
// Both choices are actions: one trades through the ordinary engine at the live
// price, the other declines, and both are quoted back in the debrief with what
// the price did afterwards.

import { EraId, Ticker } from "../tape/engine";

export type GateAct =
  | { kind: "sell-all" }
  | { kind: "sell"; ticker: Ticker }
  | { kind: "buy"; ticker: Ticker }
  | { kind: "hold" };

export interface GateChoice {
  label: string;
  act: GateAct;
}

export interface FloorGate {
  id: string;
  era: EraId;
  month: string;             // the era month the tape stops on
  headline: string;
  source: string;
  date: string;
  situation: string;         // one sentence, present tense
  watch: string;             // the ticker, or "market", the aftermath reads
  choices: [GateChoice, GateChoice];
}

// Six months is the aftermath window: long enough that the market has answered,
// short enough that the answer is still about this decision.
export const AFTER_MONTHS = 6;

export const GATES: FloorGate[] = [
  // The 2020s ---------------------------------------------------------------
  {
    id: "covid-crash",
    era: "covid",
    month: "2020-03",
    headline: "Wall Street Suffers Worst Rout Since Black Monday",
    source: "The New York Times",
    date: "March 12, 2020",
    situation: "The world is closing and the market has fallen by a third in thirty three days.",
    watch: "market",
    choices: [
      { label: "Sell it all", act: { kind: "sell-all" } },
      { label: "Ride it out", act: { kind: "hold" } },
    ],
  },
  {
    id: "covid-meme",
    era: "covid",
    month: "2021-01",
    headline: "'Dumb Money' Is on GameStop, and It's Beating Wall Street at Its Own Game",
    source: "The New York Times",
    date: "January 27, 2021",
    situation: "The mall game store is up about seventeen fold this month and the crowd says it is going higher.",
    watch: "GME",
    choices: [
      { label: "Buy GameStop", act: { kind: "buy", ticker: "GME" } },
      { label: "Stay put", act: { kind: "hold" } },
    ],
  },
  {
    id: "covid-unwind",
    era: "covid",
    month: "2022-01",
    headline: "Peloton to halt production of its Bikes, treadmills as demand wanes",
    source: "CNBC",
    date: "January 20, 2022",
    situation: "The companies people bought for staying home are falling while the rest of the market wobbles.",
    watch: "PTON",
    choices: [
      { label: "Sell it all", act: { kind: "sell-all" } },
      { label: "Ride it out", act: { kind: "hold" } },
    ],
  },

  // The inflation years -----------------------------------------------------
  {
    id: "inflation-first",
    era: "inflation",
    month: "2021-05",
    headline: "Inflation speeds up in April as consumer prices leap 4.2%",
    source: "CNBC",
    date: "May 12, 2021",
    situation: "Prices are climbing faster than they have since 2008 and officials call it temporary.",
    watch: "XOM",
    choices: [
      { label: "Buy ExxonMobil", act: { kind: "buy", ticker: "XOM" } },
      { label: "Stay put", act: { kind: "hold" } },
    ],
  },
  {
    id: "inflation-hike",
    era: "inflation",
    month: "2022-03",
    headline: "Federal Reserve approves first interest rate hike in more than three years, sees six more ahead",
    source: "CNBC",
    date: "March 16, 2022",
    situation: "Borrowing is about to get more expensive for everyone, governments included.",
    watch: "TLT",
    choices: [
      { label: "Sell the bond fund", act: { kind: "sell", ticker: "TLT" } },
      { label: "Hold the bond fund", act: { kind: "hold" } },
    ],
  },
  {
    id: "inflation-bottom",
    era: "inflation",
    month: "2022-09",
    headline: "S&P 500 notches new closing low for 2022, Dow falls into bear market as dollar surges",
    source: "CNBC",
    date: "September 26, 2022",
    situation: "Stocks and bonds have fallen together for nine months and cash finally pays interest again.",
    watch: "market",
    choices: [
      { label: "Sell it all", act: { kind: "sell-all" } },
      { label: "Ride it out", act: { kind: "hold" } },
    ],
  },

  // The crash ---------------------------------------------------------------
  {
    id: "gfc-record",
    era: "gfc",
    month: "2007-10",
    headline: "Dow, S&P break records",
    source: "CNNMoney",
    date: "October 9, 2007",
    situation: "The market has just closed at an all time record and houses have climbed for years.",
    watch: "C",
    choices: [
      { label: "Buy Citigroup", act: { kind: "buy", ticker: "C" } },
      { label: "Stay put", act: { kind: "hold" } },
    ],
  },
  {
    id: "gfc-lehman",
    era: "gfc",
    month: "2008-09",
    headline: "After Frantic Day, Wall St. Banks Falter",
    source: "The New York Times",
    date: "September 15, 2008",
    situation: "A bank that stood for a hundred and fifty eight years died overnight.",
    watch: "market",
    choices: [
      { label: "Sell it all", act: { kind: "sell-all" } },
      { label: "Ride it out", act: { kind: "hold" } },
    ],
  },
  {
    id: "gfc-bottom",
    era: "gfc",
    month: "2009-03",
    headline: "Holding On for Dear Life",
    source: "Time",
    date: "March 9, 2009",
    situation: "Stocks are half price and everyone says the system itself is broken.",
    watch: "AAPL",
    choices: [
      { label: "Buy Apple", act: { kind: "buy", ticker: "AAPL" } },
      { label: "Stay put", act: { kind: "hold" } },
    ],
  },

  // The dot-com bust --------------------------------------------------------
  {
    id: "dotcom-burning",
    era: "dotcom",
    month: "2000-03",
    headline: "Burning Up",
    source: "Barron's",
    date: "March 20, 2000",
    situation: "A magazine has counted how many months of cash the internet companies have left.",
    watch: "market",
    choices: [
      { label: "Sell it all", act: { kind: "sell-all" } },
      { label: "Ride it out", act: { kind: "hold" } },
    ],
  },
  {
    id: "dotcom-reopen",
    era: "dotcom",
    month: "2001-09",
    headline: "Stocks Suffer Steep Losses, but Investors Resist Panic",
    source: "The New York Times",
    date: "September 18, 2001",
    situation: "The market has just reopened after four days shut.",
    watch: "market",
    choices: [
      { label: "Sell it all", act: { kind: "sell-all" } },
      { label: "Ride it out", act: { kind: "hold" } },
    ],
  },
  {
    id: "dotcom-fraud",
    era: "dotcom",
    month: "2002-06",
    headline: "The death of confidence",
    source: "CNN/Money",
    date: "June 26, 2002",
    situation: "WorldCom has admitted that billions of its profits were invented.",
    watch: "WCOM",
    choices: [
      { label: "Sell WorldCom", act: { kind: "sell", ticker: "WCOM" } },
      { label: "Hold WorldCom", act: { kind: "hold" } },
    ],
  },

  // The crypto winter -------------------------------------------------------
  {
    id: "crypto-promise",
    era: "crypto",
    month: "2018-02",
    headline: "BitConnect Shutters Crypto Exchange Site After Regulator Warnings",
    source: "CoinDesk",
    date: "January 17, 2018",
    situation: "The coin that promised one percent a day has closed the place you would sell it.",
    watch: "BCC",
    choices: [
      { label: "Sell BitConnect", act: { kind: "sell", ticker: "BCC" } },
      { label: "Hold BitConnect", act: { kind: "hold" } },
    ],
  },
  {
    id: "crypto-top",
    era: "crypto",
    month: "2021-11",
    headline: "Bitcoin Soars Past $68K for the First Time as Ether Also Sets Record High",
    source: "CoinDesk",
    date: "November 9, 2021",
    situation: "Bitcoin has just touched a record and everyone you know has a tip.",
    watch: "BTC-USD",
    choices: [
      { label: "Buy Bitcoin", act: { kind: "buy", ticker: "BTC-USD" } },
      { label: "Stay put", act: { kind: "hold" } },
    ],
  },
  {
    id: "crypto-ftx",
    era: "crypto",
    month: "2022-11",
    headline: "FTX Files for Bankruptcy Protection in US; CEO Bankman-Fried Resigns",
    source: "CoinDesk",
    date: "November 11, 2022",
    situation: "The largest exchange in the business has run out of other people's money.",
    watch: "BTC-USD",
    choices: [
      { label: "Sell it all", act: { kind: "sell-all" } },
      { label: "Ride it out", act: { kind: "hold" } },
    ],
  },
];

export function gatesFor(era: EraId): FloorGate[] {
  return GATES.filter((g) => g.era === era);
}
