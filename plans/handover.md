# Handover (updated 2026-11-01 by the second lead session)

Read this, then CLAUDE.md (note the two new house rules at the end of "My rules": questions always as an interactive survey with answers saved on the page; workers stay inside the lead session), DEV_NOTES.md, design-doc.md section 0 (D1 to D12) and plans/m1-team-plan.md.

## Where things stand
- M1 round A is merged and pushed on `ccr-59cb4c1f-rnscv9`, 16 checks pass: instant build parked behind ?debug=1 (gate at `send()`), cargo items and waybills (SCHEMA 2), carrying with hand truck and handcart (SCHEMA 3), walk grid and A* path-finding (handcart paths avoid platform and dock).
- The designer approved the M1 plan through the survey (D12): all suggestions taken; M1 is reviewed ONCE AT THE END of M1 (do not stop for reviews between rounds; still report progress in short plain messages).
- Plan page: https://claude.ai/artifact/GbucAqeiKB7imWD2TRYZsu. Survey: https://claude.ai/artifact/VaTAWnL2ycb8JqzZJSJyfA (answers in its database: collection `answers`, doc `m1-plan`; source `plans/m1-plan-survey.html`).
- Round B is merged and pushed, 19 checks pass: hand-building rules (construction jobs, Stake it, SCHEMA 4), hand-building drawing (stakes, sign with Cancel job, ties/rails/spikes, maul swings), larger platform 20u x 2.4u (depot and shanty moved 1u back, water tower to x 14.6), interchange track and the Overland at 06:00 and 18:00 with a fixed test delivery including track materials, loading and unloading cars by hand through a car panel (SCHEMA 5).
- NEXT: round C (money and the telegraph, Willow Ford and the timetable, placeholder town, passengers), then round D (panels and HUD, tutorial, M1 acceptance check). Panel gestures on a phone are an open question: propose them to the designer as a survey (house rule) before building them.
- Known follow-ups from round B: the interchange is not joined to No. 1's track yet (needs coupling, round C); set-out cars should be instanced past about 10; job stockpile items cannot be picked back up; loading No. 1's own cars has no button; the Overland's test delivery is fixed until import orders exist (round C). Hand-building a 20u siding takes about 3 real minutes of work at 1x (the approved step times), about 5 with carrying.

## How merging works now
- Builders work in worktrees under `.claude/worktrees/`, each on branch `worktree-agent-<id>`. They do not push.
- The lead (or an integrator helper) merges into `ccr-59cb4c1f-rnscv9` with `git merge --no-ff`, runs `npm test` in the background (16+ checks, about 12 minutes), and pushes only when all pass.
- Gotcha: a worktree builder once committed its `node_modules` link; merged, it replaced the real folder with a link to itself (ELOOP errors, test runner exits at once). `.gitignore` now ignores `node_modules` as a link too. If it happens again: `git rm --cached node_modules; rm node_modules; npm install`.
- `node tests/run-one.js check-<name>` runs a single check.

## Gotchas (still true)
- The cloud test machine draws without a graphics chip; frame times there mean nothing for phones.
- cdnjs is blocked on the test machine; tests serve three.js r128 from node_modules.
- Draw calls: busy scenes 44 to 63 (budget under 100).
- The playable link (https://claude.ai/artifact/EHNWb1dZKQJA5HYT11k7Rc) still shows the end-of-M0 build; the designer has not asked for it to be updated.
- GitHub says the repository moved to https://github.com/Geosync23/TrainGame.git; pushes to the old address still work.
