# Sprite module: D32 PLACEHOLDERS (the D32 foundation builder, not the artist). Stand-in pictures for the line's
# country, the roadbed's stages and the work train's two new cars, under the keys of plans/d32-tech.md section 10, so
# the line can be drawn and checked before the real art lands. Every one is drawn with the existing shape engine and
# palette in the station's style, but quickly: THE ARTIST'S REAL SPRITES REPLACE THEM BY KEY. When a real module
# (sprites_line.py, sprites_navvy.py, sprites_camp.py, or new keys in sprites_ground.py / sprites_nature.py) registers
# one of these keys, delete that key here (build.py refuses duplicates) and, once none is left, this file and its
# line in registry.OWNERS.
import math
import numpy as np
import pal27  # noqa: F401
import engine as E
import harness as H
import nature as N
import sprites_ground as SG
import stock27 as ST
from engine import R, box, cyl_z, sphere, hash2, new_oid
from geom27 import B

PH = 'PLACEHOLDER (D32 foundation), to be replaced by the artist\'s sprite of the same key. '
TILE = PH + SG.TILE
FOOT = PH + 'foot (the footprint\'s centre) at ground level'
CV = dict(canvas=(420, 340), origin=(210, 240))


def _noise(X, Y, seed, cell=0.5):
    return SG._noise(X, Y, seed, cell)


# ---------------- ground tiles: (X, Y, seed) -> (ramp ids, indices), tile-local MU (0 .. 4) ----------------

def prairie(X, Y, s):
    n = _noise(X, Y, s + 300); n2 = _noise(X, Y, s + 301, 1.0)
    ii = np.where(n < 16, 1, np.where(n < 84, 2, 3))
    straw = n2 < 22 + 6 * s
    rr = np.where(straw, R('straw'), R('grass'))
    ii = np.where(straw, np.where(n < 55, 1, 2), ii)
    if s >= 2:   # flowers
        fl = _noise(X, Y, s + 310, 0.5) < 3
        rr = np.where(fl, R('bloom'), rr); ii = np.where(fl, 0 if s == 2 else 1, ii)
    return rr, ii


def woodfloor(X, Y, s):
    n = _noise(X, Y, s + 320); n2 = _noise(X, Y, s + 321, 0.5)
    rr = np.where(n < 30, R('straw'), R('pine'))
    ii = np.where(n < 30, np.where(n2 < 50, 3, 4), np.where(n < 70, 2, 3))
    twig = n2 < 5
    return np.where(twig, R('wood'), rr), np.where(twig, 3, ii)


def rockground(X, Y, s):
    n = _noise(X, Y, s + 330, 1.0); n2 = _noise(X, Y, s + 331, 0.5)
    ii = np.where(n < 35, 1, np.where(n < 80, 2, 3))
    crack = (n2 < 8)
    ii = np.where(crack, 4, ii)
    tuft = _noise(X, Y, s + 332, 0.5) < 4
    return np.where(tuft, R('sage'), R('rock')), np.where(tuft, 2, ii)


def hill(lit):
    def f(X, Y, s):
        n = _noise(X, Y, s + 340 + (0 if lit else 9))
        if lit:
            ii = np.where(n < 30, 0, np.where(n < 85, 1, 2))
            return np.where(n > 92, R('straw'), R('grass')), ii
        ii = np.where(n < 25, 2, np.where(n < 85, 3, 4))
        return np.where(n > 94, R('pine'), R('grass')), np.where(n > 94, 2, ii)
    return f


def field(X, Y, s):
    furrow = np.mod(Y + s * 0.5, 1.0) < 0.5
    n = _noise(X, Y, s + 350)
    rr = np.where(furrow, R('straw'), R('dirt'))
    return rr, np.where(furrow, np.where(n < 40, 1, 2), np.where(n < 60, 2, 3))


def river(X, Y, f):
    n = _noise(X - f * 1.0, Y, 17, 0.5)
    ii = np.where(n < 60, 3, 2)
    glint = (_noise(X - f * 1.0, Y, 19, 1.0) < 7) & (np.mod(X - f * 1.0, 1.0) < 0.5)
    return R('creek'), np.where(glint, 1, ii)


def riverbank(side):
    def f(X, Y, s):
        d = {'n': 4.0 - Y, 's': Y, 'e': X, 'w': 4.0 - X}
        t = d[side] if len(side) == 1 else np.minimum(d[side[0]], d[side[1]])
        jit = (_noise(X, Y * 0 + 1, 5, 0.5) % 7) / 10.0
        rg, ig = prairie(X, Y, 0)
        rs, is_ = SG.sand(X, Y, 1)
        rw, iw = river(X, Y, 0)
        wet = t > 2.4 + jit
        sandy = (t > 1.4 + jit) & ~wet
        return (np.where(wet, rw, np.where(sandy, rs, rg)),
                np.where(wet, np.where(t < 2.9 + jit, 4, iw), np.where(sandy, np.where(t > 2.1 + jit, 2, is_), ig)))
    return f


def cleared(X, Y, s):
    rr, ii = SG.dirt(X, Y, s + 5)
    stub = _noise(X, Y, s + 360, 0.5) < 14
    return np.where(stub, R('straw'), rr), np.where(stub, 2, ii)


def bed(X, Y, s):
    n = _noise(X, Y, s + 370)
    ii = np.where(n < 20, 2, np.where(n < 85, 3, 4))
    mark = np.mod(X + Y * 0.5 + s, 2.0) < 0.3
    return R('dirt'), np.where(mark, 2, ii)


def rockbed(X, Y, s):
    n = _noise(X, Y, s + 380, 0.5); m = _noise(X, Y, s + 381, 0.5)
    rr = np.where(m < 30, R('rock'), R('iron'))
    return rr, np.where(n < 30, 1, np.where(n < 80, 2, 3))


# ---------------- nature (MU, as nature.py) ----------------

def pine(v=0):
    """A pine, 5 to 6.5u: a straight trunk and tiers of dark boughs narrowing to the top."""
    o = new_oid(True)
    s = (1.0, 1.15, 0.85)[v]
    cyl_z(0, 0, 0, 10 * s, 0.8 * s, 'wood', oid=o, th=(0.45, 0.2, -0.15))
    for k in range(6):
        t = k / 5.0
        sphere((0.5 if k % 2 else -0.4) * s, 0.2 * s, (9 + 4.6 * k) * s, (6.2 - 4.4 * t) * s, 'pine', oid=o,
               th=(0.72, 0.3, -0.15), noise=0.6, seed=300 + v * 11 + k, sz=0.62)
    return o


def oak(v=0):
    """A scrub oak, about 5u: a short forked trunk and a broad round crown."""
    rnd = np.random.RandomState(330 + v)
    o = new_oid(True)
    s = (1.0, 0.8)[v]
    cyl_z(0, 0, 0, 9 * s, 1.3 * s, 'wood', oid=o, th=(0.45, 0.2, -0.15))
    N.limb(0, 0, 8 * s, -4 * s, 2 * s, 15 * s, 1.0 * s, 0.5 * s, 'wood', o)
    N.limb(0, 0, 8 * s, 4 * s, -1 * s, 16 * s, 1.0 * s, 0.5 * s, 'wood', o)
    blobs = N._blobs(rnd, 0, 0, 20 * s, 6.5 * s, 12, 2.8 * s, 4.4 * s, 0.5)
    blobs.insert(0, (0, 0, 19 * s, 6.0 * s))
    N.crown(blobs, o, 330 + v)
    return o


def stump(v=0):
    o = new_oid(True)
    r = (1.1, 0.8)[v]
    cyl_z(0, 0, 0, 1.8 + v * 0.6, r, 'wood', oid=o, th=(0.45, 0.2, -0.15), topidx=0)
    sphere(r + 0.8, 0.6, 0.3, 0.5, 'straw', oid=o, cast=False)
    return o


def brush(v=0):
    """Thick brush on the right of way: sage and green clumps, 1 to 1.6u."""
    rnd = np.random.RandomState(350 + v)
    o = new_oid(True)
    s = (1.0, 1.25, 0.8)[v]
    blobs = N._blobs(rnd, 0, 0, 3.6 * s, 2.6 * s, 7, 1.4 * s, 2.3 * s, 0.4)
    for k, (x, y, z, r) in enumerate(blobs):
        sphere(x, y, z, r, 'sage' if k % 3 else 'leaf', oid=o, th=(0.8, 0.35, -0.15), noise=0.7, seed=350 + v * 9 + k, sz=0.85)
    return o


def brush_cut():
    o = new_oid(True)
    for k, (x, y) in enumerate(((-1.5, 0.4), (0.6, -0.8), (1.6, 0.9), (-0.2, 1.2))):
        sphere(x, y, 0.3, 0.8, 'straw' if k % 2 else 'sage', oid=o, noise=0.6, seed=370 + k, sz=0.5, cast=False)
    return o


def mound(v=0):
    """A grassy hill beyond the corridor (baked into the ground): up to 20u across."""
    o = new_oid(False)
    r, sz = ((34, 0.36), (26, 0.42), (40, 0.30))[v]
    sphere(0, 0, 0, r, 'grass', oid=o, th=(0.86, 0.5, 0.05), noise=0.5, seed=380 + v, sz=sz, cast=False)
    for k in range(4 + v):
        a = k * 1.9 + v
        sphere(math.cos(a) * r * 0.5, math.sin(a) * r * 0.5, r * sz * 0.8, 1.6, 'sage', oid=o, noise=0.6, seed=390 + k, cast=False)
    return o


def fence(axis):
    o = new_oid(True)
    for k in range(5):
        p = -16 + 8 * k
        x, y = (p, 0) if axis == 'x' else (0, p)
        box(x - 0.3, y - 0.3, 0, x + 0.3, y + 0.3, 6.0, 'wood', oid=o)
    for z in (2.6, 4.8):
        if axis == 'x':
            box(-16, -0.15, z, 16, 0.15, z + 0.5, 'wood', shades=(1, 2, 3), oid=o)
        else:
            box(-0.15, -16, z, 0.15, 16, z + 0.5, 'wood', shades=(1, 2, 3), oid=o)
    return o


def haystack():
    o = new_oid(True)
    sphere(0, 0, 0, 5.0, 'straw', oid=o, noise=0.5, seed=400, sz=1.25)
    return o


# ---------------- the line's loose things (game units through geom27.B: x, z, y) ----------------

def stake():
    o = new_oid(True)
    B(-0.06, -0.06, 0, 0.06, 0.06, 1.0, 'wood', oid=o)
    B(-0.08, -0.08, 1.0, 0.08, 0.08, 1.2, 'red', oid=o)


def tie_pile(n):
    o = new_oid(True)
    for layer in range(n):
        y = layer * 0.3
        for k in range(4 - (layer % 2)):
            x = -0.75 + k * 0.42 + (0.2 if layer % 2 else 0)
            B(x, -1.85, y, x + 0.34, 1.85, y + 0.28, 'umber', oid=o)


def rail_stack(n):
    o = new_oid(True)
    B(-5.6, -0.5, 0, -5.2, 0.5, 0.2, 'wood', oid=o); B(5.2, -0.5, 0, 5.6, 0.5, 0.2, 'wood', oid=o)
    for k in range(n * 2):
        z = -0.4 + (k % 4) * 0.25; y = 0.2 + (k // 4) * 0.18
        B(-6.5, z, y, 6.5, z + 0.14, y + 0.16, 'iron', shades=(1, 2, 3), oid=o)


def keg():
    o = new_oid(True)
    cyl_z(0, 0, 0, 4.2, 1.3, 'wood', oid=o, topidx=1)
    cyl_z(0, 0, 1.0, 1.4, 1.36, 'iron', oid=o); cyl_z(0, 0, 3.0, 3.4, 1.36, 'iron', oid=o)


def heap(ramp, v):
    o = new_oid(True)
    r = (3.0, 4.2, 5.4)[v]
    sphere(0, 0, 0, r, ramp, oid=o, noise=0.6, seed=410 + v, sz=0.62)
    for k in range(3 + v):
        a = k * 2.1
        sphere(math.cos(a) * r * 0.7, math.sin(a) * r * 0.7, 0.2, r * 0.35, ramp, oid=o, noise=0.6, seed=420 + k, sz=0.7)


def trestle_bent():
    """One bent of the timber trestle: three posts and a cap across the line, a brace; 5u wide, 2u under the deck."""
    o = new_oid(True)
    for z in (-2.2, 0.0, 2.2):
        B(-0.2, z - 0.2, -2.0, 0.2, z + 0.2, 0.0, 'umber', oid=o)
    B(-0.25, -2.6, -0.3, 0.25, 2.6, 0.0, 'wood', oid=o)


def trestle_deck():
    """A length of the trestle's deck: stringers and close-laid ties, 8u along x, 5u wide, top at ground level."""
    o = new_oid(True)
    B(-4.0, -1.4, -0.5, 4.0, -1.0, -0.2, 'umber', oid=o); B(-4.0, 1.0, -0.5, 4.0, 1.4, -0.2, 'umber', oid=o)
    def ties(face, x, z, y, idx):
        return None, np.where(((x + 4.0) / 0.5) % 1.0 < 0.3, 4, idx)
    B(-4.0, -2.4, -0.2, 4.0, 2.4, 0.0, 'wood', oid=o, tex=ties)


def board(text_ramp, h=2.4):
    o = new_oid(True)
    B(-0.08, -0.08, 0, 0.08, 0.08, h, 'wood', oid=o)
    B(-0.1, -0.7, h - 0.9, 0.1, 0.7, h, text_ramp, oid=o)


def rise(v):
    """A piece of the low rise across the line before it is cut: 8u along x, 10u across, under knee height."""
    o = new_oid(False)
    sphere(0, 0, 0, 20, 'grass', oid=o, th=(0.86, 0.5, 0.05), noise=0.5, seed=430 + v, sz=0.14 + 0.03 * v, cast=False)
    sphere(6 - 5 * v, 3, 1.5, 1.4, 'sage', oid=o, noise=0.6, seed=440 + v, cast=False)


def cut_bank(side):
    """The bank left beside the cut: 8u along x, 2.5u deep, 1u high, earth face towards the track."""
    o = new_oid(False)
    z0, z1 = (-1.25, 1.25)
    B(-4.0, z0, 0, 4.0, z1, 0.7, 'dirt', shades=(1, 2, 3), oid=o)
    B(-4.0, z0 + (0.0 if side == 's' else 0.6), 0.7, 4.0, z1 - (0.6 if side == 's' else 0.0), 1.0, 'grass', shades=(1, 2, 3), oid=o)


def crewcar():
    """The crew car: a boxcar with a row of small windows, a stovepipe and end steps."""
    o = ST.boxcar_shell(0.0)
    for x in (-3.4, -1.9, 1.9, 3.4):
        B(x - 0.35, ST.BZ, 3.2, x + 0.35, ST.BZ + 0.06, 4.0, 'glass', shades=(1, 1, 2), oid=o)
        B(x - 0.42, ST.BZ, 3.1, x + 0.42, ST.BZ + 0.05, 3.2, 'cream', shades=(1, 1, 2), oid=o)
    B(2.6, -0.9, ST.B_TOP, 2.8, -0.7, ST.B_TOP + 0.9, 'iron', oid=o)
    B(-ST.BX, -ST.BZ - 0.02, 4.55, ST.BX, ST.BZ + 0.07, 4.75, 'green', shades=(1, 2, 3), oid=o)
    for sx in (-1, 1):
        B(sx * (ST.BX - 0.9), ST.BZ, 0.6, sx * (ST.BX - 0.2), ST.BZ + 0.5, 0.75, 'wood', oid=o)
        B(sx * (ST.BX - 0.9), ST.BZ, 1.05, sx * (ST.BX - 0.2), ST.BZ + 0.3, 1.2, 'wood', oid=o)


def gondola():
    """The gondola of rock: a flatcar with side boards and a heaped load."""
    o = ST.flatcar()
    for zs in (-1, 1):
        B(-4.9, zs * 2.0 - 0.06, 1.9, 4.9, zs * 2.0 + 0.06, 3.0, 'wood', shades=(1, 2, 3), oid=o,
          tex=lambda f, x, z, y, i: (None, np.where(((y - 1.9) / 0.37) % 1.0 < 0.15, 3, i)))
    for sx in (-1, 1):
        B(sx * 4.9 - 0.06, -2.0, 1.9, sx * 4.9 + 0.06, 2.0, 3.0, 'wood', shades=(1, 2, 3), oid=o)
    for k in range(9):
        x = -4.0 + k * 1.0
        sphere(x * 4, (0.5 if k % 2 else -0.5) * 4, 2.9 * 16 / 3, 3.4, 'rock', oid=o, noise=0.6, seed=450 + k, sz=0.6, cast=False)


def _one(draw, shadow=None, outline=True, **kw):
    o = dict(CV); o.update(kw)
    return [H.render(draw, shadow=shadow, outline=outline, **o)]


def _veh(draw):
    return [H.render(draw, shadow=(-22, -11, 26, 10), canvas=(460, 340), origin=(230, 220))]


def register(reg):
    t = SG.tile
    for name, fn, n in (('prairie', prairie, 4), ('woodfloor', woodfloor, 3), ('rockground', rockground, 3),
                        ('hill_lit', hill(True), 2), ('hill_shade', hill(False), 2), ('field', field, 2),
                        ('ln_cleared', cleared, 2), ('ln_bed', bed, 2), ('ln_rock', rockbed, 2)):
        for v in range(n):
            reg.add(f'tile/{name}/{v + 1}', 'd32ph', [t(fn, v)], dict(anchor=TILE))
    reg.add('tile/river', 'd32ph', [t(river, f) for f in (0, 1)], dict(anchor=TILE))
    for side in ('n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'):
        reg.add(f'tile/riverbank/{side}', 'd32ph', [t(riverbank(side))], dict(anchor=TILE))
    big, mid, small = (-24, -40, 70, 24), (-14, -20, 40, 14), (-8, -10, 18, 8)
    for v in range(3):
        reg.add(f'nat/pine/{v + 1}', 'd32ph', _one(lambda v=v: pine(v), shadow=mid), dict(anchor=FOOT))
        reg.add(f'nat/brush/{v + 1}', 'd32ph', _one(lambda v=v: brush(v), shadow=small), dict(anchor=FOOT))
        reg.add(f'nat/mound/{v + 1}', 'd32ph', _one(lambda v=v: mound(v), shadows=False, outline=False),
                dict(anchor=PH + 'the mound\'s centre at ground level; baked into the ground beyond the corridor'))
    for v in range(2):
        reg.add(f'nat/oak/{v + 1}', 'd32ph', _one(lambda v=v: oak(v), shadow=big), dict(anchor=FOOT))
        reg.add(f'nat/stump/{v + 1}', 'd32ph', _one(lambda v=v: stump(v), shadow=small), dict(anchor=FOOT))
    reg.add('nat/felled', 'd32ph', _one(lambda: N.fallen_log('x'), shadow=mid), dict(anchor=FOOT))
    reg.add('nat/brush_cut', 'd32ph', _one(brush_cut, shadows=False), dict(anchor=FOOT))
    reg.add('nat/fence_x', 'd32ph', _one(lambda: fence('x'), shadow=mid), dict(anchor=PH + 'the middle post\'s foot; 8u along x'))
    reg.add('nat/fence_z', 'd32ph', _one(lambda: fence('z'), shadow=mid), dict(anchor=PH + 'the middle post\'s foot; 8u along z'))
    reg.add('nat/haystack', 'd32ph', _one(haystack, shadow=mid), dict(anchor=FOOT))
    reg.add('line/stake', 'd32ph', _one(stake, shadows=False), dict(anchor=FOOT))
    for n in (1, 2, 3):
        reg.add(f'line/tie_pile/{n}', 'd32ph', _one(lambda n=n: tie_pile(n), shadow=small), dict(anchor=FOOT))
        reg.add(f'line/rail_stack/{n}', 'd32ph', _one(lambda n=n: rail_stack(n), shadow=(-30, -6, 32, 6)), dict(anchor=FOOT))
        reg.add(f'line/rock_heap/{n}', 'd32ph', _one(lambda n=n: heap('rock', n - 1), shadow=small), dict(anchor=FOOT))
        reg.add(f'line/rise/{n}', 'd32ph', _one(lambda n=n: rise(n - 1), shadows=False, outline=False),
                dict(anchor=PH + 'the piece\'s centre on the track centre line at ground level; 8u along x'))
    for n in (1, 2):
        reg.add(f'line/earth_heap/{n}', 'd32ph', _one(lambda n=n: heap('dirt', n - 1), shadow=small), dict(anchor=FOOT))
    reg.add('line/keg', 'd32ph', _one(keg, shadow=small), dict(anchor=FOOT))
    reg.add('line/trestle_bent', 'd32ph', _one(trestle_bent, shadows=False), dict(anchor=PH + 'the cap\'s middle at deck (ground) level'))
    reg.add('line/trestle_deck', 'd32ph', _one(trestle_deck, shadows=False), dict(anchor=PH + 'the deck piece\'s centre at ground level; 8u along x'))
    reg.add('line/yard_limit', 'd32ph', _one(lambda: board('cream'), shadow=small), dict(anchor=FOOT))
    reg.add('line/mile_board', 'd32ph', _one(lambda: board('cream', 1.8), shadow=small), dict(anchor=FOOT))
    reg.add('line/end_stake', 'd32ph', _one(lambda: board('red', 1.6), shadow=small), dict(anchor=FOOT))
    for side in ('n', 's'):
        reg.add(f'line/cut_bank_{side}', 'd32ph', _one(lambda side=side: cut_bank(side), shadows=False),
                dict(anchor=PH + 'the bank piece\'s centre at ground level; 8u along x'))
    anchor = PH + 'centre of the footprint at y = 0, on the track centre line'
    for key, fn in (('veh/crewcar', crewcar), ('veh/gondola', gondola)):
        fr = _veh(fn)
        for h in ('e', 'w'):
            reg.add(f'{key}/{h}', 'd32ph', fr, dict(anchor=anchor, length=13.0 if key.endswith('crewcar') else 10.0))
