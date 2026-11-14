# D32 stage 3: furniture and room fittings for the rooms inside every building (plans/d32-tech.md 8.3 and 10.5).
# Drawn with the shape engine in game units, in the same light (upper left), palette, outline rule and scale as the
# coach interior (stock27.py) and the camp (sprites_camp.py): 8 px across per u, 8 px up per u; a person is 20 px
# (2.5u) tall, a chair seat 0.62u (5 px, the people's seated frames), a table top 1.05u, a bed's mattress 0.75u.
#
# Every piece is drawn once in a LOCAL frame and turned to its facings:
#   a  along the piece (its width, left to right as you face its front)
#   c  out of its front (the front is at +c)
#   h  up
# The facing names are the people's: the way the piece's FRONT faces. sw = +z (towards the lower left of the
# screen: a piece standing against the north wall), se = +x (lower right: against the west wall), ne = -z, nw = -x.
# Pieces with only a long axis (table, bench, rug, cell bars, anvil) are /x or /z; round pieces have no suffix.
# Anchor: the footprint centre at floor level (a wall piece: the middle of its back at the wall line, floor level).
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R
import harness as H
from geom27 import B, CYV, UX, UY, clampi, obox, ocyl
from geom_d32 import Frame, hashf

def _alias_ramps():
    """Ramps made of colours the palette already has (no new colour): 'dwood' is the wood ramp a step darker
    (stained walnut and mahogany: the bar, the bank, the piano, the hotel desk)."""
    if 'dwood' in E.RAMPS:
        return
    E.RAMPS['dwood'] = ['w1', 'w2', 'w3', 'w4', 'ink']
    E.RNAMES.append('dwood')
    E.RID['dwood'] = len(E.RNAMES) - 1
    ml = max(len(v) for v in E.RAMPS.values())
    pal = np.zeros((len(E.RNAMES), ml, 3), np.uint8)
    for n, lst in E.RAMPS.items():
        for i in range(ml):
            pal[E.RID[n], i] = E.hx(E.HEX[lst[min(i, len(lst) - 1)]])
    E.PAL = pal
    E.RLEN = np.array([len(E.RAMPS[n]) for n in E.RNAMES])
    E.ML = ml


_alias_ramps()

YAW = {'sw': 0.0, 'se': 90.0, 'ne': 180.0, 'nw': -90.0, 'x': 0.0, 'z': 90.0}
CV = dict(canvas=(300, 300), origin=(150, 210))

SEAT = 0.62        # chair, bench, pew seat top (the people's seated frames: 5 px)
TABLE = 1.05       # table and desk tops
BED = 0.75         # mattress top of a bed, cot or bunk (ppl/<who>/lie is drawn at this height)


class P:
    """A piece's local frame turned to a facing."""

    def __init__(self, d='sw', origin=(0.0, 0.0, 0.0)):
        self.d = d
        self.F = Frame(yaw=YAW.get(d, 0.0), origin=origin)
        self.oid = E.new_oid(True)

    def new(self):
        self.oid = E.new_oid(True)
        return self.oid

    def pt(self, a, c, h):
        return self.F.pt(a, c, h)

    def box(self, a0, c0, h0, a1, c1, h1, ramp, tex=None, shades=(1, 2, 3), oid=None):
        a0, a1 = min(a0, a1), max(a0, a1)
        c0, c1 = min(c0, c1), max(c0, c1)
        h0, h1 = min(h0, h1), max(h0, h1)
        ca, cc, ch = (a0 + a1) / 2, (c0 + c1) / 2, (h0 + h1) / 2
        t = None
        if tex is not None:
            def t(k, sgn, uvw, idx):
                u, v, w = uvw
                return tex(k, sgn, u + ca, v + cc, w + ch, idx)
        self.F.box(a0, c0, h0, a1, c1, h1, ramp, tex=t, oid=self.oid if oid is None else oid, cast=False,
                   shades=shades)

    def rod(self, p0, p1, r, ramp, oid=None):
        self.F.rod(p0, p1, r, ramp, oid=self.oid if oid is None else oid, cast=False)

    def cylv(self, a, c, h0, h1, r, ramp, tex=None, topidx=1, oid=None):
        x, z, _ = self.pt(a, c, 0)
        CYV(x, z, h0, h1, r, ramp, tex=tex, topidx=topidx, oid=self.oid if oid is None else oid, cast=False)

    def cyl(self, a, c, h, axis, r, hl, ramp, tex=None, oid=None):
        ax = {'a': self.F.A, 'c': self.F.C, 'h': self.F.H}[axis]
        ocyl(self.pt(a, c, h), ax, r, hl, ramp, tex=tex, oid=self.oid if oid is None else oid, cast=False)

    def ball(self, a, c, h, r, ramp, sz=1.0, oid=None, th=(0.85, 0.5, -0.1)):
        x, z, y = self.pt(a, c, h)
        E.sphere(x * UX, z * UX, y * UY, r * UX, ramp, oid=self.oid if oid is None else oid, cast=False, sz=sz, th=th)


# ---------------------------------------------------------------- textures (local coordinates a, c, h in u)
def planks(step=0.25, axis='a', knot=True):
    """Boards: a darker seam every `step` across the boards, a knot now and then. Seams closer than 3 px read as a
    checker at this scale, so the step is at least 0.375u."""
    step = max(step, 0.375)

    def tex(k, sgn, a, c, h, idx):
        v = {'a': a, 'c': c, 'h': h}[axis]
        seam = np.mod(v + 10.0, step) < 0.045
        ii = np.where(seam, clampi(idx + 1), idx)
        if knot:
            n = E.hash2(np.floor(a * 6).astype(int) + 31, np.floor((c + h) * 6).astype(int)) % 41
            ii = np.where(n == 0, clampi(ii + 1), ii)
        return None, ii
    return tex


def combine(*texs):
    """Several textures in turn; a later one's ramp wins where it sets one (-1 keeps what was there)."""
    def tex(k, sgn, a, c, h, idx):
        rr = None
        for t in texs:
            r2, idx = t(k, sgn, a, c, h, idx)[:2]
            if r2 is not None:
                r2 = np.broadcast_to(np.asarray(r2), np.shape(idx))
                rr = r2 if rr is None else np.where(r2 >= 0, r2, rr)
        return rr, idx
    return tex


def drawers(a0, a1, h0, h1, rows=2, cols=1, knob='brass', face=(1, 1)):
    """Drawer fronts on a face: seams two shades darker, a knob in the middle of each."""
    fk, fs = face
    dh = (h1 - h0) / rows
    da = (a1 - a0) / cols

    def tex(k, sgn, a, c, h, idx):
        u = a if fk == 1 else c
        on = (k == fk) & (sgn == fs) & (u > a0) & (u < a1) & (h > h0) & (h < h1)
        ra = np.mod(u - a0, da); rh = np.mod(h - h0, dh)
        seam = (ra < 0.05) | (rh < 0.06)
        kn = on & ~seam & (np.abs(ra - da / 2) < 0.07) & (np.abs(rh - dh / 2) < 0.07)
        ii = np.where(on & seam, clampi(idx + 2), idx)
        ii = np.where(kn, 1, ii)
        return np.where(kn, R(knob), -1), ii
    return tex


def with_ramp(tex, base):
    """Turn a tex that returns -1 for 'keep the base ramp' into one the engine understands."""
    def t(k, sgn, a, c, h, idx):
        rr, ii = tex(k, sgn, a, c, h, idx)
        if rr is None:
            return None, ii
        return np.where(np.asarray(rr) >= 0, rr, R(base)), ii
    return t


def wood_box(p, a0, c0, h0, a1, c1, h1, ramp='wood', step=0.25, axis='h', extra=None, shades=(1, 2, 3)):
    t = planks(step, axis)
    if extra is not None:
        t = combine(t, extra)
    p.box(a0, c0, h0, a1, c1, h1, ramp, tex=t, shades=shades)


# ---------------------------------------------------------------- small goods (for shelves, counters, stacks)
GOOD_RAMPS = ['red', 'green', 'navy', 'ochre', 'cream', 'brick', 'slate', 'plum', 'straw', 'sage']


def goods_row(p, a0, a1, c, h, depth, fill, seed, kinds=('tin', 'box', 'jar', 'bolt', 'sack')):
    """Small goods standing along a shelf from a0 to a1 at height h; fill 0..1 of the slots (the same goods stay in
    the same slots as stock grows: each slot's place in the filling order is fixed by the seed)."""
    slots = []
    a = a0 + 0.04
    k = 0
    while a < a1 - 0.12:
        kind = kinds[int(hashf(seed, k, 1) * len(kinds)) % len(kinds)]
        w = {'tin': 0.2, 'box': 0.32, 'jar': 0.2, 'bolt': 0.3, 'sack': 0.36, 'bottle': 0.13, 'can': 0.24,
             'crock': 0.26}[kind]
        if a + w > a1 - 0.02:
            break
        slots.append((a, w, kind, k))
        a += w + 0.04
        k += 1
    order = sorted(range(len(slots)), key=lambda i: hashf(seed, i, 7))
    n = int(round(fill * len(slots)))
    take = set(order[:n])
    for i, (a, w, kind, k) in enumerate(slots):
        if i not in take:
            continue
        col = GOOD_RAMPS[int(hashf(seed, k, 3) * len(GOOD_RAMPS)) % len(GOOD_RAMPS)]
        cz = c - depth / 2
        o = p.new()
        if kind == 'tin':
            p.box(a, cz - 0.1, h, a + w, cz + 0.1, h + 0.3, col, tex=label_band(0.1, 0.2, h), oid=o)
        elif kind == 'can':
            p.box(a, cz - 0.12, h, a + w, cz + 0.12, h + 0.42, col, tex=label_band(0.12, 0.3, h), oid=o)
        elif kind == 'box':
            hh = 0.2 + 0.2 * hashf(seed, k, 5)
            p.box(a, cz - 0.16, h, a + w, cz + 0.16, h + hh, col, oid=o)
        elif kind == 'jar':
            p.box(a, cz - 0.1, h, a + w, cz + 0.1, h + 0.34, 'glass', shades=(0, 1, 2), oid=o)
            p.box(a + 0.02, cz - 0.08, h + 0.02, a + w - 0.02, cz + 0.08, h + 0.2, col, oid=o)
            p.box(a, cz - 0.1, h + 0.34, a + w, cz + 0.1, h + 0.38, 'iron', oid=o)
        elif kind == 'bottle':
            p.box(a, cz - 0.06, h, a + w, cz + 0.06, h + 0.36, col if col in ('green', 'ochre', 'brick') else 'green',
                  shades=(0, 1, 2), oid=o)
            p.box(a + 0.03, cz - 0.03, h + 0.36, a + w - 0.03, cz + 0.03, h + 0.52, 'green', oid=o)
        elif kind == 'bolt':
            p.cyl(a + w / 2, cz, h + 0.13, 'c', 0.13, depth / 2 - 0.02, col, oid=o)
        elif kind == 'sack':
            p.box(a, cz - 0.15, h, a + w, cz + 0.15, h + 0.36, 'canvas', shades=(1, 2, 3), oid=o)
            p.box(a + 0.06, cz - 0.1, h + 0.36, a + w - 0.06, cz + 0.1, h + 0.44, 'canvas', shades=(1, 2, 3), oid=o)
        elif kind == 'crock':
            p.cylv(a + w / 2, cz, h, h + 0.32, 0.12, 'cream', oid=o)
            p.cylv(a + w / 2, cz, h + 0.32, h + 0.36, 0.08, 'umber', oid=o)


def label_band(lo, hi, h0):
    def tex(k, sgn, a, c, h, idx):
        band = (h > h0 + lo) & (h < h0 + hi)
        return np.where(band, R('cream'), -1), np.where(band, clampi(idx - 1), idx)
    return tex


# The engine needs a full ramp array, so any tex that returns -1 for "keep" is resolved by the P.box wrapper below.
_box_orig = P.box


def _box_keep(self, a0, c0, h0, a1, c1, h1, ramp, tex=None, shades=(1, 2, 3), oid=None):
    if tex is not None:
        t0 = tex

        def tex(k, sgn, a, c, h, idx, t0=t0):
            rr, ii = t0(k, sgn, a, c, h, idx)[:2]
            if rr is None:
                return None, ii
            rr = np.asarray(rr)
            return np.where(rr >= 0, rr, R(ramp)), ii
    _box_orig(self, a0, c0, h0, a1, c1, h1, ramp, tex=tex, shades=shades, oid=oid)


P.box = _box_keep


# ================================================================ the pieces
# Each returns its extra data (footprint in local u, use spots) and draws into the canvas.

def counter(p, length=3.0, depth=0.8, height=1.15, top_goods=True):
    """A shop counter: panelled front (customer side, +c), the keeper's side open shelves with paper and twine,
    a top board overhanging, brass scales and a jar of candy on top."""
    hl, hd = length / 2, depth / 2
    body = combine(planks(0.25, 'h'), panel_tex(-hl, hl, 0.1, height - 0.12, n=3, fk=1, fs=1))
    p.box(-hl, -hd, 0.0, hl, hd, height - 0.08, 'wood', tex=body)
    # the keeper's side: open shelves (dark inside), goods on them
    p.box(-hl + 0.08, -hd - 0.01, 0.12, hl - 0.08, -hd + 0.02, height - 0.16, 'wood', shades=(3, 3, 3))
    o = p.new()
    p.box(-hl + 0.08, -hd - 0.02, 0.5, hl - 0.08, -hd + 0.25, 0.55, 'wood', shades=(1, 2, 3), oid=o)
    goods_row(p, -hl + 0.12, hl - 0.12, -hd + 0.26, 0.55, 0.28, 0.7, 501, kinds=('box', 'bolt', 'tin'))
    goods_row(p, -hl + 0.12, hl - 0.12, -hd + 0.26, 0.12, 0.28, 0.6, 502, kinds=('box', 'sack', 'crock'))
    p.oid = p.new()
    # the top
    p.box(-hl - 0.08, -hd - 0.06, height - 0.08, hl + 0.08, hd + 0.08, height, 'wood', shades=(0, 1, 2),
          tex=planks(0.3, 'c'))
    # kick board
    p.box(-hl + 0.02, hd - 0.02, 0.0, hl - 0.02, hd + 0.03, 0.1, 'umber', shades=(2, 2, 3))
    if top_goods:
        o = p.new()
        # scales: a brass beam on a post, two pans
        p.box(hl - 0.75, -0.12, height, hl - 0.35, 0.12, height + 0.06, 'brass', oid=o)
        p.box(hl - 0.57, -0.03, height + 0.06, hl - 0.53, 0.03, height + 0.42, 'brass', oid=o)
        p.box(hl - 0.85, -0.02, height + 0.4, hl - 0.25, 0.02, height + 0.44, 'brass', oid=o)
        p.cylv(hl - 0.82, 0.0, height + 0.18, height + 0.22, 0.13, 'brass', oid=o)
        p.cylv(hl - 0.28, 0.0, height + 0.18, height + 0.22, 0.13, 'brass', oid=o)
        o = p.new()
        # a glass candy jar
        p.cylv(-hl + 0.45, 0.05, height, height + 0.42, 0.15, 'glass', oid=o)
        p.cylv(-hl + 0.45, 0.05, height + 0.04, height + 0.24, 0.12, 'red', oid=o)
        p.cylv(-hl + 0.45, 0.05, height + 0.42, height + 0.48, 0.1, 'iron', oid=o)
        o = p.new()
        # a roll of brown paper on its stand and a ball of twine
        p.cyl(-0.3, -0.05, height + 0.17, 'a', 0.13, 0.35, 'straw', oid=o)
        p.box(-0.7, -0.15, height, -0.66, 0.1, height + 0.3, 'iron', oid=o)
        p.box(0.06, -0.15, height, 0.1, 0.1, height + 0.3, 'iron', oid=o)
        p.ball(0.35, 0.15, height + 0.08, 0.08, 'cream', oid=p.new())
    return dict(foot=[-hl - 0.08, -hd - 0.06, hl + 0.08, hd + 0.08], top=height,
                use=[[0.0, -hd - 0.45, 'keeper'], [0.0, hd + 0.5, 'customer']])


def panel_tex(a0, a1, h0, h1, n=2, fk=1, fs=1, inset=0.1):
    """Raised panels on face (fk, fs): a darker frame line round each panel, the panel's top and left edges a shade
    darker (in shade), its bottom and right a shade lighter."""
    w = (a1 - a0) / n

    def tex(k, sgn, a, c, h, idx):
        on = (k == fk) & (sgn == fs)
        u = a if fk == 1 else c
        if fk == 0 and fs < 0:
            u = -c
        if fk == 1 and fs < 0:
            u = -a
        rel = np.mod(u - a0, w)
        inn = on & (rel > inset) & (rel < w - inset) & (h > h0 + inset) & (h < h1 - inset) & (u > a0) & (u < a1)
        edge_dark = inn & ((h > h1 - inset - 0.05) | (rel < inset + 0.05))
        edge_lite = inn & ((h < h0 + inset + 0.05) | (rel > w - inset - 0.05))
        ii = np.where(edge_dark, clampi(idx + 1), idx)
        ii = np.where(edge_lite, clampi(idx - 1), ii)
        return None, ii
    return tex


def counter_back(p, length=3.0):
    """Wall shelves for a store, behind the counter (the stock levels are the shelf piece)."""
    return shelves(p, 3, length=length)


def shelves(p, level, length=2.4, depth=0.55, height=2.7, seed=11, kinds=('tin', 'box', 'jar', 'bolt', 'can',
                                                                            'crock', 'box', 'tin')):
    """General goods shelves standing against a wall: four shelves and a top, stock 0 empty, 1 low, 2 half, 3 full.
    The back of the piece is at c = 0 (the wall line); it stands out to c = depth."""
    hl = length / 2
    fill = [0.0, 0.25, 0.55, 1.0][level]
    # back boards
    p.box(-hl, 0.0, 0.0, hl, 0.05, height, 'wood', tex=planks(0.3, 'a'), shades=(2, 3, 3))
    # the two sides and the cornice
    for s in (-1, 1):
        p.box(s * hl - (0.08 if s > 0 else 0), 0.0, 0.0, s * hl + (0.0 if s > 0 else 0.08), depth, height, 'wood',
              tex=planks(0.4, 'h'))
    p.box(-hl - 0.06, 0.0, height, hl + 0.06, depth + 0.06, height + 0.12, 'wood', shades=(0, 1, 2))
    p.box(-hl, depth - 0.04, 0.0, hl, depth, 0.14, 'umber', shades=(2, 2, 3))
    hs = [0.14, 0.75, 1.32, 1.9]
    for i, h in enumerate(hs):
        p.box(-hl + 0.08, 0.05, h - 0.05, hl - 0.08, depth, h, 'wood', shades=(1, 2, 3))
        f = fill
        if level == 0 and i == 1:
            f = 0.1                     # a stray tin or two left on an empty shelf
        goods_row(p, -hl + 0.1, hl - 0.1, depth, h, depth - 0.1, f, seed * 10 + i, kinds=kinds)
        p.oid = p.new()
    if level == 3:                       # full: more on top
        goods_row(p, -hl + 0.1, hl - 0.1, depth, height + 0.12, depth - 0.1, 0.6, seed * 10 + 9,
                  kinds=('box', 'crock', 'bolt'))
    return dict(foot=[-hl - 0.06, 0.0, hl + 0.06, depth + 0.06], wall=True, use=[[0.0, depth + 0.45, 'take']],
                levels='frame 0 empty, 1 low, 2 half, 3 full')


def crate(p, a, c, h, s=0.8, ramp='wood', mark=None, lid=True, seed=0):
    o = p.new()
    t = combine(planks(0.2, 'h'), lambda k, sgn, aa, cc, hh, idx: (None, np.where(
        (np.abs(aa - a) > s / 2 - 0.07) | (np.abs(cc - c) > s / 2 - 0.07) | (np.abs(hh - h - s * 0.5) < 0.04),
        clampi(idx + 1), idx)))
    p.box(a - s / 2, c - s / 2, h, a + s / 2, c + s / 2, h + s * 0.85, ramp, tex=t, oid=o)
    if mark:
        p.box(a - 0.12, c + s / 2, h + 0.25, a + 0.12, c + s / 2 + 0.01, h + 0.45, mark, shades=(1, 1, 1), oid=o)
    return h + s * 0.85


def sack(p, a, c, h, ramp='canvas', axis='a', seed=0):
    o = p.new()
    L, Wd = (1.1, 0.65) if axis == 'a' else (0.65, 1.1)
    p.box(a - L / 2, c - Wd / 2, h, a + L / 2, c + Wd / 2, h + 0.36, ramp, oid=o, shades=(1, 2, 3))
    p.box(a - L / 2 + 0.08, c - Wd / 2 + 0.06, h + 0.36, a + L / 2 - 0.08, c + Wd / 2 - 0.06, h + 0.46, ramp,
          oid=o, shades=(1, 2, 3))
    # the tied neck
    if axis == 'a':
        p.box(a + L / 2, c - 0.1, h + 0.08, a + L / 2 + 0.12, c + 0.1, h + 0.28, ramp, oid=o, shades=(1, 2, 3))
    else:
        p.box(a - 0.1, c + Wd / 2, h + 0.08, a + 0.1, c + Wd / 2 + 0.12, h + 0.28, ramp, oid=o, shades=(1, 2, 3))
    # a stencilled mark
    if hashf(seed, 3) > 0.4:
        p.box(a - 0.12, c - 0.1, h + 0.4, a + 0.12, c + 0.1, h + 0.41, 'navy' if hashf(seed, 4) > 0.5 else 'red',
              oid=o, shades=(2, 2, 2))
    return h + 0.46


def crates_stack(p, level):
    """Crates on the floor, 0 empty (an opened empty crate, its lid against it, straw), 1 two, 2 four, 3 seven."""
    if level == 0:
        o = p.new()
        p.box(-0.4, -0.4, 0.0, 0.4, 0.4, 0.1, 'wood', oid=o)
        for s in (-1, 1):
            p.box(s * 0.4 - 0.04, -0.4, 0.0, s * 0.4 + 0.04, 0.4, 0.62, 'wood', oid=o, tex=planks(0.2, 'h'))
            p.box(-0.4, s * 0.4 - 0.04, 0.0, 0.4, s * 0.4 + 0.04, 0.62, 'wood', oid=o, tex=planks(0.2, 'h'))
        p.box(-0.32, -0.32, 0.1, 0.32, 0.32, 0.22, 'straw', oid=o)
        o = p.new()
        p.F.box(0.45, -0.4, 0.0, 0.53, 0.4, 0.75, 'wood', oid=o, cast=False)
        for k in range(4):
            p.box(-0.6 + k * 0.3, 0.5 + 0.1 * (k % 2), 0.0, -0.5 + k * 0.3, 0.6 + 0.1 * (k % 2), 0.03, 'straw',
                  oid=o)
        return dict(foot=[-0.55, -0.55, 0.6, 0.6])
    spots = [(-0.45, -0.45, 0), (0.45, -0.45, 0), (-0.45, 0.45, 0), (0.45, 0.45, 0), (-0.45, -0.45, 1),
             (0.45, -0.45, 1), (0.0, -0.45, 2)]
    n = {1: 2, 2: 4, 3: 7}[level]
    marks = ['red', 'green', None, 'navy', 'red', None, 'green']
    for i, (a, c, lay) in enumerate(spots[:n]):
        ramp = 'wood' if i % 3 else 'ochre'
        crate(p, a, c, lay * 0.68, 0.8, ramp, marks[i])
    return dict(foot=[-0.9, -0.9, 0.9, 0.9])


def sacks_stack(p, level):
    """Sacks of flour and feed on the floor: 0 empty (an empty sack folded, a dusting of flour), 1 two, 2 four,
    3 a stacked pile of eight."""
    if level == 0:
        o = p.new()
        p.box(-0.45, -0.3, 0.0, 0.45, 0.3, 0.06, 'canvas', oid=o)
        p.box(-0.3, -0.2, 0.06, 0.25, 0.25, 0.1, 'canvas', oid=o, shades=(2, 2, 3))
        p.box(0.3, 0.2, 0.0, 0.6, 0.5, 0.01, 'cream', oid=p.new(), shades=(0, 0, 0))
        return dict(foot=[-0.5, -0.35, 0.6, 0.55])
    spots = [(0.0, -0.36, 0, 'a'), (0.0, 0.36, 0, 'a'), (-0.95, 0.0, 0, 'c'), (0.95, 0.0, 0, 'c'),
             (-0.3, 0.0, 1, 'c'), (0.3, 0.0, 1, 'c'), (0.75, 0.15, 1, 'c'), (0.0, 0.0, 2, 'a')]
    n = {1: 2, 2: 4, 3: 8}[level]
    rr = ['straw', 'canvas', 'earth', 'straw', 'canvas', 'earth', 'straw', 'canvas']
    for i, (a, c, lay, ax) in enumerate(spots[:n]):
        sack(p, a, c, lay * 0.42, rr[i], ax, seed=i + 40)
    return dict(foot=[-1.3, -0.7, 1.3, 0.7])


def stove(p, f=0):
    """A pot-bellied stove on a zinc plate, its pipe up to 3.8u (the ceiling), a coal scuttle; f 0 and 1: the
    fire's glow through the door flickers."""
    p.box(-0.55, -0.55, 0.0, 0.55, 0.55, 0.03, 'iron', shades=(1, 2, 3))
    o = p.new()
    glow = {-1: 'dark', 0: 'fire', 1: 'brass'}[f]

    def st(part, s, ang, rho, idx):
        rr = np.full(s.shape, R('blk')); ii = idx.copy()
        win = (part == 0) & (np.abs(s + 0.08) < 0.12) & (np.cos(ang - 0.5) > 0.6)
        rr = np.where(win, R(glow), rr); ii = np.where(win, np.where(s > -0.08, 0, 1), ii)
        ring = (part == 0) & (np.abs(np.abs(s) - 0.36) < 0.04)
        rr = np.where(ring, R('iron'), rr); ii = np.where(ring, 1, ii)
        return rr, ii
    x, z, _ = p.pt(0, 0, 0)
    ocyl((x, z, 0.55), (0, 0, 1), 0.32, 0.42, 'blk', tex=st, oid=o)
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.4
        p.box(math.cos(a) * 0.25 - 0.04, math.sin(a) * 0.25 - 0.04, 0.03, math.cos(a) * 0.25 + 0.04,
              math.sin(a) * 0.25 + 0.04, 0.14, 'blk', oid=o)
    E.sphere(x * UX, z * UX, 1.0 * UY, 0.34 * UX, 'blk', oid=o, sz=0.55 * 1.3, cast=False)
    E.sphere(x * UX, z * UX, 1.18 * UY, 0.1 * UX, 'brass', oid=o, cast=False)
    CYV(x - 0.12, z - 0.1, 1.0, 3.8, 0.09, 'blk', oid=o, topidx=3, cast=False)
    o2 = p.new()
    p.box(-0.2, -0.3, 2.6, 0.0, -0.1, 2.66, 'iron', oid=o2)
    # the coal scuttle
    o3 = p.new()
    p.cylv(0.62, 0.38, 0.0, 0.3, 0.14, 'iron', oid=o3)
    p.ball(0.62, 0.38, 0.32, 0.1, 'dark', oid=o3)
    return dict(foot=[-0.55, -0.55, 0.8, 0.6], hot=True)


def table(p, length=2.0, width=1.2, cloth=None, things=True, seed=1):
    """A kitchen table on turned legs; cloth: a ramp for a tablecloth; things: a jug, plates or a bowl."""
    hl, hw = length / 2, width / 2
    top_r = cloth or 'wood'
    for sa in (-1, 1):
        for sc in (-1, 1):
            p.box(sa * (hl - 0.12) - 0.06, sc * (hw - 0.12) - 0.06, 0.0, sa * (hl - 0.12) + 0.06,
                  sc * (hw - 0.12) + 0.06, TABLE - 0.08, 'wood')
    p.box(-hl + 0.1, -hw + 0.1, TABLE - 0.25, hl - 0.1, hw - 0.1, TABLE - 0.08, 'wood', shades=(2, 2, 3))
    if cloth:
        def ck(k, sgn, a, c, h, idx):
            chk = (np.floor(a * 4) + np.floor(c * 4)) % 2 == 0
            return None, np.where(chk & (k == 2), clampi(idx + 1), idx)
        p.box(-hl - 0.05, -hw - 0.05, TABLE - 0.22, hl + 0.05, hw + 0.05, TABLE, cloth, tex=ck, shades=(0, 1, 2))
    else:
        p.box(-hl, -hw, TABLE - 0.08, hl, hw, TABLE, 'wood', tex=planks(0.3, 'c'), shades=(1, 2, 3))
    if things:
        o = p.new()
        p.cylv(-hl * 0.45, -0.1, TABLE, TABLE + 0.32, 0.12, 'cream', oid=o)
        p.box(-hl * 0.45 + 0.1, -0.13, TABLE + 0.1, -hl * 0.45 + 0.2, -0.07, TABLE + 0.26, 'cream', oid=o)
        for k, a in enumerate((hl * 0.3, hl * 0.7)):
            p.cylv(a, (-1) ** k * 0.25, TABLE, TABLE + 0.03, 0.17, 'cream', topidx=0, oid=p.new())
        p.cylv(0.1, 0.25, TABLE, TABLE + 0.12, 0.14, 'slate', oid=p.new())
    return dict(foot=[-hl - 0.05, -hw - 0.05, hl + 0.05, hw + 0.05], top=TABLE,
                use=[[0, -hw - 0.55, 'sit'], [0, hw + 0.55, 'sit'], [-hl - 0.55, 0, 'sit'], [hl + 0.55, 0, 'sit']])


def chair(p):
    """A kitchen chair: seat 0.62u, spindle back; front +c (the sitter faces it)."""
    s = 0.24
    for sa in (-1, 1):
        for sc in (-1, 1):
            p.box(sa * s - 0.04, sc * s - 0.04, 0.0, sa * s + 0.04, sc * s + 0.04, SEAT - 0.06, 'wood')
    p.box(-s - 0.06, -s - 0.06, SEAT - 0.08, s + 0.06, s + 0.06, SEAT, 'wood', shades=(0, 1, 2))
    for sa in (-1, 1):
        p.box(sa * s - 0.04, -s - 0.06, SEAT, sa * s + 0.04, -s + 0.02, 1.45, 'wood')
    for k in (-1, 0, 1):
        p.box(k * 0.1 - 0.025, -s - 0.04, SEAT, k * 0.1 + 0.025, -s + 0.0, 1.32, 'wood', shades=(1, 2, 3))
    p.box(-s - 0.06, -s - 0.07, 1.3, s + 0.06, -s + 0.03, 1.46, 'wood', shades=(0, 1, 2))
    return dict(foot=[-0.3, -0.3, 0.3, 0.3], seat=SEAT, use=[[0, 0, 'sit']])


def bench(p, length=2.4):
    hl = length / 2
    p.box(-hl, -0.22, SEAT - 0.08, hl, 0.22, SEAT, 'wood', tex=planks(0.6, 'a'), shades=(0, 1, 2))
    for a in (-hl + 0.25, hl - 0.25):
        p.box(a - 0.05, -0.2, 0.0, a + 0.05, 0.2, SEAT - 0.08, 'wood')
    p.box(-hl + 0.25, -0.03, 0.18, hl - 0.25, 0.03, 0.26, 'wood')
    return dict(foot=[-hl, -0.22, hl, 0.22], seat=SEAT, use=[[-hl / 2, 0, 'sit'], [hl / 2, 0, 'sit']])


QUILT = 'red'


def bed(p, sleeper=False, quilt='red', length=2.6, width=1.3, iron=False, frame='wood'):
    """A bed, its head at -c (against the wall), the foot at +c. Made: pillow, a patchwork quilt, the sheet turned
    down. sleeper: the quilt humped over someone asleep and pulled up to the pillow; the sleeper's head is the
    person's lie frame, drawn over it (ppl/<who>/lie). Every bed, cot and bunk is 2.6u long with the pillow's middle
    at HEAD from the centre, so one lie frame fits them all. Mattress top at BED."""
    hl, hw = length / 2, width / 2
    # frame: head board, foot board, side rails
    if iron:
        for c in (-hl, hl):
            top = 1.45 if c < 0 else 1.05
            for a in (-hw, hw):
                p.box(a - 0.04, c - 0.04, 0.0, a + 0.04, c + 0.04, top, 'iron')
            p.box(-hw, c - 0.03, top - 0.08, hw, c + 0.03, top, 'iron', shades=(0, 1, 2))
            for k in range(1, 6):
                a = -hw + k * width / 6
                p.box(a - 0.02, c - 0.02, BED - 0.1, a + 0.02, c + 0.02, top - 0.08, 'iron', shades=(1, 2, 2))
    else:
        p.box(-hw - 0.05, -hl - 0.1, 0.0, hw + 0.05, -hl, 1.55, frame, tex=combine(
            planks(0.3, 'a'), panel_tex(-hw, hw, 0.8, 1.45, n=1, fk=1, fs=1, inset=0.12)))
        p.box(-hw - 0.08, -hl - 0.12, 1.55, hw + 0.08, -hl + 0.02, 1.63, frame, shades=(0, 1, 2))
        p.box(-hw - 0.05, hl, 0.0, hw + 0.05, hl + 0.1, 1.0, frame, tex=planks(0.3, 'a'))
        p.box(-hw - 0.08, hl - 0.02, 1.0, hw + 0.08, hl + 0.12, 1.08, frame, shades=(0, 1, 2))
    p.box(-hw, -hl, 0.25, hw, hl, 0.45, frame if not iron else 'iron', shades=(2, 2, 3))
    # mattress and quilt
    p.oid = p.new()
    p.box(-hw + 0.04, -hl + 0.02, 0.45, hw - 0.04, hl - 0.02, BED - 0.06, 'cream', shades=(1, 2, 3))

    def patch(k, sgn, a, c, h, idx):
        # big two-tone patches (about 4 px) so the shape under the quilt still reads, a cream patch now and then,
        # a cream border round the edge
        ia = np.floor(a / 0.45 + 20).astype(int); ic = np.floor(c / 0.45 + 20).astype(int)
        q = (ia + ic) % 2
        cream = (E.hash2(ia, ic + 3) % 5 == 0) & (k == 2)
        edge = (k != 2) & (h < BED - 0.08)
        rr = np.where(cream | edge, R('cream'), R(quilt))
        ii = np.where(cream | edge, clampi(idx), np.where(q == 1, clampi(idx + 1), idx))
        return rr, ii
    o = p.new()
    q0 = -hl + 0.75
    if not sleeper:
        p.box(-hw - 0.02, q0, 0.5, hw + 0.02, hl + 0.0, BED + 0.04, quilt, tex=patch, oid=o)
        # the turned-down sheet
        p.box(-hw + 0.0, q0 - 0.12, BED - 0.04, hw, q0 + 0.06, BED + 0.06, 'cream', shades=(0, 1, 2), oid=o)
        p.box(-hw + 0.15, -hl + 0.1, BED - 0.06, hw - 0.15, -hl + 0.6, BED + 0.16, 'cream', shades=(0, 0, 1),
              oid=p.new())
    else:
        p.box(-hw - 0.02, q0, 0.5, hw + 0.02, hl + 0.0, BED + 0.04, quilt, tex=patch, oid=o)
        # the shape under it: the body, the hip, the feet
        p.box(-0.42, q0 - 0.05, BED, 0.38, q0 + 1.35, BED + 0.26, quilt, tex=patch, oid=o)
        p.box(-0.36, q0 + 0.4, BED + 0.2, 0.36, q0 + 0.95, BED + 0.36, quilt, tex=patch, oid=o)
        p.box(-0.3, hl - 0.45, BED, 0.3, hl - 0.15, BED + 0.3, quilt, tex=patch, oid=o)
        p.box(-hw + 0.15, -hl + 0.1, BED - 0.06, hw - 0.15, -hl + 0.6, BED + 0.12, 'cream', shades=(0, 0, 1),
              oid=p.new())
    return dict(foot=[-hw - 0.08, -hl - 0.12, hw + 0.08, hl + 0.12], bed=BED, h=1.63 if not iron else 1.45,
                use=[[hw + 0.5, 0.0, 'side'], [0, 0, 'lie']])


def cot(p, quilt='slate', sleeper=False):
    """A narrow iron bed (a child's bed, a maid's room, a hotel room): 2.6 x 0.9u, mattress at BED."""
    return bed(p, quilt=quilt, length=2.6, width=0.9, iron=True, sleeper=sleeper)


def bunk(p):
    """The jail bunk: a plank shelf hung from the wall on two chains, a grey blanket and a straw tick; along a, the
    back (-c) at the wall."""
    p.box(-1.3, 0.0, BED - 0.12, 1.3, 0.9, BED - 0.04, 'wood', tex=planks(0.25, 'a'))
    for a in (-1.0, 1.0):
        p.rod((a, 0.87, BED - 0.06), (a, 0.0, 1.7), 0.015, 'iron')
        p.box(a - 0.06, 0.0, 1.62, a + 0.06, 0.05, 1.74, 'iron')
        p.box(a - 0.05, 0.83, 0.0, a + 0.05, 0.9, BED - 0.12, 'wood')
    p.box(-1.25, 0.05, BED - 0.04, 1.25, 0.85, BED + 0.06, 'straw', shades=(1, 2, 3))
    p.box(-0.55, 0.03, BED + 0.06, 1.25, 0.87, BED + 0.12, 'slate', shades=(1, 2, 3), oid=p.new())
    return dict(h=1.75, foot=[-1.3, 0.0, 1.3, 0.9], bed=BED, wall=True, use=[[0, 1.35, 'side', '-c'], [0, 0.45, 'lie']],
                note='the sleeper lies along its length, the head at the -x (bunk x) or -z (bunk z) end')


def cupboard(p, width=1.4, depth=0.6, height=2.5, glass=True):
    """A kitchen dresser: closed doors below, drawers, glass-fronted top with plates and cups; back at c = 0."""
    hw = width / 2
    p.box(-hw, 0.0, 0.0, hw, depth, 1.0, 'wood', tex=combine(planks(0.3, 'h'),
                                                             panel_tex(-hw, hw, 0.1, 0.75, 2, 1, 1, 0.1),
                                                             drawers(-hw, hw, 0.75, 0.98, rows=1, cols=2)))
    p.box(-hw - 0.05, 0.0, 1.0, hw + 0.05, depth + 0.05, 1.06, 'wood', shades=(0, 1, 2))
    p.box(-hw + 0.04, 0.0, 1.06, hw - 0.04, depth * 0.55, height, 'wood', tex=planks(0.3, 'h'))
    # glass doors: the shelves and plates behind them
    o = p.new()
    p.box(-hw + 0.1, depth * 0.55 - 0.02, 1.15, hw - 0.1, depth * 0.55 + 0.005, height - 0.1, 'umber',
          shades=(2, 2, 3), oid=o)
    for h in (1.55, 2.0):
        p.box(-hw + 0.1, depth * 0.3, h - 0.03, hw - 0.1, depth * 0.55, h, 'wood', oid=o)
    for k in range(4):
        a = -hw + 0.25 + k * (width - 0.5) / 3
        p.box(a - 0.15, depth * 0.36, 1.58, a + 0.15, depth * 0.42, 1.92, 'cream', shades=(0, 1, 1), oid=o)
        p.cylv(a, depth * 0.45, 1.15, 1.32, 0.07, 'navy' if k % 2 else 'cream', oid=o)
        p.cylv(a, depth * 0.45, 2.0, 2.2, 0.07, 'cream', oid=o)
    p.box(-0.03, depth * 0.55, 1.15, 0.03, depth * 0.58, height - 0.1, 'wood', oid=o)
    p.box(-hw - 0.05, 0.0, height, hw + 0.05, depth * 0.55 + 0.08, height + 0.12, 'wood', shades=(0, 1, 2),
          oid=p.new())
    return dict(foot=[-hw - 0.05, 0.0, hw + 0.05, depth + 0.05], wall=True, top=1.06,
                use=[[0, depth + 0.45, 'take']])


def desk(p, length=1.8, depth=0.9, roll=False, papers=True):
    """An office desk, the sitter's side (knee hole) at +c; drawers in two pedestals; an inkwell, a pen, ledgers.
    roll: a roll-top desk (its pigeonholes)."""
    hl, hd = length / 2, depth / 2
    for s in (-1, 1):
        a0, a1 = (s * hl, s * (hl - 0.55))
        p.box(a0, -hd, 0.0, a1, hd, TABLE - 0.06, 'wood', tex=combine(planks(0.3, 'h'),
                                                                      drawers(min(a0, a1), max(a0, a1), 0.08,
                                                                              TABLE - 0.1, rows=3)))
    p.box(-hl + 0.55, -hd, 0.4, hl - 0.55, -hd + 0.06, TABLE - 0.06, 'wood', shades=(2, 3, 3))
    p.box(-hl - 0.04, -hd - 0.04, TABLE - 0.08, hl + 0.04, hd + 0.04, TABLE, 'wood', shades=(0, 1, 2))
    p.box(-hl + 0.1, -hd + 0.1, TABLE - 0.005, hl - 0.4, hd - 0.15, TABLE + 0.005, 'green', shades=(1, 1, 1),
          oid=p.new())
    if roll:
        o = p.new()
        p.box(-hl, -hd, TABLE, hl, -hd + 0.45, TABLE + 0.95, 'wood', oid=o,
              tex=lambda k, sgn, a, c, h, idx: (None, np.where(
                  (k == 1) & (sgn > 0) & ((np.mod(a + 5, 0.3) < 0.05) | (np.mod(h, 0.3) < 0.05)), clampi(idx + 2),
                  np.where((k == 1) & (sgn > 0), clampi(idx + 1), idx))))
        for s in (-1, 1):
            p.box(s * hl - 0.05, -hd, TABLE, s * hl + 0.05, -hd + 0.6, TABLE + 0.7, 'wood', oid=o)
        p.box(-hl, -hd - 0.02, TABLE + 0.9, hl, -hd + 0.5, TABLE + 1.05, 'wood', shades=(0, 1, 2), oid=o)
    if papers:
        o = p.new()
        p.box(hl - 0.4, -0.25, TABLE, hl - 0.1, 0.1, TABLE + 0.25, 'brick', oid=o)          # ledgers
        p.box(hl - 0.42, -0.2, TABLE + 0.25, hl - 0.12, 0.12, TABLE + 0.35, 'navy', oid=o)
        p.box(-0.3, 0.0, TABLE, 0.2, 0.3, TABLE + 0.02, 'cream', shades=(0, 0, 1), oid=p.new())   # a paper
        p.box(-0.6, -0.25, TABLE, -0.45, -0.1, TABLE + 0.1, 'dark', oid=p.new())              # the inkwell
        p.rod((-0.5, -0.17, TABLE + 0.1), (-0.4, -0.05, TABLE + 0.3), 0.012, 'cream', oid=p.new())
    return dict(foot=[-hl - 0.04, -hd - 0.04, hl + 0.04, hd + 0.04], top=TABLE, use=[[0, hd + 0.45, 'sit', '-c']],
                note='the sitter faces the desk: the opposite way to its front (a chair at use, turned to it)')


def school_desk(p):
    """A pupil's desk with its bench joined on, cast-iron ends; the pupil sits on the bench (+c side) facing -c?
    No: the bench is BEHIND the desk (at -c) and the pupil faces +c, as in a pew. Desk lid sloped, an inkwell."""
    for a in (-0.55, 0.55):
        o = p.new()
        p.box(a - 0.04, -0.75, 0.0, a + 0.04, 0.45, 0.1, 'blk', oid=o)
        p.rod((a, 0.3, 0.0), (a, 0.2, 0.85), 0.03, 'blk', oid=o)
        p.rod((a, -0.6, 0.0), (a, -0.45, 0.48), 0.03, 'blk', oid=o)
    p.oid = p.new()
    # the seat (low, a child's) and its back
    p.box(-0.6, -0.75, 0.46, 0.6, -0.35, 0.52, 'wood', shades=(0, 1, 2))
    p.box(-0.6, -0.8, 0.52, 0.6, -0.74, 0.95, 'wood', tex=planks(0.15, 'h'))
    # the desk: a shelf and the sloped lid
    o = p.new()
    p.box(-0.62, 0.0, 0.62, 0.62, 0.45, 0.68, 'wood', oid=o)
    p.F.box(-0.62, -0.05, 0.86, 0.62, 0.45, 0.92, 'wood', oid=o, cast=False, shades=(0, 1, 2))
    p.box(-0.62, 0.38, 0.68, 0.62, 0.45, 0.88, 'wood', oid=o, tex=planks(0.2, 'h'))
    p.box(0.35, 0.05, 0.92, 0.47, 0.17, 0.97, 'dark', oid=p.new())
    p.box(-0.35, 0.1, 0.92, 0.0, 0.35, 0.95, 'iron', oid=p.new())     # a slate
    return dict(foot=[-0.65, -0.82, 0.65, 0.47], seat=0.52, top=0.92, use=[[0, -0.55, 'sit']],
                note='a child sits at use (the bench), facing the front; seat 0.52u (a child is drawn lifted 1 px)')


def blackboard(p, length=2.4):
    """The schoolroom blackboard on the wall: a wooden frame, a chalk ledge, the day's lesson chalked on it."""
    hl = length / 2

    def chalk(k, sgn, a, c, h, idx):
        on = (k == 1) & (sgn > 0)
        # rows of scribbled writing and a sum
        rowh = np.mod(h - 1.2, 0.28)
        line = on & (rowh < 0.07) & (h > 1.3) & (h < 2.3)
        gaps = E.hash2(np.floor((a + 5) * 9).astype(int), np.floor(h * 4).astype(int)) % 5 == 0
        word = line & ~gaps & (a < hl - 0.2 - 0.6 * (np.floor(h * 4) % 3)) & (a > -hl + 0.2)
        rr = np.where(word, R('cream'), R('dark'))
        ii = np.where(word, 1, np.where(on, 1, idx))
        return rr, ii
    p.box(-hl, 0.0, 1.05, hl, 0.06, 2.45, 'dark', tex=chalk)
    for s in (-1, 1):
        p.box(s * hl - 0.06, 0.0, 1.0, s * hl + 0.06, 0.1, 2.5, 'wood')
    p.box(-hl - 0.06, 0.0, 2.45, hl + 0.06, 0.1, 2.53, 'wood', shades=(0, 1, 2))
    p.box(-hl - 0.06, 0.0, 0.95, hl + 0.06, 0.22, 1.05, 'wood', shades=(0, 1, 2))
    p.box(-0.5, 0.12, 1.05, -0.3, 0.2, 1.1, 'cream', oid=p.new())                     # the eraser and chalk
    return dict(foot=[-hl - 0.06, 0.0, hl + 0.06, 0.22], wall=True, use=[[0.6, 0.6, 'teach']])


def pew(p, length=3.0):
    """A church pew, the sitters facing +c: a panelled back with a book rest behind it, scrolled ends."""
    hl = length / 2
    p.box(-hl + 0.05, -0.25, SEAT - 0.08, hl - 0.05, 0.25, SEAT, 'wood', shades=(0, 1, 2), tex=planks(0.6, 'a'))
    p.box(-hl + 0.05, -0.32, SEAT, hl - 0.05, -0.24, 1.5, 'wood', tex=combine(planks(0.6, 'a'), panel_tex(
        -hl, hl, SEAT + 0.05, 1.42, n=4, fk=1, fs=1, inset=0.1), panel_tex(-hl, hl, SEAT + 0.05, 1.42, n=4, fk=1,
                                                                             fs=-1, inset=0.1)))
    p.box(-hl + 0.05, -0.36, 1.46, hl - 0.05, -0.2, 1.54, 'wood', shades=(0, 1, 2))
    p.box(-hl + 0.05, -0.52, 1.2, hl - 0.05, -0.32, 1.24, 'wood', shades=(1, 2, 3))     # hymnal rest behind
    for s in (-1, 1):
        a = s * hl
        p.box(a - 0.06, -0.36, 0.0, a + 0.06, 0.28, 1.15, 'wood', tex=panel_tex(-0.36, 0.28, 0.1, 1.05, 1, 0, s,
                                                                             0.08))
        p.box(a - 0.06, -0.36, 1.15, a + 0.06, -0.08, 1.62, 'wood')
        p.ball(a, -0.2, 1.62, 0.09, 'wood')
    # hymnals on the rest
    for k in range(3):
        p.box(-hl + 0.5 + k * 1.0, -0.5, 1.24, -hl + 0.75 + k * 1.0, -0.36, 1.3, 'red' if k % 2 else 'navy',
              oid=p.new())
    return dict(foot=[-hl - 0.06, -0.52, hl + 0.06, 0.28], seat=SEAT,
                use=[[round(-hl + (k + 0.5) * length / int(length / 0.8), 2), 0.0, 'sit'] for k in range(int(length / 0.8))])


def pulpit(p):
    """A raised pulpit: a panelled box on a dais, a step behind, the Bible on its sloped top; the preacher stands
    behind it (at -c) facing +c."""
    p.box(-0.9, -0.9, 0.0, 0.9, 0.6, 0.3, 'wood', tex=planks(0.3, 'a'), shades=(0, 1, 2))
    p.box(-0.55, -0.15, 0.3, 0.55, 0.45, 1.65, 'wood', tex=combine(planks(0.3, 'h'), panel_tex(
        -0.55, 0.55, 0.4, 1.5, 2, 1, 1, 0.1), panel_tex(-0.45, 0.15, 0.4, 1.5, 1, 0, 1, 0.1)))
    p.F.box(-0.62, -0.2, 1.62, 0.62, 0.52, 1.72, 'wood', cast=False, oid=p.oid, shades=(0, 1, 2))
    p.box(-0.62, 0.46, 1.4, 0.62, 0.52, 1.62, 'red', oid=p.new(), shades=(1, 1, 2))            # the fall cloth
    p.box(-0.08, 0.47, 1.45, 0.08, 0.53, 1.58, 'brass', oid=p.oid, shades=(0, 0, 1))
    o = p.new()
    p.box(-0.3, 0.0, 1.72, 0.3, 0.35, 1.82, 'dark', oid=o)
    p.box(-0.28, 0.02, 1.82, 0.0, 0.33, 1.84, 'cream', oid=o, shades=(0, 0, 1))
    p.box(0.0, 0.02, 1.82, 0.28, 0.33, 1.84, 'cream', oid=o, shades=(1, 1, 1))
    return dict(foot=[-0.9, -0.9, 0.9, 0.6], use=[[0, -0.55, 'preach']],
                note='the preacher stands at use on the dais (raised 0.3u: lift him 2 px)')


def bar(p, length=3.6):
    """The saloon bar: a long panelled front (+c, the drinkers' side) with a brass foot rail and a spittoon, the top
    with bottles, glasses and a beer tap; the barkeep's side (-c) has the wells and glass shelves."""
    hl = length / 2
    hd = 0.4
    hb = 1.25
    p.box(-hl, -hd, 0.0, hl, hd, hb - 0.08, 'dwood', tex=combine(planks(0.2, 'h'), panel_tex(
        -hl, hl, 0.25, hb - 0.2, n=4, fk=1, fs=1, inset=0.1)))
    p.box(-hl, hd - 0.02, 0.0, hl, hd + 0.04, 0.22, 'dark', shades=(1, 2, 2))
    p.box(-hl - 0.1, -hd - 0.04, hb - 0.08, hl + 0.1, hd + 0.12, hb, 'wood', shades=(0, 1, 2),
          tex=planks(0.6, 'a'))
    # the keeper's side: a shelf of glasses under the top
    o = p.new()
    p.box(-hl + 0.1, -hd - 0.02, 0.6, hl - 0.1, -hd + 0.2, 0.64, 'wood', oid=o)
    for k in range(10):
        p.cylv(-hl + 0.3 + k * 0.32, -hd + 0.08, 0.64, 0.78, 0.06, 'glass', oid=o)
    # the foot rail on its brackets
    o = p.new()
    p.cyl(0, hd + 0.3, 0.25, 'a', 0.04, hl - 0.1, 'brass', oid=o)
    for a in (-hl + 0.3, 0, hl - 0.3):
        p.box(a - 0.03, hd, 0.2, a + 0.03, hd + 0.3, 0.26, 'brass', oid=o)
    p.cylv(hl * 0.55, hd + 0.45, 0.0, 0.2, 0.14, 'brass', oid=p.new())                       # spittoon
    # on top: bottles, glasses, the beer pump
    o = p.new()
    for k, (a, col) in enumerate(((-hl + 0.3, 'green'), (-hl + 0.45, 'brick'), (-hl + 0.6, 'ochre'))):
        p.box(a - 0.05, -0.1, hb, a + 0.05, 0.0, hb + 0.34, col, shades=(0, 1, 2), oid=o)
        p.box(a - 0.025, -0.075, hb + 0.34, a + 0.025, -0.025, hb + 0.48, col, oid=o)
    for a in (-0.4, 0.3, 0.9):
        p.cylv(a, 0.15, hb, hb + 0.14, 0.05, 'glass', oid=p.new())
        p.cylv(a, 0.15, hb + 0.02, hb + 0.1, 0.045, 'ochre', oid=p.new())
    o = p.new()
    p.box(hl - 0.55, -0.25, hb, hl - 0.4, -0.1, hb + 0.55, 'brass', oid=o)
    p.box(hl - 0.52, -0.22, hb + 0.55, hl - 0.43, -0.12, hb + 0.75, 'dwood', oid=o)
    p.box(hl - 0.55, -0.12, hb + 0.4, hl - 0.4, 0.02, hb + 0.45, 'brass', oid=o)
    return dict(foot=[-hl - 0.1, -hd - 0.04, hl + 0.1, hd + 0.5], top=hb,
                use=[[0, -hd - 0.45, 'keeper']] + [[a, hd + 0.55, 'drink'] for a in (-1.2, 0.0, 1.2)])


def backbar(p, length=3.6):
    """The back bar against the wall: a cabinet, a long mirror, shelves of bottles, a cash register."""
    hl = length / 2
    p.box(-hl, 0.0, 0.0, hl, 0.55, 1.0, 'dwood', tex=combine(planks(0.2, 'h'), panel_tex(-hl, hl, 0.1, 0.9, 4,
                                                                                            1, 1, 0.1)))
    p.box(-hl - 0.05, 0.0, 1.0, hl + 0.05, 0.6, 1.06, 'wood', shades=(0, 1, 2))

    def mirror(k, sgn, a, c, h, idx):
        on = (k == 1) & (sgn > 0)
        streak = np.mod(a - h * 0.8 + 10, 0.9) < 0.12
        frame = (np.abs(a) > hl - 0.45) | (h > 2.85) | (h < 1.2)
        rr = np.where(on & ~frame, R('glass'), R('dwood'))
        ii = np.where(on & ~frame, np.where(streak, 0, 1), idx)
        return rr, ii
    p.box(-hl, 0.0, 1.06, hl, 0.08, 3.0, 'dwood', tex=mirror)
    for s in (-1, 1):
        p.box(s * (hl - 0.2) - 0.12, 0.0, 1.06, s * (hl - 0.2) + 0.12, 0.2, 3.1, 'dwood')
    p.box(-hl - 0.1, 0.0, 3.0, hl + 0.1, 0.3, 3.2, 'dwood', shades=(0, 1, 2))
    o = p.new()
    for h in (1.75, 2.35):
        p.box(-hl + 0.4, 0.08, h - 0.04, hl - 0.4, 0.3, h, 'wood', oid=o)
    p.oid = p.new()
    goods_row(p, -hl + 0.45, hl - 0.45, 0.3, 1.75, 0.2, 0.9, 7701, kinds=('bottle',))
    goods_row(p, -hl + 0.45, hl - 0.45, 0.3, 2.35, 0.2, 0.75, 7702, kinds=('bottle',))
    goods_row(p, -hl + 0.2, -0.4, 0.5, 1.06, 0.25, 0.9, 7703, kinds=('bottle',))
    # the cash register
    o = p.new()
    p.box(0.2, 0.1, 1.06, 0.8, 0.5, 1.4, 'brass', oid=o)
    p.F.box(0.25, 0.25, 1.4, 0.75, 0.5, 1.52, 'brass', oid=o, cast=False, shades=(0, 1, 2))
    p.box(0.3, 0.12, 1.4, 0.7, 0.2, 1.65, 'brass', oid=o, shades=(1, 1, 2))
    return dict(foot=[-hl - 0.1, 0.0, hl + 0.1, 0.6], wall=True, top=1.06, use=[[0, 0.95, 'keeper']])


def barstool(p):
    """A round bar stool, seat 1.0u (raise a seated frame by extra.sit_dy: 3 px)."""
    x, z, _ = p.pt(0, 0, 0)
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.5
        p.rod((math.cos(a) * 0.24, math.sin(a) * 0.24, 0.0), (math.cos(a) * 0.1, math.sin(a) * 0.1, 0.92), 0.045,
              'wood')
    p.cylv(0, 0, 0.3, 0.33, 0.17, 'wood')
    p.cylv(0, 0, 0.92, 1.0, 0.22, 'red', oid=p.new())
    return dict(foot=[-0.25, -0.25, 0.25, 0.25], seat=1.0, sit_dy=3, use=[[0, 0, 'sit']])


def piano(p):
    """An upright piano, its keyboard at +c, candle sconces, sheet music; the stool in front."""
    p.box(-0.85, 0.0, 0.0, 0.85, 0.7, 1.55, 'dwood', tex=combine(planks(0.4, 'h'), panel_tex(
        -0.75, 0.75, 1.0, 1.45, 2, 1, 1, 0.1), panel_tex(-0.75, 0.75, 0.1, 0.6, 2, 1, 1, 0.1)))
    p.box(-0.9, 0.0, 1.55, 0.9, 0.75, 1.62, 'dwood', shades=(0, 1, 2))
    # keyboard shelf, keys
    o = p.new()
    p.box(-0.8, 0.7, 0.72, 0.8, 0.98, 0.82, 'dwood', oid=o)

    def keys(k, sgn, a, c, h, idx):
        black = (np.mod(a * 12 + 30, 2.0) < 0.7) & (c < 0.86)
        return np.where(black, R('dark'), R('cream')), np.where(black, 1, 0)
    p.box(-0.75, 0.72, 0.82, 0.75, 0.96, 0.85, 'cream', tex=keys, oid=o)
    p.box(-0.8, 0.7, 0.85, 0.8, 0.76, 0.98, 'dwood', oid=o)
    p.box(-0.35, 0.68, 1.0, 0.35, 0.72, 1.3, 'cream', oid=p.new(), shades=(0, 0, 1))      # music on the desk
    for s in (-1, 1):
        o = p.new()
        p.box(s * 0.7 - 0.04, 0.7, 1.15, s * 0.7 + 0.04, 0.8, 1.2, 'brass', oid=o)
        p.cylv(s * 0.7, 0.78, 1.2, 1.38, 0.03, 'cream', oid=o)
    # stool
    o = p.new()
    p.cylv(0, 1.35, 0.0, 0.5, 0.06, 'dwood', oid=o)
    p.cylv(0, 1.35, 0.5, 0.6, 0.2, 'red', oid=o)
    return dict(foot=[-0.9, 0.0, 0.9, 1.6], wall=True, seat=0.6, use=[[0, 1.35, 'play']])


def card_table(p):
    """A round card table under green baize: a hand of cards dealt, chips, a glass; four chairs go round it."""
    x, z, _ = p.pt(0, 0, 0)
    CYV(x, z, 0.0, 0.1, 0.35, 'dwood', oid=p.oid, cast=False)
    CYV(x, z, 0.1, TABLE - 0.08, 0.08, 'dwood', oid=p.oid, cast=False)

    def baize(part, s, ang, rho, idx):
        edge = (part != 0) & (rho > 0.68)
        return np.where(edge | (part == 0), R('dwood'), R('green')), np.where(part == 0, idx, 1)
    ocyl((x, z, TABLE - 0.04), (0, 0, 1), 0.8, 0.04, 'green', tex=baize, oid=p.oid)
    for k in range(4):
        a = k * math.pi / 2 + 0.3
        for j in range(3):
            o = p.new()
            p.box(math.cos(a) * 0.45 + j * 0.06 - 0.08, math.sin(a) * 0.45 - 0.1, TABLE, math.cos(a) * 0.45
                  + j * 0.06 + 0.04, math.sin(a) * 0.45 + 0.08, TABLE + 0.015, 'cream', oid=o, shades=(0, 0, 1))
    for k, col in enumerate(('red', 'cream', 'navy', 'red', 'cream')):
        p.cylv(-0.15 + 0.08 * (k % 3), 0.1 * (k // 3) - 0.05, TABLE + 0.02 * (k % 2), TABLE + 0.08 + 0.02 * (k % 2),
               0.06, col, oid=p.new())
    p.cylv(0.25, -0.2, TABLE, TABLE + 0.15, 0.05, 'glass', oid=p.new())
    return dict(foot=[-0.8, -0.8, 0.8, 0.8], top=TABLE, use=[[0.0, 1.0, 'sit'], [1.0, 0.0, 'sit'],
                                                             [0.0, -1.0, 'sit'], [-1.0, 0.0, 'sit']])


def bank_counter(p, length=3.0):
    """The bank's counter: a marble top on a panelled front (+c, the customers' side), a brass grille above with
    an arched teller's window, a pen on a chain."""
    hl, hd = length / 2, 0.4
    hb = 1.2
    p.box(-hl, -hd, 0.0, hl, hd, hb - 0.08, 'dwood', tex=combine(planks(0.2, 'h'), panel_tex(
        -hl, hl, 0.15, hb - 0.2, n=3, fk=1, fs=1, inset=0.1)))

    def marble(k, sgn, a, c, h, idx):
        v = E.hash2(np.floor((a + c * 0.5) * 5).astype(int) + 5, np.floor(c * 9).astype(int)) % 7 == 0
        return None, np.where(v, clampi(idx + 1), idx)
    p.box(-hl - 0.06, -hd - 0.06, hb - 0.08, hl + 0.06, hd + 0.06, hb, 'rock', tex=marble, shades=(0, 1, 2))
    # the grille: brass bars from the top up to 2.3, a frame, the window
    o = p.new()
    p.box(-hl, -0.05, hb, hl, 0.05, hb + 0.12, 'dwood', oid=o)
    p.box(-hl, -0.05, 2.25, hl, 0.05, 2.38, 'dwood', oid=o)
    for s in (-1, 1):
        p.box(s * hl - 0.06, -0.06, hb, s * hl + 0.06, 0.06, 2.38, 'dwood', oid=o)
    o = p.new()
    for k in range(int(length / 0.16)):
        a = -hl + 0.12 + k * 0.16
        if abs(a) < 0.35:
            # the window: an arched gap, bars above it only
            top = 1.85 + 0.35 * math.sqrt(max(0, 1 - (a / 0.35) ** 2))
            p.box(a - 0.02, -0.02, top, a + 0.02, 0.02, 2.25, 'brass', oid=o, shades=(0, 1, 2))
            continue
        p.box(a - 0.02, -0.02, hb + 0.12, a + 0.02, 0.02, 2.25, 'brass', oid=o, shades=(0, 1, 2))
    p.box(-hl, -0.03, 1.75, hl, 0.03, 1.8, 'brass', oid=o)
    p.box(-0.1, 0.1, hb, 0.25, 0.3, hb + 0.02, 'cream', oid=p.new(), shades=(0, 0, 1))
    return dict(foot=[-hl - 0.06, -hd - 0.06, hl + 0.06, hd + 0.06], top=hb,
                use=[[0, -hd - 0.45, 'keeper'], [0, hd + 0.5, 'customer']])


def safe(p):
    """A black iron safe on casters: a gilt line, the maker's name, the dial and the brass handle."""

    def face(k, sgn, a, c, h, idx):
        on = (k == 1) & (sgn > 0)
        gilt = on & ((np.abs(np.abs(a) - 0.38) < 0.025) & (h > 0.2) & (h < 1.25) |
                     (np.abs(h - 0.2) < 0.025) & (np.abs(a) < 0.38) |
                     (np.abs(h - 1.25) < 0.025) & (np.abs(a) < 0.38))
        name = on & (np.abs(h - 1.12) < 0.04) & (np.abs(a) < 0.25) & (np.mod(a * 20 + 30, 2) < 1.3)
        rr = np.where(gilt | name, R('brass'), R('blk'))
        return rr, np.where(gilt | name, 1, idx)
    p.box(-0.48, -0.4, 0.08, 0.48, 0.4, 1.4, 'blk', tex=face)
    o = p.new()
    p.cyl(0.0, 0.42, 0.75, 'c', 0.12, 0.03, 'iron', oid=o)
    p.box(0.18, 0.4, 0.5, 0.24, 0.48, 0.62, 'brass', oid=o)
    for sa in (-1, 1):
        for sc in (-1, 1):
            p.box(sa * 0.4 - 0.05, sc * 0.32 - 0.05, 0.0, sa * 0.4 + 0.05, sc * 0.32 + 0.05, 0.08, 'brass',
                  oid=p.new())
    return dict(foot=[-0.48, -0.4, 0.48, 0.4], use=[[0, 0.85, 'open']])


def press(p):
    """A Washington hand press: the iron frame, the platen and the screw, the bed running out along +a on its rails
    with the tympan raised, the bar handle; an ink table with a roller."""
    o = p.oid
    # the bed's rails and legs
    p.box(-1.3, -0.35, 0.75, 1.3, 0.35, 0.85, 'blk', oid=o)
    for a in (-1.2, 1.2):
        for c in (-0.3, 0.3):
            p.box(a - 0.05, c - 0.05, 0.0, a + 0.05, c + 0.05, 0.75, 'blk', oid=o)
    # the frame (two cheeks and the crown)
    for c in (-0.4, 0.4):
        p.box(-0.35, c - 0.07, 0.0, -0.15, c + 0.07, 2.0, 'blk', oid=o)
        p.box(-0.35, c - 0.07, 0.0, 0.3, c + 0.07, 0.2, 'blk', oid=o)
    p.box(-0.42, -0.5, 1.85, -0.08, 0.5, 2.1, 'blk', oid=o, shades=(0, 1, 2))
    p.ball(-0.25, 0.0, 2.15, 0.15, 'brass', oid=o)
    # platen and screw
    p.box(-0.3, -0.38, 1.2, 0.3, 0.38, 1.3, 'iron', oid=o)
    p.box(-0.06, -0.06, 1.3, 0.06, 0.06, 1.85, 'iron', oid=o)
    p.rod((0.0, 0.05, 1.6), (0.25, 0.75, 1.55), 0.035, 'iron', oid=o)
    p.cyl(0.25, 0.85, 1.55, 'c', 0.06, 0.12, 'wood', oid=o)
    # the bed with the form, the tympan and frisket raised at +a
    o2 = p.new()
    p.box(0.3, -0.33, 0.85, 1.1, 0.33, 0.95, 'wood', oid=o2)
    p.box(0.4, -0.25, 0.95, 1.0, 0.25, 0.98, 'dark', oid=o2)
    p.F.box(1.1, -0.33, 0.95, 1.16, 0.33, 1.7, 'cream', oid=p.new(), cast=False, shades=(0, 1, 2))
    # the ink table and roller beside it
    o3 = p.new()
    p.box(-1.3, 0.6, 0.0, -0.8, 1.1, 0.95, 'wood', oid=o3, tex=planks(0.25, 'h'))
    p.box(-1.32, 0.58, 0.95, -0.78, 1.12, 1.0, 'dark', oid=o3)
    p.cyl(-1.05, 0.85, 1.07, 'c', 0.06, 0.2, 'blk', oid=o3)
    p.rod((-1.05, 0.85, 1.07), (-1.05, 0.85, 1.3), 0.025, 'wood', oid=o3)
    return dict(foot=[-1.35, -0.55, 1.2, 1.15], use=[[0.6, 0.75, 'work']],
                note='the pressman stands at use and pulls the bar (work frames)')


def type_case(p):
    """The compositor's frame: a cabinet of type cases (drawers) with the open upper and lower case sloped on top,
    a composing stick and a galley of set type."""
    p.box(-0.75, 0.0, 0.0, 0.75, 0.75, 1.05, 'wood', tex=combine(planks(0.3, 'h'),
                                                                drawers(-0.7, 0.7, 0.05, 1.0, rows=9, cols=1,
                                                                        knob='brass')))
    o = p.new()

    def cells(k, sgn, a, c, h, idx):
        top = (k == 2) & (sgn > 0)
        grid = (np.mod(a * 6 + 30, 1.0) < 0.25) | (np.mod(c * 7 + 30, 1.0) < 0.25)
        rr = np.where(top & ~grid, R('iron'), R('wood'))
        ii = np.where(top & ~grid, 2, np.where(top, 1, idx))
        return rr, ii
    Frame(yaw=YAW[p.d], pitch=0).box(-0.75, 0.0, 1.05, 0.75, 0.75, 1.13, 'wood', tex=None, oid=o, cast=False)
    pf = P(p.d)
    pf.F = Frame(yaw=YAW[p.d], pitch=0)
    pf.oid = o
    # sloped cases: tipped towards the compositor (+c), modelled as two steps
    pf.box(-0.75, 0.0, 1.13, 0.75, 0.4, 1.33, 'wood', tex=cells)
    pf.box(-0.75, 0.4, 1.13, 0.75, 0.75, 1.21, 'wood', tex=cells)
    pf.box(0.25, 0.45, 1.21, 0.65, 0.6, 1.27, 'iron', oid=p.new())          # composing stick
    pf.box(-0.7, 0.05, 1.33, -0.2, 0.3, 1.38, 'iron', oid=p.new())          # galley
    return dict(foot=[-0.75, 0.0, 0.75, 0.75], wall=True, top=1.33, use=[[0, 1.2, 'work']])


def cell_bars(p, length=3.0, height=2.8, door_open=False):
    """A wall of iron bars along a (both faces alike): flat straps across at the top, middle and bottom, a barred
    door in the middle with its lock box. Anchor: its middle at floor level."""
    hl = length / 2
    for k in range(int(length / 0.2) + 1):
        a = -hl + k * 0.2
        p.box(a - 0.025, -0.025, 0.0, a + 0.025, 0.025, height, 'iron', shades=(1, 2, 3))
    for h in (0.1, 1.2, height - 0.1):
        p.box(-hl - 0.03, -0.04, h - 0.06, hl + 0.03, 0.04, h + 0.06, 'blk', shades=(0, 1, 2))
    o = p.new()
    p.box(-0.5, -0.06, 0.0, -0.44, 0.06, height, 'blk', oid=o)
    p.box(0.44, -0.06, 0.0, 0.5, 0.06, height, 'blk', oid=o)
    p.box(0.22, -0.08, 1.0, 0.42, 0.08, 1.35, 'blk', oid=o)
    p.box(0.3, 0.08, 1.12, 0.34, 0.1, 1.2, 'brass', oid=o)
    return dict(foot=[-hl, -0.06, hl, 0.06], door=[-0.45, 0.45], note='the door between a -0.45 and 0.45')


def forge(p, f=0):
    """The smith's forge: a brick hearth with a fire of coals (f 0 and 1 glow), a sheet-iron hood and the chimney up
    to 4u, a water slack tub and tongs hung on the hearth's side. Back at c = 0."""

    def brick(k, sgn, a, c, h, idx):
        row = np.floor(h / 0.18).astype(int)
        u = np.where(k != 0, a, c) + (row % 2) * 0.18
        mortar = (np.mod(h, 0.18) < 0.04) | (np.mod(u + 10, 0.36) < 0.04)
        return np.where(mortar, R('rock'), R('brick')), np.where(mortar, clampi(idx + 1), idx)
    p.box(-0.9, 0.0, 0.0, 0.9, 1.4, 0.95, 'brick', tex=brick)
    # the fire bed, coals glowing
    o = p.new()
    glow = {-1: ('dark', 'iron'), 0: ('fire', 'brass'), 1: ('brass', 'fire')}[f]

    def coals(k, sgn, a, c, h, idx):
        n = E.hash2(np.floor((a + 3) * 9).astype(int) + f * 3, np.floor((c + 3) * 9).astype(int)) % 5
        rr = np.where(n == 0, R(glow[0]), np.where(n == 1, R(glow[1]), R('dark')))
        ii = np.where(n < 2, np.where(n == 0, 1, 0), np.where(n == 2, 1, 2))
        return rr, ii
    p.box(-0.45, 0.4, 0.95, 0.45, 1.1, 1.02, 'dark', tex=coals, oid=o)
    p.ball(0.0, 0.75, 1.02, 0.18, glow[0], sz=0.6, oid=o, th=(0.5, 0.0, -0.6))
    # the chimney breast at the back, the hood and the chimney
    p.box(-0.75, 0.0, 0.95, 0.75, 0.35, 2.0, 'brick', tex=brick, oid=p.new())
    o = p.new()
    p.box(-0.8, 0.0, 2.0, 0.8, 1.2, 2.15, 'iron', oid=o, shades=(1, 2, 3))
    p.box(-0.6, 0.0, 2.15, 0.6, 0.9, 2.5, 'iron', oid=o, shades=(1, 2, 3))
    p.box(-0.3, 0.0, 2.5, 0.3, 0.6, 4.0, 'brick', tex=brick, oid=p.new())
    # the slack tub and tongs on the side
    o = p.new()
    p.cylv(1.25, 1.0, 0.0, 0.55, 0.3, 'wood', oid=o)
    p.cylv(1.25, 1.0, 0.5, 0.56, 0.25, 'river', oid=o, topidx=2)
    p.rod((0.92, 1.2, 0.85), (0.92, 1.35, 0.2), 0.02, 'iron', oid=p.new())
    p.rod((0.94, 1.1, 0.85), (0.94, 1.0, 0.25), 0.02, 'iron', oid=p.oid)
    return dict(foot=[-0.9, 0.0, 1.6, 1.4], wall=True, hot=True, use=[[0.0, 1.85, 'work']])


def anvil(p):
    """The anvil on its elm stump, the horn along +a; a hammer resting on it."""
    p.cylv(0, 0, 0.0, 0.5, 0.4, 'wood', topidx=1)
    p.box(-0.45, -0.3, 0.0, 0.45, 0.3, 0.1, 'bark', oid=p.oid)
    o = p.new()
    p.box(-0.4, -0.26, 0.5, 0.36, 0.26, 0.62, 'slate', oid=o, shades=(1, 2, 3))
    p.box(-0.2, -0.14, 0.62, 0.18, 0.14, 0.82, 'slate', oid=o, shades=(1, 2, 3))
    p.box(-0.5, -0.17, 0.82, 0.4, 0.17, 1.06, 'slate', oid=o, shades=(0, 2, 3))
    p.box(0.4, -0.13, 0.88, 0.62, 0.13, 1.06, 'slate', oid=o, shades=(0, 2, 3))
    p.box(0.62, -0.07, 0.94, 0.8, 0.07, 1.05, 'slate', oid=o, shades=(0, 2, 3))
    p.box(-0.58, -0.12, 0.92, -0.5, 0.12, 1.06, 'slate', oid=o, shades=(0, 2, 3))
    o = p.new()
    p.box(-0.35, 0.22, 1.06, -0.15, 0.34, 1.16, 'iron', oid=o)
    p.rod((-0.25, 0.28, 1.1), (0.3, 0.45, 1.06), 0.03, 'wood', oid=o)
    return dict(foot=[-0.35, -0.35, 0.7, 0.35], use=[[0.0, 0.7, 'work']],
                note='the smith stands at use (the side facing +c) and hammers (work frames)')


def bellows(p):
    """The great bellows on its frame beside the forge, the lever (rocker) above with a chain to the board; the
    nozzle runs off along -a into the forge's side."""
    for a in (-0.6, 0.6):
        p.box(a - 0.05, -0.05, 0.0, a + 0.05, 0.05, 0.7, 'wood')
    o = p.new()
    p.box(-0.9, -0.45, 0.68, 0.7, 0.45, 0.74, 'wood', oid=o)

    def pleat(k, sgn, a, c, h, idx):
        return None, np.where(np.mod(h * 14, 1.0) < 0.35, clampi(idx + 1), idx)
    p.box(-0.85, -0.42, 0.74, 0.6, 0.42, 1.05, 'umber', tex=pleat, oid=o)
    p.box(-0.9, -0.45, 1.05, 0.7, 0.45, 1.11, 'wood', oid=o)
    p.box(-1.2, -0.06, 0.8, -0.85, 0.06, 0.92, 'iron', oid=o)
    o = p.new()
    p.box(-0.05, -0.05, 0.7, 0.05, 0.05, 2.0, 'wood', oid=o)
    p.rod((-0.4, 0.0, 2.05), (1.6, 0.0, 1.85), 0.04, 'wood', oid=o)
    p.rod((0.5, 0.0, 1.96), (0.5, 0.0, 1.11), 0.012, 'iron', oid=o)
    p.box(1.55, -0.06, 1.65, 1.65, 0.06, 1.85, 'iron', oid=o)
    return dict(foot=[-1.2, -0.45, 1.65, 0.45], use=[[1.6, 0.5, 'work']])


def hotel_desk(p, length=2.4):
    """The hotel's front desk: a panelled counter (+c the guests' side), the open register with a pen, a bell, a
    vase; extra.top for anything else set on it."""
    hl, hd = length / 2, 0.45
    hb = 1.15
    p.box(-hl, -hd, 0.0, hl, hd, hb - 0.08, 'wood', tex=combine(planks(0.2, 'h'), panel_tex(
        -hl, hl, 0.15, hb - 0.2, n=3, fk=1, fs=1, inset=0.1)))
    p.box(-hl - 0.08, -hd - 0.05, hb - 0.08, hl + 0.08, hd + 0.08, hb, 'dwood', shades=(0, 1, 2))
    o = p.new()
    p.box(-0.45, -0.05, hb, -0.02, 0.3, hb + 0.04, 'cream', oid=o, shades=(0, 0, 1))
    p.box(0.02, -0.05, hb, 0.45, 0.3, hb + 0.04, 'cream', oid=o, shades=(1, 1, 1))
    p.box(-0.47, -0.07, hb, 0.47, 0.32, hb + 0.02, 'brick', oid=o)
    p.rod((0.2, 0.0, hb + 0.04), (0.35, 0.15, hb + 0.06), 0.012, 'dark', oid=p.new())
    o = p.new()
    p.cylv(hl - 0.35, 0.1, hb, hb + 0.03, 0.09, 'brass', oid=o)
    p.ball(hl - 0.35, 0.1, hb + 0.05, 0.07, 'brass', sz=0.7, oid=o)
    o = p.new()
    p.cylv(-hl + 0.4, -0.1, hb, hb + 0.3, 0.07, 'navy', oid=o)
    for k in range(3):
        p.ball(-hl + 0.35 + k * 0.05, -0.12 + 0.04 * k, hb + 0.38, 0.06, ('red', 'bloom', 'cream')[k], oid=o)
    return dict(foot=[-hl - 0.08, -hd - 0.05, hl + 0.08, hd + 0.08], top=hb,
                use=[[0, -hd - 0.45, 'keeper'], [0, hd + 0.5, 'customer']])


def key_rack(p):
    """The board of room keys and pigeonholes behind the hotel desk (on the wall)."""
    p.box(-0.8, 0.0, 1.4, 0.8, 0.08, 2.4, 'dwood', tex=planks(0.3, 'a'))
    o = p.new()
    for r in range(2):
        for k in range(6):
            a = -0.65 + k * 0.26
            h = 2.2 - r * 0.42
            p.box(a - 0.02, 0.08, h - 0.02, a + 0.02, 0.14, h + 0.02, 'brass', oid=o)
            if (k + r) % 4 != 1:
                p.box(a - 0.03, 0.12, h - 0.2, a + 0.03, 0.14, h - 0.02, 'brass', oid=o, shades=(0, 1, 1))
                p.box(a - 0.05, 0.11, h - 0.3, a + 0.05, 0.15, h - 0.2, 'red' if r else 'navy', oid=o)
    o = p.new()
    p.box(-0.8, 0.0, 1.32, 0.8, 0.25, 1.4, 'dwood', oid=o)
    for k in range(6):
        p.box(-0.78 + k * 0.27, 0.0, 1.0, -0.76 + k * 0.27 + 0.02, 0.25, 1.32, 'dwood', oid=o)
    for k in range(5):
        if k % 2 == 0:
            p.box(-0.7 + k * 0.27, 0.1, 1.05, -0.56 + k * 0.27, 0.24, 1.12, 'cream', oid=p.new())
    p.box(-0.8, 0.0, 0.98, 0.8, 0.25, 1.02, 'dwood', oid=o)
    return dict(foot=[-0.8, 0.0, 0.8, 0.25], wall=True, note='hangs on the wall, 1.0 to 2.4u up')


def washstand(p):
    """A washstand: a marble-topped stand, a china basin and a jug, a towel on the rail, a mirror above."""
    p.box(-0.5, 0.0, 0.0, 0.5, 0.5, 0.85, 'wood', tex=combine(planks(0.3, 'h'),
                                                             drawers(-0.45, 0.45, 0.45, 0.8, rows=1, cols=1),
                                                             panel_tex(-0.45, 0.45, 0.05, 0.42, 2, 1, 1, 0.07)))
    p.box(-0.53, 0.0, 0.85, 0.53, 0.53, 0.92, 'rock', shades=(0, 1, 2))
    p.box(-0.5, 0.0, 0.92, 0.5, 0.06, 1.15, 'wood')
    o = p.new()
    p.cylv(0.0, 0.25, 0.92, 1.05, 0.2, 'cream', oid=o, topidx=2)
    p.cylv(0.0, 0.25, 0.98, 1.05, 0.16, 'river', oid=o, topidx=1)
    o = p.new()
    p.cylv(0.3, 0.2, 0.92, 1.28, 0.08, 'cream', oid=o)
    p.box(0.36, 0.17, 1.12, 0.42, 0.23, 1.22, 'cream', oid=o)
    for s in (-1, 1):
        p.box(s * 0.53 - 0.03, 0.4, 0.55, s * 0.53 + 0.03, 0.5, 0.75, 'wood', oid=p.new())
    p.box(-0.53, 0.44, 0.7, 0.53, 0.49, 0.74, 'wood', oid=p.oid)
    p.box(-0.3, 0.48, 0.38, 0.1, 0.52, 0.74, 'cream', oid=p.new(), shades=(0, 1, 1))
    # the mirror on the wall
    o = p.new()
    p.box(-0.3, 0.0, 1.45, 0.3, 0.04, 2.15, 'wood', oid=o, tex=lambda k, sgn, a, c, h, idx: (
        np.where((k == 1) & (sgn > 0) & (np.abs(a) < 0.24) & (h > 1.51) & (h < 2.09), R('glass'), R('wood')),
        np.where((k == 1) & (sgn > 0) & (np.abs(a) < 0.24) & (h > 1.51) & (h < 2.09),
                 np.where(np.mod(a - h + 5, 0.5) < 0.1, 0, 1), idx)))
    return dict(foot=[-0.53, 0.0, 0.53, 0.55], wall=True, top=0.92, use=[[0, 0.9, 'wash']])


def kitchen_range(p, f=0):
    """A cast-iron cook stove: four lids on the top, the oven doors with nickel trim, a warming shelf above, the pipe
    up to the ceiling, a kettle and a pot on it; f 0 and 1: the fire's glow at the grate."""
    glow = {-1: 'dark', 0: 'fire', 1: 'brass'}[f]

    def front(k, sgn, a, c, h, idx):
        on = (k == 1) & (sgn > 0)
        door = on & (np.abs(a - 0.35) < 0.32) & (h > 0.2) & (h < 0.7)
        trim = on & ((np.abs(np.abs(a - 0.35) - 0.32) < 0.03) & (h > 0.2) & (h < 0.7) |
                     (np.abs(h - 0.83) < 0.03))
        grate = on & (np.abs(a + 0.45) < 0.2) & (h > 0.35) & (h < 0.55)
        bars = grate & (np.mod(a * 20, 1) < 0.4)
        rr = np.where(trim, R('iron'), np.where(grate & ~bars, R(glow), R('blk')))
        ii = np.where(trim, 0, np.where(grate & ~bars, 0, np.where(door, clampi(idx - 1), idx)))
        return rr, ii
    p.box(-0.85, 0.0, 0.15, 0.85, 0.75, 0.88, 'blk', tex=front)
    for sa in (-1, 1):
        for sc in (0.1, 0.65):
            p.box(sa * 0.75 - 0.05, sc - 0.05, 0.0, sa * 0.75 + 0.05, sc + 0.05, 0.15, 'blk')
    p.box(-0.9, -0.0, 0.88, 0.9, 0.8, 0.95, 'blk', shades=(1, 2, 3), tex=lambda k, sgn, a, c, h, idx: (
        None, np.where((k == 2) & ((np.abs(np.hypot(np.mod(a + 5, 0.45) - 0.225, c - 0.4)) > 0.14) &
                                   (np.abs(np.hypot(np.mod(a + 5, 0.45) - 0.225, c - 0.4)) < 0.18)), 3, idx)))
    # warming shelf and the pipe
    o = p.new()
    p.box(-0.85, 0.0, 1.55, 0.85, 0.35, 1.62, 'blk', oid=o)
    for s in (-1, 1):
        p.box(s * 0.8 - 0.03, 0.0, 0.95, s * 0.8 + 0.03, 0.06, 1.55, 'blk', oid=o)
    p.cylv(0.5, 0.2, 0.95, 3.8, 0.1, 'blk', oid=o, topidx=3)
    # the kettle and the pot
    o = p.new()
    p.ball(-0.4, 0.45, 1.07, 0.18, 'iron', sz=0.8, oid=o)
    p.rod((-0.25, 0.45, 1.05), (-0.12, 0.45, 1.15), 0.02, 'iron', oid=o)
    o = p.new()
    p.cylv(0.1, 0.45, 0.95, 1.2, 0.18, 'dark', oid=o)
    p.rod((0.1, 0.45, 1.2), (0.45, 0.45, 1.3), 0.015, 'iron', oid=o)
    return dict(foot=[-0.9, 0.0, 0.9, 0.8], wall=True, hot=True, top=0.95, use=[[0, 1.2, 'cook']])


def barrel(p, lid=True):
    """A cracker barrel with its lid half off, a scoop; hoops."""
    def tex(part, s, ang, rho, idx):
        hoop = (part == 0) & ((np.abs(s + 0.33) < 0.04) | (np.abs(s - 0.33) < 0.04))
        stave = (part == 0) & (np.mod(ang * 3, 1.0) < 0.15)
        return np.where(hoop, R('iron'), R('wood')), np.where(hoop, 2, np.where(stave, clampi(idx + 1), idx))
    x, z, _ = p.pt(0, 0, 0)
    ocyl((x, z, 0.55), (0, 0, 1), 0.4, 0.55, 'wood', tex=tex, oid=p.oid)
    CYV(x, z, 1.08, 1.1, 0.34, 'cream', topidx=1, oid=p.new(), cast=False)
    o = p.new()
    p.box(-0.15, -0.42, 1.1, 0.42, 0.2, 1.15, 'wood', oid=o, tex=planks(0.15, 'a'))
    p.rod((-0.1, 0.1, 1.1), (-0.2, 0.3, 1.35), 0.02, 'iron', oid=p.new())
    return dict(foot=[-0.42, -0.42, 0.42, 0.42], top=1.15)


def rug(p, length=2.6, width=1.7, ramp='red'):
    """A rag rug: bands of colour along it, a fringe at the ends (lies flat, 0.02u)."""
    hl, hw = length / 2, width / 2

    def bands(k, sgn, a, c, h, idx):
        b = np.floor((a + hl) / 0.22).astype(int)
        border = (np.abs(c) > hw - 0.15) | (np.abs(a) > hl - 0.18)
        q = b % 5
        rr = np.where(border, R('umber'), np.where(q == 0, R('cream'), np.where(q == 2, R('ochre'), R(ramp))))
        ii = np.where(border, 2, np.where(q == 4, 2, 1))
        return rr, ii
    p.box(-hl, -hw, 0.0, hl, hw, 0.03, ramp, tex=bands, shades=(1, 1, 1))
    for s in (-1, 1):
        for k in range(int(width / 0.12)):
            c = -hw + 0.08 + k * 0.12
            p.box(s * hl - 0.0, c - 0.02, 0.0, s * hl + s * 0.1, c + 0.02, 0.02, 'cream', shades=(1, 1, 1))
    return dict(foot=[-hl - 0.1, -hw, hl + 0.1, hw], flat=True)


def lamp(p, lit=False):
    """A table oil lamp: a brass font, a glass chimney, a shade; lit: the flame and a warm glow on the chimney.
    Stands on a surface: draw it at the surface's height (extra.top of what it stands on)."""
    o = p.oid
    p.cylv(0, 0, 0.0, 0.06, 0.15, 'brass', oid=o)
    p.cylv(0, 0, 0.06, 0.22, 0.05, 'brass', oid=o)
    p.ball(0, 0, 0.32, 0.15, 'brass', sz=0.8, oid=o)
    if lit:
        p.cylv(0, 0, 0.42, 0.78, 0.07, 'bloom', oid=o, topidx=0)
        p.cylv(0, 0, 0.5, 0.62, 0.035, 'fire', oid=o, topidx=0)
        p.cylv(0, 0, 0.66, 0.78, 0.17, 'bloom', oid=o, topidx=0)
    else:
        p.cylv(0, 0, 0.42, 0.78, 0.07, 'glass', oid=o)
        p.cylv(0, 0, 0.66, 0.78, 0.17, 'cream', oid=o, topidx=1)
    return dict(foot=[-0.17, -0.17, 0.17, 0.17], note='stands on a table or counter: lift it by that piece\'s top',
                light=bool(lit))


def wall_clock(p):
    """A regulator clock on the wall: the case with a glass door, the dial, the pendulum; 1.8 to 2.7u up."""
    p.box(-0.22, 0.0, 1.75, 0.22, 0.14, 2.7, 'wood', tex=planks(0.5, 'a'))
    p.box(-0.26, 0.0, 2.7, 0.26, 0.18, 2.78, 'wood', shades=(0, 1, 2))
    p.box(-0.18, 0.0, 1.7, 0.18, 0.14, 1.75, 'wood', shades=(0, 1, 2))
    o = p.new()
    p.cyl(0, 0.15, 2.45, 'c', 0.16, 0.01, 'cream', oid=o)
    p.box(-0.012, 0.16, 2.45, 0.012, 0.17, 2.56, 'dark', oid=o)
    p.box(0.0, 0.16, 2.44, 0.1, 0.17, 2.465, 'dark', oid=o)
    o = p.new()
    p.box(-0.14, 0.14, 1.85, 0.14, 0.15, 2.25, 'glass', oid=o, shades=(1, 1, 1))
    p.box(-0.01, 0.15, 1.95, 0.01, 0.16, 2.25, 'brass', oid=o)
    p.cyl(0, 0.16, 1.95, 'c', 0.06, 0.01, 'brass', oid=o)
    return dict(foot=[-0.26, 0.0, 0.26, 0.18], wall=True, note='hangs on the wall 1.7 to 2.8u up')


def coat_pegs(p):
    """A peg board on the wall at 2u: a coat, a hat and a lantern hung on it."""
    p.box(-0.75, 0.0, 1.95, 0.75, 0.06, 2.1, 'wood')
    o = p.new()
    for k in range(5):
        a = -0.6 + k * 0.3
        p.box(a - 0.025, 0.06, 2.0, a + 0.025, 0.18, 2.05, 'wood', oid=o)
    # a coat
    o = p.new()
    p.box(-0.5, 0.07, 1.0, -0.15, 0.2, 2.0, 'slate', oid=o)
    p.box(-0.42, 0.18, 1.85, -0.23, 0.22, 2.0, 'slate', oid=o, shades=(2, 2, 3))
    # a hat on the next peg
    o = p.new()
    p.cylv(0.0, 0.18, 1.85, 1.88, 0.16, 'umber', oid=o)
    p.cylv(0.0, 0.18, 1.88, 2.05, 0.1, 'umber', oid=o)
    # a lantern
    o = p.new()
    p.box(0.52, 0.12, 1.55, 0.68, 0.24, 1.8, 'iron', oid=o)
    p.box(0.55, 0.15, 1.6, 0.65, 0.21, 1.75, 'glass', oid=o, shades=(0, 1, 1))
    p.rod((0.6, 0.18, 1.8), (0.6, 0.12, 2.02), 0.01, 'iron', oid=o)
    return dict(foot=[-0.75, 0.0, 0.75, 0.25], wall=True, note='on the wall at 2u')


def barber_chair(p):
    """The barber's chair: red plush on an iron pedestal, the head rest, the foot board; a sitter faces +c."""
    x, z, _ = p.pt(0, 0, 0)
    CYV(x, z, 0.0, 0.1, 0.3, 'blk', oid=p.oid, cast=False)
    CYV(x, z, 0.1, 0.5, 0.1, 'iron', oid=p.oid, cast=False)
    o = p.new()

    def plush(k, sgn, a, c, h, idx):
        return None, np.where(np.mod(a * 6 + 9, 1) < 0.15, clampi(idx + 1), idx)
    p.box(-0.3, -0.3, 0.5, 0.3, 0.3, SEAT + 0.08, 'red', tex=plush, oid=o)
    p.box(-0.3, -0.38, SEAT, 0.3, -0.26, 1.45, 'red', tex=plush, oid=o)
    p.box(-0.15, -0.36, 1.5, 0.15, -0.24, 1.68, 'red', oid=o)
    p.box(-0.04, -0.36, 1.45, 0.04, -0.3, 1.52, 'brass', oid=o)
    for s in (-1, 1):
        p.box(s * 0.36 - 0.05, -0.3, 0.9, s * 0.36 + 0.05, 0.3, 0.98, 'umber', oid=o)
        p.box(s * 0.36 - 0.04, 0.2, SEAT, s * 0.36 + 0.04, 0.28, 0.9, 'brass', oid=o)
    p.F.box(-0.25, 0.3, 0.2, 0.25, 0.55, 0.26, 'brass', oid=p.new(), cast=False)
    return dict(foot=[-0.42, -0.4, 0.42, 0.55], seat=SEAT + 0.08, sit_dy=1, use=[[0, 0, 'sit'], [0, -0.85, 'work']])


def coffin(p, lid=False):
    """A pine coffin on two trestles (the undertaker's shop), the lid leaned or on; along a."""
    for a in (-0.7, 0.7):
        p.rod((a, -0.3, 0.0), (a, 0.0, 0.7), 0.035, 'wood')
        p.rod((a, 0.3, 0.0), (a, 0.0, 0.7), 0.035, 'wood')
        p.box(a - 0.05, -0.35, 0.68, a + 0.05, 0.35, 0.74, 'wood')
    o = p.new()
    # the six-sided box: shoulders wide, tapering to the head and the feet (three boxes), the lid a shade lighter
    p.box(-0.95, -0.3, 0.74, 1.15, 0.3, 1.18, 'straw', tex=planks(0.4, 'h'), oid=o)
    p.box(-0.65, -0.4, 0.74, 0.3, 0.4, 1.18, 'straw', tex=planks(0.4, 'h'), oid=o)
    p.box(-1.15, -0.22, 0.74, -0.95, 0.22, 1.18, 'straw', oid=o)
    p.box(-0.93, -0.27, 1.18, 1.12, 0.27, 1.24, 'straw', shades=(0, 1, 2), oid=o)
    p.box(-0.63, -0.37, 1.18, 0.28, 0.37, 1.24, 'straw', shades=(0, 1, 2), oid=o)
    return dict(foot=[-1.15, -0.45, 1.15, 0.45], use=[[0, 0.7, 'work']])


def _kept(tex, a0, c0, h0, a1, c1, h1):
    ca, cc, ch = (a0 + a1) / 2, (c0 + c1) / 2, (h0 + h1) / 2

    def t(k, sgn, uvw, idx):
        u, v, w = uvw
        return tex(k, sgn, u + ca, v + cc, w + ch, idx)
    return t


def stall(p, horse=False):
    """A horse stall in the livery, drawn with its depth along c: the manger with hay at the back (-c, at the wall),
    plank partitions each side, straw on the floor, a water bucket; 2.6 wide, 4.8 deep, centred on the anchor.
    horse: a bay standing in it, head to the manger (the D27 street horse without its saddle). Draw it at yaw 'se'
    (depth along +x, the manger at -x): the horse is drawn along x."""
    D = 2.4

    def straw_floor(k, sgn, a, c, h, idx):
        n = E.hash2(np.floor((a + 5) * 7).astype(int), np.floor((c + 5) * 7).astype(int)) % 4
        return None, np.where(n == 0, 2, 1)
    p.box(-1.25, -D, 0.0, 1.25, D, 0.04, 'straw', tex=straw_floor, shades=(1, 1, 1))
    for s in (-1, 1):
        o = p.new()
        a = s * 1.3
        p.box(a - 0.06, -D, 0.0, a + 0.06, D - 0.6, 1.5, 'wood', tex=planks(0.4, 'h'), oid=o)
        p.box(a - 0.08, D - 0.7, 0.0, a + 0.08, D - 0.5, 2.2, 'wood', oid=o)
        p.box(a - 0.08, -D, 1.5, a + 0.08, D - 0.6, 1.58, 'wood', oid=o, shades=(0, 1, 2))
        p.ball(a, D - 0.6, 2.25, 0.1, 'wood', oid=o)
    o = p.new()
    p.box(-1.2, -D, 0.7, 1.2, -D + 0.6, 1.2, 'wood', oid=o, tex=planks(0.4, 'h'))
    p.box(-1.1, -D + 0.05, 1.2, 1.1, -D + 0.55, 1.4, 'straw', oid=o,
          tex=lambda k, sgn, a, c, h, idx: (None, np.where(np.mod(a * 9 + h * 5, 1) < 0.3, 2, idx)))
    p.cylv(0.85, -D + 1.1, 0.0, 0.4, 0.22, 'wood', oid=p.new())
    p.cylv(0.85, -D + 1.1, 0.36, 0.41, 0.18, 'river', oid=p.oid, topidx=2)
    if horse:
        import props27
        props27.COATS.setdefault('dbay', ('dwood', 'ink'))          # a darker bay than the street's
        props27.horse(0, 'dbay', tack=False, d='w')
    return dict(foot=[-1.36, -D, 1.36, D], h=2.5 if horse else 2.3,
                use=[[0, 0.0, 'horse', '-c'], [0.0, D + 0.4, 'work', '-c']])


def trunk(p):
    """A steamer trunk at the foot of a bed (hotel rooms, homes)."""
    p.box(-0.5, -0.3, 0.0, 0.5, 0.3, 0.5, 'brick', tex=lambda k, sgn, a, c, h, idx: (
        np.where((np.abs(np.abs(a) - 0.3) < 0.04) | (np.abs(h - 0.4) < 0.03), R('wood'), R('brick')), idx))
    p.box(-0.52, -0.32, 0.5, 0.52, 0.32, 0.6, 'brick', shades=(0, 1, 2))
    p.box(-0.06, 0.3, 0.32, 0.06, 0.33, 0.45, 'brass', oid=p.new())
    return dict(foot=[-0.52, -0.32, 0.52, 0.32], top=0.6)


def lamp_table(p, lit=False):
    """A small round lamp table (a crocheted mat on it) with the oil lamp; top 0.75u, the lamp to 1.5u."""
    x, z, _ = p.pt(0, 0, 0)
    CYV(x, z, 0.0, 0.06, 0.18, 'wood', oid=p.oid, cast=False)
    CYV(x, z, 0.06, 0.68, 0.05, 'wood', oid=p.oid, cast=False)
    CYV(x, z, 0.68, 0.75, 0.27, 'wood', oid=p.oid, cast=False, topidx=1)
    CYV(x, z, 0.75, 0.76, 0.19, 'cream', oid=p.new(), cast=False, topidx=0)
    q = P(p.d, origin=(x, z, 0.76))
    lamp(q, lit)
    return dict(foot=[-0.27, -0.27, 0.27, 0.27], h=1.55, top=0.76, light=bool(lit))


def small_desk(p):
    """A plain writing desk, 1.1 x 0.8u, top 1.05u: one pedestal of drawers, the knee hole at +c; a ledger, an
    inkwell and a paper (the bank's clerk, the sheriff, the assayer, the newspaper; pupils too)."""
    hl, hd = 0.55, 0.4
    p.box(0.1, -hd, 0.0, hl, hd, TABLE - 0.06, 'wood', tex=combine(planks(0.4, 'h'),
                                                                  drawers(0.1, hl, 0.08, TABLE - 0.1, rows=3)))
    for c in (-hd + 0.05, hd - 0.05):
        p.box(-hl, c - 0.05, 0.0, -hl + 0.1, c + 0.05, TABLE - 0.06, 'wood')
    p.box(-hl, -hd, 0.75, 0.1, -hd + 0.05, TABLE - 0.06, 'wood', shades=(2, 3, 3))
    p.box(-hl - 0.04, -hd - 0.04, TABLE - 0.08, hl + 0.04, hd + 0.04, TABLE, 'wood', shades=(0, 1, 2))
    o = p.new()
    p.box(0.15, -0.3, TABLE, 0.45, -0.05, TABLE + 0.12, 'brick', oid=o)
    p.box(-0.35, -0.05, TABLE, 0.05, 0.25, TABLE + 0.02, 'cream', shades=(0, 0, 1), oid=p.new())
    p.box(-0.45, -0.3, TABLE, -0.33, -0.18, TABLE + 0.1, 'dark', oid=p.new())
    p.rod((-0.4, -0.24, TABLE + 0.1), (-0.3, -0.12, TABLE + 0.3), 0.012, 'cream', oid=p.new())
    return dict(foot=[-hl - 0.04, -hd - 0.04, hl + 0.04, hd + 0.04], top=TABLE, h=1.4,
                use=[[0, hd + 0.45, 'sit', '-c']])


# ---------------------------------------------------------------- the list
# Each entry: name, the drawing function, the orientations {key's <o>: how it is drawn}, the frames
# [(key suffix, kwargs)], the height h (u, for extra.box), a note.
#   How it is drawn: a facing for the local frame (sw: the front to +z, se: to +x, ne: to -z, nw: to -x), or
#   ('rot', facing): drawn at that facing, then the whole canvas turned a quarter (the stall with its horse, which is
#   drawn along x).
# The rule for the keys (plans/d32-rooms-art.md, the Rooms builder's contract): <o> is x or z for a piece whose long
# side lies along world x or z; then its front (a counter's customers' side, a shelf's open side, a bed's foot) is
# towards the viewer: +z for x, +x for z. A piece that faces a way (chair, desk, pulpit, barber chair, school desk)
# has se, sw, ne, nw: the way a person sitting or standing at it faces. ne and nw on a counter, bar or pew: the same
# piece turned to face away from the viewer.
AX = {'x': 'sw', 'z': 'se'}                   # long side along the local a
AC = {'x': 'se', 'z': 'sw'}                   # long side along the local c (beds, cots, the stall)
AXA = dict(AX, ne='ne', nw='nw')              # and turned away
F4 = {d: d for d in ('se', 'sw', 'ne', 'nw')}
F4R = {'se': 'nw', 'sw': 'ne', 'ne': 'sw', 'nw': 'se'}   # a desk: its front (the knee hole) faces the sitter
X1 = {'x': 'sw'}
LV = [(str(i), dict(level=i)) for i in range(4)]
FIRE = [('', dict(f=-1)), ('1', dict(f=0)), ('2', dict(f=1))]

PIECES = [
    # ---- in the contract (plans/d32-rooms-art.md section 3) ----
    ('counter', lambda p: counter(p, length=4.0, depth=0.9, height=1.2), AXA, None, 1.65,
     'a shop counter 4 x 0.9u, top 1.2u: panelled front (the customers\' side), the keeper\'s side has open shelves; '
     'scales, a candy jar, brown paper and twine on top'),
    ('shelf', lambda p, level: shelves(p, level, length=3.0, depth=0.6, height=2.6), AX, LV, 2.75,
     'general goods shelves 3 x 0.6u, 2.6u tall, against a back wall: /0 empty, /1 low, /2 half, /3 full'),
    ('sacks', lambda p, level: sacks_stack(p, level), AX, LV, 1.3,
     'sacks of flour and feed on the floor: /0 empty (a folded sack, spilt flour), /1 two, /2 four, /3 eight'),
    ('table', lambda p: table(p, length=1.6, width=1.0), AX, None, 1.4,
     'a kitchen table 1.6 x 1.0u, top 1.05u, a jug, plates and a bowl'),
    ('chair', chair, F4, None, 1.46, 'a kitchen chair, seat 0.62u (the seated frames sit on it)'),
    ('bed', lambda p: bed(p, sleeper=True), AC, None, 1.63,
     'a double bed 2.6 x 1.3u, the quilt humped over a sleeper and pulled up to the pillow: draw '
     'ppl/<who>/lie/se/0 (bed x) or lie/sw/0 (bed z) at the same anchor after it; the head is at -x or -z'),
    ('bed_made', bed, AC, None, 1.63, 'the double bed made up, empty: pillow, patchwork quilt, the sheet turned down'),
    ('stove', stove, X1, FIRE, 3.8, 'a pot-bellied stove, its pipe to 3.8u (cut it at the ceiling): no number '
                                    'cold, /1 and /2 burning (the firelight flickers, about 3 a second)'),
    ('bar', lambda p: bar(p, length=5.0), AXA, None, 2.0,
     'the saloon bar 5 x 1.0u, top 1.25u: the brass foot rail, a spittoon, bottles, glasses, the beer pump; its '
     'front faces the drinkers'),
    ('barstool', barstool, X1, None, 1.0, 'a bar stool, seat 1.0u (lift a seated frame 3 px: extra.sit_dy)'),
    ('desk', lambda p: small_desk(p), {d: F4R[d] for d in F4}, None, 1.4,
     'a writing desk 1.1 x 0.8u, top 1.05u, a pedestal of drawers: <o> is the way the sitter faces (a chair at '
     'extra.use)'),
    ('pew', lambda p: pew(p, length=4.0), AXA, None, 1.65, 'a church pew 4u long, seat 0.62u, five sitters'),
    ('pulpit', pulpit, F4, None, 1.85, 'the pulpit on its dais; <o> is the way the preacher faces'),
    ('blackboard', lambda p: blackboard(p, length=3.0), AX, None, 2.55, 'the blackboard on the back wall, chalked'),
    ('press', press, AX, None, 2.3, 'the Washington hand press with the ink table'),
    ('cell_bars', lambda p: cell_bars(p, length=4.0, height=3.0), AX, None, 3.0,
     'a wall of jail bars 4u long, 3u tall, the barred door in the middle (a -0.45 to 0.45)'),
    ('safe', safe, AX, None, 1.4, 'the iron safe'),
    ('barber_chair', barber_chair, F4, None, 1.68, 'the barber\'s chair; <o> is the way the customer faces'),
    ('coffin', coffin, AX, None, 1.25, 'a pine coffin on trestles'),
    ('forge', forge, AX, FIRE, 4.0, 'the forge against the wall: brick hearth, the coals (no number banked, /1 and '
                                    '/2 glowing), hood and chimney, the slack tub'),
    ('anvil', anvil, AX, None, 1.16, 'the anvil on its stump, the horn along the axis'),
    ('stall', stall, {'x': 'se', 'z': ('rot', 'se')}, [('', {}), ('horse', dict(horse=True))], 2.5,
     'a horse stall 2.6 x 4.8u, its depth along <o>, the manger at the back wall end (-x or -z): /horse with a bay '
     'in it'),
    ('piano', piano, AX, None, 1.62, 'an upright piano and its stool, against the wall'),
    ('rug', lambda p: rug(p, length=2.4, width=1.6), AX, None, 0.03,
     'a rag rug 2.4 x 1.6u, flat: draw it with the floor, before anything standing'),
    ('wash_stand', washstand, AX, None, 2.15, 'a washstand with basin, jug and towel, a mirror on the wall above'),
    ('lamp_table', lamp_table, X1, None, 1.55, 'a small lamp table with the oil lamp, unlit'),
    ('lamp_table_lit', lambda p: lamp_table(p, lit=True), X1, None, 1.55, 'the lamp table with the lamp lit'),
    ('bench', lambda p: bench(p, length=3.0), AX, None, 0.62, 'a plain bench 3u, seat 0.62u'),
    # ---- more, for fuller rooms ----
    ('crates', lambda p, level: crates_stack(p, level), AX, LV, 1.9,
     'crates on the floor: /0 empty (an opened crate, straw), /1 two, /2 four, /3 seven'),
    ('table_cloth', lambda p: table(p, length=1.6, width=1.0, cloth='red'), AX, None, 1.4,
     'the table with a checked cloth (the hotel\'s dining room)'),
    ('card_table', card_table, X1, None, 1.2, 'a round card table, baize, cards and chips; chairs go round it'),
    ('cot', cot, AC, None, 1.45, 'a narrow iron bed 2.6 x 0.9u, made (a child, the maid, a hotel room)'),
    ('cot_sleeper', lambda p: cot(p, sleeper=True), AC, None, 1.45,
     'the iron bed with a sleeper under the blanket: draw the lie frame after it, as on the bed'),
    ('bunk', bunk, AX, None, 1.75, 'the jail bunk hung from the wall on chains, a grey blanket; a sleeper\'s head '
                                   'at the -x (x) or -z (z) end: the lie frames fit it'),
    ('cupboard', cupboard, AX, None, 2.62, 'a kitchen dresser against the wall, glass doors, plates and cups'),
    ('range', kitchen_range, AX, FIRE, 3.8, 'the cook stove (homes, the hotel kitchen): no number cold, /1 and /2 '
                                            'burning'),
    ('barrel', barrel, X1, None, 1.35, 'a cracker barrel, its lid half off'),
    ('trunk', trunk, AX, None, 0.6, 'a steamer trunk at the foot of a bed'),
    ('lamp', lamp, X1, None, 0.78, 'the oil lamp alone, unlit (stands on a surface: lift it by that piece\'s '
                                   'extra.top)'),
    ('lamp_lit', lambda p: lamp(p, True), X1, None, 0.78, 'the oil lamp alone, lit'),
    ('clock', wall_clock, AX, None, 2.78, 'a regulator clock on the wall (1.7 to 2.8u up)'),
    ('pegs', coat_pegs, AX, None, 2.1, 'coat pegs on the wall with a coat, a hat and a lantern'),
    ('desk_office', desk, {d: F4R[d] for d in F4}, None, 1.4, 'a big office desk 1.8 x 0.9u, two pedestals, '
                                                             'ledgers; <o> the way the sitter faces'),
    ('desk_roll', lambda p: desk(p, roll=True), {d: F4R[d] for d in F4}, None, 2.1,
     'a roll-top desk 1.8 x 0.9u (the bank, the hotel office); <o> the way the sitter faces'),
    ('school_desk', school_desk, F4, None, 0.97, 'a pupil\'s desk with its bench joined on (seat 0.52u); <o> the '
                                                 'way the pupil faces'),
    ('backbar', lambda p: backbar(p, length=4.0), AX, None, 3.2,
     'the back bar against the wall: mirror, bottles, the cash register'),
    ('bank_counter', bank_counter, AXA, None, 2.38, 'the bank counter, marble top, the brass grille with the '
                                                    'teller\'s window'),
    ('hotel_desk', hotel_desk, AXA, None, 1.55, 'the hotel\'s front desk with the register, a bell and flowers'),
    ('key_rack', key_rack, AX, None, 2.4, 'the key board and pigeonholes behind the hotel desk, on the wall'),
    ('type_case', type_case, AX, None, 1.38, 'the compositor\'s type cases'),
    ('bellows', bellows, AX, None, 2.05, 'the great bellows and its rocker beside the forge'),
]
