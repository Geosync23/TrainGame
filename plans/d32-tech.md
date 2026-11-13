# D32: line building, workers and the bigger town (technical plan)

Spec: design-doc.md D32 (with the designer's answers) and the approved plan page `plans/d32-plan.html` (three stages,
a team of five). The form follows `plans/d27-tech.md`: the tables rule, every part has one owner, choices marked
**(provisional)** are listed again in section 12. Base: commit `9b468e6` plus the D31 play-test fixes (one tap per
item with a job queue, the smaller cart, the faster walk), which a builder is finishing now and which are merged
before the D32 foundation starts. Nothing here changes the projection, the one fixed view, whole-step zoom, the seeded
randomness or the one-file rule. The game starts exactly as now: with the crew size at 0 (the default) no D32 code
changes a tick, so every existing check passes unchanged except where section 6 says so.

Words: **the station** is today's map (`PROTO.BOUNDS`). **The line** is the new country. **A front** is how far one
stage of work has got, in metres from the junction. **wu** is a unit of work: one minute of one fresh man.
1 m = 1.4286u (`PROTO.M`), as everywhere in the prototype.

## 1. The line

### 1.1 A region of the prototype, not a new world

| Question | Answer | Why |
|---|---|---|
| New world or region? | **A second place inside the prototype's one game** (`S.ln`), not a new `WORLDS` entry | A world has its own save, track graph and sim, and only one runs at a time; the station must carry on while the player is out, on the same clock, in the same save |
| Same coordinates as the station? | **No: its own frame** (x along the line from the junction, z across), drawn by the same projection | The station's walk grid (140,600 cells), `PROTO.BOUNDS`, the track graph and every station check stay untouched |
| Track graph? | **None.** The line's track is six numbers (the fronts); the work train on the line is a scripted run, not `trainTick` | No new edges, blocks or routes; the D24 train code is only asked for two more runs at the station (section 2) |
| View | A switch: `S.ln.view` is `'station'` or `'line'`; `pixFrame` draws one or the other | "Its own place; riding out switches the view" (the approved plan) |

### 1.2 Size and storage

| Thing | Number | Note |
|---|---|---|
| Length, junction to the far town's depot | **2,520 m = 3,600u** (`LINE.LEN_M`, `LINE.LEN`) | a mile and a half, compressed like the rolling stock **(provisional)** |
| Already laid at the start | 0 to 60 m (the branch leaves the main line just east of the map) | every front starts at 60 |
| Drawn width | **No edge at all**: the ground is a pure function of (seed, x, z), so any point has a tile | from the track you can never see an edge, at any zoom |
| Walkable width | the corridor, z from -32u to 32u (64u, 45 m), x from -20u to 3,740u | the player and the men stay in it; the camera follows the player, so the view (at most 130u to each side at scale 1) never needs a stored edge |
| The line itself | straight along x at z = 0 **(provisional)** | curves would need track tiles in more headings and a harder sort |
| Height | flat in the sim (y = 0 everywhere); hills, the rise and the cut are drawn only | no change to walking or sorting by height |
| Stored in the save | `S.ln` only: about 25 numbers (1.4). **No terrain, no tiles, no per-metre arrays** | the whole state is hashed and saved as JSON each time, so it must stay small |

### 1.3 The country (generated, never stored)

`LINE.SEGS` is a fixed table (the same in every game, so the designer can review one country); the seed only moves
the scatter (which tree stands where, patches of dry grass, boulders). All of it comes from `pixHash`-style integer
hashes of (seed, cell), never from the game's running random stream, so drawing never disturbs the sim.

| From (m) | To (m) | Kind | What is there |
|---|---|---|---|
| 0 | 60 | junction | laid track, a stub switch, a "yard limit" board |
| 60 | 300 | prairie | grass, dry grass, a few flowers |
| 300 | 536 | brush | sage and rabbitbrush thick on the right of way (to clear) |
| 536 | 552 | **bridge** | the creek crosses (water 10 m wide, banks, cattails); a timber trestle is built |
| 552 | 600 | brush | |
| 600 | 900 | woods | pines and oaks, 1 tree per 6 m of right of way to fell, stumps left beside it |
| 900 | 1,040 | hills | rolling ground (shaded tiles), mounds beyond the corridor |
| 1,040 | 1,120 | **cut** | a low rise across the line; the diggers cut through it, banks left either side |
| 1,120 | 1,250 | hills | |
| 1,250 | 1,600 | rock | bare rock, boulders, outcrops; slow digging, rock for the bed lies at hand |
| 1,600 | 2,000 | river | the river runs alongside, 40 to 70u south of the line (outside the corridor), cottonwoods, willows |
| 2,000 | 2,300 | woods | |
| 2,300 | 2,520 | prairie | the far town's fields, fences; the far town from 2,520 m |

| Function (Foundation, pure) | Gives |
|---|---|
| `lnKindAt(m)` | the kind above |
| `lnTile(seed, i, j)` | the ground tile key for the 1u cell (i, j): by kind, with soft borders 12u wide between kinds (hash-dithered), water and banks for the creek and river |
| `lnScatter(seed, ci, cj)` | the standing things in the 8u cell: `[{ key, x, z, row }]` (`row: true` inside the right of way, z within 5u of the line: brush and trees the clearers remove) |
| `lnCost(stage, m)` | wu per metre (3.2) |

### 1.4 The growing track

| Field of `S.ln` | Meaning |
|---|---|
| `on` | the line is being built (crew size above 0 and not finished) |
| `f: [f1..f6]` | the six fronts in metres, kept to 0.001: cleared, bed dug, rock laid, ties laid, rails laid, spiked. `f[k] <= f[k-1] - LINE.GAP[k]` always (gaps 6, 6, 4, 9.1, 9.1 m); `f1 <= 2,520` |
| `wu: [..6]` | work done on the metre in hand at each front (so a front moves smoothly) |
| `sup: { rock, ties, rails, kegs }` | supplies at the railhead dump (section 2) |
| `tr: { ph, t, x }` | the work train on the line: `'home' / 'out' / 'stand' / 'back'`, when the phase began, where its engine is (m) |
| `days`, `log: [{ day, m }]` | working days so far and the metres spiked each day (the last 30) |
| `view` | `'station'` or `'line'` |
| `done` | the day the last spike went in, or -1 |

What is drawn at a metre follows from the fronts alone: brush and trees on the right of way gone below `f1`, the
bed below `f2`, rock below `f3`, a tie every 0.6 m below `f4`, rails in whole 9.1 m lengths below `f5` (the length in
hand is carried by its gang), spikes and fishplates (a darker rail foot) below `f6`. Track below `f6` is finished and
carries the work train; the train stands with its engine at `f6 - 8` m.

### 1.5 Drawing it cheaply (Foundation)

| Layer | How | Cost |
|---|---|---|
| Ground | the station's chunk method with its own cache (`PIX.lnChunks`, the same 128 or 256 px chunks, built ahead by `pixChunkAhead`'s idle scheme, the least recently used dropped above 96 chunks): tiles from `lnTile`, then **everything outside the corridor baked in** (trees, mounds, the river, in back-to-front order by x + z, each chunk drawing every sprite that reaches into it) | as the station's ground: 2 to 4 ms a chunk, off the frame |
| The roadbed in a chunk | baked too, from the fronts cut to the chunk and rounded down to 1 m; a chunk remembers that key and is rebuilt when it changes. Only chunks a front stands in change: at 30 men about 2 rebuilds a real second among the visible ones, at most one per frame | under 4 ms, one frame in thirty |
| Standing things in the corridor | sorted items through `pixSort`, culled to the view: scatter with `row` false always, with `row` true only above `f1`; the rise before it is cut; cut banks; trestle bents; the work train; stock piles; men; the player | at most about 150 items at scale 1 in the woods (the station's busiest is 300) |
| The ends | the junction boards at 0; the far town from 2,520 m (stage 1: an end-of-line stake and a sign; stage 3: section 8.5) | |
| The camera | `PIX.CAM` as now, following `pixFocus()` (the player at the station; on the line the player, or the train while he rides) | |

Target on the line: a frame under 8 ms on the test phone profile with 30 men, the train and the woods in view (the
same budget as D27 10.1); measured in `check-linerender.js`.

### 1.6 Getting there and back (Play builds it on Foundation's switch)

| Step | What happens |
|---|---|
| Out | Dev panel, "Ride out as a rail worker". If the work train stands at the station: the player walks to the muster and boards with the men; the view rides with the train to the map's edge, fades, and fades in on the line 120u before the railhead as the train rolls in and stops. If the train has already gone: the same fade at once (dev mode), the player set down beside the crew car |
| There | `S.player.away = 'line'`; the station's player is parked at the muster and takes no commands; the player on the line is `S.lp` (Play). The station's sim runs every tick as before |
| Back | "Back to the station" in the line's top bar at any time (a fade, the player at the muster), or by riding the evening train home (the same fades in reverse) |
| While away | section 7.4 |

## 2. The work train (Foundation)

| Thing | Choice |
|---|---|
| Runs | two rows in a new table `PROTO_SCHEDULE_WORK`, added to the day's runs by `rrPlanDay` only when `S.ln.on` and the day is a working day: **`w1`** kind `'work'`, from W, track `t2`, arr 05:50, dep **06:20** (p1 comes at 06:45); **`w2`** from E, track `t2`, arr 19:15, dep 19:35 (p4 has gone east at 18:45) **(provisional times; Foundation re-times against real running times)** |
| Why track 2 | it is the straight through track: no lever is thrown for it, so it adds no work for the player and no risk of a train left waiting at a switch |
| Where it stands | crew car x -40 to -27, three supply cars -27 to 3, engine 3 to 21: clear of the switches (at -62.5 and 62.5), of the cart crossing (x 37) and of the footbridges' feet |
| Boarding | from the ground: the men muster at the west end of platform 1 (the muster, x -46 to -36, z -16 to -10) and cross track 1 on a new plank walk at x -36 to the crew car's steps. Track 1 is empty at both times |
| Evening | the train backs in (engine at the east end), so it stands in the same place; if backing proves hard in the D24 code, it comes engine first with the crew car next to the engine at the same spot |
| Consist | engine and tender, flatcar of rails and ties, gondola of rock (a flatcar with side boards), supply boxcar (tools, kegs of spikes, water, the noon meal), crew car (a boxcar with benches and end steps): 61u |
| Ready and waving off | it leaves by itself on time (`auto`), men aboard or not; a man left behind stays in camp that day and is counted as absent |
| On the line | not a D24 train: `wtTick` moves `S.ln.tr` (out: 15 minutes plus 10 x `f6 / 2,520`; the last 120u at 12.8u a minute, braking; back the same), drawn by `wtDrawList` with the station's vehicle sprites |
| Sundays | no work train; the men rest in camp and some go to church **(provisional)** |
| Day's hours on the line | arrive about 06:50, tools out, **work 07:00 to 12:00, meal 12:00 to 13:00, work 13:00 to 18:00**, tools in, away 18:20: 600 working minutes |

Supplies (the train is always full for now; tying it to freight comes with progression):

| Supply | Carried each morning | Used | Dump cap |
|---|---|---|---|
| Rock | 110 barrow loads | 1 load per 2 m of bed | 220 |
| Ties | 360 | 1 per 0.6 m | 720 |
| Rails | 48 (24 pairs of 9.1 m) | 2 per 9.1 m | 96 |
| Kegs of spikes | 10 (150 spikes each) | 4 spikes a tie | 20 |
| Tools | one per man and stage, in the boxcar's racks | never used up | |

That is enough for 215 m a day; 30 men lay about 180 m. The stocks are kept, counted and drawn (piles beside the
supply cars shrink through the day) so that a later rule can make them run short; in stage 1 they never do. A stage
with no supply for its next metre stops and its men are given to other stages.

## 3. The crew (Crew builder)

### 3.1 A man

| Field (`S.cw.men[i]`) | Meaning |
|---|---|
| `id`, `who` | 0 to 29; body 0 to 2 (`ppl/navvy_a`, `_b`, `_c`), from the seed |
| `skill` | 0.90 to 1.10, from `rngFor(seed, 'cw', i)` (mean 1.0) |
| `st` | `'bed' / 'camp' / 'toTrain' / 'ride' / 'tool' / 'walk' / 'work' / 'rest' / 'meal' / 'toCamp' / 'absent'` |
| `stage`, `slot` | his stage today (0 to 5) and his place in its gang |
| `x`, `z`, `f` | where he is (station units at the station, line units on the line) and his facing |
| `tx`, `tz` | where he is walking to |
| `sta` | stamina 0 to 100 |
| `t` | when his state began (for animation and timed states) |
| `tool` | the tool in his hands or null |

| Rule | Number |
|---|---|
| Walking | 2.4u a game minute (as the townsfolk), 1.8 carrying a tie, a rail or pushing a barrow |
| Work | `skill` wu a minute while in `'work'` at his place |
| Tiring | stamina falls 1.6 a minute at work (x 1.2 digging and spiking, x 0.8 clearing prairie); at 20 he puts the tool down and rests 10 minutes (sits, drinks), back to 100. So 50 minutes of work in the hour |
| Noon | at 12:00 every man walks to the train, sits and eats until 13:00 (stamina 100) |
| Tools | at arrival and on a change of stage he walks to the supply boxcar, swaps (1 minute), walks to his place |
| Places | a gang stands at its front: slot j at `front + 1.2 j` m behind it, alternating sides (z -2.2u and 2.2u; carriers walk between the dump and the front on z -4u and 4u) so no two men share a spot |
| A day's work | 600 minutes x 50/60 less about 20 walking and swapping: **about 480 wu a man a day** |

### 3.2 The work model

wu per metre, by stage and country (`LINE.COST`):

| Kind (metres of it) | Clear | Dig the bed | Lay rock | Lay ties | Lay rails | Spike |
|---|---|---|---|---|---|---|
| prairie (460) | 2 | 14 | 14 | 12 | 10 | 10 |
| brush (284) | 10 | 15 | 14 | 12 | 10 | 10 |
| woods (600) | 26 | 20 | 14 | 12 | 10 | 10 |
| hills (270) | 4 | 26 | 14 | 12 | 10 | 10 |
| the cut (80) | 4 | 70 | 14 | 12 | 10 | 10 |
| rock (350) | 2 | 40 | 8 | 12 | 10 | 10 |
| river (400) | 3 | 16 | 16 | 12 | 10 | 10 |
| the bridge (16) | 0 | 170 (the trestle) | 0 | 16 | 10 | 10 |
| **Whole line (2,460 m to build)** | 22,660 | 58,440 | 32,916 | 29,584 | 24,600 | 24,600 |

| Figure | Value |
|---|---|
| Total | **192,800 wu**, 78 wu a metre on average |
| 30 men | 14,400 wu a day: **13.4 days of work, about 14 working days** with the first morning, the gaps between the fronts and men walking between stages |
| 5 men | 2,400 wu a day: **80 days of work, about 82 working days, six times as long** (the model is linear in men by design; a small crew only loses a little more to walking between stages) |
| A full crew's pace | about 180 m (257u) a day: a rail length goes down about every 30 game minutes, a tie every 2 |
| Tuning | one number, `LINE.WU_K` (1.0), scales the whole table; `check-crew.js` holds the 13 to 15 day and the 5.5 to 6.5 times windows |

`lnWork(S, stage, wu)` (Foundation) is the only way a front moves: it spends wu at `lnCost(stage, front)`, stops at
the gap behind the front ahead, at the supplies and at 2,520 m, takes the supplies, and returns the wu it could not
use. The Crew builder never writes `S.ln.f`.

### 3.3 Who works where

| Step | Rule (the foreman, `cwAssign`, at 07:00, 13:00 and whenever a stage runs out of work or supplies) |
|---|---|
| 1 | For each stage: the work open to it now, in wu, from its front up to the gap behind the front ahead (the clearers: up to 60 m ahead of the diggers, then they join the diggers) |
| 2 | Share the men out in proportion to that open work, largest remainders first; ties and rails get an even number (they carry in pairs) when they get any |
| 3 | Keep as many men as possible on the stage they already have (lowest id moves first), so few tools are swapped |
| 4 | A stage with no open work gets no one; if nothing is open (the line is done) everyone rests by the train |

With 30 men all six gangs work at once and the fronts settle about 6 to 9 m apart, a work site about 60 m (85u) long:
two to three screens at the default zoom. With 5 men the same rule makes one gang move from stage to stage: the six
stages still follow one another along the line, more slowly.

### 3.4 The same every time, and cheap

| Point | How |
|---|---|
| Randomness | only `rngFor(seed, 'cw', ...)`: bodies and skill once, small jitters (rest places, meal seats) by day and man. No `Math.random`, nothing from drawing |
| Order | men are ticked in id order; shares and ties are broken by id |
| The player's part | reaches the sim only as commands (section 7.1) |
| Cost | one small state step a man a tick: no path-finding (straight walks on the line, a fixed path at the station), no searches. **Target: under 0.1 ms a tick for 30 men** (the townsfolk's 16 take under 0.05), measured in `check-crew.js` |
| Out of view | the same sim whether the player watches or not: there is nothing cheaper to switch to, and the result must not depend on the view |
| A fast test run | `cwSimDays(seed, crew, maxDays)` plays only the line (the work train's phases, the crew, the fronts) on a bare state, for the pace check: 82 days of 5 men in a few seconds |

## 4. The camp and the head count (Crew builder)

| Thing | Choice |
|---|---|
| Place | at the station, west of the town's west back lane: x -88 to -48, z -58 to -30 (40 x 28u) **(provisional; Foundation checks it is open ground clear of the creek and the cart path, and may move it)** |
| Tents | wall tents 4.5 x 6u, four cots each: `ceil(crew / 4)` tents (5 men 2, 10 men 3, 15 men 4, 20 men 5, 25 men 7, 30 men 8), in two rows of four from the gate outward; a cook tent 6 x 8u with a table and benches, a fire ring, a water barrel, a tool rack. Tents appear or go when the crew size changes (at 05:00) |
| A bed each | man i has cot `i % 4` of tent `floor(i / 4)`; he is drawn lying in it at night when the tent's flap is open to the view (tents fade their near wall like the buildings of 8.3 from stage 3; in stage 1 the men are simply inside) |
| The camp's day | up 05:10, breakfast at the cook tent, at the muster by 05:55; home about 19:25, supper to 20:15, by the fire, in bed by 21:30 |
| Walking at the station | a fixed path `CW_PATH` (camp gate, round the station's west end, the muster, the plank walk, the car's steps), men spaced 1u apart; no walk grid, never on a platform ramp or the cart crossing |
| **The head count** | at 22:00 `hcTick` counts every person the game simulates: the townsfolk (`TF_AGENTS`), the hired station workers (section 7.3), the rail men, and from stage 3 every resident. `hcCount(S)` gives `{ total, home, out: [{ id, name, where }] }`; the event `hcDone`; shown in the dev panel and as one line on the day's summary ("Counted home: 49 of 49") |
| Who counts as home | in his own bed (or his home building, or for the two cowhands off the map's west edge, as today); a man left behind by the train is in camp, so home; a man still on the line (the train failed to bring him) is out, by name |

## 5. Dev mode (Foundation the shell, Play the buttons that move the player)

| Point | Choice |
|---|---|
| Reached by | Settings, a new row "Dev mode" (On / Off), kept in the browser (`railhead-dev`, a viewer preference like the helper arrows, not in the save); `?dev=1` turns it on too. Off by default: the game starts exactly as now |
| The panel | a "Dev" button under the Settings button opens a `bigPanel`: **Rail crew** 0, 5, 10, 15, 20, 25, 30 (0 is off); **Ticket punchers** 0 to 3; **Cargo loaders** 0 to 4; **Delivery men** 0 to 2; **Ride out as a rail worker** / **Back to the station**; a status block (day of the line, metres spiked of 2,520, each front, men by stage, the head count); "Skip to 05:00 tomorrow" (dev only) |
| How a choice reaches the game | as a command, `{ t: 'dvSet', k, v }`, so it is replayable; sizes take effect at the next 05:00 (the crew, the tents and the runs are planned then). The first time the crew goes above 0 in the morning phase before 05:50 it takes effect at once |
| Saved | in the save: `S.dv = { crew, punch, load, deliver }` and all that follows from it (`S.ln`, `S.cw`, `S.lp`, `S.hw`). Not saved: whether the panel is open, the Dev mode preference |

## 6. The longer day (Foundation)

| Point | Choice |
|---|---|
| The constant | a new per-world number, **`WORLDS.proto.clock = 5.0`** ticks a real second (others keep `CFG.TICKS_PER_REAL_S` 7.5), read through `clockRate(T)` in the four places that use the constant today (the main loop's `acc`, the two gait steps, the crowd's). A game minute is 1.5 real seconds, a day 36 minutes. A tick is still 8 game seconds: **the sim, the hashes and the timetable do not change** |
| The player keeps his real speed | otherwise he would only play in slow motion and gain nothing. One factor, `PROTO.PLAYER_K = 1.5`: the prototype's walk and tool pace x 1.5 a game minute (after D31's rise), and the player's own action times divided by 1.5 (the handling steps through `frTimes`' factor, the punch, a lever throw) **(provisional)** |
| What does not change | trains, the timetable, townsfolk, travellers, the crew: all in game time, so they look 1.5 times calmer and the player gets 1.5 times as much done between trains |
| Checks that step ticks (`rh.step`: almost all) | pass unchanged if they do not time the player; those that assert the player's walk or handling times in game seconds get their expected numbers x or / 1.5: `check-handling`, `check-smooth`, `check-onboard`, `check-levers`, `check-walk` (reads the world's rate), `check-d27world` (walking times). Foundation updates them in its own commit |
| Checks that play in real time (`smooth-play.js`, `train-play.js`, `check-pixperf`, `check-feet`) | trains move 2/3 as many pixels a second: re-measure and record the new figures; limits on judder stay |
| The day checks (`check-d27-day`, `check-proto-day`, `check-proto-stall`) | the bot gets more done per game hour, so lateness falls; re-run, record the new figures, keep the limits. `?clock=7.5` restores the old rate and `?pk=1` the old pace for a comparison |

## 7. Stage 2: joining in, hired station workers, lessons

### 7.1 The join-in games (Play)

The player on the line taps a gang's marker ("Join") and takes a spare tool; "Step out" (always on screen) or walking
away ends it at once. Touch is read on the page in real time; **the sim only ever sees one command per finished
action**, `{ t: 'lgDone', stage, q }` with q a whole number 0 to 100, and caps how often it takes one (the action's
least time in ticks), so a replay is exact and tapping fast gains nothing.

| Stage | The game (touch) | Measured (q) | One action |
|---|---|---|---|
| Clear | swipe across each brush clump along its cut mark (three cuts fell it); a tree: swipe left and right in turn | the share of swipes on the mark, and their pace | a clump or a tree down |
| Dig the bed | swing in time: a ring closes on the pick; tap as it meets the mark, four swings then a shovel flick (swipe up) | timing error (within 120 ms full marks, within 250 ms half) | a barrow of earth |
| Lay rock | drag the barrow's handles down to tip at the mark, then rake: drag side to side until the level bar is even | how even, how quick | a load spread |
| Lay ties | with a partner: press and hold as his "hup" ring fills to lift together, he walks with you, drag the tie onto its two chalk marks, let go | lift sync, distance from the marks | a tie down |
| Lay rails | with the gang: hold on the foreman's call, drag the rail sideways until the gauge bar closes, let go on "down" | sync, gauge error | a rail down |
| Spike | turn about with a partner: tap on your beat, three blows a spike | timing error; a miss bends the spike (one lost) | a spike home |

| Feeding the work model | Number |
|---|---|
| The player is one good worker | each accepted action adds `LG.WU[stage] x (0.5 + q / 100)` wu through `lnWork`: at q 50 a man's rate, at q 100 one and a half men; he does not tire (the player rests when he likes) |
| He lifts the men near him | while his last three actions average q 60 or more, men of the same gang within 12 m work at `1 + 0.15 x q / 100` (at most 1.15); it fades 30 game seconds after his last action |
| Shown | his q as a small bar over him; a brief glow under the lifted men's feet; the gang's foreman calls ("Good!") |
| Supplies and gaps | the player's work obeys the same gaps and supplies (through `lnWork`) |

### 7.2 Lessons (Play, in U's lesson system)

Six short lessons added to `PD_LESSONS` (ids `lnClear`, `lnDig`, `lnRock`, `lnTies`, `lnRails`, `lnSpike`), each
shown the first time the player joins that stage, in the same card style, with Show me and Skip, replayable from
Settings; one more, `lnRide`, the first time he rides out (what the fronts are, how to step out and go back). Saved in
`S.pd.les` as the others.

### 7.3 Hired station workers (Town builder)

Agents at the station, in view, sorted and drawn like the townsfolk; each lodges at the hotel until stage 3 gives
him a home, and is in the head count.

| Kind | Does | Built on | Pace |
|---|---|---|---|
| Ticket puncher (0 to 3) | meets each passenger train, climbs in at a coach end, walks the aisle and punches every seated traveller not yet punched; one coach each, the lowest coach first | P's seats and aisle: `pbCarStatus`, a new `pbPunchBy(S, stock, seat, who)` (the same marks and counts as the player's punch); drawn inside the cut-away coach when it is open to view | a seat every 1.5 of the player's punch times |
| Cargo loader (0 to 4) | takes jobs from **the D31 job queue** (one entry per good: from a car to its cell, from a cell to a car), walks to the good, lifts it, carries it, puts it down | the queue's entries gain `claim` (null, `'player'` or the worker's id). The player's tap claims an entry and may take it back from a worker who has not lifted yet. The worker uses F's own rules for where a good goes (`frStoreSpot`, `frCarSpot`, `frSpotOf`) and F's step times, but his own small walker (the walk grid's path between two spots), not the player's step machine. While he carries, the good's place is the new kind `CREW { who }` | 1.3 of the player's time per good; hand truck goods only if a hand truck is free |
| Delivery man (0 to 2) | in the evening loads a second platform cart from the storage, pushes it by the cart path to the shops, hands each good in at its door, brings pickups back | the queue's delivery and pickup entries, the cart path as a fixed route, `tfAt` for the keeper, F's `frDeliver` counting | a round trip of 8 goods in about 50 game minutes |

"Take what the player leaves": a worker claims only an entry nobody holds, and the oldest first; the player always
has first call by tapping. The same queue, the same counts, the same audit (`itemAudit` learns the `CREW` place).

### 7.4 While the player is away on the line

| Work | Who does it | If nobody does |
|---|---|---|
| Levers | **a relief man at the frame** (`awLeverTick`): throws what `rrSwitchNeeds` asks, 10 game minutes after it is asked, and sets it back **(provisional: without him every train would stand until the player came back)** | each train comes in about 10 minutes late, counted as late |
| Tickets | punchers, if hired | the train leaves by itself at its time plus the grace it has today; unpunched travellers count as missed |
| Unloading, loading | loaders | goods not unloaded leave with the train (counted "left aboard"); goods not loaded wait for the next day |
| Delivery, pickup | delivery men | goods stay in storage; shops go short (stage 3: section 8.4) |
| The day's end | the summary opens when the player is back at the station or at 23:30 | |

All of it lands in the day's figures the summary already shows, plus one new line, "While you were on the line:
2 trains late, 14 travellers missed, 6 goods left aboard". Nothing new is charged; the existing figures are the cost.

## 8. Stage 3: the bigger town (Town builder)

### 8.1 Homes, roles, a daily round

| Point | Choice |
|---|---|
| People | every simulated person gets `{ role, home, work }` in `TF_AGENTS`: the 19 of today, plus about 14 new (the keepers' families, a clerk at the store and the bank, a second smith's hand, the hotel's cook and maid, a stable boy, the teacher's pupils to 6), plus the hired workers and the foreman. About 40 at the station besides the rail men |
| Houses | 10 more on the back lanes (8 x 8u lots at x -35 and 35 and a third lane at x -47 and 47), three kinds (cabin, frame house, two-room house); the hotel lodges the single hired workers; keepers who live over their shops stay there |
| The round | `TF_ROUTINES` by role, as today (be there by): home, work, the noon meal (home or the hotel's table), an errand, the saloon or the porch in the evening, home by 21:30, church on Sunday; children to school |
| Rail men in town | Saturday evening a third of them walk to the saloon and back (the town graph), Sunday some to church |

### 8.2 The town graph and the walk grid

Rooms are added to `TOWN27` as `room: { x0, x1, z0, z1, door, furn: [{ key, x, z, f, use }] }`. The town graph gains
a node inside each door and at each `use` spot (counter, bench, bed, desk, pew); agents walk in and to their spot
rather than vanishing at the door. The walk grid opens each room's floor with the doorway as the only gap (a narrow
edit in the shared walk grid section, made by the lead from the Town builder's table).

### 8.3 Every building can be entered

| Point | Choice |
|---|---|
| When it opens | when the player stands inside or within 1.2u of the door on the outside, or taps the building; one building at a time (and the tents, the same way) |
| What fades | the roof and the wall or walls towards the viewer (south and east): to 0 over 0.25 s, back when he leaves. The back walls, the floor, the furniture and the people stay |
| How drawn | one sorted item per building, like the cut-away coach (`pixCutItem`): floor, back walls, furniture and people in their own order, then the front and roof at their fading alpha |
| The art | every building as three parts (`/back`, `/front`, `/roof`) plus `/floor`; today's whole-building sprites stay for the far town |
| Indoors | the keeper at the counter, a customer or two, a stove, shelves that show the stock (four levels), a bed and table at home, pews, desks, the press, the cells, the bar, the forge |

### 8.4 A simple economy you can see

| Thing | Rule | What the player sees |
|---|---|---|
| Stock | each shop has a stock 0 to 12 of its goods (`SHOP_GOODS27`); a delivery adds; it uses 1 to 3 a day by shop | shelves and floor stacks at four levels |
| Open or shut | open while stock is above 0 at 08:00; shut after a day at 0 | the door open and a sign out, or shut with a "Closed" card |
| Work and money | an open shop's people are at work and each household gets a day's pay (a coin count per home, 0 to 20); a shut shop's people stay home or sit on the porch | workers at their spots, or idle on porches and at the saloon door; a purse mark over a home's door when tapped |
| Mood | per household: content, worried (2 days without pay), unhappy (4 days) | a small face on the Look card; unhappy people stand about the depot square in the evening |
| Travellers' custom | each traveller stepping off has a 1 in 3 chance (seeded) to walk to the hotel or the saloon and stay an hour (the hotel overnight for 1 in 10); each counts as custom, which pays those two houses instead of stock | travellers on the street, at the bar, lamps in the hotel's rooms |
| The trains' effect | late or missed goods mean empty shelves two days later; a good week fills the town | the town's state at a glance in the dev panel: shops open, households paid, mood |

No prices, no markets: counts only. The cash economy of the older worlds stays parked.

### 8.5 The far town

Drawn from 2,520 m on the line: a depot and platform at the end of track, a water tank, a main street of eight
buildings running north (today's whole-building shop sprites in another order and two new ones, a grain store and a
second hotel), fences and fields, a dozen standing townsfolk at idle. Not enterable, no agents with routines, nothing
simulated. When the last spike is in, the work train's morning run ends there and the men are cheered (a card).

## 9. Saving

| Point | Choice |
|---|---|
| Schema | **19 to 20**, once, in Foundation's commit: an older build must not read runs of kind `'work'` or goods in a `CREW` place |
| 19 to 20 | the number only. Every new store is optional and missing means the default: `S.dv` (all 0), `S.ln` (off, fronts at 60), `S.cw`, `S.lp`, `S.hw`, `S.tn`, `S.player.away` (absent). **An old save loads into the same game it was, with the line off** |
| Later stages | builders add fields inside their own store without a bump (as D27 8.6); stage 3's rooms change the walk grid, which is rebuilt at load, and re-settle the townsfolk at the next 05:00 plan (a save without `S.tn` gets it then) |
| Shape checks | `checkSaveShape` calls `lnCheckSaveShape`, `cwCheckSaveShape`, `lpCheckSaveShape`, `hwCheckSaveShape`, `tnCheckSaveShape` (Foundation places the calls and the stubs) |
| Fixtures | `tests/fixtures/save-v20.json` (a line day in hand: day 3, 30 men, mid-morning, the player on the line) and `save-v20-off.json`; every older fixture's v20 load hash recorded again in `check-save.js` |
| Size | 30 men add about 4 KB to the save, the line 1 KB |
| Clock and pace | not in the save: a v19 save simply plays on the slower clock |

## 10. The art list (one artist, Opus; keys as in `plans/proto-sprites.md`)

People are 20 px tall (a frame about 14 x 24 with a tool); four facings (`se`, `ne`, `sw`, `nw`) unless said.

### 10.1 People and tools (stage 1 unless marked)

| Key | Frames per facing | Note |
|---|---|---|
| `ppl/navvy_a`, `_b`, `_c` / `idle`, `walk` | 2, 4 | three men: shirt and braces, a vest, a red undershirt; hats differ |
| `.../shoulder` | 4 | walking with a long tool on the shoulder (pick, shovel, maul, axe: the tool drawn from `tool/*/held`) |
| `.../axe`, `/pick`, `/shovel`, `/maul` | 4 each | the swings |
| `.../hook` | 3 | cutting brush with a brush hook |
| `.../barrow` | 4, and `/tip` 2 | pushing and tipping the barrow |
| `.../rake` | 3 | |
| `.../tieFront`, `/tieBack` | 4 each | a pair carrying a tie; `/tieDrop` 2 |
| `.../railCarry` | 4 | one of four on a rail with tongs; `/railDrop` 2 |
| `.../sit`, `/eat`, `/drink`, `/lie` | 1, 2, 2, 1 | resting, the meal, in bed (two facings) |
| `ppl/foreman` / `idle`, `walk`, `call` | 2, 4, 2 | stage 2 |
| `tool/axe`, `pick`, `shovel`, `maul`, `hook`, `rake`, `tongs` / `held/<facing>`, `/ground` | 1 | about 12 x 12 |
| `tool/barrow/<facing>`, `/full`, `/tipped` | 1 | 20 x 16 |
| `ppl/puncher`, `ppl/loader`, `ppl/carter` (stage 2) | `idle` 2, `walk` 4; puncher `punch` 3, `climb` 2; loader `carry` 4, `lift` 3, `put` 3, `truck` 4; carter `push` 4, `handOver` 2 | uniform caps so they read as railroad men |
| Townsfolk roles (stage 3): `ppl/clerk`, `cook`, `maid`, `stableboy`, `wife_a`, `wife_b`, `farmer`, `girl`, `boy` | `idle` 2, `walk` 4, `work` 2 (two facings), `sit` 1, `lie` 1 | the 14 existing kinds gain `work` 2, `sit` 1, `lie` 1 |

### 10.2 Track at each stage (stage 1)

Laid ties and rails are drawn per pixel by the renderer, as at the station; sprites are only the loose things.

| Key | Size (px) | Note |
|---|---|---|
| `tile/ln_cleared/1..2`, `tile/ln_bed/1..2`, `tile/ln_rock/1..2` | 16 x 8 | the right of way cleared, the dug bed, the rock |
| `line/stake`, `line/string` | 4 x 10, 16 x 8 | the surveyors' stakes ahead of the clearers |
| `line/tie_loose/x`, `/z`, `line/tie_pile/1..3` | 30 x 14, 34 x 26 | |
| `line/rail_loose`, `line/rail_stack/1..3`, `line/rail_carried` | 108 x 54, 108 x 60 | a 13u rail |
| `line/keg`, `line/spikes`, `line/rock_heap/1..3`, `line/earth_heap/1..2` | 10 x 12 to 28 x 18 | |
| `line/rise/1..3`, `line/cut_bank_n`, `line/cut_bank_s` | 80 x 52 | the rise before digging (8u pieces), the banks after |
| `line/trestle_bent`, `line/trestle_deck`, `line/trestle_part/1..3` | 44 x 34, 80 x 44 | the bridge and its stages of building |
| `line/yard_limit`, `line/mile_board`, `line/end_stake` | 12 x 22 | |
| `veh/crewcar/e`, `/w`, `veh/gondola/e`, `/w`, `veh/gondola_load/1..3`, `veh/flat_rails/1..3`, `veh/flat_ties/1..3`, `veh/crewcar_in/*` (floor, bench) | as a boxcar and a flatcar | the work train; the engine and boxcar are today's |

### 10.3 Terrain and nature (stage 1)

| Key | Size (px) | Note |
|---|---|---|
| `tile/prairie/1..4`, `tile/woodfloor/1..3`, `tile/rockground/1..3`, `tile/hill_lit/1..2`, `tile/hill_shade/1..2`, `tile/field/1..2` | 16 x 8 | today's grass, dry grass, sand, gravel, water and bank tiles are reused |
| `tile/river/0..1`, `tile/riverbank/<8 sides>` | 16 x 8 | |
| `nat/pine/1..3`, `nat/oak/1..2` | 28 x 48, 40 x 46 | today's cottonwood, willow, juniper, sage, rabbitbrush, boulders, outcrops, logs are reused |
| `nat/stump/1..2`, `nat/felled`, `nat/brush/1..3`, `nat/brush_cut` | 10 x 8 to 40 x 16 | |
| `nat/mound/1..3` | up to 160 x 80 | hills beyond the corridor (baked into the ground) |
| `nat/fence_x`, `nat/fence_z`, `nat/haystack` | 64 x 36, 24 x 22 | by the far town |

### 10.4 Tents and beds (stage 1)

| Key | Size (px) | Note |
|---|---|---|
| `camp/tent/back`, `/front`, `/roof` (and `_lit`) | 84 x 68 | a wall tent 4.5 x 6u in three parts (fades like a building) |
| `camp/cooktent/back`, `/front`, `/roof` | 112 x 84 | |
| `camp/cot`, `camp/cot_made`, `camp/table`, `camp/bench`, `camp/fire/0..2`, `camp/fire_out`, `camp/kettle`, `camp/toolrack`, `camp/barrel`, `camp/washline` | 10 x 10 to 30 x 20 | |

### 10.5 Houses and rooms (stage 3)

| Key | Size (px) | Note |
|---|---|---|
| `bld/<each of the 12 shops, station, church, school, freighthouse>/back`, `/front`, `/roof`, `/floor` (and `_lit` fronts) | as today's buildings | today's art cut into parts; the inner faces of the back walls are new |
| `bld/cabin`, `bld/framehouse`, `bld/house2` / `back`, `front`, `roof`, `floor` in two facings | about 112 x 100 | |
| `room/counter_x`, `_z`, `room/shelf/0..3` (stock levels) in two facings, `room/table`, `chair`, `bed`, `bed_made`, `stove`, `bar`, `barstool`, `desk`, `pew`, `pulpit`, `blackboard`, `press`, `cell_bars`, `safe`, `barber_chair`, `coffin`, `forge`, `stall`, `piano`, `rug`, `wash_stand`, `lamp_table` (and `_lit`) | 10 x 10 to 40 x 36 | about 45 keys |
| `ui/closed_card`, `ui/purse`, `ui/face/0..2` | 8 x 8 | |

### 10.6 The far town (stage 3)

`far/depot`, `far/platform`, `far/tank` (today's water tower may serve), `far/grainstore`, `far/hotel2`, `far/sign`:
about 6 new sprites; the rest are today's whole buildings.

### 10.7 The atlas budget

Today the generated block is 612 KB of base64 against a budget of 700: the sheets 418 KB, the frames index 140 KB,
the `extra` table 53 KB.

| Step | KB | Running total |
|---|---|---|
| **Pack tighter first: index format `v: 2`** (keys grouped by prefix, numbers in flat arrays, `extra` rounded and de-duplicated): Foundation changes `build.py`, `embed.py` and the reader `pixAtlasLoad` | about -90 | 520 |
| Stage 1: navvies (3 x about 190 frames) and tools 45, track and train 20, terrain and nature 35, camp 10 | about +110 | 630 |
| Stage 2: foreman, three kinds of hired worker | about +25 | 655 |
| Stage 3: building parts 75, houses 15, rooms 25, people 45, far town 10 | about +170 | 825 |

**The budget stays 700 KB through stages 1 and 2 and is raised to 850 KB at stage 3** (`check-atlas.js`); the page
grows from 2.3 MB to about 2.6 MB. If the `v: 2` index slips, stage 1 needs 800 instead.

## 11. The work split

### 11.1 Order

1. **Foundation**, alone, first (stage 1's base). Done when `npm test` passes with the line off and the stubs keep a
   line day going with a crew of 30 standing in for themselves (a stub crew that moves the fronts at the plan's rate).
2. **Crew, Play and Art at once** from Foundation's commit, each on its own branch and worktree. Art's first batch
   (navvy walk and idle, the track tiles, the tent) is asked for first so the others see real sprites early.
3. **The lead merges** Crew, then Play, then the atlas; then turns the dev panel's rows on and writes
   `check-d32-day.js`. Stage 1 is reviewed by the designer.
4. **Stage 2:** Play (games, lessons) and Town (hired workers, the away rules) at once; Art's second batch.
5. **Stage 3:** Town (homes, rooms, the economy), Art's third batch; Foundation's owner draws the far town and the
   fading buildings in the renderer.

### 11.2 Owners, prefixes and stores

| Owner | Prefixes (functions, constants) | Store | New sections in index.html (each headed with its owner) |
|---|---|---|---|
| **Foundation** | `ln`, `LINE`, `wt`, `dv`, `aw`, `clockRate`, `pixLn`, `pixFocus` | `S.ln`, `S.dv`, `S.player.away` | "the line (D32)" after "the town (D27)"; "dev mode (D32)" in "HUD and panels"; a block "the line's view (D32)" at the end of "pixel renderer (D25)" |
| **Crew** | `cw`, `CW`, `cp`, `hc` | `S.cw` | "the crew (D32)" after "the line (D32)" |
| **Play** | `lp`, `LP`, `lg`, `LG`; lesson ids `ln*` | `S.lp` | "on the line (D32)" after "the crew (D32)"; a block "Line (D32)" in "HUD and panels" |
| **Town** | `hw`, `HW` (stage 2); `tn`, `TN` (stage 3) | `S.hw`, `S.tn` | "hired workers (D32)" and "the bigger town (D32)" after "the town (D27)" |
| **Art** | atlas keys of section 10 | | `tools/pixelart` only (new `sprites_navvy.py`, `sprites_line.py`, `sprites_camp.py`, `sprites_rooms.py`, `sprites_far.py`); no game code |

Shared sections (track, trains, the walk grid, the player, cargo, saving, the sim tick, the command switch, input,
the renderer outside the new block, test hooks, `run-all.js`) are Foundation's during its turn and the lead's
afterwards: Foundation pre-places every hook, tick line, command case, stub and `run-all.js` line, so the others fill
functions inside their own sections and touch no shared line. A builder who needs a change there asks the lead.

### 11.3 What Foundation lands

| Part | Detail |
|---|---|
| The line | `LINE` (1.2 to 1.4, 3.2's table), `lnKindAt`, `lnTile`, `lnScatter`, `lnCost`, `lnWork`, `lnNewStore`, `lnOn`, `lnNewDay`, `lnCheckSaveShape`, `LN_TEST` |
| The work train | `PROTO_SCHEDULE_WORK`, the two runs in `rrPlanDay` (kind `'work'`, auto depart, no board row unless the line is on), the stock (`PROTO_STOCK.crewcar`, `.gondola`), the muster and plank walk in `PROTO`, `wtTick`, `wtDrawList`, the supplies |
| The clock | section 6, with the checks it touches |
| State and save | schema 20, the stores' defaults, the shape checks, the fixtures |
| The dev panel shell | the Settings row, the Dev button and panel with every row (rows whose owner has not landed are greyed), `dvCmd` |
| The view switch and draw hooks | `lnViewOn()`, `lnSetView(S, v)`, `pixFocus()`, `pixLnFrame(alpha, dt)` (ground chunks, roadbed, scatter, the train, the lists below), the input branch (`lpTap` when the line is in view), the page class `line` that hides the station's HUD; at the station, the camp's and the crew's lists added to the sorted items |
| Away | `awLeverTick` (7.4), the station player's commands refused while away, the summary's extra line |
| Tick order | after `tfTick`: `wtTick`, `cwTick`, `hwTick`, `tnTick`; after `pbTick`: `lpTick`; `hcTick` at 22:00 inside `cwTick`'s line |
| Commands | `dvSet` (Foundation); `lpRide`, `lpBack`, `lpWalk`, `lpJoin`, `lpLeave`, `lgDone` (to `lpCmd`) |
| A stand-in crew | `cwTick`'s stub spends 0.8 wu a man a working minute by 3.3's shares with no men drawn, so the line grows before Crew lands |
| Cargo | the place kind `CREW { who }` in `cargo27Where` and `itemAudit` (unused until stage 2) |
| Layout export | `proto-layout.json` v 3 with a `d32` block (the camp, the muster, the plank walk, the line's table, the stock) for the artist |

### 11.4 Interfaces (signatures)

| Function | Owner | Called by | Shape |
|---|---|---|---|
| `lnOn(S)` | F | all | is the line being built |
| `lnWork(S, stage, wu)` | F | Crew, Play | spends wu at a front, returns the wu left over; pushes events `lnMetre { stage, m }`, `lnDone` |
| `lnFronts(S)` | F | all | `[f1..f6]` in metres |
| `lnOpenWork(S, stage)` | F | Crew | wu open to a stage now (3.3 step 1), 0 if out of supplies |
| `lnSpot(S, stage, slot)` | F | Crew, Play | `{ x, z, f }` in line units: the place of slot j of a gang |
| `lnTrain(S)` | F | Crew, Play | `{ ph, x, cars: [{ k, x0, x1, door: { x, z } }] }` on the line; at the station the crew car's steps `{ x, z }` |
| `lnHours(S)` | F | Crew | `{ work: bool, meal: bool, pack: bool, workday: bool }` for now |
| `wtDrawList(S)` | F | renderer | vehicles as the station's train items |
| `cwTick(S, ev)`, `cwNewDay(S, day)` | Crew | sim tick | |
| `cwDrawList(S, place)` | Crew | renderer | `[{ id, who, x, y, z, f, act, frame?, tool?, held? }]` for `'station'` or `'line'`, in the townsfolk's shape |
| `cpItems(S)` | Crew | renderer | the camp: `[{ id, key, x, y, z, box, fade? }]` |
| `cwGang(S, stage)` | Crew | Play | `[{ id, x, z, slot }]`, the men of a stage |
| `cwBoost(S, stage, x, k, until)` | Crew | Play | men of the gang within 12 m of x work at k until the tick `until` |
| `hcCount(S)` | Crew | dev panel, summary, Town | `{ total, home, out: [{ id, name, where }] }` |
| `hcRoll(S)` | Town (stage 2 adds to it) | Crew | `[{ id, name, home, at }]` for the townsfolk and hired workers; Crew adds the rail men |
| `lpTick(S, ev)`, `lpCmd(S, c, ev)`, `lpTap(x, z, hit)` | Play | sim tick, commands, input | |
| `lpPose(S)` | Play | renderer, `pixFocus` | `{ x, y, z, f, act, tool?, riding? }` or null when not on the line |
| `lpHud()` | Play | the HUD | the line's top bar, Join and Step out, the games' overlays |
| `dvRows()` | F | the dev panel | rows; Play adds its two buttons through `dvAddRow(id, label, onTap, state)` |
| `hwTick(S, ev)`, `hwDrawList(S)`, `hwCheckSaveShape` | Town | sim tick, renderer | the townsfolk's draw shape; inside a coach through `pbDrawList`'s shape with `stock` |
| `pbPunchBy(S, stock, seat, who)` | lead, in P's section, for Town | Town | punches as a worker, same counts |
| The D31 queue | D31's builder; the lead adds `claim` | Town | `frQueue(S)` `[{ id, item, from, to, claim }]`, `frQueueClaim(S, id, who)`, `frQueueDone(S, id, who, ev)` (the names follow what D31 lands) |
| `tnTick`, `tnShop(S, id)` `{ stock, open, custom }`, `tnHome(S, who)` `{ pay, mood }`, `tnRoomOpen()` | Town | sim tick, renderer, Look cards | |

### 11.5 The builders

| Owner | Builds | May call | Checks (new) | Done when |
|---|---|---|---|---|
| **Foundation** | 11.3 | anything; edits shared sections | `check-d32world.js` (the line's tables and totals: 192,800 wu; the same country twice from a seed and another from another; clearances of the camp, the muster and the standing work train; the two runs only with the line on; a v19 save loads with the line off and hashes as recorded; the clock's rate and the player's real speed), `check-worktrain.js` (out and back on time over three days, p1 and p4 not delayed, supplies topped up, Sunday), `check-linerender.js` (the line drawn at six places and three zooms in portrait and landscape; frame under 8 ms; chunk rebuilds as a front passes; no edge in view at scale 1; screenshots `d32-line-*.png`) | `npm test` passes; with `?dev=1` and a crew of 30 the stand-in crew builds for three days, the view switches both ways, a save made on the line reloads to the same hash |
| **Crew** | section 3 and 4: the men, the foreman's shares, tiring, the meal, tools, the walk to and from the train, the camp, the head count | `lnWork`, `lnOpenWork`, `lnSpot`, `lnTrain`, `lnHours`, `rngFor`, `hcRoll`, the town graph for Saturday and Sunday (stage 3) | `check-crew.js` (every man's states through a day; no two men on one spot; nobody works without his stage's tool; the meal; the same day twice and after a reload; **30 men finish in 13 to 15 working days and 5 men in 5.5 to 6.5 times that**, by `cwSimDays`; under 0.1 ms a tick), `check-camp.js` (tents by crew size, a cot each, the camp's day, the head count right when a man is left on the line, with townsfolk counted) | both pass; a day watched from the line shows six gangs at work with the right tools |
| **Play** (stage 1) | riding out and back (1.6), walking among the men (straight walks in the corridor, round the train's cars; tap a man or a gang for a Look card: name, stage, stamina), the line's top bar, the dev panel's two buttons | `lnSetView`, `lnTrain`, `lnFronts`, `cwGang`, `cwDrawList` for picking, `dvAddRow` | `check-lineplay.js` (ride out with the train and at once, back both ways, a save and reload mid-ride and on the line, the station's day goes on behind, taps and walking by touch in portrait and landscape, no console errors; screenshots) | passes; the designer can ride out, walk the work site and come back on a phone |
| **Play** (stage 2) | 7.1 and 7.2 | `lnWork`, `cwBoost`, `cwGang`, the lesson system | `check-linegames.js` (each game by synthetic touches at good, fair and poor timing gives the q expected; the sim's cap holds against a flood of commands; the lift on and off; stepping out mid-action leaves no tool or tie in the air; replay gives the same hash), `check-linelessons.js` | both pass |
| **Town** (stage 2) | 7.3; the away figures with the lead | the D31 queue, F's spot rules and times, `pbCarStatus`, `pbPunchBy`, `tfAt`, the walk grid's paths, `hcRoll` | `check-hired.js` (a day with the player away and 2 punchers, 3 loaders, 1 delivery man: everything punched, unloaded, loaded and delivered within the day; with none hired the counts of 7.4; the player and a worker never hold one good; `itemAudit` every hour; the same twice) | passes; `check-d27-day` still passes with no one hired |
| **Town** (stage 3) | section 8.1 to 8.4 | the town graph, `tfPlans`, F's delivery events, `pbOnArrive` for travellers | `check-bigtown.js` (everyone has a role, a home and a workplace and is in bed at the head count; nobody walks through a wall), `check-rooms.js` (every building opens and shuts by the three triggers, one at a time; people indoors drawn and sorted; frame time), `check-towneconomy.js` (a week of full deliveries: every shop open and every household paid; a week of none: shops shut by day 3, moods fall; travellers' custom) | all pass |
| **Art** | section 10, in three batches | `proto-layout.json` | the pipeline's review sheets; `check-atlas.js` (every key the code asks for exists; the budget) | each batch embedded under the budget, the review sheets shown to the lead |
| **The lead** | merges; `pbPunchBy`, the queue's `claim`, the walk grid's rooms; the far town and fading buildings with Foundation's owner | | `check-d32-day.js` (three line days with 30 men from a new game through the dev commands, the player riding out on day 2 and joining in from stage 2: fronts, supplies, head counts, the station's figures while away, the same twice, a mid-day save; frame times; screenshots of every stage of work, the camp at night, the meal) | every stage's checks and `npm test` pass before a push |

### 11.6 Keeping merges clean

- New code only in the owner's new sections; names only with the owner's prefixes; one store each.
- Constants a neighbour needs are read through the interface functions, never copied.
- `index.html`'s atlas block is generated: the artist commits only to `tools/pixelart/`, the lead runs `build.py`
  and `embed.py` once per merge.
- DEV_NOTES: each builder writes its own paragraph under "D32"; the lead joins them and adds the new sections to
  "Sections of index.html".

## 12. Risks and provisional choices for the designer

Risks:

| Risk | Guard |
|---|---|
| The work train upsets the station's day (a block held, p1 or p4 delayed) | track 2 only, no levers, gated on the line being on; `check-worktrain.js` holds p1 and p4 to their times; fallback: the train is drawn leaving and arriving but not run as a D24 train |
| The slower clock breaks tuned checks | sim time is untouched; only the player's pace and action times move, behind one factor with a page switch back |
| The hired loaders against a job queue still being written (D31) | they use the queue's entries and F's placement rules, not the player's step machine; Town starts only after D31 is merged |
| Flat ground drawn as hills (a man "on" a rise is drawn at ground level) | mounds only outside the corridor; the rise is low (under a man's knee in the art) |
| Frame time on the line in the woods | corridor things only are sorted; the rest is baked; measured before Crew and Play build on it |
| The atlas outgrows 700 KB in stage 1 | the tighter index lands first; if not, 800 for stage 1 |
| Usage | each stage stands by itself; within stage 1 the order Foundation, Crew, Play means a stop after any merge leaves a playable game |

Provisional choices:

1. The line is 2,520 m (3,600u), straight, with the country in the fixed order of 1.3 (the seed moves only the scatter).
2. The ground is flat to walk on; hills, the rise and the cut are drawn.
3. The work train uses track 2 and the men board from the ground by a plank walk west of platform 1; times 05:50 to 06:20 and 19:15 to 19:35.
4. Sunday is a day of rest for the crew, so 14 working days are 16 days on the calendar. The other way: work every day.
5. A day on the line: work 07:00 to 12:00 and 13:00 to 18:00; a man rests 10 minutes in the hour.
6. Tents hold four cots; the camp is west of the town's west lane.
7. The longer day keeps the player's real walking and handling speed (he gets 1.5 times as much done per game hour); trains and townsfolk look calmer. The other way: everything slows together.
8. While the player is on the line a relief man throws the levers 10 minutes late; nothing else is covered unless hired.
9. Hired workers are slower than a good player (punchers 1.5 times, loaders 1.3 times his time).
10. Joining in: the player is worth 0.5 to 1.5 men by how well he plays, and lifts his gang by up to 15 percent.
11. The economy is counts only (stock, open or shut, pay, mood); no prices.
12. The far town is drawn and not simulated; the atlas budget rises to 850 KB at stage 3 only.
13. Dev mode is a row in Settings (off by default), kept in the browser, not in the save; what it sets is in the save.

## Lead's decisions on the designer's open points (2026-11-13)
1. Levers while the player is away: the relief man who throws them 10 minutes late (`awLeverTick`) is confirmed; the lateness counts against the player.
2. Longer day: the player keeps his real speed (pace and action times scaled by 1.5). Update the affected checks' expected times.
3. No Sunday rest: the crew works every day, so a full crew takes two calendar weeks, as the designer said.
4. Work train: as planned; engine first is an acceptable fallback if backing in is hard.
5. The Town builder starts only after D31 is merged; it uses D31's real queue names.
6. Camp rectangle: Foundation verifies and may move it.
7. No schema bump: every new store is optional, so the schema stays 19 and check-save's fixtures are not re-recorded.
8. Art direction for the wilds (designer): the same style as the station and town, extrapolated; visually dense and detailed but charming.
