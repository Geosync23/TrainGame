# Sprite module: rolling stock and steam (owner: pipeline, trains and track helper).
# Contract keys (plans/proto-sprites.md): veh/loco/<hdg>/<f>, veh/coach/<hdg>, veh/boxcar/<hdg>,
# veh/boxcar_open/<hdg>, veh/flatcar/<hdg>, fx/smoke/<f>. Extras, not in the contract: veh/loco_freight/<hdg>/<f>
# (a black freight engine with a red cab, the same size) and veh/flatcar_loaded/<hdg>.
import math
import numpy as np
import engine as E
import stock as ST
from registry import one

# The ten headings. The game's yaw is atan2(-dz, dx): 0 is east (+x), positive turns north (-z).
# 'w+15' is 15 degrees north of west (yaw 165). Value: (drawn facing d, turn of the drawing in degrees).
HEADINGS = {}
for n in (0, 15, 30):
    for sgn in ((1, -1) if n else (1,)):
        tag = '' if n == 0 else ('+%d' % n if sgn > 0 else '-%d' % n)
        HEADINGS['e' + tag] = (1, sgn * n)
        HEADINGS['w' + tag] = (-1, -sgn * n)
ANCHOR = 'centre of the footprint at y = 0, on the track centre line'


def _render(kind, draw, yaw_deg):
    L, sc = ST.SPEC[kind]
    ST.set_rail(sc[2])
    sh = (-L / 2 - 4, -10, L / 2 + 18, 10)
    return one(draw, shadow=sh, yaw=math.radians(yaw_deg), scale=sc)[0]


def _symmetric(reg, key, kind, draw, meta):
    """A car whose two ends look alike: heading w+N is the same picture as e-N."""
    cache = {}
    for hdg, (d, deg) in HEADINGS.items():
        e_deg = deg if d > 0 else deg      # drawn facing +x, turned by the same line angle
        if e_deg not in cache:
            cache[e_deg] = _render(kind, draw, e_deg)
        reg.add(f'{key}/{hdg}', 'trains', [cache[e_deg]], meta)


def register(reg):
    for look, key in (('passenger', 'veh/loco'), ('freight', 'veh/loco_freight')):
        for hdg, (d, deg) in HEADINGS.items():
            fr = [_render('loco', lambda k=k: ST.loco(d, k * math.pi, look), deg) for k in range(2)]
            reg.add(f'{key}/{hdg}', 'trains', fr,
                    dict(length=8.8, anchor=ANCHOR, note='engine and tender as one vehicle; frames: wheels and rods, play 0, 1, 0, 1 while moving'))
    _symmetric(reg, 'veh/coach', 'coach', lambda: ST.coach(1), dict(length=5.6, anchor=ANCHOR))
    _symmetric(reg, 'veh/boxcar', 'boxcar', lambda: ST.boxcar(1, False), dict(length=5.0, anchor=ANCHOR))
    _symmetric(reg, 'veh/boxcar_open', 'boxcar', lambda: ST.boxcar(1, True), dict(length=5.0, anchor=ANCHOR, note='south door open'))
    _symmetric(reg, 'veh/flatcar', 'flatcar', lambda: ST.flatcar(1, None), dict(length=5.0, anchor=ANCHOR))
    _symmetric(reg, 'veh/flatcar_loaded', 'flatcar', lambda: ST.flatcar(1, 'goods'), dict(length=5.0, anchor=ANCHOR))
    # steam: a puff growing and fading (thinned with a checker as it fades: the contract wants hard alpha)
    puffs = []
    for k, r in enumerate((1.4, 2.2, 3.0, 3.6)):
        img, an = one(lambda: ST.smoke(r, k + 3), outline=False, shadows=False)[0]
        if k >= 2:
            yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
            keep = ((xx + yy) % 2 == 0) if k == 2 else ((xx % 2 == 0) & (yy % 2 == 0))
            img = img.copy(); img[~keep] = 0
        puffs.append((img, an))
    reg.add('fx/smoke', 'trains', puffs, dict(anchor='centre of the puff'))
