// The words and numbers the board is allowed to print, in one place, so the
// wall, a card face, a card back and the shop never disagree about how a price
// is written.
//
// Money is always to the cent, because a price rounded to a round number is a
// price that never existed. Every number a component prints goes through here
// and is set in tabular numerals wherever it can change.

import { Card, TallyAsset, SAVINGS_ID, BOND_ID, INDEX_ID } from "./deck";

export function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function wholeMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// What one purchase actually bought, at a precision that stays readable from
// hundreds of shares down to a hundredth of one.
export function sharesText(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString("en-US");
  if (n >= 1) return n.toFixed(1);
  if (n >= 0.1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(3);
  return n.toFixed(4);
}

// The unit a card is counted in. A bond is bonds, a fund is units, a company
// is shares, and a savings account is none of those.
export function unitWord(asset: TallyAsset, n: number): string {
  if (asset.id === BOND_ID) return n === 1 ? "bond" : "bonds";
  if (asset.id === INDEX_ID) return n === 1 ? "unit" : "units";
  return n === 1 ? "share" : "shares";
}

// A payment, printed whole where it is whole and to the cent where it is not,
// because a payment of a dollar and nineteen cents is a dollar and nineteen
// cents.
export function payMoney(n: number): string {
  return Math.abs(n - Math.round(n)) < 0.005 ? wholeMoney(n) : money(n);
}

// The face carries the real price and nothing about it. A savings account has
// no share price at all and its worth never moves, so the line where a price
// would be is the rate the bank pays on it, which is where the disclosure of
// that rate belongs.
export function priceLine(asset: TallyAsset, price: number, ratePerYear?: number | null): string {
  if (asset.id === SAVINGS_ID) {
    return `${((ratePerYear ?? 0) * 100).toFixed(0)}% a year`;
  }
  return money(price);
}

// The back says what the purchase holds, in a complete sentence.
export function holdingLine(asset: TallyAsset, shares: number, owned: boolean): string {
  if (asset.id === SAVINGS_ID) {
    return owned
      ? "This card is money at the bank that earns interest every turn."
      : "One block puts money at the bank, where it earns interest every turn.";
  }
  const text = sharesText(shares);
  const unit = unitWord(asset, Number(text));
  return owned
    ? `This card holds ${text} ${unit}.`
    : `Two blocks buy ${text} ${unit} at today's price.`;
}

// One card's own purchase, in a complete sentence. Every card in a stack was
// bought on its own turn at its own price and holds its own shares, so the back
// of the top card says which purchase it is: this is what makes two sells in a
// row hand back two different figures while no price has moved at all.
export function purchaseLine(asset: TallyAsset, card: Card, chapterId: number): string {
  const when = card.chapter === chapterId
    ? `turn ${card.turn + 1}`
    : `chapter ${card.chapter}, turn ${card.turn + 1}`;
  if (asset.id === SAVINGS_ID) {
    return `Deposited on ${when}, and worth the ${money(card.buyDollars)} that was put in.`;
  }
  const text = sharesText(card.shares);
  const unit = unitWord(asset, Number(text));
  return `Bought on ${when} at ${money(card.buyPrice)} for ${text} ${unit}.`;
}

// The move since the last turn, as a sentence rather than as a badge, because
// the back of a card is read and the front is glanced at.
export function moveLine(move: number | null | undefined): string {
  if (move === null || move === undefined) return "It has not moved yet.";
  const pct = Math.abs(move * 100);
  const size = pct < 0.05 ? "held its price" : move >= 0 ? `rose ${pct.toFixed(1)}%` : `fell ${pct.toFixed(1)}%`;
  return `It ${size} since your last turn.`;
}

// The percent that flashes on a card during a resolve, and nowhere else.
export function movePct(move: number): string {
  return `${move >= 0 ? "+" : "−"}${Math.abs(move * 100).toFixed(1)}%`;
}

export function displayName(asset: TallyAsset, realNames: boolean): string {
  return (realNames && asset.real) || asset.name;
}

export function blockWord(n: number): string {
  return n === 1 ? "block" : "blocks";
}

// The label on the one button the table has. An era chapter names the month it
// is about to play through; an authored chapter names its own turn unit, and
// neither of them ever shouts.
export function playLabel(mark: string): string {
  if (!mark) return "Play the turn";
  // A dated mark is printed exactly as the wall prints it, so the button and
  // the column it is about say the same thing. Everything else is a phrase, and
  // a phrase inside a sentence is lower case.
  if (/\d{4}$/.test(mark)) return `Play ${mark}`;
  return `Play ${mark.charAt(0).toLowerCase()}${mark.slice(1)}`;
}

// The short mark under a rule on the unplayed schedule. A chapter whose turn is
// a year or longer is ruled by year, because "Dec 2009" and "2009" mean the
// same thing there and only one of them fits.
export function scheduleMark(mark: string, yearsPerTurn: number): string {
  if (yearsPerTurn < 1) return mark;
  const m = /(\d{4})$/.exec(mark);
  return m ? m[1] : mark;
}
