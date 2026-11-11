#!/usr/bin/env python3
# D27 mock street scene and review sheets (A3): python3 tools/pixelart/street27_scene.py, after build.py.
# Puts the D27 town together at true scale from the finished sheets only (out/atlas.json and out/sheet-*.png), at the
# places plans/d27-tech.md sections 1.4, 2.1, 2.4 and 2.5 give (the layout export does not carry the D27 town yet;
# when it does, LOTS below should be read from it). The ground is composed from the tile sprites, cell by cell, the
# way the renderer will compose its chunks. Writes, in tools/pixelart/out/:
#   d27-street-scene.png      the whole street at native size (1 px = 1 game pixel)
#   d27-street-scene-3x.png   the middle of the street at 3x (what a phone shows at the default zoom, roughly)
#   d27-buildings.png         each street building put together from its parts, 2x, labelled
#   d27-nature-props.png      every nature, prop and tile sprite, 3x, labelled
#   d27-station-scene.png     the station, platform 1, the tracks and the cargo platform (+ -3x)
import os, sys, json, re
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import review as RV
import font as FT

OUT = os.path.join(HERE, 'out')
WEST = ('store', 'hotel', 'bank', 'smithy', 'livery', 'feed')
EAST = ('saloon', 'newspaper', 'barber', 'sheriff', 'undertaker', 'assay')
LOT_Z = (-38, -52, -66, -80, -94, -108)
LOTS = [(k, -15.5, z, 'e') for k, z in zip(WEST, LOT_Z)] + [(k, 15.5, z, 'w') for k, z in zip(EAST, LOT_Z)]
X0, X1, Z0, Z1 = -62, 62, -142, -22         # the part of the map shown


def hsh(a, b, s=0):
    h = (a * 374761393 + b * 668265263 + s * 2246822519) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return (h ^ (h >> 16)) & 0xffff


def cell_kind(x, z):
    """The ground tile kind for the cell whose corner is (x, z) (plan section 1.4 and 2.5)."""
    cx, cz = x + 0.5, z + 0.5
    ax = abs(cx)
    if -118 <= cz <= -28 and ax < 7:
        return 'street'
    if -128 <= cz < -118 and ax < 14:
        return 'dirt'
    if -31 <= cz <= -26 and -20 <= cx <= 40:
        return 'dirt'                                       # the depot square behind the station
    if 45 <= cx <= 55:
        return 'gravel' if 47.5 <= cx <= 52.5 else 'sand'   # the dry wash
    if -118 <= cz <= -28 and ax < 9.5:
        return 'dirt'                                       # under the boardwalks
    if -116 <= cz <= -31 and 9.5 <= ax < 21.5:
        lot = min(LOT_Z, key=lambda lz: abs(cz - lz))
        if abs(cz - lot) > 6:
            return 'drygrass'                               # the alleys: grass pushing in
        return 'dirt' if hsh(int(x), int(z), 5) % 7 else 'drygrass'
    if -118 <= cz <= -32 and 25 <= ax <= 29:
        return 'path'                                       # the back lanes
    if cz < -132 or cx < -54:
        return 'drygrass' if hsh(int(x), int(z), 3) % 3 else 'grass'
    return 'grass' if hsh(int(x) // 3, int(z) // 3, 7) % 5 else 'drygrass'


def main():
    info = json.load(open(os.path.join(OUT, 'atlas.json')))
    frame = RV.loader(info, OUT)
    F = info['frames']
    EX = info.get('extra', {})
    nvar = {}
    for k in F:
        m = re.match(r'tile/([a-z]+)/(\d+)$', k)
        if m:
            nvar[m.group(1)] = max(nvar.get(m.group(1), 0), int(m.group(2)))
    # canvas: native pixels; world (x, z) -> (OX + 8 (x - z), OY + 4 (x + z) - 8 y)
    OX = int(8 * (Z1 - X0)) + 20
    OY = int(-4 * (X0 + Z0)) + 200
    W = int(8 * (X1 - X0 + Z1 - Z0)) + 40
    Hh = int(4 * (X1 - X0 + Z1 - Z0)) + 240
    img = np.zeros((Hh, W, 4), np.uint8)
    img[..., :3] = (122, 146, 68); img[..., 3] = 255

    def sxy(x, z, y=0.0):
        return int(round(OX + 8 * (x - z))), int(round(OY + 4 * (x + z) - 8 * y))

    def blit(key, x, z, y=0.0):
        if key not in F:
            print('  missing', key)
            return
        im, (ax, ay) = frame(key)
        sx, sy = sxy(x, z, y)
        RV.blit(img, im, sx - ax, sy - ay)

    # ---- the ground, cell by cell from the tiles
    for z in range(Z0, Z1):
        for x in range(X0, X1):
            k = cell_kind(x, z)
            v = hsh(x, z) % nvar[k] + 1
            blit(f'tile/{k}/{v}', x, z)
    # ---- flat things: boardwalks, then cast shadows
    flat, objs = [], []
    for kind, lx, lz, f in LOTS:
        flat.append((0, f'bld/shop_{kind}/{f}/walk', lx, lz))
        flat.append((1, f'bld/shop_{kind}/{f}/shadow', lx, lz))
    flat += [(1, 'bld/church/shadow', 0, -128), (1, 'bld/school/shadow', -20, -128)]
    for o, key, x, z in sorted(flat):
        blit(key, x, z)

    def put(key, x, z, depth=None):
        bx = EX.get(key, {}).get('box')
        if depth is None and bx:
            depth = x + z + (bx[0] + bx[2]) / 2 + (bx[1] + bx[3]) / 2
        objs.append((x + z if depth is None else depth, len(objs), key, x, z))

    for kind, lx, lz, f in LOTS:
        for part in ('body', 'yard', 'awning', 'sign', 'pole'):
            key = f'bld/shop_{kind}/{f}/{part}'
            if key in F or key + '/0' in F:
                put(key if key in F else key + '/0', lx, lz)
        for item in EX.get(f'bld/shop_{kind}/{f}/body', {}).get('dressing', []):
            k, dx, dz = item
            if k.startswith('prop/horse/'):
                k = k.replace('/bay', ['/bay', '/grey', '/dun'][int(abs(lz)) % 3]) + '/0'
            put(k, lx + dx, lz + dz)
    put('bld/church', 0, -128)
    put('bld/school', -20, -128)
    for (x, z) in ((-35, -40), (-35, -60), (-35, -80), (-35, -100)):
        put(f'bld/house/{(int(-z) // 20) % 4 + 1}/e', x, z)
    for (x, z) in ((35, -40), (35, -60), (35, -80), (35, -100)):
        put(f'bld/house/{(int(-z) // 20 + 2) % 4 + 1}/w', x, z)
    # the livery's corral behind the barn
    for k in range(4):
        put('prop/corral_x', -31.0 - 4 * k + 0.0, -100.5)
        put('prop/corral_x', -31.0 - 4 * k, -87.5)
    for k in range(3):
        put('prop/corral_z', -47.0, -87.5 - 4 * k)
    put('prop/horse/e/dun/1', -38.0, -94.0)
    put('prop/horse/w/grey/0', -42.0, -97.0)
    # wagons, a woodpile and freight on the depot square, the big cottonwood there
    put('prop/wagon_cov_z', -3.5, -60.0)
    put('prop/wagon_x', 16.0, -29.0)
    put('prop/freight_tarp', 6.0, -29.5)
    put('nat/cottonwood/2', -12.0, -29.5)
    put('prop/lamp_lit', -8.0, -28.5)
    put('prop/notices', 0.0, -122.0)
    # nature pushing in: cottonwoods behind the lots, junipers and rocks to the north-east, sage between,
    # the dry wash with its footbridge, tall grass in the alleys and along the edges
    for (x, z, k) in ((-24.5, -45, 1), (-25.0, -73, 3), (23.5, -59, 1), (24.0, -101, 3), (-48, -66, 2), (-52, -110, 1),
                      (40, -48, 3), (38, -120, 1)):
        put(f'nat/cottonwood/{k}', x, z)
    for (x, z, k) in ((40, -134, 1), (46, -138, 2), (30, -137, 1), (56, -125, 1), (57, -100, 2), (22, -139, 2)):
        put(f'nat/juniper/{k}', x, z)
    put('nat/outcrop/1', 44, -128)
    put('nat/outcrop/2', 36, -140)
    put('nat/deadtree', 58, -70)
    put('nat/log_z', 42, -84)
    put('nat/log_x', -45, -130)
    put('prop/wash_bridge', 50, -62)
    rnd = np.random.RandomState(27)
    taken = set()
    for i in range(150):
        x = rnd.uniform(X0 + 2, X1 - 2); z = rnd.uniform(Z0 + 2, Z1 - 2)
        k = cell_kind(int(np.floor(x)), int(np.floor(z)))
        if k in ('street', 'dirt', 'path') or (abs(x) < 23 and -118 < z < -30):
            continue
        if any(abs(x - hx) < 6 and abs(z - hz) < 6 for hx, hz in ((-35, -40), (-35, -60), (-35, -80), (-35, -100),
                                                                   (35, -40), (35, -60), (35, -80), (35, -100),
                                                                   (0, -128), (-20, -128))):
            continue
        if -48 < x < -30 and -102 < z < -86:
            continue
        r = rnd.randint(0, 100)
        if x > 40 or z < -130:
            key = ('nat/pear/%d' % (r % 2 + 1)) if r < 30 else ('nat/boulder/%d' % (r % 4 + 1)) if r < 55 else 'nat/sage/%d' % (r % 4 + 1)
        else:
            key = 'nat/sage/%d' % (r % 4 + 1) if r < 50 else 'nat/rabbitbrush/%d' % (r % 2 + 1) if r < 65 else \
                  'nat/grass/%d/%d' % (r % 6 + 1, 0) if r < 92 else 'nat/flowers/%d' % (r % 3 + 1)
        put(key, x, z)
    for lz in LOT_Z[:-1]:     # the alleys between the lots: tall grass and a tumbleweed caught there
        for sx in (-1, 1):
            for j in range(3):
                put('nat/grass/%d/0' % ((j + int(-lz)) % 6 + 1), sx * (12.0 + j * 3.2), lz - 7.0 + (j % 2) * 0.5)
    put('nat/tumbleweed/1', 13.5, -59.0)
    put('nat/tumbleweed/2', -3.0, -88.0)
    # a few townsfolk for scale (the people artist's sprites)
    for (k, x, z) in (('ppl/man_top/walk/se/1', -8.2, -45.0), ('ppl/woman_bonnet/idle/sw/0', -8.4, -53.0),
                      ('ppl/smith/idle/se/0', -9.0, -79.0), ('ppl/cowhand/walk/ne/0', -2.0, -70.0),
                      ('ppl/barkeep/idle/sw/0', 8.4, -36.0), ('ppl/man_bowler/walk/nw/2', 8.2, -64.0),
                      ('ppl/child/walk/sw/1', -18.0, -121.0), ('ppl/woman_shawl/idle/se/0', 1.0, -121.5)):
        if k in F:
            put(k, x, z)
    for d, _, key, x, z in sorted(objs):
        y = 0.3 if key.startswith('ppl/') and abs(x) > 6.9 and abs(x) < 9.6 else 0.0
        blit(key, x, z, y)
    Image.fromarray(img).save(os.path.join(OUT, 'd27-street-scene.png'))
    # the middle of the street at 3x, about a phone screen and a half
    cx, cy = sxy(0, -66)
    crop = img[cy - 260:cy + 220, cx - 330:cx + 330]
    Image.fromarray(crop).resize((crop.shape[1] * 3, crop.shape[0] * 3), Image.NEAREST).save(
        os.path.join(OUT, 'd27-street-scene-3x.png'))
    buildings_sheet(info, frame)
    nature_sheet(info, frame)
    station_scene(info, frame)
    print('wrote d27-street-scene.png', img.shape[1], 'x', img.shape[0])


def _label(text):
    return FT.text_image(text, (43, 32, 38, 255))


def buildings_sheet(info, frame, scale=2):
    F = info['frames']; EX = info.get('extra', {})
    cells = []
    for kind, lx, lz, f in LOTS:
        cw, ch, ox, oy = 360, 300, 170, 210
        cell = np.zeros((ch, cw, 4), np.uint8); cell[...] = (178, 160, 122, 255)
        for part in ('walk', 'shadow', 'body', 'yard', 'awning', 'sign', 'pole/0'):
            key = f'bld/shop_{kind}/{f}/{part}'
            if key in F:
                im, (ax, ay) = frame(key)
                RV.blit(cell, im, ox - ax, oy - ay)
        sizes = []
        for part in ('body', 'walk', 'awning', 'sign', 'yard', 'shadow'):
            key = f'bld/shop_{kind}/{f}/{part}'
            if key in F:
                sizes.append(f'{part} {F[key][3]}x{F[key][4]}')
        RV.blit(cell, _label(f'bld/shop_{kind}/{f}'), 4, ch - 18)
        RV.blit(cell, _label(', '.join(sizes)), 4, ch - 9)
        cells.append(cell)
    for key in ('bld/church', 'bld/school', 'bld/house/1/e', 'bld/house/2/e', 'bld/house/3/w', 'bld/house/4/w'):
        cw, ch = 360, 300
        cell = np.zeros((ch, cw, 4), np.uint8); cell[...] = (178, 160, 122, 255)
        if key + '/shadow' in F:
            im, (ax, ay) = frame(key + '/shadow'); RV.blit(cell, im, 170 - ax, 230 - ay)
        im, (ax, ay) = frame(key)
        RV.blit(cell, im, 170 - ax, 230 - ay)
        RV.blit(cell, _label(f'{key} {F[key][3]}x{F[key][4]}'), 4, ch - 12)
        cells.append(cell)
    cols = 3
    rows = (len(cells) + cols - 1) // cols
    sheet = np.zeros((rows * 300, cols * 360, 4), np.uint8)
    for i, c in enumerate(cells):
        sheet[(i // cols) * 300:(i // cols + 1) * 300, (i % cols) * 360:(i % cols + 1) * 360] = c
    Image.fromarray(sheet).resize((sheet.shape[1] * scale, sheet.shape[0] * scale), Image.NEAREST).save(
        os.path.join(OUT, 'd27-buildings.png'))


def nature_sheet(info, frame, scale=3, width=640):
    F = info['frames']
    keys = [k for k in F if k.startswith(('nat/', 'tile/', 'dock/', 'prop/', 'bld/watertower', 'bld/lamp', 'bld/lever', 'bld/rodding', 'bld/schedboard'))]
    groups = {}
    for k in keys:
        base = re.sub(r'/\d+$', '', k) if re.search(r'/(grass/\d+|tumbleweed|water|horse/.+)/\d+$', k) else k
        groups.setdefault(base, []).append(k)
    cells = []
    for base, ks in groups.items():
        ims = [frame(k) for k in ks]
        up = max(a[1] for _, a in ims); dn = max(i.shape[0] - a[1] for i, a in ims)
        lb = _label(base.replace('tile/', 't/') + (f' x{len(ks)}' if len(ks) > 1 else '') + f' {ims[0][0].shape[1]}x{ims[0][0].shape[0]}')
        cw = max(sum(i.shape[1] + 3 for i, _ in ims), lb.shape[1]) + 6
        ch = up + dn + 12
        cell = np.zeros((ch, cw, 4), np.uint8); cell[...] = (178, 160, 122, 255)
        x = 0
        for im, (ax, ay) in ims:
            RV.blit(cell, im, x, up - ay); cell[up, x + ax] = (255, 40, 40, 255); x += im.shape[1] + 3
        RV.blit(cell, lb, 0, up + dn + 3)
        cells.append(cell)
    rows, row, w = [], [], 0
    for c in cells:
        if w + c.shape[1] > width and row:
            rows.append(row); row, w = [], 0
        row.append(c); w += c.shape[1] + 4
    rows.append(row)
    H = sum(max(c.shape[0] for c in r) + 4 for r in rows)
    sheet = np.zeros((H, width, 4), np.uint8); sheet[...] = (178, 160, 122, 255)
    y = 0
    for r in rows:
        x = 0
        for c in r:
            sheet[y:y + c.shape[0], x:x + c.shape[1]] = c; x += c.shape[1] + 4
        y += max(c.shape[0] for c in r) + 4
    Image.fromarray(sheet).resize((width * scale, H * scale), Image.NEAREST).save(os.path.join(OUT, 'd27-nature-props.png'))


def station_scene(info, frame):
    """The station and the cargo platform at true scale (plan 1.3, 1.4, 2.1): platform 1 with the depot, canopy,
    benches and schedule board, tracks 1, 2 and 3 (straight; the crossovers are left out), the raised cargo platform
    with its freight house, chalked storage cells, cart lane and ramps, both footbridges, the lever frames and their
    rodding, the water tower, telegraph poles, the cart crossing and path, and the creek to the south."""
    import engine as E
    import pal27  # noqa: F401
    F = info['frames']; EX = info.get('extra', {})
    X0, X1, Z0, Z1 = -60, 60, -34, 42
    OX = int(8 * (Z1 - X0)) + 20
    OY = int(-4 * (X0 + Z0)) + 160
    W = int(8 * (X1 - X0 + Z1 - Z0)) + 40
    Hh = int(4 * (X1 - X0 + Z1 - Z0)) + 200
    img = np.zeros((Hh, W, 4), np.uint8)
    img[..., :3] = (122, 146, 68); img[..., 3] = 255

    def sxy(x, z, y=0.0):
        return int(round(OX + 8 * (x - z))), int(round(OY + 4 * (x + z) - 8 * y))

    def blit(key, x, z, y=0.0):
        if key not in F:
            print('  missing', key); return
        im, (ax, ay) = frame(key)
        sx, sy = sxy(x, z, y)
        RV.blit(img, im, sx - ax, sy - ay)

    def creek_z(x):
        return 34.0 + 2.2 * np.sin(x / 9.0)
    path_pts = [(34, 12.4), (37, 6), (37, -20), (14, -31)]

    def near_path(x, z):
        for (ax, az), (bx, bz) in zip(path_pts, path_pts[1:]):
            dx, dz = bx - ax, bz - az
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
            if (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2 < 1.75 ** 2:
                return True
        return False

    def kind(x, z):
        cx, cz = x + 0.5, z + 0.5
        zc = creek_z(cx)
        if abs(cz - zc) < 2.0:
            return 'water'
        if abs(cz - zc) < 3.0:
            return 'bank/s' if cz < zc else 'bank/n'
        if -31 <= cz <= -26.3 and -24 <= cx <= 24:
            return 'dirt'
        if near_path(cx, cz):
            return 'path'
        if any(abs(cz - tz) < 2.3 and lo <= cx <= hi for tz, lo, hi in ((-6, -44, 44), (0, -99, 99), (18.6, -33, 33))):
            return 'ballast'
        if abs(cz - zc) < 6 or cz > 40:
            return 'grass'
        return 'grass' if hsh(int(x) // 3, int(z) // 3, 11) % 4 else 'drygrass'
    nvar = {k: 1 for k in ('water', 'bank/s', 'bank/n')}
    for k in F:
        m = re.match(r'tile/([a-z]+)/(\d+)$', k)
        if m:
            nvar[m.group(1)] = max(nvar.get(m.group(1), 0), int(m.group(2)))
    for z in range(Z0, Z1):
        for x in range(X0, X1):
            k = kind(x, z)
            if k == 'water':
                blit('tile/water/%d' % (hsh(x, z) % 2), x, z)
            elif k.startswith('bank'):
                blit('tile/' + k, x, z)
            else:
                blit(f'tile/{k}/{hsh(x, z) % nvar[k] + 1}', x, z)
    # ---- the track (ties and rails) and platform 1's low deck, drawn with the engine straight onto a layer
    E.begin(W, Hh, OX, OY)
    U4, UY = 4.0, 16.0 / 3.0
    def ties(face, X, Y, Z, idx):
        return None, np.where(np.mod(X, 3.4) < 0.5, 3, idx)
    for tz, lo, hi in ((-6, -44, 44), (0, -60, 60), (18.6, -33, 33)):
        for k in range(int((hi - lo) / 0.85)):
            x = lo + k * 0.85
            E.box(x * U4, (tz - 1.85) * U4, 0, x * U4 + 1.1, (tz + 1.85) * U4, 0.9, 'wood', shades=(2, 2, 3), cast=False)
        for r in (-1.03, 1.03):
            E.box(lo * U4, (tz + r) * U4 - 0.35, 0.9, hi * U4, (tz + r) * U4 + 0.35, 2.2, 'iron', shades=(0, 2, 3),
                  cast=False)
    def p1tex(face, X, Y, Z, idx):
        if face == 't':
            seg = np.floor(X / 7.0).astype(int)
            hb = E.hash2(np.floor(Y / 1.6).astype(int), seg) % 7
            return None, np.where(np.mod(Y, 1.6) < 0.42, 2, np.where(hb == 0, 0, 1))
        return None, np.where(np.mod(X, 3.0) < 0.5, 3, 2)
    E.box(-30 * U4, -17.3 * U4, 0, 30 * U4, -8.3 * U4, 2.0, 'wood', tex=p1tex, cast=False)
    # the cart crossing: planks between and beside the rails over tracks 1 and 2
    def xing(face, X, Y, Z, idx):
        return None, np.where(np.mod(Y, 2.0) < 0.5, 2, 1)
    for tz in (-6, 0):
        for (a, b) in ((-2.3, -1.2), (-0.85, 0.85), (1.2, 2.3)):
            E.box(35.25 * U4, (tz + a) * U4, 0, 38.75 * U4, (tz + b) * U4, 2.0, 'wood', tex=xing, cast=False)
    layer = E.render_rgba()
    m = layer[..., 3] > 0
    img[m] = layer[m]
    # ---- the cargo platform: deck cells, chalked storage cells, the south and east faces, ramps
    for z in range(3, 17):
        for x in range(-26, 26):
            blit('dock/top/%d' % (hsh(x, z) % 2 + 1), x, z - 0.7)
    for block in (-24, 10):
        for c in range(10):
            for r in range(4):
                blit('dock/cell', block + c * 1.4, 5.3 + r * 1.4)
    for x in range(-26, 26):
        blit('dock/face_s' + ('/bumper' if x % 5 == 2 else '/post' if x % 5 == 0 else ''), x, 16.3)
    for z in range(2, 16):
        blit('dock/face_e' + ('/post' if z == 15 else ''), 26, z + 0.3)
    blit('dock/ramp_e', 30, 12.4)
    blit('dock/ramp_w', -30, 12.4)
    # ---- upright things, sorted back to front
    objs = []

    def put(key, x, z, depth=None, y=0.0):
        if key not in F:
            print('  missing', key); return
        bx = EX.get(key, {}).get('box')
        if depth is None and bx:
            depth = x + z + (bx[0] + bx[2]) / 2 + (bx[1] + bx[3]) / 2
        objs.append((x + z if depth is None else depth, len(objs), key, x, z, y))
    put('bld/station', 0, -21.8)
    put('bld/canopy', 0, -14.3, depth=-14.3 + 3.5)
    put('bld/schedboard', 14, -16.9)
    put('bld/freighthouse/body', 0, 6.3)
    put('bld/freighthouse/roof', 0, 6.3, depth=6.3 + 3.2)
    for bx, d in ((-14, 'w'), (14, 'e')):
        for k in range(3):
            put(f'bld/footbridge/bent{k}', bx, 0.0)
        for plat in ('p1', 'p2'):
            put(f'bld/footbridge/stair_{plat}_{d}', bx, 0.0)
            put(f'bld/footbridge/stair_{plat}_{d}_rail', bx, 0.0)
        put('bld/footbridge/deck', bx, 0.0, depth=1000 + bx)
        put('bld/footbridge/rail', bx, 0.0, depth=1000.5 + bx)
    for side, fx in (('W', -33), ('E', 33)):
        put(f'bld/leverframe/{side}', fx, -11.0)
        for i, (lx, lz) in enumerate(EX.get(f'bld/leverframe/{side}', {}).get('levers', [])):
            put('bld/lever/' + ('R' if (side, i) == ('E', 0) else 'N'), fx + lx, -11.0 + lz, depth=fx - 11.0 + 0.2)
        for k in range(5):
            put('bld/rodding_x', fx + (1.5 + 2 * k if fx > 0 else -3.5 - 2 * k), -10.5, depth=-100)
    put('bld/watertower', -48, -14)
    put('prop/woodpile', 11.5, -28.5)
    for x in (-26, -20, -8, 8, 20, 26):
        put('prop/bench_s', x, -16.6)
    for x in (-24, 24):
        put('prop/lamp_lit', x, -9.2)
    for x in (-50, -30, 30, 50):
        put('prop/telegraph', x, -3.0)
    put('prop/wagon_x', -16, -29.5)
    put('prop/freight_tarp', -6, -29.0)
    put('prop/barrels', 20, 4.0, y=1.6)
    put('prop/crates', 17, 4.2, y=1.6)
    for (x, z, k) in ((-40, 30.5, 'nat/cottonwood/1'), (-12, 29.5, 'nat/willow/1'), (8, 38.5, 'nat/willow/2'),
                      (22, 30.0, 'nat/cottonwood/3'), (44, 37.5, 'nat/cottonwood/1'), (-28, 37.5, 'nat/willow/2'),
                      (-50, -26, 'nat/cottonwood/2'), (50, -28, 'nat/juniper/1')):
        put(k, x, z)
    for i in range(18):
        x = -55 + i * 6.3
        put('nat/cattails/%d' % (i % 2 + 1), x, float(creek_z(x)) - 2.6)
        put('nat/grass/%d/0' % (i % 6 + 1), x + 2.5, float(creek_z(x)) + 3.2)
    rnd = np.random.RandomState(31)
    for i in range(40):
        x = rnd.uniform(-58, 58); z = rnd.uniform(-33, 28)
        k = kind(int(np.floor(x)), int(np.floor(z)))
        if k not in ('grass', 'drygrass') or (-31 < x < 31 and -18 < z < 18) or (-10 < x < 10 and z < -16):
            continue
        put(['nat/sage/1', 'nat/sage/2', 'nat/rabbitbrush/1', 'nat/grass/2/0', 'nat/grass/5/0', 'nat/sage/4'][i % 6], x, z)
    for (k, x, z, y) in (('ppl/agent/walk/se/1', 6.0, -11.0, 0.375), ('ppl/man_top/idle/sw/0', -20.0, -15.4, 0.375),
                         ('ppl/woman_bonnet/idle/se/0', -10.0, -12.0, 0.375), ('ppl/child/walk/se/0', -8.5, -12.6, 0.375),
                         ('ppl/porter/walk/sw/2', 14.0, -2.0, 7.6), ('ppl/man_bag/walk/ne/1', 21.0, 4.3, 3.8),
                         ('ppl/worker/idle/se/0', 4.0, 13.0, 1.6), ('ppl/storekeeper/walk/nw/0', 30.0, -26.0, 0.0)):
        put(k, x, z, y=y)
    for d, _, key, x, z, y in sorted(objs):
        blit(key, x, z, y)
    Image.fromarray(img).save(os.path.join(OUT, 'd27-station-scene.png'))
    cx, cy = sxy(0, -2)
    crop = img[cy - 250:cy + 200, cx - 330:cx + 330]
    Image.fromarray(crop).resize((crop.shape[1] * 3, crop.shape[0] * 3), Image.NEAREST).save(
        os.path.join(OUT, 'd27-station-scene-3x.png'))
    print('wrote d27-station-scene.png', img.shape[1], 'x', img.shape[0])


if __name__ == '__main__':
    main()
