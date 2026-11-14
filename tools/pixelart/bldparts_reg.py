# Registers the D32 stage 3 buildings art (the buildings artist): every enterable town building in parts
# (<B>/floor, /back, /front, /roof and their night versions), the new houses (whole and in parts) and the far
# town's buildings. Called from sprites_town.register (that module owns the bld/ and far/ keys).
# Contract: plans/d32-rooms-art.md (the Rooms builder); what was delivered: plans/d32-art-buildings.md.
import numpy as np
import rooms_bld as RB

U = 4.0
UY = 16.0 / 3.0
NOTES = {
    'floor': 'the floor of the whole interior at its height: draw first when the building is open',
    'back': 'the inner faces of the far walls (-x, -z) seen from inside, with what is fixed to them: draw after the floor',
    'front': 'the walls on the +x and +z faces up to the eaves and what stands on them: fade with the roof',
    'roof': 'everything above the eaves: fade with the front',
    'front_lit': 'the front at night (lit windows, door lamps); same anchor',
    'roof_lit': 'the roof at night; same anchor',
    'back_lit': 'the far walls at night (their windows and wall lamps lit); same anchor',
}
GROUPS = {'shop_w': 'd32_rooms_w', 'shop_e': 'd32_rooms_e', 'civic': 'd32_rooms_civic', 'house': 'd32_rooms_houses',
          'new': 'd32_houses_new', 'far': 'd32_far'}


def _group(key):
    if key.startswith('bld/shop_'):
        return GROUPS['shop_w'] if key.split('/')[2] == 'e' else GROUPS['shop_e']
    if key.startswith('bld/house/'):
        return GROUPS['house']
    if key.startswith(('bld/church', 'bld/school', 'bld/station')):
        return GROUPS['civic']
    return GROUPS['new']


def _find(reg, key):
    for (name, group, frames, meta, module, indexed) in reg.sprites:
        if name == key:
            return frames
    return None


def register_parts(reg, B, whole_key, draw, after, spec, opts, lit, lit_draw, box, check=True, extra_whole=None):
    """Register <B>/floor, /back, /front, /roof (and _lit). check: the whole must be the registered whole sprite."""
    (wimg, wan), parts, stray = RB.make_parts(draw, after, spec, opts, lit, lit_draw)
    if stray:
        print(f'  note: {B}: {stray} untagged pixels went to /back')
    if check:
        fr = _find(reg, whole_key)
        assert fr is not None, whole_key
        img0, an0 = fr[0]
        assert img0.shape == wimg.shape and tuple(an0) == tuple(wan) and (img0 == wimg).all(), \
            f'{B}: the tagged drawing is not the registered {whole_key}'
    g = _group(B)
    ext = dict(box=box, floor_y=round(spec['zf'] / UY, 3), eave=round(spec['eave'] / UY, 3),
               whole=whole_key)
    for p in ('floor', 'back', 'front', 'roof', 'front_lit', 'roof_lit', 'back_lit'):
        if p not in parts:
            continue
        reg.add(f'{B}/{p}', g, [parts[p]], dict(anchor='as ' + whole_key + ' (the same world point)', note=NOTES[p],
                                                extra=ext))
    return (wimg, wan), parts


def register(reg):
    for (B, wkey, draw, after, spec, opts, lit, ld, box) in RB.all_buildings():
        register_parts(reg, B, wkey, draw, after, spec, opts, lit, ld, box)
    if hasattr(RB, 'new_houses'):
        for (B, wkey, draw, after, spec, opts, lit, ld, box) in RB.new_houses():
            # the whole sprite first (and its night version), then the parts checked against it
            import town27_reg as TR
            fr = TR.one(draw, after=after, **opts)
            meta = dict(anchor='the house lot\'s centre (8 x 8u) at ground level', note=RB.NEW_NOTES.get(B, ''),
                        extra=dict(box=box, footprint=[8, 8], facing=B[-1],
                                   front={'e': '+x (door to the west back lane)', 'w': '-x (seen from behind)'}[B[-1]],
                                   floor_y=round(spec['zf'] / UY, 3), eave=round(spec['eave'] / UY, 3)))
            reg.add(wkey, _group(B), fr, meta)
            if lit:
                pair = TR.lit_pair(draw, after=after, **opts)
                TR.add_lit(reg, wkey + '_lit', _group(B), fr, pair, dict(meta, note='the night version, same anchor'))
            register_parts(reg, B, wkey, draw, after, spec, opts, lit, ld, box)
    if hasattr(RB, 'register_far'):
        RB.register_far(reg, GROUPS['far'])
