# The Tally, sprint one: the game gets an app around it

Status: decisions confirmed with Marlon after the demo week feedback meeting,
11 August 2026. This extends docs/tally-loop.md; the reward rules in
docs/tally-spec.md section 8 bind everything here as always.

## Decisions locked

1. The game stays a run. The level selector shows all eight chapters with
   bests and lock states; picking an unlocked chapter starts a run there.
   One miss still ends the run.
2. The piggy bank is a pixel art mascot whose only job is the tutorial:
   it guides chapter 1 and the first shop with one-line speech bubbles,
   then leaves. It never gives advice, only names what things are.
3. Chapter 1 is the tutorial, replayable from the menu. No separate mode.
4. Turn rhythm: the shop screen opens itself at the start of every chapter;
   after every scoring the game holds at the read beat with the chart; the
   shop from there is one press away and optional.
5. Blocks round to the nearest denomination, and per-holding allocation is
   largest remainder so the parts always sum to the column. Unchanged.
6. The run seed leaves every player-facing screen. The chapter summary says
   plainly how many turns and chapters remain instead.

## The screens

- Main menu: title, Continue run when one exists, New run, Chapters,
  Collection, Field guide, Tutorial, Sound. The piggy idles here.
- Chapters (the level selector): eight tiles with name, dates or
  "illustrative", best result, locked as silhouettes. Reachable from the
  main menu and from a quiet Chapters affordance at the top of the game.
- The game: the board, full screen. The shop is a SCREEN, not an overlay:
  it replaces the board view Balatro style and returns to it.
- Collection and Field guide open from the menu (the existing collector's
  box and the app's existing field guide).

## Layout law, third revision

Full screen: the game fills the viewport with no page scroll. Width is
responsive; the board's maximum width is the 16:9 ratio of the viewport
height. Elements scale up with the room. Small screens still get the whole
board scaled, polish deferred as before.

## Look

The rails and panels take one more step toward game UI and away from
minimal chrome: framed panels with visible weight, clear separation between
the rail, the field, and the table row, bigger type per the round five
scale as the floor, never pixel typefaces (the pixel language belongs to
the blocks and the piggy only).

## The piggy

Pixel art sprite, a few poses (idle, point left, point up, celebrate,
wince). Generated with the existing sprite pipeline in tools/ if the API is
available, hand-built SVG pixel art if not. Speech is one sentence per
bubble in course voice, definition first. The tutorial script covers: what
a block is, what the wall is, payday, the first deposit, the first score,
interest arriving, and the target line. Nothing else speaks.

## Build order

A. Shell: full screen 16:9 layout, main menu, level selector, shop as a
   screen, run seed removal, turns-remaining clarity.
B. Game UI pass: rails and panels per Look.
C. The piggy and the chapter 1 tutorial choreography.
D. Verify: reward rules hold (the piggy names, never advises), sim and
   reconciliation harnesses green, full playthrough at 1280x800 and a
   16:9 large screen.
