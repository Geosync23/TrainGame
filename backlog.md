# Backlog

Small bugs, rough edges and ideas found outside the task in hand. Each entry: the date it was found, what it is, and
where to look. Newest reports first; the rest grouped by area. Items shown to be fixed are kept at the bottom, under
"Done, kept for the record", rather than deleted.

Words used below: **the line** is the new railway being built east of the station (D32, D33); **the 3D worlds** are the
older hub, start and yard worlds, parked since D25 and opened with `?world=hub`, `?world=start` or `?world=yard`;
"Town", "Crew", "Play", "Rooms", "Foundation" and the single letters (F, P, U, W, R, T) are the builders who own a
section of `index.html` (see DEV_NOTES).

## Reported by the designer, not yet fixed

- **2026-11-14 (after playing version 13): hold to walk does not work on the line.** Holding a finger down to keep
  walking works at the station but not out on the line east of the yard. Where to look: at the station press and hold
  is `walkDir` (DEV_NOTES "How the game works"); on the line the player's walk is Play's own (`lpTap`, the `lpWalk`
  command, `lpWalkTick` in "on the line (D32)"), and DEV_NOTES only describes a tap walk there.
- **2026-11-14 (after playing version 13): the rail workers cannot be seen leaving their tents and boarding the work
  train in the morning.** The work train stands at the station 06:00 to 06:22; the men should be seen walking from the
  camp and getting on. D33 meant to show exactly this (men up 05:25, breakfast 05:47, over the plank walk into the crew
  car), and check-d33 says it sees all five board, so the cause still has to be found in play (not yet looked at).
  Where to look: `CW.UP_S`, `CW.EAT_S` in "the crew (D32)", `LINE.T` and the work train in "the line (D32)", the
  morning board card that opens the player's day at 06:00 ("prototype day").

## The line and the join-in games

- 2026-11-13 (D32 foundation): the work train at the station is not on the walk grid: the player can walk through it
  on track 2. It is a scripted run (DEV_NOTES "D32"); stamping it needs a line in the walk grid's train stamp.
- 2026-11-13 (D32, found by Crew): the work train's own dump (rails, ties, rock, kegs beside its cars at z 6) is drawn
  on water when the train stands on the creek trestle, and its crew car's steps are then over the creek too. `lnTrain`
  could keep the train off the bridge or move the dump.
- 2026-11-13 (D32, Crew): the day's summary takes the head count at the moment the summary opens (`hcCount` in the
  prototype day), not the 22:00 count kept in `S.ln.hc`; if the day is ended before the crew is back it reports them
  out.
- 2026-11-13 (D32 Crew) and 2026-11-14 (D32 stage 3): people pass through each other. On the line the rail men pass
  through the work train's cars and the player; in town the travellers walking to the hotel or saloon and the rail men
  on their Saturday and Sunday walks pass through people and the player (the townsfolk's own walkers wait for him;
  these do not). Crew's `cwStep`, Town's walkers in "the bigger town (D32)".
- 2026-11-13 (D32 Play): while the player walks to the muster to ride out, a tap at the station is refused with
  Foundation's away message "You are out on the line. Go back to the station first." although he is still at the
  station; a muster-specific line ("You are going to the muster: tap Stay here to stay") would read better (`awRefuse`
  could ask Play for the reason).
- 2026-11-13 (D32 Play): riding out is refused while the player carries something (`carryHeld`, a cart), but a D27
  good held in F's handling (place 'hand') is not looked at; a good could be left in his hands while he is away.
- 2026-11-13 (D32 Town): the summary's "While you were on the line" line is only added while the line runs
  (`pdSummary`: `S.ln.run`); a game where the player is away with the line off (only possible from a check) keeps the
  away figures in `S.ln.awStats` without showing them.
- 2026-11-13 (D32 Wilds): the near edge of the corridor is at z 11, not the near artist's 9, because Crew's dinner
  spot and the supply piles fill the near side out to z 10.4; moving them north or along the line would let the border
  come 2u closer (and the canyon shelf leave 3u as drawn). `LINE.BORDER.S`, `cwGeo`.
- 2026-11-13 (D33): out on the line the station's Centre button is still in the corner beside the line's own Centre in
  the bar: two buttons that do the same thing. One of them could go while he is away.
- 2026-11-13 (D33): a station lesson card already open when the player walks past the yard limit stays up out on the
  line (`pdLesCan` only decides whether a lesson may open). It could close, or wait, when he leaves the yard.
- 2026-11-13 (D33): in landscape the line's bar (beside the clock, across the top) lies over the work train when he
  stands beside it at the railhead, so a tap meant for the crew car hits the bar; the bar's own "Ride home" does the
  same thing, and check-d33 falls back to it. The bar could be narrower, or sit lower, in landscape.
- 2026-11-13 (D33): the work train stands with its engine 8 m behind the spiked front, so the crew car (61u back) is a
  good walk from the gangs; the men walk it, and so does the player when he rides out. Fine as it is, but the designer
  may want the train to stand closer, or the dump moved up.
- 2026-11-13 (D33): no points are drawn where the main line to the east parts from the new line at the junction (the
  new line is track 2 carried on east, the old main line turns away): there is no art for a set of points, and no
  train of the sim uses it. A drawn switch there would read better.
- 2026-11-13 (D33, from the handover note): pale square patches show where the station's yard meets the wood at the
  join between the station's ground and the line's country. Not described further in the notes; look at the join in
  `pixStnChunk` and the line's chunk builder ("The line's view (D32)").
- 2026-11-14 (D34): the player's walk on the line treats the work train as one solid box, so with the train standing
  on the creek's trestle there is no way past it on foot (the deck is narrower than the box). A carry can set him down
  beyond it; he then squeezes along the deck (D34 fallback). A proper fix would walk him past the cars on the deck.
  `lpWalkTick`, `lpTrainBox`.
- 2026-11-14 (D34): the tie pile and the rail stack are kept west of the creek while their fronts are just past it
  (`cwGeo`), so for a while the tie men and the rail gang carry over the trestle from the far side. Crew's choice;
  with D34 the player's carries follow them.
- 2026-11-14 (D34): the parked panel games (`?d33=0` or `?d34=0`) in landscape: a touch of a round can land on the
  Dev button beside the landscape game panel and open the dev panel over the next Join button. check-linegames now
  closes the dev panel before each Join; the panel's place beside the Dev button is the real cause. "Joining in
  (D32)" CSS (`#lgPanel` landscape).

## The town and rooms

- 2026-11-14 (D32 stage 3 joined): the "Closed" board of a shut shop on the east row stands in the street behind its
  building as the view sees it (the east row shows the view its back), and Town's `see` flag turns the building in
  front see-through to show it. Not cheap to fix well: the board needs a place the view can see (the boardwalk's south
  end, or a card hung where the lot meets the alley), or the art's `ui/closed_card` drawn as a marker over the roof.
- 2026-11-14 (D32 stage 3 joined): the two-room house's partition is part of the artist's `/back` picture, so it is
  drawn under everyone inside: in an 'e' house a person in the kitchen (the far side of the partition) is drawn over
  it instead of being hidden by it. A `/partition` part (or the partition as a piece of furniture) would sort it.
- 2026-11-14 (D32 stage 3 joined): small home furniture in the two-room house (table, cot, wash stand) is not solid on
  the walk grid (the narrow rooms would otherwise shut the way through the partition's doorway): the player can walk
  through them.
- 2026-11-14 (D32 stage 3 joined): the new houses' porches are drawn but are not decks on the walk grid: the townsfolk
  and the player walk across a porch at ground height (sunk about 2 px into its planks) on the way from the lane to
  the door.
- 2026-11-14 (D32 stage 3 joined): shelves and the wash stand against a near wall (the east row's back wall, a side
  wall to the south) show their fronts to the viewer, though they face the wall: the art has only `x` and `z` for wall
  pieces (fronts +z and +x).
- 2026-11-14 (D32 stage 3 joined): the church seats 48: six rows of two pews, four to a pew (`RM_KIND` church in
  "rooms (D32)"; it was three to a pew until the join, and the artist drew each pew for five sitters). That is enough
  for today's 41 townsfolk ("the whole town fits on Sunday"), but not if the town or the rail men's Sunday share grows.
- 2026-11-14 (D32 stage 3, Rooms): the camp's tents open one at a time like buildings, but their walls do not stop
  walking: the camp is not on the walk grid (tents come and go with the crew size).

## The station and trains

- 2026-11-11 (polish builder): in the prototype the morning's "Today's trains" board stands over the Settings panel:
  opening Settings while it shows leaves Settings under it (its buttons cannot be tapped until the board is closed).
  `openSettings` could close the board (`pdCloseBoard`, which also gives back the held speed). index.html, "HUD and
  panels".
- 2026-11-13 (D32 foundation): trains: at 5 ticks a real second an engine leaving track 1 for the leg's curve takes
  one diagonal pixel step (2, 2) where its line on the rails moves over by a pixel (check-smooth, 'walk' landscape 1x;
  allowed once there). The D30 rail snap could carry the sideways pixel on its own frame.
- 2026-11-13 (D32 foundation): the player's walk took one step a tick checked from end to end; any pace over 0.5u a
  tick jumped a walk grid cell. Fixed for the player in D32 (sub-steps, `PLAYER_SUB_U`); the same one-step check may
  sit in other walkers if they are ever sped up (the cart's and the hand truck's poses, the townsfolk).
- 2026-11-13 (D32 foundation): in landscape the first lesson's card lies over the place of the Dev button (and the top
  right corner's buttons) until it is answered.
- 2026-11-13 (D31 builder): in landscape a lesson's slip (the later steps, under the Next job line) lies over the
  middle of the view: over a boxcar's goods at the cargo platform it takes the taps meant for them until OK folds it.
  It could sit at the side in landscape, or let taps through outside its buttons.
- 2026-11-13 (D31 builder): with `?d31=0` (and before D31) a tap within 30 px of the platform cart still goes to the
  D25 `carryTap`, which answers "Platform cart left at its spot" although handling is on; D31's taps bypass it.
  `carryTap` could be skipped whenever handling is on.
- 2026-11-13 (D31 builder): the helper arrow of the Unloading lesson's step 2 ("Cart: take it") keeps pointing at the
  cart while the player unloads by taps without it; the step only passes on a later step's event. The step could pass
  when a good is tapped.
- 2026-11-13 (D31 builder): goods in a boxcar with its door shut are still in the renderer's pick list (a tap beside
  one, on the car's wall, picks the good; D31's taps ignore it unless it can be moved). They could be left out of the
  list while the door is shut.

### In the parked 3D worlds (`?world=hub`, `start`, `yard`)

- 2026-11-02 (D15, builder S2): a few tap and snap distances are still the M1 numbers and may feel small on the 1.6x
  track: the Board button showing within 8u of a door (`rideHud`), and the 24 to 36 pixel tap radii on joints and the
  water spout (input). The crowd's leg cadence (`CROWD.STRIDE`, cycles per u) was kept, so walkers step a quarter
  quicker at the new speed.
- 2026-11-02 (D15 scale): in check-m1 the bot's morning boarding at Willow Ford fails with "The train moved off" (also
  before the scale). tests/m1-bot.js or the dwell at an unstaffed stop.
- 2026-11-02 (D15 scale): the bot's week sold 120 tickets (173 before the scale) and ran up to 7 min late (0 before).
  Probably longer walks in the bigger station; not investigated.
- 2026-11-04 (D22 builder): a long message (toast) covers the Arrows toggle and the top-right buttons for its 6.5
  seconds. In landscape at zoom 1.5 the WORK BOARD roof sign sits partly under the Next job line (the Work board
  button still works).

## Art

- 2026-11-13 (D32 Wilds): a three-pixel pinhole in a far-side transition module (creek to hills, rank 1 or 2, seen at
  597 m); the rock cut's north face is grass-topped on the rocks' bare ground and no unblasted rock spur exists (batch
  one's grassy `line/rise` stands in); the near side's far band in the canyon and the pass ends on level ground.
- 2026-11-14 (D32 stage 3 art): the far town has no night sprites (no `_lit` art: it is drawn baked into the line's
  ground), so its windows do not light up at night. plans/d32-art-buildings.md, "Not done".
- 2026-11-14 (D32 stage 3 art): the small icons `ui/closed_card`, `ui/purse` and `ui/face/0..2` (plan d32-tech 10.5)
  are not drawn; the game uses stand-ins (Town's paper card with "Closed" in the pixel font). plans/d32-art-rooms.md
  section 5.
- 2026-11-11 (polish builder): tools/pixelart/station27.py (`ST_CENTRE`) and street27_scene.py still put the depot at
  its old spot (0, -21.8) in the artists' review scenes; the game and proto-layout.json have it 2.5u back (0, -24.3)
  with the planked apron. Review sheets only.

## Tests and tools

- 2026-11-01: real-touch taps in the checks are sometimes read as press and hold on the busy test machine
  (check-handbuild retries its job tap up to 3 times to cope). A sturdier fix would make the hold threshold or the
  test's tap timing robust. tests/check-handbuild.js, input section.
- 2026-11-01: checks with short fixed waits can fail when several test runs share the machine. check-paths.js waited a
  fixed 0.4 s for the Path overlay and failed; builder C4 changed it to wait up to 6 s (done). Other checks with short
  fixed waits may need the same. tests/.
- 2026-11-03 (D20, builder SW): page-touch steps are timing-sensitive when the machine is busy: check-ride (boarding
  with the hand truck; the camera following the car), check-timetable part 2 (a tap on the joint or the engine missed)
  and check-office (telegram slide-in off screen in landscape) failed now and then with other test runs on the
  machine, the same on the unchanged build (f5e1d78); each passed when run alone.
- 2026-11-03 (builder TA): check-feet.js failed on the lead's commit f5e1d78 too: "a tap on the deck at (-2.20,
  -11.40) lands at" x -2.147, z -11.419 (0.056u off, limit 0.05), the same numbers in three runs; it then passed in
  the full run on ec62328. Not investigated.
- 2026-11-13 (D32 Play): check-linerender's "chunks redrawn in one frame" fails about one run in three, on the base
  commit e09ccdc too (2 or 3 in a frame); it counts across one `requestAnimationFrame`, which may see two frames on a
  busy test machine.
- 2026-11-13 (D32 Play): check-smooth fails on the base commit e09ccdc as well (station: a smoke puff and the freight
  cart jumping a pixel against the player, 1 to 6 times a run, varying).
- 2026-11-14: check-clarity failed once in the full run (landscape part 4: the tap on the Next job row did not open
  No. 1's panel) and passed three times alone. Looks sensitive to load, like the hub checks; give the tap a wait for
  the row to settle.
- 2026-11-13 (D32 plan): `tests/check-d32-day.js`, the lead's check in the D32 plan (plans/d32-tech.md 11.1 and 11.5:
  three line days with 30 men from a new game, the player riding out on day 2 and joining in; fronts, supplies, head
  counts, the station's figures while away, the same twice, a mid-day save; frame times; screenshots of every stage of
  work, the camp at night, the meal), was never written.
- 2026-11-11 (people v2): tools/pixelart/review_people.py: its people test scene (out/people-testscene.png) reads the
  first atlas format (`atlas['sprites']`, dotted names such as `track.straight`); out/atlas.json now has `frames` with
  contract keys, so the script skips it. Rewrite it on the new keys, or drop it for review_carry.py and the game's own
  screenshots.
- 2026-11-13 (D32 foundation): tools/pixelart: the first build after a merge printed nothing through a filter and
  embed.py then wrote the stale atlas.js; embed.py could refuse an atlas.js older than the sprite modules.
- 2026-11-13 (D32 Wilds): `tools/pixelart/out/contact.png` is now 11 MB and 150,000 px tall; build.py could split it
  by sheet group.

## Speed

- 2026-11-13 (lead): check-pixperf: the station at the furthest zoom (scale 1) on a 4x-throttled CPU sits on its
  budget and fails some runs even on a quiet machine, so this is not only load: the station's draw at scale 1 needs a
  real saving (285 items, 997 sort pairs) or the budget a decision. Since D33 that case has its own budget (10 ms
  average, 20 ms at the 98th centile); with the bigger town it measured 7.35 to 9.45 ms. The default zoom is well
  inside. Also: check-pixperf's 4x-throttled worst frame wobbles round its 14 ms budget run to run (2026-11-13, D32
  Play).
- 2026-11-13 (D33): the line's chunks that cover part of the station's map keep a copy of the station's own ground
  chunk (so the world is one opaque layer); at the furthest zoom that is about a dozen 256 px canvases of extra
  memory. A cheaper join would draw the line's country into the station's own chunks.
- 2026-11-14 (D34): at 4x CPU throttling the first frame or two after the game starts running (speed 1 from paused)
  can take 150 to 200 ms (seen in tests/worktrain-ride.js at 06:21 at the station, before the train moves). Not
  investigated.

## Done, kept for the record

- 2026-11-13 (D32 Crew), done in D32 stage 3 (2026-11-14): the sheriff (Tom Dade) was outdoors at 22:00 in an
  unplayed day, so the head count reported him out every night. With the bigger town on, his saloon round ends at
  21:15 and check-bigtown checks everyone is at home at every 22:00 head count (DEV_NOTES "The bigger town: the sim",
  provisional choice 3). With `?tn=0` the old town and its sheriff come back.
- 2026-11-13 (D32 Wilds), done in D33 (2026-11-13): the line's track began from nothing at x 0 inside the pines of the
  west end's cutting, so riding out the train appeared from bare ground. In the one world the line is track 2 carried
  on east from the station, its roadbed drawn from the map's edge, with a junction and a yard limit board (DEV_NOTES
  "D33 (one world)", "The junction"). Still so in the parked separate line screen (`?d33=0`).
- 2026-11-13 (D32 foundation), fixed for the player in D32: a walk pace over 0.5u a tick jumped a walk grid cell and
  every tap-walk was refused (`PLAYER_SUB_U` sub-steps). The open part, other walkers, is under "The station and
  trains".
- 2026-11-01, done by builder C4: check-paths.js's fixed 0.4 s wait for the Path overlay now waits up to 6 s. The
  open part, other checks, is under "Tests and tools".
