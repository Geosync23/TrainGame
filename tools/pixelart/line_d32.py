# D32 line building (plans/d32-tech.md 10.2): the right of way at each stage as ground tiles, the work piles and
# loose things, the surveyors' stakes, the boards, the cut through the low rise and the creek trestle in stages.
# Drawn in game units (geom27.B, geom_d32.Frame) and the engine's spheres; textures per pixel so tiles meet without
# a seam. Same palette, light, outline and shadow rules as the station and the town.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R, hash2
from geom27 import B, CYV, CYX, UX, UY, clampi
from geom_d32 import Frame, hashf
import sprites_ground as SG


def _n(X, Y, s, cell=0.5):
    return hash2(np.floor(X / cell).astype(int) + s * 131, np.floor(Y / cell).astype(int) + s * 71) % 100


# ------------------------------------------------------------------------------------------------ track tiles
def cleared(X, Y, s):
    """The cleared right of way: trampled earth, stubble of grass, chips and splinters, the odd root."""
    rr, ii = SG.dirt(X, Y, s + 200)
    ii = np.maximum(ii, 1)
    stub = _n(X, Y, s + 201) < 26
    rr = np.where(stub, R('grass'), rr); ii = np.where(stub, np.where(_n(X, Y, s + 202) < 50, 2, 3), ii)
    straw = _n(X, Y, s + 203) < 9
    rr = np.where(straw & ~stub, R('straw'), rr); ii = np.where(straw & ~stub, 2, ii)
    chip = _n(X, Y, s + 204, 0.5) < 3
    rr = np.where(chip, R('wood'), rr); ii = np.where(chip, 1, ii)
    return rr, ii


def bed(X, Y, s):
    """The dug bed: fresh dark earth, pick and shovel marks across the line, a few stones."""
    n = _n(X, Y, s + 220)
    ii = np.where(n < 18, 1, np.where(n < 75, 2, 3))
    mark = (np.mod(X + (_n(X * 0 + 1, Y, s + 221, 1.0) % 3) * 0.4, 1.3) < 0.28) & (_n(X, Y, s + 222) < 70)
    ii = np.where(mark, 3, ii)
    st = _n(X, Y, s + 223, 0.5) < 5
    rr = np.where(st, R('rock'), R('dirt'))
    return rr, np.where(st, 1, ii)


def rock(X, Y, s):
    """Broken-rock ballast: angular stones, warm and grey, dark gaps between them."""
    n = _n(X, Y, s + 240, 0.5)
    m = _n(X, Y, s + 241, 0.5)
    rr = np.where(m < 35, R('iron'), R('rock'))
    ii = np.where(n < 22, 1, np.where(n < 70, 2, 3))
    hi = (_n(X + 0.25, Y, s + 242, 0.5) < 12)
    ii = np.where(hi, np.maximum(ii - 1, 0), ii)
    return rr, ii


def edge(inner, outer, side, lip=None):
    """A cell on the edge of a strip along x: `outer` on the `side` half (n = -z, s = +z), `inner` on the other,
    a soft, jittered border with a lip of spoil (lip ramp index) along it."""
    def f(X, Y, s):
        d = Y if side == 'n' else 4.0 - Y        # MU from the cell's outer side
        jit = (_n(X, Y * 0, s + 260, 0.5) % 9) / 9.0 * 0.8 - 0.4
        ri, ii = inner(X, Y, s); ro, io = outer(X, Y, s)
        out = d < 2.0 + jit
        rr = np.where(out, ro, ri); ix = np.where(out, io, ii)
        if lip is not None:
            band = (np.abs(d - (2.0 + jit)) < 0.45)
            rr = np.where(band, R('dirt'), rr); ix = np.where(band, lip, ix)
        return rr, ix
    return f


# ------------------------------------------------------------------------------------------------ small things
WOOD_TIE = 'wood'


def tie_tex(seed):
    def tex(face, x, z, y, idx):
        g = hash2(np.floor(x * 9 + z * 9).astype(int) + seed, np.floor(y * 7).astype(int) + seed * 3) % 7
        ii = np.where(g == 0, clampi(idx + 1), idx)
        return None, ii
    return tex


def tie(x, z, y, along='x', seed=0, L=3.7, w=0.34, h=0.26, ramp=WOOD_TIE, shades=(2, 3, 4)):
    """A hewn tie lying flat, its middle at (x, z), bottom at y."""
    if along == 'x':
        B(x - L / 2, z - w / 2, y, x + L / 2, z + w / 2, y + h, ramp, tex=tie_tex(seed), shades=shades)
    else:
        B(x - w / 2, z - L / 2, y, x + w / 2, z + L / 2, y + h, ramp, tex=tie_tex(seed), shades=shades)


def rail(x0, x1, z, y, cast=True):
    """A T rail along x: foot, web and head (the head lit on top)."""
    B(x0, z - 0.09, y, x1, z + 0.09, y + 0.04, 'iron', shades=(2, 3, 3), cast=cast)
    B(x0, z - 0.03, y + 0.04, x1, z + 0.03, y + 0.14, 'iron', shades=(2, 2, 3), cast=cast)
    B(x0, z - 0.06, y + 0.14, x1, z + 0.06, y + 0.21, 'iron', shades=(1, 2, 3), cast=cast)


def stake(flag=True):
    B(-0.08, -0.08, 0.0, 0.08, 0.08, 1.05, 'wood', shades=(0, 1, 3))
    B(-0.09, -0.09, 0.85, 0.09, 0.09, 0.95, 'red', shades=(0, 1, 2))        # the surveyor's paint
    if flag:
        B(0.08, -0.02, 0.72, 0.42, 0.02, 1.0, 'red', shades=(0, 0, 1))         # a rag tied on


def end_stake():
    B(-0.1, -0.1, 0.0, 0.1, 0.1, 1.9, 'wood', shades=(0, 1, 3))
    B(-0.12, -0.12, 1.55, 0.12, 0.12, 1.7, 'cream', shades=(0, 1, 2))
    B(0.1, -0.02, 1.25, 0.75, 0.02, 1.85, 'red', shades=(0, 0, 1))
    for k in range(3):
        E.sphere((0.25 - k * 0.1) * UX, (0.2 + k * 0.08) * UX, 0.1 * UY, 0.9, 'rock', noise=0.4, seed=40 + k)


def board(kind):
    """A white lettered board on a post (the face to +z, so it reads): yard limit, a mile board."""
    B(-0.08, -0.08, 0.0, 0.08, 0.08, 2.1 if kind == 'yard' else 1.4, 'wood', shades=(1, 2, 3))
    if kind == 'yard':
        def face(f, x, z, y, idx):
            rr = np.full(x.shape, R('cream')); ii = np.where(f == 'l', 0, 1)
            lt = (f == 'l') & ((np.abs(y - 1.86) < 0.07) | (np.abs(y - 1.62) < 0.07)) & (((x + 3) * 4.5 % 1.0) < 0.6) & (np.abs(x) < 0.5)
            return np.where(lt, R('dark'), rr), np.where(lt, 1, ii)
        B(-0.65, 0.08, 1.45, 0.65, 0.14, 2.0, 'cream', tex=face)
    else:
        def face(f, x, z, y, idx):
            rr = np.full(x.shape, R('cream')); ii = np.where(f == 'l', 0, 1)
            one = (f == 'l') & (np.abs(x - 0.02) < 0.07) & (np.abs(y - 1.18) < 0.16)
            return np.where(one, R('dark'), rr), np.where(one, 1, ii)
        B(-0.28, 0.08, 0.95, 0.28, 0.14, 1.4, 'cream', tex=face)


def keg():
    def tex(face, x, z, y, idx):
        hoop = (np.abs(y - 0.12) < 0.04) | (np.abs(y - 0.5) < 0.04)
        stave = np.mod(np.arctan2(z, x) * 3, 1.0) < 0.2
        rr = np.where(hoop, R('iron'), R('wood'))
        ii = np.where(hoop, 2, np.where(stave, clampi(idx + 1), idx))
        return rr, ii
    CYV(0, 0, 0.0, 0.62, 0.3, 'wood', tex=tex)
    # the head off: the spikes showing
    for k in range(7):
        a = k * 0.9
        E.sphere(math.cos(a) * 0.12 * UX, math.sin(a) * 0.12 * UX, 0.62 * UY, 0.35, 'iron', cast=False)


def spikes():
    """A small heap of track spikes (pixel scale: little iron sticks)."""
    rnd = np.random.RandomState(7)
    for k in range(14):
        a = rnd.uniform(0, math.pi)
        x, z = rnd.uniform(-0.35, 0.35), rnd.uniform(-0.3, 0.3)
        dx, dz = math.cos(a) * 0.22, math.sin(a) * 0.22
        y = 0.04 + (0.06 if k > 8 else 0)
        B(min(x - dx, x + dx), min(z - dz, z + dz), y, max(x - dx, x + dx) + 0.05, max(z - dz, z + dz) + 0.05,
          y + 0.06, 'iron', shades=(1, 2, 3))


def rock_heap(v):
    rnd = np.random.RandomState(50 + v)
    n, rx, rz, hh = [(14, 0.8, 0.7, 0.45), (26, 1.2, 1.0, 0.65), (44, 1.7, 1.4, 0.9)][v]
    pts = []
    for k in range(n):
        r = math.sqrt(rnd.uniform(0, 1)); a = rnd.uniform(0, 2 * math.pi)
        x, z = r * rx * math.cos(a), r * rz * math.sin(a)
        y = (1 - r * r) * hh
        pts.append((y, x, z))
    for k, (y, x, z) in enumerate(sorted(pts)):
        ramp = 'rock' if hashf(v, k) < 0.6 else 'iron'
        E.sphere(x * UX, z * UX, y * UY, rnd.uniform(0.7, 1.05), ramp, th=(0.75, 0.3, -0.25), noise=0.5,
                 seed=60 + v * 50 + k, sz=0.85)


def earth_heap(v):
    rnd = np.random.RandomState(90 + v)
    rx, rz, hh = [(1.3, 0.9, 0.55), (2.0, 1.3, 0.8)][v]
    k = 0
    for ring in range(4):
        f = 1 - ring / 4.0
        for j in range(5 + ring * 2):
            a = j * 2 * math.pi / (5 + ring * 2) + ring
            x, z = rx * f * math.cos(a) * 0.8, rz * f * math.sin(a) * 0.8
            E.sphere(x * UX, z * UX, (hh * (1 - f * f) * 0.9) * UY, (1.6 - ring * 0.2) * (1.0 + 0.3 * v), 'earth',
                     th=(0.8, 0.35, -0.2), noise=0.45, seed=100 + v * 40 + k, sz=0.6)
            k += 1
    for j in range(4):
        E.sphere(rnd.uniform(-rx, rx) * 0.6 * UX, rnd.uniform(-rz, rz) * 0.6 * UX, hh * 0.5 * UY, 0.5, 'rock',
                 noise=0.4, seed=140 + j)


def tie_pile(v):
    """Ties stacked along x in cribbed layers (each layer 4 ties), v = 0, 1, 2: 2, 4, 7 layers."""
    layers = (2, 4, 7)[v]
    for L in range(layers):
        n = 4 if L < layers - 1 or v == 0 else 2 + v % 2
        for k in range(n):
            tie(0.15 * (L % 2), -0.66 + k * 0.44, L * 0.26, 'x', seed=L * 5 + k)


def rail_stack(v):
    """Rails stacked along x on two blocks, v = 0, 1, 2: 2, 6, 12 rails."""
    n = (2, 6, 12)[v]
    for xb in (-4.5, 4.5):
        B(xb - 0.2, -1.1, 0.0, xb + 0.2, 1.1, 0.2, 'wood', shades=(1, 2, 3))
    per = 6
    for k in range(n):
        layer, i = divmod(k, per)
        rail(-6.5, 6.5, -0.9 + i * 0.36 + layer * 0.18, 0.2 + layer * 0.22)


def tie_laid(seed=0):
    """A tie as laid, across the bed (along z), 3.7u long, bedded in the rock."""
    tie(0.0, 0.0, 0.0, 'z', seed=seed, L=3.7, w=0.3, h=0.2)


def spiked():
    """Over a laid tie: the two tie plates under the rails (at z +-1.025) and four spike heads."""
    for zs in (-1.025, 1.025):
        B(-0.16, zs - 0.2, 0.2, 0.16, zs + 0.2, 0.235, 'iron', shades=(2, 3, 3))
        for dz in (-0.14, 0.14):
            B(-0.04, zs + dz - 0.04, 0.235, 0.04, zs + dz + 0.04, 0.3, 'iron', shades=(1, 2, 3))


def joint():
    """A rail joint: fishplates on both rails, their bolt heads (two rails at z +-1.025, rail foot at 0.2u)."""
    for zs in (-1.025, 1.025):
        for side in (-1, 1):
            z0 = zs + side * 0.04
            B(-0.4, min(z0, z0 + side * 0.04), 0.26, 0.4, max(z0, z0 + side * 0.04), 0.38, 'iron', shades=(2, 3, 3))
        for bx in (-0.28, -0.1, 0.1, 0.28):
            B(bx - 0.03, zs + 0.08, 0.3, bx + 0.03, zs + 0.11, 0.34, 'iron', shades=(1, 1, 2))


def rail_1u():
    """1u of the two rails along x (to repeat along a straight line, 8 x 4 px a step), on the ties' top (0.2u)."""
    for zs in (-1.025, 1.025):
        rail(0.0, 1.0, zs, 0.2, cast=False)
