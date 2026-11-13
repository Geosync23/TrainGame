# D32 wild country (Artist 2): the far side of the nine regions, rank by rank. Each rank of each region is a Spec:
# its band's depth, a heightfield, a ground and rock texture, and the things that stand on it (trees, rocks,
# fences, a barn). wild_kit draws a module from one Spec (a plain module) or from two (a transition piece: the
# heights blend, the textures dither, and each cell's thing comes from one region or the other in proportion).
#
# Ranks: 1 the wall at the corridor's edge (anchor on its front line), 2 behind it (anchor 14u further north),
# 3 behind that (anchor 30u north; repeat every 20u further north until the screen's top is passed). Units: u.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import pal_wild  # noqa: F401
import engine as E
from engine import R
import wild_kit as K
import wild_ground as WG

DEPTH = {1: 14.0, 2: 16.0, 3: 20.0}
OFFSET = {1: 0.0, 2: 14.0, 3: 30.0}     # anchor north of the wall's front line
REPEAT3 = 20.0
HAZE = {1: 0.0, 2: 0.11, 3: 0.22}
LOD = {1: 1.0, 2: 0.8, 3: 0.55}


class Spec:
    def __init__(self, region, rank, ymax, hf, tex, things):
        self.region, self.rank, self.ymax = region, rank, ymax
        self.hf, self.tex, self.things = hf, tex, things
        self.depth = DEPTH[rank]


# ------------------------------------------------------------------------------------------------ texture helpers
def ground_tex(region, shade_floor=0):
    """The region's own ground (the tile texture, continuous) shaded by the slope's light."""
    fn = WG.TEX[region]
    def t(ctx, u, z, y, gx, gz, idx):
        ur = ctx.urel(u)
        s = (ctx.vn(u, z, 4.0, 3.0, 77) * 3.99).astype(int)
        X = (ur + z) * 4.0; Y = z * 4.0
        rr = np.zeros(u.shape, int); ii = np.zeros(u.shape, int)
        for v in range(4):
            r_, i_ = fn(X, Y, v)
            m = s == v
            rr = np.where(m, r_, rr); ii = np.where(m, i_, ii)
        ii = np.clip(ii + (idx - 1) + shade_floor, 0, 4)
        return rr, ii
    return t


def rock_tex(ramp='rock', band=1.1, streak=0, seed=0):
    """A rock face: strata (bands every `band` u, a little wavy), joints, a few lit edges; streak: dark desert
    varnish streaks running down."""
    def t(ctx, u, z, y, gx, gz, idx):
        ur = ctx.urel(u)
        wav = ctx.vn(u, z, 2.0, 2.0, 91 + seed) * 0.6
        b = np.mod(y / band + wav, 1.0)
        ii = np.where(b < 0.18, idx + 1, np.where(b > 0.86, idx - 1, idx))
        h = ctx.pxhash(u, z, y, 93 + seed, 0.25)
        jx = ctx.pxhash(u, z, 0 * y, 95 + seed, 0.5)
        joint = (jx < 6) & (b > 0.2)
        ii = np.where(joint, idx + 1, ii)
        ii = np.where(h < 5, ii + 1, np.where(h > 96, ii - 1, ii))
        rr = np.full(u.shape, R(ramp))
        if streak:
            sx = ctx.pxhash(u, z, 0 * y, 97 + seed, 0.25)
            st = (sx < streak) & (np.mod(y, 7.0) < 5.0)
            ii = np.where(st, ii + 1, ii)
        return rr, np.clip(ii, 0, 4)
    return t


def granite_tex(ramp='granite', seed=0):
    """A granite face: no bedding, but long vertical joints and gullies (darker), sheeting ledges here and there
    (a lit top, a dark underside), lichen specks."""
    def t(ctx, u, z, y, gx, gz, idx):
        ii = idx.copy()
        jn = ctx.vn(u, z + 0.25 * y, 1.0, 1.0, 131 + seed)
        joint = np.abs(jn - 0.5) < 0.035
        ii = np.where(joint, idx + 1, ii)
        sh = np.mod(y / 5.5 + ctx.vn(u, z, 4.0, 3.0, 133 + seed) * 1.6, 1.0)
        place = ctx.vn(u, z, 2.0, 2.0, 135 + seed) > 0.55
        ii = np.where(place & (sh < 0.06), idx - 1, np.where(place & (sh < 0.14), idx + 1, ii))
        h = ctx.pxhash(u, z, y, 137 + seed, 0.25)
        ii = np.where(h < 4, ii + 1, np.where(h > 97, ii - 1, ii))
        return np.full(u.shape, R(ramp)), np.clip(ii, 0, 4)
    return t


def slope_mix(flat, steep, lo=1.0, hi=1.8, cap=None):
    """Flat ground on gentle slopes, rock on steep ones (a little dither between); cap(y, ...) an optional third
    texture (snow) on gentle slopes above a height."""
    def t(ctx, u, z, y, gx, gz, idx):
        g = np.sqrt(gx * gx + gz * gz)
        d = ctx.pxhash(u, z, y, 61, 0.25) / 100.0
        m = g > lo + (hi - lo) * d
        r1, i1 = flat(ctx, u, z, y, gx, gz, idx)
        r2, i2 = steep(ctx, u, z, y, gx, gz, idx)
        rr = np.where(m, r2, r1); ii = np.where(m, i2, i1)
        if cap is not None:
            rr, ii = cap(ctx, u, z, y, g, idx, rr, ii)
        return rr, ii
    return t


def snow_cap(base, gmax=2.2):
    def c(ctx, u, z, y, g, idx, rr, ii):
        lvl = base + (ctx.vn(u, z, 2.0, 1.5, 123) - 0.5) * 5.0
        m = (y > lvl) & (g < gmax + (y - lvl) * 0.12)
        sn_i = np.clip(idx - 1 + (g > 1.2), 0, 4)
        return np.where(m, R('snow'), rr), np.where(m, sn_i, ii)
    return c


def under_canopy(tex, k=1):
    """Darken a ground texture (the floor under a dense canopy)."""
    def t(ctx, u, z, y, gx, gz, idx):
        rr, ii = tex(ctx, u, z, y, gx, gz, idx)
        return rr, np.clip(ii + k, 0, 4)
    return t


# ------------------------------------------------------------------------------------------------ height helpers
def rise(z, z0, z1):
    """0 in front of z0, 1 behind z1 (z0 > z1), smooth between."""
    return K.smooth((z0 - z) / np.maximum(z0 - z1, 1e-6))


def terrace(h, step, sharp=0.75):
    """Ledges: heights pulled towards whole steps, the risers steep."""
    q = h / step
    f = np.floor(q)
    r = q - f
    a = sharp
    rr = np.where(r < a, 0.18 * r / a, 0.18 + 0.82 * K.smooth((r - a) / (1 - a)))
    return (f + rr) * step


def ridge(n):
    return 1.0 - np.abs(2.0 * n - 1.0)


# ------------------------------------------------------------------------------------------------ things helpers
def ground_y(ctx, hf, u, z):
    return float(hf(np.array([u]), np.array([z]))[0])


def trees(ctx, side, hf, cell, cz, z0, z1, salt, prob, make, mask=None, rad=1.0, jit=0.8, zp=1.0):
    """Scatter: for every chosen cell call make(x, z, y, rnd). rad: the thing's half width (u, on the screen's
    columns): a thing from the variant's own cells must stay inside the strip (0 .. W), or the edge would cut it.
    zp: the share of the join zone's cells that keep their thing. Whatever stands in the join zone is the same at
    every seam of the rank, so big things there are thinned (zp < 1) where they are few enough to be recognised."""
    for (u, z, r, zone) in ctx.cells(cell, cz, z0, z1, salt, prob, side, jit):
        if not zone and (u - rad < 0 or u + rad > ctx.W):
            continue
        if zone and r(8) >= zp:
            continue
        if any(abs(u - bu) < bw and bz0 >= z >= bz1 for (bu, bw, bz0, bz1) in getattr(ctx, 'clear', ())):
            continue
        if mask is not None and not mask(u, z, r):
            continue
        y = ground_y(ctx, hf, u, z)
        make(u + z, z, y, r)


def seed_of(r, k=7):
    return int(r(k) * 1e6)


# ================================================================================================ the regions
SPECS = {}
SQ = 0.354          # MU across a thing -> u of screen columns (a sphere of radius R MU spans R * 1.414 / 4 u each side)


def spec(region, rank, ymax):
    def deco(f):
        hf, tex, things = f()
        SPECS[(region, rank)] = Spec(region, rank, ymax, hf, tex, things)
        return f
    return deco


def rad_broad(h, spread=1.0):
    Rh, Rv = K.crown_size(h, spread)
    return (Rh + K.clump_r(Rh) * 0.6) * SQ * 1.05 + 0.25


def rad_pine(h, slim=1.0):
    s = h / 6.2
    return ((3.6 * min(s, 1.25) + 0.6) * slim + 2.7) * SQ + 0.2


def rad_spruce(h):
    return ((2.6 - 0.0) * h / 6.0 + 0.4) * SQ + 0.2


def ctx_grove(ctx, u, z, th, salt=401):
    return ctx.vn(np.array([u]), np.array([z]), 8.0, 5.0, salt)[0] > th


def broadleaf(x, z, y, h, seed, ramp='leaf', dark='pine', trunk='bark', lod=1.0, spread=1.0, shade=0.0):
    return K.broadleaf(x, z, y, h, seed, ramp=ramp, dark=dark, trunk=trunk, lod=lod, spread=spread, shade=shade)


def gentle_at(ctx, hf, lim=0.9):
    def m(u, z, r):
        e = 0.3
        a = ground_y(ctx, hf, u + e, z); b = ground_y(ctx, hf, u - e, z)
        c = ground_y(ctx, hf, u - e, z + e); d = ground_y(ctx, hf, u + e, z - e)
        return abs(a - b) / (2 * e) < lim and abs(c - d) / (2 * e) < lim * 1.3
    return m


# ---------------------------------------------------------------- 1 home prairie: rolling grass rising, scattered oaks
def _prairie(rank):
    H = {1: 3.4, 2: 4.6, 3: 5.2}[rank]
    def hf(ctx, u, z):
        b = H * rise(z, -1.0, -11.0 - rank)
        sw = (ctx.vn(u, z, 4.0, 4.0, 11 + rank) - 0.5) * 3.2 * rise(z, -1.5, -6.0)
        sw2 = (ctx.vn(u, z, 8.0, 6.0, 13 + rank) - 0.5) * 2.0 * rise(z, -1.0, -5.0)
        return np.maximum(b + sw + sw2, 0.0)
    tex = ground_tex('prairie')
    lod = LOD[rank]
    def things(ctx, side, hf):
        def oak(x, z, y, r):
            broadleaf(x, z, y, (4.4 + 1.4 * r(3)) * (1.0 if rank == 1 else 0.9), seed_of(r), lod=lod,
                      shade=0.25 * r(5))
        def brush(x, z, y, r):
            ramp = ('sage', 'leaf', 'sage', 'pine')[int(r(4) * 4)]
            K.shrub(x, z, y, 0.5 + 0.5 * r(3), seed_of(r), ramp=ramp, berries='red' if r(5) < 0.2 else None)
        def stone(x, z, y, r):
            K.rock(x, z, y, 0.3 + 0.35 * r(3), seed_of(r))
        def tuft(x, z, y, r):
            K.grass_tuft(x, z, y, seed_of(r), ramp='straw' if r(4) < 0.5 else 'grass', h=0.7)
        grove = lambda u, z, r: ctx_grove(ctx, u, z, 0.5)
        RO = rad_broad(5.8)
        D = DEPTH[rank] + 1
        if rank == 1:
            trees(ctx, side, hf, 1.0, 1.0, -0.2, -3.0, 20, 0.35, tuft, rad=0.4)
            trees(ctx, side, hf, 2.0, 1.4, -0.4, -4.0, 21, 0.22, brush, rad=1.0)
            trees(ctx, side, hf, 4.0, 2.4, -2.5, -D, 22, 0.75, oak, grove, rad=RO, zp=0.3)
            trees(ctx, side, hf, 2.0, 2.0, -1.0, -D, 23, 0.08, brush, rad=1.0)
            trees(ctx, side, hf, 4.0, 2.0, -0.5, -D, 24, 0.04, stone, rad=0.7)
        else:
            trees(ctx, side, hf, 4.0, 2.2, -2.0, -D, 30 + rank, 0.8, oak, grove, rad=RO, zp=0.3)
            trees(ctx, side, hf, 2.0, 1.5, -1.0, -D, 32 + rank, 0.08, brush, rad=1.0)
    return hf, tex, things


for _r in (1, 2, 3):
    spec('prairie', _r, {1: 14, 2: 16, 3: 16}[_r])(lambda _r=_r: _prairie(_r))


# ---------------------------------------------------------------- 2 creek bottoms: cottonwood and willow thicket
def _creek(rank):
    H = {1: 1.4, 2: 3.0, 3: 7.0}[rank]
    def hf(ctx, u, z):
        b = H * rise(z, -1.0, -12.0)
        if rank == 3:     # a low wooded bluff behind the bottoms, its shoulders rounded
            b = b + 2.5 * ctx.vn(u, z, 8.0, 4.0, 41) * rise(z, -4, -12)
        return b + (ctx.vn(u, z, 4.0, 3.0, 42 + rank) - 0.5) * 0.8 * rise(z, -1.0, -3.0)
    tex = ground_tex('creek') if rank < 3 else slope_mix(ground_tex('creek'), rock_tex('rock', 0.9), 1.6, 2.4)
    lod = LOD[rank]
    def things(ctx, side, hf):
        def willow(x, z, y, r):
            broadleaf(x, z, y, 3.6 + 1.0 * r(3), seed_of(r), ramp='leaf', dark='sage', trunk='bark', lod=lod,
                      spread=0.95, shade=0.35)
        def cotton(x, z, y, r):
            broadleaf(x, z, y, 7.0 + 1.6 * r(3), seed_of(r), ramp='leaf', dark='pine', trunk='rock', lod=lod,
                      spread=0.9, shade=0.3 + 0.4 * r(5))
        def bush(x, z, y, r):
            K.shrub(x, z, y, 0.7 + 0.5 * r(3), seed_of(r), ramp=('leaf', 'sage', 'pine')[int(r(4) * 3)],
                    berries='plum' if r(5) < 0.25 else None)
        def reeds(x, z, y, r):
            K.grass_tuft(x, z, y, seed_of(r), ramp='leaf', h=1.1)
        D = DEPTH[rank] + 1
        RC, RW = rad_broad(8.6, 0.9), rad_broad(4.6, 0.85)
        if rank == 1:
            trees(ctx, side, hf, 1.0, 1.0, -0.3, -2.0, 51, 0.4, reeds, rad=0.4)
            trees(ctx, side, hf, 2.0, 1.0, -0.5, -3.5, 52, 0.6, bush, rad=1.2)
            trees(ctx, side, hf, 2.0, 1.6, -1.6, -7.5, 53, 0.75, willow, rad=RW)
            trees(ctx, side, hf, 4.0, 3.0, -4.5, -D, 54, 0.9, cotton, rad=RC)
            trees(ctx, side, hf, 2.0, 2.0, -6.0, -D, 55, 0.5, willow, rad=RW)
        elif rank == 2:
            trees(ctx, side, hf, 4.0, 2.4, -2.0, -D, 56, 0.9, cotton, rad=RC)
            trees(ctx, side, hf, 2.0, 2.0, -2.0, -D, 57, 0.5, willow, rad=RW)
        else:
            trees(ctx, side, hf, 4.0, 2.5, -2.0, -D, 58, 0.8, cotton, lambda u, z, r: ctx_grove(ctx, u, z, 0.25),
                  rad=RC)
            trees(ctx, side, hf, 2.0, 2.0, -2.0, -D, 60, 0.45, willow, rad=RW)
            trees(ctx, side, hf, 2.0, 2.0, -2.0, -D, 59, 0.3, bush, rad=1.2)
    return hf, tex, things


for _r in (1, 2, 3):
    spec('creek', _r, {1: 16, 2: 16, 3: 18}[_r])(lambda _r=_r: _creek(_r))


# ---------------------------------------------------------------- 3 the hills: grassy bluffs with rock ledges
def _hills(rank):
    H = {1: 7.0, 2: 10.0, 3: 12.0}[rank]
    def hf(ctx, u, z):
        n1 = ctx.vn(u, z, 8.0, 6.0, 61 + rank)
        n2 = ctx.vn(u, z, 4.0, 3.0, 63 + rank)
        zc = -1.5 - 5.0 * n1                          # each bluff's foot wanders in and out
        bluff = H * (0.55 + 0.6 * n2) * rise(z, zc, zc - 4.5 - 3.0 * n2)
        bluff = bluff + (ctx.vn(u, z, 4.0, 4.0, 66 + rank) - 0.5) * 1.4 * rise(z, -1.5, -4.0)
        mask = K.smooth((ctx.vn(u, z, 4.0, 2.0, 67 + rank) - 0.6) / 0.12)     # rock ledges only here and there
        h = bluff * (1 - mask) + terrace(bluff, 2.0, 0.8) * mask
        return h + (ctx.vn(u, z, 2.0, 1.5, 65) - 0.5) * 0.3
    tex = slope_mix(ground_tex('hills'), rock_tex('rock', 0.7, seed=3), 1.15, 1.9)
    lod = LOD[rank]
    def things(ctx, side, hf):
        def juniper(x, z, y, r):
            K.spruce(x, z, y, 2.2 + 1.4 * r(3), seed_of(r), ramp='pine', lod=lod)
        def oak(x, z, y, r):
            broadleaf(x, z, y, 3.6 + 1.0 * r(3), seed_of(r), lod=lod, shade=0.2)
        def boulder(x, z, y, r):
            K.rock(x, z, y, 0.5 + 0.6 * r(3), seed_of(r))
        def tuft(x, z, y, r):
            K.shrub(x, z, y, 0.45 + 0.4 * r(3), seed_of(r), ramp='sage')
        gentle = gentle_at(ctx, hf)
        D = DEPTH[rank] + 1
        if rank == 1:
            trees(ctx, side, hf, 2.0, 1.5, -0.3, -2.5, 71, 0.22, boulder, rad=1.2)
            trees(ctx, side, hf, 2.0, 1.5, -0.3, -3.0, 72, 0.3, tuft, rad=0.9)
        trees(ctx, side, hf, 2.0, 1.8, -1.5, -D, 73 + rank, 0.4, juniper, gentle, rad=rad_spruce(3.6))
        trees(ctx, side, hf, 4.0, 3.0, -1.5, -D, 80 + rank, 0.25, oak,
              lambda u, z, r: gentle(u, z, r) and ctx_grove(ctx, u, z, 0.55, 402), rad=rad_broad(4.6), zp=0.4)
        trees(ctx, side, hf, 2.0, 1.5, -1.5, -D, 76 + rank, 0.25, tuft, gentle, rad=0.9)
    return hf, tex, things


for _r in (1, 2, 3):
    spec('hills', _r, {1: 12, 2: 16, 3: 18}[_r])(lambda _r=_r: _hills(_r))


# ---------------------------------------------------------------- 4 the big woods: a dense wall of tall pines
def _woods(rank):
    H = {1: 2.5, 2: 6.0, 3: 9.0}[rank]
    def hf(ctx, u, z):
        b = H * rise(z, -1.0, -13.0)
        return b + (ctx.vn(u, z, 4.0, 3.0, 81 + rank) - 0.5) * 1.2 * rise(z, -1.0, -4.0)
    tex = under_canopy(ground_tex('woods'), 0) if rank == 1 else under_canopy(ground_tex('woods'), 1)
    lod = LOD[rank]
    def things(ctx, side, hf):
        def big(x, z, y, r):
            K.pine(x, z, y, 8.5 + 3.5 * r(3), seed_of(r), lod=lod, slim=0.9, dark=min(1.0, -z / 9.0))
        def young(x, z, y, r):
            K.pine(x, z, y, 3.6 + 1.6 * r(3), seed_of(r), lod=lod)
        def fir(x, z, y, r):
            K.spruce(x, z, y, 7.0 + 3.0 * r(3), seed_of(r), ramp='pine', lod=lod, dark=min(1.0, -z / 9.0))
        def fern(x, z, y, r):
            K.shrub(x, z, y, 0.55 + 0.3 * r(3), seed_of(r), ramp=('needle', 'needle', 'pine')[int(r(4) * 3)], n=6)
        D = DEPTH[rank] + 1
        RB = rad_pine(12, 0.9)
        if rank == 1:
            trees(ctx, side, hf, 1.0, 1.0, 0.2, -2.0, 91, 0.45, fern, rad=0.8)
            trees(ctx, side, hf, 2.0, 1.4, -0.6, -2.6, 92, 0.45, young, rad=rad_pine(5.2))
            trees(ctx, side, hf, 1.0, 1.5, -1.6, -D, 93, 0.6, big, rad=RB)
            trees(ctx, side, hf, 4.0, 3.0, -2.0, -D, 94, 0.35, fir, rad=rad_spruce(10))
            trees(ctx, side, hf, 2.0, 1.5, -1.0, -6.0, 95, 0.3, fern, rad=0.8)
        else:
            trees(ctx, side, hf, 1.0, 1.5, -1.5, -D, 96 + rank, 0.62, big, rad=RB)
            trees(ctx, side, hf, 4.0, 3.0, -1.5, -D, 98 + rank, 0.3, fir, rad=rad_spruce(10))
    return hf, tex, things


for _r in (1, 2, 3):
    spec('woods', _r, {1: 18, 2: 22, 3: 24}[_r])(lambda _r=_r: _woods(_r))


# ---------------------------------------------------------------- 5 the rocks: broken cliffs and talus, standing stones
def _rocks(rank):
    H = {1: 10.0, 2: 15.0, 3: 19.0}[rank]
    def hf(ctx, u, z):
        talus = 1.8 * rise(z, -0.5, -3.5) + (ctx.vn(u, z, 2.0, 1.5, 101) - 0.5) * 0.5
        n = ctx.vn(u, z, 2.0, 1.5, 102 + rank)
        blk = np.floor(n * 3.0) / 3.0                # jointed blocks
        sm = ctx.vn(u, z, 4.0, 3.0, 105 + rank)
        crag = H * rise(z, -2.5 - 1.5 * ctx.vn(u, z, 4.0, 3.0, 104), -7.0 - 2 * sm) * (0.35 + 0.4 * blk + 0.45 * sm)
        crag = crag + (ctx.vn(u, z, 2.0, 1.0, 107) - 0.5) * 1.5 * rise(z, -3.0, -6.0)
        crag = 0.7 * crag + 0.3 * terrace(crag, 3.6, 0.85)
        return np.maximum(talus * rise(z, 0.2, -1.0), crag)
    tex = slope_mix(ground_tex('rocks'), rock_tex('rock', 1.4, seed=5), 1.0, 1.7)
    lod = LOD[rank]
    def things(ctx, side, hf):
        def boulder(x, z, y, r):
            K.rock(x, z, y, 0.4 + 0.8 * r(3), seed_of(r))
        def stone(x, z, y, r):
            K.standing_stone(x, z, y, 0.9 + 0.5 * r(3), 3.0 + 3.0 * r(4), seed_of(r))
        def pine(x, z, y, r):
            K.pine(x, z, y, 3.4 + 2.2 * r(3), seed_of(r), lod=lod)
        def juniper(x, z, y, r):
            K.spruce(x, z, y, 2.0 + 1.0 * r(3), seed_of(r), ramp='pine', lod=lod)
        flat = gentle_at(ctx, hf, 0.8)
        D = DEPTH[rank] + 1
        if rank == 1:
            trees(ctx, side, hf, 1.0, 1.0, 0.0, -3.5, 111, 0.4, boulder, rad=1.4)
            trees(ctx, side, hf, 4.0, 2.0, -0.8, -3.0, 112, 0.35, stone, rad=1.0)
        trees(ctx, side, hf, 2.0, 2.0, -3.0, -D, 113 + rank, 0.3, pine, flat, rad=rad_pine(5.6))
        trees(ctx, side, hf, 2.0, 2.0, -2.0, -D, 116 + rank, 0.3, juniper, flat, rad=rad_spruce(3))
    return hf, tex, things


for _r in (1, 2, 3):
    spec('rocks', _r, {1: 14, 2: 20, 3: 24}[_r])(lambda _r=_r: _rocks(_r))


# ---------------------------------------------------------------- 6 the river run: wooded bluffs
def _river(rank):
    H = {1: 9.0, 2: 14.0, 3: 17.0}[rank]
    def hf(ctx, u, z):
        n = ctx.vn(u, z, 4.0, 3.0, 121 + rank)
        b = H * rise(z, -1.5 - n, -10.0) * (0.8 + 0.35 * ctx.vn(u, z, 8.0, 6.0, 123))
        wob = (ctx.vn(u, z, 2.0, 1.5, 124) - 0.5) * 2.4
        ledge = terrace(b + wob, 3.0, 0.82) - wob
        m = K.smooth((ctx.vn(u, z, 4.0, 3.0, 125) - 0.4) / 0.2)       # rock ledges only in places
        return b + 0.4 * m * (ledge - b) + 0.6 * rise(z, 0.0, -1.5)
    tex = slope_mix(under_canopy(ground_tex('river'), 1), rock_tex('rock', 0.9, seed=7), 1.6, 2.4)
    lod = LOD[rank]
    def things(ctx, side, hf):
        def pine(x, z, y, r):
            K.pine(x, z, y, 6.0 + 3.0 * r(3), seed_of(r), lod=lod, dark=min(1.0, -z / 12.0))
        def cotton(x, z, y, r):
            broadleaf(x, z, y, 6.4 + 1.6 * r(3), seed_of(r), ramp='leaf', trunk='rock', lod=lod, shade=0.3)
        def oak(x, z, y, r):
            broadleaf(x, z, y, 4.2 + 1.2 * r(3), seed_of(r), ramp='leaf', lod=lod, shade=0.4)
        def bush(x, z, y, r):
            K.shrub(x, z, y, 0.6 + 0.5 * r(3), seed_of(r), ramp=('leaf', 'pine', 'sage')[int(r(4) * 3)])
        D = DEPTH[rank] + 1
        if rank == 1:
            trees(ctx, side, hf, 2.0, 1.0, 0.0, -2.0, 131, 0.5, bush, rad=1.2)
            trees(ctx, side, hf, 4.0, 2.5, -1.0, -3.5, 132, 0.6, cotton, rad=rad_broad(8.0))
        trees(ctx, side, hf, 2.0, 1.5, -3.0, -D, 133 + rank, 0.7, pine, rad=rad_pine(9))
        trees(ctx, side, hf, 4.0, 3.0, -2.5, -D, 136 + rank, 0.35, oak, rad=rad_broad(5.4))
        trees(ctx, side, hf, 2.0, 1.5, -2.0, -D, 139 + rank, 0.25, bush, rad=1.2)
    return hf, tex, things


for _r in (1, 2, 3):
    spec('river', _r, {1: 22, 2: 26, 3: 28}[_r])(lambda _r=_r: _river(_r))


# ---------------------------------------------------------------- 7 the canyon: a high red wall, ledges, clinging pines
def _canyon(rank):
    H = {1: 24.0, 2: 34.0, 3: 40.0}[rank]
    def hf(ctx, u, z):
        n = ctx.vn(u, z, 4.0, 2.0, 141 + rank)
        n2 = ctx.vn(u, z, 2.0, 1.5, 143 + rank)
        talus = 2.2 * rise(z, 0.0, -3.0) + (n2 - 0.5) * 0.6
        zf = -2.0 - 2.5 * n
        wall = H * rise(z, zf, zf - 5.0 - rank) * (0.85 + 0.25 * n2)
        wall = terrace(wall, 5.0 if rank == 1 else 6.5, 0.86)
        return np.maximum(talus * rise(z, 0.3, -0.8), wall)
    tex = slope_mix(ground_tex('canyon'), rock_tex('redrock', 1.3, streak=9, seed=9), 0.9, 1.6)
    lod = LOD[rank]
    def things(ctx, side, hf):
        def pine(x, z, y, r):
            K.pine(x, z, y, 2.6 + 2.0 * r(3), seed_of(r), lod=lod)
        def juniper(x, z, y, r):
            K.spruce(x, z, y, 1.6 + 1.0 * r(3), seed_of(r), ramp='pine', lod=lod)
        def boulder(x, z, y, r):
            K.rock(x, z, y, 0.4 + 0.7 * r(3), seed_of(r), ramp='redrock')
        def brush(x, z, y, r):
            K.shrub(x, z, y, 0.45 + 0.35 * r(3), seed_of(r), ramp='sage')
        ledge = gentle_at(ctx, hf, 0.6)
        D = DEPTH[rank] + 1
        if rank == 1:
            trees(ctx, side, hf, 1.0, 1.0, 0.0, -3.0, 151, 0.4, boulder, rad=1.2)
            trees(ctx, side, hf, 2.0, 1.5, 0.0, -2.5, 152, 0.3, brush, rad=0.9)
        trees(ctx, side, hf, 1.0, 0.8, -2.0, -D, 153 + rank, 0.25, pine, ledge, rad=rad_pine(4.6))
        trees(ctx, side, hf, 1.0, 0.8, -2.0, -D, 156 + rank, 0.25, juniper, ledge, rad=rad_spruce(2.6))
    return hf, tex, things


for _r in (1, 2, 3):
    spec('canyon', _r, {1: 32, 2: 44, 3: 50}[_r])(lambda _r=_r: _canyon(_r))


# ---------------------------------------------------------------- 8 the pass: mountain faces, scree, snow high up
def _pass(rank):
    H = {1: 20.0, 2: 32.0, 3: 42.0}[rank]
    def hf(ctx, u, z):
        n = ctx.vn(u, z, 4.0, 3.0, 161 + rank)
        scree = 3.5 * rise(z, 0.0, -5.0) + (ctx.vn(u, z, 2.0, 1.5, 162) - 0.5) * 0.4
        g = ridge(ctx.vn(u, z, 2.0, 4.0, 163 + rank))          # gullies and spurs
        g2 = ctx.vn(u, z, 8.0, 6.0, 164 + rank)
        face = H * rise(z, -3.0 - 2.0 * n, -12.0) * (0.45 + 0.45 * g + 0.3 * g2)
        face = face + (ctx.vn(u, z, 1.0, 1.0, 165 + rank) - 0.5) * 1.6 * rise(z, -2.0, -5.0)
        face = 0.85 * face + 0.15 * terrace(face, 3.0, 0.7)
        return np.maximum(scree * rise(z, 0.3, -0.8), face)
    snow = snow_cap({1: 13.0, 2: 13.0, 3: 12.0}[rank], gmax={1: 1.5, 2: 2.0, 3: 2.6}[rank])
    tex = slope_mix(ground_tex('pass'), granite_tex(seed=11), 1.2, 2.0, cap=snow)
    lod = LOD[rank]
    def things(ctx, side, hf):
        def spruce(x, z, y, r):
            K.spruce(x, z, y, 3.0 + 2.5 * r(3), seed_of(r), ramp='pine', lod=lod)
        def boulder(x, z, y, r):
            K.rock(x, z, y, 0.4 + 0.8 * r(3), seed_of(r), ramp='granite')
        def low(u, z, r):
            y = ground_y(ctx, hf, u, z)
            return y < 10.0 and gentle_at(ctx, hf, 1.0)(u, z, r)
        D = DEPTH[rank] + 1
        if rank == 1:
            trees(ctx, side, hf, 1.0, 1.0, 0.0, -4.0, 171, 0.35, boulder, rad=1.4)
        trees(ctx, side, hf, 2.0, 1.5, -0.5, -D, 172 + rank, 0.5, spruce, low, rad=rad_spruce(5.5))
    return hf, tex, things


for _r in (1, 2, 3):
    spec('pass', _r, {1: 26, 2: 40, 3: 50}[_r])(lambda _r=_r: _pass(_r))


# ---------------------------------------------------------------- 9 the far valley: pasture, orchards, fences, barns
def _valley(rank):
    H = {1: 2.6, 2: 5.0, 3: 7.0}[rank]
    def hf(ctx, u, z):
        b = H * rise(z, -2.0, -12.0)
        return b + (ctx.vn(u, z, 4.0, 4.0, 181 + rank) - 0.5) * 1.6 * rise(z, -2.0, -6.0)
    base = ground_tex('valley')
    def tex(ctx, u, z, y, gx, gz, idx):
        rr, ii = base(ctx, u, z, y, gx, gz, idx)
        if rank == 1:
            return rr, ii
        # fields: rows along x in patches (ploughed, wheat, stubble, young green)
        f = ctx.vn(u, z, 8.0, 5.0, 185)
        kind = (f * 3.99).astype(int)
        field = (ctx.vn(u, z, 4.0, 3.0, 186) > 0.4) & (z < -3)
        row = np.mod(z * 2.0, 1.0) < 0.5
        frr = np.where(kind == 0, R('earth'), np.where(kind == 1, R('straw'), np.where(kind == 2, R('grass'), R('bloom'))))
        fii = np.clip(np.where(row, idx + 1, idx) + (kind == 2), 0, 4)
        return np.where(field, frr, rr), np.where(field, fii, ii)
    lod = LOD[rank]
    def things(ctx, side, hf):
        barns(ctx, side, hf, rank)
        fences(ctx, side, hf, rank)
        def fruit(x, z, y, r):
            o = K.broadleaf(x, z, y, 2.4 + 0.5 * r(3), seed_of(r), ramp='leaf', dark='pine', trunk='bark', lod=0.6,
                            spread=0.75)
            if r(5) < 0.7:
                rnd = np.random.RandomState(seed_of(r) % 99991)
                for k in range(4):
                    E.sphere((x + rnd.uniform(-0.5, 0.5)) * 4, (z + rnd.uniform(-0.5, 0.5)) * 4,
                             (y + 1.9 + rnd.uniform(0, 0.7)) * K.UY, 0.45, 'red' if r(6) < 0.6 else 'bloom', oid=o,
                             cast=False)
        def shade_tree(x, z, y, r):
            broadleaf(x, z, y, 5.0 + 1.2 * r(3), seed_of(r), lod=lod, shade=0.2)
        def stack(x, z, y, r):
            o = E.new_oid(True)
            E.cyl_z(x * 4, z * 4, y * K.UY, (y + 1.4) * K.UY, 3.6, 'straw', oid=o, th=(0.6, 0.3, -0.1))
            E.sphere(x * 4, z * 4, (y + 1.4) * K.UY, 3.6, 'straw', oid=o, th=(0.75, 0.35, -0.1), noise=0.4,
                     seed=seed_of(r) % 97, sz=0.9)
        orchard = lambda u, z, r: ctx_grove(ctx, u, z, 0.66, 187)
        open_ = lambda u, z, r: not ctx_grove(ctx, u, z, 0.6, 187)
        D = DEPTH[rank] + 1
        trees(ctx, side, hf, 2.0, 2.0, -2.5, -D, 191 + rank, 0.95, fruit, orchard, rad=rad_broad(2.9, 0.75),
              jit=0.15)
        trees(ctx, side, hf, 4.0, 4.0, -2.0, -D, 194 + rank, 0.22 if rank == 1 else 0.12, shade_tree, open_,
              rad=rad_broad(6.2), zp=0.3)
        trees(ctx, side, hf, 4.0, 3.0, -3.0, -D, 197 + rank, 0.12, stack, open_, rad=1.2)
    return hf, tex, things


def fences(ctx, side, hf, rank):
    """Split-rail fence runs along x at a few z lines: one segment per 4u cell, posts at the cells' ends."""
    lines = {1: (-1.2, -7.5), 2: (-3.0, -9.0, -14.0), 3: (-5.0, -12.0, -18.0)}[rank]
    for li, zf in enumerate(lines):
        for (u, z, r, zone) in ctx.cells(4.0, 1.0, 0.0, -1.0, 201 + li * 7 + rank, 0.8, side):
            u0 = math.floor(u / 4.0) * 4.0
            u1 = u0 + 4.0
            if any(abs((u0 + u1) / 2 - bu) < bw + 2 and bz0 >= zf >= bz1 for (bu, bw, bz0, bz1) in
                   getattr(ctx, 'clear', ())):
                continue
            ya = ground_y(ctx, hf, u0, zf); yb = ground_y(ctx, hf, u1, zf)
            xa, xb = u0 + zf, u1 + zf
            o = E.new_oid(True)
            for xp, yp in ((xa, ya), (xb, yb)):
                E.box(xp * 4 - 0.35, zf * 4 - 0.35, yp * K.UY, xp * 4 + 0.35, zf * 4 + 0.35, (yp + 1.4) * K.UY, 'bark',
                      shades=(1, 2, 3), oid=o)
            for k in range(2):
                hgt = 0.6 + k * 0.5
                n = 12
                for j in range(n):
                    f0, f1 = j / n, (j + 1) / n
                    x0, x1 = xa + (xb - xa) * f0, xa + (xb - xa) * f1
                    y0 = ya + (yb - ya) * f0 + hgt
                    E.box(x0 * 4, zf * 4 - 0.25, y0 * K.UY - 0.3, x1 * 4, zf * 4 + 0.25, y0 * K.UY + 0.3, 'bark',
                          shades=(1, 2, 3), oid=o, cast=False)


def barns(ctx, side, hf, rank):
    """A barn or a farmhouse in the middle of half the variants (ranks 1 and 2): plank walls, a gabled roof; the
    trees and fences keep clear of it."""
    ctx.clear = []
    if rank == 3 or ctx.var % 2 == 0 or side == 'b':
        return
    rnd = np.random.RandomState(ctx.var * 13 + rank)
    u = ctx.W / 2 + rnd.uniform(-1.0, 1.0)
    z = -6.0 if rank == 1 else -8.0
    x = u + z
    y = ground_y(ctx, hf, u, z)
    big = ctx.var % 4 == 1
    hx, hz, hw = (2.8, 2.0, 2.2) if big else (1.8, 1.5, 1.6)
    ctx.clear = [(u, hx + 2.5, z + hz + 2.5, z - hz - 3.0)]
    ramp = 'brick' if big else 'wood'
    o = E.new_oid(True)
    def planks(face, X, Y, Z, i):
        v = np.mod((X + Y) * 0.5, 1.0) < 0.18
        return None, np.where(v, np.minimum(i + 1, 4), i)
    X0, X1 = (x - hx) * 4, (x + hx) * 4
    Y0, Y1 = (z - hz) * 4, (z + hz) * 4
    Zb = (y - 0.4) * K.UY; Ze = (y + hw) * K.UY
    E.box(X0, Y0, Zb, X1, Y1, Ze, ramp, shades=(1, 2, 3), oid=o, tex=planks)
    E.gable_x(X0 - 0.6, X1 + 0.6, (Y0 + Y1) / 2, (Y1 - Y0) / 2 + 0.8, Ze, Ze + (2.0 if big else 1.4) * K.UY,
              'roof' if big else 'slate', wall=ramp, oid=o)
    E.box((x - 0.5) * 4, Y1, Zb + 0.1, (x + 0.5) * 4, Y1 + 0.2, Zb + 1.7 * K.UY, 'umber', shades=(2, 2, 3), oid=o,
          cast=False)


for _r in (1, 2, 3):
    spec('valley', _r, {1: 12, 2: 14, 3: 16}[_r])(lambda _r=_r: _valley(_r))


# ================================================================================================ drawing a module
JOIN = {r: 5000 + 17 * i for i, r in enumerate(WG.REGIONS)}


def front_edge(ctx, rank):
    if rank == 1:
        return lambda u: 0.35 + (ctx.vn(u, 0 * u, 2.0, 1.0, 301) - 0.5) * 1.2
    return lambda u: 0.0 * u + 0.0


def module(region, rank, var, W=16.0, to=None, t0=0.0, t1=0.0):
    """Render one module: region's rank, variant var (its interior seed); to: the next region for a transition
    piece blending from t0 (left edge) to t1 (right edge). Returns (img, anchor)."""
    A = SPECS[(region, rank)]
    Bs = SPECS[(to, rank)] if to else None
    join = JOIN[region] if not to else None
    # the join seed of an edge is the region's own (t 0 or 1) or the pair's (t 0.5)
    def jseed(t):
        if t <= 0.0:
            return JOIN[region]
        if t >= 1.0:
            return JOIN[to]
        return JOIN[region] * 3 + JOIN[to] + int(t * 100)
    if Bs is None:
        ctx = K.Ctx(W, var, JOIN[region], 0.0, 0.0, A.depth)
    else:
        ctx = K.Ctx(W, var, jseed(t0), t0, t1, A.depth)
        ctx.jseed_r = jseed(t1)
        # zone seeds differ at the two edges of a transition piece: the left zone uses jseed(t0), the right jseed(t1)
        base_key = ctx.key
        def key(i, step, ctx=ctx):
            ki, ks = base_key(i, step)
            u = np.asarray(i, np.int64) * step
            right = u >= ctx.W / 2
            ks = np.where(ks == ctx.join, np.where(right, ctx.jseed_r, ctx.join), ks)
            return ki, ks
        ctx.key = key
    depth = A.depth
    ymax = max(A.ymax, Bs.ymax if Bs else 0) + 2
    zb_noise = lambda u: -depth - 0.2 - 2.0 * ctx.vn(u, 0 * u, 2.0, 1.0, 302)
    if Bs is None:
        hf = lambda u, z: A.hf(ctx, u, z)
        tex = lambda u, z, y, gx, gz, idx: A.tex(ctx, u, z, y, gx, gz, idx)
    else:
        def hf(u, z):
            t = ctx.t(u)
            return (1 - t) * A.hf(ctx, u, z) + t * Bs.hf(ctx, u, z)
        def tex(u, z, y, gx, gz, idx):
            t = ctx.t(u)
            p = (ctx.vn(u, z, 2.0, 1.5, 311) * 0.6 + ctx.vn(u, z, 1.0, 1.0, 313) * 0.28 +
                 ctx.pxhash(u, z, y, 312, 0.25) / 100.0 * 0.12)
            ra, ia = A.tex(ctx, u, z, y, gx, gz, idx)
            rb, ib = Bs.tex(ctx, u, z, y, gx, gz, idx)
            m = p < t
            return np.where(m, rb, ra), np.where(m, ib, ia)
    zf = front_edge(ctx, rank)
    def draw():
        K.terrain(ctx, hf, tex, zf, -depth - 2.4, ymax, z_back_fn=zb_noise)
        A.things(ctx, 'a' if Bs else None, hf)
        if Bs is not None:
            Bs.things(ctx, 'b', hf)
    return K.render_module(draw, W, depth + 3, ymax + 14, HAZE[rank])
