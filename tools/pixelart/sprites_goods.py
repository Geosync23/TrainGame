# Sprite module: the D27 goods in every handling state, and the shop tags (owner: A2; plans/d27-tech.md 4.1 and 7.2).
# Drawing code: goods27.py. Keys (all documented in plans/proto-sprites.md, section D27):
#   goods/<kind>                     resting, its length along x (anchor: centre of the bottom face)
#   goods/<kind>/z                   resting, turned to lie along z (every kind that is not round)
#   goods/<kind>/<variant>[/z]       prints and labels: crate dry|tins|linen, sack flour|seed|grain|ore, keg
#                                    beer|empty, barrel whiskey|nails
#   goods/<kind>/held/<dir>          in its handling verb's held state, per facing of the agent (see VERB)
#   goods/barrel/roll/<dir>/<f>, goods/wheel/roll/<dir>/<f>   rolling, 4 frames
#   goods/barrel/tip/<dir>/<f>       tipping from upright towards the facing: 2 frames (30, 60 degrees)
#   goods/barrel/side/<x|z>, goods/keg/side/<x|z>             lying on the side
#   goods/<kind>/truck/<dir>         on the tilted hand truck (crate pair, barrel, bale, stove, furniture, piano)
#   tag/<shop>, tag/out, tag/any     5 x 5 marks; tag/board/<shop|out> 10 x 8 row boards for the storage area
#   goods/<kind>/carried, goods/longBundle   D25 keys kept for the prototype's old flows
import math
import numpy as np
import engine as E
import harness as H
import goods27 as G
from geom27 import proj_px, colour

DIRS = ('se', 'ne', 'nw', 'sw')
YAW = {'se': 0.0, 'ne': 90.0, 'nw': 180.0, 'sw': -90.0}       # the drawing's +x turned to the facing
CAN = dict(canvas=(220, 200), origin=(110, 130))
REST = 'centre of the bottom face, at the surface it rests on'


def _r(draw, yaw=0.0, shadow=True, size=None, **kw):
    opts = dict(CAN); opts.update(kw)
    if shadow and size is not None:
        L, D, Hh = size
        L = max(L, D)
        opts['shadow'] = (-(L / 2 + 0.25) * 4, -(L / 2 + 0.25) * 4, (L / 2 + 0.9) * 4, (L / 2 + 0.25) * 4)
    else:
        opts['shadows'] = False
    return H.render(draw, yaw=math.radians(yaw), **opts)


def _tag_at(kind, along_z=False):
    L, D, Hh = G.SIZE[kind]
    if kind in G.ROUND:
        y = Hh if kind != 'wheel' else 0.2
        dz = L / 2 * 0.7
        return list(map(round, proj_px(0, dz, y)))
    dz = (L if along_z else D) / 2
    return list(map(round, proj_px(0, dz, Hh)))


HELD_NOTE = {
    'carry': 'in the arms: anchor its bottom centre at the agent\'s hands (ppl/agent/carry extra hands; A1\'s lift '
             'frames give the same); long side across the body',
    'shoulder': 'on the shoulder: anchor its bottom centre at A1\'s shoulder offset (extra shoulder of '
                'ppl/agent/shoulder/...); lies along the facing',
    'drag': 'dragged: the end at the hands lifted 0.85 u, the far end on the ground ahead. Anchor: the ground point '
            'under the lifted end; put it 0.35 u ahead of the agent\'s feet (extra ahead)',
    'roll': 'rolled: the barrel on its side across the way, the wheel upright. Anchor: the ground contact point, '
            '0.55 u ahead of the agent\'s feet (extra ahead); the roll frames animate it',
    'heave': 'heaved: tipped up at the agent\'s end. Anchor: the near bottom edge\'s ground point, 0.3 u ahead '
             '(extra ahead)',
    'truck': 'on the hand truck: the same picture as goods/<kind>/truck/<dir> (anchor: the truck\'s axle)',
}
AHEAD = {'drag': 0.35, 'roll': 0.55, 'heave': 0.3}


def register(reg):
    # ---------------- resting, with variants
    for kind in G.KINDS:
        sz = G.SIZE[kind]
        img = _r(lambda k=kind: G.good(k), size=sz)
        meta = dict(anchor=REST, size=list(sz), verb=G.VERB[kind],
                    extra=dict(tag_at=_tag_at(kind)))
        reg.add(f'goods/{kind}', 'goods', [img], meta)
        if kind not in G.ROUND:
            reg.add(f'goods/{kind}/z', 'goods', [_r(lambda k=kind: G.good(k), 90.0, size=sz)],
                    dict(anchor=REST, note='lying along z', extra=dict(tag_at=_tag_at(kind, True))))
        for v in G.VARIANTS.get(kind, ()):
            reg.add(f'goods/{kind}/{v}', 'goods', [_r(lambda k=kind, v=v: G.good(k, v), size=sz)],
                    dict(anchor=REST, variant=v, extra=dict(tag_at=_tag_at(kind))))
            if kind not in G.ROUND:
                reg.add(f'goods/{kind}/{v}/z', 'goods', [_r(lambda k=kind, v=v: G.good(k, v), 90.0, size=sz)],
                        dict(anchor=REST, variant=v, note='lying along z', extra=dict(tag_at=_tag_at(kind, True))))
    # ---------------- held, per facing
    truck_kinds = ('crate', 'barrel', 'bale', 'stove', 'furniture', 'piano')
    truck_imgs = {}
    for kind in truck_kinds:
        for d in DIRS:
            truck_imgs[(kind, d)] = _r(lambda k=kind: G.truck_load(k), YAW[d], shadow=False)
            reg.add(f'goods/{kind}/truck/{d}', 'goods', [truck_imgs[(kind, d)]],
                    dict(anchor='the hand truck\'s axle at the ground (the same point as truck/<dir>/tilt): draw '
                         'right after the truck', note='the good on the tilted hand truck'))
    for kind in G.KINDS:
        verb = G.VERB[kind]
        if kind == 'bale':
            verb = 'drag'
        cache = {}
        for d in DIRS:
            if verb == 'carry':
                y = 90.0 if d in ('se', 'nw') else 0.0
                key = ('carry', y)
                if key not in cache:
                    cache[key] = _r(lambda k=kind: G.held_carry(k), y, shadow=False)
            elif verb == 'shoulder':
                y = 0.0 if d in ('se', 'nw') else 90.0
                key = ('sh', y)
                if key not in cache:
                    cache[key] = _r(lambda k=kind: G.held_shoulder(k), y, shadow=False)
            elif verb == 'drag':
                key = d
                cache[key] = _r(lambda k=kind: G.drag(k), YAW[d], shadow=True, size=(G.SIZE[kind][0] * 2, 1, 1))
            elif verb == 'roll':
                key = d
                cache[key] = _r(lambda k=kind: G.rolling(k, 0.0), YAW[d], shadow=False)
            elif verb == 'heave':
                key = d
                cache[key] = _r(lambda k=kind: G.heave(k), YAW[d], shadow=False)
            else:   # truck
                key = d
                cache[key] = truck_imgs[(kind, d)]
            meta = dict(anchor=HELD_NOTE[verb], verb=verb)
            if verb in AHEAD:
                meta['extra'] = dict(ahead=AHEAD[verb])
            reg.add(f'goods/{kind}/held/{d}', 'goods', [cache[key]], meta)
    # ---------------- rolling, tipping, lying
    for kind, nf in (('barrel', 4), ('wheel', 4)):
        for d in DIRS:
            step = (math.pi / 2) if kind == 'barrel' else (2 * math.pi / 12 / nf)
            fr = [_r(lambda k=kind, p=p: G.rolling(k, p * step), YAW[d], shadow=False) for p in range(nf)]
            reg.add(f'goods/{kind}/roll/{d}', 'goods', fr,
                    dict(anchor='the ground contact point', note=f'rolling towards {d}: play 0..3 while it moves '
                         '(the barrel a quarter turn a frame, about one frame per 0.33 u; the wheel a 48th turn); '
                         'put it 0.55 u ahead of the agent\'s feet'))
    for d in DIRS:
        fr = [_r(lambda a=a: G.tipping('barrel', a), YAW[d], shadow=False) for a in (30, 60)]
        reg.add(f'goods/barrel/tip/{d}', 'goods', fr,
                dict(anchor='the barrel\'s foot (where it stood upright)', note='tipping towards the facing: '
                     'goods/barrel, tip 0, tip 1, then goods/barrel/roll (and backwards to stand it up)'))
    for kind in ('barrel', 'keg'):
        for ax, y in (('x', 0.0), ('z', 90.0)):
            reg.add(f'goods/{kind}/side/{ax}', 'goods', [_r(lambda k=kind: G.lying(k), y, size=G.SIZE[kind])],
                    dict(anchor='centre of its footprint at the ground', note=f'lying on its side, its axis along {ax} '
                         '(2 deep in a cart cell, or stowed in a car)'))
    # ---------------- D25 keys kept (the prototype's old flows read them)
    for kind in ('crate', 'sack', 'barrel'):
        img = _r(lambda k=kind: G.held_carry(k), 90.0, shadow=False) if kind != 'barrel' else \
            _r(lambda: G.good('barrel'), 0.0, shadow=False)
        reg.add(f'goods/{kind}/carried', 'goods', [img], dict(anchor='D25: centre of the bottom face at the hands'))
    reg.add('goods/longBundle', 'goods', [_r(lambda: G.good('lumber'), size=G.SIZE['lumber'])],
            dict(anchor=REST, note='D25 key: the lumber bundle'))
    # ---------------- tags and row boards
    for name in TAGS:
        reg.add(f'tag/{name}', 'goods', [tag_sprite(name)], dict(anchor='centre', note=TAGS[name][0]))
        reg.add(f'tag/board/{name}', 'goods', [board_sprite(name)],
                dict(anchor='the foot of its post (stuck in the storage row\'s end)', note='row board: ' + TAGS[name][0]))
    reg.add('tag/any', 'goods', [tag_sprite('any', TAG_ANY)], dict(anchor='centre', note='any shop'))


# 5 x 5 marks: '#' outline (the ramp's darkest), 'o' fill, 'x' the second colour, '.' clear.
TAGS = {
    'store':      ('General Store', 'green', 1, None, ['.###.', '#ooo#', '#o.o#', '#ooo#', '.###.']),
    'hotel':      ('Hotel', 'plum', 0, None, ['..#..', '.#o#.', '#ooo#', '#o.o#', '#####']),
    'bank':       ('Bank', 'brass', 1, None, ['.###.', '#ooo#', '#o#o#', '#ooo#', '.###.']),
    'smithy':     ('Blacksmith', 'navy', 0, None, ['#####', '#ooo#', '.#o#.', '.#o#.', '.###.']),
    'livery':     ('Livery stable', 'ochre', 0, None, ['#...#', '#o.o#', '#o.o#', '#ooo#', '.###.']),
    'feed':       ('Feed and seed', 'grass', 1, None, ['.#.#.', '.###.', '#ooo#', '#ooo#', '.###.']),
    'saloon':     ('Saloon', 'red', 1, None, ['.###.', '#ooo#', '#ooo#', '.#o#.', '.###.']),
    'newspaper':  ('Newspaper', 'iron', 0, None, ['#####', '#ooo#', '#.#.#', '#ooo#', '#####']),
    'barber':     ('Barber', 'red', 1, ('cream', 0), ['.###.', '#oxo#', '#xox#', '#oxo#', '.###.']),
    'undertaker': ('Undertaker', 'blk', 0, None, ['.###.', '#ooo#', '#ooo#', '.#o#.', '..#..']),
    'assay':      ('Assay office', 'dirt', 0, None, ['.....', '..#..', '.#o#.', '#ooo#', '#####']),
    'school':     ('School', 'red', 0, None, ['..#..', '.#o#.', '.#o#.', '#ooo#', '..#..']),
    'out':        ('Out: for the railroad', 'ochre', 0, None, ['..#..', '.#o#.', '#ooo#', '.#o#.', '..#..']),
}
TAG_ANY = ('Any', 'cream', 0, None, ['#####', '#ooo#', '#ooo#', '#ooo#', '#####'])


def _ink(ramp):
    rid = E.R(ramp)
    return E.PAL[rid, E.RLEN[rid] - 1]


def _mark(spec):
    _, ramp, ii, second, rows = spec
    img = np.zeros((5, 5, 4), np.uint8)
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch == '#':
                img[r, c, :3] = _ink(ramp) if ramp not in ('blk', 'iron') else colour('iron', 3); img[r, c, 3] = 255
            elif ch == 'o':
                img[r, c, :3] = colour(ramp, ii); img[r, c, 3] = 255
            elif ch == 'x':
                img[r, c, :3] = colour(*second); img[r, c, 3] = 255
    if ramp == 'blk':          # the undertaker's mark: a dark coffin with a light rim, so it reads on dark wood
        for r, line in enumerate(rows):
            for c, ch in enumerate(line):
                if ch == '#':
                    img[r, c, :3] = colour('iron', 1)
                elif ch == 'o':
                    img[r, c, :3] = colour('iron', 3)
    return img


def tag_sprite(name, spec=None):
    return _mark(spec or TAGS[name]), (2, 2)


def board_sprite(name):
    """A row board for the storage area: a painted board 10 x 6 on a short post, the shop's mark on a light panel
    and a stripe of its colour. Anchor: the post's foot."""
    spec = TAGS[name]
    img = np.zeros((8, 10, 4), np.uint8)
    edge = colour('wood', 4); face = colour('cream', 1); post = colour('wood', 3)
    img[0:7, 0:10, :3] = face; img[0:7, 0:10, 3] = 255
    img[0, :, :3] = edge; img[6, :, :3] = edge; img[0:7, 0, :3] = edge; img[0:7, 9, :3] = edge
    img[1:6, 7:9, :3] = colour(spec[1], spec[2]) if spec[1] != 'blk' else colour('iron', 3)
    m = _mark(spec)
    a = m[..., 3] > 0
    img[1:6, 1:6][a] = m[a]
    img[7, 4:6, :3] = post; img[7, 4:6, 3] = 255
    return img, (5, 8)
