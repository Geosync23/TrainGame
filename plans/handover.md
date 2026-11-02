# Handover (updated 2026-11-02 by the fourth lead session)

## Start here: the fix-round plan is published, waiting for the designer
The M1 fix-round plan and survey are published: https://claude.ai/artifact/8ReXohbMSFEDaa1eaog927 (source `plans/m1-fix-plan.html`). Answers save in its database: collection `answers`, document `m1-fix` (keys `q.<id>`, each `{choice, note}`; ids scale, map, times, zoom, roof, clip, cutaway, inside, crossings, side, board, gaps, review, else). Read them with the ArtifactData tool. NEXT: when answered, record them as D15 in design-doc section 0, write the build order into the plan, then build (helpers inside the session). Do not build before the designer agrees.

What the investigation found (so you need not redo it): a unit is about one person (1.75 m); engine and tender 5.2u, cars 2.6 to 2.8u (about half real size next to a person); hub platform 20 x 2.4u; map 336 x 128u (`WORLDS.start`, `HUB`, `WFORD`, `buildStartWorld` in "starting world layout"); camera `cam.zoom` 1.25 at start with `CFG.VIEW_MIN_U` 14 (about 11u across an upright phone), zoom 0.6 to 4; track geometry `CFG.GEOM`, switch legs radius 10 and 8 giving the 3.41u spacing (`TURN_OFF`); speeds `CFG.LIM`, `CFG.WALK`; miles are 16u (`CORD_U`, `WATER_U` and fares depend on it); vehicle lengths at index.html "game state" (around line 751) and `OVERLAND_LOCO`/`OVERLAND_CARS`; building sizes `BLD_EXTENTS`, `BLD_LAYOUT`, `BLD_PLATFORM_TOP` 0.3; walk grid 0.5u cells. Uniform scaling of everything (people too) is the same as zooming in, so the suggested answer grows the world 1.6x around the people. Feet sink because the player is drawn at y 0 (`pl.position.set(px, 0, pz)` in "drawing each frame"); passengers already use a platform height lookup (people section, around line 7324). Saves: schema 13; the plan promises conversion (schema 14 scales stored positions), keeping an unconvertible save and starting fresh with a note.

## Earlier (third lead session): the end-of-M1 review is answered (D14)
The designer answered the review (https://claude.ai/artifact/CKNAh874bKoJ1EZWAX9zEB; raw answers in its database, collection `answers`, document `m1-review`, readable with the ArtifactData tool). Recorded as D14 in design-doc section 0. In short: M1 is "not yet" right; they retest after a fix round. Playtest gate: later, not now. Next after the fix round: plan M2.

The designer's own words (notes on the page), kept here because they matter for the plan:
- "the platform is way too small. the entire scale of the game is too small. The roof on the platform also prevents it from being easy to read."
- Map size: "needs to be larger ... scale it all up."
- "I want to be able to see into the train cars when we enter them. a cutaway view. the trains should also be larger the whole game needs to be scaled up"
- Walking across track: change, "we need to get the core loop going and this is needed" (read as: build crossings and make track impassable elsewhere, design-doc 11).
- Departure board: "make it both" (the card and a board in the world).
- "please also remove platform clipping and scale as talked about above then i will retest" (read as the backlog item: feet sink into the platform and dock; confirm in the plan survey).
Everything else on the page was Keep; hand-building stays at about 3 real minutes.

## YOUR JOB: the fix-round plan (plan before building)
Write a short plan for the M1 fix round and publish it with a survey (house rule: a choice per question, your suggestion marked, a note box, answers saved in the page's database; copy the pattern of plans/m1-review.html). Do not build until the designer agrees. Questions the plan must settle with the designer:
1. How much bigger: one scale factor for people, trains, buildings and platform together, or separate ones; and how much larger the map (and so the 10-mile spur). Investigate first how sizes are set in index.html (units, walk grid cell size, camera zoom range D3 0.6x to 4x, track geometry, switch radius, 3.41u track spacing, speeds and timetable times, which all depend on distances). Scaling touches saves: old saves must still load (CLAUDE.md), so propose how (convert, or start fresh with a note).
2. The platform roof: hide it when the player is under it or near it, make it see-through, or remove it.
3. Cutaway into cars: when the player boards, hide the car's roof (and near wall?) and show the player and travellers inside.
4. Crossings: where (platform ends, grade crossings at roads), and whether the player can still throw switches from beside the track.
5. Confirm "platform clipping" means the feet sinking into the platform.
6. The departure board in the world: where it stands.
Then build in pieces (one piece at a time, review each, or as the designer chooses), with helpers inside this session (house rule). Mind draw calls (busy scene now 73 with the tutorial marker; budget 100).

## Older notes (from the second lead session, still useful)

Read this, then CLAUDE.md (house rules at the end of "My rules" and "Memory and handover": questions always as an interactive survey with answers saved on the page; workers stay inside the lead session; the lead hands over on its own by starting the new lead session), DEV_NOTES.md, design-doc.md section 0 (D1 to D12) and plans/m1-team-plan.md.

## Where things stand
- All of M1 rounds A to C and most of round D are merged and pushed on `ccr-59cb4c1f-rnscv9`; 27 checks pass (schema 13). Round D so far: D3 acceptance check with a bot playing a week, D4 fixes from the test week, D2 tutorial (investor E. Hartwell), D6 cordwood on the handcart + fares on arrival at Willow Ford + 8 starting cords, D5 riding your own train. Decisions D12 (M1 plan) and D13 (round D answers) are in design-doc section 0.
- ALL OF M1 IS MERGED AND PUSHED (2026-11-02): D1 office, telegram inbox, alerts and Look; D7 platform dwell. 28 checks pass, schema 13. Nothing is running. Latest bot week (check-m1, seed 1866): all 14 runs on time (worst 0 min late), 173 tickets at the hub, 36 fares on arrival, gave up 174 hub and 109 Willow Ford, cash $2,500.52, 82 of 82 items arrived, all contracts done. Watch: the pressure check (Overland and No. 1 within 10 minutes) now passes at exactly 10 minutes; a timing change could tip it.
- DONE 2026-11-02 (third lead session): the playable link is republished with the end-of-M1 build, and the end-of-M1 review page is published at https://claude.ai/artifact/CKNAh874bKoJ1EZWAX9zEB (answers in its database, document `answers/m1-review`; read them with ArtifactData). 28 checks pass. NEXT: read the designer's answers, record them as D14 in design-doc section 0 (move any answered open questions), then act on their choice for the playtest and the next step.
- (Earlier plan, now done:) Do (a) republish the playable link (see Gotchas: one fresh helper reads the whole page file and publishes), and (b) the END-OF-M1 REVIEW for the designer (they chose one review at the end): a published page with screenshots, what was built, every provisional choice from DEV_NOTES (search "provisional"), the M1 acceptance results from check-m1 (the bot's week figures), the known gaps and backlog, and survey questions with answer boxes saved to the page database (house rule). The design-doc M1 gate (5 outside playtesters) is the designer's to run.
- The designer reviews M1 ONCE AT THE END. Report progress in short plain messages.
- Pages: M1 plan https://claude.ai/artifact/GbucAqeiKB7imWD2TRYZsu; M1 survey (D12) https://claude.ai/artifact/VaTAWnL2ycb8JqzZJSJyfA; round D survey (D13) https://claude.ai/artifact/AJG1v9NjZkQxbhmc81ZJQn; playable link https://claude.ai/artifact/HhqBH3hg3z1LwSS6MzxE8s.

## How merging works now
- Builders work in worktrees under `.claude/worktrees/`, each on branch `worktree-agent-<id>`. They do not push.
- The lead (or an integrator helper) merges into `ccr-59cb4c1f-rnscv9` with `git merge --no-ff`, runs `npm test` in the background (16+ checks, about 12 minutes), and pushes only when all pass.
- Gotcha: a worktree builder once committed its `node_modules` link; merged, it replaced the real folder with a link to itself (ELOOP errors, test runner exits at once). `.gitignore` now ignores `node_modules` as a link too. If it happens again: `git rm --cached node_modules; rm node_modules; npm install`.
- `node tests/run-one.js check-<name>` runs a single check.

## Gotchas (still true)
- The cloud test machine draws without a graphics chip; frame times there mean nothing for phones.
- cdnjs is blocked on the test machine; tests serve three.js r128 from node_modules.
- Draw calls: busy scenes 44 to 63 (budget under 100).
- Playable link of M1 so far (D13): https://claude.ai/artifact/HhqBH3hg3z1LwSS6MzxE8s (published 2026-11-02 from the team branch after round D3/D4; title "Railhead Piece 1"). The old M0 link https://claude.ai/artifact/EHNWb1dZKQJA5HYT11k7Rc still shows the end-of-M0 build. index.html is now about 537KB: a helper must read the whole page file before publishing, which fills most of one helper's memory, so republishing to the same URL needs one helper per publish with nothing else to read.
- GitHub says the repository moved to https://github.com/Geosync23/TrainGame.git; pushes to the old address still work.
