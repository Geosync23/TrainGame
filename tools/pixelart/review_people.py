#!/usr/bin/env python3
# Review pictures for the people (owner: the people artist). Writes, in tools/pixelart/out/:
#   people-contact.png    every person sprite at 3x with its key: the drawn se and ne frames, then (dimmer
#                         label) the sw and nw frames as the renderer will mirror them
#   people-closeup.png    the idle frame of every type at 8x, se and ne, for judging faces and clothes
#   people-testscene.png  people standing on a platform beside a coach, queueing, boarding, the agent punching,
#                         carrying a crate (drawn at the hands offset) and pushing the handcart, at 3x
# The test scene takes the platform, coach, goods and handcart from the committed sheets (out/atlas.json);
# the people come straight from people.py, so it runs without the rest of the pipeline.
#     python3 tools/pixelart/review_people.py
import os, sys, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import people as PE
import font as FT

OUT = os.path.join(HERE, 'out')
BG = (187, 156, 118, 255)


def blit(dst, img, x, y):
    h, w = img.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = img[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    d = dst[y0:y1, x0:x1].astype(np.float32)
    a = s[..., 3:4] / 255.0
    d[..., :3] = s[..., :3] * a + d[..., :3] * (1 - a)
    d[..., 3] = np.maximum(d[..., 3], s[..., 3])
    dst[y0:y1, x0:x1] = d.astype(np.uint8)


def mirrored(f, an):
    img = f[:, ::-1].copy()
    return img, (f.shape[1] - an[0], an[1])


def contact(sprites, scale=3, width=620):
    cells = []
    for name, frames, meta in sprites:
        groups = [(name, frames, (43, 32, 38, 255))]
        d = name.split('/')[-1]
        md = {'se': 'sw', 'ne': 'nw'}[d]
        groups.append((name[:-2] + md + ' (mirrored)', [mirrored(f, a) for f, a in frames], (110, 90, 70, 255)))
        for nm, frs, col in groups:
            fw = sum(i.shape[1] + 3 for i, _ in frs)
            ups = max(a[1] for _, a in frs); downs = max(i.shape[0] - a[1] for i, a in frs)
            lb = FT.text_image(nm, col)
            cw = max(fw, lb.shape[1]) + 6; ch = ups + downs + FT.LINE_H + 5
            cell = np.zeros((ch, cw, 4), np.uint8)
            x = 0
            for img, (ax, ay) in frs:
                blit(cell, img, x, ups - ay)
                x += img.shape[1] + 3
            blit(cell, lb, 0, ups + downs + 2)
            cells.append(cell)
    rows, row, rw = [], [], 0
    for c in cells:
        if rw + c.shape[1] > width and row:
            rows.append(row); row, rw = [], 0
        row.append(c); rw += c.shape[1]
    rows.append(row)
    H = sum(max(c.shape[0] for c in r) for r in rows) + 8
    img = np.zeros((H, width + 8, 4), np.uint8); img[...] = BG
    y = 4
    for r in rows:
        x = 4
        for c in r:
            blit(img, c, x, y); x += c.shape[1]
        y += max(c.shape[0] for c in r)
    return Image.fromarray(img).resize((img.shape[1] * scale, img.shape[0] * scale), Image.NEAREST)


def closeup(sprites, scale=8):
    sel = [(n, f[0]) for n, f, m in sprites if n.split('/')[2] == 'idle']
    CW, CH = 18, 24
    per = 12
    nrow = (len(sel) + per - 1) // per
    img = np.zeros((nrow * CH, per * CW, 4), np.uint8); img[...] = BG
    for i, (n, (f, (ax, ay))) in enumerate(sel):
        blit(img, f, (i % per) * CW + 9 - ax, (i // per) * CH + 21 - ay)
    return Image.fromarray(img).resize((img.shape[1] * scale, img.shape[0] * scale), Image.NEAREST)


# ---------------- test scene ----------------
def test_scene(sprites, scale=3):
    atlas = json.load(open(os.path.join(OUT, 'atlas.json')))
    sheets = [np.array(Image.open(os.path.join(OUT, s['file'])).convert('RGBA')) for s in atlas['sheets']]
    def town(name, k=0):
        e = atlas['sprites'][name]
        x, y, w, h, ax, ay = e['frames'][k]
        return sheets[e['sheet']][y:y + h, x:x + w], (ax, ay)
    ppl = {n: f for n, f, m in sprites}
    def person(key, d, k=0):
        base = key + '/' + ('se' if d in ('se', 'sw') else 'ne')
        f, a = ppl[base][k % len(ppl[base])]
        if d in ('sw', 'nw'):
            f, a = mirrored(f, a)
        return f, a
    W, H = 300, 200
    O = (120, 70)
    img = np.zeros((H, W, 4), np.uint8); img[..., :3] = (159, 174, 85); img[..., 3] = 255
    def proj(x, z, y=0.0):
        return int(round(O[0] + 8 * (x - z))), int(round(O[1] + 4 * (x + z) - 8 * y))
    DECK = 0.75     # the committed platform tiles' deck height (u)
    objs = []
    def put(f, a, x, z, y=0.0, order=None):
        objs.append(((order if order is not None else (x + z)), f, a, x, z, y))
    # track along x at z = 0, platform 1 from z = 1.4 to 6
    for x in range(-14, 22):
        f, a = town('track.straight'); sx, sy = proj(x, 0); blit(img, f, sx - a[0], sy - a[1])
    for x in range(-8, 14):
        for z in range(1, 6):
            nm = 'platform.edge_s.v%d' % (x % 2) if z == 5 else 'platform.top.v%d' % ((x * 7 + z * 3) % 4)
            f, a = town(nm); put(f, a, x, z, order=-100 + x + z)
    # the coach on the track, door near x = 1.75 (a quarter of its length from its centre)
    f, a = town('train.coach.e'); put(f, a, 3.5, 0, order=3.5 + 0.0)
    # queue at the coach door: travellers facing ne (towards the coach, -z), the agent beside them facing sw
    queue = ['ppl/woman_bonnet', 'ppl/man_top', 'ppl/man_bag', 'ppl/woman_shawl.b', 'ppl/child', 'ppl/man_bowler.b']
    for k, key in enumerate(queue):
        x, z = 1.8 - k * 0.95, 1.9 + (k % 2) * 0.25
        if k == 0:
            f, a = person(key + '/ticket', 'ne', 0)
        else:
            f, a = person(key + '/idle', 'ne', k)
        put(f, a, x, z, DECK)
    f, a = person('ppl/agent/punch', 'sw', 1); put(f, a, 2.6, 2.7, DECK)
    f, a = person('ppl/man_top.b/board', 'ne', 1); put(f, a, -2.2, 1.5, DECK + 0.25)
    # walkers on the platform
    f, a = person('ppl/woman_bonnet.b/walk', 'se', 1); put(f, a, 7.0, 3.6, DECK)
    f, a = person('ppl/worker/walk', 'nw', 2); put(f, a, 9.5, 2.6, DECK)
    f, a = person('ppl/porter/walk', 'sw', 0); put(f, a, -5.5, 4.2, DECK)
    f, a = person('ppl/smith/idle', 'se', 0); put(f, a, -7.2, 7.2)
    f, a = person('ppl/storekeeper/idle', 'sw', 0); put(f, a, -4.0, 8.0)
    f, a = person('ppl/barkeep/walk', 'nw', 3); put(f, a, 0.0, 8.2)
    f, a = person('ppl/cowhand/idle', 'se', 0); put(f, a, 3.0, 8.4)
    f, a = person('ppl/agent/wave', 'ne', 0); put(f, a, 11.0, 2.2, DECK)
    # the agent carrying a crate (the crate drawn at the hands offset, over the agent in se)
    hx, hy = PE.CARRY_HANDS['se']
    f, a = person('ppl/agent/carry', 'se', 1)
    cf, ca = town('goods.crate.store')
    sx, sy = proj(5.5, 4.4, DECK)
    objs.append((5.5 + 4.4, f, a, 5.5, 4.4, DECK))
    objs.append((5.5 + 4.4 + 0.01, cf, (ca[0] - hx, ca[1] - hy), 5.5, 4.4, DECK))
    # the same with the contract's default hands offset (0, -9), for comparison
    f, a = person('ppl/agent/carry', 'se', 3)
    objs.append((3.6 + 4.6, f, a, 3.6, 4.6, DECK))
    objs.append((3.6 + 4.6 + 0.01, cf, (ca[0], ca[1] + 9), 3.6, 4.6, DECK))
    # a sack carried away from the viewer (ne): the sack is drawn first, behind the agent
    sf, sa = town('goods.sack.saloon')
    hx2, hy2 = PE.CARRY_HANDS['ne']
    f, a = person('ppl/agent/carry', 'ne', 1)
    objs.append((8.4 + 4.9 - 0.01, sf, (sa[0] - hx2, sa[1] - hy2), 8.4, 4.9, DECK))
    objs.append((8.4 + 4.9, f, a, 8.4, 4.9, DECK))
    # the agent pushing the handcart along +x on the ground in front of the platform
    cf, ca = town('handcart.loaded.e')
    objs.append((14.0 + 8.0, cf, ca, 14.0, 8.0, 0.0))
    f, a = person('ppl/agent/push', 'se', 1)
    gx, gy = PE.PUSH_GRIP['se']
    objs.append((14.0 + 8.0 - 0.01, f, a, 14.0 - PE.CART_BEHIND, 8.0, 0.0))
    objs.sort(key=lambda o: o[0])
    for _, f, a, x, z, y in objs:
        sx, sy = proj(x, z, y)
        blit(img, f, sx - a[0], sy - a[1])
    return Image.fromarray(img).resize((W * scale, H * scale), Image.NEAREST)


def main():
    sprites = PE.build_all()
    os.makedirs(OUT, exist_ok=True)
    contact(sprites).save(os.path.join(OUT, 'people-contact.png'), optimize=True)
    closeup(sprites).save(os.path.join(OUT, 'people-closeup.png'), optimize=True)
    test_scene(sprites).save(os.path.join(OUT, 'people-testscene.png'), optimize=True)
    n = sum(len(f) for _, f, _ in sprites)
    print(f'{len(sprites)} people sprites, {n} frames; wrote people-contact.png, people-closeup.png, people-testscene.png')


if __name__ == '__main__':
    main()
