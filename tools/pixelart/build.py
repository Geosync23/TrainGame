#!/usr/bin/env python3
# Railhead sprite pipeline. One command regenerates everything:
#     python3 tools/pixelart/build.py            (all modules)
#     python3 tools/pixelart/build.py people     (only sprites_people.py, for a quick look; the atlas is still complete
#                                                 only when every module ran, so commit the full build)
# It finds every tools/pixelart/sprites_*.py module, calls its register(reg) (see registry.py and README.md),
# packs the frames into sprite sheets and writes, in tools/pixelart/out/:
#   sheet-<group>.png   the sprite sheets (native pixels, transparent background)
#   atlas.json          every sprite: frame rectangles, anchors, and notes (lengths, footprints, board areas)
#   contact.png         every sprite at 3x with its name, for review
#   testscene.png       a small station put together from the sheets only (proves the sprites line up)
# Then python3 tools/pixelart/embed.py copies the sheets and atlas into index.html.
import os, sys, json, time, glob, importlib
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engine as E
import registry
import track as TR
import font as FT

OUT = os.path.join(HERE, 'out')

# Shared geometry, written into the atlas so the game matches the art (game units).
GEOMETRY = {
    'gauge_half_u': TR.GAUGE / E.U_XZ,         # rails 0.75 u either side of the track centre line
    'ballast_half_u': TR.BALLAST / E.U_XZ,     # 1.75 u
    'rail_top_u': TR.RAIL / E.U_Y,             # 0.45 u above the ground
    'platform_top_u': TR.PZ / E.U_Y,           # 0.75 u
}


def owner_of(name):
    best, blen = None, -1
    for mod, prefixes in registry.OWNERS.items():
        for p in prefixes:
            if name.startswith(p) and len(p) > blen:
                best, blen = mod, len(p)
    return best


def collect(only=None):
    reg = registry.Registry()
    mods = sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(HERE, 'sprites_*.py')))
    for m in mods:
        if only and m != 'sprites_' + only:
            continue
        t = time.time()
        reg.module = m
        importlib.import_module(m).register(reg)
        n = sum(1 for s in reg.sprites if s[4] == m)
        print(f'  {m}: {n} sprites ({time.time() - t:.1f} s)')
    seen, groups = {}, {}
    for name, group, frames, meta, mod in reg.sprites:
        if name in seen:
            raise SystemExit(f'duplicate sprite name {name} ({seen[name]} and {mod})')
        seen[name] = mod
        own = owner_of(name)
        if own is not None and own != mod and own in registry.OWNERS:
            raise SystemExit(f'{mod} registered {name}, but that name belongs to {own} (registry.OWNERS)')
        if own is None:
            raise SystemExit(f'{name}: no module owns this name prefix; add it to registry.OWNERS')
        g = groups.setdefault(group, mod)
        if g != mod:
            raise SystemExit(f'sheet group {group!r} is used by both {g} and {mod}; give each module its own groups')
    return reg.sprites


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


def write(sprites):
    os.makedirs(OUT, exist_ok=True)
    groups = {}
    for name, group, frames, meta, mod in sprites:
        groups.setdefault(group, []).extend(img for img, _ in frames)
    atlas = {
        'version': 1,
        'generated_by': 'tools/pixelart/build.py',
        'projection': ('native pixels: world +x moves 8 px right and 4 down; +z moves 8 px left and 4 down; '
                       '+y (up) moves 8 px up. Draw a frame at (screenX - ax, screenY - ay), where (screenX, screenY) '
                       'is the projected world position at ground level. Scale up by whole steps only.'),
        'frame_format': '[x, y, w, h, ax, ay] in the sheet: rectangle, then the anchor inside the frame',
        'geometry': GEOMETRY,
        'directions': {'e': 'facing world +x (screen lower right)', 'w': 'facing -x (upper left)',
                       's': 'facing +z (lower left)', 'n': 'facing -z (upper right)'},
        'shadow_rgba': list(E.SHADOW_RGBA),
        'font': {'line_height': FT.LINE_H, 'baseline': FT.BASE, 'colour': 'white; tint in the game'},
        'sheets': [], 'sprites': {},
    }
    sheet_pos = {}
    for gi, (group, imgs) in enumerate(sorted(groups.items())):
        sheet, pos = pack(imgs, 256 if group == 'font' else 512)
        fn = f'sheet-{group}.png'
        Image.fromarray(sheet).save(os.path.join(OUT, fn), optimize=True)
        atlas['sheets'].append({'name': group, 'file': fn, 'w': int(sheet.shape[1]), 'h': int(sheet.shape[0])})
        sheet_pos[group] = (gi, pos)
    for name, group, frames, meta, mod in sprites:
        gi, pos = sheet_pos[group]
        fr = []
        for img, (ax, ay) in frames:
            x, y, w, h = pos[(img.shape, img.tobytes())]
            fr.append([x, y, w, h, int(ax), int(ay)])
        ent = {'sheet': gi, 'frames': fr}
        ent.update(meta)
        atlas['sprites'][name] = ent
    with open(os.path.join(OUT, 'atlas.json'), 'w') as f:
        json.dump(atlas, f, separators=(',', ':'))
    return atlas


def main():
    t0 = time.time()
    only = sys.argv[1] if len(sys.argv) > 1 else None
    sprites = collect(only)
    atlas = write(sprites)
    nfr = sum(len(s['frames']) for s in atlas['sprites'].values())
    print(f'{len(atlas["sprites"])} sprites, {nfr} frames')
    for s in atlas['sheets']:
        sz = os.path.getsize(os.path.join(OUT, s['file']))
        print(f'  {s["file"]}: {s["w"]} x {s["h"]} px, {sz / 1024:.1f} KB')
    print(f'  atlas.json: {os.path.getsize(os.path.join(OUT, "atlas.json")) / 1024:.1f} KB')
    import review
    review.contact_sheet(atlas, OUT)
    if not only:
        review.test_scene(atlas, OUT)
    print(f'done in {time.time() - t0:.1f} s')


if __name__ == '__main__':
    main()
