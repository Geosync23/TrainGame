# Railhead: where the project is headed

Written 2026-11-14, at version 13 of the playable game, for whoever picks the project up next. It draws only on the
project's own records: `design-doc.md` (the design; its section 0 lists the designer's decisions D1 to D34, which win
wherever they disagree with the original text), `DEV_NOTES.md` (how it is built), the D32 plans in `plans/`
(`d32-journey.md`, `d32-tech.md`, `d32-plan.html`), `plans/d27-choices.md`, `plans/handover.md` and `backlog.md` (the
todo list). Where those records do not say what comes next, this page says so: that is the designer's call, not
something to guess.

Two people make this game: **the designer** (owns the vision and every decision about what the game does or looks
like) and **Claude** (a lead session that plans, builds with helpers, tests, and asks). House rules are in
`CLAUDE.md`; the most important for this page: plan before building and wait for a yes, one piece at a time, and every
question for the designer goes on an interactive survey page with the answers saved on the page.

## 1. The destination

Railhead is a railroad game for phones set in the American West in 1866, in a fictional territory, the Calder Valley.
You are a person in the world, not a hovering camera: you walk the platform, throw switches, haul freight, check
tickets and ride out to the end of track. You start as the only worker at a tiny station and end with a small network
of lines and towns feeding a busy central station.

The five pillars (design-doc section 1):

1. **Hands on, then hands off.** Every job starts as something you do yourself. Hiring people lets you hand jobs off,
   and how good the people are shows in how well the work is done.
2. **Everything is accounted for.** Every person and every item is a real, countable thing that moved through your
   station. Nothing appears from nowhere.
3. **The station is the heart.** Most play happens at the station and its towns. The line is where the game is headed,
   and you can visit it any time.
4. **Readable simulation.** You can see cause and effect: shortages, queues, tents and piles are visible, and any
   person or item can be looked at to see its story.
5. **Between cozy and tense.** Pressure comes from timing, distance and money, never disaster. Trains never crash; they
   wait.

Out of scope by design: colony-sim drama, crashes, driving from the cab, combat.

The game is meant to grow through four phases, each ending at a milestone the player can see (design-doc section 3,
"Progression phases"; they are not hard gates):

| Phase | What you do | Ends when |
|---|---|---|
| 1. Station hand (the whistle-stop) | Meet every train, throw every switch, unload, sort, sell tickets, deliver by handcart. Pressure: two trains close together with one worker. | You hire your first freight handler and clerk, and the first spur is surveyed. |
| 2. Agent and foreman (the first line) | Less hauling, more directing: survey, run the daily supply train, keep the construction crew supplied. | The first construction camp is founded as a town. |
| 3. Superintendent (the network) | Walk the hub to spot problems; plan single-track timetables with meets, open resource towns, grow the station. | A stationmaster runs the hub well enough that you can live elsewhere. |
| 4. Network builder (the late game) | Step in where a crisis hits; big projects such as double track, interlocking towers, a major river crossing. | The line reaches the Silver City terminus (a soft ending; play goes on). |

The design doc turns this into nine milestones, M0 to M8 (section 22): M0 foundations and art kit; M1 the
whistle-stop (working the station alone must be fun for 20 minutes); M2 the living town (named citizens arrive by
train, towns grow or stall from what you deliver); M3 staff and delegation; M4 building the line; M5 the network; M6
hub growth and the late game; M7 content, audio and polish; M8 an early access release.

Several of the designer's later decisions change the picture of the finished game, and they rule over the original
text: phones and touch first (D1), one HTML file (D2), the avatar you move with one finger (D6, D7), track built by
hand spike by spike (D10), and, since D25 and D26, **pixel art from one fixed view** in place of the 3D low-poly look.
The designer's words on D32 also matter for the road ahead: the game still starts as a station; "progression later".

## 2. Where we are on that road

The short version: the game changed shape along the way. M0 and M1 were built as planned, in 3D with three.js. After
playing them the designer asked for a bigger scale and many fixes (D14 to D22), then reworked the station (D24), and on
2026-11-10 said "the game became too much too fast ... we just need to streamline first" (D25). Since then the game is
a **small prototype station drawn in pixel art** with its own renderer, and everything built before it is parked
(switched off, kept in the file). The work since (D26 to D34) has deepened that prototype rather than followed the
milestone list: a fuller working day, a line being built east of the station by a simulated crew, hired hands and a
bigger town. So parts of M2, M3 and M4 now exist in a simpler, prototype form, while money, contracts, ordering,
building track by hand and the second station are parked.

| Milestone | Status | What exists |
|---|---|---|
| M0 Foundations and art kit | **Built** (in 3D, now parked) | Signed off at the end-of-M0 review (D11). The 3D test yard opens with `?world=yard`. The sim core (seeded randomness, commands, saving, the state hash) still runs the prototype. |
| M1 The whistle-stop | **Built, then set aside** | Built in 3D with the hub and Willow Ford, money, contracts, the investor tutorial, hand-building track. The designer judged it "not yet" (D14); the fix round (D15 to D22) was built. The M1 gate became the designer's own judgement (D23), and was never passed before D24 and D25 changed course. Opens with `?world=start`; the D24 hub with `?world=hub`. |
| (D25 to D31) The prototype station | **Built, current game** | Not a design-doc milestone: the designer's streamlined station. Pixel art, one fixed view, a fixed day of eight railroad trains, switches by one lever frame, tickets punched on board, freight unloaded step by step onto a cart, an evening delivery and pickup run to the town's shops, lessons, an end-of-day summary. No money. |
| M2 The living town | **Partly built** (simpler than the design) | D32 stage 3: 41 townsfolk in 26 households, each with a role, home, workplace and daily round; every building enterable; an economy of counts only (shop stock fed by deliveries, open or shut, pay, moods, travellers' custom). Not built: arrivals by train, consumption and satisfaction as in section 11, leaving, the developer building houses, the newspaper, per-town ledgers. The approved M2 plan (D23) was overtaken by D24 and D25. |
| M3 Staff and delegation | **Partly built** | Hired ticket punchers, cargo loaders and delivery men (D32 stage 2), set in dev mode, who share the work and cover for the player while he is away. Not built: skills and mistakes, the task queue, shifts, payroll, the Staff panel, the stationmaster. |
| M4 Building the line | **Partly built** | D32 and D33: a 2,520 m line through nine regions to a far town, a simulated crew of 5 to 30 men in six gangs, the work train, the camp and the nightly head count, and the player joining in (six small games, played in the world since D34). Not built: survey and route choice, terrain costs chosen by the player, supplies tied to freight (the work train is always full), camp rations, moving day, camp followers, founding a town, telegraph wire. The far town is drawn, not simulated. |
| M5 The network | **Not started** | |
| M6 Hub growth and late game | **Not started** | |
| M7 Content, audio and polish | **Not started** | No sound at all yet. |
| M8 Early access release | **Not started** | |

Design-doc sections that are ahead of the build (they describe a game the code does not have yet, or no longer has):

- **Sections 5, 16 and 17 (controls, UI, art):** written for a 3D, turning camera and desktop first; D1, D6, D7, D25
  and D26 replace much of them. Section 17's low-poly art direction is replaced by the pixel style.
- **Sections 6 to 8 (track building, rolling stock and turning, timetables and dispatch):** built in 3D for M0 and
  M1 and parked; the prototype runs a fixed hand-made day with no timetable editing and no track building.
- **Sections 9 and 10 (cargo with waybills, the Overland, money and contracts):** goods are handled in the prototype,
  but money, contracts, ordering and the Overland are parked.
- **Sections 11 and 12 (towns as an agent simulation, businesses and production):** only the counts economy of D32
  stage 3 exists.
- **Section 13 (building the line):** the crew and the work exist; survey, the stockpile, camps' supplies, moving day,
  camp followers and founding a town do not.
- **Sections 14 and 15 (staff, the hub and station building):** only the hired hands exist.
- **Section 18 (audio):** nothing built.
- **Section 19 (technical architecture):** still followed for determinism, saving and testing; the stack is one HTML
  file (D2), and the current game draws on a flat canvas, not with three.js.
- **Sections 20 to 22 (data model, tuning tables, milestones):** written for the original plan; the milestone list
  above shows how far that plan still describes the work.

Note for the next session: `CLAUDE.md` still opens with "3D, seen from an isometric view, made with three.js". That
describes the parked worlds; the current game is the pixel prototype. Changing that line is the designer's call.

## 3. Next steps, in the lead's suggested order

Sizes are rough, from how long similar pieces took before: **small** is one helper for part of a day; **medium** is
one builder for about a day (as D33 and D34 each were); **large** is a planned round with several builders and
artists (as D32 stage 3 was). Under the house rules anything bigger than a small fix starts with a short plan the
designer agrees to.

| # | Step | Why it is next | Size | The designer decides first |
|---|---|---|---|---|
| 1 | **Fix "hold to walk does not work on the line"** (backlog, reported 2026-11-14 after version 13). Holding a finger down walks at the station but not out on the line. | The designer hit it in play; walking is the most basic control (D6, D7: press and hold walks towards the finger). | Small: the line's walk is Play's own code (`lpTap`, `lpWalk`, `lpWalkTick`), which the notes only describe as tap-to-walk. | Nothing: D6 and D7 already say how it should work. |
| 2 | **Fix "the rail workers cannot be seen leaving their tents and boarding"** (backlog, 2026-11-14). The work train stands 06:00 to 06:22; the men should be seen walking from the camp and getting on. | It is the very thing D33 (2) asked for, and the designer still cannot see it. check-d33 says it sees the men board, so the cause must be found in real play first. | Small to medium, depending on the cause (the men's hours, the train's times, where the view is or what card is open at 06:00). | Only if the fix means moving the men's hours or the train's times (D33's provisional times, section 4 below). |
| 3 | **The review survey owed to the designer** for the provisional choices of D32 (stages 1 and 2), D33, D32 stage 3 and D34: one interactive page, a choice per question with the suggestion marked, a note box, answers saved on the page (house rule). The handover note says it is owed; the list to put on it is section 4 below. | Many choices made on the designer's behalf since 2026-11-13 are still unconfirmed, and the next pieces of work build on them. The house rule also says to notify the designer's phone when work waits on an answer. | Small to medium (the page and pictures; the answers then become a decision row in design-doc section 0). | It is the designer's decisions. Then the changes the answers ask for, each planned before building. |
| 4 | **Finish what the D32 plan still lists** (details below the table): write `tests/check-d32-day.js`, and the art the plan asked for that was not made. | The plan (plans/d32-tech.md 11.1 and 11.5) makes this check the lead's own part of D32; every stage of the plan is otherwise built. | Small to medium (the check); small (each art item). | Nothing for the check. The art (icons, the far town at night, a drawn foreman) only if the designer still wants them after the survey. |
| 5 | **The backlog's rough edges**, by area (backlog.md). | Small fixes the house rules collect there rather than fix on the side; some touch what the designer sees often (people walking through each other, the Closed board seen through a building, the work train walkable at the station). | Each small. | A few are design choices (where the work train stands, the near edge's place, the junction's points art): ask on the survey. |
| 6 | **The larger unbuilt design-doc systems** (details below). | The designer said on D32: "The game still starts as now; progression later." Everything new since D32 is reached through dev mode, so the next big question is how a real game grows. | Large, each. | **Everything**: which system, in what order, and in what form. The records do not say what comes after D34. It is the designer's call. |

### What the D32 plan says is done and what remains

The plan (`plans/d32-tech.md` 11.1, approved on `plans/d32-plan.html`, journey in `plans/d32-journey.md`) has three
stages plus the lead's merging and check.

| Plan step | Status |
|---|---|
| 1. Foundation (the line, the work train, the slower clock, dev mode, saving) | Done 2026-11-13. The work train became a scripted run (plan section 12's fallback); no schema bump (lead's decision 7). |
| 2. Crew, Play and Art at once (the men, the camp and head count; riding out and walking the line; the first art) | Done 2026-11-13, published as version 10. |
| 3. The lead merges, turns the dev rows on and **writes `check-d32-day.js`**; the designer reviews stage 1 | Merged and published. **`check-d32-day.js` was never written** (it is not in `tests/`). The designer played stages 1 and 2 and answered with D33 rather than a review page. |
| 4. Stage 2: the join-in games and lessons (Play), hired station workers and the away rules (Town), art's second batch | Done 2026-11-13, published as version 11, with the wilds art of the nine regions (the journey). The games moved into the world in D34 (version 13). |
| (D33) One world: the line joined to the station | Done 2026-11-13, published as version 12. Not in the plan; asked by the designer before stage 3. |
| 5. Stage 3: the bigger town (homes, roles, rooms, the economy), art's third batch, the far town and fading buildings | Done 2026-11-14 and published with D34 as version 13. **Not reviewed by the designer yet.** |
| Art asked for by the plan but not made | `ui/closed_card`, `ui/purse`, `ui/face/0..2` (plan 10.5; stand-ins are used); night windows (`_lit`) for the far town; `ppl/foreman` (plan 10.1, stage 2: the foreman exists only as the crew's assignment rule, no drawn man). |
| Left for later by the plan itself | The far town "drawn, not simulated" (8.5, "not yet playable"); "the supply train is always full for now; tying supplies to freight comes with progression" (section 2 and the plan page). |

### The larger unbuilt systems, as the design doc lists them

None of these has a plan or a decision behind it today. They are listed so the designer can choose; the order below is
the design doc's own milestone order, not a recommendation.

- **Progression out of dev mode:** how a game gets its crew, its hired hands and its supplies without the dev panel
  (D32: "progression later"; the plan: supplies tied to freight "with progression"). Today a new game starts the line
  with 5 men and everything else is set in dev mode.
- **The rest of the living town (M2):** people arriving by train, needs and satisfaction, leaving, the developer
  building houses from delivered lumber and nails, the weekly newspaper (D23 had it come on the Saturday Overland,
  now parked).
- **Staff and delegation proper (M3):** skills that show in the work, a task queue every job goes through, shifts,
  payroll, the stationmaster, and the hired hands' place in the game rather than dev mode.
- **The rest of building the line (M4):** survey and route choice, supplies that can run short, camp rations, moving
  day, camp followers, founding a town (the far town "Prospect" is only drawn).
- **What was parked in D25 and might come back:** money, contracts and ordering, telegrams, wood and water, building
  track by hand, No. 1 and Willow Ford, the Overland (section 6 below). D25 parked them, not deleted, because "the
  prototype is the game for now".
- **M5 to M8:** the network, hub growth, content, audio and release.

## 4. Decisions waiting on the designer

Every provisional choice below was made on the designer's behalf and has not been reviewed. Under the house rules
they go to the designer as **one interactive survey page** (a choice per question, the current choice marked as the
suggestion, a note box, answers saved on the page), and the answers then become a row in design-doc section 0. Where
the notes name no alternative, the column says so.

### The four the lead asked to be sure are on the page

| Choice made | The alternative | Where it lives |
|---|---|---|
| The far town is called **"Prospect"** (the artist painted it on the depot and the name board; it was "Cedar Bluff" in the Rooms builder's code). | Any name the designer gives. | `far_d32.TOWN_NAME` in tools/pixelart (one constant; the art must be rebuilt); the last spike's card (`ftEvent`). DEV_NOTES "Rooms and the far town", choice 9, and "Joined". |
| **A crew of 5 now takes 98 working days** to reach the far town, 7.5 times the 30 men's 13 to 14 (before D34: 77 days, 5.9 times; the D32 plan said "about six times"), because a rail needs four men at once and a tie two. | Allow a smaller unit for a small crew, or accept the longer time. The check's window is 7 to 8 times with D34 (5.5 to 6.5 with `?d34=0`). | `CW.NEED`, `CW.UNIT_MIN`, `CW.UNIT_MIN_SMALL`, `cwAssign` in "the crew (D32)"; DEV_NOTES "D34", "The simulation's honest minimums". |
| **Joining in does not speed the line.** A tie, a rail and a spike are whole things (0.6 m, 4.55 m, 0.15 m of front); a spike round (4 to 7 seconds at 1x) is one spike, far less than a navvy's pace, and his mates' own simulated work stops while they work with him. His gain for the line is the lift on the men near him (up to 1.15 times). | The panel games' time-based worth (0.5 to 1.25 men per round), still used for clearing, digging and rock. | `LGW`, `lgWDone` in "on the line (D32)"; DEV_NOTES "D34", provisional choices. |
| **The men each game needs:** a tie takes two men, a rail four, a spike one or two; clearing, digging and rock one. With too few men at hand Join is refused with a reason. | None given in the notes (D34 asked for "a real man of that gang" where the job needs one; which jobs need one was the lead's reading). | `CW.NEED = [1, 1, 1, 2, 4, 1]` in "the crew (D32)"; DEV_NOTES "D34", "The men each task takes". |

### D32 stage 1: the line, the work train, the crew (Foundation, Crew, Play)

| Choice made | The alternative | Where it lives |
|---|---|---|
| The line is 2,520 m (3,600u), straight, the same country in every game; region lengths as in DEV_NOTES (the canyon short because it shares the plan's rock metres). | Longer regions (changing the cost table's totals). | `LINE.SEGS`, `LINE.RUNS` in "the line (D32)"; DEV_NOTES "D32", "The foundation"; d32-tech section 12 (1). |
| The ground is flat to walk on; hills, the rise and the cut are drawn. | None given. | d32-tech section 12 (2). |
| The corridor: the far border 9.5u north of the track, the near edge 11u south (the near artist drew for 9u; Crew's dinner spot and piles fill the ground out to 10.4). | A near edge at 9u, after moving the dinner spot and piles. | `LINE.BORDER`, `lnBorder`; DEV_NOTES "The wild country". |
| The muster between the water tower and the lever frame, the plank walk at x -39.3, the camp at the plan's rectangle. | None given. | `PROTO` muster and camp; DEV_NOTES "D32", Foundation's provisional choices. |
| The work train is a scripted run, not one of the railroad's trains; it waits for a clear road in the evening; full loads going out. | A real railroad train (the plan's body; set aside because of its reach into other code). | `wtTick`, `PROTO_SCHEDULE_WORK`; DEV_NOTES "D32", "The work train". |
| The first day's double supplies; the supply train always full ("tying supplies to freight comes with progression"). | Supplies that can run short. | `S.ln.sup`; d32-tech section 2. |
| No Sunday rest: the crew works every day, so a full crew takes two calendar weeks (lead's decision 3). | Sunday rest, 14 working days over 16 calendar days (d32-tech section 12 (4)). | `lnHours`; d32-tech "Lead's decisions". |
| Work 07:00 to 12:00 and 13:00 to 18:00; the noon meal at a dinner spot on the work site, not at the train. | The meal at the train (an hour's walk for the clearers). | Crew's judgement calls; DEV_NOTES "The crew, the camp and the head count". |
| The slower clock (a game minute is 1.5 real seconds, a day 36 minutes) with the player keeping his real speed (lead's decision 2). | Everything slows together. `?clock=7.5` and `?pk=1` give the old rate and pace. | `WORLDS.proto.clock`, `PROTO.PLAYER_K`; d32-tech section 6 and section 12 (7). |
| The crew's pace factor `CW.K` 1.5 (30 men finish in the middle of day 14), the clearers' lead, the three files over the trestle, tool swaps at the tool row. | None given. | `CW` in "the crew (D32)"; DEV_NOTES Crew. |
| Tents hold four cots; the camp is west of the town's west lane. | None given. | d32-tech section 12 (6); `cpItems`. |
| A tap on a man opens his Look card rather than walking; riding out is refused while he carries something or is in a coach; he steps down 3.4u south of the track at the crew car. | None given. | DEV_NOTES "Play, stage 1", provisional choices. |
| Dev mode is a row in Settings, off by default, kept in the browser; what it sets is in the save. | None given. | d32-tech section 5 and section 12 (13). |

### D32 stage 2: joining in, hired hands, the away rules (Play, Town)

| Choice made | The alternative | Where it lives |
|---|---|---|
| While the player is away a relief man throws each lever 10 game minutes late, and the lateness counts against the player (lead's decision 1). | Every train stands until the player comes back. | `awLeverTick`; d32-tech 7.4 and "Lead's decisions". |
| While away, a standing train leaves when its work is done and its time has come, or at the latest 10 minutes after; unpunched travellers ride free and count as missed; town goods not unloaded leave with the train; goods not delivered wait in storage. | None given. | `hwAwayTick`, `HW.GRACE_S`; DEV_NOTES "Town, stage 2". |
| Hired hands are slower than a good player (punchers 1.5 times his time, loaders 1.3); loaders carry by hand, never the hand truck or platform cart; the delivery man has his own cart and works in the evening only; the oldest good first. | None given. | "hired workers (D32)"; DEV_NOTES "Town, stage 2", judgement calls; d32-tech section 12 (9). |
| The join-in numbers: worth 0.5 to 1.25 men by how well he plays; the lift (at most 1.15, within 12 m, from an average of 60); the 4-minute cap; beats of 760 ms (digging) and 620 ms (spiking); timing windows 90 to 330 ms; the rake's 4 s. Still used by the D34 games. | None given. | `LG` in "on the line (D32)"; DEV_NOTES "Play, stage 2". |

### D33: one world

| Choice made | The alternative | Where it lives |
|---|---|---|
| The line's place: `D33.LX` 80, the junction at x 96, the yard limit board at 88, the wood from 96 to 192. | None given. | `D33` in "the line (D32)"; DEV_NOTES "D33", provisional choices. |
| The main line to the east turns away north-east into a wood and is lost under the trees; no points are drawn at the junction. | The new line branches off instead. | `pixBranch`, `pixBranchPose`; DEV_NOTES "D33". |
| A new game starts a screen into construction, with smaller gaps between the fronts. | None given. | `LINE.F0`, `LINE.GAP`. |
| The men's hours twenty minutes later (up 05:25); the work train in at 05:50, standing 06:00 to 06:22, the first train out. | None given (06:22 is set by the first passenger train at about 06:27). | `CW.UP_S`, `CW.EAT_S`, `LINE.T`. |
| A crew set in dev mode takes effect at once at any hour. | Send the train out again. | `lnCrewNow`, `cwResize`. |
| Boarding by a tap on the crew car; the bar's buttons kept as they were. | None given. | Play's `lpGate`, `lpGo`. |
| The work train stands with its engine 8 m behind the spiked front, so the crew car is a good walk from the gangs. | The train closer, or the dump moved up (backlog). | `wtTick`; backlog. |

### D32 stage 3: the bigger town (Town, Rooms, joined)

| Choice made | The alternative | Where it lives |
|---|---|---|
| Ten new houses: five between the D27 houses, five on a third lane west of the town; four cabins, four frame houses, two two-room houses. | No third lane east (the dry wash is there). | TOWN27 rows "D32 stage 3 (Town)"; DEV_NOTES "The bigger town: the sim", choice 1. |
| The 22 new people, their names (all the builder's), roles, homes and families. | None given. | `TN_PEOPLE`; choice 2. |
| The routines' times (shops 07:30, clerks 09:00, hands 07:00, the cook 06:00, the barmaid 16:00 to 21:15, home by 21:30). | None given. | `TN_ROUTINES`; choice 3. |
| Stock: 3 a good (6 a big one), daily use by shop, a cap of 12, two days' stock at the start; one morning of empty shelves, shut on the second. | None given. | `TN`; choices 4 and 5. |
| Pay 2 coins an earner a day, upkeep 1, a purse 0 to 20 starting at 8; the preacher, teacher and sheriff always paid. | None given. | `TN`; choice 6. |
| A shut shop's keeper waits at its door all day; the unhappy stand at the square's ends and the street's foot. | None given. | Choices 7 and 12. |
| Travellers: 1 in 3 into town, half to the hotel and half to the saloon, an hour, 1 in 10 of the hotel's overnight; their custom keeps those two open. | None given. | Choice 8. |
| The rail men: Saturday a third to the saloon; Sunday evening prayers (a quarter), not the morning service, because the crew works Sunday morning. | None given (the morning service would change the line's pace). | Choice 9. |
| The Closed board stands in the street at the shop's steps. | On the boardwalk (it hid under the awnings). | Choice 10; backlog (seen through the east row). |
| A tap on a townsperson or a home opens the Look card instead of walking there; a tap on a shut building opens it, a tap on an open one walks him in; it stays open until he walks 8u away or taps elsewhere; one building at a time. | None given. | `onTap`, `rmTap`; Town choice 11, Rooms choices 2 and 3. |
| The fade: the whole building fades in place over 0.25 s, leaving a 0.45u sill; back walls cut at the eaves (a doll's house look). | Keep the far walls to their full height. | `RM.FADE_S`, `RM.SILL`; Rooms choice 1. |
| The station's waiting room is enterable; the freight house and the lever frame are not. | None given. | Rooms choice 4. |
| The furniture of each room, the solid pieces, the spare places to stand; four to a pew (the church seats 48). | None given. | `RM_KIND`, `RM_HOME`; Rooms choice 5; backlog. |
| Keepers who live over their shop go upstairs 20:00 to 06:30 (the barkeep 23:30 to 13:00); at home in bed 21:00 to 06:00. | None given. | Rooms choice 6. |
| The tents open like buildings but their walls do not stop walking. | None given. | `rmTents`; Rooms choice 8; backlog. |
| The far town's layout and buildings, the fields, a dozen townsfolk; the cheer is a card plus the town on the platform; the work train stops running once the line is done. | None given. | "the far town (D32)"; Rooms choice 9. |

### D34: the join-in games in the world (besides the four above)

| Choice made | The alternative | Where it lives |
|---|---|---|
| A poor round of a tie, a rail or a spike is not done (try again). | None given. | DEV_NOTES "D34", provisional choices. |
| Spiking alone: six blows at 1,240 ms; with a mate, turn about at 620 ms. | None given. | `LGW_GAMES`. |
| A length's two rails go down one at a time, north first; the spikers may spike the north rail before the south one is down. | None given. | `lgWDone`. |
| A touch within about 120 CSS px of the work belongs to the game; further off walks him away and leaves. | None given. | `lgW` in "HUD and panels". |
| The line's bar is hidden while he works; a light chip under him has Leave. | None given. | `#lgW`. |
| The diggers nearest him swing on his beat (drawing only). | None given. | `lgMateDraw`. |
| The foreman's unit rule (half an hour of work a man before a new unit forms; 10 minutes for a crew under ten), the 5-man pace window (7 to 8 times) and the little team's bound (70u). | None given. | `CW.UNIT_MIN`, `CW.UNIT_MIN_SMALL`; check-crew, check-d33. |
| While carrying, he and his mates are not stopped by the work train's box; on the trestle he may squeeze along the deck past the cars. | None given (a proper walk past the cars is in the backlog). | `lpWalkTick`, `lpTrainBox`. |
| The panel games are kept, parked behind `?d34=0`. | (The designer asked for this.) | `D34` switch. |

### Older choices that may still be open

- **D31 judgement calls** (DEV_NOTES "D31", "Judgement calls"): the cart 3.4 by 1.6u; goods stacked mixed four high;
  a good goes on the cart only when it stands within 8u of the door; a tap within 16 px of a marked good takes it;
  marks shown within 16u; the pace applies to pushing the cart too. The designer answered D31's questions but these
  calls are not recorded as reviewed.
- **D30**: when the player rides a moving train his car can step a pixel against the view; left as is because the
  camera is the designer's decision (DEV_NOTES "D30", handover).
- **D27**: reviewed in D29 (most kept as built); the full list is `plans/d27-choices.md` if anything there needs
  checking again.
- The handover lists the D24 and D25 review pages (answers in `answers/d24-review`, `answers/d25-review`) as waiting
  on the designer; nothing records whether they were answered before D25 and D26 changed course.

### The designer's own notes that may never have been acted on

Found on 2026-11-14 when the survey answers were copied into `plans/answers/` and compared with design-doc section 0.
Each should be put to the designer again rather than assumed.

| Where the designer wrote it | Their words | What the records show |
|---|---|---|
| Line Building Questions, the last stage of laying | No choice made; note "Lwt me read what I wrorw" | D32 ended the stages at spikes, with no telegraph. The designer was not shown their original words or asked again |
| Line Building Questions, while you are out with the crew | "Dev mode needs to let ypu hire them right away" | D33 makes a crew size set in dev mode take effect at once. Nothing says hired station workers can be hired at once in dev mode; check it |
| Line Building Questions, the country along the line | "Variety from the start but everything else from the 1st option" | D32 records varied country with brush, a creek bridge and a low cut. Probably acted on, but easy to misread |
| Station Rework | "yes but ground work for town stuff if needed we will do that in m2" | D24 says lay groundwork for the town where cheap; nothing records that it was done. Since overtaken by the bigger town |
| The four review pages never answered (fix round, station rework, prototype, art round plan) | No answers saved | Their suggestions (far switch levers nearer, a bigger handcart, the handcart back in the shed each morning, contract offers sooner) were never ruled on; later feedback came in chat (D20, D26, D29) |

## 5. Open design questions

Still open in design-doc section 23 (defaults hold until answered):

| Question | Default in the doc |
|---|---|
| **Indigenous presence:** how the game acknowledges the nations whose land the line crosses (treaty land the survey routes around, named neighbouring communities as trading partners, or a note in the setting only). | Route around treaty land shown on the map, no conflict. |
| **Satellite industry spur:** is one industry spur per satellite town an acceptable exception to the two-track rule? | None given. |
| **Remote management:** can the office panels be used away from a desk before a stationmaster exists? | No. |
| **Women in railroad roles** (telegraphers and station agents sometimes were). | Yes, any role can be filled by anyone; laborer roles mostly male by the immigrant mix. |
| **Fail state:** receivership instead of game over, or reload on bankruptcy? | None given. |
| **Ending:** is reaching Silver City the right soft ending, and a second region after 1.0? | None given. |
| **Hand-placed or generated map:** one handmade region for 1.0, or a seeded generator? | One handmade region. |
| **Train crews as visible people:** engineers and firemen in the cab, and walking to the roundhouse at shift change? | In the cab yes; walking no (costly). |
| **Controller support.** | Out of scope for 1.0; revisit after M7. |
| **The starting world's layout** (M1 package 9). | Answered in part by D14 and D15 (everything kept, scaled up); since D24 and D25 the starting world is a different place, so this may simply be closed. The designer's call. |

Questions raised by the work since D32 that the records leave to the designer (not in section 23 yet):

- How progression brings the line, the crew, the hired hands and the supplies into a normal game, instead of dev mode
  (D32: "progression later").
- Whether and when anything parked in D25 comes back (money, contracts, Willow Ford and others; section 6).
- The richer art style "kept on deck" since D25 and D26: whether and when to use it.

## 6. Parked things that could come back

House rule: cut things are parked, never deleted, and code already built stays switched off. Each of these still
lives in `index.html` and can be seen with the switch shown (switches are added to the page's address, for example
`index.html?d34=0`).

| What is parked | Since | The switch |
|---|---|---|
| The 3D worlds: the M0 test yard, the M1 start (hub and Willow Ford), the D24 hub | D25 | `?world=yard`, `?world=start`, `?world=hub` |
| Inside those worlds: money, the work board and contracts, ordering, telegrams, wood and water, the tutorial, No. 1, Willow Ford, the Overland and the interchange | D24, D25 | The prototype keeps them off (`WORLDS.proto.parked`; the hub's `worldParked` flags); seen in the 3D worlds above. No switch brings them into the prototype. |
| The M0 instant track build | D10 | `?debug=1` |
| Travellers giving up in the ticket line | D20 | `PAX.GIVE_UP_S` (0 now) in the passengers code |
| Punching tickets in a line at the coach door (D25) | D27 | `?doorline=1` (or `?d27=0`) |
| The D25 prototype flows (the day before D27's board, handling, town and lessons parts) | D27 | `?d27=0`; one part at a time with `?d27=board,handling` and similar |
| The full D27 goods list and T's original schedule | D27 (lead's decisions) | `?goods27=full`, `?sched27=t` |
| The D27 evening's first rules (the player carries goods into shops, the longer handling times, the plough unloaded by the player) | D27 (lead's decisions) | Constants `FR.KEEPER`, `FR.TIME_K`, `FR.COLLECT` |
| Two lever frames, one at each end of platform 1 | D29 | `?levers=two` |
| D27's handling and punching times and drawing | D29 | `?d29=0` |
| Trains drawn car by car (before the smooth trains) | D30 | `?d30=0` |
| D29's taps, pace and see-through patch | D31 | `?d31=0` |
| The big cart | D31 | Only in the art tool: `CART_D27` in `tools/pixelart/goods27.py` (rebuild the art) |
| The faster clock and the old pace | D32 | `?clock=7.5`, `?pk=1` |
| The separate line screen with its fades (and the panel games with it) | D33 | `?d33=0` |
| The join-in games in an inset panel | D34 | `?d34=0` |
| The D27 town of 19 people and 8 houses (before the bigger town) | D32 stage 3 | `?tn=0` |
| Buildings shut, townsfolk vanishing at their doors (before rooms) | D32 stage 3 | `?rooms=0` |
| No far town at the end of the line | D32 stage 3 | `?fartown=0` |
| Line building and hiring in a normal game | D32 | Not parked but behind dev mode: Settings > Dev mode, or `?dev=1` |
