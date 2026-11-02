# Backlog

Small bugs and ideas found outside the current task. Each entry: date, what, where.

- 2026-11-01: real-touch taps in the checks are sometimes read as press and hold on the busy test machine (check-handbuild retries its job tap up to 3 times to cope). A sturdier fix would make the hold threshold or the test's tap timing robust. tests/check-handbuild.js, input section.
- 2026-11-01: check-paths.js waited a fixed 0.4 s for the Path overlay, which is checked every 3 frames; with several test runs sharing the machine a software-drawn frame took 0.4 s and the check failed. Builder C4 changed it to wait up to 6 s for the overlay (test only). Other checks with short fixed waits may need the same. tests/.
- 2026-11-02 (D15, builder S2): a few tap and snap distances are still the M1 numbers and may feel small on the 1.6x track: the Board button showing within 8u of a door (`rideHud`), and the 24 to 36 pixel tap radii on joints and the water spout (input). Worth a look in the playtest. The crowd's leg cadence (`CROWD.STRIDE`, cycles per u) was kept, so walkers step a quarter quicker at the new speed.

- 2026-11-02 (D15 scale): in check-m1 the bot's morning boarding at Willow Ford fails with "The train moved off" (also before the scale). tests/m1-bot.js or the dwell at an unstaffed stop.
- 2026-11-02 (D15 scale): the bot's week sold 120 tickets (173 before the scale) and ran up to 7 min late (0 before). Probably longer walks in the bigger station; not investigated.
