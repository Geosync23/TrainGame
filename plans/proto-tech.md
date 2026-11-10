# Prototype (D25): technical plan

Spec: design-doc.md section 0, D25, the designer's survey answers (plans/prototype.html) and the pixel mockups
(plans/pixel/art-scene.png, art-closeup.png), plus the lead's change of 2026-11-10: **the town's main street runs at
right angles to the station and the tracks, away from the station building, with the shops facing each other across
it** (not parallel as in the mockup). This plan says how the prototype is built on the D24 code, what the foundation
already holds, and how five builders share the rest. The sprite contract with the art pipeline is
**plans/proto-sprites.md**. Choices marked **(provisional)** are for the designer.

## 1. The world: 'proto'

Every new game is in the prototype world, `'proto'` (`PAGE_WORLD` defaults to it). `?world=hub`, `?world=start` and
`?world=yard` open the older worlds, unchanged and in 3D; a save keeps its own world. `?world=proto&view=3d` shows the
prototype's sim through the 3D renderer (plain boxes for its buildings): a debug view only.

**Map:** x -56 to 56, z -62 to 20 (112u x 82u; walk grid 224 x 164 cells of 0.5u; terrain flat). North (negative z:
the station, the street, the shops) is up and to the right on the screen; south (positive z) down and to the left.

**Track** (`PROTO`, `buildProtoWorld`, section "starting world layout"). Three parallel tracks through the station:

| Track | z | Use | Straight between |
|---|---|---|---|
| track 1 | -5.03 | passenger trains stop here, beside platform 1 | x -20 to 20 |
| track 2 | 0 | the through line, from x -120 to 120 (64u past each map edge, where trains wait out of sight) | the whole line |
| track 3 | 9.28 | freight trains stop here, beside platform 2's far side | x -20 to 20 |

Crossover legs: a 30 degree arc of radius 12.8u (the switch's diverging leg), a straight (3.2u to track 1, 11.7u to
track 3), an arc back. The validator passes; the 'switch' class has no minimum radius and the yard class's is 12.8u.

**Switches** (ids west to east, `PROTO_SW`), all on track 2, every one set by hand for every train in and out:

| Id | Name | x | Turns off to | Stand (post; the player stands 1u further from the track) |
|---|---|---|---|---|
| 0 | W3 | -42.93 | track 3 (south) | (-31.5, 2.0): in the vee between track 2 and track 3's leg, past platform 2's west end |
| 1 | W1 | -35.57 | track 1 (north) | (-22.5, -6.63): north of track 1, past platform 1's west end |
| 2 | E1 | 35.57 | track 1 (north) | (22.5, -6.63) |
| 3 | E3 | 42.93 | track 3 (south) | (31.5, 2.0) |

**(provisional)** The track 1 levers stand by the platform's ends, rodded to their points 13u away, so they are a few
steps from the platform; the track 3 levers cannot come closer than about 9u past their points (the vee between the
tracks must be wide enough to stand in). Every switch starts the day straight (for track 2).

**Platforms and the walkway:**
- Platform 1: x -18 to 16, z -12.87 to -6.47 (34u x 6.4u), its edge flush with track 1 (1.44u).
- Platform 2 (an island): x -18 to 20, z 1.44 to 7.84 (38u x 6.4u), flush with tracks 2 and 3.
- **The plank walkway** across tracks 1 and 2 at x 18.5 (pads 3.7u wide, `XING_FIXED.proto`): **the only place the
  player crosses the track** **(provisional)**. A passenger train stands with its engine at x 15.6, 1u short of it. A
  through train stopped at a wrong switch E1 (its points at 32.6) stands across it until the switch is set (the price of
  a wrong switch).

**Buildings** (`BLD_LAYOUTS.proto`; new kinds `p1deck`, `p2deck`, `station`, `shop`, `storage`, drawn by the pixel
renderer; in the 3D debug view as plain boxes):
- The station building x -6 to 6, z -18.47 to -12.87, against platform 1's back edge; platform 1's canopy (drawn only)
  x -8 to 8; two lamps; **the schedule board** on posts at (9.5, -12.57): a new day starts with the player in front of it.
- **The storage shed** on platform 2, x -6 to 4, z 2.84 to 5.24 **(provisional: freight on track 3, storage on the
  island)**, with 4 bays in a row on its track 3 side (z 6.09; `BLD_BAYS.storage`). The hand truck and the handcart are
  parked on platform 2 west of it (x -10, -12).
- **The main street** (drawn only) x -3.2 to 3.2, from behind the station (z -18.5) north to the map's edge (z -60).
  **The shops face each other across it** (`PROTO_SHOPS`): the general store (west side, x -8.2, z -30, facing east),
  the saloon (east side, x 8.2, z -30, facing west), the blacksmith (west side, x -8.2, z -44, facing east)
  **(provisional placing)**. Door spots 0.9u out from each front's middle, on the street's edge. Travellers come from
  and go to the street's far end (`PROTO.TOWN_EXITS`).
  Note for the art: in the fixed view a front facing west is turned away from the viewer, so the saloon's front is
  seen from behind; plans/proto-sprites.md asks for a hanging sign over the street so it still reads **(provisional)**.

**Walking distances** (the player on the walk grid, measured by `tests/check-protoworld.js`, which asserts the limits):

| From | To | Walked | Limit |
|---|---|---|---|
| platform 1, west end | switch W1 | 4.8u | 7u |
| platform 1, east end | switch E1 | 6.8u | 9u |
| platform 1, east end | platform 2, east end (over the walkway) | 10.3u | 12u |
| platform 2, east end | switch E3 | 11.8u | 14u |
| platform 2, west end | switch W3 | 13.8u | 16u |
| the schedule board | platform 2 by the walkway | 17.3u | 20u |
| the station | the general store's door | 24.8u | 26u |

At walk 2.0 u per game minute, 5u is 2.5 game minutes (2.5 real seconds at 1x). From the walkway to switch W3 is
about 50u (along platform 2): a second walkway at the west end would halve it **(provisional: one walkway)**.

## 2. The trains (T)

**Reuse.** The prototype's trains are D24's railroad trains: `S.trains` entries with owner `'rr'`, `S.rr` with its runs,
`rrTick` and the phases `due > in > stand > out > gone`, routes, stopping short of a switch set against them (D20,
`trainSwitchWait`), `rrWaveOff`, `rrSwitchNeeds`, `rrBoardRows`. The foundation made the world-specific parts a table,
`RR_WORLDS[world]` (`rrW(T)`): the line's ends, the map, the empty slots' edge, **3 slots** (ids 3, 4, 5: one train at
each platform and one running through), the stock (`PROTO_STOCK`), the schedule (`PROTO_SCHEDULE`) and `wait: true`
(no crew leaving by itself, no cancelling: D25 (6), trains wait and show late). `rrStopPos` gives `protoStopPos`
(`PROTO.STOP`: track 1 engine front at x 15.6 east-bound and -19.1 west-bound; track 3 at 19.1 and -19.1).

**Stock** (provisional, the mockup's proportions): engine and tender 8.8u (one vehicle), coach 5.6u, boxcar and
flatcar 5.0u. A 3-coach passenger train is 26.1u (stands x -10.5 to 15.6 east-bound), a 4-car freight train 29.4u.

**The day** (`PROTO_SCHEDULE`, provisional; the same every day). Times are at the station (through: when it passes).
Each end of the line is single track beyond the switches, so moves at the same end in opposite directions are kept
about 30 minutes apart (T checks them with the real running times and moves times if needed).

| Run | Kind | From > to | Track | Arrives | Leaves | Cars | Goods |
|---|---|---|---|---|---|---|---|
| p1 | passenger | west > east | 1 | 06:40 | 06:55 | 3 coaches | |
| x1 | freight, through | west > east | 2 | 07:45 | 07:45 | 4 | none |
| f1 | freight | east > west | 3 | 08:40 | 10:30 | 4 | unloads 6 |
| p2 | passenger | east > west | 1 | 09:15 | 09:30 | 3 | |
| p3 | passenger | west > east | 1 | 11:30 | 11:45 | 3 | |
| x2 | passenger, through | east > west | 2 | 12:45 | 12:45 | 3 | |
| f2 | freight | west > east | 3 | 13:40 | 15:00 | 3 | loads 4 from storage |
| p4 | passenger | east > west | 1 | 14:15 | 14:30 | 3 | |
| p5 | passenger | west > east | 1 | 16:00 | 16:15 | 3 | |
| f3 | freight | east > west | 3 | 17:15 | 18:30 | 4 | unloads 4, loads 2 |

Switches each move needs (in > out), every one thrown by the player: p (west > east): W1 to track 1 in, E1 to track
1 out (and W3, E3 straight); p (east > west): E1 in, W1 out; f (east > west): E3 in, W3 out; f (west > east): W3 in,
E3 out; x: all four straight. Since every switch starts straight and trains leave them as the player set them, the
player also puts each one back for the next train (the work the designer asked for: "switches = both in and out").

**What T builds** (section "railroad trains (D24)", the D25 parts):
- `rrThroughTick(S, run, ev)` (stub in place, called for `run.through`): in at its time from its end, along track 2,
  out at the other end, stopping short of a wrong switch and waiting (late); `tArr` when its front passes x 0;
  `rrLeft { run, late, through: true }` (pdTick counts it). Its switches in `rrSwitchNeeds` (all straight).
- Check the schedule against the real running times (the line-clear rule, `rrLineClear`); a late train makes the next
  one at its track or end late, never cancels it.
- Wave-off in the prototype: the same command (`rrWaveOff`), within reach of the engine; refused while travellers are
  still in line or boarding (`pxReady` > `ppReady`) or goods for the town are aboard (`cgReady` > `pgReady`). The
  texts name tracks 1 and 3 and platforms 1 and 2.
- Events and rows as D24 (`rrDue`, `rrEntered`, `rrArrived`, `rrReady`, `rrWavedOff`, `rrLeft`, `trainSwitchWait`;
  `rrBoardRows` with `track` 't1' / 't2' / 't3'); `pdCount(S, ...)` is done by pdTick from rrArrived and rrLeft.
- A debug scenario `rh.scenario('proto')` and `rrDebugJump` working in the prototype.
- Check `tests/check-prototrains.js`: a scripted player sets the switches and sends each train off; all 10 runs in
  and out in order; a wrong switch stops a train short of it; a late wave-off makes the next train late; no cancelling.

## 3. Passengers: the line and the punch (P)

**Reuse.** `S.pax.list` holds the travellers (P's states); `paxTick` hands over to `pxTick` (the counter is parked), and
the foundation sends every `px*` call in the prototype to P's `pp*` stubs (section "prototype passengers (D25)").
- **Before a train:** from `PP.LINE_S` (60 minutes) before a passenger run's arrival, `PP.PER_TRAIN` (3 to 7)
  travellers come from the street's end and **line up on platform 1 at the coach door positions** of that run
  (`ppLineSpots(S, run)`: each coach has two doors, at 1/4 and 3/4 of its length; from `protoStopPos` and the stock
  lengths, so the line is where the doors will stop), one behind another away from the track.
- **When it stands:** riders for the Hub (`PP.OFF`, 2 to 5) step off first and walk to the street's end; then each
  **punch** (command `{ t: 'punch', tr, car }`; the player at that coach's door spot) punches the first ticket in that
  door's line (`PP.PUNCH_S`, 8 game seconds) and that traveller boards. No money (parked).
- `ppReady`: nobody left in line, stepping off or boarding. Sending the train off while some are still in line is
  refused (T's wave-off asks `pxReady`); **(provisional)** the alternative (they are left behind: `ppMissed`) is kept
  in the code for the designer to choose.
- `ppCarStatus(S, stock)` `{ stock, tr, line, punched, aboard, spot }` and `ppRunStatus(S, run)` for the screens.
- Events: `ppLine`, `ppPunched`, `ppBoarded`, `ppOff`, `ppMissed`, `ppRefused`; `pdCount(S, 'punched')`.
- Drawing: P gives R the travellers' states and facings (`ppDrawList(S)`: `[{ id, x, z, f, act: 'idle' | 'walk' |
  'ticket' | 'board', who }]`), R draws them with the sprites.
- Check `tests/check-protopax.js`: lines form at the doors before p1, punches board them one by one, riders step off,
  the train is ready only when the line is empty, the same result twice.

## 4. Freight, storage, the handcart and the shops (F)

**Reuse.** The item store (`S.items`, waybills, `itemCreate`/`itemMove`), the carrying commands (by hand, hand truck,
handcart), `BLD_BAYS.storage` (4 bays on platform 2 by track 3), the D24 car panel on the railroad's freight cars. The
foundation sends every `cg*` call in the prototype to F's `pg*` stubs (section "prototype goods (D25)").
- **Goods and tags:** a waybill's consignee is the shop: `{ kind: 'BUSINESS', id: 'store' | 'smithy' | 'saloon' }`
  (destTownId 0), or for the railroad `{ kind: 'OUTSIDE', id: 'out' }`. New tags `STORE`, `SMITHY`, `SALOON` (and
  `OUTSIDE` for OUT) in `CARGO_TAGS` with their own colour, letter and shape; `itemTag` reads the shop in the
  prototype. Bays may carry a tag as now (`setBayTag`).
- **Each day** (`pgNewDay(S, day)`, called by the foundation at the start of each day): the goods for the railroad
  waiting in storage at dawn (6 items, `OUTSIDE`: 4 for f2, 2 for f3). `pgConsist(S, run)`: the run's cars (boxcars,
  a flatcar for long goods); `pgLoad`: f1's 6 and f3's 4 shop goods put in the cars (a fixed list per run, the same
  each day **(provisional)**: f1 store 3, smithy 2, saloon 1; f3 store 1, smithy 1, saloon 2).
- **At track 3:** unload into the storage bays (or onto platform 2); load the waiting OUT goods into f2 and f3.
  `pgReady`: nothing for the town aboard and the run's OUT goods loaded **(provisional: a freight train waits until
  it is loaded)**. `pgOnDepart` takes the loaded goods away (`itemConsume ... 'soldOutside'`; no money).
- **Evening:** the day's shop goods are sorted by shop into the handcart (6 slots) and pushed over the walkway and up
  the main street to the shops' doors; `{ t: 'pgDeliver', shop }` at a door hands in the goods for that shop
  (`pgDelivered`; a wrong shop refuses: `pgRefused`). The handcart may roll on the decks and the walkway in the
  prototype (`carryNoCartRects` leaves the new deck kinds out; ramps at the deck ends are drawn by R/art).
- `pgToDeliver(S)` (by shop), `pgCarStatus` for the screens; `pdCount(S, 'unloaded' | 'loaded' | 'delivered')`.
- Check `tests/check-protogoods.js`: f1's goods unload into the bays, f2 loads the waiting goods, the handcart takes 6
  over the walkway and up the street, each shop takes only its own, items are conserved.

## 5. The day and the screens (U)

**The day** (section "prototype day (D25)", foundation, owned by U): `S.pd = { on, day, ph, stats, sum }`, phases
`'morning'` (06:00: the player in front of the schedule board; U opens the board and holds the clock until the player
starts: `{ t: 'pdStart' }`; by itself at 06:30), `'day'`, `'evening'` (once every one of today's runs has gone),
`'summary'` (`{ t: 'pdEndDay' }` in the evening, or 22:00 by itself, provisional) and `{ t: 'pdNextDay' }`: the clock
jumps to 06:00 the next day, the player back at the board, the figures start again, `pgNewDay`. Events `pdDay`,
`pdEvening`, `pdSummary { sum }`, `pdMorning { day }`. Figures (`stats`): trains, on time, late, worst lateness,
punched, missed, unloaded, loaded, delivered.

**The screens** (section "HUD and panels", a new block "Prototype (D25)", and `pdHud()` / `pdOnEvent(e)` called from
`updateHud` and `doTick` like `rrHud`; the D24 hub's screens are parked in the prototype, `worldParked(T, 'hubui')`):
- **The schedule board** (a card, and the board in the world drawn by R from `pdBoardRows(S)`, U's rows from
  `rrBoardRows`): every train of the day: time in and out, from, to, track (1, 2 through, 3), on time or late, and
  what it needs (switches, punches, goods).
- **The Next job line** (D21's line, a prototype version): the next thing to do and where ("Set W1 to track 1 for
  Passenger 1 by 06:30"); a tap shows the helper arrow (D20's arrows read U's target).
- **Buttons over the world** (thumb-sized, 48 px): "Punch (n)" at a coach door with a line, "Send off" over a ready
  engine, a switch's state shown at its stand with a tap to throw it, the handcart's "Hand in" at a shop door.
- **The summary card** at the end of the day (no money): trains on time, late, worst; tickets punched, missed; goods
  unloaded, loaded, delivered; "Next day".
- **A short first-day guide** (not the parked tutorial telegrams): 5 or 6 steps shown in the Next job line and the
  arrows on day 0 (read the board, set W1, punch tickets, send off, set the switches back, ...), kept in the save as
  `S.pd.guide` (U adds it, optional field).
- Parked in the prototype (hidden by `body.proto` in the CSS, foundation): cash, the turn buttons, telegrams and alerts,
  Build, Office, Work board. U decides the rest (Look, Settings, speeds).
- Check `tests/check-protoui.js`: the board at the morning, the Next job line through p1, the buttons, the summary.

## 6. The pixel renderer (R)

Section "pixel renderer (D25)" (foundation skeleton in place). **Design:**
- **Canvases.** A 2D canvas `#pix` over the WebGL canvas (z-index 1, under the HUD), `pointer-events: none`, so the
  existing touch handling on the WebGL canvas keeps working. In the prototype `render()` calls `pixFrame` and returns:
  three.js does not draw (the 3D scene is still built, cheaply, so code that reads `view` keeps working). Other worlds
  hide `#pix`.
- **Native pixels and the upscale.** Everything is drawn on a small buffer canvas in native pixels, then copied to
  `#pix` scaled by a whole number (`PIX.scale` device pixels per native pixel) with smoothing off. The default scale
  shows about 300 native pixels across a portrait phone's short side (the mockup is 270 at 3x): 3 on a 390 px wide
  phone at 2x. **Zoom only in whole steps**: pinch and the wheel still move `cam.zoom`; `pixScale()` turns it into a
  whole scale from 1 to 8. No camera turning (the turn buttons are hidden; Z and X keys do nothing in the prototype).
- **Projection** `PIX_PROJ` (plans/proto-sprites.md): `sx = OX + 8 (x - z)`, `sy = OY + 4 (x + z) - 8 y`. The camera
  is a whole native pixel (`PIX.vx`, `PIX.vy`) so nothing shimmers; it follows the player with the 3D view's lag;
  drag pans (`pixPanBy`), held on the map (`clampX`, `clampZ`).
- **Screen and world.** `toScreen`, `groundAt`, `groundAtY` and `pickAt` branch to `pixToScreen`, `pixGroundAt`
  (decks unprojected at their drawn height, `DECK` = 3 px) and `pixPickTrain` (the vehicle whose box holds the tap's
  ray at some height, the nearest the viewer), so every tap, hold-walk, button placement and helper arrow works through
  the same functions as in 3D. R also routes Look and any other raycast left.
- **Layers.** (1) **The ground** (`PIX.ground`, made once per track): grass, the main street, ballast, ties and rails
  of every track including switches, the decks with their two visible faces, the walkway. The foundation works it out
  pixel by pixel from the world (exact shapes, ordered-dither texture); when the art pipeline bakes `ground` (plans/
  proto-sprites.md), R draws that image instead. (2) **Everything that stands up** in one list in painter's order:
  each thing is a `pixItem` with its world box (x0..x1, z0..z1, y0..y1) and a draw function; `pixSort` orders the
  pairs whose screen rectangles overlap by the isometric box rule (wholly at smaller x first, else smaller z, else
  lower y; intersecting boxes by their centres' depth), then a topological order. So a person beside a 26u train, under
  the canopy or behind a shop is drawn on the right side of it. **Buildings that a person can be both in front of and
  behind** are split into parts with their own boxes (the station and its canopy; the storage shed and its bays), and
  long vehicles are boxes per vehicle (each car is its own item).
- **Sprites.** `PIX_ATLAS` (generated by the art pipeline, pasted between markers) holds the sheets and frames by key;
  `pixSprite(g, key, x, y, z, mirror)` draws a frame with its anchor at the world point; a missing key falls back to
  the placeholder shape, so art lands piece by piece. Vehicles take the nearest of ten headings; people four facings
  (two drawn, two mirrored), animation frames by game time.
- **Text** in the 3 x 5 pixel font (`pixText`): sign names, the schedule board's rows (times, track, late), crisp at
  every scale. Names in the HUD stay HTML.
- **The canopy** fades (drawn every other pixel, a dither) while the player is under it, as D15's see-through roof.
- **Draw cost** (measured by the foundation at 390 x 844 and 844 x 390, 2x): about 1 ms a frame with two trains
  standing (18 to 23 items, 2,000 to 3,100 row fills of placeholder boxes), the ground layer about 150 ms once at
  load. Sprites are one `drawImage` each, so the full scene (3 trains of 4 to 5 vehicles, 30 people, 20 goods, 15
  buildings and props) is about 100 draws a frame plus the ground copy and the upscale: well inside a phone's budget.
  `__railhead.pix.stats` reports frames, items, fills and ms.
- R also draws: travellers (`ppDrawList`), goods in cars (open boxcar door), on the decks and in the handcart, the
  handcart and the hand truck, smoke, the switch points by state, a tap marker and the helper arrow's ground dots in
  pixels.
- Check `tests/check-protorender.js`: sprites drawn for every key in the atlas, painter's order in the tricky cases (a
  person behind and in front of a standing train, under the canopy, behind the storage shed), whole scales, a tap on
  a person, a car, a stand, the frame time, screenshots.

## 7. Saving

- **Schema 18** (done): 17 -> 18 gives an old save `S.pd` switched off and changes nothing else; it keeps its world
  and runs as before. `checkSaveShape` accepts the world 'proto'; `pdCheckSaveShape` checks the day store;
  `rrCheckSaveShape` allows `S.rr` on in the prototype. Sample `tests/fixtures/save-v18.json` is a prototype game; every
  older sample records its v18 load hash. `migrate` now reads the save's own world's layout tables (an old test yard
  save migrated while the page is in the prototype got the prototype's bay names before this fix).
- **Builders do not bump the schema.** New fields go inside their own part and are optional (missing means the
  default): T in runs, P in `S.pax` travellers and `S.pax.pp` (new, optional), F in `S.rr.cg` / `S.items` waybills,
  U in `S.pd` (for example `S.pd.guide`). If one is truly needed, the integrator adds one 18 -> 19 step.

## 8. Parked in the prototype

`WORLDS.proto.parked` (read with `worldParked(T, what)`); the code is kept and still runs in the older worlds:

| Flag | What | Where it is switched off |
|---|---|---|
| overland, interchange, willow, no1, counter | as in the D24 hub world | as there |
| money | cash, fares, prices, the ledger, orders, contracts due | `econTick` returns; cash hidden |
| workboard, contracts, ordering | the work board and its contracts and orders | `econTick`; the button hidden; the hub's work board is not in this world |
| building | the build tool | its button hidden |
| telegrams | telegrams and alerts | `tgTick` returns; the buttons hidden |
| fuel | wood and water | the railroad's trains need none (as D24) |
| tutorial | the investor's tutorial telegrams | done at the start; `tutTick` returns |
| town | the town's businesses using goods and offering work; the M1 lots | `townTick` returns; `townPlaced` is empty |
| cards | D22's first-time cards | `cardsTick` returns (U's guide instead) |
| hubui | D24's hub screens (Send off, Check tickets, its boards and tutorial) | `rrHubOn` is false |

## 9. The work split (phase 2)

Five builders in parallel, each on its own branch from the foundation; the stubs are in place with the agreed names,
wired into the tick and the command switch, so each can build and test alone. Each adds one check file and one line
in `run-all.js`, and keeps every other check passing.

| Builder | Owns (sections of index.html) | Provides | Calls |
|---|---|---|---|
| **R** pixel renderer | "pixel renderer (D25)"; the `PIX_ATLAS` block; the branches in "input" (`toScreen`, `groundAt`, `pickAt`, `panBy`); `render()`'s first lines | `pixSprite`, the sorted scene, picking people and goods (`pixPick`), the ground image, the canopy fade, `pixBoardDraw(rows)` hook for U | `ppDrawList` (P), the item store (F), `pdBoardRows` (U), `curPoses` |
| **T** trains, switches, schedule | "railroad trains (D24)" (the D25 parts: `RR_WORLDS`, `PROTO_SCHEDULE`, `PROTO_STOCK`, `protoStopPos`, `rrThroughTick`, wave-off rules); "starting world layout" for any layout change (then re-run `tools/pixelart/export-layout.js`) | runs, `rrSwitchNeeds`, `rrBoardRows` for the prototype, `rh.scenario('proto')` | `pxReady`/`cgReady` (they redirect to P and F) |
| **P** passengers | "prototype passengers (D25)"; travellers' states | `ppTick`, `ppOnArrive`, `ppReady`, `ppOnDepart`, `ppPunchCmd`, `ppLineSpots`, `ppCarStatus`, `ppRunStatus`, `ppDrawList` | `rrRunOf`, `protoStopPos`, `PROTO_STOCK`, the walk grid, `pdCount` |
| **F** freight, storage, handcart, shops | "prototype goods (D25)"; narrow edits in "cargo" (`CARGO_TAGS`, `itemTag`), "player" carrying (`carryNoCartRects`, the handcart), `TOOL_PARKS.proto` | `pgNewDay`, `pgConsist`, `pgLoad`, `pgReady`, `pgOnDepart`, `pgTick`, `pgCarStatus`, `pgToDeliver`, `pgDeliverCmd` | the item store, `PROTO_SHOPS`, `rrRunOf`, `pdCount` |
| **U** screens | "prototype day (D25)"; "HUD and panels" block "Prototype (D25)" (`pdHud`, `pdOnEvent`, the board card, Next job, buttons, the summary, the first-day guide); the `body.proto` CSS | `pdBoardRows`, `pdHintTarget` (for the arrows), the commands from buttons | `rrBoardRows`, `rrSwitchNeeds`, `ppCarStatus`, `pgToDeliver`, `S.pd`, R's `toScreen` |

- **Shared code** (trains, routes, walk grid, items, the 3D renderer): change only what the task needs, say so in the
  handover, and keep every older-world check passing (they open `?world=start`, `yard` or `hub`).
- **Merge order:** T first (trains moving), then P and F (they meet T at the redirects), then R (it draws P's and F's
  things; it can start at once with the placeholders and the art), then U (it reads everyone's data).
- **The integrator** merges the five, wires what is left, and writes the bot and the acceptance check:
  `tests/proto-bot.js` (plays through touch-level commands only: reads the board, sets every switch in and out, punches
  every ticket, sends trains off, unloads and loads, sorts the handcart, delivers to the three shops, ends the day) and
  `tests/check-proto-day.js` (two days played: all 10 runs in and out each day, every switch set by the player, every
  traveller punched, every good delivered, the summary's figures match what happened, items conserved, the same hash
  twice and after a save and reload mid-day, screenshots at the morning board, a busy moment and the summary).

## 10. Provisional choices for the designer

1. Layout numbers: track spacing 5.03u (tracks 1 and 2) and 9.28u (2 and 3), platforms 34u and 38u long and 6.4u deep,
   crossover legs of radius 12.8u at 30 degrees.
2. The track 1 levers stand by platform 1's ends, 13u from their points (rodded); the track 3 levers in the vee past
   platform 2's ends.
3. One plank walkway, at the platforms' east end; walking to the far west switch W3 is about 50u from it.
4. Freight trains at track 3 with the storage shed on platform 2.
5. The shops' places along the main street (store and saloon facing each other, the blacksmith further up on the
   store's side), and a hanging sign for the saloon (its front faces away from the fixed view).
6. The day's schedule above (10 runs: 5 passenger, 3 freight, 2 through) and its goods (6, 4 in; 4, 2 out).
7. Train sizes: engine with tender 8.8u, coaches 5.6u, boxcars 5.0u (bigger than the 3D game's, to match the mockup).
8. The day: opens 06:00 at the board, starts by itself at 06:30, ends by itself at 22:00; the night is skipped.
9. Tickets: 3 to 7 travellers per train, 8 game seconds a punch; a train cannot be sent off with travellers in line.
10. A freight train cannot be sent off until it is unloaded and loaded.
11. The default zoom (about 300 native pixels across a portrait phone) and the zoom range (1 to 8 device pixels per
    native pixel).
