// The field guide: a codex that gains a card the first time the player meets
// a concept in play. Play unlocks the card; only a correct quick-check answer
// clears the concept's marble. Cleared glass, cloudy glass (answered wrong,
// still setting), or an empty ring (not met yet). Nothing is ever taken back.
// State lives in localStorage only.

export interface FieldEntry {
  id: string;
  title: string;
  copy: string;
  url: string;
  color: string;   // marble glass tint when cleared
  rail: "own" | "spread" | "wrong";  // what you own · how you spread it · what can go wrong
}

export const FIELD_ENTRIES: FieldEntry[] = [
  {
    id: "share", title: "Share", rail: "own", color: "#0a84ff",
    copy: "A share is one small piece of a real company, and buying one makes that piece yours. You own a slice of everything it earns and everything it loses. Your money goes to the person who owned the share before you, not to the company.",
    url: "https://en.wikipedia.org/wiki/Share_(finance)",
  },
  {
    id: "market-price", title: "Market price", rail: "own", color: "#64d2ff",
    copy: "The price is just what the last person paid. It changes every time somebody new decides a share is worth more or less than that. Nobody in charge sets it, and it can be too high or too low for years.",
    url: "https://en.wikipedia.org/wiki/Market_price",
  },
  {
    id: "dividend", title: "Dividend", rail: "own", color: "#30d158",
    copy: "Some companies hand out part of their profit to their owners in cash, a few times a year. You get it whether the price went up or down. Spend it, or buy more shares with it and let the pile grow itself.",
    url: "https://en.wikipedia.org/wiki/Dividend",
  },
  {
    id: "index-fund", title: "Index fund", rail: "spread", color: "#bf5af2",
    copy: "An index fund is one purchase that buys a tiny piece of hundreds of companies at once. You never pick the winner, and you never miss it either. That is the rainbow orb, sealed shut so no single color can be pulled back out.",
    url: "https://en.wikipedia.org/wiki/Index_fund",
  },
  {
    id: "diversification", title: "Diversification", rail: "spread", color: "#ff9f0a",
    copy: "Spreading your money over many different things so one bad one cannot sink you. It will never make you the biggest winner in the room. It is what keeps you in the game long enough to have a winner at all.",
    url: "https://en.wikipedia.org/wiki/Diversification_(finance)",
  },
  {
    id: "compounding", title: "Compounding", rail: "spread", color: "#ffd60a",
    copy: "Compounding is what happens when the interest you have already earned starts earning interest itself. The bank pays you on your money in year one, and in year two it pays you on the interest too, so the payment grows without you adding a dime. Given enough years, that growing payment bends a straight line into a curve.",
    url: "https://en.wikipedia.org/wiki/Compound_interest",
  },
  {
    id: "dca", title: "Dollar cost averaging", rail: "spread", color: "#ffd60a",
    copy: "Putting in the same amount on a schedule, no matter what prices are doing. When prices fall, that same money buys more shares. You never have to pick the right day, because every day on the list is your day.",
    url: "https://en.wikipedia.org/wiki/Dollar_cost_averaging",
  },
  {
    id: "position-size", title: "Position size", rail: "spread", color: "#a2845e",
    copy: "Position size is how much of your money one thing gets. Being right about it matters less than being small enough to wait it out. A drop of three quarters is a story if it was a tenth of your orb, and a disaster if it was all of it.",
    url: "https://en.wikipedia.org/wiki/Position_(finance)",
  },
  {
    id: "crash", title: "Crash and drawdown", rail: "wrong", color: "#ff453a",
    copy: "A crash is prices falling fast, with almost everything falling together. Drawdown is the measuring stick: how far below your best day you are right now. Your share count does not change in a crash, only what people will pay for them.",
    url: "https://en.wikipedia.org/wiki/Stock_market_crash",
  },
  {
    id: "panic-selling", title: "Panic selling", rail: "wrong", color: "#ff6482",
    copy: "Selling because the falling scares you, not because anything about the company changed. It turns a loss on paper into a real one, and it usually happens closest to the bottom. The hard part is that it feels like the smart move at the time.",
    url: "https://en.wikipedia.org/wiki/Panic_selling",
  },
  {
    id: "bubble", title: "Bubble", rail: "wrong", color: "#ff9f0a",
    copy: "A bubble is when the price runs far ahead of the actual business, because everyone believes somebody will pay more tomorrow. It feels like free money and everyone has a tip. It ends when the last buyer runs out.",
    url: "https://en.wikipedia.org/wiki/Economic_bubble",
  },
  {
    id: "survivorship", title: "Survivorship bias", rail: "wrong", color: "#5e5ce6",
    copy: "Old charts only show the companies that made it. The ones that went to zero got quietly deleted, so the past always looks safer than it was. Two names on the 2000 menu never came back, and nobody at the time knew which two.",
    url: "https://en.wikipedia.org/wiki/Survivorship_bias",
  },
  {
    id: "ponzi", title: "The Ponzi promise", rail: "wrong", color: "#ff375f",
    copy: "If something promises a big return, guaranteed, every single day, the payouts are coming from new customers and not from a business. It works perfectly until new customers stop arriving, and then it is gone overnight. Guaranteed and high do not go together.",
    url: "https://en.wikipedia.org/wiki/Ponzi_scheme",
  },
  {
    id: "inflation", title: "Inflation", rail: "wrong", color: "#8e8e93",
    copy: "Cash keeps its number and quietly loses its power. A hundred dollars in a jar is still a hundred dollars in eight years, but the sneakers it used to buy two of now cost the whole jar. Safe from crashes is not the same as safe.",
    url: "https://en.wikipedia.org/wiki/Inflation",
  },
];

export type MarbleState = "cleared" | "cloudy" | "empty";

interface GuideStore {
  unlocked: string[];
  cleared: string[];
  cloudy: string[];
}

const KEY = "field-guide";

function load(): GuideStore {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { unlocked: s.unlocked ?? [], cleared: s.cleared ?? [], cloudy: s.cloudy ?? [] };
  } catch {
    return { unlocked: [], cleared: [], cloudy: [] };
  }
}

function save(s: GuideStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("field-guide-change"));
  } catch { /* private browsing */ }
}

export function guideState(): GuideStore {
  return load();
}

// meeting a concept in play opens its card
export function unlockEntry(id: string): void {
  const s = load();
  if (s.unlocked.includes(id)) return;
  s.unlocked.push(id);
  save(s);
}

// only the quick check moves a marble: right clears it, wrong leaves it cloudy
export function markCheck(id: string, correct: boolean): void {
  const s = load();
  if (!s.unlocked.includes(id)) s.unlocked.push(id);
  if (correct) {
    if (!s.cleared.includes(id)) s.cleared.push(id);
    s.cloudy = s.cloudy.filter((c) => c !== id);
  } else if (!s.cleared.includes(id) && !s.cloudy.includes(id)) {
    s.cloudy.push(id);
  }
  save(s);
}

export function marbleState(id: string, s: GuideStore = load()): MarbleState {
  if (s.cleared.includes(id)) return "cleared";
  if (s.cloudy.includes(id)) return "cloudy";
  return "empty";
}
