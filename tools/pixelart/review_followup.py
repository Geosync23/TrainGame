#!/usr/bin/env python3
# Review sheet for the follow-up art (A3): the buildings' night versions beside their day sprites, the point rodding
# pieces put together, and the keg of nails. Built from the atlas only (run build.py first):
#     python3 tools/pixelart/review_followup.py      -> tools/pixelart/out/followup-art.png (2x)
# Each building row: the day sprite on the day ground | the _lit sprite as drawn | the _lit sprite with a stand-in
# night tint (everything but the pixels the _lit sprite changes darkened and blued; the game's own night look is R's).
import os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from review_a2 import Atlas, Canvas, BG

NIGHT_BG = (60, 62, 80, 255)
SHOPS = [('store', 'e'), ('hotel', 'e'), ('bank', 'e'), ('smithy', 'e'), ('livery', 'e'), ('feed', 'e'),
         ('saloon', 'w'), ('newspaper', 'w'), ('barber', 'w'), ('sheriff', 'w'), ('undertaker', 'w'), ('assay', 'w')]


def tint(img):
    out = img.astype(float)
    out[..., 0] *= 0.42; out[..., 1] *= 0.46; out[..., 2] = out[..., 2] * 0.55 + 12
    out[..., 3] = img[..., 3]
    return np.clip(out, 0, 255).astype(np.uint8)


def compose(A, parts, w, h, ax, ay, lit_key=None, day_key=None, night=False, bg=None):
    """Draw keys (all at one anchor) into a w x h panel; with night, darken all but the lit pixels."""
    panel = np.zeros((h, w, 4), np.uint8)
    panel[:] = bg or (NIGHT_BG if night else BG)
    for k in parts:
        if not A.has(k):
            continue
        f, (fx, fy) = A.frame(k)
        img = f
        if night:
            img = tint(f)
            if k == lit_key:
                d, _ = A.frame(day_key)
                ch = (f[..., :3] != d[..., :3]).any(-1) & (f[..., 3] > 0)
                img = img.copy(); img[ch] = f[ch]
        x, y = ax - fx, ay - fy
        hh, ww = img.shape[:2]
        x0, y0 = max(0, x), max(0, y); x1, y1 = min(w, x + ww), min(h, y + hh)
        s = img[y0 - y:y1 - y, x0 - x:x1 - x]
        m = s[..., 3] > 0
        panel[y0:y1, x0:x1][m] = s[m]
    return panel


def row_items():
    items = []
    for kind, f in SHOPS:
        b = f'bld/shop_{kind}/{f}/'
        day = [b + 'walk', b + 'shadow', b + 'body', b + 'awning', b + 'yard', b + 'sign', b + 'pole/0']
        items.append((b + 'body', b + 'body_lit', day, 250, 200, 125, 150))
    items.append(('bld/church', 'bld/church_lit', ['bld/church/shadow', 'bld/church'], 250, 190, 115, 120))
    items.append(('bld/school', 'bld/school_lit', ['bld/school/shadow', 'bld/school'], 250, 150, 125, 105))
    for n in range(1, 5):
        for f in ('e', 'w'):
            items.append((f'bld/house/{n}/{f}', f'bld/house/{n}/{f}_lit', [f'bld/house/{n}/{f}'], 130, 100, 65, 70))
    items.append(('bld/freighthouse/body', 'bld/freighthouse/body_lit',
                  ['bld/freighthouse/body', 'bld/freighthouse/roof'], 250, 150, 125, 105))
    return items


def main():
    A = Atlas()
    rows, cur, curw = [], [], 0
    for day_key, lit_key, day_parts, w, h, ax, ay in row_items():
        # night: everything but the cast shadow, the lit body in place of the day one (the roof left off the
        # freight house so its inside shows)
        lit_parts = [lit_key if k == day_key else k for k in day_parts if not k.endswith('shadow') and not k.endswith('/roof')]
        raw = compose(A, [lit_key], w, h, ax, ay, bg=NIGHT_BG)
        panels = [compose(A, day_parts, w, h, ax, ay), raw,
                  compose(A, lit_parts, w, h, ax, ay, lit_key=lit_key, day_key=day_key, night=True)]
        cell = np.concatenate([np.pad(p, ((0, 0), (0, 2), (0, 0))) for p in panels], axis=1)
        label = Canvas(cell.shape[1], 10, 0, 0, bg=(235, 225, 200, 255))
        label.text(f'{day_key}  |  {lit_key}  |  {lit_key} (stand-in night tint)', 2, 2)
        cell = np.concatenate([label.img, cell], axis=0)
        if cur and curw + cell.shape[1] > 1600:
            rows.append(cur); cur, curw = [], 0
        cur.append(cell); curw += cell.shape[1] + 6
    rows.append(cur)
    # the rodding: an L of runs round a crank, each crank alone, and the keg of nails beside the other kegs
    C = Canvas(700, 140, 0, 0)
    C.text('bld/rodding_x, bld/rodding_z and bld/rodding_crank (arms e s): an L of rodding from x 0, z 0', 4, 4)
    C.ox, C.oy = 120, 40
    for i in range(3):
        C.put(A, 'bld/rodding_x', 2.0 * i - 6.0, 0.0)          # runs from the west to the crank at (0, 0) (arms w here)
    for i in range(3):
        C.put(A, 'bld/rodding_z', 0.0, 2.0 * i)
    C.put(A, 'bld/rodding_crank/w_s', 0.0, 0.0)
    C.ox, C.oy = 330, 40
    for i in range(3):
        C.put(A, 'bld/rodding_x', 2.0 * i, 0.0)
        C.put(A, 'bld/rodding_z', 0.0, 2.0 * i)
    C.put(A, 'bld/rodding_crank', 0.0, 0.0)
    for i, k in enumerate(('bld/rodding_crank', 'bld/rodding_crank/w_s', 'bld/rodding_crank/e_n', 'bld/rodding_crank/w_n')):
        C.ox, C.oy = 470 + 40 * i, 60
        C.put(A, k, 0.0, 0.0)
    C.text('the four cranks', 470, 74)
    C.text('goods/keg/beer, /empty, /nails (new)', 470, 96)
    for i, k in enumerate(('goods/keg/beer', 'goods/keg/empty', 'goods/keg/nails')):
        C.ox, C.oy = 490 + 30 * i, 128
        C.put(A, k, 0.0, 0.0)
    rows.append([np.repeat(np.repeat(C.img, 2, 0), 2, 1)])     # this strip at twice the scale (4x in the file)
    W = max(sum(c.shape[1] for c in r) + 6 * (len(r) - 1) for r in rows) + 8
    strips = []
    for r in rows:
        hh = max(c.shape[0] for c in r)
        s = np.zeros((hh + 6, W, 4), np.uint8); s[:] = (235, 225, 200, 255)
        x = 4
        for c in r:
            s[:c.shape[0], x:x + c.shape[1]] = c
            x += c.shape[1] + 6
        strips.append(s)
    img = np.concatenate(strips, axis=0)
    from PIL import Image
    im = Image.fromarray(img)
    im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(os.path.join(HERE, 'out', 'followup-art.png'), optimize=True)
    print(f'  followup-art.png: {im.width * 2} x {im.height * 2}')


if __name__ == '__main__':
    main()
