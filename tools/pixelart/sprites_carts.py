# Sprite module: the D27 platform cart (cart27) and the hand truck (truck) (owner: A2; plans/d27-tech.md 1.5, 7.2).
# Drawing code: goods27.py. Keys:
#   cart27/<dir>/<f>       the four-wheel station cart, empty bed, 2 frames (wheels turning); cart27/<dir> = frame 0
#   cart27/<dir>/loaded    a full evening load drawn in (for previews and menus; the game draws goods by cell)
#   truck/<dir>/<upright|tilt>   the two-wheel hand truck standing on its nose plate, or tipped back for wheeling
# <dir>: the way it travels (se +x, ne -z, nw -x, sw +z); the pusher walks behind it.
import math
import numpy as np
import harness as H
import goods27 as G
from geom27 import proj_px

DIRS = ('se', 'ne', 'nw', 'sw')
YAW = {'se': 0.0, 'ne': 90.0, 'nw': 180.0, 'sw': -90.0}
CAN = dict(canvas=(220, 200), origin=(110, 120))


def _r(draw, yaw, shadow=None, **kw):
    opts = dict(CAN); opts.update(kw)
    if shadow:
        opts['shadow'] = shadow
    else:
        opts['shadows'] = False
    return H.render(draw, yaw=math.radians(yaw), **opts)


def world(a, b, d):
    """The cart's own (a forwards, b across) to world (x, z) for facing d."""
    t = math.radians(YAW[d])
    return a * math.cos(t) + b * math.sin(t), -a * math.sin(t) + b * math.cos(t)


def _uv(v):
    return [round(float(v[0]), 3), round(float(v[1]), 3)]


def register(reg):
    for d in DIRS:
        sh = (-(G.CART_L / 2 + 0.7) * 4, -G.CART_W * 4, (G.CART_L / 2 + 0.9) * 4, G.CART_W * 4)
        fr = [_r(lambda p=p: G.platform_cart(p * math.pi / 6), YAW[d], shadow=sh) for p in range(2)]
        cells = []
        for c, r, a, b in G.cart_cells():
            x, z = world(a, b, d)
            px = proj_px(x, z, G.CART_TOP)
            cells.append(dict(c=c, r=r, x=round(x, 3), z=round(z, 3), px=[round(px[0]), round(px[1])]))
        extra = dict(
            bedTop=G.CART_TOP, cells=cells,
            cells_note='4 x 2 cells of 0.8 u (D31; the D27 integration had 5 x 4): c 0..3 from the handle end to the front, r 0..1 across; x, z in u from '
                       'the anchor; px the cell centre on the bed top. A second layer sits on the goods below '
                       '(their height); long goods take 2 or 4 cells along c (lumber overhangs the front)',
            pusher=_uv(world(-G.CART_L / 2 - 0.8, 0, d)), grip=_uv(world(-G.CART_L / 2 - 0.4, 0, d)) + [1.03])
        notes = dict(cells_note=extra.pop('cells_note'),
                     pusher_note='where the agent\'s feet go to push it (u from the anchor) and the grip bar (x, z, y)')
        reg.add(f'cart27/{d}', 'carts', fr,
                dict(anchor='the cart\'s centre at the ground', note='frames: the wheels a twelfth of a turn apart; '
                     'play 0, 1 while it moves (about one frame per 0.25 u); extra data on cart27/<dir>'))
        reg.add(f'cart27/{d}', 'carts', fr[:1], dict(anchor='the cart\'s centre at the ground', note='= frame 0',
                                                    extra=extra, **notes),
                indexed=False)
        reg.add(f'cart27/{d}/loaded', 'carts', [_loaded(d, fr[0])],
                dict(anchor='the cart\'s centre at the ground', note='a full load for previews: crates, sacks, a keg, '
                     'a barrel lying, the mail; the game draws its goods cell by cell'))
    for d in DIRS:
        for st in ('upright', 'tilt'):
            img = _r(lambda t=(st == 'tilt'): G.hand_truck(t), YAW[d], shadow=(-6, -6, 8, 6))
            tilt = st == 'tilt'
            T = G.Tilted(G.TRUCK_TILT if tilt else 0.0)
            grip = T.pt(0.0, 0.0, 1.85)
            stand = -1.75 if tilt else -0.6
            reg.add(f'truck/{d}/{st}', 'carts', [img],
                    dict(anchor='the axle\'s point on the ground',
                         note='hand truck 1.0 x 0.8 u, 1.9 u tall, nose plate 0.6 u' + (', tipped back 55 degrees' if tilt else ''),
                         extra=dict(grip=_uv(world(float(grip[0]), 0, d)) + [round(float(grip[2]), 3)],
                                    pusher=_uv(world(stand, 0, d)),
                                    nose=_uv(world(0.3, 0, d))),
                         extra_note=('grip: the handles (x, z, y u from the anchor); pusher: the agent\'s feet; '
                                         'nose: where a good stands on the plate when upright (draw goods/<kind> '
                                         'there); tilted, draw goods/<kind>/truck/<dir> at the anchor')))


def _loaded(d, base):
    """The cart frame with goods pasted on its cells (2D, from separately drawn goods), for previews."""
    img, (ax, ay) = base
    pad = 40
    canvas = np.zeros((img.shape[0] + 2 * pad, img.shape[1] + 2 * pad, 4), np.uint8)
    canvas[pad:pad + img.shape[0], pad:pad + img.shape[1]] = img
    ox, oy = ax + pad, ay + pad
    load = [(3, 0, 'crate', 0), (3, 1, 'crate', 0), (2, 0, 'sack', 1), (2, 1, 'keg', 0), (1, 0, 'mailSack', 0),
            (1, 1, 'crate', 0), (0, 0, 'paper', 0), (0, 1, 'strongbox', 0), (3, 0, 'crate', 1), (3, 1, 'crate', 1),
            (1, 1, 'crate', 1)]
    items = []
    for c, r, kind, layer in load:
        a, b = -0.4 * G.CART_COLS + 0.8 * (c + 0.5), -G.CART_W / 2 + 0.8 * (r + 0.5)
        x, z = world(a, b, d)
        y = G.CART_TOP + (G.SIZE['crate'][2] if layer else 0)
        yaw = YAW[d] + (90 if kind == 'sack' else 0)
        gi = H.render(lambda k=kind: G.good(k), yaw=math.radians(yaw), shadows=False, canvas=(120, 120), origin=(60, 80))
        items.append((layer, x + z, x, z, y, gi))
    for layer, depth, x, z, y, (gimg, (gx, gy)) in sorted(items, key=lambda t: (t[0], t[1])):
        px, py = proj_px(x, z, y)
        sx, sy = int(round(ox + px - gx)), int(round(oy + py - gy))
        m = gimg[..., 3] > 0
        h, w = gimg.shape[:2]
        canvas[sy:sy + h, sx:sx + w][m] = gimg[m]
    a = canvas[..., 3] > 0
    ys, xs = np.nonzero(a)
    r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return canvas[r0:r1, c0:c1].copy(), (ox - c0, oy - r0)
