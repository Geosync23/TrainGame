# D27 colour ramps for the town, nature and ground (A3, the buildings-and-town artist).
# The shared palette (engine.py) has no grey-green for sagebrush, no warm stone, no creek water, no dry grass and
# only a bright brick red, so this file appends a few muted ramps to the engine at import time, without editing
# engine.py: every ramp is added after the existing ones, so no existing index moves. Light to dark, as engine.RAMPS.
import numpy as np
import engine as E

NEW = {
    'sage':  ['#c3c7a8', '#9ea68a', '#78836a', '#56604f', '#3b4238'],   # sagebrush, willow undersides, dry leaves
    'rock':  ['#e0d2b8', '#bfa98a', '#94806a', '#6a5a4e', '#463a38'],   # sandstone, boulders, the jail's stone
    'creek': ['#b5d6cc', '#86b3ad', '#5f8e8f', '#436a72', '#2e4a55'],   # creek water
    'straw': ['#e6d49a', '#cdb574', '#a68d55', '#7a6840', '#54492f'],   # dry grass, hay, rabbitbrush stems
    'brick': ['#c47a62', '#a05a48', '#7a4038', '#552c2c', '#2b2026'],   # weathered brick (the bank, chimneys)
    'umber': ['#9a8a7c', '#76665e', '#56494a', '#3c3238', '#2b2026'],   # dark-stained wood (the undertaker)
    'slate': ['#b3bcbc', '#8e9a9e', '#6c7781', '#4e5664', '#343a48'],   # faded blue-grey paint (newspaper, hotel)
    'pine':  ['#7f9a6a', '#5d7a55', '#425e46', '#2f4538', '#1f2e2a'],   # juniper and cottonwood shadows
    'bloom': ['#f2e3a0', '#e3c25a', '#c49a3c', '#8f6c30', '#5c4426'],   # rabbitbrush and flower yellows
}


def install():
    if 'sage' in E.RAMPS:
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
