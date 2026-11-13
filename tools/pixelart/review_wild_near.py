#!/usr/bin/env python3
# Review sheets for the wild country's near side (Artist 3), written to plans/pixel/d32/near/. Run after build.py:
#     python3 tools/pixelart/review_wild_near.py [regions|blends|marks|life|all] [--preview]
# --preview reads the wild keys from tools/pixelart/out/preview/ (a one-module build: build.py wild_near) and the
# rest from tools/pixelart/out/. Each region is shown as it would look in play: a strip of the line at the game's
# own pixel scale (shown 2x), the first batch's track, tiles and crew for scale, the near border with what lies beyond
# it down the screen, the landmarks and life. The far side (north) is a stand-in from the first batch's tiles and
# trees (Artist 2 draws the real one).
import os, sys, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import review_d32 as RD
from review_d32 import blit, label, canvas, proj, hsh, INK, PAPER

OUT = os.path.join(HERE, 'out')
DST = os.path.join(HERE, '..', '..', 'plans', 'pixel', 'd32', 'near')
EDGE_Z = 9.0
W, H = 360, 640


class MultiAtlas:
    def __init__(self, dirs):
        self.frames, self.extra, self.src = {}, {}, {}
        self.sheets = {}
        for d in dirs:
            p = os.path.join(d, 'atlas.json')
            if not os.path.exists(p):
                continue
            info = json.load(open(p))
            sh = [np.array(Image.open(os.path.join(d, s['file'])).convert('RGBA')) for s in info['sheets']]
            for k, v in info['frames'].items():
                self.frames[k] = v; self.src[k] = sh
            self.extra.update(info['extra'])

    def has(self, k):
        return k in self.frames

    def img(self, k):
        si, x, y, w, h, ax, ay = self.frames[k]
        return self.src[k][si][y:y + h, x:x + w], (ax, ay)

    def draw(self, dst, k, sx, sy):
        if k not in self.frames:
            return False
        img, (ax, ay) = self.img(k)
        blit(dst, img, int(round(sx)) - ax, int(round(sy)) - ay)
        return True


def save(img, name, scale=2):
    os.makedirs(DST, exist_ok=True)
    Image.fromarray(img).resize((img.shape[1] * scale, img.shape[0] * scale), Image.NEAREST).save(
        os.path.join(DST, name), optimize=True)
    print('  wrote plans/pixel/d32/near/' + name)


# ------------------------------------------------------------------------------------------------ stand-ins
FARKIND = {'prairie': 'prairie', 'creek': 'prairie', 'hills': 'hills', 'woods': 'woods', 'rocks': 'rock',
           'river': 'prairie', 'canyon': 'rock', 'pass': 'rock', 'valley': 'field'}
FARTREES = {'prairie': [('nat/oak/{}', 2, 0.03), ('nat/brush/{}', 3, 0.05)],
            'creek': [('nat/cottonwood/{}', 3, 0.05), ('nat/willow/{}', 2, 0.05)],
            'hills': [('nat/juniper/{}', 2, 0.04), ('nat/mound/{}', 3, 0.012)],
            'woods': [('nat/pine/{}', 3, 0.45)],
            'rocks': [('nat/outcrop/{}', 2, 0.04), ('nat/boulder/{}', 4, 0.06), ('nat/juniper/{}', 2, 0.03)],
            'river': [('nat/pine/{}', 3, 0.18), ('nat/cottonwood/{}', 3, 0.04)],
            'canyon': [('nat/outcrop/{}', 2, 0.06), ('nat/juniper/{}', 2, 0.04)],
            'pass': [('nat/pine/{}', 3, 0.22), ('nat/outcrop/{}', 2, 0.05)],
            'valley': [('nat/haystack', 0, 0.01), ('nat/oak/{}', 2, 0.02)]}
TILES = {'prairie': lambda i, j: f'tile/prairie/{1 + int(hsh(i, j, 5) * 4)}',
         'woods': lambda i, j: f'tile/woodfloor/{1 + int(hsh(i, j, 5) * 3)}',
         'rock': lambda i, j: f'tile/rockground/{1 + int(hsh(i, j, 5) * 3)}',
         'hills': lambda i, j: f'tile/prairie/{1 + int(hsh(i, j, 5) * 4)}',
         'field': lambda i, j: f'tile/prairie/{1 + int(hsh(i, j, 5) * 4)}'}
NEARTILE = {'prairie': 'prairie', 'creek': 'prairie', 'hills': 'prairie', 'woods': 'woods', 'rocks': 'rock',
            'river': 'prairie', 'canyon': 'rock', 'pass': 'rock', 'valley': 'prairie'}


def tiles_for(region, i, j):
    """The stand-in ground: the corridor and the near side's tiles in the region's kind, the far side's in its."""
    if j < -9:
        kind = FARKIND[region]
    else:
        kind = NEARTILE[region]
    if region == 'valley' and j < -12:
        return f'tile/field/{1 + (i // 10) % 2}'
    return TILES[kind](i, j)


def visible_cells(ox, oy, w, h, pad=4):
    """Cells (i, j) whose tile can touch a w x h canvas with the world origin at (ox, oy)."""
    out = []
    for s in range(int((-oy - 40) / 4) - pad, int((h - oy + 40) / 4) + pad):
        for c in range(int((-ox - 40) / 8) - pad, int((w - ox + 40) / 8) + pad):
            if (s + c) % 2:
                continue
            i = (s + c) // 2; j = (s - c) // 2
            out.append((i, j))
    return out


# ------------------------------------------------------------------------------------------------ a region in play
def pick_variant(region, band, k, n):
    return 1 + int(hsh(k, len(band), sum(map(ord, region))) * n)


def near_items(A, region, x0, x1, ox, oy, blends=None, frame=0):
    """Draw the near side's pieces in band order (edge, mid, far), each band left to right."""
    def key_at(band, x, L):
        if blends:
            for (bx, bkey) in blends:
                if bx <= x < bx + 16:
                    return None if (band == 'edge' and x != bx) else f'wild/near/{bkey}/{band}'
        n = {'edge': 4, 'mid': 3, 'far': 2}[band]
        return f'wild/near/{region_at(x)}/{band}/{pick_variant(region_at(x), band, int(x // L), n)}'
    region_at = region if callable(region) else (lambda x: region)
    out = []
    for band, L in (('edge', 8), ('mid', 16), ('far', 16)):
        xs = range(int(x0 // L * L), int(x1) + 1, L)
        for x in xs:
            k = key_at(band, x, L)
            if k is None:
                continue
            px, py = proj(x, EDGE_Z)
            A.draw(out_canvas[0], k, ox + px, oy + py)
            if frame and A.has(f'{k}/water/{frame}'):
                A.draw(out_canvas[0], f'{k}/water/{frame}', ox + px, oy + py)
            out.append(k)
    return out


out_canvas = [None]


def corridor(A, c, ox, oy, xs, region, fr, men=True, piles=True):
    """The line through the view at fronts fr, the gangs at work and a few men at the corridor's south edge."""
    it = []
    who = ('navvy_a', 'navvy_b', 'navvy_c')
    m = [0]
    def man(anim, d, f, x, z):
        it.append((f'ppl/{who[m[0] % 3]}/{anim}/{d}/{f}', x, z, 0)); m[0] += 1
    f1, f2, f3, f4, f5, f6 = fr
    if men:
        man('hook', 'se', 1, f1 + 1.0, -2.2); man('hook', 'se', 2, f1 - 0.5, 2.4)
        man('pick', 'se', 2, f2 - 0.5, -2.0); man('shovel', 'se', 2, f2 - 1.7, 2.0); man('pick', 'sw', 0, f2 - 3.0, -1.0)
        man('rake', 'se', 0, f3 - 1.0, -1.6); man('rake', 'se', 1, f3 - 2.0, 1.6)
        man('tieFront', 'se', 0, f4 + 1.5, -4.0); man('tieBack', 'se', 0, f4 - 1.5, -4.0)
        man('maul', 'se', 2, f6 + 1.0, -1.8); man('maul', 'sw', 3, f6 - 0.5, 1.9)
        # at the corridor's south edge, right by the border
        man('walk', 'se', 1, f3 + 3.0, 7.6); man('idle', 'sw', 0, f2 + 4.0, 8.3); man('shovel', 'sw', 1, f4 + 2.0, 6.8)
        man('drink', 'se', 0, f5 + 2.5, 8.6)
    if piles:
        it += [('line/tie_pile/2', f4 - 3.0, 6.6, 0), ('line/rail_stack/1', f5 - 2.0, 6.4, 0),
               ('line/earth_heap/1', f2 - 2.0, 5.2, 0), ('line/keg', f6 + 2.0, -3.6, 0),
               ('tool/pick/ground', f2 + 1.0, 4.6, 0)]
        for x in range(int(f1) + 2, int(xs[1]), 8):
            it += [('line/stake', x, -4.6, 0), ('line/stake', x, 4.6, 0)]
    return it


def far_side(A, region, xs, seed=0):
    out = []
    lst = FARTREES[region]
    for ci in range(int(xs[0]) // 2 - 30, int(xs[1]) // 2 + 4):
        for cj in range(-40, -5):
            for k, (key, n, p) in enumerate(lst):
                if hsh(ci, cj, 900 + k + seed) < p:
                    x = ci * 2 + hsh(ci, cj, 910 + k) * 2; z = cj * 2 + hsh(ci, cj, 920 + k) * 2
                    if z > -10.5:
                        continue
                    kk = key.format(1 + int(hsh(ci, cj, 930 + k) * n)) if n else key
                    out.append((kk, x, z, 0))
                    break
    return out


def scene(A, region, title, marks=(), life=(), blends=None, xc=40.0, frame=0, fr_off=None):
    """One portrait screen of the line in a region: the line's centre point (xc, 0) at (180, 200)."""
    c = canvas(W, H)
    out_canvas[0] = c
    ox, oy = 180 - 8 * xc, 200 - 4 * xc
    reg_of = region if callable(region) else (lambda x: region)
    base_reg = reg_of(xc)
    fr = [xc + v for v in (fr_off or (10, 4, -2, -8, -14, -20))]
    RD.roadbed(A, c, ox, oy, fr, int(xc - 60), int(xc + 80),
               lambda i, j: tiles_for(reg_of(i), i, j), zr=80, j0=-60)
    # the near side: pieces in band order
    x0 = xc - 40; x1 = xc + 90
    near_items(A, region, x0, x1, ox, oy, blends=blends, frame=frame)
    # landmarks and life on the near side (baked with it, after the bands), sorted by depth
    nm = sorted([(k, x, z, y) for (k, x, z, y) in marks if z > 8.5] + [(k, x, z, y) for (k, x, z, y) in life if z > 8.5],
                key=lambda t: t[1] + t[2])
    for k, x, z, y in nm:
        px, py = proj(x, z, y)
        A.draw(c, k, ox + px, oy + py)
    # the far side's stand-in, the corridor and what stands in it, sorted by depth
    it = far_side(A, base_reg, (xc - 40, xc + 60))
    it += corridor(A, c, ox, oy, (xc - 30, xc + 40), base_reg, fr)
    it += [t for t in marks if t[2] <= 8.5] + [t for t in life if t[2] <= 8.5]
    RD.items_draw(A, c, ox, oy, it)
    label(c, title, 4, 4)
    return c


def regions(A):
    import wild_regions as WR
    MARKS = REGION_MARKS
    for k, R in enumerate(WR.REGIONS):
        c = scene(A, R.key, f'{k + 1} {R.key}: the near side', marks=MARKS.get(R.key, []), life=REGION_LIFE.get(R.key, []))
        save(c, f'region-{k + 1}-{R.key}.png')


def blends(A):
    import wild_regions as WR
    regs = WR.REGIONS
    for k, (Ra, Rb) in enumerate(zip(regs[:-1], regs[1:])):
        # Ra up to x 32, the blend 32 .. 48, Rb after
        def reg_at(x, a=Ra.key, b=Rb.key):
            return a if x < 40 else b
        c = scene(A, reg_at, f'{Ra.key} into {Rb.key}', blends=[(32, f'{Ra.key}_to_{Rb.key}')], xc=24.0,
                  fr_off=(30, 30, 30, 30, 30, 30))
        save(c, f'blend-{k + 1}-{Ra.key}-{Rb.key}.png')


REGION_MARKS = {}
REGION_LIFE = {}


def main():
    what = [a for a in sys.argv[1:] if not a.startswith('--')]
    what = what[0] if what else 'all'
    dirs = [OUT]
    if '--preview' in sys.argv:
        dirs.append(os.path.join(OUT, 'preview'))
    A = MultiAtlas(dirs)
    RD.ATLAS[0] = A
    if what in ('regions', 'all'):
        regions(A)
    if what in ('blends', 'all'):
        blends(A)


if __name__ == '__main__':
    main()
