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


def lit_pair(draw, after=None, halo=2, fire_halo=False, **kw):
    """(day, night) frames from one render (night27.render_pair): the same size and anchor, only the lit pixels
    (window glass, lamps and the warm halo round a lamp) differ."""
    import night27 as N
    o = dict(BIG)
    o.update(kw)
    day, night = N.render_pair(draw, after=after, halo=halo, fire_halo=fire_halo, **o)
    day, night = _pad([day])[0], _pad([night])[0]
    assert day[0].shape == night[0].shape and day[1] == night[1]
    assert ((day[0][..., 3] > 0) == (night[0][..., 3] > 0)).all()
    return day, night


def add_lit(reg, key, group, day_frames, pair, meta):
    """Register key (the night version) after checking that its day picture is the registered day sprite."""
    day, night = pair
    d0 = day_frames[0]
    assert d0[0].shape == day[0].shape and tuple(d0[1]) == tuple(day[1]) and (d0[0] == day[0]).all(), key
    reg.add(key, group, [night], meta)


LITNOTE = ('the night version: the same size and anchor as the day sprite; only the lit pixels differ (windows '
           'glowing, door lamps burning with a warm halo on the wall)')


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
            frames = one(draw, after=after, **opts)
            reg.add(key, 'town27_' + ('w' if f == 'e' else 'e'), frames, meta)
            if part == 'body':
                add_lit(reg, key + '_lit', 'town27_' + ('w' if f == 'e' else 'e'), frames,
                        lit_pair(draw, after=after, **opts),
                        dict(anchor=LOT, box=meta['box'], box_note=BOXNOTE, door=meta['door'], note=LITNOTE))
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
    cm = dict(anchor='the church\'s footprint centre (0, -128) at ground level; front (door, tower) to +z', footprint=[10, 16],
              box=[-5.0, -8.0, 5.0, 8.0, 16.0], box_note=BOXNOTE)
    fr = one(T.church)
    reg.add('bld/church', 'town27_civic', fr, cm)
    add_lit(reg, 'bld/church_lit', 'town27_civic', fr, lit_pair(T.church), dict(cm, note=LITNOTE))
    sh = shadow_only(T.church, (-120, -120, 160, 100))
    reg.add('bld/church/shadow', 'town27_shadow', sh, dict(anchor='as bld/church', note='cast shadow, flat'))
    sm = dict(anchor='the school\'s footprint centre at ground level; door to +z', footprint=[8, 11],
              box=[-4.0, -5.5, 4.0, 7.5, 7.5], box_note=BOXNOTE)
    fr = one(T.school, after=T.school_letters)
    reg.add('bld/school', 'town27_civic', fr, sm)
    add_lit(reg, 'bld/school_lit', 'town27_civic', fr, lit_pair(T.school, after=T.school_letters), dict(sm, note=LITNOTE))
    sh = shadow_only(T.school, (-100, -100, 140, 90))
    reg.add('bld/school/shadow', 'town27_shadow', sh, dict(anchor='as bld/school', note='cast shadow, flat'))
    for k in range(4):
        for f in ('e', 'w'):
            hm = dict(anchor='the house lot\'s centre (8 x 8u) at ground level', footprint=[8, 8], facing=f,
                      front={'e': '+x (door to the west back lane)', 'w': '-x (seen from behind)'}[f],
                      box=T.house_box(k, f), box_note=BOXNOTE)
            fr = one(lambda k=k, f=f: T.house(k, f), **MID)
            reg.add(f'bld/house/{k + 1}/{f}', 'town27_civic', fr, hm)
            add_lit(reg, f'bld/house/{k + 1}/{f}_lit', 'town27_civic', fr,
                    lit_pair(lambda k=k, f=f: T.house(k, f), **MID), dict(hm, note=LITNOTE))
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


def register_station(reg):
    """The D27 station area: depot (day and lit), canopy, schedule board, freight house, footbridges, lever frames."""
    import station27 as S
    cx, cz = S.ST_CENTRE
    A, B = S.ST['a'] / U, S.ST['b'] / U
    stn = dict(anchor=f'the depot\'s footprint centre ({cx}, {cz}) at ground level; front (+z) on platform 1\'s back edge',
               footprint=[18, 9], height=8.0, front='+z (platform 1)',
               box=[-A, -B, A, B + 0.75, 8.0], box_note=BOXNOTE,
               door=[-3.8, B + 0.8], door_note='the waiting-room door\'s spot on platform 1, u from the anchor',
               ticket=[-1.4, B + 0.8], ticket_note='in front of the ticket window, u from the anchor',
               note='a storey and a half: dormers to the platform, a telegrapher\'s bay, RAILHEAD on the +x gable')
    after = lambda: (S.station_name(), S.station_letters())
    reg.add('bld/station', 'town27_station', one(S.station_all, after=after), stn)
    reg.add('bld/station_lit', 'town27_station', one(lambda: S.station_all(True), after=after),
            dict(stn, note='the same depot at night: windows lit'))
    reg.add('bld/canopy', 'town27_station', one(S.canopy, canvas=(640, 420), origin=(320, 300)),
            dict(anchor=f'the canopy\'s centre {S.CAN_CENTRE} at ground level', footprint=[30, 6], underside=4.2,
                 box=S.canopy_box(), box_note=BOXNOTE,
                 note='posts every 5u along z -11.6 on platform 1; fade it when the player is under it'))
    img = one(S.schedboard, after=S.schedboard_letters, **MID)
    ax, ay = img[0][1]
    reg.add('bld/schedboard', 'town27_station', img,
            dict(anchor='between the two posts at ground level (14, -16.9)', footprint=[3.6, 0.5],
                 board=S.schedboard_area(ax, ay), box=[-1.8, -0.2, 1.8, 0.5, 3.4], box_note=BOXNOTE))
    fha = f'the freight house\'s footprint centre {S.FH_CENTRE} at ground level (its floor is the cargo deck, 1.6u)'
    fm = dict(anchor=fha, box=S.fh_box('body'), box_note=BOXNOTE, footprint=[16, 6],
              note='back wall, end walls, posts along the open (track 3) side, shelves, the scale and the desk')
    fr = one(S.freighthouse_body)
    reg.add('bld/freighthouse/body', 'town27_station', fr, fm)
    add_lit(reg, 'bld/freighthouse/body_lit', 'town27_station', fr, lit_pair(S.freighthouse_body, halo=3, fire_halo=True),
            dict(fm, note='the night version (same size and anchor): the lantern on the middle post and the desk lamp '
                          'burning, with their light on the posts, the desk and the shelves'))
    reg.add('bld/freighthouse/roof', 'town27_station', one(S.freighthouse_roof),
            dict(anchor=fha, box=S.fh_box('roof'), box_note=BOXNOTE, underside=round(S.FH_UNDER / UY, 2),
                 note='the roof alone, to fade like the canopy when the player is under it'))
    FBA = 'the bridge anchor: x = the bridge centre line (-14 or 14), z = 0 (track 2), ground level; draw every part there'
    boxes = S.footbridge_boxes()
    parts = {'deck': S.footbridge_deck, 'rail': S.footbridge_rail}
    for k in range(3):
        parts[f'bent{k}'] = (lambda k=k: S.footbridge_bent(k))
    for plat in ('p1', 'p2'):
        for d in ('e', 'w'):
            parts[f'stair_{plat}_{d}'] = (lambda p=plat, d=d: S.footbridge_stair(p, d))
            parts[f'stair_{plat}_{d}_rail'] = (lambda p=plat, d=d: S.footbridge_stair_rail(p, d))
    notes = {'deck': 'the span (z -10.3 to 5.0, top 7.6u, underside 7.2u) with its floor and far railing',
             'rail': 'the near (+x) railing of the span: draw it after walkers on the deck',
             'bent0': 'trestle bent on platform 1', 'bent1': 'thin post pair at z -3 between tracks 1 and 2',
             'bent2': 'trestle bent on the cargo platform (its feet at 1.6u)'}
    for nm, fn in parts.items():
        ex = dict(boxes[nm])
        bx = ex.pop('box')
        note = notes.get(nm, ('flight from platform 1' if 'p1' in nm else 'flight from the cargo platform') +
                         (' (near handrail)' if nm.endswith('_rail') else ', 28 steps') +
                         ', running down towards ' + ('+x' if '_e' in nm else '-x'))
        reg.add(f'bld/footbridge/{nm}', 'town27_bridge', one(fn), dict(anchor=FBA, note=note, box=bx, height=ex))
    for side in ('W', 'E'):
        reg.add(f'bld/leverframe/{side}', 'town27_station',
                one(S.leverframe, after=lambda s=side: S.leverframe_letters(s), **MID),
                dict(anchor='the stage\'s centre at ground level: west frame (-33, -11), east frame (33, -11)',
                     footprint=[3, 2], box=[-1.5, -1.0, 1.5, 1.0, 2.4], box_note=BOXNOTE,
                     levers=[[round(x / U, 2), 0.0] for x in S.LEVER_X],
                     levers_note='where to draw bld/lever/N|R, u from the frame\'s anchor: lever 1 (W1/E1) then lever 2 '
                                 '(W3/E3); the number board reads ' + side + '1 ' + side + '3',
                     use=[0.0, 1.6], use_note='where the agent stands to pull (south of the frame), u from the anchor'))
    # D29: the one lever frame (all four levers at platform 1's back edge near the middle).
    reg.add('bld/leverframe/C', 'town27_station',
            one(S.leverframe4, after=S.leverframe4_letters, **MID),
            dict(anchor='the stage\'s centre at ground level (D29: just off platform 1\'s west end beside track 1, (-34.5, -11))',
                 footprint=[6, 2], box=[-3.0, -1.0, 3.0, 1.0, 2.4], box_note=BOXNOTE,
                 levers=[[round(x / U, 2), 0.0] for x in S.LEVER_X4],
                 levers_note='where to draw bld/lever/N|R, u from the frame\'s anchor: W1, W3, E1, E3 (west to east); '
                             'the number board reads W1 W3 E1 E3',
                 use=[0.0, -1.4], use_note='where the agent stands to pull (behind the frame, -z, as the game has it), u from the anchor'))
    for st in ('N', 'R'):
        reg.add(f'bld/lever/{st}', 'town27_station', one(lambda st=st: S.lever(st), **MID),
                dict(anchor='the lever\'s pivot foot at ground level (draw at the frame\'s anchor + extra.levers[i])',
                     note={'N': 'normal: standing back (towards -z)', 'R': 'reversed: pulled over towards +z'}[st]))
    reg.add('bld/rodding_x', 'town27_station', one(S.rodding, **MID),
            dict(anchor='the -x end of 2u of point rodding along x, at ground level (rods on stools)'))
    reg.add('bld/rodding_z', 'town27_station', one(lambda: S.rodding('z'), **MID),
            dict(anchor='the -z end of 2u of point rodding along z, at ground level (rods on stools); repeat it every 2u',
                 box=[-0.2, 0.0, 0.2, 2.0, 0.35], box_note=BOXNOTE))
    CRANK = ('the turn point (where the two runs\' centre lines meet) at ground level. The runs leave it the way the '
             'arms point: e.g. for arms e and s, draw bld/rodding_x with its -x end here and bld/rodding_z with its -z end '
             'here; a run the other way (w or n) starts 2u back (its anchor at the turn point minus 2u)')
    for arms in ('es', 'ws', 'en', 'wn'):
        key = 'bld/rodding_crank' + ('' if arms == 'es' else '/' + arms[0] + '_' + arms[1])
        reg.add(key, 'town27_station', one(lambda a=arms: S.rodding_crank(a), **MID),
                dict(anchor=CRANK, arms={'e': '+x', 'w': '-x'}[arms[0]] + ' and ' + {'s': '+z', 'n': '-z'}[arms[1]],
                     box=[-0.35, -0.35, 0.35, 0.35, 0.35], box_note=BOXNOTE,
                     note='a bell crank on a timber baulk' + (' (the usual turn: arms to +x and +z; the other three '
                          'turns are bld/rodding_crank/w_s, /e_n, /w_n)' if arms == 'es' else '')))
