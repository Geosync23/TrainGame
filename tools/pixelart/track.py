# Track: ballast, ties and rails along the layout's track edges (proto-layout.json), switch points in either
# state, and switch stands. Owned by the pipeline, trains and track helper.
# Sizes follow the contract (plans/proto-sprites.md, section 5): rails 0.6 u either side of the centre line,
# ties 2.4 u long, ballast about 2.5 u wide, rail top 0.34 u. In MU (4 per unit across, 16/3 per unit up).
import math
import numpy as np
import engine as E
from engine import R, box, cyl_z, disc_y, hash2, band_curve, oriented_rect, new_oid
from shapes import tex_ballast, PZ

U = 4.0                    # MU per game unit (x and z)
GAUGE = 0.608 * U          # rail offset from the centre line
TIE = 1.2 * U              # tie half length
BALLAST = 1.25 * U         # ballast half width
TIE_STEP = 3.0             # a tie every 0.75 u, as in the mockup
TIE_W = 1.5
RAIL = 0.34 * E.U_Y        # rail top (1.81 MU)
TIE_TOP = 1.15
BALLAST_TOP = 0.6
BLADE = 2.5 * U            # length of the moving switch blades


def tex_tie(face, X, Y, Z, idx):
    h = hash2(np.floor(X * 1.7 + Y * 0.3).astype(int), 3) % 5
    rr = np.full(X.shape, R('wood'))
    ii = np.where(h == 0, 2, 3)
    return rr, np.where(h == 4, 2, ii)


def edge_mu(e):
    """Edge points in MU: array (n, 2) of (X, Y) and the tangent and normal at each point."""
    p = np.asarray(e['pts'], float)
    xy = p[:, :2] * U
    yaw = p[:, 2]
    tang = np.stack([np.cos(yaw), -np.sin(yaw)], 1)
    nrm = np.stack([np.sin(yaw), np.cos(yaw)], 1)
    # an edge listed from its far end runs backwards: make the tangent follow the point order
    if len(xy) > 1:
        d = xy[min(1, len(xy) - 1)] - xy[0]
        if np.dot(d, tang[0]) < 0:
            tang = -tang; nrm = -nrm
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(xy, axis=0), axis=1))]
    return xy, tang, nrm, s


def _is_straight_x(xy):
    return np.allclose(xy[:, 1], xy[0, 1], atol=1e-3)


def draw_edges(edges, skip=None, offset=(0.0, 0.0), layer='all'):
    """Draw track for the edges. skip: {edge id: [(side, s0, s1)]} rail pieces left out (side -1/+1 of the normal,
    s along the edge in MU). offset: subtracted from positions (MU), to draw around a switch node.
    layer: 'bed' (ballast and ties), 'rails' or 'all'."""
    skip = skip or {}
    ox, oy = offset
    if layer in ('bed', 'all'):
        for e in edges:
            xy, tang, nrm, s = edge_mu(e)
            xy = xy - (ox, oy)
            if _is_straight_x(xy):
                x0, x1 = sorted((xy[0, 0], xy[-1, 0]))
                yc = xy[0, 1]
                box(x0, yc - BALLAST, 0, x1, yc + BALLAST, BALLAST_TOP, 'dirt', shades=(1, 2, 3), tex=tex_ballast,
                    cast=False, faces='tl')
            else:
                k = max(1, int(round(2.0 / max(1e-6, s[1] if len(s) > 1 else 1))))
                band_curve(xy[::k] if len(xy[::k]) > 1 else xy, BALLAST, BALLAST_TOP, 'dirt', 1, tex=tex_ballast)
        for e in edges:
            xy, tang, nrm, s = edge_mu(e)
            xy = xy - (ox, oy)
            if _is_straight_x(xy):
                x0, x1 = sorted((xy[0, 0], xy[-1, 0]))
                yc = xy[0, 1]
                x = math.floor(x0 / TIE_STEP) * TIE_STEP + 0.6
                while x < x1:
                    box(x, yc - TIE, BALLAST_TOP, x + TIE_W, yc + TIE, TIE_TOP, 'wood', tex=tex_tie, cast=False, faces='tl')
                    x += TIE_STEP
            else:
                st = TIE_STEP / 2
                while st < s[-1]:
                    i = min(np.searchsorted(s, st), len(xy) - 1)
                    oriented_rect(xy[i, 0], xy[i, 1], tang[i, 0], tang[i, 1], TIE_W / 2, TIE, TIE_TOP, 'wood', 3,
                                  tex=lambda a, b, ii: np.where((np.abs(np.abs(b) - GAUGE) < 0.45), 3, ii))
                    st += TIE_STEP
    if layer in ('rails', 'all'):
        o = new_oid(False)
        for e in edges:
            xy, tang, nrm, s = edge_mu(e)
            xy = xy - (ox, oy)
            for side in (-1, 1):
                gaps = [(a, b) for (sd, a, b) in skip.get(e['id'], []) if sd == side]
                keep = np.ones(len(xy), bool)
                for a, b in gaps:
                    keep &= ~((s >= a) & (s <= b))
                rp = xy + side * GAUGE * nrm
                if _is_straight_x(xy) and not gaps:
                    x0, x1 = sorted((rp[0, 0], rp[-1, 0])); yr = rp[0, 1]
                    box(x0, yr - 0.5, TIE_TOP, x1, yr + 0.5, RAIL, 'iron', shades=(0, 3, 3), oid=o, cast=False, faces='tl')
                    continue
                idx = np.nonzero(keep)[0]
                if len(idx) < 2: continue
                runs = np.split(idx, np.nonzero(np.diff(idx) > 1)[0] + 1)
                for run in runs:
                    if len(run) < 2: continue
                    band_curve(rp[run], 0.55, RAIL - 0.45, 'iron', 3)
                    band_curve(rp[run], 0.5, RAIL, 'iron', 0, oid=o)


def switch_skips(layout, states):
    """Rail pieces left out for each switch's state ('N' straight, 'R' diverging): with N the diverging route's
    blades stand open (a gap at its start); with R the straight route's rail on that side is pulled over."""
    edges = {e['id']: e for e in layout['edges']}
    skip = {}
    for sw in layout['switches']:
        st = states.get(sw['id'], 'N')
        rev = edges[sw['reverse']]; nor = edges[sw['normal']]
        rxy, _, _, rs = edge_mu(rev)
        nxy, ntan, nnrm, ns = edge_mu(nor)
        i = min(np.searchsorted(rs, BLADE * 1.5), len(rxy) - 1)
        side = 1 if np.dot(rxy[i] - rxy[0], nnrm[0]) > 0 else -1
        if st == 'N':
            skip.setdefault(rev['id'], []).extend([(-1, 0.4, BLADE), (1, 0.4, BLADE)])
        else:
            skip.setdefault(nor['id'], []).append((side, 0.4, BLADE))
    return skip


def switch_stand(state='N'):
    """Switch stand at its base. N (set for the straight): white target with a green centre, lever to -x.
    R (set for the diverging route): red target with a white centre, lever to +x."""
    o = new_oid(True)
    box(-1.2, -1.2, 0.5, 1.2, 1.2, 1.6, 'wood', shades=(1, 2, 3), oid=o)
    box(-0.4, -0.4, 1.6, 0.4, 0.4, 7.4, 'iron', shades=(1, 2, 3), oid=o)
    zc = 8.2
    if state == 'N':
        disc_y(0, zc, 2.3, 0.5, 'cream', kind='flat', oid=o)
        disc_y(0, zc, 1.0, 0.55, 'green', kind='flat', oid=o)
        box(-2.8, -0.3, 1.6, 0.3, 0.3, 2.2, 'iron', shades=(0, 2, 3), oid=o)
        box(-3.1, -0.4, 2.2, -2.5, 0.4, 3.6, 'iron', shades=(0, 2, 3), oid=o)
    else:
        disc_y(0, zc, 2.3, 0.5, 'red', kind='flat', oid=o)
        disc_y(0, zc, 1.0, 0.55, 'cream', kind='flat', oid=o)
        box(-0.3, -0.3, 1.6, 2.8, 0.3, 2.2, 'iron', shades=(0, 2, 3), oid=o)
        box(2.5, -0.4, 2.2, 3.1, 0.4, 3.6, 'iron', shades=(0, 2, 3), oid=o)
    box(-0.7, -0.7, 10.6, 0.7, 0.7, 12.0, 'ochre', shades=(0, 1, 2), oid=o)
    box(-0.9, -0.9, 12.0, 0.9, 0.9, 12.5, 'iron', shades=(1, 2, 3), oid=o)


# Straight helpers kept for town.py's walkway (first build).
def _ballast_x(x0, x1, yc):
    box(x0, yc - BALLAST, 0, x1, yc + BALLAST, BALLAST_TOP, 'dirt', shades=(1, 2, 3), tex=tex_ballast, cast=False, faces='tl')


def _rail_x(x0, x1, yr, oid):
    box(x0, yr - 0.5, TIE_TOP, x1, yr + 0.5, RAIL, 'iron', shades=(0, 3, 3), oid=oid, cast=False, faces='tl')
