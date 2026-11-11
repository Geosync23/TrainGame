#!/usr/bin/env python3
# Review picture for the people v2 size: the agent carrying goods (the carried picture drawn at the art's hands
# offset, as the game does) and pushing the handcart (the cart at the atlas' pusher offset), in all four facings,
# from the built atlas (run build.py first). Writes out/people-carry.png at 4x.
#     python3 tools/pixelart/review_carry.py
import os, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
BG = (187, 156, 118, 255)


def main(scale=4):
    atlas = json.load(open(os.path.join(OUT, 'atlas.json')))
    sheets = {}
    def spr(key):
        si, x, y, w, h, ax, ay = atlas['frames'][key]
        if si not in sheets:
            sheets[si] = np.array(Image.open(os.path.join(OUT, atlas['sheets'][si]['file'] if isinstance(atlas['sheets'][si], dict) else atlas['sheets'][si])).convert('RGBA'))
        return sheets[si][y:y + h, x:x + w], (ax, ay)
    ex = atlas['extra']
    W, H = 300, 90
    img = np.zeros((H, W, 4), np.uint8); img[...] = BG
    def blit(key, x, y):
        f, (ax, ay) = spr(key)
        x, y = x - ax, y - ay
        h, w = f.shape[:2]; m = f[..., 3] > 0
        img[y:y + h, x:x + w][m] = f[m]
    fwd = {'se': (18, 9), 'ne': (18, -9), 'sw': (-18, 9), 'nw': (-18, -9)}
    for i, d in enumerate(('se', 'sw', 'ne', 'nw')):
        x, y = 20 + i * 40, 40
        hd = ex.get(f'ppl/agent/carry/{d}/0', {}).get('hands', [0, -6])
        back = d in ('ne', 'nw')
        if back: blit('goods/crate/carried/store', x + hd[0], y + hd[1])
        blit(f'ppl/agent/carry/{d}/1', x, y)
        if not back: blit('goods/crate/carried/store', x + hd[0], y + hd[1])
        x2, y2 = 170 + (i % 2) * 70, 35 + (i // 2) * 45
        cx, cy = x2 + fwd[d][0], y2 + fwd[d][1]
        if back: blit(f'cart/{d}/loaded', cx, cy)
        blit(f'ppl/agent/push/{d}/1', x2, y2)
        if not back: blit(f'cart/{d}/loaded', cx, cy)
    Image.fromarray(img).resize((W * scale, H * scale), Image.NEAREST).save(os.path.join(OUT, 'people-carry.png'))


if __name__ == '__main__':
    main()
