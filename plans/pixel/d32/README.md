# D32 art, batch one (stage 1): keys, frames and sizes

Made by `tools/pixelart/` (run `python3 tools/pixelart/build.py`, then `python3 tools/pixelart/review_d32.py` for the
sheets in this folder). Drawing code: `people_navvy.py` and `sprites_navvy.py` (the crew, tools), `line_d32.py`
(track stages, piles), `country_d32.py` (country, cut, trestle), `worktrain_d32.py` (cars), `sprites_line.py`
(registers line, country and cars), `sprites_camp.py` (camp), `geom_d32.py` (shapes in a turned and tipped frame),
`pal_d32.py` (five muted ramps appended: earth, canvas, river, bark, needle). `registry.py` gained the owners of the
new prefixes. Sizes are in native pixels (the largest frame of the key). Anchors and notes for every key are in
`tools/pixelart/out/atlas.json` (`notes`); what the renderer needs is in `PIX_ATLAS.extra`.

Atlas after this batch: **767 KB** of base64 (was 612): sheets navvy 35.7 KB, country 19.1, worktrain 9.3, camp 9.1,
line 4.1 (PNG bytes), plus the frames index for 911 new frames. It is over the 700 KB budget until Foundation's `v: 2`
index lands (plan 10.7).

## The crew (`ppl/navvy_a`, `ppl/navvy_b`, `ppl/navvy_c`)

Three looks: **a** hickory-blue shirt and braces, a battered felt hat, moustache, brown duck trousers; **b** a dark
vest over a linen shirt, a red neckerchief, a derby, ginger side whiskers, grey trousers; **c** stocky (a wider body),
a red flannel undershirt and braces, a faded army forage cap, a full beard. The same 20 px rig, palette, light and
outline as the townsfolk. Keys `ppl/<who>/<anim>/<dir>/<f>`, all four facings (`se`, `ne`, `sw`, `nw`) drawn, never
mirrored; anchor between the feet unless said.

| anim | frames | size (px) | note |
|---|---|---|---|
| `idle` | 2 | 13 x 23 | |
| `walk` | 4 | 15 x 23 | pass, stride, pass, stride |
| `shoulder` | 4 | 14 x 23 | walking, a tool on the shoulder: draw `tool/<t>/held/<dir>` at `extra.tool` (per frame) after the man |
| `pick` | 4 | 19 x 25 | lift, top, strike, bite (tool drawn in) |
| `shovel` | 4 | 20 x 23 | blade in under the boot, lever, lift earth, throw |
| `maul` | 4 | 20 x 28 | spiking: up, overhead, down, on the spike |
| `axe` | 4 | 20 x 24 | felling: back, up, the cut, follow through |
| `hook` | 3 | 21 x 25 | brush hook: raised, slash, low |
| `rake` | 3 | 20 x 23 | spreading rock: reach, draw in, close |
| `barrow` | 4 | 13 x 23 | pushing; `extra.grip` per frame: draw `tool/barrow/<dir>[/full]` there |
| `tip` | 2 | 14 x 23 | brace, handles up (`tool/barrow/<dir>/tipped` on frame 1); `extra.grip` |
| `tieFront`, `tieBack` | 4 each | 25 x 23 | a pair carrying a tie on the near shoulder, each man's half drawn in; the pair walk 3u apart, front man ahead |
| `tieDrop` | 2 | 14 x 22 | bending, down (draw `line/tie_loose` under the hands) |
| `railCarry` | 4 | 13 x 23 | one of four on a rail with tongs, stooped; `extra.grip`; the rail is `line/rail_carried` |
| `railDrop` | 2 | 14 x 24 | setting the rail down; `extra.grip` |
| `sit` | 1 | 14 x 20 | on the ground, knees up; anchor the hips on the ground (on a bench: draw 0.5u up) |
| `eat` | 2 | 14 x 20 | sitting, a tin plate: plate, a bite |
| `drink` | 2 | 13 x 23 | standing, a tin cup: lifting, drinking |
| `lie` | 1, facings `se` (along x) and `sw` (along z) | 24 x 16 | asleep under a blanket (a slate, umber or red blanket by look); anchor the cot's centre, drawn after `camp/cot` / `camp/cot_z` |

So 238 frames a man, 714 in all.

## Tools (`tool/`)

| key | frames | size | note |
|---|---|---|---|
| `tool/<t>/held/<dir>`, t = pick, shovel, maul, axe, hook, rake, tongs | 1 | about 13 x 9 | on the shoulder; anchor the hand on the handle |
| `tool/<t>/ground` | 1 | about 18 x 6 | lying on the ground |
| `tool/barrow/<dir>`, `/<dir>/full`, `/<dir>/tipped` | 1 each | 21 x 15 (tipped up to 36 x 23) | anchor the handles' ends (the pusher's `extra.grip`) |

## The track at each stage (`tile/ln_*`, `line/`)

| key | frames | size | note |
|---|---|---|---|
| `tile/ln_cleared/1..2`, `tile/ln_bed/1..2`, `tile/ln_rock/1..2` | 1 each | 14 x 8 (a 1u cell) | cleared, dug bed, rock ballast; noise per pixel, so any variant joins any other |
| `tile/ln_bed_edge_n|s`, `tile/ln_rock_edge_n|s` | 1 each | 14 x 8 | extra: the edge cells (a lip of spoil); suggested widths: cleared z within 5u, bed 3u (edge cells at z -4 and 3), rock 2.3u (edge cells at z -3 and 2) |
| `line/tie_laid/1..2`, `line/spiked`, `line/joint`, `line/rails` | 1 each | 32 x 18, 21 x 11, 24 x 13, 26 x 15 | extra: a laid tie, its plates and spike heads, a joint's fishplates, 1u of both rails (repeats every 8 x 4 px); the renderer may keep drawing its own ties and rails per pixel |
| `line/stake`, `line/stake_plain`, `line/string` | 1 | 12 x 13, 7 x 4 | stakes; 1u of string line at 0.9u (repeats) |
| `line/tie_loose/x`, `/z` | 1 | 34 x 19 | |
| `line/tie_pile/1..3` | 1 each | up to 55 x 40 | 2, 4, 7 layers; `extra.box` |
| `line/rail_loose`, `line/rail_carried` | 1 | 106 x 54 | 13u rail; carried at 0.35u |
| `line/rail_stack/1..3` | 1 each | 123 x 66 | 2, 6, 12 rails; `extra.box` |
| `line/keg`, `line/spikes` | 1 | 13 x 11, 10 x 7 | |
| `line/rock_heap/1..3`, `line/earth_heap/1..2` | 1 each | up to 37 x 20, 40 x 20 | |
| `line/yard_limit`, `line/mile_board`, `line/end_stake` | 1 | about 24 x 25 | |

## The country

| key | frames | size | note |
|---|---|---|---|
| `tile/prairie/1..4` | 1 each | 14 x 8 | green, dry grama, flowers, stones |
| `tile/woodfloor/1..3`, `tile/rockground/1..3`, `tile/hill_lit/1..2`, `tile/hill_shade/1..2`, `tile/field/1..2` | 1 each | 14 x 8 | |
| `tile/river/0..1` | 2 frames | 14 x 8 | |
| `tile/riverbank/<n s e w ne nw se sw>` | 1 each | 14 x 8 | as the creek's `tile/bank` |
| `tile/trail/x`, `/z` | 1 | 14 x 8 | extra: animal trails |
| `nat/pine/1..3` | 1 each | up to 66 x 67 (with shadow) | ponderosa, 6, 5, 4u |
| `nat/oak/1..2` | 1 each | up to 93 x 74 (with shadow) | bur oak |
| `nat/stump/1..2`, `nat/felled`, `nat/brush/1..3`, `nat/brush_cut` | 1 each | 26 x 14 to 65 x 37 | |
| `nat/mound/1..3` | 1 each | up to 176 x 88 | hills beyond the corridor, to bake into the ground |
| `nat/fence_x`, `nat/fence_z`, `nat/haystack` | 1 | 82 x 51, 47 x 32 | |
| extras: `nat/snag`, `nat/bush/1..2`, `nat/stones/1..3`, `nat/bones`, `nat/burrow` | 1 each | 9 x 7 to 48 x 54 | a dead pine, berry bushes, small stones, a buffalo skull, a prairie dog's mound |
| `line/rise/1..3` | 1 each | 112 x 62 | the rise across the line, 8u pieces, z -3..3, 0.75u high: 1 rises, 2 full, 3 falls; anchor the piece's middle on the line |
| `line/cut_bank_n`, `line/cut_bank_s` (+ `_up`, `_down` ends) | 1 each | 80 x 46 | the banks either side of the cut, z 3..5; the north one shows its earth face |
| `line/trestle_bent`, `line/trestle_part/1..3` | 1 each | 40 x 33 | a bent, and its stages: piles, posts with a brace, posts and cap; anchor at the track's level, the picture reaches 2u below into the creek |
| `line/trestle_deck` (+ `line/trestle_deck_half`) | 1 | 82 x 42 | 6u of stringers between bents |

## The work train (`veh/`)

| key | frames | size | note |
|---|---|---|---|
| `veh/crewcar/e`, `/w` | 1 | 140 x 104 | 11.5u with its end platforms; same picture both ways |
| `veh/gondola/e`, `/w` | 1 | 129 x 84 | |
| `veh/gondola_load/1..3`, `veh/flat_rails/1..3`, `veh/flat_ties/1..3` | 1 each | up to 122 x 82 | loads, drawn after the car at the car's anchor (the near side already cut away) |
| `veh/crewcar_in/<e|w>/floor`, `/sill`, `veh/crewcar_in/bench` | 1 | 140 x 101, 108 x 44, 36 x 21 | the crew car cut away, with riders on benches |

## The camp (`camp/`)

| key | frames | size | note |
|---|---|---|---|
| `camp/tent/back`, `/front`, `/roof` and `_lit` of each | 1 | 84 x 56, 90 x 39, 109 x 64 | a wall tent 4.5 x 6u, door to +z; `_lit`: lantern light through the canvas at night, same size and anchor |
| `camp/cooktent/back`, `/front`, `/roof` and `_lit` | 1 | up to 141 x 80 | 6 x 8u, a stovepipe |
| `camp/cot`, `camp/cot_z`, `camp/cot_made`, `camp/table`, `camp/bench`, `camp/fire_out`, `camp/kettle`, `camp/toolrack`, `camp/barrel`, `camp/washline` | 1 each | 18 x 16 to 49 x 32 | |
| `camp/fire/0..2` | 3 | 24 x 13 | |

## Review sheets (this folder)

`navvy-navvy_a.png`, `-b`, `-c` (every frame, four facings, tools and barrow at their marks), `crew-scene.png` (the
crew beside the agent, a cowhand and the smith), `track-stages.png` (the six fronts with the gangs at work),
`track-each.png` (each stage alone), `country-1.png` to `-3.png` (prairie, brush, woods, hills, the cut, rock, the
river, the creek trestle, the far town's fields), `prairie-long.png` (120u of prairie), `worktrain.png`,
`worktrain-cars.png`, `camp-day.png`, `camp-night.png` (a stand-in night tint). The scatter and tile choices in the
sheets are the review script's stand-in for Foundation's `lnTile` and `lnScatter`, not the game's.
