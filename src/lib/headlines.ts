// Real headlines, rendered as clipping cards when the tape reaches their
// month. Every headline is verbatim from the named publication on the named
// date, verified against archived front pages; none are invented. Where the
// famous broadsheet headline was unverifiable, a same-day wire/online wrap
// was used instead (see repo history for the verification notes).

export interface Clipping {
  atStep: number;      // month index in the era dataset
  days?: number;       // how many steps it stays up (default 3)
  date: string;
  source: string;
  headline: string;
  sub?: string;
}

import { covidHeadlines } from "../content/era-covid";
import { inflationHeadlines } from "../content/era-inflation";

export const HEADLINES: Record<string, Clipping[]> = {
  covid: covidHeadlines,
  inflation: inflationHeadlines,
  dotcom: [
    { atStep: 2, date: "March 20, 2000", source: "Barron's", headline: "Burning Up",
      sub: "When will the Internet Bubble burst? For scores of 'Net upstarts, that unpleasant popping sound is likely to be heard before the end of this year." },
    { atStep: 3, date: "April 14, 2000", source: "CNNfn", headline: "Bleak Friday on Wall Street",
      sub: "Unnerved investors rapidly unload stocks amid inflationary fears." },
    { atStep: 14, date: "March 7, 2001", source: "CNNfn", headline: "eToys files Chapter 11 bankruptcy",
      sub: "A dismal Christmas season and an inability to find a buyer sink the online toy seller." },
    { atStep: 20, date: "September 18, 2001", source: "The New York Times", headline: "Stocks Suffer Steep Losses, but Investors Resist Panic",
      sub: "The Dow fell 684 points, its worst point loss ever, on the first day of trading after the attacks." },
    { atStep: 29, date: "June 26, 2002", source: "CNN/Money", headline: "The death of confidence",
      sub: "WorldCom's gigantic fraud may send investors to the exits for a long, long time." },
    { atStep: 33, date: "October 9, 2002", source: "CNN/Money", headline: "Stocks get pummeled on GE, autos, investor pessimism" },
    { atStep: 90, date: "July 19, 2007", source: "CNNMoney", headline: "Finally! Dow finishes above 14,000" },
  ],
  payday: [
    { atStep: 3, date: "April 14, 2000", source: "CNNfn", headline: "Bleak Friday on Wall Street",
      sub: "Unnerved investors rapidly unload stocks amid inflationary fears." },
    { atStep: 20, date: "September 18, 2001", source: "The New York Times", headline: "Stocks Suffer Steep Losses, but Investors Resist Panic",
      sub: "The Dow fell 684 points, its worst point loss ever, on the first day of trading after the attacks." },
    { atStep: 33, date: "October 9, 2002", source: "CNN/Money", headline: "Stocks get pummeled on GE, autos, investor pessimism" },
    { atStep: 90, date: "July 19, 2007", source: "CNNMoney", headline: "Finally! Dow finishes above 14,000" },
    { atStep: 93, date: "October 9, 2007", source: "CNNMoney", headline: "Dow, S&P break records" },
  ],
  gfc: [
    { atStep: 9, date: "October 9, 2007", source: "CNNMoney", headline: "Dow, S&P break records" },
    { atStep: 14, date: "March 17, 2008", source: "The New York Times", headline: "JPMorgan Acts to Buy Ailing Bear Stearns at Deep Discount" },
    { atStep: 20, date: "September 15, 2008", source: "The New York Times", headline: "After Frantic Day, Wall St. Banks Falter",
      sub: "Lehman Will File Bankruptcy; Merrill to Be Sold" },
    { atStep: 21, date: "September 17, 2008", source: "The New York Times", headline: "Fed's $85 Billion Loan Rescues Insurer",
      sub: "U.S. to Get Control of the Troubled Giant A.I.G." },
    { atStep: 26, date: "March 9, 2009", source: "Time", headline: "Holding On for Dear Life",
      sub: "The cover story ran the exact day the market touched its Great Recession low." },
    { atStep: 74, date: "March 5, 2013", source: "The New York Times", headline: "Record High Close for Dow, Spurred by Fed and Profits" },
  ],
  crypto: [
    { atStep: 1, date: "January 17, 2018", source: "CoinDesk", headline: "BitConnect Shutters Crypto Exchange Site After Regulator Warnings" },
    { atStep: 26, date: "March 12, 2020", source: "The New York Times", headline: "Wall Street Suffers Worst Rout Since Black Monday" },
    { atStep: 46, date: "November 9, 2021", source: "CoinDesk", headline: "Bitcoin Soars Past $68K for the First Time as Ether Also Sets Record High" },
    { atStep: 58, date: "November 11, 2022", source: "CoinDesk", headline: "FTX Files for Bankruptcy Protection in US; CEO Bankman-Fried Resigns" },
    { atStep: 74, date: "March 5, 2024", source: "CoinDesk", headline: "Bitcoin Soars to New All-Time High Above $69K" },
  ],
};

export function clippingAt(era: string, step: number): Clipping | null {
  const list = HEADLINES[era] ?? [];
  for (const c of list) {
    if (step >= c.atStep && step < c.atStep + (c.days ?? 3)) return c;
  }
  return null;
}
