// The shop. It is a screen rather than a drawer: the board body swaps between
// the table and the counter, and this is the only place money changes hands.
//
// Payday comes first, always. The turn's income is credited by the model at the
// start of the plan, exactly as it always was, and this is where it becomes
// visible: the blocks slide into your money before a single card can be
// touched, so nobody ever wonders where the money came from.
//
// After that the shop hides nothing. Every card seen this run is on the counter
// at its real price, affordable or not, because a market that hides a company
// from you on a Tuesday is a lie a sharp twelve year old will catch. The
// scarcity that makes a turn a decision is blocks, not access. A card costs two
// blocks and says so by drawing two of them, and the savings card costs one and
// says so by drawing one, so the price of a deposit is on its face like every
// other price in the game.
//
// A card carries two tabs rather than one. The first buys one card and is the
// tab that has always been there. The second buys as many as the money in hand
// covers, and it says both numbers out loud: how many that is and what it would
// cost. It is a convenience and never a suggestion, so it is the quiet tab
// rather than the loud one, it never appears at all when the answer is one, and
// nothing in the game pays a player for pressing it.
//
// The till is the other half, and it is made of the same stuff: your own stacks
// drawn as the cards they are, at the size the counter draws its cards, with the
// sell tabs under them in the same language as the buy tabs above. A stack sells
// one card, five cards or the whole pile, newest first, and that is the whole of
// what most players ever need: the tabs say how many and how much, and nothing
// has to be opened to reach them.
//
// Underneath that, on a stack whose cards were not all bought together, is one
// quiet line that says how many lots the stack holds. It opens the stack grouped
// by purchase: one card for each distinct buy, saying when it was bought, at
// what price, what one of them is worth today and how many of them there are,
// with its own sell tab. A stack whose cards are all one lot never offers it,
// because there is nothing there to itemise. A stone's tab says it cannot be
// sold and shakes the card when it is pressed, opened or not, because a stone
// cannot be sold and that is the whole point of it.
//
// Money only ever moves through a labelled button, and it moves visibly: the
// blocks a purchase costs fly out of your money and into the card, and the
// blocks a sale hands back fly out of the card and into your money. Tapping any
// card turns it over, which is free and safe; the tab under it is the only
// thing that spends or sells. A player should never discover they bought
// something by watching their money drop.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, MarketRow, SAVINGS_ID } from "../../lib/tally/deck";
import { TableauStack } from "../../lib/tally/run";
import { displayName, money, priceLine, wholeMoney, blockWord } from "../../lib/tally/text";
import { blockThud, blockTick } from "../../lib/tally/sound";
import CardFace, { CardStack, ensureCardAnims, stackBoxHeight } from "./Card";
import { Block } from "./Blocks";
import {
  ACCENT, FILL_DEEP, FILL_PANEL, FILL_PLAQUE, INK, LINE_HARD, R, SANS, SUB,
  btn, btnSize, ensureTallyUI, panel, plaque,
} from "./ui";

const SLIDE_ID = "tally-shop-anims";

function ensureShopAnims(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(SLIDE_ID)) return;
  const el = document.createElement("style");
  el.id = SLIDE_ID;
  el.textContent = `
@keyframes tally-payday-in {
  from { transform: translateX(26px) translateY(-8px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
/* A block crossing the counter. The trip is carried on three custom properties
   so one keyframe serves every flight in the game, and the arc is what stops a
   payment reading as a slide. */
@keyframes tally-fly {
  0%   { transform: translate(0, 0) scale(0.86); opacity: 0; }
  12%  { transform: translate(calc(var(--dx) * 0.12), calc(var(--dy) * 0.12 + var(--arc) * 0.4)) scale(1); opacity: 1; }
  56%  { transform: translate(calc(var(--dx) * 0.56), calc(var(--dy) * 0.56 + var(--arc))) scale(1.06); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.6); opacity: 0; }
}
@keyframes tally-fan-in {
  from { transform: translateY(7px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .tally-payday, .tally-fan { animation: none !important; }
  .tally-fly { display: none !important; }
}`;
  document.head.appendChild(el);
}

export interface ShopProps {
  open: boolean;
  rows: MarketRow[];
  stacks: TableauStack[];
  cash: number;
  cashBlocks: number;
  realNames: boolean;
  // how many blocks arrived this turn, and whether they are still sliding in
  incomeBlocks: number;
  // the chapter the run is in, so a lot bought in an earlier one says so
  chapterId: number;
  paying: boolean;
  // a card that slid in partway through a chapter gets the flash. The cards a
  // chapter opens with are announced by the chapter card and by their own
  // debut, so flashing all of them would be noise on the first turn.
  flashNew: boolean;
  shakeUid: number | null;
  width: number;
  // How much room the board has, as a multiplier on the card and the type. The
  // card sizes are module constants so that a card is the same size on every
  // board of a given size, and this is the one thing allowed to move them: a
  // bigger window buys bigger cards up to the cap the board sets, and never a
  // second arrangement. One is the floor.
  ui?: number;
  canBuy: (assetId: string) => boolean;
  onBuy: (assetId: string) => void;
  // the same purchase n times over, minted one card at a time by the model
  onBuyMany: (assetId: string, n: number) => void;
  onSell: (uid: number) => void;
  onSellMany: (uids: number[]) => void;
  onFlipMarket: (assetId: string) => void;
  onFlipCard: (uid: number) => void;
  // the table's own Play key, standing on the counter: the same label, the same
  // face, and it plays the turn from here
  playLabel: string;
  canPlay: boolean;
  onPlay: () => void;
  onClose: () => void;
}

// A stack, grouped by the purchase each card came from. Two cards bought on the
// same turn at the same price are the same lot and there is nothing to tell
// between them; two cards bought on different turns are two different objects
// wearing the same name, and that is the whole reason this view exists.
interface Lot {
  key: string;
  cards: TableauStack["cards"];
}

function lotsOf(st: TableauStack): Lot[] {
  const out: Lot[] = [];
  for (const c of st.cards) {
    const key = `${c.card.chapter}.${c.card.turn}.${c.card.buyPrice}.${c.card.shares}`;
    const found = out.find((l) => l.key === key);
    if (found) found.cards.push(c);
    else out.push({ key, cards: [c] });
  }
  return out;
}

// When a lot was bought, as a label rather than a sentence, because it sits
// under a card the size of a stamp.
function lotWhen(card: Card, chapterId: number): string {
  return card.chapter === chapterId
    ? `turn ${card.turn + 1}`
    : `ch ${card.chapter}, turn ${card.turn + 1}`;
}

// What a lot paid, per card. A deposit is money put in rather than a price paid,
// so it says so.
function lotPaid(assetId: string, card: Card): string {
  return assetId === SAVINGS_ID ? `put in ${money(card.buyDollars)}` : `at ${money(card.buyPrice)}`;
}

// The one tab under a card, drawn once so the buy tab and the sell tab cannot
// drift apart. "live" is the accent fill that acts; "quiet" is the same tab in
// the plain face, for the convenience that must never look like advice; "dim"
// is the same tab on a card you cannot afford, which does nothing at all; "off"
// is the grey tab a stone carries, which still takes the press because a stone
// has to be allowed to refuse out loud.
function Tab({
  label, tone, down, onPress, title, mark, ui = 1, small = false,
}: {
  label: string;
  tone: "live" | "quiet" | "dim" | "off";
  down: boolean;
  onPress: () => void;
  title: string;
  mark: Record<string, string>;
  ui?: number;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      {...mark}
      disabled={tone === "dim"}
      aria-disabled={tone !== "live" && tone !== "quiet"}
      onClick={onPress}
      title={title}
      className={btn(tone === "live" ? "primary" : "plain", down ? "is-down" : undefined)}
      style={{
        display: "block",
        width: "100%",
        marginTop: small ? 4 : 6,
        padding: `${Math.round((small ? 4.5 : 6) * ui)}px 4px`,
        fontSize: (small ? 11 : 12.5) * ui,
        borderRadius: R.chip,
        ...(tone === "off" ? { color: "#8A909C" } : null),
      }}
    >
      {label}
    </button>
  );
}

// A card is the same size on every board, and a wider board buys more columns
// rather than bigger cards. Eighty seven pixels is the width that holds two
// readable lines of a name, and a name cut in half is a card that has stopped
// saying what it is.
const CARD_W = 118;
const CARD_H = 126;
const MIN_GAP = 8;
const MAX_GAP = 14;

// How tall a tab really stands, from the same numbers Tab draws itself with:
// its own margin, its padding, its line and its frame. The till row is given a
// fixed height built from these and from the stack box, so buying a fifth card
// of a name can never make the till taller than it was with one, and the row is
// sized once from the most any stack in it offers.
function tabHeight(ui: number, small: boolean): number {
  const pad = Math.round((small ? 4.5 : 6) * ui);
  const line = Math.round((small ? 11 : 12.5) * ui * 1.25);
  return (small ? 4 : 6) + pad * 2 + line + 3;
}

function lotsHeight(ui: number): number {
  return 2 + Math.round(3 * ui) * 2 + Math.round(10.5 * ui * 1.25) + 3;
}

// The payment, in flight. However many blocks a purchase really costs, no more
// than this many ever cross the counter: ten blocks read as a stream, and a
// hundred and twenty read as a screen full of squares, while the model mints
// the exact number either way.
const FLIGHT_CAP = 10;
const FLIGHT_MS = 430;
const FLIGHT_STEP = 30;

interface Flight {
  key: number;
  kind: "buy" | "sell";
  x: number;
  y: number;
  dx: number;
  dy: number;
  arc: number;
  n: number;
}

function prefersReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Shop(p: ShopProps) {
  const [pressed, setPressed] = useState<string | null>(null);
  const [sold, setSold] = useState<number | null>(null);
  // which stack is fanned out, and the card that just landed in the till
  const [fanId, setFanId] = useState<string | null>(null);
  const [pop, setPop] = useState<{ id: string; key: number } | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const root = useRef<HTMLDivElement | null>(null);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);
  ensureShopAnims();
  ensureCardAnims();
  ensureTallyUI();

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    if (!p.open) {
      setPressed(null);
      setSold(null);
      setFanId(null);
      setFlights([]);
    }
  }, [p.open]);

  // the lots are a fact about a stack, so a stack that stopped holding more than
  // one lot has stopped having any to show
  const lotsBy = useMemo(() => {
    const out = new Map<string, Lot[]>();
    for (const st of p.stacks) out.set(st.asset.id, lotsOf(st));
    return out;
  }, [p.stacks]);

  useEffect(() => {
    if (!fanId) return;
    const lots = lotsBy.get(fanId);
    if (!lots || lots.length < 2) setFanId(null);
  }, [lotsBy, fanId]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // A payment, seen. The blocks leave one end and arrive at the other on a
  // short arc, a few milliseconds apart, and each one ticks as it goes. The
  // sounds are counted whether or not the flight is drawn, so a board that
  // could not measure something still says the money moved; reduced motion
  // silences both, because sound.ts refuses to play under it at all.
  const flyBlocks = useCallback((
    fromSel: string, toSel: string, blocks: number, kind: "buy" | "sell",
  ) => {
    const n = Math.max(1, Math.min(FLIGHT_CAP, Math.round(blocks)));
    for (let i = 0; i < n; i++) {
      later(() => (kind === "buy" ? blockTick(i + 1, n) : blockThud(i + 1, n)), i * FLIGHT_STEP);
    }
    if (prefersReduced()) return;
    const box = root.current;
    const a = box?.querySelector(fromSel);
    const b = box?.querySelector(toSel);
    if (!box || !a || !b) return;
    const r = box.getBoundingClientRect();
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const x = ra.left + ra.width / 2 - r.left;
    const y = ra.top + ra.height / 2 - r.top;
    const dx = rb.left + rb.width / 2 - r.left - x;
    const dy = rb.top + rb.height / 2 - r.top - y;
    // the lift over the middle of the trip, held inside the counter so a
    // payment never leaves the screen it is being made on
    const rise = Math.min(46, Math.max(16, Math.hypot(dx, dy) * 0.22));
    const arc = -Math.min(rise, Math.max(0, y + dy * 0.56 - 10));
    const key = (seq.current += 1);
    setFlights((f) => [...f, { key, kind, x, y, dx, dy, arc, n }]);
    later(() => setFlights((f) => f.filter((v) => v.key !== key)), FLIGHT_MS + n * FLIGHT_STEP + 80);
  }, [later]);

  // ------------------------------------------------------------ the moves

  const buyCards = useCallback((assetId: string, n: number, costBlocks: number) => {
    setPressed(assetId);
    later(() => setPressed((v) => (v === assetId ? null : v)), 160);
    flyBlocks('[data-money="1"]', `[data-market="${assetId}"]`, costBlocks * n, "buy");
    if (!prefersReduced()) {
      const key = (seq.current += 1);
      later(() => setPop({ id: assetId, key }), Math.round(FLIGHT_MS * 0.55));
      later(() => setPop((v) => (v && v.key === key ? null : v)), Math.round(FLIGHT_MS * 0.55) + 340);
    }
    if (n <= 1) p.onBuy(assetId);
    else p.onBuyMany(assetId, n);
  }, [flyBlocks, later, p]);

  const sellCard = useCallback((
    st: TableauStack, uid: number, blocks: number, fromSel: string,
  ) => {
    if (st.stone) {
      p.onSell(uid);
      return;
    }
    setSold(uid);
    later(() => setSold((v) => (v === uid ? null : v)), 160);
    flyBlocks(fromSel, '[data-money="1"]', blocks, "sell");
    p.onSell(uid);
  }, [flyBlocks, later, p]);

  // the card, at the size the room allows, and the till row built from it, so a
  // bigger board buys bigger cards without any of the three drifting apart
  const ui = Math.max(1, p.ui ?? 1);
  const type = (n: number) => Math.round(n * ui * 2) / 2;
  const cardMax = Math.round(CARD_W * ui);
  const cardH = Math.round(CARD_H * ui);
  // the tallest sell column any stack in this till needs, applied to all of
  // them, so the row is one height and stays it
  const anyMany = p.stacks.some((st) => !st.stone && st.cards.length > 1);
  const anyFive = p.stacks.some((st) => !st.stone && st.cards.length >= 5);
  const anyLots = p.stacks.some((st) => (lotsBy.get(st.asset.id)?.length ?? 0) > 1);
  const sellH = tabHeight(ui, false)
    + (anyMany ? tabHeight(ui, true) : 0)
    + (anyFive ? tabHeight(ui, true) : 0)
    + (anyLots ? lotsHeight(ui) : 0);
  const tillRowH = stackBoxHeight(cardH) + sellH;

  const grid = p.width - Math.round(22 * ui);
  const cols = Math.max(3, Math.floor((grid + MIN_GAP) / (cardMax + MIN_GAP)));
  const cardW = Math.min(cardMax, Math.floor((grid - (cols - 1) * MIN_GAP) / cols));
  const gap = cols > 1
    ? Math.max(MIN_GAP, Math.min(MAX_GAP, Math.floor((grid - cols * cardW) / (cols - 1))))
    : MIN_GAP;
  const drawnCash = Math.min(14, p.cashBlocks);
  const settled = Math.max(0, drawnCash - (p.paying ? p.incomeBlocks : 0));

  // the lot card, which is the till card at the size a stack's worth of them
  // fits the row it already had, with its two caption lines under it
  const fanHeadH = Math.round(22 * ui);
  const fanTabH = Math.round(26 * ui);
  const fanCapH = Math.round(25 * ui);
  const fanAllH = Math.round(34 * ui);
  const fanLift = 8;
  const miniH = Math.max(
    50,
    Math.min(
      Math.round(cardH * 0.62),
      tillRowH - fanHeadH - fanLift - fanCapH - fanTabH - fanAllH,
    ),
  );
  const miniW = Math.max(52, Math.round(miniH * 1.02));
  const fanGap = 4;

  // the two keys under the counter, at one height on one row, exactly as the
  // table's own foot bar stands them
  const footKey: React.CSSProperties = {
    flex: "none",
    height: Math.round(38 * ui),
    paddingTop: 0,
    paddingBottom: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      ref={root}
      data-shop={p.open ? "open" : "closed"}
      // payday, while it is still landing, said out loud on the counter itself:
      // the tutorial's payday beat stands until this goes off
      data-paying={p.paying ? "1" : "0"}
      aria-hidden={!p.open}
      // a fan is open until the player looks somewhere else, and looking
      // somewhere else is any press that is not inside the fan
      onPointerDownCapture={(e) => {
        if (!fanId) return;
        const t = e.target as Element | null;
        if (!t || !t.closest("[data-till-fan]")) setFanId(null);
      }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(7 * ui),
        padding: Math.round(9 * ui),
        boxSizing: "border-box",
        background: FILL_PANEL,
        borderRadius: R.panel,
        border: `2px solid ${LINE_HARD}`,
        boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.8)",
        // The shop is a screen and not a drawer: the board body swaps between
        // the table and this, and the swap belongs to the board, so nothing
        // here slides itself anywhere.
        overflow: "hidden",
        fontFamily: SANS,
        pointerEvents: p.open ? "auto" : "none",
      }}
    >
      {/* payday, and then the counter */}
      <div
        style={{
          ...panel({ fill: FILL_PLAQUE, radius: R.panel }),
          padding: `${Math.round(8 * ui)}px ${Math.round(11 * ui)}px ${Math.round(9 * ui)}px`,
          flex: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: type(15), fontWeight: 800, letterSpacing: "-0.015em", color: INK }}>The shop</span>
          <span style={{ fontSize: type(12), fontWeight: 600, color: SUB }}>
            {p.rows.length === 0
              ? "Nothing is for sale in this chapter."
              : `${p.rows.length} ${p.rows.length === 1 ? "card" : "cards"}, every one at today's price.`}
          </span>
        </div>
        <div
          style={{
            ...plaque(R.chip),
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: Math.round(7 * ui),
            minHeight: 20,
            padding: `${Math.round(4 * ui)}px ${Math.round(9 * ui)}px`,
          }}
        >
          <span style={{ fontSize: type(11.5), fontWeight: 650, color: SUB }}>
            {p.paying ? "Payday" : "Your money"}
          </span>
          <span
            style={{
              fontSize: type(16),
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
              color: INK,
            }}
          >
            {wholeMoney(p.cash)}
          </span>
          <span data-money="1" style={{ display: "flex", alignItems: "flex-end", gap: 1.5, minWidth: 10, minHeight: 10 }}>
            {Array.from({ length: drawnCash }, (_, i) => (
              <span
                key={i}
                className={i >= settled ? "tally-payday" : undefined}
                style={{
                  display: "block",
                  lineHeight: 0,
                  animation: i >= settled ? `tally-payday-in 320ms cubic-bezier(.2,.8,.3,1) ${(i - settled) * 90}ms both` : undefined,
                }}
              >
                <Block size={Math.round(10 * ui)} cash />
              </span>
            ))}
            {p.cashBlocks > drawnCash && (
              <span style={{ fontSize: type(11), fontWeight: 650, color: SUB, marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
                and {p.cashBlocks - drawnCash} more
              </span>
            )}
          </span>
          {p.paying && p.incomeBlocks > 0 && (
            <span style={{ fontSize: type(11.5), fontWeight: 650, color: ACCENT, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {p.incomeBlocks} {blockWord(p.incomeBlocks)} arrived
            </span>
          )}
        </div>
      </div>

      {/* the counter */}
      <div
        className="tally-scroll"
        style={{
          ...panel({ fill: FILL_DEEP, radius: R.panel, inset: true }),
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          padding: `${Math.round(9 * ui)}px ${Math.round(10 * ui)}px`,
          opacity: p.paying ? 0.45 : 1,
          transition: "opacity .22s ease",
          pointerEvents: p.paying ? "none" : "auto",
        }}
      >
        {p.rows.length === 0 ? (
          <p data-counter-note="1" style={{ margin: "8px 2px", fontSize: type(13.5), lineHeight: 1.5, color: SUB }}>
            There is nothing to buy in this chapter, and your money is safe where it is.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap, alignItems: "start" }}>
            {p.rows.map((row) => {
              const buyable = p.canBuy(row.asset.id);
              const down = pressed === row.asset.id;
              // what the money in hand covers, which is the whole of what the
              // second tab knows. One is not worth a tab of its own, so a turn
              // with one card's worth of money in it stays as quiet as it was.
              const most = buyable && row.costDollars > 0
                ? Math.floor((p.cash + 1e-6) / row.costDollars)
                : 0;
              return (
                <div key={row.asset.id} data-market={row.asset.id}>
                  <CardFace
                    name={displayName(row.asset, p.realNames)}
                    suit={row.asset.suit}
                    sector={row.asset.sector}
                    worthBlocks={row.costBlocks}
                    blockColor={row.asset.color}
                    priceLabel={priceLine(row.asset, row.price, row.ratePerYear)}
                    dotted={row.reconstructed || row.illustrative}
                    newFlash={row.isNew && p.flashNew}
                    width={cardW}
                    height={cardH}
                    dimmed={!row.affordable}
                    title="Tap the card to turn it over, and buy it with the button below."
                    onTap={() => p.onFlipMarket(row.asset.id)}
                  />
                  <Tab
                    ui={ui}
                    mark={{ "data-buy": row.asset.id }}
                    label={`Buy 1 · ${wholeMoney(row.costDollars)}`}
                    tone={buyable ? "live" : "dim"}
                    down={down}
                    title={
                      row.costBlocks === 1
                        ? `One block buys one card${buyable ? "." : ", and you do not have one."}`
                        : `Two blocks buy one card${buyable ? "." : ", and you do not have two."}`
                    }
                    onPress={() => {
                      if (!buyable) return;
                      buyCards(row.asset.id, 1, row.costBlocks);
                    }}
                  />
                  {most > 1 && (
                    <Tab
                      ui={ui}
                      small
                      mark={{ "data-buy-max": row.asset.id, "data-buy-max-n": String(most) }}
                      label={`Max ×${most} · ${wholeMoney(most * row.costDollars)}`}
                      tone="quiet"
                      down={down}
                      title="This buys as many of this card as the money in your hand covers, in one press."
                      onPress={() => buyCards(row.asset.id, most, row.costBlocks)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* the till */}
      <div
        style={{
          ...panel({ fill: FILL_PLAQUE, radius: R.panel }),
          flex: "none",
          padding: `${Math.round(7 * ui)}px ${Math.round(10 * ui)}px ${Math.round(7 * ui)}px`,
          opacity: p.paying ? 0.45 : 1,
          pointerEvents: p.paying ? "none" : "auto",
        }}
      >
        <div style={{ fontSize: type(12), fontWeight: 650, color: SUB, marginBottom: 5 }}>
          {p.stacks.length === 0
            ? "Your cards will show here, and you can sell any of them back at today's price."
            : "Your cards. Sell any of them back at today's price."}
        </div>
        <div
          className="tally-scroll"
          data-till-row="1"
          style={{
            display: "flex",
            gap,
            height: tillRowH,
            flex: "none",
            overflowX: "auto",
            overflowY: "hidden",
            // the cards line up along the top of the row and the tabs hang
            // under them, so a stack offering three tabs cannot lift its own
            // card above the one beside it
            alignItems: "flex-start",
            // the collars are allowed the gutter, so the row gives them one at
            // both ends rather than clipping the last one
            padding: "0 7px",
            margin: "0 -7px",
          }}
        >
          {p.stacks.map((st) => {
            const lots = lotsBy.get(st.asset.id) ?? [];
            const opened = fanId === st.asset.id && lots.length > 1;
            if (opened) {
              // The stack, grouped by the purchase each card came from. One card
              // to a lot, saying when it was bought, what it paid, what one of
              // them is worth today and how many of them there are. The tab
              // under a lot sells one card out of that lot and no other, and the
              // tab under the row sells the whole stack.
              return (
                <div
                  key={st.asset.id}
                  data-till-fan={st.asset.id}
                  data-till-lots={lots.length}
                  className="tally-fan"
                  style={{
                    flex: "none",
                    height: tillRowH,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    animation: "tally-fan-in 180ms cubic-bezier(.2,.8,.3,1) both",
                  }}
                >
                  <button
                    type="button"
                    data-fan-close={st.asset.id}
                    className={btn("ghost")}
                    onClick={() => setFanId(null)}
                    title="Tap the header to close the lots."
                    style={{ ...btnSize(ui, "sm"), alignSelf: "flex-start", padding: `${Math.round(3 * ui)}px ${Math.round(7 * ui)}px` }}
                  >
                    {displayName(st.asset, p.realNames)} · {lots.length} lots
                  </button>
                  <div style={{ display: "flex", gap: fanGap, alignItems: "flex-end", paddingTop: fanLift }}>
                    {lots.map((lot) => {
                      // the newest card of a lot is the one that sells, and
                      // every card in the lot is worth the same money anyway
                      const c = lot.cards[lot.cards.length - 1];
                      const uid = c.card.uid;
                      const n = lot.cards.length;
                      return (
                        <div key={lot.key} data-fan-lot={lot.key} data-fan-card={uid} data-lot-n={n} style={{ width: miniW, flex: "none" }}>
                          <CardFace
                            name={displayName(st.asset, p.realNames)}
                            suit={st.asset.suit}
                            sector={st.asset.sector}
                            worthBlocks={c.blocks}
                            blockColor={st.asset.color}
                            priceLabel={st.stone ? "no price" : wholeMoney(c.worth)}
                            stone={st.stone}
                            dotted={st.asset.reconstructed || st.illustrative}
                            width={miniW}
                            height={miniH}
                            shake={p.shakeUid === uid}
                            title="Tap the card to turn it over, and sell one of this lot with the tab below."
                            onTap={() => p.onFlipCard(uid)}
                          />
                          <div
                            style={{
                              height: fanCapH,
                              marginTop: 3,
                              fontSize: type(9.5),
                              fontWeight: 700,
                              lineHeight: 1.25,
                              color: SUB,
                              fontVariantNumeric: "tabular-nums",
                              overflow: "hidden",
                            }}
                          >
                            <div>&times;{n} · {lotWhen(c.card, p.chapterId)}</div>
                            <div>{lotPaid(st.asset.id, c.card)}</div>
                          </div>
                          <Tab
                            ui={ui}
                            small
                            mark={{ "data-fan-sell": String(uid) }}
                            label={st.stone ? "cannot sell" : `Sell 1 · ${wholeMoney(c.worth)}`}
                            tone={st.stone ? "off" : "live"}
                            down={sold === uid}
                            title={
                              st.stone
                                ? "A stone cannot be sold."
                                : "This sells one card out of this lot, at today's price, for exactly what that card holds."
                            }
                            onPress={() => sellCard(st, uid, c.blocks, `[data-fan-lot="${lot.key}"]`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Tab
                    ui={ui}
                    mark={{ "data-fan-all": st.asset.id }}
                    label={st.stone ? "cannot sell" : `Sell all · ${wholeMoney(st.totalWorth)}`}
                    tone={st.stone ? "off" : "live"}
                    down={false}
                    title={
                      st.stone
                        ? "A stone cannot be sold."
                        : "This sells every card of this name, each at today's price."
                    }
                    onPress={() => {
                      if (st.stone) {
                        p.onSell(st.cards[st.cards.length - 1].card.uid);
                        return;
                      }
                      flyBlocks(
                        `[data-till-fan="${st.asset.id}"]`, '[data-money="1"]', st.totalBlocks, "sell",
                      );
                      setFanId(null);
                      p.onSellMany(st.cards.map((c) => c.card.uid));
                    }}
                  />
                </div>
              );
            }

            // The card on top of a stack is the newest purchase, and the newest
            // purchase is the one that sells. A stack sells one, five or all of
            // them and every tab says exactly what it hands back, so the common
            // move needs nothing opened; the quiet line under the tabs is where
            // a stack made of several purchases says so.
            const front = st.cards[st.cards.length - 1];
            const uid = front.card.uid;
            const down = sold === uid;
            const left = st.cards.length;
            const many = left > 1;
            const five = st.cards.slice(-5);
            const fiveWorth = five.reduce((s, c) => s + c.worth, 0);
            const fiveBlocks = five.reduce((s, c) => s + c.blocks, 0);
            const popping = pop?.id === st.asset.id;
            return (
              <div key={st.asset.id} data-till-stack={st.asset.id} style={{ width: cardW, flex: "none" }}>
                <div
                  key={popping ? `pop${pop?.key}` : "rest"}
                  className={popping ? "tally-chip-punch" : undefined}
                  style={{ animation: popping ? "tally-chip-punch 300ms linear both" : undefined }}
                >
                  <CardStack
                    cards={st.cards.length}
                    collar={`${st.cards.length} ${st.cards.length === 1 ? "card" : "cards"} · ${st.totalBlocks} ${blockWord(st.totalBlocks)}`}
                    name={displayName(st.asset, p.realNames)}
                    suit={st.asset.suit}
                    sector={st.asset.sector}
                    worthBlocks={front.blocks}
                    blockColor={st.asset.color}
                    priceLabel={st.stone ? "no price" : priceLine(st.asset, st.price, st.ratePerYear)}
                    stone={st.stone}
                    dotted={st.asset.reconstructed || st.illustrative}
                    width={cardW}
                    height={cardH}
                    shake={p.shakeUid === uid}
                    title="Tap the card to turn it over, and sell it with the tabs below."
                    onTap={() => p.onFlipCard(uid)}
                  />
                </div>
                <Tab
                  ui={ui}
                  mark={{ "data-till": String(uid) }}
                  label={st.stone ? "cannot sell" : `Sell 1 · ${wholeMoney(front.worth)}`}
                  tone={st.stone ? "off" : "live"}
                  down={down}
                  title={
                    st.stone
                      ? "A stone cannot be sold."
                      : "This sells the newest of these cards, at today's price, for exactly what that one card holds."
                  }
                  onPress={() => sellCard(st, uid, front.blocks, `[data-till-stack="${st.asset.id}"]`)}
                />
                {!st.stone && left >= 5 && (
                  <Tab
                    ui={ui}
                    small
                    mark={{ "data-till-five": st.asset.id }}
                    label={`Sell 5 · ${wholeMoney(fiveWorth)}`}
                    tone="quiet"
                    down={false}
                    title="This sells the five newest of these cards, each at today's price."
                    onPress={() => {
                      flyBlocks(
                        `[data-till-stack="${st.asset.id}"]`, '[data-money="1"]', fiveBlocks, "sell",
                      );
                      p.onSellMany(five.map((c) => c.card.uid));
                    }}
                  />
                )}
                {!st.stone && many && (
                  <Tab
                    ui={ui}
                    small
                    mark={{ "data-till-all": st.asset.id }}
                    label={`Sell all · ${wholeMoney(st.totalWorth)}`}
                    tone="quiet"
                    down={false}
                    title="This sells every card of this name, each at today's price."
                    onPress={() => {
                      flyBlocks(
                        `[data-till-stack="${st.asset.id}"]`, '[data-money="1"]', st.totalBlocks, "sell",
                      );
                      p.onSellMany(st.cards.map((c) => c.card.uid));
                    }}
                  />
                )}
                {lots.length > 1 && (
                  <button
                    type="button"
                    data-lots={st.asset.id}
                    className={btn("ghost")}
                    onClick={() => setFanId(st.asset.id)}
                    title="These cards were bought on different turns, and this shows each purchase on its own."
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 2,
                      padding: `${Math.round(3 * ui)}px 4px`,
                      fontSize: type(10.5),
                      borderRadius: R.chip,
                    }}
                  >
                    {lots.length} lots
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* The way on. A player who is done shopping is done, so the loud key on
          the counter is the turn itself, in the table's own words and the
          table's own face; the quiet one beside it goes back to the table
          without playing anything. */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: Math.round(9 * ui) }}>
        <button
          type="button"
          data-shop-close="1"
          onClick={p.onClose}
          disabled={p.paying}
          className={btn("plain")}
          style={{ ...btnSize(ui, "md"), ...footKey, marginLeft: "auto" }}
        >
          Table
        </button>
        <button
          type="button"
          data-shop-play="1"
          onClick={p.onPlay}
          disabled={p.paying || !p.canPlay}
          className={btn("ink")}
          style={{ ...btnSize(ui, "lg"), ...footKey }}
        >
          {p.playLabel}
        </button>
      </div>

      {/* the money, crossing the counter */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 48, pointerEvents: "none" }}>
        {flights.map((f) => Array.from({ length: f.n }, (_, i) => (
          <span
            key={`${f.key}.${i}`}
            className="tally-fly"
            data-fly={f.kind}
            style={{
              position: "absolute",
              left: f.x - Math.round(5 * ui),
              top: f.y - Math.round(5 * ui),
              lineHeight: 0,
              ["--dx" as string]: `${Math.round(f.dx)}px`,
              ["--dy" as string]: `${Math.round(f.dy)}px`,
              ["--arc" as string]: `${Math.round(f.arc)}px`,
              animation: `tally-fly ${FLIGHT_MS}ms cubic-bezier(.3,.7,.35,1) ${i * FLIGHT_STEP}ms both`,
            } as React.CSSProperties}
          >
            <Block size={Math.round(10 * ui)} cash />
          </span>
        )))}
      </div>
    </div>
  );
}
