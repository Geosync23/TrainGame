#!/usr/bin/env python3
# Review sheets for the D32 stage 3 rooms art (furniture and the townsfolk's new frames), drawn straight from the
# modules (no build needed), written to plans/pixel/d32/rooms/:
#     python3 tools/pixelart/review_rooms.py [furn|people|scenes|all]
#   rooms-furniture.png   every furniture key, each facing, on a plank floor, with a man standing beside it for scale,
#                         red dots on the anchors, yellow dots on the use spots
#   rooms-people-*.png    the new roles and every townsfolk kind's work, sit and lie frames
#   rooms-scenes.png      mock rooms: store, home, saloon, school, smithy, bank, jail, hotel, with people in them
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import font as FT

DST = os.path.join(HERE, 'out', 'review-rooms')
INK = (43, 32, 38, 255)
PAPER = (240, 228, 200, 255)


class Reg:
    def __init__(self):
        self.f = {}
        self.extra = {}

    def add(self, key, group, frames, meta=None, indexed=None):
        if indexed is None:
            indexed = len(frames) > 1
        ex = (meta or {}).get('extra')
        if indexed:
            for i, fr in enumerate(frames):
                self.f[f'{key}/{i}'] = fr
                if ex is not None:
                    self.extra[f'{key}/{i}'] = ex
        else:
            self.f[key] = frames[0]
            if ex is not None:
                self.extra[key] = ex


def load(mods):
    reg = Reg()
    for m in mods:
        mod = __import__(m)
        mod.register(reg)
    return reg


def blit(dst, img, x, y):
    h, w = img.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = img[y0 - y:y1 - y, x0 - x:x1 - x]
    m = s[..., 3] > 0
    dst[y0:y1, x0:x1][m] = s[m]


def draw(dst, reg, key, sx, sy, dy=0):
    if key not in reg.f:
        print('missing', key)
        return
    img, (ax, ay) = reg.f[key]
    blit(dst, img, int(round(sx)) - ax, int(round(sy)) - ay - dy)


def label(dst, text, x, y, col=INK):
    blit(dst, FT.text_image(text, col), x, y)


def canvas(w, h, col=PAPER):
    c = np.zeros((h, w, 4), np.uint8)
    c[:] = col
    return c


def proj(x, z, y=0.0):
    return 8 * (x - z), 4 * (x + z) - 8 * y


FLOOR = [(176, 132, 92), (160, 118, 82), (146, 106, 74)]


def floor(dst, ox, oy, x0, z0, x1, z1):
    """A plank floor (boards along x) over the cells x0..x1, z0..z1 (u), drawn per pixel."""
    H, W = dst.shape[:2]
    for py in range(H):
        for px in range(W):
            u = (px + 0.5 - ox) / 8.0; v = (py + 0.5 - oy) / 4.0
            x = (u + v) / 2; z = (v - u) / 2
            if x0 <= x < x1 and z0 <= z < z1:
                seam = (z * 3) % 1.0 < 0.17
                joint = ((x + 0.7 * int(z * 3)) % 2.3) < 0.08
                k = 2 if seam or joint else (1 if int(z * 3) % 3 == 1 else 0)
                dst[py, px, :3] = FLOOR[k]


def floor_fast(dst, ox, oy, x0, z0, x1, z1):
    H, W = dst.shape[:2]
    py, px = np.mgrid[0:H, 0:W]
    u = (px + 0.5 - ox) / 8.0; v = (py + 0.5 - oy) / 4.0
    x = (u + v) / 2; z = (v - u) / 2
    inside = (x >= x0) & (x < x1) & (z >= z0) & (z < z1)
    seam = np.mod(z * 3, 1.0) < 0.17
    joint = np.mod(x + 0.7 * np.floor(z * 3), 2.3) < 0.08
    k = np.where(seam | joint, 2, np.where(np.floor(z * 3) % 3 == 1, 1, 0))
    cols = np.array(FLOOR, np.uint8)
    dst[inside, :3] = cols[k[inside]]


def walls(dst, ox, oy, x0, z0, x1, z1, hgt=4.0):
    """The two back walls (north at z0, west at x0) from inside, plain plaster and a wainscot, for the scenes."""
    H, W = dst.shape[:2]
    py, px = np.mgrid[0:H, 0:W]
    # north wall: points (x, z0, y): px = ox + 8(x - z0), py = oy + 4(x + z0) - 8y
    x = (px + 0.5 - ox) / 8.0 + z0
    y = (oy + 4 * (x + z0) - (py + 0.5)) / 8.0
    m = (x >= x0) & (x < x1) & (y >= 0) & (y < hgt)
    col = np.where((y < 1.1)[..., None], np.array([120, 88, 64]), np.array([206, 190, 160]))
    col = np.where(((y < 1.1) & (np.mod(x, 0.5) < 0.08))[..., None], np.array([100, 72, 54]), col)
    dst[m, :3] = col[m]
    # west wall: points (x0, z, y): px = ox + 8(x0 - z), py = oy + 4(x0 + z) - 8y  (in shade)
    z = x0 - (px + 0.5 - ox) / 8.0
    y = (oy + 4 * (x0 + z) - (py + 0.5)) / 8.0
    m = (z >= z0) & (z < z1) & (y >= 0) & (y < hgt)
    col = np.where((y < 1.1)[..., None], np.array([98, 72, 54]), np.array([176, 160, 134]))
    col = np.where(((y < 1.1) & (np.mod(z, 0.5) < 0.08))[..., None], np.array([82, 60, 46]), col)
    dst[m, :3] = col[m]


def dot(dst, x, y, col):
    x, y = int(round(x)), int(round(y))
    if 0 <= y < dst.shape[0] and 0 <= x < dst.shape[1]:
        dst[y, x] = col


def save(img, name, scale=3):
    os.makedirs(DST, exist_ok=True)
    im = Image.fromarray(img)
    if scale != 1:
        im = im.resize((im.size[0] * scale, im.size[1] * scale), Image.NEAREST)
    p = os.path.join(DST, name)
    im.save(p)
    print('wrote', os.path.relpath(p))


# ---------------------------------------------------------------- furniture sheet
def furn_sheet():
    reg = load(['sprites_rooms', 'sprites_people'])
    keys = sorted(k for k in reg.f if k.startswith('furn/'))
    groups = {}
    for k in keys:
        parts = k.split('/')
        groups.setdefault(parts[1], []).append(k)
    cellw, cellh = 100, 90
    cols = 6
    cells = []
    for name, ks in groups.items():
        for k in ks:
            cells.append(k)
    rows = (len(cells) + cols - 1) // cols
    img = canvas(cols * cellw, rows * cellh)
    for i, k in enumerate(cells):
        cx, cy = (i % cols) * cellw, (i // cols) * cellh
        ox, oy = cx + cellw // 2, cy + 62
        floor_fast(img[cy:cy + cellh - 12, cx:cx + cellw], cellw // 2, 62, -2.2, -2.2, 2.2, 2.2)
        draw(img, reg, k, ox, oy)
        ex = reg.extra.get(k, {})
        for u in ex.get('use', []):
            px, py = proj(u[0], u[1])
            dot(img, ox + px, oy + py, (255, 230, 40, 255))
        # a man for scale, at (2, 2) in front right
        px, py = proj(2.2, -1.2)
        draw(img, reg, 'ppl/storekeeper/idle/sw/0', ox + px, oy + py)
        dot(img, ox, oy, (230, 30, 30, 255))
        label(img, k[5:], cx + 3, cy + cellh - 11)
    save(img, 'rooms-furniture.png', 2)
    save(img, 'rooms-furniture-1x.png', 1)


_REG = [None]


def both():
    if _REG[0] is None:
        _REG[0] = load(['sprites_rooms', 'sprites_people'])
    return _REG[0]


def people_sheet():
    """One row per person: idle and walk (new roles), work in four facings, sit in four facings on a chair at a
    table, lie in a bed both ways."""
    import people_d32 as P32
    reg = both()
    whos = P32.NEW_ROLES + P32.OLD_FOLK + P32.STAND_INS
    rowh = 46
    W = 1180
    for part, ws in (('new', P32.NEW_ROLES), ('old', P32.OLD_FOLK + P32.STAND_INS)):
        img = canvas(W, rowh * len(ws) + 14)
        label(img, 'name     idle walk(se) | work se, sw, ne, nw (2 frames each) | sit at a table se sw ne nw | in bed '
                   'x (lie/se), z (lie/sw)', 4, 2)
        for r, who in enumerate(ws):
            y0 = 14 + r * rowh
            gy = y0 + 36
            label(img, who, 4, y0 + 4)
            label(img, P32.NAMES.get(who, ''), 4, y0 + 14)
            x = 110
            if who in P32.NEW_ROLES:
                for k in ('idle/se/0', 'idle/ne/0', 'walk/se/0', 'walk/se/1', 'walk/sw/2', 'talk/se/0',
                          'benchSit/se/0'):
                    draw(img, reg, f'ppl/{who}/{k}', x, gy)
                    x += 22
            else:
                x += 22 * 7
            x += 8
            for d in ('se', 'sw', 'ne', 'nw'):
                for f in (0, 1):
                    draw(img, reg, f'ppl/{who}/work/{d}/{f}', x, gy)
                    x += 20
                x += 4
            x += 10
            for d in ('se', 'sw', 'ne', 'nw'):
                # the table on the far side of a sitter facing d, a chair under him
                tx, tz = {'se': (0.9, 0), 'sw': (0, 0.9), 'ne': (0, -0.9), 'nw': (-0.9, 0)}[d]
                key = f'ppl/{who}/sit/{d}/0' if f'ppl/{who}/sit/{d}/0' in reg.f else f'ppl/{who}/sit/{d}/0'
                tpx, tpy = proj(tx, tz)
                if d in ('ne', 'nw'):
                    draw(img, reg, 'furn/table/x' if d == 'ne' else 'furn/table/z', x + tpx, gy + tpy)
                draw(img, reg, f'furn/chair/{d}', x, gy)
                draw(img, reg, key, x, gy)
                if d in ('se', 'sw'):
                    draw(img, reg, 'furn/table/z' if d == 'se' else 'furn/table/x', x + tpx, gy + tpy)
                x += 40
            for o, d in (('x', 'se'), ('z', 'sw')):
                draw(img, reg, f'furn/bed/{o}', x + 10, gy - 6)
                draw(img, reg, f'ppl/{who}/lie/{d}/0', x + 10, gy - 6)
                x += 46
        save(img, f'rooms-people-{part}.png', 2)
        save(img, f'rooms-people-{part}-1x.png', 1)


def hired_sheet():
    import people_d32 as P32
    reg = both()
    anims = ['idle', 'walk', 'punch', 'carry', 'push', 'throw', 'wave', 'lantern', 'lift', 'shoulder/idle',
             'shoulder/walk', 'roll', 'drag', 'truck', 'heave', 'stackHigh', 'door', 'climb', 'handOver', 'pull']
    img = canvas(1000, 4 * 4 * 30 + 20)
    y = 14
    for who in ['agent'] + P32.HIRED:
        for d in ('se', 'sw', 'ne', 'nw'):
            label(img, f'{who} {d}', 4, y + 8)
            x = 110
            for a in anims:
                for f in range(4):
                    k = f'ppl/{who}/{a}/{d}/{f}'
                    if k in reg.f:
                        draw(img, reg, k, x, y + 26)
                        x += 15
                x += 4
            y += 30
    save(img, 'rooms-hired.png', 2)


# Mock rooms: (title, size x, size z, [(key, x, z, lift_px)]) with x, z in u inside the room (0..X, 0..Z); the back
# walls are at z = 0 (north) and x = 0 (west). Things are sorted by their anchor's x + z (flat ones first).
ROOMS = [
    ('the general store', 8.0, 7.0, [
        ('furn/rug/x', 4.0, 5.2, 0, True),
        ('furn/shelf/3/x', 2.2, 0.35, 0), ('furn/shelf/2/x', 5.4, 0.35, 0), ('furn/shelf/1/z', 0.35, 3.6, 0),
        ('furn/counter/x', 4.0, 2.4, 0), ('ppl/storekeeper/work/sw/0', 3.6, 1.45, 0),
        ('ppl/clerk/work/sw/1', 5.4, 1.45, 0),
        ('ppl/wife_b/idle/ne/0', 4.0, 3.5, 0), ('ppl/farmer/talk/nw/0', 5.6, 3.6, 0),
        ('furn/stove/1/x', 6.6, 5.4, 0), ('furn/barrel/x', 1.4, 5.9, 0), ('furn/crates/3/x', 7.0, 1.6, 0),
        ('furn/sacks/2/z', 1.2, 2.0, 0), ('ppl/boy/work/se/0', 2.6, 5.8, 0),
        ('furn/clock/z', 0.12, 1.2, 0), ('furn/pegs/x', 7.4, 0.15, 0),
    ]),
    ('a home at night', 7.0, 6.0, [
        ('furn/rug/z', 2.0, 3.6, 0, True),
        ('furn/bed/z', 1.2, 1.5, 0), ('ppl/wife_a/lie/sw/0', 1.2, 1.5, 0),
        ('furn/cot_sleeper/z', 3.0, 1.5, 0), ('ppl/girl/lie/sw/0', 3.0, 1.5, 0),
        ('furn/range/1/x', 5.6, 0.45, 0), ('furn/cupboard/z', 0.35, 4.3, 0),
        ('furn/table/x', 4.6, 3.6, 0), ('furn/chair/sw', 4.2, 2.9, 0), ('ppl/storekeeper/sit/sw/0', 4.2, 2.9, 0),
        ('furn/chair/ne', 4.9, 4.4, 0), ('ppl/boy/sit/ne/0', 4.9, 4.4, 0),
        ('furn/lamp_table_lit/x', 6.4, 2.4, 0), ('furn/wash_stand/x', 2.2, 0.32, 0),
        ('ppl/wife_b/work/ne/0', 5.4, 1.3, 0), ('furn/trunk/x', 1.2, 3.1, 0),
    ]),
    ('the saloon', 10.0, 7.5, [
        ('furn/backbar/x', 4.0, 0.35, 0), ('furn/bar/x', 4.0, 2.4, 0), ('ppl/barkeep/work/sw/0', 3.4, 1.4, 0),
        ('ppl/cowhand/idle/ne/1', 3.0, 3.35, 0), ('ppl/cowhand.b/talk/ne/0', 4.6, 3.35, 0),
        ('furn/barstool/x', 2.0, 3.2, 0), ('ppl/vaquero/sit/ne/0', 2.0, 3.2, 3),
        ('furn/card_table/x', 7.6, 5.0, 0), ('furn/chair/se', 6.6, 5.0, 0), ('ppl/man_bowler/sit/se/0', 6.6, 5.0, 0),
        ('furn/chair/nw', 8.6, 5.0, 0), ('ppl/sheriff/sit/nw/0', 8.6, 5.0, 0),
        ('furn/chair/sw', 7.6, 4.0, 0), ('ppl/printer/sit/sw/0', 7.6, 4.0, 0),
        ('furn/piano/z', 0.4, 5.6, 0), ('ppl/undertaker/benchSit/nw/0', 1.6, 5.6, 0),
        ('furn/stove/2/x', 8.8, 1.2, 0),
    ]),
    ('the smithy and the livery', 10.0, 7.0, [
        ('furn/forge/1/x', 2.0, 0.85, 0), ('furn/bellows/z', 0.5, 2.4, 0), ('furn/anvil/x', 2.4, 3.0, 0),
        ('ppl/smith/work/ne/1', 2.4, 3.75, 0), ('furn/stall/horse/z', 6.0, 2.45, 0), ('furn/stall/z', 8.7, 2.45, 0),
        ('ppl/stableboy/work/ne/0', 8.7, 3.4, 0), ('furn/barrel/x', 4.4, 0.6, 0), ('furn/sacks/3/x', 4.8, 6.0, 0),
    ]),
    ('school and church', 10.0, 7.0, [
        ('furn/blackboard/x', 3.0, 0.15, 0), ('ppl/teacher/work/sw/0', 1.6, 0.9, 0),
        ('furn/school_desk/ne', 2.0, 3.0, 0), ('ppl/girl/sit/ne/0', 2.0, 3.55, 0),
        ('furn/school_desk/ne', 3.8, 3.0, 0), ('ppl/boy/sit/ne/0', 3.8, 3.55, 0),
        ('furn/desk/sw', 1.0, 4.9, 0), ('furn/pulpit/sw', 7.6, 1.0, 0), ('ppl/preacher/work/sw/0', 7.6, 0.45, 2),
        ('furn/pew/ne', 7.4, 3.6, 0), ('ppl/wife_a/benchSit/ne/0', 6.6, 3.6, 0),
        ('ppl/farmer/benchSit/ne/0', 7.4, 3.6, 0), ('furn/pew/ne', 7.4, 5.4, 0),
        ('ppl/maid/benchSit/ne/0', 8.2, 5.4, 0),
    ]),
    ('bank, jail, hotel', 12.0, 7.0, [
        ('furn/safe/x', 1.0, 0.6, 0), ('furn/bank_counter/x', 2.6, 2.4, 0), ('ppl/banker/work/sw/0', 2.2, 1.5, 0),
        ('ppl/man_bowler.b/idle/ne/0', 2.2, 3.4, 0), ('furn/desk_roll/sw', 1.4, 5.0, 0),
        ('furn/cell_bars/z', 6.0, 3.0, 0), ('furn/bunk/z', 5.1, 1.6, 0), ('ppl/cowhand/lie/sw/0', 5.1, 1.6, 0),
        ('furn/desk/se', 7.4, 5.4, 0), ('furn/chair/se', 6.95, 5.4, 0), ('ppl/sheriff/sit/se/0', 6.95, 5.4, 0),
        ('furn/key_rack/x', 10.0, 0.15, 0), ('furn/hotel_desk/x', 10.0, 2.0, 0),
        ('ppl/hotelkeeper/work/sw/0', 9.6, 1.0, 0), ('ppl/cook/idle/sw/0', 11.2, 4.6, 0),
        ('ppl/maid/work/sw/1', 9.0, 5.2, 0),
    ]),
]


def scenes():
    reg = both()
    cols = 2
    cw, ch = 300, 230
    img = canvas(cw * cols, ch * ((len(ROOMS) + cols - 1) // cols))
    for i, (title, X, Z, things) in enumerate(ROOMS):
        cx, cy = (i % cols) * cw, (i // cols) * ch
        sub = canvas(cw, ch, (60, 52, 50, 255))
        ox, oy = cw // 2 + int(4 * (Z - X)), 70
        floor_fast(sub, ox, oy, 0, 0, X, Z)
        walls(sub, ox, oy, 0, 0, X, Z, 4.2)
        flat = [t for t in things if len(t) > 4]
        rest = sorted([t for t in things if len(t) == 4], key=lambda t: t[1] + t[2])
        for t in flat + rest:
            k, x, z, lift = t[:4]
            px, py = proj(x, z)
            draw(sub, reg, k, ox + px, oy + py, lift)
        blit(img, sub, cx, cy)
        label(img, title, cx + 4, cy + 4, (240, 228, 200, 255))
    save(img, 'rooms-scenes.png', 3)


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('furn', 'all'):
        furn_sheet()
    if what in ('people', 'all'):
        people_sheet()
    if what in ('hired', 'all'):
        hired_sheet()
    if what in ('scenes', 'all'):
        scenes()
