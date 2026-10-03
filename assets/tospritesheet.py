"""Convert a green-screen mp4 into transparent PNG frames + a sprite sheet.
usage: python tospritesheet.py in.mp4 out_prefix [frames=16] [size=256]"""
import sys, os, subprocess, numpy as np, imageio_ffmpeg
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 16
S = int(sys.argv[4]) if len(sys.argv) > 4 else 256
ff = imageio_ffmpeg.get_ffmpeg_exe()
tmp = out + "_raw"; os.makedirs(tmp, exist_ok=True)
subprocess.run([ff, "-loglevel", "error", "-y", "-i", src, os.path.join(tmp, "%04d.png")], check=True)
raw = sorted(os.listdir(tmp))
idx = np.linspace(0, len(raw) - 1, N).round().astype(int)
frames = []
for i in idx:
    a = np.asarray(Image.open(os.path.join(tmp, raw[i])).convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # green dominance -> alpha (soft key), then despill
    dom = g - np.maximum(r, b)
    alpha = np.clip(1 - (dom - 40) / 60, 0, 1)
    g2 = np.minimum(g, np.maximum(r, b) + 10)
    rgb = np.stack([r, np.where(dom > 0, g2, g), b], -1)
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
