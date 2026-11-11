# Night (lamplit) versions of the D27 buildings (A3's follow-up). A lit sprite is its day sprite rendered again with
# the same drawing, then only its lit pixels recoloured, so the size, the anchor and every other pixel stay the same:
#   - window glass ('glass' ramp, as painted, before shadows; never an outline pixel) glows like the station's and
#     the coach's lit windows: the body of a pane brass 0, its upper band brass 1;
#   - lamp glass ('lamp' ramp, added here: door lamps and lanterns, which read as dark glass by day) burns brass 0,
#     and lights a small warm halo on the wall round it (one step lighter, wood turned ochre).
# The 'lamp' ramp is appended to the engine palette at import (as pal27 does), so no existing index moves.
import numpy as np
import engine as E
import harness as H
import pal27  # noqa: F401  (its ramps first, so the order of RNAMES stays stable)

LAMP_RAMP = ['#a8d8e2', '#6474a6', '#3b4878', '#262c4c']     # the glass ramp's colours: an unlit lamp is glass


def install():
    if 'lamp' in E.RAMPS:
        return
    keys = []
    for i, c in enumerate(LAMP_RAMP):
        k = f'lamp{i}'
        E.HEX[k] = c
        keys.append(k)
    E.RAMPS['lamp'] = keys
    E.RNAMES.append('lamp')
    E.RID['lamp'] = len(E.RNAMES) - 1
    ml = max(len(v) for v in E.RAMPS.values())
    pal = np.zeros((len(E.RNAMES), ml, 3), np.uint8)
    for n, lst in E.RAMPS.items():
        for i in range(ml):
            pal[E.RID[n], i] = E.hx(E.HEX[lst[min(i, len(lst) - 1)]])
    E.PAL = pal
    E.RLEN = np.array([len(E.RAMPS[n]) for n in E.RNAMES])
    E.ML = ml


install()

# warm a halo pixel: these ramps turn to ochre (wood tones); the rest only get one step lighter
WARM = {'wood', 'umber', 'straw', 'cream', 'dirt', 'dark'}


def _edges():
    """The outline pixels engine.outlines() is about to darken (the same test)."""
    o, d = E.OB, E.DB
    edge = np.zeros(o.shape, bool)
    for oid in E.OUTLINE:
        m = o == oid
        if not m.any():
            continue
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            on = np.roll(np.roll(o, dy, 0), dx, 1)
            dn = np.roll(np.roll(d, dy, 0), dx, 1)
            edge |= m & (on != oid) & (dn < d - 3.0)
    return edge


def _dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r + 1 and (dx or dy):
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def render_pair(draw, after=None, outline=True, shadows=True, canvas=H.CANVAS, origin=H.ORIGIN, halo=2,
                keep=None, fire_halo=False, **_):
    """Render once and return (day, lit) frames: the same pixels, but the lit one with glowing glass and lamps.
    keep(QX, QY, QZ) -> mask limits which glass pixels light up (default: all)."""
    E.begin(canvas[0], canvas[1], origin[0], origin[1])
    draw()
    rb0, ib0 = E.RB.copy(), E.IB.copy()
    if shadows:
        E.cast_shadows()
    edge = _edges() if outline else np.zeros(E.RB.shape, bool)
    if outline:
        E.outlines()
    if after is not None:
        after()
    day = E.render_rgba()
    rb, ib = E.RB.copy(), E.IB.copy()
    # only pixels still showing their painted glass (not covered by letters drawn after) and not outline
    same = (rb == rb0) & ~edge
    glass = same & (rb == E.R('glass'))
    if keep is not None:
        glass &= keep(E.QX, E.QY, E.QZ)
    lamp = same & (rb == E.R('lamp'))
    nb, ni = rb.copy(), ib.copy()
    nb[glass] = E.R('brass')
    ni[glass] = np.where(ib0[glass] == 2, 1, 0)
    nb[lamp] = E.R('brass')
    ni[lamp] = 0
    src = lamp | (same & (rb == E.R('fire'))) if fire_halo else lamp
    if halo and src.any():
        near = _dilate(src, halo) & (rb != E.R('fire')) & ~lamp & ~glass & ~edge & (rb >= 0) & (rb != E.R('gnd'))
        ys, xs = np.nonzero(near)
        for y, x in zip(ys, xs):
            name = E.RNAMES[rb[y, x]]
            if name in WARM:
                nb[y, x] = E.R('ochre')
                ni[y, x] = max(0, min(ib[y, x] - 1, 3))
            elif name not in ('brass', 'fire', 'lamp', 'glass'):
                ni[y, x] = max(0, ib[y, x] - 1)
    lit = day.copy()
    ch = (nb != rb) | (ni != ib)
    lit[..., :3][ch] = E.PAL[nb[ch], np.minimum(ni[ch], E.ML - 1)]
    a = day[..., 3] > 0
    ys, xs = np.nonzero(a)
    r0, c0 = ys.min(), xs.min()
    an = (origin[0] - c0, origin[1] - r0)
    return ((day[r0:ys.max() + 1, c0:xs.max() + 1].copy(), an),
            (lit[r0:ys.max() + 1, c0:xs.max() + 1].copy(), an))
