# Overnight course build: final sweep report (W7)

Date: 2026-08-06. Branch `overnight-course` merged to `main` as `7e686ee`.

## Outcome in one line

Every verification gate passed and the merge and push completed. The GitHub
Pages publish did **not** succeed: GitHub Actions was in a partial outage and
the build job failed to start on three attempts. The live site is healthy and
still serves the previous build, so nothing is broken; the new build simply is
not published yet.

## Verification: pass/fail per workstream

| Gate | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | pass | Clean, zero output, on the branch and again on merged main. |
| `npx vite build` | pass | Clean. The >500 kB chunk notice is advisory, not an error. |
| W1 stepped lessons | pass | All five lessons walk screen by screen; step counts 7, 7, 9, 7, 7. |
| W2 five intro lessons | pass | Every screen unlocks through its own stage; all check items grade and save. |
| W3 voice pass | pass | See the style audit below. |
| W4 era depth (scouting, briefings, gates) | pass | Scouting decks gate every era start; all six briefing pages render. |
| W5 covid and inflation eras | pass | `eracheck2` and `eracheck2-inflation` verify every spot-checked price point. |
| W6 Ready to invest finale | pass | Both doors walk shelf, sizing, mirror, print, persistence, and resume. |
| Route sweep | pass | All 36 routes plus the catch-all redirect. |
| Banned patterns | pass | Zero em dashes, en dashes, emoji, or the word "fetch" in `src/`. |
| Voice spot check | pass | 23 sampled strings plus all 67 `definition:` fields checked automatically. |
| Pages deploy | **fail** | GitHub Actions outage. Details below. |

## Walk scripts

Passing: `depthcheck`, `guidecheck`, `scrubcheck`, `newscheck`, `settingscheck`,
`walk-covid`, `walk-inflation`, `walk-lessons` (new), `routecheck` (new),
`checkwalk`, `scencheck`, `gardencheck`, `freecheck`, `namescheck`, `eracheck`,
`gatecheck`, `sharecheck`, `readycheck`, `eracheck2`, `eracheck2-inflation`.

Seven scripts needed fixing first. All of the breakage was the scripts holding
stale assumptions about intended new design, not app defects:

- eras now deal a scouting deck before the start button opens, so every walk
  that clicked straight through to "Start in …" timed out;
- eras now carry four to five gates instead of two, each pausing the tape;
- gate titles lost their trailing period and render as `February 2000 ·`;
- the end card is stepped (score, rewind, lessons), so "Save your orb" and the
  debrief bullets moved off the first end screen;
- the side rail is deliberately hidden during gate beats, so `depthcheck` was
  checking the "gone" label on a screen that cannot show it;
- name clicks had to move from `getByText` to `getByRole("button")`, because
  the live ticker repeats the same names in moving spans that never satisfy
  Playwright's stability check.

The shared helpers now live once in `tools/walkkit.mjs`.

`tools/minicheck.mjs` was removed. It walked the pre-W1 mini-lesson flow that
the stepped `LessonShell` replaced, and `tools/walk-lessons.mjs` is the
replacement the plan called for.

### Two scripts still fail, both pre-existing and out of scope

Neither is part of W7's gate list, and both fail identically on `main` before
this branch existed, so neither is a regression from the course build:

- `tools/tradecheck.mjs` targets `/#/orb?beat=mid`. On `main`, `/orb` already
  rendered `OrbSelect`, which never contained "Nova Systems" and never read a
  `beat` param. The deep-link it tests stopped existing when the scenario
  select screen landed.
- `tools/cartcheck.mjs` targets the garden prototype. `Garden.tsx` and
  `GardenGame.tsx` are byte-identical between `main` and this branch, and the
  garden's own art rework on `main` changed the intro flow it expects.

They were left untouched rather than rewritten, because rewriting them would
invent new coverage for prototypes this build did not touch, and `gardencheck`
and `freecheck` already cover those surfaces and pass.

## Style audit detail

- Em dashes, en dashes, emoji, the word "fetch": zero occurrences in `src/`.
- All 67 `definition:` fields are single complete sentences ending in a period,
  checked mechanically, satisfying the definition-first law.
- Every hit for `guarantee`, `predict`, and `forecast` is anti-prediction
  teaching ("A market bottom is only visible after it has passed, and nobody
  rings a bell when it arrives") or the Ponzi promise being taught as the red
  flag. No prediction framing and no outcome guarantees.
- The only all-caps tokens in copy are real proper nouns: CEE, FTX, CNN, AIG.

## Why the deploy failed

Run `31118326755` on commit `7e686ee`, three attempts:

1. Queued 15 minutes, then cancelled before any step ran.
2. and 3. Failed in `Set up job` with:
   `Failed to resolve action download info. Error: Service Unavailable`

`githubstatus.com` reported **Actions: partial_outage** (Pages and API
operational) throughout. No step of the build ever executed, so this is
infrastructure, not the code: `npm ci` and `npm run build` are exactly what the
workflow runs, and both pass locally against the merged tree.

## What is needed to finish

Re-run the workflow once GitHub Actions recovers:

    gh run rerun 31118326755
    gh run watch 31118326755 --exit-status

Expected result: the site serves `assets/index-B4fMOVyY.js`. It currently
serves the previous build, `assets/index-CbtJCykm.js`.

## Housekeeping note

16 untracked files with a `" 2"` suffix (for example `src/content/era-dotcom 2.ts`)
appeared in the working tree during the session. They look like sync conflict
copies. They are untracked, none are in `HEAD`, and none reached the push. They
are worth deleting, but were left alone rather than removed unasked.
