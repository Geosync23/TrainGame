# D32 stage 3: the art the rooms and the far town ask for (Rooms builder)

This is the contract between the Rooms code in `index.html` and the artists. The code asks for every key below and
draws a stand-in of its own until the key exists in the atlas, so each piece can land on its own, in any order. Keep
this file true: if a key, a size or an anchor changes in the code, it changes here in the same commit.

Units: u (1 u = 0.7 m; a person is 2.5 u tall, 20 px). Projection as everywhere (`plans/proto-sprites.md`): world +x
is 8 px right and 4 px down, +z is 8 px left and 4 px down, +y is 8 px up. "The viewer's side" of a building is its
+x and +z sides (east and south): those are the walls that fade.

## 1. Buildings in parts

Every enterable building is drawn whole while it is shut (today's sprites, unchanged). While it is open (the player
inside it, within 1.2 u of its door outside, or after a tap on it) it is drawn as one sorted item in this order:

1. `<B>/floor` (the floor, at the floor's height),
2. `<B>/back` (the inner faces of the two walls away from the viewer, -x and -z, seen from inside: plank or
   plastered walls, windows, a back door, pictures, a calendar; nothing that stands on the floor),
3. the furniture and the people inside, sorted among themselves,
4. `<B>/front` and `<B>/roof`, faded together from 1 to 0 over 0.25 s (and back when he leaves). The bottom
   0.45 u of `/front` stays as a sill, with a soft top edge (the code makes the sill from `/front`; nothing to draw).

| Part | What it holds | Frame |
|---|---|---|
| `<B>/front` | the walls on the +x and +z faces of the body's box, from the ground up to the eaves, with what is fixed to them (windows, the door, porch posts on that side, the false front's lower part) | same size and anchor as the body sprite today (or any size, as long as the anchor is the same world point) |
| `<B>/roof` | everything above the eaves: the roof, the false front's upper part, chimneys, an upper storey (the hotel, the saloon) | same anchor |
| `<B>/back` | the two far walls' inner faces, from the floor to the eaves, and the far edges of the floor's skirting | same anchor |
| `<B>/floor` | the floor boards (or earth for the smithy and the livery) of the whole interior, drawn at the floor height (lifted in the art) | same anchor |
| `<B>/front_lit`, `/roof_lit`, `/back_lit` | at night (19:30 to 06:15): lit windows, as the `_lit` bodies today | same anchor as the unlit part |

The front walls must stand on the +x and +z faces of the body's box (`extra.box` of `<B>/body`, or of the whole
sprite for the church, the school, the houses and the station): the code finds the sill and the stand-in parts from
that box. Give each part `extra.box` = the body's box.

Building keys `<B>` and the frames of today's sprites (width x height px, anchor x, y; the anchor is the world point
in the third column, at the ground):

| `<B>` | Today's sprite | Anchor (world) | Floor height (u) | Eaves (u) |
|---|---|---|---|---|
| `bld/shop_store/e` | `.../body` 175 x 130, 78, 83 | lot centre (-15.5, -38) | 0.3 | 4.6 |
| `bld/shop_hotel/e` | 183 x 158, 85, 111 | (-15.5, -52) | 0.3 | 4.6 (ground floor; the upper storey is roof) |
| `bld/shop_bank/e` | 176 x 130, 78, 83 | (-15.5, -66) | 0.3 | 4.6 |
| `bld/shop_smithy/e` | 179 x 127, 82, 80 | (-15.5, -80) | 0.05 (earth) | 4.6 |
| `bld/shop_livery/e` | 228 x 159, 131, 113 | (-15.5, -94) | 0.05 (earth) | 5.2 |
| `bld/shop_feed/e` | 179 x 127, 82, 80 | (-15.5, -108) | 1.0 (the loading dock's height) | 4.6 |
| `bld/shop_saloon/w` | 174 x 153, 97, 117 | (15.5, -38) | 0.3 | 4.6 |
| `bld/shop_newspaper/w` | 174 x 146, 97, 110 | (15.5, -52) | 0.3 | 4.6 |
| `bld/shop_barber/w` | 170 x 140, 97, 106 | (15.5, -66) | 0.3 | 4.6 |
| `bld/shop_sheriff/w` | 176 x 139, 98, 101 | (15.5, -80) | 0.3 | 4.6 |
| `bld/shop_undertaker/w` | 170 x 144, 97, 110 | (15.5, -94) | 0.3 | 4.6 |
| `bld/shop_assay/w` | 160 x 128, 98, 98 | (15.5, -108) | 0.3 | 4.6 |
| `bld/church` | `bld/church` 205 x 149, 95, 102 | (0, -128) | 0.3 | 7.0 |
| `bld/school` | `bld/school` 169 x 119, 87, 78 | (-20, -128) | 0.3 | 4.5 |
| `bld/house/<1..4>/<e|w>` | `bld/house/<n>/<f>` about 107 x 84 | the house's centre (x +-35, z -40, -60, -80, -100) | 0.3 | 3.4 |
| `bld/station` | `bld/station` 228 x 160, 114, 106 | (0, -24.3) | 0.375 | 5.5 |
| `bld/cabin/<e|w>`, `bld/framehouse/<e|w>`, `bld/house2/<e|w>` | (Town's new houses, plan 10.5: about 112 x 100) | the house's centre | 0.3 | 3.4 |

`e` is a building whose front (door) faces +x, `w` one whose front faces -x (seen from behind). A shop's awning,
sign, yard and pole stay as they are: the awning and sign of the west row (on the viewer's side) fade with the
front; the east row's (on the far side) stay.

The rooms (the interior's floor, the door, where the furniture stands) are in `index.html`, section "rooms (D32)",
table `RM_KIND` and `rmRooms()`; `node tools/pixelart/export-layout.js` is not changed yet (ask the Rooms builder
for numbers, or read them from `__railhead.rm.rooms()` in the page).

## 2. The camp's tents

Already in the atlas and used as they are: `camp/tent/back`, `/front`, `/roof` (and `_lit`), `camp/cooktent/...`.
Optional and asked for: `camp/tent/floor`, `camp/cooktent/floor` (canvas floor, same anchor as `/back`). A tent opens
like a building (the player inside it, within 1.2 u of its door at its +z end, the end towards the viewer, or a tap); its front and roof fade.

## 3. Furniture: `furn/<name>/<o>`

Anchor: the middle of the piece's footprint, on the floor (the code puts it at the floor's height). `<o>` is the
piece's orientation: `x` (its long side along world x) or `z` (along world z) for most; for a seat or a desk that
faces a way, `se`, `sw`, `ne`, `nw` (the way a person sitting at it faces). Give `extra.box` = `[x0, z0, x1, z1,
h]` in u from the anchor if it differs from the footprint below. Stand-ins are plain boxes in these sizes and colours.

| Name | Footprint (long x short, u) and height | `<o>` | Where |
|---|---|---|---|
| `counter` | 4.0 x 0.9, 1.4 | x, z | store, bank, hotel desk, assay, newspaper, barber, undertaker, sheriff, feed, livery office, station ticket counter |
| `shelf/0`, `shelf/1`, `shelf/2`, `shelf/3` | 3.0 x 0.6, 2.6 | x, z | shops' walls; 0 empty, 1 a little, 2 half, 3 full (the shop's stock, four levels) |
| `table` | 1.6 x 1.0, 1.0 | x, z | homes, hotel dining room, saloon, school (teacher), newspaper |
| `chair` | 0.6 x 0.6, 1.3 | se, sw, ne, nw | at tables and desks |
| `bed`, `bed_made` | 2.4 x 1.2, 0.8 | x, z | homes, the hotel, the jail's cells; `bed` with someone in it is drawn with the person's `lie` frame over it when the art has one |
| `stove` | 0.9 x 0.9, 1.6 (and `stove/1` for a lit frame) | x | homes, store, school, station, jail, church |
| `bar` | 5.0 x 1.0, 1.5 | x, z | saloon |
| `barstool` | 0.5 x 0.5, 1.0 | x | saloon |
| `desk` | 1.0 x 0.8, 1.1 | se, sw, ne, nw | school (pupils), bank, sheriff, assay, newspaper |
| `pew` | 4.0 x 0.7, 1.2 | x, z | church |
| `pulpit` | 1.0 x 1.0, 1.8 | se, sw, ne, nw | church |
| `blackboard` | 3.0 x 0.2, 2.4 | x, z | school, on the back wall |
| `press` | 2.2 x 1.4, 1.8 | x, z | newspaper (the printing press) |
| `cell_bars` | 4.0 x 0.2, 3.0 | x, z | sheriff (the cells' front) |
| `safe` | 1.0 x 1.0, 1.5 | x | bank, assay |
| `barber_chair` | 1.0 x 1.0, 1.4 | se, sw, ne, nw | barber |
| `coffin` | 2.4 x 0.8, 0.7 | x, z | undertaker |
| `forge` | 2.0 x 1.6, 1.6 (and `forge/1` lit) | x | smithy |
| `anvil` | 0.8 x 0.4, 0.8 | x | smithy |
| `stall` | 3.0 x 2.6, 1.6 | x, z | livery (a horse's stall; `stall/horse` with a horse in it) |
| `piano` | 1.6 x 0.7, 1.6 | x, z | saloon, hotel |
| `rug` | 2.4 x 1.6, 0.05 | x, z | homes, hotel, bank (flat) |
| `wash_stand` | 0.7 x 0.6, 1.2 | x | homes, hotel, barber |
| `lamp_table`, `lamp_table_lit` | 0.5 x 0.5, 1.3 | x | homes, hotel |
| `sacks` | 1.6 x 1.0, 1.0 | x, z | feed (floor stock, four levels: `sacks/0..3`) |
| `bench` | 3.0 x 0.6, 0.8 | x, z | station waiting room, saloon, barber |

## 4. People indoors

Today's townsfolk sprites are used: `idle`, `talk`, `benchSit` (on a pew, a barstool, a chair, a bench), `walk`.
Asked for (plan 10.1), each drawn from the same 20 px people: `ppl/<who>/work/<f>/<0..1>` (behind a counter, at the
forge, at the press), `ppl/<who>/sit/<f>/0` (on a chair at a table or desk), `ppl/<who>/lie/<sw|se>/0` (in bed). Until
they land: `work` is drawn as `idle`, `sit` as `benchSit`, and a person in bed as the bed with a blanket over a hump.

## 5. The far town (plan 8.5), at the end of the line

Not enterable; drawn into the line's ground (baked), north of the track at the end of track (line x 3,600 u, world x
3,680 u). Keys asked for, each with a stand-in from today's art:

| Key | Size (px, about) | Anchor | Stand-in until it lands |
|---|---|---|---|
| `far/depot` | as `bld/station` (228 x 160) | its centre at the ground | `bld/station` |
| `far/platform` | drawn in tiles: `plat/deck/v0..3`, `plat/edge_s/v0..1` | | the same tiles (no new art needed) |
| `far/tank` | as `bld/watertower` (58 x 92) | its foot | `bld/watertower` |
| `far/grainstore` | about 180 x 160 | its centre at the ground | `bld/shop_feed/e/body` |
| `far/hotel2` | as the hotel (183 x 158) | its centre at the ground | `bld/shop_hotel/e/body` |
| `far/sign` | about 40 x 30 | its foot | `bld/lever` style post with the town's name in the pixel font |

The other six street buildings are today's whole shop bodies (`bld/shop_<kind>/e/body` and `.../w/body`) in another
order; fences `nat/fence_x`, `nat/fence_z`; fields `tile/field/1..2`; haystacks `nat/haystack`; a dozen townsfolk
from today's people, standing (`idle`, `talk`).
