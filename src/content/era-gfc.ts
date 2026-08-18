// The 2008 crash, 2007 to 2015. Eight of the nine series are real market
// prices; the casualty, LEH, is a delisted series reconstructed from the
// dated record (docs/course-style.md, "Standards and honesty"), and the
// briefing, the scenario copy, and its scouting card all say so. Names are
// abstracted with real names behind the existing toggle. Scouting notes are
// written strictly as of January 2007, in the style contract's voice.
// Dated facts verified against the record: S&P 500 record close 1,565.15 on
// October 9, 2007; Bear Stearns sold for about $2 a share on March 16, 2008
// (its stock peaked above $170 in January 2007, about $172 on January 12);
// Lehman bankruptcy September 15, 2008; the $85 billion AIG loan September
// 16, 2008; the 777-point Dow drop September 29, 2008; the 676.53 bottom
// March 9, 2009; GE's first dividend cut since 1938 on February 27, 2009;
// Ford's $12.7 billion 2006 loss and $23 billion secured borrowing; the new
// S&P 500 record close 1,569.19 on March 28, 2013.
import eraGfc from "../data/eraGfc.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";

export const gfc: ScenarioConfig = {
  id: "gfc",
  lesson: "Lesson 4",
  title: "The 2008 crash",
  headerSub: "The crash and the recovery, 2007 to 2015",
  cardLine: "Real market prices run from the 2007 top through the crash and the recovery to 2015.",
  learn: "What a real panic feels like.",
  dots: ["#30d158", "#bf5af2", "#a2845e", "#ffd60a", "#0a84ff", "#ff9f0a"],
  time: "about 7 minutes",
  dataset: eraGfc as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It holds the real S&P 500, sealed at the start.",
  assets: [
    {
      id: "C", real: "Citigroup", name: "Mega Bank",
      desc: "It is one of the biggest banks on earth, and everyone trusts it.",
      color: "#30d158", glow: "#8ff0ae",
      founded: 1812,
      history: "It grew from a New York bank founded in 1812 into the largest financial company in the world, with customers in more than a hundred countries. Its profits last year were among the biggest any bank has ever reported.",
      believers: "It banks the whole planet, and a company this large and this profitable has nothing left to prove.",
      doubters: "It has bolted together so many businesses that even its own executives struggle to explain them all, and its costs are growing faster than its sales.",
    },
    {
      id: "AIG", real: "AIG", name: "The Insurance Giant",
      desc: "It insures the whole world, and some things it should not.",
      color: "#bf5af2", glow: "#e0a9ff",
      founded: 1919,
      history: "It began as a small insurance agency in Shanghai in 1919 and grew into the largest insurance company in the world. Two years ago an accounting scandal forced out the chief who built it, and the company had to correct years of its own numbers.",
      believers: "People and businesses on every continent pay it premiums in good times and bad, and that river of money has flowed for almost ninety years.",
      doubters: "A small unit in London has sold insurance on complicated mortgage bets, and nobody outside the company can tell how large that promise has grown.",
    },
    {
      id: "F", real: "Ford", name: "The Carmaker",
      desc: "It has been building cars for a hundred years.",
      color: "#a2845e", glow: "#d4b795",
      founded: 1903,
      history: "It put America on wheels, and it just reported the worst yearly loss in its history, $12.7 billion. Its new chief arrived from an airplane maker and borrowed more than $23 billion, pledging nearly everything the company owns, even its famous blue oval logo.",
      believers: "The new chief has a plan and a borrowed war chest, and a hundred-year-old brand does not die easily.",
      doubters: "It loses money on many of the cars it builds, and drivers keep switching to its foreign rivals year after year.",
    },
    {
      id: "GE", real: "General Electric", name: "General Everything",
      desc: "It makes engines, light bulbs, TVs, and loans.",
      color: "#ffd60a", glow: "#ffe97a",
      founded: 1892,
      history: "It descends from Thomas Edison's original electric company, and today it builds jet engines, power turbines, medical scanners, and television shows. About half of its profit now comes from its giant lending arm.",
      believers: "It has paid a dividend for more than a century, and its managers are studied in business schools as the best in the world.",
      doubters: "Half of its profit comes from a lending business that works like a bank without being watched like one, and few outsiders can see what is inside it.",
    },
    {
      id: "WMT", real: "Walmart", name: "Everything Mart",
      desc: "It sells everything, cheap, in every town.",
      color: "#64d2ff", glow: "#b0e8ff",
      founded: 1962,
      history: "It grew from one discount store in Arkansas in 1962 into the biggest retailer on earth, and it rings up more sales than any other company in the world. Its stock has drifted sideways for years while the business kept growing.",
      believers: "When money gets tight, shoppers trade down to the cheapest store in town, and this is the cheapest store in town.",
      doubters: "It has already built a store near almost everyone in America, and a company this size has little room left to grow.",
    },
    {
      id: "AAPL", real: "Apple", name: "Fruit Computers",
      desc: "It just launched a phone.",
      color: "#0a84ff", glow: "#7cc0ff",
      founded: 1976,
      history: "Its little music player conquered the world and pulled the company back from near death. This very January, its founder walked on stage and announced a telephone.",
      believers: "The company that made a thousand songs fit in your pocket is about to reinvent the phone the same way.",
      doubters: "Phones are a brutal, low-margin business ruled by giants, and a computer company with no phone experience will never take real market share.",
    },
    {
      id: "XOM", real: "ExxonMobil", name: "Giant Oil",
      desc: "It pumps, refines, and sells oil around the world.",
      color: "#8e8e93", glow: "#c7c7cc",
      founded: 1870,
      history: "It descends from the original Standard Oil, and it is the most valuable company in the world. Its yearly profit is the largest any American company has ever reported.",
      believers: "A growing world burns more oil every year, and nobody pumps it and sells it more profitably than this company.",
      doubters: "Its fortune rises and falls with the price of a barrel, and a company already this big has few surprises left in it.",
    },
    {
      id: "AMZN", real: "Amazon", name: "The Everything Store",
      desc: "It is the online store that survived the last crash.",
      color: "#ff9f0a", glow: "#ffcf7a",
      founded: 1994,
      history: "It survived the dot-com crash that killed most online stores, and it finally earns a steady profit. Two years ago it launched a membership that ships almost anything in two days for one yearly fee.",
      believers: "It kept building the store that sells everything while its rivals died, and the hard part is behind it.",
      doubters: "It keeps its profits razor thin by pouring every dollar into warehouses and free shipping, and its stock still sits far below its 1999 peak.",
    },
    {
      id: "LEH", real: "Lehman Brothers", name: "The Old Bank",
      desc: "It is a 157-year-old investment bank at the center of Wall Street.",
      color: "#5e5ce6", glow: "#a8a5f5",
      founded: 1850,
      reconstructed: true,
      history: "It began by trading cotton in Alabama in 1850 and grew into the fourth-largest investment bank on Wall Street. It just reported the best year in its history, and much of that money came from bundling home mortgages and selling the bundles to investors.",
      believers: "It has outlived the Civil War, two world wars, and the Great Depression, and it is earning more money than ever.",
      doubters: "It runs on borrowed money, owing roughly thirty dollars for every dollar of its own, and its record profits depend on the housing boom continuing.",
    },
  ],
  moments: [
    mom(9, 3, "The top", "Stocks set a record. Houses only go up, people say."),
    mom(14, 3, "A giant stumbles", "An 85-year-old investment bank is rescued in a single weekend."),
    mom(20, 4, "The panic", "A giant bank fails overnight. Everything is falling."),
    mom(26, 3, "The bottom", "Prices are half off, and almost no one wants to buy."),
    mom(62, 3, "Quiet recovery", "Slowly, prices heal."),
    mom(74, 3, "New highs", "The market passes its 2007 record."),
  ],
  gates: [
    // CEE Investing 12-5b ladder (expectations are already in the price);
    // concept: bubble
    {
      atStep: 9,
      title: "October 2007",
      question: "The market just closed at an all-time record. Houses have climbed for years. What do you do?",
      eyebrow: "Record highs",
      definition: "A record high is simply a price higher than any price before it, and by itself it says nothing about what comes next.",
      context: [
        "The index set a new record this month. American house prices have nearly doubled since 2000, and millions of families have borrowed against homes they believe can only rise.",
        "There are cracks for anyone who looks. Two mortgage funds at a big investment bank collapsed this summer, and more families miss their house payments every month. The officials in charge say the trouble is contained.",
      ],
      options: [{ label: "Take profits, move to cash", act: true }, { label: "Keep holding everything" }, { label: "Buy more while it climbs", act: true }],
      refs: [{ label: "The housing bubble", url: "https://en.wikipedia.org/wiki/2000s_United_States_housing_bubble" }],
    },
    // CEE Investing 8-4 (risks of owning single stocks), reaching into the
    // 12-5c ladder (downturns move asset prices); concept: crash
    {
      atStep: 14,
      title: "March 2008",
      question: "An 85-year-old investment bank just sold itself for almost nothing in a single weekend. Warning shot or one-off?",
      eyebrow: "Bank runs",
      definition: "A bank run happens when everyone who lent a bank money asks for it back at once, and no bank on earth can pay everybody on the same day.",
      context: [
        "That is what just happened to an 85-year-old investment bank. Its lenders and customers pulled their money in a single week, and by Sunday night it agreed to sell itself for about two dollars a share, a price that was above one hundred and seventy dollars at its 2007 peak.",
        "The government helped arrange the rescue so the panic would stop there. Officials repeat that the trouble is contained, the market sits well below its October record, and plenty of confident people are calling this the bottom.",
      ],
      options: [{ label: "Sell my bank stocks", act: true }, { label: "Hold everything" }, { label: "Buy the fear", act: true }],
      refs: [{ label: "The fall of Bear Stearns", url: "https://en.wikipedia.org/wiki/Bear_Stearns" }],
    },
    // CEE Investing 12-5c ladder (downturns and investor mood); concept:
    // panic-selling
    {
      atStep: 20,
      title: "September 2008",
      question: "A 158-year-old bank just died overnight. What do you do before tomorrow's open?",
      eyebrow: "Panic selling",
      definition: "Panic selling is selling because the fall scares you, not because the business you own has changed.",
      context: [
        "The Old Bank survived the Civil War, two world wars, and the Great Depression. This weekend it ran out of money, and nobody saved it. It is the largest bankruptcy in American history.",
        "The day after it died, the government lent $85 billion to The Insurance Giant to keep it breathing, and took most of its ownership in return. Two weeks later, Congress voted down a rescue plan and the market had its biggest one-day point drop ever. Banks will not lend to each other, and nobody knows which giant falls next.",
      ],
      options: [{ label: "Sell everything", act: true }, { label: "Hold and ride it out" }, { label: "Buy while everyone is scared", act: true }],
      refs: [
        { label: "The Lehman bankruptcy", url: "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers" },
        { label: "The AIG rescue", url: "https://en.wikipedia.org/wiki/American_International_Group" },
      ],
    },
    // CEE Investing 12-5c ladder (downturns move asset prices, and nobody
    // rings a bell at the bottom); concept: crash
    {
      atStep: 26,
      title: "March 2009",
      question: "Stocks are half price. Everyone says the system is broken. What do you do?",
      eyebrow: "Market bottoms",
      definition: "A market bottom is the moment prices stop falling, and nobody can see one except by looking back.",
      context: [
        "The index has fallen by more than half from its 2007 record. Magazines ask whether capitalism is finished, and serious people argue that prices could fall by half again from here.",
        "Shares of one of the biggest banks in the country have traded under one dollar. The oldest industrial giant just cut its dividend for the first time since 1938. Every dollar invested this month buys twice the index it bought at the record, and it does not feel like a bargain. It feels like the end of the world.",
      ],
      options: [{ label: "Buy", act: true }, { label: "Hold" }, { label: "Stay out" }],
      refs: [
        { label: "The 2008 financial crisis", url: "https://en.wikipedia.org/wiki/2007%E2%80%932008_financial_crisis" },
        { label: "The 2007 to 2009 bear market", url: "https://en.wikipedia.org/wiki/United_States_bear_market_of_2007%E2%80%932009" },
      ],
    },
    // CEE Investing 12-5c ladder (downturns move asset prices, and recoveries
    // are measured in years); concept: crash
    {
      atStep: 74,
      title: "March 2013",
      question: "The market just passed its 2007 record at last. Friends say a fall must come next. What do you do?",
      eyebrow: "Recoveries",
      definition: "A new record high is a normal event in a long-lived market, not a ceiling.",
      context: [
        "This month the index finally closed above the record it set in October 2007, five and a half years after the crash began. Looking back, everyone who kept their plan through the fear has been made whole and more.",
        "Many people who sold in 2008 are still in cash, waiting for a re-entry point that feels safe. Looking back at this era, that comfortable moment never announced itself. The market simply kept moving without them.",
      ],
      options: [{ label: "Sell and wait for the next crash", act: true }, { label: "Stay with the plan" }, { label: "Put spare cash in", act: true }],
      refs: [{ label: "S&P 500 closing milestones", url: "https://en.wikipedia.org/wiki/Closing_milestones_of_the_S%26P_500" }],
    },
  ],
  startCash: 1000,
  fractionalDefault: false,
  briefTitle: "January 2007. Everything is going up, especially houses.",
  briefBody: [
    "You have $1,000 and nine years. Some of these giants will nearly die, and one will not make it. Eight of the nine series are the era's real quotes, and the one that ends in bankruptcy is reconstructed from the dated record.",
    "The rainbow orb puts the same $1,000 all-in on the real S&P 500.",
  ],
  startLabel: "Start in 2007",
  endTitle: "December 2015. The crash came, and the world did not end.",
  bullets: [
    { c: "#bf5af2", text: "The Insurance Giant and Mega Bank lost about nine dollars of every ten and never came back. Even giants can be fragile." },
    { c: "#30d158", text: "The rainbow orb took the exact same crash, then made new highs. Spreading out is what saved it." },
    { c: "#ff9f0a", text: "Panic prices turned out to be the deals of the decade. The rainbow orb caught them automatically." },
  ],
  cardSubline: "This run lived the 2008 crash, 2007 to 2015, on real prices.",
  // CEE Investing 8-4 (risks of owning single stocks), 8-5a (diversification
  // within and among asset classes), and the 12-5c ladder (downturns move
  // asset prices); the briefing is the era's documentary record, so its
  // timeline honestly includes the ending
  briefing: {
    title: "The world of January 2007",
    deck: "This page holds two minutes of real history. The dated timeline near the end tells you how the era turns out.",
    readTime: "about 2 minutes",
    sections: [
      {
        heading: "The housing machine",
        lead: "A mortgage is a loan for buying a house, paid back a little every month over many years.",
        body: [
          "In January 2007, houses are the surest thing in America. Prices have climbed for years in almost every city, and millions of families have borrowed against homes they believe can only rise. Banks lend to almost anyone, because even if a borrower fails, the house behind the loan should be worth more next year.",
          "A bond is a loan cut into pieces that investors can buy, and each piece pays its owner back over time. Wall Street has built a machine on top of the housing boom: banks bundle thousands of mortgages into bonds and sell the bundles to investors around the world, many stamped with top safety grades. The machine only works while house prices rise, and house prices have already quietly begun to slip.",
        ],
      },
      {
        heading: "The giants",
        lead: "Size tells you a company is important. It does not tell you the company is safe.",
        body: [
          "The financial giants of 2007 look unbeatable. Mega Bank serves customers in more than a hundred countries and just reported some of the biggest profits in banking history. The Insurance Giant covers lives, homes, and businesses on every continent. The Old Bank has survived 157 years of wars, panics, and depressions.",
          "Each of these giants has also tied itself to the housing machine. The banks hold mountains of mortgage bonds, and The Insurance Giant has sold insurance against those bonds failing, a promise so large that almost nobody inside the company has added it all up.",
        ],
      },
      {
        heading: "The doubters",
        lead: "A short seller is an investor who arranges to profit if a price falls instead of rises.",
        body: [
          "A handful of investors spend 2005 and 2006 reading the mortgage bonds page by page. They find loans made to borrowers with no income and no savings, stacked inside bundles stamped with top safety grades, and they place bets that the bundles will fail. Most of Wall Street happily takes the other side.",
          "Regulators and famous bankers keep saying that any housing trouble will stay contained. For a while the doubters lose money and look foolish, because being early feels exactly like being wrong.",
        ],
      },
      {
        heading: "What you will live through",
        lead: "A fair replay of history includes the companies that died, not just the ones that survived.",
        body: [
          "Eight of the nine names on your menu carry real market prices, month by month from January 2007 to December 2015. The Old Bank was a real company too, but its shares stopped trading when it collapsed in September 2008, so its series is reconstructed from the dated record of its fall. It does not survive this era.",
          "You will live through a panic that cut the market by more than half, a bottom that felt like the end of the world, and a recovery that quietly repaid everyone who stayed. At five crossroads the tape will pause and ask what you would have done. The rainbow orb rides beside you the whole way. It holds the real S&P 500, an index that bundles five hundred large American companies into one purchase, and it never trades once.",
        ],
      },
    ],
    timeline: [
      { date: "October 9, 2007", text: "The S&P 500 closes at a record 1,565. It does not see that number again for more than five years." },
      { date: "March 16, 2008", text: "An 85-year-old investment bank is sold in a weekend rescue for about two dollars a share." },
      { date: "September 15, 2008", text: "A 158-year-old investment bank files the largest bankruptcy in American history." },
      { date: "September 16, 2008", text: "The government lends $85 billion to the world's biggest insurer to keep it alive, taking most of its ownership in return." },
      { date: "September 29, 2008", text: "Congress votes down a rescue plan, and the Dow falls 777 points, its largest one-day point drop to that date." },
      { date: "February 27, 2009", text: "The oldest industrial giant on the menu cuts its dividend for the first time since 1938." },
      { date: "March 9, 2009", text: "The S&P 500 closes at 676.53, down more than half from its record. This is the bottom, and almost nobody believes it." },
      { date: "March 28, 2013", text: "The S&P 500 closes at 1,569, a new record at last, five and a half years after the old one." },
    ],
    sources: [
      { label: "The 2008 financial crisis", url: "https://en.wikipedia.org/wiki/2007%E2%80%932008_financial_crisis" },
      { label: "The Lehman bankruptcy", url: "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers" },
      { label: "The fall of Bear Stearns", url: "https://en.wikipedia.org/wiki/Bear_Stearns" },
      { label: "The 2007 to 2009 bear market", url: "https://en.wikipedia.org/wiki/United_States_bear_market_of_2007%E2%80%932009" },
    ],
  },
};
