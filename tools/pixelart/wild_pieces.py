# D32 wild country (Artist 3): rendering a region's pieces (edge, mid, far bands and the blends between regions)
# from wild_regions' definitions, with the water's frames. Used by sprites_wild_near.py.
import math
import numpy as np
import engine as E
import wild_terrain as WT
import wild_regions as WR
from wild_regions import BANDS, Scatter, Blend

WATER_FRAMES = 3


def _extent(fld, L, z0, z1):
    xs, zs = np.meshgrid(np.linspace(0, L, 33), np.linspace(z0, z1, 97))
    h, _ = fld.surface(xs, zs)
    return float(h.max()), float(h.min())


def _things(R, band, v, fld, L, z0, z1):
    if isinstance(R, Blend):
        items = []
        rnd = np.random.RandomState(7000 + v)
        halves = (0.0, 8.0) if band == 'edge' else (0.0,)
        for which, reg in ((0, R.A), (1, R.B)):
            for hi, off in enumerate(halves):
                sub = Scatter(WR._seed(v, hi, which, len(band)), 8.0 if band == 'edge' else L,
                              z0 + (0.3 if band == 'edge' else 0.4), z1 - 0.4)
                reg.things(sub, band, 1 + hi + which, reg.field(band, None, 8.0 if band == 'edge' else L))
                reg.foam = []          # the foam rings belong to the region's own pieces, not to the blend
                for (fn, x, z, dy, rad) in sub.items:
                    X = x + off
                    w = float(R.w(X))
                    if (which == 0 and rnd.rand() < w) or (which == 1 and rnd.rand() > w):
                        continue
                    if X - rad < 0.6 or X + rad * 1.4 > L - 0.6:
                        continue
                    if any((X - a) ** 2 + (z - b) ** 2 < (rad + r2) ** 2 * 0.7 for (_, a, b, _, r2) in items) and rad > 0.2:
                        continue
                    items.append((fn, X, z, dy, rad))
        return items
    sc = Scatter(WR._seed(v, len(band), sum(map(ord, R.key)) % 97), L, z0 + (0.3 if band == 'edge' else 0.4), z1 - 0.4)
    R.things(sc, band, v, fld)
    return sc.items


def piece(R, band, v, frames=WATER_FRAMES, things=True):
    """Render one piece. Returns (frames, overlays, meta): frames as render() gives them (one, or one per water
    frame), overlays the water pixels of each frame (empty without water)."""
    z0, z1, L = BANDS[band]
    if isinstance(R, Blend):
        L = 16.0
    z0, z1 = getattr(R, 'zrange', {}).get(band, (z0, z1))
    nanim = getattr(R, 'anim_frames', 0)
    fld = R.field(band, v, L)
    keep = (lambda x, z: WR.edge_keep(x, z - z0)) if band == 'edge' else (WR.far_keep if band == 'far' else None)
    items = _things(R, band, v, fld, L, z0, z1) if things else []
    hmax, hmin = _extent(fld, L, z0, z1)
    xs, zs = np.meshgrid(np.linspace(0, L, 33), np.linspace(z0, z1, 97))
    wet = bool((fld.water(xs, zs) > fld.ground(xs, zs) + 0.02).any())
    tall = 12.5 if band != 'edge' else 4.0
    c0 = int(8 * (0 - z1)) - 70; c1 = int(8 * (L - z0)) + 70
    r0 = int(4 * (0 + z0) - 8 * (hmax + tall)) - 20; r1 = int(4 * (L + z1) - 8 * hmin) + 24
    canvas = (c1 - c0, r1 - r0)
    origin = (-c0, -r0)

    def draw(f=0):
        WT.terrain_w(fld, R.material, 0.0, L, z0, z1, keep=keep, frame=f)
        for (fn, x, z, dy, rad) in sorted(items, key=lambda t: t[1] + t[2]):
            y = float(fld.ground(np.array([x]), np.array([z]))[0]) - 0.04 + dy
            with WT.place(x, z, y):
                fn()
        if nanim:
            R.anim_draw(f, fld)
    if nanim:
        fr, ov = WT.render_anim([lambda f=f: draw(f) for f in range(nanim)], canvas, origin)
    else:
        fr, ov = WT.render(draw, canvas, origin, mat_frames=frames if wet else 0)
    return fr, ov, dict(L=L, z0=z0, z1=z1, wet=wet)
