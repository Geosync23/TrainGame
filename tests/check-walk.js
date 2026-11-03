// Check: the walk animation (GAIT, drawing only) matches the ground speed, so planted feet do not slide.
// - The player walks and pushes the hand truck in a straight line; each frame the left sole (the point under the
//   ankle of the skinned model's foot bone, as drawn) is read. While that foot is on the ground (the first GAIT.F of
//   its cycle, the walk fully blended in) it must stay put: its drift over a stance is under 5% of the stance sweep
//   and under 0.01u, and the sole is within 0.01u of the ground.
// - The shin's end (the knee's IK) meets the foot: under 0.005u apart, every frame.
// - The knee bends in the swing (over 0.6 radians at its most) and the hips drop at heel strike.
// - Cycles walked times the stride equals the distance walked (within 5%).
// - Cadence (D20): 3.5 to 4.2 steps a real second at the walk at 1x; pushing takes shorter steps and leans into the
//   handles.
// - Stopping eases out: one real second later the legs, knees and arms are back at the standing pose (within 0.05
//   radians of a person who never walked, at the same moment of the standing weight shift).
// - Crowd walkers' planted feet (from the instance matrices and the knee angle in their spare slot, as the shader
//   bends them) do not slide either (turning on the spot aside).
// - Speeds (D20): walk 2.0, no running (a walk sent with run set walks), pushing a tool 1.8, travellers and crowd
//   1.8 u per game minute.
// - Poses (D20), measured on the drawn model: pushing, the hands out at the handles; the maul raised overhead in
//   the wind-up and its head on the ground in front at the strike, knees bent; throwing a switch, both hands on the
//   lever and pulled back; standing, the weight shifting from one foot to the other; carrying, the hands at the
//   crate's sides in front.
// Screenshots (portrait, zoom 1.5): walk-walk-1..3, walk-push-1..3; (zoom 2.5, side on, open grass) anim-walk-1..4,
// anim-push-1..4, anim-maul-1..6, anim-throw-1..5, anim-idle-1..4, anim-carry-1..3 and anim-carry-stand, under test-output/.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkWalk() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  const R = (fn, arg) => page.evaluate(fn, arg);
  try {
    const sp = await R(() => { const R = window.__railhead; return { walk: R.CFG.WALK, run: R.CFG.RUN, tool: R.CFG.TOOL_WALK, pax: R.pax.PAX.STEP / 100 / (R.CFG.TICK_GAME_S / 60), crowd: R.gait.CROWD_WALK, F: R.gait.GAIT.F }; });
    if (sp.walk !== 2.0 || sp.run !== undefined || sp.tool !== 1.8) problems.push('player speeds are ' + JSON.stringify(sp));
    if (Math.abs(sp.pax - 1.8) > 0.05) problems.push(`travellers walk ${sp.pax.toFixed(2)} u per game minute (expected about 1.8)`);
    if (Math.abs(sp.crowd - 1.8) > 0.05) problems.push(`the crowd walks ${sp.crowd} u per game minute (expected about 1.8)`);
    // No running: a walk command that still asks to run walks at the walk.
    const ran = await R(() => {
      const R = window.__railhead, S = JSON.parse(JSON.stringify(R.state)), P = S.player, x0 = P.x, z0 = P.z;
      R.simTick(S, [{ t: 'walkDir', a: 0, run: true }]);
      for (let i = 0; i < 9; i++) R.simTick(S, []);
      return { d: Math.hypot(P.x - x0, P.z - z0), min: 10 * R.CFG.TICK_GAME_S / 60, run: P.run };
    });
    const ranAt = ran.d / ran.min;
    console.log(`  a walk sent with run: true covers ${ranAt.toFixed(3)} u per game minute`);
    if (ranAt > 2.0 + 1e-6 || ran.run !== undefined) problems.push(`a walk asking to run moved at ${ranAt.toFixed(3)} u per game minute (run flag ${ran.run})`);

    // Walks the player's real model through the walk in steady 1/60 s frames at 1x (the test machine draws far
    // slower than a phone, so this does not wait for real frames): the gait advances by the distance moved, the
    // pose goes on the model (gaitApplyPlayer, as each drawn frame does) and the left sole is read in the world.
    const sample = (opts) => R(({ v, push, frames }) => {
      const R = window.__railhead, G = R.gait, pl = G.player, u = pl.userData, L = u.hipH;
      const g = G.gaitNew(), o = G.gaitPose(g, L, G.gaitPoseNew(), push), x0 = pl.position.x, z0 = pl.position.z, y0 = pl.position.y, r0 = pl.rotation.y;
      g.push = !!push;
      pl.rotation.y = 0;  // facing +z
      const kn = new THREE.Vector3(), an = new THREE.Vector3();
      const gameMin = 1 / 60 * R.CFG.TICKS_PER_REAL_S * R.CFG.TICK_GAME_S / 60, d = v * gameMin, out = [], w = new THREE.Vector3();
      let z = z0;
      for (let i = 0; i < frames; i++) {
        z += d; pl.position.z = z;
        G.gaitStep(g, d, gameMin, 1 / 60, L); G.gaitPose(g, L, o, push); G.gaitApplyPlayer(u, o);
        pl.updateMatrixWorld(true);
        u.soleL.getWorldPosition(w);
        // The shin's end (ks below the knee along the shin) against the ankle (the foot bone): the IK closes the leg.
        kn.set(0, -G.PLAYER_RIG.ks, 0); u.shinL.localToWorld(kn); u.footL.getWorldPosition(an);
        out.push({ fx: w.x, fy: w.y - y0, fz: w.z, pz: z, ph: g.ph, sw: g.sw, hipY: o.hipY, lean: o.lean, knee: o.kneeL, str: Math.max(o.strL, o.strR), gap: kn.distanceTo(an), stride: G.gaitStride(g, L) });
      }
      const cps = (v * R.CFG.TICKS_PER_REAL_S * R.CFG.TICK_GAME_S / 60) / G.gaitStride(g, L);
      // Then stop: one second of frames with no movement eases back to standing; compared with a person who never
      // walked, at the same moment of the standing weight shift.
      for (let i = 0; i < 60; i++) { G.gaitStep(g, 0, gameMin, 1 / 60, L); G.gaitPose(g, L, o, push); }
      const h = G.gaitNew(g.t), q = G.gaitPose(h, L, G.gaitPoseNew(), push);
      G.gaitLegs(o, G.PLAYER_RIG, 1); G.gaitLegs(q, G.PLAYER_RIG, 1);
      const still = Math.max(...['legL', 'legR', 'kneeL', 'kneeR', 'armL', 'armR', 'elbowL', 'elbowR'].map(k => Math.abs(o[k] - q[k])));
      G.gaitApplyPlayer(u, q);
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
          const sweep = a.stride * sp.F;
          worst = Math.max(worst, d); worstRel = Math.max(worstRel, d / sweep);
          lowest = Math.max(lowest, ...cur.map(s => Math.abs(s.fy)));
        }
        cur = null;
      };
      for (let i = 1; i < steady.length; i++) {
        const s = steady[i], f = sp.F;
        if (s.ph < f && steady[i - 1].ph < s.ph) (cur = cur || []).push(s); else flush();
      }
      flush();
      const a = steady[0], b = steady[steady.length - 1], dist = b.pz - a.pz;
      let cyc = 0; for (let i = 1; i < steady.length; i++) cyc += (steady[i].ph - steady[i - 1].ph + 1) % 1;
      const ratio = cyc * b.stride / dist;
      const bob = Math.min(...steady.map(s => s.hipY)), lean = b.lean, knee = Math.max(...steady.map(s => s.knee)), gap = Math.max(...res.out.map(s => s.gap)), str = Math.max(...steady.map(s => s.str));
      console.log(`  ${name}: ${stances} stances, planted foot drift worst ${worst.toFixed(4)}u (${(worstRel * 100).toFixed(1)}% of the sweep), sole within ${lowest.toFixed(4)}u of the ground; stride ${b.stride.toFixed(3)}u (${res.cps.toFixed(2)} cycles, ${(2 * res.cps).toFixed(2)} steps a real second at 1x), cycles x stride / distance ${ratio.toFixed(3)}; hip drop ${(-bob).toFixed(3)}u; knee up to ${knee.toFixed(2)} rad, leg stretch up to ${str.toFixed(3)}, shin to foot ${gap.toFixed(4)}u; lean ${lean.toFixed(3)}; one second after stopping the pose is ${res.still.toFixed(3)} from standing`);
      if (gap > 0.005) problems.push(`${name}: the shin's end is ${gap.toFixed(4)}u from the foot`);
      if (!(knee > 0.6)) problems.push(`${name}: the knee hardly bends in the swing (${knee.toFixed(2)} radians)`);
      if (!stances) problems.push(`${name}: no stance seen`);
      if (worst > 0.01 || worstRel > 0.05) problems.push(`${name}: the planted foot slides ${worst.toFixed(3)}u (${(worstRel * 100).toFixed(0)}% of its sweep)`);
      if (lowest > 0.01) problems.push(`${name}: the planted sole is ${lowest.toFixed(3)}u off the ground`);
      if (Math.abs(ratio - 1) > 0.05) problems.push(`${name}: stride does not match the distance walked (ratio ${ratio.toFixed(3)})`);
      if (!(bob < -0.005)) problems.push(`${name}: no hip drop at heel strike (${bob})`);
      if (res.still > 0.05) problems.push(`${name}: one second after stopping a limb is still at ${res.still.toFixed(3)} radians`);
      return { lean, stride: b.stride, steps: 2 * res.cps };
    };
    const walk = analyse('walk', await sample({ v: sp.walk, frames: 240 }));
    const push = analyse('push', await sample({ v: sp.tool, frames: 240, push: true }));
    if (walk && !(walk.steps >= 3.5 && walk.steps <= 4.2)) problems.push(`walking takes ${walk.steps.toFixed(2)} steps a real second (expected 3.5 to 4.2)`);
    if (walk && push && !(push.stride < walk.stride * 0.9)) problems.push(`pushing does not take shorter steps (${push.stride} vs ${walk.stride})`);
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
    await shot('push', sp.tool, true, [0, 0.17, 0.33]);

    // D20 poses, side on at zoom 2.5 on the same grass (screenshots anim-*): walking, pushing the hand truck,
    // carrying a crate, the maul blows, throwing a switch, standing. A paused frame draws the pose held by
    // posePreview (or the gait set by hand), and each pose is measured on the drawn model.
    const anim = async (name, setup, arg) => {
      await R(setup, arg);
      await page.waitForTimeout(500);
      await page.screenshot({ path: screenshotPath('anim-' + name) });
      return R(() => {
        const R = window.__railhead, u = R.gait.player.userData, pl = R.gait.player, m = R.gait.maul, v = new THREE.Vector3();
        pl.updateMatrixWorld(true);
        const loc = p => { const q = pl.worldToLocal(p.clone()); return { x: q.x, y: q.y, z: q.z }; };   // in the player's own frame (+z ahead)
        const hl = loc(u.handL.getWorldPosition(v)), hr = loc(u.handR.getWorldPosition(v));
        v.set(-0.04, -0.29 - Math.cos(0.6) * 0.58, Math.sin(0.6) * 0.58); m.localToWorld(v);
        return { hl, hr, maul: loc(v), kneeL: u.shinL.rotation.x, kneeR: u.shinR.rotation.x };
      });
    };
    await R(() => { const R = window.__railhead; R.camera.zoom = 2.5; R.state.time = 7 * 3600; });
    await page.waitForTimeout(900);
    const walkAt = ({ v, ph, tool }) => {
      const R = window.__railhead, P = R.state.player, g = R.gait.player.userData.gait;
      P.tool = tool ? 0 : null; R.gait.posePreview = null;
      g.v = v; g.sw = 1; g.ph = ph; g.push = !!tool;
    };
    for (const [i, ph] of [0, 0.125, 0.25, 0.375].entries()) await anim('walk-' + (i + 1), walkAt, { v: sp.walk, ph });
    const pushed = [];
    for (const [i, ph] of [0, 0.125, 0.25, 0.375].entries()) pushed.push(await anim('push-' + (i + 1), walkAt, { v: sp.tool, ph, tool: true }));
    // Pushing: both hands out ahead at the grips' height, the arms nearly straight (hands over 0.25u ahead of the hips).
    if (pushed.some(p => p.hl.z < 0.25 || p.hr.z < 0.25)) problems.push('pushing: the hands are not out at the handles: ' + JSON.stringify(pushed[0]));
    const blows = {};
    for (const [i, c] of [0.15, 0.45, 0.6, 0.66, 0.72, 0.85].entries()) blows[c] = await anim('maul-' + (i + 1), c => {
      const R = window.__railhead; R.state.player.tool = null; R.gait.player.userData.gait.sw = 0;
      R.gait.posePreview = o => { R.gait.WORK_POSE.blow(o, c); o.fLz += 0.07; o.fRz -= 0.08; o.fLx *= 1.35; o.fRx *= 1.35; R.gait.maul.visible = true; };
    }, c);
    // The maul: overhead at the top of the wind-up, its head on the ground in front at the strike, knees bent.
    console.log(`  maul head: top of the wind-up ${blows[0.6].maul.y.toFixed(2)}u up, at the strike ${blows[0.72].maul.y.toFixed(2)}u up and ${blows[0.72].maul.z.toFixed(2)}u ahead; knees ${blows[0.72].kneeL.toFixed(2)} and ${blows[0.72].kneeR.toFixed(2)} rad`);
    if (!(blows[0.6].maul.y > 1.0)) problems.push(`maul: not raised overhead in the wind-up (head ${blows[0.6].maul.y.toFixed(2)}u up)`);
    if (!(blows[0.72].maul.y < 0.2 && blows[0.72].maul.z > 0.3)) problems.push(`maul: the head does not come down in front at the strike (${JSON.stringify(blows[0.72].maul)})`);
    if (!(Math.min(blows[0.72].kneeL, blows[0.72].kneeR) > 0.2)) problems.push('maul: the knees do not bend into the strike');
    const throws = {};
    for (const [i, f] of [0.15, 0.35, 0.6, 0.8, 0.95].entries()) throws[f] = await anim('throw-' + (i + 1), f => {
      const R = window.__railhead; R.gait.player.userData.gait.sw = 0;
      R.gait.posePreview = o => { R.gait.throwPose(o, f, 1); R.gait.maul.visible = false; };
    }, f);
    // The throw: both hands together on the lever, pulled back towards the body.
    const gapH = p => Math.abs(p.hl.x - p.hr.x);
    if (!(throws[0.35].hl.z > throws[0.8].hl.z + 0.05)) problems.push(`throwing a switch: the hands are not pulled back (${throws[0.35].hl.z.toFixed(2)} then ${throws[0.8].hl.z.toFixed(2)}u ahead)`);
    if (!(gapH(throws[0.6]) < 0.3)) problems.push(`throwing a switch: the hands are ${gapH(throws[0.6]).toFixed(2)}u apart, not both on the lever`);
    const idles = [];
    for (const [i, t] of [0, 1.4, 2.8, 4.2].entries()) idles.push(await anim('idle-' + (i + 1), t => {
      const R = window.__railhead, g = R.gait.player.userData.gait; g.sw = 0; g.t = t; R.gait.posePreview = null;
    }, t));
    // Standing: the weight shifts from one foot to the other (one knee eases, then the other).
    const ease = idles.map(p => p.kneeL - p.kneeR);
    if (!(Math.max(...ease) > 0.05 && Math.min(...ease) < -0.05)) problems.push('standing: no weight shift between the feet (knee differences ' + ease.map(x => x.toFixed(2)).join(', ') + ')');
    // Carrying a crate by hand (a hardware crate put in the player's hands), walking and standing: drawn between the hands.
    const crate = await R(() => {
      const R = window.__railhead, S = R.state;
      const wb = { commodity: 'hardware', originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null };
      return R.cargo.itemCreate(S, wb, { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, []).id;
    });
    for (const [i, ph] of [0, 0.125, 0.25].entries()) await anim('carry-' + (i + 1), walkAt, { v: sp.walk, ph });
    const held = await anim('carry-stand', () => { window.__railhead.gait.player.userData.gait.sw = 0; });
    if (!(held.hl.z > 0.15 && held.hr.z > 0.15 && gapH(held) > 0.25)) problems.push('carrying: the hands do not hold the crate at its sides in front: ' + JSON.stringify(held));
    await R(id => { const R = window.__railhead; R.cargo.itemConsume(R.state, id, 'construction', null); R.cargo.redraw && R.cargo.redraw(); }, crate);
    await R(() => { window.__railhead.camera.zoom = 1.5; });
    await R(h => { const P = window.__railhead.state.player; P.tool = null; P.x = h.x; P.z = h.z; if (h.f !== undefined) P.f = h.f; }, home);

    // Crowd walkers: feet from the leg instance matrices (chunky kit, left leg, mesh 1), crowd updates in steady
    // 1/60 s frames. While a walker's left foot is in the middle of a stance (walk fully blended in) it must stay put.
    const crowd = await R(() => {
      const R = window.__railhead; R.setCrowd(60); R.setSpeed(1);
      const K = R.pax.kits.chunky, m = K.meshes[1], [kt, ks] = K.knee, ws = crowd.walkers.slice(0, crowd.n).filter(w => w.d.kit === 'chunky'), tr = [];
      for (let f = 0; f < 240; f++) {
        updateCrowd(1 / 60);
        const a = m.instanceMatrix.array;
        // The sole as the shader draws it: in the leg's frame (0, -kt, 0) + Rx(knee) (0, -ks, 0), the knee in the spare slot.
        tr.push(ws.map(w => {
          const o = w.ki * 16, g = w.g, k = a[o + 3], py = -kt - ks * Math.cos(k), pz = -ks * Math.sin(k);
          return [a[o + 12] + a[o + 4] * py + a[o + 8] * pz, a[o + 14] + a[o + 6] * py + a[o + 10] * pz, g.ph, g.sw];
        }));
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
        const p = crowd.tr[f][i], q = crowd.tr[f - 1][i], F = sp.F;
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
