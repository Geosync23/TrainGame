# Review images: a contact sheet of every sprite at 3x with its key, and a test scene put together only from the
# finished sheets and ground layer (the way the game draws them), to prove the sprites line up.
import os, re, json, math
import numpy as np
from PIL import Image
import font as FT
import groundlayer as GL

BG = (178, 160, 122, 255)


def loader(info, out):
    sheets = [np.array(Image.open(os.path.join(out, s['file'])).convert('RGBA')) for s in info['sheets']]
    def frame(key):
        gi, x, y, w, h, ax, ay = info['frames'][key]
        return sheets[gi][y:y + h, x:x + w], (ax, ay)
    return frame


def blit(dst, img, x, y):
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


def contact_sheet(info, out, scale=3, width=700):
    frame = loader(info, out)
    groups = {}
    for key in info['frames']:
        if key == 'ground' or key.startswith('font/'): continue
        base = re.sub(r'/\d+$', '', key) if not key.startswith('sw/points') else key
        groups.setdefault(base, []).append(key)
    cells = []
    for base, keys in groups.items():
        imgs = [frame(k) for k in keys]
        fw = sum(i.shape[1] + 3 for i, _ in imgs)
        ups = max(max(a[1] for _, a in imgs), 0); downs = max(max(i.shape[0] - a[1] for i, a in imgs), 0)
        lb = label(base + (f' x{len(keys)}' if len(keys) > 1 else ''))
        cw = max(fw, lb.shape[1]) + 6; ch = ups + downs + FT.LINE_H + 6
        cell = np.zeros((ch, cw, 4), np.uint8)
        x = 0
        for img, (ax, ay) in imgs:
            blit(cell, img, x, ups - ay)
            if 0 <= ups < ch and 0 <= x + ax < cw:
                cell[ups, x + ax] = (255, 40, 40, 255)  # anchor dot
            x += img.shape[1] + 3
        blit(cell, lb, 0, ups + downs + 2)
        cells.append(cell)
    g = FT.glyphs()
    rows = [FT.text_image('ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789'),
            FT.text_image(''.join(c for c in 'abcdefghijklmnopqrstuvwxyz .,:;!?-+/()&$#%_=' if c in g)),
            FT.text_image('9:15  No. 2 Express  Track 1  on time')]
    fw = max(r.shape[1] for r in rows)
    cell = np.zeros((len(rows) * 9 + FT.LINE_H + 4, fw + 4, 4), np.uint8)
    for k, r in enumerate(rows):
        blit(cell, np.where(r[..., 3:4] > 0, np.array([43, 32, 38, 255], np.uint8), r), 0, k * 9)
    blit(cell, label('font/<code>: white in the sheet, tinted here'), 0, len(rows) * 9 + 2)
    cells.append(cell)
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
def test_scene(info, out, scale=3):
    """The prototype station from proto-layout.json: the ground layer, trains standing at the platforms and on the
    crossover legs, switch stands and points, and people and buildings where their artists have made them."""
    frame = loader(info, out)
    F = info['frames']
    L = GL.load_layout()
    p = L['proj']
    OX, OY = p['OX'], p['OY']
    ground, _ = frame('ground')
    img = ground.copy()
    objs = []

    def pick(keys):
        for k in keys:
            if k in F: return k
        return None

    def sxy(x, z, y=0.0):
        return int(round(OX + 8 * (x - z))), int(round(OY + 4 * (x + z) - 8 * y))

    def put(keys, x, z, zfront=None, lift_px=0, overlay=False):
        k = pick(keys if isinstance(keys, (list, tuple)) else [keys])
        if k is None: return
        objs.append((-1e9 if overlay else (zfront if zfront is not None else z), x, k, z, lift_px))

    t1, t2, t3 = L['tracks']['t1z'], L['tracks']['t2z'], L['tracks']['t3z']
    # switch E1 set for the crossover (its stand red); the others straight
    for sw in L['switches']:
        st = 'R' if sw['name'] == 'E1' else 'N'
        put(f'sw/points/{sw["id"]}/{st}', sw['node'][0], sw['node'][1], overlay=True)
        put(f'sw/stand/{st}', sw['stand'][0], sw['stand'][1])
    # passenger train at platform 1 on track 1, heading east, at the east stop
    x = L['stops']['t1']['E'] - 4.4
    put('veh/loco/e/1', x, t1, zfront=t1 + 1.0)
    x -= 4.4
    for k in range(3):
        x -= 2.8
        put('veh/coach/e', x, t1, zfront=t1 + 1.0)
        x -= 2.8
    # freight on track 3 heading west
    x = L['stops']['t3']['W'] + 4.4
    put('veh/loco_freight/w/0', x, t3, zfront=t3 + 1.0)
    x += 4.4
    for key in ('veh/boxcar_open/w', 'veh/flatcar_loaded/w', 'veh/boxcar/w', 'veh/flatcar/w'):
        x += 2.5
        put(key, x, t3, zfront=t3 + 1.0)
        x += 2.5
    # stock on the crossover legs (30 degrees)
    edges = {e['id']: e for e in L['edges']}
    def mid(eid):
        q = edges[eid]['pts']; return q[len(q) // 2]
    m = mid(16); put('veh/loco/w+30/0', m[0], m[1], zfront=m[1] + 1.0)
    m = mid(10); put('veh/coach/e-30', m[0], m[1], zfront=m[1] + 1.0)
    m = mid(19); put('veh/boxcar/w-30', m[0], m[1], zfront=m[1] + 1.0)
    # buildings and people (contract keys, else the first build's names)
    for b in L['buildings']:
        if b['kind'] == 'station':
            put(['bld/station', 'building.depot'], b['x'], b['z'], zfront=b['z'] + b['d'] / 2)
        elif b['kind'] == 'storage':
            put(['bld/storage'], b['x'], b['z'], zfront=b['z'] + b['d'] / 2, lift_px=3)
        elif b['kind'] == 'lamp':
            put(['bld/lamp', 'prop.lamp_post'], b['x'], b['z'], lift_px=3)
    for key, x, z in (('bld/shop_store', -8.2, -30), ('bld/shop_saloon', 8.2, -30), ('bld/shop_smithy', -8.2, -44)):
        put(key, x, z, zfront=z + 4)
    put('bld/schedboard', L['schedboard']['x'], L['schedboard']['z'], lift_px=3)
    for i, (x, z) in enumerate(((-26, -12), (24, -14), (-30, 14), (28, 15), (10, 17), (-12, 16))):
        put([f'bld/tree/{i % 3}', f'tree.{i % 3 + 1}'], x, z)
    who = ['man_top', 'woman_bonnet', 'man_bag', 'woman_shawl', 'child', 'man_bowler']
    legacy = ['gent', 'lady', 'drummer', 'farmwife', 'child', 'merchant']
    zq = t1 - 1.44 - 0.5
    for i, (w, lg) in enumerate(zip(who, legacy)):
        put([f'ppl/{w}/idle/ne/0', f'person.{lg}.idle.n'], 3.0 - i * 0.7, zq - (i % 2) * 0.3, lift_px=3)
    put(['ppl/agent/punch/ne/1', 'person.agent.punch.n/1'], 3.8, zq + 0.1, lift_px=3)
    put(['ppl/agent/walk/se/1', 'person.agent.walk.e/1'], -10.0, zq - 2.0, lift_px=3)

    objs.sort(key=lambda o: (o[0], o[1]))
    for zf, x, key, z, lift in objs:
        f, (ax, ay) = frame(key)
        sx, sy = sxy(x, z)
        blit(img, f, sx - ax, sy - ay - lift)
    x0, _ = sxy(-36, 16)
    x1, _ = sxy(36, -16)
    _, y1 = sxy(30, 20)
    _, ytop = sxy(-6, -38, 4)
    crop = img[max(0, ytop):min(img.shape[0], y1), max(0, x0):min(img.shape[1], x1)]
    Image.fromarray(crop).save(os.path.join(out, 'testscene-native.png'))
    Image.fromarray(crop).resize((crop.shape[1] * scale, crop.shape[0] * scale), Image.NEAREST).save(
        os.path.join(out, 'testscene.png'), optimize=True)
    print('  testscene.png:', (crop.shape[1] * scale, crop.shape[0] * scale))
