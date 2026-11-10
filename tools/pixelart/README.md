# Railhead pixel art pipeline

Every picture in the pixel-art prototype (D25) is made by code in this folder, in the look of the approved
mockup (`plans/pixel/art-scene.png`). One command rebuilds everything:

    python3 tools/pixelart/build.py          # all modules, about 3 seconds
    python3 tools/pixelart/build.py people   # only sprites_people.py, for a quick look (commit a full build)
    python3 tools/pixelart/embed.py          # copy the sheets and atlas into index.html

Needs Python 3 with numpy and Pillow (both installed here).

## What comes out (`tools/pixelart/out/`)

- `sheet-<group>.png`: the sprite sheets, native pixels, transparent background.
- `atlas.json`: every sprite by name: `sheet` (index into `sheets`), `frames` as `[x, y, w, h, ax, ay]`, and notes.
- `contact.png`: every sprite at 3x with its name and a red dot on its anchor. Look at it after every change.
- `testscene.png`: a small station put together from the sheets only, the way the game will draw them.

## The fixed view and the units

- Game projection, native pixels: world +x (along the main line) moves 8 px right and 4 px down; +z moves 8 px
  left and 4 px down; +y (up) moves 8 px up. The game scales by whole steps only.
- **Anchor**: each frame has `(ax, ay)`, the pixel corner that lands on the object's world position at ground
  level. The game draws the frame at `(screenX - ax, screenY - ay)`. Each sprite's atlas entry says what its
  world position is (a car's centre on the track, a tile's corner, a building's footprint centre, a person's feet).
- The shape engine works in mockup units (MU): **4 MU = 1 game unit along x and z; 16/3 MU = 1 game unit up**
  (1.5 px per MU up). In engine calls, X = world x, Y = world z, Z = up. `proj(X, Y, Z) = (2(X - Y), X + Y - 1.5 Z)`.
- Shared heights: rail top 2.4 MU (0.45 u), platform top 4 MU (0.75 u). Gauge: rails 3 MU (0.75 u) either side
  of the track centre line; ballast 7 MU (1.75 u). These go into `atlas.json` under `geometry`.
- Directions: `e` faces +x (screen lower right), `w` faces -x (upper left), `s` faces +z (lower left),
  `n` faces -z (upper right). Light comes from the upper left: +z faces (`'l'` in the engine) are lit,
  +x faces (`'r'`) are in shade.

## Files

| File | What it is | Owner |
| --- | --- | --- |
| `engine.py` | palette (ramps), depth-buffered shape renderer (box, cylinders, sphere, gables, wheels), shadows, outlines, `begin()` for a fresh canvas, `render_rgba()` | pipeline |
| `harness.py` | `render(draw, shadow=..., outline=..., after=...)`: one frame from engine drawing code, cropped, with its anchor | pipeline |
| `registry.py` | how a module registers sprites; `OWNERS`: which name prefixes each module may use | pipeline |
| `build.py` | finds `sprites_*.py`, checks names, packs sheets, writes the atlas, contact sheet and test scene | pipeline |
| `review.py` | contact sheet and test scene | pipeline |
| `embed.py` | writes the sheets and atlas into index.html | pipeline |
| `font.py`, `sprites_font.py` | pixel font: capitals, digits, small letters, punctuation | pipeline |
| `shapes.py` | the mockup's shape library (textures, cars, buildings, props), kept as it was drawn | shared, read only: copy a function into your own file to change it |
| `stock.py`, `sprites_trains.py` | engines, tenders, coach, boxcar, flatcar, steam puffs | pipeline, trains and track |
| `track.py`, `sprites_track.py` | straight track, crossovers, buffer stops, switch stands | pipeline, trains and track |
| `people.py`, `sprites_people.py` | all characters and animations (first version from the mockup's pixel maps) | people artist |
| `town.py`, `sprites_town.py` | station building, storage shed, shops, houses, trees, props, goods, handcart, platforms, plank walkway, ground tiles (first version from the mockup's shapes) | buildings and town artist |

Each artist edits only their own files. If you need a change in a shared file (engine, harness, registry,
build, shapes), ask the pipeline helper, or keep the change inside your own module.

## Adding or changing a module

1. Make `tools/pixelart/sprites_<area>.py` with one function:

   ```python
   from registry import one          # one(draw, **opts) -> [ (img, (ax, ay)) ]

   def register(reg):
       reg.add('building.store.s', 'buildings', one(lambda: my_store('s'), shadow=(-60, -50, 80, 50)),
               {'footprint': [6, 4], 'anchor': 'centre of the footprint at ground level'})
   ```

   `reg.add(name, group, frames, meta)`:
   - `name`: dotted, lower case, `<kind>.<thing>[.<variant>][.<direction or state>]`. Your prefixes are listed in
     `registry.OWNERS`; the build stops on a name outside them or on a duplicate. To claim a new prefix, add it there.
   - `group`: the sheet the frames go on (`sheet-<group>.png`). A group belongs to one module.
   - `frames`: list of `(img, (ax, ay))`, `img` an RGBA uint8 numpy array cropped to its pixels.
   - `meta`: anything useful to the game (length, footprint, notes). Not `sheet` or `frames`.
2. Drawing with the shape engine: write a function that draws around the world origin with `engine` primitives
   (`box`, `cyl_x`, `cyl_z`, `sphere`, `disc_y`, `disc_x`, `gable_x`, `gable_y`, `band_curve`), giving each object
   an outline id from `new_oid(True)`, and pass it to `one()`. Options: `shadow=(x0, y0, x1, y1)` is a ground
   rectangle in MU that catches the object's cast shadow (stored as a translucent dark pixel, `shadow_rgba`);
   `outline=False` for ground pieces; `after=fn` to write text or pixels after shading (signs).
   Hand-drawn pixel maps: see `people.to_rgba()` (palette chars, 1 px outline, contact shadow, anchor at the feet).
3. Colours: use the ramps in `engine.RAMPS` (each light to dark). Add a colour to `HEX` and a ramp to `RAMPS` only
   if the palette really lacks it; tell the pipeline helper.
4. Run `python3 tools/pixelart/build.py`, look at `out/contact.png` and `out/testscene.png`, then commit your
   module and the regenerated `out/` together.

## Size

Everything embedded in index.html (sheets as base64 PNG plus the atlas) should stay under about 400 KB.
`embed.py` prints the total.
