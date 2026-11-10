# Town and station art: the depot, platform canopy, storage shed, the three shops, houses, church, water tower,
# platforms and walkway, street and ground tiles, trees, props, goods and the handcart.
# Owned by the buildings-and-town artist. Drawn with the shared engine (engine.py); no change to the engine or
# palette: every helper this file needs (a local building frame that turns a building to face +z or +x, lettering
# on either visible face, cones for pine trees, hand-drawn pixel maps) lives here.
#
# Units: mockup units (MU), as engine.py: 4 MU = 1 game unit along x and z, 16/3 MU = 1 game unit up
# (1.5 px per MU up). Engine X = game +x, engine Y = game +z, engine Z = up.
import math
import numpy as np
import engine as E
from engine import R, box, cyl_z, sphere, disc_y, disc_x, gable_x, gable_y, hash2, new_oid
import font as FT

U = 4.0                 # MU per game unit along x and z
UY = 16.0 / 3.0         # MU per game unit up
DECK = 2.0              # platform deck top: 3 px (the contract's DECK), 0.375 u
SHOPS = ('store', 'smithy', 'saloon')
TAG = {'store': ('green', 1, 'G0'), 'smithy': ('glass', 1, 'n0'), 'saloon': ('red', 1, 'r1'),
       'out': ('ochre', 0, 'o0'), 'any': ('cream', 0, 'c0')}


# ============================ small helpers ============================
def rect(u, z, u0, u1, z0, z1):
    return (u >= u0) & (u < u1) & (z >= z0) & (z < z1)


def clampi(i, lo=0, hi=4):
    return np.clip(i, lo, hi)


class Paint:
    """Accumulates ramp/index arrays for one face; methods paint simple architectural elements."""
    def __init__(self, ramp, u, z, idx, lit):
        self.u, self.z = u, z
        self.rr = np.full(np.shape(u), R(ramp))
        self.ii = np.array(idx, copy=True) if np.ndim(idx) else np.full(np.shape(u), idx)
        self.base = self.ii.copy()
        self.lit = lit            # 0 on the lit (+z) face, 1 on the shaded (+x) face

    def fill(self, m, ramp, ii):
        self.rr = np.where(m, R(ramp), self.rr)
        self.ii = np.where(m, ii, self.ii)

    def battens(self, step=2.5, w0=0.5, w1=0.95, u=None):
        u = self.u if u is None else u
        f = np.mod(u, step)
        self.ii = np.where(f < w0, clampi(self.base - 1), np.where(f < w1, clampi(self.base + 1), self.ii))

    def clapboard(self, step=2.0, lap=0.55):
        self.ii = np.where(np.mod(self.z, step) < lap, clampi(self.base + 1), self.ii)

    def logs(self, step=2.0):
        f = np.mod(self.z, step)
        self.ii = np.where(f < 0.55, clampi(self.base + 1), np.where(f > step - 0.5, clampi(self.base - 1), self.ii))

    def window(self, u0, u1, z0, z1, trim='cream', panes=(2, 2), glass='glass', sill=True, lit_glass=False, shutters=None):
        u, z = self.u, self.z
        fr = rect(u, z, u0 - 0.6, u1 + 0.6, z0 - 0.6, z1 + 0.6)
        g = rect(u, z, u0, u1, z0, z1)
        self.fill(fr & ~g, trim, 1 + self.lit)
        if lit_glass:
            gi = np.where(z > z1 - 1.2, 1, 0)
            self.fill(g, 'brass', gi)
        else:
            gi = np.where(z > z1 - 1.0, 2, 3)
            gi = np.where((z > z1 - 2.2) & (u < u0 + 1.0) & (self.lit == 0), 1, gi)
            gi = np.where(z < z0 + 0.8, 3, gi)
            self.fill(g, glass, gi)
        nu, nz = panes
        for k in range(1, nu):
            uc = u0 + (u1 - u0) * k / nu
            self.fill(g & (np.abs(u - uc) < 0.3), trim, 1 + self.lit)
        for k in range(1, nz):
            zc = z0 + (z1 - z0) * k / nz
            self.fill(g & (np.abs(z - zc) < 0.3), trim, 1 + self.lit)
        if sill:
            self.fill(rect(u, z, u0 - 1.0, u1 + 1.0, z0 - 1.2, z0 - 0.5), trim, 0 + self.lit)
        if shutters:
            for s0 in (u0 - 2.4, u1 + 0.6):
                sm = rect(u, z, s0, s0 + 1.8, z0 - 0.4, z1 + 0.4)
                self.fill(sm, shutters, np.where(np.mod(z, 1.2) < 0.4, 2 + self.lit, 1 + self.lit))

    def door(self, u0, u1, z1, ramp='wood', trim='cream', panels=True, double=False, z0=0.0, knob=True):
        u, z = self.u, self.z
        fr = rect(u, z, u0 - 0.6, u1 + 0.6, z0, z1 + 0.6)
        d = rect(u, z, u0, u1, z0, z1)
        self.fill(fr & ~d, trim, 1 + self.lit)
        ii = np.full(np.shape(u), 2 + self.lit)
        if panels:
            w = u1 - u0
            for (pu0, pu1) in ((u0 + 0.6, u0 + w / 2 - 0.4), (u0 + w / 2 + 0.4, u1 - 0.6)) if (double or w > 3.5) else ((u0 + 0.6, u1 - 0.6),):
                for (pz0, pz1) in ((z0 + 1.0, z0 + (z1 - z0) * 0.45), (z0 + (z1 - z0) * 0.55, z1 - 0.9)):
                    p = rect(u, z, pu0, pu1, pz0, pz1)
                    ii = np.where(p, 3 + self.lit, ii)
                    ii = np.where(p & (np.abs(z - pz1) < 0.5), 1 + self.lit, ii)
            if double:
                ii = np.where(np.abs(u - (u0 + u1) / 2) < 0.3, 4, ii)
        self.fill(d, ramp, clampi(ii))
        if knob:
            kx = (u0 + u1) / 2 + (0.9 if double else (u1 - u0) / 2 - 0.9)
            self.fill(d & (np.abs(u - kx) < 0.45) & (np.abs(z - (z0 + (z1 - z0) * 0.48)) < 0.5), 'brass', 1)

    def board(self, u0, u1, z0, z1, ramp, ii, frame=None, fi=1):
        if frame:
            self.fill(rect(self.u, self.z, u0 - 0.6, u1 + 0.6, z0 - 0.6, z1 + 0.6), frame, fi + self.lit)
        self.fill(rect(self.u, self.z, u0, u1, z0, z1), ramp, ii)


class Frame:
    """Draws a building in local coordinates and turns it to face +z ('s'), +x ('e') or -x ('w').
    Local: a runs across the front (left to right as seen from the street), b runs from the back to the front
    (+b points out of the front), z is up. Local faces: 't' top, 'f' front (+b), 'k' back (-b), 's' the side
    seen in the fixed view (the right-hand end (+a) for 's' and 'w' facings, the left-hand end (-a) for 'e')."""
    MAP = {
        's': {'t': 't', 'f': 'l', 's': 'r'},      # front on the lit +z face, right end on the +x face
        'e': {'t': 't', 'f': 'r', 's': 'l'},      # front on the shaded +x face, left end on the +z face
        'w': {'t': 't', 's': 'l', 'k': 'r'},      # back on the +x face, right end on the +z face
        'n': {'t': 't', 'k': 'l', 's': 'r'},      # back on the +z face, left end on the +x face (carts only)
    }

    def __init__(self, facing='s', ox=0.0, oy=0.0):
        facing = {'z': 's', 'x': 'e'}.get(facing, facing)
        assert facing in self.MAP
        self.f = facing
        self.ox, self.oy = ox, oy

    def w(self, a, b):
        if self.f == 's':
            return self.ox + a, self.oy + b
        if self.f == 'e':
            return self.ox + b, self.oy - a
        if self.f == 'n':
            return self.ox - a, self.oy - b
        return self.ox - b, self.oy + a

    def local(self, X, Y):
        if self.f == 's':
            return X - self.ox, Y - self.oy
        if self.f == 'e':
            return -(Y - self.oy), X - self.ox
        if self.f == 'n':
            return -(X - self.ox), -(Y - self.oy)
        return Y - self.oy, -(X - self.ox)

    def wface(self, lf):
        return self.MAP[self.f].get(lf)

    def rect_w(self, a0, b0, a1, b1):
        xs, ys = zip(self.w(a0, b0), self.w(a1, b1))
        return min(xs), min(ys), max(xs), max(ys)

    def box(self, a0, b0, z0, a1, b1, z1, ramp, paint=None, shades=(1, 2, 3), oid=0, cast=True, faces='tfsk'):
        X0, Y0, X1, Y1 = self.rect_w(a0, b0, a1, b1)
        wf = ''.join(self.wface(c) for c in faces if self.wface(c))
        if not wf:
            return
        tex = None
        if paint is not None:
            inv = {v: k for k, v in self.MAP[self.f].items()}
            def tex(face, X, Y, Z, idx, inv=inv):
                lf = inv.get(face, face)
                a, b = self.local(X, Y)
                lit = 0 if face in ('t', 'l') else 1
                if lf == 'f':
                    u = a - a0
                elif lf == 'k':
                    u = a1 - a
                elif lf == 's':
                    u = (b - b0) if self.f == 'e' else (b1 - b)
                else:
                    u = a - a0
                return paint(lf, u, Z, a, b, idx, lit)
        box(X0, Y0, z0, X1, Y1, z1, ramp, shades=shades, tex=tex, oid=oid, cast=cast, faces=wf)

    def roof_depth(self, b0, b1, ac, hw, ze, zr, ramp, wall=None, oid=0, tex=None, endtex=None, shades=(1, 2), cast=True):
        """A gable roof whose ridge runs from back to front; its gable end shows at the front ('s', 'e') or the
        back ('w')."""
        if self.f == 's':
            gable_y(self.oy + b0, self.oy + b1, self.ox + ac, hw, ze, zr, ramp, wall=wall, oid=oid, tex=tex,
                    endtex=endtex, shades=shades, cast=cast)
        elif self.f == 'e':
            gable_x(self.ox + b0, self.ox + b1, self.oy - ac, hw, ze, zr, ramp, wall=wall, oid=oid, tex=tex,
                    endtex=endtex, shades=shades, cast=cast)
        else:
            gable_x(self.ox - b1, self.ox - b0, self.oy + ac, hw, ze, zr, ramp, wall=wall, oid=oid, tex=tex,
                    endtex=endtex, shades=shades, cast=cast)

    def roof_across(self, a0, a1, bc, hw, ze, zr, ramp, wall=None, oid=0, tex=None, endtex=None, shades=(1, 2), cast=True):
        """A gable roof whose ridge runs across the front; its gable end shows on the visible side."""
        if self.f == 's':
            gable_x(self.ox + a0, self.ox + a1, self.oy + bc, hw, ze, zr, ramp, wall=wall, oid=oid, tex=tex,
                    endtex=endtex, shades=shades, cast=cast)
        elif self.f == 'e':
            gable_y(self.oy - a1, self.oy - a0, self.ox + bc, hw, ze, zr, ramp, wall=wall, oid=oid, tex=tex,
                    endtex=endtex, shades=shades, cast=cast)
        else:
            gable_y(self.oy + a0, self.oy + a1, self.ox - bc, hw, ze, zr, ramp, wall=wall, oid=oid, tex=tex,
                    endtex=endtex, shades=shades, cast=cast)

    def text(self, face, left, zt, s, ramp, ii, oid=None, plane=None):
        """Letters on the front ('f', plane = b of the face, left = a of the text's left end) or on the side
        ('s', plane = a of the face, left = b of the text's left end as seen)."""
        if face == 'f':
            X, Y = self.w(left, plane)
        else:
            X, Y = self.w(plane, left)
        wface = self.wface(face)
        if wface is None:
            return 0
        return text_on(wface, X, Y, zt, s, ramp, ii, oid)


def text_width(s):
    w = 0
    for ch in s:
        g = FT.CAPS.get(ch, FT.CAPS[' '])
        w += len(g[0]) + 1
    return w - 1


def text_on(face, X, Y, Z, s, ramp, ii, oid=None):
    """Letters (shared pixel font, capitals) on a +y face ('l', slopes down to the right) or a +x face ('r',
    slopes up to the right). (X, Y, Z) is the top-left of the text. Each letter stays upright and unsheared;
    letters step by one pixel every two, like the mockup's signs."""
    sx, sy = E.proj(X, Y, Z)
    sx = int(math.floor(sx)); sy = int(math.floor(sy))
    col = 0
    for ch in s:
        g = FT.CAPS.get(ch, FT.CAPS[' '])
        off = (col + 1) // 2 if face == 'l' else -((col + 1) // 2)
        for c in range(len(g[0])):
            for r in range(5):
                if g[r][c] == '1':
                    px = sx + col + c; py = sy + r + off
                    if 0 <= px < E.W and 0 <= py < E.H and (oid is None or E.OB[py, px] == oid):
                        E.RB[py, px] = R(ramp); E.IB[py, px] = ii
        col += len(g[0]) + 1
    return col


# ---------------------------- textures ----------------------------
def shingle_tex(rowh=1.6, colw=2.6, ramp=None, moss=False):
    def f(face, X, Y, Z, idx):
        c = X if face in ('f', 'b') else Y
        row = np.floor(Z / rowh).astype(int)
        off = np.where(row % 2 == 0, 0.0, colw / 2)
        ii = idx.copy()
        ii = np.where(np.mod(Z, rowh) < 0.5, clampi(idx + 1), ii)
        ii = np.where((np.mod(c + off, colw) < 0.45) & (np.mod(Z, rowh) < 1.1), clampi(idx + 1), ii)
        h = hash2(np.floor((c + off) / colw).astype(int), row) % 17
        ii = np.where((h == 5) & (np.mod(Z, rowh) >= 0.6), clampi(idx + 1), ii)
        ii = np.where((h == 9) & (np.mod(Z, rowh) >= 1.3) & (idx > 0), clampi(idx - 1), ii)
        return (None if ramp is None else np.full(X.shape, R(ramp))), ii
    return f


def plank_roof_tex(step=2.5):
    def f(face, X, Y, Z, idx):
        c = X if face in ('f', 'b') else Y
        ii = np.where(np.mod(c, step) < 0.55, clampi(idx + 1), idx)
        h = hash2(np.floor(c / step).astype(int), 3) % 5
        ii = np.where((h == 0) & (np.mod(c, step) >= 0.55), clampi(idx - 1), ii)
        return None, ii
    return f


def end_batten(axis, step=2.5, ramp=None):
    def f(face, X, Y, Z, idx):
        c = Y if axis == 'y' else X
        ii = np.where(np.mod(c, step) < 0.5, 2, 3)
        return (None if ramp is None else np.full(X.shape, R(ramp))), ii
    return f


def end_clap(step=2.0, ramp=None):
    def f(face, X, Y, Z, idx):
        ii = np.where(np.mod(Z, step) < 0.55, 3, 2)
        return (None if ramp is None else np.full(X.shape, R(ramp))), ii
    return f


# ============================ the station depot ============================
STATION = dict(a=24.0, b=11.0, wall=18.0)     # half length (x), half depth (z), wall height above the deck (MU)
ST_BOARD = dict(u0=17.5, u1=37.5, z0=2.6, z1=16.0)   # schedule board on the front wall (u from the wall's left end)


def station():
    """The depot: board-and-batten walls on a plank plinth, red shingle roof, a ticket window, the schedule board
    on the front (+z, platform 1) wall and the RAILHEAD name board on the +x end. Footprint 12 x 5.5 u."""
    F = Frame('s')
    o = new_oid(True)
    A, B, Hh = STATION['a'], STATION['b'], STATION['wall']
    aw, bw = A - 1.0, B - 1.0                    # wall half sizes (the plinth sticks out 1 MU)
    zb = DECK
    # plinth (platform-height floor with a skirt of vertical boards)
    def plinth(lf, u, z, a, b, idx, lit):
        p = Paint('wood', u, z, idx, lit)
        if lf == 't':
            p.ii = np.where(np.mod(b, 2.0) < 0.5, clampi(idx + 1), idx)
        else:
            p.ii = np.where(np.mod(u, 1.5) < 0.4, clampi(idx + 1), clampi(idx + 1))
            p.ii = np.where(z > zb - 0.6, clampi(idx), p.ii)
        return p.rr, p.ii
    F.box(-A, -B, 0, A, B, zb, 'wood', paint=plinth, oid=o)

    def walls(lf, u, z, a, b, idx, lit):
        p = Paint('ochre', u, z - zb, idx, lit)
        zz = z - zb
        p.battens(2.5)
        # base board and the belt rail under the windows
        p.fill(zz < 1.4, 'red', clampi(idx))
        p.fill(np.abs(zz - 1.6) < 0.3, 'red', clampi(idx + 1))
        p.fill(zz > Hh - 1.0, 'red', clampi(idx))        # frieze under the eaves
        if lf == 'f':
            # double doors with a transom light
            p.door(3.0, 8.0, 12.0, ramp='red', trim='cream', double=True)
            p.window(3.4, 7.6, 12.8, 14.6, trim='cream', panes=(3, 1), sill=False)
            # ticket window: barred, with a little counter and a pitched hood
            p.window(10.4, 15.0, 5.0, 11.0, trim='cream', panes=(1, 1), sill=False)
            bars = rect(p.u, zz, 10.4, 15.0, 5.0, 11.0) & (np.mod(p.u - 10.4, 1.15) < 0.35)
            p.fill(bars, 'iron', 2)
            p.fill(rect(p.u, zz, 9.6, 15.8, 4.0, 5.0), 'wood', 0)        # counter
            p.fill(rect(p.u, zz, 10.0, 15.4, 11.6, 13.6), 'cream', 0)     # TICKETS plaque
            p.fill(rect(p.u, zz, 10.6, 14.8, 12.2, 13.0) & (np.mod(p.u, 1.0) < 0.55), 'red', 1)
            # the schedule board: dark green, wooden frame, cream header strip
            s = ST_BOARD
            p.board(s['u0'], s['u1'], s['z0'], s['z1'], 'green', 2, frame='wood', fi=3)
            p.fill(rect(p.u, zz, s['u0'], s['u1'], s['z1'] - 4.0, s['z1'] - 3.6), 'green', 2)
            # little hooks under the board, a notice pinned beside it
            p.fill(rect(p.u, zz, 39.4, 42.0, 7.0, 10.6), 'cream', 0)
            p.fill(rect(p.u, zz, 39.9, 41.5, 7.6, 10.0) & (np.mod(zz, 0.9) < 0.35), 'cream', 2)
            p.window(42.6, 45.4, 4.6, 11.6, trim='cream', panes=(1, 2))
        elif lf == 's':
            p.window(7.2, 12.6, 3.6, 9.6, trim='cream', panes=(2, 2))
            p.board(1.6, 18.6, 11.0, 16.6, 'cream', 1, frame='red', fi=1)
        return p.rr, p.ii
    F.box(-aw, -bw, zb, aw, bw, zb + Hh, 'ochre', paint=walls, oid=o, shades=(1, 1, 2))
    # roof: ridge along x, the gable end flush with the +x wall
    ze = zb + Hh - 0.4
    hw = bw + 2.6
    zr = ze + 8.5
    F.roof_across(-aw - 1.6, aw + 0.6, 0, hw, ze, zr, 'red', wall='ochre', oid=o, tex=shingle_tex(), shades=(1, 1),
                  endtex=end_batten('y', ramp='ochre'))
    # ridge cap
    F.box(-aw - 1.6, -0.5, zr - 0.4, aw + 0.6, 0.5, zr + 0.5, 'red', shades=(1, 2, 3), oid=o, cast=False)
    # chimney with a cap
    def brick(lf, u, z, a, b, idx, lit):
        ii = np.where(np.mod(z, 1.5) < 0.45, clampi(idx + 1), idx)
        return None, ii
    F.box(-aw + 6, -3.0, zr - 4, -aw + 8.4, -0.6, zr + 4.5, 'red', paint=brick, oid=o)
    F.box(-aw + 5.6, -3.4, zr + 4.5, -aw + 8.8, -0.2, zr + 5.3, 'iron', shades=(1, 2, 3), oid=o)
    # eave brackets on the front wall
    for a in (-aw + 1.2, -aw + 16.4, -aw + 39.6, aw - 1.2):
        F.box(a - 0.4, bw, ze - 2.6, a + 0.4, bw + 1.6, ze - 0.2, 'cream', shades=(0, 1, 2), oid=o)
    return o


def station_name():
    """RAILHEAD on the name board at the +x end (call after shading)."""
    F = Frame('s')
    s = 'RAILHEAD'
    bw = STATION['b'] - 1.0
    w = text_width(s) / 2.0       # MU along the face
    F.text('s', bw - 1.6 - (17.0 - w) / 2, DECK + 15.9, s, 'red', 2, plane=STATION['a'] - 1.0)


def station_board_rows():
    """Header lettering on the schedule board."""
    F = Frame('s')
    s = ST_BOARD
    aw = STATION['a'] - 1.0
    t = 'TRAINS'
    w = text_width(t) / 2.0
    F.text('f', -aw + (s['u0'] + s['u1']) / 2 - w / 2, DECK + s['z1'] - 0.9, t, 'cream', 0, plane=STATION['b'] - 1.0)


def station_board_area(ax, ay):
    """The schedule board's writing area (below the header) in sprite pixels, for the game's font."""
    s = ST_BOARD
    aw = STATION['a'] - 1.0; yf = STATION['b'] - 1.0
    def P(u, z):
        sx, sy = E.proj(-aw + u, yf, DECK + z)
        return [int(math.floor(sx - E.OX + ax)), int(math.floor(sy - E.OY + ay))]
    return dict(top_left=P(s['u0'] + 0.6, s['z1'] - 4.4), top_right=P(s['u1'] - 0.6, s['z1'] - 4.4),
                bottom_left=P(s['u0'] + 0.6, s['z0'] + 0.4),
                note='the green writing area under the TRAINS header, in sprite pixels from the frame top left; '
                     'rows step down 1 px for every 2 px to the right (the +z face); about 2 rows of the 7 px font')


# ============================ platform canopy ============================
CANOPY = dict(a=32.0, b=8.0, under=13.9)     # 16 x 4 u (proto-layout.json)


def canopy():
    """Platform 1's canopy: 14 x 4 u, two rows of posts, a shallow shingled roof with a sawtooth valance.
    Underside 2.6 u above the ground (people walk under it)."""
    F = Frame('s')
    o = new_oid(True)
    A, B, zu = CANOPY['a'], CANOPY['b'], CANOPY['under']
    zb = DECK
    posts = [-A + 2, -A / 2 + 1, 0.0, A / 2 - 1, A - 2]   # every 3.75 u
    for bp in (-B + 2.0, B - 2.0):
        for a in posts:
            F.box(a - 0.5, bp - 0.5, zb, a + 0.5, bp + 0.5, zu, 'cream', shades=(0, 1, 2), oid=o)
            F.box(a - 0.8, bp - 0.8, zb, a + 0.8, bp + 0.8, zb + 1.2, 'wood', shades=(1, 2, 3), oid=o)
            # brackets: little steps out along the beam
            for k, (dz, ext) in enumerate(((1.0, 0.9), (2.0, 1.8))):
                F.box(a - ext - 0.5, bp - 0.4, zu - dz - 0.6, a + ext + 0.5, bp + 0.4, zu - dz + 0.4, 'cream',
                      shades=(0, 1, 2), oid=o)
        # beam
        F.box(-A + 1, bp - 0.6, zu - 0.2, A - 1, bp + 0.6, zu + 1.0, 'wood', shades=(1, 2, 3), oid=o)
    # roof
    ze = zu + 1.0
    F.roof_across(-A, A, 0, B + 0.5, ze, ze + 4.5, 'roof', oid=o, tex=shingle_tex(), shades=(0, 1))
    F.box(-A, -0.5, ze + 4.1, A, 0.5, ze + 4.9, 'roof', shades=(1, 2, 3), oid=o, cast=False)
    # valance along the front edge and the end
    def val(lf, u, z, a, b, idx, lit):
        p = Paint('cream', u, z, idx, lit)
        tooth = (np.mod(u, 1.6) < 0.8) & (z < ze - 0.9)
        p.fill(tooth, 'red', 1 + lit)
        p.fill(z > ze - 0.5, 'red', lit)
        return p.rr, p.ii
    F.box(-A, B + 0.2, ze - 1.6, A, B + 0.7, ze + 0.1, 'cream', paint=val, oid=o, cast=False)
    F.box(A - 0.5, -B - 0.5, ze - 1.6, A, B + 0.7, ze + 0.1, 'cream', paint=val, oid=o, cast=False)
    return o


# ============================ the three shops ============================
# Each shop stands in a 9 x 8 u footprint (36 x 32 MU): the building at the back, a false front, and a 2 u
# boardwalk at the front under a short awning. 'z' facing: the front looks towards +z (the lit face);
# 'x' facing: the front looks towards +x (the shaded face). Local a: across the front, b: back (-16) to front (+16).
SHOP = {
    'store':  dict(wall='cream', trim='green', roof='roof', h=14.0, fh=27.0, sign='STORE', board=('cream', 0),
                   letters=('green', 2), awning='green', walltex='clap'),
    'smithy': dict(wall='wood', trim='wood', roof='roof', h=14.0, fh=25.0, sign='SMITHY', board=('cream', 1),
                   letters=('wood', 4), awning='wood', walltex='batten'),
    'saloon': dict(wall='wood', trim='cream', roof='wood', h=15.0, fh=30.0, sign='SALOON', board=('ochre', 0),
                   letters=('red', 1), awning='red', walltex='clap'),
}
SHOP_A, SHOP_B = 20.0, 16.0          # footprint half sizes (MU): 10 u across the front, 8 u deep
SHOP_FRONT = 7.0                     # b of the false front's back face
SIDE_PAINT = {'store': ('green', 2), 'smithy': ('cream', 1), 'saloon': ('cream', 0)}
AWN_B = 13.6                         # b of the awning's front edge
SHOP_DOOR_B = 12.0                   # b of the delivery spot (on the boardwalk, in front of the door)


def _shop_front_paint(kind):
    p_ = SHOP[kind]
    def paint(lf, u, z, a, b, idx, lit):
        p = Paint(p_['wall'], u, z, idx, lit)
        if lf != 'f':
            return p.rr, p.ii
        uraw = u
        u = u - 2.0          # the composition below is laid out on 32 MU; the front is 36 wide
        p.u = u
        if p_['walltex'] == 'batten':
            p.battens(2.5)
        else:
            p.clapboard()
        fh = p_['fh']; tr = p_['trim']
        if kind == 'store':
            p.door(14.0, 19.0, 11.5, ramp='green', trim=tr, double=True)
            p.window(14.5, 18.5, 12.2, 13.4, trim=tr, panes=(2, 1), sill=False)
            for w0 in (3.0, 21.0):
                p.window(w0, w0 + 8.6, 2.8, 10.4, trim=tr, panes=(3, 2), sill=True)
                # goods in the window: jars, a bolt of cloth, tins
                g = rect(u, z, w0 + 0.3, w0 + 8.3, 2.8, 5.8)
                col = np.floor((u - w0) / 1.4).astype(int) % 4
                hh = (z - 2.8) < np.array([2.6, 2.0, 2.9, 1.6])[col]
                rr_ = np.array([R('ochre'), R('red'), R('brass'), R('cream')])[col]
                p.rr = np.where(g & hh, rr_, p.rr)
                p.ii = np.where(g & hh, np.where(np.mod(u, 1.4) < 0.5, 0, 1 + lit), p.ii)
            # upper storey windows
            for w0 in (6.0, 23.0):
                p.window(w0, w0 + 3.6, 15.0, 18.2, trim=tr, panes=(2, 2), sill=True)
        elif kind == 'smithy':
            # open front: a wide dark opening with the forge glowing at the back
            op = rect(u, z, 5.0, 25.0, 0.0, 12.0)
            p.fill(rect(u, z, 4.2, 25.8, 0.0, 12.8) & ~op, 'wood', 3 + lit)
            p.fill(op, 'dark', 2)
            p.fill(op & (z < 1.0), 'dark', 1)
            fx = 10.0
            glow = op & (((u - fx) ** 2) / 9.0 + ((z - 3.0) ** 2) / 5.0 < 1)
            halo = op & ~glow & (((u - fx) ** 2) / 22.0 + ((z - 3.6) ** 2) / 12.0 < 1)
            p.fill(halo, 'fire', 2)
            p.fill(glow, 'fire', np.where(((u - fx) ** 2 + (z - 2.6) ** 2) < 2.0, 0, 1))
            # the forge hood above the fire, tools hanging on the back wall
            p.fill(rect(u, z, fx - 3.4, fx + 3.4, 6.4, 7.6), 'iron', 3)
            p.fill(rect(u, z, fx - 1.2, fx + 1.2, 7.6, 12.0), 'iron', 3)
            for tx in (16.5, 18.5, 20.5, 22.5):
                p.fill(rect(u, z, tx, tx + 0.5, 6.5, 10.0), 'iron', 2)
                p.fill(rect(u, z, tx - 0.4, tx + 0.9, 6.2, 7.0), 'iron', 1)
            # a post in the middle of the opening
            p.fill(rect(u, z, 14.6, 15.4, 0.0, 12.0), 'wood', 2 + lit)
            # small window high up
            p.window(26.6, 29.4, 6.0, 9.6, trim='wood', panes=(1, 2))
            # horseshoe over the opening
            hs = (np.abs(np.hypot(u - 15.0, z - 15.4) - 1.2) < 0.45) & (z > 14.8)
            p.fill(hs, 'iron', 1)
        elif kind == 'saloon':
            # swinging (batwing) doors in a tall doorway
            dw = rect(u, z, 13.6, 18.4, 0.0, 11.0)
            p.fill(rect(u, z, 13.0, 19.0, 0.0, 11.6) & ~dw, tr, 1 + lit)
            p.fill(dw, 'dark', 2)
            bw_ = dw & (z > 2.4) & (z < 7.4) & (np.abs(u - 16.0) > 0.25)
            p.fill(bw_, 'ochre', np.where(z > 6.8, 0, np.where(np.mod(u, 1.0) < 0.5, 1 + lit, 2 + lit)))
            p.fill(dw & (np.abs(z - 7.1) < 0.35) & (np.abs(u - 16.0) > 0.25), 'ochre', 0)
            # lit windows on both sides
            for w0 in (3.5, 22.0):
                p.window(w0, w0 + 6.5, 3.0, 9.8, trim=tr, panes=(2, 2), lit_glass=True)
            # upper windows (rooms) between the awning and the sign
            for w0 in (5.0, 14.2, 23.4):
                p.window(w0, w0 + 3.4, 15.6, 19.6, trim=tr, panes=(1, 2), sill=True, shutters='green')
        # cornice band and corner pilasters
        p.fill(z > fh - 1.4, tr, np.where(z > fh - 0.7, 0, 2))
        p.fill((uraw < 0.8) | (uraw > 35.2), tr, 1 + lit)
        return p.rr, p.ii
    return paint


def _side_paint(kind):
    p_ = SHOP[kind]
    def paint(lf, u, z, a, b, idx, lit):
        p = Paint(p_['wall'], u, z, idx, lit)
        if p_['walltex'] == 'batten':
            p.battens(2.5)
        else:
            p.clapboard()
        if lf == 's':
            # two windows on the side, placed by depth so both facings match
            for bc in (-9.0, 1.0):
                win = (np.abs(b - bc) < 1.7) & (z > 4.0) & (z < 9.0)
                fr = (np.abs(b - bc) < 2.3) & (z > 3.4) & (z < 9.6) & ~win
                p.fill(fr, p_['trim'], 1 + lit)
                p.fill(win, 'glass', np.where(z > 8.2, 2, 3))
                p.fill(win & (np.abs(b - bc) < 0.3), p_['trim'], 1 + lit)
        if lf == 'k':
            # back door and a window
            p.door(u.min() * 0 + 6.0, 10.0, 10.5, ramp='wood', trim=p_['trim'], panels=True)
            p.window(22.0, 26.0, 4.0, 9.0, trim=p_['trim'], panes=(2, 2))
        return p.rr, p.ii
    return paint


def shop_body(kind, facing='e'):
    """The shop building with its false front and sign (the sign's letters are added by shop_letters)."""
    p_ = SHOP[kind]
    F = Frame(facing)
    o = new_oid(True)
    h, fh = p_['h'], p_['fh']
    a0, a1 = -17.0, 17.0
    bk, bf = -15.0, SHOP_FRONT
    F.box(a0, bk, 0, a1, bf, h, p_['wall'], paint=_side_paint(kind), oid=o)
    rt = shingle_tex() if p_['roof'] == 'roof' else plank_roof_tex()
    F.roof_depth(bk - 1.0, bf, 0.0, 18.2, h - 0.4, h + 7.5, p_['roof'], oid=o, tex=rt, shades=(1, 2))
    if kind == 'smithy':
        def brick(lf, u, z, a, b, idx, lit):
            return None, np.where(np.mod(z, 1.5) < 0.45, clampi(idx + 1), idx)
        F.box(-11.0, -11.0, h, -8.0, -8.0, h + 12.0, 'red', paint=brick, oid=o)
        F.box(-11.4, -11.4, h + 12.0, -7.6, -7.6, h + 12.8, 'iron', oid=o)
    # false front
    fo = new_oid(True)
    F.box(-18.0, bf, 0, 18.0, bf + 1.2, fh, p_['wall'], paint=_shop_front_paint(kind), oid=fo)
    F.box(-18.8, bf - 0.4, fh, 18.8, bf + 1.8, fh + 1.0, p_['trim'], shades=(0, 1, 2), oid=fo)
    if kind == 'saloon':   # stepped parapet
        F.box(-6.0, bf, fh + 1.0, 6.0, bf + 1.2, fh + 3.6, p_['wall'], paint=_shop_front_paint(kind), oid=fo)
        F.box(-6.6, bf - 0.4, fh + 3.6, 6.6, bf + 1.8, fh + 4.4, p_['trim'], shades=(0, 1, 2), oid=fo)
    # sign board
    so = new_oid(True)
    bz0, bz1 = fh - 8.4, fh - 2.2
    F.box(-14.2, bf + 1.2, bz0 - 0.6, 14.2, bf + 1.5, bz1 + 0.6, p_['trim'], shades=(0, 1, 2), oid=so)
    F.box(-13.6, bf + 1.5, bz0, 13.6, bf + 1.8, bz1, p_['board'][0], shades=(p_['board'][1],) * 3, oid=so)
    return o


def shop_letters(kind, facing='e'):
    p_ = SHOP[kind]
    F = Frame(facing)
    s = p_['sign']
    w = text_width(s) / 2.0
    bz1 = p_['fh'] - 2.2
    li = p_['letters'][1]
    if facing != 'w':
        F.text('f', -w / 2.0, bz1 - 1.1, s, p_['letters'][0], li, plane=SHOP_FRONT + 1.8)
    else:
        # seen from behind: the name is painted large on the side wall instead (b runs right to left there)
        F.text('s', -4.0 + w / 2.0, p_['h'] - 2.0, s, *SIDE_PAINT[kind], plane=17.0)


def shop_walk(kind, facing='e'):
    """The boardwalk in front of the shop (flat, 1.5 MU high): drawn under people."""
    F = Frame(facing)
    def planks(lf, u, z, a, b, idx, lit):
        if lf == 't':
            ii = np.where(np.mod(a, 1.6) < 0.45, 2, np.where(hash2(np.floor(a / 1.6).astype(int), 1) % 5 == 0, 0, 1))
            return None, ii
        return None, np.where(np.mod(u, 3.0) < 0.6, 3, idx)
    F.box(-SHOP_A, SHOP_FRONT + 1.2, 0, SHOP_A, SHOP_B, 1.5, 'wood', paint=planks, oid=new_oid(False), cast=False)


def shop_anvil(facing='e'):
    """The smithy's anvil on its block, standing on the boardwalk left of the opening."""
    F = Frame(facing)
    o = new_oid(True)
    ax_, bx_ = -8.0, 11.0
    F.box(ax_ - 1.0, bx_ - 1.0, 1.5, ax_ + 1.0, bx_ + 1.0, 4.2, 'wood', oid=o)
    F.box(ax_ - 0.7, bx_ - 1.0, 4.2, ax_ + 0.7, bx_ + 1.0, 5.0, 'iron', shades=(1, 2, 3), oid=o)
    F.box(ax_ - 0.9, bx_ - 1.8, 5.0, ax_ + 0.9, bx_ + 1.6, 6.2, 'iron', shades=(0, 2, 3), oid=o)
    F.box(ax_ - 0.5, bx_ - 2.8, 5.5, ax_ + 0.5, bx_ - 1.8, 6.2, 'iron', shades=(0, 2, 3), oid=o)


def shop_awning(kind, facing='e'):
    """Posts and the awning over the boardwalk (sorted on its own: people pass under it)."""
    p_ = SHOP[kind]
    if kind == 'smithy':      # the smithy's front stays open so the forge shows
        return None
    F = Frame(facing)
    o = new_oid(True)
    zt = 13.6
    for a in (-19.2, 19.2):
        F.box(a - 0.5, AWN_B - 1.2, 1.5, a + 0.5, AWN_B - 0.2, zt, 'wood', shades=(1, 2, 3), oid=o)
    ramp = p_['awning']
    def awn(lf, u, z, a, b, idx, lit):
        if kind == 'saloon':
            stripe = np.mod(a, 2.4) < 1.2
            rr = np.where(stripe, R('red'), R('cream'))
            return rr, np.where(stripe, 1 + lit, 1 + lit) + 0 * idx
        return None, np.where(np.mod(a, 2.0) < 0.6, clampi(idx + 1), idx)
    F.box(-20.0, SHOP_FRONT + 1.8, zt, 20.0, AWN_B, zt + 0.8, ramp, paint=awn, oid=o)
    def val(lf, u, z, a, b, idx, lit):
        tooth = (np.mod(a, 1.6) < 0.8) & (z < zt - 0.4)
        return None, np.where(tooth, clampi(idx + 1), idx)
    F.box(-20.0, AWN_B - 0.4, zt - 1.2, 20.0, AWN_B, zt, ramp, paint=val, oid=o, cast=False)


def shop_all(kind, facing='e'):
    shop_walk(kind, facing); shop_body(kind, facing); shop_awning(kind, facing)
    if kind == 'smithy':
        shop_anvil(facing)


# ============================ storage shed (platform 2) ============================
STORAGE = dict(a=20.0, b=4.8, wall=13.0)      # 10 x 2.4 u, about 3 u high to the ridge
STORAGE_BAYS = (3.0, 15.0, 27.0)              # left edges (u) of the three freight doors, each 10 MU wide


def storage(open_=False):
    """The freight shed on platform 2: red board-and-batten, three sliding freight doors on the +z side (towards
    track 3) with cream cross braces. open_=True: the doors are slid aside and the bays show shelves of goods."""
    F = Frame('s')
    o = new_oid(True)
    A, B, Hh = STORAGE['a'], STORAGE['b'], STORAGE['wall']
    zb = DECK
    def walls(lf, u, z, a, b, idx, lit):
        p = Paint('red', u, z - zb, idx, lit)
        zz = z - zb
        p.battens(2.4)
        p.fill(zz < 0.8, 'wood', 3 + lit)
        if lf == 'f':
            for k, d0 in enumerate(STORAGE_BAYS):
                d1 = d0 + 10.0
                # the door track rail above the doors
                p.fill(rect(u, zz, d0 - 1.0, d1 + 1.0, 10.6, 11.4), 'iron', 2 + lit)
                if not open_:
                    dm = rect(u, zz, d0, d1, 0.4, 10.6)
                    fr = dm & ((u - d0 < 0.8) | (d1 - u < 0.8) | (zz < 1.2) | (zz > 9.8) | (np.abs(zz - 5.5) < 0.4) |
                               (np.abs((u - d0) / 10.0 - (zz - 0.4) / 10.2) < 0.06) |
                               (np.abs((u - d0) / 10.0 - (1 - (zz - 0.4) / 10.2)) < 0.06))
                    p.fill(dm, 'red', np.where(np.mod(u - d0, 2.0) < 0.5, 2 + lit, 1 + lit))
                    p.fill(fr, 'cream', 1 + lit)
                    p.fill(rect(u, zz, d0 + 4.6, d0 + 5.4, 4.6, 6.2), 'iron', 3)       # handle
                else:
                    op = rect(u, zz, d0, d1, 0.0, 10.6)
                    p.fill(op, 'dark', 2)
                    # shelves: three boards with goods on them
                    for sz in (0.0, 3.6, 7.2):
                        p.fill(op & (np.abs(zz - sz - 0.3) < 0.35), 'wood', 2)
                        cell = np.floor((u - d0) / 1.6).astype(int)
                        hh = hash2(cell + k * 7, int(sz * 10)) % 5
                        goods = op & (zz > sz + 0.6) & (zz < sz + 0.6 + np.where(hh < 2, 2.2, 1.6)) & (np.mod(u - d0, 1.6) > 0.3) & (hh != 4)
                        rr_ = np.where(hh == 0, R('wood'), np.where(hh == 1, R('cream'), np.where(hh == 2, R('ochre'), R('wood'))))
                        p.rr = np.where(goods, rr_, p.rr)
                        p.ii = np.where(goods, np.where(np.mod(u - d0, 1.6) < 0.7, 1, 2), p.ii)
                    p.fill(op & ((np.abs(u - d0 - 0.4) < 0.4) | (np.abs(u - d1 + 0.4) < 0.4)), 'wood', 3)
                    # the slid door, half over the wall to the right of the bay
            if open_:
                pass
            # a painted number over each bay
        elif lf == 's':
            p.window(3.0, 6.0, 5.0, 8.6, trim='cream', panes=(1, 2))
        return p.rr, p.ii
    F.box(-A, -B, 0, A, B, zb + Hh, 'red', paint=walls, oid=o)
    if open_:
        # doors slid to the right of each opening, standing just proud of the wall
        def door(lf, u, z, a, b, idx, lit):
            p = Paint('red', u, z - zb, idx, lit)
            zz = z - zb
            p.fill(np.mod(u, 2.0) < 0.5, 'red', 2 + lit)
            fr = (u < 0.8) | (u > 3.4) | (zz < 1.2) | (zz > 9.8)
            p.fill(fr, 'cream', 1 + lit)
            return p.rr, p.ii
        for d0 in STORAGE_BAYS:
            a0 = -A + d0 + 10.0
            F.box(a0, B, zb + 0.4, a0 + 4.2, B + 0.5, zb + 10.6, 'red', paint=door, oid=o)
    ze = zb + Hh - 0.4
    F.roof_across(-A - 1.2, A + 0.6, 0, B + 2.2, ze, ze + 4.0, 'roof', wall='red', oid=o, tex=shingle_tex(),
                  shades=(1, 2), endtex=end_batten('y', 2.4, ramp='red'))
    F.box(-A - 1.2, -0.4, ze + 3.6, A + 0.6, 0.4, ze + 4.4, 'roof', shades=(1, 2, 3), oid=o, cast=False)
    return o


def storage_numbers():
    F = Frame('s')
    for k, d0 in enumerate(STORAGE_BAYS):
        F.text('f', -STORAGE['a'] + d0 + 4.2, DECK + 13.0, str(k + 1), 'cream', 0, plane=STORAGE['b'])


def loading_edge(length=4):
    """Platform 2's loading edge facing track 3: a 1 u long piece of the deck edge with a heavy timber rubbing
    strip and iron bumper plates (x 0..length u, the deck's +z edge at z = 0)."""
    o = new_oid(False)
    L = length * U
    def edge(face, X, Y, Z, idx):
        ii = np.where(np.mod(X, 4.0) < 0.6, 3, idx)
        return None, ii
    box(0, -1.0, 0, L, 0, DECK, 'wood', tex=edge, oid=o, cast=False, faces='tl')
    box(0, 0, DECK - 1.2, L, 0.6, DECK + 0.2, 'wood', shades=(2, 3, 3), oid=o, cast=False)
    for x in np.arange(1.0, L, 4.0):
        box(x, 0.6, DECK - 1.1, x + 1.0, 0.8, DECK, 'iron', shades=(1, 1, 2), oid=o, cast=False)


# ============================ schedule board (standing) ============================
SCHED = dict(a=4.8, z0=0.9 * UY, z1=2.5 * UY)


def schedboard():
    """The schedule board on two posts, its face towards the viewer (+z): 2.4 u wide, face 1.6 u high from 0.9 u.
    The face is left dark green and blank: the game writes the rows on it in the pixel font."""
    o = new_oid(True)
    A = SCHED['a']; z0, z1 = SCHED['z0'], SCHED['z1']
    for x in (-A + 0.6, A - 1.4):
        box(x, -0.4, 0, x + 0.8, 0.4, z1 + 0.6, 'wood', shades=(1, 2, 3), oid=o)
    box(-A - 0.5, 0.4, z0 - 0.6, A + 0.5, 0.9, z1 + 0.6, 'wood', shades=(1, 2, 3), oid=o)
    box(-A, 0.9, z0, A, 1.1, z1, 'green', shades=(2, 2, 3), oid=o, cast=False)
    # little roof
    box(-A - 0.9, -0.4, z1 + 0.6, A + 0.9, 1.6, z1 + 1.4, 'red', shades=(1, 2, 3), oid=o)
    return o


def schedboard_area(ax, ay):
    A = SCHED['a']
    def P(x, z):
        sx, sy = E.proj(x, 1.1, z)
        return [int(math.floor(sx - E.OX + ax)), int(math.floor(sy - E.OY + ay))]
    return dict(top_left=P(-A + 0.4, SCHED['z1'] - 0.4), top_right=P(A - 0.4, SCHED['z1'] - 0.4),
                bottom_left=P(-A + 0.4, SCHED['z0'] + 0.4),
                note='the blank green face in sprite pixels; rows step down 1 px for every 2 px to the right')


# ============================ houses, church, water tower ============================
HOUSE = [
    dict(a=12.0, b=9.0, h=11.0, wall='cream', roof='red', trim='green', porch=True),
    dict(a=10.0, b=8.0, h=10.0, wall='ochre', roof='roof', trim='cream', porch=False),
    dict(a=11.0, b=8.0, h=10.0, wall='wood', roof='roof', trim='cream', porch=True),
]


def house(k, facing='s'):
    """A small clapboard house; its door side faces +z ('s') or +x ('e')."""
    p_ = HOUSE[k]
    F = Frame(facing)
    o = new_oid(True)
    A, B, h = p_['a'], p_['b'], p_['h']
    def walls(lf, u, z, a, b, idx, lit):
        p = Paint(p_['wall'], u, z, idx, lit)
        if p_['wall'] == 'wood':
            p.logs(1.8)
        else:
            p.clapboard()
        if lf == 'f':
            W = 2 * A
            p.door(W * 0.32 - 2.0, W * 0.32 + 2.0, 8.6, ramp='wood', trim=p_['trim'])
            p.window(W * 0.68 - 2.2, W * 0.68 + 2.2, 3.6, 7.8, trim=p_['trim'], panes=(2, 2),
                     shutters='green' if k == 0 else None)
        elif lf == 's':
            c = B
            win = (np.abs(b) < 1.8) & (z > 3.6) & (z < 7.8)
            p.fill((np.abs(b) < 2.4) & (z > 3.0) & (z < 8.4) & ~win, p_['trim'], 1 + lit)
            p.fill(win, 'glass', np.where(z > 7.0, 2, 3))
            p.fill(win & ((np.abs(b) < 0.3) | (np.abs(z - 5.7) < 0.3)), p_['trim'], 1 + lit)
        return p.rr, p.ii
    F.box(-A, -B, 0, A, B, h, p_['wall'], paint=walls, oid=o)
    hw = B + 1.6
    endt = end_clap(ramp=p_['wall']) if p_['wall'] != 'wood' else end_batten('y' if facing == 's' else 'x', 2.0, ramp='wood')
    F.roof_across(-A - 1.2, A + 0.6, 0, hw, h - 0.4, h + hw * 0.85, p_['roof'], wall=p_['wall'], oid=o,
                  tex=shingle_tex(), shades=(1, 2), endtex=endt)
    def brick(lf, u, z, a, b, idx, lit):
        return None, np.where(np.mod(z, 1.5) < 0.45, clampi(idx + 1), idx)
    F.box(A - 6.0, -3.6, h + 2, A - 4.0, -1.6, h + hw * 0.85 + 2.0, 'red', paint=brick, oid=o)
    if p_['porch']:
        F.box(-0.36 * A - 3.5, B, 0, -0.36 * A + 3.5, B + 3.5, 1.2, 'wood', oid=o,
              paint=lambda lf, u, z, a, b, idx, lit: (None, np.where(np.mod(a, 1.6) < 0.45, clampi(idx + 1), idx)))
    return o


def church():
    """A white clapboard church with a steeple at its front (+z)."""
    import shapes as S
    S.church(0, -14, 9)


def water_tower():
    import shapes as S
    S.water_tower(0, 0)


# ============================ trees and plants ============================
def tree_cottonwood(s=1.0, seed=5):
    o = new_oid(True)
    box(-0.7, -0.7, 0, 0.7, 0.7, 8 * s, 'wood', shades=(1, 2, 3), oid=o)
    box(-0.4, -1.8, 5 * s, 0.4, -0.6, 6 * s, 'wood', shades=(1, 2, 3), oid=o)
    rnd = np.random.RandomState(seed)
    blobs = [(0, 0, 11 * s, 5.4 * s)]
    for k in range(5):
        a = rnd.uniform(0, 6.28)
        blobs.append((math.cos(a) * 3.0 * s, math.sin(a) * 3.0 * s, (10 + rnd.uniform(-1.5, 3)) * s, (3.4 + rnd.uniform(0, 1)) * s))
    blobs.append((-0.8 * s, 0.8 * s, 15.5 * s, 3.4 * s))
    for (dx, dy, z, r) in blobs:
        sphere(dx, dy, z, r, 'leaf', oid=o, th=(0.85, 0.45, -0.05), noise=0.35, seed=seed * 7 + int(z))
    return o


def tree_pine(s=1.0, seed=3):
    """A dark pine: three stepped tiers, each a stack of thin discs narrowing upwards."""
    o = new_oid(True)
    box(-0.6, -0.6, 0, 0.6, 0.6, 5 * s, 'wood', shades=(1, 2, 3), oid=o)
    rnd = np.random.RandomState(seed)
    def needles(face, X, Y, Z, idx):
        h = hash2(np.floor(X * 1.5).astype(int) + seed, np.floor((Y + Z) * 1.5).astype(int)) % 7
        ii = np.where(h == 0, clampi(idx + 1, 1, 4), np.where(h == 3, clampi(idx - 1, 1, 4), idx))
        ii = np.clip(ii + 1, 2, 4)
        return np.full(X.shape, R('leaf')), ii
    for (z0, r0, hh) in ((3.0, 5.2, 8.0), (8.0, 4.0, 7.0), (12.5, 2.8, 6.5)):
        n = int(hh / 0.8)
        for k in range(n):
            r = r0 * (1 - k / n) + 0.4
            z = (z0 + k * 0.8) * s
            cyl_z(0, 0, z, z + 0.8 * s, r * s, 'leaf', oid=o, tex=needles, th=(0.5, 0.2, -0.2))
    return o


def tree_young(seed=11):
    """A young tree / big bush: a short trunk and one lumpy crown."""
    o = new_oid(True)
    box(-0.5, -0.5, 0, 0.5, 0.5, 4, 'wood', shades=(1, 2, 3), oid=o)
    sphere(0, 0, 6.0, 3.4, 'leaf', oid=o, th=(0.85, 0.45, -0.05), noise=0.4, seed=seed)
    sphere(1.4, -0.8, 7.6, 2.2, 'leaf', oid=o, th=(0.85, 0.45, -0.05), noise=0.4, seed=seed + 3)
    sphere(-1.2, 1.0, 5.0, 2.2, 'leaf', oid=o, th=(0.85, 0.45, -0.05), noise=0.4, seed=seed + 5)
    return o


# ============================ props ============================
def lamp_post(lit=False):
    o = new_oid(True)
    box(-0.9, -0.9, 0, 0.9, 0.9, 1.2, 'iron', shades=(1, 2, 3), oid=o)
    box(-0.45, -0.45, 0, 0.45, 0.45, 11, 'iron', shades=(1, 2, 3), oid=o)
    box(-1.3, -1.3, 11, 1.3, 1.3, 11.6, 'iron', shades=(1, 2, 3), oid=o)
    g = 'fire' if lit else 'glass'
    box(-1.1, -1.1, 11.6, 1.1, 1.1, 14.2, g, shades=(0, 1, 2) if not lit else (0, 0, 1), oid=o,
        tex=lambda f, X, Y, Z, i: (np.where((X if f == 'l' else Y) ** 2 < 0.12, R('iron'), R(g)), i))
    box(-1.5, -1.5, 14.2, 1.5, 1.5, 14.8, 'iron', shades=(1, 3, 3), oid=o)
    box(-0.7, -0.7, 14.8, 0.7, 0.7, 15.6, 'iron', shades=(1, 3, 3), oid=o)
    return o


def barrel(r=1.2, h=4.27, ramp='wood', oid=None, x=0.0, y=0.0, z=0.0):
    o = oid or new_oid(True)
    def hoops(face, X, Y, Z, idx):
        zz = Z - z
        hp = (np.abs(zz - h * 0.2) < 0.35) | (np.abs(zz - h * 0.8) < 0.35)
        rr = np.where(hp, R('iron'), R(ramp))
        ii = np.where(hp, np.minimum(idx + 1, 3), idx)
        ang = np.arctan2(Y - y, X - x)
        ii = np.where(~hp & (np.mod(ang * 5, 1.0) < 0.18), np.minimum(ii + 1, 4), ii)
        if face == 't':
            rr = np.full(X.shape, R(ramp)); ii = np.where(((X - x) ** 2 + (Y - y) ** 2) > (r - 0.6) ** 2, 2, 3)
        return rr, ii
    cyl_z(x, y, z, z + h, r, ramp, oid=o, tex=hoops)
    return o


def water_barrel():
    o = barrel(r=1.7, h=3.8)
    cyl_z(0, 0, 3.8, 4.1, 1.8, 'wood', oid=o, topidx=1)
    box(-0.3, 1.0, 3.9, 0.3, 1.6, 4.4, 'iron', shades=(1, 2, 3), oid=o)     # dipper handle
    return o


def crate_box(x, y, z, sx=2.8, sy=2.8, sz=3.2, ramp='wood', oid=None):
    o = oid or new_oid(True)
    def ct(face, X, Y, Z, idx):
        if face == 't':
            return None, np.where(np.mod(X - x, 1.4) < 0.4, np.minimum(idx + 1, 4), idx)
        if face == 'l':
            c = X - x; w = sx
        else:
            c = Y - y; w = sy
        e = (c < 0.5) | (c > w - 0.5) | ((Z - z) < 0.5) | ((Z - z) > sz - 0.5)
        ii = np.where(e, idx - 1, idx)
        dg = np.abs(c / w - (Z - z) / sz) < 0.12
        ii = np.where(dg & ~e, idx - 1, ii)
        return None, ii
    box(x, y, z, x + sx, y + sy, z + sz, ramp, shades=(1, 2, 3), tex=ct, oid=o)
    return o


def sack_shape(x, y, z, ramp='cream', oid=None, band=None):
    o = oid or new_oid(True)
    sphere(x, y, z + 1.1, 1.35, ramp, oid=o, sz=0.8, th=(0.85, 0.45, -0.15))
    sphere(x + 0.2, y + 0.2, z + 2.2, 0.55, ramp, oid=o, cast=False)
    cyl_z(x + 0.2, y + 0.2, z + 1.85, z + 2.1, 0.5, band or 'wood', oid=o, cast=False, th=(0.3, 0.0, -0.3))
    return o


def crate_stack():
    o = new_oid(True)
    crate_box(-3.0, -3.0, 0, oid=o)
    crate_box(0.0, -3.0, 0, ramp='ochre', oid=o)
    crate_box(-3.0, 0.0, 0, sz=2.6, oid=o)
    crate_box(-2.4, -2.6, 3.2, sx=2.6, sy=2.6, sz=2.8, oid=o)
    return o


def sack_pile():
    o = new_oid(True)
    for (x, y, z) in ((-1.4, -1.0, 0), (1.3, -1.2, 0), (-1.0, 1.4, 0), (1.4, 1.2, 0), (0.0, 0.0, 1.8)):
        sack_shape(x, y, z, oid=o)
    return o


def barrel_group():
    o = new_oid(True)
    barrel(x=-1.4, y=-1.2, oid=o)
    barrel(x=1.4, y=-1.0, oid=o, ramp='ochre')
    barrel(x=0.0, y=1.4, oid=o, h=3.6)
    return o


def fence(axis='x'):
    """One unit of split-rail fence (x 0..1 or z 0..1) with its post at the start."""
    o = new_oid(True)
    box(-0.4, -0.4, 0, 0.4, 0.4, 3.8, 'wood', shades=(1, 2, 3), oid=o)
    for z in (1.4, 2.9):
        if axis == 'x':
            box(0, -0.25, z, U, 0.25, z + 0.5, 'wood', shades=(0, 2, 3), oid=o)
        else:
            box(-0.25, 0, z, 0.25, U, z + 0.5, 'wood', shades=(0, 2, 3), oid=o)
    return o


def hitching_rail(axis='x'):
    """A hitching rail, 2 u long, centred on its anchor."""
    o = new_oid(True)
    for p in (-3.4, 3.4):
        x, y = (p, 0) if axis == 'x' else (0, p)
        box(x - 0.45, y - 0.45, 0, x + 0.45, y + 0.45, 4.6, 'wood', shades=(1, 2, 3), oid=o)
    if axis == 'x':
        box(-4.0, -0.3, 4.0, 4.0, 0.3, 4.7, 'wood', shades=(0, 2, 3), oid=o)
    else:
        box(-0.3, -4.0, 4.0, 0.3, 4.0, 4.7, 'wood', shades=(0, 2, 3), oid=o)
    return o


def bench(axis='x'):
    """A platform bench, 1.5 u long, seat facing +z ('x') or +x ('z')."""
    o = new_oid(True)
    F = Frame('s' if axis == 'x' else 'e')
    for a in (-2.6, 2.6):
        F.box(a - 0.3, -0.8, 0, a + 0.3, 0.8, 2.2, 'wood', shades=(1, 2, 3), oid=o)
        F.box(a - 0.3, -0.9, 2.2, a + 0.3, -0.5, 4.6, 'wood', shades=(1, 2, 3), oid=o)
    F.box(-3.0, -0.8, 2.2, 3.0, 0.9, 2.7, 'wood', shades=(0, 2, 3), oid=o)
    F.box(-3.0, -0.9, 3.6, 3.0, -0.5, 4.4, 'wood', shades=(0, 2, 3), oid=o)
    return o


def shelf():
    """A freestanding storage shelf (2 u long, against a wall at -z) with goods on it."""
    o = new_oid(True)
    for x in (-3.8, 3.4):
        box(x, -1.2, 0, x + 0.4, 0.8, 9.0, 'wood', shades=(1, 2, 3), oid=o)
    for z in (0.6, 4.4, 8.2):
        box(-3.8, -1.2, z, 3.8, 0.8, z + 0.5, 'wood', shades=(1, 2, 3), oid=o)
    crate_box(-3.2, -1.0, 1.1, 2.0, 1.6, 2.0, oid=o)
    sack_shape(0.4, -0.2, 1.1, oid=o)
    crate_box(-3.2, -1.0, 4.9, 2.0, 1.6, 1.8, ramp='ochre', oid=o)
    barrel(r=0.8, h=2.6, x=1.6, y=-0.2, z=4.9, oid=o)
    return o


# ============================ goods and tags ============================
# Sizes from the contract (u): crate 0.7 x 0.7 x 0.6, sack 0.7 x 0.5 x 0.4, barrel 0.6 across and 0.8 high.
GOODS_TOP = {   # (x, z, y) in MU of the spot where the shop tag goes: the top front edge of the item
    'crate': (0.0, 1.4, 3.2), 'sack': (0.0, 1.0, 2.0), 'barrel': (0.0, 1.2, 4.27), 'keg': (0.0, 1.0, 3.0),
    'bale': (0.0, 1.2, 2.6), 'mailSack': (0.0, 1.0, 2.0), 'longBundle': (0.0, 0.8, 1.6),
}


def goods(kind):
    if kind == 'crate':
        return crate_box(-1.4, -1.4, 0, 2.8, 2.8, 3.2)
    if kind == 'sack':
        o = new_oid(True)
        sphere(0, 0, 1.0, 1.4, 'cream', oid=o, sz=0.7, th=(0.85, 0.45, -0.15))
        sphere(0.9, 0.0, 1.0, 0.9, 'cream', oid=o, sz=0.7, th=(0.85, 0.45, -0.15))
        sphere(-1.0, 0.0, 0.9, 0.7, 'cream', oid=o, sz=0.7, cast=False)
        box(-1.8, -0.3, 0.6, -1.4, 0.3, 1.3, 'wood', shades=(1, 2, 3), oid=o, cast=False)     # tied neck
        return o
    if kind == 'barrel':
        return barrel(r=1.2, h=4.27)
    if kind == 'keg':
        return barrel(r=1.0, h=3.0, ramp='ochre')
    if kind == 'bale':
        o = new_oid(True)
        def hay(face, X, Y, Z, idx):
            h = hash2(np.floor(X * 2).astype(int), np.floor((Y + Z) * 2).astype(int)) % 5
            ii = np.where(h == 0, clampi(idx - 1), idx)
            tie = (np.abs(X + 0.9) < 0.25) | (np.abs(X - 0.9) < 0.25)
            rr = np.where(tie, R('wood'), R('ochre'))
            return rr, np.where(tie, 3, ii)
        box(-1.8, -1.2, 0, 1.8, 1.2, 2.6, 'ochre', shades=(0, 1, 2), tex=hay, oid=o)
        return o
    if kind == 'mailSack':
        o = new_oid(True)
        sphere(0, 0, 1.0, 1.4, 'cream', oid=o, sz=0.7, th=(0.85, 0.45, -0.15))
        sphere(0.9, 0.0, 1.0, 0.9, 'cream', oid=o, sz=0.7, th=(0.85, 0.45, -0.15))
        cyl_z(0.2, 0.0, 0.9, 1.4, 1.42, 'navy', oid=o, cast=False, th=(0.3, 0.0, -0.3))      # blue band: mail
        box(-1.8, -0.3, 0.6, -1.4, 0.3, 1.3, 'wood', shades=(1, 2, 3), oid=o, cast=False)
        return o
    if kind == 'longBundle':
        o = new_oid(True)
        for k, (y, z) in enumerate(((-0.6, 0), (0.6, 0), (0.0, 0.9))):
            box(-3.4, y - 0.55, z, 3.4, y + 0.55, z + 0.8, 'wood', shades=(1, 2, 3), oid=o)
        for x in (-2.2, 2.2):
            box(x - 0.25, -1.25, -0.05, x + 0.25, 1.25, 1.75, 'iron', shades=(1, 2, 3), oid=o)
        return o
    raise KeyError(kind)


TAG_PIX = {   # 5 x 5 px marks, drawn on the item's top front by the game
    'store':  ['.###.', '#ooo#', '#o.o#', '#ooo#', '.###.'],
    'smithy': ['#####', '#ooo#', '.#o#.', '.#o#.', '.###.'],
    'saloon': ['.###.', '#ooo#', '#ooo#', '.#o#.', '.###.'],
    'out':    ['..#..', '.#o#.', '#ooo#', '.#o#.', '..#..'],
    'any':    ['#####', '#ooo#', '#ooo#', '#ooo#', '#####'],
}
TAG_COL = {'store': ('green', 1), 'smithy': ('navy', 0), 'saloon': ('red', 1), 'out': ('ochre', 0), 'any': ('cream', 0)}


def tag_sprite(kind):
    """A small shop mark: a coloured shape (store: square-ish label, smithy: horseshoe-like shield, saloon: a
    glass, out: a diamond, any: a plain square). Anchor at its centre."""
    rn, ii = TAG_COL[kind]
    rows = TAG_PIX[kind]
    img = np.zeros((5, 5, 4), np.uint8)
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch == '#':
                img[r, c, :3] = E.PAL[R(rn), E.RLEN[R(rn)] - 1]; img[r, c, 3] = 255
            elif ch == 'o':
                img[r, c, :3] = E.PAL[R(rn), ii]; img[r, c, 3] = 255
    return img, (2, 2)


# ============================ the handcart ============================
CART_SLOTS = [(-1.0, 2.1), (1.0, 2.1), (-1.0, 0.0), (1.0, 0.0), (-1.0, -2.1), (1.0, -2.1)]   # (a, b) in MU
CART_BED = 3.2


def handcart(facing='e', load=False):
    """A two-wheeled station handcart, 1.6 x 1.0 u, 0.8 u high to the rails of its tray. facing: the way it
    rolls ('e' +x, 's' +z, 'w' -x, 'n' -z); the handles trail behind it, where the agent pushes."""
    F = Frame(facing)
    o = new_oid(True)
    def bed(lf, u, z, a, b, idx, lit):
        if lf == 't':
            return None, np.where(np.mod(a, 1.3) < 0.4, clampi(idx + 1), idx)
        return None, np.where(np.mod(z, 1.2) < 0.4, clampi(idx + 1), idx)
    F.box(-2.0, -3.2, 2.4, 2.0, 3.2, CART_BED, 'wood', paint=bed, oid=o)
    # tray rails on all four sides
    F.box(-2.0, -3.2, CART_BED, -1.5, 3.2, 4.4, 'wood', paint=bed, oid=o)
    F.box(1.5, -3.2, CART_BED, 2.0, 3.2, 4.4, 'wood', paint=bed, oid=o)
    F.box(-2.0, 2.7, CART_BED, 2.0, 3.2, 4.4, 'wood', paint=bed, oid=o)
    F.box(-2.0, -3.2, CART_BED, 2.0, -2.7, 4.4, 'wood', paint=bed, oid=o)
    # iron corner straps
    for a in (-2.0, 1.5):
        for b in (-3.2, 2.7):
            F.box(a, b, CART_BED, a + 0.5, b + 0.5, 4.4, 'iron', shades=(1, 2, 3), oid=o)
    # handles trail behind
    for a in (-1.4, 1.4):
        F.box(a - 0.3, -7.6, 3.6, a + 0.3, -3.2, 4.2, 'wood', shades=(0, 2, 3), oid=o)
    F.box(-1.7, -7.6, 3.6, 1.7, -7.0, 4.2, 'wood', shades=(0, 2, 3), oid=o)
    # front prop leg
    F.box(-0.3, 2.4, 0, 0.3, 3.0, 2.4, 'wood', shades=(1, 2, 3), oid=o)
    # axle and wheels (spoked, iron tyre)
    for a in (-2.4, 2.4):
        X, Y = F.w(a, 0.0)
        if facing in ('e', 'w'):
            disc_y(X, 1.9, 1.9, Y + (0.3 if Y > 0 else -0.3), 'wood', kind='wheel', oid=o, spokes=6)
        else:
            disc_x(Y, 1.9, 1.9, X + (0.3 if X > 0 else -0.3), 'wood', oid=o, spokes=6)
    if load:
        ox_, oy_ = 0, 0
        for k, (a, b) in enumerate(CART_SLOTS):
            X, Y = F.w(a, b)
            if k in (0, 3):
                crate_box(X - 0.9, Y - 0.9, CART_BED, 1.8, 1.8, 1.8, oid=o, ramp='wood' if k == 0 else 'ochre')
            elif k in (1, 4):
                sack_shape(X, Y, CART_BED - 0.3, oid=o)
            else:
                barrel(r=0.8, h=2.4, x=X, y=Y, z=CART_BED, oid=o)
    return o


def cart_slots(facing):
    """The six load slots of the cart as pixel offsets from the cart's anchor (dx, dy), back row first, for the
    game to draw goods at: front left, front right, middle left, middle right, back left, back right."""
    F = Frame(facing)
    out = []
    for a, b in CART_SLOTS:
        X, Y = F.w(a, b)
        out.append([round(2 * (X - Y)), round(X + Y - 1.5 * CART_BED)])
    return out


# ============================ hand-drawn pixel props ============================
PIXC = {
    'k': ('dark', 3),
    'g': ('grass', 0), 'G': ('grass', 1), 'h': ('grass', 2), 'H': ('grass', 3),
    'y': ('brass', 0), 'w': ('cream', 0), 'p': ('plum', 0), 'r': ('red', 0),
    'b': ('wood', 1), 'B': ('wood', 2), 'n': ('wood', 3), 'N': ('wood', 4),
    'c': ('cream', 1), 'i': ('iron', 3), 'I': ('iron', 4), 'm': ('wood', 0),
}


def pixmap(rows, ax=None, ay=None, outline=False):
    h = len(rows); w = max(len(r) for r in rows)
    pad = 1 if outline else 0
    img = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.uint8)
    cells = {}
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch in '. ':
                continue
            cells[(r + pad, c + pad)] = PIXC[ch]
    if outline:
        for (r, c), (rn, ii) in list(cells.items()):
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (r + dr, c + dc)
                if q not in cells:
                    cells[q] = ('dark', 3)
    for (r, c), (rn, ii) in cells.items():
        img[r, c, :3] = E.PAL[R(rn), min(ii, E.RLEN[R(rn)] - 1)]; img[r, c, 3] = 255
    ax = (w // 2 + pad) if ax is None else ax + pad
    ay = (h + pad) if ay is None else ay + pad
    return img, (ax, ay)


TUFTS = [
    ['..G...', '.gG.G.', 'GhGgh.', 'hHhGH.'],
    ['.g.G..G', 'GGhgGhg', 'hHGhHHh'],
    ['..w.y..', '.wGyG..', 'GhGhGg.', 'HhHhH..'],
    ['.p..', 'pGp.', 'GhG.', 'H.H.'],
]

HORSE = [   # a bay horse standing along the x axis, facing the viewer's right (se), 20 x 15 px
    '..............NN....',
    '.............NBBn...',
    '............NBbBBn..',
    '...........NBbBnBBN.',
    '..........NBBn.NBBBk',
    '..nNNNNNNNBBn...NBN.',
    '.nBbbbbbbbBBn.......',
    'NBbmbbbbbbbbBn......',
    'NBbbbbbbbbbbBn......',
    'NnBBBBBBBBBBBn......',
    'N.nBn.nn.nBn.Bn.....',
    'N.nB..nB..nB..Bn....',
    '..nB..nB..nB..nB....',
    '..nB..nB..nB..nB....',
    '..kk..kk..kk..kk....',
]


# ============================ platforms, walkway, ground ============================
def plank_tex(variant=0, lipz=DECK, step=2.0):
    """Deck planks running along x (rows across z), staggered joints, a lit lip on the +z edge and darker
    posts on the +x end."""
    def f(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            row = np.floor(Y / step).astype(int)
            fy = Y - row * step
            seg = np.floor((X + hash2(row, 5 + variant) % 13) / 13.0).astype(int)
            fx = np.mod(X + hash2(row, 5 + variant) % 13, 13.0)
            hh = hash2(row * 3 + variant, seg) % 9
            ii = np.where(hh == 0, 0, np.where(hh == 3, 2, 1))
            ii = np.where(fy < 0.5, 2, ii)
            ii = np.where(fx < 0.45, 2, ii)
            nail = (np.abs(fx - 1.0) < 0.3) & (np.abs(fy - 1.2) < 0.3)
            ii = np.where(nail, 3, ii)
            return rr, ii
        if face == 'l':
            ii = np.where(Z > lipz - 0.8, 1, 2)
            ii = np.where(np.mod(X, 8.0) < 0.9, 3, ii)
            return rr, ii
        ii = np.where(Z > lipz - 0.8, 2, 3)
        return rr, np.where(np.mod(Y, 8.0) < 0.9, 4, ii)
    return f


def deck(x0, x1, y0, y1, variant=0, oid=None, faces='tlr'):
    """A platform deck in world MU (top at DECK)."""
    box(x0, y0, 0, x1, y1, DECK, 'wood', tex=plank_tex(variant), oid=oid or new_oid(False), cast=False, faces=faces)


def deck_ramp(x0, y0, y1, direction=1, length=4.0, oid=None):
    """A ramp sloping down from the deck at x0 to the ground over `length` MU in +x (direction 1) or -x."""
    o = oid or new_oid(False)
    n = 4
    for k in range(n):
        top = DECK * (1 - (k + 0.5) / n)
        a = x0 + direction * length * k / n
        b = x0 + direction * length * (k + 1) / n
        xa, xb = min(a, b), max(a, b)
        box(xa, y0, 0, xb, y1, top, 'wood', tex=plank_tex(k), oid=o, cast=False, faces='tlr')
    # cleats across the ramp
    return o


def platform_tile(edges='', variant=0):
    """A 1 x 1 u platform tile covering x 0..1, z 0..1 (deck top 3 px). edges: 's' the near (+z) lip,
    'e' the +x end face."""
    faces = 't' + ('l' if 's' in edges else '') + ('r' if 'e' in edges else '')
    E.CLIP[0] = (0, U)
    deck(0, U, 0, U, variant, faces=faces)
    E.CLIP[0] = None


def platform_ramp(direction='e'):
    """The end of a platform: a ramp down to the ground over one tile (x 0..1, z 0..1), going down towards
    +x ('e') or -x ('w')."""
    if direction == 'e':
        deck_ramp(0, 0, U, 1, U)
    else:
        deck_ramp(U, 0, U, -1, U)


def walkway_track():
    """Plank crossing over one track: x 0..1 u, across the whole ballast, flush with the rail heads."""
    from track import _ballast_x, _rail_x, BALLAST, GAUGE
    from shapes import RAIL
    E.CLIP[0] = (0, U)
    _ballast_x(-1, U + 1, 0)
    def planks(face, X, Y, Z, idx):
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            ii = np.where(np.mod(X, 1.0) < 0.3, 2, np.where(hash2(np.floor(X).astype(int), 3) % 3 == 0, 0, 1))
            return rr, ii
        return rr, np.full(X.shape, 3)
    o = new_oid(False)
    for (a, b) in ((-BALLAST + 0.5, -GAUGE - 0.6), (-GAUGE + 0.6, GAUGE - 0.6), (GAUGE + 0.6, BALLAST - 0.5)):
        box(0, a, 0.7, U, b, RAIL - 0.15, 'wood', tex=planks, oid=o, cast=False, faces='tl')
    ro = new_oid(False)
    for yr in (-GAUGE, GAUGE):
        _rail_x(-1, U + 1, yr, ro)
    E.CLIP[0] = None


def walk_planks(x0, x1, y0, y1, z=1.0, along='z'):
    """A plank path (boards across the direction of travel) in world MU."""
    def planks(face, X, Y, Z, idx):
        c = Y if along == 'z' else X
        rr = np.full(X.shape, R('wood'))
        if face == 't':
            ii = np.where(np.mod(c, 1.2) < 0.35, 2, np.where(hash2(np.floor(c / 1.2).astype(int), 5) % 4 == 0, 0, 1))
            return rr, ii
        return rr, np.where(np.mod(c, 1.2) < 0.35, 3, 2 if face == 'l' else 3)
    box(x0, y0, 0, x1, y1, z, 'wood', tex=planks, oid=new_oid(False), cast=False, faces='tlr')


def walkway_ground():
    """Plank path on the ground: a 1 x 1 u tile (x 0..1, z 0..1), boards across z."""
    walk_planks(0.2, U - 0.2, 0, U, 1.0, along='z')


# ---------------------------- ground textures (world MU) ----------------------------
def grass_at(X, Y, P=None):
    """Grass with a soft light/dark pattern and Bayer dither, sparse dark blades and light flecks. With P, every
    term repeats every P MU so tiles join without seams."""
    if P:
        a = 2 * np.pi / P
        lf = np.sin(X * a + 1.7) + 0.8 * np.sin(Y * a + 1.3) + 0.45 * np.sin((X - Y) * a + 2.1)
        lf = lf / 2.0
        Xi = np.mod(X, P); Yi = np.mod(Y, P)
    else:
        lf = np.sin(X * 0.11 + Y * 0.05) + 0.8 * np.sin(Y * 0.17 - X * 0.07 + 1.3) + 0.5 * np.sin((X + Y) * 0.31)
        lf = lf / 2.3
        Xi, Yi = X, Y
    bay = E.BAYER[np.floor(X + Y).astype(int) % 4, np.floor(2 * (X - Y)).astype(int) % 4]
    v = lf * 0.6 + (bay - 0.5) * 0.9
    i = np.where(v > 0.55, 0, np.where(v > -0.35, 1, 2))
    h = hash2(np.floor(Xi * 2).astype(int), np.floor(Yi * 2).astype(int)) % 97
    i = np.where(h == 3, 3, i); i = np.where((h == 7) & (i > 0), i - 1, i)
    return np.full(X.shape, R('grass')), i


def dirt_at(X, Y, ruts=()):
    hd = hash2(np.floor(X * 2).astype(int) + 5, np.floor(Y * 2).astype(int)) % 100
    di = np.where(hd < 12, 0, 1)
    for (axis, c, w) in ruts:
        q = X if axis == 'x' else Y
        di = np.where(np.abs(q - c) < w, 2, di)
    di = np.where(hd > 95, 2, di)
    return np.full(X.shape, R('dirt')), di


def gravel_at(X, Y):
    h = hash2(np.floor(X * 2).astype(int), np.floor(Y * 2).astype(int)) % 6
    rr = np.where(h < 2, R('iron'), R('dirt'))
    ii = np.where(h < 2, 1, np.where(h < 4, 1, 0))
    return rr, np.where(h == 5, 2, ii)


def _flat(x0, x1, y0, y1, fn, z=0.0):
    """A flat ground piece in world MU coloured by fn(X, Y) -> (ramp ids, indices)."""
    def tex(face, X, Y, Z, idx):
        return fn(X, Y)
    box(x0, y0, z - 1, x1, y1, z, 'grass', tex=tex, oid=new_oid(False), cast=False, faces='t')


def grass_tile(variant=0, size=8):
    """size x size u of grass (x 0..size, z 0..size); every variant joins every other without seams."""
    P = size * U
    _flat(0, P, 0, P, lambda X, Y: _grass_variant(X, Y, P, variant))


def _grass_variant(X, Y, P, v):
    rr, i = grass_at(X, Y, P)
    h = hash2(np.floor(np.mod(X, P) * 2).astype(int) + 31 * v, np.floor(np.mod(Y, P) * 2).astype(int)) % 61
    i = np.where(h == 2, 3, i); i = np.where((h == 9) & (i > 0), 0, i)
    return rr, i


def dirt_tile(size=2):
    P = size * U
    _flat(0, P, 0, P, lambda X, Y: dirt_at(np.mod(X, P), np.mod(Y, P)))


def street_tile(size=2):
    """A street tile (x 0..size, z 0..size) with cart ruts running along z."""
    P = size * U
    _flat(0, P, 0, P, lambda X, Y: dirt_at(np.mod(X, P), np.mod(Y, P), ruts=(('x', P * 0.3, 0.55), ('x', P * 0.72, 0.55))))


def gravel_tile(size=1):
    P = size * U
    _flat(0, P, 0, P, gravel_at)


def street_edge_tile(side='w', size=2):
    """Where the street meets the grass: a ragged dithered edge along z on the street's west ('w') or east side."""
    P = size * U
    def fn(X, Y):
        rr, i = grass_at(X, Y, P)
        dr, di = dirt_at(np.mod(X, P), np.mod(Y, P))
        u = np.mod(X, P) / P if side == 'e' else 1 - np.mod(X, P) / P
        bay = E.BAYER[np.floor(X + Y).astype(int) % 4, np.floor(2 * (X - Y)).astype(int) % 4]
        d = (u < 0.35) | ((u < 0.6) & (bay > (u - 0.35) / 0.25))
        return np.where(d, dr, rr), np.where(d, di, i)
    _flat(0, P, 0, P, fn)


# ============================ carried goods ============================
# Smaller versions for a person to hold at chest height (a crate about 10 x 8 px), no ground shadow, with an
# optional shop mark (a 3 x 3 px patch) on the front.
CARRY_MARK = {   # (x, z, y) MU of the mark's centre on the item's lit front face
    'crate': (0.0, 1.25, 1.5), 'sack': (0.0, 1.35, 1.2), 'barrel': (0.0, 1.15, 1.8),
}


def carried(kind):
    if kind == 'crate':
        return crate_box(-1.25, -1.25, 0, 2.5, 2.5, 2.8)
    if kind == 'sack':
        o = new_oid(True)
        sphere(0, 0, 1.2, 1.45, 'cream', oid=o, sz=0.85, th=(0.85, 0.45, -0.15))
        sphere(0.1, 0.1, 2.4, 0.6, 'cream', oid=o, cast=False)
        cyl_z(0.1, 0.1, 2.05, 2.3, 0.55, 'wood', oid=o, cast=False, th=(0.3, 0.0, -0.3))
        return o
    if kind == 'barrel':
        return barrel(r=1.15, h=3.6)
    raise KeyError(kind)


def carried_mark(kind, tag):
    if tag is None:
        return
    rn, ii = TAG_COL[tag]
    x, z, y = CARRY_MARK[kind]
    sx, sy = E.proj(x, z, y)
    cx, cy = int(math.floor(sx)), int(math.floor(sy))
    dark = E.RLEN[R(rn)] - 1
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            px, py = cx + dx, cy + dy
            if 0 <= px < E.W and 0 <= py < E.H and E.RB[py, px] >= 0:
                E.RB[py, px] = R(rn)
                E.IB[py, px] = ii if (dx, dy) != (1, 1) else min(ii + 1, dark)
