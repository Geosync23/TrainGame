# Backlog

Small bugs and ideas found outside the current task. Each entry: date, what, where.

- 2026-11-01: the player is drawn at height 0 everywhere, so on the platform and the freight dock (top 0.3u, walkable in the walk grid) the feet sink into the deck. Drawing (`pl.position.set(px, 0, pz)`); needs a platform height lookup.
- 2026-11-01: real-touch taps in the checks are sometimes read as press and hold on the busy test machine (check-handbuild retries its job tap up to 3 times to cope). A sturdier fix would make the hold threshold or the test's tap timing robust. tests/check-handbuild.js, input section.
- 2026-11-01: items put down at a construction job (STOCKPILE) cannot be picked back up; only cancelling the job returns them. Construction jobs section and carrying.
- 2026-11-01: check-paths.js waited a fixed 0.4 s for the Path overlay, which is checked every 3 frames; with several test runs sharing the machine a software-drawn frame took 0.4 s and the check failed. Builder C4 changed it to wait up to 6 s for the overlay (test only). Other checks with short fixed waits may need the same. tests/.
- 2026-11-01: check-handbuild.js fails on the team branch after the C1 merge (0093e91, checked alone with the team branch's index.html): the tap on the staked job does not start work ("Out of ties" never shown; the toast still says the job was staked). Found by builder C4; not investigated. tests/check-handbuild.js, input or economy taps.
