# Course style contract

Every agent writing or verifying course content follows this document exactly.
Verifiers reject work that violates it.

## Voice: definition first, then story

Every teaching beat opens with **one bold, complete, textbook-clean sentence**
that defines the concept. It is immediately followed by story elaboration in
complete sentences that makes the definition concrete.

The recurring cast for intro lessons: **Maya**, who runs a lemonade stand, and
**Jordan**, her neighbor who becomes an investor. Era lessons use real history
as the story instead.

Example of the required pattern:

> **A share is one small piece of a real company.** Maya's lemonade stand has
> been divided into 100 equal pieces, and Jordan just bought one of them. From
> today, one hundredth of everything the stand earns belongs to Jordan, and so
> does one hundredth of everything the stand is worth.

## Banned

- Sentence fragments as body copy. "A real company, cut into 100 equal pieces."
  is the canonical violation. Every sentence has a subject and a verb.
- Em dashes. Use periods, commas, or colons.
- Emoji. ALL-CAPS words. The word "fetch."
- Jargon before its definition. If a term appears, its definition sentence came
  first, in this lesson or an earlier one in the ladder.
- Prediction framing anywhere. Charts and replays look backward only. Never
  imply that a past chart tells you the next one, and never build an item that
  rewards forecasting. "You cannot time the market" is a load-bearing principle.
- Guarantees of outcomes. The course promotes long-term, diversified,
  size-aware investing without promising results.

## Reading level

Grade 6 to 8. Short sentences are fine; fragments are not. Numbers over
abstractions: "two pairs of sneakers becomes one" beats "purchasing power
declines."

## Layout law (stepped lessons)

- One idea per screen. A screen holds: progress dots, one interactive stage,
  one short paragraph (definition + story), one Continue affordance.
- Nothing appends below as you progress; screens replace each other.
- The quiz replaces the stage. It never stacks under the lesson.
- Maximum one card component visible at a time inside a lesson screen.
- Every screen has something to touch: a slider, a flip, a choice, a draggable,
  or a tap-to-reveal. Reading-only screens are not allowed.
- Typography does structural work: an eyebrow label (small, #6e6e73), the
  definition sentence in a larger weight, story text at body size, and big
  numeric callouts (tnum, 20px+) whenever a number is the point.

## Visual language

Reuse the game's existing vocabulary: glass marbles, the cash beaker, orb
gradients, Apple-light surfaces (#f5f5f7 bg, #1d1d1f ink, #6e6e73 sub,
#0071e3 accent, white cards with border-black/8). SVG or CSS only; no external
images. Deterministic: no Math.random in lesson logic.

## Standards and honesty

- Tag every lesson and every quiz item with its CEE grade-8 benchmark (or the
  9-12 ladder where noted) in a code comment.
- Real prices are real; the four reconstructed delisted series (WCOM, ETYS,
  LEH, BCC) are documented as reconstructed. New era bakes must be real data.
- Headlines are verbatim from named publications on named dates, verified
  against archives. Never invent or paraphrase a headline.
- Abstracted company names in-game, real names behind the existing
  "Real names" toggle (the `real` field on EraAsset).
