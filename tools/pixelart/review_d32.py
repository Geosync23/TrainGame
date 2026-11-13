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


# ------------------------------------------------------------------------------------------------ the track
def items_draw(A, c, ox, oy, items):
    """items: [(key, x, z, y)] drawn back to front by x + z."""
    for key, x, z, y in sorted(items, key=lambda t: (t[1] + t[2], t[3])):
        px, py = proj(x, z, y)
        A.draw(c, key, ox + px, oy + py)


def roadbed(A, c, ox, oy, fr, x0, x1, base, zr=9, j0=None):
    """The right of way at fronts fr = [f1..f6] (u): tiles, laid ties, rails, spikes, joints."""
    f1, f2, f3, f4, f5, f6 = fr
    def pick(i, j):
        x = i + 0.5; zc = j + 0.5
        h = hsh(i, j, 3)
        if x < f3 and abs(zc) < 2.3:
            return f'tile/ln_rock/{1 + int(h * 2)}'
        if x < f3 and j in (-3, 2):
            return f'tile/ln_rock_edge_{"n" if j < 0 else "s"}'
        if x < f2 and abs(zc) < 3:
            return f'tile/ln_bed/{1 + int(h * 2)}'
        if x < f2 and j in (-4, 3):
            return f'tile/ln_bed_edge_{"n" if j < 0 else "s"}'
        if x < f1 and abs(zc) < 5:
            return f'tile/ln_cleared/{1 + int(h * 2)}'
        return base(i, j)
    ground(A, c, ox, oy, x0, x1, -zr if j0 is None else j0, zr, pick)
    flat = []
    k = 0
    x = x0 + 0.43
    while x < min(f4, x1):
        flat.append((f'line/tie_laid/{1 + k % 2}', x, 0.0, 0.0)); x += 0.857; k += 1
    items_draw(A, c, ox, oy, flat)
    for i in range(x0, int(min(f5, x1))):
        px, py = proj(i, 0)
        A.draw(c, 'line/rails', ox + px, oy + py)
    x = x0 + 0.43
    while x < min(f6, x1):
        px, py = proj(x, 0); A.draw(c, 'line/spiked', ox + px, oy + py); x += 0.857
    j = x0
    while j < min(f5, x1):
        px, py = proj(j, 0); A.draw(c, 'line/joint', ox + px, oy + py); j += 13


def base_prairie(i, j):
    if 'tile/prairie/1' in ATLAS[0].frames:
        return f'tile/prairie/{1 + int(hsh(i, j, 5) * 4)}'
    return grass_pick(i, j) if hsh(i, j, 9) > 0.25 else f'tile/drygrass/{1 + int(hsh(i, j, 4) * 2)}'


ATLAS = [None]


def track(A):
    """The line at every stage along one straight run, with the gangs at their fronts, the work piles and the tools;
    and the stages one by one, side by side (the same 10u for each)."""
    W, Hh = 600, 360
    c = canvas(W, Hh)
    ox, oy = 60, 40
    fr = [48, 40, 32, 24, 16, 8]
    roadbed(A, c, ox, oy, fr, -8, 66, base_prairie, zr=30, j0=-14)
    who = ('navvy_a', 'navvy_b', 'navvy_c')
    it = []
    for x in range(50, 66, 4):
        it.append(('line/stake', x, -4.6, 0)); it.append(('line/stake', x, 4.6, 0))
    for k, x in enumerate((49.5, 51.0, 53.5, 55.0, 57.5, 59.0, 61.5)):
        it.append((f'nat/brush/{1 + k % 3}', x, -2.5 + (k % 3) * 1.9, 0))
    for k, x in enumerate((44.0, 46.0)):
        it.append(('nat/brush_cut', x, 3.0 - k * 5.5, 0))
    m = [0]
    def man(anim, d, f, x, z):
        it.append((f'ppl/{who[m[0] % 3]}/{anim}/{d}/{f}', x, z, 0)); m[0] += 1
    man('hook', 'se', 1, 49.0, -2.2); man('hook', 'se', 2, 47.5, 2.2); man('hook', 'ne', 0, 46.0, -3.0)
    man('pick', 'se', 2, 39.5, -2.0); man('shovel', 'se', 2, 38.3, 2.0); man('pick', 'se', 0, 37.0, -1.0)
    man('shovel', 'sw', 3, 36.0, 2.6)
    it.append(('line/earth_heap/1', 36.5, 5.4, 0)); it.append(('line/earth_heap/2', 41.5, -6.0, 0))
    man('rake', 'se', 0, 31.0, -1.6); man('rake', 'se', 1, 30.0, 1.6)
    it.append(('line/rock_heap/2', 33.0, 4.2, 0)); it.append(('line/rock_heap/1', 29.0, -4.4, 0))
    man('tieFront', 'se', 0, 25.5, -4.0); man('tieBack', 'se', 0, 22.5, -4.0)
    man('tieDrop', 'sw', 1, 23.5, 1.4)
    it.append(('line/tie_loose/z', 23.2, 0.0, 0))
    for k, x in enumerate((15.5,)):
        man('railCarry', 'se', 0, x - 4, -0.7); man('railCarry', 'se', 1, x + 4, -0.7)
        man('railCarry', 'se', 2, x - 4, 0.7); man('railCarry', 'se', 3, x + 4, 0.7)
        it.append(('line/rail_carried', x, 0.0, 0))
    man('maul', 'se', 2, 7.0, -1.8); man('maul', 'sw', 3, 5.5, 1.9); man('maul', 'se', 0, 3.5, -1.8)
    it.append(('line/keg', 6.0, -3.6, 0)); it.append(('line/spikes', 4.5, 3.4, 0))
    it.append(('tool/pick/ground', 41.0, 4.6, 0)); it.append(('tool/shovel/ground', 34.0, -4.3, 0))
    it.append(('tool/rake/ground', 26.0, 3.4, 0)); it.append(('tool/maul/ground', 1.5, 3.2, 0))
    it.append(('line/tie_pile/2', 2.0, -7.0, 0)); it.append(('line/rail_stack/2', -2.0, 6.5, 0))
    it.append(('line/tie_pile/3', 10.0, -7.5, 0))
    man('walk', 'nw', 2, 20.0, 4.0); man('shoulder', 'se', 1, 18.0, 3.6)
    items_draw(A, c, ox, oy, it)
    # the barrows (pusher and barrow drawn together, the barrow at his grip)
    for (d, f, x, z, anim) in (('se', 1, 30.0, -4.4, 'barrow'), ('se', 1, 28.0, 3.6, 'tip')):
        key = f'ppl/navvy_b/{anim}/{d}/{f}'
        px, py = proj(x, z)
        A.draw(c, key, ox + px, oy + py)
        gx, gy = A.extra[key]['grip']
        A.draw(c, f'tool/barrow/{d}/' + ('full' if anim == 'barrow' else 'tipped'), ox + px + gx, oy + py + gy)
    label(c, 'the six fronts, 8u apart: brush, cleared, dug bed, rock, ties, rails, spiked', 4, 4)
    save(c, 'track-stages.png', 3)
    W, Hh = 700, 150
    c = canvas(W, Hh)
    names = ['cleared', 'bed', 'rock', 'ties', 'rails', 'spiked']
    for k in range(6):
        fr = [99 if s <= k else -99 for s in range(6)]
        roadbed(A, c, 70 + k * 112, 34, fr, 0, 10, base_prairie, zr=6)
        label(c, names[k], 40 + k * 112, 4)
    save(c, 'track-each.png', 3)


# ------------------------------------------------------------------------------------------------ the country
# A stand-in for Foundation's lnTile / lnScatter, only for the review: kinds of ground and what stands on them.
SCATTER = {
    'prairie': [('nat/grass/{}', 6, 0.22), ('nat/flowers/{}', 3, 0.10), ('nat/stones/{}', 3, 0.02),
                ('nat/sage/{}', 4, 0.03), ('nat/boulder/4', 0, 0.006), ('nat/bones', 0, 0.002),
                ('nat/burrow', 0, 0.004), ('nat/pear/{}', 2, 0.006)],
    'brush': [('nat/brush/{}', 3, 0.07), ('nat/sage/{}', 4, 0.07), ('nat/rabbitbrush/{}', 2, 0.05),
              ('nat/grass/{}', 6, 0.06), ('nat/bush/{}', 2, 0.02)],
    'woods': [('nat/pine/{}', 3, 0.075), ('nat/oak/{}', 2, 0.015), ('nat/stump/{}', 2, 0.01), ('nat/bush/{}', 2, 0.03),
              ('nat/log_x', 0, 0.004), ('nat/snag', 0, 0.004), ('nat/stones/{}', 3, 0.02), ('nat/grass/{}', 6, 0.03)],
    'hills': [('nat/grass/{}', 6, 0.08), ('nat/juniper/{}', 2, 0.02), ('nat/boulder/{}', 4, 0.012),
              ('nat/sage/{}', 4, 0.03), ('nat/flowers/{}', 3, 0.03)],
    'rock': [('nat/boulder/{}', 4, 0.05), ('nat/outcrop/{}', 2, 0.008), ('nat/juniper/{}', 2, 0.015),
             ('nat/pear/{}', 2, 0.02), ('nat/stones/{}', 3, 0.05), ('nat/deadtree', 0, 0.002)],
    'river': [('nat/cottonwood/{}', 3, 0.03), ('nat/willow/{}', 2, 0.03), ('nat/grass/{}', 6, 0.1),
              ('nat/cattails/{}', 2, 0.01), ('nat/bush/{}', 2, 0.02)],
    'field': [('nat/haystack', 0, 0.006), ('nat/grass/{}', 6, 0.02)],
}


def vnoise(i, j, n, s=0):
    a, b = i // n, j // n
    u, v = (i % n) / n, (j % n) / n
    f = lambda t: t * t * (3 - 2 * t)
    su, sv = f(u), f(v)
    h00, h10, h01, h11 = hsh(a, b, s), hsh(a + 1, b, s), hsh(a, b + 1, s), hsh(a + 1, b + 1, s)
    return (h00 * (1 - su) + h10 * su) * (1 - sv) + (h01 * (1 - su) + h11 * su) * sv


def patch(i, j, n, s, p):
    """Soft-edged patches (as the game's dry grass): smooth noise plus a little hash dither."""
    return vnoise(i, j, n, s) + (hsh(i, j, s + 1) - 0.5) * 0.18 > p


def tile_of(kind, i, j):
    h = hsh(i, j, 21)
    if kind in ('prairie', 'brush'):
        return 'tile/trail/x' if j == 9 and i % 23 < 15 else f'tile/prairie/{1 + int(h * 4)}'
    if kind == 'woods':
        return f'tile/prairie/{1 + int(h * 4)}' if patch(i, j, 6, 7, 0.68) else f'tile/woodfloor/{1 + int(h * 3)}'
    if kind == 'hills':
        s = vnoise(i, j, 7, 31) * 2 - 1 + (h - 0.5) * 0.2
        return f'tile/hill_lit/{1 + int(h * 2)}' if s > 0.3 else (f'tile/hill_shade/{1 + int(h * 2)}' if s < -0.3 else f'tile/prairie/{1 + int(h * 4)}')
    if kind == 'rock':
        return f'tile/prairie/{2 + int(h * 2)}' if patch(i, j, 5, 9, 0.62) else f'tile/rockground/{1 + int(h * 3)}'
    if kind == 'field':
        return f'tile/field/{1 + (i // 12) % 2}' if j < -8 else f'tile/prairie/{1 + int(h * 4)}'
    return f'tile/prairie/{1 + int(h * 4)}'


def scatter(kind, x0, x1, z0, z1, keep_row=True, seed=0):
    out = []
    for ci in range(int(x0) // 2, int(x1) // 2):
        for cj in range(int(z0) // 2, int(z1) // 2):
            for k, (key, n, p) in enumerate(SCATTER[kind]):
                if hsh(ci, cj, 100 + k + seed) < p:
                    x = ci * 2 + hsh(ci, cj, 200 + k) * 2; z = cj * 2 + hsh(ci, cj, 300 + k) * 2
                    if not keep_row and abs(z) < 5.5:
                        continue
                    kk = key.format(1 + int(hsh(ci, cj, 400 + k) * n)) if n else key
                    if kk.startswith('nat/grass/'):
                        kk += '/0'
                    out.append((kk, x, z, 0))
                    break
    return out


def panel(A, kind, W, Hh, fr, extra=(), base=None, keep_row=False, water=None):
    c = canvas(W, Hh)
    ox, oy = 30, 30
    x0, x1 = -6, 60
    zr = 30
    def pick(i, j):
        if water:
            w = water(i, j)
            if w:
                return w
        return (base or (lambda i, j: tile_of(kind, i, j)))(i, j)
    roadbed(A, c, ox, oy, fr, x0, x1, pick, zr=zr, j0=-26)
    it = scatter(kind, x0, x1, -26, zr, keep_row)
    it = [t for t in it if not (water and water(int(t[1]), int(t[2])))]
    it += list(extra)
    items_draw(A, c, ox, oy, it)
    return c


import math


def country(A):
    """The country along the line, kind by kind, each with the line at some stage and its scatter; the creek with
    the trestle in its stages; the cut through the rise; the river alongside."""
    W, Hh = 520, 300
    done = [99] * 6
    shots = []
    # prairie: the finished line, a mile board, rolling mounds beyond
    shots.append(('prairie', panel(A, 'prairie', W, Hh, done, extra=[('line/mile_board', 20, -3.2, 0),
                                                                     ('nat/mound/2', 30, -22, 0), ('nat/mound/1', 52, 24, 0)])))
    # brush: the clearers' front at 30
    shots.append(('brush', panel(A, 'brush', W, Hh, [30, 22, 16, 10, 4, -9], keep_row=True)))
    # woods: felled trees, stumps on the cleared strip
    wx = [('nat/stump/1', 30, -3, 0), ('nat/stump/2', 34, 2.5, 0), ('nat/felled', 38, -7, 0), ('nat/stump/1', 26, 4, 0)]
    shots.append(('woods', panel(A, 'woods', W, Hh, [40, 28, 18, 8, -9, -9], extra=wx)))
    # hills with mounds
    hx = [('nat/mound/3', 12, -24, 0), ('nat/mound/2', 40, -20, 0), ('nat/mound/1', 26, 20, 0), ('nat/mound/3', 54, 26, 0)]
    shots.append(('hills', panel(A, 'hills', W, Hh, done, extra=hx)))
    # the cut: the rise from x 16 to 48, dug to x 32
    cx = []
    for k, kind in enumerate(('up', 'full', 'full', 'down')):
        xm = 20 + k * 8
        idx = {'up': '_up', 'full': '', 'down': '_down'}[kind]
        cx += [(f'line/cut_bank_n{idx}', xm, -4, 0), (f'line/cut_bank_s{idx}', xm, 4, 0)]
        if xm > 32:
            cx.append((f'line/rise/{ {"up": 1, "full": 2, "down": 3}[kind] }', xm, 0, 0))
    cx += [('line/earth_heap/2', 30, -8, 0), ('line/earth_heap/1', 26, 8, 0)]
    shots.append(('the cut', panel(A, 'hills', W, Hh, [60, 32, 20, 10, -9, -9], extra=cx)))
    # rock
    shots.append(('rock', panel(A, 'rock', W, Hh, done)))
    # the river alongside (south of the line)
    def riv(i, j):
        e = 14 + int(3 * math.sin(i * 0.15))
        if j > e + 1:
            return f'tile/river/{0}'
        if j == e + 1:
            return 'tile/riverbank/s'
        return None
    shots.append(('river', panel(A, 'river', W, Hh, done, water=riv)))
    # the creek and the trestle: bents at 22, 28, 34; stages shown left to right
    def creek(i, j):
        if 23 <= i <= 32:
            return 'tile/water/0'
        if i == 22:
            return 'tile/bank/e'
        if i == 33:
            return 'tile/bank/w'
        return None
    bx = [('line/trestle_bent', 23.0, 0, 0), ('line/trestle_part/3', 28.0, 0, 0), ('line/trestle_part/2', 33.0, 0, 0),
          ('line/trestle_deck', 25.5, 0, 0.0), ('line/trestle_deck_half', 30.5, 0, 0.0),
          ('nat/cattails/1', 23, 9, 0), ('nat/cattails/2', 32, -9, 0), ('nat/willow/1', 21, 12, 0),
          ('nat/willow/2', 35, -14, 0)]
    shots.append(('creek and trestle', panel(A, 'prairie', W, Hh, [21, 21, 21, 21, 21, -9], extra=bx, water=creek)))
    shots.append(('far town fields', panel(A, 'field', W, Hh, done, extra=[('nat/fence_x', 20, -8, 0),
                                                                          ('nat/fence_x', 28, -8, 0), ('nat/fence_x', 36, -8, 0),
                                                                          ('line/end_stake', 40, -2.6, 0), ('nat/haystack', 30, -16, 0)])))
    for k in range(0, len(shots), 3):
        grp = shots[k:k + 3]
        out = canvas(W, Hh * len(grp))
        for n, (name, img) in enumerate(grp):
            out[n * Hh:(n + 1) * Hh] = img
            label(out, name, 4, n * Hh + 4)
        save(out, f'country-{k // 3 + 1}.png', 2)
    # a long strip of prairie for repetition (200u)
    c = canvas(900, 220)
    ground(A, c, 20, -20, 0, 120, -40, 40, lambda i, j: tile_of('prairie', i, j))
    items_draw(A, c, 20, -20, scatter('prairie', 0, 120, -40, 40))
    save(c, 'prairie-long.png', 2)


# ------------------------------------------------------------------------------------------------ the train and camp
def night(c, keep_cols):
    """A stand-in night tint: everything darkened and cooled except the given lamp-lit colours."""
    keep = np.zeros(c.shape[:2], bool)
    for col in keep_cols:
        keep |= np.all(c[..., :3] == col, axis=-1)
    out = c.copy()
    f = np.array([0.32, 0.36, 0.55])
    out[..., :3] = np.where(keep[..., None], c[..., :3], (c[..., :3] * f).astype(np.uint8))
    return out


def train(A):
    """The work train standing at the railhead at noon: engine, flatcars of rails and ties, the gondola of rock, the
    supply boxcar and the crew car, the men eating beside it; then the camp by day and by night (a stand-in night
    tint; the lit tent parts keep their glow, and the fire)."""
    W, Hh = 560, 300
    c = canvas(W, Hh)
    ox, oy = 60, 50
    roadbed(A, c, ox, oy, [99] * 6, -10, 60, base_prairie, zr=26, j0=-14)
    it = []
    # cars west to east: crew car, boxcar, gondola, flat (ties), flat (rails), engine heading e
    x = 4.0
    cars = [('veh/crewcar/e', None, 11.5), ('veh/boxcar/e', None, 10), ('veh/gondola/e', 'veh/gondola_load/3', 10),
            ('veh/flatcar/e', 'veh/flat_ties/2', 10), ('veh/flatcar/e', 'veh/flat_rails/1', 10),
            ('veh/loco_freight/e/0', None, 18)]
    for key, load, ln in cars:
        xc = x + ln / 2
        it.append((key, xc, 0.0, 0.0))
        if load:
            it.append((load, xc + 0.001, 0.0, 0.001))
        x += ln + 0.4
    who = ('navvy_a', 'navvy_b', 'navvy_c')
    for k in range(9):
        anim = ('eat', 'sit', 'eat', 'drink', 'eat', 'idle')[k % 6]
        n = {'eat': 2, 'sit': 1, 'drink': 2, 'idle': 2}[anim]
        it.append((f'ppl/{who[k % 3]}/{anim}/{("sw", "se", "sw")[k % 3]}/{k % n}', 6 + k * 2.6, 3.8 + (k % 2) * 1.2, 0))
    it += [('line/tie_pile/3', 30, 5.5, 0), ('line/rail_stack/3', 46, 6.5, 0), ('line/keg', 20.5, 4.4, 0),
           ('line/keg', 21.2, 5.2, 0), ('line/rock_heap/3', 38, -5.5, 0), ('camp/barrel', 2.5, 3.4, 0),
           ('tool/shovel/ground', 15, 6.6, 0), ('tool/pick/ground', 26, 7.4, 0)]
    items_draw(A, c, ox, oy, it)
    label(c, 'the work train at the railhead, noon', 4, 4)
    save(c, 'worktrain.png', 3)
    # the cars and loads one by one
    c = canvas(560, 200)
    xs = 0
    for k, (key, load) in enumerate((('veh/crewcar/e', None), ('veh/gondola/e', None), ('veh/gondola/e', 'veh/gondola_load/1'),
                                     ('veh/gondola/e', 'veh/gondola_load/2'), ('veh/gondola/e', 'veh/gondola_load/3'),
                                     ('veh/flatcar/e', 'veh/flat_rails/1'), ('veh/flatcar/e', 'veh/flat_rails/2'),
                                     ('veh/flatcar/e', 'veh/flat_rails/3'), ('veh/flatcar/e', 'veh/flat_ties/1'),
                                     ('veh/flatcar/e', 'veh/flat_ties/2'), ('veh/flatcar/e', 'veh/flat_ties/3'))):
        px, py = 50 + (k % 4) * 130, 50 + (k // 4) * 60
        A.draw(c, key, px, py)
        if load:
            A.draw(c, load, px, py)
    A.draw(c, 'veh/crewcar_in/e/floor', 450, 150)
    A.draw(c, 'veh/crewcar_in/bench', 450 + 0, 150 - 13 - 4)
    A.draw(c, 'ppl/navvy_a/sit/se/0', 446, 150 - 13 - 4 - 4)
    A.draw(c, 'veh/crewcar_in/e/sill', 450, 150)
    save(c, 'worktrain-cars.png', 3)
    # the camp
    for nightly in (False, True):
        W, Hh = 420, 250
        c = canvas(W, Hh)
        ox, oy = 200, 120
        ground(A, c, ox, oy, -20, 30, -30, 30, lambda i, j: f'tile/dirt/{1 + int(hsh(i, j) * 3)}' if abs(i) + abs(j - 4) < 12 and hsh(i, j, 2) > 0.3 else base_prairie(i, j))
        it = []
        sfx = '_lit' if nightly else ''
        for k in range(4):
            xt, zt = -10 + k * 6, -6
            for p in ('back', 'front', 'roof'):
                if k == 3:
                    continue        # one tent opened up (drawn first, below): the cots and sleepers inside
                it.append((f'camp/tent/{p}{sfx}', xt, zt, {'back': 0.0, 'front': 0.01, 'roof': 0.02}[p]))
        # inside the open tent
        for n, (cx, cz) in enumerate(((7.0, -7.8), (9.2, -7.8), (7.0, -4.6), (9.2, -4.6))):
            it.append(('camp/cot_z' if n < 0 else 'camp/cot_z', cx, cz, 0.05))
            if nightly:
                it.append((f'ppl/{("navvy_a", "navvy_b", "navvy_c")[n % 3]}/lie/sw/0', cx, cz, 0.06))
        for p in ('back', 'front', 'roof'):
            it.append((f'camp/cooktent/{p}{sfx}', -12, 6, {'back': 0.0, 'front': 0.01, 'roof': 0.02}[p]))
        it += [('camp/table', -3, 6, 0), ('camp/bench', -3, 4.9, 0), ('camp/bench', -3, 7.1, 0),
               ('camp/fire' if nightly else 'camp/fire_out', 6, 7, 0), ('camp/kettle', 7.2, 7.8, 0),
               ('camp/toolrack', 13, 2, 0), ('camp/barrel', 10, 6, 0), ('camp/washline', 4, 13, 0)]
        if 'camp/fire' in [t[0] for t in it]:
            it = [(k + '/0' if k == 'camp/fire' else k, a, b, d) for k, a, b, d in it]
        who = ('navvy_a', 'navvy_b', 'navvy_c')
        if not nightly:
            for k in range(4):
                it.append((f'ppl/{who[k % 3]}/eat/{("ne", "sw")[k % 2]}/{k % 2}', -4.5 + k * 1.0, 4.4 + (k % 2) * 3.2, 0))
            it.append(('ppl/navvy_c/walk/se/1', 12, 9, 0)); it.append(('ppl/navvy_b/shoulder/se/2', 10, 11, 0))
        else:
            for k in range(3):
                it.append((f'ppl/{who[k]}/sit/{("ne", "sw", "se")[k]}/0', 4.0 + k * 1.6, 9.0 - k * 0.6, 0))
        px, py = proj(8, -6)
        A.draw(c, f'camp/tent/back{sfx}', ox + px, oy + py)
        items_draw(A, c, ox, oy, it)
        if nightly:
            import engine as E
            import pal_d32  # noqa: F401
            import sprites_camp as SC
            cols = [E.hx(h) for h in SC.GLOW.values()] + [tuple(E.PAL[E.RID['fire'], i]) for i in range(4)]
            c = night(c, cols)
        label(c, 'the camp at night (stand-in tint)' if nightly else 'the camp by day: tents, the cook tent, '
              'one tent opened to show the cots', 4, 4, PAPER if nightly else INK)
        save(c, 'camp-night.png' if nightly else 'camp-day.png', 3)


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    A = Atlas()
    ATLAS[0] = A
    if what in ('navvy', 'all'):
        sheet_navvies(A)
        scene_crew(A)
    for name in ('track', 'country', 'train'):
        if what in (name, 'all') and name in globals():
            globals()[name](A)


if __name__ == '__main__':
    main()
