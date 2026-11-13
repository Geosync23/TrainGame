# D32 wild country, the far side (Artist 2): the kit the far-side borders are drawn with.
#
# A far-side MODULE is one vertical strip of the screen: every world point whose u = x - z lies in [0, W) (W in game
# units; the strip is exactly 8 W px wide). Two modules placed side by side (anchors W apart along x, on the same z)
# never overlap on the screen, so any variant can stand next to any other and the join is only a matter of the
# pictures matching at the shared column. They match because the content near each edge (the JOIN ZONE, u from
# -ZA to +ZB around the edge) is drawn from the region's join seed, the same in every variant and at both edges,
# while the middle is drawn from the variant's own seed. Cast shadows are kept short (a steep shadow light) so no
# shadow crosses from a variant's middle into its neighbour.
#
# Units: game units (u). x along the line, z across (+z towards the viewer, south), y up. The module's anchor is the
# point (0, 0, 0): its front line (z 0) at its left column (u 0), at ground level.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import pal_wild  # noqa: F401
import engine as E
from engine import R, hash2
import nature as N

UX = E.U_XZ
UY = E.U_Y
ZA, ZB = 3.0, 2.0            # the join zone round each edge: u from -ZA to +ZB (relative to the edge)
SHADOW_LIGHT = np.array([-0.16, 0.045, 1.0])   # a steeper sun for the walls' cast shadows (short shadows)
HAZE_RGB = np.array([188, 204, 198], float)   # the far ranks fade towards this (a pale, faintly green grey)


def smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def hh(*k):
    """Integer hash of integer arrays (vectorised), 0..65535."""
    h = np.asarray(k[0], np.int64) * 0 + 17
    for v in k:
        h = hash2(h, np.asarray(v, np.int64))
    return h


class Ctx:
    """One module being drawn: its width, its variant and join seeds, and how far it has blended into the next
    region (t0 at the left edge, t1 at the right; 0 is region A, 1 region B)."""

    def __init__(self, W, var, join, t0=0.0, t1=0.0, depth=14.0):
        self.W = float(W)
        self.var = int(var)
        self.join = int(join)
        self.t0, self.t1 = t0, t1
        self.depth = depth

    # --- the zone rule, for lattice points at u = i * step
    def key(self, i, step):
        """(index, seed) for lattice point i (u = i * step): the join seed and the index relative to the nearest
        edge inside a join zone, the variant's own seed and the plain index elsewhere."""
        i = np.asarray(i, np.int64)
        n = int(round(self.W / step))
        assert abs(self.W / step - n) < 1e-6, f'lattice step {step} must divide the module width {self.W}'
        u = i * step
        rel_i = np.where(u < self.W / 2, i, i - n)
        rel_u = rel_i * step
        zone = (rel_u >= -ZA - 1e-6) & (rel_u < ZB - 1e-6)
        return np.where(zone, rel_i, i), np.where(zone, self.join, self.var + 1000)

    def urel(self, u):
        return np.where(u < self.W / 2, u, u - self.W)

    def t(self, u):
        """The blend towards region B at u (constant inside the join zones)."""
        if self.t0 == self.t1:
            return np.full(np.shape(u), float(self.t0))
        a = smooth((np.asarray(u) - ZB) / (self.W - ZA - ZB))
        return self.t0 + (self.t1 - self.t0) * a

    # --- smooth value noise in (u, z): lattice step su along u (W / su whole), sz along z
    def vn(self, u, z, su, sz, salt):
        u = np.asarray(u, float); z = np.asarray(z, float)
        iu = np.floor(u / su).astype(np.int64); fu = u / su - iu
        iz = np.floor(z / sz).astype(np.int64); fz = z / sz - iz
        def k(a, b):
            ki, ks = self.key(a, su)
            return hh(ki, b, ks, salt) / 65535.0
        su_ = smooth(fu); sz_ = smooth(fz)
        v0 = k(iu, iz) * (1 - su_) + k(iu + 1, iz) * su_
        v1 = k(iu, iz + 1) * (1 - su_) + k(iu + 1, iz + 1) * su_
        return v0 * (1 - sz_) + v1 * sz_

    def pxhash(self, u, z, y, salt, cell=0.125):
        """A per-pixel hash 0..99 in rel coordinates (the same pattern at both edges)."""
        ur = self.urel(np.asarray(u, float))
        return hh(np.floor(ur / cell).astype(np.int64), np.floor(np.asarray(z) / cell).astype(np.int64),
                  np.floor(np.asarray(y) / cell).astype(np.int64), salt) % 100

    # --- scattered things: one candidate per cell (cell along u, cz along z)
    def cells(self, cell, cz, z0, z1, salt, prob, side=None, jit=0.8):
        """Yields (u, z, rnd) for the cells that hold a thing: u across [-ZA, W + ZB), z from z0 down to z1 (z0 >
        z1, both <= 0). rnd(k) gives stable floats for the thing. side: None, 'a' or 'b' (only the share of the
        cells that belongs to region A (1 - t) or B (t), in a transition)."""
        n0 = int(math.floor(-ZA / cell)); n1 = int(math.ceil((self.W + ZB) / cell))
        j0 = 0; j1 = int(math.ceil((z0 - z1) / cz))
        out = []
        for i in range(n0, n1):
            ki, ks = self.key(i, cell)
            ki, ks = int(ki), int(ks)
            for j in range(j0, j1):
                r = lambda k, ki=ki, ks=ks, j=j: float(hh(ki, j, ks, salt * 31 + k)) / 65536.0
                if r(0) >= prob:
                    continue
                u = (i + 0.5 - jit / 2 + jit * r(1)) * cell
                z = z0 - (j + 0.5 - jit / 2 + jit * r(2)) * cz
                if u < -ZA or u >= self.W + ZB or z < z1:
                    continue
                if side is not None:
                    tb = float(self.t(u))
                    pick = r(9)
                    if (side == 'a' and pick < tb) or (side == 'b' and pick >= tb):
                        continue
                out.append((u, z, r, ks == self.join or getattr(self, 'jseed_r', None) == ks))
        return out


# ------------------------------------------------------------------------------------------------ terrain
def terrain(ctx, hf, tex, z_front, z_back, ymax, oid=0, step=0.55, lips=True, shadow_reach=1.6, z_back_fn=None):
    """A heightfield over the module's band: hf(u, z) -> y (u), drawn by marching every pixel's view ray from above
    until it dips under the ground. z_front(u) gives the band's (ragged) front edge, z_back its back (a number).
    tex(u, z, y, gx, gz, idx) -> (ramp ids, idx): idx is the light's shade (0 lit .. 3 shaded) from the slope."""
    W = ctx.W
    sl = E.sbbox((-ZA - 1 + z_back) * UX, z_back * UX, 0, (W + ZB + 2) * UX, 1.5 * UX, ymax * UY, pad=4)
    if sl is None:
        return
    x0p = E.X0P[sl]; y0p = E.Y0P[sl]
    shp = x0p.shape
    tmax = ymax * UY / E.DZ
    fx = x0p.ravel(); fy = y0p.ravel()
    idx_all = np.arange(fx.size)
    alive = idx_all
    tt = np.full(fx.size, np.nan)
    for t in np.append(np.arange(tmax, 0.0, -step), 0.0):
        if not alive.size:
            break
        X = (fx[alive] + E.DX * t) / UX; Z = (fy[alive] + E.DY * t) / UX; Yv = E.DZ * t / UY
        U = X - Z
        inb = (U >= -ZA - 1) & (U < W + ZB + 1) & (Z <= z_front(U)) & (Z >= (z_back if z_back_fn is None else z_back_fn(U)))
        h = np.where(inb, hf(U, Z), -1.0)
        hit = inb & (Yv <= h)
        if hit.any():
            tt[alive[hit]] = t
            alive = alive[~hit]
    got = ~np.isnan(tt)
    if not got.any():
        return
    gi = idx_all[got]
    lo = tt[gi]; hi = lo + step
    for _ in range(6):            # refine between the hit and the step before (the ray above the ground)
        mid = (lo + hi) / 2
        X = (fx[gi] + E.DX * mid) / UX; Z = (fy[gi] + E.DY * mid) / UX; Yv = E.DZ * mid / UY
        U = X - Z
        below = Yv <= hf(U, Z)
        lo = np.where(below, mid, lo); hi = np.where(below, hi, mid)
    t = lo
    X = (fx[gi] + E.DX * t) / UX; Z = (fy[gi] + E.DY * t) / UX; Yv = E.DZ * t / UY
    U = X - Z
    e = 0.08
    gx = (hf(U + e, Z) - hf(U - e, Z)) / (2 * e)           # d/dx at fixed z moves u by the same amount
    gz = (hf(U - e, Z + e) - hf(U + e, Z - e)) / (2 * e)   # d/dz at fixed x: u moves the other way
    k = UY / UX
    nx, ny, nz = -k * gx, -k * gz, np.ones_like(gx)
    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    L = E.L
    d = (nx * L[0] + ny * L[1] + nz * L[2]) / nn
    idx = np.full(d.shape, 3)
    idx = np.where(d > -0.22, 2, idx); idx = np.where(d > 0.42, 1, idx); idx = np.where(d > 0.93, 0, idx)
    # self shadow: a short march towards the shadow light
    if shadow_reach > 0:
        ls = SHADOW_LIGHT / np.linalg.norm(SHADOW_LIGHT[:2])
        shad = np.zeros(d.shape, bool)
        for s in np.arange(0.4, shadow_reach, 0.4):
            xs = X + ls[0] * s; zs = Z + ls[1] * s; ys = Yv + ls[2] * s * (UX / UY) * 1.0
            us = xs - zs
            ok = (us >= -ZA - 1) & (us < W + ZB + 1) & (zs >= z_back)
            shad |= ok & (hf(us, zs) > ys + 0.15)
        idx = np.where(shad & (idx < 3), idx + 1, idx)
    steep = np.sqrt(gx * gx + gz * gz)
    rr, ii = tex(U, Z, Yv, gx, gz, idx)
    rr = np.broadcast_to(rr, d.shape).copy(); ii = np.broadcast_to(ii, d.shape).copy()
    # put into the engine's buffers
    rows, cols = np.unravel_index(gi, shp)
    r0, c0 = sl[0].start, sl[1].start
    rows = rows + r0; cols = cols + c0
    D = E.DX * fx[gi] + E.DY * fy[gi] + E.DD * t
    m = D > E.DB[rows, cols]
    rows, cols = rows[m], cols[m]
    E._pid[0] += 1
    E.DB[rows, cols] = D[m]
    E.RB[rows, cols] = rr[m]
    E.IB[rows, cols] = np.clip(ii[m], 0, 4)
    E.PB[rows, cols] = E._pid[0]
    E.OB[rows, cols] = oid
    E.LB[rows, cols] = True
    E.QX[rows, cols] = (X * UX)[m]; E.QY[rows, cols] = (Z * UX)[m]; E.QZ[rows, cols] = (Yv * UY)[m]
    if lips:
        # a lit lip where a gentle top breaks over a steep face (the face below it on the screen)
        S = np.full(E.RB.shape, np.nan)
        S[rows, cols] = steep[m]
        below = np.roll(S, -1, 0)
        lip = (S < 0.8) & (below > 2.0)
        IB = E.IB
        IB[lip] = np.maximum(IB[lip] - 1, 0)


# ------------------------------------------------------------------------------------------------ things (u)
def _mu(x, z, y):
    return x * UX, z * UX, y * UY


def _th(dark):
    """Sphere shading thresholds pushed darker for things deeper in a wood (dark 0 .. 1)."""
    return (0.8 + 0.15 * dark, 0.4 + 0.3 * dark, -0.1 + 0.25 * dark)


def pine(x, z, y, h, seed, ramp='needle', lod=1.0, slim=1.0, dead=True, dark=0.0):
    """A ponderosa-style pine of height h (u) standing at (x, z, y), in the manner of country_d32.pine (a straight
    cinnamon trunk, a tall broken cone of needle clumps), with the clumps kept to the same pixel size at any height
    so a tall pine is more clumps, not bigger ones. dark: deeper in the wood, more of it in shade."""
    rnd = np.random.RandomState(seed % (2 ** 31))
    o = E.new_oid(True)
    X, Y, Z = _mu(x, z, y)
    H = h * UY
    s = h / 6.2
    tr = 0.9 * s + 0.35
    top = 0.72 if lod >= 1 else 0.5
    db = 1 if dark > 0.5 or lod < 1 else 0
    E.cyl_z(X, Y, Z, Z + H * top, tr, 'bark', oid=o, th=(0.45, 0.2, -0.15),
            tex=lambda f, XX, YY, ZZ, i: (None, np.minimum(np.where(hash2(np.floor(ZZ / 1.6).astype(int), np.floor(np.arctan2(YY - Y, XX - X) * 2).astype(int)) % 3 == 0, i + 1, i) + db, 4)))
    if dead and lod >= 1:
        for k in range(2):
            a = rnd.uniform(0, 2 * math.pi)
            zz = Z + H * rnd.uniform(0.22, 0.32)
            N.limb(X, Y, zz, X + math.cos(a) * 2.2, Y + math.sin(a) * 2.2, zz + 1.4, 0.3, 0.18, 'bark', o)
    th = _th(dark)
    tiers = max(4, int(h * 1.3 * lod))
    cmax = 2.7 if lod >= 1 else 3.2
    for t in range(tiers):
        f = t / (tiers - 1)
        zz = Z + H * (0.36 + 0.6 * f)
        rad = ((3.6 - 2.8 * f) * min(s, 1.25) + 0.6) * slim
        n = max(1, int(round(rad / 1.7 * min(lod, 1.0) + 0.4)))
        for k in range(n):
            a = rnd.uniform(0, 2 * math.pi) + t * 2.3
            dd = rad * rnd.uniform(0.35, 0.8)
            r = min(cmax, rad * rnd.uniform(0.45, 0.65))
            E.sphere(X + math.cos(a) * dd, Y + math.sin(a) * dd, zz + rnd.uniform(-0.8, 0.8), r, ramp, oid=o,
                     th=th, noise=0.55, seed=seed * 7 + t * 13 + k, sz=0.8)
    E.sphere(X, Y, Z + H * 0.985, 1.0 * slim + 0.3, ramp, oid=o, th=th, noise=0.5, seed=seed + 3, sz=1.4)
    return o


def spruce(x, z, y, h, seed, ramp='pine', lod=1.0, dark=0.0):
    """A narrow dark spruce or fir (the pass, the high woods): stacked drooping tiers to a spire."""
    rnd = np.random.RandomState(seed % (2 ** 31))
    o = E.new_oid(True)
    X, Y, Z = _mu(x, z, y)
    H = h * UY
    s = h / 6.0
    E.cyl_z(X, Y, Z, Z + H * 0.4, 0.7 * s + 0.3, 'bark', oid=o, th=(0.45, 0.2, -0.15))
    tiers = max(4, int(7 * lod))
    for t in range(tiers):
        f = t / (tiers - 1)
        zz = Z + H * (0.12 + 0.8 * f)
        rad = (2.6 - 2.1 * f) * s + 0.4
        E.sphere(X + rnd.uniform(-0.3, 0.3), Y + rnd.uniform(-0.3, 0.3), zz, rad, ramp, oid=o,
                 th=_th(dark), noise=0.5, seed=seed * 5 + t, sz=0.55)
    E.sphere(X, Y, Z + H * 0.97, 0.45 * s + 0.35, ramp, oid=o, th=(0.75, 0.38, -0.12), sz=1.6)
    return o


def broadleaf(x, z, y, h, seed, ramp='leaf', dark='pine', trunk='bark', spread=1.0, lod=1.0, shade=0.0):
    """A broad-crowned tree (bur oak, cottonwood, willow) of height h (u): a trunk, two or three limbs and a lumpy
    crown of leaf clumps, as country_d32.oak and nature.cottonwood; a big tree is more clumps, not bigger ones."""
    rnd = np.random.RandomState(seed % (2 ** 31))
    o = E.new_oid(True)
    X, Y, Z = _mu(x, z, y)
    s = h / 5.0
    Zc = Z + 21.0 * s
    Rh, Rv = crown_size(h, spread)
    rc = clump_r(Rh)
    E.cyl_z(X, Y, Z, Zc - Rv * 0.4, min(1.3 * s, 2.0), trunk, oid=o, th=(0.45, 0.2, -0.15))
    if lod >= 1:
        for k in range(2 + int(rnd.uniform(0, 2))):
            a = rnd.uniform(0, 2 * math.pi)
            N.limb(X, Y, Zc - Rv * 0.9, X + math.cos(a) * Rh * 0.55, Y + math.sin(a) * Rh * 0.45, Zc - Rv * 0.2,
                   min(1.0 * s, 1.6), 0.5, trunk, o)
    th = _th(shade)
    thd = _th(min(1.0, shade + 0.5))
    # a dark core so the clumps never leave holes, then clumps over the crown's surface
    E.sphere(X, Y, Zc, max(Rh - rc * 0.8, 1.0), dark, oid=o, th=thd, noise=0.5, seed=seed % 991, sz=Rv / Rh * 0.9)
    n = int(np.clip(3.0 * (Rh / rc) ** 2, 7, 60) * max(min(lod, 1.0), 0.6))
    for k in range(n):
        while True:
            px, py, pz = rnd.uniform(-1, 1, 3)
            d = math.sqrt(px * px + py * py + pz * pz)
            if 0.2 < d <= 1:
                break
        f = rnd.uniform(0.75, 1.0) / d
        px, py, pz = px * f, py * f, pz * f
        bx, by, bz = X + px * (Rh - rc * 0.5), Y + py * (Rh - rc * 0.5), Zc + pz * (Rv - rc * 0.4)
        r = rc * rnd.uniform(0.8, 1.05)
        low_back = pz < -0.25 and (px - py) > 0.1
        E.sphere(bx, by, bz, r, dark if low_back else ramp, oid=o, th=thd if low_back else th, noise=0.55,
                 seed=seed % 997 + k * 7, sz=0.85)
    return o


def crown_size(h, spread=1.0):
    s = h / 5.0
    return 7.5 * s * spread, 5.5 * s


def clump_r(Rh):
    return float(np.clip(0.35 * Rh, 2.2, 3.4))


def shrub(x, z, y, r, seed, ramp='sage', n=5, berries=None):
    """A low bush or a clump of brush, radius r (u)."""
    rnd = np.random.RandomState(seed % (2 ** 31))
    o = E.new_oid(True)
    X, Y, Z = _mu(x, z, y)
    R_ = r * UX
    for k, b in enumerate(N._blobs(rnd, X, Y, Z + R_ * 0.7, R_ * 0.7, n, R_ * 0.45, R_ * 0.7, 0.35)):
        E.sphere(*b, ramp, oid=o, th=(0.8, 0.35, -0.15), noise=0.6, seed=seed + k * 3, sz=0.8)
    if berries:
        for k in range(3):
            E.sphere(X + rnd.uniform(-R_, R_) * 0.7, Y + rnd.uniform(-R_, R_) * 0.7, Z + R_ * rnd.uniform(0.8, 1.2),
                     0.45, berries, oid=o, cast=False)
    return o


def rock(x, z, y, r, seed, ramp='rock', sz=0.7, outline=True):
    o = E.new_oid(outline)
    X, Y, Z = _mu(x, z, y)
    E.sphere(X, Y, Z + r * UX * sz * 0.4, r * UX, ramp, oid=o, th=(0.75, 0.3, -0.25), noise=0.55, seed=seed % 997,
             sz=sz)
    return o


def standing_stone(x, z, y, w, h, seed, ramp='rock'):
    """A tall weathered stone or a broken pillar: stacked, slightly offset blocks."""
    rnd = np.random.RandomState(seed % (2 ** 31))
    o = E.new_oid(True)
    X, Y, Z = _mu(x, z, y)
    n = 3
    def strata(face, XX, YY, ZZ, i):
        band = np.mod(ZZ, 2.2) < 0.5
        return None, np.where(band, np.minimum(i + 1, 4), i)
    for k in range(n):
        ww = w * UX * (1.0 - 0.18 * k) * rnd.uniform(0.85, 1.1)
        dx, dy = rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4)
        z0 = Z + h * UY * k / n; z1 = Z + h * UY * (k + 1) / n
        E.box(X - ww / 2 + dx, Y - ww / 2 + dy, z0, X + ww / 2 + dx, Y + ww / 2 + dy, z1, ramp, shades=(1, 2, 3),
              oid=o, tex=strata)
    return o


def grass_tuft(x, z, y, seed, ramp='grass', h=0.6):
    """A tall tuft of grass (blades as thin boxes)."""
    rnd = np.random.RandomState(seed % (2 ** 31))
    o = E.new_oid(False)
    X, Y, Z = _mu(x, z, y)
    for k in range(5):
        dx, dy = rnd.uniform(-0.9, 0.9), rnd.uniform(-0.7, 0.7)
        hh_ = h * UY * rnd.uniform(0.6, 1.0)
        E.box(X + dx - 0.25, Y + dy - 0.25, Z, X + dx + 0.25, Y + dy + 0.25, Z + hh_, ramp, shades=(1, 2, 3),
              oid=o, cast=False)
    return o


# ------------------------------------------------------------------------------------------------ the module
def haze(img, share):
    """Lift every colour `share` of the way towards the haze colour (alpha kept)."""
    if share <= 0:
        return img
    out = img.copy()
    a = out[..., 3] > 0
    c = out[..., :3].astype(float)
    c = c * (1 - share) + HAZE_RGB * share
    out[..., :3] = np.where(a[..., None], np.round(c).astype(np.uint8), out[..., :3])
    return out


def render_module(draw, W, depth, ymax, haze_share=0.0):
    """Draw one module (draw() puts the shapes in; coordinates in u, the anchor at the origin) and cut it to its
    strip: columns u in [0, W) exactly. Returns (img, (ax, ay)) with ax = 0 (the strip's left column)."""
    pad_l = int(8 * (ZA + 2)) + 8
    width = pad_l + int(8 * (W + ZB + 3)) + 8
    oy = int(8 * ymax + 8 * depth + 4 * ZA + 40)
    height = oy + int(4 * (W + ZB + 4)) + 16
    ox = pad_l
    # the canvas origin is the anchor: column ox is u = 0 (at ground level, all heights)
    saved = E.LS_WORLD.copy()
    E.LS_WORLD[:] = SHADOW_LIGHT
    try:
        E.begin(width, height, ox, oy)
        draw()
        E.cast_shadows()
        E.outlines()
        img = E.render_rgba()
    finally:
        E.LS_WORLD[:] = saved
        E.begin(270, 480, 26, 196)
    strip = img[:, ox:ox + int(8 * W)]
    a = strip[..., 3] > 0
    rows = np.nonzero(a.any(axis=1))[0]
    if rows.size == 0:
        return np.zeros((1, int(8 * W), 4), np.uint8), (0, 0)
    r0, r1 = rows.min(), rows.max() + 1
    out = strip[r0:r1].copy()
    out = haze(out, haze_share)
    return out, (0, int(oy - r0))
