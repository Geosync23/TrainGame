# Registers the D27 town art (A3): the twelve street buildings by parts, the church, the school, four houses, the
# street furniture and props. Called from sprites_town.register (that module owns the bld/ and prop/ keys).
# Keys and anchors are listed in plans/proto-sprites.md, section "D27: town buildings, nature, props (A3)".
import math
import numpy as np
import harness as H
import pal27  # noqa: F401
import town27 as T
import props27 as P
from town import Frame

U = 4.0
UY = 16.0 / 3.0
BIG = dict(canvas=(500, 440), origin=(250, 320))
MID = dict(canvas=(300, 260), origin=(150, 190))
LOT = 'the lot centre at ground level (y = 0): x = -15.5 (west row) or 15.5 (east row), z = the lot\'s z'
BOXNOTE = '[x0, z0, x1, z1, height] in u from the anchor: sort the part on this box'


def _pad(frames):
    out = []
    for img, (ax, ay) in frames:
        h, w = img.shape[:2]
        l, t = max(0, -ax), max(0, -ay)
        r, b = max(0, ax + 1 - w), max(0, ay + 1 - h)
        if l or t or r or b:
            img = np.pad(img, ((t, b), (l, r), (0, 0)))
            ax, ay = ax + l, ay + t
        out.append((img, (ax, ay)))
    return out


def one(draw, **kw):
    o = dict(BIG)
    o.update(kw)
    return _pad([H.render(draw, **o)])


def shadow_only(draw, rect, **kw):
    """The cast shadow of a drawing on the ground, alone (the 50% checker comes from build.hard_alpha)."""
    o = dict(BIG)
    o.update(kw)
    img, an = H.render(draw, shadow=rect, outline=False, **o)
    sh = img[..., 3] == 92
    out = np.zeros_like(img)
    out[sh] = img[sh]
    ys, xs = np.nonzero(sh)
    if not len(ys):
        return None
    r0, c0 = ys.min(), xs.min()
    return _pad([(out[r0:ys.max() + 1, c0:xs.max() + 1].copy(), (an[0] - c0, an[1] - r0))])


def u(v):
    return round(v / U, 2)


def dressing(kind):
    """Suggested street furniture for the lot (keys and spots in u from the lot's anchor, world axes), so the
    foundation (TOWN27) can place them; W may move them."""
    F = Frame(T.facing(kind))
    west = T.SPECS[kind]['row'] == 'w'
    items = {
        'store': [('prop/barrels', -17.0, 28.5), ('prop/crates', 17.5, 28.0), ('prop/bench_' + ('e' if west else 'w'), -9.0, 25.6),
                  ('prop/hitch_z', -12.0, 37.0), ('prop/trough_z', 12.0, 37.5), ('prop/lamp', 23.0, 33.4)],
        'hotel': [('prop/bench_e', 12.0, 25.6), ('prop/bench_e', -12.0, 25.6), ('prop/hitch_z', 0.0, 37.0),
                  ('prop/lamp_lit', -23.0, 33.4)],
        'bank': [('prop/lamp', 21.0, 33.4), ('prop/lamp', -21.0, 33.4)],
        'smithy': [('prop/anvil', -16.0, 28.5), ('prop/wheels', 17.0, 25.2), ('prop/barrel', -21.0, 31.0),
                   ('prop/hitch_z', 8.0, 37.0)],
        'livery': [('prop/trough_z', -14.0, 37.5), ('prop/hitch_z', 14.0, 37.0), ('prop/sacks', 18.0, 28.0)],
        'feed': [('prop/sacks', -14.0, 27.5), ('prop/sacks', -8.0, 27.0), ('prop/barrels', 17.0, 28.5),
                 ('prop/wagon_z', 6.0, 46.0)],
        'saloon': [('prop/hitch_z', -10.0, 37.0), ('prop/hitch_z', 10.0, 37.0), ('prop/trough_z', 0.0, 37.5),
                   ('prop/barrels', -19.0, 28.5), ('prop/lamp_lit', 23.0, 33.4)],
        'newspaper': [('prop/crates', 16.0, 28.0), ('prop/notices', -20.0, 32.5)],
        'barber': [('prop/bench_w', 10.0, 25.6), ('prop/hitch_z', -8.0, 37.0)],
        'sheriff': [('prop/notices', 18.0, 32.5), ('prop/bench_w', -8.0, 25.6), ('prop/hitch_z', 8.0, 37.0)],
        'undertaker': [('prop/crates', -17.0, 28.0)],
        'assay': [('prop/sacks', 15.0, 28.0), ('prop/lamp', -23.0, 33.4)],
    }[kind]
    out = []
    for key, a, b in items:
        X, Y = F.w(a, b)
        out.append([key, u(X), u(Y)])
    # horses at the rails: they stand in the street, along x, heads to the rail
    for key, a, b in items:
        if key == 'prop/hitch_z':
            X, Y = F.w(a + 2.0, b + 7.0)
            out.append(['prop/horse/' + ('w' if west else 'e') + '/bay', u(X), u(Y)])
            break
    return out


def register(reg):
    # ---------------- the twelve street buildings ----------------
    for kind in T.SPECS:
        f = T.facing(kind)
        sp = T.SPECS[kind]
        parts = {
            'walk': (lambda k=kind: T.walk(k), None, dict(outline=False, shadows=False)),
            'body': (lambda k=kind: T.body(k),
                     lambda k=kind: (T.side_letters(k), T.front_letters(k), T.livery_letters() if k == 'livery' else None), {}),
        }
        if sp['awning'] not in (None, 'dock'):
            parts['awning'] = (lambda k=kind: T.awning(k), None, {})
        if sp['row'] == 'e':
            parts['sign'] = (lambda k=kind: T.hanging_sign(k), lambda k=kind: T.hanging_sign_letters(k), {})
            parts['yard'] = (lambda k=kind: T.yard(k), None, {})
        names = []
        for part, (draw, after, opts) in parts.items():
            key = f'bld/shop_{kind}/{f}/{part}'
            names.append(key)
            meta = dict(anchor=LOT, box=T.part_box(kind, part), box_note=BOXNOTE)
            if part == 'body':
                meta.update(door=T.door_spot(kind), door_note='the delivery spot on the boardwalk, u from the anchor',
                            facing=f, front={'e': '+x', 'w': '-x'}[f], footprint=[12, 16 if kind == 'livery' else 12],
                            dressing=dressing(kind), dressing_note='suggested props: [key, x, z] in u from the anchor')
            reg.add(key, 'town27_' + ('w' if f == 'e' else 'e'), one(draw, after=after, **opts), meta)
        if kind == 'barber':
            key = f'bld/shop_barber/w/pole'
            names.append(key)
            reg.add(key, 'town27_e', [one(lambda fr=fr: T.barber_pole(fr))[0] for fr in (0, 1)],
                    dict(anchor=LOT, box=T.part_box(kind, 'pole'), box_note=BOXNOTE, note='2 frames: the stripes turn'))
        def everything(k=kind):
            T.body(k)
            if T.SPECS[k]['awning'] not in (None, 'dock'):
                T.awning(k)
            if T.SPECS[k]['row'] == 'e':
                T.yard(k); T.hanging_sign(k)
        sh = shadow_only(everything, T.shadow_rect(kind))
        if sh:
            key = f'bld/shop_{kind}/{f}/shadow'
            reg.add(key, 'town27_shadow', sh,
                    dict(anchor=LOT, box=T.part_box(kind, 'walk'), box_note='flat: draw after the walk and before anything upright',
                         note='the building\'s cast shadow on the ground (50% ink checker)'))
    # ---------------- church, school, houses ----------------
    reg.add('bld/church', 'town27_civic', one(T.church),
            dict(anchor='the church\'s footprint centre (0, -128) at ground level; front (door, tower) to +z', footprint=[10, 16],
                 box=[-5.0, -8.0, 5.0, 8.0, 16.0], box_note=BOXNOTE))
    sh = shadow_only(T.church, (-120, -120, 160, 100))
    reg.add('bld/church/shadow', 'town27_shadow', sh, dict(anchor='as bld/church', note='cast shadow, flat'))
    reg.add('bld/school', 'town27_civic', one(T.school, after=T.school_letters),
            dict(anchor='the school\'s footprint centre at ground level; door to +z', footprint=[8, 11],
                 box=[-4.0, -5.5, 4.0, 7.5, 7.5], box_note=BOXNOTE))
    sh = shadow_only(T.school, (-100, -100, 140, 90))
    reg.add('bld/school/shadow', 'town27_shadow', sh, dict(anchor='as bld/school', note='cast shadow, flat'))
    for k in range(4):
        for f in ('e', 'w'):
            reg.add(f'bld/house/{k + 1}/{f}', 'town27_civic', one(lambda k=k, f=f: T.house(k, f), **MID),
                    dict(anchor='the house lot\'s centre (8 x 8u) at ground level', footprint=[8, 8], facing=f,
                         front={'e': '+x (door to the west back lane)', 'w': '-x (seen from behind)'}[f],
                         box=T.house_box(k, f), box_note=BOXNOTE))
    # ---------------- street furniture and props ----------------
    CTR = 'centre at ground level'
    props = [
        ('prop/hitch_z', lambda: P.hitch('z'), 'centre; 3u long along z (along the street)'),
        ('prop/hitch_x', lambda: P.hitch('x'), 'centre; 3u long along x'),
        ('prop/trough_z', lambda: P.trough('z'), 'centre; 2.2u along z'),
        ('prop/trough_x', lambda: P.trough('x'), 'centre; 2.2u along x'),
        ('prop/barrel', P.barrel1, 'centre of the base; 0.85u across, 1.3u tall'),
        ('prop/barrels', P.barrels3, 'centre of the group'),
        ('prop/crates', P.crates3, 'centre of the stack'),
        ('prop/sacks', P.sacks, 'centre of the pile'),
        ('prop/bench_e', lambda: P.bench('e'), 'centre; 2.4u along z, the seat faces +x (west-row boardwalks)'),
        ('prop/bench_w', lambda: P.bench('w'), 'centre; 2.4u along z, the seat faces -x (east row: its back is seen)'),
        ('prop/bench_s', lambda: P.bench('s'), 'centre; 2.4u along x, the seat faces +z (platform 1\'s benches face the track)'),
        ('prop/lamp', lambda: P.lamppost(False), 'foot of the post; 3.6u tall'),
        ('prop/lamp_lit', lambda: P.lamppost(True), 'foot of the post; evening'),
        ('prop/wagon_z', lambda: P.wagon('z'), 'centre of the bed at ground level; along z, the tongue on the ground towards -z'),
        ('prop/wagon_x', lambda: P.wagon('x'), 'centre of the bed; along x, tongue to +x'),
        ('prop/wagon_cov_z', lambda: P.wagon('z', True), 'a covered (emigrant) wagon along z'),
        ('prop/wagon_cov_x', lambda: P.wagon('x', True), 'a covered wagon along x'),
        ('prop/telegraph', P.telegraph_pole, 'foot of the pole; 6u; crossarm along x (the line follows track 2)'),
        ('prop/woodpile', P.woodpile, 'centre; 3u along x, the cut ends to +z'),
        ('prop/privy', P.privy_prop, 'centre; 1.1 x 1.1u, door to +z'),
        ('prop/water_barrel', P.rain_barrel_prop, 'centre of the base (a rain barrel)'),
        ('prop/washline', P.washing_line_prop, 'centre; 5u along x'),
        ('prop/corral_x', lambda: P.corral('x'), 'the post at the -x end; a 4u section along x'),
        ('prop/corral_z', lambda: P.corral('z'), 'the post at the +z end; a 4u section running towards -z'),
        ('prop/corral_gate', P.corral_gate, 'centre; 4u along x'),
        ('prop/anvil', P.anvil, 'centre of the block'),
        ('prop/wheels', P.wheel_lean, 'foot of the wheels; leaning on a wall at -x, faces to +x'),
        ('prop/notices', P.notice_board, 'between the posts; the face to +z'),
        ('prop/wash_bridge', P.wash_bridge, 'centre of the deck at ground level; 8u along x over the dry wash, deck 0.56u up'),
        ('prop/freight_tarp', P.lever_crate_stack, 'centre; crates under a tarpaulin (the depot square)'),
    ]
    for key, fn, note in props:
        reg.add(key, 'town27_props', one(fn, **MID), dict(anchor=note))
    reg.add('bld/watertower', 'town27_props', one(P.water_tower, **MID),
            dict(anchor='the centre of the trestle at ground level; tank 4u across, spout to +z, about 9u tall',
                 footprint=[3.6, 3.6]))
    for key, lit in (('bld/lamp', False), ('bld/lamp_lit', True)):
        reg.add(key, 'town27_props', one(lambda lit=lit: P.lamppost(lit), **MID), dict(anchor='foot of the post (same as prop/lamp)'))
    for d in ('e', 'w'):
        for coat in ('bay', 'grey', 'dun'):
            reg.add(f'prop/horse/{d}/{coat}', 'town27_props',
                    [one(lambda fr=fr, c=coat, d=d: P.horse(fr, c, d=d), shadows=False, **MID)[0] for fr in (0, 1)],
                    dict(anchor='under the horse\'s middle on the ground; it stands along x, head to ' + ('+x' if d == 'e' else '-x'),
                         note='2 frames: the tail hangs, then flicks out (play 0 long, 1 short)'))
