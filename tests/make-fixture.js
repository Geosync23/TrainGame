// Makes tests/fixtures/save-v<N>.json for the current schema version N: a save after a short scripted
// session, with its state hash. Kept in git so every later build is checked against this old save.
// It also loads every OLDER sample save through migrate() and records the hash it loads with under
// "loads": { "v<N>": hash }, so check-save.js can tell that each old save still migrates to the same state.
// Run once per new schema version:  node tests/make-fixture.js
// From schema 17 (D24, the station rework) the new sample is a game in the hub world (a new game's world since then):
// the same kind of session, with places that exist there (no dead end inside the hub, no Willow Ford travellers).
// From schema 18 (D25, the prototype) the new sample is a game in the prototype world, the same session again: the flour
// on platform 1, the salt in the storage shed's first bay, switch W1 thrown, the player's walk along platform 1.
// From schema 19 (D27, the foundation) the same session on the D27 layout: the places are on platform 1 there too, the
// salt in the freight house's first bay (the storage shed's id), W1 thrown at the west lever frame.
const fs = require('fs');
const path = require('path');
const { openGame, stopServer } = require('./browser');
(async () => {
  const { browser, page } = await openGame('portrait', { query: '?paused&world=proto' });
  const out = await page.evaluate(() => {
    const R = window.__railhead;
    // From schema 3: two freight items, and the player takes the hand truck and loads one.
    const S0 = R.newState(1866), proto = S0.track.world === 'proto', hub = S0.track.world === 'hub' || proto, carry = S0.schemaVersion >= 3, jobs = S0.schemaVersion >= 4 && !hub;
    const k = R.CFG.SCALE || 1; // schema 14 (D15): the world is 1.6x, so the scripted places grow with it
    // D24: the hub world's places (hundredths): the flour on the cargo yard, the player's walk onto the platform.
    const flourAt = proto ? { x: 0, z: -1100 } : hub ? { x: -3600, z: -1000 } : { x: Math.round(-1050 * k), z: Math.round(1000 * k) };
    const walkAt = proto ? { x: -600, z: -900 } : hub ? { x: 600, z: -500 } : { x: Math.round(-500 * k), z: Math.round(800 * k) };
    if (carry) {
      const wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null });
      R.cargo.itemCreate(S0, wb('flour'), { kind: 'GROUND', ...flourAt }, null);
      R.cargo.itemCreate(S0, wb('salt'), { kind: 'BAY', buildingId: proto ? 'storage' : 'freightshed', bay: 0 }, null);
    }
    // From schema 4: a job staked 6u on from the spur's dead end, with a tie bundle lying beside it (on site).
    let stake = [];
    if (jobs) {
      const T = S0.track, N = T.nodes.filter(N => T.edges.filter(E => (E.a === N.id || E.b === N.id)).length === 1 && !T.edges.some(E => E.fixed && (E.a === N.id || E.b === N.id))).sort((a, b) => a.x - b.x)[0]; // not the interchange's far end
      R.cargo.itemCreate(S0, { commodity: 'ties', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'CONSTRUCTION', id: 0 }, contractId: null, due: null },
        { kind: 'GROUND', x: Math.round((N.x - 2 * k) * 100), z: Math.round((N.z - 1.5 * k) * 100) }, null);
      stake = [{ tick: 50, cmd: { t: 'stakeJob', from: 'node', n: N.id, tx: Math.round((N.x - 6 * k) * 100), tz: Math.round(N.z * 100) } }];
    }
    // From schema 7 (towns): a sack of flour already delivered to the hub's general store, and its shelf lower.
    if (S0.town) {
      R.cargo.itemCreate(S0, { commodity: 'flour', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null }, { kind: 'BUSINESS', businessId: 0 }, null);
      S0.town.biz[0].shelf.flour = 2;
    }
    const S = R.simRun(S0, (hub ? [] : [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }]).concat([   // D24: No. 1 is parked in the hub world
      { tick: 2, cmd: { t: 'useSwitch', sw: proto ? 1 : hub ? 2 : 0 } },   // D24: the platform's west switch, set against the first train (D25: W1, to track 1)
    ]).concat(stake).concat(carry ? [
      { tick: 100, cmd: { t: 'carryTool', tool: 0 } },
      { tick: 160, cmd: { t: 'carryPick', id: 0 } },
    ] : []).concat([
      { tick: 300, cmd: { t: 'walkTo', ...walkAt } },
    ]), 400);
    // With passengers (S.pax): one traveller in line at the hub's window and one with a ticket on the platform,
    // walking there, then 20 more ticks so their walks are saved part way.
    if (S.pax && R.pax && !hub) {
      const K = R.pax.paxStation('hub', S.track), slot = R.pax.paxQueueSlots(S, K)[0], mk = (s, x, z, tx, tz, fare) => ({ id: S.pax.next++, from: 'hub', st: 'hub', to: 'willow', s,
        x, z, tx: null, tz: null, path: [], t0: S.time, f: 0, wait: 0, fare, car: null, door: 0 });
      S.pax.list.push(mk('queue', slot[0] + 600, slot[1], 0, 0, 0), mk('wait', Math.round(K.exits[0][0] * 100), Math.round(K.exits[0][1] * 100), 0, 0, 40));
      R.simRun(S, [], 20);
    }
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
