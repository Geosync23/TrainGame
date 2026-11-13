// Runs every check. Use before every push:  npm test
// Exits with code 1 if any check fails.

const { stopServer } = require('./browser');

const checks = {
  'rules (no Math.random)': require('./check-rules'),
  'boot (page loads at phone size)': require('./check-boot'),
  'track (graph and validation)': require('./check-track'),
  'trains and switches': require('./check-trains'),
  'manual switches (trains wait at a switch set against them; the timetable\'s switch list)': require('./check-switches'),
  'same start, same result': require('./check-determinism'),
  'saving and loading': require('./check-save'),
  'touch controls': require('./check-touch'),
  'paths (walking round buildings and trains)': require('./check-paths'),
  'plank crossings (track walked across only at crossings)': require('./check-crossings'),
  'station buildings': require('./check-buildings'),
  'platform canopy turns see-through near the player': require('./check-roof'),
  'debug tools (?debug=1)': require('./check-debug'),
  'ground and light (terrain, day and night)': require('./check-world'),
  'people (crowd of 200 walkers)': require('./check-people'),
  'the walk (feet do not slide, speeds)': require('./check-walk'),
  'build tool (laying track and switches)': require('./check-build'),
  'M0 acceptance criteria': require('./check-m0'),
  'carrying (by hand, hand truck, handcart)': require('./check-carry'),
  'feet on the platforms and the freight dock (drawn)': require('./check-feet'),
  'cargo (items, waybills, bays)': require('./check-cargo'),
  'interchange (the Overland, loading cars by hand)': require('./check-interchange'),
  'hand-building track (construction jobs)': require('./check-handbuild'),
  'hand-building drawn (stakes, sign, pieces, work poses)': require('./check-handbuild-look'),
  'fix round gaps (stockpile pick-up, switch in a station, wrong bay mark)': require('./check-fixround'),
  'economy (cash, orders by telegraph, contracts, ledger)': require('./check-economy'),
  'towns (businesses, contracts offered, delivery at the door)': require('./check-town'),
  'the real start (hub, spur and Willow Ford)': require('./check-world-start'),
  'the hub world (D24: the through line, switches close together, all reachable, clear of the track, parked systems off)': require('./check-hubworld'),
  'the prototype (D25: the station layout, switches close to the platforms, the walkway the only crossing, the day, parked systems off, the pixel renderer, old worlds in 3D)': require('./check-protoworld'),
  'prototype passengers (D25 P: lines at the coach doors before a train, riders step off first, one punch boards one traveller, ready, counts)': require('./check-punch'),
  'the prototype\'s goods (D25 F: freight unloaded into the storage shed and loaded from it, the handcart over the walkway to the three shops, items conserved)': require('./check-protogoods'),
  'the pixel renderer (D25, R: sprites from the atlas, painter\'s order, see-through, footbridges, whole zoom steps, picking what is drawn, the board text, frame time)': require('./check-pixrender'),
  'the prototype\'s screens (D25, U: the morning board, the Next job line through a day, the buttons over the world, the summary, nothing overlapping)': require('./check-protoui'),
  'the railroad\'s trains (D24: a day of 9 runs in and out, stopping short of a wrong switch, wave-off, lateness)': require('./check-rrtrains'),
  'the prototype\'s trains (D25: a day of 10 runs with a scripted player, through trains, wrong switches, wave-off refusals, the footbridges)': require('./check-prototrains'),
  'tickets on board (D24: travellers off and on the railroad\'s trains, checking a car, fares missed)': require('./check-tickets'),
  'freight trains\' goods (D24: orders ride freight trains, unloading at the cargo dock, cgReady, leaving)': require('./check-freight'),
  'timetable (coupling, services, dispatch, wood and water)': require('./check-timetable'),
  'passengers (tickets, boarding, departure board)': require('./check-passengers'),
  'departure boards on the depots and the ticket booth': require('./check-board'),
  'work board behind the counter, public schedule board, patient ticket line (D20)': require('./check-workboard'),
  'station look (plank platforms, end steps, props, depot detail)': require('./check-station'),
  'office, telegrams, alerts and Look (HUD and panels)': require('./check-office'),
  'riding our own train (board, ride, step off, save)': require('./check-ride'),
  'cutaway view into the combine while riding (D15)': require('./check-cutaway'),
  'tutorial (the investor\'s telegrams, days 1 and 2)': require('./check-tutorial'),
  'helper arrows (where to go next, D20 (6))': require('./check-arrows'),
  'clarity (No. 1 on both runs, contracts at the work board, train plates, not running, Next job line; D21)': require('./check-clarity'),
  'station rework screen guidance (D24 UI: boards, Next job and arrows, Check tickets and Send off, cards, the hub tutorial)': require('./check-hubui'),
  'explaining as it happens (first-time cards, warnings ahead, schedule board on posts, Work board button, one top line, switch 1 straight; D22)': require('./check-explain'),
  'M1 acceptance criteria (a week played by the bot)': require('./check-m1'),
  'the station rework end to end (D24: three days in the hub played by the bot: every train in and out, tickets, goods, money, same result)': require('./check-hub-day'),
  'the prototype end to end (D25: two days played by the bot through touch-level commands: every train in and out, every switch, ticket and good, the summary, same result)': require('./check-proto-day'),
  'the prototype never stalls (D25 fix: the page keeps running with goods in hand, two trains never come in on top of each other, the Next job line names the train holding the next one up)': require('./check-proto-stall'),
  // D27 (plans/d27-tech.md 8.2 and 8.3): the foundation's world check, then one line per builder's check (each a
  // placeholder that passes until its owner writes it), so no builder edits this list.
  'the D27 world (the foundation: the layout at the D27 scale, clearances, walking distances, heights and walls, the v18 save to the next morning, the D27 switches)': require('./check-d27world'),
  'lever frames and the re-timed day (D27, T)': require('./check-levers'),
  'tickets punched on board (D27, P)': require('./check-onboard'),
  'freight handling step by step (D27, F)': require('./check-handling'),
  'the evening delivery and the pickups (D27, F)': require('./check-delivery'),
  'the townsfolk (D27, W)': require('./check-townsfolk'),
  'the lessons (D27, U)': require('./check-lessons'),
  'inside a coach and a boxcar, drawn (D27, R)': require('./check-interiors'),
  'the pixel frame-time budget (D27, R)': require('./check-pixperf'),
  'the atlas: every key the code asks for, the budget (D27, the integrator)': require('./check-atlas'),
  'the D27 day end to end (D27, the integrator)': require('./check-d27-day'),
  // D32 (plans/d32-tech.md 11.5): Foundation's three checks, then one line per other owner's check. A check whose file
  // has not landed yet is skipped with a note (d32Later), so each owner only adds its file.
  'the D32 world (Foundation: the line\'s tables and country, regions and borders, clearances, the line off, saving, the clock, dev mode, three days, the pace, away)': require('./check-d32world'),
  'the work train (D32, Foundation: out and back on time over three days, the station\'s trains untouched, a clear road, supplies, every day worked)': require('./check-worktrain'),
  'the line drawn (D32, Foundation: nine places, three zooms, both orientations, no boundary of the world in view, chunks redrawn as a front passes, frame time)': require('./check-linerender'),
  'the rail crew (D32, Crew: every man\'s day, no two on one spot, the stage\'s tool, the six gangs, the meal, the same twice and after a reload, the pace for 30 and 5 men, the tick\'s cost)': require('./check-crew'),
  'the camp and the head count (D32, Crew: tents by crew size, a cot each, the camp\'s day, lit at night, a man left on the line reported, the townsfolk counted)': require('./check-camp'),
  'riding out and walking the line (D32, Play: out and back with the work train and at once, saves mid-ride and on the line, walking by touch round the train and to the borders, the Look card, the bar)': require('./check-lineplay'),
  'the join-in games (D32, Play)': d32Later('./check-linegames'),
  'the line\'s lessons (D32, Play)': d32Later('./check-linelessons'),
  'the hired station workers (D32, Town)': d32Later('./check-hired'),
  'the bigger town (D32, Town)': d32Later('./check-bigtown'),
  'every building entered (D32, Town)': d32Later('./check-rooms'),
  'the town\'s economy (D32, Town)': d32Later('./check-towneconomy'),
  'three line days end to end (D32, the lead)': d32Later('./check-d32-day'),
  'play-test fixes by real taps: one tap per good, the small cart, the pace, the soft patch (D31)': require('./check-d31'),
};
function d32Later(file) {
  if (require('fs').existsSync(require('path').join(__dirname, file + '.js'))) return require(file);
  return async () => { console.log(`  (not landed yet: tests/${file.slice(2)}.js; skipped)`); return []; };
}

(async () => {
  let failed = 0;
  for (const [name, run] of Object.entries(checks)) {
    console.log(`Check: ${name}`);
    let problems;
    try { problems = await run(); } catch (e) { problems = [String(e && e.stack || e)]; }
    if (problems.length) {
      failed++;
      console.log('  FAIL');
      for (const p of problems) console.log('   - ' + p);
    } else {
      console.log('  PASS');
    }
  }
  stopServer();
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
})();
