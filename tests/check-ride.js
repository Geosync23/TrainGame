// Check: riding our own train as a passenger (D13, design-doc 5 "Interaction model").
// - With a hand truck the player cannot board (a tap on the combine's door is refused with the reason).
// - Boarding by real touch: a tap on the combine's door (No. 1 at the hub's platform, on the timetable) walks the
//   player there and boards in 0.1 game minutes (one tick); while aboard the player is hidden, moves with the car,
//   and a Step off button (at least 48 px) shows.
// - Riding from the hub to Willow Ford: the camera follows the car; walking and uncoupling are refused while
//   aboard; Step off is refused while the train moves; at Willow Ford it puts the player on the platform beside the door.
// - Saving while riding: export and import mid-line, and a real page reload, resume exactly (same hash later).
// - The timetable does not wait for the rider (the same departure and arrival times as without the player aboard),
//   and the rider does not take a traveller's seat (12 travellers still board the combine's 12 seats).
// - Same commands, same result (the ride played twice gives the same hash).
// - Landscape: the riding readout and its Step off button fit. Screenshots: riding, stepping off, landscape.

const { openGame, waitReady, screenshotPath } = require('./browser');

// In the page: a new real game with No. 1 on the timetable, run until the morning train is ready at the hub's
// platform (waiting for its time); returns the state.
const READY = `(() => {
  const R = window.__railhead, S = R.newState(1866);
  R.simTick(S, [{ t: 'ttAssign', tr: 0, on: true }]);
  for (let n = 0; n < 5000; n++) { const r = R.tt.ttRunOf(S, 0); if (r && r.ph === 'at' && /its time/.test(r.why || '')) break; R.simTick(S, []); }
  return S;
})()`;

module.exports = async function checkRide() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  const R = (fn, arg) => page.evaluate(fn, arg);
  const settle = () => page.waitForTimeout(150);
  const camSettle = () => page.waitForTimeout(900);
  const toastText = () => page.textContent('#toast');
  // Walk (by command) to a spot on the platform 3u west of the combine's door, so the door is on screen.
  const nearDoor = async () => {
    await R(() => { const R = window.__railhead, d = R.ride.rideDoors().find(d => d.stock === 1); R.send({ t: 'walkTo', x: Math.round((d.sx - 3) * 100), z: Math.round(d.sz * 100) }); });
    for (let i = 0; i < 100; i++) { await R(() => window.__railhead.step(5)); if (await R(() => window.__railhead.state.player.mode === 'idle')) break; }
    await camSettle();
  };
  const doorScreen = () => R(() => { const R = window.__railhead, d = R.ride.rideDoors().find(d => d.stock === 1); return d ? R.toScreen(d.wx, d.wz, 1.0) : null; });
  try {
    // 0. The morning train ready at the hub's platform, loaded into the page; the camera close in.
    await R(src => { const R = window.__railhead, S = (0, eval)(src); R.importSave(JSON.stringify({ state: S, ui: { yawIdx: 0, zoom: 2, speed: 0 } })); R.camera.zoom = 2; }, READY);
    await camSettle();

    // 1. With the hand truck: take it, then tap the door: refused with the reason, and the player stays off.
    await R(() => window.__railhead.send({ t: 'carryTool', tool: 0 }));
    for (let i = 0; i < 200; i++) { await R(() => window.__railhead.step(5)); if (await R(() => window.__railhead.state.player.tool === 0)) break; }
    if (!(await R(() => window.__railhead.state.player.tool === 0))) problems.push('setup: the player did not take the hand truck');
    await nearDoor();
    let sp = await doorScreen();
    if (!sp) problems.push('No. 1\'s combine has no door at the hub\'s platform');
    else {
      await page.touchscreen.tap(sp.x, sp.y); await settle();
      await R(() => window.__railhead.step(1)); await settle();
      const t = await toastText(), p = await R(() => ({ ride: window.__railhead.state.player.ride, mode: window.__railhead.state.player.mode }));
      if (!/hand truck cannot go aboard/.test(t)) problems.push(`boarding with the hand truck was not refused with the reason (message "${t}")`);
      if (p.ride || p.mode === 'to') problems.push('with the hand truck the player still went to board: ' + JSON.stringify(p));
    }
    await R(() => window.__railhead.send({ t: 'carryTool', tool: 0 }));
    for (let i = 0; i < 200; i++) { await R(() => window.__railhead.step(5)); if (await R(() => window.__railhead.state.player.tool === null)) break; }
    await nearDoor();

    // 2. Board by real touch: a tap on the door walks there; one tick (0.1 game minutes) of boarding.
    sp = await doorScreen();
    if (!sp) { problems.push('no door to tap: ' + JSON.stringify(await R(() => { const S = window.__railhead.state; return { tick: S.tick, P: S.player, tr: S.trains[0].mode, v: S.trains[0].v, why: window.__railhead.tt.ttRunOf(S, 0) }; }))); return problems; }
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    let boardTicks = 0, walked = false;
    for (let i = 0; i < 300; i++) {
      await R(() => window.__railhead.step(1));
      const p = await R(() => { const P = window.__railhead.state.player; return { mode: P.mode, act: P.act && P.act.k, ride: P.ride }; });
      if (p.mode === 'to') walked = true;
      if (p.act === 'board') boardTicks++;
      if (p.ride) break;
    }
    await camSettle();
    const b = await R(() => { const R = window.__railhead, S = R.state, P = S.player, f = R.ride.rideCarOf(1), ps = R.trainPoses(S.track, f.tr)[f.i];
      const btn = document.getElementById('rideOff').getBoundingClientRect();
      return { ride: P.ride, mode: P.mode, x: P.x, z: P.z, cx: ps.x, cz: ps.z, visible: R.ride.playerVisible, readout: !document.getElementById('ride').hidden,
        text: document.getElementById('rideText').textContent, bw: btn.width, bh: btn.height, depart: R.tt.ttRunOf(S, 0).why }; });
    if (!walked) problems.push('a tap on the combine\'s door did not walk the player there');
    if (!b.ride || b.ride.stock !== 1 || b.mode !== 'ride') problems.push('the player did not board the combine: ' + JSON.stringify(b));
    if (boardTicks !== 1) problems.push(`boarding should take 0.1 game minutes (1 tick of 8 s); it took ${boardTicks}`);
    if (b.visible) problems.push('the player is still drawn while aboard');
    if (Math.hypot(b.x - b.cx, b.z - b.cz) > 0.01) problems.push('aboard, the player is not with the car');
    if (!b.readout || !/Riding No\. 1/.test(b.text)) problems.push(`the riding readout is missing (${b.text})`);
    if (b.bw < 48 || b.bh < 48) problems.push(`the Step off button is smaller than 48 px (${b.bw} x ${b.bh})`);
    // Walking and uncoupling are refused while aboard.
    const refused = await R(() => {
      const R = window.__railhead, S = JSON.parse(JSON.stringify(R.state));
      const a = R.simTick(S, [{ t: 'walkTo', x: 0, z: 0 }]).find(e => e.t === 'rideRefused'), u = R.simTick(S, [{ t: 'uncouple', tr: 0, at: 1 }]).find(e => e.t === 'rideRefused');
      return { walk: a && a.why, cut: u && u.why, ride: !!S.player.ride };
    });
    if (!refused.walk || !refused.cut || !refused.ride) problems.push('walking or uncoupling while aboard was not refused: ' + JSON.stringify(refused));

    // 3. Ride to Willow Ford. Step off is refused while moving; the camera follows the car; a save mid-line resumes exactly.
    for (let i = 0; i < 400; i++) { await R(() => window.__railhead.step(5)); if (await R(() => window.__railhead.state.trains[0].v > 0.5)) break; }
    const offBox = await page.$('#rideOff').then(h => h.boundingBox());
    if (!offBox) { problems.push('the Step off button is not showing as the train leaves: ' + JSON.stringify(await R(() => ({ ride: window.__railhead.state.player.ride, panel: !document.getElementById('panel').hidden })))); return problems; }
    await page.touchscreen.tap(offBox.x + offBox.width / 2, offBox.y + offBox.height / 2); await settle();
    await R(() => window.__railhead.step(2)); await settle();
    const m = await R(() => ({ ride: !!window.__railhead.state.player.ride, moving: document.getElementById('ride').hasAttribute('data-moving') }));
    const mt = await toastText();
    if (!m.ride) problems.push('the player stepped off a moving train');
    if (!/Wait until the train stands/.test(mt)) problems.push(`Step off while moving was not refused with the reason (message "${mt}")`);
    if (!m.moving) problems.push('the riding readout does not show the train moving');
    let camWorst = 0, saved = null;
    for (let leg = 0; leg < 40; leg++) {
      await R(() => window.__railhead.step(15)); await camSettle();
      const c = await R(() => { const R = window.__railhead, S = R.state, f = R.ride.rideCarOf(1), ps = R.trainPoses(S.track, f.tr)[f.i];
        return { d: Math.hypot(R.camera.fx - ps.x, R.camera.fz - ps.z), x: ps.x, run: R.tt.ttRunOf(S, 0) }; });
      camWorst = Math.max(camWorst, c.d);
      if (!saved && c.x > 90) {
        // Save mid-line while riding: export, play on, import, play on the same: the same hash; then a real reload.
        saved = await R(async () => {
          const R = window.__railhead, json = R.exportSave(), h0 = R.hash();
          R.step(40); const hA = R.hash();
          const hI = R.importSave(json); R.step(40); const hB = R.hash(), ride = R.state.player.ride;
          const ok = await R.saveGame();
          return { h0, hA, hI, hB, ride, ok, tick: R.state.tick };
        });
        await page.reload(); await waitReady(page);
        saved.after = await R(() => ({ h: window.__railhead.hash(), ride: window.__railhead.state.player.ride, tick: window.__railhead.state.tick }));
        await R(() => { window.__railhead.setSpeed(0); window.__railhead.camera.zoom = 2; });
        await camSettle();
        await page.screenshot({ path: screenshotPath('ride-riding-portrait') });
        saved.readout = await R(() => !document.getElementById('ride').hidden);
        saved.dc = await R(() => window.__railhead.drawCalls);
      }
      if (c.run && c.run.i === 1 && c.run.ph === 'at') break;
    }
    if (camWorst > 1.5) problems.push(`the camera did not follow the car (up to ${camWorst.toFixed(2)}u away)`);
    if (!saved) problems.push('the train never got half way to Willow Ford');
    else {
      if (saved.hI !== saved.h0) problems.push('importing a save made while riding changed the state');
      if (saved.hA !== saved.hB) problems.push(`a save made while riding did not resume exactly (${saved.hA} vs ${saved.hB})`);
      if (!saved.ride) problems.push('after loading, the player was no longer aboard');
      if (!saved.ok) problems.push('saving to the browser failed');
      if (saved.after.h !== saved.hB || !saved.after.ride) problems.push(`after reopening the page the ride was different: ${JSON.stringify(saved.after)} vs ${saved.hB}`);
      if (!saved.readout) problems.push('after reopening the page the riding readout was missing');
      console.log(`  riding mid-line: saved and resumed with hash ${saved.hB}; screenshot ride-riding-portrait.png, draw calls ${saved.dc}`);
    }

    // 4. At Willow Ford: the train stands at the platform; Step off by touch puts the player beside the door on the platform.
    for (let i = 0; i < 400; i++) { const r = await R(() => window.__railhead.tt.ttRunOf(window.__railhead.state, 0)); if (r && r.i === 1 && r.ph === 'at') break; await R(() => window.__railhead.step(5)); }
    await camSettle();
    const stand = await R(() => document.getElementById('rideText').textContent);
    if (!/at Willow Ford/.test(stand)) problems.push(`the riding readout does not say the train stands at Willow Ford (${stand})`);
    const ob = await page.$('#rideOff').then(h => h.boundingBox());
    await page.touchscreen.tap(ob.x + ob.width / 2, ob.y + ob.height / 2); await settle();
    await R(() => window.__railhead.step(1)); await settle();
    const off = await R(() => { const R = window.__railhead, S = R.state, P = S.player, K = R.pax.paxStation('willow', S.track);
      const c = Math.cos(K.plat.yaw), s = Math.sin(K.plat.yaw), dx = P.x - K.plat.x, dz = P.z - K.plat.z;
      return { ride: P.ride, mode: P.mode, onPlat: Math.abs(dx * c - dz * s) <= K.plat.w / 2 + 0.05 && Math.abs(dx * s + dz * c) <= K.plat.d / 2 + 0.05, visible: R.ride.playerVisible, x: P.x, z: P.z }; });
    const offT = await toastText();
    if (off.ride || off.mode !== 'idle') problems.push('Step off at Willow Ford did not put the player off the train: ' + JSON.stringify(off));
    if (!off.onPlat) problems.push('after stepping off the player is not on Willow Ford\'s platform: ' + JSON.stringify(off));
    if (!/step off at Willow Ford/.test(offT)) problems.push(`no message on stepping off (${offT})`);
    await camSettle();
    if (!(await R(() => window.__railhead.ride.playerVisible))) problems.push('the player is not drawn after stepping off');
    await page.screenshot({ path: screenshotPath('ride-stepoff-portrait') });

    // 5. The timetable does not wait for the rider, and the rider takes no seat. Same commands, same result.
    const sim = await R(src => {
      const R = window.__railhead;
      function play(ride) {
        const S = (0, eval)(src), times = [];
        let boarded = false, off = false;
        for (let i = 0; i < 3000; i++) {
          const run = R.tt.ttRunOf(S, 0), cmds = [];
          if (ride && !boarded && !S.player.ride && S.player.mode === 'idle' && !S.player.act) cmds.push({ t: 'boardCar', stock: 1 });
          if (ride && S.player.ride && run && run.i === 1 && run.ph === 'at' && !off) { cmds.push({ t: 'stepOff' }); off = true; }
          const ev = R.simTick(S, cmds);
          for (const e of ev) { if (e.t === 'ttDeparted' || e.t === 'ttArrived') times.push(e.t + '@' + S.tick); if (e.t === 'rideBoarded') boarded = true; }
          if (run && run.i === 1 && run.ph === 'at' && off && !S.player.ride) break;
          if (!ride && run && run.i === 1 && run.ph === 'at') break;
        }
        return { times: times.join(','), hash: R.stateHash(S), boarded, off: off && !S.player.ride };
      }
      const a = play(true), b = play(true), c = play(false);
      // Seats: 14 ticketed travellers at the hub's platform with No. 1 standing there (off the timetable), the player aboard first.
      const S = R.pax.paxDebugScenario(R.newState(1866), 0, 14);
      let aboardAt = -1;
      for (let i = 0; i < 120; i++) {
        const cmds = !S.player.ride && S.player.mode === 'idle' && !S.player.act && aboardAt < 0 ? [{ t: 'boardCar', stock: 1 }] : [];
        R.simTick(S, cmds);
        if (S.player.ride && aboardAt < 0) aboardAt = i;
      }
      const seated = S.pax.list.filter(p => p.s === 'aboard').length;
      return { a, b, c, seated, riding: !!S.player.ride };
    }, READY);
    if (!sim.a.boarded || !sim.a.off) problems.push('the scripted ride did not board and step off: ' + JSON.stringify(sim.a));
    if (sim.a.hash !== sim.b.hash) problems.push(`the same ride played twice gave different hashes (${sim.a.hash}, ${sim.b.hash})`);
    if (sim.a.times !== sim.c.times) problems.push(`the timetable ran differently with the player aboard: ${sim.a.times} vs ${sim.c.times}`);
    if (!sim.riding || sim.seated !== 12) problems.push(`with the player aboard, ${sim.seated} of 14 travellers took the combine's 12 seats (riding ${sim.riding})`);

    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }

  // 6. Landscape: a save made while riding shows the readout with its Step off button on screen.
  const L = await openGame('landscape', { query: '?paused' });
  try {
    const r = await L.page.evaluate(src => {
      const R = window.__railhead, S = (0, eval)(src);
      for (let i = 0; i < 300 && !S.player.ride; i++) R.simTick(S, !S.player.ride && S.player.mode === 'idle' && !S.player.act ? [{ t: 'boardCar', stock: 1 }] : []);
      for (let i = 0; i < 700; i++) R.simTick(S, []);   // out on the line
      R.importSave(JSON.stringify({ state: S, ui: { yawIdx: 0, zoom: 1.25, speed: 0 } }));
      return !!S.player.ride;
    }, READY);
    await L.page.waitForTimeout(900);
    const box = await L.page.$('#rideOff').then(h => h && h.boundingBox());
    if (!r || !box) problems.push('landscape: the riding readout did not show');
    else if (box.width < 48 || box.height < 48 || box.x < 0 || box.y < 0 || box.x + box.width > 844 || box.y + box.height > 390) problems.push('landscape: the Step off button is too small or off screen: ' + JSON.stringify(box));
    await L.page.screenshot({ path: screenshotPath('ride-riding-landscape') });
    const dc = await L.page.evaluate(() => window.__railhead.drawCalls);
    console.log(`  landscape riding: screenshot ride-riding-landscape.png, draw calls ${dc}`);
    if (L.errors.length) problems.push('landscape console errors: ' + L.errors.join(' | '));
  } finally { await L.browser.close(); }
  return problems;
};
