# Rolling stock: the green and cream 4-4-0 with its tender, a black freight engine, coach, boxcar, flatcar, steam.
# Each draw function puts the vehicle's centre (half its coupled length) on the origin, on a track along x, facing
# +x (d = +1) or -x (d = -1). `phase` turns the wheels and moves the rods (radians).
#
# The shapes keep the mockup's drawing (in MU); SPEC stretches each vehicle on its canvas to the contract's sizes
# (plans/proto-sprites.md: loco with tender 8.8 x 2.0 x 3.2 u, coach 5.6 x 2.0 x 2.8, boxcar 5.0 x 2.0 x 2.7,
# flatcar 5.0 x 2.0 x 0.9) and sets the rail height so the wheels stand on the contract's rail top (0.34 u).
import math
import numpy as np
import engine as E
from engine import R, box, cyl_x, cyl_z, sphere, disc_y, new_oid, hash2
import shapes as S
from shapes import Car, crate, sack, barrel

RAIL_TOP = 0.34 * E.U_Y        # contract rail top, in MU above the ground (1.81)

# name: (drawn length in MU before stretching, canvas scale (along, across, up))
SPEC = {
    'loco':    (35.2, (1.0, 0.8, 0.82)),
    'coach':   (28.0, (0.8, 0.8, 0.84)),
    'boxcar':  (20.0, (1.0, 0.8, 0.92)),
    'flatcar': (20.0, (1.0, 0.8, 0.78)),
}
RAIL = 2.4


def set_rail(kz):
    """Rail height in the vehicle's frame so that, stretched by kz, it lands on the contract's rail top."""
    global RAIL
    RAIL = RAIL_TOP / kz
    S.RAIL = RAIL


def _wheel(c, u, r, ramp, kind, y, oid, spokes=8, phase=0.0):
    disc_y(c.x(u), E.wheel_zc(RAIL, r), r, c.yc + y, ramp, kind=kind, oid=oid, spokes=spokes, phase=phase)


def _rod(c, x0, z0, x1, z1, y0, y1, ramp, oid, th=0.5, shades=(1, 1, 2)):
    """A thin rod between two points in the x-z plane, drawn as short boxes (rods slope a little)."""
    n = max(1, int(abs(x1 - x0) / 0.5))
    for k in range(n):
        a = x0 + (x1 - x0) * k / n; b = x0 + (x1 - x0) * (k + 1) / n
        z = z0 + (z1 - z0) * (k + 0.5) / n
        box(min(a, b), c.yc + y0, z - th / 2, max(a, b), c.yc + y1, z + th / 2, ramp, shades=shades, oid=oid, cast=False)


def engine(xr, d=1, phase=0.0, kind='passenger'):
    """The engine alone, its rear at x = xr (in the facing direction), 24 MU long (the pilot sticks out 1.4)."""
    L = 24
    c = Car(xr, L, 0, d)
    yc = 0
    o = new_oid(True)
    if kind == 'passenger':
        boiler, cab, body, wheelc = 'green', 'green', 'green', 'red'
        drivers, dr, leading = (4.6, 11.0), 3.6, (17.0, 20.2)
    else:
        boiler, cab, body, wheelc = 'blk', 'red', 'red', 'red'
        drivers, dr, leading = (3.8, 8.6, 13.4), 3.0, (19.4,)
    # frame and cylinders
    c.box(2, 22, -3.5, 3.5, 2.5, 4.5, 'iron', shades=(2, 3, 3), oid=o)
    c.box(16, 21, -3, 3, 4.5, 8.0, 'iron', shades=(2, 3, 3), oid=o)
    c.box(17.5, 21.5, 3.2, 5.6, 2.5, 6.0, boiler, shades=(1, 2, 3), oid=o)
    c.box(17.2, 17.7, 3.2, 5.7, 2.4, 6.1, 'brass', shades=(1, 1, 2), oid=o)
    # running board
    c.box(7, 21.5, -4.3, 4.3, 6.6, 7.1, 'iron', shades=(2, 3, 3), oid=o)
    # boiler with bands (brass on the passenger engine, iron on the freight engine)
    bandc = 'brass' if kind == 'passenger' else 'iron'
    def bands(face, X, Y, Z, idx):
        u = (X - c.xr) if d > 0 else (c.xr + c.L - X)
        bnd = (np.abs(u - 10) < 0.45) | (np.abs(u - 14) < 0.45) | (np.abs(u - 18) < 0.45)
        rr = np.where(bnd, R(bandc), R(boiler))
        ii = np.where(bnd, np.minimum(idx, 2) if kind == 'passenger' else np.minimum(idx, 1), idx)
        return rr, ii
    a, b = c.X(7, 20.2)
    cyl_x(a, b, yc, RAIL + 10.4, 3.4, boiler, oid=o, tex=bands)
    a, b = c.X(20, 23)
    cyl_x(a, b, yc, RAIL + 10.2, 3.7, 'iron', oid=o, th=(0.8, 0.5, 0.0))
    # balloon stack (passenger) or straight stack (freight)
    xs = c.x(21.4)
    if kind == 'passenger':
        cyl_z(xs, yc, RAIL + 13.0, RAIL + 16.5, 1.1, 'iron', oid=o)
        cyl_z(xs, yc, RAIL + 16.5, RAIL + 17.5, 1.7, 'iron', oid=o)
        cyl_z(xs, yc, RAIL + 17.5, RAIL + 18.5, 2.3, 'iron', oid=o)
        cyl_z(xs, yc, RAIL + 18.5, RAIL + 20.5, 2.7, 'iron', oid=o, topidx=2)
        cyl_z(xs, yc, RAIL + 20.5, RAIL + 21.3, 2.0, 'iron', oid=o, topidx=3)
    else:
        cyl_z(xs, yc, RAIL + 13.0, RAIL + 19.5, 1.3, 'iron', oid=o)
        cyl_z(xs, yc, RAIL + 19.5, RAIL + 20.5, 1.7, 'iron', oid=o, topidx=3)
    # domes and bell
    domec = 'brass' if kind == 'passenger' else 'blk'
    cyl_z(c.x(15), yc, RAIL + 12.8, RAIL + 15.3, 1.5, domec, oid=o)
    sphere(c.x(15), yc, RAIL + 15.3, 1.5, domec, oid=o, sz=0.8)
    cyl_z(c.x(10.5), yc, RAIL + 12.8, RAIL + 14.6, 1.2, domec, oid=o)
    sphere(c.x(10.5), yc, RAIL + 14.6, 1.2, domec, oid=o, sz=0.8)
    sphere(c.x(12.7), yc, RAIL + 14.6, 0.8, 'brass', oid=o)   # bell
    # headlamp (box lamp on the smokebox)
    c.box(20.6, 23.2, -1.4, 1.4, 13.6, 16.8, body if body != boiler else 'ochre', shades=(1, 2, 3), oid=o)
    c.box(20.4, 23.4, -1.7, 1.7, 16.8, 17.4, 'iron', shades=(2, 3, 3), oid=o)
    if d > 0:   # the lens shows only when the front faces the viewer's right (+x)
        x = c.x(23.2)
        box(x, -0.9, RAIL + 14.2, x + 0.4, 0.9, RAIL + 16.2, 'fire', shades=(0, 0, 0), oid=o, cast=False)
    # cab
    def cabtex(face, X, Y, Z, idx):
        z = Z - RAIL
        u = (X - c.xr) if d > 0 else (c.xr + c.L - X)
        ii = idx.copy(); rr = np.full(X.shape, R(cab))
        if face == 'l':
            win = (z > 11.0) & (z < 15.0) & (((u > 1.3) & (u < 3.3)) | ((u > 4.2) & (u < 6.0)))
            rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(z > 13.6, 0, 2), ii)
            trim = (np.abs(z - 10.3) < 0.5)
            rr = np.where(trim, R('cream'), rr); ii = np.where(trim, 1, ii)
        if face == 'r':
            yy = Y - yc
            win = (z > 11.0) & (z < 15.0) & (np.abs(yy) > 1.0) & (np.abs(yy) < 3.6)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, 3, ii)
        return rr, ii
    c.box(0, 7, -4.6, 4.6, 6.0, 17, cab, oid=o, tex=cabtex)
    c.box(-0.6, 7.6, -5.4, 5.4, 17, 17.8, 'iron', shades=(1, 3, 3), oid=o)
    c.box(0.2, 6.8, -4.4, 4.4, 17.8, 18.4, 'iron', shades=(2, 3, 3), oid=o)
    # drivers, side rod and main rod. A wheel rolling towards +x turns clockwise as seen here.
    spin = phase if d > 0 else -phase
    for u in drivers:
        _wheel(c, u, dr, wheelc, 'wheel', 5.2, o, spokes=6 if kind == 'passenger' else 8, phase=spin)
    rc = dr * 0.5
    zc = E.wheel_zc(RAIL, dr)
    cx, cz = rc * math.cos(-spin), rc * math.sin(-spin) * E.SC[0] / E.SC[2]
    pins = [(c.x(u) + cx, zc + cz) for u in drivers]
    xa, xb = min(p[0] for p in pins), max(p[0] for p in pins)
    box(xa - 0.4, yc + 5.6, pins[0][1] - 0.3, xb + 0.4, yc + 6.1, pins[0][1] + 0.3, 'iron', shades=(0, 0, 2), oid=o, cast=False)
    front_pin = max(pins, key=lambda p: p[0]) if d > 0 else min(pins, key=lambda p: p[0])
    xh = c.x(17.6)
    _rod(c, front_pin[0], front_pin[1], xh, RAIL + 3.8, 6.1, 6.6, 'brass', o)
    for (px, pz) in pins:
        box(px - 0.4, yc + 6.1, pz - 0.4, px + 0.4, yc + 6.7, pz + 0.4, 'brass', shades=(0, 0, 1), oid=o, cast=False)
    for u in leading:
        _wheel(c, u, 1.7, wheelc, 'small', 4.6, o, phase=spin)
    # pilot (cowcatcher)
    def pilot(face, X, Y, Z, idx):
        return None, np.where((np.floor((Y - yc) * 1.0) % 2 == 0), idx, np.minimum(idx + 1, 3))
    c.box(22.5, 24.0, -4.0, 4.0, 0.4, 3.6, 'red', oid=o, tex=pilot)
    c.box(24.0, 25.4, -3.0, 3.0, 0.4, 2.2, 'red', oid=o, tex=pilot)
    c.box(22.4, 24.2, -4.4, 4.4, 3.6, 4.4, 'iron', shades=(1, 2, 3), oid=o)
    return o


def tender(xr, d=1, kind='passenger'):
    """The tender alone, its rear at x = xr (in the facing direction), 11 MU long."""
    L = 11
    c = Car(xr, L, 0, d); yc = 0; o = new_oid(True)
    ramp = 'green' if kind == 'passenger' else 'red'
    def tt(face, X, Y, Z, idx):
        z = Z - RAIL
        rr = np.full(X.shape, R(ramp)); ii = idx.copy()
        if face == 'l':
            band = np.abs(z - 8.0) < 0.5
            rr = np.where(band, R('cream' if kind == 'passenger' else 'ochre'), rr); ii = np.where(band, 1, ii)
        return rr, ii
    c.box(0.5, 10.5, -4, 4, 1.4, 2.8, 'iron', shades=(2, 3, 3), oid=o)
    c.box(0, 11, -5, 5, 2.8, 9.5, ramp, oid=o, tex=tt)
    def logs(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            ii = np.where((np.floor(Y * 0.9) % 2) == 0, 1, 2)
            h = hash2(np.floor(X / 2.5).astype(int), np.floor(Y * 0.9).astype(int)) % 4
            ii = np.where(h == 0, ii + 1, ii)
            return rr, ii
        if face == 'l':
            ii = np.where(((X % 2.2) < 1.1), 2, 3)
            ii = np.where(((Z % 1.6) < 0.5), 3, ii)
            return rr, ii
        ii = np.where(((Y % 1.4) < 0.7) & ((Z % 1.5) > 0.5), 1, 3)
        return rr, ii
    c.box(1.0, 8.0, -4, 4, 9.5, 11.5, 'wood', oid=o, tex=logs)
    for u in (2.0, 4.6, 6.6, 9.2):
        _wheel(c, u, 1.5, 'iron', 'small', 4.2, o)
    return o


def loco(d=1, phase=0.0, kind='passenger'):
    """Engine and tender as one vehicle (the contract's veh/loco): 35.2 MU, centred, the engine at the front."""
    half = SPEC['loco'][0] / 2
    if d > 0:
        tender(-half, d, kind)
        engine(-half + 11.2, d, phase, kind)
    else:
        engine(-half, d, phase, kind)          # Car with d < 0 puts u = 0 at the +x end of [xr, xr + L]
        tender(half - 11, d, kind)
    return None


def coach(d=1):
    """Green and cream coach, 28 MU before stretching (5.6 u), with two side doors at 1/4 and 3/4 of its length."""
    L = 28
    xr = -L / 2; yc = 0
    c = Car(xr, L, yc, d); o = new_oid(True)
    doors = (L / 4, 3 * L / 4)
    def body(face, X, Y, Z, idx):
        z = Z - RAIL
        rr = np.full(X.shape, R('green')); ii = idx.copy()
        if face == 'l':
            u = X - xr
            indoor = np.zeros(X.shape, bool)
            for du in doors:
                indoor |= np.abs(u - du) < 1.5
            band = (z > 7.0) & (z < 11.4)
            rr = np.where(band, R('cream'), rr); ii = np.where(band, np.where(z > 10.6, 0, 1), ii)
            wu = (u - 3.0) % 2.4
            win = band & (z > 7.8) & (z < 10.6) & (wu < 1.4) & (u > 2.4) & (u < 25.6) & ~indoor
            rr = np.where(win, R('glass'), rr)
            ii = np.where(win, np.where((z > 9.8) & (wu < 0.6), 0, np.where(z > 9.0, 2, 3)), ii)
            lb = (z > 11.4) & (z < 12.6)
            ii = np.where(lb & ~band, 1, ii)
            lw = (z < 7.0) & (z > 6.3)
            ii = np.where(lw, 3, ii)
            panel = (z < 6.0) & (((u - 3.0) % 4.8) < 0.5) & ~indoor
            ii = np.where(panel, 3, ii)
            # side doors: dark wood with a small window, cream frame
            for du in doors:
                dfr = (np.abs(u - du) < 1.5) & (z < 11.0)
                dr = (np.abs(u - du) < 1.0) & (z < 10.5)
                rr = np.where(dfr, R('cream'), rr); ii = np.where(dfr, 2, ii)
                rr = np.where(dr, R('wood'), rr); ii = np.where(dr, np.where(np.abs(u - du) < 0.35, 3, 2), ii)
                dw = dr & (z > 7.8) & (z < 9.8)
                rr = np.where(dw, R('glass'), rr); ii = np.where(dw, np.where(z > 9.2, 1, 2), ii)
        if face == 'r':
            yy = Y - yc
            door = (np.abs(yy) < 1.2) & (z < 10.5)
            rr = np.where(door, R('wood'), rr); ii = np.where(door, 3, ii)
            win = (np.abs(yy) > 2.0) & (np.abs(yy) < 3.8) & (z > 7.8) & (z < 10.6)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, 3, ii)
        return rr, ii
    c.box(1.5, 26.5, -4, 4, 1.2, 2.6, 'iron', shades=(2, 3, 3), oid=o)
    c.box(2, 26, -5, 5, 2.6, 12.6, 'green', oid=o, tex=body)
    c.box(1.2, 26.8, -5.8, 5.8, 12.6, 13.4, 'roof', shades=(2, 3, 3), oid=o)
    def clere(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('green')); ii = idx.copy()
        if face == 'l':
            w = (((X - xr) % 2.4) < 1.2) & (Z - RAIL > 13.9) & (Z - RAIL < 14.9)
            rr = np.where(w, R('glass'), rr); ii = np.where(w, 1, ii)
        return rr, ii
    c.box(4, 24, -2.2, 2.2, 13.4, 15.0, 'green', oid=o, tex=clere)
    c.box(3.4, 24.6, -2.8, 2.8, 15.0, 15.6, 'roof', shades=(1, 3, 3), oid=o)
    # end platforms with railings
    for (u0, u1) in ((0, 2), (26, 28)):
        c.box(u0, u1, -4, 4, 2.0, 2.8, 'wood', shades=(1, 2, 3), oid=o)
        c.box(u0, u1, 3.6, 4.2, 2.8, 6.4, 'iron', shades=(1, 2, 3), oid=o, faces='tl')
        c.box(u0, u1, 3.4, 4.4, 6.0, 6.6, 'brass', shades=(1, 2, 2), oid=o)
    # steps under the side doors
    for du in doors:
        c.box(du - 1.2, du + 1.2, 5.0, 5.8, 1.0, 1.6, 'iron', shades=(1, 2, 3), oid=o)
    for u in (3.4, 6.2, 21.8, 24.6):
        _wheel(c, u, 1.5, 'iron', 'small', 4.4, o)
    return o


def boxcar(d=1, open_door=False):
    return S.boxcar(-SPEC['boxcar'][0] / 2, 0, d, open_door=open_door, ramp='ochre')


def flatcar(d=1, load=None):
    """Flatcar, 20 MU (5 u)."""
    L = 20
    xr = -L / 2; yc = 0
    c = Car(xr, L, yc, d); o = new_oid(True)
    c.box(0.6, L - 0.6, -4, 4, 1.2, 2.6, 'iron', shades=(2, 3, 3), oid=o)
    def deck(face, X, Y, Z, idx):
        if face == 't':
            return None, np.where(((Y - yc) % 1.6) < 0.45, 2, np.where(hash2(np.floor(X / 4).astype(int), np.floor((Y - yc) / 1.6).astype(int)) % 4 == 0, 0, 1))
        ii = np.where(((X - xr) % 2.0) < 0.5, 3, idx)
        return None, ii
    c.box(0, L, -5, 5, 2.6, 4.0, 'wood', oid=o, tex=deck)
    # stake pockets along the side
    for u in np.arange(2.0, L - 1, 4.0):
        c.box(u - 0.3, u + 0.3, 4.9, 5.3, 2.4, 4.4, 'iron', shades=(1, 2, 3), oid=o)
    for u in (2.6, 5.0, L - 5.0, L - 2.6):
        _wheel(c, u, 1.5, 'iron', 'small', 4.4, o)
    if load == 'goods':
        x0 = xr
        crate(x0 + 2.4, -3.0, RAIL + 4.0, 3.0, 3.0, 2.6, oid=o)
        crate(x0 + 5.8, -2.6, RAIL + 4.0, 2.6, 2.6, 2.4, ramp='ochre', oid=o)
        barrel(x0 + 11.0, -1.0, RAIL + 4.0, 1.3, 3.0)
        sack(x0 + 15.0, 1.5, RAIL + 4.0, oid=o); sack(x0 + 16.4, -0.8, RAIL + 4.0, oid=o)
    return o


def smoke(r, seed=0):
    """A puff centred on the origin."""
    o = new_oid(False)
    rnd = np.random.RandomState(seed)
    sphere(0, 0, 0, r, 'smoke', oid=o, cast=False, th=(0.75, 0.35, -0.2), noise=0.25, seed=seed)
    for k in range(2):
        a = rnd.uniform(0, 6.28)
        sphere(math.cos(a) * r * 0.6, math.sin(a) * r * 0.6, r * rnd.uniform(-0.2, 0.3), r * 0.65, 'smoke',
               oid=o, cast=False, th=(0.75, 0.35, -0.2), noise=0.25, seed=seed + k + 1)
    return o
