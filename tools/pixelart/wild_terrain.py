# D32 wild country (Artist 3): a heightfield primitive for the engine, so a whole stretch of country (a bank falling
# to a creek, a canyon rim and the drop below it, a river with its bars) is drawn in the same depth buffer, light,
# shadows and outlines as the engine's own shapes, and engine shapes (brush, pines, boulders) can stand on it.
#
#   terrain(field, mat, x0, x1, z0, z1)   draws the ground of a piece, x0 <= x < x1, z0 <= z < z1 (game units)
#   place(draw, x, z, y)                  draws engine shapes made round the origin at (x, z), base height y (u)
#   Piece(...).render(frames)             a whole piece: begin, terrain, objects, shadows, outlines, crop; returns
#                                         the frames and the overlay of the water pixels for each frame
#
# The projection is the engine's: +x 8 px right 4 down, +z 8 px left 4 down, +y 8 px up. A screen column holds the
# points with the same x - z; going down the column, s = x + z grows. The pixel at row V of a column shows the
# nearest point (largest s) whose top 4s - 8h lies at or above V, so a drop towards the viewer shows as a face.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R

UX = E.U_XZ
UY = E.U_Y
PERIOD = 8.0                    # u: every texture and every base shape repeats along x every 8u
LIGHT_U = np.array([-0.55 / UX, 0.15 / UX, 1.0 / UY])
LIGHT_U = LIGHT_U / np.linalg.norm(LIGHT_U)     # (x, z, y) in game units, towards the light


# ------------------------------------------------------------------------------------------------ noise
def h2(a, b, s=0):
    """Integer hash 0..65535 of two integer arrays (engine.hash2 with a seed)."""
    return E.hash2(np.asarray(a, np.int64) + s * 7919, np.asarray(b, np.int64) + s * 104729)


def cellnoise(x, z, cell, s=0, period=PERIOD):
    """0..1 per cell of `cell` u, repeating along x every `period` u."""
    n = int(round(period / cell))
    i = np.mod(np.floor(np.asarray(x) / cell).astype(np.int64), n)
    j = np.floor(np.asarray(z) / cell).astype(np.int64)
    return h2(i, j, s) / 65536.0


def vnoise(x, z, cell, s=0, period=PERIOD):
    """Smooth value noise, 0..1, repeating along x every `period` u (period a multiple of cell)."""
    n = int(round(period / cell))
    x = np.asarray(x, float) / cell; z = np.asarray(z, float) / cell
    i0 = np.floor(x).astype(np.int64); j0 = np.floor(z).astype(np.int64)
    fx = x - i0; fz = z - j0
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz)
    def g(i, j):
        return h2(np.mod(i, n), j, s) / 65536.0
    a = g(i0, j0) * (1 - fx) + g(i0 + 1, j0) * fx
    b = g(i0, j0 + 1) * (1 - fx) + g(i0 + 1, j0 + 1) * fx
    return a * (1 - fz) + b * fz


def fbm(x, z, cell, s=0, oct=3, period=PERIOD):
    t = 0.0; a = 1.0; tot = 0.0
    for k in range(oct):
        c = cell / (2 ** k)
        if period / c != round(period / c):
            break
        t = t + a * vnoise(x, z, c, s + k * 13, period)
        tot += a; a *= 0.5
    return t / tot


def smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def env(x, L):
    """1 in the middle of a piece, 0 at both ends (so variants agree where pieces join)."""
    return np.sin(np.clip(np.asarray(x) / L, 0, 1) * math.pi) ** 2


# ------------------------------------------------------------------------------------------------ the heightfield
class Field:
    """What a piece's ground is: ground(x, z) -> height (u); water(x, z) -> water level (u, -inf where none)."""

    def __init__(self, ground, water=None):
        self.ground = ground
        self.water = water or (lambda x, z: np.full(np.shape(x), -np.inf))

    def surface(self, x, z):
        g = self.ground(x, z)
        w = self.water(x, z)
        return np.maximum(g, w), w > g + 0.02


TER = {}     # what the last terrain() call drew, for the water frames: pid, pixel arrays


def terrain(field, mat, x0, x1, z0, z1, keep=None, ds=1.0 / 16, frame=0, shadows=True, oid=1):
    """Draw the heightfield into the engine's buffers. mat(x, z, y, info) -> (ramp ids, idx) for the visible points:
    info has 'water' (bool), 'face' (a vertical face below a column's top), 'depth' (water depth), 'frame', 'nx',
    'nz', 'slope', 'top' (the column's top height), 'g' (the ground height under water). keep(x, z) -> bool may drop
    points (a ragged edge where the piece meets the tiles). Shade offsets from the light are added to idx."""
    W, H, OX, OY = E.W, E.H, E.OX, E.OY
    c_lo = x0 - z1; c_hi = x1 - z0
    p0 = max(0, int(math.floor(OX + 8 * c_lo)) - 1); p1 = min(W, int(math.ceil(OX + 8 * c_hi)) + 1)
    cols = np.arange(p0, p1)
    C = (cols + 0.5 - OX) / 8.0                           # x - z of each column's centre, u
    # the ground just outside the piece (nearer the viewer) still hides what is behind it, but is not drawn: the
    # piece that holds it draws it. So the samples run on past the piece by a margin.
    xs_, zs_ = np.meshgrid(np.linspace(x0, x1, 17), np.linspace(z0, z1 + 30, 61))
    hh_, _ = field.surface(xs_, zs_)
    margin = min(44.0, 2.0 * float(hh_.max() - hh_[:, :].min()) + 1.0)
    smax = x1 + z1 + margin; smin = x0 + z0
    S = np.arange(smax, smin, -ds)                         # nearest first
    Cg, Sg = np.meshgrid(C, S, indexing='ij')
    X = (Sg + Cg) / 2; Z = (Sg - Cg) / 2
    near = (X >= x0) & (Z >= z0)                           # the piece and what lies nearer than it
    valid = near & (X < x1) & (Z < z1)
    if keep is not None:
        valid &= keep(X, Z)
    hs, wet = field.surface(X, Z)
    top = np.where(near, 4 * Sg - 8 * hs, np.inf)
    run = np.minimum.accumulate(top, axis=1)
    rows = np.arange(H) + 0.5 - OY                        # V of each row's centre
    K = np.full((len(cols), H), -1, np.int64)
    neg = -run
    for ci in range(len(cols)):
        k = np.searchsorted(neg[ci], -rows, side='left')
        k[k >= len(S)] = -1
        ok = k >= 0
        k[ok & ~valid[ci, np.maximum(k, 0)]] = -1
        K[ci] = k
    ci_, ry = np.nonzero(K >= 0)
    if len(ci_) == 0:
        return
    k = K[ci_, ry]
    px = cols[ci_]; py = ry
    s_k = S[k]; c_k = C[ci_]
    x = (s_k + c_k) / 2; z = (s_k - c_k) / 2
    htop = hs[ci_, k]
    w = wet[ci_, k]
    V = py + 0.5 - OY
    y = np.minimum((4 * s_k - V) / 8.0, htop)
    face = (htop - y) > 0.13
    # normals from the surface
    e = 0.12
    hxp, _ = field.surface(x + e, z); hxm, _ = field.surface(x - e, z)
    hzp, _ = field.surface(x, z + e); hzm, _ = field.surface(x, z - e)
    gx = (hxp - hxm) / (2 * e); gz = (hzp - hzm) / (2 * e)
    gl = np.sqrt(gx * gx + gz * gz) + 1e-9
    # tops: lambert with the light; faces: which way the drop looks (south +1, east +2)
    n = np.stack([-gx, -gz, np.ones_like(gx)]); n = n / np.linalg.norm(n, axis=0)
    d = n[0] * LIGHT_U[0] + n[1] * LIGHT_U[1] + n[2] * LIGHT_U[2]
    off_top = np.where(d > 0.93, -1, np.where(d > 0.6, 0, np.where(d > 0.3, 1, np.where(d > 0.0, 2, 3))))
    fx = np.where(gl > 0.3, gx / gl, 0.0); fz = np.where(gl > 0.3, gz / gl, -1.0)
    # the face looks along -grad (downhill); +z (south) is the lit side, +x the shaded side
    off_face = np.where(-fx > -fz * 1.2, 2, 1)
    g = field.ground(x, z)
    info = dict(water=w, face=face, depth=np.where(w, htop - g, 0.0), frame=frame, nx=-gx, nz=-gz, slope=gl,
                top=htop, g=g)
    rr, ii = mat(x, z, y, info)
    rr = np.broadcast_to(rr, x.shape).astype(np.int64)
    ii = np.asarray(ii, np.int64) + np.where(face, off_face, off_top) * np.asarray(info.get('shade', 1))
    ii = np.clip(ii, 0, E.RLEN[rr] - 1)
    # terrain self-shadow: march towards the light over the field
    if shadows:
        lit = ~face
        sh = np.zeros(len(x), bool)
        idxs = np.nonzero(lit)[0]
        if len(idxs):
            hmax = float(np.nanmax(np.where(np.isfinite(hs), hs, -1e9))) + 0.3
            step = 0.35
            act = idxs
            for kk in range(1, 120):
                t = kk * step
                py_ = y[act] + 0.05 + LIGHT_U[2] * t
                keepa = py_ <= hmax
                act = act[keepa]; py_ = py_[keepa]
                if len(act) == 0:
                    break
                hh, _ = field.surface(x[act] + LIGHT_U[0] * t, z[act] + LIGHT_U[1] * t)
                hit = hh > py_
                sh[act[hit]] = True
                act = act[~hit]
        ii = np.where(sh, np.minimum(ii + 1, E.RLEN[rr] - 1), ii)
    # into the engine: t along the pixel's view ray (Z = KZ t, in MU)
    E._pid[0] += 1
    pid = E._pid[0]
    tt = y * UY / E.KZ
    for_put = np.zeros((H, W), bool)
    for_put[py, px] = True
    T = np.zeros((H, W)); T[py, px] = tt
    RR = np.zeros((H, W), np.int64); RR[py, px] = rr
    II = np.zeros((H, W), np.int64); II[py, px] = ii
    LIT = np.zeros((H, W), bool); LIT[py, px] = ~face
    sl = (slice(0, H), slice(0, W))
    E.put(sl, for_put, T, RR, II, pid, oid, LIT)
    TER.update(pid=pid, px=px, py=py, x=x, z=z, y=y, water=w, face=face, rr=rr, ii=ii, info=info, mat=mat)


# ------------------------------------------------------------------------------------------------ placing shapes
class place:
    """with place(x, z, y): engine shapes drawn inside are moved to (x, z) at height y (game units). Depth, shadows
    and outlines stay correct (the canvas origin, the view rays and the depth buffer are shifted, then put back)."""

    def __init__(self, x, z, y=0.0):
        self.t = (x * UX, z * UX, y * UY)

    def __enter__(self):
        tx, ty, tz = self.t
        self.save = (E.OX, E.OY, E.X0P, E.Y0P)
        c = tz / E.KZ
        self.k = -tx - ty + (2 - E.DD) * c
        E.OX = E.OX + 2 * (tx - ty)
        E.OY = E.OY + tx + ty - E.ZS * tz
        E.X0P = E.X0P - tx + c
        E.Y0P = E.Y0P - ty + c
        E.DB += self.k
        self.pid0 = E._pid[0]
        self.n0 = len(E.OCC)
        return self

    def __exit__(self, *a):
        tx, ty, tz = self.t
        E.OX, E.OY, E.X0P, E.Y0P = self.save
        E.DB -= self.k
        new = E.PB > self.pid0
        E.QX[new] += tx; E.QY[new] += ty; E.QZ[new] += tz
        for i in range(self.n0, len(E.OCC)):
            (x0, y0, z0, x1, y1, z1), pid, kind, extra = E.OCC[i]
            if kind == 'sph':
                xc, yc, zc, r, sz = extra
                extra = (xc + tx, yc + ty, zc + tz, r, sz)
            E.OCC[i] = ((x0 + tx, y0 + ty, z0 + tz, x1 + tx, y1 + ty, z1 + tz), pid, kind, extra)
        return False


def put_at(draw, x, z, y):
    with place(x, z, y):
        return draw()


# ------------------------------------------------------------------------------------------------ a whole piece
def render(draw, canvas, origin, mat_frames=0, outline=True):
    """Begin a canvas, draw(), shadows and outlines, crop. With mat_frames > 1 the water pixels of the LAST terrain
    drawn are recoloured for each frame. Returns (frames, overlays): frames[k] = (img, anchor) complete, overlays[k]
    = (img, anchor) holding only the water pixels of frame k (same anchor and size as frames[k])."""
    E.begin(canvas[0], canvas[1], origin[0], origin[1])
    TER.clear()
    WAT.clear()
    draw()
    E.cast_shadows()
    if outline:
        E.outlines()
    base_r = E.RB.copy(); base_i = E.IB.copy()
    img0 = E.render_rgba()
    a = img0[..., 3] > 0
    if not a.any():
        z = np.zeros((1, 1, 4), np.uint8)
        return [(z, (0, 0))], []
    ys, xs = np.nonzero(a)
    r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    # the anchor (the piece's corner on the line's side) may lie outside the picture: a deep piece starts far below it
    an = (int(origin[0] - c0), int(origin[1] - r0))
    frames = [(img0[r0:r1, c0:c1].copy(), an)]
    overlays = []
    if mat_frames > 1 and WAT:
        masks = []
        for f in range(mat_frames):
            E.RB[:] = base_r; E.IB[:] = base_i
            m = np.zeros(E.RB.shape, bool)
            for T in WAT:
                still = E.PB[T['py'], T['px']] == T['pid']
                wsel = still & (T['water'] | T.get('animate', np.zeros_like(T['water'])))
                if not wsel.any():
                    continue
                info = {k: (v[wsel] if isinstance(v, np.ndarray) and v.shape == T['x'].shape else v)
                        for k, v in T['info'].items()}
                info['frame'] = f
                rr, ii = T['mat'](T['x'][wsel], T['z'][wsel], T['y'][wsel], info)
                rr = np.broadcast_to(rr, T['x'][wsel].shape).astype(np.int64)
                off = E.IB[T['py'][wsel], T['px'][wsel]] - T['ii0'][wsel]     # shade, shadow and outline steps
                ii = np.clip(np.asarray(ii, np.int64) + T['shadeoff'][wsel] + off - T['shadeoff'][wsel] * 0, 0,
                             E.RLEN[rr] - 1)
                E.RB[T['py'][wsel], T['px'][wsel]] = rr
                E.IB[T['py'][wsel], T['px'][wsel]] = np.clip(ii, 0, E.RLEN[rr] - 1)
                m[T['py'][wsel], T['px'][wsel]] = True
            img = E.render_rgba()[r0:r1, c0:c1].copy()
            if f:
                frames.append((img, an))
            ov = img.copy(); ov[~m[r0:r1, c0:c1]] = 0
            overlays.append(ov)
            masks.append(m[r0:r1, c0:c1])
        E.RB[:] = base_r; E.IB[:] = base_i
        # the overlays are cut to the water's own box (the same for every frame), their anchor moved to match
        u = np.any(masks, axis=0)
        if u.any():
            ys, xs = np.nonzero(u)
            q0, q1, p0, p1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            overlays = [(o[q0:q1, p0:p1].copy(), (int(an[0] - p0), int(an[1] - q0))) for o in overlays]
        else:
            overlays = []
    return frames, overlays


WAT = []     # every terrain() call in the current render that has water, for the frames


def terrain_w(field, mat, x0, x1, z0, z1, keep=None, animate=None, **kw):
    """terrain() and remember its water pixels for render()'s frames. animate(x, z, y, info) -> bool marks more
    pixels to recolour per frame (spray, a wet face)."""
    terrain(field, mat, x0, x1, z0, z1, keep=keep, **kw)
    if not TER:
        return
    T = dict(TER)
    # the index the material gave (with the light's offset) before shadows and outlines
    info = T['info']
    rr0, ii_mat = T['mat'](T['x'], T['z'], T['y'], info)
    ii_mat = np.asarray(ii_mat, np.int64)
    T['shadeoff'] = np.asarray(T['ii'], np.int64) - ii_mat            # light and self-shadow steps
    T['ii0'] = np.asarray(T['ii'], np.int64)                          # before object shadows and outlines
    if animate is not None:
        T['animate'] = animate(T['x'], T['z'], T['y'], info)
    if T['water'].any() or 'animate' in T:
        WAT.append(T)


def render_anim(draws, canvas, origin, outline=True):
    """Each draw in draws is one frame, drawn whole (water and a turning wheel, smoke). Returns (frames, overlays)
    as render(): frames[k] complete, overlays[k] only the pixels that change between frames (cut to their box)."""
    imgs = []
    for d in draws:
        E.begin(canvas[0], canvas[1], origin[0], origin[1])
        TER.clear(); WAT.clear()
        d()
        E.cast_shadows()
        if outline:
            E.outlines()
        imgs.append(E.render_rgba())
    a = np.any([im[..., 3] > 0 for im in imgs], axis=0)
    if not a.any():
        z = np.zeros((1, 1, 4), np.uint8)
        return [(z, (0, 0))], []
    ys, xs = np.nonzero(a)
    r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    an = (int(origin[0] - c0), int(origin[1] - r0))
    frames = [(im[r0:r1, c0:c1].copy(), an) for im in imgs]
    diff = np.zeros((r1 - r0, c1 - c0), bool)
    for im, _ in frames[1:]:
        diff |= np.any(im != frames[0][0], axis=-1)
    overlays = []
    if diff.any():
        ys, xs = np.nonzero(diff)
        q0, q1, p0, p1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        for im, _ in frames:
            o = im.copy(); o[~diff] = 0
            overlays.append((o[q0:q1, p0:p1].copy(), (int(an[0] - p0), int(an[1] - q0))))
    return frames, overlays
