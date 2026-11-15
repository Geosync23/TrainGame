# Handover (2026-11-14, for the first session on the new account)

The project is being moved to a new account. Read `docs/TRANSFER.md` first if you have not; it holds the setup,
the reading order and what did not travel. This note is the short current picture.

## Where things stand
- Version 13 is built, tested and pushed. `main` holds everything (brought up to date on 2026-11-14 at the
  designer's request); the old work branch `ccr-59cb4c1f-rnscv9` matches it.
- Built and playing by default: the station day (switches, tickets, freight, the evening cart to the shops),
  the town of 41 people with an economy and buildings you can enter, the line east of the yard built by the crew,
  the work train, the six join-in games played in the world, and the far town at the end of the line.
- The last full test (2026-11-14, on the transfer commit): all 81 checks passed. The run before it had one
  failure, check-clarity on a tap under load, which passed alone (backlog).
- The designer has played version 13 and reported two bugs (top of `backlog.md`). They have not yet reviewed
  the bigger town or the join-in games in the world in a survey.
- Playable link: none on the new account yet. Publish `index.html` and write the link here.

## Do first
1. Publish `index.html` so the designer has a link.
2. Plan and fix the two reported bugs: hold to walk does not work on the line; the rail workers are not seen
   leaving their tents and boarding the work train in the morning.
3. Make the review survey owed to the designer (`docs/ROADMAP.md`, "Decisions waiting on the designer").
4. Ask the designer what comes next, and what their usage limits are on the new account.

## Loose ends
- `tests/check-d32-day.js` (a bot playing a whole day with the line) was never written; `tests/run-all.js`
  skips it.
- check-pixperf's station case at the furthest zoom sits on its budget and can fail on a busy machine.
- A 5-man crew takes 98 days to build the line since the join-in games moved into the world (tie and rail men
  work only in whole teams); 30 men take 13 to 14 days. The designer has been told but has not ruled on it.
- The far town's name, "Prospect", is the lead's placeholder.

## Gotchas
- Helpers work in their own working copies, commit often and never push; the lead merges and tests.
- Do not run other heavy work during the full test.
- The cloud machine restarted twice on 2026-11-13 and lost unsaved helper work: have helpers commit often.
- After any sprite change: `python3 tools/pixelart/build.py`, then `embed.py`, then check-atlas.

Older handover notes are in `plans/handover-archive.md`.
