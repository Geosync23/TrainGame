// Runs one check by file name, for working on it:  node tests/run-one.js check-carry
const { stopServer } = require('./browser');
(async () => {
  let problems;
  try { problems = await require('./' + process.argv[2])(); } catch (e) { problems = [String(e && e.stack || e)]; }
  stopServer();
  console.log(problems.length ? 'FAIL\n - ' + problems.join('\n - ') : 'PASS');
  process.exit(problems.length ? 1 : 0);
})();
