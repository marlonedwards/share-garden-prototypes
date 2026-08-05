// Beta learning checkpoints: a short check after each era's debrief, built to
// measure whether the history stuck, not whether the player memorized tips.
// Static items test market dynamics and timelines; template items are filled
// from the player's actual run so the check reads their own story back.
// Everything stays on this computer: results go to localStorage only.
import { HistoryMarket } from "../engine/history";
import { fmtMoney } from "../engine/market";
import { ScenarioConfig } from "./scenarios";

export interface CheckItem {
  id: string;
  prompt: string;
  options: string[];
  answer: number;      // index into options
  explain: string;     // shown after answering, right or wrong
}

export interface CheckResult {
  scenario: string;
  when: string;        // ISO date
  score: number;
  total: number;
  items: { id: string; choice: number; correct: boolean }[];
  gateMs: number[];    // how long each history gate took to answer
}

const STATIC_ITEMS: Record<string, CheckItem[]> = {
  dotcom: [
    {
      id: "dotcom-recovery",
      prompt: "The index peaked in early 2000, then crashed. How long until it reached a new high?",
      options: ["About one year", "About three years", "About seven years", "It never did"],
      answer: 2,
      explain: "About seven years. Recoveries are measured in years, not weeks, and that is why the money you invest needs time.",
    },
    {
      id: "dotcom-pricedin",
      prompt: "Everyone in 2000 agreed the internet would change the world. They were right. So why did internet stocks still crash?",
      options: [
        "The internet actually failed",
        "The prices already assumed a perfect future, and reality could not keep up",
        "The government shut them down",
        "Computers became too cheap",
      ],
      answer: 1,
      explain: "A price is a bundle of expectations. When everyone already believes the story, believing it too buys you nothing.",
    },
    {
      id: "dotcom-survivors",
      prompt: "What happened to most of the internet companies that existed in 2000?",
      options: [
        "They recovered within a few years",
        "They were bought at a profit",
        "They disappeared, and today's charts only show the survivors",
        "They moved into other industries",
      ],
      answer: 2,
      explain: "Hundreds went to zero. Every chart of the past you will ever see is missing its corpses. That is survivorship bias.",
    },
  ],
  payday: [
    {
      id: "payday-bestbuys",
      prompt: "You invested $50 every month from 2000 to 2007, through a huge crash. Which months bought your best-value shares?",
      options: [
        "The confident months at the start",
        "The scary months near the 2002 bottom",
        "The record months at the end",
        "Every month bought the same value",
      ],
      answer: 1,
      explain: "The months that felt worst bought the most shares for the money. The plan works precisely when it feels wrong.",
    },
    {
      id: "payday-dca",
      prompt: "What is a steady monthly plan actually doing?",
      options: [
        "Guessing the best moment to buy",
        "Automatically buying more shares when prices are low and fewer when they are high",
        "Avoiding crashes",
        "Guaranteeing a profit",
      ],
      answer: 1,
      explain: "Fixed dollars divided by a lower price equals more shares. No prediction required.",
    },
    {
      id: "payday-bell",
      prompt: "October 2002 turned out to be the bottom of the market. Who knew that at the time?",
      options: ["Experienced investors", "The people on TV", "Nobody. Bottoms are only visible afterward", "The companies themselves"],
      answer: 2,
      explain: "Nobody rings a bell at the bottom. That is the whole argument for a plan that does not need one.",
    },
  ],
  gfc: [
    {
      id: "gfc-arc",
      prompt: "In September 2008, a 158-year-old bank vanished overnight. What did the whole index do over the following seven years?",
      options: [
        "Stayed down for decades",
        "Fell by about half, then recovered to new record highs",
        "Never fell much at all",
        "Went to zero",
      ],
      answer: 1,
      explain: "Down about half by March 2009, then a recovery to new records. The system bent hard. It did not break.",
    },
    {
      id: "gfc-safe",
      prompt: "Mega Bank and The Insurance Giant were among the biggest companies on earth in 2007. What does their collapse say about 'big means safe'?",
      options: [
        "Big usually does mean safe",
        "Size is not safety. Even giants can lose nine dollars of every ten",
        "Only banks are risky",
        "It was bad luck that cannot repeat",
      ],
      answer: 1,
      explain: "Fame and size tell you a company is important, not that its stock is safe. Safety comes from spreading out.",
    },
    {
      id: "gfc-bottom",
      prompt: "March 2009 was the exact bottom. What did it feel like to people living through it?",
      options: [
        "Obviously a great time to buy",
        "Like the system itself was breaking, which is why almost nobody bought",
        "Calm and quiet",
        "Like the top of a bubble",
      ],
      answer: 1,
      explain: "The best prices of the decade arrived dressed as the end of the world. That is why holding a plan beats reading a mood.",
    },
  ],
  crypto: [
    {
      id: "crypto-size",
      prompt: "Coin Alpha fell 75% twice in seven years and still ended higher. What did a holder need to actually survive both winters?",
      options: [
        "Perfect timing on the way out",
        "A position small enough that a 75% drop could not force them to sell",
        "Inside information",
        "Borrowed money to buy more",
      ],
      answer: 1,
      explain: "Bet size decides whether you can wait. An investor who must sell in winter never sees spring.",
    },
    {
      id: "crypto-promise",
      prompt: "The Promise Coin guaranteed 1% every day. What was the giveaway?",
      options: [
        "The name was too silly",
        "Guaranteed high returns do not exist. The promise itself is the red flag",
        "The price was too low",
        "It was too new",
      ],
      answer: 1,
      explain: "Real investments pay for risk taken. Anything guaranteeing riches is paying old investors with new investors' money, until it can't.",
    },
    {
      id: "crypto-boring",
      prompt: "Over the same seven years, what did the boring stock index do?",
      options: [
        "Also crashed 75% twice",
        "Grew steadily, never fell as hard, and never once forced a holder's hand",
        "Went nowhere",
        "Beat every coin",
      ],
      answer: 1,
      explain: "It did not beat the luckiest coins. It beat most coin holders, because it was possible to actually hold it.",
    },
  ],
};

// Run-aware items, filled from the player's own trade log. At most two apply.
function runItems(
  m: HistoryMarket,
  cfg: ScenarioConfig,
  name: (ea: { name: string; real?: string }) => string,
): CheckItem[] {
  const out: CheckItem[] = [];

  let peak = 0;
  const dd = m.bench.map((v) => { peak = Math.max(peak, v); return peak > 0 ? v / peak : 1; });
  let panicSold = 0, panicNow = 0;
  const deadIds = new Set(cfg.assets.filter((a) => m.prices[a.id] <= 0).map((a) => a.id));
  let deadSpent = 0, deadBack = 0;
  const deadHeld = new Set<string>();
  for (const t of m.trades) {
    if (t.side === "sell" && (dd[t.step] ?? 1) < 0.85) {
      panicSold += t.dollars;
      panicNow += t.shares * m.prices[t.id];
    }
    if (deadIds.has(t.id)) {
      if (t.side === "buy") { deadSpent += t.dollars; deadHeld.add(t.id); }
      else deadBack += t.dollars;
    }
  }

  if (panicSold > 1 && panicNow > panicSold * 1.1) {
    const opts = [panicSold, panicNow * 0.6, panicNow, panicNow * 1.7]
      .map((v) => Math.round(v))
      .sort((a, b) => a - b);
    const answer = opts.indexOf(Math.round(panicNow));
    out.push({
      id: "run-panic",
      prompt: `During the crash you sold shares for ${fmtMoney(panicSold)}. Held to the end of the era, what would those same shares be worth?`,
      options: opts.map((v) => fmtMoney(v)),
      answer,
      explain: `${fmtMoney(panicNow)}. The debrief showed this number. Selling in a panic locks the low price in forever.`,
    });
  }

  const deadLost = deadSpent - deadBack;
  if (deadLost > 1) {
    const deadName = cfg.assets.filter((a) => deadHeld.has(a.id)).map((a) => name(a)).join(" and ");
    out.push({
      id: "run-dead",
      prompt: `You put money into ${deadName}, which went to zero. How much of it comes back if you wait long enough?`,
      options: [
        "None. Zero is forever",
        "About half, eventually",
        "All of it, given enough years",
        "It depends on the next bull market",
      ],
      answer: 0,
      explain: "A fallen price can recover. A dead company cannot. That difference is why spreading out matters more than picking well.",
    });
  }

  if (out.length < 2) {
    const gain = m.benchmark - m.bench[0];
    out.push({
      id: "run-index",
      prompt: `The rainbow orb finished this era at ${fmtMoney(m.benchmark)} without a single trade after day one. What was its whole strategy?`,
      options: [
        "A secret formula",
        "Hold one of everything, sell nothing, reinvest what comes in",
        "Fast trading at the right moments",
        "Getting out before every crash",
      ],
      answer: 1,
      explain: `${gain >= 0 ? "That gain" : "Even that result"} took zero decisions. Owning everything and staying put is a strategy, and it is very hard to beat.`,
    });
  }
  return out.slice(0, 2);
}

export function buildCheck(
  m: HistoryMarket,
  cfg: ScenarioConfig,
  name: (ea: { name: string; real?: string }) => string,
): CheckItem[] {
  return [...(STATIC_ITEMS[cfg.id] ?? []), ...runItems(m, cfg, name)];
}

const RESULTS_KEY = "beta-checks";

export function saveCheckResult(r: CheckResult): void {
  try {
    const all = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? "[]");
    all.push(r);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    // private browsing; the results panel still shows this session
  }
}
