# Sprite module: track in the ground layer, switch points overlays and switch stands
# (owner: pipeline, trains and track helper). Contract keys: sw/stand/N, sw/stand/R, sw/points/<id>/N|R, and the
# tracks in the ground layer (drawn with every switch set for the straight route).
import math
import numpy as np
import engine as E
import track as TR
import groundlayer as GL
from registry import one

GROUND_ORDER = 40
PATCH = 4.5        # how far (u) a points overlay reaches from the switch node along the line


def ground(layer):
    L = layer.layout
    TR.draw_edges(L['edges'], skip=TR.switch_skips(L, {}))


def _points_patch(L, sw, state):
    """The track around one switch, in the given state, drawn around the switch node."""
    edges = {e['id']: e for e in L['edges']}
    nx, nz = sw['node']
    rev = edges[sw['reverse']]
    p = np.asarray(rev['pts'])
    direction = 1 if p[-1][0] > p[0][0] else -1
    clip = (0, PATCH * 4) if direction > 0 else (-PATCH * 4, 0)
    near = [edges[sw['trunk']], edges[sw['normal']], edges[sw['reverse']]]
    skip = TR.switch_skips({'edges': L['edges'], 'switches': [sw]}, {sw['id']: state})
    def draw():
        E.CLIP[0] = (clip[0] + 0.3, clip[1])
        TR.draw_edges(near, skip=skip, offset=(nx * 4, nz * 4))
        E.CLIP[0] = None
    return one(draw, outline=False, shadows=False, canvas=(240, 160), origin=(120, 80))[0]


def register(reg):
    L = GL.load_layout()
    for st in ('N', 'R'):
        reg.add(f'sw/stand/{st}', 'track', one(lambda: TR.switch_stand(st), shadow=(-12, -12, 20, 12), scale=(0.8, 0.8, 0.55)),
                dict(anchor='foot of the post', note='N: white target, set for the straight route; R: red target, set for the diverging route'))
    for sw in L['switches']:
        for st in ('N', 'R'):
            reg.add(f'sw/points/{sw["id"]}/{st}', 'track', [_points_patch(L, sw, st)],
                    dict(anchor=f'the switch node {sw["name"]} at y = 0',
                         note='the track around the switch in this state, drawn over the ground layer (which has N)'))
