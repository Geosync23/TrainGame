# Where the project is

As of 2026-11-14, commit `1cdf55a` ("Notes: D34 built, version 13, one load-sensitive check logged"), which is the
build published as version 13 of the playable page. Written for someone who has never seen the project.

Everything below was checked against `index.html` and `tests/` at that commit, not only against the notes. Where a
figure comes only from the notes (a measurement nobody can repeat by reading the code), it says so. Where the code and
the notes disagree, the code is described and the difference is listed in the last part of this file.

The other documents, in the order a new reader wants them:

| Document | What it holds |
|---|---|
| `CLAUDE.md` | The designer's house rules: how work is planned, tested, reviewed and handed over. |
| `design-doc.md` | The design. Section 0 is the list of decisions D1 to D34; each later decision overrides the original document. |
| `DEV_NOTES.md` | How each system was built, by whom, with its provisional choices and checks. Very long (about 460 KB); search it by heading. |
| `backlog.md` | Small bugs and ideas found along the way, dated. |
| `plans/handover.md` | The lead's handover note, newest part at the top. |
| `plans/README.md` | An index of every plan and survey page in `plans/`. |
| `docs/Railhead_GDD_original_2026-10-31.pdf` | The original design document that `design-doc.md` was converted from. |

---

## 1. What a player can do today

### The shape of the game

Railhead is a railroad game set in 1866, made for phones (portrait and landscape, touch first). The whole game is one
file, `index.html`. A new game opens in the **prototype world** (`'proto'`), drawn as isometric pixel art by a 2D
renderer of its own. The older 3D worlds (built with three.js r128) are still in the file and open only with a URL
switch (part 2). Everything that was cut along the way is parked behind switches, never deleted (a house rule).

The player is the station agent at a small frontier station. There is no money, no contracts and no building track in
the default game: those are parked (design-doc D25). What there is: a working day at the station (trains, switches,
tickets, freight, an evening delivery run to town), a town of 41 people living their own days, and a new line being
built east of the station by a simulated rail crew, which the player can walk out to and join.

On screen: the clock (top left) with pause, 1x, 2x and 4x; the **Next job line** across the top; Look; the helper
Arrows toggle; Settings (gear). Settings holds: the Next job line on or off, helper arrows, first-time cards, train
messages, Replay the lessons, Dev mode, and Start over (deletes this world's save after a confirm).

**Time.** A tick is 8 game seconds. The prototype runs 5 ticks a real second (`WORLDS.proto.clock`), so at 1x a game
minute lasts 1.5 real seconds and a whole day about 36 real minutes. The other worlds keep the older rate.

### The station

Built to design-doc D25 and D27, with the D28, D29 and D31 changes:

- Platform 1 (60u long, planked) beside track 1, the depot (station building) set back behind it with a planked apron,
  the canopy and the TRAINS schedule board.
- Track 2, the through track, carries on east as the new line (part "The line" below).
- Track 3 runs beside the raised **cargo platform** (with two ramps), the freight house and the storage cells (rows by
  shop).
- Two wooden footbridges over the tracks, and a plank crossing for the cart at the east end.
- Four switches, W3, W1, E1 and E3, all worked from **one lever frame** standing on the ground just off platform 1's
  west end beside track 1 (D29). `?levers=two` brings back D27's two frames.
- Behind the station the town's main street runs north, at right angles to the tracks (part "The town").

Units: 1u is 0.7 m; a person is 2.5u (1.75 m) tall, drawn about 20 px.

### A day at the station

The default day (`PROTO_SCHEDULE_I` in "railroad trains (D24)"; eight runs, the same every day):

| Run | Kind | Track | In | Out | Notes |
|---|---|---|---|---|---|
| p1 | passenger, 3 coaches, west to east | 1 | 06:45 | 07:35 | |
| f1 | freight, 4 cars, east to west | 3 | 08:25 | 09:45 | 6 goods to unload |
| p2 | passenger, 3 coaches, east to west | 1 | 10:05 | 10:50 | |
| x1 | through freight, west to east | 2 | 11:40 | 11:40 | does not stop; both crossovers set straight for it |
| f2 | freight, 4 cars, west to east | 3 | 12:05 | 14:30 | 4 to unload, 4 to load |
| p3 | passenger, 2 coaches, west to east | 1 | 14:50 | 15:35 | |
| f3 | freight, 4 cars, west to east | 3 | 16:00 | 17:40 | 4 to unload, 2 to load |
| p4 | passenger, 3 coaches, west to east | 1 | 18:00 | 18:45 | |

A walk through one day:

1. **06:00, the morning.** The day opens with the player at the schedule board and the "Today's trains" card. The
   clock holds until he taps Start the day (or 06:30 comes). Meanwhile the work train stands on track 2 and the rail
   crew walk out of their camp and board it in view; it leaves at 06:22, the first train out (part "The line").
2. **Switches.** A train stops short of a switch set against it and waits, running late; it is never cancelled. The
   player walks to the lever frame and throws each lever a train needs, in and out. The Next job line and the arrow
   name the lever, in train order.
3. **Tickets (D27, faster in D29).** Travellers board and sit down. The player steps into a coach (it is drawn cut
   away), walks the aisle and punches each seated traveller's ticket (16 game seconds each). A train can be sent off
   (from beside the engine) only once every ticket is punched and nobody is still in line.
4. **Freight (D27, D29, D31).** A freight train stands at the cargo platform. The player opens a boxcar door and taps
   each good once: it joins his queue and he lifts it out, onto the small platform cart (3.4 by 1.6u, goods stacked up
   to four high) and into its shop's storage row. Goods for the railroad wait in the OUT rows and are loaded into a car
   that takes them. A freight train cannot be sent off until it is unloaded and loaded. Each day brings 8 goods in and
   sends 4 out (half the first D27 amount; `?goods27=full` gives the full amount).
5. **The evening (D27).** After the last freight train (f3, 17:40) the player pushes the cart up the cart path to the
   main street, stops in front of the shops and taps Deliver: each shop's keeper walks to the cart and carries his
   goods in. He also picks up the shops' goods for the railroad and brings them back to be stacked in the OUT rows.
6. **The summary.** The day ends when he taps End the day, or by itself at 23:59 (`PD.LATE_S`). A card gives the
   figures: trains in and out and how late, tickets punched, goods unloaded, loaded, delivered and picked up, the head
   count, and (if he was out on the line) what the relief man missed. Next day jumps to 06:00.

Six **lessons** (switches, tickets, unloading, loading, delivery, pickup) each open at their moment the first time,
with Show me and Skip; they can be replayed from Settings. While the player is out on the line, a **relief man**
throws each lever 10 game minutes after it is needed, and trains leave with work undone, which the summary reports.

### The town

Built to D27 (the townsfolk) and D32 stage 3 (the bigger town); confirmed in the page: 41 townsfolk in 26 households.

- Twelve shops along the main street (general store, saloon, hotel, blacksmith, livery, newspaper, bank, undertaker,
  feed store, barber, sheriff, assay office), the church, the school, the 8 houses of D27 and 10 more houses of three
  kinds (cabin, frame house, two-room house) on the back lanes and a third lane west of town.
- Each person has a role, a home and a workplace and a daily round: work, the noon meal, an errand, the saloon or the
  porch in the evening, home by 21:30, church on Sunday, school Monday to Friday.
- A small **economy of counts**: the nine shops that take goods by rail keep stock (0 to 12), fed by the goods the
  player delivers and used up each day. A shop with no stock shows empty shelves for a morning, then shuts, with a
  "Closed" board in the street and its keeper waiting at the door. Households are paid when their workplace is open;
  unpaid households become worried, then unhappy (they stand about the square in the evening). Travellers who step
  off may walk into town to the hotel or the saloon, and that custom keeps those two open.
- **Look cards**: tap a townsperson, a rail man, a hired hand, a traveller, a home or a shop to see a card (role, home,
  work, household, purse, mood; a shop's stock, open or shut).
- On Saturday evening a third of the rail men walk to the saloon, and on Sunday evening a quarter go to the church.

**Enterable buildings (D32 stage 3, Rooms).** 33 rooms (confirmed in the page): every shop, the church, the school,
all 18 houses and the station's waiting room. The building the player stands in (or whose door he is within 1.2u of,
or that he tapped) opens: its front walls and roof fade in place over a quarter of a second, leaving a low sill, and
the furniture and the people at their places inside are shown (keepers behind counters, pupils at desks, sleepers in
bed at night). A tap on a shut building opens it and shows its Look card; a tap on an open one walks him in. The camp's
tents open the same way. The freight house and the lever frame are not enterable.

### The line east of the yard

Built to D32 (line building), then joined to the station in one world by D33 and given in-world games by D34.

- **What it is.** A new line 2,520 m (3,600u) long, from a junction just east of the station to a far town, through
  nine regions of country in this order: home prairie, creek bottoms (with a trestle), the hills and the cut, the big
  woods, the rocks, the river run, the canyon, the pass, the far valley. Natural borders run along both sides of a
  narrow corridor; the country beyond them goes on so that no edge of the world is ever seen.
- **One world.** The line is drawn in the station's own map: track 2 carries on east past a **yard limit board**
  (x 88). The old main line turns away north-east at the junction (x 96) into a wood, where trains are lost to sight.
  Walking east past the board, the player is "away" on the line; walking back, he is the station's man again. No
  screen change, no fade.
- **Built in six stages**, each with its own front: cleared, bed (digging), rock, ties, rails, spiked. A new game
  starts with the line about a screen into construction (fronts at 105, 98, 92, 88, 78.2 and 72 m: confirmed in the
  page).
- **The rail crew.** A new game starts with a crew of 5 men (confirmed). Each man is simulated: a name, one of three
  looks, a skill, stamina, a tool. They sleep in the tent camp west of town (a tent to every four men), get up at
  05:25, breakfast, walk to the muster by the water tower, board the work train, work 07:00 to 12:00 and 13:00 to
  18:00 (every day, no Sunday rest), eat at noon by the fire at the work site, rest when tired, ride home in the
  evening, and are counted at the 22:00 **head count** with the townsfolk.
- **The gangs.** Clearers, diggers, the rock gang (barrow men and rakers), tie men (in pairs), rail men (in fours) and
  spikers. Since D34 a tie needs two men and a rail four (`CW.NEED = [1, 1, 1, 2, 4, 1]`), so a small crew is slow:
  the notes measured 13 to 14 working days for 30 men and 98 days for 5 men.
- **Dev mode** (Settings, or `?dev=1`) opens a Dev panel: the rail crew size (0 to 30, in force at once), hired
  station workers (ticket punchers 0 to 3, cargo loaders 0 to 4, delivery men 0 to 2), Ride out as a rail worker,
  Ride out now, Come back with the evening train, Back to the station now, Look at the line, Skip to 05:00 tomorrow,
  "Lay the line to 40 m short of the far town", and a status block. Crew size and hiring exist only here: there is no
  in-game way yet (the designer's D32 said "progression later").

### The work train

A scripted run, not a railroad train of the station's sim (the notes give the reason: adding a third kind of run would
have touched about twenty places). It comes in at 05:50, stands on track 2 at the station 06:00 to 06:22 while the men
cross the plank walk into the crew car, runs out in one continuous motion to the railhead (about four minutes later),
stands behind the spiked front all day, moving up as the work goes on, leaves at 18:20, holds outside the junction,
backs in at 19:05, stands 19:15 to 19:35 and backs away. The player rides it by walking to the crew car and tapping it
(at the station in the morning, at the railhead to come home); a train missed leaves him at the station, from where
he can walk out along the line. D34 fixed the train vanishing for a second and shaking by a pixel on the ride out.

### The six join-in games

Out on the line, walking up to a gang shows a "Join" button. Since D34 the games are played **in the world**, at that
gang's front, with the gang's real men lent to him; the old inset-panel games are parked behind `?d34=0`.

| Gang | What the player does | One round is worth |
|---|---|---|
| Clearing | swipe along the chalk line across the next clump (three swipes; a tree four) | time-based work on the cleared front |
| Digging | tap four times as the ring closes on the beat (760 ms), then flick to throw the earth | time-based work on the bed |
| Rock | fill a barrow at the rock heap, wheel it in, tap to tip it on the chalk cross, then drag to rake level | time-based work on the rock front |
| Ties (two men) | hold on "Hup!", keep your end level with your mate's as you carry, let go on "Down!" | exactly one tie (0.6 m) |
| Rails (four men) | "One... two... Lift!": hold, keep the rail on the gauge strip, let go on "Down!" | exactly one rail (4.55 m) |
| Spiking (alone or two) | tap as the ring closes on the spike head, turn about with a mate (620 ms) or alone (1,240 ms) | exactly one spike (0.15 m) |

Results are good, fair or poor by timing (full within 90 ms, nothing at 330 ms). A poor tie, rail or spike round is
not done (try again). Working well lifts the pace of the men near him. If the gang has too few men at hand, Join is
refused with a line saying why (for example "No one on the tie gang to carry with you: a tie takes two men."). Each
gang has a lesson card the first time; a tap on any man opens his Look card.

### The far town

At the end of track (the line's x 3,600u) stands **Prospect** (a provisional name, the designer's to choose): a
platform, a depot, a water tank, a name board, a square, a main street of eight buildings, back lanes, fields and a
dozen townsfolk. When the last spike goes in, a card says so ("The last spike is in! The line has reached Prospect
...") and the townsfolk crowd the platform to cheer the work train; from the next day the work train no longer runs.
In normal play it is far off (98 working days with the starting 5 men); Dev mode's "Lay the line to 40 m short of the
far town" reaches it quickly. `?fartown=0` parks it.

---

## 2. Every switch

### URL parameters

Found by searching `index.html` for `URLSearchParams(location.search)` (the only way the page reads its address; it
never reads `location.hash` or `location.href`). Every one is listed. "Default" is what happens without the parameter.

| Parameter | Default | What it does | Parked feature it restores, or purpose | Where read |
|---|---|---|---|---|
| `?world=hub` / `start` / `yard` | the prototype (`proto`) | opens an older world, in 3D: `hub` the D24 station rework, `start` the M1 real start (hub and Willow Ford), `yard` the M0 test yard. Any other value is the prototype. | The older 3D games (M0, M1, D24). Their saves are kept apart (part 4). | `PAGE_WORLD`, "game loop state" |
| `?view=3d` | pixel view | draws the prototype with the old 3D renderer (plain boxes for its buildings) | The 3D look of the prototype | `PIX_VIEW3D`, "pixel renderer" |
| `?d34=0` | on | D34 off: the six join-in games return to the inset panel, with the old time-based worth and no crewmates needed | D32 stage 2's panel games | `D34`, "the line (D32)" |
| `?d33=0` | on | D33 off: the line is a separate screen reached by fades; a new game has no line until Dev mode turns it on. Also turns D34 off (D34 needs D33). | D32 stage 1/2's separate line screen | `D33`, "the line (D32)" |
| `?tn=0` | on | the bigger town off: the D27 town of 19 people and 8 houses, no economy | The D27 town | `TN_OFF`, "starting world layout" |
| `?rooms=0` | on | buildings stay shut; townsfolk vanish at their doors | Buildings that cannot be entered | `RM.ON`, "rooms (D32)" |
| `?fartown=0` | on | no far town at the end of the line | The line ending in open country | `FT.ON`, "the far town (D32)" |
| `?d31=0` | on | D31 off: step-by-step Lift and Put buttons instead of one tap per good, the D27 walking pace, the hard-edged see-through rectangle | D29/D27 handling and pace | `D31_OFF`, "starting world layout" |
| `?d30=0` | on | D30 off: trains drawn car by car as before (judder) | Pre-D30 train drawing | `D30_OFF`, "pixel renderer" |
| `?d29=0` | on | D29 off: D27's handling and punching times, chaining, and drawing without smoothing or cues | D27 handling and punching | `D29_OFF`, "freight handling (D27)" |
| `?levers=two` | one frame | D27's two lever frames, one at each end of platform 1 | D27's two frames | `PROTO.LEVER_FRAMES`, "starting world layout" |
| `?d27=0`, `?d27=all`, `?d27=board,handling` | all four on | sets the four D27 parts (board, handling, town, lessons) all off, all on, or only those named | `?d27=0` gives the D25 prototype's flows (tickets punched in line at the door, the D25 handcart and shed, the first-day guide) on the D27 layout. Also picks the older day (`PROTO_SCHEDULE_T`). | "starting world layout" (`WORLDS.proto.d27`) |
| `?doorline=1` | off | keeps D25's line of travellers at the coach door even with D27's board on | Used by check-punch | "starting world layout" |
| `?sched27=t` | the eight-run day | builder T's nine-run day (`PROTO_SCHEDULE_T`) | The day before the lead's evening decisions | `PROTO_SCHEDULE` |
| `?goods27=full` | half | the full D27 goods per day (`SHOP_GOODS27_FULL`) | The first D27 workload | `SHOP_GOODS27`, "cargo" |
| `?clock=7.5` | 5 | ticks per real second in the prototype | 7.5 is the clock before D32 | "the line (D32)" |
| `?pk=1` | 1.5 | the player's pace and action-time factor against the clock | 1 is his pace before D32's slower clock | `PROTO.PLAYER_K`, "the line (D32)" |
| `?dev=1` | off (or the Settings choice) | turns Dev mode on for this visit | Dev panel (part 1) | `dvUi.pref`, "HUD and panels" |
| `?debug=1` | off | debug tools: overlays (blocks, locks, routes, path) and a debug bar in the 3D worlds, the console object `window.rh` (`rh.help()` lists it), and instant track laying in the 3D build tool | Developer tool | `DBG.on`, `BUILD_INSTANT`, "debug" and "build tool" |
| `?scenario=<name>` | none | with `?debug=1` only: loads a debug scenario at start. Names: yard, start, hub, hubtrains, proto, protop1, d27coach, d27freight, d27evening, d27town, willow, siding, cargo, interchange | Developer tool | `debugInit`, "debug" |
| `?crowd=N` | no crowd | N test walkers in the 3D worlds | Developer tool (M0 crowd test) | "people (crowd)" |
| `?paused` | runs at 1x | opens the game paused; used by almost every check so the check steps the game itself | Testing | "start" |

Not URL parameters but kept in the browser per viewer (`localStorage`, not in the save): `railhead-dev` (Dev mode),
`railhead-cards` (first-time cards; the tests set it off), `railhead-arrows`, `railhead-nextjob`,
`railhead-trainmsgs`.

### Switches inside the code

Each world has a `parked` table (`WORLDS.<id>.parked`) listing systems switched off there. In the prototype:
overland, interchange, willow, no1, counter, money, workboard, contracts, ordering, building, telegrams, fuel,
tutorial, town (the M1 placeholder towns), cards, hubui. These are code flags, not URL parameters: bringing one back in
the prototype means editing that table. The older worlds keep them on, so `?world=start` still plays money,
contracts, telegrams, building track and the rest.

---

## 3. The layout of index.html

**Size.** 6,702,229 bytes and 30,442 lines. Of that, one generated line (line 610) holds the pixel art atlas:
4,472,751 bytes (about 4,368 KB, two thirds of the file), 54 sprite sheets as PNG data URLs and 6,417 frame keys.
The code, styles and page without the atlas are about 2.2 MB.

**Order in the file.** Lines 1 to about 416 are the page's styles and HTML (buttons, panels, the Settings and Dev
panels). Line 417 loads three.js r128 from cdnjs. The game's script runs from line 541 to line 30440, in these
labelled sections (`// ==== Section: ... ====`):

| Line | Section | What it holds |
|---|---|---|
| 544 | config | `CFG`: the numbers shared by everything (tick length, speeds, zoom, `SCHEMA_VERSION` 19, the scale `SC`). |
| 594 | pixel art data (generated) | `PIX_ATLAS`, written by `tools/pixelart/embed.py` between marker lines. Never edit by hand. |
| 613 | random numbers (seeded) | The seeded random number generator (`rngSeed`, `rngFor`). `Math.random()` is banned (check-rules). |
| 635 | track graph | Nodes, edges, switches, crossings; track building. |
| 794 | track validation | Curve radius and straight-length rules. |
| 853 | test yard layout | The M0 test yard (`?world=yard`). |
| 913 | starting world layout | Every world's map: the M1 real start, the D24 hub (`HUBW`), the prototype (`PROTO`, `PROTO_SW`, `PROTO_LEVERS`, `PROTO_DECKS`, `TOWN27`, `SHOPS27`), D32 stage 3's houses (`TN_OFF`, `TOWN27.tnLanes`), `WORLDS` with each world's `parked` and `d27` tables, the D31 switch. |
| 1617 | game state | `newState`: a new game (for the prototype also `lnBegin`, the line's first morning). |
| 1748 | routes | Route finding over the track graph. |
| 1834 | commands | `applyCommand`: every player action is a command, so a game can be replayed. |
| 2000 | trains | Train motion, coupling, blocks; the Overland (3D worlds). |
| 2379 | timetable | Services, dispatch, wood and water (3D worlds; `tt`). |
| 3319 | railroad trains (D24) | The railroad's scheduled trains (`rr`), used by the hub and the prototype; `PROTO_SCHEDULE`, `PROTO_STOCK`. |
| 4114 | cargo (items and waybills) | Every good as an item with a place; `GOODS27`, `SHOP_GOODS27`, `itemAudit`. |
| 4657 | construction jobs | Hand-building track (3D worlds; `job`). |
| 5139 | town | The M1 placeholder towns' businesses (`town`; parked in the prototype). |
| 5427 | the town (D27) | The townsfolk and their routines (`tf`, `TF_AGENTS`, the town graph). |
| 5937 | hired workers (D32) | Ticket punchers, loaders, delivery men (`hw`, `HW`, store `S.hw`), and the away rules while the player is on the line. |
| 6596 | the bigger town (D32) | D32 stage 3's people, routines and economy (`tn`, `TN`, `TN_PEOPLE`, `tnRoll`, `tnTick`, `tnShop`, `tnHome`, Look cards). |
| 7077 | rooms (D32) | Enterable buildings (`rm`, `RM`, `RM_KIND`, `RM_FURN`, `RM_HOUSE`, `rmRooms`, `rmCarve`, `rmPeople`). |
| 7493 | the line (D32) | The switches `D33` and `D34`, `LINE` (the country, regions, costs, fronts), the work train (`wt`), away (`aw`), dev mode's commands (`dv`), the clock (`clockRate`), `lnBegin`, `lnCrewNow`. |
| 8341 | the crew (D32) | The rail men, gangs, foreman, camp and head count (`cw`, `CW`, `cp`, `hc`). |
| 9091 | on the line (D32) | The player out on the line (`lp`), the join-in games' sim (`lg`, `LG`), and the block "D34: the join-in games in the world" (`LGW`, `lgW`). |
| 9903 | the far town (D32) | Prospect (`ft`, `FT`). |
| 9959 | economy | Money, market, contracts, ledger (3D worlds; `econ`). |
| 10432 | freight trains' goods (D24) | Goods on the D24 railroad's freight trains (`cg`). |
| 10628 | walk grid and path-finding | The 0.5u walk grid, A* paths, levels and deck heights (`walk`, `walkDeckY`). |
| 11136 | player | The player's walking and carrying (`carry`). |
| 11589 | passengers | Travellers in the 3D worlds (`pax`). |
| 12179 | tickets on board (D24) | Checking tickets aboard in the hub world (`px`). |
| 12500 | prototype passengers (D25) | Travellers in line at the coach door (`pp`; parked by D27's board). |
| 12931 | tickets on board (D27) | Travellers seated, the player punching in the coach (`pb`). |
| 13724 | prototype goods (D25) | The D25 shed and handcart (`pg`; parked by D27's handling). |
| 14021 | freight handling (D27) | Unloading, storage cells, the cart, delivery and pickup, the keeper (`fr`, `FR`); the D29 and D31 changes. |
| 15735 | prototype day (D25) | The day's phases, the board, the summary (`pd`, `PD`), and the block "Lessons (D27)" at its end. |
| 16180 | telegrams and alerts | Telegrams (3D worlds; `tg`). |
| 16344 | tutorial | The investor's tutorial (3D worlds; `tut`). |
| 16635 | sim tick | `simTick`: the order every system runs in, each tick. |
| 16694 | saving | `migrate`, `checkSaveShape`, IndexedDB and the quick save (part 4). |
| 17045 | models (procedural, low-poly) | The 3D models. |
| 17702 | renderer and camera | The three.js renderer and camera. |
| 17756 | world rendering | Drawing the 3D world. |
| 18555 | terrain | 3D ground. |
| 18687 | day and night | 3D light by time of day. |
| 18752 | buildings | 3D buildings, `BLD_LAYOUTS` (including `BLD_LAYOUTS.proto`, which the sim uses for footprints). |
| 20294 | people (crowd) | The 3D crowd. |
| 20872 | build tool | The 3D build tool. |
| 21504 | debug | `?debug=1` tools and scenarios. |
| 21824 | game loop state | `PAGE_WORLD`, the live state `S`, game speed. |
| 21861 | HUD and panels | Every screen element. Blocks: "Prototype (D25)" (the board, Next job line, buttons, lessons), "Dev mode (D32)", "Joining in (D32)" (the panel games) and "Joining in, in the world (D34)". |
| 26259 | input (touch first, mouse and keyboard as extras) | Taps, holds, pinch, keys. |
| 26660 | pixel renderer (D25) | The 2D renderer (`pix`, `PIX`): chunked ground, painter's order, see-through, trains, interiors; blocks "Rooms (D32)", "The far town", then "The line's view (D32)" (also the D33 join: `pixLnIn`, `pixWorldIn`, `pixBranch`, `pixStnChunk`, `pixLnAdd`; D34: `pixLnFrontsLive`, `pixLnTrainItems`). |
| 30078 | drawing each frame | `frame`: the pixel view if `pixOn()`, else three.js. |
| 30195 | main loop | The fixed-step loop. |
| 30238 | test hooks | `window.__railhead`: what the checks read and call. |
| 30371 | start | Loading the save (or a new game), then the first frame. |

**Name prefixes.** Each system's functions, tables and save store share a prefix. Most of them:

| Prefix | System | Prefix | System |
|---|---|---|---|
| `pd`, `PD` | prototype day, screens, lessons | `tn`, `TN` | the bigger town |
| `rr`, `RR` | railroad trains | `rm`, `RM` | rooms |
| `pb`, `PB` | tickets on board (D27) | `ln`, `LINE` | the line |
| `pp` | prototype passengers (D25) | `wt` | the work train |
| `fr`, `FR` | freight handling (D27) | `cw`, `CW` | the rail crew |
| `pg` | prototype goods (D25) | `cp`, `hc` | the camp, the head count |
| `tf`, `TF` | the townsfolk (D27) | `lp` | the player on the line |
| `hw`, `HW` | hired workers | `lg`, `LG` | join-in games (panel) |
| `aw` | away rules | `lgW`, `LGW` | join-in games in the world (D34) |
| `dv`, `DV` | dev mode | `ft`, `FT` | the far town |
| `pix`, `PIX` | pixel renderer | `walk` | walk grid |
| `px`, `cg` | D24 tickets, D24 freight goods | `carry`, `job`, `tt`, `econ`, `tg`, `tut`, `pax`, `town`, `overland` | the 3D worlds' systems |

Save stores follow the same names (`S.pd`, `S.pb`, `S.fr`, `S.tf`, `S.ln`, `S.cw`, `S.lp`, `S.hw`, `S.tn`, `S.dv`, ...).
Each section's head comment is its contract: the names and shapes other sections may use. The test hooks expose
most systems' internals as `__railhead.<prefix>` (for example `__railhead.tn`, `.rm`, `.ln`, `.dv`).

---

## 4. The save

- **Schema 19** (`CFG.SCHEMA_VERSION`). Unchanged since D27 (2026-11-11): every later system added an optional store
  instead of a new schema step.
- **What is stored.** The whole game state `S` as JSON: seed and random number state, tick and time, the track (with
  its world), trains, the player, items and waybills, tools, and each system's store. It is saved gzipped in
  IndexedDB (database `railhead`, store `saves`, key `auto`), with an uncompressed quick copy in `localStorage`
  (`railhead-quicksave`) written when the page is hidden or closed. On load the newer of the two wins.
- **Optional stores added since schema 19**, each missing in an older save and meaning "its defaults" when missing:
  `S.pb`, `S.fr`, `S.tf`, `S.pd.les`, `S.player.in` (D27); `S.dv`, `S.ln`, `S.cw`, `S.lp`, `S.hw` (D32); `S.tn` (D32
  stage 3; a new game gets it at its first tick, an old save at its next 05:00). Which building is open (Rooms) is view
  state and not saved. Each store has its own shape check (`pbCheckSaveShape`, `lnCheckSaveShape`,
  `tnCheckSaveShape`, ...), called by `checkSaveShape`.
- **How old saves keep loading.** `migrate()` takes a save from its version through every later step, 1 to 19 (the
  steps are kept forever). Notable steps: 13 to 14 scales everything by 1.6 (D15); 17 to 18 gives old saves the
  prototype's store switched off; 18 to 19 moves a prototype save to the next morning on the D27 layout
  (`proto18to19`). After the steps, `protoLeversRealign` moves switch stands to the levers in use (D29, no schema
  step). An old prototype save without `S.ln` gets the line from its next morning (D33): the starting crew of 5 comes
  out of the camp at 05:25.
- **Damaged saves** are kept aside (`broken-<time>` in IndexedDB, `railhead-broken-<time>` in localStorage) and a new
  game starts with no console errors.
- **Saves per world.** A save from another world is moved aside to `world-<id>` (IndexedDB) and
  `railhead-quicksave-<id>` (localStorage) when the page opens in a different world, and brought back when the page
  opens in that world again. Start over deletes only this world's saves.
- **Fixtures.** `tests/fixtures/save-v1.json` to `save-v19.json`, one sample per schema version, each with its state
  hash and, under `loads`, the hash it must load to under later versions. `check-save.js` loads every one. v17 is the
  first from the hub world, v18 from the prototype, v19 from the D27 prototype. When the format changes: bump
  `SCHEMA_VERSION`, add a step to `migrate()`, run `node tests/make-fixture.js` to add the new sample, and keep the old
  ones.

---

## 5. The art pipeline

All pixel art is made by Python code in `tools/pixelart/` (Python 3 with numpy and Pillow; both present on this
machine). Nothing is drawn by hand in an image editor.

| File or group | What it is |
|---|---|
| `build.py` | Finds every `sprites_*.py` module, calls its `register(reg)`, checks keys against `registry.OWNERS`, hardens alpha (0 or 255; part-transparent becomes a checker), packs the frames into sheets (512 px wide, wider when a sheet would pass the packed index's 4,095 limit), and writes `out/atlas.js`, `out/atlas.json`, `out/sheet-<group>.png`, `out/contact.png`. `build.py people` builds one module into `out/preview/`; `--ground` also bakes the old D25 ground. |
| `embed.py` | Writes `out/atlas.js` into `index.html` between the `PIX_ATLAS begin` and `PIX_ATLAS end` marker lines. Nothing else in the file changes. |
| `export-layout.js` | `node tools/pixelart/export-layout.js` writes the game's layout to `proto-layout.json` (version 2 with a `d27` block, version 3 with a `d32` block) for the artists' scene scripts. Re-run after any layout change. |
| `registry.py` | `OWNERS`: which key prefixes each module may register. The build refuses a key outside them or a duplicate. |
| `engine.py`, `harness.py`, `shapes.py` | The shape engine (palette ramps, depth-buffered boxes, cylinders, gables, shadows, outlines) and the one-frame renderer. |
| `check_bldparts.py` | Proof for D32's buildings in parts: draws floor, back, front and roof at their anchors and compares with the whole sprite pixel for pixel, day and night. Run after `build.py`. |
| `review_*.py` | Review sheets for each artist's batch (`review_d32.py`, `review_rooms.py`, `review_wild_far.py`, `review_wild_near.py`, ...), into `out/` or `plans/pixel/`. |
| `sprites_*.py` and their helpers | One module per area: trains, track, font, people, goods, carts, town, nature, ground tiles, navvies, the line, the camp, rooms, the wild country near and far. |

**Sheets and size.** The atlas embedded at this commit has 54 sheets and 6,417 frame keys; its block in `index.html`
is 4,472,751 bytes (4,368 KB). The index is packed (format `v: 2`: keys front-coded, numbers as base-64 digits) and
unpacks itself when the page loads. The budget, checked by `tests/check-atlas.js`, is **4,700 KB** (raised step by step:
700 at D27, 1,000 then 4,500 in D32 for the wild country, 4,700 at the D32 stage 3 join). The designer said going over
the old budget is fine for the art.

**Adding a sprite.**
1. In your own `tools/pixelart/sprites_<area>.py`, register it: `reg.add(key, group, frames, meta)`, where `frames` is
   a list of `(image, (ax, ay))` and `(ax, ay)` is the anchor pixel. Data the game needs goes in
   `meta['extra']` (it lands in `PIX_ATLAS.extra[key]`, for example a furniture piece's `box`).
2. If the key's prefix is new, add it to `registry.OWNERS` for your module.
3. `python3 tools/pixelart/build.py`, look at `out/contact.png` (every sprite at 3x with its anchor marked).
4. `python3 tools/pixelart/embed.py` to put it into `index.html`.
5. `node tests/run-one.js check-atlas` (every key the code asks for exists; the budget).
6. Commit the module, `out/` and `index.html` together.

The renderer draws a stand-in for a key that is missing, so art can land in any order. Rebuilding everything takes
about two minutes (notes, D32): the far wild country's 138 modules are cut back out of the committed sheets while
their drawing code is unchanged (`wild_far_cache.json`); redrawing them from scratch takes about 80 minutes. The
backlog warns that `embed.py` can write a stale `atlas.js` if the build printed nothing.

**Key conventions** (contracts: `plans/proto-sprites.md`, `plans/d32-rooms-art.md`; deliveries:
`plans/d32-art-buildings.md`, `plans/d32-art-rooms.md`):

- The projection is fixed: world +x moves 8 px right and 4 px down, +z 8 px left and 4 px down, +y 8 px up. Light
  from the upper left. Hard alpha, no anti-aliasing. Each frame is drawn at `(sx - ax, sy - ay)`.
- Keys are slash paths by area: `veh/` vehicles (ten headings: `e`, `e+15`, `e+30`, `e-15`, `e-30` and the same for
  `w`), `ppl/<who>/<anim>/<dir>/<frame>` people (four facings `se`, `ne`, `sw`, `nw`, all drawn, never mirrored),
  `goods/`, `tag/`, `cart27/`, `truck/`, `sw/`, `bld/` buildings, `prop/`, `nat/` nature, `tile/` ground tiles,
  `dock/` the cargo platform, `line/` and `ppl/navvy_<a|b|c>` for the line, `camp/`, `furn/` furniture,
  `wild/far/<region>/<row>/<n>`, `wild/near/...`, `wild/mark/<name>`, `wild/life/...`, `far/` the far town,
  `ui/`, `font/`.
- Night versions add `_lit` (for example `<B>/front_lit`).
- An enterable building `<B>` has parts at the same anchor as its whole sprite: `<B>/floor`, `<B>/back`,
  `<B>/front`, `<B>/roof` (and `_lit` versions). Shops' whole sprite is `<B>/body`.
- Furniture: `furn/<name>/<o>` with `<o>` the orientation (`x`, `z`, `ne`, `nw`, or a sitter's facing), and stock
  levels as `furn/<name>/<0..3>/<o>` (shelves, sacks, crates).
- Houses of D32 stage 3: `bld/cabin`, `bld/framehouse`, `bld/house2`, with `_b` for the second colour.
- A sprite drawn every frame should not share a big sheet with parts drawn only now and then (it tripled the frame
  time once: DEV_NOTES "Joined"). That is why the new houses' whole sprites are on their own sheet `d32_houses`.
- Still missing (stand-ins drawn): `ui/closed_card`, `ui/purse`, `ui/face/0..2`.

---

## 6. Testing

### Installing and running

1. `npm install`. This installs only three.js 0.128.0 (r128), from `package.json`; the checks serve it locally when
   cdnjs cannot be reached, which it cannot on the cloud test machine.
2. The checks also need **Playwright with Chromium**, which `package.json` does not list. On the machine this project
   was built on, Playwright 1.63.0 comes from a shared folder outside the project (`/opt/node-tools`, through
   `NODE_PATH`). On a new machine install it yourself: `npm install --no-save playwright` (or globally) and
   `npx playwright install chromium`. This step is not written anywhere else in the notes.
3. Run everything: `npm test` (runs `tests/run-all.js`). It must pass before every push. Exit code 1 on any failure.
4. Run one check: `node tests/run-one.js check-boot` (any check's file name). Confirmed working at this commit
   (check-boot passed).
5. Run a few, each alone: `sh tests/run-some.sh check-a check-b`.
6. Screenshots go to `test-output/`, which git ignores.

How the checks work: `tests/browser.js` serves the folder on a local address, opens `index.html` in Chromium at phone
size (390 x 844 portrait, 844 x 390 landscape, touch on) and fails on any console error. Most checks open the page
with `?paused` and step the game themselves. **Unless a check names a world, `browser.js` opens `world=start`** (the
M1 real start), so older checks keep testing what they were written for; the prototype's checks open `&world=proto` or
`&world=` (the page's default). First-time cards are off in checks unless asked for.

**How long.** The notes do not record how long a full run takes today. The last figure written down is "about 12
minutes" for 16 checks (2026-11-02); there are now 81, several of which play whole game days or a week through a bot,
so expect it to be much longer. The lead runs it in the background.

### Every check

`run-all.js` lists 82 entries: 81 run, and `check-d32-day` ("three line days end to end", the lead's) has no file
yet, so it is skipped with a note. One more file, `check-smooth.js`, exists but is **not in `run-all.js`**: run it
alone. The last full run recorded (handover) passed 80 of 81, with check-clarity failing once under load.

**The 3D worlds (M0, M1, D15 to D24).**

| Check | What it proves |
|---|---|
| check-rules | No `Math.random()` in the game. |
| check-boot | The page loads in both orientations with no errors and three.js r128; reports draw calls. |
| check-track | The track validator passes the test yard and catches a tight curve, a sharp corner and reverse curves. |
| check-trains | Trains find their way and stop on the spot; locks, dead ends, throwing a switch. |
| check-switches | Manual switches (D20): trains wait at a switch set against them; the timetable's switch list. |
| check-determinism | Two runs of 3 game days with the same commands give the same state hash. |
| check-save | Export and import, a real reload, every fixture loading to its recorded hash, damaged saves, Start over. |
| check-touch | Real touch: tap and hold to walk, tap a switch, the train panel, pinch to zoom. |
| check-paths | Path-finding round buildings and trains, out of buildings, with the handcart. |
| check-crossings | Track is walked across only at plank crossings (D15). |
| check-buildings | Station footprints, clearances, platform size, draw calls. |
| check-roof | The platform canopy turns see-through near the player. |
| check-debug | `?debug=1`: overlays, the debug bar, scenarios, warp, the same hash with debug on or off. |
| check-world | Ground and light: flat under track, hills, day and night, lamps. |
| check-people | A crowd of 200 walkers: kits, draw calls, update time. |
| check-walk | The walk animation: feet do not slide, speeds, poses. |
| check-build | The build tool: continuing track, placing switches, refusals, plan-only without debug. |
| check-m0 | The M0 acceptance criteria. |
| check-carry | Carrying by hand, hand truck and handcart; limits; saves. |
| check-feet | Feet on the platforms and the freight dock (D15). |
| check-cargo | Items and waybills through every kind of place; conservation. |
| check-interchange | The Overland and loading cars by hand at the interchange. |
| check-handbuild | Hand-building track: staking, materials, work times, cancel, saves. |
| check-handbuild-look | Hand-building drawn: stakes, sign, pieces, work poses. |
| check-fixround | The fix round's three gaps: stockpile pick-up, a switch in a station, the wrong-bay mark. |
| check-economy | Cash, orders by telegraph, contracts, the ledger. |
| check-town | The M1 placeholder towns: businesses, offers, delivery at the door. |
| check-world-start | The M1 real start: the hub, the spur and Willow Ford. |
| check-timetable | Coupling, services, dispatch, wood and water. |
| check-passengers | Travellers, tickets, boarding, the departure board. |
| check-board | Departure boards on the depots and the ticket booth. |
| check-workboard | The work board behind the counter, the schedule board, the patient line (D20). |
| check-station | The station's look: plank platforms, end steps, props. |
| check-office | The office, telegrams, alerts and Look; no overlapping page elements. |
| check-ride | Riding our own train: board, ride, step off, save. |
| check-cutaway | The cutaway into the combine while riding (D15). |
| check-tutorial | The investor's tutorial, days 1 and 2. |
| check-arrows | The helper arrows (D20). |
| check-clarity | D21's clarity changes (No. 1 on both runs, contracts at the work board, plates, the Next job line). |
| check-explain | D22: first-time cards, warnings ahead, the schedule board on posts. |
| check-m1 | The M1 acceptance criteria: a week played by `m1-bot.js`. |
| check-hubworld | The D24 hub world's layout. |
| check-rrtrains | The railroad's trains over a day (D24). |
| check-tickets | Tickets checked on board (D24). |
| check-freight | Goods on freight trains, unloading at the cargo dock (D24). |
| check-hubui | The D24 screen guidance. |
| check-hub-day | Three days in the hub played by `hub-bot.js`. |

**The prototype (D25 to D31).**

| Check | What it proves |
|---|---|
| check-protoworld | The prototype's layout, walking distances, parked systems off, the day's phases, the older worlds in 3D, the pixel renderer basics. |
| check-punch | D25 passengers: lines at the coach doors, one punch boards one traveller (with `?doorline=1`). |
| check-protogoods | D25 goods: the shed and handcart to the three shops. |
| check-pixrender | The pixel renderer: sprites, painter's order, see-through, zoom steps, picking, the view following the player smoothly. |
| check-protoui | The prototype's screens: the board, the Next job line, buttons, the summary, nothing overlapping. |
| check-prototrains | A day of trains with a scripted player: wrong switches, wave-off refusals. |
| check-proto-day | Two days played by `proto-bot.js` (D25 flows). |
| check-proto-stall | The three causes of the designer's stall stay fixed. |
| check-d27world | The D27 layout: sizes, clearances, walking distances, heights and walls, the v18 save to the next morning. |
| check-levers | The lever frame and the re-timed day. |
| check-onboard | Tickets punched on board (D27). |
| check-handling | Freight handling step by step (D27; opens `?goods27=full`). |
| check-delivery | The evening delivery and the pickups (D27). |
| check-townsfolk | The D27 townsfolk (opens `?tn=0`). |
| check-lessons | The six station lessons. |
| check-interiors | Inside a coach and a boxcar, drawn; the player centred. |
| check-pixperf | The pixel frame-time budget at 4x CPU throttling (part 7). |
| check-atlas | Every key the code asks for exists; the atlas budget (4,700 KB). |
| check-d27-day | Two D27 days end to end by the bot, audited every hour. |
| check-d31 | D31 by real taps: one tap per good, the small cart, the pace, the soft patch, `?d31=0`. |
| check-smooth (not in npm test) | D29 and D30 smoothness: the agent, camera, goods and trains never jump or stall on screen. |

**The line, the crew and the bigger town (D32 to D34).**

| Check | What it proves |
|---|---|
| check-d32world | The line's tables and country, regions and borders, the line off, saving, the clock, dev mode, the pace, away. |
| check-worktrain | The work train out and back on time; the station's trains untouched; a clear road. |
| check-linerender | The line drawn: nine places, three zooms, no world edge in view, chunks redrawn as a front passes, frame time, the D33 join. |
| check-crew | Every rail man's day, no two on one spot, the tools, the six gangs, the meal, determinism, the pace for 30 and 5 men. |
| check-camp | Tents by crew size, a cot each, the camp's day, lit at night, the head count. |
| check-lineplay | Riding out and walking the line on the parked separate screen (`?d33=0`). |
| check-linegames | The six panel games by real touches (`?d33=0&d34=0`). |
| check-linelessons | The line's lessons (`?d33=0`). |
| check-hired | A day away with hired punchers, loaders and a delivery man; nobody hired; sharing work with the player. |
| check-bigtown | The bigger town's people, houses and town graph over a week with a crew of 30; the line's pace unchanged. |
| check-rooms | 33 rooms, walls and doorways, opening and fading, townsfolk indoors all day, tents, `?rooms=0`, the far town and the last spike. |
| check-towneconomy | A week of full deliveries and of none, custom, saves, Look cards and the dev line by real taps. |
| check-d33 | One world from the first morning by real taps: the men board, the train runs out, all six kinds of work in view, the evening return. |
| check-d34 | The join-in games in the world in both orientations: real men lent, one tie, rail or spike per action, the no-mate message, a save mid-carry, the ride out drawn whole. |
| check-d32-day | Not written. Listed in `run-all.js` and skipped. |

### Bots and play tools (not checks)

| File | What it is |
|---|---|
| `tests/m1-bot.js` | A reasonable player for the M1 real start (a week), used by check-m1. |
| `tests/hub-bot.js` | A careful player for the D24 hub world, used by check-hub-day. |
| `tests/proto-bot.js` | A careful player for the prototype (D25, extended for D27), used by check-proto-day, check-d27-day and check-d31. Plays only through the commands taps send. |
| `tests/worktrain-ride.js` | Rides out on the work train in real time and records every frame. `node tests/worktrain-ride.js [portrait|landscape] [throttle]`. |
| `tests/smooth-play.js` | Plays a punch or freight sequence in real time and records every frame; used by check-smooth. |
| `tests/train-play.js` | Plays a railroad train in real time and records every frame; used by check-smooth's train part. |
| `tests/dev-eval.js` | Runs a script file inside the page: `node tests/dev-eval.js '?paused&world=' script.js` (the script body sees `R = window.__railhead`). Note the `&world=`: without it you get the M1 world. |
| `tests/switchman.js` | Makes older checks' trains find their switches set, as before D20. |
| `tests/pix-standin.js` | Stand-in scenes for the renderer, used by check-interiors and check-pixperf. |
| `tests/d31-lib.js` | Brings a default game to the first freight for check-d31. |
| `tests/make-fixture.js` | Writes the sample save for a new schema version. |

### Checks known to be sensitive to machine load

From `backlog.md`, the notes and the handover. Each has passed when run alone.

- check-clarity (a tap in landscape part 4 did not land; the most recent, in the version 13 full run).
- check-pixperf (the station at the furthest zoom; frame times vary by about 2 ms run to run).
- check-linerender ("chunks redrawn in one frame", about one run in three).
- check-smooth (also failed on the base commit; not in npm test).
- check-ride, check-timetable, check-office, check-interchange (touch steps under load).
- check-handbuild (a tap read as a hold; it retries), check-paths (fixed wait made longer), check-feet (once).
- check-linegames (a landscape tap on the Dev button; worked round in the check).

---

## 7. Speed

The default world draws no three.js frame at all (`drawing each frame` hands it to the pixel renderer), so for the
default game the measure is the pixel frame's time, not draw calls. Figures below are from the notes, measured in
headless Chromium at phone size with the CPU throttled 4 times (standing in for a mid phone), best of three windows.

| Case | Average | 98th centile | Budget (check) |
|---|---|---|---|
| Station, default zoom | 5.4 ms portrait, 6.32 landscape | | 8 / 14 ms (check-pixperf) |
| Station, furthest zoom (scale 1) | 7.35 portrait, 8.41 landscape | 8.5, 10.8 | its own 10 / 20 ms since D33 (check-pixperf) |
| Street at dusk, every townsperson out | 3.98 / 3.8 default; 5.94 / 6.38 furthest | | 8 / 14 ms (check-pixperf) |
| A building open against shut | 6.96 against 6.64 ms | | check-rooms |
| The line with the train and 30 men | 1.3 to 2.5 ms | under 6 ms | 8 ms (check-linerender) |
| Walking from the station onto the line | worst frame 10.9 / 11.1 ms | | check-pixrender, check-d33 |
| Riding out on the work train | none over 21 ms after the first frame | | check-d34 (with worktrain-ride.js) |

(The first frame or two after unpausing can take 150 to 200 ms at 4x throttling: backlog, not investigated.)

Loading: with a 5.91 MB file (D32 stage 2) the atlas was ready 1.9 to 2.8 s after load on a 4x-throttled CPU. The
file is now 6.70 MB; the load time has not been measured again.

Draw calls (the three.js worlds only; budget under 100 in a busy scene, design-doc D5): the busiest recorded is the
busy M1 hub zoomed out with 200 walkers, 83 portrait and 81 landscape (D20, 2026-11-03). check-boot at this commit
reported 38 at start and 39 to 41 with the train running. Draw calls are reported by check-boot, check-buildings,
check-people, check-world-start, check-office and most other 3D checks.

The cloud test machine has no graphics chip, so absolute frame times there say little about a phone; the budgets are
relative guards.

---

## 8. Known rough edges and limits

`backlog.md` is the full list, dated. The main ones today:

- **Not yet reviewed by the designer.** The bigger town (D32 stage 3) and D34 are built and published, but their
  provisional choices have not been reviewed; the handover says a review survey is owed. Provisional choices are in
  DEV_NOTES ("D32 stage 3", "Joined", "D34") and `plans/d32-tech.md`.
- **Progression.** Crew size and hiring exist only in Dev mode. With the starting 5 men the line takes about 98 working
  days.
- **The town (Joined).** A shut east-row shop's Closed board shows through its building; the two-room house's partition
  is drawn under people in its kitchen; small home furniture is not solid; porches are not decks (people walk them at
  ground height); wall pieces against a near wall show their fronts; visitors and rail men in town walk through people.
- **The line (D32, D33, D34).** No points are drawn at the junction; the work train at the station is not on the walk
  grid (the player can walk through it); on the creek trestle the player's walk treats the work train as one solid box
  (he can only squeeze past while carrying); tie and rail piles stay west of the creek for a while, so carries cross the
  trestle; rail men pass through the work train and the player; the sheriff is often out at the 22:00 head count; the
  day's summary takes the head count when it opens, not the 22:00 count; the station's Centre button doubles the line's
  in the bar; a station lesson card stays up out on the line; in landscape the line's bar can cover the work train.
- **Screens.** In landscape some lesson slips and the first lesson card lie over taps meant for the world or the
  corner buttons; the morning board covers Settings.
- **Speed.** The station at the furthest zoom is the tightest case (part 7). The first frames after unpausing are slow.
- **Tests.** check-d32-day is unwritten; check-smooth is outside `npm test`; several checks are load-sensitive (part 6).
- **Art pipeline.** `out/contact.png` is 11 MB and 150,000 px tall; `embed.py` can embed a stale build; the people test
  scene script reads an old atlas format.

---

## 9. Glossary

| Word | Meaning here |
|---|---|
| the designer | The project's owner, who makes every decision about what the game is and looks like (CLAUDE.md). |
| the lead | The main Claude session that plans, merges and publishes; helpers (builders, artists) work inside it. |
| D1 ... D34 | Decisions, numbered, in design-doc section 0. Code and notes refer to them by number. |
| M0, M1, M2 | The original milestones (test yard; the whistle-stop; the living town, planned). M2 was overtaken by D24 and D25. |
| parked | Switched off but kept in the code (house rule: cut things are parked, never deleted). |
| the prototype, proto world | The default world since D25 (`'proto'`), drawn in pixel art. |
| the hub | Two meanings: the hub station of the M1 real start (`?world=start`), and the D24 hub world (`?world=hub`). Neither is in the default game. |
| the real start | The M1 world: the hub and Willow Ford ten miles away (`?world=start`); the world most older checks open. |
| the agent | The player's figure, the station agent. |
| the Next job line | The single line at the top of the screen saying what to do next and where; tap it for an arrow. |
| helper arrows | The arrow (and dotted path) to the next job's place. |
| Look cards | The cards opened by tapping a thing (a person, a shop, a home, a rail man), or by the Look button then a tap. |
| first-time cards | Cards that pause the game to explain something the first time it happens (on by default, off in tests). |
| lessons | Short guided steps for each kind of work (six at the station, more on the line), with Show me and Skip. |
| the lever frame | The one frame (D29) where all four switch levers stand, off platform 1's west end. |
| the cargo platform | The raised platform beside track 3 where goods are unloaded into storage cells. |
| the platform cart | The small cart for goods, also pushed to town in the evening. |
| the keeper | A shop's keeper, who carries goods in from the cart at delivery. |
| the line | The new line being built east of the station (D32), 2,520 m long. |
| the railhead | The end of track: where the spiked front is and the work train stands. |
| the fronts | The six stages' progress along the line, in metres: cleared, bed, rock, ties, rails, spiked. |
| wu | Work units: what a stage's front costs per metre and what men's work gives. |
| the work train | The scripted train that takes the rail crew out each morning and home each evening. |
| the crew, the rail men, navvies | The simulated rail workers (5 to 30). |
| the gangs | The crew split by stage: clearers, diggers, rock gang, tie men, rail men, spikers. |
| a unit | The men a task takes (`CW.NEED`): a tie two, a rail four. |
| the foreman | The code (`cwAssign`) that shares the men among the gangs. |
| the muster | Where the men gather by the water tower before boarding. |
| the camp | The rail crew's tents west of town. |
| the head count | The 22:00 count of everyone, home or out. |
| the yard limit board | The board at x 88: east of it the player is "away" on the line. |
| away | The player out on the line; the station is then run by the relief man and any hired hands. |
| the relief man | Throws levers 10 minutes late while the player is away. |
| hired hands | Ticket punchers, cargo loaders and delivery men hired in Dev mode. |
| join-in games | The six small games the player plays to work with a gang. |
| Dev mode | A test panel (Settings or `?dev=1`) for crew size, hiring, riding out and jumps. |
| the bigger town | D32 stage 3: houses, 41 people, roles, routines, the economy. |
| rooms | Enterable buildings (D32 stage 3). |
| the far town, Prospect | The town at the end of the line (name provisional). |
| one world | D33: the line drawn in the station's own map. |
| the atlas | `PIX_ATLAS`, all the pixel art embedded in `index.html`. |
| native pixel | A pixel of the art before the whole-number scale-up to the screen. |
| chunk | A square piece of pre-drawn ground (128 or 256 native px), made ahead of the camera. |
| u | The game's unit of length, 0.7 m in the prototype (a person is 2.5u). |
| tick | One step of the simulation, 8 game seconds. |
| fixture | A sample save kept in `tests/fixtures/` to prove old saves still load. |

---

## Notes found out of date or contradicted by the code

Written down here so the next reader does not trip on them. None of these files was changed.

1. `tools/pixelart/README.md` ("Size") and `tools/pixelart/NOTES.md` ("Format") describe the atlas as `v: 1` with
   about 575 KB (README) or 255 KB (NOTES) and a 700 KB budget. The embedded atlas is packed format `v: 2`, 4,368 KB,
   budget 4,700 KB. `plans/proto-sprites.md` section 2 has the same old format and budget.
2. DEV_NOTES "How to test" says `npm install` fetches only three.js and does not mention Playwright, which is not in
   `package.json`; on this machine it comes from `/opt/node-tools`. A new machine needs it installed separately.
3. `tests/check-smooth.js` is not in `tests/run-all.js`, so `npm test` never runs it, although DEV_NOTES describes it
   among the checks without saying so.
4. `backlog.md` (2026-11-13, lead) says check-pixperf's station case at the furthest zoom sits on an 8 ms budget. Since
   D33 that case has its own budget of 10 ms average and 20 ms at the 98th centile (`FAR_AVG`, `FAR_WORST` in
   `tests/check-pixperf.js`), and the last recorded figures (7.35 and 8.41 ms) are inside it. The handover repeats the
   older warning.
5. `plans/handover.md`'s heading says "updated 2026-11-02 by the fourth lead session", but its newest part is from
   2026-11-14.
6. A code comment above `PROTO_SCHEDULE_I` says "the last leaves at 17:15, so the evening's trip to town starts about
   18:30"; the table itself has f3 leaving 17:40 and p4 18:45 (DEV_NOTES "No freight train in the evening" matches the
   table).
7. The comment on the D32 shape checks in `checkSaveShape` says a missing line store means "the line is off"; since
   D33 an old save gets the line from its next morning.
8. `tests/run-all.js` labels check-rooms "(D32, Town)"; the Rooms builder wrote it.
9. DEV_NOTES' D32 Wilds part gives `index.html` as 5.91 MB and the atlas as 3,935 KB; the "Joined" part gives the atlas
   as 4,369 KB. Today the file is 6.70 MB and the atlas 4,368 KB (consistent with "Joined").
10. `README.md` at this commit holds only a title, "# TrainGame".
11. CLAUDE.md describes the game as "3D ... made with three.js"; the default game since D25 is drawn in 2D pixel art
    (three.js is still loaded and draws the older worlds).
