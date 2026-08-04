#!/usr/bin/env python3
"""Generate cozy-pixel game sprites for Share Garden via OpenRouter (openai/gpt-image-1).

Uses OpenRouter's dedicated Image API (POST /api/v1/images), which returns
base64-encoded image bytes. Key is read from ~/maju/.claude/openrouter.key at
runtime, never echoed. Writes PNGs into public/sprites/gpt/ so the original
Gemini set in public/sprites/ stays as fallback. Idempotent: skips files that
already exist. If a PNG lands over ~400KB it is downscaled in place with sips.
"""
import base64, json, os, subprocess, sys, time, urllib.error, urllib.request, pathlib

KEY_FILE = os.path.expanduser("~/maju/.claude/openrouter.key")
OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "public" / "sprites" / "gpt"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "openai/gpt-image-1"
MAX_BYTES = 400_000  # downscale target ceiling

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
    "stake-tag":     "A small wooden garden stake with a blank hanging price tag tied to it with twine, stuck in dark soil.",
    "cart":          "A small rustic wooden hand cart / wheelbarrow used to carry a plant, empty, side view.",
}

def load_key():
    with open(KEY_FILE) as f:
        return f.read().strip()

def post_images(key, payload):
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/images",
        data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.load(resp)

def shrink_if_needed(out):
    if out.stat().st_size <= MAX_BYTES:
        return
    for edge in (512, 384, 256):
        subprocess.run(["sips", "-Z", str(edge), str(out)],
                       check=True, capture_output=True)
        if out.stat().st_size <= MAX_BYTES:
            break
    print(f"     shrunk {out.name} -> {out.stat().st_size} bytes", flush=True)

def generate(key, name, subject):
    out = OUT_DIR / f"{name}.png"
    if out.exists() and out.stat().st_size > 2000:
        print(f"skip {name} (exists)", flush=True)
        return True
    prompt = f"{STYLE} Subject: {subject}"
    rich = {"model": MODEL, "prompt": prompt, "quality": "medium",
            "output_format": "png", "aspect_ratio": "1:1"}
    minimal = {"model": MODEL, "prompt": prompt}
    for attempt, payload in enumerate((rich, minimal)):
        try:
            body = post_images(key, payload)
            data = body.get("data") or []
            b64 = data[0].get("b64_json") if data else None
            if not b64:
                print(f"WARN {name}: no image in response (attempt {attempt+1})", flush=True)
                time.sleep(3)
                continue
            out.write_bytes(base64.b64decode(b64))
            shrink_if_needed(out)
            print(f"OK   {name} -> {out.name} ({out.stat().st_size} bytes)", flush=True)
            return True
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode()[:200]
            except Exception:
                pass
            print(f"ERR  {name} attempt {attempt+1}: HTTP {e.code} {detail}", flush=True)
            time.sleep(4)
        except Exception as e:
            print(f"ERR  {name} attempt {attempt+1}: {e}", flush=True)
            time.sleep(4)
    return False

def main():
    key = load_key()
    only = sys.argv[1:] or list(SPRITES.keys())
    ok, failed = 0, []
    for name in only:
        if name not in SPRITES:
            print(f"?? unknown sprite {name}", flush=True)
            continue
        if generate(key, name, SPRITES[name]):
            ok += 1
        else:
            failed.append(name)
        time.sleep(2)  # be polite between calls
    print(f"\nDONE {ok}/{len(only)} sprites in {OUT_DIR}", flush=True)
    if failed:
        print("FAILED: " + ", ".join(failed), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
