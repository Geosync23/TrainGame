// Makes tests/fixtures/save-v1.json: a save from schema version 1 after a short scripted session,
// with its state hash. Kept in git so every later build is checked against this old save.
// Run once per new schema version:  node tests/make-fixture.js
const fs = require('fs');
const path = require('path');
const { openGame, stopServer } = require('./browser');
(async () => {
  const { browser, page } = await openGame('portrait', { query: '?paused' });
  const out = await page.evaluate(() => {
    const R = window.__railhead;
    const S = R.simRun(R.newState(1866), [
      { tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } },
      { tick: 2, cmd: { t: 'useSwitch', sw: 0 } },
      { tick: 300, cmd: { t: 'walkTo', x: -500, z: 800 } },
    ], 400);
    return { save: JSON.stringify({ state: S, ui: { yawIdx: 1, zoom: 1.5, speed: 1 } }), hash: R.stateHash(S), schemaVersion: S.schemaVersion };
  });
  await browser.close(); stopServer();
  const file = path.join(__dirname, 'fixtures', `save-v${out.schemaVersion}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', file, 'hash', out.hash);
})();
