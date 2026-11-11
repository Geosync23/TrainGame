# Notes on the sprite contract (from the art pipeline)

Points where the art differs from, adds to or reads `plans/proto-sprites.md` in a particular way. The integrator
settles each one; nothing in the contract's names or anchors was changed quietly.

## Format
- `out/atlas.js` holds `const PIX_ATLAS = { v: 1, sheets: [...], frames: {...}, extra: {...} }` as the contract
  says. `extra[key]` carries data the game may need (font advances for now). `out/atlas.json` has the same frames
  plus a note for every sprite (anchor wording, lengths), for people.
- `embed.py` writes atlas.js between the contract's `PIX_ATLAS begin/end` markers. If they are not in index.html yet,
  it adds them inside a section "pixel art data (generated)" just before the random numbers section.
- The ground layer is the frame `ground` = `[sheet, 0, 0, W, H, OX, OY]` on a sheet of its own.
- Sheets are indexed-colour PNGs (all sprites keep to the mockup palette), which halves the size.
  Embedded total now: about 255 KB (ground layer about 145 KB of it in base64).

## Hard alpha and shadows
- The contract wants alpha 0 or 255. Cast shadows on the ground (the mockup's soft shadows) are therefore drawn as a
  50% checker of the ink colour, in step with the frame's anchor so it does not crawl as a train moves. This reads
  like the mockup's dithering. If the renderer would rather have them translucent, it is one switch in build.py
  (`hard_alpha`).
- Shadows of things that never move (buildings, trees) belong in the ground layer: a module can add an invisible
  shadow caster there with `layer.caster(...)` (groundlayer.py). Not used yet.

## Trains
- Sizes follow the contract by stretching the mockup's drawings on their canvas (stock.SPEC): loco and tender
  35.2 MU = 8.8u long; width 2.0u; heights about 3.2u (cab roof; the balloon stack rises to about 3.6u), coach 2.8u,
  boxcar 2.7u, flatcar 0.9u. Wheels stay round, and stand on the contract's rail top (0.34u).
- `veh/loco/<hdg>/<f>`: 2 frames, the drive wheels half a turn apart with the rods moved to match.
- Cars look the same from both ends, so `w+N` is the same picture as `e-N` (same rectangle).
- The coach has its two side doors at 1/4 and 3/4 of its length, with steps under them.
- `veh/boxcar_open`: the open door is in the middle of the south side.
- Extras, not in the contract (use or ignore): `veh/loco_freight/<hdg>/<f>` (a black freight engine with a red cab,
  same size as veh/loco) and `veh/flatcar_loaded/<hdg>` (crates, a barrel, sacks).
- `fx/smoke/<f>`: 4 frames growing; frames 2 and 3 are thinned with a checker to fade (hard alpha).

## Track and switches
- Rails at +-0.608u, ties 2.4u long, rail top 0.34u as the contract says. The ballast is 2.5u wide rather than 2.4u,
  so the tie ends do not sit exactly on the ballast edge (tell me if the game needs 2.4u exactly).
- The track spacing comes from proto-layout.json (t3 at z = 9.28; the contract's text says 8.48 between tracks 2
  and 3, the JSON says 9.28: the art follows the JSON).
- Ground layer: every switch drawn set for the straight route. `sw/points/<id>/N` and `/R` are patches of the track
  around each switch node (about 4.5u along the line, on the diverging side), anchored at the node, to be drawn over
  the ground layer. In N the diverging route's blades stand open (a short gap in its rails); in R the straight rail on
  that side is pulled over (a short gap in it).
- `sw/stand/N`: white target with a green centre, lever to the west; `sw/stand/R`: red target, lever to the east.
  About 1.2u high, anchored at the foot of the post.

## Font
- Not in the contract: `font/<character code>` (for example `font/65` is 'A'), white, anchor at the left end of the
  baseline; `extra['font/65'].adv` is the advance in px. Capitals and digits 3 x 5 (M, N, Q, W wider), small letters
  with a 3-row body and descenders, line height 7 px.

## Placeholder parts (for the town artist)
- Until the town module sets `REPLACES_GROUND_BASE = True`, the pipeline lays a plain ground base: the mockup's
  grass, the street, platform decks 3 px high, and the walkway, in groundlayer.py.

## D27 town, nature, props, tiles (A3)
- Contract: plans/proto-sprites.md section 6. Built from the plan's numbers (d27-tech.md 1.4, 2.4, 2.5) because the
  layout export does not carry the D27 town yet; nothing in the sprites depends on the export, and the mock scene's
  `LOTS` and `cell_kind` (street27_scene.py) are the only places to change when it does.
- Palette: `pal27.py` appends nine ramps (sage, rock, creek, straw, brick, umber, slate, pine, bloom) to the engine at
  import time; no existing ramp index moves. Each sheet stays an indexed PNG.
- Ground shadows: the plan retires the baked ground, so buildings get a separate flat `shadow` part and trees carry
  their shadow in the frame (50% ink checker, hard alpha). Draw building shadows after the walk, before uprights.
- East row: the hanging signs stand on a post at the boardwalk's street edge with the arm out over the street; hung
  from the false front they were hidden by its own south end in the fixed view.
- Ground tiles are 14 x 8 px frames (the pixel centres inside the 16 x 8 cell diamond): they tile exactly at (8, 4)
  steps.
- Big part frames are padded so the lot-centre anchor lies inside them (signs, yards, awnings): mostly clear pixels,
  cheap in the indexed PNGs.
- registry.OWNERS gained `sprites_nature` (`nat/`) and `sprites_ground` (`tile/`).
