# D32: the journey along the line (designer, 2026-11-13)

The designer's words: the natural edge does not need to be far from the track. There must be boundaries: dense
forests, rocks, mountains, rocky sections, rivers alongside, canyons. "Make it a journey. Make it beautiful."
No boundary of the world is ever seen, even zoomed right out and standing at the edge.

## Rules
1. The walkable corridor is narrow (the track, the work site beside it, a little room to walk). A natural border
   runs along each side, close to the track, and is what stops the player.
2. The view is from the south-east looking down (the fixed 2:1 projection), so the two sides differ:
   - **Far side (north, up the screen):** may be TALL. Forest walls, cliffs, canyon walls, mountain faces, with more
     drawn behind them (a second and third rank fading up the screen) so the top of the screen is always filled.
   - **Near side (south, down the screen):** must be LOW or fall away, so it never hides the men at work: a river
     alongside, a canyon rim with the drop below, a ravine, boulder fields, thick low brush, marsh, deadfall. Tall
     things on this side stand well back from the corridor and are drawn below the corridor on the screen.
3. Beyond both borders, and beyond both ends of the strip, country is drawn far enough to fill the furthest zoom.
4. Regions change along the line so the trip reads as a journey; each has its own ground, borders, scatter and one or
   two landmarks. Regions blend into each other over a stretch, never a hard line.

## The regions, from the station to the far town (provisional lengths; Foundation's table rules)
| # | Region | Share | Far side (tall) | Near side (low) | Landmarks |
|---|---|---|---|---|---|
| 1 | Home prairie | 10% | rolling grass rises with scattered oaks | thick brush and a split-rail fence line gone wild | the yard-limit board, a lone cottonwood |
| 2 | Creek bottoms | 8% | cottonwood and willow thicket | the creek winding alongside, reeds, then the trestle crossing | the creek trestle, a beaver dam |
| 3 | The hills and the cut | 10% | grassy bluffs with rock ledges | a slope falling away to a draw | the low cut through the rise |
| 4 | The big woods | 16% | a dense wall of tall pines, dark between the trunks | deadfall, ferns, stumps of felled trees, a slash pile | a giant old pine, a ruined trapper's cabin |
| 5 | The rocks | 12% | broken cliffs and talus, standing stones | a boulder field | a balanced rock, a rock cut blasted through a spur |
| 6 | The river run | 16% | wooded bluffs | the river running alongside, rapids, gravel bars, driftwood | a waterfall on the far bluff, an old ferry landing |
| 7 | The canyon | 14% | a high red canyon wall, layered, with ledges and pines clinging | the canyon rim: the ground drops away to the river far below | a natural arch, a narrow shelf where the track hugs the wall |
| 8 | The pass | 8% | mountain faces with snow high up, scree | a steep drop with the valley seen below | the summit board |
| 9 | The far valley | 6% | pasture, orchards, the first fences and barns | a mill stream | the far town's water tower in the distance |

Wildlife and life, sparingly, for charm: deer at the wood's edge, a hawk's shadow, buffalo far off on the prairie,
ducks on the river, a fox, prairie dogs, smoke from a far cabin.

## Art keys (two more artists, Opus)
- Artist 2, `wild/far/<region>/...`: the tall far-side borders and the ranks behind them, and each region's ground
  tiles (`tile/wild/<region>/...`).
- Artist 3, `wild/near/<region>/...`: the low near-side borders (water is animated), `wild/mark/...` the landmarks,
  `wild/life/...` the wildlife.
