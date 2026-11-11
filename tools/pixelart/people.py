# People, version 2 (signed off by the designer 2026-11-11 at the sample's size, about 20 px):
# 1866 travellers, townsfolk and the station agent as hand-made pixel art assembled by code.
# The version before (14 px people) is parked in people_v1.py (not built).
#
# The look: the richer style test's form (big head, readable face, hats with brim and band, coat lapels, buttons,
# folds, hands), in our palette (engine.py ramps), our light (from the upper left) and our outline rule (1 px, the
# darkest shade of the neighbouring colour's ramp, never pure black), hard alpha, no blush, no sparkle, no bounce.
# An adult is 20 px from heel to crown (without outline; a top hat adds 1), a child 14. (A 26 px set was tried the
# same day; the designer chose 20, "the size of the sample you saw".)
#
# How a frame is made
#   Each type is put together from parts drawn as pixel maps: a hat or hair part, a face (front view) or back of
#   the head (back view), and a body (coat, waistcoat, apron, bodice and skirt...). Arms, hands, legs, held things and
#   the poses come from small tables (LEGS, SKIRT, POSES, HELD), so every type gets every animation with the same
#   timing. The front view faces world +x (direction se, screen lower right, three quarters front); the back view faces
#   -z (ne, upper right, three quarters back). sw and nw are se and ne mirrored, then re-lit so the light still comes
#   from the upper left (to_rgba). All four facings are stored; the renderer never mirrors people.
#
# Units: one map cell is one native pixel. Maps are 13 columns wide, column 6 is x = 0 (the anchor, between the feet,
#   is the left edge of column 6). y counts up from the ground row (y = 0 is the row of the shoes).
import numpy as np
import engine as E

W_COLS = 13
X0 = -6

# ---------------------------------------------------------------------------------------------------------------
# Codes in the maps (each type maps them to a palette ramp and shade: cmap)
#   J H h k  hat (highlight, light, shade, brim)      R r  hat band, ribbon, bandana     G  brass, gold
#   A a      hair, beard (light, dark)                 S s  skin (lit, shade)  m mouth    e  eye
#   I C c q  coat (highlight, light, fill, shade)      L    seam, lapel, fold line
#   V v      waistcoat, vest                           W w  shirt, collar                 N  necktie, suspenders
#   Q T t    trousers (highlight, near leg, far leg)   B b  shoes (near, far)
#   E D d f  dress (highlight, light, shade, hem)      P p  apron                          U u  shawl
#   O o K    sleeve (lit, fill, shade)                 X x y  bag or basket (light, shade, pattern)
#   Z z      wood, leather (handles, belt)             Y  ticket    M n  steel (punch, hammer)   F  lamp flame
#   1-7 8    carried goods (preview only) and its shop mark
# ---------------------------------------------------------------------------------------------------------------

def part(ybot, rows):
    assert all(len(r) == W_COLS for r in rows), rows
    return (ybot, rows)


# ---- hats and hair (drawn over the face; the face's top row is y15) ----
HATS = {
    'cap': (part(16, [
        "....JHHHh....",
        "...JHHGHhh...",
        "...RRRRRRrr..",
        "...aAAhkkkkk.",
    ]), part(16, [
        "....JHHHh....",
        "...JHHHHhh...",
        "...RRRRRRrr..",
        "...aAAAAhkkk.",
    ])),
    'tophat': (part(16, [
        "....JHHHh....",
        "....JHHhh....",
        "....JHHhh....",
        "....RRRRr....",
        "..kkkkkkkkk..",
    ]),) * 2,
    'bowler': (part(16, [
        "....JHHHh....",
        "...JHHHHhh...",
        "...RRRRRRr...",
        "..kkkkkkkkk..",
    ]),) * 2,
    'slouch': (part(15, [
        "....JHHHh....",
        "...RRRRRRr...",
        ".hkkkkkkkkkh.",
        ".k.........k.",
    ]),) * 2,
    'cowboy': (part(16, [
        "....JH.Hh....",
        "...JHHHHh....",
        "kh.RRRRRr.hk.",
        ".kkkkkkkkkkk.",
    ]),) * 2,
    'bonnet': (part(11, [
        "....JHHHh....",
        "...JHHHHHh...",
        "..JHHhhhhHk..",
        "..JHhAAAAhk..",
        "..JHh.....k..",
        "..JHh.....k..",
        "...HR....R...",
        "....R...R....",
        ".....RRr.....",
    ]), part(13, [
        "....JHHHh....",
        "...JHHHHHh...",
        "..JHHHHHHHk..",
        "..JHHHHHHhk..",
        "..JHHHHHhhk..",
        "...hhhhhhhk..",
        "...hhhhhhh...",
    ])),
    'bun': (part(15, [
        ".....AAa.....",
        "...aAAAAa....",
        "..aAAAAAAa...",
        "..a..........",
    ]), part(16, [
        "....aAAa.....",
        "...aAAAAa....",
        "...AAAaAAa...",
    ])),
    'short': (part(16, [
        ".....aAAa....",
        "...aAAAAAa...",
    ]),) * 2,
    'parted': (part(16, [
        ".....aAAa....",
        "...aAAAaAAa..",
    ]),) * 2,
    'balding': (part(16, [
        "...aASSSSs...",
    ]), part(16, [
        "...aASSSsa...",
    ])),
}

# ---- faces (front view) and the back of the head; rows y15 (forehead) to y11 (chin) ----
FACES = {
    'moustache': part(11, [
        "...aASSSSSs..",
        "...aSSeSeS...",
        "...sSSSSSSs..",
        "....SSaaaS...",
        ".....SSSs....",
    ]),
    'shaven': part(11, [
        "...aASSSSSs..",
        "...aSSeSeS...",
        "...sSSSSSSs..",
        "....SSSmS....",
        ".....SSSs....",
    ]),
    'chops': part(11, [
        "...aASSSSSs..",
        "...aaSeSeS...",
        "...aaSSSSSs..",
        "....aSSmS....",
        ".....aSSs....",
    ]),
    'beard': part(10, [
        "...aASSSSs...",
        "...aSSeSeS...",
        "...sSSSSSSs..",
        "...aASaaaA...",
        "....aAAAAa...",
        ".....aAa.....",
    ]),
    'bigmoustache': part(11, [
        "...aASSSSSs..",
        "...aSSeSeS...",
        "...sSSSSSSs..",
        "...aaaaaaaa..",
        ".....SSSs....",
    ]),
    'woman': part(11, [
        "...aASSSSs...",
        "...aSSeSeS...",
        "...sSSSSSs...",
        "....SSSmS....",
        ".....SSs.....",
    ]),
}
BACKS = {
    'short': part(11, [
        "...aAAAAAa...",
        "...AAAAAaSs..",
        "...AAAAaaSs..",
        "....aAaaSs...",
        ".....sSSs....",
    ]),
    'beard': part(11, [
        "...aAAAAAa...",
        "...AAAAAaSs..",
        "...AAAAaaSs..",
        "....aAaaAa...",
        ".....sSAa....",
    ]),
    'woman': part(11, [
        "...aAAAAAa...",
        "...AAAAAaS...",
        "...AAaAaaS...",
        "....aAaaS....",
        ".....SSs.....",
    ]),
}

# ---- bodies (front, back); men's coats end at y4 (legs below), long coats and aprons at y2, skirts at y1 ----
BODIES = {
    'uniform': (part(4, [
        "...ICWNWcq...",
        "...ILGcGcq...",
        "...ICLccLq...",
        "...ICGcGcq...",
        "...ICcLccq...",
        "...ICGcGcq...",
        "...IcCcccq...",
    ]), part(4, [
        "...ICCCccq...",
        "...ICCCccq...",
        "...ICcCccq...",
        "...ICcCccq...",
        "...IGcCGcq...",
        "...ICcLccq...",
        "...IcCLccq...",
    ])),
    'frock': (part(2, [
        "...ICWNWcq...",
        "...ILVNVLq...",
        "...ICLVGcq...",
        "...ICcVVcq...",
        "...ICcLccq...",
        "...ICccLcq...",
        "...ICcccLq...",
        "..IIcccccqq..",
        "..IIccLccqq..",
    ]), part(2, [
        "...ICCCccq...",
        "...ICCCccq...",
        "...ICcCccq...",
        "...ICcCccq...",
        "...IGcCGcq...",
        "...ICcLccq...",
        "...ICcLccq...",
        "..IIccLccqq..",
        "..IIccLcqqq..",
    ])),
    'sack': (part(4, [
        "...ICWNWcq...",
        "...ILVNVLq...",
        "...ICLVVcq...",
        "...ICcLGcq...",
        "...ICcLccq...",
        "...ICcLGcq...",
        "...IcCcccq...",
    ]), part(4, [
        "...ICCCccq...",
        "...ICCCccq...",
        "...ICCLccq...",
        "...ICcLccq...",
        "...ICcLccq...",
        "...ICcLcqq...",
        "...IcCLccq...",
    ])),
    'shirt': (part(4, [
        "...ICWWWcq...",
        "...INcCcNq...",
        "...INcGcNq...",
        "...INcCcNq...",
        "...INcLcNq...",
        "...zzzGzzz...",
        "...QTTTtTt...",
    ]), part(4, [
        "...ICCCccq...",
        "...ICNCNcq...",
        "...ICCNccq...",
        "...ICNCNcq...",
        "...INCccNq...",
        "...zzzzzzz...",
        "...QTTTtTt...",
    ])),
    'cowhand': (part(4, [
        "...VRRRRvv...",
        "...VCRRCvv...",
        "...VCCRCvv...",
        "...VCCGCvv...",
        "...VVCCVvv...",
        "...zzzGzzz...",
        "...QTTTtTt...",
    ]), part(4, [
        "...VRRRRvv...",
        "...VVVVVvv...",
        "...VVVvVvv...",
        "...VVVvVvv...",
        "...ICCCccq...",
        "...zzzzzzz...",
        "...QTTTtTt...",
    ])),
    'smith': (part(2, [
        "...WWRRWww...",
        "...WPWRPww...",
        "...WPPPPpw...",
        "...PPPPPpp...",
        "...PPPpPpp...",
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
    'store': (part(2, [
        "...WWWNWww...",
        "...VVWNWvv...",
        "...VVWGWvv...",
        "...PPPPPpp...",
        "...PPPPPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
    ]), part(2, [
        "...WWWWWww...",
        "...VVVVVvv...",
        "...VVVvVvv...",
        "...PPPPPpp...",
        "...QTPPPtt...",
        "...QTTTtTt...",
        "...QTTTtTt...",
        "...QTT.tTt...",
        "...QTT.tTt...",
    ])),
    'bar': (part(2, [
        "...WWWNWww...",
        "...VWWNWvv...",
        "...VVWGWvv...",
        "...VVVGVvv...",
        "...PPPPPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
        "...PPPpPpp...",
    ]), part(2, [
        "...WWWWWww...",
        "...VVVVVvv...",
        "...VVVvVvv...",
        "...VVVvVvv...",
        "...PPPPPpp...",
        "...QTTTtTt...",
        "...QTTTtTt...",
        "...QTT.tTt...",
        "...QTT.tTt...",
    ])),
    'lady': (part(1, [
        "....EWWWd....",
        "...EDDGDdf...",
        "...EDDDGdf...",
        "...dRRRRRf...",
        "...EDDdDddd..",
        "..EDDDdDddd..",
        "..EDDdDDddd..",
        "..EDDdDdddd..",
        ".EDDdDDdddd..",
        ".fffffffffff.",
    ]), part(1, [
        "....EDDDd....",
        "...EDDDDdf...",
        "...EDDdDdf...",
        "...dRRRRRf...",
        "...EDRRRddd..",
        "..EDDRdRddd..",
        "..EDDdDDddd..",
        "..EDDdDdddd..",
        ".EDDdDDdddd..",
        ".fffffffffff.",
    ])),
    'shawl': (part(1, [
        "...UUUUUuu...",
        "..UUUUUUuuu..",
        "...UUUUUuu...",
        "...DPPPPPd...",
        "...DPPPPpdd..",
        "..DDPPpPPdd..",
        "..DDPPpPpdd..",
        "..DDPPPPpdd..",
        ".DDDdPPPpddd.",
        ".fffffffffff.",
    ]), part(1, [
        "...UUUUUuu...",
        "..UUUUUUuuu..",
        "...UUUUUuu...",
        "...DUUUUudd..",
        "...DDUUuddd..",
        "..DDDDUdddd..",
        "..DDDdDDddd..",
        "..DDDdDDddd..",
        ".DDDDdDDdddd.",
        ".fffffffffff.",
    ])),
}

# ---- the child (about 14 px): its own parts ----
CHILD = {
    'front': part(3, [
        ".....JHHh....",
        "....aAkkkkk..",
        "....aSeSeS...",
        "....sSSSSSs..",
        ".....SSmS....",
        "......SSs....",
        "....ICWWq....",
        "....ICGcq....",
        "....ICLcq....",
        "....ICGcq....",
        "....IcCcq....",
    ]),
    'back': part(3, [
        ".....JHHh....",
        "....aAAAhkk..",
        "....AAAAaS...",
        "....AAAaaS...",
        ".....aAaS....",
        "......sS.....",
        "....ICCCq....",
        "....ICCcq....",
        "....ICCcq....",
        "....ICCcq....",
        "....IcCcq....",
    ]),
}

# ---------------------------------------------------------------------------------------------------------------
# Types: which parts, and the build (arm columns, shoulder row, legs)
# ---------------------------------------------------------------------------------------------------------------
TYPES = {
    'agent':       dict(build='man', hat='cap', face='moustache', back='short', body='uniform'),
    'gent':        dict(build='man', hat='tophat', face='beard', back='beard', body='frock'),
    'merchant':    dict(build='man', hat='bowler', face='chops', back='short', body='sack'),
    'drummer':     dict(build='man', hat='bowler', face='moustache', back='short', body='sack'),
    'farmer':      dict(build='man', hat='slouch', face='shaven', back='short', body='shirt'),
    'cowhand':     dict(build='man', hat='cowboy', face='moustache', back='short', body='cowhand'),
    'smith':       dict(build='man', hat='short', face='moustache', back='short', body='smith'),
    'storekeeper': dict(build='man', hat='balding', face='shaven', back='short', body='store'),
    'barkeep':     dict(build='man', hat='parted', face='bigmoustache', back='short', body='bar'),
    'lady':        dict(build='woman', hat='bonnet', face='woman', back='woman', body='lady'),
    'farmwife':    dict(build='shawl', hat='bun', face='woman', back='woman', body='shawl'),
    'child':       dict(build='child'),
}
# near / far: the arm's column; top: the shoulder row; short: rows taken off a hanging arm (hands at the waist);
# legs: LEGS table or 'skirt'.
BUILD = {
    'man':   dict(near=2, far=10, top=10, legs='man'),
    'woman': dict(near=2, far=10, top=9, legs='skirt', short=3),
    'shawl': dict(near=2, far=10, top=8, legs='skirt', short=3),
    'child': dict(near=3, far=9, top=7, legs='child', short=2),
}
HEAD_Y = {'man': 11, 'woman': 11, 'shawl': 11, 'child': 8}       # rows at and above this are the head (breathing)


# ---------------------------------------------------------------------------------------------------------------
# Palettes. Each spec gives roles as (ramp, shade); cmap() turns them into code -> (ramp, shade).
# ---------------------------------------------------------------------------------------------------------------
def spec(**kw):
    base = dict(hat=('iron', 2), band=('dark', 1), hair=('wood', 3), skin='skin', coat=('iron', 2), vest=('cream', 2),
                shirt=('cream', 0), tie=('dark', 1), gold=('ochre', 0), trous=('iron', 2), shoes=('dark', 1),
                dress=('plum', 0), apron=('cream', 0), shawl=('red', 1), sleeve='coat', bag=('wood', 1))
    base.update(kw)
    return base


SPECS = {
    'agent':          ('agent', spec(hat=('navy', 1), band=('navy', 2), coat=('navy', 1), tie=('navy', 3),
                                     trous=('navy', 2), hair=('wood', 2))),
    'man_top':        ('gent', spec(hat=('iron', 3), band=('plum', 1), hair=('wood', 3), coat=('green', 2),
                                    vest=('cream', 2), tie=('red', 2), gold=('brass', 1), trous=('iron', 2))),
    'man_top.b':      ('gent', spec(hat=('iron', 3), band=('dark', 1), hair=('ochre', 2), coat=('wood', 3),
                                    vest=('cream', 1), tie=('red', 1), gold=('brass', 1), trous=('cream', 2))),
    'man_bowler':     ('merchant', spec(hat=('iron', 3), band=('dark', 2), hair=('wood', 3), coat=('iron', 1),
                                        vest=('red', 2), tie=('dark', 1), trous=('iron', 2))),
    'man_bowler.b':   ('merchant', spec(hat=('wood', 3), band=('wood', 4), hair=('iron', 1), skin='skin2',
                                        coat=('ochre', 1), vest=('green', 2), tie=('wood', 4), trous=('wood', 3))),
    'man_bag':        ('drummer', spec(hat=('wood', 3), band=('dark', 2), hair=('wood', 3), coat=('wood', 1),
                                       vest=('wood', 3), tie=('red', 1), gold=('brass', 1), trous=('iron', 2),
                                       bag=('red', 1))),
    'man_bag.b':      ('drummer', spec(hat=('iron', 3), band=('dark', 2), hair=('ochre', 1), coat=('green', 1),
                                       vest=('cream', 2), tie=('red', 2), trous=('wood', 2), bag=('plum', 0))),
    'woman_bonnet':   ('lady', spec(hat=('cream', 1), band=('red', 2), hair=('wood', 1), dress=('plum', 0),
                                    shirt=('cream', 0), gold=('cream', 1), sleeve='dress')),
    'woman_bonnet.b': ('lady', spec(hat=('ochre', 1), band=('navy', 2), hair=('wood', 3), dress=('navy', 1),
                                    shirt=('cream', 0), gold=('cream', 1), sleeve='dress')),
    'woman_shawl':    ('farmwife', spec(hair=('wood', 3), dress=('navy', 1), shawl=('red', 1), apron=('cream', 1),
                                        sleeve='dress', bag=('ochre', 1))),
    'woman_shawl.b':  ('farmwife', spec(hair=('ochre', 2), skin='skin2', dress=('green', 1), shawl=('ochre', 1),
                                        apron=('cream', 0), sleeve='dress', bag=('wood', 1))),
    'child':          ('child', spec(hat=('wood', 2), coat=('red', 1), trous=('wood', 2), hair=('ochre', 1),
                                     shirt=('cream', 0))),
    'child.b':        ('child', spec(hat=('navy', 1), coat=('green', 1), trous=('iron', 2), hair=('wood', 3),
                                     shirt=('cream', 0))),
    'worker':         ('farmer', spec(hat=('ochre', 1), band=('wood', 3), coat=('red', 1), tie=('wood', 3),
                                      trous=('navy', 1), hair=('wood', 3))),
    'worker.b':       ('farmer', spec(hat=('wood', 2), band=('wood', 4), coat=('cream', 1), tie=('wood', 3),
                                      trous=('wood', 2), hair=('ochre', 1), skin='skin2')),
    'cowhand':        ('cowhand', spec(hat=('wood', 2), band=('wood', 4), coat=('ochre', 1), vest=('wood', 3),
                                       band2=None, trous=('navy', 1), hair=('wood', 3), skin='skin2')),
    'smith':          ('smith', spec(hair=('iron', 3), apron=('ochre', 2), tie=('wood', 4), shirt=('cream', 1),
                                     band=('red', 1), trous=('iron', 2), sleeve='skin')),
    'storekeeper':    ('storekeeper', spec(hair=('iron', 1), apron=('cream', 0), vest=('green', 2), tie=('dark', 1),
                                           sleeve='shirt', trous=('iron', 2))),
    'barkeep':        ('barkeep', spec(hair=('wood', 4), apron=('cream', 0), vest=('red', 2), tie=('dark', 1),
                                       sleeve='shirt', trous=('dark', 0))),
}
for _k in ('worker', 'worker.b'):
    SPECS[_k.replace('worker', 'porter')] = SPECS[_k]          # the working man with a trunk on his shoulder
SPECS['cowhand'][1]['band'] = ('red', 1)                        # the bandana; the hat band is the hat's dark

TRAVELLERS = ['man_top', 'man_top.b', 'man_bowler', 'man_bowler.b', 'man_bag', 'man_bag.b',
              'woman_bonnet', 'woman_bonnet.b', 'woman_shawl', 'woman_shawl.b', 'child', 'child.b',
              'worker', 'worker.b', 'porter', 'porter.b']
TOWNSFOLK = ['cowhand', 'smith', 'storekeeper', 'barkeep']
LUGGAGE = {'man_bag': 'carpetbag', 'woman_shawl': 'basket', 'porter': 'trunk', 'smith': 'hammer'}


def R(name):
    return E.RID[name]


def sh(rt, d, inner=False):
    """Shade d steps from (ramp, i), clamped to the ramp; inner=True never reaches the darkest (the outline's)."""
    r, i = rt
    n = E.RLEN[R(r)]
    hi = n - 2 if inner else n - 1
    return (r, max(0, min(i + d, hi)))


def cmap(sp):
    skin = sp['skin']
    coat = sp['coat']
    sleeve = {'coat': coat, 'dress': sp['dress'], 'shirt': sp['shirt'], 'skin': (skin, 0)}[sp['sleeve']]
    band = sp['band'] if sp['band'] else sh(sp['hat'], 2)
    return {
        'J': sh(sp['hat'], -1), 'H': sh(sp['hat'], 0), 'h': sh(sp['hat'], 1), 'k': sh(sp['hat'], 2),
        'R': band, 'r': sh(band, 1),
        'A': sh(sp['hair'], 0), 'a': sh(sp['hair'], 1),
        'S': (skin, 0), 's': (skin, 1), 'm': (skin, 2), 'e': ('dark', 2),
        'I': sh(coat, -1), 'C': sh(coat, 0), 'c': sh(coat, 0), 'q': sh(coat, 1, True), 'L': sh(coat, 1, True),
        'V': sh(sp['vest'], 0), 'v': sh(sp['vest'], 1, True),
        'W': sh(sp['shirt'], 0), 'w': sh(sp['shirt'], 1), 'N': sp['tie'], 'G': sp['gold'],
        'Q': sh(sp['trous'], -1), 'T': sh(sp['trous'], 0), 't': sh(sp['trous'], 1, True),
        'B': sp['shoes'], 'b': sh(sp['shoes'], 1),
        'E': sh(sp['dress'], -1), 'D': sh(sp['dress'], 0), 'd': sh(sp['dress'], 1, True),
        'f': sh(sp['dress'], 2, True),
        'P': sh(sp['apron'], 0), 'p': sh(sp['apron'], 1, True),
        'U': sh(sp['shawl'], 0), 'u': sh(sp['shawl'], 1, True),
        'O': sh(sleeve, -1) if sp['sleeve'] != 'skin' else (skin, 0), 'o': sh(sleeve, 0),
        'K': sh(sleeve, 1, True),
        'X': sh(sp['bag'], 0), 'x': sh(sp['bag'], 1, True), 'y': ('ochre', 1),
        'Y': ('cream', 0), 'M': ('iron', 1), 'n': ('iron', 3), 'Z': ('wood', 2), 'z': ('wood', 3), 'F': ('fire', 0),
        '1': ('wood', 0), '2': ('wood', 1), '3': ('wood', 2), '4': ('wood', 3),
        '5': ('cream', 0), '6': ('cream', 1), '7': ('cream', 2), '8': ('wood', 3),
    }


# ---------------------------------------------------------------------------------------------------------------
# Grids: dict {(x, y): code}
# ---------------------------------------------------------------------------------------------------------------
def stamp(g, p, over=True, dx=0, dy=0):
    ybot, rows = p
    ytop = ybot + len(rows) - 1
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch in '. ':
                continue
            q = (X0 + c + dx, ytop - r + dy)
            if over or q not in g:
                g[q] = ch


def put(g, pts, over=True):
    for x, y, ch in pts:
        if over or (x, y) not in g:
            g[(x, y)] = ch


def shifted(g, dx=0, dy=0, pred=None):
    out = {}
    moved = {}
    for (x, y), ch in g.items():
        if pred is None or pred(x, y):
            moved[(x + dx, y + dy)] = ch
        else:
            out[(x, y)] = ch
    out.update(moved)
    return out


def body_grid(tname, back):
    """Hat or hair, face or back of the head, and body, put together (no arms, no legs)."""
    t = TYPES[tname]
    g = {}
    if t['build'] == 'child':
        stamp(g, CHILD['back' if back else 'front'])
        return g
    stamp(g, BODIES[t['body']][1 if back else 0])
    stamp(g, BACKS[t['back']] if back else FACES[t['face']])
    hat = HATS[t['hat']]
    stamp(g, hat[1 if back and len(hat) > 1 else 0])
    return g


# ---------------------------------------------------------------------------------------------------------------
# Legs: rows from y = 3 down to y = 0 (13 columns). Near leg lit ('Q' highlight, 'T'), far leg 't' (never the
# outline's colour, so a stride reads); shoes 'B' near, 'b' far. (body lift, rows).
# ---------------------------------------------------------------------------------------------------------------
LEGS = {
    'man': {
        'stand':   (0, ["....QT.tt....",
                        "....QT.tt....",
                        "....QT.tt....",
                        "....BBBbbb..."]),
        'stand2':  (0, ["....QT.tt....",
                        "...QT..tt....",
                        "...QT..tt....",
                        "...BBB.bbb..."]),
        'back':    (0, ["....QT.tt....",
                        "....QT.tt....",
                        "....QT.tt....",
                        "....BB.bb...."]),
        'back2':   (0, ["....QT.tt....",
                        "...QT..tt....",
                        "...QT..tt....",
                        "...BB..bb...."]),
        # walk: pass (far foot lifted behind), stride (near leg forward), pass (near foot lifted), stride (far forward)
        'pass1':   (0, ["....tQT......",
                        "...t.QT......",
                        "..bb.QT......",
                        ".....BBB....."]),
        'stride1': (0, ["....tQT......",
                        "...tt.QT.....",
                        "...t...QT....",
                        "..bb...BBB..."]),
        'pass2':   (0, ["....QTtt.....",
                        "....QT.t.....",
                        "...BB..t.....",
                        ".......bbb..."]),
        'stride2': (0, ["....QTtt.....",
                        "...QT...t....",
                        "...QT....t...",
                        "..BBB....bbb."]),
        # stepping up (board): the near foot on the step
        'step1':   (0, ["....QT.tt....",
                        "....BBB.tt...",
                        "........tt...",
                        "........bbb.."]),
        'lean':    (0, ["....QT.tt....",
                        "...QT...tt...",
                        "..QT.....tt..",
                        "..BBB....bbb."]),
        'crouch':  (-1, ["...QTTttt....",
                         "...QT..tt....",
                         "...BBB.bbb..."]),
    },
    'child': {
        'stand':   (0, [".....Q.t.....",
                        ".....Q.t.....",
                        ".....BBbb...."]),
        'stand2':  (0, [".....Q.t.....",
                        "....Q..t.....",
                        "....BB.bb...."]),
        'back':    (0, [".....Q.t.....",
                        ".....Q.t.....",
                        ".....B.b....."]),
        'back2':   (0, [".....Q.t.....",
                        "....Q..t.....",
                        "....B..b....."]),
        'pass1':   (0, [".....tQ......",
                        "....t.Q......",
                        "...bb.BB....."]),
        'stride1': (0, [".....tQ......",
                        "....t..Q.....",
                        "...bb..BB...."]),
        'pass2':   (0, [".....Qt......",
                        ".....Q.t.....",
                        "....BB.bb...."]),
        'stride2': (0, [".....Qt......",
                        "....Q...t....",
                        "...BB...bb..."]),
        'step1':   (0, [".....Q.t.....",
                        ".....BBt.....",
                        ".......bb...."]),
        'lean':    (0, [".....Q.t.....",
                        "....Q...t....",
                        "....BB..bb..."]),
        'crouch':  (0, [".....Q.t.....",
                        ".....Q.t.....",
                        ".....BBbb...."]),
    },
}
# Skirts: the hem row (y1) and what shows under it (y0) for each step: (body lift, [y1, y0]).
SKIRT = {
    'stand':   (0, [".fffffffffff.", "....BBBbbb..."]),
    'stand2':  (0, [".fffffffffff.", "...BBB.bbb..."]),
    'back':    (0, [".fffffffffff.", "....BB.bb...."]),
    'back2':   (0, [".fffffffffff.", "...BB..bb...."]),
    'pass1':   (0, [".fffffffffff.", ".....BBB....."]),
    'stride1': (0, ["ffffffffffff.", "..bbb...BBB.."]),
    'pass2':   (0, [".fffffffffff.", ".......bbb..."]),
    'stride2': (0, [".ffffffffffff", "..BBB...bbb.."]),
    'step1':   (0, [".BBBffffffff.", ".......bbb..."]),
    'lean':    (0, [".ffffffffffff", "..BBB...bbb.."]),
    'crouch':  (0, [".fffffffffff.", "....BBBbbb..."]),
}

# ---------------------------------------------------------------------------------------------------------------
# Arms. A pose is (path, hand): the path is the arm's line from the shoulder (0, 0) (dx forward, towards the
# facing, screen right; dy up), 1 px wide; where it runs level (a forearm held out) it is 2 px: lit on top and shaded
# underneath, so it reads against the coat. hand: one cell.
# ---------------------------------------------------------------------------------------------------------------
def _down(n, sx=0):
    return [(0, -k) for k in range(n - 2)] + [(sx, -(n - 2)), (sx, -(n - 1))]


POSES = {
    'down':     (_down(5), (0, -5)),
    'fwd':      (_down(5, 1), (1, -5)),
    'back':     (_down(5, -1), (-1, -5)),
    'out':      ([(0, 0), (0, -1), (1, -2), (2, -2), (3, -2)], (4, -2)),
    'chest':    ([(0, 0), (0, -1), (0, -2), (1, -3), (2, -3), (3, -3)], (4, -3)),
    'carry':    ([(0, 0), (0, -1), (0, -2), (1, -3)], (2, -3)),
    'push':     ([(0, 0), (0, -1), (1, -2), (2, -3)], (3, -4)),
    'reach':    ([(0, 0), (1, -1), (1, -2), (2, -3), (2, -4)], (3, -5)),
    'pull':     ([(0, 0), (0, -1), (0, -2), (0, -3)], (1, -4)),
    'up':       ([(0, 0), (1, 1), (1, 2), (1, 3)], (1, 4)),
    'up2':      ([(0, 0), (1, 1), (1, 2), (2, 3)], (2, 4)),
    'shoulder': ([(0, 0), (0, 1), (0, 2)], (0, 3)),
    'none':     ([], None),
}


def arm_cells(build, pose, side, short=0):
    """Cells of one arm: [(x, y, code)], and the hand cells [(x, y, code)]."""
    b = BUILD[build]
    path, hand = POSES[pose]
    if short and pose in ('down', 'fwd', 'back'):        # shorter hanging arms (women: hands at the waist; child)
        sx = {'down': 0, 'fwd': 1, 'back': -1}[pose]
        n = 5 - short
        path = [(0, -k) for k in range(max(0, n - 1))] + [(sx, -(n - 1))] if n > 1 else [(sx, 0)]
        hand = (sx, -n)
    x0 = X0 + b[side]
    y0 = b['top']
    cells = []
    pts = [(x0 + dx, y0 + dy) for dx, dy in path]
    for i, (x, y) in enumerate(pts):
        level = (i > 0 and pts[i - 1][1] == y) or (i + 1 < len(pts) and pts[i + 1][1] == y)
        if side == 'near':
            cells.append((x, y, 'K' if level else 'O'))
            if level:
                cells.append((x, y + 1, 'O'))
        else:
            cells.append((x, y, 'K' if level else 'o'))
            if level:
                cells.append((x, y + 1, 'o'))
    hs = [] if hand is None else [(x0 + hand[0], y0 + hand[1], 'S' if side == 'near' else 's')]
    return cells, hs


# ---------------------------------------------------------------------------------------------------------------
# Held things: small pixel maps placed by the hand cell (hx, hy): (rows, dx, dy of the top row)
# ---------------------------------------------------------------------------------------------------------------
HELD = {
    'carpetbag': ([".zz.",
                   "XXGx",
                   "XyXx",
                   "xxxx"], 0, 0),
    'basket':    ([".ZZ.",
                   "Z..Z",
                   "XXXx",
                   "XyXx",
                   ".xx."], -1, 1),
    'hammer':    (["Z..",
                   "Z..",
                   "Mnn"], 0, -1),
    'ticket':    (["Y",
                   "Y"], 1, 1),
    'punch':     (["MM",
                   "..",
                   ".n"], 0, 1),
    'punch_closed': (["MM",
                      ".n"], 0, 1),
    'lantern':   ([".z.",
                   "zFz",
                   "zzz"], -1, -1),
}
TRUNK = [            # a small steamer trunk on the near shoulder, the hand steadying it
    ".111.",
    "12222",
    "G222G",
    "33344",
]
CRATE = [
    ".1112.",
    "122223",
    "388844",
    "333444",
    ".3344.",
]
SACK = [
    ".67...",
    "55567.",
    "588667",
    "555667",
    ".6677.",
]


def place(g, rows, x0, ytop, over=True):
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch in '. ':
                continue
            q = (x0 + c, ytop - r)
            if over or q not in g:
                g[q] = ch
# ---------------------------------------------------------------------------------------------------------------
# One frame
# ---------------------------------------------------------------------------------------------------------------
def frame(who, back, legs='stand', arms=('down', 'down'), lift=0, head_dy=0, lean=0, hold=None, load=None,
          extra_hold=None):
    """who: key of SPECS. back: the back view. legs: key of LEGS / SKIRT. arms: (near pose, far pose). lift: whole
    figure raised (stepping up). head_dy: head moved (breathing). lean: head and shoulders moved forward (px).
    hold: (kind, 'near' | 'far'). load: (rows, x, ytop, over) baked in (trunk; preview goods)."""
    tname = SPECS[who][0]
    build = TYPES[tname]['build']
    b = BUILD[build]
    if back and legs in ('stand', 'stand2'):
        legs = {'stand': 'back', 'stand2': 'back2'}[legs]
    body = body_grid(tname, back)
    hy = HEAD_Y[build]
    if head_dy:
        body = shifted(body, 0, head_dy, lambda x, y: y >= hy)
    if lean:
        body = shifted(body, lean, 0, lambda x, y: y >= b['top'] - 1)
    g = {}
    if b['legs'] == 'skirt':
        bl, rows = SKIRT[legs]
        body = {p: c for p, c in body.items() if p[1] > 1}
        stamp(g, (0, rows))
    else:
        bl, rows = LEGS[b['legs']][legs]
        stamp(g, (0, rows))
    body = shifted(body, 0, bl)
    for p, c in body.items():
        g[p] = c
    near, far = arms
    short = b.get('short', 0)
    fc, fh = arm_cells(build, far, 'far', short)
    nc, nh = arm_cells(build, near, 'near', short)
    sh_ = lambda pts: [(x + (lean if y >= b['top'] - 3 else 0), y + bl, c) for x, y, c in pts]
    fc, fh, nc, nh = sh_(fc), sh_(fh), sh_(nc), sh_(nh)
    put(g, fc + fh, over=False)
    near_front = not back or near in ('down', 'fwd', 'back', 'up', 'up2', 'shoulder')
    put(g, nc + nh, over=near_front)
    hands = {'near': nh, 'far': fh}
    def hold_at(kind, side):
        hs = hands[side]
        if not hs:
            return
        hx, hyy, _ = hs[0]
        rows, dx, dy = HELD[kind]
        front = not (back and side == 'far' and kind in ('ticket', 'punch', 'punch_closed'))
        place(g, rows, hx + dx, hyy + dy, over=front)
    if hold:
        hold_at(*hold)
    if extra_hold:
        hold_at(*extra_hold)
    if load:
        rows, lx, ly, over = load
        place(g, rows, lx, ly + bl, over=over)
    if lift:
        g = shifted(g, 0, lift)
    return g


def mirror_grid(g):
    return {(-1 - x, y): c for (x, y), c in g.items()}


# ---------------------------------------------------------------------------------------------------------------
# Rasterise
# ---------------------------------------------------------------------------------------------------------------
def to_rgba(g, cm, mirrored=False, shadow=False):
    """Grid -> RGBA with a 1 px outline in the darkest shade of each neighbour's ramp.
    Returns (img, (ax, ay)): ax, ay the anchor (between the feet, at ground level)."""
    if mirrored:
        g = mirror_grid(g)
    cells = {p: cm[c] for p, c in g.items()}
    if mirrored:
        # keep the light on the upper left: in every row, each run of one ramp gets its end shades swapped
        rows = {}
        for (x, y) in cells:
            rows.setdefault(y, []).append(x)
        for y, xs in rows.items():
            xs.sort()
            run = []
            def flush(run):
                # swap the two ends' shades (the lit edge back to the left); the inside (buttons, folds) is kept
                if len(run) > 1:
                    a0, a1 = (run[0], y), (run[-1], y)
                    i0, i1 = cells[a0][1], cells[a1][1]
                    cells[a0] = (cells[a0][0], i1); cells[a1] = (cells[a1][0], i0)
            for x in xs:
                if run and (x == run[-1] + 1) and cells[(x, y)][0] == cells[(run[-1], y)][0]:
                    run.append(x)
                else:
                    flush(run); run = [x]
            flush(run)
    outl = {}
    for (x, y), (rn, ii) in cells.items():
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q in cells or q in outl:
                continue
            outl[q] = (rn, E.RLEN[R(rn)] - 1)
    allc = dict(outl); allc.update(cells)
    xs = [p[0] for p in allc]; ys = [p[1] for p in allc]
    pad = 3
    x0, x1 = min(xs) - pad, max(xs) + pad + 2
    y0, y1 = min(min(ys), -2) - 1, max(ys)
    Wd = x1 - x0 + 1; Ht = y1 - y0 + 1
    img = np.zeros((Ht, Wd, 4), np.uint8)
    for (x, y), (rn, ii) in allc.items():
        ii = min(ii, E.RLEN[R(rn)] - 1)
        r = y1 - y; c = x - x0
        img[r, c, :3] = E.PAL[R(rn), ii]; img[r, c, 3] = 255
    ax = -x0              # pixel corner: the left edge of cell x = 0
    ay = y1 + 1           # the bottom edge of row y = 0
    return trim(img, (ax, ay))


def trim(img, anchor):
    a = img[..., 3] > 0
    ys, xs = np.nonzero(a)
    r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return img[r0:r1, c0:c1].copy(), (anchor[0] - c0, anchor[1] - r0)


# ---------------------------------------------------------------------------------------------------------------
# Animations
# ---------------------------------------------------------------------------------------------------------------
DIRS = {'se': (False, False), 'sw': (False, True), 'ne': (True, False), 'nw': (True, True)}
DRAWN = ('se', 'ne', 'sw', 'nw')    # all four drawn and lit from the upper left: do not mirror people

WALK = [('pass1', ('fwd', 'back')), ('stride1', ('back', 'fwd')), ('pass2', ('back', 'fwd')), ('stride2', ('fwd', 'back'))]


def load_spec(item, mark, back):
    lines = {'crate': CRATE, 'sack': SACK}[item]
    fill = {'crate': '3', 'sack': '5'}[item]
    lines = [l.replace('8', '8' if mark else fill) for l in lines]
    h = CARRY_HANDS['ne' if back else 'se']
    w = len(lines[0])
    return (lines, -w // 2, -h[1] + len(lines) - 1, not back)


def anims_for(who):
    """Returns {anim: [frame kwargs]} for one character key."""
    base = who.split('.')[0]
    lug = LUGGAGE.get(base)
    A = {}
    def with_lug(kw):
        kw = dict(kw)
        kw.setdefault('arms', ('down', 'down'))
        if lug == 'trunk':
            kw['arms'] = ('shoulder', kw['arms'][1])
            kw['load'] = (TRUNK, -7, 15, True)
        elif lug == 'basket':
            kw['arms'] = (kw['arms'][0], 'carry')
            kw['hold'] = ('basket', 'far')
        elif lug:
            kw['arms'] = (kw['arms'][0], 'down')
            kw['hold'] = (lug, 'far')
        return kw
    A['idle'] = [with_lug(dict(legs='stand')), with_lug(dict(legs='stand2', head_dy=-1))]
    A['walk'] = [with_lug(dict(legs=l, arms=a)) for l, a in WALK]
    if who in TRAVELLERS:
        A['ticket'] = [with_lug(dict(legs='stand')), with_lug(dict(legs='stand', head_dy=-1))]
        # the ticket in the far hand, held out; luggage moves to the near hand
        for f in A['ticket']:
            f['arms'] = ('shoulder' if lug == 'trunk' else 'down', 'out')
            f['hold'] = ('ticket', 'far')
            if lug in ('carpetbag', 'hammer', 'basket'):
                f['extra_hold'] = (lug, 'near')
        A['board'] = [with_lug(dict(legs='step1', arms=('back', 'fwd'))),
                      with_lug(dict(legs='stand', arms=('down', 'fwd'), lift=2)),
                      with_lug(dict(legs='pass2', arms=('fwd', 'back'), lift=4))]
    return A


def agent_anims():
    A = {}
    A['idle'] = [dict(legs='stand'), dict(legs='stand2', head_dy=-1)]
    A['walk'] = [dict(legs=l, arms=a) for l, a in WALK]
    A['punch'] = [dict(legs='stand', arms=('chest', 'out'), hold=('punch', 'far')),
                  dict(legs='stand', arms=('chest', 'out'), hold=('punch_closed', 'far'), head_dy=-1),
                  dict(legs='stand', arms=('chest', 'out'), hold=('punch', 'far'))]
    A['carry'] = [dict(legs=l, arms=('carry', 'carry')) for l, _ in WALK]
    A['push'] = [dict(legs=l, arms=('push', 'push'), lean=1) for l, _ in WALK]
    A['throw'] = [dict(legs='lean', arms=('reach', 'reach'), lean=1),
                  dict(legs='crouch', arms=('pull', 'pull')),
                  dict(legs='stand', arms=('pull', 'down'))]
    A['wave'] = [dict(legs='stand', arms=('down', 'up')), dict(legs='stand', arms=('down', 'up2'))]
    A['lantern'] = [dict(legs='stand', arms=('down', 'down'), hold=('lantern', 'far')),
                    dict(legs='stand2', arms=('down', 'down'), hold=('lantern', 'far'), head_dy=-1)]
    return A


# Where the game draws a carried item (offset in px from the feet anchor to the item's anchor) and the cart grip.
# The carry pose holds the hands at y 7 in front; a carried picture (about 10 x 8 px) is drawn with its bottom at
# y 3 in front (se, sw), and behind (ne, nw: drawn before the body) at y 8 and 5 px to the side of the facing, so it
# shows past the shoulder.
CARRY_HANDS = {'se': (0, -3), 'ne': (5, -8), 'sw': (0, -3), 'nw': (-5, -8)}
PUSH_GRIP = {'se': (5, -6), 'ne': (5, -6), 'sw': (-5, -6), 'nw': (-5, -6)}
CART_BEHIND = 2.25    # how far (u) behind the cart's centre the pusher stands (the committed handcart's 'pusher')

TAGS = {'store': ('green', 0), 'smithy': ('glass', 1), 'saloon': ('red', 0)}

FRAME_NOTES = {
    'idle': 'standing; frame 1 is the breath (head 1 px lower, weight on the other foot)',
    'walk': 'pass, stride, pass, stride; about 6 to 8 frames a second at walking pace; frame 0 also stands',
    'ticket': 'holding the ticket out to the agent (frame 1 the breath)',
    'board': 'stepping up into a coach door: foot on the step, up, in (the frame is drawn 0, 2 and 4 px higher)',
    'punch': 'ticket punch held out, closing on frame 1',
    'carry': 'pass, stride, pass, stride with an item held in front; frame 0 also stands. The item is drawn by '
             'the game at the hands (extra hands: offset from the anchor to the item\'s bottom centre)',
    'push': 'pass, stride, pass, stride leaning into the cart handles (extra grip: offset to the hands)',
    'throw': 'reach for the lever, pull back, straighten',
    'wave': 'waving a train off (play 0-1 back and forth)',
    'lantern': 'standing holding a lit lantern (dusk), frame 1 the breath',
}


def emit_frames(who, kwlist, d, extra=None):
    back, mir = DIRS[d]
    cm = cmap(SPECS[who][1])
    if extra:
        cm.update(extra)
    return [to_rgba(frame(who, back, **kw), cm, mirrored=mir) for kw in kwlist]


def build_all():
    """Returns a list of (contract key, [frames as (img, anchor)], meta). Keys: ppl/<who>/<anim>/<dir>; the
    pipeline appends /0, /1, ... per frame. All four facings are drawn and re-lit; the renderer must not mirror them."""
    out = []
    def meta_for(anim, more=None):
        m = {'frame_note': FRAME_NOTES.get(anim, ''), 'anchor': 'between the feet, at ground level',
             'mirror': False}
        if more:
            m.update(more)
        return m
    for d in DRAWN:
        for anim, kws in agent_anims().items():
            more = None
            if anim == 'carry':
                more = {'extra': {'hands': list(CARRY_HANDS[d])}}
            if anim == 'push':
                more = {'extra': {'grip': list(PUSH_GRIP[d])}}
            out.append((f'ppl/agent/{anim}/{d}', emit_frames('agent', kws, d), meta_for(anim, more)))
    for who in TRAVELLERS + TOWNSFOLK:
        for d in DRAWN:
            for anim, kws in anims_for(who).items():
                more = {'lift_px': [0, 2, 4]} if anim == 'board' else None
                out.append((f'ppl/{who}/{anim}/{d}', emit_frames(who, kws, d), meta_for(anim, more)))
    return out


def build_preview_goods():
    """The agent carrying a crate and a sack, goods baked in: for the review pictures only (the game draws the
    goods sprite at the hands)."""
    out = []
    for d in DRAWN:
        back, mir = DIRS[d]
        for item in ('crate', 'sack'):
            ls = load_spec(item, True, back)
            kws = [dict(legs=l, arms=('carry', 'carry'), load=ls) for l, _ in WALK]
            out.append((f'agent carry {item} {d}', emit_frames('agent', kws, d, {'8': TAGS['store']})))
    return out
