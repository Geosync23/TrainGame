# M0 team plan (2026-11-01)

The designer approved building all of M0 before one review at the end. Up to 6 workers at a time.

| Piece | Owner section(s) in index.html | Summary |
| --- | --- | --- |
| 1 fixes | any, small | Bugs found by the reviewer and the play-tester |
| 2 Build tool | build tool, input (build mode only), commands (new build commands) | Lay straight and curved track and switches by finger; green, amber or red preview; instant build in M0 |
| 3a Terrain, day and night | terrain, day and night | 64 x 64 heightmap with gentle hills kept clear of the track; day and night keyframes; GLOW_MAT glows at night |
| 3b Buildings | buildings | Depot, freight shed, water tower, platform, shanty from the building kit; windows and lamps use GLOW_MAT |
| 4 People | people (crowd) | Lanky and stocky kits, instanced crowd; 200 walkers smooth on a phone |
| 5 Debug | debug | ?debug=1 overlays for blocks, reservations and routes; window.rh console; time warp to 32x; M0 acceptance check |

Rules for every builder: stay in your sections; no Math.random (use rngSeed/rngNext); keep the sim free of three.js and the DOM; no surfaces exactly on top of each other; touch first with 48 px buttons; if you add a field to the saved state, bump SCHEMA_VERSION, add a migrate step and a new sample save while keeping the old one loading; add a check file; `npm test` must pass on your branch.

Decisions the designer has not seen yet are recorded as "provisional" in design-doc section 0 for the end-of-M0 review.
