# Overnight run report, Monkey Trade, August 20 2026

Build of Monkey Trade on the shared tape engine, per docs/monkey-spec.md.
Logs what was built, every judgment call where the spec was silent, known
debts, playtest notes, the acceptance checklist, the art review sign-off,
and the live link. Written as the run goes.

## Status

- Started from clean main at d00f5d6. Dev server on 4318.
- Era check before the deal: eraDotcom.json carries ten companies (AAPL,
  AMZN, MSFT, CSCO, INTC, KO, JNJ, XOM, WCOM, ETYS) plus the index; covid
  carries seven, gfc nine, inflation five, crypto six. The spec's "only the
  dot-com file has ten" holds. "The 2020s" is eraCovid.json (2019-01 to
  2024-12); "the crash" is eraGfc.json.

## Judgment calls

(filled in by each team as it goes)

### Art team

- **The ground is keyed by the model, not by the script.** Section 11 assumed
  the pipeline paints on a flat ground that code then keys. It does not: across
  two batches gpt-image-1 ignored a named background hex entirely and returned a
  gold and then a dark brown gradient with a soft glow behind every figure, so a
  corner flood fill left a halo. Batch 3 asked gpt-image-1 for
  `background: "transparent"` instead and got a real alpha channel with clean
  edges. The script keeps the flood fill path as a fallback for any sheet that
  comes back opaque.
- **No ground shadow.** The spec's art note allows a tiny shadow under each
  figure. The generator drew it as a soft glow that survived keying as a dirty
  fringe, so the prompt now bans shadows outright. The game can lay its own flat
  shadow under a monkey in CSS if the strip wants one.
- **Slicing is content aware, not a fixed grid.** The model does not honour cell
  geometry, so the script finds each figure by projecting an ink mask, takes its
  tight box, then places every figure on a shared square canvas at a shared
  scale with the feet on one baseline. Poses keep their relative height, which is
  what makes a rank strip read. A nominal grid slice is the fallback when the
  projection does not find the expected number of bands.
- **Sheet size.** One 1536x1024 sheet, 3 by 2, five poses and one empty cell.
  Cells land at 512x512 after normalisation, which is the floor the run asked
  for and nine times the 56px rank strip size.
- **Tie colour.** The tie came back a plain flat grey, so a per monkey tie tint
  in code is possible. The suit is a dark navy and the fur a medium brown, both
  consistent across the five poses.
- **Kept for the record.** `public/monkey/sheet-monkey.png` and `sheet-dart.png`
  are the raw generations, pixel for pixel, only recompressed losslessly. They
  are not loaded by the game. The candidate folder does not keep a second copy
  of them; `--reslice` falls back to the promoted sheet.

### Rules team

- **The level is mixed into the seed.** `roundRng(level, seed)` hashes the two
  together before handing them to the engine's mulberry32, so `?level=2&seed=7`
  is a different round from `?level=1&seed=7` rather than the same darts thrown
  at a different board.
- **The guide is monkey one, on every level and every seed.** Nothing in the
  spec asks it to move, and a fixed guide lets the strip reserve its slot.
- **A doubled wedge buys one position, not two.** Allotments are aggregated per
  ticker before any share is bought, so two darts on Apple spend $1,000 on Apple
  in a single whole-share buy instead of two $500 buys that each round down.
- **Level 2 wedges have to carry their own recovery.** On top of listed,
  buyable and alive, a level 2 stock's last close must be at or above its first.
  Section 3 promises that monkeys who sat through the crash recover, and the
  crash window otherwise deals Citigroup at 0.10 times and AIG at 0.03 times,
  which teaches the opposite. Consequence, and a known debt: the crash era's
  pool is exactly Apple, Amazon, Ford and Walmart, so crash rounds repeat their
  three stocks more often than the 2020s rounds do.
- **The crash month is computed, not authored.** It is the month the index
  falls hardest inside the window, which lands on October 2008 in the crash and
  March 2020 in the 2020s, the two months section 3 names.
- **Level 1 redraws until six of the ten buy months are distinct.** A plain
  draw falls short about once in every 280 seeds, which would make acceptance
  test C true of almost all seeds instead of all of them. The redraw runs on the
  same seeded stream, with a forced spread as a last resort.
- **A calendar dart may land on any month of the window, the last one
  included.** A monkey that buys in the final month simply finishes on its
  thousand dollars, which is a real outcome and not a bug.
- **Board order.** Level 3 keeps the era file's order, so the wedges read Apple
  to eToys the way section 3 lists them. Level 2's three wedges keep the order
  the seed picked them in, so the board is not always alphabetical.
- **Board membership uses The Floor's listing rule unchanged.** A leading run of
  three or more identical closes is backfill, so a company is never dealt before
  its first real trading month, and a company already at zero when the window
  opens is not a wedge.
- **A dart whose allotment cannot buy one share leaves that money in cash.**
  Conservation still closes and the monkey is simply that much less invested;
  this only bites on late dot-com windows where Apple runs past a third of the
  stake.
- **A monkey is worth exactly its thousand dollars in cash until its buy
  month.** The worth path is piecewise: the stake before entry, the engine's own
  `worthAt` on a zero-trade run after it. That is what "entered at its buy
  month" means.
- **Names and money come from the siblings.** `companyName` from
  `src/lib/trigger/deal.ts` and `money` from `src/lib/trigger/format.ts`, so
  Exxon reads "Exxon Mobil" the way Trigger writes it rather than the "Exxon"
  of the spec's prose. A monkey that could not buy anything reads "sat in cash".
- **Save shapes.** `monkey-best` is a JSON object keyed by level number,
  `monkey-progress` a JSON array of unlocked level ids. Unlocked levels are
  derived from the best ranks as well as read from progress, so a cleared or
  torn progress key can never take back a level the player has already earned.
  Both reads fall back to level one only when there is no window.
- **Acceptance test E's survival floor is five percent of the stake.** An
  exhaustive sweep of every 36 month window and every three wedge basket in the
  dot-com file puts the worst possible outcome at $102.88 (Cisco with WorldCom
  and eToys from March 2000), so a $50 floor is under every real outcome and
  still far above the $43 that going all in on a dying company can leave. The
  sim asserts the sweep as well as the dealt monkeys.
- **`tools/monkeySim.ts` prints a FIXTURE block** in floorSim's format, three
  pinned deals at seed 7 with their windows, boards, crash months, buy months
  and final worths, so `tools/monkeycheck.mjs` can hold the live DOM against
  numbers this harness computed.

## Known debts

## Playtest notes

## Art review

Three batches, model `openai/gpt-image-1` through OpenRouter, one sprite sheet
per batch so the five poses share a single generation context.

- **Batch 1, rejected.** Character and poses were right, but the model painted a
  gold gradient ground with a soft drop shadow behind each figure instead of the
  flat `#FFFBF2` the prompt named. Keying the corners left a gold halo around
  every slice, visible at 56px.
- **Batch 2, rejected.** The background instruction was moved to the front of the
  prompt and every shadow banned. The model went further the wrong way: a dark
  brown gradient with an outer glow, and it filled the sixth cell that was asked
  to stay empty with a sixth monkey cropped at the waist.
- **Batch 3, passed.** Asked gpt-image-1 for `background: "transparent"` rather
  than a named hex. Real alpha, clean outlines, five consistent poses plus both
  darts. Reviewer found zero rejects.

Reviewer sign-off, verbatim:

> SIGN-OFF: batch 3 passes, zero rejects. Character stays consistent across
> every pose (same fur brown, same slate suit and grey tie, same face shape),
> edges are clean with no jagged cell fragments or baked-in text, and all five
> poses plus both dart states hold up at small size.

> 56px distinguishability: idle, cheer and slump are clearly distinguishable.
> Cheer's raised-arms silhouette is unmistakable against the other two. Idle and
> slump both keep arms down, but slump's bowed head, hunched shoulder line and
> downturned mouth versus idle's upright head and closed smile still read apart
> at 56px, confirmed in strip56.png.

Shipped in `public/monkey/`, every figure 512x512 RGBA with a transparent ground:
`monkey-idle.png`, `monkey-throw.png`, `monkey-cheer.png`, `monkey-slump.png`,
`monkey-talk.png`, `dart.png`, `dart-pinned.png`. The raw sheets stay beside them
as `sheet-monkey.png` (1536x1024, 3 by 2, five poses and one empty cell) and
`sheet-dart.png`. The passing candidate batch with its 56px previews is kept at
`public/monkey/candidates/batch3/`; the two rejected batches are deleted. The
generator is `tools/gen_monkeys_gpt.py`.

## Acceptance checklist

## Live link
