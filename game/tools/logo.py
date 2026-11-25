"""The mark of LAST LESSON: the school bell that never rang, with a lit door and a keyhole in it.

    python game/tools/logo.py

Writes the SVG favicons and the PNG icons of the site and the game from one pixel grid.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BLUE, DEEP, GOLD, LIGHT, SHADE, NIGHT, GLOW = '#2558d6', '#173a9a', '#e9b44c', '#ffe2a0', '#a86a1c', '#0b1230', '#fff6d8'
PALETTE = {'G': GOLD, 'L': LIGHT, 'S': SHADE, 'N': NIGHT, 'W': GLOW}

# Half widths of the bell, row by row: ring, shoulders, body, rim, clapper. 24 x 24 pixels in all.
SIZE = 24
BODY = [2, 2, 4, 6, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 10]
TOP = 4


def draw():
    """The bell is round, so the left is lit and the right is in shade; the doorway is cut out of the middle."""
    g = [['.'] * SIZE for _ in range(SIZE)]
    def run(y, half, ch):
        for x in range(12 - half, 12 + half):
            g[y][x] = ch
    for y, row in enumerate(['.LGGS.', 'LG..GS', 'LG..GS', '.LGGS.']):
        for i, ch in enumerate(row):
            g[y][9 + i] = ch
    for n, half in enumerate(BODY):
        y = TOP + n
        run(y, half, 'G')
        edge = 1 if half < 5 else 2
        for i in range(edge):
            g[y][12 - half + i], g[y][11 + half - i] = 'L', 'S'
    for y, half, left in ((19, 11, 'L'), (20, 11, 'S')):
        run(y, half, 'G' if left == 'L' else 'S')
        g[y][12 - half] = left
        g[y][11 + half] = 'S'
    # Doorway: an arch of night with light in it, and a keyhole that takes answers instead of keys.
    for y, half in ((8, 2), (9, 4), (10, 4), *((r, 5) for r in range(11, 19))):
        run(y, half, 'N')
    for y, half in ((9, 2), (10, 3), *((r, 4) for r in range(11, 19))):
        run(y, half, 'W')
    for y, half in ((12, 1), (13, 2), (14, 2), (15, 1), (16, 1), (17, 2)):
        run(y, half, 'N')
    for y, row in ((21, 'LGGS'), (22, 'GGSS'), (23, '.SS.')):
        for i, ch in enumerate(row):
            g[y][10 + i] = ch
    return [''.join(r) for r in g]


BELL = draw()


def rects(grid, dx, dy):
    """Horizontal runs of one colour as single rectangles keep the SVG small."""
    out = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            c, start = row[x], x
            while x < len(row) and row[x] == c:
                x += 1
            if c in PALETTE:
                out.append(f'<rect x="{start + dx}" y="{y + dy}" width="{x - start}" height="1" fill="{PALETTE[c]}"/>')
    return ''.join(out)


def svg(tile: bool) -> str:
    size, off = (32, 4) if tile else (SIZE, 0)
    back = f'<rect width="32" height="32" rx="7" fill="{BLUE}"/><path d="M0 23h32v2a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7z" fill="{DEEP}"/>' if tile else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges">{back}{rects(BELL, off, off)}</svg>\n'


def png(size: int) -> Image.Image:
    im = Image.new('RGB', (32, 32), BLUE)
    im.paste(DEEP, (0, 23, 32, 32))
    for y, row in enumerate(BELL):
        for x, c in enumerate(row):
            if c in PALETTE:
                im.putpixel((x + 4, y + 4), tuple(int(PALETTE[c][i:i + 2], 16) for i in (1, 3, 5)))
    return im.resize((size, size), Image.NEAREST)


if __name__ == '__main__':
    for folder in ('apps/web/public', 'game/public'):
        (ROOT / folder / 'favicon.svg').write_text(svg(True), encoding='utf8')
        (ROOT / folder / 'logo.svg').write_text(svg(False), encoding='utf8')
    for size in (64, 192, 512):
        png(size).save(ROOT / f'apps/web/public/icons/icon-{size}x{size}.png')
