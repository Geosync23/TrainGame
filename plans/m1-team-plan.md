# M1 team plan (2026-11-01)

Plan page for the designer: https://claude.ai/artifact/GbucAqeiKB7imWD2TRYZsu
Survey with the questions (answers saved in its database, collection `answers`, doc `m1-plan`): https://claude.ai/artifact/VaTAWnL2ycb8JqzZJSJyfA (source: `plans/m1-plan-survey.html`)
Status: approved by the designer (survey answers recorded as D12, 2026-11-01). Review once at the end of M1. Round A started at once because the designer said "start M1"; it only covers work the design doc already specifies.

| Round | Worker | Piece | Owned sections of index.html |
| --- | --- | --- | --- |
| A | W1 | Park the instant build behind ?debug=1; update check-build.js and check-m0.js. Merged (856e52d), npm test passed | build tool; the command-intake gate |
| A | W2 | Cargo items, waybills, item store, conservation check, item props, shed bay tags; SCHEMA_VERSION 2. Merged (808942c), npm test passed | new "cargo (items and waybills)"; item props; bay data in buildings; saving migrate |
| A | W3 | Carrying by hand, hand truck (3), handcart (6); SCHEMA_VERSION 3 after W2. Merged (0546d95), npm test passed (16 checks) | carrying parts of player; carry commands; truck and cart models; carry readout |
| A | W4 | Walk grid and A* path-finding round buildings and trains; no schema change. Merged (87ddffa), npm test passed | new "walk grid and path-finding"; movement in player; Path overlay |
| A | W5 | Integrator: merge W1, W2, W3, W4 into ccr-59cb4c1f-rnscv9, npm test, push | any, to fix merges |
| B | B1 | Hand-building track, game rules: Stake it, construction jobs, materials on site, tie/rail/spike work, track joins on completion, cancel; SCHEMA_VERSION 4. Merged, npm test passed (17 checks) | new "construction jobs"; build tool (Stake it); commands |
| B | B2 | Hand-building track, drawing: stakes and string, job sign, ties, rails and spikes appearing, hammer swing and carry poses. Merged (squashed), npm test passed (19 checks) | construction drawing in models / world rendering |
| B | B3 | Larger platform 20u x 2.4u, canopy over the middle 10u. Merged, npm test passed (16 checks) | buildings |
| B | B4 | Interchange track, the Overland setting out and picking up cars at 06:00 and 18:00, loading and unloading cars by hand; SCHEMA_VERSION 5 after B1. Merged, npm test passed | test yard layout (interchange track); trains (Overland); carrying at car doors |
| B | W5 | Integrator | any, to fix merges |
| C | | Money and telegraph, Willow Ford and timetable, placeholder town, passengers | after approval |
| D | | Panels and HUD (panel gestures to be proposed), tutorial, M1 acceptance check | after approval |

Proposed in the plan (not decided until the designer answers): hand-building pace (tie 0.5, rail pair 1, spike 1.3 game minutes; a 20u siding about 5 real minutes at 1x), one tap keeps working, 4 spikes per tie, no helpers before M3, no earthwork in M1, cancelled jobs return all materials, platform 20u x 2.4u, track crossable on foot anywhere in M1, review once per round.
