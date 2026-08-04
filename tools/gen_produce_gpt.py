#!/usr/bin/env python3
"""Plant-only sprites (no soil plot) via gpt-image-1 on OpenRouter."""
import base64, json, os, pathlib, subprocess, time, urllib.request

KEY = open(os.path.expanduser("~/maju/.claude/openrouter.key")).read().strip()
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "sprites" / "gpt" / "produce"
OUT.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Cozy pixel-art video game asset in the style of Stardew Valley. "
    "Warm earthy pastel palette, soft rim lighting, clean readable silhouette, "
    "single isolated plant only, NO soil bed, NO planter box, NO pot, NO ground plane, "
    "just the plant itself centered with generous margin, "
    "flat solid mint-cream background color #F4EFE1, no text, no watermark, no border, "
    "crisp pixels, high quality. Square 1:1 framing."
)

SPRITES = {
    "produce-tomato":   "One single ripe red tomato fruit with a small green stem, nothing else.",
    "produce-tomatoes": "A small pile of three ripe red tomatoes, nothing else.",
    "produce-pumpkin":  "One single orange pumpkin fruit with a short stem, no vine, nothing else.",
    "produce-corn":     "Two golden ears of corn with husks pulled back, nothing else.",
    "produce-berries":  "A small heap of ripe blueberries, nothing else.",
    "basket-full":      "A round wicker harvest basket heaped with colorful vegetables and fruit.",
    "plant-dead":       "One withered dead plant, gray-brown drooping stems and dry leaves, no pot, no soil bed.",
}

for name, desc in SPRITES.items():
    dest = OUT / f"{name}.png"
    if dest.exists():
        print("skip", name); continue
    body = json.dumps({"model": "openai/gpt-image-1", "prompt": STYLE + " " + desc,
                       "quality": "medium", "output_format": "png", "aspect_ratio": "1:1"}).encode()
    req = urllib.request.Request("https://openrouter.ai/api/v1/images", data=body,
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = json.load(r)
            b64 = data["data"][0]["b64_json"]
            dest.write_bytes(base64.b64decode(b64))
            subprocess.run(["sips", "-Z", "512", str(dest)], capture_output=True)
            print("ok", name, dest.stat().st_size)
            break
        except Exception as e:
            print("retry" if attempt == 0 else "FAIL", name, str(e)[:120])
            time.sleep(3)
    time.sleep(2)
