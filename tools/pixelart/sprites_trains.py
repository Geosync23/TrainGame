# Sprite module: rolling stock, coach and boxcar interiors, steam (owner: A2, vehicles; D27 sizes, plans/d27-tech.md
# 1.2 and 7.2). Drawing code: stock27.py (the D25 drawing, stock.py, is kept for the record and no longer built).
#
# Keys (contract: plans/proto-sprites.md, section "D27: vehicles, interiors, goods and carts"):
#   veh/loco/<hdg>/<f>, veh/loco_freight/<hdg>/<f>          18 x 4 x 6.4 u, 10 headings x 2 frames (wheels, rods)
#   veh/coach/<hdg>, veh/coach_lit/<hdg>                    13 x 4.2 x 5.6 u (lit: windows at night)
#   veh/coach_in/<e|w>/{floor,sill,end}                     the cut-away coach
#   veh/seat/<f>, veh/sidebench/<f>, veh/stove/<f>, veh/cooler, veh/closet, veh/lamp/<f>, veh/rack_bag/<n>
#   veh/boxcar/<hdg>, veh/boxcar_open/<e|w>                 10 x 4 x 5.3 u (open: the south door slid open)
#   veh/boxcar_door/<e|w>/<f>                               the north door through its opening, 4 frames shut > open
#   veh/boxcar_in/<e|w>/{floor,sill}                        the cut-away boxcar
#   veh/flatcar/<hdg>                                       10 x 4 u, deck 1.9 u, stakes
#   fx/smoke/<f>                                            4 frames, a puff growing and fading
import math
import numpy as np
import engine as E
import harness as H
import stock27 as ST
from registry import one

# The ten headings. The game's yaw is atan2(-dz, dx): 0 is east (+x), positive turns north (-z).
# 'w+15' is 15 degrees north of west (yaw 165). Value: (drawn facing d, turn of the drawing in degrees).
HEADINGS = {}
for n in (0, 15, 30):
    for sgn in ((1, -1) if n else (1,)):
        tag = '' if n == 0 else ('+%d' % n if sgn > 0 else '-%d' % n)
        HEADINGS['e' + tag] = (1, sgn * n)
        HEADINGS['w' + tag] = (-1, -sgn * n)
ANCHOR = 'centre of the footprint at y = 0 (rail foot level), on the track centre line'
PART = 'the vehicle centre at y = 0 (draw every part of the cut-away at the vehicle\'s own anchor)'
INSIDE = 'its footprint centre at the floor: draw at the world point (x, floor y, z) given in the layout'
CANVAS = dict(canvas=(460, 340), origin=(230, 220))


def _shadow(length):
    h = length * 2          # MU: half the length (u) x 4
    return (-h - 2, -11, h + 6, 10)


def _render(draw, yaw_deg=0.0, length=13.0, **kw):
    opts = dict(CANVAS); opts.update(kw)
    if 'shadow' not in opts:
        opts['shadow'] = _shadow(length)
    return H.render(draw, yaw=math.radians(yaw_deg), **opts)


def _symmetric(reg, key, draw, length, meta, group='trains', only=None):
    """A car whose two ends look alike: heading w+N is the same picture as e-N (one rectangle)."""
    cache = {}
    for hdg, (d, deg) in HEADINGS.items():
        if only and hdg not in only:
            continue
        if deg not in cache:
            cache[deg] = _render(draw, deg, length)
        reg.add(f'{key}/{hdg}', group, [cache[deg]], meta)


def _u_box(x0, z0, x1, z1, h):
    return [round(x0, 3), round(z0, 3), round(x1, 3), round(z1, 3), round(h, 3)]


def register(reg):
    # ---------------- locomotives
    for look, key in (('passenger', 'veh/loco'), ('freight', 'veh/loco_freight')):
        for hdg, (d, deg) in HEADINGS.items():
            fr = [_render(lambda k=k: ST.loco(d, k * math.pi, look), deg, ST.LOCO_LEN) for k in range(2)]
            reg.add(f'{key}/{hdg}', 'trains', fr,
                    dict(length=ST.LOCO_LEN, anchor=ANCHOR,
                         note='engine (11 u) and tender (7 u) as one vehicle, engine at the front; frames: wheels and '
                              'rods half a turn apart, play 0, 1, 0, 1 while moving',
                         stack_note='extra stack: the stack top (u along the heading from the centre, y), for fx/smoke',
                         extra=dict(stack=[round(d * (ST.TENDER_LEN + 9.15 - 9.0), 2), 6.4])))
    # ---------------- coach, whole
    _symmetric(reg, 'veh/coach', lambda: ST.coach(False), ST.COACH_LEN,
               dict(length=ST.COACH_LEN, anchor=ANCHOR, note='green and cream, clerestory roof, open end platforms '
                    'with railings and steps on both sides; the same picture both ways round'))
    _symmetric(reg, 'veh/coach_lit', lambda: ST.coach(True), ST.COACH_LEN,
               dict(length=ST.COACH_LEN, anchor=ANCHOR, note='the coach at night: lamplit windows'))
    # ---------------- coach, cut away (the train stands straight: e and w only; the shell is the same both ways,
    # the inside parts' places differ: see extra.layout)
    lay = {h: ST.coach_layout(h) for h in ('e', 'w')}
    floor = _render(ST.coach_cut_floor, 0, ST.COACH_LEN)
    sill = _render(ST.coach_cut_sill, 0, ST.COACH_LEN, shadows=False)
    end = _render(ST.coach_cut_end, 0, ST.COACH_LEN, shadow=(20, -12, 34, 12))
    for h in ('e', 'w'):
        reg.add(f'veh/coach_in/{h}/floor', 'trains_in', [floor],
                dict(anchor=PART, note='running gear, floor and aisle runner, the far (north) wall with windows, curtains '
                     'and the luggage rack, the west end wall with its door, the west end platform. Draw first.',
                     extra=dict(box=_u_box(-6.5, -2.1, 6.5, 2.1, ST.EAVES), layout=lay[h])))
        reg.add(f'veh/coach_in/{h}/sill', 'trains_in', [sill],
                dict(anchor=PART, note='the near (south) wall cut to 0.5 u above the floor: draw after the seated people',
                     extra=dict(box=_u_box(-ST.CB, ST.IN_Z, ST.CB, ST.CW, ST.FLOOR + 0.5))))
        reg.add(f'veh/coach_in/{h}/end', 'trains_in', [end],
                dict(anchor=PART, note='the open east end: the end wall cut to the sill (doorway open) and the east end '
                     'platform with railing, steps and brake wheel',
                     extra=dict(box=_u_box(ST.IN_X, -2.1, 6.5, 2.1, 2.7))))
    # inside parts
    for f in ('se', 'nw', 'ne', 'sw'):
        reg.add(f'veh/seat/{f}', 'trains_in', [_render(lambda f=f: ST.seat(f), shadows=False)],
                dict(anchor=INSIDE, note=f'a double walk-over bench, 1.4 u across, for sitters facing {f}; seat top '
                     '0.64 u, back 1.3 u above the floor', extra=dict(box=_bench_box(f, 1.4))))
        reg.add(f'veh/sidebench/{f}', 'trains_in', [_render(lambda f=f: ST.seat(f, side=True), shadows=False)],
                dict(anchor=INSIDE, note=f'a short side bench (one seat, 0.8 u) for a sitter facing {f}',
                     extra=dict(box=_bench_box(f, 0.8))))
    reg.add('veh/stove', 'trains_in', [_render(lambda k=k: ST.stove(k), shadows=False) for k in range(2)],
            dict(anchor=INSIDE, note='cast-iron stove, pipe and wood box; frames: the fire\'s glow (alternate slowly)',
                 extra=dict(box=_u_box(-0.32, -0.32, 0.34, 0.34, 3.35))))
    reg.add('veh/cooler', 'trains_in', [_render(ST.cooler, shadows=False)],
            dict(anchor=INSIDE, note='water cooler on its cabinet', extra=dict(box=_u_box(-0.2, -0.2, 0.2, 0.24, 1.35))))
    reg.add('veh/closet', 'trains_in', [_render(ST.closet, shadows=False)],
            dict(anchor=INSIDE, note='the closet in the corner at the cooler end (extra to the plan\'s list)',
                 extra=dict(box=_u_box(-0.45, -0.7, 0.45, 0.7, 2.62))))
    reg.add('veh/lamp', 'trains_in', [_render(lambda k=k: ST.lamp(bool(k)), shadows=False) for k in range(2)],
            dict(anchor='the lamp\'s bottom: draw at the world point (x, layout lamps y, z)',
                 note='hanging oil lamp: frame 0 unlit (day), 1 lit (night)', extra=dict(box=_u_box(-0.15, -0.15, 0.15, 0.15, 1.2))))
    for n, what in enumerate(('carpetbag', 'hatbox', 'valise')):
        reg.add(f'veh/rack_bag/{n}', 'trains_in', [_render(lambda n=n: ST.rack_bag(n), shadows=False)],
                dict(anchor='its bottom centre: draw on the rack at (x, layout racks y, layout racks z)', note=what))
    # ---------------- boxcar
    _symmetric(reg, 'veh/boxcar', lambda: ST.boxcar(0.0), ST.BOX_LEN,
               dict(length=ST.BOX_LEN, anchor=ANCHOR, note='ochre, outside-braced, sliding doors centred on both sides'))
    _symmetric(reg, 'veh/boxcar_open', lambda: ST.boxcar(1.0), ST.BOX_LEN,
               dict(length=ST.BOX_LEN, anchor=ANCHOR, note='the south (near) door slid open; e and w only (D25 key kept)'),
               only=('e', 'w'))
    bfloor = _render(ST.boxcar_cut_floor, 0, ST.BOX_LEN)
    bsill = _render(ST.boxcar_cut_sill, 0, ST.BOX_LEN, shadows=False)
    doors = [_render(lambda k=k: ST.boxcar_door(k / 3.0), 0, ST.BOX_LEN, shadows=False) for k in range(4)]
    for h in ('e', 'w'):
        reg.add(f'veh/boxcar_in/{h}/floor', 'trains_in', [bfloor],
                dict(anchor=PART, note='running gear, floor, the far (north) wall\'s inside with its framing and the door '
                     'opening left clear (the cargo platform shows through), the west end wall. Draw first, then '
                     'veh/boxcar_door, then the goods inside and the people, then the sill.',
                     extra=dict(box=_u_box(-5.0, -2.0, 5.0, 2.0, ST.B_EAVES), layout=ST.boxcar_layout())))
        reg.add(f'veh/boxcar_in/{h}/sill', 'trains_in', [bsill],
                dict(anchor=PART, note='the south wall and the east end wall cut to 0.5 u above the floor',
                     extra=dict(box=_u_box(-ST.BX, ST.BIN_Z, ST.BX, ST.BZ, ST.FLOOR + 0.5))))
        reg.add(f'veh/boxcar_door/{h}', 'trains_in', doors,
                dict(anchor=PART, note='the north door seen from inside through the opening: frames 0 shut, 1 and 2 '
                     'sliding, 3 open (frame = round(open * 3)); draw right after the floor',
                     extra=dict(box=_u_box(-1.4, -2.15, 1.4, -2.0, ST.FLOOR + 3.0))))
    # ---------------- flatcar
    _symmetric(reg, 'veh/flatcar', ST.flatcar, ST.BOX_LEN,
               dict(length=10.0, anchor=ANCHOR, note='deck top 1.9 u; stakes 1.2 u high', extra=dict(len=10.0, w=4.0, deck=1.9)))
    # ---------------- steam
    puffs = []
    for k, r in enumerate((0.55, 0.9, 1.2, 1.45)):
        img, an = H.render(lambda r=r, k=k: ST.smoke(r, k + 3), outline=False, shadows=False)
        if k >= 2:
            yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
            keep = ((xx - an[0] + yy - an[1]) % 2 == 0) if k == 2 else (((xx - an[0]) % 2 == 0) & ((yy - an[1]) % 2 == 0))
            img = img.copy(); img[~keep] = 0
        puffs.append((img, an))
    reg.add('fx/smoke', 'trains', puffs, dict(anchor='centre of the puff'))


def _bench_box(f, span):
    hs = span / 2
    if f in ('se', 'nw'):
        return _u_box(-0.4, -hs, 0.4, hs, 1.32)
    return _u_box(-hs, -0.4, hs, 0.4, 1.32)
