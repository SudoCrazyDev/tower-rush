"""Re-key the VFX clips, whose backgrounds came out as a dark, vignetted green (with
lighting that drifts during the clip) rather than pure #00FF00. The plain green key in
assets/tospritesheet.py leaves a haze on those.

Each frame's background is modelled as a smooth cubic surface, fitted robustly (the
effect's pixels are rejected as outliers), seeded from the clip-wide median. Alpha comes
from how far the frame differs from that surface.

    python tools/rekey.py              # every clip in ../assets/animations/vfx
    python tools/rekey.py ice_burst    # just one

Writes ../assets/sprites/vfx/<name>/NN.png and <name>_sheet.png (16 frames, 256px), the
same layout tospritesheet.py produces. Then delete public/assets/sheets/vfx/*.webp and
run tools/build_assets.py.

Character clips are left alone: a few of them drifted too (the game skips those, see
"hazy" in build_assets.py), but this key is too aggressive for characters.
"""
import glob
import os
import subprocess
import sys
import tempfile

import imageio_ffmpeg
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "assets"))
N, S = 16, 256
T0, T1 = 30, 85  # frame/background difference where alpha starts / reaches 1


def frames_of(mp4):
    with tempfile.TemporaryDirectory() as tmp:
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run([ff, "-loglevel", "error", "-y", "-i", mp4, "-vf", "scale=480:-1", f"{tmp}/%04d.png"], check=True)
        return [np.asarray(Image.open(p).convert("RGB")).astype(np.float32) for p in sorted(glob.glob(f"{tmp}/*.png"))]


def _feats(x, y):
    return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y, x**3, x * x * y, x * y * y, y**3], 1)


def smooth_bg(img, keep=None, step=8):
    """Fit a cubic surface per channel, iteratively dropping outliers."""
    h, w, _ = img.shape
    ys, xs = np.mgrid[0:h:step, 0:w:step]
    A = _feats(xs.ravel() / w - 0.5, ys.ravel() / h - 0.5)
    vals = img[::step, ::step].reshape(-1, 3)
    keep = np.ones(len(vals), bool) if keep is None else keep[::step, ::step].ravel()
    for _ in range(8):
        coef, *_ = np.linalg.lstsq(A[keep], vals[keep], rcond=None)
        res = np.abs(A @ coef - vals).max(1)
        keep = res < max(12, 2.5 * np.median(res[keep]))
    fy, fx = np.mgrid[0:h, 0:w]
    return (_feats(fx.ravel() / w - 0.5, fy.ravel() / h - 0.5) @ coef).reshape(h, w, 3)


def rekey(name):
    raw = frames_of(f"{ROOT}/animations/vfx/{name}.mp4")
    clip_bg = smooth_bg(np.median(np.stack(raw[:: max(1, len(raw) // 60)]), axis=0))
    out = []
    for i in np.linspace(0, len(raw) - 1, N).round().astype(int):
        f = raw[i]
        bg = smooth_bg(f, np.abs(f - clip_bg).max(axis=2) < 45)
        a = np.clip((np.abs(f - bg).max(axis=2) - T0) / (T1 - T0), 0, 1)
        # Un-mix the background from semi-transparent edges.
        rgb = np.clip(bg + (f - bg) / np.maximum(a, 0.05)[..., None], 0, 255)
        out.append(np.dstack([rgb, a * 255]).astype(np.uint8))

    mask = np.zeros(out[0].shape[:2], bool)
    for f in out:
        mask |= f[..., 3] > 40
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    side = max(y1 - y0, x1 - x0) + 8
    cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
    box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)

    # Soft circular mask hides leftovers in the corners of full-frame effects.
    yy, xx = np.mgrid[0:S, 0:S] / (S - 1) - 0.5
    circle = np.clip((0.5 - np.hypot(xx, yy)) / 0.08, 0, 1)
    dst = f"{ROOT}/sprites/vfx/{name}"
    os.makedirs(dst, exist_ok=True)
    sheet = Image.new("RGBA", (S * N, S), (0, 0, 0, 0))
    for k, f in enumerate(out):
        arr = np.asarray(Image.fromarray(f).crop(box).resize((S, S), Image.LANCZOS)).copy()
        arr[..., 3] = (arr[..., 3] * circle).astype(np.uint8)
        im = Image.fromarray(arr)
        im.save(f"{dst}/{k:02d}.png")
        sheet.paste(im, (k * S, 0))
    sheet.save(f"{dst}_sheet.png")
    print("ok", name)


if __name__ == "__main__":
    names = sys.argv[1:] or [os.path.basename(p)[:-4] for p in sorted(glob.glob(f"{ROOT}/animations/vfx/*.mp4"))]
    for n in names:
        rekey(n)
