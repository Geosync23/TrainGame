# D32 the country along the line (plans/d32-tech.md 1.3 and 10.3): ground tiles for prairie, woods, rock, hills and
# fields, the river and its banks, animal trails; pines, oaks, stumps, a felled tree, brush to clear, cut brush,
# rolling mounds beyond the corridor, a rail fence and a haystack by the far town, and small scatter (stones, a
# buffalo skull, a prairie dog's mound, berry bushes, a dead snag). Also the low rise and its cut, and the creek
# trestle in its stages of building. Units: tiles in tile MU (0..4), shapes in u (geom27) or MU (engine, nature.py).
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R, hash2
from geom27 import B, CYV, UX, UY, clampi
from geom_d32 import Frame, hashf
import nature as N
import sprites_ground as SG


def _n(X, Y, s, cell=0.5):
    return hash2(np.floor(X / cell).astype(int) + s * 131, np.floor(Y / cell).astype(int) + s * 71) % 100


# ------------------------------------------------------------------------------------------------ tiles
def prairie(X, Y, s):
    """Short-grass prairie: grass with patches of straw-coloured grama, specks of flowers and stones; the four
    variants lean green (1), dry (2), flowery (3), stony (4)."""
    n = _n(X, Y, s + 300); n2 = _n(X, Y, s + 301, 1.0)
    dry_p = (12, 40, 18, 22)[s]
    dry = n2 < dry_p
    rr = np.where(dry, R('straw'), R('grass'))
    ii = np.where(dry, np.where(n < 30, 1, 2), np.where(n < 15, 1, np.where(n < 85, 2, 3)))
    ii = np.where(dry & (n > 88), 3, ii)
    fl = _n(X, Y, s + 302, 0.5) < (2, 1, 6, 1)[s]
    fc = _n(X, Y, s + 303, 0.5)
    rr = np.where(fl, np.where(fc < 40, R('bloom'), np.where(fc < 70, R('plum'), R('cream'))), rr)
    ii = np.where(fl, np.where(fc < 70, 0 if s != 2 else 1, 0), ii)
    st = _n(X, Y, s + 304, 0.5) < (1, 2, 1, 6)[s]
    rr = np.where(st, R('rock'), rr); ii = np.where(st, np.where(_n(X, Y, s + 305) < 50, 1, 2), ii)
    return rr, ii


def woodfloor(X, Y, s):
    """The pine woods' floor: needles and duff over dark earth, moss, a cone or a twig."""
    n = _n(X, Y, s + 320); m = _n(X, Y, s + 321, 1.0)
    rr = np.where(m < 30, R('earth'), R('straw'))
    ii = np.where(m < 30, np.where(n < 50, 2, 3), np.where(n < 25, 2, np.where(n < 75, 3, 4)))
    moss = _n(X, Y, s + 322, 1.0) < (14, 8, 20)[s]
    rr = np.where(moss, R('needle'), rr); ii = np.where(moss, np.where(n < 40, 1, 2), ii)
    cone = _n(X, Y, s + 323, 0.5) < 2
    rr = np.where(cone, R('wood'), rr); ii = np.where(cone, 2, ii)
    tw = (np.abs(np.mod(X + Y * 0.5 + s, 3.1) - 1.5) < 0.18) & (_n(X, Y, s + 324, 1.0) < 12)
    rr = np.where(tw, R('bark'), rr); ii = np.where(tw, 1, ii)
    return rr, ii


def rockground(X, Y, s):
    """Bare rock and grit: sandstone slabs with cracks, grit between, lichen spots, a tuft of grass."""
    n = _n(X, Y, s + 340); slab = _n(X, Y, s + 341, 1.0)
    rr = np.full(X.shape, R('rock'))
    ii = np.where(slab < 60, np.where(n < 30, 0, 1), np.where(n < 50, 1, 2))
    crack = (np.abs(np.mod(X * 0.7 + Y * 0.4 + s * 1.3, 2.3) - 1.1) < 0.13) & (slab < 70)
    ii = np.where(crack, 3, ii)
    grit = _n(X, Y, s + 342, 0.5) < 14
    rr = np.where(grit, R('iron'), rr); ii = np.where(grit, 2, ii)
    lich = _n(X, Y, s + 343, 0.5) < 3
    rr = np.where(lich, np.where(_n(X, Y, s + 344) < 50, R('bloom'), R('sage')), rr)
    ii = np.where(lich, 2, ii)
    tuft = _n(X, Y, s + 345, 0.5) < (4, 1, 7)[s]
    rr = np.where(tuft, R('grass'), rr); ii = np.where(tuft, 2, ii)
    return rr, ii


def hill(lit):
    """Grass on a slope: lit (turned to the light, one step lighter) or in shade (one step darker, cooler)."""
    def f(X, Y, s):
        rr, ii = prairie(X, Y, s + (0 if lit else 1))
        if lit:
            ii = np.maximum(ii - 1, 0)
        else:
            ii = np.minimum(ii + 1, 4)
            rr = np.where((rr == R('grass')) & (_n(X, Y, s + 360) < 30), R('needle'), rr)
        return rr, ii
    return f


def field(X, Y, s):
    """The far town's field: ploughed rows along x with young wheat (1) or stubble (2)."""
    row = np.mod(Y + 0.4 * s, 1.0) < 0.5
    n = _n(X, Y, s + 380)
    rr = np.where(row, R('earth'), R('grass') if s == 0 else R('straw'))
    ii = np.where(row, np.where(n < 50, 2, 3), np.where(n < 40, 1, 2))
    return rr, ii


def river(X, Y, f):
    """The river: deeper and slower than the creek; glints drift along +x."""
    n = _n(X - f * 0.5, Y, 17, 0.5)
    ii = np.where(n < 60, 2, np.where(n < 85, 3, 1))
    glint = (_n(X - f * 1.0, Y, 19, 1.0) < 6) & (np.mod(X - f * 1.0, 1.0) < 0.5)
    ii = np.where(glint, 0, ii)
    return R('river'), ii


def riverbank(side):
    """Grass, a strip of mud and sand, then the river towards `side` (as the creek's bank tiles)."""
    def f(X, Y, s):
        d = {'n': 4.0 - Y, 's': Y, 'e': X, 'w': 4.0 - X}
        t = d[side] if len(side) == 1 else np.minimum(d[side[0]], d[side[1]])
        jit = (_n(X, Y * 0 + 1, 13, 0.5) % 7) / 10.0
        rg, ig = prairie(X, Y, 0)
        rw, iw = river(X, Y, 0)
        n = _n(X, Y, 14)
        wet = t > 2.5 + jit
        mud = (t > 1.7 + jit) & ~wet
        sandy = (t > 1.2 + jit) & ~wet & ~mud
        rr = np.where(wet, rw, np.where(mud, R('earth'), np.where(sandy, R('dirt'), rg)))
        ii = np.where(wet, np.where(t < 2.9 + jit, 3, iw), np.where(mud, np.where(n < 50, 2, 3),
                      np.where(sandy, 0, ig)))
        return rr, ii
    return f


def trail(axis):
    """An animal trail across the cell, a worn thread of dirt along x or z, wandering a little."""
    def f(X, Y, s):
        rr, ii = prairie(X, Y, s)
        a, c = (X, Y) if axis == 'x' else (Y, X)
        mid = 2.0 + 0.35 * np.sin(a * 1.3 + s)
        on = np.abs(c - mid) < 0.42
        rr = np.where(on, R('dirt'), rr)
        ii = np.where(on, np.where(_n(X, Y, s + 390) < 30, 2, 1), ii)
        return rr, ii
    return f


# ------------------------------------------------------------------------------------------------ trees
def pine(v=0):
    """A ponderosa pine, 5 to 6.5u: a straight cinnamon trunk, a tall broken cone of needle clumps, a few dead
    lower branches."""
    rnd = np.random.RandomState(500 + v)
    o = E.new_oid(True)
    h = (6.2, 5.2, 4.2)[v] * UY
    s = h / (6.2 * UY)
    E.cyl_z(0, 0, 0, h * 0.75, 1.1 * s + 0.3, 'bark', oid=o, th=(0.45, 0.2, -0.15),
            tex=lambda f, X, Y, Z, i: (None, np.where(hash2(np.floor(Z / 1.6).astype(int), np.floor(np.arctan2(Y, X) * 2).astype(int)) % 3 == 0, np.minimum(i + 1, 4), i)))
    for k in range(3):
        a = rnd.uniform(0, 2 * math.pi)
        z = h * rnd.uniform(0.2, 0.32)
        N.limb(0, 0, z, math.cos(a) * 3.0 * s, math.sin(a) * 3.0 * s, z + 2.0, 0.35, 0.2, 'bark', o)
    tiers = 8
    for t in range(tiers):
        f = t / (tiers - 1)
        z = h * (0.34 + 0.62 * f)
        rad = (4.0 - 3.0 * f) * s + 0.5
        n = max(1, int(5 - 3 * f))
        for k in range(n):
            a = rnd.uniform(0, 2 * math.pi) + t * 2.3
            d = rad * rnd.uniform(0.45, 0.85)
            r = rad * rnd.uniform(0.4, 0.6)
            ramp = 'needle'
            E.sphere(math.cos(a) * d, math.sin(a) * d, z + rnd.uniform(-1, 1), r, ramp, oid=o,
                     th=(0.8, 0.4, -0.1), noise=0.55, seed=510 + v * 40 + t * 7 + k, sz=0.75)
    E.sphere(0, 0, h * 0.98, 1.0 * s + 0.4, 'needle', oid=o, th=(0.8, 0.4, -0.1), noise=0.5, seed=590 + v, sz=1.2)
    return o


def oak(v=0):
    """A bur oak, about 5u: a short dark trunk, two or three heavy limbs and a broad, lumpy crown."""
    rnd = np.random.RandomState(600 + v)
    o = E.new_oid(True)
    s = (1.0, 0.8)[v]
    E.cyl_z(0, 0, 0, 12 * s, 1.5 * s, 'bark', oid=o, th=(0.45, 0.2, -0.15))
    forks = [(-5.0, 2.0, 18.0), (5.5, -1.5, 20.0), (0.5, 4.5, 22.0)][:3 - v]
    blobs = []
    for (fx, fy, fz) in forks:
        fx *= s; fy *= s; fz *= s
        N.limb(0, 0, 11 * s, fx, fy, fz, 1.2 * s, 0.5 * s, 'bark', o)
        blobs += N._blobs(rnd, fx, fy, fz + 3 * s, 5.0 * s, 8, 2.6 * s, 4.0 * s, 0.6)
    blobs.insert(0, (0.0, 0.0, 22 * s, 6.0 * s))
    blobs.append((0.5 * s, 0.5 * s, 28 * s, 3.8 * s))
    N.crown(blobs, o, 600 + v, ramp='leaf', dark='pine', noise=0.55)
    return o


def snag():
    """A dead pine, grey and stripped, a broken top."""
    o = E.new_oid(True)
    E.cyl_z(0, 0, 0, 26, 1.2, 'rock', oid=o, th=(0.45, 0.2, -0.15))
    for (x, y, z) in ((-3, 1, 14), (3, -2, 18), (2, 3, 10), (-2, -3, 21)):
        N.limb(0, 0, z - 3, x, y, z, 0.4, 0.2, 'rock', o)
    return o


def stump(v=0):
    """A fresh-cut stump: the pale cut face with its rings, bark round it, a root or two, chips about."""
    o = E.new_oid(True)
    r = (1.5, 2.0)[v]
    hgt = (2.4, 3.0)[v]
    def tex(face, X, Y, Z, i):
        if face == 't':
            rho = np.sqrt(X * X + Y * Y)
            return np.full(X.shape, R('wood')), np.where(np.mod(rho, 0.6) < 0.2, 1, 0)
        return np.full(X.shape, R('bark')), i
    E.cyl_z(0, 0, 0, hgt, r, 'bark', oid=o, tex=tex, th=(0.45, 0.2, -0.15), topidx=0)
    for a in (0.6, 2.5, 4.4):
        N.limb(math.cos(a) * r * 0.8, math.sin(a) * r * 0.8, 0.8, math.cos(a) * r * 2.0, math.sin(a) * r * 2.0, 0.2,
               0.5, 0.25, 'bark', o)
    for k in range(5):
        a = k * 1.3 + v
        E.box(math.cos(a) * r * 2.4 - 0.25, math.sin(a) * r * 2.4 - 0.2, 0, math.cos(a) * r * 2.4 + 0.25,
              math.sin(a) * r * 2.4 + 0.2, 0.25, 'wood', shades=(0, 1, 2), cast=False)
    return o


def felled():
    """A felled pine along x, limbed: the cut end pale with rings, a few lopped stubs, branches in a heap beside."""
    o = E.new_oid(True)
    def bark(face, X, Y, Z, idx):
        if face == 'c':
            rho = np.sqrt(Y * Y + (Z - 1.4) ** 2)
            return np.full(X.shape, R('wood')), np.where(np.mod(rho, 0.6) < 0.2, 1, 0)
        h = hash2(np.floor(X / 1.2).astype(int), np.floor(Z * 2).astype(int)) % 4
        return np.full(X.shape, R('bark')), np.where(h == 0, np.minimum(idx + 1, 4), idx)
    E.cyl_x(-14.0, 14.0, 0.0, 1.4, 1.4, 'bark', oid=o, tex=bark, th=(0.7, 0.3, -0.2))
    for x in (-8.0, -2.0, 5.0, 10.0):
        E.box(x - 0.3, -0.3, 2.6, x + 0.3, 0.3, 3.4, 'bark', shades=(1, 2, 3), oid=o)
    for k in range(6):
        sx = -10 + k * 3.5
        N.limb(sx, 3.0, 0.2, sx + 2.5, 5.5, 1.6, 0.3, 0.15, 'bark', o)
        E.sphere(sx + 2.4, 5.4, 1.8, 1.4, 'needle', oid=o, noise=0.6, seed=640 + k, sz=0.6)


def brush(v=0):
    """A thicket on the right of way: sage and rabbitbrush with a chokecherry or wild plum among them, 2 to 3u
    across (the clearers cut it)."""
    rnd = np.random.RandomState(700 + v)
    o = E.new_oid(True)
    sp = (3.6, 4.6, 5.4)[v]
    pts = [(rnd.uniform(-sp, sp), rnd.uniform(-sp * 0.8, sp * 0.8)) for _ in range(5 + 2 * v)]
    for k, (x, y) in enumerate(sorted(pts, key=lambda p: p[0] + p[1])):
        kind = k % 3
        if kind == 2 or (v == 2 and k == 1):
            for j in range(3):
                N.limb(x, y, 0, x + rnd.uniform(-1, 1), y + rnd.uniform(-1, 1), 4.0, 0.35, 0.2, 'bark', o)
            for j, b in enumerate(N._blobs(rnd, x, y, 6.5, 2.2, 5, 1.6, 2.4, 0.5)):
                E.sphere(*b, 'leaf', oid=o, th=(0.8, 0.35, -0.15), noise=0.6, seed=720 + v * 30 + k * 5 + j, sz=0.9)
            for j in range(3):
                E.sphere(x + rnd.uniform(-2, 2), y + rnd.uniform(-2, 2), rnd.uniform(5, 8), 0.45, 'plum', oid=o,
                         cast=False)
        else:
            sc = rnd.uniform(0.8, 1.2)
            for j, b in enumerate(N._blobs(rnd, x, y, 3.4 * sc, 1.8 * sc, 5, 1.3 * sc, 2.0 * sc, 0.4)):
                E.sphere(*b, 'sage', oid=o, th=(0.8, 0.35, -0.15), noise=0.65, seed=760 + v * 30 + k * 5 + j, sz=0.85)
            if kind == 1:          # rabbitbrush: small yellow heads over the grey-green
                for j in range(4):
                    E.sphere(x + rnd.uniform(-1.6, 1.6), y + rnd.uniform(-1.6, 1.6), 4.6 * sc + rnd.uniform(0, 1),
                             0.7, 'straw', oid=o, th=(0.75, 0.3, -0.2), noise=0.5, seed=780 + k * 7 + j, sz=0.7)
    return o


def brush_cut():
    """Cut brush heaped to one side: grey-green and dry twigs, a few yellow heads."""
    rnd = np.random.RandomState(790)
    o = E.new_oid(True)
    for k in range(14):
        x, y = rnd.uniform(-4, 4), rnd.uniform(-2, 2)
        a = rnd.uniform(0, math.pi)
        N.limb(x, y, rnd.uniform(0.2, 1.5), x + math.cos(a) * 3, y + math.sin(a) * 1.5, rnd.uniform(0.3, 2.0),
               0.25, 0.15, 'bark' if k % 3 else 'straw', o)
    for k, b in enumerate(N._blobs(rnd, 0, 0, 1.6, 3.0, 7, 1.0, 1.7, 0.3)):
        E.sphere(*b, 'sage' if k % 3 else 'straw', oid=o, th=(0.8, 0.35, -0.15), noise=0.7, seed=800 + k, sz=0.6)
    return o


def bush(v=0):
    """A berry bush (chokecherry, wild plum), about 1.5u, for the woods' edge and the creek."""
    rnd = np.random.RandomState(820 + v)
    o = E.new_oid(True)
    for j in range(3):
        N.limb(0, 0, 0, rnd.uniform(-1, 1), rnd.uniform(-1, 1), 3.0, 0.3, 0.2, 'bark', o)
    for j, b in enumerate(N._blobs(rnd, 0, 0, 5.5, 2.2, 6, 1.6, 2.4, 0.5)):
        E.sphere(*b, 'leaf', oid=o, th=(0.8, 0.35, -0.15), noise=0.6, seed=830 + v * 9 + j, sz=0.9)
    for j in range(4 + 2 * v):
        E.sphere(rnd.uniform(-2.5, 2.5), rnd.uniform(-2.5, 2.5), rnd.uniform(4.5, 7.5), 0.4,
                 'red' if v == 0 else 'plum', oid=o, cast=False)
    return o


def stones(v=0):
    """A few small stones half sunk in the grass."""
    rnd = np.random.RandomState(850 + v)
    n = (3, 5, 7)[v]
    for k in range(n):
        E.sphere(rnd.uniform(-3, 3), rnd.uniform(-2.5, 2.5), 0.2, rnd.uniform(0.5, 1.2), 'rock', th=(0.75, 0.3, -0.25),
                 noise=0.5, seed=860 + v * 10 + k, sz=0.6)


def skull():
    """A bleached buffalo skull in the grass, its horns black."""
    o = E.new_oid(True)
    E.sphere(0, 0, 0.6, 1.0, 'cream', oid=o, th=(0.8, 0.3, -0.2), sz=0.6)
    E.sphere(1.0, 0.2, 0.5, 0.75, 'cream', oid=o, th=(0.8, 0.3, -0.2), sz=0.6)
    E.box(1.4, 0.1, 0.4, 1.6, 0.35, 0.6, 'dark', shades=(1, 1, 2), oid=o, cast=False)
    for s in (-1, 1):
        N.limb(-0.2, s * 0.9, 0.8, -0.6, s * 1.9, 1.5, 0.3, 0.18, 'dark', o)


def burrow():
    """A prairie dog's mound: a ring of bare earth round its hole."""
    for k in range(10):
        a = k * 0.63
        E.sphere(math.cos(a) * 1.6, math.sin(a) * 1.4, 0.1, 1.0, 'dirt', noise=0.4, seed=880 + k, sz=0.45)
    E.box(-0.5, -0.4, 0.0, 0.5, 0.4, 0.35, 'dark', shades=(2, 2, 2), cast=False)


def mound(v=0):
    """A rolling hill beyond the corridor (baked into the ground): a long low swell of prairie grass, lit on its
    upper left, a few stones and grama patches on it."""
    rx, rz, hh = [(5.0, 3.5, 1.3), (7.0, 4.5, 1.9), (9.5, 5.5, 2.6)][v]
    ph = v * 1.7
    def hf(x, z):
        q = (x / rx) ** 2 + (z / rz) ** 2
        bump = 0.12 * np.sin(x * 0.9 + ph) * np.cos(z * 1.1 - ph)
        return np.maximum(0.0, hh * (1 - q) * (1 - q * 0.3) + hh * bump * (q < 0.8))
    def tex(f, x, z, y, idx):
        e = 0.05
        gx = (hf(x + e, z) - hf(x - e, z)) / (2 * e)
        gz = (hf(x, z + e) - hf(x, z - e)) / (2 * e)
        # the light comes from the upper left: slopes turned to -x and +z are lit
        lit = gx * 0.55 - gz * 0.3
        n = hash2(np.floor(x * 8).astype(int) + 7 * v, np.floor(z * 8).astype(int) + 3) % 100
        m = hash2(np.floor(x * 2).astype(int) + 11, np.floor(z * 2).astype(int) + v) % 100
        base = np.where(n < 12, 1, np.where(n < 85, 2, 3))
        ii = np.clip(base - np.where(lit > 0.25, 1, 0) + np.where(lit < -0.25, 1, 0), 0, 4)
        rr = np.where(m < 22, R('straw'), R('grass'))
        st = n > 98
        return np.where(st, R('rock'), rr), np.where(st, 1, ii)
    step = 0.25
    xs = np.arange(-rx, rx, step)
    zs = np.arange(-rz, rz, step)
    for x0 in xs:
        for z0 in zs:
            hgt = float(hf(x0 + step / 2, z0 + step / 2))
            if hgt < 0.03:
                continue
            B(x0, z0, 0.0, x0 + step, z0 + step, hgt, 'grass', tex=tex, cast=False)


def fence(axis):
    """A split-rail worm fence, 8u along x or z: zig-zag panels of four rails, the panels' ends crossed."""
    n = 4
    L = 8.0
    step = L / n
    for k in range(n):
        a0, a1 = -L / 2 + k * step, -L / 2 + (k + 1) * step
        c0, c1 = (0.35, -0.35) if k % 2 == 0 else (-0.35, 0.35)
        for r in range(4):
            y = 0.25 + r * 0.32
            if axis == 'x':
                F = Frame()
            else:
                F = Frame(yaw=-90.0)
            F.rod((a0, c0, y), (a1, c1, y + 0.05), 0.06, 'bark')
    for k in range(n + 1):
        a = -L / 2 + k * step
        c = 0.35 if k % 2 == 0 else -0.35
        F = Frame() if axis == 'x' else Frame(yaw=-90.0)
        F.rod((a, c - 0.15, 0.0), (a, c + 0.15, 1.55), 0.05, 'bark')


def haystack():
    """A round-topped haystack, about 2.5u, a pole through it."""
    o = E.new_oid(True)
    E.cyl_z(0, 0, 0, 6.0, 5.0, 'straw', oid=o, th=(0.6, 0.3, -0.1),
            tex=lambda f, X, Y, Z, i: (None, np.where(hash2(np.floor(Z).astype(int), np.floor(np.arctan2(Y, X) * 4).astype(int)) % 4 == 0, np.minimum(i + 1, 4), i)))
    E.sphere(0, 0, 6.0, 5.0, 'straw', oid=o, th=(0.75, 0.35, -0.1), noise=0.4, seed=930, sz=0.9)
    E.box(-0.2, -0.2, 9.0, 0.2, 0.2, 13.0, 'bark', shades=(1, 2, 3), oid=o)


# ------------------------------------------------------------------------------------------------ the rise and the cut
RISE_H = 0.75         # u: about a man's knee
CUT_HALF = 3.0        # u: the cut's floor, z -3 .. 3 (the dug bed and its ditches)
BANK_W = 2.0          # u: each bank, sloping from the cut's edge to the open ground


def _prof(kind, x):
    """Height factor along a piece (x 0..8): 'up' rises, 'down' falls, 'full' flat."""
    t = np.clip(x / 8.0, 0, 1)
    sm = t * t * (3 - 2 * t)
    return {'up': sm, 'down': 1 - sm, 'full': 1.0 + 0 * t}[kind]


def _grass_top(f, x, z, y, idx):
    n = hash2(np.floor(x * 8).astype(int) + 3, np.floor(z * 8).astype(int) + 5) % 100
    if f == 't':
        rr = np.where(n < 18, R('straw'), R('grass'))
        ii = np.where(n < 8, 1, np.where(n < 85, 2, 3))
        fl = n > 97
        return np.where(fl, R('bloom'), rr), np.where(fl, 0, ii)
    return np.full(x.shape, R('grass')), np.where(n < 50, 2, 3)


def _earth_face(f, x, z, y, idx):
    if f == 't':
        return _grass_top(f, x, z, y, idx)
    n = hash2(np.floor(x * 8).astype(int) + 9, np.floor(y * 8).astype(int) + 1) % 100
    strata = np.mod(y * 5.0 + np.sin(x * 0.9) * 0.4, 1.0)
    ii = np.where(strata < 0.3, 1, np.where(strata < 0.75, 2, 3))
    rr = np.full(x.shape, R('earth'))
    st = n < 6
    rr = np.where(st, R('rock'), rr); ii = np.where(st, 1, ii)
    root = (n > 94) & (y > RISE_H * 0.6)
    rr = np.where(root, R('bark'), rr); ii = np.where(root, 2, ii)
    sod = y > np.max(y) - 0.09 if np.size(y) else y > 0
    return np.where(sod, R('grass'), rr), np.where(sod, 3, ii)


def rise(kind):
    """The low rise across the line, the 8u piece between the banks (z -3 .. 3) that the diggers take away."""
    for k in range(32):
        x0 = k * 0.25
        hgt = RISE_H * float(_prof(kind, x0 + 0.125))
        if hgt < 0.02:
            continue
        B(x0 - 4.0, -CUT_HALF, 0.0, x0 - 3.75, CUT_HALF, hgt, 'grass', tex=_grass_top, cast=False)


def bank(side, kind):
    """A cut's bank, 8u along x: grass on top sloping away from the cut; the north bank's face (to +z, towards the
    viewer) is bare earth with strata, stones and roots. side 'n' (z -5 .. -3) or 's' (z 3 .. 5)."""
    for k in range(32):
        x0 = k * 0.25
        hmax = RISE_H * float(_prof(kind, x0 + 0.125))
        if hmax < 0.02:
            continue
        for j in range(8):
            w = j * 0.25
            hgt = hmax * (1 - (w / BANK_W) ** 2)
            if hgt < 0.02:
                continue
            if side == 'n':
                z1 = -CUT_HALF - w; z0 = z1 - 0.25
            else:
                z0 = CUT_HALF + w; z1 = z0 + 0.25
            face = (side == 'n' and j == 0)
            sh = 1 if side == 'n' else -1      # the north bank's slope faces away from the light, the south's to it
            def top(f, x, z, y, idx, sh=sh):
                rr, ii = _grass_top(f, x, z, y, idx)
                return rr, np.clip(ii + sh, 0, 4)
            B(x0 - 4.0, z0, 0.0, x0 - 3.75, z1, hgt, 'grass', tex=_earth_face if face else top, cast=False)


# ------------------------------------------------------------------------------------------------ the trestle
DECK_Y = 0.0          # the stringers' top: the ties sit on them at the track's own level
CAP_Y = -0.55
FOOT_Y = -2.0         # the creek bed below the line (the bridge's pictures reach below their anchor)
POSTS = (-1.75, -0.6, 0.6, 1.75)


def _timber(f, x, z, y, idx):
    n = hash2(np.floor((x + z) * 6).astype(int), np.floor(y * 6).astype(int)) % 9
    return None, np.where(n == 0, clampi(idx + 1), idx)


def bent(stage):
    """A trestle bent across the line (along z). stage 0 piles just driven, 1 posts standing with a temporary
    brace, 2 posts and cap, 3 finished with sway bracing (the full bent)."""
    top = {0: FOOT_Y + 0.7, 1: CAP_Y, 2: CAP_Y, 3: CAP_Y}[stage]
    for k, z in enumerate(POSTS):
        batter = 0.0 if abs(z) < 1 else (0.25 if z > 0 else -0.25)
        F = Frame()
        F.rod((0.0, z + batter, FOOT_Y), (0.0, z, top), 0.14, 'wood')
        if stage == 0:
            B(-0.16, z + batter - 0.16, top - 0.02, 0.16, z + batter + 0.16, top + 0.04, 'wood', shades=(0, 1, 2))
    if stage >= 2:
        B(-0.2, -2.15, CAP_Y, 0.2, 2.15, CAP_Y + 0.28, 'wood', tex=_timber)
    if stage == 1:
        Frame().rod((0.0, -2.2, FOOT_Y + 0.2), (0.0, 1.0, CAP_Y - 0.1), 0.06, 'bark')
    if stage == 3:
        F = Frame()
        F.rod((0.18, -1.95, FOOT_Y + 0.4), (0.18, 1.95, CAP_Y - 0.1), 0.05, 'wood')
        F.rod((0.18, -1.85, CAP_Y - 0.1), (0.18, 2.0, FOOT_Y + 0.4), 0.05, 'wood')
        F.rod((0.18, -2.0, FOOT_Y + 0.8), (0.18, 2.0, FOOT_Y + 0.8), 0.045, 'wood')
        # a sill on the creek bed
        B(-0.25, -2.2, FOOT_Y - 0.05, 0.25, 2.2, FOOT_Y + 0.15, 'wood', tex=_timber)


def deck(n_stringers=4):
    """6u of deck between two bents (x -3 .. 3): stringers under the rails (pairs at z +-1.025), the cap's ends
    and a guard timber each side. n_stringers 2: half laid (the stage before)."""
    zs = (-1.15, -0.9, 0.9, 1.15)[:n_stringers] if n_stringers < 4 else (-1.15, -0.9, 0.9, 1.15)
    for z in zs:
        B(-3.0, z - 0.11, DECK_Y - 0.5, 3.0, z + 0.11, DECK_Y, 'wood', tex=_timber)
    if n_stringers == 4:
        for z in (-1.95, 1.95):
            B(-3.0, z - 0.12, DECK_Y - 0.12, 3.0, z + 0.12, DECK_Y + 0.12, 'wood', tex=_timber)
