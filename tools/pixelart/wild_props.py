# D32 wild country (Artist 3): the small things that stand on the near-side border, drawn with the engine's shapes
# round the origin, in game units unless said (geom27's B, the D32 Frame) or MU (nature.py's style). Reuses the first
# batch's brush, pines, stumps and boulders (country_d32, nature) and adds what the wild needs: ferns, saplings,
# deadfall with root plates, a slash pile, a tumbledown rail fence, rushes, willow scrub, driftwood, angular rock,
# krummholz, orchard trees, a dry-stone wall, grass tufts.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R, hash2
from geom27 import B, CYV, ocyl, obox, axes_tilt, clampi
from geom_d32 import Frame
import nature as N

UX = E.U_XZ
UY = E.U_Y


def _rs(seed):
    return np.random.RandomState(seed & 0x7fffffff)


# ------------------------------------------------------------------------------------------------ plants
def tuft(seed=0, ramp='grass', h=0.55, n=7):
    """A tuft of tall grass blades (thin boxes), about 0.4 to 0.7u."""
    r = _rs(9000 + seed)
    o = E.new_oid(False)
    for k in range(n):
        x, z = r.uniform(-0.35, 0.35), r.uniform(-0.3, 0.3)
        hh = h * r.uniform(0.6, 1.1)
        lean = r.uniform(-0.15, 0.2)
        rm = ramp if r.rand() > 0.25 else ('straw' if ramp == 'grass' else 'grass')
        B(x - 0.04, z - 0.04, 0.0, x + 0.04, z + 0.04, hh * 0.6, rm, shades=(1, 2, 3), oid=o, cast=False)
        B(x - 0.04 + lean, z - 0.04, hh * 0.6, x + 0.04 + lean, z + 0.04, hh, rm, shades=(0, 1, 2), oid=o, cast=False)
    return o


def fern(seed=0, s=1.0):
    """Bracken: a low clump of fronds arching out from the middle, about 0.6u high and 1.2u across."""
    r = _rs(9100 + seed)
    o = E.new_oid(True)
    n = 7
    for k in range(n):
        a = k / n * 2 * math.pi + r.uniform(-0.3, 0.3)
        L = r.uniform(2.0, 3.0) * s
        for j in range(4):
            t = (j + 1) / 4
            x = math.cos(a) * L * t; y = math.sin(a) * L * t
            z = (2.6 * s) * math.sin(t * math.pi * 0.85) + 0.3
            rad = (0.95 - 0.45 * t) * s
            E.sphere(x, y, z, rad, 'needle' if (k + j) % 3 else 'leaf', oid=o, th=(0.8, 0.35, -0.15), noise=0.6,
                     seed=9100 + seed * 31 + k * 5 + j, sz=0.55)
    return o


def sapling(seed=0, s=1.0):
    """A young pine 1.4 to 2.2u: a thin stem and three tiers of needle clumps."""
    r = _rs(9200 + seed)
    o = E.new_oid(True)
    h = (7.5 + r.uniform(0, 3.5)) * s
    E.cyl_z(0, 0, 0, h * 0.5, 0.35 * s + 0.15, 'bark', oid=o, th=(0.45, 0.2, -0.15))
    for t in range(4):
        f = t / 3
        z = h * (0.3 + 0.62 * f)
        rad = (2.4 - 1.6 * f) * s
        for k in range(max(1, 3 - t)):
            a = r.uniform(0, 2 * math.pi)
            E.sphere(math.cos(a) * rad * 0.35, math.sin(a) * rad * 0.35, z, rad * 0.8, 'needle', oid=o,
                     th=(0.8, 0.4, -0.1), noise=0.55, seed=9200 + seed * 13 + t * 3 + k, sz=0.8)
    return o


def krummholz(seed=0, s=1.0):
    """A wind-bent spruce at the pass: low, wide, dark, leaning away from the wind (to +x), 0.8 to 1.3u."""
    r = _rs(9300 + seed)
    o = E.new_oid(True)
    N.limb(0, 0, 0, 1.6 * s, -0.4, 2.2 * s, 0.45, 0.3, 'bark', o)
    for k in range(7):
        x = r.uniform(-1.0, 3.6) * s; y = r.uniform(-1.4, 1.4) * s
        z = (2.6 + r.uniform(0, 2.4) - 0.25 * max(0, x)) * s
        E.sphere(x, y, max(1.2, z), r.uniform(1.3, 2.0) * s, 'pine', oid=o, th=(0.8, 0.4, -0.1), noise=0.6,
                 seed=9300 + seed * 7 + k, sz=0.7)
    return o


def rushes(seed=0, n=14, spread=1.0, h=1.0, spikes=True):
    """Rushes and cattails at the water's edge: blades in leaf and sage, a few brown spikes; about 1u."""
    r = _rs(9400 + seed)
    o = E.new_oid(True)
    for k in range(n):
        x, y = r.uniform(-2.6, 2.6) * spread, r.uniform(-2.0, 2.0) * spread
        hh = r.uniform(4.0, 6.5) * h
        lean = r.uniform(-0.7, 0.9)
        rm = 'leaf' if k % 3 else 'sage'
        E.box(x - 0.2, y - 0.2, 0, x + 0.2, y + 0.2, hh * 0.55, rm, shades=(1, 2, 3), oid=o, cast=False)
        E.box(x - 0.2 + lean * 0.5, y - 0.2, hh * 0.55, x + 0.2 + lean * 0.5, y + 0.2, hh, rm, shades=(0, 1, 2),
              oid=o, cast=False)
        if spikes and k % 4 == 0:
            E.box(x - 0.4 + lean * 0.5, y - 0.4, hh * 0.58, x + 0.4 + lean * 0.5, y + 0.4, hh * 0.58 + 1.6, 'wood',
                  shades=(2, 3, 3), oid=o, cast=False)
    return o


def scrub(seed=0, s=1.0, ramp='sage', berries=None):
    """Willow scrub or a low thicket, 0.9 to 1.3u, a few stems showing."""
    r = _rs(9500 + seed)
    o = E.new_oid(True)
    for k in range(3):
        N.limb(r.uniform(-1, 1), r.uniform(-1, 1), 0, r.uniform(-1.5, 1.5), r.uniform(-1.5, 1.5), 3.0 * s, 0.3, 0.2,
               'bark', o)
    for k, b in enumerate(N._blobs(r, 0, 0, 4.0 * s, 2.6 * s, 7, 1.5 * s, 2.3 * s, 0.35)):
        rm = ramp if (b[0] - b[1]) < 1.5 or k % 2 else 'pine'
        E.sphere(*b, rm, oid=o, th=(0.8, 0.35, -0.15), noise=0.6, seed=9500 + seed * 11 + k, sz=0.8)
    if berries:
        for k in range(5):
            E.sphere(r.uniform(-2.5, 2.5) * s, r.uniform(-2.5, 2.5) * s, r.uniform(3.5, 6.0) * s, 0.4, berries,
                     oid=o, cast=False)
    return o


def orchard_tree(seed=0, s=1.0, fruit='red'):
    """A small apple tree in the far valley's orchard, about 3u: a short trunk, a round crown, fruit."""
    r = _rs(9600 + seed)
    o = E.new_oid(True)
    E.cyl_z(0, 0, 0, 6 * s, 0.8 * s, 'bark', oid=o, th=(0.45, 0.2, -0.15))
    for (fx, fy) in ((-2.0, 1.0), (2.2, -0.8), (0.4, 2.0)):
        N.limb(0, 0, 5 * s, fx * s, fy * s, 9 * s, 0.6 * s, 0.35 * s, 'bark', o)
    blobs = N._blobs(r, 0, 0, 11 * s, 3.4 * s, 9, 2.4 * s, 3.4 * s, 0.4)
    blobs.insert(0, (0.0, 0.0, 11 * s, 4.2 * s))
    N.crown(blobs, o, 9600 + seed, ramp='leaf', dark='pine', noise=0.5)
    if fruit:
        for k in range(7):
            a = r.uniform(0, 2 * math.pi)
            E.sphere(math.cos(a) * 4.2 * s, math.sin(a) * 4.2 * s, r.uniform(8, 13) * s, 0.45, fruit, oid=o, cast=False)
    return o


# ------------------------------------------------------------------------------------------------ wood
def _bark_tex(grey=False):
    def tex(part, s, ang, rho, idx):
        h = hash2(np.floor(s * 3).astype(int), np.floor(ang * 2.5).astype(int)) % 5
        ii = np.where(h == 0, clampi(idx + 1), idx)
        if grey:
            return None, ii
        return None, ii
    return tex


def deadfall(length=6.0, yaw=0.0, r=0.32, seed=0, grey=False, roots=True, moss=True):
    """A fallen pine (u): the trunk lying at `yaw` (degrees, 0 along +x) with a root plate standing up at the -a end
    (earth and roots), a few broken limbs; grey and stripped (grey) or still barked."""
    rr = _rs(9700 + seed)
    o = E.new_oid(True)
    ramp = 'rock' if grey else 'bark'
    F = Frame(yaw=yaw)
    c = F.pt(0, 0, r)
    ocyl(c, F.A, r, length / 2, ramp, oid=o, tex=_bark_tex(grey), cast=True)
    for k in range(4):
        a = rr.uniform(-length / 2 + 0.8, length / 2 - 0.3)
        side = 1 if k % 2 else -1
        F.rod((a, side * r * 0.6, r * 1.3), (a + rr.uniform(0.2, 0.7), side * rr.uniform(0.6, 1.2), r + rr.uniform(0.3, 0.8)),
              0.05, ramp, oid=o)
    if roots:
        # the root plate: a ragged disc of earth stood on edge, roots sticking out
        a0 = -length / 2 - 0.05
        F.box(a0 - 0.18, -0.95, 0.0, a0 + 0.1, 0.95, 1.5, 'earth', oid=o,
              tex=lambda k, sg, uvw, idx: (None, np.where(hash2(np.floor(uvw[1] * 6).astype(int),
                                                                   np.floor(uvw[2] * 6).astype(int)) % 4 == 0,
                                                             clampi(idx + 1), idx)))
        for k in range(6):
            ang = k / 6 * 2 * math.pi
            F.rod((a0 - 0.1, math.cos(ang) * 0.7, 0.75 + math.sin(ang) * 0.6),
                  (a0 - 0.1 - rr.uniform(0.1, 0.4), math.cos(ang) * 1.15, 0.75 + math.sin(ang) * 0.95), 0.045, 'bark',
                  oid=o)
    if moss:
        for k in range(3):
            a = rr.uniform(-length / 2 + 0.5, length / 2 - 0.5)
            p = F.pt(a, 0, r * 1.85)
            E.sphere(p[0] * UX, p[1] * UX, p[2] * UY, 0.55, 'needle', oid=o, cast=False, sz=0.5)
    return o


def driftwood(seed=0, length=4.0, yaw=0.0):
    """A bleached drift log on a gravel bar: silver-grey, a root wad at one end, a stub or two."""
    rr = _rs(9800 + seed)
    o = E.new_oid(True)
    F = Frame(yaw=yaw)
    r = 0.22 + rr.uniform(0, 0.12)
    ocyl(F.pt(0, 0, r), F.A, r, length / 2, 'cream', oid=o, tex=_bark_tex(True), cast=True)
    a0 = -length / 2
    for k in range(5):
        ang = rr.uniform(0, 2 * math.pi)
        F.rod((a0, math.cos(ang) * 0.15, r + math.sin(ang) * 0.15),
              (a0 - rr.uniform(0.2, 0.6), math.cos(ang) * 0.7, r + math.sin(ang) * 0.6 + 0.2), 0.05, 'cream', oid=o)
    for k in range(2):
        a = rr.uniform(-length / 3, length / 2 - 0.3)
        F.rod((a, 0, r * 1.5), (a + 0.3, rr.uniform(-0.6, 0.6), r + 0.5), 0.045, 'cream', oid=o)
    return o


def slash_pile(seed=0, s=1.0):
    """A heap of limbs and tops left by the axemen: grey sticks, rust-brown dead needles, a few green ones."""
    rr = _rs(9900 + seed)
    o = E.new_oid(True)
    for k in range(20):
        x, y = rr.uniform(-5, 5) * s, rr.uniform(-3, 3) * s
        a = rr.uniform(0, math.pi)
        z0 = rr.uniform(0.3, 3.5) * s
        N.limb(x, y, z0, x + math.cos(a) * 4 * s, y + math.sin(a) * 2.5 * s, z0 + rr.uniform(-1, 2),
               0.3, 0.15, 'bark' if k % 3 else 'rock', o)
    for k, b in enumerate(N._blobs(rr, 0, 0, 2.2 * s, 3.6 * s, 10, 1.2 * s, 2.0 * s, 0.35)):
        E.sphere(*b, 'straw' if k % 3 else 'needle', oid=o, th=(0.8, 0.35, -0.15), noise=0.7,
                 seed=9900 + seed * 3 + k, sz=0.6)
    return o


def wild_fence(seed=0, length=8.0, fallen=0.4, lean=True):
    """A split-rail worm fence along x gone wild: panels zig-zag; some rails down in the grass, a post leaning, a
    gap. fallen: share of rails down. Drawn x -length/2 .. length/2 (u)."""
    rr = _rs(9950 + seed)
    n = int(round(length / 2.0))
    step = length / n
    F = Frame()
    for k in range(n):
        a0, a1 = -length / 2 + k * step, -length / 2 + (k + 1) * step
        c0, c1 = (0.35, -0.35) if k % 2 == 0 else (-0.35, 0.35)
        gap = rr.rand() < 0.15
        for r in range(4):
            y = 0.25 + r * 0.3
            if gap and r > 0:
                continue
            if rr.rand() < fallen and r > 0:
                # down: lying askew at the panel's foot
                da = rr.uniform(-0.3, 0.3)
                F.rod((a0 + 0.2 + da, c0 + rr.uniform(0.1, 0.6), 0.06), (a1 - 0.2 + da, c1 + rr.uniform(0.2, 0.8), 0.06),
                      0.06, 'bark')
                continue
            sag = rr.uniform(-0.15, 0.0) if r > 1 else 0.0
            F.rod((a0, c0, y), (a1, c1, y + 0.05 + sag), 0.06, 'bark')
    for k in range(n + 1):
        a = -length / 2 + k * step
        c = 0.35 if k % 2 == 0 else -0.35
        tilt = rr.uniform(-0.35, 0.35) if lean else 0.0
        F.rod((a, c - 0.15, 0.0), (a + tilt, c + 0.15 + tilt * 0.5, 1.45 - abs(tilt) * 0.4), 0.05, 'bark')


def fallen_rails(seed=0):
    """Where the fence is quite gone: two or three grey rails in the grass and a leaning post (u)."""
    rr = _rs(9960 + seed)
    F = Frame(yaw=rr.uniform(-20, 20))
    for k in range(2 + seed % 2):
        c = rr.uniform(-0.4, 0.4)
        F.rod((-1.0 + rr.uniform(-0.2, 0.2), c, 0.06), (1.0 + rr.uniform(-0.2, 0.2), c + rr.uniform(-0.3, 0.3), 0.06),
              0.06, 'bark')
    if seed % 2 == 0:
        F.rod((0.9, 0.35, 0.0), (1.4, 0.5, 1.1), 0.05, 'bark')


def good_fence(length=8.0):
    """The far valley's post-and-rail fence in good repair along x: posts every 2u, three rails."""
    F = Frame()
    n = int(round(length / 2.0))
    for k in range(n + 1):
        a = -length / 2 + k * 2.0
        F.box(a - 0.08, -0.08, 0.0, a + 0.08, 0.08, 1.2, 'wood')
    for r in range(3):
        y = 0.35 + r * 0.33
        F.box(-length / 2, -0.04, y, length / 2, 0.04, y + 0.08, 'wood')


def footbridge(length=4.2):
    """Three planks laid across a mill stream (along z), on two sills."""
    for k, x in enumerate((-0.35, 0.0, 0.35)):
        B(x - 0.16, -length / 2, 0.0, x + 0.16, length / 2, 0.12, 'wood', shades=(1, 2, 3))
    for z in (-length / 2 + 0.2, length / 2 - 0.2):
        B(-0.6, z - 0.15, -0.15, 0.6, z + 0.15, 0.0, 'bark', shades=(1, 2, 3))


# ------------------------------------------------------------------------------------------------ rock
def _strata(k, sgn, uvw, idx):
    u, v, w = uvw
    band = np.mod(w * 3.2 + np.sin(u * 2.1) * 0.25, 1.0) < 0.28
    h = hash2(np.floor(u * 3).astype(int), np.floor(w * 3).astype(int)) % 9
    ii = np.where(band, clampi(idx + 1), np.where(h == 0, clampi(idx - 1), idx))
    return None, ii


def block(sx, sz, sy, yaw=0.0, tilt=0.0, ramp='rock', y0=0.0):
    """An angular block of rock (u): half sizes sx (along), sz (across), sy (up), turned and tipped, its foot at y0."""
    a = math.radians(yaw)
    along = (math.cos(a), -math.sin(a))
    A = axes_tilt(along, tilt)
    obox((0.0, 0.0, y0 + sy * 0.92), A, (sx, sz, sy), ramp, tex=_strata, oid=E.new_oid(True), cast=True)


def rockpile(seed=0, n=6, s=1.0, ramp='rock', spread=1.3, low=False):
    """A cluster of angular blocks and round boulders (a boulder field's unit), about 1 to 2.5u across."""
    rr = _rs(10000 + seed)
    for k in range(n):
        x, z = rr.uniform(-spread, spread) * s, rr.uniform(-spread, spread) * s * 0.8
        big = rr.uniform(0.25, 0.6) * s * (0.6 if low else 1.0)
        if k % 3 == 2:
            E.sphere(x * UX, z * UX, big * UY * 0.6, big * UX * 1.1, ramp, oid=E.new_oid(True), th=(0.75, 0.3, -0.25),
                     noise=0.55, seed=10000 + seed * 7 + k, sz=0.75)
        else:
            obox((x, z, big * 0.75), axes_tilt((math.cos(rr.uniform(0, 3)), math.sin(rr.uniform(0, 3))),
                                                 rr.uniform(-18, 18)),
                 (big * rr.uniform(1.0, 1.6), big * rr.uniform(0.8, 1.3), big), ramp, tex=_strata,
                 oid=E.new_oid(True), cast=True)


def pebbles(seed=0, n=6, spread=1.2, ramp='rock'):
    rr = _rs(10100 + seed)
    for k in range(n):
        E.sphere(rr.uniform(-spread, spread) * UX, rr.uniform(-spread, spread) * UX, 0.2, rr.uniform(0.4, 0.9), ramp,
                 th=(0.75, 0.3, -0.25), noise=0.5, seed=10100 + seed * 5 + k, sz=0.6, cast=False)


def standing_stone(seed=0, h=3.0):
    """A weathered pillar of sandstone, cap rock on top (u)."""
    rr = _rs(10200 + seed)
    o = E.new_oid(True)
    w = 0.55
    for k in range(4):
        y0 = k * h / 4; y1 = (k + 1) * h / 4
        ww = w * (1.0 - 0.12 * k) * rr.uniform(0.85, 1.05)
        obox((rr.uniform(-0.05, 0.05), rr.uniform(-0.05, 0.05), (y0 + y1) / 2),
             axes_tilt((1, 0), rr.uniform(-3, 3)), (ww, ww * 0.9, (y1 - y0) / 2), 'rock', tex=_strata, oid=o, cast=True)
    obox((0.05, 0.0, h + 0.18), axes_tilt((1, 0.3), 4), (w * 1.1, w, 0.2), 'brick', oid=o, cast=True)


def snowbank(seed=0, s=1.0):
    """A lingering snow patch in a hollow: soft white mounds."""
    rr = _rs(10300 + seed)
    o = E.new_oid(False)
    for k in range(5):
        E.sphere(rr.uniform(-3, 3) * s, rr.uniform(-2, 2) * s, 0.0, rr.uniform(1.5, 2.6) * s, 'cream', oid=o,
                 th=(0.6, 0.2, -0.2), noise=0.2, seed=10300 + k, sz=0.35, cast=False)
    return o


def drystone_wall(length=8.0, seed=0, h=0.6):
    """A low dry-stone wall along x, its stones in courses (u)."""
    rr = _rs(10400 + seed)
    y = 0.0
    for c in range(3):
        a = -length / 2 + rr.uniform(0, 0.3)
        hh = h / 3
        while a < length / 2 - 0.1:
            w = rr.uniform(0.35, 0.7)
            b = min(a + w, length / 2)
            B(a, -0.25 + rr.uniform(-0.03, 0.03), y, b - 0.04, 0.25, y + hh * rr.uniform(0.85, 1.0), 'rock',
              shades=(1, 2, 3), tex=lambda f, x, z, yy, i: (None, np.where(hash2(np.floor(x * 5).astype(int), np.floor(yy * 9).astype(int)) % 5 == 0, clampi(i + 1), i)))
            a = b
        y += hh


def wetrock(seed=0, s=1.0):
    """A dark wet boulder in the stream, mostly under water: two or three rounded humps (MU, round the origin)."""
    rr = _rs(10500 + seed)
    o = E.new_oid(True)
    for k in range(2 + seed % 2):
        x, y = rr.uniform(-2.2, 2.2) * s, rr.uniform(-1.6, 1.6) * s
        E.sphere(x, y, 4.2 * s, rr.uniform(1.8, 2.8) * s, 'umber' if k % 2 else 'iron', oid=o, th=(0.7, 0.3, -0.2),
                 noise=0.4, seed=10500 + seed * 3 + k, sz=0.7)
    return o
