# Sprite module: D32 line building (plans/d32-tech.md 10.2 and 10.3; owner: the D32 artist). Drawing: line_d32.py
# (the right of way, the work piles, the cut, the trestle), country_d32.py (the country's tiles and nature),
# worktrain_d32.py (the work train's cars). Keys: see plans/pixel/d32/README.md.
import numpy as np
import pal27  # noqa: F401
import engine as E
import harness as H
import sprites_ground as SG
import line_d32 as L

TILE = SG.TILE
FOOT = 'the footprint centre at ground level'


def one(draw, shadow=None, **kw):
    o = dict(canvas=(420, 320), origin=(210, 200))
    o.update(kw)
    return [H.render(draw, shadow=shadow, **o)]


def piece_1u(draw):
    """A piece that repeats every 1u along x: drawn long, clipped to 0 <= x < 1u, no outline."""
    def d():
        E.CLIP[0] = (0.0, E.U_XZ)
        draw()
    return [H.render(d, outline=False, shadows=False)]


def register_track(reg):
    g = 'line'
    for name, fn, note in (('ln_cleared', L.cleared, 'the cleared right of way: trampled earth, stubble, chips'),
                           ('ln_bed', L.bed, 'the dug bed: fresh dark earth, pick and shovel marks'),
                           ('ln_rock', L.rock, 'the rock ballast laid on the bed')):
        for v in range(2):
            reg.add(f'tile/{name}/{v + 1}', g, [SG.tile(fn, v)], dict(anchor=TILE, note=note))
    for side in ('n', 's'):
        reg.add(f'tile/ln_bed_edge_{side}', g, [SG.tile(L.edge(L.bed, L.cleared, side, lip=1))],
                dict(anchor=TILE, note=f'the bed\'s {side} edge cell: cleared ground on its {side} half, a lip of '
                                       'spoil, the bed on the other half (extra to the plan)'))
        reg.add(f'tile/ln_rock_edge_{side}', g, [SG.tile(L.edge(L.rock, L.bed, side))],
                dict(anchor=TILE, note=f'the rock\'s {side} edge cell: bed on its {side} half, rock on the other '
                                       '(extra to the plan)'))
    S1 = (-12, -12, 12, 12)
    reg.add('line/stake', g, one(L.stake, shadow=S1), dict(anchor='the stake\'s foot', note='a surveyor\'s stake, '
            'red paint and a rag; one every 8u ahead of the clearers'))
    reg.add('line/stake_plain', g, one(lambda: L.stake(False), shadow=S1),
            dict(anchor='the stake\'s foot', note='a stake without the rag (extra)'))
    # the string line: 1u of a cord along x, 0.9u up (between stakes); repeats every 1u
    def string():
        E.CLIP[0] = (0.0, E.U_XZ)
        L.B(-0.5, -0.012, 0.9, 1.5, 0.012, 0.93, 'cream', shades=(0, 1, 1), cast=False)
    reg.add('line/string', g, [H.render(string, outline=False, shadows=False)],
            dict(anchor='the cell corner (x, 0) at ground level: 1u of string along x, 0.9u up; repeats every 1u'))
    S2 = (-10, -10, 10, 10)
    reg.add('line/tie_loose/x', g, one(lambda: L.tie(0, 0, 0, 'x', 3), shadow=S2),
            dict(anchor=FOOT, note='a tie lying along x (3.7 x 0.34u)'))
    reg.add('line/tie_loose/z', g, one(lambda: L.tie(0, 0, 0, 'z', 4), shadow=S2),
            dict(anchor=FOOT, note='a tie lying along z (across the line), not yet bedded'))
    for v in range(3):
        reg.add(f'line/tie_pile/{v + 1}', g, one(lambda v=v: L.tie_pile(v), shadow=(-12, -10, 14, 10)),
                dict(anchor=FOOT, note=f'ties stacked along x, {(2, 4, 7)[v]} layers (the dump; shrinks with the stock)',
                     extra=dict(box=[-1.9, -0.9, 2.0, 0.9, round((2, 4, 7)[v] * 0.26, 2)])))
    reg.add('line/rail_loose', g, one(lambda: L.rail(-6.5, 6.5, 0, 0), shadow=(-30, -4, 30, 4)),
            dict(anchor=FOOT, note='a 13u rail lying along x'))
    reg.add('line/rail_carried', g, one(lambda: L.rail(-6.5, 6.5, 0, 0.35, cast=False)),
            dict(anchor='the ground below the rail\'s middle: the rail hangs 0.35u up, at the four men\'s tongs',
                 note='draw between the gang (two men each side, at z -0.6 and +0.6u, x -4 and +4u)'))
    for v in range(3):
        reg.add(f'line/rail_stack/{v + 1}', g, one(lambda v=v: L.rail_stack(v), shadow=(-30, -8, 30, 8)),
                dict(anchor=FOOT, note=f'{(2, 6, 12)[v]} rails stacked along x on two blocks',
                     extra=dict(box=[-6.5, -1.1, 6.5, 1.1, round(0.4 + (v * 0.22), 2)])))
    reg.add('line/keg', g, one(L.keg, shadow=S2), dict(anchor=FOOT, note='a keg of spikes, the head off'))
    reg.add('line/spikes', g, one(L.spikes), dict(anchor=FOOT, note='a few spikes spilt on the ground'))
    for v in range(3):
        reg.add(f'line/rock_heap/{v + 1}', g, one(lambda v=v: L.rock_heap(v), shadow=(-10, -10, 12, 10)),
                dict(anchor=FOOT, note='broken rock tipped from the gondola, small to large'))
    for v in range(2):
        reg.add(f'line/earth_heap/{v + 1}', g, one(lambda v=v: L.earth_heap(v), shadow=(-12, -10, 12, 10)),
                dict(anchor=FOOT, note='a spoil heap thrown up beside the bed'))
    for v in range(2):
        reg.add(f'line/tie_laid/{v + 1}', g, one(lambda v=v: L.tie_laid(v), shadows=False),
                dict(anchor='the tie\'s middle on the track centre line', note='a laid tie across the bed '
                     '(extra: the renderer may draw its own per pixel); one every 0.857u'))
    reg.add('line/spiked', g, one(L.spiked, shadows=False),
            dict(anchor='the tie\'s middle on the centre line: draw over the tie and the rails once spiked',
                 note='two tie plates and four spike heads (extra)'))
    reg.add('line/joint', g, one(L.joint, shadows=False),
            dict(anchor='the joint on the centre line (every 13u)', note='fishplates and bolts on both rails (extra)'))
    reg.add('line/rails', g, piece_1u(L.rail_1u),
            dict(anchor='the cell corner (x, 0) at ground level: 1u of both rails, repeat every 1u (8 px right, '
                        '4 down)', note='extra: rails at z +-1.025 on the ties\' top (0.2u)'))
    S3 = (-8, -8, 8, 8)
    reg.add('line/yard_limit', g, one(lambda: L.board('yard'), shadow=S3),
            dict(anchor='the post\'s foot', note='YARD LIMIT board at the junction, face to +z'))
    reg.add('line/mile_board', g, one(lambda: L.board('mile'), shadow=S3),
            dict(anchor='the post\'s foot', note='a mile board, face to +z'))
    reg.add('line/end_stake', g, one(L.end_stake, shadow=S3),
            dict(anchor='the stake\'s foot', note='the end-of-line stake with a red flag and a cairn of stones'))


def register_country(reg):
    import country_d32 as C
    import sprites_nature as SN
    g = 'country'
    tiles = [('prairie', C.prairie, 4, 'short-grass prairie: green (1), dry grama (2), flowers (3), stones (4)'),
             ('woodfloor', C.woodfloor, 3, 'the pine woods\' floor: needles, duff, moss, cones, twigs'),
             ('rockground', C.rockground, 3, 'bare sandstone and grit, cracks, lichen, a tuft'),
             ('hill_lit', C.hill(True), 2, 'grass on a slope turned to the light'),
             ('hill_shade', C.hill(False), 2, 'grass on a slope in shade'),
             ('field', C.field, 2, 'the far town\'s ploughed field, rows along x: young wheat (1), stubble (2)')]
    for name, fn, n, note in tiles:
        for v in range(n):
            reg.add(f'tile/{name}/{v + 1}', g, [SG.tile(fn, v)], dict(anchor=TILE, note=note))
    reg.add('tile/river', g, [SG.tile(C.river, f) for f in (0, 1)],
            dict(anchor=TILE, note='the river, deeper and slower than the creek; 2 frames (glints drift along +x)'))
    for side in ('n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'):
        reg.add(f'tile/riverbank/{side}', g, [SG.tile(C.riverbank(side))],
                dict(anchor=TILE, note=f'river bank: prairie, sand, mud, then the river towards {side} (as tile/bank)'))
    for ax in ('x', 'z'):
        reg.add(f'tile/trail/{ax}', g, [SG.tile(C.trail(ax), 1)],
                dict(anchor=TILE, note=f'an animal trail through the prairie along {ax} (extra; chain cells along a '
                                       'hashed line)'))
    big = (-24, -40, 70, 24)
    mid = (-14, -20, 40, 14)
    small = (-8, -10, 18, 8)
    one_ = SN.one
    things = [
        ('nat/pine/1', lambda: C.pine(0), big, 'ponderosa pine, about 6u'),
        ('nat/pine/2', lambda: C.pine(1), big, 'ponderosa pine, about 5u'),
        ('nat/pine/3', lambda: C.pine(2), big, 'young ponderosa pine, about 4u'),
        ('nat/oak/1', lambda: C.oak(0), big, 'bur oak, about 5u, broad crown'),
        ('nat/oak/2', lambda: C.oak(1), big, 'smaller bur oak'),
        ('nat/snag', C.snag, mid, 'a dead pine, stripped grey (extra)'),
        ('nat/stump/1', lambda: C.stump(0), small, 'a fresh-cut stump, chips about'),
        ('nat/stump/2', lambda: C.stump(1), small, 'a big stump, roots showing'),
        ('nat/felled', C.felled, mid, 'a felled pine along x, limbed, the branches heaped beside (7u)'),
        ('nat/brush/1', lambda: C.brush(0), small, 'brush on the right of way: sage, rabbitbrush, chokecherry'),
        ('nat/brush/2', lambda: C.brush(1), small, 'a bigger thicket'),
        ('nat/brush/3', lambda: C.brush(2), mid, 'a thick clump with a wild plum'),
        ('nat/brush_cut', C.brush_cut, small, 'cut brush heaped aside'),
        ('nat/bush/1', lambda: C.bush(0), small, 'chokecherry bush with red berries (extra)'),
        ('nat/bush/2', lambda: C.bush(1), small, 'wild plum bush (extra)'),
        ('nat/stones/1', lambda: C.stones(0), None, 'three small stones (extra)'),
        ('nat/stones/2', lambda: C.stones(1), None, 'five small stones (extra)'),
        ('nat/stones/3', lambda: C.stones(2), None, 'a scatter of stones (extra)'),
        ('nat/bones', C.skull, None, 'a bleached buffalo skull (extra)'),
        ('nat/burrow', C.burrow, None, 'a prairie dog\'s mound (extra)'),
        ('nat/haystack', C.haystack, mid, 'a haystack by the far town, about 2.5u'),
    ]
    for key, fn, sh, note in things:
        reg.add(key, g, one_(fn, shadow=sh), dict(anchor='foot of the trunk or the thing\'s centre, at ground level',
                                                 note=note))
    for ax in ('x', 'z'):
        reg.add(f'nat/fence_{ax}', g, one_(lambda ax=ax: C.fence(ax), shadow=(-20, -20, 20, 20)),
                dict(anchor='the middle of the 8u run at ground level', note=f'split-rail worm fence along {ax}, 8u'))
    for v in range(3):
        reg.add(f'nat/mound/{v + 1}', g, one_(lambda v=v: C.mound(v), canvas=(420, 260), origin=(210, 150)),
                dict(anchor='the mound\'s centre at ground level', note='a rolling hill beyond the corridor, baked '
                     'into the ground (about %.0f x %.0fu, %.1fu high)' % ([10, 14, 19][v], [7, 9, 11][v],
                                                                          [1.3, 1.9, 2.6][v])))
    # the rise and the cut (8u pieces along x, anchor the piece's middle on the line)
    PIECE = 'the piece\'s middle on the line (x of its centre, z 0) at ground level; pieces every 8u along x'
    for v, kind in enumerate(('up', 'full', 'down')):
        reg.add(f'line/rise/{v + 1}', g, one_(lambda k=kind: C.rise(k)),
                dict(anchor=PIECE, note=f'the low rise across the line, z -3 .. 3, {C.RISE_H}u high ({kind}: '
                     '1 rises along +x, 2 full, 3 falls); gone once dug',
                     extra=dict(box=[-4, -3, 4, 3, C.RISE_H])))
    for side in ('n', 's'):
        for kind, nm in (('full', ''), ('up', '_up'), ('down', '_down')):
            z0, z1 = (-5, -3) if side == 'n' else (3, 5)
            reg.add(f'line/cut_bank_{side}{nm}', g, one_(lambda s=side, k=kind: C.bank(s, k)),
                    dict(anchor=PIECE, note=f'the cut\'s {side} bank, z {z0} .. {z1}, sloping away from the cut' +
                         (' (its face to +z: bare earth)' if side == 'n' else '') +
                         ('' if not nm else f'; the end piece where the rise {kind}s (extra)'),
                         extra=dict(box=[-4, z0, 4, z1, C.RISE_H])))
    # the trestle
    BENT = 'the bent\'s centre on the line at the track\'s level (y 0); the picture reaches 2u below it, into the creek'
    reg.add('line/trestle_bent', g, one_(lambda: C.bent(3)),
            dict(anchor=BENT, note='a finished bent: four posts (two battered), cap, sway braces, sill; one every 6u',
                 extra=dict(box=[-0.3, -2.2, 0.3, 2.2, 0.0])))
    reg.add('line/trestle_deck', g, one_(C.deck),
            dict(anchor='the span\'s middle on the line at y 0: 6u of stringers between two bents, guard timbers',
                 extra=dict(box=[-3, -2.1, 3, 2.1, 0.12])))
    for v, (fn, note) in enumerate(((lambda: C.bent(0), 'piles just driven in the creek'),
                                    (lambda: C.bent(1), 'posts standing, a temporary brace'),
                                    (lambda: C.bent(2), 'posts and cap, no braces yet'))):
        reg.add(f'line/trestle_part/{v + 1}', g, one_(fn), dict(anchor=BENT, note=note,
                                                               extra=dict(box=[-0.3, -2.2, 0.3, 2.2, 0.0])))
    reg.add('line/trestle_deck_half', g, one_(lambda: C.deck(2)),
            dict(anchor='as line/trestle_deck', note='the first pair of stringers only (extra)'))


def register(reg):
    register_track(reg)
    register_country(reg)
