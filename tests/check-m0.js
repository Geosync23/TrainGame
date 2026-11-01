// Check: the M0 acceptance criteria (design-doc section 22, "M0. Foundations and art kit"),
// adapted to what the one-page game has. Each part says which criterion it covers.
//
// 1. Build tool: a loop with a passing siding and two switches is laid, validated, and a train given
//    a yard move runs over it to the siding. The track is laid with buildTrack commands sent through
//    the running game (the same commands the Lay track button sends), not by finger: drawing a whole
//    loop with touch events is impractical in a check. check-build.js covers the touch gestures.
//    This part opens the page with ?debug=1, because the instant build is parked behind it (D10).
//    Also: new track is flat ground, laying track starts the delayed save, and track drawn into the
//    depot is refused (red).
// 2. A train given a yard move takes the correct route; changing a switch changes the path; a switch
//    under a train cannot be thrown.
// 3. Save, reload, same state hash. Two runs of the same seed and commands match after 3 game days.
// 4. 200 crowd characters of all three kits walk with no console errors (and keep off buildings and
//    hills). The test machine draws in software, so speed is judged by check-people.js's update time,
//    not by frames per second. The player cannot walk onto a hill.
// 5. The day-night cycle follows the section 17 keyframes (colours and sun heights as written; the
//    brightness values are the tuned ones, provisional for the designer), and GLOW_MAT glows at night.
// 6. Screenshots of the full scene at noon and at night, portrait and landscape: m0-<time>-<orientation>.png.
// The art-style criterion is the designer's sign-off at the M0 review; no check can do that.

const { openGame, waitReady, screenshotPath } = require('./browser');

// Section 17 keyframes as written in the design doc, and the hour each one is reached on day 1
// (spring: sunrise 06:00, sunset 19:00). Game time counts seconds from 05:00.
const KEYS = [
  { name: 'dawn', t: 1 * 3600, bg: 'e9b48e', sun: 'ffb27a', el: 12 },
  { name: 'noon', t: 7 * 3600, bg: 'b9d3d8', sun: 'fff4e0', el: 60 },
  { name: 'dusk', t: 14 * 3600, bg: 'd98a62', sun: 'ff8a52', el: 14 },
  { name: 'night', t: 18 * 3600, bg: '121828', sun: '7f95d8', el: 45 },
];

module.exports = async function checkM0() {
  const problems = [];
  const notes = [];
  // ?debug=1: the instant build (buildTrack through the page) is parked behind it (D10).
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&crowd=200&debug=1&world=yard' });
  try {
    // ---- 2 and 3 (second half): the sim on its own, from fresh states ----
    const sim = await page.evaluate(() => {
      const R = window.__railhead, out = {};
      const run = (S, cmds, max, until) => { const evs = []; for (let i = 0; i < max; i++) { const e = R.simTick(S, i === 0 ? cmds : []); evs.push(...e); if (until && until(S, e)) break; } return evs; };
      const leadOf = (S, tr) => tr.m > 0 ? tr.front : R.trackWalk(S.track, { e: tr.front.e, s: tr.front.s, d: -tr.front.d }, R.trainLength(tr)).pos;

      // Yard move to the middle of the passing siding.
      let S = R.newState(1);
      const T = S.track;
      const siding = T.edges.find(E => E.k === 'S' && E.cls === 'yard' && T.nodes[E.a].z > 17 && T.nodes[E.b].z > 17);
      const visited = [];
      const evs = run(S, [{ t: 'trainSendTo', tr: 0, e: siding.id, s: Math.round(siding.len / 2 * 1000) }], 20000, (st, e) => {
        const l = leadOf(st, st.trains[0]).e; if (visited[visited.length - 1] !== l) visited.push(l);
        return e.some(x => x.t === 'trainArrived');
      });
      out.routeSet = evs.some(e => e.t === 'routeSet');
      out.arrived = evs.some(e => e.t === 'trainArrived');
      const tr = S.trains[0], a = R.edgeAt(T, T.edges[leadOf(S, tr).e], leadOf(S, tr).s), b = R.edgeAt(T, siding, siding.len / 2);
      out.stopError = Math.hypot(a.x - b.x, a.z - b.z);
      // The correct route: every edge the leading end used joins the one before it, and it ends on the siding.
      const shares = (i, j) => { const A = T.edges[i], B = T.edges[j]; return [A.a, A.b].some(n => n === B.a || n === B.b); };
      out.pathJoined = visited.every((e, i) => i === 0 || shares(visited[i - 1], e));
      out.endsOnSiding = visited[visited.length - 1] === siding.id;
      // The way onto the siding is a switch's turn-off leg, and that switch was set to it.
      const turnOffs = T.switches.filter(W => visited.includes(W.reverse));
      out.turnOffUsed = turnOffs.length > 0;
      // A switch under the train cannot be thrown.
      const occ = Object.keys(R.occupiedSwitches(S)).map(Number);
      out.occupied = occ.length;
      if (occ.length) {
        const before = T.switches[occ[0]].state, e2 = R.simTick(S, [{ t: 'throwSwitch', sw: occ[0] }]);
        out.lockRefused = e2.some(x => x.t === 'switchLocked') && T.switches[occ[0]].state === before;
      }

      // Changing a switch changes the path: the same forward run with switch 3 straight, then turned.
      const pathWith = (state) => {
        const S2 = R.newState(1); S2.track.switches[2].state = state;
        const seen = new Set();
        run(S2, [{ t: 'trainRun', tr: 0, dir: 1 }], 1500, (st) => { seen.add(st.trains[0].front.e); return false; });
        return seen;
      };
      const pN = pathWith('N'), pR = pathWith('R');
      out.pathChanged = [...pR].some(e => !pN.has(e)) || [...pN].some(e => !pR.has(e));
      out.spurOnlyWhenTurned = !pN.has(S.track.switches[2].reverse) && pR.has(S.track.switches[2].reverse);

      // Same seed and commands, 3 game days, twice.
      const script = [
        { tick: 0, cmd: { t: 'trainSendTo', tr: 0, e: siding.id, s: Math.round(siding.len / 2 * 1000) } },
        { tick: 10, cmd: { t: 'walkTo', x: 500, z: 800 } },
        { tick: 2000, cmd: { t: 'trainRun', tr: 0, dir: 1 } },
        { tick: 2050, cmd: { t: 'useSwitch', sw: 1 } },
        { tick: 9000, cmd: { t: 'trainStop', tr: 0 } },
        { tick: 20000, cmd: { t: 'trainRun', tr: 0, dir: -1 } },
      ];
      const days = 3 * 86400 / 8;
      out.hashA = R.stateHash(R.simRun(R.newState(7), script, days));
      out.hashB = R.stateHash(R.simRun(R.newState(7), script, days));
      return out;
    });
    if (!sim.routeSet || !sim.arrived) problems.push(`yard move: route set ${sim.routeSet}, arrived ${sim.arrived}`);
    if (!(sim.stopError < 0.05)) problems.push(`yard move: stopped ${sim.stopError.toFixed(3)}u from the spot`);
    if (!sim.pathJoined || !sim.endsOnSiding || !sim.turnOffUsed) problems.push(`yard move: wrong route (joined ${sim.pathJoined}, ends on siding ${sim.endsOnSiding}, used a turn-off ${sim.turnOffUsed})`);
    if (!sim.occupied) problems.push('switch under a train: the train stood on no switch, so this could not be tested');
    else if (!sim.lockRefused) problems.push('switch under a train: it could be thrown');
    if (!sim.pathChanged || !sim.spurOnlyWhenTurned) problems.push('changing switch 3 did not change the train\'s path');
    if (sim.hashA !== sim.hashB) problems.push(`two runs of 3 game days differ (${sim.hashA} vs ${sim.hashB})`);

    // ---- 1: the loop with a passing siding and two switches, laid in the running game ----
    const built = await page.evaluate(() => {
      const R = window.__railhead, S = R.state, T = () => R.state.track, out = { steps: [] };
      const h = v => Math.round(v * 100);
      const nodeAt = (x, z) => T().nodes.find(N => Math.hypot(N.x - x, N.z - z) < 1e-6).id;
      const lay = (cmd) => { saveTimer = 0; R.send({ t: 'buildTrack', ...cmd }); R.step(1); out.steps.push(saveTimer !== 0); };
      const e0 = T().edges.length, sw0 = T().switches.length;
      lay({ from: 'free', x: h(-20), z: h(30), h: 0, tx: h(20), tz: h(30) });          // south straight, 40u
      lay({ from: 'node', n: nodeAt(20, 30), tx: h(20), tz: h(54) });                  // east half circle
      lay({ from: 'node', n: nodeAt(20, 54), tx: h(-20), tz: h(54) });                 // north straight
      lay({ from: 'node', n: nodeAt(-20, 54), tx: h(-20), tz: h(30) });                // west half circle, closes the loop
      const bottom = T().edges.find(E => E.id >= e0 && E.k === 'S' && T().nodes[E.a].z === 30 && T().nodes[E.b].z === 30).id;
      lay({ from: 'switch', e: bottom, s: 3000, fwd: 1, side: 1, tx: h(0), tz: h(26) }); // switch A, siding towards (0, 26)
      const nr = R.trackNearest(T(), 17, 30), Eb = T().edges[nr.e], fwdB = T().nodes[Eb.b].x > T().nodes[Eb.a].x ? -1 : 1;
      lay({ from: 'switch', e: nr.e, s: Math.round(nr.s * 1000), fwd: fwdB, side: -1, tx: h(0.2), tz: h(26.1) }); // switch B joins the siding
      out.saveStarted = out.steps.every(Boolean);
      out.newSwitches = T().switches.length - sw0;
      out.errs = R.trackValidate(T());
      const ends = T().nodes.filter(N => N.z > 20 && T().edges.filter(E => E.a === N.id || E.b === N.id).length === 1);
      out.looseEnds = ends.length;
      // The ground under every new edge was rebuilt flat.
      let bumps = 0;
      for (const E of T().edges.slice(e0)) for (let i = 0; i <= 20; i++) { const p = R.edgeAt(T(), E, E.len * i / 20); if (terrainHeight(p.x, p.z) !== 0) bumps++; }
      out.bumps = bumps;
      // A yard move over the new loop: No. 1 is put on the north straight (test only) and sent to the siding.
      const sid = T().edges.find(E => E.id >= e0 && E.k === 'S' && E.cls === 'yard' && [E.a, E.b].some(n => Math.abs(T().nodes[n].x) < 1e-6 && Math.abs(T().nodes[n].z - 26) < 1e-6));
      const top = T().edges.find(E => E.id >= e0 && E.k === 'S' && T().nodes[E.a].z === 54 && T().nodes[E.b].z === 54);
      const tr = S.trains[0];
      tr.front = { e: top.id, s: 20, d: 1 }; tr.v = 0; tr.mode = 'idle'; tr.route = null;
      R.send({ t: 'trainSendTo', tr: 0, e: sid.id, s: Math.round(sid.len / 2 * 1000) });
      let arrived = false;
      for (let i = 0; i < 4000 && !arrived; i++) { R.step(1); arrived = tr.mode === 'idle' && tr.status === 'Arrived'; }
      const lead = tr.m > 0 ? tr.front : R.trackWalk(T(), { e: tr.front.e, s: tr.front.s, d: -tr.front.d }, R.trainLength(tr)).pos;
      out.arrived = arrived; out.onSiding = lead.e === sid.id;
      out.turnedOff = T().switches.slice(sw0).some(W => W.state === 'R');
      // Track drawn from open ground (north, inside the oval) into the depot shows red.
      const dep = buildingFootprints().find(f => f.kind === 'depot');
      const plan = buildPlan(S, { t: 'buildTrack', from: 'free', x: h(dep.x), z: h(dep.z - 8), h: 90000, tx: h(dep.x), tz: h(dep.z - 1) });
      out.depotWhy = plan.ok ? null : plan.why;
      return out;
    });
    if (built.newSwitches !== 2) problems.push(`build loop: ${built.newSwitches} new switches, expected 2`);
    if (built.errs.length) problems.push('build loop: the validator found problems: ' + built.errs.join('; '));
    if (built.looseEnds) problems.push(`build loop: ${built.looseEnds} loose track ends (the loop and siding should be closed)`);
    if (built.bumps) problems.push(`build loop: the ground is not flat under the new track at ${built.bumps} points`);
    if (!built.saveStarted) problems.push('build loop: laying track did not start the delayed save');
    if (!built.arrived || !built.onSiding || !built.turnedOff) problems.push(`build loop: the yard move did not end on the new siding (arrived ${built.arrived}, on siding ${built.onSiding}, switch turned ${built.turnedOff})`);
    if (!/Runs into the depot/.test(built.depotWhy || '')) problems.push(`build tool: track into the depot was not red (${built.depotWhy})`);
    notes.push(`loop laid with 2 switches; depot: "${built.depotWhy}"`);

    // ---- 3: save, reload, same hash (with the new loop in the save) ----
    const before = await page.evaluate(async () => ({ ok: await window.__railhead.saveGame(), h: window.__railhead.hash() }));
    if (!before.ok) problems.push('save: writing to the browser failed');
    await page.reload();
    await waitReady(page);
    const afterH = await page.evaluate(() => window.__railhead.hash());
    if (afterH !== before.h) problems.push(`save: after reload the hash was ${afterH}, not ${before.h}`);

    // ---- 4: the crowd, and the player kept off the hills ----
    const crowd = await page.evaluate(async () => {
      const R = window.__railhead, info = R.crowdInfo(), out = { count: info.count, kits: info.kits };
      const fps = buildingFootprints();
      const inside = (x, z) => fps.some(f => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z; return Math.abs(dx * c - dz * s) < f.w / 2 && Math.abs(dx * s + dz * c) < f.d / 2; });
      const p0 = info.pos;
      R.setSpeed(8);
      let inB = 0, onHill = 0;
      for (let k = 0; k < 10; k++) {
        await new Promise(r => setTimeout(r, 150));
        for (const [x, z] of R.crowdInfo().pos) { if (inside(x, z)) inB++; if (terrainHeight(x, z) !== 0) onHill++; }
      }
      R.setSpeed(0);
      const p1 = R.crowdInfo().pos;
      out.moved = p0.filter((p, i) => Math.hypot(p[0] - p1[i][0], p[1] - p1[i][1]) > 0.05).length;
      out.inBuildings = inB; out.onHills = onHill;
      // The player walks towards the nearest hill and is stopped at its foot.
      const P = R.state.player;
      let best = null;
      for (let x = -60; x <= 60; x += 1) for (let z = -60; z <= 60; z += 1) if (terrainHeight(x, z) > 1) { const d = Math.hypot(x - P.x, z - P.z); if (!best || d < best.d) best = { x, z, d }; }
      out.hill = best;
      R.send({ t: 'walkTo', x: Math.round(best.x * 100), z: Math.round(best.z * 100) });
      let maxH = 0;
      for (let i = 0; i < 3000; i++) { R.step(1); maxH = Math.max(maxH, terrainHeight(P.x, P.z)); if (P.mode === 'idle') break; }
      out.playerMaxH = maxH; out.playerLeft = Math.hypot(P.x - best.x, P.z - best.z);
      return out;
    });
    if (crowd.count !== 200) problems.push(`crowd: ${crowd.count} walkers, expected 200`);
    for (const k of ['chunky', 'lanky', 'stocky']) if (!(crowd.kits[k] > 0)) problems.push(`crowd: no ${k} walkers`);
    if (crowd.moved < 100) problems.push(`crowd: only ${crowd.moved} of 200 walkers moved`);
    if (crowd.inBuildings) problems.push(`crowd: walkers inside station buildings ${crowd.inBuildings} times`);
    if (crowd.onHills) problems.push(`crowd: walkers on hills ${crowd.onHills} times`);
    if (crowd.playerMaxH !== 0) problems.push(`player: walked onto a hill (height ${crowd.playerMaxH.toFixed(2)}u)`);
    notes.push(`crowd: ${crowd.moved} of 200 moved; player stopped ${crowd.playerLeft.toFixed(1)}u short of the hill`);

    // ---- 5: day and night keyframes, GLOW_MAT at night ----
    const light = await page.evaluate(async (KEYS) => {
      const out = [];
      for (const K of KEYS) {
        window.__railhead.state.time = K.t;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        out.push({
          name: K.name, bg: scene.background.getHexString(), sun: sun.color.getHexString(),
          el: Math.asin(sunDir.y) * 180 / Math.PI, glow: GLOW_MAT.emissiveIntensity, sunI: sun.intensity, hemiI: hemi.intensity,
          want: { sunI: DAY.KEYS[K.name].sunI, hemiI: DAY.KEYS[K.name].skyI },
        });
      }
      return out;
    }, KEYS);
    for (const L of light) {
      const K = KEYS.find(k => k.name === L.name);
      if (L.bg !== K.bg) problems.push(`${L.name}: background #${L.bg}, keyframe #${K.bg}`);
      if (L.sun !== K.sun) problems.push(`${L.name}: sun colour #${L.sun}, keyframe #${K.sun}`);
      if (Math.abs(L.el - K.el) > 0.5) problems.push(`${L.name}: sun height ${L.el.toFixed(1)} degrees, keyframe ${K.el}`);
      if (Math.abs(L.sunI - L.want.sunI) > 1e-6 || Math.abs(L.hemiI - L.want.hemiI) > 1e-6) problems.push(`${L.name}: brightness ${L.sunI}/${L.hemiI}, tuned keyframe ${L.want.sunI}/${L.want.hemiI}`);
    }
    const noonL = light.find(l => l.name === 'noon'), nightL = light.find(l => l.name === 'night');
    if (!(noonL.glow === 0 && nightL.glow > 0.8)) problems.push(`GLOW_MAT: glow ${noonL.glow} at noon, ${nightL.glow} at night`);
    if (errors.length) problems.push('portrait: console errors: ' + errors.join(' | '));
  } finally {
    await browser.close();
  }

  // ---- 6: screenshots of the full scene, noon and night, both orientations ----
  for (const orientation of ['portrait', 'landscape']) {
    const g = await openGame(orientation, { query: '?paused&crowd=200&world=yard' });
    try {
      const calls = [];
      for (const [name, t] of [['noon', 7 * 3600], ['night', 18 * 3600]]) {
        const dc = await g.page.evaluate((t) => new Promise(res => {
          const R = window.__railhead, P = R.state.player;
          R.state.time = t; R.camera.zoom = 0.8; R.camera.ox = -2 - P.x; R.camera.oz = 8 - P.z;
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => res(R.drawCalls))));
        }), t);
        await g.page.waitForTimeout(200);
        await g.page.screenshot({ path: screenshotPath(`m0-${name}-${orientation}`) });
        calls.push(`${name} ${dc}`);
        if (dc >= 100) problems.push(`${orientation} ${name}: ${dc} draw calls (budget under 100)`);
      }
      notes.push(`${orientation} draw calls with 200 walkers: ${calls.join(', ')}`);
      if (g.errors.length) problems.push(`${orientation}: console errors: ` + g.errors.join(' | '));
    } finally { await g.browser.close(); }
  }
  for (const n of notes) console.log('  ' + n);
  return problems;
};

if (require.main === module) {
  module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
}
