# Sprite module: D27 ground tiles (A3), for the ground the renderer composes in the browser in chunks (plan section 10:
# no baked ground image for the D27 map). Every tile is an iso diamond of one 1u x 1u cell: 16 x 8 px, anchored at
# the cell's corner (x, z) at ground level (its top pixel is the anchor). Textures are noise per pixel, so any tile
# sits next to any variant of its kind without a seam; the renderer picks a variant by a hash of the cell.
# Kinds and counts follow plan 7.3 (about 37 tiles). Nothing here reads the layout: the layout only decides which
# tile goes in which cell, so these re-run unchanged when the layout export changes.
import numpy as np
import pal27  # noqa: F401
import engine as E
import harness as H
from engine import R, box, hash2

TILE = 'the cell\'s corner (x, z) at ground level: covers x .. x+1, z .. z+1 (a 16 x 8 px diamond)'
CV = dict(canvas=(40, 30), origin=(20, 6), outline=False, shadows=False)


def _noise(X, Y, seed, cell=0.5):
    return hash2(np.floor(X / cell).astype(int) + seed * 131, np.floor(Y / cell).astype(int) + seed * 71) % 100


def tile(fn, seed=0):
    def draw():
        def tex(face, X, Y, Z, idx):
            rr, ii = fn(X, Y, seed)
            return np.broadcast_to(rr, X.shape).copy() if np.ndim(rr) else np.full(X.shape, rr), ii
        box(0, 0, -0.02, 4.0, 4.0, 0.0, 'grass', tex=tex, faces='t', cast=False)
    img, an = H.render(draw, **CV)
    return img, an


# ---------------- textures: (X, Y, seed) -> (ramp ids, indices) in tile-local MU (0 .. 4) ----------------

def grass(X, Y, s):
    n = _noise(X, Y, s); n2 = _noise(X + 0.25, Y, s + 7, 1.0)
    ii = np.where(n < 14, 1, np.where(n < 88, 2, 3))
    ii = np.where((n2 < 5) & (n > 50), 1, ii)
    rr = np.where((n2 > 97), R('straw'), R('grass'))
    ii = np.where(n2 > 97, 2, ii)
    if s == 3:   # a tiny flower now and then
        ii = np.where((_noise(X, Y, 99, 0.5) < 3), 0, ii)
        rr = np.where(_noise(X, Y, 99, 0.5) < 3, R('bloom'), rr)
    return rr, ii


def drygrass(X, Y, s):
    n = _noise(X, Y, s + 20)
    ii = np.where(n < 15, 1, np.where(n < 85, 2, 3))
    g = _noise(X, Y, s + 40, 1.0) < 45
    rr = np.where(g, R('grass'), R('straw'))
    return rr, np.where(g, np.where(n < 50, 2, 3), ii)


def dirt(X, Y, s):
    n = _noise(X, Y, s + 60)
    ii = np.where(n < 20, 0, np.where(n < 80, 1, 2))
    peb = _noise(X, Y, s + 61, 0.5) < 4
    return np.where(peb, R('rock'), R('dirt')), np.where(peb, 2, ii)


def street(X, Y, s):
    """Packed dirt with wheel ruts along z (the main street runs north-south) and the odd hoof print."""
    rr, ii = dirt(X, Y, s + 3)
    rut = np.abs(np.mod(X, 4.0) - (1.2 if s != 2 else 2.8)) < 0.5
    ii = np.where(rut & (_noise(X, Y, s + 5) < 85), 2, ii)
    hoof = _noise(X, Y, s + 9, 0.75) < 3
    ii = np.where(hoof, 3, ii)
    return rr, ii


def path(X, Y, s):
    rr, ii = dirt(X, Y, s + 11)
    grassy = _noise(X, Y, s + 12) < 10
    return np.where(grassy, R('grass'), rr), np.where(grassy, 2, np.maximum(ii, 1))


def ballast(X, Y, s):
    n = _noise(X, Y, s + 80, 0.5)
    return R('iron'), np.where(n < 30, 1, np.where(n < 80, 2, 3))


def sand(X, Y, s):
    n = _noise(X, Y, s + 90)
    return np.where(_noise(X, Y, s + 91) < 6, R('rock'), R('dirt')), np.where(n < 50, 0, np.where(n < 90, 1, 2))


def gravel(X, Y, s):
    n = _noise(X, Y, s + 100, 0.5)
    m = _noise(X, Y, s + 101, 0.5)
    rr = np.where(m < 12, R('iron'), np.where(m < 55, R('rock'), R('dirt')))
    return rr, np.where(n < 25, 1, np.where(n < 80, 2, 3))


def water(X, Y, f):
    """Creek water; frame f moves the glints along the current (x)."""
    n = _noise(X - f * 1.0, Y, 7, 0.5)
    ii = np.where(n < 70, 2, 1)
    glint = (_noise(X - f * 1.0, Y, 9, 1.0) < 8) & (np.mod(X - f * 1.0, 1.0) < 0.5)
    ii = np.where(glint, 0, ii)
    return R('creek'), ii


def bank(side):
    """Half land, half water: grass, a sand strip, then water towards `side` (n -z, s +z, e +x, w -x; two letters: the
    water fills that corner only)."""
    def f(X, Y, s):
        d = {'n': 4.0 - Y, 's': Y, 'e': X, 'w': 4.0 - X}
        if len(side) == 1:
            t = d[side]
        else:
            t = np.minimum(d[side[0]], d[side[1]])
        jit = (_noise(X, Y * 0 + 1, 3, 0.5) % 7) / 10.0
        rg, ig = grass(X, Y, 1)
        rs, is_ = sand(X, Y, 1)
        rw, iw = water(X, Y, 0)
        wet = t > 2.6 + jit
        sandy = (t > 1.5 + jit) & ~wet
        rr = np.where(wet, rw, np.where(sandy, rs, rg))
        ii = np.where(wet, np.where(t < 3.0 + jit, 3, iw), np.where(sandy, np.where(t > 2.3 + jit, 2, is_), ig))
        return rr, ii
    return f


def planks(along, ramp='wood', step=1.6, seed=0):
    """Plank boards; `along` is the board's length direction ('x' or 'z'); joints are staggered."""
    def f(X, Y, s):
        c = Y if along == 'x' else X
        a = X if along == 'x' else Y
        row = np.floor(c / step).astype(int)
        off = (row * 5 + seed) % 7
        ii = np.where(np.mod(c, step) < 0.42, 2, 1)
        hb = hash2(row + seed * 3, np.floor((a + off) / 7.0).astype(int)) % 6
        ii = np.where((hb == 0) & (ii == 1), 0, np.where((hb == 3) & (ii == 1), 2, ii))
        ii = np.where(np.mod(a + off, 7.0) < 0.35, 2, ii)
        return R(ramp), ii
    return f


def register(reg):
    kinds = [('grass', grass, 4, 'short grass'), ('drygrass', drygrass, 2, 'dry grass (near the tracks, the wash)'),
             ('dirt', dirt, 3, 'bare dirt (lots, back lanes, the depot square)'),
             ('street', street, 3, 'the main street: packed dirt, ruts along z'),
             ('path', path, 2, 'the cart path: packed dirt, a little grass'),
             ('ballast', ballast, 2, 'track ballast (grey stone)'), ('sand', sand, 2, 'sand (the creek bars, the dry wash)'),
             ('gravel', gravel, 2, 'gravel (the dry wash\'s bed)')]
    for name, fn, n, note in kinds:
        for v in range(n):
            reg.add(f'tile/{name}/{v + 1}', 'tiles', [tile(fn, v)], dict(anchor=TILE, note=note))
    reg.add('tile/water', 'tiles', [tile(water, f) for f in (0, 1)],
            dict(anchor=TILE, note='creek water, 2 frames (the glints move along +x)'))
    for side in ('n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'):
        reg.add(f'tile/bank/{side}', 'tiles', [tile(bank(side))],
                dict(anchor=TILE, note=f'creek bank: grass, sand, then water towards {side} (n = -z, s = +z, e = +x, w = -x; '
                                       'two letters: water in that corner only)'))
    for v in range(2):
        reg.add(f'tile/boardwalk/{v + 1}', 'tiles', [tile(planks('x', seed=v * 3))],
                dict(anchor=TILE, note='boardwalk planks laid across the walk (along x), for the street boardwalks; '
                                       'drawn at 0.3u up (2 px) by the renderer'))
        reg.add(f'tile/deck/{v + 1}', 'tiles', [tile(planks('z', seed=v * 5 + 1))],
                dict(anchor=TILE, note='platform deck planks (boards across the platform, along z)'))
    reg.add('tile/crossing', 'tiles', [tile(planks('x', ramp='wood', step=2.0, seed=4))],
            dict(anchor=TILE, note='the cart crossing\'s planks, laid along x (with the rails)'))
    register_dock(reg)


def register_dock(reg):
    """The raised cargo platform (x -26 .. 26, z 2.3 .. 16.3, top 1.6u) as pieces: faces, deck cells, ramps, chalk."""
    import station27 as S
    def one(draw, **kw):
        o = dict(canvas=(200, 160), origin=(100, 110), outline=False, shadows=False)
        o.update(kw)
        return [H.render(draw, **o)]
    for v, nm in ((0, ''), (1, '/bumper'), (2, '/post')):
        reg.add('dock/face_s' + nm, 'tiles', one(lambda v=v: S.dock_face('s', v)),
                dict(anchor='the face\'s -x end at ground level on the platform\'s +z edge (z 16.3); covers x .. x+1',
                     note='the loading edge along track 3: plank sheathing, a rubbing strip' +
                          {0: '', 1: ', an iron bumper plate', 2: ', a timber post at the -x end'}[v]))
    for v, nm in ((0, ''), (2, '/post')):
        reg.add('dock/face_e' + nm, 'tiles', one(lambda v=v: S.dock_face('e', v)),
                dict(anchor='the face\'s -z end at ground level on the platform\'s +x end (x 26); covers z .. z+1',
                     note='the east end face' + (', a corner post at the +z end' if v else '')))
    for v in range(2):
        reg.add(f'dock/top/{v + 1}', 'tiles', one(lambda v=v: S.dock_top(v)),
                dict(anchor='the cell corner (x, z) at ground level; the deck is drawn 13 px up (1.6u)'))
    reg.add('dock/cell', 'tiles', one(S.dock_cell),
            dict(anchor='the storage cell\'s corner at ground level; a 1.4u chalk square drawn on the deck (13 px up)'))
    for d in ('e', 'w'):
        reg.add(f'dock/ramp_{d}', 'tiles', one(lambda d=d: S.dock_ramp(d), outline=True),
                dict(anchor='the ramp\'s footprint centre at ground level: (30, 12.4) east, (-30, 12.4) west; 8 x 3u',
                     note='sort on [x0 z0 x1 z1 h] = [-4, -1.5, 4, 1.5, 1.6] u; walkers rise from 0 at the outer end to '
                          '1.6u at the platform'))
