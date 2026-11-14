# D32 stage 3 (the buildings artist): the far town's own buildings, at the end of the line (plan 10.6, the Rooms
# contract section 5). Whole sprites only (the far town is not entered). Same scale, light and palette as the town.
#   far/depot       the end-of-track depot: red board and batten, a bay to the track, a freight room, a water barrel
#   far/tank        the railroad's water tank: a stave tank on a braced timber tower, a spout and its rope
#   far/grainstore  a grain elevator with its head house and a sacking shed with a loading dock
#   far/hotel2      a second hotel: brick, two storeys, a two-level gallery on its front (the town's hotel, recoloured)
#   far/sign        the town's name board on two posts (the name is provisional)
import numpy as np
import engine as E
from engine import R, box, cyl_z, sphere, new_oid, hash2
import town as TW
import town27 as T
from town import Frame, Paint, rect, clampi, shingle_tex, end_batten, text_width

U = 4.0
UY = 16.0 / 3.0
TOWN_NAME = 'PROSPECT'       # provisional: the far town's name is the designer's choice


def depot():
    """A one-storey depot 14 x 6u along x, its track side to +z, eaves 4.6u; anchor its footprint centre."""
    F = Frame('s')
    o = new_oid(True)
    A, B = 28.0, 12.0
    wh = 4.6 * UY
    zb = 0.375 * UY
    F.box(-A - 1.0, -B - 1.0, 0, A + 1.0, B + 1.0, zb, 'wood',
          paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(u, 1.6) < 0.45, clampi(idx + 2), clampi(idx + 1))),
          oid=o)
    def walls(lf, u, z, a, b, idx, lt):
        p = Paint('red', u, z, idx, lt)
        p.battens(2.6, 0.5, 1.0, u=(a if lf in 'fk' else b))
        zz = z - zb
        p.fill(zz < 2.0, 'wood', clampi(idx + 2))
        p.fill(z > wh - 1.2, 'cream', clampi(idx))
        if lf == 'f':
            p.u = a + A
            p.door(12.0, 17.0, 16.0, ramp='wood', trim='cream', double=True)
            p.window(12.4, 16.6, 16.8, 18.8, trim='cream', panes=(3, 1), sill=False)
            for a0 in (4.0, 34.0):
                p.window(a0, a0 + 3.6, 6.0, 15.0, trim='cream', panes=(1, 2))
            p.door(44.0, 52.0, 17.0, ramp='wood', trim='cream', double=True, panels=False)
            p.fill(rect(p.u, zz, 44.0, 52.0, 0, 17.0) & (np.abs((p.u - 44.0) - zz * 8.0 / 17.0) < 0.6), 'cream', 2)
            T.door_lamp(p, p.u, z, 18.6)
        elif lf == 's':
            p.u = b + B
            p.window(9.0, 13.0, 6.0, 15.0, trim='cream', panes=(1, 2))
        return p.rr, p.ii
    F.box(-A, -B, zb, A, B, wh, 'red', paint=walls, oid=o, shades=(1, 1, 2))
    # the operator's bay to the track
    def bay(lf, u, z, a, b, idx, lt):
        p = Paint('red', u, z, idx, lt)
        p.battens(2.6, 0.5, 1.0, u=(a if lf == 'f' else b))
        zz = z - zb
        p.fill(zz < 6.0, 'wood', clampi(idx + 2))
        g = (zz > 7.0) & (zz < 16.0) & (np.mod(a if lf == 'f' else b, 3.2) > 0.7)
        p.fill(g, 'glass', np.where(zz > 14.6, 2, 3))
        return p.rr, p.ii
    F.box(-4.0, B, zb, 4.0, B + 3.0, zb + 18.5, 'red', paint=bay, oid=o)
    F.box(-4.6, B - 0.2, zb + 18.5, 4.6, B + 3.6, zb + 19.6, 'cream', shades=(0, 1, 2), oid=o)
    hw = B + 4.0
    F.roof_across(-A - 2.0, A + 2.0, 0, hw, wh - 0.4, wh + 11.0, 'roof', wall='red', oid=o, tex=shingle_tex(),
                  shades=(1, 1), endtex=end_batten('y', 2.6, ramp='red'))
    for a in (-A + 2.0, -A + 18.0, A - 18.0, A - 2.0):          # brackets under the deep eaves on the track side
        F.box(a - 0.5, B, wh - 3.6, a + 0.5, B + 2.6, wh - 0.4, 'cream', shades=(0, 1, 2), oid=o)
    def brick(lf, u, z, a, b, idx, lt):
        return None, np.where(np.mod(z, 1.34) < 0.42, clampi(idx + 1), idx)
    F.box(-14.0, -5.0, wh + 2.0, -11.0, -2.0, wh + 14.0, 'brick', paint=brick, oid=o)
    F.box(-14.4, -5.4, wh + 14.0, -10.6, -1.6, wh + 14.8, 'iron', shades=(1, 2, 3), oid=o)
    # the name board on the +x gable, a bench and baggage on the platform side, a rain barrel
    F.box(A + 2.2, -9.0, wh + 1.0, A + 2.8, 9.0, wh + 6.6, 'cream', shades=(0, 0, 0), oid=new_oid(True))
    X, Y = F.w(-20.0, B + 4.0)
    box(X - 4.0, Y - 0.8, 2.6, X + 4.0, Y + 0.8, 3.2, 'wood', shades=(0, 2, 3), oid=o)
    for dx in (-3.4, 3.0):
        box(X + dx, Y - 0.7, 0, X + dx + 0.5, Y + 0.7, 2.6, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    for k, (dx, dy, h, r) in enumerate(((22.0, 15.0, 2.6, 'wood'), (24.6, 15.4, 2.0, 'ochre'), (23.0, 15.2, 2.0, 'cream'))):
        X, Y = F.w(dx, dy)
        TW.crate_box(X - 1.2, Y - 1.2, 0 if k < 2 else 2.6, 2.4, 2.4, h, ramp=r, oid=o)
    X, Y = F.w(-A - 3.0, 6.0)
    TW.barrel(r=1.4, h=4.6, oid=o, x=X, y=Y)
    return o


def depot_letters():
    F = Frame('s')
    w = text_width(TOWN_NAME) / 2.0
    F.text('s', w / 2.0, 4.6 * UY + 5.6, TOWN_NAME, 'wood', 4, plane=28.0 + 2.8)


def tank():
    """A round stave tank on a braced four-post tower, a conical roof, a spout swung back, a ladder; about 10u."""
    o = new_oid(True)
    r_leg = 7.0
    zt = 5.0 * UY
    for (x, y) in ((-r_leg, -r_leg), (r_leg, -r_leg), (-r_leg, r_leg), (r_leg, r_leg)):
        box(x - 0.8, y - 0.8, 0, x + 0.8, y + 0.8, zt, 'wood', shades=(1, 2, 3), oid=o)
    for z0 in (8.0, 18.0):
        box(-r_leg, r_leg - 0.4, z0, r_leg, r_leg + 0.4, z0 + 0.8, 'wood', shades=(0, 1, 2), oid=o, cast=False)
        box(r_leg - 0.4, -r_leg, z0, r_leg + 0.4, r_leg, z0 + 0.8, 'wood', shades=(0, 1, 2), oid=o, cast=False)
    for k in range(12):                         # the X braces on the two seen faces
        t = k / 11.0
        box(-r_leg + 2 * r_leg * t - 0.3, r_leg - 0.2, 1.0 + 25.0 * t, -r_leg + 2 * r_leg * t + 0.3, r_leg + 0.3,
            2.0 + 25.0 * t, 'wood', shades=(1, 2, 3), oid=o, cast=False)
        box(r_leg - 0.2, -r_leg + 2 * r_leg * t - 0.3, 26.0 - 25.0 * t, r_leg + 0.3, -r_leg + 2 * r_leg * t + 0.3,
            27.0 - 25.0 * t, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    box(-r_leg - 1.0, -r_leg - 1.0, zt, r_leg + 1.0, r_leg + 1.0, zt + 1.2, 'wood', shades=(0, 2, 3), oid=o)
    def staves(face, X, Y, Z, idx):
        ang = np.arctan2(Y, X)
        ii = np.where(np.mod(ang * 9.0, 1.0) < 0.15, clampi(idx + 1), idx)
        hoop = (np.mod(Z - zt, 5.0) < 0.6)
        return np.where(hoop, R('iron'), R('wood')), np.where(hoop, 3, ii)
    cyl_z(0, 0, zt + 1.2, zt + 20.0, 9.0, 'wood', oid=o, tex=staves)
    n = 8
    for k in range(n):                          # the conical roof as stacked rings
        r = 9.8 * (1 - k / n) + 0.3
        cyl_z(0, 0, zt + 20.0 + k * 0.9, zt + 20.9 + k * 0.9, r, 'roof', oid=o, topidx=1)
    box(-0.3, -0.3, zt + 27.0, 0.3, 0.3, zt + 30.0, 'iron', shades=(1, 2, 3), oid=o)
    # the spout, swung up along the tank's +z side, and its rope
    box(-1.0, 8.8, zt + 6.0, 1.0, 10.6, zt + 8.0, 'iron', shades=(1, 2, 3), oid=o)
    for k in range(6):
        box(-0.9, 10.0 + k * 0.4, zt + 7.0 - k * 2.0, 0.9, 11.2 + k * 0.4, zt + 8.6 - k * 2.0, 'iron', shades=(1, 2, 3),
            oid=o, cast=False)
    box(-0.15, 13.0, 4.0, 0.15, 13.3, zt + 0.0, 'straw', shades=(2, 2, 3), oid=o, cast=False)
    # a ladder up the +x side
    for z in np.arange(1.0, zt + 18.0, 2.2):
        box(9.6, -1.4, z, 10.2, 1.4, z + 0.4, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    for y in (-1.6, 1.2):
        box(9.6, y, 0, 10.2, y + 0.4, zt + 19.0, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    return o


def grainstore():
    """A grain elevator (8 x 8u, 13u to its head house) with a sacking shed and a dock on its +x side."""
    F = Frame('s')
    o = new_oid(True)
    A = 14.0
    zt = 11.0 * UY
    def cribbed(lf, u, z, a, b, idx, lit):
        p = Paint('ochre', u, z, idx, lit)
        p.clapboard(2.0, 0.6)
        p.fill(np.mod(z, 18.0) < 1.0, 'wood', clampi(idx + 2))
        if lf == 'f':
            p.fill(rect(a, z, -6.5, 6.5, zt - 9.0, zt - 1.6), 'wood', 3)
            p.door(-3.0, 3.0, T.DOOR_H + 2.0, ramp='wood', trim='cream', double=True, panels=False)
            for zz in (24.0, 38.0):
                p.window(-1.6, 1.6, zz, zz + 4.0, trim='cream', panes=(1, 1), sill=False)
        if lf == 's':
            p.window(-1.6, 1.6, 40.0, 44.0, trim='cream', panes=(1, 1), sill=False)
        return p.rr, p.ii
    F.box(-A, -A, 0, A, A, zt, 'ochre', paint=cribbed, oid=o)
    F.roof_across(-A - 1.0, A + 1.0, 0, A + 1.4, zt - 0.4, zt + 9.0, 'iron', wall='ochre', oid=o, tex=T.roof_tex('tin'),
                  endtex=lambda f, X, Y, Z, i: (np.full(X.shape, R('ochre')), np.where(np.mod(Z, 2.0) < 0.6, 3, 2)))
    # the head house on the ridge (the cupola over the bucket leg)
    hb = zt + 6.0
    def head(lf, u, z, a, b, idx, lit):
        p = Paint('ochre', u, z, idx, lit)
        p.clapboard(2.0, 0.6)
        if lf in ('f', 's'):
            g = rect(a if lf == 'f' else b, z, -1.4, 1.4, hb + 4.0, hb + 8.0)
            p.fill(g, 'glass', 3)
        return p.rr, p.ii
    F.box(-4.0, -5.0, hb, 4.0, 5.0, hb + 11.0, 'ochre', paint=head, oid=o)
    F.roof_across(-5.0, 5.0, 0, 6.4, hb + 10.6, hb + 15.0, 'iron', wall='ochre', oid=o, tex=T.roof_tex('tin'),
                  endtex=lambda f, X, Y, Z, i: (np.full(X.shape, R('ochre')), np.full(X.shape, 2)))
    # the loading spout from the head house down over the track side, and a ladder up the front
    for k in range(30):
        X, Y = F.w(-8.0, A + 1.0 + k * 0.42)
        box(X - 0.7, Y - 0.7, zt + 2.0 - k * 1.25, X + 0.7, Y + 0.7, zt + 4.0 - k * 1.25, 'iron', shades=(1, 2, 3), oid=o,
            cast=False)
    for z in np.arange(1.0, zt - 1.0, 2.2):
        F.box(8.0, A, z, 10.6, A + 0.6, z + 0.4, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    for a in (8.0, 10.2):
        F.box(a, A, 0, a + 0.4, A + 0.6, zt, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    # the sacking shed to +x, a dock along its front, sacks and a barrow
    def shed(lf, u, z, a, b, idx, lit):
        p = Paint('wood', u, z, idx, lit)
        p.battens(2.6, 0.5, 1.0, u=(a if lf in 'fk' else b))
        if lf == 'f':
            p.door(A + 6.0, A + 14.0, 15.0, ramp='wood', trim='cream', double=True, panels=False)
        return p.rr, p.ii
    F.box(A, -A + 4.0, 0, A + 22.0, A - 2.0, 4.4 * UY, 'wood', paint=shed, oid=o)
    for k in range(4):
        bb = -A + 3.0 + k * 6.8
        F.box(A - 0.4, bb, 4.4 * UY + (3 - k) * 0.9, A + 22.6, bb + 7.2, 4.4 * UY + (3 - k) * 0.9 + 0.9, 'iron',
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(a, 2.0) < 0.6, clampi(idx + 1), idx)), oid=o)
    F.box(A, A - 2.0, 0, A + 22.0, A + 4.0, 1.0 * UY, 'wood', paint=T.planks_top, oid=o)
    for k, (a, b) in enumerate(((A + 3.0, A + 1.0), (A + 5.4, A + 1.4), (A + 4.2, A + 0.6), (A + 17.0, A + 1.4),
                                (A + 19.4, A + 1.0))):
        X, Y = F.w(a, b)
        TW.sack_shape(X, Y, 1.0 * UY + (2.0 if k == 2 else 0.0), ramp='cream' if k % 2 else 'straw', oid=o)
    return o


def grain_letters():
    F = Frame('s')
    s = 'GRAIN'
    w = text_width(s) / 2.0
    F.text('f', -w / 2.0, 11.0 * UY - 2.6, s, 'cream', 0, plane=14.0)


def hotel2():
    """The town's hotel drawn again in brick with cream trim and a green gallery, its sign GRAND HOTEL."""
    sp0 = T.SPECS['hotel']
    T.SPECS['hotel'] = dict(sp0, wall='brick', tex='brick', trim='cream', awn='green', sign='GRAND HOTEL',
                            board=('green', 1), letters=('n', 'cream', 0), side_ad=('BATHS', 'cream', 0))
    try:
        T.walk('hotel')
        T.body('hotel')
        T.awning('hotel')
    finally:
        T.SPECS['hotel'] = sp0


def hotel2_letters():
    sp0 = T.SPECS['hotel']
    T.SPECS['hotel'] = dict(sp0, wall='brick', tex='brick', trim='cream', awn='green', sign='GRAND HOTEL',
                            board=('green', 1), letters=('n', 'cream', 0), side_ad=('BATHS', 'cream', 0))
    try:
        T.side_letters('hotel')
        T.front_letters('hotel')
    finally:
        T.SPECS['hotel'] = sp0


def sign():
    """The town's name on a board between two posts, its face to +z; anchor between the posts' feet."""
    o = new_oid(True)
    w = text_width(TOWN_NAME) / 2.0 + 3.0
    for x in (-w / 2.0 + 0.6, w / 2.0 - 0.6):
        box(x - 0.5, -0.5, 0, x + 0.5, 0.5, 13.0, 'wood', shades=(1, 2, 3), oid=o)
    box(-w / 2.0, -0.4, 7.0, w / 2.0, 0.4, 13.6, 'cream', shades=(1, 1, 2), oid=new_oid(True))
    box(-w / 2.0 - 0.4, -0.5, 13.6, w / 2.0 + 0.4, 0.6, 14.3, 'wood', shades=(0, 1, 2), oid=o)
    for k in range(5):                         # a few tufts at the posts' feet
        x = -w / 2.0 + 0.6 + (k - 2) * 0.9
        sphere(x, 1.0, 0.4, 0.8, 'sage', oid=o, cast=False)


def sign_letters():
    w = text_width(TOWN_NAME) / 2.0
    TW.text_on('l', -w / 2.0, 0.4, 12.0, TOWN_NAME, 'wood', 4)


def register(reg, group):
    import town27_reg as TR
    BIG = dict(canvas=(500, 440), origin=(250, 320))
    MID = dict(canvas=(300, 260), origin=(150, 190))
    items = [
        ('far/depot', depot, depot_letters, BIG, dict(anchor='the depot\'s footprint centre at ground level',
                                                      footprint=[14, 6], note='its track side (bay, doors) to +z; '
                                                      'the name board on the +x gable reads ' + TOWN_NAME + ' (provisional)')),
        ('far/tank', tank, None, MID, dict(anchor='the foot of the tower\'s centre at ground level', footprint=[4, 4],
                                           note='a stave tank on a braced tower, about 10u tall; spout to +z')),
        ('far/grainstore', grainstore, grain_letters, BIG, dict(anchor='the elevator\'s footprint centre at ground level',
                                                                footprint=[13, 9],
                                                                note='the elevator 7 x 7u, door to +z; the sacking shed and '
                                                                     'its dock run 5.5u to +x')),
        ('far/hotel2', hotel2, hotel2_letters, BIG, dict(anchor='the lot centre at ground level, as bld/shop_hotel/e',
                                                         footprint=[12, 12], note='front (gallery) to +x, as the town\'s '
                                                         'west row; boardwalk included')),
        ('far/sign', sign, sign_letters, MID, dict(anchor='between the posts\' feet at ground level',
                                                   note='the name board, face to +z: ' + TOWN_NAME + ' (provisional)')),
    ]
    for key, draw, after, opts, meta in items:
        reg.add(key, group, TR.one(draw, after=after, **opts), meta)
