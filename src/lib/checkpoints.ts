// Beta learning checkpoints: a short check after each era's debrief, built to
// measure whether the history stuck, not whether the player memorized tips.
// Static items test market dynamics and timelines; template items are filled
// from the player's actual run so the check reads their own story back.
// Everything stays on this computer: results go to localStorage only.
import { HistoryMarket } from "../engine/history";
import { fmtMoney } from "../engine/market";
import { markCheck } from "./fieldGuide";
import { ScenarioConfig } from "./scenarios";

export interface CheckItem {
  id: string;
  prompt: string;
  options: string[];
  answer: number;      // index into options
  explain: string;     // shown after answering, right or wrong
  focus?: number;      // step the rewind scrubber snaps to while this item is up
  concept?: string;    // field-guide marble this item can clear
}

// One answered item, in the shape CheckResult stores.
export interface AnsweredItem {
  id: string;
  choice: number;
  correct: boolean;
}

export interface CheckResult {
  scenario: string;
  when: string;        // ISO date
  score: number;
  total: number;
  items: AnsweredItem[];
  gateMs: number[];    // how long each history gate took to answer
}

// The single scoring-and-marking code path for every check renderer
// (QuickCheck in the era debriefs, LessonCheck in the stepped lessons):
// grade the tap, move the field-guide marble, and hand back the result row.
export function gradeCheckAnswer(item: CheckItem, choice: number): AnsweredItem {
  const correct = choice === item.answer;
  if (item.concept) markCheck(item.concept, correct);
  return { id: item.id, choice, correct };
}

// The single result-row writer: score the answered items and store one
// aggregated CheckResult. No-op on an empty run.
export function saveAnsweredRun(scenario: string, items: AnsweredItem[], gateMs: number[] = []): void {
  if (items.length === 0) return;
  saveCheckResult({
    scenario,
    when: new Date().toISOString(),
    score: items.filter((it) => it.correct).length,
    total: items.length,
    items,
    gateMs,
  });
}

const STATIC_ITEMS: Record<string, CheckItem[]> = {
  dotcom: [
    {
      // CEE Investing 12-5c ladder (downturns move asset prices); concept: crash
      id: "dotcom-recovery",
      focus: 81,
      concept: "crash",
      prompt: "The index peaked in the summer of 2000, then crashed. How long did it take to reach a new high?",
      options: ["About one year", "About three years", "About six years", "It never did"],
      answer: 2,
      explain: "It took about six years, from the summer of 2000 to the fall of 2006. Recoveries are measured in years, not weeks, and that is why the money you invest needs time.",
    },
    {
      // CEE Investing 12-5b ladder (expectations are already in the price); concept: bubble
      id: "dotcom-pricedin",
      focus: 1,
      concept: "bubble",
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
      // CEE Investing 8-4 (risks of owning single stocks); concept: survivorship
      id: "dotcom-survivors",
      focus: 30,
      concept: "survivorship",
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
    {
      // CEE Investing 12-5c ladder (downturns and investor mood); concept: panic-selling
      id: "dotcom-reopen",
      focus: 20,
      concept: "panic-selling",
      prompt: "In September 2001 the market closed for four trading days, then fell about 14 percent in the week it reopened. What happened to those losses?",
      options: [
        "They kept deepening for years",
        "The market regained the lost ground within about two months",
        "The market stayed closed until 2002",
        "Only oil stocks recovered",
      ],
      answer: 1,
      explain: "The reopening week was the Dow's worst since 1933, and the lost ground came back within about two months. Whoever sold into that fear turned a temporary fall into a permanent one.",
    },
    {
      // CEE Investing 8-5a (diversification within and among asset classes); concept: diversification
      id: "dotcom-fraud",
      focus: 30,
      concept: "diversification",
      prompt: "The Phone Giant's profits were invented, and even Wall Street's most famous telecom analyst recommended it for most of the ride down. What actually protects an investor from a fraud nobody sees coming?",
      options: [
        "Reading the company's reports more carefully",
        "Following the most famous analysts",
        "Spreading money so widely that no single company can sink the plan",
        "Only buying big, well-known companies",
      ],
      answer: 2,
      explain: "The fraud fooled the professionals who read the reports for a living. Diversification is the one defense that does not require spotting the lie.",
    },
  ],
  payday: [
    {
      // CEE Investing 8-7c (future value of a regular series); concept: dca
      id: "payday-bestbuys",
      focus: 33,
      concept: "dca",
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
      // CEE Investing 8-7 (compounding rewards regular investing); concept: dca
      id: "payday-dca",
      focus: 3,
      concept: "dca",
      prompt: "What is a steady monthly plan actually doing?",
      options: [
        "Guessing the best moment to buy",
        "Automatically buying more shares when prices are low and fewer when they are high",
        "Avoiding crashes",
        "Guaranteeing a profit",
      ],
      answer: 1,
      explain: "Fixed dollars divided by a lower price equals more shares, and no prediction is required.",
    },
    {
      // CEE Investing 8-7 with the 12-5c ladder (nobody can time the bottom); concept: dca
      id: "payday-bell",
      focus: 33,
      concept: "dca",
      prompt: "October 2002 turned out to be the bottom of the market. Who knew that at the time?",
      options: ["Experienced investors", "The people on TV", "Nobody, because bottoms are only visible afterward", "The companies themselves"],
      answer: 2,
      explain: "Nobody rings a bell at the bottom. That is the whole argument for a plan that does not need one.",
    },
    {
      // CEE Investing 8-7 with the 12-5c ladder (a plan decided in calm holds
      // through a panic); concept: panic-selling
      id: "payday-reopen",
      focus: 20,
      concept: "panic-selling",
      prompt: "In September 2001 the market closed for four days, then fell hard when it reopened. What did the steady $50 plan need from you that month?",
      options: [
        "A forecast of what came next",
        "A brave last-minute trade",
        "Nothing new, because the decision was already made",
        "A pause until the news improved",
      ],
      answer: 2,
      explain: "The plan was written on a calm day so that a terrible month could not rewrite it. Deciding once is the whole trick.",
    },
    {
      // CEE Investing 12-5b ladder (expectations are already in the price);
      // concept: market-price
      id: "payday-record",
      focus: 93,
      concept: "market-price",
      prompt: "In October 2007 the index closed at an all-time record. What does a record high tell you about the month that follows it?",
      options: [
        "Prices must keep rising",
        "A crash must come next",
        "Nothing, because past prices do not tell you the next one",
        "Records mean the market is safe",
      ],
      answer: 2,
      explain: "A chart only looks backward. The plan kept buying at records for the same reason it kept buying at bottoms: it never needed to know what came next.",
    },
  ],
  gfc: [
    {
      // CEE Investing 12-5c ladder (downturns move asset prices); concept: crash
      id: "gfc-arc",
      focus: 20,
      concept: "crash",
      prompt: "In September 2008, a 158-year-old bank vanished overnight. What did the whole index do over the following seven years?",
      options: [
        "Stayed down for decades",
        "Fell by about half, then recovered to new record highs",
        "Never fell much at all",
        "Went to zero",
      ],
      answer: 1,
      explain: "The index fell by about half into March 2009, then recovered to new records. The system bent hard. It did not break.",
    },
    {
      // CEE Investing 8-5a (diversification within and among asset classes); concept: diversification
      id: "gfc-safe",
      focus: 26,
      concept: "diversification",
      prompt: "Mega Bank and The Insurance Giant were among the biggest companies on earth in 2007. What does their collapse say about ‘big means safe’?",
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
      // CEE Investing 12-5c ladder (downturns and investor mood); concept: panic-selling
      id: "gfc-bottom",
      focus: 26,
      concept: "panic-selling",
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
    {
      // CEE Investing 8-5b (diversified fund versus individual assets); concept: index-fund
      id: "gfc-index-recovery",
      focus: 74,
      concept: "index-fund",
      prompt: "The index owned the same collapsing banks everyone else did. How did it still reach new records by 2013?",
      options: [
        "It quietly sold the banks before the crash",
        "The government replaced its losses",
        "Its winners, like the phone maker and the everything store, grew by more than the fallen banks could take away",
        "It never actually fell",
      ],
      answer: 2,
      explain: "An index holds losers and winners alike. A stock can only lose 100%, but a winner can gain far more, and that lopsided math pulled the whole basket to new highs.",
    },
    {
      // CEE Investing 8-4 (risks of owning single stocks); concept: survivorship
      id: "gfc-fallen-vs-dead",
      focus: 26,
      concept: "survivorship",
      prompt: "The Carmaker fell under $3 a share and later multiplied. The Old Bank fell to zero and stayed there. What separates the two?",
      options: [
        "Nothing, because both were just low prices",
        "A fallen price can recover as long as the business survives. A bankruptcy takes shareholders to zero, and zero is forever",
        "Car companies are always safer than banks",
        "The Carmaker's shares were cheaper to begin with",
      ],
      answer: 1,
      explain: "A crash marks prices down. A bankruptcy erases the owners. Since nobody can be sure which giants will survive, spreading out matters more than picking well.",
    },
  ],
  crypto: [
    {
      // CEE Investing 12-2c ladder (cryptocurrencies are speculative); concept: position-size
      id: "crypto-size",
      focus: 58,
      concept: "position-size",
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
      // CEE Investing 12-2c ladder (speculative promises); concept: ponzi
      id: "crypto-promise",
      focus: 1,
      concept: "ponzi",
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
      // CEE Investing 8-5b (diversified fund versus individual assets); concept: index-fund
      id: "crypto-boring",
      focus: 46,
      concept: "index-fund",
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
    {
      // CEE Investing 12-2c ladder (speculative assets swing hardest) with the
      // 12-5c ladder (downturns move asset prices); concept: crash
      id: "crypto-haven",
      focus: 26,
      concept: "crash",
      prompt: "In March 2020, stocks fell by about a third. What did the coins that fans called ‘digital gold’ do in the same storm?",
      options: [
        "Held steady, like gold",
        "Rose as money fled the stock market",
        "Fell even harder than stocks, nearly half in two days",
        "Stopped trading until the panic passed",
      ],
      answer: 2,
      explain: "When frightened people need cash they sell everything, and the wildest assets fall hardest. A shelter that falls harder than the storm is not a shelter.",
    },
    {
      // CEE Investing 12-5c ladder (nobody can time the market); concept: bubble
      id: "crypto-top",
      focus: 46,
      concept: "bubble",
      prompt: "In November 2021, Coin Alpha hit a record near $69,000, then fell for a year. What told investors at the time that this was the top?",
      options: [
        "The charts gave a clear signal",
        "The news announced the top that week",
        "Nothing, because tops are only visible afterward",
        "The exchanges warned their customers",
      ],
      answer: 2,
      explain: "No bell rings at a top while you are standing on it. That is why bet size, which you control, beats timing, which nobody does.",
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
  let panicSold = 0, panicNow = 0, firstPanicStep: number | undefined;
  const deadIds = new Set(cfg.assets.filter((a) => m.prices[a.id] <= 0).map((a) => a.id));
  let deadSpent = 0, deadBack = 0;
  const deadHeld = new Set<string>();
  for (const t of m.trades) {
    if (t.side === "sell" && (dd[t.step] ?? 1) < 0.85) {
      panicSold += t.dollars;
      panicNow += t.shares * m.prices[t.id];
      firstPanicStep = firstPanicStep ?? t.step;
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
    // CEE Investing 12-5c ladder (downturns and investor mood); concept: panic-selling
    out.push({
      id: "run-panic",
      focus: firstPanicStep,
      concept: "panic-selling",
      prompt: `During the crash you sold shares for ${fmtMoney(panicSold)}. Held to the end of the era, what would those same shares be worth?`,
      options: opts.map((v) => fmtMoney(v)),
      answer,
      explain: `They would be worth ${fmtMoney(panicNow)}, and the debrief showed that number. Selling in a panic locks the low price in forever.`,
    });
  }

  const deadLost = deadSpent - deadBack;
  if (deadLost > 1) {
    const deadName = cfg.assets.filter((a) => deadHeld.has(a.id)).map((a) => name(a)).join(" and ");
    const firstDeadId = [...deadHeld][0];
    const deathStep = firstDeadId ? Math.max(0, (m.history[firstDeadId] ?? []).findIndex((p) => p <= 0)) : undefined;
    // CEE Investing 8-4 (risks of owning single stocks); concept: survivorship
    out.push({
      id: "run-dead",
      focus: deathStep,
      concept: "survivorship",
      prompt: `You put money into ${deadName}, which went to zero. How much of it comes back if you wait long enough?`,
      options: [
        "None of it, because zero is forever",
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
    // CEE Investing 8-5b (diversified fund versus individual assets); concept: index-fund
    out.push({
      id: "run-index",
      concept: "index-fund",
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
