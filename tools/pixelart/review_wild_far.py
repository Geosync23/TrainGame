#!/usr/bin/env python3
# Review sheets for the far side of the wild country (Artist 2), written to plans/pixel/d32/far/. Run after build.py:
#     python3 tools/pixelart/review_wild_far.py [region ...|joins|all]
# Each sheet is a phone-shaped view (400 x 720 native px, saved at 2x) drawn only from the built atlas: the region's
# ground, the finished track with a few navvies at work for scale, and the far side above: rank 3 rows (repeated
# north until the top is covered), rank 2, rank 1, placed by the rules in plans/pixel/d32/far/README.md. The
# placement here (variants by a hash, the region boundaries) is a stand-in for Foundation's, not the game's.
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import review_d32 as RD
from review_d32 import Atlas, canvas, label, proj, hsh, INK, PAPER

DST = os.path.join(HERE, '..', '..', 'plans', 'pixel', 'd32', 'far')
REGIONS = ('prairie', 'creek', 'hills', 'woods', 'rocks', 'river', 'canyon', 'pass', 'valley')
NEXT = dict(zip(REGIONS[:-1], REGIONS[1:]))
W = 16
ZW = -9.0                                   # the wall's front line (the corridor's north edge)
BACK = {1: 0.0, 2: 14.0, 3: 30.0}
REPEAT3 = 20.0
OFF = {1: 0.0, 2: 5.0, 3: 9.0}              # each rank's module grid is offset along x so seams never line up
NV = {1: 4, 2: 3, 3: 3}
VW, VH = 400, 720


def save(img, name, scale=2):
    os.makedirs(DST, exist_ok=True)
    Image.fromarray(img).resize((img.shape[1] * scale, img.shape[0] * scale), Image.NEAREST).save(
        os.path.join(DST, name), optimize=True)
    print('  wrote', os.path.join('plans/pixel/d32/far', name))


class Line:
    """Regions along x: [(x_start, region)], sorted."""

    def __init__(self, spans):
        self.spans = spans

    def at(self, x):
        r = self.spans[0][1]
        for x0, reg in self.spans:
            if x >= x0:
                r = reg
        return r

    def boundary_after(self, x):
        for x0, reg in self.spans:
            if x0 > x:
                return x0, reg
        return None, None


def pick_variant(rank, row, k, n):
    v = int(hsh(k, row * 7 + rank, 91) * n)
    prev = int(hsh(k - 1, row * 7 + rank, 91) * n)
    if v == prev:
        v = (v + 1) % n
    return v + 1


def module_key(line, rank, row, k, x0):
    """The key for module k of a rank row whose anchors sit at x0 + 12k."""
    xc = x0 + W * k + W / 2
    reg = line.at(xc)
    # the two modules just before the first module of the next region carry the change
    for step in (1, 2):
        nreg = line.at(xc + W * step)
        if nreg != reg and NEXT.get(reg) == nreg and line.at(xc + W * (step - 1)) == reg:
            if step == 2:
                return f'wild/far/{reg}/r{rank}/to_{nreg}/1'
            return f'wild/far/{reg}/r{rank}/to_{nreg}/2'
    return f'wild/far/{reg}/r{rank}/{pick_variant(rank, row, k, NV[rank])}'


def ground_key(line, i, j):
    x = i + 0.5
    reg = line.at(x)
    xb, nreg = line.boundary_after(x)
    h = hsh(i, j, 5)
    if xb is not None and NEXT.get(reg) == nreg and xb - x < 12:
        share = 1 - (xb - x) / 12.0 + (hsh(i, j, 6) - 0.5) * 0.3
        k = int(np.clip(share * 5, 0, 5))
        if k >= 5:
            return f'tile/wild/{nreg}/{1 + int(h * 4)}'
        if k >= 1:
            return f'tile/wild/blend/{reg}-{nreg}/{k}'
    return f'tile/wild/{reg}/{1 + int(h * 4)}'


def scene(A, line, ox, oy, title, near_x=None, crew=True):
    c = canvas(VW, VH, (40, 40, 40, 255))
    # ground: every cell whose diamond touches the view
    for j in range(-260, 60):
        for i in range(j + int((-24 - ox) / 8), j + int((VW + 24 - ox) / 8) + 1):
            px, py = proj(i, j)
            sx, sy = ox + px, oy + py
            if -20 < sx < VW + 20 and -12 < sy < VH + 12:
                A.draw(c, ground_key(line, i, j), sx, sy)
    # the line (finished track) through the corridor
    base = lambda i, j: ground_key(line, i, j)
    x0, x1 = int(-ox / 8) - 12, int((VW - ox) / 8) + 12
    RD.roadbed(A, c, ox, oy, [999] * 6, x0, x1, base, zr=9, j0=-8)
    # the far side: rank 3 rows (furthest first), rank 2, rank 1
    def row(rank, zrow, rowi):
        # modules whose 96 px strip meets the view: anchor column ox + 8 (x - zrow)
        xa = OFF[rank] + rowi * 7.0
        k0 = int(np.floor(((-ox) / 8.0 + zrow - xa) / W)) - 1
        k1 = int(np.ceil(((VW - ox) / 8.0 + zrow - xa) / W)) + 1
        for k in range(k0, k1):
            x = xa + W * k
            px, py = proj(x, zrow)
            A.draw(c, module_key(line, rank, rowi, k, xa), ox + px, oy + py)
    rows3 = []
    n = 0
    while True:
        z = ZW - BACK[3] - REPEAT3 * n
        # the row's lowest anchor on screen is at its right end; stop once the whole row is above the view
        px, py = proj(0, z)
        if oy + py + 4 * ((VW - ox) / 8.0) < -40:
            break
        rows3.append((z, n))
        n += 1
        if n > 40:
            break
    for z, n in reversed(rows3):
        row(3, z, n)
    row(2, ZW - BACK[2], 0)
    row(1, ZW, 0)
    if crew:
        who = ('navvy_a', 'navvy_b', 'navvy_c')
        it = []
        base_x = (VW / 2 - ox) / 8.0
        jobs = [('maul', 'se', 2, -1.8), ('maul', 'sw', 3, 1.9), ('shovel', 'se', 1, 3.4), ('walk', 'nw', 1, -4.2),
                ('pick', 'se', 0, -3.0), ('idle', 'sw', 0, 4.0)]
        for k, (anim, d, f, z) in enumerate(jobs):
            it.append((f'ppl/{who[k % 3]}/{anim}/{d}/{f}', base_x - 6 + k * 2.6, z, 0))
        it.append(('line/keg', base_x - 2, -3.6, 0))
        it.append(('line/tie_pile/2', base_x + 9, -6.0, 0))
        RD.items_draw(A, c, ox, oy, it)
    label(c, title, 4, 4, PAPER)
    return c


def region_sheet(A, region):
    line = Line([(-10000, region)])
    c = scene(A, line, VW // 2, 560, f'{region}: rank 1 at z -9, rank 2 at -23, rank 3 at -39 and every 20u north')
    save(c, f'{region}.png')


def join_sheet(A, region):
    nb = NEXT[region]
    # the boundary at x 0: the first module of nb starts there (rank 1), the view centred on it
    line = Line([(-10000, region), (0, nb)])
    c = scene(A, line, VW // 2 + 40, 560, f'{region} into {nb}')
    save(c, f'join-{region}-{nb}.png')


def journey(A):
    """All nine regions in a row, at 1x: 60u of each (rank 1 and the ranks behind), the track along the bottom."""
    spans = [(-10000, REGIONS[0])] + [(60 * k, r) for k, r in enumerate(REGIONS) if k > 0]
    line = Line(spans)
    total = 60 * len(REGIONS) + 40
    Wd = int(8 * total) + 40
    out = []
    # draw in slices so the canvas stays phone shaped per slice; then join them side by side
    for k in range(len(REGIONS)):
        ox = VW // 2 - int(8 * (60 * k + 30))
        c = scene(A, line, ox, 560, REGIONS[k], crew=False)
        out.append(c[200:, :])
    img = np.concatenate(out, axis=1)
    Image.fromarray(img).save(os.path.join(DST, 'journey.png'), optimize=True)
    print('  wrote plans/pixel/d32/far/journey.png')


def ranks_sheet(A, region):
    """Every module of a region, rank by rank, on paper, for checking the variants and joins (2x)."""
    keys = [f'wild/far/{region}/r{r}/{v}' for r in (1, 2, 3) for v in range(1, NV[r] + 1)]
    if region in NEXT:
        keys += [f'wild/far/{region}/r{r}/to_{NEXT[region]}/{k}' for r in (1, 2, 3) for k in (1, 2)]
    imgs = [A.img(k) for k in keys if A.has(k)]
    if not imgs:
        return
    Hh = max(i[0].shape[0] for i in imgs) + 20
    c = canvas(len(imgs) * 100 + 10, Hh)
    for n, (img, an) in enumerate(imgs):
        RD.blit(c, img, 5 + n * 100, Hh - 4 - img.shape[0])
    save(c, f'modules-{region}.png', 1)


def keys_table(A):
    """Markdown table of every key with its size and anchor (for the README)."""
    rows = []
    for k in sorted(A.frames):
        if k.startswith('wild/far/') or k.startswith('tile/wild/'):
            si, x, y, w, h, ax, ay = A.frames[k]
            rows.append(f'| `{k}` | {w} x {h} | {ax}, {ay} |')
    out = '| key | size (px) | anchor (ax, ay) |\n|---|---|---|\n' + '\n'.join(rows) + '\n'
    with open(os.path.join(DST, 'keys.md'), 'w') as f:
        f.write('# Far side and wild ground: every key (generated by review_wild_far.py keys)\n\n' + out)
    print('  wrote plans/pixel/d32/far/keys.md,', len(rows), 'keys')


def main():
    what = sys.argv[1:] or ['all']
    A = Atlas()
    if 'all' in what or 'keys' in what:
        keys_table(A)
    for region in REGIONS:
        if 'all' in what or region in what:
            if not A.has(f'wild/far/{region}/r1/1'):
                continue
            region_sheet(A, region)
            if region in NEXT and A.has(f'wild/far/{region}/r1/to_{NEXT[region]}/1') and \
                    A.has(f'wild/far/{NEXT[region]}/r1/1'):
                join_sheet(A, region)
    if 'all' in what or 'journey' in what:
        journey(A)


if __name__ == '__main__':
    main()
