#!/usr/bin/env python3
# Railhead sprite pipeline. One command regenerates everything:
#     python3 tools/pixelart/build.py            (all modules)
#     python3 tools/pixelart/build.py people     (only sprites_people.py, into out/preview/, for a quick look)
#     python3 tools/pixelart/build.py --ground   (all modules, and the D25 baked ground layer: see below)
# It finds every tools/pixelart/sprites_*.py module, calls its register(reg) (see registry.py and README.md),
# packs the frames into sprite sheets and writes, in tools/pixelart/out/:
#   sheet-<group>.png   the sprite sheets (native pixels, alpha 0 or 255)
#   ground.png          only with --ground: the D25 baked ground layer from proto-layout.json (groundlayer.py). D27 (the
#                       foundation, plans/d27-tech.md 7.4 and 10.1) retires it: the D27 map's would be 3,048 x 1,588 px
#                       (400 KB or more), so the browser composes the ground from the tile/ sprites instead (builder R)
#   atlas.js            the contract's block: const PIX_ATLAS = { v, sheets: [data URLs], frames, extra };
#   atlas.json          the same frames with every note, for people
#   contact.png         every sprite at 3x with its key, for review
#   testscene.png       the station put together from atlas.js's pictures only (proves they line up)
# Then python3 tools/pixelart/embed.py writes atlas.js into index.html.
import os, sys, json, time, glob, importlib, base64, io
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engine as E
import registry
import track as TR
import font as FT
import groundlayer as GL

OUT = os.path.join(HERE, 'out')

GEOMETRY = {
    'gauge_half_u': TR.GAUGE / E.U_XZ,
    'rail_top_u': round(TR.RAIL / E.U_Y, 3),
    'deck_px': 3,
}


def owner_of(name):
    best, blen = None, -1
    for mod, prefixes in registry.OWNERS.items():
        for p in prefixes:
            if name.startswith(p) and len(p) > blen:
                best, blen = mod, len(p)
    return best


def modules(only=None):
    names = sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(HERE, 'sprites_*.py')))
    return [importlib.import_module(m) for m in names if not only or m == 'sprites_' + only]


def collect(mods):
    reg = registry.Registry()
    for m in mods:
        t = time.time()
        reg.module = m.__name__
        m.register(reg)
        n = sum(1 for s in reg.sprites if s[4] == m.__name__)
        print(f'  {m.__name__}: {n} sprites ({time.time() - t:.1f} s)')
    keys, groups, out = {}, {}, []
    for name, group, frames, meta, mod, indexed in reg.sprites:
        own = owner_of(name)
        if own is None:
            raise SystemExit(f'{name}: no module owns this key prefix; add it to registry.OWNERS')
        if own != mod:
            raise SystemExit(f'{mod} registered {name}, but that key belongs to {own} (registry.OWNERS)')
        g = groups.setdefault(group, mod)
        if g != mod:
            raise SystemExit(f'sheet group {group!r} is used by both {g} and {mod}; give each module its own groups')
        ks = [f'{name}/{i}' for i in range(len(frames))] if indexed else [name]
        for k, fr in zip(ks, frames):
            if k in keys:
                raise SystemExit(f'duplicate key {k} ({keys[k]} and {mod})')
            keys[k] = mod
            out.append((k, group, hard_alpha(fr), meta, name))
    return out


def hard_alpha(frame):
    """The contract wants alpha 0 or 255: part-transparent pixels (soft shadows) become a 50% checker of opaque
    dark pixels, in step with the anchor so a moving sprite's checker does not crawl."""
    img, (ax, ay) = frame
    a = img[..., 3]
    soft = (a > 0) & (a < 255)
    if not soft.any():
        return frame
    img = img.copy()
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    on = ((xx - ax + yy - ay) % 2) == 0
    img[soft & on] = (*E.SHADOW_RGBA[:3], 255)
    img[soft & ~on] = 0
    return img, (ax, ay)


def pack(imgs, max_w=512):
    """Shelf packing. Identical frames are stored once. Returns (sheet, {frame key: (x, y, w, h)})."""
    uniq = {}
    for img in imgs:
        uniq.setdefault((img.shape, img.tobytes()), img)
    order = sorted(uniq.items(), key=lambda kv: (-kv[1].shape[0], -kv[1].shape[1]))
    x = y = 0; shelf = 0; pos = {}
    for k, img in order:
        h, w = img.shape[:2]
        if x + w > max_w:
            x = 0; y += shelf + 1; shelf = 0
        pos[k] = (x, y, w, h)
        x += w + 1; shelf = max(shelf, h)
    sheet = np.zeros((y + shelf, max_w, 4), np.uint8)
    for k, img in order:
        x, y, w, h = pos[k]
        sheet[y:y + h, x:x + w] = img
    used_w = max(p[0] + p[2] for p in pos.values())
    return sheet[:, :used_w], pos


def png_bytes(arr):
    """PNG bytes; an indexed (palette) PNG when the picture has at most 255 colours, which is far smaller."""
    b = io.BytesIO()
    flat = arr.reshape(-1, 4)
    opaque = flat[:, 3] == 255
    cols, inv = np.unique(flat[:, :3] * opaque[:, None], axis=0, return_inverse=True)
    if len(cols) <= 255:
        inv = inv.reshape(-1)
        idx = np.where(opaque, inv + 1, 0).astype(np.uint8).reshape(arr.shape[:2])
        im = Image.fromarray(idx, mode='P')
        pal = [0, 0, 0] + [int(v) for c in cols for v in c]
        im.putpalette(pal + [0] * (768 - len(pal)))
        im.save(b, format='PNG', optimize=True, transparency=0)
    else:
        Image.fromarray(arr).save(b, format='PNG', optimize=True)
    return b.getvalue()


def write(frames, ground):
    os.makedirs(OUT, exist_ok=True)
    for old in glob.glob(os.path.join(OUT, 'sheet-*.png')):
        os.remove(old)
    groups = {}
    for key, group, (img, an), meta, name in frames:
        groups.setdefault(group, []).append(img)
    sheets, sheet_pos, urls = [], {}, []
    for gi, (group, imgs) in enumerate(sorted(groups.items())):
        sheet, pos = pack(imgs, 256 if group == 'font' else 512)
        data = png_bytes(sheet)
        fn = f'sheet-{group}.png'
        with open(os.path.join(OUT, fn), 'wb') as f:
            f.write(data)
        sheets.append({'name': group, 'file': fn, 'w': int(sheet.shape[1]), 'h': int(sheet.shape[0]), 'bytes': len(data)})
        urls.append('data:image/png;base64,' + base64.b64encode(data).decode('ascii'))
        sheet_pos[group] = (gi, pos)
    pix_frames, extra, notes = {}, {}, {}
    for key, group, (img, (ax, ay)), meta, name in frames:
        gi, pos = sheet_pos[group]
        x, y, w, h = pos[(img.shape, img.tobytes())]
        pix_frames[key] = [gi, x, y, w, h, int(ax), int(ay)]
        if 'extra' in meta:
            extra[key] = meta['extra']
        notes[name] = {k: v for k, v in meta.items() if k != 'extra'}
    if ground is not None:
        data = png_bytes(ground['img'])
        with open(os.path.join(OUT, 'ground.png'), 'wb') as f:
            f.write(data)
        gi = len(urls)
        urls.append('data:image/png;base64,' + base64.b64encode(data).decode('ascii'))
        h, w = ground['img'].shape[:2]
        pix_frames['ground'] = [gi, 0, 0, w, h, ground['OX'], ground['OY']]
        sheets.append({'name': 'ground', 'file': 'ground.png', 'w': w, 'h': h, 'bytes': len(data)})
    atlas = {'v': 1, 'sheets': urls, 'frames': pix_frames, 'extra': extra}
    js = ('// Generated by tools/pixelart/build.py: the pixel art sheets and frames (plans/proto-sprites.md).\n'
          '// frames[key] = [sheet, x, y, w, h, ax, ay]: draw at (sx - ax, sy - ay). Do not edit by hand.\n'
          'const PIX_ATLAS = ' + json.dumps(atlas, separators=(',', ':')) + ';\n')
    with open(os.path.join(OUT, 'atlas.js'), 'w') as f:
        f.write(js)
    info = {
        'generated_by': 'tools/pixelart/build.py',
        'projection': ('native pixels: world +x moves 8 px right and 4 down; +z moves 8 px left and 4 down; '
                       '+y (up) moves 8 px up. Draw a frame at (sx - ax, sy - ay).'),
        'geometry': GEOMETRY, 'sheets': sheets,
        'frames': {k: v for k, v in pix_frames.items()}, 'extra': extra, 'notes': notes,
    }
    with open(os.path.join(OUT, 'atlas.json'), 'w') as f:
        json.dump(info, f, indent=None, separators=(',', ':'))
    return info, len(js.encode())


def main():
    t0 = time.time()
    global OUT
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    bake = '--ground' in sys.argv[1:]
    only = args[0] if args else None
    if only:
        OUT = os.path.join(OUT, 'preview')   # a one-module build never overwrites the real atlas
    mods = modules(only)
    frames = collect(mods)
    ground = None
    if not only and bake:
        t = time.time()
        layout = GL.load_layout()
        img = GL.build(mods, layout)
        ground = {'img': img, 'OX': layout['proj']['OX'], 'OY': layout['proj']['OY']}
        print(f'  ground layer: {img.shape[1]} x {img.shape[0]} px ({time.time() - t:.1f} s)')
    info, js_bytes = write(frames, ground)
    print(f'{len(set(n for _, _, _, _, n in frames))} sprites, {len(info["frames"])} frames')
    for s in info['sheets']:
        print(f'  {s["file"]}: {s["w"]} x {s["h"]} px, {s["bytes"] / 1024:.1f} KB')
    print(f'  atlas.js: {js_bytes / 1024:.1f} KB (what embed.py puts into index.html)')
    import review
    review.contact_sheet(info, OUT)
    if not only and ground is not None:
        review.test_scene(info, OUT)
    print(f'done in {time.time() - t0:.1f} s')


if __name__ == '__main__':
    main()
