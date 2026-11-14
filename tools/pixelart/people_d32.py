# D32 stage 3 people (plans/d32-tech.md 10.1; the Rooms builder's contract plans/d32-rooms-art.md section 4), drawn
# with the signed-off people v2 rig (people.py), its D27 additions (people_d27.py) and the navvies' arms-to-a-target
# and tools-as-lines (people_navvy.py): the same 20 px people (a child 14), palette, light from the upper left,
# outline rule, four drawn facings (sw and nw are se and ne mirrored and re-lit by the rig; never mirrored by the
# renderer). people.py, people_d27.py and people_navvy.py are unchanged: every signed-off frame stays as it was.
#
# What is added:
#   new roles: clerk, cook, maid, stableboy, wife_a, wife_b, farmer, girl, boy
#       idle 2, walk 4, talk 2, benchSit 1 (as the D27 townsfolk) and work 2, sit 1, lie 1
#   the townsfolk already drawn (the twelve keepers, preacher, teacher, launderer, the cowhands, the stand-ins
#       man_bowler, woman_shawl, child and their .b): work 2, lie 1, and sit 1 (not for the stand-ins, which are
#       travellers and have sit already: the coach's sit frames, hands in the lap, fit a chair as they are)
#   the hired station workers in their own outfit: hired_punch, hired_load, hired_deliver, every frame the agent has
#
# work: 2 frames, all four facings, the person's own trade (behind a counter, at the forge, at the press, sweeping,
#   stirring a pot, forking hay...). Anchor: between the feet.
# sit:  1 frame, all four facings: seated on a chair at a table or a desk, the forearms on the table (top 1.05u).
#   Anchor: the floor below the hips (the seat's centre at floor level), seat top 5 px up, as every seated frame.
# lie:  1 frame, se (lying along x, the head to -x) and sw (along z, the head to -z): the head on the pillow and the
#   sheet over the shoulders; draw it after furn/bed/<o> (or cot_sleeper, bunk) at the same anchor (the bed's
#   centre on the floor): bed x takes lie/se, bed z lie/sw.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
import people as PE
import people_d27 as P27
import people_navvy as NV
from people import part

# ---------------------------------------------------------------------------------------------------------------
# New parts
# ---------------------------------------------------------------------------------------------------------------
PE.HATS.update({
    # the cook's tall white cap
    'toque': (part(16, [
        "...JHHHHh....",
        "...JHHHHhh...",
        "....JHHHh....",
        "....RRRRr....",
    ]),) * 2,
    # the maid's frilled white cap over her hair
    'mobcap': (part(15, [
        "....JHHHh....",
        "...JHHHHHh...",
        "..JhaAAAAhh..",
    ]), part(15, [
        "....JHHHh....",
        "...JHHHHHh...",
        "..JHHHHHHhh..",
    ])),
    # a farmer's wide straw hat
    'straw': (part(16, [
        "....JHHHh....",
        "...JHHHHHh...",
        "hkkRRRRRRrkkh",
    ]),) * 2,
    # hair parted in the middle, combed flat (the clerk)
    'midpart': (part(16, [
        "....aAA.AAa..",
        "...aAAAaAAAa.",
    ]), part(16, [
        "....aAAAAAa..",
        "...aAAAAAAAa.",
    ])),
})

PE.BODIES.update({
    # the clerk: a white shirt, a buttoned vest, a string tie, a belt
    'clerk': (part(4, [
        "...WWNWWww...",
        "...VWNWVvv...",
        "...VVNVVvv...",
        "...VVGVVvv...",
        "...VVVGVvv...",
        "...zzzGzzz...",
        "...QTTTtTt...",
    ]), part(4, [
        "...WWWWWww...",
        "...VVVVVvv...",
        "...VVVvVvv...",
        "...VVzVVvv...",
        "...VVVvVvv...",
        "...zzzzzzz...",
        "...QTTTtTt...",
    ])),
    # the cook: a white jacket buttoned double, a neckerchief, a long apron
    'cook': (part(2, [
        "...WWNWWww...",
        "...WGWWGww...",
        "...WWWWWww...",
        "...WGPPPpw...",
        "...PPPPPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
    ]), part(2, [
        "...WWWWWww...",
        "...WWWWWww...",
        "...WWNWWww...",
        "...WWWWWww...",
        "...PPNPPpp...",
        "...QTTTtTt...",
        "...QTTTtTt...",
        "...QTT.tTt...",
        "...QTT.tTt...",
    ])),
    # a house dress with a half apron (the keepers' wives)
    'housedress': (part(1, [
        "....EWWWd....",
        "...EDDGDdf...",
        "...EDDDGdf...",
        "...dDDDDDf...",
        "...EPPPPPdd..",
        "..EDPPPPPpd..",
        "..EDPPpPPpd..",
        "..EDPPPPPpd..",
        ".EDDdPPPpddd.",
        ".fffffffffff.",
    ]), part(1, [
        "....EDDDd....",
        "...EDDDDdf...",
        "...EDDdDdf...",
        "...dDPPPDf...",
        "...EDDPDddd..",
        "..EDDDdDddd..",
        "..EDDdDDddd..",
        "..EDDdDdddd..",
        ".EDDdDDdddd..",
        ".fffffffffff.",
    ])),
    # the farmer: bib overalls over a work shirt
    'overalls': (part(4, [
        "...ICWWWcq...",
        "...INVVVNq...",
        "...IcVGVcq...",
        "...IcVVVcq...",
        "...VVVVVvv...",
        "...VVVVVvv...",
        "...QTTTtTt...",
    ]), part(4, [
        "...ICCCccq...",
        "...ICNCNcq...",
        "...ICCNccq...",
        "...ICNCNcq...",
        "...VVVVVvv...",
        "...VVVVVvv...",
        "...QTTTtTt...",
    ])),
})

# the girl and the boy: whole child maps (the child build, 14 px), as people.CHILD
KIDS = {
    'girl': (part(3, [
        "....aAAAa....",
        "...RaAAAAa...",
        "...aASeSeS...",
        "...asSSSSSs..",
        "...a.SSmS....",
        "......SSs....",
        "....EWWWd....",
        "....EPPPd....",
        "....EPPPd....",
        "...EDPPPdd...",
        "...fffffff...",
    ]), part(3, [
        "....aAAAa....",
        "...RAAAAAa...",
        "....AAAAaS...",
        "....AAAaaS...",
        "....aAaaS....",
        ".....aAa.....",
        "....EDADd....",
        "....EDaDd....",
        "....EDDDd....",
        "...EDDDDdd...",
        "...fffffff...",
    ])),
    'boy': (part(3, [
        ".....JHHh....",
        "....JHHHkkk..",
        "....aSeSeS...",
        "....sSSSSSs..",
        ".....SSmS....",
        "......SSs....",
        "....WNWNw....",
        "....WNWNw....",
        "....WNWNw....",
        "....zzGzz....",
        "....QTTtt....",
    ]), part(3, [
        ".....JHHh....",
        "....aJHHhkk..",
        "....AAAAaS...",
        "....AAAaaS...",
        ".....aAaS....",
        "......sS.....",
        "....WNWNw....",
        "....WWNWw....",
        "....WNWNw....",
        "....zzzzz....",
        "....QTTtt....",
    ])),
}

_body_grid = PE.body_grid


def body_grid(tname, back):
    """people.body_grid, and the whole-child maps of the girl and the boy."""
    t = PE.TYPES[tname]
    if t.get('kid'):
        g = {}
        PE.stamp(g, KIDS[t['kid']][1 if back else 0])
        return g
    return _body_grid(tname, back)


PE.body_grid = body_grid

PE.TYPES.update({
    'clerk':     dict(build='man', hat='midpart', face='specs', back='short', body='clerk'),
    'cook':      dict(build='man', hat='toque', face='bigmoustache', back='short', body='cook'),
    'maid':      dict(build='woman', hat='mobcap', face='woman', back='woman', body='hostess'),
    'stableboy': dict(build='man', hat='slouch', face='shaven', back='short', body='shirt'),
    'wife_a':    dict(build='woman', hat='bun', face='woman', back='woman', body='housedress'),
    'wife_b':    dict(build='woman', hat='bonnet', face='woman', back='woman', body='housedress'),
    'farmer_d32': dict(build='man', hat='straw', face='beard', back='beard', body='overalls'),
    'girl':      dict(build='child', kid='girl'),
    'boy':       dict(build='child', kid='boy'),
    # the hired station workers: the agent's build and cap, their own clothes
    'hired_punch':   dict(build='man', hat='cap', face='shaven', back='short', body='uniform'),
    'hired_load':    dict(build='man', hat='cap', face='chops', back='short', body='shirt'),
    'hired_deliver': dict(build='man', hat='cap', face='beard', back='beard', body='sack'),
})

S = PE.spec
PE.SPECS.update({
    'clerk':     ('clerk', S(hair=('wood', 3), shirt=('cream', 0), vest=('slate', 2), tie=('dark', 1),
                             gold=('brass', 1), trous=('iron', 2), sleeve='shirt')),
    'cook':      ('cook', S(hat=('cream', 0), band=('cream', 1), hair=('dark', 1), skin='skin2', shirt=('cream', 0),
                            tie=('red', 1), gold=('cream', 2), apron=('cream', 1), trous=('slate', 2), sleeve='shirt')),
    'maid':      ('maid', S(hat=('cream', 0), hair=('wood', 2), dress=('iron', 3), apron=('cream', 0),
                            shirt=('cream', 0), gold=('cream', 1), sleeve='dress')),
    'stableboy': ('stableboy', S(hat=('straw', 1), band=('straw', 3), hair=('ochre', 1), coat=('brick', 1),
                                 tie=('wood', 3), trous=('wood', 2), shoes=('wood', 4))),
    'wife_a':    ('wife_a', S(hair=('wood', 3), dress=('brick', 1), apron=('cream', 0), shirt=('cream', 0),
                              gold=('brass', 1), sleeve='dress')),
    'wife_b':    ('wife_b', S(hat=('slate', 1), band=('slate', 2), hair=('ochre', 2), skin='skin2',
                              dress=('sage', 1), apron=('cream', 1), shirt=('cream', 0), gold=('cream', 1),
                              sleeve='dress')),
    'farmer':    ('farmer_d32', S(hat=('straw', 1), band=('wood', 3), hair=('wood', 2), coat=('red', 1),
                                  vest=('navy', 1), tie=('navy', 2), gold=('brass', 1), trous=('navy', 1),
                                  shoes=('wood', 4))),
    'girl':      ('girl', S(hair=('ochre', 1), band=('red', 1), dress=('navy', 1), apron=('cream', 0),
                            shirt=('cream', 0), trous=('cream', 1), sleeve='dress', shoes=('dark', 1))),
    'boy':       ('boy', S(hat=('slate', 2), band=('slate', 3), hair=('wood', 3), shirt=('cream', 1),
                           tie=('wood', 3), trous=('wood', 2), gold=('brass', 1), sleeve='shirt')),
    'hired_punch':   ('hired_punch', S(hat=('slate', 3), band=('dark', 1), hair=('ochre', 2), coat=('slate', 2),
                                       tie=('dark', 1), gold=('brass', 1), trous=('slate', 3))),
    'hired_load':    ('hired_load', S(hat=('slate', 3), band=('dark', 1), hair=('wood', 3), coat=('brick', 1),
                                      tie=('wood', 4), gold=('brass', 1), trous=('wood', 3), skin='skin2')),
    'hired_deliver': ('hired_deliver', S(hat=('slate', 3), band=('dark', 1), hair=('wood', 4), coat=('wood', 2),
                                         vest=('ochre', 1), tie=('dark', 1), gold=('brass', 1), trous=('iron', 2))),
})

NEW_ROLES = ['clerk', 'cook', 'maid', 'stableboy', 'wife_a', 'wife_b', 'farmer', 'girl', 'boy']
HIRED = ['hired_punch', 'hired_load', 'hired_deliver']
OLD_FOLK = P27.NEW_TOWNSFOLK + P27.OLD_TOWNSFOLK            # 16 kinds
STAND_INS = P27.STAND_INS                                  # travellers standing in as townsfolk (they have sit)
NAMES = {'clerk': 'clerk (store, bank)', 'cook': 'the hotel\'s cook', 'maid': 'the hotel\'s maid',
         'stableboy': 'stable boy (livery)', 'wife_a': 'a keeper\'s wife', 'wife_b': 'a keeper\'s wife',
         'farmer': 'farmer', 'girl': 'girl (pupil)', 'boy': 'boy (pupil)', 'hired_punch': 'hired ticket puncher',
         'hired_load': 'hired cargo loader', 'hired_deliver': 'hired delivery man'}

# ---------------------------------------------------------------------------------------------------------------
# Tools and things in the hands (cells), added to the navvies' tool lines
# ---------------------------------------------------------------------------------------------------------------
CODES = {'#': ('straw', 1), '%': ('straw', 3), '!': ('cream', 0), '$': ('brass', 0), '&': ('dark', 2),
         '+': ('iron', 0), '=': ('river', 1), '@': ('red', 1)}
_tool_cells = NV.tool_cells


def tool_cells(kind, grip, ang, head, butt, earth=False):
    if kind not in ('hammer', 'spoon', 'broom', 'fork', 'pointer', 'pen', 'plane', 'hatchet', 'scissors', 'rag'):
        return _tool_cells(kind, grip, ang, head, butt, earth)
    a = math.radians(ang)
    u = (math.cos(a), math.sin(a))
    v = (-u[1], u[0])
    gx, gy = grip
    end = (gx + u[0] * head, gy + u[1] * head)
    handle = {'pointer': 'Z', 'pen': '&', 'spoon': 'M', 'scissors': 'M', 'rag': '!'}.get(kind, 'Z')
    out = []
    if kind not in ('rag', 'plane'):
        for (x, y) in NV._line((gx - u[0] * butt, gy - u[1] * butt), end):
            out.append((x, y, handle))

    def at(s, t, code):
        out.append((int(round(end[0] + u[0] * s + v[0] * t)), int(round(end[1] + u[1] * s + v[1] * t)), code))
    if kind == 'hammer':
        for t in (-1, 0, 1):
            at(0, t, 'n' if t == 1 else 'M')
    elif kind == 'hatchet':
        for s, t in ((0, 0), (0, -1), (0.5, -2), (-0.5, -2)):
            at(s, t, 'M')
    elif kind == 'spoon':
        at(0.6, 0, 'M'); at(1.2, 0, 'n')
    elif kind == 'broom':
        for s in (0, 1, 2):
            for t in (-1, 0, 1, 2) if s else (-1, 0, 1):
                at(s, t - 0.5 if s == 2 else t, '#' if s < 2 else '%')
    elif kind == 'fork':
        for t in (-2, -1, 0, 1, 2):
            at(0, t, 'n')
        for t in (-2, 0, 2):
            at(1, t, 'M'); at(2, t, 'M')
        if earth:                              # hay on the tines
            for s, t in ((1.5, -1), (2, 1), (2.5, 0), (1.5, 1), (3, -1), (2.5, 2)):
                at(s, t, '#')
    elif kind == 'plane':
        for s in (-1, 0, 1, 2):
            for t in (0, 1):
                out.append((int(round(gx + u[0] * s + v[0] * t)), int(round(gy + u[1] * s + v[1] * t)),
                            'Z' if t == 0 else 'z'))
        out.append((gx + 1, gy + 1, 'M'))
    elif kind == 'rag':
        for s, t in ((0, 0), (1, 0), (0, -1), (1, -1), (2, -1)):
            at(s, t, '!')
    elif kind == 'scissors':
        at(0.5, 0.6, '+'); at(0.5, -0.6, '+')
    return out


NV.tool_cells = tool_cells


# ---------------------------------------------------------------------------------------------------------------
# Work: two frames of each trade. Targets are hand cells (x forward, y up from the ground) for a 20 px adult; a child's
# are scaled down. Each spec: dict(near, far, legs, lean, head_dy, tool, load, hold) as people_navvy.nframe takes.
# ---------------------------------------------------------------------------------------------------------------
def on_counter(item):
    """Both hands on a counter (top 1.2u, about 9 px): (0) handling something, (1) reaching, a nod."""
    things = {
        'paper': [(4, 9, '!'), (5, 9, '!'), (6, 9, '!')],
        'coins': [(4, 9, '$'), (6, 9, '$'), (5, 10, '$')],
        'jar':   [(5, 9, '='), (5, 10, '='), (5, 11, '+')],
        'parcel': [(4, 9, '3'), (5, 9, '3'), (6, 9, '4'), (4, 10, '2'), (5, 10, '2'), (6, 10, '4'), (5, 11, '1')],
        'glass': [(5, 9, '='), (5, 10, '='), (6, 10, '!')],
    }[item]
    return [dict(near=(3, 9), far=(5, 10), load=(True, things)),
            dict(near=(5, 10), far=(4, 9), head_dy=-1, load=(True, things[:2]))]


STYLES = {
    'counter_paper': on_counter('paper'),
    'counter_coins': on_counter('coins'),
    'counter_jar': on_counter('jar'),
    'counter_parcel': on_counter('parcel'),
    'counter_glass': [dict(near=(3, 9), far=(5, 10), tool=('rag', 0, 1, 0), load=(True, [(6, 10, '='), (6, 11, '=')])),
                      dict(near=(5, 10), far=(4, 9), head_dy=-1, tool=('rag', 0, 1, 0),
                           load=(True, [(6, 10, '='), (6, 11, '=')]))],
    'write': [dict(near=(4, 9), far=(5, 9), tool=('pen', 60, 2, 0), load=(True, [(5, 8, '!'), (6, 8, '!'),
                                                                               (7, 8, '!')])),
              dict(near=(5, 9), far=(5, 9), head_dy=-1, tool=('pen', 70, 2, 0),
                   load=(True, [(5, 8, '!'), (6, 8, '!'), (7, 8, '!')]))],
    'hammer': [dict(legs='stand', near=(1, 15), far=(4, 9), tool=('hammer', 100, 3, 1)),
               dict(legs='brace', lean=1, near=(5, 10), far=(4, 9), tool=('hammer', -15, 3, 1))],
    'stir': [dict(lean=1, near=(4, 10), far=(5, 8), tool=('spoon', -75, 3, 1)),
             dict(lean=1, near=(3, 10), far=(5, 8), head_dy=-1, tool=('spoon', -60, 3, 1))],
    'sweep': [dict(lean=1, near=(2, 7), far=(1, 10), tool=('broom', -55, 6, 4)),
              dict(lean=0, near=(1, 7), far=(0, 10), head_dy=-1, tool=('broom', -80, 6, 4))],
    'fork': [dict(legs='brace', lean=1, near=(4, 7), far=(2, 9), tool=('fork', -40, 6, 4, {'earth': True})),
             dict(legs='stand2', near=(3, 12), far=(1, 10), tool=('fork', 55, 6, 4, {'earth': True}))],
    'preach': [dict(near=(3, 15), far='carry', hold=('book', 'far')),
               dict(near=(5, 12), far='carry', hold=('book', 'far'), head_dy=-1)],
    'teach': [dict(near=(4, 13), far='carry', hold=('books', 'far'), tool=('pointer', 50, 4, 1)),
              dict(near=(4, 12), far='carry', hold=('books', 'far'), head_dy=-1, tool=('pointer', 25, 4, 1))],
    'barber': [dict(near=(4, 13), far=(3, 12), tool=('scissors', 30, 1, 0)),
               dict(near=(5, 12), far=(3, 13), head_dy=-1, tool=('scissors', 10, 1, 0))],
    'knead': [dict(lean=1, near=(4, 8), far=(5, 8)),
              dict(lean=2, near=(5, 7), far=(4, 7), head_dy=-1)],
    'press': [dict(legs='stand', lean=1, near=(5, 11), far=(4, 11)),
              dict(legs='brace', lean=-1, near=(1, 10), far=(0, 10))],
    'plane': [dict(legs='brace', lean=1, near=(3, 8), far=(2, 8), tool=('plane', 0, 0, 0)),
              dict(legs='lean', lean=2, near=(6, 8), far=(5, 8), tool=('plane', 0, 0, 0))],
    'chop': [dict(near=(1, 14), far=(0, 13), tool=('hatchet', 110, 3, 1)),
             dict(legs='brace', lean=1, near=(5, 7), far=(4, 7), tool=('hatchet', -40, 3, 1))],
}
WORK = {
    'storekeeper': 'counter_parcel', 'storekeeper.b': 'counter_parcel', 'clerk': 'counter_paper',
    'banker': 'counter_coins', 'hotelkeeper': 'write', 'man_bowler': 'counter_jar', 'man_bowler.b': 'counter_jar',
    'barkeep': 'counter_glass', 'sheriff': 'write', 'undertaker': 'plane', 'smith': 'hammer', 'vaquero': 'fork',
    'cowhand': 'fork', 'cowhand.b': 'fork', 'printer': 'press', 'barber': 'barber', 'preacher': 'preach',
    'teacher': 'teach', 'launderer': 'knead', 'woman_shawl': 'knead', 'woman_shawl.b': 'knead', 'child': 'sweep',
    'child.b': 'sweep', 'cook': 'stir', 'maid': 'sweep', 'stableboy': 'fork', 'wife_a': 'stir', 'wife_b': 'knead',
    'farmer': 'fork', 'girl': 'sweep', 'boy': 'chop',
}
WORK_NOTE = {
    'counter_parcel': 'behind the counter: wrapping a parcel (0), handing it over (1)',
    'counter_paper': 'behind the counter: sorting papers (0), reaching (1)',
    'counter_coins': 'behind the counter or the teller\'s window: counting coins',
    'counter_jar': 'at the bench: weighing a sample (the assayer)',
    'counter_glass': 'behind the bar: polishing a glass',
    'write': 'standing at a desk or counter, writing in the book',
    'hammer': 'at the anvil: hammer up (0), the blow (1)',
    'stir': 'at the range: stirring the pot',
    'sweep': 'sweeping the floor',
    'fork': 'forking hay or straw: low (0), lifting (1)',
    'preach': 'in the pulpit: the hand raised (0), held out (1), the Bible in the other',
    'teach': 'at the blackboard with the pointer',
    'barber': 'cutting hair behind the chair, comb and scissors',
    'knead': 'at the table or the tub: kneading, scrubbing',
    'press': 'pulling the press\'s bar: reach (0), pull (1)',
    'plane': 'planing a board: the stroke back (0), forward (1)',
    'chop': 'splitting kindling with a hatchet: up (0), down (1)',
}


def kid_spec(sp):
    """A child's version of a work spec: the targets lower (14 px), the tools shorter."""
    sp = dict(sp)
    for k in ('near', 'far'):
        if isinstance(sp.get(k), tuple):
            x, y = sp[k]
            sp[k] = (max(-1, x - 1), max(3, int(round(y * 0.68))))
    if sp.get('tool'):
        t = list(sp['tool'])
        t[2] = max(1, int(round(t[2] * 0.7))); t[3] = max(0, int(round(t[3] * 0.7)))
        sp['tool'] = tuple(t)
    if sp.get('load'):
        over, cells = sp['load']
        sp['load'] = (over, [(x - 1, int(round(y * 0.68)), c) for x, y, c in cells])
    if sp.get('legs') not in (None, 'stand', 'stand2', 'brace'):
        sp['legs'] = 'stand'
    sp.pop('lean', None) if sp.get('lean', 0) > 1 else None
    return sp


def build_of(who):
    return PE.TYPES[PE.SPECS[who][0]]['build']


def work_specs(who):
    style = STYLES[WORK[who]]
    if build_of(who) == 'child':
        return [kid_spec(s) for s in style]
    return [dict(s) for s in style]


def nemit(who, specs, d):
    back, mir = PE.DIRS[d]
    cm = PE.cmap(PE.SPECS[who][1])
    cm.update(NV.EXTRA_CODES)
    cm.update(CODES)
    out = []
    for sp in specs:
        sp = dict(sp)
        g, kw = NV.nframe(who, back, **sp)
        out.append(PE.to_rgba(g, cm, mirrored=mir))
    return out


# ---------------------------------------------------------------------------------------------------------------
# Sit at a table, lie in bed
# ---------------------------------------------------------------------------------------------------------------
def sit_kw(who, back):
    """Seated on a chair, the forearms forward on the table (both arms held level: the 'tkt' pose)."""
    legs = 'sitb' if back else 'sit'
    kw = dict(legs=legs, arms=('tkt', 'tkt'))
    if build_of(who) == 'child':
        kw['lift'] = 1
    base = who.split('.')[0]
    if P27.LUG.get(base) in P27.CARRIED:          # the basket or books set down: hands free
        pass
    return kw


def emit27(who, kws, d):
    back, mir = PE.DIRS[d]
    cm = PE.cmap(PE.SPECS[who][1])
    return [PE.to_rgba(P27.frame27(who, back, **kw), cm, mirrored=mir) for kw in kws]


HEAD = -0.95       # the pillow's middle from the bed's centre, along its length (rooms_d32.bed)
BED = 0.75


def lie_frame(who, d):
    """The head on the pillow, the hair, the sheet's edge over the shoulders and a hand on it (engine shapes, the
    person's own skin and hair). se: the bed along x (head to -x); sw: along z (head to -z)."""
    import harness as H
    from geom_d32 import Frame
    sp = PE.SPECS[who][1]
    t = PE.TYPES[PE.SPECS[who][0]]
    hair = sp['hair'][0]
    skin = sp['skin']
    child = t['build'] == 'child'
    woman = t['build'] in ('woman', 'shawl') or t.get('kid') == 'girl'
    beard = t.get('face') in ('beard',) or t.get('back') == 'beard'
    bald = t.get('hat') == 'balding'
    yaw = {'se': 90.0, 'sw': 0.0}[d]
    s = 0.8 if child else 1.0

    def draw():
        F = Frame(yaw=yaw)
        o = E.new_oid(True)
        h0 = BED + 0.12                               # the head rests in the pillow
        c0 = HEAD + 0.05
        # the head: the face turned up, the hair over the crown (towards the head board) and on top
        F.box(-0.27 * s, c0 - 0.2 * s, h0, 0.27 * s, c0 + 0.26 * s, h0 + 0.5 * s, skin, oid=o, shades=(0, 1, 1))
        if not bald:
            F.box(-0.3 * s, c0 - 0.3 * s, h0 + 0.02, 0.3 * s, c0 - 0.02 * s, h0 + 0.56 * s, hair, oid=o,
                  shades=(1, 1, 2))
        else:
            F.box(-0.3 * s, c0 - 0.3 * s, h0 + 0.02, 0.3 * s, c0 - 0.12 * s, h0 + 0.4 * s, hair, oid=o,
                  shades=(1, 1, 2))
        if woman:                                     # her hair spread on the pillow
            F.box(-0.42 * s, c0 - 0.36 * s, h0 - 0.04, 0.42 * s, c0 - 0.02 * s, h0 + 0.14, hair, oid=o,
                  shades=(1, 1, 2))
        if beard:
            F.box(-0.2, c0 + 0.16, h0 + 0.02, 0.2, c0 + 0.34, h0 + 0.3, hair, oid=o, shades=(1, 1, 2))
        # the sheet turned over the quilt at the shoulders, the near hand on it
        o2 = E.new_oid(True)
        F.box(-0.58 * s, c0 + 0.3 * s, BED + 0.02, 0.58 * s, c0 + 0.52 * s, BED + 0.34, 'cream', oid=o2,
              shades=(0, 1, 2))
        F.box(0.14 * s, c0 + 0.5 * s, BED + 0.24, 0.34 * s, c0 + 0.68 * s, BED + 0.38, skin, oid=o2,
              shades=(0, 0, 1))
    img, an = H.render(draw, shadows=False)
    return img, an


# ---------------------------------------------------------------------------------------------------------------
# All the frames
# ---------------------------------------------------------------------------------------------------------------
def meta(anim, note=None):
    m = {'frame_note': note or P27.PE.FRAME_NOTES.get(anim, ''), 'anchor': 'between the feet, at ground level',
         'mirror': False}
    if anim in ('sit', 'benchSit'):
        m['anchor'] = 'the floor below the hips (the seat\'s centre at floor level); seat top 5 px above'
    if anim == 'lie':
        m['anchor'] = 'the bed\'s centre on the floor (draw after furn/bed/<o> at the same anchor)'
    return m


SIT_NOTE = ('seated on a chair at a table or desk, the forearms on the table (top 1.05u); a child is drawn 1 px '
            'higher (the school desk\'s seat)')
LIE_NOTE = ('asleep in bed: the head on the pillow, the sheet over the shoulders. se: the bed along x (furn/bed/x), '
            'sw: along z (furn/bed/z); the pillow 0.95u from the bed\'s centre, the mattress at 0.75u')


def build_all():
    """[(key, frames, meta, indexed)]."""
    out = []
    for who in NEW_ROLES + OLD_FOLK + STAND_INS:
        new = who in NEW_ROLES
        for d in PE.DRAWN:
            back, _ = PE.DIRS[d]
            if new:
                out.append((f'ppl/{who}/idle/{d}', emit27(who, [P27.lug_kw(who, dict(legs='stand'))[0],
                                                                P27.lug_kw(who, dict(legs='stand2', head_dy=-1))[0]],
                                                          d), meta('idle'), True))
                out.append((f'ppl/{who}/walk/{d}', emit27(who, [P27.lug_kw(who, dict(legs=l, arms=a))[0]
                                                                for l, a in PE.WALK], d), meta('walk'), True))
                out.append((f'ppl/{who}/talk/{d}', emit27(who, P27.talk_anims(who), d), meta('talk'), True))
                out.append((f'ppl/{who}/benchSit/{d}', emit27(who, [P27.seated_kw(who, back, 0, bench=True)], d),
                            meta('benchSit'), True))
            out.append((f'ppl/{who}/work/{d}', nemit(who, work_specs(who), d),
                        meta('work', 'work, 2 frames (about 3 a second): ' + WORK_NOTE[WORK[who]]), True))
            if who not in PE.TRAVELLERS:
                out.append((f'ppl/{who}/sit/{d}', emit27(who, [sit_kw(who, back)], d), meta('sit', SIT_NOTE), True))
        for d in ('se', 'sw'):
            out.append((f'ppl/{who}/lie/{d}', [lie_frame(who, d)], meta('lie', LIE_NOTE), True))
    # the hired station workers: every frame the agent has, in their own clothes
    for who in HIRED:
        for d in PE.DRAWN:
            for anim, kws in PE.agent_anims().items():
                more = None
                if anim == 'carry':
                    more = {'extra': {'hands': list(PE.CARRY_HANDS[d])}}
                if anim == 'push':
                    more = {'extra': {'grip': list(PE.PUSH_GRIP[d])}}
                m = meta(anim)
                if more:
                    m.update(more)
                out.append((f'ppl/{who}/{anim}/{d}', PE.emit_frames(who, kws, d), m, True))
            for anim, kws in P27.agent_work().items():
                grids, frs = P27.emit(who, kws, d)
                base = f'ppl/{who}/{P27.key_anim(anim)}/{d}'
                if anim in P27.ITEM_ANIMS or anim in P27.GRIP_ANIMS:
                    for i, (kw, fr) in enumerate(zip(kws, frs)):
                        if anim.startswith('shoulder'):
                            ex = {'hands': P27.shoulder_item(d), 'behind': False}
                        elif anim in P27.ITEM_ANIMS:
                            ex = {'hands': P27.item_of(who, kw, d), 'behind': d in ('ne', 'nw')}
                        else:
                            ex = {'grip': P27.grip_of(who, kw, d)}
                        out.append((f'{base}/{i}', [fr], P27.meta(anim, {'extra': ex}), False))
                else:
                    out.append((base, frs, P27.meta(anim), True))
    return out
