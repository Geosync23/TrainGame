# Sprite module: D32 stage 3, the furniture and fittings inside every building (plans/d32-tech.md 8.3, 10.5; the
# Rooms builder's contract plans/d32-rooms-art.md section 3; what was delivered: plans/d32-art-rooms.md). Drawn in
# rooms_d32.py. Keys:
#   furn/<name>/<o>              one picture
#   furn/<name>/<n>/<o>          a numbered variant: stock levels 0..3 (shelf, sacks, crates), the fire 1 and 2
#                                (stove, forge, range: furn/<name>/<o> is the cold one), stall/horse
# <o>: x or z (the long side along world x or z; the front towards the viewer: +z for x, +x for z; ne, nw on a
# counter, bar, pew, bank counter or hotel desk: turned to face away), or se, sw, ne, nw for a piece one faces (the
# way the sitter or user faces). Round pieces have x only.
# Anchor: the middle of the footprint, on the floor (the code lifts it to the floor's height).
# extra: box [x0, z0, x1, z1, h] (u from the anchor, world axes), and where they apply top (a surface's height, u),
# seat, sit_dy (px to lift a seated frame), bed (mattress height), wall (stands against a wall: the side away from the
# viewer), hot, flat, light, and use [[dx, dz, act, facing]]: where a person stands or sits to use it.
import numpy as np
import harness as H
import rooms_d32 as RM

FACE = {'keeper': '+c', 'customer': '-c', 'sit': '+c', 'take': '-c', 'teach': '+c', 'preach': '+c', 'drink': '-c',
        'play': '-c', 'work': '-c', 'open': '-c', 'wash': '-c', 'cook': '-c', 'side': '-a', 'horse': '-c',
        'lie': '+c'}
IN_FACE = {'table', 'table_cloth', 'card_table'}         # people round a table face its middle
ROT = -np.pi / 2                                          # the canvas quarter turn: +x to +z, +z to -x


def _dir_of(v):
    x, z = v
    if abs(x) >= abs(z):
        return 'se' if x > 0 else 'nw'
    return 'sw' if z > 0 else 'ne'


def _rot(v):
    """World (x, z) of a point drawn at (x, z) once the canvas is turned by ROT."""
    x, z = v
    return (-z, x)


def world_extra(name, d, ex, shift, rot):
    """The piece's local extra (a, c) turned to world (x, z) for facing d, moved by -shift (the footprint centre)."""
    F = RM.Frame(yaw=RM.YAW[d])

    def w(a, c):
        p = F.pt(a, c, 0.0)
        q = (float(p[0]), float(p[1]))
        return _rot(q) if rot else q

    def wp(a, c):
        q = w(a, c)
        return q[0] - shift[0], q[1] - shift[1]
    out = {}
    for k, v in ex.items():
        if k == 'foot':
            a0, c0, a1, c1 = v
            pts = [wp(a, c) for a in (a0, a1) for c in (c0, c1)]
            out['box'] = [round(min(p[0] for p in pts), 2), round(min(p[1] for p in pts), 2),
                          round(max(p[0] for p in pts), 2), round(max(p[1] for p in pts), 2)]
        elif k == 'use':
            us = []
            for u in v:
                a, c, act = u[0], u[1], u[2]
                face = u[3] if len(u) > 3 else ('in' if name in IN_FACE and act == 'sit' else FACE.get(act, '-c'))
                x, z = wp(a, c)
                if face == 'in':
                    vec = (-x, -z)
                else:
                    sgn = 1 if face[0] == '+' else -1
                    o = w(0, 0)
                    t = w(sgn, 0) if face[1] == 'a' else w(0, sgn)
                    vec = (t[0] - o[0], t[1] - o[1])
                us.append([round(x, 2), round(z, 2), act, _dir_of(vec)])
            out['use'] = us
        elif k in ('levels', 'note', 'door', 'h'):
            continue
        else:
            out[k] = v
    return out


def render(fn, d, kw, shift=(0.0, 0.0), rot=False):
    box = {}

    def draw():
        p = RM.P(d, origin=(-shift[0], -shift[1], 0.0) if not rot else (-shift[1], shift[0], 0.0))
        box['ex'] = fn(p, **kw) or {}
    img, an = H.render(draw, shadow=None, shadows=False, yaw=ROT if rot else 0.0, **RM.CV)
    return (img, an), box['ex']


def centre_of(fn, d, kw, rot):
    """The world centre of the piece's footprint, drawn unshifted (a dry run)."""
    _, ex = render(fn, d, kw, rot=rot)
    a0, c0, a1, c1 = ex['foot']
    F = RM.Frame(yaw=RM.YAW[d])
    pts = [F.pt(a, c, 0.0) for a in (a0, a1) for c in (c0, c1)]
    pts = [(float(p[0]), float(p[1])) for p in pts]
    if rot:
        pts = [_rot(p) for p in pts]
    cx = (min(p[0] for p in pts) + max(p[0] for p in pts)) / 2
    cz = (min(p[1] for p in pts) + max(p[1] for p in pts)) / 2
    return round(cx * 8) / 8, round(cz * 8) / 8          # whole pixels: an eighth of a u along x and z


def register(reg):
    g = 'rooms'
    for name, fn, orients, frames, h, note in RM.PIECES:
        for o, how in orients.items():
            rot = isinstance(how, tuple)
            d = how[1] if rot else how
            for suffix, kw in (frames or [('', {})]):
                shift = centre_of(fn, d, kw, rot)
                fr, ex = render(fn, d, kw, shift, rot)
                extra = world_extra(name, d, ex, shift, rot)
                extra['box'] = extra['box'] + [ex.get('h', h)]
                key = f'furn/{name}' + (f'/{suffix}' if suffix else '') + f'/{o}'
                meta = {'anchor': 'the middle of the footprint, on the floor', 'note': note +
                        ('; ' + ex['note'] if ex.get('note') else ''), 'extra': extra}
                reg.add(key, g, [fr], meta, indexed=False)
