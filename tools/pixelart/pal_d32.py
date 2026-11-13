# D32 colour ramps, appended after pal27's (no existing index moves), light to dark, in the same muted family.
import numpy as np
import pal27  # noqa: F401
import engine as E

NEW = {
    'earth':  ['#b39170', '#94735a', '#755a47', '#563f35', '#3a2b27'],   # fresh dug soil, spoil, the cut's face
    'canvas': ['#ece2c8', '#d3c6a6', '#ae9f80', '#7f735f', '#4e463c'],   # tent canvas, wagon sheets
    'river':  ['#9cc4bd', '#6f9c9a', '#4f7b80', '#385b66', '#26404d'],   # the river and deep pools
    'bark':   ['#a08a72', '#7d6754', '#5c4a3f', '#40332e', '#2b2026'],   # pine and oak bark, stumps
    'needle': ['#7c9468', '#587653', '#3f5a43', '#2c4236', '#1d2c27'],   # ponderosa needles
}


def install():
    if 'earth' in E.RAMPS:
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
