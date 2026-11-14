# D32 stage 3: the rooms' furniture and the people indoors (what the rooms artist delivered)

The art for the insides of the bigger town (plans/d32-tech.md 8.3, 10.1, 10.5), made to the Rooms builder's contract
`plans/d32-rooms-art.md` (sections 2, 3 and 4). Everything is drawn by code in `tools/pixelart/`:

| File | What |
|---|---|
| `rooms_d32.py` | every furniture piece (shape engine, game units), the table of pieces (`PIECES`) |
| `sprites_rooms.py` | registers them as `furn/...` (sheet `rooms`); owner of the prefix `furn/` (`registry.OWNERS`) |
| `people_d32.py` | the new roles, work, sit and lie for the townsfolk, the hired workers' outfits (sheet `people_d32`, registered from `sprites_people.py`) |
| `sprites_camp.py` | gained `camp/tent/floor` and `camp/cooktent/floor` (contract section 2) |
| `review_rooms.py` | the review sheets, drawn straight from the modules (no build needed): `python3 tools/pixelart/review_rooms.py [furn|people|hired|scenes|all]` writes `tools/pixelart/out/review-rooms/` |

`people.py`, `people_d27.py` and `people_navvy.py` are untouched (the D32 file adds parts and wraps two helpers), and
the existing `sheet-people.png` comes out byte for byte the same. No new colour: the darker wood (`dwood`: the bar,
the bank, the piano, the hotel desk, the stalled horse) is an alias ramp of the wood colours already in the palette.

Size: the full atlas goes from 4,029 KB to 4,183 KB (+154 KB: the furniture sheet 20 KB, the people sheet 59 KB, the
rest the index and extra). The rebuilt atlas is **not** committed: the lead runs `build.py` and `embed.py` at merge.

## The same light, scale and outline

Light from the upper left, 1 px outline in the darkest shade of the neighbouring ramp, hard alpha, no baked shadow
(as the coach's interior parts). 8 px per u across and up; a person is 2.5u (20 px). Heights that the people's
frames depend on: chair, bench and pew seat 0.62u (the seated frames' 5 px), table and desk tops 1.05u, a bed's,
cot's or bunk's mattress 0.75u, counter 1.2u, bar 1.25u, the bar stool's seat 1.0u.

## 1. Furniture: `furn/<name>/<o>` and `furn/<name>/<n>/<o>`

**Anchor**: the middle of the footprint, on the floor, rounded to the pixel grid (an eighth of a u); the code lifts it
to the floor's height. **`<o>`** as the contract says: `x` or `z` when the long side lies along world x or z; then the
front (a counter's customers' side, a shelf's open side, a bed's foot) is towards the viewer, +z for `x` and +x for
`z`, so a wall piece stands against the north wall (`x`) or the west wall (`z`). Pieces one faces (chair, desk,
pulpit, barber chair, school desk) have `se`, `sw`, `ne`, `nw`: the way the person sitting or standing at it faces.
Counter, bar, pew, bank counter and hotel desk also have `ne` and `nw`: the same piece turned to face away from the
viewer (a keeper behind it faces ne or nw). Round pieces have `x` only. `<n>`: stock levels `0` empty, `1` low,
`2` half, `3` full; the fire `1` and `2` (two frames of firelight, about 3 a second; the key without a number is the
cold stove or forge); `horse` in the stall.

**extra** (in `PIX_ATLAS.extra[key]`): `box` [x0, z0, x1, z1, h] in u from the anchor, in world axes for that key
(the drawn footprint; where it differs from the contract's stand-in size, use this); and where they apply `top` (a
surface's height: put a lamp or a good on it), `seat`, `sit_dy` (px to lift a seated frame: the bar stool 3, the
barber chair 1), `bed` (0.75), `wall` (stands against a wall), `hot`, `flat` (the rug: draw with the floor), `light`
(the lit lamp), and `use`: `[[dx, dz, act, facing], ...]`, where a person stands or sits to use it (u from the anchor;
facing a people's dir): `keeper`, `customer`, `sit`, `take`, `drink`, `play`, `work`, `cook`, `wash`, `open`, `teach`,
`preach`, `side` (beside a bed), `lie`, `horse`.

### In the contract (section 3)

| Name | Keys (after `furn/<name>/`) | Frame px (w x h) | box (first key) | Notes |
|---|---|---|---|---|
| counter | `x` `z` `ne` `nw` | 42 x 30 | 4.2 x 1.0, h 1.65 | top 1.2u; scales, candy jar, paper and twine; the keeper's side has open shelves of goods |
| shelf | `0/x` .. `3/x`, `0/z` .. `3/z` | 30 x 36 | 3.1 x 0.7, h 2.75 | 3 x 0.6u, 2.6u tall; goods stay in the same slots as the stock grows |
| sacks | `0..3` `/x` `/z` | 12 x 8 to 30 x 20 | up to 2.6 x 1.4 | 0: a folded sack and spilt flour; 1 two, 2 four, 3 eight |
| table | `x` `z` | 20 x 19 | 1.7 x 1.1, h 1.4 | 1.6 x 1.0u, top 1.05u, a jug, plates, a bowl; use: four seats facing in |
| chair | `se` `sw` `ne` `nw` | 10 x 14 to 10 x 16 | 0.6 x 0.6 | seat 0.62u; `<o>` is the sitter's facing; use [0, 0, sit] |
| bed | `x` `z` | 34 x 30 | 2.8 x 1.5, h 1.63 | **occupied**: the quilt humped over a sleeper up to the pillow; draw `ppl/<who>/lie/se/0` (bed x) or `lie/sw/0` (bed z) after it at the same anchor. 2.6 x 1.3u (the contract's 2.4 x 1.2 was too short for a 2.5u person) |
| bed_made | `x` `z` | 34 x 30 | as bed | made, empty: pillow, patchwork quilt, the sheet turned down |
| stove | `x`, `1/x`, `2/x` | 18 x 36 | 1.4 x 1.2, h 3.8 | pot-bellied, the pipe to 3.8u (cut it at the ceiling if lower); `x` cold, `1` `2` burning |
| bar | `x` `z` `ne` `nw` | 49 x 33 to 49 x 37 | 5.2 x 1.3, h 2.0 | 5u, top 1.25u; brass foot rail, spittoon, bottles, glasses, beer pump |
| barstool | `x` | 6 x 11 | 0.5 x 0.5 | seat 1.0u, sit_dy 3 |
| desk | `se` `sw` `ne` `nw` | 16 x 16 | 1.2 x 0.9, h 1.4 | a writing desk 1.1 x 0.8u, top 1.05u; `<o>` is the sitter's facing (the chair at `use`) |
| pew | `x` `z` `ne` `nw` | 38 x 30 | 4.1 x 0.8, h 1.65 | 4u, seat 0.62u, five sitters at `use`; `x` sitters face +z (sw), `ne` face -z |
| pulpit | `se` `sw` `ne` `nw` | 26 x 22 | 1.8 x 1.5, h 1.85 | on a dais 0.3u: lift the preacher 2 px at `use` |
| blackboard | `x` `z` | 26 x 26 | 3.1 x 0.2, h 2.55 | 3u, chalked lines |
| press | `x` `z` | 26 x 29 | 2.6 x 1.7, h 2.3 | the Washington hand press with its ink table |
| cell_bars | `x` `z` | 34 x 40 | 4.0 x 0.1, h 3.0 | the barred door between -0.45 and 0.45 along the bars |
| safe | `x` `z` | 14 x 18 | 1.0 x 0.8, h 1.4 | |
| barber_chair | `se` `sw` `ne` `nw` | 12 x 14 to 12 x 17 | 0.85 x 1.0, h 1.68 | the customer at use (sit_dy 1), the barber behind (use work) |
| coffin | `x` `z` | 23 x 19 | 2.3 x 0.9, h 1.25 | on two trestles (higher than the contract's 0.7) |
| forge | `x` `z`, `1/x` `1/z`, `2/x` `2/z` | 25 x 44 to 28 x 42 | 2.5 x 1.4, h 4.0 | brick hearth, chimney to 4u, the slack tub; `x` banked, `1` `2` glowing |
| anvil | `x` `z` | 13 x 14 | 1.0 x 0.7, h 1.16 | on its stump, the horn along the axis, a hammer on it |
| stall | `x` `z`, `horse/x` `horse/z` | 59 x 42 to 59 x 47 | 4.8 x 2.7, h 2.5 | **2.6 wide x 4.8 deep** (a horse is 4.7u long: the contract's 3.0 x 2.6 cannot hold one); the depth runs along `<o>`, the manger at the -x or -z end (a back wall) |
| piano | `x` `z` | 21 x 22 | 1.8 x 1.6, h 1.62 | upright, the stool in front (in the box) |
| rug | `x` `z` | 32 x 16 | 2.6 x 1.6 | flat, 0.03u: draw it with the floor |
| wash_stand | `x` `z` | 12 x 22 | 1.06 x 0.55, h 2.15 | basin, jug, towel, the mirror on the wall above (wider than the contract's 0.7) |
| lamp_table, lamp_table_lit | `x` | 6 x 11 | 0.55 x 0.55, h 1.55 | a small round table, the oil lamp on it (top 0.76) |
| bench | `x` `z` | 28 x 18 | 3.0 x 0.45 | seat 0.62u, two sitters |

### More, for fuller rooms (not in the contract; use them as you like)

| Name | Keys | Notes |
|---|---|---|
| crates | `0..3` `/x` `/z` | the floor stack of crates at the four stock levels (0: an opened empty crate and straw) |
| table_cloth | `x` `z` | the table with a checked red cloth (the hotel's dining room) |
| card_table | `x` | round, baize, cards, chips, a glass; four seats facing in |
| cot, cot_sleeper | `x` `z` | a narrow iron bed 2.6 x 0.9u (a child, the maid, a hotel room), made / with a sleeper: the lie frames fit it |
| bunk | `x` `z` | the jail bunk on chains against the wall, 2.6u: the lie frames fit it (head at the -x or -z end) |
| cupboard | `x` `z` | the kitchen dresser, glass doors, plates and cups |
| range | `x` `z`, `1/..`, `2/..` | the cook stove: lids, oven, kettle and pot, the pipe to 3.8u; cold, and two frames burning |
| barrel | `x` | a cracker barrel, its lid half off (top 1.15) |
| trunk | `x` `z` | a steamer trunk for the foot of a bed |
| lamp, lamp_lit | `x` | the oil lamp alone: stand it on any `top` |
| clock | `x` `z` | a regulator clock on the wall (1.7 to 2.8u up) |
| pegs | `x` `z` | coat pegs on the wall with a coat, a hat, a lantern |
| desk_office, desk_roll | `se` `sw` `ne` `nw` | a big two-pedestal desk, a roll-top desk (the bank, the hotel office) |
| school_desk | `se` `sw` `ne` `nw` | a pupil's desk with its bench joined on (seat 0.52u, top 0.92u) |
| backbar | `x` `z` | behind the bar: mirror, bottles, the cash register |
| bank_counter | `x` `z` `ne` `nw` | marble top, the brass grille and the teller's window |
| hotel_desk | `x` `z` `ne` `nw` | the register, a bell, flowers |
| key_rack | `x` `z` | the key board and pigeonholes behind the hotel desk |
| type_case | `x` `z` | the compositor's type cases |
| bellows | `x` `z` | the great bellows on its frame beside the forge |

## 2. Tents (contract section 2)

`camp/tent/floor`, `camp/cooktent/floor`: the floor alone (straw on earth), same anchor and `extra.box` as `/back`.

## 3. People (contract section 4, plan 10.1)

All 20 px (a child 14), four drawn facings, never mirrored, as every person. Keys `ppl/<who>/<anim>/<dir>/<f>`.

| Anim | Frames | Facings | Anchor | What |
|---|---|---|---|---|
| `work` | 2 | se sw ne nw | between the feet | the person's trade (below), about 3 frames a second |
| `sit` | 1 | se sw ne nw | the floor below the hips (seat top 5 px up), as every seated frame | on a chair at a table or desk, the forearms on the table; a child is drawn 1 px higher (the school desk's lower seat and top) |
| `lie` | 1 | se, sw | the bed's centre on the floor | the head on the pillow, the hair, the sheet over the shoulders, a hand: draw it after `furn/bed/<o>` (or `cot_sleeper`, `bunk`) at the same anchor; `se` for a bed along x (head to -x), `sw` along z |

**The new roles** `ppl/clerk`, `cook`, `maid`, `stableboy`, `wife_a`, `wife_b`, `farmer`, `girl`, `boy`: `idle` 2,
`walk` 4, `talk` 2, `benchSit` 1 (as the D27 townsfolk), and `work` 2, `sit` 1, `lie` 1.
- clerk: middle-parted hair, spectacles, a slate vest, a string tie (store, bank). Work: papers on the counter.
- cook: the tall white cap, a white jacket, a red neckerchief, a long apron. Work: stirring the pot.
- maid: a white mob cap, a dark dress, a white bib apron. Work: sweeping.
- stableboy: a straw slouch hat, a red shirt and braces. Work: forking hay.
- wife_a: hair in a bun, a red calico house dress, a half apron. Work: stirring the pot.
- wife_b: a slate sunbonnet, a sage house dress, an apron. Work: kneading or scrubbing.
- farmer: a wide straw hat, a beard, bib overalls over a red shirt. Work: forking hay.
- girl: a hair ribbon, a navy dress and a white pinafore (the child build). Work: sweeping.
- boy: a flat cap, a shirt and braces (the child build). Work: splitting kindling with a hatchet.

**The townsfolk already drawn** gain `work` 2 and `lie` 1, and `sit` 1: the twelve keepers (storekeeper, hotelkeeper,
banker, smith, vaquero, storekeeper.b, barkeep, printer, barber, sheriff, undertaker), the preacher, the teacher, the
launderer, cowhand, cowhand.b; and the stand-ins man_bowler (the assayer), woman_shawl, child, each with `.b`, gain
`work` and `lie` only: they are travellers and already have `sit` (the coach's, hands in the lap: it fits a chair).
Their work: storekeeper and storekeeper.b wrap a parcel; banker counts coins; hotelkeeper and sheriff write in the book;
man_bowler weighs a sample; barkeep polishes a glass; undertaker planes a board; smith hammers at the anvil; vaquero
and the cowhands fork hay; printer pulls the press's bar; barber cuts hair; preacher in the pulpit, a hand raised;
teacher at the blackboard with the pointer; launderer and woman_shawl knead or scrub; the pupils (child) sweep.

**The hired station workers** in their own clothes (the agent's build and cap, so a frame's hands and grips are where
the agent's are; their `extra` hands and grip are the agent's numbers): `ppl/hired_punch` (a slate-grey uniform and
cap), `ppl/hired_load` (a red flannel shirt and braces, brown duck trousers, a dark cap), `ppl/hired_deliver` (a brown
sack coat over an ochre vest, a beard, a dark cap). Every animation the agent has, in every facing, with the same
frames and extra: idle, walk, punch, carry, push, throw, wave, lantern, lift, shoulder/idle, shoulder/walk, roll,
drag, truck, heave, stackHigh, door, climb, handOver, pull. The plan's loader `put` is the agent's `lift` played
backwards (as the agent's own).

## 4. Review sheets (`tools/pixelart/out/review-rooms/`)

- `rooms-furniture.png`: every furniture key on a plank floor, a man beside it for scale, red dot the anchor, yellow
  dots the use spots.
- `rooms-people-new.png`, `rooms-people-old.png`: per person idle, walk, talk and benchSit (new roles), work in four
  facings, sit at a table in four facings, lie in a bed both ways.
- `rooms-hired.png`: the agent and the three hired workers, every animation, four facings.
- `rooms-scenes.png`: six mock rooms at 3x (store, home at night, saloon, smithy and livery, school and church, bank,
  jail and hotel) with people working, sitting and asleep: placed by hand, sorted by x + z only.

## 5. Not done, and choices to know

- Not drawn: `ui/closed_card`, `ui/purse`, `ui/face/0..2` (plan 10.5; not in this job's list), the far town's
  sprites (contract section 5: not this job), the buildings' parts (the other artist).
- The sizes that differ from the contract's stand-ins (each key's `extra.box` is the truth): bed 2.6 x 1.3 (lie
  frames need the length), stall 2.6 x 4.8 (a horse), coffin on trestles (1.25 high), wash stand 1.06 wide, counter
  4.2 with its overhang, the stove's and forge's pipes to 3.8 and 4.0u.
- The contract's `x`/`z` cannot say which way a counter faces; `x` and `z` face the viewer, `ne` and `nw` face away
  (counter, bar, pew, bank counter, hotel desk). A shelf, blackboard, piano and the other wall pieces have `x` and `z`
  only: they stand against the two back walls.
- `work` is drawn in all four facings (the plan said two), so a keeper behind a counter facing away (ne, nw) has his
  frames too.
- The bed sprite `furn/bed/<o>` is the occupied one (the quilt over a sleeper), as the contract's wording has it;
  `bed_made` the empty one. The lie frames hold only what shows above the quilt (head, sheet, a hand), so one lie
  frame fits every quilt colour and the bed, the iron cot and the bunk.
- The townsfolk `sit` is at a table (forearms forward). On a pew, a bench or a bar stool the contract's `benchSit`
  (hands in the lap) is the better frame.
