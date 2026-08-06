// Shared helpers for the Playwright walk scripts.
//
// Two things changed under every pre-existing walk during the overnight course
// build (docs/overnight-plan.md): eras now deal a scouting deck before the
// start button opens (W4), and every era carries four to five gates that each
// pause the tape until answered (W4 step 2). Both are intended design, so the
// walks learn them once here instead of in every script.

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Flip every scouting card so the era's start button unlocks. Safe to call on
// eras that deal no deck: it returns immediately when there is no deck.
export async function scout(page) {
  const sm = page.getByRole("button", { name: "Scout the menu" });
  if (!(await sm.count())) return false;
  await sm.click();
  await wait(400);
  // Cards land front up now, so each dot visit needs a tap to open the report.
  for (let i = 1; i <= 12; i++) {
    const c = page.locator(`button[aria-label="card ${i}"]`);
    if (await c.count()) {
      await c.click();
      await wait(80);
      const flip = page.locator('button[aria-label^="Flip the card"]');
      if (await flip.count()) { await flip.click(); await wait(80); }
    }
  }
  await wait(200);
  return true;
}

// Answer a known list of [gateTitle, optionLabel] pairs, resuming the tape at
// `speed` after each one. An act-flagged answer pauses the tape for the move,
// so clicking the speed chip afterwards is what gets it running again.
export async function rideGates(page, pairs, speed = "4×") {
  for (const [title, answer] of pairs) {
    let seen = 0;
    for (let i = 0; i < 40; i++) {
      await wait(500);
      seen = await page.getByText(title).count();
      if (seen) break;
    }
    if (!seen) { console.log("MISSING gate:", title); continue; }
    const btn = page.getByRole("button", { name: answer }).first();
    if (!(await btn.count())) { console.log("MISSING gate option:", title, answer); continue; }
    await btn.click();
    await wait(400);
    const chip = page.getByText(speed, { exact: true });
    if (await chip.count()) await chip.click();
  }
}

// Wait for the run to reach its end card.
export async function waitForEnd(page, tries = 60) {
  for (let i = 0; i < tries; i++) {
    await wait(1000);
    if (await page.getByText("You finished with").count()) return true;
  }
  return false;
}

// The gate ladders each era ships, with a hold-style answer for each, so a
// walk can ride an era end to end without re-deriving them.
export const DOTCOM_GATES = [
  ["February 2000 ·", "Spread across everything"],
  ["April 2000 ·", "Hold what I have"],
  ["September 2001 ·", "Hold and stick to the plan"],
  ["June 2002 ·", "Hold and hope it survives"],
  ["October 2002 ·", "Hold what I have"],
];

export const GFC_GATES = [
  ["October 2007 ·", "Keep holding everything"],
  ["March 2008 ·", "Hold everything"],
  ["September 2008 ·", "Hold and ride it out"],
  ["March 2009 ·", "Hold"],
  ["March 2013 ·", "Stay with the plan"],
];

export const PAYDAY_GATES = [
  ["April 2000 ·", "Keep investing every month"],
  ["September 2001 ·", "Invest it like any other month"],
  ["October 2002 ·", "Stick to the plan"],
  ["June 2003 ·", "The plan does not wait"],
  ["October 2007 ·", "No. Invest it like every other month"],
];
