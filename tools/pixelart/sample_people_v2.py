#!/usr/bin/env python3
# People, version 2: a SAMPLE for the designer's sign-off (not registered in the atlas, not in the game).
#
# The designer's direction (2026-11-11): keep the current art style, but take the characters' form, size and detail
# from the richer style test (plans/pixel/style/people.png), less colourful and slightly less playful.
# So these people are about 20 native pixels tall (today's are 14), with the richer style's big head, readable face
# (eyes, nose, moustache or beard), hats with a brim and a band, coat lapels, buttons and folds, and hands; but in our
# palette (engine.py ramps, the muted period colours), our light (from the upper left) and our outline rule (a 1 px
# outline in the darkest shade of the neighbouring colour's ramp, never pure black), with hard alpha and no blush,
# no sparkle and no bounce in the walk.
#
# What it draws: the station agent and four travellers (gentleman in a top hat, lady in a bonnet, travelling salesman
# with a bowler and carpetbag, farm wife with a shawl and basket), standing, in all four facings; the agent's walk
# (4 frames, facing se) and ticket punch (3 frames, facing se).
#
# Writes plans/pixel/people-v2/sheet.png, compare.png and (given a game screenshot) inscene.png:
#     python3 tools/pixelart/sample_people_v2.py [screenshot.png player_x player_y]
#
# How a frame is made: each type has a hand-drawn pixel map of hat, head and body for the front three-quarter view
# (facing se) and the back three-quarter view (facing ne). Arms, hands, legs and held things are added by code from
# small pose tables. sw and nw are se and ne mirrored and then re-lit (people.to_rgba does both), so the light stays
# on the upper left; the frames are stored as four facings and are never mirrored by the renderer.
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engine as E
import people_v1 as PE      # the 14 px people (parked) and its to_rgba, as when this sample was made
import font as FT

ROOT = os.path.dirname(os.path.dirname(HERE))
OUTDIR = os.path.join(ROOT, 'plans', 'pixel', 'people-v2')

# ---------------------------------------------------------------------------------------------------------------
# Codes in the pixel maps (each type maps them to a palette ramp and shade, see PAL below)
#   J H h k  hat (highlight, light, shade, brim/dark)   R  hat band, bonnet ribbon     G  brass (badge, buttons, chain)
#   A a      hair, beard, moustache (light, dark)       S s  skin (lit, shade)         e  eye
#   I C c q  coat (highlight, light, mid, shade)        L  lapel / seam line           V v  waistcoat
#   W        shirt, collar                              N  necktie, cravat
#   T t      trousers (near leg, far leg)               B b  shoes
#   E D d f  dress (highlight, light, mid, shade)       P p  apron                     U u  shawl
#   O o      sleeve (near arm, far arm)                 X x y  bag or basket (light, shade, pattern)   Z  handle
#   Y        ticket                                     M n  the punch (steel, dark)
# Columns: 13 per row, column 6 is x = 0 (the anchor is the left edge of column 6, between the feet).
# Rows: the last row of each map sits at the y given with it (y = 0 is the row of the shoes).
# ---------------------------------------------------------------------------------------------------------------
X0 = -6

TPL = {}
# The station agent: railway cap with a badge, navy double-breasted frock coat, brass buttons, moustache.
TPL['agent'] = (4, [
    "....JHHHh....",   # 19 cap crown
    "...JHHGHhh...",   # 18 badge
    "...RRRRRRrr..",   # 17 band
    "...aAAhkkkkk.",   # 16 peak, hair at the back
    "...aASSSSSs..",   # 15 forehead
    "...aSSeSeS...",   # 14 eyes
    "...sSSSSSSs..",   # 13 nose
    "....SSaaaS...",   # 12 moustache
    ".....SSSs....",   # 11 chin
    "...ICWNWcq...",   # 10 collar and tie
    "...ILGcGcq...",   # 9  lapel, two rows of buttons
    "...ICLccLq...",   # 8
    "...ICGcGcq...",   # 7
    "...ICcLccq...",   # 6  fold
    "...ICGcGcq...",   # 5
    "...IcCcccq...",   # 4  hem
])
TPL['agent.back'] = (4, [
    "....JHHHh....",
    "...JHHHHhh...",
    "...RRRRRRrr..",
    "...aAAAAhkkk.",   # hair under the band, the peak's edge
    "...AAAAAaSs..",   # back of the head, cheek and ear on the right
    "...AAAAaaSs..",
    "...aAAAaaSs..",
    "....aAaaSs...",
    ".....sSSs....",   # neck
    "...ICCCccq...",   # coat collar
    "...ICCCccq...",
    "...ICcCccq...",   # back seam
    "...ICcCccq...",
    "...IGcCGcq...",   # the two waist buttons at the back
    "...ICcCccq...",
    "...IcCcccq...",   # vent
])

# The gentleman: tall silk hat, full beard, green frock coat to the knee, buff waistcoat, watch chain.
TPL['gent'] = (3, [
    "....JHHHh....",   # 21 crown
    "....JHHhh....",
    "....JHHhh....",
    "....RRRRr....",   # 18 band
    "..kkkkkkkkk..",   # 17 brim
    "...aASSSSs...",   # 16 hair, forehead
    "...aSSeSeS...",   # 15 eyes
    "...sSSSSSSs..",   # 14 nose
    "...aASaaaA...",   # 13 moustache
    "....aAAAAa...",   # 12 beard
    ".....aAa.....",   # 11
    "...ICWNWcq...",   # 10 collar, cravat
    "...ILVNVLq...",   # 9  lapels, waistcoat
    "...ICLVGcq...",   # 8  watch chain
    "...ICcVVcq...",   # 7
    "...ICcLccq...",   # 6
    "...ICccLcq...",   # 5  fold
    "...ICcccLq...",   # 4
    "..IIcccccqq..",   # 3  coat skirt
])
TPL['gent.back'] = (3, [
    "....JHHHh....",
    "....JHHhh....",
    "....JHHhh....",
    "....RRRRr....",
    "..kkkkkkkkk..",
    "...aAAAAAa...",
    "...AAAAAaSs..",
    "...AAAAaaSs..",
    "....aAAaas...",
    "....aAaaa....",
    ".....sSs.....",
    "...ICCCccq...",
    "...ICCCccq...",
    "...ICcCccq...",
    "...ICcCccq...",
    "...IGcCGcq...",
    "...ICcLccq...",
    "...ICcLccq...",
    "..IIccLccqq..",
])

# The lady: straw bonnet framing the face, ribbon tied under the chin, mauve day dress with a full skirt.
TPL['lady'] = (0, [
    "....JHHHh....",   # 19 bonnet crown
    "...JHHHHHh...",   # 18
    "..JHHhhhhHk..",   # 17 brim edge
    "..JHhAAAAhk..",   # 16 hair, parted
    "..JHhSeSeSk..",   # 15 eyes
    "..JHhSSSSSs..",   # 14 nose
    "...HRSSaSR...",   # 13 ribbon, mouth
    "....RSSSR....",   # 12
    ".....RRr.....",   # 11 bow
    "....EWWWd....",   # 10 white collar
    "...EDDGDdf...",   # 9  bodice buttons
    "...EDDDGdf...",   # 8
    "...dRRRRRf...",   # 7  sash
    "...EDDdDddd..",   # 6  skirt
    "..EDDDdDddd..",   # 5
    "..EDDdDDddd..",   # 4  folds
    "..EDDdDdddd..",   # 3
    ".EDDdDDdddd..",   # 2
    ".fffffffffff.",   # 1  hem
    "....BB.Bb....",   # 0  shoes
])
TPL['lady.back'] = (0, [
    "....JHHHh....",
    "...JHHHHHh...",
    "..JHHHHHHhk..",
    "..JHHHHHHhk..",
    "..JHHHHhhhk..",
    "...hhhhhhhk..",   # the bonnet's curtain at the nape
    "....AAAAaSs..",   # hair, cheek
    "....aAAaaS...",
    ".....SSs.....",
    "....EDDDd....",
    "...EDDDDdf...",
    "...EDDdDdf...",
    "...dRRRRRf...",   # sash
    "...EDRRRddf..",   # sash bow at the back
    "..EDDRdRddd..",
    "..EDDdDDddd..",
    "..EDDdDdddd..",
    ".EDDdDDdddd..",
    ".fffffffffff.",
    "....BB.bb....",
])

# The travelling salesman: bowler hat, moustache, tan sack suit, brown waistcoat, red necktie; carpetbag.
TPL['drummer'] = (4, [
    "....JHHHh....",   # 19 bowler crown
    "...JHHHHhh...",   # 18
    "...RRRRRRr...",   # 17 band
    "..kkkkkkkkk..",   # 16 brim
    "...aASSSSs...",   # 15 forehead
    "...aSSeSeS...",   # 14 eyes
    "...sSSSSSSs..",   # 13 nose
    "....SaaaaS...",   # 12 moustache
    ".....SSSs....",   # 11 chin
    "...ICWNWcq...",   # 10 collar, tie
    "...ILVNVLq...",   # 9  lapels, waistcoat
    "...ICLVVcq...",   # 8
    "...ICcLGcq...",   # 7  button
    "...ICcLccq...",   # 6
    "...ICcLGcq...",   # 5  fold, button
    "...IcCcccq...",   # 4  hem
])
TPL['drummer.back'] = (4, [
    "....JHHHh....",
    "...JHHHHhh...",
    "...RRRRRRr...",
    "..kkkkkkkkk..",
    "...aAAAAAa...",
    "...aAAAAaSs..",
    "...AAAAaaSs..",
    "....aAaaSs...",
    ".....sSSs....",
    "...ICCCccq...",
    "...ICCCccq...",
    "...ICCLccq...",
    "...ICcLccq...",
    "...ICcLccq...",
    "...ICcLcqq...",
    "...IcCLccq...",
])

# The farm wife: hair in a bun, red wool shawl over the shoulders, blue calico dress, apron; a basket.
TPL['farmwife'] = (0, [
    ".....AAa.....",   # 18 hair
    "...aAAAAa....",   # 17
    "..aAAAAAAa...",   # 16 bun at the back
    "..aaASSSAa...",   # 15 parting, forehead
    "...aSSeSeS...",   # 14 eyes
    "...sSSSSSSs..",   # 13 nose
    "....SSSaS....",   # 12 mouth
    ".....SSs.....",   # 11
    "...UUUUUuu...",   # 10 shawl over the shoulders
    "..UUUUUUuuu..",   # 9
    "...UUUUUuu...",   # 8  shawl point
    "...DPPPPPd...",   # 7  apron
    "...DPPPPpdd..",   # 6
    "..DDPPpPPdd..",   # 5
    "..DDPPpPpdd..",   # 4  folds
    "..DDPPPPpdd..",   # 3
    ".DDDdPPPpddd.",   # 2
    ".fffffffffff.",   # 1  hem
    "....BB.Bb....",   # 0
])
TPL['farmwife.back'] = (0, [
    "....aAAa.....",
    "...aAAAAa....",
    "...AAAaAAa...",   # bun
    "...aAAAAaaS..",
    "...AAAAAaSs..",
    "...aAAAaaSs..",
    "....aAaaS....",
    ".....sSs.....",
    "...UUUUUuu...",
    "..UUUUUUuuu..",
    "...UUUUUuu...",
    "...DUUUUudd..",   # the shawl's point down the back
    "...DDUUuddd..",
    "..DDDDUdddd..",
    "..DDDdDDddd..",
    "..DDDdDDddd..",
    ".DDDDdDDdddd.",
    ".fffffffffff.",
    "....BB.bb....",
])

# ---------------------------------------------------------------------------------------------------------------
# Palettes: code -> (ramp, shade) from engine.py. Kept to our muted ramps; the bright accents of the richer style
# (pink, teal, lime, saturated blue) are left out.
# ---------------------------------------------------------------------------------------------------------------
BASE = {
    'S': ('skin', 0), 's': ('skin', 1), 'e': ('dark', 2),
    'W': ('cream', 0), 'w': ('cream', 1), 'G': ('ochre', 0),
    'B': ('dark', 1), 'b': ('dark', 1),
    'Y': ('cream', 0), 'M': ('iron', 1), 'n': ('iron', 3), 'Z': ('wood', 2),
}
PAL = {
    'agent': dict(J=('navy', 0), H=('navy', 1), h=('navy', 2), k=('navy', 3), R=('navy', 2), G=('ochre', 0),
                  A=('wood', 2), a=('wood', 3),
                  I=('navy', 0), C=('navy', 1), c=('navy', 1), q=('navy', 2), L=('navy', 2), N=('navy', 3),
                  O=('navy', 0), o=('navy', 2), T=('navy', 2), t=('navy', 3)),
    'gent': dict(J=('iron', 2), H=('iron', 3), h=('dark', 2), k=('dark', 2), R=('plum', 1),
                 A=('wood', 3), a=('wood', 4),
                 I=('green', 1), C=('green', 2), c=('green', 2), q=('green', 3), L=('green', 3),
                 V=('cream', 2), N=('red', 2), G=('brass', 1),
                 O=('green', 1), o=('green', 3), T=('iron', 2), t=('iron', 3)),
    'lady': dict(J=('cream', 0), H=('cream', 1), h=('cream', 2), k=('wood', 2), R=('red', 2), r=('red', 3),
                 A=('wood', 1), a=('wood', 2), G=('cream', 1),
                 E=('plum', 0), D=('plum', 0), d=('plum', 1), f=('plum', 2),
                 O=('plum', 0), o=('plum', 1)),
    'drummer': dict(J=('wood', 2), H=('wood', 3), h=('wood', 4), k=('dark', 2), R=('dark', 2),
                    A=('wood', 3), a=('wood', 4),
                    I=('wood', 0), C=('wood', 1), c=('wood', 1), q=('wood', 2), L=('wood', 2),
                    V=('wood', 3), N=('red', 1), G=('brass', 1),
                    O=('wood', 0), o=('wood', 2), T=('iron', 2), t=('iron', 3),
                    X=('red', 1), x=('red', 2), y=('ochre', 1), Z=('wood', 4)),
    'farmwife': dict(A=('wood', 3), a=('wood', 4),
                     U=('red', 1), u=('red', 2),
                     D=('navy', 1), d=('navy', 2), f=('navy', 3), P=('cream', 1), p=('cream', 2),
                     O=('navy', 1), o=('navy', 2),
                     X=('ochre', 1), x=('ochre', 2), y=('wood', 3), Z=('wood', 3)),
}


def cmap(who):
    m = dict(BASE)
    m.update(PAL[who])
    if 'r' not in m and 'R' in m:
        m['r'] = PE.sh(m['R'], 1)
    return m


# Body build per type: arm columns (near, far), the arm's top and bottom rows, the hand row, the legs.
BUILD = {
    'agent':    dict(near=2, far=9, top=10, bot=6, hand=5, legs='trousers'),
    'gent':     dict(near=2, far=9, top=10, bot=5, hand=4, legs='trousers_short'),
    'drummer':  dict(near=2, far=9, top=10, bot=6, hand=5, legs='trousers', held='carpetbag'),
    'lady':     dict(near=2, far=9, top=9, bot=8, hand=7, legs=None),
    'farmwife': dict(near=2, far=9, top=8, bot=7, hand=6, legs=None, held='basket'),
}

# Legs: rows from y = 3 (or y = 2 under a long coat) down to y = 0; first column given.
LEGS = {
    'stand':      (4, ["TT.tt.", "TT.tt.", "TT.tt.", "BB.Bbb"]),
    'stand_back': (4, ["TT.tt.", "TT.tt.", "TT.tt.", "BB.bb."]),
    'pass':       (4, [".TTt..", ".TTt..", ".TTt..", ".BBBb."]),
    'pass_b':     (4, [".tTT..", ".tTT..", ".tTT..", ".bBBB."]),
    'stride_n':   (2, ["..tTTT...", ".tt..TT..", "tt....TT.", "bb....BBB"]),   # near leg forward
    'stride_f':   (2, ["..TTtt...", ".TT..tt..", "TT....tt.", "BB....Bbb"]),   # far leg forward
}

# Things held in the far hand: cells relative to the hand (dx, dy, code).
HELD = {
    'carpetbag': [(1, 0, 'Z'), (2, 0, 'Z'), (0, -1, 'X'), (1, -1, 'X'), (2, -1, 'X'), (3, -1, 'x'),
                  (0, -2, 'X'), (1, -2, 'y'), (2, -2, 'X'), (3, -2, 'x'),
                  (0, -3, 'y'), (1, -3, 'X'), (2, -3, 'y'), (3, -3, 'x'), (0, -4, 'x'), (1, -4, 'x'),
                  (2, -4, 'x'), (3, -4, 'x')],
    'basket':    [(1, 1, 'Z'), (2, 1, 'Z'), (3, 0, 'Z'), (0, -1, 'X'), (1, -1, 'X'), (2, -1, 'X'), (3, -1, 'x'),
                  (0, -2, 'X'), (1, -2, 'y'), (2, -2, 'X'), (3, -2, 'x'), (1, -3, 'x'), (2, -3, 'x')],
}


def stamp(g, rows, ybot, over=True):
    ytop = ybot + len(rows) - 1
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch == '.':
                continue
            p = (X0 + c, ytop - r)
            if over or p not in g:
                g[p] = ch


def put(g, col, y, ch, over=True):
    p = (X0 + col, y)
    if over or p not in g:
        g[p] = ch


def arm(g, b, side, pose):
    """One arm: side 'near' (in front of the body, lit) or 'far' (behind it, in shade). pose: 'down', 'fwd'
    (swung towards the facing, screen right) or 'back'."""
    col = b[side]
    sleeve, hand = ('O', 'S') if side == 'near' else ('o', 's')
    over = side == 'near'
    shift = {'down': 0, 'fwd': 1, 'back': -1}[pose]
    rows = list(range(b['bot'], b['top'] + 1))
    for y in rows:
        lower = y <= b['bot'] + 1 and b['top'] - b['bot'] >= 2
        put(g, col + (shift if lower else 0), y, sleeve, over)
    put(g, col + shift, b['hand'], hand, over)
    return col + shift, b['hand']


for _k, (_yb, _rows) in TPL.items():
    assert all(len(r) == 13 for r in _rows), _k
    _base = _k.split('.')[0]
    assert len(_rows) == len(TPL[_base][1]), _k        # front and back maps the same height


def figure(who, back=False, legs=None, arms=('down', 'down'), punch=None):
    b = BUILD[who]
    g = {}
    ybot, rows = TPL[who + ('.back' if back else '')]
    stamp(g, rows, ybot)
    if b['legs']:
        name = legs or ('stand_back' if back else 'stand')
        c0, lr = LEGS[name]
        if b['legs'] == 'trousers_short':
            lr = lr[1:]
        for i, line in enumerate(lr):
            for c, ch in enumerate(line):
                if ch != '.':
                    put(g, c0 + c, len(lr) - 1 - i, ch, over=False)
    if punch is not None:
        punch_arms(g, punch)
    else:
        arm(g, b, 'near', arms[0])
        hx, hy = arm(g, b, 'far', arms[1])
        if b.get('held'):
            for dx, dy, ch in HELD[b['held']]:
                put(g, hx + dx, hy + dy, ch, over=True)
    return g


def punch_arms(g, k):
    """The agent punching a ticket held out to him (facing se): 0 the punch raised, open; 1 closed on the ticket;
    2 lowered, the ticket punched."""
    # near arm: forearm across the chest, the hand steadying the ticket's edge (frames 0-1), then down (frame 2)
    if k < 2:
        for c, y in ((2, 10), (2, 9), (2, 8), (3, 7), (4, 7), (5, 7)):
            put(g, c, y, 'O')
        put(g, 6, 7, 'S')
    else:
        for y in range(6, 11):
            put(g, 2, y, 'O')
        put(g, 2, 5, 'S')
    # far arm: raised forward holding the punch
    if k < 2:
        for c, y in ((9, 10), (10, 9), (10, 8)):
            put(g, c, y, 'o')
        put(g, 11, 8, 's')
        put(g, 11, 9, 'M'); put(g, 12, 9, 'M')                 # the punch's upper jaw
        if k == 0:
            put(g, 12, 7, 'n')                                  # lower jaw, open
        else:
            put(g, 12, 8, 'n')                                  # closed
    else:
        for c, y in ((9, 10), (9, 9), (10, 8)):
            put(g, c, y, 'o')
        put(g, 10, 7, 's'); put(g, 11, 7, 'M'); put(g, 11, 8, 'n')


DIRS = {'se': (False, False), 'sw': (False, True), 'ne': (True, False), 'nw': (True, True)}
FACINGS = ('se', 'sw', 'ne', 'nw')
TYPES = [('agent', 'station agent (the player)'), ('gent', 'gentleman'), ('lady', 'lady'),
         ('drummer', 'salesman'), ('farmwife', 'farm wife')]
WALK = [('pass', ('back', 'fwd')), ('stride_n', ('back', 'fwd')), ('pass_b', ('fwd', 'back')),
        ('stride_f', ('fwd', 'back'))]


def render(who, d, **kw):
    back, mir = DIRS[d]
    if back and kw.get('legs'):
        kw = dict(kw)
    return PE.to_rgba(figure(who, back, **kw), cmap(who), mirrored=mir)


def build():
    """Returns {key: [(img, anchor), ...]} in the contract's key form (ppl/<who>/<anim>/<dir>), sample only."""
    out = {}
    for who, _ in TYPES:
        for d in FACINGS:
            out[f'ppl/{who}/idle/{d}'] = [render(who, d)]
    out['ppl/agent/walk/se'] = [render('agent', 'se', legs=l, arms=a) for l, a in WALK]
    out['ppl/agent/punch/se'] = [render('agent', 'se', punch=k) for k in range(3)]
    return out


# ---------------------------------------------------------------------------------------------------------------
# Review pictures
# ---------------------------------------------------------------------------------------------------------------
BG = (187, 156, 118, 255)          # the deck colour of the other review sheets
INK = (43, 32, 38, 255)


def blit(dst, img, x, y):
    h, w = img.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = img[y0 - y:y1 - y, x0 - x:x1 - x]
    m = s[..., 3] > 0
    dst[y0:y1, x0:x1][m] = s[m]


def text(dst, s, x, y, col=INK):
    blit(dst, FT.text_image(s, col), x, y)


TITLE = 'People v2 sample: about 20 px tall, our palette and light'


def sheet(fr, scale=6):
    CW, CH = 22, 30            # cell for one frame (native px), feet at CH - 4
    rows = []
    for who, label in TYPES:
        rows.append((label + ', standing: se  sw  ne  nw', [fr[f'ppl/{who}/idle/{d}'][0] for d in FACINGS]))
    rows.append(('station agent walking (se), 4 frames', fr['ppl/agent/walk/se']))
    rows.append(('station agent punching a ticket (se), 3 frames', fr['ppl/agent/punch/se']))
    left = 4
    Wd = max(left + 7 * CW, max(FT.text_image(l).shape[1] for l, _ in rows) + left,
             FT.text_image(TITLE).shape[1] + left) + 4
    Ht = 14 + len(rows) * (CH + FT.LINE_H + 3)
    img = np.zeros((Ht, Wd, 4), np.uint8); img[...] = BG
    text(img, TITLE, left, 3)
    y = 14
    for label, frames in rows:
        text(img, label, left, y)
        for i, (f, (ax, ay)) in enumerate(frames):
            blit(img, f, left + i * CW + 10 - ax, y + FT.LINE_H + 2 + CH - 4 - ay)
        y += CH + FT.LINE_H + 3
    return Image.fromarray(img).resize((Wd * scale, Ht * scale), Image.NEAREST)


def rich_people():
    """The richer style's sheet at its native pixels (it is drawn 6x): agent, gentleman, lady, salesman, woman."""
    im = Image.open(os.path.join(ROOT, 'plans', 'pixel', 'style', 'people.png')).convert('RGB')
    n = np.array(im.resize((im.width // 6, im.height // 6), Image.NEAREST))
    bg = n[0, 0].copy()
    mask = (n != bg).any(2)
    cols = mask.any(0)
    segs, s = [], None
    for i, c in enumerate(cols):
        if c and s is None: s = i
        if not c and s is not None: segs.append((s, i)); s = None
    out = []
    for k in (0, 2, 3, 6, 7):
        a, b2 = segs[k]
        sub = n[:, a:b2]; m = mask[:, a:b2]
        ys = np.nonzero(m.any(1))[0]
        rgba = np.zeros((ys.max() + 1 - ys.min(), b2 - a, 4), np.uint8)
        rgba[..., :3] = sub[ys.min():ys.max() + 1]; rgba[..., 3] = m[ys.min():ys.max() + 1] * 255
        out.append(rgba)
    return out


def compare(fr, scale=5):
    cur = {n: f for n, f, m in PE.build_all()}
    current = [cur[f'ppl/{w}/idle/se'][0] for w in ('agent', 'man_top', 'woman_bonnet', 'man_bag', 'woman_shawl')]
    new = [fr[f'ppl/{w}/idle/se'][0] for w, _ in TYPES]
    rich = rich_people()
    groups = [('current (14 px)', [(f, a) for f, a in current]),
              ('richer style (its own pixels)', [(f, (f.shape[1] // 2, f.shape[0])) for f in rich]),
              ('new v2 (about 20 px)', new)]
    CW = 22
    pad = 6
    gw = [sum(max(CW, f.shape[1] + 3) for f, _ in fs) for _, fs in groups]
    Wd = sum(gw) + pad * (len(groups) + 1)
    Ht = 48 + FT.LINE_H + 8
    img = np.zeros((Ht, Wd, 4), np.uint8); img[...] = BG
    x = pad
    base = Ht - 5
    for (label, fs), w in zip(groups, gw):
        text(img, label, x, 3)
        xx = x
        for f, (ax, ay) in fs:
            cw = max(CW, f.shape[1] + 3)
            blit(img, f, xx + cw // 2 - ax, base - ay)
            xx += cw
        x += w + pad
        if x < Wd:
            img[FT.LINE_H + 4:, x - pad // 2 - 1] = INK
    img[base:base + 1, :, :3] = (150, 122, 92)
    return Image.fromarray(img).resize((Wd * scale, Ht * scale), Image.NEAREST)


def inscene(fr, shot, px, py):
    """Paste the new people onto a game screenshot at true game scale (1 native px per screen px at 390 x 844,
    deviceScaleFactor 1). (px, py): the player's anchor on screen; the others stand on platform 1 around him.
    A 4x enlargement of that patch is written as inscene-zoom.png."""
    img = np.array(Image.open(shot).convert('RGBA'))
    # (world dx, dz) from the player in game units -> screen (8 dx - 8 dz, 4 dx + 4 dz)
    # on the island platform (platform 2), about 19u south of the player's start; the leftmost figure is TODAY's
    # agent (14 px), for scale
    cur = {n: f for n, f, m in PE.build_all()}
    spots = [('ppl/agent/idle/se', -3.0, 19.0), ('ppl/gent/idle/sw', -1.4, 18.4), ('ppl/agent/punch/se', 0.0, 19.6),
             ('ppl/lady/idle/nw', 1.3, 19.6), ('ppl/drummer/idle/se', 3.0, 18.3), ('ppl/farmwife/idle/ne', 4.6, 19.8),
             ('ppl/lady/idle/sw', -3.4, 20.6), ('current', -4.6, 18.7)]
    spots.sort(key=lambda s: s[1] + s[2])
    for key, dx, dz in spots:
        if key == 'current':
            f, (ax, ay) = cur['ppl/agent/idle/se'][0]
        else:
            f, (ax, ay) = fr[key][1] if 'punch' in key else fr[key][0]
        sx = int(round(px + 8 * dx - 8 * dz)); sy = int(round(py + 4 * dx + 4 * dz))
        blit(img, f, sx - ax, sy - ay)
    cx = int(round(px + 8 * (0 - 19.0))); cy = int(round(py + 4 * 19.0))
    Image.fromarray(img).save(os.path.join(OUTDIR, 'inscene.png'), optimize=True)
    x0, y0 = max(0, cx - 80), max(0, cy - 55)
    crop = Image.fromarray(img).crop((x0, y0, x0 + 160, y0 + 90))
    crop.resize((crop.width * 4, crop.height * 4), Image.NEAREST).save(os.path.join(OUTDIR, 'inscene-zoom.png'),
                                                                       optimize=True)


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    fr = build()
    sheet(fr).save(os.path.join(OUTDIR, 'sheet.png'), optimize=True)
    compare(fr).save(os.path.join(OUTDIR, 'compare.png'), optimize=True)
    if len(sys.argv) >= 4:
        inscene(fr, sys.argv[1], float(sys.argv[2]), float(sys.argv[3]))
    hs = {k: [f.shape[0] for f, _ in v] for k, v in fr.items() if '/idle/se' in k}
    print('frames:', sum(len(v) for v in fr.values()), 'heights (with outline):', hs)


if __name__ == '__main__':
    main()
