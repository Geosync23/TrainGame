# Review images: a contact sheet of every sprite at 3x with its name, and a test scene assembled only from
# the finished sheets and atlas (the way the game will draw them), to prove the sprites line up.
import os, json, math
import numpy as np
from PIL import Image
import font as FT

BG = (178, 160, 122, 255)


def load(atlas, out):
    sheets = [np.array(Image.open(os.path.join(out, s['file'])).convert('RGBA')) for s in atlas['sheets']]
    def frame(name, k=0):
        e = atlas['sprites'][name]
        x, y, w, h, ax, ay = e['frames'][k]
        return sheets[e['sheet']][y:y + h, x:x + w], (ax, ay)
    return frame


def blit(dst, img, x, y):
    """Alpha-blend img onto dst at integer (x, y)."""
    h, w = img.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x0 >= x1 or y0 >= y1: return
    s = img[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    d = dst[y0:y1, x0:x1].astype(np.float32)
    a = s[..., 3:4] / 255.0
    d[..., :3] = s[..., :3] * a + d[..., :3] * (1 - a)
    d[..., 3] = np.maximum(d[..., 3], s[..., 3])
    dst[y0:y1, x0:x1] = d.astype(np.uint8)


def label(text, colour=(43, 32, 38, 255)):
    return FT.text_image(text, colour)


def contact_sheet(atlas, out, scale=3, width=640):
    frame = load(atlas, out)
    cells = []
    for name, e in atlas['sprites'].items():
        if name.startswith('font.'): continue
        imgs = [frame(name, k) for k in range(len(e['frames']))]
        fw = sum(i.shape[1] + 3 for i, _ in imgs)
        ups = max(a[1] for _, a in imgs); downs = max(i.shape[0] - a[1] for i, a in imgs)
        lb = label(name)
        cw = max(fw, lb.shape[1]) + 6; ch = ups + downs + FT.LINE_H + 6
        cell = np.zeros((ch, cw, 4), np.uint8)
        x = 0
        for img, (ax, ay) in imgs:
            blit(cell, img, x, ups - ay)
            cell[ups, x + ax] = (255, 40, 40, 255)  # anchor dot
            x += img.shape[1] + 3
        blit(cell, lb, 0, ups + downs + 2)
        cells.append(cell)
    # font row
    g = FT.glyphs()
    s1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789'
    s2 = 'abcdefghijklmnopqrstuvwxyz .,:;!?-+/()&$#%_='
    rows = [FT.text_image(s1), FT.text_image(''.join(c for c in s2 if c in g)), FT.text_image('9:15  No. 2 Express  Track 1  on time')]
    fw = max(r.shape[1] for r in rows)
    cell = np.zeros((len(rows) * 9 + FT.LINE_H + 4, fw + 4, 4), np.uint8)
    for k, r in enumerate(rows):
        blit(cell, np.where(r[..., 3:4] > 0, np.array([43, 32, 38, 255], np.uint8), r), 0, k * 9)
    blit(cell, label('font (white in the sheet, tinted here)'), 0, len(rows) * 9 + 2)
    cells.append(cell)
    # shelf layout
    x = y = 0; shelf = 0; pos = []
    for c in cells:
        if x + c.shape[1] > width:
            x = 0; y += shelf + 4; shelf = 0
        pos.append((x, y)); x += c.shape[1] + 4; shelf = max(shelf, c.shape[0])
    sheet = np.zeros((y + shelf + 4, width, 4), np.uint8); sheet[:] = BG
    for c, (x, y) in zip(cells, pos):
        blit(sheet, c, x + 2, y + 2)
    im = Image.fromarray(sheet).resize((sheet.shape[1] * scale, sheet.shape[0] * scale), Image.NEAREST)
    im.save(os.path.join(out, 'contact.png'), optimize=True)
    print('  contact.png:', im.size)


# ---------------- test scene ----------------
def proj(x, z, y=0.0, O=(0, 0)):
    return int(round(O[0] + 8 * (x - z))), int(round(O[1] + 4 * (x + z) - 8 * y))


def test_scene(atlas, out, scale=3):
    """A small station in the D25 layout, from the sheets only. Viewer at +z (lower left):
    platform 1 with the depot nearest, then track A (z 0) and track B (z -3) with crossovers between them,
    the island platform (z -7..-4), track C (z -8), the freight yard and shed, then the street and shops."""
    frame = load(atlas, out)
    W, H = 440, 340
    O = (170, 196)
    img = np.zeros((H, W, 4), np.uint8); img[..., :3] = (159, 174, 85); img[..., 3] = 255
    sprites = atlas['sprites']
    flat, objs = [], []
    PLAT = [(-8, 16, 1, 5), (-8, 16, -7, -4)]       # x0, x1, z0, z1 of the two platforms (game units)

    def on_platform(x, z):
        return any(x0 <= x < x1 and z0 <= z < z1 for x0, x1, z0, z1 in PLAT)

    def put_flat(name, x, z, k=0):
        flat.append((name, k, x, z))

    def put(name, x, z, k=0, zfront=None, y=0.0, lift=None):
        if lift is None:
            lift = 0.75 if (name.split('.')[0] in ('person', 'prop', 'goods', 'handcart') and on_platform(x, z)) else 0.0
        objs.append(((zfront if zfront is not None else z), x, name, k, z, y + lift))

    # ground: grass tiles everywhere, a dirt street and yard
    for gx in range(-48, 48, 8):
        for gz in range(-48, 48, 8):
            put_flat('ground.grass.v%d' % ((gx // 8 * 7 + gz // 8 * 5) % 3), gx, gz)
    for gx in range(-20, 28, 2):
        for gz in (-16, -14):
            put_flat('ground.dirt', gx, gz)
    for gx in range(12, 26, 2):
        put_flat('ground.dirt', gx, -12); put_flat('ground.dirt', gx, -10)
    # tracks
    XS, XE = -24, 30
    xover = [(-14, 'a', 'normal'), (16, 'b', 'reverse')]
    in_x = lambda x: any(x0 <= x < x0 + 10 for x0, _, _ in xover)
    for x in range(XS, XE):
        if not in_x(x):
            put_flat('track.straight', x, 0); put_flat('track.straight', x, -3)
        if x >= -20:
            put_flat('track.straight', x, -8)
    for x0, kind, st in xover:
        put_flat(f'track.crossover_3u.{kind}.{st}', x0, -3)
    put('track.buffer.w', -20, -8, zfront=-8)
    # plank walkway from platform 1 over tracks A and B to the island
    put_flat('walkway.track', 2, 0); put_flat('walkway.track', 2, -3)
    # platforms
    for x in range(-8, 16):
        for z in range(1, 5):
            nm = 'platform.edge_s.v%d' % (x % 2) if z == 4 else 'platform.top.v%d' % ((x * 7 + z * 3) % 4)
            if x == 15: nm = 'platform.corner_se' if z == 4 else 'platform.edge_e'
            if z == 1 and x == 2: nm = 'platform.steps_n'
            put(nm, x, z, zfront=z + 0.98)
        for z in range(-7, -4):
            nm = 'platform.edge_s.v%d' % (x % 2) if z == -5 else 'platform.top.v%d' % ((x * 5 + z) % 4)
            if x == 15: nm = 'platform.corner_se' if z == -5 else 'platform.edge_e'
            if z == -5 and x == 2: nm = 'platform.steps_s'
            put(nm, x, z, zfront=z + 0.98)
    put('building.depot', 5, 3.8, zfront=5.0)
    put('prop.lamp_post', 10.5, 1.6); put('prop.lamp_post_lit', 9.5, -5.6)
    put('prop.water_barrel', 0.5, 2.7)
    # freight yard: shed, goods, handcart
    put('building.shed', 20, -11.6, zfront=-10.5)
    for nm, x, z in (('goods.crate.store', 16.6, -10.6), ('goods.sack.saloon', 17.4, -10.0),
                     ('goods.barrel.smithy', 15.8, -10.0), ('goods.crate.saloon', 16.9, -11.4),
                     ('goods.crate.plain', 13.4, -10.2)):
        put(nm, x, z)
    put('handcart.loaded.e', 12.0, -10.4)
    put('prop.switch_stand.normal', -14.0, 1.9); put('prop.switch_stand.reverse', 26.2, 1.9)
    # shops, houses, trees
    for nm, x in (('store', -12), ('smithy', -4), ('saloon', 4)):
        put('building.' + nm, x, -19, zfront=-17)
    put('building.house1', 13, -20, zfront=-18.5); put('building.house2', -20, -21, zfront=-19.7)
    put('building.water_tower', 24, -6, zfront=-5)
    for nm, x, z in (('tree.1', -22, -12), ('tree.2', 20, -21), ('tree.3', 28, -15), ('tree.1', -12, 11),
                     ('tree.2', 22, 9), ('tree.3', 8, 11), ('tree.1', -26, 4), ('tree.3', 30, 3)):
        put(nm, x, z)
    for k in range(6):
        put('prop.fence_x', -6 + k, 9)
    # passenger train on track A heading +x
    x = 14.0
    for nm, L in (('train.loco_passenger.e', 6.0), ('train.tender_passenger.e', 2.75), ('train.coach.e', 7.0),
                  ('train.coach.e', 7.0), ('train.coach.e', 7.0)):
        put(nm, x - L / 2, 0, k=1 if 'loco' in nm else 0, zfront=0.0)
        x -= L
    put('fx.smoke2', 13.4, 0, zfront=0.01, y=3.2); put('fx.smoke3', 12.4, -0.3, zfront=0.01, y=4.4)
    # freight train on track C heading -x, standing at the yard
    x = -2.0
    for nm, L in (('train.loco_freight.w', 6.0), ('train.tender_freight.w', 2.75), ('train.boxcar_open.w', 5.0),
                  ('train.flatcar_loaded.w', 4.0), ('train.boxcar_closed.w', 5.0), ('train.flatcar_empty.w', 4.0)):
        put(nm, x + L / 2, -8, k=2 if 'loco' in nm else 0, zfront=-8.0)
        x += L
    # travellers lined up at the middle coach's door, the agent punching tickets
    for k, (t, d) in enumerate((('lady', 'n'), ('gent', 'n'), ('drummer', 'n'), ('farmwife', 'n'), ('child', 'n'),
                                ('merchant', 'n'), ('cowhand', 'w'))):
        put(f'person.{t}.idle.{d}', -1.6 - k * 0.75, 1.75 + (k % 2) * 0.3)
    put('person.agent.punch.w', -0.6, 1.7, k=1)
    put('person.farmer.walk.e', -6.0, 3.2, k=1); put('person.barkeep.walk.w', 12.0, 3.0, k=3)
    put('person.gent.board.n', -9.0, 1.4, k=1)
    put('person.agent.carry_crate_store.w', 14.6, -10.0, k=2)
    put('person.storekeeper.idle.s', -12.5, -15.6); put('person.smith.idle.s', -4.6, -15.6)
    put('person.lady.walk.e', 0.0, -14.5, k=0); put('person.child.walk.w', 8.0, -14.0, k=2)
    put('person.merchant.walk.s', 6.0, -5.8, k=1); put('person.farmwife.idle.e', 4.0, -6.2)

    missing = sorted({o[0] for o in flat if o[0] not in sprites} | {o[2] for o in objs if o[2] not in sprites})
    if missing:
        print('  test scene: missing sprites (skipped):', ', '.join(missing))
    flat = [o for o in flat if o[0] in sprites]
    objs = [o for o in objs if o[2] in sprites]
    for name, k, x, z in flat:
        k = min(k, len(sprites[name]['frames']) - 1)
        f, (ax, ay) = frame(name, k)
        sx, sy = proj(x, z, 0, O)
        blit(img, f, sx - ax, sy - ay)
    objs.sort(key=lambda o: (o[0], o[1]))
    for zf, x, name, k, z, y in objs:
        k = min(k, len(sprites[name]['frames']) - 1)
        f, (ax, ay) = frame(name, k)
        sx, sy = proj(x, z, y, O)
        blit(img, f, sx - ax, sy - ay)
    Image.fromarray(img).save(os.path.join(out, 'testscene-native.png'))
    Image.fromarray(img).resize((W * scale, H * scale), Image.NEAREST).save(os.path.join(out, 'testscene.png'), optimize=True)
    print('  testscene.png:', (W * scale, H * scale))


