# Backlog

Small bugs and ideas found outside the current task. Each entry: date, what, where.

- 2026-11-01: real-touch taps in the checks are sometimes read as press and hold on the busy test machine (check-handbuild retries its job tap up to 3 times to cope). A sturdier fix would make the hold threshold or the test's tap timing robust. tests/check-handbuild.js, input section.
- 2026-11-01: check-paths.js waited a fixed 0.4 s for the Path overlay, which is checked every 3 frames; with several test runs sharing the machine a software-drawn frame took 0.4 s and the check failed. Builder C4 changed it to wait up to 6 s for the overlay (test only). Other checks with short fixed waits may need the same. tests/.
