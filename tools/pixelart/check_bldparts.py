# Proof for the D32 buildings in parts (the buildings artist): from the built atlas (out/atlas.json and the sheet
# PNGs, as the game gets them), for every building <B> with parts, draw <B>/floor, /back, /front, /roof at their
# anchors (in that order) and compare with the whole sprite (<B>/body for a shop, else <B>) pixel for pixel, RGBA.
# The same for the night: floor, back_lit (or back), front_lit (or front), roof_lit (or roof) against the whole's
# night sprite. Also checks each part's anchor is the whole's world point (they are drawn at the same anchor).
#   python3 tools/pixelart/check_bldparts.py [out dir]      (after build.py; 'out/preview' after build.py town)
import json
import os
import sys
import numpy as np
from PIL import Image


def load(outdir):
    a = json.load(open(os.path.join(outdir, 'atlas.json')))
    sheets = [np.array(Image.open(os.path.join(outdir, s['file'])).convert('RGBA')) for s in a['sheets']]
    def get(key):
        f = a['frames'].get(key)
        if f is None:
            return None
        s, x, y, w, h, ax, ay = f
        return sheets[s][y:y + h, x:x + w], (ax, ay)
    return a['frames'], get


def compose(get, keys, whole):
    wimg, (wax, way) = whole
    H, W = wimg.shape[:2]
    pad = 64
    c = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.uint8)
    for k in keys:
        fr = get(k)
        if fr is None:
            continue
        im, (ax, ay) = fr
        ox, oy = wax + pad - ax, way + pad - ay
        m = im[..., 3] > 0
        c[oy:oy + im.shape[0], ox:ox + im.shape[1]][m] = im[m]
    inner = c[pad:pad + H, pad:pad + W]
    outside = c.copy()
    outside[pad:pad + H, pad:pad + W] = 0
    return inner, int((outside[..., 3] > 0).sum())


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'out')
    frames, get = load(outdir)
    bases = sorted(k[:-len('/front')] for k in frames if k.endswith('/front') and k.startswith('bld/'))
    ok = bad = 0
    for B in bases:
        wkey = B + '/body' if B + '/body' in frames else B
        lkey = B + '/body_lit' if B + '/body' in frames else B + '_lit'
        parts = [B + '/floor', B + '/back', B + '/front', B + '/roof']
        missing = [p for p in parts if p not in frames]
        res = []
        for label, wk, keys in (('day', wkey, parts),
                                ('night', lkey, [B + '/floor', B + '/back_lit' if B + '/back_lit' in frames else B + '/back',
                                                 B + '/front_lit' if B + '/front_lit' in frames else B + '/front',
                                                 B + '/roof_lit' if B + '/roof_lit' in frames else B + '/roof'])):
            whole = get(wk)
            if whole is None:
                continue
            comp, spill = compose(get, keys, whole)
            diff = int((comp != whole[0]).any(-1).sum())
            res.append((label, diff, spill))
        good = not missing and all(d == 0 and s == 0 for _, d, s in res)
        ok += good
        bad += not good
        print(('OK  ' if good else 'FAIL'), B, 'whole', wkey, ' '.join(f'{l}: {d} px differ, {s} px outside' for l, d, s in res),
              ('missing ' + ', '.join(missing)) if missing else '')
    print(f'{ok} buildings match their whole sprites exactly, {bad} do not')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
