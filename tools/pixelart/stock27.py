# D27 rolling stock at the anchor scale (plans/d27-tech.md sections 1.2 and 7.2; owner A2): the 4-4-0 with its
# tender (and a black freight 2-6-0), the coach with its interior for the cut-away, the boxcar with its sliding door
# and its cut-away, the flatcar, steam. Drawn in game units with geom27 (1u = 8 px across), no stretching.
#
# Each vehicle is drawn around the origin: x along it (its front at +x when d = +1), z across (+z is the near,
# south side in the fixed view), y up from the rail's foot level (y = 0 is the ground at the track centre line).
# The wheels stand on the rail top, RAIL_TOP. The interior layout (seats, stove, lamps, racks, doors) is in COACH and
# BOXCAR below: the same numbers go into the atlas' extra data and plans/proto-sprites.md, so the art, P's seat list
# and R's sorting agree.
import math
import numpy as np
import engine as E
from engine import R, new_oid
from geom27 import B, CYV, CYX, obox, ocyl, axes_tilt, clampi

RAIL_TOP = 0.34          # u: the wheels' running surface (as D25's contract)
FLOOR = 1.6              # u: car floor and cab floor, level with the cargo platform

# ---------------------------------------------------------------- shared parts
def wheel(x, z, r, ramp='iron', oid=0, phase=0.0, spokes=0, near=True, counter=False, thick=0.12):
    """A wheel standing on the rail top, its face towards +z (near side) or -z. spokes > 0 draws spokes (as
    shading, the gaps dark), counter a counterweight (drivers)."""
    yc = RAIL_TOP + r
    def tex(part, s, ang, rho, idx):
        rr = np.full(s.shape, R(ramp)); ii = np.where(part == 0, 3, 2)
        face = part != 0
        lit = np.cos(ang - 2.3) > 0
        ii = np.where(face, np.where(lit, 0, 1), ii)
        if spokes:
            a = (ang + phase) * spokes / (2 * np.pi)
            sp = np.abs((a % 1.0) - 0.5) > 0.32
            gap = face & ~sp & (rho > 0.16 * r) & (rho < r - 0.16)
            ii = np.where(gap, 2, ii)
        if counter:
            cw = face & (rho > 0.25 * r) & (rho < r - 0.16) & (np.cos(ang + phase - np.pi) > 0.72)
            ii = np.where(cw, 2, ii)
        tyre = face & (rho > r - 0.16)
        rr = np.where(tyre | (part == 0), R('iron'), rr)
        ii = np.where(tyre, np.where(lit, 1, 2), ii)
        hub = face & (rho < 0.15 * r + 0.05)
        rr = np.where(hub, R('brass'), rr); ii = np.where(hub, 1, ii)
        return rr, ii
    zc = z + (thick / 2 if near else -thick / 2)
    ocyl((x, zc, yc), (0, 1, 0), r, thick / 2, ramp, tex=tex, oid=oid, ref=(1, 0, 0))
    return yc


def truck(xc, base=0.75, r=0.55, oid=0, kind='car'):
    """A four-wheel truck centred at x = xc: two axles base apart, side frames (arch bars), bolster, springs."""
    for s in (-1, 1):
        wheel(xc + s * base, 1.03, r, 'iron', oid=oid)
        wheel(xc + s * base, -1.03, r, 'iron', oid=oid, near=False)
    yc = RAIL_TOP + r
    # arch-bar side frames on the near side (the far side is hidden by the wheels and the body)
    B(xc - base - 0.25, 1.15, yc - 0.12, xc + base + 0.25, 1.25, yc + 0.08, 'iron', shades=(2, 2, 3), oid=oid)
    for s in (-1, 1):
        a, b, c = axes_tilt((s, 0, 0), -24)
        obox((xc + s * base * 0.45, 1.2, yc + 0.32), (a, b, c), (base * 0.55, 0.05, 0.05), 'iron', oid=oid, shades=(2, 2, 3))
    B(xc - 0.3, 1.1, yc + 0.08, xc + 0.3, 1.3, yc + 0.5, 'iron', shades=(1, 2, 3), oid=oid)      # spring pack
    B(xc - 0.18, -1.3, yc + 0.5, xc + 0.18, 1.3, yc + 0.66, 'wood', shades=(1, 2, 3), oid=oid)   # bolster
    B(xc - 0.12, 1.13, yc - 0.1, xc + 0.12, 1.32, yc + 0.1, 'iron', shades=(1, 1, 2), oid=oid)  # journal box
    for s in (-1, 1):
        B(xc + s * base - 0.12, 1.13, yc - 0.1, xc + s * base + 0.12, 1.32, yc + 0.12, 'iron', shades=(1, 2, 3), oid=oid)


def truss(x0, x1, y_top, depth=0.45, oid=0):
    """Truss rods with queen posts under a car body, near side only (the far side is hidden)."""
    qa, qb = x0 + (x1 - x0) * 0.36, x0 + (x1 - x0) * 0.64
    yb = y_top - depth
    for z in (1.55, -1.55):
        for (a, b) in ((x0, qa), (qb, x1)):
            ya, yb2 = (y_top, yb) if a == x0 else (yb, y_top)
            L = math.hypot(b - a, yb2 - ya)
            dirv = np.array([(b - a) / L, 0, (yb2 - ya) / L])
            ax2 = np.array([0, 1.0, 0]); ax3 = np.cross(dirv, ax2)
            obox(((a + b) / 2, z, (ya + yb2) / 2), (dirv, ax2, ax3), (L / 2, 0.03, 0.03), 'iron', oid=oid, shades=(2, 3, 3))
        B(qa, z - 0.03, yb, qb, z + 0.03, yb + 0.06, 'iron', shades=(2, 3, 3), oid=oid)
        for q in (qa, qb):
            B(q - 0.04, z - 0.04, yb, q + 0.04, z + 0.04, y_top, 'iron', shades=(2, 3, 3), oid=oid)


def coupler(x, d, oid=0):
    """A link-and-pin drawhead at the end x, pointing outwards (d = +1: towards +x)."""
    x1 = x + d * 0.3
    B(min(x, x1), -0.14, 1.1, max(x, x1), 0.14, 1.35, 'iron', shades=(1, 2, 3), oid=oid)


# ---------------------------------------------------------------- the locomotive
LOCO_LEN = 18.0
TENDER_LEN = 7.0
LOOKS = {
    'passenger': dict(boiler='green', cab='green', trim='cream', wheel='red', dome='brass', band='brass', stack='balloon',
                      drivers=(3.1, 5.4), dr=1.05, leading=(8.0, 9.4), tender='green'),
    'freight': dict(boiler='blk', cab='red', trim='ochre', wheel='red', dome='blk', band='iron', stack='diamond',
                    drivers=(2.9, 4.75, 6.6), dr=0.9, leading=(8.9,), tender='blk'),
}


class Along:
    """Positions along a vehicle measured from its rear (u) to x, for either facing."""
    def __init__(self, length, d):
        self.L, self.d = length, d

    def x(self, u):
        return self.d * (u - self.L / 2)

    def u(self, x):
        return self.d * x + self.L / 2

    def box(self, u0, u1, z0, z1, y0, y1, ramp, **kw):
        B(self.x(u0), z0, y0, self.x(u1), z1, y1, ramp, **kw)


def loco(d=1, phase=0.0, look='passenger', frame_only=False):
    """Engine and tender as one vehicle, 18u over the couplers (engine 11, tender 7), centred on the origin, the
    engine at the front (+x for d = +1)."""
    k = LOOKS[look]
    A = Along(LOCO_LEN, d)
    o = new_oid(True)
    e0 = TENDER_LEN                     # the engine's rear, u from the vehicle's rear
    def E_(u0, u1, *a, **kw):
        A.box(e0 + u0, e0 + u1, *a, **kw)
    def xe(u):
        return A.x(e0 + u)

    # ---- tender
    to = new_oid(True)
    A.box(0.25, 6.8, -1.5, 1.5, 1.0, 1.42, 'iron', shades=(2, 3, 3), oid=to)
    def tt(face, x, z, y, idx):
        u = A.u(x)
        rr = np.full(x.shape, R(k['tender'])); ii = idx.copy()
        if face == 'l':
            band = (np.abs(y - 2.35) < 0.07) | (np.abs(y - 1.62) < 0.05)
            rr = np.where(band, R(k['trim']), rr); ii = np.where(band, 1, ii)
            panel = (y > 1.75) & (y < 2.22) & (u > 1.6) & (u < 5.2)
            edge = panel & ((y < 1.8) | (y > 2.17) | (u < 1.68) | (u > 5.12))
            ii = np.where(edge, clampi(ii + 1), ii)
            letters = panel & (y > 1.88) & (y < 2.1) & (u > 2.0) & (u < 4.8) & (((u * 4.0) % 1.0) < 0.55)
            rr = np.where(letters, R(k['trim']), rr); ii = np.where(letters, 1, ii)
        if face == 'r':
            band = np.abs(y - 2.35) < 0.07
            rr = np.where(band, R(k['trim']), rr); ii = np.where(band, 2, ii)
        return rr, ii
    A.box(0.1, 6.75, -1.9, 1.9, 1.42, 3.0, k['tender'], oid=to, tex=tt)
    A.box(0.05, 6.8, -1.98, 1.98, 3.0, 3.12, 'iron', shades=(1, 2, 3), oid=to)     # coping
    def logs(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood'))
        if face == 't':
            row = np.floor(z / 0.32).astype(int)
            ii = np.where((z / 0.32) % 1.0 < 0.3, 3, 1)
            h = E.hash2(np.floor(x / 0.7).astype(int) + row * 7, row) % 4
            ii = np.where((h == 0) & (ii == 1), 2, ii)
            return rr, ii
        if face == 'l':
            cx = (x / 0.32) % 1.0; cy = ((y - 3.12) / 0.27) % 1.0
            ring = (cx - 0.5) ** 2 + (cy - 0.5) ** 2
            ii = np.where(ring < 0.12, 1, np.where(ring < 0.22, 2, 3))
            return rr, ii
        cy = ((y - 3.12) / 0.27) % 1.0
        return rr, np.where(cy < 0.3, 3, 2)
    A.box(2.4, 6.5, -1.6, 1.6, 3.12, 3.95, 'wood', oid=to, tex=logs)
    A.box(0.5, 1.5, -0.6, 0.6, 3.12, 3.3, 'iron', shades=(1, 2, 3), oid=to)        # tank filler
    for uc in (1.45, 5.35):
        truck(A.x(uc), base=0.55, r=0.45, oid=to)
    coupler(A.x(0.0), -d, oid=to)

    # ---- engine frame, cab and boiler
    E_(0.0, 10.3, -1.0, 1.0, 1.0, 1.5, 'iron', shades=(2, 3, 3), oid=o)
    def cabtex(face, x, z, y, idx):
        u = A.u(x) - e0
        rr = np.full(x.shape, R(k['cab'])); ii = idx.copy()
        if face == 'l':
            boards = ((u * 5.0) % 1.0) < 0.18
            ii = np.where(boards & (y < 3.3), clampi(ii + 1), ii)
            win = (y > 3.55) & (y < 4.6) & (((u > 0.35) & (u < 1.15)) | ((u > 1.5) & (u < 2.3)))
            rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(y > 4.25, 0, 2), ii)
            frm = (y > 3.45) & (y < 4.7) & (((u > 0.27) & (u < 1.23)) | ((u > 1.42) & (u < 2.38))) & ~win
            rr = np.where(frm, R(k['trim']), rr); ii = np.where(frm, 1, ii)
            trim = (np.abs(y - 3.3) < 0.06) | (np.abs(y - 1.75) < 0.05)
            rr = np.where(trim, R(k['trim']), rr); ii = np.where(trim, 1, ii)
            num = (y > 2.4) & (y < 2.9) & (u > 0.9) & (u < 1.8)
            numd = num & ((((u - 0.9) * 6) % 1.0) < 0.5) & (y > 2.5) & (y < 2.8)
            rr = np.where(num, R('brass'), rr); ii = np.where(num, np.where(numd, 3, 1), ii)
        if face == 'r':
            win = (y > 3.6) & (y < 4.6) & (np.abs(z) > 0.95) & (np.abs(z) < 1.75)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, 3, ii)
        return rr, ii
    E_(0.0, 2.7, -2.0, 2.0, 1.5, 5.2, k['cab'], oid=o, tex=cabtex)
    E_(-0.2, 2.9, -2.15, 2.15, 5.2, 5.32, 'roof', shades=(1, 3, 3), oid=o)
    E_(0.1, 2.6, -1.7, 1.7, 5.32, 5.45, 'roof', shades=(1, 3, 3), oid=o)
    E_(0.6, 2.1, -0.5, 0.5, 5.45, 5.5, 'iron', shades=(1, 3, 3), oid=o)              # roof vent
    E_(2.7, 4.1, -0.95, 0.95, 1.5, 3.9, k['boiler'], oid=o, shades=(1, 2, 3))      # firebox
    # boiler with bands
    bcx = (xe(2.6) + xe(8.4)) / 2
    def btex(part, s, ang, rho, idx):
        u = 5.5 + s * d          # the boiler's centre is at engine u 5.5
        bnd = (np.abs(u - 4.0) < 0.07) | (np.abs(u - 5.6) < 0.07) | (np.abs(u - 7.2) < 0.07) | (np.abs(u - 8.33) < 0.07)
        rr = np.where(bnd, R(k['band']), R(k['boiler']))
        ii = np.where(bnd, np.minimum(idx, 2), idx)
        return rr, ii
    ocyl((bcx, 0, 3.4), (1, 0, 0), 0.95, 2.9, k['boiler'], tex=btex, oid=o)
    def sbtex(part, s, ang, rho, idx):
        rr = np.full(s.shape, R('blk')); ii = idx.copy()
        door = (part != 0) & (rho < 0.62)
        ii = np.where(door, np.where(rho < 0.5, 2, 3), ii)
        hinge = door & (np.abs(np.sin(ang)) < 0.12) & (rho > 0.2)
        ii = np.where(hinge, 1, ii)
        num = (part != 0) & (rho < 0.16)
        rr = np.where(num, R('brass'), rr); ii = np.where(num, 1, ii)
        return rr, ii
    ocyl(((xe(8.4) + xe(9.95)) / 2, 0, 3.4), (d, 0, 0), 1.0, 0.775, 'blk', tex=sbtex, oid=o)
    # running boards and splashers
    for zs in (1, -1):
        E_(2.7, 9.6, zs * 1.1, zs * 1.62, 2.12, 2.22, 'iron', shades=(1, 3, 3), oid=o)
    for u in k['drivers']:
        if look == 'passenger':
            E_(u - 1.12, u + 1.12, 1.1, 1.5, 2.22, 2.55, k['boiler'], shades=(1, 2, 3), oid=o)
            E_(u - 1.12, u + 1.12, 1.5, 1.56, 2.22, 2.58, 'brass', shades=(1, 1, 2), oid=o)
    # stack
    xs = xe(9.15)
    if k['stack'] == 'balloon':
        CYV(xs, 0, 4.3, 5.3, 0.3, 'blk', oid=o)
        CYV(xs, 0, 5.3, 5.55, 0.5, 'blk', oid=o, topidx=2)
        CYV(xs, 0, 5.55, 5.85, 0.72, 'blk', oid=o, topidx=2)
        CYV(xs, 0, 5.85, 6.25, 0.88, 'blk', oid=o, topidx=3)
        CYV(xs, 0, 6.25, 6.4, 0.7, 'iron', oid=o, topidx=3)
        CYV(xs, 0, 6.38, 6.42, 0.45, 'blk', oid=o, topidx=4)
    else:
        CYV(xs, 0, 4.3, 5.15, 0.3, 'blk', oid=o)
        for (y0, y1, r) in ((5.15, 5.4, 0.48), (5.4, 5.7, 0.7), (5.7, 6.0, 0.62), (6.0, 6.25, 0.48), (6.25, 6.4, 0.36)):
            CYV(xs, 0, y0, y1, r, 'blk', oid=o, topidx=3)
    # domes, bell, whistle, sand pipes
    for u, r in ((5.0, 0.42), (6.95, 0.38)):
        CYV(xe(u), 0, 4.1, 4.75, r, k['dome'], oid=o)
        E.sphere(xe(u) * 4, 0, 4.75 * E.U_Y, r * 4, k['dome'], oid=o, sz=0.75 * E.U_Y / 4 * 0.75)
    CYV(xe(5.0), 0, 4.95, 5.35, 0.06, 'brass', oid=o)                                 # whistle
    CYV(xe(5.0), 0, 5.2, 5.35, 0.12, 'brass', oid=o)
    B(xe(7.9) - 0.06, -0.35, 4.3, xe(7.9) + 0.06, 0.35, 4.85, 'iron', shades=(1, 2, 3), oid=o)   # bell yoke
    E.sphere(xe(7.9) * 4, 0, 4.62 * E.U_Y, 0.26 * 4, 'brass', oid=o, sz=1.2)
    # headlamp on its bracket in front of the stack
    E_(9.62, 10.45, -0.42, 0.42, 4.3, 5.18, 'ochre' if look == 'passenger' else 'blk', shades=(1, 2, 3), oid=o)
    E_(9.55, 10.52, -0.5, 0.5, 5.18, 5.3, 'iron', shades=(1, 2, 3), oid=o)
    E_(9.85, 10.25, -0.15, 0.15, 5.3, 5.5, 'iron', shades=(1, 2, 3), oid=o)
    if d > 0:
        x = xe(10.46)
        B(x - 0.02, -0.28, 4.45, x + 0.04, 0.28, 5.05, 'fire', shades=(0, 0, 0), oid=o, cast=False)
        B(x - 0.02, -0.12, 4.6, x + 0.05, 0.12, 4.9, 'fire', shades=(0, 0, 0), oid=o, cast=False)
    # cylinders and steam chest (near and far), crosshead guides
    for zs in (1, -1):
        cz = zs * 1.42
        def ctex(part, s, ang, rho, idx):
            end = np.abs(np.abs(s) - 0.62) < 0.05
            rr = np.where(end, R('brass'), R(k['boiler'] if look == 'passenger' else 'blk'))
            return rr, idx
        ocyl(((xe(7.85) + xe(9.15)) / 2, cz, 1.68), (1, 0, 0), 0.42, 0.65, 'iron', tex=ctex, oid=o)
        E_(7.95, 9.05, zs * 1.15, zs * 1.65, 2.05, 2.45, k['boiler'] if look == 'passenger' else 'blk', shades=(1, 2, 3), oid=o)
    E_(6.5, 7.85, 1.5, 1.6, 1.62, 1.74, 'iron', shades=(0, 2, 3), oid=o)              # guide bar
    # wheels: leading truck, drivers with rods
    for u in k['leading']:
        wheel(xe(u), 1.03, 0.45, k['wheel'], oid=o, phase=phase * 2.2, spokes=8)
        wheel(xe(u), -1.03, 0.45, k['wheel'], oid=o, near=False)
    spin = phase if d > 0 else -phase
    dr = k['dr']
    for u in k['drivers']:
        wheel(xe(u), 1.12, dr, k['wheel'], oid=o, phase=spin, spokes=12 if look == 'passenger' else 10, counter=True)
        wheel(xe(u), -1.12, dr, k['wheel'], oid=o, near=False)
    # crank pins: radius 0.45 dr, at the drawing's angle (the wheel's ang is measured from +x towards +y up)
    yc = RAIL_TOP + dr
    rc = 0.45 * dr
    ca = -spin
    pins = [(xe(u) + rc * math.cos(ca) * 1, yc + rc * math.sin(ca)) for u in k['drivers']]
    zr = 1.12 + 0.13
    xa = min(p[0] for p in pins); xb = max(p[0] for p in pins)
    B(xa - 0.1, zr, pins[0][1] - 0.07, xb + 0.1, zr + 0.06, pins[0][1] + 0.07, 'iron', shades=(0, 1, 2), oid=o, cast=False)
    for (px, py) in pins:
        B(px - 0.08, zr + 0.06, py - 0.08, px + 0.08, zr + 0.12, py + 0.08, 'brass', shades=(0, 1, 1), oid=o, cast=False)
    # main rod from the front driver's pin to the crosshead
    fp = max(pins, key=lambda p: d * p[0])
    chx = xe(7.2) + d * 0.35 * math.cos(ca)
    chy = 1.68
    L = math.hypot(chx - fp[0], chy - fp[1])
    dv = np.array([(chx - fp[0]) / L, 0, (chy - fp[1]) / L])
    a2 = np.array([0, 1.0, 0]); a3 = np.cross(dv, a2)
    obox(((chx + fp[0]) / 2, zr + 0.17, (chy + fp[1]) / 2), (dv, a2, a3), (L / 2, 0.04, 0.07), 'iron', oid=o, shades=(0, 1, 2))
    B(chx - 0.16, 1.5, 1.55, chx + 0.16, 1.66, 1.8, 'brass', shades=(0, 1, 2), oid=o, cast=False)      # crosshead
    # pilot (cowcatcher): slats sloping down to the rail
    def pil(face, x, z, y, idx):
        return None, np.where((np.floor(z / 0.18) % 2) == 0, idx, clampi(idx + 1))
    E_(9.95, 10.15, -1.45, 1.45, 1.0, 1.5, 'red', shades=(1, 2, 3), oid=o)          # buffer beam
    for (u0, u1, y0, y1, w) in ((10.15, 11.0, 0.2, 0.45, 1.1), (10.15, 10.75, 0.45, 0.75, 1.2), (10.15, 10.48, 0.75, 1.0, 1.3)):
        E_(u0, u1, -w, w, y0, y1, 'red', oid=o, tex=pil)
    coupler(xe(11.0), d, oid=o)
    # sand pipes and the boiler's handrail
    E_(2.9, 9.0, 0.97, 1.0, 3.92, 3.98, 'brass', shades=(0, 1, 2), oid=o, cast=False)
    return o


# ---------------------------------------------------------------- the coach
COACH_LEN = 13.0
CB = 5.8                 # body half length (11.6)
CW = 2.1                 # body half width (4.2)
EAVES, CLERE = 4.9, 5.6
IN_X = 5.6               # inside half length (11.2)
IN_Z = 1.95              # inside half width (3.9)
ROW0 = -IN_X + 0.9       # first row starts after the stove zone (heading e: the stove at the west, -x end)
PITCH = 1.34
ROWS = 7
WIN_Y = (2.95, 4.05)     # windows 0.9 x 1.1 u
RACK_Y = FLOOR + 3.0     # luggage racks 3.0 u above the floor
LAMP_X = (-2.68, 2.68)
LAMP_Y = FLOOR + 2.75    # the lamp's bottom
DOOR_HW = 0.5            # end doors 1.0 x 2.9 u
DOOR_TOP = FLOOR + 2.9


def row_x(k):
    return ROW0 + PITCH * (k + 0.5)


def coach_layout(hdg='e'):
    """The coach's inside for heading e or w (w is e turned round: x mirrored). Units u, from the coach's centre,
    y above the rail level (the floor is FLOOR). Facings are the sitter's (people's) facings."""
    m = 1 if hdg == 'e' else -1
    seats = []
    for k in range(ROWS):
        x = row_x(k)
        for side, zs in (('N', -1), ('S', 1)):
            for pos, zz in (('aisle', 0.86), ('window', 1.56)):
                seats.append(dict(row=k if m > 0 else ROWS - 1 - k, side=side, pos=pos,
                                  x=round(m * (x - 0.1), 3), y=round(FLOOR + 0.64, 3), z=round(zs * zz, 3),
                                  feet=[round(m * (x + 0.32), 3), FLOOR, round(zs * zz, 3)],
                                  f='se' if m > 0 else 'nw'))
    seats.sort(key=lambda s: (s['row'], s['side'], s['pos']))
    side_seat = dict(row=-1, side='S', pos='side', x=round(m * (-IN_X + 0.45), 3), y=round(FLOOR + 0.6, 3), z=1.62,
                     feet=[round(m * (-IN_X + 0.45), 3), FLOOR, 1.1], f='ne')
    benches = [dict(key='veh/seat/' + ('se' if m > 0 else 'nw'), x=round(m * row_x(k), 3), y=FLOOR, z=zs * 1.22, row=k if m > 0 else ROWS - 1 - k)
               for k in range(ROWS) for zs in (-1, 1)]
    benches.append(dict(key='veh/sidebench/ne', x=side_seat['x'], y=FLOOR, z=1.68, row=-1))
    return dict(
        heading=hdg, floor=FLOOR, inside=[-IN_X, -IN_Z, IN_X, IN_Z], aisle=[-0.5, 0.5],
        seats=seats + [side_seat], benches=benches,
        stove=dict(key='veh/stove', x=round(m * (-IN_X + 0.42), 3), y=FLOOR, z=-1.45),
        cooler=dict(key='veh/cooler', x=round(m * (IN_X - 0.3), 3), y=FLOOR, z=1.6),
        closet=dict(key='veh/closet', x=round(m * (IN_X - 0.45), 3), y=FLOOR, z=-1.25),
        lamps=[dict(key='veh/lamp', x=lx, y=LAMP_Y, z=0.0) for lx in LAMP_X],
        racks=dict(y=RACK_Y + 0.04, z=-1.72, x=[-IN_X + 0.3, IN_X - 0.3]),
        doors=[dict(end='W', x=-CB, z=0, y=FLOOR, w=1.0, h=2.9), dict(end='E', x=CB, z=0, y=FLOOR, w=1.0, h=2.9)],
        steps=[dict(end=e, side=s, x=sx * 6.15, z=sz * 1.9, treads=[1.15, 0.8], top=1.5)
               for e, sx in (('W', -1), ('E', 1)) for s, sz in (('N', -1), ('S', 1))],
        platforms=[dict(end='W', x0=-6.5, x1=-CB, y=1.55), dict(end='E', x0=CB, x1=6.5, y=1.55)],
    )


def _coach_side_tex(lit_win):
    """Paint for the coach's outer side (+z face, the lit one): wainscot, cream window band, letterboard."""
    def tex(face, x, z, y, idx):
        rr = np.full(x.shape, R('green')); ii = idx.copy()
        if face == 'l':
            band = (y > 2.85) & (y < 4.12)
            rr = np.where(band, R('cream'), rr); ii = np.where(band, np.where(y > 4.05, 0, 1), ii)
            win = np.zeros(x.shape, bool); sash = np.zeros(x.shape, bool)
            for k in range(ROWS):
                xc = row_x(k)
                w = (np.abs(x - xc) < 0.45) & (y > WIN_Y[0]) & (y < WIN_Y[1])
                corner = (np.abs(x - xc) > 0.33) & (y > WIN_Y[1] - 0.14)
                w = w & ~corner
                win |= w
                sash |= w & (np.abs(y - 3.55) < 0.05)
            if lit_win:
                rr = np.where(win, R('brass'), rr)
                ii = np.where(win, np.where(y > 3.6, 0, 1), ii)
            else:
                rr = np.where(win, R('glass'), rr)
                ii = np.where(win, np.where((y > 3.7) & (((x * 3) % 1.0) < 0.35), 0, np.where(y > 3.35, 1, 2)), ii)
            ii = np.where(sash, np.where(lit_win, 2, 3), ii)
            rr = np.where(sash & ~lit_win, R('cream'), rr)
            panel = (y < 2.8) & (y > 1.45) & ((((x + 5.8) / 0.67) % 1.0) < 0.1)
            ii = np.where(panel, clampi(ii + 1), ii)
            sill = (y < 1.48)
            ii = np.where(sill, 3, ii)
            belt = np.abs(y - 2.85) < 0.05
            ii = np.where(belt, 3, ii)
            lb = (y > 4.18) & (y < 4.6)
            ii = np.where(lb, 2, ii)
            letters = lb & (y > 4.27) & (y < 4.5) & (np.abs(x) < 2.6) & ((((x + 2.6) * 2.6) % 1.0) < 0.55)
            rr = np.where(letters, R('cream'), rr); ii = np.where(letters, 1, ii)
            cor = y > 4.66
            rr = np.where(cor, R('cream'), rr); ii = np.where(cor, 2, ii)
        if face == 'r':        # the end wall (+x face): the end door and two small windows
            door = (np.abs(z) < DOOR_HW) & (y > FLOOR) & (y < DOOR_TOP)
            rr = np.where(door, R('wood'), rr); ii = np.where(door, 3, ii)
            dwin = door & (y > FLOOR + 1.7) & (y < FLOOR + 2.6) & (np.abs(z) < 0.32)
            rr = np.where(dwin, R('brass' if lit_win else 'glass'), rr); ii = np.where(dwin, 2 if lit_win else 3, ii)
            ew = (np.abs(z) > 0.95) & (np.abs(z) < 1.55) & (y > WIN_Y[0]) & (y < WIN_Y[1])
            rr = np.where(ew, R('brass' if lit_win else 'glass'), rr); ii = np.where(ew, 2 if lit_win else 3, ii)
            band = (y > 2.85) & (y < 4.12) & ~ew & ~door
            rr = np.where(band, R('cream'), rr); ii = np.where(band, 2, ii)
        return rr, ii
    return tex


def _end_platform(sx, o, rail=True, steps_far=True):
    """The open platform at one end (sx = +1: +x), with its railing, steps, brake staff and coupler."""
    x0, x1 = (CB, 6.5) if sx > 0 else (-6.5, -CB)
    def deck(face, x, z, y, idx):
        if face == 't':
            return None, np.where((z / 0.3) % 1.0 < 0.2, clampi(idx + 1), idx)
        return None, idx
    B(x0, -2.0, 1.42, x1, 2.0, 1.55, 'wood', oid=o, tex=deck)
    B(x0, -1.0, 1.2, x1, 1.0, 1.42, 'iron', shades=(2, 3, 3), oid=o)                 # end sill
    xe = x1 - 0.06 if sx > 0 else x0 + 0.06
    if rail:
        # end railing across the platform's outer edge, with balusters, and the grab posts at the corners
        B(xe - 0.05, -1.95, 2.5, xe + 0.05, 1.95, 2.6, 'iron', shades=(0, 2, 3), oid=o)
        B(xe - 0.04, -1.95, 1.95, xe + 0.04, 1.95, 2.0, 'iron', shades=(1, 2, 3), oid=o)
        for zz in np.arange(-1.9, 1.95, 0.32):
            B(xe - 0.03, zz - 0.03, 1.55, xe + 0.03, zz + 0.03, 2.5, 'iron', shades=(1, 2, 3), oid=o)
        for zs in (-1, 1):
            B(xe - 0.05, zs * 1.95 - 0.05, 1.55, xe + 0.05, zs * 1.95 + 0.05, 2.7, 'iron', shades=(0, 2, 3), oid=o)
            xb = x0 + 0.06 if sx > 0 else x1 - 0.06        # grab iron on the body corner
            B(xb - 0.04, zs * 2.08 - 0.04, 1.75, xb + 0.04, zs * 2.08 + 0.04, 3.9, 'brass', shades=(0, 1, 2), oid=o)
        # brake staff and wheel on the left-hand corner
        bz = -1.55
        B(xe - 0.12 * sx - 0.03, bz - 0.03, 1.55, xe - 0.12 * sx + 0.03, bz + 0.03, 2.95, 'iron', shades=(1, 2, 3), oid=o)
        ocyl((xe - 0.12 * sx, bz, 2.95), (0, 0, 1), 0.28, 0.025, 'iron', oid=o,
             tex=lambda p, s, a, r, i: (None, i, (r > 0.2) | (np.abs(np.sin(a * 2)) < 0.25)))
    # steps at the four corners: two treads below the deck, hung on iron hangers
    for zs in ((-1, 1) if steps_far else (1,)):
        zc = zs * 1.88
        for k, y in enumerate((1.15, 0.8)):
            B(x0 + 0.08, zc - 0.22, y - 0.05, x1 - 0.08, zc + 0.22, y + 0.02, 'wood', shades=(1, 2, 3), oid=o)
        for xx in (x0 + 0.1, x1 - 0.12):
            B(xx, zc + 0.2 * zs - 0.03, 0.72, xx + 0.03, zc + 0.2 * zs + 0.03, 1.42, 'iron', shades=(2, 3, 3), oid=o)
    coupler(6.5 * sx, sx, oid=o)


def coach_shell(lit=False, o=None):
    o = o or new_oid(True)
    for xc in (-4.3, 4.3):
        truck(xc, 0.75, 0.55, oid=o)
    truss(-5.0, 5.0, 1.25, oid=o)
    B(-CB, -CW + 0.15, 1.15, CB, CW - 0.15, 1.32, 'iron', shades=(2, 3, 3), oid=o)
    B(-CB, -CW, 1.3, CB, CW, EAVES, 'green', oid=o, tex=_coach_side_tex(lit))
    # roof: lower deck overhanging the platforms, clerestory with its little windows, upper deck
    def rtex(face, x, z, y, idx):
        if face == 't':
            return None, np.where((((x + 6.5) / 0.55) % 1.0) < 0.08, clampi(idx + 1), idx)
        return None, idx
    B(-6.45, -CW - 0.1, EAVES, 6.45, CW + 0.1, EAVES + 0.1, 'roof', shades=(2, 3, 3), oid=o, tex=rtex)
    B(-6.4, -1.85, EAVES + 0.1, 6.4, 1.85, EAVES + 0.24, 'roof', shades=(1, 3, 3), oid=o, tex=rtex)
    def ctex(face, x, z, y, idx):
        rr = np.full(x.shape, R('green')); ii = idx.copy()
        if face == 'l':
            w = ((((x + 5.0) / 0.67) % 1.0) < 0.55) & (y > 5.2) & (y < 5.4) & (np.abs(x) < 5.0)
            rr = np.where(w, R('brass' if lit else 'glass'), rr); ii = np.where(w, 1, ii)
        return rr, ii
    B(-5.3, -1.1, EAVES + 0.24, 5.3, 1.1, 5.47, 'green', oid=o, tex=ctex)
    B(-5.6, -1.3, 5.47, 5.6, 1.3, 5.55, 'roof', shades=(1, 3, 3), oid=o, tex=rtex)
    B(-5.4, -0.95, 5.55, 5.4, 0.95, CLERE, 'roof', shades=(1, 3, 3), oid=o)
    # stove pipe and a lamp vent on the roof
    CYV(-4.9, -1.35, EAVES + 0.2, EAVES + 0.75, 0.1, 'blk', oid=o)
    CYV(-4.9, -1.35, EAVES + 0.75, EAVES + 0.85, 0.17, 'blk', oid=o, topidx=3)
    for lx in LAMP_X:
        CYV(lx, 0, CLERE - 0.02, CLERE + 0.1, 0.13, 'iron', oid=o, topidx=2)
    for sx in (-1, 1):
        _end_platform(sx, o)
    return o


def coach(lit=False):
    """The whole coach, 13 u over the couplers, symmetric end to end."""
    coach_shell(lit)


# ---- the cut-away (the coach the player is in): floor, the near wall's stub, the open east end
def _far_wall_tex(face, x, z, y, idx):
    """The north wall seen from inside (its +z face): wainscot, windows with sky and curtains, upper panels."""
    rr = np.full(x.shape, R('wood')); ii = np.full(x.shape, 1)
    if face == 'l':
        wain = y < 2.85
        ii = np.where(wain, 3, ii)
        pnl = wain & (y > 1.75) & (y < 2.7) & ((((x + 5.6) / 0.67) % 1.0) > 0.12) & ((((x + 5.6) / 0.67) % 1.0) < 0.9)
        ii = np.where(pnl, 2, ii)
        rail = np.abs(y - 2.85) < 0.06
        rr = np.where(rail, R('brass'), rr); ii = np.where(rail, 1, ii)
        up = y > 4.12
        ii = np.where(up, 1, ii)
        gilt = np.abs(y - 4.5) < 0.04
        rr = np.where(gilt, R('brass'), rr); ii = np.where(gilt, 1, ii)
        for k in range(ROWS):
            xc = row_x(k)
            dx = x - xc
            frame = (np.abs(dx) < 0.53) & (y > WIN_Y[0] - 0.08) & (y < WIN_Y[1] + 0.08)
            ii = np.where(frame, 3, ii)
            w = (np.abs(dx) < 0.45) & (y > WIN_Y[0]) & (y < WIN_Y[1])
            rr = np.where(w, R('glass'), rr)
            ii = np.where(w, np.where(y > 3.75, 0, np.where(y > 3.3, 0, 1)), ii)
            ii = np.where(w & (y < 3.2), 1, ii)
            sash = w & (np.abs(y - 3.55) < 0.05)
            rr = np.where(sash, R('wood'), rr); ii = np.where(sash, 2, ii)
            # curtains tied back at both sides of the window, a valance on top
            cur = (np.abs(dx) > 0.3) & (np.abs(dx) < 0.5) & (y > 3.15) & (y < WIN_Y[1] + 0.05)
            tie = cur & (np.abs(y - 3.45) < 0.06)
            rr = np.where(cur, R('red'), rr); ii = np.where(cur, np.where(tie, 3, np.where(dx < 0, 1, 2)), ii)
            val = (np.abs(dx) < 0.5) & (y > WIN_Y[1] - 0.12) & (y < WIN_Y[1] + 0.08)
            rr = np.where(val, R('red'), rr); ii = np.where(val, np.where(((dx * 8) % 1.0) < 0.5, 1, 2), ii)
            # a coat hook between the windows
            hk = (np.abs(dx - 0.67) < 0.04) & (np.abs(y - 4.25) < 0.08)
            rr = np.where(hk, R('brass'), rr); ii = np.where(hk, 1, ii)
    elif face == 't':
        rr = np.full(x.shape, R('wood')); ii = np.full(x.shape, 0)
    else:
        ii = np.full(x.shape, 3)
    return rr, ii


def _west_wall_tex(face, x, z, y, idx):
    """The west end wall seen from inside (its +x face, in shade): the end door, a rules board, a mirror."""
    rr = np.full(x.shape, R('wood')); ii = np.full(x.shape, 2)
    if face == 'r':
        ii = np.where(y < 2.85, 3, 2)
        door = (np.abs(z) < DOOR_HW) & (y < DOOR_TOP)
        rr = np.where(door, R('wood'), rr); ii = np.where(door, 3, ii)
        jamb = (np.abs(np.abs(z) - DOOR_HW) < 0.06) & (y < DOOR_TOP + 0.06)
        ii = np.where(jamb, 1, ii)
        dwin = door & (y > FLOOR + 1.7) & (y < FLOOR + 2.6) & (np.abs(z) < 0.32)
        rr = np.where(dwin, R('glass'), rr); ii = np.where(dwin, 2, ii)
        knob = (np.abs(z - 0.36) < 0.05) & (np.abs(y - (FLOOR + 1.25)) < 0.05)
        rr = np.where(knob, R('brass'), rr); ii = np.where(knob, 1, ii)
        board = (z > 0.85) & (z < 1.45) & (y > 3.4) & (y < 4.2)
        rr = np.where(board, R('cream'), rr); ii = np.where(board, np.where(((y * 9) % 1.0) < 0.35, 2, 1), ii)
        mirror = (z < -0.85) & (z > -1.45) & (y > 3.3) & (y < 4.3)
        rr = np.where(mirror, R('glass'), rr); ii = np.where(mirror, np.where(np.abs(z + 1.15) < 0.25, 1, 2), ii)
        mfr = (z < -0.8) & (z > -1.5) & (y > 3.25) & (y < 4.35) & ~mirror
        rr = np.where(mfr, R('brass'), rr); ii = np.where(mfr, 2, ii)
    elif face == 't':
        ii = np.full(x.shape, 0)
    return rr, ii


def coach_cut_floor():
    """Cut-away base (sprite veh/coach_in/<e|w>/floor): running gear, floor with the aisle runner, the far (north)
    wall with windows, curtains and the luggage rack, the west end wall with its door, the west end platform."""
    o = new_oid(True)
    for xc in (-4.3, 4.3):
        truck(xc, 0.75, 0.55, oid=o)
    truss(-5.0, 5.0, 1.25, oid=o)
    B(-CB, -CW + 0.15, 1.15, CB, CW - 0.15, 1.32, 'iron', shades=(2, 3, 3), oid=o)
    def ftex(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood')); ii = idx.copy()
        if face == 't':
            ii = np.where(((z + 2) / 0.28) % 1.0 < 0.15, 2, 1)
            h = E.hash2(np.floor((x + 6) / 1.7).astype(int) + np.floor((z + 2) / 0.28).astype(int) * 5, 3) % 3
            ii = np.where((h == 0) & (ii == 1), 0, ii)
            run = np.abs(z) < 0.42
            rr = np.where(run, R('red'), rr)
            ii = np.where(run, np.where(np.abs(z) > 0.33, 3, np.where(((x / 0.3) % 1.0) < 0.5, 1, 2)), ii)
            ii = np.where(run & (np.abs(np.abs(z) - 0.26) < 0.03), 0, ii)
        else:
            ii = np.full(x.shape, 3)
        return rr, ii
    B(-CB, -CW, 1.3, CB, CW, FLOOR, 'wood', oid=o, tex=ftex)
    # the far wall and the west end wall (their tops cut, showing the wall's thickness)
    wo = new_oid(True)
    B(-CB, -CW, FLOOR, CB, -IN_Z, EAVES, 'wood', oid=wo, tex=_far_wall_tex)
    B(-CB, -IN_Z, FLOOR, -IN_X, IN_Z, EAVES, 'wood', oid=wo, tex=_west_wall_tex)
    # the luggage rack on the far wall: brackets at every window post, two brass rails
    for k in range(ROWS + 1):
        xb = ROW0 + PITCH * k
        B(xb - 0.04, -IN_Z, RACK_Y - 0.25, xb + 0.04, -IN_Z + 0.45, RACK_Y + 0.02, 'iron', shades=(1, 2, 3), oid=o, cast=False)
    for zz in (-IN_Z + 0.2, -IN_Z + 0.42):
        B(-IN_X + 0.15, zz - 0.03, RACK_Y, IN_X - 0.15, zz + 0.03, RACK_Y + 0.05, 'brass', shades=(0, 1, 2), oid=o, cast=False)
    # the heating pipe along the far wall's foot
    B(-IN_X, -IN_Z, FLOOR + 0.12, IN_X, -IN_Z + 0.1, FLOOR + 0.22, 'iron', shades=(1, 2, 3), oid=o, cast=False)
    _end_platform(-1, o)
    return o


def coach_cut_sill():
    """The near (south) wall cut down to a sill 0.5 u above the floor (sprite veh/coach_in/<e|w>/sill)."""
    o = new_oid(True)
    def stex(face, x, z, y, idx):
        rr = np.full(x.shape, R('green')); ii = idx.copy()
        if face == 'l':
            ii = np.where(y < 1.48, 3, ii)
            ii = np.where((((x + 5.8) / 0.67) % 1.0) < 0.1, clampi(ii + 1), ii)
        if face == 't':            # the cut: outer paint, the wall's wood, the inner wainscot
            rr = np.where(z > CW - 0.04, R('green'), R('wood'))
            ii = np.where(z > CW - 0.04, 1, np.where(z < IN_Z + 0.05, 3, 1))
        return rr, ii
    B(-CB, IN_Z, 1.3, CB, CW, FLOOR + 0.5, 'green', oid=o, tex=stex)
    return o


def coach_cut_end():
    """The open east end (sprite veh/coach_in/<e|w>/end): the end wall cut to the sill with the doorway open, and
    the east end platform with its railing, steps and brake wheel."""
    o = new_oid(True)
    def etex(face, x, z, y, idx):
        rr = np.full(x.shape, R('green')); ii = idx.copy()
        if face == 't':
            rr = np.full(x.shape, R('wood')); ii = np.full(x.shape, 1)
        return rr, ii
    for z0, z1 in ((-CW, -DOOR_HW), (DOOR_HW, CW)):
        B(IN_X, z0, 1.3, CB, z1, FLOOR + 0.5, 'green', oid=o, tex=etex)
    B(IN_X, -DOOR_HW, 1.3, CB, DOOR_HW, FLOOR + 0.03, 'brass', shades=(1, 2, 3), oid=o)   # the threshold
    _end_platform(1, o)
    return o


# ---- inside parts (each drawn around its own anchor: footprint centre at floor level, y = 0 here)
def _plush(face, x, z, y, idx):
    return None, idx


def seat(facing='se', side=False):
    """A double walk-over bench 1.4 u across (side=False), or a short side bench 0.8 u (side=True), drawn for
    a sitter facing `facing` (the people's facings: se +x, nw -x, ne -z, sw +z). Anchor: its centre at the floor."""
    o = new_oid(True)
    span = 0.8 if side else 1.4
    depth = 0.5
    # local frame: a along the bench (span), b towards the sitter's front
    f = {'se': (1, 0), 'nw': (-1, 0), 'ne': (0, -1), 'sw': (0, 1)}[facing]
    def P(a0, a1, b0, b1, y0, y1, ramp, **kw):
        # a runs across the facing, b along it
        fx, fz = f
        ax, az = -fz, fx
        xs = [a * ax + b * fx for a in (a0, a1) for b in (b0, b1)]
        zs = [a * az + b * fz for a in (a0, a1) for b in (b0, b1)]
        B(min(xs), min(zs), y0, max(xs), max(zs), y1, ramp, oid=o, **kw)
    hs = span / 2
    def cush(face, x, z, y, idx):
        rr = np.full(x.shape, R('red'))
        ii = clampi(idx + 1)
        if face == 't':
            t = (x * f[1] - z * f[0]) if False else (x * -f[1] + z * f[0])
            tuft = (((t + hs) / 0.35) % 1.0) < 0.12
            ii = np.where(tuft, 3, ii)
        return rr, ii
    # cast-iron ends (aisle end and wall end), the frame, the cushion and the back
    for a in (-hs, hs - 0.06):
        P(a, a + 0.06, -0.25, 0.22, 0.0, 0.62, 'blk', shades=(1, 2, 3), cast=False)
        P(a, a + 0.06, -0.3, 0.25, 0.55, 0.62, 'blk', shades=(1, 2, 3), cast=False)    # armrest
    P(-hs + 0.06, hs - 0.06, -0.28, 0.2, 0.32, 0.42, 'wood', shades=(1, 2, 3))
    P(-hs + 0.06, hs - 0.06, -0.3, 0.22, 0.42, 0.56, 'red', tex=cush)
    P(-hs + 0.06, hs - 0.06, -0.38, -0.27, 0.56, 1.3, 'red', tex=cush)
    P(-hs + 0.04, hs - 0.04, -0.4, -0.26, 1.24, 1.32, 'wood', shades=(0, 1, 2))           # top rail of the back
    P(-hs + 0.06, hs - 0.06, -0.4, -0.37, 0.56, 1.24, 'wood', shades=(1, 2, 3))           # the back's wooden rear
    return o


def stove(frame=0):
    """The coach stove: a cast-iron base-burner on a zinc floor plate, its pipe rising to the roof, a wood box.
    frame 0 and 1: the fire's glow through the mica window flickers. Anchor: the plate's centre at the floor."""
    o = new_oid(True)
    B(-0.32, -0.32, 0.0, 0.32, 0.32, 0.03, 'iron', shades=(0, 1, 2), oid=o)
    def st(part, s, ang, rho, idx):
        rr = np.full(s.shape, R('blk')); ii = idx.copy()
        win = (part == 0) & (np.abs(s + 0.05) < 0.14) & (np.cos(ang - 0.6) > 0.55)
        glow = ('fire', 'brass')[frame]
        rr = np.where(win, R(glow), rr); ii = np.where(win, np.where(s > 0, 0, 1), ii)
        ring = (part == 0) & (np.abs(np.abs(s) - 0.3) < 0.03)
        rr = np.where(ring, R('iron'), rr); ii = np.where(ring, 1, ii)
        return rr, ii
    ocyl((0, 0, 0.42), (0, 0, 1), 0.2, 0.36, 'blk', tex=st, oid=o)
    B(-0.24, -0.24, 0.03, 0.24, 0.24, 0.08, 'blk', shades=(1, 2, 3), oid=o)
    E.sphere(0, 0, 0.8 * E.U_Y, 0.22 * 4, 'blk', oid=o, sz=0.55 * 1.3)
    E.sphere(0, 0, 0.96 * E.U_Y, 0.08 * 4, 'brass', oid=o)                               # the finial
    CYV(-0.1, -0.08, 0.8, 3.35, 0.07, 'blk', oid=o, topidx=3)
    B(-0.2, -0.16, 2.4, 0.0, -0.0, 2.48, 'iron', shades=(1, 2, 3), oid=o)                # damper
    # the wood box beside it, a few sticks
    B(0.08, 0.2, 0.0, 0.34, 0.34, 0.28, 'wood', shades=(1, 2, 3), oid=o)
    for k, zz in enumerate((0.23, 0.29)):
        CYX(0.1, 0.32, zz, 0.3 + 0.03 * k, 0.03, 'wood', oid=o)
    return o


def cooler():
    """The water cooler on its cabinet, a tin cup on a chain. Anchor: the cabinet's centre at the floor."""
    o = new_oid(True)
    def cab(face, x, z, y, idx):
        if face == 'l':
            return None, np.where((np.abs(x) < 0.12) & (y > 0.1) & (y < 0.5), clampi(idx + 1), idx)
        return None, idx
    B(-0.2, -0.2, 0.0, 0.2, 0.2, 0.62, 'wood', oid=o, tex=cab)
    def tank(part, s, ang, rho, idx):
        hoop = (part == 0) & (np.abs(np.abs(s) - 0.24) < 0.03)
        rr = np.where(hoop, R('brass'), R('iron'))
        return rr, np.where(hoop, 1, idx)
    ocyl((0, 0, 0.95), (0, 0, 1), 0.17, 0.32, 'iron', tex=tank, oid=o)
    E.sphere(0, 0, 1.27 * E.U_Y, 0.17 * 4, 'iron', oid=o, sz=0.5 * 1.3)
    B(-0.03, 0.15, 0.72, 0.03, 0.24, 0.78, 'brass', shades=(0, 1, 2), oid=o)               # tap
    CYV(0.1, 0.16, 0.62, 0.7, 0.05, 'iron', oid=o)                                        # cup
    return o


def closet():
    """The closet in the corner at the cooler end: a panelled box room, its door towards the aisle. Anchor: its
    footprint centre at the floor (footprint 0.9 x 1.4 u)."""
    o = new_oid(True)
    def ct(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood')); ii = idx.copy()
        if face == 'l':        # the door faces the aisle (+z)
            door = (np.abs(x) < 0.32) & (y < 2.15)
            ii = np.where(door, 3, ii)
            pnl = door & (np.abs(x) < 0.22) & (((y > 0.2) & (y < 0.95)) | ((y > 1.15) & (y < 2.0)))
            ii = np.where(pnl, 2, ii)
            kn = (np.abs(x - 0.24) < 0.04) & (np.abs(y - 1.05) < 0.05)
            rr = np.where(kn, R('brass'), rr); ii = np.where(kn, 1, ii)
        if face == 'r':
            ii = np.where(((y / 0.45) % 1.0) < 0.1, 3, ii)
        if face == 't':
            ii = np.full(x.shape, 1)
        return rr, ii
    B(-0.45, -0.7, 0.0, 0.45, 0.7, 2.55, 'wood', oid=o, tex=ct)
    B(-0.48, -0.72, 2.55, 0.48, 0.73, 2.62, 'wood', shades=(0, 1, 2), oid=o)
    return o


def lamp(lit=False):
    """A hanging oil lamp: rod from the clerestory, smoke bell, brass font, glass chimney. Anchor: its bottom."""
    o = new_oid(True)
    CYV(0, 0, 0.0, 0.12, 0.05, 'brass', oid=o)
    def font(part, s, ang, rho, idx):
        return R('brass'), idx
    ocyl((0, 0, 0.22), (0, 0, 1), 0.13, 0.1, 'brass', tex=font, oid=o)
    def chim(part, s, ang, rho, idx):
        if lit:
            return R('brass'), np.where(part == 0, np.where(np.cos(ang - 2.4) > 0, 0, 0), 0)
        return R('glass'), np.where(np.cos(ang - 2.4) > 0, 0, 1)
    ocyl((0, 0, 0.47), (0, 0, 1), 0.07, 0.15, 'glass', tex=chim, oid=o)
    B(-0.14, -0.14, 0.62, 0.14, 0.14, 0.66, 'iron', shades=(1, 2, 3), oid=o)              # smoke bell
    E.sphere(0, 0, 0.7 * E.U_Y, 0.15 * 4, 'iron', oid=o, sz=0.5 * 1.3)
    CYV(0, 0, 0.7, 1.2, 0.025, 'brass', oid=o)
    if lit:
        B(-0.02, 0.0, 0.42, 0.02, 0.08, 0.5, 'fire', shades=(0, 0, 0), oid=o, cast=False)
    return o


def rack_bag(n):
    """Luggage for the racks: 0 a carpetbag, 1 a hatbox, 2 a leather valise. Anchor: its bottom centre."""
    o = new_oid(True)
    if n == 0:
        def cb(face, x, z, y, idx):
            fl = E.hash2(np.floor(x / 0.08).astype(int), np.floor((y + z) / 0.08).astype(int)) % 4 == 0
            return R('plum'), np.where(fl, 0, idx)
        B(-0.3, -0.13, 0.0, 0.3, 0.13, 0.3, 'plum', oid=o, tex=cb)
        CYX(-0.3, 0.3, 0, 0.3, 0.06, 'wood', oid=o)
        B(-0.12, -0.02, 0.3, 0.12, 0.02, 0.42, 'wood', shades=(2, 3, 3), oid=o)
    elif n == 1:
        def hb(part, s, ang, rho, idx):
            band = (part == 0) & (np.abs(s - 0.1) < 0.04)
            return np.where(band, R('red'), R('cream')), np.where(band, 1, idx)
        ocyl((0, 0, 0.14), (0, 0, 1), 0.2, 0.14, 'cream', tex=hb, oid=o)
    else:
        def va(face, x, z, y, idx):
            strap = (np.abs(x - 0.13) < 0.03) | (np.abs(x + 0.13) < 0.03)
            return np.where(strap, R('iron'), R('wood')), np.where(strap, 3, idx)
        B(-0.27, -0.15, 0.0, 0.27, 0.15, 0.22, 'wood', oid=o, tex=va)
        B(-0.05, -0.02, 0.22, 0.05, 0.02, 0.28, 'iron', shades=(1, 2, 3), oid=o)
    return o


# ---------------------------------------------------------------- the boxcar
BOX_LEN = 10.0
BX = 4.8                  # body half length (9.6)
BZ = 2.0                  # body half width
B_EAVES, B_TOP = 5.0, 5.3
BIN_X, BIN_Z = 4.68, 1.88
DOOR_W, DOOR_H = 2.6, 3.0


def boxcar_layout():
    return dict(floor=FLOOR, inside=[-BIN_X, -BIN_Z, BIN_X, BIN_Z],
                door=dict(x0=-DOOR_W / 2, x1=DOOR_W / 2, y0=FLOOR, y1=FLOOR + DOOR_H, z=-BZ),
                door_south=dict(x0=-DOOR_W / 2, x1=DOOR_W / 2, z=BZ),
                cells=dict(size=0.8, nx=11, nz=4, x0=-4.4, z0=-1.6))


def _boards(face, x, z, y, idx, ramp='ochre', inside=False):
    rr = np.full(x.shape, R(ramp)); ii = idx.copy()
    if face in ('l', 'r'):
        c = x if face == 'l' else z
        ii = np.where(((c / 0.25) % 1.0) < 0.2, clampi(ii + 1), ii)
    return rr, ii


def _box_side(face, x, z, y, idx, door_open=0.0):
    """The boxcar's outer side and ends, with outside framing (posts, braces), the door and its rails."""
    rr, ii = _boards(face, x, z, y, idx)
    if face == 'l':
        door_x0 = -DOOR_W / 2 - 0.05 - door_open * (DOOR_W + 0.1)
        door = (x > door_x0) & (x < door_x0 + DOOR_W + 0.1) & (y > FLOOR - 0.05) & (y < FLOOR + DOOR_H + 0.05)
        opening = (np.abs(x) < DOOR_W / 2) & (y > FLOOR) & (y < FLOOR + DOOR_H) & ~door
        # posts and braces outside the door area
        post = ((np.abs(np.abs(x) - 1.45) < 0.07) | (np.abs(np.abs(x) - 4.72) < 0.08) | (np.abs(np.abs(x) - 3.1) < 0.06)) & ~door
        v = (y - 1.4) / (B_EAVES - 1.4)
        brace = (np.abs(x) > 1.5) & (np.abs(x) < 4.7) & ~door & ((np.abs(((np.abs(x) - 1.5) % 1.6) / 1.6 - v) < 0.06) | (np.abs(((np.abs(x) - 1.5) % 1.6) / 1.6 - (1 - v)) < 0.06))
        ii = np.where(post | brace, 3, ii)
        ii = np.where(door, np.where(((x - door_x0) / 0.32) % 1.0 < 0.15, 3, 1), ii)
        rr = np.where(door, R('ochre'), rr)
        dfr = door & ((np.abs(x - door_x0) < 0.08) | (np.abs(x - door_x0 - DOOR_W - 0.1) < 0.08) | (np.abs(y - FLOOR - 1.5) < 0.06))
        ii = np.where(dfr, 3, ii)
        hasp = door & (np.abs(x - door_x0 - DOOR_W + 0.05) < 0.07) & (np.abs(y - FLOOR - 1.5) < 0.12)
        rr = np.where(hasp, R('iron'), rr); ii = np.where(hasp, 2, ii)
        rr = np.where(opening, R('wood'), rr); ii = np.where(opening, 4, ii)
        rail = (np.abs(y - (FLOOR + DOOR_H + 0.12)) < 0.05) & (x > -DOOR_W * 1.6) & (x < DOOR_W / 2 + 0.2)
        rr = np.where(rail, R('iron'), rr); ii = np.where(rail, 3, ii)
        sill = y < 1.5
        ii = np.where(sill, 3, ii)
        fascia = y > B_EAVES - 0.15
        ii = np.where(fascia, 3, ii)
        letters = (y > 4.3) & (y < 4.6) & (x > 1.8) & (x < 4.2) & (((x * 2.8) % 1.0) < 0.55)
        rr = np.where(letters, R('cream'), rr); ii = np.where(letters, 2, ii)
        numb = (y > 4.3) & (y < 4.55) & (x < -2.4) & (x > -3.6) & (((x * 3.2) % 1.0) < 0.5)
        rr = np.where(numb, R('cream'), rr); ii = np.where(numb, 2, ii)
    if face == 'r':
        post = (np.abs(np.abs(z) - 1.95) < 0.07) | (np.abs(z) < 0.06)
        ii = np.where(post, clampi(ii + 1), ii)
    return rr, ii


def boxcar_shell(door_open=0.0, o=None, walls=True):
    o = o or new_oid(True)
    for xc in (-3.55, 3.55):
        truck(xc, 0.7, 0.5, oid=o)
    truss(-4.4, 4.4, 1.25, depth=0.4, oid=o)
    B(-BX, -BZ + 0.1, 1.15, BX, BZ - 0.1, 1.35, 'iron', shades=(2, 3, 3), oid=o)
    for sx in (-1, 1):
        coupler(sx * BX, sx, oid=o)
        coupler(sx * (BX + 0.2), sx, oid=o)
    if walls:
        B(-BX, -BZ, 1.35, BX, BZ, B_EAVES, 'ochre', oid=o, tex=lambda f, x, z, y, i: _box_side(f, x, z, y, i, door_open))
        # roof: low gable as two steps, the running board along the ridge
        B(-BX - 0.1, -BZ - 0.12, B_EAVES, BX + 0.1, BZ + 0.12, B_EAVES + 0.12, 'red', shades=(2, 3, 3), oid=o)
        B(-BX - 0.05, -1.3, B_EAVES + 0.12, BX + 0.05, 1.3, B_EAVES + 0.22, 'red', shades=(2, 3, 3), oid=o)
        def walk(face, x, z, y, idx):
            return None, np.where(((x / 0.4) % 1.0) < 0.15, clampi(idx + 1), idx)
        B(-BX - 0.05, -0.32, B_EAVES + 0.22, BX + 0.05, 0.32, B_TOP, 'wood', shades=(1, 2, 3), oid=o, tex=walk)
        # brake wheel above the +x end (both ends drawn: the cars look alike end to end), ladder rungs
        for sx in (-1, 1):
            xb = sx * (BX + 0.08)
            B(xb - 0.03, -1.55, B_EAVES - 1.5, xb + 0.03, -1.49, B_TOP + 0.4, 'iron', shades=(1, 2, 3), oid=o)
            ocyl((xb, -1.52, B_TOP + 0.42), (0, 0, 1), 0.3, 0.025, 'iron', oid=o,
                 tex=lambda p, s, a, r, i: (None, i, (r > 0.22) | (np.abs(np.sin(a * 2)) < 0.25)))
            for k in range(7):
                y = 1.6 + k * 0.5
                B(sx * (BX - 0.6), BZ, y, sx * (BX - 0.1), BZ + 0.08, y + 0.05, 'iron', shades=(0, 1, 2), oid=o)
    return o


def boxcar(door_open=0.0):
    """The whole boxcar; door_open 0..1 slides the south door (the near side) open towards -x."""
    boxcar_shell(door_open)


def boxcar_cut_floor():
    """Cut-away base (veh/boxcar_in/<e|w>/floor): running gear, the floor, the far wall's inner face with the
    door opening left open (the cargo platform shows through it; the door is its own sprite), the west wall."""
    o = boxcar_shell(walls=False)
    def ftex(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood'))
        if face == 't':
            ii = np.where(((z + 2) / 0.3) % 1.0 < 0.12, 3, 2)
            h = E.hash2(np.floor((x + 6) / 2.1).astype(int) + np.floor((z + 2) / 0.3).astype(int) * 3, 1) % 3
            ii = np.where((h == 0) & (ii == 2), 1, ii)
            worn = (np.abs(x) < 1.4) & (z < -0.3)
            ii = np.where(worn & (ii == 2), 1, ii)
            return rr, ii
        return rr, np.full(x.shape, 3)
    B(-BX, -BZ, 1.35, BX, BZ, FLOOR, 'wood', oid=o, tex=ftex)
    wo = new_oid(True)
    def inner(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood')); ii = np.full(x.shape, 2 if face == 'l' else 3)
        if face in ('l', 'r'):
            c = x if face == 'l' else z
            ii = np.where(((c / 0.25) % 1.0) < 0.15, clampi(ii + 1), ii)
            # inside framing: posts, a girt, braces
            if face == 'l':
                post = (np.abs(np.abs(x) - 1.45) < 0.08) | (np.abs(np.abs(x) - 3.1) < 0.07) | (np.abs(np.abs(x) - 4.6) < 0.08)
                girt = np.abs(y - 3.4) < 0.07
                v = (y - FLOOR) / (B_EAVES - FLOOR)
                t = ((np.abs(x) - 1.5) % 1.6) / 1.6
                brace = (np.abs(x) > 1.5) & (np.abs(x) < 4.55) & (np.abs(t - v) < 0.07)
                ii = np.where(post | girt | brace, 1, ii)
                rr = np.where(post | girt | brace, R('wood'), rr)
                plate = y > B_EAVES - 0.18
                ii = np.where(plate, 1, ii)
            else:
                post = np.abs(z) < 0.08
                ii = np.where(post, 1, ii)
        if face == 't':
            ii = np.full(x.shape, 1)
        return rr, ii
    # far wall with the door gap, then the west end wall
    for (x0, x1) in ((-BX, -DOOR_W / 2), (DOOR_W / 2, BX)):
        B(x0, -BZ, FLOOR, x1, -BIN_Z, B_EAVES, 'wood', oid=wo, tex=inner)
    B(-DOOR_W / 2, -BZ, FLOOR + DOOR_H, DOOR_W / 2, -BIN_Z, B_EAVES, 'wood', oid=wo, tex=inner)
    for xx in (-DOOR_W / 2 - 0.1, DOOR_W / 2):       # the door posts
        B(xx, -BIN_Z - 0.02, FLOOR, xx + 0.1, -BIN_Z + 0.06, FLOOR + DOOR_H, 'wood', shades=(1, 1, 2), oid=wo)
    B(-DOOR_W / 2, -BZ, FLOOR - 0.01, DOOR_W / 2, -BIN_Z, FLOOR + 0.04, 'iron', shades=(1, 2, 3), oid=wo)  # sill plate
    B(-BX, -BIN_Z, FLOOR, -BIN_X, BIN_Z, B_EAVES, 'wood', oid=wo, tex=inner)
    return o


def boxcar_cut_sill():
    """The near (south) wall and the east end wall cut to a sill 0.5 u above the floor (veh/boxcar_in/.../sill)."""
    o = new_oid(True)
    def stex(face, x, z, y, idx):
        rr, ii = _boards(face, x, z, y, idx)
        if face == 'l':
            ii = np.where(y < 1.5, 3, ii)
        if face == 't':
            rr = np.full(x.shape, R('wood')); ii = np.full(x.shape, 1)
        return rr, ii
    B(-BX, BIN_Z, 1.35, BX, BZ, FLOOR + 0.5, 'ochre', oid=o, tex=stex)
    B(BIN_X, -BZ, 1.35, BX, BIN_Z, FLOOR + 0.5, 'ochre', oid=o, tex=stex)
    return o


def boxcar_door(o_frac):
    """The north door seen from inside through its opening (it slides on the outside of the far wall towards -x).
    o_frac 0 shut .. 1 open. Only the part inside the opening is drawn. Anchor: the boxcar's centre at y = 0."""
    oid = new_oid(True)
    x0 = -DOOR_W / 2 - 0.05 - o_frac * (DOOR_W + 0.1)
    cx = x0 + (DOOR_W + 0.1) / 2
    def dt(k, sgn, uvw, idx):
        u, v, w = uvw
        x = cx + u
        rr = np.full(u.shape, R('wood'))
        ii = np.where(((x - x0) / 0.32) % 1.0 < 0.15, 3, 2)
        ii = np.where(np.abs(w) < 0.06, 3, ii)
        frame = (np.abs(u) > (DOOR_W + 0.1) / 2 - 0.1)
        ii = np.where(frame, 3, ii)
        brace = np.abs((u / (DOOR_W + 0.1) + 0.5) - (w / (DOOR_H + 0.1) + 0.5)) < 0.04
        ii = np.where(brace & ~frame, 3, ii)
        keep = (np.abs(x) < DOOR_W / 2) & (FLOOR + DOOR_H / 2 + w < FLOOR + DOOR_H)
        return rr, ii, keep
    obox((cx, -BZ - 0.07, FLOOR + DOOR_H / 2), ((1, 0, 0), (0, 1, 0), (0, 0, 1)), ((DOOR_W + 0.1) / 2, 0.05, (DOOR_H + 0.1) / 2),
         'wood', tex=dt, oid=oid)
    return oid


# ---------------------------------------------------------------- the flatcar
def flatcar():
    """Flatcar 10 u, deck top 1.9 u, stakes 1.2 u high in their pockets along both sides."""
    o = new_oid(True)
    for xc in (-3.55, 3.55):
        truck(xc, 0.7, 0.5, oid=o)
    truss(-4.4, 4.4, 1.25, depth=0.4, oid=o)
    B(-4.9, -1.9, 1.2, 4.9, 1.9, 1.65, 'iron', shades=(2, 3, 3), oid=o)
    def deck(face, x, z, y, idx):
        if face == 't':
            ii = np.where(((z + 2) / 0.33) % 1.0 < 0.12, 3, 1)
            h = E.hash2(np.floor((x + 6) / 2.4).astype(int) + np.floor((z + 2) / 0.33).astype(int) * 5, 2) % 4
            return None, np.where((h == 0) & (ii == 1), 2, ii)
        return None, np.where(((x / 0.5) % 1.0) < 0.1, 3, idx)
    B(-4.95, -2.0, 1.65, 4.95, 2.0, 1.9, 'wood', oid=o, tex=deck)
    for x in np.linspace(-4.2, 4.2, 5):
        for zs in (-1, 1):
            z = zs * 2.05
            B(x - 0.1, z - 0.07, 1.55, x + 0.1, z + 0.07, 1.85, 'iron', shades=(1, 2, 3), oid=o)
            B(x - 0.06, z - 0.05, 1.85, x + 0.06, z + 0.05, 3.1, 'wood', shades=(1, 2, 3), oid=o)
    for sx in (-1, 1):
        coupler(sx * 4.95, sx, oid=o)
    return o


def smoke(r, seed=0):
    """A puff of wood smoke centred on the origin (r in u)."""
    o = new_oid(False)
    rnd = np.random.RandomState(seed)
    rm = r * 4
    E.sphere(0, 0, 0, rm, 'smoke', oid=o, cast=False, th=(0.75, 0.35, -0.2), noise=0.25, seed=seed)
    for k in range(3):
        a = rnd.uniform(0, 6.28)
        E.sphere(math.cos(a) * rm * 0.6, math.sin(a) * rm * 0.6, rm * rnd.uniform(-0.2, 0.4), rm * 0.62, 'smoke',
                 oid=o, cast=False, th=(0.75, 0.35, -0.2), noise=0.25, seed=seed + k + 1)
    return o
