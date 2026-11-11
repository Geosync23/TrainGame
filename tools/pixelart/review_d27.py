#!/usr/bin/env python3
# Review pictures for the D27 people (owner: the people artist). Straight from people_d27.py (no build needed).
# Writes, in tools/pixelart/out/:
#   people-d27-contact.png    every new D27 people sprite at 3x with its key
#   people-d27-handling.png   the agent's handling animations, four facings, at 4x: a stand-in crate or sack is
#                             drawn at extra.hands (behind him in ne and nw), a yellow pixel marks extra.grip
#   people-d27-seated.png     the seated poses (sit, sitTicket, sitDown, standUp, benchSit, climb) of every
#                             traveller in the four facings at 4x, with a stand-in seat (5 px) and the punched mark
#   people-d27-town.png       the townsfolk at 6x: idle in four facings, walk, talk and benchSit, with who they are
#   people-d27-coach.png      a stand-in coach interior at 4x: rows of seated travellers in all four facings, the
#                             agent punching in the aisle, benches drawn as stand-in boxes (A2 draws the real ones)
#     python3 tools/pixelart/review_d27.py
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import people as PE
import people_d27 as P27
import font as FT
import engine as E

OUT = os.path.join(HERE, 'out')
BG = (187, 156, 118, 255)
INK = (43, 32, 38, 255)


def blit(dst, img, x, y):
    h, w = img.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = img[y0 - y:y1 - y, x0 - x:x1 - x]
    m = s[..., 3] > 0
    dst[y0:y1, x0:x1][m] = s[m]


def pixmap(rows, cmap):
    h, w = len(rows), len(rows[0])
    img = np.zeros((h + 2, w + 2, 4), np.uint8)
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch == '.':
                continue
            rn, i = cmap[ch]
            img[r + 1, c + 1, :3] = E.PAL[E.RID[rn], i]; img[r + 1, c + 1, 3] = 255
    a = img[..., 3] > 0
    o = np.zeros_like(a)
    o[1:] |= a[:-1]; o[:-1] |= a[1:]; o[:, 1:] |= a[:, :-1]; o[:, :-1] |= a[:, 1:]
    o &= ~a
    img[o] = (74, 48, 39, 255)
    return img


CM = PE.cmap(PE.SPECS['agent'][1])
CM['8'] = ('green', 0)
CRATE = pixmap(PE.CRATE, CM)          # anchor: bottom centre
SACK = pixmap(PE.SACK, CM)


def item_at(dst, img, x, y):
    blit(dst, img, x - img.shape[1] // 2, y - img.shape[0] + 1)


def label(dst, text, x, y, col=INK):
    blit(dst, FT.text_image(text, col), x, y)


def save(img, name, scale):
    Image.fromarray(img).resize((img.shape[1] * scale, img.shape[0] * scale), Image.NEAREST).save(
        os.path.join(OUT, name), optimize=True)


def contact(sprites, scale=3, width=640):
    cells = []
    for name, frames, meta, idx in sprites:
        fw = sum(i.shape[1] + 3 for i, _ in frames)
        ups = max(a[1] for _, a in frames); downs = max(i.shape[0] - a[1] for i, a in frames)
        lb = FT.text_image(name, INK)
        cw = max(fw, lb.shape[1]) + 6; ch = ups + downs + FT.LINE_H + 5
        cell = np.zeros((ch, cw, 4), np.uint8)
        x = 0
        for img, (ax, ay) in frames:
            blit(cell, img, x, ups - ay); x += img.shape[1] + 3
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
    save(img, 'people-d27-contact.png', scale)


def frames_of(sprites, prefix):
    """{frame index: (img, anchor, extra)} for key prefix ppl/.../<dir> (per-frame keys merged)."""
    out = []
    for name, frames, meta, idx in sprites:
        if name == prefix:
            out += [(f, a, meta.get('extra', {})) for f, a in frames]
        elif name.startswith(prefix + '/') and name[len(prefix) + 1:].isdigit():
            out.append((frames[0][0], frames[0][1], meta.get('extra', {})))
    return out


def handling(sprites):
    anims = ['lift', 'shoulder/idle', 'shoulder/walk', 'roll', 'drag', 'truck', 'heave', 'stackHigh', 'door',
             'climb', 'handOver', 'pull']
    CW, CH = 26, 36
    W = 100 + 16 * CW
    H = len(anims) * CH + 14
    img = np.zeros((H, W, 4), np.uint8); img[...] = BG
    for c, d in enumerate(PE.DRAWN):
        label(img, d, 70 + c * 4 * CW + 20, 2)
    for r, anim in enumerate(anims):
        label(img, anim, 2, 12 + r * CH)
        for c, d in enumerate(PE.DRAWN):
            frs = frames_of(sprites, f'ppl/agent/{anim}/{d}')
            for k, (f, (ax, ay), ex) in enumerate(frs):
                x = 70 + (c * 4 + k) * CW - 40 + 20
                y = 12 + r * CH + 30
                good = SACK if anim.startswith('shoulder') else CRATE
                hands = ex.get('hands')
                if hands and ex.get('behind'):
                    item_at(img, good, x + hands[0], y + hands[1])
                blit(img, f, x - ax, y - ay)
                if hands and not ex.get('behind'):
                    item_at(img, good, x + hands[0], y + hands[1])
                g = ex.get('grip')
                if g:
                    img[y + g[1], x + g[0]] = (255, 236, 64, 255)
    save(img, 'people-d27-handling.png', 4)


def seat_box(dst, x, y, back):
    """A stand-in seat, 5 px high under the anchor."""
    col = (118, 77, 51, 255)
    dst[y - 5:y, x - 5:x + 5] = col
    dst[y - 5, x - 5:x + 5] = (168, 119, 75, 255)


def seated(sprites):
    anims = ['sit', 'sitTicket', 'sitDown', 'standUp', 'benchSit', 'climb']
    whos = PE.TRAVELLERS
    CW, CH = 18, 30
    per_dir = 11
    W = 60 + 4 * per_dir * CW
    H = 14 + len(whos) * CH
    img = np.zeros((H, W, 4), np.uint8); img[...] = BG
    for c, d in enumerate(PE.DRAWN):
        label(img, d, 60 + c * per_dir * CW + 60, 2)
    mark = {d: f for name, ((f, a),), m, i in [s for s in sprites if s[0].startswith('ppl/mark/')]
            for d in [name.split('/')[-1]]}
    for r, who in enumerate(whos):
        label(img, who, 2, 12 + r * CH + 10)
        for c, d in enumerate(PE.DRAWN):
            k = 0
            for anim in anims:
                for f, (ax, ay), ex in frames_of(sprites, f'ppl/{who}/{anim}/{d}'):
                    x = 60 + (c * per_dir + k) * CW + 9
                    y = 12 + r * CH + 26
                    if anim in ('sit', 'sitTicket', 'benchSit'):
                        seat_box(img, x, y, d in ('ne', 'nw'))
                    blit(img, f, x - ax, y - ay)
                    if 'mark' in ex:
                        blit(img, mark[d], x + ex['mark'][0], y + ex['mark'][1])
                    k += 1
    save(img, 'people-d27-seated.png', 4)


def town(sprites):
    whos = P27.NEW_TOWNSFOLK + P27.OLD_TOWNSFOLK + P27.STAND_INS
    CW, CH = 20, 32
    W = 110 + 13 * CW
    H = 6 + len(whos) * CH
    img = np.zeros((H, W, 4), np.uint8); img[...] = BG
    allk = {}
    for name, frames, meta, idx in sprites:
        allk[name] = frames
    for name, frames, meta in PE.build_all():
        allk.setdefault(name, frames)
    for r, who in enumerate(whos):
        label(img, who, 2, 6 + r * CH + 8)
        label(img, P27.NAMES.get(who, ''), 2, 6 + r * CH + 16, (74, 48, 39, 255))
        y = 6 + r * CH + 26
        seq = [(f'ppl/{who}/idle/{d}', 0) for d in PE.DRAWN] + [(f'ppl/{who}/walk/se', k) for k in range(4)] + \
              [(f'ppl/{who}/talk/se', 0), (f'ppl/{who}/talk/se', 1), (f'ppl/{who}/talk/sw', 0),
               (f'ppl/{who}/benchSit/se', 0), (f'ppl/{who}/benchSit/nw', 0)]
        for k, (key, fi) in enumerate(seq):
            frs = allk.get(key)
            if not frs:
                continue
            f, (ax, ay) = frs[fi]
            x = 110 + k * CW + 10
            if 'benchSit' in key:
                seat_box(img, x, y, False)
            blit(img, f, x - ax, y - ay)
    save(img, 'people-d27-town.png', 5)


def coach(sprites):
    """A stand-in coach floor seen in the game's projection (the cut-away: no roof, no near wall): seven rows of
    double benches along x either side of a 1.0u aisle at z = 0, the side benches at the stove end, the agent
    punching in the aisle. The benches are plain stand-in boxes (A2 draws the real ones)."""
    W, H = 220, 100
    img = np.zeros((H, W, 4), np.uint8); img[...] = (230, 207, 158, 255)
    O = (104, 42)
    def proj(x, z, y=0.0):
        return int(round(O[0] + 8 * (x - z))), int(round(O[1] + 4 * (x + z) - 8 * y))
    # the floor and the aisle runner, painted pixel by pixel (inverse projection at y = 0)
    for sy in range(H):
        for sx in range(W):
            a, b = (sx - O[0]) / 8.0, (sy - O[1]) / 4.0
            x, z = (a + b) / 2, (b - a) / 2
            if -5.6 <= x <= 5.6 and -1.9 <= z <= 1.9:
                img[sy, sx] = (168, 119, 75, 255) if abs(z) < 0.45 else (195, 163, 118, 255)
    allk = {name: frames for name, frames, meta, idx in sprites}
    extra = {name: meta.get('extra', {}) for name, frames, meta, idx in sprites}
    mark = {name.split('/')[-1]: frames[0][0] for name, frames, meta, idx in sprites
            if name.startswith('ppl/mark/punched/')}
    agent = {n: f for n, f, m in PE.build_all() if n.startswith('ppl/agent/punch/')}
    objs = []                       # (sort key, kind, data)
    whos = PE.TRAVELLERS
    k = 0
    pitch = 1.34
    for row in range(7):
        x = -4.0 + row * pitch
        face = 'se' if row < 4 else 'nw'          # walk-over seats: half the rows turned each way
        xb = x - 0.35 if face == 'se' else x + 0.35
        for side in (-1, 1):
            z0, z1 = (0.5, 1.9) if side > 0 else (-1.9, -0.5)
            objs.append((xb + (z0 + z1) / 2, 'bench', (x, xb, z0, z1)))
            for pos in (0, 1):
                k += 1
                if (k * 7) % 5 in (1, 3):           # some seats empty
                    continue
                z = side * (0.85 + pos * 0.7)
                who = whos[(k * 5) % len(whos)]
                anim = 'sitTicket' if (row == 2 and side == 1 and pos == 0) else 'sit'
                objs.append((x + z, 'sitter', (f'ppl/{who}/{anim}/{face}/0', x, z, k % 3 != 0)))
    for i, (z, face) in enumerate(((-1.45, 'sw'), (1.45, 'ne'))):
        for j in range(2):
            x = -5.1 + j * 0.65
            who = whos[(3 + i * 5 + j * 2) % len(whos)]
            objs.append((x + z, 'sitter', (f'ppl/{who}/sit/{face}/0', x, z, True)))
    objs.append((-4.0 + 2 * pitch + 0.25, 'agent', (-4.0 + 2 * pitch, 0.25)))
    objs.sort(key=lambda o: o[0])
    for _, kind, d in objs:
        if kind == 'bench':
            x, xb, z0, z1 = d
            xs0, xs1 = min(x - 0.35, x + 0.35), max(x - 0.35, x + 0.35)
            for zz in np.arange(z0, z1, 0.04):            # the seat (0.64u) and its front
                for xx in np.arange(xs0, xs1, 0.04):
                    bx, by = proj(xx, zz, 0.64)
                    if 0 <= bx < W and 0 <= by < H:
                        img[by, bx] = (168, 119, 75, 255)
                for yy in np.arange(0, 0.64, 0.04):
                    bx, by = proj(xs0 if xb > x else xs1, zz, yy)
                    if 0 <= bx < W and 0 <= by < H:
                        img[by, bx] = (118, 77, 51, 255)
            for zz in np.arange(z0, z1, 0.04):            # the back (1.3u)
                for yy in np.arange(0.64, 1.3, 0.04):
                    bx, by = proj(xb, zz, yy)
                    if 0 <= bx < W and 0 <= by < H:
                        img[by, bx] = (118, 77, 51, 255) if yy < 1.25 else (212, 166, 108, 255)
        elif kind == 'sitter':
            key, x, z, punched = d
            (f, (ax, ay)) = allk[key][0]
            sx, sy = proj(x, z)
            blit(img, f, sx - ax, sy - ay)
            ex = extra.get(key, {})
            if punched and 'mark' in ex:
                blit(img, mark[key.split('/')[3]], sx + ex['mark'][0], sy + ex['mark'][1])
        else:
            x, z = d
            f, (ax, ay) = agent['ppl/agent/punch/sw'][1]
            sx, sy = proj(x, z)
            blit(img, f, sx - ax, sy - ay)
    save(img, 'people-d27-coach.png', 5)


def main():
    sprites = P27.build_all()
    os.makedirs(OUT, exist_ok=True)
    contact(sprites)
    handling(sprites)
    seated(sprites)
    town(sprites)
    coach(sprites)
    nk = sum(len(f) if i else 1 for _, f, _, i in sprites)
    print(f'{len(sprites)} D27 people sprite entries, {nk} frames; wrote people-d27-*.png')


if __name__ == '__main__':
    main()
