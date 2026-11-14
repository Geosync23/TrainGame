# Review sheets for the D32 buildings in parts (the buildings artist). Renders the parts straight from the drawing
# code (no build needed) and lays out, per building: all four parts together, the opened building (floor + back),
# the floor, the back, the front, the roof, and the opened building at night (floor + back_lit).
#   python3 tools/pixelart/review_bldparts.py [out.png] [filter ...]
import sys
import numpy as np
from PIL import Image
import rooms_bld as RB

BG = (150, 160, 120)


def compose(parts, wan, size, names, pad=20):
    H, W = size
    c = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.uint8)
    for n in names:
        if n not in parts:
            continue
        im, (ax, ay) = parts[n]
        ox, oy = wan[0] + pad - ax, wan[1] + pad - ay
        m = im[..., 3] > 0
        sub = c[oy:oy + im.shape[0], ox:ox + im.shape[1]]
        sub[m] = im[m]
    return c


def sheet(rows, scale=2):
    W = max(r.shape[1] for r in rows)
    s = np.concatenate([np.pad(r, ((0, 0), (0, W - r.shape[1]), (0, 0))) for r in rows], 0)
    bg = np.zeros_like(s)
    bg[..., :3] = BG
    bg[..., 3] = 255
    m = s[..., 3] > 0
    bg[m] = s[m]
    im = Image.fromarray(bg)
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


def rows_for(items):
    rows = []
    for (key, draw, after, spec, opts, lit, ld) in items:
        (wimg, wan), parts, stray = RB.make_parts(draw, after, spec, opts, lit, ld)
        print(key, 'stray', stray, {k: v[0].shape[:2] for k, v in parts.items()})
        sz = wimg.shape[:2]
        night = ['floor', 'back_lit' if 'back_lit' in parts else 'back']
        tiles = [compose(parts, wan, sz, n) for n in (['floor', 'back', 'front', 'roof'], ['floor', 'back'], ['floor'],
                                                       ['back'], ['front'], ['roof'], night)]
        rows.append(np.concatenate(tiles, 1))
    return rows


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'tools/pixelart/out/d32-bldparts.png'
    want = sys.argv[2:]
    items = [(b[0], b[2], b[3], b[4], b[5], b[6], b[7]) for b in RB.all_buildings()]
    items += [(b[0], b[2], b[3], b[4], b[5], b[6], b[7]) for b in RB.new_houses()] if hasattr(RB, 'new_houses') else []
    items = [it for it in items if not want or any(w in it[0] for w in want)]
    sheet(rows_for(items)).save(out)
    print('wrote', out)


if __name__ == '__main__':
    main()
