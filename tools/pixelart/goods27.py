# D27 goods, the hand truck and the platform cart at the anchor scale (plans/d27-tech.md 1.5, 4.1 and 7.2; owner A2).
# Drawn in game units with geom27, each around its own anchor; the sprite modules turn them to the four facings with
# the canvas' yaw (se 0, ne 90, nw 180, sw -90 degrees), so the light stays on the upper left in every facing.
#
# Local frame of every drawing: a along x (the good's length, or the way a cart or truck travels), b along z, y up.
import math
import numpy as np
import engine as E
from engine import R, new_oid, hash2
from geom27 import B, CYV, CYX, obox, ocyl, axes_tilt, clampi

# (length along x, depth along z, height) in u, from the plan's table (4.1); round goods: (diameter, -, height)
SIZE = {
    'crate': (0.85, 0.65, 0.55), 'sack': (1.3, 0.65, 0.35), 'barrel': (0.85, 0.85, 1.3), 'keg': (0.6, 0.6, 0.75),
    'bale': (1.4, 0.85, 0.85), 'hides': (1.4, 0.8, 0.45), 'mailSack': (0.6, 0.6, 1.2), 'paper': (0.9, 0.6, 0.5),
    'lumber': (4.3, 0.6, 0.4), 'ironBars': (3.4, 0.4, 0.3), 'wheel': (1.7, 1.7, 0.16), 'plough': (2.9, 0.85, 1.3),
    'stove': (1.15, 1.0, 1.15), 'furniture': (1.4, 0.7, 1.6), 'piano': (2.1, 1.0, 1.9), 'strongbox': (0.7, 0.45, 0.4),
}
KINDS = list(SIZE)
VARIANTS = {'crate': ('dry', 'tins', 'linen'), 'sack': ('flour', 'seed', 'grain', 'ore'), 'keg': ('beer', 'empty', 'nails'),
            'barrel': ('whiskey', 'nails')}
VERB = {'crate': 'carry', 'sack': 'shoulder', 'barrel': 'roll', 'keg': 'carry', 'bale': 'truck', 'hides': 'drag',
        'mailSack': 'shoulder', 'paper': 'carry', 'lumber': 'drag', 'ironBars': 'drag', 'wheel': 'roll',
        'plough': 'heave', 'stove': 'truck', 'furniture': 'truck', 'piano': 'heave', 'strongbox': 'carry'}
ROUND = ('barrel', 'keg', 'mailSack', 'wheel')


def slat_crate(L, D, H, o, ramp='wood', gaps=False, inner=None, base=0.0):
    """A board crate L x D x H (centred, on y = base). gaps: open slats showing `inner` (a draw function) inside."""
    hl, hd = L / 2, D / 2
    if inner is not None:
        inner()
    def ct(face, x, z, y, idx):
        rr = np.full(x.shape, R(ramp)); ii = idx.copy()
        c = x if face in ('l', 't') else z
        w = L if face in ('l', 't') else D
        cc = c + w / 2
        yy = y - base
        if face == 't':
            ii = np.where(((z + hd) / 0.16) % 1.0 < 0.18, clampi(idx + 1), idx)
            edge = (np.abs(x) > hl - 0.07) | (np.abs(z) > hd - 0.07)
            ii = np.where(edge, clampi(idx - 1), ii)
            return rr, ii
        edge = (cc < 0.07) | (cc > w - 0.07) | (yy < 0.07) | (yy > H - 0.07)
        ii = np.where(edge, clampi(idx - 1), ii)
        dg = np.abs(cc / w - yy / H) < 0.07
        ii = np.where(dg & ~edge, clampi(idx - 1), ii)
        ii = np.where(~edge & (((yy / 0.14) % 1.0) < 0.12), clampi(ii + 1), ii)
        return rr, ii
    if not gaps:
        B(-hl, -hd, base, hl, hd, base + H, ramp, oid=o, tex=ct)
        return
    # open crate: corner posts, top and bottom frames and three horizontal slats on each face
    t = 0.07
    for sx in (-1, 1):
        for sz in (-1, 1):
            B(sx * hl - (t if sx > 0 else 0), sz * hd - (t if sz > 0 else 0), base, sx * hl + (0 if sx > 0 else t),
              sz * hd + (0 if sz > 0 else t), base + H, ramp, shades=(1, 2, 3), oid=o)
    for y0 in (0.0, H * 0.33, H * 0.66, H - t * 1.2):
        B(-hl, hd - t, base + y0, hl, hd, base + y0 + t * 1.2, ramp, shades=(1, 2, 3), oid=o)
        B(hl - t, -hd, base + y0, hl, hd, base + y0 + t * 1.2, ramp, shades=(1, 2, 3), oid=o)
        B(-hl, -hd, base + y0, hl, -hd + t, base + y0 + t * 1.2, ramp, shades=(1, 2, 3), oid=o)
        B(-hl, -hd, base + y0, -hl + t, hd, base + y0 + t * 1.2, ramp, shades=(1, 2, 3), oid=o)
    for k in range(4):
        z0 = -hd + k * D / 4
        B(-hl, z0, base + H - t, hl, z0 + D / 7, base + H, ramp, shades=(1, 2, 3), oid=o)


def crate(variant='dry', o=None):
    o = o or new_oid(True)
    L, D, H = SIZE['crate']
    slat_crate(L, D, H, o, ramp='wood' if variant != 'linen' else 'cream')
    # the stencil or label on the near side and on the end
    if variant == 'dry':
        B(-0.2, D / 2, 0.18, 0.2, D / 2 + 0.01, 0.37, 'wood', shades=(3, 3, 3), oid=o, cast=False,
          tex=lambda f, x, z, y, i: (None, np.where(((x * 14) % 1.0) < 0.5, 4, 3)))
    elif variant == 'tins':
        B(-0.24, D / 2, 0.15, 0.24, D / 2 + 0.01, 0.4, 'red', shades=(1, 1, 1), oid=o, cast=False,
          tex=lambda f, x, z, y, i: (None, np.where(np.abs(y - 0.27) < 0.04, 0, 1)))
    else:
        B(-L / 2, D / 2, 0.22, L / 2, D / 2 + 0.01, 0.32, 'navy', shades=(1, 1, 1), oid=o, cast=False)
        B(L / 2, -D / 2, 0.22, L / 2 + 0.01, D / 2, 0.32, 'navy', shades=(2, 2, 2), oid=o, cast=False)
    return o


SACK_COL = {'flour': ('cream', 'navy'), 'seed': ('dirt', 'green'), 'grain': ('dirt', 'red'), 'ore': ('iron', 'red')}


def sack(variant='flour', o=None):
    """A filled sack lying along x: a soft pillow, tied ears at both ends, a printed band."""
    o = o or new_oid(True)
    L, D, H = SIZE['sack']
    col, ink = SACK_COL[variant]
    def st(k, sgn, uvw, idx):
        u, v, w = uvw
        rr = np.full(u.shape, R(col)); ii = idx.copy()
        band = (np.abs(u) < 0.2) & (k != 0)
        prt = band & (np.abs(u) < 0.14) & ((k == 2) | (sgn > 0))
        rr = np.where(prt, R(ink), rr); ii = np.where(prt, np.where((np.abs(u) < 0.05), 0, 1), ii)
        if variant in ('grain', 'seed', 'ore'):
            wv = hash2(np.floor(u * 30).astype(int), np.floor((v + w) * 30).astype(int)) % 4 == 0
            ii = np.where(wv & ~prt, clampi(ii + 1), ii)
        return rr, ii
    # a soft body: a box with rounded ends (two lying cylinders capping it) and a slight hump
    ocyl((-L / 2 + 0.24, 0, H / 2), (0, 1, 0), H / 2 * 0.95, D / 2 * 0.9, col, oid=o)
    ocyl((L / 2 - 0.24, 0, H / 2), (0, 1, 0), H / 2 * 0.95, D / 2 * 0.9, col, oid=o)
    obox((0, 0, H * 0.45), ((1, 0, 0), (0, 1, 0), (0, 0, 1)), (L / 2 - 0.22, D / 2, H * 0.45), col, tex=st, oid=o)
    E.sphere(0, 0, H * 0.75 * E.U_Y, 0.35 * 4, col, oid=o, sz=0.5, cast=False)
    for sx in (-1, 1):            # tied ears
        B(sx * (L / 2) - 0.08, -0.1, H * 0.3, sx * (L / 2) + 0.08, 0.1, H * 0.65, col, shades=(1, 2, 3), oid=o)
        B(sx * (L / 2 - 0.1) - 0.03, -0.12, H * 0.28, sx * (L / 2 - 0.1) + 0.03, 0.12, H * 0.68, 'wood', shades=(2, 3, 3), oid=o)
    return o


def barrel(variant='whiskey', o=None, axis=(0, 0, 1), c=None, phase=0.0):
    """A barrel (0.85 across, 1.3 long): bulged with three cylinders, staves, hoops. Upright by default; give
    axis and centre for one lying or tipping; phase turns its staves (rolling)."""
    o = o or new_oid(True)
    D, _, H = SIZE['barrel']
    axis = np.asarray(axis, float); axis = axis / np.linalg.norm(axis)
    c = np.array(c if c is not None else (0, 0, H / 2), float)
    ramp = 'wood' if variant == 'whiskey' else 'ochre'
    def tex(part, s, ang, rho, idx):
        rr = np.full(s.shape, R(ramp)); ii = idx.copy()
        side = part == 0
        f = s / H + 0.5
        hp = (np.abs(f - 0.1) < 0.04) | (np.abs(f - 0.3) < 0.035) | (np.abs(f - 0.7) < 0.035) | (np.abs(f - 0.9) < 0.04)
        a = ang + phase
        stave = side & (((a * 14 / (2 * np.pi)) % 1.0) < 0.16)
        ii = np.where(stave & ~hp, clampi(ii + 1), ii)
        rr = np.where(side & hp, R('iron'), rr)
        bung = side & (np.abs(f - 0.5) < 0.05) & (np.cos(a - 1.2) > 0.97)
        rr = np.where(bung, R('wood'), rr); ii = np.where(bung, 4, ii)
        head = ~side
        ring = head & (rho > D / 2 * 0.8)
        ii = np.where(ring, 3, np.where(head, 1, ii))
        mk = head & (np.abs(np.sin(a)) * rho < 0.035) & (rho < 0.25)
        rr = np.where(mk & (variant == 'nails'), R('blk'), rr); ii = np.where(mk, 3, ii)
        if variant == 'whiskey':
            x3 = head & (rho < 0.2) & (np.abs(np.abs(np.cos(a + 0.78)) - np.abs(np.sin(a + 0.78))) * rho < 0.035)
            rr = np.where(x3, R('blk'), rr); ii = np.where(x3, 3, ii)
        return rr, ii
    for s0, s1, r in ((-0.5, -0.32, 0.385), (-0.32, 0.32, 0.425), (0.32, 0.5, 0.385)):
        cc = c + axis * (s0 + s1) / 2 * H
        def t2(part, s, ang, rho, idx, s0=s0, s1=s1):
            return tex(part, s + (s0 + s1) / 2 * H, ang, rho, idx)
        ocyl(cc, axis, r, (s1 - s0) / 2 * H, ramp, tex=t2, oid=o, ref=_ref(axis))
    return o


def _ref(axis):
    a = np.asarray(axis, float)
    return np.cross(a, (0, 0, 1)) if abs(a[2]) < 0.9 else np.array((1.0, 0.0, 0.0))


def keg(variant='beer', o=None, axis=(0, 0, 1), c=None):
    o = o or new_oid(True)
    D, _, H = SIZE['keg']
    axis = np.asarray(axis, float)
    c = np.array(c if c is not None else (0, 0, H / 2), float)
    ramp = 'ochre' if variant == 'beer' else 'wood'
    def tex(part, s, ang, rho, idx):
        rr = np.full(s.shape, R(ramp)); ii = idx.copy()
        side = part == 0
        f = s / H + 0.5
        hp = (np.abs(f - 0.15) < 0.06) | (np.abs(f - 0.85) < 0.06)
        if variant == 'nails':       # a nail keg: four hoops and a tight head with no tap
            hp = (np.abs(f - 0.1) < 0.05) | (np.abs(f - 0.32) < 0.04) | (np.abs(f - 0.68) < 0.04) | (np.abs(f - 0.9) < 0.05)
        ii = np.where(side & (((ang * 10 / (2 * np.pi)) % 1.0) < 0.16) & ~hp, clampi(ii + 1), ii)
        rr = np.where(side & hp, R('iron'), rr)
        head = ~side
        ii = np.where(head, np.where(rho > D / 2 * 0.8, 3, 1), ii)
        tap = head & (rho < 0.07) & (variant != 'nails')
        if variant == 'nails':       # the stencilled size mark (a black bar across the head, as the nails barrel)
            mk = head & (np.abs(np.sin(ang)) * rho < 0.03) & (rho < 0.18)
            rr = np.where(mk, R('blk'), rr); ii = np.where(mk, 3, ii)
            # and a black stencil block on the side, between the middle hoops, facing the view
            st = side & (np.abs(f - 0.5) < 0.1) & (np.cos(ang - 0.785) > 0.8)
            rr = np.where(st, R('blk'), rr); ii = np.where(st, np.where(np.abs(f - 0.5) < 0.04, 2, 3), ii)
        rr = np.where(tap, R('brass' if variant == 'beer' else 'wood'), rr); ii = np.where(tap, 1, ii)
        if variant == 'empty':       # a chalked cross: going back empty
            ch = side & (np.abs(f - 0.5) < 0.2) & (np.abs(np.abs(f - 0.5) - np.abs(((ang - 2.0) % 6.283) - 0.3) * 0.5) < 0.04)
            rr = np.where(ch, R('cream'), rr); ii = np.where(ch, 0, ii)
        return rr, ii
    for s0, s1, r in ((-0.5, -0.3, 0.27), (-0.3, 0.3, 0.3), (0.3, 0.5, 0.27)):
        cc = c + axis * (s0 + s1) / 2 * H
        def t2(part, s, ang, rho, idx, s0=s0, s1=s1):
            return tex(part, s + (s0 + s1) / 2 * H, ang, rho, idx)
        ocyl(cc, axis, r, (s1 - s0) / 2 * H, ramp, tex=t2, oid=o, ref=_ref(axis))
    return o


def bale(o=None, axes=None, c=None):
    o = o or new_oid(True)
    L, D, H = SIZE['bale']
    axes = axes or ((1, 0, 0), (0, 1, 0), (0, 0, 1))
    c = c if c is not None else (0, 0, H / 2)
    def hay(k, sgn, uvw, idx):
        u, v, w = uvw
        h = hash2(np.floor(u * 14).astype(int) + 7 * k, np.floor((v + w) * 14).astype(int)) % 5
        ii = np.where(h == 0, clampi(idx - 1), np.where(h == 1, clampi(idx + 1), idx))
        tie = (np.abs(np.abs(u) - 0.38) < 0.04) & (k != 0)
        rr = np.where(tie, R('wood'), R('ochre'))
        ii = np.where(tie, 3, ii)
        return rr, ii
    obox(c, axes, (L / 2, D / 2, H / 2), 'ochre', tex=hay, oid=o, cast=True)
    return o


def hides(o=None, axes=None, c=None):
    o = o or new_oid(True)
    L, D, H = SIZE['hides']
    axes = axes or ((1, 0, 0), (0, 1, 0), (0, 0, 1))
    c = np.array(c if c is not None else (0, 0, H / 2), float)
    def ht(k, sgn, uvw, idx):
        u, v, w = uvw
        layer = np.floor((w + H / 2) / 0.09).astype(int)
        rr = np.where(layer % 2 == 0, R('wood'), R('dirt'))
        ii = np.where(k == 2, idx, np.where(((w + H / 2) / 0.09) % 1.0 < 0.3, 3, idx))
        hair = hash2(np.floor(u * 20).astype(int), layer) % 3 == 0
        ii = np.where(hair & (k == 2), clampi(ii + 1), ii)
        rope = np.abs(np.abs(u) - 0.35) < 0.035
        rr = np.where(rope, R('cream'), rr); ii = np.where(rope, 2, ii)
        ragged = (k == 0) & (hash2(np.floor(v * 25).astype(int), layer) % 3 == 0)
        return rr, ii, ~ragged
    obox(c, axes, (L / 2, D / 2, H / 2), 'wood', tex=ht, oid=o, cast=True)
    return o


def mailsack(o=None, axis=(0, 0, 1), c=None):
    """A canvas mail sack standing (0.6 across, 1.2 tall), drawn-in neck with a leather strap and a blue band."""
    o = o or new_oid(True)
    axis = np.asarray(axis, float)
    D, _, H = SIZE['mailSack']
    c = np.array(c if c is not None else (0, 0, 0.5), float)
    def mt(part, s, ang, rho, idx):
        rr = np.full(s.shape, R('cream')); ii = idx.copy()
        band = (part == 0) & (np.abs(s - 0.05) < 0.1)
        rr = np.where(band, R('navy'), rr); ii = np.where(band, np.where(np.cos(ang - 1.6) > 0.3, 0, 1), ii)
        lt = band & (np.abs(s - 0.05) < 0.04) & (((ang * 6) % 1.0) < 0.5) & (np.cos(ang - 1.6) > 0.3)
        rr = np.where(lt, R('cream'), rr); ii = np.where(lt, 1, ii)
        fold = (part == 0) & ((ang * 5 / (2 * np.pi)) % 1.0 < 0.1)
        ii = np.where(fold & ~band, clampi(ii + 1), ii)
        return rr, ii
    ocyl(c, axis, 0.29, 0.5, 'cream', tex=mt, oid=o, ref=_ref(axis))
    top = c + axis * 0.5
    E.sphere(top[0] * 4, top[1] * 4, top[2] * E.U_Y, 0.29 * 4, 'cream', oid=o, sz=0.45 * 1.33 if axis[2] > 0.5 else 1.0)
    neck = c + axis * 0.62
    ocyl(neck, axis, 0.08, 0.1, 'cream', oid=o, ref=_ref(axis))
    ocyl(c + axis * 0.58, axis, 0.1, 0.03, 'wood', oid=o, ref=_ref(axis))
    E.sphere(*(c + axis * 0.74) * np.array([4, 4, E.U_Y]), 0.11 * 4, 'cream', oid=o, sz=1.0)
    return o


def paper(o=None):
    o = o or new_oid(True)
    L, D, H = SIZE['paper']
    def pt(face, x, z, y, idx):
        rr = np.full(x.shape, R('cream')); ii = idx.copy()
        if face != 't':
            ii = np.where(((y / 0.035) % 1.0) < 0.35, clampi(ii + 1), ii)
        else:
            ii = np.where((np.abs(x) < 0.3) & (np.abs(z) < 0.18) & (((z / 0.05) % 1.0) < 0.4), 2, ii)
        tw = (np.abs(x) < 0.025) | (np.abs(z) < 0.025)
        rr = np.where(tw, R('wood'), rr); ii = np.where(tw, 2, ii)
        return rr, ii
    B(-L / 2, -D / 2, 0, L / 2, D / 2, H, 'cream', oid=o, tex=pt, shades=(0, 1, 2))
    return o


def plank_bundle(L, D, H, o, ramp='wood', planks=(4, 3), straps=(-0.33, 0.33), iron=False, axes=None, c=None):
    """A strapped bundle of planks (or bars) as one oriented box with the ends and seams painted."""
    axes = axes or ((1, 0, 0), (0, 1, 0), (0, 0, 1))
    c = np.array(c if c is not None else (0, 0, H / 2), float)
    nz, ny = planks
    def bt(k, sgn, uvw, idx):
        u, v, w = uvw
        rr = np.full(u.shape, R(ramp)); ii = idx.copy()
        cz = ((v + D / 2) / (D / nz)) % 1.0; cy = ((w + H / 2) / (H / ny)) % 1.0
        seam = ((k == 2) & (cz < 0.16)) | ((k == 1) & (cy < 0.18)) | ((k == 0) & ((cz < 0.16) | (cy < 0.18)))
        ii = np.where(seam, clampi(idx + 1), idx)
        if not iron:
            stag = (k == 0)
            ii = np.where(stag & ~seam, 0, ii)
            gr = (k != 0) & (hash2(np.floor(u * 3).astype(int), np.floor((v + w) * 20).astype(int)) % 6 == 0)
            ii = np.where(gr & ~seam, clampi(ii + 1), ii)
        strap = np.zeros(u.shape, bool)
        for sfr in straps:
            strap |= np.abs(u - sfr * L) < 0.05
        rr = np.where(strap & (k != 0), R('iron'), rr); ii = np.where(strap & (k != 0), 3 if not iron else 1, ii)
        return rr, ii
    obox(c, axes, (L / 2, D / 2, H / 2), ramp, tex=bt, oid=o, cast=True)


def lumber(o=None, axes=None, c=None):
    o = o or new_oid(True)
    L, D, H = SIZE['lumber']
    plank_bundle(L, D, H, o, 'wood', (4, 3), (-0.4, 0.0, 0.4), axes=axes, c=c)
    return o


def ironbars(o=None, axes=None, c=None):
    o = o or new_oid(True)
    L, D, H = SIZE['ironBars']
    plank_bundle(L, D, H, o, 'iron', (5, 3), (-0.35, 0.35), iron=True, axes=axes, c=c)
    return o


def wheel(o=None, axis=(0, 0, 1), c=None, phase=0.0):
    """A wagon wheel 1.7 u across: iron tyre on a wooden felloe, 12 spokes (open between), a big hub. Lying flat
    by default (axis up); axis across the travel for one rolling upright."""
    o = o or new_oid(True)
    r = SIZE['wheel'][0] / 2
    axis = np.asarray(axis, float); axis = axis / np.linalg.norm(axis)
    c = np.array(c if c is not None else (0, 0, 0.09), float)
    ref = _ref(axis)
    def wt(part, s, ang, rho, idx):
        a = ang + phase
        tyre = rho > r - 0.06
        fel = (rho > r - 0.17) & ~tyre
        sp = (np.abs(((a * 12 / (2 * np.pi)) % 1.0) - 0.5) > 0.4) & (rho > 0.18) & (rho <= r - 0.17)
        hub = rho < 0.18
        keep = (part == 0) | tyre | fel | sp | hub
        rr = np.where(tyre, R('iron'), R('wood'))
        rr = np.where(part == 0, R('iron'), rr)
        ii = np.where(tyre, np.where(idx <= 1, 1, 2), idx)
        ii = np.where(sp, np.where(idx <= 1, 1, 2), ii)
        ii = np.where(hub, np.where(rho < 0.07, 3, 1), ii)
        return rr, ii, keep
    th = 0.05
    for off in (-th, th):
        ocyl(c + axis * off, axis, r, th, 'wood', tex=wt, oid=o, ref=ref)
    ocyl(c, axis, 0.17, 0.16, 'wood', oid=o, ref=ref,
         tex=lambda p, s, a, rr, i: (np.where(np.abs(np.abs(s) - 0.12) < 0.03, R('iron'), R('wood')), i))
    return o


def plough(o=None, tip=0.0, lift_front=False):
    """A walking plough 2.9 u long, its point at +x: the wooden beam, two handles rising to the rear, the iron
    share and the curved mouldboard, the clevis. tip (degrees) leans it on its landside (heave)."""
    o = o or new_oid(True)
    L, D, H = SIZE['plough']
    # beam: from the clevis (+x) back and up to the handles
    a, b, cc = axes_tilt((1, 0, 0), 9)
    obox((0.35, 0.0, 0.62), (a, b, cc), (1.05, 0.06, 0.07), 'wood', oid=o, cast=True, shades=(1, 2, 3))
    B(1.35, -0.06, 0.6, 1.5, 0.06, 0.82, 'iron', shades=(1, 2, 3), oid=o)                 # clevis
    # handles: from the mouldboard back up to the grips
    for sz in (-1, 1):
        a, b, cc = axes_tilt((-1, 0, 0), 28)
        obox((-0.85, sz * 0.32, 0.72), (a, b, cc), (0.72, 0.035, 0.035), 'wood', oid=o, cast=True, shades=(1, 2, 3))
        B(-1.5, sz * 0.32 - 0.05, 1.04, -1.42, sz * 0.32 + 0.05, 1.3, 'wood', shades=(1, 2, 3), oid=o)
    B(-1.0, -0.32, 0.8, -0.95, 0.32, 0.86, 'wood', shades=(1, 2, 3), oid=o)                # rung
    # standard, share and mouldboard (iron), the landside along the ground
    B(-0.1, -0.05, 0.12, 0.02, 0.05, 0.6, 'iron', shades=(1, 2, 3), oid=o)
    B(-0.55, -0.06, 0.0, 0.45, 0.02, 0.12, 'iron', shades=(1, 2, 3), oid=o)                 # landside
    a, b, cc = axes_tilt((1, 0.35, 0), -12)
    obox((0.35, 0.12, 0.08), (a, b, cc), (0.22, 0.12, 0.025), 'iron', oid=o, shades=(0, 1, 2))   # share
    for k in range(4):
        z0 = 0.05 + k * 0.08
        B(-0.3 + k * 0.05, z0, 0.1 + k * 0.08, 0.2 - k * 0.04, z0 + 0.09, 0.2 + k * 0.08 + 0.1, 'iron', shades=(1, 1, 2), oid=o)
    # a red-painted beam tip (the maker's paint)
    B(1.1, -0.065, 0.74, 1.35, 0.065, 0.86, 'red', shades=(1, 2, 3), oid=o)
    return o


def stove_crate(o=None):
    o = o or new_oid(True)
    L, D, H = SIZE['stove']
    def inner():
        B(-0.45, -0.38, 0.1, 0.45, 0.38, 0.95, 'blk', shades=(1, 2, 3), oid=o)
        B(-0.5, -0.42, 0.95, 0.5, 0.42, 1.0, 'iron', shades=(1, 2, 3), oid=o)
        CYV(-0.25, -0.15, 1.0, 1.08, 0.13, 'iron', oid=o)
        CYV(0.2, 0.0, 1.0, 1.08, 0.13, 'iron', oid=o)
        B(-0.3, 0.38, 0.35, 0.3, 0.4, 0.75, 'blk', shades=(1, 1, 2), oid=o,
          tex=lambda f, x, z, y, i: (np.where(np.abs(x) < 0.1, R('brass'), R('blk')), i))
    slat_crate(L, D, H, o, gaps=True, inner=inner)
    return o


def furniture_crate(o=None):
    o = o or new_oid(True)
    L, D, H = SIZE['furniture']
    def inner():
        def drw(face, x, z, y, idx):
            ii = idx.copy()
            ii = np.where(((y / 0.32) % 1.0) < 0.12, 3, ii)
            kn = (np.abs(np.abs(x) - 0.3) < 0.04) & (((y / 0.32) % 1.0) > 0.45) & (((y / 0.32) % 1.0) < 0.6)
            rr = np.where(kn & (face == 'l'), R('brass'), R('wood'))
            return rr, np.where(kn & (face == 'l'), 1, ii)
        B(-0.62, -0.28, 0.08, 0.62, 0.28, 1.5, 'wood', oid=o, tex=drw)
    slat_crate(L, D, H, o, gaps=True, inner=inner, ramp='dirt')
    return o


def piano_crate(o=None):
    o = o or new_oid(True)
    L, D, H = SIZE['piano']
    slat_crate(L, D, H, o, ramp='wood')
    # "THIS SIDE UP" arrows and a big stencil
    for x in (-0.65, 0.65):
        B(x - 0.03, D / 2, 0.85, x + 0.03, D / 2 + 0.01, 1.4, 'wood', shades=(4, 4, 4), oid=o, cast=False)
        B(x - 0.11, D / 2, 1.28, x + 0.11, D / 2 + 0.01, 1.34, 'wood', shades=(4, 4, 4), oid=o, cast=False)
    B(-0.35, D / 2, 0.55, 0.35, D / 2 + 0.01, 0.68, 'red', shades=(2, 2, 2), oid=o, cast=False,
      tex=lambda f, x, z, y, i: (None, np.where(((x * 9) % 1.0) < 0.6, 2, 1)))
    B(-0.5, D / 2, 1.55, 0.5, D / 2 + 0.01, 1.65, 'wood', shades=(4, 4, 4), oid=o, cast=False,
      tex=lambda f, x, z, y, i: (None, np.where(((x * 7) % 1.0) < 0.55, 4, 2)))
    return o


def strongbox(o=None):
    """The express box: green-painted wood bound in iron, a brass lock plate."""
    o = o or new_oid(True)
    L, D, H = SIZE['strongbox']
    def sb(face, x, z, y, idx):
        rr = np.full(x.shape, R('green')); ii = idx.copy()
        strap = (np.abs(np.abs(x) - 0.22) < 0.035) | (y < 0.04) | (np.abs(y - (H - 0.08)) < 0.025)
        if face == 't':
            strap = (np.abs(np.abs(x) - 0.22) < 0.035)
        rr = np.where(strap, R('iron'), rr); ii = np.where(strap, 2, ii)
        if face == 'l':
            lock = (np.abs(x) < 0.07) & (y > 0.16) & (y < 0.3)
            rr = np.where(lock, R('brass'), rr); ii = np.where(lock, np.where(np.abs(y - 0.22) < 0.025, 3, 1), ii)
            lt = (y > 0.08) & (y < 0.13) & (np.abs(x) < 0.14) & (((x * 25) % 1.0) < 0.5)
            rr = np.where(lt, R('brass'), rr); ii = np.where(lt, 1, ii)
        return rr, ii
    B(-L / 2, -D / 2, 0, L / 2, D / 2, H, 'green', oid=o, tex=sb)
    B(-0.3, -0.04, H, -0.22, 0.04, H + 0.05, 'iron', shades=(1, 2, 3), oid=o)
    B(0.22, -0.04, H, 0.3, 0.04, H + 0.05, 'iron', shades=(1, 2, 3), oid=o)
    return o


def good(kind, variant=None):
    """Draw a good resting on the ground, its length along x, centred on the origin."""
    if kind == 'crate': return crate(variant or 'dry')
    if kind == 'sack': return sack(variant or 'flour')
    if kind == 'barrel': return barrel(variant or 'whiskey')
    if kind == 'keg': return keg(variant or 'beer')
    if kind == 'bale': return bale()
    if kind == 'hides': return hides()
    if kind == 'mailSack': return mailsack()
    if kind == 'paper': return paper()
    if kind == 'lumber': return lumber()
    if kind == 'ironBars': return ironbars()
    if kind == 'wheel': return wheel()
    if kind == 'plough': return plough()
    if kind == 'stove': return stove_crate()
    if kind == 'furniture': return furniture_crate()
    if kind == 'piano': return piano_crate()
    if kind == 'strongbox': return strongbox()
    raise KeyError(kind)


def _edge(k, uvw, half, t=0.07):
    """Board edges on an oriented box's face: near the borders along the two axes other than the face's own."""
    e = np.zeros(np.shape(uvw[0]), bool)
    for j in range(3):
        e |= (k != j) & (np.abs(uvw[j]) > half[j] - t)
    return e


# ---------------------------------------------------------------- handling states (local frame: facing +x)
def held_carry(kind, variant=None):
    """Carried in the arms: the good as at rest (the sprite module turns it so its long side lies across the
    carrier's body)."""
    return good(kind, variant)


def held_shoulder(kind, variant=None):
    """On the shoulder: the sack lying along the carrier's facing, sagging over the shoulder."""
    if kind == 'sack':
        o = sack(variant or 'flour')
        return o
    o = new_oid(True)
    mailsack(o, axis=(1, 0, 0), c=(0.0, 0, 0.29))
    return o


def drag(kind, lift=0.85):
    """Dragged: the end at the hands (local x = 0) lifted to `lift` u, the far end (+x) on the ground. Anchor: the
    ground point under the lifted end."""
    L, D, H = SIZE[kind]
    s = min(1.0, (lift - H / 2) / L)
    t = math.degrees(math.asin(max(0.0, s)))
    a, b, c = axes_tilt((1, 0, 0), -t)
    # centre: halfway along, the lower face's far end touching the ground
    cx = L / 2 * math.cos(math.radians(t)); cy = lift - L / 2 * math.sin(math.radians(t))
    cen = (cx, 0, max(cy, H / 2))
    if kind == 'lumber': return lumber(axes=(a, b, c), c=cen)
    if kind == 'ironBars': return ironbars(axes=(a, b, c), c=cen)
    if kind == 'hides': return hides(axes=(a, b, c), c=cen)
    if kind == 'bale': return bale(axes=(a, b, c), c=cen)
    raise KeyError(kind)


def rolling(kind, phase=0.0):
    """Rolled along +x: the barrel on its side (its axis across), the wheel upright. Anchor: the ground contact."""
    if kind == 'barrel':
        D, _, H = SIZE['barrel']
        return barrel(axis=(0, 1, 0), c=(0, 0, 0.42), phase=phase)
    r = SIZE['wheel'][0] / 2
    return wheel(axis=(0, 1, 0), c=(0, 0, r), phase=phase)


def lying(kind):
    """A barrel or keg lying on its side, axis along x."""
    if kind == 'barrel':
        return barrel(axis=(1, 0, 0), c=(0, 0, 0.42))
    return keg(axis=(1, 0, 0), c=(0, 0, 0.3))


def tipping(kind, deg):
    """A barrel tipped deg from upright towards +x, resting on its bottom rim (the step between upright and
    rolling). Anchor: the rim's contact point, the barrel's foot."""
    D, _, H = SIZE['barrel']
    t = math.radians(deg)
    axis = (math.sin(t), 0, math.cos(t))
    # the bottom rim's far point stays at the origin + its radius; centre from the contact point
    r = 0.4
    cx = H / 2 * math.sin(t) + r * (1 - math.cos(t))
    cy = H / 2 * math.cos(t) + r * math.sin(t)
    return barrel(axis=axis, c=(cx, 0, cy))


def heave(kind, deg=14):
    """Tipped up on its far edge for heaving (the end at the agent, local x = 0, lifted)."""
    L, D, H = SIZE[kind]
    t = math.radians(deg)
    o = new_oid(True)
    if kind == 'piano':
        a, b, c = axes_tilt((1, 0, 0), -deg)
        cen = (L - L / 2 * math.cos(t) + H / 2 * math.sin(t), 0, L / 2 * math.sin(t) + H / 2 * math.cos(t))
        def ct(k, sgn, uvw, idx):
            u, v, w = uvw
            ii = np.where(((w + H / 2) / 0.14) % 1.0 < 0.12, clampi(idx + 1), idx)
            edge = _edge(k, uvw, (L / 2, D / 2, H / 2))
            ii = np.where(edge, clampi(idx - 1), ii)
            return R('wood'), ii
        obox(cen, (a, b, c), (L / 2, D / 2, H / 2), 'wood', tex=ct, oid=o, cast=True)
        return o
    # the plough on its side: handles up, tipped over on its landside
    plough(o)
    return o


# ---------------------------------------------------------------- the hand truck
TRUCK_TILT = 55.0
TRUCK_R = 0.24


class Tilted:
    """A frame turned back about the axle (at local x = 0, height TRUCK_R) by `deg`: local a forwards, y up."""
    def __init__(self, deg):
        self.t = math.radians(deg)
        self.a = np.array([math.cos(self.t), 0, math.sin(self.t)])
        self.c = np.array([-math.sin(self.t), 0, math.cos(self.t)])

    def pt(self, a, b, y):
        return np.array([0, b, TRUCK_R]) + self.a * a + self.c * (y - TRUCK_R)

    def box(self, a0, a1, b0, b1, y0, y1, ramp, **kw):
        cen = self.pt((a0 + a1) / 2, (b0 + b1) / 2, (y0 + y1) / 2)
        obox(cen, (self.a, (0, 1, 0), self.c), ((a1 - a0) / 2, (b1 - b0) / 2, (y1 - y0) / 2), ramp, **kw)

    def axes(self):
        return (self.a, np.array([0.0, 1, 0]), self.c)


def hand_truck(tilt=False, o=None):
    """The two-wheel hand truck, 1.0 x 0.8 u, 1.9 u tall, nose plate 0.6 u: rails, cross bars, nose plate, iron
    wheels behind the plate. Facing +x (the nose forwards); tilted back towards the pusher by TRUCK_TILT.
    Anchor: the axle's ground point."""
    o = o or new_oid(True)
    T = Tilted(TRUCK_TILT if tilt else 0.0)
    for bz in (-0.3, 0.3):
        T.box(-0.06, 0.04, bz - 0.04, bz + 0.04, 0.04, 1.9, 'wood', oid=o, shades=(1, 2, 3))
        T.box(-0.06, 0.04, bz - 0.04, bz + 0.04, 1.6, 1.9, 'wood', oid=o, shades=(0, 1, 2))     # grips worn
    for y in (0.5, 1.0, 1.45):
        T.box(-0.04, 0.02, -0.3, 0.3, y - 0.03, y + 0.03, 'wood', oid=o, shades=(1, 2, 3))
    T.box(0.0, 0.6, -0.3, 0.3, 0.0, 0.04, 'iron', oid=o, shades=(0, 1, 2))                       # nose plate
    T.box(-0.02, 0.04, -0.26, 0.26, 0.0, 0.3, 'iron', oid=o, shades=(1, 2, 3))                   # plate brace
    for bz in (-0.38, 0.38):
        ocyl(T.pt(-0.12, bz, TRUCK_R), (0, 1, 0), TRUCK_R, 0.04, 'iron', oid=o, ref=(1, 0, 0),
             tex=lambda p, s, a, r, i: (None, np.where(p != 0, np.where(r > TRUCK_R - 0.05, 2, np.where(r < 0.05, 1, 3)), 3)))
    ocyl(T.pt(-0.12, 0, TRUCK_R), (0, 1, 0), 0.03, 0.38, 'iron', oid=o, ref=(1, 0, 0))
    return o


def truck_load(kind):
    """A good standing on the tilted truck's nose plate, leaning on its frame (draw over hand_truck(True))."""
    T = Tilted(TRUCK_TILT)
    o = new_oid(True)
    L, D, H = SIZE[kind]
    if kind == 'barrel':
        barrel(o=o, axis=T.c, c=T.pt(0.05 + 0.43, 0, 0.04 + H / 2))
        return o
    if kind == 'crate':
        for k in range(2):
            def ct(k_, sgn, uvw, idx):
                u, v, w = uvw
                edge = _edge(k_, uvw, (SIZE['crate'][1] / 2, SIZE['crate'][0] / 2, 0.275))
                return R('wood'), np.where(edge, clampi(idx - 1), idx)
            T.box(0.05, 0.05 + SIZE['crate'][1], -SIZE['crate'][0] / 2, SIZE['crate'][0] / 2, 0.04 + k * 0.55,
                  0.04 + (k + 1) * 0.55, 'wood', oid=o, tex=ct, cast=True)
        return o
    # boxes: depth along a (out from the frame), width across b, height along c
    if kind == 'piano':
        dd, ww = SIZE['piano'][1], SIZE['piano'][0]
    elif kind == 'furniture':
        dd, ww = SIZE['furniture'][1], SIZE['furniture'][0]
    else:
        dd, ww = D, L
    tone = {'bale': 'ochre', 'stove': 'wood', 'furniture': 'dirt', 'piano': 'wood'}[kind]
    def bt(k, sgn, uvw, idx):
        u, v, w = uvw
        if kind == 'bale':
            h = hash2(np.floor(v * 14).astype(int) + 7 * k, np.floor((u + w) * 14).astype(int)) % 5
            ii = np.where(h == 0, clampi(idx - 1), idx)
            tie = (np.abs(np.abs(v) - 0.38) < 0.04) & (k != 1)
            return np.where(tie, R('wood'), R('ochre')), np.where(tie, 3, ii)
        edge = _edge(k, uvw, (dd / 2, ww / 2, H / 2))
        ii = np.where(edge, clampi(idx - 1), idx)
        ii = np.where(~edge & (((w + H / 2) / 0.14) % 1.0 < 0.12), clampi(ii + 1), ii)
        if kind == 'stove':
            gap = ~edge & (((w + H / 2) / 0.33) % 1.0 > 0.55)
            return np.where(gap, R('blk'), R(tone)), np.where(gap, 2, ii)
        return R(tone), ii
    T.box(0.05, 0.05 + dd, -ww / 2, ww / 2, 0.04, 0.04 + H, tone, oid=o, tex=bt, cast=True)
    return o


# ---------------------------------------------------------------- the platform cart
# D31 (the designer: "the cart is much too large"): back to a hand cart a little longer than a man, 3.4 x 1.6 u, 4 x 2
# cells. Parked: the D27 integration's dray (CART_D27: 4.2 x 3.2 u, 5 x 4 cells); to bring it back put its numbers in
# the two lines below, rebuild and embed, and set CARGO27 and FR's cart numbers in index.html back (see DEV_NOTES D31).
CART_D27 = dict(L=4.2, W=3.2, ROWS=4, COLS=5)
CART_L, CART_W, CART_TOP = 3.4, 1.6, 0.85
CART_ROWS, CART_COLS = 2, 4
CART_R = 0.3
CELL = 0.8


def cart_cells():
    """The bed's cells (CART_COLS x CART_ROWS) in the cart's own frame (a forwards, b to the left of travel... here +z), u from the
    cart's centre: [(c, r, a, b)]; c 0..3 from the handle end to the front, r 0 (left, -b) to 2 (+b)."""
    out = []
    for c in range(CART_COLS):
        for r in range(CART_ROWS):
            out.append((c, r, -CELL * CART_COLS / 2 + CELL * (c + 0.5), -CART_W / 2 + CELL * (r + 0.5)))
    return out


def platform_cart(phase=0.0, o=None):
    """The four-wheel station cart: a plank bed CART_L x CART_W u at 0.85 u on an iron-strapped frame, four small iron
    wheels, low rails along the sides, a push handle at the rear (-x) end at 1.0 u. Facing +x. Anchor: its centre
    at the ground."""
    o = o or new_oid(True)
    hl, hw = CART_L / 2, CART_W / 2
    # wheels (both sides), axles
    for ax in (-hl + 0.55, hl - 0.55):
        for bz, near in ((hw - 0.18, True), (-hw + 0.18, False)):
            def wt(part, s, ang, rho, idx):
                a = ang + phase
                sp = (np.abs(((a * 6 / (2 * np.pi)) % 1.0) - 0.5) > 0.36)
                ii = np.where(part != 0, np.where(rho > CART_R - 0.06, 2, np.where(sp | (rho < 0.07), 1, 3)), 3)
                return None, ii
            ocyl((ax, bz + (0.04 if near else -0.04), CART_R), (0, 1, 0), CART_R, 0.04, 'iron', tex=wt, oid=o, ref=(1, 0, 0))
        B(ax - 0.04, -hw + 0.2, CART_R - 0.04, ax + 0.04, hw - 0.2, CART_R + 0.04, 'iron', shades=(1, 2, 3), oid=o)
    # frame and bed
    B(-hl + 0.1, -hw + 0.12, 0.58, hl - 0.1, -hw + 0.24, 0.72, 'iron', shades=(1, 2, 3), oid=o)
    B(-hl + 0.1, hw - 0.24, 0.58, hl - 0.1, hw - 0.12, 0.72, 'iron', shades=(1, 2, 3), oid=o)
    for ax in (-hl + 0.55, hl - 0.55):
        B(ax - 0.12, -hw + 0.3, CART_R + 0.04, ax + 0.12, hw - 0.3, 0.6, 'iron', shades=(1, 2, 3), oid=o)   # spring blocks
    def bed(face, x, z, y, idx):
        rr = np.full(x.shape, R('wood'))
        if face == 't':
            ii = np.where(((x + hl) / 0.34) % 1.0 < 0.12, 3, 1)
            h = hash2(np.floor((x + hl) / 0.34).astype(int), np.floor((z + 1) / 0.9).astype(int)) % 3
            ii = np.where((h == 0) & (ii == 1), 2, ii)
            nails = (np.abs(np.abs(z) - (hw - 0.12)) < 0.04) & ((((x + hl) / 0.34) % 1.0) > 0.4) & ((((x + hl) / 0.34) % 1.0) < 0.6)
            return rr, np.where(nails, 3, ii)
        return rr, np.where(y > CART_TOP - 0.05, 3, idx)
    B(-hl, -hw, 0.72, hl, hw, CART_TOP, 'wood', oid=o, tex=bed)
    # iron corner plates and the low side rails (stakes)
    for sx in (-1, 1):
        for sz in (-1, 1):
            B(sx * hl - 0.1, sz * hw - 0.1, 0.7, sx * hl + 0.01, sz * hw + 0.01, CART_TOP + 0.02, 'iron',
              shades=(1, 2, 3), oid=o)
    # push handle: two bent irons rising from the rear corners and the wooden grip bar at 1.0 u
    for bz in (-hw + 0.2, hw - 0.2):
        a, b, c = axes_tilt((-1, 0, 0), 38)
        obox((-hl - 0.2, bz, 0.9), (a, b, c), (0.25, 0.03, 0.03), 'iron', oid=o, cast=True, shades=(1, 2, 3))
    ocyl((-hl - 0.4, 0, 1.03), (0, 1, 0), 0.05, hw - 0.12, 'wood', oid=o, ref=(1, 0, 0))
    # a front towing eye
    B(hl, -0.06, 0.62, hl + 0.12, 0.06, 0.7, 'iron', shades=(1, 2, 3), oid=o)
    return o
