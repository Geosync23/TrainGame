# D27 town art (A3, the buildings-and-town artist): the twelve main-street buildings at the D27 scale
# (plans/d27-tech.md sections 1.4, 2.4 and 7.3), the church, the school and four houses.
#
# Scale: 1 m = 1.43u; a person is 2.5u (20 px). One-storey walls 5.0u, false fronts to 7.5u; the hotel walls 8.6u,
# front 10u; the livery barn 16u deep, ridge 9u; the church 10 x 16u, steeple 16u.
# Units here are the engine's mockup units (MU): 4 MU = 1u along x and z, 16/3 MU = 1u up.
#
# Every street building is drawn in a local frame (town.Frame): a runs along the street (-24 .. 24 MU = the 12u lot),
# b runs from the lot's back (-24) to its front edge (+24, where the boardwalk starts); the boardwalk is b 24 .. 34
# (2.5u), 1.6 MU (0.3u) high. The west row faces +x ('e': its fronts are the shaded right-hand faces in the view);
# the east row faces -x ('w': its fronts are turned away, so it gets hanging signs over the boardwalk, painted
# south walls and backs with life in them).
import math
import numpy as np
import pal27  # noqa: F401  (adds the D27 ramps to the engine)
import night27  # noqa: F401  (adds the 'lamp' ramp: door lamps, lit at night)
from ptag import tag  # D32: part tags (back, front, roof, floor) for buildings that open; no effect on the drawing
import engine as E
from engine import R, box, cyl_z, cyl_x, sphere, gable_x, gable_y, hash2, new_oid, disc_x, disc_y
import town as TW
from town import Frame, Paint, rect, clampi, shingle_tex, plank_roof_tex, end_clap, end_batten, text_width

U = 4.0
UY = 16.0 / 3.0
LOT_A = 24.0                # half the lot along the street (12u)
LOT_B = 24.0                # the lot's front edge (b), and -LOT_B its back
WALK_B = 34.0               # the boardwalk's street edge (2.5u wide)
WALK_H = 1.6                # boardwalk top: 0.3u
WALL = 5.0 * UY             # one-storey wall: 26.7 MU
FRONT = 7.5 * UY            # false front top: 40 MU
AWN_Z = 3.3 * UY            # awning top: people (2.5u) walk under it
DOOR_H = 3.0 * UY           # 16 MU
DOOR_W = 1.3 * U            # 5.2 MU

# ============================ textures ============================

def tex_wall(kind, p, h, z, lit):
    """Wall texture on Paint p; h runs along the face, z up."""
    if kind == 'clap':
        p.clapboard(2.0, 0.6)
    elif kind == 'batten':
        p.battens(2.6, 0.5, 1.0, u=h)
        # weathering: a few darker boards
        hb = hash2(np.floor(h / 2.6).astype(int), 7) % 6
        p.ii = np.where((hb == 0) & (np.mod(h, 2.6) > 1.0), clampi(p.base + 1), p.ii)
    elif kind == 'brick':
        row = np.floor(z / 1.34).astype(int)
        off = np.where(row % 2 == 0, 0.0, 1.4)
        mort = (np.mod(z, 1.34) < 0.42) | (np.mod(h + off, 2.8) < 0.45)
        hb = hash2(np.floor((h + off) / 2.8).astype(int), row) % 7
        p.ii = np.where(mort, clampi(p.base + 1), np.where(hb == 2, clampi(p.base - 1), p.ii))
    elif kind == 'stone':
        row = np.floor(z / 2.7).astype(int)
        hw = 3.6 + (hash2(row, 3) % 3)
        off = (hash2(row, 11) % 7) * 0.6
        col = np.floor((h + off) / hw).astype(int)
        joint = (np.mod(z, 2.7) < 0.5) | (np.mod(h + off, hw) < 0.5)
        hb = hash2(col, row) % 5
        p.ii = np.where(joint, clampi(p.base + 1), np.where(hb == 0, clampi(p.base - 1), np.where(hb == 3, clampi(p.base + 1) * 0 + p.base, p.ii)))
    elif kind == 'log':
        p.logs(2.2)
    elif kind == 'board':
        p.ii = np.where(np.mod(h, 1.8) < 0.45, clampi(p.base + 1), p.ii)


def roof_tex(kind):
    if kind == 'shingle':
        return shingle_tex()
    if kind == 'tin':
        def f(face, X, Y, Z, idx):
            c = X if face in ('f', 'b') else Y
            return None, np.where(np.mod(c, 2.0) < 0.6, clampi(idx + 1), idx)
        return f
    return plank_roof_tex(2.6)


def planks_top(lf, u, z, a, b, idx, lit):
    if lf == 't':
        seg = np.floor((b + 40) / 9.0).astype(int)
        hb = hash2(np.floor((a + 100) / 1.6).astype(int), seg) % 7
        ii = np.where(np.mod(a, 1.6) < 0.42, 2, np.where(hb == 0, 0, np.where(hb == 3, 2, 1)))
        ii = np.where(np.abs(np.mod(b + 40, 9.0)) < 0.35, 2, ii)
        return None, ii
    return None, np.where(np.mod(u, 3.0) < 0.6, 3, idx)


# ============================ the building specs ============================
# wall/trim/roof: ramps; tex: wall texture; front: 'false' (square), 'stepped', 'peak' (pointed pediment),
# 'cornice' (brick parapet), 'gable' (no false front: the gable end faces the street), 'two' (two storeys);
# roof: 'shingle' | 'plank' | 'tin' | 'flat'; awning: None | 'flat' | 'stripe' | 'shed' | 'gallery' | 'dock'.
SPECS = {
    'store':      dict(row='w', sign='GENERAL STORE', wall='cream', trim='green', board=('cream', 0), letters=('green', 2),
                       tex='clap', front='false', fh=FRONT, roof='shingle', awning='flat', awn='green',
                       side_ad=('DRY GOODS', 'green', 2), bk=-14.0),
    'hotel':      dict(row='w', sign='HOTEL', wall='slate', trim='cream', board=('cream', 0), letters=('n', 'navy', 1),
                       tex='clap', front='two', fh=10.0 * UY, wall_h=8.6 * UY, roof='shingle', awning='gallery', awn='cream',
                       side_ad=('ROOMS & MEALS', 'cream', 0), bk=-18.0),
    'bank':       dict(row='w', sign='BANK', wall='brick', trim='cream', board=('umber', 3), letters=('brass', 1),
                       tex='brick', front='cornice', fh=6.8 * UY, roof='flat', awning=None,
                       side_ad=('WHITCOMB & CO', 'cream', 1), bk=-16.0),
    'smithy':     dict(row='w', sign='BLACKSMITH', wall='wood', trim='wood', board=('cream', 1), letters=('wood', 4),
                       tex='batten', front='false', fh=6.6 * UY, roof='plank', awning=None, awn='wood',
                       side_ad=('HORSESHOEING', 'cream', 1), bk=-16.0),
    'livery':     dict(row='w', sign='LIVERY', wall='wood', trim='cream', board=None, letters=('cream', 0),
                       tex='batten', front='gable', fh=0, roof='plank', awning=None, wall_h=4.6 * UY, ridge=9.0 * UY,
                       side_ad=('HAY & GRAIN', 'cream', 1), bk=-40.0),
    'feed':       dict(row='w', sign='FEED & SEED', wall='straw', trim='brick', board=('cream', 0), letters=('brick', 2),
                       tex='batten', front='peak', fh=FRONT, roof='tin', awning='dock', awn='wood',
                       side_ad=('FLOUR  OATS', 'brick', 1), bk=-16.0),
    'saloon':     dict(row='e', sign='SALOON', wall='wood', trim='cream', board=('ochre', 0), letters=('red', 1),
                       tex='clap', front='stepped', fh=8.4 * UY, roof='plank', awning='stripe', awn='red',
                       side_ad=('BILLIARDS', 'cream', 0), bk=-14.0),
    'newspaper':  dict(row='e', sign='GAZETTE', wall='slate', trim='cream', board=('cream', 0), letters=('navy', 2),
                       tex='clap', front='false', fh=FRONT, roof='shingle', awning='flat', awn='slate',
                       side_ad=('JOB PRINTING', 'cream', 0), bk=-14.0),
    'barber':     dict(row='e', sign='BARBER', wall='cream', trim='red', board=('cream', 0), letters=('red', 1),
                       tex='clap', front='false', fh=7.0 * UY, roof='shingle', awning='flat', awn='red',
                       side_ad=('HOT BATHS', 'red', 1), bk=-12.0),
    'sheriff':    dict(row='e', sign='SHERIFF', wall='rock', trim='wood', board=('wood', 3), letters=('cream', 0),
                       tex='stone', front='cornice', fh=6.2 * UY, roof='flat', awning='flat', awn='wood',
                       side_ad=('JAIL', 'cream', 0), bk=-16.0),
    'undertaker': dict(row='e', sign='COFFINS', wall='umber', trim='cream', board=('cream', 1), letters=('umber', 3),
                       tex='batten', front='false', fh=FRONT, roof='shingle', awning='flat', awn='umber',
                       side_ad=('FURNITURE', 'cream', 1), bk=-12.0),
    'assay':      dict(row='e', sign='ASSAY', wall='rock', trim='brick', board=('cream', 0), letters=('brick', 2),
                       tex='stone', front='cornice', fh=5.8 * UY, roof='flat', awning=None,
                       side_ad=('ASSAY OFFICE', 'brick', 2), bk=-8.0),
}
WEST = ('store', 'hotel', 'bank', 'smithy', 'livery', 'feed')
EAST = ('saloon', 'newspaper', 'barber', 'sheriff', 'undertaker', 'assay')
LOT_Z = (-38, -52, -66, -80, -94, -108)
BODY_A = 22.0               # body half width along the street (11u; alleys of 0.5u inside each lot)
FF_B = 22.8                 # the false front's back face
FF_T = 1.2                  # false front thickness


def facing(kind):
    return 'e' if SPECS[kind]['row'] == 'w' else 'w'


def wall_h(sp):
    return sp.get('wall_h', WALL)


# ============================ painting the faces ============================

# door lamps (a beside the main door seen in the view), lit in the night versions (night27.py)
FRONT_LAMPS = {'store': (4.5,), 'hotel': (-4.9, 4.9), 'bank': (-5.1, 5.1), 'feed': (3.5,)}


def door_lamp(p, a, z, ac, zb=DOOR_H - 4.4, dark=False):
    """A small wall lantern painted on the face at a = ac: an iron cap, hook and base round the 'lamp' glass
    (which reads as dark glass by day and burns at night). dark: a lantern inside a dark doorway."""
    p.fill(rect(a, z, ac - 0.2, ac + 0.2, zb + 4.4, zb + 5.2), 'iron', 3)
    p.fill(rect(a, z, ac - 0.9, ac + 0.9, zb + 3.6, zb + 4.4) | rect(a, z, ac - 0.45, ac + 0.45, zb, zb + 0.6), 'iron', 3)
    p.fill(rect(a, z, ac - 0.7, ac + 0.7, zb + 0.6, zb + 3.6), 'lamp', 3 if dark else np.where(z > zb + 2.6, 1, 2))


def _sign_board(p, a, z, sp, z0, z1, a0, a1, lit):
    if sp['board'] is None:
        return
    p.fill(rect(a, z, a0 - 0.7, a1 + 0.7, z0 - 0.7, z1 + 0.7), sp['trim'], 1 + lit)
    p.fill(rect(a, z, a0, a1, z0, z1), sp['board'][0], sp['board'][1] + lit)


def _front_paint(kind):
    """The street front (west row only: the east row's fronts face away and are not drawn)."""
    sp = SPECS[kind]
    def paint(lf, u, z, a, b, idx, lit):
        p = Paint(sp['wall'], u, z, idx, lit)
        tex_wall(sp['tex'], p, a, z, lit)
        if lf != 'f':
            return p.rr, p.ii
        tr = sp['trim']
        p.u = a + 0.0
        if kind == 'store':
            p.door(-3.0, 3.0, DOOR_H, ramp='green', trim=tr, double=True)
            p.window(-2.6, 2.6, DOOR_H + 0.8, DOOR_H + 2.6, trim=tr, panes=(2, 1), sill=False)
            for w0 in (-19.0, 6.0):
                p.window(w0, w0 + 13.0, 3.6, 15.0, trim=tr, panes=(4, 2), sill=True)
                g = rect(a, z, w0 + 0.3, w0 + 12.7, 3.6, 7.2)
                col = np.floor((a - w0) / 1.5).astype(int) % 5
                hh = (z - 3.6) < np.array([2.8, 2.0, 3.2, 1.6, 2.4])[col]
                rr_ = np.array([R('ochre'), R('red'), R('brass'), R('cream'), R('green')])[col]
                p.rr = np.where(g & hh, rr_, p.rr)
                p.ii = np.where(g & hh, np.where(np.mod(a, 1.5) < 0.5, 0, 1 + lit), p.ii)
            for w0 in (-15.0, 10.0):
                p.window(w0, w0 + 5.0, 21.0, 26.0, trim=tr, panes=(2, 2), sill=True)
            _sign_board(p, a, z, sp, 30.0, 37.4, -19.5, 19.5, lit)
        elif kind == 'hotel':
            # ground floor: door with a transom, two tall windows each side
            p.door(-2.8, 2.8, DOOR_H + 0.6, ramp='wood', trim=tr, double=True)
            p.window(-2.6, 2.6, DOOR_H + 1.4, DOOR_H + 3.2, trim=tr, panes=(3, 1), sill=False)
            for w0 in (-19.0, -11.0, 7.0, 15.0):
                p.window(w0, w0 + 4.2, 4.0, 15.0, trim=tr, panes=(2, 3), sill=True, shutters='green')
            # upper floor: three doors onto the gallery and two windows
            for d0 in (-14.5, -2.4, 9.7):
                p.door(d0, d0 + 4.8, 26.0 + 16.0, ramp='glass', trim=tr, panels=False, z0=26.0, knob=False)
                p.fill(rect(a, z, d0, d0 + 4.8, 26.0, 42.0) & (np.abs(a - d0 - 2.4) < 0.3), tr, 1 + lit)
                p.fill(rect(a, z, d0, d0 + 4.8, 26.0, 42.0) & (np.abs(z - 34.0) < 0.3), tr, 1 + lit)
            for w0 in (-21.0, 17.0):
                p.window(w0, w0 + 3.6, 30.0, 39.0, trim=tr, panes=(1, 2), sill=True)
            p.fill(np.abs(z - 24.6) < 0.8, tr, 2 + lit)          # floor band
            _sign_board(p, a, z, sp, 44.6, 51.0, -12.0, 12.0, lit)
        elif kind == 'bank':
            # stone (cream) dressings: a plinth, quoins, keystoned windows, a pedimented double door
            p.fill(z < 2.6, 'rock', 1 + lit)
            for qa in (-23.0, 21.4):
                q = (a >= qa) & (a < qa + 1.6) & (np.mod(z, 5.4) < 2.7)
                p.fill(q, 'cream', 1 + lit)
            p.door(-3.2, 3.2, DOOR_H + 1.0, ramp='umber', trim='cream', double=True)
            p.fill(rect(a, z, -4.4, 4.4, DOOR_H + 1.6, DOOR_H + 3.4), 'cream', 0 + lit)
            p.fill(rect(a, z, -3.0, 3.0, DOOR_H + 3.4, DOOR_H + 4.6) & (np.abs(a) < 3.0 - (z - DOOR_H - 3.4) * 2.2), 'cream', 0 + lit)
            for w0 in (-18.0, -11.0, 7.0, 14.0):
                g = rect(a, z, w0, w0 + 4.0, 5.0, 17.0)
                p.window(w0, w0 + 4.0, 5.0, 17.0, trim='cream', panes=(1, 3), sill=True)
                p.fill(g & (np.mod(a - w0, 1.3) < 0.4), 'iron', 3)   # iron bars
                p.fill(rect(a, z, w0 + 1.3, w0 + 2.7, 17.4, 19.0), 'cream', 0 + lit)  # keystone
            _sign_board(p, a, z, sp, 25.0, 31.6, -12.0, 12.0, lit)
        elif kind == 'smithy':
            op = rect(a, z, -12.0, 12.0, 0.0, 16.5)
            p.fill(rect(a, z, -13.0, 13.0, 0.0, 17.5) & ~op, 'wood', 3 + lit)
            p.fill(op, 'dark', 2)
            p.fill(op & (z < 1.2), 'dark', 1)
            fx = -5.0
            glow = op & (((a - fx) ** 2) / 10.0 + ((z - 4.0) ** 2) / 6.0 < 1)
            halo = op & ~glow & (((a - fx) ** 2) / 26.0 + ((z - 4.6) ** 2) / 15.0 < 1)
            p.fill(halo, 'fire', 2)
            p.fill(glow, 'fire', np.where(((a - fx) ** 2 + (z - 3.4) ** 2) < 2.4, 0, 1))
            p.fill(rect(a, z, fx - 3.8, fx + 3.8, 8.0, 9.4), 'iron', 3)
            p.fill(rect(a, z, fx - 1.3, fx + 1.3, 9.4, 16.5), 'iron', 3)
            for tx in (3.0, 5.0, 7.0, 9.0):
                p.fill(rect(a, z, tx, tx + 0.5, 8.0, 12.5), 'iron', 2)
                p.fill(rect(a, z, tx - 0.4, tx + 0.9, 7.6, 8.4), 'iron', 1)
            p.fill(rect(a, z, -0.4, 0.4, 0.0, 16.5), 'wood', 2 + lit)
            p.window(15.0, 19.0, 7.0, 12.0, trim='wood', panes=(2, 2))
            p.window(-19.0, -15.0, 7.0, 12.0, trim='wood', panes=(2, 2))
            hs = (np.abs(np.hypot(a - 0.0, z - 20.0) - 1.4) < 0.5) & (z > 19.3)
            p.fill(hs, 'iron', 1)
            _sign_board(p, a, z, sp, 26.0, 32.6, -14.5, 14.5, lit)
        elif kind == 'feed':
            p.door(-9.0, 1.0, 17.0, ramp='wood', trim=tr, double=True, panels=False)
            p.fill(rect(a, z, -9.0, 1.0, 0, 17.0) & (np.abs((a + 9.0) - z * 10.0 / 17.0) < 0.6), tr, 1 + lit)
            p.fill(rect(a, z, -9.0, 1.0, 0, 17.0) & (np.abs((a + 9.0) - (17.0 - z) * 10.0 / 17.0) < 0.6), tr, 1 + lit)
            p.window(6.0, 11.0, 7.0, 13.0, trim=tr, panes=(2, 2))
            p.window(-19.0, -14.0, 7.0, 13.0, trim=tr, panes=(2, 2))
            p.door(-2.6, 2.6, 30.0, ramp='wood', trim=tr, z0=21.0, panels=False, knob=False)   # loft door
            _sign_board(p, a, z, sp, 32.0, 38.4, -14.0, 14.0, lit)
        for ac in FRONT_LAMPS.get(kind, ()):
            door_lamp(p, a, z, ac)
        p.fill(rect(a, z, -LOT_A, LOT_A, -1, 1.2), tr, 3 + lit) if kind in ('store', 'hotel') else None
        return p.rr, p.ii
    return paint


def _side_paint(kind, part='body'):
    """The visible walls: the south end (+z) in both rows, the back (+x) of the east row."""
    sp = SPECS[kind]
    wh = wall_h(sp)
    bk = sp['bk']
    def paint(lf, u, z, a, b, idx, lit):
        p = Paint(sp['wall'], u, z, idx, lit)
        h = b if lf == 's' else a
        tex_wall(sp['tex'], p, h, z, lit)
        tr = sp['trim']
        if lf == 's' and part == 'body':
            bm = (bk + FF_B) / 2.0
            # windows low on the side wall (placed by depth, so both rows match)
            wins = [bk + 6.0, FF_B - 9.0]
            if kind in ('sheriff', 'assay'):
                for bc in wins:
                    g = (np.abs(b - bc) < 1.6) & (z > 8.0) & (z < 13.0)
                    p.fill((np.abs(b - bc) < 2.2) & (z > 7.4) & (z < 13.6) & ~g, 'rock', 0 + lit)
                    p.fill(g, 'dark', 2)
                    p.fill(g & (np.mod(b - bc, 1.1) < 0.45), 'iron', 1)
            elif kind == 'livery':
                for bc in (-30.0, -16.0, -2.0, 12.0):
                    g = (np.abs(b - bc) < 1.4) & (z > 10.0) & (z < 13.0)
                    p.fill((np.abs(b - bc) < 2.0) & (z > 9.4) & (z < 13.6) & ~g, 'wood', 3 + lit)
                    p.fill(g, 'dark', 2)
            else:
                for bc in wins:
                    win = (np.abs(b - bc) < 1.8) & (z > 4.5) & (z < 12.0)
                    fr = (np.abs(b - bc) < 2.4) & (z > 3.8) & (z < 12.7) & ~win
                    p.fill(fr, tr, 1 + lit)
                    p.fill(win, 'glass', np.where(z > 11.0, 2, 3))
                    p.fill(win & ((np.abs(b - bc) < 0.3) | (np.abs(z - 8.2) < 0.3)), tr, 1 + lit)
                if kind == 'hotel':
                    for bc in (bk + 4.0, FF_B - 5.0):
                        win = (np.abs(b - bc) < 1.8) & (z > 28.0) & (z < 35.0)
                        fr = (np.abs(b - bc) < 2.4) & (z > 27.3) & (z < 35.7) & ~win
                        p.fill(fr, tr, 1 + lit)
                        p.fill(win, 'glass', np.where(z > 37.0, 2, 3))
                        p.fill(win & ((np.abs(b - bc) < 0.3) | (np.abs(z - 31.5) < 0.3)), tr, 1 + lit)
                    p.fill(np.abs(z - 24.6) < 0.8, tr, 2 + lit)
            # the painted advertisement panel (letters added after shading by side_letters)
            ad = sp.get('side_ad')
            if ad and kind not in ('livery',):
                w = text_width(ad[0]) / 2.0 + 2.4
                z1 = wh - 2.0
                pnl = (np.abs(b - bm) < w / 2.0) & (z > z1 - 7.4) & (z < z1)
                if kind in ('bank', 'sheriff', 'assay'):
                    p.fill(pnl, sp['board'][0] if kind != 'sheriff' else 'wood', 2 + lit if kind != 'sheriff' else 3)
                else:
                    # weathered paint straight on the boards: the panel is a lighter or darker ground
                    base = 'cream' if ad[1] != 'cream' else sp['wall'] if sp['wall'] not in ('cream',) else 'wood'
                    if kind in ('saloon', 'undertaker', 'newspaper', 'smithy', 'hotel'):
                        base = sp['wall']
                        ii = np.where(np.mod(z, 2.0) < 0.6, 3, 2) if sp['tex'] == 'clap' else 2 + 0 * z
                        p.fill(pnl, base, ii)
                    else:
                        p.fill(pnl, base, 1 + lit)
        if lf == 'k' and part == 'body':
            # the back wall of the east row (seen): back door, windows, a stovepipe stain
            a_door = {'saloon': 10.0, 'newspaper': -8.0, 'barber': 6.0, 'sheriff': -10.0, 'undertaker': 4.0, 'assay': -2.0}.get(kind, 0.0)
            dm = (np.abs(a - a_door) < 2.6) & (z < DOOR_H)
            p.fill((np.abs(a - a_door) < 3.2) & (z < DOOR_H + 0.7) & ~dm, tr if kind not in ('sheriff', 'assay') else 'wood', 2 + lit)
            p.fill(dm, 'wood', np.where(np.mod(a - a_door, 1.3) < 0.4, 4, 3))
            p.fill(dm & (np.abs(a - a_door + 1.6) < 0.4) & (np.abs(z - 8.0) < 0.5), 'iron', 1)
            wins = [c for c in (-14.0, 16.0, -2.0) if abs(c - a_door) > 7.0][:2]
            sd = -1.0 if any(abs(a_door + 4.2 - c) < 4.5 for c in wins) else 1.0
            door_lamp(p, a, z, a_door + sd * 4.2)
            for ac in wins:
                g = (np.abs(a - ac) < 1.8) & (z > 6.0) & (z < 13.0)
                fr = (np.abs(a - ac) < 2.4) & (z > 5.3) & (z < 13.7) & ~g
                if kind in ('sheriff',):
                    p.fill(fr, 'rock', 0 + lit)
                    p.fill(g, 'dark', 2)
                    p.fill(g & (np.mod(a - ac, 1.1) < 0.45), 'iron', 1)
                else:
                    p.fill(fr, tr, 1 + lit)
                    p.fill(g, 'glass', np.where(z > 12.0, 2, 3))
                    p.fill(g & ((np.abs(a - ac) < 0.3) | (np.abs(z - 9.5) < 0.3)), tr, 1 + lit)
        if lf in ('s', 'k') and part == 'ffback':
            # the back of a false front, seen above the roof: raw boards and a diagonal brace
            p.rr = np.full(np.shape(z), R('wood'))
            p.ii = np.where(np.mod(a if lf == 'k' else b, 1.8) < 0.45, 3, 2) + 0 * idx
            if lf == 'k':
                br = np.abs((a + 20.0) * 0.6 - (z - wh)) < 0.7
                br2 = np.abs((20.0 - a) * 0.6 - (z - wh)) < 0.7
                p.fill((br | br2) & (z > wh), 'wood', 4)
        return p.rr, p.ii
    return paint


def side_letters(kind):
    """Letters of the painted advertisement on the south wall (after shading)."""
    sp = SPECS[kind]
    ad = sp.get('side_ad')
    if not ad or kind == 'livery':
        return
    F = Frame(facing(kind))
    wh = wall_h(sp)
    bm = (sp['bk'] + FF_B) / 2.0
    w = text_width(ad[0]) / 2.0
    zt = wh - 3.2
    if F.f == 'e':
        F.text('s', bm - w / 2.0, zt, ad[0], ad[1], ad[2], plane=-BODY_A)
    else:
        F.text('s', bm + w / 2.0, zt, ad[0], ad[1], ad[2], plane=BODY_A)


def front_letters(kind):
    sp = SPECS[kind]
    if sp['row'] != 'w' or kind == 'livery':
        return
    F = Frame('e')
    s = sp['sign']
    w = text_width(s) / 2.0
    ztop = {'store': 36.0, 'hotel': 49.6, 'bank': 30.2, 'smithy': 31.2, 'feed': 37.0}[kind]
    lr, li = (sp['letters'][1], sp['letters'][2]) if len(sp['letters']) == 3 else sp['letters']
    plane = LOT_B + 0.6 if kind != 'livery' else LOT_B
    F.text('f', -w / 2.0, ztop, s, lr, li, plane=plane)


# ============================ the body ============================

def body(kind):
    sp = SPECS[kind]
    F = Frame(facing(kind))
    o = new_oid(True)
    wh = wall_h(sp)
    bk = sp['bk']
    A = BODY_A
    if sp['front'] == 'gable':
        return livery_body(F, sp, o)
    tag('walls')
    F.box(-A, bk, 0, A, FF_B, wh, sp['wall'], paint=_side_paint(kind), oid=o)
    tag('roof')
    # the roof behind the false front
    if sp['roof'] == 'flat':
        def tar(lf, u, z, a, b, idx, lit):
            if lf != 't':
                return None, idx
            ii = np.where(np.mod(b, 5.0) < 0.5, 3, 2)
            ii = np.where((hash2(np.floor(a / 2).astype(int), np.floor(b / 5).astype(int)) % 23 == 0) & (np.mod(b, 5.0) >= 0.5), 3, ii)
            return None, ii
        F.box(-A - 0.6, bk - 0.6, wh, A + 0.6, FF_B, wh + 1.0, 'roof', paint=tar, shades=(2, 2, 3), oid=o)
        # a low parapet round the flat roof and a chimney
        def cap(lf, u, z, a, b, idx, lit):
            return None, idx
        F.box(-A - 0.6, bk - 0.6, wh + 1.0, A + 0.6, bk + 0.6, wh + 2.4, sp['wall'], shades=(0, 1, 2), oid=o)
        F.box(-A - 0.6, bk - 0.6, wh + 1.0, -A + 0.6, FF_B, wh + 2.4, sp['wall'], shades=(0, 1, 2), oid=o)
        F.box(A - 0.6, bk - 0.6, wh + 1.0, A + 0.6, FF_B, wh + 2.4, sp['wall'], shades=(0, 1, 2), oid=o)
        cx = -12.0 if kind != 'assay' else 10.0
        F.box(cx - 1.4, bk + 4.0, wh, cx + 1.4, bk + 7.0, wh + 9.0, 'brick',
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(z, 1.34) < 0.42, clampi(idx + 1), idx)), oid=o)
        if kind == 'assay':   # the assay furnace's taller stack
            F.box(cx - 1.6, bk + 3.8, wh + 9.0, cx + 1.6, bk + 7.2, wh + 10.0, 'iron', oid=o)
    else:
        ridge = wh + (A + 1.6) * 0.42
        hw = A + 1.6
        rt = roof_tex(sp['roof'])
        rr = {'shingle': 'roof', 'plank': 'wood', 'tin': 'iron'}[sp['roof']]
        endt = end_batten('x' if F.f in ('e', 'w') else 'y', 2.6, ramp=sp['wall']) if sp['tex'] != 'clap' else end_clap(2.0, ramp=sp['wall'])
        if sp['tex'] in ('brick', 'stone'):
            endt = None
        tag('gable')
        F.roof_depth(bk - 1.4, FF_B, 0.0, hw, wh - 0.4, ridge, rr, wall=sp['wall'], oid=o, tex=rt, endtex=endt)
        tag('roof')
        # stovepipe or chimney
        if kind in ('newspaper', 'barber', 'undertaker', 'saloon', 'hotel', 'store'):
            pa, pb = {'newspaper': (9.0, bk + 8.0), 'barber': (-8.0, bk + 6.0), 'undertaker': (10.0, bk + 10.0),
                      'saloon': (-10.0, bk + 12.0), 'hotel': (-12.0, bk + 10.0), 'store': (11.0, bk + 9.0)}[kind]
            zr = ridge - abs(pa) * 0.42
            if kind in ('hotel', 'saloon', 'store'):
                F.box(pa - 1.5, pb - 1.5, zr - 2.0, pa + 1.5, pb + 1.5, ridge + 5.0, 'brick',
                      paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(z, 1.34) < 0.42, clampi(idx + 1), idx)), oid=o)
                F.box(pa - 1.9, pb - 1.9, ridge + 5.0, pa + 1.9, pb + 1.9, ridge + 5.8, 'brick', shades=(1, 2, 3), oid=o)
            else:
                X, Y = F.w(pa, pb)
                cyl_z(X, Y, zr - 2.0, ridge + 6.0, 0.75, 'iron', oid=o, th=(0.4, 0.1, -0.3))
                cyl_z(X, Y, ridge + 6.0, ridge + 6.8, 1.1, 'iron', oid=o)
        if kind == 'smithy':
            F.box(-14.0, bk + 6.0, wh, -10.0, bk + 10.0, ridge + 9.0, 'brick',
                  paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(z, 1.34) < 0.42, clampi(idx + 1), idx)), oid=o)
            F.box(-14.5, bk + 5.5, ridge + 9.0, -9.5, bk + 10.5, ridge + 10.0, 'iron', oid=o)
    # the false front (the street front: towards the viewer in the west row, away from it in the east row)
    tag('front' if sp['row'] == 'w' else 'back')
    fo = new_oid(True)
    fh = sp['fh']
    fa = A + 1.0
    pf = _front_paint(kind)
    fb = _side_paint(kind, 'ffback')
    def ffpaint(lf, u, z, a, b, idx, lit):
        if lf == 'f':
            return pf(lf, u, z, a, b, idx, lit)
        if z.size and np.max(z) > wh - 0.1 and lf == 'k':
            return fb(lf, u, z, a, b, idx, lit)
        p = Paint(sp['wall'], u, z, idx, lit)
        tex_wall(sp['tex'], p, b, z, lit)
        return p.rr, p.ii
    F.box(-fa, FF_B, 0, fa, LOT_B, fh, sp['wall'], paint=ffpaint, oid=fo)
    tr = sp['trim']
    if sp['front'] == 'false':
        F.box(-fa - 0.8, FF_B - 0.4, fh, fa + 0.8, LOT_B + 0.8, fh + 1.2, tr, shades=(0, 1, 2), oid=fo)
        F.box(-fa - 0.4, LOT_B, fh - 2.4, fa + 0.4, LOT_B + 0.5, fh, tr, shades=(1, 2, 3), oid=fo)
        for ab in (-fa + 2.0, -6.0, 6.0, fa - 2.0):        # cornice brackets
            F.box(ab - 0.5, LOT_B, fh - 3.6, ab + 0.5, LOT_B + 0.7, fh - 2.4, tr, shades=(1, 2, 3), oid=fo)
    elif sp['front'] == 'two':
        F.box(-fa - 0.8, FF_B - 0.4, fh, fa + 0.8, LOT_B + 1.0, fh + 1.4, tr, shades=(0, 1, 2), oid=fo)
        F.box(-6.0, FF_B, fh + 1.4, 6.0, LOT_B, fh + 4.6, sp['wall'], paint=ffpaint, oid=fo)
        F.box(-6.6, FF_B - 0.4, fh + 4.6, 6.6, LOT_B + 0.8, fh + 5.4, tr, shades=(0, 1, 2), oid=fo)
    elif sp['front'] == 'stepped':
        F.box(-fa - 0.8, FF_B - 0.4, fh, fa + 0.8, LOT_B + 0.8, fh + 1.0, tr, shades=(0, 1, 2), oid=fo)
        F.box(-13.0, FF_B, fh + 1.0, 13.0, LOT_B, fh + 4.0, sp['wall'], paint=ffpaint, oid=fo)
        F.box(-13.6, FF_B - 0.4, fh + 4.0, 13.6, LOT_B + 0.8, fh + 4.8, tr, shades=(0, 1, 2), oid=fo)
        F.box(-6.0, FF_B, fh + 4.8, 6.0, LOT_B, fh + 7.6, sp['wall'], paint=ffpaint, oid=fo)
        F.box(-6.6, FF_B - 0.4, fh + 7.6, 6.6, LOT_B + 0.8, fh + 8.4, tr, shades=(0, 1, 2), oid=fo)
    elif sp['front'] == 'peak':
        for k in range(10):
            hw_ = fa - 1.0 - k * 2.2
            if hw_ < 1.0:
                break
            F.box(-hw_, FF_B, fh + k * 1.0, hw_, LOT_B, fh + (k + 1) * 1.0, sp['wall'], paint=ffpaint, oid=fo)
        F.box(-fa - 0.8, FF_B - 0.4, fh - 0.6, fa + 0.8, LOT_B + 0.8, fh + 0.3, tr, shades=(0, 1, 2), oid=fo)
        # hoist beam with a pulley and rope
        F.box(-0.6, LOT_B, fh + 2.0, 0.6, LOT_B + 6.0, fh + 3.2, 'wood', shades=(1, 2, 3), oid=fo)
        X, Y = F.w(0.0, LOT_B + 5.2)
        cyl_z(X, Y, fh - 0.4, fh + 2.0, 0.6, 'iron', oid=fo)
        F.box(-0.15, LOT_B + 5.0, fh - 14.0, 0.15, LOT_B + 5.3, fh - 0.4, 'straw', shades=(2, 2, 3), oid=fo, cast=False)
        F.box(-0.7, LOT_B + 4.6, fh - 15.2, 0.7, LOT_B + 5.8, fh - 14.0, 'iron', shades=(1, 2, 3), oid=fo)
    elif sp['front'] == 'cornice':
        F.box(-fa - 0.8, FF_B - 0.4, fh, fa + 0.8, LOT_B + 1.0, fh + 1.6, 'cream' if kind == 'bank' else sp['wall'],
              shades=(0, 1, 2), oid=fo)
        F.box(-fa - 0.4, LOT_B, fh - 1.2, fa + 0.4, LOT_B + 0.6, fh, 'cream' if kind == 'bank' else sp['wall'], shades=(1, 2, 3), oid=fo)
        if kind == 'bank':
            for k in range(4):
                hw_ = 9.0 - k * 2.4
                F.box(-hw_, FF_B, fh + 1.6 + k * 1.2, hw_, LOT_B + 0.4, fh + 2.8 + k * 1.2, 'cream', shades=(0, 1, 2), oid=fo)
    tag(None)
    return o


def livery_body(F, sp, o):
    """The livery barn: its gable end faces the street, with big doors, a hay loft and its name on the gable."""
    A = BODY_A
    bk = sp['bk']
    wh = sp['wall_h']
    ridge = sp['ridge']
    def walls(lf, u, z, a, b, idx, lit):
        p = Paint('wood', u, z, idx, lit)
        tex_wall('batten', p, a if lf in 'fk' else b, z, lit)
        if lf == 'f':
            dw = rect(a, z, -8.0, 8.0, 0, 4.3 * UY)
            p.fill(rect(a, z, -9.0, 9.0, 0, 4.3 * UY + 1.0) & ~dw, 'cream', 1 + lit)
            p.fill(dw, 'dark', np.where(z < 1.0, 1, 2))
            # a stall partition and a horse's head looking out of the dark
            hd = dw & (((a - 4.0) / 1.6) ** 2 + ((z - 11.0) / 2.6) ** 2 < 1)
            p.fill(hd, 'wood', 3)
            p.fill(dw & (np.abs(a + 4.0) < 0.5), 'wood', 4)
            p.fill(dw & (z < 6.0) & (np.abs(a - 1.0) < 0.4), 'straw', 2)
            # the doors slid open to each side, with X braces
            for d0 in (-20.5, 9.5):
                dd = rect(a, z, d0, d0 + 11.0, 0, 4.3 * UY)
                p.fill(dd, 'wood', np.where(np.mod(a - d0, 2.2) < 0.5, 3, 2) + lit)
                x1 = np.abs((a - d0) * (4.3 * UY) / 11.0 - z) < 0.9
                x2 = np.abs((d0 + 11.0 - a) * (4.3 * UY) / 11.0 - z) < 0.9
                p.fill(dd & (x1 | x2), 'cream', 2 + lit)
                p.fill(dd & ((z > 4.3 * UY - 1.2) | (z < 1.2)), 'cream', 2 + lit)
            p.fill(rect(a, z, -22.0, 22.0, 4.3 * UY + 1.0, 4.3 * UY + 1.8), 'iron', 3)   # the door track
            door_lamp(p, a, z, -6.5, zb=4.3 * UY - 6.4, dark=True)    # a lantern hung inside the barn door
        return p.rr, p.ii
    tag('walls')
    F.box(-A, bk, 0, A, LOT_B, wh, 'wood', paint=walls, oid=o)
    hw = A + 2.0
    def gend(face, X, Y, Z, idx):
        a, b = F.local(X, Y)
        ii = np.where(np.mod(a, 2.6) < 0.5, 2, 3)
        rr = np.full(X.shape, R('wood'))
        loft = (np.abs(a) < 3.6) & (Z > wh + 3.0) & (Z < wh + 12.0)
        rr = np.where(loft, R('dark'), rr); ii = np.where(loft, 2, ii)
        hay = loft & (Z < wh + 6.0) & (hash2(np.floor(a * 2).astype(int), np.floor(Z).astype(int)) % 3 > 0)
        rr = np.where(hay, R('straw'), rr); ii = np.where(hay, 1 + (np.floor(a * 3).astype(int) % 2), ii)
        trim = (np.abs(a) < 4.4) & (Z > wh + 2.2) & (Z < wh + 12.8) & ~loft
        rr = np.where(trim, R('cream'), rr); ii = np.where(trim, 2, ii)
        return rr, ii
    tag('gable')
    F.roof_depth(bk - 1.6, LOT_B + 1.6, 0.0, hw, wh - 0.4, ridge, 'wood', wall='wood', oid=o, tex=plank_roof_tex(2.6), endtex=gend)
    tag('roof')
    # hay hood: the roof's peak pushed out over the loft, with the hoist beam
    F.box(-1.0, LOT_B, ridge - 3.0, 1.0, LOT_B + 6.0, ridge - 1.6, 'wood', shades=(1, 2, 3), oid=o)
    X, Y = F.w(0.0, LOT_B + 5.4)
    cyl_z(X, Y, ridge - 5.0, ridge - 3.0, 0.6, 'iron', oid=o)
    F.box(-0.15, LOT_B + 5.2, wh + 2.0, 0.15, LOT_B + 5.5, ridge - 5.0, 'straw', shades=(2, 2, 3), oid=o, cast=False)
    # a cupola on the ridge for the hay's air
    bc = bk + 24.0
    F.box(-3.0, bc - 3.0, ridge - 2.0, 3.0, bc + 3.0, ridge + 4.0, 'wood',
          paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(z, 1.5) < 0.6, 4, 2 + lit)), oid=o)
    F.roof_depth(bc - 4.0, bc + 4.0, 0.0, 4.4, ridge + 3.6, ridge + 6.4, 'roof', oid=o, tex=shingle_tex())
    tag(None)
    return o


def livery_letters():
    F = Frame('e')
    s = 'LIVERY'
    w = text_width(s) / 2.0
    # on the gable, above the door track
    F.text('f', -w / 2.0, 4.3 * UY + 7.4, s, 'cream', 0, plane=LOT_B)


# ============================ the boardwalk, awnings, signs ============================

def walk(kind):
    """The boardwalk in front of the building, 12u along the street, 2.5u wide, 0.3u high (flat: drawn under people)."""
    F = Frame(facing(kind))
    o = new_oid(False)
    F.box(-LOT_A, LOT_B, 0, LOT_A, WALK_B, WALK_H, 'wood', paint=planks_top, oid=o, cast=False)
    if SPECS[kind]['awning'] == 'dock':
        # the feed store's loading dock: a raised platform on the boardwalk's north half, with steps
        F.box(-LOT_A + 0.5, LOT_B, WALK_H, -2.0, LOT_B + 7.0, 1.0 * UY, 'wood', paint=planks_top, oid=o, cast=False)
        for k in range(2):
            F.box(-2.0, LOT_B + 1.0, WALK_H, -2.0 + 1.6 * (2 - k), LOT_B + 6.0, WALK_H + (k + 1) * 1.2, 'wood',
                  paint=planks_top, oid=o, cast=False)
    return o


def awning(kind):
    sp = SPECS[kind]
    kind_a = sp['awning']
    if kind_a in (None, 'dock'):
        return None
    F = Frame(facing(kind))
    o = new_oid(True)
    ramp = sp['awn']
    zt = AWN_Z
    post_b = WALK_B - 1.2
    if kind_a == 'gallery':
        # the hotel: posts, a gallery deck at the first floor with a railing, more posts and a roof
        zd = 4.4 * UY
        zr = 7.9 * UY
        for a in (-23.0, -8.0, 8.0, 23.0):
            F.box(a - 0.5, post_b - 0.5, WALK_H, a + 0.5, post_b + 0.5, zr, 'cream', shades=(1, 2, 3), oid=o)
        F.box(-LOT_A, LOT_B, zd, LOT_A, WALK_B, zd + 1.0, 'wood', paint=planks_top, oid=o)
        F.box(-LOT_A, WALK_B - 0.4, zd - 1.6, LOT_A, WALK_B, zd, 'cream', shades=(1, 2, 3), oid=o)
        # railing: top rail and balusters
        F.box(-LOT_A, post_b - 0.3, zd + 5.4, LOT_A, post_b + 0.3, zd + 6.1, 'cream', shades=(0, 1, 2), oid=o)
        for k in range(int(2 * LOT_A / 1.6) + 1):
            a = -LOT_A + k * 1.6
            F.box(a - 0.2, post_b - 0.2, zd + 1.0, a + 0.2, post_b + 0.2, zd + 5.4, 'cream', shades=(1, 2, 3), oid=o, cast=False)
        for a in (-LOT_A + 0.3, LOT_A - 0.3):
            F.box(a - 0.25, LOT_B, zd + 5.4, a + 0.25, post_b, zd + 6.1, 'cream', shades=(0, 1, 2), oid=o)
        F.box(-LOT_A - 0.6, LOT_B, zr, LOT_A + 0.6, WALK_B + 0.6, zr + 0.9, 'roof', paint=lambda lf, u, z, a, b, idx, lit:
              (None, np.where(np.mod(a, 2.0) < 0.6, clampi(idx + 1), idx)), oid=o)
        return o
    for a in ((-23.0, 23.0) if kind_a != 'shed' else (-23.0, 0.0, 23.0)):
        F.box(a - 0.5, post_b - 0.5, WALK_H, a + 0.5, post_b + 0.5, zt, 'wood' if ramp not in ('cream',) else 'cream',
              shades=(1, 2, 3), oid=o)
    if kind_a == 'shed':
        # a plank lean-to roof sloping towards the street
        for k in range(5):
            b0 = LOT_B + k * 2.2
            F.box(-LOT_A, b0, zt + (4 - k) * 0.8, LOT_A, b0 + 2.2 + (1.2 if k == 4 else 0), zt + (4 - k) * 0.8 + 0.8, 'wood',
                  paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(a, 2.6) < 0.6, clampi(idx + 1), idx)), oid=o)
        return o
    def awn(lf, u, z, a, b, idx, lit):
        if kind_a == 'stripe':
            stripe = np.mod(a, 2.4) < 1.2
            return np.where(stripe, R('red'), R('cream')), np.where(stripe, 1 + lit, 1 + lit) + 0 * idx
        return None, np.where(np.mod(a, 2.0) < 0.6, clampi(idx + 1), idx)
    F.box(-LOT_A, LOT_B, zt, LOT_A, WALK_B, zt + 0.8, ramp, paint=awn, oid=o)
    def val(lf, u, z, a, b, idx, lit):
        tooth = (np.mod(a, 1.6) < 0.8) & (z < zt - 0.4)
        if kind_a == 'stripe':
            stripe = np.mod(a, 2.4) < 1.2
            return np.where(stripe, R('red'), R('cream')), np.where(tooth, 2 + lit, 1 + lit) + 0 * idx
        return None, np.where(tooth, clampi(idx + 1), idx)
    F.box(-LOT_A, WALK_B - 0.4, zt - 1.2, LOT_A, WALK_B, zt, ramp, paint=val, oid=o, cast=False)
    return o


SIGN_A = 21.0          # along the street (local a) where the east row's hanging sign hangs: near the south end
SIGN_ARM = (WALK_B - 1.4, WALK_B + 14.0)  # a sign post at the boardwalk's street edge; its arm runs out over the street
# (out over the street, so the building's own false front never hides the board in the fixed view)
SIGN_Z = (5.0 * UY, 6.9 * UY)            # the board's bottom and top: above the awning


def sign_geom(kind):
    """(board width, board centre b, arm end b) of an east-row hanging sign, in MU."""
    w = text_width(SPECS[kind]['sign']) / 2.0 + 2.6
    bm = SIGN_ARM[0] + 1.2 + w / 2.0
    return w, bm, bm + w / 2.0 + 1.0


def hanging_sign(kind):
    """East row: a board on a bracket over the boardwalk, its face towards the viewer (+z), so the name reads."""
    sp = SPECS[kind]
    F = Frame('w')
    o = new_oid(True)
    z0, z1 = SIGN_Z
    b0 = SIGN_ARM[0]
    w, bm, b1 = sign_geom(kind)
    # the sign post, the arm out over the street and a diagonal brace under it
    F.box(SIGN_A - 0.55, b0 - 0.55, WALK_H, SIGN_A + 0.55, b0 + 0.55, z1 + 2.6, 'wood', shades=(1, 2, 3), oid=o)
    F.box(SIGN_A - 0.4, b0, z1 + 1.2, SIGN_A + 0.4, b1, z1 + 2.2, 'iron', shades=(1, 2, 3), oid=o)
    for k in range(6):
        bb = b0 + 0.5 + k * 1.4
        F.box(SIGN_A - 0.3, bb, z1 + 1.2 - (6 - k) * 1.3, SIGN_A + 0.3, bb + 1.4, z1 + 1.2 - (6 - k) * 1.3 + 1.0, 'iron',
              shades=(1, 2, 3), oid=o, cast=False)
    # chains and the board
    for bb in (bm - w / 2.0 + 1.0, bm + w / 2.0 - 1.0):
        F.box(SIGN_A - 0.2, bb - 0.2, z1, SIGN_A + 0.2, bb + 0.2, z1 + 1.2, 'iron', shades=(2, 2, 3), oid=o, cast=False)
    bo = new_oid(True)
    trim = sp['trim'] if sp['trim'] != 'wood' else 'cream'
    def face(lf, u, z, a, b, idx, lit):
        if lf != 's':
            return np.full(np.shape(z), R(trim)), idx
        inner = (np.abs(b - bm) < w / 2.0 - 0.8) & (z > z0 + 1.0) & (z < z1 - 1.0)
        rr = np.where(inner, R(sp['board'][0]), R(trim))
        ii = np.where(inner, sp['board'][1] + 0 * idx, 1 + lit + 0 * idx)
        return rr, ii
    F.box(SIGN_A - 0.5, bm - w / 2.0, z0, SIGN_A + 0.5, bm + w / 2.0, z1, trim, paint=face, oid=bo)
    return o


def hanging_sign_letters(kind):
    sp = SPECS[kind]
    F = Frame('w')
    w, bm, b1 = sign_geom(kind)
    tw = text_width(sp['sign']) / 2.0
    zt = (SIGN_Z[0] + SIGN_Z[1]) / 2.0 + 2.6
    lr, li = (sp['letters'][1], sp['letters'][2]) if len(sp['letters']) == 3 else sp['letters']
    F.text('s', bm + tw / 2.0, zt, sp['sign'], lr, li, plane=SIGN_A + 0.5)


def barber_pole(frame):
    """The barber's pole at the boardwalk's street edge by his door, stripes turning (2 frames)."""
    F = Frame('w')
    o = new_oid(True)
    X, Y = F.w(-6.0, WALK_B - 1.4)
    cyl_z(X, Y, WALK_H, WALK_H + 1.4, 0.9, 'cream', oid=o)
    def stripes(face, X_, Y_, Z, idx):
        ang = np.arctan2(Y_ - Y, X_ - X)
        s = np.mod(ang / (2 * np.pi) * 3 + Z / 3.0 + frame * 0.5, 1.0) < 0.5
        rr = np.where(s, R('red'), R('cream'))
        if face == 't':
            return np.full(X_.shape, R('cream')), idx
        return rr, idx
    cyl_z(X, Y, WALK_H + 1.4, WALK_H + 12.0, 0.75, 'cream', oid=o, tex=stripes, th=(0.5, 0.2, -0.2))
    cyl_z(X, Y, WALK_H + 12.0, WALK_H + 12.8, 0.95, 'brass', oid=o)
    sphere(X, Y, WALK_H + 13.6, 0.9, 'brass', oid=o)
    return o


# ============================ the east row's backs: yards with life in them ============================

def _woodpile(F, a0, b0, length=8.0, rows=3, o=None):
    for r in range(rows):
        for k in range(int(length / 1.5)):
            X, Y = F.w(a0 + k * 1.5 + (0.75 if r % 2 else 0), b0)
            if F.f == 'w':
                cyl_x(X - 2.2, X + 2.2 - 0.3 * (k % 3), Y, 0.75 + r * 1.3, 0.72, 'wood', oid=o,
                      tex=lambda f, X_, Y_, Z_, i: (None, np.where(i == 3, 1, i)))
            else:
                cyl_x(X - 2.2, X + 2.2, Y, 0.75 + r * 1.3, 0.72, 'wood', oid=o)
    return o


def privy(F, a, b, o):
    """An outhouse, 1.1 x 1.1u, 2.4u tall, its door with a crescent toward the lot's side."""
    def walls(lf, u, z, a_, b_, idx, lit):
        p = Paint('wood', u, z, idx, lit)
        p.battens(1.6, 0.4, 0.8, u=(a_ if lf in 'fk' else b_))
        if lf == 's':
            moon = (np.abs(np.hypot(b_ - b, z - 10.5) - 0.9) < 0.45) & ((b_ - b) > -0.2)
            p.fill(moon, 'dark', 2)
        return p.rr, p.ii
    F.box(a - 2.2, b - 2.2, 0, a + 2.2, b + 2.2, 12.0, 'wood', paint=walls, oid=o)
    F.box(a - 2.8, b - 2.8, 12.0, a + 2.8, b + 2.8, 12.9, 'wood', shades=(1, 2, 3), oid=o)
    F.box(a - 2.6, b - 2.6, 12.9, a + 2.6, b + 2.0, 13.4, 'wood', shades=(1, 2, 3), oid=o)


def rain_barrel(F, a, b, o, h=5.4):
    X, Y = F.w(a, b)
    TW.barrel(r=1.6, h=h, oid=o, x=X, y=Y)
    cyl_z(X, Y, h - 0.4, h - 0.1, 1.3, 'creek', oid=o, topidx=2)


def washing_line(F, a0, a1, b, o, cloths):
    for a in (a0, a1):
        F.box(a - 0.35, b - 0.35, 0, a + 0.35, b + 0.35, 11.0, 'wood', shades=(1, 2, 3), oid=o)
        F.box(a - 0.3, b - 1.6, 10.2, a + 0.3, b + 1.6, 10.8, 'wood', shades=(1, 2, 3), oid=o)
    F.box(a0, b - 0.1, 10.4, a1, b + 0.1, 10.6, 'i1' and 'iron', shades=(1, 1, 1), oid=o, cast=False)
    for (ac, w, h, ramp, ii) in cloths:
        F.box(ac - w / 2, b - 0.12, 10.4 - h, ac + w / 2, b + 0.12, 10.4, ramp, shades=(ii, ii, ii + 1), oid=new_oid(True))


def back_porch(F, a0, a1, b0, b1, o, posts=True, roof='wood'):
    F.box(a0, b0, 0, a1, b1, 1.6, 'wood', paint=planks_top, oid=o)
    zt = 3.6 * UY
    if posts:
        for a in (a0 + 0.6, a1 - 0.6):
            F.box(a - 0.4, b0 + 0.5, 1.6, a + 0.4, b0 + 1.3, zt, 'wood', shades=(1, 2, 3), oid=o)
    for k in range(4):
        bb = b0 - 0.8 + k * (b1 - b0 + 0.8) / 4.0
        F.box(a0 - 0.6, bb, zt + k * 0.7, a1 + 0.6, bb + (b1 - b0 + 0.8) / 4.0 + 0.2, zt + k * 0.7 + 0.7, roof,
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(a, 2.4) < 0.6, clampi(idx + 1), idx)), oid=o)


def crate(F, a, b, z, o, s=2.6, h=2.2, ramp='wood'):
    X, Y = F.w(a, b)
    TW.crate_box(X - s / 2, Y - s / 2, z, s, s, h, ramp=ramp, oid=o)


def sack(F, a, b, z, o, ramp='cream'):
    X, Y = F.w(a, b)
    TW.sack_shape(X, Y, z, ramp=ramp, oid=o)


def keg(F, a, b, z, o, ramp='wood'):
    X, Y = F.w(a, b)
    TW.barrel(r=1.2, h=3.0, ramp=ramp, oid=o, x=X, y=Y, z=z)


def yard(kind):
    """The back yard of an east-row lot (local b -24 .. bk), seen in the fixed view."""
    sp = SPECS[kind]
    F = Frame('w')
    o = new_oid(True)
    bk = sp['bk']
    if kind == 'saloon':
        back_porch(F, -2.0, 18.0, bk - 7.0, bk, o)
        for k, (a, b) in enumerate(((-6.0, bk - 3.5), (-8.5, bk - 5.0), (-6.0, bk - 6.5), (-8.5, bk - 2.0))):
            keg(F, a, b, 0, o, ramp='wood' if k % 2 else 'ochre')
        keg(F, -7.2, bk - 4.2, 3.0, o)
        privy(F, -18.0, -19.5, o)
        rain_barrel(F, 20.0, bk - 2.4, o)
        crate(F, 4.0, bk - 9.5, 0, o)
        crate(F, 4.4, bk - 9.2, 2.2, o, s=2.2, ramp='ochre')
    elif kind == 'newspaper':
        _woodpile(F, -18.0, bk - 3.0, 10.0, 3, o)
        for k in range(3):
            crate(F, 8.0 + k * 0.2, bk - 3.0, k * 2.0, o, s=3.0, h=2.0, ramp='cream')
        rain_barrel(F, 16.0, bk - 2.6, o)
        privy(F, 18.0, -19.5, o)
        # a printer's discarded type case leaning on the wall: a small dark board
        F.box(-4.0, bk - 0.9, 0, 0.0, bk - 0.3, 6.0, 'wood', shades=(2, 3, 3), oid=o)
    elif kind == 'barber':
        # the bath house lean-to with its boiler chimney, wash tubs and the washing line
        F.box(-20.0, bk - 9.0, 0, -4.0, bk, 3.4 * UY, 'cream', paint=lambda lf, u, z, a, b, idx, lit:
              (None, np.where(np.mod(z, 2.0) < 0.6, clampi(idx + 1), idx)), oid=o)
        for k in range(4):
            bb = bk - 9.6 + k * 2.6
            F.box(-20.6, bb, 3.4 * UY + k * 0.6, -3.4, bb + 2.8, 3.4 * UY + k * 0.6 + 0.6, 'roof',
                  paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(a, 2.0) < 0.6, clampi(idx + 1), idx)), oid=o)
        X, Y = F.w(-16.0, bk - 5.0)
        cyl_z(X, Y, 3.4 * UY, 3.4 * UY + 12.0, 0.8, 'iron', oid=o)
        for (a, b) in ((2.0, bk - 4.0), (6.0, bk - 7.0)):
            X, Y = F.w(a, b)
            cyl_z(X, Y, 0, 2.6, 1.9, 'iron', oid=o, tex=lambda f, X_, Y_, Z_, i: (None, np.where(f == 't', 3, i)))
        washing_line(F, -14.0, 18.0, -20.0, o, [(-9.0, 3.0, 4.0, 'cream', 0), (-4.5, 2.4, 3.2, 'cream', 1),
                                                (1.0, 3.6, 5.0, 'red', 1), (6.5, 2.6, 3.6, 'cream', 0),
                                                (11.0, 3.0, 4.4, 'slate', 1)])
    elif kind == 'sheriff':
        _woodpile(F, 4.0, bk - 3.0, 12.0, 4, o)
        rain_barrel(F, -18.0, bk - 2.6, o)
        privy(F, -16.0, -20.0, o)
        # a saddle on the rail and a hitching post
        for a in (6.0, 16.0):
            F.box(a - 0.4, -19.4, 0, a + 0.4, -18.6, 6.0, 'wood', shades=(1, 2, 3), oid=o)
        F.box(5.0, -19.4, 5.4, 17.0, -18.6, 6.2, 'wood', shades=(0, 2, 3), oid=o)
        F.box(9.0, -20.2, 3.6, 13.0, -17.8, 6.8, 'ochre', shades=(1, 2, 3), oid=o)
    elif kind == 'undertaker':
        # lumber stacked to season, a saw horse with a plank, a plain box leaning on the wall
        for k in range(5):
            F.box(-21.0, -21.0 + k * 0.1, k * 1.2, -2.0, -15.0, k * 1.2 + 1.0, 'wood',
                  paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(b, 1.5) < 0.4, clampi(idx + 1), idx)), oid=o)
            F.box(-20.0, -18.5, k * 1.2 + 1.0, -19.0, -17.5, k * 1.2 + 1.2, 'wood', shades=(3, 3, 3), oid=o, cast=False)
        for a in (4.0, 10.0):
            F.box(a - 0.4, bk - 7.0, 0, a + 0.4, bk - 6.4, 4.0, 'wood', shades=(1, 2, 3), oid=o)
            F.box(a - 0.4, bk - 4.6, 0, a + 0.4, bk - 4.0, 4.0, 'wood', shades=(1, 2, 3), oid=o)
            F.box(a - 0.4, bk - 7.0, 4.0, a + 0.4, bk - 4.0, 4.6, 'wood', shades=(0, 2, 3), oid=o)
        F.box(2.0, bk - 6.4, 4.6, 13.0, bk - 4.6, 5.2, 'w0' and 'wood', shades=(0, 1, 2), oid=o)
        # the plain box (hexagonal coffin shape seen from the side), standing against the wall
        F.box(16.0, bk - 1.6, 0, 19.4, bk - 0.4, 12.0, 'umber', shades=(1, 1, 2), oid=o)
        F.box(16.4, bk - 1.6, 9.0, 19.0, bk - 0.2, 13.0, 'umber', shades=(1, 1, 2), oid=o)
    elif kind == 'assay':
        for k, (a, b) in enumerate(((-6.0, bk - 4.0), (-3.0, bk - 5.5), (-8.0, bk - 7.0), (-4.5, bk - 8.0))):
            sack(F, a, b, 0, o, ramp='rock' if k % 2 else 'cream')
        sack(F, -5.0, bk - 5.0, 1.8, o, ramp='rock')
        # a wheelbarrow of ore
        X, Y = F.w(10.0, bk - 6.0)
        box(X - 3.0, Y - 1.4, 1.4, X + 1.4, Y + 1.4, 3.6, 'wood', shades=(1, 2, 3), oid=o)
        sphere(X - 0.8, Y, 3.6, 1.6, 'rock', oid=o, sz=0.5, noise=0.6, seed=3)
        disc_y(X + 2.4, 1.4, 1.4, Y + 1.5, 'wood', oid=o, kind='small')
        box(X - 5.0, Y - 1.2, 2.6, X - 3.0, Y - 0.8, 3.0, 'wood', shades=(1, 2, 3), oid=o)
        box(X - 5.0, Y + 0.8, 2.6, X - 3.0, Y + 1.2, 3.0, 'wood', shades=(1, 2, 3), oid=o)
        privy(F, 18.0, -20.0, o)
        rain_barrel(F, -18.0, bk - 2.6, o)
    return o


# ============================ part boxes (sorting) ============================

def part_box(kind, part):
    """[x0, z0, x1, z1, height] in u from the lot's anchor, for the renderer's sort."""
    sp = SPECS[kind]
    F = Frame(facing(kind))
    if part == 'body':
        bk = sp['bk']
        h = max(sp['fh'], sp.get('ridge', 0)) + 8.0
        r = F.rect_w(-LOT_A, bk - 1.6, LOT_A, LOT_B + 0.8)
    elif part == 'walk':
        h = WALK_H if sp['awning'] != 'dock' else 1.0 * UY
        r = F.rect_w(-LOT_A, LOT_B, LOT_A, WALK_B)
    elif part == 'awning':
        h = 8.4 * UY if sp['awning'] == 'gallery' else AWN_Z + 4.0
        r = F.rect_w(-LOT_A, LOT_B, LOT_A, WALK_B)
    elif part == 'sign':
        h = SIGN_Z[1] + 2.2
        r = F.rect_w(SIGN_A - 0.6, SIGN_ARM[0] - 0.6, SIGN_A + 0.6, sign_geom(kind)[2])
    elif part == 'pole':
        h = WALK_H + 14.6
        r = F.rect_w(-7.0, WALK_B - 2.4, -5.0, WALK_B - 0.4)
    elif part == 'yard':
        h = 4.0 * UY
        r = F.rect_w(-LOT_A, -LOT_B, LOT_A, sp['bk'])
    x0, z0, x1, z1 = r
    return [round(x0 / U, 2), round(z0 / U, 2), round(x1 / U, 2), round(z1 / U, 2), round(h / UY, 2)]


def door_spot(kind):
    """Where the delivery spot is (on the boardwalk in front of the door), u from the anchor."""
    F = Frame(facing(kind))
    a = 0.0 if kind not in ('feed', 'livery') else (-4.0 if kind == 'feed' else 0.0)
    if SPECS[kind]['row'] == 'e':
        a = 0.0
    X, Y = F.w(a, LOT_B + 4.0)
    return [round(X / U, 2), round(Y / U, 2)]


def shadow_rect(kind):
    """A ground rectangle (MU, the frame's world axes) that catches the building's cast shadow."""
    F = Frame(facing(kind))
    x0, y0, x1, y1 = F.rect_w(-LOT_A - 40, -LOT_B - 30, LOT_A + 40, WALK_B + 30)
    return (x0, y0, x1, y1)


# ============================ church, school, houses ============================

def pyramid(xc, yc, z0, z1, r, ramp, o, step=0.67):
    n = max(1, int((z1 - z0) / step))
    for k in range(n):
        rr = r * (1 - k / n) + 0.2
        box(xc - rr, yc - rr, z0 + k * step, xc + rr, yc + rr, z0 + (k + 1) * step, ramp, shades=(1, 1, 3), oid=o)


def church():
    """10 x 16u, walls 5.5u, a square tower at the front (+z) with a belfry and a spire to 16u. White clapboard."""
    F = Frame('s')
    o = new_oid(True)
    A, B = 20.0, 32.0
    wh = 5.5 * UY
    def walls(lf, u, z, a, b, idx, lit):
        p = Paint('cream', u, z, idx, lit)
        p.clapboard(2.0, 0.6)
        if lf == 's':
            for bc in (-22.0, -10.0, 2.0, 14.0):
                g = (np.abs(b - bc) < 1.8) & (z > 6.0) & (z < 20.0)
                arch = (np.abs(b - bc) < 1.8) & (z >= 20.0) & ((b - bc) ** 2 + (z - 20.0) ** 2 * 1.4 < 3.3)
                g = g | arch
                fr = ((np.abs(b - bc) < 2.4) & (z > 5.3) & (z < 22.4)) & ~g
                p.fill(fr, 'green', 1 + lit)
                p.fill(g, 'glass', np.where(z > 18.0, 2, 3))
                p.fill(g & (np.abs(b - bc) < 0.3), 'green', 1 + lit)
        if lf == 'f':
            for ac in (-12.0, 12.0):
                g = (np.abs(a - ac) < 1.6) & (z > 8.0) & (z < 19.0)
                p.fill(((np.abs(a - ac) < 2.2) & (z > 7.3) & (z < 19.7)) & ~g, 'green', 1 + lit)
                p.fill(g, 'glass', 3)
        return p.rr, p.ii
    tag('walls')
    F.box(-A, -B, 0, A, B - 6.0, wh, 'cream', paint=walls, oid=o, shades=(0, 0, 1))
    tag('gable')
    F.roof_depth(-B - 1.4, B - 6.0, 0.0, A + 1.8, wh - 0.4, wh + 15.0, 'roof', wall='cream', oid=o, tex=shingle_tex(),
                 endtex=lambda f, X, Y, Z, i: (np.full(X.shape, R('cream')), np.where(np.mod(Z, 2.0) < 0.6, 1, 0)))
    # the tower
    T = 7.0
    tb = B - 6.0
    def tower(lf, u, z, a, b, idx, lit):
        p = Paint('cream', u, z, idx, lit)
        p.clapboard(2.0, 0.6)
        if lf == 'f':
            p.door(-3.0, 3.0, DOOR_H + 1.0, ramp='wood', trim='green', double=True)
            arch = (np.abs(a) < 3.0) & (z >= DOOR_H + 1.0) & (a ** 2 + (z - DOOR_H - 1.0) ** 2 * 2 < 9.5)
            p.fill(arch, 'glass', 3)
            g = (np.abs(a) < 1.4) & (z > 24.0) & (z < 30.0)
            p.fill(g, 'glass', 3)
            p.fill(((np.abs(a) < 2.0) & (z > 23.3) & (z < 30.7)) & ~g, 'green', 1 + lit)
            door_lamp(p, p.u, z, 4.6)          # beside the door (painted in u, like the door)
        if lf == 's':
            g = (np.abs(b - tb - T) < 1.2) & (z > 24.0) & (z < 30.0)
            p.fill(g, 'glass', 3)
        return p.rr, p.ii
    tag('walls')
    F.box(-T, tb - 2.0, 0, T, tb + 2 * T - 2.0, 7.4 * UY, 'cream', paint=tower, oid=o, shades=(0, 0, 1))
    tag('roof')
    zb = 7.4 * UY
    F.box(-T - 0.8, tb - 2.8, zb, T + 0.8, tb + 2 * T - 1.2, zb + 1.0, 'green', shades=(0, 1, 2), oid=o)
    # the open belfry: four corner posts, louvers, the bell inside
    def louv(lf, u, z, a, b, idx, lit):
        p = Paint('cream', u, z, idx, lit)
        h = a if lf == 'f' else b
        op = (np.abs(h - (0 if lf == 'f' else tb + T - 2.0)) < 4.2) & (z > zb + 2.0) & (z < zb + 11.0)
        p.fill(op, 'dark', np.where(np.mod(z, 1.6) < 0.7, 1, 2))
        return p.rr, p.ii
    F.box(-T + 0.6, tb - 1.4, zb + 1.0, T - 0.6, tb + 2 * T - 2.6, zb + 13.0, 'cream', paint=louv, oid=o, shades=(0, 0, 1))
    F.box(-T - 0.6, tb - 2.6, zb + 13.0, T + 0.6, tb + 2 * T - 1.4, zb + 14.0, 'green', shades=(0, 1, 2), oid=o)
    X, Y = F.w(0.0, tb + T - 2.0)
    pyramid(X, Y, zb + 14.0, 16.0 * UY - 2.0, T + 0.2, 'roof', o)
    box(X - 0.25, Y - 0.25, 16.0 * UY - 2.0, X + 0.25, Y + 0.25, 16.0 * UY + 3.0, 'iron', shades=(1, 2, 3), oid=o)
    box(X - 1.2, Y - 0.25, 16.0 * UY + 0.8, X + 1.2, Y + 0.25, 16.0 * UY + 1.4, 'iron', shades=(1, 2, 3), oid=o)
    # front steps
    tag('back')
    for k in range(3):
        F.box(-5.0 - k * 0.0, tb + 2 * T - 2.0 + k * 1.4, 0, 5.0, tb + 2 * T - 0.6 + k * 1.4, (3 - k) * 1.2, 'rock',
              shades=(0, 1, 2), oid=o)
    tag(None)
    return o


def school():
    """A one-room schoolhouse, 8 x 11u, faded red, gable end and door to the south, a bell cupola."""
    F = Frame('s')
    o = new_oid(True)
    A, B = 16.0, 22.0
    wh = 4.6 * UY
    def walls(lf, u, z, a, b, idx, lit):
        p = Paint('brick', u, z, idx, lit)
        p.clapboard(2.0, 0.6)
        p.ii = np.where(np.mod(z, 2.0) < 0.6, clampi(p.base + 1), p.base)
        if lf == 'f':
            p.door(-2.8, 2.8, DOOR_H, ramp='wood', trim='cream', double=False)
            for ac in (-10.0, 10.0):
                p.window(ac - 2.0, ac + 2.0, 5.0, 15.0, trim='cream', panes=(2, 3), sill=True)
            p.board(-5.0, 5.0, DOOR_H + 2.0, DOOR_H + 7.4, 'cream', 0, frame='cream', fi=2)
            door_lamp(p, p.u, z, 4.4)
        if lf == 's':
            for bc in (-14.0, -5.0, 4.0, 13.0):
                u2 = b
                g = (np.abs(u2 - bc) < 2.0) & (z > 5.0) & (z < 16.0)
                p.fill(((np.abs(u2 - bc) < 2.6) & (z > 4.3) & (z < 16.7)) & ~g, 'cream', 1 + lit)
                p.fill(g, 'glass', np.where(z > 15.0, 2, 3))
                p.fill(g & ((np.abs(u2 - bc) < 0.3) | (np.abs(z - 10.5) < 0.3)), 'cream', 1 + lit)
        return p.rr, p.ii
    tag('walls')
    F.box(-A, -B, 0, A, B, wh, 'brick', paint=walls, oid=o)
    tag('gable')
    F.roof_depth(-B - 1.4, B + 1.4, 0.0, A + 1.8, wh - 0.4, wh + 12.0, 'roof', wall='brick', oid=o, tex=shingle_tex(),
                 endtex=end_clap(2.0, ramp='brick'))
    # bell cupola at the front of the ridge
    tag('roof')
    bc = B - 7.0
    zr = wh + 12.0
    F.box(-2.6, bc - 2.6, zr - 3.0, 2.6, bc + 2.6, zr + 1.0, 'cream', shades=(0, 1, 2), oid=o)
    for (a, b) in ((-2.2, bc - 2.2), (2.2, bc - 2.2), (-2.2, bc + 2.2), (2.2, bc + 2.2)):
        X, Y = F.w(a, b)
        box(X - 0.35, Y - 0.35, zr + 1.0, X + 0.35, Y + 0.35, zr + 7.0, 'cream', shades=(1, 2, 3), oid=o)
    X, Y = F.w(0.0, bc)
    sphere(X, Y, zr + 3.8, 1.5, 'brass', oid=o, sz=1.1)
    pyramid(X, Y, zr + 7.0, zr + 11.0, 3.6, 'roof', o)
    # the porch step and a hand pump (they stay when the school is opened); the flagpole fades with the front
    tag('back')
    F.box(-5.0, B, 0, 5.0, B + 3.0, 1.4, 'wood', paint=planks_top, oid=o)
    X, Y = F.w(12.0, B + 6.0)
    box(X - 0.6, Y - 0.6, 0, X + 0.6, Y + 0.6, 7.0, 'iron', shades=(1, 2, 3), oid=o)
    box(X - 0.3, Y + 0.6, 4.6, X + 0.3, Y + 2.0, 5.4, 'iron', shades=(1, 2, 3), oid=o)
    box(X - 0.3, Y - 3.0, 6.6, X + 0.3, Y - 0.6, 7.2, 'iron', shades=(1, 2, 3), oid=o)
    # a flagpole
    tag('front')
    X, Y = F.w(-14.0, B + 7.0)
    box(X - 0.3, Y - 0.3, 0, X + 0.3, Y + 0.3, 40.0, 'cream', shades=(1, 2, 3), oid=o)
    for k in range(5):
        box(X + 0.3, Y - 0.15, 37.0 - k * 1.0, X + 7.0, Y + 0.15, 38.0 - k * 1.0, 'red' if k % 2 == 0 else 'cream',
            shades=(1, 1, 2), oid=new_oid(True), cast=False)
    box(X + 0.3, Y - 0.15, 35.0, X + 3.0, Y + 0.15, 38.0, 'navy', shades=(1, 1, 2), oid=new_oid(True), cast=False)
    tag(None)
    return o


HOUSES = [
    dict(wall='cream', tex='clap', trim='green', roof='roof', porch='front', chim='brick'),
    dict(wall='wood', tex='log', trim='cream', roof='wood', porch='side', chim='rock'),
    dict(wall='slate', tex='clap', trim='cream', roof='roof', porch='front', chim='brick'),
    dict(wall='straw', tex='batten', trim='brick', roof='iron', porch=None, chim='pipe'),
]


def house(k, facing_='e'):
    """A small house on an 8 x 8u lot (body 6 x 5u), its door toward the back lane: facing 'e' (west houses)
    or 'w' (east houses, seen from behind: a back door, a lean-to and a woodpile)."""
    p_ = HOUSES[k]
    F = Frame(facing_)
    o = new_oid(True)
    A, B = 12.0, 10.0
    wh = 3.4 * UY if k != 2 else 4.2 * UY
    def walls(lf, u, z, a, b, idx, lit):
        p = Paint(p_['wall'], u, z, idx, lit)
        tex_wall(p_['tex'], p, a if lf in 'fk' else b, z, lit)
        tr = p_['trim']
        if lf == 'f':
            p.door(-7.0, -2.0, DOOR_H, ramp='wood', trim=tr)
            p.window(3.0, 7.4, 5.0, 12.0, trim=tr, panes=(2, 2), shutters='green' if k == 0 else None)
        elif lf == 'k':
            p.door(3.0, 7.0, DOOR_H - 1.0, ramp='wood', trim=tr, panels=False)
            p.window(-8.0, -4.0, 6.0, 11.0, trim=tr, panes=(2, 2))
            door_lamp(p, p.u, z, 8.6, zb=DOOR_H - 5.4)
        elif lf == 's':
            g = (np.abs(b) < 1.8) & (z > 6.0) & (z < 12.0)
            p.fill((np.abs(b) < 2.4) & (z > 5.3) & (z < 12.7) & ~g, tr, 1 + lit)
            p.fill(g, 'glass', np.where(z > 11.0, 2, 3))
            p.fill(g & ((np.abs(b) < 0.3) | (np.abs(z - 9.0) < 0.3)), tr, 1 + lit)
        return p.rr, p.ii
    tag('walls')
    F.box(-A, -B, 0, A, B, wh, p_['wall'], paint=walls, oid=o)
    hw = B + 1.8
    endt = end_clap(ramp=p_['wall']) if p_['tex'] == 'clap' else end_batten('y', 2.0, ramp=p_['wall'])
    rt = shingle_tex() if p_['roof'] == 'roof' else roof_tex('tin' if p_['roof'] == 'iron' else 'plank')
    tag('gable')
    F.roof_across(-A - 1.4, A + 1.4, 0.0, hw, wh - 0.4, wh + hw * 0.75, p_['roof'], wall=p_['wall'], oid=o, tex=rt, endtex=endt)
    tag('roof')
    zr = wh + hw * 0.75
    if p_['chim'] == 'pipe':
        X, Y = F.w(-6.0, -3.0)
        cyl_z(X, Y, zr - 4.0, zr + 4.0, 0.7, 'iron', oid=o)
    else:
        F.box(A - 5.0, -1.4, wh + 2.0, A - 2.6, 1.0, zr + 3.0, p_['chim'],
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(z, 1.6) < 0.5, clampi(idx + 1), idx)), oid=o)
    if p_['porch'] == 'front':
        tag('back')
        F.box(-A, B, 0, A, B + 6.0, 1.4, 'wood', paint=planks_top, oid=o)
        zt = 3.2 * UY
        tag('front' if facing_ == 'e' else 'back')     # in the 'w' facing the porch is behind the house
        for a in (-A + 0.6, -0.5, A - 0.6):
            F.box(a - 0.4, B + 5.0, 1.4, a + 0.4, B + 5.8, zt, 'wood', shades=(1, 2, 3), oid=o)
        tag('roof')
        F.box(-A - 0.6, B - 0.4, zt, A + 0.6, B + 6.6, zt + 0.9, p_['roof'] if p_['roof'] != 'roof' else 'roof',
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(a, 2.0) < 0.6, clampi(idx + 1), idx)), oid=o)
        # a rocking chair
        tag('back')
        X, Y = F.w(5.0, B + 2.6)
        box(X - 1.0, Y - 1.0, 1.4, X + 1.0, Y + 1.0, 3.4, 'wood', shades=(1, 2, 3), oid=o)
        box(X - 1.0, Y - 1.0, 3.4, X + 1.0, Y - 0.5, 7.0, 'wood', shades=(1, 2, 3), oid=o) if facing_ == 's' else None
    elif p_['porch'] == 'side':
        tag('back')
        F.box(-A - 5.0, -B, 0, -A, B, 1.2, 'wood', paint=planks_top, oid=o)
        tag('front' if facing_ == 'e' else 'back')
        for b in (-B + 0.6, B - 0.6):
            F.box(-A - 4.6, b - 0.4, 1.2, -A - 3.8, b + 0.4, 3.0 * UY, 'wood', shades=(1, 2, 3), oid=o)
        tag('roof')
        F.box(-A - 5.4, -B - 0.4, 3.0 * UY, -A, B + 0.4, 3.0 * UY + 0.9, 'wood',
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(b, 2.0) < 0.6, clampi(idx + 1), idx)), oid=o)
    # behind (the -b side): a woodpile and a rain barrel; seen for the east houses ('w')
    tag('back')
    _woodpile(F, -9.0, -B - 2.6, 9.0, 3, o)
    rain_barrel(F, 9.0, -B - 2.4, o, h=4.6)
    tag(None)
    return o


def house_box(k, facing_):
    F = Frame(facing_)
    x0, z0, x1, z1 = F.rect_w(-17.0, -14.0, 13.6, 16.6)
    p_ = HOUSES[k]
    return [round(x0 / U, 2), round(z0 / U, 2), round(x1 / U, 2), round(z1 / U, 2), 6.0]


def school_letters():
    F = Frame('s')
    s = 'SCHOOL'
    w = text_width(s) / 2.0
    F.text('f', -w / 2.0, DOOR_H + 6.8, s, 'brick', 2, plane=22.0)
