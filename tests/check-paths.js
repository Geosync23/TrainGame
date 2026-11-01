// Check: the player's path-finding (walk grid and path-finding section, design-doc 11).
// Run in the game's own simulation (no drawing), then one screenshot with the debug Path overlay.
// - From beside the depot, a tap behind it: the player walks round it, never inside a building footprint.
// - A tap on the far side of the stopped train: the player walks round its end, never into the train.
// - A tap inside a building: the walk ends at the nearest spot that can be reached ("blocked" message).
// - A train moving across the path: the path is worked out again round the train, and the walk arrives.
// - A switch stand behind a train: the player walks round the train and throws it from within reach.
// - Press and hold into a wall slides along it instead of stopping dead.
// - A player inside a building (an old save) walks out to open ground.
// - Pushing the handcart, a walk whose shortest way runs along the platform goes round it instead.
// - Same commands, same result twice (state hash and the whole track of positions), and a copy of the
//   state saved part-way through a walk carries on the same (the path is never saved, only worked out).
// - Speed: grid build, a typical and a worst-case path search (whole connected area searched).
// - Screenshot test-output/paths-overlay-portrait.png: ?debug=1 with the path round the depot drawn.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkPaths() {
  const problems = [], notes = [];
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      const r = await page.evaluate(() => {
        const R = window.__railhead, out = {};
        const solid = buildingFootprints().filter(f => !f.flush);
        const inBuilding = (x, z) => solid.some(f => walkRectHits(f, 0, x, z, 0));
        const poses = st => [].concat(...st.trains.map(tr => R.trainPoses(st.track, tr)));
        // Runs commands from tick 0 (or at given ticks) and records every position and event.
        const run = (st, script, maxTicks, stopWhen) => {
          const trace = [], evs = [];
          let inB = 0, inT = 0, len = 0, px = st.player.x, pz = st.player.z;
          for (let i = 0; i < maxTicks; i++) {
            const cmds = script.filter(s => s.tick === i).map(s => s.cmd);
            const e = R.simTick(st, cmds);
            evs.push(...e);
            const P = st.player;
            len += Math.hypot(P.x - px, P.z - pz); px = P.x; pz = P.z;
            trace.push([Math.round(P.x * 1000), Math.round(P.z * 1000)]);
            if (inBuilding(P.x, P.z)) inB++;
            if (insideTrain(poses(st), P.x, P.z)) inT++;
            if (stopWhen && stopWhen(st, e, i)) break;
          }
          return { trace, evs, inB, inT, len, ticks: trace.length };
        };
        const walkTo = (x, z) => ({ t: 'walkTo', x: Math.round(x * 100), z: Math.round(z * 100) });
        const idle = (st, e, i) => i > 0 && st.player.mode === 'idle';

        // 1. Round the depot: from the platform in front of it to a spot behind it.
        const depot = solid.find(f => f.id === 'depot');
        {
          const st = R.newState(1); st.player.x = depot.x; st.player.z = depot.z + depot.d / 2 + 0.6;
          const tx = depot.x + 0.3, tz = depot.z - depot.d / 2 - 1.2;
          const w = run(st, [{ tick: 0, cmd: walkTo(tx, tz) }], 600, idle);
          out.depot = { inB: w.inB, left: Math.hypot(st.player.x - tx, st.player.z - tz), len: w.len, straight: Math.hypot(tx - depot.x, tz - (depot.z + depot.d / 2 + 0.6)), ticks: w.ticks, blocked: w.evs.some(e => e.t === 'blocked') };
          out.depotTrace = w.trace;
        }
        // 2. Round the end of the stopped train, to its far side.
        {
          const st = R.newState(1), ps = R.trainPoses(st.track, st.trains[0]);
          const x0 = Math.min(...ps.map(p => p.x - p.len / 2)), x1 = Math.max(...ps.map(p => p.x + p.len / 2));
          const cx = (x0 + x1) / 2, cz = ps[0].z, half = (x1 - x0) / 2;
          st.player.x = cx; st.player.z = cz - 1.6;
          const tz = cz + 2;
          const w = run(st, [{ tick: 0, cmd: walkTo(cx, tz) }], 900, idle);
          const maxOff = Math.max(...w.trace.map(([x]) => Math.abs(x / 1000 - cx)));
          out.train = { inT: w.inT, inB: w.inB, left: Math.hypot(st.player.x - cx, st.player.z - tz), maxOff, half, len: w.len, ticks: w.ticks };
          out.trainTrace = w.trace;
        }
        // 3. A tap inside a building ends at the nearest spot that can be reached.
        {
          const st = R.newState(1); st.player.x = depot.x; st.player.z = depot.z - 5;
          const w = run(st, [{ tick: 0, cmd: walkTo(depot.x, depot.z) }], 600, idle);
          const P = st.player, dx = Math.max(0, Math.abs(P.x - depot.x) - depot.w / 2), dz = Math.max(0, Math.abs(P.z - depot.z) - depot.d / 2);
          out.inside = { inB: w.inB, mode: P.mode, gap: Math.hypot(dx, dz), blocked: w.evs.some(e => e.t === 'blocked'), ticks: w.ticks };
        }
        // 4. A train moving across the path: start the walk at different moments until the train gets in
        //    the way part-way (the first path is a straight line, a later one goes round the train).
        {
          let found = null;
          for (let k = 0; k <= 40 && !found; k += 2) {
            const st = R.newState(1); st.player.x = 10; st.player.z = 10;
            let straightAtStart = null, detour = false;
            const w = run(st, [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: k, cmd: walkTo(10, 18) }], 900, (s, e, i) => {
              if (i < k) return false;
              if (s.player.mode === 'to') {
                const wp = walkPoints(s, poses(s), Infinity);
                if (straightAtStart === null) straightAtStart = wp.pts.length === 1;
                else if (wp.pts.length >= 2) detour = true;
              }
              return i > k && s.player.mode === 'idle';
            });
            if (straightAtStart && detour) found = { k, inT: w.inT, left: Math.hypot(st.player.x - 10, st.player.z - 18), len: w.len, blocked: w.evs.some(e => e.t === 'blocked'), ticks: w.ticks, hash: R.stateHash(st) };
          }
          out.moving = found;
        }
        // 5. A switch stand behind a train: walk round the train, throw from within reach.
        {
          const st = R.newState(1), W = st.track.switches[0];
          st.trains[0].front = { e: 0, s: 7.8, d: 1 };
          st.player.x = W.stand.ux; st.player.z = 14 + (14 - W.stand.uz);
          let at = null;
          const w = run(st, [{ tick: 0, cmd: { t: 'useSwitch', sw: 0 } }], 400, (s, e) => {
            if (s.player.act && !at) at = Math.hypot(s.player.x - W.stand.x, s.player.z - W.stand.z);
            return e.some(x => x.t === 'switchThrown');
          });
          out.stand = { thrown: w.evs.some(e => e.t === 'switchThrown'), reach: at, inT: w.inT };
        }
        // 6. Press and hold diagonally into the depot's back wall: slides along it.
        {
          const st = R.newState(1); st.player.x = depot.x; st.player.z = depot.z - depot.d / 2 - 0.6;
          const a = Math.round(256 * (Math.atan2(1, 1) / (2 * Math.PI))); // +x and +z: into the wall and along it
          const w = run(st, [{ tick: 0, cmd: { t: 'walkDir', a } }], 12);
          out.slide = { inB: w.inB, dx: st.player.x - depot.x, dz: st.player.z - (depot.z - depot.d / 2 - 0.6) };
        }
        // 7. A player inside a building (as an old save could have) walks out.
        {
          const st = R.newState(1); st.player.x = depot.x; st.player.z = depot.z;
          const w = run(st, [{ tick: 0, cmd: walkTo(depot.x, depot.z - 6) }], 600, idle);
          out.escape = { left: Math.hypot(st.player.x - depot.x, st.player.z - (depot.z - 6)), stillIn: inBuilding(st.player.x, st.player.z) };
        }
        // 7b. Pushing the handcart: a walk whose shortest way runs along the platform (the cheapest cells)
        //     goes round the platform and the dock instead (they have steps), never entering them, and arrives.
        {
          const ax = -11.2, az = 12.3, bx = 9.2, bz = 13.6;   // from just past the platform's west end (D12: 20u long)
          const plain = R.newState(1); plain.player.x = ax; plain.player.z = az;
          const wp = run(plain, [{ tick: 0, cmd: walkTo(bx, bz) }], 600, idle);
          const st = R.newState(1);
          run(st, [{ tick: 0, cmd: { t: 'carryTool', tool: 1 } }], 300, (s2, e) => e.some(x => x.t === 'toolTaken'));
          const took = st.player.tool === 1 && st.tools[1].k === 'cart';
          st.player.x = ax; st.player.z = az;
          let onNoCart = 0;
          const w = run(st, [{ tick: 0, cmd: walkTo(bx, bz) }], 600, (s2, e, i) => { if (carryNoCartAt(s2.player.x, s2.player.z)) onNoCart++; return idle(s2, e, i); });
          out.cart = { took, plainOnPlatform: wp.trace.filter(([x, z]) => carryNoCartAt(x / 1000, z / 1000)).length, onNoCart,
            left: Math.hypot(st.player.x - bx, st.player.z - bz), refused: w.evs.filter(e => e.t === 'carryRefused' || e.t === 'blocked').map(e => e.why || e.t), len: w.len, plainLen: wp.len };
        }
        // 8. Same commands twice: same positions and hash.
        {
          const once = () => {
            const st = R.newState(1); st.player.x = 10; st.player.z = 10;
            const w = run(st, [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: 6, cmd: walkTo(10, 18) },
              { tick: 120, cmd: walkTo(depot.x, depot.z - 3) }, { tick: 260, cmd: { t: 'useTrain', tr: 0, view: 32 } }], 500);
            return JSON.stringify(w.trace) + '|' + R.stateHash(st);
          };
          out.same = once() === once();
          // A save made part-way through a walk round the train carries on exactly as the unsaved game.
          const st = R.newState(1); st.player.x = 10; st.player.z = 10;
          run(st, [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: 6, cmd: walkTo(10, 18) }], 20);
          const copy = JSON.parse(JSON.stringify(st));
          run(st, [], 80); run(copy, [], 80);
          out.resume = R.stateHash(st) === R.stateHash(copy) && st.player.mode === 'idle';
        }
        // 9. Speed.
        {
          const st = R.newState(1), G = walkGrid(st.track), ps = poses(st);
          let t = performance.now();
          for (let i = 0; i < 5; i++) walkGridBuild(st.track);
          out.buildMs = (performance.now() - t) / 5;
          const time = (x0, z0, x1, z1) => {
            st.player.x = x0; st.player.z = z0; st.player.tx = x1; st.player.tz = z1;
            let ms = 0, exp = 0;
            for (let i = 0; i < 20; i++) { G.memo = null; const m = walkPlan(st, ps); ms += m.ms; exp = m.expanded; }
            return { ms: ms / 20, exp };
          };
          out.typical = time(depot.x, depot.z + depot.d / 2 + 0.6, depot.x + 0.3, depot.z - depot.d / 2 - 1.2);
          out.long = time(-24, -19, 24, 23);
          // Worst case: a goal A* can never reach (as when a train cuts it off), so it searches the whole area.
          walkTrainStamp(G, ps);
          const s = walkCell(-10.5, 11.2);
          t = performance.now();
          let exp = 0;
          for (let i = 0; i < 10; i++) exp = walkAStar(G, s, walkCell(60, 60)).expanded; // a hill cell: never reached
          out.worst = { ms: (performance.now() - t) / 10, exp };
          let open = 0; for (let i = 0; i < G.cost.length; i++) if (G.cost[i]) open++;
          out.open = open;
          // One sim tick while walking a long way, against one standing still.
          const a = R.newState(1); R.simTick(a, [walkTo(24, 23)]);
          t = performance.now(); for (let i = 0; i < 100; i++) R.simTick(a, []); out.tickWalkMs = (performance.now() - t) / 100;
          const b = R.newState(1);
          t = performance.now(); for (let i = 0; i < 100; i++) R.simTick(b, []); out.tickIdleMs = (performance.now() - t) / 100;
        }
        return out;
      });

      const d = r.depot;
      if (d.inB) problems.push(`round the depot: the player was inside a building on ${d.inB} ticks`);
      if (!(d.left < 0.01)) problems.push(`round the depot: the walk ended ${d.left.toFixed(2)}u from the target`);
      if (!(d.len > d.straight + 1)) problems.push(`round the depot: walked ${d.len.toFixed(2)}u, not round it (straight line ${d.straight.toFixed(2)}u)`);
      if (d.blocked) problems.push('round the depot: a "blocked" message came');
      // Smooth, not zig-zag: the heading changes only at a few corners.
      const turns = (tr) => { let n = 0, prev = null; for (let i = 1; i < tr.length; i++) { const dx = tr[i][0] - tr[i - 1][0], dz = tr[i][1] - tr[i - 1][1]; if (!dx && !dz) continue; const a = Math.atan2(dz, dx); if (prev !== null && Math.abs(((a - prev + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) > 0.05) n++; prev = a; } return n; };
      const dTurns = turns(r.depotTrace), tTurns = turns(r.trainTrace);
      if (dTurns > 6) problems.push(`round the depot: the heading changed ${dTurns} times (zig-zag)`);
      const t = r.train;
      if (t.inT || t.inB) problems.push(`round the train: inside the train on ${t.inT} ticks, inside a building on ${t.inB}`);
      if (!(t.left < 0.01)) problems.push(`round the train: the walk ended ${t.left.toFixed(2)}u from the far side`);
      if (!(t.maxOff > t.half)) problems.push(`round the train: never went past its end (${t.maxOff.toFixed(2)}u from the middle, half length ${t.half.toFixed(2)}u)`);
      if (tTurns > 8) problems.push(`round the train: the heading changed ${tTurns} times (zig-zag)`);
      const i = r.inside;
      if (i.inB) problems.push(`tap inside a building: the player went inside on ${i.inB} ticks`);
      if (i.mode !== 'idle' || !(i.gap < 0.9)) problems.push(`tap inside a building: the walk ended ${i.gap.toFixed(2)}u from the depot (mode ${i.mode}); expected the nearest spot`);
      if (!i.blocked) problems.push('tap inside a building: no "Something is in the way" message');
      const m = r.moving;
      if (!m) problems.push('a train moving across the path: no start time gave a path that changed round the train');
      else {
        if (m.inT) problems.push(`moving train: the player was inside the train on ${m.inT} ticks`);
        if (!(m.left < 0.01)) problems.push(`moving train: the walk ended ${m.left.toFixed(2)}u from the target`);
      }
      const s = r.stand;
      if (!s.thrown || !(s.reach <= 1.5) || s.inT) problems.push(`switch stand behind a train: thrown ${s.thrown}, from ${s.reach}u, inside the train ${s.inT} ticks`);
      if (r.slide.inB || !(r.slide.dx > 1)) problems.push(`hold into a wall: moved ${r.slide.dx.toFixed(2)}u along it (expected > 1u), inside ${r.slide.inB} ticks`);
      if (r.escape.stillIn || !(r.escape.left < 0.01)) problems.push(`walking out of a building: ended ${r.escape.left.toFixed(2)}u from the target, still inside ${r.escape.stillIn}`);
      const c = r.cart;
      if (!c.took) problems.push('handcart: the player did not take the handcart');
      if (!c.plainOnPlatform) problems.push('handcart case: without the handcart the walk did not use the platform, so the case tests nothing');
      if (c.onNoCart) problems.push(`handcart: the player pushed it onto the platform or dock on ${c.onNoCart} ticks`);
      if (!(c.left < 0.01) || c.refused.length) problems.push(`handcart: the walk ended ${c.left.toFixed(2)}u from the target (${c.refused.join('; ')})`);
      notes.push(`handcart: walked ${c.len.toFixed(1)}u round the platform (${c.plainLen.toFixed(1)}u along it by hand, ${c.plainOnPlatform} ticks on it)`);
      if (!r.same) problems.push('the same commands twice gave different positions or hashes');
      if (!r.resume) problems.push('a copy of the state saved part-way through a walk did not carry on the same (or the walk did not end)');
      if (r.typical.ms > 5 || r.worst.ms > 50) problems.push(`path search too slow: typical ${r.typical.ms.toFixed(2)} ms, worst ${r.worst.ms.toFixed(1)} ms`);
      if (errors.length) problems.push('console errors: ' + errors.join(' | '));
      notes.push(`round the depot ${d.len.toFixed(1)}u in ${d.ticks} ticks (${dTurns} turns); round the train ${t.len.toFixed(1)}u (${tTurns} turns); tap in the depot ends ${i.gap.toFixed(2)}u from its wall`);
      if (m) notes.push(`moving train: walk started at tick ${m.k}, went round it, ${m.len.toFixed(1)}u walked`);
      notes.push(`switch behind a train thrown from ${s.reach && s.reach.toFixed(2)}u; hold into a wall slid ${r.slide.dx.toFixed(2)}u`);
      notes.push(`speed: grid build ${r.buildMs.toFixed(1)} ms (${r.open} of 57600 cells open); path search typical ${r.typical.ms.toFixed(2)} ms (${r.typical.exp} cells), long ${r.long.ms.toFixed(2)} ms (${r.long.exp} cells), worst ${r.worst.ms.toFixed(1)} ms (${r.worst.exp} cells); sim tick walking ${r.tickWalkMs.toFixed(3)} ms, standing ${r.tickIdleMs.toFixed(3)} ms`);
    } finally { await browser.close(); }
  }

  // Screenshot: the Path overlay drawing the way round the depot.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1' });
    try {
      const r = await page.evaluate(() => {
        const f = buildingFootprints().find(b => b.id === 'depot');
        rh.teleport(f.x + 1.2, f.z + f.d / 2 + 0.6);
        rh.send({ t: 'walkTo', x: Math.round((f.x - 0.8) * 100), z: Math.round((f.z - f.d / 2 - 1.5) * 100) });
        rh.step(2);
        const pts = walkPoints(rh.state, [].concat(...rh.state.trains.map(tr => window.__railhead.trainPoses(rh.state.track, tr))), Infinity).pts;
        return { n: pts.length, mode: rh.state.player.mode };
      });
      await page.waitForTimeout(400);
      const ov = await page.evaluate(() => rh.overlays.path);
      if (!(r.n >= 2) || r.mode !== 'to') problems.push(`overlay: expected a path with corners round the depot, got ${r.n} points (mode ${r.mode})`);
      if (!ov.built) problems.push('overlay: the Path overlay was not drawn');
      await page.screenshot({ path: screenshotPath('paths-overlay-portrait') });
      if (errors.length) problems.push('overlay page: console errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  for (const n of notes) console.log('  ' + n);
  return problems;
};
