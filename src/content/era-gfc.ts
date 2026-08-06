// The 2008 crash, 2007 to 2015. Copy moved verbatim from the pre-split
// registry.
// W4 step 2 fills this era's scouting notes (founded, history, believers,
// doubters on every asset), its briefing page, its extra gates, and its
// five-item quiz. Until then the brief beat shows the plain start button.
import eraGfc from "../data/eraGfc.json";
import { HistoryDataset } from "../engine/history";
import { ScenarioConfig, mom } from "./types";

export const gfc: ScenarioConfig = {
  id: "gfc",
  lesson: "Lesson 4",
  title: "The 2008 Crash",
  headerSub: "every price is real, 2007 to 2015",
  cardLine: "Every price is real, 2007 to 2015. Banks fall, houses fall, and patience wins.",
  learn: "This era shows what a real panic feels like, and who the recovery belongs to.",
  dots: ["#30d158", "#bf5af2", "#a2845e", "#ffd60a", "#0a84ff", "#ff9f0a"],
  time: "about 7 minutes",
  dataset: eraGfc as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It holds the real S&P 500, sealed at the start.",
  assets: [
    { id: "C", real: "Citigroup",    name: "Mega Bank",           desc: "It is one of the biggest banks on earth, and everyone trusts it.", color: "#30d158", glow: "#8ff0ae" },
    { id: "AIG", real: "AIG",  name: "The Insurance Giant", desc: "It insures the whole world, and some things it should not.",       color: "#bf5af2", glow: "#e0a9ff" },
    { id: "F", real: "Ford",    name: "The Carmaker",        desc: "It has been building cars for a hundred years.",                   color: "#a2845e", glow: "#d4b795" },
    { id: "GE", real: "General Electric",   name: "General Everything",  desc: "It makes engines, light bulbs, TVs, and loans.",                   color: "#ffd60a", glow: "#ffe97a" },
    { id: "WMT", real: "Walmart",  name: "Everything Mart",     desc: "It sells everything, cheap, in every town.",                       color: "#64d2ff", glow: "#b0e8ff" },
    { id: "AAPL", real: "Apple", name: "Fruit Computers",     desc: "It just launched a phone.",                                        color: "#0a84ff", glow: "#7cc0ff" },
    { id: "XOM", real: "ExxonMobil",  name: "Giant Oil",           desc: "It pumps, refines, and sells oil around the world.",               color: "#8e8e93", glow: "#c7c7cc" },
    { id: "AMZN", real: "Amazon", name: "The Everything Store", desc: "It is the online store that survived the last crash.",            color: "#ff9f0a", glow: "#ffcf7a" },
    { id: "LEH", real: "Lehman Brothers", name: "The Old Bank", desc: "It is a 158-year-old investment bank at the center of Wall Street.", color: "#5e5ce6", glow: "#a8a5f5" },
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
        "Panic selling is selling because the fall scares you, not because the business you own has changed. The Old Bank survived the Civil War, two world wars, and the Great Depression. This weekend it ran out of money, and nobody saved it. It is the largest bankruptcy in American history.",
        "Banks will not lend to each other. The evening news says the word crisis every night. Nobody knows which giant falls next.",
      ],
      options: [{ label: "Sell everything", act: true }, { label: "Hold and ride it out" }, { label: "Buy while everyone is scared", act: true }],
      refs: [{ label: "The Lehman bankruptcy", url: "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers" }],
    },
    {
      atStep: 26,
      title: "March 2009",
      question: "Stocks are half price. Everyone says the system is broken. Do you believe in the recovery?",
      context: [
        "A market bottom is the moment prices stop falling, and nobody can see one except by looking back. The index has fallen by more than half from its 2007 record. Magazines ask whether capitalism is finished, and serious people argue that prices could fall by half again from here.",
      ],
      options: [{ label: "Buy", act: true }, { label: "Hold" }, { label: "Stay out" }],
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
  cardSubline: "This run lived the 2008 crash, 2007 to 2015, on real prices.",
};
