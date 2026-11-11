#!/usr/bin/env python3
# Review sheets for A2's D27 art (vehicles, interiors, goods, carts), put together from the built atlas only, the
# way the game draws them (frame at (sx - ax, sy - ay), sx = 8 (x - z), sy = 4 (x + z) - 8 y). Run build.py first.
#     python3 tools/pixelart/review_a2.py
# Writes, in tools/pixelart/out/:
#   a2-vehicles.png    every vehicle at e, e+15, e+30 and w, both locos' frames, smoke
#   a2-coach-in.png    the coach cut away at e and w: floor, benches, stove, cooler, closet, lamps, bags, sill, end,
#                      with stand-in sitters at the seat anchors (people's own sitting frames come from A1)
#   a2-boxcar-in.png   the boxcar cut away, its north door's four frames, goods on its floor grid
#   a2-goods.png       the 16 goods resting (x and z), variants, held, rolling, tipping, on the hand truck, tags
#   a2-carts.png       the platform cart and the hand truck in four facings, empty and loaded, with the agent
import os, sys, json, re
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import font as FT

OUT = os.path.join(HERE, 'out')
BG = (178, 160, 122, 255)
DECK = (150, 128, 96, 255)


class Atlas:
    def __init__(self, out=OUT):
        self.info = json.load(open(os.path.join(out, 'atlas.json')))
        self.sheets = [np.array(Image.open(os.path.join(out, s['file'])).convert('RGBA')) for s in self.info['sheets']]
        self.F = self.info['frames']; self.X = self.info['extra']

    def has(self, k):
        return k in self.F

    def frame(self, k):
        gi, x, y, w, h, ax, ay = self.F[k]
        return self.sheets[gi][y:y + h, x:x + w], (ax, ay)


class Canvas:
    def __init__(self, w, h, ox, oy, bg=BG):
        self.img = np.zeros((h, w, 4), np.uint8); self.img[:] = bg
        self.ox, self.oy = ox, oy

    def sxy(self, x, z, y=0.0):
        return int(round(self.ox + 8 * (x - z))), int(round(self.oy + 4 * (x + z) - 8 * y))

    def blit(self, img, x, y):
        h, w = img.shape[:2]
        x0, y0 = max(0, x), max(0, y); x1, y1 = min(self.img.shape[1], x + w), min(self.img.shape[0], y + h)
        if x0 >= x1 or y0 >= y1:
            return
        s = img[y0 - y:y1 - y, x0 - x:x1 - x]
        m = s[..., 3] > 0
        self.img[y0:y1, x0:x1][m] = s[m]

    def put(self, A, key, x, z, y=0.0, dx=0, dy=0):
        if not A.has(key):
            return False
        f, (ax, ay) = A.frame(key)
        sx, sy = self.sxy(x, z, y)
        self.blit(f, sx - ax + dx, sy - ay + dy)
        return True

    def text(self, s, x, y, col=(43, 32, 38, 255)):
        t = FT.text_image(s, col)
        self.blit(t, x, y)

    def save(self, name, scale):
        im = Image.fromarray(self.img)
        im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(os.path.join(OUT, name), optimize=True)
        print(f'  {name}: {im.width * scale} x {im.height * scale}')


def sitter(A, who, f):
    """A stand-in for a seated traveller: the standing frame with its legs cut off, set on the hip point (until A1's
    sit frames exist; then the real ones are used)."""
    k = f'ppl/{who}/sit/{f}/0'
    if A.has(k):
        return A.frame(k)
    img, (ax, ay) = A.frame(f'ppl/{who}/idle/{f}/0')
    cut = 7
    return img[:img.shape[0] - cut].copy(), (ax, ay - cut)


# ------------------------------------------------------------------ the coach cut away
def coach_in(A, C, hdg, cx, cz, people=True, night=False):
    lay = A.X[f'veh/coach_in/{hdg}/floor']['layout']
    C.put(A, f'veh/coach_in/{hdg}/floor', cx, cz)
    items = []          # (depth, draw)
    def add(depth, fn):
        items.append((depth, len(items), fn))
    for b in lay['benches']:
        add(b['x'] + b['z'] - 0.3, lambda b=b: C.put(A, b['key'], cx + b['x'], cz + b['z'], b['y']))
    for nm in ('stove', 'cooler', 'closet'):
        p = lay[nm]
        fr = '/0' if nm == 'stove' else ''
        add(p['x'] + p['z'], lambda p=p, fr=fr: C.put(A, p['key'] + fr, cx + p['x'], cz + p['z'], p['y']))
    for i, xb in enumerate((-3.4, -0.7, 1.3, 3.9)):
        r = lay['racks']
        add(xb + r['z'] - 2, lambda xb=xb, i=i, r=r: C.put(A, f'veh/rack_bag/{i % 3}', cx + xb, cz + r['z'], r['y']))
    if people:
        who = ['man_top', 'woman_bonnet', 'man_bowler', 'woman_shawl', 'child', 'man_bag', 'worker', 'man_top.b']
        for i, s in enumerate(lay['seats']):
            if (i * 7) % 3 == 0 or s['pos'] == 'side':
                w = who[i % len(who)]
                img, (ax, ay) = sitter(A, w, s['f'])
                def draw(s=s, img=img, ax=ax, ay=ay):
                    sx, sy = C.sxy(cx + s['x'], cz + s['z'], s['y'])
                    C.blit(img, sx - ax, sy - ay)
                    C.img[sy, sx] = (255, 40, 40, 255)
                add(s['x'] + s['z'] + 0.05, draw)
        add(0.6, lambda: C.put(A, 'ppl/agent/punch/ne/1', cx + 0.6, cz + 0.0, lay['floor']))
    for l in lay['lamps']:
        add(l['x'] + l['z'] + 0.5, lambda l=l: C.put(A, l['key'] + ('/1' if night else '/0'), cx + l['x'], cz + l['z'], l['y']))
    for _, _, fn in sorted(items, key=lambda t: (t[0], t[1])):
        fn()
    C.put(A, f'veh/coach_in/{hdg}/sill', cx, cz)
    C.put(A, f'veh/coach_in/{hdg}/end', cx, cz)


def sheet_coach(A):
    C = Canvas(640, 380, 170, 120)
    coach_in(A, C, 'e', 0, 0)
    C.text('veh/coach_in/e: cut away, seats, stove (west), cooler and closet (east)', 4, 4)
    coach_in(A, C, 'w', 14, -14, night=True)
    C.text('w, lamps lit; red dots: seat anchors (hip point)', 360, 14)
    # the whole coach beside, and the parts alone
    C.put(A, 'veh/coach/e', 26, 8)
    x = 10
    for k in ('veh/seat/se', 'veh/seat/nw', 'veh/seat/ne', 'veh/seat/sw', 'veh/sidebench/ne', 'veh/sidebench/sw',
              'veh/stove/0', 'veh/stove/1', 'veh/cooler', 'veh/closet', 'veh/lamp/0', 'veh/lamp/1',
              'veh/rack_bag/0', 'veh/rack_bag/1', 'veh/rack_bag/2'):
        if A.has(k):
            f, (ax, ay) = A.frame(k)
            C.blit(f, x, 372 - f.shape[0]); x += f.shape[1] + 5
    C.save('a2-coach-in.png', 3)


def sheet_vehicles(A):
    C = Canvas(1000, 560, 0, 0)
    rows = [('veh/loco/{h}/0', 'veh/loco/{h}/1'), ('veh/loco_freight/{h}/0', 'veh/loco_freight/{h}/1'),
            ('veh/coach/{h}', 'veh/coach_lit/{h}'), ('veh/boxcar/{h}', 'veh/flatcar/{h}')]
    y = 10
    for row in rows:
        x = 6; hmax = 0
        for h in ('e', 'e+15', 'e+30', 'e-30', 'w', 'w+30'):
            for k in row:
                k = k.format(h=h)
                if not A.has(k):
                    continue
                f, _ = A.frame(k)
                if x + f.shape[1] > 1000:
                    break
                C.blit(f, x, y); x += f.shape[1] + 4; hmax = max(hmax, f.shape[0])
        y += hmax + 6
    x = 6
    for k in ('veh/boxcar_open/e', 'veh/boxcar_open/w', 'fx/smoke/0', 'fx/smoke/1', 'fx/smoke/2', 'fx/smoke/3'):
        if A.has(k):
            f, _ = A.frame(k); C.blit(f, x, y); x += f.shape[1] + 6
    C.img = C.img[:y + 130]
    C.save('a2-vehicles.png', 2)


def sheet_boxcar(A):
    C = Canvas(560, 130, 70, 60)
    for i in range(4):
        cx = i * 8.0; cz0 = -cx
        C.put(A, 'veh/boxcar_in/e/floor', cx, cz0)
        C.put(A, f'veh/boxcar_door/e/{i}', cx, cz0)
        lay = A.X['veh/boxcar_in/e/floor']['layout']
        cells = lay['cells']
        goods = ['crate', 'barrel', 'sack', 'keg', 'bale', 'stove', 'paper', 'strongbox']
        for j, g in enumerate(goods[:2 + 2 * i]):
            c, r = 10 - (j % 6), j // 6
            x = cells['x0'] + (c + 0.5) * cells['size']; z = cells['z0'] + (r + 0.5) * cells['size']
            C.put(A, f'goods/{g}', cx + x, cz0 + z, lay['floor'])
        if i == 3:
            C.put(A, 'ppl/agent/carry/sw/0', cx + 0.2, cz0 - 0.6, lay['floor'])
        C.put(A, 'veh/boxcar_in/e/sill', cx, cz0)
    C.text('veh/boxcar_in/e with veh/boxcar_door/e/0..3 (north door, shut to open) and goods on the floor grid', 4, 118)
    C.save('a2-boxcar-in.png', 3)


def strip(A, C, keys, x, y, label=None, gap=4, scale_bg=None):
    """Frames side by side, aligned on their anchors' baseline; returns the next x."""
    fs = [(k, A.frame(k)) for k in keys if A.has(k)]
    if not fs:
        return x
    up = max(a[1] for _, (_, a) in fs)
    x0 = x
    for k, (img, (ax, ay)) in fs:
        C.blit(img, x, y + up - ay)
        x += img.shape[1] + gap
    if label:
        C.text(label, x0, y + up + max(i.shape[0] - a[1] for _, (i, a) in fs) + 2)
    return x


def sheet_goods(A):
    import goods27 as G
    C = Canvas(900, 760, 0, 0)
    y = 4
    C.text('goods/<kind> and /z (resting), with variants', 4, y); y += 10
    x = 4
    for kind in G.KINDS:
        keys = [f'goods/{kind}', f'goods/{kind}/z'] + [f'goods/{kind}/{v}' for v in G.VARIANTS.get(kind, ())[1:]]
        if x > 760:
            x = 4; y += 64
        x = strip(A, C, keys, x, y, kind) + 10
    y += 74
    C.text('goods/<kind>/held/<se ne nw sw>: carry, shoulder, drag, roll, heave, truck', 4, y); y += 10
    x = 4
    for kind in G.KINDS:
        keys = [f'goods/{kind}/held/{d}' for d in ('se', 'ne', 'nw', 'sw')]
        if x > 640:
            x = 4; y += 70
        x = strip(A, C, keys, x, y, kind, gap=2) + 10
    y += 80
    C.text('rolling (4 frames), tipping (2), lying, on the tilted hand truck', 4, y); y += 10
    x = 4
    for d in ('se', 'ne'):
        x = strip(A, C, [f'goods/barrel/roll/{d}/{f}' for f in range(4)], x, y, 'barrel roll ' + d) + 10
        x = strip(A, C, [f'goods/wheel/roll/{d}/{f}' for f in range(4)], x, y, 'wheel roll ' + d) + 10
    x = strip(A, C, ['goods/barrel', 'goods/barrel/tip/se/0', 'goods/barrel/tip/se/1', 'goods/barrel/roll/se/0'], x, y, 'tip se') + 10
    y += 60; x = 4
    x = strip(A, C, ['goods/barrel/side/x', 'goods/barrel/side/z', 'goods/keg/side/x', 'goods/keg/side/z'], x, y, 'side') + 14
    for kind in ('crate', 'barrel', 'bale', 'stove', 'furniture', 'piano'):
        for d in ('se', 'sw'):
            if not A.has(f'truck/{d}/tilt'):
                continue
            img, (ax, ay) = A.frame(f'truck/{d}/tilt')
            g, (gx, gy) = A.frame(f'goods/{kind}/truck/{d}')
            ox = x + max(ax, gx); oy = y + 40
            C.blit(img, ox - ax, oy - ay); C.blit(g, ox - gx, oy - gy)
            x = ox + max(img.shape[1] - ax, g.shape[1] - gx) + 6
    y += 70; x = 4
    C.text('tag/<shop> and tag/board/<shop>', 4, y); y += 10
    import sprites_goods as SG
    for name in list(SG.TAGS) + ['any']:
        x = strip(A, C, [f'tag/{name}', f'tag/board/{name}'], x, y, name[:5]) + 8
    C.img = C.img[:y + 30]
    C.save('a2-goods.png', 3)


def sheet_carts(A):
    C = Canvas(560, 300, 0, 0)
    fwd = {'se': (1, 0), 'ne': (0, -1), 'nw': (-1, 0), 'sw': (0, 1)}
    for i, d in enumerate(('se', 'ne', 'nw', 'sw')):
        # the empty cart pushed by the agent, then the loaded preview, then goods placed by the cells
        cx, cy = 60 + i * 130, 60
        X = A.X[f'cart27/{d}']
        px, pz = X['pusher']
        def at(x, z, y=0.0):
            return int(round(cx + 8 * (x - z))), int(round(cy + 4 * (x + z) - 8 * y))
        back = d in ('ne', 'nw')
        ag = f'ppl/agent/push/{d}/1'
        def draw_agent():
            if A.has(ag):
                f, (ax, ay) = A.frame(ag); sx, sy = at(px, pz); C.blit(f, sx - ax, sy - ay)
        def draw_cart(key):
            f, (ax, ay) = A.frame(key); C.blit(f, cx - ax, cy - ay)
        if not back: draw_agent()
        draw_cart(f'cart27/{d}/0')
        if back: draw_agent()
        # goods by cell, front cells first in the order the game fills them
        cy2 = cy + 80
        f, (ax, ay) = A.frame(f'cart27/{d}/1'); C.blit(f, cx - ax, cy2 - ay)
        cells = sorted(X['cells'], key=lambda c: c['x'] + c['z'])
        kinds = ['crate', 'sack', 'keg', 'paper', 'strongbox', 'crate', 'mailSack', 'barrel/side/' + ('x' if d in ('se', 'nw') else 'z')]
        for k, c in zip(kinds, cells):
            g, (gx, gy) = A.frame('goods/' + k)
            C.blit(g, cx + c['px'][0] - gx, cy2 + c['px'][1] - gy)
        cy3 = cy + 160
        f, (ax, ay) = A.frame(f'cart27/{d}/loaded'); C.blit(f, cx - ax, cy3 - ay)
        # the hand truck, upright and tipped, with the agent and a load
        tx, ty = cx - 20, cy + 230
        for j, st in enumerate(('upright', 'tilt')):
            ox = tx + j * 50
            T = A.X[f'truck/{d}/{st}']
            def at2(x, z, y=0.0):
                return int(round(ox + 8 * (x - z))), int(round(ty + 4 * (x + z) - 8 * y))
            f, (ax, ay) = A.frame(f'truck/{d}/{st}')
            pieces = [(f, ax, ay, ox, ty)]
            if st == 'tilt':
                g, (gx, gy) = A.frame(f'goods/barrel/truck/{d}'); pieces.append((g, gx, gy, ox, ty))
            else:
                nx, nz = T['nose']; sx, sy = at2(nx, nz)
                g, (gx, gy) = A.frame('goods/stove'); pieces.append((g, gx, gy, sx, sy))
            agk = f'ppl/agent/carry/{d}/0' if st == 'tilt' else f'ppl/agent/idle/{d}/0'
            if A.has(agk):
                ppx, ppz = T['pusher']; sx, sy = at2(ppx, ppz)
                a, (aax, aay) = A.frame(agk)
                if not back:
                    C.blit(a, sx - aax, sy - aay)
                for (im, ax_, ay_, bx, by) in pieces:
                    C.blit(im, bx - ax_, by - ay_)
                if back:
                    C.blit(a, sx - aax, sy - aay)
    C.text('cart27 with the agent at its pusher spot; goods set on its cells (extra cells px); loaded; hand truck', 4, 4)
    C.save('a2-carts.png', 3)


def main():
    A = Atlas()
    sheet_vehicles(A)
    sheet_coach(A)
    sheet_boxcar(A)
    if 'sheet_goods' in globals():
        sheet_goods(A)
    if 'sheet_carts' in globals():
        sheet_carts(A)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        OUT = os.path.join(OUT, sys.argv[1])
    main()
