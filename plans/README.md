# The plans folder

Every plan, survey, technical plan and art contract the project has made, as of 2026-11-14 (commit `1cdf55a`).
Dates are the day each file was first added to git. "Decision" is the design-doc section 0 decision (D1 to D34) the
file belongs to. See `docs/STATE.md` for where the project is now.

**About the `.html` files.** Each one is the source of a page published to the designer (a claude.ai artifact): a
plan or review with a survey on it. The designer's answers are saved in that page's own database, in the collection
`answers` under the document named in the last column (for example `answers/d32-plan`), and are read with the
ArtifactData tool; they are not in this folder. Pictures were often put into a page at publish time from
`test-output/` or `plans/pixel/`, so a source file may show empty image slots when opened locally. The published
links are in `design-doc.md` section 0 and `plans/handover.md`.

## Current reference

Read these when working on the game as it is today.

| File | What it is | Date | Decision |
|---|---|---|---|
| `handover.md` | The short current note a fresh lead session reads first (rewritten 2026-11-14 for the move to a new account). | 2026-11-01, last changed 2026-11-14 | all |
| `handover-archive.md` | The older handover notes, 2026-11-02 to 2026-11-14, newest first. History; kept for the record. | 2026-11-01, last changed 2026-11-14 | all |
| `answers/` | The designer's saved answers to every survey and review page, copied out of the pages' databases on 2026-11-14, with an index in `answers/README.md`. | 2026-11-01, last changed 2026-11-14 | all |
| `d32-tech.md` | Technical plan for line building, workers and the bigger town: the split between owners, the sim, the numbers. The lead's decisions at its end override its body. | 2026-11-13 | D32 (and D33, D34 build on it) |
| `d32-journey.md` | The designer's journey along the line: the nine regions and the border rules. | 2026-11-13 | D32 |
| `d32-rooms-art.md` | Art contract between the Rooms code and the artists: buildings in parts, tents, furniture, people indoors, the far town. Section 6 ("As joined") is what the code reads today. | 2026-11-14 | D32 stage 3 |
| `d32-art-buildings.md` | What the buildings artist delivered for stage 3: shops, civic buildings and houses in parts, the new houses, tents, the far town; choices and what is not done. | 2026-11-14 | D32 stage 3 |
| `d32-art-rooms.md` | What the rooms artist delivered: furniture keys, tents, the new people roles and their indoor frames; choices and gaps. | 2026-11-14 | D32 stage 3 |
| `proto-sprites.md` | The sprite contract: projection, sheet format, directions, every key family (D25), extended for D27's vehicles, interiors, goods, carts and town. Its section 2 (format `v: 1`, 700 KB budget) is out of date; the atlas is now packed `v: 2` with a 4,700 KB budget. | 2026-11-10 | D25, D27 |
| `pixel/` | Pictures used by the pages and contracts (see below). | 2026-11-10 onward | D25 to D32 |

## History, by date

Kept as the record of how decisions were made. Most describe systems that are now parked or superseded.

| File | What it is | Date | Decision | Answers |
|---|---|---|---|---|
| `m0-team-plan.md` | How M0 was split among up to six workers. | 2026-11-01 | D8 | |
| `m1-team-plan.md` | How M1 was split into rounds and workers. | 2026-11-01 | D12 | |
| `m1-plan-survey.html` | The M1 plan's questions for the designer. | 2026-11-01 | D12 | `answers/m1-plan` |
| `m1-round-d-survey.html` | M1 round D's questions (office, Look, telegrams, tutorial). | 2026-11-01 | D13 | `answers/round-d` |
| `m1-review.html` | The end-of-M1 review with every provisional choice. | 2026-11-02 | D14 | `answers/m1-review` |
| `m1-fix-plan.html` | The M1 fix-round plan (scale up 1.6 times, roof, cutaway, crossings, board). | 2026-11-02 | D15 | `answers/m1-fix` |
| `scale-review.html` | The scale check after the 1.6x build. | 2026-11-02 | D18 | `answers/scale-review` |
| `walk-speed.html` | The walking speed question (slower clock or slower walk). | 2026-11-02 | D17, D18 | `answers/walk-speed-2` |
| `fix-round-review.html` | End-of-fix-round review (crossings, cutaway, boards, plank platforms). | 2026-11-03 | D15, led to D20 | `answers/fix-round-review` |
| `clarity.html` | Clarity questions (No. 1 on both runs, contracts at the work board, train marking). | 2026-11-03 | D21 | `answers/clarity` |
| `d21-review.html` | Review of D20 and D21 (switches, boards, clarity). | 2026-11-04 | D20, D21, led to D22 | `answers/d21-review` |
| `explain.html` | Explaining things as they happen, and room at the depot. | 2026-11-04 | D22 | `answers/explain` |
| `m2-plan.html` | The M2 plan (the living town). Overtaken by D24 and D25; not built. | 2026-11-04 | D23 | `answers/m2-plan` |
| `station-rework.html` | The station rework plan (trains through, switches close, tickets on board, a cargo train). | 2026-11-06 | D24 | `answers/station-rework` |
| `rework-tech.md` | Technical plan for the station rework (the hub world, now `?world=hub`). | 2026-11-06 | D24 | |
| `d24-review.html` | Review of the station rework. Superseded by D25 before it mattered. | 2026-11-07 | D24 | `answers/d24-review` |
| `prototype.html` | The plan to back up and streamline into a small pixel-art prototype. | 2026-11-10 | D25 | `answers/prototype` |
| `pixel-mockups.html` | Pixel graphics mockups (mockup 2 became the look). | 2026-11-10 | D25 | `answers/pixel-mockups` |
| `facing.html` | Which side of the station faces the viewer (see-through chosen over turning it). | 2026-11-10 | D25 | `answers/facing` |
| `style-test.html` | The richer pixel style test (kept on deck). | 2026-11-10 | D25, D26 | `answers/style-test` |
| `station-place.html` | Where the station building goes (answer: back behind the platform roof). | 2026-11-10 | D25 | `answers/station-place` |
| `proto-tech.md` | Technical plan for the prototype: layout, schedule, the split, provisional choices (section 10). Still useful background: the prototype's code is built on it. | 2026-11-10 | D25 | |
| `d25-review.html` | The prototype review ("ready to play"). Held back for the art round, then overtaken by D26 and D27. | 2026-11-10 | D25 | `answers/d25-review` |
| `art-plan.html` | The next art round plan (the middle path). Not used: D26 kept the current style. | 2026-11-11 | D26 | `answers/art-plan` |
| `people-size.html` | How big people should be (answer: about 20 px). | 2026-11-11 | D26 | `answers/people-size` |
| `people-v2.html` | The new people sample sheet for sign-off. | 2026-11-11 | D26 | `answers/people-v2` |
| `d27-tech.md` | Technical plan for the working day made visual (scale, layout, punching on board, freight handling, townsfolk, lessons, art list). Still useful background: the station's code is built on it. | 2026-11-11 | D27 | |
| `d27-choices.md` | Every provisional choice made overnight in D27, for the designer's morning review. | 2026-11-11 | D27, answered in D29 | |
| `d27-review.html` | The D27 overnight build review. | 2026-11-11 | D27, answered as D29 | `answers/d27-review` |
| `d32-questions.html` | Questions on line building, the crew and the bigger town. | 2026-11-13 | D32 | `answers/d32-questions` |
| `d32-plan.html` | The line building plan in three stages. Its stages are all built; current detail is in `d32-tech.md`. | 2026-11-13 | D32 | `answers/d32-plan` |

There are no plan files for D28 to D31, D33 or D34: those were asked for in chat and built straight from the
designer's words (recorded in design-doc section 0 and DEV_NOTES).

## The `pixel/` folder

Pictures used in published pages and as art references. Nothing in the game reads them.

| Path | What it holds | Date |
|---|---|---|
| `pixel/*.png` (art-scene, art-closeup, bridges, hidden-line, look-*, now-*, plain-landscape, station-before, station-now) | The D25 mockup scenes (`art-scene.png` is the approved look the pipeline follows) and pictures for the D25 pages. | 2026-11-10 |
| `pixel/style/` | The richer style test's pictures. | 2026-11-10 |
| `pixel/review/` | Pictures for the D25 prototype review. | 2026-11-10 |
| `pixel/people-v2/` | The people v2 sample sheet and in-scene pictures (20 px and 26 px trials). | 2026-11-11 |
| `pixel/d27/` | Screenshots of the D27 day for the D27 review. | 2026-11-11 |
| `pixel/d32/` | D32 art batch one (crew, camp, country, work train) with its key list in `README.md`; `far/` the far-side wild country with `README.md` and `keys.md`; `near/` the near side, landmarks and wildlife with `README.md`. | 2026-11-13 |
