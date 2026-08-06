// Pay yourself first: $50 a month through 2000 to 2007 on the dot-com
// dataset. This run uses the same real prices as The Dot-Com Era and asks a
// different question of them: not "what would you have picked" but "would you
// have kept going." All six cast members are real-price series (no
// reconstructed casualties in this cast); scouting notes are written strictly
// as of January 2000 and match era-dotcom for the shared companies, so the
// two eras never disagree about the same facts. Five gates pause the tape at
// dated, verified moments; the briefing at /orb/brief/payday is the optional
// documentary read behind them.
import eraDotcom from "../data/eraDotcom.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";

export const payday: ScenarioConfig = {
  id: "payday",
  lesson: "Lesson 3",
  title: "Pay Yourself First",
  headerSub: "you invest a little every month, 2000 to 2007",
  cardLine: "You earn $50 a month through the roughest era we have. Invest it as it comes.",
  learn: "This era shows how steady monthly investing beats waiting for the perfect moment.",
  dots: ["#ff9f0a", "#0a84ff", "#64d2ff", "#ff453a", "#30d158", "#8e8e93"],
  time: "about 6 minutes",
  dataset: eraDotcom as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It invests the same $50 every month, sealed.",
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
  ],
  moments: [
    mom(2, 4, "The bubble pops", "The internet dream meets its bill. Tech is falling, hard."),
    mom(20, 3, "September 2001", "Markets close for four days, then drop. Fear is everywhere."),
    mom(30, 3, "The fraud", "A telephone giant admits its profits were made up. Trust is scarce."),
    mom(33, 3, "Five-year lows", "Your $50 buys more shares than it ever has."),
    mom(41, 4, "The climb back", "Quietly, prices are rising again."),
    mom(93, 3, "New highs", "The market sets a record. The climb back took five years."),
  ],
  gates: [
    // CEE Investing 8-7 (compounding rewards regular investing); concept: dca
    {
      atStep: 3,
      title: "April 2000",
      question: "Prices are falling hard. Your $50 arrives anyway. What is your plan?",
      eyebrow: "Dollar cost averaging",
      definition: "Dollar cost averaging is investing the same amount on a schedule, no matter what prices are doing.",
      context: [
        "The same money every month buys more shares when prices fall and fewer when they rise, and no forecast is ever required.",
        "The internet bubble is deflating around you. In the middle of April the Nasdaq, the exchange where most technology stocks trade, capped the worst week in its history. The hard part of a schedule is that it feels worst exactly when it is working best.",
      ],
      options: [
        { label: "Keep investing every month", act: true, pay: "invest" },
        { label: "Pause until things calm down", pay: "stop" },
      ],
      refs: [{ label: "Dollar cost averaging", url: "https://en.wikipedia.org/wiki/Dollar_cost_averaging" }],
    },
    // CEE Investing 12-5c ladder (downturns move asset prices, and fear moves
    // them fastest); concept: panic-selling
    {
      atStep: 20,
      title: "September 2001",
      question: "The market just reopened to a wave of selling. Your $50 arrives on schedule. What do you do with it?",
      eyebrow: "Market panics",
      definition: "A market panic is a rush of selling driven by fear of what may come next, not by anything a business has already earned.",
      context: [
        "After the September 11 attacks the stock market closed for four trading days, its longest shutdown since the Great Depression, and prices fell hard when it reopened.",
        "The Dow, an index of thirty large American companies, dropped 684 points on the first day back, its biggest one-day point fall up to then. Nobody trading this month knows what happens next. Your plan was written on a calmer day, and it only asks you to do what it says.",
      ],
      options: [
        { label: "Invest it like any other month", act: true, pay: "invest" },
        { label: "Hold this month's $50 in cash", pay: "hold" },
        { label: "Sell what I own and step away", act: true, pay: "stop" },
      ],
      refs: [{ label: "The market after September 11", url: "https://en.wikipedia.org/wiki/Economic_effects_of_the_September_11_attacks" }],
    },
    // CEE Investing 8-7 with the 12-5c ladder (nobody can time the bottom);
    // concept: dca
    {
      atStep: 33,
      title: "October 2002",
      question: "The market is at its lowest point in five years. Do you stick to the plan?",
      eyebrow: "Market bottoms",
      definition: "A market bottom is only visible after it has passed, and nobody rings a bell when it arrives.",
      context: [
        "The index has fallen for almost three years, a telephone giant filed the largest bankruptcy in American history in July after admitting its profits were made up, and people who bragged about stocks in 2000 now call the whole market a casino.",
        "Your schedule has quietly changed what a dollar does. Fifty dollars this month buys about half again as many index shares as it bought in January 2000, and it still feels like the worst possible time to buy.",
      ],
      options: [
        { label: "Stick to the plan", act: true, pay: "invest" },
        { label: "Skip this month", pay: "hold" },
        { label: "Sell everything and stop the plan", act: true, pay: "stop" },
      ],
      refs: [
        { label: "The 2002 downturn", url: "https://en.wikipedia.org/wiki/Stock_market_downturn_of_2002" },
        { label: "The WorldCom scandal", url: "https://en.wikipedia.org/wiki/WorldCom_scandal" },
      ],
    },
    // CEE Investing 12-5c ladder (turns arrive without warning, so timing
    // fails); concept: dca
    {
      atStep: 41,
      title: "June 2003",
      question: "Prices are up about a tenth from October's lows. A friend in cash says he will start after the next dip. What does your plan do?",
      eyebrow: "Market timing",
      definition: "Market timing is trying to choose the moments to be in or out of the market, and it fails because the turns arrive without warning.",
      context: [
        "Since its October 2002 low the monthly index chart you are watching has already climbed about a tenth, and most of that gain came before the news turned cheerful.",
        "A friend who moved to cash during the crash is still waiting for prices to fall back before starting again. Waiting has a cost that never shows up on a statement: it is the shares the plan would have bought while the waiter watched.",
      ],
      options: [
        { label: "The plan does not wait. Invest this month's $50", act: true, pay: "invest" },
        { label: "Copy the friend and wait for a dip", pay: "stop" },
      ],
      refs: [{ label: "Market timing", url: "https://en.wikipedia.org/wiki/Market_timing" }],
    },
    // CEE Investing 12-5b ladder (expectations are already in the price);
    // concept: market-price
    {
      atStep: 93,
      title: "October 2007",
      question: "The index just set an all-time record. Your $50 arrives on schedule. Does the plan change?",
      eyebrow: "Record highs",
      definition: "A record high is simply the newest price in a market that has been rising, and it says nothing about the price after it.",
      context: [
        "On October 9, 2007, the S&P 500, an index that bundles five hundred large American companies into one number, closed at a record 1,565, five years to the day after it bottomed at 777.",
        "Buying at a record feels as hard as buying at a bottom, for the opposite reason. A record does not mean prices are safe, and it does not mean they are finished rising. It only means the chart behind you looks good, and charts only look backward.",
      ],
      options: [
        { label: "No. Invest it like every other month", act: true, pay: "invest" },
        { label: "Wait in cash for lower prices", pay: "stop" },
        { label: "Sell some. Records make me nervous", act: true, pay: "hold" },
      ],
      refs: [{ label: "S&P 500 closing milestones", url: "https://en.wikipedia.org/wiki/Closing_milestones_of_the_S%26P_500" }],
    },
  ],
  startCash: 100,
  income: 50,
  fractionalDefault: true,
  briefTitle: "It is January 2000, and you have $100 and a paycheck.",
  briefBody: [
    "Every month, $50 arrives in your dish. The market is about to get ugly. That is the point.",
    "The rainbow orb invests its $50 into the index every month, automatically.",
  ],
  startLabel: "Start earning",
  endTitle: "It is December 2007, and the last payday just arrived.",
  bullets: [
    { c: "#30d158", text: "A schedule never needs a forecast. It invests on payday, whatever the headlines say." },
    { c: "#0a84ff", text: "Nobody rings a bell at the bottom. Steady beats clever." },
    { c: "#ff9f0a", text: "The rainbow orb invested its $50 into the whole market every single month. Steady and spread out is very hard to beat." },
    { c: "#bf5af2", text: "If one of your colors won big, remember that one store did that. Most did not, and in 2000 nobody knew which." },
  ],
  cardSubline: "This run earned $50 a month, 2000 to 2007, on real prices.",
  // CEE Investing 8-7 (compounding rewards regular investing; future value of
  // a regular series) with the 12-5c ladder (downturns move asset prices, and
  // nobody can time them); the briefing is the era's documentary record, so
  // its dated timeline honestly includes the ending
  briefing: {
    title: "Eight years of paydays",
    deck: "This page holds two minutes of real history behind the plan you are about to run. Nothing here is required reading, and the dated timeline near the end tells you how the era turns out.",
    readTime: "about 2 minutes",
    sections: [
      {
        heading: "The plan",
        lead: "Paying yourself first means treating investing like a bill, paid the moment money arrives, before anything else can spend it.",
        body: [
          "In this era you earn $50 every month for eight years. The paycheck is the one part of investing you can actually schedule, so the question is never whether the money comes. The question is what you do with it while the market around you falls apart and then slowly heals.",
          "Most people wait for a moment that feels safe. The plan replaces that feeling with a schedule, and then this era does its best to break the schedule.",
        ],
      },
      {
        heading: "The machine inside it",
        lead: "Dollar cost averaging is investing the same amount on a schedule, no matter what prices are doing.",
        body: [
          "The arithmetic is small enough to hold in your head. Fifty dollars buys two shares when a share costs $25, and it buys four shares when a share costs $12.50. The same money automatically buys more when prices are low and fewer when they are high, and no forecast is required.",
          "The catch is emotional, not mathematical. The months that buy the most shares are exactly the months when the headlines say the market is broken, so the plan feels worst when it is working best.",
        ],
      },
      {
        heading: "The era you will feed it",
        lead: "A bear market is a long stretch of falling prices that turns almost everyone against owning stocks.",
        body: [
          "This run uses the same real prices as The Dot-Com Era, and it asks a different question of them. Between early 2000 and late 2002 the S&P 500, an index that bundles five hundred large American companies into one number, lost about half its value. Along the way the market closed for four days after the September 11 attacks, and the largest bankruptcy in American history revealed that a famous company's profits were made up.",
          "Then, with no announcement at all, prices turned. The index climbed for five years and closed at a new record in October 2007. Through that whole arc, your $50 arrives every month and asks the same quiet question.",
        ],
      },
      {
        heading: "What you will live through",
        lead: "A steady plan is a decision made once, so that fear and greed never get a monthly vote.",
        body: [
          "You start with $100, and $50 lands in your dish every month from January 2000 to December 2007. Five times the tape pauses at a real, dated moment and asks whether the plan survives it. The rainbow orb runs beside you and invests the same $50 into the real S&P 500 every month, automatically, without ever reading a headline.",
          "The plan does not promise a profit, and this era happens to end at a record. It promises something smaller and more useful: from the first month to the last, you will never need to predict anything.",
        ],
      },
    ],
    timeline: [
      { date: "March 10, 2000", text: "The Nasdaq peaks at 5,048. The internet bubble starts to deflate within weeks." },
      { date: "September 17, 2001", text: "The market reopens after four closed days, and the Dow falls 684 points, its biggest one-day point drop up to then." },
      { date: "July 21, 2002", text: "A telephone giant files the largest bankruptcy in American history after admitting its profits were made up." },
      { date: "October 9, 2002", text: "The S&P 500 closes at 776.76, down about half from its 2000 peak." },
      { date: "October 9, 2007", text: "The S&P 500 closes at a record 1,565.15, five years to the day after the bottom." },
    ],
    sources: [
      { label: "Dollar cost averaging", url: "https://en.wikipedia.org/wiki/Dollar_cost_averaging" },
      { label: "The 2002 downturn", url: "https://en.wikipedia.org/wiki/Stock_market_downturn_of_2002" },
      { label: "The market after September 11", url: "https://en.wikipedia.org/wiki/Economic_effects_of_the_September_11_attacks" },
    ],
  },
};
