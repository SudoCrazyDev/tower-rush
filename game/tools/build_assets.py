"""Convert the raw asset pack (../assets) into compact WebP files for the web game.

    python tools/build_assets.py          # only rebuilds missing outputs
    python tools/build_assets.py --force  # rebuild everything

Output goes to public/assets/ plus public/assets/index.json (lists of ids/animations).
"""
import glob
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image, ImageFilter

SRC = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "assets"))
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "assets"))
FORCE = "--force" in sys.argv

if not os.path.isdir(os.path.join(SRC, "sprites")):
    # The art pack isn't in git (it's several GB); it has to be copied in by hand.
    sys.exit(f"Art pack not found at {SRC}. Copy the assets/ folder there, then run this again.")
Q = 82

jobs = []


def task(fn):
    jobs.append(fn)
    return fn


def need(dst):
    return FORCE or not os.path.exists(dst)


def save(im, dst, quality=Q):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "WEBP", quality=quality, method=5)


def fit(src, dst, size):
    """Downscale so the longest side is `size` (keeps alpha)."""
    if not need(dst):
        return
    im = Image.open(src)
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    w, h = im.size
    s = size / max(w, h)
    if s < 1:
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    save(im, dst)


# Clips whose smoke, splash or wings run off the edge of the source video, which shows
# in game as a straight cut-off line. Feathered clips fade out toward the frame edge.
FEATHER = {
    "bosses/fire_dragon_intro",
    "bosses/frost_wyrm_death",
    "bosses/kraken_attack",
    "bosses/lich_king_intro",
    "bosses/stone_colossus_attack",
}
# HD clips cut off like that whose SD version is clean: the HD sheet is built from the SD one.
HD_USE_SD = {"bosses/sand_pharaoh_walk", "bosses/demon_lord_attack"}
# Clips boxed in with no clean stretch (fog or water fills the frame): the game skips them.
BOXED = {"bosses/ghost_pirate_captain_intro", "bosses/kraken_intro"}


def feather(im, width=0.12):
    """Fade alpha to zero over the outer `width` of every frame."""
    a = np.asarray(im).copy()
    fr = a.shape[0]
    ramp = np.clip(np.minimum(np.arange(fr), np.arange(fr)[::-1]) / (fr * width), 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)  # smoothstep
    mask = np.minimum.outer(ramp, ramp)
    a[..., 3] = (a[..., 3] * np.tile(mask, (1, a.shape[1] // fr))).astype(np.uint8)
    return Image.fromarray(a)


def sheet(src, dst, frame, soft=False):
    """Resize a 16-frame horizontal sheet so each square frame is `frame` px."""
    if not need(dst):
        return
    im = Image.open(src).convert("RGBA")
    n = im.width // im.height
    im = im.resize((frame * n, frame), Image.LANCZOS)
    if soft:
        im = feather(im)
    save(im, dst, 80)


def xy_cut(alpha, min_gap=6, min_size=24):
    """Split an RGBA atlas into sprite boxes by recursive empty row/column gaps."""
    def runs(mask):
        out, start, gap = [], None, 0
        for i, v in enumerate(mask):
            if v:
                if start is None:
                    start = i
                gap = 0
            elif start is not None:
                gap += 1
                if gap >= min_gap:
                    out.append((start, i - gap + 1))
                    start, gap = None, 0
        if start is not None:
            out.append((start, len(mask) - gap))
        return [r for r in out if r[1] - r[0] >= min_size]

    boxes = []
    for y0, y1 in runs((alpha > 40).any(axis=1)):
        band = alpha[y0:y1]
        for x0, x1 in runs((band > 40).any(axis=0)):
            sub = band[:, x0:x1]
            rows = np.where((sub > 40).any(axis=1))[0]
            boxes.append((x0, y0 + rows[0], x1, y0 + rows[-1] + 1))
    return boxes


def degloss(part):
    """Paint out the white gloss streak in a button's top-left corner (it read as a slash)."""
    a = np.asarray(part.convert("RGBA")).astype(int)
    h, w = a.shape[:2]
    lum = a[..., :3].mean(-1)
    rx = int(w * 0.45)
    x0, x1, y0, y1 = int(w * 0.06), int(w * 0.3), int(h * 0.14), int(h * 0.5)
    m = np.zeros((h, w), bool)
    m[y0:y1, x0:x1] = (a[y0:y1, x0:x1, 3] > 200) & (lum[y0:y1, x0:x1] > lum[y0:y1, rx : rx + 1] + 5)
    m = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
    m[:, :x0] = m[:, x1:] = False
    m[:y0] = m[y1:] = False
    m &= a[..., 3] > 200
    ys, xs = np.nonzero(m)
    a[ys, xs, :3] = a[ys, rx, :3]
    return Image.fromarray(a.astype(np.uint8))


def slice_atlas(src, dst_prefix, size, fix=None):
    im = Image.open(src).convert("RGBA")
    boxes = xy_cut(np.array(im)[:, :, 3])
    for i, b in enumerate(boxes):
        dst = f"{dst_prefix}_{i}.webp"
        if need(dst):
            part = im.crop(b)
            s = size / max(part.size)
            if s < 1:
                part = part.resize((round(part.width * s), round(part.height * s)), Image.LANCZOS)
            save(fix(part) if fix else part, dst)
    return len(boxes)


def ids(folder):
    return sorted(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(SRC, folder, "*.png")))


index = {}

# --- static images ---------------------------------------------------------
STATIC = [
    ("units", "units", 256),
    ("units_awakened", "units_awakened", 256),
    ("heroes", "heroes", 256),
    ("monsters", "monsters", 192),
    ("bosses", "bosses", 384),
    ("cards/portraits", "portraits", 256),
    ("cards/portraits_awakened", "portraits_awakened", 256),
    ("cards/portraits_heroes", "portraits_heroes", 256),
    ("cards", "cards", 320),
    ("items", "items", 192),
    ("ui/boss_banners", "boss_banners", 512),
    ("ui/emotes", "emotes", 128),
    ("ui/stats", "stats", 96),
    ("vfx", "vfx", 128),
    # v2.0: static VFX sprites (top-level vfx/*.png above), melee weapon sprites, and UI icon sets.
    ("vfx/weapons", "vfx/weapons", 160),
    ("ui/perks", "ui/perks", 128),
    ("ui/traits", "ui/traits", 128),
    ("ui/archs", "ui/archs", 128),
    ("ui/races", "ui/races", 160),
    # v1.2 Story mode: book covers, illustrated panels and dialogue portraits.
    ("story/covers", "story/covers", 768),
    ("story/panels", "story/panels", 1344),
    ("story/portraits", "story/portraits", 256),
    # v2.1: allies that charge in a story rally cutscene.
    ("story/allies", "story/allies", 256),
]
jobs.append(lambda: fit(f"{SRC}/story/story_background.png", f"{OUT}/story/story_background.webp", 1344))
for folder, out, size in STATIC:
    index[out] = ids(folder)
    for i in index[out]:
        jobs.append(lambda f=folder, o=out, i=i, s=size: fit(f"{SRC}/{f}/{i}.png", f"{OUT}/{o}/{i}.webp", s))

UI_SIZES = {"logo": 640, "panel_dialog": 640, "banner_victory": 640, "banner_defeat": 640, "boss_warning": 320}
index["ui"] = [i for i in ids("ui") if i not in ("merge_rank_pips", "element_icons", "buttons_set", "league_ranks")]
for i in index["ui"]:
    jobs.append(lambda i=i: fit(f"{SRC}/ui/{i}.png", f"{OUT}/ui/{i}.webp", UI_SIZES.get(i, 256)))

index["locations"] = ids("locations")
for i in index["locations"]:
    jobs.append(lambda i=i: fit(f"{SRC}/locations/{i}.png", f"{OUT}/locations/{i}.webp", 1344))

# Element badges: six round icons on a dark glow (fire, ice, lightning, nature, poison, arcane).
# The glow touches every badge, so cut each one out with a circle at its known spot.
ELEMENT_ORDER = ["fire", "ice", "lightning", "nature", "poison", "arcane"]


# v2.0 element emblems (assets/ui/elements/<e>.png, keyed) replace the cut-out badges: they build to
# the same ui/element_<e>.webp name BootScene loads, and rebuild whenever the emblem is newer.
index["elements"] = [e for e in ELEMENT_ORDER if os.path.exists(f"{SRC}/ui/elements/{e}.png")]


def emblem(src, dst, size=128):
    """Trim to the art and centre it on a square canvas: older clients draw element:<e> at a
    square size (setDisplaySize(s, s)), so a tall 9:16 source would show squashed flat."""
    if not need(dst):
        return
    im = Image.open(src).convert("RGBA")
    im = im.crop(im.getchannel("A").getbbox() or (0, 0, im.width, im.height))
    side = max(im.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    save(sq.resize((size, size), Image.LANCZOS), dst, 90)


for e in index["elements"]:
    jobs.append(lambda e=e: (
        os.path.exists(f"{OUT}/ui/element_{e}.webp")
        and os.path.getmtime(f"{OUT}/ui/element_{e}.webp") < os.path.getmtime(f"{SRC}/ui/elements/{e}.png")
        and os.remove(f"{OUT}/ui/element_{e}.webp")
    ) or emblem(f"{SRC}/ui/elements/{e}.png", f"{OUT}/ui/element_{e}.webp"))


@task
def element_badges():
    # Elements without an emblem fall back to the old atlas badges.
    dsts = [f"{OUT}/ui/element_{e}.webp" for e in ELEMENT_ORDER if e not in index["elements"]]
    if not any(need(d) for d in dsts):
        return
    im = Image.open(f"{SRC}/ui/element_icons.png").convert("RGBA")
    k = im.width / 1024  # positions measured on the 1024px original
    r = 79.5 * k
    side = int(np.ceil(2 * r)) + 4
    yy, xx = np.mgrid[0:side, 0:side] + 0.5 - side / 2
    mask = np.clip(r - np.hypot(xx, yy) + 0.5, 0, 1)  # 1px anti-aliased edge
    for i, e in enumerate(ELEMENT_ORDER):
        dst = f"{OUT}/ui/element_{e}.webp"
        if e in index["elements"] or not need(dst):
            continue
        cx, cy = (94.5 + i * 167.1) * k, 340 * k
        x0, y0 = round(cx - side / 2), round(cy - side / 2)
        a = np.asarray(im.crop((x0, y0, x0 + side, y0 + side))).copy()
        a[..., 3] = (a[..., 3] * mask).astype(np.uint8)
        save(Image.fromarray(a).resize((128, 128), Image.LANCZOS), dst, 90)


# merge_rank_pips has touching sprites, so the game draws those itself.
# --- animation sheets --------------------------------------------------------
FRAME = {"units": 192, "units_awakened": 192, "heroes": 192, "monsters": 160, "bosses": 256, "vfx": 192}
index["anims"] = {}
for folder, frame in FRAME.items():
    names = sorted(os.path.basename(p)[: -len("_sheet.png")] for p in glob.glob(f"{SRC}/sprites/{folder}/*_sheet.png"))
    index["anims"][folder] = names
    for n in names:
        jobs.append(lambda f=folder, n=n, fr=frame: sheet(f"{SRC}/sprites/{f}/{n}_sheet.png", f"{OUT}/sheets/{f}/{n}.webp", fr, f"{f}/{n}" in FEATHER))
index["frameSize"] = dict(FRAME)

# HD sheets for big/high-DPI screens (the game picks them when it renders above 1x).
# Every animation of the SD folder gets an HD version so a character's clips share one
# frame size: the 384px HD source where there is a clean one, else the 256px SD source.
HD_FRAME = {"units": 288, "monsters": 256, "bosses": 384, "heroes": 384}
hd_source = {}  # "<folder>_hd/<name>" -> source sheet path


def hd_sheet(folder, n, frame):
    hd = f"{SRC}/sprites/{folder}_hd/{n}_sheet.png"
    sd = f"{SRC}/sprites/{folder}/{n}_sheet.png"
    key = f"{folder}/{n}"
    clean = os.path.exists(hd) and key not in HD_USE_SD and (key in HAZY_OK or border_score(hd) <= 0.5)
    hd_source[f"{folder}_hd/{n}"] = hd if clean else sd
    sheet(hd_source[f"{folder}_hd/{n}"], f"{OUT}/sheets/{folder}_hd/{n}.webp", frame, key in FEATHER)


for folder, frame in HD_FRAME.items():
    index["anims"][f"{folder}_hd"] = index["anims"][folder]
    index["frameSize"][f"{folder}_hd"] = frame
    for n in index["anims"][folder]:
        jobs.append(lambda f=folder, n=n, fr=frame: hd_sheet(f, n, fr))

# --- videos -------------------------------------------------------------------
# Ambient location loops (arena/lobby/shop backgrounds) and the trailer (title screen),
# re-encoded small and silent. Loops get their last half second crossfaded into the start
# so they wrap without a jump.
XFADE = 0.5


def ffmpeg():
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def duration(src):
    out = subprocess.run([ffmpeg(), "-hide_banner", "-i", src], capture_output=True, text=True).stderr
    h, m, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups()
    return int(h) * 3600 + int(m) * 60 + float(sec)


def video(src, dst, loop):
    if not need(dst):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    args = [ffmpeg(), "-loglevel", "error", "-y", "-i", src, "-an"]
    if loop:
        d = duration(src) - XFADE
        args += ["-filter_complex", (
            f"[0:v]split[a][b];[a]trim=start={XFADE},setpts=PTS-STARTPTS,fps=24[a1];"
            f"[b]trim=end={XFADE},setpts=PTS-STARTPTS,fps=24[b1];"
            f"[a1][b1]xfade=transition=fade:duration={XFADE}:offset={d - XFADE:.3f},format=yuv420p"
        )]
    args += ["-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst]
    subprocess.run(args, check=True)


index["videos"] = []
for path in sorted(glob.glob(f"{SRC}/animations/locations/*_loop.mp4")):
    name = os.path.basename(path)[: -len("_loop.mp4")]
    index["videos"].append(name)
    jobs.append(lambda p=path, n=name: video(p, f"{OUT}/video/{n}.mp4", True))
index["videos"].append("trailer")
jobs.append(lambda: video(f"{SRC}/video/trailer_main.mp4", f"{OUT}/video/trailer.mp4", False))

# A few character clips came back with a drifting (olive/black) background that the
# green key can't remove. Their frames have opaque pixels all along the frame border,
# which real sprites almost never do. The game skips these and falls back to idle.
HAZY_OK = {"bosses/lich_king_intro"}  # frost cloud intro, intentionally full-frame


def border_score(path):
    a = np.asarray(Image.open(path).convert("RGBA"))[..., 3]
    fr = a.shape[0]
    vals = []
    for i in range(a.shape[1] // fr):
        f = a[:, i * fr : (i + 1) * fr]
        b = np.concatenate([f[:3].ravel(), f[-3:].ravel(), f[:, :3].ravel(), f[:, -3:].ravel()])
        vals.append((b > 30).mean())
    return sorted(vals)[-4]

if __name__ == "__main__":
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda j: j(), jobs))
    index["atlas"] = {
        "buttons": slice_atlas(f"{SRC}/ui/buttons_set.png", f"{OUT}/ui/button", 320, degloss),
        "icons": slice_atlas(f"{SRC}/ui/icon_buttons_set.png", f"{OUT}/ui/icon", 128),
        # League badges, lowest league first (a league's `icon` in the config is its slice number).
        "leagues": slice_atlas(f"{SRC}/ui/league_ranks.png", f"{OUT}/ui/league", 160),
    }
    # Badges drawn after the atlas (league_ranks_extra_<n>.png, e.g. 6 = Champion) follow its slices.
    for src in sorted(glob.glob(f"{SRC}/ui/league_ranks_extra_*.png")):
        n = int(re.search(r"_(\d+)\.png$", src).group(1))
        fit(src, f"{OUT}/ui/league_{n}.webp", 160)
        index["atlas"]["leagues"] = max(index["atlas"]["leagues"], n + 1)
    index["hazy"] = [
        f"{folder}/{n}"
        for folder in ("units", "monsters", "bosses")
        for n in index["anims"][folder]
        if f"{folder}/{n}" not in HAZY_OK and border_score(f"{SRC}/sprites/{folder}/{n}_sheet.png") > 0.5
    ]
    index["hazy"] += sorted(BOXED - set(index["hazy"]))
    # An HD sheet is only as clean as its source.
    index["hazy"] += [k for k, src in sorted(hd_source.items()) if ("_hd/" not in src or k.replace("_hd/", "/") in BOXED) and k.replace("_hd/", "/") in index["hazy"]]
    with open(f"{OUT}/index.json", "w") as fh:
        json.dump(index, fh, indent=1)
    total = sum(os.path.getsize(p) for p in glob.glob(f"{OUT}/**/*.webp", recursive=True))
    total += sum(os.path.getsize(p) for p in glob.glob(f"{OUT}/video/*.mp4"))
    print(f"{len(jobs)} assets, {total / 1e6:.1f} MB, atlas slices {index['atlas']}, hazy {index['hazy']}")
