# Shape library: textures, rolling stock, buildings and props, built from the engine's primitives.
# Taken from the approved mockup's scene code and adapted so each object can be drawn on its own canvas
# (for a sprite), in either direction, and with animation phases for wheels and rods.
# All sizes are in mockup units (MU): 4 MU = 1 game unit along x/z, 16/3 MU = 1 game unit up. See engine.py.
import math
import numpy as np
import engine as E
from engine import (R, box, cyl_x, cyl_z, sphere, disc_y, gable_x, gable_y, hash2, band_curve,
                    oriented_rect, new_oid, proj, pix)

YB, YA = 0, 32          # (mockup scene only)
PZ = 4                  # platform height (0.75 game units)
RAIL = 2.4              # rail top (0.45 game units)

# ======================= textures =======================
def tex_grass(X, Y):
    lf = np.sin(X * 0.11 + Y * 0.05) + 0.8 * np.sin(Y * 0.17 - X * 0.07 + 1.3) + 0.5 * np.sin((X + Y) * 0.31)
    lf = lf / 2.3
    v = lf + (E.BAY - 0.5) * 0.9
    i = np.where(v > 0.55, 0, np.where(v > -0.35, 1, 2))
    h = hash2(np.floor(X * 2).astype(int), np.floor(Y * 2).astype(int)) % 97
    i = np.where(h == 3, 3, i); i = np.where((h == 7) & (i > 0), i - 1, i)
    return np.full(X.shape, R('grass')), i

def tex_ground(X, Y):
    r, i = tex_grass(X, Y)
    # dirt street
    street = (Y > -31) & (Y < -9)
    edge = ((Y > -32.5) & (Y <= -31)) | ((Y >= -9) & (Y < -7.5))
    hd = hash2(np.floor(X * 2).astype(int) + 5, np.floor(Y * 2).astype(int)) % 100
    di = np.where(hd < 12, 0, 1)
    rut = (np.abs(Y + 23) < 0.6) | (np.abs(Y + 19) < 0.6) | (np.abs(Y + 15) < 0.5)
    di = np.where(rut, 2, di)
    di = np.where((hd > 95), 2, di)
    r = np.where(street, R('dirt'), r); i = np.where(street, di, i)
    # ragged dithered street edge
    eg = edge & (E.BAY > 0.45)
    r = np.where(eg, R('dirt'), r); i = np.where(eg, 1, i)
    # worn path to platform end and across tracks
    path = (X > 100) & (X < 110) & (Y > -10) & (Y < 26)
    pe = path & (hd < 80)
    r = np.where(pe, R('dirt'), r); i = np.where(pe, np.where(hd < 15, 0, 1), i)
    # wheat field in the foreground
    fld = (X > 37) & (X < 95) & (Y > 63) & (Y < 103)
    row = (np.floor(Y / 1.5) % 2 == 0)
    hw_ = hash2(np.floor(X * 2).astype(int), np.floor(Y * 2).astype(int)) % 9
    r = np.where(fld, R('ochre'), r)
    i = np.where(fld, np.where(row, np.where(hw_ == 0, 1, 0), np.where(hw_ < 2, 2, 1)), i)
    # dirt road from the foreground to the platform ramp, and a lane up from the street
    road = ((X > 101) & (X < 109) & (Y > 25) & (Y < 160)) | ((X > 2) & (X < 10) & (Y < -31) & (Y > -140))
    rd = road & ~(((X > 101) & (X < 102)) & (E.BAY > 0.5)) & ~(((X > 108) & (X < 109)) & (E.BAY > 0.5))
    r = np.where(rd, R('dirt'), r); i = np.where(rd, np.where(hd < 10, 0, np.where(hd > 92, 2, 1)), i)
    # bare patch in front of the smithy
    sp = ((X + 2) ** 2 / 90 + (Y + 29) ** 2 / 12) < 1
    return r, i

def tex_ballast(face, X, Y, Z, idx):
    h = hash2(np.floor(X * 2).astype(int), np.floor(Y * 2 + Z).astype(int)) % 6
    rr = np.where(h < 2, R('iron'), R('dirt'))
    ii = np.where(h < 2, 1, np.where(h < 4, 1, 0))
    if face == 't':
        ii = np.where(h == 5, 2, ii)
    else:
        ii = np.where(h < 2, 2, 2)
    return rr, ii

def tex_planks(face, X, Y, Z, idx):
    rr = np.full(X.shape, R('wood'))
    if face == 't':
        row = np.floor(Y / 2.5).astype(int)
        fy = Y - row * 2.5
        off = (row * 7) % 19
        seg = np.floor((X + off) / 19).astype(int)
        fx = (X + off) - seg * 19
        h = hash2(row, seg) % 9
        ii = np.where(h == 0, 0, np.where(h == 3, 2, 1))
        ii = np.where(fy < 0.55, 2, ii)
        ii = np.where((fx < 0.45), 2, ii)
        return rr, ii
    if face == 'l':
        ii = np.where(Z > PZ - 1.0, 1, 2)   # lit front lip
        ii = np.where((Z < 1.0), 3, ii)
        post = ((X % 12) < 1.0)
        ii = np.where(post & (Z <= PZ - 1.0), 3, ii)
        return rr, ii
    return rr, idx

def tex_tie(face, X, Y, Z, idx):
    h = hash2(np.floor(X).astype(int), 3) % 5
    rr = np.full(X.shape, R('wood'))
    if face == 't':
        ii = np.where(h == 0, 2, 3)
        ii = np.where((np.abs(Y - 3) < 0.4) | (np.abs(Y + 3) < 0.4), 3, ii)
        return rr, np.where(h == 4, 2, ii)
    return rr, np.full(X.shape, 4)

def tex_clapboard(base_light=1):
    def f(face, X, Y, Z, idx):
        rr = None
        ii = idx.copy()
        lap = (Z % 2.0) < 0.55
        ii = np.where(lap, np.minimum(idx + 1, 4), ii)
        return rr, ii
    return f

def tex_batten(face, X, Y, Z, idx):
    c = X if face == 'l' else Y
    f = c % 3.0
    ii = np.where(f < 0.6, np.maximum(idx - 1, 0), np.where(f < 1.1, np.minimum(idx + 1, 4), idx))
    return None, ii

def tex_shingle(face, X, Y, Z, idx):
    rr = None
    rowc = Z
    ii = idx.copy()
    band = (np.floor(Z * 1.0) % 2 == 0)
    off = np.where(band, 0, 1.5)
    c = (X if face in ('f', 'b') else Y)
    ii = np.where((Z % 2.0) < 0.6, np.minimum(idx + 1, 4), ii)
    ii = np.where(((c + off) % 3.0) < 0.5, np.minimum(idx + 1, 4), ii)
    return rr, ii

# ======================= track =======================
def track_x(yc, x0, x1, oid_rails):
    box(x0, yc - 7, 0, x1, yc + 7, 0.7, 'dirt', shades=(1, 2, 3), tex=tex_ballast, cast=False)
    x = x0 - (x0 % 3)
    while x < x1:
        box(x, yc - 5, 0.7, x + 1.5, yc + 5, 1.4, 'wood', tex=tex_tie, cast=False)
        x += 3
    for yr in (yc - 3, yc + 3):
        box(x0, yr - 0.5, 1.4, x1, yr + 0.5, RAIL, 'iron', shades=(0, 3, 3), oid=oid_rails, cast=False)

def track_curve(pts, oid_rails, ties=True):
    pts = np.asarray(pts, float)
    tang = np.gradient(pts, axis=0); tang /= np.linalg.norm(tang, axis=1)[:, None]
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    # ballast
    band_curve(pts, 6.5, 0.7, 'dirt', 1)
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    if ties:
        s = 1.5
        while s < seg[-1]:
            k = np.searchsorted(seg, s)
            k = min(k, len(pts) - 1)
            def tt(a, b, ii):
                return np.where((np.abs(np.abs(b) - 3) < 0.45), 3, ii)
            oriented_rect(pts[k, 0], pts[k, 1], tang[k, 0], tang[k, 1], 0.75, 5, 1.4, 'wood', 3, tex=tt)
            s += 3
    for sgn in (-1, 1):
        rp = pts + sgn * 3 * nrm
        band_curve(rp, 0.55, 1.75, 'iron', 3)
        band_curve(rp, 0.5, RAIL, 'iron', 0, oid=oid_rails)

# ======================= rolling stock =======================
class Car:
    def __init__(s, xr, L, yc, d):
        s.xr, s.L, s.yc, s.d = xr, L, yc, d
    def X(s, u0, u1):
        if s.d > 0: return s.xr + u0, s.xr + u1
        return s.xr + s.L - u1, s.xr + s.L - u0
    def x(s, u):
        return s.xr + u if s.d > 0 else s.xr + s.L - u
    def box(s, u0, u1, y0, y1, z0, z1, ramp, **kw):
        a, b = s.X(u0, u1)
        box(a, s.yc + y0, RAIL + z0, b, s.yc + y1, RAIL + z1, ramp, **kw)
    def wheel(s, u, r, ramp='red', kind='wheel', y=5.0, oid=0, spokes=8):
        disc_y(s.x(u), RAIL + r, r, s.yc + y, ramp, kind=kind, oid=oid, spokes=spokes)

def loco(xr, yc, d, body='green', boiler='green', cab='green', oid=None):
    c = Car(xr, 24, yc, d)
    o = oid or new_oid(True)
    # frame and cylinders
    c.box(2, 22, -3.5, 3.5, 2.5, 4.5, 'iron', shades=(2, 3, 3), oid=o)
    c.box(16, 21, -3, 3, 4.5, 8.0, 'iron', shades=(2, 3, 3), oid=o)
    c.box(17.5, 21.5, 3.2, 5.6, 2.5, 6.0, boiler, shades=(1, 2, 3), oid=o)
    c.box(17.2, 17.7, 3.2, 5.7, 2.4, 6.1, 'brass', shades=(1, 1, 2), oid=o)
    # running board
    c.box(7, 21.5, -4.3, 4.3, 6.6, 7.1, 'iron', shades=(2, 3, 3), oid=o)
    # boiler with brass bands
    def bands(face, X, Y, Z, idx):
        u = (X - c.xr) if d > 0 else (c.xr + c.L - X)
        bnd = (np.abs(u - 10) < 0.45) | (np.abs(u - 14) < 0.45) | (np.abs(u - 18) < 0.45)
        rr = np.where(bnd, R('brass'), R(boiler))
        ii = np.where(bnd, np.minimum(idx, 2), idx)
        return rr, ii
    a, b = c.X(7, 20.2)
    cyl_x(a, b, yc, RAIL + 10.4, 3.4, boiler, oid=o, tex=bands)
    a, b = c.X(20, 23)
    cyl_x(a, b, yc, RAIL + 10.2, 3.7, 'iron', oid=o, th=(0.8, 0.5, 0.0))
    # smokebox door ring
    # stack (balloon)
    xs = c.x(21.4)
    cyl_z(xs, yc, RAIL + 13.0, RAIL + 16.5, 1.1, 'iron', oid=o)
    cyl_z(xs, yc, RAIL + 16.5, RAIL + 17.5, 1.7, 'iron', oid=o)
    cyl_z(xs, yc, RAIL + 17.5, RAIL + 18.5, 2.3, 'iron', oid=o)
    cyl_z(xs, yc, RAIL + 18.5, RAIL + 20.5, 2.7, 'iron', oid=o, topidx=2)
    cyl_z(xs, yc, RAIL + 20.5, RAIL + 21.3, 2.0, 'iron', oid=o, topidx=3)
    # domes
    cyl_z(c.x(15), yc, RAIL + 12.8, RAIL + 15.3, 1.5, 'brass', oid=o)
    sphere(c.x(15), yc, RAIL + 15.3, 1.5, 'brass', oid=o, sz=0.8)
    cyl_z(c.x(10.5), yc, RAIL + 12.8, RAIL + 14.6, 1.2, 'brass', oid=o)
    sphere(c.x(10.5), yc, RAIL + 14.6, 1.2, 'brass', oid=o, sz=0.8)
    sphere(c.x(12.7), yc, RAIL + 14.6, 0.8, 'brass', oid=o)   # bell
    # headlamp
    c.box(20.6, 23.2, -1.4, 1.4, 13.6, 16.8, body if body != boiler else 'ochre', shades=(1, 2, 3), oid=o)
    c.box(20.4, 23.4, -1.7, 1.7, 16.8, 17.4, 'iron', shades=(2, 3, 3), oid=o)
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
    # drivers + side rod
    for u in (4.6, 11.0):
        c.wheel(u, 3.6, 'red', 'wheel', y=5.2, oid=o, spokes=6)
    c.box(4.6, 11.0, 5.4, 5.9, 3.3, 3.8, 'iron', shades=(0, 0, 2), oid=o)
    c.box(11.0, 18.5, 5.5, 6.0, 3.6, 4.0, 'brass', shades=(1, 1, 2), oid=o)
    for u in (17.0, 20.2):
        c.wheel(u, 1.7, 'red', 'small', y=4.6, oid=o)
    # pilot (cowcatcher)
    def pilot(face, X, Y, Z, idx):
        return None, np.where((np.floor((Y - yc) * 1.0) % 2 == 0), idx, np.minimum(idx + 1, 3))
    c.box(22.5, 24.0, -4.0, 4.0, 0.4, 3.6, 'red', oid=o, tex=pilot)
    c.box(24.0, 25.4, -3.0, 3.0, 0.4, 2.2, 'red', oid=o, tex=pilot)
    c.box(22.4, 24.2, -4.4, 4.4, 3.6, 4.4, 'iron', shades=(1, 2, 3), oid=o)
    return o

def headlamp_lens(car_xr, yc, d):
    # front lens on +x face when facing +x
    if d > 0:
        x = car_xr + 23.2
        disc = None
        sx, sy = proj(x, yc, RAIL + 14.6)
        return sx, sy

def tender(xr, yc, d, ramp='green'):
    c = Car(xr, 11, yc, d); o = new_oid(True)
    def tt(face, X, Y, Z, idx):
        z = Z - RAIL
        rr = np.full(X.shape, R(ramp)); ii = idx.copy()
        if face == 'l':
            band = np.abs(z - 8.0) < 0.5
            rr = np.where(band, R('cream'), rr); ii = np.where(band, 1, ii)
            lt = (z > 3.5) & (z < 6.5)
        return rr, ii
    c.box(0.5, 10.5, -4, 4, 1.4, 2.8, 'iron', shades=(2, 3, 3), oid=o)
    c.box(0, 11, -5, 5, 2.8, 9.5, ramp, oid=o, tex=tt)
    # firewood load
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
        c.wheel(u, 1.5, 'iron', 'small', y=4.2, oid=o)
    return o

def coach(xr, yc, d=1):
    c = Car(xr, 28, yc, d); o = new_oid(True)
    def body(face, X, Y, Z, idx):
        z = Z - RAIL
        rr = np.full(X.shape, R('green')); ii = idx.copy()
        if face == 'l':
            u = X - xr
            band = (z > 7.0) & (z < 11.4)
            rr = np.where(band, R('cream'), rr); ii = np.where(band, np.where(z > 10.6, 0, 1), ii)
            wu = (u - 3.0) % 2.4
            win = band & (z > 7.8) & (z < 10.6) & (wu < 1.4) & (u > 3) & (u < 25)
            rr = np.where(win, R('glass'), rr)
            ii = np.where(win, np.where((z > 9.8) & (wu < 0.6), 0, np.where(z > 9.0, 2, 3)), ii)
            lb = (z > 11.4) & (z < 12.6)
            ii = np.where(lb & ~band, 1, ii)
            lw = (z < 7.0) & (z > 6.3)
            ii = np.where(lw, 3, ii)
            panel = (z < 6.0) & (((u - 3.0) % 4.8) < 0.5)
            ii = np.where(panel, 3, ii)
        if face == 'r':
            yy = Y - yc
            door = (np.abs(yy) < 1.2) & (z < 10.5)
            rr = np.where(door, R('wood'), rr); ii = np.where(door, 3, ii)
            win = (np.abs(yy) > 2.0) & (np.abs(yy) < 3.8) & (z > 7.8) & (z < 10.6)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, 3, ii)
        return rr, ii
    c.box(1.5, 26.5, -4, 4, 1.2, 2.6, 'iron', shades=(2, 3, 3), oid=o)
    c.box(2, 26, -5, 5, 2.6, 12.6, 'green', oid=o, tex=body)
    # roof + clerestory
    c.box(1.2, 26.8, -5.8, 5.8, 12.6, 13.4, 'roof', shades=(2, 3, 3), oid=o)
    def clere(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('green')); ii = idx.copy()
        if face == 'l':
            w = (((X - xr) % 2.4) < 1.2) & (Z - RAIL > 13.9) & (Z - RAIL < 14.9)
            rr = np.where(w, R('glass'), rr); ii = np.where(w, 1, ii)
        return rr, ii
    c.box(4, 24, -2.2, 2.2, 13.4, 15.0, 'green', oid=o, tex=clere)
    c.box(3.4, 24.6, -2.8, 2.8, 15.0, 15.6, 'roof', shades=(1, 3, 3), oid=o)
    # end platforms with railings and steps
    for (u0, u1) in ((0, 2), (26, 28)):
        c.box(u0, u1, -4, 4, 2.0, 2.8, 'wood', shades=(1, 2, 3), oid=o)
        c.box(u0, u1, 3.6, 4.2, 2.8, 6.4, 'iron', shades=(1, 2, 3), oid=o, faces='tl')
        c.box(u0, u1, 3.4, 4.4, 6.0, 6.6, 'brass', shades=(1, 2, 2), oid=o)
        c.box(u0 + 0.3, u1 - 0.3, 4.2, 5.2, 0.6, 1.4, 'wood', shades=(1, 2, 3), oid=o)
    for u in (3.4, 6.2, 21.8, 24.6):
        c.wheel(u, 1.5, 'iron', 'small', y=4.4, oid=o)
    return o

def boxcar(xr, yc, d=-1, open_door=False, ramp='ochre'):
    c = Car(xr, 20, yc, d); o = new_oid(True)
    def bt(face, X, Y, Z, idx):
        z = Z - RAIL
        rr = np.full(X.shape, R(ramp)); ii = idx.copy()
        if face == 'l':
            u = X - xr
            ii = np.where((u % 1.5) < 0.45, np.minimum(idx + 1, 3), ii)
            frame = (u < 1.6) | (u > 18.4) | (z > 11.4) | (z < 3.4)
            ii = np.where(frame & ((u % 1.5) >= 0.45), np.maximum(idx - 1, 0), ii)
            ii = np.where((np.abs(z - 11.4) < 0.35) | (np.abs(z - 3.4) < 0.35), 3, ii)
            # diagonal braces
            br = ((np.abs((u - 1.6) - (z - 3.4) * 0.8) < 0.35) & (u < 8)) | ((np.abs((18.4 - u) - (z - 3.4) * 0.8) < 0.35) & (u > 12))
            ii = np.where(br & (z > 3.4) & (z < 11.4), 3, ii)
            door = (u > 8) & (u < 12) & (z > 2.8) & (z < 11.6)
            if open_door:
                inner = door
                rr = np.where(inner, R('wood'), rr)
                ii = np.where(inner, 4, ii)
                # crates and sacks inside
                cr = inner & (z < 6.2) & (u < 10.4)
                rr = np.where(cr, R('wood'), rr); ii = np.where(cr, np.where(z > 5.6, 2, 3), ii)
                sk = inner & (z < 5.2) & (u >= 10.6) & (u < 11.8)
                rr = np.where(sk, R('cream'), rr); ii = np.where(sk, np.where(z > 4.6, 2, 3), ii)
                lit = inner & (u < 8.5)
                ii = np.where(lit & ~cr, 3, ii)
            else:
                ii = np.where(door, np.minimum(idx, 2), ii)
                ii = np.where(door & ((np.abs(u - 8.2) < 0.3) | (np.abs(u - 11.8) < 0.3)), 3, ii)
                xb = door & ((np.abs((u - 8) * 2.2 - (z - 2.8)) < 0.55) | (np.abs((12 - u) * 2.2 - (z - 2.8)) < 0.55))
                ii = np.where(xb, 3, ii)
        if face == 'r':
            ii = np.where(((Y - yc) % 1.5) < 0.45, np.minimum(idx + 1, 4), ii)
        return rr, ii
    c.box(0.6, 19.4, -4, 4, 1.2, 2.6, 'iron', shades=(2, 3, 3), oid=o)
    c.box(1, 19, -5, 5, 2.6, 12.2, ramp, shades=(1, 1, 3), oid=o, tex=bt)
    c.box(0.6, 19.4, -5.6, 5.6, 12.2, 12.8, ramp, shades=(2, 3, 3), oid=o, tex=lambda f, X, Y, Z, i: (None, np.where(((X - xr) % 1.6) < 0.45, np.minimum(i + 1, 3), i)))
    c.box(0.6, 19.4, -0.9, 0.9, 12.8, 13.4, 'wood', shades=(1, 2, 3), oid=o)
    if open_door:
        # slid-open door panel, just proud of the side
        a, b = c.X(12.4, 16.2) if d > 0 else (xr + 12.4, xr + 16.2)
        def dp(face, X, Y, Z, idx):
            u = X - xr
            ii = np.where((u % 1.5) < 0.45, 3, idx)
            return None, ii
        box(a, yc + 5, RAIL + 2.8, b, yc + 5.5, RAIL + 11.6, ramp, oid=o, tex=dp, shades=(1, 1, 3))
    for u in (2.6, 5.0, 15.0, 17.4):
        c.wheel(u, 1.5, 'iron', 'small', y=4.4, oid=o)
    return o

def flatcar(xr, yc, d=-1):
    c = Car(xr, 16, yc, d); o = new_oid(True)
    c.box(0.6, 15.4, -4, 4, 1.2, 2.6, 'iron', shades=(2, 3, 3), oid=o)
    def deck(face, X, Y, Z, idx):
        if face == 't':
            return None, np.where(((Y - yc) % 1.6) < 0.45, 2, np.where(hash2(np.floor(X/4).astype(int), np.floor((Y - yc)/1.6).astype(int)) % 4 == 0, 0, 1))
        ii = np.where(((X - xr) % 2.0) < 0.5, 3, idx)
        return None, ii
    c.box(0, 16, -5, 5, 2.6, 4.0, 'wood', oid=o, tex=deck)
    for u in (2.6, 5.0, 11.0, 13.4):
        c.wheel(u, 1.5, 'iron', 'small', y=4.4, oid=o)
    return o

def crate(x, y, z, sx=2.6, sy=2.6, sz=2.4, ramp='wood', oid=None):
    o = oid or new_oid(True)
    def ct(face, X, Y, Z, idx):
        if face == 't':
            ii = np.where(((X - x) % 1.3) < 0.4, idx + 1, idx)
            return None, ii
        if face == 'l':
            e = ((X - x) < 0.5) | ((X - x) > sx - 0.5) | ((Z - z) < 0.5) | ((Z - z) > sz - 0.5)
            ii = np.where(e, idx - 1, idx)
            dg = np.abs((X - x) / sx - (Z - z) / sz) < 0.12
            ii = np.where(dg & ~e, idx - 1, ii)
            return None, ii
        e = ((Y - y) < 0.5) | ((Y - y) > sy - 0.5) | ((Z - z) < 0.5) | ((Z - z) > sz - 0.5)
        return None, np.where(e, idx - 1, idx)
    box(x, y, z, x + sx, y + sy, z + sz, ramp, shades=(1, 2, 3), tex=ct, oid=o)
    return o

def sack(x, y, z, oid=None):
    o = oid or new_oid(True)
    sphere(x, y, z + 1.0, 1.25, 'cream', oid=o, sz=0.85, th=(0.85, 0.45, -0.15))
    sphere(x + 0.2, y + 0.2, z + 2.1, 0.6, 'cream', oid=o, cast=False)
    return o

def barrel(x, y, z, r=1.4, h=3.4, ramp='wood'):
    o = new_oid(True)
    def hoops(face, X, Y, Z, idx):
        hp = (np.abs(Z - z - h * 0.2) < 0.35) | (np.abs(Z - z - h * 0.8) < 0.35)
        rr = np.where(hp, R('iron'), R(ramp))
        ii = np.where(hp, np.minimum(idx + 1, 3), idx)
        if face == 't':
            rr = np.full(X.shape, R(ramp)); ii = np.where(((X - x) ** 2 + (Y - y) ** 2) > (r - 0.6) ** 2, 2, 3)
        return rr, ii
    cyl_z(x, y, z, z + h, r, ramp, oid=o, tex=hoops)
    return o

# ======================= buildings =======================
def false_front(x0, x1, yf, depth, h, fh, wall, trim, roof, sign, kind):
    o = new_oid(True)
    clap = tex_clapboard()
    box(x0, yf - depth, 0, x1, yf - 1, h, wall, oid=o, tex=clap)
    gable_y(yf - depth - 1, yf - 0.5, (x0 + x1) / 2, (x1 - x0) / 2 + 1.0, h, h + 7, roof, wall=None, oid=o, tex=tex_shingle, shades=(1, 3))
    # front wall
    fo = new_oid(True)
    def front(face, X, Y, Z, idx):
        rr = np.full(X.shape, R(wall)); ii = idx.copy()
        if face == 'l':
            u = X - x0; w = x1 - x0
            ii = np.where((Z % 2.0) < 0.55, np.minimum(idx + 1, 4), ii)
            cx = w / 2
            if kind == 'smithy':
                door = (np.abs(u - cx + 2) < 4.5) & (Z < 10)
                rr = np.where(door, R('wood'), rr); ii = np.where(door, 4, ii)
                glow = door & (((u - (cx - 4)) ** 2 / 4 + (Z - 2.5) ** 2 / 3) < 1)
                rr = np.where(glow, R('fire'), rr)
                ii = np.where(glow, np.where(((u - (cx - 4)) ** 2 + (Z - 2.0) ** 2) < 1.2, 0, 1), ii)
                halo = door & ~glow & (((u - (cx - 4)) ** 2 / 9 + (Z - 3) ** 2 / 7) < 1)
                rr = np.where(halo, R('fire'), rr); ii = np.where(halo, np.where(E.BAY[0:1, 0:1] > 2, 2, 3), ii)
                post = door & (np.abs(u - (cx + 1)) < 0.4)
                rr = np.where(post, R('wood'), rr); ii = np.where(post, 3, ii)
                win = (np.abs(u - (w - 3.2)) < 1.4) & (Z > 4) & (Z < 8)
                rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(Z > 7.2, 1, 3), ii)
            else:
                door = (np.abs(u - cx) < 1.6) & (Z < 8.5)
                fr = (np.abs(u - cx) < 2.1) & (Z < 9.1) & ~door
                rr = np.where(fr, R(trim), rr); ii = np.where(fr, 1, ii)
                rr = np.where(door, R('wood'), rr); ii = np.where(door, 4, ii)
                for wc in (cx - 6.0, cx + 6.0):
                    win = (np.abs(u - wc) < 2.6) & (Z > 2.6) & (Z < 8.0)
                    wfr = (np.abs(u - wc) < 3.1) & (Z > 2.0) & (Z < 8.6) & ~win
                    rr = np.where(wfr, R(trim), rr); ii = np.where(wfr, 1, ii)
                    rr = np.where(win, R('glass'), rr)
                    ii = np.where(win, np.where((Z > 7.0) & ((u - wc) < -0.8), 0, np.where(Z > 5.6, 2, 3)), ii)
                    mull = win & ((np.abs(u - wc) < 0.3) | (np.abs(Z - 5.3) < 0.3))
                    rr = np.where(mull, R(trim), rr); ii = np.where(mull, 1, ii)
                    if kind == 'store':
                        gd = win & (Z < 4.2)
                        rr = np.where(gd, R('ochre'), rr); ii = np.where(gd, np.where((u * 2).astype(int) % 2 == 0, 1, 2), ii)
                if kind == 'saloon':
                    bw = door & (Z > 2.4) & (Z < 6.2) & (np.abs(u - cx) > 0.25)
                    rr = np.where(bw, R('ochre'), rr); ii = np.where(bw, np.where(Z > 5.6, 0, np.where((u * 2).astype(int) % 2 == 0, 1, 2)), ii)
                    ii = np.where(bw & (np.abs(u - cx) > 1.3), 2, ii)
            # cornice band
            cb = (Z > fh - 1.6)
            rr = np.where(cb, R(trim), rr); ii = np.where(cb, np.where(Z > fh - 0.8, 0, 2), ii)
            pil = ((u < 0.8) | (u > w - 0.8))
            rr = np.where(pil, R(trim), rr); ii = np.where(pil, 1, ii)
        return rr, ii
    box(x0 - 0.5, yf - 1.2, 0, x1 + 0.5, yf, fh, wall, oid=fo, tex=front)
    box(x0 - 1.0, yf - 1.6, fh, x1 + 1.0, yf + 0.4, fh + 1, trim, shades=(0, 1, 2), oid=fo)
    # sign board
    so = new_oid(True)
    sx0, sx1 = x0 + 1.6, x1 - 1.6
    box(sx0, yf, fh - 8.6, sx1, yf + 0.4, fh - 2.4, 'cream' if trim != 'cream' else 'ochre', shades=(1, 1, 3), oid=so)
    # boardwalk
    def bwt(face, X, Y, Z, idx):
        if face == 't':
            return None, np.where((X % 1.6) < 0.45, 2, np.where(hash2(np.floor(X / 1.6).astype(int), 1) % 5 == 0, 0, 1))
        return None, np.where((X % 3) < 0.6, 3, idx)
    box(x0 - 2, yf, 0, x1 + 2, yf + 5, 1.5, 'wood', tex=bwt, oid=new_oid(False))
    # awning
    ao = new_oid(True)
    for px in (x0 - 1.2, x1 + 0.4):
        box(px, yf + 2.6, 1.5, px + 0.8, yf + 3.4, 11.5, 'wood', shades=(1, 2, 3), oid=ao)
    def awn(face, X, Y, Z, idx):
        if face == 't':
            return None, np.where((X % 2.0) < 0.6, 2, 1)
        return None, np.where((X % 2.0) < 0.6, 3, idx)
    box(x0 - 1.6, yf, 11.5, x1 + 1.6, yf + 3.6, 12.2, 'wood' if kind != 'saloon' else 'red', tex=awn, oid=ao)
    return so, fo, sx0

def depot(x0, x1, y0, y1):
    o = new_oid(True)
    def wt(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('ochre')); ii = idx.copy()
        c = X if face == 'l' else Y
        f = c % 2.5
        ii = np.where(f < 0.5, np.maximum(idx - 1, 0), np.where(f < 0.95, np.minimum(idx + 1, 3), ii))
        z = Z - PZ
        base = z < 1.2
        rr = np.where(base, R('red'), rr); ii = np.where(base, idx, ii)
        if face == 'l':
            u = X - x0
            door = (u > 1.6) & (u < 4.6) & (z < 9.6)
            dfr = (u > 1.1) & (u < 5.1) & (z < 10.2) & ~door
            rr = np.where(dfr, R('cream'), rr); ii = np.where(dfr, 1, ii)
            rr = np.where(door, R('wood'), rr); ii = np.where(door, np.where((u - 1.6) % 1.5 < 0.4, 4, 3), ii)
            # schedule board
            sb = (u > 6.0) & (u < 15.4) & (z > 2.4) & (z < 11.4)
            sbf = (u > 5.5) & (u < 15.9) & (z > 1.8) & (z < 12.0) & ~sb
            rr = np.where(sbf, R('wood'), rr); ii = np.where(sbf, 3, ii)
            rr = np.where(sb, R('green'), rr); ii = np.where(sb, 3, ii)
        if face == 'r':
            yy = Y - y0
            win = (np.abs(yy - (y1 - y0) / 2) < 1.8) & (z > 4) & (z < 9)
            wfr = (np.abs(yy - (y1 - y0) / 2) < 2.3) & (z > 3.4) & (z < 9.6) & ~win
            rr = np.where(wfr, R('cream'), rr); ii = np.where(wfr, 2, ii)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(z > 9.0, 2, 3), ii)
        return rr, ii
    box(x0, y0, PZ, x1, y1, PZ + 14, 'ochre', oid=o, tex=wt)
    gable_x(x0 - 1.0, x1 + 1.0, (y0 + y1) / 2, (y1 - y0) / 2 + 1.0, PZ + 13.6, PZ + 19.5, 'red',
            wall='ochre', oid=o, tex=tex_shingle, shades=(0, 1),
            endtex=lambda f, X, Y, Z, i: (None, np.where(((Y - y0) % 2.5) < 0.5, 2, 3)))
    # chimney
    box(x0 + 3, (y0 + y1) / 2 - 2.0, PZ + 16, x0 + 5, (y0 + y1) / 2, PZ + 21.5, 'red', oid=o, tex=lambda f, X, Y, Z, i: (None, np.where((Z % 1.5) < 0.45, np.minimum(i + 1, 3), i)))
    box(x0 + 2.7, (y0 + y1) / 2 - 2.3, PZ + 21.5, x0 + 5.3, (y0 + y1) / 2 + 0.3, PZ + 22.2, 'iron', shades=(2, 3, 3), oid=o)
    return o

def shed(x0, x1, y0, y1):
    o = new_oid(True)
    def st(face, X, Y, Z, idx):
        rr, ii = tex_batten(face, X, Y, Z, idx)
        if face == 'l':
            u = X - x0
            door = (u > 4) & (u < 9.5) & (Z - PZ < 8.5)
            ii = np.where(door, np.minimum(ii + 1, 3), ii)
            fr = door & ((np.abs(u - 4.3) < 0.35) | (np.abs(u - 9.2) < 0.35) | (np.abs(Z - PZ - 8.2) < 0.35) |
                         (np.abs((u - 4) / 5.5 - (Z - PZ) / 8.5) < 0.07) | (np.abs((u - 4) / 5.5 - (1 - (Z - PZ) / 8.5)) < 0.07))
            rr = np.where(fr, R('cream'), R('red')); ii = np.where(fr, 1, ii)
        return rr, ii
    box(x0, y0, PZ, x1, y1, PZ + 10, 'red', oid=o, tex=st)
    gable_x(x0 - 1, x1 + 1, (y0 + y1) / 2, (y1 - y0) / 2 + 1.4, PZ + 9.6, PZ + 13.6, 'roof', wall='red',
            oid=o, tex=tex_shingle, shades=(1, 2), endtex=lambda f, X, Y, Z, i: (None, np.where(((Y) % 3) < 0.6, 2, 3)))
    return o

def water_tower(xc, yc):
    o = new_oid(True)
    for dx, dy in ((-3.5, -3.5), (3.5, -3.5), (-3.5, 3.5), (3.5, 3.5)):
        box(xc + dx - 0.5, yc + dy - 0.5, 0, xc + dx + 0.5, yc + dy + 0.5, 10, 'wood', shades=(1, 2, 3), oid=o)
    box(xc - 3.6, yc + 3.2, 4, xc + 3.6, yc + 3.8, 4.6, 'wood', shades=(1, 2, 3), oid=o)
    box(xc + 3.2, yc - 3.6, 4, xc + 3.8, yc + 3.6, 4.6, 'wood', shades=(1, 2, 3), oid=o)
    box(xc - 5, yc - 5, 9.4, xc + 5, yc + 5, 10.2, 'wood', shades=(1, 2, 3), oid=o)
    def staves(face, X, Y, Z, idx):
        ang = np.arctan2(Y - yc, X - xc)
        ii = np.where(((ang * 9) % 1.0) < 0.22, np.minimum(idx + 1, 4), idx)
        hp = (np.abs(Z - 12) < 0.3) | (np.abs(Z - 15) < 0.3) | (np.abs(Z - 17.6) < 0.3)
        rr = np.where(hp, R('iron'), R('wood')); ii = np.where(hp, np.minimum(idx + 1, 3), ii)
        return rr, ii
    cyl_z(xc, yc, 10.2, 18.6, 4.6, 'wood', oid=o, tex=staves, th=(0.4, 0.2, -0.15))
    for k, (z0, r) in enumerate(((18.6, 5.2), (19.3, 4.2), (20.0, 3.2), (20.7, 2.2), (21.4, 1.2))):
        cyl_z(xc, yc, z0, z0 + 0.7, r, 'roof', oid=o, th=(0.35, 0.15, -0.15), topidx=1)
    # spout
    box(xc + 4.0, yc - 0.5, 12.0, xc + 9.0, yc + 0.5, 12.8, 'iron', shades=(1, 2, 3), oid=o)
    box(xc + 8.5, yc - 0.5, 10.5, xc + 9.2, yc + 0.5, 12.8, 'iron', shades=(1, 2, 3), oid=o)
    return o

def tree(x, y, s=1.0, seed=0):
    o = new_oid(True)
    box(x - 0.6, y - 0.6, 0, x + 0.6, y + 0.6, 7 * s, 'wood', shades=(1, 2, 3), oid=o)
    rnd = np.random.RandomState(seed)
    blobs = [(0, 0, 10 * s, 5.0 * s)]
    for k in range(4):
        a = rnd.uniform(0, 6.28)
        blobs.append((math.cos(a) * 2.6 * s, math.sin(a) * 2.6 * s, (9 + rnd.uniform(-1.5, 3)) * s, (3.2 + rnd.uniform(0, 1)) * s))
    blobs.append((-0.8 * s, 0.8 * s, 14 * s, 3.2 * s))
    for (dx, dy, z, r) in blobs:
        sphere(x + dx, y + dy, z, r, 'leaf', oid=o, th=(0.85, 0.45, -0.05), noise=0.35, seed=seed * 7 + int(z))

def lamp_post(x, y, z):
    o = new_oid(True)
    box(x - 0.9, y - 0.9, z, x + 0.9, y + 0.9, z + 1.2, 'iron', shades=(1, 2, 3), oid=o)
    box(x - 0.45, y - 0.45, z, x + 0.45, y + 0.45, z + 11, 'iron', shades=(1, 2, 3), oid=o)
    box(x - 1.3, y - 1.3, z + 11, x + 1.3, y + 1.3, z + 11.6, 'iron', shades=(1, 2, 3), oid=o)
    box(x - 1.1, y - 1.1, z + 11.6, x + 1.1, y + 1.1, z + 14.2, 'glass', shades=(0, 1, 2), oid=o,
        tex=lambda f, X, Y, Z, i: (np.where(((X - x) if f == 'l' else (Y - y)) ** 2 < 0.12, R('iron'), R('glass')), i))
    box(x - 1.5, y - 1.5, z + 14.2, x + 1.5, y + 1.5, z + 14.8, 'iron', shades=(1, 3, 3), oid=o)
    box(x - 0.7, y - 0.7, z + 14.8, x + 0.7, y + 0.7, z + 15.6, 'iron', shades=(1, 3, 3), oid=o)

def telegraph(x, y):
    o = new_oid(False)
    box(x - 0.5, y - 0.5, 0, x + 0.5, y + 0.5, 30, 'wood', shades=(1, 2, 3), oid=o)
    box(x - 0.4, y - 3.0, 27.0, x + 0.4, y + 3.0, 27.8, 'wood', shades=(1, 2, 3), oid=o)
    return [(x, y - 2.4, 28.4), (x, y + 2.4, 28.4)]

def switch_stand(x, y):
    o = new_oid(True)
    box(x - 1.2, y - 1.2, 0.5, x + 1.2, y + 1.2, 1.6, 'wood', shades=(1, 2, 3), oid=o)
    box(x - 0.4, y - 0.4, 1.6, x + 0.4, y + 0.4, 7.4, 'iron', shades=(1, 2, 3), oid=o)
    # target: a red disc with a white centre facing +y
    disc_y(x, 7.8, 2.3, y + 0.5, 'red', kind='flat', oid=o)
    disc_y(x, 7.8, 1.1, y + 0.55, 'cream', kind='flat', oid=o)
    # lever
    box(x - 0.3, y - 0.3, 1.6, x + 2.8, y + 0.3, 2.2, 'iron', shades=(0, 2, 3), oid=o)
    # lamp on top
    box(x - 0.7, y - 0.7, 9.6, x + 0.7, y + 0.7, 11.0, 'ochre', shades=(0, 1, 2), oid=o)
    box(x - 0.9, y - 0.9, 11.0, x + 0.9, y + 0.9, 11.5, 'iron', shades=(1, 2, 3), oid=o)

def handcart(x, y, z):
    o = new_oid(True)
    box(x, y, z + 2.4, x + 7, y + 4, z + 3.2, 'wood', shades=(1, 2, 3), oid=o,
        tex=lambda f, X, Y, Z, i: (None, np.where(((Y - y) % 1.3) < 0.4, np.minimum(i + 1, 3), i) if f == 't' else i))
    box(x - 0.2, y + 3.4, z + 3.2, x + 7, y + 4.0, z + 4.4, 'wood', shades=(1, 2, 3), oid=o)
    box(x - 3.5, y + 0.6, z + 3.4, x, y + 1.2, z + 4.0, 'wood', shades=(1, 2, 3), oid=o)
    box(x - 3.5, y + 2.8, z + 3.4, x, y + 3.4, z + 4.0, 'wood', shades=(1, 2, 3), oid=o)
    disc_y(x + 3.5, z + 1.9, 1.9, y + 4.3, 'wood', kind='wheel', oid=o, spokes=6)
    box(x + 6.3, y + 1, z, x + 6.9, y + 3, z + 2.4, 'wood', shades=(1, 2, 3), oid=o)
    crate(x + 0.6, y + 0.4, z + 3.2, 2.6, 2.8, 2.3, oid=o)
    crate(x + 3.6, y + 0.6, z + 3.2, 2.4, 2.6, 2.0, ramp='ochre', oid=o)
    sack(x + 4.6, y + 1.6, z + 5.2, oid=o)

def house(x0, x1, y0, y1, h, wall, roof):
    o = new_oid(True)
    def ht(face, X, Y, Z, idx):
        rr = np.full(X.shape, R(wall)); ii = np.where((Z % 2.0) < 0.55, np.minimum(idx + 1, 4), idx)
        if face == 'l':
            u = X - x0; w = x1 - x0
            door = (np.abs(u - w * 0.3) < 1.3) & (Z < 7.5)
            rr = np.where(door, R('wood'), rr); ii = np.where(door, 3, ii)
            win = (np.abs(u - w * 0.72) < 1.5) & (Z > 3.5) & (Z < 7.2)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(Z > 6.4, 1, 3), ii)
        if face == 'r':
            win = (np.abs(Y - (y0 + y1) / 2) < 1.4) & (Z > 3.5) & (Z < 7.2)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, 3, ii)
        return rr, ii
    box(x0, y0, 0, x1, y1, h, wall, oid=o, tex=ht)
    hw = (y1 - y0) / 2 + 1.0
    gable_x(x0 - 1, x1 + 1, (y0 + y1) / 2, hw, h - 0.4, h + hw * 1.0, roof, wall=wall, oid=o, tex=tex_shingle, shades=(1, 2),
            endtex=lambda f, X, Y, Z, i: (None, np.where((Z % 2.0) < 0.55, 3, 2)))
    box(x1 - 4, (y0 + y1) / 2 - 2.5, h + 2, x1 - 2.4, (y0 + y1) / 2 - 1.0, h + hw + 1.5, 'red', shades=(1, 2, 3), oid=o)

def church(xc, y0, y1):
    o = new_oid(True)
    x0, x1 = xc - 6, xc + 6
    def ct(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('cream')); ii = np.where((Z % 2.0) < 0.55, np.minimum(idx + 1, 3), idx)
        if face == 'r':
            win = (((Y - y0) % 4.0) > 1.6) & (((Y - y0) % 4.0) < 2.8) & (Z > 4) & (Z < 10) & (Y < y1 - 7)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(Z > 9, 1, 2), ii)
        if face == 'l':
            win = (((X - x0) % 4.0) > 1.4) & (((X - x0) % 4.0) < 2.6) & (Z > 4) & (Z < 10)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(Z > 9, 1, 2), ii)
        return rr, ii
    box(x0, y0, 0, x1, y1, 13, 'cream', oid=o, tex=ct)
    gable_y(y0 - 1, y1 + 0.6, xc, 7.0, 12.6, 19.5, 'roof', wall='cream', oid=o, tex=tex_shingle, shades=(1, 3))
    # steeple at the front
    ty0 = y1 - 1
    def tt(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('cream')); ii = idx.copy()
        if face == 'l':
            door = (np.abs(X - xc) < 1.3) & (Z < 7)
            rr = np.where(door, R('wood'), rr); ii = np.where(door, 3, ii)
            lv = (np.abs(X - xc) < 1.0) & (Z > 19) & (Z < 23)
            rr = np.where(lv, R('wood'), rr); ii = np.where(lv, 4, ii)
        if face == 'r':
            lv = (np.abs(Y - (ty0 + 2)) < 1.0) & (Z > 19) & (Z < 23)
            rr = np.where(lv, R('wood'), rr); ii = np.where(lv, 4, ii)
        return rr, ii
    box(xc - 2.5, ty0, 0, xc + 2.5, ty0 + 5, 24, 'cream', oid=o, tex=tt)
    for k in range(7):
        r = 2.9 - k * 0.42
        box(xc - r, ty0 + 2.5 - r, 24 + k * 1.6, xc + r, ty0 + 2.5 + r, 25.6 + k * 1.6, 'roof', shades=(1, 2, 3), oid=o)
    box(xc - 0.2, ty0 + 2.3, 35, xc + 0.2, ty0 + 2.7, 38, 'brass', shades=(1, 1, 2), oid=o)

def barn(x0, x1, y0, y1, wall):
    o = new_oid(True)
    def bt(face, X, Y, Z, idx):
        rr, ii = tex_batten(face, X, Y, Z, idx)
        rr = np.full(X.shape, R(wall))
        if face == 'l':
            u = X - x0; w = x1 - x0
            door = (np.abs(u - w / 2) < 3.5) & (Z < 9)
            fr = door & ((np.abs(np.abs(u - w / 2) - 3.2) < 0.4) | (np.abs(Z - 8.6) < 0.4) | (np.abs(np.abs(u - w / 2) - (Z / 9) * 3.2) < 0.35))
            ii = np.where(door, np.minimum(ii + 1, 3), ii)
            rr = np.where(fr, R('cream'), rr); ii = np.where(fr, 1, ii)
        return rr, ii
    box(x0, y0, 0, x1, y1, 11, wall, oid=o, tex=bt)
    gable_x(x0 - 1, x1 + 1, (y0 + y1) / 2, (y1 - y0) / 2 + 1.2, 10.6, 17, 'roof', wall=wall, oid=o, tex=tex_shingle, shades=(1, 2),
            endtex=lambda f, X, Y, Z, i: (None, np.where((Y % 3) < 0.6, 2, 3)))

def fence_x(x0, x1, y):
    o = new_oid(False)
    x = x0
    while x <= x1:
        box(x - 0.4, y - 0.4, 0, x + 0.4, y + 0.4, 3.6, 'wood', shades=(1, 2, 3), oid=o)
        x += 4
    for z in (1.4, 2.8):
        box(x0, y - 0.25, z, x1, y + 0.25, z + 0.5, 'wood', shades=(0, 2, 3), oid=o)

def fence_y(x, y0, y1):
    o = new_oid(False)
    y = y0
    while y <= y1:
        box(x - 0.4, y - 0.4, 0, x + 0.4, y + 0.4, 3.6, 'wood', shades=(1, 2, 3), oid=o)
        y += 4
    for z in (1.4, 2.8):
        box(x - 0.25, y0, z, x + 0.25, y1, z + 0.5, 'wood', shades=(0, 2, 3), oid=o)

