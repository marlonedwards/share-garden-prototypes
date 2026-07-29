#!/usr/bin/env python3
"""Plant-only sprites (no container) + one wide bed, for the single-bed garden."""
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
    "bed-wide":  "A long low wide wooden raised garden bed planter filled with dark tilled soil, empty, nothing planted, seen at a 3/4 isometric angle, rectangular and wide.",
    "p-tomato":  "A single tomato plant heavy with ripe red tomatoes and green leaves, NO pot and NO container, just the plant growing from the ground, roots at the base.",
    "p-corn":    "A single tall green corn stalk with a golden ear of corn, NO pot and NO container, just the stalk growing from the ground.",
    "p-carrot":  "A small cluster of carrots with leafy green tops and orange roots, NO pot and NO container, just the plants.",
    "p-pumpkin": "A single orange pumpkin on a short green vine with broad leaves, NO pot and NO container, just the plant on the ground.",
    "p-berry":   "A small round blueberry bush covered in blue berries, NO pot and NO container, just the bush.",
    "p-garlic":  "A small cluster of garlic plants with white bulbs and green shoots, NO pot and NO container, just the plants.",
    "p-pepper":  "A single pepper plant with a few red bell peppers and green leaves, NO pot and NO container, just the plant.",
    "p-sprout":  "A tiny fresh green seedling sprout with two small leaves, NO pot and NO container, just the little sprout.",
}

def load_key():
    with open(KEY_FILE) as f: return f.read().strip()

def generate(key, name, subject):
    out = OUT_DIR / f"{name}.png"
    if out.exists() and out.stat().st_size > 2000:
        print(f"skip {name}", flush=True); return True
    prompt = f"{STYLE} Subject: {subject}"
    payload = json.dumps({"model": "google/gemini-2.5-flash-image", "modalities": ["image", "text"],
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]}).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=payload,
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as resp:
                body = json.load(resp)
            images = body["choices"][0]["message"].get("images") or []
            if not images:
                print(f"WARN {name}: no image", flush=True); time.sleep(3); continue
            b64 = images[0]["image_url"]["url"].split(",", 1)[1]
            out.write_bytes(base64.b64decode(b64))
            print(f"OK   {name} ({out.stat().st_size})", flush=True); return True
        except Exception as e:
            print(f"ERR  {name} {attempt+1}: {e}", flush=True); time.sleep(4)
    return False

def main():
    key = load_key()
    for name, subj in SPRITES.items(): generate(key, name, subj)
    print("DONE plants", flush=True)

if __name__ == "__main__": main()
