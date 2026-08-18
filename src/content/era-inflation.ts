// The inflation years, 2021 to 2024. All six series are real market prices
// baked from monthly data (tools/bake_era_inflation.mjs), split-and-dividend
// adjusted with each series anchored at its real January 2021 quote; there
// are no reconstructions in this era. Documented split factor: WMT ran a
// 3-for-1 split on February 26, 2024, so its series is re-anchored at the
// real $140.49 close of January 29, 2021 (verified against the daily tape).
// Scouting notes are written strictly as of January 2021, in the style
// contract's voice. Dated facts verified against the record: April 2021 CPI
// +4.2 percent reported May 12, 2021 (fastest since 2008); December 2021 CPI
// +7.0 percent reported January 12, 2022 (most since 1982); first Fed hike
// since 2018 on March 16, 2022; AAA national average gasoline over $5 on
// June 11, 2022; June 2022 CPI +9.1 percent reported July 13, 2022 (largest
// since November 1981); S&P 500 closing low 3,577.03 on October 12, 2022,
// down about 25 percent from the 4,796.56 record of January 3, 2022; 2022
// was the worst year on record for the broad U.S. bond index, with TLT down
// 31.2 percent including reinvested interest; ExxonMobil lost $22.4 billion
// in 2020, left the Dow in August 2020 after 92 years, then earned a record
// $55.7 billion in 2022; the S&P 500's new record close 4,839.81 on
// January 19, 2024; CPI rose about 21 percent from January 2021 to December
// 2024.
//
// This module exports the ScenarioConfig (inflation, registered in
// src/lib/scenarios.ts SCENARIOS), the verified clippings
// (inflationHeadlines, wired into src/lib/headlines.ts HEADLINES), and the
// five static quiz items (inflationQuiz, wired into src/lib/checkpoints.ts
// STATIC_ITEMS).
import eraInflation from "../data/eraInflation.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";
import type { CheckItem } from "../lib/checkpoints";
import type { Clipping } from "../lib/headlines";

export const inflation: ScenarioConfig = {
  id: "inflation",
  lesson: "Lesson 7",
  title: "The inflation years",
  headerSub: "The sharpest inflation in forty years, 2021 to 2024",
  cardLine: "Real market prices run from January 2021 through the sharpest inflation in forty years.",
  learn: "What rising prices do to cash.",
  dots: ["#0a84ff", "#64d2ff", "#8e8e93", "#30d158", "#5e5ce6"],
  time: "about 5 minutes",
  dataset: eraInflation as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It holds the real S&P 500, sealed at the start.",
  // The menu includes a bond fund, so "company" would be wrong for one card;
  // "holding" reads naturally after "a" and "one" for all five.
  castNoun: "holding",
  castFoundedLabel: "Started",
  assets: [
    {
      id: "AAPL", real: "Apple", name: "Fruit Computers",
      desc: "It is the most valuable company in the world, and its phone is in a billion pockets.",
      color: "#0a84ff", glow: "#7cc0ff",
      founded: 1976,
      history: "Last August it became the first company in history worth two trillion dollars. This past fall it launched a 5G phone and began building its own chips, and people stuck at home bought its computers, tablets, and watches in record numbers.",
      believers: "A billion people live inside its products, and it turns that loyalty into more profit than any company on earth.",
      doubters: "Its stock nearly doubled in a year even though its profits grew far less, and a price that has run ahead of the business is leaning on money staying cheap.",
    },
    {
      id: "WMT", real: "Walmart", name: "Everything Mart",
      desc: "It sells groceries and everything else, cheap, in every town.",
      color: "#64d2ff", glow: "#b0e8ff",
      founded: 1962,
      history: "It grew from one discount store in Arkansas in 1962 into the biggest retailer on earth. In the pandemic year just ended, its stores stayed open as essential, and its online orders nearly doubled.",
      believers: "It sells groceries and everyday basics, the last things families cut, and when money gets tight shoppers trade down to the cheapest store in town.",
      doubters: "It earns pennies on each dollar of sales, and if its own costs and its workers' wages rise faster than the prices it dares to charge, those pennies shrink.",
    },
    {
      id: "XOM", real: "ExxonMobil", name: "Giant Oil",
      desc: "It pumps, refines, and sells oil around the world, and it just had its worst year ever.",
      color: "#8e8e93", glow: "#c7c7cc",
      founded: 1870,
      history: "It descends from the original Standard Oil, and it just finished the worst year in its modern history. It lost more than $22 billion in 2020, it was dropped from the Dow Jones Industrial Average after 92 years, and for one strange day last spring the price of a barrel of oil fell below zero.",
      believers: "The world still runs on oil, this company pumps some of the cheapest barrels on earth, and it kept paying its dividend straight through the disaster.",
      doubters: "Electric cars are coming, governments are turning against its product, and a company that just lost $22 billion may be watching its industry begin a long goodbye.",
    },
    {
      id: "PG", real: "Procter & Gamble", name: "The Soap Maker",
      desc: "Its detergent, diapers, and toothpaste fill the shelves of every store.",
      color: "#30d158", glow: "#8ff0ae",
      founded: 1837,
      history: "It has sold soap in America since 1837, and today its brands fill the shelves: detergent, diapers, razors, toothpaste. In the pandemic year, all that scrubbing and stocking up pushed its sales to their fastest growth in a decade.",
      believers: "Families buy toothpaste in booms and in busts, and when its own costs rise it can nudge its prices up and shoppers pay without noticing.",
      doubters: "Almost everyone who will ever buy its soap already buys it, so it grows slowly, and its stock is priced like a faster company than it is.",
    },
    {
      id: "TLT", real: "iShares 20+ Year Treasury Bond fund", name: "The Steady Lender",
      desc: "It is a fund that lends money to the United States government for twenty years or more at a time.",
      color: "#5e5ce6", glow: "#a8a5f5",
      founded: 2002,
      history: "It holds long loans to the United States government, each running twenty years or more, and it passes their interest along to its owners. Interest rates have fallen, on and off, for forty years, and every fall lifted funds like this one, so it enters 2021 near the highest prices of its life.",
      believers: "It lends to the safest borrower on earth, and when stocks crashed in 2008 and again last March, money ran here for shelter.",
      doubters: "Interest rates are the lowest ever recorded, so the shelter now pays almost nothing, and a twenty-year loan made at 1.7 percent has a long way to fall if rates ever return to normal.",
    },
  ],
  moments: [
    mom(4, 3, "Prices start rising", "Everything costs a little more than last month. Officials say it will pass."),
    mom(12, 2, "Seven percent", "Prices are rising at the fastest pace since 1982."),
    mom(14, 3, "The Fed moves", "The first rate raise since 2018, with six more signaled."),
    // The tape's clock: the era's record close is 2021-12 (step 11, 9,986.70)
    // and its lowest close is 2022-09 (step 20, 7,603.14), 23.9 percent below
    // it, so "Nowhere to hide" narrates June (stocks 20.0 percent off the
    // record, the bond fund down 22.7 percent from the start) and "The
    // bottom" sits on the month the player's own chart bottoms.
    mom(17, 3, "Nowhere to hide", "Stocks and bonds are falling together, which almost never happens."),
    mom(18, 3, "Nine point one", "Inflation peaks. Gas costs more than five dollars a gallon."),
    mom(20, 3, "The bottom", "Stocks have fallen for nine months, and almost nobody wants to buy."),
    mom(26, 3, "The cooling", "Inflation slows month by month. Store prices stay up."),
    mom(36, 3, "New highs", "Two years after the old record, the market sets a new one."),
  ],
  gates: [
    // CEE Investing 12-4 ladder (real versus nominal, taught as buying
    // power); concept: inflation
    {
      atStep: 4,
      title: "May 2021",
      question: "Prices just jumped 4.2 percent in a year, the fastest since 2008, and officials call it temporary. What do you do with your cash?",
      eyebrow: "Inflation",
      definition: "Inflation is the slow rise of prices that makes each dollar buy a little less.",
      context: [
        "This month's report says prices are 4.2 percent higher than they were a year ago, the fastest rise since 2008, with used cars and gasoline leading the way. The people in charge say the jump is transitory, a passing side effect of the world reopening after the pandemic.",
        "Your cash keeps its printed number either way. If prices keep rising at this pace, a $1,000 bill will buy about $960 of today's things next year, and the savings account offers no rescue, because interest rates have sat near zero since the pandemic began.",
      ],
      options: [{ label: "Put most of it to work in the market", act: true }, { label: "Keep waiting in cash" }, { label: "Buy the bond fund for shelter", act: true }],
      refs: [{ label: "The 2021 to 2023 inflation surge", url: "https://en.wikipedia.org/wiki/2021%E2%80%932023_inflation_surge" }],
    },
    // CEE Investing 12-3 (bond prices fall when interest rates rise);
    // concept: market-price
    {
      atStep: 14,
      title: "March 2022",
      question: "The Fed just raised interest rates for the first time since 2018 and signaled six more raises this year. What do you do?",
      eyebrow: "Interest rates",
      definition: "An interest rate is the price of borrowed money.",
      context: [
        "Inflation reached 7 percent this winter, the most since 1982, and the Federal Reserve has answered. This month it raised its interest rate for the first time since 2018 and signaled six more raises before the year ends, because making borrowed money expensive is how a central bank slows spending until prices calm down.",
        "Rising rates reach The Steady Lender first. Its old loans pay the low interest of the old world, and nobody pays full price for an old loan once new loans pay more. The longer a loan has left to run, the further its price falls when rates rise, and this fund holds the longest loans there are.",
      ],
      options: [{ label: "Sell The Steady Lender", act: true }, { label: "Hold everything as planned" }, { label: "Buy the dip in stocks", act: true }],
      refs: [
        { label: "The Federal Reserve's rate", url: "https://en.wikipedia.org/wiki/Federal_funds_rate" },
        { label: "The 2021 to 2023 inflation surge", url: "https://en.wikipedia.org/wiki/2021%E2%80%932023_inflation_surge" },
      ],
    },
    // CEE Investing 8-5a (diversification within and among asset classes),
    // reaching into the 12-5c ladder (downturns move asset prices);
    // concept: diversification
    {
      atStep: 18,
      title: "July 2022",
      question: "Inflation just hit 9.1 percent, gas just passed five dollars a gallon, and stocks and bonds are falling together. What do you do?",
      eyebrow: "Nowhere to hide",
      definition: "Diversification is spreading your money over many different things so that one bad one cannot sink you.",
      context: [
        "Diversification softens most bad years, but no mix of investments removes risk completely, and this is the rare year that proves it. The report this month says prices are 9.1 percent higher than a year ago, the largest rise since 1981. A gallon of gas passed five dollars in June for the first time ever, and the Fed has started raising rates in triple-size steps.",
        "The old seatbelt is failing its one job. The index closed June about a fifth below its record, and this month's bounce has won back only part of that fall. The Steady Lender is falling just as hard, because rate rises hurt long loans most, and even sitting out is losing quietly, since a dollar in cash buys about 8 percent less than it did a year ago. Every choice this month costs something. The question is which cost you can live with.",
      ],
      options: [{ label: "Sell everything and take the cash", act: true }, { label: "Hold and keep going" }, { label: "Buy more while it is down", act: true }],
      refs: [{ label: "The 2022 market decline", url: "https://en.wikipedia.org/wiki/2022_stock_market_decline" }],
    },
    // CEE Investing 12-5c ladder (downturns move asset prices, and nobody
    // rings a bell at the bottom); concept: crash. The copy uses the clock
    // the player can see, this tape's monthly closes: the record close is
    // 2021-12 (step 11, 9,986.70) and the 2022-09 close (step 20, 7,603.14)
    // sits 23.9 percent below it, "about a quarter", while this month's
    // close (step 21, 8,218.70) buys 21.5 percent more index per dollar than
    // the record did, "about a fifth". The one daily figure, the October 12
    // closing low, names its date explicitly because the monthly tape never
    // shows that price.
    {
      atStep: 21,
      title: "October 2022",
      question: "Stocks have fallen for ten months, inflation is still above 8 percent, and most forecasters expect a recession. What do you do?",
      eyebrow: "Market bottoms",
      definition: "A market bottom is the moment prices stop falling, and nobody can see one except by looking back.",
      context: [
        "Last month the index closed about a quarter below the record it set last December, its lowest close of this era, and the daily low came on October 12 of this month. Inflation is still above 8 percent, the Fed is still raising rates, and most forecasters expect a recession next year.",
        "The 2008 era taught that bottoms only announce themselves in hindsight, and this one is no different. Every dollar invested this month buys about a fifth more index than it bought at the record, and it does not feel like an opportunity. It feels like standing in the rain waiting for more rain.",
      ],
      options: [{ label: "Buy", act: true }, { label: "Hold" }, { label: "Stay out" }],
      refs: [{ label: "The 2022 market decline", url: "https://en.wikipedia.org/wiki/2022_stock_market_decline" }],
    },
    // CEE Investing 12-5c ladder (downturns move asset prices, and
    // recoveries are measured in years); concept: crash
    {
      atStep: 36,
      title: "January 2024",
      question: "The market just set its first record in two years, while store prices never came back down. What do you do?",
      eyebrow: "Recoveries",
      definition: "A new record high is a normal event in a long-lived market, not a ceiling.",
      context: [
        "This month the index finally closed above the record it set in January 2022. Inflation has cooled to about 3 percent, but cooling means prices rise more slowly, not that they fall. The grocery bill that jumped in 2022 is still high, and it is staying there.",
        "The recovery arrived while plenty of money was still hiding. Savers who fled to cash in 2022 dodged part of the fall, then watched the climb happen without them while their cash quietly gave up about a tenth of its buying power. Looking back at this era, there was never a month when getting back in felt comfortable.",
      ],
      options: [{ label: "Sell and lock in the recovery", act: true }, { label: "Stay with the plan" }, { label: "Put spare cash in", act: true }],
      refs: [{ label: "S&P 500 closing milestones", url: "https://en.wikipedia.org/wiki/Closing_milestones_of_the_S%26P_500" }],
    },
  ],
  startCash: 1000,
  fractionalDefault: false,
  briefTitle: "January 2021. Money is nearly free, and prices have been quiet for years.",
  briefBody: [
    "You have $1,000 and four years. The villain of this era is not a crash. It is the quiet leak from the cash lesson, about to run faster than it has in forty years. Every series on the menu is real, month by month.",
    "The rainbow orb puts the same $1,000 all-in on the real S&P 500.",
  ],
  startLabel: "Start in 2021",
  endTitle: "December 2024. Prices never fell back, and the market recovered anyway.",
  bullets: [
    { c: "#5e5ce6", text: "The Steady Lender lent to the safest borrower on earth and still lost about a third of its value when rates jumped. Even lending has a price, and prices move." },
    { c: "#8e8e93", text: "A $100 bill kept in a drawer still said $100 in 2024, but it bought about what $83 bought in 2021. That is the cash lesson's quiet leak at full speed." },
    { c: "#30d158", text: "Giant Oil, the most doubted name of 2020, was the best performer of 2022. The rainbow orb owned it the whole time without guessing." },
  ],
  cardSubline: "This run lived the inflation years, 2021 to 2024, on real prices.",
  // CEE Investing 12-4 ladder (real versus nominal, taught as buying power),
  // 12-3 (bond prices fall when interest rates rise), 8-5a (diversification
  // within and among asset classes), and the 12-5c ladder (downturns move
  // asset prices); the briefing is the era's documentary record, so its
  // dated timeline honestly includes the ending
  briefing: {
    title: "The world of January 2021",
    deck: "This page holds two minutes of real history. The dated timeline near the end tells you how the era turns out.",
    readTime: "about 2 minutes",
    sections: [
      {
        heading: "The quiet leak",
        lead: "Inflation is the slow rise of prices that makes each dollar buy a little less.",
        body: [
          "The cash lesson met inflation as a slow leak, a few percent a year. In January 2021 that is all anyone expects. Prices have risen gently for a decade, the pandemic still has people saving instead of spending, and the government has mailed out trillions of dollars to carry families through the shutdowns.",
          "The ingredients of something faster are already lying around. Factories and ports are jammed, so goods are scarce. Families are sitting on saved-up money, so spending is ready to surge. When too many dollars chase too few goods, prices rise, and this time they are about to rise faster than they have in forty years.",
        ],
      },
      {
        heading: "The price of borrowed money",
        lead: "An interest rate is the price of borrowed money.",
        body: [
          "In January 2021 that price is nearly zero. The Federal Reserve, the bank at the center of American banking, cut rates to the floor when the pandemic hit, so loans are cheap, savings accounts pay almost nothing, and money pours toward anything that might grow. The savings lesson called interest the bank paying you to wait, and right now the bank barely pays at all.",
          "The Federal Reserve has a second job. When prices rise too fast, it raises interest rates to cool the country's spending back down, and raising rates reprices nearly everything people own, because every investment competes with the interest a boring loan now pays.",
        ],
      },
      {
        heading: "The Steady Lender",
        lead: "A bond is a loan cut into pieces that investors can buy, and each piece pays its owner back over time.",
        body: [
          "One name on this era's menu is not a company. The Steady Lender is a fund that owns long bonds of the United States government, loans running twenty years or more, and it passes their interest through to whoever holds it. Nobody doubts the government will pay, and for decades that made funds like it the calm half of a portfolio, the seatbelt that held when stocks crashed.",
          "A bond's price moves even when its payments never miss. If new loans start paying more interest than an old one does, nobody buys the old one at full price, so its price falls, and the longer the loan has left to run, the further it falls. In January 2021 interest rates are the lowest ever recorded, which means these old low-interest loans have more room to fall than they have ever had.",
        ],
      },
      {
        heading: "What you will live through",
        lead: "A fair replay of history includes the years when nothing seems to work.",
        body: [
          "All six series on the tape are real, month by month from January 2021 to December 2024, with dividends and interest reinvested and no reconstructions. You will live through the fastest price rises since 1981, gasoline over five dollars a gallon, and a year in which stocks and bonds fell together while cash quietly leaked buying power.",
          "You will also live through the other side. A bottom arrived while the headlines were still frightening, and the market returned to records while inflation cooled and store prices stayed high. At five crossroads the tape pauses and asks what you would have done. The rainbow orb rides beside you the whole way, holding the real S&P 500, and it never trades once.",
        ],
      },
    ],
    timeline: [
      { date: "May 12, 2021", text: "April's prices come in 4.2 percent higher than a year before, the fastest rise since 2008. Officials call it transitory." },
      { date: "January 12, 2022", text: "Inflation reaches 7 percent, the most since 1982." },
      { date: "March 16, 2022", text: "The Federal Reserve raises interest rates for the first time since 2018 and signals six more raises for the year." },
      { date: "June 11, 2022", text: "The national average price of gasoline passes five dollars a gallon for the first time." },
      { date: "July 13, 2022", text: "June's inflation reading peaks at 9.1 percent, the largest yearly rise since 1981." },
      { date: "October 12, 2022", text: "The S&P 500 closes at 3,577, down about 25 percent from its January record. This is the bottom, and the headlines are still terrible." },
      { date: "December 31, 2022", text: "The broad U.S. bond market finishes its worst year on record, and the twenty-year Treasury fund has lost about 31 percent even with interest reinvested." },
      { date: "January 19, 2024", text: "The S&P 500 closes at a record 4,839, two years after the old record." },
    ],
    sources: [
      { label: "The 2021 to 2023 inflation surge", url: "https://en.wikipedia.org/wiki/2021%E2%80%932023_inflation_surge" },
      { label: "The 2022 market decline", url: "https://en.wikipedia.org/wiki/2022_stock_market_decline" },
      { label: "The Federal Reserve's rate", url: "https://en.wikipedia.org/wiki/Federal_funds_rate" },
      { label: "United States Treasury securities", url: "https://en.wikipedia.org/wiki/United_States_Treasury_security" },
    ],
  },
};

// Real headlines for the clipping cards, verbatim from the named publication
// on the named date, verified against the archived pages (see repo history
// for the verification notes). Integration wires this list into
// src/lib/headlines.ts under the "inflation" key.
export const inflationHeadlines: Clipping[] = [
  { atStep: 4, date: "May 12, 2021", source: "CNBC", headline: "Inflation speeds up in April as consumer prices leap 4.2%" },
  { atStep: 12, date: "January 12, 2022", source: "Associated Press", headline: "US inflation soared 7% in past year, the most since 1982" },
  { atStep: 14, date: "March 16, 2022", source: "CNBC", headline: "Federal Reserve approves first interest rate hike in more than three years, sees six more ahead" },
  { atStep: 18, date: "July 13, 2022", source: "CNBC", headline: "Inflation rose 9.1% in June, even more than expected, as consumer pressures intensify" },
  { atStep: 20, date: "September 26, 2022", source: "CNBC", headline: "S&P 500 notches new closing low for 2022, Dow falls into bear market as dollar surges" },
  { atStep: 24, date: "January 7, 2023", source: "CNBC", headline: "2022 was the worst-ever year for U.S. bonds. How to position your portfolio for 2023" },
  { atStep: 36, date: "January 19, 2024", source: "NBC News", headline: "S&P 500 hits all-time high, surpassing previous record set in 2022" },
];

// Five static quiz items for the era's quick check. Integration wires this
// list into src/lib/checkpoints.ts STATIC_ITEMS under the "inflation" key;
// run-aware template items apply on top as in every era.
export const inflationQuiz: CheckItem[] = [
  {
    // CEE Investing 12-4 ladder (real versus nominal, taught as buying
    // power); concept: inflation
    id: "inflation-cash",
    focus: 47,
    concept: "inflation",
    prompt: "From January 2021 to December 2024, American prices rose about 21 percent. What happened to a $100 bill kept in a drawer the whole time?",
    options: [
      "It grew to $121, because prices rose",
      "It still said $100, but it bought about what $83 bought in 2021",
      "It lost half its buying power",
      "Nothing, because cash cannot lose buying power",
    ],
    answer: 1,
    explain: "Cash keeps its printed number, not its buying power. The cash lesson called inflation a quiet leak, and in this era the leak ran at its fastest pace in forty years, quietly costing the bill about a sixth of what it could buy.",
  },
  {
    // CEE Investing 12-3 (bond prices fall when interest rates rise);
    // concept: market-price
    id: "inflation-bonds",
    focus: 23,
    concept: "market-price",
    prompt: "The Steady Lender held only loans to the United States government, and the government paid every penny it owed. Why did the fund still fall about 31 percent in 2022?",
    options: [
      "The government missed its payments",
      "New loans began paying higher interest, so nobody would pay full price for its old low-interest loans",
      "The fund secretly held stocks",
      "Bond funds always fall when oil prices rise",
    ],
    answer: 1,
    explain: "A bond's price is whatever a buyer will pay for it today. When new loans pay 4 percent, an old loan paying 1.7 percent only finds a buyer at a discount, and the longer the loan has left to run, the deeper the discount. Safe from default is not the same as safe from repricing.",
  },
  {
    // CEE Investing 8-5a (diversification within and among asset classes);
    // concept: diversification
    id: "inflation-nowhere",
    focus: 20,
    concept: "diversification",
    prompt: "In 2022, stocks fell about 18 percent and long government bonds fell about 31 percent in the same year. What is the honest lesson?",
    options: [
      "Diversification is worthless",
      "Spreading out softens most storms, but no mix of investments removes risk, and a rare year can hit almost everything at once",
      "Bonds are riskier than stocks in every year",
      "The safe move was obvious in advance",
    ],
    answer: 1,
    explain: "In most crashes before 2022, bonds held the line while stocks fell, and 2022 broke that pattern. Diversification is still the best shelter available, but it is a raincoat, not a roof, and even cash lost 6.5 percent of its buying power that year.",
  },
  {
    // CEE Investing 12-5c ladder (downturns move asset prices, and nobody
    // rings a bell at the bottom); concept: crash
    id: "inflation-bottom",
    focus: 21,
    concept: "crash",
    prompt: "The index set its era low in the fall of 2022, while inflation ran above 8 percent and forecasters expected a recession. When did getting back in finally feel safe?",
    options: [
      "The moment inflation returned to normal",
      "Never on any particular day, because prices turned while the headlines were still bad, which nobody could see except by looking back",
      "The day rates were cut back to zero",
      "The bottom was announced a week in advance",
    ],
    answer: 1,
    explain: "A market bottom is only visible in the rearview mirror. Waiting for the news to feel safe meant missing the months that did most of the recovering, and the record close of January 2024 arrived while many of 2022's sellers were still waiting in cash.",
  },
  {
    // CEE Investing 8-5b (diversified fund versus individual assets);
    // concept: index-fund
    id: "inflation-rotation",
    focus: 23,
    concept: "index-fund",
    prompt: "Giant Oil lost $22 billion in 2020 and was dropped from the Dow. In 2022 it returned about 87 percent while the market fell 18 percent. Who was certain to own it for that year?",
    options: [
      "Only professional stock pickers",
      "Anyone holding an index fund, because owning everything includes the unloved names before their turn comes",
      "Nobody, because it had been delisted",
      "Only people who predicted the oil price",
    ],
    answer: 1,
    explain: "Winners rotate without sending invitations. The market's best performer of 2022 was one of its most doubted names of 2020, and the rainbow orb owned it the whole time without making a single decision. That is the quiet case for the fund from the funds lesson.",
  },
];
