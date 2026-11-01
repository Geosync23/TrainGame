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
