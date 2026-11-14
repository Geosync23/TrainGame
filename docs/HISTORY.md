# Railhead: the history of the project

Written 2026-11-14 for the move of the project to a new account. It tells where the project came from: what the designer asked for at each stage, what was built, what was learned and where the detail lives. It is an account, not a design: the design is `design-doc.md` (above all its section 0, decisions D1 to D34), the working notes are `DEV_NOTES.md`, and the rules for working are in `CLAUDE.md`.

Sources used: `design-doc.md` (section 0 and section 22, the milestones), `DEV_NOTES.md` (its parts and its "Next" section), `plans/handover.md`, the files in `plans/`, the git history (584 commits, 2026-10-31 to 2026-11-14) and the original design document `docs/Railhead_GDD_original_2026-10-31.pdf`. Where the sources disagree or a date is unclear, this document says so (see "Things the sources do not agree on" at the end).

A few words used throughout:

- **The designer** owns the vision and every design decision. **The lead** is the Claude session that plans the work, hires helpers, reviews and merges. **Helpers** (also called builders, artists and integrators) are workers hired inside the lead session, each in its own copy of the repository (a git worktree).
- **D1, D2, ...** are the numbered decisions in `design-doc.md` section 0. Careful: in M1 round D the builders were also named D1 to D7 (see the M1 section); those names are not decisions.
- **A survey page** is a published web page with one question per choice, the lead's suggestion marked and a note box; the designer's answers are saved on the page itself (in its database, collection `answers`, one document per page, for example `answers/m1-review`).
- **Parked** means switched off but kept in the file. The designer's rule (CLAUDE.md): cut things are parked, never deleted. Most parked work can be brought back with a switch in the page address, such as `?d33=0`.
- **u** is the game's distance unit. **A check** is a test script in `tests/`; `npm test` runs them all.

---

## 1. Summary: the arc of the project

1. On 2026-10-31 the designer wrote a 76-page design document for "Railhead": a 3D, low-poly, isometric railroad game set in 1866, desktop first, where you play one person who grows a station into a rail network over nine milestones (M0 to M8).
2. On 2026-11-01 the first decisions turned it into a phone game in one HTML file (D1, D2), played by walking a character with one finger (D6, D7).
3. M0 (the foundations: walking, switches, a train, track laying, terrain, people, debug tools) was built the same day by a lead and six helpers, and signed off (D11). The designer then ruled that track is built by hand, spike by spike (D10).
4. M1, "the whistle-stop" (working the hub station and a second station, Willow Ford, alone), was built in four rounds of helpers on 2026-11-01 and 2026-11-02 (D12, D13).
5. The end-of-M1 review (D14) said "not yet": the world was too small and too fiddly. A fix round grew everything except people 1.6 times (D15), widened the platforms, slowed the clock and added crossings, a cutaway view into cars and boards in the world (D15 to D19).
6. Play-tests then asked for manual switches, work and schedule boards, clearer guidance and explanations as things happen (D20 to D22). An M2 plan (the living town) was approved (D23) but never built.
7. On 2026-11-06 the designer reworked the station (D24): the hub became the whole game, every train is seen coming in, tickets are checked on board, and Willow Ford and the outside "Overland" railroad were parked.
8. On 2026-11-10 the designer stepped back ("the game became too much too fast"): a small streamlined prototype, drawn as real 2D pixel art from one fixed view, became the game, and the 3D game was parked whole (D25, D26).
9. From 2026-11-11 the prototype grew back step by step, each step played by the designer: the working day made visual (D27, built overnight), then smoother handling, one lever frame, smooth trains and play-test fixes (D28 to D31).
10. On 2026-11-13 the designer asked for line building (D32): a simulated crew of 5 to 30 men who build a new line through nine regions of wild country, with join-in games, hired station workers and a bigger town.
11. After playing it, the designer asked for one world (D33, the line joined to the station) and then for the join-in games to be played in the world rather than in an inset panel (D34). Both were built by 2026-11-14 and published as version 13 of the playable link.
12. At the time of writing, the designer has not yet reviewed the bigger town (D32 stage 3) or D34; a review survey for their provisional choices is owed (`plans/handover.md`).

---

## 2. Timeline, stage by stage

Each stage gives the date, what the designer asked for or decided and why, what was built, what was learned, and where the detail lives. Dates are from `design-doc.md` section 0 and the git log; where they differ, both are given.

### 2.1 The original design document (2026-10-31)

- **What it is.** `docs/Railhead_GDD_original_2026-10-31.pdf` (76 pages), converted word for word into `design-doc.md` on 2026-11-01. The original text is kept, with "Changed" notes pointing to section 0 wherever a later decision overrides it.
- **What it described.** An isometric, low-poly railroad game set in spring 1866 in a fictional Calder Valley. You are a self-employed railroad operator who starts as the only worker at a tiny station, walks the platform, throws switches, hauls freight, sells tickets, and over time hires staff, builds lines, founds towns and reaches a far "Silver City". Pillars: hands on then hands off; everything is accounted for; the station is the heart; readable simulation; between cozy and tense (trains never crash, they wait).
- **Technology it assumed.** Desktop browser first, keyboard and mouse, touch out of scope for 1.0; Vite, TypeScript, Preact, Vitest and ESLint; three.js.
- **Milestones (section 22).** M0 foundations and art kit; M1 the whistle-stop (a 20-minute session working the hub and Willow Ford alone must be fun; gate: 3 of 5 outside playtesters want to keep playing); M2 the living town; M3 staff and delegation; M4 building the line; M5 the network; M6 hub growth; M7 content, audio and polish; M8 early access.
- **Detail:** `design-doc.md` sections 1 to 23; the PDF.

### 2.2 Platform decisions and M0 piece 1 (2026-11-01)

- **Asked and decided.** Project setup on 2026-11-01. D1 phones first and touch first; D2 one HTML file with three.js r128 from cdnjs and no build tools, tests as Playwright scripts at phone size; D3 the camera turns in 90-degree steps at the true isometric angle; D4 the working title Railhead; D5 performance targets scaled for phones; D6 avatar controls (tap to walk, press and hold to steer), with the player character brought forward into M0. A plan page and a survey for piece 1 were published; the answers became D7 (the exact touch controls) and D8 (M0 in five pieces, with the final low-poly look from the start, matched to a style test page).
- **Built.** "M0 piece 1: walk, throw switches and direct a train in a test yard" (commit of 2026-11-01): the player walking, a test yard, switches, one train with a panel (Forward, Back, Stop, Send to), yard moves, the clock and saving. A review and play-test of piece 1 found bugs, fixed the same day.
- **Learned.** The basic engine choices that still hold: a simulation in fixed ticks kept apart from drawing, every action a command with whole numbers so replays match, a seeded random number generator, and the save checked by a state hash.
- **Detail.** DEV_NOTES "Platform decisions (2026-11-01)" and "How the game works (piece 1)"; check-trains, check-touch, check-determinism, check-save.

### 2.3 M0, the rest of the foundations (2026-11-01)

- **Asked.** The designer chose to build all of M0 before one review at the end, with a team of up to six helpers. This was the start of "team mode" (DEV_NOTES "Team mode (from 2026-11-01)").
- **Built.** Piece 2, laying track and switches by finger (an instant build; gestures in D9, provisional); piece 3a, terrain with hills and the day and night cycle; piece 3b, station buildings; piece 4, an instanced crowd of all three character kits (200 walkers); piece 5, debug tools behind `?debug=1`. An M0 acceptance check (`check-m0.js`) tests the section 22 criteria. A review page and a playable build were published.
- **Decided at the review.** D10: track is built by hand, spike by spike, and that is a main mechanic; the build tool only plans a job marked with stakes and string. The instant build was cut (designer: "laying track should never work this way") and parked behind `?debug=1`. D11: the art style signed off, smooth on the designer's phone, the D9 gestures kept, and a larger hub platform asked for.
- **Detail.** `plans/m0-team-plan.md`; DEV_NOTES "Debug tools", "Technical choices to know about", "Draw calls"; checks check-build, check-world, check-people, check-buildings, check-debug, check-m0.

### 2.4 M1, the whistle-stop, in four rounds (2026-11-01 to 2026-11-02)

- **Asked.** The M1 plan page and survey (`plans/m1-plan-survey.html`) were answered as D12 on 2026-11-01: rounds B to D in order, one review at the end of M1, hand-building at a set pace (a 20u siding about 5 real minutes), a 20u by 2.4u hub platform, and crossing track anywhere for now. Round A had already started because the designer said "start M1" and it only covered work the design document already specified.
- **Built, round A** (helpers W1 to W4, integrator W5): the instant build parked (D10); cargo items with waybills, an item store and an item conservation check; carrying by hand, hand truck and handcart; a walk grid with path-finding round buildings and trains.
- **Built, round B** (B1 to B4): hand-building track (Stake it, construction jobs, materials on site, ties, rails and spikes); drawing it (stakes, string, sign, hammer swings); the larger platform; the interchange track with the Overland (the outside railroad) setting out and picking up cars, and loading cars by hand.
- **Built, round C** (C1 to C5): money, market, orders by telegraph, contracts and ledger; the real starting world (the hub, a 160u spur, Willow Ford); timetables, coupling, cordwood and water, the run-around; passengers with a ticket window and departure board; placeholder towns taking deliveries at business doors.
- **Built, round D** (builders named D1 to D7, not to be confused with decisions). A round D survey (`plans/m1-round-d-survey.html`) was answered as D13 on 2026-11-02 (office panels at the depot desk, a Look button, telegrams sliding in, a Skip tutorial button, 8 starting cords of wood, riding your own train, cordwood on the handcart, fares paid on arrival at unstaffed stations). Built: D1 office, telegram inbox, alerts and Look; D2 the investor's tutorial for days 1 and 2; D3 the M1 acceptance check, in which a bot plays a full game week (`check-m1.js`, `tests/m1-bot.js`); D4 fixes from that test week; D5 riding your own train; D6 the D13 small rules; D7 trains doing their platform work at the platform.
- **Learned.** The bot week proved the systems held together (all runs on time, money and items conserved), but it also measured how much one person had to walk and wait; the "pressure evening" (two trains within 10 minutes) passed at exactly 10 minutes. All of M1 was merged on 2026-11-02 with 28 checks.
- **Detail.** `plans/m1-team-plan.md` (every helper, what it owned, the save schema each added); DEV_NOTES "Cargo", "Carrying", "Construction jobs", "Interchange and the Overland", "Economy", "The real start", "Timetable, coupling, wood and water", "Passengers", "Town", "Office, telegrams, alerts and Look", "Tutorial", "Riding our own train", "M1 acceptance check and the bot".

### 2.5 The end-of-M1 review and the fix round (2026-11-02 to 2026-11-03)

- **Asked (D14, 2026-11-02).** On the review page (`plans/m1-review.html`) the designer said M1 is not yet the whistle-stop wanted. In their words: "the platform is way too small. the entire scale of the game is too small. The roof on the platform also prevents it from being easy to read." They asked to scale the whole game up, fix the roof and the feet sinking into the platform, add a cutaway view into cars, make track walkable only at crossings ("we need to get the core loop going"), and have a departure board in the world as well as the card. The outside playtest gate was put off.
- **The plan (D15, 2026-11-02).** The fix-round plan and survey (`plans/m1-fix-plan.html`) were approved as suggested. **Scale (D15):** everything except people grows 1.6 times next to them (track, trains, platform, buildings, distances); people, items and tools keep their size; the map becomes about 640 by 320u; times stay the same (speeds grow with distances); zoom 0.4x to 4x. Also: a see-through roof, feet on the decks, the cutaway, plank crossings, departure boards on the depot walls, three gap fixes; scale reviewed first.
- **Built and adjusted along the way.**
  - 2026-11-02: the 1.6x scale (sim side S1, drawing side S2), the feet fix (F) and the gap fixes (G), merged with 30 checks; old saves are converted (schema 14). A scale check page (`plans/scale-review.html`) was published.
  - D16 (2026-11-02, the designer's first look at the 1.6x build): the roof still hid the player, so the see-through canopy was built at once; the platforms went from 3.84u to 9.6u deep ("not a matter of scaling"; room to work and a feeling of space); a slower walk and a fuller walk animation.
  - D17 (2026-11-02): the slower walk broke the timetable for a one-person station (a test week up to 207 minutes late), so instead **the clock was slowed**: one game minute lasts 1.0 real second at 1x (a game day is 24 real minutes). Survey `plans/walk-speed.html`.
  - D18 (2026-11-03): the scale check answered: 1.6x looks right; go ahead; the walk is still too fast.
  - D19 (2026-11-03): more detail at the station, selling tickets from inside the depot's booth, plank platforms.
  - 2026-11-03: the rest of the round merged (builders V cutaway, B boards and booth, X crossings, D plank platforms and station detail), 36 checks. Review page `plans/fix-round-review.html`.
- **Learned.** Growing the world round the people, rather than zooming, was the way to make it feel bigger; walking speed and the timetable are tied together, so the cure for a "too fast" walk was a slower clock.
- **Detail.** DEV_NOTES "Scale (D15), sim side", "Scale (D15), drawing side", "The walk", "The cutaway into the combine", "Wide platforms and the see-through canopy", "Departure boards in the world and the ticket booth", "Plank crossings", "Plank platforms and station detail"; checks check-fixround, check-feet, check-roof, check-cutaway, check-board, check-crossings, check-station, check-walk.

### 2.6 D20 to D22: how it plays, clarity, and explaining as it happens (2026-11-03 to 2026-11-04)

- **D20 (2026-11-03), after the fix round.** Switches are manual: the player sets them and a train meeting a wrong switch waits (the M0 shortcut that set and locked a route's switches was removed). Two boards: a physical work board in the depot listing each incoming train and the switches to set before it arrives, and a public schedule board for travellers. Travellers wait in the ticket line as long as needed. A slower walk with no run button, a smoother walk animation on the same figures, and tutorial helper arrows. Built by four helpers (SW manual switches, WB boards, AN walk, TA arrows), merged 2026-11-03 with 39 checks; the M1 bot was taught to plan round the slower walk.
- **D21 (2026-11-03), clarity.** The designer: "it isn't clear where to take a contract, which is your train, why the hub says no engine on the timetable". Survey `plans/clarity.html`. Built by builder CL: engine No. 1 starts on both Willow Ford runs; contracts are taken at the work board, which must stand out; the player's train is marked ("No. 1, yours" plate and a coloured stripe); a run with no engine says so and a tap fixes it; a "Next job" line always at the top.
- **D22 (2026-11-04), explaining.** The designer: "Why doesn't the game explain this? Stuff just starts happening. The work board is way too close to the schedule board, I can barely see and click it." Surveys `plans/explain.html` and `plans/d21-review.html`. Built by builder EX: first-time cards that pause and explain (with "Show me"), warnings ahead of arrivals, the schedule board moved onto its own posts, a Work board button anywhere at the hub, one line at the top, and switch work from day 1 (the platform switch starts set the other way). Merged 2026-11-04 with 41 checks.
- **Learned.** Each play-test turned up the same theme: the systems worked, but the player could not see what to do next or why. Guidance (arrows, the Next job line, first-time cards) became part of every later stage, up to the "lessons" of D27 and D32.
- **Detail.** DEV_NOTES "Manual switches (D20, builder SW)", "The work board and the public schedule board", "Helper arrows", "Clarity (D21, builder CL)", "Explaining as it happens (D22, builder EX)"; checks check-switches, check-workboard, check-arrows, check-clarity, check-explain.

### 2.7 The M2 plan (2026-11-04)

- **Asked (D23).** The M2 plan page (`plans/m2-plan.html`) was answered: the designer's own judgement replaces the outside playtest gate for M1; M2 starts only after the M1 fixes are done and the designer is satisfied; M2 in four reviewed rounds (people, needs, building, businesses and reading); Willow Ford shows growth first; 400 people in the hub; a weekly newspaper on the Saturday Overland.
- **What happened.** M2 was never started. The git log has no M2 round; two days later the station rework (D24) changed the game, and the prototype (D25) parked the 3D game. Pieces of M2's idea came back in another form: townsfolk with errands (D27) and a bigger town with homes, roles and a simple economy (D32 stage 3). D24 staked out an area for M2's town in the hub world, which is now parked with it. The handover note records that the Overland's parking left the newspaper without a carrier.
- **Detail.** `design-doc.md` D23 and section 22 (M2); `plans/m2-plan.html`.

### 2.8 The station rework, D24 (2026-11-06 to 2026-11-07)

- **Asked.** After playing D22 the designer wrote: "selling tickets takes too much time ... I want the game a little more free form, more trains coming in and departing ... the first train shouldn't start there, it should be coming in and you need to throw the switch; the switches should be much closer; the Overland makes no sense because you can't see it coming in; every train that comes in should come to the platform ... a cargo train comes in and must be unloaded, on a separate track and area ... trains should have more cars but still cute small trains". Survey `plans/station-rework.html`, all answered as suggested.
- **Decided.** The hub is the whole game for now: a through line with both ends off the map; every train belongs to the railroad and is seen coming in; passenger trains run to the platform, freight to a separate cargo track with its own dock and yard; tickets are checked on board car by car (the ticket counter parked); the player waves each train off; about 6 passenger and 3 freight trains a day; switches close together; longer small trains. Willow Ford, No. 1's runs and the Overland were parked.
- **Built.** A foundation (the hub world, the parked flags, save schema 17, stubs) and then four helpers in parallel: TR the railroad's trains and the day's schedule, PX tickets on board, CG freight trains bringing what was ordered, UI the screen guidance; then an integrator with a hub bot that plays three game days (`check-hub-day.js`: 27 runs, worst 11 minutes late, 96 percent of tickets checked). 47 checks passed on 2026-11-07. Review survey `plans/d24-review.html`.
- **Learned.** The pattern used from here on: a technical plan with fixed names and owners, a foundation built by one helper, parallel builders, an integrator, and a bot-played acceptance check.
- **Detail.** `plans/rework-tech.md`; DEV_NOTES "Station rework (D24)"; checks check-hubworld, check-rrtrains, check-tickets, check-freight, check-hubui, check-hub-day. Parked behind `?world=hub`.

### 2.9 The prototype and the move to a 2D pixel renderer, D25 and D26 (2026-11-10 to 2026-11-11)

- **Asked.** The designer: "The game became too much too fast ... we just need to streamline first!" Plan survey `plans/prototype.html` and pixel mockups `plans/pixel-mockups.html` (the 3D game with a pixel look, and real pixel art of a prototype station).
- **Decided (D25, 2026-11-10).** A small prototype is the game for now, built in the same file as a new starting station; everything else is parked (work board and contracts, ordering, money, building, telegrams, wood and water, No. 1, Willow Ford, the Overland, the D24 hub). The layout is the designer's own: the main station and platform, two tracks, a second platform with a track beyond it. A fixed hand-made day; tickets punched in a line at the coach doors; the player sets both switches in and out; late trains wait; an evening delivering goods by handcart to three shops; a short end-of-day summary with no money. And "FULL art style changes this round": real hand-crafted isometric pixel art like mockup 2, one fixed view, the camera no longer turns, zoom in whole steps. Later the same day: the main street at right angles to the tracks, two wooden footbridges, and see-through where a train or building hides the player (`plans/facing.html`).
- **Built (2026-11-10).** A sprite contract and an art pipeline (`plans/proto-sprites.md`, `tools/pixelart/build.py` and `embed.py`, which write the art into `index.html`); three artists drew people, the town, trains and track; a foundation (the prototype world, its fixed day, save schema 18, a pixel renderer skeleton); five builders (T trains and layout, P passengers, F freight and the handcart, R the pixel renderer, U the day screens); an integration with a bot playing two days (`check-proto-day.js`).
- **Adjusted (2026-11-11).** The station building back behind the platform roof (`plans/station-place.html`). Saves kept per world, so an old 3D save no longer opens over the prototype. A stall the designer hit ("trains stopped arriving even though I'd thrown the switches") was traced to three causes and fixed (`check-proto-stall.js`).
- **D26 (2026-11-11), after playing the prototype.** Keep the current pixel style; the people take the richer style's size and detail (about 20 pixels tall) but less colourful; the camera follows the player, keeping him centred; walking 1.5 times faster.
- **Learned.** Streamlining worked: a small, complete day that a bot can play end to end. The far switches were a weak point (even the bot ran 15 to 45 minutes late), which fed into the later lever-frame decisions.
- **Detail.** `plans/proto-tech.md` (its section 10 lists the provisional choices), `plans/proto-sprites.md`; DEV_NOTES "Prototype (D25)"; checks check-protoworld, check-prototrains, check-punch, check-protogoods, check-pixrender, check-protoui, check-proto-day, check-proto-stall. Review page `plans/d25-review.html` (the handover says it was to wait until after the art round).

### 2.10 The art rounds (2026-11-10 onwards)

The art has been drawn in code by artist helpers (Python scripts under `tools/pixelart/`) and reviewed by the designer on sample pages. In order:

| Date | Round | Outcome |
| --- | --- | --- |
| 2026-11-10 | Pixel mockups (`plans/pixel-mockups.html`) | The designer chose real pixel art (mockup 2) for the prototype (D25). |
| 2026-11-10 | First sprite set by three artists (people, town, trains and track) | Built into the prototype. |
| 2026-11-10 | Richer style test and a middle-path mockup (`plans/style-test.html`) | Keep the current style for the prototype; keep the richer one in mind. |
| 2026-11-11 | Art round plan for a middle-path redraw (`plans/art-plan.html`) | Not used: replaced by D26 (keep the current style). |
| 2026-11-11 | People v2 sample sheet and size check (`plans/people-v2.html`, `plans/people-size.html`) | People at about 20 pixels, the designer's choice (D26). |
| 2026-11-11 | D27 art: A1 people (seated travellers, the agent's handling, townsfolk), A2 bigger trains, interiors, 16 goods, carts, A3 the town, station and nature at the new scale, then night art | Built into D27. |
| 2026-11-13 | D32 art: the navvies (three looks, the six stages' work), track stages, work train, camp; then the wilds by two more artists (the nine regions, far and near borders, moving water, landmarks, wildlife) | Built into D32; the art size budget was lifted by the designer. See `plans/d32-journey.md` and `plans/pixel/d32/`. |
| 2026-11-14 | D32 stage 3 art: every building in parts so it can open, three new house kinds, furniture, the far town | Built into D32 stage 3; `plans/d32-art-buildings.md`, `plans/d32-art-rooms.md`, `plans/d32-rooms-art.md`. |

The "middle-path" and "richer" styles are on deck, not cut (D26).

### 2.11 D27: the working day made visual (2026-11-11, built overnight)

- **Asked.** In chat, in "overnight mode" (the lead builds through the night on provisional choices and the designer reviews them in the morning): freight unloading and loading shown step by step onto a cart, with all kinds of goods drawn; a wider cargo platform and a cart path to town, delivering in the evening and picking goods up; tickets punched on the train, with detailed interiors; bigger trains with people and the world scaled to match, and a longer platform; more town, nature pushing against it, townsfolk with their own errands; each job made solid and clear with a tutorial ("the ones so far have been great"). Up to 10 helpers.
- **Built.** A foundation (new layout, tables, switches, save schema 19), then builders T (lever frames and the re-timed day), P (punching on board), F (freight handling, storage, carts, delivery and pickup), W (19 townsfolk with daily routines), U (six lessons and screens), R (the renderer), plus the artists; an integration with a two-day bot check (`check-d27-day.js`). The evening could not carry a day's goods in time, so the lead made three provisional decisions that night: the shopkeeper carries goods in, half the goods (8 in, 4 out a day), and no freight train in the evening (eight runs).
- **D28 (morning notes after playing).** Smooth the camera's motion in every direction; more planking at platform 1's end; the station office set back; a Start over button. Built.
- **Detail.** `plans/d27-tech.md` (the plan), `plans/d27-choices.md` (every provisional choice), review page `plans/d27-review.html`; DEV_NOTES "D27 (the working day made visual)" with one part per builder and "The lead's evening decision"; checks check-d27world, check-levers, check-onboard, check-handling, check-delivery, check-townsfolk, check-lessons, check-interiors, check-pixperf, check-atlas, check-d27-day. The D25 flows return with `?d27=0`.

### 2.12 D29: the review answers (2026-11-12)

- **Asked.** On the D27 review page: keep most of it as built (the day, the long evening, the keeper, 8 in and 4 out, 8 trains, the camera, the townsfolk, the lessons), but freight handling "needs to be much smoother and more clear" and faster; punching faster and smoother ("very hitchy when in the train"); and all switches worked from one place, "even if not realistic", then "consolidated but still near the track, not on the main platform".
- **Built.** One lever frame for all four switches beside track 1 off platform 1's west end (the old two frames with `?levers=two`); handling about a third faster and punching 16 game seconds, the agent and goods drawn smoothly between ticks, progress bar, target marks and step labels. Measured first with a new real-time play script.
- **Detail.** DEV_NOTES "D29: one lever frame" and "D29 (smoother, faster and clearer handling and punching)"; `tests/check-smooth.js`, `tests/smooth-play.js`.

### 2.13 D30: smooth train motion (2026-11-12)

- **Asked.** "Train animation is very juddery, let's smooth it out."
- **Built.** Each train is drawn as one block that steps along the rails together, so cars never shuffle against each other and curves no longer flicker. Off switch `?d30=0`. One open note: when the player rides a moving train his car can step a pixel against the camera; left as it is because the camera is the designer's call.
- **Detail.** DEV_NOTES "D30 (trains drawn smoothly)"; `tests/train-play.js`; check-smooth's train part.

### 2.14 D31: play-test fixes (2026-11-13)

- **Asked.** From a play-test on a phone: the first freight's goods could not be lifted out (a bug), loading and unloading much easier, a much smaller cart, faster walking, and see-through effects with soft edges.
- **Built.** The Lift button had only shown within arm's reach and the first freight's goods stood out of reach; now one tap per good with a queue, a cart of 3.4 by 1.6u with goods stacked up to four high, walking 1.4 times faster, a soft round see-through patch. Published as version 10 with D32 stage 1. Old behaviour with `?d31=0`.
- **Detail.** DEV_NOTES "D31 (play-test fixes)" (with its judgement calls); `tests/check-d31.js`.

### 2.15 D32: line building, workers and the bigger town (2026-11-13 to 2026-11-14)

- **Asked.** A line-building mode with a fully simulated crew of 5 to 30 men who ride an early work train to the end of track and build in stages (clear, dig, rock, ties, rails, spikes), with the player able to join each stage or watch; a long strip of country to another town, about two game weeks for a full crew; hired station workers (ticket punchers, cargo loaders, delivery men); a tent camp; a bigger town with every building enterable, houses, a role for everyone and an economy the trains affect; a longer day. The game still starts as now. Questions page `plans/d32-questions.html` and plan page `plans/d32-plan.html`, answered 2026-11-13: fixes first, then line building; a different small game per stage; the player is one good worker who lifts the men near him; varied country from the start; while the player is away the station runs and uncovered work counts against him; same hours on a slower clock (in the prototype a game minute became 1.5 real seconds, a day 36 real minutes). Art direction: the same style as the station, "visually dense and detailed but charming"; no boundary of the world is ever seen; "make it a journey, make it beautiful" (nine regions in `plans/d32-journey.md`).
- **Stage 1 (2026-11-13).** Foundation (the line's store and country, the work train as a scripted run, dev mode with `?dev=1`, the slower clock), Crew (the men one by one with names, skills and stamina, the foreman, the camp and head count), Play (riding out, walking the line, Look cards). At this point the line was a separate place with its own view, reached through fades. Published as version 10.
- **Stage 2 (2026-11-13).** The six join-in games in an inset panel and the line's lessons; hired station workers and the away rules; the wilds art fitted in. Published as version 11.
- **Stage 3, the bigger town (2026-11-14, after D33).** Built in four pieces and joined: ten new houses of three kinds, 41 townsfolk in 26 households each with a role, home, workplace and daily round; every building enterable (roof and front walls fade in place, furniture, people at their spots); a simple economy of counts (shop stock fed by deliveries, a Closed board, wages, moods, travellers' custom); rail men in town on Saturday evening and at Sunday prayers; the far town "Prospect" (provisional name) with a cheer when the last spike goes in. Switches `?tn=0`, `?rooms=0`, `?fartown=0`. Published with D34 as version 13.
- **Also recorded.** The designer's usage cap (stop at 80 percent of the allowance) and the split of helpers: programmers for hard pieces on one model, art on another (`design-doc.md` D32; `plans/handover.md`). The machine restarted twice on 2026-11-13, which is why there are "WIP saved after a container restart" commits.
- **Detail.** `plans/d32-tech.md` (its last sections hold the lead's decisions, which override its body), `plans/d32-journey.md`; DEV_NOTES "D32 (line building)" (parts by Foundation, Crew, Wilds, Play and Town) and "D32 stage 3: the bigger town" (Town, Rooms, Joined, each with provisional choices); checks check-d32world, check-worktrain, check-linerender, check-crew, check-camp, check-lineplay, check-linegames, check-linelessons, check-hired, check-bigtown, check-towneconomy, check-rooms.

### 2.16 D33: one world (2026-11-13)

- **Asked.** After playing stages 1 and 2: the line is not a separate screen but joined to the station and simulated there, only just begun at the start of a game; the rail workers really leave the camp and board the work train; the work train is the first train out; and the men are completely visible at their work as a little team ("the designer never saw them work"). To be done before the bigger town.
- **What the builder found.** A crew taken on in the day did nothing until the next 05:00; the muster was over before the player's day opened at 06:00; the ride was two fades through a separate screen; with 5 men the six work fronts stood up to 110u apart, more than a phone screen.
- **Built.** The line's country is drawn in the station's own frame; the line's track is track 2 carried on east past a yard limit board, and the main line to the east turns away into a wood; no edge of the world is seen round the station at any zoom; the line is on from the first morning with 5 men and about a screen of work done; the men get up at 05:25 and board in view; the work train stands at the station 06:00 to 06:22 as the first train out; the player boards by tapping the crew car or walks out; with 5 men all six kinds of work happen within about 60u. Published as version 12. The separate line screen and its fades are parked behind `?d33=0`.
- **Detail.** DEV_NOTES "D33 (one world)" (with "What he saw, and why" and the provisional choices); `tests/check-d33.js`.

### 2.17 D34: the join-in games in the world (2026-11-14)

- **Asked.** After playing version 12: the line building is loved, but the six join-in games sit in an inset panel whose abstraction does not match the world one to one. Put the same mechanics and look straight into the world where the men work, with no separation between watching and joining in. A task that needs a crewmate needs a real man of that gang there; if there is none, the game says so (which is why a bigger crew matters). Keep the panel version parked. Lower priority: the work train flickers while riding out.
- **Built.** The six games are played at the spot on the line with the gang's real men; honest minimums (a tie takes two men, a rail four); lessons and Look cards for the games in the world; the work train's ride drawn whole and steady. A 5-man crew now takes about 98 game days to finish the line (tie and rail men work only in whole units); 30 men are unchanged at 13 to 14 days. Published as version 13. Panel games parked behind `?d34=0`. The full test passed 80 of 81 checks; check-clarity failed once under load and passed three times alone.
- **Detail.** DEV_NOTES "D34 (the join-in games in the world)" (what each game was and is, the men each task takes, the provisional choices); `tests/check-d34.js`, `tests/worktrain-ride.js`.

### 2.18 Where things stand (2026-11-14)

- The default game is the pixel-art prototype station with the line, the crew, the hired workers and the bigger town. The playable link (claude.ai artifact 215immEY4Skh13fN9fN2db, see `plans/handover.md`) is at version 13.
- Owed to the designer: a review survey of the provisional choices of D32 stage 3 and D34 (and those listed in DEV_NOTES "D32" and `plans/d32-tech.md`).
- Known rough edges are in `backlog.md` (for example no points drawn at the line's junction, and check-pixperf's furthest-zoom case sitting on its budget).
- The latest "Next" entries in `DEV_NOTES.md` and the top of `plans/handover.md` are the place to start.

---

## 3. Every decision, D1 to D34

Status words: **in force** (built and still how the game works), **built, parked** (built, switched off but kept), **replaced** (a later decision changed it), **not built**. "3D game" means the worlds from before D25 (`?world=hub`, `?world=start`, `?world=yard`), all parked since D25.

| # | Date | What it decided | Status |
| --- | --- | --- | --- |
| D1 | 2026-11-01 | Phones first, touch first, portrait and landscape; computer second. | In force. |
| D2 | 2026-11-01 | One HTML file, three.js r128 from cdnjs, no build tools; Playwright checks at phone size. | In force. three.js is still loaded (the 3D game); the default game is drawn by the 2D pixel renderer since D25. |
| D3 | 2026-11-01 | Camera turns in 90-degree steps at the true isometric angle; zoom 0.6x to 4x. | Zoom replaced by D15 (0.4x to 4x). The turning camera holds only in the parked 3D game; the prototype has one fixed view (D25) that follows the player (D26). |
| D4 | 2026-11-01 | Working title Railhead. | In force. |
| D5 | 2026-11-01 | Performance targets scaled for phones (60 fps, under 100 draw calls, and so on). | In force as starting targets. |
| D6 | 2026-11-01 | You play one person; tap to walk, press and hold to steer; walking brought into M0. | In force. |
| D7 | 2026-11-01 | The exact touch controls of M0 piece 1 (steer to the finger, train panel, pinch, turn buttons, speed buttons, 48 px buttons). | Built. Parts specific to 3D (turn buttons, the train panel) live on in the parked 3D game. |
| D8 | 2026-11-01 | M0 in five pieces, final look early. | Done (M0 complete 2026-11-01). |
| D9 | 2026-11-01 | Build tool gestures (provisional). | Built; kept by D11; the build tool is used for planning since D10. Parked with "building" by D25. |
| D10 | 2026-11-01 | Track built by hand, spike by spike; the build tool only plans. M0 instant build cut. | Built in M1 (hub track). Instant build parked behind `?debug=1`. Hand-building parked in the prototype (D25); the idea returns as the crew's line building (D32). |
| D11 | 2026-11-01 | End-of-M0 review: art style signed off, D9 kept, a larger platform. | Done. |
| D12 | 2026-11-01 | M1 plan approved (rounds, hand-building pace, platform size, cross track anywhere). | Built. Pace replaced by D14 and D15; crossing anywhere replaced by D15 crossings. |
| D13 | 2026-11-02 | M1 round D answers (office, Look, telegrams, skip tutorial, 8 cords, riding your train, cordwood on handcart, fares on arrival). | Built in the 3D game. Office, telegrams and the Overland parked (D24, D25). |
| D14 | 2026-11-02 | End-of-M1 review: not yet; scale up, roof, feet, cutaway, crossings, boards; playtest later. | Led to the fix round (D15). |
| D15 | 2026-11-02 | Fix round: everything but people 1.6x; map about 640 x 320u; times unchanged; zoom 0.4x to 4x; see-through roof; feet; cutaway; crossings; departure boards; gap fixes. | Built. Walk speed replaced by D16, D17, D20; platform depth by D16; departure board became the public schedule board (D20). All in the parked 3D game. |
| D16 | 2026-11-02 | Roof see-through now; platforms 9.6u deep; slower walk; fuller walk animation. | Built. Walk 2.0 replaced by D17. |
| D17 | 2026-11-02 | Slower clock: one game minute is 1.0 real second (24-minute day) instead of a slower walk. | Built. In the prototype the clock was slowed again by D32 (1.5 real seconds a game minute). |
| D18 | 2026-11-03 | Scale check: 1.6x right, go ahead; walk still too fast (question asked again). | Done; the walk answered in D20 (4). |
| D19 | 2026-11-03 | More station detail, tickets sold inside the booth, plank platforms. | Built in the 3D game; the ticket counter parked by D24. |
| D20 | 2026-11-03 | Manual switches; work board and public schedule board; patient ticket line; slower walk, no run; smoother animation; helper arrows. | Built. Manual switches carried into the prototype. Boards parked by D25. Walk speed later raised by D26 and D31 in the prototype. |
| D21 | 2026-11-03 | Clarity: No. 1 on both runs, contracts at the work board, your train marked, "Not running: needs an engine", Next job line. | Built. Mostly parked with No. 1 and Willow Ford (D24) and the work board (D25); a Next job line remains in the prototype. |
| D22 | 2026-11-04 | First-time cards, warnings ahead, schedule board on posts, Work board button, one top line, switch work from day 1. | Built in the 3D game; parked with it. |
| D23 | 2026-11-04 | M2 plan; the designer is the M1 gate; M2 after the M1 fixes. | Not built; overtaken by D24 and D25. |
| D24 | 2026-11-06 | Station rework: the hub is the whole game, trains seen coming in, tickets checked on board, cargo track, send-off; Willow Ford, No. 1's runs, the ticket counter and the Overland parked. | Built 2026-11-07. Parked by D25 (`?world=hub`). |
| D25 | 2026-11-10 | Back up: a streamlined prototype in real pixel art from one fixed view; everything else parked; the designer's layout; footbridges; see-through. | Built 2026-11-10. The base of today's game. Tickets in line replaced by D27; fixed view changed by D26. |
| D26 | 2026-11-11 | Keep the current pixel style; people about 20 px; camera follows the player; walk 1.5x. | Built. Middle-path and richer styles on deck. |
| D27 | 2026-11-11 | The working day made visual: step-by-step freight, cargo platform, evening delivery and pickup, punching on board, bigger trains, more town and townsfolk, lessons. | Built (see dates note). Two lever frames replaced by D29. D25 flows with `?d27=0`. |
| D28 | 2026-11-12 | Morning notes: smooth camera, more planking, station set back, Start over. | Built. |
| D29 | 2026-11-12 | Review answers: faster, smoother handling and punching; all switches in one lever frame by the track. | Built. Old frames with `?levers=two`. Handling changed again by D31. |
| D30 | 2026-11-12 | Smooth train motion. | Built. Off with `?d30=0`. |
| D31 | 2026-11-13 | Play-test fixes: lift bug, one tap per good, small cart, walk 1.4x faster, soft see-through patch. | Built (version 10). Off with `?d31=0`. |
| D32 | 2026-11-13 | Line building with a simulated crew, join-in games, hired workers, camp, bigger town, slower clock. | Built in three stages (versions 10, 11, 13). Separate line screen replaced by D33; panel games replaced by D34. Town switches `?tn=0`, `?rooms=0`, `?fartown=0`. |
| D33 | 2026-11-13 | One world: the line joined to the station, on from the start; the crew boards in view; the work train first out; the men visible. | Built (version 12). Separate screen parked behind `?d33=0`. |
| D34 | 2026-11-14 | Join-in games in the world with real crewmates; the panel parked; work train flicker fixed. | Built (version 13). Panel games parked behind `?d34=0`. Not yet reviewed by the designer. |

---

## 4. Changes of direction

The project has turned several times. Each turn came from the designer playing the game; none was a technical choice. In every case the old work was parked, not deleted, and is still in `index.html`.

### 4.1 From desktop to phone, and from instant track to hand-built track (2026-11-01)

The original document was desktop first with Vite, TypeScript and Preact. On the first day it became a phone game in one HTML file (D1, D2) played by walking a character (D6). After seeing the M0 instant build, the designer ruled that track must never appear instantly: it is built spike by spike (D10). Parked: the instant build, behind `?debug=1`.

### 4.2 The fix round: a bigger world and a slower clock (2026-11-02 to 2026-11-03)

The end-of-M1 review found the world too small and hard to read. The answer was to grow everything except people 1.6 times (D15) and to widen the platforms beyond that (D16). When a slower walk broke the timetable, the clock was slowed instead (D17). Nothing was parked; old saves are converted.

### 4.3 The station rework (2026-11-06, D24)

M1 was built round a two-station line: the hub, a spur to Willow Ford, the player's own engine No. 1, and the Overland bringing goods from outside to an interchange. The designer found selling tickets slow and the Overland invisible ("you can't see it coming in"), and wanted more trains, more freedom and every train seen arriving. The hub became the whole game. Parked (D24, behind flags in the hub world): Willow Ford, No. 1's runs, the Overland and the interchange, the ticket counter as the way to sell tickets. The real start with Willow Ford still opens with `?world=start`.

### 4.4 From the 3D view to the 2D pixel renderer (2026-11-10, D25)

The designer: "The game became too much too fast ... we just need to streamline first!" At the same time the art moved from 3D low-poly models (three.js, a turning camera) to hand-crafted-looking isometric pixel art drawn by a new 2D renderer from one fixed view, zoomed in whole steps. A small prototype station with a fixed day became the game. Parked: the whole 3D game (`?world=hub` for the D24 hub, `?world=start` for the M1 real start, `?world=yard` for the M0 test yard), and in the prototype the work board and contracts, ordering, money, building, telegrams, wood and water, the tutorial and the cards (`WORLDS.proto.parked`). Saves are kept per world so an old 3D save does not open over the prototype. The fixed view was softened the next day: the camera follows the player (D26).

### 4.5 Growing the prototype back (2026-11-11 to 2026-11-13)

From the small prototype the game grew back in reviewed steps: bigger trains with interiors and punching on board, step-by-step freight, the town and townsfolk (D27); one lever frame (D29); smooth trains (D30); play-test fixes (D31). Parked: the D25 flows (`?d27=0`, and `?doorline=1` for the line at the coach door), the two lever frames (`?levers=two`), the old train drawing (`?d30=0`), the pre-D31 handling (`?d31=0`; the big cart is parked in the art tool). The prototype's clock was later slowed again (D32; `?clock=7.5` gives the old rate, `?pk=1` the player's old pace).

### 4.6 One world replacing the separate line screen (2026-11-13, D33)

D32 first built the line as a second place with its own view, reached by fades. The designer never saw the men work and wanted one continuous world. The line was moved into the station's own frame, on from the first morning. Parked: the separate line screen and its fades, behind `?d33=0` (the D32 play checks still test it there).

### 4.7 The join-in games moving out of the panel (2026-11-14, D34)

D32 stage 2 put the six join-in games (clearing, digging, rock, ties, rails, spikes) in an inset panel. The designer loved the line but found the panel's pictures did not match the world. The games are now played in the world, at the work, with real crewmates, and a task that needs a mate cannot be done without one. Parked: the panel games, behind `?d34=0` (also parked whenever `?d33=0` is used).

### 4.8 Other parked or replaced pieces still in the file

- The bigger town can be switched back to the D27 town with `?tn=0`; enterable rooms with `?rooms=0`; the far town with `?fartown=0` (D32 stage 3).
- The M2 town area staked out in the hub world (D24) is parked with that world.
- The middle-path and richer art styles are on deck as sample pages, not in the game (D26).

---

## 5. How the work has been done

Short version; the rules are in `CLAUDE.md` and the practice in `DEV_NOTES.md` ("Team mode", "How to test") and `plans/handover.md` ("How merging works now").

- **A lead session with helpers.** One lead session plans, hires helpers inside itself (never separate sessions, a rule from 2026-11-01), reviews and merges. Helpers work in git worktrees under `.claude/worktrees/`, each on its own branch, each owning named sections of `index.html`, and do not push. From D24 onwards bigger pieces follow one pattern: a technical plan in `plans/` with fixed names and owners, a foundation by one helper, builders in parallel, artists alongside, then an integrator (or "joining" helper) and a bot-played acceptance check.
- **Plan pages and survey pages.** Anything bigger than a small fix starts with a plan the designer approves. Questions always go on a published survey page with the suggestion marked and a note box, answers saved on the page (from 2026-11-01). The sources of those pages are in `plans/*.html`; the answers become a numbered decision in `design-doc.md` section 0 in the same commit as the work that depends on them. When everything waits on the designer, the lead sends a notification to their phone.
- **Review after each piece.** Each piece ends with a review page or a new playable link, and the next piece waits for sign-off. Provisional choices made by helpers are listed for the designer in DEV_NOTES or a choices file (`plans/d27-choices.md`). In "overnight mode" (D27) the lead built on provisional choices and the designer reviewed them in the morning.
- **Checks before each push.** `npm test` runs every check in Chromium at phone size (28 checks at the end of M1, 81 by D34). The lead pushes only when they pass. Determinism (the same commands give the same state hash) and old saves loading (sample saves in `tests/fixtures/`, one per save schema) are checked throughout.
- **Handover between lead sessions.** The lead measures its own memory use (`tools/context-usage.py`), hands over between 50 and 80 percent by writing `plans/handover.md`, and starts the next lead itself. The handover note has grown into a stack of dated sections, newest first at the top.

---

## 6. Things the sources do not agree on, or leave unclear

- **D27 and D28 dates.** `design-doc.md` dates D28 2026-11-12 and says D27 was "Built 2026-11-12", but the git log has the D28 design-doc commit, the D28 polish and the whole D27 integration on 2026-11-11, and DEV_NOTES heads the D28 work "Polish after the designer's play (2026-11-11)". The overnight build probably ran past midnight, and the commit dates may be in a different time zone from the designer's; which is right is not recorded.
- **Hand-building pace.** D12 approved "about 5 real minutes" for a 20u siding, but DEV_NOTES ("Construction jobs") notes that D12's own step times give about 3 real minutes, and those step times were kept. D14 then confirmed "about 3 real minutes".
- **The name "D1" to "D7".** In M1 round D, builders were named D1 to D7 (`plans/m1-team-plan.md`, commit messages such as "D5: ride our own train"). They are not decisions D1 to D7.
- **What became of M2.** No source says M2 was cancelled. D23 approved its plan and D24 asked for groundwork "where cheap", but nothing in the git log builds it, and D25 parked the world it was to live in. This document calls it "not built; overtaken".
- **The D25 review page.** `plans/d25-review.html` exists; the handover says it was to wait until after an art round, and that art round's plan was then dropped (D26). Whether the designer ever answered it is not recorded in the sources read.
- **CLAUDE.md is behind the game.** It still describes "3D ... made with three.js" and a camera at a fixed isometric angle; since D25 the default game is 2D pixel art from one fixed view. The rule text was not changed when the art changed.
- **Playable link versions.** Two links have had version numbers: the M0 and M1 link (artifact EHNWb1dZKQJA5HYT11k7Rc for M0, then HhqBH3hg3z1LwSS6MzxE8s for M1 and the fix round) and the current one (215immEY4Skh13fN9fN2db, from 2026-11-04). The handover calls both "version 3" at different times; versions 10 to 13 belong to the current link.

## 7. Where to read more

- `design-doc.md` section 0: every decision with the designer's words, the survey links and where each was built.
- `DEV_NOTES.md`: one part per piece of work, with its builder, date, provisional choices and checks; the "Next" section is a stack of dated updates.
- `plans/handover.md`: the latest state, newest first, with gotchas.
- `plans/`: technical plans (`rework-tech.md`, `proto-tech.md`, `d27-tech.md`, `d32-tech.md`), art contracts and notes, and the sources of every plan, survey and review page shown to the designer.
- `backlog.md`: small bugs found and set aside.
