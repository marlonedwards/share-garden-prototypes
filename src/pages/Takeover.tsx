// Takeover: agario with company logos. Contract: docs/takeover-spec.md.
// The engine (src/lib/takeover/engine.ts) owns the rules; this page owns the
// canvas, the HUD, and the end cards.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BURN_PER_SEC, TakeoverRun, radiusOf, START_VALUE } from "../lib/takeover/engine";
import { fmtMoney, rankBeaten, type TakeoverCompany } from "../data/takeoverCompanies";
import { UI_FONT, uiFont } from "../lib/type";

// Baked logo cache: public/logos/<short>.png, one Image per company, misses
// remembered so the brand-color disc renders without retrying every frame.
const logoCache = new Map<string, HTMLImageElement | null>();
function logoFor(short: string): HTMLImageElement | null {
  if (logoCache.has(short)) {
    const img = logoCache.get(short)!;
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  // encodeURI, not encodeURIComponent: the static server does not decode %26,
  // so at&t, j&j, p&g and d&b would silently lose their baked logos.
  img.src = encodeURI(`${import.meta.env.BASE_URL}logos/${short}.png`);
  img.onerror = () => logoCache.set(short, null);
  logoCache.set(short, img);
  return null;
}

function labelColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#10141B" : "#F4F7FB";
}

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export default function Takeover() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<TakeoverRun | null>(null);
  const retryRef = useRef(0);
  const cursorScreen = useRef({ x: innerWidth / 2, y: innerHeight / 2 - 120 });
  const camera = useRef({ x: 0, y: 0, zoom: 1 });
  const [hud, setHud] = useState({ worth: START_VALUE, meals: 0, flash: "" });
  const [over, setOver] = useState<TakeoverRun["over"]>(null);
  const [, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [companyName, setCompanyName] = useState(
    () => localStorage.getItem("takeover-name") ?? "",
  );


  const newRun = () => {
    retryRef.current += 1;
    const name = (localStorage.getItem("takeover-name") ?? "").trim();
    const run = new TakeoverRun(daySeed() + retryRef.current * 7919, name);
    runRef.current = run;
    (window as unknown as { __takeover?: { run: TakeoverRun } }).__takeover = { run };
    setOver(null);
    setRound((r) => r + 1);
  };

  const start = () => {
    const name = companyName.trim();
    if (!name) return;
    localStorage.setItem("takeover-name", name);
    setStarted(true);
    newRun();
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
    };
    resize();
    addEventListener("resize", resize);

    const toWorld = (sx: number, sy: number) => {
      const c = camera.current;
      return {
        x: c.x + (sx - innerWidth / 2) / c.zoom,
        y: c.y + (sy - innerHeight / 2) / c.zoom,
      };
    };

    const onMove = (e: MouseEvent) => {
      cursorScreen.current = { x: e.clientX, y: e.clientY };
    };
    const doSplit = () => {
      const run = runRef.current;
      if (!run || run.over) return;
      const w = toWorld(cursorScreen.current.x, cursorScreen.current.y);
      run.split(w.x, w.y);
    };
    const onClick = () => doSplit();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        doSplit();
      }
    };
    addEventListener("mousemove", onMove);
    addEventListener("click", onClick);
    addEventListener("keydown", onKey);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const run = runRef.current;
      if (!run) return;

      if (!run.over) {
        const w = toWorld(cursorScreen.current.x, cursorScreen.current.y);
        run.step(dt, w.x, w.y);
        if (run.over) setOver(run.over);
      }

      // Camera follows the player and eases its zoom to the player's size.
      const cells = run.cells;
      if (cells.length) {
        const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;
        const cy = cells.reduce((s, c) => s + c.y, 0) / cells.length;
        const maxR = Math.max(...cells.map((c) => radiusOf(c.value)));
        // Close enough that the player is a real presence, wide enough that
        // the arena is populated and the giants are on screen rather than
        // looming just past the edge of the world.
        const targetZoom = Math.max(0.4, Math.min(1.25, 150 / (maxR + 40)));
        const cam = camera.current;
        cam.x += (cx - cam.x) * Math.min(1, dt * 5);
        cam.y += (cy - cam.y) * Math.min(1, dt * 5);
        cam.zoom += (targetZoom - cam.zoom) * Math.min(1, dt * 2);
      }

      draw(ctx, run);

      const latestFlash = run.flashes.length ? run.flashes[run.flashes.length - 1] : null;
      const flashText = latestFlash && run.elapsed - latestFlash.at < 2.2 ? latestFlash.text : "";
      setHud((h) =>
        h.worth === run.worth && h.meals === run.eaten.length + run.ateLocals && h.flash === flashText
          ? h
          : { worth: run.worth, meals: run.eaten.length + run.ateLocals, flash: flashText },
      );
    };

    // Text drawn inside the moving world transform lands on fractional pixels
    // every frame and smears while the camera glides. So the world pass draws
    // only shapes, and every label is queued and drawn afterwards in screen
    // space at integer pixels with a floor on its real on-screen size.
    interface LabelSpec {
      wx: number; // world anchor
      wy: number;
      dy: number; // extra offset in SCREEN pixels
      text: string;
      size: number; // screen pixels
      color: string;
      weight?: number;
      alpha?: number;
      maxW?: number; // screen pixels
      baseline?: CanvasTextBaseline;
    }

    const draw = (g: CanvasRenderingContext2D, run: TakeoverRun) => {
      const cam = camera.current;
      const labels: LabelSpec[] = [];
      const clampFs = (worldPx: number, min: number, max: number) =>
        Math.round(Math.max(min, Math.min(worldPx * cam.zoom, max)));
      g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.fillStyle = "#090C10";
      g.fillRect(0, 0, innerWidth, innerHeight);
      g.translate(innerWidth / 2, innerHeight / 2);
      g.scale(cam.zoom, cam.zoom);
      g.translate(-cam.x, -cam.y);

      // Dot grid.
      const gap = 90;
      const x0 = Math.floor((cam.x - innerWidth / cam.zoom / 2) / gap) * gap;
      const y0 = Math.floor((cam.y - innerHeight / cam.zoom / 2) / gap) * gap;
      const x1 = cam.x + innerWidth / cam.zoom / 2;
      const y1 = cam.y + innerHeight / cam.zoom / 2;
      g.fillStyle = "#1B2330";
      for (let x = x0; x < x1; x += gap)
        for (let y = y0; y < y1; y += gap) g.fillRect(x - 1, y - 1, 2, 2);

      // Deals: dotted rings with their value.
      for (const deal of run.deals) {
        const r = 20;
        g.strokeStyle = "#3A4656";
        g.setLineDash([4, 4]);
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(deal.x, deal.y, r, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        labels.push({
          wx: deal.x,
          wy: deal.y,
          dy: r * cam.zoom + 12,
          text: `+${fmtMoney(deal.value)}`,
          size: 12,
          color: "#5B6979",
        });
      }

      // Companies, small first so big discs draw over. Real companies wear
      // their baked logo warped onto the bubble; locals stay labeled discs.
      const sorted = [...run.companies].sort((a, b) => a.cap - b.cap);
      for (const blob of sorted) {
        const r = radiusOf(blob.cap);
        const logo = blob.c.local ? null : logoFor(blob.c.short);
        g.fillStyle = blob.c.color;
        g.beginPath();
        g.arc(blob.x, blob.y, r, 0, Math.PI * 2);
        g.fill();
        if (logo) {
          g.save();
          g.beginPath();
          g.arc(blob.x, blob.y, r, 0, Math.PI * 2);
          g.clip();
          g.drawImage(logo, blob.x - r, blob.y - r, r * 2, r * 2);
          // a soft sphere shade so the flat logo reads as a bubble
          const sheen = g.createRadialGradient(
            blob.x - r * 0.35, blob.y - r * 0.35, r * 0.1, blob.x, blob.y, r,
          );
          sheen.addColorStop(0, "rgba(255,255,255,0.18)");
          sheen.addColorStop(0.55, "rgba(255,255,255,0)");
          sheen.addColorStop(1, "rgba(0,0,0,0.28)");
          g.fillStyle = sheen;
          g.fillRect(blob.x - r, blob.y - r, r * 2, r * 2);
          g.restore();
          g.strokeStyle = blob.c.color;
          g.lineWidth = 2;
          g.beginPath();
          g.arc(blob.x, blob.y, r, 0, Math.PI * 2);
          g.stroke();
          if (blob.levered) {
            g.strokeStyle = "#E5484D";
            g.lineWidth = 3;
            g.setLineDash([9, 7]);
            g.beginPath();
            g.arc(blob.x, blob.y, r + 6, 0, Math.PI * 2);
            g.stroke();
            g.setLineDash([]);
          }
          // The caption is the company's real name. `short` is a logo file
          // key ("mcd", "bofa") and is never shown as a name.
          labels.push({
            wx: blob.x,
            wy: blob.y,
            dy: r * cam.zoom + 14,
            text: `${blob.c.name} ${fmtMoney(blob.cap)}`,
            size: 14,
            color: "#D7DEE8",
            weight: 600,
            maxW: Math.max(r * 3 * cam.zoom, 130),
          });
        } else {
          const fs = clampFs(r * 0.42, 12, 34);
          labels.push({
            wx: blob.x,
            wy: blob.y,
            dy: -fs * 0.2,
            // No logo, so the words sit inside the disc. A local's `short` is
            // its own label standing alone ("Food truck"); a listed company
            // without art still shows its real name.
            text: blob.c.local ? blob.c.short : blob.c.name,
            size: fs,
            color: labelColor(blob.c.color),
            weight: 600,
            maxW: r * 1.7 * cam.zoom,
          });
          labels.push({
            wx: blob.x,
            wy: blob.y,
            dy: fs * 0.75,
            text: fmtMoney(blob.cap),
            size: Math.max(12, Math.round(fs * 0.55)),
            color: labelColor(blob.c.color),
            alpha: 0.8,
            maxW: r * 1.7 * cam.zoom,
          });
        }
      }

      // Red trouble draws over the companies: a hazard hiding behind a big
      // bubble would be an unfair death, so the red is always visible.
      for (const hz of run.hazards) {
        g.fillStyle = "rgba(229,72,77,0.2)";
        g.beginPath();
        g.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#E5484D";
        g.lineWidth = 2.5;
        g.stroke();
        const words = hz.label.split(" ");
        const maxW = hz.r * 1.9 * cam.zoom;
        if (words.length > 2) {
          labels.push({ wx: hz.x, wy: hz.y, dy: -9, text: words.slice(0, 2).join(" "), size: 13, color: "#FFB3B5", weight: 600, maxW });
          labels.push({ wx: hz.x, wy: hz.y, dy: 9, text: words.slice(2).join(" "), size: 13, color: "#FFB3B5", weight: 600, maxW });
        } else {
          labels.push({ wx: hz.x, wy: hz.y, dy: 0, text: hz.label, size: 13, color: "#FFB3B5", weight: 600, maxW });
        }
      }

      // Player cells on top: dark disc, white ring.
      run.cells.forEach((cell, i) => {
        const r = radiusOf(cell.value);
        g.fillStyle = "#10141B";
        g.beginPath();
        g.arc(cell.x, cell.y, r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#E8EDF4";
        g.lineWidth = 2.5;
        g.stroke();
        if (run.elapsed < run.debtUntil) {
          g.strokeStyle = "#E5484D";
          g.lineWidth = 3;
          g.setLineDash([8, 6]);
          g.beginPath();
          g.arc(cell.x, cell.y, r + 7, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
        }
        if (i === 0) {
          const fs = clampFs(r * 0.34, 13, 26);
          const maxW = r * 1.8 * cam.zoom;
          labels.push({ wx: cell.x, wy: cell.y, dy: -fs * 0.25, text: run.playerName, size: fs, color: "#E8EDF4", weight: 600, maxW });
          labels.push({ wx: cell.x, wy: cell.y, dy: fs * 0.85, text: fmtMoney(cell.value), size: Math.round(fs * 0.8), color: "#4ADE80", maxW });
        }
      });

      // Screen-space text pass: integer pixels, no transform, no smear.
      g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      g.textAlign = "center";
      for (const l of labels) {
        const sx = Math.round((l.wx - cam.x) * cam.zoom + innerWidth / 2);
        const sy = Math.round((l.wy - cam.y) * cam.zoom + innerHeight / 2 + l.dy);
        g.font = uiFont(Math.round(l.size), l.weight ?? 400);
        g.fillStyle = l.color;
        g.globalAlpha = l.alpha ?? 1;
        g.textBaseline = l.baseline ?? "middle";
        if (l.maxW) g.fillText(l.text, sx, sy, Math.max(l.maxW, 30));
        else g.fillText(l.text, sx, sy);
      }
      g.globalAlpha = 1;
      g.textBaseline = "middle";
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("mousemove", onMove);
      removeEventListener("click", onClick);
      removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = runRef.current;

  return (
    <div className="fixed inset-0 select-none" style={{ background: "#0C0F14", fontFamily: UI_FONT }}>
      <canvas ref={canvasRef} data-takeover-arena className="absolute inset-0" />

      {/* The timer lost its label, so the two numbers line up on their bottoms. */}
      <div className="absolute top-0 inset-x-0 flex items-end justify-between px-5 py-4 pointer-events-none">
        <div>
          <div className="text-[15px]" style={{ color: "#5B6979" }}>
            {run?.playerName ?? ""}
          </div>
          <div
            data-worth
            className="text-[32px] font-semibold tabular-nums"
            style={{ color: "#4ADE80" }}
          >
            {fmtMoney(hud.worth)}
          </div>
          <div className="text-[15px] tabular-nums" style={{ color: "#C4676B" }}>
            Payroll {fmtMoney(hud.worth * BURN_PER_SEC)} a second
          </div>
        </div>
        <div className="text-right">
          <div className="text-[32px] font-semibold tabular-nums" style={{ color: "#E8EDF4" }}>
            {hud.meals}
          </div>
          <div className="text-[15px]" style={{ color: "#5B6979" }}>
            {hud.meals === 1 ? "company eaten" : "companies eaten"}
          </div>
        </div>
      </div>

      {hud.flash && !over && (
        <div className="absolute top-20 inset-x-0 text-center pointer-events-none">
          <span
            className="inline-block px-5 py-2 rounded-full text-[18px]"
            style={{ background: "#1F2733", color: "#E8B84B" }}
          >
            {hud.flash}
          </span>
        </div>
      )}

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none text-[13px]" style={{ color: "#5B6979" }}>
        Eat every company smaller than you.
      </div>

      <Link
        to="/"
        className="absolute bottom-4 left-5 text-[13px] hover:underline"
        style={{ color: "#5B6979" }}
      >
        Back
      </Link>

      {!started && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(9,12,16,0.86)" }}
        >
          <form
            data-startcard
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
            className="w-[420px] max-w-[92vw] rounded-2xl p-7"
            style={{ background: "#0C0F14", border: "1px solid #1F2733", color: "#D7DEE8" }}
          >
            <div className="text-[26px] font-semibold" style={{ color: "#E8EDF4" }}>
              Takeover
            </div>
            <div className="mt-1 text-[15px]" style={{ color: "#8A97A8" }}>
              Name your company.
            </div>
            <input
              data-name-input
              autoFocus
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value.slice(0, 24))}
              placeholder="Crumb Cakes"
              className="mt-4 w-full rounded-lg px-4 py-3 text-[16px] outline-none"
              style={{
                background: "#090C10",
                border: "1px solid #1F2733",
                color: "#E8EDF4",
                fontFamily: UI_FONT,
              }}
            />
            <div className="mt-2 text-[13px]" style={{ color: "#5B6979" }}>
              You steer with the mouse.
            </div>
            <button
              data-start
              type="submit"
              disabled={!companyName.trim()}
              className="mt-5 px-5 py-2 rounded-lg text-[14px] font-semibold disabled:opacity-40"
              style={{ background: "#4ADE80", color: "#0C0F14" }}
            >
              Open for business
            </button>
          </form>
        </div>
      )}

      {over && run && (
        <EndCard over={over} run={run} onRetry={newRun} />
      )}
    </div>
  );
}

function EndCard({
  over,
  run,
  onRetry,
}: {
  over: NonNullable<TakeoverRun["over"]>;
  run: TakeoverRun;
  onRetry: () => void;
}) {
  const worth = run.finalWorth;
  const beaten = rankBeaten(worth);
  // Where the money came from, biggest acquisition first, and what it cost to
  // hold. Every figure is what the company was worth at the moment you took
  // it, so the rows add up to the ledger the engine kept.
  const bought = [...run.eaten].sort((a, b) => b.value - a.value);
  const top = bought.slice(0, 5);
  const rest = bought.slice(5).reduce((sum, e) => sum + e.value, 0);
  const otherGains = run.gainedLocals + run.gainedDeals + rest;
  const meals = run.eaten.length
    ? `ate ${run.eaten.length} ${run.eaten.length === 1 ? "company" : "companies"}`
    : run.ateLocals
      ? `ate ${run.ateLocals} local ${run.ateLocals === 1 ? "business" : "businesses"}`
      : "";
  const shareLine = meals
    ? `Takeover ${fmtMoney(worth)}, ${meals}.`
    : `Takeover ${fmtMoney(worth)}.`;
  const headline =
    over.kind === "won"
      ? "You own the market"
      : over.kind === "acquired"
        ? `Acquired by ${over.by.name}`
        : `Bankrupted by ${over.by}`;

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(9,12,16,0.82)" }}>
      <div
        data-endcard
        className="w-[440px] max-w-[92vw] rounded-2xl p-7"
        style={{ background: "#0C0F14", border: "1px solid #1F2733", color: "#D7DEE8" }}
      >
        <div className="text-[28px] font-semibold" style={{ color: "#E8EDF4" }}>
          {headline}
        </div>
        <div className="mt-3 text-[16px] tabular-nums">
          Final worth <span style={{ color: "#4ADE80" }}>{fmtMoney(worth)}</span>
        </div>
        {over.kind !== "won" && (
          <div className="mt-1 text-[14px] tabular-nums" style={{ color: "#5B6979" }}>
            Lasted {Math.round(run.elapsed)} seconds
          </div>
        )}
        {beaten > 0 && (
          <div className="mt-1 text-[14px] tabular-nums" style={{ color: "#E8B84B" }}>
            Bigger than {beaten} of the S&amp;P 500
          </div>
        )}
        <div className="mt-5 text-[14px]" style={{ color: "#8794A6" }}>
          What you bought
        </div>
        <div className="mt-1.5 text-[14px]">
          {top.map((e, i) => (
            <div key={`${e.c.name}-${i}`} className="flex items-baseline justify-between py-[3px]">
              <span style={{ color: "#D7DEE8" }}>{e.c.name}</span>
              <span className="tabular-nums" style={{ color: "#8794A6" }}>
                {fmtMoney(e.value)}
                <span style={{ color: "#5B6979" }}>
                  {"  "}
                  {Math.round((e.value / Math.max(worth, 1)) * 100)}%
                </span>
              </span>
            </div>
          ))}
          {otherGains > 0 && (
            <div className="flex items-baseline justify-between py-[3px]">
              <span style={{ color: "#8794A6" }}>
                {bought.length > 5 ? `${bought.length - 5} smaller companies, deals and locals` : "Deals and local businesses"}
              </span>
              <span className="tabular-nums" style={{ color: "#8794A6" }}>
                {fmtMoney(otherGains)}
                <span style={{ color: "#5B6979" }}>
                  {"  "}
                  {Math.round((otherGains / Math.max(worth, 1)) * 100)}%
                </span>
              </span>
            </div>
          )}
          {run.lostToCosts > 0 && (
            <div
              className="flex items-baseline justify-between py-[3px] mt-1 pt-2"
              style={{ borderTop: "1px solid #1F2733" }}
            >
              <span style={{ color: "#C4676B" }}>Payroll, audits and lawsuits</span>
              <span className="tabular-nums" style={{ color: "#C4676B" }}>
                -{fmtMoney(run.lostToCosts)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-5 text-[13px]" style={{ color: "#5B6979" }}>
          {shareLine}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            data-retry
            onClick={onRetry}
            className="px-5 py-2 rounded-lg text-[14px] font-semibold"
            style={{ background: "#4ADE80", color: "#0C0F14" }}
          >
            Play again
          </button>
          <Link
            to="/"
            className="px-5 py-2 rounded-lg text-[14px]"
            style={{ border: "1px solid #1F2733", color: "#5B6979" }}
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
