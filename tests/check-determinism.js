// Check: same start and same commands give the same game, every time (3 game days).

const { openGame } = require('./browser');

module.exports = async function checkDeterminism() {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead;
      const ticks = 3 * 86400 / 8;
      // Since D21 No. 1 starts on both timetabled runs (and then drives herself): the script takes her off first, so
      // its own driving commands count.
      const script = [
        { tick: 0, cmd: { t: 'ttAssign', tr: 0, on: false } },
        { tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } },
        { tick: 5, cmd: { t: 'useSwitch', sw: 0 } },
        { tick: 900, cmd: { t: 'trainStop', tr: 0 } },
        { tick: 1000, cmd: { t: 'walkTo', x: 300, z: 900 } },
        { tick: 1200, cmd: { t: 'trainRun', tr: 0, dir: -1 } },
        { tick: 2000, cmd: { t: 'walkDir', a: 64, run: true } },
        { tick: 2100, cmd: { t: 'walkDir', a: null } },
        { tick: 3000, cmd: { t: 'useSwitch', sw: 2 } },
        { tick: 5000, cmd: { t: 'trainRun', tr: 0, dir: 1 } },
      ];
      const t0 = performance.now();
      const h1 = R.stateHash(R.simRun(R.newState(42), script, ticks));
      const h2 = R.stateHash(R.simRun(R.newState(42), script, ticks));
      const h3 = R.stateHash(R.simRun(R.newState(42), script.slice(0, -1), ticks));
      return { h1, h2, h3, ms: performance.now() - t0 };
    });
    const problems = [];
    if (r.h1 !== r.h2) problems.push(`two identical runs ended differently (${r.h1} vs ${r.h2})`);
    if (r.h1 === r.h3) problems.push('a different command list gave the same result, so the hash is not sensitive');
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    console.log(`  3 game days x 3 runs in ${(r.ms / 1000).toFixed(1)} s; hash ${r.h1}`);
    return problems;
  } finally { await browser.close(); }
};
