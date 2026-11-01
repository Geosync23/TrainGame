// Check: cargo items and waybills (M1 package 2, section "cargo (items and waybills)").
// - Items are created and moved through every kind of place: ground, in hand, bay, car, hand truck,
//   handcart, stockpile, business. Each move adds an event.
// - Impossible moves are refused with a reason: a full bay (8), a long bundle on a hand truck, a taken
//   slot, the wrong car, bulk goods as items, two ways of carrying at once, a consumed item.
// - Consumption is logged with its reason; the conservation check finds deliberately broken stores.
// - Bay tags change by command; a non-matching bay is allowed but flagged.
// - Save and reload (export/import and a real browser save) keep every item and the state hash.
// - Same start, same result with items; a normal new game has no items and no debug console.
// - Screenshots of the item props at phone size (?debug=1, rh.scenario('cargo')), with draw calls.

const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkCargo() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  try {
    const out = await page.evaluate(() => {
      const R = window.__railhead, C = R.cargo, bad = [];
      const S = R.state;
      if (typeof window.rh !== 'undefined') bad.push('window.rh exists without ?debug=1');
      if (S.items.next !== 0) bad.push('a normal new game starts with items (' + S.items.next + ')');
      if (S.schemaVersion < 2) bad.push('schema version is ' + S.schemaVersion);
      // (D4) The second bay is for Hub goods by default (was the hub warehouse); a save from before cargo still gets the old tags.
      if (JSON.stringify(S.bayTags.freightshed) !== JSON.stringify(['WILLOW', 'HUB', 'OUTSIDE', 'ANY'])) bad.push('default bay tags are ' + JSON.stringify(S.bayTags));
      // (D4) The real start: the hub station's goods area (station work) takes in every bay of the freight shed.
      {
        const S5 = R.newState(1866, 'start'), hub = R.tt.ttStation(S5, 'hub'), [x0, x1, z0, z1] = hub.area;
        const bays = R.cargo.BLD_BAYS.freightshed.bays;
        if (!bays.length || bays.some(b => b.x < x0 || b.x > x1 || b.z < z0 || b.z > z1)) bad.push('the hub\'s goods area ' + JSON.stringify(hub.area) + ' misses freight shed bays ' + JSON.stringify(bays));
        if (JSON.stringify(S5.bayTags.freightshed) !== JSON.stringify(['WILLOW', 'HUB', 'OUTSIDE', 'ANY'])) bad.push('real start bay tags are ' + JSON.stringify(S5.bayTags));
        // Goods for Willow Ford sorted into their own bay hold the departing train (station work).
        const run = { svc: 0, i: 0 }, svc = S5.tt.services[0], tr = S5.trains[0];
        const before = R.tt.ttWorkDone(S5, tr, svc, 0, hub);
        const ev5 = []; const wbW = { commodity: 'flour', originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 1 }, contractId: null, due: null };
        C.itemCreate(S5, wbW, { kind: 'BAY', buildingId: 'freightshed', bay: 0 }, ev5);
        if (!before || R.tt.ttWorkDone(S5, tr, svc, 0, hub)) bad.push('goods for Willow Ford in their own bay should hold the departing train (station work): ' + JSON.stringify({ before, area: hub.area, bay: bays[0] }));
        void run;
        R.world.walkGrid(S.track);   // back to the test yard's layout tables (worldUse) for the rest of the check
      }
      if (Object.keys(C.COMMODITIES).length !== 37) bad.push('commodity table has ' + Object.keys(C.COMMODITIES).length + ' rows, not 37');
      if (C.COMMODITIES.rails.buy !== 4000 || C.COMMODITIES.rails.sell !== 2400 || C.COMMODITIES.rails.type !== 'longBundle') bad.push('rails row is wrong');
      for (const c of Object.values(C.COMMODITIES)) for (const k of ['buy', 'sell']) if (c[k] !== null && !Number.isInteger(c[k])) bad.push(c.id + ' ' + k + ' is not whole cents');
      const wb = (commodity, dest, kind) => ({ commodity, originTownId: 'OUTSIDE', destTownId: dest === undefined ? 1 : dest, consignee: { kind: kind || 'BUSINESS', id: 0 }, contractId: null, due: null });
      const ev = [];
      const expect = (r, what) => { if (!r.ok) bad.push(what + ' was refused: ' + r.why); return r; };
      const refuse = (r, what, pat) => { if (r.ok) bad.push(what + ' was allowed'); else if (pat && !pat.test(r.why)) bad.push(what + ' refused for the wrong reason: ' + r.why); return r; };
      const box = S.trains[0].consist.find(c => c.k === 'boxcar').id, combine = S.trains[0].consist.find(c => c.k === 'combine').id;
      // A sack through every kind of place.
      const a = expect(C.itemCreate(S, wb('flour'), { kind: 'GROUND', x: -1000, z: 1200 }, ev), 'create on the ground').id;
      const route = [
        { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 },
        { kind: 'BAY', buildingId: 'freightshed', bay: 0 },
        { kind: 'CAR', stockId: box },
        { kind: 'CARRIED', actorId: 'player', carrier: 'HANDTRUCK', slot: 2 },
        { kind: 'CARRIED', actorId: 'player', carrier: 'HANDCART', slot: 5 },
        { kind: 'STOCKPILE', jobId: 3 },
        { kind: 'BUSINESS', businessId: 7 },
        { kind: 'GROUND', x: -950, z: 1210 },
      ];
      for (const w of route) {
        const n = ev.length;
        expect(C.itemMove(S, a, w, ev), 'move to ' + w.kind + (w.carrier ? ' ' + w.carrier : ''));
        if (ev.length !== n + 1 || ev[n].t !== 'itemMoved') bad.push('no itemMoved event for the move to ' + w.kind);
        if (JSON.stringify(S.items.where[a]) !== JSON.stringify(w)) bad.push('item is not where it was put: ' + JSON.stringify(S.items.where[a]));
        if (!C.itemsAt(S, w).includes(a)) bad.push('itemsAt does not find it at ' + w.kind);
      }
      // Refusals.
      refuse(C.itemMove(S, a, { kind: 'GROUND', x: -950, z: 1210 }, ev), 'a move to where it already is');
      refuse(C.itemMove(S, a, { kind: 'GROUND', x: -950.5, z: 1210 }, ev), 'a ground position in fractions', /whole/);
      refuse(C.itemMove(S, a, { kind: 'BAY', buildingId: 'freightshed', bay: 4 }, ev), 'a fifth bay', /no such bay/);
      refuse(C.itemMove(S, a, { kind: 'CAR', stockId: 0 }, ev), 'freight in the locomotive', /carries no freight/);
      refuse(C.itemMove(S, a, { kind: 'CAR', stockId: 99 }, ev), 'a car that does not exist', /no such car/);
      if (ev[ev.length - 1].t !== 'itemRefused') bad.push('a refused move adds no itemRefused event');
      for (let i = 0; i < 8; i++) expect(C.itemCreate(S, wb('beans'), { kind: 'BAY', buildingId: 'freightshed', bay: 1 }, ev), 'filling bay 2');
      refuse(C.itemMove(S, a, { kind: 'BAY', buildingId: 'freightshed', bay: 1 }, ev), 'a ninth item in a bay', /full/);
      refuse(C.itemCreate(S, wb('beans'), { kind: 'BAY', buildingId: 'freightshed', bay: 1 }, ev), 'creating a ninth item in a bay', /full/);
      const rails = expect(C.itemCreate(S, wb('rails', 0, 'CONSTRUCTION'), { kind: 'GROUND', x: -900, z: 1200 }, ev), 'rails on the ground').id;
      refuse(C.itemMove(S, rails, { kind: 'CARRIED', actorId: 'player', carrier: 'HANDTRUCK', slot: 0 }, ev), 'a long bundle on a hand truck', /hand truck/);
      refuse(C.itemMove(S, rails, { kind: 'CAR', stockId: box }, ev), 'a long bundle in a boxcar', /cannot take/);
      expect(C.itemMove(S, rails, { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, ev), 'a long bundle by hand');
      refuse(C.itemMove(S, a, { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, ev), 'a second item in the same hand slot', /taken/);
      refuse(C.itemMove(S, a, { kind: 'CARRIED', actorId: 'player', carrier: 'HANDTRUCK', slot: 1 }, ev), 'a hand truck while carrying by hand', /already carrying/);
      refuse(C.itemMove(S, a, { kind: 'CARRIED', actorId: 'player', carrier: 'HANDTRUCK', slot: 3 }, ev), 'a fourth hand truck slot', /no such slot/);
      refuse(C.itemCreate(S, wb('coal'), { kind: 'GROUND', x: 0, z: 0 }, ev), 'coal as an item', /bulk/);
      refuse(C.itemCreate(S, wb('nothing'), { kind: 'GROUND', x: 0, z: 0 }, ev), 'an unknown commodity', /unknown commodity/);
      for (let i = 0; i < 8; i++) expect(C.itemCreate(S, wb('mail'), { kind: 'CAR', stockId: combine }, ev), 'mail into the combine');
      refuse(C.itemCreate(S, wb('mail'), { kind: 'CAR', stockId: combine }, ev), 'a ninth item in the combine', /full/);
      // Consumption.
      refuse(C.itemConsume(S, a, 'lost', ev), 'consuming for no valid reason', /only used up/);
      const nUsed = S.items.used.length;
      expect(C.itemConsume(S, a, 'household', ev), 'a household eats the flour');
      const log = S.items.used[S.items.used.length - 1];
      if (S.items.used.length !== nUsed + 1 || log.id !== a || log.reason !== 'household' || log.from.kind !== 'GROUND') bad.push('consumption not logged: ' + JSON.stringify(log));
      if (C.itemsAt(S, { kind: 'GROUND' }).includes(a)) bad.push('a consumed item is still found on the ground');
      refuse(C.itemMove(S, a, { kind: 'GROUND', x: 0, z: 0 }, ev), 'moving a consumed item', /gone/);
      refuse(C.itemConsume(S, a, 'household', ev), 'consuming an item twice', /gone/);
      // Conservation: clean store, then deliberately broken copies.
      const p0 = C.itemCheckConservation(S);
      if (p0.length) bad.push('conservation check fails on a good store: ' + p0.join('; '));
      const broken = (what, f) => { const T = JSON.parse(JSON.stringify(S)); f(T); if (!C.itemCheckConservation(T).length) bad.push('conservation check missed: ' + what); };
      broken('an item that vanished', T => { T.items.where[rails] = null; T.items.alive[rails] = false; });
      broken('an item deleted from the arrays', T => { T.items.where.pop(); });
      broken('a consumed item alive again', T => { T.items.alive[a] = true; T.items.where[a] = { kind: 'GROUND', x: 0, z: 0 }; });
      broken('a ninth item in a bay', T => { T.items.where[rails] = { kind: 'BAY', buildingId: 'freightshed', bay: 1 }; });
      broken('two items in one slot', T => { T.items.where[a - 0 + 1] = { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }; });
      broken('an item in a car that does not exist', T => { T.items.where[rails] = { kind: 'CAR', stockId: 42 }; });
      broken('a consumption logged twice', T => { T.items.used.push(T.items.used[0]); });
      broken('an over-full car', T => { T.items.where[rails] = { kind: 'CAR', stockId: combine }; });
      broken('a waybill for bulk coal', T => { T.items.waybill[rails].commodity = 'coal'; });
      // Bay tags by command; a mismatched bay is allowed and flagged.
      R.send({ t: 'setBayTag', b: 'freightshed', bay: 2, tag: 'RAILHEAD' }); R.send({ t: 'setBayTag', b: 'freightshed', bay: 2, tag: 'NOWHERE' }); R.step(1);
      if (S.bayTags.freightshed[2] !== 'RAILHEAD') bad.push('setBayTag did not set the tag');
      const ev2 = [];
      expect(C.itemMove(S, rails, { kind: 'BAY', buildingId: 'freightshed', bay: 2 }, ev2), 'rails into the Railhead bay');
      if (ev2[0].mismatch) bad.push('rails for construction flagged as wrong in the Railhead bay');
      if (!C.bayTagMatches(S, 'freightshed', 2, rails)) bad.push('bayTagMatches says no for rails in the Railhead bay');
      const sack = C.itemsAt(S, { kind: 'BAY', buildingId: 'freightshed', bay: 1 })[0];
      expect(C.itemMove(S, sack, { kind: 'BAY', buildingId: 'freightshed', bay: 2 }, ev2), 'overflow into a non-matching bay');
      if (!ev2[1].mismatch) bad.push('an item in a non-matching bay is not flagged');
      // Whole numbers only in the item store and tags.
      const walk = (v, path) => { if (typeof v === 'number' && !Number.isInteger(v)) bad.push('not a whole number at ' + path); else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], path + '.' + k); };
      walk(S.items, 'items'); walk(S.bayTags, 'bayTags');
      // Save and reload: export and import keep the hash and every item.
      const h1 = R.hash(), items1 = JSON.stringify(S.items), json = R.exportSave();
      const h2 = R.importSave(json);
      if (h1 !== h2) bad.push('export then import changed the hash');
      if (JSON.stringify(R.state.items) !== items1) bad.push('export then import changed the items');
      // Same start, same result: the cargo scenario run twice, with a tag command, gives one hash.
      const run = () => { const T = C.cargoDebugItems(R.newState(1866)); return R.stateHash(R.simRun(T, [{ tick: 3, cmd: { t: 'setBayTag', b: 'freightshed', bay: 0, tag: 'HUB' } }, { tick: 5, cmd: { t: 'trainRun', tr: 0, dir: 1 } }], 2000)); };
      const r1 = run(), r2 = run();
      if (r1 !== r2) bad.push('the cargo scenario gives different hashes on two runs');
      const T0 = C.cargoDebugItems(R.newState(1866));
      if (C.itemCheckConservation(T0).length) bad.push('the cargo scenario breaks conservation: ' + C.itemCheckConservation(T0).join('; '));
      return { bad, hash: h1, items: S.items.next, used: S.items.used.length, det: r1 };
    });
    problems.push(...out.bad);
    console.log(`  API: ${out.items} items created, ${out.used} consumed and logged; cargo scenario hash ${out.det}`);
    // A real browser save survives a page reload with every item.
    await page.evaluate(() => window.__railhead.saveGame());
    const before = await page.evaluate(() => ({ h: window.__railhead.hash(), items: JSON.stringify(window.__railhead.state.items) }));
    await page.reload(); await waitReady(page);
    const after = await page.evaluate(() => ({ h: window.__railhead.hash(), items: JSON.stringify(window.__railhead.state.items) }));
    if (after.h !== before.h) problems.push(`browser save and reload changed the hash (${before.h} vs ${after.h})`);
    if (after.items !== before.items) problems.push('browser save and reload lost or changed items');
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }

  // The props at phone size, with draw calls: the cargo scenario (35 items drawn: 19 in bays, 15 on the ground,
  // 1 in hand, 2 in the boxcar not drawn), calm and with the train running.
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused&debug=1&world=yard' });
    try {
      const base = await page.evaluate(async () => {
        for (const n of ['blocks', 'locks', 'routes', 'path']) rh.overlay(n, false);
        const R = window.__railhead; R.state.player.x = -12; R.state.player.z = 11; R.camera.zoom = 2.6;
        await new Promise(r => setTimeout(r, 1200));
        return R.drawCalls;
      });
      const r = await page.evaluate(async () => {
        rh.scenario('cargo');
        for (const n of ['blocks', 'locks', 'routes', 'path']) rh.overlay(n, false);
        const R = window.__railhead, S = R.state; S.player.x = -12; S.player.z = 11; R.camera.zoom = 2.6;
        await new Promise(r => setTimeout(r, 1500));
        const inCar = R.cargo.itemsAt(S, { kind: 'CAR' }).length, drawable = S.items.alive.filter(Boolean).length - inCar;
        const bays = R.cargo.itemsAt(S, { kind: 'BAY' }).length, ground = R.cargo.itemsAt(S, { kind: 'GROUND' }).length;
        return { calls: R.drawCalls, drawn: R.cargo.view.count, drawable, inCar, bays, ground, meshes: Object.values(R.cargo.view.meshes).filter(m => m.visible).length };
      });
      await page.screenshot({ path: screenshotPath('cargo-props-' + orientation) });
      // Turn the camera: the tags must turn with it (no errors, same count).
      await page.evaluate(async () => { window.__railhead.camera.yawIdx += 1; await new Promise(r => setTimeout(r, 900)); });
      await page.screenshot({ path: screenshotPath('cargo-props-turned-' + orientation) });
      const busy = await page.evaluate(async () => {
        const R = window.__railhead; R.send({ t: 'trainRun', tr: 0, dir: 1 }); R.send({ t: 'walkTo', x: -800, z: 1100 }); R.step(30);
        await new Promise(r => setTimeout(r, 900));
        return R.drawCalls;
      });
      if (r.drawn !== r.drawable) problems.push(`${orientation}: ${r.drawn} items drawn, expected ${r.drawable} (items in cars are not drawn)`);
      if (r.inCar < 1) problems.push(`${orientation}: the cargo scenario has no items in a car`);
      if (r.bays + r.ground < 30) problems.push(`${orientation}: fewer than 30 items in bays and on the ground`);
      if (r.calls >= 100 || busy >= 100) problems.push(`${orientation}: ${Math.max(r.calls, busy)} draw calls (budget under 100)`);
      if (errors.length) problems.push(`${orientation}: console errors: ${errors.join(' | ')}`);
      console.log(`  ${orientation}: ${r.bays} items in bays, ${r.ground} on the ground, ${r.drawn} drawn with ${r.meshes} item meshes + 1 tag mesh; draw calls ${base} without items, ${r.calls} with them, ${busy} with the train running`);
    } finally { await browser.close(); }
  }
  return problems;
};
