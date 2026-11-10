# How a sprite module hands its sprites to the pipeline.
#
# A module is a file tools/pixelart/sprites_<area>.py with a function register(reg). build.py finds every such
# file, calls register(reg), checks the names, packs the frames into sheets and writes the atlas.
#
#   def register(reg):
#       reg.add('person.agent.walk.e', 'people', frames, {'frame_note': 'step, pass, step, pass'})
#
# name    dotted, lower case: '<kind>.<thing>[.<variant>][.<direction or state>]'. Each module owns the name
#         prefixes listed for it in OWNERS below (build.py refuses names outside them, and duplicates).
# group   the sprite sheet the frames go on (one PNG per group: sheet-<group>.png). Keep a group to one module.
# frames  a list of (img, (ax, ay)): img is an RGBA uint8 numpy array (h, w, 4) cropped to its pixels;
#         (ax, ay) is the anchor, the pixel corner that sits on the projected world position at ground level.
#         The game draws a frame at (screenX - ax, screenY - ay). harness.render() makes such frames from
#         engine shapes drawn around the world origin; people.to_rgba() makes them from pixel maps.
# meta    optional dict copied into the atlas entry (lengths, footprints, notes). Do not use the keys
#         'sheet' or 'frames'.
import harness

# Name prefixes each module may register.
OWNERS = {
    'sprites_trains': ('train.', 'fx.'),
    'sprites_track': ('track.', 'prop.switch_stand.'),
    'sprites_font': ('font.',),
    'sprites_people': ('person.',),
    'sprites_town': ('building.', 'platform.', 'walkway.', 'goods.', 'handcart.', 'prop.', 'tree.', 'ground.', 'street.',
                     'bld/', 'plat/', 'goods/', 'tag/', 'cart/', 'prop/', 'ground/', 'street/'),
}


class Registry:
    def __init__(self):
        self.sprites = []          # (name, group, frames, meta, module)
        self.module = None

    def add(self, name, group, frames, meta=None):
        meta = dict(meta or {})
        for k in ('sheet', 'frames'):
            if k in meta:
                raise ValueError(f'{name}: meta key {k!r} is reserved')
        if not frames:
            raise ValueError(f'{name}: no frames')
        for img, an in frames:
            if img.ndim != 3 or img.shape[2] != 4:
                raise ValueError(f'{name}: frames must be RGBA arrays')
        self.sprites.append((name, group, frames, meta, self.module))


# Shortcuts for modules that draw with the shape engine.
def one(draw, **kw):
    """A single frame from engine drawing code (see harness.render for the options)."""
    return [harness.render(draw, **kw)]


def frames(draws, **kw):
    """Several frames, one per drawing function."""
    return [harness.render(d, **kw) for d in draws]
