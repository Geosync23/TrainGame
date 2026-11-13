# D32 wild country (Artist 3): the nine regions' near side (south of the line, down the screen), as heightfields
# with materials and the things that stand on them. plans/d32-journey.md has the table; plans/pixel/d32/near/README.md
# the keys.
#
# A region is drawn in three bands, all measured from the piece's local z = 0 (put at the corridor's south edge):
#   edge    z 0 .. 10    the border itself: low, or falling away; pieces 8u along x, 4 variants
#   mid     z 10 .. 34   what lies beyond it down the screen: water, the drop, the far bank; pieces 16u
#   far     z 34 .. 58   further still: the far bank's woods, the valley floor; pieces 16u (the region's tiles go on)
# A region's shape is base(x, z) (the same for every piece: it does not change along x, or repeats every 8u) plus
# features of a variant that fade to nothing at the piece's two ends (and at the band's two sides), so any variant
# joins any other. A blend piece (16u) goes from one region to the next. Every texture repeats along x every 8u.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R
import country_d32 as C
import sprites_ground as SG
import nature as N
import wild_props as P
from wild_terrain import (Field, cellnoise, vnoise, fbm, smooth, env, h2, UX, UY)

BEYOND_D = 58.0        # u: where the far band ends (the region's own tiles go on from there)
NONE = -99.0


# ------------------------------------------------------------------------------------------------ helpers
def sprof(z, pts):
    """A profile through (z, h) points, smooth (flat at every point: benches and ledges)."""
    z = np.asarray(z, float)
    out = np.full(z.shape, pts[0][1], float)
    for (z0, h0), (z1, h1) in zip(pts[:-1], pts[1:]):
        t = smooth((z - z0) / (z1 - z0))
        out = np.where(z >= z0, h0 + (h1 - h0) * t, out)
    return out


def lprof(z, pts):
    zs, hs = zip(*pts)
    return np.interp(z, zs, hs)


def bump(x, z, cx, cz, rx, rz, h):
    q = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2
    return h * np.exp(-q * 2.2)


def wE(z):
    return 1.0 - smooth((np.asarray(z) - 8.4) / 1.6)


def wB(z):
    return smooth((np.asarray(z) - 10.0) / 2.5)


def wM(z):
    return wB(z) * (1.0 - smooth((np.asarray(z) - 31.5) / 2.5))


def wF(z):
    return smooth((np.asarray(z) - 34.0) / 2.5)


BANDS = {'edge': (0.0, 10.0, 8.0), 'mid': (10.0, 34.0, 16.0), 'far': (34.0, 58.0, 16.0)}
WIN = {'edge': wE, 'mid': wM, 'far': wF}


def T(fn, x, z, s=0):
    rr, ii = fn(np.mod(x, 8.0) * UX, np.asarray(z) * UX, s)
    return np.broadcast_to(rr, np.shape(x)).astype(np.int64), np.asarray(ii, np.int64)


def sel(m, a, b):
    """Pick (ramp, idx) a where m, else b."""
    return np.where(m, a[0], b[0]), np.where(m, a[1], b[1])


def m_prairie(x, z, dry=0.0, flowers=True):
    v = vnoise(x, z, 2.0, 41) + (cellnoise(x, z, 0.25, 42) - 0.5) * 0.16
    a = T(C.prairie, x, z, 0)
    b = T(C.prairie, x, z, 1)
    out = sel(v > 0.62 - dry * 0.4, b, a)
    if flowers:
        f = T(C.prairie, x, z, 2)
        out = sel(v < 0.16, f, out)
    return out


def m_slope(x, z, info, rr, ii, strength=1.0):
    """Grass on a slope: the first batch's lit and shaded hill tiles, dithered in by the slope's steepness."""
    sl = info['slope']
    lit = (info['nx'] * -0.55 + info['nz'] * 0.15) > 0.02
    a = T(C.hill(True), x, z, 0)
    b = T(C.hill(False), x, z, 0)
    t = np.clip((sl - 0.12) * 3.0 * strength, 0, 1)
    on = cellnoise(x, z, 0.125, 49) < t
    g = (rr == R('grass')) | (rr == R('straw'))
    return sel(on & g, sel(lit, a, b), (rr, ii))


def m_wood(x, z):
    a = T(C.woodfloor, x, z, 0); b = T(C.woodfloor, x, z, 2)
    v = vnoise(x, z, 2.0, 43) + (cellnoise(x, z, 0.25, 44) - 0.5) * 0.16
    return sel(v > 0.55, b, a)


def m_rock(x, z):
    a = T(C.rockground, x, z, 0); b = T(C.rockground, x, z, 1)
    v = vnoise(x, z, 2.0, 45) + (cellnoise(x, z, 0.25, 46) - 0.5) * 0.16
    return sel(v > 0.5, b, a)


def m_gravel(x, z):
    return T(SG.gravel, x, z, 0)


def m_sand(x, z):
    return T(SG.sand, x, z, 0)


def m_earthface(x, z, y):
    """A cut bank or a ravine's face: soil in layers, stones, roots, sod at the top."""
    strata = np.mod(y * 3.0 + np.sin(x * 0.9) * 0.3, 1.0)
    ii = np.where(strata < 0.3, 1, np.where(strata < 0.75, 2, 3))
    n = cellnoise(x + z, y, 0.125, 48)
    rr = np.where(n < 0.06, R('rock'), R('earth'))
    ii = np.where(n < 0.06, 1, ii)
    return rr, ii


# the canyon's beds from the rim down: (ramp, base index, thickness u, jointed)
BEDS = [('cream', 1, 0.5, False), ('rock', 1, 1.6, True), ('brick', 1, 2.2, True), ('brick', 2, 0.8, False),
        ('rock', 2, 1.0, False), ('ochre', 1, 0.6, False), ('brick', 1, 2.6, True), ('rock', 1, 0.7, False),
        ('brick', 2, 1.4, False), ('brick', 1, 2.0, True), ('ochre', 2, 0.6, False), ('rock', 1, 1.2, True),
        ('brick', 2, 3.0, True)]
_BED_TOP = np.cumsum([0.0] + [b[2] for b in BEDS])


def m_layers(x, z, y, scale=1.0):
    """Canyon rock in beds: a pale caprock, massive red sandstone with vertical joints, thin buff and ochre beds,
    crumbly red shale; dark streaks of desert varnish down the faces; the beds wobble a little."""
    d = -y / scale + 0.3 * np.sin(x * 0.55 + z * 0.4) + 0.25 * (vnoise(x + z, y, 2.0, 49) - 0.5)
    d = np.mod(np.maximum(d, 0.0), _BED_TOP[-1])
    k = np.clip(np.searchsorted(_BED_TOP, d, side='right') - 1, 0, len(BEDS) - 1)
    ramps = np.array([R(b[0]) for b in BEDS]); base = np.array([b[1] for b in BEDS])
    joint = np.array([b[3] for b in BEDS])
    rr = ramps[k]; ii = base[k].copy()
    f = d - _BED_TOP[k]
    ii = np.where(f < 0.12, ii - 1, ii)                                    # the bed's lit lip
    ii = np.where((_BED_TOP[k + 1] - d) < 0.14, ii + 1, ii)                # its shaded underside
    jx = (x + z) * 0.5
    jn = np.mod(jx + 0.7 * vnoise(x, y, 4.0, 50), 1.6) < 0.13
    ii = np.where(joint[k] & jn, ii + 1, ii)
    var = (cellnoise(x + z, 0.0, 0.25, 51) < 0.12) & (cellnoise(x + z, np.floor(y * 0.5), 0.25, 52) < 0.6)
    ii = np.where(var, ii + 1, ii)                                         # varnish streaks
    fl = cellnoise(x + z, y * 2.0, 0.125, 53)
    ii = np.where(fl < 0.06, ii + 1, np.where(fl > 0.96, ii - 1, ii))
    return rr, np.clip(ii, 0, 4)


def m_scree(x, z):
    n = cellnoise(x, z, 0.125, 54); m = cellnoise(x, z, 0.25, 55)
    rr = np.where(m < 0.2, R('iron'), R('rock'))
    ii = np.where(n < 0.25, 1, np.where(n < 0.75, 2, 3))
    return rr, ii


def m_water(x, z, y, info, ramp='river', flow=-1.0, rough=None, calm=1.0):
    """Water: deep and shallow, ripples and glints drifting with the current (flow -1: towards -x), whitewater where
    the surface falls (rapids, cascades) or rough(x, z) is high, falling water down a face; 3 frames."""
    f = info['frame']
    depth = info['depth']
    ii = np.where(depth < 0.12, 1, np.where(depth > 1.2, 3, 2))
    xs = x - flow * f * 0.25
    rip = cellnoise(xs * 0.5, z * 2.0, 0.25, 56)
    ii = np.where((rip < 0.1 * calm) & (depth > 0.12), ii - 1, ii)
    gx = x - flow * f * 0.5
    gl = (cellnoise(gx, z, 0.5, 57) < 0.04 * calm) & (np.mod(gx * 2, 1.0) < 0.5)
    ii = np.where(gl, 0, ii)
    rr = np.full(np.shape(x), R(ramp))
    sl = info['slope']
    foamy = np.clip((sl - 0.1) / 0.3, 0, 1)
    if rough is not None:
        foamy = np.maximum(foamy, rough(x, z))
    wn = cellnoise(x - flow * f * 0.375, z * 1.5, 0.125, 58 + f)
    white = wn < foamy * 0.7
    rr = np.where(white, R('cream'), rr)
    ii = np.where(white, np.where(wn < foamy * 0.3, 0, 1), ii)
    edge = (depth < 0.04) & (cellnoise(x, z, 0.125, 59 + f) < 0.35)
    rr = np.where(edge, R('cream'), rr); ii = np.where(edge, 1, ii)
    fall = info['face']
    sn = cellnoise(x + z, (y + f * 0.33) * 1.5, 0.125, 60)
    rr = np.where(fall, np.where(sn < 0.6, R('cream'), R(ramp)), rr)
    ii = np.where(fall, np.where(sn < 0.3, 0, 1), ii)
    info['shade'] = np.where(fall | white, 0, 1)
    return rr, np.clip(ii, 0, 4)


def haze(rr, ii, y, y0, y1, x, z):
    """Aerial perspective for ground far below: one step lighter, greens greyed (dithered in between)."""
    t = np.clip((y0 - y) / (y0 - y1), 0, 1)
    d = cellnoise(x, z, 0.125, 61)
    on = d < t
    ii = np.where(on, np.maximum(ii - 1, 0), ii)
    g = on & ((rr == R('grass')) | (rr == R('needle')) | (rr == R('leaf')))
    rr = np.where(g & (d < t * 0.6), R('sage'), rr)
    rr = np.where(on & (rr == R('pine')), R('slate'), rr)
    rr = np.where(on & (rr == R('brick')) & (d < t * 0.5), R('rock'), rr)
    return rr, ii


# ------------------------------------------------------------------------------------------------ scatter
class Scatter:
    """Things placed on a piece: a list of (draw, x, z, y_offset, radius), kept apart and inside the piece (with
    room on the +x side, where the shadows fall)."""

    def __init__(self, seed, L, z0, z1, margin=0.8):
        self.r = np.random.RandomState(seed & 0x7fffffff)
        self.L, self.z0, self.z1, self.m = L, z0, z1, margin
        self.items = []

    def free(self, x, z, rad):
        for (_, a, b, _, r2) in self.items:
            if r2 > 0.15 and (a - x) ** 2 + (b - z) ** 2 < (rad + r2) ** 2 * 0.8:
                return False
        return True

    def add(self, draw, x, z, rad=0.8, dy=0.0, force=False):
        if not force:
            if x - rad < self.m or x + rad * 1.4 > self.L - self.m:
                return False
            if z - rad < self.z0 or z + rad > self.z1:
                return False
            if not self.free(x, z, rad):
                return False
        self.items.append((draw, x, z, dy, rad))
        return True

    def many(self, n, make, zlo, zhi, rad, test=None, xlo=0.0, xhi=None):
        """Up to n things: make(r) -> draw; rad a number or a function of z."""
        k = 0
        for _ in range(n * 6):
            if k >= n:
                break
            x = self.r.uniform(xlo, self.L if xhi is None else xhi); z = self.r.uniform(zlo, zhi)
            if test is not None and not test(x, z):
                continue
            rr = rad(z) if callable(rad) else rad
            if self.add(make(self.r), x, z, rr):
                k += 1
        return k


def _seed(*a):
    return int(sum((i + 1) * 7919 * (v + 3) for i, v in enumerate(a))) % 100000


def at(f, x, z):
    return float(f(np.array([float(x)]), np.array([float(z)]))[0])


# shorthand makers (each returns a draw function)
def mk_brush(r): s = r.randint(3); return lambda: C.brush(s)
def mk_sage(r): s = r.randint(4); return lambda: N.sagebrush(s)
def mk_rabbit(r): s = r.randint(2); return lambda: N.rabbitbrush(s)
def mk_bush(r): s = r.randint(2); return lambda: C.bush(s)
def mk_tuft(ramp='grass', h=0.55):
    return lambda r: (lambda s=r.randint(999): P.tuft(s, ramp, h))
def mk_pine(r): s = r.randint(3); return lambda: C.pine(s)
def mk_juniper(r): s = r.randint(2); return lambda: N.juniper(s)
def mk_boulder(r): s = r.randint(4); return lambda: N.boulder(s)
def mk_fern(r): s = r.randint(999); q = r.uniform(1.0, 1.4); return lambda: P.fern(s, q)
def mk_scrub(s_=1.0, ramp='leaf', berries=None):
    return lambda r: (lambda s=r.randint(999): P.scrub(s, s_, ramp, berries))
def mk_rushes(n=10, spread=0.5, h=0.9, spikes=True):
    return lambda r: (lambda s=r.randint(999): P.rushes(s, n=n, spread=spread, h=h, spikes=spikes))
def mk_pile(n=4, s=1.0, low=False, ramp='rock'):
    return lambda r: (lambda q=r.randint(999): P.rockpile(q, n=n, s=s, low=low, ramp=ramp))
def mk_stones(r): s = r.randint(3); return lambda: C.stones(s)


# ------------------------------------------------------------------------------------------------ regions
class Region:
    key = ''
    water_ramp = 'river'
    flow = -1.0
    haze = None          # (y0, y1): ground below y0 fades, fully hazed at y1
    calm = 1.0

    def __init__(self):
        self.ctx = ('edge', None, 8.0)
        self.foam = []

    def base(self, x, z):
        return np.zeros(np.shape(x))

    def feat_edge(self, x, z, v):
        return 0.0

    def feat_beyond(self, x, z, v):
        return 0.0

    def water_base(self, x, z):
        return None

    def rough(self, x, z):
        out = np.zeros(np.shape(x))
        for (fx, fz, fr) in self.foam:
            d = np.sqrt((x - fx) ** 2 + (z - fz) ** 2)
            out = np.maximum(out, 0.6 * np.clip(1.0 - (d - fr) / 0.45, 0, 1) * (d > fr * 0.5))
            # the wake downstream (flow -1: towards -x)
            wk = (np.abs(z - fz) < fr * 0.8) & ((x - fx) * self.flow > 0) & (np.abs(x - fx) < fr + 2.2)
            out = np.maximum(out, wk * 0.3 * np.clip(1 - np.abs(x - fx) / (fr + 2.2), 0, 1))
        return out

    def mat(self, x, z, y, info):
        return m_prairie(x, z)

    def things(self, sc, band, v, field):
        pass

    # --- built from the above
    def ground(self, band, v, L):
        def g(x, z):
            h = self.base(x, z)
            if band == 'edge' and v is not None:
                h = h + self.feat_edge(x, z, v) * env(x, L) * wE(z)
            if band in ('mid', 'far') and v is not None:
                h = h + self.feat_beyond(x, z, v + (0 if band == 'mid' else 50)) * env(x, L) * WIN[band](z)
            return h
        return g

    def water(self, band, v, L):
        def w(x, z):
            b = self.water_base(x, z)
            if b is None:
                return np.full(np.shape(x), NONE)
            return b
        return w

    def field(self, band, v, L):
        self.ctx = (band, v, L)
        return Field(self.ground(band, v, L), self.water(band, v, L))

    def material(self, x, z, y, info):
        wet = info['water']
        if np.any(wet):
            wr, wi = m_water(x, z, y, info, self.water_ramp, self.flow, self.rough, self.calm)
            sh = info.get('shade', 1)
            info2 = dict(info); info2.pop('shade', None)
            lr, li = self.mat(x, z, y, info2)
            info['shade'] = np.where(wet, sh, info2.get('shade', 1))
            rr, ii = np.where(wet, wr, lr), np.where(wet, wi, li)
        else:
            rr, ii = self.mat(x, z, y, info)
        if self.haze:
            rr, ii = haze(rr, ii, y, self.haze[0], self.haze[1], x, z)
        return rr, ii


# 1 ---------------------------------------------------------------- home prairie: brush and a fence gone wild
class Prairie(Region):
    key = 'prairie'

    def base(self, x, z):
        return 0.12 * (fbm(x, z, 2.0, 61) - 0.5) + 0.3 * wB(z) * (vnoise(x, z, 4.0, 62) - 0.5)

    def feat_edge(self, x, z, v):
        r = np.random.RandomState(100 + v)
        return 0.3 * (vnoise(x + v * 3.3, z, 2.0, 63 + v) - 0.5) + bump(x, z, r.uniform(2, 6), r.uniform(6, 9), 2, 1.5, 0.3)

    def feat_beyond(self, x, z, v):
        r = np.random.RandomState(110 + v)
        h = 0.0
        for k in range(4):
            h = h + bump(x, z, r.uniform(3, 13), r.uniform(14, 56), r.uniform(5, 8), r.uniform(4, 6), r.uniform(0.4, 1.1))
        return h

    def mat(self, x, z, y, info):
        rr, ii = m_prairie(x, z, dry=0.3)
        rr, ii = m_slope(x, z, info, rr, ii)
        # a buffalo wallow or two: bare dusty hollows
        return rr, ii

    def things(self, sc, band, v, f):
        r = sc.r
        if band == 'edge':
            # the fence line gone wild along z 3 (some pieces only fallen rails), brush thick round it
            if v % 4 != 1:
                ln = (6.0, 0, 4.0, 6.0)[v % 4]
                sc.add(lambda s=v, ln=ln: P.wild_fence(seed=s, length=ln, fallen=0.4 + 0.15 * (v % 2)), 4.0, 3.1,
                       0.1, force=True)
            else:
                for k in range(3):
                    sc.add(lambda s=k: P.fallen_rails(s), 1.6 + k * 2.4, 3.2 + 0.3 * k, 0.1, force=True)
            sc.many(30, lambda r: [mk_brush, mk_bush, mk_rabbit, mk_brush, mk_sage, mk_scrub(0.9)][r.randint(6)](r),
                    1.4, 9.4, lambda z: 0.55 + 0.04 * z)
            sc.many(10, mk_tuft('straw', 0.6), 0.6, 9.5, 0.3)
            sc.many(4, mk_tuft('grass', 0.5), 0.4, 1.5, 0.3)
        else:
            # open grass with a thicket here and there (clusters, not an even sprinkle)
            r = sc.r
            for k in range(3):
                cx, cz = r.uniform(2.5, 12.5), r.uniform(sc.z0 + 3, sc.z1 - 3)
                for j in range(5):
                    x, z = cx + r.uniform(-1.8, 1.8), cz + r.uniform(-1.4, 1.4)
                    sc.add([mk_brush, mk_bush, mk_rabbit, mk_sage][r.randint(4)](r), x, z, 0.7)
            sc.many(6, mk_sage, sc.z0, sc.z1, 0.8)
            sc.many(22, mk_tuft('straw', 0.65), sc.z0, sc.z1, 0.35)
            sc.many(4, mk_stones, sc.z0, sc.z1, 0.5)
            if v % 3 == 0:
                sc.many(1, lambda r: (lambda: C.oak(r.randint(2))), sc.z0 + 3, sc.z1 - 3, 2.6)
            if v % 3 == 1:
                sc.many(3, lambda r: (lambda: N.boulder(r.randint(4))), sc.z0, sc.z1, 0.9)


# 2 ---------------------------------------------------------------- creek bottoms: the creek winding alongside
class Creek(Region):
    key = 'creek'
    water_ramp = 'creek'
    WL = -0.55

    def centre(self, x, band, v, L):
        c = 5.6 + 0.0 * x
        if band == 'edge' and v is not None:
            amp = (1.3, -1.1, 0.8, -1.4, 1.0, -0.6)[v % 6]
            c = c + amp * env(x, L)
        return c

    def ground(self, band, v, L):
        def g(x, z):
            c = self.centre(x, band, v, L)
            d = np.abs(z - c)
            ch = -0.95 * (1 - smooth((d - 1.3) / 1.4))          # the channel: a 1.3u half-width bed, 1.4u banks
            h = ch + 0.1 * (fbm(x, z, 2.0, 65) - 0.5)
            # beyond: the bottoms, low and flat, with sloughs (old channels holding water)
            h = h + wB(z) * (-0.2 + 0.16 * (vnoise(x, z, 4.0, 66) - 0.5))
            if band in ('mid', 'far') and v is not None:
                r = np.random.RandomState(200 + v + (0 if band == 'mid' else 50))
                lo, hi = BANDS[band][0] + 6, BANDS[band][1] - 6
                wb = env(x, L) * WIN[band](z)
                for k in range(1 + v % 2):
                    cx, cz = r.uniform(4, 12), r.uniform(lo, hi)
                    h = h + wb * (-bump(x, z, cx, cz, r.uniform(3, 5), r.uniform(1.4, 2.2), 0.8))
                h = h + wb * bump(x, z, r.uniform(3, 13), r.uniform(lo, hi), 5, 4, 0.6)
            if band == 'edge' and v is not None:
                h = h + env(x, L) * wE(z) * 0.15 * (vnoise(x, z, 1.0, 67 + v) - 0.5)
            return h
        return g

    def water_base(self, x, z):
        return np.full(np.shape(x), self.WL)

    def mat(self, x, z, y, info):
        rr, ii = m_prairie(x, z, dry=0.0)
        # the bottoms are lush: more green, a little darker
        lush = wB(z) > 0.5
        ii = np.where(lush & (rr == R('straw')) & (cellnoise(x, z, 0.25, 68) < 0.6), 2, ii)
        rr = np.where(lush & (rr == R('straw')) & (cellnoise(x, z, 0.25, 68) < 0.6), R('grass'), rr)
        sl = info['slope']
        near_w = y < self.WL + 0.1
        mud = near_w & (cellnoise(x, z, 0.5, 69) < 0.5)
        s = m_sand(x, z)
        rr = np.where(near_w, np.where(mud, R('earth'), s[0]), rr)
        ii = np.where(near_w, np.where(mud, np.where(cellnoise(x, z, 0.125, 70) < 0.5, 2, 3), s[1]), ii)
        face = info['face'] | (sl > 1.0)
        er, ei = m_earthface(x, z, y)
        rr = np.where(face & ~near_w, er, rr); ii = np.where(face & ~near_w, ei, ii)
        return rr, ii

    def things(self, sc, band, v, f):
        g = f.ground
        wetedge = lambda x, z: self.WL - 0.02 < at(g, x, z) < self.WL + 0.3
        if band == 'edge':
            sc.many(10, mk_rushes(10, 0.5, 0.9), 2.0, 9.6, 0.45, test=wetedge)
            sc.many(3, lambda r: (lambda s=r.randint(2): N.cattails(s)), 2.0, 9.6, 0.5, test=wetedge)
            sc.many(6, mk_tuft('grass', 0.6), 0.6, 9.6, 0.3, test=lambda x, z: at(g, x, z) > -0.3)
            sc.many(2, mk_scrub(0.8), 7.6, 9.4, 0.9, test=lambda x, z: at(g, x, z) > -0.3)
            sc.many(2, mk_bush, 0.8, 2.4, 0.6, test=lambda x, z: at(g, x, z) > -0.3)
        else:
            dry = lambda x, z: at(g, x, z) > self.WL + 0.15
            sc.many(10, mk_rushes(12, 0.7, 1.0), sc.z0, sc.z1, 0.6, test=wetedge)
            sc.many(4, lambda r: (lambda s=r.randint(2): N.cattails(s)), sc.z0, sc.z1, 0.5, test=wetedge)
            sc.many(2, lambda r: (lambda s=r.randint(2): N.willow(s)), sc.z0, sc.z1, 1.7, test=dry)
            sc.many(6, mk_scrub(1.0), sc.z0, sc.z1, 0.9, test=dry)
            sc.many(4, mk_bush, sc.z0, sc.z1, 0.7, test=dry)
            sc.many(14, mk_tuft('grass', 0.7), sc.z0, sc.z1, 0.3, test=dry)
            sc.many(3 + v % 2, lambda r: (lambda s=r.randint(3): N.cottonwood(s)), sc.z0 + 4, sc.z1 - 2, 2.6, test=dry)


# 3 ---------------------------------------------------------------- the hills: a slope falling away to a draw
class Hills(Region):
    key = 'hills'
    PROF = [(0.0, 0.0), (1.5, 0.0), (10.0, -2.6), (15.0, -3.6), (19.0, -3.6), (30.0, -1.2), (38.0, 0.6), (48.0, 0.3),
            (58.0, 0.0)]

    def wash(self, x):
        band, v, L = self.ctx
        c = 17.0 + 0.0 * np.asarray(x)
        if band == 'mid' and v is not None:
            r = np.random.RandomState(320 + v)
            c = c + r.uniform(-1.6, 1.6) * env(x, L) + r.uniform(-0.6, 0.6) * np.sin(np.asarray(x) * math.pi / L * 2) * env(x, L)
        return c

    def base(self, x, z):
        h = sprof(z, self.PROF) + 0.12 * (fbm(x, z, 2.0, 71) - 0.5)
        d = np.abs(z - self.wash(x))
        return h - 0.35 * (1 - smooth((d - 0.5) / 0.7))

    def feat_edge(self, x, z, v):
        r = np.random.RandomState(300 + v)
        h = 0.4 * (vnoise(x, z, 2.0, 72 + v) - 0.5)
        # a ledge of sandstone stepping the slope: a short cliff facing the viewer
        lz = r.uniform(4.5, 7.5) + 0.6 * np.sin(x * r.uniform(0.5, 0.9) + r.uniform(0, 3))
        hh = r.uniform(0.6, 0.95) * (v % 4 != 2)
        return h - hh * smooth((z - lz) / 0.12)

    def feat_beyond(self, x, z, v):
        r = np.random.RandomState(310 + v)
        h = 0.0
        for k in range(3):
            h = h + bump(x, z, r.uniform(3, 13), r.uniform(26, 54), r.uniform(3, 6), r.uniform(3, 6), r.uniform(0.6, 1.6))
        lz = r.uniform(24, 30)
        h = h - 0.9 * smooth((lz - z) / 0.15) * (v % 2)                     # a ledge on the far slope's foot
        return h

    def mat(self, x, z, y, info):
        sl = info['slope']
        rr, ii = m_prairie(x, z, dry=0.45)
        rr, ii = m_slope(x, z, info, rr, ii, 0.7)
        d = np.abs(z - self.wash(x))
        wash = d < 0.75 + 0.3 * vnoise(x, z, 1.0, 73)
        g = m_gravel(x, z); s = m_sand(x, z)
        rr, ii = sel(wash, sel(cellnoise(x, z, 0.5, 74) < 0.5, g, s), (rr, ii))
        face = info['face'] | (sl > 1.6)
        lr, li = m_layers(x, z, y * 2.0 + 3.0)
        rr = np.where(face, np.where(lr == R('brick'), R('rock'), lr), rr); ii = np.where(face, li, ii)
        return rr, ii

    def things(self, sc, band, v, f):
        if band == 'edge':
            sc.many(4, mk_sage, 1.0, 9.5, 0.6)
            sc.many(2, mk_bush, 1.0, 9.5, 0.6)
            sc.many(14, mk_tuft('straw', 0.55), 0.6, 9.6, 0.3)
            sc.many(4, mk_pile(3, 0.7, True), 2.0, 9.5, 0.5)
            if v % 2 == 1:
                sc.many(1, lambda r: (lambda: N.juniper(1)), 6.0, 9.0, 1.2)
        else:
            sc.many(5, mk_sage, sc.z0, sc.z1, 0.8)
            sc.many(6, mk_juniper, sc.z0, sc.z1, 1.2)
            sc.many(4, mk_boulder, sc.z0, sc.z1, 0.9)
            sc.many(24, mk_tuft('straw', 0.6), sc.z0, sc.z1, 0.3)
            if v % 2 == 1:
                sc.many(1, lambda r: (lambda: N.outcrop(1)), sc.z0 + 3, sc.z1 - 3, 3.0)


# 4 ---------------------------------------------------------------- the big woods: deadfall, ferns, stumps
class Woods(Region):
    key = 'woods'

    def base(self, x, z):
        return 0.18 * (fbm(x, z, 2.0, 81) - 0.5) - 0.4 * smooth((z - 10) / 20) + 0.6 * wB(z) * (vnoise(x, z, 4.0, 82) - 0.5)

    def feat_edge(self, x, z, v):
        return 0.3 * (vnoise(x, z, 2.0, 83 + v) - 0.5)

    def feat_beyond(self, x, z, v):
        r = np.random.RandomState(410 + v)
        return bump(x, z, r.uniform(4, 12), r.uniform(14, 56), 6, 5, r.uniform(-0.8, 1.2))

    def mat(self, x, z, y, info):
        rr, ii = m_wood(x, z)
        g = m_prairie(x, z, dry=0.2, flowers=False)
        gm = vnoise(x, z, 1.0, 84) + (cellnoise(x, z, 0.25, 85) - 0.5) * 0.3 > 0.8
        rr, ii = sel(gm, g, (rr, ii))
        return rr, ii

    def things(self, sc, band, v, f):
        r = sc.r
        if band == 'edge':
            kind = v % 4
            if kind in (0, 2):
                yaw = r.uniform(-25, 25)
                sc.add(lambda s=v, y=yaw: P.deadfall(4.6, y, 0.32, seed=s, grey=(s % 2 == 0)), 4.0, r.uniform(4.0, 5.5), 2.4)
            if kind == 1:
                sc.add(lambda s=v: P.slash_pile(s, 1.1), 4.0, 5.6, 2.0)
            if kind == 3:
                sc.add(lambda s=v: P.deadfall(4.0, 55, 0.28, seed=s + 7, grey=True), 3.6, 5.6, 1.9)
            sc.many(3, lambda r: (lambda s=r.randint(2): C.stump(s)), 1.0, 9.0, 0.6)
            sc.many(18, mk_fern, 0.8, 9.6, 0.6)
            sc.many(3, lambda r: (lambda s=r.randint(999), q=r.uniform(0.7, 1.0): P.sapling(s, q)), 5.5, 9.4, 0.8)
            sc.many(2, mk_bush, 1.0, 9.0, 0.6)
            sc.many(6, mk_tuft('grass', 0.5), 0.5, 3.0, 0.3)
        else:
            # the woods go on: pines close together, ferns and deadfall under them
            sc.many(2, lambda r: (lambda s=r.randint(99), y=r.uniform(-40, 40): P.deadfall(5.0, y, 0.34, seed=s,
                                                                                             grey=s % 2 == 0)),
                    sc.z0 + 3, sc.z1 - 3, 2.6)
            sc.many(56, mk_pine, sc.z0, sc.z1, 1.25)
            sc.many(2, lambda r: (lambda: C.snag()), sc.z0, sc.z1, 1.0)
            sc.many(26, mk_fern, sc.z0, sc.z1, 0.6)
            sc.many(6, mk_bush, sc.z0, sc.z1, 0.6)


# 5 ---------------------------------------------------------------- the rocks: a boulder field
class Rocks(Region):
    key = 'rocks'
    PROF = [(0.0, 0.0), (8.0, -0.3), (16.0, -1.6), (24.0, -2.4), (34.0, -1.0), (46.0, 0.8), (58.0, 0.0)]

    def base(self, x, z):
        return sprof(z, self.PROF) + 0.3 * (fbm(x, z, 2.0, 91) - 0.5) * smooth(z / 3)

    def feat_edge(self, x, z, v):
        return 0.35 * (vnoise(x, z, 1.0, 92 + v) - 0.5)

    def feat_beyond(self, x, z, v):
        r = np.random.RandomState(510 + v)
        h = 0.0
        for k in range(4):
            h = h + bump(x, z, r.uniform(3, 13), r.uniform(14, 56), r.uniform(2, 4), r.uniform(2, 4), r.uniform(0.6, 1.8))
        return h

    def mat(self, x, z, y, info):
        rr, ii = m_rock(x, z)
        g = m_prairie(x, z, dry=0.6, flowers=False)
        gm = vnoise(x, z, 2.0, 93) + (cellnoise(x, z, 0.25, 94) - 0.5) * 0.2 > 0.58
        rr, ii = sel(gm, g, (rr, ii))
        face = info['face'] | (info['slope'] > 1.2)
        lr, li = m_layers(x, z, y)
        rr = np.where(face, lr, rr); ii = np.where(face, li, ii)
        return rr, ii

    def things(self, sc, band, v, f):
        if band == 'edge':
            # boulders: small and low near the corridor, bigger further down the screen
            sc.many(14, lambda r: mk_pile(4, 0.55, True)(r), 0.8, 4.0, 0.55)
            sc.many(16, lambda r: mk_pile(5, r.uniform(0.9, 1.3))(r), 4.0, 9.6, 0.85)
            sc.many(4, lambda r: (lambda s=r.randint(3): N.boulder(s)), 5.0, 9.6, 0.9)
            sc.many(3, lambda r: (lambda q=r.randint(2): N.prickly_pear(q)), 1.0, 8.0, 0.5)
            sc.many(3, mk_sage, 1.0, 8.0, 0.6)
            sc.many(6, mk_tuft('straw', 0.5), 0.6, 9.0, 0.3)
        else:
            sc.many(16, lambda r: mk_pile(5, r.uniform(1.0, 1.7))(r), sc.z0, sc.z1, 1.3)
            sc.many(8, mk_boulder, sc.z0, sc.z1, 1.1)
            sc.many(6, mk_juniper, sc.z0, sc.z1, 1.2)
            sc.many(4, lambda r: (lambda q=r.randint(2): N.prickly_pear(q)), sc.z0, sc.z1, 0.6)
            sc.many(10, mk_tuft('straw', 0.55), sc.z0, sc.z1, 0.3)
            if v % 2 == 0:
                sc.many(2, lambda r: (lambda s=r.randint(9), h=r.uniform(2.6, 3.8): P.standing_stone(s, h)),
                        sc.z0 + 2, sc.z1 - 2, 1.0)
            else:
                sc.many(1, lambda r: (lambda s=r.randint(2): N.outcrop(s)), sc.z0 + 3, sc.z1 - 3, 3.0)


# 6 ---------------------------------------------------------------- the river run: the river alongside
class River(Region):
    key = 'river'
    flow = 1.0
    PROF = [(0.0, 0.0), (2.2, 0.0), (3.4, -0.75), (5.0, -1.25), (8.0, -1.6), (12.0, -1.9), (28.0, -1.9), (33.0, -1.3),
            (36.0, -0.9), (38.0, 0.3), (44.0, 0.8), (52.0, 3.0), (58.0, 4.2)]
    WL = -1.0

    def base(self, x, z):
        return sprof(z, self.PROF) + 0.08 * (fbm(x, z, 2.0, 101) - 0.5)

    def feat_edge(self, x, z, v):
        r = np.random.RandomState(600 + v)
        sh = (r.uniform(-0.9, 0.9)) * smooth((z - 2.0) / 3.0) * (1 - smooth((z - 7) / 2))
        spit = bump(x, z, r.uniform(2.5, 5.5), r.uniform(6, 8), 2.2, 1.0, 0.85 * (v % 2))
        return sh * 0.6 + spit

    def feat_beyond(self, x, z, v):
        r = np.random.RandomState(610 + v)
        h = 0.0
        if v < 50:
            for k in range(1 + v % 2):
                h = h + bump(x, z, r.uniform(4, 12), r.uniform(15, 27), r.uniform(3, 5), r.uniform(1.2, 2.2), 1.1)
        else:
            h = h + bump(x, z, r.uniform(4, 12), 35.5, 5, 2.5, r.uniform(-0.5, 0.8))
            h = h + bump(x, z, r.uniform(3, 13), r.uniform(46, 56), 5, 4, r.uniform(0.5, 2.0))
        return h

    def water_base(self, x, z):
        return np.full(np.shape(x), self.WL)

    def rough(self, x, z):
        r1 = np.clip((vnoise(x * 0.5, z * 2.0, 2.0, 102) - 0.8) * 4.0, 0, 1) * (np.abs(z - 20) < 8)
        return np.maximum(r1, Region.rough(self, x, z))

    def mat(self, x, z, y, info):
        rr, ii = m_prairie(x, z, dry=0.2)
        sl = info['slope']
        g = m_gravel(x, z); s = m_sand(x, z)
        shore = y < -0.55
        rr, ii = sel(shore & (cellnoise(x, z, 1.0, 103) < 0.6), g, sel(shore, s, (rr, ii)))
        face = info['face'] | (sl > 0.9)
        er, ei = m_earthface(x, z, y)
        rr = np.where(face & ~shore, er, rr); ii = np.where(face & ~shore, ei, ii)
        wood = (z > 40) & (vnoise(x, z, 2.0, 104) > 0.45)
        w = m_wood(x, z)
        rr, ii = sel(wood & ~face, w, (rr, ii))
        return rr, ii

    def things(self, sc, band, v, f):
        g = f.ground
        self.foam = []
        dry = lambda x, z: at(g, x, z) > self.WL + 0.05
        if band == 'edge':
            sc.many(6, mk_scrub(0.8), 0.8, 2.4, 0.8)
            sc.many(5, mk_tuft('grass', 0.6), 0.5, 2.6, 0.3)
            sc.many(2, lambda r: (lambda s=r.randint(999), y=r.uniform(-30, 30), l=r.uniform(2.6, 4.0):
                                  P.driftwood(s, l, y)), 3.5, 8.0, 1.4, test=dry)
            sc.many(4, mk_rushes(8, 0.5, 0.8, False), 3.0, 9.6, 0.4, test=lambda x, z: abs(at(g, x, z) - self.WL) < 0.25)
            n0 = len(sc.items)
            sc.many(1, lambda r: (lambda s=r.randint(99): P.wetrock(s, 0.9)), 6.0, 9.6, 0.7,
                    test=lambda x, z: not dry(x, z))
            for (fn, x, z, dy, rad) in sc.items[n0:]:
                self.foam.append((x, z, 0.9))
        else:
            n0 = len(sc.items)
            sc.many(4, lambda r: (lambda s=r.randint(99), q=r.uniform(0.9, 1.4): P.wetrock(s, q)),
                    sc.z0, min(sc.z1, 31), 1.0, test=lambda x, z: not dry(x, z))
            for (fn, x, z, dy, rad) in sc.items[n0:]:
                self.foam.append((x, z, 1.1))
            sc.many(6, lambda r: (lambda s=r.randint(999), y=r.uniform(-50, 50), l=r.uniform(2.6, 4.6):
                                  P.driftwood(s, l, y)), sc.z0, sc.z1, 1.5, test=dry)
            sc.many(5, mk_rushes(8, 0.5, 0.8, False), 32, 37, 0.4)
            sc.many(4, lambda r: (lambda s=r.randint(3): N.cottonwood(s)), 37.5, 46, 2.4)
            sc.many(5, lambda r: (lambda s=r.randint(2): N.willow(s)), 36.5, 44, 1.6)
            sc.many(6, mk_scrub(1.1), 36.5, 46, 0.9)
            sc.many(30, mk_pine, 44, 58, 1.3)


# 7 ---------------------------------------------------------------- the canyon: the rim and the drop to the river
class Canyon(Region):
    key = 'canyon'
    flow = 1.0
    PROF = [(0.0, 0.0), (2.8, -0.15), (3.4, -1.0), (4.1, -5.2), (4.9, -5.6), (5.5, -10.2), (6.6, -10.8), (7.4, -15.6),
            (9.0, -16.4), (13.0, -18.3), (15.0, -19.2), (24.0, -19.2), (25.5, -18.4), (31.0, -17.9), (33.0, -15.0),
            (40.0, -14.4), (42.0, -11.6), (50.0, -10.9), (52.0, -8.4), (58.0, -7.8)]
    WL = -18.9
    haze = (-7.0, -19.0)

    def base(self, x, z):
        h = sprof(z, self.PROF)
        k = smooth((z - 3.2) / 0.8) * (1 - smooth((z - 9.5) / 2))
        h = h + k * 0.9 * (vnoise(x, z * 0.5, 2.0, 111) - 0.5)
        h = h + 0.1 * (fbm(x, z, 2.0, 112) - 0.5)
        return h

    def feat_edge(self, x, z, v):
        r = np.random.RandomState(700 + v)
        sh = r.uniform(-0.8, 0.8)
        zs, hs = zip(*self.PROF)
        d = np.interp(z - sh, zs, hs) - np.interp(z, zs, hs)
        k = smooth((z - 2.0) / 1.0) * (1 - smooth((z - 9.0) / 1.0))
        return d * k + 0.4 * (vnoise(x, z, 1.0, 113 + v) - 0.5) * (z < 3)

    def feat_beyond(self, x, z, v):
        r = np.random.RandomState(710 + v)
        if v < 50:
            return bump(x, z, r.uniform(4, 12), r.uniform(18, 22), r.uniform(3, 5), 1.6, 0.7 * (v % 2 + 0.4))
        return bump(x, z, r.uniform(3, 13), r.uniform(38, 56), 5, 4, r.uniform(-1.0, 1.5))

    def water_base(self, x, z):
        return np.full(np.shape(x), self.WL)

    def rough(self, x, z):
        r1 = np.clip((vnoise(x * 0.5, z * 2, 2.0, 114) - 0.75) * 3.0, 0, 1) * (np.abs(z - 19.5) < 5)
        return np.maximum(r1, Region.rough(self, x, z))

    def mat(self, x, z, y, info):
        sl = info['slope']
        rr, ii = m_rock(x, z)
        g = m_prairie(x, z, dry=0.7, flowers=False)
        gm = (vnoise(x, z, 2.0, 115) > 0.55) & (sl < 0.4)
        rr, ii = sel(gm, g, (rr, ii))
        face = info['face'] | (sl > 1.1)
        lr, li = m_layers(x, z, y)
        rr = np.where(face, lr, rr); ii = np.where(face, li, ii)
        talus = (~face) & (y < -15.5) & (z < 15) & (sl > 0.2)
        sr, si = m_scree(x, z)
        rr = np.where(talus, sr, rr); ii = np.where(talus, si, ii)
        bar = (~face) & (y < -18.3)
        gr, gi = m_gravel(x, z)
        rr = np.where(bar, gr, rr); ii = np.where(bar, gi, ii)
        # the far side's ledges: red rock showing at their lips
        lip = (~face) & (z > 26) & (sl > 0.35)
        rr = np.where(lip, lr, rr); ii = np.where(lip, li, ii)
        return rr, ii

    def things(self, sc, band, v, f):
        g = f.ground
        self.foam = []
        if band == 'edge':
            sc.many(5, lambda r: [mk_pile(3, 0.7, True), mk_sage, lambda r: (lambda q=r.randint(2): N.prickly_pear(q))][r.randint(3)](r),
                    0.8, 2.6, 0.6)
            sc.many(5, mk_tuft('straw', 0.5), 0.5, 2.6, 0.3)
            if v % 2 == 0:
                sc.many(1, lambda r: (lambda: N.juniper(1)), 1.2, 2.4, 1.0)
            # pines and junipers clinging on the face's ledges
            ledge = lambda x, z: abs(at(g, x, z) - at(g, x, z + 0.4)) < 0.3 and at(g, x, z) < -3
            sc.many(4, lambda r: (lambda s=r.randint(999), q=r.uniform(0.7, 0.9): P.sapling(s, q)), 3.6, 9.6, 0.6, test=ledge)
            sc.many(2, lambda r: (lambda: N.juniper(1)), 3.6, 9.6, 0.8, test=ledge)
        else:
            sc.many(8, lambda r: mk_pile(4, r.uniform(0.8, 1.5))(r), 9.5, 14, 1.0)
            n0 = len(sc.items)
            sc.many(4, lambda r: (lambda s=r.randint(99), q=r.uniform(0.9, 1.4): P.wetrock(s, q)),
                    15.5, 23.5, 1.0, test=lambda x, z: at(g, x, z) < self.WL)
            for (fn, x, z, dy, rad) in sc.items[n0:]:
                self.foam.append((x, z, 1.0))
            sc.many(3, lambda r: (lambda s=r.randint(999), y=r.uniform(-50, 50): P.driftwood(s, 3.0, y)), 15, 24, 1.4,
                    test=lambda x, z: at(g, x, z) > self.WL + 0.05)
            sc.many(10, mk_juniper, 25, sc.z1, 1.2)
            sc.many(10, mk_pine, 25, sc.z1, 1.3)
            sc.many(6, lambda r: mk_pile(4, 1.2)(r), 25, sc.z1, 1.2)
            sc.many(6, mk_sage, 25, sc.z1, 0.8)


# 8 ---------------------------------------------------------------- the pass: the steep drop, the valley below
class Pass(Region):
    key = 'pass'
    PROF = [(0.0, 0.0), (2.0, -0.15), (3.0, -0.9), (6.0, -4.8), (9.0, -9.2), (12.0, -12.6), (15.0, -14.6),
            (19.0, -15.8), (26.0, -16.3), (58.0, -16.8)]
    haze = (-5.0, -15.0)
    water_ramp = 'creek'
    flow = -1.0

    def ribs(self, x, z):
        return vnoise(x, z * 0.25, 2.0, 121) - 0.5

    def stream(self, x):
        return 30.0 + 3.0 * np.sin(x * 0.3927)

    def base(self, x, z):
        h = lprof(z, self.PROF)
        h = np.where(z < 3.0, sprof(z, self.PROF[:3]), h)
        k = smooth((z - 3.0) / 1.5) * (1 - smooth((z - 15) / 4))
        h = h + k * 1.3 * self.ribs(x, z) + 0.12 * (fbm(x, z, 2.0, 122) - 0.5)
        d = np.abs(z - self.stream(x))
        h = h - 0.7 * (1 - smooth((d - 0.6) / 0.8)) * smooth((z - 20) / 2)
        return h

    def feat_edge(self, x, z, v):
        return 0.35 * (vnoise(x, z, 1.0, 123 + v) - 0.5) * (1 + (z > 3))

    def feat_beyond(self, x, z, v):
        r = np.random.RandomState(810 + v)
        h = bump(x, z, r.uniform(3, 13), r.uniform(20, 30), 4, 3, r.uniform(-0.5, 0.8)) * (v < 50)
        h = h + bump(x, z, r.uniform(3, 13), r.uniform(36, 56), 6, 5, r.uniform(0.3, 1.6)) * (v >= 50)
        return h

    def water_base(self, x, z):
        return np.full(np.shape(x), -16.6)

    def mat(self, x, z, y, info):
        sl = info['slope']
        rr, ii = m_prairie(x, z, dry=0.5, flowers=False)
        sg = cellnoise(x, z, 0.25, 124) < 0.3
        rr = np.where(sg & (rr == R('grass')), R('sage'), rr)
        rib = self.ribs(x, z)
        slope_zone = (z > 2.6) & (y > -15.0)
        # ribs of grey rock running down the slope, scree fans in the gullies between, turf on the shoulders
        rock = slope_zone & ((rib > 0.12) | (sl > 1.5) | info['face'])
        scree = slope_zone & (rib < -0.08) & ~rock
        lr, li = m_layers(x, z, y * 1.3)
        rr = np.where(rock, np.where(cellnoise(x, z, 0.25, 125) < 0.3, R('iron'), R('rock')), rr)
        ii = np.where(rock, np.clip(li, 1, 3), ii)
        sr, si = m_scree(x, z)
        rr = np.where(scree, sr, rr); ii = np.where(scree, np.maximum(si - 1, 0), ii)
        snow = slope_zone & (y > -7) & (rib < -0.05) & (vnoise(x, z, 1.0, 126) + (cellnoise(x, z, 0.125, 127) - 0.5) * 0.3 > 0.55)
        rr = np.where(snow, R('cream'), rr); ii = np.where(snow, np.where(cellnoise(x, z, 0.125, 128) < 0.7, 0, 1), ii)
        # the valley floor: meadow
        vf = y < -15.3
        mr, mi = m_prairie(x, z, dry=0.1)
        rr = np.where(vf, mr, rr); ii = np.where(vf, mi, ii)
        return rr, ii

    def things(self, sc, band, v, f):
        g = f.ground
        if band == 'edge':
            sc.many(5, lambda r: (lambda s=r.randint(999): P.krummholz(s, 0.7)), 0.8, 2.6, 0.8)
            sc.many(3, mk_pile(3, 0.6, True), 0.8, 2.6, 0.5)
            sc.many(6, mk_tuft('straw', 0.5), 0.5, 2.6, 0.3)
            if v % 2 == 0:
                sc.many(1, lambda r: (lambda s=r.randint(9): P.snowbank(s, 0.6)), 0.8, 2.4, 0.8)
            sc.many(5, lambda r: (lambda s=r.randint(999): P.krummholz(s, 0.9)), 3.5, 9.6, 0.9)
            sc.many(5, mk_pile(4, 0.9), 3.5, 9.6, 0.8)
        else:
            low = lambda x, z: at(g, x, z) > -16.5
            sc.many(8, lambda r: (lambda s=r.randint(999): P.krummholz(s, 1.0)), sc.z0, 15, 1.0)
            sc.many(6, mk_pile(4, 1.1), sc.z0, 15, 1.0)
            sc.many(5, lambda r: (lambda: C.pine(2)), 12, 19, 1.2)
            sc.many(24, mk_pine, 19, sc.z1, 1.3, test=low)
            sc.many(10, lambda r: (lambda s=r.randint(999): P.sapling(s, 1.1)), 19, sc.z1, 0.8, test=low)
            sc.many(6, mk_bush, 19, sc.z1, 0.6, test=low)


# 9 ---------------------------------------------------------------- the far valley: the mill stream
class Valley(Region):
    key = 'valley'
    water_ramp = 'creek'
    flow = 1.0

    def ground(self, band, v, L):
        def g(x, z):
            h = 0.06 * (fbm(x, z, 2.0, 131) - 0.5)
            d = np.abs(z - 4.6)
            h = h - 0.8 * (1 - smooth((d - 0.9) / 0.35))           # the race: a straight cut channel, 1.8u wide
            h = h + wB(z) * 0.4 * (vnoise(x, z, 4.0, 132) - 0.5)
            if band in ('mid', 'far') and v is not None:
                r = np.random.RandomState(910 + v + (0 if band == 'mid' else 50))
                lo, hi = BANDS[band][0] + 6, BANDS[band][1] - 6
                h = h + env(x, L) * WIN[band](z) * bump(x, z, r.uniform(4, 12), r.uniform(lo, hi), 6, 5, r.uniform(0.4, 1.4))
            return h
        return g

    def water_base(self, x, z):
        return np.full(np.shape(x), -0.42)

    def fields(self, x, z):
        """The far valley's fields: rectangles of wheat, stubble and plough laid out per piece (not repeating)."""
        band, v, L = self.ctx
        if band == 'edge' or v is None:
            return np.zeros(np.shape(x), bool), np.zeros(np.shape(x), int)
        r = np.random.RandomState(950 + v + (0 if band == 'mid' else 50))
        on = np.zeros(np.shape(x), bool); kind = np.zeros(np.shape(x), int)
        z0, z1 = BANDS[band][0], BANDS[band][1]
        for k in range(3):
            fx0 = r.uniform(1.0, 5.0); fx1 = r.uniform(10.0, 15.0)
            fz0 = r.uniform(z0 + 1, z1 - 12); fz1 = fz0 + r.uniform(5, 10)
            m = (x > fx0) & (x < fx1) & (z > fz0) & (z < fz1)
            on |= m; kind = np.where(m, k % 2, kind)
        return on, kind

    def mat(self, x, z, y, info):
        rr, ii = m_prairie(x, z, dry=0.0)
        face = info['face'] | (info['slope'] > 0.9)
        st = (np.abs(z - 4.6) < 1.3) & (face | (y < -0.3))
        ston = cellnoise(np.floor(x * 2.5) + np.floor(y * 4) * 0.5, z, 0.4, 133)
        rr = np.where(st, R('rock'), rr); ii = np.where(st, np.where(ston < 0.3, 1, np.where(ston < 0.8, 2, 3)), ii)
        lane = (np.abs(z - 7.4) < 0.45) & (cellnoise(x, z, 0.25, 134) < 0.85)
        d = m_sand(x, z)
        rr = np.where(lane & ~st, R('dirt'), rr); ii = np.where(lane & ~st, np.clip(d[1], 0, 2), ii)
        on, kind = self.fields(x, z)
        fr, fi = T(C.field, x, z, 0)
        fr2, fi2 = T(C.field, x, z, 1)
        rr = np.where(on, np.where(kind == 0, fr, fr2), rr); ii = np.where(on, np.where(kind == 0, fi, fi2), ii)
        return rr, ii

    def things(self, sc, band, v, f):
        if band == 'edge':
            sc.add(lambda: P.good_fence(6.0), 4.0, 8.6, 0.1, force=True)
            sc.add(lambda: P.drystone_wall(6.0, v), 4.0, 2.7, 0.1, force=True)
            if v % 4 == 1:
                sc.add(lambda: P.footbridge(3.6), 4.0, 4.6, 0.1, force=True)
            sc.many(8, lambda r: mk_rushes(7, 0.4, 0.7, r.rand() < 0.5)(r), 5.7, 7.0, 0.4)
            sc.many(4, mk_tuft('grass', 0.5), 0.9, 2.1, 0.3)
            sc.many(3, mk_tuft('grass', 0.5), 7.9, 9.6, 0.3)
            if v % 2 == 0:
                sc.many(1, lambda r: (lambda s=v: P.scrub(s, 0.9, 'leaf', 'red')), 9.0, 9.6, 0.9)
        else:
            on, _ = self.fields(np.array([0.0]), np.array([0.0]))
            infield = lambda x, z: bool(self.fields(np.array([x]), np.array([z]))[0][0])
            if v % 2 == 0 and band == 'mid':
                for i in range(4):
                    for j in range(3):
                        x = 2.4 + i * 3.4 + (j % 2) * 1.2; z = 13.0 + j * 3.0
                        sc.add(lambda s=i * 7 + j: P.orchard_tree(s, 0.9), x, z, 1.0)
            else:
                sc.many(2, lambda r: (lambda: C.haystack()), sc.z0, sc.z1, 1.6, test=lambda x, z: not infield(x, z))
            sc.many(5, mk_scrub(1.0, 'leaf'), sc.z0, sc.z1, 1.0, test=lambda x, z: not infield(x, z))
            sc.many(2, lambda r: (lambda: C.oak(r.randint(2))), sc.z0 + 3, sc.z1 - 3, 2.4, test=lambda x, z: not infield(x, z))
            sc.many(8, mk_tuft('grass', 0.6), sc.z0, sc.z1, 0.3, test=lambda x, z: not infield(x, z))


REGIONS = [Prairie(), Creek(), Hills(), Woods(), Rocks(), River(), Canyon(), Pass(), Valley()]
BY_KEY = {r.key: r for r in REGIONS}


# ------------------------------------------------------------------------------------------------ blending
class Blend:
    """From region A to region B over a 16u piece (w = 0 at x 0, 1 at x 16): heights and water levels mixed, the
    materials and the things dithered by w."""

    STEPS = {('river', 'canyon'): (3.5, 8.0, 12.5)}      # falls: the water drops over ledges, not down a ramp

    def __init__(self, A, B, L=16.0):
        self.A, self.B, self.L = A, B, L
        self.key = f'{A.key}_to_{B.key}'
        self.steps = self.STEPS.get((A.key, B.key))

    def w(self, x):
        return smooth((np.asarray(x) - 1.0) / (self.L - 2.0))

    def wg(self, x, z):
        """The weight for the heights: in steps (falls), or the smooth weight with an uneven front."""
        if self.steps:
            return sum(smooth((np.asarray(x) - xk) / 0.35) for xk in self.steps) / len(self.steps)
        w = self.w(x)
        return np.clip(w + 1.6 * w * (1 - w) * (vnoise(x, z, 2.0, 141) - 0.5), 0, 1)

    def rough(self, x, z):
        if not self.steps:
            return np.zeros(np.shape(x))
        out = np.zeros(np.shape(x))
        for xk in self.steps:        # the plunge pools below each fall
            d = np.asarray(x) - xk
            out = np.maximum(out, np.clip(1 - d / 1.6, 0, 1) * (d > 0) * 0.9)
        return out

    def field(self, band, v, L):
        fa = self.A.field(band, None, L); fb = self.B.field(band, None, L)
        def g(x, z):
            w = self.wg(x, z)
            return fa.ground(x, z) * (1 - w) + fb.ground(x, z) * w
        def wl(x, z):
            w = self.wg(x, z)
            a = fa.water(x, z); b = fb.water(x, z)
            a = np.where(a <= NONE + 1, fa.ground(x, z) - 0.6, a)
            b = np.where(b <= NONE + 1, fb.ground(x, z) - 0.6, b)
            return a * (1 - w) + b * w
        return Field(g, wl)

    def material(self, x, z, y, info):
        w = self.w(x)
        ia = dict(info); ib = dict(info)
        ra, xa = self.A.material(x, z, y, ia)
        rb, xb = self.B.material(x, z, y, ib)
        if self.steps and np.any(info['water']):
            ww = info['water'] & ~info['face']
            fr, fi = m_water(x, z, y, dict(info), self.B.water_ramp, self.B.flow, self.rough, 1.0)
            rb = np.where(ww, fr, rb); xb = np.where(ww, fi, xb)
            ra = np.where(ww, fr, ra); xa = np.where(ww, fi, xa)
        pick = cellnoise(x, z, 0.25, 140) < w
        info['shade'] = np.where(pick, ib.get('shade', 1), ia.get('shade', 1))
        return np.where(pick, rb, ra), np.where(pick, xb, xa)


def edge_keep(x, z):
    """The ragged start at the corridor's edge: the first 0.6u dithered, so the piece frays into the tiles."""
    return z >= 0.6 * cellnoise(x, z, 0.25, 77)


def far_keep(x, z):
    return z < BEYOND_D - 0.8 * cellnoise(x, z, 0.25, 78)
