# Sprite module: D32 the wild country's NEAR side (south of the line, down the screen), its landmarks and its
# wildlife (plans/d32-journey.md; owner: Artist 3). Keys (plans/pixel/d32/near/README.md lists them all):
#   wild/near/<region>/edge/<n>        the border itself, 8u along x, local z 0 .. 10 (low, or falling away)
#   wild/near/<region>/mid/<n>         what lies beyond it, 16u along x, local z 10 .. 34
#   wild/near/<region>/far/<n>         and further, 16u along x, local z 34 .. 58 (the region's tiles go on after)
#   wild/near/<a>_to_<b>/<band>        a 16u blend from region a to the next region b, for each band
#   .../water/<f>                      for a piece with water: f = 0..2, only its water pixels, drawn over the piece
#   wild/mark/...                      the landmarks (wild_marks.py)
#   wild/life/...                      the wildlife (wild_life.py)
# Every piece is anchored at its corner (x of its -x end, local z 0) at ground level: put local z 0 at the
# corridor's south edge (EDGE_Z, 9u in the review sheets). Draw all edge pieces, then all mid, then all far (each
# band in any order along x): a band nearer the viewer always wins where they overlap.
# For a quick look at one region: WILD_ONLY=canyon python3 tools/pixelart/build.py wild_near
import os
import numpy as np
import wild_regions as WR
import wild_pieces as WP

EDGE_Z = 9.0
N_EDGE = 4
N_MID = 3
N_FAR = 2
NOTE_BAND = {'edge': 'the border, 8u along x, local z 0 .. 10',
             'mid': 'beyond the border, 16u along x, local z 10 .. 34',
             'far': 'further beyond, 16u along x, local z 34 .. 58'}
ANCHOR = ('the piece\'s corner at its -x end on local z 0, at ground level (y 0): put local z 0 at the corridor\'s '
          'south edge; may lie outside the picture')


def _only():
    o = os.environ.get('WILD_ONLY')
    return set(o.split(',')) if o else None


def register_piece(reg, key, R, band, v, note):
    fr, ov, meta = WP.piece(R, band, v)
    group = 'wild_' + (R.key.split('_to_')[0] if '_to_' in R.key else R.key)
    extra = dict(len=meta['L'], z0=meta['z0'], z1=meta['z1'], band=band)
    reg.add(key, group, [fr[0]], dict(anchor=ANCHOR, note=note, extra=extra))
    if ov:
        reg.add(key + '/water', group, ov, dict(anchor='as ' + key, note='the water pixels of each frame (3 frames), '
                                                 'drawn over the piece; frame 0 is already in the piece'))


def register_near(reg):
    only = _only()
    regs = WR.REGIONS
    for R in regs:
        if only and R.key not in only:
            continue
        for band, n in (('edge', N_EDGE), ('mid', N_MID), ('far', N_FAR)):
            for v in range(n):
                register_piece(reg, f'wild/near/{R.key}/{band}/{v + 1}', R, band, v,
                               f'{R.key}: {NOTE_BAND[band]}; variant {v + 1} of {n}, joins any other')
    for A, B in zip(regs[:-1], regs[1:]):
        if only and A.key not in only and B.key not in only:
            continue
        bl = WR.Blend(A, B)
        for band in ('edge', 'mid', 'far'):
            register_piece(reg, f'wild/near/{bl.key}/{band}', bl, band, 0,
                           f'the blend from {A.key} to {B.key}, 16u: {A.key} at its -x end, {B.key} at its +x end')


def register(reg):
    register_near(reg)
    try:
        import wild_marks
        wild_marks.register(reg, _only())
    except ImportError:
        pass
    try:
        import wild_life
        wild_life.register(reg, _only())
    except ImportError:
        pass
