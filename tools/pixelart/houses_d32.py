# D32 stage 3 (the buildings artist): three new kinds of house for the bigger town's back lanes (8 x 8u lots), each in
# two colour variants and two facings, whole and in parts (floor, back, front, roof; rooms_bld.py splits them):
#   cabin       a log cabin, 5 x 4u, a stone chimney on its north end, a plank porch, a woodpile and a chopping block
#   framehouse  a painted clapboard house, 6 x 5u, shutters, a flower box, a porch with a railing, a wash line
#   house2      a two-room house, 7.5 x 5u, a chimney between the rooms, a long porch, a privy and a wash line
# Facing 'e': the door faces +x (houses west of a lane); 'w': the door faces -x, the house seen from behind (its back
# door, the yard). Drawn like the D27 houses (town27.house): the same frame, scale, light and palette.
import numpy as np
import engine as E
from engine import R, box, cyl_z, cyl_x, sphere, new_oid, hash2
import town as TW
import town27 as T
from town import Frame, Paint, rect, clampi, shingle_tex, end_clap, end_batten
from ptag import tag

U = 4.0
UY = 16.0 / 3.0
DOOR_H = T.DOOR_H

VARIANTS = {
    'cabin': [dict(wall='wood', roof='wood', trim='wood', door='wood', stone='rock'),
              dict(wall='umber', roof='roof', trim='cream', door='red', stone='rock')],
    'framehouse': [dict(wall='cream', roof='roof', trim='green', door='green', shutter='green', flowers='red'),
                   dict(wall='sage', roof='brick', trim='cream', door='red', shutter='pine', flowers='bloom')],
    'house2': [dict(wall='straw', roof='iron', trim='brick', door='brick', flowers='red'),
               dict(wall='wood', roof='roof', trim='cream', door='slate', flowers='bloom')],
}
DIMS = {'cabin': dict(A=10.0, B=8.0, wh=3.0 * UY, pitch=0.95),
        'framehouse': dict(A=12.0, B=10.0, wh=3.6 * UY, pitch=0.8),
        'house2': dict(A=15.0, B=10.0, wh=3.4 * UY, pitch=0.7)}


def _roof_tex(r):
    if r in ('roof', 'brick'):
        return shingle_tex()
    if r == 'iron':
        return T.roof_tex('tin')
    return T.roof_tex('plank')


def flower_box(F, a0, a1, b, z, o, flowers='red'):
    """A window box on the wall at depth b (its outer face at b + 1.4), with flowers."""
    F.box(a0, b, z, a1, b + 1.4, z + 1.6, 'wood', shades=(1, 2, 3), oid=o)
    for k in range(int((a1 - a0) / 0.9)):
        a = a0 + 0.45 + k * 0.9
        X, Y = F.w(a, b + 0.7)
        h = hash2(k, 7) % 3
        sphere(X, Y, z + 2.2 + h * 0.3, 0.75, 'pine' if k % 2 else 'sage', oid=o, cast=False)
        if k % 2 == 0:
            sphere(X, Y, z + 2.9 + h * 0.3, 0.5, flowers, oid=o, cast=False, th=(0.6, 0.2, -0.3))


def chopping_block(F, a, b, o):
    X, Y = F.w(a, b)
    cyl_z(X, Y, 0, 2.6, 1.4, 'wood', oid=o, topidx=0)
    # the axe in the block, its handle leaning
    box(X - 0.2, Y - 0.2, 2.6, X + 0.2, Y + 0.2, 6.0, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    box(X - 0.9, Y - 0.15, 2.2, X + 0.3, Y + 0.15, 3.0, 'iron', shades=(1, 2, 3), oid=o, cast=False)


def bench(F, a0, a1, b, o):
    F.box(a0, b - 0.8, 2.8, a1, b + 0.8, 3.4, 'wood', shades=(0, 2, 3), oid=o)
    for a in (a0 + 0.5, a1 - 0.9):
        F.box(a, b - 0.6, 0, a + 0.4, b + 0.6, 2.8, 'wood', shades=(1, 2, 3), oid=o, cast=False)


def _walls_paint(kind, v, F):
    c = VARIANTS[kind][v]
    D = DIMS[kind]
    A, B = D['A'], D['B']
    tex = {'cabin': 'log', 'framehouse': 'clap', 'house2': 'batten'}[kind]
    south_a = -A if F.f == 'e' else A          # the local a of the south end (the side the view sees)

    def paint(lf, u, z, a, b, idx, lit):
        p = Paint(c['wall'], u, z, idx, lit)
        T.tex_wall(tex, p, a if lf in 'fk' else b, z, lit)
        if kind == 'cabin':
            p.ii = np.where((np.mod(z, 2.2) < 0.45), clampi(p.base + 1), p.ii)
        tr = c['trim']
        p.u = a
        if lf == 'f':                           # the front: the door, windows (and a flower box under one)
            if kind == 'cabin':
                p.door(-2.2, 2.2, DOOR_H - 1.0, ramp=c['door'], trim=tr, panels=False)
                p.window(4.4, 7.6, 5.0, 10.0, trim=tr, panes=(2, 2), sill=True)
                p.window(-7.6, -4.4, 5.0, 10.0, trim=tr, panes=(2, 2), sill=True)
                T.door_lamp(p, a, z, 3.4, zb=DOOR_H - 5.4)
            elif kind == 'framehouse':
                p.door(-6.8, -2.6, DOOR_H, ramp=c['door'], trim=tr)
                p.window(-6.6, -2.8, DOOR_H + 0.6, DOOR_H + 1.8, trim=tr, panes=(2, 1), sill=False)
                p.window(2.0, 6.0, 5.5, 13.0, trim=tr, panes=(2, 2), sill=True, shutters=c['shutter'])
                T.door_lamp(p, a, z, -8.4, zb=DOOR_H - 5.4)
            else:
                for d0 in (-11.6, 3.4):
                    p.door(d0, d0 + 4.2, DOOR_H - 0.6, ramp=c['door'], trim=tr, panels=True)
                for w0 in (-5.6, 9.4):
                    p.window(w0, w0 + 3.6, 5.5, 11.5, trim=tr, panes=(2, 2), sill=True)
                T.door_lamp(p, a, z, 0.0, zb=DOOR_H - 5.0)
        elif lf == 'k':                         # the back: a back door and a window
            u2 = a
            p.u = u2
            if kind == 'cabin':
                p.window(-3.0, 0.0, 6.0, 10.0, trim=tr, panes=(1, 2), sill=True)
            elif kind == 'framehouse':
                p.door(3.0, 7.0, DOOR_H - 0.8, ramp='wood', trim=tr, panels=False)
                p.window(-8.0, -4.4, 6.0, 11.0, trim=tr, panes=(2, 2), sill=True)
                T.door_lamp(p, a, z, 8.6, zb=DOOR_H - 5.4)
            else:
                p.door(-2.0, 2.0, DOOR_H - 0.8, ramp='wood', trim=tr, panels=False)
                p.window(-11.0, -7.4, 6.0, 11.0, trim=tr, panes=(2, 2), sill=True)
                p.window(7.4, 11.0, 6.0, 11.0, trim=tr, panes=(2, 2), sill=True)
                T.door_lamp(p, a, z, 3.4, zb=DOOR_H - 5.8)
        elif lf == 's':                         # the end the view sees: one window
            g = (np.abs(b) < 1.8) & (z > 6.0) & (z < 12.0)
            p.fill((np.abs(b) < 2.4) & (z > 5.3) & (z < 12.7) & ~g, tr, 1 + lit)
            p.fill(g, 'glass', np.where(z > 11.0, 2, 3))
            p.fill(g & ((np.abs(b) < 0.3) | (np.abs(z - 9.0) < 0.3)), tr, 1 + lit)
        return p.rr, p.ii
    return paint, south_a


def house(kind, v, f):
    c = VARIANTS[kind][v]
    D = DIMS[kind]
    A, B, wh = D['A'], D['B'], D['wh']
    F = Frame(f)
    o = new_oid(True)
    paint, sa = _walls_paint(kind, v, F)
    na = -sa                                     # the north end
    sgn = 1.0 if sa > 0 else -1.0                # +1: the south end is at +a
    tag('walls')
    F.box(-A, -B, 0, A, B, wh, c['wall'], paint=paint, oid=o)
    hw = B + 1.8
    zr = wh + hw * D['pitch']
    endt = {'cabin': end_batten('y', 2.0, ramp=c['wall']), 'framehouse': end_clap(ramp=c['wall']),
            'house2': end_batten('y', 2.6, ramp=c['wall'])}[kind]
    if kind == 'cabin':
        def endt(face, X, Y, Z, idx, w=c['wall']):
            return np.full(X.shape, R(w)), np.where(np.mod(Z, 2.2) < 0.5, 3, 2)
    tag('gable')
    F.roof_across(-A - 1.4, A + 1.4, 0.0, hw, wh - 0.4, zr, c['roof'], wall=c['wall'], oid=o, tex=_roof_tex(c['roof']),
                  endtex=endt)
    tag('roof')
    F.box(-A - 1.4, -0.5, zr - 0.4, A + 1.4, 0.5, zr + 0.5, c['roof'] if c['roof'] != 'iron' else 'iron',
          shades=(1, 2, 3), oid=o, cast=False)                                   # the ridge cap
    # ---- chimneys
    if kind == 'cabin':
        # a stone chimney outside the north end, from the ground to above the ridge (it stays when the house opens)
        tag('back')
        cabin_chimney(v, f, o)
    else:
        tag('roof')
        ac = 0.0 if kind == 'house2' else na * 0.55
        brick = lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(z, 1.34) < 0.42, clampi(idx + 1), idx))
        F.box(ac - 1.4, -1.2, zr - 4.0, ac + 1.4, 1.6, zr + 4.0, 'brick', paint=brick, oid=o)
        F.box(ac - 1.8, -1.6, zr + 4.0, ac + 1.8, 2.0, zr + 4.8, 'brick', shades=(1, 2, 3), oid=o)
    # ---- the porch on the front (+b)
    pd = 5.0
    tag('back')
    F.box(-A, B, 0, A, B + pd, 1.4, 'wood', paint=T.planks_top, oid=o)
    F.box(-2.6, B + pd, 0, 2.6, B + pd + 1.6, 0.7, 'wood', paint=T.planks_top, oid=o)            # the step
    zt = 3.0 * UY if kind != 'framehouse' else 3.3 * UY
    tag('front' if f == 'e' else 'back')
    posts = (-A + 0.6, A - 0.6) if kind == 'cabin' else ((-A + 0.6, -0.4 if kind == 'framehouse' else -A / 3, A / 3, A - 0.6)
                                                         if kind == 'house2' else (-A + 0.6, 0.0, A - 0.6))
    for a in posts:
        F.box(a - 0.45, B + pd - 1.0, 1.4, a + 0.45, B + pd - 0.1, zt, 'wood' if kind != 'framehouse' else c['trim'],
              shades=(1, 2, 3), oid=o)
    if kind == 'framehouse':                      # a railing between the posts, open at the step
        for (r0, r1) in ((-A + 0.6, -3.0), (3.0, A - 0.6)):
            F.box(r0, B + pd - 0.9, 5.0, r1, B + pd - 0.2, 5.6, c['trim'], shades=(0, 1, 2), oid=o, cast=False)
            for k in range(int((r1 - r0) / 1.4)):
                aa = r0 + 0.7 + k * 1.4
                F.box(aa - 0.2, B + pd - 0.8, 1.4, aa + 0.2, B + pd - 0.3, 5.0, c['trim'], shades=(1, 2, 3), oid=o, cast=False)
    tag('roof')
    rr = c['roof'] if c['roof'] != 'brick' else 'roof'
    for k in range(3):
        bb = B - 0.4 + k * (pd + 1.0) / 3.0
        F.box(-A - 0.6, bb, zt + (2 - k) * 0.7, A + 0.6, bb + (pd + 1.0) / 3.0 + 0.2, zt + (2 - k) * 0.7 + 0.7, rr,
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(a, 2.0) < 0.6, clampi(idx + 1), idx)), oid=o)
    # ---- things on the porch and the front wall
    tag('front' if f == 'e' else 'back')
    if kind == 'framehouse':
        flower_box(F, 1.4, 6.6, B, 3.4, o, c['flowers'])
    tag('back')
    if kind == 'cabin':
        bench(F, 4.0, 8.6, B + 1.6, o)
        X, Y = F.w(-6.0, B + 2.0)
        TW.barrel(r=1.1, h=3.2, ramp='wood', oid=o, x=X, y=Y, z=1.4)
    elif kind == 'framehouse':
        X, Y = F.w(6.4, B + 2.6)                  # a rocking chair
        box(X - 1.0, Y - 1.0, 1.4, X + 1.0, Y + 1.0, 3.4, 'wood', shades=(1, 2, 3), oid=o)
        # potted geraniums by the step
        for aa in (-3.6, 3.6):
            X, Y = F.w(aa, B + pd - 1.6)
            cyl_z(X, Y, 1.4, 3.0, 0.8, 'brick', oid=o)
            sphere(X, Y, 3.8, 1.0, 'pine', oid=o, cast=False)
            sphere(X, Y, 4.4, 0.55, c['flowers'], oid=o, cast=False)
    else:
        bench(F, -A + 2.0, -A + 7.0, B + 1.6, o)
        X, Y = F.w(A - 3.0, B + 2.2)              # a wash tub on a stool
        box(X - 1.0, Y - 1.0, 1.4, X + 1.0, Y + 1.0, 3.6, 'wood', shades=(1, 2, 3), oid=o)
        cyl_z(X, Y, 3.6, 5.0, 1.5, 'iron', oid=o, topidx=2)
    # ---- the south end (the side the view sees): a rain barrel, flowers along the wall
    sb = sa + sgn * 2.0
    T.rain_barrel(F, sb, -B + 3.0, o, h=4.6)
    if kind != 'cabin':
        for k in range(4):
            X, Y = F.w(sa + sgn * 1.2, B - 2.0 - k * 2.2)
            sphere(X, Y, 1.0, 1.0, 'pine', oid=o, cast=False)
            if k % 2 == 0:
                sphere(X, Y, 1.8, 0.55, c.get('flowers', 'red'), oid=o, cast=False)
    # ---- behind (-b): the yard
    if kind == 'cabin':
        T._woodpile(F, -7.0, -B - 2.4, 9.0, 3, o)
        chopping_block(F, sa - sgn * 0.0 + sgn * 0.0 + (5.0 if sgn < 0 else -5.0) * -1.0 * 0 + 6.0 * (1 if f == 'e' else -1), -B - 5.6, o)
        T.washing_line(F, -9.0, 9.0, -B - 7.2, o, [(-5.0, 2.6, 3.6, 'cream', 0), (-1.0, 2.2, 3.0, 'navy', 1),
                                                   (3.0, 2.8, 4.0, 'red', 1)])
    elif kind == 'framehouse':
        T.washing_line(F, -11.0, 11.0, -B - 4.6, o, [(-7.0, 3.0, 4.2, 'cream', 0), (-3.0, 2.4, 3.2, 'cream', 1),
                                                     (1.5, 3.4, 4.8, 'slate', 1), (6.0, 2.6, 3.4, 'red', 1)])
        X, Y = F.w(-9.0, -B - 2.0)
        TW.barrel(r=1.0, h=3.0, ramp='ochre', oid=o, x=X, y=Y)
    else:
        T._woodpile(F, -12.0, -B - 2.4, 7.0, 3, o)
        T.privy(F, 13.0, -B - 3.6, o)
        T.washing_line(F, -4.0, 9.0, -B - 4.4, o, [(-1.0, 2.6, 3.6, 'cream', 0), (3.0, 2.4, 3.0, 'straw', 1),
                                                   (6.5, 2.2, 3.4, 'cream', 1)])
    tag(None)
    return o


def cabin_chimney(v, f, o=None):
    """The cabin's stone chimney outside its north end (also drawn into the opened house's back part)."""
    c = VARIANTS['cabin'][v]
    D = DIMS['cabin']
    A, B, wh = D['A'], D['B'], D['wh']
    zr = wh + (B + 1.8) * D['pitch']
    F = Frame(f)
    o = o or new_oid(True)
    sa = -A if F.f == 'e' else A
    na = -sa
    sgn = 1.0 if sa > 0 else -1.0
    ac = na - sgn * 2.2
    def stone(lf, u, z, a, b, idx, lit):
        p = Paint(c['stone'], u, z, idx, lit)
        T.tex_wall('stone', p, a if lf in 'fk' else b, z, lit)
        return p.rr, p.ii
    F.box(ac - 2.2, -3.4, 0, ac + 2.2, 3.4, wh + 2.0, c['stone'], paint=stone, oid=o)
    F.box(ac - 1.6, -2.2, wh + 2.0, ac + 1.6, 2.2, zr + 4.0, c['stone'], paint=stone, oid=o)
    F.box(ac - 1.9, -2.5, zr + 4.0, ac + 1.9, 2.5, zr + 4.7, 'rock', shades=(0, 1, 2), oid=o)
    return o


def house_box(kind, f):
    D = DIMS[kind]
    F = Frame(f)
    x0, z0, x1, z1 = F.rect_w(-D['A'] - 3.0, -D['B'] - 6.0, D['A'] + 3.0, D['B'] + 6.6)
    h = (D['wh'] + (D['B'] + 1.8) * D['pitch']) / UY + 1.0
    return [round(max(x0, -16.0) / U, 2), round(max(z0, -16.0) / U, 2), round(min(x1, 16.0) / U, 2),
            round(min(z1, 16.0) / U, 2), round(h, 2)]
