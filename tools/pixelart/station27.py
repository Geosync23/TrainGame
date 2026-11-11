# D27 station area art (A3): the depot (a storey and a half), platform 1's canopy, the schedule board, the freight
# house on the raised cargo platform, the cargo platform's faces, deck, ramps and chalk marks, the two footbridges
# (taller, longer) and the lever frames with their levers and rodding. Numbers: plans/d27-tech.md sections 1.3, 1.4.
# Units: MU, as engine.py (4 MU = 1u along x and z, 16/3 MU = 1u up). Engine X = game x, Y = game z, Z = up.
import math
import numpy as np
import pal27  # noqa: F401
import engine as E
from engine import R, box, cyl_z, cyl_x, sphere, hash2, new_oid
import town as TW
import town27 as T
from town import Frame, Paint, rect, clampi, shingle_tex, end_batten, text_width

U = 4.0
UY = 16.0 / 3.0
P1_DECK = 0.375 * UY      # platform 1's deck top (3 px)
DOCK = 1.6 * UY           # the cargo platform's top (13 px)

# ============================ the station ============================
ST = dict(a=36.0, b=18.0, eave=5.5 * UY, ridge=8.0 * UY)     # 18 x 9u, centre (0, -21.8)
ST_CENTRE = (0.0, -21.8)


def _ivy_none(*a):
    return None


def station(lit=False):
    """The depot: a storey and a half (the agent lives upstairs), on a plinth at platform height. Board-and-batten
    walls in station yellow with brown trim, a brick-red shingle roof with two dormers to the platform side, a
    telegrapher's bay window, the ticket window, the waiting-room door, a freight door on the +x end and the
    RAILHEAD name board on the +x gable. Front (+z) on platform 1's back edge (z -17.3)."""
    F = Frame('s')
    o = new_oid(True)
    A, B = ST['a'], ST['b']
    zb = P1_DECK
    wh = ST['eave']

    def plinth(lf, u, z, a, b, idx, lit_):
        return None, np.where(np.mod(u, 1.6) < 0.45, clampi(idx + 2), clampi(idx + 1))
    F.box(-A, -B, 0, A, B, zb, 'wood', paint=plinth, oid=o)

    def walls(lf, u, z, a, b, idx, lt):
        p = Paint('straw', u, z, idx, lt)
        zz = z - zb
        p.battens(2.6, 0.5, 1.0, u=(a if lf in 'fk' else b))
        p.fill(zz < 2.0, 'wood', clampi(idx + 1))                       # base board
        p.fill(np.abs(zz - 7.0) < 0.35, 'wood', clampi(idx + 1))        # belt rail under the windows
        p.fill(z > wh - 1.4, 'wood', clampi(idx))                        # frieze
        def window(a0, a1, z0, z1, panes=(2, 2)):
            p.window(a0, a1, z0, z1, trim='cream', panes=panes, lit_glass=lit)
        if lf == 'f':
            p.u = a + A
            # waiting room door with a transom, the ticket window (barred), windows; the freight end on the right
            p.door(18.0, 23.6, 16.5, ramp='wood', trim='cream', double=True)
            window(18.4, 23.2, 17.4, 19.6, (3, 1))
            window(28.0, 33.0, 8.0, 15.0, (1, 1))
            bars = rect(p.u, zz, 28.0, 33.0, 8.0, 15.0) & (np.mod(p.u - 28.0, 1.2) < 0.4)
            p.fill(bars, 'iron', 2)
            p.fill(rect(p.u, zz, 27.2, 33.8, 7.0, 8.0), 'wood', 0)
            p.fill(rect(p.u, zz, 27.6, 33.4, 15.8, 18.0), 'cream', 0)    # TICKETS plaque (letters after shading)
            for a0 in (5.0, 10.0, 52.0, 58.0):
                window(a0, a0 + 3.6, 8.0, 18.0, (1, 2))
            p.door(63.0, 69.0, 18.0, ramp='wood', trim='cream', double=True, panels=False)   # baggage room
            p.fill(rect(p.u, zz, 63.0, 69.0, 0, 18.0) & (np.abs((p.u - 63.0) - (zz) * 6.0 / 18.0) < 0.6), 'cream', 2)
        elif lf == 's':
            # the +x end: a freight door and a window; the name board is on the gable above (see station_name)
            p.u = b + B
            p.door(6.0, 15.0, 18.0, ramp='wood', trim='cream', double=True, panels=False)
            p.fill(rect(p.u, zz, 6.0, 15.0, 0, 18.0) & (np.abs((p.u - 6.0) - zz * 9.0 / 18.0) < 0.6), 'cream', 3)
            window(22.0, 26.0, 8.0, 18.0, (1, 2))
        return p.rr, p.ii
    F.box(-A + 1.0, -B + 1.0, zb, A - 1.0, B - 1.0, wh, 'straw', paint=walls, oid=o, shades=(1, 1, 2))
    # the bay window (the telegrapher watches the line from it): a three-sided box out of the front wall
    def bay(lf, u, z, a, b, idx, lt):
        p = Paint('straw', u, z, idx, lt)
        p.battens(2.6, 0.5, 1.0, u=(a if lf in 'fk' else b))
        zz = z - zb
        p.fill(zz < 7.0, 'wood', clampi(idx + 1))
        g = (zz > 8.0) & (zz < 18.0) & (np.mod(a if lf == 'f' else b, 3.4) > 0.7)
        p.fill(g, 'brass' if lit else 'glass', np.where(zz > 16.5, 2, 1) if not lit else 1)
        return p.rr, p.ii
    F.box(-6.0, B - 1.0, zb, 4.0, B + 3.0, zb + 21.0, 'straw', paint=bay, oid=o)
    F.box(-6.6, B - 1.0, zb + 21.0, 4.6, B + 3.6, zb + 22.2, 'wood', shades=(1, 2, 3), oid=o)
    # roof: ridge along x, gable ends at both ends; brackets under the deep eaves
    hw = B + 2.0
    F.roof_across(-A - 1.0, A + 1.0, 0, hw, wh - 0.4, ST['ridge'], 'brick', wall='straw', oid=o, tex=shingle_tex(),
                  shades=(1, 1), endtex=end_batten('y', 2.6, ramp='straw'))
    F.box(-A - 1.0, -0.5, ST['ridge'] - 0.4, A + 1.0, 0.5, ST['ridge'] + 0.5, 'brick', shades=(1, 2, 3), oid=o, cast=False)
    for a in (-A + 1.0, -A + 14.0, -A + 30.0, A - 22.0, A - 1.0):
        F.box(a - 0.5, B - 1.0, wh - 3.2, a + 0.5, B + 1.4, wh - 0.4, 'wood', shades=(0, 1, 2), oid=o)
    # two dormers on the platform side (the upstairs rooms)
    k_ = (ST['ridge'] - wh) / hw
    for ac in (-18.0, 18.0):
        bf = 7.0
        zf = wh + (hw - bf) * k_ - 0.6
        def dorm(lf, u, z, a, b, idx, lt, ac=ac):
            p = Paint('straw', u, z, idx, lt)
            if lf == 'f':
                g = (np.abs(a - ac) < 2.2) & (z > zf + 1.4) & (z < zf + 7.4)
                fr = (np.abs(a - ac) < 2.9) & (z > zf + 0.7) & (z < zf + 8.1) & ~g
                p.fill(fr, 'cream', 1)
                p.fill(g, 'brass' if lit else 'glass', 1 if lit else np.where(z > zf + 6.4, 2, 3))
                p.fill(g & ((np.abs(a - ac) < 0.3) | (np.abs(z - zf - 4.4) < 0.3)), 'cream', 1)
            return p.rr, p.ii
        F.box(ac - 4.0, 0.0, zf, ac + 4.0, bf, zf + 9.0, 'straw', paint=dorm, oid=o)
        Frame('s').roof_depth(-1.0, bf + 1.2, ac, 5.0, zf + 8.6, zf + 12.6, 'brick', wall='straw', oid=o,
                              tex=shingle_tex(), endtex=end_batten('x', 2.0, ramp='straw'))
    # chimneys
    def brick(lf, u, z, a, b, idx, lt):
        return None, np.where(np.mod(z, 1.34) < 0.42, clampi(idx + 1), idx)
    for (ac, bc) in ((-26.0, -4.0), (24.0, -4.0)):
        F.box(ac - 1.6, bc - 1.6, ST['ridge'] - 6.0, ac + 1.6, bc + 1.6, ST['ridge'] + 5.0, 'brick', paint=brick, oid=o)
        F.box(ac - 2.0, bc - 2.0, ST['ridge'] + 5.0, ac + 2.0, bc + 2.0, ST['ridge'] + 5.8, 'iron', shades=(1, 2, 3), oid=o)
    # a telegraph wire bracket on the +x end gable
    F.box(A - 1.0, -0.4, ST['ridge'] - 4.0, A + 1.6, 0.4, ST['ridge'] - 3.4, 'wood', shades=(1, 2, 3), oid=o)
    return o


def station_letters():
    F = Frame('s')
    zb = P1_DECK
    # TICKETS over the ticket window (front, +z face)
    s = 'TICKETS'
    w = text_width(s) / 2.0
    F.text('f', -ST['a'] + 30.5 - w / 2.0, zb + 17.6, s, 'wood', 3, plane=ST['b'] - 1.0)


def station_name():
    """RAILHEAD on a board on the +x gable."""
    F = Frame('s')
    s = 'RAILHEAD'
    w = text_width(s) / 2.0
    F.text('s', w / 2.0, ST['eave'] + 5.2, s, 'wood', 4, plane=ST['a'] + 1.1)


def station_board(lit=False):
    """The name board itself (a separate box so it stands proud of the gable)."""
    F = Frame('s')
    o = new_oid(True)
    s = 'RAILHEAD'
    w = text_width(s) / 2.0 + 2.6
    F.box(ST['a'] + 0.5, -w / 2.0, ST['eave'] - 0.6, ST['a'] + 1.1, w / 2.0, ST['eave'] + 6.6, 'cream',
          shades=(0, 0, 0), oid=o)
    return o


def station_all(lit=False):
    station(lit)
    station_board(lit)


# ============================ platform 1's canopy ============================
CAN = dict(x0=-15.0, x1=15.0, z0=-17.3, z1=-11.3, under=4.2 * UY, post_z=-11.6)
CAN_CENTRE = (0.0, -14.3)


def canopy():
    """30 x 6u, underside 4.2u: a shed roof from the depot's front wall out to a row of posts with brackets along
    z -11.6, a scalloped valance on the track side. Anchor: its centre (0, -14.3) at ground level."""
    o = new_oid(True)
    cx, cz = CAN_CENTRE
    x0, x1 = (CAN['x0'] - cx) * U, (CAN['x1'] - cx) * U
    z0, z1 = (CAN['z0'] - cz) * U, (CAN['z1'] - cz) * U
    zp = (CAN['post_z'] - cz) * U
    zu = CAN['under']
    for k in range(7):
        x = x0 + 2.0 + k * (x1 - x0 - 4.0) / 6.0
        box(x - 0.55, zp - 0.55, P1_DECK, x + 0.55, zp + 0.55, zu, 'wood', shades=(1, 2, 3), oid=o)
        box(x - 0.8, zp - 0.8, P1_DECK, x + 0.8, zp + 0.8, P1_DECK + 1.6, 'wood', shades=(1, 2, 3), oid=o)
        for j in range(4):     # a curved bracket, stepped
            box(x - 0.35, zp - 1.2 - j * 1.1, zu - 4.0 + j * 1.0, x + 0.35, zp - 0.55, zu - 3.0 + j * 1.0, 'wood',
                shades=(1, 2, 3), oid=o, cast=False)
    # the beam along the posts and the rafters' ends
    box(x0, zp - 0.6, zu, x1, zp + 0.6, zu + 1.4, 'wood', shades=(1, 2, 3), oid=o)
    # the roof: slopes from 5.1u at the wall down to 4.5u at the front edge, in strips
    n = 8
    for j in range(n):
        za = z0 + (z1 + 1.0 - z0) * j / n
        zb_ = z0 + (z1 + 1.0 - z0) * (j + 1) / n
        h = zu + 1.4 + (n - j) * 0.6
        def tin(face, X, Y, Z, idx):
            return None, np.where(np.mod(X, 2.0) < 0.55, clampi(idx + 1), idx)
        box(x0 - 1.0, za, h, x1 + 1.0, zb_, h + 0.7, 'brick', tex=tin, oid=o, shades=(1, 2, 3))
    # valance on the track side
    def val(face, X, Y, Z, idx):
        tooth = (np.mod(X, 1.6) < 0.8) & (Z < zu + 1.0)
        return np.full(X.shape, R('wood')), np.where(tooth, 3, 2)
    box(x0 - 1.0, z1 + 0.6, zu + 0.2, x1 + 1.0, z1 + 1.0, zu + 2.0, 'wood', tex=val, oid=o, cast=False)
    # two hanging lamps under the canopy
    for x in (x0 + 26.0, x1 - 26.0):
        box(x - 0.15, zp - 4.0, zu - 3.0, x + 0.15, zp - 3.7, zu, 'iron', shades=(1, 2, 3), oid=o, cast=False)
        box(x - 0.8, zp - 4.6, zu - 5.4, x + 0.8, zp - 3.0, zu - 3.0, 'glass', shades=(0, 1, 2), oid=o)
        box(x - 1.0, zp - 4.8, zu - 3.2, x + 1.0, zp - 2.8, zu - 2.6, 'iron', shades=(1, 2, 3), oid=o)
    return o


def canopy_box():
    cx, cz = CAN_CENTRE
    return [CAN['x0'] - cx, CAN['z0'] - cz, CAN['x1'] - cx, CAN['z1'] - cz + 0.3, 5.4]


# ============================ the schedule board ============================
SB = dict(a=6.4, z0=1.2 * UY, z1=3.0 * UY)      # face 3.2u wide, from 1.2u to 3.0u


def schedboard():
    """The schedule board at (14, -16.9) on platform 1's back edge: a dark green face 3.2u wide on two posts, a
    small roof and a cream header strip; the game writes the rows on the face in the pixel font."""
    o = new_oid(True)
    A = SB['a']; z0, z1 = SB['z0'], SB['z1']
    for x in (-A + 0.4, A - 1.4):
        box(x, -0.5, P1_DECK, x + 1.0, 0.5, z1 + 0.8, 'wood', shades=(1, 2, 3), oid=o)
    box(-A - 0.6, 0.5, z0 - 0.8, A + 0.6, 1.0, z1 + 0.8, 'wood', shades=(1, 2, 3), oid=o)
    box(-A, 1.0, z0, A, 1.2, z1, 'green', shades=(2, 2, 3), oid=o, cast=False)
    box(-A, 1.0, z1 - 1.6, A, 1.25, z1, 'cream', shades=(1, 1, 2), oid=o, cast=False)
    box(-A - 1.0, -0.6, z1 + 0.8, A + 1.0, 2.0, z1 + 1.6, 'brick', shades=(1, 2, 3), oid=o)
    return o


def schedboard_area(ax, ay):
    A = SB['a']
    def P(x, z):
        sx, sy = E.proj(x, 1.2, z)
        return [int(math.floor(sx - E.OX + ax)), int(math.floor(sy - E.OY + ay))]
    return dict(top_left=P(-A + 0.5, SB['z1'] - 2.0), top_right=P(A - 0.5, SB['z1'] - 2.0),
                bottom_left=P(-A + 0.5, SB['z0'] + 0.4),
                note='the blank green face below the cream header, in sprite pixels; rows step down 1 px for every 2 '
                     'px to the right')


def schedboard_letters():
    s = 'TRAINS'
    w = text_width(s) / 2.0
    TW.text_on('l', -w / 2.0, 1.3, SB['z1'] - 0.2, s, 'green', 2)


# ============================ the freight house on the cargo platform ============================
FH = dict(x0=-8.0, x1=8.0, z0=3.3, z1=9.3)
FH_CENTRE = (0.0, 6.3)
FH_UNDER = DOCK + 4.2 * UY
FH_RIDGE = DOCK + 6.0 * UY


def freighthouse_body():
    """The covered storage: a back wall (north), two end walls, posts along the open south side (track 3), on the
    cargo platform's deck. Inside: shelves along the back wall, the platform scale, the clerk's desk and a lamp.
    Anchor: its footprint centre (0, 6.3) at ground level; the floor is the deck at 1.6u."""
    o = new_oid(True)
    A = (FH['x1'] - FH['x0']) * U / 2.0
    B = (FH['z1'] - FH['z0']) * U / 2.0
    z0, zu = DOCK, FH_UNDER
    def boards(face, X, Y, Z, idx):
        c = X if face == 'l' else Y
        ii = np.where(np.mod(c, 2.6) < 0.5, clampi(idx + 1), idx)
        return np.full(X.shape, R('wood')), ii
    # back wall (its inner face, +z, is what shows) and the two end walls
    box(-A, -B, z0, A, -B + 1.0, zu, 'wood', tex=boards, oid=o, shades=(2, 2, 3))
    box(-A, -B, z0, -A + 1.0, B - 3.0, zu, 'wood', tex=boards, oid=o, shades=(2, 3, 3))
    def endwall(face, X, Y, Z, idx):
        rr, ii = boards(face, X, Y, Z, idx)
        # FREIGHT painted on the +x end
        return rr, ii
    box(A - 1.0, -B, z0, A, B - 3.0, zu, 'wood', tex=endwall, oid=o)
    # posts along the open side
    for k in range(5):
        x = -A + 1.0 + k * (2 * A - 2.0) / 4.0
        box(x - 0.7, B - 1.6, z0, x + 0.7, B - 0.2, zu, 'wood', shades=(1, 2, 3), oid=o)
    # a lantern hung on the middle post's track side (dark glass by day; lit in bld/freighthouse/body_lit)
    box(-0.15, B - 0.2, z0 + 13.2, 0.15, B + 0.6, z0 + 13.6, 'iron', shades=(1, 2, 3), oid=o, cast=False)
    box(-0.7, B + 0.1, z0 + 12.4, 0.7, B + 1.5, z0 + 13.2, 'iron', shades=(1, 2, 3), oid=o, cast=False)
    box(-0.55, B + 0.25, z0 + 9.8, 0.55, B + 1.35, z0 + 12.4, 'lamp', shades=(1, 2, 2), oid=o, cast=False)
    box(-0.4, B + 0.4, z0 + 9.2, 0.4, B + 1.2, z0 + 9.8, 'iron', shades=(1, 2, 3), oid=o, cast=False)
    # shelves along the back wall with parcels
    for zz in (z0 + 6.0, z0 + 12.0):
        box(-A + 1.0, -B + 1.0, zz, A - 1.0, -B + 4.0, zz + 0.6, 'wood', shades=(0, 2, 3), oid=o)
    for k in range(9):
        x = -A + 4.0 + k * 6.6
        TW.crate_box(x, -B + 1.2, z0 + 6.6, 2.4 if k % 2 else 3.0, 2.4, 2.0 if k % 3 else 2.8,
                     ramp='wood' if k % 3 else 'cream', oid=o)
        if k % 2 == 0:
            TW.crate_box(x + 0.6, -B + 1.2, z0 + 12.6, 2.2, 2.2, 1.8, ramp='ochre' if k % 4 else 'wood', oid=o)
    # the platform scale (an iron beam on a box) at the west end, the clerk's desk at the east end
    box(-A + 3.0, -2.0, z0, -A + 11.0, 4.0, z0 + 1.2, 'iron', shades=(1, 2, 3), oid=o)
    box(-A + 3.6, -3.0, z0, -A + 4.6, -2.0, z0 + 9.0, 'iron', shades=(1, 2, 3), oid=o)
    box(-A + 3.6, -3.0, z0 + 9.0, -A + 10.0, -2.4, z0 + 9.6, 'brass', shades=(0, 1, 2), oid=o)
    box(A - 10.0, -B + 2.0, z0, A - 3.0, -B + 6.0, z0 + 5.6, 'wood', shades=(0, 2, 3), oid=o)
    box(A - 9.6, -B + 1.6, z0 + 5.6, A - 3.4, -B + 3.0, z0 + 8.0, 'wood', shades=(0, 2, 3), oid=o)
    box(A - 6.0, -B + 3.0, z0 + 5.6, A - 5.0, -B + 4.0, z0 + 7.4, 'fire', shades=(0, 1, 1), oid=o)
    return o


def freighthouse_roof():
    """The roof: a gable along x on a plate over the posts; gable ends with battens. Fades like the canopy."""
    o = new_oid(True)
    A = (FH['x1'] - FH['x0']) * U / 2.0
    B = (FH['z1'] - FH['z0']) * U / 2.0
    box(-A, B - 1.6, FH_UNDER, A, B - 0.2, FH_UNDER + 1.4, 'wood', shades=(1, 2, 3), oid=o)
    box(-A, -B, FH_UNDER, A, -B + 1.2, FH_UNDER + 1.4, 'wood', shades=(1, 2, 3), oid=o)
    gable_tex = end_batten('y', 2.6, ramp='wood')
    E.gable_x(-A - 1.6, A + 1.6, 0.0, B + 2.4, FH_UNDER + 1.0, FH_RIDGE, 'brick', wall='wood', oid=o,
               tex=shingle_tex(), endtex=gable_tex, shades=(1, 1))
    return o


def fh_box(part):
    A = (FH['x1'] - FH['x0']) / 2.0; B = (FH['z1'] - FH['z0']) / 2.0
    if part == 'body':
        return [-A, -B, A, B, round(FH_UNDER / UY, 2)]
    return [-A - 0.4, -B - 0.6, A + 0.4, B + 0.6, round(FH_RIDGE / UY + 0.3, 2)]


# ============================ the cargo platform: faces, deck, ramps, chalk ============================

def _plank_side(face, X, Y, Z, idx):
    c = X if face == 'l' else Y
    ii = np.where(np.mod(Z, 2.0) < 0.5, 3, 2)
    ii = np.where(np.mod(c, 6.0) < 0.9, 3, ii)
    return np.full(X.shape, R('wood')), ii


def dock_face(side='s', variant=0):
    """One unit of the cargo platform's side, from the ground to the deck (1.6u): plank sheathing on timber posts.
    side 's': the +z face along track 3 (the loading edge: a rubbing strip, and on variant 1 an iron bumper plate);
    side 'e': the +x end face (beside the east ramp). Anchor: the face's -x end (s) or -z end (e) at ground level."""
    o = new_oid(False)
    if side == 's':
        box(0.0, -1.0, 0, 4.0, 0.0, DOCK, 'wood', tex=_plank_side, oid=o, faces='l', cast=False)
        box(0.0, -1.0, DOCK - 1.6, 4.0, 0.35, DOCK - 0.2, 'wood', shades=(1, 1, 2), oid=o, faces='tl', cast=False)
        if variant == 1:
            box(1.2, -1.0, DOCK - 5.0, 2.8, 0.45, DOCK - 1.6, 'iron', shades=(1, 1, 2), oid=o, faces='tl', cast=False)
        if variant == 2:
            box(0.0, -1.0, 0, 0.9, 0.2, DOCK, 'wood', shades=(1, 2, 3), oid=o, faces='tl', cast=False)
    else:
        box(-1.0, 0.0, 0, 0.0, 4.0, DOCK, 'wood', tex=_plank_side, oid=o, faces='r', cast=False)
        if variant == 2:
            box(-1.0, 3.1, 0, 0.2, 4.0, DOCK, 'wood', shades=(1, 2, 3), oid=o, faces='tr', cast=False)
    return o


def dock_top(variant=0):
    """A deck cell (1u x 1u) at 1.6u: planks along z (across the platform). Anchor: the cell corner at ground level."""
    o = new_oid(False)
    f = T.planks_top
    def tex(face, X, Y, Z, idx):
        a, b = X, Y
        seg = np.floor((a + 40 + variant * 3) / 7.0).astype(int)
        hb = hash2(np.floor((b + 100) / 1.6).astype(int), seg + variant * 11) % 7
        ii = np.where(np.mod(b, 1.6) < 0.42, 2, np.where(hb == 0, 0, np.where(hb == 3, 2, 1)))
        return np.full(X.shape, R('wood')), ii
    box(0.0, 0.0, DOCK - 0.1, 4.0, 4.0, DOCK, 'wood', tex=tex, oid=o, faces='t', cast=False)
    return o


def dock_cell():
    """A chalked storage cell (1.4u square) on the deck, with a tick at the corner. Anchor: the cell corner at ground."""
    o = new_oid(False)
    s = 1.4 * U
    for (x0, y0, x1, y1) in ((0, 0, s, 0.45), (0, s - 0.45, s, s), (0, 0, 0.45, s), (s - 0.45, 0, s, s)):
        box(x0, y0, DOCK, x1, y1, DOCK + 0.02, 'cream', shades=(0, 0, 0), oid=o, faces='t', cast=False)
    return o


def dock_ramp(d='e'):
    """A cart ramp at one end of the cargo platform: 8u long (1 in 5), 3u wide, planked, with side sheathing.
    'e' rises from the ground at x 34 to the deck at x 26; 'w' mirrored. Anchor: its footprint centre at ground."""
    o = new_oid(True)
    L, B = 16.0, 6.0
    n = 32
    for k in range(n):
        xa = -L + 2 * L * k / n; xb = -L + 2 * L * (k + 1) / n
        t = (k + 0.5) / n
        h = DOCK * (1 - t) if d == 'e' else DOCK * t
        def top(face, X, Y, Z, idx):
            if face == 't':
                ii = np.where(np.mod(X, 1.6) < 0.45, 2, 1)
                ii = np.where(np.abs(Y) > B - 0.8, 2, ii)
                return np.full(X.shape, R('wood')), ii
            return _plank_side(face, X, Y, Z, idx)
        box(xa, -B, 0, xb + 0.05, B, max(h, 0.2), 'wood', tex=top, oid=o, cast=False)
    # cleats across the slope so a pushed cart grips
    for k in range(1, 8):
        x = -L + 2 * L * k / 8
        t = (x + L) / (2 * L)
        h = DOCK * (1 - t) if d == 'e' else DOCK * t
        box(x - 0.3, -B + 0.8, h, x + 0.3, B - 0.8, h + 0.4, 'wood', shades=(2, 3, 3), oid=o, cast=False)
    return o


# ============================ the footbridges (D27: taller, over the stacks) ============================
FB_TOP = 7.6 * UY
FB_UNDER = 7.2 * UY
FB_HALF = 0.7 * U
FB_Z0, FB_Z1 = -10.3 * U, 5.0 * U
LAND = 1.4 * U
FB_STEPS = 28
FB_RUN = 9.8 * U       # from the deck's side (0.7u) out to 10.5u
RAIL_H = 1.0 * UY
FB_BENTS = ((-9.6 * U, P1_DECK), (-3.0 * U, 0.0), (4.3 * U, DOCK))     # (z, foot height): platform 1, between tracks, cargo
FLIGHT = {'p1': (FB_Z0, FB_Z0 + LAND, P1_DECK), 'p2': (FB_Z1 - LAND, FB_Z1, DOCK)}


def _post(x, y, z0, z1, o, w=0.55, ramp='wood'):
    box(x - w, y - w, z0, x + w, y + w, z1, ramp, shades=(1, 2, 3), oid=o)


def _deck_tex(face, X, Y, Z, idx):
    if face == 't':
        return np.full(X.shape, R('wood')), np.where(np.mod(Y, 1.6) < 0.45, 2, 1)
    return np.full(X.shape, R('wood')), np.where(Z > FB_TOP - 0.8, 2, 3)


def _railing(x, y0, y1, o, ztop=FB_TOP):
    for y in np.arange(y0 + 0.3, y1, 6.0):
        _post(x, y, ztop, ztop + RAIL_H, o, 0.3)
    box(x - 0.3, y0, ztop + RAIL_H - 0.8, x + 0.3, y1, ztop + RAIL_H, 'wood', shades=(0, 1, 2), oid=o)
    box(x - 0.25, y0, ztop + RAIL_H * 0.45, x + 0.25, y1, ztop + RAIL_H * 0.45 + 0.6, 'wood', shades=(1, 2, 3), oid=o)


def footbridge_deck():
    o = new_oid(True)
    box(-FB_HALF, FB_Z0, FB_UNDER, FB_HALF, FB_Z1, FB_TOP, 'wood', tex=_deck_tex, oid=o)
    # stringers under the deck, the far (-x) railing
    box(-FB_HALF - 0.4, FB_Z0, FB_UNDER - 1.6, -FB_HALF + 0.6, FB_Z1, FB_UNDER, 'wood', shades=(1, 2, 3), oid=o)
    box(FB_HALF - 0.6, FB_Z0, FB_UNDER - 1.6, FB_HALF + 0.4, FB_Z1, FB_UNDER, 'wood', shades=(1, 2, 3), oid=o)
    _railing(-FB_HALF + 0.3, FB_Z0 + LAND, FB_Z1 - LAND, o)
    return o


def footbridge_rail():
    o = new_oid(True)
    _railing(FB_HALF - 0.3, FB_Z0 + LAND, FB_Z1 - LAND, o)
    return o


def footbridge_bent(k):
    """Trestle bents: k 0 on platform 1, 1 the thin pair between tracks 1 and 2 (1u clear of each train), 2 on the
    cargo platform."""
    o = new_oid(True)
    y, zf = FB_BENTS[k]
    w = 0.5 if k == 1 else 0.7
    for x in (-FB_HALF - 0.6, FB_HALF + 0.6):
        _post(x, y, zf, FB_UNDER - 1.6, o, w)
    if k != 1:
        for j in range(12):        # an X brace, stepped
            t = j / 11.0
            z = zf + 2.0 + t * (FB_UNDER - zf - 5.0)
            xa = -FB_HALF - 0.6 + t * (2 * FB_HALF + 1.2)
            box(xa - 0.5, y - 0.3, z, xa + 0.5, y + 0.3, z + 1.4, 'wood', shades=(1, 2, 3), oid=o, cast=False)
            box(-xa - 0.5, y - 0.3, z, -xa + 0.5, y + 0.3, z + 1.4, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    box(-FB_HALF - 1.4, y - 0.6, FB_UNDER - 1.6, FB_HALF + 1.4, y + 0.6, FB_UNDER, 'wood', shades=(1, 2, 3), oid=o)
    return o


def _stair_geom(plat, d):
    y0, y1, zfoot = FLIGHT[plat]
    s = 1.0 if d == 'e' else -1.0
    xt = s * FB_HALF                 # the top of the flight, at the deck's side
    xb = s * (FB_HALF + FB_RUN)      # the foot
    return y0, y1, s, xt, xb, zfoot


def footbridge_stair(plat, d):
    """A flight of 28 steps along x from the deck's landing down to the platform (platform 1 or the cargo platform),
    running to +x ('e') or -x ('w'); stringers, treads and the far handrail. The near handrail is `_rail`."""
    o = new_oid(True)
    y0, y1, s, xt, xb, zf = _stair_geom(plat, d)
    rise = (FB_TOP - zf) / FB_STEPS
    run = FB_RUN / FB_STEPS
    # the landing at the top
    box(-FB_HALF, y0, FB_UNDER, FB_HALF, y1, FB_TOP, 'wood', tex=_deck_tex, oid=o)
    for k in range(FB_STEPS):
        xa = xt + s * k * run; xb_ = xa + s * run
        zt = FB_TOP - (k + 1) * rise
        box(min(xa, xb_), y0 + 0.3, zt - 0.7, max(xa, xb_), y1 - 0.3, zt, 'wood', shades=(1, 2, 3), oid=o)
    # stringers (the far one), posts at the foot and under the middle
    for j in range(FB_STEPS):
        xa = xt + s * j * run
        zt = FB_TOP - (j + 1) * rise
        box(min(xa, xa + s * run), y0, zt - 2.4, max(xa, xa + s * run), y0 + 0.5, zt - 0.4, 'wood', shades=(1, 2, 3),
            oid=o, cast=False)
    xm = xt + s * FB_RUN * 0.5
    _post(xm, y0 + 0.4, zf, (FB_TOP + zf) / 2 - 2.0, o, 0.5)
    _post(xm, y1 - 0.4, zf, (FB_TOP + zf) / 2 - 2.0, o, 0.5)
    _stair_rail(plat, d, y0 + 0.3, o)
    return o


def _stair_rail(plat, d, y, o):
    y0, y1, s, xt, xb, zf = _stair_geom(plat, d)
    rise = (FB_TOP - zf) / FB_STEPS
    run = FB_RUN / FB_STEPS
    for j in range(0, FB_STEPS + 1, 7):
        x = xt + s * j * run
        zt = FB_TOP - j * rise
        _post(x, y, zt - 0.5, zt + RAIL_H, o, 0.3)
    for j in range(FB_STEPS):
        x = xt + s * j * run
        zt = FB_TOP - (j + 0.5) * rise + RAIL_H - 0.6
        box(min(x, x + s * run), y - 0.3, zt, max(x, x + s * run), y + 0.3, zt + 0.7, 'wood', shades=(0, 1, 2), oid=o, cast=False)


def footbridge_stair_rail(plat, d):
    o = new_oid(True)
    y0, y1, s, xt, xb, zf = _stair_geom(plat, d)
    _stair_rail(plat, d, y1 - 0.3, o)
    return o


def footbridge_all(d1='e', d2='e'):
    footbridge_deck(); footbridge_rail()
    for k in range(3):
        footbridge_bent(k)
    footbridge_stair('p1', d1); footbridge_stair_rail('p1', d1)
    footbridge_stair('p2', d2); footbridge_stair_rail('p2', d2)


def footbridge_boxes():
    u = lambda v: round(v / U, 3)
    h = lambda v: round(v / UY, 3)
    out = {
        'deck': dict(box=[u(-FB_HALF), u(FB_Z0), u(FB_HALF), u(FB_Z1), h(FB_TOP + RAIL_H)], y0=h(FB_UNDER),
                     walk_y=h(FB_TOP), walk_x=0.0, walk_z=[u(FB_Z0 + LAND / 2), u(FB_Z1 - LAND / 2)]),
        'rail': dict(box=[u(FB_HALF - 0.6), u(FB_Z0), u(FB_HALF), u(FB_Z1), h(FB_TOP + RAIL_H)], y0=h(FB_TOP)),
    }
    for k, (y, zf) in enumerate(FB_BENTS):
        out[f'bent{k}'] = dict(box=[u(-FB_HALF - 1.4), u(y - 0.7), u(FB_HALF + 1.4), u(y + 0.7), h(FB_UNDER)], y0=h(zf))
    for plat in ('p1', 'p2'):
        for d in ('e', 'w'):
            y0, y1, s, xt, xb, zf = _stair_geom(plat, d)
            out[f'stair_{plat}_{d}'] = dict(
                box=[u(min(xt, xb, 0)), u(y0), u(max(xt, xb, 0)), u(y1), h(FB_TOP + RAIL_H)], y0=h(zf),
                walk_top=[u(xt), u((y0 + y1) / 2), h(FB_TOP)], walk_bottom=[u(xb), u((y0 + y1) / 2), h(zf)],
                walk_landing=[0.0, u((y0 + y1) / 2), h(FB_TOP)], steps=FB_STEPS)
            out[f'stair_{plat}_{d}_rail'] = dict(box=[u(min(xt, xb)), u(y1 - 0.6), u(max(xt, xb)), u(y1), h(FB_TOP + RAIL_H)],
                                                 y0=h(zf))
    return out


# ============================ lever frames, levers, rodding ============================
LF = dict(a=6.0, b=4.0, h=0.3 * UY)        # the plank stage 3 x 2u, 0.3u high
LEVER_X = (-0.6 * U, 0.6 * U)


def leverframe():
    """A lever frame at the platform end: a plank stage 3 x 2u, a cast-iron frame (quadrant racks) for two levers
    1.2u apart, a small lamp on a post and a number board. The levers are separate sprites (bld/lever/N|R), drawn
    at extra.levers. Anchor: the stage's centre at ground level."""
    o = new_oid(True)
    A, B, h = LF['a'], LF['b'], LF['h']
    box(-A, -B, 0, A, B, h, 'wood', tex=lambda f, X, Y, Z, i: (None, np.where(np.mod(X, 1.6) < 0.45, 2, 1) if f == 't'
                                                                  else np.where(np.mod(X if f == 'l' else Y, 1.6) < 0.4, 3, 2)),
        oid=o)
    # the frame: a long iron bed with a quadrant rack at each lever
    box(-4.4, -0.8, h, 4.4, 0.8, h + 1.4, 'iron', shades=(1, 2, 3), oid=o)
    for x in LEVER_X:
        box(x - 0.5, -1.8, h + 1.4, x + 0.5, 1.8, h + 2.6, 'iron', shades=(1, 2, 3), oid=o)
    # a number board behind the levers: W or E with two plates
    box(-3.6, -3.4, h, -3.0, -2.8, h + 8.4, 'wood', shades=(1, 2, 3), oid=o)
    box(3.0, -3.4, h, 3.6, -2.8, h + 8.4, 'wood', shades=(1, 2, 3), oid=o)
    box(-3.8, -2.8, h + 5.6, 3.8, -2.4, h + 8.4, 'cream', shades=(0, 0, 1), oid=o)
    # the signalman's lamp on a post at the stage's corner
    box(A - 1.4, B - 1.4, h, A - 0.6, B - 0.6, h + 13.0, 'iron', shades=(1, 2, 3), oid=o)
    box(A - 1.8, B - 1.8, h + 13.0, A - 0.2, B - 0.2, h + 15.0, 'fire', shades=(0, 1, 1), oid=o)
    box(A - 2.0, B - 2.0, h + 15.0, A, B, h + 15.6, 'iron', shades=(1, 2, 3), oid=o)
    # rodding leaving the frame towards the track (along x, on stools)
    for x in (-A - 1.0, A + 1.0):
        box(min(x, x + (2.0 if x > 0 else -2.0)), -0.3, 0.8, max(x, x + (2.0 if x > 0 else -2.0)), 0.3, 1.3, 'iron',
            shades=(1, 2, 3), oid=o, cast=False)
    return o


def leverframe_letters(side='W'):
    s = side + '1  ' + side + '3'
    w = text_width(s) / 2.0
    TW.text_on('l', -w / 2.0, -2.35, LF['h'] + 8.0, s, 'wood', 4)


def lever(state='N'):
    """One lever, 1.6u tall from its pivot in the frame: a red shaft with a white handle; 'N' standing back (towards
    -z), 'R' pulled over towards +z (the operator's side). Anchor: the pivot's foot at ground level (draw it at the
    frame's anchor plus extra.levers)."""
    o = new_oid(True)
    h0 = LF['h'] + 1.4
    L = 1.6 * UY
    ang = math.radians(-18 if state == 'N' else 28)
    n = 14
    for k in range(n):
        t = k / n
        y = math.sin(ang) * L * t
        z = h0 + math.cos(ang) * L * t
        ramp = 'cream' if t > 0.82 else 'red'
        box(-0.4, y - 0.4, z, 0.4, y + 0.4, z + L / n + 0.2, ramp, shades=(1, 1, 2), oid=o, cast=False)
    # the catch handle beside the grip
    y = math.sin(ang) * L * 0.85; z = h0 + math.cos(ang) * L * 0.85
    box(0.4, y - 0.3, z - 1.2, 0.8, y + 0.3, z, 'iron', shades=(1, 2, 3), oid=o, cast=False)
    return o


def rodding(axis='x'):
    """2u of point rodding on stools (from a lever frame out to the points), drawn just off the ground: along x
    from its -x end (axis 'x'), or along z from its -z end (axis 'z')."""
    o = new_oid(True)
    def B(a0, b0, z0, a1, b1, z1, ramp):
        if axis == 'x':
            box(a0, b0, z0, a1, b1, z1, ramp, shades=(1, 2, 3), oid=o, cast=False)
        else:
            box(b0, a0, z0, b1, a1, z1, ramp, shades=(1, 2, 3), oid=o, cast=False)
    for x in (1.0, 5.0):
        B(x - 0.5, -0.8, 0, x + 0.5, 0.8, 0.9, 'wood')
    for y in (-0.45, 0.45):
        B(0.0, y - 0.22, 0.9, 8.0, y + 0.22, 1.3, 'iron')
    return o


def rodding_crank(arms='es'):
    """The cranked turn where the rodding changes direction: a cast-iron bell crank (an L plate on a pivot) on a
    timber baulk, its centre on the turn point. arms: where its two arms point, 'e' +x or 'w' -x, then 's' +z or
    'n' -z; the runs (bld/rodding_x, _z) leave the turn point that way and their rods meet the arms' eyes."""
    o = new_oid(True)
    sx = 1.0 if arms[0] == 'e' else -1.0
    sy = 1.0 if arms[1] == 's' else -1.0
    def B(x0, y0, z0, x1, y1, z1, ramp, shades=(1, 2, 3)):
        box(min(x0 * sx, x1 * sx), min(y0 * sy, y1 * sy), z0, max(x0 * sx, x1 * sx), max(y0 * sy, y1 * sy), z1,
            ramp, shades=shades, oid=o, cast=False)
    B(-1.4, -1.4, 0, 1.4, 1.4, 0.7, 'wood')
    B(-0.9, -0.9, 0.7, 0.9, 0.9, 0.9, 'iron', (2, 3, 3))          # the bearing plate
    cyl_z(0, 0, 0.9, 1.5, 0.45, 'iron', oid=o, cast=False)        # the pivot boss
    B(-0.3, -0.3, 1.0, 1.8, 0.3, 1.3, 'iron')                     # arm along x
    B(-0.3, -0.3, 1.0, 0.3, 1.8, 1.3, 'iron')                     # arm along z
    B(-0.5, -0.5, 1.0, 0.5, 0.5, 1.4, 'iron')                     # the corner web
    for (x, y) in ((1.8, 0.0), (0.0, 1.8)):                       # the rod eyes
        B(x - 0.25, y - 0.25, 0.9, x + 0.25, y + 0.25, 1.4, 'iron', (0, 2, 3))
    return o
