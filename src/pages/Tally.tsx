// The Tally: one board, full screen, and one thing on screen at a time.
//
// The board fills the window it is given. Its height is the viewport less a
// hairline of margin, its width is the same height at sixteen by nine unless
// the window is narrower than that, and elements scale up with the room they
// get rather than floating in a bigger and bigger field of paper. A window too
// small to hold the natural 420 by 640 board gets that board scaled down whole,
// so a phone is a small cabinet rather than a second arrangement, and small
// screen polish is a later pass. Nothing here reflows, because a second
// arrangement is a second design.
//
// The page holds three screens and the game is one of them:
//
//   THE MENU      title, Continue when a run truly exists, New run, Chapters,
//                 Collection, the field guide, the tutorial, and sound.
//   THE CHAPTERS  the ladder as eight tiles, locked ones silhouetted, and
//                 picking one starts a new run there.
//   THE GAME      the strip and the board body, which swaps between the table
//                 and the shop.
//
// Opening this page creates nothing and saves nothing. A run is written to
// storage the moment a player starts or continues one and from then on at every
// change, which is what makes Continue mean what it says. Leaving the game from
// the strip never loses the run.
//
// The loop, per docs/tally-loop.md:
//
//   THE TABLE    the wall, your stacks, your money, one button.
//   THE RESOLVE  the scoring moment, in two acts. First the cards: the wall
//                dims a shade and holds still while each stack in turn lifts,
//                takes its hit and shows one chip carrying both of its numbers,
//                the blocks it moved and the move that did it. Then the wall:
//                the months inside the span sweep past, the closing column
//                assembles band by band in the order the cards just scored, the
//                count ticks with the landing blocks, and the cash band and the
//                stakes line settle last.
//   THE PAPER    only where a dated moment fell: verbatim headlines and one
//                sentence that reads the room.
//   THE TABLE    again, and the round ends here. The finished column stands,
//                the read line and the stakes line have moved, and the bank's
//                interest lands beside your money as its own small moment. The
//                shop does not open itself after a scoring; it is one press
//                away from the read beat.
//   THE SHOP     a screen rather than a drawer. It opens itself at the start of
//                a chapter, payday plays on the first opening of a turn, and
//                one button brings the table back.
//
// Nothing here recomputes game logic. src/lib/tally/run.ts is the only source of
// truth for what a turn does, what a card is worth and what the wall looks like,
// and this page reads its exports and draws them. Income still arrives when the
// model says it does, at the start of a plan; the shop's payday beat is where
// that becomes visible, and the accounting is untouched.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { blocksOf } from "../lib/blocks";
import { CARD_DEFINITION, DebutKey, SAVINGS_ID, blocksPerCard } from "../lib/tally/deck";
import {
  BoxState, Debut, Forensics, FrontPage, ResolveDeltas, RunState, TurnTally,
  advance, beginChapter, buy, buyMany, canBuy, canSell, chapterCardFor, chapterOf, chapterSummary,
  endTurn, headerRail, loadBox, loadRun, markDebutSeen, marketRows, markTourDone, newRun,
  pendingDebuts, resolveDeltas, runReport, saveRun, sell, sellMany, startPoints, tableau,
  targetLine, tourDone, bankRun, turnTally, wallMonths, wallSlotCount, wallBoundarySlots,
  WallSlotColumn,
} from "../lib/tally/run";
import { TallyEvent, TallySchedule, tallySchedule } from "../lib/tally/resolve";
import { assetOf } from "../lib/tally/chapters";
import {
  blockWord, displayName, holdingLine, moveLine, movePct, payMoney, playLabel,
  priceLine, purchaseLine, wholeMoney,
} from "../lib/tally/text";
import {
  armAudio, blockThud, blockTick, eventToll, interestChime, loadMuted, paperSnap,
  paydayChime, setMuted,
} from "../lib/tally/sound";
import Wall from "../components/tally/Wall";
import Shop from "../components/tally/Shop";
import PiggyBubble, {
  DWELL_MS, HOLD_MS, INVITE, Spotlight, TOUR, TourRect, TourWhere, beatAt,
  ensureTutorialAnims,
} from "../components/tally/Tutorial";
import MainMenu from "../components/tally/MainMenu";
import ChapterSelect from "../components/tally/ChapterSelect";
import {
  CardFlip, CardStack, CardFaceProps, StackChip, StackPunch,
  STACK_CHIP, STACK_COLLAR, STACK_MAX_PEEK, STACK_PEEK,
} from "../components/tally/Card";
import { Block } from "../components/tally/Blocks";
import {
  FILL_DEEP, FILL_PANEL, FILL_PLAQUE, GAIN, GOLD, INK, LINE_HARD, PAGE,
  R, SANS, SUB, btn, btnSize, ensureTallyUI, panel, plaque,
} from "../components/tally/ui";
import {
  ChapterCardOverlay, ChapterSummaryOverlay, CollectorsBoxOverlay, DebutOverlay,
  FrontPageOverlay, RunOverOverlay, UnitUpgradeOverlay,
} from "../components/tally/overlays";

// The palette, the frames and the one button language all live in
// src/components/tally/ui.ts, so the board, the shop, the menu and the chapter
// selector cannot drift apart. The green a gaining chip is drawn in is the same
// green the bank's payment lands in, because money arriving is money arriving
// whichever beat it arrives on.

// the board: the window, at sixteen by nine, down to the natural board
const MIN_W = 420;   // the natural board, and the smallest one that works
const MIN_H = 640;
const MARGIN = 14;   // the hairline of paper the board never eats
const RATIO = 16 / 9;
// the width the round five type scale was drawn at, which is therefore the
// width where the multiplier is one and the floor
const BASE_W = 1266;
const UI_MAX = 1.35;
const GAP = 8;

// The resolve is the scoring moment, and its pacing lives in
// src/lib/tally/resolve.ts, which turns the turn's real numbers into a list of
// timed events. This page owns the timers and the state those events set, and
// nothing else here decides how long anything takes.
const MONTH_MS = 160;      // the fallback month step, for a turn with no tally
const BLOCK_MS = 95;       // between two blocks falling on the closing column
const PAYDAY_STEP = 90;
const PAYDAY_TAIL = 340;
// the table and the shop are two views of one body, and this is the swap
const SWAP_MS = 250;

type Beat = "table" | "resolve" | "paper" | "shop";
type Screen = "menu" | "chapters" | "game";

// What a stack's chip says on its own beat. It is the holding's own change to
// the wall in blocks, with the price move that caused it underneath in small
// type, and nothing else: no comparison to a name the player did not buy and no
// verdict. The two numbers are one object because they are one fact, which is
// why the card face no longer flashes a percentage of its own.
function chipOf(blocks: number, count: number, move: number | null): StackChip {
  const note = move === null ? null : movePct(move);
  if (blocks === 0) return { label: "held", note, tone: "flat" };
  if (blocks > 0) return { label: `+${count} ${blockWord(count)}`, note, tone: "gain" };
  return { label: `−${count} ${blockWord(count)}`, note, tone: "loss" };
}

type Flip =
  | { kind: "market"; assetId: string }
  | { kind: "card"; uid: number };

function useViewport(): { w: number; h: number } {
  const [v, setV] = useState(() => ({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return v;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export default function Tally() {
  const view = useViewport();
  const reduced = useReducedMotion();

  // A saved run is read once, and it is only ever adopted: nothing about
  // arriving here writes one. The in memory run is the one a player continues
  // or the one a start replaces, and the save follows the player's decision
  // rather than the page's mount.
  const [boot] = useState(() => {
    const saved = loadRun();
    return { run: saved ?? newRun(1), fresh: !saved };
  });
  const [run, setRun] = useState<RunState>(boot.run);
  const [hasSave, setHasSave] = useState(!boot.fresh);
  const [playing, setPlaying] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [cameFrom, setCameFrom] = useState<Screen>("menu");
  const [offerStarts, setOfferStarts] = useState(false);
  const [box, setBox] = useState<BoxState>(() => loadBox());
  const [realNames, setRealNames] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [muted, setMutedState] = useState(() => loadMuted());

  const [beat, setBeat] = useState<Beat>("table");
  const [paying, setPaying] = useState(false);
  const [paidTurn, setPaidTurn] = useState(-1);
  // the turn whose interest has already been announced, so the moment plays
  // once when the column finishes and never again on the way back from the shop
  const [toldTurn, setToldTurn] = useState(-1);
  const [frontPage, setFrontPage] = useState<FrontPage | null>(null);
  const [ceremonyAck, setCeremonyAck] = useState(-1);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [shakeUid, setShakeUid] = useState<number | null>(null);
  const [report, setReport] = useState<Forensics | null>(null);

  // The tutorial. `tour` is the index the script has reached, or -1 when the
  // piggy is not in this run at all, and it is only ever armed by a run that
  // starts at chapter 1. The board body is measured rather than guessed, so a
  // bubble sits beside the thing it names at any board size, and the same
  // measurement is the window the spotlight cuts.
  const [tour, setTour] = useState(-1);
  const [tourAt, setTourAt] = useState<
    { left: number; top: number; hole: TourRect | null; hostW: number; hostH: number } | null
  >(null);
  // when the sentence on screen arrived, which is what the dwell is measured
  // against
  const tourShown = useRef(0);
  const body = useRef<HTMLDivElement | null>(null);

  // the resolve: the months arriving as backdrop, each stack scoring its own
  // blocks in turn, and the closing column assembling out of those blocks
  const [resolving, setResolving] = useState<
    { key: number; monthStep: number; blockStagger: number } | null
  >(null);
  // The record as it stood when Play was pressed, held for the length of act
  // one. The model has already moved on by then, and a wall that moved with it
  // while the cards were scoring would be the two things at once this pass
  // exists to separate.
  const [stillCols, setStillCols] = useState<WallSlotColumn[] | null>(null);
  const [shown, setShown] = useState(0);
  // the stakes line settles once, after the closing column has finished, so the
  // arithmetic about the goal is the last thing that moves rather than a figure
  // flickering under every landing block
  const [stakesShown, setStakesShown] = useState({ turn: 1, blocks: 0 });
  const [deltas, setDeltas] = useState<ResolveDeltas | null>(null);
  // how many blocks of the turn's closing column are standing so far, or null
  // when there is no tally running and the column is simply itself
  const [assemble, setAssemble] = useState<number | null>(null);
  const [chips, setChips] = useState<Record<string, { blocks: number; count: number }>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  // the hit the stack whose turn it is takes, and which way it went. It is set
  // once per stack per resolve, on the beat the stack's own scoring starts, so
  // the spring plays on the moment and never on each block of the count.
  const [punch, setPunch] = useState<{ id: string; tone: StackPunch["tone"]; key: number } | null>(null);
  const punchSeq = useRef(0);
  const [skipIds, setSkipIds] = useState<string[]>([]);
  const [dim, setDim] = useState(false);
  const [tallying, setTallying] = useState(false);
  const timers = useRef<number[]>([]);
  const pending = useRef<RunState | null>(null);
  const banked = useRef(false);
  const held = useRef("");

  const rail = headerRail(run);
  const ch = chapterOf(run);
  const columns = useMemo(() => wallMonths(run), [run]);
  const slots = useMemo(() => wallSlotCount(run), [run]);
  const boundaries = useMemo(() => wallBoundarySlots(run), [run]);
  const rows = useMemo(() => marketRows(run), [run]);
  const stacks = useMemo(() => tableau(run), [run]);
  const target = targetLine(run);

  const moves = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const row of rows) out[row.asset.id] = row.move;
    return out;
  }, [rows]);

  const flashes = useMemo(() => {
    const out: Record<string, number> = {};
    if (!deltas) return out;
    for (const d of deltas.assets) if (d.held && Math.abs(d.movePct) >= 0.0005) out[d.assetId] = d.movePct;
    return out;
  }, [deltas]);

  // ---------------------------------------------------------- persistence

  // The run is written from the moment the player is in one, and never before.
  useEffect(() => {
    if (!playing) return;
    if (run.phase === "over" || run.phase === "won") return;
    saveRun(run);
  }, [run, playing]);

  useEffect(() => {
    if (run.phase !== "over" && run.phase !== "won") return;
    if (banked.current) return;
    banked.current = true;
    const next = bankRun(run, loadBox());
    setBox(next);
    setReport(runReport(run, next));
    // bankRun clears the save, and a run that is over is not one to continue
    setHasSave(false);
  }, [run.phase]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // ---------------------------------------------------------- the shop

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  // Payday: the income the model already credited at the start of this plan,
  // slid into your money before anything can be spent.
  const openShop = useCallback((next: RunState, withPayday: boolean) => {
    setBeat("shop");
    if (!withPayday || next.turn === paidTurn) {
      setPaying(false);
      return;
    }
    setPaidTurn(next.turn);
    const income = chapterOf(next).incomeBlocks;
    if (reduced || income <= 0) {
      setPaying(false);
      return;
    }
    setPaying(true);
    paydayChime();
    const ms = PAYDAY_TAIL + (income - 1) * PAYDAY_STEP;
    timers.current.push(window.setTimeout(() => setPaying(false), ms));
  }, [paidTurn, reduced]);

  // The bank's payment, announced once, after the column has finished standing
  // up. The money is already in the model, credited by endTurn on the savings
  // that were on deposit through the turn, so this is a moment and never a
  // transaction: nothing is tapped and nothing is decided.
  const tellInterest = useCallback((next: RunState) => {
    if (next.interest <= 0 || next.turn === toldTurn) return;
    setToldTurn(next.turn);
    if (reduced) return;
    timers.current.push(window.setTimeout(interestChime, 220));
  }, [reduced, toldTurn]);

  // Everything the tally put on screen comes off here, and the rail lands on
  // the model's own number rather than on wherever the counting had got to, so
  // a tap in the middle of a resolve is the exact end state and never an
  // approximation of it.
  const settle = useCallback((next: RunState) => {
    clearTimers();
    pending.current = null;
    setResolving(null);
    setStillCols(null);
    setAssemble(null);
    setChips({});
    setActiveId(null);
    setPunch(null);
    setSkipIds([]);
    setDim(false);
    setTallying(false);
    setShown(headerRail(next).blocks);
    setStakesShown({ turn: headerRail(next).turn, blocks: headerRail(next).blocks });
    if (next.frontPage) {
      setFrontPage(next.frontPage);
      setBeat("paper");
      paperSnap();
      return;
    }
    // The round ends at the table, with the finished column standing and the
    // read line and the stakes line already moved. The shop is a place a player
    // decides to go to.
    setBeat("table");
    tellInterest(next);
  }, [clearTimers, tellInterest]);

  // One event of the tally, applied. Every one of these is a presentation of a
  // number the model already committed: nothing here decides anything.
  const applyEvent = useCallback(
    (ev: TallyEvent, next: RunState, tally: TurnTally, sched: TallySchedule) => {
      switch (ev.kind) {
        // act one: the wall goes down a shade and stops moving, and a turn
        // carrying a front page opens on a beat of nothing at all
        case "still":
          setDim(true);
          if (sched.heavy) eventToll();
          break;
        // act two: the cards are done and still, and the wall comes back up
        case "sweep":
          setDim(false);
          setStillCols(null);
          setActiveId(null);
          setPunch(null);
          break;
        case "focus":
          setActiveId(ev.assetId);
          // the punch, and its direction: a gain springs up off the table, a
          // loss drops into it first, and a holding that held its price gets
          // the smallest nod of the three
          punchSeq.current += 1;
          setPunch({
            id: ev.assetId,
            tone: ev.blocks > 0 ? "gain" : ev.blocks < 0 ? "loss" : "flat",
            key: punchSeq.current,
          });
          break;
        // the chip, whole: the blocks this holding moved and the move that did
        // it, on one object, on the beat the card takes its hit
        case "chip":
          setChips((c) => ({ ...c, [ev.assetId]: { blocks: ev.blocks, count: ev.count } }));
          if (ev.sound === "tick") blockTick(ev.count, Math.max(1, ev.of));
          if (ev.sound === "thud") {
            blockThud(ev.count, Math.max(1, ev.of), {
              weight: sched.crash ? 1.7 : sched.heavy ? 1.35 : 1,
            });
          }
          break;
        case "band":
          setAssemble(ev.specs);
          break;
        // the count, ticking with the blocks that are landing on the column
        case "rail":
          setShown(ev.value);
          if (ev.sound === "tick") blockTick(ev.count, Math.max(1, ev.of));
          if (ev.sound === "thud") {
            blockThud(ev.count, Math.max(1, ev.of), {
              weight: sched.crash ? 1.7 : sched.heavy ? 1.35 : 1,
            });
          }
          break;
        case "settle":
          setStakesShown({ turn: headerRail(next).turn, blocks: headerRail(next).blocks });
          break;
        case "cash":
          setAssemble(ev.specs);
          setShown(ev.rail);
          setActiveId(null);
          setPunch(null);
          if (ev.sound) blockTick(1, 4, { pitch: 0.62, gain: 0.5 });
          break;
        case "rest": {
          // reduced motion: the end state at once, and the chips at rest on it
          const at: Record<string, { blocks: number; count: number }> = {};
          for (const h of tally.holdings) {
            if (h.wasStone && !h.stonedNow) continue;
            at[h.assetId] = { blocks: h.blocks, count: Math.abs(h.blocks) };
          }
          setChips(at);
          setAssemble(null);
          setShown(headerRail(next).blocks);
          setStakesShown({ turn: headerRail(next).turn, blocks: headerRail(next).blocks });
          break;
        }
        case "end":
          settle(next);
          break;
      }
    },
    [settle],
  );

  // The turn, played. The beat this is pressed from is the caller's business:
  // the table's own key plays from the table, and the shop's key closes the shop
  // and plays from there, because a player who is done shopping is done.
  const playTurn = useCallback(() => {
    if (run.phase !== "plan") return;
    const before = rail.blocks;
    const next = endTurn(run);
    const after = headerRail(next).blocks;
    const d = resolveDeltas(next);
    const tally = turnTally(next);
    setRun(next);
    setDeltas(d);
    setFlip(null);

    // The turn's own numbers, handed to the pacing. The months inside the span
    // are backdrop; the column that closes the turn is the one the stacks build.
    const months = Math.max(
      0,
      wallMonths(next).reduce((n, c) => n + (c.turn === next.turn ? 1 : 0), 0) - 1,
    );
    const sched = tallySchedule({
      holdings: tally.holdings.map((h) => ({
        assetId: h.assetId,
        blocks: h.blocks,
        bandBlocks: h.blocksTo,
        // a name that was already a stone moved nothing and is skipped with no
        // chip; a name that turned to stone on this very turn is the loss it is
        skip: h.wasStone && !h.stonedNow,
      })),
      cashBandBlocks: tally.cashBandBlocks,
      cashBlocks: tally.cashBlocks,
      railFrom: before,
      railTo: after,
      heavy: !!next.frontPage,
      months,
      reduced,
    });

    pending.current = next;
    setBeat("resolve");
    setTallying(true);
    setChips({});
    setActiveId(null);
    setPunch(null);
    setDim(!reduced);
    setStillCols(reduced ? null : columns);
    setAssemble(reduced ? null : 0);
    setSkipIds(tally.holdings.filter((h) => h.wasStone && !h.stonedNow).map((h) => h.assetId));
    setShown(before);
    setStakesShown({ turn: rail.turn, blocks: before });
    setResolving({
      key: next.turn,
      monthStep: sched.monthStep,
      blockStagger: BLOCK_MS,
    });
    for (const ev of sched.events) {
      timers.current.push(
        window.setTimeout(() => applyEvent(ev, next, tally, sched), Math.max(0, ev.at)),
      );
    }
  }, [run, rail.blocks, reduced, applyEvent]);

  const onPlay = useCallback(() => {
    if (beat !== "table") return;
    playTurn();
  }, [beat, playTurn]);

  // The shop's own key. It is the table's key in every respect but where it is
  // pressed: the counter closes and the turn plays, with nothing in between.
  const onShopPlay = useCallback(() => {
    if (beat !== "shop" || paying) return;
    setBeat("table");
    playTurn();
  }, [beat, paying, playTurn]);

  const onSkip = useCallback(() => {
    if (pending.current) settle(pending.current);
  }, [settle]);

  // ---------------------------------------------------------- the moves

  // Money only moves through a labelled button, and it says so out loud: the
  // shop flies the cost's blocks across the counter and ticks once per block on
  // the way, so the sound of a move belongs to the move's own animation and is
  // counted there rather than fired twice from here.
  const doBuy = useCallback((assetId: string) => {
    if (!canBuy(run, assetId)) return;
    setRun(buy(run, assetId));
  }, [run]);

  // The same purchase n times over. The model mints every card on its own, so
  // the log carries n entries and the wall replay, the badges and the report
  // see exactly what happened; only the flight over the counter is batched.
  const doBuyMany = useCallback((assetId: string, n: number) => {
    if (!canBuy(run, assetId)) return;
    setRun(buyMany(run, assetId, n));
  }, [run]);

  const doSell = useCallback((uid: number) => {
    if (!canSell(run, uid)) {
      setShakeUid(uid);
      window.setTimeout(() => setShakeUid((v) => (v === uid ? null : v)), 380);
      return;
    }
    setRun(sell(run, uid));
  }, [run]);

  const doSellMany = useCallback((uids: number[]) => {
    setRun(sellMany(run, uids));
  }, [run]);

  // ---------------------------------------------------------- the phases

  // Everything the last turn put on screen, cleared. A new chapter, a new run
  // and the way back from a summary all land in the same place.
  const resetBeats = useCallback(() => {
    setFrontPage(null);
    setDeltas(null);
    setChips({});
    setSkipIds([]);
    setActiveId(null);
    setPunch(null);
    setAssemble(null);
    setStillCols(null);
    setTallying(false);
    setDim(false);
    setPaidTurn(-1);
    setToldTurn(-1);
    setFlip(null);
    setBeat("table");
  }, []);

  const onBegin = () => {
    const next = beginChapter(run);
    setRun(next);
    setOfferStarts(false);
    resetBeats();
    setShown(headerRail(next).blocks);
    setStakesShown({ turn: headerRail(next).turn, blocks: headerRail(next).blocks });
    openShop(next, true);
  };

  const onPaperContinue = () => {
    setFrontPage(null);
    setBeat("table");
    tellInterest(run);
  };

  const onSummaryContinue = () => {
    const next = advance(run);
    setRun(next);
    resetBeats();
    setShown(headerRail(next).blocks);
    setStakesShown({ turn: headerRail(next).turn, blocks: headerRail(next).blocks });
  };

  // A run begins here and nowhere else: this is the only place that writes a
  // fresh run to storage, and it is always a decision the player made.
  // `replay` is the Tutorial button, which is the one door that ignores the
  // flag: every other way into chapter 1 shows the piggy exactly once, ever.
  const startRun = useCallback((startChapter: number, offer: boolean, replay = false) => {
    clearTimers();
    const next = newRun(startChapter);
    banked.current = false;
    setTour(startChapter === 1 && (replay || !tourDone()) ? 0 : -1);
    setTourAt(null);
    setReport(null);
    setRun(next);
    saveRun(next);
    setPlaying(true);
    setHasSave(true);
    setCeremonyAck(-1);
    setOfferStarts(offer);
    setBoxOpen(false);
    resetBeats();
    setShown(headerRail(next).blocks);
    setStakesShown({ turn: headerRail(next).turn, blocks: headerRail(next).blocks });
    setScreen("game");
  }, [clearTimers, resetBeats]);

  const onNewRun = (startChapter: number) => startRun(startChapter, false);

  // ---------------------------------------------------------- the debut

  // A card type meeting the player for the first time pauses the shop once, and
  // the run remembers, so a refresh cannot make it happen twice.
  const debut: Debut | null = useMemo(() => {
    if (beat !== "shop" || paying || run.phase !== "plan") return null;
    return pendingDebuts(run)[0] ?? null;
  }, [beat, paying, run]);

  const onDebutSeen = (key: DebutKey) => setRun((r) => markDebutSeen(r, key));

  // ---------------------------------------------------------- the board

  // The board is the window at sixteen by nine, and the type grows with it up
  // to a cap, so a big screen is a bigger cabinet rather than the same cabinet
  // adrift on more paper. A window too small for the natural board gets the
  // natural board scaled down whole.
  const roomW = view.w - MARGIN;
  const roomH = view.h - MARGIN;
  const tiny = roomW < MIN_W || roomH < MIN_H;
  const boardH = tiny ? MIN_H : roomH;
  const boardW = tiny ? MIN_W : Math.min(roomW, boardH * RATIO);
  const boardScale = tiny ? Math.min(1, (view.w - 8) / MIN_W, (view.h - 8) / MIN_H) : 1;
  const ui = tiny ? 1 : Math.min(UI_MAX, Math.max(1, boardW / BASE_W));
  // the type scale, whose floor is the round five scale
  const fz = (n: number) => Math.round(n * ui * 2) / 2;
  const px = (n: number) => Math.round(n * ui);

  const pad = px(16);
  const gap = px(GAP);
  const stripH = px(36);
  const headH = px(58);
  const footH = px(48);

  const innerW = boardW - pad * 2;
  const bodyH = boardH - pad * 2 - stripH - gap;
  // the tray the stacks stand in, and the room left inside its own frame
  const tableH = Math.max(112, Math.min(px(168), Math.round(boardH * 0.225)));
  const trayPad = px(7);
  const trayInner = tableH - trayPad * 2 - 3;
  const stageH = Math.max(180, bodyH - headH - footH - tableH - gap * 3);

  const stackW = Math.max(
    72,
    Math.min(px(96), Math.floor((innerW - px(20) - px(14) * Math.max(0, stacks.length - 1)) / Math.max(1, stacks.length))),
  );
  // the stack box reserves a strip over the card for the tally chip and a strip
  // under it for the collar, and it is the same height whatever it holds, so
  // buying a fifth card of a name never moves the row. The tray it stands in is
  // a framed panel now, so the card takes what the frame and the padding left.
  const stackChrome = STACK_CHIP + STACK_MAX_PEEK * STACK_PEEK + STACK_COLLAR;
  const stackH = Math.max(64, Math.min(px(108), trayInner - stackChrome));

  // ---------------------------------------------------------- the tutorial

  // Where the game is, in the three terms the script asks about. The piggy is
  // only ever in chapter 1, and it never speaks over a card, a debut or the
  // collector's box, because one thing talks at a time.
  const where: TourWhere = { phase: run.phase, beat, turn: run.turn };
  const teaching = tour >= 0 && screen === "game" && ch.id === 1 && !boxOpen && !flip && !debut;
  const tourIndex = teaching ? beatAt(tour, where) : -1;
  const tourBeat = tourIndex >= 0 ? TOUR[tourIndex] : null;

  // The script only ever moves forward: a beat whose screen has been left
  // behind is a beat that has been had.
  useEffect(() => {
    if (tourIndex > tour) { setTour(tourIndex); setTourAt(null); }
  }, [tourIndex, tour]);

  const endTour = useCallback(() => {
    markTourDone();
    setTour(-1);
    setTourAt(null);
  }, []);

  // The clock the dwell is read off. It starts again on every sentence, and a
  // sentence the board had to take away and give back is a sentence being read
  // for the first time.
  useEffect(() => { tourShown.current = Date.now(); }, [tourBeat?.id]);

  // A tap anywhere on the board moves the script on, and it never eats the
  // press: the tap that begins a chapter is also the tap that finishes the
  // sentence about the chapter card. Three things can stop it. The skip is
  // exempt from all of them, because a press that dismissed the bubble it was
  // aimed at would never reach its own button.
  //
  //   the dwell   a sentence that has been up for less than the length of its
  //               own fade has not been read, so the tap that would have spent
  //               it does nothing at all
  //   the hold    payday stands until the blocks have landed
  //   the action  the Play beat is finished by the Play key and by nothing
  //               else, and that press plays the week as well
  const onTourTap = useCallback((e: React.PointerEvent) => {
    if (tourIndex < 0) return;
    const beatNow = TOUR[tourIndex];
    const t = e.target as Element | null;
    if (t && t.closest('[data-tutorial-skip="1"]')) return;
    const up = Date.now() - tourShown.current;
    if (beatNow.gate === "action") {
      const act = beatNow.act ?? beatNow.anchor;
      if (!act || !t || !t.closest(act)) return;
    } else if (beatNow.gate === "hold") {
      if (paying || up < HOLD_MS) return;
    } else if (up < DWELL_MS) {
      return;
    }
    if (tourIndex >= TOUR.length - 1) { endTour(); return; }
    setTour(tourIndex + 1);
    setTourAt(null);
  }, [tourIndex, endTour, paying]);

  // the key the script is waiting on, if the script is waiting on one
  const inviting = !!tourBeat && !!tourAt && tourBeat.gate === "action"
    && (tourBeat.act ?? tourBeat.anchor) === '[data-play="1"]';

  const piggyW = px(56);
  const bubbleW = Math.max(150, Math.min(px(300), innerW - piggyW - px(64)));
  const groupW = piggyW + px(6) + bubbleW;

  // The bubble is placed off the real element it names, measured rather than
  // guessed, and clamped so nothing the tutorial draws can hang off the board.
  // It measures again a beat later because the table and the shop cross fade,
  // and a rectangle read mid fade is a rectangle from the wrong screen.
  useLayoutEffect(() => {
    if (!tourBeat) return;
    const place = () => {
      const host = body.current;
      if (!host) return;
      const hr = host.getBoundingClientRect();
      if (!tourBeat.anchor) {
        // a beat about the whole screen dims nothing, because there is nothing
        // on the board it could be pointing at
        setTourAt({ left: px(10), top: hr.height - px(12), hole: null, hostW: hr.width, hostH: hr.height });
        return;
      }
      const el = host.querySelector(tourBeat.anchor);
      if (!el) { setTourAt(null); return; }
      const r = el.getBoundingClientRect();
      const along = r.left - hr.left + r.width * (tourBeat.atX ?? 0);
      const left = Math.max(px(8), Math.min(Math.max(px(8), hr.width - groupW - px(8)), along));
      const top = tourBeat.place === "over"
        ? r.top - hr.top - px(10)
        : Math.max(px(6), r.bottom - hr.top + px(10));
      setTourAt({
        left,
        top,
        // A beat that names a thing for the first time takes the board's light
        // down to point at it. The beats that simply stand with the player,
        // week after week of the same chapter, leave the board alone: the key
        // they wait on is still wearing its own invitation.
        hole: tourBeat.lit === false
          ? null
          : { x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height },
        hostW: hr.width,
        hostH: hr.height,
      });
    };
    place();
    const a = window.setTimeout(place, 80);
    const b = window.setTimeout(place, 340);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [tourBeat, groupW, boardW, boardH, ui, paying, run.turn, beat]);

  // one button is live at a time, and only on the beat that owns it
  const canPlay = run.phase === "plan" && beat === "table" && !boxOpen && !flip;
  const canTrade = run.phase === "plan" && beat === "shop" && !paying;
  const shopOpen = beat === "shop";

  const countBlocks = beat === "resolve" ? shown : rail.blocks;
  const readLine = beat === "resolve" ? held.current : rail.read;
  if (beat !== "resolve") held.current = rail.read;
  const nowLabel = columns.length ? columns[columns.length - 1].label : "";
  const nextMark = ch.marks[Math.min(run.turn + 1, ch.marks.length - 1)] ?? "";

  // ---------------------------------------------------------- the overlays

  const showCeremony = run.phase === "chapter" && !!run.ceremony && ceremonyAck !== run.at;
  const midBeat = beat === "resolve" || beat === "paper";

  let overlay: JSX.Element | null = null;
  if (midBeat) {
    overlay = null;
  } else if (run.phase === "over" || run.phase === "won") {
    if (report) overlay = <RunOverOverlay report={report} won={run.phase === "won"} onNewRun={onNewRun} />;
  } else if (showCeremony && run.ceremony) {
    overlay = <UnitUpgradeOverlay ceremony={run.ceremony} onContinue={() => setCeremonyAck(run.at)} />;
  } else if (run.phase === "chapter") {
    overlay = (
      <ChapterCardOverlay
        card={chapterCardFor(run)}
        onBegin={onBegin}
        starts={offerStarts && run.at === 0 ? startPoints(box) : []}
        onStart={onNewRun}
      />
    );
  } else if (run.phase === "summary") {
    overlay = <ChapterSummaryOverlay summary={chapterSummary(run)} onContinue={onSummaryContinue} />;
  }

  // ---------------------------------------------------------- the flip

  const flipFace = ((): { face: CardFaceProps; lines: string[] } | null => {
    if (!flip) return null;
    if (flip.kind === "market") {
      const row = rows.find((r) => r.asset.id === flip.assetId);
      if (!row) return null;
      const lines = [
        holdingLine(row.asset, row.sharesPerPurchase, false),
        moveLine(row.move),
        CARD_DEFINITION[row.asset.suit],
      ];
      if (row.reconstructed) lines.push("This price series is reconstructed from the dated record.");
      else if (row.illustrative) lines.push("This rate is illustrative, not a market price.");
      return {
        face: {
          name: displayName(row.asset, realNames),
          suit: row.asset.suit,
          sector: row.asset.sector,
          worthBlocks: row.costBlocks,
          blockColor: row.asset.color,
          priceLabel: priceLine(row.asset, row.price, row.ratePerYear),
          dotted: row.reconstructed || row.illustrative,
        },
        lines,
      };
    }
    for (const st of stacks) {
      const entry = st.cards.find((c) => c.card.uid === flip.uid);
      if (!entry) continue;
      // The top card of a stack is the one that sells, so its back says which
      // purchase it is: its own turn, its own price, its own shares. That one
      // sentence is what makes two sells out of one stack hand back two
      // different figures with no price having moved.
      const lines = [
        ...(st.stone
          ? ["This card is worth nothing and it cannot be sold."]
          : st.asset.id === SAVINGS_ID
            ? [holdingLine(st.asset, entry.card.shares, true), purchaseLine(st.asset, entry.card, ch.id)]
            : [purchaseLine(st.asset, entry.card, ch.id)]),
        st.stone ? "Its price reached zero, and it stays on your table for the rest of the run." : moveLine(moves[st.asset.id] ?? null),
        CARD_DEFINITION[st.stone ? "stone" : st.asset.suit],
      ];
      if (st.asset.reconstructed) lines.push("This price series is reconstructed from the dated record.");
      else if (st.illustrative) lines.push("This rate is illustrative, not a market price.");
      return {
        face: {
          name: displayName(st.asset, realNames),
          suit: st.asset.suit,
          sector: st.asset.sector,
          worthBlocks: entry.blocks,
          blockColor: st.asset.color,
          priceLabel: st.stone ? "no price" : priceLine(st.asset, st.price, st.ratePerYear),
          stone: st.stone,
          dotted: st.asset.reconstructed || st.illustrative,
        },
        lines,
      };
    }
    return null;
  })();

  // ---------------------------------------------------------- the screens

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const savedLine = hasSave
    ? `chapter ${rail.chapterId}, turn ${rail.turn} of ${rail.turns}`
    : null;

  // The collector's box, drawn wherever it was opened from. In the game it sits
  // inside the board body, under the strip, so the strip is never trapped.
  const boxLayer = (
    <div
      onPointerDown={(e) => { if (e.target === e.currentTarget) setBoxOpen(false); }}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: R.panel,
        background: "rgba(250,249,247,0.94)",
        zIndex: 55,
        overflow: "hidden",
        padding: 6,
        boxSizing: "border-box",
      }}
    >
      <CollectorsBoxOverlay box={box} onClose={() => setBoxOpen(false)} />
    </div>
  );

  // Every button on the board wears the one face defined in ui.ts; the only
  // thing this page decides is which face and how big.
  const stripButton: React.CSSProperties = {
    ...btnSize(ui, "sm"),
    borderRadius: R.chip,
    flex: "none",
  };

  // The foot bar's two keys. They carry different type and different faces, and
  // they are one height on one row, because two buttons side by side at two
  // heights read as a mistake however loud one of them is meant to be.
  const footKeyH = px(38);
  const footKey: React.CSSProperties = {
    flex: "none",
    height: footKeyH,
    paddingTop: 0,
    paddingBottom: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // A fact in a frame: the small plaques along the header, each one a label and
  // a figure, so a number reads as a reading and not as a word.
  const StatChip = ({ label, value, gold }: { label: string; value: string; gold?: boolean }) => (
    <span
      style={{
        ...(gold ? { ...plaque(R.chip), borderColor: "rgba(181,122,0,0.45)" } : plaque(R.chip)),
        display: "inline-flex",
        alignItems: "baseline",
        gap: px(5),
        padding: `${px(3)}px ${px(8)}px`,
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      <span style={{ fontSize: fz(11.5), fontWeight: 650, color: SUB }}>{label}</span>
      <span
        style={{
          fontSize: fz(13.5),
          fontWeight: 780,
          color: gold ? GOLD : INK,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
    </span>
  );

  // ---------------------------------------------------------- the render

  ensureTallyUI();
  // the tutorial's own chrome, which the Play key wears before the bubble that
  // asks for it has drawn itself
  ensureTutorialAnims();

  return (
    <div
      onPointerDownCapture={armAudio}
      style={{
        position: "fixed",
        inset: 0,
        // the table the cabinet stands on: the same warm paper, one step deeper,
        // so the board has an edge rather than bleeding into the window
        background: "#EFECE4",
        color: INK,
        fontFamily: SANS,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        touchAction: "manipulation",
      }}
    >
      <div
        data-board="tally"
        data-app-screen={screen}
        style={{
          position: "relative",
          width: boardW,
          height: boardH,
          transform: boardScale === 1 ? undefined : `scale(${boardScale})`,
          transformOrigin: "center",
          background: PAGE,
          border: `2px solid ${LINE_HARD}`,
          borderRadius: R.board,
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.9), 0 12px 34px rgba(46,38,24,0.14)",
          padding: pad,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap,
        }}
      >
        {screen === "menu" && (
          <MainMenu
            ui={ui}
            hasSave={hasSave}
            savedLine={savedLine}
            muted={muted}
            onContinue={() => { setPlaying(true); setScreen("game"); }}
            onNewRun={() => startRun(1, true)}
            onChapters={() => { setCameFrom("menu"); setScreen("chapters"); }}
            onCollection={() => setBoxOpen(true)}
            onTutorial={() => startRun(1, false, true)}
            onToggleSound={toggleSound}
          />
        )}

        {screen === "chapters" && (
          <ChapterSelect
            ui={ui}
            box={box}
            liveRun={hasSave}
            onPick={(id) => startRun(id, false)}
            onBack={() => setScreen(cameFrom === "game" ? "game" : "menu")}
          />
        )}

        {screen === "game" && (
          <>
            {/* the strip: quiet, findable, and always on top of the body, so an
                overlay can never trap the player inside a chapter card */}
            <div
              data-strip="1"
              style={{
                ...panel({ fill: FILL_PANEL, radius: R.panel }),
                height: stripH,
                flex: "none",
                display: "flex",
                alignItems: "center",
                gap: px(3),
                padding: `0 ${px(6)}px`,
              }}
            >
              <button
                type="button"
                data-strip-menu="1"
                className={btn("ghost")}
                onClick={() => { setBoxOpen(false); setScreen("menu"); }}
                style={{ ...stripButton, fontWeight: 750 }}
              >
                Menu
              </button>
              <button
                type="button"
                data-strip-chapters="1"
                className={btn("ghost")}
                onClick={() => { setBoxOpen(false); setCameFrom("game"); setScreen("chapters"); }}
                style={stripButton}
              >
                Chapters
              </button>
              <span style={{ flex: "1 1 auto" }} />
              <button
                type="button"
                data-mute={muted ? "on" : "off"}
                aria-pressed={!muted}
                className={btn("ghost")}
                onClick={toggleSound}
                style={stripButton}
              >
                {muted ? "Sound off" : "Sound on"}
              </button>
              <button
                type="button"
                onClick={() => setRealNames((v) => !v)}
                aria-pressed={realNames}
                className={btn("ghost")}
                style={stripButton}
              >
                Real names
              </button>
              <button
                type="button"
                data-collection="1"
                className={btn("ghost")}
                onClick={() => setBoxOpen((v) => !v)}
                style={stripButton}
              >
                Collection
              </button>
            </div>

            {/* the body: one positioned box holding the table, the shop and
                every overlay, so all three start under the strip */}
            <div
              data-body="1"
              ref={body}
              // the tutorial listens here and never swallows anything: the
              // press that moves the script on is the press the board was
              // going to get anyway
              onPointerDownCapture={tourIndex >= 0 ? onTourTap : undefined}
              style={{ position: "relative", flex: "1 1 auto", minHeight: 0 }}
            >
              {/* the table view */}
              <div
                data-view="table"
                aria-hidden={shopOpen}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap,
                  opacity: shopOpen ? 0 : 1,
                  transform: shopOpen && !reduced ? "translateY(-6px)" : "none",
                  // the view that is not on top goes properly away at the end of
                  // the swap, so nothing invisible is ever clickable or tabbable
                  visibility: shopOpen ? "hidden" : "visible",
                  transition: reduced
                    ? undefined
                    : `opacity ${SWAP_MS}ms ease, transform ${SWAP_MS}ms ease, visibility ${SWAP_MS}ms`,
                  pointerEvents: shopOpen ? "none" : "auto",
                }}
              >
                {/* The header: the chapter's own plaque and the three figures
                    that never move inside a chapter, each in a frame of its own,
                    with the read line under them on its own row. */}
                <header
                  style={{
                    ...panel({ fill: FILL_PLAQUE, radius: R.panel }),
                    height: headH,
                    flex: "none",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: px(4),
                    padding: `0 ${px(10)}px`,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", gap: px(7), alignItems: "center", minWidth: 0 }}>
                    <b
                      style={{
                        color: INK,
                        fontWeight: 800,
                        fontSize: fz(14),
                        letterSpacing: "-0.015em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        paddingRight: px(3),
                      }}
                    >
                      Chapter {rail.chapterId} &middot; {rail.chapterName}
                    </b>
                    <StatChip label="turn" value={`${rail.turn} of ${rail.turns}`} />
                    <StatChip label="target" value={`$${rail.target.toLocaleString("en-US")}`} gold />
                    <StatChip label="block" value={`$${rail.denom.toLocaleString("en-US")}`} />
                  </div>
                  {/* the read line owns its whole row; a line the player has to
                      finish through an ellipsis is a line that was never read */}
                  <div
                    data-read-line="1"
                    style={{
                      fontSize: fz(15),
                      fontWeight: 650,
                      color: INK,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={readLine}
                  >
                    {readLine || "The wall is the record of what your money is worth."}
                  </div>
                </header>

                {/* the wall */}
                <Wall
                  // Act one is the wall the player pressed Play on: the record
                  // as it stood, dimmed and still. The months this turn added
                  // arrive on act two and not one frame before it.
                  columns={beat === "resolve" && dim && stillCols ? stillCols : columns}
                  slots={slots}
                  boundarySlots={boundaries}
                  marks={ch.marks}
                  yearsPerTurn={ch.yearsPerTurn}
                  target={target}
                  countBlocks={countBlocks}
                  stakesBlocks={beat === "resolve" ? stakesShown.blocks : rail.blocks}
                  stakesTurn={beat === "resolve" ? stakesShown.turn : rail.turn}
                  countDollars={beat === "resolve" ? null : rail.worth}
                  nowLabel={nowLabel}
                  turn={rail.turn}
                  turns={rail.turns}
                  resolving={beat === "resolve"}
                  resolveKey={resolving?.key ?? 0}
                  monthStep={resolving?.monthStep ?? MONTH_MS}
                  blockStagger={resolving?.blockStagger ?? BLOCK_MS}
                  act={beat === "resolve" ? (dim ? "cards" : "wall") : "none"}
                  assemble={beat === "resolve" ? assemble : null}
                  height={stageH}
                  width={innerW}
                  ui={ui}
                  onSkip={onSkip}
                />

                {/* Your stacks, in the tray they stand in. The tray is a framed
                    panel a step deeper than the board, so an empty table is a
                    table with nothing on it rather than a gap in the page. */}
                <div
                  className="tally-scroll"
                  data-tray="1"
                  style={{
                    ...panel({ fill: FILL_DEEP, radius: R.panel, inset: true }),
                    height: tableH,
                    flex: "none",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: px(14),
                    overflowX: "auto",
                    overflowY: "hidden",
                    // the collars are allowed the gutter, so the row gives them one
                    // at both ends rather than clipping the last one
                    padding: `${trayPad}px ${px(10)}px`,
                  }}
                >
                  {stacks.length === 0 && (
                    <span
                      style={{
                        fontSize: fz(13),
                        color: SUB,
                        fontWeight: 600,
                        alignSelf: "center",
                        lineHeight: 1.5,
                        margin: "0 auto",
                        textAlign: "center",
                      }}
                    >
                      You own no cards yet, and every block you have is still your own money.
                    </span>
                  )}
                  {stacks.map((st) => {
                    const front = st.cards[st.cards.length - 1];
                    const chip = chips[st.asset.id];
                    const scoring = tallying && !skipIds.includes(st.asset.id);
                    return (
                      <CardStack
                        key={st.asset.id}
                        cards={st.cards.length}
                        collar={`${st.cards.length} ${st.cards.length === 1 ? "card" : "cards"} · ${st.totalBlocks} ${blockWord(st.totalBlocks)}`}
                        name={displayName(st.asset, realNames)}
                        suit={st.asset.suit}
                        sector={st.asset.sector}
                        worthBlocks={front.blocks}
                        blockColor={st.asset.color}
                        priceLabel={st.stone ? "no price" : priceLine(st.asset, st.price, st.ratePerYear)}
                        stone={st.stone}
                        dotted={st.asset.reconstructed || st.illustrative}
                        width={stackW}
                        height={stackH}
                        chipZone
                        chip={chip ? chipOf(chip.blocks, chip.count, flashes[st.asset.id] ?? null) : null}
                        active={activeId === st.asset.id}
                        waiting={scoring && !chip && activeId !== st.asset.id}
                        // the hit this stack takes on the beat its own scoring
                        // starts, which is the cause the wall's band is the
                        // effect of
                        punch={punch && punch.id === st.asset.id ? { tone: punch.tone, key: punch.key } : null}
                        shake={shakeUid === front.card.uid}
                        onTap={() => setFlip({ kind: "card", uid: front.card.uid })}
                      />
                    );
                  })}
                </div>

                {/* your money, the shop, and the one button, on the one bar */}
                <div
                  style={{
                    ...panel({ fill: FILL_PANEL, radius: R.panel }),
                    height: footH,
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: px(9),
                    padding: `0 ${px(9)}px`,
                  }}
                >
                  <div
                    data-money-row="1"
                    style={{
                      ...plaque(R.chip),
                      flex: "0 1 auto",
                      marginRight: "auto",
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: px(7),
                      padding: `${px(4)}px ${px(10)}px`,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ fontSize: fz(11.5), fontWeight: 650, color: SUB, flex: "none" }}>Your money</span>
                    <span
                      style={{
                        fontSize: fz(16),
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        fontVariantNumeric: "tabular-nums",
                        flex: "none",
                      }}
                    >
                      {wholeMoney(run.cash)}
                    </span>
                    {/* A row of blocks is read along its length, so it runs on one
                        uniform gap; counting in fives is the column's rule. The
                        natural 420 board has no width to spare here and drops the
                        strip whole rather than showing a clipped one, because the
                        figure beside it is the same fact. */}
                    {!tiny && (
                      <span style={{ display: "flex", alignItems: "flex-end", gap: 2, overflow: "hidden" }}>
                        {Array.from({ length: Math.min(6, blocksOf(run.cash, run.denom)) }, (_, i) => (
                          <span key={i} style={{ lineHeight: 0, flex: "none" }}>
                            <Block size={px(10)} cash />
                          </span>
                        ))}
                      </span>
                    )}
                    {/* The bank's payment, beside the money it went into, as its own
                        small moment after the column has finished standing up. It is
                        already spent or saved by the model; this only says so. */}
                    {beat === "table" && run.interest > 0 && (
                      <span
                        key={run.turn}
                        data-interest={payMoney(run.interest)}
                        style={{
                          fontSize: fz(12.5),
                          fontWeight: 700,
                          color: GAIN,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.01em",
                          flex: "none",
                          marginLeft: 3,
                          animation: reduced ? undefined : "tally-payday-in 320ms cubic-bezier(.2,.8,.3,1) both",
                        }}
                      >
                        Savings paid {payMoney(run.interest)}.
                      </span>
                    )}
                  </div>
                  {/* The two keys stand on one baseline row and are the same
                      height: the Play key is louder because of its face and its
                      type, and never because it is a taller object than the
                      button beside it. */}
                  <button
                    type="button"
                    data-shop-open="1"
                    disabled={!canPlay}
                    className={btn("plain")}
                    onClick={() => openShop(run, true)}
                    style={{ ...btnSize(ui, "md"), ...footKey }}
                  >
                    Shop &middot; {rows.length} {rows.length === 1 ? "card" : "cards"}
                  </button>
                  <button
                    type="button"
                    data-play="1"
                    data-invite={inviting ? "1" : undefined}
                    disabled={!canPlay}
                    // the one beat that waits for a press says so in the key
                    // rather than in the sentence
                    className={btn("ink", inviting ? INVITE : undefined)}
                    onClick={onPlay}
                    style={{ ...btnSize(ui, "lg"), ...footKey }}
                  >
                    {playLabel(nextMark)}
                  </button>
                </div>
              </div>

              {/* the shop view, the other half of the same body */}
              <div
                data-view="shop"
                style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  borderRadius: R.panel,
                  opacity: shopOpen ? 1 : 0,
                  transform: !shopOpen && !reduced ? "translateY(6px)" : "none",
                  visibility: shopOpen ? "visible" : "hidden",
                  transition: reduced
                    ? undefined
                    : `opacity ${SWAP_MS}ms ease, transform ${SWAP_MS}ms ease, visibility ${SWAP_MS}ms`,
                  pointerEvents: shopOpen ? "auto" : "none",
                  zIndex: 20,
                }}
              >
                <Shop
                  open={shopOpen}
                  rows={rows}
                  stacks={stacks}
                  cash={run.cash}
                  cashBlocks={blocksOf(run.cash, run.denom)}
                  realNames={realNames}
                  incomeBlocks={ch.incomeBlocks}
                  chapterId={ch.id}
                  paying={paying}
                  flashNew={run.turn > 0}
                  shakeUid={shakeUid}
                  width={innerW}
                  ui={ui}
                  canBuy={(id) => canTrade && canBuy(run, id)}
                  onBuy={doBuy}
                  onBuyMany={doBuyMany}
                  onSell={doSell}
                  onSellMany={doSellMany}
                  onFlipMarket={(assetId) => setFlip({ kind: "market", assetId })}
                  onFlipCard={(uid) => setFlip({ kind: "card", uid })}
                  // the shop's own Play key, which is the table's key: it closes
                  // the counter and plays the turn in one press
                  playLabel={playLabel(nextMark)}
                  canPlay={canTrade && !boxOpen && !flip}
                  onPlay={onShopPlay}
                  onClose={() => setBeat("table")}
                />
              </div>

              {/* A tap anywhere, at any point in a resolve, lands the exact end
                  state. The wall takes the tap on its own, but a player who
                  reaches for a card instead should not have to aim. */}
              {beat === "resolve" && (
                <div
                  data-skip="1"
                  onPointerDown={onSkip}
                  style={{ position: "absolute", inset: 0, zIndex: 46, cursor: "pointer" }}
                />
              )}

              {/* the paper, over the wall */}
              {beat === "paper" && frontPage && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: headH + gap,
                    height: stageH,
                    zIndex: 45,
                    background: "rgba(238,236,230,0.97)",
                    borderRadius: R.panel,
                    overflow: "hidden",
                  }}
                >
                  <FrontPageOverlay page={frontPage} onContinue={onPaperContinue} />
                </div>
              )}

              {/* the overlays, over the body and never over the strip */}
              {overlay && (
                <div
                  data-overlay="1"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: R.panel,
                    background: "rgba(250,249,247,0.94)",
                    zIndex: 50,
                    overflow: "hidden",
                    padding: 6,
                    boxSizing: "border-box",
                  }}
                >
                  {overlay}
                </div>
              )}

              {/* a card, turned over */}
              {flipFace && (
                <CardFlip
                  face={flipFace.face}
                  lines={flipFace.lines}
                  maxW={innerW - 8}
                  maxH={bodyH - 8}
                  onClose={() => setFlip(null)}
                />
              )}

              {/* a card type, met once */}
              {debut && !overlay && !boxOpen && (
                <DebutOverlay
                  debut={debut}
                  asset={assetOf(debut.assetId)}
                  price={rows.find((r) => r.asset.id === debut.assetId)?.price ?? 0}
                  realNames={realNames}
                  costBlocks={blocksPerCard(debut.assetId)}
                  ratePerYear={rows.find((r) => r.asset.id === debut.assetId)?.ratePerYear ?? null}
                  onContinue={() => onDebutSeen(debut.key)}
                />
              )}

              {boxOpen && boxLayer}

              {/* the board under the sentence, dimmed, with the thing the
                  sentence is about left in the clear */}
              {tourBeat && tourAt && tourAt.hole && (
                <Spotlight
                  hole={tourAt.hole}
                  width={tourAt.hostW}
                  height={tourAt.hostH}
                  ui={ui}
                  reduced={reduced}
                />
              )}

              {/* the piggy, on the one chapter that has a piggy in it */}
              {tourBeat && tourAt && (
                <PiggyBubble
                  beat={tourBeat}
                  left={tourAt.left}
                  top={tourAt.top}
                  width={bubbleW}
                  ui={ui}
                  first={tourIndex === 0}
                  reduced={reduced}
                  onSkip={endTour}
                />
              )}
            </div>
          </>
        )}

        {screen !== "game" && boxOpen && boxLayer}
      </div>
    </div>
  );
}
