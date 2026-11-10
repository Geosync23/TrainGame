# People: 1866 travellers, townsfolk and the station agent, as hand-made pixel art assembled by code.
#
# How a frame is made
#   Each character type has a hand-drawn pixel map of its head, hat and body (TPL, one for the front view and,
#   where the automatic one is not good enough, one for the back view). Arms, legs, hands, held things and the
#   walk are added by code from small pose tables, so every type gets every animation with the same timing.
#   The front view faces world +x (direction 'e', screen lower right, three quarters front); the back view faces
#   -z (direction 'n', upper right, three quarters back). 's' and 'w' are those two mirrored, then re-shaded so the
#   light still comes from the upper left (each run of one colour ramp in a row is reversed after the mirror).
#
# Units: one pixel map cell is one native pixel. x is measured from the anchor (the point between the feet:
#   cell x covers [x, x + 1)), y counts up from the ground row (y = 0 is the row of the shoes).
# Outline: a 1 px outline in the darkest shade of each neighbouring cell's colour ramp (never pure black).
import numpy as np
import engine as E

# ---------------------------------------------------------------------------------------------------------------
# Palette characters. Each character spec maps roles to (ramp, index); cmap() turns that into code -> colour.
#   H h k  hat (light, mid, dark/brim)      R    hat band, bonnet ribbon
#   A a    hair (light, dark)               S s  skin (light, shade)   e eye   m mouth / nostril
#   C c q  coat (light, mid, shade)         L    coat trim, lapel, cuff, piping
#   V v    waistcoat / bodice               W w  shirt, collar         N  necktie, cravat, suspenders
#   G      brass or gold (buttons, badge, watch chain)
#   T t    trousers (lit leg, shade leg)    B b  shoes (sole/toe, upper)
#   D d f  dress (light, mid, shade)        P p  apron                 U u  shawl
#   O o    sleeve (near arm lit, far arm shade): the role 'sleeve' names which ramp
#   X x y  bag, basket, trunk               Y    ticket                M n  metal (punch, hammer head)
#   Z z    wood (handles, lantern frame)    F    lamp flame
# ---------------------------------------------------------------------------------------------------------------

TPL = {}

# Columns: 11 per row, column 5 is x = 0. The last row of a template sits at y = TPL_BOTTOM[name].
# Adult men: shoes y0, legs y1-2, body y3-7 (shoulders y7), chin y8, eyes y9, forehead y10, hat from y11.

TPL['agent'] = [
"....HHHh...",
"...HHGHHh..",
"...kkkkkkk.",
"....asss...",
"....SeSes..",
".....Sms...",
"...CCWWc...",
"...CLGCc...",
"...CLCGc...",
"...CLGCc...",
"...CCLcq...",
]
TPL['agent.back'] = [
"....HHHh...",
"...HHHHhh..",
"...kkkkkkk.",
"....AAAs...",
"....AAas...",
".....aSs...",
"...CCCCc...",
"...CCCcc...",
"...CCCcq...",
"...CLCLq...",
"...CCccq...",
]

TPL['gent'] = [
"....HHHh...",
"....HHHh...",
"....HHHh...",
"....RRRr...",
"...kkkkkk..",
"....asss...",
"....SeSes..",
".....AAs...",
"...CLWLc...",
"...CVNVc...",
"...CVGVc...",
"...CCVcq...",
"...CCccq...",
"...Cc.cq...",
]
TPL['gent.back'] = [
"....HHHh...",
"....HHHh...",
"....HHHh...",
"....RRRr...",
"...kkkkkk..",
"....AAAs...",
"....AAas...",
".....aSs...",
"...CCCCc...",
"...CCCcc...",
"...CCCcq...",
"...CLCLq...",
"...CCcqq...",
"...Cc.cq...",
]

TPL['merchant'] = [
".....HHh...",
"....HHHHh..",
"...kRRRrkk.",
"....asss...",
"....SeSes..",
".....AAs...",
"...CLWLc...",
"...CVNVc...",
"...CVGVc...",
"...CCVcq...",
"...CCccq...",
]
TPL['merchant.back'] = [
".....HHh...",
"...HHHHhh..",
"...kRRRrkk.",
"....AAAs...",
"....AAas...",
".....aSs...",
"...CCCCc...",
"...CCCcc...",
"...CCCcq...",
"...CCccq...",
"...CCccq...",
]

TPL['drummer'] = [
".....HHh...",
"....HRRrh..",
"..kkkkkkkk.",
"....asss...",
"....SeSes..",
"....aAAa...",
"...CLWLc...",
"...CCNCc...",
"...CLGCc...",
"...CLCcq...",
"...CCccq...",
]
TPL['drummer.back'] = [
".....HHh...",
"...hHRRrh..",
"..kkkkkkkk.",
"....AAAs...",
"....AAas...",
"....aAAa...",
"...CCCCc...",
"...CCCcc...",
"...CCCcq...",
"...CCccq...",
"...CCccq...",
]

TPL['farmer'] = [
".....HHh...",
"....HHHHh..",
"..kkkkkkk..",
"....asss...",
"....SeSes..",
"....aAAa...",
"...CNWNc...",
"...CNCNc...",
"...CNCNc...",
"...CNCNq...",
"...TTTtt...",
]
TPL['farmer.back'] = [
".....HHh...",
"...hHHHHh..",
"..kkkkkkk..",
"....AAAs...",
"....AAas...",
".....aSs...",
"...CCNCc...",
"...CNCNc...",
"...NCcNc...",
"...NCcNq...",
"...TTTtt...",
]

TPL['cowhand'] = [
".....HHh...",
"...hHRRrh..",
".kkkkkkkkk.",
"....asss...",
"....SeSes..",
".....Sms...",
"...VRWVv...",
"...VCRCv...",
"...VCCCv...",
"...VCCcv...",
"...GTTtt...",
]
TPL['cowhand.back'] = [
".....HHh...",
"...hHRRrh..",
".kkkkkkkkk.",
"....AAAs...",
"....AAas...",
".....aSs...",
"...VVVVv...",
"...VVVVv...",
"...VVVvv...",
"...VVvvv...",
"...TTTtt...",
]

TPL['smith'] = [
"...........",
"...........",
"....AAAa...",
"....aSSs...",
"....SeSes..",
"....aAAa...",
"...WWWWw...",
"...WPPPw...",
"...WPNPp...",
"...PPPpp...",
"...PPPpp...",
"...PPPpp...",
]
TPL['smith.back'] = [
"...........",
"...........",
"....AAAa...",
"....AAAa...",
"....AAaa...",
".....aSs...",
"...WWWWw...",
"...WNWNw...",
"...WWNww...",
"...TPTtp...",
"...TTTtt...",
"...TTttt...",
]

TPL['storekeeper'] = [
"...........",
"...........",
"....aaaa...",
"....SSSs...",
"....SeSes..",
".....AAs...",
"...WLWLw...",
"...WVNVw...",
"...WVGVw...",
"...PPPpp...",
"...PPPpp...",
"...PPPpp...",
]
TPL['storekeeper.back'] = [
"...........",
"...........",
"....aaaa...",
"....SSSs...",
"....aaas...",
".....aSs...",
"...WWWWw...",
"...WVVVw...",
"...WVVvw...",
"...PPPpp...",
"...PPPpp...",
"...PPpp....",
]

TPL['barkeep'] = [
"...........",
"...........",
"....AAAa...",
"....aSSs...",
"....SeSes..",
".....AAAA..",
"...WWNWw...",
"...VWNWv...",
"...VWGWv...",
"...PPPpp...",
"...PPPpp...",
"...PPPpp...",
]
TPL['barkeep.back'] = [
"...........",
"...........",
"....AAAa...",
"....AAAa...",
"....AAaa...",
".....aSs...",
"...WWWWw...",
"...VVVVv...",
"...VVVvv...",
"...VVvvv...",
"...TTTtt...",
"...TTttt...",
]

# Women: body y3-7 is a bodice and the top of the skirt; the skirt runs to the ground (hem rows are animated).
TPL['lady'] = [
"....HHHh...",
"...HHHHHk..",
"...HAsssk..",
"...hSeSes..",
"...hRSms...",
"...ODWDdo..",
"....DGDd...",
"....VVvv...",
"...DDDdDf..",
"...DDdDdf..",
"..DDDDDddf.",
"..DDDDdddf.",
"..fDDDdddf.",
]
TPL['lady.back'] = [
"....HHHh...",
"...HHHHHk..",
"...HHHHhk..",
"...hHHHhs..",
"....RRrs...",
"...ODDDdo..",
"....DDDd...",
"....VVvv...",
"...DDDdDf..",
"...DDdDdf..",
"..DDDDDddf.",
"..DDDDdddf.",
"..fDDDdddf.",
]

TPL['farmwife'] = [
"....AAa....",
"...aAAAa...",
"....aSSs...",
"....SeSes..",
".....Sms...",
"...UUWUu...",
"..UUUUUuu..",
"...uUUuu...",
"...DDDDdf..",
"...PPPPpf..",
"..DPPPPpdf.",
"..DPPPPpdf.",
"..fDDDdddf.",
]
TPL['farmwife.back'] = [
"....AAa....",
"...aAAAa...",
"....AAAa...",
"....AAaa...",
".....aSs...",
"...UUUUu...",
"..UUUUUuu..",
"...UUUuu...",
"...DDUDdf..",
"...DDDDdf..",
"..DDDDDddf.",
"..DDDDdddf.",
"..fDDDdddf.",
]

# Child: shoes y0, legs y1, body y2-5, chin y6, eyes y7, forehead y8, cap y9-10.
TPL['child'] = [
"....HHh....",
"...kkkkk...",
"....asss...",
"....SeSes..",
".....Sms...",
"....CWCc...",
"....CGCc...",
"....CCcq...",
"....CCcq...",
]
TPL['child.back'] = [
"....HHh....",
"...kkkkk...",
"....AAAs...",
"....AAas...",
".....aSs...",
"....CCCc...",
"....CCCc...",
"....CCcq...",
"....CCcq...",
]

TPL_BOTTOM = {'agent': 3, 'gent': 2, 'merchant': 3, 'drummer': 3, 'farmer': 3, 'cowhand': 3, 'smith': 1,
              'storekeeper': 1, 'barkeep': 1, 'lady': 0, 'farmwife': 0, 'child': 2}

# Body geometry per build: the arm columns (near arm, the viewer's left in the front view; far arm), the
# shoulder row (the sleeve starts one row below it), the hand row, and the legs.
BUILD = {
    'man':   dict(near=-3, far=3, sleeve=(6, 5), hand=4, legs='trousers', leg_top=2),
    'woman': dict(near=-2, far=3, sleeve=(6, 5), hand=4, legs='skirt', leg_top=0),
    'child': dict(near=-2, far=2, sleeve=(4,), hand=3, legs='child', leg_top=1),
}

# ---------------------------------------------------------------------------------------------------------------
# Types: (template, build, spec).  Specs give (ramp, index) for each role.
# ---------------------------------------------------------------------------------------------------------------
def spec(**kw):
    base = dict(hat=('iron', 2), band=('dark', 1), hair=('wood', 3), skin='skin', coat=('iron', 2), trim=None,
                vest=('cream', 2), shirt=('cream', 0), tie=('dark', 1), trous=('iron', 2), shoes=('dark', 1),
                dress=('plum', 0), apron=('cream', 0), shawl=('red', 1), sleeve='coat', bag=('wood', 1),
                gold=('brass', 1))
    base.update(kw)
    return base


SPECS = {
    'agent':       ('agent', 'man', spec(hat=('navy', 1), band=('navy', 2), coat=('navy', 1), trim=('navy', 0),
                                         trous=('navy', 1), hair=('wood', 3))),
    'man_top':        ('gent', 'man', spec(hat=('iron', 3), band=('dark', 2), coat=('iron', 2), trim=('iron', 3),
                                        vest=('plum', 1), trous=('iron', 1), hair=('wood', 3))),
    'man_top.b':      ('gent', 'man', spec(hat=('wood', 3), band=('dark', 2), coat=('wood', 2), trim=('wood', 3),
                                        vest=('cream', 1), trous=('cream', 2), hair=('ochre', 1), tie=('red', 2))),
    'man_bowler':    ('merchant', 'man', spec(hat=('iron', 3), band=('dark', 2), coat=('iron', 1), trim=('iron', 2),
                                            vest=('red', 2), trous=('iron', 2), hair=('wood', 2))),
    'man_bowler.b':  ('merchant', 'man', spec(hat=('wood', 2), band=('wood', 4), coat=('ochre', 1), trim=('ochre', 2),
                                            vest=('green', 2), trous=('wood', 3), hair=('iron', 1), skin='skin2')),
    'man_bag':     ('drummer', 'man', spec(hat=('wood', 1), band=('red', 1), coat=('wood', 2), trim=('wood', 3),
                                           trous=('iron', 2), hair=('wood', 3), bag=('red', 1), tie=('green', 2))),
    'man_bag.b':   ('drummer', 'man', spec(hat=('iron', 1), band=('dark', 1), coat=('green', 1), trim=('green', 2),
                                           trous=('wood', 2), hair=('ochre', 1), bag=('plum', 0), tie=('red', 1))),
    'woman_bonnet':        ('lady', 'woman', spec(hat=('cream', 1), band=('red', 1), dress=('plum', 0), vest=('plum', 1),
                                          sleeve='dress', hair=('ochre', 1))),
    'woman_bonnet.b':      ('lady', 'woman', spec(hat=('ochre', 0), band=('navy', 1), dress=('navy', 0), vest=('navy', 1),
                                          sleeve='dress', hair=('wood', 3))),
    'woman_shawl':    ('farmwife', 'woman', spec(dress=('navy', 0), shawl=('red', 1), apron=('cream', 1), sleeve='dress',
                                              hair=('wood', 2), skin='skin2', bag=('ochre', 1))),
    'woman_shawl.b':  ('farmwife', 'woman', spec(dress=('green', 1), shawl=('ochre', 1), apron=('cream', 0), sleeve='dress',
                                              hair=('ochre', 1), bag=('wood', 1))),
    'child':       ('child', 'child', spec(hat=('wood', 2), coat=('red', 1), trous=('wood', 2), hair=('ochre', 1))),
    'child.b':     ('child', 'child', spec(hat=('navy', 1), coat=('green', 1), trous=('iron', 2), hair=('wood', 3))),
    'worker':      ('farmer', 'man', spec(hat=('ochre', 1), coat=('red', 1), tie=('wood', 3), trous=('navy', 1),
                                          hair=('wood', 3))),
    'worker.b':    ('farmer', 'man', spec(hat=('wood', 2), coat=('cream', 1), tie=('wood', 3), trous=('wood', 2),
                                          hair=('ochre', 1), skin='skin2')),
    'cowhand':     ('cowhand', 'man', spec(hat=('wood', 2), band=('wood', 4), coat=('ochre', 0), vest=('wood', 2),
                                           band2=None, trous=('navy', 1), hair=('wood', 3), skin='skin2',
                                           tie=('red', 1))),
    'smith':       ('smith', 'man', spec(hair=('iron', 3), apron=('wood', 3), tie=('wood', 2), shirt=('cream', 0),
                                         trous=('iron', 2), sleeve='skin')),
    'storekeeper': ('storekeeper', 'man', spec(hair=('iron', 1), apron=('cream', 0), vest=('green', 1),
                                               tie=('dark', 1), trim=('red', 1), sleeve='shirt', trous=('iron', 2))),
    'barkeep':     ('barkeep', 'man', spec(hair=('wood', 4), apron=('cream', 0), vest=('red', 1), tie=('dark', 1),
                                           sleeve='shirt', trous=('dark', 0))),
}
for _k in ('worker', 'worker.b'):
    SPECS[_k.replace('worker', 'porter')] = SPECS[_k]          # the working man with a trunk on his shoulder

# The contract's travellers (plans/proto-sprites.md), then extra types (not in the contract yet: guessed).
TRAVELLERS = ['man_top', 'man_top.b', 'man_bowler', 'man_bowler.b', 'man_bag', 'man_bag.b',
              'woman_bonnet', 'woman_bonnet.b', 'woman_shawl', 'woman_shawl.b', 'child', 'child.b',
              'worker', 'worker.b', 'porter', 'porter.b']
TOWNSFOLK = ['cowhand', 'smith', 'storekeeper', 'barkeep']
# What each traveller carries in the far hand ('trunk' rides on the shoulder).
LUGGAGE = {'man_bag': 'carpetbag', 'woman_shawl': 'basket', 'porter': 'trunk', 'smith': 'hammer'}


def sh(rt, d):
    r, i = rt
    n = E.RLEN[E.R(r)]
    return (r, min(i + d, n - 1))


def cmap(sp):
    skin = sp['skin']
    coat = sp['coat']
    trim = sp['trim'] or sh(coat, 1)
    sleeve = {'coat': coat, 'dress': sp['dress'], 'shirt': sp['shirt'], 'skin': (skin, 0)}[sp['sleeve']]
    return {
        'H': sh(sp['hat'], 0), 'h': sh(sp['hat'], 1), 'k': sh(sp['hat'], 2), 'R': sp['band'], 'r': sh(sp['band'], 1),
        'A': sh(sp['hair'], 0), 'a': sh(sp['hair'], 1),
        'S': (skin, 0), 's': (skin, 1), 'e': ('wood', 4), 'm': (skin, 2),
        'C': sh(coat, 0), 'c': sh(coat, 1), 'q': sh(coat, 2), 'L': trim,
        'V': sh(sp['vest'], 0), 'v': sh(sp['vest'], 1),
        'W': sh(sp['shirt'], 0), 'w': sh(sp['shirt'], 1), 'N': sp['tie'], 'G': sp['gold'],
        'T': sh(sp['trous'], 0), 't': sh(sp['trous'], 1), 'B': sp['shoes'], 'b': sh(sp['shoes'], 1),
        'D': sh(sp['dress'], 0), 'd': sh(sp['dress'], 1), 'f': sh(sp['dress'], 2),
        'P': sh(sp['apron'], 0), 'p': sh(sp['apron'], 1),
        'U': sh(sp['shawl'], 0), 'u': sh(sp['shawl'], 1),
        'O': sh(sleeve, 0), 'o': sh(sleeve, 1),
        'X': sh(sp['bag'], 0), 'x': sh(sp['bag'], 1), 'y': sh(sp['bag'], 2),
        'Y': ('cream', 0), 'M': ('iron', 1), 'n': ('iron', 2),
        'Z': ('wood', 2), 'z': ('wood', 3), 'F': ('fire', 0),
        # goods carried (crate, sack) and shop marks
        '1': ('wood', 0), '2': ('wood', 1), '3': ('wood', 2), '4': ('wood', 3),
        '5': ('cream', 0), '6': ('cream', 1), '7': ('cream', 2),
    }


# ---------------------------------------------------------------------------------------------------------------
# Grids: dict {(x, y): code}
# ---------------------------------------------------------------------------------------------------------------
def stamp(g, rows, x0, ytop, over=True):
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch in '. ':
                continue
            p = (x0 + c, ytop - r)
            if over or p not in g:
                g[p] = ch


def put(g, pts, over=True):
    for x, y, ch in pts:
        if over or (x, y) not in g:
            g[(x, y)] = ch


def shifted(g, dx=0, dy=0, pred=None):
    out = {}
    for (x, y), ch in g.items():
        if pred is None or pred(x, y):
            out[(x + dx, y + dy)] = ch
        else:
            out[(x, y)] = ch
    return out


def template(name, back):
    key = name + ('.back' if back else '')
    rows = TPL[key]
    g = {}
    stamp(g, rows, -5, TPL_BOTTOM[name] + len(rows) - 1)
    return g


# ---------------------------------------------------------------------------------------------------------------
# Legs. Each entry: (body lift, rows from the top leg row down to y = 0, x of the first column).
# Trousers: lit near leg 'T', far leg in shade 't'; shoes 'B' (with toe 'b' in the walking direction).
# ---------------------------------------------------------------------------------------------------------------
LEGS = {
    'trousers': {
        'stand':   (0, ["TT.tt",
                        "TT.tt",
                        "BB.Bb"], -2),
        'stand2':  (0, ["TT.tt",
                        "TT.tt",
                        "BBbBb"], -2),
        # walk: pass (far foot lifted), stride (near leg back, far forward), pass (near foot lifted), stride
        'pass1':   (1, [".TT.tt",
                        ".TT.tt",
                        ".TT.Bb",
                        ".Bb..."], -3),
        'stride1': (0, [".TTtt.",
                        "TT..tt",
                        "Bb..Bb"], -3),
        'pass2':   (1, [".TT.tt",
                        ".TT.tt",
                        ".Bb.tt",
                        "....Bb"], -3),
        'stride2': (0, ["..TTt.",
                        ".TT.tt",
                        "Bb...Bb"], -3),
        # stepping up (board): the near foot on the step, then the far one
        'step1':   (1, ["TT.tt",
                        "Bb.tt",
                        "...Bb"], -2),
        'lean':    (0, ["TT.tt.",
                        ".TT.tt",
                        ".Bb..Bb"], -2),
        'crouch':  (-1, ["TTtt.",
                         "Bb.Bb"], -2),
    },
    'child': {
        'stand':   (0, ["T.t",
                        "B.B"], -1),
        'stand2':  (0, ["T.t",
                        "BbB"], -1),
        'pass1':   (1, ["T.t",
                        "T.B",
                        "B.."], -1),
        'stride1': (0, ["TTt.",
                        "B..B"], -2),
        'pass2':   (1, ["T.t",
                        "B.t",
                        "..B"], -1),
        'stride2': (0, [".Tt.",
                        "B..B"], -2),
        'step1':   (1, ["T.t",
                        "B.t",
                        "..B"], -1),
        'lean':    (0, ["T.t",
                        "B..B"], -1),
        'crouch':  (0, ["T.t",
                        "B.B"], -1),
    },
}
# Skirts: the two hem rows (y1, y0) per step; the shoe peeks out under the hem on a step.
SKIRT = {
    'stand':   (0, ["DDDDdddf",
                    "fDDDdddf"], -3),
    'stand2':  (0, ["DDDDdddf",
                    "fDDDdddf"], -3),
    'pass1':   (1, ["DDDDdddf",
                    "fDDDdddf",
                    ".B...b.."], -3),
    'stride1': (0, ["DDDDddddf",
                    "BfDDdddfB"], -4),
    'pass2':   (1, ["DDDDdddf",
                    "fDDDdddf",
                    "...B.b.."], -3),
    'stride2': (0, [".DDDDdddf",
                    "fDDDdddBb"], -4),
    'step1':   (1, ["DDDDdddf",
                    "fDDDdddf",
                    ".Bb....."], -3),
    'lean':    (0, ["DDDDddddf",
                    "fDDDddddf"], -3),
    'crouch':  (0, ["DDDDdddf",
                    "fDDDdddf"], -3),
}

# ---------------------------------------------------------------------------------------------------------------
# Arms. Points relative to (arm column, shoulder): sleeve 'O' (near) / 'o' (far), hand 'S' / 's'.
# Each pose gives (near arm points, far arm points) as (dx, dy, code) with dy measured from the first sleeve row.
# 'H' in a pose means the hand cell: replaced by S (near) or s (far).
# ---------------------------------------------------------------------------------------------------------------
def arm_pts(build, pose, side):
    b = BUILD[build]
    top = b['sleeve'][0]
    n = len(b['sleeve'])           # sleeve length in rows
    x0 = b['near'] if side == 'near' else b['far']
    sgn = -1 if side == 'near' else 1          # outward
    O = 'O' if side == 'near' else 'o'
    Hd = 'S' if side == 'near' else 's'
    pts = []
    def sl(x, y): pts.append((x, y, O))
    def hd(x, y): pts.append((x, y, Hd))
    hand_y = top - n
    if pose == 'down':
        for k in range(n): sl(x0, top - k)
        hd(x0, hand_y)
    elif pose == 'fwd':          # swinging forward (towards the facing, screen right in the front view)
        for k in range(n): sl(x0 + (1 if k == n - 1 and side == 'far' else 0), top - k)
        hd(x0 + 1, hand_y + (1 if n > 1 else 0))
    elif pose == 'back':         # swinging back (screen left)
        for k in range(n): sl(x0 - (1 if k == n - 1 and side == 'near' else 0), top - k)
        hd(x0 - 1, hand_y + (1 if n > 1 else 0))
    elif pose == 'carry':        # forearm forward, hand at the side of a load held in front at chest height
        sl(x0, top)
        hd(x0, top - 1)
    elif pose == 'out':          # held straight out in front at chest height (ticket, punch)
        sl(x0, top); sl(x0 + 1, top)
        hd(x0 + 2, top)
    elif pose == 'chest':        # hand at the chest (near arm crossing in front of the body)
        sl(x0, top); sl(x0 + 1, top - 1)
        hd(x0 + 2, top - 1)
    elif pose == 'push':         # both arms reaching down and forward to cart handles
        sl(x0, top); sl(x0 + 1, top - 1)
        hd(x0 + 2, top - 2)
    elif pose == 'reach':        # down and forward, low (lever)
        sl(x0, top); sl(x0 + 1, top - 1); sl(x0 + 1, top - 2)
        hd(x0 + 2, top - 3)
    elif pose == 'pull':         # pulled back to the hip
        sl(x0, top); sl(x0, top - 1)
        hd(x0 + 1, top - 2)
    elif pose == 'up':           # raised high (wave)
        sl(x0, top + 1); sl(x0 + sgn, top + 2)
        hd(x0 + sgn, top + 3)
    elif pose == 'up2':
        sl(x0, top + 1); sl(x0, top + 2)
        hd(x0, top + 3)
    elif pose == 'shoulder':     # hand up at the shoulder steadying a load on it
        sl(x0, top); sl(x0, top + 1)
        hd(x0, top + 2)
    elif pose == 'none':
        pass
    else:
        raise ValueError(pose)
    return pts


# ---------------------------------------------------------------------------------------------------------------
# Held things, drawn relative to a hand (hx, hy).
# ---------------------------------------------------------------------------------------------------------------
def held(kind, hx, hy, back, swing=0):
    """Small items in a hand. Returns (points, in_front)."""
    p = []
    if kind == 'carpetbag':      # a soft bag with a brass clasp, hanging below the hand
        x0 = hx - 1 + swing
        p += [(hx, hy - 1, 'z'), (x0, hy - 2, 'X'), (x0 + 1, hy - 2, 'G'), (x0 + 2, hy - 2, 'x'),
              (x0, hy - 3, 'X'), (x0 + 1, hy - 3, 'y'), (x0 + 2, hy - 3, 'x'),
              (x0, hy - 4, 'x'), (x0 + 1, hy - 4, 'x'), (x0 + 2, hy - 4, 'y')]
        return p, True
    if kind == 'basket':         # a basket on the forearm, a cloth on top
        x0 = hx - 1
        p += [(x0, hy + 1, 'z'), (x0 + 2, hy + 1, 'z'), (x0 + 1, hy + 2, 'z'),
              (x0, hy, '6'), (x0 + 1, hy, '5'), (x0 + 2, hy, '6'),
              (x0, hy - 1, 'X'), (x0 + 1, hy - 1, 'x'), (x0 + 2, hy - 1, 'X'),
              (x0, hy - 2, 'x'), (x0 + 1, hy - 2, 'X'), (x0 + 2, hy - 2, 'y')]
        return p, True
    if kind == 'hammer':         # hammer hanging from the hand, head down
        p += [(hx, hy - 1, 'Z'), (hx, hy - 2, 'Z'), (hx - 1, hy - 3, 'M'), (hx, hy - 3, 'n'), (hx + 1, hy - 3, 'n')]
        return p, True
    if kind == 'ticket':
        p += [(hx + 1, hy, 'Y'), (hx + 1, hy + 1, 'Y')]
        return p, True
    if kind == 'punch':          # the ticket punch: two small iron jaws
        p += [(hx + 1, hy, 'M'), (hx + 1, hy + 1, 'n')]
        return p, True
    if kind == 'punch_closed':
        p += [(hx + 1, hy, 'M')]
        return p, True
    if kind == 'lantern':
        p += [(hx, hy - 1, 'z'), (hx - 1, hy - 2, 'z'), (hx, hy - 2, 'F'), (hx + 1, hy - 2, 'z'),
              (hx - 1, hy - 3, 'z'), (hx, hy - 3, 'F'), (hx + 1, hy - 3, 'z'), (hx, hy - 4, 'z')]
        return p, True
    raise ValueError(kind)


TRUNK = [            # a small steamer trunk carried on the near shoulder (front view), lid trim and brass corners
    ".111.",
    "12223",
    "G333G",
    "34443",
]
CRATE = [
    ".1112.",
    "122223",
    "3NN444",
    "333444",
    ".3344.",
]
SACK = [
    ".67...",
    "55567.",
    "5NN667",
    "555667",
    ".6677.",
]


# ---------------------------------------------------------------------------------------------------------------
# One frame
# ---------------------------------------------------------------------------------------------------------------
def frame(who, back, legs='stand', arms=('down', 'down'), lift=0, head_dy=0, lean=0, hold=None, load=None,
          load_dy=0, item_swing=0):
    """Build one frame grid. who: key of SPECS. back: the back view. legs: key of LEGS / SKIRT. arms: (near, far).
    lift: whole figure raised (stepping up). head_dy: head and hat moved (breathing). lean: head, hat and
    shoulders moved this many px towards the facing (pushing). hold: (kind, 'near' or 'far') for a small item.
    load: 'crate', 'sack' or 'trunk' (with its mark already set in the grid codes)."""
    tname, build, _ = SPECS[who]
    b = BUILD[build]
    g = {}
    body = template(tname, back)
    # breathing: everything above the shoulders moves
    if head_dy:
        body = shifted(body, 0, head_dy, lambda x, y: y >= b['sleeve'][0] + 2)
    if lean:
        body = shifted(body, lean, 0, lambda x, y: y >= b['sleeve'][0] + 1)
    # legs
    if b['legs'] == 'skirt':
        bl, rows, x0 = SKIRT[legs]
        body = shifted(body, 0, bl)
        # take away the template's hem rows and draw the step's
        body = {p: c for p, c in body.items() if p[1] > bl + 1}
        stamp(g, rows, x0, len(rows) - 1)
        for p, c in body.items():
            g[p] = c
    else:
        bl, rows, x0 = LEGS[b['legs']][legs]
        stamp(g, rows, x0, len(rows) - 1)
        body = shifted(body, 0, bl)
        for p, c in body.items():
            g[p] = c
    # arms (the far arm behind the body in the front view only where the body is empty)
    near, far = arms
    fpts = [(x, y + bl, c) for x, y, c in arm_pts(build, far, 'far')]
    npts = [(x, y + bl, c) for x, y, c in arm_pts(build, near, 'near')]
    put(g, fpts, over=far in ('down', 'fwd', 'back', 'carry', 'out', 'up', 'up2', 'push', 'reach', 'pull', 'shoulder'))
    put(g, npts)
    def hand(side):
        pts = npts if side == 'near' else fpts
        hs = [(x, y) for x, y, c in pts if c in 'Ss']
        return hs[-1] if hs else None
    if hold:
        kind, side = hold
        h = hand(side)
        if h:
            pts, front = held(kind, h[0], h[1], back, item_swing)
            put(g, pts, over=front)
    if load:
        lines, ldx, ldy = load[:3]
        over = load[3] if len(load) > 3 else True
        ytop = b['sleeve'][0] + bl + ldy + load_dy
        stamp(g, lines, ldx, ytop, over=over)
    if lift:
        g = shifted(g, 0, lift)
    return g


def mirror_grid(g):
    return {(-1 - x, y): c for (x, y), c in g.items()}


# ---------------------------------------------------------------------------------------------------------------
# Rasterise
# ---------------------------------------------------------------------------------------------------------------
def to_rgba(g, cm, mirrored=False, shadow=False):
    """Grid -> RGBA with a 1 px outline in the darkest shade of each neighbour's ramp, plus a contact shadow.
    Returns (img, (ax, ay)): ax, ay the anchor (between the feet, at ground level)."""
    if mirrored:
        g = mirror_grid(g)
    cells = {p: cm[c] for p, c in g.items()}
    if mirrored:
        # keep the light on the upper left: in every row, reverse the shade order within each run of one ramp
        rows = {}
        for (x, y) in cells:
            rows.setdefault(y, []).append(x)
        for y, xs in rows.items():
            xs.sort()
            run = []
            def flush(run):
                if len(run) > 1:
                    idx = [cells[(x, y)][1] for x in run]
                    for x, i in zip(run, idx[::-1]):
                        cells[(x, y)] = (cells[(x, y)][0], i)
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
            outl[q] = (rn, E.RLEN[E.R(rn)] - 1)
    # the outline under the feet is the ground line: keep it (it reads as the shoe soles' shadow)
    allc = dict(outl); allc.update(cells)
    xs = [p[0] for p in allc]; ys = [p[1] for p in allc]
    pad = 3
    x0, x1 = min(xs) - pad, max(xs) + pad + 2
    y0, y1 = min(min(ys), -2) - 1, max(ys)
    Wd = x1 - x0 + 1; Ht = y1 - y0 + 1
    img = np.zeros((Ht, Wd, 4), np.uint8)
    for (x, y), (rn, ii) in allc.items():
        ii = min(ii, E.RLEN[E.R(rn)] - 1)
        r = y1 - y; c = x - x0
        img[r, c, :3] = E.PAL[E.R(rn), ii]; img[r, c, 3] = 255
    ax = -x0              # pixel corner: the left edge of cell x = 0
    ay = y1 + 1           # the bottom edge of row y = 0
    if shadow:
        for r in range(Ht):
            for c in range(Wd):
                if img[r, c, 3]:
                    continue
                U = (c - ax + 0.5) / 2.0; V = (r - ay + 0.5)
                X = (U + V) / 2.0; Y = (V - U) / 2.0
                if ((X - 1.3) / 2.0) ** 2 + ((Y + 0.1) / 1.1) ** 2 <= 1:
                    img[r, c] = E.SHADOW_RGBA
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
DRAWN = ('se', 'ne')
# e: facing world +x (screen lower right, front three quarters); s: +z (lower left, front, mirrored);
# n: -z (upper right, back three quarters); w: -x (upper left, back, mirrored).

WALK = [('pass1', ('fwd', 'back')), ('stride1', ('back', 'fwd')), ('pass2', ('back', 'fwd')), ('stride2', ('fwd', 'back'))]


def load_spec(item, mark, back):
    lines = {'crate': CRATE, 'sack': SACK}[item]
    fill = {'crate': '3', 'sack': '5'}[item]
    lines = [l.replace('N', 'N' if mark else fill) for l in lines]
    if back:
        return (lines, -2, 3, False)   # behind the body: only the top shows above the shoulders
    return (lines, -2, 0)


def anims_for(who):
    """Returns {anim: [frame kwargs]} for one character key."""
    base = who.split('.')[0]
    lug = LUGGAGE.get(base)
    A = {}
    def with_lug(kw, swing=0):
        kw = dict(kw)
        kw.setdefault('arms', ('down', 'down'))
        if lug == 'trunk':
            kw['arms'] = ('shoulder', kw['arms'][1])
            kw['load'] = 'trunk'
        elif lug == 'basket':
            kw['arms'] = (kw['arms'][0], 'carry')
            kw['hold'] = ('basket', 'far')
        elif lug:
            kw['arms'] = (kw['arms'][0], 'down')
            kw['hold'] = (lug, 'far')
            kw['item_swing'] = swing
        return kw
    A['idle'] = [with_lug(dict(legs='stand')), with_lug(dict(legs='stand2', head_dy=-1))]
    A['walk'] = [with_lug(dict(legs=l, arms=a), s) for (l, a), s in zip(WALK, (0, 0, 0, 0))]
    if who in TRAVELLERS or base in ('agent',):
        pass
    if who in TRAVELLERS:
        A['ticket'] = [with_lug(dict(legs='stand', arms=('down', 'out'), hold=('ticket', 'far'))),
                       with_lug(dict(legs='stand', arms=('down', 'out'), hold=('ticket', 'far'), head_dy=-1))]
        # ticket in the far hand overrides luggage in that hand: luggage moves to the near hand
        for f in A['ticket']:
            f['arms'] = ('down', 'out')
            f['hold'] = ('ticket', 'far')
            if lug in ('carpetbag', 'hammer'):
                f['extra_hold'] = (lug, 'near')
            elif lug == 'basket':
                f['extra_hold'] = ('basket', 'near')
            if lug == 'trunk':
                f['arms'] = ('shoulder', 'out')
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
    A['wave'] = [dict(legs='stand', arms=('down', 'up')), dict(legs='stand', arms=('down', 'up2'), head_dy=0)]
    A['lantern'] = [dict(legs='stand', arms=('down', 'down'), hold=('lantern', 'far')),
                    dict(legs='stand2', arms=('down', 'down'), hold=('lantern', 'far'), head_dy=-1)]
    return A


# Where the game draws a carried item (offset in px from the feet anchor to the item's anchor) and the cart grip.
CARRY_HANDS = {'se': (0, -5), 'ne': (0, -7)}   # the contract's default is (0, -9): see NOTES (too high for a crate)
PUSH_GRIP = {'se': (5, -3), 'ne': (5, -3)}
CART_BEHIND = 2.1     # how far (u) behind the cart's centre the pusher stands, for the committed handcart sprite

TAGS = {'store': ('green', 0), 'smithy': ('glass', 1), 'saloon': ('red', 0)}

FRAME_NOTES = {
    'idle': 'standing; frame 1 is the breath (head 1 px lower, weight on the other foot)',
    'walk': 'pass, stride, pass, stride; about 6 to 8 frames a second at walking pace; frame 0 also stands',
    'ticket': 'holding the ticket out to the agent (frame 1 the breath)',
    'board': 'stepping up into a coach door: foot on the step, up, in (the frame is drawn 0, 2 and 4 px higher)',
    'punch': 'ticket punch held out, closing on frame 1',
    'carry': 'pass, stride, pass, stride with an item held in front; frame 0 also stands. The item is drawn by '
             'the game at the hands (meta hands: offset from the anchor to the item\'s bottom centre)',
    'push': 'pass, stride, pass, stride leaning into the cart handles (meta grip: offset to the hands)',
    'throw': 'reach for the lever, pull back, straighten',
    'wave': 'waving a train off (play 0-1 back and forth)',
    'lantern': 'standing holding a lit lantern (dusk), frame 1 the breath',
}


def emit_frames(who, kwlist, d, extra=None):
    back, mir = DIRS[d]
    cm = cmap(SPECS[who][2])
    if extra:
        cm.update(extra)
    out = []
    for kw in kwlist:
        kw = dict(kw)
        lift = kw.get('lift', 0)
        load = kw.pop('load', None)
        xh = kw.pop('extra_hold', None)
        if load == 'trunk':
            kw['load'] = (TRUNK, -6, 5)
        elif isinstance(load, tuple):
            kw['load'] = load
        g = frame(who, back, **kw)
        if xh:
            # a second held item (the luggage moved to the other hand while a ticket is held out)
            tname, build, _ = SPECS[who]
            hx = BUILD[build]['near']; hy = BUILD[build]['hand']
            if xh[0] == 'basket':
                hy += 1
            pts, front = held(xh[0], hx, hy, back)
            put(g, pts, over=True)
        out.append(to_rgba(g, cm, mirrored=mir))
    return out


def build_all():
    """Returns a list of (contract key, [frames as (img, anchor)], meta). Keys: ppl/<who>/<anim>/<dir>; the
    pipeline appends /0, /1, ... per frame. Only se and ne are drawn; the renderer mirrors them for sw and nw."""
    out = []
    def meta_for(anim, more=None):
        m = {'frame_note': FRAME_NOTES.get(anim, ''), 'anchor': 'between the feet, at ground level'}
        if more:
            m.update(more)
        return m
    for d in DRAWN:
        for anim, kws in agent_anims().items():
            more = None
            if anim == 'carry':
                more = {'hands': list(CARRY_HANDS[d])}
            if anim == 'push':
                more = {'grip': list(PUSH_GRIP[d])}
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
            out.append((f'agent carry {item} {d}', emit_frames('agent', kws, d, {'N': TAGS['store']})))
    return out
