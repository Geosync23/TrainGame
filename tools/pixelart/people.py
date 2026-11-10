# People: hand-drawn 1866 pixel maps (from the approved mockup) turned into a full sprite set by code.
# Each template faces south-east (3/4 front, towards world +x, the viewer's lower right). From it we derive:
#   facing +x (SE): the template;          facing +z (SW): the template mirrored;
#   facing -z (NE): the back view;         facing -x (NW): the back view mirrored.
# The back view swaps face pixels for hair (or bonnet) and the shirt front for the coat.
# Frames: idle (1), walk (4: step, pass, step, pass), board (2, the traveller stepping up), and for the
# agent: punch (2), carry crate or sack (idle + 4 walk, with a shop mark or none), push (idle + 4 walk).
# People are drawn a little larger than the game's 1.0-1.4 unit kits (about 1.6-1.8 units tall, 13-15 px),
# as in the mockup, so faces, hats and dresses read at native size.
import numpy as np
import engine as E

T = {}
T['agent'] = [
"...HHh..",
"..HHHhh.",
"..kkkkkk",
"...ASSs.",
"...ASes.",
"....Ss..",
"..CCKcc.",
".CCCKccq",
".CCCKccq",
".SCCKcqs",
"..CCccq.",
"..TT.tt.",
"..TT.tt.",
"..BB.BB.",
]
T['agent_punch0'] = [
"...HHh...",
"..HHHhh..",
"..kkkkkk.",
"...ASSs..",
"...ASes..",
"....Ss...",
"..CCKcc..",
".CCCKcCSW",
".CCCKcq.w",
".SCCKcq..",
"..CCccq..",
"..TT.tt..",
"..TT.tt..",
"..BB.BB..",
]
T['agent_punch1'] = [
"...HHh...",
"..HHHhh..",
"..kkkkkk.",
"...ASSs..",
"...ASes..",
"....Ss..M",
"..CCKccSM",
".CCCKcCSW",
".CCCKcq.w",
".SCCKcq..",
"..CCccq..",
"..TT.tt..",
"..TT.tt..",
"..BB.BB..",
]
T['man_top'] = [
"...HHk..",
"...HHk..",
"...HHk..",
"..kkkkkk",
"...ASSs.",
"...ASes.",
"....Ss..",
"..CCWcc.",
".CCCWccq",
".SCCWcqs",
"..CCccq.",
"..TT.tt.",
"..TT.tt.",
"..BB.BB.",
]
T['man_bowler'] = [
"...HHk..",
"..HHHhk.",
".kkkkkkk",
"...ASSs.",
"...ASes.",
"....Ss..",
"..CCWcc.",
".CCCWccq",
".SCCWcqs",
"..CCccq.",
"..TT.tt.",
"..TT.tt.",
"..BB.BB.",
]
T['man_bag'] = [
"...HHk...",
"..HHHhk..",
".kkkkkkk.",
"...ASSs..",
"...ASes..",
"....Ss...",
"..CCWcc..",
".CCCWccq.",
".SCCWcqq.",
"..CCccqs.",
"..TT.txXx",
"..TT.XXXx",
"..BB.XXxx",
]
T['man_wide'] = [
"...HHh..",
"..HHHhh.",
"kkkkkkkk",
"...ASSs.",
"...ASes.",
"....Ss..",
"..CWWcc.",
".CCWXccq",
".SCWXcqs",
"..CCccq.",
"..TT.tt.",
"..TT.tt.",
"..BB.BB.",
]
T['shopkeep'] = [
"...AAa..",
"..AAAAa.",
"..AASSs.",
"...ASes.",
"....Ss..",
"..WCCcw.",
".WWXXxww",
".SWXXxws",
"..XXXxx.",
"..XXXxx.",
"..TT.tt.",
"..TT.tt.",
"..BB.BB.",
]
T['woman_bonnet'] = [
"..HHHh..",
".HHHhhk.",
".HASSsk.",
".HASes..",
"..ASs...",
"..CCWc..",
".SCCCcs.",
"..CCCc..",
"..DDDdd.",
".DDDDddf",
".DDDdddf",
"DDDDdddf",
"DDDddddf",
]
T['woman_shawl'] = [
"...AAa..",
"..AAAAa.",
"..AASSs.",
"..AASes.",
"...aSs..",
".XXXWxx.",
"XXXXxxxx",
".SXXxxs.",
"..DDDdd.",
".DDDDddf",
".DDDdddf",
"DDDDdddf",
"DDDddddf",
]
T['child'] = [
"..HHk..",
".kkkkk.",
"..ASs..",
"..ASe..",
"..CCc..",
".SCCcs.",
"..CCc..",
"..T.t..",
"..B.B..",
]
T['worker'] = [
"...HHk..",
"..kkkkkk",
"...ASSs.",
"...ASes.",
"..WCWwC.",
".WWCWwCw",
".SXXXXxs",
"..XXXXx.",
"..XXxxx.",
"..TT.tt.",
"..TT.tt.",
"..BB.BB.",
]
T['smith'] = [
".......MM",
".......X.",
"...AAa.X.",
"...ASSsX.",
"...ASesS.",
"..WWWWS..",
".WXXXXw..",
".SXXXxs..",
"..XXXxx..",
"..XXxxx..",
"..TT.tt..",
"..BB.BB..",
]

# Number of head rows (hat, hair, face, neck) per template; the rest is body.
HEAD = {'agent': 6, 'agent_punch0': 6, 'agent_punch1': 6, 'man_top': 7, 'man_bowler': 6, 'man_bag': 6,
        'man_wide': 6, 'shopkeep': 5, 'woman_bonnet': 5, 'woman_shawl': 5, 'child': 4, 'worker': 4, 'smith': 5}
# What the face turns into seen from behind, and what the front of the body turns into.
BACK_FACE = {'woman_bonnet': ('H', 'h')}
BACK_BODY = {'woman_shawl': {'W': 'X'}, 'smith': {'W': 'X', 'w': 'x', 'S': 'S'},
             'shopkeep': {'X': 'W', 'x': 'w'}, 'worker': {'W': 'C', 'w': 'c'}, 'man_wide': {'W': 'C', 'X': 'C'}}

PAL = {
 #           hat            coat           trousers        dress         bag/apron      hair
 'plum':   dict(hat=('cream', 0), coat=('plum', 0), trous=('dark', 0), dress=('plum', 0), bag=('ochre', 1), hair=('wood', 2)),
 'black':  dict(hat=('iron', 2), coat=('iron', 2), trous=('iron', 1), dress=('iron', 1), bag=('wood', 1), hair=('wood', 3)),
 'brown':  dict(hat=('wood', 2), coat=('wood', 2), trous=('cream', 1), dress=('ochre', 0), bag=('red', 1), hair=('wood', 2)),
 'blue':   dict(hat=('cream', 1), coat=('navy', 0), trous=('dark', 0), dress=('navy', 0), bag=('red', 0), hair=('ochre', 1)),
 'red':    dict(hat=('wood', 1), coat=('red', 0), trous=('wood', 2), dress=('red', 0), bag=('cream', 0), hair=('ochre', 1)),
 'grey':   dict(hat=('iron', 2), coat=('iron', 1), trous=('wood', 2), dress=('iron', 0), bag=('red', 1), hair=('wood', 2)),
 'green':  dict(hat=('cream', 0), coat=('green', 0), trous=('dark', 0), dress=('green', 0), bag=('ochre', 0), hair=('wood', 2)),
 'agent':  dict(hat=('navy', 1), coat=('navy', 1), trous=('navy', 1), dress=('navy', 0), bag=('wood', 1), hair=('wood', 3)),
 'worker': dict(hat=('ochre', 0), coat=('red', 1), trous=('navy', 1), dress=('ochre', 1), bag=('navy', 0), hair=('wood', 3)),
 'cowhand':dict(hat=('wood', 2), coat=('ochre', 1), trous=('navy', 1), dress=('ochre', 1), bag=('red', 1), hair=('wood', 3)),
 'smith':  dict(hat=('wood', 2), coat=('wood', 2), trous=('iron', 2), dress=('wood', 2), bag=('wood', 2), hair=('wood', 3)),
 'store':  dict(hat=('wood', 2), coat=('green', 1), trous=('dark', 0), dress=('green', 1), bag=('cream', 0), hair=('wood', 2)),
 'bar':    dict(hat=('wood', 2), coat=('red', 1), trous=('dark', 0), dress=('red', 1), bag=('cream', 0), hair=('iron', 3)),
}

# The character types: agent (the player) plus travellers and townsfolk.
TYPES = {
    'agent':       ('agent', 'agent', 'skin'),
    'gent':        ('man_top', 'black', 'skin'),
    'merchant':    ('man_bowler', 'grey', 'skin'),
    'drummer':     ('man_bag', 'brown', 'skin'),
    'lady':        ('woman_bonnet', 'plum', 'skin'),
    'farmwife':    ('woman_shawl', 'blue', 'skin2'),
    'child':       ('child', 'red', 'skin'),
    'farmer':      ('worker', 'worker', 'skin'),
    'cowhand':     ('man_wide', 'cowhand', 'skin2'),
    'smith':       ('smith', 'smith', 'skin'),
    'storekeeper': ('shopkeep', 'store', 'skin'),
    'barkeep':     ('shopkeep', 'bar', 'skin'),
}

TAGS = {'store': ('green', 0), 'smithy': ('glass', 1), 'saloon': ('red', 0)}


def cmap(p, skin='skin'):
    def sh(rt, d):
        r, i = rt; return (r, i + d)
    return {
        'H': sh(p['hat'], 0), 'h': sh(p['hat'], 1), 'k': sh(p['hat'], 2),
        'A': sh(p['hair'], 0), 'a': sh(p['hair'], 1),
        'S': (skin, 0), 's': (skin, 1), 'e': ('dark', 2),
        'C': sh(p['coat'], 0), 'c': sh(p['coat'], 1), 'q': sh(p['coat'], 2),
        'W': ('cream', 0), 'w': ('cream', 1),
        'T': sh(p['trous'], 0), 't': sh(p['trous'], 1),
        'B': ('dark', 1),
        'D': sh(p['dress'], 0), 'd': sh(p['dress'], 1), 'f': sh(p['dress'], 2),
        'X': sh(p['bag'], 0), 'x': sh(p['bag'], 1),
        'K': ('brass', 1), 'Y': ('cream', 1), 'y': ('cream', 2), 'M': ('iron', 1),
    }


# ---------------- grid helpers (a grid is a list of lists of chars, '.' = empty) ----------------
def G(rows): return [list(r) for r in rows]
def mirror(g): return [r[::-1] for r in g]
def pad(g, n=1):
    w = len(g[0]) + 2 * n
    return [['.'] * w for _ in range(n)] + [['.'] * n + r + ['.'] * n for r in g] + [['.'] * w for _ in range(n)]


def back(name, rows):
    g = G(rows); hd = HEAD[name]
    hf, hs = BACK_FACE.get(name, ('A', 'a'))
    for r in range(hd):
        neck = (r == hd - 1) and not any(ch in 'Aa' for ch in g[r])
        for c, ch in enumerate(g[r]):
            if ch in 'Se' or (ch == 's' and not neck):
                g[r][c] = hf if ch == 'S' else hs
            if name == 'woman_bonnet' and ch in 'Aa':
                g[r][c] = 'H' if ch == 'A' else 'h'
    sub = {'W': 'C', 'w': 'c', 'K': 'C'}
    sub.update(BACK_BODY.get(name, {}))
    for r in range(hd, len(g)):
        for c, ch in enumerate(g[r]):
            if ch in sub and not (ch == 'S'):
                g[r][c] = sub[ch]
    return g


def is_leg_row(row):
    s = set(row) - {'.'}
    return bool(s) and s <= set('TtB')


def leg_groups(row):
    groups, cur = [], []
    for c, ch in enumerate(row):
        if ch in 'TtB':
            cur.append(c)
        elif cur:
            groups.append(cur); cur = []
    if cur: groups.append(cur)
    return groups


def shift_cols(row, cols, dx):
    vals = [(c, row[c]) for c in cols]
    for c in cols: row[c] = '.'
    for c, v in vals:
        if 0 <= c + dx < len(row): row[c + dx] = v


def walk_frames(g):
    """4 walk frames: step, pass (bob up 1), other step, pass."""
    legs = [r for r in range(len(g)) if is_leg_row(g[r])]
    out = []
    if legs:
        def step(sign):
            h = [r[:] for r in g]
            for r in legs[-2:]:
                gr = leg_groups(h[r])
                if len(gr) >= 2:
                    a, b = gr[0], gr[-1]
                    row = h[r]
                    va = [row[c] for c in a]; vb = [row[c] for c in b]
                    for c in a + b: row[c] = '.'
                    for c, v in zip(a, va): row[c - sign] = v if 0 <= c - sign < len(row) else v
                    for c, v in zip(b, vb): row[c + sign] = v
            return h
        def passing():
            h = [r[:] for r in g]
            top = legs[0]
            return h[:top] + [h[top][:]] + h[top:]   # one row taller: the body rides 1 px higher
        out = [step(1), passing(), step(-1), passing()]
    else:
        # long skirts: the hem sways
        def sway(dx):
            h = [r[:] for r in g]
            for r in range(len(h) - 2, len(h)):
                row = h[r]; vals = row[:]
                if dx > 0: h[r] = ['.'] + vals[:-1]
                else: h[r] = vals[1:] + ['.']
            return h
        out = [sway(1), [r[:] for r in g], sway(-1), [r[:] for r in g]]
    return out


# ---------------- carried goods (small pixel maps; 'N' is the shop mark) ----------------
ITEM = {
 'crate': [".OOOo.",
           "pOOooq",
           "pNNqqq",
           "ppqqqq",
           ".pqqq."],
 'sack':  [".yY..",
           "YYYy.",
           "YNNyy",
           "YYyyy",
           ".yyy."],
}
ITEM_CMAP = {'O': ('wood', 0), 'o': ('wood', 1), 'p': ('wood', 2), 'q': ('wood', 3),
             'Y': ('cream', 0), 'y': ('cream', 2)}


def compose(g, item, front, dy, dx):
    """Put an item grid onto a person grid (front: over the body; else behind it)."""
    ih, iw = len(item), len(item[0])
    h = [r[:] for r in g]
    # grow the grid if the item sticks out
    for r in range(ih):
        for c in range(iw):
            ch = item[r][c]
            if ch == '.': continue
            y, x = dy + r, dx + c
            while x >= len(h[0]):
                for row in h: row.append('.')
            if y < 0 or x < 0: continue
            if front or h[y][x] == '.':
                h[y][x] = ch
    return h


def carry_pose(name, g, facing_back):
    """Arms forward: drop the hands at the sides."""
    h = [r[:] for r in g]; hd = HEAD[name]
    for r in range(hd, len(h)):
        row = h[r]
        cols = [c for c, ch in enumerate(row) if ch != '.']
        if not cols: continue
        for c in (cols[0], cols[-1]):
            if row[c] == 'S': row[c] = '.'
    return h


def carry_frames(name, g, item, facing_back, mark):
    hd = HEAD[name]
    w = len(g[0])
    it = [list(r.replace('N', 'N' if mark else ('p' if 'O' in ''.join(ITEM[item]) else 'Y'))) for r in ITEM[item]]
    if not facing_back:
        dx, dy = w // 2 - 1, hd + 1
    else:
        dx, dy = w // 2 - 3, hd - 2
    base = carry_pose(name, g, facing_back)
    frames = []
    for f in [base] + walk_frames(base):
        lift = len(f) - len(base)
        x = compose(f, it, not facing_back, dy + 0, dx)
        if not facing_back:
            # hands on the sides of the load
            r = dy + 2
            for c in (dx - 1, dx + len(it[0])):
                if 0 <= c < len(x[0]) and x[r][c] == '.' or (0 <= c < len(x[0]) and x[r][c] in 'Cc'):
                    x[r][c] = 'S'
        frames.append(x)
    return frames


def push_frames(name, g, facing_back):
    base = carry_pose(name, g, facing_back)
    hd = HEAD[name]; w = len(base[0])
    out = []
    for f in [base] + walk_frames(base):
        h = [r[:] for r in f]
        if not facing_back:
            r = hd + 3 + (len(f) - len(base))
            cols = [c for c, ch in enumerate(h[r]) if ch != '.']
            if cols: h[r][cols[-1] + 1] = 'S'
        out.append(h)
    return out


# ---------------- rasterise ----------------
def to_rgba(g, cm, extra=None):
    """Grid -> RGBA with a 1 px outline in the darkest shade of each neighbour's colour ramp, plus a contact shadow.
    Returns (img, (ax, ay)). The anchor is the foot centre at ground level."""
    cm = dict(cm)
    if extra: cm.update(extra)
    h0 = len(g); w0 = len(g[0])
    P = 2
    H, W = h0 + 2 * P + 2, w0 + 2 * P + 4
    img = np.zeros((H, W, 4), np.uint8)
    cells = {}
    for r in range(h0):
        for c in range(w0):
            ch = g[r][c]
            if ch == '.': continue
            rn, ii = cm[ch]
            cells[(r + P, c + P)] = (rn, ii)
    outl = {}
    for (r, c), (rn, ii) in cells.items():
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (r + dr, c + dc)
            if q in cells or q in outl: continue
            outl[q] = (rn, E.RLEN[E.R(rn)] - 1)
    for (r, c), (rn, ii) in list(cells.items()) + list(outl.items()):
        ii = min(ii, E.RLEN[E.R(rn)] - 1)
        img[r, c, :3] = E.PAL[E.R(rn), ii]; img[r, c, 3] = 255
    # anchor: the bottom template row sits just above the anchor line; foot centre at w0 // 2
    ax = P + w0 // 2
    ay = P + h0
    # contact shadow (same oval as the mockup's darken_blob, offset away from the light)
    for r in range(H):
        for c in range(W):
            if img[r, c, 3]: continue
            U = (c - ax + 0.5) / 2.0; V = (r - ay + 0.5)
            X = (U + V) / 2.0; Y = (V - U) / 2.0
            if ((X - 1.6) / 2.2) ** 2 + (Y / 1.2) ** 2 <= 1:
                img[r, c] = E.SHADOW_RGBA
    return img, (ax, ay)


def trim(img, anchor):
    a = img[..., 3] > 0
    ys, xs = np.nonzero(a)
    r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return img[r0:r1, c0:c1].copy(), (anchor[0] - c0, anchor[1] - r0)


DIRS = {'e': ('front', False), 's': ('front', True), 'n': ('back', False), 'w': ('back', True)}
# Direction names: e = facing world +x (screen lower right), s = +z (lower left), n = -z (upper right), w = -x (upper left).


def oriented(name, rows, d):
    side, mir = DIRS[d]
    g = G(rows) if side == 'front' else back(name, rows)
    g = [['.'] * 3 + r + ['.'] * (3 + (9 - len(r))) for r in g]   # same width for every frame: a stable anchor
    return g, side == 'back', mir


def build_all():
    """Returns a list of (sprite name, [frames as (img, anchor)], meta)."""
    out = []
    for tname, (tpl, pal, skin) in TYPES.items():
        cm = cmap(PAL[pal], skin)
        for d in 'eswn':
            g, isback, mir = oriented(tpl, T[tpl], d)
            fx = (lambda x: mirror(x)) if mir else (lambda x: x)
            def emit(nm, grids, lift=0, extra=None, meta=None):
                frames = []
                for k, gg in enumerate(grids):
                    gg = fx(gg)
                    img, an = to_rgba(gg, cm, extra)
                    img, an = trim(img, an)
                    l = lift[k] if isinstance(lift, (list, tuple)) else lift
                    frames.append((img, (an[0], an[1] + l)))
                out.append((nm, frames, meta or {}))
            emit(f'person.{tname}.idle.{d}', [g])
            wf = walk_frames(g)
            emit(f'person.{tname}.walk.{d}', wf)
            emit(f'person.{tname}.board.{d}', [wf[0], g], lift=[2, 4])
            if tname == 'agent':
                p0, _, _ = oriented('agent_punch0', T['agent_punch0'], d)
                p1, _, _ = oriented('agent_punch1', T['agent_punch1'], d)
                emit(f'person.agent.punch.{d}', [p0, p1])
                for item in ('crate', 'sack'):
                    for tag in (None, 'store', 'smithy', 'saloon'):
                        fr = carry_frames(tpl, g, item, isback, tag is not None)
                        extra = dict(ITEM_CMAP)
                        if tag: extra['N'] = TAGS[tag]
                        nm = f'person.agent.carry_{item}' + (f'_{tag}' if tag else '') + f'.{d}'
                        # frame 0 is standing, 1-4 walk
                        emit(nm, fr, extra=extra, meta={'frame_note': 'idle, walk x4'})
                emit(f'person.agent.push.{d}', push_frames(tpl, g, isback), meta={'frame_note': 'idle, walk x4'})
    return out
