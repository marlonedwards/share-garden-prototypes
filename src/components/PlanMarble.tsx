import { useEffect, useRef } from "react";
import { drawStaticOrb } from "../lib/orbCard";
import { CompSlice } from "../lib/orbModel";

// The personal marble from the "Ready to invest?" finale, drawn with the same
// glass the rest of the Orb uses. Shared by /orb/ready (live while the student
// edits) and the /orb select screen (the saved plan beside the named orb).
export default function PlanMarble({
  slices,
  total,
  size,
  ariaLabel,
}: {
  slices: CompSlice[];
  total: number;
  size: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    const r = total > 0
      ? Math.max(size * 0.16, Math.min(size * 0.4, size * 0.045 * Math.sqrt(total / 50)))
      : size * 0.26;
    drawStaticOrb(ctx, size / 2, size / 2 - size * 0.04, r, slices);
  }, [slices, total, size]);
  return <canvas ref={ref} style={{ width: size, height: size, maxWidth: "100%" }} aria-label={ariaLabel} />;
}
