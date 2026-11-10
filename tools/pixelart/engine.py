# Railhead pixel art engine: a tiny isometric renderer with an exact 2:1 projection, a depth buffer and palette ramps.
# Grown from the approved mockup's engine (plans/pixel/art-scene.png). Every pixel is computed from simple 3D shapes
# (boxes, cylinders, spheres, gables), snapped to the palette below, then shadowed and outlined.
#
# Units. The engine works in "mockup units" (MU), the units the mockup was drawn in:
#   engine X = game world +x (along the main line), engine Y = game world +z, engine Z = up (game +y).
#   One game unit along x or z is 4 MU; one game unit up is 16/3 MU (1.5 px per MU up, 8 px per game unit).
#   So the game's projection (+x: 8 px right 4 down; +z: 8 px left 4 down; +y: 8 px up) is exactly
#   proj(X, Y, Z) = (OX + 2 (X - Y), OY + X + Y - 1.5 Z).
# begin(w, h, ox, oy) starts a fresh canvas; the world origin projects to the pixel corner (ox, oy).
import numpy as np, math

W, H = 270, 480
OX, OY = 26, 196
U_XZ = 4.0          # MU per game unit along x and z
U_Y = 16.0 / 3.0    # MU per game unit up
ZS = 1.5          # pixels per world unit of height
KZ = 2.0 / ZS     # dz/dt along the view ray

# ---------------- palette ----------------
HEX = {
 'ink':'#2b2026',
 'w0':'#f0cf98','w1':'#d4a66c','w2':'#a8774b','w3':'#764d33','w4':'#4a3027',
 'g0':'#c4c66e','g1':'#9fae55','g2':'#7a9244','g3':'#566f37','g4':'#3a4b2c',
 'd0':'#d9bf96','d1':'#bb9c76',
 'G0':'#78ad78','G1':'#4b8a5f','G2':'#2f6449','G3':'#1f4337',
 'c0':'#fbf1d6','c1':'#e6cf9e','c2':'#c3a376',
 'r0':'#e07a58','r1':'#b84a35','r2':'#7c2e2a',
 'o0':'#efb45c','o1':'#c9863b','o2':'#93592d',
 'n0':'#6474a6','n1':'#3b4878','n2':'#262c4c',
 'b0':'#fff2a6','b1':'#efbd4c',
 'i0':'#e6e3da','i1':'#aeaaa3','i2':'#77757c','i3':'#4c4a55',
 's0':'#f5d0a6','s1':'#d39c74','s2':'#c48a5c','s3':'#93613f',
 'sky':'#a8d8e2','fire':'#ff9440',
 'p0':'#a2719e','p1':'#6c4672',
}
RAMPS = {
 'wood':  ['w0','w1','w2','w3','w4'],
 'grass': ['g0','g1','g2','g3','g4'],
 'leaf':  ['g0','g1','g2','g3','g4'],
 'dirt':  ['d0','d1','w2','w3','w4'],
 'green': ['G0','G1','G2','G3','ink'],
 'cream': ['c0','c1','c2','w2','w3'],
 'red':   ['r0','r1','r2','w4','ink'],
 'ochre': ['o0','o1','o2','w3','w4'],
 'navy':  ['n0','n1','n2','ink'],
 'brass': ['b0','b1','o1','o2','w4'],
 'iron':  ['i0','i1','i2','i3','ink'],
 'dark':  ['i2','i3','ink','ink'],
 'skin':  ['s0','s1','o2','w4'],
 'skin2': ['s2','s3','w3','w4'],
 'glass': ['sky','n0','n1','n2'],
 'fire':  ['b0','fire','r1','r2'],
 'plum':  ['p0','p1','n2','ink'],
 'smoke': ['c0','i0','i1','i2'],
 'roof':  ['i0','i1','i2','i3','ink'],
 'blk':   ['i1','i2','i3','ink','ink'],
 'gnd':   ['ink','ink','ink','ink','ink'],   # invisible shadow catcher: index 0 = clear, 1+ = shadow
}
RNAMES = list(RAMPS)
RID = {n: i for i, n in enumerate(RNAMES)}
ML = max(len(v) for v in RAMPS.values())
PAL = np.zeros((len(RNAMES), ML, 3), np.uint8)
RLEN = np.array([len(RAMPS[n]) for n in RNAMES])
def hx(h): return [int(h[i:i+2], 16) for i in (1, 3, 5)]
for n, lst in RAMPS.items():
    for i in range(ML):
        PAL[RID[n], i] = hx(HEX[lst[min(i, len(lst)-1)]])

# ---------------- buffers ----------------
BAYER = np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]) / 16.0
OCC = []          # shadow casters: (aabb, pid, kind, extra)
OUTLINE = set()   # oids that get a selective outline
_pid = [1]; _oid = [1]
CLIP = [None]     # optional world-x clip (x0, x1) for tiling pieces: only points with x0 <= X < x1 are drawn

def begin(w, h, ox, oy):
    """Start a fresh canvas w x h; the world origin projects to pixel corner (ox, oy)."""
    global W, H, OX, OY, U, V, X0P, Y0P, BAY, RB, IB, DB, PB, OB, LB, QX, QY, QZ
    W, H, OX, OY = w, h, ox, oy
    _py, _px = np.mgrid[0:H, 0:W]
    U = (_px + 0.5 - OX) / 2.0
    V = (_py + 0.5 - OY)
    X0P = (U + V) / 2.0
    Y0P = (V - U) / 2.0
    BAY = BAYER[(_py - OY) % 4, (_px - OX) % 4]
    RB = np.full((H, W), -1, np.int32); IB = np.zeros((H, W), np.int32)
    DB = np.full((H, W), -1e9); PB = np.zeros((H, W), np.int32); OB = np.zeros((H, W), np.int32)
    LB = np.zeros((H, W), bool); QX = np.zeros((H, W)); QY = np.zeros((H, W)); QZ = np.zeros((H, W))
    OCC.clear(); OUTLINE.clear(); _pid[0] = 1; _oid[0] = 1; CLIP[0] = None

begin(W, H, OX, OY)
def new_oid(outline=False):
    _oid[0] += 1
    if outline: OUTLINE.add(_oid[0])
    return _oid[0]

def proj(x, y, z):
    return OX + 2 * (x - y), OY + x + y - ZS * z

def sbbox(x0, y0, z0, x1, y1, z1, pad=2):
    xs, ys = [], []
    for x in (x0, x1):
        for y in (y0, y1):
            for z in (z0, z1):
                a, b = proj(x, y, z); xs.append(a); ys.append(b)
    c0 = max(0, int(math.floor(min(xs))) - pad); c1 = min(W, int(math.ceil(max(xs))) + pad)
    r0 = max(0, int(math.floor(min(ys))) - pad); r1 = min(H, int(math.ceil(max(ys))) + pad)
    if c0 >= c1 or r0 >= r1: return None
    return (slice(r0, r1), slice(c0, c1))

def R(name): return RID[name]

def put(sl, m, t, ramp, idx, pid, oid, lit):
    if not m.any(): return
    x0p = X0P[sl]; y0p = Y0P[sl]
    t = np.broadcast_to(t, m.shape)
    if CLIP[0] is not None:
        xw = x0p + t
        m = m & (xw >= CLIP[0][0] - 1e-6) & (xw < CLIP[0][1] - 1e-6)
    D = x0p + y0p + (2 + KZ) * t
    m = m & (D > DB[sl])
    if not m.any(): return
    DB[sl][m] = D[m]
    RB[sl][m] = np.broadcast_to(ramp, m.shape)[m]
    IB[sl][m] = np.broadcast_to(idx, m.shape)[m]
    PB[sl][m] = pid; OB[sl][m] = oid
    LB[sl][m] = np.broadcast_to(lit, m.shape)[m]
    QX[sl][m] = (x0p + t)[m]; QY[sl][m] = (y0p + t)[m]; QZ[sl][m] = (KZ * t)[m]

def _reg(aabb, cast, kind='box', extra=None):
    _pid[0] += 1
    if cast: OCC.append((aabb, _pid[0], kind, extra))
    return _pid[0]

def _apply_tex(tex, face, X, Y, Z, ramp, idx):
    if tex is None: return R(ramp) if isinstance(ramp, str) else ramp, idx
    r, i = tex(face, X, Y, Z, idx)
    if r is None: r = R(ramp)
    return r, i

def box(x0, y0, z0, x1, y1, z1, ramp, shades=(1, 2, 3), tex=None, oid=0, cast=True, faces='tlr'):
    pid = _reg((x0, y0, z0, x1, y1, z1), cast)
    sl = sbbox(x0, y0, z0, x1, y1, z1)
    if sl is None: return
    x0p = X0P[sl]; y0p = Y0P[sl]
    if 't' in faces:
        t = np.full(x0p.shape, z1 / KZ); X = x0p + t; Y = y0p + t; Z = KZ * t
        m = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1)
        r, i = _apply_tex(tex, 't', X, Y, Z, ramp, np.full(X.shape, shades[0]))
        put(sl, m, t, r, i, pid, oid, True)
    if 'l' in faces:
        t = y1 - y0p; X = x0p + t; Z = KZ * t; Y = np.full(X.shape, float(y1))
        m = (X >= x0) & (X < x1) & (Z >= z0) & (Z < z1)
        r, i = _apply_tex(tex, 'l', X, Y, Z, ramp, np.full(X.shape, shades[1]))
        put(sl, m, t, r, i, pid, oid, True)
    if 'r' in faces:
        t = x1 - x0p; Y = y0p + t; Z = KZ * t; X = np.full(Y.shape, float(x1))
        m = (Y >= y0) & (Y < y1) & (Z >= z0) & (Z < z1)
        r, i = _apply_tex(tex, 'r', X, Y, Z, ramp, np.full(Y.shape, shades[2]))
        put(sl, m, t, r, i, pid, oid, False)

L = np.array([-0.55, 0.15, 1.0]); L = L / np.linalg.norm(L)
def qshade(nx, ny, nz, th=(0.9, 0.55, -0.1), noise=None):
    d = nx * L[0] + ny * L[1] + nz * L[2]
    if noise is not None: d = d + noise
    i = np.full(np.shape(d), 3)
    i = np.where(d > th[2], 2, i); i = np.where(d > th[1], 1, i); i = np.where(d > th[0], 0, i)
    return i

def cyl_x(x0, x1, yc, zc, r, ramp, oid=0, cast=True, tex=None, th=(0.8, 0.5, -0.05), cap=True):
    pid = _reg((x0, yc - r, zc - r, x1, yc + r, zc + r), cast)
    sl = sbbox(x0, yc - r, zc - r, x1, yc + r, zc + r)
    if sl is None: return
    x0p = X0P[sl]; y0p = Y0P[sl]
    dy = y0p - yc
    a = 1.0 + KZ * KZ; b = 2 * (dy - KZ * zc); c = dy * dy + zc * zc - r * r
    disc = b * b - 4 * a * c
    ok = disc >= 0
    t = (-b + np.sqrt(np.where(ok, disc, 0))) / (2 * a)
    X = x0p + t; Y = y0p + t; Z = KZ * t
    m = ok & (X >= x0) & (X < x1)
    idx = qshade(0, (Y - yc) / r, (Z - zc) / r, th)
    rr, ii = _apply_tex(tex, 's', X, Y, Z, ramp, idx)
    put(sl, m, t, rr, ii, pid, oid, True)
    if cap:
        t = x1 - x0p; Y = y0p + t; Z = KZ * t; X = np.full(Y.shape, float(x1))
        m = (Y - yc) ** 2 + (Z - zc) ** 2 <= r * r
        rr, ii = _apply_tex(tex, 'c', X, Y, Z, ramp, np.full(Y.shape, 3))
        put(sl, m, t, rr, ii, pid, oid, False)

def cyl_z(xc, yc, z0, z1, r, ramp, oid=0, cast=True, tex=None, th=(0.45, 0.25, -0.12), topidx=1):
    pid = _reg((xc - r, yc - r, z0, xc + r, yc + r, z1), cast)
    sl = sbbox(xc - r, yc - r, z0, xc + r, yc + r, z1)
    if sl is None: return
    x0p = X0P[sl]; y0p = Y0P[sl]
    dx = x0p - xc; dy = y0p - yc
    a = 2.0; b = 2 * (dx + dy); c = dx * dx + dy * dy - r * r
    disc = b * b - 4 * a * c; ok = disc >= 0
    t = (-b + np.sqrt(np.where(ok, disc, 0))) / (2 * a)
    X = x0p + t; Y = y0p + t; Z = KZ * t
    m = ok & (Z >= z0) & (Z < z1)
    idx = qshade((X - xc) / r, (Y - yc) / r, 0, th)
    rr, ii = _apply_tex(tex, 's', X, Y, Z, ramp, idx)
    put(sl, m, t, rr, ii, pid, oid, True)
    t = np.full(x0p.shape, z1 / KZ); X = x0p + t; Y = y0p + t; Z = KZ * t
    m = (X - xc) ** 2 + (Y - yc) ** 2 <= r * r
    rr, ii = _apply_tex(tex, 't', X, Y, Z, ramp, np.full(X.shape, topidx))
    put(sl, m, t, rr, ii, pid, oid, True)

def sphere(xc, yc, zc, r, ramp, oid=0, cast=True, th=(0.85, 0.5, -0.1), noise=0.0, seed=0, sz=1.0):
    # sz: vertical squash factor
    pid = _reg((xc - r, yc - r, zc - r * sz, xc + r, yc + r, zc + r * sz), cast, 'sph', (xc, yc, zc, r, sz))
    sl = sbbox(xc - r, yc - r, zc - r * sz, xc + r, yc + r, zc + r * sz)
    if sl is None: return
    x0p = X0P[sl]; y0p = Y0P[sl]
    px = x0p - xc; py = y0p - yc; pz = -zc
    # ellipsoid: px^2+py^2+(pz/sz)^2 = r^2, dir (1,1,2)
    a = 2 + KZ * KZ / sz ** 2; b = 2 * (px + py + KZ * pz / sz ** 2); c = px * px + py * py + (pz / sz) ** 2 - r * r
    disc = b * b - 4 * a * c; ok = disc >= 0
    t = (-b + np.sqrt(np.where(ok, disc, 0))) / (2 * a)
    X = x0p + t; Y = y0p + t; Z = KZ * t
    nx = (X - xc) / r; ny = (Y - yc) / r; nz = (Z - zc) / (r * sz * sz)
    nn = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    nse = None
    if noise:
        h = hash2(np.floor(X * 1.3).astype(int) + seed, np.floor((Y + Z) * 1.3).astype(int))
        nse = ((h % 100) / 100.0 - 0.5) * noise
    idx = qshade(nx / nn, ny / nn, nz / nn, th, nse)
    put(sl, ok, t, R(ramp), idx, pid, oid, True)

def disc_y(xc, zc, r, yp, ramp, oid=0, kind='wheel', spokes=8, phase=0.0):
    sl = sbbox(xc - r, yp, zc - r, xc + r, yp, zc + r)
    if sl is None: return
    _pid[0] += 1; pid = _pid[0]
    x0p = X0P[sl]; y0p = Y0P[sl]
    t = yp - y0p; X = x0p + t; Z = KZ * t
    dx = X - xc; dz = Z - zc; d = np.sqrt(dx * dx + dz * dz)
    m = d <= r
    ang = np.arctan2(dz, dx) + phase
    rr = np.full(X.shape, R(ramp)); ii = np.full(X.shape, 2)
    if kind == 'wheel':
        lit = (dz - dx * 0.6) > 0
        ii = np.where(lit, 1, 2)
        if spokes and r > 2.5:
            sp = (np.abs(((ang / (2 * np.pi) * spokes) % 1.0) - 0.5) < 0.16) & (d > 1.0) & (d < r - 1.0)
            ii = np.where(sp, np.where(lit, 0, 1), ii)
        cw = (d > 1.0) & (d < r - 1.0) & (np.abs(((ang + 2.4) % (2 * np.pi)) - np.pi) < 0.75)
        ii = np.where(cw, 3, ii)
        tyre = d > r - 0.9
        rr = np.where(tyre, R('iron'), rr); ii = np.where(tyre, np.where(lit, 2, 3), ii)
        hub = d < 0.9
        rr = np.where(hub, R('brass'), rr); ii = np.where(hub, 1, ii)
    elif kind == 'small':
        tyre = d > r - 0.8
        rr = np.where(tyre, R('iron'), rr); ii = np.where(tyre, 3, np.where(dz > 0, 1, 2))
    elif kind == 'flat':
        ii = np.where(dz + dx * 0.3 > 0, 1, 2)
        ii = np.where(d > r - 0.7, 3, ii)
    put(sl, m, t, rr, ii, pid, oid, False)

def disc_x(yc, zc, r, xp, ramp, oid=0, kind='wheel', spokes=8, phase=0.0):
    """A wheel in the y-z plane at x = xp, seen on its +x side (the shaded side)."""
    sl = sbbox(xp, yc - r, zc - r, xp, yc + r, zc + r)
    if sl is None: return
    _pid[0] += 1; pid = _pid[0]
    x0p = X0P[sl]; y0p = Y0P[sl]
    t = xp - x0p; Y = y0p + t; Z = KZ * t
    dy = Y - yc; dz = Z - zc; d = np.sqrt(dy * dy + dz * dz)
    m = d <= r
    ang = np.arctan2(dz, -dy) + phase
    rr = np.full(Y.shape, R(ramp)); ii = np.full(Y.shape, 2)
    ii = np.where(dz > 0, 2, 3)
    if spokes and r > 1.6:
        sp = (np.abs(((ang / (2 * np.pi) * spokes) % 1.0) - 0.5) < 0.16) & (d > 0.8) & (d < r - 0.8)
        ii = np.where(sp, 1, ii)
    tyre = d > r - 0.8
    rr = np.where(tyre, R('iron'), rr); ii = np.where(tyre, 3, ii)
    put(sl, m, t, rr, ii, pid, oid, False)

def gable_x(x0, x1, yc, hw, ze, zr, ramp, wall=None, oid=0, cast=True, tex=None, endtex=None, shades=(1, 2)):
    # ridge along x at y=yc, height zr; eaves at y=yc+-hw at height ze. visible end at x=x1.
    pid = _reg((x0, yc - hw, ze, x1, yc + hw, zr), cast)
    sl = sbbox(x0, yc - hw, ze, x1, yc + hw, zr)
    if sl is None: return
    x0p = X0P[sl]; y0p = Y0P[sl]
    k = (zr - ze) / hw
    # front half (+y): z = zr - k*(y-yc)
    t = (zr - k * (y0p - yc)) / (KZ + k); X = x0p + t; Y = y0p + t; Z = KZ * t
    m = (X >= x0) & (X < x1) & (Y >= yc) & (Y < yc + hw)
    rr, ii = _apply_tex(tex, 'f', X, Y, Z, ramp, np.full(X.shape, shades[1]))
    put(sl, m, t, rr, ii, pid, oid, True)
    if KZ - k > 0.05:
        t = (zr - k * (yc - y0p)) / (KZ - k)
        X = x0p + t; Y = y0p + t; Z = KZ * t
        m = (X >= x0) & (X < x1) & (Y >= yc - hw) & (Y < yc)
        rr, ii = _apply_tex(tex, 'b', X, Y, Z, ramp, np.full(X.shape, shades[0]))
        put(sl, m, t, rr, ii, pid, oid, True)
    if wall is not None:
        t = x1 - 0.6 - x0p; Y = y0p + t; Z = KZ * t; X = np.full(Y.shape, x1 - 0.6)
        m = (Z >= ze - 0.01) & (Z <= zr - k * np.abs(Y - yc)) & (np.abs(Y - yc) < hw - 0.8)
        rr, ii = _apply_tex(endtex, 'e', X, Y, Z, wall, np.full(Y.shape, 3))
        put(sl, m, t, rr, ii, pid, oid, False)

def gable_y(y0, y1, xc, hw, ze, zr, ramp, wall=None, oid=0, cast=True, tex=None, endtex=None, shades=(1, 2)):
    # ridge along y at x=xc; slopes face -x (lit) and +x (dark); visible end at y=y1
    pid = _reg((xc - hw, y0, ze, xc + hw, y1, zr), cast)
    sl = sbbox(xc - hw, y0, ze, xc + hw, y1, zr)
    if sl is None: return
    x0p = X0P[sl]; y0p = Y0P[sl]
    k = (zr - ze) / hw
    t = (zr - k * (x0p - xc)) / (KZ + k); X = x0p + t; Y = y0p + t; Z = KZ * t
    m = (Y >= y0) & (Y < y1) & (X >= xc) & (X < xc + hw)
    rr, ii = _apply_tex(tex, 'r', X, Y, Z, ramp, np.full(X.shape, shades[1]))
    put(sl, m, t, rr, ii, pid, oid, False)
    if KZ - k > 0.05:
        t = (zr - k * (xc - x0p)) / (KZ - k); X = x0p + t; Y = y0p + t; Z = KZ * t
        m = (Y >= y0) & (Y < y1) & (X >= xc - hw) & (X < xc)
        rr, ii = _apply_tex(tex, 'l', X, Y, Z, ramp, np.full(X.shape, shades[0]))
        put(sl, m, t, rr, ii, pid, oid, True)
    if wall is not None:
        t = y1 - 0.6 - y0p; X = x0p + t; Z = KZ * t; Y = np.full(X.shape, y1 - 0.6)
        m = (Z >= ze - 0.01) & (Z <= zr - k * np.abs(X - xc)) & (np.abs(X - xc) < hw - 0.8)
        rr, ii = _apply_tex(endtex, 'e', X, Y, Z, wall, np.full(X.shape, 2))
        put(sl, m, t, rr, ii, pid, oid, True)

def ground(func):
    sl = (slice(0, H), slice(0, W))
    t = np.zeros((H, W)); X = X0P + t; Y = Y0P + t
    r, i = func(X, Y)
    _pid[0] += 1
    put(sl, np.ones((H, W), bool), t, r, i, _pid[0], 1, True)

def hash2(a, b):
    a = np.asarray(a, np.int64); b = np.asarray(b, np.int64)
    h = (a * 374761393 + b * 668265263) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return (h ^ (h >> 16)) & 0xffff

def band_curve(pts, half, zt, ramp, idx, oid=0, lit=True, zclear=None):
    """Draw a horizontal band (top surface at height zt) within distance `half` of polyline pts."""
    pts = np.asarray(pts)
    xs = pts[:, 0]; ys = pts[:, 1]
    sl = sbbox(xs.min() - half, ys.min() - half, 0, xs.max() + half, ys.max() + half, zt)
    if sl is None: return
    _pid[0] += 1; pid = _pid[0]
    x0p = X0P[sl]; y0p = Y0P[sl]
    t = zt / KZ; X = x0p + t; Y = y0p + t
    best = np.full(X.shape, 1e9)
    for k in range(0, len(pts), 1):
        d = (X - xs[k]) ** 2 + (Y - ys[k]) ** 2
        best = np.minimum(best, d)
    m = best <= half * half
    put(sl, m, np.full(X.shape, t), R(ramp), np.full(X.shape, idx), pid, oid, lit)

def oriented_rect(cx, cy, tx, ty, hl, hw, zt, ramp, idx, oid=0, tex=None):
    sl = sbbox(cx - 6, cy - 6, 0, cx + 6, cy + 6, zt)
    if sl is None: return
    _pid[0] += 1; pid = _pid[0]
    x0p = X0P[sl]; y0p = Y0P[sl]
    t = zt / KZ; X = x0p + t; Y = y0p + t
    a = (X - cx) * tx + (Y - cy) * ty; b = -(X - cx) * ty + (Y - cy) * tx
    m = (np.abs(a) < hl) & (np.abs(b) < hw)
    ii = np.full(X.shape, idx)
    if tex is not None: ii = tex(a, b, ii)
    put(sl, m, np.full(X.shape, t), R(ramp), ii, pid, oid, True)
    # visible side edge (thin dark lip) one unit lower
    t2 = (zt - 0.7) / KZ; X = x0p + t2; Y = y0p + t2
    a = (X - cx) * tx + (Y - cy) * ty; b = -(X - cx) * ty + (Y - cy) * tx
    m = (np.abs(a) < hl) & (np.abs(b) < hw)
    put(sl, m, np.full(X.shape, t2), R(ramp), np.full(X.shape, min(idx + 1, 4)), pid, oid, False)

# ---------------- shadows / outlines / sprites ----------------
LS = np.array([-0.55, 0.15, 1.0])
def cast_shadows():
    sel = (RB >= 0) & LB
    ys, xs = np.nonzero(sel)
    qx = QX[ys, xs]; qy = QY[ys, xs]; qz = QZ[ys, xs]; pid = PB[ys, xs]
    sh = np.zeros(len(ys), bool)
    for (x0, y0, z0, x1, y1, z1), opid, kind, extra in OCC:
        cand = (~sh) & (qz < z1 - 0.05) & (qx >= x0 - 0.1) & (qx <= x1 + 0.55 * (z1 - qz) + 0.1) & \
               (qy <= y1 + 0.1) & (qy >= y0 - 0.15 * (z1 - qz) - 0.1) & (pid != opid)
        ci = np.nonzero(cand)[0]
        if len(ci) == 0: continue
        px = qx[ci]; py = qy[ci]; pz = qz[ci]
        if kind == 'sph':
            xc, yc, zc, r, sz = extra
            ox = px - xc; oy = py - yc; oz = (pz - zc) / sz
            dx, dy, dz = LS[0], LS[1], LS[2] / sz
            a = dx * dx + dy * dy + dz * dz; b = 2 * (ox * dx + oy * dy + oz * dz); c = ox * ox + oy * oy + oz * oz - r * r
            disc = b * b - 4 * a * c
            s = (-b + np.sqrt(np.maximum(disc, 0))) / (2 * a)
            hit = (disc >= 0) & (s > 0.2)
        else:
            tmin = np.full(len(ci), -1e9); tmax = np.full(len(ci), 1e9)
            for p, lo, hi, d in ((px, x0, x1, LS[0]), (py, y0, y1, LS[1]), (pz, z0, z1, LS[2])):
                s0 = (lo - p) / d; s1 = (hi - p) / d
                tmin = np.maximum(tmin, np.minimum(s0, s1)); tmax = np.minimum(tmax, np.maximum(s0, s1))
            hit = (tmax >= np.maximum(tmin, 0.25))
        sh[ci[hit]] = True
    yy = ys[sh]; xx = xs[sh]
    IB[yy, xx] = np.minimum(IB[yy, xx] + 1, RLEN[RB[yy, xx]] - 1)
    return sh.sum()

def outlines():
    o = OB.copy(); d = DB
    res = []
    for oid in OUTLINE:
        m = o == oid
        if not m.any(): continue
        edge = np.zeros_like(m)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            on = np.roll(np.roll(o, dy, 0), dx, 1); dn = np.roll(np.roll(d, dy, 0), dx, 1)
            edge |= m & (on != oid) & (dn < d - 3.0)
        res.append(edge)
    for edge in res:
        IB[edge] = RLEN[RB[edge]] - 1

def darken_blob(x, y, z, rx=2.2, ry=1.2, dxo=1.6):
    sx, sy = proj(x, y, z)
    sl = (slice(max(0, int(sy) - 6), min(H, int(sy) + 6)), slice(max(0, int(sx) - 8), min(W, int(sx) + 12)))
    x0p = X0P[sl]; y0p = Y0P[sl]; t = z / KZ
    X = x0p + t; Y = y0p + t
    m = (((X - x - dxo) / rx) ** 2 + ((Y - y) / ry) ** 2 <= 1) & (np.abs(DB[sl] - (X + Y + z)) < 0.8)
    IB[sl][m] = np.minimum(IB[sl][m] + 1, RLEN[RB[sl][m]] - 1)

def sprite(rows, cmap, x, y, z, mirror=False, outline=True, oid=None, dz=0.5):
    """rows: list of strings; cmap: char->(ramp, idx). Foot centre at world (x,y,z)."""
    if mirror: rows = [r[::-1] for r in rows]
    h = len(rows); w = len(rows[0])
    sx, sy = proj(x, y, z)
    left = int(math.floor(sx)) - w // 2; base = int(math.floor(sy)) - 1
    if oid is None: oid = new_oid()
    grid = {}
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch == '.' or ch == ' ': continue
            grid[(left + c, base - (h - 1 - r))] = cmap[ch]
    pts = dict(grid)
    if outline:
        for (px, py), (rn, ii) in grid.items():
            for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (px + ddx, py + ddy)
                if q in grid or q in pts: continue
                pts[q] = (rn, RLEN[R(rn)] - 1)
    for (px, py), (rn, ii) in pts.items():
        if not (0 <= px < W and 0 <= py < H): continue
        rb = base - py
        D = x + y + z + rb / ZS + dz
        if D > DB[py, px]:
            DB[py, px] = D; RB[py, px] = R(rn); IB[py, px] = min(ii, RLEN[R(rn)] - 1); OB[py, px] = oid
    return oid

def pix(px, py, rn, ii, D=None):
    if 0 <= px < W and 0 <= py < H and (D is None or D > DB[py, px]):
        RB[py, px] = R(rn); IB[py, px] = ii
        if D is not None: DB[py, px] = D

FONT = {
 'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],'C':['011','100','100','100','011'],
 'D':['110','101','101','101','110'],'E':['111','100','110','100','111'],'F':['111','100','110','100','100'],
 'G':['011','100','101','101','011'],'H':['101','101','111','101','101'],'I':['111','010','010','010','111'],
 'K':['101','101','110','101','101'],'L':['100','100','100','100','111'],'M':['101','111','111','101','101'],
 'N':['101','111','111','111','101'],'O':['010','101','101','101','010'],'P':['110','101','110','100','100'],
 'R':['110','101','110','101','101'],'S':['011','100','010','001','110'],'T':['111','010','010','010','010'],
 'U':['101','101','101','101','111'],'W':['101','101','111','111','101'],'Y':['101','101','010','010','010'],
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['110','001','010','100','111'],
 '3':['110','001','010','001','110'],'4':['101','101','111','001','001'],'5':['111','100','110','001','110'],
 '6':['011','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],
 '9':['111','101','111','001','110'],':':['0','1','0','1','0'],'.':['0','0','0','0','1'],' ':['0','0','0','0','0'],
 '-':['000','000','111','000','000'],'&':['010','101','010','101','011'],
}
def text_on_yface(x, yface, z, s, rn, ii, oid=None, shade2=None):
    """Write text on a +y face; (x,z) = top-left of text in world. Columns slope 1px per 2 px."""
    sx, sy = proj(x, yface, z)
    sx = int(math.floor(sx)); sy = int(math.floor(sy))
    col = 0
    for ch in s:
        g = FONT[ch]
        off = (col + 1) // 2
        for c in range(len(g[0])):
            for r in range(5):
                if g[r][c] == '1':
                    px = sx + col + c; py = sy + r + off
                    if 0 <= px < W and 0 <= py < H and (oid is None or OB[py, px] == oid):
                        RB[py, px] = R(rn); IB[py, px] = ii
        col += len(g[0]) + 1
    return col

def render():
    img = PAL[np.clip(RB, 0, None), IB]
    img[RB < 0] = PAL[R('grass'), 1]
    return img

SHADOW_RGBA = (43, 32, 38, 92)   # ground shadow: the ink colour at about 36% (one palette step darker on grass)

def shadow_catcher(x0, y0, x1, y1, z=0.0):
    """An invisible ground rectangle that only keeps the shadows falling on it."""
    sl = sbbox(x0, y0, z, x1, y1, z, pad=0)
    if sl is None: return
    _pid[0] += 1
    t = np.full(X0P[sl].shape, z / KZ); X = X0P[sl] + t; Y = Y0P[sl] + t
    m = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1)
    put(sl, m, t - 1e-3, R('gnd'), np.zeros(X.shape, int), _pid[0], 1, True)

def render_rgba():
    """RGBA image of the canvas: empty pixels transparent, shadow-catcher pixels a translucent shadow or nothing."""
    img = np.zeros((H, W, 4), np.uint8)
    rb = np.clip(RB, 0, None)
    img[..., :3] = PAL[rb, np.minimum(IB, ML - 1)]
    img[..., 3] = 255
    img[RB < 0] = 0
    g = RB == R('gnd')
    img[g] = 0
    img[g & (IB > 0)] = SHADOW_RGBA
    return img

def blob_shadow(img, x, y, z, rx=2.2, ry=1.2, dxo=1.6):
    """Paint a soft oval contact shadow (translucent) into an RGBA image where it is empty."""
    sl = (slice(0, H), slice(0, W))
    t = z / KZ; X = X0P + t; Y = Y0P + t
    m = (((X - x - dxo) / rx) ** 2 + ((Y - y) / ry) ** 2 <= 1) & (img[..., 3] == 0)
    img[m] = SHADOW_RGBA
