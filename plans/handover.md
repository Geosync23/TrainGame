# Handover (updated 2026-11-01 by the second lead session)

Read this, then CLAUDE.md (house rules at the end of "My rules" and "Memory and handover": questions always as an interactive survey with answers saved on the page; workers stay inside the lead session; the lead hands over on its own by starting the new lead session), DEV_NOTES.md, design-doc.md section 0 (D1 to D12) and plans/m1-team-plan.md.

## Where things stand
- M1 rounds A, B and C are merged and pushed on `ccr-59cb4c1f-rnscv9`; 25 checks pass (schema 10). The real start: a 336u x 128u map with the hub, the 160u spur and Willow Ford; money and the telegraph; coupling, timetables, wood and water; passengers; placeholder towns; hand-building track; the Overland and the interchange.
- The M1 acceptance check (`tests/check-m1.js`) has a bot that plays a week through commands only. Its report listed gaps; the technical ones are being fixed by builder D4 (hub departure margin, wood-need rule, switches on an occupied long edge, Willow Ford bay in the goods area, a default Hub bay, earlier town offers).
- The designer reviews M1 ONCE AT THE END. Report progress in short plain messages.
- Plan page: https://claude.ai/artifact/GbucAqeiKB7imWD2TRYZsu. M1 survey answers (D12): https://claude.ai/artifact/VaTAWnL2ycb8JqzZJSJyfA.
- Round D survey, waiting for answers: https://claude.ai/artifact/AJG1v9NjZkQxbhmc81ZJQn (database collection `answers`, doc `round-d`; source `plans/m1-round-d-survey.html`). Ten questions: how office panels open, how to inspect, pause in panels, telegrams on a small screen, skipping the tutorial, starting cordwood, a playable link now, travel between the stations (ride or run), cordwood on the handcart, unstaffed Willow Ford tickets. Read the answers with ArtifactData (get answers/round-d), record them as D13 in design-doc section 0, move answered open questions, then start D1 (office panels, HUD, telegram tape, inspect) and D2 (tutorial) and the gameplay changes the answers ask for.
- Provisional choices made by builders (for the end-of-M1 review) are listed in DEV_NOTES under each system ("provisional").

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
