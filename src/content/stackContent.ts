// STACK LESSON CONTENT
// Marlon edits this file; the game reads it on load. Save the file and
// the dev server refreshes the page. Strings only: the engine draws the
// pictures, this file names them.
//
// ITEM TYPES and their fields:
//
// teach      One concept card. word (the big word), pic (see PICS
//            below), line (one short line under the picture).
// choice     Tap the right answer. q, options (2 or 3), answer
//            (which option is right: 0 = first, 1 = second...),
//            right (short line on correct), wrong (teaching line
//            with the bear). An option is plain text, or a picture:
//            { pic: "up", caption: "ten years" }.
// live-up    Two live-moving charts, tap the one more people are
//            buying. q, right, wrong.
// live-down  Same, tap the one more people are selling.
// live-vol   Same, tap the jumpier one.
// pile       Two companies drawn as piles of shares (Apple vs
//            Costco). q, right, wrong.
// race       A crash, then three owner behaviors race. q, choices
//            (3 labels, the FIRST is the winner), right, wrong.
// break      Two portfolios, one company goes broke. q, sides (two
//            of: label, pieces (list of colors), gone (which pieces
//            die: 0 = first...)), answer (0 or 1), right, wrong.
// dollar     $100 flows through the company. q, rows (list of
//            [who, amount]), answer (which row is the owner's),
//            right, wrong.
// drip       Same profit split 3 ways vs 8 ways. q, right, wrong.
// drain      Two funds, one charges a big fee. q, right, wrong.
// dca        Tap the chart 4 times to buy. q. Add fund: true for
//            the gold fund version.
// paydrop    Lesson 1 only: the first paycheck ticks in.
// firstbuy   Lesson 1 only: the guided first buy. q.
//
// PICS for choice options: up, spike, calm, wild, gold-piece,
// dots-steady, dots-lump, dots-chase.
// PICS for teach cards: live-price, two-rides, week-vs-decade,
// two-stands, recap-pieces, fund-equals, fee-leak, gold-piece.
// Piece colors: cream, red, black, slate, gold.
// Company ids for meet: aapl nke pfe cost ko nvda mcd xom jnj voo.

export type PicOption = { pic: string; caption?: string };
export type ChoiceOption = string | PicOption;
export type BreakSide = { label: string; pieces: string[]; gone: number[] };

export type ContentItem =
  | { type: "teach"; word: string; pic: string; line: string }
  | { type: "choice"; q: string; options: ChoiceOption[]; answer: number; right: string; wrong: string }
  | { type: "live-up" | "live-down" | "live-vol"; q: string; right: string; wrong: string }
  | { type: "pile"; q: string; right: string; wrong: string }
  | { type: "race"; q: string; choices: string[]; right: string; wrong: string }
  | { type: "break"; q: string; sides: BreakSide[]; answer: number; right: string; wrong: string }
  | { type: "dollar"; q: string; rows: [string, string][]; answer: number; right: string; wrong: string }
  | { type: "drip" | "drain"; q: string; right: string; wrong: string }
  | { type: "dca"; q: string; fund?: boolean }
  | { type: "paydrop" }
  | { type: "firstbuy"; q: string };

export type ContentLesson = {
  title: string;
  sub?: string;
  meet: string[];
  prepay?: boolean;
  capstone?: boolean;
  items: ContentItem[];
};

export type ContentUnit = { name: string; sub: string; lessons: ContentLesson[] };

// Company blurbs: literal category descriptions, never wit.
export const COMPANY_BLURBS: Record<string, string> = {
  aapl: "Phones, computers, and the apps on them",
  nke: "Shoes and athletic wear",
  cost: "Warehouse stores you pay to shop in",
  ko: "Soft drinks",
  pfe: "Medicines",
  nvda: "Computer chips",
  mcd: "Fast food restaurants",
  xom: "Oil and gas",
  jnj: "Medicines and health products",
  voo: "One share of 500 big companies",
};

// The strategy cards. Front = name, art, one plain line.
export const CARD_LINES: Record<string, { name: string; line: string }> = {
  buy: { name: "Buy", line: "Pay the price, own a share." },
  sell: { name: "Sell", line: "Turn a share back into cash." },
  schedule: { name: "Schedule", line: "Buys 1 share every market day." },
  the500: { name: "The 500", line: "Buys a share of 500 companies at once." },
  options: { name: "Options", line: "A risky bet on where a price goes. You can lose what you pay." },
};

// Concept cards dropped by unit chests, one plain definition each.
export const CONCEPT_CARDS: Record<string, { name: string; line: string; unit: number }> = {
  share: { name: "A share", line: "One piece of ownership in a company.", unit: 0 },
  price: { name: "The price", line: "Just the last price someone paid.", unit: 0 },
  volatility: { name: "Volatility", line: "How big the swings are.", unit: 0 },
  zoomout: { name: "Zoom out", line: "Ten years matters. One week doesn't.", unit: 0 },
  pricetag: { name: "The price tag", line: "What it costs versus what it earns.", unit: 0 },
  fund: { name: "A fund", line: "One share, five hundred companies.", unit: 1 },
  fee: { name: "The fee", line: "Small fee now, big hole later.", unit: 1 },
  index: { name: "The index", line: "One share owns every big company.", unit: 1 },
};

// Lesson 1 fixed lines
export const LESSON1 = {
  paySub: "Lessons pay. This one pays first.",
  payLine: "Now go own something.",
  ownLine: "It moves while you own it.",
};

export const UNITS_CONTENT: ContentUnit[] = [
  {
    name: "Single stocks",
    sub: "Own a piece of a company",
    lessons: [

      { title: "Own something real", meet: ["aapl", "nke", "pfe"], prepay: true, items: [
        { type: "paydrop" },
        { type: "firstbuy", q: "Pick your first stock." },
        { type: "choice", q: "You just became",
          options: ["An owner", "A customer", "A lender"], answer: 0,
          right: "Owner.",
          wrong: "Owner. You hold a piece of the company." },
      ]},

      { title: "The price of a share", meet: ["cost", "ko"], items: [
        { type: "teach", word: "The price", pic: "live-price",
          line: "Just the last price someone paid." },
        { type: "live-up", q: "Which stock are more people buying?",
          right: "That one.",
          wrong: "More people were selling that one." },
        { type: "live-down", q: "Which stock are more people selling?",
          right: "That one.",
          wrong: "More people were buying that one." },
        { type: "pile", q: "Which whole company is worth more?",
          right: "The whole pile.",
          wrong: "Count the whole pile, not one share." },
        { type: "choice", q: "A price going up means",
          options: ["More people want to buy it", "The company is doing great", "It will keep going up"], answer: 0,
          right: "Just more buyers.",
          wrong: "It only means more people are buying." },
      ]},

      { title: "The ride", meet: ["pfe", "nvda"], items: [
        { type: "teach", word: "Volatility", pic: "two-rides",
          line: "How big the swings are." },
        { type: "live-vol", q: "Which is more volatile?",
          right: "That one.",
          wrong: "Watch the swings, not the ending." },
        { type: "choice", q: "Same ending. Which is less stressful to own?",
          options: [{ pic: "calm" }, { pic: "wild" }], answer: 0,
          right: "The calm one.",
          wrong: "Those big swings are stressful to own." },
        { type: "break", q: "One company goes broke. Who survives?",
          sides: [
            { label: "all in one company", pieces: ["red", "red", "red", "red", "red"], gone: [0, 1, 2, 3, 4] },
            { label: "spread across four", pieces: ["red", "black", "slate", "cream", "red"], gone: [0] },
          ], answer: 1,
          right: "Spread out survives.",
          wrong: "All in one means all gone." },
        { type: "choice", q: "Which one grew steadily?",
          options: [{ pic: "up" }, { pic: "spike" }], answer: 0,
          right: "Steady.",
          wrong: "That one spiked, then crashed." },
      ]},

      { title: "Time beats timing", meet: ["mcd"], items: [
        { type: "teach", word: "Zoom out", pic: "week-vs-decade",
          line: "Ten years matters. One week doesn't." },
        { type: "race", q: "The market crashes. Who ends up highest?",
          choices: ["Keep buying on schedule", "Stop buying, just hold", "Sell everything now"],
          right: "Kept buying wins.",
          wrong: "The one who kept buying always won." },
        { type: "choice", q: "Which picture matters to an owner?",
          options: [{ pic: "up", caption: "ten years" }, { pic: "wild", caption: "one week" }], answer: 0,
          right: "The ten years.",
          wrong: "One week is just noise." },
        { type: "choice", q: "Each dot is a buy. Who bought steadily?",
          options: [{ pic: "dots-steady" }, { pic: "dots-lump" }, { pic: "dots-chase" }], answer: 0,
          right: "Same time every month.",
          wrong: "Those buys bunch up or chase peaks." },
        { type: "choice", q: "Who only bought at the top?",
          options: [{ pic: "dots-chase" }, { pic: "dots-steady" }], answer: 0,
          right: "Bought every peak.",
          wrong: "That one bought on a schedule." },
        { type: "dca", q: "Tap the line 4 times to buy." },
      ]},

      { title: "What you pay for what it earns", meet: ["xom", "jnj"], items: [
        { type: "teach", word: "The price tag", pic: "two-stands",
          line: "What it costs versus what it earns." },
        { type: "dollar", q: "$100 comes in. Tap the owner's money.",
          rows: [["Workers", "$38"], ["Suppliers", "$30"], ["The bank", "$8"], ["Taxes", "$12"], ["You, the owner", "$12"]], answer: 4,
          right: "What's left is profit.",
          wrong: "Everyone else gets paid first. The owner keeps what is left." },
        { type: "drip", q: "Same profit. Which shares each get more?",
          right: "Fewer shares, more each.",
          wrong: "Split more ways, each share gets less." },
        { type: "choice", q: "Which price has real profits under it?",
          options: [{ pic: "up", caption: "earns $8 a share" }, { pic: "spike", caption: "earns nothing" }], answer: 0,
          right: "Real profits.",
          wrong: "That one earns nothing. Just hype." },
        { type: "choice", q: "What matters when you buy?",
          options: ["The price versus the profit", "The price alone", "The chart shape"], answer: 0,
          right: "Both together.",
          wrong: "The price alone tells you nothing." },
      ]},

      { title: "The first stack", meet: [], capstone: true, items: [
        { type: "teach", word: "What you know", pic: "recap-pieces",
          line: "Shares, prices, swings, time, price tags." },
        { type: "break", q: "One goes broke. Who barely feels it?",
          sides: [
            { label: "all in Apple", pieces: ["slate", "slate", "slate", "slate"], gone: [0, 1, 2, 3] },
            { label: "spread across four", pieces: ["slate", "red", "black", "cream"], gone: [0] },
          ], answer: 1,
          right: "Spread out.",
          wrong: "All in Apple, all gone." },
        { type: "pile", q: "Which whole company is worth more?",
          right: "The whole pile.",
          wrong: "Count the whole pile, not one share." },
        { type: "race", q: "It crashes again. Who ends up highest?",
          choices: ["Keep buying on schedule", "Stop buying, just hold", "Sell everything now"],
          right: "Kept buying.",
          wrong: "Keep buying on schedule." },
        { type: "choice", q: "Who bought on a schedule?",
          options: [{ pic: "dots-steady" }, { pic: "dots-chase" }], answer: 0,
          right: "Steady.",
          wrong: "Those buys chased the peaks." },
        { type: "choice", q: "A share is",
          options: ["A piece of a company", "A ticket", "A loan"], answer: 0,
          right: "Ownership.",
          wrong: "Ownership. Everything builds on it." },
      ]},

    ],
  },
  {
    name: "Funds and ETFs",
    sub: "Hundreds of companies, one share",
    lessons: [

      { title: "Hundreds in one share", meet: ["voo"], items: [
        { type: "teach", word: "A fund", pic: "fund-equals",
          line: "One share, five hundred companies." },
        { type: "break", q: "One company dies. Which is safer?",
          sides: [
            { label: "one company's stock", pieces: ["red"], gone: [0] },
            { label: "the fund", pieces: ["gold"], gone: [] },
          ], answer: 1,
          right: "One of 500.",
          wrong: "The single stock takes the whole hit." },
        { type: "choice", q: "A fund is a bet on",
          options: ["Everyone at once", "One winner", "A lucky manager"], answer: 0,
          right: "Everyone.",
          wrong: "Nobody picks. That is the trick." },
      ]},

      { title: "The fee leak", sub: "The leak that compounds", meet: [], items: [
        { type: "teach", word: "The fee", pic: "fee-leak",
          line: "Small fee now, big hole later." },
        { type: "drain", q: "Same fund. Which is the better deal?",
          right: "2% ate a third.",
          wrong: "The fee takes a bite every year." },
      ]},

      { title: "Buying the argument", sub: "The starter strategy, complete", meet: [], capstone: true, items: [
        { type: "teach", word: "The index", pic: "gold-piece",
          line: "One share owns every big company." },
        { type: "choice", q: "Holding for thirty years. Which one?",
          options: [{ pic: "gold-piece", caption: "the fund" }, { pic: "wild", caption: "one wild stock" }], answer: 0,
          right: "Easier to hold.",
          wrong: "The wild one is hard to hold." },
        { type: "dca", q: "Tap the line 4 times to buy.", fund: true },
      ]},

    ],
  },
];
