# Sprite module: D32 wild country, the far side (Artist 2; plans/d32-journey.md). Keys:
#   tile/wild/<region>/1..4              the region's ground (1u cells, as every tile/)
#   tile/wild/blend/<a>-<b>/1..4          a's ground giving way to the next region's: 20, 40, 60, 80% of b
#   wild/far/<region>/r1/1..4            rank 1, the tall border at the corridor's north edge (16u modules)
#   wild/far/<region>/r2/1..3, r3/1..3   ranks 2 and 3 behind it, paler (16u modules)
#   wild/far/<region>/r<k>/to_<next>/1..2  the two modules that carry rank k into the next region
# How the modules join and stack: plans/pixel/d32/far/README.md. Drawing: wild_kit.py, wild_far_regions.py,
# wild_ground.py, colours pal_wild.py. Rendering every module takes a while, so finished frames are kept in a cache
# outside the repository (the system's temp folder), keyed by the drawing code's text: any change redraws them.
import os, sys, hashlib, pickle, tempfile, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
import wild_ground as WG
import wild_far_regions as WR

W = 16.0
R1_VARS, R2_VARS, R3_VARS = 4, 3, 3
NEXT = dict(zip(WG.REGIONS[:-1], WG.REGIONS[1:]))
SRC = ('wild_kit.py', 'wild_ground.py', 'pal_wild.py', 'country_d32.py', 'nature.py', 'engine.py', 'sprites_ground.py')
REGION_FNS = {'prairie': ('_prairie',), 'creek': ('_creek',), 'hills': ('_hills',), 'woods': ('_woods',),
              'rocks': ('_rocks',), 'river': ('_river',), 'canyon': ('_canyon',), 'pass': ('_pass',),
              'valley': ('_valley', 'fences', 'barns')}
CACHE = os.path.join(tempfile.gettempdir(), 'railhead-wild-far-cache')
_KEYS = {}


def _code_key(regions):
    """A hash of the drawing code a module depends on: the kit, the shared part of wild_far_regions.py and the
    functions of its own region(s), so a change to one region redraws only that region's modules."""
    import inspect
    if 'common' not in _KEYS:
        h = hashlib.sha1()
        for f in SRC:
            with open(os.path.join(HERE, f), 'rb') as fh:
                h.update(fh.read())
        text = open(os.path.join(HERE, 'wild_far_regions.py')).read()
        for fns in REGION_FNS.values():
            for fn in fns:
                text = text.replace(inspect.getsource(getattr(WR, fn)), '')
        h.update(text.encode())
        _KEYS['common'] = h.hexdigest()
    h = hashlib.sha1(_KEYS['common'].encode())
    for r in regions:
        for fn in REGION_FNS[r]:
            h.update(inspect.getsource(getattr(WR, fn)).encode())
    return h.hexdigest()[:16]


MANIFEST = os.path.join(HERE, 'wild_far_cache.json')
_MAN = {'old': None, 'new': {}, 'atlas': None, 'sheets': {}}


def _from_sheet(name, key, code):
    """The second cache, kept in the repository: wild_far_cache.json says which drawing code (its hash) each module
    in the committed sheets (out/sheet-wild_far_*.png, found through out/atlas.json) was drawn by. While that code
    is unchanged the frame is cut out of the sheet again instead of being redrawn (a full redraw is about 80
    minutes), so a fresh checkout, or a machine whose temp folder was emptied, builds in seconds."""
    import json
    from PIL import Image
    if _MAN['old'] is None:
        try:
            _MAN['old'] = json.load(open(MANIFEST))
            _MAN['atlas'] = json.load(open(os.path.join(HERE, 'out', 'atlas.json')))
        except (OSError, ValueError):
            _MAN['old'] = {}
    if _MAN['old'].get(name) != code or not _MAN['atlas'] or key not in _MAN['atlas']['frames']:
        return None
    gi, x, y, w, h, ax, ay = _MAN['atlas']['frames'][key]
    fn = _MAN['atlas']['sheets'][gi]['file']
    if fn not in _MAN['sheets']:
        try:
            _MAN['sheets'][fn] = np.array(Image.open(os.path.join(HERE, 'out', fn)).convert('RGBA'))
        except OSError:
            return None
    img = _MAN['sheets'][fn][y:y + h, x:x + w].copy()
    img[img[..., 3] == 0] = 0
    return img, (ax, ay)


def cached(name, fn, regions, key=None):
    os.makedirs(CACHE, exist_ok=True)
    code = _code_key(regions)
    _MAN['new'][name] = code
    p = os.path.join(CACHE, f'{code}-{name.replace("/", "_")}.pkl')
    if os.path.exists(p) and not os.environ.get('WILD_NO_TMP'):
        with open(p, 'rb') as fh:
            return pickle.load(fh)
    out = _from_sheet(name, key, code) if key else None
    if out is not None:
        return out
    t = time.time()
    out = fn()
    with open(p, 'wb') as fh:
        pickle.dump(out, fh)
    print(f'    drew {name} ({time.time() - t:.1f} s)', flush=True)
    return out


def save_manifest():
    import json
    if os.environ.get('WILD_ONLY'):
        return
    with open(MANIFEST, 'w') as fh:
        json.dump(_MAN['new'], fh, indent=0, sort_keys=True)


ANCHOR = ('the module\'s front-left corner at ground level: its left column (u = x - z = 0) on its front line. '
          'The picture is exactly 128 px wide (16u of columns); modules of a rank join side by side every 16u along x')
RANK_NOTE = {1: 'rank 1, the tall border: anchor on the wall\'s front line (z_w); draw after the ground tiles, before '
                'anything in the corridor',
             2: 'rank 2: anchor 14u north of the wall\'s front line (z_w - 14); draw before rank 1',
             3: 'rank 3: anchor 30u north of the wall\'s front line (z_w - 30), and again every 20u further north until '
                'the top of the screen is covered; draw the furthest row first'}


def register(reg):
    regions = [r for r in WG.REGIONS if not os.environ.get('WILD_ONLY') or r in os.environ['WILD_ONLY'].split(',')]
    # the ground
    for region in WG.REGIONS:
        for v in range(4):
            reg.add(f'tile/wild/{region}/{v + 1}', 'wild_tiles', [WG.tile(WG.TEX[region], v)],
                    dict(anchor=WG.SG.TILE, note=WG.NOTES[region]))
        if region in NEXT:
            nb = NEXT[region]
            for k, share in enumerate((0.2, 0.4, 0.6, 0.8)):
                reg.add(f'tile/wild/blend/{region}-{nb}/{k + 1}', 'wild_tiles',
                        [WG.tile(WG.blend(region, nb, share), k)],
                        dict(anchor=WG.SG.TILE, note=f'{region} ground giving way to {nb}: {int(share * 100)}% {nb} '
                                                     '(use 1 to 4 across the 12u soft border, dithered by cell)'))
    # the far side
    for region in regions:
        g = f'wild_far_{region}'
        for rank, nv in ((1, R1_VARS), (2, R2_VARS), (3, R3_VARS)):
            meta = dict(anchor=ANCHOR, note=RANK_NOTE[rank],
                        extra=dict(w=W, rank=rank, back=WR.OFFSET[rank], depth=WR.DEPTH[rank],
                                   repeat=WR.REPEAT3 if rank == 3 else 0))
            for v in range(nv):
                fr = cached(f'{region}-r{rank}-{v}', lambda: WR.module(region, rank, v, W), (region,),
                            key=f'wild/far/{region}/r{rank}/{v + 1}')
                reg.add(f'wild/far/{region}/r{rank}/{v + 1}', g, [fr], meta)
            if region in NEXT:
                nb = NEXT[region]
                for k, (t0, t1) in enumerate(((0.0, 0.5), (0.5, 1.0))):
                    fr = cached(f'{region}-r{rank}-to-{nb}-{k}',
                                lambda: WR.module(region, rank, 50 + k, W, to=nb, t0=t0, t1=t1), (region, nb),
                                key=f'wild/far/{region}/r{rank}/to_{nb}/{k + 1}')
                    m = dict(meta)
                    m['note'] = meta['note'] + f'; the {"first" if k == 0 else "second"} of the two modules from ' \
                                               f'{region} into {nb}'
                    reg.add(f'wild/far/{region}/r{rank}/to_{nb}/{k + 1}', g, [fr], m)
    save_manifest()
