# Overnight course build: workstream specs

Branch: `overnight-course`. Nothing merges to main until the final sweep
passes. Every workstream follows docs/course-style.md. Dev servers: each
verifier uses the port given in its prompt (4320+) so runs never collide.
Type gate for every workstream: `npx tsc --noEmit` clean.

## W1. Stepped lesson framework

`src/components/LessonShell.tsx`: progress dots, step N of M, one stage slot,
one paragraph slot, Continue; quiz step renders the existing QuickCheck inside
the shell as the final steps (one item per screen), replacing the stage.
Back arrow returns one step. Keyboard: right arrow advances.
`src/lessons/` directory: one module per lesson exporting a typed config
(screens array; each screen = { eyebrow, definition, story, stage:
ReactNode-producing component, check?: CheckItem }).
Rewire /orb/mini/:id to the new shell (keep old URLs working; add /orb/learn/:id
as the canonical path). Ladder order everywhere: cash, savings, stocks, funds,
coins. Scenario select "Start here" strip shows the five in ladder order with
a cleared-marble indicator per lesson.

## W2. The five intro lessons (one module each, parallel-safe)

Files: src/lessons/cash.tsx, savings.tsx, stocks.tsx, funds.tsx, coins.tsx.
6 to 9 screens each, definition-first + Maya/Jordan story, at least 3
interactive stages and 2 check items per lesson (check items clear field-guide
marbles via existing concept ids; savings uses a NEW field-guide entry
"compounding" that W2-savings adds to src/lib/fieldGuide.ts entries list, rail
"spread", plus a matching concept tag).

- cash: what money does, inflation as the quiet leak (jar + sneakers stage,
  richer than the current version), why "safe from crashes" is not "safe."
  Concepts: inflation.
- savings: interest is the bank paying you to wait; compounding as the curve
  that bends (interactive compound-growth stage where the player drags years
  and watches simple vs compound diverge); emergency money lives here, not in
  the market. Concepts: compounding (new), plus reinforce inflation.
- stocks: a share is a piece of a company; where the money goes when you buy
  (secondary market); the price is the last trade; dividends. Rebuild of the
  current share lesson, deeper: add a screen on why prices move (more buyers
  than sellers), and one on what a shareholder can and cannot do. Concepts:
  share, market-price, dividend.
- funds: the tripler you always miss; one purchase that owns everything;
  diversification as survival. Deeper than current: add expense-of-picking
  screen (professionals mostly lose to the index over long runs, stated
  honestly with the SPIVA-style fact in plain words). Concepts: index-fund,
  diversification.
- coins: a coin opens onto itself; volatility; position size decides the
  story; the Ponzi promise red flag. Concepts: position-size, ponzi.

## W3. Voice pass on all existing sim content

Rewrite every player-facing string in src/lib/scenarios.ts (briefs, moments,
gates, bullets, descs), src/lib/checkpoints.ts (prompts, options, explains),
src/lib/fieldGuide.ts copy, and src/pages/OrbScenario.tsx literals to the
style contract. Meaning and facts must not change; verified headlines must not
change at all. Fragments become sentences. Definition-first applies to gate
context pages: each gate's first context sentence states the concept at play.

## W4. Era content refactor then depth

Step 1 (sequential): split scenario content so parallel work is safe:
src/content/era-dotcom.ts, era-payday.ts, era-gfc.ts, era-crypto.ts export the
ScenarioConfig pieces; scenarios.ts assembles. Add to EraAsset: founded
(number), history (string, entering the era), believers (string), doubters
(string). Build src/components/ScoutingCards.tsx: pre-run flip-through, one
company per card (dot color, name, founded, history, believers say / doubters
say, starting price), all-cards-flipped unlocks the Start button; wire into
OrbScenario brief beat. Build src/pages/EraBriefing.tsx at /orb/brief/:id: a
designed 1-2 minute optional read (linked from the scenario card and the gate
refs, never forced before play).

Step 2 (parallel per era): fill scouting fields for every cast member, expand
gates to 4-5 per era (real moments, definition-first context, act flags where
an option implies a trade, verified refs), write the briefing page content,
and extend the era quiz to 5 static items (keep run-aware templates).

## W5. Two new eras, real data

Bake real monthly data with tools/bake_era.mjs patterns (read the existing
bake scripts first; adapt; document split factors; Yahoo via curl, and if
Yahoo blocks, stooq.com daily CSV aggregated to monthly is the fallback).
Sanity-check every series against known history before committing (spot-check
5 known price points per series; write the checks into tools/eracheck2.mjs).

- covid (id "covid", 2019-01 to 2024-12): cast around AAPL, AMZN, NVDA, TSLA,
  ZM, PTON, GME + ^SP500TR. Abstracted names + real names behind toggle.
  Moments: the fastest crash (Feb-Mar 2020), the everything rally, meme mania
  (Jan 2021, GME gate on crowds and short-term greed), the 2022 giveback
  (ZM/PTON collapse as the stay-at-home story ends), quiet recovery to
  records. 4-5 gates, 5 quiz items, scouting cards, briefing page, verified
  headlines wired into src/lib/headlines.ts.
- inflation (id "inflation", 2021-01 to 2024-12): cast around AAPL, WMT, XOM,
  a long-bond fund (TLT as "The Steady Lender", which falls hard when rates
  jump: the honest lesson that even lending money has a price that moves) +
  ^SP500TR. Moments: prices start rising, the Fed hikes, stocks AND bonds
  fall together (2022), the October 2022 bottom, the cooling. Ties explicitly
  back to the cash and savings lessons in its debrief. Same completeness bar.

Both appear on /orb select in chronological order with lesson numbers
continuing the ladder, in OnePager.tsx with objectives + standards, and get
walk scripts (tools/walk-covid.mjs, tools/walk-inflation.mjs).

## W6. The finale: Ready to invest?

Route /orb/ready, linked as the final lesson card ("Ready to invest?").
One door, two paths:
- "I'm planning my first orb": pick from a curated list of ~20 real assets
  (large stocks, index funds, a bond fund, two coins; static realistic prices
  in a data file with an as-of date) plus custom entries; set dollar sizes;
  see the personal marble render live (reuse orb visual language), with honest
  feedback lines on concentration, position size, and what a 50% crash would
  do to it (backward-looking framing only). Ends with a printable one-page
  plan (window.print CSS like OnePager) to discuss with a parent or teacher.
- "I already own some": same entry UI framed as "type in what you own";
  same marble + same feedback.
Both paths: plain not-advice line ("This is a mirror, not advice. Nothing you
type leaves this computer."), localStorage persistence, no accounts. The saved
marble appears on the /orb select screen next to the named orb. Future work
note in code: live prices later.

## W7. Final sweep and the single deploy

Run in order: `npx tsc --noEmit`; `npx vite build`; every walk in tools/
(depthcheck, guidecheck, scrubcheck, newscheck, settingscheck, minicheck or
its replacement, walk-covid, walk-inflation, plus a new walk-lessons.mjs that
completes all five intro lessons and the finale); click every route in a
final Playwright pass; spot-check 20 random copy strings against the style
contract; confirm no banned patterns via grep (" — ", emoji ranges, known
fragments). If EVERYTHING passes: merge overnight-course into main with a
single commit message summarizing the build, push (this deploys), verify the
Pages run concludes success. If anything fails after one fix attempt: do NOT
merge; leave the branch and write docs/overnight-report.md with what passed,
what failed, and why.
