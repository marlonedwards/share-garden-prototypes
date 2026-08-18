// The covid years, 2019 to 2024. Scouting notes are written strictly as of
// January 2019, in the style contract's voice. Every series is real market
// data baked by tools/bake_era3.mjs (Yahoo monthly, split and dividend
// adjusted, rescaled to start at the era's first close); nothing here is
// reconstructed. Names are abstracted with real names behind the toggle.
// The Video Call Company (ZM) listed in April 2019 (listedAtStep 3) and
// Spin Cycle (PTON) in September 2019 (listedAtStep 8). Their pre-listing
// rows in eraCovid.json are backfilled flat with each one's first month-end
// close (ZM 72.47, the 2019-04 close; PTON 25.10, the 2019-09 close) only
// so the series arrays stay rectangular; listedAtStep keeps those rows off
// every player surface. Before its listing step an asset cannot be bought
// (engine guard), shows "lists <month>" instead of a price in the trade
// rail and the ticker, and its sparkline starts at the listing month.
// Dataset anchor checks (monthly closes from eraCovid.json, verified in
// tools/eracheck2.mjs): step 0 = 2019-01 (AAPL 41.61, GME 2.835, index
// 5,383.63), step 13 = 2020-02 (the record before the storm), step 14 =
// 2020-03 (index 5,269.20 after the fastest crash; a fall of 33.9 percent
// from the February 19 record to March 23 in 33 days), step 19 = 2020-08
// (index 7,192.11, back above the February peak less than five months after
// the bottom), step 23 = 2020-12 (GME 4.87), step 24 = 2021-01 (GME 84.01,
// about seventeen times the December close; the quoted move was $18.84 to
// $325.00), step 34 = 2021-11 (ZM 211.41, down about 56 percent from its
// 478.36 peak close at step 22, while the index sits just below the record
// monthly close it set at step 33, 2021-10 = 9,625.02), step 45 = 2022-10
// (PTON 8.40, about 95 percent below its 151.72 close of December 2020),
// step 60 = 2024-01 (index 10,501.38, the first record close in two years),
// step 71 = 2024-12 (index 12,911.82, 2.40 times the January 2019 start;
// NVDA 135.38, about 37 times its 3.59 start).
import eraCovid from "../data/eraCovid.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";
import type { CheckItem } from "../lib/checkpoints";
import type { Clipping } from "../lib/headlines";

export const covid: ScenarioConfig = {
  id: "covid",
  lesson: "Lesson 6",
  title: "The covid years",
  headerSub: "The fastest crash and the strangest boom, 2019 to 2024",
  cardLine: "Six years of real prices hold the fastest crash in market history.",
  learn: "Why crashes cannot be timed.",
  dots: ["#0a84ff", "#ff9f0a", "#30d158", "#ff453a"],
  time: "about 5 minutes",
  dataset: eraCovid as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It holds the whole boring market, sealed at the start.",
  assets: [
    {
      id: "AAPL", real: "Apple", name: "Fruit Computers",
      desc: "It makes the world's favorite phone, and a billion people carry one.",
      color: "#0a84ff", glow: "#7cc0ff",
      founded: 1976,
      history: "It became the first American company worth a trillion dollars last August, then lost about a third of that value in three months. Days ago it warned that phone sales in China were slowing, its first warning like that in more than fifteen years.",
      believers: "A billion people carry its phone and replace it every few years, and each phone pulls its owner deeper into music, storage, and apps that pay the company every month.",
      doubters: "The phone made this company, and the phone has stopped growing. In much of the world, everyone who wants one already has one.",
    },
    {
      id: "AMZN", real: "Amazon", name: "The Everything Store",
      desc: "It sells everything online, and it rents out its computers too.",
      color: "#ff9f0a", glow: "#ffcf7a",
      founded: 1994,
      history: "It started as an online bookstore in 1994, and this month it briefly passed every other company on Earth in value. The computing power it rents to other businesses now earns most of its profit.",
      believers: "Every year more of the world's shopping moves online, and this company built the warehouses, the trucks, and the habit first.",
      doubters: "Its price already assumes decades of perfect growth, and regulators in Washington are starting to ask whether it has grown too powerful.",
    },
    {
      id: "NVDA", real: "Nvidia", name: "Arcade Chips",
      desc: "It designs the graphics chips that make video games look real.",
      color: "#30d158", glow: "#8ff0ae",
      founded: 1993,
      history: "Its chips draw the explosions and dragons in video games, and researchers recently found the same chips are the best tool yet for teaching machines. Its price just fell by half in three months after a coin-mining fad ended and left it holding unsold chips.",
      believers: "The chips that draw dragons turn out to be the engine of artificial intelligence, and that second story is only beginning.",
      doubters: "It is a boom-and-bust chip company that just proved the point, because one fad ended and half its value vanished in a season.",
    },
    {
      id: "TSLA", real: "Tesla", name: "The Electric Carmaker",
      desc: "It bet the company on electric cars before anyone else would.",
      color: "#ff453a", glow: "#ff9d97",
      founded: 2003,
      history: "It nearly drowned last year building its first affordable car, assembling some of them in a tent in the parking lot, and regulators fined its founder for a reckless message about taking the company private. It has just posted two profitable quarters in a row for the first time.",
      believers: "Every big carmaker now says electric is the future, and only this company bet everything on that future while the others were laughing.",
      doubters: "It has never earned a full-year profit, it carries billions in debt, and more investors bet against it than against any other American stock.",
    },
    {
      id: "ZM", real: "Zoom", name: "The Video Call Company",
      desc: "It sells video meetings that actually work.",
      color: "#64d2ff", glow: "#b0e8ff",
      founded: 2011,
      listedAtStep: 3,
      history: "Its founder left a giant company in 2011 because video calls kept freezing, and he built one that just works. In January it is still private, so it has no shares anyone can buy; its shares reach the market in April 2019, and it joins the tape then.",
      believers: "It is that rarest young internet company, one that already earns a profit, and everyone who joins one meeting installs it for the next.",
      doubters: "Video calling is a feature the technology giants give away free, and a small newcomer charging for it is easy to crush.",
    },
    {
      id: "PTON", real: "Peloton", name: "Spin Cycle",
      desc: "It sells a $2,000 exercise bike with a screen and a subscription.",
      color: "#ff6482", glow: "#ffa8bb",
      founded: 2012,
      listedAtStep: 8,
      history: "It sells a $2,000 stationary bike with a screen that streams live classes, plus a monthly subscription to ride along. In January it is still private, so it has no shares anyone can buy; its shares reach the market in September 2019, and it joins the tape then.",
      believers: "It is not a bike company, it is a fitness club that lives in your home, and its riders almost never cancel the subscription.",
      doubters: "It is an exercise-fad company priced like a technology company, and a bike with a screen bolted on is easy to copy.",
    },
    {
      id: "GME", real: "GameStop", name: "The Mall Game Store",
      desc: "It sells video games from stores inside shopping malls.",
      color: "#bf5af2", glow: "#e0a9ff",
      founded: 1984,
      history: "It grew into the world's biggest video game retailer, with thousands of stores in shopping malls. Games are turning into downloads, its sales are shrinking, and it has just spent months trying and failing to find a buyer for itself.",
      believers: "A new console generation arrives next year, every past one lifted its sales, and millions of gamers still trade in discs at its counters for store credit.",
      doubters: "Its product is becoming a download, and a store that sells downloads in boxes is a video rental chain in its final years.",
    },
  ],
  moments: [
    mom(0, 2, "A wobbly new year", "The market just lived its worst December since 1931. Everyone is predicting a recession."),
    mom(13, 1, "The record", "The market closed at an all-time high on February 19. A new virus is in the news, far away."),
    mom(14, 2, "The fastest crash", "The market fell by a third in 33 days. No fall this size has ever come this fast."),
    mom(19, 3, "The everything rally", "Less than five months after the bottom, the market is back at a record. The stay-at-home stocks are leading it."),
    mom(24, 2, "Meme mania", "A dying mall store is the most talked-about stock on Earth. Nobody is sure whether it is a joke."),
    mom(36, 3, "The giveback", "The stay-at-home darlings are falling first. The rest of the market is following them down."),
    mom(45, 2, "Everything hurts", "Stocks have fallen for ten months. Most of the sellers are tired."),
    mom(60, 3, "Records again", "Two years after the peak, the market sets a new record. The quiet months did the work."),
  ],
  gates: [
    // CEE Investing 12-5c ladder (turns arrive without warning, so timing
    // fails); concept: market timing. December 2018 was the S&P 500's worst
    // December since 1931, and the index fell 19.8 percent from its September
    // peak to Christmas Eve; recession forecasts for 2019 were everywhere,
    // and 2019 returned 31.5 percent with dividends.
    {
      atStep: 0,
      title: "January 2019",
      question: "Everyone says a recession is coming in 2019. Do you invest now, or wait for the crash?",
      eyebrow: "Timing the market",
      definition: "Timing the market is trying to guess when prices will rise or fall and trading on the guess, and even professionals guess wrong more often than right.",
      context: [
        "The market just lived through its worst December since 1931, and prices fell almost 20 percent from September to Christmas Eve. The bull market is ten years old, business channels run recession countdowns, and famous investors warn that it is living on borrowed time.",
        "Waiting feels safe because you keep your cash while you wait. The catch is that the market sends no invitations. If prices rise while you stand aside, the crash you feared has to arrive and cut prices below today's before the waiting has saved you anything.",
      ],
      options: [{ label: "Put the money to work", act: true }, { label: "Wait in cash for the recession" }, { label: "Ease in a little at a time", act: true }],
      refs: [{ label: "Market timing", url: "https://en.wikipedia.org/wiki/Market_timing" }],
    },
    // CEE Investing 12-5c ladder (downturns and investor mood); concept:
    // panic-selling. Record close February 19, 2020; bottom March 23, 2020,
    // down 33.9 percent in 33 days, the fastest fall of that size in American
    // market history. The context stays inside the month: no forward leak.
    {
      atStep: 14,
      title: "March 2020",
      question: "The world is closing, and the market just fell by a third in 33 days. What do you do?",
      eyebrow: "Panic selling",
      definition: "Panic selling is dumping investments in a fall because the fear of losing more has replaced the plan.",
      context: [
        "Thirty-three days ago the market closed at an all-time record. Since then a virus has closed schools, offices, and whole countries, and prices have fallen by about a third, faster than in 1929, faster than in 2008. The screens are red, and the news gets worse every morning.",
        "Nobody standing in this month knows whether the fall is half over or just beginning. The only thing a seller locks in tonight is the price on the screen, and that price is one third smaller than it was five weeks ago.",
      ],
      options: [{ label: "Sell everything", act: true }, { label: "Hold and look away" }, { label: "Buy while it is down", act: true }],
      refs: [{ label: "The 2020 crash", url: "https://en.wikipedia.org/wiki/2020_stock_market_crash" }],
    },
    // CEE Investing 12-2c ladder (speculation, crowds, and short-term greed);
    // concept: bubble. GameStop monthly closes: $18.84 at 2020-12 to $325.00
    // at 2021-01, about seventeen times over, with an intraday high of $483
    // on January 28, the day some trading apps restricted buying. By the
    // February close it had given back more than two thirds.
    {
      atStep: 24,
      title: "January 2021",
      question: "The mall game store is up about seventeen-fold this month, and the crowd says it is going to the moon. Do you jump in?",
      eyebrow: "A short squeeze",
      definition: "A short squeeze happens when a rising price forces investors who bet on a fall to buy the stock back, and their buying pushes the price higher still.",
      context: [
        "Big funds borrowed and sold more shares of The Mall Game Store than actually exist, betting that the dying store's price would keep sliding. A crowd on an internet forum noticed, started buying, and would not stop. The rising price is now forcing the funds to buy shares back at any cost, and this month the stock has multiplied about seventeen times over.",
        "The crowd is having fun, and some of it is getting rich, but the store underneath is the same shrinking business it was in December. Whoever holds the shares when the squeeze ends will own a mall retailer priced like a miracle. Some trading apps have started blocking new buys, and Washington has called hearings.",
      ],
      options: [{ label: "Buy the meme stock", act: true }, { label: "Sell any I own", act: true }, { label: "Watch from the side" }],
      refs: [{ label: "The GameStop squeeze", url: "https://en.wikipedia.org/wiki/GameStop_short_squeeze" }],
    },
    // CEE Investing 12-5b ladder (expectations are already in the price);
    // concept: priced for perfection. The copy uses only prices this monthly
    // tape shows: the 2021-10 close (step 33, 9,625.02) is a record on the
    // tape, and the 2021-11 close (9,558.33) sits about 0.7 percent below
    // it, so the copy says "just below last month's record" rather than "at
    // a record". (The daily S&P did set a record on November 18, 2021, but
    // this tape never shows that price, so the copy does not cite it.)
    // Meanwhile ZM is down about 56 percent from its 478.36 peak monthly
    // close of November 2020 and PTON is down about 71 percent from its
    // 151.72 close of December 2020, even though both businesses still
    // count more users than ever.
    {
      atStep: 34,
      title: "November 2021",
      question: "The market sits just below the record it set last month, but the stay-at-home darlings have crashed. Are they bargains now?",
      eyebrow: "Priced for perfection",
      definition: "A stock is priced for perfection when its price already assumes the best possible future, so even good news can fail to be good enough.",
      context: [
        "The market closed last month at a record and has given back less than one percent since, but the pandemic winners sit far below their own peaks. The Video Call Company has lost about half its value since its 2020 peak, and Spin Cycle has lost about seventy percent, even though more people use both than ever before.",
        "Their businesses did not shrink; the future their prices assumed did. At the 2020 peaks, each price treated a locked-down world as permanent. Offices and gyms are reopening, and every month of ordinary life is news those old prices cannot digest.",
      ],
      options: [{ label: "Buy the fallen darlings", act: true }, { label: "Trim them from the orb", act: true }, { label: "Change nothing" }],
      refs: [{ label: "The stay-at-home trade", url: "https://en.wikipedia.org/wiki/Zoom_Video_Communications" }],
    },
    // CEE Investing 8-7 with the 12-5c ladder (nobody can time the bottom);
    // concept: dca. The copy uses the clock the player can see, this tape's
    // monthly closes: the record close is 2021-12 (step 35, 9,986.70) and
    // the 2022-09 close (step 44, 7,603.14) sits 23.9 percent below it,
    // "about a quarter". (On daily closes the index bottomed October 12,
    // 2022, down 25.4 percent from January 3, but this monthly tape never
    // shows those prices, so the copy does not cite them.) The context
    // stays inside the month: no forward leak.
    {
      atStep: 45,
      title: "October 2022",
      question: "Stocks have fallen for ten months, and cash finally pays interest again. Do you stay?",
      eyebrow: "A bear market",
      definition: "A bear market is a fall of at least 20 percent from a recent high, and it usually arrives with reasons that sound like they will never end.",
      context: [
        "This year broke the pattern the pandemic taught. There was no fast crash and no fast rescue, only ten months of grinding decline: last month closed about a quarter below the record set last December, while everything from groceries to rent costs more. The darlings that crashed last year kept falling anyway; Spin Cycle trades about 95 percent below its 2020 peak.",
        "Selling tonight would turn ten months of falling prices into a permanent loss, and staying feels like volunteering for more. Nobody standing in this month knows how much further prices will fall. The only fact on the table is history's: every American bear market so far has ended, on a date nobody rang a bell for.",
      ],
      options: [{ label: "Sell and wait in cash", act: true }, { label: "Hold what I own" }, { label: "Keep buying a little", act: true }],
      refs: [{ label: "The 2022 bear market", url: "https://en.wikipedia.org/wiki/2022_stock_market_decline" }],
    },
  ],
  startCash: 1000,
  fractionalDefault: true,
  lastStep: 71,
  briefTitle: "January 2019. The bull market is ten years old, and everyone says it is due to die.",
  briefBody: [
    "You have $1,000 and six wild years. Every price on the tape is real, month by month.",
    "The rainbow orb holds the whole boring market beside you and never trades once.",
  ],
  startLabel: "Start in 2019",
  endTitle: "December 2024. The fastest crash ended in records nobody predicted.",
  bullets: [
    { c: "#0a84ff", text: "The market fell by a third in 33 days, then closed at a record less than five months after the bottom. A seller in March missed the whole ride home." },
    { c: "#ff6482", text: "A crowd can multiply a price long before the business earns it, and the price gives it back." },
    { c: "#30d158", text: "The boring index rode every storm without a single trade and ended these six years up about 140 percent." },
  ],
  cardSubline: "This run lived the covid years, 2019 to 2024, on real prices.",
  // CEE Investing 12-5c ladder (downturns move asset prices, and recoveries
  // arrive unannounced) with 12-5b (expectations are already in the price);
  // the briefing is the era's documentary record, and its dated timeline
  // honestly includes the crash, the mania, and the giveback.
  briefing: {
    title: "The world of January 2019",
    deck: "This page holds two minutes of real history. The dated timeline near the end tells you how the era turns out.",
    readTime: "about 2 minutes",
    sections: [
      {
        heading: "The oldest bull market",
        lead: "A bull market is a long stretch of broadly rising prices, and the one running in January 2019 is nearly ten years old.",
        body: [
          "Prices have climbed, with interruptions, ever since the financial crisis bottomed in March 2009. Then last month the climb cracked: December 2018 was the market's worst December since 1931, and prices fell almost 20 percent from their September peak before bouncing on Christmas Eve.",
          "The business channels are running recession countdowns for 2019, and famous investors are warning that the bull is living on borrowed time. This era begins inside that argument.",
        ],
      },
      {
        heading: "The cast",
        lead: "A share is one small piece of a real company, so every price on this tape is a live opinion about a real business.",
        body: [
          "Your menu holds the phone maker that just issued its first warning in more than fifteen years, the everything store that briefly became the most valuable company on Earth this month, the graphics chip designer that just lost half its value when a coin-mining fad ended, and the electric carmaker that more investors bet against than any other American stock.",
          "Two more join the tape mid-story, because they are still private in January. A video call company arrives on the market in April, and a $2,000 exercise bike company arrives in September. Until each one lists, it cannot be bought at any price, because a private company has no shares on the market. And one dying mall video game store rounds out the menu, priced like the ending everyone expects.",
        ],
      },
      {
        heading: "The doubters' case",
        lead: "A recession is a broad slowdown in which the whole economy shrinks for months, and forecasters spend 2019 predicting one.",
        body: [
          "The trade war with China is raising prices on both sides of the Pacific, the central bank has been lifting interest rates for three years, and a famous bond market signal that has preceded past recessions is flashing again.",
          "The doubters' advice follows simply: wait in cash until the storm passes. What the era will test is not whether their worries were real, but whether anyone can stand aside from the market and then choose the right moment to come back.",
        ],
      },
      {
        heading: "Why the boring index rides along",
        lead: "An index fund owns a small piece of every large company at once, so no single disaster can sink it.",
        body: [
          "Beside your orb runs the rainbow orb. It holds the real S&P 500 with dividends reinvested, it never trades, and it never has an opinion about which company wins.",
          "Over long stretches, most professional stock pickers fail to beat that plain index, which is an honest, measured fact and not an insult. Watching what the index does with six chaotic years, without making one decision, is half the lesson of this era.",
        ],
      },
      {
        heading: "What you will live through",
        lead: "A fair replay of history includes the crash and the giveback, not just the boom.",
        body: [
          "Every series on this tape is real market data, month by month through December 2024, with splits and dividends folded in. Most start in January 2019, and the two newcomers start from their first month on the market. Nothing is reconstructed and nothing is invented. The headlines that appear along the way ran verbatim in the named publications on the named dates.",
          "Five times the tape will pause at a real crossroads and ask what you would have done, knowing only what people knew that month. The rainbow orb rides beside you the whole way, and the debrief at the end reads your own choices back to you.",
        ],
      },
    ],
    timeline: [
      { date: "December 24, 2018", text: "The market caps its worst December since 1931, down almost 20 percent from September's peak." },
      { date: "January 2, 2019", text: "The phone maker warns that sales in China are slowing, its first warning like that in more than fifteen years." },
      { date: "February 19, 2020", text: "The index closes at an all-time record. The virus is three weeks from closing the country." },
      { date: "March 23, 2020", text: "The index bottoms, down about 34 percent in 33 days, the fastest fall of that size in American history." },
      { date: "August 18, 2020", text: "The index closes at a new record, less than five months after the bottom." },
      { date: "January 28, 2021", text: "The mall game store touches $483, up from about $19 a month earlier, and some trading apps restrict buying." },
      { date: "January 3, 2022", text: "The index closes at a record for the last time in two years." },
      { date: "October 12, 2022", text: "The bear market touches its floor, down about 25 percent, though nobody rings a bell that day." },
      { date: "January 19, 2024", text: "The index closes at a record for the first time in two years." },
      { date: "December 31, 2024", text: "The index finishes 2024 at 5,882, its second straight year of gains above 20 percent." },
    ],
    sources: [
      { label: "The 2020 crash", url: "https://en.wikipedia.org/wiki/2020_stock_market_crash" },
      { label: "The GameStop squeeze", url: "https://en.wikipedia.org/wiki/GameStop_short_squeeze" },
      { label: "The 2022 bear market", url: "https://en.wikipedia.org/wiki/2022_stock_market_decline" },
    ],
  },
};

// Verified headlines for the covid era, in the src/lib/headlines.ts Clipping
// shape; integration appends this list to HEADLINES under the "covid" key.
// Every headline is verbatim from the named publication on the named date,
// verified against the live pages and archives on 2026-08-06:
// - NYT March 12, 2020 was already verified for the crypto era (same event).
// - Forbes August 18, 2020 (Sergei Klebnikov), forbes.com/sites/
//   sergeiklebnikov/2020/08/18/sp-500-closes-at-new-record-high/.
// - The Washington Post November 9, 2020, washingtonpost.com/health/2020/
//   11/09/pfizer-coronavirus-vaccine-effective/.
// - The New York Times January 27, 2021 (Matt Phillips and Taylor Lorenz),
//   nytimes.com/2021/01/27/business/gamestop-wall-street-bets.html.
// - CNBC January 20, 2022 (Lauren Thomas), cnbc.com/2022/01/20/
//   peloton-to-pause-production-of-its-bikes-treadmills-as-demand-wanes.html.
// - CNN Business January 19, 2024, cnn.com/2024/01/19/markets/
//   stocks-sp500-record-high/.
export const covidHeadlines: Clipping[] = [
  { atStep: 14, date: "March 12, 2020", source: "The New York Times", headline: "Wall Street Suffers Worst Rout Since Black Monday" },
  { atStep: 19, date: "August 18, 2020", source: "Forbes", headline: "S&P 500 Closes At New Record High, Fully Recovering Losses From Coronavirus Pandemic" },
  // days: 2 keeps this clipping to steps 22-23 (Nov and Dec 2020). With the
  // default 3-step window it would also cover step 24, and clippingAt()
  // returns the first match, so it would shadow the GameStop clipping in
  // the meme-mania gate month, January 2021.
  { atStep: 22, days: 2, date: "November 9, 2020", source: "The Washington Post", headline: "Pfizer's covid vaccine is more than 90 percent effective in first analysis, company reports" },
  { atStep: 24, date: "January 27, 2021", source: "The New York Times", headline: "'Dumb Money' Is on GameStop, and It's Beating Wall Street at Its Own Game" },
  { atStep: 36, date: "January 20, 2022", source: "CNBC", headline: "Peloton to halt production of its Bikes, treadmills as demand wanes" },
  { atStep: 60, date: "January 19, 2024", source: "CNN Business", headline: "S&P 500 closes at record high for first time in two years" },
];

// Static quick-check items for the covid era, in the src/lib/checkpoints.ts
// CheckItem shape; integration adds this list to STATIC_ITEMS under the
// "covid" key (the run-aware template items stay in checkpoints.ts).
export const covidCheckItems: CheckItem[] = [
  {
    // CEE Investing 12-5c ladder (downturns move asset prices, and
    // recoveries arrive unannounced); concept: crash
    id: "covid-crash-speed",
    focus: 19,
    concept: "crash",
    prompt: "In early 2020 the market fell by about a third in 33 days, the fastest fall of that size ever. How long did it take to close at a record again?",
    options: ["About six months", "About two years", "About six years", "It still has not"],
    answer: 0,
    explain: "The old record came on February 19, 2020, and the market closed at a new one on August 18, about six months later. Nobody rang a bell at the turn, so a seller in March had no signal telling them when to come back.",
  },
  {
    // CEE Investing 12-2c ladder (speculation, crowds, and short-term
    // greed); concept: bubble
    id: "covid-meme",
    focus: 24,
    concept: "bubble",
    prompt: "The mall game store multiplied about seventeen times over in January 2021. What was pushing the price up?",
    options: [
      "Its profits multiplied that same month",
      "A crowd of buyers and a short squeeze",
      "A surprise new game console",
      "A big dividend announcement",
    ],
    answer: 1,
    explain: "The business did not change that month. A crowd kept buying, and funds that had bet against the stock were forced to buy it back at any price. By the end of February the price had given back more than two thirds.",
  },
  {
    // CEE Investing 12-5b ladder (expectations are already in the price);
    // concept: market-price
    id: "covid-priced-forever",
    focus: 47,
    concept: "market-price",
    prompt: "The video call company kept growing after 2020, yet its stock fell more than 80 percent from its peak. How can both be true?",
    options: [
      "Its product secretly stopped working",
      "The peak price had already assumed lockdown life would last forever",
      "The company went bankrupt",
      "The whole market fell that much too",
    ],
    answer: 1,
    explain: "A market price is only the last trade, and the last trades of 2020 paid for a future where the whole world kept meeting on screens. The business grew, reality arrived smaller than the price had assumed, and the price gave the difference back.",
  },
  {
    // CEE Investing 12-5c ladder (downturns and investor mood); concept:
    // panic-selling
    id: "covid-panic-cost",
    focus: 14,
    concept: "panic-selling",
    prompt: "Suppose a frightened investor sold the index at the end of March 2020 and never came back. What had the index done by the end of 2024?",
    options: [
      "It fell further and stayed down",
      "It roughly broke even",
      "It multiplied about two and a half times over without them",
      "It was closed for most of that time",
    ],
    answer: 2,
    explain: "From the March 2020 close to the end of 2024, the index with dividends multiplied about two and a half times over. Panic selling turns a temporary fall into a permanent miss.",
  },
  {
    // CEE Investing 8-5a (diversification within and among asset classes);
    // concept: diversification
    id: "covid-spread",
    focus: 71,
    concept: "diversification",
    prompt: "By the end of 2024, the exercise bike company sat about 95 percent below its 2020 peak, while the chip designer was worth about 37 times its January 2019 price. Which orb never had to guess which story was coming?",
    options: [
      "The orb that held only the stay-at-home darlings",
      "The orb that held only the chip designer",
      "The orb that held the whole market",
      "No orb could survive these six years",
    ],
    answer: 2,
    explain: "The index owned the winners and the losers at once, so the chip designer's rise could pay for the darlings' fall without anyone predicting either. Spreading out buys you the market's story instead of one company's.",
  },
];
