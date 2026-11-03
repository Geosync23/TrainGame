// Runs every check. Use before every push:  npm test
// Exits with code 1 if any check fails.

const { stopServer } = require('./browser');

const checks = {
  'rules (no Math.random)': require('./check-rules'),
  'boot (page loads at phone size)': require('./check-boot'),
  'track (graph and validation)': require('./check-track'),
  'trains and switches': require('./check-trains'),
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
  'timetable (coupling, services, dispatch, wood and water)': require('./check-timetable'),
  'passengers (tickets, boarding, departure board)': require('./check-passengers'),
  'departure boards on the depots and the ticket booth': require('./check-board'),
  'station look (plank platforms, end steps, props, depot detail)': require('./check-station'),
  'office, telegrams, alerts and Look (HUD and panels)': require('./check-office'),
  'riding our own train (board, ride, step off, save)': require('./check-ride'),
  'cutaway view into the combine while riding (D15)': require('./check-cutaway'),
  'tutorial (the investor\'s telegrams, days 1 and 2)': require('./check-tutorial'),
  'helper arrows (where to go next, D20 (6))': require('./check-arrows'),
  'M1 acceptance criteria (a week played by the bot)': require('./check-m1'),
};

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
