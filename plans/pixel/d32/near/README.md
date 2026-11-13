# D32 the journey: the near side, landmarks and wildlife (Artist 3)

Made by `tools/pixelart/` (`python3 tools/pixelart/build.py`, then `python3 tools/pixelart/review_wild_near.py` for
the sheets in this folder). Code: `wild_terrain.py` (a heightfield primitive for the engine: whole stretches of
country drawn in the engine's own depth buffer, light, shadows and outlines, with engine shapes standing on them),
`wild_regions.py` (the nine regions' near side), `wild_pieces.py` (rendering a piece and its water frames),
`wild_props.py` (ferns, saplings, deadfall, slash pile, the tumbledown fence, rushes, scrub, driftwood, wet rocks,
angular rock, krummholz, orchard trees, a dry-stone wall), `wild_marks.py` (landmarks), `wild_life.py` (wildlife),
`sprites_wild_near.py` (registers all of it). `registry.py` gained one line: the prefixes `wild/near/`, `wild/mark/`,
`wild/life/`. Palette: only existing ramps (no new colours). Sizes are native pixels (the largest frame of the key).
`tools/pixelart/out/atlas.json` has a note and anchor for every key; `PIX_ATLAS.extra` holds `len`, `z0`, `z1`,
`band` for every piece. For a quick look at one region: `WILD_ONLY=canyon python3 tools/pixelart/build.py wild_near`.

Atlas: **2,018 KB** of `atlas.js` (was 767 KB); the wild sheets are 938 KB of PNG (11 sheets `sheet-wild_*.png`,
392 frames). Most of it is the water overlays and the mid/far pieces.

## How the near side is put together

Regions use local coordinates: x along the line from the piece's -x end, z measured from the **corridor's south
edge** (local z 0; the sheets put it at world z 9, i.e. `EDGE_Z = 9`, 4u beyond the 5u cleared strip). Everything
is anchored at the piece's corner (its -x end, local z 0, ground level y 0): draw at `proj(x0, EDGE_Z)`. The anchor
may lie outside the picture (a deep piece starts far below it). The pieces are meant to be **baked into the ground
chunks** (they are country outside the corridor), before anything in the corridor.

Three bands, drawn in this order (a band nearer the viewer always wins where they overlap, so within a band any order
along x works):

| band | local z | piece length | variants | what it is |
|---|---|---|---|---|
| `edge` | 0 .. 10 | 8u | 4 | the border itself: low, or falling away; frays into the tiles over its first 0.6u |
| `mid` | 10 .. 34 | 16u | 3 | what lies beyond it: the creek's bottoms, the river, the drop, the canyon floor |
| `far` | 34 .. 58 | 16u | 2 | further down the screen: the far bank's woods, the valley floor, terraces; ends ragged, and the region's own tiles go on from there |

**Joins.** Every region is a base shape that does not change along x (or repeats every 8u) plus features of the
variant that fade to nothing at the piece's two ends and at its band's two sides, and every texture repeats every 8u
along x. So any variant joins any other, and an edge piece joins the mid piece below it, without a seam. Pick
variants by a hash of the slot (the sheets do). Regions should start on a multiple of 16u.

**Blends.** `wild/near/<a>_to_<b>/<band>` (16u, one per band) goes from region a (at its -x end) to the next region b
(at its +x end): heights and water mixed with an uneven front, materials and things dithered. River into canyon is
done in falls: the water drops over three broken ledges into the canyon.

**Water.** A piece with water has `<key>/water/0..2`: only its water pixels for each of 3 frames, cut to their own box
with their own anchor (same world point): draw over the baked piece every frame (frame 0 is already in the piece).
Glints and riffles drift with the current; rapids, cascades and plunge pools foam; falling water streaks down faces.

## Keys: the nine regions (`wild/near/<region>/edge/1..4`, `/mid/1..3`, `/far/1..2`)

Sizes: edge pieces about 140 x 71 (the canyon's 142 x 204, the pass's 141 x 157: their drops), mid and far pieces
about 318 x 160 (the canyon's mid 319 x 153, the pass's mid 320 x 204).

| # | region | edge (the border) | mid / far (beyond it) | water |
|---|---|---|---|---|
| 1 | `prairie` | thick wild brush (chokecherry, plum, rabbitbrush, sage) round a split-rail worm fence gone wild (some pieces only fallen rails) | open rolling grass, thickets in clusters, an oak, stones | none |
| 2 | `creek` | the creek winding alongside (each variant bends it), sand and mud banks, rushes and cattails, willow scrub | the bottoms: sloughs holding water, willows, cottonwoods, rushes | edge, and the sloughs |
| 3 | `hills` | the slope falling away to a draw, a sandstone ledge stepping it, sage, small rocks, a juniper | the draw's dry wash (meanders per piece), the far slope rising with junipers, boulders, an outcrop | none |
| 4 | `woods` | deadfall with root plates (grey or barked), a slash pile, stumps, ferns, saplings | the woods go on: pines close together, ferns, a snag, deadfall | none |
| 5 | `rocks` | a boulder field: low rubble by the corridor, bigger blocks further down, prickly pear | broken ground falling to a draw, boulders, junipers, standing stones or an outcrop | none |
| 6 | `river` | the bank, a gravel shore, driftwood, rushes, a wet rock with its foam | the river: riffles, rocks with foam rings, gravel bars with drift logs; the far bank's cottonwoods and willows, pines up the bluff | all |
| 7 | `canyon` | the rim, then the drop: a face of red, buff and ochre beds with joints and varnish, pines clinging on ledges | talus, the river far below (hazed), gravel bars; the far side's terraces with junipers and pines | mid |
| 8 | `pass` | alpine turf and krummholz at the lip, then the steep drop: rock ribs, scree in the gullies, snow | the slope down to the valley floor 16u below (hazed): meadow, a winding stream, pines | mid, far |
| 9 | `valley` | the mill stream: a stone-lined race, a dry-stone wall on the line's side, a post-and-rail fence and a lane beyond, rushes; a plank footbridge in one variant | fields laid out per piece, an orchard in rows, haystacks, oaks, hedges | edge |

Blends (each with `/edge`, `/mid`, `/far`, about 205 x 110..236 and 319 x 160..279, plus `/water` where wet):
`prairie_to_creek`, `creek_to_hills`, `hills_to_woods`, `woods_to_rocks`, `rocks_to_river`, `river_to_canyon`,
`canyon_to_pass`, `pass_to_valley`.

The rule "never hide the men": everything in the edge band is at most about 1.2u high near the corridor, and nothing
stands taller than its distance down the screen from the corridor's edge, so a baked tree never reaches up over the
corridor (trees stand in the mid and far bands).

## Keys: landmarks (`wild/mark/...`)

| key | frames | size | where it belongs |
|---|---|---|---|
| `cottonwood` | 1 | 192 x 173 | 1 prairie: the lone cottonwood, 13u, a dead limb; near side mid band (local z 17 or more) or far side |
| `wagon_wreck` | 1 | 83 x 42 | 1 prairie (extra of my own): an emigrant wagon left by the trail; mid band |
| `grave` | 1 | 37 x 28 | 1 prairie or 3 hills (extra): a lone grave, stones and a cross; anywhere outside the corridor |
| `beaver_dam` (+ `/water` 3) | 1 | 140 x 71 | 2 creek: an edge piece in place of a creek edge piece: the dam, its pond, the lodge, gnawed stumps |
| `giant_pine` | 1 | 120 x 122 | 4 woods: 11u, a lightning scar; far side, or mid band |
| `trapper_cabin` | 1 | 83 x 54 | 4 woods: logs fallen to a few courses, the roof down, the chimney standing; mid band or far side; `extra.box` |
| `far_cabin` | 1 | 86 x 59 | 4 woods or 1 prairie (extra): a settler's cabin across a clearing; draw `wild/life/smoke` at `extra.chimney` |
| `balanced_rock` | 1 | 109 x 78 | 5 rocks: 5.5u; mid band or far side |
| `rockcut_n`, `_n_up`, `_n_down` | 1 | 93 x 78 | 5 rocks: the blasted cut's north face (3.4u, drill holes, powder stains), 8u pieces like `line/cut_bank_n`, anchor the piece's middle on the line; `extra.box` |
| `rockcut_s`, `_s_up`, `_s_down` | 1 | 86 x 50 | 5 rocks: the south face, low (1.1u: the spur falls away south, so it never hides the men) |
| `waterfall` (+ `/water` 3) | 1 | 117 x 116 | 6 river: a stream over a 7u face into a pool; against the far side's wooded bluff, or on the far bank |
| `ferry_landing` (+ `/water` 3) | 1 | 140 x 81 | 6 river: an edge piece in place of a river edge piece: plank ramp, the scow tied up, cable post, a fallen lean-to |
| `arch` | 1 | 132 x 100 | 7 canyon: 10u x 6.5u; on the far terraces (far band, its ground is about -12u: draw it 12u down) or far side |
| `canyon_shelf/in`, `/1`, `/2`, `/out` | 1 each | 190 x 228 | 7 canyon: edge pieces where the rim comes in to the line (they reach north to local z -6: the corridor is only 3u wide on that side), with the builders' dry-stone parapet; in, 1, 2 (repeat), out; join canyon edge pieces |
| `summit_board` | 1 | 67 x 61 | 8 pass: SUMMIT 8247 FT on two posts, a cairn; on the far side of the corridor (z -5) facing the viewer; `extra.box` |
| `water_tower` | 1 | 34 x 70 | 9 valley: the far town's water tower in the haze's blue-grey; far band, local z 46 or more |
| `far_town` | 1 | 203 x 121 | 9 valley (extra): the far town's roofs, church and tower in the haze; at the far band's end or beyond |
| `mill` (+ `/anim` 4) | 1 | 140 x 71 | 9 valley (extra): an edge piece in place of a valley edge piece: the grist mill, its undershot wheel turning (4 frames of the wheel and water) |

## Keys: wildlife (`wild/life/...`)

Facings as the crew's (`se` +x, `sw` +z, `ne` -z, `nw` -x), all four drawn in the same light, never mirrored. Anchor
the beast's middle on the ground. Use sparingly.

| key | frames | size | note |
|---|---|---|---|
| `deer/graze|look/<dir>`, `deer/walk/<dir>` | 2, 2, 4 | 41 x 29 | a mule deer doe at the wood's edge |
| `buck/graze|look/<dir>` | 2, 2 | 41 x 32 | a buck |
| `buffalo/graze/<dir>`, `buffalo/walk/<dir>` | 2, 4 | 59 x 41 | far off on the prairie (the far band) |
| `fox/trot/<dir>`, `fox/sit/<dir>` | 4, 2 | 24 x 15 | |
| `duck/<dir>`, `duck_hen/<dir>` | 2 | 9 x 6 | mallards bobbing; draw at the water's level |
| `prairie_dog` | 4 | 12 x 8 | at its burrow: down, peeking, up, calling; play 0 1 2 2 3 2 1 0 with pauses |
| `hawk/fly` | 3 | 8 x 11 | circling high (about 12u up) |
| `hawk/shadow` | 3 | 64 x 40 | its shadow, 50% ink as every shadow, sliding across the ground |
| `smoke` | 4 | 25 x 24 | from a far cabin's chimney, looping |

## Review sheets (this folder, 2x, portrait 360 x 640 native)

`region-1-prairie.png` .. `region-9-valley.png`: each region in play, the line at work (the first batch's track, tiles
and crew), men at the corridor's south edge right by the border, the near side's three bands, the region's landmarks
and life. The far side is a stand-in from the first batch's tiles and trees (Artist 2 draws the real one).
`blend-1-prairie-creek.png` .. `blend-8-pass-valley.png`: each blend between its two regions. `marks-1.png`: the
standalone landmarks. `marks-2-pieces.png`: the border-piece landmarks between their region's ordinary edge pieces
(the joins), and the rock cut's faces on the line. `life.png`: every wildlife frame (3x), a navvy for scale.

## Not done, or worth another pass

- The beasts are blocky at this size (built from engine shapes); the deer and buffalo would gain from a hand-pixel
  pass. The wagon wreck's wheels and bows barely read.
- The far town is a cluster of hazy blocks; it reads as distance, not as a town.
- Only one of each border landmark piece (no variants), and the water tower and far town carry no frames.
- The near side's ground at local z 0 uses the first batch's prairie, woods-floor and rock textures; when Artist 2's
  `tile/wild/<region>` tiles land, the edge pieces' first metre may want their textures.
