import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ASSETS, MarketEvent, fmtMoney } from "../engine/market";
import { useSim } from "../lib/useSim";
import { roundPcts } from "../lib/orbModel";
import {
  Actions, Btn, Caption, Card, DeltaChip, Dot, GhostBtn, GrowthChart,
  Sparkline, SpeedBtn, TradeChip,
} from "../components/OrbUI";

// Share Garden, rebuilt under the metaphor law and patterned on the Orb's
// tutorial spine. Plant size IS the current price; every plant of a cultivar
// in town is the same size tonight. Selling is transplanting to another
// gardener; the money moves gardener to gardener, never to the company.
// The co-op field is the index. Frost is the crash.

type Beat = "intro" | "coins" | "plant" | "meetCoop" | "run1" | "warn" | "frost" | "run2" | "end";

const END_STEP = 144;

interface Crop {
  id: string;          // engine asset id
  crop: string;        // cultivar name
  sprite: string;
  color: string;       // accent for charts
}

const CROPS: Crop[] = [
  { id: "iron", crop: "Pumpkin", sprite: "pumpkin",   color: "#ff9f0a" },
  { id: "nova", crop: "Tomato",  sprite: "tomato",    color: "#ff453a" },
  { id: "volt", crop: "Corn",    sprite: "corn",      color: "#ffd60a" },
  { id: "cane", crop: "Berry",   sprite: "blueberry", color: "#0a84ff" },
];

// the garden's own weather season; same clock as the Orb's tutorial
const GARDEN_EVENTS: MarketEvent[] = [
  { atStep: 26, days: 5,  drift: 0.012,  vol: 0.010, scope: "tech",     label: "Tomato craze",  blurb: "Everyone in town wants tomato plants. Prices are running hot." },
  { atStep: 48, days: 7,  drift: -0.055, vol: 0.038, scope: "market",   label: "A hard frost",  blurb: "A deep frost settles over every garden at once." },
  { atStep: 74, days: 6,  drift: -0.028, vol: 0.018, scope: "consumer", label: "Berry glut",    blurb: "Too many berries this season. Prices sag." },
  { atStep: 96, days: 6,  drift: -0.030, vol: 0.015, scope: "tech",     label: "Tomato blight", blurb: "A blight spreads through the tomato rows." },
  { atStep: 116, days: 16, drift: 0.022, vol: 0.010, scope: "market",   label: "Warm spell",    blurb: "Warm weeks. Every garden is filling back in." },
];

const S = (name: string) => `${import.meta.env.BASE_URL}sprites/t/${name}.png`;

// plant size IS the price
const plantH = (price: number) => Math.max(28, Math.min(190, 26 + price * 0.62));

export default function GardenGame() {
  const { m, speed, setSpeed, done, reset, act } = useSim({ cash: 1000, maxStep: END_STEP, events: GARDEN_EVENTS });
  const [beat, setBeat] = useState<Beat>("intro");
  const [choice, setChoice] = useState<"held" | "sold" | null>(null);
  const [tradeRow, setTradeRow] = useState<string | null>(null);
  const fired = useRef({ warn: false, frost: false, blight: false, jumped: false });
  const endCardRef = useRef<HTMLDivElement>(null);
  const lastDiv = useRef(0);
  const [harvestToast, setHarvestToast] = useState<string | null>(null);

  const holdings = useMemo(
    () =>
      CROPS.map((c) => {
        const asset = ASSETS.find((a) => a.id === c.id)!;
        const h = m.holdings[c.id];
        return { c, asset, plants: h?.shares ?? 0, cost: h?.cost ?? 0, value: (h?.shares ?? 0) * m.prices[c.id] };
      }).filter((x) => x.plants > 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.step, m.cash, beat, tradeRow]
  );
  const invested = holdings.reduce((s, h) => s + h.value, 0);
  const pcts = roundPcts(holdings.map((h) => h.value));
  const net = m.cash + invested;
  const peak = Math.max(...m.net);
  const drawdown = peak > 0 ? (net - peak) / peak : 0;
  const ev = m.lastEvent;
  const frosty = beat === "warn" || beat === "frost" || (!!ev && ev.drift < -0.03 && ev.scope === "market");

  // dividends arrive as harvest baskets
  useEffect(() => {
    if (m.dividendsCollected > lastDiv.current + 0.5) {
      const gained = m.dividendsCollected - lastDiv.current;
      lastDiv.current = m.dividendsCollected;
      setHarvestToast(`Harvest basket · +${fmtMoney(gained)} from your income crops`);
      const t = setTimeout(() => setHarvestToast(null), 2600);
      return () => clearTimeout(t);
    }
  });

  // beat machine
  useEffect(() => {
    const s = m.step;
    const f = fired.current;
    if (beat === "run1") {
      if (s >= 44 && !f.warn) { f.warn = true; setSpeed(0); setBeat("warn"); return; }
      if (s >= 48) f.frost = true;
      if (s >= 55) { setSpeed(0); setBeat("frost"); }
    } else if (beat === "run2") {
      if (done || s >= END_STEP) { setSpeed(0); setBeat("end"); }
    }
  });

  useEffect(() => {
    if (beat === "end") setTimeout(() => endCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 350);
  }, [beat]);

  const plant = (id: string, count: number) => {
    act((mm) => {
      const price = mm.prices[id];
      const n = Math.min(count, Math.floor(mm.cash / price));
      if (n >= 1) mm.buy(id, n * price);
    });
  };
  const transplant = (id: string, frac: number) => {
    act((mm) => {
      const h = mm.holdings[id];
      if (!h) return;
      const n = Math.max(1, Math.floor(h.shares * frac + 1e-9));
      mm.sellFraction(id, n / h.shares);
    });
  };

  const keepTending = () => { setChoice("held"); setBeat("run2"); setSpeed(4); };
  const transplantAll = () => {
    setChoice("sold");
    act((mm) => { for (const c of CROPS) mm.sellFraction(c.id, 1); });
    setTimeout(() => { setBeat("run2"); setSpeed(4); }, 900);
  };

  const restart = () => {
    reset();
    setBeat("intro");
    setChoice(null);
    setTradeRow(null);
    lastDiv.current = 0;
    fired.current = { warn: false, frost: false, blight: false, jumped: true };
  };

  const running = beat === "run1" || beat === "run2";
  const canTrade = running || beat === "frost";
  const marketOpen = beat === "plant" || canTrade;
  const cropsAvailable = beat === "plant" && holdings.length === 0 ? CROPS.slice(0, 1) : CROPS;

  return (
    <div className="min-h-full" style={{ background: "#f6f1e3", color: "#2a2018", colorScheme: "light" }}>
      <header className="flex items-center gap-4 px-6 sm:px-10 h-16">
        <Link to="/" className="text-sm hover:opacity-100 opacity-60 transition flex items-center gap-2" style={{ color: "#2a2018" }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7.5 2 L3.5 6 L7.5 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          gallery
        </Link>
        <div className="h-5 w-px bg-black/10" />
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg font-semibold tracking-tight" style={{ color: "#3f6b3a" }}>Share Garden</span>
          <span className="text-[13px] hidden sm:inline" style={{ color: "#8a7a66" }}>your money, growing in the ground</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] tnum" style={{ color: "#8a7a66" }}>Day {m.step}</span>
          {running && (
            <div className="flex items-center rounded-full bg-white border border-black/10 overflow-hidden shadow-sm">
              <SpeedBtn label={speed === 0 ? "Play" : "Pause"} active={false} onClick={() => setSpeed(speed === 0 ? 1 : 0)} />
              {[1, 2, 4].map((s) => (
                <SpeedBtn key={s} label={`${s}×`} active={speed === s} onClick={() => setSpeed(s)} />
              ))}
            </div>
          )}
          <button onClick={restart} className="text-[13px] opacity-50 hover:opacity-90 transition">Restart</button>
        </div>
      </header>

      <main className="px-4 sm:px-8 pb-4 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center">
        <div className="flex flex-col items-center gap-5">
          {/* the garden stage */}
          <div className="relative rounded-3xl overflow-hidden shadow-sm border border-black/5 transition-all duration-1000"
            style={{
              width: 1080, height: 410,
              background: frosty
                ? "linear-gradient(180deg, #e4e9ec 0%, #d8dee4 60%, #ccd4dc 100%)"
                : "linear-gradient(180deg, #f7f2e2 0%, #f2ecd8 55%, #e9e1c8 100%)",
            }}>
            {/* hero number */}
            <div className="absolute left-6 top-5 z-10">
              <div className="text-[12px] font-medium" style={{ color: "#8a7a66" }}>Net worth</div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[34px] leading-tight font-semibold tracking-tight tnum">{fmtMoney(net)}</span>
                {beat === "frost"
                  ? <DeltaChip value={drawdown} suffix="from the high" />
                  : Math.abs(net - 1000) >= 1 && <DeltaChip value={(net - 1000) / 1000} />}
              </div>
            </div>

            {/* weather toast */}
            {running && ev && (
              <div className="absolute left-1/2 -translate-x-1/2 top-5 px-4 py-2 rounded-full text-[13px] shadow-md pop-in border border-black/5 z-10"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", color: "#2a2018" }}>
                <span className="font-semibold">{ev.label}</span>
                <span style={{ color: "#8a7a66" }}> · {ev.blurb}</span>
              </div>
            )}
            {harvestToast && (
              <div className="absolute left-1/2 -translate-x-1/2 top-16 px-4 py-2 rounded-full text-[13px] shadow-md pop-in border border-black/5 z-10"
                style={{ background: "rgba(255,251,235,0.95)", color: "#7a5b17" }}>
                {harvestToast}
              </div>
            )}

            {/* snow during frost */}
            {frosty && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {Array.from({ length: 26 }, (_, i) => (
                  <span key={i} className="absolute rounded-full bg-white/80"
                    style={{
                      width: 4 + (i % 3), height: 4 + (i % 3),
                      left: `${(i * 41) % 100}%`,
                      animation: `snowfall ${5 + (i % 5)}s linear ${(i * 0.37) % 5}s infinite`,
                    }} />
                ))}
                <style>{`@keyframes snowfall { from { transform: translateY(-20px); opacity: 0.9; } to { transform: translateY(480px); opacity: 0.35; } }`}</style>
              </div>
            )}

            {/* cash coins */}
            <div className="absolute text-center" style={{ left: "10%", bottom: 64, transform: "translateX(-50%)" }}>
              <img src={S("coins")} alt="" style={{ width: 74, opacity: m.cash > 1 ? 1 : 0.35, transition: "opacity 0.5s" }} />
            </div>
            <StageTag x="10%" title="Cash" sub={fmtMoney(m.cash)} />

            {/* your bed */}
            <div className="absolute" style={{ left: "42%", bottom: 58, transform: "translateX(-50%)", width: 520 }}>
              <div className="relative flex items-end justify-center gap-3 px-8" style={{ minHeight: 150, paddingBottom: 26 }}>
                {holdings.length === 0 && (
                  <img src={S("bed-empty")} alt="" style={{ height: 110, filter: frosty ? "saturate(0.75) brightness(0.96)" : "none" }} />
                )}
                {holdings.map((h) => {
                  const hgt = plantH(m.prices[h.c.id]);
                  const shown = Math.min(8, Math.round(h.plants));
                  return (
                    <div key={h.c.id} className="relative flex items-end" style={{ gap: 2 }}>
                      {Array.from({ length: shown }, (_, i) => (
                        <img key={i} src={S(h.c.sprite)} alt={h.c.crop}
                          className={fired.current.frost && frosty ? "shiver" : ""}
                          style={{ height: hgt, width: "auto", transition: "height 0.7s cubic-bezier(.3,1.1,.4,1)", filter: frosty ? "saturate(0.72) brightness(0.95)" : "none" }} />
                      ))}
                      {Math.round(h.plants) > 8 && (
                        <span className="absolute -right-2 -top-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-white/90 border border-black/10 tnum">×{Math.round(h.plants)}</span>
                      )}
                      {/* cost-basis stake */}
                      <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{ bottom: -34, width: 120 }}>
                        <div className="text-[10.5px] tnum px-1.5 py-0.5 rounded-md inline-block" style={{ background: "rgba(255,255,255,0.85)", color: "#8a7a66", border: "1px solid rgba(0,0,0,0.08)" }}>
                          you paid {fmtMoney(h.cost / Math.max(1, Math.round(h.plants)))} each
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <StageTag x="42%" title="Your garden" sub={invested > 0 ? fmtMoney(invested) : "empty"} />

            {/* co-op field */}
            {beat !== "intro" && beat !== "coins" && beat !== "plant" && (
              <>
                <div className="absolute text-center" style={{ left: "78%", bottom: 62, transform: "translateX(-50%)" }}>
                  <img src={S("coop-field")} alt="" style={{
                    width: 150 * Math.sqrt(m.benchmark / 1000), transition: "width 0.7s",
                    filter: frosty ? "saturate(0.75) brightness(0.96)" : "none",
                  }} />
                </div>
                <StageTag x="78%" title="The co-op field" sub={`${fmtMoney(m.benchmark)} · a row of every crop`} />
              </>
            )}

            {/* the town law: every plant of a cultivar is the same size tonight */}
            {holdings.length > 0 && !["intro", "coins", "plant"].includes(beat) && (
              <div className="absolute right-5 top-5 rounded-2xl px-3.5 py-2.5 border border-black/5 shadow-sm"
                style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
                <div className="text-[10.5px] font-medium mb-1" style={{ color: "#8a7a66" }}>
                  every {holdings[0].c.crop.toLowerCase()} in town tonight
                </div>
                <div className="flex items-end gap-3">
                  {["Ana's", "Ben's", "yours"].map((who) => (
                    <div key={who} className="text-center">
                      <img src={S(holdings[0].c.sprite)} alt="" style={{ height: plantH(m.prices[holdings[0].c.id]) * 0.36, transition: "height 0.7s" }} />
                      <div className="text-[9.5px]" style={{ color: "#8a7a66" }}>{who}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <style>{`@keyframes shiverAnim { 0%,100% { transform: rotate(-1.2deg); } 50% { transform: rotate(1.2deg); } } .shiver { animation: shiverAnim 0.35s ease-in-out infinite; transform-origin: bottom center; }`}</style>
          </div>

          {/* tutorial cards under the stage */}
          <div ref={endCardRef} className={`z-20 ${beat === "end" ? "w-[min(1080px,96vw)]" : "w-[min(620px,92vw)]"}`}>
            {beat === "intro" && (
              <Card title="This is your garden box.">
                <p>Tilled, warm, and empty. Whatever you grow here is yours.</p>
                <Actions><Btn onClick={() => setBeat("coins")}>Next</Btn></Actions>
              </Card>
            )}
            {beat === "coins" && (
              <Card title="And this is your money.">
                <p>You have $1,000 in coins. Money in the pouch doesn't grow anything.</p>
                <Actions><Btn onClick={() => setBeat("plant")}>Open the market</Btn></Actions>
              </Card>
            )}
            {beat === "plant" && (
              <Card title={holdings.length === 0 ? "The market has one plant for sale today." : "Plant more, or let the season run."}>
                {holdings.length === 0 && (
                  <p className="mb-1">Buying a plant makes you its owner. It comes from another gardener's plot, roots and all.</p>
                )}
                <div className="flex flex-col gap-1.5 my-2">
                  {cropsAvailable.map((c) => {
                    const asset = ASSETS.find((a) => a.id === c.id)!;
                    const price = m.prices[c.id];
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-black/8 bg-white">
                        <img src={S(c.sprite)} alt="" style={{ height: 34 }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{c.crop} <span className="font-normal" style={{ color: "#8a7a66" }}>· {asset.payout === "income" ? "drops harvest baskets" : "grows tall, no baskets"}</span></div>
                        </div>
                        <span className="text-sm tnum" style={{ color: "#8a7a66" }}>{fmtMoney(price)}/plant</span>
                        <TradeChip disabled={m.cash < price} onClick={() => plant(c.id, 1)}>Plant 1</TradeChip>
                        <TradeChip disabled={m.cash < price * 3} onClick={() => plant(c.id, 3)}>Plant 3</TradeChip>
                      </div>
                    );
                  })}
                </div>
                {holdings.length > 0 && (
                  <Actions><Btn onClick={() => setBeat("meetCoop")}>Start the season</Btn></Actions>
                )}
              </Card>
            )}
            {beat === "meetCoop" && (
              <Card title="Meet the co-op field.">
                <p>The whole town tends it together. It grows one row of every crop, and nobody can dig up just one row.</p>
                <p className="mt-2">It starts worth $1,000, like your pouch did. Time is about to speed up.</p>
                <Actions><Btn onClick={() => { setBeat("run1"); setSpeed(2); }}>Start time</Btn></Actions>
              </Card>
            )}
            {beat === "run1" && speed > 0 && m.step < 12 && (
              <Caption>
                Watch your plants. Their size is the market price, and every plant of that cultivar in town moves together.
              </Caption>
            )}
            {beat === "warn" && (
              <Card title="The sky has gone gray.">
                <p>A hard frost is moving in. Every garden in town is about to feel it.</p>
                <Actions><Btn onClick={() => { setBeat("run1"); setSpeed(1); }}>Okay</Btn></Actions>
              </Card>
            )}
            {beat === "frost" && (
              <Card title="The frost is here.">
                <p>
                  You're down <strong className="tnum">{Math.abs(drawdown * 100).toFixed(0)}%</strong> from the top.
                  But count your plants: all still there, all still yours. The frost shrank the price, not your garden.
                </p>
                <p className="mt-2 font-medium">The cold hasn't broken yet. What do you do?</p>
                <Actions>
                  <GhostBtn onClick={keepTending}>Keep tending</GhostBtn>
                  <GhostBtn onClick={transplantAll}>Transplant everything away</GhostBtn>
                </Actions>
              </Card>
            )}
            {beat === "run2" && choice === "sold" && speed > 0 && (
              <Caption>Your plants live on in other gardens now. Your coins sit in the pouch.</Caption>
            )}
            {beat === "run2" && choice === "held" && speed > 0 && (
              <Caption>You're still tending. The season keeps turning.</Caption>
            )}
            {beat === "end" && (
              <Card title={choice === "sold" ? "The warm spell came, and your beds were empty." : "The warm spell came."} wide>
                <div className="flex gap-3 my-3">
                  <div className="flex-1 rounded-xl px-4 py-3 border"
                    style={{ background: net >= m.benchmark ? "#f2f8ec" : "#faf8f2", borderColor: net >= m.benchmark ? "rgba(63,107,58,0.4)" : "rgba(0,0,0,0.08)" }}>
                    <div className="text-[12px] font-medium" style={{ color: "#8a7a66" }}>You finished with</div>
                    <div className="text-[24px] tracking-tight tnum" style={{ fontWeight: net >= m.benchmark ? 700 : 600 }}>{fmtMoney(net)}</div>
                  </div>
                  <div className="flex-1 rounded-xl px-4 py-3 border"
                    style={{ background: m.benchmark > net ? "#f2f8ec" : "#faf8f2", borderColor: m.benchmark > net ? "rgba(63,107,58,0.4)" : "rgba(0,0,0,0.08)" }}>
                    <div className="text-[12px] font-medium" style={{ color: "#8a7a66" }}>The co-op field</div>
                    <div className="text-[24px] tracking-tight tnum" style={{ fontWeight: m.benchmark > net ? 700 : 600 }}>{fmtMoney(m.benchmark)}</div>
                  </div>
                </div>
                <div className="mb-3"><GrowthChart net={m.net} bench={m.bench} width={990} height={130} benchLabel="the co-op field" xLabels={["Day 0", "Day 48", "Day 96", `Day ${m.step}`]} /></div>
                <ul className="flex flex-col gap-2 text-[13.5px]" style={{ color: "#4a3d2e" }}>
                  <li className="flex gap-2"><Dot c="#ff9f0a" /><span>Transplanted plants live on in someone else's garden. The money moved gardener to gardener. The company never saw it.</span></li>
                  <li className="flex gap-2"><Dot c="#3f6b3a" /><span>The frost shrank every plant in town, then the warm spell grew them back. Plant count never changed. Only the price did.</span></li>
                  <li className="flex gap-2"><Dot c="#0a84ff" /><span>The co-op field holds every crop, so no single blight can ruin it. That is why it is so hard to beat.</span></li>
                </ul>
                <Actions>
                  <Btn onClick={restart}>Play again</Btn>
                  <span className="text-[12.5px] self-center" style={{ color: "#8a7a66" }}>
                    {choice === "sold" ? "Try tending through the frost this time." : "Try transplanting away in the frost and see what it costs."}
                  </span>
                </Actions>
              </Card>
            )}
          </div>
        </div>

        {/* right rail */}
        <div className="w-full max-w-xs flex flex-col gap-4">
          <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
            <div className="text-[13px] font-semibold mb-3" style={{ color: "#8a7a66" }}>In your garden</div>
            {holdings.length === 0 && (
              <div className="text-sm py-1" style={{ color: "#8a7a66" }}>
                {beat === "end" ? "Empty beds. You transplanted everything." : "Nothing planted yet."}
              </div>
            )}
            {holdings.map((h, hi) => {
              const pct = pcts[hi] ?? 0;
              const open = tradeRow === h.c.id;
              return (
                <div key={h.c.id} className="py-2 border-b border-black/5 last:border-0">
                  <button className="w-full flex items-center gap-3 text-left" disabled={!canTrade}
                    onClick={() => canTrade && setTradeRow(open ? null : h.c.id)}>
                    <img src={S(h.c.sprite)} alt="" style={{ height: 26 }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{h.c.crop}</div>
                      <div className="text-[12px] tnum" style={{ color: "#8a7a66" }}>{Math.round(h.plants)} plants · paid {fmtMoney(h.cost / Math.max(1, Math.round(h.plants)))} each</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tnum">{fmtMoney(h.value)}</div>
                      <div className="text-[12px] tnum" style={{ color: "#8a7a66" }}>{pct}%</div>
                    </div>
                  </button>
                  <div className="mt-1.5 ml-9 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: h.c.color }} />
                  </div>
                  {open && canTrade && (
                    <div className="ml-9 mt-2 flex flex-wrap items-center gap-1.5 pop-in">
                      <div className="w-full"><Sparkline width={180} height={40} data={m.history[h.c.id]} color={h.c.color} /></div>
                      <TradeChip disabled={m.cash < m.prices[h.c.id]} onClick={() => plant(h.c.id, 1)}>Plant 1</TradeChip>
                      <TradeChip onClick={() => transplant(h.c.id, 0.5)}>Transplant half</TradeChip>
                      <TradeChip onClick={() => { transplant(h.c.id, 1); setTradeRow(null); }}>Transplant all</TradeChip>
                    </div>
                  )}
                </div>
              );
            })}
            {canTrade && (
              <div className="pt-2">
                <div className="text-[11.5px] font-medium mb-1" style={{ color: "#8a7a66" }}>The market</div>
                {CROPS.filter((c) => !holdings.some((h) => h.c.id === c.id)).map((c) => {
                  const open = tradeRow === `add-${c.id}`;
                  const asset = ASSETS.find((a) => a.id === c.id)!;
                  return (
                    <div key={c.id}>
                      <button className="w-full flex items-center gap-2.5 py-1.5 text-left"
                        onClick={() => setTradeRow(open ? null : `add-${c.id}`)}>
                        <img src={S(c.sprite)} alt="" style={{ height: 22 }} />
                        <span className="text-[13px] flex-1 truncate">{c.crop}</span>
                        <span className="text-[12px] tnum" style={{ color: "#8a7a66" }}>{fmtMoney(m.prices[c.id])}</span>
                      </button>
                      {open && (
                        <div className="ml-8 mb-1.5 pop-in">
                          <div className="text-[11.5px] mb-1" style={{ color: "#8a7a66" }}>{asset.payout === "income" ? "Drops harvest baskets every few weeks." : "Grows tall. No baskets."}</div>
                          <div className="mb-1.5"><Sparkline width={180} height={40} data={m.history[c.id]} color={c.color} /></div>
                          <div className="flex gap-1.5">
                            <TradeChip disabled={m.cash < m.prices[c.id]} onClick={() => { plant(c.id, 1); setTradeRow(null); }}>Plant 1</TradeChip>
                            <TradeChip disabled={m.cash < m.prices[c.id] * 3} onClick={() => { plant(c.id, 3); setTradeRow(null); }}>Plant 3</TradeChip>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-black/8">
              <img src={S("coins")} alt="" style={{ height: 20 }} />
              <div className="text-sm flex-1" style={{ color: "#8a7a66" }}>Cash</div>
              <div className="text-sm font-semibold tnum">{fmtMoney(m.cash)}</div>
            </div>
          </div>

          {beat !== "intro" && beat !== "coins" && beat !== "plant" && (
            <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <img src={S("coop-field")} alt="" style={{ height: 30 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">The co-op field</div>
                  <div className="text-[12px]" style={{ color: "#8a7a66" }}>one row of every crop, tended by the town</div>
                </div>
                <div className="text-sm font-semibold tnum">{fmtMoney(m.benchmark)}</div>
              </div>
            </div>
          )}
          {running && m.net.length > 10 && (
            <div className="rounded-2xl bg-white border border-black/8 shadow-sm p-5">
              <div className="text-[13px] font-semibold mb-2" style={{ color: "#8a7a66" }}>Growth</div>
              <GrowthChart net={m.net} bench={m.bench} width={272} height={80} benchLabel="the co-op field" xLabels={["Day 0", `Day ${m.step}`]} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StageTag({ x, title, sub }: { x: string; title: string; sub: string }) {
  return (
    <div className="absolute text-center -translate-x-1/2" style={{ left: x, bottom: 14 }}>
      <div className="text-[13px] font-semibold tracking-tight">{title}</div>
      <div className="text-[12px] tnum" style={{ color: "#8a7a66" }}>{sub}</div>
    </div>
  );
}
