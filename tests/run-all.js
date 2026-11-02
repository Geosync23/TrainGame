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
  'station buildings': require('./check-buildings'),
  'debug tools (?debug=1)': require('./check-debug'),
  'ground and light (terrain, day and night)': require('./check-world'),
  'people (crowd of 200 walkers)': require('./check-people'),
  'build tool (laying track and switches)': require('./check-build'),
  'M0 acceptance criteria': require('./check-m0'),
  'carrying (by hand, hand truck, handcart)': require('./check-carry'),
  'cargo (items, waybills, bays)': require('./check-cargo'),
  'interchange (the Overland, loading cars by hand)': require('./check-interchange'),
  'hand-building track (construction jobs)': require('./check-handbuild'),
  'hand-building drawn (stakes, sign, pieces, work poses)': require('./check-handbuild-look'),
  'economy (cash, orders by telegraph, contracts, ledger)': require('./check-economy'),
  'towns (businesses, contracts offered, delivery at the door)': require('./check-town'),
  'the real start (hub, spur and Willow Ford)': require('./check-world-start'),
  'timetable (coupling, services, dispatch, wood and water)': require('./check-timetable'),
  'passengers (tickets, boarding, departure board)': require('./check-passengers'),
  'riding our own train (board, ride, step off, save)': require('./check-ride'),
  'tutorial (the investor\'s telegrams, days 1 and 2)': require('./check-tutorial'),
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
