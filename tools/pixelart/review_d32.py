#!/usr/bin/env python3
# Review sheets for the D32 art (the line building batch), written to plans/pixel/d32/. Run after build.py:
#     python3 tools/pixelart/review_d32.py [navvy|track|country|train|all]
# Every sheet is drawn from the built atlas (tools/pixelart/out/atlas.json and the sheets), on the game's own ground
# tiles, beside existing sprites for comparison, enlarged with nearest-neighbour.
import os, sys, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import font as FT

OUT = os.path.join(HERE, 'out')
DST = os.path.join(HERE, '..', '..', 'plans', 'pixel', 'd32')
INK = (43, 32, 38, 255)
PAPER = (240, 228, 200, 255)


class Atlas:
    def __init__(self):
        info = json.load(open(os.path.join(OUT, 'atlas.json')))
        self.frames = info['frames']
        self.extra = info['extra']
        self.sheets = [np.array(Image.open(os.path.join(OUT, s['file'])).convert('RGBA')) for s in info['sheets']]

    def has(self, key):
        return key in self.frames

    def img(self, key):
        si, x, y, w, h, ax, ay = self.frames[key]
        return self.sheets[si][y:y + h, x:x + w], (ax, ay)

    def draw(self, dst, key, sx, sy):
        """Draw frame `key` with its anchor at (sx, sy)."""
        if key not in self.frames:
            return False
        img, (ax, ay) = self.img(key)
        blit(dst, img, int(round(sx)) - ax, int(round(sy)) - ay)
        return True


def blit(dst, img, x, y):
    h, w = img.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = img[y0 - y:y1 - y, x0 - x:x1 - x]
    m = s[..., 3] > 0
    dst[y0:y1, x0:x1][m] = s[m]


def label(dst, text, x, y, col=INK):
    blit(dst, FT.text_image(text, col), x, y)


def canvas(w, h, col=PAPER):
    c = np.zeros((h, w, 4), np.uint8)
    c[:] = col
    return c


def proj(x, z, y=0.0):
    return 8 * (x - z), 4 * (x + z) - 8 * y


def ground(A, dst, ox, oy, i0, i1, j0, j1, pick):
    """Tiles for cells i0..i1 x j0..j1 with the world origin at pixel (ox, oy); pick(i, j) -> key."""
    for j in range(j0, j1):
        for i in range(i0, i1):
            px, py = proj(i, j)
            A.draw(dst, pick(i, j), ox + px, oy + py)


def hsh(i, j, s=0):
    h = (i * 374761393 + j * 668265263 + s * 2246822519) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296.0


def grass_pick(i, j):
    return f'tile/grass/{1 + int(hsh(i, j) * 4)}'


def save(img, name, scale):
    os.makedirs(DST, exist_ok=True)
    Image.fromarray(img).resize((img.shape[1] * scale, img.shape[0] * scale), Image.NEAREST).save(
        os.path.join(DST, name), optimize=True)
    print('  wrote', os.path.join('plans/pixel/d32', name), img.shape[1] * scale, 'x', img.shape[0] * scale)


# ------------------------------------------------------------------------------------------------ navvies
ANIMS = [('idle', 2), ('walk', 4), ('shoulder', 4), ('pick', 4), ('shovel', 4), ('maul', 4), ('axe', 4),
         ('hook', 3), ('rake', 3), ('barrow', 4), ('tip', 2), ('tieFront', 4), ('tieBack', 4), ('tieDrop', 2),
         ('railCarry', 4), ('railDrop', 2), ('sit', 1), ('eat', 2), ('drink', 2)]
DIRS = ('se', 'ne', 'sw', 'nw')


def sheet_navvies(A):
    """Every navvy frame in the four facings (one man per sheet), with the tools and barrow at their marks."""
    for who in ('navvy_a', 'navvy_b', 'navvy_c'):
        cw, rh = 26, 34
        W = 70 + cw * 4 * 4 + 40
        Hh = 20 + rh * len(ANIMS) + 40
        c = canvas(W, Hh, (122, 146, 68, 255))
        for k, (anim, n) in enumerate(ANIMS):
            y = 30 + k * rh + 22
            label(c, anim, 3, y - 12, PAPER)
            for di, d in enumerate(DIRS):
                for f in range(n):
                    x = 70 + (di * 4 + f) * cw + 8
                    key = f'ppl/{who}/{anim}/{d}/{f}'
                    ex = A.extra.get(key, {})
                    if anim == 'shoulder':
                        A.draw(c, key, x, y)
                        t = ('pick', 'shovel', 'maul', 'axe')[f % 4]
                        if 'tool' in ex:
                            A.draw(c, f'tool/{t}/held/{d}', x + ex['tool'][0], y + ex['tool'][1])
                    elif anim in ('barrow', 'tip') and 'grip' in ex:
                        bk = f'tool/barrow/{d}' + ('/full' if anim == 'barrow' else ('/tipped' if f == 1 else '/full'))
                        if d in ('ne', 'nw'):
                            A.draw(c, bk, x + ex['grip'][0], y + ex['grip'][1]); A.draw(c, key, x, y)
                        else:
                            A.draw(c, key, x, y); A.draw(c, bk, x + ex['grip'][0], y + ex['grip'][1])
                    else:
                        A.draw(c, key, x, y)
        for di, d in enumerate(DIRS):
            label(c, d, 70 + di * 4 * cw + 30, 4, PAPER)
        # the sleepers
        y = 30 + len(ANIMS) * rh + 20
        label(c, 'lie', 3, y - 6, PAPER)
        A.draw(c, 'camp/cot', 100, y + 6); A.draw(c, f'ppl/{who}/lie/se/0', 100, y + 6)
        A.draw(c, 'camp/cot_z', 160, y + 6); A.draw(c, f'ppl/{who}/lie/sw/0', 160, y + 6)
        save(c, f'navvy-{who}.png', 3)


def scene_crew(A):
    """The crew at work on the line, on the game's grass, at the game's 2x and 4x: a gang of each look, beside the
    station agent and two townsfolk for comparison."""
    W, Hh = 400, 230
    c = canvas(W, Hh)
    ox, oy = 150, 30
    ground(A, c, ox, oy, -10, 40, -30, 20, grass_pick)
    def man(who, anim, d, f, x, z):
        px, py = proj(x, z)
        A.draw(c, f'ppl/{who}/{anim}/{d}/{f}', ox + px, oy + py)
    # existing people for comparison
    man('agent', 'idle', 'se', 0, 4, -4)
    man('cowhand', 'walk', 'se', 1, 6, -5)
    man('smith', 'idle', 'sw', 0, 7, -3)
    who = ('navvy_a', 'navvy_b', 'navvy_c')
    jobs = [('pick', 'se'), ('shovel', 'se'), ('maul', 'sw'), ('axe', 'ne'), ('rake', 'se'), ('hook', 'nw'),
            ('walk', 'se'), ('idle', 'sw'), ('drink', 'se'), ('sit', 'sw'), ('eat', 'se'), ('shovel', 'ne')]
    k = 0
    for row in range(3):
        for col in range(4):
            anim, d = jobs[k % len(jobs)]
            n = {'pick': 4, 'shovel': 4, 'maul': 4, 'axe': 4, 'rake': 3, 'hook': 3, 'walk': 4, 'idle': 2, 'drink': 2,
                 'sit': 1, 'eat': 2}[anim]
            man(who[(row + col) % 3], anim, d, (k * 3) % n, 10 + col * 3.0, -6 + row * 3.0 + col * 0.3)
            k += 1
    save(c, 'crew-scene.png', 3)


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    A = Atlas()
    if what in ('navvy', 'all'):
        sheet_navvies(A)
        scene_crew(A)
    if what in ('track', 'all') and 'track' in globals():
        globals()['track'](A)


if __name__ == '__main__':
    main()
