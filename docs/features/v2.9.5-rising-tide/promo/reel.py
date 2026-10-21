"""
v2.9.5 teaser reel: joins the three 4s clips in raw/reel_1..3.mp4 into a 12s 9:16 reel, with the hook burned in
for 0-4s and the end card for 8-12s (like the marketing reels: Pillow overlays in Lilita One).
  python docs/features/v2.9.5-rising-tide/promo/reel.py <LilitaOne-Regular.ttf>
Writes teaser_reel.mp4 and teaser_reel_clean.mp4 (no text) next to this file.
"""
import os
import subprocess
import sys

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../../.."))
RAW = os.path.join(HERE, "raw")
FONT = sys.argv[1]
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H = 720, 1280
NAVY = (11, 18, 48)


def text(im, xy, s, size, fill, glow=None):
    f = ImageFont.truetype(FONT, size)
    sw = max(3, size // 12)
    if glow:
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(xy, s, font=f, fill=glow + (255,), anchor="mm", stroke_width=sw * 2, stroke_fill=glow + (255,))
        im.alpha_composite(layer.filter(ImageFilter.GaussianBlur(size // 6)))
    ImageDraw.Draw(im).text(xy, s, font=f, fill=fill, anchor="mm", stroke_width=sw, stroke_fill=NAVY)


hook = Image.new("RGBA", (W, H), (0, 0, 0, 0))
text(hook, (W // 2, 200), "Something stirs", 72, (255, 255, 255), glow=(40, 150, 255))
text(hook, (W // 2, 285), "below the tide...", 72, (255, 255, 255), glow=(40, 150, 255))
hook.save(os.path.join(RAW, "ov_hook.png"))

end = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shade = Image.new("L", (1, H))
for y in range(H):
    shade.putpixel((0, y), round(200 * max(0, (y - H * 0.55) / (H * 0.45)) ** 0.8))
end.paste(Image.new("RGBA", (W, H), NAVY + (255,)), (0, 0), shade.resize((W, H)))
logo = Image.open(os.path.join(ROOT, "assets/brand/logo.png")).convert("RGBA")
logo = logo.resize((360, round(logo.height * 360 / logo.width)), Image.LANCZOS)
end.alpha_composite(logo, ((W - 360) // 2, 40))
text(end, (W // 2, 1000), "RISING TIDE", 110, (255, 255, 255), glow=(40, 150, 255))
text(end, (W // 2, 1095), "COMING SOON", 58, (255, 217, 59))
text(end, (W // 2, 1190), "PLAY FREE  ·  crownnkeep.com", 36, (127, 216, 255))
end.save(os.path.join(RAW, "ov_end.png"))

clips = [os.path.join(RAW, f"reel_{i}.mp4") for i in (1, 2, 3)]
scale = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=30,setsar=1"
join = "".join(f"[{i}:v]{scale},trim=duration=4,setpts=PTS-STARTPTS[v{i}];" for i in range(3)) + "[v0][v1][v2]concat=n=3:v=1:a=0[base]"
common = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", "-an"]
inputs = sum((["-i", c] for c in clips), [])
subprocess.run([FF, "-y", "-v", "error", *inputs, "-filter_complex", join, "-map", "[base]", *common, os.path.join(HERE, "teaser_reel_clean.mp4")], check=True)
over = (
    join
    + ";[3:v]format=rgba[h];[4:v]format=rgba[e]"
    + ";[base][h]overlay=enable='between(t,0.2,4)'[a];[a][e]overlay=enable='between(t,8,12)'[out]"
)
subprocess.run(
    [FF, "-y", "-v", "error", *inputs, "-i", os.path.join(RAW, "ov_hook.png"), "-i", os.path.join(RAW, "ov_end.png"), "-filter_complex", over, "-map", "[out]", *common, os.path.join(HERE, "teaser_reel.mp4")],
    check=True,
)
print("wrote teaser_reel.mp4 and teaser_reel_clean.mp4")
