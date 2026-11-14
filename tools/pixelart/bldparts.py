# D32 stage 3 (the buildings artist): buildings that open. Every enterable building is cut into four parts that line
# up pixel for pixel with its whole sprite (plans/d32-rooms-art.md, the Rooms builder's contract):
#   <B>/floor  the floor of the whole interior, at the floor's height
#   <B>/back   the inner faces of the two far walls (-x and -z) seen from inside, with what is fixed to them
#   <B>/front  the walls on the +x and +z faces, from the ground to the eaves, and what stands on them
#   <B>/roof   everything above the eaves
# front + roof drawn over back + floor give exactly the whole sprite (check_bldparts.py proves it from the atlas).
#
# How: the whole building is drawn once with the part tags of ptag.py (its drawing code says which shapes are walls,
# roof, the false front ...); its pixels go to front, roof or back by tag (a front pixel above the eaves goes to the
# roof). The interior (the far walls' inner faces, their windows, pictures, pegs and the floor) is a second drawing on
# the same canvas; its pixels fill the part of the building the front and roof cover (they are hidden in the whole).
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import night27 as N
import engine as E
import ptag
from ptag import tag, BACK, FRONT, ROOF, FLOOR, NONE
from engine import R, box, cyl_z, cyl_x, sphere, hash2, new_oid
from town import Paint, rect, clampi, Frame

U = 4.0
UY = 16.0 / 3.0
TH = 1.0          # inner wall thickness (MU): its cut top shows as a 1 to 2 px line


# ============================ rendering on a full canvas ============================

def render_full(draw, after=None, canvas=(500, 440), origin=(250, 320), outline=True, shadows=True, shadow=None):
    """Draw on a fresh canvas; return (rgba, tags, qz) for the whole canvas (not cropped)."""
    E.begin(canvas[0], canvas[1], origin[0], origin[1])
    draw()
    if shadow is not None:
        E.shadow_catcher(*shadow)
    if shadows:
        E.cast_shadows()
    if outline:
        E.outlines()
    if after is not None:
        after()
    return E.render_rgba(), ptag.TB[0].copy(), E.QZ.copy()


def render_lit_full(draw, after=None, canvas=(500, 440), origin=(250, 320), **kw):
    """(day, lit, tags, qz) on the full canvas, from night27.render_pair (one render, only lit pixels differ)."""
    (d, an), (n, _) = N.render_pair(draw, after=after, canvas=canvas, origin=origin, **kw)
    tb, qz = ptag.TB[0].copy(), E.QZ.copy()
    full_d = np.zeros((canvas[1], canvas[0], 4), np.uint8)
    full_n = full_d.copy()
    c0, r0 = origin[0] - an[0], origin[1] - an[1]
    full_d[r0:r0 + d.shape[0], c0:c0 + d.shape[1]] = d
    full_n[r0:r0 + n.shape[0], c0:c0 + n.shape[1]] = n
    return full_d, full_n, tb, qz


def crop(img, origin):
    """Crop to the opaque pixels and pad so the anchor lies inside the frame (as town27_reg does)."""
    a = img[..., 3] > 0
    if not a.any():
        return None
    ys, xs = np.nonzero(a)
    r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = img[r0:r1, c0:c1].copy()
    ax, ay = origin[0] - c0, origin[1] - r0
    h, w = out.shape[:2]
    l, t = max(0, -ax), max(0, -ay)
    r, b = max(0, ax + 1 - w), max(0, ay + 1 - h)
    if l or t or r or b:
        out = np.pad(out, ((t, b), (l, r), (0, 0)))
        ax, ay = ax + l, ay + t
    return out, (int(ax), int(ay))


def split(whole, tb, qz, inner, itb, eave_mu, lit=None, inner_lit=None, floor=None):
    """The four parts (full canvas RGBA each) from the tagged whole and the tagged interior."""
    T = tb.copy()
    op = whole[..., 3] > 0
    stray = int(((T == NONE) & op).sum())
    T[T == NONE] = BACK
    T[(T == FRONT) & (qz > eave_mu + 0.05)] = ROOF
    hidden = op & ((T == FRONT) | (T == ROOF))
    def pick(img, m):
        out = np.zeros_like(img)
        out[m] = img[m]
        return out
    iop = inner[..., 3] > 0
    parts = {
        'front': pick(whole, op & (T == FRONT)),
        'roof': pick(whole, op & (T == ROOF)),
        'back': pick(whole, op & (T == BACK)),
        'floor': pick(inner, hidden & iop & (itb == FLOOR)),
    }
    ib = hidden & iop & (itb != FLOOR)
    if floor is not None:            # the floor under the far walls and fixtures, from the floor-only drawing
        fill = hidden & (floor[..., 3] > 0) & ~(iop & (itb == FLOOR))
        parts['floor'][fill] = floor[fill]
    parts['back'][ib] = inner[ib]
    if lit is not None:
        parts['front_lit'] = pick(lit, op & (T == FRONT))
        parts['roof_lit'] = pick(lit, op & (T == ROOF))
        bl = pick(lit, op & (T == BACK))
        if inner_lit is not None:
            bl[ib] = inner_lit[ib]
        else:
            bl[ib] = inner[ib]
        parts['back_lit'] = bl
    return parts, stray


# ============================ interior: walls, fixtures, floors ============================

def _paper(p, u, z, kind, ramp, ii0):
    """Wallpaper and wall finishes (painted on Paint p; u along the wall, z up from the floor)."""
    if kind == 'stripe':
        p.fill(np.mod(u, 3.2) < 1.0, ramp, clampi(ii0 + 1))
        p.fill((np.mod(u, 3.2) >= 1.6) & (np.mod(u, 3.2) < 2.0), ramp, clampi(ii0 - 1))
    elif kind == 'diamond':
        du = np.abs(np.mod(u, 4.0) - 2.0)
        dz = np.abs(np.mod(z + np.where(np.mod(np.floor(u / 4.0), 2) == 0, 0, 2.0), 4.0) - 2.0)
        p.fill(du + dz * 0.9 < 0.9, ramp, clampi(ii0 + 1))
    elif kind == 'sprig':
        row = np.floor(z / 3.0)
        off = np.where(np.mod(row, 2) == 0, 0.0, 1.8)
        dot = (np.abs(np.mod(u + off, 3.6) - 1.8) < 0.5) & (np.abs(np.mod(z, 3.0) - 1.5) < 0.6)
        p.fill(dot, ramp, clampi(ii0 + 1))
    elif kind == 'boards':
        f = np.mod(u, 2.6)
        p.ii = np.where(f < 0.45, clampi(ii0 + 1), p.ii)
        hb = hash2(np.floor(u / 2.6).astype(int), 17) % 5
        p.ii = np.where((hb == 0) & (f >= 0.45), clampi(ii0 + 1), np.where((hb == 3) & (f >= 0.45), clampi(ii0 - 1), p.ii))
    elif kind == 'planks':        # horizontal boards
        p.ii = np.where(np.mod(z, 2.0) < 0.45, clampi(ii0 + 1), p.ii)
        hb = hash2(np.floor(z / 2.0).astype(int), np.floor((u + np.floor(z / 2.0) * 3.3) / 9.0).astype(int)) % 6
        p.ii = np.where((hb == 0) & (np.mod(z, 2.0) >= 0.45), clampi(ii0 + 1), p.ii)
    elif kind == 'logs':
        f = np.mod(z, 2.4)
        p.fill(f < 0.5, 'cream', clampi(ii0 + 1))                   # chinking between the logs
        p.ii = np.where((f > 0.5) & (f < 0.9), clampi(ii0 - 1), np.where(f > 2.0, clampi(ii0 + 1), p.ii))
        knot = hash2(np.floor(u / 1.7).astype(int), np.floor(z / 2.4).astype(int)) % 23 == 0
        p.fill(knot & (f > 0.9) & (f < 2.0), ramp, clampi(ii0 + 1))
    elif kind == 'plaster':
        h = hash2(np.floor(u * 1.5).astype(int), np.floor(z * 1.5).astype(int)) % 41
        p.ii = np.where(h == 0, clampi(ii0 + 1), p.ii)
    elif kind == 'stone':
        row = np.floor(z / 2.7).astype(int)
        hw = 3.6 + (hash2(row, 3) % 3)
        off = (hash2(row, 11) % 7) * 0.6
        col = np.floor((u + off) / hw).astype(int)
        joint = (np.mod(z, 2.7) < 0.5) | (np.mod(u + off, hw) < 0.5)
        hb = hash2(col, row) % 5
        p.ii = np.where(joint, clampi(ii0 + 1), np.where(hb == 0, clampi(ii0 - 1), p.ii))
    elif kind == 'brick':
        row = np.floor(z / 1.34).astype(int)
        off = np.where(row % 2 == 0, 0.0, 1.4)
        mort = (np.mod(z, 1.34) < 0.42) | (np.mod(u + off, 2.8) < 0.45)
        p.ii = np.where(mort, clampi(ii0 + 1), p.ii)


def _picture(p, u, z, u0, u1, z0, z1, frame='brass', scene='land'):
    p.fill(rect(u, z, u0, u1, z0, z1), frame, 1 + p.lit)
    p.fill(rect(u, z, u0, u1, z0, z1) & ((np.abs(u - u0) < 0.45) | (np.abs(u - u1 + 0.45) < 0.45) | (z < z0 + 0.5)),
           frame, 2 + p.lit)
    i0, i1, j0, j1 = u0 + 0.7, u1 - 0.7, z0 + 0.7, z1 - 0.7
    m = rect(u, z, i0, i1, j0, j1)
    if scene == 'land':
        t = (z - j0) / max(0.1, j1 - j0)
        hill = t < 0.35 + 0.15 * np.sin((u - i0) * 1.3)
        p.fill(m & ~hill, 'glass', 0)
        p.fill(m & hill, 'sage', 1 + p.lit)
        p.fill(m & (t < 0.15), 'sage', 2 + p.lit)
    elif scene == 'portrait':
        cu, cz = (i0 + i1) / 2, (j0 + j1) / 2
        p.fill(m, 'umber', 3)
        p.fill(m & (((u - cu) / 1.0) ** 2 + ((z - cz - 0.6) / 1.2) ** 2 < 1), 'skin', 1)
        p.fill(m & (z < cz - 0.6) & (np.abs(u - cu) < 1.6), 'navy', 2)
    elif scene == 'ship':
        p.fill(m, 'creek', 1)
        p.fill(m & (z < j0 + 1.0), 'creek', 3)
        p.fill(m & (np.abs(u - (i0 + i1) / 2) < 0.3), 'wood', 3)
        p.fill(m & (z > j0 + 1.6) & (np.abs(u - (i0 + i1) / 2 + 0.9) < 0.7), 'cream', 0)
    elif scene == 'text':
        p.fill(m, 'cream', 0)
        p.fill(m & (np.mod(z - j0, 1.4) < 0.5) & (u < i1 - 0.6), 'umber', 3)


def _poster(p, u, z, u0, u1, z0, z1, ramp='cream', head='umber', face=False):
    """A printed notice: paper, a bold heading line, lines of type (a face for WANTED)."""
    m = rect(u, z, u0, u1, z0, z1)
    p.fill(m, ramp, 0 + p.lit)
    p.fill(m & (z > z1 - 1.6) & (z < z1 - 0.6) & (u > u0 + 0.5) & (u < u1 - 0.5), head, 3)
    if face:
        cu, cz = (u0 + u1) / 2, (z0 + z1) / 2 + 0.4
        p.fill(m & (((u - cu) / 1.0) ** 2 + ((z - cz) / 1.3) ** 2 < 1), 'umber', 2)
        p.fill(m & (z < z0 + 1.6) & (z > z0 + 0.6) & (u > u0 + 0.6) & (u < u1 - 0.6), head, 3)
    else:
        p.fill(m & (z < z1 - 2.2) & (z > z0 + 0.6) & (np.mod(z - z0, 1.3) < 0.45) & (u > u0 + 0.5) & (u < u1 - 0.5),
               'umber', 2)


def _clock(p, u, z, uc, zc, r=1.4):
    d = np.hypot(u - uc, (z - zc) * 1.1)
    p.fill(d < r + 0.5, 'wood', 3)
    p.fill(d < r, 'cream', 0)
    p.fill((d < r - 0.2) & (np.abs(u - uc) < 0.25) & (z > zc) & (z < zc + r - 0.4), 'ink' if False else 'dark', 2)
    p.fill((d < r - 0.2) & (np.abs(z - zc) < 0.3) & (u > uc) & (u < uc + r - 0.6), 'dark', 2)


FEATURES = {}


def paint_wall(face_lit, u, z, spec, wall):
    """Paint of one inner wall face. u runs along the wall as seen (left to right), z up from the floor."""
    pr, pi, pk = spec.get('paper', ('cream', 1, 'plaster'))
    lit = face_lit
    p = Paint(pr, u, z, np.full(np.shape(u), pi + lit), lit)
    _paper(p, u, z, pk, spec.get('motif', pr), pi + lit)
    dado = spec.get('dado')
    if dado:
        dr, dh = dado
        dm = z < dh
        p.fill(dm, dr, np.where(np.mod(u, 2.2) < 0.45, 3, 2) + lit)
        p.fill((z >= dh) & (z < dh + 0.8), dr, 1 + lit)                  # the chair rail
    base = spec.get('base', 'wood')
    if base:
        p.fill(z < 1.0, base, 3 + lit)
    top = spec.get('frieze')
    if top:
        p.fill(z > spec['_wh'] - 1.0, top, 2 + lit)
    for f in spec.get('walls', {}).get(wall, ()):
        k = f[0]
        if k == 'window':
            _, u0, u1, z0, z1 = f[:5]
            opt = f[5] if len(f) > 5 else {}
            p.window(u0, u1, z0, z1, trim=opt.get('trim', 'cream'), panes=opt.get('panes', (2, 2)), sill=True,
                     shutters=None)
            cur = opt.get('curtain')
            if cur:
                for c0 in (u0 - 0.9, u1 - 0.9):
                    cm = rect(u, z, c0, c0 + 1.8, z0 - 0.4, z1 + 1.0)
                    p.fill(cm, cur, np.where(np.mod(u - c0, 0.9) < 0.45, 1, 2) + lit)
                p.fill(rect(u, z, u0 - 1.4, u1 + 1.4, z1 + 1.0, z1 + 1.5), 'wood', 3)
        elif k == 'door':
            _, u0, u1, z1 = f[:4]
            opt = f[4] if len(f) > 4 else {}
            p.door(u0, u1, z1, ramp=opt.get('ramp', 'wood'), trim=opt.get('trim', 'cream'),
                   double=opt.get('double', False), panels=opt.get('panels', True))
            if opt.get('transom'):
                p.window(u0, u1, z1 + 1.0, z1 + 3.0, trim=opt.get('trim', 'cream'), panes=(3, 1), sill=False)
            if opt.get('glass'):
                g = rect(u, z, u0 + 0.8, u1 - 0.8, z1 * 0.5, z1 - 1.0)
                p.fill(g, 'glass', np.where(z > z1 - 2.0, 2, 3))
        elif k == 'opening':                 # a doorway with no door (to another room, the stable)
            _, u0, u1, z1 = f[:4]
            p.fill(rect(u, z, u0 - 0.6, u1 + 0.6, 0, z1 + 0.6) & ~rect(u, z, u0, u1, 0, z1), 'wood', 2 + lit)
            p.fill(rect(u, z, u0, u1, 0, z1), 'dark', np.where(z < 1.0, 1, 2))
        elif k == 'picture':
            _, u0, u1, z0, z1 = f[:5]
            opt = f[5] if len(f) > 5 else {}
            _picture(p, u, z, u0, u1, z0, z1, opt.get('frame', 'brass'), opt.get('scene', 'land'))
        elif k == 'poster':
            _, u0, u1, z0, z1 = f[:5]
            opt = f[5] if len(f) > 5 else {}
            _poster(p, u, z, u0, u1, z0, z1, opt.get('ramp', 'cream'), opt.get('head', 'umber'), opt.get('face', False))
        elif k == 'clock':
            _, uc, zc = f[:3]
            _clock(p, u, z, uc, zc)
        elif k == 'mirror':
            _, u0, u1, z0, z1 = f[:5]
            p.fill(rect(u, z, u0 - 0.7, u1 + 0.7, z0 - 0.7, z1 + 0.7), 'brass', 1 + lit)
            g = rect(u, z, u0, u1, z0, z1)
            p.fill(g, 'glass', np.where((u - u0) + (z1 - z) * 0.6 < 1.6, 0, np.where(z > z1 - 1.0, 1, 2)))
        elif k == 'board':                   # a painted board or panel (slate, a map, a chart)
            _, u0, u1, z0, z1, ramp, ii = f[:7]
            p.fill(rect(u, z, u0 - 0.6, u1 + 0.6, z0 - 0.6, z1 + 0.6), 'wood', 2 + lit)
            p.fill(rect(u, z, u0, u1, z0, z1), ramp, ii)
            if len(f) > 7 and f[7] == 'map':
                land = hash2(np.floor(u * 0.8).astype(int), np.floor(z * 0.9).astype(int)) % 3 == 0
                p.fill(rect(u, z, u0, u1, z0, z1) & land, 'sage', 1)
                p.fill(rect(u, z, u0, u1, z0, z1) & (np.abs((u - u0) * 0.4 - (z - z0) + 1.0) < 0.35), 'creek', 2)
            if len(f) > 7 and f[7] == 'chart':
                p.fill(rect(u, z, u0 + 0.5, u1 - 0.5, z0 + 0.5, z1 - 0.5) & (np.mod(z - z0, 1.3) < 0.45), 'umber', 3)
                p.fill(rect(u, z, u0 + 0.5, u1 - 0.5, z0 + 0.5, z1 - 0.5) & (np.mod(u - u0, 2.5) < 0.4), 'umber', 3)
        elif k == 'cross':
            _, uc, z0, z1 = f[:4]
            p.fill((np.abs(u - uc) < 0.5) & (z > z0) & (z < z1), 'brass', 1)
            p.fill((np.abs(u - uc) < 1.8) & (np.abs(z - (z1 - (z1 - z0) * 0.3)) < 0.45), 'brass', 1)
        elif k == 'arch':                    # a tall arched window (the church)
            _, u0, u1, z0, z1 = f[:5]
            uc, hw = (u0 + u1) / 2, (u1 - u0) / 2
            g = (np.abs(u - uc) < hw) & (z > z0) & ((z < z1) | (((u - uc) / hw) ** 2 + ((z - z1) / hw / 1.1) ** 2 < 1))
            fr = (np.abs(u - uc) < hw + 0.6) & (z > z0 - 0.6) & ((z < z1) | (((u - uc) / (hw + 0.6)) ** 2 + ((z - z1) / (hw + 0.6) / 1.1) ** 2 < 1)) & ~g
            p.fill(fr, 'cream', 1 + lit)
            p.fill(g, 'glass', np.where(z > z1, 1, np.where(np.mod(u - u0, 2.0) < 1.0, 2, 3)))
            p.fill(g & ((np.abs(u - uc) < 0.3) | (np.abs(np.mod(z - z0, 3.0)) < 0.3)), 'cream', 1 + lit)
            if len(f) > 5:              # coloured panes
                col = hash2(np.floor((u - u0) / 1.4).astype(int), np.floor((z - z0) / 1.5).astype(int)) % 5
                p.fill(g & (col == 0) & (z < z1), 'red', 1)
                p.fill(g & (col == 1) & (z < z1), 'bloom', 1)
        elif k == 'hearth':                  # a stone fireplace in the wall
            _, u0, u1, z1 = f[:4]
            opt = f[4] if len(f) > 4 else {}
            st = opt.get('ramp', 'rock')
            m = rect(u, z, u0, u1, 0, z1)
            row = np.floor(z / 1.8).astype(int)
            off = np.where(row % 2 == 0, 0, 1.2)
            joint = (np.mod(z, 1.8) < 0.45) | (np.mod(u + off, 2.4) < 0.45)
            p.fill(m, st, np.where(joint, 3, 1 + (hash2(np.floor((u + off) / 2.4).astype(int), row) % 2)))
            op = rect(u, z, u0 + 2.0, u1 - 2.0, 0, z1 * 0.5) & ~((z > z1 * 0.5 - 1.2) & ((np.abs(u - (u0 + u1) / 2)) > (u1 - u0) / 2 - 3.0))
            p.fill(op, 'dark', 2)
            fire = op & (z < 3.0) & (np.abs(u - (u0 + u1) / 2) < (3.0 - z) * 0.8)
            p.fill(fire, 'fire', np.where(z < 1.2, 0, 1))
            p.fill(rect(u, z, u0 - 0.6, u1 + 0.6, z1 * 0.5 + 0.2, z1 * 0.5 + 1.2), 'wood', 2 + lit)   # the mantel
        elif k == 'vault':                   # the bank's vault door
            _, uc, zc, r = f[:4]
            d = np.hypot(u - uc, (z - zc) * 1.05)
            p.fill(rect(u, z, uc - r - 1.0, uc + r + 1.0, 0, zc + r + 1.0), 'rock', 2 + lit)
            p.fill(d < r, 'iron', np.where(d > r - 0.7, 3, 1 + lit))
            p.fill(d < 0.9, 'brass', 1)
            for ang in range(6):
                a = ang * math.pi / 3
                p.fill((d < r - 1.2) & (d > 1.0) & (np.abs((u - uc) * math.sin(a) - (z - zc) * math.cos(a)) < 0.3), 'brass', 2)
        elif k == 'sconce':                  # a wall lamp (dark glass by day, lit at night as the door lamps)
            _, uc, zc = f[:3]
            p.fill(rect(u, z, uc - 0.3, uc + 0.3, zc - 1.6, zc), 'brass', 2)
            p.fill(rect(u, z, uc - 0.7, uc + 0.7, zc, zc + 2.4), 'lamp', np.where(z > zc + 1.8, 1, 2))
            p.fill(rect(u, z, uc - 0.5, uc + 0.5, zc + 2.4, zc + 3.2), 'iron', 3)
        elif k == 'hatch':                   # a ticket or serving hatch
            _, u0, u1, z0, z1 = f[:5]
            p.fill(rect(u, z, u0 - 0.6, u1 + 0.6, z0 - 1.0, z1 + 0.6), 'wood', 1 + lit)
            p.fill(rect(u, z, u0, u1, z0, z1), 'dark', 2)
            p.fill(rect(u, z, u0, u1, z0, z1) & (np.mod(u - u0, 1.2) < 0.4), 'iron', 1)
        elif k == 'stripe':                  # a painted band (the school's alphabet, a rail)
            _, z0, z1, ramp, ii = f[:5]
            m = (z >= z0) & (z < z1)
            if len(f) > 5 and f[5] == 'abc':
                p.fill(m, 'cream', 0 + lit)
                p.fill(m & (np.mod(u, 2.4) < 1.2) & (z > z0 + 0.5) & (z < z1 - 0.5) & (hash2(np.floor(u / 2.4).astype(int), 5) % 3 > 0), ramp, ii)
            else:
                p.fill(m, ramp, ii)
    return p.rr, p.ii


def interior(spec, floor_only=False):
    """Draw the inner faces of the far walls, their fixtures and the floor (world MU, the building's anchor at 0).
    spec: rect (X0, Y0, X1, Y1) of the inside, zf floor height, wh wall top (MU), paper, dado, walls {n, w: features},
    floor (kind, ramp), fix: a function drawing 3D fixtures (shelves, pegs, stairs) with tag 'back'."""
    X0, Y0, X1, Y1 = spec['rect']
    zf, wh = spec['zf'], spec['wh']
    sp = dict(spec)
    sp['_wh'] = wh - zf
    o = new_oid(True)
    def tex_n(face, X, Y, Z, idx):
        if face != 'l':
            return np.full(X.shape, R(spec.get('cut', 'wood'))), np.full(X.shape, 1 if face == 't' else 3)
        return paint_wall(0, X - X0, Z - zf, sp, 'n')
    def tex_w(face, X, Y, Z, idx):
        if face != 'r':
            return np.full(X.shape, R(spec.get('cut', 'wood'))), np.full(X.shape, 1 if face == 't' else 2)
        return paint_wall(1, Y1 - Y, Z - zf, sp, 'w')
    if floor_only:                   # the floor alone (what the far walls hide too), lit as with the walls standing
        E._reg((X0, Y0, zf, X1, Y0 + TH, wh), True)
        E._reg((X0, Y0, zf, X0 + TH, Y1, wh), True)
    tag('back')
    if not floor_only:
        _walls(spec, sp, o, tex_n, tex_w, X0, Y0, X1, Y1, zf, wh)
    tag('floor')
    fk, fr = spec.get('floor', ('planks', 'wood'))
    fo = new_oid(False)
    def ftex(face, X, Y, Z, idx):
        if face != 't':
            return np.full(X.shape, R(fr)), np.full(X.shape, 3 if face == 'l' else 4)
        return floor_tex(fk, fr, X, Y)
    for (fx0, fy0, fx1, fy1) in spec.get('floors', [(X0, Y0, X1, Y1)]):
        box(fx0, fy0, 0.0 if zf > 0.3 else -0.4, fx1, fy1, zf if zf > 0.3 else 0.3, fr, tex=ftex, oid=fo, cast=False,
            shades=(1, 3, 4))
    tag(None)
    return o


def _walls(spec, sp, o, tex_n, tex_w, X0, Y0, X1, Y1, zf, wh):
    box(X0, Y0, zf, X1, Y0 + TH, wh, 'cream', tex=tex_n, oid=o, shades=(1, 1, 2))
    box(X0, Y0, zf, X0 + TH, Y1, wh, 'cream', tex=tex_w, oid=o, shades=(1, 1, 2))
    for (px0, py0, px1, py1, ph, pf) in spec.get('parts', ()):      # partitions: thin walls inside
        pt = dict(sp)
        pt['walls'] = {'n': pf, 'w': pf}
        ns = (px1 - px0) < (py1 - py0)          # a north-south partition shows its +x face; an east-west one its +z face
        def tex_p(face, X, Y, Z, idx, pt=pt, px0=px0, py1=py1, ns=ns):
            if face == 't' or (face == 'l' and ns) or (face == 'r' and not ns):
                return np.full(X.shape, R(spec.get('cut', 'wood'))), np.full(X.shape, 1 if face == 't' else 3)
            if face == 'l':
                return paint_wall(0, X - px0, Z - zf, pt, 'n')
            return paint_wall(1, py1 - Y, Z - zf, pt, 'w')
        box(px0, py0, zf, px1, py1, ph, 'cream', tex=tex_p, oid=o, shades=(1, 1, 2))
    if spec.get('wtop'):             # the west wall goes on up (the back of an east-row false front, raw boards)
        def tex_t(face, X, Y, Z, idx):
            return np.full(X.shape, R('wood')), np.where(np.mod(Y, 1.8) < 0.45, 3, 2) + (face == 't') * -1
        box(X0, Y0, wh, X0 + TH, Y1, spec['wtop'], 'wood', tex=tex_t, oid=o, shades=(1, 1, 2))
    if spec.get('fix'):
        spec['fix'](spec)


def floor_tex(kind, ramp, X, Y):
    if kind == 'planks':          # boards along x, staggered ends
        row = np.floor(Y / 1.6).astype(int)
        seam = np.mod(Y, 1.6) < 0.35
        off = (hash2(row, 9) % 8) * 1.3
        end = np.mod(X + off, 10.0) < 0.35
        h = hash2(row, np.floor((X + off) / 10.0).astype(int)) % 5
        ii = np.where(seam | end, 3, np.where(h == 0, 1, 2))
        return np.full(X.shape, R(ramp)), ii
    if kind == 'planks_z':        # boards along z
        col = np.floor(X / 1.6).astype(int)
        seam = np.mod(X, 1.6) < 0.35
        off = (hash2(col, 9) % 8) * 1.3
        end = np.mod(Y + off, 10.0) < 0.35
        h = hash2(col, np.floor((Y + off) / 10.0).astype(int)) % 5
        ii = np.where(seam | end, 3, np.where(h == 0, 1, 2))
        return np.full(X.shape, R(ramp)), ii
    if kind == 'tile':            # chequered tiles (the bank, the barber)
        c = (np.floor(X / 2.4).astype(int) + np.floor(Y / 2.4).astype(int)) % 2
        rr = np.where(c == 0, R('cream'), R(ramp))
        ii = np.where((np.mod(X, 2.4) < 0.3) | (np.mod(Y, 2.4) < 0.3), 2, np.where(c == 0, 1, 2))
        return rr, ii
    if kind == 'flags':           # stone flags (the jail, the assay office)
        row = np.floor(Y / 3.0).astype(int)
        off = (hash2(row, 4) % 5) * 0.9
        joint = (np.mod(Y, 3.0) < 0.4) | (np.mod(X + off, 3.6) < 0.4)
        h = hash2(np.floor((X + off) / 3.6).astype(int), row) % 4
        return np.full(X.shape, R(ramp)), np.where(joint, 3, 1 + (h == 0))
    # earth: trodden dirt with straw (the smithy, the livery)
    n = hash2(np.floor(X * 2.2).astype(int), np.floor(Y * 2.2).astype(int) + 7) % 100
    rr = np.where(n < 14, R('straw'), R(ramp))
    ii = np.where(n < 14, 2, np.where(n < 55, 1, 2))
    ii = np.where((n > 96), 3, ii)
    return rr, ii


# ---------------------------- 3D fixtures on the far walls (tag 'back') ----------------------------

def shelf_on_n(X0, X1, Y0, z, items=None, ramp='wood', depth=2.0, seed=1):
    """A plank shelf on the north wall (inner face at Y0 + TH) with things on it."""
    o = new_oid(True)
    yb = Y0 + TH
    box(X0, yb, z - 0.6, X1, yb + depth, z, ramp, shades=(0, 2, 3), oid=o)
    for xb in (X0 + 1.0, X1 - 1.6):
        box(xb, yb, z - 2.4, xb + 0.6, yb + depth - 0.4, z - 0.6, ramp, shades=(1, 2, 3), oid=o, cast=False)
    _items_on(items, X0, X1, yb + depth / 2, z, 'x', seed)


def shelf_on_w(Y0, Y1, X0, z, items=None, ramp='wood', depth=2.0, seed=2):
    """A shelf on the west wall (inner face at X0 + TH)."""
    o = new_oid(True)
    xb = X0 + TH
    box(xb, Y0, z - 0.6, xb + depth, Y1, z, ramp, shades=(0, 2, 3), oid=o)
    for yb in (Y0 + 1.0, Y1 - 1.6):
        box(xb, yb, z - 2.4, xb + depth - 0.4, yb + 0.6, z - 0.6, ramp, shades=(1, 2, 3), oid=o, cast=False)
    _items_on(items, Y0, Y1, xb + depth / 2, z, 'y', seed)


def _items_on(items, a0, a1, c, z, axis, seed):
    """Small things standing on a shelf: 'jars', 'plates', 'books', 'bottles', 'tins', 'pots', 'flasks'."""
    if not items:
        return
    a = a0 + 1.2
    k = 0
    while a < a1 - 1.2:
        h = hash2(k + seed * 31, seed) % 7
        kind = items[k % len(items)]
        def P(da, dc=0.0):
            return (a + da, c + dc) if axis == 'x' else (c + dc, a + da)
        o = new_oid(True)
        if kind == 'jars':
            x, y = P(0)
            cyl_z(x, y, z, z + 2.0 + 0.3 * (h % 3), 0.7, ['glass', 'cream', 'bloom', 'red'][h % 4], oid=o)
            cyl_z(x, y, z + 2.0 + 0.3 * (h % 3), z + 2.5 + 0.3 * (h % 3), 0.5, 'iron', oid=o, cast=False)
            a += 1.9
        elif kind == 'bottles':
            x, y = P(0)
            r_ = ['pine', 'brass', 'umber', 'glass'][h % 4]
            cyl_z(x, y, z, z + 2.2, 0.55, r_, oid=o)
            cyl_z(x, y, z + 2.2, z + 3.4, 0.25, r_, oid=o, cast=False)
            a += 1.4
        elif kind == 'plates':
            x, y = P(0)
            if axis == 'x':
                E.disc_y(x, z + 1.4, 1.2, y - 0.6, 'cream', oid=o, kind='flat')
            else:
                E.disc_x(y, z + 1.4, 1.2, x - 0.6, 'cream', oid=o, kind='wheel', spokes=0)
            a += 2.8
        elif kind == 'books':
            for j in range(3 + h % 3):
                x, y = P(j * 0.55)
                hh = 2.0 + (hash2(j, k + seed) % 3) * 0.4
                rr_ = ['red', 'navy', 'green', 'umber', 'ochre'][(j + h) % 5]
                if axis == 'x':
                    box(x - 0.25, y - 0.9, z, x + 0.25, y + 0.9, z + hh, rr_, shades=(1, 2, 3), oid=o, cast=False)
                else:
                    box(x - 0.9, y - 0.25, z, x + 0.9, y + 0.25, z + hh, rr_, shades=(1, 2, 3), oid=o, cast=False)
            a += 0.55 * (3 + h % 3) + 1.0
        elif kind == 'tins':
            x, y = P(0)
            cyl_z(x, y, z, z + 1.6, 0.8, ['red', 'navy', 'ochre', 'green'][h % 4], oid=o)
            a += 2.0
        elif kind == 'pots':
            x, y = P(0)
            cyl_z(x, y, z, z + 1.6, 1.0, 'iron', oid=o, th=(0.4, 0.1, -0.3))
            a += 2.6
        elif kind == 'flasks':
            x, y = P(0)
            sphere(x, y, z + 0.9, 0.9, 'glass', oid=o)
            cyl_z(x, y, z + 1.6, z + 2.8, 0.25, 'glass', oid=o, cast=False)
            a += 2.0
        elif kind == 'crates':
            x, y = P(0)
            box(x - 1.0, y - 0.9, z, x + 1.0, y + 0.9, z + 1.8, 'wood', shades=(1, 2, 3), oid=o)
            a += 2.6
        else:
            a += 1.0
        k += 1


def pegs_n(xs, Y0, z, things):
    """Pegs on the north wall with things hung on them: 'coat', 'hat', 'rope', 'harness', 'saddle', 'tongs',
    'hammer', 'shoes', 'pan', 'gun', 'keys', 'apron'."""
    yb = Y0 + TH
    for x, th in zip(xs, things):
        _hang(x, yb, z, th, 'x')


def pegs_w(ys, X0, z, things):
    xb = X0 + TH
    for y, th in zip(ys, things):
        _hang(y, xb, z, th, 'y')


def _hang(a, wb, z, th, axis):
    """One thing hung on a peg on a wall (axis 'x': the north wall, wb its face's y; 'y': the west wall)."""
    o = new_oid(True)
    def B(a0, a1, d0, d1, z0, z1, ramp, sh=(1, 2, 3), cast=False):
        if axis == 'x':
            box(a + a0, wb + d0, z0, a + a1, wb + d1, z1, ramp, shades=sh, oid=o, cast=cast)
        else:
            box(wb + d0, a + a0, z0, wb + d1, a + a1, z1, ramp, shades=sh, oid=o, cast=cast)
    B(-0.25, 0.25, 0, 0.9, z - 0.3, z + 0.3, 'wood')                  # the peg
    if th == 'coat':
        B(-1.1, 1.1, 0.1, 0.9, z - 6.5, z - 0.2, 'navy' if hash2(int(a * 10), 3) % 2 else 'umber')
        B(-0.5, 0.5, 0.2, 1.0, z - 1.4, z - 0.2, 'navy' if hash2(int(a * 10), 3) % 2 else 'umber')
    elif th == 'hat':
        B(-1.0, 1.0, 0.2, 1.4, z - 0.6, z - 0.2, 'umber')
        B(-0.6, 0.6, 0.4, 1.2, z - 0.2, z + 0.8, 'umber')
    elif th == 'apron':
        B(-0.9, 0.9, 0.1, 0.5, z - 5.5, z - 0.2, 'cream')
    elif th == 'rope':
        for k in range(3):
            B(-1.0 + k * 0.2, 1.0 - k * 0.2, 0.1, 0.7, z - 3.0 + k * 0.6, z - 2.4 + k * 0.6, 'straw')
        B(-0.2, 0.2, 0.1, 0.6, z - 2.6, z - 0.2, 'straw')
    elif th == 'harness':
        B(-1.4, 1.4, 0.1, 0.5, z - 4.2, z - 3.6, 'umber')
        B(-1.4, -1.0, 0.1, 0.5, z - 4.2, z - 0.2, 'umber')
        B(1.0, 1.4, 0.1, 0.5, z - 4.2, z - 0.2, 'umber')
        B(-0.3, 0.3, 0.2, 0.6, z - 5.4, z - 4.2, 'brass')
    elif th == 'collar':
        B(-1.2, 1.2, 0.1, 1.0, z - 4.0, z - 0.2, 'umber')
        B(-0.6, 0.6, 0.0, 1.1, z - 3.2, z - 1.0, 'dark')
    elif th == 'saddle':
        B(-1.8, 1.8, 0.0, 2.6, z - 1.6, z, 'ochre', cast=True)
        B(-1.4, -0.8, 0.2, 2.2, z - 3.8, z - 1.6, 'ochre')
    elif th == 'tongs':
        B(-0.6, -0.3, 0.1, 0.4, z - 4.4, z - 0.2, 'iron')
        B(0.3, 0.6, 0.1, 0.4, z - 4.4, z - 0.2, 'iron')
    elif th == 'hammer':
        B(-0.15, 0.15, 0.1, 0.4, z - 3.6, z - 0.2, 'wood')
        B(-0.7, 0.7, 0.1, 0.6, z - 4.2, z - 3.6, 'iron')
    elif th == 'shoes':
        for k in range(3):
            B(-0.5, 0.5, 0.1, 0.4, z - 1.2 - k * 1.3, z - 0.4 - k * 1.3, 'iron')
    elif th == 'pan':
        B(-0.15, 0.15, 0.1, 0.4, z - 1.6, z - 0.2, 'iron')
        B(-1.1, 1.1, 0.1, 0.5, z - 3.8, z - 1.6, 'iron')
    elif th == 'gun':
        B(-0.2, 0.2, 0.1, 0.6, z - 0.2, z + 0.2, 'iron')
        B(-3.0, 3.0, 0.2, 0.6, z + 0.2, z + 0.7, 'iron')
        B(-3.0, -1.2, 0.2, 0.7, z - 0.4, z + 0.7, 'wood')
    elif th == 'keys':
        B(-0.4, 0.4, 0.1, 0.4, z - 1.4, z - 0.4, 'brass')
    elif th == 'basket':
        B(-1.0, 1.0, 0.1, 1.4, z - 2.4, z - 0.6, 'straw')
    elif th == 'herbs':
        for k in range(3):
            B(-0.9 + k * 0.7, -0.5 + k * 0.7, 0.1, 0.5, z - 2.0 - (k % 2) * 0.6, z - 0.2, 'sage')
    elif th == 'antlers':
        B(-0.6, 0.6, 0.0, 0.3, z - 0.8, z + 0.8, 'wood')
        B(-2.0, -0.4, 0.2, 0.5, z + 0.6, z + 1.0, 'cream')
        B(0.4, 2.0, 0.2, 0.5, z + 0.6, z + 1.0, 'cream')
        B(-2.0, -1.6, 0.2, 0.5, z + 1.0, z + 2.4, 'cream')
        B(1.6, 2.0, 0.2, 0.5, z + 1.0, z + 2.4, 'cream')
    elif th == 'sickle':
        B(-0.15, 0.15, 0.1, 0.4, z - 2.0, z - 0.2, 'wood')
        B(-1.4, 0.15, 0.1, 0.4, z - 2.6, z - 2.0, 'iron')
    elif th == 'washboard':
        B(-1.0, 1.0, 0.1, 0.5, z - 4.6, z - 0.2, 'wood')
        B(-0.8, 0.8, 0.5, 0.6, z - 3.6, z - 1.2, 'iron')


def stairs_w(X0, Ya, Yb, zf, ztop, w=4.0, ramp='wood'):
    """A stair along the west wall rising from Ya (low) to Yb (high, Ya > Yb: up towards the north), with a rail."""
    o = new_oid(True)
    n = 12
    xb = X0 + TH
    for k in range(n):
        y0 = Ya - (Ya - Yb) * (k + 1) / n
        y1 = Ya - (Ya - Yb) * k / n
        box(xb, y0, zf, xb + w, y1, zf + (ztop - zf) * (k + 1) / n, ramp,
            tex=lambda f, X, Y, Z, i: (None, np.where(f == 't', 1, np.where(f == 'l', 2, 3))), oid=o)
    # the rail on posts along the open side
    for k in range(0, n + 1, 4):
        y = Ya - (Ya - Yb) * k / n
        zt = zf + (ztop - zf) * k / n
        box(xb + w - 0.5, y - 0.3, zt, xb + w, y + 0.3, zt + 5.0, 'wood', shades=(1, 2, 3), oid=o, cast=False)
    for k in range(n):
        y0 = Ya - (Ya - Yb) * (k + 1) / n
        y1 = Ya - (Ya - Yb) * k / n
        zt = zf + (ztop - zf) * (k + 0.5) / n + 5.0
        box(xb + w - 0.5, y0, zt - 0.4, xb + w, y1, zt + 0.3, 'wood', shades=(0, 1, 2), oid=o, cast=False)
