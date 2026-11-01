# Backlog

Small bugs and ideas found outside the current task. Each entry: date, what, where.

- 2026-11-01: the player is drawn at height 0 everywhere, so on the platform and the freight dock (top 0.3u, walkable in the walk grid) the feet sink into the deck. Drawing (`pl.position.set(px, 0, pz)`); needs a platform height lookup.
- 2026-11-01: real-touch taps in the checks are sometimes read as press and hold on the busy test machine (check-handbuild retries its job tap up to 3 times to cope). A sturdier fix would make the hold threshold or the test's tap timing robust. tests/check-handbuild.js, input section.
- 2026-11-01: items put down at a construction job (STOCKPILE) cannot be picked back up; only cancelling the job returns them. Construction jobs section and carrying.
- 2026-11-01: nothing stocks the wood stage at the start of a new game; cordwood only comes by telegraph order. Consider a starting stock at the wood stage (round D, with the tutorial). Timetable / economy.
