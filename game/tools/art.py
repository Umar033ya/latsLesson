"""Draws every sprite of LAST LESSON in one palette and packs them into public/assets.

    pip install pillow
    python game/tools/art.py

Original artwork. Nothing is traced or sampled from other games.
"""
import json
import math
import os
import random
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets")
os.makedirs(OUT, exist_ok=True)

P = dict(
    ink="#0a0c13", night="#131826", dusk="#1e2738", slate="#2f3c51", steel="#4a5c72", mist="#7d93a5", fog="#b4c3cc",
    bone="#cfc6a9", paper="#ece3c8", white="#f7f3e3",
    w0="#21161a", w1="#3a2826", w2="#5c3f33", w3="#855c43", w4="#b38358", w5="#d4ab78",
    g0="#152524", g1="#20383a", g2="#30544e", g3="#4c7763", g4="#79a07c",
    r0="#3d151d", r1="#6f2430", r2="#b23a3f", r3="#dd6a55",
    a0="#6d4322", a1="#b5762f", a2="#e0a848", a3="#f6dd96",
    t0="#1b3a4a", t1="#2f6173", t2="#5b9aa6", t3="#a4d3d0",
    v0="#2a2238", v1="#463a5c", v2="#6f5f88",
    skin="#e6bd98", skin2="#bd8a72",
)


def C(name, a=255):
    h = P.get(name, name).lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


class S:
    """Tiny drawing surface."""

    def __init__(self, w, h):
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
        self.w, self.h = w, h

    def r(self, x, y, w, h, c):
        if w > 0 and h > 0:
            self.d.rectangle([x, y, x + w - 1, y + h - 1], fill=C(c) if isinstance(c, str) else c)
        return self

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((int(x), int(y)), C(c) if isinstance(c, str) else c)
        return self

    def l(self, x0, y0, x1, y1, c):
        self.d.line([x0, y0, x1, y1], fill=C(c))
        return self

    def e(self, x, y, w, h, c):
        self.d.ellipse([x, y, x + w - 1, y + h - 1], fill=C(c))
        return self

    def poly(self, pts, c):
        self.d.polygon(pts, fill=C(c))
        return self

    def noise(self, x, y, w, h, c, density, rnd):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if rnd.random() < density and 0 <= xx < self.w and 0 <= yy < self.h and self.im.getpixel((xx, yy))[3]:
                    self.px(xx, yy, c)
        return self

    def box(self, x, y, w, h, base, hi, lo):
        """Bevelled block."""
        self.r(x, y, w, h, base).r(x, y, w, 1, hi).r(x, y, 1, h, hi).r(x, y + h - 1, w, 1, lo).r(x + w - 1, y, 1, h, lo)
        return self

    def outline(self, c="ink"):
        src = self.im.copy()
        col = C(c)
        for y in range(self.h):
            for x in range(self.w):
                if src.getpixel((x, y))[3] == 0:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < self.w and 0 <= yy < self.h and src.getpixel((xx, yy))[3] > 200:
                            self.im.putpixel((x, y), col)
                            break
        return self

    def shadow(self, w=None, dy=0):
        """Soft contact shadow under the sprite."""
        base = Image.new("RGBA", self.im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(base)
        w = w or self.w - 2
        x = (self.w - w) // 2
        d.ellipse([x, self.h - 5 + dy, x + w - 1, self.h - 1 + dy], fill=(4, 5, 9, 120))
        base.alpha_composite(self.im)
        self.im = base
        self.d = ImageDraw.Draw(self.im)
        return self


SPR = {}


def add(name, s):
    SPR[name] = s.im if isinstance(s, S) else s


# ---------------------------------------------------------------- floors
def floors():
    for v in range(4):
        rnd = random.Random(10 + v)
        s = S(16, 16).r(0, 0, 16, 16, "w2")  # parquet
        for i in range(4):
            c = ["w2", "w3", "w2", "w1"][(i + v) % 4]
            s.r(0, i * 4, 16, 4, c).r(0, i * 4 + 3, 16, 1, "w1")
            x = (i * 7 + v * 5) % 16
            s.r(x, i * 4, 1, 3, "w1")
        s.noise(0, 0, 16, 16, "w1", 0.07, rnd).noise(0, 0, 16, 16, "w3", 0.04, rnd)
        add(f"floor_wood_{v}", s)

        s = S(16, 16).r(0, 0, 16, 16, "slate")  # corridor linoleum: checker
        s.r(0, 0, 8, 8, "#384a5c").r(8, 8, 8, 8, "#384a5c").r(0, 8, 8, 8, "#2b3848").r(8, 0, 8, 8, "#2b3848")
        s.r(0, 15, 16, 1, "#232e3c").r(15, 0, 1, 16, "#232e3c")
        s.noise(0, 0, 16, 16, "#232e3c", 0.05, rnd).noise(0, 0, 16, 16, "#465a6e", 0.04, rnd)
        if v == 3:
            s.l(3, 2, 8, 7, "#1d2632").l(8, 7, 7, 12, "#1d2632")
        add(f"floor_hall_{v}", s)

        s = S(16, 16).r(0, 0, 16, 16, "#4b6a6b")  # lab tiles
        for x in (0, 8):
            for y in (0, 8):
                s.box(x, y, 8, 8, "#557678" if (x + y + v) % 16 else "#4b6a6b", "#658889", "#36504f")
        s.noise(0, 0, 16, 16, "#36504f", 0.04, rnd)
        add(f"floor_tile_{v}", s)

        s = S(16, 16).r(0, 0, 16, 16, "#3a3a40")  # concrete
        s.noise(0, 0, 16, 16, "#33333a", 0.3, rnd).noise(0, 0, 16, 16, "#46464c", 0.12, rnd).noise(0, 0, 16, 16, "#28282e", 0.05, rnd)
        if v == 2:
            s.l(0, 11, 6, 9, "#222228").l(6, 9, 15, 13, "#222228")
        add(f"floor_concrete_{v}", s)

        s = S(16, 16).r(0, 0, 16, 16, "#5a2a34")  # library carpet
        s.noise(0, 0, 16, 16, "#4a212b", 0.35, rnd)
        for i in range(0, 16, 8):
            s.px(i + 4, 4 + (v % 2) * 8, "#8a5a3c").px(i + 3, 5 + (v % 2) * 8, "#8a5a3c").px(i + 5, 5 + (v % 2) * 8, "#8a5a3c").px(i + 4, 6 + (v % 2) * 8, "#8a5a3c")
        add(f"floor_carpet_{v}", s)

        s = S(16, 16).r(0, 0, 16, 16, "#8a6038")  # gym planks
        for i in range(2):
            s.r(0, i * 8, 16, 8, ["#8f643b", "#845a34"][(i + v) % 2]).r(0, i * 8 + 7, 16, 1, "#5f3f26")
            s.r((i * 9 + v * 4) % 16, i * 8, 1, 7, "#6b482b")
        s.noise(0, 0, 16, 16, "#a0734a", 0.05, rnd)
        add(f"floor_gym_{v}", s)


# ---------------------------------------------------------------- wall faces (16 x 32)
def walls():
    for v in range(3):
        rnd = random.Random(50 + v)

        def paint(upper, up_lo, lower, low_hi, low_lo, stripe):
            s = S(16, 32).r(0, 0, 16, 14, upper).r(0, 14, 16, 1, stripe).r(0, 15, 16, 14, lower).r(0, 15, 16, 1, low_hi)
            s.r(0, 0, 16, 2, up_lo).noise(0, 2, 16, 12, up_lo, 0.06, rnd).noise(0, 16, 16, 12, low_lo, 0.1, rnd)
            s.r(0, 29, 16, 3, "w1").r(0, 29, 16, 1, "w3").r(0, 31, 16, 1, "ink")
            if v == 1:  # peeling
                s.poly([(4, 18), (9, 17), (11, 22), (6, 24)], "#8c8872").poly([(5, 19), (9, 18), (9, 22)], "#a39e86").l(4, 18, 6, 24, low_lo)
            if v == 2:  # damp crack
                s.l(10, 2, 8, 6, up_lo).l(8, 6, 11, 10, up_lo).l(11, 10, 10, 14, up_lo)
            return s

        add(f"wall_hall_{v}", paint("#8a947f", "#76806d", "g2", "g3", "g1", "g0"))
        add(f"wall_class_{v}", paint("#9c8f74", "#867a63", "#5d4a4a", "#75605c", "#4c3c3e", "#3a2c30"))
        add(f"wall_lab_{v}", paint("#9db0ad", "#879b99", "t1", "t2", "t0", "#15303c"))
        s = S(16, 32).r(0, 0, 16, 32, "w2")  # library panels
        s.r(0, 0, 16, 3, "w1").r(0, 3, 16, 1, "w4").box(1, 6, 14, 20, "w2", "w3", "w1").box(3, 8, 10, 16, "#533930", "w1", "w3")
        s.r(0, 28, 16, 4, "w1").r(0, 28, 16, 1, "w3").r(0, 31, 16, 1, "ink").noise(0, 4, 16, 24, "w1", 0.06, rnd)
        add(f"wall_library_{v}", s)
        s = S(16, 32).r(0, 0, 16, 32, "#4a4a50")  # bricks
        for row in range(8):
            off = 4 if row % 2 else 0
            for x in range(-4, 16, 8):
                c = rnd.choice(["#5b4a48", "#52423f", "#624f4b", "#493b3b"])
                s.r(x + off, row * 4, 7, 3, c).r(x + off, row * 4, 7, 1, "#6f5b55")
        s.r(0, 30, 16, 2, "ink").noise(0, 0, 16, 30, "#2f2b2e", 0.08, rnd)
        add(f"wall_brick_{v}", s)


# ---------------------------------------------------------------- props
def props():
    rnd = random.Random(7)
    s = S(20, 22)  # pupil desk
    s.r(3, 9, 2, 11, "w1").r(15, 9, 2, 11, "w1").r(1, 4, 18, 6, "w3").r(1, 4, 18, 1, "w5").r(1, 9, 18, 2, "w2").r(1, 11, 18, 1, "w0")
    s.r(5, 5, 6, 3, "paper").r(6, 6, 4, 1, "mist").px(13, 6, "ink").r(13, 5, 3, 1, "r2")
    add("desk", s.outline().shadow())
    s = S(20, 22)
    s.r(3, 9, 2, 11, "w1").r(15, 9, 2, 11, "w1").r(1, 4, 18, 6, "w3").r(1, 4, 18, 1, "w5").r(1, 9, 18, 2, "w2").r(1, 11, 18, 1, "w0").l(6, 6, 9, 8, "w1").l(12, 5, 15, 6, "w1")
    add("desk_empty", s.outline().shadow())
    s = S(22, 18)  # overturned desk
    s.poly([(2, 12), (14, 2), (20, 7), (8, 16)], "w3").l(2, 12, 14, 2, "w5").poly([(8, 16), (20, 7), (20, 9), (8, 17)], "w1").l(14, 2, 17, 0, "w1").l(4, 11, 1, 8, "w1")
    add("desk_fallen", s.outline().shadow())
    s = S(12, 18)
    s.r(2, 1, 8, 8, "w3").r(2, 1, 8, 1, "w5").r(3, 4, 6, 1, "w1").r(1, 9, 10, 3, "w4").r(1, 11, 10, 1, "w2").r(2, 12, 1, 5, "w1").r(9, 12, 1, 5, "w1")
    add("chair", s.outline().shadow())
    s = S(44, 28)  # teacher's desk
    s.r(1, 6, 42, 8, "w3").r(1, 6, 42, 1, "w5").r(2, 14, 40, 11, "w2").r(2, 14, 40, 1, "w0").box(4, 16, 12, 8, "w2", "w3", "w1").box(28, 16, 12, 8, "w2", "w3", "w1").r(9, 19, 2, 1, "a2").r(33, 19, 2, 1, "a2")
    s.r(6, 2, 6, 6, "r1").r(6, 2, 6, 1, "r2").r(7, 4, 4, 1, "a2").r(16, 7, 8, 4, "paper").r(17, 8, 6, 1, "mist").r(17, 10, 4, 1, "mist").e(34, 2, 6, 7, "t1").r(35, 3, 2, 2, "t3").r(36, 0, 2, 2, "w4")
    add("teacher_desk", s.outline().shadow())
    s = S(72, 30)  # blackboard
    s.box(0, 0, 72, 27, "w3", "w5", "w1").r(2, 2, 68, 22, "#1f3a36").noise(2, 2, 68, 22, "#284840", 0.12, rnd).r(4, 5, 22, 1, "#8fa79b").r(4, 9, 30, 1, "#6f8a7f").r(4, 13, 16, 1, "#8fa79b").r(44, 6, 18, 12, "#1f3a36")
    s.d.ellipse([46, 6, 60, 18], outline=C("#7f9a8e"))
    s.l(53, 12, 53, 8, "#7f9a8e").l(53, 12, 57, 13, "#7f9a8e").r(1, 25, 70, 3, "w2").r(1, 25, 70, 1, "w4").r(10, 24, 4, 1, "white").r(20, 24, 3, 1, "r3").r(56, 23, 7, 2, "bone")
    add("blackboard", s)
    for i, (n, on) in enumerate((("window", False), ("window_flash", True))):
        s = S(28, 32)
        sky = ["#27364e", "#1e2a3f", "#18212f"] if not on else ["#dfe9f5", "#b9cfe6", "#91abc9"]
        s.box(0, 0, 28, 30, "#8c8a7a", "#b5b29d", "#5d5c52").r(2, 2, 24, 26, sky[2])
        s.r(2, 2, 24, 9, sky[0]).r(2, 11, 24, 9, sky[1])
        if on:
            s.l(18, 2, 14, 10, "white").l(14, 10, 17, 14, "white").l(17, 14, 13, 24, "white")
        s.r(3, 18, 8, 10, "#101722").r(15, 21, 11, 7, "#101722").r(5, 15, 4, 4, "#101722")
        for k in range(10):
            x, y = rnd.randrange(3, 25), rnd.randrange(3, 24)
            s.l(x, y, x - 1, y + 3, "#4b6384" if not on else "#f5fbff")
        s.r(13, 2, 2, 26, "#8c8a7a").r(2, 13, 24, 2, "#8c8a7a").r(0, 29, 28, 3, "#a3a08d").r(0, 31, 28, 1, "#5d5c52")
        add(n, s)
    s = S(16, 34)  # locker
    s.box(0, 0, 16, 32, "t1", "t2", "t0").r(3, 4, 10, 1, "t0").r(3, 6, 10, 1, "t0").r(3, 8, 10, 1, "t0").r(12, 16, 2, 4, "fog").r(3, 24, 10, 1, "t0").r(2, 30, 12, 2, "ink").px(5, 13, "a2").px(6, 13, "a2")
    add("locker", s.outline("ink"))
    s = S(16, 34)
    s.box(0, 0, 16, 32, "t1", "t2", "t0").r(2, 2, 12, 28, "ink").r(0, 1, 4, 31, "t2").r(3, 1, 1, 31, "t0").r(6, 6, 6, 1, "steel").r(7, 8, 1, 9, "r1")
    add("locker_open", s.outline("ink"))
    s = S(18, 42)  # wardrobe, a hiding place
    s.box(0, 1, 18, 39, "w2", "w4", "w1").r(8, 3, 1, 35, "w0").r(6, 20, 1, 3, "a2").r(10, 20, 1, 3, "a2").box(2, 4, 5, 13, "w2", "w1", "w3").box(11, 4, 5, 13, "w2", "w1", "w3").box(2, 22, 5, 14, "w2", "w1", "w3").box(11, 22, 5, 14, "w2", "w1", "w3")
    add("wardrobe", s.outline("ink"))
    for v in range(3):  # bookshelves
        r2 = random.Random(90 + v)
        s = S(48, 44).box(0, 0, 48, 42, "w2", "w4", "w1")
        for row in range(3):
            y = 3 + row * 13
            s.r(2, y, 44, 11, "w0")
            x = 3
            while x < 44:
                w, h = r2.choice([2, 3, 3, 4]), r2.randrange(6, 11)
                if r2.random() < 0.13:
                    x += r2.randrange(2, 6)
                    continue
                c = r2.choice(["r1", "g2", "t1", "a0", "v1", "bone", "w3", "slate", "r2", "g3"])
                if x + w < 46:
                    s.r(x, y + 11 - h, w, h, c).r(x, y + 12 - h, w, 1, r2.choice(["a1", "bone", "ink"]))
                x += w
            s.r(2, y + 11, 44, 1, "w4")
        add(f"shelf_{v}", s.outline("ink"))
    s = S(40, 34)  # card catalogue
    s.box(0, 2, 40, 30, "w3", "w5", "w1")
    for x in range(4):
        for y in range(4):
            s.box(2 + x * 9, 4 + y * 7, 8, 6, "w2", "w4", "w1").r(5 + x * 9, 6 + y * 7, 3, 2, "a2").px(6 + x * 9, 7 + y * 7, "ink")
    s.r(20, 11, 8, 8, "w0").r(21, 13, 6, 5, "paper").r(21, 12, 6, 1, "bone")
    add("catalogue", s.outline().shadow())
    s = S(48, 46)  # specimen cabinet
    s.box(0, 0, 48, 44, "g1", "g3", "g0").r(3, 3, 42, 36, "#162426")
    for row in range(3):
        y = 4 + row * 12
        s.r(3, y + 10, 42, 2, "g2")
        for k, c in enumerate(["t2", "a1", "g4", "t1", "r3"]):
            x = 5 + k * 8
            s.r(x, y + 2, 6, 8, "#27464a").r(x, y + 4, 6, 6, c).r(x, y + 1, 6, 1, "bone").r(x + 1, y + 3, 1, 5, "t3").e(x + 2, y + 5, 3, 4, "paper" if (k + row) % 2 else "ink")
    s.r(23, 2, 2, 38, "g2").l(8, 5, 18, 34, "#5e8585").l(30, 5, 38, 30, "#5e8585")
    add("specimens", s.outline("ink"))
    s = S(52, 26)  # lab bench
    s.r(1, 6, 50, 6, "#7f9794").r(1, 6, 50, 1, "t3").r(2, 12, 48, 12, "t0").r(2, 12, 48, 1, "ink").box(5, 14, 12, 8, "t1", "t2", "t0").box(34, 14, 12, 8, "t1", "t2", "t0").r(22, 14, 8, 10, "ink")
    s.r(8, 0, 2, 7, "ink").r(6, 5, 7, 2, "ink").r(9, 1, 5, 2, "steel").e(22, 2, 5, 5, "t2").r(24, 0, 1, 3, "t3").r(30, 1, 2, 6, "t3").r(34, 2, 2, 5, "a2").r(40, 4, 8, 3, "paper")
    add("lab_bench", s.outline().shadow())
    s = S(20, 44)  # skeleton
    s.e(6, 1, 8, 8, "bone").r(8, 4, 1, 2, "ink").r(11, 4, 1, 2, "ink").r(9, 8, 3, 1, "ink").r(9, 9, 2, 14, "bone")
    for i in range(4):
        s.r(5, 11 + i * 2, 10, 1, "bone")
    s.r(6, 22, 8, 3, "bone").r(7, 25, 2, 14, "bone").r(11, 25, 2, 14, "bone").r(4, 11, 1, 12, "bone").r(15, 11, 1, 12, "bone").r(9, 0, 1, 1, "steel").r(2, 41, 16, 2, "w1").r(9, 38, 2, 3, "steel")
    add("skeleton", s.outline().shadow())
    s = S(46, 50)  # boiler
    s.e(2, 0, 42, 22, "#5a4038").r(2, 10, 42, 36, "#5a4038").r(2, 10, 6, 36, "#6f5146").r(36, 10, 8, 36, "#3f2c28")
    for y in (14, 28, 42):
        s.r(2, y, 42, 2, "#3f2c28")
        for x in range(4, 44, 6):
            s.px(x, y, "a1")
    s.e(15, 17, 14, 14, "ink").e(17, 19, 10, 10, "bone").l(22, 24, 25, 21, "r2").box(12, 33, 20, 11, "#2a2022", "#6f5146", "ink").r(15, 36, 14, 1, "a1").r(15, 38, 14, 1, "r2").r(15, 40, 14, 1, "a1")
    add("boiler", s.outline().shadow())
    for n, on in (("breaker", False), ("breaker_on", True)):
        s = S(34, 30).box(0, 0, 34, 28, "steel", "mist", "slate").r(3, 3, 28, 22, "dusk")
        for x in range(5):
            s.r(5 + x * 5, 6, 4, 9, "ink").r(6 + x * 5, 7 if on else 11, 2, 3, "a3" if on else "r2")
        s.r(5, 18, 24, 5, "ink").r(6, 19, 6, 3, "a2" if on else "r0").r(16, 20, 11, 1, "mist").l(2, 28, 2, 30, "ink").l(30, 28, 30, 30, "ink")
        add(n, s.outline("ink"))
    s = S(60, 12).r(0, 2, 60, 5, "#5a4a42").r(0, 2, 60, 1, "#846d5e").r(0, 6, 60, 2, "#352a28").r(12, 0, 4, 10, "#6f5b50").r(40, 0, 4, 10, "#6f5b50")
    add("pipes", s)
    for n, op in (("safe", False), ("safe_open", True)):
        s = S(24, 26).box(0, 0, 24, 24, "steel", "mist", "slate")
        if op:
            s.r(3, 3, 18, 18, "ink").r(5, 14, 14, 1, "steel").r(7, 10, 5, 4, "a2").r(0, 1, 4, 22, "mist")
        else:
            s.box(3, 3, 18, 18, "slate", "steel", "dusk").e(8, 8, 9, 9, "ink").e(9, 9, 7, 7, "fog").l(12, 12, 14, 10, "r2").r(19, 10, 2, 5, "fog")
        add(n, s.outline("ink"))
    s = S(26, 24)  # globe
    s.e(6, 1, 14, 14, "t1").poly([(9, 4), (13, 3), (14, 8), (10, 9)], "g3").poly([(15, 8), (18, 7), (17, 12)], "g3").r(8, 3, 2, 2, "t3").r(12, 15, 2, 4, "w3").r(8, 19, 10, 2, "w2")
    add("globe", s.outline().shadow(14))
    s = S(40, 26)  # long table with typewriter
    s.r(1, 8, 38, 6, "w3").r(1, 8, 38, 1, "w5").r(3, 14, 34, 3, "w1").r(3, 17, 3, 7, "w1").r(34, 17, 3, 7, "w1").box(12, 2, 16, 9, "dusk", "steel", "ink").r(14, 0, 12, 4, "paper").r(15, 1, 8, 1, "mist").r(14, 6, 12, 3, "ink")
    for i in range(5):
        s.px(15 + i * 2, 6, "fog").px(16 + i * 2, 8, "fog")
    s.r(32, 5, 4, 4, "r1").r(4, 5, 5, 4, "paper")
    add("typewriter", s.outline().shadow())
    s = S(42, 26)  # sofa
    s.r(2, 2, 38, 12, "g2").r(2, 2, 38, 2, "g3").r(0, 8, 6, 14, "g2").r(36, 8, 6, 14, "g2").r(6, 12, 30, 8, "g3").r(21, 12, 1, 8, "g1").r(2, 20, 38, 3, "g0")
    add("sofa", s.outline().shadow())
    s = S(22, 36)  # coat stand
    s.r(10, 2, 2, 30, "w3").r(4, 4, 14, 1, "w3").r(3, 3, 1, 3, "w4").r(18, 3, 1, 3, "w4").r(3, 6, 6, 17, "v1").r(3, 6, 2, 17, "v2").r(13, 7, 6, 14, "r1").r(13, 7, 2, 14, "r2").r(5, 32, 12, 2, "w1")
    add("coats", s.outline().shadow(14))
    s = S(52, 38)  # piano
    s.r(1, 2, 50, 18, "w1").r(1, 2, 50, 2, "w3").r(1, 20, 50, 5, "w2").r(4, 20, 44, 3, "white")
    for i in range(14):
        if i % 7 not in (2, 6):
            s.r(6 + i * 3, 20, 1, 2, "ink")
    s.r(4, 25, 4, 11, "w0").r(44, 25, 4, 11, "w0").r(2, 25, 48, 2, "w0").r(18, 8, 16, 10, "paper").r(20, 10, 12, 1, "mist").r(20, 13, 10, 1, "mist")
    add("piano", s.outline().shadow())
    s = S(60, 34)  # scoreboard
    s.box(0, 0, 60, 30, "ink", "steel", "ink").r(3, 3, 54, 24, "#12161c")

    def seg(x, y, txt, c):
        font = {"2": "111001111100111", "3": "111001111001111", "1": "010010010010010", "0": "111101101101111"}
        for ch in txt:
            for i, b in enumerate(font[ch]):
                if b == "1":
                    s.r(x + (i % 3) * 2, y + (i // 3) * 2, 2, 2, c)
            x += 8

    seg(8, 7, "23", "a2")
    seg(36, 7, "01", "r3")
    s.r(29, 10, 2, 2, "a2").r(29, 15, 2, 2, "a2").r(8, 21, 44, 1, "r1").r(8, 23, 30, 1, "a1").r(6, 30, 3, 4, "steel").r(50, 30, 3, 4, "steel")
    add("scoreboard", s)
    s = S(96, 48)  # stage curtain
    for x in range(0, 96, 8):
        s.r(x, 0, 8, 48, "r1").r(x, 0, 3, 48, "r2").r(x + 6, 0, 2, 48, "r0")
    s.r(0, 0, 96, 5, "a0").r(0, 4, 96, 1, "a2").r(0, 44, 96, 2, "a1")
    add("curtain", s)
    s = S(48, 30)  # exam desk in the lobby
    s.r(1, 8, 46, 8, "w3").r(1, 8, 46, 1, "w5").r(2, 16, 44, 12, "w2").r(2, 16, 44, 1, "w0").r(16, 18, 16, 6, "a1").r(17, 19, 14, 4, "a2").r(18, 5, 12, 8, "paper").r(20, 7, 8, 1, "mist").r(20, 9, 8, 1, "mist").r(20, 11, 4, 1, "r2").l(32, 12, 37, 5, "ink").e(38, 8, 6, 5, "ink")
    add("exam_desk", s.outline().shadow())
    s = S(26, 48)  # bell on the wall with a rope
    s.r(9, 0, 8, 2, "steel").e(4, 2, 18, 14, "a1").r(4, 9, 18, 9, "a1").r(2, 17, 22, 3, "a0").r(6, 5, 3, 11, "a3").r(18, 6, 2, 11, "a0").r(12, 20, 2, 3, "ink").l(13, 23, 13, 44, "bone").r(12, 42, 3, 4, "r2")
    add("bell", s.outline("ink"))
    for n, op in (("door", False), ("door_open", True)):  # 16x40 wooden door seen from the front
        s = S(20, 40).r(0, 0, 20, 40, "w1").r(1, 1, 18, 39, "w0")
        if op:
            s.r(2, 2, 16, 38, "ink").r(2, 2, 4, 38, "w2").r(5, 2, 1, 38, "w0")
        else:
            s.r(2, 2, 16, 38, "w3").r(2, 2, 2, 38, "w4").r(16, 2, 2, 38, "w2").box(5, 5, 10, 13, "w2", "w1", "w4").box(5, 22, 10, 14, "w2", "w1", "w4").r(14, 20, 2, 3, "a2").r(7, 8, 6, 7, "#33465a").r(7, 8, 2, 7, "#4a627a")
        add(n, s)
    for n, op in (("gate", False), ("gate_open", True)):  # metal door
        s = S(20, 40).r(0, 0, 20, 40, "dusk")
        if op:
            s.r(2, 2, 16, 38, "ink").r(2, 2, 3, 38, "steel")
        else:
            s.r(2, 2, 16, 38, "steel").r(2, 2, 2, 38, "mist").r(16, 2, 2, 38, "slate")
            for y in (8, 20, 32):
                s.r(4, y, 12, 1, "slate").px(4, y + 1, "mist").px(15, y + 1, "mist")
            s.r(13, 18, 3, 5, "ink").px(14, 19, "r3")
        add(n, s)
    s = S(14, 48)  # door seen side-on, for openings in vertical walls
    s.r(4, 0, 6, 48, "w2").r(4, 0, 1, 48, "w4").r(9, 0, 1, 48, "w1").r(3, 0, 8, 2, "w1").r(3, 46, 8, 2, "w1").r(10, 24, 2, 3, "a2")
    add("door_side", s.outline("ink"))
    for n, op in (("exit", False), ("exit_open", True)):
        s = S(52, 44).r(0, 0, 52, 44, "w1").r(2, 2, 48, 42, "w0")
        for x in (3, 27):
            if op:
                s.r(x, 3, 22, 41, "#f1d9a0").r(x, 3, 22, 14, "#fff3cf").r(x, 34, 22, 10, "#e0a848")
            else:
                s.r(x, 3, 22, 41, "g2").r(x, 3, 2, 41, "g3").r(x + 20, 3, 2, 41, "g1").r(x + 5, 7, 12, 14, "#22303f").r(x + 5, 7, 5, 14, "#2f4155").r(x + 5, 13, 12, 1, "g1").box(x + 5, 26, 12, 14, "g1", "g0", "g3")
        s.r(23, 20, 2, 6, "a2").r(28, 20, 2, 6, "a2").r(0, 0, 52, 2, "w3")
        add(n, s)
    s = S(12, 14)  # intercom
    s.box(0, 0, 12, 13, "bone", "paper", "#8f8a72")
    for y in range(3):
        for x in range(4):
            s.px(2 + x * 2, 3 + y * 2, "ink")
    s.px(9, 11, "r2")
    add("intercom", s.outline("ink"))
    s = S(26, 20).box(0, 0, 26, 19, "w3", "w5", "w1").r(2, 2, 22, 15, "#8f7a55").r(4, 4, 7, 5, "paper").r(13, 3, 6, 7, "bone").r(6, 11, 9, 4, "white").r(17, 12, 5, 3, "a3").px(7, 4, "r2").px(16, 3, "r2").px(10, 11, "t2")
    add("board", s.outline("ink"))
    s = S(16, 16).e(0, 0, 16, 16, "w1").e(1, 1, 14, 14, "paper").l(8, 8, 12, 9, "ink").l(8, 8, 8, 3, "ink").px(8, 2, "ink").px(8, 13, "ink").px(2, 8, "ink").px(13, 8, "ink")
    add("clock", s)
    s = S(14, 18).box(0, 0, 14, 17, "w2", "w4", "w1").r(2, 2, 10, 13, "#4a4f4c").e(4, 4, 6, 6, "skin2").r(3, 10, 8, 5, "ink").r(4, 4, 6, 2, "w0")
    add("portrait", s.outline("ink"))
    s = S(24, 14).r(0, 1, 24, 11, "#b8b5a2")
    for x in range(0, 24, 4):
        s.r(x, 0, 3, 13, "#cfcbb6").r(x + 2, 0, 1, 13, "#8f8c7c")
    add("radiator", s.outline("ink"))
    s = S(34, 16).r(1, 3, 32, 4, "w4").r(1, 3, 32, 1, "w5").r(1, 7, 32, 2, "w2").r(4, 9, 2, 5, "w1").r(28, 9, 2, 5, "w1")
    add("bench", s.outline().shadow())
    s = S(16, 26)
    s.r(3, 15, 10, 9, "#8a5440").r(3, 15, 10, 2, "#a8694f").l(8, 15, 4, 4, "g3").l(8, 15, 8, 2, "g2").l(8, 15, 12, 5, "g3").l(8, 12, 2, 9, "a0").r(3, 2, 3, 3, "g3").r(11, 4, 3, 3, "g2").r(7, 0, 3, 4, "g4").r(1, 8, 3, 2, "a0")
    add("plant", s.outline().shadow(12))
    s = S(12, 14).r(2, 2, 8, 11, "steel").r(2, 2, 2, 11, "mist").r(1, 1, 10, 2, "fog").r(4, 0, 4, 2, "paper")
    add("bin", s.outline().shadow())
    s = S(10, 18).r(2, 4, 6, 13, "r2").r(2, 4, 2, 13, "r3").r(3, 1, 4, 3, "ink").l(7, 2, 9, 8, "ink").r(3, 9, 4, 3, "paper")
    add("extinguisher", s.outline("ink"))
    s = S(20, 24).r(2, 8, 16, 14, "fog").r(2, 8, 16, 2, "white").r(2, 20, 16, 2, "mist").e(5, 10, 10, 6, "mist").r(9, 4, 2, 6, "steel").r(9, 4, 5, 2, "steel").r(3, 0, 14, 1, "steel")
    add("sink", s.outline("ink"))
    s = S(34, 26)  # stacked chairs / crates
    s.box(1, 10, 15, 14, "w3", "w4", "w1").l(2, 11, 14, 22, "w1").box(17, 12, 14, 12, "w2", "w4", "w1").box(8, 1, 14, 11, "w3", "w5", "w1").l(9, 2, 20, 10, "w1")
    add("crates", s.outline().shadow())
    s = S(22, 30).r(2, 1, 18, 26, "#2b3550").r(2, 1, 18, 1, "steel").r(9, 1, 4, 26, "#36436a").r(0, 27, 22, 2, "ink").e(6, 10, 10, 10, "a1").r(8, 14, 6, 2, "r2")
    add("banner", s)
    # small things
    s = S(10, 10).r(1, 1, 8, 8, "paper").r(2, 3, 6, 1, "mist").r(2, 5, 5, 1, "mist").r(6, 7, 2, 1, "r2")
    add("note", s.outline("ink"))
    s = S(12, 10).e(0, 2, 6, 6, "a2").e(2, 4, 2, 2, "ink").r(5, 4, 6, 2, "a2").r(9, 6, 2, 2, "a1").px(1, 3, "a3")
    add("key", s.outline("ink"))
    s = S(8, 12).r(1, 2, 6, 9, "g3").r(1, 2, 2, 9, "g4").r(3, 0, 2, 2, "fog").r(1, 6, 6, 2, "a2")
    add("battery", s.outline("ink"))
    s = S(14, 8).r(0, 2, 9, 4, "r2").r(0, 2, 9, 1, "r3").r(9, 1, 4, 6, "fog").r(12, 2, 1, 4, "a3").r(4, 1, 2, 1, "ink")
    add("torch", s.outline("ink"))
    s = S(10, 8).r(1, 2, 8, 4, "a2").r(1, 2, 2, 4, "fog").r(7, 2, 2, 4, "fog").r(4, 3, 2, 2, "ink")
    add("fuse", s.outline("ink"))
    s = S(8, 6).r(1, 2, 6, 3, "white").r(1, 4, 6, 1, "fog")
    add("chalk", s.outline("ink"))
    s = S(12, 12).r(1, 1, 9, 10, "#d9c38a").r(2, 3, 7, 1, "a0").r(2, 5, 6, 1, "a0").r(2, 7, 7, 1, "a0").px(9, 9, "r2").px(8, 9, "r2").l(1, 1, 3, 0, "paper")
    add("page", s.outline("ink"))
    s = S(12, 14).e(1, 5, 10, 8, "a1").r(3, 6, 2, 5, "a3").r(5, 0, 2, 6, "steel").r(4, 12, 4, 2, "a0")
    add("clapper", s.outline("ink"))
    for v in range(3):
        s = S(16, 12)
        r2 = random.Random(v)
        for k in range(4):
            x, y = r2.randrange(0, 9), r2.randrange(0, 6)
            s.poly([(x, y + 2), (x + 5, y), (x + 7, y + 4), (x + 2, y + 6)], r2.choice(["paper", "bone"])).l(x + 2, y + 3, x + 5, y + 2, "mist")
        add(f"papers_{v}", s)
    s = S(30, 12)
    s.e(0, 2, 22, 9, "#2a3a50").e(14, 0, 16, 8, "#2a3a50").r(6, 4, 6, 1, "#6c86a6").r(18, 3, 5, 1, "#6c86a6")
    s.im.putalpha(s.im.getchannel("A").point(lambda a: 170 if a else 0))
    add("puddle", s)
    s = S(20, 8).r(0, 0, 20, 5, "#777a78").r(1, 5, 18, 2, "a3").r(0, 0, 20, 1, "#a5a8a3")
    add("lamp", s)
    s = S(32, 18).r(0, 4, 32, 12, "#5a4638").r(0, 4, 32, 2, "#7d6350").r(2, 8, 28, 1, "#3b2d26").r(0, 14, 32, 2, "#2c211d")
    add("rug", s)


# ---------------------------------------------------------------- characters
def player():
    """16x24. A pupil with dark hair, a grey school coat and a red scarf."""

    def frame(direction, f):
        s = S(18, 26)
        ox, oy = 1, 1
        bob = [0, 1, 0, 1][f]
        step = [0, 1, 0, -1][f]
        y = oy + bob

        def r(x, yy, w, h, c):
            s.r(ox + x, y + yy, w, h, c)

        leg = 24 - 5 - bob
        if direction == "side":
            s.r(ox + 6 + step * 2, oy + leg, 3, 5 - (1 if step > 0 else 0), "#2c3040").r(ox + 6 + step * 2, oy + 23 - (1 if step > 0 else 0), 4, 1, "w0")
            s.r(ox + 7 - step * 2, oy + leg, 3, 5 - (1 if step < 0 else 0), "#363b4f").r(ox + 7 - step * 2, oy + 23 - (1 if step < 0 else 0), 4, 1, "w0")
        else:
            s.r(ox + 4, oy + leg, 3, 5 - (1 if step > 0 else 0), "#2c3040").r(ox + 4, oy + 22 - (1 if step > 0 else 0), 3, 2, "w0")
            s.r(ox + 9, oy + leg, 3, 5 - (1 if step < 0 else 0), "#2c3040").r(ox + 9, oy + 22 - (1 if step < 0 else 0), 3, 2, "w0")
        # coat
        r(3, 12, 10, 8, "steel")
        r(3, 12, 2, 8, "#5d7087")
        r(11, 12, 2, 8, "slate")
        r(2, 19, 12, 1, "slate")
        if direction == "down":
            r(7, 14, 1, 6, "slate"); r(8, 15, 1, 1, "a2"); r(8, 17, 1, 1, "a2")
            r(2, 13 + max(0, step), 2, 5, "#5d7087"); r(12, 13 + max(0, -step), 2, 5, "slate")
            r(2, 18 + max(0, step), 2, 1, "skin"); r(12, 18 + max(0, -step), 2, 1, "skin")
        elif direction == "up":
            r(2, 13 + max(0, -step), 2, 5, "#5d7087"); r(12, 13 + max(0, step), 2, 5, "slate")
            r(4, 13, 8, 6, "#6d4a35"); r(4, 13, 8, 1, "w4"); r(7, 15, 2, 2, "a2")  # satchel
        else:
            r(6 + step, 13, 3, 5, "#5d7087"); r(6 + step, 18, 3, 1, "skin")
            r(2, 13, 2, 6, "#6d4a35")
        # scarf
        r(4, 11, 8, 2, "r2"); r(4, 12, 8, 1, "r1")
        if direction == "down":
            r(9, 12, 2, 5, "r2"); r(9, 16, 2, 1, "r1")
        elif direction == "side":
            r(2, 12, 3, 2, "r2"); r(1, 13 + (f % 2), 2, 2, "r1")
        else:
            r(5, 12, 2, 5, "r2"); r(5, 16, 2, 1, "r1")
        # head
        r(3, 1, 10, 10, "v0"); r(4, 0, 8, 1, "v0"); r(2, 3, 1, 6, "v0"); r(13, 3, 1, 6, "v0"); r(4, 1, 5, 1, "v1"); r(3, 2, 3, 2, "v1")
        if direction == "down":
            r(4, 5, 8, 6, "skin"); r(4, 5, 2, 1, "v0"); r(7, 5, 2, 1, "v0"); r(10, 5, 2, 1, "v0"); r(3, 5, 1, 4, "v0"); r(12, 5, 1, 4, "v0")
            r(5, 7, 1, 2, "ink"); r(10, 7, 1, 2, "ink"); r(4, 10, 8, 1, "skin2"); r(7, 9, 2, 1, "skin2")
        elif direction == "side":
            r(6, 5, 7, 6, "skin"); r(5, 5, 1, 5, "v0"); r(6, 5, 2, 1, "v0"); r(10, 5, 3, 1, "v0"); r(10, 7, 1, 2, "ink"); r(13, 8, 1, 1, "skin"); r(6, 10, 7, 1, "skin2"); r(13, 3, 1, 2, "v0")
        else:
            r(3, 8, 10, 3, "v0"); r(5, 9, 6, 1, "v1")
        s.outline()
        return s.im

    sheet = Image.new("RGBA", (18 * 4, 26 * 3), (0, 0, 0, 0))
    for row, d in enumerate(("down", "side", "up")):
        for f in range(4):
            sheet.paste(frame(d, f), (f * 18, row * 26))
    sheet.save(os.path.join(OUT, "player.png"))


def invigilator():
    """36x64. A tall examiner in a long coat; where a face should be there is a blank exam paper."""

    def frame(direction, f, marked):
        s = S(36, 64)
        sway = [0, 1, 0, -1][f]
        hem = [0, 2, 0, -2][f]
        top = 3 + (f % 2)
        # coat
        s.poly([(11, 22 + top), (25, 22 + top), (28, 46), (30 + hem, 61), (6 + hem, 61), (8, 46)], "#1b1c2b")
        s.poly([(11, 22 + top), (16, 22 + top), (14, 46), (11 + hem, 61), (6 + hem, 61), (8, 46)], "#262842")
        s.poly([(22, 22 + top), (25, 22 + top), (28, 46), (30 + hem, 61), (24 + hem, 61), (24, 46)], "#12131d")
        for k in range(5):
            x = 8 + hem + k * 5
            s.poly([(x, 58), (x + 3, 63), (x + 5, 58)], "#1b1c2b")
        s.r(10, 22 + top, 16, 4, "#2e3150").r(9, 24 + top, 3, 4, "#2e3150").r(24, 24 + top, 3, 4, "#1b1c2b")
        # arms, too long
        s.l(10, 27 + top, 7 - sway, 42, "#262842").l(11, 27 + top, 8 - sway, 42, "#1b1c2b").l(9, 27 + top, 6 - sway, 42, "#12131d")
        s.l(25, 27 + top, 28 + sway, 42, "#1b1c2b").l(26, 27 + top, 29 + sway, 42, "#12131d").l(24, 27 + top, 27 + sway, 42, "#262842")
        for x in (6 - sway, 28 + sway):
            s.r(x, 42, 3, 4, "bone").r(x, 46, 1, 3, "bone").r(x + 2, 46, 1, 2, "bone")
        # pen in hand
        s.l(29 + sway, 45, 31 + sway, 51, "r2").px(31 + sway, 52, "r3")
        # shirt and tie
        if direction != "up":
            cx = 17 if direction == "down" else 20
            s.r(cx - 2, 23 + top, 5, 7, "bone").r(cx, 24 + top, 1, 10, "r1")
        # neck and head: sheet of paper
        s.r(16, 18 + top, 4, 6, "#8f8a72")
        hx = {"down": 9, "side": 13, "up": 9}[direction]
        hw = {"down": 18, "side": 12, "up": 18}[direction]
        s.r(hx, top - 2, hw, 22, "paper").r(hx, top - 2, 1, 22, "white").r(hx + hw - 1, top - 2, 1, 22, "bone").r(hx, top + 19, hw, 1, "bone")
        s.poly([(hx + hw - 5, top - 2), (hx + hw - 1, top - 2), (hx + hw - 1, top + 2)], "#8f8a72")
        if direction == "up":
            s.r(hx, top - 2, hw, 22, "bone").r(hx + 2, top, hw - 4, 18, "#b9b196").r(hx + 7, top - 2, 4, 5, "steel")
        elif not marked:
            for k in range(5):
                s.r(hx + 3, top + 3 + k * 3, hw - 6 - (k % 2) * 3, 1, "#c4bca0")
            s.r(hx + hw // 2 - 2, top - 3, 4, 4, "steel")
        else:
            # it found something to mark: two red crosses and a stroke
            for ex in ((hx + 3, hx + hw - 7) if direction == "down" else (hx + hw - 6,)):
                for k in range(4):
                    s.px(ex + k, top + 4 + k, "r2").px(ex + 3 - k, top + 4 + k, "r2").px(ex + k, top + 5 + k, "r1")
            s.l(hx + 3, top + 13, hx + hw // 2, top + 16, "r2").l(hx + hw // 2, top + 16, hx + hw - 4, top + 12, "r2").l(hx + 3, top + 14, hx + hw // 2, top + 17, "r1")
            s.r(hx + hw // 2 - 2, top - 3, 4, 4, "steel")
        s.outline()
        return s.im

    sheet = Image.new("RGBA", (36 * 8, 64 * 3), (0, 0, 0, 0))
    for row, d in enumerate(("down", "side", "up")):
        for f in range(4):
            sheet.paste(frame(d, f, False), (f * 36, row * 64))
            sheet.paste(frame(d, f, True), ((f + 4) * 36, row * 64))
    sheet.save(os.path.join(OUT, "invigilator.png"))


def portraits():
    def pupil(mood):
        s = S(64, 64).r(0, 0, 64, 64, "dusk")
        for y in range(0, 64, 2):
            for x in range((y // 2) % 2, 64, 2):
                if y > 30:
                    s.px(x, y, "night")
        s.poly([(8, 64), (14, 48), (50, 48), (56, 64)], "steel").poly([(8, 64), (14, 48), (22, 48), (18, 64)], "#5d7087").poly([(46, 48), (50, 48), (56, 64), (48, 64)], "slate")
        s.r(16, 44, 32, 8, "r2").r(16, 49, 32, 3, "r1").r(36, 50, 8, 14, "r2").r(42, 50, 2, 14, "r1").r(18, 45, 8, 1, "r3")
        s.e(12, 5, 40, 42, "v0").r(12, 24, 40, 16, "v0").e(16, 7, 20, 12, "v1").e(17, 14, 30, 32, "skin").r(17, 20, 30, 14, "skin")
        s.poly([(15, 12), (49, 12), (47, 24), (40, 18), (36, 25), (30, 18), (24, 25), (20, 19), (16, 27)], "v0").l(22, 13, 30, 12, "v1")
        s.poly([(40, 24), (47, 24), (46, 36), (40, 44), (38, 45)], "skin2")
        s.r(12, 22, 5, 20, "v0").r(47, 22, 5, 20, "v0")
        if mood == "calm":
            s.r(22, 28, 5, 6, "white").r(37, 28, 5, 6, "white").r(23, 28, 3, 6, "t0").r(38, 28, 3, 6, "t0").px(24, 29, "white").px(39, 29, "white").r(21, 27, 7, 1, "ink").r(36, 27, 7, 1, "ink").r(29, 40, 6, 1, "#8a5348")
        elif mood == "scared":
            s.e(20, 25, 9, 10, "white").e(35, 25, 9, 10, "white").r(24, 29, 2, 3, "ink").r(38, 29, 2, 3, "ink").l(19, 23, 25, 21, "v0").l(38, 21, 44, 23, "v0").e(29, 38, 6, 5, "r0").px(46, 20, "t3").px(46, 21, "t3").px(46, 22, "t2")
        else:
            s.l(21, 30, 24, 28, "ink").l(24, 28, 28, 30, "ink").l(36, 30, 39, 28, "ink").l(39, 28, 43, 30, "ink").l(28, 39, 31, 41, "#8a5348").l(31, 41, 36, 39, "#8a5348").r(20, 35, 4, 2, "#d99a82").r(41, 35, 4, 2, "#d99a82")
        return s

    for m in ("calm", "scared", "glad"):
        add(f"face_{m}", pupil(m))
    for n, lit in (("voice", True), ("voice_off", False)):
        s = S(64, 64).r(0, 0, 64, 64, "night").box(8, 6, 48, 52, "bone", "paper", "#8f8a72").r(14, 12, 36, 28, "#2a2a2c")
        for y in range(6):
            for x in range(8):
                s.r(16 + x * 4, 14 + y * 4, 2, 2, "#57534a" if not lit else ("a1" if abs(x - 3.5) < 4 - abs(y - 2.5) else "#57534a"))
        s.r(14, 46, 12, 6, "#57534a").r(44, 46, 6, 6, "r2" if lit else "r0").px(45, 47, "r3").r(28, 47, 10, 1, "#8f8a72").r(28, 50, 7, 1, "#8f8a72")
        add(n, s)
    s = S(64, 64).r(0, 0, 64, 64, "ink").r(16, 4, 32, 44, "paper").r(16, 4, 1, 44, "white").r(47, 4, 1, 44, "bone")
    for k in range(6):
        s.r(21, 13 + k * 5, 22 - (k % 3) * 5, 1, "#b9b196")
    s.r(29, 1, 6, 7, "steel").poly([(4, 64), (14, 50), (50, 50), (60, 64)], "#262842").r(29, 48, 6, 10, "bone").r(31, 50, 2, 14, "r1")
    add("face_invigilator", s)


# ---------------------------------------------------------------- key art
def key_art(name, lit_door=False):
    W, H = 480, 270
    rnd = random.Random(3)
    im = Image.new("RGBA", (W, H))
    px = im.load()
    sky = [C(c) for c in (("#0c1220", "#142035", "#1f3048", "#33475c", "#4d5f6b") if not lit_door else ("#22324f", "#47557a", "#8a7a8c", "#d39a7d", "#f3cf95"))]
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    for y in range(H):
        for x in range(W):
            t = y / 200 * (len(sky) - 1)
            t = max(0, min(len(sky) - 1.001, t))
            i = int(t)
            px[x, y] = sky[i + 1] if (t - i) * 16 > bayer[y % 4][x % 4] else sky[i]
    s = S(W, H)
    s.im = im
    s.d = ImageDraw.Draw(im)
    # clouds
    for k in range(9):
        cx, cy = rnd.randrange(-20, W), rnd.randrange(8, 92)
        for j in range(16):
            w = rnd.randrange(22, 70)
            x0 = cx + rnd.randrange(-50, 50)
            s.d.ellipse([x0, cy + rnd.randrange(-5, 6), x0 + w, cy + 10], fill=C("#1a2740" if not lit_door else "#b28a8a"))
    if not lit_door:
        s.e(356, 26, 38, 38, "#8fa0ab").e(359, 28, 33, 33, "#b7c4c8").e(366, 34, 8, 8, "#a3b2b8").e(378, 45, 6, 6, "#a3b2b8")
        for j in range(26):
            x = rnd.randrange(330, 420)
            s.d.ellipse([x, 56 + rnd.randrange(0, 12), x + rnd.randrange(16, 46), 68 + rnd.randrange(0, 8)], fill=C("#1a2740"))
    # hills and trees
    for x in range(W):
        h = int(168 + 8 * math.sin(x / 47) + 4 * math.sin(x / 19))
        s.d.line([x, h, x, H], fill=C("#121c2b" if not lit_door else "#4a4558"))
    body, dark, edge = ("#141a27", "#0d111b", "#26324a") if not lit_door else ("#4c4252", "#362f3f", "#a07868")
    # school: long block with a central gable and clock
    s.r(70, 122, 340, 96, body).r(70, 122, 340, 2, edge).r(66, 118, 348, 5, dark).r(66, 118, 348, 1, edge)
    s.r(196, 84, 88, 134, body).poly([(188, 86), (240, 54), (292, 86)], dark).l(188, 86, 240, 54, edge).l(240, 54, 292, 86, edge).r(196, 86, 88, 1, edge)
    s.r(236, 40, 8, 18, dark).r(238, 34, 4, 8, dark).r(240, 26, 1, 10, dark)
    s.e(228, 66, 24, 24, "#c9c2a5").e(230, 68, 20, 20, "#e6dcc0").l(240, 78, 240, 71, "ink").l(240, 78, 246, 80, "ink")
    for gx in range(84, 190, 27):
        for gy in (134, 172):
            lit = False
            s.r(gx, gy, 16, 24, "a1" if lit else "#1d2a3f" if not lit_door else "#7a6474").r(gx + 1, gy + 1, 14, 22, "a3" if lit else "#22324a" if not lit_door else "#c79a82")
            s.r(gx + 7, gy, 2, 24, dark).r(gx, gy + 11, 16, 2, dark).r(gx - 1, gy + 24, 18, 2, dark)
            if lit:
                s.r(gx + 4, gy + 12, 6, 11, "#2a1c14").e(gx + 5, gy + 6, 5, 6, "#2a1c14")
    for gx in range(298, 400, 27):
        for gy in (134, 172):
            lit = gx == 352 and gy == 134 and not lit_door
            s.r(gx, gy, 16, 24, "a1" if lit else "#1d2a3f" if not lit_door else "#7a6474").r(gx + 1, gy + 1, 14, 22, "a3" if lit else "#22324a" if not lit_door else "#c79a82").r(gx + 7, gy, 2, 24, dark).r(gx, gy + 11, 16, 2, dark).r(gx - 1, gy + 24, 18, 2, dark)
            if lit:
                s.r(gx + 4, gy + 12, 6, 11, "#2a1c14").e(gx + 5, gy + 6, 5, 6, "#2a1c14")
    for gx in (206, 258):
        for gy in (102, 140):
            s.r(gx, gy, 16, 24, "#1d2a3f" if not lit_door else "#7a6474").r(gx + 1, gy + 1, 14, 22, "#22324a" if not lit_door else "#c79a82").r(gx + 7, gy, 2, 24, dark).r(gx, gy + 11, 16, 2, dark)
    s.r(222, 178, 36, 40, "a3" if lit_door else "#0b0f18").r(239, 178, 2, 40, dark).r(216, 172, 48, 6, dark).r(210, 214, 60, 3, edge).r(204, 217, 72, 4, dark)
    # ground
    s.r(0, 218, W, 52, "#0c121c" if not lit_door else "#3a3442")
    for k in range(260):
        x, y = rnd.randrange(0, W), rnd.randrange(220, H)
        s.r(x, y, rnd.randrange(2, 8), 1, "#16202e" if not lit_door else "#4d4454")
    s.poly([(222, 221), (258, 221), (310, 270), (170, 270)], "#141c29" if not lit_door else "#d8a768")
    if not lit_door:
        s.poly([(230, 224), (250, 224), (272, 270), (208, 270)], "#1b2636")
    # trees
    for tx, th in ((26, 120), (446, 130), (470, 90), (4, 90)):
        base = 226
        s.r(tx - 2, base - th, 5, th, "#070a11" if not lit_door else "#2a2531")
        for k in range(22):
            y = base - th + rnd.randrange(-14, int(th * 0.6))
            dx = rnd.choice([-1, 1]) * rnd.randrange(10, 32)
            s.l(tx, y + 12, tx + dx, y, "#070a11" if not lit_door else "#2a2531").l(tx + dx, y, tx + dx + rnd.randrange(-6, 7), y - 7, "#070a11" if not lit_door else "#2a2531")
    # fence
    for x in range(0, W, 8):
        if not 206 < x < 270:
            s.r(x, 232, 2, 38, "#05070c" if not lit_door else "#241f2b").px(x, 231, "#1b2636")
    s.r(0, 240, 206, 2, "#05070c" if not lit_door else "#241f2b").r(272, 240, 208, 2, "#05070c" if not lit_door else "#241f2b")
    im.convert("RGB").save(os.path.join(OUT, name))


def ui():
    s = S(24, 24)  # nine-slice dialogue frame
    s.r(0, 0, 24, 24, "ink").r(2, 2, 20, 20, "bone").r(3, 3, 18, 18, "ink").r(4, 4, 16, 16, "#10141f").px(2, 2, "ink").px(21, 2, "ink").px(2, 21, "ink").px(21, 21, "ink")
    s.im.save(os.path.join(OUT, "frame.png"))
    s = S(24, 24)  # paper frame
    s.r(0, 0, 24, 24, "#8f8a72").r(1, 1, 22, 22, "paper").r(1, 1, 22, 1, "white").r(1, 22, 22, 1, "bone").r(22, 1, 1, 22, "bone")
    s.im.save(os.path.join(OUT, "paper.png"))
    s = S(24, 24)  # blackboard frame
    s.box(0, 0, 24, 24, "w3", "w5", "w1").r(3, 3, 18, 18, "w1").r(4, 4, 16, 16, "#1c3531")
    s.im.save(os.path.join(OUT, "boardframe.png"))
    s = S(24, 24)  # metal frame
    s.box(0, 0, 24, 24, "steel", "mist", "slate").r(3, 3, 18, 18, "slate").r(4, 4, 16, 16, "#141b27").px(2, 2, "ink").px(21, 2, "ink").px(2, 21, "ink").px(21, 21, "ink")
    s.im.save(os.path.join(OUT, "metalframe.png"))
    s = S(16, 16).poly([(2, 1), (13, 8), (8, 9), (6, 14)], "paper")
    s.outline()
    s.im.save(os.path.join(OUT, "cursor.png"))
    g = Image.new("RGBA", (128, 128))
    for y in range(128):
        for x in range(128):
            d = math.hypot(x - 63.5, y - 63.5) / 64
            g.putpixel((x, y), (255, 255, 255, int(max(0, 1 - d) ** 2 * 255)))
    g.save(os.path.join(OUT, "glow.png"))


def pack():
    names = sorted(SPR, key=lambda n: -SPR[n].height)
    W = 512
    x = y = row = 0
    frames = {}
    for n in names:
        im = SPR[n]
        if x + im.width + 2 > W:
            x, y, row = 0, y + row + 2, 0
        frames[n] = (x, y, im.width, im.height)
        x += im.width + 2
        row = max(row, im.height)
    H = y + row
    atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for n, (fx, fy, _, _) in frames.items():
        atlas.paste(SPR[n], (fx, fy))
    atlas.save(os.path.join(OUT, "world.png"), optimize=True)
    data = {"frames": {n: {"frame": dict(x=f[0], y=f[1], w=f[2], h=f[3]), "rotated": False, "trimmed": False, "spriteSourceSize": dict(x=0, y=0, w=f[2], h=f[3]), "sourceSize": dict(w=f[2], h=f[3])} for n, f in frames.items()}, "meta": {"image": "world.png", "size": {"w": W, "h": H}, "scale": "1"}}
    json.dump(data, open(os.path.join(OUT, "world.json"), "w"))
    print(len(frames), "sprites", W, H)


floors(); walls(); props(); portraits()
player(); invigilator(); ui()
strip = Image.new("RGBA", (64 * 6, 64))
for i, n in enumerate(("face_calm", "face_scared", "face_glad", "voice", "voice_off", "face_invigilator")):
    strip.paste(SPR.pop(n), (i * 64, 0))
strip.save(os.path.join(OUT, "faces.png"))
key_art("title.png"); key_art("dawn.png", True)
pack()
