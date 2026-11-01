# Railhead: developer notes

Read this first every session, together with `design-doc.md` (the design) and `CLAUDE.md` (how we work).
A fresh session should also read `plans/handover.md` if it exists.

## What the project is

Railhead (working title) is an isometric, low-poly railroad game set in 1866, built for phones first.
The whole game is one file, `index.html`, using three.js r128 loaded from cdnjs.
The full design is in `design-doc.md`. The original PDF it was converted from is kept in `docs/`.

## Platform decisions (2026-11-01)

These override the original design document wherever they disagree. Details are in `design-doc.md`, section 0 (decisions D1 to D8).

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
- `check-trains.js`: a train sent to the siding finds the way and stops on the spot. A switch under a train is locked. Switch 3 changes the path. A dead end and a switch set against the train both stop it 0.5u short. The player throws a switch.
- `check-determinism.js`: two runs of 3 game days with the same commands give the same state hash.
- `check-save.js`: export and import, a real browser save surviving a page reload, and every sample save in `tests/fixtures/` still loading with its recorded hash.
- `check-touch.js`: real touch events for tap to walk, hold to walk, tap a switch, tap the train (panel opens, Send to sets a route) and pinch to zoom.
- `check-world.js`: the ground is flat under the track and in the yard, hills exist, the drawn ground matches `terrainHeight`, noon brightness is kept, night is readable, and lamps glow. It saves screenshots at 05:30, 12:00, 19:30 and 23:00.

Sample saves: `tests/fixtures/save-v1.json`. When the save format changes, bump `SCHEMA_VERSION`, add a step to `migrate()`, and run `node tests/make-fixture.js` to add the new version's sample. Keep the old samples.

## How the game works (piece 1)

- **Simulation and drawing are kept apart.** The simulation advances in ticks of 8 game seconds, 10 ticks per real second at 1x. Drawing reads the state and blends between the last two ticks.
- **Commands.** Every action is a command (`walkTo`, `walkDir`, `useSwitch`, `useTrain`, `throwSwitch`, `trainRun`, `trainStop`, `trainSendTo`), applied at the start of the next tick. Commands carry whole numbers only (positions in hundredths), so replays match exactly.
- **Track.** The track is a graph of nodes and edges. A position is `{e, s, d}`: edge, distance from node A, and facing (+1 towards B, -1 towards A). `trackWalk` follows the switches as set. `trackScan` looks ahead for the stopping point and speed limits. A train facing a switch set against it stops 0.5u before the switch's block, not at the switch point.
- **Trains.** A train stores only its front position. Each car's position is found by walking back along the track. This is exact because switches under a train are locked.
- **Routes.** A* over directed edges (length plus 20u per diverging switch), trying both directions of travel. The switches are set instantly, as M0 allows, and locked. Each lock is released once the whole train has passed.
- **Player.** The player walks in a straight line and is blocked by train bodies. A switch throw takes 0.5 game minutes at the stand. A tap on the train walks to within 1.5u of it, then opens its panel.
- **Models.** Built in code from the style test page shapes. Each vehicle or body part is merged into one mesh with vertex colours and one shared material.
- **Test hooks.** `window.__railhead` gives access to the state, `step(n)`, `send(cmd)`, `newState`, `simRun`, `stateHash`, `exportSave`/`importSave` and `toScreen`.

## Sections of index.html

config, random numbers (seeded), track graph, track validation, test yard layout, game state, routes, commands, trains, player, sim tick, saving, models (procedural, low-poly), renderer and camera, world rendering, game loop state, HUD and panels, input (touch first, mouse and keyboard as extras), drawing each frame, main loop, test hooks, start.

## Draw calls

- Piece 1 test yard: 14 at start, 13 to 14 with the train running (shadow pass included). The phone budget is under 100.
- With terrain chunks (piece 3a): 15 to 17 in the test yard, 16 at every time of day.

## Technical choices to know about

- **Shadow map:** 1024 pixels, not the design doc's 2048, to save phone memory and time.
- **Test yard geometry:** the switch's 30-degree diverging leg plus the 8u yard minimum radius and the 2u straight between reverse curves give a siding about 3.4u from the main line, wider than the 1.6u minimum.
- **Speeds:** the main loop is 4.0 u/min, diverging legs 1.5 u/min, and the siding and spur 1.0 u/min (yard speed).
- **Tender load:** the tender carries cordwood, not coal, because engines start on wood (section 2).
- **Switch points:** the point rails do not animate yet. The target disc shows the setting.
- **Send to:** a moving train must be stopped first.
- **Terrain (piece 3a):** 64 x 64 tiles of 2u, 2 x 2 chunks of 32 x 32 tiles, one shared vertex-colour material (up to 4 draw calls), plus a flat skirt beyond the map edge. Hills come from seeded value noise (up to about 5.5u). The ground is held at height 0 within 7u of every track corner sample and over x -25..25, z -20..24, and fades to flat at the map edge. The heights are worked out again from the current track each time `buildTerrain` runs. `terrainHeight(x, z)` uses the same triangles as the mesh. The terrain receives shadows but does not cast them.
- **Day and night (piece 3a):** `daylightAt(time)` gives the light for a game time (no three.js); `applyDaylight` applies it. Colours and sun elevations follow design-doc 17. The intensities are tuned rather than copied from the doc (provisional, for the designer's review): noon stays at the approved sun 0.8 and sky 0.5, while dawn, dusk and night are lifted so the scene stays readable on a phone. Sunrise and sunset: spring and autumn 06:00 to 19:00, summer 05:00 to 21:00, winter 07:00 to 17:00. Because the game starts at 05:00, the first minutes are in dawn twilight. `GLOW_MAT` glows from just before sunset until just after sunrise.

## Team mode (from 2026-11-01)

The designer asked for a team: the lead session hands out work to up to 6 workers, and an integrator merges it.
The designer chose to review once, when all of M0 is done, instead of after every piece. The plans are recorded in `plans/m0-team-plan.md`.
Each builder owns one section of `index.html` (terrain, day and night, buildings, people (crowd), build tool, debug) and works on its own branch.
Each builder adds its own check file in `tests/` and one line to `tests/run-all.js`.
The integrator merges the branches into `ccr-59cb4c1f-rnscv9`, runs `npm test`, and fixes anything broken.

## Next

Pieces 2 to 5 of M0 are being built by the team. Then integration, the M0 acceptance check, and the designer's review.
