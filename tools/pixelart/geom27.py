# D27 drawing helpers for the vehicles, interiors, goods and carts (owner: A2). Shared by stock27.py, goods27.py
# and their sprite modules; nothing else depends on it.
#
# Everything here is in GAME UNITS (u), in the engine's axis order: x along (world +x), z across (world +z, towards
# the viewer), y up. 1u is 4 MU along x and z and 16/3 MU up (engine.py), so a box given in u comes out at exactly
# the game's scale (8 px across per u, 8 px up per u).
#
#   B(x0, z0, y0, x1, z1, y1, ramp, ...)       an axis-aligned box (engine.box), tex gets (face, x, z, y, idx) in u
#   CYX / CYZ / CYV                            cylinders along x, along z (engine.cyl_x under a turn) and upright
#   obox(c, axes, half, ramp, ...)             an ORIENTED box: any tilt (a hand truck tipped back, a tipped barrel)
#   ocyl(c, axis, r, hl, ramp, ...)            an oriented cylinder (a barrel lying, tipping, rolling; a wheel)
#
# obox and ocyl trace the canvas's view rays exactly as the engine's own shapes do, so they share its depth buffer,
# outlines and shadows. Their shading follows the engine's box: top 1, the lit +z face 2, the shaded +x face 3.
import math
import numpy as np
import engine as E
from engine import R

UX = E.U_XZ          # MU per u along x and z
UY = E.U_Y           # MU per u up


def clampi(i, lo=0, hi=4):
    return np.clip(i, lo, hi)


def _wrap(tex):
    if tex is None:
        return None
    def t(face, X, Y, Z, idx):
        return tex(face, X / UX, Y / UX, Z / UY, idx)
    return t


def B(x0, z0, y0, x1, z1, y1, ramp, shades=(1, 2, 3), tex=None, oid=0, cast=True, faces='tlr'):
    """Axis-aligned box in u. tex(face, x, z, y, idx) -> (ramp id or None, idx), coordinates in u."""
    E.box(min(x0, x1) * UX, min(z0, z1) * UX, min(y0, y1) * UY, max(x0, x1) * UX, max(z0, z1) * UX,
          max(y0, y1) * UY, ramp, shades=shades, tex=_wrap(tex), oid=oid, cast=cast, faces=faces)


def CYV(x, z, y0, y1, r, ramp, oid=0, cast=True, tex=None, th=(0.45, 0.25, -0.12), topidx=1):
    """Upright cylinder in u (radius r along x and z)."""
    E.cyl_z(x * UX, z * UX, y0 * UY, y1 * UY, r * UX, ramp, oid=oid, cast=cast, tex=_wrap(tex), th=th, topidx=topidx)


def CYX(x0, x1, z, y, r, ramp, oid=0, cast=True, tex=None, th=(0.8, 0.5, -0.05), cap=True):
    """Cylinder along x. The engine's cyl_x is round in MU; a round section in u needs r in MU along z and up,
    which differ (4 and 5.33 MU per u), so it is drawn with ocyl instead, exactly round in u."""
    ocyl(((x0 + x1) / 2, z, y), (1, 0, 0), r, abs(x1 - x0) / 2, ramp, oid=oid, cast=cast, tex=tex)


# ---------------------------------------------------------------- oriented shapes
def _ray_u(sl):
    """View rays of a window in u: origin (x, z, y) arrays and the direction (constant)."""
    px = E.X0P[sl] / UX; pz = E.Y0P[sl] / UX; py = np.zeros_like(px)
    d = np.array([E.DX / UX, E.DY / UX, E.DZ / UY])
    return (px, pz, py), d


def _window(lo, hi):
    return E.sbbox(lo[0] * UX, lo[1] * UX, lo[2] * UY, hi[0] * UX, hi[1] * UX, hi[2] * UY, pad=3)


def _shade(n):
    """Shade index from a normal (u space, local frame): the engine box's 1 (top), 2 (lit side), 3 (shaded side)."""
    L = E.L
    d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2]
    i = np.full(np.shape(d), 3)
    i = np.where(d > -0.2, 2, i); i = np.where(d > 0.5, 1, i); i = np.where(d > 0.97, 0, i)
    return i, d > -0.2


def _norm(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def axes_tilt(along, tilt_deg, up=(0, 0, 1)):
    """Three unit axes (a, b, c) in (x, z, y) order for a body whose length runs along `along` (a unit vector on
    the ground, e.g. (1, 0, 0)), tipped by tilt_deg about the horizontal axis across it: positive lifts the +a
    end. b runs across (horizontal), c is the body's up."""
    a0 = _norm((along[0], along[1], 0.0))
    up = np.array([0.0, 0.0, 1.0])
    b = np.cross(up, a0)          # horizontal, across
    t = math.radians(tilt_deg)
    a = a0 * math.cos(t) + up * math.sin(t)
    c = -a0 * math.sin(t) + up * math.cos(t)
    return a, b, c


def obox(c, axes, half, ramp, tex=None, oid=0, cast=False, shades=None):
    """Oriented box in u. c: centre (x, z, y); axes: three orthonormal vectors (x, z, y) order; half: half extents
    along them. tex(k, sgn, uvw, idx) -> (ramp id or None, idx[, keep mask]): k the axis of the face hit (0, 1, 2),
    sgn its side (+1/-1), uvw the hit point in the box's own frame (three arrays, centre at 0)."""
    c = np.asarray(c, float); A = [np.asarray(a, float) for a in axes]; h = list(half)
    ext = sum(np.abs(a) * hh for a, hh in zip(A, h))
    sl = _window(c - ext, c + ext)
    if sl is None:
        return
    lo_b = c - ext; hi_b = c + ext
    pid = E._reg((lo_b[0] * UX, lo_b[1] * UX, lo_b[2] * UY, hi_b[0] * UX, hi_b[1] * UX, hi_b[2] * UY), cast)
    (px, pz, py), d = _ray_u(sl)
    q = [px - c[0], pz - c[1], py - c[2]]
    lo = np.full(px.shape, -1e9); hi = np.full(px.shape, 1e9); hik = np.zeros(px.shape, int)
    P = []
    for k, a in enumerate(A):
        p = q[0] * a[0] + q[1] * a[1] + q[2] * a[2]
        dd = d[0] * a[0] + d[1] * a[1] + d[2] * a[2]
        P.append((p, dd))
        if abs(dd) < 1e-9:
            out = np.abs(p) > h[k]
            hi = np.where(out, -1e9, hi)
            continue
        t1 = (-h[k] - p) / dd; t2 = (h[k] - p) / dd
        tl = np.minimum(t1, t2); th = np.maximum(t1, t2)
        lo = np.maximum(lo, tl)
        better = th < hi
        hik = np.where(better, k, hik); hi = np.where(better, th, hi)
    m = hi >= lo
    if not m.any():
        return
    t = hi
    uvw = [p + t * dd for p, dd in P]
    sgn = np.zeros(px.shape)
    for k in range(3):
        sgn = np.where(hik == k, np.sign(uvw[k]), sgn)
    n = [np.zeros(px.shape) for _ in range(3)]
    for k, a in enumerate(A):
        for j in range(3):
            n[j] = n[j] + np.where(hik == k, sgn * a[j], 0.0)
    idx, lit = _shade(n)
    if shades is not None:          # explicit (top-ish, lit side, shaded side) like engine.box
        idx = np.where(idx <= 1, shades[0], np.where(idx == 2, shades[1], shades[2]))
    rr = np.full(px.shape, R(ramp))
    if tex is not None:
        res = tex(hik, sgn, uvw, idx)
        r2, idx = res[0], res[1]
        if r2 is not None:
            rr = np.broadcast_to(r2, px.shape)
        if len(res) > 2:
            m = m & res[2]
    E.put(sl, m, t, rr, idx, pid, oid, lit)


def ocyl(c, axis, r, hl, ramp, tex=None, oid=0, cast=False, ref=None, caps=True, th=None):
    """Oriented cylinder in u: centre c (x, z, y), unit axis, radius r, half length hl.
    tex(part, s, ang, rho, idx) -> (ramp id or None, idx[, keep]): part 0 the side, +1/-1 the caps; s the position
    along the axis, ang the angle round it (from `ref`, a unit vector across the axis), rho the distance from it."""
    c = np.asarray(c, float); a = _norm(axis)
    ref = _norm(ref if ref is not None else (np.cross(a, (0, 0, 1)) if abs(a[2]) < 0.9 else np.array((1.0, 0, 0))))
    ref2 = np.cross(a, ref)
    ext = np.abs(a) * hl + r * np.sqrt(np.clip(1 - a * a, 0, 1))
    sl = _window(c - ext, c + ext)
    if sl is None:
        return
    lo_b = c - ext; hi_b = c + ext
    pid = E._reg((lo_b[0] * UX, lo_b[1] * UX, lo_b[2] * UY, hi_b[0] * UX, hi_b[1] * UX, hi_b[2] * UY), cast)
    (px, pz, py), d = _ray_u(sl)
    q = np.stack([px - c[0], pz - c[1], py - c[2]])
    qa = q[0] * a[0] + q[1] * a[1] + q[2] * a[2]
    da = float(d @ a)
    qp = q - qa[None] * a[:, None, None]
    dp = d - da * a
    A2 = float(dp @ dp)
    if A2 < 1e-12:
        return
    Bq = 2 * (qp[0] * dp[0] + qp[1] * dp[1] + qp[2] * dp[2])
    Cq = (qp * qp).sum(0) - r * r
    disc = Bq * Bq - 4 * A2 * Cq
    ok = disc >= 0
    sq = np.sqrt(np.where(ok, disc, 0))
    t1 = (-Bq - sq) / (2 * A2); t2 = (-Bq + sq) / (2 * A2)
    if abs(da) > 1e-9:
        s1 = (-hl - qa) / da; s2 = (hl - qa) / da
        slo = np.minimum(s1, s2); shi = np.maximum(s1, s2)
    else:
        inside = np.abs(qa) <= hl
        slo = np.where(inside, -1e9, 1e9); shi = np.where(inside, 1e9, -1e9)
    T = np.minimum(t2, shi)
    m = ok & (T >= np.maximum(t1, slo))
    if not caps:
        m = m & (t2 <= shi)
    if not m.any():
        return
    side = t2 <= shi
    P = q + T[None] * d[:, None, None]
    s = P[0] * a[0] + P[1] * a[1] + P[2] * a[2]
    Pp = P - s[None] * a[:, None, None]
    rho = np.sqrt((Pp * Pp).sum(0))
    ang = np.arctan2(Pp[0] * ref2[0] + Pp[1] * ref2[1] + Pp[2] * ref2[2], Pp[0] * ref[0] + Pp[1] * ref[1] + Pp[2] * ref[2])
    part = np.where(side, 0, np.where(s > 0, 1, -1))
    nside = Pp / np.maximum(rho, 1e-9)[None]
    ncap = np.sign(s)[None] * a[:, None, None]
    n = np.where(side[None], nside, ncap)
    idx, lit = _shade(n)
    rr = np.full(px.shape, R(ramp))
    if tex is not None:
        res = tex(part, s, ang, rho, idx)
        if res[0] is not None:
            rr = np.broadcast_to(res[0], px.shape)
        idx = res[1]
        if len(res) > 2:
            m = m & res[2]
    E.put(sl, m, T, rr, idx, pid, oid, lit)


# ---------------------------------------------------------------- small helpers
def text_px(img, x, y, rows, col):
    """Stamp a tiny pixel map (list of strings, '#' set) into an RGBA image at (x, y)."""
    for r, line in enumerate(rows):
        for k, ch in enumerate(line):
            if ch != '.' and 0 <= y + r < img.shape[0] and 0 <= x + k < img.shape[1]:
                img[y + r, x + k, :3] = col; img[y + r, x + k, 3] = 255


def colour(ramp, i):
    return E.PAL[R(ramp), min(i, E.RLEN[R(ramp)] - 1)]


def proj_px(x, z, y):
    """Native pixel offset of a point in u from the world origin (the game's projection)."""
    return 8 * (x - z), 4 * (x + z) - 8 * y
