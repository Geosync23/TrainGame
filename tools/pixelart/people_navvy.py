# D32 navvies: the rail crew (plans/d32-tech.md 10.1), drawn with the signed-off people v2 rig (people.py) and its
# D27 additions (people_d27.py): the same 20 px men, palette, light from the upper left, outline rule and four drawn
# facings (sw and nw are se and ne mirrored and re-lit by the rig; the renderer never mirrors people).
#
# Three men (1870s track gangs, muted work clothes):
#   navvy_a  hickory shirt and braces, a slouch felt hat, a moustache, brown duck trousers (the regular build)
#   navvy_b  a dark vest over a linen shirt, a neckerchief, a derby hat, ginger side whiskers, grey trousers
#   navvy_c  a red flannel undershirt and braces, a faded army forage cap (kepi), a full beard, stocky (wider body)
#
# Tools in the work swings are drawn into the frame (they move with the hands); the shoulder walk leaves the tool to
# the renderer (tool/<t>/held/<dir>, drawn at extra.tool). Barrow, tip, railCarry and railDrop give extra.grip (the
# hands): the barrow and the carried rail are their own sprites. The tie is drawn into tieFront and tieBack (each man
# carries his half: the pair walk 3u apart, the front man ahead, and the halves meet).
import math
import numpy as np
import pal27  # noqa: F401  (the muted ramps: umber, slate, brick, straw, rock ...)
import people as PE
import people_d27 as P27
from people import part

WHO = ('navvy_a', 'navvy_b', 'navvy_c')

# ---------------------------------------------------------------------------------------------------------------
# Parts
# ---------------------------------------------------------------------------------------------------------------
PE.HATS.update({
    # a faded army forage cap: the crown tipped forward over a short visor
    'kepi': (part(16, [
        ".....JHHh....",
        "....JHHHhh...",
        "...JHHHHHhh..",
        "...RRRRRRrr..",
        "...aAAhkkkkk.",
    ]), part(16, [
        "....JHHHh....",
        "...JHHHHhh...",
        "...JHHHHhh...",
        "...RRRRRRrr..",
        "...aAAAAhkk..",
    ])),
    # a battered felt hat, the brim turned down front and back
    'felt': (part(16, [
        "....JHHHh....",
        "...JHHGHhh...",
        "...RRRRRRr...",
        "..kkkkkkkkkh.",
        ".hk.......kk.",
    ]), part(16, [
        "....JHHHh....",
        "...JHHHHhh...",
        "...RRRRRRr...",
        ".hkkkkkkkkk..",
        ".k.......kh..",
    ])),
})

PE.BODIES.update({
    # shirt and braces, the sleeves rolled to the elbow (the hands and forearms in skin)
    'nv_braces': (part(4, [
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
    # a dark vest open over a linen shirt, a neckerchief knotted at the throat
    'nv_vest': (part(4, [
        "...VCRRCvv...",
        "...VCCRCvv...",
        "...VVCCVvv...",
        "...VVCGVvv...",
        "...VVCCVvv...",
        "...zzzzzzz...",
        "...QTTTtTt...",
    ]), part(4, [
        "...VRRRRvv...",
        "...VVVVVvv...",
        "...VVVvVvv...",
        "...VVVvVvv...",
        "...VVVvVvv...",
        "...zzzzzzz...",
        "...QTTTtTt...",
    ])),
    # stocky: a red flannel undershirt buttoned at the neck, braces, a broad belt
    'nv_flannel': (part(4, [
        "..IWCCCCCcq..",
        "..INCGCCCNq..",
        "..INCcGCCNq..",
        "..INCCCCcNq..",
        "..INCcCCcNq..",
        "..zzzzGzzzz..",
        "..QTTTTtTtt..",
    ]), part(4, [
        "..ICCCCCCcq..",
        "..ICNCCCNcq..",
        "..ICCNCNCcq..",
        "..ICCCNCCcq..",
        "..INCCcCCNq..",
        "..zzzzzzzzz..",
        "..QTTTTtTtt..",
    ])),
})

PE.TYPES.update({
    'navvy_a': dict(build='man', hat='felt', face='moustache', back='short', body='nv_braces'),
    'navvy_b': dict(build='man', hat='bowler', face='chops', back='short', body='nv_vest'),
    'navvy_c': dict(build='stocky', hat='kepi', face='beard', back='beard', body='nv_flannel'),
})
PE.BUILD['stocky'] = dict(near=1, far=11, top=10, legs='man')
PE.HEAD_Y['stocky'] = 11

S = PE.spec
PE.SPECS.update({
    'navvy_a': ('navvy_a', S(hat=('umber', 1), band=('umber', 3), hair=('wood', 3), coat=('slate', 1),
                             tie=('wood', 4), gold=('cream', 1), trous=('wood', 2), shoes=('dark', 1),
                             sleeve='coat')),
    'navvy_b': ('navvy_b', S(hat=('iron', 3), band=('dark', 1), hair=('ochre', 2), coat=('cream', 1),
                             vest=('umber', 2), band2=None, trous=('iron', 2), gold=('brass', 1), shoes=('dark', 1),
                             sleeve='coat')),
    'navvy_c': ('navvy_c', S(hat=('slate', 2), band=('slate', 3), hair=('wood', 4), skin='skin2', coat=('brick', 1),
                             tie=('wood', 4), gold=('cream', 1), trous=('umber', 1), shoes=('dark', 1),
                             sleeve='coat')),
})
# the neckerchief of navvy_b is the hat band code R: a faded red
PE.SPECS['navvy_b'][1]['band'] = ('brick', 1)

# the sitting man (on the ground, knees up): legs from the hips forward; the body drops 3 rows (hips on the ground)
PE.LEGS['man'].update({
    'gsit': (-3, [".........QTt.",
                  "........QT.t.",
                  ".........t.tt",
                  "...TTTTT..BBb"]),
    # stooped over a load, knees bent, feet apart (rail tongs, setting a tie down)
    'stoop': (-1, ["...QTT.ttt...",
                   "..QT....tt...",
                   "..BBB...bbb.."]),
    # one foot on the shovel's step, pushing it in
    'spade': (0, ["....QT.tt....",
                  "....QTTtt....",
                  "......Btt....",
                  "........bbb.."]),
})

EXTRA_CODES = {'9': ('dirt', 1), '0': ('dirt', 2), '6': ('rock', 1), '7': ('rock', 3), 'Y': ('cream', 0),
               'y': ('iron', 2)}


# ---------------------------------------------------------------------------------------------------------------
# Arms to a target, tools as lines
# ---------------------------------------------------------------------------------------------------------------
def _line(p0, p1):
    (x0, y0), (x1, y1) = p0, p1
    n = int(max(abs(x1 - x0), abs(y1 - y0)) + 0.5)
    if n == 0:
        return [(int(round(x0)), int(round(y0)))]
    pts = []
    for k in range(n + 1):
        t = k / n
        q = (int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t)))
        if not pts or pts[-1] != q:
            pts.append(q)
    return pts


_POSE_N = [0]


def pose_to(who, side, hand, legs='stand', lean=0):
    """A pose name whose hand ends at the final cell `hand` (after the legs' body drop and the lean)."""
    build = PE.TYPES[PE.SPECS[who][0]]['build']
    b = PE.BUILD[build]
    bl = PE.LEGS['man'][legs][0]
    hx, hy = hand
    ty = hy - bl
    tx = hx - (lean if ty >= b['top'] - 3 else 0)
    sx, sy = PE.X0 + b[side], b['top']
    rel = (tx - sx, ty - sy)
    pts = _line((0, 0), rel)
    path = pts[:-1] if len(pts) > 1 else [(0, 0)]
    name = f'_nv{_POSE_N[0]}'
    _POSE_N[0] += 1
    PE.POSES[name] = (path, rel)
    return name


def tool_cells(kind, grip, ang, head, butt, earth=False):
    """Cells [(x, y, code)] of a tool held at `grip` (a cell), its handle along angle `ang` (degrees, 0 = forward,
    90 = up), the head `head` cells beyond the grip and the butt `butt` cells behind it."""
    a = math.radians(ang)
    u = (math.cos(a), math.sin(a))
    v = (-u[1], u[0])
    gx, gy = grip
    end = (gx + u[0] * head, gy + u[1] * head)
    out = []
    for (x, y) in _line((gx - u[0] * butt, gy - u[1] * butt), end):
        out.append((x, y, 'Z'))
    def at(s, t, code):
        out.append((int(round(end[0] + u[0] * s + v[0] * t)), int(round(end[1] + u[1] * s + v[1] * t)), code))
    if kind == 'pick':
        for t in (-3, -2, -1, 0, 1, 2, 3):
            at(-abs(t) * 0.34, t, 'n' if abs(t) == 3 else 'M')
    elif kind == 'shovel':
        for s in (0, 1, 2):
            for t in (-1, 0, 1):
                at(s, t, 'n' if s == 2 else 'M')
        if earth:
            for (s, t) in ((0, 2), (1, 2), (0.5, 3), (1.5, 2.6)):
                at(s, t, '9')
    elif kind == 'maul':
        for t in (-2, -1, 0, 1, 2):
            at(0, t, 'n' if abs(t) == 2 else 'M')
            at(0.6, t, 'n')
    elif kind == 'axe':
        for s, t in ((0, 0), (0, -1), (-0.5, -2), (0.5, -2), (0, -3), (0, 1)):
            at(s, t, 'M' if t > -3 else 'n')
    elif kind == 'hook':
        for s, t in ((0, 0), (1, 0), (2, 0), (0, -1), (1, -1), (2, -1), (2.7, -1.8), (2.4, -2.6), (1.7, -2.6)):
            at(s, t, 'M' if t > -2 else 'n')
    elif kind == 'rake':
        for t in (-2, -1, 0, 1, 2):
            at(0, t, 'n')
            if t % 2 == 0:
                at(1, t, 'y')
    elif kind == 'tongs':
        for s, t in ((0, 0), (1, 1), (1, -1), (2, 1.4), (2, -1.4)):
            at(s, t, 'y')
    return out


# ---------------------------------------------------------------------------------------------------------------
# One frame: legs, the two hands' cells, a tool, a baked load
# ---------------------------------------------------------------------------------------------------------------
def nframe(who, back, legs='stand', lean=0, head_dy=0, near=None, far=None, arms=None, tool=None, load=None,
           hold=None):
    """near / far: a target hand cell (x, y) or a pose name. tool: (kind, ang, head, butt, opts) gripped at the
    near hand. load: [(x, y, code)] cells drawn after the figure (over=True) or before it (('under', cells))."""
    if arms is None:
        np_ = near if isinstance(near, str) or near is None else pose_to(who, 'near', near, legs, lean)
        fp_ = far if isinstance(far, str) or far is None else pose_to(who, 'far', far, legs, lean)
        arms = (np_ or 'down', fp_ or 'down')
    kw = dict(legs=legs, arms=arms, lean=lean, head_dy=head_dy)
    if hold:
        kw['hold'] = hold
    g = P27.frame27(who, back, **kw)
    hands = P27.hands_of(who, kw, back)
    if tool:
        kind, ang, head, butt = tool[:4]
        opts = tool[4] if len(tool) > 4 else {}
        cells = tool_cells(kind, hands[0], ang, head, butt, earth=opts.get('earth', False))
        front = (not back) and not opts.get('behind', False)
        for x, y, c in cells:
            if front or (x, y) not in g:
                g[(x, y)] = c
        for (x, y), c in zip(hands, ('S', 's')):     # the hands stay on top of the handle
            if front or opts.get('hands_top', False):
                g[(x, y)] = 'S' if c == 'S' else 's'
    if load:
        over, cells = load
        for x, y, c in cells:
            if over or (x, y) not in g:
                g[(x, y)] = c
    return g, kw


def emit(who, specs, d):
    back, mir = PE.DIRS[d]
    cm = PE.cmap(PE.SPECS[who][1])
    cm.update(EXTRA_CODES)
    grids = []
    kws = []
    for sp in specs:
        sp = dict(sp)
        g, kw = nframe(who, back, **sp)
        grids.append(g); kws.append(kw)
    return [PE.to_rgba(g, cm, mirrored=mir) for g in grids], kws


# ---------------------------------------------------------------------------------------------------------------
# The tie: each man's half, a 2:1 band along the walk (front man: running back from him; back man: running forward)
# ---------------------------------------------------------------------------------------------------------------
def tie_half(back, front_man, shoulder, length=12):
    """Cells of half a tie from the shoulder point along the line of the walk. In the grid +x is the facing; the
    walk runs along the screen diagonal: se (front view) forward = down-right (2, -1), ne (back view) forward =
    up-right (2, 1). The front man's half runs backward, the back man's forward."""
    fx, fy = (2, -1) if not back else (2, 1)
    sgn = -1 if front_man else 1
    sx, sy = shoulder
    out = []
    for k in range(length + 1):
        x = sx + sgn * k
        yc = sy + sgn * (k * fy / 2.0)
        y = int(math.floor(yc + 0.5))
        out.append((x, y + 1, 'Y5'))
        out.append((x, y, 'Y6'))
        out.append((x, y - 1, 'Y7'))
    # end grain at the far end of the half belongs to the other man; the near end shows its end grain
    if front_man:
        out += [(sx + 1, int(sy + 0.5) + dy, 'Y8') for dy in (1, 0, -1)]
    return [(x, y, {'Y5': '2', 'Y6': '3', 'Y7': '4', 'Y8': '3'}[c]) for x, y, c in out]


def tie_drawn_over(back, front_man):
    """se: the forward half is nearer the viewer (drawn over the man), the backward half behind him. ne: reversed."""
    forward = not front_man
    return forward if not back else not forward


# ---------------------------------------------------------------------------------------------------------------
# Animations: {anim: [frame specs]} for one man
# ---------------------------------------------------------------------------------------------------------------
W = PE.WALK


def work_anims(who):
    A = {}
    A['idle'] = [dict(legs='stand'), dict(legs='stand2', head_dy=-1)]
    A['walk'] = [dict(legs=l, arms=a) for l, a in W]
    A['shoulder'] = [dict(legs=l, arms=('shoulder', a[1])) for l, a in W]
    # pick: lift, top of the swing (head over the back), strike, bite (point in the ground)
    A['pick'] = [dict(legs='stand', near=(2, 13), far=(1, 11), tool=('pick', 115, 7, 2)),
                 dict(legs='stand2', lean=-1, near=(0, 17), far=(-1, 15), tool=('pick', 160, 6, 2, {'behind': True})),
                 dict(legs='brace', lean=1, near=(5, 9), far=(4, 8), tool=('pick', -40, 6, 3)),
                 dict(legs='lean', lean=2, near=(5, 6), far=(4, 7), tool=('pick', -80, 6, 3))]
    # shovel: blade in (foot on the step), lever down, lift a load, throw it
    A['shovel'] = [dict(legs='spade', near=(3, 8), far=(2, 10), tool=('shovel', -70, 6, 3)),
                   dict(legs='brace', lean=1, near=(2, 6), far=(1, 8), tool=('shovel', -35, 7, 3, {'earth': True})),
                   dict(legs='stand', near=(4, 8), far=(2, 7), tool=('shovel', -5, 6, 3, {'earth': True})),
                   dict(legs='lean', lean=1, near=(5, 11), far=(3, 9), tool=('shovel', 30, 6, 3))]
    # spike maul: up, over the head, down, on the spike
    A['maul'] = [dict(legs='stand', near=(1, 14), far=(0, 12), tool=('maul', 135, 7, 2)),
                 dict(legs='stand2', lean=-1, near=(1, 17), far=(0, 15), tool=('maul', 95, 7, 2)),
                 dict(legs='brace', lean=1, near=(5, 10), far=(4, 8), tool=('maul', -30, 6, 3)),
                 dict(legs='lean', lean=2, near=(4, 7), far=(3, 8), tool=('maul', -85, 6, 3))]
    # felling axe: back over the shoulder, up, the cut at waist height, follow through
    A['axe'] = [dict(legs='stand', lean=-1, near=(-2, 13), far=(-1, 12), tool=('axe', 155, 6, 2, {'behind': True})),
                dict(legs='stand2', near=(2, 13), far=(1, 12), tool=('axe', 105, 7, 2)),
                dict(legs='brace', lean=1, near=(5, 8), far=(4, 9), tool=('axe', 5, 6, 3)),
                dict(legs='lean', lean=1, near=(5, 6), far=(4, 7), tool=('axe', -25, 6, 3))]
    # brush hook: raised, the slash, low in the brush
    A['hook'] = [dict(legs='stand', near=(2, 13), far=(1, 11), tool=('hook', 125, 6, 2)),
                 dict(legs='brace', lean=1, near=(5, 9), far=(4, 8), tool=('hook', -10, 6, 2)),
                 dict(legs='lean', lean=2, near=(4, 6), far=(3, 7), tool=('hook', -50, 6, 2))]
    # rake: reach out, draw in, draw in close
    A['rake'] = [dict(legs='lean', lean=1, near=(4, 8), far=(2, 7), tool=('rake', -25, 8, 3)),
                 dict(legs='brace', near=(3, 7), far=(1, 7), tool=('rake', -45, 7, 3)),
                 dict(legs='stand', near=(2, 7), far=(0, 8), tool=('rake', -62, 6, 3))]
    # the wheelbarrow (drawn by the renderer at extra.grip): pushing, and tipping it (handles up)
    A['barrow'] = [dict(legs=l, lean=1, near=(4, 5), far=(5, 5)) for l, _ in W]
    A['tip'] = [dict(legs='brace', lean=1, near=(4, 8), far=(5, 8)),
                dict(legs='lean', lean=2, near=(5, 11), far=(6, 11))]
    # the rail on tongs (the rail and the tongs' jaws drawn by the renderer at extra.grip): stooped, walking
    A['railCarry'] = [dict(legs=l, lean=1, near=(3, 5), far=(4, 5), tool=('tongs', -90, 1, 1, {'hands_top': True}))
                      for l, _ in W]
    A['railDrop'] = [dict(legs='stoop', lean=1, near=(3, 3), far=(4, 3), tool=('tongs', -90, 1, 1, {'hands_top': True})),
                     dict(legs='crouch', lean=2, near=(3, 1), far=(4, 1), tool=('tongs', -90, 1, 0, {'hands_top': True}))]
    # setting a tie down (the tie drawn as line/tie_loose by the renderer): bending, then down with it
    A['tieDrop'] = [dict(legs='stoop', lean=1, near=(3, 4), far=(4, 5)),
                    dict(legs='crouch', lean=2, near=(4, 1), far=(5, 2))]
    # resting, the meal
    A['sit'] = [dict(legs='gsit', near=(3, 3), far=(4, 4))]
    A['eat'] = [dict(legs='gsit', near=(3, 3), far=(3, 4), load=(True, [(2, 2, 'y'), (3, 2, 'y'), (4, 2, 'y'),
                                                                         (3, 3, '9')])),
                dict(legs='gsit', head_dy=-1, near=(1, 8), far=(3, 4), load=(True, [(2, 2, 'y'), (3, 2, 'y'),
                                                                                      (4, 2, 'y')]))]
    A['drink'] = [dict(legs='stand', near=(2, 8), load=(True, [(2, 9, 'y'), (3, 9, 'y'), (2, 8, 'y')])),
                  dict(legs='stand2', near=(2, 12), load=(True, [(2, 13, 'y'), (3, 13, 'y'), (3, 12, 'y')]))]
    return A


def tie_anims(who, back, front_man):
    """tieFront / tieBack: walking with the tie's end on the near shoulder, the hand steadying it."""
    out = []
    build = PE.TYPES[PE.SPECS[who][0]]['build']
    b = PE.BUILD[build]
    sx = PE.X0 + b['near']
    for l, a in W:
        cells = tie_half(back, front_man, (sx + (1 if front_man else -1), 12))
        over = tie_drawn_over(back, front_man)
        out.append(dict(legs=l, arms=('shoulder', a[1]), load=(over, cells)))
    return out


# extra data
def grip_px(who, kw, d):
    return P27.grip_of(who, kw, d)


def tool_px(who, kw, d):
    """Where tool/<t>/held/<dir> is drawn: the near hand (top-left of its pixel, from the feet)."""
    back, mir = PE.DIRS[d]
    h = P27.hands_of(who, kw, back)[0]
    return P27.px_of(h, mir)


NOTES = {
    'idle': 'standing; frame 1 the breath',
    'walk': 'pass, stride, pass, stride (as the townsfolk)',
    'shoulder': 'walking with a long tool on the near shoulder: draw tool/<t>/held/<dir> at extra.tool (from the '
                'feet), after the man',
    'pick': 'pick swing: lift, top (head over the back), strike, bite; about 3 frames a second',
    'shovel': 'digging: blade in under the boot, lever, lift a load of earth, throw it',
    'maul': 'spiking: up, overhead, down, on the spike (the spike is at the tie in front of him)',
    'axe': 'felling: back over the shoulder, up, the cut at waist height, follow through',
    'hook': 'cutting brush with a brush hook: raised, slash, low in the brush',
    'rake': 'spreading rock: reach out, draw in, draw in close',
    'barrow': 'pushing the wheelbarrow, pass, stride, pass, stride: draw tool/barrow/<dir> (or /full) at extra.grip',
    'tip': 'tipping the barrow: brace, handles up (draw tool/barrow/<dir>/tipped on frame 1)',
    'railCarry': 'one of four on a rail with tongs, stooped, walking; the rail (line/rail_carried) hangs at the '
                 'tongs: extra.grip is the hands',
    'railDrop': 'setting the rail down: stooping, crouched (the rail lowered to the ties)',
    'tieFront': 'the front man of a pair carrying a tie on the near shoulder (his half drawn in, running back); the '
                'pair walk 3u apart along the facing',
    'tieBack': 'the back man of the pair (his half drawn in, running forward to the front man)',
    'tieDrop': 'setting a tie down: bending, down with it (draw line/tie_loose under the hands at the end)',
    'sit': 'resting, sitting on the ground, knees up. Anchor: the hips on the ground',
    'eat': 'the meal, sitting on the ground, a tin plate on the knees: plate (0), a bite (1)',
    'drink': 'standing, a tin cup or the water dipper: lifting (0), drinking (1)',
    'lie': 'asleep under a blanket; anchor the cot\'s centre at ground level, the figure at the cot\'s height '
           '(draw after camp/cot). se: lying along x (head to -x), sw: lying along z (head to -z)',
}


def lie_frames(who):
    """A sleeper under a grey army blanket, head on a rolled coat (engine shapes), along x and along z."""
    import harness as H
    from geom27 import B
    import engine as E
    sp = PE.SPECS[who][1]
    hair = sp['hair'][0]
    blanket = {'navvy_a': 'slate', 'navvy_b': 'umber', 'navvy_c': 'brick'}[who]
    skin = sp['skin']
    out = []
    for d, yaw in (('se', 0.0), ('sw', -math.pi / 2)):
        def draw():
            y0 = 0.55
            B(-0.9, -0.45, y0, 0.95, 0.42, y0 + 0.32, blanket, shades=(1, 2, 3))      # the body under the blanket
            B(-0.2, -0.38, y0 + 0.3, 0.6, 0.36, y0 + 0.42, blanket, shades=(1, 2, 3))  # the hip
            B(0.95, -0.3, y0, 1.15, 0.3, y0 + 0.36, blanket, shades=(1, 2, 3))         # the feet
            B(-1.15, -0.4, y0, -0.9, 0.4, y0 + 0.18, 'umber', shades=(1, 2, 3))        # the rolled coat
            B(-1.2, -0.26, y0 + 0.16, -0.82, 0.26, y0 + 0.5, skin, shades=(0, 0, 1))  # the face
            B(-1.26, -0.28, y0 + 0.3, -1.0, 0.28, y0 + 0.56, hair, shades=(1, 1, 2))  # the hair
            B(-0.92, -0.42, y0 + 0.32, -0.75, 0.44, y0 + 0.36, 'cream', shades=(1, 2, 3))  # the sheet's edge
        img, an = H.render(draw, yaw=yaw, shadows=False)
        out.append((d, img, an))
    return out


def build_all():
    """[(key, frames, meta, indexed)] for every navvy."""
    out = []
    for who in WHO:
        for d in PE.DRAWN:
            back, mir = PE.DIRS[d]
            A = work_anims(who)
            A['tieFront'] = tie_anims(who, back, True)
            A['tieBack'] = tie_anims(who, back, False)
            for anim, specs in A.items():
                frs, kws = emit(who, specs, d)
                base = f'ppl/{who}/{anim}/{d}'
                meta = {'frame_note': NOTES.get(anim, ''), 'anchor': 'between the feet, at ground level',
                        'mirror': False}
                if anim == 'sit' or anim == 'eat':
                    meta['anchor'] = 'the hips, on the ground'
                if anim in ('barrow', 'tip', 'railCarry', 'railDrop', 'shoulder'):
                    for i, (kw, fr) in enumerate(zip(kws, frs)):
                        ex = {'tool': tool_px(who, kw, d)} if anim == 'shoulder' else {'grip': grip_px(who, kw, d)}
                        out.append((f'{base}/{i}', [fr], dict(meta, extra=ex), False))
                else:
                    out.append((base, frs, meta, True))
        for d, img, an in lie_frames(who):
            out.append((f'ppl/{who}/lie/{d}', [(img, an)],
                        {'frame_note': NOTES['lie'], 'anchor': 'the cot\'s centre at ground level', 'mirror': False},
                        True))
    return out
