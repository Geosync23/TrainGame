# D27: the provisional choices, for the designer's morning review

Every choice the D27 builders and the integrator made on their own while the designer was away ("overnight mode"),
gathered in one list for the review page. Each has the suggested choice (what the game does now) and the
alternatives, in plain words. The number in brackets is where it comes from: the plan (`plans/d27-tech.md` section 9),
the foundation, the builders T (trains and levers), P (tickets on board), F (freight), W (townsfolk), U (lessons and
screens), R (drawing), the artists, and the integrator (I).

## The big one first: the working day is too full for one player

Measured with the integrator's bot (a careful player that follows the game's own hints) over two days, with every
D27 part on:

- The trains run and every ticket is punched: day 2 runs almost on time (worst 26 minutes late), day 1 (a Monday:
  seven goods on f1, among them the plough) runs up to 2.5 hours late from the afternoon on, because unloading,
  stacking and loading by hand take most of each freight train's standing time and more.
- **The evening does not fit.** Taking one day's goods to town and the shops' goods back takes about **4 to 5 game
  hours** for a careful player even after the integrator's provisional fixes below (F measured about 10.5 hours before
  them). The evening starts when the last freight train leaves (20:15 on time) and the day ends by itself at 23:00, so
  the goods pile up: in the two days played, only one good reached the town.
- Where the time goes (measured): pushing the cart from the storage to the street about 35 minutes each way; at the
  shops about 3 minutes a good (lift it off the cart, walk to the door, hand it in) plus about 5 minutes to move the
  cart from shop to shop; loading the cart and stacking about 2.5 minutes a good.

Suggested: decide what to cut or speed up. Alternatives (any mix):
1. **The keeper fetches from the cart** (the player stays at the cart and hands each good over): saves about half of
   the time at the shops.
2. **Fewer goods a day** (for example 8 instead of 14, the weekly specials kept): the evening about halves.
3. **Faster handling** (the lifting and setting down times halved; now 16 to 64 seconds each way): saves about an hour
   a day.
4. **A later end of the day** (midnight, or the evening carrying on past midnight with the next morning later).
5. **A helper** (a porter who stacks the storage while the player punches tickets).
6. **The shops collect their own goods** from the cargo platform on some days (the player only unloads and stacks).

## Integrator (I)

1. **The camera stays with the player, centred** (the designer asked): R's dead zone, look-ahead and framing of the car
   he is in are switched off (`PIX.CAM`: DEAD 0, AHEAD 0, CAR false); his feet are on the middle pixel of the view at
   every frame, inside a coach too. Alternative: R's version (he moves inside the middle third, the view looks 6u ahead,
   a car he is in is framed).
2. **The storage moved next to the way to town:** the rows of the nine shops that get goods by rail are now in the east
   block of the cargo platform (nearest the east ramp, the busiest shops nearest the ramp); the goods for the railroad
   (OUT) in the east block's row by the cart lane, then the west block's; the barber, the sheriff and the assay office
   (nothing comes for them) in the west block. Alternative: the foundation's (eight shops in the west block).
3. **A bigger platform cart:** 4 x 3 cells (was 4 x 2; A2's art widened from 1.6u to 2.4u, which still fits the loading
   edge and the cart lane) and the small goods (crates, sacks, kegs, newspapers, the express box) up to 3 high on it
   (was 2): about twice the load. Alternatives: 4 x 4 cells (3.2u wide: too wide for the loading edge); 3 high only.
4. **Trips to town between trains:** the Next job line (F's hint) offers a delivery trip in the day when nothing is
   standing or coming and the next train is further off than the trip (about 100 minutes plus 2.5 a good), and a trip
   under way carries on; the cart is brought back to the cargo platform after a day trip. With the schedule as it is,
   such a gap seldom comes in a full day. Alternative: deliveries in the evening only.
5. **Goods packed into as few boxcars as hold them,** the boxcar nearest the storage first (was: spread over the
   boxcars in turn): fewer doors to open and fewer cart moves.
6. **Night windows in the town:** at night every shop, house, the church, the school and the freight house is drawn
   with its lit version (the follow-up art), and the point rodding turns at the points' end and runs across to them.
7. Older checks that test the D25 flows (check-protogoods, check-protoui, check-prototrains, check-protoworld,
   check-proto-day, check-proto-stall, check-pixrender, check-levers' D25 day) open the page with the D27 parts off
   (`?d27=0`); check-punch with the D25 line kept (`?doorline=1`). On the D27 layout the D25 handcart's two evening
   trips can run past 23:00 (check-protogoods now checks the summary against what was handed in by then).

## Foundation (plan section 9; built 2026-11-11)

1. **Scale:** a person 1.75 m = 2.5u; heights, widths, doors, seats and goods true; train lengths about three quarters
   (coach 13u, engine and tender 18u, boxcar 10u). Alternatives: true lengths (trains 80u long); two thirds.
2. **Default zoom** scale 3 (people 33 CSS px). Alternative: scale 2 (the whole platform in view).
3. **Coaches board at their ends** (open end platforms with steps). Alternative: side doors as in D25.
4. **Departure** waits until everyone is seated, every ticket punched and the player is off. Alternative: unpunched
   travellers ride free, counted as missed (built: `PB.RIDE_FREE`).
5. **The cargo platform** an island between tracks 2 and 3, 14u wide, raised to car-floor height with a ramp at each
   end. Alternatives: a low deck with gangplanks; a separate freight dock south of track 3.
6. **Levers** in two lever frames at platform 1's ends (W1 and W3 west, E1 and E3 east). Alternatives: all four at the
   station; one lever at each switch.
7. **The cart's way to town:** down the east ramp, over a plank crossing at x 37, up a dirt path to the depot square.
8. **Numbers:** track spacing 6u, platform 1 60 x 9u, cargo platform 52 x 14u, footbridges at x -14 and 14.
9. **The town:** six buildings a side, the church and the school closing the street; the east row seen from behind.
10. **Goods:** 16 kinds, the week's table (the piano on Wednesdays, the plough on Mondays), 6 goods out a day.
11. **Handling times** slow enough to see each step; freight trains stand longer to match.
12. **Pickups** appear at 17:00 at the shops that send goods; uncollected ones wait.
13. **Townsfolk** with routines; they never block the player.
14. **Lessons:** six, each the first time its moment comes; the first card holds the clock; replay from Settings.
15. **Through riders** already aboard, tickets punched elsewhere.
16. **The day:** nine runs, the evening to 23:00.
17. **The atlas budget** raised to 700 KB (now 608 KB); the ground composed in the browser from tiles.
18. **Speeds:** walking 3.0u a game minute, pushing 2.7; one game minute a real second; line speeds doubled.
    Alternative: a slower clock.
19. **The D25 layout replaced** (old saves move to the next morning on the new layout). Alternative: keep it as a
    second world.
20. The walk grid's cargo platform: its faces are walls; a walker goes up and down only by the ramps or the footbridges.

## T: trains, levers and the day

1. **The day re-timed:** p1 06:55-07:50, f1 08:40-10:20, p2 10:50-11:35, x1 12:20, p3 13:05-13:50, f2 14:10-16:50,
   p4 15:20-16:10, p5 17:20-18:00, f3 18:45-20:15; passenger trains stand 40 to 55 minutes. Alternatives: longer
   freight standing times; fewer runs; 2-coach trains.
2. **A switch is thrown only at its lever** in a lever frame (no spot by the points). Alternative: also at the points.
3. **One end of a 3-coach train stands under a footbridge** (the coaches are too long for both bridges to clear every
   end): that coach boards at its other end. Alternative: footbridges moved further apart (a layout change).
4. **W1 and E1 lie reverse all day** but for the through train x1; W3 and E3 are thrown for each freight train.

## P: tickets on board

1. **4 to 10 travellers** a train; 2 to 6 through riders and 1 to 3 for the Hub in each coach.
2. **Half wait on the benches**, the rest standing under the canopy.
3. **Travellers take the coach end nearest where they waited** (so most fill the nearest coach). Alternative: spread
   them over the coaches.
4. **30 game seconds a punch.**
5. **The strict departure rule** (above, foundation 4).
6. **Nobody bumps into anyone in the aisle** (people pass through each other).

## F: freight handling, delivery and pickup

1. **Handling times:** the door 40 s; lifting and setting down each: carry 32, shoulder 40, roll 24, drag 16, hand
   truck 24, heave 64; the third layer or higher 8 more; the cart's handle 16; handing in at a shop 24.
2. **The hand truck** is used for the heavy goods (bale, stove, furniture) when it is within 40u; else they are
   heaved. Alternative: always fetch the hand truck.
3. **Where the cart stands:** east of a boxcar's doorway on the loading edge; in the street's carriageway at a shop.
4. **The express box does not go back yet** (the tables have no pickup for it). Alternative: the bank sends it every
   evening.
5. **Deliveries in the evening only** (F) - changed by the integrator to also between trains (I 4).
6. The cart stays overnight where it was left; the next morning asks for it only when a freight train needs it.

## W: the townsfolk

1. **19 people** (the twelve keepers, the preacher, the teacher, a laundress, two pupils, two cowhands); some names
   are the builder's own (marked "(p)" in the code), for example Walt Hensley, the feed keeper.
2. **Shops open 07:30 to 18:00** Monday to Saturday; school 08:00 to 15:00 weekdays; church Sunday 10:00 to about 11:45.
3. **Who meets trains:** the hotelkeeper meets p1 and p3, the sheriff p2, the newspaper man f3 (weekdays).
4. **Chats** in pairs at four times a day; two people standing near each other talk.
5. **A delivery brings the keeper out** to his door for 4 minutes.
6. Townsfolk wait up to 6 game seconds for the player, then walk on through.

## U: lessons and screens

1. The switches lesson comes before the switch rows on the Next job line; the other lessons come after them (a
   train's way out is still asked for while its lesson runs). Alternative: every lesson first.
2. A lesson still open the next morning closes (replay brings it back).
3. Replay starts every lesson again (no choice of one). Alternative: a list to pick from.
4. The slip of a later step can be folded with OK; the Next job line keeps saying it.
5. At most three buttons over the world everywhere, the D25 flows too.
6. The summary's new lines: tickets seated and punched; goods unloaded, stored, loaded; town delivered, picked up.

## R: drawing

1. **Night** from 19:00 to 21:00 the scene darkens to a deep blue, back from 05:00 to 06:30; lit windows and lamps
   glow. Alternative: darker or shorter nights.
2. **The cut-away:** only the player's coach (or a boxcar he is in or at the door of, or one with its door open) is
   drawn without its roof and near wall.
3. **The ground** composed in chunks from the tiles (plain grass for a frame where a chunk is not ready).
4. **The camera's dead zone and look-ahead** (turned off by the integrator: I 1).
5. Tags on goods are left out at scale 1 (too small to read).

## The artists (A1, A2, A3 and the follow-up)

1. People 20 px tall (2.5u); the new townsfolk drawn from the travellers' types where the plan said.
2. The cart and the hand truck as A2 drew them (the cart widened by the integrator, I 3).
3. Small lanterns by the doors (dark glass by day, lit at night); lit night versions of every town building.
4. The east row's fronts face away from the view: hanging signs and painted side walls carry the names.
