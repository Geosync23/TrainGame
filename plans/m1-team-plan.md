# M1 team plan (2026-11-01)

Plan page for the designer (with the answers table): https://claude.ai/artifact/GbucAqeiKB7imWD2TRYZsu
Status: waiting for the designer's answers. Round A started at once because the designer said "start M1"; it only covers work the design doc already specifies.

| Round | Worker | Piece | Owned sections of index.html |
| --- | --- | --- | --- |
| A | W1 | Park the instant build behind ?debug=1; update check-build.js and check-m0.js | build tool; the command-intake gate |
| A | W2 | Cargo items, waybills, item store, conservation check, item props, shed bay tags; SCHEMA_VERSION 2 | new "cargo (items and waybills)"; item props; bay data in buildings; saving migrate |
| A | W3 | Carrying by hand, hand truck (3), handcart (6); SCHEMA_VERSION 3 after W2 | carrying parts of player; carry commands; truck and cart models; carry readout |
| A | W4 | Walk grid and A* path-finding round buildings and trains; no schema change | new "walk grid and path-finding"; movement in player; Path overlay |
| A | W5 | Integrator: merge W1, W2, W3, W4 into ccr-59cb4c1f-rnscv9, npm test, push | any, to fix merges |
| B | | Hand-building track (D10), larger platform (D11), interchange and car loading | after approval |
| C | | Money and telegraph, Willow Ford and timetable, placeholder town, passengers | after approval |
| D | | Panels and HUD (panel gestures to be proposed), tutorial, M1 acceptance check | after approval |

Proposed in the plan (not decided until the designer answers): hand-building pace (tie 0.5, rail pair 1, spike 1.3 game minutes; a 20u siding about 5 real minutes at 1x), one tap keeps working, 4 spikes per tie, no helpers before M3, no earthwork in M1, cancelled jobs return all materials, platform 20u x 2.4u, track crossable on foot anywhere in M1, review once per round.
