// Check: the walk animation (GAIT, drawing only) matches the ground speed, so planted feet do not slide.
// - The player walks, runs and pushes the hand truck in a straight line; each frame the left foot's sole (the
//   leg's tip, as drawn) is read. While that foot is on the ground (the first part of its cycle, the walk fully
//   blended in) it must stay put: its drift over a stance is under 25% of the stance sweep and under 0.04u.
// - Cycles walked times the stride equals the distance walked (within 10%).
// - The hips drop at heel strike; running and pushing lean forward more than walking.
// - Stopping eases out: the legs and arms are back to standing (under 0.05 radians) one real second later.
// - Crowd walkers' planted feet (from the instance matrices) do not slide either (turning on the spot aside).
// - Speeds: walk 2.0, run 3.2, pushing a tool 1.6, travellers about 1.8 u per game minute.
// Screenshots (portrait, zoom 1.5): walk-walk-1..3, walk-run-1..3, walk-push-1..3 under test-output/.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkWalk() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  const R = (fn, arg) => page.evaluate(fn, arg);
  try {
    const sp = await R(() => { const R = window.__railhead; return { walk: R.CFG.WALK, run: R.CFG.RUN, tool: R.CFG.TOOL_WALK, pax: R.pax.PAX.STEP / 100 / (R.CFG.TICK_GAME_S / 60) }; });
    if (sp.walk !== 2.0 || sp.run !== 3.2 || sp.tool !== 1.6) problems.push('player speeds are ' + JSON.stringify(sp));
    if (Math.abs(sp.pax - 1.8) > 0.05) problems.push(`travellers walk ${sp.pax.toFixed(2)} u per game minute (expected about 1.8)`);

    // Walks the player's real model through the walk in steady 1/60 s frames at 1x (the test machine draws far
    // slower than a phone, so this does not wait for real frames): the gait advances by the distance moved, the
    // pose goes on the model (gaitApplyPlayer, as each drawn frame does) and the left sole is read in the world.
    const sample = (opts) => R(({ v, push, frames }) => {
      const R = window.__railhead, G = R.gait, pl = G.player, u = pl.userData, L = u.hipH;
      const g = G.gaitNew(), o = G.gaitPose(g, L, {}, push), x0 = pl.position.x, z0 = pl.position.z, y0 = pl.position.y, r0 = pl.rotation.y;
      pl.rotation.y = 0;  // facing +z
      const gameMin = 1 / 60 * R.CFG.TICKS_PER_REAL_S * R.CFG.TICK_GAME_S / 60, d = v * gameMin, out = [], w = new THREE.Vector3();
      let z = z0;
      for (let i = 0; i < frames; i++) {
        z += d; pl.position.z = z;
        G.gaitStep(g, d, gameMin, 1 / 60, L); G.gaitPose(g, L, o, push); G.gaitApplyPlayer(u, o);
        pl.updateMatrixWorld(true);
        w.set(0, -0.34, 0); u.legL.localToWorld(w);
        out.push({ fx: w.x, fy: w.y - y0, fz: w.z, pz: z, ph: g.ph, sw: g.sw, run: g.run, amp: g.amp, hipY: o.hipY, lean: o.lean, stride: G.gaitStride(g, L) });
      }
      const cps = (v * R.CFG.TICKS_PER_REAL_S * R.CFG.TICK_GAME_S / 60) / G.gaitStride(g, L);
      // Then stop: one second of frames with no movement eases back to standing.
      for (let i = 0; i < 60; i++) { G.gaitStep(g, 0, gameMin, 1 / 60, L); G.gaitPose(g, L, o, push); }
      const still = Math.max(Math.abs(o.legL), Math.abs(o.legR), Math.abs(o.armL), Math.abs(o.armR));
      pl.position.set(x0, y0, z0); pl.rotation.y = r0;
      return { out, still, cps };
    }, opts);
    // Planted-foot drift: split into stances (left foot's cycle point below f), skipping the blend-in.
    const analyse = (name, res) => {
      const steady = res.out.filter(s => s.sw > 0.97);
      if (steady.length < 20) { problems.push(`${name}: the walk never blended fully in (${steady.length} steady frames)`); return null; }
      let worst = 0, worstRel = 0, stances = 0, cur = null, lowest = 0;
      const flush = () => {
        if (cur && cur.length >= 3) {
          stances++;
          const a = cur[0], d = Math.max(...cur.map(s => Math.hypot(s.fx - a.fx, s.fz - a.fz)));
          const sweep = 2 * 0.34 * Math.sin(a.amp * a.sw);
          worst = Math.max(worst, d); worstRel = Math.max(worstRel, d / sweep);
          lowest = Math.max(lowest, ...cur.map(s => Math.abs(s.fy)));
        }
        cur = null;
      };
      for (let i = 1; i < steady.length; i++) {
        const s = steady[i], f = 0.5 + (0.36 - 0.5) * s.run;
        if (s.ph < f && steady[i - 1].ph < s.ph) (cur = cur || []).push(s); else flush();
      }
      flush();
      const a = steady[0], b = steady[steady.length - 1], dist = b.pz - a.pz;
      let cyc = 0; for (let i = 1; i < steady.length; i++) cyc += (steady[i].ph - steady[i - 1].ph + 1) % 1;
      const ratio = cyc * b.stride / dist;
      const bob = Math.min(...steady.map(s => s.hipY)), lean = b.lean;
      console.log(`  ${name}: ${stances} stances, planted foot drift worst ${worst.toFixed(4)}u (${(worstRel * 100).toFixed(1)}% of the sweep), sole within ${lowest.toFixed(4)}u of the ground; stride ${b.stride.toFixed(3)}u (${res.cps.toFixed(2)} cycles a second at 1x), cycles x stride / distance ${ratio.toFixed(3)}; hip drop ${(-bob).toFixed(3)}u; lean ${lean.toFixed(3)}; one second after stopping the largest limb angle is ${res.still.toFixed(3)}`);
      if (!stances) problems.push(`${name}: no stance seen`);
      if (worst > 0.01 || worstRel > 0.05) problems.push(`${name}: the planted foot slides ${worst.toFixed(3)}u (${(worstRel * 100).toFixed(0)}% of its sweep)`);
      if (lowest > 0.01) problems.push(`${name}: the planted sole is ${lowest.toFixed(3)}u off the ground`);
      if (Math.abs(ratio - 1) > 0.05) problems.push(`${name}: stride does not match the distance walked (ratio ${ratio.toFixed(3)})`);
      if (!(bob < -0.005)) problems.push(`${name}: no hip drop at heel strike (${bob})`);
      if (res.still > 0.05) problems.push(`${name}: one second after stopping a limb is still at ${res.still.toFixed(3)} radians`);
      return { lean, stride: b.stride };
    };
    const walk = analyse('walk', await sample({ v: sp.walk, frames: 240 }));
    const run = analyse('run', await sample({ v: sp.run, frames: 240 }));
    const push = analyse('push', await sample({ v: sp.tool, frames: 240, push: true }));
    if (walk && run && !(run.lean > walk.lean)) problems.push(`running does not lean more than walking (${run.lean} vs ${walk.lean})`);
    if (walk && push && !(push.lean > walk.lean + 0.1)) problems.push(`pushing does not lean into the handles (${push.lean} vs ${walk.lean})`);

    // Screenshots: paused, the player's gait set to points of its cycle (a paused frame draws that pose).
    const shot = async (name, v, push, phs) => {
      for (let i = 0; i < phs.length; i++) {
        await R(({ v, push, ph }) => {
          const R = window.__railhead, P = R.state.player, u = R.gait.player.userData, g = u.gait;
          R.setSpeed(0); R.camera.zoom = 1.5; P.tool = push ? 0 : null;
          g.v = v; g.sw = 1; g.ph = ph; R.gait.gaitStep(g, 0.001, 1e-3, 0, u.hipH); g.sw = 1; g.ph = ph;
        }, { v, push, ph: phs[i] });
        await page.waitForTimeout(700);
        await page.screenshot({ path: screenshotPath(`walk-${name}-${i + 1}`) });
      }
    };
    // On open grass near the start (8u x 8u of plain walk-grid grass), so no roof or track is in the way, facing
    // across the screen (side on, where the gait reads best).
    const home = await R(() => {
      const R = window.__railhead, P = R.state.player, W = R.world.walk, G = R.world.walkGrid(R.state.track);
      const ok = (x, z) => G.cost[Math.floor((z - W.Z0) / W.CELL) * W.N + Math.floor((x - W.X0) / W.CELL)] === W.GRASS;
      const home = { x: P.x, z: P.z };
      for (let r = 2; r < 30; r++) for (let k = 0; k < 16; k++) {
        const x = P.x + Math.cos(k / 8 * Math.PI) * r, z = P.z + Math.sin(k / 8 * Math.PI) * r;
        let all = true;
        for (let a = -4; a <= 4; a += 0.5) for (let b = -4; b <= 4; b += 0.5) if (!ok(x + a, z + b)) all = false;
        if (all) {
          P.x = x; P.z = z;
          const o = R.toScreen(x, z, 0.5); let best = 0, bf = 0;
          for (let j = 0; j < 16; j++) { const f = j / 8 * Math.PI, q = R.toScreen(x + Math.sin(f), z + Math.cos(f), 0.5), sx = Math.abs(q.x - o.x) / Math.hypot(q.x - o.x, q.y - o.y); if (sx > best + 1e-6) { best = sx; bf = f; } }
          home.f = P.f; P.f = bf; return home;
        }
      }
      return home;
    });
    await shot('walk', sp.walk, false, [0, 0.17, 0.33]);
    await shot('run', sp.run, false, [0, 0.17, 0.33]);
    await shot('push', sp.tool, true, [0, 0.17, 0.33]);
    await R(h => { const P = window.__railhead.state.player; P.tool = null; P.x = h.x; P.z = h.z; if (h.f !== undefined) P.f = h.f; }, home);

    // Crowd walkers: feet from the leg instance matrices (chunky kit, left leg, mesh 1), crowd updates in steady
    // 1/60 s frames. While a walker's left foot is in the middle of a stance (walk fully blended in) it must stay put.
    const crowd = await R(() => {
      const R = window.__railhead; R.setCrowd(60); R.setSpeed(1);
      const K = R.pax.kits.chunky, m = K.meshes[1], H = K.legPiv[1], ws = crowd.walkers.slice(0, crowd.n).filter(w => w.d.kit === 'chunky'), tr = [];
      for (let f = 0; f < 240; f++) {
        updateCrowd(1 / 60);
        const a = m.instanceMatrix.array;
        tr.push(ws.map(w => { const o = w.ki * 16, g = w.g; return [a[o + 12] - H * a[o + 4], a[o + 14] - H * a[o + 6], g.ph, g.sw, g.run]; }));
      }
      R.setSpeed(0);
      return { tr, n: ws.length };
    });
    let stances = 0, worst = 0, worstRel = 0;
    for (let i = 0; i < crowd.n; i++) {
      let cur = null;
      const flush = () => {
        if (cur && cur.length >= 3) { stances++; const d = Math.max(...cur.map(p => Math.hypot(p[0] - cur[0][0], p[1] - cur[0][1]))); worst = Math.max(worst, d); }
        cur = null;
      };
      for (let f = 1; f < crowd.tr.length; f++) {
        const p = crowd.tr[f][i], q = crowd.tr[f - 1][i], F = 0.5 + (0.36 - 0.5) * p[4];
        if (p[3] > 0.97 && p[2] < F && q[2] < p[2]) (cur = cur || []).push(p); else flush();
      }
      flush();
    }
    console.log(`  crowd: ${crowd.n} chunky walkers, ${stances} stances seen, planted foot drift worst ${worst.toFixed(4)}u`);
    if (stances < 20) problems.push(`crowd: too few stances seen (${stances})`);
    if (worst > 0.02) problems.push(`crowd: a planted foot slides ${worst.toFixed(3)}u`);
    if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
  return problems;
};
