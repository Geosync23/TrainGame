# D32 wild country, the far side and the ground (Artist 2): keys, sizes, joins and ranks

Made by `tools/pixelart/` (run `python3 tools/pixelart/build.py`, then `python3 tools/pixelart/review_wild_far.py all`
for the sheets and the key table in this folder). Drawing code: `sprites_wild_far.py` (registers the keys, keeps a
cache of finished modules in the system's temp folder, keyed by the drawing code), `wild_kit.py` (the module rule,
the terrain ray-marcher, pines, spruces, broadleaf trees, shrubs, rocks, the haze), `wild_regions.py` (the nine
regions, rank by rank), `wild_ground.py` (the nine grounds and the blends), `pal_wild.py` (four ramps appended:
redrock, granite, snow, dryslope; no existing index moves). The regions follow `plans/d32-journey.md`, in order:
prairie, creek, hills, woods, rocks, river, canyon, pass, valley. Sizes are native pixels; every key is one frame.

All distances below are game units (u) measured from the corridor's north edge, the line where the far border
stands (call it z_w; north is -z, up the screen). Placement in the review sheets (variant choice, region boundaries)
is a stand-in for Foundation's, not the game's.

## The ground (`tile/wild/...`)

| key | size | note |
|---|---|---|
| `tile/wild/<region>/1..4` | 14 x 8 (a 1u cell, anchor as every `tile/`) | the region's ground, 4 variants. Noise per pixel, so any variant joins any other in any order: pick by a hash of the cell |
| `tile/wild/blend/<a>-<b>/1..4` | 14 x 8 | region a's ground giving way to the next region b's: 20, 40, 60, 80% of b, in soft patches |

Regions and their next: prairie-creek, creek-hills, hills-woods, woods-rocks, rocks-river, river-canyon,
canyon-pass, pass-valley (8 blends, 32 tiles). Across a region boundary, use over about 12u before it: share of b
rising from 0 to 1, plus a little per-cell jitter, quantised to blend 1..4 (0 = a's own tile, 5 = b's own). The
corridor's own ground and the track go on top as before. The far border's foot is drawn with the same textures,
so the ground tiles run into it without a seam.

What each ground is: prairie (green, dry grama, flowers, tall grass), creek (lush grass, sedge, clover, mud), hills
(bunchgrass, dry patches, sandstone chips), woods (needles and duff, darker than `tile/woodfloor`, ferns), rocks
(bare sandstone, grit, lichen; 4 pebbly), river (grass with sand, gravel and cobbles), canyon (red sand, slickrock,
scrub), pass (alpine grass on granite grit, scree; 4 a snow patch), valley (lush pasture, clover, daisies).

## The far side (`wild/far/<region>/...`)

| key | count per region | size | what |
|---|---|---|---|
| `wild/far/<region>/r1/1..4` | 4 | 128 px wide, 207 to 390 px tall | rank 1, the tall border at the corridor's edge |
| `wild/far/<region>/r2/1..3` | 3 | 128 wide, 245 to 480 tall | rank 2, behind it, paler |
| `wild/far/<region>/r3/1..3` | 3 | 128 wide, 280 to 575 tall | rank 3, behind that, palest; repeated north |
| `wild/far/<region>/r<k>/to_<next>/1..2` | 2 per rank | 128 wide | rank k carried into the next region (every region but the valley) |

9 regions x 10 plain modules + 8 x 6 transition modules = 138 frames; with the 68 tiles, 206 keys. The exact size
and anchor of every one is in the table at the end (also `keys.md`, and `notes`/`extra` in
`tools/pixelart/out/atlas.json`; `extra` carries `w` 16, `rank`, `back` (the rank's offset), `depth`, `repeat`).

Heights of the walls (rank 1): prairie, creek and valley low (a rise with trees, about 200 to 240 px above the
anchor including tree tops), woods a wall of 9 to 12u pines, hills and rocks bluffs and broken cliffs, river wooded
bluffs, canyon a layered red wall about 24u high with ledges and clinging pines, pass granite faces with spires and
snow high up (up to 42u in rank 3).

### How the modules join

- A module is one vertical strip of the screen: every point whose u = x - z lies in [0, 16). It is exactly 128 px
  wide (8 px per u of columns). Its anchor (ax 0, ay given per key) is its front-left corner at ground level: the
  point x = 0, z = 0 (its front line), y = 0, in the module's own frame.
- Modules of one rank stand side by side every 16u along x, all on the same z. Two neighbours never overlap on the
  screen (the strips meet at one column), so draw order along a row does not matter.
- **Any variant joins any other** of the same region and rank, in any order, and mirrors are never needed: the
  content within 3u before and 2u after each strip edge (the join zone) is drawn from the region's join seed, the
  same in every variant and at both edges; only the middle comes from the variant's own seed. Big, recognisable
  things (oaks, shade trees) are thinned in the join zone so the shared seam does not read as a repeat. Choose a
  variant by a hash of the module's index, never the same twice running.
- **Into the next region**: the last two modules of a region's run are `to_<next>/1` then `to_<next>/2`; the next
  module is the next region's own (any variant). `/1` blends from 0 (all this region) at its left edge to 0.5 at its
  right, `/2` from 0.5 to 1 (all the next region): heights blend, rock and ground dither in patches, and each tree or
  rock comes from one region or the other in proportion. So a region boundary on the far side is a 32u stretch,
  ending where the next region begins; the ground blend tiles (above) can be laid over the same stretch.

### How the ranks stack (offsets north of the corridor's edge)

| rank | anchor row at | band it covers (u north of z_w) | haze | x offset of its grid (suggested) |
|---|---|---|---|---|
| 1 | z_w (0u) | about -1 (a ragged front up to 1u into the corridor's edge) to 16u | none | 0 |
| 2 | z_w - 14 | 14 to 32u | 11% | 5u |
| 3 | z_w - 30, then z_w - 50, z_w - 70 ... every 20u | 30 to 52u, and on north | 22% | 9u, and 7u more per further row |

- Draw the furthest rank 3 row first, then nearer rank 3 rows, then rank 2, then rank 1, then the corridor (ground
  tiles first; the far border is drawn after the ground tiles and before anything in the corridor).
- Each band runs a little past the next one's front (rank 1 reaches 16u, rank 2 starts at 14u), so no ground ever
  shows between ranks; the nearer rank always covers the foot of the one behind.
- Repeat rank 3 rows north until the row's lowest picture is above the top of the screen at the furthest zoom. In
  the review (a 400 x 720 px phone view, the track 160 px from the bottom) that is 4 to 6 rows.
- Offset each rank's module grid along x (the suggested offsets above) so the seams of the ranks never line up.
- A rank row changes region where the line does: all ranks of a region use the same boundary x (the transition
  modules of each rank end at it).

## Review sheets (this folder)

`<region>.png` for each of the nine (a phone-shaped view at 2x: ground, finished track with navvies for scale, the
three ranks above), `join-<a>-<b>.png` for the eight boundaries, `journey.png` (all nine in a row, 1x, 60u each),
`keys.md` (the generated key table). Module sheets: `tools/pixelart/out/sheet-wild_far_<region>.png`,
`sheet-wild_tiles.png`.

## Every key

<!-- keys -->
<!-- /keys -->
