# D32 wild country colour ramps (Artist 2, the far side): appended after pal27's and pal_d32's, so no existing index
# moves. Light to dark, in the same muted family: the canyon's red rock, mountain granite, snow, and a dusty sage
# for dry slopes. The haze of the far ranks is not a ramp: wild_kit.haze() lifts every colour of a finished picture
# a set share towards one haze colour (the same input colour always gives the same output colour).
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E

NEW = {
    'redrock': ['#e2b08a', '#c88a63', '#a3654b', '#74443b', '#4a2c2d'],   # canyon walls, red sandstone
    'granite': ['#d2cfc6', '#aaa8a1', '#84838a', '#5f6069', '#3e3f4b'],   # the pass's mountain faces, scree
    'snow':    ['#f7f4ec', '#e2e4e2', '#bfc8cc', '#94a0ab', '#687484'],   # snowfields high up
    'dryslope': ['#d6cb9c', '#b3aa7a', '#8c875f', '#666446', '#454533'],  # sun-dried bluff grass
}


def install():
    if 'redrock' in E.RAMPS:
        return
    for name, cols in NEW.items():
        keys = []
        for i, c in enumerate(cols):
            k = f'{name}{i}'
            E.HEX[k] = c
            keys.append(k)
        E.RAMPS[name] = keys
        E.RNAMES.append(name)
        E.RID[name] = len(E.RNAMES) - 1
    ml = max(len(v) for v in E.RAMPS.values())
    pal = np.zeros((len(E.RNAMES), ml, 3), np.uint8)
    for n, lst in E.RAMPS.items():
        for i in range(ml):
            pal[E.RID[n], i] = E.hx(E.HEX[lst[min(i, len(lst) - 1)]])
    E.PAL = pal
    E.RLEN = np.array([len(E.RAMPS[n]) for n in E.RNAMES])
    E.ML = ml


install()
