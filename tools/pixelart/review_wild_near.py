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


def near_items(A, region, x0, x1, ox, oy, blends=None, frame=0, subs=None):
    """Draw the near side's pieces in band order (edge, mid, far), each band left to right."""
    def key_at(band, x, L):
        if subs and band == 'edge' and x in subs:
            return subs[x]
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


def scene(A, region, title, marks=(), life=(), blends=None, xc=40.0, frame=0, fr_off=None, subs=None, cpieces=()):
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
    near_items(A, region, x0, x1, ox, oy, blends=blends, frame=frame, subs=subs)
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
    if cpieces:     # the rock cut's faces sort by their near edge, drawn at their own anchor on the line
        it = [(k, x, z, y, None) for (k, x, z, y) in it] + [(k, x, sz, 0.0, x) for (k, x, sz) in cpieces]
        for t in sorted(it, key=lambda t: (t[1] + t[2], t[3])):
            k, x, z, y, ax = t
            px, py = proj(x, 0.0 if ax is not None else z, y)
            A.draw(c, k, ox + px, oy + py)
    else:
        RD.items_draw(A, c, ox, oy, it)
    label(c, title, 4, 4)
    return c


def regions(A):
    import wild_regions as WR
    MARKS = REGION_MARKS
    for k, R in enumerate(WR.REGIONS):
        c = scene(A, R.key, f'{k + 1} {R.key}: the near side', marks=MARKS.get(R.key, []), life=REGION_LIFE.get(R.key, []),
                  subs=REGION_SUBS.get(R.key), cpieces=CORRIDOR_PIECES.get(R.key, ()))
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


# what each region's sheet shows (world x, z, y; z > 8.5 is baked with the near side)
REGION_MARKS = {
    'prairie': [('wild/mark/cottonwood', 62, 28, 0), ('wild/mark/wagon_wreck', 46, 33, 0),
                ('wild/mark/grave', 37, 14.5, 0), ('line/yard_limit', 30, -3.4, 0)],
    'creek': [],
    'hills': [('wild/mark/grave', 50, 13, 0)],
    'woods': [('wild/mark/trapper_cabin', 52, 26, 0), ('wild/mark/giant_pine', 50, -17, 0),
              ('wild/mark/far_cabin', 74, 44, 0), ('wild/life/smoke/1', 74 - 2.2, 44 - 0.05, 3.4)],
    'rocks': [('wild/mark/balanced_rock', 60, 27, 0)],
    'river': [('wild/mark/waterfall', 56, -17, 0)],
    'canyon': [('wild/mark/arch', 86, 52, -12.0)],
    'pass': [('wild/mark/summit_board', 42, -5.5, 0)],
    'valley': [('wild/mark/far_town', 84, 62, 0), ('wild/mark/water_tower', 70, 60, 0)],
}
REGION_SUBS = {'creek': {48: 'wild/mark/beaver_dam'}, 'river': {48: 'wild/mark/ferry_landing'},
               'canyon': {40: 'wild/mark/canyon_shelf/in', 48: 'wild/mark/canyon_shelf/1',
                          56: 'wild/mark/canyon_shelf/2', 64: 'wild/mark/canyon_shelf/out'},
               'valley': {48: 'wild/mark/mill'}}
REGION_LIFE = {
    'prairie': [('wild/life/buffalo/graze/se/0', 92, 52, 0), ('wild/life/buffalo/walk/sw/1', 97, 50, 0),
                ('wild/life/buffalo/graze/nw/1', 88, 55, 0), ('wild/life/prairie_dog/2', 52, 21, 0),
                ('wild/life/prairie_dog/1', 54, 22.5, 0), ('wild/life/hawk/shadow/0', 40, 3, 0)],
    'creek': [('wild/life/duck/se/0', 41.5, 14.4, -0.55), ('wild/life/duck_hen/se/1', 43.0, 14.9, -0.55),
              ('wild/life/deer/graze/sw/0', 60, 19, -0.2)],
    'hills': [('wild/life/fox/trot/se/1', 47, 7.8, 0), ('wild/life/prairie_dog/3', 56, 16, -2.0)],
    'woods': [('wild/life/deer/graze/se/0', 50, 11.5, 0), ('wild/life/buck/look/sw/0', 53, 12.5, 0)],
    'rocks': [('wild/life/fox/sit/sw/0', 50, 12, 0)],
    'river': [('wild/life/duck/nw/0', 52, 21, -1.0), ('wild/life/duck_hen/nw/1', 53.5, 21.5, -1.0),
              ('wild/life/hawk/shadow/1', 44, 4, 0)],
    'canyon': [('wild/life/hawk/fly/0', 52, -2, 12)],
    'pass': [('wild/life/hawk/shadow/2', 40, 2, 0)],
    'valley': [('wild/life/fox/sit/se/1', 56, 7.5, 0)],
}
CORRIDOR_PIECES = {'rocks': [('wild/mark/rockcut_n_up', 28, -5.0), ('wild/mark/rockcut_n', 36, -5.0),
                             ('wild/mark/rockcut_n_down', 44, -5.0), ('wild/mark/rockcut_s_up', 28, 3.0),
                             ('wild/mark/rockcut_s', 36, 3.0), ('wild/mark/rockcut_s_down', 44, 3.0)]}


def marks(A):
    """Every standalone landmark on the stand-in prairie, labelled; then each border-piece landmark between its
    region's ordinary edge pieces, to check the joins."""
    W2, H2 = 720, 520
    c = canvas(W2, H2)
    ground_fill(A, c, 360, 40, 'prairie')
    cells = [('wild/mark/cottonwood', 'lone cottonwood'), ('wild/mark/giant_pine', 'giant pine'),
             ('wild/mark/trapper_cabin', 'trapper cabin'), ('wild/mark/balanced_rock', 'balanced rock'),
             ('wild/mark/arch', 'natural arch'), ('wild/mark/waterfall', 'waterfall'),
             ('wild/mark/summit_board', 'summit board'), ('wild/mark/far_cabin', 'far cabin'),
             ('wild/mark/wagon_wreck', 'wagon wreck'), ('wild/mark/grave', 'grave'),
             ('wild/mark/water_tower', 'water tower (far)'), ('wild/mark/far_town', 'far town (far)')]
    for k, (key, name) in enumerate(cells):
        x = 70 + (k % 6) * 115; y = 200 + (k // 6) * 230
        A.draw(c, key, x, y)
        if key == 'wild/mark/far_cabin':
            ex = A.extra.get(key, {}).get('chimney')
            if ex:
                px, py = proj(ex[0], ex[1], ex[2])
                A.draw(c, 'wild/life/smoke/1', x + px, y + py)
        label(c, name, x - 40, y + 14)
    save(c, 'marks-1.png')
    # border pieces in their row
    W3, H3 = 720, 1100
    c = canvas(W3, H3)
    rows = [('creek', ['wild/near/creek/edge/1', 'wild/mark/beaver_dam', 'wild/near/creek/edge/3']),
            ('river', ['wild/near/river/edge/2', 'wild/mark/ferry_landing', 'wild/near/river/edge/1']),
            ('canyon', ['wild/near/canyon/edge/1', 'wild/mark/canyon_shelf/in', 'wild/mark/canyon_shelf/1',
                        'wild/mark/canyon_shelf/2', 'wild/mark/canyon_shelf/out', 'wild/near/canyon/edge/3']),
            ('valley', ['wild/near/valley/edge/1', 'wild/mark/mill', 'wild/near/valley/edge/2'])]
    y = 30
    for name, keys in rows:
        ox = 120
        for k, key in enumerate(keys):
            px, py = proj(8 * k, 0)
            A.draw(c, key, ox + px, y + py)
        label(c, name + ': ' + ', '.join(k.split('/')[-1] if 'mark' not in k else k.split('mark/')[1] for k in keys), 4, y - 26)
        y += {'creek': 170, 'river': 170, 'canyon': 420, 'valley': 200}[name]
    # the rock cut's faces
    ox, oy = 160, y + 60
    for k, (key, x, sz) in enumerate(CORRIDOR_PIECES['rocks']):
        px, py = proj(x - 28, 0)
        if '_n' in key:
            A.draw(c, key, ox + px, oy + py)
    for i in range(0, 26):
        px, py = proj(i, 0)
        A.draw(c, 'line/rails', ox + px - 16, oy + py - 8)
    for k, (key, x, sz) in enumerate(CORRIDOR_PIECES['rocks']):
        px, py = proj(x - 28, 0)
        if '_s' in key:
            A.draw(c, key, ox + px, oy + py)
    label(c, 'the rock cut: rockcut_n_up, _n, _n_down; rockcut_s_up, _s, _s_down', 4, oy - 70)
    save(c, 'marks-2-pieces.png')


def ground_fill(A, c, ox, oy, kind):
    for (i, j) in visible_cells(ox, oy, c.shape[1], c.shape[0]):
        px, py = proj(i, j)
        A.draw(c, TILES[kind](i, j), ox + px, oy + py)


def life(A):
    """Every wildlife frame, in its facings, on the stand-in prairie (the ducks on river tiles)."""
    W2, H2 = 720, 760
    c = canvas(W2, H2)
    ground_fill(A, c, 360, 40, 'prairie')
    rows = [('deer', [('graze', 2), ('look', 2), ('walk', 4)]), ('buck', [('graze', 2), ('look', 2)]),
            ('buffalo', [('graze', 2), ('walk', 4)]), ('fox', [('trot', 4), ('sit', 2)])]
    y = 50
    for kind, poses in rows:
        x = 40
        label(c, kind, 4, y - 30)
        for pose, n in poses:
            for d in ('se', 'sw', 'ne', 'nw'):
                for f in range(n):
                    A.draw(c, f'wild/life/{kind}/{pose}/{d}/{f}', x, y)
                    x += {'buffalo': 46, 'fox': 16}.get(kind, 30)
                x += 4
            x += 10
            if x > W2 - 60:
                x = 40; y += 50
        y += 64 if kind != 'buffalo' else 80
    # ducks on the water, prairie dogs, the hawk and its shadow, smoke
    for i in range(0, 12):
        for j in range(0, 6):
            px, py = proj(i, j)
            A.draw(c, f'tile/river/0', 60 + px, y + py)
    x = 60
    for d in ('se', 'sw', 'ne', 'nw'):
        for f in range(2):
            A.draw(c, f'wild/life/duck/{d}/{f}', x + 10, y + 20); A.draw(c, f'wild/life/duck_hen/{d}/{f}', x + 10, y + 36)
            x += 16
    x = 250
    for f in range(4):
        A.draw(c, f'wild/life/prairie_dog/{f}', x + f * 22, y + 30)
    for f in range(3):
        A.draw(c, f'wild/life/hawk/fly/{f}', 360 + f * 40, y + 10)
        A.draw(c, f'wild/life/hawk/shadow/{f}', 360 + f * 40, y + 50)
    for f in range(4):
        A.draw(c, f'wild/life/smoke/{f}', 530 + f * 40, y + 60)
    label(c, 'ducks; prairie dog 0..3; hawk and its shadow; smoke', 4, y - 20)
    # one man for scale
    A.draw(c, 'ppl/navvy_a/idle/se/0', 700, 140)
    save(c, 'life.png', 3)


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
    if what in ('marks', 'all'):
        marks(A)
    if what in ('life', 'all'):
        life(A)


if __name__ == '__main__':
    main()
