import { useEffect, useState } from "react";

// Sprites are generated on a flat mint background. We sample the top-left
// corner and knock out near-matching pixels to transparent so crops composite
// cleanly onto the garden scene.
const BASE = import.meta.env.BASE_URL;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

export function knockout(img: HTMLImageElement, tol = 42): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const r0 = d[0], g0 = d[1], b0 = d[2];
  // flood-ish: any pixel close to the corner colour, and touching edges via
  // simple colour distance (bg is uniform so a global threshold is enough).
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - r0, dg = d[i + 1] - g0, db = d[i + 2] - b0;
    if (Math.sqrt(dr * dr + dg * dg + db * db) < tol) d[i + 3] = 0;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

export type SpriteMap = Record<string, HTMLCanvasElement>;

// Preload + knock out a set of sprite keys; returns null until all are ready.
export function useSprites(keys: string[], tol = 42): SpriteMap | null {
  const [map, setMap] = useState<SpriteMap | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(keys.map((k) => loadImage(`${BASE}sprites/${k}.png`).then((img) => [k, knockout(img, tol)] as const)))
      .then((pairs) => { if (alive) setMap(Object.fromEntries(pairs)); })
      .catch(() => { if (alive) setMap({}); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(","), tol]);
  return map;
}

export function spriteUrl(key: string): string { return `${BASE}sprites/${key}.png`; }

// Preload a set of sprites, knock out the flat background, and return a map of
// key -> transparent data URL. Falls back to the raw url per-key until ready.
export function useSpriteUrls(keys: string[], tol = 46): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(keys.map((k) =>
      loadImage(`${BASE}sprites/${k}.png`).then((img) => [k, knockout(img, tol).toDataURL("image/png")] as const).catch(() => [k, `${BASE}sprites/${k}.png`] as const)
    )).then((pairs) => { if (alive) setMap(Object.fromEntries(pairs)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(","), tol]);
  return map;
}
