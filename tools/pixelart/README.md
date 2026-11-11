# Railhead pixel art pipeline

Every picture in the pixel-art prototype (D25) is made by code in this folder, in the look of the approved
mockup (`plans/pixel/art-scene.png`). It follows the sprite contract `plans/proto-sprites.md` (the architect's) and
the layout `tools/pixelart/proto-layout.json` (exported from the game). One command rebuilds everything:

    python3 tools/pixelart/build.py          # all modules and the ground layer, about 6 seconds
    python3 tools/pixelart/build.py people   # only sprites_people.py, into out/preview/, for a quick look
    python3 tools/pixelart/embed.py          # write out/atlas.js into index.html (between the PIX_ATLAS markers)

Needs Python 3 with numpy and Pillow. Where the art reads the contract in its own way, see `NOTES.md`.

## What comes out (`tools/pixelart/out/`)

- `atlas.js`: the contract's block, `const PIX_ATLAS = { v: 1, sheets: [PNG data URLs], frames: { key: [sheet, x, y,
  w, h, ax, ay] }, extra: { key: {...} } }`. This is what goes into index.html.
- `sheet-<group>.png`, `ground.png`: the same pictures as files (indexed PNG, alpha 0 or 255).
- `atlas.json`: the frames again, with a note for every sprite (anchor wording, lengths), for people.
- `contact.png`: every sprite at 3x with its key and a red dot on its anchor. Look at it after every change.
- `testscene.png`: the station from proto-layout.json, put together from the finished pictures only.

## The fixed view and the units

- Game projection, native pixels: world +x moves 8 px right and 4 px down; +z moves 8 px left and 4 px down;
  +y (up) moves 8 px up. The game scales by whole steps only.
- **Anchor**: each frame has `(ax, ay)`, the pixel that lands on the thing's world anchor point (the contract says
  which point: a vehicle's footprint centre, a person's feet, a building's footprint centre, all at y = 0). The game
  draws the frame at `(sx - ax, sy - ay)`.
- The shape engine works in mockup units (MU): **4 MU = 1 game unit along x and z; 16/3 MU = 1 game unit up**
  (1.5 px per MU up). In engine calls X = world x, Y = world z, Z = up. `proj(X, Y, Z) = (2(X - Y), X + Y - 1.5 Z)`.
- A canvas can be turned and stretched: `harness.render(draw, yaw=..., scale=(along, across, up))`. That is how the
  trains are drawn at the ten headings (e, e+-15, e+-30, w, w+-15, w+-30) and at the contract's sizes.
- Light comes from the upper left: +z faces (`'l'` in the engine) are lit, +x faces (`'r'`) are in shade.
- Contract heights: rail top 0.34u (1.81 MU), platform deck drawn 3 px (2 MU).

## Files

| File | What it is | Owner |
| --- | --- | --- |
| `engine.py` | palette (ramps), depth-buffered shape renderer (box, cylinders, sphere, gables, wheels, bands), shadows, outlines, `begin()` for a canvas (with turn and stretch) | pipeline |
| `harness.py` | `render(draw, shadow=..., outline=..., after=..., yaw=..., scale=...)`: one frame, cropped, with its anchor | pipeline |
| `registry.py` | how a module registers sprites; `OWNERS`: which key prefixes each module may use | pipeline |
| `build.py` | finds `sprites_*.py`, checks keys, makes alpha hard, draws the ground layer, packs sheets, writes atlas.js | pipeline |
| `groundlayer.py` | the ground layer canvas, the placeholder base (grass, street, decks, walkway) | pipeline |
| `review.py` | contact sheet and test scene | pipeline |
| `embed.py` | writes atlas.js into index.html | pipeline |
| `font.py`, `sprites_font.py` | pixel font: capitals, digits, small letters, punctuation (`font/<code>`) | pipeline |
| `shapes.py` | the mockup's shape library (textures, cars, buildings, props), kept as it was drawn | shared, read only: copy a function into your own file to change it |
| `stock27.py`, `sprites_trains.py` | D27: loco with tender, freight loco, coach (whole, lit, cut away) and its inside parts, boxcar (whole, cut away, sliding door), flatcar, steam (`veh/`, `fx/`) | A2 (vehicles) |
| `goods27.py`, `sprites_goods.py`, `sprites_carts.py` | D27: the 16 goods in every handling state, shop tags and row boards (`goods/`, `tag/`); the platform cart and the hand truck (`cart27/`, `truck/`) | A2 |
| `geom27.py` | A2's helpers: shapes in game units, oriented (tilted) boxes and cylinders | A2 |
| `review_a2.py` | A2's review sheets `out/a2-*.png` (run after build.py) | A2 |
| `stock.py` | the D25 rolling stock, kept for the record, no longer built | |
| `track.py`, `sprites_track.py` | track in the ground layer, switch points overlays, switch stands (`sw/`) | pipeline, trains and track |
| `people.py`, `sprites_people.py` | all characters and animations (`ppl/`); first version from the mockup's pixel maps, still with the first build's names | people artist |
| `town.py`, `sprites_town.py` | station, storage shed, shops, houses, trees, props, the D25 handcart (goods and tags moved to sprites_goods.py for D27), platforms, walkway, ground tiles (`bld/`, `cart/`); first version from the mockup's shapes, still with the first build's names | buildings and town artist |
| `proto-layout.json` | the layout, exported by the game (`node tools/pixelart/export-layout.js`, the architect's) | architect |

Each artist edits only their own files. If you need a change in a shared file (engine, harness, registry,
build, groundlayer, shapes), ask the pipeline helper, or keep the change inside your own module.

## Adding or changing a module

1. Make `tools/pixelart/sprites_<area>.py` with one function:

   ```python
   from registry import one          # one(draw, **opts) -> [ (img, (ax, ay)) ]

   def register(reg):
       reg.add('bld/shop_store', 'buildings', one(lambda: my_store(), shadow=(-60, -50, 80, 50)),
               {'anchor': 'footprint centre at y = 0'})
       reg.add('ppl/agent/walk/se', 'people', four_frames)    # keys ppl/agent/walk/se/0 .. /3
   ```

   `reg.add(key, group, frames, meta=None, indexed=None)`:
   - `key`: the contract's key. With more than one frame the pipeline appends `/0`, `/1`, ...; `indexed=True`
     appends `/0` to a single frame too (the contract's `ppl/.../<f>` keys). Your prefixes are in
     `registry.OWNERS`; the build stops on a key outside them or on a duplicate.
   - `group`: the sheet the frames go on. A group belongs to one module.
   - `frames`: list of `(img, (ax, ay))`, `img` an RGBA uint8 numpy array cropped to its pixels. Any alpha between
     0 and 255 is turned into a 50% checker of dark pixels (the contract wants hard alpha).
   - `meta`: notes for `atlas.json`; data the game needs goes in `meta['extra']` (it lands in `PIX_ATLAS.extra[key]`).
2. Ground layer (optional): define `ground(layer)` in your module and draw with the engine in world MU
   (world x * 4, world z * 4; `layer.layout` is proto-layout.json). Set `GROUND_ORDER` (default 50; track is 40)
   and, once your module draws the whole base (grass, street, decks, walkway), `REPLACES_GROUND_BASE = True`.
   `layer.caster(x0, z0, x1, z1, height_u)` lets a building's shadow fall on the ground layer.
3. Drawing with the shape engine: write a function that draws around the world origin with `engine` primitives
   (`box`, `cyl_x`, `cyl_z`, `sphere`, `disc_y`, `disc_x`, `gable_x`, `gable_y`, `band_curve`), giving each object
   an outline id from `new_oid(True)`, and pass it to `one()`. Options: `shadow=(x0, y0, x1, y1)` is a ground
   rectangle in MU that catches the cast shadow; `outline=False` for flat pieces; `after=fn` to write text after
   shading (signs); `yaw`, `scale` to turn or stretch. Hand-drawn pixel maps: see `people.to_rgba()`.
4. Colours: use the ramps in `engine.RAMPS` (each light to dark). Add a colour only if the palette lacks it, and
   tell the pipeline helper (the sheets are indexed PNGs: keep the palette small).
5. Run `python3 tools/pixelart/build.py`, look at `out/contact.png` and `out/testscene.png`, then commit your
   module and the regenerated `out/` together.

## Size

The contract's budget: the sprite sheets under 500 KB of base64, the ground layer under 400 KB. Now: atlas.js is
about 255 KB in all. build.py prints the sizes.
