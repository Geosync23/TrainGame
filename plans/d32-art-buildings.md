# D32 stage 3: the buildings art (the buildings artist)

What was delivered for the bigger town, following the Rooms builder's contract `plans/d32-rooms-art.md` (keys,
anchors, floor heights, eaves) and plan `plans/d32-tech.md` 10.5 and 10.6 where it is silent. Everything is made by
code in `tools/pixelart/`; nothing in `index.html` was touched (the lead runs `build.py` and `embed.py` at merge).

## How the parts are made (and why they line up)

- `ptag.py`: while a building is drawn, every pixel the engine writes also records which part it belongs to
  (back, front, roof, floor). The drawing code of today's buildings (`town27.py`, `station27.py`) now says what it
  is drawing with `tag(...)` calls; nothing else in it changed. Build-checked: every whole sprite registered by
  `town27_reg.py` is still the same picture, pixel for pixel (`bldparts_reg.register_parts` asserts it at build time,
  and a comparison with the atlas from before the change found 167 of 167 town frames identical).
- `bldparts.py`: the split. The whole drawing's pixels go to `/front`, `/roof` or `/back` by tag; a front pixel above
  the eaves goes to `/roof` (the contract: "everything above the eaves"). The interior (the inner faces of the far
  walls, what is fixed to them, the floor) is a second drawing on the same canvas; it fills only the pixels the front
  and roof cover in the whole. So `front + roof` over `back + floor` is exactly the whole sprite.
- **The proof:** `python3 tools/pixelart/check_bldparts.py [out dir]` reads the built atlas (`atlas.json` and the
  sheet PNGs, what the game gets), draws `floor, back, front, roof` at their anchors for every building and compares
  with the whole sprite pixel for pixel (RGBA), by day and by night (`back_lit`, `front_lit`, `roof_lit` where they
  exist, else the day part, against the whole's `_lit`). Result: **35 buildings match their whole sprites exactly,
  0 do not** (0 pixels differ, 0 pixels outside the whole), day and night.
- Every part has the whole sprite's anchor (the same world point); frames are cropped to their own pixels (the anchor
  kept inside the frame, as A3 did). `extra` on every part: `box` (the whole's box), `floor_y` (u), `eave` (u),
  `whole` (the whole sprite's key).

## Keys delivered

Parts for each `<B>`: `<B>/floor`, `<B>/back`, `<B>/front`, `<B>/roof`, and the night ones where they differ from
the day ones: `<B>/front_lit` (all), `<B>/back_lit` (all: the far walls' windows and wall lamps), `<B>/roof_lit`
(only where a lamp's halo reaches the roof: store, hotel, station, some houses). A missing `_lit` part means "use
the day part".

### Shops (sheets `d32_rooms_w`, `d32_rooms_e`)

| `<B>` | whole (w x h, anchor) | floor y (u) | eave cut (u) | inside |
|---|---|---|---|---|
| `bld/shop_store/e` | body 175x130, 78,83 | 0.3 | 4.6 | striped paper, wainscot, back door, window, clock, notices, a picture, a high shelf of jars and tins, pegs |
| `bld/shop_hotel/e` | 183x158, 85,111 | 0.3 | 4.6 (the upper storey is roof) | blue diamond paper, a staircase up the west wall, the room keys' board and hooks, mirror, portrait, clock, wall lamps, a doorway |
| `bld/shop_bank/e` | 176x130, 78,83 | 0.3 | 4.6 | the vault door in the north wall, barred windows, portrait, clock, a chart |
| `bld/shop_smithy/e` | 179x127, 82,80 | 0.05 (earth) | 4.6 | bare boards, tongs, hammers, horseshoes and a collar on pegs |
| `bld/shop_livery/e` | 228x159, 131,113 | 0.05 (earth) | 5.2 | boards, saddles, harness, collars, rope, a sickle on pegs, the barn's back doors |
| `bld/shop_feed/e` | 179x127, 82,80 | 1.0 (the dock's height) | 4.6 | straw boards, a calendar, a chart, rope and a sickle |
| `bld/shop_saloon/w` | 174x153, 97,117 | 0.3 | 4.6 | red paper, a long back-bar mirror with a shelf of bottles, antlers, portrait; the street front from inside (glazed door, shop windows) |
| `bld/shop_newspaper/w` | 174x146, 97,110 | 0.3 | 4.6 | plaster, proof sheets and notices pinned up, a shelf of books, clock |
| `bld/shop_barber/w` | 170x140, 97,106 | 0.3 | 4.6 | striped paper, two mirrors, a shelf of bottles and jars, coat and hat |
| `bld/shop_sheriff/w` | 176x139, 98,101 | 0.3 (flags) | 4.6 | stone walls, WANTED posters, the key ring, a gun rack, a hat |
| `bld/shop_undertaker/w` | 170x144, 97,110 | 0.3 | 4.6 | sage sprig paper, portraits, clock, coat and hat |
| `bld/shop_assay/w` | 160x128, 98,98 | 0.3 (flags) | 4.6 | stone walls, two shelves of flasks and books, a chart, a map |

East-row shops: the west wall is their street front, so from inside it has the glazed front door (at the lot's middle,
where the delivery spot is) and two shop windows; above the wall the false front's raw back is part of `/back`
(it stays when the building opens, as the far wall it is).

### Church, school, houses, station (sheets `d32_rooms_civic`, `d32_rooms_houses`)

| `<B>` | whole | floor y | eave | notes |
|---|---|---|---|---|
| `bld/church` | 205x149, 95,102 | 0.3 | 7.0 | a coloured arched window over the altar end with a brass cross, four arched windows, wall lamps; the floor runs on into the tower's vestibule; the tower, belfry and spire fade (front and roof); the front steps stay (`/back`) |
| `bld/school` | 169x119, 87,78 | 0.3 | 4.5 | an alphabet frieze, a map, a clock, four windows, pegs with coats and a basket; the north wall's middle is kept clear for `furn/blackboard`; the flagpole fades with the front, the step and the pump stay |
| `bld/house/1..4/e`, `/w` | about 105x80 | 0.3 | 3.4 (house 3: 4.2) | sprig, log, striped or board walls, curtained windows, a picture, a plate shelf, a coat peg; the log house a stone hearth and a gun; the back (or, for `w`, the front) door on the west wall where the outside's door is |
| `bld/station` | 228x160, 114,106 | 0.375 | 5.5 | three rooms: the waiting room (west), the ticket office (a partition with the ticket hatch) and the baggage room (east), posters, a clock, a map, a chart, a shelf of books and boxes; the plinth stays (`/back`) |

### New houses (sheet `d32_houses_new`): whole and parts, 8 x 8u lots

The contract names them `bld/cabin/<e|w>`, `bld/framehouse/<e|w>`, `bld/house2/<e|w>`; the second colour variant of
each is `_b`: `bld/cabin_b/<f>`, `bld/framehouse_b/<f>`, `bld/house2_b/<f>`. Each key is a whole sprite (and its
`_lit`), and `<key>/floor`, `/back`, `/front`, `/roof` (and `_lit`s). Anchor: the lot's centre at ground level (as
`bld/house/<n>/<f>`); `e`: door to +x, `w`: door to -x, seen from behind. `extra.box` covers the house, its porch and
yard within the lot.

| key | size (whole) | what |
|---|---|---|
| `bld/cabin/<f>`, `_b` | 101x84 (52,61) / 101x86 (49,61) | a log cabin 5 x 4u, walls 3u, a stone chimney outside the north end (it and the hearth inside on the north wall both stay when opened), a plank porch with a bench and a barrel, a woodpile, a chopping block with an axe, a wash line. Variant 1 brown logs and a plank roof; `_b` grey-brown logs, shingles, cream trim, a red door |
| `bld/framehouse/<f>`, `_b` | 112x87 (55,60) | a clapboard house 6 x 5u, walls 3.6u, shutters, a flower box under the window, a porch with a railing and a rocking chair, potted geraniums by the step, flowers along the south end, a wash line and a barrel behind. Variant 1 white with green trim, red flowers; `_b` sage green with cream trim, a red-brown roof, a red door, yellow flowers |
| `bld/house2/<f>`, `_b` | 118x87 (55,57) | a two-room house 7.5 x 5u, walls 3.4u, two front doors, a chimney between the rooms, a long porch with a bench and a wash tub; inside a partition with a doorway between the rooms; a woodpile, a privy and a wash line behind. Variant 1 straw board and batten, brick trim, a tin roof; `_b` brown board and batten, cream trim, shingles |

Floor 0.3u, eave = the wall height (3.0, 3.6, 3.4u).

### The camp's tents

Already in parts (`camp/tent/back`, `/front`, `/roof` and `_lit`, `camp/cooktent/...`), the near canvas fading to
show the cots. Added, as the contract asks: `camp/tent/floor`, `camp/cooktent/floor` (the floor alone, the same anchor;
`/back` still holds it too).

### The far town (sheet `d32_far`): whole sprites only

| key | size, anchor | what |
|---|---|---|
| `far/depot` | 183x125, 92,83; the footprint centre | a red board-and-batten depot 14 x 6u, track side (+z) with the operator's bay, doors and a freight door, deep eaves on brackets, the name board on the +x gable, a bench, baggage, a rain barrel |
| `far/tank` | 64x101, 32,86; the tower's foot | a stave tank with iron hoops on a braced four-post tower, a conical roof, the spout and its rope, a ladder |
| `far/grainstore` | 168x178, 73,124; the elevator's footprint centre | a grain elevator 7 x 7u with its head house, GRAIN on its front, a loading spout and a ladder, a sacking shed with a dock and sacks to +x |
| `far/hotel2` | 203x169, 85,111; the lot centre as `bld/shop_hotel/e` | the town's hotel in brick with cream trim and a green gallery, GRAND HOTEL, its boardwalk included |
| `far/sign` | 45x42, 25,32; between the posts' feet | the town's name on a board on two posts |

`far/platform`: none (the contract draws it from the platform tiles). `nat/fence_x`, `nat/fence_z`, `nat/haystack`,
`tile/field/1..2` already exist in the atlas (the D32 line artist's, `sprites_line.py`), so none were drawn again.

## Choices made (for the lead and the designer)

- **The far town's name** on `far/depot` and `far/sign` is **PROSPECT, provisional** (the designer names it; one
  constant, `far_d32.TOWN_NAME`).
- The new houses' second variants are separate keys with `_b` (the contract's keys have no variant slot).
- `/front` holds what stands towards the viewer on the house's own front: porch posts and railings in the `e` facing;
  in the `w` facing the porch is behind the house and stays with `/back`. Porch decks, steps, benches, barrels,
  woodpiles and wash lines always stay (`/back`): they are outside. Porch roofs fade with `/roof`.
- The east row's false front (on the far side) and the cabin's stone chimney (on the north end) are `/back`: they stay.
- The interior walls are thin (0.25u), drawn to the building's real wall height (the hotel's to 4.6u, its ground
  floor); the contract's eave numbers are used only for where `/front` stops and `/roof` begins.
- Stock shelves, counters, stoves, beds, the blackboard and all other furniture are left to the furniture artist
  (`furn/...`); the walls carry only what is fixed to them, kept mostly high on the wall so furniture against it
  does not hide it.
- New sheets (6): `d32_rooms_w`, `d32_rooms_e`, `d32_rooms_civic`, `d32_rooms_houses`, `d32_houses_new`, `d32_far`.
  (Joined, 2026-11-14: a seventh, `d32_houses`, now holds the new houses' whole sprites and their `_lit`, apart from
  their parts on `d32_houses_new`, for the station's frame time; see DEV_NOTES "Joined".)
  The atlas index allows 64 sheets; with them the full build has 51.
- **Size:** the six new sheets are about 205 KB of PNG; the full build's `atlas.js` grows from 3,935 KB to 4,219 KB
  (+284 KB with the index). Measured with `python3 tools/pixelart/build.py` on this branch (not embedded).

## Not done

- No parts for the freight house (not in the contract's list; its body and roof are already separate). Its drawing
  carries tags, so parts can be made the same way if asked.
- `_lit` for the far town (it is drawn baked into the line's ground).

## Files

`ptag.py` (tags), `bldparts.py` (the split, interior painting, wall fixtures), `rooms_bld.py` (each building's
interior and the new houses' interiors), `houses_d32.py` (the new houses), `far_d32.py` (the far town),
`bldparts_reg.py` (registration, called from `sprites_town.register`), `review_bldparts.py` (review sheets),
`check_bldparts.py` (the proof); `town27.py`, `station27.py` (tag calls only), `sprites_camp.py` (the tent floors),
`registry.py` (`far/` owned by sprites_town).

Review sheets (per building: all four parts, opened, floor, back, front, roof, opened at night):
`tools/pixelart/d32-bld-shops.png`, `d32-bld-civic-houses.png`, `d32-bld-newhouses.png`, `d32-bld-far.png`
(`python3 tools/pixelart/review_bldparts.py <out.png> [filter ...]`, or `far`).
