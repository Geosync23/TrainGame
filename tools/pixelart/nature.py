# D27 nature pushing against the town (A3): cottonwoods, willows, junipers, a dead tree, sagebrush, rabbitbrush,
# prickly pear, boulders, sandstone outcrops, cattails, fallen logs (engine shapes), and tall grass, flowers and a
# rolling tumbleweed (pixel-drawn, seeded, so they rebuild the same every time). Units: MU, as engine.py.
# Setting: high plains railroad country in 1866 (the plan's sagebrush, prickly pear, junipers on the east side,
# cottonwoods and willows along the creek).
import math
import numpy as np
import pal27  # noqa: F401
import engine as E
from engine import R, box, cyl_z, cyl_x, sphere, hash2, new_oid

UY = 16.0 / 3.0


def limb(x0, y0, z0, x1, y1, z1, r0, r1, ramp, o, step=0.6):
    """A branch from (x0, y0, z0) to (x1, y1, z1), tapering from r0 to r1: a chain of small boxes."""
    d = math.dist((x0, y0, z0), (x1, y1, z1))
    n = max(2, int(d / step))
    for k in range(n + 1):
        t = k / n
        x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t; z = z0 + (z1 - z0) * t
        r = r0 + (r1 - r0) * t
        box(x - r, y - r, z - r * 0.8, x + r, y + r, z + r * 0.8, ramp, shades=(1, 2, 3), oid=o,
            tex=lambda f, X, Y, Z, i: (None, np.where(hash2(np.floor(Z * 1.5).astype(int), np.floor((X + Y) * 2).astype(int)) % 5 == 0,
                                                       np.minimum(i + 1, 4), i)))


def crown(blobs, o, seed, ramp='leaf', dark='pine', noise=0.45):
    """Leafy clumps: the lower and back blobs in the dark ramp, the rest lit."""
    zc = sum(b[2] for b in blobs) / len(blobs)
    for k, (x, y, z, r) in enumerate(blobs):
        rm = dark if (z < zc - r * 0.9 and (x - y) > 0) else ramp
        sphere(x, y, z, r, rm, oid=o, th=(0.82, 0.42, -0.08), noise=noise, seed=seed * 13 + k)


def _blobs(rnd, cx, cy, cz, spread, n, rmin, rmax, zs=0.6):
    out = []
    for k in range(n):
        a = rnd.uniform(0, 2 * math.pi); d = rnd.uniform(0.2, 1.0) * spread
        out.append((cx + math.cos(a) * d, cy + math.sin(a) * d, cz + rnd.uniform(-spread, spread) * zs,
                    rnd.uniform(rmin, rmax)))
    return out


def cottonwood(v=0):
    """A plains cottonwood, 9 to 11u: a thick pale trunk forking into two or three limbs and a broad, broken crown."""
    rnd = np.random.RandomState(40 + v)
    o = new_oid(True)
    h = (9.0, 11.0, 8.0)[v] * UY
    s = h / (10.0 * UY)
    cyl_z(0, 0, 0, 16 * s, 1.9 * s, 'rock', oid=o, th=(0.45, 0.2, -0.15),
          tex=lambda f, X, Y, Z, i: (None, np.where(np.mod(Z + np.floor(np.arctan2(Y, X) * 3) * 1.3, 2.6) < 0.6, np.minimum(i + 1, 4), i)))
    forks = [(-6.0, 3.0, 30.0), (6.5, -2.0, 34.0), (1.0, 5.0, 38.0)][:2 + (v != 2)]
    blobs = []
    for (fx, fy, fz) in forks:
        fx *= s; fy *= s; fz *= s
        limb(0, 0, 15 * s, fx, fy, fz, 1.5 * s, 0.6 * s, 'rock', o)
        blobs += _blobs(rnd, fx, fy, fz + 7 * s, 6.5 * s, 11, 2.8 * s, 4.6 * s, 0.9)
    blobs.insert(0, (0.0, 0.0, 36 * s, 6.0 * s))
    blobs.append((0.5 * s, -0.5 * s, 46 * s, 4.0 * s))
    crown(blobs, o, 40 + v)
    return o


def willow(v=0):
    """A creekside willow, 6 to 7u: several leaning stems, a rounded crown and hanging strands."""
    rnd = np.random.RandomState(70 + v)
    o = new_oid(True)
    s = (1.0, 0.85)[v]
    tops = []
    for k in range(3):
        a = k * 2.1 + v
        x1, y1 = math.cos(a) * 3.0 * s, math.sin(a) * 3.0 * s
        limb(0, 0, 0, x1, y1, 18 * s, 0.9 * s, 0.4 * s, 'wood', o)
        tops.append((x1, y1, 22 * s))
    blobs = []
    for (x, y, z) in tops:
        blobs += _blobs(rnd, x, y, z, 5.0 * s, 6, 3.0 * s, 4.4 * s, 0.4)
    blobs.insert(0, (0.0, 0.0, 22 * s, 6.0 * s))
    crown(blobs, o, 70 + v, ramp='sage', dark='pine', noise=0.5)
    # hanging strands round the crown's edge
    so = o
    for k in range(26):
        a = rnd.uniform(0, 2 * math.pi)
        d = rnd.uniform(6.0, 8.5) * s
        x, y = math.cos(a) * d, math.sin(a) * d
        z1 = rnd.uniform(18, 22) * s
        z0 = z1 - rnd.uniform(6, 11) * s
        rm = 'sage' if (x - y) < 2 else 'pine'
        box(x - 0.3, y - 0.3, z0, x + 0.3, y + 0.3, z1, rm, shades=(1, 1, 2), oid=so, cast=False)
    return o


def juniper(v=0):
    """A Rocky Mountain juniper, 3 to 5u: a shaggy twisted trunk and dense dark blue-green clumps, irregular."""
    rnd = np.random.RandomState(90 + v)
    o = new_oid(True)
    s = (1.0, 0.7)[v]
    limb(0, 0, 0, 0.8 * s, -0.5 * s, 6 * s, 0.9 * s, 0.6 * s, 'wood', o)
    blobs = [(0.0, 0.0, 10 * s, 4.4 * s), (0.4, 0.2, 16 * s, 3.6 * s), (0.2, -0.2, 21 * s, 2.4 * s)]
    blobs += _blobs(rnd, 0.0, 0.0, 12 * s, 3.4 * s, 7, 2.0 * s, 3.0 * s, 1.2)
    for k, (x, y, z, r) in enumerate(sorted(blobs, key=lambda b: b[2])):
        sphere(x, y, z, r, 'pine', oid=o, th=(0.75, 0.3, -0.15), noise=0.6, seed=90 + v * 7 + k, sz=1.1)
    # a few dusty berries
    for k in range(5):
        a = rnd.uniform(0, 2 * math.pi)
        sphere(math.cos(a) * 3.6 * s, math.sin(a) * 3.6 * s, rnd.uniform(9, 17) * s, 0.45, 'slate', oid=o, cast=False)
    return o


def dead_tree():
    """A dead cottonwood: grey bare limbs, one broken off."""
    o = new_oid(True)
    cyl_z(0, 0, 0, 14, 1.6, 'rock', oid=o, th=(0.45, 0.2, -0.15))
    for (x, y, z, r) in ((-6, 2, 30, 0.6), (5, -3, 32, 0.6), (2, 5, 24, 0.5), (-2, -4, 22, 0.5)):
        limb(0, 0, 13, x, y, z, 1.2, r, 'rock', o)
    for (x0, y0, z0, x1, y1, z1) in ((-6, 2, 30, -9, 1, 36), (-6, 2, 30, -4, 4, 37), (5, -3, 32, 8, -2, 37),
                                     (5, -3, 32, 4, -6, 38), (2, 5, 24, 5, 7, 28)):
        limb(x0, y0, z0, x1, y1, z1, 0.5, 0.3, 'rock', o)
    limb(0, 0, 14, 3, 1, 18, 1.0, 0.9, 'rock', o)   # the broken stub
    return o


def sagebrush(v=0):
    """Big sagebrush: a silvery grey-green rounded shrub, 0.8 to 1.6u, woody at the foot."""
    rnd = np.random.RandomState(110 + v)
    o = new_oid(True)
    s = (1.0, 0.8, 1.3, 0.65)[v]
    for k in range(3):
        a = k * 2.0 + v
        limb(0, 0, 0, math.cos(a) * 1.2 * s, math.sin(a) * 1.2 * s, 2.5 * s, 0.35, 0.25, 'wood', o)
    blobs = _blobs(rnd, 0, 0, 4.2 * s, 2.0 * s, 6, 1.4 * s, 2.2 * s, 0.4)
    blobs.insert(0, (0, 0, 4.0 * s, 2.6 * s))
    for k, (x, y, z, r) in enumerate(blobs):
        sphere(x, y, z, r, 'sage', oid=o, th=(0.8, 0.35, -0.15), noise=0.7, seed=110 + v * 9 + k, sz=0.85)
    return o


def rabbitbrush(v=0):
    """Rubber rabbitbrush: upright grey-green stems with yellow flower heads (late summer)."""
    rnd = np.random.RandomState(130 + v)
    o = new_oid(True)
    s = (1.0, 0.8)[v]
    blobs = _blobs(rnd, 0, 0, 3.6 * s, 1.8 * s, 5, 1.4 * s, 2.0 * s, 0.3)
    for k, (x, y, z, r) in enumerate(blobs):
        sphere(x, y, z, r, 'sage', oid=o, th=(0.8, 0.35, -0.15), noise=0.6, seed=130 + k, sz=0.9)
    for k, (x, y, z, r) in enumerate(_blobs(rnd, 0, 0, 5.6 * s, 2.0 * s, 7, 0.8 * s, 1.2 * s, 0.3)):
        sphere(x, y, z, r, 'bloom', oid=o, th=(0.75, 0.3, -0.2), noise=0.7, seed=150 + k, sz=0.7)
    return o


def prickly_pear(v=0):
    """Plains prickly pear: a low clump of flat blue-green pads, a few red fruits on the rims."""
    rnd = np.random.RandomState(170 + v)
    o = new_oid(True)
    pads = [(0, 0, 1.4), (1.6, 0.6, 1.2), (-1.4, 0.8, 1.1), (0.6, -1.2, 1.0), (0.3, 0.4, 3.4), (-0.8, -0.3, 3.0)]
    if v == 1:
        pads += [(2.6, -0.4, 1.0), (1.4, 1.6, 3.0), (2.2, 0.4, 3.2)]
    for k, (x, y, z) in enumerate(pads):
        sphere(x, y, z, 1.15, 'green', oid=o, th=(0.75, 0.3, -0.2), sz=1.35, noise=0.2, seed=170 + k)
    for k in range(3 + v):
        x, y, z = pads[-1 - k]
        sphere(x + 0.3, y + 0.4, z + 1.6, 0.42, 'red', oid=o, cast=False)
    return o


def boulder(v=0):
    """Granite and sandstone boulders, 1 to 2.5u."""
    o = new_oid(True)
    sets = [[(0, 0, 3.0, 4.0, 0.75)],
            [(0, 0, 2.2, 3.2, 0.7), (3.4, 1.4, 1.4, 2.0, 0.75)],
            [(0, 0, 4.0, 5.4, 0.7), (-3.6, 2.4, 1.8, 2.4, 0.8), (3.0, 3.0, 1.0, 1.4, 0.8)],
            [(0, 0, 1.4, 2.0, 0.7)]][v]
    for k, (x, y, z, r, sz) in enumerate(sets):
        sphere(x, y, z * 0.9, r, 'rock', oid=o, th=(0.75, 0.3, -0.25), noise=0.55, seed=190 + v * 5 + k, sz=sz)
    return o


def outcrop(v=0):
    """A sandstone outcrop: weathered ledges stepping back, 4 to 6u across, about 2 to 3u high."""
    rnd = np.random.RandomState(210 + v)
    o = new_oid(True)
    layers = [(-10, -7, 10, 7, 0, 4.5), (-8, -6, 7, 5, 4.5, 8.5), (-6, -5, 4, 2, 8.5, 12.5), (-4, -4, 1, 0, 12.5, 15.0)]
    if v == 1:
        layers = [(-12, -5, 6, 6, 0, 3.6), (-10, -4, 2, 4, 3.6, 7.4), (-8, -2, -1, 3, 7.4, 10.0)]
    def strata(face, X, Y, Z, i):
        band = np.mod(Z, 1.5) < 0.45
        h = hash2(np.floor((X + Y) / 2.4).astype(int), np.floor(Z / 1.5).astype(int)) % 7
        ii = np.where(band, np.minimum(i + 1, 4), np.where(h == 0, np.maximum(i - 1, 0), i))
        return None, ii
    for k, (x0, y0, x1, y1, z0, z1) in enumerate(layers):
        # each ledge broken into a few blocks so the edges are not straight
        n = 3
        for j in range(n):
            xa = x0 + (x1 - x0) * j / n; xb = x0 + (x1 - x0) * (j + 1) / n
            dy0 = rnd.uniform(-1.2, 0.8); dy1 = rnd.uniform(-1.0, 1.2); dz = rnd.uniform(-0.8, 0.0)
            box(xa, y0 + dy0, z0, xb, y1 + dy1, z1 + dz, 'rock', shades=(1, 2, 3), oid=o, tex=strata)
    # rubble at the foot and a clinging juniper seedling
    for k in range(5):
        sphere(rnd.uniform(-9, 9), rnd.uniform(6, 9), 0.6, rnd.uniform(0.7, 1.3), 'rock', oid=o, noise=0.5, seed=220 + k, sz=0.7)
    sphere(4.0, 2.0, 10.0 if v == 0 else 8.0, 2.0, 'pine', oid=o, noise=0.6, seed=230 + v)
    return o


def cattails(v=0):
    """Cattails at the creek's edge: blades and brown spikes."""
    rnd = np.random.RandomState(250 + v)
    o = new_oid(True)
    n = 12 if v == 0 else 8
    for k in range(n):
        x, y = rnd.uniform(-2.4, 2.4), rnd.uniform(-2.0, 2.0)
        h = rnd.uniform(7.0, 11.0)
        lean = rnd.uniform(-0.8, 0.8)
        box(x - 0.2, y - 0.2, 0, x + 0.2, y + 0.2, h * 0.6, 'leaf', shades=(1, 2, 3), oid=o, cast=False)
        box(x - 0.2 + lean * 0.5, y - 0.2, h * 0.6, x + 0.2 + lean * 0.5, y + 0.2, h, 'leaf', shades=(1, 2, 3), oid=o, cast=False)
        if k % 2 == 0:
            box(x - 0.45, y - 0.45, h * 0.62, x + 0.45, y + 0.45, h * 0.62 + 2.2, 'wood', shades=(2, 3, 3), oid=o, cast=False)
    return o


def fallen_log(axis='x'):
    """A fallen cottonwood trunk, about 5u long, its broken end and a stub of a branch, grass at its side."""
    o = new_oid(True)
    def bark(face, X, Y, Z, i):
        if face == 'c':
            return np.full(X.shape, R('wood')), np.where(((Y) ** 2 + (Z - 1.6) ** 2) < 0.8, 2, 1)
        h = hash2(np.floor(X / 1.4).astype(int), np.floor(Z * 2).astype(int)) % 4
        return None, np.where(h == 0, np.minimum(i + 1, 4), i)
    if axis == 'x':
        cyl_x(-10.0, 10.0, 0.0, 1.6, 1.6, 'rock', oid=o, tex=bark, th=(0.7, 0.3, -0.2))
        limb(3.0, 0.8, 2.4, 5.0, 3.2, 5.2, 0.5, 0.3, 'rock', o)
    else:
        # along z: a row of short x-cylinders would look ribbed, so the trunk is a chain of spheres
        for k in range(18):
            y = -9.0 + k * 1.05
            sphere(0.0, y, 1.6, 1.65, 'rock', oid=o, th=(0.7, 0.3, -0.2), noise=0.25, seed=260 + k)
        limb(-0.8, 3.0, 2.4, -3.2, 5.0, 5.0, 0.5, 0.3, 'rock', o)
    return o


# ============================ pixel-drawn small things ============================

def _rgb(ramp, i):
    return E.PAL[R(ramp), i]


def _canvas(w, h):
    return np.zeros((h, w, 4), np.uint8)


def _px(img, x, y, ramp, i):
    if 0 <= x < img.shape[1] and 0 <= y < img.shape[0]:
        img[y, x, :3] = _rgb(ramp, i); img[y, x, 3] = 255


def grass_clump(v=0, frame=0):
    """A clump of tall grass, 8 to 16 px, blades drawn as pixel lines leaning in the wind (frame 1 leans further)."""
    rnd = np.random.RandomState(300 + v)
    w, h = 18, 18
    img = _canvas(w, h)
    ramp = ('grass', 'grass', 'straw', 'grass', 'straw', 'grass')[v]
    n = (9, 12, 10, 7, 14, 11)[v]
    tall = (10, 14, 12, 8, 15, 11)[v]
    for k in range(n):
        bx = int(rnd.randint(3, w - 4))
        bh = int(rnd.randint(tall // 2, tall))
        lean = rnd.uniform(-0.25, 0.45) + (0.18 if frame else 0)
        shade = 1 if bx < w // 2 else 2
        for j in range(bh):
            x = int(round(bx + lean * j * j / bh))
            y = h - 1 - j
            i = 3 if j < 2 else (shade if j < bh - 2 else max(0, shade - 1))
            _px(img, x, y, ramp, i)
        if ramp == 'straw' and k % 3 == 0:   # seed heads
            x = int(round(bx + lean * bh)); _px(img, x, h - bh - 1, 'straw', 0)
    return img, (w // 2, h - 1)


def flowers(v=0):
    """Wildflowers in the grass: yellow (balsamroot), purple (lupine), white (yarrow)."""
    rnd = np.random.RandomState(330 + v)
    w, h = 14, 10
    img = _canvas(w, h)
    for k in range(7):
        bx = int(rnd.randint(1, w - 2)); bh = int(rnd.randint(3, 8))
        for j in range(bh):
            _px(img, bx, h - 1 - j, 'grass', 2 if j < bh - 1 else 1)
        if k % 3 != 2:
            col = [('bloom', 1), ('plum', 0), ('cream', 0)][v]
            _px(img, bx, h - bh - 1, *col)
            if v == 1:
                _px(img, bx, h - bh, 'plum', 1)
            if v == 0:
                _px(img, bx + 1, h - bh - 1, 'bloom', 0)
    return img, (w // 2, h - 1)


def tumbleweed(frame=0):
    """A tumbleweed, about 1u across, its tangle turning a quarter turn a frame (4 frames)."""
    rnd = np.random.RandomState(360)
    w = h = 14
    img = _canvas(w, h)
    c = 6.5
    ang0 = frame * math.pi / 8
    for k in range(18):
        a = rnd.uniform(0, 2 * math.pi) + ang0
        r = rnd.uniform(2.0, 5.8)
        span = rnd.uniform(0.8, 2.0)
        for t in np.linspace(0, span, 10):
            x = int(round(c + math.cos(a + t) * r)); y = int(round(c + math.sin(a + t) * r * 0.9))
            lit = (x + y) < 2 * c
            _px(img, x, y, 'straw', 1 if lit else 3)
    # outline: ink where an opaque pixel touches the clear outside on the lower right
    return img, (w // 2, h - 2)
