# Sprite module: D27 nature pushing against the town (A3, the buildings-and-town artist). Drawing code: nature.py.
# Keys nat/... (plans/proto-sprites.md, "D27: town buildings, nature, props (A3)"). Trees and large plants carry their
# own cast shadow (a 50% ink checker on the ground, hard alpha); small plants and grass are sprites only for what
# stands taller than about 1u (the rest belongs in the ground tiles, plan section 10).
import numpy as np
import harness as H
import nature as N

FOOT = 'foot of the trunk (or the clump\'s centre) at ground level'
CV = dict(canvas=(300, 300), origin=(150, 210))


def _pad(frames):
    out = []
    for img, (ax, ay) in frames:
        h, w = img.shape[:2]
        l, t = max(0, -ax), max(0, -ay)
        r, b = max(0, ax + 1 - w), max(0, ay + 1 - h)
        if l or t or r or b:
            img = np.pad(img, ((t, b), (l, r), (0, 0)))
            ax, ay = ax + l, ay + t
        out.append((img, (ax, ay)))
    return out


def one(draw, shadow=None, **kw):
    o = dict(CV)
    o.update(kw)
    return _pad([H.render(draw, shadow=shadow, **o)])


def register(reg):
    big = (-24, -40, 70, 24)        # ground rectangle (MU) that catches a tree's shadow (it falls to +x, -z)
    mid = (-14, -20, 40, 14)
    small = (-8, -10, 18, 8)
    trees = [('nat/cottonwood/1', lambda: N.cottonwood(0), big, 'plains cottonwood, about 9u'),
             ('nat/cottonwood/2', lambda: N.cottonwood(1), big, 'plains cottonwood, about 11u (the depot square\'s big one)'),
             ('nat/cottonwood/3', lambda: N.cottonwood(2), big, 'young cottonwood, about 8u'),
             ('nat/willow/1', lambda: N.willow(0), mid, 'creekside willow, about 6u'),
             ('nat/willow/2', lambda: N.willow(1), mid, 'smaller willow'),
             ('nat/juniper/1', lambda: N.juniper(0), mid, 'juniper, about 4.5u'),
             ('nat/juniper/2', lambda: N.juniper(1), mid, 'young juniper, about 3u'),
             ('nat/deadtree', N.dead_tree, big, 'dead cottonwood, bare grey limbs')]
    for key, fn, sh, note in trees:
        reg.add(key, 'nature', one(fn, shadow=sh), dict(anchor=FOOT, note=note + '; carries its own shadow'))
    plants = [('nat/sage/1', lambda: N.sagebrush(0), 'sagebrush, about 1.2u'),
              ('nat/sage/2', lambda: N.sagebrush(1), 'sagebrush, 1u'),
              ('nat/sage/3', lambda: N.sagebrush(2), 'big sagebrush, 1.6u'),
              ('nat/sage/4', lambda: N.sagebrush(3), 'small sagebrush'),
              ('nat/rabbitbrush/1', lambda: N.rabbitbrush(0), 'rabbitbrush in flower'),
              ('nat/rabbitbrush/2', lambda: N.rabbitbrush(1), 'smaller rabbitbrush'),
              ('nat/pear/1', lambda: N.prickly_pear(0), 'prickly pear clump'),
              ('nat/pear/2', lambda: N.prickly_pear(1), 'bigger prickly pear with fruit'),
              ('nat/boulder/1', lambda: N.boulder(0), 'boulder, 2u'),
              ('nat/boulder/2', lambda: N.boulder(1), 'two boulders'),
              ('nat/boulder/3', lambda: N.boulder(2), 'boulder group, 2.7u'),
              ('nat/boulder/4', lambda: N.boulder(3), 'small rock'),
              ('nat/outcrop/1', lambda: N.outcrop(0), 'sandstone outcrop, about 5 x 3.5u, 2.8u high'),
              ('nat/outcrop/2', lambda: N.outcrop(1), 'low ledge outcrop, about 4.5 x 3u'),
              ('nat/cattails/1', lambda: N.cattails(0), 'cattails at the creek edge'),
              ('nat/cattails/2', lambda: N.cattails(1), 'a few cattails'),
              ('nat/log_x', lambda: N.fallen_log('x'), 'fallen trunk, 5u along x'),
              ('nat/log_z', lambda: N.fallen_log('z'), 'fallen trunk, 5u along z')]
    for key, fn, note in plants:
        sh = mid if 'outcrop' in key else small
        reg.add(key, 'nature', one(fn, shadow=sh), dict(anchor=FOOT, note=note))
    for v in range(6):
        reg.add(f'nat/grass/{v + 1}', 'nature', [N.grass_clump(v, f) for f in (0, 1)],
                dict(anchor='the clump\'s base, bottom middle', note='tall grass clump; 2 frames: a gust (optional sway)'))
    for v, nm in enumerate(('yellow', 'purple', 'white')):
        reg.add(f'nat/flowers/{v + 1}', 'nature', [N.flowers(v)], dict(anchor='bottom middle', note=nm + ' wildflowers'))
    reg.add('nat/tumbleweed', 'nature', [N.tumbleweed(f) for f in range(4)],
            dict(anchor='the ball\'s contact point with the ground', note='4 frames: rolling (a quarter turn over the 4)'))
