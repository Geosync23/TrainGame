// Makes tests/fixtures/save-v<N>.json for the current schema version N: a save after a short scripted
// session, with its state hash. Kept in git so every later build is checked against this old save.
// It also loads every OLDER sample save through migrate() and records the hash it loads with under
// "loads": { "v<N>": hash }, so check-save.js can tell that each old save still migrates to the same state.
// Run once per new schema version:  node tests/make-fixture.js
const fs = require('fs');
const path = require('path');
const { openGame, stopServer } = require('./browser');
(async () => {
  const { browser, page } = await openGame('portrait', { query: '?paused' });
  const out = await page.evaluate(() => {
    const R = window.__railhead;
    // From schema 3: two freight items, and the player takes the hand truck and loads one.
    const S0 = R.newState(1866), carry = S0.schemaVersion >= 3, jobs = S0.schemaVersion >= 4;
    if (carry) {
      const wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null });
      R.cargo.itemCreate(S0, wb('flour'), { kind: 'GROUND', x: -1050, z: 1000 }, null);
      R.cargo.itemCreate(S0, wb('salt'), { kind: 'BAY', buildingId: 'freightshed', bay: 0 }, null);
    }
    // From schema 4: a job staked 6u on from the spur's dead end, with a tie bundle lying beside it (on site).
    let stake = [];
    if (jobs) {
      const T = S0.track, N = T.nodes.filter(N => T.edges.filter(E => E.a === N.id || E.b === N.id).length === 1).sort((a, b) => a.x - b.x)[0];
      R.cargo.itemCreate(S0, { commodity: 'ties', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'CONSTRUCTION', id: 0 }, contractId: null, due: null },
        { kind: 'GROUND', x: Math.round((N.x - 2) * 100), z: Math.round((N.z - 1.5) * 100) }, null);
      stake = [{ tick: 50, cmd: { t: 'stakeJob', from: 'node', n: N.id, tx: Math.round((N.x - 6) * 100), tz: Math.round(N.z * 100) } }];
    }
    const S = R.simRun(S0, [
      { tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } },
      { tick: 2, cmd: { t: 'useSwitch', sw: 0 } },
    ].concat(stake).concat(carry ? [
      { tick: 100, cmd: { t: 'carryTool', tool: 0 } },
      { tick: 160, cmd: { t: 'carryPick', id: 0 } },
    ] : []).concat([
      { tick: 300, cmd: { t: 'walkTo', x: -500, z: 800 } },
    ]), 400);
    return { save: JSON.stringify({ state: S, ui: { yawIdx: 1, zoom: 1.5, speed: 1 } }), hash: R.stateHash(S), schemaVersion: S.schemaVersion };
  });
  const dir = path.join(__dirname, 'fixtures');
  for (const f of fs.readdirSync(dir).filter(f => /^save-v\d+\.json$/.test(f)).sort()) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (fx.schemaVersion >= out.schemaVersion) continue;
    const h = await page.evaluate((json) => window.__railhead.importSave(json), fx.save);
    fx.loads = Object.assign(fx.loads || {}, { ['v' + out.schemaVersion]: h });
    fs.writeFileSync(path.join(dir, f), JSON.stringify(fx, null, 1) + '\n');
    console.log('recorded', f, 'loads as v' + out.schemaVersion, 'with hash', h);
  }
  await browser.close(); stopServer();
  const file = path.join(dir, `save-v${out.schemaVersion}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', file, 'hash', out.hash);
})();
