# Backlog

Small bugs and ideas found outside the current task. Each entry: date, what, where.

- 2026-11-01: the player is drawn at height 0 everywhere, so on the platform and the freight dock (top 0.3u, walkable in the walk grid) the feet sink into the deck. Drawing (`pl.position.set(px, 0, pz)`); needs a platform height lookup.
