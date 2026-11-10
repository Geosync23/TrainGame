#!/usr/bin/env python3
# Town test scene (buildings-and-town artist): python3 tools/pixelart/town_scene.py, after build.py.
# Puts the station, canopy, schedule board, storage shed, the shops (by parts), houses, church, water tower,
# trees, fences, props, goods and carts on the ground layer, from the finished sheets and atlas only, where
# proto-layout.json has them (scenery where it looks right), sorted back to front the way a renderer would.
# Writes out/town-testscene.png (3x) and out/town-testscene-native.png, and out/bridge-testscene.png: the two
# footbridges with a train passing under them and people on the stairs and decks.
import os, sys, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import review as RV
import groundlayer as GL

OUT = os.path.join(HERE, 'out')


def main(scale=3):
    info = json.load(open(os.path.join(OUT, 'atlas.json')))
    frame = RV.loader(info, OUT)
    F = info['frames']
    meta = {k: info.get('extra', {}).get(k, {}) for k in F}
    L = GL.load_layout()
    OX, OY = L['proj']['OX'], L['proj']['OY']
    img = frame('ground')[0].copy()
    objs = []

    def sxy(x, z, y=0.0):
        return int(round(OX + 8 * (x - z))), int(round(OY + 4 * (x + z) - 8 * y))

    def put(key, x, z, depth=None, lift=0):
        if key not in F:
            print('  missing', key)
            return
        objs.append((x + z if depth is None else depth, len(objs), key, x, z, lift))

    def put_box(key, x, z, box, lift=0):
        # sort a building part by the middle of its box (x + z of the box centre)
        x0, z0, x1, z1 = box[:4]
        put(key, x, z, depth=x + z + (x0 + x1) / 2 + (z0 + z1) / 2, lift=lift)

    def m(key):
        return meta.get(key, {})

    # --- station, canopy, schedule board, storage, lamps from the layout
    for b in L['buildings']:
        if b['kind'] == 'station':
            put('bld/station', b['x'], b['z'], depth=b['x'] + b['z'] + 1.5)
        elif b['kind'] == 'storage':
            put('bld/storage_open', b['x'], b['z'], depth=b['x'] + b['z'] + 1.0)
        elif b['kind'] == 'lamp':
            put('bld/lamp_lit' if b['x'] > 0 else 'bld/lamp', b['x'], b['z'])
    c = L['canopy']
    put('bld/canopy', (c['x0'] + c['x1']) / 2, (c['z0'] + c['z1']) / 2, depth=(c['x0'] + c['x1']) / 2 + c['z1'] + 0.5)
    put('bld/schedboard', L['schedboard']['x'], L['schedboard']['z'])
    put('bld/sign_saloon', 4.0, -25.2)
    # --- shops, by parts, facing the street
    for sp in L['shops']:
        b = next(bb for bb in L['buildings'] if bb['id'] == sp['bld'])
        f = 'e' if b['x'] < 0 else 'w'
        for part in ('body', 'awning', 'anvil'):
            key = f'bld/shop_{sp["id"]}/{f}/{part}'
            if key in F:
                put_box(key, b['x'], b['z'], m(key).get('box', [0, 0, 0, 0]))
    # --- houses up the street, the church at its far end, the water tower by the line
    for k, (x, z, f) in enumerate(((-8.5, -55.0, 'e'), (9.0, -46.0, None), (9.5, -56.0, None))):
        key = f'bld/house/{k + 1}' + ('/e' if f == 'e' else '')
        put(key, x, z, depth=x + z + 2.0)
    put('bld/church', 0.5, -64.0, depth=-62.0)
    put('bld/watertower', -26.0, -12.0)
    # --- trees, fences, scenery
    for i, (x, z) in enumerate(((-16, -22), (16, -24), (-14, -50), (17, -36), (-22, -32), (20, -52), (-26, 12),
                                (26, 14), (6, -20), (-20, -14))):
        put(f'bld/tree/{i % 3 + 1}', x, z)
    for x in range(13, 21):
        put('bld/fence_x', x, -60.5)
    for z in range(-60, -50):
        put('bld/fence_z', 13.0, z)
    put('bld/hitch_z', -3.8, -38.0)
    put('bld/horse', -2.6, -37.6)
    put('prop/water_barrel', -4.6, -25.6)
    put('prop/crates', 4.9, -24.4)
    put('prop/barrels', 4.9, -27.0)
    put('prop/sacks', 8.0, -15.0)
    put('bld/bench_x', -4.0, -11.6, lift=3)
    put('bld/bench_x', 2.0, -11.6, lift=3)
    put('prop/shelf', -1.0, 3.2, lift=3)
    for i, (x, z) in enumerate(((-11, -20), (12, -21), (-7, -40), (6, -38), (-18, -8), (20, -10), (14, -30))):
        put(f'prop/tuft/{i % 4 + 1}', x, z)
    # --- goods with tags on platform 2 by the shed, and carts
    for i, (kind, tag) in enumerate((('crate', 'store'), ('sack', 'smithy'), ('barrel', 'saloon'), ('crate', 'saloon'),
                                     ('bale', 'any'), ('keg', 'saloon'), ('mailSack', 'out'))):
        x, z = -9.0 + i * 1.1, 6.6
        put(f'goods/{kind}', x, z, lift=3)
        ax, ay = 0, 0
        tx, ty = m(f'goods/{kind}').get('tag_at', [0, -4])
        sx, sy = sxy(x, z)
        objs.append((x + z + 0.01, len(objs), f'tag/{tag}', x, z, ('px', sx + tx, sy + ty - 3)))
    put('cart/se/loaded', 9.0, 5.8, lift=3)
    put('cart/ne', 12.0, -9.0, lift=3)
    put('cart/sw/loaded', -2.4, -28.0)
    put('goods/crate/carried/store', 6.2, 6.6, lift=3)
    # --- a few people (the contract's keys, or the first build's while the people module catches up)
    for key, alt, x, z in (('ppl/agent/carry/se/0', 'person.agent.carry_crate.e/0', -2.9, -27.2),
                           ('ppl/man_top/idle/se/0', 'person.gent.idle.e', 3.6, -22.0),
                           ('ppl/woman_bonnet/idle/ne/0', 'person.lady.idle.n', 4.4, -31.6),
                           ('ppl/agent/push/se/0', 'person.agent.walk.e/1', 7.6, 5.8),
                           ('ppl/agent/idle/se/0', 'person.agent.idle.e', 6.0, -9.8)):
        k = key if key in F else (alt if alt in F else None)
        if k:
            put(k, x, z, lift=3 if z > -13 else 0)
    objs.sort(key=lambda o: (o[0], o[1]))
    for depth, _, key, x, z, lift in objs:
        f, (ax, ay) = frame(key)
        if isinstance(lift, tuple):
            RV.blit(img, f, lift[1] - ax, lift[2] - ay)
            continue
        sx, sy = sxy(x, z)
        RV.blit(img, f, sx - ax, sy - ay - lift)
    x0, _ = sxy(-20, 8)
    x1, _ = sxy(12, -66)
    _, y0 = sxy(-4, -66, 7)
    _, y1 = sxy(20, 10)
    crop = img[max(0, y0):min(img.shape[0], y1), max(0, x0):min(img.shape[1], x1)]
    Image.fromarray(crop).save(os.path.join(OUT, 'town-testscene-native.png'))
    Image.fromarray(crop).resize((crop.shape[1] * scale, crop.shape[0] * scale), Image.NEAREST).save(
        os.path.join(OUT, 'town-testscene.png'), optimize=True)
    print('town-testscene.png:', crop.shape[1] * scale, 'x', crop.shape[0] * scale)



def bridge_scene(scale=3):
    """The two footbridges with a passenger train passing under them on track 1, a boxcar on track 2, and people
    on the stairs and decks. Writes out/bridge-testscene.png."""
    import sprites_town as STN
    info = json.load(open(os.path.join(OUT, 'atlas.json')))
    frame = RV.loader(info, OUT)
    F = info['frames']
    ex = info.get('extra', {})
    L = GL.load_layout()
    OX, OY = L['proj']['OX'], L['proj']['OY']
    img = frame('ground')[0].copy()
    t1, t2 = L['tracks']['t1z'], L['tracks']['t2z']
    objs = []

    def sxy(x, z, y=0.0):
        return int(round(OX + 8 * (x - z))), int(round(OY + 4 * (x + z) - 8 * y))

    def put(key, x, z, y=0.0, order=None, mirror=False):
        if key not in F:
            print('  missing', key); return
        objs.append(((x + z) if order is None else order, len(objs), key, x, z, y, mirror))

    BIG = 1000.0
    for b in L['buildings']:
        if b['kind'] == 'station':
            put('bld/station', b['x'], b['z'], order=b['x'] + b['z'] + 1.5)
        elif b['kind'] == 'storage':
            put('bld/storage', b['x'], b['z'], order=b['x'] + b['z'] + 1.0)
        elif b['kind'] == 'lamp':
            put('bld/lamp', b['x'], b['z'], y=0.375)
    c = L['canopy']
    put('bld/canopy', (c['x0'] + c['x1']) / 2, (c['z0'] + c['z1']) / 2, order=(c['x0'] + c['x1']) / 2 + c['z1'] + 0.5)
    # the train under the bridges on track 1 (heading east), a boxcar on track 2
    put('veh/loco/e/0', 9.0, t1, order=9.0 + t1 + 1.0)
    for k in range(3):
        x = 9.0 - 7.2 - k * 5.8
        put('veh/coach/e', x, t1, order=x + t1 + 1.0)
    put('veh/boxcar/w', -6.0, t2, order=-6.0 + t2 + 1.0)
    for fb in STN.footbridges(L):
        bx = fb['x']
        def part(nm, order):
            put(f'bld/footbridge/{nm}', bx, 0.0, order=order)
        for k, z in enumerate((-7.625, -2.515, 2.225)):
            part(f'bent{k}', bx + z + 0.3)
        for plat, zc in (('p1', -7.625), ('p2', 2.225)):
            d = fb[plat]
            nm = f'stair_{plat}_{d}'
            h = ex[f'bld/footbridge/{nm}']['height']
            xm = bx + (h['walk_top'][0] + h['walk_bottom'][0]) / 2
            part(nm, xm + zc - 0.6)
            # a walker halfway up the flight
            f = 0.45
            wx = bx + h['walk_top'][0] + (h['walk_bottom'][0] - h['walk_top'][0]) * f
            wy = h['walk_top'][2] + (h['walk_bottom'][2] - h['walk_top'][2]) * f
            going_down = plat == 'p2'
            if d == 'e':
                key, mir = ('ppl/man_top/walk/se/1', False) if going_down else ('ppl/woman_bonnet/walk/ne/1', True)
            else:
                key, mir = ('ppl/agent/walk/se/2', True) if going_down else ('ppl/man_bag/walk/ne/2', False)
            put(key, wx, zc, y=wy, order=xm + zc - 0.5, mirror=mir)
            part(nm + '_rail', xm + zc - 0.4)
        hd = ex['bld/footbridge/deck']['height']
        part('deck', BIG + bx)
        put('ppl/woman_shawl/walk/ne/0', bx - 0.1, -4.0, y=hd['walk_y'], order=BIG + bx + 0.1)
        put('ppl/child/walk/se/1', bx + 0.1, -0.8, y=hd['walk_y'], order=BIG + bx + 0.2)
        part('rail', BIG + bx + 0.5)
    # people waiting on the platforms
    for k, (key, x, z) in enumerate((('ppl/man_bowler/idle/se/0', -1.0, -7.4), ('ppl/agent/idle/se/0', 1.4, -7.0),
                                      ('ppl/porter/idle/se/0', 9.0, 2.0), ('ppl/woman_shawl/idle/ne/0', -10.0, 2.2))):
        put(key, x, z, y=0.375)

    objs.sort(key=lambda o: (o[0], o[1]))
    for order, _, key, x, z, y, mir in objs:
        f, (ax, ay) = frame(key)
        if mir:
            f = f[:, ::-1]; ax = f.shape[1] - ax
        sx, sy = sxy(x, z, y)
        RV.blit(img, f, sx - ax, sy - ay)
    x0, _ = sxy(-16, 6)
    x1, _ = sxy(18, -12)
    _, y0 = sxy(-12, -18, 8)
    _, y1 = sxy(16, 8)
    crop = img[max(0, y0):min(img.shape[0], y1), max(0, x0):min(img.shape[1], x1)]
    Image.fromarray(crop).save(os.path.join(OUT, 'bridge-testscene-native.png'))
    Image.fromarray(crop).resize((crop.shape[1] * scale, crop.shape[0] * scale), Image.NEAREST).save(
        os.path.join(OUT, 'bridge-testscene.png'), optimize=True)
    print('bridge-testscene.png:', crop.shape[1] * scale, 'x', crop.shape[0] * scale)

if __name__ == '__main__':
    main()
    bridge_scene()
