// A developer's tool (not a check): opens the game with a query and runs a script file in the page, printing what it
// returns.  node tests/dev-eval.js '?paused&world=proto' path/to/script.js
// The script is the body of an async function with R = window.__railhead in scope; it returns any JSON value.
const fs = require('fs');
const { openGame, stopServer } = require('./browser');
(async () => {
  const [query, file] = process.argv.slice(2);
  const { browser, page, errors } = await openGame('portrait', { query });
  try {
    const src = fs.readFileSync(file, 'utf8');
    const out = await page.evaluate(`(async () => { const R = window.__railhead; ${src} })()`);
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
    if (errors.length) console.log('console errors: ' + errors.slice(0, 5).join(' | '));
  } finally { await browser.close(); stopServer(); }
})();
