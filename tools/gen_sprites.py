#!/usr/bin/env python3
"""Generate cozy-pixel game sprites for Share Garden via OpenRouter (gemini-2.5-flash-image).

Key is read from ~/maju/.claude/openrouter.key at runtime, never echoed.
Writes PNGs into public/sprites/. Idempotent: skips files that already exist.
"""
import base64, json, os, sys, time, urllib.request, pathlib

KEY_FILE = os.path.expanduser("~/maju/.claude/openrouter.key")
OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "public" / "sprites"
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Cozy pixel-art video game asset in the style of Stardew Valley. "
    "Warm earthy pastel palette, soft rim lighting, clean readable silhouette, "
    "3/4 isometric view, single object centered, generous margin, "
    "flat solid mint-cream background color #F4EFE1, no text, no words, no watermark, "
    "no border, crisp pixels, high quality. Square 1:1 framing."
)

SPRITES = {
    "bed-empty":     "An empty raised wooden garden planter box filled with dark tilled soil, ready to plant, nothing growing yet.",
    "tomato":        "A leafy tomato plant heavy with ripe red tomatoes growing in a small raised wooden garden bed.",
    "blueberry":     "A round blueberry bush covered in clusters of ripe blue berries, in a small raised wooden garden bed.",
    "corn":          "A tall green corn stalk with golden ears of corn, growing in a small raised wooden garden bed.",
    "pumpkin":       "A big round orange pumpkin on a sprawling green vine with broad leaves, in a garden patch.",
    "carrot":        "A neat row of carrots with leafy green tops, orange roots peeking from dark soil in a raised bed.",
    "garlic":        "A cluster of white garlic bulbs with green shoots growing in dark soil in a small raised bed.",
    "sprout":        "A tiny fresh green seedling sprout with two small leaves poking up from dark soil in a raised wooden bed.",
    "seed-packet":   "A small rustic paper seed packet envelope tied with twine, a few seeds spilling out.",
    "coins":         "A small pile of shiny gold coins next to a little cloth coin pouch.",
    "market-stall":  "A charming wooden farmers-market stall with a striped cream-and-sage awning and empty wooden crates.",
    "coop-field":    "A fenced communal garden field seen from above, neat rows of mixed leafy crops behind a low wooden fence.",
    "watering-can":  "A rustic metal watering can, slightly weathered, tilted as if about to pour.",
    "weed":          "A scraggly green weed with thorny leaves growing where it is not wanted in dark soil.",
}

def load_key():
    with open(KEY_FILE) as f:
        return f.read().strip()

def generate(key, name, subject):
    out = OUT_DIR / f"{name}.png"
    if out.exists() and out.stat().st_size > 2000:
        print(f"skip {name} (exists)", flush=True)
        return True
    prompt = f"{STYLE} Subject: {subject}"
    payload = json.dumps({
        "model": "google/gemini-2.5-flash-image",
        "modalities": ["image", "text"],
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    }).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=payload,
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as resp:
                body = json.load(resp)
            images = body["choices"][0]["message"].get("images") or []
            if not images:
                txt = body["choices"][0]["message"].get("content", "")
                print(f"WARN {name}: no image (attempt {attempt+1}) {str(txt)[:80]}", flush=True)
                time.sleep(3); continue
            url = images[0]["image_url"]["url"]
            b64 = url.split(",", 1)[1]
            out.write_bytes(base64.b64decode(b64))
            print(f"OK   {name} -> {out.name} ({out.stat().st_size} bytes)", flush=True)
            return True
        except Exception as e:
            print(f"ERR  {name} attempt {attempt+1}: {e}", flush=True)
            time.sleep(4)
    return False

def main():
    key = load_key()
    only = sys.argv[1:] or list(SPRITES.keys())
    ok = 0
    for name in only:
        if name in SPRITES and generate(key, name, SPRITES[name]):
            ok += 1
    print(f"\nDONE {ok}/{len(only)} sprites in {OUT_DIR}", flush=True)

if __name__ == "__main__":
    main()
