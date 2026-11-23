#!/usr/bin/env python3
"""
Regenerates the web app's brand assets from the CodeArchy logo used by the
site (apps/site/public/assets/images/logo.png: black ink, gradient </>, on a
transparent background):

  brand/logo-dark.png    black ink, for light backgrounds   (128 px)
  brand/logo-light.png   light ink, for dark backgrounds    (128 px)
  favicon-32.png / favicon-32-light.png
  apple-touch-icon.png   180 px, light ink on the app background
  icon-192.png, icon-512.png, icon-maskable-512.png (PWA; maskable keeps the
                         logo inside the 80% safe zone)

  python3 apps/app/scripts/make-icons.py
"""
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parent.parent
SOURCE = APP.parent / 'site' / 'public' / 'assets' / 'images' / 'logo.png'
OUT = APP / 'public'
BACKGROUND = (21, 23, 28, 255)  # #15171c, the app's dark background / theme colour
LIGHT_INK = (230, 232, 238)

logo = Image.open(SOURCE).convert('RGBA')

def light_ink(img: Image.Image) -> Image.Image:
    """Recolour the black strokes (keeping their alpha); the gradient </> stays as is."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and r < 60 and g < 60 and b < 60:
                px[x, y] = (*LIGHT_INK, a)
    return out

def fit(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)

def on_background(img: Image.Image, size: int, inner: float) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), BACKGROUND)
    s = round(size * inner)
    mark = fit(img, s)
    canvas.alpha_composite(mark, ((size - s) // 2, (size - s) // 2))
    return canvas

light = light_ink(logo)
(OUT / 'brand').mkdir(parents=True, exist_ok=True)
fit(logo, 128).save(OUT / 'brand' / 'logo-dark.png', optimize=True)
fit(light, 128).save(OUT / 'brand' / 'logo-light.png', optimize=True)
fit(logo, 32).save(OUT / 'favicon-32.png', optimize=True)
fit(light, 32).save(OUT / 'favicon-32-light.png', optimize=True)
on_background(light, 180, 0.72).save(OUT / 'apple-touch-icon.png', optimize=True)
on_background(light, 192, 0.72).save(OUT / 'icon-192.png', optimize=True)
on_background(light, 512, 0.72).save(OUT / 'icon-512.png', optimize=True)
on_background(light, 512, 0.56).save(OUT / 'icon-maskable-512.png', optimize=True)
print('brand assets written to', OUT)
