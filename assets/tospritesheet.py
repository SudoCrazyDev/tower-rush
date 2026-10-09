"""Convert a green-screen mp4 into transparent PNG frames + a sprite sheet.
usage: python tospritesheet.py in.mp4 out_prefix [frames=16] [size=256] [green|magenta, + suffix to flood-clear a drifting backdrop]"""
import sys, os, subprocess, numpy as np, imageio_ffmpeg
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 16
S = int(sys.argv[4]) if len(sys.argv) > 4 else 256
KEY = sys.argv[5] if len(sys.argv) > 5 else "green"
FLOOD = KEY.endswith("+")  # e.g. magenta+: also flood-clear a drifting backdrop
KEY = KEY.rstrip("+")
ff = imageio_ffmpeg.get_ffmpeg_exe()
tmp = out + "_raw"; os.makedirs(tmp, exist_ok=True)
subprocess.run([ff, "-loglevel", "error", "-y", "-i", src, os.path.join(tmp, "%04d.png")], check=True)
raw = sorted(os.listdir(tmp))
idx = np.linspace(0, len(raw) - 1, N).round().astype(int)
frames = []
for i in idx:
    a = np.asarray(Image.open(os.path.join(tmp, raw[i])).convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if KEY == "magenta":  # magenta (r+b over g) dominance -> alpha, then pull r/b spill down
        dom = np.minimum(r, b) - g
        alpha = np.clip(1 - (dom - 40) / 60, 0, 1)
        cap = g + 10
        rgb = np.stack([np.where(dom > 0, np.minimum(r, cap + (r - b).clip(0)), r), g,
                        np.where(dom > 0, np.minimum(b, cap + (b - r).clip(0)), b)], -1)
    else:  # green dominance -> alpha (soft key), then despill
        dom = g - np.maximum(r, b)
        alpha = np.clip(1 - (dom - 40) / 60, 0, 1)
        g2 = np.minimum(g, np.maximum(r, b) + 10)
        rgb = np.stack([r, np.where(dom > 0, g2, g), b], -1)
    if FLOOD:  # backdrop drifted off the key colour (smoke, dimming): grow the background in from
        # the frame edge through smoothly changing pixels; the dark cartoon outlines stop it
        q = a[::2, ::2]
        gx = np.abs(q[:, 1:] - q[:, :-1]).sum(-1); gy = np.abs(q[1:] - q[:-1]).sum(-1)
        edge = np.zeros(q.shape[:2]); edge[:, 1:] = np.maximum(edge[:, 1:], gx); edge[:, :-1] = np.maximum(edge[:, :-1], gx)
        edge[1:] = np.maximum(edge[1:], gy); edge[:-1] = np.maximum(edge[:-1], gy)
        lum = q.mean(-1)
        ok = (edge < 36) & (lum > 45)  # smooth and not an outline
        bg = np.zeros_like(ok); bg[0] = bg[-1] = True; bg[:, 0] = bg[:, -1] = True; bg &= ok
        for _ in range(600):
            grown = bg.copy()
            grown[1:] |= bg[:-1]; grown[:-1] |= bg[1:]; grown[:, 1:] |= bg[:, :-1]; grown[:, :-1] |= bg[:, 1:]
            grown &= ok
            if (grown == bg).all(): break
            bg = grown
        bg = np.repeat(np.repeat(bg, 2, 0), 2, 1)[: a.shape[0], : a.shape[1]]
        alpha = np.where(bg, 0, alpha)
    frames.append(np.dstack([rgb, alpha * 255]).astype(np.uint8))
# common bbox across frames so sprite doesn't jitter
m = np.zeros(frames[0].shape[:2], bool)
for f in frames: m |= f[..., 3] > 20
ys, xs = np.where(m); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
side = max(y1 - y0, x1 - x0) + 8; cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
os.makedirs(out, exist_ok=True)
sheet = Image.new("RGBA", (S * N, S), (0, 0, 0, 0))
for k, f in enumerate(frames):
    im = Image.fromarray(f)
    box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
    im = im.crop(box).resize((S, S), Image.LANCZOS)
    im.save(os.path.join(out, f"{k:02d}.png")); sheet.paste(im, (k * S, 0))
sheet.save(out + "_sheet.png")
for fn in raw: os.remove(os.path.join(tmp, fn))
os.rmdir(tmp)
print("ok", out, len(raw), "src frames ->", N)
