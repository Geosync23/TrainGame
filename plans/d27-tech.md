# D27: the working day made visual (technical plan)

Spec: design-doc.md section 0, D27 (the new direction), with D25 and D26 as they stand. The model is
plans/proto-tech.md (D25); the sprite contract plans/proto-sprites.md stays in force except where section 7 below
changes it (people stay 20 px = 2.5u tall). Choices marked **(provisional)** are for the designer, listed again in
section 9. Base: commit `ad31f08` plus the two helpers' work that will be merged before building starts: **the mid-day
stall fix** (train, switch and hint logic in "railroad trains (D24)" and the U block) and **the camera that follows the
player with walking 1.5 times faster** (R's section; the walk 3.0u per game minute, the hand tools 2.7). This plan
builds on both and does not redo them.

Nothing here changes the projection (`PIX_PROJ`: +x 8 px right and 4 px down, +z 8 px left and 4 px down, +y 8 px up),
the one fixed view, whole-step zoom, the seeded randomness or the one-file rule. The older worlds (`?world=hub`,
`start`, `yard`) are untouched and every one of their checks must keep passing.

## 1. Scale

### 1.1 The anchor

**A person is 1.75 m = 2.5u, so 1 m = 1.43u (`PROTO.M = 2.5 / 1.75`).** Heights, widths, doorways, seats, goods, the
carts and the track gauge follow it exactly, so a person fits a doorway, sits in a seat and lifts a crate at real
proportions. **Lengths of rolling stock are compressed** to about three quarters of an 1866 car (provisional): true
lengths (a 45 ft coach is 19.6u, a 4-4-0 with its tender 22u) would make a 3-coach train 80u long and a platform that
holds it two and a half screens wide at the default zoom; at three quarters a coach still holds seven rows of seats,
which is what the designer asked for ("bigger trains so seating fits"). Distances in the world (track spacing,
platform depth, the street's width) are real or slightly compressed, given below.

People are unchanged (20 px adult, 14 px child, `PIX.PERSON_H` 2.5u). Everything else grows by about 2 to 2.5 times
against D25 (a D25 coach was 5.6 x 2.0 x 2.8u; it is now 13 x 4.2 x 5.6u).

### 1.2 Rolling stock (`PROTO_STOCK`, foundation; T owns afterwards)

| Vehicle | Length (u, over couplers) | Width | Height (u, top) | Floor | Notes |
|---|---|---|---|---|---|
| Engine and tender (one vehicle, as now) | 18.0 (engine 11.0, tender 7.0) | 4.0 (cab) | 6.4 (stack top); cab roof 5.5; boiler centre 3.4 | cab 1.6 | a 4-4-0 "American"; drivers 2.1u across (1.5 m) |
| Coach | 13.0 (body 11.6, an open end platform 0.7 at each end) | 4.2 | 5.6 (clerestory top); eaves 4.9 | 1.6 | end doors 1.0 x 2.9u; 7 rows, 28 seats; aisle 1.0u |
| Boxcar | 10.0 | 4.0 | 5.3 | 1.6 | one sliding door each side, centred, opening 2.6 x 3.0u |
| Flatcar | 10.0 | 4.0 | 1.9 (deck) | 1.6 | stakes 1.2u high for lumber, the plough, wheels |

A 3-coach passenger train is 57u (D25: 26.1u); a 4-car freight train 58u. The coach's inside (11.2u long, 3.8u wide):
a stove zone 0.9u at one end, a water cooler and closet 0.9u at the other, 7 rows at 1.34u pitch (0.94 m); each row
two double benches (1.4u each, 0.98 m) either side of a 1.0u aisle (0.7 m: a person 0.65u across walks it); seat top
0.64u above the floor, seat back 1.3u. A seated adult is about 15 px from seat to crown. Luggage racks above the
windows on both walls at 3.0u above the floor; two oil lamps hung from the clerestory; windows 0.9 x 1.1u at each row.

### 1.3 Track and platforms

| Thing | Number (u) | Real |
|---|---|---|
| Gauge | 2.05 (rails at +-1.03) | 1.435 m |
| Ties | 3.7 long, every 0.85 | 2.6 m |
| Ballast | 4.6 wide | |
| Track spacing, track 1 to track 2 | 6.0 | 4.2 m (13 to 14 ft) |
| Track 2 to track 3 | 18.6 (the cargo platform between) | |
| Platform edge from its track's centre | 2.3 | 1.6 m |
| Crossover legs | radius 20, 26 degrees (track 1), 30 degrees (track 3) | |
| **Platform 1** (passengers), new and longer | x -30 to 30, z -17.3 to -8.3: 60 x 9u, deck top 0.375u (3 px, as now) | 42 x 6.3 m, low as in 1866 |
| **Cargo platform** (the island, was platform 2), wider and raised | x -26 to 26, z 2.3 to 16.3: 52 x 14u, top **1.6u (13 px), car-floor height** **(provisional)** | 36 x 9.8 m, 1.1 m high |
| Cargo ramps | x 26 to 34 and -34 to -26, z 10.9 to 13.9: 8u long, 3u wide (1 in 5) | |
| Covered storage (the freight house, open on its track 3 side) | x -8 to 8, z 3.3 to 9.3 on the cargo platform; roof underside 4.2u over the deck, ridge 6.0 | 11 x 4.2 m |
| Storage area (chalked cells, goods stacked in the open) | two blocks: x -24 to -10 and 10 to 24, z 5.3 to 10.9: each 10 x 4 cells of 1.4u (80 cells, stacks 2 to 4 high by kind) | |
| Cart lane | z 10.9 to 13.9 along the whole cargo platform, joining both ramps | |
| Loading edge | z 13.9 to 16.3 beside track 3: the cart parks here at a boxcar's door | |
| Footbridges (2) | decks at x -14 and 14 from z -10.3 (platform 1's landing) to 5.0 (the cargo platform's), 1.4u wide, top 7.6u, underside 7.2u (clears the 6.4u stack); flights of 28 steps along x, 10u long, running outward to x -24.5 and 24.5 | between the coach ends of every standing train |
| The cart crossing (plank road over tracks 2 and 1) | x 37, pads 3.5u wide, z 3 to -9 | |

### 1.4 The station, the cart path, the street and the lots

| Thing | Number (u) |
|---|---|
| Station building | x -9 to 9, z -26.3 to -17.3 (18 x 9u), eaves 5.5, ridge 8.0 (a storey and a half: the agent lives upstairs); front door 1.4 x 3.1u on the platform side |
| Platform canopy | x -15 to 15, z -17.3 to -11.3, underside 4.2u, posts along z -11.6 |
| Schedule board | (14, -16.9), on platform 1's back edge, face 3.2u wide |
| Lever frames (2) | west (-33, -11) for W1 and W3, east (33, -11) for E1 and E3; a low plank stage 3 x 2u; levers 1.2u apart, 1.6u tall |
| Benches on platform 1 | 6, along the back edge (z -16.6), 2.4u long, seat 0.64u |
| The cart path to town | packed dirt with ruts, 3.5u wide: east ramp foot (34, 12.4) > (37, 6) > the crossing (37, 3 to -9) > (37, -20) > (14, -31) > the depot square behind the station (z -27 to -31) > the main street. About 112u from the storage area to the street |
| Main street | carriageway x -7 to 7 (14u, 10 m), boardwalks x -9.5 to -7 and 7 to 9.5 (2.5u, 0.3u high), z -28 (behind the station) to -118 (90u), a small square at its far end before the church |
| Street lots | 12u along the street x 12u deep, 2u alleys between (pitch 14u); west row x -21.5 to -9.5, east row x 9.5 to 21.5; lot centres at z -38, -52, -66, -80, -94, -108 |
| Buildings | one storey: walls 5.0u, false front to 7.5u; the hotel two storeys: walls 8.6u, front 10u; the livery barn 16u deep, ridge 9u; the church 10 x 16u, steeple 16u |
| Doorways | shop 1.3 x 3.0u (0.9 x 2.1 m); double doors 2.4u; saloon batwings 1.6u; livery 4.0 x 4.3u; freight house sliding doors 3.4 x 3.4u; boxcar 2.6 x 3.0u; coach end doors 1.0 x 2.9u |
| Back lanes and houses | lanes x -29 to -25 and 25 to 29 behind the rows; houses on 8 x 8u lots at x -35 and 35, z -40, -60, -80, -100 |
| The map | x -95 to 95, z -140 to 45 (190 x 185u); walk grid 380 x 370 cells of 0.5u (140,600 cells; D25: 36,736) |

### 1.5 The carts and the goods' scale

| Tool | Size (u) | Holds |
|---|---|---|
| Hand truck (two-wheel) | 1.0 x 0.8, 1.9 tall, nose plate 0.6 | one "truck" good, or 2 crates stacked |
| Platform cart (four-wheel station cart; replaces the D25 handcart) | bed 3.4 x 1.6, bed top 0.85, handle 1.0 | a bed of 4 x 2 cells of 0.8u, up to 2 layers (section 4) |

Goods are at the anchor scale: a crate 0.85 x 0.65 x 0.55u, a barrel 0.85 across and 1.3 tall, a crated piano 2.1 x
1.0 x 1.9u (the full list is in section 4).

### 1.6 What the projection and the default zoom make of it

A box l (along x) by w (along z) by h is `8 (l + w)` native pixels wide and `4 (l + w) + 8 h` tall on screen. So:

| Thing | Native px (w x h) | At the default zoom (scale 3 on a 390 x 844 phone at 2x) |
|---|---|---|
| Person | about 12 x 22 | 18 x 33 CSS px |
| Coach | 138 x 114 | 207 x 171 CSS px: **just over half the screen's width** |
| Engine and tender | 176 x 139 | 264 x 209 CSS px |
| Boxcar | 112 x 98 | |
| Platform 1 (60u along x) | 480 wide | about 2.5 screens |
| A one-storey shop (12 x 12 x 7.5u) | 192 x 156 | three quarters of the screen's width |
| The station area, lever frame to lever frame | about 560 wide | a bit over 2 screens |
| The whole map | 3,048 x 1,588 (the ground layer) | |

The default view (scale 3 portrait: about 260 x 280 native px; scale 4 landscape: about 420 x 195) shows about 32u
of a train along the track, one coach and a half, or two or three buildings along the street. **(provisional)** Keep
scale 3 as the default (people stay readable at 33 CSS px); the alternative is scale 2 (390 native px across, people
22 CSS px), which shows the whole platform at once. Pinch still steps 1 to 8; at scale 1 most of the station fits.

**The camera that follows the player** (the helper's work, merged first) copes with the bigger map as follows (R):
- It clamps to the map's bounds (`PIX_PROJ`, worked out from `PROTO.BOUNDS` as now).
- A dead zone in the middle third of the screen, and a look-ahead of about 6u in the direction of walking (10u while
  pushing the cart), so the player sees where he is going.
- Inside a coach or a boxcar it frames the vehicle: the camera's target is the vehicle's centre plus a third of the
  player's offset from it, so the whole interior stays on screen while he walks the aisle.
- A drag pans away from the player; the next walk command glides back.
- U's peek (a tap on the Next job line) glides to the target for `PDUI.PEEK_S` and back; the edge arrow
  (`#guideEdge`) points at a target off screen, as now.
- No mini-map this round (provisional); pinch out to scale 1 is the overview.

## 2. Layout

### 2.1 The drawing (top view; x to the right is east, z down is south; not to scale, the tables rule)

```
 z
-140  .  grass  .  rocks   [school]   [ CHURCH ]          .  junipers, rocks  .   dry wash  .
-118  .   corral   |back|  W row         square          E row  |back|  houses     |wash|
-108  . houses     |lane| [FEED+SEED]       ||  M  ||   [ASSAY ]  |lane|            |    |
 -94  .            |    | [LIVERY]===     ||  A  ||   [UNDERTAKER]                  |    |
 -80  .            |    | [SMITHY ]       ||  I  ||   [SHERIFF  ]                   |    |
 -66  .            |    | [BANK   ]       ||  N  ||   [BARBER   ]                   |    |
 -52  .            |    | [HOTEL  ]       ||     ||   [NEWSPAPER]                   |    |
 -38  .            |    | [STORE  ]       || ST  ||   [SALOON   ]       cart path  /     .
 -31  .                         depot square (z -27..-31)  <-------------------------'  (14,-31)
 -26  .   water tower        [====== STATION ======]                     /  (37,-20)
 -17  .           LW(-33,-11) [====== PLATFORM 1 (x -30..30) ======] LE(33,-11)  |
  -6  ===W1(-62.5)\__________[======= TRACK 1, straight x -41..41 ===========]__/E1(62.5)====
   0  W3(-72.9)===W1=========#==fb(-14)==========TRACK 2==========fb(14)==#==|37|==E1===E3(72.9)== off the map
   2       \                 [ ramp ][ CARGO PLATFORM x -26..26, top 1.6u ][ ramp ]   /
   9        \                  storage W  [ covered storage ]  storage E          /
  13         \                 ============= cart lane =============== > ramp (26..34)
  18.6        \______________[======= TRACK 3, straight x -30..30 ========]_____/
  30  ~ ~ ~ cottonwoods, willows ~ ~ ~ CREEK (z 30..38) ~ ~ ~ tall grass ~ ~ ~ ~ ~ ~ ~ ~ ~
  45  edge of the map
```

(`fb`: footbridge decks; `|37|`: the cart crossing; LW, LE: lever frames. On screen the main line runs from the upper
left to the lower right; the street runs up and to the right, away from the station; the creek is nearest the viewer.)

### 2.2 Track and switches (`PROTO`, `buildProtoWorld`; foundation, then T)

| Track | z | Straight between | Use |
|---|---|---|---|
| track 1 | -6.0 | x -41 to 41 | passenger trains, beside platform 1 |
| track 2 | 0 | the whole line, x -165 to 165 (70u past each map edge, as now) | through trains |
| track 3 | 18.6 | x -30 to 30 | freight trains, beside the cargo platform |

| Switch (id) | x on track 2 | Turns off to | Lever |
|---|---|---|---|
| W3 (0) | -72.9 | track 3 (south) | west frame (-33, -11), lever 2 |
| W1 (1) | -62.5 | track 1 (north) | west frame, lever 1 |
| E1 (2) | 62.5 | track 1 (north) | east frame (33, -11), lever 1 |
| E3 (3) | 72.9 | track 3 (south) | east frame, lever 2 |

W1 sits 10.4u inside W3 so W3's diverging rails are 2.7u clear of track 2 there. **Levers near the platforms
(provisional, the designer's play showed far levers make trains late):** each end's two levers stand side by side in a
lever frame just off platform 1's end, rodded to their points 30 to 40u away (the rodding is drawn on the ground, a
line of rods on stools). Each `T.switches[id].stand` is set to its lever's post and use spot, so `useSwitch`,
`throwSwitch`, `rrSwitchNeeds`, U's Throw button and the helper arrow work unchanged. From the middle of platform 1 a
frame is about 33u away (11 game minutes at 3.0u per minute); D25's far levers W3 and E3 were 20 to 25 minutes.

Where trains stand (`PROTO.STOP`, engine front): track 1 east-bound x 31, west-bound -31 (a 57u train stands x -26 to
31 or -31 to 26, inside platform 1, 6u short of the cart crossing); track 3 east-bound 29, west-bound -29 (inside the
straight). The footbridge flights (x 14.5 to 24.5 and -24.5 to -14.5 beside the platform edge) fall between the coach
ends of every standing train (ends at -26, -13, 0, 13, 26). T checks that no coach end and no boxcar door stands
beside a flight.

**Train speeds scale with the world (T, provisional):** in the prototype the line speeds (`LIM_ST`, the main line's
limit) double, so a train still needs about 30 game minutes from appearing to standing and the line-clear rule keeps
its D25 spacing.

### 2.3 Platforms, bridges, crossing, the station (foundation)

As in the tables of section 1.3 and 1.4. Walking heights: the walk grid gets a height per cell, `walkDeckY(T, x, z)`
(the cargo platform 1.6u, its ramps sloping, the boardwalks 0.3u, the footbridges by `walkBridgeY` as now), so the
sim and the renderer agree where a walker's feet are. Walls and edges: the cargo platform's long faces and the ends
outside the ramps are walls on the walk grid (no climbing down onto track 2 or 3); the player crosses tracks only on
the footbridges (on foot) and at the cart crossing (on foot or with a cart, `XING_FIXED.proto`). The hand truck and the
cart may not use the footbridges (`carryNoCartRects`).

### 2.4 The main street: buildings and what they take and send (foundation fills `TOWN27`; W owns it afterwards)

Four more buildings on the west side and five on the east (six a side in all), plus the church and a school closing
the street. **(provisional placing and types)**

| Side, lot z | Building | Takes in by rail | Sends out (picked up in the evening) | Keeper (agent) |
|---|---|---|---|---|
| West, -38 | General Store (existing, redrawn) | crates of dry goods and tins, flour sacks, a crated stove | | Amos Pratt (storekeeper) |
| West, -52 | Hotel (two storeys) (new) | furniture, crates of linen, kegs | | Nell O'Hara (new: hotelkeeper) |
| West, -66 | Bank (brick) (new) | the express box (a strongbox) | the express box | Henry Whitcomb (new: banker) |
| West, -80 | Blacksmith (existing, redrawn) | bar iron, wagon wheels, kegs of nails | mended wheels | Jake Turner (smith) |
| West, -94 | Livery stable (new, barn and corral behind) | bales of hay | bundles of hides | Luis Ortega (new: vaquero) |
| West, -108 | Feed and seed (new) | the plough (Mondays), seed sacks | grain sacks | (store's palette b) |
| East, -38 | Saloon (existing, redrawn) | whiskey barrels, beer kegs, the crated piano (once, day 3) | empty kegs | Silas Reed (barkeep) |
| East, -52 | Newspaper office (new) | bundles of newsprint | mail sacks | Ezra Cole (new: printer) |
| East, -66 | Barber and bath house (new) | small crates | | Pablo Rivera (new: barber) |
| East, -80 | Sheriff's office and jail (new) | | | Tom Dade (new: sheriff) |
| East, -94 | Undertaker and cabinet maker (new) | lumber | furniture (made here) | Abel Grimes (new: undertaker) |
| East, -108 | Assay office (new) | | ore samples (sacks) | Karl Vogel (man_bowler) |
| North end (0, -128), facing south | Church (existing sprite, redrawn bigger) | | | Rev. Elias Booth (new: preacher) |
| (-20, -128) | School (new) | paper | | Clara Lind (new: teacher), 2 children |

Nine new buildings and the school; the three D25 shops and the church redrawn at the new scale. **The east row's
fronts face west, away from the fixed view** (as the saloon's does now): their names read from **hanging signs** on
brackets over the boardwalk and **painted side walls** (the south wall, which faces the viewer, is visible across each
alley); their backs, which the view does show, get character: back porches, woodpiles, privies, rain barrels,
washing lines. Where an east-row building hides the player, a door spot in use or a delivery, it turns see-through
(R's existing rule, extended to door spots). The delivery-heavy shops are on the west row.

### 2.5 Nature pushing in (A3 draws, foundation places, W may move)

- **The creek** south of track 3 (z 30 to 38, meandering east to west, 4 to 6u wide), with cottonwoods and willows
  along it, cattails, sand bars; the map's southern edge is beyond it.
- **A dry wash** east of the town (x 45 to 55, from z -140 down to -35, then off the east edge), gravel and sand,
  with a plank footbridge where the east back lane crosses it.
- **Tall grass** in a band about 8u deep along every map edge, in the alleys, the vacant ends of the back lanes and
  round the lever frames; **sagebrush and rabbitbrush** scattered on the open ground between the station and the
  town; **prickly pear** and **boulders** on the east side; **junipers** and **rock outcrops** in the north-east
  corner; a few **cottonwoods** behind the lots and one big one on the depot square.
- **Period props:** telegraph poles along track 2's north side every 20u, the water tower by the west lever frame
  (-48, -14), a woodpile by the station, hitching rails and water troughs along the boardwalks, a parked freight
  wagon, horses at the hitching rails (2-frame tail flick).
- Small things (grass tufts, flowers, pebbles, ruts) are baked into the ground layer; only things taller than about
  1u (trees, brush, boulders, props) are sorted sprites (section 10).

## 3. Punching tickets on board (P)

### 3.1 How it goes

- **Before a train:** from `PB.COME_S` (60 minutes) before a passenger run's arrival, 4 to 10 travellers (provisional)
  walk in from the hotel or the street and **wait on platform 1**: on the benches (sitting, facing the track) and
  standing about under the canopy. No lines at the doors.
- **The train stands:** each coach already holds **through riders** (2 to 6, seated, their tickets punched elsewhere: a
  small punched ticket in the hatband, drawn as a 2-pixel mark) and **riders for the Hub** (1 to 3 per coach). The
  riders for the Hub stand up, walk the aisle to the nearer end door, step down the end steps and walk off to town.
  Then the waiting travellers walk to the nearest coach end with free seats, **climb the end steps, walk the aisle and
  sit down** (the seat nearest the door that is free, window seats first, alternating sides: deterministic).
- **Punching:** the player steps up onto a coach's end platform (`{ t: 'pbEnter', tr, stock, end }`, from the end
  steps on platform 1's side), walks the aisle (`{ t: 'pbWalk', s }`: a position along the aisle, or a tap on a
  seat), and punches a seated traveller (`{ t: 'pbPunch', tr, stock, seat }`: he walks along the aisle to that row,
  turns to face across the aisle, punches; the traveller holds the ticket out: `PB.PUNCH_S` 30 game seconds,
  provisional). He can walk from coach to coach over the end platforms without stepping down
  (`{ t: 'pbWalk', stock, s }` into the next coach). `{ t: 'pbLeave' }`, or any tap outside the train, takes him to the
  nearest end door and down the steps.
- **The player in a coach:** `S.player.in = { tr, stock, s }` (s: u along the aisle from the coach's centre, signed
  towards the train's front), with `S.player.x, z` kept at the world point for everything that reads them; the walk
  grid is not used inside. P handles it through the foundation's hook in the player's tick (`pbPlayerTick`).
- **Departure (provisional; the simplest fair rule):** a passenger train is ready (`pbReady`) when every rider for the
  Hub has stepped off, every traveller who came for it is seated, **every ticket aboard is punched**, and the player
  is off the train. T's wave-off refuses until then (`rrWaveOff` asks `pxReady`, which the foundation sends to
  `pbReady` once `D27.board` is on). Trains wait for the player and show late, as D25 (6). Alternative kept in the
  code: unpunched travellers ride free (`pbMissed`, counted in the summary) and the train may go.
- **Through runs** carry nobody for the Hub. Nobody arrives late for a train (travellers are planned to arrive before
  it).

### 3.2 What is drawn (R draws, P supplies the list, A1 and A2 make the sprites)

- **The cut-away:** the coach the player is in, or whose end platform he stands on, is drawn **cut away**: no roof, the
  near (south, +z) side wall cut down to a sill 0.5u above the floor, the east end wall gone (the heading's front or
  back, whichever faces +x); the far wall stays with its windows, racks and lamps. The other coaches stay whole.
  `pbCutaway(S)` gives the stock ids to cut away (also a boxcar the player is in: section 4). While the player stands
  beside a coach on the platform (behind it in the view), the existing see-through dither applies, as now.
- **Inside:** the floor (planks and a runner down the aisle), the far wall (windows with sky, curtains, a luggage rack
  with bags and hat boxes), two hanging oil lamps (lit at night), the stove at one end (a 2-frame glow), the water
  cooler at the other, the benches row by row (each bench its own sprite, so a seated person sorts between the bench
  in front and the one behind), and the seated people.
- **Seating and facings:** the benches face along the coach (walk-over seats, facing the way of travel): sitters face
  `se` or `nw`. At the stove end two short side benches face across the aisle: sitters face `ne` or `sw`. So the four
  facings all occur. The player punching faces across the aisle (`ne` or `sw`).
- **The poses** (per people type): `sit` (2 frames, breathing), `sitTicket` (2: holding the ticket up), `sitDown`
  and `standUp` (2 each), `climb` (2: the end steps). The agent: `punch` (exists) also in the aisle, `climb` (2).
- `pbDrawList(S)`: `[{ id, who, x, y, z, f ('se'|'ne'|'sw'|'nw'), act ('wait'|'benchSit'|'walk'|'climb'|'sitDown'|
  'sit'|'sitTicket'|'standUp'), frame?, stock, seat, punched (bool), through (bool) }]` (y: the floor's height, 1.6u
  inside a coach); `pbPlayerPose(S)`: `{ x, y, z, f, act ('walk'|'idle'|'punch'|'climb'), stock }` or null when he is
  not on a train; `pbCoachView(S, stock)`: `{ seats: [{ row, side, pos, x, z, f, who? }], stove, cooler }` for R.

### 3.3 The D25 line at the door: switched off, kept

`WORLDS.proto.parked.doorline = true` once P switches `D27.board` on: `ppTick`, `ppLineSpots`, `ppPunchCmd` and their
events stay in the file and in the section "prototype passengers (D25)" unchanged, but the prototype calls the `pb*`
code instead (the redirect is one line in `pxReady`, `pxOnArrive`, `pxOnDepart`, `paxTick` and the `punch` command).
`?doorline=1` un-parks it for `check-punch.js`, which keeps running against it (it adapts only its door positions to
the new coaches' end doors); if that costs more than an hour, the check is parked too and DEV_NOTES says so.

### 3.4 Data and events

`S.pb` (optional; `pbSt` fills in what a save lacks): `{ cars: { [stock]: [paxId | -1 per seat] }, plan, seen, due,
job (the punch in hand: { tr, stock, seat, on, acc }), tot: { punched, missed, off, seated } }`. Travellers stay in
`S.pax.list` with P's states (`'come' | 'wait' | 'bench' | 'toCoach' | 'climb' | 'aisle' | 'sitting' | 'standing' |
'off' | 'left'`) and fields `stock, seat, punched, through`. Events: `pbSeated { run, id }`, `pbPunched { run, tr,
stock, id }`, `pbOff { run, id }`, `pbEnter { tr, stock }`, `pbLeave`, `pbRefused { why }`, `pbMissed { run, n }`;
`pdCount(S, 'punched' | 'missed')` as now.

## 4. Freight, animation-heavy (F)

### 4.1 The goods (16 kinds; `GOODS27`, foundation table, F owns afterwards)

| Kind | What (variants by print or label) | Size (u) | Cart cells x layers | Handled by | Stacks in storage |
|---|---|---|---|---|---|
| `crate` | dry goods, tins, linen, soap | 0.85 x 0.65 x 0.55 | 1 | carry (in the arms) | 4 high |
| `sack` | flour, seed, grain (out), ore samples (out) | 1.3 x 0.65 x 0.35 | 1 | shoulder | 5 flat |
| `barrel` | whiskey, nails | 0.85 across, 1.3 tall | 1 standing (2 lying) | **roll**: tipped on its side and rolled, stood up again to store | 2 (one on another) |
| `keg` | beer, nails; empties (out) | 0.6 across, 0.75 tall | 1 | carry (on the hip) | 3 |
| `bale` | hay | 1.4 x 0.85 x 0.85 | 2 | hand truck, or dragged with a hay hook | 2 |
| `hides` | bundle of hides (out) | 1.4 x 0.8 x 0.45 | 2 | drag | 3 |
| `mailSack` | mail (both ways) | 0.6 across, 1.2 tall | 1 | shoulder | heap of 3 |
| `paper` | newsprint bundle | 0.9 x 0.6 x 0.5 | 1 | carry | 4 |
| `lumber` | bundle of planks, 3 m | 4.3 x 0.6 x 0.4 | 4 (lengthwise; overhangs the bed) | drag by one end | 3 |
| `ironBars` | bar iron, wagon tyres | 3.4 x 0.4 x 0.3 | 4 | drag | 3 |
| `wheel` | wagon wheel (in: new; out: mended) | 1.7 across | 2 (lying flat) | **roll** upright | 4 flat |
| `plough` | walking plough (Mondays) | 2.9 x 0.85 x 1.3 | 4 | heave (tipped and slid) | 1 |
| `stove` | crated cook stove | 1.15 x 1.0 x 1.15 | 2 | hand truck | 1 |
| `furniture` | chest of drawers, chairs (crated) | 1.4 x 0.7 x 1.6 | 2 | hand truck | 1 |
| `piano` | crated upright piano (the saloon, day 3) | 2.1 x 1.0 x 1.9 | 8 (the whole bed) | heave (slow) | 1 |
| `strongbox` | the express box (the bank, both ways) | 0.7 x 0.45 x 0.4 | 1 | carry (heavy: walks slower) | 2 |

Handling verbs (the agent's animations, section 7): **carry** (crouch, lift into the arms, walk), **shoulder** (swing
up onto the shoulder, walk), **roll** (tip onto its side, roll it with the hands while stooping; a wheel is rolled
upright), **drag** (lift one end, walk backwards dragging), **truck** (slide the hand truck's nose under, tilt back,
wheel it), **heave** (tip, push, slide in steps: heavy goods only, onto a cart or the dock floor). Every pick-up has a
matching put-down (the same frames backwards; lifting onto the second or third layer of a stack uses `stackHigh`).

### 4.2 Every step shown (the handling job)

The sim holds one **handling job** at a time in `S.fr.job = { k, item, from, to, t0, dur, verb }`; each step lasts a
fixed number of game seconds and R draws its frames from the job's progress (`frPose(S)`), so animation and sim never
disagree and replay is exact. Steps for one good, unloading (loading is the same backwards):

1. **The door.** `{ t: 'frDoor', stock }`: the player walks to the door spot on the loading edge and pulls; the door
   slides open over `FR.DOOR_S` (40 s; 4 frames). `S.fr.doors[stock] = { o: 0..1, mv }`. The crew shuts every door
   when the train leaves.
2. **Into the car.** The car floor is level with the cargo platform (both 1.6u): he walks in through the door; the
   boxcar is drawn **cut away** like a coach (roof and near wall), showing its goods stacked inside on a floor grid.
3. **Pick up** `{ t: 'frTake', item }`: walk to it, the verb's pick-up (carry 30 s, shoulder 36 s, roll: tip 20 s,
   drag 12 s, truck 24 s, heave 60 s, provisional).
4. **Out to the cart**, walking (or rolling, dragging, wheeling) to the cart parked on the loading edge at the door.
5. **Onto the cart** `{ t: 'frPut', to: { kind: 'CART', cell, layer } }` (or the first free cell when no cell is
   given): the put-down; the good sits in its cart cell. Heavy goods on the hand truck go straight to storage.
6. **The cart to storage** `{ t: 'frCart', act: 'grab' | 'park', x, z }`: he takes the handle and pushes (the agent's
   `push` frames, the cart's 4 facings, wheels turning, 2 frames), along the cart lane to the storage area.
7. **Stack it** `{ t: 'frPut', to: { kind: 'CELL', block, c, r } }`: take each good off the cart and set it down in a
   storage cell, on top of what is there (layer by kind; a full cell refuses: `frRefused`). Stacks are drawn good by
   good, so the storage area visibly fills.

**Loading** a car: goods for the railroad (tag OUT) from storage onto the cart (or the hand truck), to the open door,
into the car (its floor grid fills from the far end). `frReady(S, run)` (provisional, as D25): nothing for the town
aboard and the run's load aboard (or every OUT good there is, if fewer). The wave-off asks it (through `cgReady`).

### 4.3 The evening: to town and back

- When the day's last train has gone (`pdEvening`), the Next job line says to load the cart with the town's goods.
  The player loads the cart from storage (as step 7 backwards), pushes it down the east ramp, over the cart crossing,
  along the cart path and up the main street.
- **Deliver** `{ t: 'frDeliver', shop }` at a shop's door spot (on the boardwalk in front of its door): he lifts each
  good for that shop off the cart (the verb's pick-up), carries it to the door and hands it in: if the keeper is in
  (W: `tfAt(S, shop)`), the keeper steps out to the door and takes it (2 frames, `talk`); else it is set inside the
  door. The good is consumed (`itemConsume(S, id, 'business', ev)`). A good for another shop stays on the cart
  (`frRefused`).
- **Pick up** `{ t: 'frPickup', shop }`: each evening at 17:00 (provisional) a shop that sends goods puts them out on
  its boardwalk at its pickup spot (`SHOPS27[i].pickup`), as visible stacks; the player loads them onto the cart and
  takes them back to the cargo platform's storage (the east block's OUT rows). Next day's freight trains load them.
  Goods not collected stay on the boardwalk; a shop puts out nothing new while its spot still holds goods.
- The cart overnight stays where it was left; the next morning's Next job line asks for it back on the cargo platform
  only when a freight train needs it.

### 4.4 The day's goods (provisional, `SHOP_GOODS27`; the same every week, by day of week)

| Run | Brings for the town (6 or 4) | Takes away (OUT) |
|---|---|---|
| f1 (morning) | store 2 crates + 1 flour sack; saloon 1 whiskey barrel + 1 beer keg; smithy 1 ironBars | |
| f2 (midday) | hotel 1 furniture; newspaper 2 paper; livery 1 bale | 4: grain sacks 2, hides 1, empty keg 1 |
| f3 (evening) | bank 1 strongbox; undertaker 1 lumber; feed 1 seed sack; store 1 crate | 2: mail sack 1, ore sack 1 |
| Weekly specials | Monday: plough (feed, f1, a flatcar); Wednesday: crated piano (saloon, f2); Friday: 2 wheels (smithy, f1) | Tuesday: furniture (undertaker); Thursday: mended wheel (smithy); every day the express box returns (bank, f3) |

Pickups each evening make exactly next day's OUT loads (6 a day), so the day balances; day 0 starts with those 6 in
storage (as D25's `PG.OUT_DAWN`).

### 4.5 Where goods can be, and conservation

The item store (`S.items`, section "cargo") gets new place kinds from the foundation: `CAR { stockId, cell, layer }`
(the car's floor grid, 0.8u cells), `CELL { block ('W' | 'E'), c, r, layer }` (storage), `CART { tool, cell, layer }`,
`TRUCK { tool }`, `HAND` (the player; one good, or a pair of crates), `SHOP { shop, slot }` (a pickup waiting), and
`GROUND { x, z }` (set down anywhere else, as now). **Every good is in exactly one place at every tick**; goods are
created only by the run's table when its train is made up (`frLoad`) or by a shop's pickup at 17:00, and consumed
only when handed in at a shop (`'business'`) or when it leaves in a car (`'soldOutside'`). `itemAudit(S)` (foundation)
checks: alive = created - consumed, one place each, no two goods in one cell and layer, layers stacked without gaps,
and, per kind, the day's created and consumed match the tables. The checks call it every game hour.

**Determinism:** no random numbers in freight (the tables fix what comes and goes); every step is timed in game
seconds; cells are chosen by fixed rules (first free in a fixed order) when the command does not name one.

### 4.6 Data, events and figures

`S.fr` (optional; `frSt`): `{ doors, job, made: [run ids loaded], picks: { day, put: [shop ids] }, tot: { unloaded,
loaded, stored, delivered, picked } }`. The two carts stay in the tool store (`S.tools`; the platform cart replaces the
D25 handcart's kind, `TOOL_KINDS.cart27`, keeping tool id 1). Events: `frDoor { stock, open }`, `frTaken { id }`,
`frPut { id, to }`, `frUnloaded { run, id }`, `frLoaded { run, id }`, `frStored { id }`, `frDelivered { shop, id }`,
`frPicked { shop, id }`, `frRefused { why }`. Figures: `pdCount(S, 'unloaded' | 'loaded' | 'delivered' | 'picked')`.
For R: `frDrawList(S)` `[{ id, kind, variant, tag, x, y, z, rot ('x' | 'z' | 'side' | 'up'), frame, place }]` (a rolling
barrel has `rot: 'side'` and a frame), `frPose(S)` (the agent's handling pose: `{ verb, phase ('pick' | 'hold' | 'put' |
'push'), prog, f }`), `frCartPose(S)` and `frTruckPose(S)` (`{ x, y, z, f, held, tilt }`), `frDoorOpen(S, stock)`.
For U: `frCarStatus(S, stock)` `{ unload, load, doorOpen, spot }`, `frStorage(S)` (by shop and OUT), `frToDeliver(S)`
(by shop), `frPickups(S)` (by shop), `frJobHint(S)` (the next handling step for the Next job line).

## 5. The town's people (W)

### 5.1 The agents

14 named townsfolk to start (provisional; the keepers in section 2.4's table plus two cowhands who ride in for the
evening and the teacher's two pupils). Each has a **home** (a house lot or a room in the hotel or over the shop), a
**work** place (or none), and a **routine** (`TF_ROUTINES[kind]`): a list of errands `{ place, from, to, p }` with
time windows, for example the storekeeper: home > store 07:00 to 12:00 > hotel (dinner) 12:00 to 12:45 > store to
18:00 > saloon or home > home by 21:00. Errand kinds: home, work, shop (store, barber, feed), saloon, hotel, church
(Sunday 10:00 to 11:30: everyone who can), school (weekdays 08:00 to 15:00), **the station to meet a train** (one or
two agents for a passenger run: the hotelkeeper meets p1 and p3 for guests, the sheriff looks over p2's arrivals, the
newspaper man meets f3 for the mail; they wait on platform 1 from 10 minutes before the run's real arrival until 5
minutes after it stands, then walk back), and an evening stroll.

**Each day's plan is worked out at 05:00** (`tfPlanDay(S, day)`) from the routines and a random number stream seeded
by the game's seed, the day and the agent (`rngFor(seed, 'tf', day, i)`), jittering each time by up to 10 minutes and
picking among optional errands. Only "meet the train" depends on the play (the train's real arrival); everything else
is a pure function of the day. `S.tf = { day, ag: [{ e (errand index), t0, seg, s, wait }] }` is small; a save
without it re-plans and fast-forwards (cheap: no path-finding at run time).

### 5.2 Walking: a town graph, not the walk grid

Townsfolk walk a **town graph** (`TOWN_GRAPH`, W, made at load from `TOWN27`): about 60 nodes (each door, the
boardwalk ends and alley mouths, street crossings, the back lanes, the depot square, the station door, three waiting
spots on platform 1 and the benches) and the edges between them. Shortest paths between all nodes are worked out once
at load (60 x 60, Floyd: a few milliseconds). An agent walks a path's segments at 2.4u per minute (a stroll; the
player is faster); position = the segment's start plus its progress. **Cost per tick:** one addition per walking agent
and a time check per errand; under 0.05 ms for 16 agents.

**Sharing with the player:** townsfolk do not block the player or the cart and do not reserve walk cells; the player's
path-finding ignores them. They keep to boardwalks, the street's edges and the depot square, and never stop on the cart
crossing, the ramps or a footbridge. If the player stands within 0.7u ahead on their segment they pause (up to 6 game
seconds, then walk through): deterministic, since the player's position is in the state. Inside a building they are
not drawn (`in: bld`); `tfAt(S, bld)` tells F whether a keeper is in to take a delivery.

### 5.3 Drawing and the interface

`tfDrawList(S)`: `[{ id, who, x, y, z, f, act ('walk' | 'idle' | 'talk' | 'benchSit'), frame? }]`, only those outside.
R draws them like travellers (culled to the view). Existing townsfolk sprites: `cowhand`, `smith`, `storekeeper`,
`barkeep` (idle 2, walk 4, four facings); the travellers' types can stand in for some (`man_bowler` for the assayer,
`woman_shawl` for a wife, `child` for the pupils). New types in section 7. Events (sparse, for U's toasts if wanted):
`tfMeet { run, id }`. Hooks: `__railhead.tf` (`plan`, `at`, `path`).

## 6. Tutorials (U)

### 6.1 Six short lessons

Each lesson is 2 to 4 steps. A step shows **one sentence on a lesson card** (the pdCard style, with a small pixel
picture of the thing: a lever, a boxcar door, a seated traveller with a ticket, the cart), **the pixel arrow** on its
place, and **the Next job line** says the same in a few words. A step is done when its event happens. The first card
of a lesson **holds the clock** (like the morning board) until the player taps "Show me"; later steps do not hold it.
"Skip" closes a lesson; Settings gains "Lessons: replay" to see them again.

| Lesson | Triggers (the first time) | Steps (done when) |
|---|---|---|
| **Switches** | day 0, `pdDay` (the first train needs W1) | 1. "Trains stop at a switch set against them. The levers are at the end of the platform." (arrow on the west lever frame; the player reaches it) 2. "Pull lever W1 to set the way into track 1." (`switchThrown` W1) 3. "Its disc turns: set for track 1. When the train has passed, set it back for the next one." (the train passes W1) |
| **Punching on board** | the first passenger train stands with travellers seated | 1. "Travellers have boarded and sat down. Step up into the coach at its end." (`pbEnter`) 2. "Walk the aisle and tap a traveller to punch the ticket." (`pbPunched`) 3. "Punch everyone. The train can leave once every ticket is punched; then Send off at the engine." (`rrWavedOff`) |
| **Unloading** | the first freight train stands with goods for the town | 1. "Slide the boxcar's door open." (`frDoor` open) 2. "Bring the cart to the door." (cart parked beside it) 3. "Lift the goods onto the cart." (`frPut` to the cart) 4. "Push the cart to the storage area and stack each good in its shop's row." (`frStored`) |
| **Loading** | the first freight train that takes goods away stands and is unloaded | 1. "The goods for the railroad wait in the OUT rows. Load them on the cart." 2. "Wheel them to an open door and put each in the car." (`frLoaded`) |
| **Delivery** | the first evening (`pdEvening`) | 1. "Load the cart with the town's goods from storage." 2. "Down the ramp, over the crossing and up the path to town." (the cart reaches the street) 3. "Stop at a shop's door and tap Deliver." (`frDelivered`) |
| **Pickup** | the first evening a shop has goods out, after Delivery's step 3 | 1. "Some shops send goods out by rail: they wait on the boardwalk." (arrow on the nearest pickup) 2. "Load them and bring them back to the OUT rows for tomorrow's trains." (`frStored` of an OUT good) |

### 6.2 How it fits the D25 screens

- **State:** `S.pd.les = { [id]: step | -1 }` (optional; missing means not started), set by `pdLessonTick(S, ev)` from
  this tick's events (called from `pdTick`, like `pdGuideStep`). Lessons are in the save (pure sim, deterministic), so
  the bot and the checks see the same steps.
- `PD_LESSONS` (U): `[{ id, trigger(S, e), steps: [{ text, short (Next job line), target(S) => { x, z, k, label },
  done(S, e) }] }]`.
- **The Next job line** (`pdJob`): while a lesson step is open, it is the line (it comes before every other job,
  except a train waiting at a switch set against it). **The arrow** (`pdHintTarget`) points at the step's target.
- **The D25 first-day guide** (`PD_GUIDE`, `pdGuideStep`) is replaced by the lessons in the prototype; its code stays
  (parked behind `D27.lessons`).
- **The buttons over the world** gain: Open door / Close door (at a boxcar door), Lift / Put (the good or cell in
  reach), Take cart / Leave cart, Step in (at a coach end) / Step off, Punch (n) (beside a seated traveller with an
  unpunched ticket), Deliver (at a shop door with its goods on the cart), Pick up (at a pickup), Throw (at a lever).
  Thumb-sized (48 px) as now, only where needed, at most three at once (nearest first).
- **The board and the summary** gain the new figures: goods stored, picked up, travellers seated and punched.

## 7. Art list

Sizes in native pixels (w x h, about), at the anchor scale; "4 dirs" means `se`, `ne`, `sw`, `nw`, all drawn (people
are never mirrored). Owners: **A1** people, **A2** vehicles, interiors, goods and carts, **A3** town buildings,
nature, props and ground tiles. Every key is added to plans/proto-sprites.md by its artist (section 4 of that file),
and the pipeline's layout export (`tools/pixelart/proto-layout.json`) carries the new layout from the foundation.

### 7.1 People (A1)

| Keys | Frames | Size |
|---|---|---|
| Agent: `ppl/agent/lift/<dir>/<f>` (crouch-lift, also put-down backwards) | 4 dirs x 3 | 16 x 24 |
| `ppl/agent/shoulder/{idle,walk}/<dir>/<f>` (a sack or mail sack on the shoulder) | 4 x (2 + 4) | 16 x 24 |
| `ppl/agent/roll/<dir>/<f>` (stooping, rolling a barrel or wheel) | 4 x 4 | 18 x 22 |
| `ppl/agent/drag/<dir>/<f>` (walking backwards, one end lifted) | 4 x 4 | 18 x 24 |
| `ppl/agent/truck/<dir>/<f>` (hand truck tilted back; the truck drawn separately) | 4 x 4 | 16 x 24 |
| `ppl/agent/heave/<dir>/<f>` (tip and shove) | 4 x 4 | 18 x 24 |
| `ppl/agent/stackHigh/<dir>/<f>` (lifting onto layer 2 to 4) | 4 x 3 | 16 x 26 |
| `ppl/agent/door/<dir>/<f>` (pulling a sliding door) | 4 x 3 | 18 x 24 |
| `ppl/agent/climb/<dir>/<f>` (coach end steps) | 4 x 2 | 14 x 24 |
| `ppl/agent/handOver/<dir>/<f>` (giving a good at a door) | 4 x 2 | 16 x 24 |
| Travellers (8 types x 2 palettes): `sit`, `sitTicket`, `sitDown`, `standUp`, `climb`, `benchSit` | 16 x 4 dirs x (2+2+2+2+2+1) = 704 | 14 x 18 (seated), 14 x 22 |
| Punched-ticket mark `ppl/mark/punched` (hatband or lapel), per facing | 4 | 2 x 3 |
| New townsfolk: `banker`, `hotelkeeper`, `vaquero`, `printer`, `barber`, `sheriff`, `undertaker`, `preacher`, `teacher`, `launderer` (idle 2, walk 4, talk 2) | 10 x 4 x 8 = 320 | 14 x 22 |
| Existing townsfolk (`cowhand`, `smith`, `storekeeper`, `barkeep`): add `talk` 2 and `benchSit` 1 | 4 x 4 x 3 = 48 | |

About 1,180 new frames, all small. The people of the 1860s railroad country (design-doc section 2, "People and
representation") without caricature: the vaquero, the barber and the launderer are ordinary townspeople at work.

### 7.2 Vehicles, interiors, goods and carts (A2)

| Keys | Frames | Size |
|---|---|---|
| `veh/loco/<hdg>/<f>`, `veh/loco_freight/<hdg>/<f>` (redrawn at 18 x 4 x 6.4u) | 2 x 10 headings x 2 | 180 x 145 |
| `veh/coach/<hdg>` (13 x 4.2 x 5.6u, end platforms with steps and railings, windows; `veh/coach_lit/<hdg>` at night) | 20 | 140 x 116 |
| Coach cut-away, `e` and `w` only (trains stand straight): `veh/coach_in/<e|w>/floor` (floor, far wall, racks, lamps), `/sill` (the near wall's stub), `/end` | 6 | 140 x 116 |
| Inside parts: `veh/seat/<facing>` (a double bench, 4 facings), `veh/sidebench/<facing>`, `veh/stove/<f>` (2), `veh/cooler`, `veh/lamp/<f>` (2), `veh/rack_bag/<n>` (3) | 15 | 12 to 20 |
| `veh/boxcar/<hdg>` (10 x 4 x 5.3u) and its door: `veh/boxcar_door/<e|w>/<f>` (4 frames: shut to open) | 10 + 8 | 114 x 100 |
| Boxcar cut-away `veh/boxcar_in/<e|w>/{floor,sill}` | 4 | 114 x 100 |
| `veh/flatcar/<hdg>` (stakes) | 10 | 114 x 72 |
| `fx/smoke/<f>` (bigger) | 4 | 24 x 24 |
| Platform cart `cart27/<dir>` (empty bed; goods drawn on it by cell), wheel frames `cart27/<dir>/<f>` | 4 x 2 | 44 x 34 |
| Hand truck `truck/<dir>/<upright|tilt>` | 4 x 2 | 16 x 24 |
| Goods: `goods/<kind>` resting (long kinds also `goods/<kind>/z`), 16 kinds | 20 | 10 to 40 wide |
| Goods variants (prints and labels): sack flour, seed, grain, ore; keg beer, empty; crate dry goods, tins, linen | 9 | |
| Goods held: `goods/<kind>/held` (in the arms or on the shoulder; per facing where it shows) | 16 x 2 | 8 to 14 |
| Rolling: `goods/barrel/roll/<f>`, `goods/wheel/roll/<f>`; `goods/barrel/side` (lying) | 4 + 4 + 2 | 14 to 18 |
| On the hand truck (tilted): barrel, bale, stove, furniture, piano | 5 | 14 to 26 |
| Tags: `tag/<shop>` for the 12 shops, `tag/out`, `tag/any` (5 x 5) and the row boards in storage `tag/board/<shop>` | 14 + 13 | 5 x 5, 10 x 8 |

About 230 frames, but the biggest: the vehicles are three to four times the D25 area.

### 7.3 Town buildings, nature, props and ground (A3)

| Keys | Frames | Size |
|---|---|---|
| Station (18 x 9u, a storey and a half), split as now (`body`, `canopy`) | 3 | 216 x 172 |
| Covered storage on the cargo platform (`bld/freighthouse` body and roof, the roof fading as the canopy does) | 2 | 176 x 120 |
| Cargo platform faces and ramps (tiles: `dock/face_s`, `dock/face_e`, `dock/top`, `dock/ramp_e`, `dock/ramp_w`, chalked cell marks) | 8 | 16 x 24 |
| Footbridges (taller: deck, rails, trestles, the four flights) | 13 | as now x 1.4 |
| Lever frames `bld/leverframe` and `sw/lever/<N|R>` (2 levers each) | 3 | 30 x 24 |
| Shops redrawn at 12 x 12u: store, smithy, saloon; new: hotel, bank, livery (+ corral fence), feed, newspaper, barber (pole: 2 frames), sheriff, undertaker, assay, school; each split `body`, `walk` (boardwalk), `awning` or `sign`, in the facing for its row (`e` for the west row, `w` for the east row) | 13 x 3 | 192 x 156 (hotel 192 x 176, livery 224 x 184) |
| Church redrawn (10 x 16u, steeple 16u) | 2 | 208 x 232 |
| Hanging signs (east row) and painted side walls (a part of each body) | 6 | 24 x 12 |
| Houses (8 x 8u): 4 designs | 4 | 128 x 100 |
| Trees: cottonwood (3), willow (2), juniper (2), dead tree (1) | 8 | 40 to 70 x 60 to 96 |
| Brush and rocks: sagebrush (4), rabbitbrush (2), prickly pear (2), boulders (4), outcrops (2), cattails (2) | 16 | 10 to 60 |
| Tall grass clumps (6; 2-frame sway optional), flowers (3), tumbleweed (rolling, 4) | 13 | 8 to 16 |
| Props: telegraph pole, water tower (bigger), woodpile, hitching rails, troughs, horses (2 frames), a parked wagon, rain barrel, washing line, privy, porch, benches (platform and street), lamps (lit) | about 20 | |
| **Ground tiles** (iso diamonds, 16 x 8 px per 1u cell, composed in the browser: section 10): grass (4), dry grass (2), dirt (3), street with ruts (3), cart path (2), ballast (2), sand (2), gravel (2), creek water (2 frames) and its banks (8), boardwalk planks (2), deck planks (2), crossing planks (1) | about 37 | 16 x 8 to 32 x 16 |

About 170 frames, many of them large.

### 7.4 The atlas budget

Today: 346 KB of base64 (of 500): the people 43 KB, the vehicles 44 KB, the buildings about 42 KB, the goods and
carts 3 KB, **the baked ground image 140 KB** (1,600 x 864 px), the frames index about 65 KB. Estimates for D27:

| Part | KB |
|---|---|
| People (old and new) | 90 |
| Vehicles and interiors | 165 |
| Town buildings, station, platforms, bridges | 140 |
| Goods, carts, tags | 20 |
| Nature and props | 40 |
| Ground tiles (the baked ground image retired: section 10) | 15 |
| Frames index (about 3,000 keys) | 110, or about 60 in a compact format (`v: 2`: keys grouped by prefix, numbers in flat arrays) |
| **Total** | **about 580 (530 with the compact index)** |

**The budget must grow: to 700 KB (provisional), with a target of 600.** A baked ground image for the new map (3,048 x
1,588 px) would alone be 400 to 450 KB, so the ground is composed in the browser from tiles instead (R). The page
grows from 1.6 MB to about 1.9 MB.

## 8. The work split

### 8.1 Order

1. **Foundation (one builder, alone, first).** The new scale and layout, the stock, the track, the save schema and
   the stubs, so that everyone else can build and test on their own. Its acceptance: `npm test` passes, the D25
   flows (the line at the door, the bays, the handcart) still play a day on the new layout (the bot with looser
   lateness limits), and the art pipeline has the new `proto-layout.json`.
2. **Eight at once** from the foundation's commit, each on its own branch and worktree: **T, P, F, W, U, R, A1, A2.**
   **A3** starts when T finishes (T's work is the smallest), so never more than eight run together.
3. **Merges** (the lead or an integrator, in this order): T, R (others' things become visible), F, P, W, U, then the
   artists' atlas (any time: it is one generated block). After each merge `npm test` passes.
4. **The integrator** switches on every `D27` flag, rewrites the bot and writes the two-day acceptance check (8.4).

### 8.2 The foundation's commit (what everyone builds on)

**Built 2026-11-11: see 8.2a below for what changed against this list.**


- **Scale and layout:** `PROTO` rewritten with the numbers of sections 1 and 2 (`PROTO.M`, `P1`, `CARGO` (with
  `P2` kept as an alias), `LEVERS`, `STOP`, `XING_CART`, `CART_PATH`, `STORE` (the cell blocks), `DOCK_Y` 1.6,
  `DECK_Y` 0.375, `BOUNDS`); `buildProtoWorld` (radius 20 legs, the lever stands); `PROTO_FB`, `PROTO_BRIDGES` for the
  new bridges; `XING_FIXED.proto` (the cart crossing); `walkDeckY` and the walk grid's heights and walls; `PIX_PROJ`
  follows `PROTO.BOUNDS` by itself.
- **Stock:** `PROTO_STOCK` with section 1.2's sizes and the interior specs (`coach.rows`, `coach.seatPitch`,
  `coach.ends`, `boxcar.door`); the schedule re-timed for the new distances (section 8.5) as a first cut (T refines).
- **Tables:** `GOODS27`, `SHOPS27` (id, building, name, sign, tag, door spot, pickup spot, storage row),
  `SHOP_GOODS27`, `TOWN27` (lots, buildings, houses, nature placements) with `BLD_LAYOUTS.proto` built from it, plain
  boxes in the 3D debug view for every new building kind; `CARGO_TAGS` for the 12 shops; `TOOL_KINDS.cart27`.
- **Flags:** `WORLDS.proto.d27 = { board: false, handling: false, town: false, lessons: false }` (read with
  `d27On(T, what)`); each builder switches on their own when it works; `parked.doorline` follows `board`.
- **Stores and the save:** `S.pb`, `S.fr`, `S.tf` (new, optional), `S.pd.les`, `S.player.in` (optional); schema 19;
  `migrate` 18 > 19 (8.6); `checkSaveShape` calls `pbCheckSaveShape`, `frCheckSaveShape`, `tfCheckSaveShape`
  (stubs returning true); a new fixture `tests/fixtures/save-v19.json`; older fixtures record their v19 load hashes.
- **Items:** the new place kinds (4.5) in `itemsAt`, `itemMove`, the save check; `itemAudit(S)`.
- **Stubs** with the agreed names and safe defaults (empty lists, `true` for ready, `null` for poses), **wired**:
  the tick (`pbTick` after `paxTick`, `frTick` after `cgTick`, `tfTick` after `townTick`, `pdLessonTick` inside
  `pdTick`); the command switch (`pbEnter`, `pbWalk`, `pbPunch`, `pbLeave`, `frDoor`, `frTake`, `frPut`, `frCart`,
  `frDeliver`, `frPickup`); the player's tick (one hook, `playerModeTick(S, ev)`, calling `pbPlayerTick` and
  `frPlayerTick` first, so neither P nor F edits the section "player"); the redirects (`pxReady` > `pbReady`,
  `cgReady` > `frReady` when the flags are on); the debug scenarios (`rh.scenario('d27coach' | 'd27freight' |
  'd27evening' | 'd27town')` calling `pbDebugScenario`, `frDebugScenario`, `tfDebugScenario`); the test hooks
  (`__railhead.pb`, `.fr`, `.tf`, `.les` pointing at objects each builder fills in its own section); `run-all.js`
  lines for every new check, with a placeholder file each that passes.
- **Checks:** `tests/check-d27world.js` (new): the layout's numbers, clearances (trains between platforms, bridges
  over the tallest stack, the crossing clear of standing trains, the ramps clear of track 3's legs, no lot overlaps),
  walking distances against limits (from the middle of platform 1 to each lever frame at most 36u; the schedule board
  to the east frame at most 24u; platform 1 to the cargo platform by a footbridge at most 40u; storage to the street by
  the cart path at most 120u; reachability of every door, pickup, lever, cell and car door), trains fit their
  straights, the migration of `save-v18.json`. Updates of `check-protoworld.js`, `check-prototrains.js`,
  `check-protogoods.js`, `check-punch.js`, `check-pixrender.js`, `check-protoui.js`, `check-proto-day.js` and
  `tests/proto-bot.js` to the new numbers only.
- `node tools/pixelart/export-layout.js` re-run; the ground drawn procedurally (R's existing code) until R's chunked
  ground lands; the old baked `ground` frame no longer used in the prototype.
- DEV_NOTES "Prototype (D25)" gets a short "D27 foundation" part; design-doc's D27 row points at this plan.

### 8.2a The foundation as built (2026-11-11): follow the code where it differs

The foundation is built (DEV_NOTES "D27 (the working day made visual)" lists everything). Where it differs from the text
above, **the code rules**; the differences and the interfaces added:
- **The day:** f2 leaves at **16:10** (8.5 said 15:50): after p4 leaves west the player needs about 30 minutes from the
  west lever frame to f2's engine on the cargo platform. T re-times the day anyway.
- **Walking surfaces:** the walk grid has **levels** (`PROTO_LEVELS`: the two footbridges, then the cargo platform with
  its ramps as flights; `PROTO_DOCK_LEVEL`); `walkLevelAt(T, x, z)` gives the level; `walkBridgeAt` now means the
  footbridges only (the wave-off's "come down from the footbridge"); `walkDeckY(T, x, z)` is the one height for the sim
  and the renderer (levels, platform 1, the boardwalks: `PROTO_DECKS`). The creek is shut on the walk grid.
- **Lever frames:** `PROTO_LEVERS[name] = { frame, n, x, z, ux, uz }`; each switch's `stand` is its lever's post and
  use spot. There is no `extra.levers` in A3's atlas, so the levers are placed by `PROTO.LEVERS.PITCH`.
- **The platform cart:** `TOOL_KINDS.cart27` (carrier `CART27`, 16 slots) is already tool 1 in the prototype; until F
  turns handling on, the D25 flow uses it as its handcart (one evening trip). `toolIsCart(k)`, `cargoCartCarrier(c)`.
- **Item places:** `HAND` and `TRUCK` carry a `slot` (0, 1: a pair of crates), `SHOP` a `slot`; layers: up to 5 in a
  storage cell, 2 on the cart, 3 in a car (`CARGO27`). `cargo27Key(w)` is a place's identity; `storeCellAt(block, c,
  r)`, `storeCellOf(x, z)`. The D27 commodities are on `COMMODITIES` but not enumerable (the economy and older saves do
  not see them).
- **Migration 18 > 19:** the goods are re-stowed by `protoStow`: into the freight house's 4 bays while handling is off
  (the D25 flow), into F's cells (`frStowPlace`) once it is on. F: a v19 save made before handling was on can hold goods
  in the bays: move them (`frNewDay` is the place) or keep reading bays.
- **Lessons:** the ids are fixed (`PD_LESSON_IDS`: switches, board, unload, load, delivery, pickup); `S.pd.les[id]` is
  a step number or -1 (done or skipped).
- **Hooks:** `playerModeTick(S, ev, poseCache)` returns true when `pbPlayerTick` or `frPlayerTick` handled the
  player's tick (each returns a boolean); `rngFor(seed, ...keys)` (section "random numbers"); `protoDebugEvening(S)`;
  `__railhead.d27` holds the foundation's tables and helpers.
- **The D25 flows on the D27 layout:** the line at the door boards at the coaches' ends (`PP.END`; a door beside a
  footbridge is left out); a car's door spot for the carrying commands is on the deck (`PROTO.EDGE + 0.35` from the
  track); U's Send off walks to T's `rrWaveSpot` (clear of the flights); in the pixel view a tap on something's own
  pixels wins over a lever's thumb margin (`pickAt`); travellers come from the street near the station
  (`PROTO.TOWN_EXITS` at z -44).
- **The atlas:** `build.py` no longer bakes the ground (`--ground` keeps the D25 one); the budget is 700 KB (575 now).
- **The renderer's quick D27 drawing** is the foundation's stand-in (DEV_NOTES lists what is left for R).

### 8.3 The builders

| Builder | Owns in index.html | Provides (interface) | Calls | Can stub meanwhile | Checks |
|---|---|---|---|---|---|
| **T** trains, switches, schedule | "railroad trains (D24)" (the prototype parts: `RR_WORLDS.proto`, `PROTO_SCHEDULE`, `PROTO_STOCK`, `protoStopPos`, speeds, the wave-off's refusals); "starting world layout" (layout fixes after the foundation, then re-export) | runs at the new sizes and times; `rrSwitchNeeds` with lever names (`{ ..., lever: 'W1', frame: 'W' }`); `protoCarEnds(S, run)` `[{ stock, ends: [{ x, z, steps: { x, z } }] }]` and `protoCarDoors(S, run)` `[{ stock, x, z, spot }]` (for P and F); `rh.scenario('proto')` | `pbReady`, `frReady` (through `pxReady`, `cgReady`) | P's and F's ready as true | `check-prototrains.js` (updated), `check-levers.js` (new: both frames throw all four switches; a train waits at a switch set against it; the schedule runs a day with a scripted player using only lever frames, worst lateness under 15 minutes) |
| **P** boarding and punching on board | "prototype passengers (D25)" (parked line code kept as is) and a new section "tickets on board (D27)" after it | `pbTick`, `pbOnArrive`, `pbOnDepart`, `pbReady`, `pbCmd`, `pbPlayerTick`, `pbDrawList`, `pbPlayerPose`, `pbCutaway`, `pbCoachView`, `pbCarStatus(S, stock)` `{ seated, punched, toPunch, boarding, off, ends }`, `pbRunStatus`, `pbCheckSaveShape`, `pbDebugScenario` | `protoCarEnds` (T; meanwhile its own from `protoStopPos` and the stock), `S.pax`, `pdCount` | R's drawing (checks read the sim) | `check-onboard.js` (new): waiting, riders off, boarding, seating (deterministic seats), entering, walking coach to coach, punching every seat, the train refused until all punched and the player off, the same hash twice, a save mid-boarding reloads |
| **F** freight handling, storage, the carts, delivery and pickup | "prototype goods (D25)" and a new section "freight handling (D27)"; narrow edits in "cargo" (only the new place kinds' rules, after the foundation) and `TOOL_PARKS.proto` | `frTick`, `frCmd`, `frPlayerTick`, `frNewDay`, `frConsist`, `frLoad`, `frReady`, `frOnDepart`, `frDrawList`, `frPose`, `frCartPose`, `frTruckPose`, `frDoorOpen`, `frCarStatus`, `frStorage`, `frToDeliver`, `frPickups`, `frJobHint`, `frCheckSaveShape`, `frDebugScenario` | `protoCarDoors` (T), `tfAt` (W; meanwhile: the keeper is always in), `SHOPS27`, `itemAudit` | the keeper's step-out | `check-handling.js` (new: every verb's steps and timings, the door, the cart, stacking layers, loading, ready, conservation every hour), `check-delivery.js` (new: the evening route over the crossing, each shop takes only its own, pickups at 17:00, back to the OUT rows, next day's loads) |
| **W** the town's people | a new section "the town (D27)" (after "town"): `TOWN27` placements after the foundation, `TOWN_GRAPH`, `TF_AGENTS`, `TF_ROUTINES` | `tfPlanDay`, `tfTick`, `tfDrawList`, `tfAt(S, bld)`, `townPath(a, b)`, `tfCheckSaveShape`, `tfDebugScenario` | run times (`S.rr.runs`) for meeting trains | | `check-townsfolk.js` (new: the same plan and positions twice and after a reload; everyone at church Sunday 10:30, at work at 10:00 on a weekday; meeters on platform 1 when their train stands; no agent on track, a ramp or the crossing ever; under 0.05 ms per tick for 16 agents) |
| **U** lessons and screens | "prototype day (D25)"; in "HUD and panels" the block "Prototype (D25)" and a new block "Lessons (D27)"; the CSS and HTML of the prototype | `PD_LESSONS`, `pdLessonTick`, the lesson card, `pdJob` and `pdHintTarget` with the new jobs, the new buttons (6.2), the summary's figures | `pbCarStatus`, `frCarStatus`, `frStorage`, `frToDeliver`, `frPickups`, `frJobHint`, `rrSwitchNeeds`, R's `pixToScreen` | fakes of P's and F's status (as `check-protoui` does today) | `check-lessons.js` (new: each lesson triggers once at its moment, steps advance on their events, the clock held on the first card only, Skip and replay, saved), `check-protoui.js` (updated) |
| **R** the renderer | "pixel renderer (D25)"; the branches in "input"; `render()`'s first lines | the chunked ground (section 10), height-aware drawing (`walkDeckY`), the cut-away coach and boxcar, seated people sorted with benches, goods in every handling state, carts, townsfolk, the east row's see-through, culling and the faster sort, the camera's bigger-map behaviour (1.6) on top of the helper's follow | `pbDrawList`, `pbPlayerPose`, `pbCutaway`, `pbCoachView`, `frDrawList`, `frPose`, `frCartPose`, `frTruckPose`, `frDoorOpen`, `tfDrawList`, `pdHintTarget`, `pdBoardRows` | placeholder boxes for any missing key (as now); fake lists from `rh.scenario` | `check-pixrender.js` (updated), `check-interiors.js` (new: painter's order inside a coach and a boxcar, the cut-away only on the player's car, a tap on a seated traveller picks him), `check-pixperf.js` (new: the frame-time budget of section 10 at the busiest scenes, portrait and landscape, with 4 times CPU throttling) |
| **A1** people art | `tools/pixelart` people files (`sprites_people.py`, `people.py`, new `sprites_townsfolk.py`); no game code | the keys of 7.1 | | | the pipeline's review sheets; `check-atlas.js` (new, the integrator's: every key the code asks for exists, the budget) |
| **A2** vehicles, interiors, goods, carts | `sprites_trains.py`, `stock.py`, new `sprites_goods.py`, `sprites_carts.py` | the keys of 7.2 | | | review sheets |
| **A3** town, nature, props, ground tiles (after T) | `sprites_town.py`, `town.py`, new `sprites_nature.py`, `sprites_ground.py`, `groundlayer.py` (tiles, no baked image) | the keys of 7.3 | `proto-layout.json` | | review sheets |

**One owner per section.** Shared sections (track graph, routes, trains, walk grid, player, cargo, saving, debug, test
hooks, sim tick, the command switch) are the foundation's: after it, nobody edits them except F's narrow cargo rules
(listed above); a builder who truly needs a change there asks the lead, who makes it on the main branch for all.
**The atlas** (`PIX_ATLAS` block) is generated: artists commit only to `tools/pixelart/`, and the integrator runs
`build.py` and `embed.py` once per merge, so it never conflicts.

### 8.4 The integrator

Switches on every `D27` flag, wires what is left, regenerates the atlas, and writes `tests/proto-bot.js` anew
(touch-level commands only: levers, boarding and punching on board, every handling step, the evening trip with
deliveries and pickups, the lessons followed then skipped on day 1) and `tests/check-d27-day.js` (two days: all runs
in and out each day, every switch set by the player at the lever frames, every traveller seated and punched, every
good unloaded, stored, delivered, picked up and loaded, `itemAudit` every hour, the summary's figures match, the same
hash twice and after a reload mid-handling and mid-aisle, worst lateness reported; screenshots at the morning board, a
coach cut away mid-punch, a boxcar door open with the cart, the stacked storage area, the cart on the path, a
delivery at a shop door with its keeper, the street with townsfolk, the summary; portrait and landscape).
`check-proto-day.js` stays as the D25 two-day check run with the D27 flags off (`?d27=0`) for as long as it keeps
passing cheaply; then it is parked.

### 8.5 The day (provisional first cut; T re-times it against the real running times)

| Run | Kind | From > to | Track | Arrives | Leaves | Cars | Goods |
|---|---|---|---|---|---|---|---|
| p1 | passenger | west > east | 1 | 06:50 | 07:20 | 3 coaches | |
| f1 | freight | east > west | 3 | 08:20 | 10:50 | 4 | unloads 6 |
| p2 | passenger | east > west | 1 | 09:40 | 10:10 | 3 | |
| x1 | freight, through | west > east | 2 | 11:30 | 11:30 | 4 | |
| p3 | passenger | west > east | 1 | 12:15 | 12:45 | 2 | |
| f2 | freight | west > east | 3 | 13:20 | 15:50 | 4 | unloads 4, loads 4 |
| p4 | passenger | east > west | 1 | 15:00 | 15:30 | 3 | |
| p5 | passenger | west > east | 1 | 17:00 | 17:30 | 2 | |
| f3 | freight | east > west | 3 | 18:15 | 20:15 | 4 | unloads 4, loads 2 |

Nine runs (D25: 10): passenger trains stand 30 minutes (D25: 15), freight trains 2 to 2.5 hours (D25: 1.4 to 1.75),
because walking the aisle and every handling step now take time. The evening runs from about 20:15 to the day's end,
which moves to 23:00 (`PD.LATE_S`, provisional).

### 8.6 Saving: schema 19

- **18 > 19, a prototype save:** the layout has changed under it, so it is migrated to **the next morning** of the
  same game: the day number, the figures of past days and the first-day state kept; the clock set to 06:00 of the next
  day (phase 'morning'); trains and travellers cleared (every run of the old day gone); the player at the schedule
  board; every good re-placed in the new storage (goods for a shop into its row, goods for the railroad into the OUT
  rows, anything in a car, on a cart or in the hands too), so the count is kept (`itemAudit` passes); the handcart
  becomes the platform cart at its park; lessons not yet started (`S.pd.les` empty) unless the save's `S.pd.guide`
  shows the first day done, then all lessons marked done but replayable.
- **18 > 19, other worlds:** the number only.
- New stores (`S.pb`, `S.fr`, `S.tf`, `S.pd.les`, `S.player.in`) are optional: missing means the default, so a v19
  save made before a builder's work still loads after it. Builders add fields inside their own store without a bump;
  if one is truly needed the integrator adds 19 > 20.
- Saves are kept per world (as since 51b47d8); the v18 fixture's v19 load hash is recorded in `check-save.js`.

### 8.7 Merge conflicts kept low

- The foundation pre-places every hook, command case, tick line, test hook, `run-all.js` line and stub, so builders
  fill functions inside their own sections and do not touch shared lines.
- New code goes in new sections (`tickets on board (D27)`, `freight handling (D27)`, `the town (D27)`, `Lessons
  (D27)`), each with its owner's name at its head, as D25's.
- Layout changes after the foundation are T's alone (W only moves things inside `TOWN27`); anyone who needs a spot
  moved asks T, who re-exports the layout for the artists.
- DEV_NOTES: each builder writes a short part under "D27" in its own paragraph; the integrator joins them.

## 9. Provisional choices for the designer (morning review)

1. **Scale:** 1 m = 1.43u (a person 2.5u) for heights, widths, doors, seats and goods; train lengths compressed to
   about three quarters (coach 13u, engine and tender 18u, boxcar 10u). Alternatives: true lengths (coach 19.6u,
   trains 80u, a platform two and a half screens wider); or two thirds.
2. **Default zoom:** scale 3 as now (a coach just over half the screen; people 33 CSS px). Alternative: scale 2 (the
   whole platform in view; people 22 CSS px).
3. **Coaches board at their ends** (open end platforms with steps, period-true), the aisle down the middle, walking
   coach to coach inside. Alternative: side doors as in D25.
4. **Departure:** a passenger train waits until everyone is seated and every ticket punched and the player is off.
   Alternative: unpunched travellers ride free, counted as missed.
5. **The cargo platform** is the island between tracks 2 and 3, 14u wide (D25: 7.6u) and **raised to car-floor height**
   (1.1 m) with a ramp at each end. Alternatives: a low deck with gangplanks; or a separate freight dock south of
   track 3.
6. **Levers:** two lever frames at platform 1's ends (W1 and W3 at the west, E1 and E3 at the east), rodded to the
   points. Alternatives: all four in one frame at the station; or one lever per switch at each platform end.
7. **The cart's way to town:** down the cargo platform's east ramp, over a plank road crossing at x 37 (tracks 2 and
   1), up a dirt path to the depot square behind the station. Footbridges for walking only.
8. **Numbers:** track spacing 6u, passenger platform 60 x 9u, cargo platform 52 x 14u, legs of radius 20u, footbridges
   at x -14 and 14 with flights running outward.
9. **The town:** six buildings a side (store, hotel, bank, smithy, livery, feed and seed on the west; saloon,
   newspaper, barber, sheriff, undertaker, assay office on the east), the church and a school closing the street; the
   east row seen from behind with hanging signs and painted side walls.
10. **Goods:** the 16 kinds of 4.1, the week's table of 4.4 (the piano on Wednesdays, the plough on Mondays), 6 goods
    out each day.
11. **Handling times** (door 40 s, lift 30 to 60 s, the piano 60 s per step): slow enough to see each step; the
    trains stand longer to match (section 8.5).
12. **Pickups** appear at 17:00 at the shops that send goods; uncollected ones wait.
13. **Townsfolk:** 14 named people with routines, church on Sunday, a few meet trains; they never block the player.
14. **Lessons:** six, each the first time its moment comes; the first card of each holds the clock; replay from
    Settings. The D25 first-day guide is replaced.
15. **Through riders** already aboard (tickets punched elsewhere, a mark in the hatband) to fill the coaches.
16. **The day:** nine runs (8.5), the evening to 23:00.
17. **The atlas budget** raised to 700 KB; the ground composed in the browser from tiles, not baked.
18. **Speeds:** walking stays at the helper's 3.0u per game minute, the clock stays at one game minute per real second,
    the trains' line speeds double in the prototype. Alternative: a slower clock (two real seconds a game minute).
19. **The D25 layout** is replaced, not kept as a second world (old saves move to the next morning on the new
    layout). Alternative: keep it as `?world=proto25`.

## 10. Risks and the frame-time budget

### 10.1 Frame-time budget (a phone)

Targets, measured by `check-pixperf.js` in Chromium at 390 x 844 and 844 x 390 with 4 times CPU throttling (a mid
phone): **the pixel frame at most 8 ms on average and 14 ms at worst** at the busiest scenes (a passenger train with a
coach cut away mid-punch beside a standing freight train with its door open and the storage stacked; the street at
dusk with every townsfolk out), at the default zoom and at scale 1. Unthrottled desktop: under 3 ms (D25's busiest is
2.3 ms).

- **Sprite counts:** at the default zoom about 60 to 150 items in view (D25: about 120 at its busiest); at scale 1 up
  to 400. So: **cull before sorting** (items whose screen box misses the view are dropped), and sort with a screen
  grid of buckets (only pairs that share a bucket are compared) instead of all pairs. Small nature (tufts, flowers,
  pebbles) is baked into the ground, never sorted.
- **The ground:** composed in the browser in **chunks of 256 x 256 native px** from the tiles and the layout (track,
  decks, street, path, creek, rods), on demand around the view, at most one chunk per frame (about 5 to 8 ms each on a
  phone, so done in idle time ahead of the camera; a missing chunk is drawn as flat grass for that frame), kept in a
  cache of about 40 chunks (10 MB). The whole map is about 80 chunks. No 4.8-megapixel canvas.
- **Interiors:** one coach cut away adds about 40 items (14 benches, the sitters, stove, lamps, racks); one boxcar
  about 15. Only the player's car is cut away.
- **Townsfolk:** 14 to 16 agents, a few in view; the tick under 0.05 ms; drawn like travellers.
- **Goods:** up to about 80 alive (storage, cars, cart, shops), each one sprite; a stack is drawn good by good.
- **The upscale** to the screen is unchanged (one `drawImage` of the buffer).
- **The sim tick:** under 1 ms on average at 1x (7.5 ticks a second; 30 at 4x). The player's path-finding on the
  bigger walk grid (140,600 cells) is the slowest part: measured by the foundation; if a long path (lever frame to the
  far end of the street) costs over 10 ms on a throttled run, R or the foundation adds a coarse first pass (a 2u grid,
  then the fine grid near the ends).

### 10.2 Risks

1. **The art volume** (about 1,600 new frames, the vehicles and buildings three to four times larger): the biggest
   risk to the schedule. Mitigation: placeholders draw any missing key; art lands piece by piece; A3 starts after T.
2. **The schedule with longer walks:** a 60u platform and handling steps that take time may make every train late.
   T's `check-levers.js` plays a day with a scripted player; the integrator's bot reports lateness; the fallback knobs
   are standing times, fewer runs, or 2-coach trains.
3. **The east row's fronts face away from the view:** signs, side walls and see-through may still read poorly. The
   fallback is cross lanes with south-facing lots (fronts toward the viewer) for the important east-row shops.
4. **The raised cargo platform** needs height-aware walking and sorting (people on a 13 px deck, in front of and behind
   its face): the foundation's `walkDeckY` and R's sorting carry it; the fallback is a low deck with gangplanks.
5. **Merges in one file:** mitigated by the foundation's hooks and one owner per section; a missed hook costs a small
   conflict in the command switch or the tick.
6. **Older checks tied to D25's numbers** (protoworld, prototrains, protogoods, punch, pixrender, protoui, proto-day,
   the bot): the foundation updates them for the new numbers; the D25 flows must still pass on the new layout before
   any builder starts.
7. **Save migration:** a v18 save mid-day loses its trains and travellers by design (it moves to the next morning);
   goods are kept and audited.
8. **Determinism:** townsfolk depend on train arrivals (meeting), and handling on timers: both are in the state and in
   the hash; `check-townsfolk.js` and `check-d27-day.js` compare hashes twice and after reloads.
9. **Phones' canvas limits** (iOS Safari caps one canvas at about 16.7 megapixels and the total memory): the chunked
   ground keeps every canvas small.
10. **The helpers' merges** (the stall fix in T's and U's areas; the camera follow and faster walking in R's): the
    foundation starts from the merged tip, and T, U and R read those changes before building.
11. **The 3D debug view** (`?view=3d`) and the 3D scene still built in the prototype: plain boxes for the new kinds;
    if building the 3D scene for the bigger map costs over 200 ms at load, the prototype skips it unless `view=3d`.
