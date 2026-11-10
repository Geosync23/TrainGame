# Track pieces: straight track, crossovers in both states, buffer stops and switch stands.
# Owned by the pipeline, trains and track helper.
# Sizes in mockup units (MU): 4 MU = 1 game unit along x/z; 16/3 MU = 1 game unit up (engine.py).
import math
import numpy as np
import engine as E
from engine import R, box, cyl_z, sphere, disc_y, disc_x, gable_x, gable_y, hash2, band_curve, oriented_rect, new_oid
import shapes as S
from shapes import RAIL, PZ, tex_ballast, tex_tie, tex_shingle, tex_batten


U = 4.0            # MU per game unit (x and z)
BALLAST = 7.0      # ballast half width (1.75 u)
TIE = 5.0          # tie half length
GAUGE = 3.0        # rail offset from the centre line (0.75 u)
TIE_STEP = 4.0     # one tie per game unit
TIE_W = 2.0



# ============================ track ============================
def _ballast_x(x0, x1, yc):
    box(x0, yc - BALLAST, 0, x1, yc + BALLAST, 0.7, 'dirt', shades=(1, 2, 3), tex=tex_ballast, cast=False, faces='tl')


def _ties_x(x0, x1, yc, y0=None, y1=None):
    x = math.floor(x0 / TIE_STEP) * TIE_STEP + (TIE_STEP - TIE_W) / 2
    while x < x1:
        box(x, (yc - TIE) if y0 is None else y0, 0.7, x + TIE_W, (yc + TIE) if y1 is None else y1, 1.4, 'wood',
            tex=tex_tie, cast=False, faces='tl')
        x += TIE_STEP


def _rail_x(x0, x1, yr, oid):
    box(x0, yr - 0.5, 1.4, x1, yr + 0.5, RAIL, 'iron', shades=(0, 3, 3), oid=oid, cast=False, faces='tl')


def track_straight(length=U):
    """Straight track along +x from x = 0 to length, centre line at z = 0."""
    E.CLIP[0] = (0, length)
    _ballast_x(-1, length + 1, 0)
    _ties_x(0, length, 0)
    o = new_oid(False)
    for yr in (-GAUGE, GAUGE):
        _rail_x(-1, length + 1, yr, o)
    E.CLIP[0] = None


def _sstep(x, xa, xb, ya, yb):
    s = np.clip((x - xa) / (xb - xa), 0, 1)
    return ya + (yb - ya) * (3 * s * s - 2 * s ** 3)


def crossover(spacing, length, kind='a', state='normal'):
    """Two parallel tracks (z = 0 and z = spacing, in MU) joined by an S-curve over x = 0..length.
    kind 'a': the curve leaves the z = 0 track at x = 0 and joins the other at x = length;
    kind 'b': it leaves the z = spacing track at x = 0 and joins z = 0 at x = length.
    state 'normal': both switches set for the straight tracks; 'reverse': set for the crossover."""
    ya, yb = (0.0, spacing) if kind == 'a' else (spacing, 0.0)
    E.CLIP[0] = (0, length)
    xs = np.arange(-2, length + 2.01, 0.25)
    pts = np.stack([xs, _sstep(xs, 0, length, ya, yb)], 1)
    # ballast: both straights and the curve
    for yc in (0.0, spacing):
        _ballast_x(-1, length + 1, yc)
    band_curve(pts, BALLAST - 0.5, 0.7, 'dirt', 1)
    # ties: straights, then angled ties along the curve's middle
    for yc in (0.0, spacing):
        _ties_x(0, length, yc)
    tang = np.gradient(pts, axis=0); tang /= np.linalg.norm(tang, axis=1)[:, None]
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    s = 0.0
    while s < seg[-1]:
        k = min(np.searchsorted(seg, s), len(pts) - 1)
        off = abs(pts[k, 1] - ya) ; off2 = abs(pts[k, 1] - yb)
        if off > 4 and off2 > 4:
            def tt(a, b, ii):
                return np.where((np.abs(np.abs(b) - 3) < 0.45), 3, ii)
            oriented_rect(pts[k, 0], pts[k, 1], tang[k, 0], tang[k, 1], TIE_W / 2, TIE, 1.4, 'wood', 3, tex=tt)
        s += TIE_STEP
    o = new_oid(False)
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    # where the switch points are: near x = 0 (leaving) and near x = length (joining)
    PT = 7.0   # length of the movable blades
    def gap_mask(x):
        return (x > 0.5) & (x < PT) | (x > length - PT) & (x < length - 0.5)
    # straight rails; with the switches reversed, the rail the curve crosses towards is broken at the blades
    for yc in (0.0, spacing):
        for sgn in (-1, 1):
            yr = yc + sgn * GAUGE
            towards = (yb - ya) * sgn > 0 if yc == ya else (ya - yb) * sgn > 0
            if state == 'reverse' and towards:
                # the straight's blade is pulled over: draw it short, angled off, leaving a gap
                for (a, b) in ((-1, 0.6), (PT, length - PT), (length - 0.6, length + 1)):
                    _rail_x(a, b, yr, o)
            else:
                _rail_x(-1, length + 1, yr, o)
    # curve rails; with the switches normal, the curve's blades stand open (a gap at each end)
    for sgn in (-1, 1):
        rp = pts + sgn * GAUGE * nrm
        keep = np.ones(len(rp), bool)
        if state == 'normal':
            keep = ~gap_mask(pts[:, 0])
        # do not redraw where the curve rail lies on a straight rail (keeps the straight crisp)
        for yc in (0.0, spacing):
            for g in (-GAUGE, GAUGE):
                keep &= np.abs(rp[:, 1] - (yc + g)) > 0.6
        if keep.sum() < 2: continue
        # split into runs
        idx = np.nonzero(keep)[0]
        runs = np.split(idx, np.nonzero(np.diff(idx) > 1)[0] + 1)
        for run in runs:
            if len(run) < 2: continue
            band_curve(rp[run], 0.55, 1.75, 'iron', 3)
            band_curve(rp[run], 0.5, RAIL, 'iron', 0, oid=o)
    E.CLIP[0] = None


def buffer_stop(facing='e'):
    """A timber buffer stop at the end of a track. facing 'e': it stops trains running towards +x
    (the beam faces -x and the track ends just past it)."""
    o = new_oid(True)
    sgn = 1 if facing == 'e' else -1
    E.CLIP[0] = (-4, 0) if facing == 'e' else (0, 4)
    _ballast_x(-5, 5, 0); _ties_x(-5, 5, 0)
    ro = new_oid(False)
    for yr in (-GAUGE, GAUGE): _rail_x(-5, 5, yr, ro)
    E.CLIP[0] = None
    xb = -1.0 if facing == 'e' else 1.0   # beam's back face position
    if facing == 'e':
        box(-1.0, -4.2, 1, 1.0, 4.2, 6.2, 'wood', shades=(1, 2, 3), oid=o)
        box(-2.1, -4.0, 4.4, -0.7, 4.0, 5.8, 'red', shades=(1, 2, 3), oid=o)
        box(-4.0, -3.5, 1, -1.0, -2.5, 2.6, 'wood', shades=(1, 2, 3), oid=o)
        box(-4.0, 2.5, 1, -1.0, 3.5, 2.6, 'wood', shades=(1, 2, 3), oid=o)
    else:
        box(-1.0, -4.2, 1, 1.0, 4.2, 6.2, 'wood', shades=(1, 2, 3), oid=o)
        box(0.7, -4.0, 4.4, 2.1, 4.0, 5.8, 'red', shades=(1, 2, 3), oid=o)
        box(1.0, -3.5, 1, 4.0, -2.5, 2.6, 'wood', shades=(1, 2, 3), oid=o)
        box(1.0, 2.5, 1, 4.0, 3.5, 2.6, 'wood', shades=(1, 2, 3), oid=o)


def switch_stand(state='normal'):
    """Switch stand at its base. 'normal' (set for the straight): white target face-on, lever to -x.
    'reverse' (set for the crossover): red target, lever to +x."""
    o = new_oid(True)
    box(-1.2, -1.2, 0.5, 1.2, 1.2, 1.6, 'wood', shades=(1, 2, 3), oid=o)
    box(-0.4, -0.4, 1.6, 0.4, 0.4, 7.4, 'iron', shades=(1, 2, 3), oid=o)
    if state == 'normal':
        disc_y(0, 7.8, 2.3, 0.5, 'cream', kind='flat', oid=o)
        disc_y(0, 7.8, 1.0, 0.55, 'green', kind='flat', oid=o)
        box(-2.8, -0.3, 1.6, 0.3, 0.3, 2.2, 'iron', shades=(0, 2, 3), oid=o)
        box(-3.1, -0.4, 2.2, -2.5, 0.4, 3.4, 'iron', shades=(0, 2, 3), oid=o)
    else:
        disc_y(0, 7.8, 2.3, 0.5, 'red', kind='flat', oid=o)
        disc_y(0, 7.8, 1.0, 0.55, 'cream', kind='flat', oid=o)
        box(-0.3, -0.3, 1.6, 2.8, 0.3, 2.2, 'iron', shades=(0, 2, 3), oid=o)
        box(2.5, -0.4, 2.2, 3.1, 0.4, 3.4, 'iron', shades=(0, 2, 3), oid=o)
    box(-0.7, -0.7, 9.6, 0.7, 0.7, 11.0, 'ochre', shades=(0, 1, 2), oid=o)
    box(-0.9, -0.9, 11.0, 0.9, 0.9, 11.5, 'iron', shades=(1, 2, 3), oid=o)
