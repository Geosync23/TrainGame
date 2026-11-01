# Railhead: developer notes

Read this first every session, together with `design-doc.md` (the design) and `CLAUDE.md` (how we work).
A fresh session should also read `plans/handover.md` if it exists.

## What the project is

Railhead (working title) is an isometric, low-poly railroad game set in 1866, built for phones first.
The whole game is one file, `index.html`, using three.js r128 loaded from cdnjs.
The full design is in `design-doc.md`. The original PDF it was converted from is kept in `docs/`.

## Platform decisions (2026-11-01)

These override the original design document wherever they disagree. Details are in `design-doc.md`, section 0 (decisions D1 to D11).

- Phones first, touch first, portrait and landscape. A computer with mouse and keyboard comes second.
- One HTML file, three.js r128 from cdnjs. There is no build step, no TypeScript and no Preact.
- The camera turns in 90-degree steps. The elevation is fixed at the true isometric angle.
- Avatar game: tap to walk there; press and hold walks towards the finger (D6, D7). Walking is part of M0 piece 1.
- Piece 1 uses the final low-poly models for the character, train, track and switch stands (D8).
- Size and speed targets are scaled down for phones (see design-doc section 0).

## How to test

1. Install the test tools once: `npm install`. This only fetches a copy of three.js r128 used by the tests.
2. Run every check: `npm test`. It must pass before every push.
3. Screenshots land in `test-output/`. That folder is not saved to git.

The checks serve the project on a local web address (saving in the browser needs one) and open `index.html` in Chromium through Playwright.
They use phone size (390 x 844 portrait, 844 x 390 landscape, with touch on) and fail on any console error.
Most checks open the page with `?paused`, so the game only advances when the check steps it.

Network note: the cloud test machine cannot reach cdnjs, because its network policy blocks it.
When that happens, the test script serves the identical three.js r128 file from `node_modules/three` instead.
The page itself still points at cdnjs.

Current checks:
- `check-rules.js`: no `Math.random()` in the game.
- `check-boot.js`: the page loads in both orientations with no errors and three.js r128, and the draw calls are reported. It saves screenshots at start and in a busy moment.
- `check-track.js`: the test yard passes the track validator, and the validator catches a tight curve, a sharp corner and reverse curves with no straight between them.
- `check-trains.js`: a train sent to the siding finds the way and stops on the spot. A switch under a train is locked. Switch 3 changes the path. A dead end and a switch set against the train both stop it 0.5u short. The player throws a switch. Plus regression checks from the piece 1 review: locks freed after arrival and Stop, a braking train keeps the 0.5u gap, no instant reversal, throws only within reach, camera-side approach to the train, walks beyond the map edge end.
- `check-determinism.js`: two runs of 3 game days with the same commands give the same state hash.
- `check-save.js`: export and import, a real browser save surviving a page reload, and every sample save in `tests/fixtures/` still loading with its recorded hash. Damaged saves fall back to a fresh game with no console errors; the newer of the IndexedDB save and the quick save wins.
- `check-debug.js`: with `?debug=1` each overlay draws (screenshots `debug-*.png`), the debug bar opens by touch, the siding and spur scenarios load, 32x warp runs far faster than 1x, and the sim gives the same hash with debug on or off. Without it, `window.rh` is undefined and the draw calls are unchanged.
- `check-touch.js`: real touch events for tap to walk, hold to walk, tap a switch, tap the train (panel opens, Send to sets a route) and pinch to zoom.
- `check-buildings.js`: every station footprint keeps the section 6 clearance from every track edge (platform and dock flush at 0.9u, others 1.2u from main, 1.0u from yard), the platform top is 0.3u, the buildings are 2 meshes, draw calls stay under 100, and screenshots of the station.
- `check-world.js`: the ground is flat under the track and in the yard, hills exist, the drawn ground matches `terrainHeight`, noon brightness is kept, night is readable, and lamps glow. It saves screenshots at 05:30, 12:00, 19:30 and 23:00.
- `check-people.js`: with `?crowd=200`, all three kits, women and children are present, draw calls (shadow pass included) stay under 100, the crowd update stays under 4 ms a frame, walkers move and freeze when paused. Frame times are reported; the 50 ms limit only applies on a machine with a real graphics chip.
- `check-build.js`: the build tool with real touch events: continue the spur from its dead end, place a switch on a straight, a red "Curve too tight" preview with Lay track disabled, pinch still zooming in build mode, walking back after leaving it. Then, through the sim alone, a separate loop with a passing siding and two switches built by `buildTrack` commands passes the validator, and a train sent to the siding takes the turn-off and arrives. A switch under a train, and one with no room, are refused. Screenshots: `build-ghost-switch-portrait.png`, `build-ghost-red-portrait.png`.
- `check-cargo.js`: cargo items and waybills. One item is moved through every kind of place (ground, in hand, bay, boxcar, hand truck, handcart, stockpile, business), each move adding an event; refused moves (a full bay, a long bundle on a hand truck or in a boxcar, a taken slot, two ways of carrying at once, a full combine, bulk coal as an item, a consumed item); consumption logged with its reason; the conservation check catches 9 deliberately broken stores; bay tags by command, with a non-matching bay flagged; whole numbers only; export and import and a real browser save keep every item and the hash; the cargo scenario gives the same hash twice; a normal new game has no items. Screenshots `cargo-props-*.png` and `cargo-props-turned-*.png` (camera turned) with draw calls.
- `check-m0.js`: the M0 acceptance criteria (design-doc 22): a loop with a passing siding and two switches laid with `buildTrack` commands through the running game (not by finger; `check-build.js` covers the gestures), validated, flat ground under it, the delayed save started, and a yard move over it; track into the depot refused; the yard move takes the correct route, switch 3 changes the path, a switch under a train is locked; save, reload, same hash with the new loop; 3 game days twice give the same hash; 200 walkers of all three kits move with no errors and stay off buildings and hills; the player is stopped at a hill's foot; the day-night colours and sun heights match the section 17 keyframes and GLOW_MAT glows at night; screenshots `m0-noon-*.png` and `m0-night-*.png` in portrait and landscape.

Buildings (piece 3b): `BLD_LAYOUT` places a platform, depot (agent's office bay), telegraph shanty, water tower, freight shed with dock, and 4 lamps inside the oval beside the bottom main line (z = 14). All are merged into one KIT_MAT mesh plus one GLOW_MAT mesh. `buildingFootprints()` gives plan rectangles; `buildingLights()` gives lamp positions. No collision for the player yet: the player walks through buildings. Crowd walkers keep 0.3u clear of every footprint.

Sample saves: `tests/fixtures/save-v1.json`, `save-v2.json`. When the save format changes, bump `SCHEMA_VERSION`, add a step to `migrate()`, and run `node tests/make-fixture.js`: it adds the new version's sample and records, in each older sample, the hash it loads with after migration (`"loads": { "v2": ... }`). `check-save.js` checks a current sample against its own hash and an older one against its recorded `loads` hash for the current version, so an old save must keep migrating to exactly the same state. Keep the old samples.

## Cargo (M1 package 2)

- **Items** (section "cargo (items and waybills)", after "trains"): `S.items` holds every freight item as columns indexed by item id (`waybill`, `where`, `alive`), plus `next` and the consumption log `used`. Ids are never reused. The API comment block at the top of the section lists the functions: `itemCreate`, `itemMove`, `itemCanMove`, `itemsAt`, `itemConsume`, `itemCheckConservation`. Other code must change items only through them. Each returns `{ ok, why }` and adds an event (`itemCreated`, `itemMoved`, `itemConsumed`, or `itemRefused` with the reason).
- **Places** (`where`): `CAR {stockId}`, `BAY {buildingId, bay}`, `CARRIED {actorId, carrier: HAND | HANDTRUCK | HANDCART, slot}`, `GROUND {x, z}` in hundredths, `STOCKPILE {jobId}`, `BUSINESS {businessId}`. The player's actor id is `'player'`. Cars now have stock ids (`consist[i].id`).
- **Limits**: a bay holds 8; by hand 1, hand truck 3, handcart 6; one way of carrying per actor at a time. A boxcar has 16 slots and a combine 8 (no long bundles). A flatcar takes long bundles, crates, pallets and machinery only (12 long or 8 crates: units of 2 and 3 out of 24). Bulk goods (logs, coal, ore) are not items.
- **Conservation**: `itemCheckConservation(S)` lists problems. Every item ever created is either alive in exactly one real place or logged once as consumed. Every place is within its limits.
- **Commodities**: `COMMODITIES` is the section 21 table (37 rows, prices in whole cents, null where it is not traded).
- **Destination tags**: `CARGO_TAGS` are WILLOW (W), HUB (T), HUBWH (H), RAILHEAD (R), OUTSIDE (O) and ANY (bays only). Each has a colour (colourblind-safe Okabe-Ito colours), a letter and a shape. `itemTag(waybill)` gives an item's tag.
- **Bays**: `BLD_BAYS` in "buildings" holds the bay positions as plain numbers, one bay in front of each of the freight shed's 4 doors. `S.bayTags.freightshed` holds the tags (default Willow Ford, Hub warehouse, Outside, Any). Change a tag with the command `{ t: 'setBayTag', b: 'freightshed', bay, tag }`. A non-matching bay is allowed and the move event says `mismatch: true`.
- **Drawing**: `itemPropShapes()` in "models" makes one low-poly shape per item type. "World rendering" draws them with one InstancedMesh per shape and one more for all the tag cards. `cargoDraw` in "drawing each frame" rebuilds the bays and the ground only when an item event happens (`cargoView.dirty`), when there is a new state, or when the camera turns. Carried items follow their actor every frame, through `cargoCarriedPose`, which builder W3 may replace. Items in a car, a stockpile or a business are not drawn. Code that changes items outside a tick calls `__railhead.cargo.redraw()`.
- **Testing**: `?debug=1`, then `rh.scenario('cargo')` or `?scenario=cargo`, gives 37 items (19 in bays, 15 on the ground, 2 in the boxcar, 1 in hand). A normal game starts with none: the interchange trains that bring real freight are not built yet. Test hooks are in `__railhead.cargo`.

### Provisional choices for the lead (not in the design doc)
- The tag letters and shapes are W Willow Ford (circle), T Hub town (square), H Hub warehouse (hexagon), R Railhead (triangle), O Outside (diamond) and A Any (ring). The colours are Okabe-Ito colours.
- A long bundle is refused on a handcart as well as on a hand truck. Section 9 says it goes "by hand" only.
- Flatcar mixing uses units: a long bundle is 2 and a crate or pallet is 3, out of 24. Machinery is 9 units and is refused in bays and for carrying.
- The placeholder towns are id 0 Hub and id 1 Willow Ford (`CARGO_TOWNS`), until real towns exist.
- An item's tag comes from its waybill. Outside goes to OUTSIDE. Construction or a camp goes to RAILHEAD. A warehouse goes to HUBWH. Town 1 goes to WILLOW, and anything else to HUB.
- The three loose crates and the barrel that stood on the freight dock in M0 are removed, because real items now stand in those bays.
- The per-item event history (`history` in section 20) is not kept, to keep saves small. The move events and the consumption log are the record. There are no free lists, because ids are never reused (that keeps the conservation check simple).
- Not built yet: the warning icon for an item in a non-matching bay. It is only flagged in the move event.

## How the game works (piece 1)

- **Simulation and drawing are kept apart.** The simulation advances in ticks of 8 game seconds, 10 ticks per real second at 1x. Drawing reads the state and blends between the last two ticks.
- **Commands.** Every action is a command (`walkTo`, `walkDir`, `useSwitch`, `useTrain`, `throwSwitch`, `trainRun`, `trainStop`, `trainSendTo`), applied at the start of the next tick. Commands carry whole numbers only (positions in hundredths), so replays match exactly.
- **Track.** The track is a graph of nodes and edges. A position is `{e, s, d}`: edge, distance from node A, and facing (+1 towards B, -1 towards A). `trackWalk` follows the switches as set. `trackScan` looks ahead for the stopping point and speed limits. A train facing a switch set against it stops 0.5u before the switch's block, not at the switch point.
- **Trains.** A train stores only its front position. Each car's position is found by walking back along the track. This is exact because switches under a train are locked.
- **Routes.** A* over directed edges (length plus 20u per diverging switch), trying both directions of travel. The switches are set instantly, as M0 allows, and locked. Each lock is released once the whole train has passed.
- **Player.** The player walks in a straight line and is blocked by train bodies. A switch throw takes 0.5 game minutes at the stand. A tap on the train walks to within 1.5u of it, then opens its panel.
- **Models.** Built in code from the style test page shapes. Each vehicle or body part is merged into one mesh with vertex colours and one shared material.
- **Build tool (piece 2, M0 instant build).** The Build button (top right, or the B key) turns on build mode: one finger draws track instead of walking; pinch and two-finger pan still work. A drag that starts on a track end (brass ring) continues it; one that starts on a straight places a switch there (5u through leg, radius 10u 30-degree diverging leg, on the side the finger moves to) and carries on from the diverging leg; one that starts on open ground starts a free piece heading the first drag direction (snapped to 15 degrees). The plan follows section 6: straight within 1 degree, else arc then straight (largest radius, 15-degree straights, nearby straight track's heading first, ends snapped to 1.6u parallel offsets); an end within 0.5u of a track end joins it with a straight, arc, arc + straight, straight + arc or S-curve. The ghost is green (valid), amber (ground more than 0.3u off the bed: needs earthwork) or red with the reason in the label. Red covers: radius by class, reverse curves without the straight, closer than 1.6u to other track or crossing it, building clearance (if `buildingFootprints()` exists), off the map, a train on the track, too little straight for a switch, and anything `trackValidate` finds. On release, Lay track / Cancel appear; Lay track sends `{t:'buildTrack', ...}` (whole numbers only), which re-checks and applies or refuses with an event. If the game is paused, Lay track runs one tick so the track appears at once. Splitting an edge keeps its id (it is shortened) and appends the rest.
- **Test hooks.** `window.__railhead` gives access to the state, `step(n)`, `send(cmd)`, `newState`, `simRun`, `stateHash`, `exportSave`/`importSave` and `toScreen`.

## Debug tools (`?debug=1`)

- Off unless the address has `?debug=1`: no extra page elements, meshes or work per frame.
- A DBG button (bottom right, above Centre) opens a bar: overlay toggles (Blocks, Locks, Routes, Path) and 8x, 16x, 32x, 1x speeds. The train panel covers the bar when open.
- Overlays: blocks coloured per block (occupied red, reserved by a route orange); switch markers (green free, orange locked by a route, red occupied) with a stub along the set leg; each train's remaining route (cyan); the player's target and path (pink). One merged mesh each (one draw call each), drawn on top without depth test, rebuilt only when what they show changes (checked every 3 frames).
- Console `window.rh`: `send(cmd)`, `state`, `hash()`, `step(n)`, `setTime(seconds since 05:00 on day 1)`, `warp(0..32)`, `teleport(x, z)`, `scenario('yard' | 'siding' | 'spur')`, `overlay(name, on)`, `drawCalls`, `help()`.
- `?scenario=<name>` (with `?debug=1`) starts from a named scenario. Saving is switched off for the rest of that page visit (`savingOff`, which also stops the quick save), so a scenario never overwrites the player's save.
- Warp above 4x runs up to 640 ticks of backlog, time-boxed to about 8 ms per frame; the rest carries over. It only runs more ticks, so results stay the same.

## Sections of index.html

config, random numbers (seeded), track graph, track validation, test yard layout, game state, routes, commands, trains, cargo (items and waybills), player, sim tick, saving, models (procedural, low-poly), renderer and camera, world rendering, terrain, day and night, buildings, people (crowd), build tool, debug, game loop state, HUD and panels, input (touch first, mouse and keyboard as extras), drawing each frame, main loop, test hooks, start.

## Draw calls

`__railhead.drawCalls` (and `rh.drawCalls`) counts a whole frame: the shadow pass plus the main pass. three.js clears its own counter after the shadow pass, so the page sets `renderer.info.autoReset = false` and calls `renderer.info.reset()` once per frame just before drawing. Earlier figures in these notes (14, 16 to 18) counted the main pass only and were too low. The phone budget is under 100 in a busy scene.

- Test yard with terrain, buildings and the train, no crowd: 30 to 33 (portrait and landscape).
- With 200 walkers (`?crowd=200`): 61 to 63 (full station scene, noon or night, portrait or landscape). The crowd is 15 instanced meshes (3 kits x 5 body parts), 30 draw calls with the shadow pass, whatever the number of walkers.
- Cargo: one InstancedMesh per item shape in use (up to 7, each with a shadow, so 2 calls) plus 1 for all the tags. The cargo scenario (35 items drawn: 19 in bays, 15 on the ground, 1 in hand, 7 shapes) has 44 draw calls, against 29 without items (portrait and landscape). That does not grow with the number of items.
- Debug overlays add 1 each (main pass only). Build mode adds 2 (the ghost and the track-end rings).
- Crowd triangles: about 570 per person per pass (hidden variant shapes such as hats and skirts are folded away in the shader but still sent), about 115,000 per pass for 200 walkers.

## Technical choices to know about

- **Crowd speed is checked by update time, not frame rate:** the test machine draws in software (SwiftShader, no graphics chip), so its frame times say nothing about a phone. `check-people.js` limits the crowd's own update to 4 ms a frame and applies the 50 ms frame limit only on a real graphics chip.
- **Hills and walking:** the player, trains and the tap-to-walk ground plane are at height 0. The sim keeps the player on flat ground with `terrainFlatAt(track, x, z)` (pure math, no three.js; it works out the heights for the given track if needed). Walking onto a hill is blocked like walking into a train. Crowd walkers never target or cross hills or buildings.
- **Crowd:** `?crowd=N` or `__railhead.setCrowd(n)` (default 0). Walkers are render-side only, with their own seeded random numbers, not in the save. One shader colours each person (skin, hair, top, lower, hat, vest packed per instance) and hides the shapes they lack (bit mask). Women: chunky or lanky with a skirt and a bonnet or bun; children: chunky at 0.7.

- **Shadow map:** 1024 pixels, not the design doc's 2048, to save phone memory and time.
- **Test yard geometry:** the switch's 30-degree diverging leg plus the 8u yard minimum radius and the 2u straight between reverse curves give a siding about 3.4u from the main line, wider than the 1.6u minimum.
- **Speeds:** the main loop is 4.0 u/min, diverging legs 1.5 u/min, and the siding and spur 1.0 u/min (yard speed).
- **Tender load:** the tender carries cordwood, not coal, because engines start on wood (section 2).
- **Switch points:** the point rails do not animate yet. The target disc shows the setting.
- **Send to:** a moving train only takes a route in the direction it is already going; otherwise "Stop the train first." Routes are compared by estimated time (tender-first runs at 60%).
- **Changing direction:** Forward or Back the other way while moving sets mode `turn`: the train brakes to a stop, then runs the new way. A braking train (modes `stop`, `turn`) still looks ahead and stops 0.5u short of a switch set against it or a dead end.
- **Route locks:** freed on arrival, Stop or a new command. A switch under a train stays locked because it is occupied (`occupiedSwitches`), not by the route.
- **Saving:** IndexedDB (gzip) a couple of seconds after a world-changing action and every 10 game minutes; on page hide or close also an uncompressed quick save in localStorage (`railhead-quicksave`). On start the save with the higher tick wins. A damaged save is kept as `broken-<time>` (IndexedDB) or `railhead-broken-<time>` (localStorage) and the game starts fresh with a console warning.
- **Terrain (piece 3a):** 64 x 64 tiles of 2u, 2 x 2 chunks of 32 x 32 tiles, one shared vertex-colour material (up to 4 draw calls), plus a flat skirt beyond the map edge. Hills come from seeded value noise (up to about 5.5u). The ground is held at height 0 within 7u of every track corner sample and over x -25..25, z -20..24, and fades to flat at the map edge. The heights are worked out again from the current track each time `buildTerrain` runs. `terrainHeight(x, z)` uses the same triangles as the mesh. The terrain receives shadows but does not cast them.
- **Day and night (piece 3a):** `daylightAt(time)` gives the light for a game time (no three.js); `applyDaylight` applies it. Colours and sun elevations follow design-doc 17. The intensities are tuned rather than copied from the doc (provisional, for the designer's review): noon stays at the approved sun 0.8 and sky 0.5, while dawn, dusk and night are lifted so the scene stays readable on a phone. Sunrise and sunset: spring and autumn 06:00 to 19:00, summer 05:00 to 21:00, winter 07:00 to 17:00. Because the game starts at 05:00, the first minutes are in dawn twilight. `GLOW_MAT` glows from just before sunset until just after sunrise.

## Team mode (from 2026-11-01)

The designer asked for a team: the lead session hands out work to up to 6 workers, and an integrator merges it.
The designer chose to review once, when all of M0 is done, instead of after every piece. The plans are recorded in `plans/m0-team-plan.md`.
Each builder owns one section of `index.html` (terrain, day and night, buildings, people (crowd), build tool, debug) and works on its own branch.
Each builder adds its own check file in `tests/` and one line to `tests/run-all.js`.
The integrator merges the branches into `ccr-59cb4c1f-rnscv9`, runs `npm test`, and fixes anything broken.

## Next

Start from `plans/handover.md`. M0 is built and reviewed (D11). The newest decision is D10: track is built by hand, spike by spike, in M1, and the instant build is parked behind ?debug=1. Next job: the M1 plan, for review before building.
