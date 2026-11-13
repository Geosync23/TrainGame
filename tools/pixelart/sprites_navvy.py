# Sprite module: D32 rail crew and their tools (plans/d32-tech.md 10.1; owner: the D32 artist).
#   ppl/navvy_a|b|c/<anim>/<dir>/<f>     the three navvies (people_navvy.py), all four facings drawn, never mirrored
#   tool/<t>/held/<dir>                  a long tool on the shoulder (drawn at the man's extra.tool), t = pick, shovel,
#                                        maul, axe, hook, rake, tongs
#   tool/<t>/ground                      the tool lying on the ground
#   tool/barrow/<dir>, /<dir>/full, /<dir>/tipped    the wheelbarrow (drawn at the pusher's extra.grip)
import math
import numpy as np
import pal27  # noqa: F401
import people as PE
import people_navvy as NV
import harness as H
from geom_d32 import Frame

TOOLS = ('pick', 'shovel', 'maul', 'axe', 'hook', 'rake', 'tongs')


def held_frames():
    """The tool across the shoulder: the handle through the hand, the head behind and up. Anchor: the hand pixel's
    top-left (the man's extra.tool lands on it)."""
    out = {}
    cm = PE.cmap(PE.SPECS['navvy_a'][1]); cm.update(NV.EXTRA_CODES)
    for t in TOOLS:
        if t == 'tongs':
            cells = NV.tool_cells('tongs', (0, 0), -60, 3, 2)
        else:
            head, butt = {'pick': (7, 3), 'shovel': (7, 3), 'maul': (7, 3), 'axe': (6, 3), 'hook': (6, 2),
                          'rake': (8, 3)}[t]
            cells = NV.tool_cells(t, (0, 0), 152, head, butt)
        g = {(x, y): c for x, y, c in cells}
        for d in PE.DRAWN:
            back, mir = PE.DIRS[d]
            img, (ax, ay) = PE.to_rgba(g, cm, mirrored=mir)
            out[(t, d)] = (img, (ax - 1 if mir else ax, ay - 1))
    return out


# ---------------------------------------------------------------- tools on the ground (engine shapes)
def ground_tool(t):
    F = Frame(yaw=28.0)
    hh = 0.06
    if t == 'tongs':
        F.rod((-0.5, -0.12, hh), (0.45, 0.1, hh), 0.04, 'iron')
        F.rod((-0.5, 0.12, hh), (0.45, -0.1, hh), 0.04, 'iron')
        F.rod((0.45, 0.1, hh), (0.6, 0.0, hh), 0.04, 'iron')
        F.rod((0.45, -0.1, hh), (0.6, 0.0, hh), 0.04, 'iron')
        return
    L = {'pick': 1.25, 'shovel': 1.2, 'maul': 1.25, 'axe': 1.1, 'hook': 1.0, 'rake': 1.5}[t]
    F.box(-L / 2, -0.05, 0.0, L / 2 - 0.1, 0.05, 0.1, 'wood', shades=(1, 2, 3))
    a = L / 2 - 0.1
    if t == 'pick':
        F.box(a - 0.06, -0.55, 0.0, a + 0.1, 0.55, 0.13, 'iron', shades=(1, 2, 3))
    elif t == 'shovel':
        F.box(a, -0.2, 0.0, a + 0.42, 0.2, 0.05, 'iron', shades=(1, 2, 3))
        F.box(-L / 2 - 0.1, -0.14, 0.0, -L / 2, 0.14, 0.08, 'wood', shades=(1, 2, 3))
    elif t == 'maul':
        F.box(a - 0.05, -0.32, 0.0, a + 0.12, 0.32, 0.14, 'iron', shades=(1, 2, 3))
    elif t == 'axe':
        F.box(a - 0.06, -0.06, 0.0, a + 0.12, 0.34, 0.1, 'iron', shades=(1, 2, 3))
    elif t == 'hook':
        F.box(a - 0.02, -0.06, 0.0, a + 0.38, 0.22, 0.05, 'iron', shades=(1, 2, 3))
        F.box(a + 0.28, 0.12, 0.0, a + 0.4, 0.34, 0.05, 'iron', shades=(1, 2, 3))
    elif t == 'rake':
        F.box(a, -0.42, 0.0, a + 0.1, 0.42, 0.08, 'iron', shades=(1, 2, 3))


# ---------------------------------------------------------------- the wheelbarrow
DIR_YAW = {'se': 0.0, 'ne': 90.0, 'sw': -90.0, 'nw': 180.0}
GRIP_H = 0.72            # u: the handles' ends (the pusher's hands)


def barrow_frame(d, state=None):
    return Frame(yaw=DIR_YAW[d], pitch=-30.0 if state == 'tipped' else 0.0, pivot=(1.75, 0.3), s=0.8)


def barrow(d, state=None):
    """A navvy's wooden barrow, the wheel ahead (+a), the handles' ends at local a = 0. state: None (empty),
    'full' (broken rock), 'tipped' (tipped forward over the wheel, the rock spilt)."""
    F = barrow_frame(d, state)
    # the wheel, an iron-tyred wooden wheel
    def wtex(part, s, ang, rho, idx):
        rr = np.where(rho > 0.22, 0, 0)
        ii = np.where(rho > 0.22, 3, np.where(np.abs(np.sin(ang * 3)) < 0.3, 3, 2))
        hub = rho < 0.06
        return None, np.where(hub, 1, ii)
    F.cyl((1.75, 0.0, 0.3), 'c', 0.3, 0.05, 'wood', tex=wtex)
    # the handles (shafts) from the grips to the wheel
    for c in (-0.32, 0.32):
        F.rod((0.0, c, GRIP_H), (1.75, c * 0.35, 0.32), 0.045, 'wood')
    # legs
    for c in (-0.28, 0.28):
        F.rod((0.75, c, 0.0), (0.8, c * 0.9, 0.45), 0.04, 'wood')
    # the tray: a bottom and sloping sides as boards
    F.box(0.6, -0.34, 0.42, 1.45, 0.34, 0.48, 'wood', shades=(1, 2, 3))
    F.box(0.55, -0.42, 0.42, 1.55, -0.34, 0.78, 'wood', shades=(1, 2, 3))
    F.box(0.55, 0.34, 0.42, 1.55, 0.42, 0.78, 'wood', shades=(1, 2, 3))
    F.box(1.45, -0.42, 0.42, 1.6, 0.42, 0.74, 'wood', shades=(1, 2, 3))
    F.box(0.5, -0.42, 0.42, 0.6, 0.42, 0.72, 'wood', shades=(1, 2, 3))
    # iron straps
    F.box(1.5, -0.43, 0.6, 1.62, 0.43, 0.66, 'iron', shades=(1, 2, 3))
    if state == 'full':
        import engine as E
        from geom27 import UX
        rnd = np.random.RandomState(5)
        for k in range(9):
            a = 0.7 + rnd.uniform(0, 0.75); c = rnd.uniform(-0.25, 0.25)
            p = F.pt(a, c, 0.7 + rnd.uniform(0, 0.12))
            E.sphere(p[0] * UX, p[1] * UX, p[2] * E.U_Y, rnd.uniform(0.6, 0.85), 'rock', th=(0.75, 0.3, -0.25),
                     noise=0.5, seed=300 + k, sz=0.8)
    if state == 'tipped':
        import engine as E
        from geom27 import UX
        rnd = np.random.RandomState(9)
        G = Frame(yaw=DIR_YAW[d])
        for k in range(8):
            p = G.pt(2.0 + rnd.uniform(0, 0.6), rnd.uniform(-0.4, 0.4), 0.08)
            E.sphere(p[0] * UX, p[1] * UX, p[2] * E.U_Y, rnd.uniform(0.6, 0.85), 'rock', th=(0.75, 0.3, -0.25),
                     noise=0.5, seed=320 + k, sz=0.7)


def _grip_anchor(fr, d, state):
    """Move the anchor from the ground below the handles to the handles' ends (in the air)."""
    img, (ax, ay) = fr
    x, z, y = barrow_frame(d, state).pt(0.0, 0.0, GRIP_H)
    return img, (ax + int(round(8 * (x - z))), ay + int(round(4 * (x + z) - 8 * y)))


def register(reg):
    for key, frames, meta, indexed in NV.build_all():
        reg.add(key, 'navvy', frames, meta, indexed=indexed)
    held = held_frames()
    for t in TOOLS:
        for d in PE.DRAWN:
            reg.add(f'tool/{t}/held/{d}', 'navvy', [held[(t, d)]],
                    dict(anchor='the hand on the handle (top-left of the hand pixel): draw at the man\'s feet + '
                                'extra.tool of his shoulder frame, after the man'))
        reg.add(f'tool/{t}/ground', 'navvy', [H.render(lambda t=t: ground_tool(t), shadow=(-8, -8, 8, 8))],
                dict(anchor='the tool\'s middle on the ground', note=f'a {t} lying on the ground'))
    for d in PE.DRAWN:
        for state, nm in ((None, ''), ('full', '/full'), ('tipped', '/tipped')):
            fr = H.render(lambda d=d, s=state: barrow(d, s), shadow=(-12, -12, 16, 16))
            reg.add(f'tool/barrow/{d}{nm}', 'navvy', [_grip_anchor(fr, d, state)],
                    dict(anchor='the handles\' ends (the pusher\'s hands): draw at the pusher\'s feet + extra.grip of '
                                'his barrow or tip frame; sort it just ahead of him',
                         note={None: 'empty', 'full': 'full of broken rock', 'tipped': 'tipped over the wheel, the '
                               'rock spilt ahead'}[state]))
