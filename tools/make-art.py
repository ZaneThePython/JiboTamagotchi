# Draws the action-button glyphs (265x265 white, like Jibo's stock actionIcons), the Store icon
# (330x330) and banner (1000x800).  python3 tools/make-art.py .
import math, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = sys.argv[1]
S = 4  # supersample
WHITE, CLEAR = (255, 255), (0, 0)

def canvas(size=265):
    im = Image.new('LA', (size * S, size * S), CLEAR); return im, ImageDraw.Draw(im)

def save(im, path, size=265): im.resize((size, size), Image.LANCZOS).save(path)

def P(x, y): return (x * S, y * S)

def disc(d, x, y, r, fill=WHITE): d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=fill)

def apple():
    im, d = canvas()
    disc(d, 110, 150, 58); disc(d, 155, 150, 58)
    d.ellipse([P(118, 90), P(147, 112)], fill=CLEAR)  # dimple at the top
    d.line([P(132, 100), P(140, 62)], fill=WHITE, width=10 * S)
    d.ellipse([P(146, 58), P(190, 80)], fill=WHITE)  # leaf
    return im

def ball():
    """A tennis ball: two seams curving in from the sides."""
    im, d = canvas(); c = 132
    disc(d, c, c, 78)
    for sx, start in ((-1, -55), (1, 125)):
        x = c + sx * 118
        d.arc([P(x - 78, c - 78), P(x + 78, c + 78)], start, start + 110, fill=CLEAR, width=10 * S)
    return im

def moon():
    im, d = canvas(); c = 132
    disc(d, c, c, 62); d.ellipse([P(c - 32, c - 82), P(c + 82, c + 32)], fill=CLEAR)
    disc(d, 178, 92, 7); disc(d, 200, 130, 5)
    return im

def pet(size, fill=WHITE, face=CLEAR):
    """The pet's silhouette: round body, feet, antenna, two eyes and a smile cut out."""
    im, d = canvas(size); k = size / 330; c = size / 2
    q = lambda v: v * k
    disc(d, c - q(52), c + q(108), q(30), fill); disc(d, c + q(52), c + q(108), q(30), fill)
    d.ellipse([P(c - q(115), c - q(95)), P(c + q(115), c + q(115))], fill=fill)
    d.line([P(c, c - q(90)), P(c + q(22), c - q(140))], fill=fill, width=int(q(10) * S))
    disc(d, c + q(22), c - q(142), q(16), fill)
    for s in (-1, 1): disc(d, c + s * q(42), c - q(5), q(19), face)
    d.arc([P(c - q(30), c + q(5)), P(c + q(30), c + q(55))], 20, 160, fill=face, width=int(q(9) * S))
    return im

for name, fn in [('feed', apple), ('play', ball), ('sleep', moon)]:
    save(fn(), f'{ROOT}/tamagotchi/resources/{name}.png')
save(pet(330), f'{ROOT}/icon.png', 330)

# Banner: dark background, glowing title, the pet in cyan with a heart.
FONT = '/root/.hermes/cache/scratch/Nunito.ttf'
W, H = 1000 * 2, 800 * 2
banner = Image.new('RGBA', (W, H), (14, 16, 26, 255))
layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
PINK, CYAN = (255, 111, 168, 255), (95, 221, 230, 255)
g = pet(330).resize((340 * 2, 340 * 2), Image.LANCZOS)
tint = Image.new('RGBA', g.size, CYAN); tint.putalpha(g.getchannel('A'))
layer.alpha_composite(tint, ((500 - 170) * 2, 90 * 2))
hd = ImageDraw.Draw(layer); hx, hy, hr = 740 * 2, 150 * 2, 34 * 2
hd.ellipse([hx - hr * 2, hy - hr, hx, hy + hr], fill=PINK); hd.ellipse([hx, hy - hr, hx + hr * 2, hy + hr], fill=PINK)
hd.polygon([(hx - hr * 2 + 6, hy + 14), (hx + hr * 2 - 6, hy + 14), (hx, hy + hr * 2 + 30)], fill=PINK)
f = ImageFont.truetype(FONT, 116 * 2); f.set_variation_by_name('Black')
hd.text((W // 2, 560 * 2), 'Tamagotchi', font=f, fill=PINK, anchor='mm')
blur = layer.filter(ImageFilter.GaussianBlur(14 * 2))
banner.alpha_composite(blur); banner.alpha_composite(blur); banner.alpha_composite(layer)
banner.convert('RGB').resize((1000, 800), Image.LANCZOS).save(f'{ROOT}/banner.png')
print('art written')
