// Pay yourself first: $50 a month through 2000 to 2007 on the dot-com
// dataset. Copy moved verbatim from the pre-split registry.
// W4 step 2 fills this era's scouting notes (founded, history, believers,
// doubters on every asset), its briefing page, its extra gates, and its
// five-item quiz. Until then the brief beat shows the plain start button.
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
  dots: ["#30d158", "#0a84ff", "#ff9f0a", "#30d158"],
  time: "about 6 minutes",
  dataset: eraDotcom as HistoryDataset,
  indexKey: "^SP500TR",
  indexSub: "It invests the same $50 every month, sealed.",
  assets: [
    { id: "AMZN", real: "Amazon", name: "The Everything Store", desc: "It sells books on the internet, and it says it will sell everything one day.", color: "#ff9f0a", glow: "#ffcf7a" },
    { id: "AAPL", real: "Apple", name: "Fruit Computers",      desc: "It makes stylish computers, and it might be a comeback story.",              color: "#0a84ff", glow: "#7cc0ff" },
    { id: "MSFT", real: "Microsoft", name: "Colossus Software",    desc: "Its software runs almost every office computer on earth.",              color: "#64d2ff", glow: "#b0e8ff" },
    { id: "KO", real: "Coca-Cola",   name: "Classic Cola",         desc: "It sells the same fizzy drink in nearly every country.",                 color: "#ff453a", glow: "#ff9d97" },
    { id: "JNJ", real: "Johnson & Johnson",  name: "Bandage & Balm",       desc: "It makes medicine, baby shampoo, and half of what is in your bathroom cabinet.", color: "#30d158", glow: "#8ff0ae" },
    { id: "XOM", real: "ExxonMobil",  name: "Giant Oil",            desc: "It pumps, refines, and sells oil around the world.",                     color: "#8e8e93", glow: "#c7c7cc" },
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
        "Dollar cost averaging is investing the same amount on a schedule, no matter what prices are doing. The same money every month buys more shares when prices fall and fewer when they rise.",
        "The hard part is that the plan feels worst exactly when it is working best.",
      ],
      options: [{ label: "Keep investing every month" }, { label: "Pause until things calm down" }],
      refs: [{ label: "Dollar cost averaging", url: "https://en.wikipedia.org/wiki/Dollar_cost_averaging" }],
    },
    {
      atStep: 33,
      title: "October 2002",
      question: "The market is at its lowest in five years. Your $50 buys more shares than ever. Do you stick to the plan?",
      context: [
        "A market bottom is only visible after it has passed, and nobody rings a bell when it arrives. Your $50 buys almost twice the shares it bought in January 2000, and every headline on the stand says the market is broken.",
      ],
      options: [{ label: "Stick to the plan" }, { label: "Skip this month" }],
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
    { c: "#bf5af2", text: "If one of your colors won big, remember that one store did that. Most did not, and in 2000 nobody knew which." },
  ],
  cardSubline: "This run invested $50 a month, 2000 to 2007, on real prices.",
};
