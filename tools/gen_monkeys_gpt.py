#!/usr/bin/env python3
"""Monkey Trade art: suited cartoon monkey poses and darts via OpenRouter (openai/gpt-image-1).

Each batch is ONE sprite sheet per kind so every pose shares a single generation
context and the character does not drift. The sheet is sliced here, not by hand:
content aware segmentation finds the figures, normalises them onto a common
baseline and scale, keys the flat warm white ground to transparent, and writes
512x512 PNGs.

Key is read from ~/maju/.claude/openrouter.key at runtime and never echoed.

Usage
  gen_monkeys_gpt.py --batch 1                 fresh candidate sheets -> public/monkey/candidates/batch1/
  gen_monkeys_gpt.py --batch 2 --kind monkey   only the monkey sheet
  gen_monkeys_gpt.py --batch 2 --variant b     alternate prompt wording
  gen_monkeys_gpt.py --promote 2               slice + copy batch 2 into public/monkey/
  gen_monkeys_gpt.py --promote 2 --only monkey-idle,monkey-cheer,monkey-slump
  gen_monkeys_gpt.py --cleanup --keep 2        delete every candidate batch but 2

Idempotent: existing outputs are skipped unless --force.
"""
import argparse
import base64
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request

from PIL import Image, ImageChops, ImageDraw

KEY_FILE = os.path.expanduser("~/maju/.claude/openrouter.key")
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "monkey"
CAND_DIR = OUT_DIR / "candidates"

MODEL = "openai/gpt-image-1"
QUALITY = "high"
MAX_BYTES = 400_000
GROUND = (255, 251, 242)  # #FFFBF2, the game's ground
KEY_RGB = (255, 0, 255)   # flood fill marker, never a monkey colour
CELL = 512

CHARACTER = (
    "The character is one friendly chunky cartoon monkey mascot in a business suit: "
    "a big rounded head, large round friendly eyes, a warm tan muzzle and tan ears, "
    "medium brown fur, a dark navy suit jacket, a white shirt, and a plain flat "
    "medium grey tie with no pattern. Flat solid colours, no gradients, no texture, "
    "no cross hatching, thick clean dark outlines of even weight, chunky friendly "
    "proportions, the warm confident mascot look of a modern language learning app. "
    "Exactly the same character in every cell: same fur colour, same navy suit, same "
    "white shirt, same plain grey tie, same face, same proportions, same height, same "
    "line weight, same two hands and two feet with the same simple rounded fingers."
)

BACKGROUND = (
    "The background is the most important instruction: every single pixel of the image "
    "that is not part of a drawn figure must be exactly the same flat pale warm white, "
    "hex #FFFBF2, an almost white cream. Pure flat fill, edge to edge, corner to corner. "
    "No gradient, no vignette, no radial light, no colour wash, no gold, no orange, no "
    "brown, no beige, no paper texture, no noise, no backdrop, no scenery, no floor line. "
    "Nothing behind the figures at all. "
)

CLEANLINESS = (
    "Absolutely no text, no letters, no numbers, no words, no labels, no captions, "
    "no speech bubbles, no signature, no watermark, no logo. No grid lines, no cell "
    "borders, no frames, no panel outlines, no dividing rules of any kind. "
    "No shadows anywhere: no drop shadow, no cast shadow, no ground shadow, no contact "
    "shadow, no soft glow, no halo or darkening of the background around a figure. The "
    "background stays the same flat #FFFBF2 right up to the outline of each figure. "
    "Even spacing between cells, generous margin around every figure, every figure "
    "complete and fully inside its own cell, nothing cropped, nothing touching or "
    "overlapping a neighbouring figure."
)

MONKEY_POSES = (
    "Cell 1, top left: standing idle and facing the viewer, arms relaxed at the sides, "
    "a small calm smile. "
    "Cell 2, top middle: winding up to throw a dart, body turned to the side, one arm "
    "cocked back beside the head holding a small dart between the fingers, the other "
    "arm pointing forward, weight on the back foot, eyes focused. "
    "Cell 3, top right: cheering in victory, both arms thrown straight up above the "
    "head, a wide open happy smile, eyes squeezed shut with joy, up on the toes. "
    "Cell 4, bottom left: slumped in defeat, shoulders dropped low, head hanging down, "
    "both arms limp at the sides, mouth turned down, knees slightly bent. "
    "Cell 5, bottom middle: talking, standing facing the viewer with one hand raised "
    "open beside the head in a friendly explaining gesture, the other hand at the side, "
    "mouth open mid sentence, eyebrows lifted. "
    "Cell 6, bottom right: completely empty, nothing at all, only the flat warm white "
    "background."
)

MONKEY_POSES_B = (
    "Read the cells left to right, top row first. "
    "1 idle: the monkey stands square to the viewer, arms hanging relaxed, small smile, "
    "a neutral resting pose. "
    "2 throw: the monkey is mid wind up, turned in profile, the throwing arm bent back "
    "behind the ear with a small dart pinched in the fingers, the free arm stretched "
    "out toward the target, one knee lifted. "
    "3 cheer: the monkey celebrates, both fists punched high above the head, feet apart, "
    "huge open grin, happy closed curved eyes. "
    "4 slump: the monkey has lost, the whole body sags, head down and chin near the "
    "chest, arms dangling straight down, sad downturned mouth, tail drooping. "
    "5 talk: the monkey is speaking to you, facing forward, one palm open and lifted "
    "beside the head as if explaining, mouth open, friendly raised eyebrows. "
    "6: nothing, an empty cell of plain background."
)

DART_SUBJECTS = (
    "Cell 1, left: a single dart seen from the side, lying horizontal with the sharp "
    "steel tip pointing left, a chunky navy blue barrel, a slim shaft, and two bright "
    "gold flight fins at the tail. "
    "Cell 2, right: the same dart stuck into a surface, seen at a three quarter angle "
    "from above, the tip embedded in a small flat rounded warm grey patch so only the "
    "barrel, shaft and gold fins stand out of it, angled up and to the right, with a "
    "tiny flat oval shadow under it."
)

SHEETS = {
    "monkey": {
        "sheet": "sheet-monkey.png",
        "grid": (3, 2),
        "names": ["monkey-idle", "monkey-throw", "monkey-cheer", "monkey-slump", "monkey-talk"],
        "align": "bottom",
        "prompt": lambda poses: (
            BACKGROUND +
            "One single flat vector cartoon sprite sheet image laid out as a clean grid of "
            "3 equal columns by 2 equal rows, six cells of the same size. " + CHARACTER +
            " Poses. " + poses + " " + CLEANLINESS +
            " Full body head to feet, every figure standing upright at the same scale on the "
            "same invisible baseline, drawn as flat cartoon vector art."
        ),
        "poses": {"a": MONKEY_POSES, "b": MONKEY_POSES_B},
    },
    "dart": {
        "sheet": "sheet-dart.png",
        "grid": (2, 1),
        "names": ["dart", "dart-pinned"],
        "align": "center",
        "prompt": lambda poses: (
            BACKGROUND +
            "One single flat vector cartoon sprite sheet image laid out as a clean grid of "
            "2 equal cells side by side. Both cells show the same dart object drawn in the "
            "same style: chunky flat solid colours, no gradients, thick clean dark outlines "
            "of even weight, the bold friendly look of a modern mobile game asset. " + poses +
            " " + CLEANLINESS
        ),
        "poses": {"a": DART_SUBJECTS, "b": DART_SUBJECTS},
    },
}


# ---------------------------------------------------------------- generation

def load_key():
    with open(KEY_FILE) as f:
        return f.read().strip()


def post_images(key, payload):
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/images",
        data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        return json.load(resp)


def generate_sheet(key, kind, dest, variant="a", force=False):
    spec = SHEETS[kind]
    if dest.exists() and dest.stat().st_size > 4000 and not force:
        print("skip sheet %s (exists)" % dest.name, flush=True)
        return True
    prompt = spec["prompt"](spec["poses"].get(variant, spec["poses"]["a"]))
    cols, rows = spec["grid"]
    ratio = "3:2" if cols > rows else "1:1"
    size = "1536x1024" if cols > rows else "1024x1024"
    # gpt-image-1 can render a genuinely transparent ground, which beats keying a
    # flat colour: the model has repeatedly ignored a named background hex.
    ladder = [
        {"model": MODEL, "prompt": prompt, "quality": QUALITY, "background": "transparent",
         "output_format": "png", "aspect_ratio": ratio},
        {"model": MODEL, "prompt": prompt, "quality": QUALITY, "background": "transparent",
         "output_format": "png", "size": size},
        {"model": MODEL, "prompt": prompt, "quality": QUALITY,
         "output_format": "png", "aspect_ratio": ratio},
        {"model": MODEL, "prompt": prompt},
    ]
    for attempt, payload in enumerate(ladder):
        try:
            body = post_images(key, payload)
            data = body.get("data") or []
            b64 = data[0].get("b64_json") if data else None
            if not b64:
                print("WARN %s: no image in response (attempt %d)" % (kind, attempt + 1), flush=True)
                time.sleep(4)
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(base64.b64decode(b64))
            with Image.open(dest) as im:
                dims = im.size
            print("OK   sheet %s -> %s %dx%d (%d bytes)"
                  % (kind, dest.name, dims[0], dims[1], dest.stat().st_size), flush=True)
            return True
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = e.read().decode()[:240]
            except Exception:
                pass
            print("ERR  %s attempt %d: HTTP %s %s" % (kind, attempt + 1, e.code, detail), flush=True)
            time.sleep(5)
        except Exception as e:
            print("ERR  %s attempt %d: %s" % (kind, attempt + 1, str(e)[:200]), flush=True)
            time.sleep(5)
    return False


# ------------------------------------------------------------------ slicing

def has_alpha(img):
    """True when the sheet already carries a real transparent ground."""
    if img.mode != "RGBA":
        return False
    a = img.getchannel("A")
    lo, hi = a.getextrema()
    return lo < 16 and hi > 240


def ink_mask(img, tol=26):
    """255 where the pixel is figure, 0 where it is ground."""
    if has_alpha(img):
        return img.getchannel("A").point(lambda v: 255 if v > 40 else 0), GROUND
    rgb = img.convert("RGB")
    bg = ground_colour(rgb)
    flat = Image.new("RGB", rgb.size, bg)
    diff = ImageChops.difference(rgb, flat).convert("L")
    return diff.point(lambda v: 255 if v > tol else 0), bg


def ground_colour(rgb):
    w, h = rgb.size
    pts = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)]
    samples = [rgb.getpixel(p) for p in pts]
    samples.sort()
    return samples[len(samples) // 2]


def runs(profile, floor, min_len):
    out, start = [], None
    for i, v in enumerate(profile):
        if v > floor and start is None:
            start = i
        elif v <= floor and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    if start is not None and len(profile) - start >= min_len:
        out.append((start, len(profile)))
    return out


def profile_rows(mask):
    return list(mask.resize((1, mask.size[1]), Image.BOX).getdata())


def profile_cols(mask):
    return list(mask.resize((mask.size[0], 1), Image.BOX).getdata())


def segment(img, grid):
    """Find each figure's tight box. Content aware first, nominal grid as fallback."""
    cols, rows = grid
    mask = img if img.mode == "L" else ink_mask(img)[0]
    w, h = img.size
    boxes = []
    row_bands = runs(profile_rows(mask), 1, max(8, h // 40))
    if len(row_bands) == rows:
        for (y0, y1) in row_bands:
            band = mask.crop((0, y0, w, y1))
            cells = runs(profile_cols(band), 1, max(8, w // 40))
            if not (1 <= len(cells) <= cols):
                boxes = []
                break
            for (x0, x1) in cells:
                sub = mask.crop((x0, y0, x1, y1))
                ry = runs(profile_rows(sub), 1, 3)
                if not ry:
                    continue
                boxes.append((x0, y0 + ry[0][0], x1, y0 + ry[-1][1]))
            if boxes == []:
                break
    if boxes:
        return boxes, "content"
    # fallback: nominal grid, then trim each cell to its content
    cw, ch = w // cols, h // rows
    for r in range(rows):
        for c in range(cols):
            cx0, cy0 = c * cw, r * ch
            sub = mask.crop((cx0, cy0, cx0 + cw, cy0 + ch))
            rx = runs(profile_cols(sub), 1, 3)
            ry = runs(profile_rows(sub), 1, 3)
            if not rx or not ry:
                continue
            boxes.append((cx0 + rx[0][0], cy0 + ry[0][0], cx0 + rx[-1][1], cy0 + ry[-1][1]))
    return boxes, "grid"


def key_ground(square, bg, tol=30):
    """Flood fill the flat ground from the four corners, return an RGBA image."""
    rgb = square.convert("RGB")
    w, h = rgb.size
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if abs(rgb.getpixel(corner)[0] - bg[0]) > 60:
            continue
        ImageDraw.floodfill(rgb, corner, KEY_RGB, thresh=tol)
    out = rgb.convert("RGBA")
    px = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if (r, g, b) == KEY_RGB:
                px[x, y] = (bg[0], bg[1], bg[2], 0)
    return out


def slice_sheet(sheet_path, kind, outdir, force=False, transparent=True):
    spec = SHEETS[kind]
    names = spec["names"]
    img = Image.open(sheet_path)
    img = img.convert("RGBA") if img.mode in ("RGBA", "LA", "P") else img.convert("RGB")
    alpha_sheet = has_alpha(img)
    mask, bg = ink_mask(img)
    boxes, how = segment(mask, spec["grid"])
    print("     %s: %d figures found by %s segmentation" % (sheet_path.name, len(boxes), how), flush=True)
    if len(boxes) < len(names):
        print("WARN %s: expected %d figures, found %d" % (sheet_path.name, len(names), len(boxes)), flush=True)
    boxes = boxes[:len(names)]
    if not boxes:
        return []
    span = max(max(x1 - x0, y1 - y0) for (x0, y0, x1, y1) in boxes)
    side = int(span * 1.16)
    written = []
    for name, (x0, y0, x1, y1) in zip(names, boxes):
        dest = outdir / (name + ".png")
        if dest.exists() and not force:
            print("skip %s (exists)" % dest.name, flush=True)
            written.append(dest)
            continue
        fig = img.crop((x0, y0, x1, y1))
        ox = (side - fig.width) // 2
        if spec["align"] == "bottom":
            oy = side - fig.height - int(side * 0.06)
        else:
            oy = (side - fig.height) // 2
        if alpha_sheet:
            canvas = Image.new("RGBA", (side, side), (GROUND[0], GROUND[1], GROUND[2], 0))
            canvas.paste(fig, (max(0, ox), max(0, oy)), fig)
            out = canvas if transparent else flatten(canvas)
        else:
            canvas = Image.new("RGB", (side, side), bg)
            canvas.paste(fig, (max(0, ox), max(0, oy)))
            out = key_ground(canvas, bg) if transparent else canvas.convert("RGBA")
        out = out.resize((CELL, CELL), Image.LANCZOS)
        outdir.mkdir(parents=True, exist_ok=True)
        out.save(dest)
        shrink_if_needed(dest)
        print("OK   %s (%d bytes)" % (dest.name, dest.stat().st_size), flush=True)
        written.append(dest)
    return written


def flatten(rgba):
    flat = Image.new("RGB", rgba.size, GROUND)
    flat.paste(rgba, (0, 0), rgba)
    return flat.convert("RGBA")


def shrink_if_needed(path):
    if path.stat().st_size <= MAX_BYTES:
        return
    for edge in (512, 448, 384):
        subprocess.run(["sips", "-Z", str(edge), str(path)], check=False, capture_output=True)
        if path.stat().st_size <= MAX_BYTES:
            break
    print("     shrunk %s -> %d bytes" % (path.name, path.stat().st_size), flush=True)


def make_previews(paths, outdir, all_paths=None):
    """Copies for review: full size on the game ground, plus 56px tall ones."""
    prev = outdir / "preview56"
    prev.mkdir(parents=True, exist_ok=True)
    flatdir = outdir / "flat"
    flatdir.mkdir(parents=True, exist_ok=True)
    for p in (all_paths or paths):
        flat = Image.new("RGB", (CELL, CELL), GROUND)
        with Image.open(p) as im:
            im = im.convert("RGBA")
            flat.paste(im.resize((CELL, CELL), Image.LANCZOS), (0, 0), im.resize((CELL, CELL), Image.LANCZOS))
        flat.save(flatdir / p.name)
    made = []
    for p in paths:
        flat = Image.new("RGB", (CELL, CELL), GROUND)
        with Image.open(p) as im:
            im = im.convert("RGBA")
            flat.paste(im, (0, 0), im)
        dest = prev / p.name
        flat.save(dest)
        subprocess.run(["sips", "-Z", "56", str(dest)], check=False, capture_output=True)
        made.append(dest)
    strip = contact_strip(made, prev / "strip56.png")
    print("     previews in %s" % prev, flush=True)
    return made + ([strip] if strip else [])


def contact_strip(paths, dest):
    ims = []
    for p in paths:
        try:
            ims.append(Image.open(p).convert("RGB"))
        except Exception:
            pass
    if not ims:
        return None
    pad = 10
    w = sum(i.width for i in ims) + pad * (len(ims) + 1)
    h = max(i.height for i in ims) + pad * 2
    strip = Image.new("RGB", (w, h), GROUND)
    x = pad
    for i in ims:
        strip.paste(i, (x, pad))
        x += i.width + pad
    strip = strip.resize((w * 4, h * 4), Image.NEAREST)
    strip.save(dest)
    return dest


# ------------------------------------------------------------------ commands

def cmd_batch(n, kinds, variant, force):
    key = load_key()
    outdir = CAND_DIR / ("batch%d" % n)
    outdir.mkdir(parents=True, exist_ok=True)
    ok = True
    sliced = []
    for kind in kinds:
        sheet = outdir / SHEETS[kind]["sheet"]
        if not generate_sheet(key, kind, sheet, variant=variant, force=force):
            ok = False
            continue
        sliced += slice_sheet(sheet, kind, outdir, force=True)
        time.sleep(2)
    make_previews([p for p in sliced if p.name.startswith("monkey")] or sliced, outdir, all_paths=sliced)
    print("\nbatch %d in %s" % (n, outdir), flush=True)
    return 0 if ok else 1


def cmd_promote(n, only, force):
    src = CAND_DIR / ("batch%d" % n)
    if not src.is_dir():
        print("no such batch: %s" % src, flush=True)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    wanted = set(only.split(",")) if only else None
    copied = []
    for kind, spec in SHEETS.items():
        sheet = src / spec["sheet"]
        if not sheet.exists():
            continue
        names = [nm for nm in spec["names"] if wanted is None or nm in wanted]
        if not names:
            continue
        for nm in names:
            piece = src / (nm + ".png")
            dest = OUT_DIR / (nm + ".png")
            if not piece.exists():
                print("WARN missing slice %s" % piece.name, flush=True)
                continue
            if dest.exists() and not force:
                print("skip %s (exists)" % dest.name, flush=True)
                copied.append(dest)
                continue
            shutil.copy2(piece, dest)
            copied.append(dest)
            print("OK   promoted %s" % dest.name, flush=True)
        sheet_dest = OUT_DIR / spec["sheet"]
        if not sheet_dest.exists() or force:
            shutil.copy2(sheet, sheet_dest)
            print("OK   promoted %s" % sheet_dest.name, flush=True)
    for p in copied:
        with Image.open(p) as im:
            print("     %s %dx%d %d bytes" % (p.name, im.size[0], im.size[1], p.stat().st_size), flush=True)
    return 0


def cmd_cleanup(keep):
    if not CAND_DIR.is_dir():
        return 0
    for d in sorted(CAND_DIR.iterdir()):
        if not d.is_dir():
            continue
        if keep is not None and d.name == ("batch%d" % keep):
            print("keep %s" % d.name, flush=True)
            continue
        shutil.rmtree(d)
        print("deleted %s" % d.name, flush=True)
    return 0


def main():
    ap = argparse.ArgumentParser(description="Monkey Trade sprite sheets via gpt-image-1")
    ap.add_argument("--batch", type=int, help="generate candidate sheets into candidates/batchN")
    ap.add_argument("--promote", type=int, help="copy a chosen batch into public/monkey")
    ap.add_argument("--reslice", type=int, help="re-slice an existing batch without regenerating")
    ap.add_argument("--cleanup", action="store_true", help="delete candidate batches")
    ap.add_argument("--keep", type=int, help="batch to keep when cleaning up")
    ap.add_argument("--kind", default="both", choices=["monkey", "dart", "both"])
    ap.add_argument("--variant", default="a", choices=["a", "b"], help="prompt wording")
    ap.add_argument("--only", help="comma separated asset names to promote")
    ap.add_argument("--force", action="store_true", help="overwrite existing outputs")
    ap.add_argument("--opaque", action="store_true", help="keep the warm white ground, do not key it")
    args = ap.parse_args()

    kinds = ["monkey", "dart"] if args.kind == "both" else [args.kind]
    if args.batch:
        return cmd_batch(args.batch, kinds, args.variant, args.force)
    if args.reslice:
        d = CAND_DIR / ("batch%d" % args.reslice)
        sliced = []
        for kind in kinds:
            sheet = d / SHEETS[kind]["sheet"]
            if not sheet.exists():
                # a promoted batch keeps its raw sheet in public/monkey, not twice
                sheet = OUT_DIR / SHEETS[kind]["sheet"]
            if sheet.exists():
                sliced += slice_sheet(sheet, kind, d, force=True, transparent=not args.opaque)
        make_previews([p for p in sliced if p.name.startswith("monkey")] or sliced, d, all_paths=sliced)
        return 0
    if args.promote:
        return cmd_promote(args.promote, args.only, args.force)
    if args.cleanup:
        return cmd_cleanup(args.keep)
    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
