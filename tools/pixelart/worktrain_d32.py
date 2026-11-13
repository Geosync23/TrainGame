# D32 the work train's cars (plans/d32-tech.md 2 and 10.2), in the D27 rolling stock's style and size (stock27.py:
# the same trucks, truss rods, couplers, boards and roof): the crew car (an old boxcar fitted with windows, a stove
# and end platforms with steps), the gondola (a flatcar with side boards and drop ends), and the loads: broken rock
# in the gondola, rails and ties on the flatcar, at three fill levels each.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R, new_oid
from geom27 import B, CYV, clampi, ocyl
import stock27 as ST
from stock27 import truck, truss, coupler, FLOOR, BX, BZ, B_EAVES, B_TOP

CREW = 'brick'           # a faded red-oxide paint, as the old cars


def _crew_side(face, x, z, y, idx):
    rr = np.full(x.shape, R(CREW)); ii = idx.copy()
    if face in ('l', 'r'):
        c = x if face == 'l' else z
        ii = np.where(((c / 0.25) % 1.0) < 0.2, clampi(ii + 1), ii)
    if face == 'l':
        # three windows each side of the middle door, the door, posts, the sill and fascia
        win = np.zeros(x.shape, bool)
        for xc in (-3.6, -2.2, 2.2, 3.6):
            win |= (np.abs(x - xc) < 0.42) & (y > FLOOR + 1.3) & (y < FLOOR + 2.3)
        frame = np.zeros(x.shape, bool)
        for xc in (-3.6, -2.2, 2.2, 3.6):
            frame |= (np.abs(np.abs(x - xc) - 0.48) < 0.07) & (y > FLOOR + 1.2) & (y < FLOOR + 2.4)
            frame |= (np.abs(x - xc) < 0.5) & ((np.abs(y - FLOOR - 1.25) < 0.06) | (np.abs(y - FLOOR - 2.35) < 0.06))
        door = (np.abs(x) < 0.75) & (y > FLOOR) & (y < FLOOR + 3.0)
        dfr = door & ((np.abs(np.abs(x) - 0.7) < 0.07) | (np.abs(y - FLOOR - 2.95) < 0.07) | (np.abs(x) < 0.04))
        rr = np.where(win, R('glass'), rr); ii = np.where(win, np.where(y > FLOOR + 2.0, 1, 2), ii)
        rr = np.where(frame | dfr, R('wood'), rr); ii = np.where(frame | dfr, 3, ii)
        ii = np.where(door & ~dfr, clampi(idx + 1), ii)
        handle = (np.abs(x - 0.5) < 0.06) & (np.abs(y - FLOOR - 1.5) < 0.08)
        rr = np.where(handle, R('iron'), rr); ii = np.where(handle, 1, ii)
        ii = np.where(y < 1.5, 3, ii)
        ii = np.where(y > B_EAVES - 0.15, 3, ii)
        letters = (y > 4.35) & (y < 4.6) & (np.abs(x) > 1.4) & (np.abs(x) < 3.9) & (((x * 2.8) % 1.0) < 0.55)
        rr = np.where(letters, R('cream'), rr); ii = np.where(letters, 2, ii)
    if face == 'r':
        post = (np.abs(np.abs(z) - 1.95) < 0.07)
        ii = np.where(post, clampi(ii + 1), ii)
        door = (np.abs(z) < 0.5) & (y > FLOOR) & (y < FLOOR + 2.9)
        rr = np.where(door, R('wood'), rr); ii = np.where(door, 3, ii)
    return rr, ii


def _end_platform(sx, o):
    """A short platform at an end (sx = +-1) with a railing, steps down both sides and a brake wheel."""
    x0, x1 = sorted((sx * BX, sx * (BX + 0.75)))
    B(x0, -BZ + 0.15, 1.35, x1, BZ - 0.15, 1.6, 'wood', shades=(1, 2, 3), oid=o)
    xe = sx * (BX + 0.7)
    for z in (-1.7, -0.6, 0.6, 1.7):
        B(xe - 0.04, z - 0.04, 1.6, xe + 0.04, z + 0.04, 2.7, 'iron', shades=(1, 2, 3), oid=o)
    B(min(xe, sx * BX) - 0.03, -1.75, 2.62, max(xe, sx * BX) + 0.03, -1.69, 2.7, 'iron', shades=(1, 2, 3), oid=o)
    B(xe - 0.04, -1.75, 2.62, xe + 0.04, 1.75, 2.7, 'iron', shades=(1, 2, 3), oid=o)
    B(min(xe, sx * BX) - 0.03, 1.69, 2.62, max(xe, sx * BX) + 0.03, 1.75, 2.7, 'iron', shades=(1, 2, 3), oid=o)
    for zs in (-1, 1):
        for k, y in enumerate((1.15, 0.7)):
            B(x0 + 0.05, zs * (BZ - 0.1) - 0.25, y - 0.06, x1 - 0.05, zs * (BZ - 0.1) + 0.25, y, 'wood',
              shades=(1, 2, 3), oid=o)
    ocyl((xe, -1.2, 2.95), (0, 0, 1), 0.3, 0.025, 'iron', oid=o,
         tex=lambda p, s, a, r, i: (None, i, (r > 0.22) | (np.abs(np.sin(a * 2)) < 0.25)))
    B(xe - 0.03, -1.23, 1.6, xe + 0.03, -1.17, 2.95, 'iron', shades=(1, 2, 3), oid=o)


def crewcar():
    """The crew car: an old boxcar shortened between end platforms, windows, a door each side, a stovepipe."""
    o = new_oid(True)
    for xc in (-3.55, 3.55):
        truck(xc, 0.7, 0.5, oid=o)
    truss(-4.4, 4.4, 1.25, depth=0.4, oid=o)
    B(-BX - 0.75, -BZ + 0.1, 1.15, BX + 0.75, BZ - 0.1, 1.35, 'iron', shades=(2, 3, 3), oid=o)
    for sx in (-1, 1):
        coupler(sx * (BX + 0.75), sx, oid=o)
    B(-BX, -BZ, 1.35, BX, BZ, B_EAVES, CREW, oid=o, tex=_crew_side)
    B(-BX - 0.35, -BZ - 0.12, B_EAVES, BX + 0.35, BZ + 0.12, B_EAVES + 0.12, 'roof', shades=(1, 2, 3), oid=o)
    B(-BX - 0.3, -1.3, B_EAVES + 0.12, BX + 0.3, 1.3, B_EAVES + 0.22, 'roof', shades=(1, 2, 3), oid=o)
    B(-BX - 0.05, -0.32, B_EAVES + 0.22, BX + 0.05, 0.32, B_TOP, 'wood', shades=(1, 2, 3), oid=o)
    # the stovepipe with its cap
    CYV(-2.8, -0.9, B_EAVES + 0.2, B_EAVES + 1.3, 0.13, 'dark', oid=o)
    B(-2.98, -1.08, B_EAVES + 1.3, -2.62, -0.72, B_EAVES + 1.38, 'dark', shades=(1, 2, 2), oid=o)
    for sx in (-1, 1):
        _end_platform(sx, o)
    # a water keg and a tool box on the near platform
    CYV(BX + 0.35, 1.2, 1.6, 2.15, 0.22, 'wood', oid=o)
    return o


GON_SIDE = 1.15          # u: side boards above the deck


def gondola():
    """The gondola: a flatcar (stock27's) with board sides on stakes and drop ends; deck top 1.9u."""
    o = new_oid(True)
    for xc in (-3.55, 3.55):
        truck(xc, 0.7, 0.5, oid=o)
    truss(-4.4, 4.4, 1.25, depth=0.4, oid=o)
    B(-4.9, -1.9, 1.2, 4.9, 1.9, 1.65, 'iron', shades=(2, 3, 3), oid=o)
    def deck(face, x, z, y, idx):
        if face == 't':
            return None, np.where(((z + 2) / 0.33) % 1.0 < 0.12, 3, 2)
        return None, np.where(((x / 0.5) % 1.0) < 0.1, 3, idx)
    B(-4.95, -2.0, 1.65, 4.95, 2.0, 1.9, 'wood', oid=o, tex=deck)
    def boards(face, x, z, y, idx):
        ii = np.where(((y - 1.9) / 0.38) % 1.0 < 0.13, clampi(idx + 1), idx)
        if face == 'l':
            stake = np.abs(((x + 4.8) % 1.6) - 0.8) > 0.68
            ii = np.where(stake, 3, ii)
        return None, ii
    top = 1.9 + GON_SIDE
    B(-4.95, -2.0, 1.9, 4.95, -1.86, top, 'umber', oid=o, tex=boards)          # far side
    B(-4.95, -2.0, 1.9, -4.81, 2.0, top, 'umber', oid=o, tex=boards)           # -x end
    B(4.81, -2.0, 1.9, 4.95, 2.0, top - 0.3, 'umber', oid=o, tex=boards)       # +x end (a drop end, lower)
    B(-4.95, 1.86, 1.9, 4.95, 2.0, top, 'umber', oid=o, tex=boards)            # near side
    for x in np.linspace(-4.0, 4.0, 6):
        B(x - 0.07, 2.0, 1.55, x + 0.07, 2.08, top + 0.05, 'iron', shades=(1, 2, 3), oid=o)
    for sx in (-1, 1):
        coupler(sx * 4.95, sx, oid=o)
    return o


def gondola_rock(level):
    """Broken rock in the gondola: level 1 a low layer, 2 half, 3 heaped above the sides."""
    rnd = np.random.RandomState(70 + level)
    from geom27 import UX, UY
    top = (2.3, 2.75, 3.25)[level - 1]
    pts = []
    for k in range(int(70 + 50 * level)):
        x = rnd.uniform(-4.6, 4.6); z = rnd.uniform(-1.7, 1.7)
        crown = (top + 0.25 * level) * (1 - (z / 2.4) ** 2 * 0.4) - abs(x) * 0.03
        pts.append((rnd.uniform(1.95, max(2.0, crown)), x, z))
    for k, (y, x, z) in enumerate(sorted(pts)):
        ramp = 'rock' if (k * 7) % 5 else 'iron'
        E.sphere(x * UX, z * UX, y * UY, rnd.uniform(0.75, 1.05), ramp, th=(0.75, 0.3, -0.25), noise=0.5,
                 seed=1000 + k, sz=0.8, cast=False)


def flat_rails(level):
    """Rails stacked along the flatcar: 1 a few, 2 half, 3 full (24 pairs is more than a car shows)."""
    import line_d32 as L
    n = (4, 10, 16)[level - 1]
    for xb in (-3.5, 0.0, 3.5):
        B(xb - 0.15, -1.6, 1.9, xb + 0.15, 1.6, 2.05, 'wood', shades=(1, 2, 3))
    for k in range(n):
        layer, i = divmod(k, 8)
        L.rail(-4.85, 4.85, -1.4 + i * 0.4 + layer * 0.2, 2.05 + layer * 0.22, cast=False)


def flat_ties(level):
    """Ties stacked across the flatcar in cribbed layers: 1 one layer, 2 three, 3 five."""
    import line_d32 as L
    layers = (1, 3, 5)[level - 1]
    for Ly in range(layers):
        for k in range(12):
            L.tie(-4.4 + k * 0.8 + 0.2 * (Ly % 2), 0.0, 1.9 + Ly * 0.26, 'z', seed=Ly * 13 + k)


# ---------------------------------------------------------------- the crew car cut away (riders inside)
def crewcar_floor():
    """Cut-away base: running gear, floor, the far wall's inside with its windows, the west end wall, the stove."""
    o = new_oid(True)
    for xc in (-3.55, 3.55):
        truck(xc, 0.7, 0.5, oid=o)
    truss(-4.4, 4.4, 1.25, depth=0.4, oid=o)
    def ftex(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood'))
        if face == 't':
            return rr, np.where(((z + 2) / 0.3) % 1.0 < 0.12, 3, 2)
        return rr, np.full(x.shape, 3)
    B(-BX, -BZ, 1.35, BX, BZ, FLOOR, 'wood', oid=o, tex=ftex)
    for sx in (-1, 1):
        _end_platform(sx, o)
    wo = new_oid(True)
    def inner(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood')); ii = np.full(x.shape, 2 if face == 'l' else 3)
        if face == 'l':
            ii = np.where(((x / 0.25) % 1.0) < 0.15, 3, ii)
            win = np.zeros(x.shape, bool)
            for xc in (-3.6, -2.2, 2.2, 3.6):
                win |= (np.abs(x - xc) < 0.42) & (y > FLOOR + 1.3) & (y < FLOOR + 2.3)
            rr = np.where(win, R('glass'), rr); ii = np.where(win, 1, ii)
        if face == 't':
            ii = np.full(x.shape, 1)
        return rr, ii
    B(-BX, -BZ, FLOOR, BX, -BZ + 0.12, B_EAVES, 'wood', oid=wo, tex=inner)
    B(-BX, -BZ, FLOOR, -BX + 0.12, BZ, B_EAVES, 'wood', oid=wo, tex=inner)
    # the stove in the far corner
    CYV(-3.9, -1.4, FLOOR, FLOOR + 1.0, 0.28, 'dark')
    CYV(-3.9, -1.4, FLOOR + 1.0, B_EAVES, 0.09, 'dark')
    return o


def crewcar_sill():
    o = new_oid(True)
    B(-BX, BZ - 0.12, 1.35, BX, BZ, FLOOR + 0.5, CREW, oid=o, shades=(1, 2, 3))
    B(BX - 0.12, -BZ, 1.35, BX, BZ, FLOOR + 0.5, CREW, oid=o, shades=(1, 2, 3))
    return o


def crewcar_bench():
    """A plank bench along x (4u), drawn from the floor up; the men riding sit on it (0.5u above the floor)."""
    o = new_oid(True)
    B(-2.0, -0.25, 0.42, 2.0, 0.25, 0.5, 'wood', shades=(1, 2, 3), oid=o)
    for x in (-1.8, 0.0, 1.8):
        B(x - 0.06, -0.2, 0.0, x + 0.06, 0.2, 0.42, 'wood', shades=(1, 2, 3), oid=o)
    return o
