# Sprite module: D32 stage 3, the furniture and fittings inside every building (plans/d32-tech.md 8.3, 10.5;
# plans/d32-art-rooms.md). Drawn in rooms_d32.py; keys:
#   furn/<piece>/<facing>[/<f>]   facing se, sw, ne, nw (the way the piece's front faces) or x, z (its long axis);
#   furn/<piece>[/<f>]            round pieces have no facing
# Frames: several frames are an animation (stove, range, forge: firelight) or the stock levels (shelves, crates,
# sacks: 0 empty, 1 low, 2 half, 3 full).
# Anchor: the footprint centre at floor level; a wall piece (extra.wall): the middle of its back on the wall line.
# extra: foot [x0, z0, x1, z1] (u from the anchor, world axes, this facing), top (a surface's height, u), seat (a
# seat's height), sit_dy (px to lift a seated frame), bed (mattress height), wall, hot, flat, light, and use:
# [[dx, dz, act, facing]] where people stand or sit to use it (u from the anchor; facing the people's dir).
import math
import numpy as np
import harness as H
import rooms_d32 as RM

FACE = {'keeper': '+c', 'customer': '-c', 'sit': '+c', 'take': '-c', 'teach': '+c', 'preach': '+c', 'drink': '-c',
        'play': '-c', 'work': '-c', 'open': '-c', 'wash': '-c', 'cook': '-c', 'side': '-a', 'horse': '-c',
        'lie': '+c'}
IN_FACE = {'table', 'table_cloth', 'card_table'}         # people round a table face its middle


def _dir_of(v):
    x, z = v
    if abs(x) >= abs(z):
        return 'se' if x > 0 else 'nw'
    return 'sw' if z > 0 else 'ne'


def world_extra(name, d, ex):
    """The piece's local extra (a, c) turned to world (x, z) for facing d."""
    F = RM.Frame(yaw=RM.YAW.get(d or 'sw', 0.0))

    def w(a, c):
        p = F.pt(a, c, 0.0)
        return float(p[0]), float(p[1])
    out = {}
    for k, v in ex.items():
        if k == 'foot':
            a0, c0, a1, c1 = v
            pts = [w(a, c) for a in (a0, a1) for c in (c0, c1)]
            out['foot'] = [round(min(p[0] for p in pts), 2), round(min(p[1] for p in pts), 2),
                           round(max(p[0] for p in pts), 2), round(max(p[1] for p in pts), 2)]
        elif k == 'use':
            us = []
            for u in v:
                a, c, act = u[0], u[1], u[2]
                face = u[3] if len(u) > 3 else ('in' if name in IN_FACE and act == 'sit' else FACE.get(act, '-c'))
                x, z = w(a, c)
                if face == 'in':
                    vec = (-x, -z)
                else:
                    sgn = 1 if face[0] == '+' else -1
                    o = w(0, 0)
                    t = w(sgn, 0) if face[1] == 'a' else w(0, sgn)
                    vec = (t[0] - o[0], t[1] - o[1])
                us.append([round(x, 2), round(z, 2), act, _dir_of(vec)])
            out['use'] = us
        elif k in ('levels', 'note', 'door'):
            continue
        else:
            out[k] = v
    return out


def render(fn, d, kw):
    box = {}

    def draw():
        p = RM.P(d or 'sw')
        box['ex'] = fn(p, **kw) or {}
    img, an = H.render(draw, shadow=None, shadows=False, **RM.CV)
    return (img, an), box['ex']


def register(reg):
    g = 'rooms'
    for name, fn, dirs, frames, note in RM.PIECES:
        for d in (dirs or (None,)):
            kws = frames or [{}]
            frs = []
            ex = {}
            for kw in kws:
                fr, ex = render(fn, d, kw)
                frs.append(fr)
            key = f'furn/{name}' + (f'/{d}' if d else '')
            meta = {'anchor': 'the footprint centre at floor level' if not ex.get('wall') else
                    'the middle of its back on the wall line, at floor level',
                    'note': note + ('; ' + ex['note'] if ex.get('note') else ''),
                    'extra': world_extra(name, d, ex)}
            if ex.get('levels'):
                meta['frame_note'] = ex['levels']
            reg.add(key, g, frs, meta, indexed=len(frs) > 1)
