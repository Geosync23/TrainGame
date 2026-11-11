# D27 street furniture and period props (A3): hitching rails, troughs, barrels, crates, benches, street lamps,
# wagons, horses, the telegraph pole, the bigger water tower, the woodpile, privy, washing line, corral fence and
# the plank bridge over the dry wash. Drawn at the D27 scale (a person 2.5u). Units: MU, as engine.py.
import math
import numpy as np
import pal27  # noqa: F401
import engine as E
from engine import R, box, cyl_z, cyl_x, sphere, disc_x, disc_y, hash2, new_oid
import town as TW
import town27 as T
from town import Frame, Paint, clampi

U = 4.0
UY = 16.0 / 3.0


def _posts_rail(F, a0, a1, o, h=1.0 * UY, ramp='wood'):
    for a in (a0, a1):
        F.box(a - 0.45, -0.45, 0, a + 0.45, 0.45, h + 0.6, ramp, shades=(1, 2, 3), oid=o)
    F.box(a0 - 0.8, -0.32, h, a1 + 0.8, 0.32, h + 0.7, ramp, shades=(0, 2, 3), oid=o)


def hitch(axis='z'):
    """A hitching rail, 3u long along x or z, rail at 1u."""
    o = new_oid(True)
    F = Frame('e' if axis == 'z' else 's')
    _posts_rail(F, -6.0, 6.0, o)
    return o


def trough(axis='z'):
    """A plank water trough on two trestles, 2.2u x 0.7u, 0.6u high, water in it."""
    o = new_oid(True)
    F = Frame('e' if axis == 'z' else 's')
    A, B, h = 4.4, 1.4, 0.6 * UY
    def staves(lf, u, z, a, b, idx, lit):
        if lf == 't':
            inner = (np.abs(a) < A - 0.7) & (np.abs(b) < B - 0.6)
            rr = np.where(inner, R('creek'), R('wood'))
            ii = np.where(inner, np.where(np.mod(a + b, 3.0) < 0.6, 0, 1), 1)
            return rr, ii
        return None, np.where(np.mod(z, 1.1) < 0.35, clampi(idx + 1), idx)
    F.box(-A, -B, 0.8, A, B, h, 'wood', paint=staves, oid=o)
    for a in (-A + 0.8, A - 1.6):
        F.box(a, -B - 0.3, 0, a + 0.8, B + 0.3, 0.9, 'wood', shades=(1, 2, 3), oid=o)
    return o


def barrel1(ramp='wood'):
    o = new_oid(True)
    TW.barrel(r=1.7, h=0.95 * 1.3 * UY, ramp=ramp, oid=o)
    return o


def barrels3():
    o = new_oid(True)
    h = 1.3 * UY
    TW.barrel(r=1.7, h=h, oid=o, x=-1.9, y=-1.6)
    TW.barrel(r=1.7, h=h, oid=o, x=1.9, y=-1.4, ramp='ochre')
    TW.barrel(r=1.7, h=h * 0.9, oid=o, x=0.0, y=1.9)
    # one lying on its side in front
    cyl_x(-1.8, 2.8, 4.6, 1.5, 1.4, 'wood', oid=o,
          tex=lambda f, X, Y, Z, i: (np.where(np.abs(X - 0.5) % 1.6 < 0.35, R('iron'), R('wood')) if f == 's' else None, i))
    return o


def crates3():
    o = new_oid(True)
    s, h = 3.4, 2.2
    TW.crate_box(-3.6, -3.0, 0, s, 2.6, h, oid=o)
    TW.crate_box(0.0, -3.0, 0, s, 2.6, h, ramp='ochre', oid=o)
    TW.crate_box(-3.2, -2.8, h, s, 2.6, h, oid=o)
    TW.crate_box(-2.0, 0.4, 0, s, 2.6, h, oid=o)
    return o


def sacks():
    o = new_oid(True)
    for (x, y, z, r) in ((-1.6, -1.2, 0, 'cream'), (1.4, -1.4, 0, 'straw'), (-1.2, 1.4, 0, 'cream'),
                         (1.6, 1.2, 0, 'cream'), (0.0, 0.0, 1.8, 'straw')):
        TW.sack_shape(x, y, z, ramp=r, oid=o)
    return o


def bench(facing_):
    """A street bench 2.4u long against a wall; the seat faces 'e' (+x), 'w' (-x) or 's' (+z: a platform bench)."""
    o = new_oid(True)
    F = Frame(facing_)
    zs = 0.64 * UY
    for a in (-4.2, 4.2):
        F.box(a - 0.4, -1.0, 0, a + 0.4, 1.0, zs, 'wood', shades=(1, 2, 3), oid=o)
        F.box(a - 0.4, -1.2, zs, a + 0.4, -0.7, 1.3 * UY, 'wood', shades=(1, 2, 3), oid=o)
    F.box(-4.8, -1.0, zs, 4.8, 1.2, zs + 0.6, 'wood', shades=(0, 2, 3), oid=o)
    F.box(-4.8, -1.2, 0.95 * UY, 4.8, -0.7, 1.25 * UY, 'wood', shades=(0, 2, 3), oid=o)
    return o


def lamppost(lit=False):
    """A street lantern on a turned post, 3.6u tall."""
    o = new_oid(True)
    box(-1.0, -1.0, 0, 1.0, 1.0, 1.4, 'wood', shades=(1, 2, 3), oid=o)
    box(-0.5, -0.5, 1.4, 0.5, 0.5, 15.6, 'wood', shades=(1, 2, 3), oid=o)
    box(-1.0, -0.3, 13.6, 1.4, 0.3, 14.2, 'iron', shades=(1, 2, 3), oid=o)
    box(-1.3, -1.3, 15.6, 1.3, 1.3, 16.2, 'iron', shades=(1, 2, 3), oid=o)
    g = 'fire' if lit else 'glass'
    box(-1.1, -1.1, 16.2, 1.1, 1.1, 18.6, g, shades=(0, 1, 2) if not lit else (0, 0, 1), oid=o,
        tex=lambda f, X, Y, Z, i: (np.where((X if f == 'l' else Y) ** 2 < 0.12, R('iron'), R(g)), i))
    for k in range(3):
        r = 1.6 - k * 0.5
        box(-r, -r, 18.6 + k * 0.6, r, r, 19.2 + k * 0.6, 'iron', shades=(1, 3, 3), oid=o)
    box(-0.3, -0.3, 20.4, 0.3, 0.3, 21.4, 'iron', shades=(1, 3, 3), oid=o)
    return o


def _wheel_z(F, a, b, zc, r, o):
    """A wagon wheel in the a-z plane at b, i.e. its face turned to the frame's side."""
    X, Y = F.w(a, b)
    if F.f in ('e', 'w'):
        disc_x(Y, zc, r, X, 'wood', oid=o, spokes=10)
    else:
        disc_y(X, zc, r, Y, 'wood', oid=o, spokes=10)


def wagon(axis='z', covered=False):
    """A freight wagon parked, 3.2 x 1.3u bed on four spoked wheels, tongue down; along the street (z) or across (x).
    Covered: with a canvas bonnet on hoops (an emigrant wagon)."""
    o = new_oid(True)
    F = Frame('e' if axis == 'z' else 's')   # local a: along the wagon; b: across
    L, B = 6.4, 2.6
    zb = 3.4
    # running gear and the bed
    F.box(-L + 1.0, -0.6, 2.4, L - 1.0, 0.6, 3.2, 'wood', shades=(1, 2, 3), oid=o)
    def bed(lf, u, z, a, b, idx, lit):
        if lf == 't':
            return None, np.where(np.mod(a, 1.6) < 0.4, 3, 2)
        return None, np.where(np.mod(z - zb, 1.3) < 0.35, clampi(idx + 1), idx)
    F.box(-L, -B, zb, L, B, zb + 3.6, 'wood', paint=bed, oid=o)
    F.box(-L + 0.6, -B + 0.6, zb + 0.6, L - 0.6, B - 0.6, zb + 3.7, 'wood', shades=(3, 3, 3), oid=o, cast=False)
    if not covered:
        # a load: two crates and a barrel
        X, Y = F.w(-2.6, 0.0)
        TW.crate_box(X - 1.6, Y - 1.4, zb + 0.6, 3.0, 2.6, 2.6, oid=o)
        X, Y = F.w(2.6, -0.4)
        TW.barrel(r=1.3, h=3.6, oid=o, x=X, y=Y, z=zb + 0.6)
    else:
        for k in range(5):
            a = -L + 1.0 + k * (2 * L - 2.0) / 4.0
            F.box(a - 1.6, -B - 0.2, zb + 3.6, a + 1.6, B + 0.2, zb + 4.2, 'cream', shades=(0, 1, 2), oid=o)
        def bonnet(face, X, Y, Z, idx):
            ii = np.where(np.mod((X if axis == 'x' else Y), 2.4) < 0.5, clampi(idx + 1), idx)
            return np.full(X.shape, R('cream')), ii
        if axis == 'x':
            cyl_x(-L + 0.2, L - 0.2, 0.0, zb + 4.0, B + 0.6, 'cream', oid=o, tex=bonnet, th=(0.6, 0.2, -0.3))
        else:
            cyl_rot_z(0.0, -L + 0.2, L - 0.2, zb + 4.0, B + 0.6, o)
    # wheels: back 1.4u across, front 1.1u
    for a, r in ((-L + 1.6, 2.8), (L - 1.8, 2.2)):
        for bb in (-B - 0.4, B + 0.4):
            _wheel_z(F, a, bb, r, r, o)
    # the tongue resting on the ground
    F.box(L, -0.4, 0.4, L + 6.0, 0.4, 1.0, 'wood', shades=(0, 2, 3), oid=o)
    return o


def cyl_rot_z(xc, y0, y1, zc, r, o):
    """A half cylinder lying along y (the engine only has cylinders along x): drawn as boxes, one per pixel column."""
    n = 16
    for j in range(n):
        a0 = math.pi * j / n; a1 = math.pi * (j + 1) / n
        x0 = xc + math.cos(a1) * r; x1 = xc + math.cos(a0) * r
        z0 = zc + min(math.sin(a0), math.sin(a1)) * r
        lit = math.cos((a0 + a1) / 2) < 0.2
        box(min(x0, x1), y0, zc, max(x0, x1) + 0.05, y1, zc + max(math.sin(a0), math.sin(a1)) * r, 'cream',
            shades=(0 if lit else 1, 1, 2), oid=o,
            tex=lambda f, X, Y, Z, i: (None, np.where(np.mod(Y, 2.4) < 0.5, clampi(i + 1), i)))


# ---------------- horses (drawn in 3D along x, head to +x; turned with the canvas for the other way) ----------------
COATS = {'bay': ('wood', 'ink'), 'grey': ('iron', 'dark'), 'dun': ('straw', 'wood')}


def horse(frame=0, coat='bay', tack=True, d='e'):
    """A saddled horse standing along x, head to +x, at a hitching rail: withers about 2.2u, 3.4u long.
    frame 0/1: the tail hangs or flicks out (the 2-frame idle). d 'w': head to -x."""
    o = new_oid(True)
    body, mane = COATS[coat]
    m = 1.0 if d == 'e' else -1.0     # 'w': the same horse mirrored along x (head to -x), still lit from the left

    def box(x0, y0, z0, x1, y1, z1, *a, **k):
        x0, x1 = sorted((m * x0, m * x1))
        return E.box(x0, y0, z0, x1, y1, z1, *a, **k)

    def sphere(x, y, z, *a, **k):
        return E.sphere(m * x, y, z, *a, **k)

    def cyl_x(x0, x1, *a, **k):
        x0, x1 = sorted((m * x0, m * x1))
        return E.cyl_x(x0, x1, *a, **k)
    def hair(face, X, Y, Z, idx):
        return np.full(X.shape, R(mane) if mane != 'ink' else R('dark')), np.full(X.shape, 2 if mane == 'ink' else 1)
    # legs (the near pair lit), with dark hooves and pale socks on the bay
    for x in (-3.8, 3.2):
        for y in (-0.9, 0.9):
            xx = x + (0.5 if y > 0 else -0.3)
            box(xx - 0.3, y - 0.3, 0.8, xx + 0.3, y + 0.3, 7.6, body, shades=(1 if y > 0 else 2, 2, 3), oid=o)
            box(xx - 0.35, y - 0.35, 0.0, xx + 0.35, y + 0.35, 0.8, 'dark', shades=(2, 2, 3), oid=o)
            if coat == 'bay' and y > 0:
                box(xx - 0.32, y - 0.32, 0.8, xx + 0.32, y + 0.32, 2.0, 'cream', shades=(1, 1, 2), oid=o)
    # barrel of the body, chest and rump
    cyl_x(-4.0, 3.6, 0.0, 9.4, 1.8, body, oid=o, th=(0.75, 0.35, -0.2), cap=False)
    sphere(3.6, 0.0, 9.6, 1.9, body, oid=o, th=(0.8, 0.4, -0.2))
    sphere(-4.0, 0.0, 9.8, 2.0, body, oid=o, th=(0.8, 0.4, -0.2))
    # neck rising forward, the head angled down to the muzzle
    for k in range(7):
        x = 3.8 + k * 0.55; z = 10.4 + k * 0.8
        box(x - 0.7, -0.55, z - 1.0, x + 0.7, 0.55, z + 0.8, body, shades=(1, 2, 3), oid=o)
        box(x - 0.8, -0.3, z + 0.6, x - 0.1, 0.3, z + 1.2, mane, shades=(2, 2, 3), oid=o, tex=hair)
    box(6.6, -0.7, 14.4, 7.6, 0.7, 16.2, body, shades=(1, 2, 3), oid=o)
    for k in range(4):
        box(7.0 + k * 0.55, -0.6, 14.6 - k * 0.6, 8.0 + k * 0.55, 0.6, 15.7 - k * 0.6, body, shades=(1, 2, 3), oid=o)
    box(8.8, -0.55, 12.6, 9.4, 0.55, 13.6, 'dark' if coat != 'grey' else 'iron', shades=(2, 2, 3), oid=o)
    box(6.6, -0.6, 16.2, 7.1, -0.1, 17.1, body, shades=(1, 2, 3), oid=o)
    box(6.6, 0.1, 16.2, 7.1, 0.6, 17.1, body, shades=(1, 2, 3), oid=o)
    # the tail
    sw = 0.0 if frame == 0 else 1.2
    for k in range(7):
        x = -5.6 - k * 0.12 + (k * k * 0.03 if frame else 0)
        y = sw * (k / 6.0) ** 1.5
        box(x - 0.45, y - 0.45, 10.4 - k * 1.05, x + 0.45, y + 0.45, 11.4 - k * 1.05, mane, shades=(2, 2, 3), oid=o, tex=hair)
    if tack:
        # saddle and blanket, a stirrup, the reins to the rail
        box(-1.5, -1.95, 8.4, 1.5, 1.95, 11.3, 'red' if coat == 'grey' else 'navy', shades=(1, 1, 2), oid=o)
        box(-1.2, -1.3, 11.1, 1.4, 1.3, 11.9, 'wood', shades=(1, 2, 3), oid=o)
        box(0.9, -0.5, 12.0, 1.5, 0.5, 13.0, 'wood', shades=(1, 2, 3), oid=o)
        box(-0.3, 1.9, 5.6, 0.3, 2.2, 9.0, 'wood', shades=(2, 2, 3), oid=o)
        box(-0.5, 1.8, 5.0, 0.5, 2.3, 5.6, 'iron', shades=(1, 2, 3), oid=o)
    return o


# ---------------- telegraph pole, water tower ----------------

def telegraph_pole():
    """A telegraph pole 6u tall with one crossarm along x (the line runs along the track) and four glass insulators."""
    o = new_oid(True)
    cyl_z(0, 0, 0, 6.0 * UY, 0.75, 'wood', oid=o, th=(0.4, 0.1, -0.3))
    box(-4.4, -0.45, 5.4 * UY, 4.4, 0.45, 5.4 * UY + 1.0, 'wood', shades=(0, 2, 3), oid=o)
    for x in (-3.8, -1.6, 1.6, 3.8):
        box(x - 0.3, -0.3, 5.4 * UY + 1.0, x + 0.3, 0.3, 5.4 * UY + 2.4, 'glass', shades=(0, 1, 2), oid=o)
    box(-1.2, -0.3, 5.0 * UY, 1.2, 0.3, 5.4 * UY, 'wood', shades=(1, 2, 3), oid=o)
    return o


def water_tower():
    """The railroad's water tank: a 4u wooden tub with iron hoops on a timber trestle, a conical roof and a spout,
    about 9u to the roof top."""
    o = new_oid(True)
    leg_h = 4.6 * UY
    for x in (-6.0, 6.0):
        for y in (-6.0, 6.0):
            box(x - 0.8, y - 0.8, 0, x + 0.8, y + 0.8, leg_h, 'wood', shades=(1, 2, 3), oid=o)
    for z in (6.0, 15.0):
        box(-6.4, -6.4, z, 6.4, -5.6, z + 0.8, 'wood', shades=(0, 2, 3), oid=o)
        box(-6.4, 5.6, z, 6.4, 6.4, z + 0.8, 'wood', shades=(0, 2, 3), oid=o)
        box(-6.4, -6.4, z, -5.6, 6.4, z + 0.8, 'wood', shades=(0, 2, 3), oid=o)
        box(5.6, -6.4, z, 6.4, 6.4, z + 0.8, 'wood', shades=(0, 2, 3), oid=o)
    # diagonal braces on the two seen faces (stepped)
    for k in range(10):
        box(-6.0 + k * 1.2, 6.0, 1.0 + k * 1.4, -4.8 + k * 1.2, 6.6, 2.0 + k * 1.4, 'wood', shades=(2, 2, 3), oid=o, cast=False)
        box(6.0, 6.0 - k * 1.2 - 1.2, 1.0 + k * 1.4, 6.6, 6.0 - k * 1.2, 2.0 + k * 1.4, 'wood', shades=(3, 3, 3), oid=o, cast=False)
    box(-7.2, -7.2, leg_h, 7.2, 7.2, leg_h + 1.0, 'wood', shades=(1, 2, 3), oid=o)
    r = 8.0
    th = 3.4 * UY
    def staves(face, X, Y, Z, idx):
        if face == 't':
            return None, idx
        hp = np.mod(Z - leg_h, 4.0) < 0.6
        ang = np.arctan2(Y, X)
        ii = np.where(np.mod(ang * 12, 1.0) < 0.2, clampi(idx + 1), idx)
        return np.where(hp, R('iron'), R('wood')), np.where(hp, clampi(idx + 1), ii)
    cyl_z(0, 0, leg_h + 1.0, leg_h + 1.0 + th, r, 'wood', oid=o, tex=staves)
    # conical roof
    for k in range(8):
        rr = r + 0.8 - k * 1.1
        cyl_z(0, 0, leg_h + 1.0 + th + k * 0.9, leg_h + 1.0 + th + (k + 1) * 0.9, rr, 'roof', oid=o, th=(0.45, 0.2, -0.2), topidx=1)
    # the spout, hanging along x towards the track (-z side is the track for a tower north of it: the spout points +z)
    box(-0.7, r - 1.0, leg_h + 2.0, 0.7, r + 6.0, leg_h + 3.4, 'iron', shades=(1, 2, 3), oid=o)
    box(-0.5, r + 5.4, leg_h - 6.0, 0.5, r + 6.2, leg_h + 2.0, 'iron', shades=(1, 2, 3), oid=o)
    box(-0.15, r + 2.0, leg_h + 3.4, 0.15, r + 2.3, leg_h + 1.0 + th + 4.0, 'iron', shades=(2, 2, 3), oid=o, cast=False)
    # a ladder on the lit side
    for k in range(12):
        box(-1.2, 6.8, 2.0 + k * 2.0, 1.2, 7.2, 2.4 + k * 2.0, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    for x in (-1.3, 1.0):
        box(x, 6.8, 0, x + 0.3, 7.2, leg_h + th, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    return o


def woodpile():
    """Split cordwood stacked between end posts (the station's stove wood), 3u long along x."""
    o = new_oid(True)
    for x in (-6.4, 6.4):
        box(x - 0.4, -1.6, 0, x + 0.4, -0.8, 8.0, 'wood', shades=(1, 2, 3), oid=o)
        box(x - 0.4, 0.8, 0, x + 0.4, 1.6, 8.0, 'wood', shades=(1, 2, 3), oid=o)
    for r in range(5):
        for k in range(8):
            yy = -0.9 + (k % 2) * 0.1
            x = -5.4 + k * 1.55 + (0.7 if r % 2 else 0)
            if x > 5.6:
                continue
            # logs lie along z (their cut ends towards the viewer on the lit side)
            _log_z(x, -1.8, 1.8, 0.8 + r * 1.45, 0.75, o)
    return o


def _log_z(xc, y0, y1, zc, r, o, ramp='wood'):
    """A log lying along z: drawn as boxes per pixel row (round end facing +z, the lit side)."""
    n = 6
    for j in range(n):
        a = math.pi * (j + 0.5) / n - math.pi / 2
        hz = math.cos(a) * r
        x0 = xc + math.sin(a) * r - r / n
        box(x0, y0, zc - hz, x0 + 2 * r / n + 0.05, y1, zc + hz, ramp, shades=(1, 1 if j < 3 else 2, 3), oid=o,
            tex=lambda f, X, Y, Z, i: (None, np.where(f == 'l', np.where((X - xc) ** 2 + (Z - zc) ** 2 < (r * 0.55) ** 2, 0, 1), i)))


def privy_prop():
    o = new_oid(True)
    T.privy(Frame('s'), 0.0, 0.0, o)
    return o


def rain_barrel_prop():
    o = new_oid(True)
    T.rain_barrel(Frame('s'), 0.0, 0.0, o)
    return o


def washing_line_prop():
    o = new_oid(True)
    T.washing_line(Frame('s'), -10.0, 10.0, 0.0, o, [(-6.0, 3.0, 4.0, 'cream', 0), (-1.5, 2.4, 3.2, 'slate', 1),
                                                      (3.0, 3.6, 5.0, 'red', 1), (7.5, 2.2, 3.0, 'cream', 0)])
    return o


def corral(axis='x'):
    """A 4u section of post-and-rail corral fence along x or z, the post at the -x (or -z) end."""
    o = new_oid(True)
    F = Frame('s' if axis == 'x' else 'e')
    F.box(-0.6, -0.6, 0, 0.6, 0.6, 1.6 * UY, 'wood', shades=(1, 2, 3), oid=o)
    for z in (0.55, 1.0, 1.45):
        F.box(0.0, -0.35, z * UY - 0.4, 16.0, 0.35, z * UY + 0.3, 'wood', shades=(0, 2, 3), oid=o)
    return o


def corral_gate():
    o = new_oid(True)
    for x in (-8.0, 8.0):
        box(x - 0.7, -0.7, 0, x + 0.7, 0.7, 2.0 * UY, 'wood', shades=(1, 2, 3), oid=o)
    box(-8.7, -0.5, 2.0 * UY, 8.7, 0.5, 2.0 * UY + 1.0, 'wood', shades=(0, 2, 3), oid=o)
    for z in (0.5, 1.0, 1.4):
        box(-7.3, -0.3, z * UY - 0.3, 7.3, 0.3, z * UY + 0.3, 'wood', shades=(0, 2, 3), oid=o)
    for k in range(10):
        box(-7.0 + k * 1.4, -0.3, 0.5 * UY + k * 0.48, -5.6 + k * 1.4, 0.3, 0.5 * UY + k * 0.48 + 0.6, 'wood',
            shades=(1, 2, 3), oid=o, cast=False)
    return o


def anvil():
    o = new_oid(True)
    box(-1.2, -1.2, 0, 1.2, 1.2, 3.6, 'wood', shades=(1, 2, 3), oid=o)
    box(-0.8, -0.9, 3.6, 0.8, 0.9, 4.6, 'iron', shades=(1, 2, 3), oid=o)
    box(-2.0, -1.0, 4.6, 1.8, 1.0, 6.0, 'iron', shades=(0, 2, 3), oid=o)
    box(1.8, -0.6, 5.2, 3.2, 0.6, 6.0, 'iron', shades=(0, 2, 3), oid=o)
    return o


def wheel_lean():
    """Two wagon wheels leaning against a wall (the wall at -x; the wheels face +x)."""
    o = new_oid(True)
    disc_x(-2.4, 5.6, 5.4, 1.0, 'wood', oid=o, spokes=10)
    disc_x(2.8, 4.6, 4.4, 2.0, 'wood', oid=o, spokes=10)
    return o


def notice_board():
    """A notice board on two posts, its face to +z, with bills and a WANTED poster."""
    o = new_oid(True)
    for x in (-4.0, 4.0):
        box(x - 0.4, -0.4, 0, x + 0.4, 0.4, 13.0, 'wood', shades=(1, 2, 3), oid=o)
    def bills(face, X, Y, Z, i):
        rr = np.full(X.shape, R('wood')); ii = np.full(X.shape, 2)
        if face != 'l':
            return None, i
        for (x0, x1, z0, z1, r_, k) in ((-4.4, -1.4, 8.0, 12.4, 'cream', 0), (-0.8, 2.0, 7.0, 11.0, 'c1' and 'cream', 1),
                                        (2.4, 4.4, 9.0, 12.6, 'straw', 0)):
            m = (X >= x0) & (X < x1) & (Z >= z0) & (Z < z1)
            rr = np.where(m, R(r_), rr); ii = np.where(m, k, ii)
            ln = m & (np.mod(Z, 1.4) < 0.5) & (X > x0 + 0.4) & (X < x1 - 0.4) & (Z < z1 - 1.2)
            ii = np.where(ln, 3, ii)
        return rr, ii
    box(-5.0, 0.0, 6.0, 5.0, 0.6, 13.0, 'wood', tex=bills, oid=o, shades=(2, 2, 3))
    box(-5.4, -0.2, 13.0, 5.4, 1.0, 13.8, 'wood', shades=(1, 2, 3), oid=o)
    return o


def wash_bridge():
    """A plank footbridge over the dry wash, 8u long along x, 1.6u wide, on log sills, with a hand rail on one side."""
    o = new_oid(True)
    L, B = 16.0, 3.2
    def planks(face, X, Y, Z, i):
        if face == 't':
            ii = np.where(np.mod(X, 1.6) < 0.45, 2, np.where(hash2(np.floor(X / 1.6).astype(int), 5) % 5 == 0, 0, 1))
            return None, ii
        return None, i
    box(-L, -B, 3.0, L, B, 4.0, 'wood', tex=planks, oid=o)
    for x in (-L + 1.0, 0.0, L - 1.0):
        box(x - 0.6, -B, 0, x + 0.6, -B + 1.0, 3.0, 'wood', shades=(1, 2, 3), oid=o)
        box(x - 0.6, B - 1.0, 0, x + 0.6, B, 3.0, 'wood', shades=(1, 2, 3), oid=o)
    for x in (-L + 0.6, -5.0, 5.0, L - 0.6):
        box(x - 0.35, -B, 4.0, x + 0.35, -B + 0.7, 9.4, 'wood', shades=(1, 2, 3), oid=o)
    box(-L, -B, 9.0, L, -B + 0.6, 9.6, 'wood', shades=(0, 2, 3), oid=o)
    return o


def lever_crate_stack():
    """Freight on the depot square: crates and a barrel with a tarpaulin half over them."""
    o = new_oid(True)
    TW.crate_box(-3.6, -2.6, 0, 3.4, 2.8, 2.6, oid=o)
    TW.crate_box(0.0, -2.6, 0, 3.4, 2.8, 2.6, ramp='ochre', oid=o)
    TW.crate_box(-2.0, -2.4, 2.6, 3.4, 2.8, 2.4, oid=o)
    box(-3.8, -2.8, 4.6, 0.6, 0.4, 5.4, 'slate', shades=(0, 1, 2), oid=o)
    box(0.6, -2.8, 2.4, 1.0, 0.4, 5.4, 'slate', shades=(0, 1, 2), oid=o)
    return o
