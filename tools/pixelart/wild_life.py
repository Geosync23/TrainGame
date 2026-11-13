# D32 wild country (Artist 3): the wildlife and life along the line, keys wild/life/..., small and sparing, 2 to 4
# frames each. Animals are built with the engine's shapes in a turned frame, so each facing is drawn in the same light
# (never mirrored). Facings as the crew's: se (+x), sw (+z), ne (-z), nw (-x). Scale from the crew: a man is 2.9u, so
# 1u is about 0.62 m (a mule deer 1.6u at the shoulder, a buffalo 2.7u, a fox 0.65u).
import math
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import engine as E
from engine import R
import harness as H
from geom27 import ocyl, obox, axes_tilt
from geom_d32 import Frame

UX, UY = E.U_XZ, E.U_Y
YAW = {'se': 0.0, 'sw': -90.0, 'ne': 90.0, 'nw': 180.0}
DIRS = ('se', 'sw', 'ne', 'nw')


def ball(F, a, c, h, r, ramp, o, sz=1.0, cast=True, noise=0.3, seed=0):
    p = F.pt(a, c, h)
    E.sphere(p[0] * UX, p[1] * UX, p[2] * UY, r * UX, ramp, oid=o, th=(0.8, 0.35, -0.15), sz=sz, cast=cast,
             noise=noise, seed=seed)


def leg(F, a, c, hip, ka, fa, r, ramp, o):
    """A leg from the hip (a, c, hip) to the foot at (a + fa, c, 0), the knee at a + ka half way down."""
    F.rod((a, c, hip), (a + ka, c, hip * 0.5), r, ramp, oid=o)
    F.rod((a + ka, c, hip * 0.5), (a + fa, c, 0.02), r * 0.8, ramp, oid=o)


# ------------------------------------------------------------------------------------------------ the beasts
SPECS = {
    # body length (u), shoulder height, body radius, leg radius, neck, head, colours
    'deer': dict(L=1.9, sh=1.45, br=0.42, lr=0.06, neck=0.75, head=0.24, coat='wood', ci=1, belly='cream',
                 legs='wood', tail='cream', ears=True),
    'buck': dict(L=2.0, sh=1.5, br=0.45, lr=0.065, neck=0.75, head=0.25, coat='wood', ci=2, belly='cream',
                 legs='wood', tail='cream', ears=True, antlers=True),
    'buffalo': dict(L=3.2, sh=2.0, br=0.8, lr=0.13, neck=0.45, head=0.4, coat='umber', ci=2, belly='umber',
                    legs='umber', tail='umber', hump=True),
    'fox': dict(L=0.95, sh=0.62, br=0.2, lr=0.035, neck=0.3, head=0.15, coat='ochre', ci=1, belly='cream',
                legs='dark', tail='ochre', brush=True, ears=True),
}


def quad(kind, pose, f, d):
    """A four-legged beast. pose: 'graze' (head down; f 0..1 a bite), 'look' (head up; f 0..1 an ear and the tail),
    'walk' (f 0..3), 'trot' (f 0..3), 'sit' (f 0..1)."""
    s = SPECS[kind]
    o = E.new_oid(True)
    F = Frame(yaw=YAW[d])
    L, sh, br, lr = s['L'], s['sh'], s['br'], s['lr']
    hip = sh - br * 0.5
    fa, ba = L * 0.36, -L * 0.36          # the shoulder and the hip along the body
    sit = pose == 'sit'
    # legs: a walking cycle (diagonal pairs), or standing
    sw = {'walk': 0.22, 'trot': 0.3}.get(pose, 0.0) * L
    ph = [0, math.pi] if pose in ('walk', 'trot') else [0, 0]
    t = f * math.pi / 2
    for side, c in ((1, br * 0.55), (-1, -br * 0.55)):
        p0 = t + (0 if side > 0 else math.pi)
        p1 = p0 + math.pi
        if sit:
            leg(F, fa, c, hip, 0.02, 0.05, lr, s['legs'], o)
            F.rod((ba, c, hip * 0.35), (ba + 0.35 * L, c, 0.05), lr * 1.6, s['coat'], oid=o)
        else:
            leg(F, fa, c, hip, 0.03 + sw * 0.5 * math.sin(p0), sw * math.sin(p0), lr, s['legs'], o)
            leg(F, ba, c, hip, -0.06 + sw * 0.5 * math.sin(p1), sw * math.sin(p1), lr, s['legs'], o)
    # the body: three balls along it (the hump's higher for the buffalo)
    tilt = 0.28 if sit else 0.0
    hb = hip + br * 0.35
    for k, (a, rr_, dh) in enumerate(((fa * 0.95, br * (1.15 if s.get('hump') else 1.0), 0.12 if s.get('hump') else 0.0),
                                      (0.0, br * 1.0, 0.0), (ba * 0.95, br * 0.92, 0.0))):
        h = hb + dh + (k - 1) * -tilt * L * 0.4
        ball(F, a, 0, h, rr_, s['coat'], o, sz=0.9, seed=k + 3)
    if s.get('hump'):
        ball(F, fa * 0.9, 0, hb + br * 0.9, br * 0.8, s['coat'], o, sz=0.9, seed=9)
        ball(F, fa * 1.05, 0, hb + br * 0.1, br * 0.95, 'bark', o, sz=1.0, seed=10)          # the shaggy forequarters
    ball(F, 0.0, 0, hb - br * 0.55, br * 0.55, s['belly'], o, sz=0.6, cast=False, seed=11)
    # neck and head
    if pose == 'graze':
        hx, hy = fa + L * (0.42 if not s.get('hump') else 0.3), (0.3 if not s.get('hump') else 0.5) + (0.05 if f else 0.0)
    elif pose in ('look', 'sit'):
        hx, hy = fa + L * 0.2, sh + s['neck'] * (0.9 if not s.get('hump') else 0.2) + (0.15 if sit else 0)
    else:
        hx, hy = fa + L * 0.3, sh + s['neck'] * (0.55 if not s.get('hump') else 0.0)
    nb = (fa + 0.05, 0.0, hb + br * 0.4)
    F.rod(nb, (hx - 0.05, 0.0, hy), s['head'] * (0.55 if not s.get('hump') else 0.75), s['coat'] if not s.get('hump') else 'bark', oid=o)
    ball(F, hx, 0, hy, s['head'], s['coat'], o, sz=0.9, seed=12)
    ball(F, hx + s['head'] * 1.1, 0, hy - s['head'] * (0.5 if pose != 'graze' else 0.1), s['head'] * 0.6,
         'dark' if kind != 'fox' else 'cream', o, sz=0.9, seed=13)                                   # the muzzle
    if s.get('ears'):
        tw = 0.08 if (pose == 'look' and f == 1) else 0.0
        for c in (-1, 1):
            F.rod((hx - 0.02, c * s['head'] * 0.5, hy + s['head'] * 0.6),
                  (hx - 0.12 + tw * c, c * s['head'] * 1.2, hy + s['head'] * 1.6), 0.035 if kind != 'fox' else 0.03,
                  s['coat'] if kind != 'fox' else 'dark', oid=o)
    if s.get('antlers'):
        for c in (-1, 1):
            b = (hx - 0.05, c * 0.1, hy + s['head'] * 0.8)
            F.rod(b, (hx - 0.15, c * 0.45, hy + 0.55), 0.03, 'cream', oid=o)
            F.rod((hx - 0.12, c * 0.35, hy + 0.4), (hx + 0.1, c * 0.38, hy + 0.7), 0.025, 'cream', oid=o)
    if s.get('hump'):
        for c in (-1, 1):
            F.rod((hx, c * 0.3, hy + 0.2), (hx + 0.05, c * 0.45, hy + 0.42), 0.04, 'dark', oid=o)        # horns
        ball(F, hx - 0.1, 0, hy - 0.25, s['head'] * 0.9, 'bark', o, sz=1.2, seed=14)                  # the beard
    # the tail
    if s.get('brush'):
        lift = 0.15 if (pose == 'sit' and f == 1) else 0.0
        F.rod((ba - 0.1, 0, hb), (ba - L * 0.45, 0.1 if sit else 0, hb - 0.25 + lift), 0.09, 'ochre', oid=o)
        ball(F, ba - L * 0.52, 0.1 if sit else 0, hb - 0.28 + lift, 0.09, 'cream', o, sz=1.0)
    else:
        flick = 0.12 if (pose == 'look' and f == 1) else 0.0
        F.rod((ba - 0.15, 0, hb + 0.1), (ba - 0.3, 0, hb - 0.2 + flick), 0.07 if kind != 'buffalo' else 0.05,
              s['tail'], oid=o)


def prairie_dog(f):
    """A prairie dog at its burrow (facing the viewer): 0 only the mound, 1 peeking, 2 sitting up, 3 calling (head
    thrown back)."""
    for k in range(10):
        a = k * 0.63
        E.sphere(math.cos(a) * 1.4, math.sin(a) * 1.2, 0.1, 0.9, 'dirt', noise=0.4, seed=880 + k, sz=0.45, cast=False)
    E.box(-0.45, -0.35, 0.0, 0.45, 0.35, 0.3, 'dark', shades=(2, 2, 2), cast=False)
    if f == 0:
        return
    o = E.new_oid(True)
    F = Frame(yaw=-90)
    up = {1: 0.12, 2: 0.42, 3: 0.44}[f]
    if f >= 2:
        ball(F, 0, 0, 0.16, 0.13, 'dirt', o, sz=1.4)
        ball(F, 0, 0, 0.32, 0.11, 'dirt', o, sz=1.2)
    hb = 0.14 if f == 1 else 0.48
    back = 0.05 if f == 3 else 0.0
    ball(F, back * -1, 0, hb, 0.1, 'dirt', o, sz=1.0)
    ball(F, 0.08 - back, 0, hb - 0.03 + back * 0.6, 0.05, 'wood', o, sz=0.9)
    if f >= 2:
        for c in (-1, 1):
            F.rod((0.05, c * 0.06, 0.34), (0.1, c * 0.07, 0.26 + (0.08 if f == 3 else 0)), 0.02, 'dirt', oid=o)


def duck(f, d, drake=True):
    """A mallard on the water, bobbing (2 frames), with a little V of ripples behind."""
    o = E.new_oid(True)
    F = Frame(yaw=YAW[d])
    bob = 0.02 * f
    ball(F, 0.0, 0, 0.08 + bob, 0.22, 'umber' if not drake else 'cream', o, sz=0.55)
    ball(F, -0.18, 0, 0.12 + bob, 0.14, 'umber' if not drake else 'iron', o, sz=0.6)
    ball(F, 0.2, 0, 0.3 + bob, 0.1, 'green' if drake else 'umber', o, sz=1.0)
    ball(F, 0.31, 0, 0.28 + bob, 0.05, 'ochre', o, sz=0.6)
    if drake:
        ball(F, 0.15, 0, 0.2 + bob, 0.08, 'cream', o, sz=0.4, cast=False)
    # ripples: two short bright lines spreading behind
    for c in (-1, 1):
        F.rod((-0.3, c * (0.15 + 0.05 * f), 0.0), (-0.65 - 0.1 * f, c * (0.35 + 0.08 * f), 0.0), 0.02, 'cream')


def hawk(f):
    """A red-tailed hawk circling high: wings spread (0), raised in a glide (1), a beat (2)."""
    o = E.new_oid(True)
    F = Frame(yaw=30)
    ball(F, 0, 0, 0, 0.12, 'umber', o, sz=0.8, cast=False)
    ball(F, 0.18, 0, 0.02, 0.07, 'umber', o, sz=0.9, cast=False)
    F.rod((-0.1, 0, 0), (-0.4, 0, -0.02), 0.07, 'brick', oid=o)                 # the red tail
    dip = (0.0, 0.18, -0.15)[f]
    for c in (-1, 1):
        F.rod((0.0, c * 0.08, 0.0), (-0.02, c * 0.55, dip * 0.5), 0.05, 'umber', oid=o)
        F.rod((-0.02, c * 0.55, dip * 0.5), (-0.1, c * 0.95, dip), 0.04, 'ochre', oid=o)


def hawk_shadow(f, w=64, h=40):
    """The hawk's shadow on the ground, flattened as the ground is drawn: a 50% ink silhouette of the spread
    wings (3 frames as the hawk above). Anchor its middle; slide it across the country."""
    img = np.zeros((h, w, 4), np.uint8)
    cx, cy = w // 2, h // 2
    yy, xx = np.mgrid[0:h, 0:w]
    U = (xx + 0.5 - cx) / 16.0; V = (yy + 0.5 - cy) / 8.0
    gx = U + V; gz = V - U                      # ground point (u)
    a = math.radians(30)
    al = gx * math.cos(a) - gz * math.sin(a)    # along the flight
    ac = gx * math.sin(a) + gz * math.cos(a)    # across
    span = (1.0, 0.85, 0.72)[f]
    sweep = (0.0, 0.05, -0.08)[f]
    body = (al / 0.45) ** 2 + (ac / 0.14) ** 2 < 1
    tail = (al < -0.2) & (al > -0.75) & (np.abs(ac) < 0.12 + (-0.2 - al) * 0.25)
    wing = (np.abs(ac) < span * 1.0) & (al < 0.12 - np.abs(ac) * sweep) & (al > -0.2 - np.abs(ac) * 0.12) & \
           (np.abs(ac) > 0.05)
    tips = (np.abs(ac) > span * 0.75) & (np.abs(ac) < span) & (np.mod(np.abs(ac) * 14, 1.0) < 0.55)
    m = body | tail | (wing & ~((np.abs(ac) > span * 0.75) & ~tips))
    img[m] = E.SHADOW_RGBA
    return img, (cx, cy)


def smoke(f):
    """Smoke from a far cabin's chimney: puffs rising and leaning away on the wind, 4 frames in a loop."""
    for k in range(5):
        t = (k + f / 4.0)
        y = t * 0.75
        x = t * t * 0.09 + 0.06 * math.sin(t * 2.0)
        r = 0.18 + t * 0.08
        E.sphere(x * UX, -0.05 * t * UX, y * UY, r * UX, 'smoke', th=(0.7, 0.3, -0.2), noise=0.4, seed=k, sz=0.85,
                 cast=False)


# ------------------------------------------------------------------------------------------------ registration
def _r(draw, shadow=None, canvas=(160, 160), origin=(80, 110)):
    return H.render(draw, shadow=shadow, canvas=canvas, origin=origin)


def register(reg, only=None):
    if only is not None and 'life' not in only:
        return
    g = 'wild_life'
    FOOTN = 'the beast\'s middle on the ground'
    for kind, poses, note in (('deer', (('graze', 2), ('look', 2), ('walk', 4)), 'a mule deer doe at the wood\'s edge'),
                              ('buck', (('graze', 2), ('look', 2)), 'a mule deer buck'),
                              ('buffalo', (('graze', 2), ('walk', 4)), 'a buffalo far off on the prairie'),
                              ('fox', (('trot', 4), ('sit', 2)), 'a red fox')):
        sh = {'deer': (-10, -8, 12, 8), 'buck': (-10, -8, 12, 8), 'buffalo': (-16, -10, 18, 10), 'fox': (-6, -5, 7, 5)}[kind]
        for pose, n in poses:
            for d in DIRS:
                reg.add(f'wild/life/{kind}/{pose}/{d}', g,
                        [_r(lambda f=f, d=d, pose=pose, kind=kind: quad(kind, pose, f, d), shadow=sh) for f in range(n)],
                        dict(anchor=FOOTN, note=f'{note}: {pose}, {n} frames, facing {d}'))
    reg.add('wild/life/prairie_dog', g, [_r(lambda f=f: prairie_dog(f), shadow=(-5, -5, 6, 5)) for f in range(4)],
            dict(anchor='the burrow\'s middle', note='a prairie dog at its burrow, facing the viewer: 0 down the hole, '
                 '1 peeking, 2 sitting up, 3 calling; play 0 1 2 2 3 2 1 0 with pauses'))
    for d in ('se', 'nw', 'sw', 'ne'):
        reg.add(f'wild/life/duck/{d}', g, [_r(lambda f=f, d=d: duck(f, d, True)) for f in range(2)],
                dict(anchor='on the water\'s surface (draw at the water level)', note=f'a mallard drake swimming {d}, '
                     'bobbing (2 frames); move it slowly'))
        reg.add(f'wild/life/duck_hen/{d}', g, [_r(lambda f=f, d=d: duck(f, d, False)) for f in range(2)],
                dict(anchor='on the water\'s surface', note=f'a mallard hen swimming {d}'))
    reg.add('wild/life/hawk/fly', g, [_r(lambda f=f: hawk(f), origin=(80, 80)) for f in range(3)],
            dict(anchor='the bird\'s middle (draw it high: about 12u up, over the far side)', note='a red-tailed hawk '
                 'circling: 3 frames (spread, glide, beat)'))
    reg.add('wild/life/hawk/shadow', g, [hawk_shadow(f) for f in range(3)],
            dict(anchor='the shadow\'s middle on the ground', note='the hawk\'s shadow crossing the ground (50% ink, '
                 'as every shadow): slide it along +x about 6u a second; 3 frames with the hawk'))
    reg.add('wild/life/smoke', g, [_r(lambda f=f: smoke(f), canvas=(120, 160), origin=(40, 140)) for f in range(4)],
            dict(anchor='the chimney\'s top (wild/mark/far_cabin\'s extra.chimney)', note='smoke from a far cabin, '
                 '4 frames in a loop'))
