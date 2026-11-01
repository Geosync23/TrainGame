// Runs every check. Use before every push:  npm test
// Exits with code 1 if any check fails.

const checks = {
  'rules (no Math.random)': require('./check-rules'),
  'boot (page loads at phone size)': require('./check-boot'),
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
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
})();
