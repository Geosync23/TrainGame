# How a sprite module hands its sprites (and its part of the ground layer) to the pipeline.
#
# A module is a file tools/pixelart/sprites_<area>.py with a function register(reg), and optionally
# ground(layer) (see groundlayer.py). build.py finds every such file, calls them, checks the keys, packs the frames
# into sheets and writes the atlas.
#
#   def register(reg):
#       reg.add('ppl/agent/walk/se', 'people', frames)          # keys ppl/agent/walk/se/0 .. /3
#       reg.add('veh/coach/e', 'trains', [frame])               # key veh/coach/e
#
# key     the contract's key (plans/proto-sprites.md), slash separated, e.g. 'veh/loco/e+15'. With more than one
#         frame the pipeline appends '/0', '/1', ...; pass indexed=True to append '/0' to a single frame too.
#         Each module owns the key prefixes listed for it in OWNERS below (build.py refuses keys outside them,
#         and duplicates).
# group   the sprite sheet the frames go on (one PNG per group: sheet-<group>.png). Keep a group to one module.
# frames  a list of (img, (ax, ay)): img is an RGBA uint8 numpy array (h, w, 4) cropped to its pixels;
#         (ax, ay) is the anchor, the pixel corner that sits on the projected world position at ground level.
#         The game draws a frame at (screenX - ax, screenY - ay). harness.render() makes such frames from
#         engine shapes drawn around the world origin; people.to_rgba() makes them from pixel maps.
#         Alpha must be 0 or 255 (the contract); build.py turns any part-transparent pixel into a 50% checker.
# meta    optional dict kept in out/atlas.json (notes for people). Put what the game itself needs under
#         meta['extra'] (for example {'cartSlots': [...]}): it goes into PIX_ATLAS.extra[key].
import harness

# Key prefixes each module may register. The dotted names are the first build's (legacy, until renamed).
OWNERS = {
    'sprites_trains': ('veh/', 'fx/', 'train.', 'fx.'),
    'sprites_track': ('sw/', 'track/', 'track.', 'prop.switch_stand.'),
    'sprites_font': ('font/',),
    'sprites_people': ('ppl/', 'person.'),
    'sprites_goods': ('goods/', 'tag/'),           # D27 (A2): the 16 goods, their handling states, shop tags
    'sprites_carts': ('cart27/', 'truck/'),        # D27 (A2): the platform cart and the hand truck
    'sprites_town': ('bld/', 'cart/', 'deck/', 'walk/', 'plat/', 'prop/', 'ground/', 'street/',
                     'building.', 'platform.', 'walkway.', 'goods.', 'handcart.', 'prop.', 'tree.', 'ground.', 'street.'),
    'sprites_nature': ('nat/',),           # D27 nature (A3)
    'sprites_ground': ('tile/', 'dock/'),  # D27 ground tiles and the cargo platform's pieces (A3)
    'sprites_navvy': ('ppl/navvy_', 'tool/'),     # D32: the rail crew and their tools (the D32 artist)
    'sprites_line': ('line/', 'tile/ln_', 'tile/prairie', 'tile/woodfloor', 'tile/rockground', 'tile/hill_',
                     'tile/field', 'tile/river', 'tile/trail', 'tile/creekbed', 'nat/pine', 'nat/oak', 'nat/stump',
                     'nat/felled', 'nat/brush', 'nat/mound', 'nat/fence_', 'nat/haystack', 'nat/stones', 'nat/fern',
                     'nat/aspen', 'nat/snag', 'nat/bones', 'nat/burrow', 'nat/bush',
                     'veh/crewcar', 'veh/gondola', 'veh/flat_rails', 'veh/flat_ties'),   # D32: the line and the country
    'sprites_camp': ('camp/',),                   # D32: the crew's camp
}


class Registry:
    def __init__(self):
        self.sprites = []          # (key, group, frames, meta, module, indexed)
        self.module = None

    def add(self, name, group, frames, meta=None, indexed=None):
        meta = dict(meta or {})
        for k in ('sheet', 'frames'):
            if k in meta:
                raise ValueError(f'{name}: meta key {k!r} is reserved')
        if not frames:
            raise ValueError(f'{name}: no frames')
        for img, an in frames:
            if img.ndim != 3 or img.shape[2] != 4:
                raise ValueError(f'{name}: frames must be RGBA arrays')
        if indexed is None:
            indexed = len(frames) > 1
        self.sprites.append((name, group, frames, meta, self.module, indexed))


# Shortcuts for modules that draw with the shape engine.
def one(draw, **kw):
    """A single frame from engine drawing code (see harness.render for the options)."""
    return [harness.render(draw, **kw)]


def frames(draws, **kw):
    """Several frames, one per drawing function."""
    return [harness.render(d, **kw) for d in draws]
