// Check: the interchange and the Overland (M1 package 2, builder B4; design-doc 9 "The interchange").
// - The Overland comes in at 06:00 and 18:00 game time, sets out its cars on the interchange track and leaves
//   off the map; the same on day 2. Its delivery is created in its cars, and the item conservation check counts
//   the items on the set-out cars (it passes, and it catches a set-out car that has gone missing).
// - The player cannot drive the Overland or its set-out cars.
// - Loading and unloading by hand, through the running page: a tie bundle from the flatcar by hand (0.2 game
//   minutes), a crate from the boxcar onto the hand truck, a long bundle onto the hand truck is refused, and a
//   crate goes back into a car. A real tap on a set-out car walks to its door and opens the car panel; a tap on
//   an item in the panel takes it.
// - Set-out cars block walking: a walk across the interchange goes round the standing cars.
// - The outbound pick-up: an empty car, and a car holding only goods for Outside, are taken away at the next
//   visit (its Outside goods logged as sold Outside); a car still holding goods for the map stays.
// - The interchange track cannot be built on: no switch on it, no track from or to its ends, no staked job.
// - Save and reload mid-visit (export/import, and a real page reload) resume exactly: the same hash afterwards.
// - Determinism: two runs of 2 game days from the same start give the same hash.
// - Screenshot interchange-unload-portrait.png (and landscape): the set-out cars, a load on the flatcar, and the
//   player unloading. Draw calls are reported.

const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkInterchange() {
  const problems = [];
  // ---- Part 1: the sim alone (no drawing): visits, pick-up, building refused, determinism ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      const r = await page.evaluate(() => {
        const R = window.__railhead, X = R.interchange, out = {};
        const hhmm = st => { const s = (st.time + 5 * 3600) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
        // Two game days with no commands, logging the Overland's events.
        const st = R.newState(1866), log = [];
        out.startsAway = X.overlandTrain(st).away === true && X.interchangeCut(st).consist.length === 0;
        out.trackErrs = R.trackValidate(st.track);
        let consBad = 0, firstSetOut = null;
        for (let i = 0; i < 2 * 10800; i++) {
          const ev = R.simTick(st, []);
          for (const e of ev) if (/^overland/.test(e.t)) log.push({ t: e.t, at: hhmm(st), day: Math.floor((st.time + 5 * 3600) / 86400), cars: e.cars, stock: e.stock });
          if (ev.some(e => e.t === 'overlandSetOut') && !firstSetOut) {
            const cut = X.interchangeCut(st);
            firstSetOut = { cars: cut.consist.map(c => c.k), items: cut.consist.map(c => R.cargo.itemsAt(st, { kind: 'CAR', stockId: c.id }).length),
              cons: R.cargo.itemCheckConservation(st), awayX: null };
          }
          if (i % 500 === 0 && R.cargo.itemCheckConservation(st).length) consBad++;
        }
        out.log = log; out.firstSetOut = firstSetOut; out.consBad = consBad;
        out.endCons = R.cargo.itemCheckConservation(st);
        out.arrivals = log.filter(e => e.t === 'overlandArriving').map(e => e.day + ' ' + e.at);
        out.leftCount = log.filter(e => e.t === 'overlandLeft').length;
        out.awayAtEnd = X.overlandTrain(st).away;
        // The conservation check counts items on set-out cars: remove a set-out car and it must complain.
        const broken = JSON.parse(JSON.stringify(st)); X.interchangeCut(broken).consist.pop();
        out.brokenCaught = R.cargo.itemCheckConservation(broken).some(p => /no real place|no such car/.test(p));

        // Driving the Overland or its cars is refused.
        const s2 = R.newState(1866);
        const ev1 = R.simTick(s2, [{ t: 'trainRun', tr: 1, dir: 1 }, { t: 'useTrain', tr: 2 }, { t: 'trainSendTo', tr: 0, e: X.interchangeEdge(s2.track), s: 5000 }]);
        out.notYours = ev1.filter(e => e.t === 'notYourTrain').length;
        out.sendRefused = ev1.some(e => e.t === 'noRoute' && /interchange/.test(e.why));

        // Outbound pick-up: after the first morning, empty the flatcar (the player unloaded it), and in the boxcar
        // leave goods for the map. A third car (test only) holds a crate for Outside. At 18:00 the Overland takes
        // the empty flatcar and the Outside car, sells the crate Outside, and leaves the boxcar.
        const s3 = R.newState(1866);
        for (let i = 0; i < 300 * 60 / 8; i++) R.simTick(s3, []); // to 10:00
        const cut = X.interchangeCut(s3), flat = cut.consist.find(c => c.k === 'flatcar'), boxc = cut.consist.find(c => c.k === 'boxcar');
        let gx = 400;
        for (const id of R.cargo.itemsAt(s3, { kind: 'CAR', stockId: flat.id })) R.cargo.itemMove(s3, id, { kind: 'GROUND', x: gx += 40, z: 2300 }, null);
        cut.consist.push({ id: 900, k: 'boxcar', len: 2.6, mass: 0.5 }); // a car the player left for Outside (test only: coupling comes in round C)
        const outWb = { commodity: 'tools', originTownId: 0, destTownId: 'OUTSIDE', consignee: { kind: 'OUTSIDE', id: 0 }, contractId: null, due: null };
        const exportId = R.cargo.itemCreate(s3, outWb, { kind: 'CAR', stockId: 900 }, null).id;
        // The added car stands at the west end: move the cut's front so its cars still end at the dead end.
        cut.front.s += 2.7;
        out.takes = { flat: X.overlandTakes(s3, flat), box: X.overlandTakes(s3, boxc), outCar: X.overlandTakes(s3, cut.consist[2]) };
        const ev3 = [];
        for (let i = 0; i < 12 * 3600 / 8; i++) for (const e of R.simTick(s3, [])) if (/^overland/.test(e.t)) ev3.push(e);
        const all = s3.trains.map(t => t.consist.map(c => c.id)).flat();
        out.pick = { events: ev3.map(e => e.t), picked: (ev3.find(e => e.t === 'overlandPickedUp') || {}).stock, flatGone: !all.includes(flat.id), outGone: !all.includes(900),
          boxStays: X.interchangeCut(s3).consist.some(c => c.id === boxc.id), boxItems: R.cargo.itemsAt(s3, { kind: 'CAR', stockId: boxc.id }).length,
          sold: s3.items.used.some(u => u.id === exportId && u.reason === 'soldOutside'), cons: R.cargo.itemCheckConservation(s3),
          cut: X.interchangeCut(s3).consist.map(c => c.id), phase: s3.overland.phase };

        // The interchange cannot be built on (planning, a staked job, or instant track in the sim).
        const s4 = R.newState(1866), T4 = s4.track, ie = X.interchangeEdge(T4), E = T4.edges[ie];
        const plan = c => { const p = R.buildPlan(s4, { t: 'buildTrack', ...c }); return { ok: p.ok, why: p.why }; };
        out.build = {
          fromEnd: plan({ from: 'node', n: E.a, tx: -200, tz: 2000 }),
          sw: plan({ from: 'switch', e: ie, s: 20000, fwd: 1, side: 1, tx: 3000, tz: 2600 }),
          joinEnd: R.buildPlan(s4, { t: 'buildTrack', from: 'free', x: -1000, z: 2000, h: 0, tx: 200, tz: 2000 }),
          fixed: E.fixed === true,
        };
        out.build.joinEnd = { ok: out.build.joinEnd.ok, endNode: out.build.joinEnd.G && out.build.joinEnd.G.endNode, why: out.build.joinEnd.why };
        const e0 = T4.edges.length;
        const ev4 = R.simTick(s4, [{ t: 'buildTrack', from: 'switch', e: ie, s: 20000, fwd: 1, side: 1, tx: 3000, tz: 2600 },
          { t: 'stakeJob', from: 'switch', e: ie, s: 20000, fwd: 1, side: 1, tx: 3000, tz: 2600 },
          { t: 'stakeJob', from: 'node', n: E.a, tx: -200, tz: 2000 }]);
        out.build.simRefused = ev4.filter(e => e.t === 'buildRefused' || e.t === 'jobRefused').map(e => e.why);
        out.build.edgesAdded = T4.edges.length - e0; out.build.jobs = s4.jobs ? s4.jobs.list.length : 0;

        // Determinism: 2 game days twice, with a few commands, give the same hash.
        const script = [{ tick: 3, cmd: { t: 'walkTo', x: 350, z: 2250 } }, { tick: 500, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: 900, cmd: { t: 'trainStop', tr: 0 } }];
        const t0 = performance.now();
        const h1 = R.stateHash(R.simRun(R.newState(1866), script, 2 * 10800));
        out.ms2days = Math.round(performance.now() - t0);
        const h2 = R.stateHash(R.simRun(R.newState(1866), script, 2 * 10800));
        out.det = { h1, h2 };
        return out;
      });
      const want = ['0 06:00', '0 18:00', '1 06:00', '1 18:00'];
      if (!r.startsAway) problems.push('a new game should start with the Overland away and no cars on the interchange');
      if (r.trackErrs.length) problems.push('the test yard with the interchange is not valid: ' + r.trackErrs.join('; '));
      if (JSON.stringify(r.arrivals) !== JSON.stringify(want)) problems.push('the Overland should arrive at 06:00 and 18:00 on both days, came: ' + JSON.stringify(r.arrivals));
      if (r.leftCount !== 4 || !r.awayAtEnd) problems.push(`the Overland should leave after each visit (left ${r.leftCount} times, away at the end: ${r.awayAtEnd})`);
      const fs = r.firstSetOut;
      if (!fs || fs.cars.join() !== 'flatcar,boxcar' || fs.items.join() !== '7,8') problems.push('first morning: expected a flatcar with 7 items and a boxcar with 8 set out, got ' + JSON.stringify(fs));
      if (fs && fs.cons.length) problems.push('conservation fails with the set-out cars: ' + fs.cons.join('; '));
      if (r.consBad || r.endCons.length) problems.push('conservation failed during the 2 days: ' + r.endCons.join('; '));
      if (!r.brokenCaught) problems.push('the conservation check did not notice a missing set-out car with items in it');
      if (r.notYours !== 2) problems.push(`driving the Overland or its cars should be refused (refusals: ${r.notYours})`);
      if (!r.sendRefused) problems.push('sending No. 1 to the interchange track should be refused with a reason');
      const p = r.pick;
      if (!r.takes.flat || r.takes.box || !r.takes.outCar) problems.push('which cars the Overland takes is wrong: ' + JSON.stringify(r.takes));
      if (!p.flatGone || !p.outGone || !p.boxStays || p.boxItems !== 8) problems.push('outbound pick-up: ' + JSON.stringify(p));
      if (!p.sold) problems.push('the crate for Outside was not logged as sold Outside when its car was taken');
      if (p.cons.length) problems.push('conservation after the pick-up: ' + p.cons.join('; '));
      if (!p.events.includes('overlandCoupled') || !p.events.includes('overlandPickedUp') || p.phase !== 'away') problems.push('pick-up visit events: ' + p.events.join(', '));
      const b = r.build;
      if (!b.fixed) problems.push('the interchange edge is not marked fixed');
      if (b.fromEnd.ok || !/interchange/.test(b.fromEnd.why || '')) problems.push('track from the interchange dead end was not refused: ' + JSON.stringify(b.fromEnd));
      if (b.sw.ok || !/interchange/.test(b.sw.why || '')) problems.push('a switch on the interchange track was not refused: ' + JSON.stringify(b.sw));
      if (b.joinEnd.endNode !== null && b.joinEnd.endNode !== undefined) problems.push('a plan joined the interchange track end: ' + JSON.stringify(b.joinEnd));
      if (b.edgesAdded || b.jobs || b.simRefused.length < 2) problems.push('the sim did not refuse building on the interchange: ' + JSON.stringify(b));
      if (r.det.h1 !== r.det.h2) problems.push(`2 game days twice gave different hashes (${r.det.h1} vs ${r.det.h2})`);
      console.log(`  arrivals ${r.arrivals.join(', ')}; first set-out ${fs && fs.cars.join('+')} with ${fs && fs.items.join('+')} items; pick-up took ${JSON.stringify(p.picked)}; 2 game days of sim in ${r.ms2days} ms, hash ${r.det.h1}`);
      if (errors.length) problems.push('console errors (sim part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }

  // ---- Part 2: the running page: unloading by hand, the car panel by touch, walking round, screenshots ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const settle = () => page.waitForTimeout(150);
    const camSettle = () => page.waitForTimeout(900);
    const stepUntil = (cond, max) => R(([c, m]) => { const f = new Function('R', 'return ' + c); const R = window.__railhead; for (let i = 0; i < m; i++) { if (f(R)) return i; R.step(1); } return f(R) ? m : -1; }, [cond, max]);
    try {
      await R(() => { window.rh.scenario('interchange'); for (const o of ['blocks', 'locks', 'routes', 'path']) window.rh.overlay(o, false); window.__railhead.camera.zoom = 1.6; });
      const t0 = await R(() => window.__railhead.state.time);
      if (t0 !== 3000) problems.push('rh.scenario("interchange") should start at 05:50 (time 3000), got ' + t0);
      // Wait for the set-out (06:00 + about half an hour).
      const n = await stepUntil("R.state.overland.phase === 'leave'", 600);
      if (n < 0) problems.push('the Overland did not set out its cars in the page');
      await R(() => window.__railhead.step(20));
      const ids = await R(() => {
        const R = window.__railhead, X = R.interchange, cut = X.interchangeCut(R.state), it = R.cargo;
        const flat = cut.consist.find(c => c.k === 'flatcar').id, box = cut.consist.find(c => c.k === 'boxcar').id;
        const of = (sid, com) => it.itemsAt(R.state, { kind: 'CAR', stockId: sid }).filter(id => R.state.items.waybill[id].commodity === com);
        return { flat, box, ties: of(flat, 'ties'), rails: of(flat, 'rails'), tinned: of(box, 'tinned')[0], clothing: of(box, 'clothing')[0] };
      });
      const where = id => R(id => window.__railhead.state.items.where[id], id);

      // 1. A tie bundle from the flatcar, by hand: walk to the side of the car, then 2 ticks (0.2 game minutes).
      await R(id => window.__railhead.send({ t: 'carryPick', id }), ids.ties[0]);
      let acts = 0;
      for (let i = 0; i < 200; i++) {
        await R(() => window.__railhead.step(1));
        const s = await R(id => ({ a: window.__railhead.state.player.act, w: window.__railhead.state.items.where[id] }), ids.ties[0]);
        if (s.a && s.a.k === 'pick') acts++;
        if (s.w.kind === 'CARRIED') break;
        if (acts === 1) { // mid pick-up: the screenshot of the set-out cars being unloaded
          await camSettle();
          await page.screenshot({ path: screenshotPath('interchange-unload-portrait') });
        }
      }
      const wt = await where(ids.ties[0]);
      if (wt.kind !== 'CARRIED' || wt.carrier !== 'HAND') problems.push('the tie bundle was not taken from the flatcar by hand: ' + JSON.stringify(wt));
      if (acts !== 2) problems.push(`taking an item from a car should take 2 ticks (0.2 game minutes), took ${acts}`);
      const reach = await R(id => { const R = window.__railhead, P = R.state.player, d = R.interchange.carryCarDoor(R.state, id, P.x, P.z); return Math.hypot(d.x - P.x, d.z - P.z); }, ids.flat);
      if (reach > 1.5) problems.push(`the player unloaded the flatcar from ${reach.toFixed(2)}u away (reach is 1.5u)`);
      const dcUnload = await R(() => window.__railhead.drawCalls);
      const flatDrawn = await R(() => Object.keys(window.__railhead.interchange.cargoFlatPoses()).length);
      if (flatDrawn !== 6) problems.push(`the flatcar's load should be drawn (6 items left on it), drawn: ${flatDrawn}`);
      // A long bundle into the boxcar is refused; put the ties down on the ground instead.
      let ev = await R(box => window.__railhead.simTick(window.__railhead.state, [{ t: 'carryPut', stock: box }]), ids.box);
      if (!ev.some(e => e.t === 'carryRefused' && /boxcar cannot take a long bundle/.test(e.why))) problems.push('a long bundle into the boxcar was not refused: ' + JSON.stringify(ev.filter(e => /Refused/.test(e.t))));
      await R(() => window.__railhead.send({ t: 'carryPut', x: 600, z: 2350 }));
      await stepUntil("R.carry.carryHeld(R.state).length === 0", 200);

      // 2. Walking across the interchange goes round the standing cars (they block walking like a train).
      await R(() => { const R = window.__railhead; R.state.player.x = 5.2; R.state.player.z = 22.6; R.send({ t: 'walkTo', x: 520, z: 1750 }); });
      const walk = await R(() => {
        const R = window.__railhead, cut = R.interchange.interchangeCut(R.state), x0 = R.edgeAt(R.state.track, R.state.track.edges[cut.front.e], cut.front.s).x, x1 = x0 - R.trainLength(cut);
        let inside = 0, steps = 0; R.step(1);
        for (; steps < 400 && R.state.player.mode === 'to'; steps++) { R.step(1); const P = R.state.player; if (P.x > x1 && P.x < x0 && Math.abs(P.z - 20) < 0.7) inside++; }
        return { inside, done: R.state.player.mode !== 'to', z: R.state.player.z, x1, x0 };
      });
      if (walk.inside || !walk.done || walk.z > 19) problems.push('a walk across the interchange did not go round the standing cars: ' + JSON.stringify(walk));

      // 3. The hand truck: a crate from the boxcar onto it; a long bundle from the flatcar onto it is refused.
      await R(() => window.__railhead.send({ t: 'carryTool', tool: 0 }));
      await stepUntil("R.state.player.tool === 0", 900);
      await R(id => window.__railhead.send({ t: 'carryPick', id }), ids.tinned);
      await stepUntil(`R.state.items.where[${ids.tinned}].kind === 'CARRIED'`, 900);
      const wc = await where(ids.tinned);
      if (wc.kind !== 'CARRIED' || wc.carrier !== 'HANDTRUCK') problems.push('the crate from the boxcar is not on the hand truck: ' + JSON.stringify(wc));
      ev = await R(id => window.__railhead.simTick(window.__railhead.state, [{ t: 'carryPick', id }]), ids.rails[0]);
      if (!ev.some(e => e.t === 'carryRefused' && /long bundle/.test(e.why))) problems.push('a long bundle onto the hand truck was not refused');
      // The crate goes into the flatcar (a flatcar takes crates).
      await R(id => window.__railhead.send({ t: 'carryPut', stock: id }), ids.flat);
      await stepUntil(`R.state.items.where[${ids.tinned}].kind === 'CAR'`, 300);
      const wc2 = await where(ids.tinned);
      if (wc2.kind !== 'CAR' || wc2.stockId !== ids.flat) problems.push('the crate was not put into the flatcar: ' + JSON.stringify(wc2));
      await R(() => window.__railhead.send({ t: 'carryTool', tool: 0 }));
      await stepUntil("R.state.player.tool === null", 900);

      // 4. Real touch: tap the boxcar, walk to its door, the car panel opens; tap the clothing crate in it.
      await R(() => { const R = window.__railhead; R.state.player.x = 4; R.state.player.z = 22.4; R.step(1); });
      await camSettle();
      const sp = await R(box => { const R = window.__railhead, cut = R.interchange.interchangeCut(R.state), i = cut.consist.findIndex(c => c.id === box), p = R.trainPoses(R.state.track, cut)[i]; return R.toScreen(p.x, p.z, 1.1); }, ids.box);
      await page.touchscreen.tap(sp.x, sp.y); await settle();
      await stepUntil('window.__railhead.interchange.carPanel.stock !== null', 200);
      await settle();
      const panelOpen = await page.isVisible('#carPanel');
      if (!panelOpen) problems.push('tapping a set-out car did not open the car panel');
      else {
        const btns = await page.locator('#carItems button').count();
        if (btns !== 7) problems.push(`the boxcar panel should list 7 items (8 less the tinned goods), lists ${btns}`);
        const b = page.locator(`#carItems button[data-id="${ids.clothing}"]`);
        const box = await b.boundingBox();
        if (!box || box.height < 48) problems.push('car panel item buttons are smaller than 48 px');
        await b.tap(); await settle();
        await stepUntil(`R.state.items.where[${ids.clothing}].kind === 'CARRIED'`, 60);
        const wcl = await where(ids.clothing);
        if (wcl.kind !== 'CARRIED') problems.push('tapping an item in the car panel did not take it: ' + JSON.stringify(wcl));
        await settle(); await R(() => window.__railhead.step(1)); await settle();
        await page.screenshot({ path: screenshotPath('interchange-panel-portrait') });
        await page.tap('#carPutIn'); await settle();
        await stepUntil(`R.state.items.where[${ids.clothing}].kind === 'CAR'`, 60);
        if ((await where(ids.clothing)).kind !== 'CAR') problems.push('Put in from the car panel did not put the crate back');
      }
      const cons = await R(() => window.__railhead.cargo.itemCheckConservation(window.__railhead.state));
      if (cons.length) problems.push('conservation after unloading: ' + cons.join('; '));

      // 5. Save and reload mid-visit (export and import): the evening visit, while the Overland is coming in.
      await R(() => { const R = window.__railhead; R.state.time = 46800 - 80; });
      await stepUntil("R.state.overland.phase === 'in' && R.interchange.overlandTrain(R.state).v > 0", 100);
      await R(() => window.__railhead.step(30));
      const mid = await R(() => { const R = window.__railhead, json = R.exportSave(); R.step(400); const a = R.hash(); R.importSave(json); R.step(400); return { a, b: R.hash(), ph: R.state.overland.phase }; });
      if (mid.a !== mid.b) problems.push(`export and import mid-visit did not resume exactly (${mid.a} vs ${mid.b})`);
      if (errors.length) problems.push('console errors (page part): ' + errors.join(' | '));
      console.log(`  unloading: draw calls ${dcUnload} (portrait, Overland leaving, 2 set-out cars, flatcar load drawn); after the mid-visit reload the visit went on to "${mid.ph}"`);
    } finally { await browser.close(); }
  }

  // ---- Part 3: a real save in the browser mid-visit, reloaded; and a landscape screenshot ----
  {
    const { browser, page, errors } = await openGame('landscape', { query: '?paused' });
    try {
      await page.evaluate(() => { const R = window.__railhead; R.step(450 + 120); R.camera.zoom = 1.4; });
      const before = await page.evaluate(async () => { const R = window.__railhead; await R.saveGame(); return { h: R.hash(), ph: R.state.overland.phase, tick: R.state.tick }; });
      await page.reload(); await waitReady(page);
      const after = await page.evaluate(() => ({ h: window.__railhead.hash(), ph: window.__railhead.state.overland.phase, tick: window.__railhead.state.tick }));
      if (before.ph === 'away') problems.push('the reload test was not mid-visit');
      if (after.h !== before.h) problems.push(`a real reload mid-visit gave a different state (${before.h} at tick ${before.tick}, ${after.h} at tick ${after.tick})`);
      // Same future: step both the reloaded game and a copy of the saved state.
      const fut = await page.evaluate(() => { const R = window.__railhead, copy = JSON.parse(JSON.stringify(R.state)); R.simRun(copy, [], 300); R.step(300); return [R.hash(), R.stateHash(copy)]; });
      if (fut[0] !== fut[1]) problems.push('after the reload the visit did not go on the same way');
      // Landscape screenshot with the cars set out, the player beside them.
      await page.evaluate(() => { const R = window.__railhead; R.step(200); R.state.player.x = 4.5; R.state.player.z = 22.3; R.step(1); });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: screenshotPath('interchange-cars-landscape') });
      const dc = await page.evaluate(() => window.__railhead.drawCalls);
      if (dc >= 100) problems.push(`draw calls ${dc} at the interchange (limit 100)`);
      console.log(`  real reload mid-visit (phase "${before.ph}"): hash ${after.h}; landscape draw calls ${dc}`);
      if (errors.length) problems.push('console errors (reload part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
