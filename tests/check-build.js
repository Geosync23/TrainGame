// Check: the build tool (piece 2), at phone size with real touch events.
// - Build mode: a drag from the spur's dead end lays a straight continuing it.
// - A drag starting on a straight places a switch there, with a stand, and the track stays valid.
// - A too-tight curve shows a red preview with the reason, and Lay track is disabled.
// - Pinch still zooms in build mode; leaving build mode brings walking back.
// - Through the sim alone: a separate loop with a passing siding and two switches, built with
//   buildTrack commands, passes the validator, and a train sent to the siding takes the diverging route.
// - Building over a train's track is refused with a reason.
// Parts 1 to 6 open the page with ?debug=1, because the M0 instant build (Lay track) is parked behind it (D10).
// - Part 7, without ?debug=1: the tool still plans (ghost and label), the button beside Cancel says Stake it
//   (hand-building, D12; check-handbuild.js covers what it does), and a buildTrack command sent through
//   __railhead.send is refused with a buildRefused event and adds no track. Screenshot: build-plan-only-portrait.png.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkBuild() {
  const problems = [];
  await checkDebugBuild(problems);
  await checkPlanOnly(problems);
  return problems;
};

// A one-finger drag helper set for one page.
async function tools(page) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });
  const R = (fn, arg) => page.evaluate(fn, arg);
  const settle = () => page.waitForTimeout(120);
  const frames = () => R(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const scr = (x, z, y) => R(([x, z, y]) => window.__railhead.toScreen(x, z, y || 0), [x, z, y]);
  // Look at world point (x, z): the camera follows the player, so pan by the difference.
  const lookAt = async (x, z, zoom) => {
    await R(([x, z, zoom]) => { const R = window.__railhead, P = R.state.player; R.camera.zoom = zoom; R.camera.ox = x - P.x; R.camera.oz = z - P.z; R.camera.fx = P.x; R.camera.fz = P.z; }, [x, z, zoom]);
    await page.waitForTimeout(200);
  };
  // A one-finger drag from world point a to world point b, in steps. hold(before release) runs while the finger is down.
  const drag = async (a, b, hold) => {
    const p0 = await scr(a.x, a.z, 0.2), p1 = await scr(b.x, b.z, 0);
    await touch('touchStart', [p0]);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: p0.x + (p1.x - p0.x) * i / 10, y: p0.y + (p1.y - p0.y) * i / 10 }]); await page.waitForTimeout(16); }
    await settle();
    await frames();   // touch moves reach the page on the next drawn frame
    if (hold) await hold();
    await touch('touchEnd', []); await settle(); await frames();
  };
  const label = () => R(() => { const el = document.getElementById('buildLabel'); return { text: el.textContent, k: el.dataset.k, hidden: el.hidden }; });
  return { cdp, touch, R, settle, frames, scr, lookAt, drag, label };
}
const spurEnd = () => {
  const T = window.__railhead.state.track;
  const ends = T.nodes.filter(N => T.edges.filter(E => E.a === N.id || E.b === N.id).length === 1);
  const N = ends.sort((a, b) => a.x - b.x)[0]; // the spur end is the westmost dead end
  const E = T.edges.find(E => E.a === N.id || E.b === N.id), O = T.nodes[E.a === N.id ? E.b : E.a];
  const L = Math.hypot(N.x - O.x, N.z - O.z);
  return { n: N.id, x: N.x, z: N.z, hx: (N.x - O.x) / L, hz: (N.z - O.z) / L, edges: T.edges.length, k: window.__railhead.CFG.SCALE };
};

async function checkDebugBuild(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1&world=yard' });
  const { touch, R, settle, scr, lookAt, drag, label } = await tools(page);
  try {
    await page.tap('#buildBtn'); await settle();
    if (!(await R(() => window.__railhead.buildTool.on))) problems.push('Build button did not turn build mode on');
    const btnBox = await page.locator('#buildBtn').boundingBox();
    if (btnBox.width < 48 || btnBox.height < 48) problems.push('Build button is smaller than 48 px');

    // 1. Continue the spur from its dead end, 6u (x SC, D15) straight ahead.
    const spur = await R(spurEnd), SC = spur.k;
    await lookAt(spur.x - 3 * SC, spur.z, 0.7);
    let seen = null;
    await drag(spur, { x: spur.x + spur.hx * 6 * SC, z: spur.z + spur.hz * 6 * SC }, async () => { seen = await label(); });
    if (!seen || seen.k !== 'ok') problems.push(`spur: preview was not green (${seen && seen.k}: ${seen && seen.text})`);
    if (!(await page.isVisible('#buildConfirm'))) problems.push('spur: Lay track / Cancel did not appear after release');
    else {
      const lay = await page.locator('#buildLay').boundingBox();
      if (lay.height < 48 || lay.width < 48) problems.push('Lay track button is smaller than 48 px');
      await page.tap('#buildLay'); await settle();
    }
    const after1 = await R(([n, e0]) => {
      const R = window.__railhead, T = R.state.track, E = T.edges[e0];
      return { edges: T.edges.length, from: E && (E.a === n || E.b === n), len: E && E.len, k: E && E.k, errs: R.trackValidate(T) };
    }, [spur.n, spur.edges]);
    if (after1.edges !== spur.edges + 1 || !after1.from || after1.k !== 'S') problems.push(`spur: expected one new straight from the dead end, got ${JSON.stringify(after1)}`);
    else if (Math.abs(after1.len - 6 * SC) > 0.3 * SC) problems.push(`spur: new straight is ${after1.len.toFixed(2)}u, expected about ${6 * SC}u`);
    if (after1.errs.length) problems.push('spur: track not valid after laying: ' + after1.errs.join('; '));

    // 2. A switch on the north main line (z = -14 x SC), dragged west and towards the inside of the oval.
    await lookAt(7 * SC, -12 * SC, 0.7);
    const sw0 = await R(() => window.__railhead.state.track.switches.length);
    await drag({ x: 10 * SC, z: -14 * SC }, { x: 2 * SC, z: -10.5 * SC }, async () => {
      seen = await label();
      seen.cmd = await R(() => JSON.stringify(window.__railhead.buildTool.cmd));
      await page.screenshot({ path: screenshotPath('build-ghost-switch-portrait') });
    });
    if (!seen || seen.k !== 'ok') problems.push(`switch: preview was not green (${seen && seen.k}: ${seen && seen.text}) ${seen && seen.cmd}`);
    if (await page.isVisible('#buildLay')) { await page.tap('#buildLay'); await settle(); }
    const after2 = await R(() => {
      const R = window.__railhead, T = R.state.track, W = T.switches[T.switches.length - 1];
      return { sw: T.switches.length, node: T.nodes[W.node], stand: W.stand, rev: T.edges[W.reverse], errs: R.trackValidate(T), discs: null };
    });
    if (after2.sw !== sw0 + 1) problems.push(`switch: expected ${sw0 + 1} switches, found ${after2.sw}`);
    else {
      if (Math.abs(after2.node.z + 14 * SC) > 1e-6 || Math.abs(after2.node.x - 10 * SC) > 0.2 * SC) problems.push(`switch: placed at ${after2.node.x.toFixed(2)}, ${after2.node.z.toFixed(2)} instead of ${10 * SC}, ${-14 * SC}`);
      if (Math.abs(after2.rev.R - 10 * SC) > 1e-9) problems.push(`switch: diverging leg is not radius ${10 * SC}`);
      if (!(after2.stand && after2.stand.z < -14 * SC)) problems.push('switch: the stand is not on the side away from the diverging leg');
    }
    if (after2.errs.length) problems.push('switch: track not valid after laying: ' + after2.errs.join('; '));

    // 3. Red preview: from the new spur end, a curve far too tight (radius about 2.5u x SC).
    const end2 = await R(([e0]) => { const T = window.__railhead.state.track, E = T.edges[e0]; return T.nodes[E.b]; }, [spur.edges]);
    await lookAt(end2.x - 2 * SC, end2.z - 2 * SC, 0.7);
    // Heading west: 2u ahead and 4u to the side (x SC).
    await drag(end2, { x: end2.x + (spur.hx * 2 - spur.hz * 4) * SC, z: end2.z + (spur.hz * 2 + spur.hx * 4) * SC }, async () => {
      seen = await label();
      await page.screenshot({ path: screenshotPath('build-ghost-red-portrait') });
    });
    if (!seen || seen.k !== 'bad' || !new RegExp(`Curve too tight: [\\d.]+u, minimum ${8 * SC}u`).test(seen.text)) problems.push(`red preview: label was ${seen && seen.k}: ${seen && seen.text}`);
    const ghostRed = await R(() => !!window.__railhead.buildTool.ghost);
    if (!ghostRed) problems.push('red preview: no ghost track was drawn');
    if (!(await page.isVisible('#buildConfirm'))) problems.push('red preview: Cancel did not appear');
    else {
      if (!(await page.isDisabled('#buildLay'))) problems.push('red preview: Lay track was not disabled');
      await page.tap('#buildCancel'); await settle();
    }
    const after3 = await R(() => ({ edges: window.__railhead.state.track.edges.length, ghost: !!window.__railhead.buildTool.ghost }));
    if (after3.ghost) problems.push('cancel: the ghost is still shown');

    // 4. Pinch still zooms in build mode, and no track is laid by it.
    const z0 = await R(() => window.__railhead.camera.zoom);
    await touch('touchStart', [{ x: 170, y: 420 }, { x: 220, y: 420 }]);
    for (let i = 1; i <= 5; i++) { await touch('touchMove', [{ x: 170 - i * 15, y: 420 }, { x: 220 + i * 15, y: 420 }]); await page.waitForTimeout(16); }
    await touch('touchEnd', []); await settle();
    const z1 = await R(() => window.__railhead.camera.zoom);
    if (!(z1 > z0 * 1.3)) problems.push(`pinch in build mode: zoom went from ${z0.toFixed(2)} to ${z1.toFixed(2)}`);
    if (await page.isVisible('#buildConfirm')) problems.push('pinch in build mode: it started a track');
    const busyCalls = await R(() => window.__railhead.drawCalls);

    // 5. Leave build mode: a tap walks again.
    await page.tap('#buildBtn'); await settle();
    await R(() => { const R = window.__railhead; R.camera.ox = 0; R.camera.oz = 0; R.camera.zoom = 1.25; });
    await page.waitForTimeout(200);
    const p0 = await R(() => ({ ...window.__railhead.state.player }));
    const sp = await scr(p0.x + 1.5, p0.z - 1);
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    await R(() => window.__railhead.step(1));
    const mode = await R(() => window.__railhead.state.player.mode);
    if (mode !== 'to') problems.push(`after leaving build mode a tap did not walk (player mode ${mode})`);

    // 6. The sim alone: a loop with a passing siding and two switches, then a yard move over it.
    const sim = await R(() => {
      const R = window.__railhead, S = R.newState(1866), out = { steps: [] }, SC = R.CFG.SCALE;
      const run = (cmd) => { const ev = R.simTick(S, [{ t: 'buildTrack', ...cmd }]); const e = ev.find(e => e.t === 'trackBuilt' || e.t === 'buildRefused'); out.steps.push(e); return e; };
      const T = () => S.track;
      // The M0 loop's places, grown with the world (D15: curve radii and the yard are x SC), as in check-m0.js.
      const h = v => Math.round(v * SC * 100), at = v => Math.round(v * SC * 100) / 100, near = (a, v) => Math.abs(a - at(v)) < 1e-6;
      const nodeAt = (x, z) => T().nodes.find(N => Math.hypot(N.x - at(x), N.z - at(z)) < 1e-6).id;
      run({ from: 'free', x: h(-20), z: h(30), h: 0, tx: h(20), tz: h(30) });              // bottom straight, 40u
      run({ from: 'node', n: nodeAt(20, 30), tx: h(20), tz: h(54) });                      // east half circle
      run({ from: 'node', n: nodeAt(20, 54), tx: h(-20), tz: h(54) });                     // top straight
      run({ from: 'node', n: nodeAt(-20, 54), tx: h(-20), tz: h(30) });                    // west half circle, joins the start
      const bottom = T().edges.find(E => E.k === 'S' && near(T().nodes[E.a].z, 30) && near(T().nodes[E.b].z, 30)).id;
      const swA = run({ from: 'switch', e: bottom, s: Math.round(3000 * SC), fwd: 1, side: 1, tx: h(0), tz: h(26) });    // switch A at x = -17 (x SC)
      const nr = R.trackNearest(T(), at(17), at(30));
      const Eb = T().edges[nr.e], fwdB = T().nodes[Eb.b].x > T().nodes[Eb.a].x ? -1 : 1;
      const sidingEnd = T().nodes.find(N => Math.abs(N.x) < 1e-6 && near(N.z, 26));
      const swB = run({ from: 'switch', e: nr.e, s: Math.round(nr.s * 1000), fwd: fwdB, side: -1, tx: h(0.2), tz: h(26.1) });  // switch B at x = 17, joins A's siding
      out.ok = out.steps.every(e => e && e.t === 'trackBuilt');
      out.errs = R.trackValidate(T());
      out.switches = T().switches.length;
      out.sidingEnd = !!sidingEnd;
      const ix = T().nodes.map(N => T().edges.filter(E => E.a === N.id || E.b === N.id).length);
      out.deadEnds = ix.filter((n, i) => n === 1 && T().nodes[i].z > 20 * SC).length;
      // The siding's middle: the straight that ends at (0, 26).
      const sid = T().edges.find(E => E.k === 'S' && E.cls === 'yard' && [E.a, E.b].some(n => Math.abs(T().nodes[n].x) < 1e-6 && near(T().nodes[n].z, 26)));
      out.sidingEdge = sid && sid.id;
      // Put No. 1 on the top straight of the new loop (test only) and send it to the siding.
      const top = T().edges.find(E => E.k === 'S' && near(T().nodes[E.a].z, 54) && near(T().nodes[E.b].z, 54));
      const tr = S.trains[0];
      tr.front = { e: top.id, s: 20 * SC, d: 1 }; tr.v = 0; tr.mode = 'idle'; tr.route = null;
      const ev0 = R.simTick(S, [{ t: 'trainSendTo', tr: 0, e: sid.id, s: Math.round(sid.len / 2 * 1000) }]);
      out.routeSet = ev0.some(e => e.t === 'routeSet');
      // D20: switches are manual: the route names the switches to throw, and the player throws them (here at once).
      for (const w of (ev0.find(e => e.t === 'routeSet') || { throws: [] }).throws) R.simTick(S, [{ t: 'throwSwitch', sw: w.sw }]);
      const swIds = [swA && swA.sw, swB && swB.sw];
      out.reversed = swIds.filter(i => i !== null && T().switches[i].state === 'R').length;
      let arrived = -1;
      for (let i = 0; i < 4000 && arrived < 0; i++) { const ev = R.simTick(S, []); if (ev.some(e => e.t === 'trainArrived')) arrived = i; }
      out.arrived = arrived;
      // The leading end: the front when running forward, the rear when backing (tender first).
      const lead = tr.m > 0 ? tr.front : R.trackWalk(T(), { e: tr.front.e, s: tr.front.s, d: -tr.front.d }, R.trainLength(tr)).pos;
      out.frontEdge = lead.e; out.m = tr.m;
      out.hashStable = R.stateHash(JSON.parse(JSON.stringify(S))) === R.stateHash(S);
      // Refusals: a switch under the train in a fresh yard, and a switch with no room.
      const S2 = R.newState(1866);
      const ref = R.simTick(S2, [{ t: 'buildTrack', from: 'switch', e: 2, s: Math.round(6000 * SC), fwd: 1, side: -1, tx: h(4), tz: h(11) }]);
      out.refusedTrain = (ref.find(e => e.t === 'buildRefused') || {}).why;
      const ref2 = R.simTick(S2, [{ t: 'buildTrack', from: 'switch', e: 0, s: Math.round(6000 * SC), fwd: 1, side: -1, tx: h(-10), tz: h(11) }]);
      out.refusedRoom = (ref2.find(e => e.t === 'buildRefused') || {}).why;
      // (D4) The real start: a switch on the platform track while No. 1 stands on it elsewhere is allowed (and No. 1
      // keeps its place when the track is split); one where No. 1 stands, or while it moves on that track, is refused.
      {
        const S3 = R.newState(1866, 'start'), T3 = S3.track, tr3 = S3.trains[0];
        const E = T3.edges.find(E => E.cls === 'yard' && E.k === 'S' && Math.abs(T3.nodes[E.b].x + 36 * SC) < 1e-6);
        const at = s => { const A = T3.nodes[E.a], B = T3.nodes[E.b]; return { x: A.x + (B.x - A.x) * s / E.len, z: A.z + (B.z - A.z) * s / E.len }; };
        const sw = (S, s, side) => { const p = at(s); return { t: 'buildTrack', from: 'switch', e: E.id, s: Math.round(s * 1000), fwd: 1, side, tx: Math.round(p.x * 100), tz: Math.round(p.z * 100) }; };
        const why = ev => (ev.find(e => e.t === 'buildRefused') || {}).why || null;
        out.d4 = { trainS: [tr3.front.s] };
        out.d4.under = why(R.simTick(JSON.parse(JSON.stringify(S3)), [sw(S3, tr3.front.s + 2 * SC, 1)]));
        const Sm = JSON.parse(JSON.stringify(S3)); Sm.trains[0].mode = 'run'; Sm.trains[0].v = 0.5 * SC;
        out.d4.moving = why(R.simTick(Sm, [sw(Sm, 45 * SC, 1)]));
        // East of the train (s 1.5: the train stands beyond the cut, on a new piece; D15: s 3 is now too close to the
        // plank crossing at the platform's east end) and west of it (s 45).
        for (const s0 of [1.5, 45]) {
          const s = s0 * SC;
          let res = null;
          for (const side of [1, -1]) {
            const Sx = JSON.parse(JSON.stringify(S3)), before = R.trainPoses(Sx.track, Sx.trains[0]).map(p => [p.x.toFixed(3), p.z.toFixed(3)].join()).join(';');
            const ev = R.simTick(Sx, [sw(Sx, s, side)]);
            if (!ev.some(e => e.t === 'trackBuilt')) { res = res || { why: why(ev) }; continue; }
            const after = R.trainPoses(Sx.track, Sx.trains[0]).map(p => [p.x.toFixed(3), p.z.toFixed(3)].join()).join(';');
            res = { built: true, side, same: before === after, edge: Sx.trains[0].front.e, oldEdge: E.id, errs: R.trackValidate(Sx.track).length,
              stable: R.stateHash(JSON.parse(JSON.stringify(Sx))) === R.stateHash(Sx) };
            for (let i = 0; i < 20; i++) R.simTick(Sx, []);
            res.stillSame = after === R.trainPoses(Sx.track, Sx.trains[0]).map(p => [p.x.toFixed(3), p.z.toFixed(3)].join()).join(';');
            break;
          }
          out.d4[s0 === 45 ? 'west' : 'east'] = res;
        }
      }
      return out;
    });
    if (!sim.ok) problems.push('sim loop: a build step was refused: ' + JSON.stringify(sim.steps));
    if (sim.errs.length) problems.push('sim loop: validator found problems: ' + sim.errs.join('; '));
    if (sim.switches !== 5) problems.push(`sim loop: expected 5 switches (3 yard + 2 new), found ${sim.switches}`);
    if (sim.deadEnds !== 0) problems.push(`sim loop: ${sim.deadEnds} loose track ends remain (loop and siding should be closed)`);
    if (!sim.routeSet) problems.push('sim loop: the train got no route to the siding');
    if (sim.reversed < 1) problems.push('sim loop: no new switch was set to the turn-off for the siding');
    if (sim.arrived < 0) problems.push('sim loop: the train did not arrive on the siding');
    if (sim.frontEdge !== sim.sidingEdge) problems.push(`sim loop: the train's leading end stopped on edge ${sim.frontEdge}, not the siding edge ${sim.sidingEdge}`);
    if (!sim.hashStable) problems.push('sim loop: the built track does not survive a save round trip');
    if (!/train/.test(sim.refusedTrain || '')) problems.push(`refusal: a switch under the train was not refused (${sim.refusedTrain})`);
    if (!new RegExp(`${5 * SC}u of straight`).test(sim.refusedRoom || '')) problems.push(`refusal: a switch with no room was not refused (${sim.refusedRoom})`);
    {
      const d = sim.d4;
      if (!/standing where the switch would go/.test(d.under || '')) problems.push('a switch where No. 1 stands on the platform track should be refused: ' + JSON.stringify(d));
      if (!/moving on that track/.test(d.moving || '')) problems.push('a switch on a track a train is moving on should be refused: ' + JSON.stringify(d));
      for (const k of ['east', 'west']) {
        const r = d[k];
        if (!r || !r.built || !r.same || !r.stillSame || !r.stable) problems.push(`a switch on the platform track clear of No. 1 (${k}) should be built, with No. 1 keeping its place: ` + JSON.stringify(d));
      }
      if (d.east && d.east.built && d.east.edge === d.east.oldEdge) problems.push('No. 1 should have moved onto the split-off piece of the platform track: ' + JSON.stringify(d.east));
      console.log(`  switch on the platform track with No. 1 home: under it "${d.under}", moving "${d.moving}", east ${JSON.stringify(d.east)}, west ${JSON.stringify(d.west)}`);
    }

    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    console.log(`  spur +${after1.len && after1.len.toFixed(2)}u; switch at ${after2.node && after2.node.x.toFixed(2)}; red: "${seen && seen.text}"; ` +
      `loop arrived after ${sim.arrived} ticks; draw calls in build mode ${busyCalls}`);
  } finally { await browser.close(); }
}

// 7. Without ?debug=1 (D10): planning works, laying track instantly does not.
async function checkPlanOnly(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  const { R, settle, lookAt, drag, label } = await tools(page);
  try {
    if (await R(() => window.__railhead.buildTool.instant)) problems.push('plan only: instant build is on without ?debug=1');
    await page.tap('#buildBtn'); await settle();
    const spur = await R(spurEnd), SC = spur.k;
    await lookAt(spur.x - 3 * SC, spur.z, 0.7);
    let seen = null;
    await drag(spur, { x: spur.x + spur.hx * 6 * SC, z: spur.z + spur.hz * 6 * SC }, async () => { seen = await label(); });
    if (!seen || seen.k !== 'ok') problems.push(`plan only: the plan preview was not green (${seen && seen.k}: ${seen && seen.text})`);
    if (!(await R(() => !!window.__railhead.buildTool.ghost))) problems.push('plan only: no ghost track was drawn');
    if (!(await page.isVisible('#buildConfirm'))) problems.push('plan only: Cancel did not appear after release');
    // D12: without ?debug=1 the button is Stake it (a construction job), never Lay track.
    if (!(await page.isVisible('#buildLay'))) problems.push('plan only: the Stake it button is not shown');
    else {
      const t = await page.textContent('#buildLay');
      if (!/^Stake it$/.test(t.trim())) problems.push(`plan only: the button says "${t}", not Stake it`);
    }
    const cb = await page.locator('#buildCancel').boundingBox();
    if (!cb || cb.width < 48 || cb.height < 48) problems.push('plan only: Cancel is smaller than 48 px');
    await page.screenshot({ path: screenshotPath('build-plan-only-portrait') });
    // A buildTrack command through the normal intake is refused and adds no track.
    const cmd = await R(() => window.__railhead.buildTool.cmd);
    const res = await R((cmd) => {
      const R = window.__railhead, e0 = R.state.track.edges.length, n0 = R.state.track.nodes.length, r0 = R.buildTool.refused.length;
      R.send(cmd); R.step(1);
      const ev = R.buildTool.refused.slice(r0);
      return { added: R.state.track.edges.length - e0, nodes: R.state.track.nodes.length - n0, ev, toast: document.getElementById('toast').textContent };
    }, cmd);
    if (!cmd) problems.push('plan only: the drag made no buildTrack command to test with');
    if (res.added || res.nodes) problems.push(`plan only: buildTrack added ${res.added} edges and ${res.nodes} nodes without ?debug=1`);
    if (res.ev.length !== 1 || res.ev[0].t !== 'buildRefused' || !/switched off/.test(res.ev[0].why)) problems.push(`plan only: buildTrack was not refused with a reason (${JSON.stringify(res.ev)})`);
    if (!/Cannot lay that track/.test(res.toast)) problems.push(`plan only: no refusal message was shown (toast "${res.toast}")`);
    await page.tap('#buildCancel'); await settle();
    if (await R(() => !!window.__railhead.buildTool.ghost)) problems.push('plan only: Cancel left the ghost shown');
    if (errors.length) problems.push('plan only: console errors: ' + errors.join(' | '));
    console.log(`  plan only: the button is Stake it, buildTrack refused: "${res.ev[0] && res.ev[0].why}"`);
  } finally { await browser.close(); }
}

if (require.main === module) {
  module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
}
