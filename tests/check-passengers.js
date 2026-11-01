// Check: passengers, simple (M1 package 5, design-doc 9 "Passengers").
// - Travellers appear at the documented rates (hub: one every 20 game minutes on average, 06:00 to 21:00, none
//   outside those hours) plus 1 to 3 off each Overland visit, and every arrival wants to go to Willow Ford.
// - Staffing the ticket window by real touch (a tap on the window walks the player there): tickets sell at
//   0.5 game minutes each, the fare is 4 cents a mile with a 10 cent minimum (40 cents for the 10-mile spur),
//   every fare goes into the ledger once (C1's econPost, category 'fares') and the money rule holds; walking away stops the sales.
// - A traveller without a ticket gives up after exactly 60 game minutes and the station's count goes up.
// - Boarding and stepping off with the combine standing at the platform: 0.1 game minutes each per door,
//   stepping off first, never more than the combine's 12 seats; a train that moves off stops the boarding;
//   travellers who stepped off walk to the station's edge and leave the map there.
// - Travellers never stand inside a building or a train (16 game hours with No. 1 running round the loop).
// - Draw calls with 40 travellers waiting stay under 100, and they share the crowd's meshes (the same count
//   with a crowd as without travellers).
// - Save and reload (export/import mid-boarding and a real page reload) keep every traveller; same commands,
//   same hash. Screenshots: the queue at the window, and boarding.

const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkPassengers() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1' });
  const R = (fn, arg) => page.evaluate(fn, arg);
  try {
    // 1. Rates, giving up and walking clear of buildings and trains: 16 game hours in the sim alone.
    const r1 = await R(() => {
      const R = window.__railhead, S = R.newState(1866), T = S.track, out = { arrive: [], gaveUp: [], gone: 0, inBld: 0, inTrain: 0, sample: null };
      const fps = R.buildings.footprints().filter(f => !f.flush);
      const inRect = (f, x, z) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z; return Math.abs(dx * c - dz * s) < f.w / 2 && Math.abs(dx * s + dz * c) < f.d / 2; };
      const t0 = performance.now();
      for (let i = 0; i < 7200; i++) {
        const cmds = S.tick === 600 ? [{ t: 'trainRun', tr: 0, dir: 1 }] : []; // No. 1 runs round the loop from 06:20
        const ev = R.simTick(S, cmds);
        for (const e of ev) {
          if (e.t === 'paxArrived') { const p = S.pax.list.find(q => q.id === e.id); out.arrive.push({ time: S.time, from: e.from, to: p.to, st: e.st }); }
          if (e.t === 'paxGaveUp') { const p = S.pax.list.find(q => q.id === e.id); out.gaveUp.push({ id: e.id, waited: S.time - p.t0 }); }
          if (e.t === 'paxGone') out.gone++;
        }
        const poses = [].concat(...S.trains.map(tr => R.trainPoses(T, tr)));
        for (const p of S.pax.list) {
          if (p.s === 'aboard') continue;
          const x = p.x / 100, z = p.z / 100;
          if (fps.some(f => inRect(f, x, z))) { out.inBld++; out.sample = out.sample || [p.id, p.s, x, z]; }
          for (const q of poses) {
            const fx = Math.cos(q.yaw), fz = -Math.sin(q.yaw), dx = x - q.x, dz = z - q.z;
            if (Math.abs(dx * fx + dz * fz) < q.len / 2 && Math.abs(dx * fz - dz * fx) < 0.55) { out.inTrain++; out.sample = out.sample || [p.id, p.s, x, z, 'train']; }
          }
        }
      }
      out.ms = performance.now() - t0; out.rep = Object.values(S.pax.rep).reduce((a, b) => a + b, 0);
      out.stations = R.pax.paxStations(T).map(K => K.id);
      return out;
    });
    const hubArr = r1.arrive.filter(a => a.from === 'hub'), outside = r1.arrive.filter(a => a.from === 'outside');
    const sod = t => (t + 5 * 3600) % 86400;
    if (hubArr.length < 37 || hubArr.length > 53) problems.push(`hub travellers 06:00 to 21:00: ${hubArr.length}, expected about 45 (one every 20 game minutes)`);
    if (r1.arrive.some(a => a.from !== 'outside' && (sod(a.time) < 6 * 3600 || sod(a.time) >= 21 * 3600))) problems.push('a traveller came outside 06:00 to 21:00');
    if (outside.length < 2 || outside.length > 6 || outside.some(a => !(sod(a.time) >= 6 * 3600 && sod(a.time) < 8 * 3600) && !(sod(a.time) >= 18 * 3600 && sod(a.time) < 20 * 3600)))
      problems.push(`Overland travellers: ${outside.length} (expected 1 to 3 at each of its 2 visits, 06:00 and 18:00): ${JSON.stringify(outside.map(a => sod(a.time) / 3600))}`);
    if (r1.arrive.some(a => (a.st === 'hub' && a.to !== 'willow') || (a.st === 'willow' && a.to !== 'hub'))) problems.push('a traveller does not want to go to the other station');
    const wf = r1.arrive.filter(a => a.from === 'willow');
    if (r1.stations.includes('willow') && (wf.length < 13 || wf.length > 28)) problems.push(`Willow Ford travellers 06:00 to 21:00: ${wf.length}, expected about 20 (one every 45 game minutes)`);
    if (!r1.gaveUp.length || r1.gaveUp.some(g => g.waited !== 3600)) problems.push('unticketed travellers should give up after exactly 60 game minutes: ' + JSON.stringify(r1.gaveUp.slice(0, 5)));
    if (r1.rep !== r1.gaveUp.length) problems.push(`the stations' give-up counts add up to ${r1.rep}, ${r1.gaveUp.length} gave up`);
    if (r1.gone < r1.gaveUp.length - 4) problems.push(`travellers who gave up should walk off the map (${r1.gone} left of ${r1.gaveUp.length})`);
    if (r1.inBld) problems.push(`travellers stood inside a building ${r1.inBld} times, e.g. ${JSON.stringify(r1.sample)}`);
    if (r1.inTrain) problems.push(`travellers stood inside a train ${r1.inTrain} times, e.g. ${JSON.stringify(r1.sample)}`);
    console.log(`  passengers (stations ${r1.stations.join(', ')}): ${r1.arrive.length} arrivals in 16 game hours (${hubArr.length} at the hub, ${wf.length} at Willow Ford, ${outside.length} off the Overland), ${r1.gaveUp.length} gave up; sim ${r1.ms.toFixed(0)} ms for 7200 ticks`);

    // 2. Fares.
    const fares = await R(() => { const P = window.__railhead.pax; return [P.paxFare('hub', 'willow'), P.paxFare('willow', 'hub'), P.paxFare('hub', 'nowhere')]; });
    if (fares[0] !== 40 || fares[1] !== 40 || fares[2] !== 10) problems.push('fares: hub to Willow Ford should be 40 cents (10 miles at 4 cents) and a short trip the 10 cent minimum: ' + fares);

    // 3. Staffing the window by real touch, in the passengers scenario (20 in line, 20 with tickets on the platform).
    // No. 1 stands on the north main line for now, clear of the platform, so the camera sees the queue.
    await R(() => {
      rh.scenario('passengers'); const R = window.__railhead, S = R.state, T = S.track;
      const K = R.pax.paxStation('hub'), mid = E => { const a = T.nodes[E.a], b = T.nodes[E.b]; return Math.hypot((a.x + b.x) / 2 - K.plat.x, (a.z + b.z) / 2 - K.plat.z); };
      const E = T.edges.filter(E => E.k === 'S' && !E.fixed && E.len >= 12 && mid(E) > 25).sort((a, b) => b.len - a.len || a.id - b.id)[0];
      S.trains[0].front = { e: E.id, s: E.len - 1, d: 1 };
      R.importSave(JSON.stringify({ state: S }));
      R.camera.zoom = 2.2; R.camera.yawIdx = 0;
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: screenshotPath('passengers-queue-ready-portrait') });
    const tapAt = await R(() => { const K = window.__railhead.pax.paxStation('hub'); return window.__railhead.toScreen(K.window.x, K.window.z, 1.0); });
    await page.touchscreen.tap(tapAt.x, tapAt.y);
    await page.waitForTimeout(150);
    let staffedAt = null;
    const sales = [];
    for (let i = 0; i < 80; i++) {
      const ev = await R(() => { const R = window.__railhead, S = R.state, n0 = S.pax.sold.hub || 0; R.step(1); return { time: S.time, sold: (S.pax.sold.hub || 0) - n0, desk: S.pax.desk }; });
      if (staffedAt === null && ev.desk && ev.desk.on) staffedAt = ev.time;
      for (let k = 0; k < ev.sold; k++) sales.push(ev.time);
      if (i === 14) { await page.waitForTimeout(1000); await page.screenshot({ path: screenshotPath('passengers-queue-portrait') }); }
    }
    const st3 = await R(() => { const S = window.__railhead.state; return { sold: S.pax.sold.hub || 0, cents: S.pax.cents.hub || 0, wait: S.pax.list.filter(p => p.s !== 'queue').length, desk: S.pax.desk }; });
    if (staffedAt === null) problems.push('a tap on the ticket window did not walk the player there and staff it');
    else {
      // 80 ticks = 640 game seconds; staffed from staffedAt: sales every 30 s while the line lasts.
      if (sales.length < 15) problems.push(`tickets sold while staffing: ${sales.length} in ${(sales[sales.length - 1] || 0) - staffedAt} game seconds (expected one every 30 s)`);
      // Sales land on tick boundaries (8 s), so each is within one tick of one every 30 s, and the average is 30 s.
      for (let k = 1; k < sales.length; k++) {
        const t = sales[k] - sales[0], ideal = k * 30;
        if (Math.abs(t - ideal) > 8) { problems.push(`ticket ${k + 1} sold ${t} s after the first; one every 30 s gives ${ideal} s`); break; }
      }
      const avg = sales.length > 1 ? (sales[sales.length - 1] - sales[0]) / (sales.length - 1) : 0;
      if (Math.abs(avg - 30) > 0.6) problems.push(`tickets sold on average every ${avg.toFixed(2)} game seconds, not 30`);
      console.log(`  ticket window: ${sales.length} tickets, on average every ${avg.toFixed(2)} game seconds`);
    }
    if (st3.cents !== 40 * st3.sold) problems.push(`fares taken: ${st3.cents} cents for ${st3.sold} tickets (40 cents each)`);
    // Every fare goes into the ledger once (econPost, category 'fares'), and the money rule holds.
    const hook = await R(() => { const R = window.__railhead, S = R.pax.paxDebugScenario(R.newState(1866), 5, 0); let n = 0, c = 0, sold = 0;
      S.player.x = R.pax.paxStation('hub').staff.x; S.player.z = R.pax.paxStation('hub').staff.z;
      R.simTick(S, [{ t: 'staffWindow', st: 'hub' }]);
      const cash0 = S.econ.cash, led0 = S.econ.ledger.length;
      for (let i = 0; i < 40; i++) for (const e of R.simTick(S, [])) { if (e.t === 'money' && e.category === 'fares') { n++; c += e.amount; } if (e.t === 'ticketSold') sold++; }
      const fares = S.econ.ledger.slice(led0).filter(L => L.category === 'fares');
      return { n, c, sold, cash: S.econ.cash - cash0, ledger: fares.length, ledgerSum: fares.reduce((a, L) => a + L.amount, 0), check: R.econ.econCheckMoney(S) }; });
    if (hook.n !== hook.sold || hook.c !== 40 * hook.sold || !hook.sold || hook.cash !== hook.c || hook.ledger !== hook.sold || hook.ledgerSum !== hook.c || hook.check.length)
      problems.push('each fare should go into the ledger once (econPost, category fares) and the cash: ' + JSON.stringify(hook));
    await page.waitForTimeout(800);
    const deskText = await page.textContent('#paxDeskText');
    if (!/Ticket window, Hub: \d+ in line, \d+ sold/.test(deskText || '')) problems.push('staffing readout: "' + deskText + '"');
    const leaveBox = await page.$eval('#paxLeave', b => { const r = b.getBoundingClientRect(); return [r.width, r.height]; });
    if (leaveBox[0] < 48 || leaveBox[1] < 48) problems.push('the Leave button is smaller than 48 px: ' + leaveBox);
    // The one departure board is C3's station card (near the order board, while the player is within 12u of it).
    const boardText = await R(() => { const c = document.getElementById('ttCard'); return c && !c.hidden ? c.textContent : ''; });
    // The departure board lists the timetable's next departures (C3's services: Willow Ford Mixed at 08:00 and 14:00).
    const deps = await R(() => { const R = window.__railhead, S = R.state; return R.pax.stationDepartures(S, 'hub'); });
    const hasTT = await R(() => !!window.__railhead.state.tt);
    if (hasTT) {
      if (!deps.length || deps.some(d => d.to !== 'willow') || deps.some((d, i) => i && d.time < deps[i - 1].time) || deps.length > 4)
        problems.push('stationDepartures(hub) should list the next departures to Willow Ford, soonest first: ' + JSON.stringify(deps));
      if (!/\d\d:\d\d to Willow Ford/.test(boardText)) problems.push('the station card (departure board) near the window: ' + JSON.stringify(boardText));
      // A train on the timetable takes travellers only for a station its run calls at later; off the timetable, always.
      const serves = await R(() => {
        const R = window.__railhead, S = JSON.parse(JSON.stringify(R.state)), tr = S.trains[0];
        const free = R.pax.paxTrainServes(S, tr, 'hub', 'willow');
        S.tt.services[0].train = tr.id; S.tt.runs = [];
        const noRun = R.pax.paxTrainServes(S, tr, 'hub', 'willow');
        S.tt.runs = [{ svc: 0, day: 0, i: 0, ph: 'at' }];
        return { free, noRun, run: R.pax.paxTrainServes(S, tr, 'hub', 'willow'), wrongWay: R.pax.paxTrainServes(S, tr, 'hub', 'nowhere'), elsewhere: R.pax.paxTrainServes(S, tr, 'willow', 'hub') };
      });
      if (!serves.free || serves.noRun || !serves.run || serves.wrongWay || serves.elsewhere) problems.push('which trains take travellers: ' + JSON.stringify(serves));
      console.log(`  departure board: ${deps.map(d => Math.floor(((d.time + 18000) % 86400) / 3600) + ':' + String(Math.floor(((d.time + 18000) % 3600) / 60)).padStart(2, '0') + ' ' + d.state).join(', ')}`);
    }
    const dcQueue = await R(() => window.__railhead.drawCalls);
    // Walking away stops the sales.
    await R(() => { const R = window.__railhead, P = R.state.player; R.send({ t: 'walkTo', x: Math.round(P.x * 100) - 400, z: Math.round(P.z * 100) }); R.step(1); });
    const after = await R(() => { const R = window.__railhead, S = R.state, n0 = S.pax.sold.hub; R.step(20); return { more: S.pax.sold.hub - n0, desk: S.pax.desk }; });
    if (after.more || after.desk) problems.push('walking away from the window should stop the sales: ' + JSON.stringify(after));

    // 4. Draw calls with 40 waiting, and sharing the crowd's meshes.
    const dc = await R(async () => {
      const R = window.__railhead, wait = () => new Promise(r => setTimeout(r, 400));
      rh.scenario('passengers'); R.camera.zoom = 1.2; await wait();
      const n = R.state.pax.list.length, withPax = R.drawCalls;
      R.setCrowd(30); await wait(); const both = R.drawCalls;
      const keep = R.state.pax.list; R.state.pax.list = []; await wait(); const crowdOnly = R.drawCalls;
      R.state.pax.list = keep; R.setCrowd(0); await wait();
      return { n, withPax, both, crowdOnly };
    });
    if (dc.n !== 40) problems.push('the passengers scenario should have 40 travellers, has ' + dc.n);
    if (!(dc.withPax < 100)) problems.push(`draw calls with 40 travellers waiting: ${dc.withPax} (budget under 100)`);
    if (dc.both !== dc.crowdOnly) problems.push(`travellers should share the crowd's meshes: ${dc.both} draw calls with a crowd of 30 and the travellers, ${dc.crowdOnly} with the crowd alone`);
    console.log(`  draw calls: ${dc.withPax} with 40 travellers waiting, ${dcQueue} at the queue close up, ${dc.both} with a crowd of 30 as well (${dc.crowdOnly} crowd alone)`);

    // 5. Boarding and stepping off, in the sim: 20 ticketed travellers at the combine's door and 5 aboard for the hub.
    const r5 = await R(() => {
      const R = window.__railhead, S = R.pax.paxDebugScenario(R.newState(1866), 0, 20), K = R.pax.paxStation('hub');
      const poseCache = {}; for (const tr of S.trains) poseCache[tr.id] = R.trainPoses(S.track, tr);
      const cars = R.pax.paxCarsAt(S, K, poseCache);
      if (!cars.length) return { err: 'no passenger car found at the hub platform' };
      const C = cars[0], dx = Math.round(C.doors[0][0] * 100), dz = Math.round(C.doors[0][1] * 100);
      for (const p of S.pax.list) { p.x = dx; p.z = dz; p.tx = dx; p.tz = dz; p.path = []; }
      for (let i = 0; i < 5; i++) S.pax.list.push({ id: S.pax.next++, from: 'willow', st: 'willow', to: 'hub', s: 'aboard', x: 0, z: 0, tx: null, tz: null, path: [], t0: 0, f: 0, wait: 0, fare: 40, car: C.stock, door: 0 });
      const log = [], mid = { exp: null, hash: null };
      for (let k = 1; k <= 60; k++) {
        const ev = R.simTick(S, []);
        log.push({ k, on: ev.filter(e => e.t === 'paxBoarded').length, off: ev.filter(e => e.t === 'paxAlighted').length, gone: ev.filter(e => e.t === 'paxGone').length });
        if (k === 4) { mid.exp = JSON.stringify({ state: S }); mid.hash = R.stateHash(S); }
      }
      const aboard = S.pax.list.filter(p => p.s === 'aboard' && p.car === C.stock).length, waiting = S.pax.list.filter(p => p.s === 'wait').length;
      const offLeft = S.pax.list.filter(p => p.s === 'off').length;
      // Then the train moves off: nobody boards a moving train.
      S.pax.list.filter(p => p.s === 'aboard').slice(0, 3).forEach(p => { p.s = 'wait'; p.car = null; });
      R.simTick(S, [{ t: 'trainRun', tr: 0, dir: 1 }]);
      let boardMoving = 0;
      for (let k = 0; k < 10; k++) boardMoving += R.simTick(S, []).filter(e => e.t === 'paxBoarded').length;
      return { log, aboard, waiting, offLeft, boardMoving, seats: C.seats, mid };
    });
    if (r5.err) problems.push(r5.err);
    else {
      // Per door one passenger every 6 game seconds (0.1 game minutes): after k ticks of 8 s, floor(8k / 6) moves in all.
      let total = 0, ok = true;
      let doneAt = 0;
      for (const l of r5.log) { total += l.on + l.off; if (total > Math.floor(8 * l.k / 6)) ok = false; if (total === 17 && !doneAt) doneAt = l.k; }
      // 17 moves (5 off, 12 on) at 6 s each take 102 s: 13 ticks; allow one more tick for the walk to the door.
      if (!ok || !doneAt || doneAt > 14) problems.push('boarding and stepping off should take 0.1 game minutes each at the one door: ' + JSON.stringify(r5.log.slice(0, 16)));
      const firstOn = r5.log.findIndex(l => l.on), lastOff = r5.log.map(l => l.off > 0).lastIndexOf(true);
      if (firstOn >= 0 && lastOff > firstOn) problems.push('travellers should step off before anyone boards');
      if (r5.log.reduce((s, l) => s + l.off, 0) !== 5) problems.push('the 5 travellers for the hub did not all step off');
      if (r5.aboard !== r5.seats || r5.seats !== 12) problems.push(`the combine should take 12 and no more: ${r5.aboard} aboard, ${r5.waiting} still waiting`);
      if (r5.waiting !== 8) problems.push(`20 travellers for 12 seats should leave 8 waiting for the next train, not ${r5.waiting}`);
      if (r5.log.reduce((s, l) => s + l.gone, 0) !== 5 || r5.offLeft) problems.push('travellers who stepped off should walk to the station edge and leave the map: ' + JSON.stringify({ gone: r5.log.reduce((s, l) => s + l.gone, 0), still: r5.offLeft }));
      if (r5.boardMoving) problems.push(`${r5.boardMoving} travellers boarded a moving train`);
      // Export and import mid-boarding resumes exactly.
      const h = await R(json => window.__railhead.importSave(json), r5.mid.exp);
      if (h !== r5.mid.hash) problems.push(`export/import mid-boarding changed the hash: ${h} vs ${r5.mid.hash}`);
    }

    // 5b. The real line (when the world has Willow Ford): travellers board No. 1 at the hub, it runs to Willow
    // Ford's platform, and there they step off and walk away.
    const r5b = await R(() => {
      const R = window.__railhead, S = R.pax.paxDebugScenario(R.newState(1866), 0, 6), T = S.track;
      const W = R.world && R.world.stationsOf(T).find(s => s.id === 'willow');
      if (!W) return { skip: true };
      for (let k = 0; k < 40; k++) R.simTick(S, []);
      const aboard = S.pax.list.filter(p => p.s === 'aboard').length;
      const sp = W.tracks[W.stops[0]], n = R.trackNearest(T, (sp.x0 + sp.x1) / 2, (sp.z0 + sp.z1) / 2);
      R.simTick(S, [{ t: 'trainSendTo', tr: 0, e: n.e, s: Math.round(n.s * 1000) }]);
      let off = 0, gone = 0, at = null;
      const offIds = new Set();
      for (let k = 0; k < 2500 && gone < aboard; k++) for (const e of R.simTick(S, [])) {
        if (e.t === 'paxAlighted' && e.st === 'willow') { off++; offIds.add(e.id); if (at === null) at = S.time; }
        if (e.t === 'paxGone' && offIds.has(e.id)) gone++;
      }
      return { aboard, off, gone, mode: S.trains[0].mode, status: S.trains[0].status, arrived: S.pax.arrived.willow || 0 };
    });
    if (!r5b.skip) {
      if (!r5b.aboard) problems.push('real line: nobody boarded No. 1 at the hub');
      else if (r5b.off !== r5b.aboard || r5b.gone !== r5b.aboard) problems.push('real line: travellers did not step off at Willow Ford and walk away: ' + JSON.stringify(r5b));
      console.log(`  real line: ${r5b.aboard} boarded at the hub, ${r5b.off} stepped off at Willow Ford, ${r5b.gone} walked off the map there`);
    }

    // 6. Determinism: the same commands twice, with staffing and a train move, give the same hash.
    const det = await R(() => {
      const R = window.__railhead, run = () => { const S = R.pax.paxDebugScenario(R.newState(1866), 12, 6);
        return R.stateHash(R.simRun(S, [{ tick: S.tick + 1, cmd: { t: 'staffWindow', st: 'hub' } }, { tick: S.tick + 120, cmd: { t: 'trainRun', tr: 0, dir: 1 } }], 900)); };
      return [run(), run()];
    });
    if (det[0] !== det[1]) problems.push('same commands gave different hashes: ' + det.join(' '));

    // 7. Boarding screenshot: the scenario with No. 1's combine at the platform, a few ticks in.
    await R(() => {
      rh.scenario('passengers'); const R = window.__railhead, S = R.state, K = R.pax.paxStation('hub'), pc = {};
      for (const tr of S.trains) pc[tr.id] = R.trainPoses(S.track, tr);
      const C = R.pax.paxCarsAt(S, K, pc)[0], d = C ? C.doors[0] : [K.staff.x, K.staff.z];
      S.player.x = d[0] - K.along[0] * 1.5 - K.out[0] * 0.6; S.player.z = d[1] - K.along[1] * 1.5 - K.out[1] * 0.6;
      R.importSave(JSON.stringify({ state: S })); // the camera starts on the player
      R.camera.zoom = 2.2; R.camera.yawIdx = 1; R.step(12);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: screenshotPath('passengers-boarding-portrait') });
    const boarded = await R(() => window.__railhead.state.pax.list.filter(p => p.s === 'aboard').length);
    if (!boarded) problems.push('nobody boarded in the boarding screenshot scene');
    const dcBoard = await R(() => window.__railhead.drawCalls);
    console.log(`  draw calls boarding: ${dcBoard}`);

    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally {
    await browser.close();
  }

  // 8. A real page reload keeps the travellers (saving is on: no scenario).
  {
    const g = await openGame('portrait', { query: '?paused' });
    try {
      const before = await g.page.evaluate(async () => {
        const R = window.__railhead, S = R.pax.paxDebugScenario(R.newState(1866), 6, 4);
        R.importSave(JSON.stringify({ state: S }));
        R.step(10);
        await R.saveGame();
        return { hash: R.hash(), n: R.state.pax.list.length };
      });
      await g.page.reload();
      await waitReady(g.page);
      const after = await g.page.evaluate(() => ({ hash: window.__railhead.hash(), n: window.__railhead.state.pax.list.length }));
      if (after.hash !== before.hash || after.n !== before.n) problems.push(`a real page reload changed the travellers: ${JSON.stringify(before)} then ${JSON.stringify(after)}`);
      await g.page.screenshot({ path: screenshotPath('passengers-reload-portrait') });
      if (g.errors.length) problems.push('console errors after reload: ' + g.errors.join(' | '));
    } finally { await g.browser.close(); }
  }
  return problems;
};
