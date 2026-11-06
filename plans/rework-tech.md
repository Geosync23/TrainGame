# Station rework (D24): technical plan

Spec: design-doc.md section 0, D24. This plan says how it is built, what the foundation already holds, and how four
builders share the work without stepping on each other. Choices marked **(provisional)** are for the designer.

## 1. The new world: 'hub'

Every new game is in a new world, `'hub'` (`PAGE_WORLD` defaults to it). Old saves keep their world (`'start'` or
`'yard'`) and run exactly as before. `?world=start` and `?world=yard` still open the old worlds (the checks written
before D24 use `?world=start`, set once in `tests/browser.js`).

**Map:** x -176 to 144, z -112 to 48 (320u x 160u; 100 x 50 terrain tiles of 3.2u; walk grid 640 x 320 cells of 0.5u,
204,800 cells, a quarter of the real start's). Held flat: x -110 to 100, z -110 to 14 (station, yard, town).

**Track (all on one straight line, z = 0, plus two bypass loops south of it):**

```
 west edge                                                                                  east edge
 -240 ...-176 |  ....  [0]CW -52 ==cargo track== CE[1] -12 . PW[2] -5.6 ==platform track== PE[3] 31.2 .... | 144 ... 208
                         \___ cargo bypass (z +5.46) __/          \___ platform bypass (z +5.46) ___/
                          cargo dock + shed dock -49.6..-14.4          platform -3.2..28.8
```

- **Through line** z = 0 from x -240 to 208: it runs 64u past each map edge, where the railroad's trains stand out of
  sight before coming in and after leaving. Edge 0 is its west end (s = x + 240). Speed 6.4 u/min outside the station,
  3.2 u/min (`HUBW.LIM_ST`) through the two station sections.
- **Cargo section** (switch 0 to switch 1, 40u): the cargo track is the line itself, beside the open cargo dock and the
  freight shed's dock (span x -49.6 to -14.4).
- **Platform section** (switch 2 to switch 3, 36.8u): the platform track is the line itself, beside the hub's platform
  (x -3.2 to 28.8, the real start's 32u x 9.6u platform, D16 widths kept).
- **Bypasses:** each section has a loop on the south side (5.46u off, section 6 turn-outs), so a train can pass another
  standing at the dock or the platform. Two trains at once is the most the track holds at its two stopping places.
- **Switches** (ids west to east, `HUB_SW`): 0 CW x -52, 1 CE x -12, 2 PW x -5.6, 3 PE x 31.2. Every diverging leg
  turns south, so **every stand is on the north side** (z -2.08, use spot z -3.12): the player never crosses the track.
  Switch 0 is a **spring switch lying for the cargo track** **(provisional)**: a passenger train leaving west round a
  standing freight train pushes through it, so the far west switch rarely needs a walk. A new game starts with switch 2
  set for the bypass, so the first passenger train stops short of it until the player throws it (D24: "you need to
  throw the switch").
- **Crossings:** none. The platform, the docks, the yard, the stands, the town are all north of the line.

**Walking distances** (the player on the walk grid, measured by `tests/check-hubworld.js`, which asserts the limits):

| From | To | Walked | Limit |
|---|---|---|---|
| switch 1 (CE) | switch 2 (PW), the inner throat | 4.9u | 5.5u |
| switch 2 | platform's west end | 3.4u | 4u |
| switch 3 | platform's east end | 3.4u | 4u |
| switch 1 | freight shed dock's east end | 3.6u | 4u |
| switch 0 | cargo dock's west end | 3.4u | 4u |
| switch 2 | switch 3 (along the platform) | 37.8u | 40u |
| switch 0 | switch 1 (along the cargo track) | 41.8u | 44u |

At walk 2.0 a few steps (3 to 5u) are 2 to 3 game minutes. The real start's platform switch was about 55u from the
booth. The two ends of a section cannot come closer: a train has to fit between them.

**Buildings** (`BLD_LAYOUTS.hub`): the real start's platform, depot (booth, work board), telegraph pole, the lamps on
the platform, the D19 props and the schedule board, moved 5.46u south with the track (same distances to the track, so
every use spot, the booth and the town behind the depot are as before). New or moved:
- **Freight shed** x -18.16, z -4.16, its dock flush with the cargo track, east end 3u short of switch 1's stand; 4 bays.
- **Cargo dock** (new kind `cargodock`, a plank deck at platform height, flush): x -49.6 to -22.4, 27.2u x 4.8u.
- **Cargo yard**: open ground behind the dock, x -49.6 to -22.4, z -16 to -6.24 (`HUBW.YARD`), drawn as trodden earth.
- **Water tower** x 40 and **wood stage** x 49.6, east of switch 3 by the line: scenery for the railroad's crews.
  **(provisional)** Railroad trains need no wood or water from the player: their crews see to it.
- Lamps along the dock's back; hand truck and handcart spots behind the shed (x -17 and -20, z -10).
- **Work board** and **schedule board**: as in the real start (in the booth; on posts on the platform).
- **Town**: Main Street and its lots behind the depot as in the real start (Willow Ford's store left out). **M2's town
  area** is staked out north of it (x -64 to 64, z -104 to -50, `HUBW.TOWN`, survey stakes, nothing built). **Town
  exits** (`HUBW.TOWN_EXITS`): Main Street's west and east ends and the lane north: where travellers who step off walk to,
  and where new ones come from.

**Parked** (switched off in the hub world only; the code stays and still runs in 'start' and 'yard'):
`WORLDS.hub.parked = { overland, interchange, willow, no1, counter }`, read with `worldParked(T, what)`.
- The Overland and interchange: no interchange track; `overlandTick` returns at once; the Overland and its cut keep their
  train entries (ids 1 and 2), away and empty.
- No. 1 and its Willow Ford runs: No. 1 (id 0) is kept, away and `parked`; `S.tt.services` is empty.
- Willow Ford: no track or buildings; its store's lot is left out (`parked: 'willow'`), so it offers no contracts.
- The ticket counter: `staffWindow` is refused ("tickets are checked on the train"); `paxTick` hands over to `pxTick`.
- The tutorial: done at the start of a hub game until UI rewrites it.

## 2. Railroad trains (TR)

**Data.** The railroad's trains are ordinary `S.trains` entries with `owner: 'rr'` in two fixed slots (`RR.SLOTS`, ids 3
and 4; ids stay equal to the index): empty and `away` until a run takes one. So `trainTick`, routes, D20's stopping short
of a switch set against the train, `trainObstacle`, the walk grid's stamp, the car panel and the drawing all work as for
any train. `S.rr` (schema 17) = `{ on, day, runs, next, nextStock, tk, cg }`; a run = `{ id, svc, day, kind ('pax' |
'freight'), name, from, to ('W' | 'E'), track ('platform' | 'cargo'), arr, dep (S.time), slot, ph ('due' | 'in' |
'stand' | 'out' | 'gone' | 'cxl'), tIn, tArr, tWave, tGone, cars }`. Stock ids from 1000 (ours below 100, the
Overland's from 100).

**Schedule** (`RR_SCHEDULE`, per day, **provisional**): 6 passenger, 3 freight, never more than 2 at the hub.

| Run | Kind | From > to | At its track | Leaves | Cars |
|---|---|---|---|---|---|
| p1 | passenger | west > east | 06:40 platform | 07:00 | 3 |
| f1 | freight | east > west | 08:00 cargo | 09:45 | 4 |
| p2 | passenger | east > west | 09:00 platform | 09:20 | 4 |
| p3 | passenger | west > east | 11:00 platform | 11:20 | 3 |
| f2 | freight | west > east | 12:30 cargo | 14:15 | 5 |
| p4 | passenger | east > west | 13:30 platform | 13:50 | 4 |
| p5 | passenger | west > east | 16:00 platform | 16:20 | 3 |
| f3 | freight | east > west | 17:00 cargo | 18:45 | 4 |
| p6 | passenger | east > west | 19:30 platform | 19:50 | 4 |

While a freight train stands, the passenger trains come from the east and leave west round the cargo bypass (through
switch 1 near the platform and the spring switch 0), so the throws stay at the inner throat.

**How a run goes** (`rrTick`, step 3 of the sim tick, after `overlandTick`):
1. At the day's start `rrPlanDay` makes today's runs. `rrDue` 30 game minutes before it comes in (D22's warnings).
2. **Coming in.** At `arr` minus the time from `rrEntry(end)` to its stopping place, if its track is free and a slot is
   free, the run takes a slot: cars from `RR.LOCO` + its cars (passenger: `RR.CARS.coach`; freight: `cgConsist`, then
   `cgLoad`), stock ids from `nextStock`, the front at `rrEntry` (off the map, facing in). `rrEntered`. Otherwise it
   waits off the map (it becomes late). It runs a route (`findRoute`, avoiding edges where the other train stands, so
   it takes the bypass round it) to its stopping place: a passenger train's engine at the platform's far end (its cars
   along the platform), a freight train's at the cargo span's far end. It stops short of any switch set against it
   (D20, `trainSwitchWait`, alert, Next job) until the player throws it. Arrival: `rrArrived`, `pxOnArrive` or (freight)
   nothing more; `ph 'stand'`.
3. **Standing.** Travellers step off and board (PX), goods are unloaded and loaded (CG). `rrReady` once `pxReady` /
   `cgReady` say so and a short minimum dwell (passenger 5 game minutes) has passed.
4. **Wave-off.** Command `{ t: 'rrWaveOff', tr }`: the player within 3u of the engine **(provisional)**; refused with a
   reason while goods for the hub are still aboard (`cgReady` false) **(provisional)**; allowed before `dep` (it leaves
   early: fine) and after it (late). On wave-off: `pxOnDepart` (unchecked travellers ride free) and `cgOnDepart` (goods
   for Outside sold), then the route out to the other end's `rrEntry` point past the map edge. It stops short of a wrong
   switch on the way out like on the way in. `rrWavedOff { late }`.
5. **Gone.** Past the map edge (its tail beyond `HUBW.BOUNDS` + 8u): its cars are dropped (no items may be left in them:
   CG consumes or refuses earlier), the slot is free, `rrLeft { late }`.
- **Lateness.** Arrival late = `tArr - arr`; departure late = `tWave - dep`. A late wave-off keeps the track taken, so
  the next train for that track waits off the map and comes in late too (late trains are shown on both boards).
- **Never waved off:** **(provisional)** the crew leaves by itself 60 game minutes after `dep` (fares unchecked are
  missed), so a forgotten train does not block the day. A run that cannot come in for 6 game hours is cancelled
  (`rrCancelled`), as the timetable did.
- **Events for the UI:** `rrDue`, `rrEntered`, `rrArrived`, `rrReady`, `rrWavedOff`, `rrLeft`, `rrCancelled`,
  `rrRefused`, and D20's `trainSwitchWait`.
- **Data for the UI:** `rrBoardRows(S)` (rows for the schedule board and the work board) and `rrSwitchNeeds(S)` (the
  same row shape as `ttSwitchNeeds`, so the work board, the arrows and the Next job line read it as they read D20's).
- **Models:** a small engine (`RR.LOCO`, `look: 'rr'`, 4.4 x SC = 7u with its tender) and short cars (`RR.CARS`: coach, boxcar, flatcar, 2.2 x SC = 3.5u):
  a 4-car passenger train is about 22u (fits the 32u platform), a 5-car freight train about 25u (fits the cargo span).
  Each vehicle is 2 draw calls today; measured with two such trains and 200 walkers zoomed out: 86 portrait, 88
  landscape (budget 100). Merging a train's cars into one mesh is TR's call if the count grows.

## 3. Tickets on board (PX)

- **Travellers** stay in `S.pax.list` (same fields; `to` is 'W' or 'E'; add `chk`). New ones come from the town exits
  from about 60 minutes before a passenger train's departure, walk to the platform and wait along it (not at the
  booth) for a train going their way **(provisional rates: 4 to 12 per train)**. On arrival, those aboard step off
  first (one per door per 0.1 game minute), walk to a town exit and leave (M2: they become townspeople); then the
  waiting ones board without a ticket (a coach's seats: PX's choice, about 16 for a short coach).
- **Checking** (`{ t: 'checkTickets', tr, car }`): the player walks to that car's door spot on the platform; each
  unchecked traveller aboard takes `PX.CHECK_S` (6 game seconds) and pays `PX.FARE` (40 cents, **provisional**: one
  fare to either end) through `econPost(S, cents, 'fares', 'Ticket checked on board, Hub to the east', { kind:
  'TICKET', id }, ev)`; `ticketChecked`, then `carChecked { n }`. Walking away stops it. A traveller who boards after
  the car was checked is unchecked again (the car's button shows the count).
- **Missed:** at `pxOnDepart` everyone unchecked aboard rides free: `fareMissed { n, cents }`, counted in `S.rr.tk`
  (no ledger entry: no money moved). They leave the map with the train (`paxGone`).
- `pxReady`: nobody is still stepping off, and nobody is walking up to board.
- The ticket counter stays parked; the booth and the work board inside it stay.

## 4. Cargo (CG)

- **Orders** ride freight trains: in the hub world `econOrder` books an order onto the first freight run arriving at
  least 3 game hours later **(provisional; was 6 hours for the Overland)** (`econNextVisit` branches on the world; the
  real start keeps the Overland's 06:00 and 18:00).
- **Making up a freight train:** `cgConsist(S, run)` picks the cars (boxcars, flatcars for long bundles, as
  `econPack`); `cgLoad` puts the orders due into them as items (`itemCreate` in `CAR` places, waybills as now). A
  freight train with no orders still runs (empty cars, or **(provisional)** a car of goods for Outside to sell).
- **Unloading:** the car panel works on owner 'rr' cars standing at the cargo track (`carryCarWhy` allows them); goods
  go onto the cargo dock (a flush deck: ground items drawn at deck height), into the shed's bays (on its dock), or onto
  the cargo yard; sorting and delivering to the doors are unchanged.
- **Outbound:** goods for Outside put into a freight car are sold when it is waved off (`cgOnDepart`, as
  `econSoldOutside`, `cgSold`). Empty cars just leave.
- `cgReady`: no goods for the hub left aboard (TR refuses the wave-off until then).
- **Starting contracts:** the standing coffee contract for Willow Ford is not offered in a hub game (new games only).

## 5. Saving

- **Schema 17** (done): 16 -> 17 gives an old save `S.rr` switched off and changes nothing else; `checkSaveShape`
  accepts the world 'hub' and owner 'rr' slots; `rrCheckSaveShape` checks the store. Sample `tests/fixtures/save-v17.json`
  is a hub game; every older sample records its v17 load hash (check-save).
- **Builders do not bump the schema.** New fields go inside their own part (`runs`: TR, `tk`: PX, `cg`: CG, traveller
  fields: PX) and are optional: missing means the default. If one is truly needed, the integrator adds one 17 -> 18 step.
- **Which checks are old-world:** all checks written before D24 open `?world=start` (or `?world=yard`) through
  `tests/browser.js`, so they keep testing what they tested. `check-save`'s damaged-save page names `world=start` too.

## 6. The split of work

Four builders in parallel, each on its own branch from the foundation; the stubs are in place with the agreed names,
so each can build and test alone. `rh.scenario('hubtrains')` (`rrDebugScenario`) puts a passenger train at the platform
and a freight train at the cargo track (with run entries), so PX, CG and UI do not wait for TR's moving trains.

| Builder | Owns (sections of index.html) | Provides | Calls |
|---|---|---|---|
| **TR** railroad trains | "railroad trains (D24)" (all of it); models: the small engine and short cars; world rendering for owner 'rr' (and whether the timetable's order board stays as a signal); `rrWaveOff` | `rrTick`, `rrPlanDay`, `rrRunOf`, `rrBoardRows`, `rrSwitchNeeds`, `rrWaveOffCmd`, the events | `pxOnArrive`, `pxReady`, `pxOnDepart`, `cgConsist`, `cgLoad`, `cgReady`, `cgOnDepart` |
| **PX** passengers | "tickets on board (D24)"; travellers' drawing in "people (crowd)" (`paxDraw` for new states only); `checkTickets` | `pxTick`, `pxCheckCmd`, `pxOnArrive`, `pxReady`, `pxOnDepart`, `pxCarStatus(S, stock)` (aboard, unchecked, checking) | `rrRunOf`, `econPost` |
| **CG** freight | "freight trains' goods (D24)"; narrow edits: `econNextVisit` / `econOrder`'s booking (economy), `carryCarWhy` (player, carrying), the Willow Ford starting offer (economy) | `cgConsist`, `cgLoad`, `cgReady`, `cgOnDepart`, `cgTick`, `cgCarStatus(S, stock)` | `rrRunOf`, item and economy APIs |
| **UI** | "HUD and panels" (block "Station rework" and the existing work board, schedule board rows, Next job, cards, arrows, settings), "departure boards" painting, "input" taps, "tutorial" (a hub version of `TUT_STEPS` and `tutTarget`) | the Send off button (train panel, and over the engine), Check tickets over each car door (48 px), board rows, first-time cards (`rrDue`, `rrArrived`, `trainSwitchWait`, `carChecked`, `fareMissed`, `cgUnloaded`), helper arrows, the tutorial rewrite, hiding the timetable's "train orders" card in the hub world | `rrBoardRows`, `rrSwitchNeeds`, `pxCarStatus`, `cgCarStatus`, events |

- **Shared code** (trains, routes, walk grid, items, economy core): change only what the task needs, say so in the
  handover, and keep every old-world check passing. `simTick`'s order and the command switch are already wired (no
  builder needs to touch them).
- **Order:** all four start at once. TR's moving trains land first in the merge, then PX and CG (they meet TR at the
  stub calls), then UI (it reads everyone's data). Each adds one check file (`check-rr.js`, `check-tickets.js`,
  `check-freight.js`, `check-hubui.js`) and one line in `run-all.js`.
- **The M1 bot's successor and the acceptance check for the new flow** (`tests/hub-bot.js`, `tests/check-hub.js`: a
  week where the bot throws the switches, checks tickets, unloads, sorts, delivers and waves trains off; money and item
  conservation every midnight; every train in and out; fares checked and missed reported): **the integrator**, after
  the four merge, since it needs all of them. `check-m1.js` and its bot keep running in the real start.

## 7. Provisional choices for the designer

1. Layout: everything on one straight line, the cargo section west of the platform section, each with a bypass loop
   south; switches a few steps (3 to 5u) from the platform's and dock's ends and 5u apart at the inner throat; the two
   ends of a section 38 to 42u apart.
2. Switch 0 (far west) is a spring switch lying for the cargo track.
3. A new game starts with switch 2 set against the first train.
4. Railroad trains need no wood or water from the player (their crews); the water tower and wood stage are scenery.
5. The schedule above (times, directions, car counts).
6. Train sizes: a small engine (7u) and short cars (3.5u).
7. Fare 40 cents to either end; 4 to 12 travellers per passenger train; 6 game seconds to check one ticket.
8. Wave-off within 3u of the engine; refused while goods for the hub are aboard; an unattended train leaves by
   itself 60 minutes after its time.
9. Orders ride the first freight train at least 3 game hours away.
10. No crossings: nothing the player uses is south of the line.
11. The tutorial is off in the hub world until UI's rewrite.
12. M2's town area staked out north of Main Street (x -64 to 64, z -104 to -50); travellers walk to Main Street's ends.
