# Handover (written 2026-11-01 by the first lead session)

Read this, then CLAUDE.md, DEV_NOTES.md and design-doc.md section 0 (decisions D1 to D10).

## Where things stand
- All of M0 is built and merged on `ccr-59cb4c1f-rnscv9`; all 13 checks pass (`npm install` once, then `npm test`, about 12 minutes).
- Playable build: https://claude.ai/artifact/EHNWb1dZKQJA5HYT11k7Rc (how to republish: strip doctype, html, head, body tags and the viewport meta from index.html, keep the title "Railhead Piece 1", publish to the same URL).
- End-of-M0 review page, answers saved by the designer: https://claude.ai/artifact/2BKv74G9z2oFJSfWRchyU9. Read the answers with ArtifactData (collection `review`, document `answers`). At handover time the designer had not saved answers yet. Ask them, record the answers in design-doc section 0, and turn the provisional items (D9 build gestures, night brightness, 05:00 start, zoom-out, crowd on/off, buildings) into decisions.

## The designer's newest decision (D10)
Laying track instantly must never be the real mechanic. Planning is fine, but a main mechanic is watching the line get built spike by spike. Chosen: this goes into M1.
- The build tool only plans. A confirmed plan becomes a construction job shown with stakes and string.
- Building is physical: ties carried and set one at a time, rails dropped on them, spikes driven one by one with a hammer swing. The player does it first; crews come later (M3/M4).
- Materials (tie bundles, rail bundles, spike kegs) are real items delivered by the interchange trains, like other freight.
- The M0 instant build is CUT, parked not deleted: keep its code, but make it work only with ?debug=1. Taking it out is its own reviewed step.

## Next job
Write the M1 plan for the designer's review (CLAUDE.md: plan before building, and leave room on the page for their answers).
- M1 is design-doc section 22 "M1. The whistle-stop", plus D10 hand-building.
- Propose answers to the open question "How hand-building feels".
- Ask again how they want to review M1: piece by piece, or once at the end (they chose "once at the end" for M0 only).
- Do not build until the plan is approved.

## Team mode
The designer allowed a team of up to 6 workers and handing over to new lead sessions. How it worked for M0 is in DEV_NOTES "Team mode":
- one owned section of index.html per builder, each on its own worktree branch;
- one integrator merging, running `npm test`, and pushing.

Watch out: worktrees can start from the empty first commit. Every builder must first move its branch to the current `ccr-59cb4c1f-rnscv9` head. The M0 builders did this themselves.

## Gotchas
- The cloud test machine draws without a graphics chip (up to about 0.7 s a frame). Frame times there say nothing about phones; checks must not depend on frame timing.
- cdnjs is blocked on the test machine; tests serve the identical three.js r128 from node_modules.
- Draw calls are counted over both passes (shadows included): about 31 busy, 62 with 200 walkers. Budget under 100.
- Known gaps: the player walks through buildings and cannot walk round a long train (path-finding is M1 work); crossover and ladder presets not built.
