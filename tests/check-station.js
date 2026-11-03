// Check: the station's look (D19: "The platform should be made of planks" and "more visual detail at the station").
// - The platforms (the hub's and Willow Ford's) and the freight dock are drawn as separate boards: the recipe counts its
//   boards, and a line of rays straight down across each deck meets board tops at the deck top (0.3u) with thin gaps
//   between them, where the under-structure shows a little lower (no two surfaces on each other).
// - Each platform has plank steps at both ends, on the track-side half: two treads going down in thirds, the feet follow
//   them smoothly from the deck top to the ground, and the middle of each end (where travellers leave) keeps its short step.
// - The station props (footprints with prop: true) stand at both stations, on their platforms' back part or on the ground
//   behind, never on the track-side 3u of a platform; they keep clear of every use spot, the booths (strip and door),
//   the ticket queue's places, the order boards, the tool parking spots and the platform exits, and every use spot, exit
//   and booth door can still be walked to from the platform.
// - Everything is still in the same meshes (the buildings, glow, canopy and depot-shell meshes: 4 in the real start).
// - Screenshots at phone size, portrait and landscape, start zoom 1.5 and 3, day and dusk, the hub and Willow Ford
//   (test-output/station-*.png); draw calls and triangles (both passes) are reported, the busiest with 200 walkers.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkStation() {
  const problems = [], P = s => problems.push(s), report = [];
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    try {
      if (orientation === 'portrait') {
        const out = await R(() => {
          const R = window.__railhead, B = R.buildings, W = R.world, S = R.state, out = [], top = B.platformTop;
          const fps = B.footprints(), byId = id => fps.find(f => f.id === id);
          const ray = (x, z) => { const h = new THREE.Raycaster(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0)).intersectObject(B.meshes[0], false)[0]; return h ? h.point.y : null; };
          const local = (f, lx, lz) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw); return [f.x + lx * c + lz * s, f.z - lx * s + lz * c]; };
          // 1. Boards.
          for (const [id, min] of [['platform', 150], ['wfplatform', 120], ['freightdock', 0]]) {
            const f = byId(id);
            if (!f) { out.push(`no ${id}`); continue; }
            const bid = id === 'freightdock' ? fps.find(g => g.kind === 'freightshed').id : id, n = B.planks[bid] || 0;
            if (n < Math.max(min, 10)) out.push(`${id}: ${n} boards drawn, expected at least ${Math.max(min, 10)}`);
            // Rays across the deck's depth (and along its length), clear of props, lamps and the bench: board tops and gaps.
            for (const ax of ['z', 'x']) {
              let onTop = 0, inGap = 0, other = 0, changes = 0, last = null;
              const n2 = 400;
              for (let i = 0; i <= n2; i++) {
                const t = i / n2, [x, z] = ax === 'z' ? local(f, f.w / 2 - 1.0, (t - 0.5) * (f.d - 0.1)) : local(f, (t - 0.5) * (f.w - 1.4), f.d * 0.05);
                const y = ray(x, z), k = y === null ? 'none' : Math.abs(y - top) < 1e-3 ? 'top' : (y < top - 0.02 && y > top - 0.06) ? 'gap' : 'other';
                if (k === 'top') onTop++; else if (k === 'gap') inGap++; else other++;
                if (last && k !== last) changes++;
                last = k;
              }
              const few = ax === 'x' && id === 'freightdock';   // the dock is short: only a joint or two along it
              if (onTop < 0.8 * n2 || inGap < (few ? 1 : 3) || changes < (few ? 2 : 6) || other > 0.05 * n2)
                out.push(`${id}: rays along ${ax} met ${onTop} board tops, ${inGap} gaps, ${other} other, ${changes} changes (expected boards with thin gaps)`);
            }
          }
          // 2. Steps at the platforms' ends.
          const steps = B.steps(), F = R.feet;
          for (const id of ['platform', 'wfplatform']) {
            const f = byId(id), mine = steps.filter(s => Math.abs((s.x - f.x) * Math.cos(f.yaw) - (s.z - f.z) * Math.sin(f.yaw)) > f.w / 2 - 0.01 && Math.hypot(s.x - f.x, s.z - f.z) < f.w);
            if (mine.length !== 2) { out.push(`${id}: ${mine.length} flights of end steps, expected 2`); continue; }
            for (const s of mine) {
              // Treads: rays down at each tread's middle meet it at 2/3 and 1/3 of the deck top.
              for (const [a, want] of [[0.15, top * 2 / 3], [0.45, top / 3]]) {
                const y = ray(s.x + s.ux * a, s.z + s.uz * a);
                if (y === null || Math.abs(y - want) > 0.02) out.push(`${id}: the end step tread at ${a}u out is at ${y === null ? 'nothing' : y.toFixed(3)}, expected ${want.toFixed(2)}`);
              }
              // The feet: smooth from the deck top down to the ground over the steps.
              const prof = [];
              for (let a = -0.3; a <= 1.0 + 1e-9; a += 0.02) prof.push(F.bldStandY(s.x + s.ux * a, s.z + s.uz * a));
              let jump = 0;
              for (let i = 1; i < prof.length; i++) jump = Math.max(jump, Math.abs(prof[i] - prof[i - 1]));
              const mono = prof.every((v, i) => i === 0 || v <= prof[i - 1] + 1e-9);
              if (Math.abs(prof[0] - top) > 0.01 || Math.abs(prof[prof.length - 1]) > 0.01 || !mono || jump > 0.03) out.push(`${id}: the feet down the end steps are not smooth: ${prof.map(v => v.toFixed(2)).join(' ')}`);
              // Track-side half only: the end's middle line is clear of them.
              const off = Math.abs((f.x - s.x) * s.vx + (f.z - s.z) * s.vz);
              if (off < s.half + 0.4) out.push(`${id}: the end steps reach the middle of the platform's end (${off.toFixed(2)}u from it, ${s.half}u half width)`);
            }
          }
          // 3. Props.
          const props = fps.filter(f => f.prop), K = R.pax.paxStations(), spots = W.buildingSpots(), booths = R.board.booths();
          const dist = (f, x, z, grow) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z; return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - f.w / 2 - (grow || 0)), Math.max(0, Math.abs(dx * s + dz * c) - f.d / 2 - (grow || 0))); };
          const rectGap = (a, b) => Math.hypot(Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2), Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2));
          if (props.length < 6) out.push(`only ${props.length} station props`);
          for (const st of K) if (!props.some(p => Math.hypot(p.x - st.plat.x, p.z - st.plat.z) < st.plat.w)) out.push(`no props at ${st.id}`);
          const G = W.walkGrid(S.track), Wk = W.walk, cell = (x, z) => Math.floor((z - Wk.Z0) / Wk.CELL) * Wk.N + Math.floor((x - Wk.X0) / Wk.CELL);
          const tt = R.tt.ttStations(S);
          for (const p of props) {
            for (const st of K) {
              const pf = st.plat;
              if (dist(pf, p.x, p.z) === 0) {   // on this platform: not on its track-side 3u
                const lz = (p.x - pf.x) * Math.sin(pf.yaw) + (p.z - pf.z) * Math.cos(pf.yaw);
                if (lz + p.d / 2 > pf.d / 2 - 3) out.push(`${p.id} stands within 3u of ${pf.id}'s track-side edge`);
              }
              for (const e of st.exits) if (dist(p, e[0], e[1]) < 1.0) out.push(`${p.id} is within 1u of ${st.id}'s platform exit`);
              // The queue's places (all three rows, as paxQueueSlots lays them out before it skips blocked cells).
              const [hx, hz] = [(st.line.x - pf.x) * st.along[0] + (st.line.z - pf.z) * st.along[1], (st.line.x - pf.x) * st.out[0] + (st.line.z - pf.z) * st.out[1]];
              for (let row = 0; row < 3; row++) for (let lx = hx + 0.7; lx <= pf.w / 2 - 0.35; lx += R.pax.PAX.QGAP) {
                const lz = hz + row * R.pax.PAX.QGAP, x = pf.x + st.along[0] * lx + st.out[0] * lz, z = pf.z + st.along[1] * lx + st.out[1] * lz;
                if (dist(p, x, z) < Wk.R + Wk.CELL / 2 + 0.05) { out.push(`${p.id} stands on ${st.id}'s ticket queue at (${x.toFixed(2)}, ${z.toFixed(2)})`); row = 3; break; }
              }
            }
            for (const sp of spots) if (dist(p, sp.x, sp.z) < 1.0) out.push(`${p.id} is ${dist(p, sp.x, sp.z).toFixed(2)}u from the ${sp.building} ${sp.kind} spot (needs 1u)`);
            for (const b of booths) if (rectGap(p, b) < 0.5) out.push(`${p.id} is within 0.5u of ${b.id}'s booth ${b.part}`);
            for (const st of tt) if (st.board && dist(p, st.board.x, st.board.z) < 1.5) out.push(`${p.id} is within 1.5u of ${st.id}'s order board`);
            for (const t of R.carry.TOOL_PARK) if (dist(p, t.x / 100, t.z / 100) < 0.3 + (t.k === 'cart' ? 1.05 : 0.4)) out.push(`${p.id} is too close to the ${t.k} parking spot`);
            for (const Wsw of S.track.switches) if (dist(p, Wsw.stand.x, Wsw.stand.z) < 1 || dist(p, Wsw.stand.ux, Wsw.stand.uz) < 1) out.push(`${p.id} is near switch ${Wsw.id}`);
          }
          // Still walkable: every use spot (the ticket spot through the booth door), exit and booth door from the platform's middle.
          for (const st of K) {
            const home = G.comp[cell(st.plat.x, st.plat.z)];
            const pts = spots.filter(s => s.building === st.depot.id).map(s => [s.kind, s.x, s.z]).concat(st.exits.map((e, i) => ['exit ' + i, e[0], e[1]]))
              .concat(booths.filter(b => b.id === st.depot.id && b.part === 'door').map(b => ['booth door', b.x, b.z]));
            for (const [k, x, z] of pts) if (!G.cost[cell(x, z)] || G.comp[cell(x, z)] !== home) out.push(`${st.id}: the ${k} cannot be walked to from the platform`);
          }
          // 4. Meshes: the station is still the same 4 meshes.
          const names = {};
          B.meshes[0].parent.traverse(o => { if (['buildings', 'buildingGlow', 'buildingRoofs', 'depotShells'].includes(o.name)) names[o.name] = (names[o.name] || 0) + 1; });
          if (Object.keys(names).length !== 4 || Object.values(names).some(n => n !== 1)) out.push('station meshes: ' + JSON.stringify(names) + ' (expected one each of buildings, buildingGlow, buildingRoofs, depotShells)');
          return { out, info: { planks: B.planks, props: props.map(p => p.id), tris: B.triangles } };
        });
        problems.push(...out.out);
        console.log(`  boards: ${JSON.stringify(out.info.planks)}; props: ${out.info.props.join(', ')}; triangles in the station meshes: ${JSON.stringify(out.info.tris)}`);
      }
      // Screenshots and counts.
      const set = o => R(o => {
        const R = window.__railhead, c = R.camera;
        if (o.fresh) { R.importSave(JSON.stringify({ state: R.newState(1866) })); R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1); }
        const S = R.state; S.time = o.time; S.player.x = o.px; S.player.z = o.pz; S.player.mode = 'idle';
        c.zoom = o.zoom; c.yawIdx = 0; c.fx = o.px; c.fz = o.pz; c.ox = o.fx === undefined ? 0 : o.fx - o.px; c.oz = o.fz === undefined ? 0 : o.fz - o.pz;
        if (o.crowd !== undefined && R.setCrowd) R.setCrowd(o.crowd);
      }, o);
      const stats = () => R(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res({ dc: window.__railhead.drawCalls, tri: renderer.info.render.triangles })))));
      const where = await R(() => {
        const R = window.__railhead, f = R.buildings.footprints(), p = f.find(g => g.id === 'platform'), w = f.find(g => g.id === 'wfplatform'), d = f.find(g => g.id === 'depot');
        return { p: [p.x, p.z, p.w, p.d], w: [w.x, w.z, w.w, w.d], d: [d.x, d.z] };
      });
      const [px, pz, pw, pd] = where.p, [wx, wz, ww, wd] = where.w, [dx, dz] = where.d, DAY = 7 * 3600, DUSK = 13.9 * 3600;
      const shots = [
        ['hub-z1.5-day', { fresh: 1, time: DAY, px: px + 1.2, pz: pz - 0.8, zoom: 1.5 }],
        ['hub-z1.5-dusk', { time: DUSK, px: px + 1.2, pz: pz - 0.8, zoom: 1.5 }],
        ['hub-z3-depot-day', { time: DAY, px: dx + 6, pz: pz - 1.8, fx: dx + 1, fz: pz - pd / 2 - 0.4, zoom: 3 }],
        ['hub-z3-depot-dusk', { time: DUSK, px: dx + 6, pz: pz - 1.8, fx: dx + 1, fz: pz - pd / 2 - 0.4, zoom: 3 }],
        ['hub-z3-west-day', { time: DAY, px: px - pw / 2 + 7, pz: pz - 1.3, fx: px - pw / 2 + 4, fz: pz - 2.8, zoom: 3 }],
        ['hub-z3-east-day', { time: DAY, px: px + pw / 2 - 2, pz: pz - 0.3, fx: px + pw / 2 - 1, fz: pz - 1.3, zoom: 3 }],
        ['hub-z3-town-side-day', { time: DAY, px: dx + 10.5, pz: dz - 0.2, fx: dx + 7.4, fz: dz - 1.2, zoom: 3 }],
        ['willow-z1.5-day', { time: DAY, px: wx, pz: wz, zoom: 1.5 }],
        ['willow-z1.5-dusk', { time: DUSK, px: wx, pz: wz, zoom: 1.5 }],
        ['willow-z3-day', { time: DAY, px: wx - 5, pz: wz - 1.2, fx: wx - 6, fz: wz - 2.2, zoom: 3 }],
        ['dock-z3-day', { time: DAY, px: px - pw / 2 - 6.8, pz: pz + 5.7, fx: px - pw / 2 - 6.8, fz: pz + 3.7, zoom: 3 }],
        ['busy-z0.4', { fresh: 1, time: DAY, px: px - 12.8, pz: pz + 1.7, zoom: 0.4, crowd: 200 }],
      ];
      for (const [name, o] of shots) {
        await set(o);
        await page.waitForTimeout(700);
        const st = await stats();
        await page.screenshot({ path: screenshotPath(`station-${name}-${orientation}`) });
        report.push(`${name} ${orientation}: ${st.dc} draw calls, ${st.tri} triangles`);
        if (st.dc >= 100) P(`${name} ${orientation}: ${st.dc} draw calls (budget under 100)`);
      }
      if (errors.length) P(`${orientation}: console errors: ${errors.join(' | ')}`);
    } finally {
      await browser.close();
    }
  }
  console.log('  ' + report.join('\n  '));
  return problems;
};
