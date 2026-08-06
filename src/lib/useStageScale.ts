import { useEffect, useState } from "react";

// Scale-to-fit for the fixed-width orb stage. The scene keeps its full-width
// internal geometry and shrinks as one picture on narrow screens, so no route
// ever scrolls sideways. The caller wraps the stage in a box sized to the
// scaled dimensions and applies `transform: scale(s)` with a top-left origin.
export function useStageScale(stageW: number): number {
  const fit = () => {
    // matches the play pages' main padding: px-4 below the sm breakpoint,
    // sm:px-8 above it
    const pad = window.innerWidth < 640 ? 32 : 64;
    return Math.min(1, (window.innerWidth - pad) / stageW);
  };
  const [scale, setScale] = useState(fit);
  useEffect(() => {
    const onResize = () => setScale(fit());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageW]);
  return scale;
}
