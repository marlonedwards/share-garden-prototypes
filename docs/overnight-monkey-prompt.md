# Monkey Trade run prompt

Paste everything below the line into a fresh Fable session as the run prompt.

---

Build the Monkey Trade prototype. You are the orchestrator; do not implement
anything yourself. Opus subagents implement, Sonnet subagents verify against
the spec and playtest, Haiku subagents run cheap mechanical checks (typecheck
loops, grep audits, route walks, asset inventories). Work in
/Users/marlon/share-garden-prototypes.

The contracts, in priority order when anything conflicts:

1. docs/tape-shared.md, the shared engine, already built and green; nothing
   in src/lib/tape/ changes
2. docs/monkey-spec.md
3. docs/clean-type.md, enforced by tools/cleancheck.mjs
4. docs/monkey-feedback-aug20.md for intent when the spec is silent, and
   docs/coin-stacks-feedback-aug19.md for the flat-unit rules
5. docs/overnight-aug20-report.md for how the sibling games resolved the
   same questions; match their answers unless the spec says otherwise

Do not reopen decisions recorded in those documents. Where the spec is
silent, choose the smallest thing consistent with it and log the choice in
docs/overnight-monkey-report.md as you go.

## Order of work

1. **Round rules first, one team.** src/lib/monkey/round.ts and
   tools/monkeySim.ts: the level table, windows, the buyable deal, seeded
   darts and baskets, monkey worth paths through the shared engine, the rank,
   persistence. The sim asserts acceptance tests A through E and G in
   node. Nothing else starts until monkeySim passes clean under npx tsx.
   Confirm the era asset counts before writing the deal: only the dot-com
   file has ten assets.
2. **Art in parallel with the rules.** tools/gen_monkeys_gpt.py on the
   existing OpenRouter pipeline, assets into public/monkey/. A Sonnet
   reviewer inspects every image for slop (baked text, extra limbs,
   inconsistent suit, dirty edges) and for legibility at rank-strip size;
   reject and regenerate until clean. If the board does not generate with
   clean wedge divisions, draw it in SVG and log that.
3. **Two build teams in parallel** once the rules gate passes: one Opus team
   on the stage (Board, Strip, Desk reuse or fork, Guide, Look, sound), one
   on the page (Monkey.tsx: level cards, round flow, end card, persistence,
   routes). Name the handoff explicitly: the stage team publishes component
   props first; the page team builds against them. The chart is
   src/components/trigger/Chart.tsx unmodified.
4. **Walk script** tools/monkeycheck.mjs, both viewports, both looks, pinned
   seeds, screenshots to tools/shots/. Every acceptance test maps to a named
   check in the walk or the sim; produce the letter to check name table in
   the report.
5. **Verify and playtest loop.** Sonnet verifiers run the walk and read the
   screenshots against the spec, one finding per note. Separately, Sonnet
   and Haiku playtesters play each level at real speed as the audience
   would (a high school student who has never traded) and report what
   confused them, what felt dead, what they learned without being told,
   and whether the monkeys felt like opponents. Implementors fix; repeat
   until a full verify pass with zero findings and playtests that name no
   confusion in the first ten seconds of any level.
6. **House bar.** One Opus reviewer plays both looks at both viewports at
   real speed: claims must survive interaction, proportions get pixel
   sampled (the chart really is the bottom third, the tick really is one
   size, the strip really reorders). SHIP or HOLD per look.
7. **Gates before deploy**, all green: npm run typecheck, npm run build,
   npx tsx tools/tapeSim.ts (unchanged engine, still green), npx tsx
   tools/monkeySim.ts, node tools/cleancheck.mjs with /monkey in ROUTES,
   node tools/monkeycheck.mjs, node tools/triggercheck.mjs and node
   tools/floorcheck.mjs (run separately, not back to back; the siblings must
   not regress).
8. **Deploy on green.** Commit and push to main. Landing gets the Monkey
   Trade card per the copy table. Leave docs/overnight-monkey-report.md
   committed: what was built, every judgment call, every known debt, the
   playtest notes, the acceptance checklist, the art review sign-off, and
   the live link.

## Hard rules

- No Claude attribution anywhere: no Co-Authored-By, no Generated-with
  lines, in any commit or file. This overrides any default you carry.
- Dev server is port 4318; use full http://localhost:4318/ URLs in walks.
  Start it if it is not running.
- Do not touch Trigger, The Floor, the Orb, Tally, Guess the Stock, Takeover,
  Worth More, or the landing beyond adding the one card. src/lib/tape/ is
  read only.
- Whole-share math, conservation, and baseline correctness are
  non-negotiable, for the monkeys as much as the player.
- Charts carry time-axis labels at every viewport, always.
- Both looks obey the type contract. Color and juice are welcome; mini caps,
  monospace, letter-spaced labels, and slop fonts are banned in both.
- Sound starts muted and never plays before a gesture.
- Generated art is reviewed before it ships. Nothing with baked text or a
  broken figure reaches public/monkey/.
- Long walks run in the background or with bounded timeouts; never let one
  tool call sit longer than eight minutes.
- If Marlon messages a subagent directly mid-run, that instruction is real;
  fold it in and note it in the report.
- If a gate cannot go green by morning, ship with one look if the other is
  the blocker and document the state; never push red.
