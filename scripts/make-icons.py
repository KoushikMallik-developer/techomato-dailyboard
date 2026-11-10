"""Draws the DailyBoard mark and writes every app icon in assets/. Run: python scripts/make-icons.py
The mark is a masonry "board" of four rounded tiles. Geometry is in 24-unit glyph space and matches
src/components/Logo.tsx and assets/brand/logo.svg. Pillow only; shapes are drawn at 4x and scaled down for smooth edges."""
from PIL import Image, ImageDraw
import os

BRAND, DEEP, WHITE, DARK = "#C8381F", "#8E2413", "#FFFFFF", "#141417"
# (x, y, w, h, fill) in glyph units. The small top-right tile is the deep accent.
TILES = [(4, 4, 6.5, 9, WHITE), (13.5, 4, 6.5, 5, DEEP), (13.5, 12, 6.5, 8, WHITE), (4, 16, 6.5, 4, WHITE)]
R = 1.5  # tile corner radius, glyph units
SS = 4   # supersampling


def glyph(img, size, unit, deep=DEEP, flat=None):
    """Draw the four tiles centred on a size x size image. unit = pixels per glyph unit."""
    d = ImageDraw.Draw(img)
    off = (size - 24 * unit * SS) / 2  # img is already size*SS wide; glyph space is 24 units square
    for x, y, w, h, fill in TILES:
        c = flat or (deep if fill == DEEP else fill)
        d.rounded_rectangle([off + x * unit * SS, off + y * unit * SS, off + (x + w) * unit * SS, off + (y + h) * unit * SS], radius=R * unit * SS, fill=c)


def canvas(size, bg=None):
    return Image.new("RGBA", (size * SS, size * SS), bg or (0, 0, 0, 0))


def save(img, name, size):
    path = os.path.join("assets", name)
    img.resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path)


# Launcher icon: full-bleed brand orange (stores apply their own mask). Glyph is 16 units of the 24-unit box = 66% of the width.
S = 1024
im = canvas(S, BRAND)
glyph(im, S * SS, S / 24 * 1.0)  # the 16-unit glyph spans ~67% of the icon
save(im, "icon.png", S)

# Android adaptive icon: the system masks to a circle/squircle, so keep the glyph inside the central 66% safe zone.
im = canvas(S)
glyph(im, S * SS, S / 24 * 0.68)
save(im, "android-icon-foreground.png", S)
save(canvas(S, BRAND), "android-icon-background.png", S)

# Themed (monochrome) icon: one flat colour, transparency does the rest.
im = canvas(S)
glyph(im, S * SS, S / 24 * 0.68, flat=WHITE)
save(im, "android-icon-monochrome.png", S)

# Splash: brand tile with the glyph, on a transparent canvas (the splash background colour comes from the app config).
im = canvas(S)
d = ImageDraw.Draw(im)
pad = S * 0.20
d.rounded_rectangle([pad * SS, pad * SS, (S - pad) * SS, (S - pad) * SS], radius=S * 0.16 * SS, fill=BRAND)
glyph(im, S * SS, S / 24 * 0.62)
save(im, "splash-icon.png", S)

# Favicon: rounded brand tile, glyph larger so it survives at 48px.
F = 192
im = canvas(F)
d = ImageDraw.Draw(im)
d.rounded_rectangle([0, 0, F * SS - 1, F * SS - 1], radius=F * 0.2 * SS, fill=BRAND)
glyph(im, F * SS, F / 24 * 1.2)
im.resize((48, 48), Image.LANCZOS).save("assets/favicon.png")
print("wrote assets/favicon.png")

# Source SVG, for design tools and README use.
os.makedirs("assets/brand", exist_ok=True)
rects = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{R}" fill="{fill}"/>' for x, y, w, h, fill in TILES)
open("assets/brand/logo.svg", "w", encoding="utf8").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512"><rect width="24" height="24" rx="5.5" fill="{BRAND}"/>'
    f'<g transform="translate(12 12) scale(1.0) translate(-12 -12)">{rects}</g></svg>\n')
print("wrote assets/brand/logo.svg")
