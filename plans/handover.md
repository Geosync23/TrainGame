# Handover (updated 2026-11-01 by the second lead session)

Read this, then CLAUDE.md (house rules at the end of "My rules" and "Memory and handover": questions always as an interactive survey with answers saved on the page; workers stay inside the lead session; the lead hands over on its own by starting the new lead session), DEV_NOTES.md, design-doc.md section 0 (D1 to D12) and plans/m1-team-plan.md.

## Where things stand
- All of M1 rounds A to C and most of round D are merged and pushed on `ccr-59cb4c1f-rnscv9`; 27 checks pass (schema 13). Round D so far: D3 acceptance check with a bot playing a week, D4 fixes from the test week, D2 tutorial (investor E. Hartwell), D6 cordwood on the handcart + fares on arrival at Willow Ford + 8 starting cords, D5 riding your own train. Decisions D12 (M1 plan) and D13 (round D answers) are in design-doc section 0.
- ALL OF M1 IS MERGED AND PUSHED (2026-11-02): D1 office, telegram inbox, alerts and Look; D7 platform dwell. 28 checks pass, schema 13. Nothing is running. Latest bot week (check-m1, seed 1866): all 14 runs on time (worst 0 min late), 173 tickets at the hub, 36 fares on arrival, gave up 174 hub and 109 Willow Ford, cash $2,500.52, 82 of 82 items arrived, all contracts done. Watch: the pressure check (Overland and No. 1 within 10 minutes) now passes at exactly 10 minutes; a timing change could tip it.
- NEXT: M1 is complete. Do (a) republish the playable link (see Gotchas: one fresh helper reads the whole page file and publishes), and (b) the END-OF-M1 REVIEW for the designer (they chose one review at the end): a published page with screenshots, what was built, every provisional choice from DEV_NOTES (search "provisional"), the M1 acceptance results from check-m1 (the bot's week figures), the known gaps and backlog, and survey questions with answer boxes saved to the page database (house rule). The design-doc M1 gate (5 outside playtesters) is the designer's to run.
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
