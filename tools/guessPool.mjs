// The Guess the Stock pool: the curated manifest, kept apart from the bake so a
// reshape of the order or the pars never needs the network.
//
// STREAM ORDER, most guessable first. Now that every puzzle shows its year for
// free, guessability is shape plus year plus fame: a stock whose 12 months have
// one unmistakable event in a year everybody lived through comes first, and a
// company that simply had a good or bad year in a decade nobody pictures comes
// last. So the squeeze spikes and the pandemic verticals open the stream, the
// dot-com pair and the 2008 bank sit in the middle, and 1985 Coca-Cola, 1993
// IBM and 1999 Walmart close it.
//
// PAR is a hint count, 2 for most and 3 for the deep cuts. The year used to
// cost a hint, so every par came down by one when it stopped costing anything,
// with a floor of 2 and a ceiling of 3.
//
// Sector, market cap, story, aliases and par are curated here rather than
// fetched. Market caps are real year-end values rounded to whole billions.

export const POOL = [
  {
    id: "gme-2021", ticker: "GME", name: "GameStop", year: 2021, sector: "retail",
    marketCap: "$11B", par: 2,
    aliases: ["gamestop", "game stop"],
    story: "A crowd of small buyers squeezed the stock in late January, and trading apps limited buying.",
  },
  {
    id: "tsla-2020", ticker: "TSLA", name: "Tesla", year: 2020, sector: "autos",
    marketCap: "$669B", par: 2,
    aliases: ["tesla", "tesla motors"],
    story: "Tesla posted its first full profitable year and joined the S&P 500 in December.",
  },
  {
    id: "nvda-2023", ticker: "NVDA", name: "Nvidia", year: 2023, sector: "technology",
    marketCap: "$1.2T", par: 2,
    aliases: ["nvidia"],
    story: "Demand for the chips that train large AI models ran past every forecast for the year.",
  },
  {
    id: "aapl-2007", ticker: "AAPL", name: "Apple", year: 2007, sector: "technology",
    marketCap: "$174B", par: 2,
    aliases: ["apple", "apple computer", "apple inc"],
    story: "Apple announced the iPhone in January and shipped it in June.",
  },
  {
    id: "meta-2022", ticker: "META", name: "Meta", year: 2022, sector: "technology",
    marketCap: "$313B", par: 2,
    aliases: ["meta", "facebook", "fb", "meta platforms"],
    story: "Advertising revenue fell for the first time while the company spent heavily on the metaverse.",
  },
  {
    id: "c-2008", ticker: "C", name: "Citigroup", year: 2008, sector: "banks",
    marketCap: "$37B", par: 2,
    aliases: ["citi", "citigroup", "citibank"],
    story: "Mortgage losses grew so large that the government put in $45 billion and guaranteed a pool of the bank's assets.",
  },
  {
    id: "amc-2021", ticker: "AMC", name: "AMC Entertainment", year: 2021, sector: "cinemas",
    marketCap: "$14B", par: 2,
    aliases: ["amc", "amc entertainment", "amc theatres"],
    story: "The crowd that squeezed GameStop bought the cinema chain too, and the company sold new shares into the rally.",
  },
  {
    id: "zm-2020", ticker: "ZM", name: "Zoom", year: 2020, sector: "technology",
    marketCap: "$99B", par: 2,
    aliases: ["zoom", "zoom video", "zoom video communications"],
    story: "Offices and schools closed, and Zoom went from a business tool to how much of the world met.",
  },
  {
    id: "mrna-2020", ticker: "MRNA", name: "Moderna", year: 2020, sector: "health",
    marketCap: "$42B", par: 2,
    aliases: ["moderna"],
    story: "Moderna's vaccine went from a design in January to emergency authorization in December.",
  },
  {
    id: "nflx-2011", ticker: "NFLX", name: "Netflix", year: 2011, sector: "media",
    marketCap: "$4B", par: 2,
    aliases: ["netflix"],
    story: "Netflix raised prices about 60 percent in July, then tried to split the DVD business off as Qwikster, and subscribers left.",
  },
  {
    id: "amzn-1998", ticker: "AMZN", name: "Amazon", year: 1998, sector: "retail",
    marketCap: "$17B", par: 2,
    aliases: ["amazon", "amazon.com"],
    story: "Amazon was still mostly a bookseller, and the early internet boom carried the stock up several times over.",
  },
  {
    id: "msft-2000", ticker: "MSFT", name: "Microsoft", year: 2000, sector: "technology",
    marketCap: "$231B", par: 2,
    aliases: ["microsoft"],
    story: "A federal judge ruled Microsoft an illegal monopoly in April and ordered a breakup, and the dot-com market turned down.",
  },
  {
    id: "xom-2022", ticker: "XOM", name: "Exxon Mobil", year: 2022, sector: "energy",
    marketCap: "$454B", par: 2,
    aliases: ["exxon", "exxon mobil", "exxonmobil"],
    story: "The invasion of Ukraine pushed oil and gas prices up, and Exxon earned more than in any year of its history.",
  },
  {
    id: "coin-2022", ticker: "COIN", name: "Coinbase", year: 2022, sector: "crypto",
    marketCap: "$8B", par: 2,
    aliases: ["coinbase"],
    story: "Crypto prices fell all year and the exchange FTX collapsed in November, so trading revenue dried up.",
  },
  {
    id: "pton-2021", ticker: "PTON", name: "Peloton", year: 2021, sector: "fitness",
    marketCap: "$12B", par: 2,
    aliases: ["peloton"],
    story: "Gyms reopened, bike sales slowed, and a treadmill recall in May began a long slide.",
  },
  {
    id: "ba-2020", ticker: "BA", name: "Boeing", year: 2020, sector: "aerospace",
    marketCap: "$121B", par: 2,
    aliases: ["boeing"],
    story: "The 737 MAX was still grounded when the pandemic stopped most air travel.",
  },
  {
    id: "dis-2020", ticker: "DIS", name: "Disney", year: 2020, sector: "media",
    marketCap: "$328B", par: 2,
    aliases: ["disney", "walt disney", "the walt disney company"],
    story: "Parks and cinemas closed while Disney+ signed up more than 80 million subscribers in its first year.",
  },
  {
    id: "shop-2020", ticker: "SHOP", name: "Shopify", year: 2020, sector: "technology",
    marketCap: "$138B", par: 2,
    aliases: ["shopify"],
    story: "Lockdowns pushed small shops online, and Shopify was the software many of them opened with.",
  },
  {
    id: "nvda-2022", ticker: "NVDA", name: "Nvidia", year: 2022, sector: "technology",
    marketCap: "$364B", par: 2,
    aliases: ["nvidia"],
    story: "Crypto mining demand collapsed and the pandemic run on computer parts ended, so chip orders fell all year.",
  },
  {
    id: "jpm-2008", ticker: "JPM", name: "JPMorgan Chase", year: 2008, sector: "banks",
    marketCap: "$118B", par: 3,
    aliases: ["jpmorgan", "jp morgan", "jpmorgan chase", "chase"],
    story: "JPMorgan bought Bear Stearns in March and Washington Mutual in September while the banking system froze.",
  },
  {
    id: "nflx-2013", ticker: "NFLX", name: "Netflix", year: 2013, sector: "media",
    marketCap: "$22B", par: 2,
    aliases: ["netflix"],
    story: "Streaming subscriptions grew fast and House of Cards made Netflix a maker of shows rather than only a renter.",
  },
  {
    id: "pypl-2021", ticker: "PYPL", name: "PayPal", year: 2021, sector: "payments",
    marketCap: "$222B", par: 3,
    aliases: ["paypal"],
    story: "The pandemic surge in online payments slowed, a reported bid for Pinterest was dropped, and forecasts were cut.",
  },
  {
    id: "f-2021", ticker: "F", name: "Ford", year: 2021, sector: "autos",
    marketCap: "$83B", par: 3,
    aliases: ["ford", "ford motor"],
    story: "The electric F-150 Lightning and a new battery plan drew investors back to a carmaker more than a century old.",
  },
  {
    id: "csco-2000", ticker: "CSCO", name: "Cisco", year: 2000, sector: "technology",
    marketCap: "$275B", par: 3,
    aliases: ["cisco", "cisco systems"],
    story: "Cisco was briefly the most valuable company in the world in March, then telecom and internet firms stopped buying network gear.",
  },
  {
    id: "intc-2000", ticker: "INTC", name: "Intel", year: 2000, sector: "technology",
    marketCap: "$202B", par: 3,
    aliases: ["intel"],
    story: "Intel warned in September that sales would miss, and the personal computer boom cooled.",
  },
  {
    id: "ge-2017", ticker: "GE", name: "General Electric", year: 2017, sector: "industrials",
    marketCap: "$151B", par: 3,
    aliases: ["general electric", "ge"],
    story: "The power business missed badly, the dividend was cut in half in November, and the chief executive was replaced.",
  },
  {
    id: "sbux-2008", ticker: "SBUX", name: "Starbucks", year: 2008, sector: "food",
    marketCap: "$7B", par: 3,
    aliases: ["starbucks"],
    story: "Howard Schultz returned as chief executive and closed about 600 US stores as the recession cut into daily coffee.",
  },
  {
    id: "wmt-1999", ticker: "WMT", name: "Walmart", year: 1999, sector: "retail",
    marketCap: "$307B", par: 3,
    aliases: ["walmart", "wal-mart", "wal mart"],
    story: "Walmart bought the British grocer Asda in June and kept opening supercenters at home.",
  },
  {
    id: "ibm-1993", ticker: "IBM", name: "IBM", year: 1993, sector: "technology",
    marketCap: "$32B", par: 3,
    aliases: ["ibm", "international business machines", "big blue"],
    story: "IBM lost about $8 billion, cut its dividend, and hired an outsider, Lou Gerstner, to turn the company around.",
  },
  {
    id: "ko-1985", ticker: "KO", name: "Coca-Cola", year: 1985, sector: "food",
    marketCap: "$10B", par: 3,
    aliases: ["coca cola", "coca-cola", "coke", "the coca-cola company"],
    story: "Coca-Cola replaced its formula with New Coke in April and brought the old one back in July.",
  },
];
