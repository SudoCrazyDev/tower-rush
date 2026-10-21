"""
v2.9.5 "Rising Tide" promo kit: lays the title, logo and call to action over the raw Higgsfield art in raw/.
  python docs/features/v2.9.5-rising-tide/promo/compose.py <path to LilitaOne-Regular.ttf>
Writes the finished posts next to this file and the in-game teaser art to assets/ui/coming_soon.png.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../../.."))
RAW = os.path.join(HERE, "raw")
FONT = sys.argv[1]
LOGO = Image.open(os.path.join(ROOT, "assets/brand/logo.png")).convert("RGBA")
NAVY = (11, 18, 48)
CYAN = (127, 216, 255)
GOLD = (255, 217, 59)


def font(size):
    return ImageFont.truetype(FONT, size)


def fit(path, w, h):
    """Cover-crop the art to w x h."""
    im = Image.open(path).convert("RGB")
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h)).convert("RGBA")


def shade(im, frac, strength=235):
    """Dark gradient over the bottom `frac` of the image, for the text."""
    w, h = im.size
    band = round(h * frac)
    g = Image.new("L", (1, band))
    for y in range(band):
        g.putpixel((0, y), round(strength * (y / band) ** 0.8))
    mask = Image.new("L", (w, h), 0)
    mask.paste(g.resize((w, band)), (0, h - band))
    dark = Image.new("RGBA", (w, h), NAVY + (255,))
    return Image.composite(dark, im, mask)


def text(im, xy, s, size, fill, stroke=None, anchor="mm", glow=None):
    d = ImageDraw.Draw(im)
    f = font(size)
    sw = max(3, size // 12)
    if glow:
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(xy, s, font=f, fill=glow + (255,), anchor=anchor, stroke_width=sw * 2, stroke_fill=glow + (255,))
        im.alpha_composite(layer.filter(ImageFilter.GaussianBlur(size // 6)))
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=sw, stroke_fill=stroke or NAVY)


def logo(im, w, xy):
    lg = LOGO.resize((w, round(LOGO.height * w / LOGO.width)), Image.LANCZOS)
    im.alpha_composite(lg, (xy[0], xy[1]))


def keyart(name, raw, w, h, frac, title, sub, cta_y):
    im = shade(fit(os.path.join(RAW, raw), w, h), frac)
    logo(im, round(w * (0.2 if w > h else 0.32)), (round(w * 0.025), round(h * 0.02)))
    u = min(w, h)
    text(im, (w // 2, round(h * (1 - frac * 0.62))), title, round(u * 0.15), (255, 255, 255), glow=(40, 150, 255))
    text(im, (w // 2, round(h * (1 - frac * 0.30))), sub, round(u * (0.08 if sub == "COMING SOON" else 0.05)), GOLD)
    text(im, (w // 2, round(h * cta_y)), "PLAY FREE  ·  crownnkeep.com", round(u * 0.04), CYAN)
    im.convert("RGB").save(os.path.join(HERE, name), quality=92)
    print("wrote", name)


keyart("rising_tide_16x9.jpg", "keyart_16x9.png", 1920, 1080, 0.36, "RISING TIDE", "v2.9.5  ·  5 NEW UNITS", 0.955)
keyart("rising_tide_9x16.jpg", "keyart_9x16.png", 1080, 1920, 0.30, "RISING TIDE", "v2.9.5  ·  5 NEW UNITS", 0.965)
keyart("rising_tide_1x1.jpg", "keyart_1x1.png", 1080, 1080, 0.36, "RISING TIDE", "v2.9.5  ·  5 NEW UNITS", 0.955)
keyart("coming_soon_9x16.jpg", "soon_9x16.png", 1080, 1920, 0.30, "RISING TIDE", "COMING SOON", 0.965)
keyart("coming_soon_1x1.jpg", "soon_1x1.png", 1080, 1080, 0.36, "RISING TIDE", "COMING SOON", 0.955)

# Unit spotlights: the card portrait, name, rarity and one line.
UNITS = [
    ("heart_surgeon", "HEART SURGEON", "MYTHIC", "Every room is her operating table.", (255, 120, 200)),
    ("murcielago", "DARK SPAWN", "MYTHIC", "May awaken mid-fight into one of three forms.", (140, 255, 120)),
    ("windrunner", "WINDRUNNER", "LEGENDARY", "Roots them. When they fall, the roots jump.", (143, 220, 90)),
    ("cursed_totem", "CURSED TOTEM", "LEGENDARY", "Never attacks. Its neighbours execute.", (201, 160, 255)),
    ("sea_serpent", "SEA SERPENT", "LEGENDARY · ???", "Race ???  ·  Element ???  ·  Ability ???", CYAN),
]
for uid, name, rar, line, col in UNITS:
    im = Image.new("RGBA", (1080, 1080), NAVY + (255,))
    bg = fit(os.path.join(RAW, "soon_1x1.png" if uid == "sea_serpent" else "keyart_1x1.png"), 1080, 1080).filter(ImageFilter.GaussianBlur(18))
    im.alpha_composite(Image.blend(bg, Image.new("RGBA", bg.size, NAVY + (255,)), 0.55))
    p = Image.open(os.path.join(ROOT, f"assets/cards/portraits/{uid}.png")).convert("RGBA").resize((700, 700), Image.LANCZOS)
    if uid == "sea_serpent":
        p = Image.blend(p, Image.new("RGBA", p.size, (5, 10, 30, 255)), 0.45)
    frame = Image.new("RGBA", (724, 724), col + (255,))
    im.alpha_composite(frame, (178, 120))
    im.alpha_composite(p, (190, 132))
    logo(im, 260, (24, 16))
    text(im, (540, 900), name, 92, (255, 255, 255), glow=col)
    text(im, (540, 975), rar, 40, GOLD)
    text(im, (540, 1035), line, 36, col)
    im.convert("RGB").save(os.path.join(HERE, f"unit_{uid}.jpg"), quality=92)
    print("wrote", f"unit_{uid}.jpg")

# In-game teaser art (the lobby SOON orb's popup): the square teaser, no text.
os.makedirs(os.path.join(ROOT, "assets/ui"), exist_ok=True)
Image.open(os.path.join(RAW, "soon_1x1.png")).convert("RGB").resize((768, 768), Image.LANCZOS).save(os.path.join(ROOT, "assets/ui/coming_soon.png"))
print("wrote assets/ui/coming_soon.png")
