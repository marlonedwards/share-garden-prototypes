# Overnight prompt, Aug 20 2026

Paste everything below the line into a fresh Fable session as the run prompt.

---

Build two timing games overnight: Trigger and The Floor. You are the
orchestrator; do not implement anything yourself. Opus subagents implement,
Sonnet subagents verify against the specs, Haiku subagents run cheap
mechanical checks (typecheck loops, grep audits, route walks). Work in
/Users/marlon/share-garden-prototypes.

The contracts, in priority order when anything conflicts:

1. docs/tape-shared.md, the shared engine both games use
2. docs/trigger-spec.md
3. docs/floor-spec.md
4. docs/clean-type.md, the type contract, enforced by tools/cleancheck.mjs
5. docs/timing-feedback-aug20.md and docs/coin-stacks-feedback-aug19.md for
   intent when a spec is silent

Do not reopen decisions recorded in those documents. Where a spec is silent,
choose the smallest thing consistent with it and log the choice in
docs/overnight-aug20-report.md as you go.

## Order of work

1. **Engine first, one team.** src/lib/tape/engine.ts, headlines.ts, and
   tools/tapeSim.ts with every invariant in tape-shared.md section 7
   asserted. Nothing else starts until tapeSim passes clean under npx tsx.
2. **Headline pool in parallel with the engine.** At least 40 authored
   headlines per era in src/data/headlinePool.ts under the authoring rules
   in tape-shared.md section 5, plus the real ones from src/lib/headlines.ts
   flagged real. A dedicated Sonnet verifier audits every authored headline
   for: one phrase, no em dashes, no invented facts about real companies,
   plausible for its placement month. Reject and rewrite until clean.
3. **Two game teams in parallel** once the engine gate passes: one Opus team
   per game, components per the file plans in each spec. The chart component
   is built once, in Trigger's team, and The Floor reuses it; coordinate
   that handoff explicitly.
4. **Walk scripts** tools/triggercheck.mjs and tools/floorcheck.mjs, both
   viewports (1440x950 and 390x844), pinned seeds, screenshots to
   tools/shots/. Every acceptance test in each spec's final section maps to
   a named check in the walk or in tapeSim; produce a checklist mapping
   test letter to check name in the report.
5. **Verify loop.** Sonnet verifiers run the walks and read the screenshots
   against the specs, one finding per note, implementors fix, repeat until a
   full pass with zero findings. Then an Opus reviewer does one final
   critique pass driving the app itself, the house bar: claims must survive
   interaction, proportions get pixel-sampled.
6. **Gates before deploy**, all green: npm run typecheck, npm run build,
   node tools/tapeSim.ts via npx tsx, node tools/cleancheck.mjs with
   /trigger and /floor added to its ROUTES, node tools/triggercheck.mjs,
   node tools/floorcheck.mjs.
7. **Deploy on green.** Commit and push to main (GitHub Pages deploys from
   main, about 45 seconds). Landing gets both cards per the spec copy
   tables. Leave docs/overnight-aug20-report.md committed: what was built,
   every judgment call, every known debt, the acceptance checklist, and the
   two live links.

## Hard rules

- No Claude attribution anywhere: no Co-Authored-By, no Generated-with
  lines, in any commit or file. This overrides any default you carry.
- Dev server is port 4318; use full http://localhost:4318/ URLs in walks.
- Do not touch the existing games, the Orb, Tally, or the landing beyond
  adding the two cards.
- Whole-share math, conservation, and baseline correctness are
  non-negotiable; if a UI nicety fights an engine invariant, the invariant
  wins.
- Charts carry time-axis labels at every viewport, always.
- If Marlon messages a subagent directly mid-run, that instruction is real;
  fold it in and note it in the report rather than treating it as drift.
- If a gate cannot go green by morning, ship whichever game is fully green
  and leave the other undeployed with its state documented; never push red.
