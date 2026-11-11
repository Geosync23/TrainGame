# Railhead — Game Design Document

Oct 31, 2026 · @Geo Ma

> This file is the single source of truth for the design. It was converted word for word from the designer's PDF of Oct 31, 2026 (kept in `docs/Railhead_GDD_original_2026-10-31.pdf`).
> Decisions made since then are listed in section 0. They override the original text wherever the two disagree. The original text is left in place, with a "Changed" note pointing to section 0, so the record is kept.

## 0. Decisions since the original document

| # | Date | Decision | Replaces |
| --- | --- | --- | --- |
| D1 | 2026-11-01 | **Phones first.** The game is designed and tested at phone size first, in portrait and landscape. Touch controls come first: tap, drag and pinch to zoom, with buttons big enough for a thumb. A computer with mouse and keyboard is the second check, and its controls are extras. | Section 1 "Platform and audience" (desktop first, touch out of scope for 1.0); the section 23 open question on touch. |
| D2 | 2026-11-01 | **One HTML file.** The whole game is `index.html`, with three.js r128 loaded from cdnjs at that exact version. There is no build step, TypeScript, Preact, Vite, Vitest or ESLint. The sim and render split, the determinism rules (seeded RNG, integer time and money, sorted iteration), commands and events, and save and load all stay; they live as labelled sections of the file instead of folders. Tests are Playwright scripts at phone size (`npm test`). | Section 19 "Stack", "Repository layout" and "Testing" (tool names only); section 22 M0 package 1. |
| D3 | 2026-11-01 | **Camera.** Yaw turns in 90-degree steps; the elevation is fixed at the true isometric angle (35.264 degrees), as in section 5. On a phone, rotation is by on-screen buttons and zoom is by pinch. The zoom range stays at 0.6x to 4x until the designer says otherwise. | Nothing: confirms section 5 for phones. |
| D4 | 2026-11-01 | **Working title is Railhead.** | Section 23 open question "Game name". |
| D5 | 2026-11-01 | **Performance targets scaled for phones.** These are starting targets, set as a technical judgement, and will be revised with real measurements. Frame rate: 60 fps on a mid-range phone from about 2021, never below 30 fps. Draw calls: under 100 in a busy scene. Triangles: under 150,000 visible. Visible characters: up to about 120. Memory: under 300 MB. Pixel ratio capped at 2. The simulation sizes (1,200 citizens, the 512 x 512 tile map) are kept for now, measured on a phone at M2 and M5, and brought back to the designer if they need cutting. | Section 19 "Performance budgets" (desktop targets). |
| D6 | 2026-11-01 | **Avatar-based touch controls.** You play one person in the world, and one finger always moves them. Tap the ground to walk there. Press and hold to walk in the direction of your finger, and let go to stop. Tapping an interactable (switch stand, train) walks to it and uses it, as in section 5. The player character and walking are brought forward from M1 into the first piece of M0. | Section 23 open question "Touch control scheme" (in part); section 22 order of M0 and M1 (walking only). |
| D7 | 2026-11-01 | **Touch controls for M0 piece 1.** Press and hold steers towards the spot the finger is pressing (not a joystick). Tap a switch stand: walk to it and throw it. Tap the train: walk to it and open its panel (Forward, Back, Stop, Send to track); after Send to track, tap a track to send the train there. Pinch zooms 0.6x to 4x. A two-finger drag looks away from the character, and a Centre button brings the camera back. Two buttons at the bottom left turn the camera 90 degrees. Buttons at the top left set pause, 1x, 2x and 4x. On-screen buttons are at least 48 by 48 pixels. | Section 23 open question "Touch control scheme, the rest" (for these controls; panels and the context menu stay open). |
| D8 | 2026-11-01 | **M0 is built in five pieces, and the final look comes early.** 1: the player character walking, a test yard, switches, one train, yard moves, clock and saving, using the final low-poly models for the character (chunky kit), the 4-4-0, the cars, track and switch stands, matched to the style test page. 2: laying track by finger. 3: ground with hills, day and night, buildings. 4: all three character kits and 200 walkers. 5: debug tools and the M0 acceptance check. | Section 22 M0 work package order (the packages themselves are unchanged). |
| D9 (piece 2; kept at the M0 review, D11) | 2026-11-01 | **Build tool gestures (provisional, for the M0 review).** A Build button (top right) switches one-finger drags from walking to drawing track; pinch and two-finger pan still work, and Build again goes back to walking. Where the drag starts decides what it does: on a track end (marked with a brass ring in build mode) it continues that track; on a straight it places a switch there, facing the way the finger moves and turning off to the finger's side; on open ground it starts a free piece whose heading is the first drag direction. The ghost preview is green, amber or red, with a short label at the top saying the length and curve, or why not. Letting go shows Lay track and Cancel at the bottom. Starting on a curve shows red ("Switches go on straight track only"). Laying track while paused runs one game tick so it appears at once. | Section 6 "Build tool" steps 1 to 4 (the Alt key for free angles has no touch equivalent yet; tooltips become the label). |
| D10 | 2026-11-01 | **Track is built by hand, spike by spike, and that is a main mechanic.** The build tool only plans: a confirmed plan becomes a construction job marked on the ground with stakes and string, never instant track. The job is built physically and visibly: ties carried and set one at a time, rails carried and dropped on them, and spikes driven one by one with a hammer swing, by the player first and by hired crews later. Materials (tie bundles, rail bundles, spike kegs) are real items that must be at the work site. This comes in M1: hand-building hub track, with materials arriving on the interchange trains like any other freight. Line construction with crews, camps and the stockpile stays in M4, at the same spike-by-spike detail. **Cut (parked, not deleted): the M0 instant build** (2026-11-01, designer: "laying track should never work this way"); its code stays but only works with ?debug=1. | Section 6 build tool step 5 (adds the detail level); section 13 "Track laying" (gang rates become visible tie, rail and spike work); section 22 M1 (adds hand-built hub track). |
| D11 | 2026-11-01 | **End-of-M0 review (designer's answers).** Art style signed off. Runs smoothly on the designer's phone. Kept as built, so no longer provisional: the build tool gestures of D9 (now used for planning, see D10), the lifted night brightness, the 05:00 start, the 0.6x to 4x zoom range, and the crowd off in normal play. Change: **a larger platform** at the hub station (size to be proposed in the M1 plan). Next: plan M1. | D9 provisional status; the M0 review questions. |
| D12 | 2026-11-01 | **M1 plan approved (designer's survey answers).** Rounds B to D go ahead in the planned order, and M1 is reviewed **once, at the end**. Hand-building: a 20u siding takes about 5 real minutes at 1x (set a tie 0.5, drop a rail pair 1, drive a spike 1.3 game minutes; materials per 10u: 2 tie bundles, 1 rail bundle, 1 spike keg; a switch adds 1 hardware crate); one tap keeps the player working along the job until it is done or materials run out, and a tap anywhere stops; 4 spikes per tie; no helpers before M3; plans that need earthwork (amber) cannot be staked in M1; a cancelled job returns every tie, rail and spike as items. The build tool's button becomes Stake it; a staked job shows stakes every 2.5u with string and a sign of what it still needs; half-built track is not usable by trains. Hub platform: 20u long, 2.4u deep, canopy over the middle 10u. On foot the player may cross track anywhere in M1 (revisit in M2). | The open question "How hand-building feels"; D11's platform size; section 11 "Pathfinding" track rule (deferred for M1). |
| D13 | 2026-11-02 | **M1 round D (designer's survey answers).** Office panels (Contracts, Market, Ledger, Trains, Timetable) open at the depot's office desk: walk there and tap it, and an Office button shows while you stand there. Inspecting on a phone: a **Look** button; tap it, then tap a thing to see its card. Panels do **not** pause the game. Telegrams: each new one slides in under the clock for a few seconds; a telegraph button with a count opens the inbox. The investor tutorial (days 1 and 2) has a **Skip tutorial** button in its first telegram. A new game starts with **8 cords** at the hub's wood stage. The player can **ride their own train** as a passenger (sit in the combine, step off at the other end). **Cordwood may go on the handcart** (up to 6), still not on the hand truck. At an **unstaffed station** travellers board anyway and pay the fare on arrival. A playable link of M1 so far is published for the designer to try before the end-of-M1 review. | Section 23 open questions "Touch controls for panels and the context menu" and "Pause in panels"; section 9 (cordwood is a long bundle carried by hand only; passengers without tickets give up); section 16 onboarding (no skip); section 15 (unstaffed Willow Ford). |
| D14 | 2026-11-02 | **End-of-M1 review (designer's survey answers).** M1 is **not yet** the whistle-stop the designer wants; they will retest after a fix round. **Changes asked for:** (1) **Scale the whole game up**: the map, the trains, the platform ("way too small") and everything else; the starting map is to be larger. (2) **The platform roof** makes the platform hard to read; fix it. (3) **Remove the platform clipping** (the player's feet sink into the platform and dock). (4) **A cutaway view into the train cars** when the player boards, and the player shown inside (replaces "hidden while riding"; riding as staff in the baggage end is kept). (5) **Track is no longer walkable anywhere**: crossings are needed to get the core loop going (section 11 rule). (6) **Departure board: both** the card and a board in the world. **Kept as built (no longer provisional):** every other builder choice on the review page (getting around and carrying, money and contracts, towns, passengers, trains and timetable, map and stations except size, office and telegrams, the tutorial order), and hand-building at about 3 real minutes for a 20u siding at 1x. **Playtest gate:** not now; playtest later. **Next:** a short round fixing the gaps and these changes, then plan M2. Review page: https://claude.ai/artifact/CKNAh874bKoJ1EZWAX9zEB. | The M1 builders' provisional choices; D12's "about 5 real minutes"; the starting map size (section 23 open question "The starting world's layout", in part). |
| D15 | 2026-11-02 | **M1 fix round plan approved (designer's survey answers, all as suggested).** **Scale:** everything except people grows 1.6 times next to them: track (gauge, spacing, curves, switches), trains and cars, the platform, buildings and every distance; people, carried items and hand tools keep their size. **Map:** grown with everything plus more open land north and south of the hub, about 640 by 320 units; Willow Ford stays 10 miles away (a mile becomes 25.6u). **Times stay the same:** train speeds, acceleration, braking and fuel and water ranges grow 1.6 times, so the timetable, fares and wood use are unchanged; the player walks a quarter faster; hand-building steps get quicker so a siding the length of the platform takes about 3 real minutes. **Camera:** starts a little closer; zoom range 0.4x to 4x (replaces D3's 0.6x). **Platform roof:** turns see-through while the player is under or near it. **Feet:** the player stands on the platform and dock and steps up and down at their edges. **Cutaway:** when the player boards, that car's roof and the wall nearest the camera are hidden, showing the player, travellers and freight inside; other cars stay whole; the player stands in the combine's baggage end. **Crossings:** track is not walkable except at plank crossings: both ends of each platform, one from the depot to the freight shed across the hub tracks, one at Willow Ford; the player can also stake a crossing with the Build tool as a small job using one tie bundle. Switches, couplings, wood and water are worked from either side without crossing; a train standing on a crossing blocks it. **Departure board:** on the depot wall beside the ticket window at both stations, showing the next 4 departures; the card stays. **Gaps fixed in this round:** materials put down at a building job can be picked back up; a switch inside a station's stopping track no longer cancels its trains; a warning mark on an item sorted into the wrong bay. **Review:** scale first (with pictures and a playable link), then the rest in one go and one review at the end. Saves are converted to the new sizes. Plan page: https://claude.ai/artifact/8ReXohbMSFEDaa1eaog927. | D3 zoom range; D12 "cross track anywhere in M1"; section 4 world scale and speeds (track, vehicle and building sizes, the mile). |
| D16 | 2026-11-02 | **Designer's first look at the 1.6x build (before the scale survey).** (1) **The platform roof still hides the player and the platform**: the see-through roof (D15) is built now, ahead of the rest of the round. (2) **The platforms must be much wider** ("not a matter of scaling"; room to work, to see, and a feeling of space): both platforms go from 3.84u to 9.6u deep, same length; the depot and everything behind the platform move back. (3) **The player walks too fast**: walk 2.0u per game minute (was 2.8 in D15, 2.25 in M1), run 3.2, hand truck and handcart 1.6. (4) **More fidelity in the walk animation** for the player and people (stride matched to speed, arm swing, bob, sway, lean, easing in and out). Then a new playable link; the designer answers the scale survey after that. | D15's walk speed (a quarter faster) and platform depth (x1.6). |
| D17 | 2026-11-02 | **A calmer walk through a slower clock (designer's survey answer).** A slower walk in game time broke the timetable for a one-person station (test week up to 207 min late at walk 2.0). Instead **one game minute lasts 1.0 real second at 1x** (was 0.75), so a game day is 24 real minutes; everything on screen moves a quarter slower. Walk speeds in game time go back to D15's (walk 2.8, run 4.4); the new walk animation from D16 is kept. Survey: https://claude.ai/artifact/E7Uqbtnynk4pbFVttfSohn. | Section 4 REAL_SECONDS_PER_GAME_MINUTE 0.75 and the 18-minute day; D16's walk 2.0. |
| D18 | 2026-11-03 | **Scale check answered.** The 1.6x size looks right; the start zoom 1.5x stays; go ahead with the rest of the round (crossings, the cutaway into cars, the departure board; the see-through roof is already built). **The walk is still too fast** (after D17's slower clock): a follow-up question asks whether to lengthen strides, slow the clock further (1.25 real seconds a game minute), both, or walk slower in game time. Page: https://claude.ai/artifact/RPbPS5SWB7cRUAqxr3KL4T. | The scale-check questions. |
| D19 | 2026-11-03 | **Station look (designer's requests).** (1) **More visual detail at the station** (depot, platform and surroundings). (2) **Selling tickets happens inside the booth**: the player goes in through the depot door and stands at the counter behind the ticket window; travellers queue outside on the platform; the depot roof fades see-through while the player is inside. (3) **The platform is made of planks**. | D12/D13's ticket window spot on the platform side. |
| D20 | 2026-11-03 | **Rework how it plays (designer, after the fix round; answers given in the earlier lead session and checked against its record).** (1) **Switches are manual**: the player sets them; a train meeting a switch set against it stops and waits; no automatic route setting for timetabled trains (replaces the M0 shortcut that set and locked a route's switches instantly). (2) **Two boards**: a **physical work board** in the depot behind the ticket counter, walked to and tapped, listing each incoming train: freight, passengers or mixed and how much (cars, items, items per destination, passengers off and waiting), wood and water needed, arrival and departure, and the **switches to set before it arrives** (with a deadline), ticked off as done; and a **public schedule board** on the platform for travellers: train, from, to, arrival, departure, platform, on time or late. (3) **Travellers wait in the ticket line as long as needed** (no giving up). (4) **Walking: slower, and no run button.** (5) **Animation: smoother movement on the same low-poly figure** (proper walk cycle with knees, hips, arm swing, body bob; better carry, push and hammer poses); the signed-off art style stays. (6) **Tutorial helper arrows** that show the flow of work (where to go next) from the start of a game. Then **plan M2** with a survey, including how to handle the M1 playtest gate. | D17's walk 2.8 and run 4.4; D13's travellers giving up; the route locking of M0 for timetabled trains; D15's single departure board (it becomes the public schedule board). |
| D21 | 2026-11-03 | **Clarity (designer: "it isn't clear where to take a contract, which is your train, why the hub says no engine on the timetable").** Survey answers, all as suggested: (1) **No. 1 starts on both Willow Ford runs** (morning and afternoon); the player can still change this at the office. (2) **Contracts are taken at the work board behind the counter**: new offers are pinned there and tapped to accept; the telegraph key and office desk still work. The designer could not find the work board: **it must be made obvious** (arrow, label, it stands out). (3) **Your train is marked**: a floating name plate over No. 1 ("No. 1, yours") and a coloured stripe on the player's engines and cars; the Overland's trains get a plain grey "Overland" plate. (4) **A run with no engine reads "Not running: needs an engine"** on the boards, and tapping it goes straight to putting an engine on it. (5) **A "Next job" line** always shows at the top of the screen (what to do next and where; tap for an arrow to the place), and can be hidden in settings. Survey page: https://claude.ai/artifact/JeWrFM5D3Nnoukd7f1FgAy (answers/clarity). **Built 2026-11-03 (builder CL)**: see sections 8 (default services), 10 (where contracts are taken) and 16 (HUD: Next job line, train plates). | Default services start with no engine (section 8); contracts only at the telegraph key and office desk (section 10). |
| D22 | 2026-11-04 | **Explaining as it happens, room at the depot, switch choices (designer, after playing D20 and D21: "Why doesn't the game explain this? Stuff just starts happening. The work board is way too close to the schedule board, I can barely see and click it.").** (1) **First-time cards**: the first time each thing happens (the Overland arriving, travellers stepping off, a train waiting at a wrong switch, a low tender, a contract offer, Saturday pay and similar), the game pauses and shows a short card: what happened, why, what to do, with a "Show me" button that puts the arrow on it; each shows once; can be turned off in Settings. (2) **Warnings ahead** of the Overland and of each of the player's trains arriving (about 30 game minutes ahead), in the Next job line and as a message. (3) **The schedule board moves** off the depot wall onto its own posts on the platform; the depot wall keeps only the WORK BOARD sign, bigger; a **Work board button** is always there while the player is at the hub. (4) The floating train orders card is **kept** (it must not cover the signs). (5) **One line at the top**: the Next job line only; the Current task chip goes. (6) Willow Ford's run-around switches are **spring switches** (confirmed). (7) **Switch work from day 1**: the hub platform switch starts set the other way, so the player throws it for every departure. (8) A switch in the Overland's way is **thrown by the player** (none today). (9) The yellow plate and stripe and the roof sign look are kept. **Next after this**: plan M2. Survey pages: https://claude.ai/artifact/Csd24RcWFZtYeCWvMWhaYd (answers/explain), https://claude.ai/artifact/A11agKBsDAyLdFViBAYHEn (answers/d21-review; clarity "partly"). **Built 2026-11-04 (builder EX)**: see section 16 (First-time cards, Warnings ahead, the Next job line as the only line, the Work board button), section 15 (the schedule board on its posts) and the switch notes below; DEV_NOTES "Explaining as it happens (D22)". | D20 builder's provisional switch choices; the schedule board on the depot wall (D20); the Current task chip. |
| D23 | 2026-11-04 | **M2 plan (designer's survey answers).** (1) **M1 gate: the designer's own judgement is the gate**; no outside playtesters (replaces "5 playtesters, 3 want to keep playing"). (2) **M2 starts only after the M1 fixes (D22) are done** and the designer is satisfied. (3) M2 in four reviewed rounds in this order: A people (named citizens arrive by Overland, ride to their town, homes, jobs, routines, inspect card), B needs (consumption, satisfaction, leaving; the flour test), C building (developer builds houses from delivered lumber and nails; a household moves in), D businesses and reading (section 12 settlement and village businesses, prospects, per-town ledger, problem cues), then the M2 gate. (4) **Willow Ford** shows growing and stalling first. (5) **400 people** in the hub, the crowd thinned automatically on slower phones. (6) **The weekly newspaper comes on the Saturday Overland** as an item; picked up, it opens as a page; headlines also show as messages. Plan page: https://claude.ai/artifact/XoP9wEVwNNTo3p7zbv2orE (answers/m2-plan). | Section 22 M1 gate (five outside playtesters). |
| D24 | 2026-11-06 | **Station rework (designer, after playing D22: "selling tickets takes too much time ... I want the game a little more free form, more trains coming in and departing ... the first train shouldn't start there, it should be coming in and you need to throw the switch; the switches should be much closer; the Overland makes no sense because you can't see it coming in; every train that comes in should come to the platform ... you check everyone's tickets, pull the right switches, then send it on its way; a cargo train comes in and must be unloaded, on a separate track and area so more passengers can come in as it sits there; trains should have more cars but still cute small trains"; survey answers all as suggested).** (1) **The hub is the whole game for now**: the line runs through the hub with both ends off the map; every train belongs to the railroad; the player is the station agent who brings them in, works them and sends them off. Willow Ford and No. 1's run there are **parked** (kept, switched off). Lay groundwork for M2's town where cheap (designer's note). (2) **Every train is seen coming in** from the end of the line and stops at a wrong switch until the player throws it; passenger trains run into the platform, freight trains into a **separate cargo track with its own cargo yard and dock** beside the freight shed. (3) **Tickets on board**: travellers board without a ticket; before departure the player walks along the train and each traveller pays the fare as checked (a tap per car, a short moment per person); anyone missed rides free (fare lost). The ticket counter is **parked**. (4) **The player sends each train off** (wave off / Send off) once tickets are checked and switches set; a late wave-off makes a late train. (5) **About 6 passenger and 3 freight trains a day**, never more than 2 at the hub at once. (6) **Goods as now**: sort by tag in the freight shed and deliver to doors for pay; contracts and orders stay on the work board; **freight trains bring what is ordered**. The **Overland is parked**. (7) **Switches close together** near the platform and cargo track. (8) **Longer trains, still small**: passenger 3 or 4 short cars, freight 4 or 5. Plan page: https://claude.ai/artifact/8bahAjohdFja5hq4dNvPb6 (answers/station-rework). **Built 2026-11-07** (technical plan plans/rework-tech.md; provisional choices listed in DEV_NOTES, "Station rework (D24)", for the designer's review). | The Overland and the interchange (section 9); the ticket window as the way to sell tickets (section 9); No. 1's Willow Ford services as the main loop (D21 item 1); section 15's hub track plan. |
| D25 | 2026-11-10 | **Back up and streamline: a small prototype in real pixel art (designer: "The game became too much too fast ... we just need to streamline first!"; plan survey https://claude.ai/artifact/QhnFbDxmEKvBeyUSyiez19 (answers/prototype) and pixel mockups https://claude.ai/artifact/WmqGFg1cZaYFsZDihvLufo (answers/pixel-mockups)).** (1) **The prototype is the game for now**, built in the same file as a new starting station; everything else is hidden (parked, not deleted): the work board and contracts, ordering, money, building, telegrams, wood and water, No. 1, Willow Ford, the Overland and the D24 hub. (2) **Layout (designer's own): the main station with its platform, then two tracks, then a second platform with a track on its far side**, so there are pull-overs at both platforms and a through line for trains passing or going the other way. Platforms close together and quick to reach. (3) **A fixed hand-made day**, the same each day for now: the morning opens at the schedule board with inbound and outbound trains; freight trains stand a long time (unload into storage, some need loading from storage), passenger trains come and go quickly. (4) **Tickets**: travellers line up at the coach doors before the train comes; each tap punches one ticket and that traveller boards. No ticket booth. (5) **The player sets both switches**, in and out; a train stops short of a switch set against it. (6) **Slow play**: trains wait for the player and show as late. (7) **Evening**: sort the day's goods by shop into a handcart and deliver to three shops (general store, blacksmith, saloon); then **a short end-of-day summary** (trains on time, tickets punched, goods delivered), no money. (8) **Real pixel art, one fixed view, this round** (designer: "FULL art style changes this round"): the prototype is drawn as hand-crafted-looking isometric pixel art like mockup 2, not the 3D look; the camera no longer turns; zoom in whole steps. Up to 7 helpers at once. **Layout change (designer, through the lead, 2026-11-10): the town's main street runs at right angles to the station and the tracks, away from the station building, with the three shops facing each other across it** (not parallel as in the mockup). **Added 2026-11-10 (designer): two wooden footbridges** from platform 1 over tracks 1 and 2 to platform 2 (the plank walkway stays for the handcart); the bridges and platforms spaced out a little; where a train or building hides the player or a line of travellers in the fixed view it turns see-through (chosen over turning the station round; https://claude.ai/artifact/75XRr9fVaqh4uAk7QvrDEP, answers/facing). **Style (designer, 2026-11-10): keep the current pixel style for the prototype; keep the richer style test in mind for soon** (https://claude.ai/artifact/BK9crSPmx8SK1BYTWgH1FJ, answers/style-test); a middle-path mockup was asked for. Designer 2026-11-11: keep the new (richer) art style on deck for a later round. Technical plan: plans/proto-tech.md; sprite contract: plans/proto-sprites.md; foundation built 2026-11-10 (DEV_NOTES "Prototype (D25)"); **built 2026-11-10** (all parts joined; a two-day bot check plays it end to end). **Station building (designer, 2026-11-11): back where it was, behind the platform roof** (https://claude.ai/artifact/BSiGDpCg3JWu8YKXTfbsBM, answers/station-place, choice "before"): centred on platform 1 against its back edge, the main street starting behind it; the rest of builder T's layout (track spacing, footbridges, schedule board) kept. **Camera and walk (designer, 2026-11-11): "the camera needs to stay with our character centered as it moves" and "the walk speed needs to be increased"**: the pixel view keeps the player centred while he walks (a drag looks away until he walks again; pinch still zooms); the walk is 1.5 times faster in the prototype (3u a game minute; the hand truck and handcart 2.7u), the lead's provisional figure, more if the designer asks. | D24's hub as the starting game (parked); the 3D look and turning camera for the prototype (section 17; the 3D worlds stay as they are, parked); the work board, contracts and money in play (parked for now). |
| D26 | 2026-11-11 | **After playing the prototype (designer, in chat):** (1) **Keep the current pixel art style**; the middle-path and richer styles stay on deck (this replaces the art-round plan, https://claude.ai/artifact/CCcToxUJ81G3jT9EeV42Qe, which is not used). (2) **People take the richer style's form, size and detail** (about 20 pixels tall, readable faces, hats, clothes), **but less colourful and slightly less playful**, translated into the current style; a sample sheet comes first for sign-off. (3) **The camera follows the player**, keeping the player centred as he walks (a change to the fixed view of D25 point 8; zoom in whole steps stays). (4) **Walking is faster**: 1.5 times to start (the lead's provisional figure). (5) Bug reported: partway into the day trains stopped arriving although the switches the arrow pointed out were thrown; being fixed. | The middle-path and full richer styles for the whole game (on deck, not cut). |
| D27 | 2026-11-11 | **The working day, made visual and solid (designer, in chat; "overnight mode": the lead builds through the night on provisional choices and the designer reviews them in the morning).** (1) **Freight is animation-heavy**: unloading and loading are shown step by step, onto a cart; **all kinds of goods**, each drawn. (2) **A wider cargo platform** where goods are kept; **the cart has a path to town**; in the evening the player takes the cart to town and **delivers**, and also **picks up goods and brings them back to the cargo platform** for loading next day. (3) **Tickets are punched on the train**: travellers board and sit down, then the player walks through the coach and punches each one. **Detailed train interiors.** (4) **Bigger trains** so seating fits, with **people and the world scaled to match**; **a longer passenger platform**. (5) **More town**: 3 to 5 more buildings on each side of the main street, **nature pushing against the town**, real character and visual interest in the main street of a wild west town; **townsfolk walking about, each a simple agent with their own errands** (start small). (6) **Loading, unloading, punching tickets, throwing switches, delivery and pickup made solid and clear, each with a tutorial** ("the ones so far have been great"). (7) Up to 10 helpers at once. Supersedes D25 points 4 (tickets punched in line on the platform) and the D25 evening (deliver only). Technical plan: `plans/d27-tech.md` (its provisional choices in section 9; the foundation built 2026-11-11, section 8.2a). | Punching tickets in the line at the coach door (D25 (4); replaced by punching on board, code kept switched off). |
| D28 | 2026-11-12 | **Morning notes after playing (designer, in chat):** (1) **Smooth the camera's motion**: following the player is right, but the world redraw judders on any walk that is not exactly left or right on screen; make scrolling smooth in every direction (pre-draw ahead if needed). (2) **More planking at platform 1's right-hand end**, where the footbridge and the steps down to the switch levers are: no bare gap. (3) **The station office a few steps back from the platform**, for visibility, with wooden decking filling the space. (4) **A Start over button in Settings** that deletes the saved game (with a confirm step). Applied to the D27 layout. | |

## 1. Overview

**Railhead** (working title) is an isometric, low-poly railroad game set in the American West in 1866. You are a self-employed railroad operator who starts as the only worker at a tiny station. You grow a hub town, push single-track lines across open country, supply the construction camps at the railhead, and turn camps into towns until a small network feeds a sprawling central station.

You are a person in the world, not a hovering camera. You walk the platform, throw switches, haul freight, sell tickets and ride out to the railhead. Every task you can do yourself, you can also assign to someone you hired. Progression is choosing what you still do with your own hands.

### Design pillars

1. **Hands on, then hands off.** Every job starts as something you physically do. Hiring and training people lets you hand jobs off, and the quality of the people you hire shows in how well the work gets done.
2. **Everything is accounted for.** Every person and every item in the world is a real, named or countable thing that physically moved through your station. No goods or citizens appear from nowhere.
3. **The station is the heart.** The hub and its towns are where most play happens. The line is where the game is headed, and you can visit it any time.
4. **Readable simulation.** A true simulation only works if the player can see cause and effect. Shortages, queues, tents and piles are visible in the world, and any person or item can be inspected to see its story.
5. **In between cozy and tense.** Pressure comes from timing, distance and money, not disaster. Trains never crash; they wait. Things go late, run short, or sit idle.

### Tone

Warm, grounded and period-flavored. The pleasure is watching a town light up at dusk because of what you brought in. The pressure is two trains arriving at once with only you on the platform, or a crew sitting idle because the spikes didn't arrive.

### Not in scope

- Not a colony sim. Citizens are named and simulated but have no moods, relationships or drama to manage.
- No train crashes or derailments. Trains are protected by block reservation and switch locking.
- No build-quality tiers for track. Track is either built or not.
- No driving trains from the cab. You direct trains; crews drive them.
- No combat.

### Platform and audience

> **Changed 2026-11-01:** phones first, touch first. See section 0, decision D1.

- Desktop web browser first (Chrome, Firefox, Safari, Edge), keyboard and mouse. A packaged desktop build (Electron or Tauri) can follow. Touch is out of scope for 1.0.
- Players of Stardew Valley, Factorio, Workers & Resources: Soviet Republic, Transport Fever and Railroad Tycoon who want a more personal, physical train game.

### Team

Two collaborators: the designer (owner of vision and decisions) and Claude (design, code, procedural art). Implementation may be split into milestone-sized tasks for Claude Code agents, so every system below is specified to that level.

## 2. Setting and period

The game opens in spring 1866 in a fictional western territory, the **Calder Valley**. A transcontinental trunk line owned by another company ("the Overland") already passes along one edge of the map. Your hub sits where it crosses the Calder River. Everything beyond that point is yours to build.

### The region

- One handmade region map for 1.0: river valley, open plains, foothills, a timbered ridge, a coal-bearing escarpment, a quarry bluff and a silver district in the far hills.
- Resource deposits are fixed per map but hidden until surveyed (see section 13).
- The Overland is the outside world. It delivers immigrants, imported goods and empty cars to your interchange track, and takes exports away. It is not simulated beyond its timetable and its market prices.

### Period details used as mechanics

| Period fact | Game mechanic |
| --- | --- |
| Local time differed town to town until 1883 | Each town runs on "railroad time" set by the hub clock. Purely flavor: one clock for the whole game. |
| Single-track lines ran on timetables and telegraphed train orders | Single-track dispatch with passing sidings at stations (section 8). |
| Link-and-pin couplers needed a person between the cars | Coupling and uncoupling is a task for a person until automatic couplers are bought (section 7). |
| Most western engines burned wood before coal was found | Engines start on cordwood. A coal town makes fuel cheaper and doubles range (section 7). |
| Construction crews lived in mobile camps with saloons and stores following them ("Hell on Wheels") | Camps, camp followers and moving day (section 13). |
| Railroads received land grants along their lines | You earn a lot fee for every building raised in your towns (section 10). |
| Small depots had one agent who sold tickets, handled freight and worked the telegraph | The satellite station agent role (section 14). |
| Turntables, wyes and run-around moves turned trains | No magic 180s (section 7). |

### People and representation

The population reflects the real diversity of 1860s railroad country: Irish, German, Scandinavian and English immigrants, Chinese laborers, Black porters and settlers, Mexican and Hispano families, and others. Names, clothing and roles draw on this mix without caricature. Indigenous nations lived on this land; how the game acknowledges that is an open question (section 23). The game avoids depicting violence.

## 3. Core loops and progression

The game has three nested loops: a minute-to-minute loop of physical work, a daily loop of the timetable, and a long loop of growing the network.

### Moment-to-moment loop (seconds to minutes)

Walk to the thing that needs doing, do it, see the result. Examples: a train arrives, you uncouple a car, unload crates onto a hand truck, sort them into the freight shed bays by destination tag, and push the handcart to the general store. Each action takes a visible amount of game time and moves a physical item.

### Daily loop (one game day, about 24 real minutes since D17)

| Time | What happens | Typical player activity |
| --- | --- | --- |
| 05:00 Dawn | Platform lamps go out. Overnight freight sits at the interchange. | Unload and sort overnight freight. |
| 07:00 Morning | Crews start work on the line. First passenger trains. | Dispatch the supply train to the railhead, sell tickets. |
| 11:00 Midday | Busiest passenger and freight window. Shops reorder. | Juggle platform work, deliveries and switching. |
| 15:00 Afternoon | Free window. | Ride out to the line or a satellite town, or keep working the hub. |
| 18:00 Evening | Crews stop. Shops close at 19:00. Saloon opens. | Walk the town, take contract offers, light lamps. |
| 21:00 Night | One late mail or freight train. | At the office desk: timetable, contracts, hiring, orders for tomorrow. |
| Sleep | Time skips to 05:00 (only when no train is waiting on you). | Ends the day; the newspaper or ledger summary appears. |

### Long loop (weeks to years)

Earn money, hire people, build track, found towns, open resources, grow the hub. Resource towns feed the hub; the hub's growth funds more line; more line reaches more resources.

### Progression phases

The phases are not hard gates. They describe what the game feels like as the player's role changes. Each phase ends at a milestone the player can see.

**Phase 1: Station hand (the whistle-stop).** Starting state: one depot, one platform, the interchange track, one engine, a combine car, two boxcars, a flatcar, $2,500 cash, a hub town of about 25 people, and a short existing spur to Willow Ford, a settlement of about 10 people, so the first train has somewhere to go.

- Hands: meet every train, throw every switch, unload, sort, sell tickets, deliver by handcart, tap out telegraph orders.
- Head: which contracts to accept and which imports to buy first.
- Pressure: two trains close together with one worker.
- Ends when: you hire your first freight handler and clerk, and the first spur is surveyed.

**Phase 2: Agent and foreman (the first line).**

- Hands: less hauling, more directing. You survey or send a surveyor, and visit the camp.
- Head: route choice, the daily supply train, keeping the crew supplied so they never sit idle.
- Pressure: every mile of track makes the supply run longer.
- Ends when: the first camp is founded as a town.

**Phase 3: Superintendent (the network).**

- Hands: walking the hub to spot problems; stepping in where staff struggle.
- Head: single-track timetables with meets, standing contracts, opening resource towns, expanding hub platforms and yard.
- Pressure: hub bottlenecks; staff skill decides how smoothly things run.
- Ends when: a stationmaster runs the hub well enough that you can move your residence to a camp or satellite town.

**Phase 4: Network builder (the late game).**

- Hands: you drop into any spot when a crisis hits: a washout, a blizzard, a jammed yard.
- Head: big projects such as double-tracking trunk lines, interlocking towers, a major river crossing, reaching the far city.
- Pressure: many towns depend on your trains.
- Ends when: the line reaches the Silver City terminus (the soft ending; play continues).

### Where you live

Your residence decides where you wake each morning. You start in rooms above the hub depot. Once a stationmaster is assigned to the hub (skill 3 or higher), you may move your residence to any camp or satellite town. You can move back at any time. Travel between places means riding a train, or using fast travel on a train already scheduled (you board, time advances until arrival).

## 4. Time, calendar and world scale

One game minute lasts 1.0 real second at 1x speed (D17; was 0.75), so a full day is 24 real minutes. All simulation time is stored as an integer count of game seconds since the start of the game.

### Clock and speed

> **Changed 2026-11-02 (D17):** the game clock is slower: one game minute lasts 1.0 real second at 1x (was 0.75), so a game day is 24 real minutes (was 18) and the sim runs 7.5 ticks a real second at 1x (was 10). Walking speeds stay as D15 set them in game time, so everything on screen moves a quarter slower while a day's work still fits the timetable. The simulation (ticks of 8 game seconds) is unchanged.

| Constant | Value | Notes |
| --- | --- | --- |
| `REAL_SECONDS_PER_GAME_MINUTE` | 1.0 | At 1x. A game day is 24 real minutes. |
| Speeds | Pause, 1x, 2x, 4x | Pause is always allowed. Planning UIs do not auto-pause. |
| Sim tick | 7.5 ticks per real second at 1x | 1 tick = 8 game seconds. At 2x, 15; at 4x, 30 ticks per real second. |
| Day start | 05:00 | You wake at 05:00. |
| Sleep | Allowed 20:00 to 02:00 | Skips to 05:00 at 32x sim speed (simulated, not jumped), so trains still run. Blocked if a task assigned only to the player is due before 05:00. |

### Calendar

- Week: 7 days. Monday to Saturday are work days. Saturday evening is payday. Sunday has reduced service: only trains marked "Sunday" run, and businesses close except the saloon, hotel and church.
- Season: 14 days. Year: 4 seasons, 56 days (about 22 hours at 1x; D17).
- Start date: Monday, Spring 1, 1866.
- Seasons change daylight hours (sunrise 05:00 in summer to 07:00 in winter, sunset 21:00 to 17:00), terrain colors, and demand (cordwood and lamp oil in winter; grain harvest in autumn).
- Weather: clear, overcast, rain, snow (winter only), blizzard (rare, winter). Rain slows walking 10% and halts grading. Snow halts all line construction. A blizzard can close a line until a crew clears it (a task).

### World scale

> **Changed 2026-11-02 (D15):** track, trains, buildings and distances are 1.6 times the sizes below; people keep theirs, and a mile is 25.6u. The speeds below grow the same way except walking (a quarter faster).

The scene uses one consistent stylized scale, taken from the approved style test (low-poly, characters 1 to 3).

| Measure | Value |
| --- | --- |
| World unit (u) | About 1.75 m, stylized |
| Tile | 2u x 2u. All building, survey and terrain grids use tiles. |
| Track gauge | 0.76u (rails at plus or minus 0.38u from the centerline) |
| Track spacing, parallel tracks | 1.6u centerline to centerline |
| Platform height | 0.3u |
| Character height | 1.0u (chunky), 1.1u (stocky), 1.4u (lanky) |
| Locomotive and tender | 5.2u long |
| Freight car | 2.6u long, 2.7u coupled pitch |
| Region map | 512 x 512 tiles (1,024u square) |
| Typical town spacing | 160u to 320u along the line |
| Fare and ledger mile | 16u = 1 mile |

### Speeds

All speeds are in units per game minute, so they scale with game speed.

| Mover | Speed (u per game minute) |
| --- | --- |
| Player walk | 2.0 (D20; 2.0u a real second at 1x) |
| Player run | none: there is no running (D20) |
| Player with hand truck or handcart | 1.8 (D20: a little slower than walking) |
| Citizen walk (crowd and travellers) | 1.8 (D20) |
| Train, mainline maximum | 4.0 (about 4u per real second at 1x since D17) |
| Train, running tender-first | 2.4 (60%) |
| Train, yard and station limit | 1.0 |
| Train, through a diverging switch | 1.5 |

At these speeds a 240u trip takes about an hour of game time (60 real seconds since D17), and walking the length of a 40u platform takes about 20 game minutes (D20).

## 5. Player character and controls

The player is one person in the world, built from the chunky character kit (section 17), who can walk anywhere, carry things and use any interactable. The player can do every task a staff member can do, at skill 3.

### Character creation

Name, body (chunky kit), skin tone (8 options), hair and facial hair (6 each), hat (visor cap, bowler, slouch hat), coat color (6). The player's starting role is "Owner and Station Agent".

### Movement and camera

> **Changed 2026-11-01:** on phones, touch controls come first and these keys are extras. See section 0, decisions D1 and D3.

| Input | Action |
| --- | --- |
| W A S D | Walk (relative to camera) |
| Shift (hold) | Run |
| Left click on ground | Walk to point (pathfinding) |
| Left click on interactable | Walk to it and use its default action |
| E | Use the nearest highlighted interactable |
| F | Put down carried item (or drop onto a valid slot) |
| Right click | Context menu for the object under the cursor (all actions, inspect) |
| Z / X | Rotate camera 90 degrees left or right |
| Mouse wheel | Zoom (0.6x to 4x) |
| Middle drag or arrow keys | Pan camera away from the player; C recenters |
| Space | Pause and unpause |
| 1 / 2 / 3 | Speed 1x / 2x / 4x |
| Tab | Office (planning) panels |
| B | Build mode |
| V | Survey mode |
| M | Map |
| T | Telegraph inbox |
| L | Ledger |
| Esc | Close panel or open game menu |

All keys are rebindable. The camera follows the player by default with a soft lag (0.2 s). Camera yaw snaps in 90-degree steps; elevation is fixed at the true isometric angle (35.264 degrees).

### Interaction model

- Interactables highlight with a soft outline when within 1.5u and in front of the player.
- Each interaction is an action with a duration in game time (see the task table in section 14). During an action the character plays its animation and a small progress ring shows above the head. Moving cancels the action.
- Carrying: the player carries one item in hand, or up to 3 items on a hand truck, or 6 on a handcart (handcarts work on town paths but not on platforms with stairs). Carrying a hand truck or handcart is toggled at its parking spot.
- The player can climb into any train as a passenger, and ride the locomotive or caboose as an "observer" for any train they own.

### Interactables (minimum set)

| Object | Actions |
| --- | --- |
| Freight item | Pick up, inspect waybill |
| Car door or flatcar edge | Unload item, load carried item, inspect contents |
| Car coupling | Couple, uncouple |
| Freight shed bay | Put item, take item, set bay destination tag |
| Switch stand | Throw (normal or diverging) |
| Ticket window | Staff the window (sells to the queue while you stand there) |
| Telegraph key | Open the telegraph (send orders, accept offers) |
| Office desk | Open office panels |
| Lamp post or signal lamp | Light, extinguish |
| Water spout or wood stage | Fuel or water the engine (hostler task) |
| Turntable lever | Rotate turntable |
| Survey stake | Place, remove (survey mode) |
| Business door | Talk (orders, contract offers), deliver carried item |
| Bed (residence) | Sleep |
| Citizen | Inspect |

### Player stamina

There is no stamina, hunger or health. The only limit on the player is time and being in one place at a time.

## 6. Track system

Track is a graph of nodes joined by edges, and every edge is either a straight line or a circular arc. This keeps arc length exact, curvature constant per edge, and train movement simple to compute.

### Graph model

- **Node**: a point in 3D with a tangent direction. A node joins 1 edge (dead end or buffer stop), 2 edges (plain joint), 3 edges (switch) or 4 edges (diamond crossing).
- **Edge**: connects node A to node B. Geometry is `STRAIGHT` or `ARC` (center, radius, start angle, signed sweep). Stored length is exact. Each edge has a speed limit and belongs to exactly one block.
- **Tangent continuity**: at every 2-edge node the edges meet with matching tangents (G1). The build tool guarantees this; the validator rejects anything else.
- **Direction**: an edge has no fixed direction. A train position is `(edgeId, distance from A, heading toward A or B)`.

### Switches

A switch is a prefab placed on a node. It has a trunk end, a through leg and a diverging leg.

| Property | Value |
| --- | --- |
| Through leg | Straight, 5u |
| Diverging leg | Arc, radius 10u, 30 degree sweep (ends 5u forward, 1.34u to the side) |
| States | `NORMAL` (through) or `REVERSE` (diverging) |
| Speed limit | 1.5 u/min on the diverging leg; mainline speed on the through leg |
| Stand | A switch stand with lever and target disc beside the trunk end. Target shows green (normal) or red (reverse). |
| Lock | A switch is locked while any route reservation includes it or any train occupies it. A locked switch cannot be thrown by anyone. |
| Throw time | 0.5 game minutes at the stand, plus walking. From an interlocking tower, see section 15. |

**Switches at the start (D22, built 2026-11-04):** a new game's platform switch (1) lies straight, for the main track, so the player throws it to the platform track (the turn-off) before No. 1's first departure; the work board lists it ("Switch 1: to the turn-off (red), by 08:07") and a first-time card explains it. It then stays as thrown: the timetable's moves all use the turn-off, so it needs throwing again only after the player sets it straight (to use the main track or the interchange). Willow Ford's run-around switches are spring switches (2 lies for the main track, 3 for the loop). A switch in the Overland's way would be thrown by the player, not its crew (D22 (8)); there is none today: it comes in on the interchange's own track. Old saves keep their switches as they lie.

A **crossover** is two switches back to back joining parallel tracks 1.6u apart. A **ladder** is a chain of switches feeding many parallel yard tracks. Both are build-tool presets.

A **diamond crossing** (two tracks crossing at 30 to 90 degrees) is available in the hub only, after the interlocking tower is unlocked.

### Geometry limits

| Limit | Mainline | Hub, yard and sidings |
| --- | --- | --- |
| Minimum curve radius | 12u | 8u |
| Maximum grade | 2.5% | 1.0% |
| Minimum straight between reverse curves | 3u | 2u |
| Minimum parallel spacing | 1.6u centerline | 1.6u centerline |
| Minimum clearance to buildings | 1.2u from centerline | 1.0u (platforms sit flush at 0.9u) |

### Build tool

> **Changed 2026-11-01:** the build tool plans only; building is physical, spike by spike. The M0 instant build is parked behind ?debug=1. See section 0, decision D10. In the game now: without ?debug=1 the plan is drawn and labelled as before, but there is no Lay track button (a "Plan only" note shows beside Cancel) and an instant-build command is refused.

1. Start from an existing node (continuing its tangent) or a free point (tangent set by the first drag direction).
2. Drag to a target. If the target is straight ahead within 1 degree, the tool proposes one straight. Otherwise it proposes an arc tangent to the start followed by a straight to the target, choosing the arc radius as large as possible but at least the minimum. If the end must meet an existing node's tangent, it proposes an S-curve (arc, straight, arc).
3. Straights snap to 15 degree headings by default; hold Alt for free angles. Ends snap to existing nodes within 0.5u and to parallel offsets of 1.6u from nearby track.
4. The preview shows ghost track colored green (valid), amber (valid but needs earthwork or a trestle on the line) or red (invalid, with the reason in a tooltip).
5. Confirming creates a **construction job**, not track. Track exists only once a crew or the player builds it with delivered materials (sections 13 and 14). In the hub, the earthwork and materials are listed in the job; on the line they come from the survey.

### Where track may be built

| Area | Rules |
| --- | --- |
| Hub | Any layout inside the hub boundary (starts at 60 x 40 tiles, expanded by buying land). |
| Line | Single track between stations, laid only through a survey (section 13). |
| Satellite station | Fixed kit: main track plus one passing track, two platforms. One industry spur may branch from the passing track's ends to a loading point. No other tracks. |
| Passing siding | A siding kit (passing track, 30u, no platforms, optional telegraph shanty) can be placed anywhere on a line. It acts as a station for dispatch only. |
| Double track | After the hub has 8 platforms, any line segment between two stations can be upgraded to double track (a second parallel track, 1.6u spacing, with crossovers at both ends). |

### Blocks

The track graph is split into blocks, the unit of occupancy and reservation.

- Each station track (platform track, passing track, siding) is one block.
- Each stretch of line between two stations' outermost switches is one block. On double track there are two blocks, one per direction.
- In the hub, every stretch of track between switches is a block, and every switch is its own block.

Block boundaries are computed automatically whenever track changes.

### Rendering

- Ties: InstancedMesh, one instance every 0.55u along every edge, 0.22u x 0.08u x 1.2u, slight random yaw jitter of 1 degree for a hand-laid look.
- Rails: two strips per edge (0.08u wide, 0.1u tall) built as extruded geometry along the edge, merged per chunk of 32 x 32 tiles.
- Ballast or dirt bed: a 1.5u wide strip under the ties.
- Switches: animated point rails (0.3 second blend) and the stand's target disc.
- Under-construction track: stakes and string for surveyed, raw dirt for graded, ties only for half-laid, full track when done.

## 7. Trains, rolling stock and turning

A train is a locomotive plus an ordered list of coupled cars that moves along the track graph as one body. Trains never teleport, never reverse their engine's facing without a turning move, and never collide: block reservation stops them first.

### Rolling stock

| Type | Cost | Length | Capacity | Notes |
| --- | --- | --- | --- | --- |
| 4-4-0 "American" locomotive | $6,000 | 5.2u with tender | Power 10 | Starting engine "No. 1" is a worn 4-4-0. Wood fuel; coal-capable after a coal town exists. |
| 4-6-0 "Ten-Wheeler" locomotive | $8,500 | 5.8u with tender | Power 15 | Unlocked in 1868. Freight. Max speed 3.5 u/min. |
| 0-4-0 switcher | $3,500 | 3.4u, tank engine | Power 6 | Unlocked in 1867. Hub only. Runs equally well in both directions. Max speed 1.5 u/min. |
| Boxcar | $450 | 2.6u | 16 item slots | General freight, mail overflow. |
| Flatcar | $300 | 2.6u | 12 long-item slots or 8 crate slots | Rails, ties, lumber, machinery, tents on moving day. |
| Gondola | $350 | 2.6u | 20 tons bulk | Coal, ore, stone, logs. Unloaded by shoveling or at a chute. |
| Combine (passenger and baggage) | $1,100 | 2.8u | 12 passengers + 8 baggage or mail slots | Starting car. |
| Coach | $1,200 | 3.0u | 30 passengers |  |
| Caboose | $400 | 2.4u | Crew | Required on freight trains over 6 cars once 1868 rules apply (flavor: conductor rides here). |
| Water car | $380 | 2.4u | 6 barrels of water equivalent for camps | Supplies camps without a water source. |

### Locomotive state

Each locomotive tracks: facing (forward = smokebox leading, or tender-first), fuel (cordwood or coal, in miles of range left), water (miles of range left), crew assigned (engineer and fireman), and odometer.

- **Range**: wood fuel 30 miles per full tender; coal 60 miles. Water 20 miles per tank. A train refuses to depart a station if remaining fuel or water is less than the distance to the next refueling point plus 2 miles.
- **Refueling**: at a station with a wood stage, coal stage or water tower, a hostler task (or the train crew, slower) tops up while the train is stopped. Each fill consumes physical stock from that facility (cordwood stacks, coal pile, water is free from a water tower but the tower needs a pump or windmill).
- **Crew**: a locomotive runs only with an engineer and a fireman assigned. They are staff members (section 14).

### Movement model

- Position of the train's lead end is `(edgeId, distance, heading)`. Each car's position is the lead position minus the summed coupled lengths, walked back along the path actually traveled (a path history buffer per train, trimmed to train length plus 2u).
- Speed changes by acceleration `a = 2.0 x power / mass` u/min^2. Mass: locomotive 3, empty car 0.5, loaded car 1.0, coach 0.8 (any load). Braking is a constant 3.0 u/min^2.
- Target speed is the lowest of: the edge speed limit, the locomotive's maximum, 60% of maximum if running tender-first, and the speed that lets the train stop at the end of its current reservation.
- A train never enters an unreserved block. It brakes to stop 0.5u before the block boundary.

### Coupling and uncoupling

The game starts in the link-and-pin era. A person must stand at the joint.

- **Couple**: the engine pushes at yard speed until the car ends touch; a person at the joint performs the Couple task (1.0 game minute).
- **Uncouple**: a person at the joint performs Uncouple (0.5 game minutes) while the train is stopped.
- **Upgrade (1873)**: Janney automatic couplers. Bought per car ($40). Coupling between two fitted cars happens on contact with no person; uncoupling still needs a person at the cut lever (0.3 game minutes).
- **Upgrade (1869)**: Westinghouse air brakes. Bought per train set ($200 per engine, $25 per car). Raises braking to 5.0 u/min^2 and allows 4.5 u/min maximum on mainline.

### Turning methods

Trains never rotate in place. A locomotive can face a new direction only by one of these moves.

| Method | Where | What it turns | How it works | Cost |
| --- | --- | --- | --- | --- |
| Run tender-first | Anywhere | Nothing | Engine pulls backward; speed capped at 60%. | Free |
| Run-around | Any station with a passing track | The train (engine moves to the other end) | Uncouple, engine runs through the passing track, couples at the other end. Engine still faces the old way (now tender-first). | Free (needs a person for couple and uncouple) |
| Wye | Hub, satellite towns where terrain allows (pad 30 x 20 tiles) | Engine, or whole train if the tail track is long enough | Forward into leg A, reverse up leg B, forward out. Generated automatically as a move sequence. | $600 + materials |
| Turntable | Hub; satellite towns as a late add-on | Engine only | Engine drives on, turntable rotates (1 degree per game second, so 3 minutes for 180), engine drives off. Needs an operator. | $1,800 + materials |
| Balloon loop | Anywhere with space (minimum radius 12u loop) | Whole train | Train runs around the loop and comes back facing the other way. | Track cost only |

The timetable for each train stores, per terminal stop, which turning method to use. If none is available, the train departs tender-first and the planner warns the player.

### Moves

All train motion is the result of a **move**: a target position plus the route to it.

- **Timetable moves** are created by the dispatcher from the timetable (section 8).
- **Yard moves** are created by the player or the yardmaster: select a train or cut of cars, click a target track. The game builds the route, requests the switches, and runs the move at yard speed when the route is set.
- **Move sequences** chain moves with person tasks between them (for example, a run-around: uncouple, move A, move B, couple). The game generates standard sequences for run-around, wye turn, turntable turn, set-out (leave cars on a track) and pick-up.

## 8. Timetables, dispatch and signaling

Trains run to a timetable the player writes, and a dispatcher system grants each train the block ahead only when it is safe. Trains wait rather than collide; the player's puzzle is arranging meets so they rarely wait.

### Timetable model

A **train service** (for example "No. 3, Westbound Mixed") has:

- A class: Passenger (1), Mail (2), Mixed (3), Freight (4), Work (5). Lower number is superior.
- A consist template: the locomotive (or "any available 4-4-0") and cars, with load rules per car (for example "boxcar 2: load items tagged for Mill Creek").
- An ordered list of stops. Each stop: station, scheduled arrival, scheduled departure, preferred track (main or passing; platform number in the hub), and actions at that stop (set out cars, pick up cars, load, unload, refuel, turn).
- Running days (any subset of Mon to Sun).
- A turning method at each terminal (section 7).

A service runs as a **train instance** each running day. Instances that miss their departure by more than 6 game hours are cancelled and logged.

**Default services (D21, built 2026-11-03):** a new game starts with No. 1 on both Willow Ford Mixed runs (morning and afternoon), so the boards show real times from the first minute. The player can still take her off a run or put her on one at the office (Timetable tab) or with the Timetable button in her panel. Saves keep the services they have. A run with no engine reads **"Not running: needs an engine"** on the public schedule board, the work board and the station card; tapping that row goes straight to putting an engine on it (No. 1's panel and its Timetable button when she is on no run, else the office's Timetable tab). (Until D21 a new game started with no engine on either run.)

### Dispatch rules (single track)

The dispatcher runs every tick, in order of train class then scheduled time.

1. A train standing at station S whose departure time has passed, and whose station work is complete, requests the line block from S to the next station S'.
2. The request is granted only if the line block is empty and unreserved, **and** S' has a free track that this train can occupy (or the train is passing through S' and the next line block beyond it can also be granted).
3. When two trains want the same block, the superior class wins. Equal class: the earlier scheduled departure wins.
4. A granted reservation covers the line block and the arrival track at S'. It is released block by block as the train's tail clears each block.
5. A train never enters a line block without a reservation. If S' is full, the train waits at S. This rule alone prevents head-on meets and keeps every meet at a station or passing siding.

### Telegraph requirement

Dispatch authority travels by telegraph. A station without a working telegraph (no wire, or no one assigned to the key) cannot issue orders.

- Beyond the last telegraph station, only one train may be on the line at a time ("one engine in steam"). The dispatcher enforces this automatically.
- Stringing telegraph wire is part of building the line (one wire job per surveyed segment, poles every 10u, $5 per pole, 1 laborer-hour per pole).
- A satellite station's agent works the telegraph as part of their duties.

### Deadlock

The reservation rules prevent most deadlocks, but a player can still create one (for example by filling both tracks of a station with trains heading toward each other's stations). The dispatcher detects a cycle of waiting trains every 60 game seconds and raises a "Trains stuck" alert naming them. The player resolves it with a yard move (for example backing a train into a siding).

### Hub routing

Inside the hub, routes replace line blocks.

- When a train approaches the hub's home signal (at the hub boundary) or wants to leave a platform, the dispatcher computes the shortest path to its assigned track (A* over the track graph, edge cost = length, plus 20u per diverging switch).
- A **route** is that path. Setting a route requires every switch on it to be in the right position and unlocked, and every block on it to be free.
- Before an interlocking tower exists, each switch that needs throwing becomes a **Throw switch** task for the nearest switchman (or the player). The train waits at the home signal until every switch is thrown and the route is locked.
- With an interlocking tower covering those switches, the tower operator sets the whole route from the tower (section 15).
- Platform assignment: the timetable gives a preferred platform. If it is occupied, the dispatcher picks the nearest free platform of the same side and posts the change on the station's departure board.

### Signals

Signals are visual and readable, not a separate system to wire up.
| Signal | Where | Shows |
|---|---|---|
| Train order board | Each station with a telegraph | Red: hold for orders (no reservation). Green: proceed (reservation granted). |
| Home signal | Each hub entry track | Red until a route to a platform is set and locked. |
| Switch target | Each switch stand | Green disc for normal, red disc for reverse. Lit lamp at night. |
| Station lamps | Platforms | Must be lit after sunset by the lamplighter or player. Unlit platforms slow boarding by 50%. |

### Timetable planner (stringline)

The planning UI shows a time-distance diagram: stations down the vertical axis in line order, time across the horizontal axis, each train as a sloped line. Meets show where lines cross at a station. The player drags stop times on the diagram or edits them in a table beside it. The planner flags conflicts the dispatcher would turn into waits (two trains needing the same block, a station with more trains than tracks) before they happen.

## 9. Cargo, freight handling and passengers

Every piece of freight is a discrete item with a waybill, and every passenger is a person; both move only when something carries them. Bulk goods (coal, ore, stone, logs) are the one exception: they are tracked as tons in a car or pile.

### Items and waybills

- An **item** is one handling unit of one commodity: a crate, sack, barrel, keg, bale, bundle or mail sack. The commodity list, item type and prices are in section 21.
- Each item has a **waybill**: commodity, origin, destination (a town plus a consignee: a business, a camp, a warehouse, your own construction stockpile, or "Outside"), the contract it belongs to (if any), and a due date.
- Items are rendered as small low-poly props with a colored destination tag. Tag color and a one-letter code identify the destination town (colorblind-safe: color plus letter plus shape).
- Items are never deleted except by consumption (a business uses it, a household eats it, construction consumes it, or it is sold Outside). Every consumption is logged. This is the item conservation rule (section 19).

### Item types and handling

| Item type | Carried how | Car types |
|---|---|---|
| Crate, sack, keg, bale, barrel, mail sack | By hand (1), hand truck (3), handcart (6), delivery wagon (16) | Boxcar, combine, flatcar (crates only) |
| Long bundle (rails, ties, lumber) | By hand (1) on the line or at a platform edge; never on a hand truck | Flatcar |
| Machinery | Two people, or the station crane (hub add-on) | Flatcar |
| Bulk (coal, ore, stone, logs) | Shovel task, chute, or tipple | Gondola |

Pick-up and put-down each take 0.2 game minutes. Shoveling one gondola takes 60 worker-minutes; a chute or tipple empties or fills it in 5 game minutes.

### Freight shed and sorting

- A freight shed has numbered **bays**. Each bay holds 8 items and has a destination tag set by the player ("Mill Creek", "Hub warehouse", "Railhead", "Outside", or "Any").
- Sorting means taking items off a car and placing each in the bay whose tag matches its waybill. Placing an item in a non-matching bay is allowed (overflow) but the item shows a warning icon and staff fix it later as a task.
- Outbound loading takes items from a bay and loads them into the car assigned to that destination in the train's consist rules.
- Warehouses work like sheds with larger bays (24 items) and hold goods the player owns but has not yet sold or used.

### The interchange

The Overland's trains stop at your interchange track twice a day (06:00 and 18:00). They set out loaded cars (your imports and arriving goods for contracts) and pick up the cars you left on the outbound interchange track (exports and returned empties). Immigrants and travelers step off onto the hub's interchange platform. This is the only way anything enters or leaves the map.

### Local delivery

Items for town businesses must be carried from the station to the business door. The player or a freight handler does this by hand, hand truck or handcart. A delivery wagon (bought from a livery stable, $250 plus a hired teamster) carries 16 items and drives the town's streets. A delivery is complete when the item is placed at the consignee's door; the business then pays for it under its contract.

### Passengers

- Passengers are citizens or travelers. Each wants to go from one station to another.
- At the station they join the ticket window queue. Selling a ticket takes 0.5 game minutes for whoever staffs the window. Fare: 4 cents per mile, minimum 10 cents.
- A passenger without a ticket waits up to 60 game minutes, then boards anyway if a conductor is aboard (who collects 1.5 times the fare), or gives up and goes home (and remembers it: a town reputation hit, section 11).
- When a train arrives, ticketed passengers walk to their car's door and board, 0.1 game minutes each per door. Passenger capacity is by car. Excess passengers wait for the next train.
- Arriving passengers step off and walk to their destination (home, hotel, boarding house or job).
- A station's departure board (rendered in the world, readable when zoomed in) lists the next 4 departures and their platforms. (D22, built 2026-11-04: the public schedule board stands on its own posts at the back of the platform, east of the depot, behind the ticket line, readable at the start zoom 1.5 in its big layout; the depot's front wall keeps only the bigger WORK BOARD roof sign over the window and door.)

### Mail

A territorial mail contract (offered in week 2) pays a flat weekly sum for carrying mail sacks between the hub and each town on a schedule. Mail sacks are items with tight due times (6 game hours). The contract pays in full each Saturday if 90% or more of sacks that week arrived on time; 50% if 70% or more; nothing below that. Mail sacks are always carried in combines or the baggage end of the train.

## 10. Economy, money and contracts

The player is a self-funded merchant railroad: you buy goods at the Overland market, carry them, and sell them delivered, and you also earn fares, haulage fees, mail pay and lot fees. All money is stored as integer cents, and every change of money is a ledger entry.

### Money in

| Source | How it is earned |
|---|---|
| Delivered sales | Selling goods you bought (or produced in your towns) to businesses and camps, at the contract's delivered price. The main income early on. |
| Haulage fees | Carrying someone else's goods (a mine's coal, a farm's grain) for a rate per item or ton per mile. |
| Passenger fares | 4 cents per mile per passenger. |
| Mail contract | Flat weekly pay, scaled by on-time delivery (section 9). |
| Lot fees | Land grant: every building completed in a town you founded pays you $25 (houses) or $60 (businesses). |
| Exports sold Outside | Goods you own, sold to the Overland market at its sell price when the car leaves on the interchange. |

### Money out

Wages (paid Saturday 18:00), goods bought at the market, rolling stock, construction materials, land for hub expansion (section 15), loan interest, and facility upkeep (section 21).

### The Overland market

- Every commodity has a base buy price (what you pay to import it) and a sell price (what the Overland pays for your exports). Values are in section 21.
- Prices move each Monday by a seasonal factor (for example flour +10% in winter, grain sell price +20% in autumn) and a random walk of up to plus or minus 5%, bounded to 70% to 140% of base.
- Imports are ordered by telegraph (or at the office desk). An order arrives on the interchange 1 or 2 days later (06:00 or 18:00 train), already loaded in cars the Overland delivers. Pay on order.

### Contracts

Contracts arrive as telegraph offers or from a business owner when you talk to them. You accept or decline. Accepted contracts appear in the Contracts panel.

**Where contracts are taken (D21, built 2026-11-03):** new offers are pinned on the **work board** behind the hub's ticket counter (paper notes on the board in the world, and the Contracts part at the top of its card), and tapped there to accept or decline; an accepted contract's card has the button that orders its goods. The depot's roof carries a painted **WORK BOARD** sign over the booth door, so the board is found from the platform; a tap on the sign walks the player in and opens the card. The telegraph key and the office desk still take contracts the same way. (Until D21 contracts were taken only at the telegraph key and the office desk.)

| Type | Terms | Example |
|---|---|---|
| Delivery (one-off) | Commodity, quantity, consignee, due date, delivered price per unit, late penalty | "Mill Creek General Store: 10 sacks of flour by Friday, $6.10 each, -10% if late." |
| Delivery (standing) | As above, repeating weekly for N weeks | "Hanley Tailoring: 3 bales of fabric every Monday for 8 weeks." |
| Haulage | Commodity, origin, destination, rate per unit, minimum volume per week | "Ridge Coal Co.: haul up to 40 tons a week to the hub, $0.08 per ton-mile." |
| Prospect | A business that will move to a town if you commit to a standing supply contract | "A tailor will open in Mill Creek if fabric can be supplied weekly." Accepting creates the standing contract; the proprietor arrives by train. |
| Mail | Government mail between listed towns | Weekly flat pay. |

Rules:

- **Delivered price** offered = market buy price x (1.25 + 0.03 x miles from hub to consignee), rounded to the cent, then scaled by the town's scarcity of that good (up to +30% when the business is out of stock).
- **Late**: 10% penalty per day late, up to 50%; after 5 days the consignee may cancel.
- **Reputation** (per town, 0 to 100, starts at 50): +2 per on-time delivery, -4 per late delivery, -10 per cancelled contract, -1 per passenger who gave up waiting. Reputation scales immigration to that town (section 11) and the size and price of offers (reputation 80+ offers are 15% better).

### Loans and failure

- At start, Eastern investors offer a line of credit up to $5,000 at 1% per week, repaid any time. When a bank opens in the hub, it offers larger loans at 0.6% per week.
- Cash may go to -$500 (overdraft). Below that, purchases are blocked.
- If wages cannot be paid on Saturday, unpaid staff each have a 50% chance to quit, and that week counts as a missed payroll. Two missed payrolls in a row triggers bankruptcy: the game offers to reload the last start-of-season autosave or continue in "Receivership" mode (creditors take 50% of income until debts are paid).

### Ledger

Every transaction writes an entry: day, time, amount, category, counterparty, and reference (item, contract, train, staff). The ledger panel shows daily, weekly and seasonal totals by category, cash on hand, outstanding loans, and receivables (delivered but unpaid items, paid on Saturday for standing contracts).

## 11. Towns and agent simulation

Every citizen is a simulated, named agent with a home, a job and a daily schedule, and every town's growth comes only from people arriving on your trains and buildings raised from materials you delivered. Population targets: hub 150 to 400, satellite towns 20 to 100, camps 10 to 40. Network-wide cap 1,200 agents.

### Town stages

| Stage | Population | What it has | Station |
|---|---|---|---|
| Camp | 0 permanent (crew and followers only) | Tents, cook tent, follower tents | End of track; no station |
| Settlement | 1 to 30 | Boarding house, general store, saloon, developer's yard | Satellite kit |
| Village | 31 to 100 | Adds tailor, blacksmith, carpenter, bakery, church | Satellite kit |
| Town | 101 to 250 | Adds hotel, school, doctor | Satellite kit |
| Hub | Any | Everything, plus bank and newspaper | Unlimited |

A stage requirement is population only; the businesses listed become possible at that stage but still need a proprietor and supply (section 12).

### Town plat

When a town is founded, the game lays out a plat: a Main Street running parallel to the track on the depot side, one cross street every 12 tiles, and lots of 4 x 6 tiles along the streets (depot side first, then the far side of the tracks once the near side is 70% full, reached by a grade crossing). The player can rotate or mirror the plat at founding. The player never places town buildings; the developer and businesses choose lots by rules (nearest free lot to the depot for businesses, next free lot along the street for houses).

### Agents

- **Citizen**: name, age, sex, origin, profession, household, job, home, current activity, position and path (when simulated in full).
- **Household**: 1 to 6 citizens (single laborers are households of one), a home (house, boarding house bed, tent or none), a cash balance, a pantry (units of food commodities), a clothing level and a satisfaction score.
- Children (about 20% of family members) exist for flavor: they go to school if there is one, otherwise play near home. Nobody ages, is born or dies. People only arrive and leave.
- Names are generated from period lists per origin (Irish, German, English, Scandinavian, Chinese, Mexican and Hispano, Black American, Anglo-American). Each origin has given names, surnames and a weight in the immigrant mix.

### Daily schedule (citizens)

| Time | Activity |
|---|---|
| 05:30 | Wake |
| 06:00 | Breakfast at home (boarding house residents eat in its dining room) |
| 06:30 | Walk to work |
| 07:00 to 18:00 | Work (12:00 to 12:30 lunch at the workplace). Railroad staff follow their roster shift instead. |
| 18:00 to 19:00 | Shopping trip if the pantry is under 3 days of food or clothing is low (shops open 08:00 to 19:00) |
| 19:00 to 21:00 | Saloon (adults, 30% chance per evening), church social (Wednesday), or home |
| 21:30 | Sleep |
| Sunday | No work except railroad, saloon, hotel. Church 10:00 to 11:00 if a church exists. |

### Consumption per person per week

| Need | Commodity | Units per person per week | Bought at |
|---|---|---|---|
| Food | Flour | 0.25 sack | General store (or bakery bread, which replaces 0.20 flour) |
| Food | Beans | 0.15 sack | General store |
| Food | Salted meat | 0.10 barrel | General store |
| Food | Coffee | 0.05 sack | General store |
| Food | Salt | 0.05 sack | General store |
| Clothing | Clothing | 0.03 crate (one outfit every 8 weeks; a crate holds 4) | Tailor or general store |
| Heat (winter only) | Cordwood | 0.5 cord per household | General store or wood yard |
| Light | Lamp oil | 0.1 barrel per household | General store |

Households buy from businesses with cash; businesses restock only from what you deliver. A household that cannot buy food records unmet need for that day.

### Satisfaction

Computed daily per household, 0 to 100:

| Factor | Weight | Score |
|---|---|---|
| Housing | 30 | Own house 1.0, boarding house 0.6, tent 0.25, none 0 |
| Food | 30 | Share of the last 7 days' food needs met |
| Goods | 15 | Clothing level and (in winter) heat met |
| Work | 15 | Employed working-age members / working-age members |
| Amenities | 10 | 0.2 each for saloon, church, school, doctor, hotel present in town |

### Leaving and arriving

- **Leaving**: a household whose satisfaction stays under 35 for 7 days in a row walks to the station, buys tickets to Outside (via the hub), and leaves on the next suitable train. If no train comes within 2 days, they walk out along the line and are gone (it still counts as a departure in the newspaper).
- **Arriving**: each day the game computes each town's **pull** = open jobs + 0.5 x free housing places (beds or empty house capacity), multiplied by reputation / 50. The Overland delivers immigrants on its interchange trains: per day, arrivals = round(0.4 x total network pull) with a minimum of 1 if any pull exists, capped at 12. Each immigrant household picks a destination town weighted by that town's pull and job match to its profession, then buys a ticket and rides your trains there. Immigrants who cannot get a train within 2 days settle in the hub instead.
- Immigrant professions are drawn from a weighted list: laborer 50%, tradesman 20% (tailor, blacksmith, carpenter, baker, builder), merchant 8%, railroader 12% (arrives with a rail role at skill 1 to 3), professional 5% (doctor, teacher, banker, newspaperman), farmer or miner 5% (only when a matching resource town exists).

### Jobs and wages

- Every business and the railroad post job openings with a wage. Each morning, unemployed citizens take the best-paying opening in their town that matches their profession or is unskilled.
- The railroad's wage per role is set by the player (base wage from section 21, adjustable from 70% to 150%). Paying above business wages draws workers away from shops (and slows them); paying below makes hiring slow.
- A business without workers sells nothing and does not reorder.

### Simulation detail levels

| Level | When | What runs |
|---|---|---|
| Full | The town the camera is in, and any town within 120u of the camera | Every agent walks real paths on the walk grid each tick and is rendered. |
| Schedule | All other towns | Agents jump between activity locations at schedule times with a computed travel delay; no positions per tick. Economy (buying, working, consumption) runs exactly as in Full, on the hour. |

Both levels use the same agent data and the same rules, so switching level never creates or loses people or items.

### Pathfinding

- Each town has a walk grid (the tile grid, 0.5-tile resolution near the station). Costs: street 1.0, path 1.0, grass 1.4, platform 1.0. Track is impassable except at grade crossings and platform-end crossings. Buildings are entered by their door cell.
- A* with a per-town path cache keyed by (start cell, destination building), invalidated when the town's buildings or tracks change. Popular destinations (depot, general store, saloon) use precomputed flow fields.
- Agents avoid each other with simple separation steering only; no full crowd simulation.

### The newspaper and the ledger

Each town of Village size or larger (and the hub from day 1) has a weekly paper, published Saturday night: arrivals and departures by name, businesses opened or closed, shortages, records ("busiest day at the depot"), and one human-interest line generated from events ("The Lindqvists, lately of Minnesota, have taken the house on Second Street"). The per-town ledger shows population, households by housing type, average satisfaction and its weakest factor, stock levels at each business, and open jobs.

## 12. Businesses, resources and production

A business opens only when three things line up: the town has reached its stage, a proprietor has arrived, and a supply contract with you exists for its inputs. Towns move from pure importers to exporters as resources are developed.

### How a business opens

1. The town reaches the business's stage and has a free lot.
2. A prospect offer arrives by telegraph ("A tailor will open in Mill Creek if fabric is supplied weekly"). Offers appear when the town's pull and reputation are high enough and the business type is missing.
3. You accept, which signs a standing supply contract.
4. The proprietor (and household) arrives by train. The developer builds the shop from materials you deliver (section below). The business opens when the building is done and its first inputs arrive.

A business closes if it has had no stock for 14 days or no workers for 14 days. Its proprietor's household then decides to stay (as laborers) or leave, by the normal satisfaction rule.

### Town businesses

| Business | Stage | Inputs per week | Output | Jobs | Lot |
|---|---|---|---|---|---|
| Developer's yard | Settlement | Building materials per project | Houses and buildings | 4 to 12 builders | 6 x 6 |
| General store | Settlement | Staples for the town's population, clothing crates, lamp oil, cordwood | Sells to households | 2 | 4 x 6 |
| Boarding house | Settlement | 1 flour, 1 beans, 0.5 meat, 0.2 coffee per 12 residents | 12 beds with meals | 2 | 4 x 6 |
| Saloon | Camp or Settlement | 1 barrel whiskey per 30 people | Amenity | 2 | 4 x 6 |
| Tailor | Village | 1 bale fabric per 2 worker-days | 1 crate clothing (4 outfits) per bale | 2 | 4 x 6 |
| Blacksmith | Village | 1 crate iron bar per 3 worker-days | 1 crate tools or hardware per iron crate; halves tools use in town | 2 | 4 x 6 |
| Carpenter | Village | 2 bundles lumber per worker-day | 1 crate furniture per 3 lumber; unlocks frame houses | 3 | 4 x 6 |
| Bakery | Village | Flour | Bread (replaces 80% of household flour use) | 2 | 4 x 6 |
| Church | Village | Built once; 2 lamp oil per season | Amenity | 1 | 6 x 6 |
| Hotel | Town | 2 flour, 1 meat, 0.5 coffee, 1 fabric per 20 guests | 20 guest beds; passengers stay overnight; +10% passenger demand to that town | 4 | 6 x 6 |
| School | Town | 1 crate books and slates per season | Amenity | 1 teacher | 4 x 6 |
| Doctor | Town | 1 crate medicine per 50 people per week | Amenity | 1 | 4 x 6 |
| Livery stable | Town | Hay (grain) 2 sacks | Rents delivery wagons and teamsters | 2 | 6 x 6 |
| Bank | Hub, 150+ people | None | Loans (section 10); amenity | 2 | 4 x 6 |
| Newspaper | Hub, 100+ people | 1 crate paper per week | Weekly paper; amenity | 2 | 4 x 6 |

### The developer and housing

- The developer's yard keeps a build queue. A **house** is queued when free housing places in the town are under 10% of population or any household lives in a tent or has no home. A **business building** is queued when a business is approved.
- The developer requests the materials for the front project as a delivery contract with you. Work starts only when every listed material is in the yard.
- Builders work 07:00 to 18:00 and visibly carry materials from the yard to the site. Build time = labor-days / builders on the job.

| Building | Materials | Labor (builder-days) | Capacity |
|---|---|---|---|
| Tent (camp or overflow) | 1 bale tent canvas | 0.2 | 1 household of up to 3 |
| Shanty | 4 lumber, 1 nails | 3 | 1 household of up to 4 |
| Frame house (needs carpenter in town) | 8 lumber, 1 nails, 1 glass | 6 | 1 household of up to 6 |
| Brick house (hub only, needs brickworks) | 10 bricks, 3 lumber, 1 nails, 2 glass | 8 | 1 household of up to 6 |
| Business building | 10 lumber, 2 nails, 2 glass | 10 | One business |
| Boarding house | 16 lumber, 3 nails, 3 glass | 14 | 12 beds |
| Hotel | 30 lumber, 4 nails, 6 glass, 2 furniture | 25 | 20 beds |
| Church | 20 lumber, 3 nails, 4 glass | 18 | Amenity |

### Resources

Deposits are placed by hand on the region map and are hidden until surveyed. A survey of any line segment reveals deposits within 40u of the surveyed route, and a surveyor can be sent on a "prospecting" task to reveal a 60u radius around a point (1 day per task).

| Deposit | Industry | Setup materials (once) | Running inputs per week | Output per worker per day | Workers |
|---|---|---|---|---|---|
| Timber stand | Sawmill | 6 tools, 1 machinery, 20 lumber | 1 tools | 2 tons of logs cut, milled to 1.5 bundles lumber | 6 to 12 |
| Coal seam | Coal mine | 10 tools, 20 lumber, 4 powder | 4 powder, 4 lumber (props), 1 tools | 0.6 tons coal | 8 to 20 |
| Stone bluff | Quarry | 8 tools, 4 powder | 3 powder, 1 tools | 0.5 pallets stone | 6 to 12 |
| Silver lode | Silver mine | 12 tools, 30 lumber, 6 powder, 2 machinery | 6 powder, 5 lumber, 2 tools | 0.05 tons ore | 10 to 25 |
| Fertile land | Farms (homestead cluster) | 4 tools per farm, 1 seed sack per farm | none | Grain harvested in autumn: 30 sacks per farm | 2 per farm, up to 8 farms |
| Clay bank (hub only) | Brickworks | 6 tools, 10 lumber, 1 machinery | 2 tons coal | 1 pallet bricks | 4 to 8 |

Industry workers are citizens of the resource town, hired the normal way (miners and farmers arrive as immigrants once the industry is approved).

### Town supply stages

Every town walks the same path from cost to contributor:

1. **Camp**: needs crew rations, water, tools, tents and track materials. Produces nothing.
2. **Settlement**: needs house materials (lumber, nails, glass) and staples for the general store.
3. **Village and Town**: adds shop inputs (fabric, iron, lumber, whiskey, medicine).
4. **Producing town**: first needs the industry's setup materials and running inputs, then ships output. The town flips from net importer to net exporter. A sawmill town now supplies lumber to every other town; a coal town fuels your engines and the brickworks.

### Production chains

| Chain | Steps |
|---|---|
| Lumber | Timber stand -> sawmill (logs to lumber) -> developer, carpenter, mine props, trestles, ties (a sawmill can cut ties: 1 ton logs = 2 tie bundles) |
| Fuel | Coal mine -> coal stages -> locomotives (doubles range, halves fuel cost); brickworks; town heating (replaces cordwood) |
| Building | Clay -> brickworks (with coal) -> bricks -> brick houses and the grand depot |
| Clothing | Fabric (import) -> tailor -> clothing |
| Tools | Iron bar (import) -> blacksmith -> tools and hardware |
| Food | Grain -> hub flour mill (late hub building: 2 grain = 1 flour) -> bakeries and stores |
| Money | Silver ore -> exported Outside at a high sell price |

## 13. Building the line

Line building runs in four physical stages, survey, grading, bridging and track laying, and each stage consumes workers' time and materials that you delivered to the railhead. Speed of progress is decided by supply, not by a quality choice.

### Terrain

- Heightmap with one height per tile corner, 0u to 40u. Terrain types per tile: grass, dirt, rock, sand, water (river or lake), forest (trees must be cleared: 0.5 laborer-days per tile, yields 0.5 tons of logs).
- Rendered as flat-shaded triangles with vertex colors by type, height, slope and season (section 17).

### Survey

1. In survey mode (V), the surveyor (player or staff) places stakes starting at the railhead. Each stake is a waypoint. The game fits a track alignment through them using the build tool's rules (section 6) at mainline limits.
2. The game computes a **track bed profile**: bed heights along the route smoothed to meet the 2.5% grade limit, preferring to follow the terrain. Where bed is above terrain, it is fill; below, it is cut. Where fill would exceed 3u, or the route crosses water, it becomes a trestle.
3. The survey panel shows: length (u and miles), earthwork units, rock earthwork units, trestle tiles, forest tiles, and the total materials and labor-days, plus a cost estimate at current market prices.
4. A surveyed alignment is a plan only. It becomes real only when a surveyor walks it: the surveyor moves along the route at 0.5 tiles per game minute, driving stakes. Survey status: Planned -> Staked.
5. Staking reveals resource deposits within 40u of the route (section 12).

### Construction stages

The staked line is split into **segments** of 5 tiles (10u). Each segment goes through these stages in order. A stage can start on a segment once the previous segment has finished the same stage; stages overlap down the line like a real construction train.

| Stage | Work per segment | Materials per segment | Crew rate |
|---|---|---|---|
| Clearing | 0.5 laborer-days per forest tile | None (yields logs) | Laborers |
| Grading | Earthwork units = sum over the 5 tiles of round(abs(bed height - terrain height) x 4) | Rock tiles: 1 keg powder per 10 rock units | 6 earthwork units per laborer-day |
| Bridging | Trestle tiles in the segment | 3 lumber bundles + 1 nails keg per trestle tile | 1 tile per 6 carpenter-days |
| Track laying | 5 tiles of track | 2 tie bundles, 1 rail bundle, 1 spike keg | A gang of 8 track layers lays 15 tiles (3 segments) per day when supplied |
| Telegraph | 1 pole per 10u | 1 pole ($5, bought or cut from logs: 1 ton logs = 4 poles), 1 wire coil per 3 segments | 1 laborer-hour per pole |

When the last segment between the old railhead and a station site is laid, the new track joins the network and becomes available to dispatch.

### The railhead stockpile

- Materials for the line are delivered by work train to the end of track and unloaded onto the **railhead stockpile** (a cleared area beside the track that moves forward as the track advances). Unloading is a task like any other.
- Crews carry materials from the stockpile to the work face. Each laying gang has a push car (included) that carries 6 items along newly laid track. If the stockpile is more than 30u behind the work face, laying slows by 1% per extra unit of distance, down to 50%.
- Construction stops at a segment the moment any required material runs out. Idle crews still draw wages and rations.

### The camp

Crews live in a camp at a chosen point beside the track.

| Camp need | Per worker per day | Source |
|---|---|---|
| Flour | 0.04 sack | Delivered |
| Beans | 0.03 sack | Delivered |
| Salted meat | 0.02 barrel | Delivered |
| Coffee | 0.01 sack | Delivered |
| Water | 0.2 barrel | Free if a river or well is within 20u of camp; otherwise delivered (water car) |
| Tools | 1 crate per 40 worker-days | Delivered |
| Tents | 1 tent bale per 6 workers, once | Delivered |
| Cook | 1 cook per 15 workers | Hired |

Rations are stored in the camp's supply tent. The cook turns them into meals; without a cook, rations are used 30% faster.

**Crew work rate** is a single multiplier per camp (not per person): 1.0 base; -0.1 if coffee is out; -0.1 if meat is out; -0.5 if flour or beans is out; 0 if water is out (work stops); x(1 - max(0, d - 40) / 160), minimum 0.25, where d is the walking distance in u from camp to the work face. Missed payday: 20% of the crew quits per missed week.

### Moving day

When the work face is far enough that the distance penalty bites, the player (or the foreman, once hired, when the rate drops below 0.7) orders the camp moved.

1. Pack: 0.5 days of crew labor; tents and supply tent go onto flatcars (1 flatcar per 3 tents, 1 for the supply tent).
2. Haul: the work train moves them forward.
3. Pitch: 0.5 days at the new site.

Work stops during packing and pitching.

### Camp followers

When a camp has 12 or more workers, each day there is a 15% chance a follower business arrives by train: a saloon tent, a store tent, a laundry or a gambling tent (one of each at most). Followers are businesses with proprietors, sell to the crew (the crew has wages to spend), and place delivery contracts with you. They move with the camp. When a town is founded at a camp site, each follower has a 70% chance to stay and become that town's first business.

### Founding a town

A town can be founded at the camp's site, or at any point on your finished line, if:

- It is at least 60u along the line from any other station.
- A flat area of 24 x 16 tiles beside the track is available (or graded flat first, as a construction job).
- Water is within 30u, or a well is dug (3 laborer-days, 2 tools).

Founding places the satellite station kit (section 15) as a construction job: depot, two platforms, the passing track and a water tower. Once the depot is built, the town is live: a station agent can be assigned, the plat is laid out, and crew members with the "settler" trait (20% of crew) and staying followers become its first households.

### Delegation on the line

| Role | Takes over |
|---|---|
| Surveyor | Placing stakes along a route the player sketches (5 waypoints), staking, prospecting |
| Foreman | Ordering supplies for the railhead (as standing orders to the hub), moving camp, assigning crews to stages |
| Cook | Meals |
| Work train crew | Running the daily supply train and unloading at the stockpile |

## 14. Staff, delegation and tasks

All work in the game, by the player or by staff, is expressed as tasks in a shared queue, so handing a job to someone means letting a staff member take tasks the player used to take. Staff are ordinary citizens with a railroad role, a skill level and a shift.
### Roles

| Role | Where | Can do | Phase usually hired |
| --- | --- | --- | --- |
| Freight handler | Any station | Load, unload, sort, local delivery, shovel bulk | 1 |
| Ticket clerk | Station | Staff ticket window, baggage | 1 |
| Switchman | Hub | Throw switches, couple, uncouple, light switch lamps | 1 |
| Engineer | Train | Drive a locomotive (required) | 1 (starting engineer included) |
| Fireman | Train | Fire a locomotive (required), refuel en route | 1 (starting fireman included) |
| Brakeman | Train | Couple, uncouple, set out and pick up cars, hand brakes | 2 |
| Conductor | Train | Collect fares aboard, run station work for the train | 2 |
| Telegrapher | Station | Work the telegraph (required for dispatch at that station if no agent) | 2 |
| Station agent | Satellite town | Everything at a satellite station: tickets, telegraph, freight, switches, lamps | 2 |
| Lamplighter | Hub | Lamps | 2 |
| Hostler | Hub, engine facilities | Fuel, water, turn engines, operate turntable | 2 |
| Surveyor | Line | Survey, stake, prospect | 2 |
| Laborer | Line, hub | Clearing, grading, unloading work trains, general hauling | 2 |
| Track layer | Line, hub | Lay track, build switches | 2 |
| Bridge carpenter | Line, hub | Trestles; railroad buildings | 2 |
| Cook | Camp | Meals | 2 |
| Foreman | Line | Runs a camp (section 13) | 2 |
| Yardmaster | Hub | Automates yard moves to sort cars by destination | 3 |
| Tower operator | Hub | Sets routes from an interlocking tower | 3 |
| Stationmaster | Hub or large station | Runs the station: assigns staff, reorders, renews standing contracts, sets platform plans | 3 |

### Skill

- Each staff member has a skill from 1 to 5 in their role, gaining XP for each completed task (level thresholds 0, 100, 300, 700, 1,500 XP; one task = 1 XP, a whole shift with no errors = +5).
- **Speed**: task duration x (1.4 - 0.1 x skill), so skill 1 = 1.3x as long, skill 5 = 0.9x.
- **Errors**: chance per task = 6% - 1.5% x (skill - 1), so 6% at skill 1, 0% at skill 5. An error is never catastrophic. Examples: an item put in the wrong bay (creates a fix task), a ticket sold to the wrong destination (passenger complains, -1 reputation), a switch thrown late (train waits), a delivery left at the wrong door.
- Staff can be promoted to a related role at the same skill minus 1 (for example switchman to yardmaster, clerk to station agent).

### Shifts and housing

- Each staff member works a shift: Day (06:00 to 18:00), Night (18:00 to 06:00), or Train (follows their train's roster). Six days a week; Sunday only if they are rostered to a Sunday train or station.
- Staff are citizens and need housing like anyone else. The railroad can build a **section house** (bunkhouse, 8 beds) at any station; railroad housing counts as "own house" for satisfaction and is free to staff.

### The task queue

Events create tasks automatically. Each task has: type, location, required role (or "any"), priority, earliest start, deadline, estimated duration, and payload (the item, switch, car or segment).

| Task | Created by | Base duration (game minutes, plus walking) |
| --- | --- | --- |
| Unload item | Train arrives with items for this station | 0.2 + carry |
| Load item | Train scheduled to depart with items waiting in a bay | 0.2 + carry |
| Sort item | Item on platform or in a wrong bay | 0.2 + carry |
| Deliver item | Item in a bay tagged for a local consignee | 0.2 + walk |
| Staff ticket window | Passengers queued and nobody at the window | 0.5 per passenger |
| Throw switch | Route requested | 0.5 |
| Couple / uncouple | Move sequence step | 1.0 / 0.5 |
| Fuel and water | Engine stopped at a facility below 50% | 4 |
| Turn engine (turntable) | Move sequence step | 3 plus drive on and off |
| Light lamps | Sunset (one task per lamp) | 0.3 |
| Send or receive telegraph | Orders, contract replies, dispatch at that station | 1 |
| Shovel bulk | Gondola to unload or load without a chute | 60 per car |
| Survey segment, grade segment, build trestle tile, lay track segment, string telegraph | Construction plan | Per section 13 |
| Unload work train | Work train at railhead | 0.2 + carry per item |
| Build railroad structure | Hub or station build job | Labor-days in section 21 |

### Assignment

Every tick (8 game seconds), idle staff pick a task:

1. Only tasks their role can do, in their assigned **zone** (a station, a set of platforms or a camp; set by the player or stationmaster).
2. Highest priority first. Default priority order (editable per station): dispatch-blocking tasks (switches, couplings, telegraph) > passengers > mail > deliveries with a due date today > unloading > sorting > loading for tomorrow > lamps > everything else.
3. Among equal priority, the nearest task.
4. A task taken by someone is reserved; the player can take any task by doing it, which releases it from whoever reserved it (that staff member picks another).

Tasks with nobody able to take them before their deadline raise a soft alert ("Nobody to throw switch 12 for No. 3").

### The stationmaster

A stationmaster assigned to a station automates the player's routine decisions there:

- Assigns zones and shifts to staff, keeping at least one person on every dispatch-blocking role during operating hours.
- Renews standing contracts that are profitable (margin above 10%) and lets others lapse, always notifying the player.
- Places standing import orders to keep warehouse stock of each contracted good at 1.5 weeks of demand.
- Requests hires when queues persist (posts the job; the player approves hires above base wage).
- Decision quality scales with skill: at skill 1 they over-order by up to 30% and react to shortages a day late; at skill 5 they are as good as the stated rules.

This is what lets the player move their residence out to the line (section 3).

## 15. The hub and station building

The hub is the only place the player designs freely: tracks, platforms, sheds, engine facilities and yards inside a boundary that grows by buying land. Satellite stations are a fixed kit with a few optional add-ons.

### Starting hub

- Boundary 60 x 40 tiles beside the Overland's interchange.
- Interchange track (Overland side, inbound and outbound, not editable), one main track, one platform track with a 20u platform, a small depot (ticket window, telegraph, office desk, the player's rooms upstairs), a 4-bay freight shed, a water tower, a wood stage and one switch stand.
- Town: about 25 people: a general store, a boarding house, a saloon and the developer's yard, plus 4 shanties.

The hub comes with an existing 160u (10 mile) single-track spur to **Willow Ford**, a settlement of about 10 people with a satellite station kit (unstaffed at start; the player is its agent until someone is hired). It gives phase 1 a two-station railroad, a run-around move at the far end, and a first destination for goods and passengers. New line building starts from either end.

### Building catalog

| Structure | Footprint (tiles) | Cash | Materials | Labor (builder-days) | Function | Unlock |
| --- | --- | --- | --- | --- | --- | --- |
| Platform section | 1 x 4 per section | $20 | 2 lumber | 1 | Boarding area, 8u long per section | Start |
| Small depot | 4 x 3 | $150 | 20 lumber, 2 nails, 2 glass | 8 | Ticket window, telegraph, office | Start |
| Grand depot (hub) | 10 x 5 | $2,500 | 40 bricks, 30 lumber, 4 nails, 10 glass, 2 furniture | 40 | 3 ticket windows, waiting room (+20% passenger patience), baggage room | Brickworks |
| Freight shed | 6 x 4 | $250 | 24 lumber, 3 nails | 10 | 12 bays of 8 items | Start |
| Warehouse | 8 x 6 | $500 | 40 lumber, 5 nails, 2 glass | 18 | 10 bays of 24 items | Phase 1 |
| Loading dock (team track) | 2 x 8 | $80 | 8 lumber | 3 | Load and unload a car from wagons or carts at platform height | Start |
| Station crane | 2 x 2 | $300 | 6 lumber, 1 machinery | 4 | Lifts machinery and long items; one-person handling | Phase 2 |
| Water tower | 2 x 2 | $120 | 15 lumber, 1 tools | 5 | Water for engines (windmill pump included) | Start |
| Wood stage | 3 x 2 | $60 | 8 lumber | 2 | Holds 40 cords; refuels wood engines | Start |
| Coal stage | 3 x 2 | $200 | 12 lumber, 1 tools | 5 | Holds 60 tons; refuels coal engines; gondolas dump into it | Coal town |
| Turntable | 5 x 5 pit | $1,800 | 10 lumber, 4 rails, 1 machinery | 15 | Turns one engine | Phase 2 |
| Wye | Layout (about 30 x 20) | $600 | Track materials | Track build | Turns engines and short trains | Start |
| Roundhouse (per stall) | 4 x 6 per stall, fan around the turntable | $400 | 16 lumber, 2 nails, 1 glass | 8 | Stores an engine; engines in a stall overnight are serviced (no breakdown rule, but +10% max speed next day as "fresh") | Turntable |
| Engine house (no turntable) | 4 x 8 | $350 | 18 lumber, 2 nails | 8 | Stores 1 engine | Phase 1 |
| Section house | 4 x 4 | $200 | 14 lumber, 2 nails, 1 glass | 6 | 8 beds for staff | Phase 1 |
| Telegraph office | 3 x 3 | $120 | 8 lumber, 1 glass, 1 wire coil | 4 | Second telegraph desk; faster offers and dispatch at the hub | Phase 2 |
| Interlocking tower | 3 x 3, two storeys | $1,500 | 20 lumber, 2 glass, 2 machinery | 14 | Controls up to 16 switches within 24u (section below) | Phase 3, hub 5+ platforms |
| Yard ladder and tracks | Layout | Track cost | Track materials | Track build | Car sorting by destination | Phase 3 |
| Flour mill | 6 x 6 | $1,200 | 30 lumber, 2 machinery, 1 tools | 20 | 2 grain to 1 flour | Farm town |
| Brickworks | 8 x 6 | $900 | Per section 12 | 15 | Bricks | Clay bank |
| Lamp post | 1 x 1 | $8 | 1 lumber, 1 glass | 0.3 | Lights 4u radius | Start |

Upkeep: every railroad structure costs 0.2% of its cash price per week (paid Saturday).

### Building while running

The hub never closes. Placing a structure creates a construction job; tracks or blocks inside its footprint are marked "under construction" and closed to routing from the moment work starts until it finishes. The planner warns if a job would cut a platform or route a timetable uses, and lets the player schedule the start ("start after 21:00").

### Interlocking tower

- Covers every switch within 24u (up to 16 levers). A tower operator on shift sets routes through covered switches without anyone walking.
- Route setting time: 0.2 game minutes per switch at skill 3, scaled by skill as in section 14.
- The tower forbids conflicting routes (two routes sharing a block or a switch in opposite positions), which is the classic purpose of interlocking.
- Switches not covered by a tower still need a switchman.

### Yard and the yardmaster

A yard is any group of parallel tracks fed by a ladder. Each yard track can be tagged with a destination (like freight shed bays). The yardmaster creates yard moves that pull cars from an arrival track and set each car on the yard track matching its destination, then build outbound trains from those tracks before their scheduled departures. Without a yardmaster, the player does this with manual yard moves.

### Hub land

The boundary expands in strips of 40 tiles on any side, $40 per tile of width ($1,600 per 40-tile strip), up to 200 x 160 tiles. Land under town lots cannot be bought (the town plat surrounds the hub's tracks on one side; expansion goes the other way first).

### Satellite station kit

| Element | Spec |
| --- | --- |
| Tracks | Main track plus passing track, 40u long between switches, 1.6u apart |
| Platforms | Platform 1 beside the main track on the depot side, platform 2 beside the passing track on the far side, each 24u long, joined by a board crossing at the platform end |
| Depot | Small depot (as above) with a 4-bay freight room, telegraph, ticket window and agent's quarters (1 household) |
| Water tower | Included |
| Optional add-ons (fixed pads) | Wood or coal stage; freight shed; section house; wye (if a 30 x 20 pad is free); turntable (from 1870); one industry spur (from either end of the passing track, up to 60u long, to a loading point: tipple, log deck or stone dock) |
| Hard rule | No third platform or third through track, ever. Double tracking (section 6) adds the second main line beside the kit, not more platforms. |

## 16. UI and UX

The world is the main interface: shortages, queues and idle crews should be visible in the scene before they show in any panel. Panels are styled as period paperwork (ledgers, telegraph forms, timetables) but must stay crisp and readable.

### HUD (always on screen)

| Element | Position | Content |
| --- | --- | --- |
| Clock | Top left | Day name, date, time (HH:MM), weather icon, speed (pause / 1x / 2x / 4x) |
| Cash | Top left, under clock | Cash on hand; tooltip with today's in and out |
| Telegraph tape | Top center | A scrolling tape of the latest 3 notifications; click to open the inbox |
| Carried item | Bottom center | Icon and waybill of what the player carries |
| Interaction prompt | Above the highlighted object | Key + verb ("E Throw switch 12") |
| Alerts | Right edge | Stacked icons for active problems: stuck trains, missed deadlines, idle crew, out-of-stock businesses. Click jumps the camera there. |
| Next job line (D21, built 2026-11-03; since D22 the only line at the top: the Current task chip is gone, the line names the tutorial's step and pulses when a new one comes) | Top, under the clock (portrait) or between the cash and the telegraph button (landscape) | What to do next and where, in plain words with game times ("Next: set switch 1 for the turn-off by 08:07", "Next: sell tickets, 6 waiting at the hub", "Next: take a contract at the work board"); during the tutorial its step. A tap shows the helper arrow to the place. The same job as the helper arrows' (one source). Can be hidden in Settings (the gear beside the Arrows toggle; kept in the browser). |
| First-time cards (D22, built 2026-11-04) | Middle of the screen, over everything | The first time each thing happens in a game (the Overland in with your goods, travellers off it, a traveller at the window, your train in at the hub, a train waiting at a wrong switch, switches due on the work board, a low tender, a contract offer, goods waiting in the freight shed, a delivery paid, Saturday pay, the Overland taking cars away) the game pauses and a short card says what happened, why and what to do; "Show me" puts the helper arrow on the place, "OK" closes it; the game then runs on at its speed. Each shows once per game (kept in the save). During the tutorial a card whose moment a tutorial telegram covers waits, and is dropped once the tutorial has taught it. Off in Settings. |
| Warnings ahead (D22, built 2026-11-04) | A message, and the Next job line | About 30 game minutes before the Overland and before each of our trains arrives at a station, what it brings, from the work board's figures ("The Overland is due at 18:00 with 2 cars of your goods and about 2 travellers. Meet it at the interchange."). Only for a train running to time. |
| Work board button (D22, built 2026-11-04) | Bottom row | Always there while the player is anywhere on the hub's station area (and in a booth): walks the player to the work board and opens its card. |
| Train plates (D21, built 2026-11-03) | Over each engine | "No. 1, yours" on a yellow plate over our engine (always on), a plain grey "Overland" over the Overland's; our engines and cars carry a yellow stripe. |
| Minimap | Bottom right (toggle) | Schematic of the network with trains as dots |

### Office panels (Tab)

Opened at the office desk anywhere (or from anywhere once a stationmaster exists, to keep remote management possible but not the starting habit). The game does not pause in panels.

| Panel | Contents |
| --- | --- |
| Timetable | Stringline diagram and stop table (section 8); service list; add, copy, delete services |
| Trains | Every train service and instance; consist editor with load rules per car; current position; delays |
| Rolling stock | Every engine and car: location, condition flags, fuel and water, buy and sell |
| Contracts | Offers (accept or decline), active contracts with progress and due dates, history |
| Market | Overland prices with 8-week sparkline per commodity; place import orders |
| Staff | Roster with role, skill, XP, shift, zone, wage; hire from applicants; fire; promote |
| Towns | Per-town ledger (section 11) and newspaper archive |
| Construction | Every job (hub and line) with stage, materials needed vs delivered, crew and ETA |
| Ledger | Money in and out by category and period; loans |

### Modes

- **Build (B)**: catalog on the left, ghost placement with validity color, rotate with R, confirm with click. Shows materials and labor for the job.
- **Survey (V)**: stake placement over terrain, live profile graph (terrain vs bed height) along the bottom, totals panel.
- **Yard move**: click a train or a car (selects the cut from that car to the end), then click a target track; the route preview shows the switches that will need throwing.
- **Inspect**: right click anything for an inspect card. Citizens show name, origin, household, home, job, arrival date and train, and their current need ("looking for flour"). Items show the full waybill and handling history. Trains show consist, timetable and delay reason.

### Visual language

- Destination color-and-letter tags are used everywhere a destination appears: items, bays, yard tracks, the stringline and the map.
- Problem states appear in the world: unsorted items pile on the platform, a queue forms at the ticket window, an out-of-stock store has an empty window display, idle crew sit on the rails, a business short of an input shows a small speech-bubble icon of the missing commodity.
- Typography: Rye (or a similar wood-type display face) for big headings only; a clear humanist sans (for example Barlow) for everything else; tabular numerals for times and money.
- Colors: the palette in section 17; railway green and brass as the UI accents. Light and dark UI themes.

### Onboarding

The first two days are a guided tutorial delivered as telegrams from your Eastern investor: unload your first car, sort it, deliver to the store, sell tickets for the evening train, throw a switch, accept a contract, place an import order. No modal tutorials after day 2; a help ledger explains every system on demand.

### Accessibility

All keys rebindable; UI scale 75% to 150%; colorblind-safe tags (color plus letter plus shape); pause anywhere; subtitle text for all audio cues (whistles, bells, telegraph); reduce-motion option (no camera lag, no ambient sway).

## 17. Art direction

The look is low-poly, flat-shaded and warm, with every model built procedurally in code from primitives, so art ships from milestone 0 with no external asset pipeline. The approved reference is the style test page ([Railhead style and character tests](https://claude.ai/artifact/LP1jb2HoXzyQ4wccMME4bQ)): the low-poly scene and character pitches 1, 2 and 3.

### Rendering rules

- three.js `MeshStandardMaterial` with `flatShading: true`, roughness 0.9, metalness 0. No textures in 1.0 except UI.
- Orthographic camera at true isometric elevation (35.264 degrees), yaw in 90-degree steps, zoom 0.6x to 4x.
- One directional sun with soft shadows (PCF soft, 2048 map, shadow camera following the camera focus, covering 48u x 48u), plus a hemisphere light. No post-processing in 1.0.
- Low segment counts: cylinders 6 to 8 sides, spheres as icosahedrons (detail 0 or 1), trees as stacked cones.

### Base palette

| Name | Hex | Used for |
| --- | --- | --- |
| Grass | #8a9f55 | Terrain (summer) |
| Dirt | #7a5a3a | Terrain, track bed |
| Rail | #55534f | Rails, iron |
| Tie | #5b4128 | Ties, rough timber |
| Wall | #b9875a | Wood siding |
| Trim | #6e4426 | Doors, frames, posts |
| Roof | #7d3424 | Roofs (barn red) |
| Platform | #a39684 | Platforms, boardwalks |
| Loco | #2e2d30 | Engines, iron |
| Brass | #c69a2c | Brass, badges, headlamps |
| Red | #9e3a26 | Cabs, boxcars, wheels |
| Canvas | #e4d6b6 | Tents |
| Leaf | #4b6e2e | Trees |
| Window glow | #ffcf73 | Lit windows and lamps (emissive) |
| Shirt | #e6dcc4 | Clothing |
| Navy | #25324a | Uniforms |
| Flannel | #9b3b30 | Work shirts |
| Hat | #6b5232 | Slouch hats |

Variation: each instance of a building or character may shift hue by plus or minus 4 degrees and lightness by plus or minus 6% (seeded per entity) so towns don't look cloned.

### Characters

Three body kits, used as a visual language for status. Every person is assembled from primitives at runtime from a seeded description (body, skin, hair, beard, hat, colors).

| Kit | Height | Proportions | Used for | Signature shapes |
| --- | --- | --- | --- | --- |
| Chunky | 1.0u | Big head (radius 0.17u), short legs, about 3 heads tall | The player, townsfolk, station staff, clerks | Visor caps, vests, armbands |
| Lanky | 1.4u | Small head (0.10u), long legs, long coat flaring to 0.21u | Authority and money: conductors, bankers, hotel owners, inspectors, doctors | Kepis, bowlers, frock coats, beards |
| Stocky | 1.1u | Wedge torso (0.29u shoulders to 0.19u waist), thick arms | Laborers: track crew, freight handlers, miners, builders | Wide slouch hats, flannel, rolled sleeves, a tool in hand |

- Skin tones: 8 values from #f2d2b6 to #5a3a26. Hair: black, dark brown, brown, red, blond, grey. Faces have no eyes or mouth (keeps the three kits consistent); a nose block and mustache or beard give character.
- Role readability: hats are the main role marker (visor cap: railroad staff; kepi: conductor; slouch: laborer; bowler: merchant; bonnet: women townsfolk; none: children). Uniformed railroad staff wear navy.
- Women use the same kits with a long skirt (a cone from waist to ground) replacing legs, and bonnets or hair buns.
- Children: the chunky kit at 0.7 scale.

### Character animation

Procedural, no skeletal rigs. Each limb is a group with its pivot at the joint.

| State | Motion |
| --- | --- |
| Idle | Body scale-y breathing 1.5% at 0.35 Hz; slow weight shift from foot to foot (one knee eases); people also drift their yaw plus or minus 8 degrees |
| Walk | D20: knees and elbows (thigh and shin, upper arm and forearm), feet placed by the walk so they never slide; about 4 steps a real second at walk speed (stride about 1u); heel strike with the toes up, knee bend in the swing, hips dropping at each heel strike (body bob twice a stride), twisting and rolling; arms swinging against the legs with elbows bending forward; head held level |
| Carry | Both hands hold the item at its sides in front of the chest, shoulders back a little; legs walk |
| Push cart | Leaning into the handles, arms straight to the grips, shorter steps |
| Work (hammer, shovel) | Two-handed maul blows: wind-up overhead, a fast strike folding at the hips and knees, follow-through; setting a tie or dropping a rail bends at the hips and knees |
| Throw switch | Reach down, a two-handed pull back sitting into the legs, let go and straighten, over the throw |
| Sit (bench, saloon) | Legs forward 90 degrees |

### Buildings

A kit of parts, sized on the tile grid: wall boxes, prism roofs (gable), shed roofs, false fronts with a trim cap, porches with posts, chimneys, emissive windows, doors, signs (blank boards; text drawn as a canvas texture later). Each building type in sections 12 and 15 is a recipe of parts. Construction shows three visual stages: frame (posts and beams), walls, finished.

### Trains

As in the reference page: boiler cylinder with brass bands, flared stack, dome, cab, cowcatcher, headlamp with emissive lens, spoked-look wheels (7-sided cylinders that visibly turn), tender with wood stack or coal. Cars are boxes with roofs, doors and wheels. Smoke: pooled icosahedron puffs, 18 per engine, faster spawn when accelerating, drifting back with train speed.

### Terrain and nature

- Terrain mesh per 32 x 32 tile chunk, flat-shaded, vertex colors by type, height and slope. Water: flat planes at river level with a slight vertex wave.
- Trees: pine (stacked cones), cottonwood (icosahedron crowns), sagebrush (small clusters). InstancedMesh per chunk.
- Seasons: grass shifts from spring #9aae5c to summer #8a9f55 to autumn #b49a52 to winter (snow) #e8ecef; cottonwoods turn gold in autumn and bare in winter.

### Day and night

Lighting keyframes interpolate over the day, as in the reference page:

| Key | Background | Sun color | Sun intensity | Hemisphere intensity | Sun elevation |
| --- | --- | --- | --- | --- | --- |
| Dawn | #e9b48e | #ffb27a | 0.75 | 0.45 | 12 degrees |
| Noon | #b9d3d8 | #fff4e0 | 1.15 | 0.65 | 60 degrees |
| Dusk | #d98a62 | #ff8a52 | 0.70 | 0.40 | 14 degrees |
| Night | #121828 | #7f95d8 (moon) | 0.22 | 0.20 | 45 degrees |

Windows, lamps and fires turn emissive as night falls. Only the 8 light sources nearest the camera focus get real point lights; all others are emissive only.

### Weather

Rain: streak particles and darker sky; snow: falling particles, ground tinting toward the winter color over a day; blizzard: dense particles and reduced visibility fog.

## 18. Audio

Sound carries information first and mood second: the player should hear a train coming, a telegram arriving and a crew going quiet before they see them. All audio runs through the Web Audio API with distance attenuation from the camera focus.

### Sources

CC0 or self-recorded samples, plus simple synthesis for the telegraph sounder and bells. Every file is listed with its license in `/assets/audio/CREDITS.md`.

### Sound effects

| Sound | Trigger | Notes |
| --- | --- | --- |
| Exhaust chuff | Moving locomotive | Rate tied to wheel rotation (4 chuffs per driver revolution); volume tied to acceleration |
| Whistle | Departure (two short), approaching a station (one long), crossing (long, long, short, long) | Distinct pitch per engine class |
| Bell | Engine moving in a station or yard | |
| Brake squeal and couple clank | Stopping; coupling | |
| Telegraph sounder | Incoming and outgoing telegrams | Plays the actual message in Morse at about 15 words per minute, cut short after 3 seconds |
| Switch throw | Lever thrown | Metallic clunk |
| Footsteps | Player and nearby agents | Surface-dependent: boards, dirt, gravel |
| Item handling | Pick up, put down | Per item type: crate, sack, barrel |
| Hammering and shoveling | Construction and railhead work | Loops while crews work; silence when they are idle is a cue |
| Town ambience | Full-detail town | Crowd murmur scaled by agents nearby, dogs, wagons |
| Saloon piano | Evenings near the saloon | |
| Weather | Rain, wind, blizzard | |

### Music

Sparse period folk: fiddle, banjo, harmonica, guitar, pump organ. One morning theme, one working theme, one evening theme, one night theme, one line theme (more percussive), plus short stingers for town founded, business opened and line completed. Music plays at low volume and fades out entirely for 2 minutes after each piece.

## 19. Technical architecture

The game is a TypeScript web app with a deterministic simulation that knows nothing about rendering, and a three.js renderer and Preact UI that only read simulation state and send commands. This split is what makes saving, testing, time-scaling and parallel agent work safe.

### Stack

> **Changed 2026-11-01:** one HTML file with three.js r128 from cdnjs. See section 0, decision D2.

| Piece | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript 5, `strict: true`, no `any` | |
| Build | Vite | `npm run dev`, `npm run build`, `npm test` |
| Rendering | three.js, pinned to an exact release at least two weeks old (for example `0.169.0`) | Use `InstancedMesh` and `BufferGeometryUtils.mergeGeometries` heavily |
| UI | Preact with `@preact/signals` | DOM panels over the canvas |
| Tests | Vitest (unit and scenario), Playwright (one smoke test: game boots, day runs) | |
| Lint | ESLint + Prettier, plus a custom rule banning `Math.random`, `Date.now` and `performance.now` inside `src/sim` | |
| Runtime | Node 20+ for tooling; browsers: current Chrome, Firefox, Safari, Edge | |

### Repository layout

> **Changed 2026-11-01:** one HTML file organised in labelled sections. See section 0, decision D2.

```
railhead/
  src/
    sim/            pure TS; no three, no DOM
      core/         time, rng, ids, events, commands, state
      track/        graph, geometry, blocks, validation
      trains/       stock, movement, moves, turning
      dispatch/     timetables, reservations, routes, deadlock
      cargo/        items, waybills, sheds, bays, interchange
      people/       citizens, households, schedules, pathfinding
      towns/        plat, stages, developer, businesses, migration
      economy/      market, contracts, ledger, wages, loans
      tasks/        task types, queue, assignment, skills
      construction/ survey, segments, camps, jobs
      world/        terrain, deposits, weather
      sim.ts        tick loop, system order
    render/         three.js; reads sim state
      scene/        camera, lights, day-night, weather
      chunks/       terrain, track, trees per 32x32 chunk
      kits/         procedural models: characters, buildings, trains, items
      views/        per-entity views with interpolation
    ui/             Preact HUD, panels, modes
    input/          keyboard, mouse, bindings
    audio/
    data/           JSON and TS tables: commodities, buildings, roles, tuning
    save/           serialize, migrations, IndexedDB
    debug/          overlays, console, scenario loader
  tests/
    unit/           one folder per sim module
    scenarios/      headless multi-day runs with invariant checks
  assets/audio/
```

### Simulation loop

- Fixed tick of 8 game seconds. At 1x, 7.5 ticks per real second (D17; was 10); at 2x, 15; at 4x, 30; during sleep, up to 240 (time-boxed to 8 ms of work per frame, the rest carried over).
- Systems run in this order every tick:
  1. Apply queued commands (player input, UI actions).
  2. Advance time; update daylight and weather.
  3. Dispatcher: reservations, routes, switch requests, deadlock check (every 60 game seconds).
  4. Train motion.
  5. Task generation from new events (train arrivals, sunset, orders).
  6. Task assignment for idle staff.
  7. Actors: player, staff and Full-detail citizens move and progress actions.
  8. Construction progress.
  9. Hourly (on the game hour): economy consumption and purchases, production, Schedule-detail citizen moves.
  10. Daily (05:00): satisfaction, leaving and arriving, developer queue, market price moves (Mondays), payroll (Saturday 18:00 is its own trigger).
  11. Emit events to the event log (UI and audio subscribe).
- The renderer runs at display refresh and interpolates trains and actors between the last two ticks.
- The sim runs on the main thread through milestone 4 behind a narrow interface (`step(n)`, `getState()`, `send(command)`), so it can move into a Web Worker in milestone 5 if profiling calls for it.

### Determinism

- All time is an integer count of game seconds; all money is integer cents.
- One seeded PRNG (sfc32) in the sim state; every random draw goes through it, in system order.
- Iteration over entities always goes in ascending id order (entity stores are arrays or Maps iterated through sorted id lists).
- The same seed and the same command log must produce the same state hash after any number of ticks. A test enforces this.

### State and entities

- Low-count entities (trains, buildings, contracts, tracks, towns) are plain objects in Maps keyed by numeric id.
- High-count entities (citizens, items) use struct-of-arrays stores with free lists, so 1,200 citizens and 20,000 items stay cache-friendly and cheap to save.
- All state reachable from one `GameState` object, which is exactly what gets saved.
### Commands and events

- Every change the player or UI makes is a typed command (`BuyCommodity`, `AcceptContract`, `PlaceStructure`, `ThrowSwitch`, `StartAction`, `SetWage`, and so on), validated by the sim and either applied or rejected with a reason.
- The sim emits typed events (`TrainArrived`, `ItemDelivered`, `HouseholdArrived`, `ContractLate`, `TaskFailed`, and so on). The UI, audio, newspaper generator and alerts all consume events; none of them reach into sim internals.

### Rendering performance

- Static world (terrain, track, trees, finished buildings) is merged or instanced per 32 x 32 tile chunk and rebuilt only when that chunk changes.
- Characters: one `InstancedMesh` per (kit, body part), with per-instance color; limb poses are computed into instance matrices on the CPU. Up to 512 visible characters.
- Items: one `InstancedMesh` per item type.
- Frustum-cull chunks; skip rendering Schedule-detail towns entirely.

### Performance budgets

> **Changed 2026-11-01:** phone targets replace these. See section 0, decision D5.

| Measure | Target |
| --- | --- |
| Frame rate | 60 fps at 1080p on an integrated GPU (Apple M1, Intel Iris Xe) with 400 visible agents and 10 visible trains |
| Draw calls | Under 300 |
| Triangles | Under 500,000 |
| Sim tick (average, 1x, full map late game) | Under 4 ms |
| Headless benchmark | One game day of a late-game save (1,200 agents, 20 trains) in under 20 real seconds |
| Memory | Under 1 GB |

### Saving

- Save = JSON of `GameState` plus `schemaVersion`, gzipped with `CompressionStream`, stored in IndexedDB. Three manual slots, an autosave every day at 05:00 and a start-of-season autosave (kept for the bankruptcy reload). Export and import as a file.
- Every schema change ships a migration function from the previous version, with a test that loads a fixture save from each older version.

### Testing

- Unit tests for every sim module (geometry, reservations, assignment, consumption, contracts).
- Scenario tests run the headless sim for N days from a scripted start and assert invariants every tick:
  - Item conservation: items created = items present + items consumed (logged) + items sold Outside.
  - Money conservation: cash change = sum of ledger entries.
  - Agent conservation: arrivals - departures = population change.
  - Safety: never two trains in one block; no train on a switch that is not locked for it.
- Determinism test: two runs of the same seed and command log produce identical state hashes after 3 game days.

### Debug tools

With `?debug=1`: overlays for block occupancy and reservations, routes, agent paths, task queue and assignments, chunk bounds; a console (`window.rh`) to issue any command, spawn items or people, and set time; time warp up to 32x; `?scenario=<name>` to start from a named test scenario.

### Rules for implementing agents

- Nothing in `src/sim` imports from `render`, `ui`, `input`, `audio` or the DOM.
- All tunable numbers live in `src/data/tuning.ts` (or JSON in `src/data`), named as in this document. No magic numbers in systems.
- Every new sim system ships with unit tests and keeps all scenario invariants green.
- Every state field added to `GameState` is covered by save and load round-trip tests.
- When this document and the code disagree, raise it in the milestone notes; don't silently diverge.

## 20. Data model

These TypeScript types are the contract between modules; field names here are the names to use in code. Ids are numbers allocated by one counter per entity kind. Times are game seconds; money is cents; distances are world units (u).

### Core

```ts
type Id = number;
type GameSeconds = number;   // integer
type Cents = number;         // integer
interface Vec3 { x: number; y: number; z: number }

interface GameState {
  schemaVersion: number;
  seed: number;
  rng: [number, number, number, number];   // sfc32 state
  time: GameSeconds;
  speed: 0 | 1 | 2 | 4;
  weather: Weather;
  world: WorldState;          // terrain, deposits
  track: TrackState;
  trains: Map<Id, Train>;
  stock: Map<Id, RollingStock>;
  services: Map<Id, TrainService>;
  stations: Map<Id, Station>;
  towns: Map<Id, Town>;
  buildings: Map<Id, Building>;
  businesses: Map<Id, Business>;
  citizens: CitizenStore;     // struct-of-arrays
  households: Map<Id, Household>;
  items: ItemStore;           // struct-of-arrays
  staff: Map<Id, StaffRecord>; // keyed by citizen id
  tasks: TaskQueue;
  construction: Map<Id, ConstructionJob>;
  surveys: Map<Id, Survey>;
  camps: Map<Id, Camp>;
  contracts: Map<Id, Contract>;
  market: MarketState;
  ledger: LedgerEntry[];
  loans: Loan[];
  player: PlayerState;
  eventLog: SimEvent[];       // ring buffer, last 2,000
  nextIds: Record<string, Id>;
}
```

### Track and dispatch

```ts
interface TrackNode { id: Id; pos: Vec3; tangent: number /* radians, yaw */; edges: Id[]; switchId?: Id }

type EdgeGeom =
  | { kind: 'STRAIGHT' }
  | { kind: 'ARC'; center: Vec3; radius: number; startAngle: number; sweep: number /* signed */ };

interface TrackEdge {
  id: Id; a: Id; b: Id; geom: EdgeGeom; length: number;
  speedLimit: number;          // u per game minute
  blockId: Id; built: boolean; // false while under construction
  gradeA: number; gradeB: number; // bed height at each end
}

interface Switch {
  id: Id; nodeId: Id; trunk: Id; normal: Id; reverse: Id;
  state: 'NORMAL' | 'REVERSE';
  lockedBy: Id | null;         // reservation or train id
  standPos: Vec3; towerId: Id | null;
}

interface Block { id: Id; edges: Id[]; kind: 'STATION_TRACK' | 'LINE' | 'HUB'; stationId?: Id; occupiedBy: Id[]; reservedBy: Id | null }

interface Reservation { id: Id; trainId: Id; blocks: Id[]; switches: { id: Id; want: 'NORMAL' | 'REVERSE' }[]; status: 'REQUESTED' | 'SETTING' | 'LOCKED' }
```

### Trains and timetables

```ts
type StockKind = 'LOCO_440' | 'LOCO_460' | 'LOCO_040' | 'BOXCAR' | 'FLATCAR' | 'GONDOLA' | 'COMBINE' | 'COACH' | 'CABOOSE' | 'WATER_CAR';

interface RollingStock {
  id: Id; kind: StockKind; name: string;
  itemSlots: Id[];            // item ids aboard
  bulk?: { commodity: CommodityId; tons: number };
  passengers: Id[];           // citizen ids
  janney: boolean; airBrake: boolean;
  loco?: { facing: 1 | -1; fuelKind: 'WOOD' | 'COAL'; fuelMiles: number; waterMiles: number; engineer: Id | null; fireman: Id | null; odometer: number };
}

interface TrainPos { edgeId: Id; dist: number; towardB: boolean }

interface Train {
  id: Id; consist: Id[];       // stock ids, front to back
  head: TrainPos; speed: number; history: TrainPos[];
  move: Move | null; serviceId: Id | null; instanceDay: number | null;
  reservation: Id | null; delayReason: string | null;
}

interface Move { kind: 'TIMETABLE' | 'YARD'; target: TrainPos; route: Id[] /* edges */; sequence?: MoveStep[]; step?: number }
type MoveStep = { kind: 'DRIVE'; target: TrainPos } | { kind: 'TASK'; taskType: TaskType; at: Vec3; payload: unknown } | { kind: 'TURNTABLE'; turntableId: Id; angle: number };

interface TrainService {
  id: Id; name: string; trainClass: 1 | 2 | 3 | 4 | 5;
  consistTemplate: { kind: StockKind; loadRule?: { destinationTownId: Id } }[];
  stops: { stationId: Id; arrive: GameSeconds; depart: GameSeconds; track: 'MAIN' | 'PASSING' | number; actions: StopAction[] }[];
  days: boolean[];             // Mon..Sun
  turning: Record<Id, 'TENDER_FIRST' | 'RUN_AROUND' | 'WYE' | 'TURNTABLE' | 'LOOP'>;
}
type StopAction = { kind: 'LOAD' | 'UNLOAD' | 'REFUEL' | 'TURN' } | { kind: 'SET_OUT' | 'PICK_UP'; cars: number[] };
```

### Items, stations and economy

```ts
type CommodityId = string;     // 'flour', 'rails', ... (section 21)

interface Waybill { commodity: CommodityId; originTownId: Id; destTownId: Id | 'OUTSIDE'; consignee: { kind: 'BUSINESS' | 'CAMP' | 'WAREHOUSE' | 'CONSTRUCTION' | 'OUTSIDE'; id: Id }; contractId: Id | null; due: GameSeconds | null }

// ItemStore columns, indexed by item id
interface ItemStore { waybill: Waybill[]; where: ItemLocation[]; history: Id[][] /* event ids */; alive: boolean[] }
type ItemLocation = { kind: 'CAR'; stockId: Id } | { kind: 'BAY'; buildingId: Id; bay: number } | { kind: 'CARRIED'; actorId: Id } | { kind: 'GROUND'; pos: Vec3 } | { kind: 'STOCKPILE'; jobId: Id } | { kind: 'BUSINESS'; businessId: Id };

interface Station { id: Id; townId: Id; isHub: boolean; tracks: Id[] /* blocks */; platforms: Id[]; depotId: Id; agentId: Id | null; telegraph: boolean; ticketQueue: Id[] }

interface Contract {
  id: Id; kind: 'DELIVERY' | 'STANDING' | 'HAULAGE' | 'PROSPECT' | 'MAIL';
  counterparty: Id; townId: Id; commodity?: CommodityId; quantity?: number;
  pricePerUnit?: Cents; ratePerUnitMile?: Cents;
  due?: GameSeconds; repeatWeeks?: number; delivered: number; status: 'OFFERED' | 'ACTIVE' | 'DONE' | 'LATE' | 'CANCELLED';
}

interface LedgerEntry { t: GameSeconds; amount: Cents; category: LedgerCategory; counterparty: string; ref?: { kind: string; id: Id } }
interface MarketState { buy: Record<CommodityId, Cents>; sell: Record<CommodityId, Cents>; history: Record<CommodityId, Cents[]> }
```

### People, towns and work

```ts
// CitizenStore columns, indexed by citizen id
interface CitizenStore {
  name: string[]; age: number[]; sex: ('F' | 'M')[]; origin: string[]; profession: string[];
  householdId: Id[]; jobId: (Id | null)[]; kit: ('CHUNKY' | 'LANKY' | 'STOCKY')[]; look: number[] /* seed */;
  activity: Activity[]; pos: Vec3[]; path: Vec3[][]; detail: ('FULL' | 'SCHEDULE')[]; alive: boolean[];
}

interface Household { id: Id; members: Id[]; townId: Id; homeId: Id | null; housing: 'HOUSE' | 'BOARDING' | 'TENT' | 'NONE'; cash: Cents; pantry: Record<CommodityId, number>; clothing: number; satisfaction: number; unhappyDays: number; arrived: GameSeconds }

interface Town { id: Id; name: string; stage: 'CAMP' | 'SETTLEMENT' | 'VILLAGE' | 'TOWN' | 'HUB'; stationId: Id | null; plat: Plat; reputation: number; pull: number; founded: GameSeconds; walkGrid: WalkGrid }

interface Business { id: Id; type: BusinessType; townId: Id; buildingId: Id; ownerId: Id; workers: Id[]; stock: Record<CommodityId, number>; cash: Cents; openSince: GameSeconds | null; noStockDays: number }

interface StaffRecord { citizenId: Id; role: Role; skill: 1 | 2 | 3 | 4 | 5; xp: number; wage: Cents; shift: 'DAY' | 'NIGHT' | 'TRAIN'; zone: Id | null; taskId: Id | null }

interface Task { id: Id; type: TaskType; at: Vec3; role: Role | 'ANY'; priority: number; earliest: GameSeconds; deadline: GameSeconds | null; duration: GameSeconds; payload: unknown; takenBy: Id | null /* staff or player */; progress: number }
```

### Construction

```ts
interface Survey { id: Id; waypoints: Vec3[]; edges: TrackEdge[] /* planned */; profile: number[]; status: 'PLANNED' | 'STAKING' | 'STAKED'; segments: Id[] }

interface Segment { id: Id; surveyId: Id; tiles: { x: number; z: number }[]; earthwork: number; rockUnits: number; trestleTiles: number; forestTiles: number; stage: 'CLEARING' | 'GRADING' | 'BRIDGING' | 'LAYING' | 'DONE'; progress: number }

interface Camp { id: Id; pos: Vec3; workers: Id[]; supplyTent: Record<CommodityId, number>; followers: Id[]; workRate: number; state: 'PITCHED' | 'PACKING' | 'MOVING' | 'PITCHING' }

interface ConstructionJob { id: Id; kind: 'STRUCTURE' | 'TRACK' | 'SEGMENT'; target: unknown; materialsNeeded: Record<CommodityId, number>; materialsOnSite: Record<CommodityId, number>; laborDays: number; laborDone: number; crew: Id[]; blocksClosed: Id[] }
```

## 21. Tuning tables

These are first-pass numbers for `src/data/tuning.ts`; expect them to change in playtesting. Numbers already given in their own sections (speeds, rolling stock, buildings, consumption, production) are not repeated here.

### Commodities

Buy is what the Overland charges you; sell is what it pays for your exports. Prices are base values before seasonal and weekly movement (section 10).

| Id | Name | Item type | Buy | Sell | Main use |
| --- | --- | --- | --- | --- | --- |
| `flour` | Flour | Sack | $4.00 | $2.50 | Food, bakery |
| `beans` | Beans | Sack | $3.00 | $1.80 | Food |
| `meat` | Salted meat | Barrel | $9.00 | $5.50 | Food |
| `coffee` | Coffee | Sack | $6.00 | $3.50 | Food, crew work rate |
| `salt` | Salt | Sack | $2.00 | $1.00 | Food |
| `tinned` | Tinned goods | Crate | $7.00 | $4.00 | General store |
| `whiskey` | Whiskey | Barrel | $12.00 | $7.00 | Saloons |
| `fabric` | Fabric | Bale | $10.00 | $6.00 | Tailor, hotel |
| `clothing` | Clothing (4 outfits) | Crate | $18.00 | $11.00 | Households |
| `hardware` | Hardware | Crate | $14.00 | $8.00 | General store |
| `furniture` | Furniture | Crate | $20.00 | $14.00 | Hotels, houses, grand depot |
| `lampoil` | Lamp oil | Barrel | $8.00 | $4.50 | Households, lamps, church |
| `cordwood` | Cordwood (1 cord) | Long bundle | $1.50 | $0.80 | Engine fuel, winter heat |
| `tents` | Tent canvas | Bale | $9.00 | $5.00 | Camps, overflow housing |
| `lumber` | Lumber | Long bundle | $8.00 | $5.50 | Everything built |
| `ties` | Ties (bundle of 10) | Long bundle | $3.00 | $2.00 | Track |
| `rails` | Rails (bundle) | Long bundle | $40.00 | $24.00 | Track |
| `spikes` | Spikes | Keg | $6.00 | $3.50 | Track |
| `nails` | Nails | Keg | $5.00 | $3.00 | Buildings, trestles |
| `glass` | Window glass | Crate | $12.00 | $6.00 | Buildings |
| `bricks` | Bricks | Pallet (crate handling) | $10.00 | $6.00 | Brick buildings |
| `stone` | Dressed stone | Pallet | $6.00 | $4.50 | Late hub buildings, export |
| `tools` | Tools | Crate | $15.00 | $8.00 | Crews, industries |
| `powder` | Blasting powder | Keg | $20.00 | $10.00 | Rock grading, mines |
| `machinery` | Machinery | Machinery (2 people or crane) | $120.00 | $70.00 | Mills, mines, turntable |
| `iron` | Iron bar | Crate | $9.00 | $5.00 | Blacksmith |
| `wire` | Telegraph wire coil | Crate | $15.00 | $8.00 | Telegraph |
| `poles` | Telegraph poles (bundle of 4) | Long bundle | $5.00 | $2.00 | Telegraph |
| `medicine` | Medicine | Crate | $25.00 | $12.00 | Doctor |
| `books` | Books and slates | Crate | $12.00 | $6.00 | School |
| `paper` | Newsprint | Crate | $8.00 | $4.00 | Newspaper |
| `seed` | Seed grain | Sack | $3.00 | $1.50 | Farms |
| `grain` | Grain | Sack | $2.50 | $1.80 | Livery, flour mill, export |
| `logs` | Logs | Bulk (ton) | $1.20 | $0.90 | Sawmill |
| `coal` | Coal | Bulk (ton) | $4.00 | $2.80 | Fuel, brickworks, heat |
| `ore` | Silver ore | Bulk (ton) | not sold to you | $180.00 | Export |
| `mail` | Mail sack | Sack | none | none | Mail contract |

Seasonal factors: flour, beans, meat and cordwood +10% buy in winter; grain sell +20% in autumn; lumber +10% buy in spring (building season).

### Base wages (per work day)

| Role | Wage | Role | Wage |
| --- | --- | --- | --- |
| Freight handler | $1.50 | Laborer | $1.50 |
| Ticket clerk | $1.75 | Track layer | $1.75 |
| Switchman | $2.00 | Bridge carpenter | $2.50 |
| Brakeman | $2.00 | Cook | $1.75 |
| Fireman | $2.25 | Foreman | $3.00 |
| Engineer | $3.50 | Surveyor | $3.00 |
| Conductor | $3.00 | Yardmaster | $3.50 |
| Telegrapher | $2.50 | Tower operator | $3.00 |
| Station agent | $2.75 | Stationmaster | $4.00 |
| Lamplighter | $1.00 | Hostler | $1.75 |

Business wages in towns: unskilled $1.25, tradesman $1.75, builder $1.75, miner $2.25.

### Starting conditions

| Item | Value |
| --- | --- |
| Cash | $2,500 |
| Credit line | Up to $5,000 at 1% per week |
| Rolling stock | 4-4-0 "No. 1" (wood), combine, 2 boxcars, 1 flatcar |
| Staff | Engineer (skill 2), fireman (skill 1). Everything else is the player. |
| Hub town | About 25 people in 9 households: general store, boarding house, saloon, developer's yard (2 builders), 4 shanties. Willow Ford: about 10 people in 4 households, a general store tent and 3 shanties. |
| Warehouse stock | None. First import order arrives on day 1's evening interchange (tutorial). |
| First contracts | General store: 6 flour, 4 beans by day 2. Developer: 8 lumber, 2 nails for a shanty by day 4. |
| Overland interchange | 06:00 and 18:00 daily, 2 immigrant households on day 1 evening |

### Other constants

| Constant | Value | Section |
| --- | --- | --- |
| `REPUTATION_START` | 50 | 10 |
| `LATE_PENALTY_PER_DAY` | 10%, max 50% | 10 |
| `OVERDRAFT_LIMIT` | -$500 | 10 |
| `LOT_FEE_HOUSE` / `LOT_FEE_BUSINESS` | $25 / $60 | 10 |
| `LEAVE_THRESHOLD` / `LEAVE_DAYS` | 35 / 7 | 11 |
| `IMMIGRANTS_PER_PULL` / `IMMIGRANT_CAP` | 0.4 / 12 per day | 11 |
| `PASSENGER_PATIENCE` | 60 game minutes | 9 |
| `FARE_PER_MILE` | 4 cents | 9 |
| `FOLLOWER_CHANCE` | 15% per day at 12+ workers | 13 |
| `CAMP_DISTANCE_FREE` / `CAMP_DISTANCE_SCALE` | 40u / 160u | 13 |
| `STRUCTURE_UPKEEP` | 0.2% of price per week | 15 |

## 22. Development milestones

Nine milestones, ordered by risk, each ending in a playable build with testable acceptance criteria. Art is in from milestone 0 using the procedural kits. Milestones 1 and 2 carry the most risk: if working the station alone is not fun, or the town is not readable, stop and rework before going further.

Each milestone lists work packages that can be given to separate implementing agents. Packages within a milestone can run in parallel once their listed dependency is merged. Every package must keep `npm test` green, including all scenario invariants (section 19).

*[Figure in original PDF: vertical roadmap flowchart of milestones M0 to M8, with M1 and M2 highlighted and two playtest gates after them]*

- Two playtest gates come before the line and network are built
- M0 Foundations and art kit: Lay track, throw switches, run a train in final art through a day
- M1 The whistle-stop: Work the hub and Willow Ford alone; 20 minutes must be fun
- Gate: 3 of 5 playtesters want to keep playing
- M2 The living town: Named citizens arrive by train; towns grow or stall from deliveries
- Gate: a town visibly grows or stalls from what you deliver
- M3 Staff and delegation: Hand off any job; skill shows in how well it is done
- M4 Building the line: Survey, grade, bridge and lay track to found a new town
- M5 The network: Four towns, meets on single track, a full year without breaking
- M6 Hub growth and late game: Interlocking, yards, double track; live out on the line
- M7 Content, audio and polish: Full region, sound, onboarding, accessibility, balance
- M8 Early access: Packaged desktop and web builds

Roadmap · 9 milestones, 2 playtest gates

The highlighted milestones carry the core risk; nothing after M2 starts until both gates pass.

### M0. Foundations and art kit

Goal: an isometric world in final art style where you lay track, throw switches and watch a train follow the route through a day-night cycle.

Work packages:

1. **Repo and tooling**: Vite, TypeScript strict, ESLint rules (including the sim randomness ban), Prettier, Vitest, Playwright smoke test, CI script. *(Changed 2026-11-01: no build tools; one HTML file and Playwright checks. See section 0, decision D2.)*
2. **Sim core** (after 1): `GameState`, time, sfc32 RNG, id allocation, commands, events, tick loop with system order stubs, save and load (JSON, gzip, IndexedDB), state hash.
3. **Track graph** (after 2): nodes, straight and arc edges, switches, blocks, validation, build tool geometry (section 6), with unit tests for arc length, tangent continuity and validation limits.
4. **Train movement** (after 3): consist, path history, acceleration and braking, speed limits, yard moves with route finding and switch locking (switches thrown instantly in M0).
5. **Renderer** (after 2): camera (isometric, 90-degree yaw steps, zoom, pan), lights, day-night keyframes (section 17), terrain chunks from a 64 x 64 test heightmap, track rendering (instanced ties, rail strips), interpolation.
6. **Art kits** (after 5): character kits (chunky, lanky, stocky) with procedural walk, idle and carry animations through instanced body parts; building kit (depot, freight shed, water tower, platform, shanty); train kit (4-4-0, boxcar, flatcar, combine) with smoke; item props per item type. Match the reference page.
7. **Debug tools** (after 4 and 5): `?debug=1` overlays for blocks, reservations and routes; `window.rh` console; time warp.

Acceptance criteria:

- [ ] A test scene: lay a loop with a passing siding and two switches using the build tool (debug instant build).
- [ ] A train given a yard move takes the correct route; changing a switch changes the path; a switch under a train cannot be thrown.
- [ ] Save, reload, and the state hash matches. Two runs of the same seed and command log match after 3 game days.
- [ ] 200 dummy characters of all three kits walk random paths on the test map at 60 fps on an integrated GPU.
- [ ] Day-night cycle matches the keyframes; windows and lamps glow at night.
- [ ] The scene is recognizably the reference page's art style (designer sign-off).

### M1. The whistle-stop

Goal: a 20-minute session working the hub and Willow Ford alone is fun.

> **Changed 2026-11-01:** M1 also includes hand-building hub track spike by spike from planned jobs, with materials from the interchange. See section 0, decision D10.

Work packages:

1. **Player** (after M0): character creation (minimal), movement, click-to-move pathing on a walk grid, interaction system, carrying, hand truck and handcart.
2. **Cargo** (after M0): items, waybills, item store, freight shed bays and tags, car loading and unloading, interchange set-out and pick-up, item conservation invariant.
3. **Economy core** (after 2): market prices, import orders by telegraph, delivery and standing contracts, ledger, cash, lot fees stub, credit line.
4. **Placeholder towns** (after 3): businesses as stock holders that consume at fixed weekly rates (to be replaced by M2's agents) and offer contracts; local delivery to business doors.
5. **Passengers, simple** (after 2): travelers spawned by fixed rates who queue, buy tickets, board and alight. Ticket window. Departure board.
6. **Timetable and dispatch, two stations** (after M0 pkg 4): train services, stops, stop actions, the single-track reservation rule, train order boards, refuel and water with physical cordwood, run-around at Willow Ford, tender-first running.
7. **HUD and panels** (after 3): clock, cash, telegraph tape, alerts, interaction prompts; Contracts, Market, Ledger, Trains and a stop-table Timetable panel.
8. **Tutorial** (after all): the investor telegrams for days 1 and 2 (section 16).
9. **Content**: the real starting hub and Willow Ford layout on the region map's first corner.

Acceptance criteria:

- [ ] From a new game, the player can complete the tutorial with no debug tools.
- [ ] A full game week can be played by the player alone: imports arrive, are sorted and delivered, the Willow Ford train runs on schedule when the player does the station work, and the ledger balances (money invariant passes).
- [ ] Two trains (Overland and the Willow Ford train) arriving within 10 game minutes create visible pressure: a queue, an unsorted pile, a waiting train.
- [ ] Five outside playtesters play 20 minutes; at least three say they would keep playing (designer gate).

### M2. The living town

Goal: towns grow or stall visibly because of what you deliver.

Work packages:

1. **Citizens and households** (after M1): stores, name generator, origins, households, homes, children.
2. **Schedules and pathfinding** (after 1): daily schedule, walk grid, A\*, path cache, flow fields, separation steering, Full and Schedule detail levels.
3. **Consumption and satisfaction** (after 1): pantries, shopping, weekly consumption (section 11), satisfaction, leaving.
4. **Migration** (after 3): pull, Overland immigrant arrivals, ticketed rides to destination towns, professions.
5. **Jobs** (after 1): openings, wage matching, business workers.
6. **Developer and housing** (after 3): build queue, material requests as contracts, visible builders carrying materials, construction stages, plat and lot choice.
7. **Businesses** (after 5 and 6): the full table in section 12 for Settlement and Village stages; prospects; closing rules.
8. **Readability** (after all): inspect cards, per-town ledger, newspaper generator, in-world problem cues (empty windows, tents, queues).
9. **Replace placeholders** from M1 package 4.

Acceptance criteria:

- [ ] Every citizen can be inspected and shows home, job, arrival date and train.
- [ ] Stopping all flour deliveries to Willow Ford causes, within 10 game days, lower satisfaction, a visible departure on a train, and a newspaper line about it.
- [ ] Delivering lumber and nails lets the developer build a house that a newly arrived household moves into, visible start to finish.
- [ ] Agent conservation invariant passes over a 30-day scenario.
- [ ] 400 agents in the hub at 60 fps; Schedule-detail towns cost under 0.5 ms per tick.

### M3. Staff and delegation

Goal: you can hand off a job and see it done well or badly depending on who you hired.

Work packages: roles and staff records; the task queue with every M1 and M2 task type; assignment with zones and priorities; skills, XP and errors; shifts; section house; payroll and missed-payroll rules; the Staff panel; the stationmaster.

Acceptance criteria:

- [ ] Every action the player can do at a station is also done by staff when the player walks away.
- [ ] A skill 1 handler visibly missorts sometimes; a skill 5 handler never does; both create correct fix tasks.
- [ ] With a skill 3 stationmaster at the hub, the player can spend 3 game days at Willow Ford while the hub keeps trains on time (within 15 minutes on 90% of departures).

### M4. Building the line

Goal: you can build a line to a new town from survey to first train.

Work packages: terrain types and clearing; survey mode with profile graph and totals; staking and deposit reveal; segments and the five construction stages; railhead stockpile and push cars; camps with rations, cook, water and work rate; work train service type; moving day; camp followers; founding a town with the satellite kit; telegraph wire and one-engine-in-steam; sawmill and coal mine industries.

Acceptance criteria:

- [ ] A 400u line with one trestle can be built from Willow Ford to a new town site using only delivered materials, with the item invariant passing.
- [ ] Cutting off coffee lowers crew work rate by 10%, visible in the camp panel and in slower progress.
- [ ] Moving day packs, hauls and re-pitches the camp; followers move with it; founding a town keeps followers with the stated chance.
- [ ] A coal mine town ships coal that fuels engines at a coal stage, doubling their range.

### M5. The network

Goal: a 4-town network runs a full game year without falling apart.

Work packages: multi-station dispatch with meets and class superiority; the stringline planner with conflict warnings; deadlock detection and alert; hub routing, home signals and platform assignment; wye, turntable and balloon-loop move sequences; all resource industries and production chains; haulage and mail contracts; seasons and weather effects (section 4); Web Worker move if the M5 profile requires it; performance pass to section 19 budgets.

Acceptance criteria:

- [ ] A scripted 4-town, 6-service scenario runs 56 game days headless with zero safety violations and all invariants passing.
- [ ] The planner flags every meet conflict that the dispatcher then turns into a wait (checked by comparing predicted vs actual waits in the scenario).
- [ ] A blizzard closes a line and a crew task reopens it.

### M6. Hub growth and late game

Goal: the hub can grow into a big, satisfying station, and the player can live on the line.

Work packages: interlocking tower and route setting; yards and the yardmaster; grand depot, roundhouse, telegraph office; double track upgrade; Janney couplers and air brakes; bank, loans and receivership; brickworks and flour mill; hub land expansion; moving residence; the Silver City terminus and its ending sequence.

Acceptance criteria:

- [ ] A hub with 10 platforms and a 6-track yard runs 30 trains a day with a tower operator and yardmaster, no player input, for 7 game days.
- [ ] Reaching Silver City triggers the ending and play continues afterward.

### M7. Content, audio and polish

Goal: the full region, sound, onboarding and accessibility at release quality.

Work packages: the full 512 x 512 region map with all deposits and town sites; audio (section 18); music; onboarding polish; accessibility (section 16); UI art pass; balancing through headless scenario sweeps (for example, 50 seeds x 2 game years, tracking cash, population and bankruptcy rate); save migration fixtures.

Acceptance criteria:

- [ ] Median headless "reasonable player" bot reaches phase 3 by game year 2 without bankruptcy on 45 of 50 seeds.
- [ ] All audio cues have subtitles; all keys rebindable; colorblind tags verified with a simulator.

### M8. Early access release

Goal: a packaged desktop build (Tauri or Electron) and a web build, with a bug-report button that attaches the save and the last 2,000 events.

## 23. Open questions

Decisions still needed from the designer. Defaults in this document hold until each is answered.

- [ ] **Indigenous presence**: how does the game acknowledge the nations whose land the line crosses? Options: treaty land the survey must route around, named neighboring communities as trading partners, or a respectful note in the setting only. Default: route-around treaty land shown on the map, no conflict.
- [ ] **Satellite industry spur**: is one industry spur per satellite town an acceptable exception to the two-track rule?
- [ ] **Remote management**: should the office panels be usable away from a desk before a stationmaster exists? Default: no.
- [ ] **Women in railroad roles**: telegraphers and station agents were sometimes women in this era. Default: yes, any role can be filled by anyone; laborer roles stay mostly male by the immigrant mix.
- [ ] **Fail state**: is receivership a satisfying alternative to game over, or should bankruptcy simply reload?
- [ ] **Ending**: is reaching Silver City the right soft ending, and should there be a second region after 1.0?
- [ ] **Hand-placed vs generated map**: one handmade region for 1.0 (default), or a seeded generator for replay?
- [ ] **Train crews as visible people**: should engineers and firemen be visible in the cab (yes by default) and walk to and from the roundhouse at shift change (costly; default no)?
- [ ] **Controller support** (split from the touch question, 2026-11-01): still out of scope for 1.0; revisit after M7.
- [ ] **The starting world's layout** (added 2026-11-01, M1 package 9, built provisionally): a 336u x 128u map with the hub at the west end, the interchange running off the west edge beside the hub boundary, and the 160u spur bending north in a gentle S to Willow Ford; parallel tracks 3.41u apart (section 6's switch cannot join tracks 1.6u apart); the hub has two switches (interchange and platform track) rather than the one switch stand listed in section 15; Willow Ford has one 16u platform (the kit lists two of 24u) and no freight room bays yet. Details in DEV_NOTES.md, "The real start". Keep, or change? **(2026-11-02, D14: everything kept except the size: the whole game and the map are to be scaled up; the new size is to be proposed in the fix-round plan.)**


### Answered

- **Touch controls for panels and the context menu** (answered 2026-11-02): panels at the depot desk with an Office button; a Look button for inspecting. See section 0, D13.
- **Pause in panels** (answered 2026-11-02): no, the game keeps running. See section 0, D13.
- **How hand-building feels** (answered 2026-11-01): about 5 real minutes for a 20u siding at 1x, one tap keeps working, 4 spikes per tie, no helpers before M3. See section 0, decision D12.
- **Press-and-hold steering and the M0 touch controls** (answered 2026-11-01): steer towards the finger; the rest as listed in section 0, D7.
- **Touch walking** (answered 2026-11-01): tap to walk there, press and hold to walk in the direction of your finger. See section 0, decision D6.
- **Game name** (answered 2026-11-01): keep "Railhead" as the working title. See section 0, decision D4.
- **Touch support** (answered 2026-11-01): phones and touch come first, not after M7. See section 0, decision D1.
