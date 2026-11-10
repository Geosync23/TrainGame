# Town and station pieces: platforms, goods, handcarts, buildings, trees, props and ground tiles.
# Owned by the buildings-and-town artist (started by the pipeline helper from the mockup shapes).
# Sizes in mockup units (MU): 4 MU = 1 game unit along x/z; 16/3 MU = 1 game unit up (engine.py).
import math
import numpy as np
import engine as E
from engine import R, box, cyl_z, sphere, disc_y, disc_x, gable_x, gable_y, hash2, band_curve, oriented_rect, new_oid
import shapes as S
from shapes import RAIL, PZ, tex_ballast, tex_tie, tex_shingle, tex_batten


U = 4.0            # MU per game unit (x and z)
from track import _ballast_x, _rail_x, BALLAST, GAUGE   # track helpers, for the walkway over the rails
TAG_COLOUR = {'store': ('green', 1), 'smithy': ('glass', 1), 'saloon': ('red', 1)}


# ============================ platforms and walkway ============================
def _plank_tex(variant, lipz):
    def f(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            row = np.floor(Y / 2.0).astype(int)
            fy = Y - row * 2.0
            h = hash2(row + 11 * variant, variant) % 4
            joint = (np.abs(X - (h + 0.5)) < 0.45) & (h < 3)
            hh = hash2(row * 3 + variant, 7 + variant) % 9
            ii = np.where(hh == 0, 0, np.where(hh == 3, 2, 1))
            ii = np.where(fy < 0.55, 2, ii)
            ii = np.where(joint, 2, ii)
            return rr, ii
        if face == 'l':
            ii = np.where(Z > lipz - 1.0, 1, 2)
            ii = np.where(Z < 1.0, 3, ii)
            post = (np.abs(X - 0.5) < 0.5) & (variant % 2 == 0)
            ii = np.where(post & (Z <= lipz - 1.0), 3, ii)
            return rr, ii
        ii = np.where(Z > lipz - 1.0, 2, 3)
        return rr, ii
    return f


def platform_tile(edges='', variant=0):
    """A 1 x 1 unit platform tile covering x 0..1, z 0..1 at platform height (0.75 u).
    edges: 's' shows the near lip (the +z side), 'e' shows the +x end face."""
    faces = 't' + ('l' if 's' in edges else '') + ('r' if 'e' in edges else '')
    o = new_oid(False)
    box(0, 0, 0, U, U, PZ, 'wood', tex=_plank_tex(variant, PZ), oid=o, cast=False, faces=faces)


def platform_steps(direction='s'):
    """Steps down from the platform over one tile (x 0..1, z 0..1), going down towards +z ('s'), +x ('e'),
    -z ('n') or -x ('w')."""
    o = new_oid(False)
    n = 4
    for k in range(n):
        top = PZ - (k + 1) * PZ / (n + 1) + 0.3
        if direction == 's':
            box(0, k, 0, U, k + 1.0, top, 'wood', tex=_plank_tex(k, top), oid=o, cast=False, faces='tl')
        elif direction == 'e':
            box(k, 0, 0, k + 1.0, U, top, 'wood', tex=_plank_tex(k, top), oid=o, cast=False, faces='tr')
        elif direction == 'n':   # going down towards -z: the steps' faces look away, only treads show
            box(0, U - k - 1.0, 0, U, U - k, top, 'wood', tex=_plank_tex(k, top), oid=o, cast=False, faces='tl' if k == n - 1 else 't')
        else:                    # 'w': going down towards -x
            box(U - k - 1.0, 0, 0, U - k, U, top, 'wood', tex=_plank_tex(k, top), oid=o, cast=False, faces='tl')


# ============================ goods and handcart ============================
def _mark_tex(tag, kind):
    col = TAG_COLOUR.get(tag)
    def f(face, X, Y, Z, idx):
        return None, idx
    return f


def crate(tag=None, oid=None):
    o = oid or new_oid(True)
    sx = sy = 2.8; sz = 2.6
    x, y, z = -sx / 2, -sy / 2, 0
    col = TAG_COLOUR.get(tag)
    def ct(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            ii = np.where(((X - x) % 1.3) < 0.4, idx + 1, idx)
            return rr, ii
        if face == 'l':
            e = ((X - x) < 0.5) | ((X - x) > sx - 0.5) | ((Z - z) < 0.5) | ((Z - z) > sz - 0.5)
            ii = np.where(e, idx - 1, idx)
            if col:
                mk = (np.abs(X - (x + sx / 2)) < 0.8) & (np.abs(Z - (z + sz / 2)) < 0.65)
                rr = np.where(mk, R(col[0]), rr); ii = np.where(mk, col[1], ii)
            else:
                dg = np.abs((X - x) / sx - (Z - z) / sz) < 0.12
                ii = np.where(dg & ~e, idx - 1, ii)
            return rr, ii
        e = ((Y - y) < 0.5) | ((Y - y) > sy - 0.5) | ((Z - z) < 0.5) | ((Z - z) > sz - 0.5)
        return rr, np.where(e, idx - 1, idx)
    box(x, y, z, x + sx, y + sy, z + sz, 'wood', shades=(1, 2, 3), tex=ct, oid=o)
    return o


def sack(tag=None):
    o = new_oid(True)
    sphere(0, 0, 1.0, 1.25, 'cream', oid=o, sz=0.85, th=(0.85, 0.45, -0.15))
    sphere(0.2, 0.2, 2.1, 0.6, 'cream', oid=o, cast=False)
    col = TAG_COLOUR.get(tag)
    if col:
        cyl_z(0.2, 0.2, 1.75, 2.0, 0.55, col[0], oid=o, cast=False, th=(0.3, 0.0, -0.3))
    else:
        cyl_z(0.2, 0.2, 1.75, 2.0, 0.55, 'wood', oid=o, cast=False)
    return o


def barrel(tag=None, r=1.4, h=3.4, ramp='wood'):
    o = new_oid(True)
    col = TAG_COLOUR.get(tag)
    def hoops(face, X, Y, Z, idx):
        hp = (np.abs(Z - h * 0.2) < 0.35) | (np.abs(Z - h * 0.8) < 0.35)
        rr = np.where(hp, R('iron'), R(ramp))
        ii = np.where(hp, np.minimum(idx + 1, 3), idx)
        if col:
            band = np.abs(Z - h * 0.5) < 0.45
            rr = np.where(band, R(col[0]), rr); ii = np.where(band, np.clip(idx - 1 + col[1], 0, 3), ii)
        if face == 't':
            rr = np.full(X.shape, R(ramp)); ii = np.where((X ** 2 + Y ** 2) > (r - 0.6) ** 2, 2, 3)
        return rr, ii
    cyl_z(0, 0, 0, h, r, ramp, oid=o, tex=hoops)
    return o


def water_barrel():
    o = barrel(None, r=1.7, h=3.6, ramp='wood')
    cyl_z(0, 0, 3.6, 3.9, 1.8, 'wood', oid=o, topidx=1)
    box(0.9, -0.3, 3.9, 1.5, 0.3, 4.4, 'iron', shades=(1, 2, 3), oid=o)
    return o


def handcart(axis='x', facing=1, load=False):
    """Two-wheeled handcart at the centre of its bed. axis 'x' or 'z' is the way it rolls; facing +1/-1 is the
    direction of travel (the handles trail behind, where the agent pushes)."""
    o = new_oid(True)
    # local frame: u along travel, v across
    def B(u0, u1, v0, v1, z0, z1, ramp, **kw):
        if axis == 'x':
            if facing < 0: u0, u1 = -u1, -u0
            box(u0, v0, z0, u1, v1, z1, ramp, oid=o, **kw)
        else:
            if facing < 0: u0, u1 = -u1, -u0
            box(v0, u0, z0, v1, u1, z1, ramp, oid=o, **kw)
    bed = lambda f, X, Y, Z, i: (None, np.where((((Y if axis == 'x' else X)) % 1.3) < 0.4, np.minimum(i + 1, 3), i) if f == 't' else i)
    B(-3.5, 3.5, -2.0, 2.0, 2.4, 3.2, 'wood', shades=(1, 2, 3), tex=bed)
    B(-3.5, 3.5, 1.4, 2.0, 3.2, 4.4, 'wood', shades=(1, 2, 3))
    B(-3.5, 3.5, -2.0, -1.4, 3.2, 4.4, 'wood', shades=(1, 2, 3))
    B(2.9, 3.5, -2.0, 2.0, 3.2, 4.4, 'wood', shades=(1, 2, 3))
    # handles trail behind
    B(-7.0, -3.5, -1.4, -0.8, 3.4, 4.0, 'wood', shades=(1, 2, 3))
    B(-7.0, -3.5, 0.8, 1.4, 3.4, 4.0, 'wood', shades=(1, 2, 3))
    B(-7.0, -6.4, -1.4, 1.4, 3.4, 4.0, 'wood', shades=(1, 2, 3))
    # a prop leg at the front
    B(2.6, 3.2, -0.4, 0.4, 0, 2.4, 'wood', shades=(1, 2, 3))
    # wheels on the near side, axle across the middle
    if axis == 'x':
        disc_y(0, 1.9, 1.9, 2.3, 'wood', kind='wheel', oid=o, spokes=6)
    else:
        disc_x(0, 1.9, 1.9, 2.3, 'wood', oid=o, spokes=6)
    if load:
        # a crate (store), a crate (saloon) and a sack (smithy): the evening delivery
        S.crate(-3.0 if axis == 'x' else -1.6, -1.6 if axis == 'x' else -3.0, 3.2, 2.6, 2.6, 2.3, oid=o)
        S.crate(0.2 if axis == 'x' else -1.2, -1.2 if axis == 'x' else 0.2, 3.2, 2.4, 2.4, 2.0, ramp='ochre', oid=o)
        S.sack(1.0 if axis == 'x' else 0.4, 0.4 if axis == 'x' else 1.0, 5.2, oid=o)
    return o


# ============================ buildings and props ============================
def depot():
    """Station building, centred on its footprint (4.25 x 2.5 units), standing on the platform (its floor is at
    platform height, so its anchor at ground level sits 0.75 u below the floor). The green board on the front
    (+z) face is left blank for the schedule."""
    return S.depot(-8.5, 8.5, -5, 5)


DEPOT_BOARD = (-8.5 + 6.0, -8.5 + 15.4, 5.0, PZ + 2.4, PZ + 11.4)   # x0, x1, face z(MU), y0, y1 (MU)


def shed():
    """Storage shed for freight, centred on its footprint (2.75 x 2.1 units), standing on the ground."""
    keep = S.PZ
    S.PZ = 0
    try:
        o = S.shed(-5.5, 5.5, -4.25, 4.25)
    finally:
        S.PZ = keep
    return o


SHOPS = {
    'store':  dict(w=24, depth=16, h=13, fh=22, wall='cream', trim='green', roof='roof', sign='STORE', tc=('green', 2)),
    'smithy': dict(w=22, depth=15, h=12, fh=20, wall='wood', trim='wood', roof='roof', sign='SMITHY', tc=('wood', 3)),
    'saloon': dict(w=24, depth=16, h=14, fh=24, wall='red', trim='cream', roof='wood', sign='SALOON', tc=('red', 1)),
}


def shop(kind):
    """A false-front shop facing +z (towards the viewer's lower left), with its boardwalk and awning.
    Centred on the building's footprint; the boardwalk adds 1.25 units in front."""
    p = SHOPS[kind]
    x0, x1 = -p['w'] / 2, p['w'] / 2
    yf = p['depth'] / 2
    so, fo, sx0 = S.false_front(x0, x1, yf, p['depth'], p['h'], p['fh'], p['wall'], p['trim'], p['roof'], p['sign'], kind)
    return so, fo, sx0


def shop_sign(kind):
    p = SHOPS[kind]
    x0, x1 = -p['w'] / 2, p['w'] / 2
    sx0, sx1 = x0 + 1.6, x1 - 1.6
    yf = p['depth'] / 2
    text = p['sign']
    width_mu = (len(text) * 4 - 1) / 2.0
    E.text_on_yface(sx0 + ((sx1 - sx0) - width_mu) / 2, yf + 0.4, p['fh'] - 3.4, text, p['tc'][0], p['tc'][1])


HOUSES = [
    dict(x=(-7, 7), y=(-6, 6), h=11, wall='cream', roof='red'),
    dict(x=(-6, 6), y=(-5, 5), h=10, wall='ochre', roof='roof'),
    dict(x=(-7, 7), y=(-5, 5), h=10, wall='wood', roof='roof'),
]


def house(k):
    p = HOUSES[k]
    S.house(p['x'][0], p['x'][1], p['y'][0], p['y'][1], p['h'], p['wall'], p['roof'])


def tree(k):
    sc, seed = [(1.0, 5), (1.2, 14), (0.85, 9)][k]
    S.tree(0, 0, sc, seed)


def lamp_post(lit=False):
    x = y = z = 0
    o = new_oid(True)
    box(x - 0.9, y - 0.9, z, x + 0.9, y + 0.9, z + 1.2, 'iron', shades=(1, 2, 3), oid=o)
    box(x - 0.45, y - 0.45, z, x + 0.45, y + 0.45, z + 11, 'iron', shades=(1, 2, 3), oid=o)
    box(x - 1.3, y - 1.3, z + 11, x + 1.3, y + 1.3, z + 11.6, 'iron', shades=(1, 2, 3), oid=o)
    g = 'fire' if lit else 'glass'
    box(x - 1.1, y - 1.1, z + 11.6, x + 1.1, y + 1.1, z + 14.2, g, shades=(0, 1, 2) if not lit else (0, 0, 1), oid=o,
        tex=lambda f, X, Y, Z, i: (np.where(((X - x) if f == 'l' else (Y - y)) ** 2 < 0.12, R('iron'), R(g)), i))
    box(x - 1.5, y - 1.5, z + 14.2, x + 1.5, y + 1.5, z + 14.8, 'iron', shades=(1, 3, 3), oid=o)
    box(x - 0.7, y - 0.7, z + 14.8, x + 0.7, y + 0.7, z + 15.6, 'iron', shades=(1, 3, 3), oid=o)


def water_tower():
    S.water_tower(0, 0)


def fence(axis='x'):
    """One unit of rail fence (x 0..1 or z 0..1)."""
    o = new_oid(False)
    if axis == 'x':
        box(-0.4, -0.4, 0, 0.4, 0.4, 3.6, 'wood', shades=(1, 2, 3), oid=o)
        for z in (1.4, 2.8):
            box(0, -0.25, z, U, 0.25, z + 0.5, 'wood', shades=(0, 2, 3), oid=o)
    else:
        box(-0.4, -0.4, 0, 0.4, 0.4, 3.6, 'wood', shades=(1, 2, 3), oid=o)
        for z in (1.4, 2.8):
            box(-0.25, 0, z, 0.25, U, z + 0.5, 'wood', shades=(0, 2, 3), oid=o)


# ============================ ground tiles ============================
def _grass_tex(variant, P):
    # every term repeats once per tile (P MU), so tiles join without seams
    def f(face, X, Y, Z, idx):
        a = 2 * np.pi / P
        lf = np.sin(X * a + 1.7 * variant) + 0.8 * np.sin(Y * a + 1.3 + variant) + 0.45 * np.sin((X - Y) * a + 2.1 * variant)
        lf = lf / 2.0
        bay = E.BAYER[np.floor(X + Y).astype(int) % 4, np.floor(2 * (X - Y)).astype(int) % 4]
        v = lf * 0.6 + (bay - 0.5) * 0.9
        i = np.where(v > 0.55, 0, np.where(v > -0.35, 1, 2))
        h = hash2(np.floor(np.mod(X, P) * 2).astype(int) + 97 * variant, np.floor(np.mod(Y, P) * 2).astype(int)) % 97
        i = np.where(h == 3, 3, i); i = np.where((h == 7) & (i > 0), i - 1, i)
        return np.full(X.shape, R('grass')), i
    return f


def grass_tile(variant=0, size=4):
    """A size x size unit grass tile (x 0..size, z 0..size) at ground level; variants join seamlessly."""
    box(0, 0, -1, size * U, size * U, 0, 'grass', tex=_grass_tex(variant, size * U), oid=new_oid(False), cast=False, faces='t')


def dirt_tile(size=2):
    P = size * U
    def f(face, X, Y, Z, idx):
        hd = hash2(np.floor(np.mod(X, P) * 2).astype(int) + 5, np.floor(np.mod(Y, P) * 2).astype(int)) % 100
        di = np.where(hd < 12, 0, np.where(hd > 95, 2, 1))
        return np.full(X.shape, R('dirt')), di
    box(0, 0, -1, P, P, 0, 'dirt', tex=f, oid=new_oid(False), cast=False, faces='t')


# ============================ plank walkway over the tracks ============================
def walkway_track():
    """Plank crossing over one track: x 0..1 unit, across the whole ballast (z -1.75..1.75), flush with the rails."""
    E.CLIP[0] = (0, U)
    _ballast_x(-1, U + 1, 0)
    def planks(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            ii = np.where((X % 1.0) < 0.3, 2, np.where(hash2(np.floor(X).astype(int), 3) % 3 == 0, 0, 1))
            return rr, ii
        return rr, np.full(X.shape, 3)
    o = new_oid(False)
    for (a, b) in ((-BALLAST + 0.5, -GAUGE - 0.6), (-GAUGE + 0.6, GAUGE - 0.6), (GAUGE + 0.6, BALLAST - 0.5)):
        box(0, a, 0.7, U, b, RAIL - 0.15, 'wood', tex=planks, oid=o, cast=False, faces='tl')
    ro = new_oid(False)
    for yr in (-GAUGE, GAUGE):
        _rail_x(-1, U + 1, yr, ro)
    E.CLIP[0] = None


def walkway_ground():
    """Plank path on the ground between tracks: a 1 x 1 unit tile (x 0..1, z 0..1)."""
    def planks(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            ii = np.where((X % 1.0) < 0.3, 2, np.where(hash2(np.floor(X).astype(int), 5) % 3 == 0, 0, 1))
            return rr, ii
        return rr, np.full(X.shape, 3)
    box(0.2, 0, 0, U - 0.2, U, 1.0, 'wood', tex=planks, oid=new_oid(False), cast=False, faces='tlr')
