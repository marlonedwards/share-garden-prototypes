// The dot-com era, 2000 to 2007. This module is the reference example for
// era content: full scouting notes on every cast member and a complete
// briefing page. Eight of the ten series are real market prices; the two
// casualties, WCOM and ETYS, are delisted series reconstructed from the
// dated record (docs/course-style.md, "Standards and honesty"), and the
// briefing, the scenario copy, and their scouting cards all say so. Names
// are abstracted with real names behind the existing toggle. Scouting notes
// are written strictly as of January 2000, in the style contract's voice.
import eraDotcom from "../data/eraDotcom.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";

export const dotcom: ScenarioConfig = {
  id: "dotcom",
  lesson: "Lesson 2",
  title: "The Dot-Com Era",
  headerSub: "the bubble and its bill, 2000 to 2007",
  cardLine: "Real market prices run from the top of the bubble in 2000 through 2007, and the two companies that die along the way are reconstructed from the dated record. The names are made up; the companies were not.",
  learn: "This era shows why buying at the top hurts, and what patience pays anyway.",
  dots: ["#ff9f0a", "#64d2ff", "#bf5af2", "#ffd60a", "#ff453a", "#30d158"],
  time: "about 7 minutes",
  dataset: eraDotcom as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It holds the real S&P 500, sealed at the start.",
  assets: [
    {
      id: "AMZN", real: "Amazon", name: "The Everything Store",
      desc: "It sells books on the internet, and it says it will sell everything one day.",
      color: "#ff9f0a", glow: "#ffcf7a",
      founded: 1994,
      history: "It opened as an online bookstore in 1995, and now it sells music, movies, toys, and electronics too. Its sales nearly double every year, and it has never once earned a profit.",
      believers: "It is building the store that will sell everything, and profits can wait until that race is won.",
      doubters: "It has promised profits for five years and delivered only bigger losses. A store that always loses money cannot be worth billions.",
    },
    {
      id: "AAPL", real: "Apple", name: "Fruit Computers",
      desc: "It makes stylish computers, and it might be a comeback story.",
      color: "#0a84ff", glow: "#7cc0ff",
      founded: 1976,
      history: "It nearly ran out of money in 1997, before its founder returned to run it again. Its colorful new desktop computer sold well, and the company earns a profit once more.",
      believers: "Nobody else designs machines people actually love, and this comeback is only getting started.",
      doubters: "It holds a tiny slice of the computer market, and the world's offices standardized on its rival's software years ago.",
    },
    {
      id: "MSFT", real: "Microsoft", name: "Colossus Software",
      desc: "Its software runs almost every office computer on earth.",
      color: "#64d2ff", glow: "#b0e8ff",
      founded: 1975,
      history: "Its operating system runs on more than nine of every ten personal computers, and it recently became the most valuable company in the world.",
      believers: "Every new computer on earth pays it a toll, and no competitor has ever loosened its grip.",
      doubters: "The government has taken it to court for using its power to crush rivals, and a judge has already found that it did exactly that.",
    },
    {
      id: "CSCO", real: "Cisco", name: "Router Works",
      desc: "It builds the boxes and wires that connect the internet.",
      color: "#bf5af2", glow: "#e0a9ff",
      founded: 1984,
      history: "It sells the routers and switches that carry internet traffic, and its sales have grown quarter after quarter without a single miss.",
      believers: "It does not matter which websites win, because every one of them runs on this company's equipment.",
      doubters: "The price already assumes decades of perfect growth, and many of its customers are startups spending borrowed money.",
    },
    {
      id: "INTC", real: "Intel", name: "Chipworks",
      desc: "It makes the chips inside most of the world's computers.",
      color: "#ffd60a", glow: "#ffe97a",
      founded: 1968,
      history: "Its processors sit inside most of the world's personal computers, and it has led the chip business for decades.",
      believers: "The internet runs on computers, and computers run on its chips. More internet means more of both.",
      doubters: "Computers are turning into cheap commodities, and cheap machines leave less room for an expensive chip inside.",
    },
    {
      id: "KO", real: "Coca-Cola", name: "Classic Cola",
      desc: "It sells the same fizzy drink in nearly every country.",
      color: "#ff453a", glow: "#ff9d97",
      founded: 1886,
      history: "It has sold the same drink for more than a century, and it reaches nearly every country on earth. Its stock has drifted sideways while internet stocks soared past it.",
      believers: "People drink it in booms and in busts, and a century of habit is very hard to break.",
      doubters: "A sugar water company cannot grow much anymore, and this decade belongs to technology.",
    },
    {
      id: "JNJ", real: "Johnson & Johnson", name: "Bandage & Balm",
      desc: "It makes medicine, baby shampoo, and half of what is in your bathroom cabinet.",
      color: "#30d158", glow: "#8ff0ae",
      founded: 1886,
      history: "It sells medicine, bandages, and baby shampoo, and it has raised its dividend every single year for decades.",
      believers: "People need medicine in every kind of economy, and boring products pay steady bills.",
      doubters: "It is a slow old giant, and slow old giants are exactly what this new economy is leaving behind.",
    },
    {
      id: "XOM", real: "ExxonMobil", name: "Giant Oil",
      desc: "It pumps, refines, and sells oil around the world.",
      color: "#8e8e93", glow: "#c7c7cc",
      founded: 1870,
      history: "It descends from the original Standard Oil, and it just merged with a rival to become the biggest oil company in the world.",
      believers: "The whole world still runs on oil, and the biggest producer earns money at almost any price.",
      doubters: "Oil is the old economy in a barrel, and nobody at an internet party wants to talk about it.",
    },
    {
      id: "WCOM", real: "WorldCom", name: "The Phone Giant",
      desc: "It wires phone calls and internet traffic across the country, and Wall Street loves it.",
      color: "#5e5ce6", glow: "#a8a5f5",
      founded: 1983,
      reconstructed: true,
      history: "It grew from a small long-distance reseller into a telephone and internet giant by buying dozens of rivals. Wall Street's most famous telecom analyst calls it a must-own stock.",
      believers: "Internet traffic is exploding, and this company owns the wires it travels on.",
      doubters: "A few doubters ask how the profits stay so smooth through so many messy mergers. Almost nobody listens to them.",
    },
    {
      id: "ETYS", real: "eToys", name: "The Online Toy Store",
      desc: "It sells toys on the internet. It is growing fast and losing money faster.",
      color: "#ff6482", glow: "#ffa8bb",
      founded: 1996,
      reconstructed: true,
      history: "It sells toys on the internet, and its shares nearly quadrupled on their first day of trading in 1999. Last Christmas some orders arrived late, and its losses are growing faster than its sales.",
      believers: "Parents will never fight a mall crowd again once they have shopped from the couch.",
      doubters: "It loses money on every package it ships, and the giant toy chains are building websites of their own.",
    },
  ],
  moments: [
    mom(0, 2, "Dot-com mania", "Internet stocks have gone vertical. Everyone has a hot tip."),
    mom(2, 4, "The bubble pops", "The internet dream meets its bill. Tech is falling, hard."),
    mom(20, 3, "September 2001", "Markets close for four trading days, then drop. Fear is everywhere."),
    mom(30, 3, "The fraud", "The Phone Giant admits its profits were made up. It is not coming back."),
    mom(33, 3, "The bottom", "Prices have fallen for three brutal years. Most sellers are done."),
    mom(41, 4, "The climb back", "Quietly, prices are rising again."),
    mom(93, 3, "New highs", "After five years of recovery, the market sets a record."),
  ],
  gates: [
    // CEE Investing 12-5b ladder (expectations are already in the price);
    // concept: bubble
    {
      atStep: 1,
      title: "February 2000",
      question: "The internet party is at its loudest. Where does your $1,000 go?",
      eyebrow: "A bubble",
      definition: "A bubble is a price that has run far ahead of the real business, held up only by the belief that somebody will pay more tomorrow.",
      context: [
        "Internet stocks have multiplied five times over in five years, magazines say the old rules are dead, and companies with no profits are worth billions.",
        "A few loud skeptics point out that many of these companies lose money on every sale, and that a price this high needs new buyers arriving forever. The magazines call those skeptics dinosaurs who do not understand the new economy.",
      ],
      options: [{ label: "All-in on the hottest tech", act: true }, { label: "Spread across everything", act: true }, { label: "Wait in cash" }],
      refs: [{ label: "The dot-com bubble", url: "https://en.wikipedia.org/wiki/Dot-com_bubble" }],
    },
    // CEE Investing 12-5b ladder (expectations are already in the price, and
    // a falling price is not evidence of a bargain); concept: crash
    {
      atStep: 3,
      title: "April 2000",
      question: "Tech just had its worst week on record. What do you do with your plan?",
      eyebrow: "A dip",
      definition: "A dip is a fast fall from a recent high, and a lower price is only a bargain if the business behind it is worth more than that price.",
      context: [
        "The Nasdaq, the exchange where most technology stocks trade, just fell 25% in five days, its worst week on record, and the hottest names now sit far below their March peaks.",
        "For five straight years, every dip in technology stocks has turned out to be a buying chance, and television is full of people saying this one is no different. A chart cannot settle the argument, because a chart only shows what people paid, not what the companies earn.",
      ],
      options: [{ label: "Buy the dip in tech", act: true }, { label: "Hold what I have" }, { label: "Get out of tech", act: true }],
      refs: [{ label: "The dot-com bubble", url: "https://en.wikipedia.org/wiki/Dot-com_bubble" }],
    },
    // CEE Investing 12-5c ladder (downturns and investor mood); concept:
    // panic-selling
    {
      atStep: 20,
      title: "September 2001",
      question: "The market just reopened after four dark days. What do you do?",
      eyebrow: "Panic selling",
      definition: "Panic selling is selling an investment during a fall because fear is making the decision instead of the plan.",
      context: [
        "After the attacks of September 11, the stock market stayed closed for four trading days, its longest pause since 1933. When it reopened on September 17, the Dow, the market's most famous stock average, fell 684 points, its biggest one-day point drop up to that date.",
        "By Friday the week's losses reach about 14 percent, the Dow's worst week since 1933. Nobody watching tonight's news knows what next month holds. That is exactly the condition under which every panic seller in history has sold.",
      ],
      options: [{ label: "Sell and wait for calm", act: true }, { label: "Hold and stick to the plan" }, { label: "Buy while others flee", act: true }],
      refs: [{ label: "The economic effects of September 11", url: "https://en.wikipedia.org/wiki/Economic_effects_of_the_September_11_attacks" }],
    },
    // CEE Investing 8-4 (risks of owning single stocks; a fraud is invisible
    // in the reported numbers); concept: survivorship
    {
      atStep: 29,
      title: "June 2002",
      question: "The Phone Giant just admitted its profits were invented. What now?",
      eyebrow: "A fraud",
      definition: "A fraud is a company publishing invented numbers, and no chart can warn you about one, because the chart is drawn from the very numbers being invented.",
      context: [
        "The Phone Giant has just admitted hiding $3.8 billion of costs to make fake profits look real. The smooth earnings its doubters could never explain were smooth because they were fiction.",
        "The stock that traded above $60 three years ago now sells for about a dollar, and Wall Street's most famous telecom analyst called it a must-own for most of the ride down. Every company's numbers suddenly feel less trustworthy, and honest businesses are falling alongside the guilty one.",
      ],
      options: [{ label: "Sell what is left of the Phone Giant", act: true }, { label: "Hold and hope it survives" }, { label: "Spread the rest across more companies", act: true }],
      refs: [{ label: "The WorldCom scandal", url: "https://en.wikipedia.org/wiki/WorldCom_scandal" }],
    },
    // CEE Investing 12-5c ladder (downturns move asset prices, and nobody
    // rings a bell at the bottom); concept: crash
    {
      atStep: 33,
      title: "October 2002",
      question: "Prices have fallen for three years. What is your next move?",
      eyebrow: "A bear market",
      definition: "A bear market is a long stretch of falling prices that turns almost everyone against owning stocks.",
      context: [
        "The index has fallen about 40 percent from its 2000 high. The Phone Giant is gone in the biggest bankruptcy in American history. People who bragged about stocks in 2000 now call the market a casino.",
        "A share bought after a crash costs less, but it never feels cheap at the time. Every dollar invested this month buys about one and a half times the shares it did at the start of 2000, and it still feels like catching a falling knife.",
      ],
      options: [{ label: "Buy while it's cheap", act: true }, { label: "Hold what I have" }, { label: "Sell before it gets worse", act: true }],
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
    "You have $1,000 and eight years. The names are made up; the companies were not, and not every name on this menu makes it to 2008.",
    "The rainbow orb puts the same $1,000 all-in on the real S&P 500. Eight of the ten series are the era's real quotes, and two are reconstructed from the dated record.",
  ],
  startLabel: "Start in 2000",
  endTitle: "December 2007. You bought the top of a bubble and lived to tell it.",
  bullets: [
    { c: "#bf5af2", text: "The hottest tech names of 2000 all lost money over these eight years. The boring ones quietly won." },
    { c: "#ff9f0a", text: "The Everything Store fell hard, then ended the era up. Impatience gets punished before good businesses do." },
    { c: "#30d158", text: "Two names on this menu went to zero and stayed there. The real 2000 menu held thousands more like them. Charts of the past only show the survivors: that trick is called survivorship bias." },
  ],
  cardSubline: "This run lived the dot-com era, 2000 to 2007, on real prices.",
  // CEE Investing 12-5b ladder (expectations are already in the price) and
  // 12-5c ladder (downturns move asset prices); the briefing is the era's
  // documentary record, so its timeline honestly includes the ending
  briefing: {
    title: "The world of January 2000",
    deck: "This page holds two minutes of real history. Nothing here is required reading, and the dated timeline near the end tells you how the era turns out.",
    readTime: "about 2 minutes",
    sections: [
      {
        heading: "The party",
        lead: "A bubble is a price that has run far ahead of the real business, held up only by the belief that somebody will pay more tomorrow.",
        body: [
          "In January 2000, the internet is the biggest story in the world. The Nasdaq, the exchange where most technology stocks trade, has multiplied five times over in five years. Companies with no profits are valued in the billions because of what they might become.",
          "Magazines say the old rules of investing are dead. Ordinary people are quitting their jobs to trade stocks from home, and a hot tip from a stranger does not sound strange this winter.",
        ],
      },
      {
        heading: "The believers",
        lead: "Every market price is the score of an argument between people buying and people selling.",
        body: [
          "The believers argue that the internet will change shopping, work, and news forever, and about the technology they are mostly right. The change they describe really happens over the years ahead.",
          "Being right about a technology and being right about a price turn out to be two different things. This era is the most expensive proof of that difference in market history.",
        ],
      },
      {
        heading: "The doubters",
        lead: "A skeptic is an investor who asks what a price already assumes before agreeing to pay it.",
        body: [
          "A few loud skeptics point out that many internet companies lose money on every sale, and that a price this high needs new buyers arriving forever. In March 2000, the financial weekly Barron's counts how many months the internet companies have left before their cash runs out.",
          "The crowd calls these skeptics dinosaurs who do not understand the new economy. Within a year, most of the companies on that cash-burn list are gone.",
        ],
      },
      {
        heading: "What you will live through",
        lead: "A fair replay of history includes the companies that died, not just the ones that survived.",
        body: [
          "Eight of the ten names on your menu carry real market prices, month by month from January 2000 to December 2007. The Phone Giant and The Online Toy Store were real companies too, but their shares stopped trading when they collapsed, so their price series are reconstructed from the dated record of their rise and their fall. Neither one survives to 2008.",
          "The names are made up, and the companies behind them were not. You will live through a crash, a fraud, a long bear market, and a slow recovery, and at five crossroads the tape will pause and ask what you would have done. The rainbow orb rides beside you the whole way: it holds the real S&P 500, an index that bundles five hundred large American companies into one purchase, and it never trades once.",
        ],
      },
    ],
    timeline: [
      { date: "March 10, 2000", text: "The Nasdaq peaks at 5,048. It does not see that number again for fifteen years." },
      { date: "April 14, 2000", text: "The Nasdaq caps its worst week ever as the bubble deflates." },
      { date: "March 7, 2001", text: "The most hyped online toy store of the boom files for bankruptcy." },
      { date: "September 11, 2001", text: "Markets close for four trading days after the attacks, then fall when they reopen." },
      { date: "July 21, 2002", text: "The telephone giant files the largest bankruptcy in American history after admitting its profits were made up." },
      { date: "October 9, 2002", text: "The S&P 500 closes at its low, down about half from its 2000 peak." },
      { date: "October 9, 2007", text: "The S&P 500 closes at a new record, five years to the day after the bottom." },
    ],
    sources: [
      { label: "The dot-com bubble", url: "https://en.wikipedia.org/wiki/Dot-com_bubble" },
      { label: "The 2002 downturn", url: "https://en.wikipedia.org/wiki/Stock_market_downturn_of_2002" },
      { label: "The economic effects of September 11", url: "https://en.wikipedia.org/wiki/Economic_effects_of_the_September_11_attacks" },
      { label: "The WorldCom scandal", url: "https://en.wikipedia.org/wiki/WorldCom_scandal" },
    ],
  },
};
