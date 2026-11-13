# D32 wild country (Artist 3): the landmarks of the journey, keys wild/mark/... (plans/d32-journey.md's table, and a
# few more in keeping). Three kinds:
#   standalone sprites  (a lone cottonwood, the giant pine, the trapper's ruined cabin, a balanced rock, the natural
#                       arch, the summit board, the far town's water tower and roofs, a waterfall, and more): anchor the
#                       foot or the footprint's centre at ground level
#   corridor pieces     the blasted rock cut's two faces (8u pieces like line/cut_bank, with up and down ends)
#   border pieces       edge pieces that take the place of one of a region's 8u edge pieces and join its others: the
#                       beaver dam (creek), the old ferry landing (river), the canyon shelf (canyon), the grist mill
#                       with its turning wheel (valley)
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R, hash2
import harness as H
import country_d32 as C
import nature as N
import wild_props as P
import wild_terrain as WT
import wild_regions as WR
import wild_pieces as WP
from wild_terrain import Field, cellnoise, vnoise, fbm, smooth, env
from wild_regions import sprof, bump, sel, m_layers, m_prairie, m_rock, m_wood, m_water, haze, at
from geom27 import B, CYV, ocyl, obox, axes_tilt, clampi
from geom_d32 import Frame

UX, UY = E.U_XZ, E.U_Y
FOOT = 'the foot (or the footprint\'s centre) at ground level'


def one(draw, shadow=None, canvas=(420, 420), origin=(210, 300), after=None, post=None):
    return [H.render(draw, shadow=shadow, canvas=canvas, origin=origin, after=after, post=post)]


# ------------------------------------------------------------------------------------------------ trees
def lone_cottonwood():
    """The lone cottonwood of the home prairie: an old giant, 13u, its trunk forked low, one great limb dead and
    grey, a broken limb lying in the grass below."""
    rnd = np.random.RandomState(4040)
    o = E.new_oid(True)
    s = 1.3
    E.cyl_z(0, 0, 0, 15 * s, 2.3 * s, 'rock', oid=o, th=(0.45, 0.2, -0.15),
            tex=lambda f, X, Y, Z, i: (None, np.where(np.mod(Z + np.floor(np.arctan2(Y, X) * 3) * 1.3, 2.6) < 0.6, np.minimum(i + 1, 4), i)))
    forks = [(-7.0, 3.0, 30.0), (7.0, -2.5, 33.0), (1.5, 6.0, 38.0), (-2.0, -5.0, 36.0)]
    blobs = []
    for (fx, fy, fz) in forks:
        fx *= s; fy *= s; fz *= s
        N.limb(0, 0, 13 * s, fx, fy, fz, 1.8 * s, 0.7 * s, 'rock', o)
        blobs += N._blobs(rnd, fx, fy, fz + 7 * s, 7.0 * s, 12, 3.0 * s, 5.0 * s, 0.85)
    blobs.insert(0, (0.0, 0.0, 38 * s, 6.5 * s))
    blobs.append((0.5 * s, -0.5 * s, 49 * s, 4.2 * s))
    N.crown(blobs, o, 4040)
    # the dead limb reaching out bare to the east
    N.limb(4 * s, -1 * s, 26 * s, 15 * s, -5 * s, 40 * s, 1.0 * s, 0.4 * s, 'rock', o)
    N.limb(12 * s, -4 * s, 36 * s, 16 * s, -2 * s, 44 * s, 0.4 * s, 0.25 * s, 'rock', o)
    # a broken limb in the grass
    lo = E.new_oid(True)
    N.limb(-6, 14, 1.2, 10, 20, 1.6, 1.0, 0.6, 'rock', lo)
    N.limb(2, 17, 1.4, 5, 22, 4.0, 0.4, 0.2, 'rock', lo)


def giant_pine():
    """The giant old ponderosa of the big woods: 11u, a great cinnamon trunk with a lightning scar, dead lower limbs,
    a flat-topped crown of heavy needle clumps."""
    rnd = np.random.RandomState(4141)
    o = E.new_oid(True)
    h = 11.0 * UY
    def bark(f, X, Y, Z, i):
        ang = np.arctan2(Y, X)
        plate = hash2(np.floor(Z / 1.4).astype(int), np.floor(ang * 3).astype(int)) % 3 == 0
        scar = (np.abs(ang - 1.0) < 0.12) & (Z > 4) & (Z < h * 0.55)
        rr = np.where(scar, R('wood'), R('bark'))
        return rr, np.where(scar, 1, np.where(plate, np.minimum(i + 1, 4), i))
    E.cyl_z(0, 0, 0, h * 0.8, 2.4, 'bark', oid=o, th=(0.45, 0.2, -0.15), tex=bark)
    E.cyl_z(0, 0, 0, 2.0, 3.0, 'bark', oid=o, th=(0.45, 0.2, -0.15), tex=bark)       # the flared foot
    for k in range(6):
        a = rnd.uniform(0, 2 * math.pi); z = h * rnd.uniform(0.22, 0.45)
        N.limb(0, 0, z, math.cos(a) * 5.0, math.sin(a) * 5.0, z + rnd.uniform(1, 3), 0.45, 0.2, 'rock', o)
    tiers = 9
    for t in range(tiers):
        f = t / (tiers - 1)
        z = h * (0.4 + 0.55 * f)
        rad = (9.0 - 4.5 * f)
        for k in range(max(3, int(8 - 4 * f))):
            a = rnd.uniform(0, 2 * math.pi) + t * 2.3
            d = rad * rnd.uniform(0.4, 0.85)
            E.sphere(math.cos(a) * d, math.sin(a) * d, z + rnd.uniform(-1, 1), rad * rnd.uniform(0.4, 0.55), 'needle',
                     oid=o, th=(0.8, 0.4, -0.1), noise=0.55, seed=4141 + t * 7 + k, sz=0.7)
    E.sphere(0, 0, h * 0.97, 3.2, 'needle', oid=o, th=(0.8, 0.4, -0.1), noise=0.5, seed=4199, sz=0.8)
    for k in range(6):
        a = rnd.uniform(0, 2 * math.pi)
        E.sphere(math.cos(a) * 9, math.sin(a) * 8, 0.3, 1.4, 'straw', cast=False, sz=0.3)       # cones and needles


# ------------------------------------------------------------------------------------------------ buildings
def _log_x(x0, x1, z, y, r=0.14, ramp='bark'):
    ocyl(((x0 + x1) / 2, z, y + r), (1, 0, 0), r, abs(x1 - x0) / 2, ramp, cast=True)


def _log_z(z0, z1, x, y, r=0.14, ramp='bark'):
    ocyl((x, (z0 + z1) / 2, y + r), (0, 1, 0), r, abs(z1 - z0) / 2, ramp, cast=True)


def trapper_cabin():
    """The trapper's ruined cabin in the big woods: log walls fallen to a few courses, the roof's poles down inside,
    the stone chimney still standing, fireweed grown through (u, round the footprint's centre; 4.6 x 3.6u)."""
    rnd = np.random.RandomState(4242)
    hw, hl = 2.1, 1.6
    st = 0.27
    for k in range(5):                         # the back wall (north) and the west wall stand higher
        y = k * st
        _log_x(-hw - 0.25, hw + 0.25 - (0.9 if k == 4 else 0), -hl, y)
        _log_z(-hl - 0.25, hl + 0.25 - (1.2 if k >= 3 else 0), -hw, y + 0.13)
    for k in range(3):
        y = k * st
        _log_z(-hl - 0.25, hl + 0.25 - (0.6 if k == 2 else 0), hw, y + 0.13)
    for k in range(2):                          # the front: two courses and the door gap
        y = k * st
        _log_x(-hw - 0.25, -0.5, hl, y)
        if k == 0:
            _log_x(0.5, hw + 0.25, hl, y)
    # fallen roof poles inside, leaning from the back wall
    for k, x in enumerate((-1.4, -0.4, 0.7, 1.5)):
        F = Frame(yaw=-90 + rnd.uniform(-12, 12))
        a = math.radians(rnd.uniform(14, 26))
        p0 = np.array([x, -hl + 0.1, 1.3 - k * 0.2]); L = 3.4
        p1 = p0 + np.array([rnd.uniform(-0.3, 0.3), L * math.cos(a), -L * math.sin(a)])
        p1[2] = max(p1[2], 0.1)
        Frame().rod((p0[0], p0[1], p0[2]), (p1[0], p1[1], p1[2]), 0.09, 'rock')
    # the chimney, stones in courses, at the west end outside
    for k in range(9):
        y = k * 0.28
        w = 0.55 - (0.12 if k > 6 else 0)
        B(-hw - 0.95, -0.5 + 0.0, y, -hw - 0.95 + 2 * w, -0.5 + 2 * w * 0.9, y + 0.27, 'rock',
          tex=lambda f, x, z, yy, i: (None, np.where(hash2(np.floor(x * 5).astype(int) + np.floor(yy * 4).astype(int), np.floor(z * 5).astype(int)) % 4 == 0, clampi(i + 1), i)))
    # fireweed and grass grown in
    for k in range(7):
        x, z = rnd.uniform(-1.6, 1.6), rnd.uniform(-1.0, 1.2)
        for j in range(4):
            E.box(x * UX + j * 0.3, z * UX, 0, x * UX + j * 0.3 + 0.3, z * UX + 0.3, 3.0 + j, 'leaf', cast=False)
        E.sphere(x * UX + 0.5, z * UX, 4.6, 0.6, 'plum', cast=False)
    for k in range(4):
        with WT.place(rnd.uniform(-2.6, 2.6), rnd.uniform(1.8, 2.4), 0.0):
            P.tuft(4242 + k, 'grass', 0.6)


def far_cabin():
    """A settler's log cabin seen far off: logs, a shake roof, a stone chimney (its smoke is wild/life/smoke at
    extra.chimney). u, round the footprint's centre; 4 x 3u."""
    hw, hl = 1.8, 1.4
    for k in range(6):
        y = k * 0.27
        _log_x(-hw - 0.2, hw + 0.2, -hl, y); _log_x(-hw - 0.2, hw + 0.2, hl, y)
        _log_z(-hl - 0.2, hl + 0.2, -hw, y + 0.13); _log_z(-hl - 0.2, hl + 0.2, hw, y + 0.13)
    # door and window on the front (+z)
    B(-0.4, hl + 0.14, 0.0, 0.3, hl + 0.2, 1.3, 'umber', shades=(2, 2, 3))
    B(0.8, hl + 0.14, 0.7, 1.3, hl + 0.2, 1.15, 'glass', shades=(2, 3, 3))
    E.gable_x((-hw - 0.4) * UX, (hw + 0.4) * UX, 0.0, (hl + 0.45) * UX, 1.62 * UY, 2.9 * UY, 'umber', wall='bark',
              shades=(1, 2))
    for k in range(10):
        y = k * 0.3
        B(-hw - 0.7, -0.4, y, -hw - 0.05, 0.3, y + 0.29, 'rock')
    B(-hw - 0.6, -0.3, 3.0, -hw - 0.15, 0.2, 3.35, 'rock')


def wagon_wreck():
    """An emigrant wagon left on the prairie: the bed down at one end, a wheel off and flat in the grass, the bows
    bare of their cover, all bleached (u, round the bed's centre)."""
    F = Frame(yaw=12, pitch=-9, origin=(0.0, 0.0, 0.55))
    F.box(-2.0, -0.7, 0.0, 2.0, 0.7, 0.12, 'cream')
    for side in (-0.7, 0.7):
        F.box(-2.0, side - 0.05, 0.0, 2.0, side + 0.05, 0.55, 'cream')
    F.box(1.95, -0.7, 0.0, 2.05, 0.7, 0.5, 'cream')
    for a in (-1.4, 0.0, 1.4):               # the bows: three hoops, one broken
        n = 7
        for k in range(n):
            t0 = math.pi * k / n; t1 = math.pi * (k + 1) / n
            if a == 1.4 and k > 3:
                break
            F.rod((a, -0.72 * math.cos(t0), 0.55 + 1.0 * math.sin(t0)), (a, -0.72 * math.cos(t1), 0.55 + 1.0 * math.sin(t1)),
                  0.06, 'wood')
    def spokes(part, s, ang, rho, idx):
        sp = (np.abs(np.mod(ang * 12 / (2 * np.pi), 1.0) - 0.5) < 0.18) | (rho > 0.52) | (rho < 0.12)
        return (np.where(rho > 0.55, R('iron'), R('cream')), idx, (part == 0) | sp)
    def wheel(cx, cz, cy, flat):
        r = 0.62; n = 14
        for k in range(n):
            a0 = 2 * math.pi * k / n; a1 = 2 * math.pi * (k + 1) / n
            if flat:
                p0 = (cx + math.cos(a0) * r, cz + math.sin(a0) * r, cy); p1 = (cx + math.cos(a1) * r, cz + math.sin(a1) * r, cy)
            else:
                p0 = (cx + math.cos(a0) * r, cz, cy + math.sin(a0) * r); p1 = (cx + math.cos(a1) * r, cz, cy + math.sin(a1) * r)
            Frame().rod(p0, p1, 0.06, 'wood')
        for k in range(6):
            a = math.pi * k / 6
            if flat:
                Frame().rod((cx - math.cos(a) * r, cz - math.sin(a) * r, cy), (cx + math.cos(a) * r, cz + math.sin(a) * r, cy), 0.035, 'cream')
            else:
                Frame().rod((cx - math.cos(a) * r, cz, cy - math.sin(a) * r), (cx + math.cos(a) * r, cz, cy + math.sin(a) * r), 0.035, 'cream')
    wheel(-1.3, 0.85, 0.64, False)
    wheel(1.6, 1.9, 0.08, True)
    Frame(yaw=40).rod((2.1, 0.0, 0.25), (4.4, 0.0, 0.05), 0.06, 'cream')                  # the tongue
    for k in range(5):
        with WT.place(-2.0 + k, 1.6 - (k % 2) * 3.2, 0.0):
            P.tuft(4300 + k, 'straw', 0.6)


def grave():
    """An emigrant's lone grave: a mound of stones and a weathered wooden cross (u)."""
    rnd = np.random.RandomState(4343)
    for k in range(12):
        E.sphere(rnd.uniform(-1.2, 1.2) * UX * 0.5 + rnd.uniform(-1, 1), rnd.uniform(-2.4, 2.4) * UX * 0.5,
                 rnd.uniform(0.3, 1.5), rnd.uniform(0.7, 1.1), 'rock', th=(0.75, 0.3, -0.25), noise=0.5,
                 seed=4343 + k, sz=0.7)
    B(-0.11, -1.4, 0.0, 0.11, -1.2, 1.9, 'cream')
    B(-0.6, -1.4, 1.3, 0.6, -1.2, 1.5, 'cream')
    for k in range(3):
        E.sphere(rnd.uniform(-2, 2), rnd.uniform(-5, 5), 2.5, 0.5, 'bloom', cast=False)


# ------------------------------------------------------------------------------------------------ rock
def balanced_rock():
    """A balanced rock: a great red boulder on a pedestal of pale sandstone worn to a thin neck, about 5u (u)."""
    o = E.new_oid(True)
    h = 3.1
    n = 8
    for k in range(n):
        y0 = k * h / n; y1 = (k + 1) * h / n
        t = (y0 + y1) / 2 / h
        w = 0.95 - 0.62 * math.sin(t * math.pi * 0.62) ** 1.4 + 0.1 * math.sin(k * 2.1)
        obox((0.06 * math.sin(k), 0.0, (y0 + y1) / 2), axes_tilt((1, 0.2), 0), (w, w * 0.85, (y1 - y0) / 2 + 0.01),
             'rock', tex=P._strata, oid=o, cast=True)
    o2 = E.new_oid(True)
    obox((0.3, -0.1, h + 1.0), axes_tilt((1, 0.3), 9), (1.7, 1.25, 1.0), 'brick', tex=P._strata, oid=o2, cast=True)
    obox((0.5, 0.0, h + 2.1), axes_tilt((1, -0.2), -6), (1.2, 0.95, 0.35), 'brick', tex=P._strata, oid=o2, cast=True)
    with WT.place(1.6, 0.8, 0.0):
        P.rockpile(4444, n=4, s=0.9, low=True)
    with WT.place(-1.3, 1.1, 0.0):
        P.rockpile(4445, n=3, s=0.7, low=True, ramp='brick')


def natural_arch():
    """A natural arch: a fin of layered red rock, 10u long and 6.5u high, worn through (u, round its foot)."""
    st = 0.25
    xs = np.arange(-5.0, 5.0, st)
    for x in xs:
        xc = x + st / 2
        top = 6.4 - 0.9 * (abs(xc) / 5) ** 2 + 0.35 * math.sin(xc * 1.7) - 2.6 * max(0, abs(xc) - 4.0)
        hole_top = 4.6 * math.sqrt(max(0.0, 1 - (xc / 2.4) ** 2)) if abs(xc) < 2.4 else 0.0
        th = 0.9 - 0.15 * math.sin(xc)
        runs = [(0.0, top)] if hole_top <= 0 else [(hole_top, top)]
        for (y0, y1) in runs:
            if y1 - y0 < 0.1:
                continue
            B(x, -th, y0, x + st, th, y1, 'brick', tex=lambda f, X, Z, Y, i: m_layers(X, Z, Y - 7.0)[0:1] + (np.clip(m_layers(X, Z, Y - 7.0)[1] + (f == 'r'), 0, 4),),
              shades=(1, 2, 3))
    with WT.place(3.0, 1.6, 0.0):
        P.rockpile(4545, n=5, s=1.0, ramp='brick')
    with WT.place(-3.4, 1.4, 0.0):
        N.juniper(1)


def summit_board_draw():
    """The summit board: a painted board on two posts, SUMMIT and the height, a cairn of stones at its foot (u; the
    face to +z so it reads)."""
    for x in (-2.0, 2.0):
        B(x - 0.09, -0.09, 0.0, x + 0.09, 0.09, 3.3, 'wood')
    B(-2.5, 0.09, 1.5, 2.5, 0.16, 3.4, 'cream', shades=(1, 0, 3))
    B(-2.55, 0.07, 3.4, 2.55, 0.2, 3.5, 'wood')
    rnd = np.random.RandomState(4646)
    for k in range(14):
        a = rnd.uniform(0, 2 * math.pi); d = rnd.uniform(0, 1.0)
        E.sphere((3.2 + math.cos(a) * d * 0.8) * UX, (0.9 + math.sin(a) * d * 0.6) * UX, (0.25 + (1 - d) * 0.9) * UY,
                 rnd.uniform(0.9, 1.4), 'rock', th=(0.75, 0.3, -0.25), noise=0.5, seed=4646 + k, sz=0.7)


def summit_board_text():
    E.text_on_yface(-1.9 * UX, 0.16 * UX, 3.3 * UY, 'SUMMIT', 'dark', 2)
    E.text_on_yface(-2.3 * UX, 0.16 * UX, 2.45 * UY, '8247 FT', 'dark', 2)


def hazy(ramp='slate'):
    """A post-process for things seen far off: every colour into one blue-grey ramp, a step lighter."""
    def after():
        on = (E.RB >= 0) & (E.RB != R('gnd'))
        E.IB[on] = np.clip(E.IB[on] - 1, 0, 2)
        E.RB[on] = R(ramp)
    return after


def water_tower():
    """The far town's water tower: a tank on a trestle of four legs, a conical roof, the spout (u, round its
    footprint's centre; 7.5u high). Drawn in the distance's blue-grey."""
    for (x, z) in ((-0.9, -0.9), (0.9, -0.9), (-0.9, 0.9), (0.9, 0.9)):
        Frame().rod((x * 1.15, z * 1.15, 0.0), (x * 0.8, z * 0.8, 4.6), 0.08, 'wood')
    for y in (1.5, 3.0):
        for (a, b) in (((-1, -1), (1, -1)), ((-1, 1), (1, 1)), ((-1, -1), (-1, 1)), ((1, -1), (1, 1))):
            Frame().rod((a[0] * 0.95, a[1] * 0.95, y), (b[0] * 0.95, b[1] * 0.95, y), 0.04, 'wood')
    CYV(0, 0, 4.6, 6.4, 1.3, 'wood', tex=lambda f, x, z, y, i: (None, np.where(np.mod(np.arctan2(z, x) * 6, 1.0) < 0.2, clampi(i + 1), i)))
    for k in range(5):
        CYV(0, 0, 6.4 + k * 0.2, 6.6 + k * 0.2, 1.4 - k * 0.3, 'roof')
    Frame().rod((1.2, 0.3, 4.9), (2.0, 0.5, 4.3), 0.06, 'iron')


def far_town():
    """The far town seen across the valley: a row of roofs, a false-fronted store, a church with its steeple, a
    barn (u, round the middle of the row; 22u along x). Drawn in the distance's blue-grey."""
    rnd = np.random.RandomState(4747)
    x = -11.0
    while x < 10.0:
        w = rnd.uniform(1.6, 2.8); d = rnd.uniform(1.8, 2.6); hgt = rnd.uniform(1.4, 2.2)
        z = rnd.uniform(-1.5, 1.5)
        B(x, z - d / 2, 0.0, x + w, z + d / 2, hgt, 'wood')
        E.gable_y((z - d / 2) * UX, (z + d / 2) * UX, (x + w / 2) * UX, (w / 2 + 0.15) * UX, hgt * UY, (hgt + w * 0.45) * UY,
                  'roof', wall='wood')
        x += w + rnd.uniform(0.3, 1.2)
    # the church and its steeple
    B(2.0, -3.6, 0.0, 4.4, -1.8, 2.0, 'cream')
    E.gable_x(2.0 * UX, 4.4 * UX, -2.7 * UX, 1.05 * UX, 2.0 * UY, 3.0 * UY, 'roof', wall='cream')
    B(3.9, -3.1, 0.0, 4.7, -2.3, 3.6, 'cream')
    for k in range(6):
        B(3.95 + k * 0.06, -3.05 + k * 0.06, 3.6 + k * 0.35, 4.65 - k * 0.06, -2.35 - k * 0.06, 3.95 + k * 0.35, 'roof')
    # the barn
    B(-9.0, -4.0, 0.0, -6.4, -2.2, 1.9, 'red')
    E.gable_x(-9.0 * UX, -6.4 * UX, -3.1 * UX, 1.1 * UX, 1.9 * UY, 2.9 * UY, 'roof', wall='red')
    with WT.place(6.5, -3.5, 0.0):
        water_tower()


# ------------------------------------------------------------------------------------------------ the rock cut
CUT_H = 3.4


def _cut_prof(kind, x):
    t = np.clip((np.asarray(x) + 4.0) / 8.0, 0, 1)
    sm = t * t * (3 - 2 * t)
    return {'up': sm, 'down': 1 - sm, 'full': 1.0 + 0 * t}[kind]


def rockcut_field(side, kind):
    """The blasted cut through the rock spur, 8u along x (x -4 .. 4): the north face at z -3 (tall, facing the
    viewer, its drill holes showing), or the south face at z 3 (low: the spur falls away to the south)."""
    def g(x, z):
        p = _cut_prof(kind, x)
        n = vnoise(x, z, 1.0, 150) - 0.5
        if side == 'n':
            zf = -3.0 - 0.18 * n - 0.15 * (vnoise(x, 0 * x, 0.5, 151) - 0.5)
            hh = (CUT_H + 0.5 * n + 0.6 * smooth((zf - z - 0.6) / 2.5)) * p
            return hh * smooth((zf - z) / 0.12)
        zf = 3.0 + 0.2 * n
        hh = (1.1 + 0.3 * n) * p * (1 - smooth((z - 4.2) / 1.6))
        return hh * smooth((z - zf) / 0.1)
    return Field(g)


def rockcut_mat(side):
    def mat(x, z, y, info):
        face = info['face'] | (info['slope'] > 1.5)
        n = cellnoise(x, y * 1.5, 0.125, 152); m = cellnoise(x, z, 0.25, 153)
        rr = np.where(m < 0.18, R('iron'), R('rock'))
        ii = np.where(n < 0.3, 1, np.where(n < 0.8, 2, 3))
        drill = face & (np.mod(x + 0.15 * np.sin(y * 2), 0.85) < 0.1) & (y < CUT_H * 0.95) & (side == 'n')
        lip = face & (np.mod(x + 0.15 * np.sin(y * 2), 0.85) < 0.16) & ~drill & (side == 'n')
        ii = np.where(drill, 3, np.where(lip, 1, ii))
        sm = (cellnoise(x, y, 0.25, 154) < 0.1) & face
        rr = np.where(sm, R('dark'), rr); ii = np.where(sm, 1, ii)            # powder smoke stains
        top = ~face
        g = m_prairie(x, z, dry=0.6, flowers=False)
        gr = top & (vnoise(x, z, 1.0, 155) > 0.45)
        rr = np.where(gr, g[0], rr); ii = np.where(gr, g[1], ii)
        rk = top & ~gr
        a = m_rock(x, z)
        rr = np.where(rk, a[0], rr); ii = np.where(rk, a[1], ii)
        return rr, ii
    return mat


def rockcut(side, kind):
    fld = rockcut_field(side, kind)
    z0, z1 = (-7.0, -2.95) if side == 'n' else (2.95, 6.0)
    keep = (lambda x, z: z > z0 + 0.8 * cellnoise(x, z, 0.25, 156)) if side == 'n' else (lambda x, z: z < z1 - 0.8 * cellnoise(x, z, 0.25, 157))
    def draw():
        WT.terrain(fld, rockcut_mat(side), -4.0, 4.0, z0, z1, keep=keep)
        rnd = np.random.RandomState(4848 + (side == 's') + {'up': 0, 'full': 3, 'down': 7}[kind])
        for k in range(5):           # blasted rubble at the face's foot / on the low side
            x = rnd.uniform(-3.4, 3.4) * (0.35 + 0.65 * float(_cut_prof(kind, rnd.uniform(-4, 4))))
            z = -2.75 if side == 'n' else rnd.uniform(3.6, 5.2)
            y = 0.0 if side == 'n' else at(fld.ground, x, z)
            with WT.place(x, z, y):
                P.rockpile(4848 + k, n=3, s=0.6, low=True)
    fr, _ = WT.render(draw, (300, 260), (150, 150))
    return fr


# ------------------------------------------------------------------------------------------------ the waterfall
class Waterfall:
    """A stream pours over a rock face 7u high into a pool, and runs out of it: for the river run's wooded bluff on
    the far side, or the river's far bank. A standalone piece of country with its own ragged edge."""
    TOP = 7.0

    def lip(self, x):
        return 0.25 * np.sin(x * 1.3) + 0.35 * np.maximum(0, np.abs(x) - 2.0)

    def ground(self, x, z):
        side = 1 - smooth((np.abs(x) - 3.4) / 2.2)
        top = (self.TOP - 0.6 * smooth((np.abs(x) - 1.5) / 3.0) + 0.5 * (vnoise(x, z, 1.0, 160) - 0.5)) * side
        top = top - 0.55 * (np.abs(x) < 1.05) * smooth((self.lip(x) - z) / 0.3)          # the stream's notch
        ledge = 1.6 * smooth((z - self.lip(x) + 0.9) / 0.2) * (np.abs(x) > 1.1)         # a bench part way down
        h = np.maximum(top * smooth((self.lip(x) - z) / 0.18), 0.0)
        h = np.where((z > self.lip(x) - 0.9) & (z < self.lip(x)) & (np.abs(x) > 1.1), np.minimum(h, top * 0.55), h)
        pool = -0.7 * np.exp(-((x / 2.4) ** 2 + ((z - 1.7) / 1.3) ** 2) * 1.6)
        run = -0.5 * (1 - smooth((np.abs(z - (1.7 + (x - 0.4) * 0.0) ) - 9) / 1)) * 0
        outflow = -0.5 * (1 - smooth((np.abs(x - 0.6 - (z - 2.5) * 0.35) - 0.5) / 0.4)) * smooth((z - 2.2) / 0.6)
        return h + pool + outflow + 0.06 * (fbm(x, z, 1.0, 161) - 0.5)

    def water(self, x, z):
        on_top = (np.abs(x) < 1.0) & (z < self.lip(x))
        return np.where(on_top, self.TOP - 0.65, -0.12)

    def field(self):
        return Field(self.ground, self.water)

    def mat(self, x, z, y, info):
        sl = info['slope']
        face = info['face'] | (sl > 1.4)
        lr, li = m_layers(x, z, y * 1.4 + 2.0)
        lr = np.where(cellnoise(x + z, y, 0.25, 165) < 0.35, R('umber'), R('slate'))
        li = np.clip(li + 1, 1, 3)
        rr, ii = m_prairie(x, z, dry=0.1, flowers=False)
        moss = (~face) & (y > 0.5)
        rr = np.where(moss & (cellnoise(x, z, 0.25, 162) < 0.5), R('needle'), rr)
        rr = np.where(face, lr, rr); ii = np.where(face, li, ii)
        wetrock = face & (np.abs(x) < 1.5) & (cellnoise(x, y, 0.125, 163) < 0.5)
        rr = np.where(wetrock, R('umber'), rr)
        shore = (~face) & (y < 0.05) & (y > -0.3)
        gr, gi = WR.m_gravel(x, z)
        rr = np.where(shore, gr, rr); ii = np.where(shore, gi, ii)
        wet = info['water']
        if np.any(wet):
            def rough(x, z):
                return np.clip(1 - np.sqrt((x / 1.6) ** 2 + ((z - self.lip(x) - 0.5) / 0.9) ** 2), 0, 1)
            wr, wi = m_water(x, z, y, info, 'river', 1.0, rough)
            rr = np.where(wet, wr, rr); ii = np.where(wet, wi, ii)
        return rr, ii

    def keep(self, x, z):
        return ((x / 6.0) ** 2 + ((z - 0.5) / 4.4) ** 2) < 1.0 - 0.12 * cellnoise(x, z, 0.25, 164)

    def render(self, frames=3):
        fld = self.field()
        def draw(f):
            WT.terrain(fld, self.mat, -6.5, 6.5, -4.5, 5.0, keep=self.keep, frame=f)
            for (x, z, s) in ((-2.6, -1.2, 0.9), (2.4, -1.6, 0.8), (3.6, -0.6, 0.7)):
                with WT.place(x, z, at(fld.ground, x, z) - 0.05):
                    P.sapling(int(x * 10) + 99, s)
            for (x, z) in ((-2.4, 2.4), (2.6, 2.0), (-1.6, 3.4), (1.6, 3.7)):
                with WT.place(x, z, at(fld.ground, x, z) - 0.03):
                    P.fern(int(z * 10) + 5, 1.1)
            for (x, z) in ((-1.0, 0.6), (1.3, 0.9)):
                with WT.place(x, z, at(fld.ground, x, z) - 0.2):
                    P.wetrock(int(x * 5) + 7, 0.6)
        return WT.render_anim([lambda f=f: draw(f) for f in range(frames)], (360, 300), (180, 200))


# ------------------------------------------------------------------------------------------------ border pieces
class BeaverDam(WR.Creek):
    """The beaver dam: the creek held back by a dam of sticks and mud across it, a pond spreading behind (upstream,
    +x) with the lodge in it, gnawed stumps and a felled sapling on the bank. Takes the place of a creek edge
    piece."""
    key = 'creek'
    DAM = 3.4

    def ground(self, band, v, L):
        g0 = WR.Creek.ground(self, band, None, L)
        def g(x, z):
            h = g0(x, z)
            pond = env(np.clip((x - self.DAM) / (8.0 - self.DAM) * 0.5 + 0.5, 0, 1) * 8, 8) * 0 + \
                np.exp(-(((x - 5.8) / 2.6) ** 2) * 1.5) * (1 - smooth((np.abs(z - 5.6) - 2.2) / 1.0))
            h = np.minimum(h, h * (1 - pond) + (-0.8) * pond)
            dam = np.exp(-((x - self.DAM) / 0.35) ** 2) * (np.abs(z - 5.6) < 2.6)
            return np.maximum(h, -0.12 * dam + h * (1 - dam))
        return g

    def water_base(self, x, z):
        up = smooth((x - self.DAM) / 0.25) * (1 - smooth((x - 7.0) / 1.0))
        return -0.55 + 0.27 * up

    def things(self, sc, band, v, f):
        rnd = sc.r
        def dam():
            r = np.random.RandomState(4900)
            for k in range(40):
                z = r.uniform(3.2, 8.0); y = r.uniform(0.0, 0.45)
                a = r.uniform(-50, 50)
                Fr = Frame(yaw=a)
                Fr.rod((-0.5, 0, y), (0.5, 0, y + r.uniform(-0.1, 0.1)), 0.04, 'bark' if k % 4 else 'rock')
                if k % 3 == 0:
                    with WT.place(0, z, 0):
                        pass
            for k in range(14):
                E.sphere(r.uniform(-0.3, 0.3) * UX, r.uniform(3.4, 7.8) * UX - 5.6 * UX, r.uniform(0.5, 1.6), 0.9,
                         'earth', cast=False, sz=0.6)
        def dam_sticks():
            r = np.random.RandomState(4901)
            for k in range(46):
                z = r.uniform(-2.4, 2.4); y = r.uniform(0.0, 0.5)
                a = math.radians(r.uniform(-60, 60))
                L = r.uniform(0.6, 1.3)
                Frame().rod((-math.cos(a) * L / 2, z - math.sin(a) * L / 2, y),
                            (math.cos(a) * L / 2, z + math.sin(a) * L / 2, y + r.uniform(-0.15, 0.15)), 0.045,
                            'bark' if k % 4 else 'rock')
            for k in range(12):
                E.sphere(r.uniform(-0.3, 0.3) * UX, r.uniform(-2.2, 2.2) * UX, r.uniform(0.4, 1.4), 1.0, 'earth',
                         cast=False, sz=0.6)
        sc.add(dam_sticks, self.DAM, 5.6, 0.1, dy=-0.25 + 0.04, force=True)
        def lodge():
            r = np.random.RandomState(4902)
            for k in range(40):
                a = r.uniform(0, 2 * math.pi); d = r.uniform(0.0, 1.1); y = (1.1 - d) * 0.75 + r.uniform(-0.1, 0.1)
                b = r.uniform(0, math.pi)
                Frame().rod((math.cos(a) * d - math.cos(b) * 0.4, math.sin(a) * d * 0.8 - math.sin(b) * 0.4, y),
                            (math.cos(a) * d + math.cos(b) * 0.4, math.sin(a) * d * 0.8 + math.sin(b) * 0.4, y + 0.1),
                            0.05, 'bark' if k % 3 else 'rock')
            E.sphere(0, 0, 1.6, 3.6, 'earth', cast=True, sz=0.5)
        sc.add(lodge, 6.0, 7.0, 0.1, dy=-0.25, force=True)
        def gnawed(s):
            def d():
                r = np.random.RandomState(4910 + s)
                CYV(0, 0, 0, 0.45, 0.22, 'bark')
                for k in range(4):
                    E.box(-0.5 + k * 0.25, -0.5, 0.45 * UY, -0.25 + k * 0.25, 0.5, 0.45 * UY + (4 - k) * 0.5, 'wood', cast=False)
                for k in range(5):
                    E.box(r.uniform(-4, 4), r.uniform(-3, 3), 0, r.uniform(-4, 4) + 0.6, r.uniform(-3, 3) + 0.4, 0.3, 'wood',
                          cast=False)
            return d
        for k, (x, z) in enumerate(((5.0, 2.0), (6.6, 2.4), (2.0, 1.6))):
            sc.add(gnawed(k), x, z, 0.1, force=True)
        sc.add(lambda: P.deadfall(2.6, 20, 0.12, seed=4920, grey=False, roots=False, moss=False), 5.6, 1.4, 0.1, force=True)
        sc.many(6, WR.mk_rushes(10, 0.5, 0.9), 2.0, 9.6, 0.4,
                test=lambda x, z: abs(at(f.ground, x, z) - self.water_base(x, z)) < 0.2)
        sc.many(3, WR.mk_tuft('grass', 0.6), 0.6, 2.2, 0.3)


class FerryLanding(WR.River):
    """The old ferry landing: the bank cut down to a plank ramp to the water, the ferry's scow tied up, a cable post
    with its cable running out over the river, a ferryman's fallen lean-to. Takes the place of a river edge piece."""
    key = 'river'
    flow = 1.0

    def ground(self, band, v, L):
        g0 = WR.River.ground(self, band, None, L)
        def g(x, z):
            h = g0(x, z)
            ramp = (np.abs(x - 4.0) < 1.3) & (z > 0.8) & (z < 6.2)
            rh = -1.15 * smooth((z - 1.2) / 4.2)
            k = smooth((1.5 - np.abs(x - 4.0)) / 0.35)
            return np.where(ramp | (k > 0), h * (1 - k) + np.minimum(h, rh) * k, h)
        return g

    def mat(self, x, z, y, info):
        rr, ii = WR.River.mat(self, x, z, y, info)
        planks = (np.abs(x - 4.0) < 1.1) & (z > 1.3) & (z < 5.6) & ~info['face']
        pl = np.mod(z, 0.5) < 0.07
        rr = np.where(planks, R('wood'), rr)
        ii = np.where(planks, np.where(pl, 3, np.where(cellnoise(x, z, 0.25, 170) < 0.2, 1, 2)), ii)
        return rr, ii

    def things(self, sc, band, v, f):
        self.foam = []
        def scow():
            F = Frame()
            F.box(-1.8, -1.1, 0.0, 1.8, 1.1, 0.12, 'wood')
            for c in (-1.1, 1.1):
                F.box(-1.8, c - 0.06, 0.0, 1.8, c + 0.06, 0.4, 'wood')
            for a in (-1.8, 1.8):
                F.box(a - 0.06, -1.1, 0.0, a + 0.06, 1.1, 0.32, 'wood')
            for a in (-1.4, 1.4):
                F.rod((a, -1.1, 0.4), (a, -1.1, 1.0), 0.04, 'wood'); F.rod((a, 1.1, 0.4), (a, 1.1, 1.0), 0.04, 'wood')
            F.rod((-1.4, -1.1, 1.0), (1.4, -1.1, 1.0), 0.035, 'wood'); F.rod((-1.4, 1.1, 1.0), (1.4, 1.1, 1.0), 0.035, 'wood')
            F.box(-0.5, -0.3, 0.12, 0.3, 0.3, 0.4, 'umber')        # a crate left aboard
        sc.add(scow, 4.0, 7.4, 0.1, dy=self.WL - at(f.ground, 4.0, 7.4) + 0.05, force=True)
        def post():
            B(-0.12, -0.12, 0.0, 0.12, 0.12, 2.0, 'bark')
            B(-0.2, -0.04, 1.6, 0.2, 0.04, 1.75, 'bark')
            Frame(yaw=-90).rod((0.0, 0.0, 1.7), (8.6, 0.0, -1.0 + 0.95), 0.025, 'iron')
        sc.add(post, 1.6, 2.2, 0.1, force=True)
        def leanto():
            F = Frame(yaw=10)
            for a in (-0.9, 0.9):
                F.rod((a, -0.6, 0.0), (a, -0.6, 1.1), 0.05, 'rock')
            for k in range(6):
                a = -0.9 + k * 0.36
                F.rod((a, -0.6, 1.1), (a + 0.1, 0.7, 0.05), 0.06, 'rock' if k % 2 else 'bark')
        sc.add(leanto, 6.6, 1.2, 0.1, force=True)
        sc.many(3, WR.mk_tuft('grass', 0.6), 0.5, 2.4, 0.3, test=lambda x, z: abs(x - 4) > 1.6)
        sc.many(2, WR.mk_scrub(0.8), 0.6, 2.4, 0.8, test=lambda x, z: abs(x - 4) > 2.0)
        sc.many(3, WR.mk_rushes(8, 0.5, 0.8, False), 3.0, 9.6, 0.4,
                test=lambda x, z: abs(at(f.ground, x, z) - self.WL) < 0.25 and abs(x - 4) > 1.6)


class Shelf(WR.Canyon):
    """The canyon shelf: the rim comes right up to the line, the track hugging the wall on a narrow shelf; the
    builders' dry-stone parapet along the edge. Pieces 'in' (the rim moves in along +x), 1 and 2 (the shelf), 'out'.
    These edge pieces reach north to local z -6 (3u from the line's centre when local z 0 is at 9)."""
    key = 'canyon'
    SHIFT = 6.0

    def __init__(self, kind):
        WR.Canyon.__init__(self)
        self.kind = kind
        self.zrange = {'edge': (-6.0, 10.0)}

    def shift(self, x):
        x = np.asarray(x, float)
        return self.SHIFT * {'in': smooth((x - 0.5) / 7.0), 'out': 1 - smooth((x - 0.5) / 7.0),
                             '1': 1.0 + 0 * x, '2': 1.0 + 0 * x}[self.kind]

    def ground(self, band, v, L):
        g0 = WR.Canyon.ground(self, band, v, L)
        def g(x, z):
            s = self.shift(x) * (1 - smooth(np.asarray(z) / 10.0))
            return g0(x, np.asarray(z) + s)
        return g

    def things(self, sc, band, v, f):
        sc.z0 = -6.0
        g = f.ground
        # the parapet follows the rim
        xs = np.arange(0.9, 7.2, 1.6)
        for k, x in enumerate(xs):
            zr = 2.6 - float(self.shift(x)) * (1 - 0.0)
            sc.add(lambda s=k: P.drystone_wall(1.5, s + 50, 0.45), x + 0.75, zr, 0.1, force=True)
        ledge = lambda x, z: abs(at(g, x, z) - at(g, x, z + 0.4)) < 0.3 and at(g, x, z) < -3
        sc.many(4, lambda r: (lambda s=r.randint(999), q=r.uniform(0.7, 0.9): P.sapling(s, q)), -2.0, 9.6, 0.6, test=ledge)
        sc.many(3, lambda r: (lambda: N.juniper(1)), -2.0, 9.6, 0.8, test=ledge)


class Mill(WR.Valley):
    """The grist mill on the mill stream: a stone-footed mill house south of the race, its undershot wheel turning
    in the current (4 frames: the wheel and the water), a sluice board. Takes the place of a valley edge piece."""
    key = 'valley'
    anim_frames = 4
    WHEEL = (4.0, 5.55, 0.62, 1.15)          # x, z, centre height, radius (u)

    def things(self, sc, band, v, f):
        WR.Valley.things(self, sc, band, 0, f)
        sc.items = [it for it in sc.items if not (2.0 < it[1] < 6.4 and it[2] > 5.4)]
        def house():
            # stone footing, board walls, a shingled roof, a door and a window to the viewer
            B(-1.9, -1.2, 0.0, 1.9, 1.2, 0.9, 'rock', tex=lambda f_, x, z, y, i: (None, np.where(hash2(np.floor(x * 4).astype(int) + np.floor(y * 4).astype(int), np.floor(z * 4).astype(int)) % 4 == 0, clampi(i + 1), i)))
            B(-1.8, -1.1, 0.9, 1.8, 1.1, 2.3, 'wood', tex=lambda f_, x, z, y, i: (None, np.where(np.mod(x + z, 0.4) < 0.06, clampi(i + 1), i)))
            E.gable_x(-2.05 * UX, 2.05 * UX, 0.0, 1.35 * UX, 2.3 * UY, 3.4 * UY, 'roof', wall='wood', shades=(1, 2))
            B(-0.4, 1.1, 0.9, 0.3, 1.16, 1.95, 'umber', shades=(2, 2, 3))
            B(0.8, 1.1, 1.4, 1.3, 1.16, 1.85, 'glass', shades=(2, 3, 3))
            B(-1.2, 1.1, 1.4, -0.7, 1.16, 1.85, 'glass', shades=(2, 3, 3))
        sc.add(house, 4.0, 8.0, 0.1, force=True)

    def anim_draw(self, f, fld):
        x, z, yc, r = self.WHEEL
        with WT.place(x, z, yc):
            ph = f * (math.pi / 8) / 1.0
            F = Frame()
            for side in (-0.28, 0.28):
                n = 16
                for k in range(n):
                    a0 = ph + 2 * math.pi * k / n; a1 = ph + 2 * math.pi * (k + 1) / n
                    F.rod((math.cos(a0) * r, side, math.sin(a0) * r), (math.cos(a1) * r, side, math.sin(a1) * r), 0.05, 'wood')
                for k in range(4):
                    a = ph + math.pi * k / 4
                    F.rod((-math.cos(a) * r, side, -math.sin(a) * r), (math.cos(a) * r, side, math.sin(a) * r), 0.04, 'wood')
            for k in range(12):          # the paddles across the two rims
                a = ph + 2 * math.pi * k / 12
                ca, sa = math.cos(a), math.sin(a)
                F.rod((ca * r, -0.3, sa * r), (ca * r, 0.3, sa * r), 0.07, 'wood')
                F.rod((ca * (r + 0.18), -0.3, sa * (r + 0.18)), (ca * (r + 0.18), 0.3, sa * (r + 0.18)), 0.05, 'wood')
            ocyl((0, 0, 0), (0, 1, 0), 0.09, 0.5, 'iron', cast=False)


# ------------------------------------------------------------------------------------------------ registration
def _piece(reg, key, R, note, v=0):
    fr, ov, meta = WP.piece(R, 'edge', v)
    extra = dict(len=meta['L'], z0=meta['z0'], z1=meta['z1'], band='edge')
    reg.add(key, 'wild_marks', [fr[0]], dict(anchor='as a wild/near edge piece: its -x end on local z 0',
                                             note=note, extra=extra))
    if ov:
        reg.add(key + ('/anim' if getattr(R, 'anim_frames', 0) else '/water'), 'wild_marks', ov,
                dict(anchor='as ' + key, note='the changing pixels of each frame, drawn over the piece'))


def register(reg, only=None):
    g = 'wild_marks'
    want = lambda *keys: (only is None) or any(k in only for k in keys) or 'marks' in only
    big = (-40, -60, 90, 40)
    if want('prairie'):
        reg.add('wild/mark/cottonwood', g, one(lone_cottonwood, shadow=big, canvas=(480, 480), origin=(240, 380)),
                dict(anchor=FOOT, note='the lone cottonwood of the home prairie, 13u: on the near side stand it 14u or '
                     'more beyond the corridor\'s edge (it is drawn below the corridor), or on the far side'))
        reg.add('wild/mark/wagon_wreck', g, one(wagon_wreck, shadow=(-16, -12, 22, 12)),
                dict(anchor='the bed\'s centre at ground level', note='an emigrant wagon left on the prairie, 4u'))
        reg.add('wild/mark/grave', g, one(grave, shadow=(-8, -10, 10, 8)),
                dict(anchor=FOOT, note='an emigrant\'s lone grave by the old trail: stones and a cross'))
    if want('woods'):
        reg.add('wild/mark/giant_pine', g, one(giant_pine, shadow=big, canvas=(420, 480), origin=(210, 400)),
                dict(anchor=FOOT, note='the giant old ponderosa, 11u, a lightning scar: far side, or 12u or more down '
                     'the near side'))
        reg.add('wild/mark/trapper_cabin', g, one(trapper_cabin, shadow=(-16, -12, 20, 14)),
                dict(anchor='the footprint\'s centre at ground level (4.6 x 3.6u)', note='the trapper\'s ruined cabin',
                     extra=dict(box=[-2.4, -1.9, 2.4, 1.9, 1.4])))
        reg.add('wild/mark/far_cabin', g, one(far_cabin, shadow=(-14, -10, 18, 12)),
                dict(anchor='the footprint\'s centre at ground level (4 x 3u)', note='a settler\'s cabin seen across the '
                     'clearing; draw wild/life/smoke at extra.chimney', extra=dict(chimney=[-2.2, -0.05, 3.4])))
    if want('rocks'):
        reg.add('wild/mark/balanced_rock', g, one(balanced_rock, shadow=(-14, -14, 26, 10)),
                dict(anchor=FOOT, note='the balanced rock, 5.5u: far side, or 8u or more down the near side'))
        for side in ('n', 's'):
            for kind, nm in (('full', ''), ('up', '_up'), ('down', '_down')):
                z0, z1 = (-7.0, -3.0) if side == 'n' else (3.0, 6.0)
                reg.add(f'wild/mark/rockcut_{side}{nm}', g, rockcut(side, kind),
                        dict(anchor='the piece\'s middle on the line (x of its centre, z 0) at ground level; pieces '
                             'every 8u along x, as line/cut_bank', note=f'the blasted rock cut through the spur, its '
                             f'{side} face' + (' (tall, drill holes, the face to the viewer)' if side == 'n' else
                                               ' (low: the spur falls away south)') +
                             ('' if not nm else f'; the end where the spur {kind}s along +x'),
                             extra=dict(box=[-4, z0, 4, z1, CUT_H if side == 'n' else 1.1])))
    if want('river'):
        fr, ov = Waterfall().render(3)
        reg.add('wild/mark/waterfall', g, [fr[0]],
                dict(anchor='the pool\'s middle at ground level (the face is 7u high, 1.7u behind it)',
                     note='a stream over a 7u rock face into a pool: against the river run\'s wooded bluff (far side) '
                          'or on the river\'s far bank'))
        reg.add('wild/mark/waterfall/water', g, ov, dict(anchor='as wild/mark/waterfall',
                                                         note='3 frames of the falling and churning water'))
        _piece(reg, 'wild/mark/ferry_landing', FerryLanding(), 'the old ferry landing: takes the place of a river '
               'edge piece and joins the others')
    if want('creek'):
        _piece(reg, 'wild/mark/beaver_dam', BeaverDam(), 'the beaver dam and its pond: takes the place of a creek '
               'edge piece and joins the others')
    if want('canyon'):
        reg.add('wild/mark/arch', g, one(natural_arch, shadow=(-30, -16, 40, 12), canvas=(420, 420), origin=(210, 320)),
                dict(anchor=FOOT, note='the natural arch, 10u long, 6.5u high: on the canyon\'s far terraces (the far '
                     'band, local z 40 or more) or the far side'))
        for kind in ('in', '1', '2', 'out'):
            _piece(reg, f'wild/mark/canyon_shelf/{kind}', Shelf(kind),
                   'the canyon shelf: the rim right by the line (to local z -3), a dry-stone parapet; '
                   + {'in': 'the rim moves in along +x', 'out': 'the rim moves back out along +x',
                      '1': 'the shelf', '2': 'the shelf'}[kind] + '; joins canyon edge pieces at both ends')
    if want('pass'):
        reg.add('wild/mark/summit_board', g, one(summit_board_draw, shadow=(-14, -6, 20, 8), after=summit_board_text),
                dict(anchor='the middle between the two posts, at ground level; the face to +z',
                     note='the summit board, SUMMIT 8247 FT, with a cairn: on the far side of the corridor (z -5) so '
                          'it reads', extra=dict(box=[-2.0, -0.2, 3.4, 1.5, 3.45])))
    if want('valley'):
        reg.add('wild/mark/water_tower', g, one(water_tower, after=hazy()),
                dict(anchor=FOOT, note='the far town\'s water tower seen in the distance, in the haze\'s blue-grey: '
                     'bake into the far valley\'s far band (local z 46 or more) or beyond'))
        reg.add('wild/mark/far_town', g, one(far_town, after=hazy(), canvas=(480, 360), origin=(240, 260)),
                dict(anchor='the middle of the row at ground level', note='the far town\'s roofs, a church and the '
                     'water tower, seen across the valley, in the haze: beyond the far band (local z 52 or more)'))
        _piece(reg, 'wild/mark/mill', Mill(), 'the grist mill on the mill stream: takes the place of a valley edge '
               'piece; its wheel turns (4 frames in /anim)')
