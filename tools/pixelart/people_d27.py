# People for D27 (plans/d27-tech.md section 7.1), drawn with the signed-off people v2 rig (people.py), same size,
# palette, light and outline rule; people.py itself is unchanged, so every signed-off frame stays byte for byte.
#
# What is added here:
#   travellers (16 keys): sit 2, sitTicket 2, sitDown 2, standUp 2, climb 2, benchSit 1 (seated on coach seats or
#     platform benches; all four facings drawn)
#   the agent: lift 3, shoulder idle 2 + walk 4, roll 4, drag 4, truck 4, heave 4, stackHigh 3, door 3, climb 2,
#     handOver 2, and pull 4 (the cart pulled behind him; not in the plan's list, asked for by the lead)
#   the punched-ticket mark ppl/mark/punched/<dir>
#   new townsfolk: banker, hotelkeeper, vaquero, printer, barber, sheriff, undertaker, preacher, teacher, launderer,
#     storekeeper.b (the feed and seed man), cowhand.b (the second cowhand): idle 2, walk 4, talk 2, benchSit 1
#   the existing townsfolk (cowhand, smith, storekeeper, barkeep) and the travellers who stand in as townsfolk
#     (man_bowler, woman_shawl, child, each with .b): talk 2, benchSit 1 (travellers already have benchSit)
#
# Seated frames: the anchor is the point on the floor straight below the hips (the seat's centre at floor level),
# so the renderer puts a sitter at the seat's floor position; the seat top is 5 px (0.64u) above it.
import people as PE
from people import part

P = PE  # short

# ---------------------------------------------------------------------------------------------------------------
# New parts
# ---------------------------------------------------------------------------------------------------------------
PE.HATS.update({
    'sombrero': (part(16, [
        ".....JHh.....",
        "....JHHHh....",
        "....JHHhh....",
        "h..RRRRRrr..h",
        ".hkkkkkkkkkh.",
    ]),) * 2,
    'stovepipe': (part(16, [
        "....JHHh.....",
        "....JHHh.....",
        "....JHHh.....",
        "....JHHhh....",
        "....RRRRr....",
        "..kkkkkkkkk..",
    ]),) * 2,
    'parson': (part(16, [
        "....JHHHh....",
        "....RRRRr....",
        ".kkkkkkkkkkk.",
    ]),) * 2,
    'visor': (part(16, [
        ".....aAAa....",
        "...RRRRRRkkk.",
    ]), part(16, [
        ".....aAAa....",
        "...aRRRRRRa..",
    ])),
    'kerchief': (part(15, [
        "....JHHHh....",
        "...JHHHHHh...",
        "...Hh........",
    ]), part(14, [
        "....JHHHh....",
        "...JHHHHHh...",
        "...HHHHHhh...",
        "....HhHh.....",
    ])),
    'oiled': (part(16, [
        ".....aaaa....",
        "...aaAaaaa...",
    ]),) * 2,
})

PE.FACES.update({
    'specs': part(11, [
        "...aASSSSSs..",
        "...aSMeMeM...",
        "...aaSSSSSs..",
        "....aSSmS....",
        ".....aSSs....",
    ]),
    'gaunt': part(11, [
        "...aASSSSs...",
        "...asSeSeS...",
        "...sSSSSSs...",
        "....sSSms....",
        ".....SSs.....",
    ]),
})

PE.BODIES.update({
    # the vaquero: a short jacket open over a white shirt, silver conchos, a red sash
    'vaquero': (part(4, [
        "...ICWWWcq...",
        "...IGWWWGq...",
        "...ICWWWcq...",
        "...IGWWWGq...",
        "...IcWWWqq...",
        "...RRRRRrr...",
        "...QTTTtTt...",
    ]), part(4, [
        "...ICCCccq...",
        "...ICCCccq...",
        "...ICcCccq...",
        "...ICcCccq...",
        "...IcccqqW...",
        "...RRRRRrr...",
        "...QTTTtTt...",
    ])),
    # the printer: shirt sleeves, a necktie, a long ink-dark apron with a bib
    'printer': (part(2, [
        "...WWWNWww...",
        "...WWWNWww...",
        "...WPPPPpw...",
        "...WPPPPpw...",
        "...PPPPPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
    ]), part(2, [
        "...WWWWWww...",
        "...WNWWNww...",
        "...WWNNWww...",
        "...WNWWNww...",
        "...PPPPPpp...",
        "...QTTTtTt...",
        "...QTTTtTt...",
        "...QTT.tTt...",
        "...QTT.tTt...",
    ])),
    # the sheriff: shirt, string tie, dark vest with the star, gun belt
    'sheriff': (part(4, [
        "...VWNWWvv...",
        "...VGCNCvv...",
        "...VVCCCvv...",
        "...VVCGVvv...",
        "...VVCCVvv...",
        "...zZzGzZz...",
        "...QTTTtTt...",
    ]), part(4, [
        "...VWWWWvv...",
        "...VVVVVvv...",
        "...VVVvVvv...",
        "...VVVvVvv...",
        "...VVVvVvv...",
        "...zZzzzZz...",
        "...QTTTtTt...",
    ])),
    # the preacher: a black frock coat buttoned high, the white band of a clerical collar
    'clergy': (part(2, [
        "...ICWWWcq...",
        "...ILcccLq...",
        "...ICLcccq...",
        "...ICcLccq...",
        "...ICcLccq...",
        "...ICcLccq...",
        "...ICcLccq...",
        "..IIccLccqq..",
        "..IIccLccqq..",
    ]), part(2, [
        "...ICWWWcq...",
        "...ICCCccq...",
        "...ICcCccq...",
        "...ICcCccq...",
        "...IGcCGcq...",
        "...ICcLccq...",
        "...ICcLccq...",
        "..IIccLccqq..",
        "..IIccLcqqq..",
    ])),
    # the hotelkeeper: a dress with a white bib apron and collar
    'hostess': (part(1, [
        "....EWWWd....",
        "...EDDWDdf...",
        "...EPPPPPf...",
        "...EPPPPpf...",
        "...dPPPPpdd..",
        "..EDPPPPpdd..",
        "..EDPPpPpdd..",
        "..EDPPPPpdd..",
        ".EDDPPPPpddd.",
        ".fffffffffff.",
    ]), part(1, [
        "....EDDDd....",
        "...EDDDDdf...",
        "...EDDdDdf...",
        "...dPPPPPf...",
        "...EDDPDddd..",
        "..EDDPdPddd..",
        "..EDDdDDddd..",
        "..EDDdDdddd..",
        ".EDDdDDdddd..",
        ".fffffffffff.",
    ])),
    # the teacher: a high-collared blouse with a brooch, a dark skirt
    'teacher': (part(1, [
        "....WWWWw....",
        "...WWWGWww...",
        "...WWWWWww...",
        "...dRRRRRd...",
        "...EDDdDddd..",
        "..EDDDdDddd..",
        "..EDDdDDddd..",
        "..EDDdDdddd..",
        ".EDDdDDdddd..",
        ".fffffffffff.",
    ]), part(1, [
        "....WWWWw....",
        "...WWWWWww...",
        "...WWWWwww...",
        "...dRRRRRd...",
        "...EDDDDddd..",
        "..EDDDdDddd..",
        "..EDDdDDddd..",
        "..EDDdDdddd..",
        ".EDDdDDdddd..",
        ".fffffffffff.",
    ])),
    # the launderer: sleeves rolled up, a plain bodice, a big apron
    'laundry': (part(1, [
        "....DWWWd....",
        "...EDDDDdd...",
        "...EDDDDdd...",
        "...PPPPPPp...",
        "...PPPPPpp...",
        "..DPPPPPppd..",
        "..DPPPpPppd..",
        "..DPPPPPppd..",
        ".DDPPPPPpddd.",
        ".fffffffffff.",
    ]), part(1, [
        "....DDDDd....",
        "...EDDDDdd...",
        "...EDDDddd...",
        "...EPDDDPd...",
        "...EDPPPddd..",
        "..EDDDdDddd..",
        "..EDDdDDddd..",
        "..EDDdDdddd..",
        ".EDDdDDdddd..",
        ".fffffffffff.",
    ])),
})

PE.TYPES.update({
    'banker':      dict(build='man', hat='tophat', face='specs', back='short', body='frock'),
    'hotelkeeper': dict(build='woman', hat='bun', face='woman', back='woman', body='hostess'),
    'vaquero':     dict(build='man', hat='sombrero', face='moustache', back='short', body='vaquero'),
    'printer':     dict(build='man', hat='visor', face='shaven', back='short', body='printer'),
    'barber':      dict(build='man', hat='oiled', face='moustache', back='short', body='uniform'),
    'sheriff':     dict(build='man', hat='cowboy', face='bigmoustache', back='short', body='sheriff'),
    'undertaker':  dict(build='man', hat='stovepipe', face='gaunt', back='short', body='frock'),
    'preacher':    dict(build='man', hat='parson', face='beard', back='beard', body='clergy'),
    'teacher':     dict(build='woman', hat='bun', face='woman', back='woman', body='teacher'),
    'launderer':   dict(build='woman', hat='kerchief', face='woman', back='woman', body='laundry'),
})

S = PE.spec
PE.SPECS.update({
    'banker':        ('banker', S(hat=('iron', 3), band=('dark', 2), hair=('iron', 1), coat=('iron', 2),
                                  vest=('cream', 1), tie=('dark', 1), gold=('brass', 1), trous=('iron', 3))),
    'hotelkeeper':   ('hotelkeeper', S(hair=('red', 1), dress=('green', 1), apron=('cream', 0), shirt=('cream', 0),
                                       gold=('cream', 1), sleeve='dress')),
    'vaquero':       ('vaquero', S(hat=('cream', 2), band=('wood', 3), hair=('wood', 4), skin='skin2',
                                   coat=('wood', 2), shirt=('cream', 0), gold=('iron', 0), band2=None,
                                   trous=('iron', 3), shoes=('wood', 4))),
    'printer':       ('printer', S(hat=('green', 1), band=('green', 2), hair=('ochre', 2), shirt=('cream', 0),
                                   tie=('navy', 2), apron=('iron', 2), sleeve='shirt', trous=('wood', 3))),
    'barber':        ('barber', S(hair=('dark', 2), skin='skin2', coat=('cream', 0), shirt=('cream', 0),
                                  tie=('wood', 4), gold=('cream', 2), trous=('iron', 3))),
    'sheriff':       ('sheriff', S(hat=('iron', 2), band=('dark', 1), hair=('iron', 1), coat=('cream', 2),
                                   vest=('wood', 3), shirt=('cream', 1), tie=('dark', 1), gold=('brass', 0),
                                   trous=('wood', 2), shoes=('wood', 4))),
    'undertaker':    ('undertaker', S(hat=('iron', 3), band=('dark', 2), hair=('iron', 2), coat=('iron', 3),
                                      vest=('iron', 3), shirt=('cream', 0), tie=('dark', 2), gold=('iron', 1),
                                      trous=('iron', 3))),
    'preacher':      ('preacher', S(hat=('iron', 3), band=('dark', 2), hair=('iron', 1), coat=('iron', 3),
                                    shirt=('cream', 0), gold=('iron', 2), trous=('iron', 3), bag=('red', 2))),
    'teacher':       ('teacher', S(hair=('wood', 3), dress=('navy', 1), shirt=('cream', 0), band=('navy', 2),
                                   gold=('brass', 1), sleeve='shirt', bag=('wood', 2))),
    'launderer':     ('launderer', S(hat=('red', 1), hair=('dark', 1), skin='skin2', dress=('plum', 0),
                                     shirt=('cream', 0), apron=('cream', 0), sleeve='skin', bag=('ochre', 1))),
    'storekeeper.b': ('storekeeper', S(hair=('wood', 2), apron=('cream', 2), vest=('navy', 1), tie=('red', 2),
                                       sleeve='shirt', trous=('wood', 3))),
    'cowhand.b':     ('cowhand', S(hat=('cream', 2), band=('navy', 1), coat=('red', 1), vest=('dark', 0),
                                   trous=('wood', 2), hair=('ochre', 1))),
})
# the cowhand's bandana is its band colour; the second cowhand's is navy (set above)

PE.HELD.update({
    'book':       (["XX",
                    "XG",
                    "xx"], 0, 0),
    'books':      (["zXX",
                    "zYY",
                    "zxx"], -1, 0),
    'washbasket': ([".YYW.",
                    "XYWWx",
                    "XyXyx",
                    ".xxx."], -2, 1),
})

NEW_TOWNSFOLK = ['banker', 'hotelkeeper', 'vaquero', 'printer', 'barber', 'sheriff', 'undertaker', 'preacher',
                 'teacher', 'launderer', 'storekeeper.b', 'cowhand.b']
OLD_TOWNSFOLK = ['cowhand', 'smith', 'storekeeper', 'barkeep']
STAND_INS = ['man_bowler', 'man_bowler.b', 'woman_shawl', 'woman_shawl.b', 'child', 'child.b']
LUG = dict(PE.LUGGAGE)
LUG.update({'preacher': 'book', 'teacher': 'books', 'launderer': 'washbasket'})
CARRIED = {'basket', 'washbasket', 'books'}        # held in the crook of the far arm (arm 'carry')

# who each new type is in the town (plans/d27-tech.md 2.4 and 5.1), for the review sheets and the contract note
NAMES = {
    'storekeeper': 'Amos Pratt, storekeeper', 'hotelkeeper': "Nell O'Hara, hotel", 'banker': 'Henry Whitcomb, bank',
    'smith': 'Jake Turner, smith', 'vaquero': 'Luis Ortega, livery', 'storekeeper.b': 'feed and seed',
    'barkeep': 'Silas Reed, saloon', 'printer': 'Ezra Cole, newspaper', 'barber': 'Pablo Rivera, barber',
    'sheriff': 'Tom Dade, sheriff', 'undertaker': 'Abel Grimes, undertaker', 'man_bowler': 'Karl Vogel, assay',
    'preacher': 'Rev. Elias Booth', 'teacher': 'Clara Lind, school', 'child': 'pupil', 'child.b': 'pupil',
    'cowhand': 'cowhand', 'cowhand.b': 'cowhand', 'launderer': 'launderer',
}

# ---------------------------------------------------------------------------------------------------------------
# New legs and arms
# ---------------------------------------------------------------------------------------------------------------
PE.LEGS['man'].update({
    # seated, front view (body 1 px lower): the thighs run forward from under the coat to the knee, the shins
    # drop to the floor, the shoes point forward
    'sit':   (-1, [".........TTt.",
                   "...QTTTTTTTt.",
                   ".........QTt.",
                   ".........BBBb"]),
    # seated, back view: the coat's hem spread on the seat, a knee and a shoe showing ahead
    'sitb':  (-1, ["..........tt.",
                   "...QTTTtTttt.",
                   "..........tt.",
                   "..........bbb"]),
    # the far foot up on a step (climb, second frame)
    'step2': (0, ["....QTtt.....",
                  "....QT..tt...",
                  "....QT..bbb..",
                  "...BBB......."]),
    # a deep squat (lifting from the floor)
    'squat': (-2, ["..QTTT.ttt...",
                   "..BBB...bbb.."]),
    # braced, feet apart, weight on the back foot (heaving, pulling a door)
    'brace': (0, ["....QT.tt....",
                  "...QT...tt...",
                  "..QT.....tt..",
                  ".BBB.....bbb."]),
    # on the toes (lifting onto a high stack)
    'toes':  (0, ["....QT.tt....",
                  "....QT.tt....",
                  "....QT.tt....",
                  ".....BB.bb..."]),
})
PE.LEGS['child'].update({
    'sit':   (0, [".......QQt...",
                  ".........Qt..",
                  ".........BBb."]),
    'sitb':  (0, [".......ttt...",
                  ".........tt..",
                  ".........bb.."]),
    'step2': (0, [".....Qt......",
                  ".....Q.bb....",
                  "....BB......."]),
    'squat': (0, ["....QQ.tt....",
                  "....BB.bb...."]),
    'brace': (0, [".....Q.t.....",
                  "....Q...t....",
                  "...BB...bb..."]),
    'toes':  (0, [".....Q.t.....",
                  ".....Q.t.....",
                  ".....B.b....."]),
})
PE.SKIRT.update({
    'sit':   (-1, [".fffffffffff.", ".........BBBb"]),
    'sitb':  (-1, [".fffffffffff.", "..........bbb"]),
    'step2': (0, [".fffffffffff.", "...BBB.bbb..."]),
    'squat': (0, [".fffffffffff.", "...BBB..bbb.."]),
    'brace': (0, ["ffffffffffff.", ".BBB....bbb.."]),
    'toes':  (0, [".fffffffffff.", "....BB.bb...."]),
})

PE.POSES.update({
    'lap':      ([(0, 0), (0, -1), (0, -2), (1, -3), (2, -4)], (3, -5)),      # near hand on the lap
    'lapf':     ([(0, 0), (0, -1), (0, -2), (0, -3), (1, -4)], (1, -5)),      # far hand on the far knee
    'tkt':      ([(0, 0), (0, -1), (1, -1), (2, -1)], (3, -1)),      # ticket held out, forearm level
    'tkthi':    ([(0, 0), (1, 0), (2, 1)], (3, 2)),                  # ticket held up
    'rail':     ([(0, 0), (1, 1), (1, 2), (2, 3)], (3, 4)),          # up and forward to a grab rail
    'floor':    ([(0, 0), (1, -1), (1, -2), (2, -3), (2, -4)], (3, -5)),   # reaching down (with a squat: the floor)
    'low':      ([(0, 0), (0, -1), (1, -2), (2, -3)], (2, -4)),      # holding low in front (half lifted)
    'high':     ([(0, 0), (1, 0), (2, 0), (3, 0)], (4, 0)),          # held out at shoulder height
    'overhead': ([(0, 0), (1, 1), (2, 2), (3, 2)], (4, 3)),          # up and out, onto a high stack
    'give':     ([(0, 0), (0, -1), (1, -2), (2, -2), (3, -2), (4, -2)], (5, -2)),   # held well out, handing over
    'truck':    ([(0, 0), (0, -1), (1, -2), (2, -2)], (3, -2)),      # hand truck handles at the waist
    'drag':     ([(0, 0), (0, -1), (1, -2), (2, -3)], (3, -3)),      # one end lifted, held at the hip, in front
    'shove':    ([(0, 0), (1, 0), (2, -1), (3, -1)], (4, -1)),       # palms on the good, pushing
    'roll':     ([(0, 0), (1, -1), (1, -2), (2, -3), (3, -4)], (4, -5)),   # stooped, hands on the barrel
    'pullb':    ([(0, 0), (0, -1), (-1, -2), (-2, -3)], (-3, -4)),   # one arm back, holding the cart's pole
    'gesture':  ([(0, 0), (0, -1), (1, -2), (2, -2)], (3, -1)),      # an open hand, talking
})
PE.FRAME_NOTES.update({
    'sit': 'seated (coach seat or bench, seat top 5 px above the floor), hands in the lap; frame 1 the breath (head '
           '1 px lower). Anchor: the floor below the hips',
    'sitTicket': 'seated, holding the ticket out (0) and up for the punch (1)',
    'sitDown': 'standing to seated: bending (0), lowering onto the seat (1); then sit',
    'standUp': 'seated to standing: leaning forward, hands on the knees (0), rising (1); then idle',
    'climb': 'the coach end steps: near foot up, hand on the rail (0); far foot up (1). No lift is drawn: the '
             'renderer raises the figure along the steps',
    'benchSit': 'seated on a platform or town bench, luggage beside (one frame)',
    'talk': 'talking at a door or in the street: an open hand (0), a nod (1); also taking a delivered good',
    'lift': 'crouch to lift a good from the floor (0 squat, 1 half up, 2 standing with it, as carry 0); played '
            'backwards to put down. extra hands: the good\'s anchor offset per frame (as carry), behind: draw it first',
    'shoulder': 'a sack or mail sack on the near shoulder (extra hands: the good\'s anchor, drawn after the agent)',
    'roll': 'stooping behind a barrel on its side (or an upright wheel), rolling it with both hands; pass, stride, '
            'pass, stride. extra grip: the hands',
    'drag': 'walking backwards (frames in walking order for backwards), one end of the good lifted at the hip. '
            'extra grip: the hands',
    'truck': 'wheeling the hand truck tilted back, handles at the waist (the truck drawn separately). extra grip',
    'heave': 'tip and shove a heavy good: brace (0), shove (1), step in (2), set again (3). extra grip',
    'stackHigh': 'lifting a good onto layer 2 to 4: at the chest (0), at the shoulder (1), up on the toes onto the '
                 'stack (2). extra hands per frame (the good\'s anchor)',
    'door': 'pulling a boxcar\'s sliding door along (the door slides the way he faces): reach (0), pull (1), lean '
            'back (2). extra grip',
    'handOver': 'handing a good in at a door: held (0), held out (1). extra hands per frame',
    'pull': 'pulling the platform cart behind by its handle, walking; pass, stride, pass, stride. extra grip: the '
            'hand on the handle (behind him)',
})


# ---------------------------------------------------------------------------------------------------------------
# Building frames
# ---------------------------------------------------------------------------------------------------------------
DRESS = set('EDdfPpUu')


def frame27(who, back, legs='stand', **kw):
    """PE.frame with seated skirts pushed forward over the knees."""
    g = PE.frame(who, back, legs=legs, **kw)
    build = PE.TYPES[PE.SPECS[who][0]]['build']
    if legs in ('sit', 'sitb') and PE.BUILD[build]['legs'] == 'skirt':
        # the lap and the skirt over the knees: the lower skirt pushed forward 2 px
        for yy in (0, 1, 2, 3):
            xs = [x for (x, y2) in g if y2 == yy and g[(x, y2)] in DRESS]
            if xs:
                xm = max(xs)
                code = g[(xm, yy)]
                g[(xm + 1, yy)] = code
                g[(xm + 2, yy)] = code
    return g


def hands_of(who, kw, back):
    """The hand cells [(x, y)] (near first) of a frame, worked out as PE.frame places them."""
    tname = PE.SPECS[who][0]
    build = PE.TYPES[tname]['build']
    b = PE.BUILD[build]
    legs = kw.get('legs', 'stand')
    if b['legs'] == 'skirt':
        bl = PE.SKIRT[legs][0]
    else:
        bl = PE.LEGS[b['legs']][legs][0]
    lean = kw.get('lean', 0)
    lift = kw.get('lift', 0)
    near, far = kw.get('arms', ('down', 'down'))
    short = b.get('short', 0)
    out = []
    for pose, side in ((near, 'near'), (far, 'far')):
        _, hs = PE.arm_cells(build, pose, side, short)
        for x, y, _c in hs:
            x2 = x + (lean if y >= b['top'] - 3 else 0)
            out.append((x2, y + bl + lift))
    return out


def px_of(cell, mirrored):
    """A cell (x, y) as the pixel offset of its top-left corner from the anchor (feet), facing-corrected."""
    x, y = cell
    if mirrored:
        x = -1 - x
    return [x, -(y + 1)]


def grip_of(who, kw, d):
    back, mir = PE.DIRS[d]
    hs = [px_of(c, mir) for c in hands_of(who, kw, back)]
    if not hs:
        return None
    return [round(sum(h[0] for h in hs) / len(hs)), round(sum(h[1] for h in hs) / len(hs))]


def item_of(who, kw, d):
    """Where a held good's anchor goes (the carry convention: se, sw (0, -3) at the carry pose, centred in front;
    ne, nw (5, -8) to the side, drawn first), following the hands' height and reach in this frame."""
    back, mir = PE.DIRS[d]
    hs = hands_of(who, kw, back)
    ref = hands_of('agent', dict(legs='stand', arms=('carry', 'carry')), back)
    hy = sum(y for _, y in hs) / len(hs); ry = sum(y for _, y in ref) / len(ref)
    hx = sum(x for x, _ in hs) / len(hs); rx = sum(x for x, _ in ref) / len(ref)
    dx = round(hx - rx); dy = round(ry - hy)
    base = PE.CARRY_HANDS['ne' if back else 'se']
    x = base[0] + dx
    if mir:
        x = -x
    return [x, base[1] + dy]


# ---- the mark for a punched ticket (hatband, else the lapel) ----
MARK = ["Yy",
        "YZ",
        "yy"]


def mark_of(g, d):
    """Offset (px, from the anchor) of the punched-ticket mark's top-left pixel in grid g (before mirroring)."""
    back, mir = PE.DIRS[d]
    band = [(x, y) for (x, y), c in g.items() if c == 'R' and y >= 15]
    if band:
        y = min(y for _, y in band)
        x = max(x for x, yy in band if yy == y) - 1        # the forward end of the band
        top = y + 1
    else:
        ys = [y for (x, y), c in g.items() if y <= 11 and c not in 'OoKSs']
        top = max(ys) - 1                                   # just under the collar
        x = 1 if not back else -2
    if mir:
        x = -1 - x - 1                                     # the mark is 2 px wide
    return [x, -(top + 1)]


def mark_frames():
    out = []
    import numpy as np
    for d in PE.DRAWN:
        back, mir = PE.DIRS[d]
        rows = [r[::-1] for r in MARK] if mir else MARK
        cm = {'Y': ('cream', 0), 'y': ('cream', 2), 'Z': ('dark', 2)}
        img = np.zeros((3, 2, 4), np.uint8)
        import engine as E
        for r, line in enumerate(rows):
            for c, ch in enumerate(line):
                rn, i = cm[ch]
                img[r, c, :3] = E.PAL[E.RID[rn], i]; img[r, c, 3] = 255
        out.append((d, [(img, (0, 0))]))
    return out


# ---------------------------------------------------------------------------------------------------------------
# Animations
# ---------------------------------------------------------------------------------------------------------------
def lug_kw(who, kw, gesture_side=None):
    """Luggage and things always carried (book, basket of washing), as people.anims_for does."""
    base = who.split('.')[0]
    lug = LUG.get(base)
    kw = dict(kw)
    kw.setdefault('arms', ('down', 'down'))
    if lug == 'trunk':
        kw['arms'] = ('shoulder', kw['arms'][1])
        kw['load'] = (PE.TRUNK, -7, 15, True)
    elif lug in CARRIED:
        kw['arms'] = (kw['arms'][0], 'carry')
        kw['hold'] = (lug, 'far')
    elif lug:
        kw['arms'] = (kw['arms'][0], 'down')
        kw['hold'] = (lug, 'far')
    return kw, lug


def seated_kw(who, back, f, ticket=None, bench=False):
    """One seated frame's kwargs. ticket: None, 'out' or 'up'. bench: luggage beside (platform bench)."""
    base = who.split('.')[0]
    lug = LUG.get(base)
    legs = 'sitb' if back else 'sit'
    build = PE.TYPES[PE.SPECS[who][0]]['build']
    kw = dict(legs=legs, arms=('lap', 'lapf'), head_dy=-1 if f == 1 else 0)
    if build == 'child':
        kw['lift'] = 1
    if ticket:
        kw['arms'] = ('lap', 'tkt' if ticket == 'out' else 'tkthi')
        kw['hold'] = ('ticket', 'far')
        kw['head_dy'] = 0
    if lug in CARRIED:                                   # a basket stays on the lap
        if not ticket:
            kw['arms'] = ('lap', 'carry')
            kw['hold'] = (lug, 'far')
        else:
            kw['extra_hold'] = (lug, 'near')
    elif bench and lug in ('carpetbag', 'book'):         # the bag stands on the floor beside the feet
        kw['load'] = (BAG_FLOOR, 5, 3, False) if lug == 'carpetbag' else None
        if lug == 'book':
            kw['arms'] = ('lap', 'carry'); kw['hold'] = ('book', 'far')
        if kw.get('load') is None:
            kw.pop('load')
    elif bench and lug == 'trunk':
        kw['load'] = (TRUNK_FLOOR, -9, 3, False)
    elif bench and lug == 'hammer':
        kw['arms'] = ('lap', 'lapf'); kw['hold'] = ('hammer', 'far')
    return kw


BAG_FLOOR = [".zz.",
             "XXGx",
             "XyXx",
             "xxxx"]
TRUNK_FLOOR = [".111.",
               "12222",
               "G222G",
               "33344"]


def seated_anims(who, back):
    A = {}
    A['sit'] = [seated_kw(who, back, 0), seated_kw(who, back, 1)]
    A['sitTicket'] = [seated_kw(who, back, 0, 'out'), seated_kw(who, back, 0, 'up')]
    build = PE.TYPES[PE.SPECS[who][0]]['build']
    half = dict(legs='squat' if build != 'child' else 'crouch', lean=1, arms=('fwd', 'down'))
    half, _ = lug_kw(who, half)
    near = seated_kw(who, back, 0)
    near = dict(near, lean=1, arms=('low', near['arms'][1]))
    if 'hold' in near and near['hold'][1] == 'near':
        near.pop('hold')
    A['sitDown'] = [half, near]
    A['standUp'] = [near, half]
    A['benchSit'] = [seated_kw(who, back, 0, bench=True)]
    return A


def climb_anims(who):
    base = who.split('.')[0]
    lug = LUG.get(base)
    rail_side = 'far' if lug == 'trunk' else 'near'
    fr = []
    for legs, other in (('step1', 'down'), ('step2', 'back')):
        if rail_side == 'near':
            kw, _ = lug_kw(who, dict(legs=legs, arms=('rail', other)))
            kw['arms'] = ('rail', kw['arms'][1])
        else:
            kw, _ = lug_kw(who, dict(legs=legs))
            kw['arms'] = (kw['arms'][0], 'rail')
        fr.append(kw)
    return fr


def talk_anims(who):
    base = who.split('.')[0]
    lug = LUG.get(base)
    if lug and lug != 'trunk':            # the far hand is busy: talk with the near hand
        k0, _ = lug_kw(who, dict(legs='stand'))
        k0['arms'] = ('gesture', k0['arms'][1])
        k1, _ = lug_kw(who, dict(legs='stand2', head_dy=-1))
        k1['arms'] = ('fwd', k1['arms'][1])
        return [k0, k1]
    return [dict(legs='stand', arms=('down', 'gesture')),
            dict(legs='stand2', arms=('down', 'out'), head_dy=-1)]


def agent_work():
    """{anim: [frame kwargs]} for the agent's new animations, and which extra each carries."""
    W = PE.WALK
    A = {}
    A['lift'] = [dict(legs='squat', lean=2, arms=('floor', 'floor')),
                 dict(legs='crouch', lean=1, arms=('low', 'low')),
                 dict(legs='stand', arms=('carry', 'carry'))]
    A['shoulder_idle'] = [dict(legs='stand', arms=('shoulder', 'down')),
                          dict(legs='stand2', arms=('shoulder', 'down'), head_dy=-1)]
    A['shoulder_walk'] = [dict(legs=l, arms=('shoulder', a[1])) for l, a in W]
    A['roll'] = [dict(legs=l, lean=2, arms=('roll', 'roll')) for l, _ in W]
    A['drag'] = [dict(legs=l, lean=-1, arms=('drag', 'drag')) for l, _ in reversed(W)]
    A['truck'] = [dict(legs=l, arms=('truck', 'truck')) for l, _ in W]
    A['heave'] = [dict(legs='brace', lean=1, arms=('shove', 'shove')),
                  dict(legs='lean', lean=2, arms=('shove', 'shove')),
                  dict(legs='stride1', lean=1, arms=('shove', 'shove')),
                  dict(legs='stand2', lean=1, arms=('shove', 'shove'))]
    A['stackHigh'] = [dict(legs='stand', arms=('carry', 'carry')),
                      dict(legs='stand', arms=('high', 'high')),
                      dict(legs='toes', lift=1, arms=('overhead', 'overhead'))]
    A['door'] = [dict(legs='stand', lean=1, arms=('high', 'high')),
                 dict(legs='brace', arms=('out', 'out')),
                 dict(legs='brace', lean=-1, arms=('out', 'out'))]
    A['climb'] = [dict(legs='step1', arms=('rail', 'down')),
                  dict(legs='step2', arms=('rail', 'back'))]
    A['handOver'] = [dict(legs='stand', arms=('carry', 'carry')),
                     dict(legs='stand2', lean=1, arms=('give', 'give'))]
    A['pull'] = [dict(legs=l, lean=1, arms=('pullb', a[1])) for l, a in W]
    return A


ITEM_ANIMS = {'lift', 'shoulder_idle', 'shoulder_walk', 'stackHigh', 'handOver'}
GRIP_ANIMS = {'roll', 'drag', 'truck', 'heave', 'door', 'pull'}


def key_anim(a):
    return {'shoulder_idle': 'shoulder/idle', 'shoulder_walk': 'shoulder/walk'}.get(a, a)


def shoulder_item(d):
    """The sack on the near shoulder: its anchor (bottom centre) at the shoulder, over the body."""
    x = -6
    return [x if d in ('se', 'ne') else -x - 1, -10]


def meta(anim, more=None):
    m = {'frame_note': PE.FRAME_NOTES.get(anim.split('_')[0], ''), 'anchor': 'between the feet, at ground level',
         'mirror': False}
    if anim in ('sit', 'sitTicket', 'benchSit'):
        m['anchor'] = 'the floor below the hips (the seat\'s centre at floor level); seat top 5 px above'
    if more:
        m.update(more)
    return m


def emit(who, kws, d, extra=None):
    back, mir = PE.DIRS[d]
    cm = PE.cmap(PE.SPECS[who][1])
    if extra:
        cm.update(extra)
    grids = [frame27(who, back, **kw) for kw in kws]
    return grids, [PE.to_rgba(g, cm, mirrored=mir) for g in grids]


def build_all():
    """[(key, frames, meta, indexed)]. Keys whose frames carry their own extra are given per frame (indexed=False,
    the frame number in the key)."""
    out = []
    # ---- the agent ----
    for anim, kws in agent_work().items():
        for d in PE.DRAWN:
            grids, frs = emit('agent', kws, d)
            base = f'ppl/agent/{key_anim(anim)}/{d}'
            if anim in ITEM_ANIMS or anim in GRIP_ANIMS:
                for i, (kw, fr) in enumerate(zip(kws, frs)):
                    if anim.startswith('shoulder'):
                        ex = {'hands': shoulder_item(d), 'behind': False}
                    elif anim in ITEM_ANIMS:
                        ex = {'hands': item_of('agent', kw, d), 'behind': d in ('ne', 'nw')}
                    else:
                        ex = {'grip': grip_of('agent', kw, d)}
                    out.append((f'{base}/{i}', [fr], meta(anim, {'extra': ex}), False))
            else:
                out.append((base, frs, meta(anim), True))
    # ---- travellers: seated, climbing ----
    for who in PE.TRAVELLERS:
        for d in PE.DRAWN:
            back, _ = PE.DIRS[d]
            A = seated_anims(who, back)
            A['climb'] = climb_anims(who)
            for anim, kws in A.items():
                grids, frs = emit(who, kws, d)
                if anim in ('sit', 'sitTicket'):
                    for i, (g, fr) in enumerate(zip(grids, frs)):
                        out.append((f'ppl/{who}/{anim}/{d}/{i}', [fr],
                                    meta(anim, {'extra': {'mark': mark_of(g, d)}}), False))
                else:
                    out.append((f'ppl/{who}/{anim}/{d}', frs, meta(anim), True))
    # ---- townsfolk ----
    for who in NEW_TOWNSFOLK + OLD_TOWNSFOLK + STAND_INS:
        for d in PE.DRAWN:
            back, _ = PE.DIRS[d]
            A = {}
            if who in NEW_TOWNSFOLK:
                A['idle'] = [lug_kw(who, dict(legs='stand'))[0], lug_kw(who, dict(legs='stand2', head_dy=-1))[0]]
                A['walk'] = [lug_kw(who, dict(legs=l, arms=a))[0] for l, a in PE.WALK]
            A['talk'] = talk_anims(who)
            if who not in PE.TRAVELLERS:
                A['benchSit'] = [seated_kw(who, back, 0, bench=True)]
            for anim, kws in A.items():
                grids, frs = emit(who, kws, d)
                out.append((f'ppl/{who}/{anim}/{d}', frs, meta(anim), True))
    # ---- the punched-ticket mark ----
    for d, frs in mark_frames():
        out.append((f'ppl/mark/punched/{d}', frs,
                    {'anchor': 'top-left pixel; draw it at the sitter\'s anchor plus extra[...].mark of '
                               'the sitter\'s frame (ppl/<who>/sit|sitTicket/<dir>/<f>)', 'mirror': False}, False))
    return out
