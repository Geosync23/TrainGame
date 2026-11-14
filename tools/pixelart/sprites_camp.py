# Sprite module: D32 the crew's camp (plans/d32-tech.md 4 and 10.4; owner: the D32 artist).
#   camp/tent/<part>, camp/cooktent/<part>   part = back, front, roof, and back_lit, front_lit, roof_lit (lantern
#                                            light through the canvas at night: same size and anchor as the day part)
#   camp/cot, camp/cot_z, camp/cot_made, camp/table, camp/bench, camp/fire/<f>, camp/fire_out, camp/kettle,
#   camp/toolrack, camp/barrel, camp/washline
# A wall tent: canvas walls on a ridge pole, the door flap in the gable end towards the viewer (+z). Its three parts
# fade like a building's: back (the floor and the inside of the far walls), front (the near walls from outside),
# roof. All parts share one anchor: the tent's footprint centre at ground level.
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R
import harness as H
from geom27 import B, CYV, UX, UY, clampi, obox
from geom_d32 import Frame
import line_d32 as L

CV = dict(canvas=(300, 260), origin=(150, 170))


def one(draw, shadow=None, **kw):
    o = dict(CV); o.update(kw)
    return H.render(draw, shadow=shadow, **o)


def _canvas_tex(seams_along='z', lit=False):
    def tex(face, x, z, y, idx):
        c = z if seams_along == 'x' else x
        n = E.hash2(np.floor(x * 7).astype(int) + 3, np.floor((y + z) * 7).astype(int)) % 23
        ii = np.where(n == 0, clampi(idx + 1), idx)
        ii = np.where(np.mod(c + 0.03, 0.75) < 0.06, clampi(idx + 1), ii)
        return None, ii
    return tex


class Tent:
    """A wall tent hw (half width along x) by hl (half length along z), walls wh, ridge rh."""

    def __init__(self, hw, hl, wh, rh, cook=False):
        self.hw, self.hl, self.wh, self.rh, self.cook = hw, hl, wh, rh, cook

    def floor(self):
        hw, hl = self.hw, self.hl
        def ft(face, x, z, y, idx):
            n = E.hash2(np.floor(x * 5).astype(int), np.floor(z * 5).astype(int) + 7) % 100
            rr = np.where(n < 30, R('straw'), R('earth'))
            return rr, np.where(n < 30, 2, np.where(n < 70, 1, 2))
        B(-hw, -hl, 0.0, hw, hl, 0.04, 'earth', tex=ft, cast=False, shades=(1, 1, 1))

    def back(self):
        """The floor, the far gable (-z) and the far side wall (-x) seen from inside (darker, in shade)."""
        hw, hl, wh, rh = self.hw, self.hl, self.wh, self.rh
        self.floor()
        t = 0.04
        # far side wall (-x), its inside face turned to +x: drawn as a thin box, the +x face shows
        B(-hw, -hl, 0.0, -hw + t, hl, wh, 'canvas', tex=_canvas_tex('x'), shades=(2, 2, 3), cast=False)
        # far gable (-z): wall and the triangle up to the ridge, inside face to +z
        gable(self, -hl, -hl + t, shades=(2, 3, 3))
        # the ridge pole and the two upright poles
        CYV(0, -hl + 0.12, 0.0, rh, 0.06, 'wood', cast=False)
        CYV(0, hl - 0.12, 0.0, rh, 0.06, 'wood', cast=False)
        B(-0.05, -hl, rh - 0.1, 0.05, hl, rh, 'wood', shades=(1, 2, 3), cast=False)

    def front(self):
        """The near side wall (+x) and the near gable (+z) with the door flap tied back, from outside; guy ropes."""
        hw, hl, wh, rh = self.hw, self.hl, self.wh, self.rh
        t = 0.04
        dw = 0.55 if not self.cook else 1.3
        def door(x, y, ii):
            d = (np.abs(x) < dw) & (y < rh - 0.35 - np.abs(x) * 0.6)
            seam = (np.abs(np.abs(x) - dw) < 0.06) & (y < rh - 0.2) & ~d
            rr = np.where(d, R('earth'), R('canvas'))
            return rr, np.where(d, 4, np.where(seam, np.minimum(ii + 1, 4), ii))
        B(hw - t, -hl, 0.0, hw, hl, wh, 'canvas', tex=_canvas_tex('x'))
        gable(self, hl - t, hl, tex_door=door)
        # the door flaps tied back
        for s in (-1, 1):
            xf = s * (dw + 0.15)
            B(xf - 0.16, hl, 0.15, xf + 0.16, hl + 0.12, rh * 0.75, 'canvas', shades=(1, 1, 3))
            B(xf - 0.17, hl + 0.1, rh * 0.45, xf + 0.17, hl + 0.14, rh * 0.48, 'bark', shades=(1, 1, 2))
        # guy ropes and pegs along the near side
        F = Frame()
        for z in np.linspace(-hl + 0.4, hl - 0.4, 3 if not self.cook else 4):
            F.rod((hw + 0.02, z, wh), (hw + 1.0, z, 0.02), 0.012, 'cream', cast=False)
            B(hw + 0.95, z - 0.04, 0.0, hw + 1.05, z + 0.04, 0.18, 'wood', shades=(0, 1, 2), cast=False)
        # the ridge pole's ends showing
        CYV(0, hl + 0.05, rh - 0.05, rh + 0.25, 0.06, 'wood', cast=False)

    def roof(self):
        """Two smooth canvas slopes (oriented boxes), the ridge along z, a little overhang over the walls."""
        hw, hl, wh, rh = self.hw, self.hl, self.wh, self.rh
        ov = 0.18
        run, rise = hw + ov, (rh - wh) * (hw + ov) / hw
        L = math.hypot(run, rise)
        for s_ in (-1, 1):
            a = np.array([s_ * run / L, 0.0, -rise / L])          # down the slope, in (x, z, y)
            b = np.array([0.0, 1.0, 0.0])
            c = np.cross(a, b) * (-s_)
            cen = (s_ * run / 2, 0.0, rh - rise / 2 + 0.06)
            def tex(k, sgn, uvw, idx):
                u, v, w = uvw
                ii = np.where(np.mod(v + 0.03, 0.75) < 0.07, np.minimum(idx + 1, 4), idx)
                n = E.hash2(np.floor(u * 7).astype(int) + 5, np.floor(v * 7).astype(int)) % 29
                ii = np.where(n == 0, np.minimum(ii + 1, 4), ii)
                return None, ii
            obox(cen, (a, b, c), (L / 2, hl + 0.06, 0.05), 'canvas', tex=tex, cast=True,
                 shades=(1, 1, 3) if s_ < 0 else (2, 2, 3))
        if self.cook:
            CYV(hw * 0.5, -hl * 0.4, rh - 0.3, rh + 0.9, 0.09, 'dark')
            B(hw * 0.5 - 0.15, -hl * 0.4 - 0.15, rh + 0.9, hw * 0.5 + 0.15, -hl * 0.4 + 0.15, rh + 1.0, 'dark',
              shades=(1, 2, 2))


def gable(T, z0, z1, tex_door=None, shades=(1, 2, 3)):
    """A gable wall across x at z0..z1 (thin), cut to the roof line: an oriented box with a keep mask."""
    hw, wh, rh = T.hw, T.wh, T.rh
    def tex(k, sgn, uvw, idx):
        u, v, w = uvw
        x = u; y = w + rh / 2
        top = wh + (rh - wh) * (1 - np.abs(x) / hw)
        keep = y < top
        n = E.hash2(np.floor(x * 7).astype(int) + 3, np.floor(y * 7).astype(int)) % 23
        ii = np.where(n == 0, np.minimum(idx + 1, 4), idx)
        rr = None
        if tex_door is not None:
            rr, ii = tex_door(x, y, ii)
        return rr, ii, keep
    obox((0.0, (z0 + z1) / 2, rh / 2), ((1, 0, 0), (0, 1, 0), (0, 0, 1)), (hw, abs(z1 - z0) / 2, rh / 2), 'canvas',
         tex=tex, shades=shades)


GLOW = {0: '#f0d49a', 1: '#d8ae70', 2: '#a8784a', 3: '#6e4a32'}


def lit(frame):
    """The same picture with the canvas lit from inside: canvas shades 0..3 turn warm (outlines kept)."""
    img, an = frame
    img = img.copy()
    for i, hx in GLOW.items():
        src = E.PAL[E.RID['canvas'], i]
        m = (img[..., 3] > 0) & np.all(img[..., :3] == src, axis=-1)
        img[m, :3] = E.hx(hx)
    return img, an


# ---------------------------------------------------------------- furniture and props
def cot(axis='x', made=False, blanket=True):
    """An army folding cot, 2.3 x 0.8u, canvas on X legs; made: a folded blanket at the foot."""
    F = Frame() if axis == 'x' else Frame(yaw=-90.0)
    F.box(-1.15, -0.4, 0.45, 1.15, 0.4, 0.52, 'canvas', shades=(1, 2, 3))
    for a in (-1.15, 1.15):
        F.box(a - 0.04, -0.42, 0.42, a + 0.04, 0.42, 0.5, 'wood', shades=(1, 2, 3))
    for a in (-0.9, 0.9):
        F.rod((a - 0.2, -0.38, 0.0), (a + 0.2, -0.38, 0.45), 0.03, 'wood')
        F.rod((a - 0.2, 0.38, 0.0), (a + 0.2, 0.38, 0.45), 0.03, 'wood')
        F.rod((a + 0.2, 0.38, 0.0), (a - 0.2, 0.38, 0.45), 0.03, 'wood')
    if made:
        F.box(0.55, -0.38, 0.52, 1.1, 0.38, 0.68, 'slate', shades=(1, 2, 3))
        F.box(-1.1, -0.3, 0.52, -0.8, 0.3, 0.64, 'umber', shades=(1, 2, 3))


def table():
    """A plank table on trestles, 4 x 1.2u along x; tin plates and cups."""
    B(-2.0, -0.6, 1.0, 2.0, 0.6, 1.1, 'wood', shades=(1, 2, 3))
    F = Frame()
    for a in (-1.6, 1.6):
        F.rod((a, -0.5, 0.0), (a, 0.0, 1.0), 0.05, 'wood')
        F.rod((a, 0.5, 0.0), (a, 0.0, 1.0), 0.05, 'wood')
    for k in range(5):
        x = -1.6 + k * 0.8
        for z in (-0.32, 0.32):
            CYV(x, z, 1.1, 1.13, 0.17, 'iron', cast=False, topidx=1)
        CYV(x + 0.3, 0.0, 1.1, 1.24, 0.06, 'iron', cast=False)


def bench():
    B(-2.0, -0.2, 0.5, 2.0, 0.2, 0.58, 'wood', shades=(1, 2, 3))
    for a in (-1.7, 0.0, 1.7):
        B(a - 0.06, -0.16, 0.0, a + 0.06, 0.16, 0.5, 'wood', shades=(1, 2, 3))


def fire_ring(burning, f=0):
    """A ring of stones, wood laid in it; burning: flames (3 frames) and a glow on the stones."""
    for k in range(10):
        a = k * 2 * math.pi / 10
        E.sphere(math.cos(a) * 3.0, math.sin(a) * 2.8, 0.5, 1.3, 'rock', th=(0.75, 0.3, -0.25), noise=0.4,
                 seed=1100 + k, sz=0.7)
    B(-0.45, -0.35, 0.0, 0.45, 0.35, 0.03, 'dark', shades=(2, 2, 2), cast=False)
    F = Frame()
    for k in range(4):
        a = k * 1.6 + 0.4
        F.rod((math.cos(a) * 0.45, math.sin(a) * 0.45, 0.04), (-math.cos(a) * 0.1, -math.sin(a) * 0.1, 0.35), 0.05,
              'bark' if burning else 'dark')
    if burning:
        rnd = np.random.RandomState(1200 + f)
        for k in range(7):
            x, z = rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25)
            y = rnd.uniform(0.25, 0.75) + (0.15 if k < 2 else 0)
            E.sphere(x * UX, z * UX, y * UY, rnd.uniform(0.5, 0.9) * (1.2 - y), 'fire', th=(0.5, 0.0, -0.6),
                     cast=False, sz=1.6)
        E.sphere(0, 0, 0.35 * UY, 0.8, 'fire', th=(0.6, 0.2, -0.4), cast=False, sz=1.0)


def kettle():
    """An iron kettle on a tripod of poles, a chain from the top."""
    F = Frame()
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.3
        F.rod((math.cos(a) * 0.55, math.sin(a) * 0.55, 0.0), (0, 0, 1.5), 0.035, 'bark')
    F.rod((0, 0, 1.5), (0, 0, 0.75), 0.012, 'iron', cast=False)
    E.sphere(0, 0, 0.55 * UY, 1.25, 'dark', th=(0.7, 0.2, -0.3), sz=0.8)
    B(-0.12, -0.12, 0.7, 0.12, 0.12, 0.76, 'dark', shades=(1, 2, 2))


def toolrack():
    """A rack of poles, picks, shovels and mauls leaning on it (the men take theirs in the morning)."""
    F = Frame()
    F.rod((-1.5, 0.0, 1.1), (1.5, 0.0, 1.1), 0.05, 'bark')
    for a in (-1.4, 1.4):
        F.rod((a, -0.3, 0.0), (a, 0.0, 1.15), 0.04, 'bark')
        F.rod((a, 0.3, 0.0), (a, 0.0, 1.15), 0.04, 'bark')
    kinds = ['shovel', 'pick', 'shovel', 'maul', 'pick', 'shovel', 'rake', 'maul']
    for k, kd in enumerate(kinds):
        a = -1.2 + k * 0.34
        F.rod((a, 0.45, 0.0), (a + 0.05, -0.05, 1.3), 0.03, 'wood')
        if kd == 'shovel':
            F.box(a - 0.08, 0.35, 0.0, a + 0.12, 0.55, 0.35, 'iron', shades=(1, 2, 3))
        elif kd == 'pick':
            F.box(a - 0.05, -0.35, 1.25, a + 0.12, 0.25, 1.35, 'iron', shades=(1, 2, 3))
        elif kd == 'maul':
            F.box(a - 0.05, -0.2, 1.25, a + 0.12, 0.1, 1.38, 'iron', shades=(1, 2, 3))
        else:
            F.box(a - 0.05, -0.3, 1.27, a + 0.12, 0.2, 1.33, 'iron', shades=(1, 2, 3))


def barrel():
    def tex(face, x, z, y, idx):
        hoop = (np.abs(y - 0.2) < 0.05) | (np.abs(y - 0.85) < 0.05)
        stave = np.mod(np.arctan2(z, x) * 3, 1.0) < 0.2
        return np.where(hoop, R('iron'), R('wood')), np.where(hoop, 2, np.where(stave, clampi(idx + 1), idx))
    CYV(0, 0, 0.0, 1.05, 0.38, 'wood', tex=tex)
    CYV(0, 0, 1.0, 1.06, 0.32, 'river', cast=False, topidx=2)
    Frame().rod((0.1, 0.0, 1.06), (0.55, 0.25, 1.4), 0.025, 'iron', cast=False)       # the dipper's handle
    CYV(0.1, 0.0, 0.98, 1.1, 0.1, 'iron', cast=False)


def washline():
    """A line between two poles, shirts and drawers hung on it (along x, 4u)."""
    F = Frame()
    for a in (-2.0, 2.0):
        F.rod((a, 0.0, 0.0), (a, 0.0, 1.9), 0.05, 'bark')
    F.rod((-2.0, 0.0, 1.85), (2.0, 0.0, 1.8), 0.012, 'cream', cast=False)
    cols = [('slate', 0.55), ('cream', 0.6), ('brick', 0.5), ('cream', 0.4), ('umber', 0.55)]
    for k, (c, h) in enumerate(cols):
        a = -1.6 + k * 0.8
        B(a - 0.22, -0.03, 1.8 - h, a + 0.22, 0.03, 1.8, c, shades=(1, 1, 2))
        if c != 'cream':
            B(a - 0.32, -0.03, 1.6, a + 0.32, 0.03, 1.8, c, shades=(1, 1, 2))


TENT = Tent(2.25, 3.0, 1.55, 2.85)
COOK = Tent(3.0, 4.0, 1.8, 3.4, cook=True)


def register(reg):
    g = 'camp'
    FOOT = 'the footprint centre at ground level'
    for name, T, size in (('tent', TENT, '4.5 x 6u'), ('cooktent', COOK, '6 x 8u')):
        box = [-T.hw, -T.hl, T.hw, T.hl, T.rh]
        parts = {
            'back': one(T.back),
            'front': one(T.front, shadow=None),
            'roof': one(T.roof, shadow=(-4 * T.hw - 8, -4 * T.hl - 8, 4 * T.hw + 30, 4 * T.hl + 8)),
        }
        notes = {'back': 'the floor (straw on earth) and the far walls from inside, the poles: draw first',
                 'front': 'the near wall (+x) and the gable (+z) with the door flap tied back, guy ropes: fade it '
                          'when someone is inside in view',
                 'roof': 'the canvas roof and its shadow: fade it like a building\'s roof'}
        for p, fr in parts.items():
            reg.add(f'camp/{name}/{p}', g, [fr], dict(anchor=FOOT, note=f'a wall tent {size}, ridge {T.rh}u: '
                                                       + notes[p], extra=dict(box=box)))
            reg.add(f'camp/{name}/{p}_lit', g, [lit(fr)],
                    dict(anchor=FOOT, note='at night, a lantern inside: the canvas glows warm (same size and anchor)',
                         extra=dict(box=box)))
        # D32 stage 3 (the Rooms builder's contract, plans/d32-rooms-art.md section 2): the floor alone, for a
        # tent opened like a building (/back draws it too)
        reg.add(f'camp/{name}/floor', g, [one(T.floor, outline=False)],
                dict(anchor=FOOT, note=f'the tent\'s floor alone (straw on earth), {size}', extra=dict(box=box)))
    S = (-10, -10, 12, 10)
    props = [('camp/cot', lambda: cot('x'), 'an army folding cot along x (2.3 x 0.8u, top 0.52u); the sleeper '
              '(ppl/navvy_*/lie/se) is drawn at its anchor'),
             ('camp/cot_z', lambda: cot('z'), 'the cot along z (extra; the sleeper is lie/sw)'),
             ('camp/cot_made', lambda: cot('x', made=True), 'the cot made up: a folded blanket and a rolled coat'),
             ('camp/table', table, 'a plank table on trestles, 4 x 1.2u along x, tin plates and cups'),
             ('camp/bench', bench, 'a bench, 4u along x, seat 0.58u'),
             ('camp/fire_out', lambda: fire_ring(False), 'the fire ring by day, the fire out'),
             ('camp/kettle', kettle, 'an iron kettle hung from a tripod'),
             ('camp/toolrack', toolrack, 'the tool rack with picks, shovels, mauls, a rake leaning on it (3u along x)'),
             ('camp/barrel', barrel, 'the water barrel with a dipper'),
             ('camp/washline', washline, 'a wash line, 4u along x, shirts hung out')]
    for key, fn, note in props:
        reg.add(key, g, [one(fn, shadow=S)], dict(anchor=FOOT, note=note))
    reg.add('camp/fire', g, [one(lambda f=f: fire_ring(True, f), shadow=None) for f in range(3)],
            dict(anchor=FOOT, note='the fire burning, 3 frames (about 6 a second, in any order)'))
