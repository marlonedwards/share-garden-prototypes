// Crypto winters, 2018 to 2024. Scouting notes are written strictly as of
// January 2018, in the style contract's voice. Five of the six coin series
// are real market prices; The Promise Coin is BCC (BitConnect), one of the
// four delisted series reconstructed from the dated record
// (docs/course-style.md, "Standards and honesty"), and the scenario copy,
// its scouting card, and the briefing all say so. Names are abstracted with
// real names behind the existing toggle.
// Coins have no founding company; founded holds the year the coin launched.
// Dataset anchor checks (monthly closes from eraCrypto.json): step 0 =
// 2018-01 (BTC 10,221; BCC 410), step 1 = 2018-02 (BCC 4.10 after the
// shutdown), step 26 = 2020-03 (BTC 6,439 after the covid crash), step 39 =
// 2021-04 (DOGE 0.3376, up about seventy-fold from 0.0047 at 2020-12),
// step 12 = 2019-01 (BTC 3,457.79, the monthly-close floor of winter one),
// step 46 = 2021-11 (BTC 57,005 after the Nov 10 peak near 69,000, about
// sixteen times the winter-one floor: 57,005 / 3,457.79 = 16.5),
// step 58 = 2022-11 (BTC 17,169 after FTX), step 83 = 2024-12 (BTC 93,429).
import eraCrypto from "../data/eraCrypto.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";

export const crypto: ScenarioConfig = {
  id: "crypto",
  lesson: "Lesson 5",
  title: "Crypto winters",
  headerSub: "Two crashes and two comebacks, 2018 to 2024",
  cardLine: "Seven years of real coin prices hold two crashes of 75 percent and two recoveries.",
  learn: "Why bet size matters more than being right.",
  dots: ["#ff9f0a", "#bf5af2", "#ffd60a", "#64d2ff"],
  time: "about 6 minutes",
  dataset: eraCrypto as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It holds the boring stock market, sealed at the start.",
  // The briefing teaches that a coin is not a company, so the scouting deck
  // must not call these cards companies either.
  castNoun: "coin",
  castFoundedLabel: "Launched",
  assets: [
    {
      id: "BTC-USD", real: "Bitcoin", name: "Coin Alpha",
      desc: "It was the first coin, and fans call it digital gold.",
      color: "#ff9f0a", glow: "#ffcf7a",
      founded: 2009,
      history: "It appeared in 2009 as digital money that no bank or government controls, and only 21 million coins will ever exist. During 2017 its price rose from about $1,000 to just under $20,000, and it has fallen by nearly half since its mid-December peak.",
      believers: "It is digital gold. The supply is capped forever, and every crash in its history has been followed by a higher high.",
      doubters: "It earns nothing and pays nothing, so its price is only what the next buyer will pay. The head of America's biggest bank calls it a fraud.",
    },
    {
      id: "ETH-USD", real: "Ethereum", name: "Coin Beta",
      desc: "It wants to be a world computer that runs on its own coin.",
      color: "#bf5af2", glow: "#e0a9ff",
      founded: 2015,
      history: "Its network launched in 2015 so that anyone can run programs on thousands of computers at once, paid for in its coin. During 2017 the coin multiplied nearly a hundred times over, and in December a single game about digital cats briefly clogged the whole network.",
      believers: "It is more than money. It is a world computer, and every project built on it needs the coin to run.",
      doubters: "Most projects built on it so far just raise money by selling new tokens, and a network that one cat game can clog is not ready to run the world.",
    },
    {
      id: "LTC-USD", real: "Litecoin", name: "Coin Gamma",
      desc: "It is a faster copy of the first coin.",
      color: "#8e8e93", glow: "#c7c7cc",
      founded: 2011,
      history: "A former Google engineer copied the first coin's code in 2011 and tuned it for faster, cheaper payments. In December its creator announced that he had sold every coin he owned.",
      believers: "It is the silver to the first coin's gold, and silver is the metal people actually spend.",
      doubters: "A copy has no scarcity, because anyone can make another copy. Even the man who made it just sold out.",
    },
    {
      id: "XRP-USD", real: "XRP", name: "Coin Delta",
      desc: "It is a coin that wants banks as customers.",
      color: "#64d2ff", glow: "#b0e8ff",
      founded: 2012,
      history: "A company created it in 2012 to move money between banks in seconds instead of days. During 2017 its price multiplied more than three hundred times over, briefly making a co-founder one of the richest people in America.",
      believers: "If the world's banks settle their payments with it, today's price will look tiny.",
      doubters: "The company still holds more than half of all the coins, and banks can use the company's software without ever touching the coin.",
    },
    {
      id: "DOGE-USD", real: "Dogecoin", name: "The Joke Coin",
      desc: "It started as a joke, and it kept going anyway.",
      color: "#ffd60a", glow: "#ffe97a",
      founded: 2013,
      history: "Two programmers created it in 2013 as a joke about a dog meme, expecting it to fade in weeks. Its internet fans kept it alive for four years, tipping each other online and funding stunts like a Jamaican bobsled team's trip to the Olympics.",
      believers: "A coin with a happy crowd behind it can outlive the serious ones, because a community is harder to copy than code.",
      doubters: "It is a joke with no cap on its supply and no development plan, and both of its creators have walked away.",
    },
    {
      id: "BCC", real: "BitConnect", name: "The Promise Coin",
      desc: "It promises 1% a day, guaranteed, forever.",
      color: "#ff375f", glow: "#ff8fa3",
      founded: 2016,
      reconstructed: true,
      // one line on the card: the header meta already carries the
      // reconstructed-series tag, so only the entry-price caveat lives here,
      // and the deck sizer needs it short to keep the start button above an
      // 800px fold
      reconstructedNote: "It enters at its early-January price; the other coins are marked at each month's close.",
      history: "Its lending program pays about 1 percent interest every day, earned, it says, by a secret trading robot. Texas regulators ordered it to stop this month, and North Carolina followed.",
      believers: "The interest has arrived every single day for a year, and thousands of people post their growing balances as proof.",
      doubters: "Guaranteed daily interest is the oldest fraud arithmetic there is. Old investors are being paid with new investors' money, and it ends the moment new money stops arriving.",
    },
  ],
  moments: [
    mom(0, 3, "The hangover", "Coin Alpha is down nearly half from its December peak. This is winter one."),
    mom(1, 2, "The Promise Coin shuts down", "The coin that guaranteed riches is gone overnight."),
    mom(26, 3, "The covid crash", "Everything falls at once. Coins fall hardest."),
    mom(46, 3, "Coin mania", "Coin Alpha just touched a record $69,000. Your barber has a coin tip."),
    mom(58, 3, "Winter two", "Prices are down three quarters from the top, again."),
    mom(74, 3, "Records again", "The survivors set new highs."),
  ],
  gates: [
    // CEE Investing 12-2c ladder (guaranteed high returns signal fraud);
    // concept: ponzi. BitConnect: Texas cease-and-desist Jan 4, 2018, North
    // Carolina Jan 9, 2018, platform shutdown Jan 16, 2018; the tape shows
    // the collapse one step after this gate.
    {
      atStep: 0,
      title: "January 2018",
      question: "Every coin is falling except one. The Promise Coin guarantees 1% a day. Do you want in?",
      eyebrow: "A Ponzi scheme",
      definition: "A Ponzi scheme is a fraud that pays old investors with money collected from new ones, and it survives only as long as new money keeps arriving.",
      context: [
        "The Promise Coin guarantees about 1 percent interest every day, which would turn $1,000 into more than $37,000 in a year. It says a secret trading robot earns the money, and nobody outside the company has ever seen that robot work.",
        "Securities regulators in Texas ordered the company to stop this month, and North Carolina followed days later. Fans answer that the interest has arrived every single day for a year, and they post screenshots of growing balances as proof that the doubters are wrong.",
      ],
      options: [{ label: "Buy The Promise Coin", act: true }, { label: "Buy other coins instead", act: true }, { label: "Keep my cash" }],
      refs: [{ label: "The BitConnect scheme", url: "https://en.wikipedia.org/wiki/Bitconnect" }],
    },
    // CEE Investing 12-2c ladder (speculative assets swing hardest) with the
    // 12-5c ladder (downturns move asset prices); concept: crash. March 12,
    // 2020: Bitcoin fell roughly 40 percent in a day, near half across two
    // days, while the S&P 500 fell about a third from its February peak.
    {
      atStep: 26,
      title: "March 2020",
      question: "The covid panic is here, and ‘digital gold’ just fell by nearly half in two days. What do you do?",
      eyebrow: "A safe haven",
      definition: "A safe haven is an asset that people expect to hold its value when everything else is falling.",
      context: [
        "For years, fans have called Coin Alpha digital gold and promised it would be the shelter in the next storm. The storm arrived this month, and Coin Alpha fell by nearly half in two days while the stock market fell by about a third from its peak.",
        "When frightened people need cash, they sell whatever they can sell, and the assets with the wildest swings fall the hardest. Nobody standing in this week knows whether the panic is ending or just beginning.",
      ],
      options: [{ label: "Sell the coins", act: true }, { label: "Hold on" }, { label: "Buy the crash", act: true }],
      refs: [{ label: "The 2020 crash", url: "https://en.wikipedia.org/wiki/2020_stock_market_crash" }],
    },
    // CEE Investing 12-2c ladder (speculation and the greater fool);
    // concept: bubble. Dogecoin monthly closes: 0.0047 (Dec 2020) to 0.3376
    // (Apr 2021), about seventy-fold; Musk's SNL hosting was announced in
    // late April and aired May 8, 2021.
    {
      atStep: 39,
      title: "April 2021",
      question: "The Joke Coin has multiplied about seventy times over in four months. Do you chase it?",
      eyebrow: "Speculation",
      definition: "Speculation is buying something only because you believe somebody else will pay more for it soon, not because it earns anything.",
      context: [
        "The Joke Coin began in 2013 as a joke about a dog picture, and in the four months since the end of December its price has multiplied about seventy times over. Its most famous fan, the billionaire who runs an electric car company, is about to host a late-night comedy show, and holders are counting down to the broadcast.",
        "Nothing about the coin itself changed this spring. It has no business, no earnings, and no supply limit. The only thing that grew is the crowd, and a price held up by a crowd needs the crowd to keep growing.",
      ],
      // The middle option carries no act flag on purpose: the boring index
      // is not on this era's trade menu (the rainbow orb holds it, sealed at
      // the start), so the stance is worded as staying with it, not buying
      // it, and the tape rolls on.
      options: [{ label: "Buy The Joke Coin", act: true }, { label: "Stay with the boring market instead" }, { label: "Watch from the side" }],
      refs: [{ label: "Dogecoin", url: "https://en.wikipedia.org/wiki/Dogecoin" }],
    },
    // CEE Investing 12-5b ladder (expectations are already in the price);
    // concept: bubble. Bitcoin peaked near $69,000 on November 10, 2021.
    // "About sixteen times over" reads straight off the tape: the step-46
    // monthly close of 57,005 is 16.5 times the winter-one monthly-close
    // floor of 3,457.79 at 2019-01 (see the anchor checks above).
    {
      atStep: 46,
      title: "November 2021",
      question: "Coin Alpha just touched a record near $69,000, and your barber has a tip. Do you add more?",
      eyebrow: "A mania",
      definition: "A mania is a bubble with a crowd, and the price rises because it is rising.",
      context: [
        "Coin Alpha touched an all-time record near $69,000 in the second week of this month, and even after easing off that top it has multiplied about sixteen times over in the three years since the bottom of the first winter. Stadiums are being renamed after coin companies. People post screenshots of life-changing profits every day.",
        "You lived through the first winter at the start of this run, and it began from a party that felt exactly like this one. Nobody in that crowd knew the top had passed until months after it did.",
      ],
      options: [{ label: "Buy more coins", act: true }, { label: "Take some profits", act: true }, { label: "Change nothing" }],
      refs: [{ label: "The 2021 crypto bubble", url: "https://en.wikipedia.org/wiki/Cryptocurrency_bubble" }],
    },
    // CEE Investing 12-2c ladder (position size in speculative assets);
    // concept: position-size. FTX filed for bankruptcy on November 11, 2022.
    {
      atStep: 58,
      title: "November 2022",
      question: "Coins are down three quarters for the second time. Was the first winter a lesson or a fluke?",
      eyebrow: "Position size",
      definition: "Position size is how much of your money one thing gets, and it is the difference between an investor who can wait and one who has to sell.",
      context: [
        "One of the biggest coin exchanges in the world filed for bankruptcy this month with billions of dollars of its customers' money missing. A year ago its young founder was on magazine covers as the responsible face of the industry, and his exchange's own token lost nearly all of its value in about a week. Coin Alpha now sits about three quarters below last November's record, in the second winter of that depth in five years.",
        "The boring stock index is having a painful year too, but its fall is about 13 percent from its peak, not 75. A holder who kept coins to a small slice of an orb can wait this winter out the way the last one was waited out. A holder who bet most of an orb on coins is choosing tonight between selling after a fall of three quarters and riding a swing this large with money they may need. Nobody standing in this month knows whether the price has found its floor or is only halfway down.",
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
    "You have $1,000 and seven wild years. Five of the six coins carry real market prices. The sixth is a scam, and its collapse is reconstructed from the dated record.",
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
  // CEE Investing 12-2c ladder (cryptocurrencies are speculative assets) and
  // 12-5c ladder (downturns move asset prices); the briefing is the era's
  // documentary record, so its timeline honestly includes both winters.
  briefing: {
    title: "The world of January 2018",
    deck: "This page holds two minutes of real history. The dated timeline near the end tells you how the era turns out.",
    readTime: "about 2 minutes",
    sections: [
      {
        heading: "The morning after",
        lead: "Volatility is the size and speed of an asset's price swings, in both directions.",
        body: [
          "During 2017, the first and biggest coin rose from about $1,000 to just under $20,000, and stories of overnight coin millionaires filled the news. Smaller coins rose even faster, some multiplying a hundred times over or more in a single year.",
          "Since its mid-December peak the first coin has fallen by nearly half, and nobody agrees on whether the party is over or just catching its breath. This era begins in that argument.",
        ],
      },
      {
        heading: "What a coin is",
        lead: "A cryptocurrency is digital money whose record of ownership is kept by a network of computers instead of a bank or government.",
        body: [
          "The first coin appeared in 2009, right after a financial crisis had shaken the world's trust in banks. Its rules are written in code that no company controls, and only 21 million of its coins will ever exist.",
          "A coin is not a company. It has no sales, no profits, and no dividend, so its price is simply whatever the next buyer will pay. That single fact explains most of what you are about to live through.",
        ],
      },
      {
        heading: "The believers",
        lead: "Scarcity is the argument that something strictly limited in supply will hold its value.",
        body: [
          "The believers call the first coin digital gold: governments can always print more dollars, but nobody can ever print more than 21 million of these. Some of them lived through 2008 and want money that no bank can touch.",
          "Others believe the second coin is something bigger, a world computer that any programmer can build on. About the technology, parts of both stories come true in the years ahead. The prices are another matter.",
        ],
      },
      {
        heading: "The doubters",
        lead: "An asset that pays you nothing while you hold it can only reward you if somebody else pays more for it later.",
        body: [
          "The head of America's biggest bank called the first coin a fraud this past September, and famous investors compare the boom to the tulip mania of the 1600s, when single flower bulbs briefly traded for the price of houses.",
          "The doubters also point at the promises. One coin on your menu guarantees 1 percent interest every day, and securities regulators in two states have just ordered it to stop. Its fans are not listening.",
        ],
      },
      {
        heading: "What you will live through",
        lead: "A fair replay of history includes the scam, not just the survivors.",
        body: [
          "Five of the six coins on your menu carry real market prices, month by month from January 2018 to December 2024. The Promise Coin was real too, but it collapsed within weeks of this starting line, so its price series is reconstructed from the dated record of its rise and its fall. Every other series is marked at each month's closing price, while The Promise Coin enters at its early-January price, on the eve of its shutdown, so its very first step shows the full collapse.",
          "You will live through two winters in which coins lose three quarters of their value, and two springs in which the survivors set new records. At five crossroads the tape will pause and ask what you would have done. The rainbow orb rides beside you the whole way. It holds the real S&P 500, skips the coins entirely, and never trades once.",
        ],
      },
    ],
    timeline: [
      { date: "December 17, 2017", text: "The first coin peaks just under $20,000 after starting the year near $1,000." },
      { date: "January 16, 2018", text: "The lending platform that guaranteed 1 percent a day shuts down. Its coin loses more than 90 percent of its value in a day." },
      { date: "December 15, 2018", text: "The first coin bottoms near $3,200, down more than 80 percent from its peak. The first winter has found its floor." },
      { date: "March 12, 2020", text: "In the covid panic, the first coin falls about 40 percent in a single day." },
      { date: "April 14, 2021", text: "The biggest American coin exchange lists its own shares on the Nasdaq." },
      { date: "November 10, 2021", text: "The first coin peaks near $69,000." },
      { date: "May 2022", text: "A coin designed to always be worth exactly one dollar collapses, erasing about $40 billion." },
      { date: "November 11, 2022", text: "One of the biggest coin exchanges in the world files for bankruptcy with customer money missing. Winter two deepens." },
      { date: "January 10, 2024", text: "American regulators approve the first funds that hold the first coin directly, opening it to ordinary brokerage accounts." },
      { date: "December 5, 2024", text: "The first coin crosses $100,000 for the first time." },
    ],
    sources: [
      { label: "The crypto bubbles", url: "https://en.wikipedia.org/wiki/Cryptocurrency_bubble" },
      { label: "The BitConnect scheme", url: "https://en.wikipedia.org/wiki/Bitconnect" },
      { label: "The FTX collapse", url: "https://en.wikipedia.org/wiki/Bankruptcy_of_FTX" },
    ],
  },
};
