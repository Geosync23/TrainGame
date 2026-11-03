// Check: the player's path-finding (walk grid and path-finding section, design-doc 11).
// Run in the game's own simulation (no drawing), then one screenshot with the debug Path overlay.
// - From beside the depot, a tap behind it: the player walks round it, never inside a building footprint.
// - A tap on the far side of the stopped train: the player goes over a plank crossing clear of the train (D15: track
//   is walked across only at crossings), never into the train and never onto the track elsewhere.
// - A tap inside a building: the walk ends at the nearest spot that can be reached ("blocked" message).
// - A train running over the crossing the walk uses: the path is worked out again (round it, or waiting for it), and
//   the walk arrives; crossing at several places and times, the player never ends up inside the moving train.
// - A switch stand behind a train: the player throws it from the near side of the track (D15: from either side).
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
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
    try {
      const r = await page.evaluate(() => {
        const R = window.__railhead, out = {}, SC = R.CFG.SCALE;
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
        // 2. To the far side of the stopped train (D15): over a plank crossing clear of the train, never onto the track elsewhere.
        {
          const st = R.newState(1);
          st.trains[0].front = { e: 2, s: 1.5 * SC, d: 1 };      // stands at the west end of the station
          const ps = R.trainPoses(st.track, st.trains[0]);
          const x0 = Math.min(...ps.map(p => p.x - p.len / 2)), x1 = Math.max(...ps.map(p => p.x + p.len / 2));
          const cx = 0, cz = ps[0].z, half = (x1 - x0) / 2;
          st.player.x = cx; st.player.z = cz - 1.6;
          const tz = cz + 2;
          const g = walkGrid(st.track);
          let onTrack = 0;
          const w = run(st, [{ tick: 0, cmd: walkTo(cx, tz) }], 900, (s2, e, i) => { if (walkOnTrack(g, s2.player.x, s2.player.z)) onTrack++; return idle(s2, e, i); });
          const pads = xingList(st.track).filter(p => w.trace.some(([x, z]) => Math.hypot(x / 1000 - p.x, z / 1000 - p.z) < XING.W / 2 + 0.3)).length;
          out.train = { inT: w.inT, inB: w.inB, left: Math.hypot(st.player.x - cx, st.player.z - tz), pads, onTrack, half, len: w.len, ticks: w.ticks, x1 };
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
          // D15: the walk goes straight over the station's east crossing (x 6.25 x SC) while No. 1, standing west of the
          // crossings, runs east over it: the path is worked out again (round by the other crossing, or waiting).
          for (let k = 0; k <= 40 && !found; k += 2) {
            const st = R.newState(1); st.player.x = 6.25 * SC; st.player.z = 12.2 * SC;
            st.trains[0].front = { e: 2, s: 1.5 * SC, d: 1 };
            let straightAtStart = null, detour = false, px = null, pz = null;
            const w = run(st, [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: k, cmd: walkTo(6.25 * SC, 17.6 * SC) }], 900, (s, e, i) => {
              if (i < k) return false;
              if (s.player.mode === 'to') {
                const wp = walkPoints(s, poses(s), Infinity);
                if (straightAtStart === null) straightAtStart = wp.pts.length === 1;
                else if (wp.pts.length >= 2 || (s.player.x === px && s.player.z === pz)) detour = true;
              }
              px = s.player.x; pz = s.player.z;
              return i > k && s.player.mode === 'idle';
            });
            if (straightAtStart && detour) found = { k, inT: w.inT, left: Math.hypot(st.player.x - 6.25 * SC, st.player.z - 17.6 * SC), len: w.len, blocked: w.evs.some(e => e.t === 'blocked'), ticks: w.ticks, hash: R.stateHash(st) };
          }
          out.moving = found;
          // 4b. The same crossing from several places along the line and start times: the moving train never runs
          //     into the player part-way across (D15: its footprint on the walk grid reaches ahead while it moves).
          out.sweep = [];
          for (const sx of [2, 6, 10, 14]) for (let k = 0; k <= 60; k += 4) {
            const st = R.newState(1); st.player.x = sx * SC; st.player.z = 10 * SC;
            const w = run(st, [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: k, cmd: walkTo(sx * SC, 18 * SC) }], 900, (s, e, i) => i > k && s.player.mode === 'idle');
            if (w.inT) out.sweep.push(`x ${sx * SC} start ${k}: ${w.inT} ticks`);
          }
        }
        // 5. A switch stand behind a train: walk round the train, throw from within reach.
        {
          const st = R.newState(1), W = st.track.switches[0];
          st.trains[0].front = { e: 0, s: 7.8 * SC, d: 1 };
          st.player.x = W.stand.ux; st.player.z = 14 * SC + (14 * SC - W.stand.uz);
          let at = null, onTrack = 0;
          const far = switchSpots(st.track, W).far, g = walkGrid(st.track);
          const w = run(st, [{ tick: 0, cmd: { t: 'useSwitch', sw: 0 } }], 400, (s, e) => {
            if (walkOnTrack(g, s.player.x, s.player.z)) onTrack++;
            if (s.player.act && !at) at = Math.min(Math.hypot(s.player.x - W.stand.x, s.player.z - W.stand.z), Math.hypot(s.player.x - far.x, s.player.z - far.z));
            return e.some(x => x.t === 'switchThrown');
          });
          out.stand = { thrown: w.evs.some(e => e.t === 'switchThrown'), reach: at, inT: w.inT, onTrack, side: Math.sign(st.player.z - 14 * SC) };
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
          const ax = -11.2 * SC, az = 12.3 * SC, bx = 11 * SC, bz = 13 * SC;   // from just past the platform's west end to just past its east end (D15: off the track)
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
            const st = R.newState(1); st.player.x = 10 * SC; st.player.z = 10 * SC;
            const w = run(st, [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: 6, cmd: walkTo(10 * SC, 18 * SC) },
              { tick: 120, cmd: walkTo(depot.x, depot.z - 3) }, { tick: 260, cmd: { t: 'useTrain', tr: 0, view: 32 } }], 500);
            return JSON.stringify(w.trace) + '|' + R.stateHash(st);
          };
          out.same = once() === once();
          // A save made part-way through a walk round the train carries on exactly as the unsaved game.
          const st = R.newState(1); st.player.x = 10 * SC; st.player.z = 10 * SC;
          run(st, [{ tick: 0, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: 6, cmd: walkTo(10 * SC, 18 * SC) }], 20);
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
      if (!t.pads) problems.push('to the far side of the train: never went over a plank crossing');
      if (t.onTrack) problems.push(`to the far side of the train: on the track away from a crossing on ${t.onTrack} ticks`);
      if (tTurns > 8) problems.push(`round the train: the heading changed ${tTurns} times (zig-zag)`);
      const i = r.inside;
      if (i.inB) problems.push(`tap inside a building: the player went inside on ${i.inB} ticks`);
      if (i.mode !== 'idle' || !(i.gap < 0.9)) problems.push(`tap inside a building: the walk ended ${i.gap.toFixed(2)}u from the depot (mode ${i.mode}); expected the nearest spot`);
      if (!i.blocked) problems.push('tap inside a building: no "Something is in the way" message');
      const m = r.moving;
      if (r.sweep.length) problems.push(`moving train: the train ran into the player crossing in front of it (${r.sweep.join('; ')})`);
      if (!m) problems.push('a train moving across the path: no start time gave a path that changed round the train');
      else {
        if (m.inT) problems.push(`moving train: the player was inside the train on ${m.inT} ticks`);
        if (!(m.left < 0.01)) problems.push(`moving train: the walk ended ${m.left.toFixed(2)}u from the target`);
      }
      const s = r.stand;
      if (!s.thrown || !(s.reach <= 1.5) || s.inT || s.onTrack || s.side !== 1) problems.push(`switch stand behind a train: thrown ${s.thrown}, from ${s.reach}u of its stand or far-side spot, inside the train ${s.inT} ticks, on track ${s.onTrack}, ended on side ${s.side}`);
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
      notes.push(`round the depot ${d.len.toFixed(1)}u in ${d.ticks} ticks (${dTurns} turns); to the train's far side over a crossing ${t.len.toFixed(1)}u (${tTurns} turns); tap in the depot ends ${i.gap.toFixed(2)}u from its wall`);
      if (m) notes.push(`moving train: walk started at tick ${m.k}, went round it, ${m.len.toFixed(1)}u walked`);
      notes.push(`switch behind a train thrown from ${s.reach && s.reach.toFixed(2)}u; hold into a wall slid ${r.slide.dx.toFixed(2)}u`);
      notes.push(`speed: grid build ${r.buildMs.toFixed(1)} ms (${r.open} of 57600 cells open); path search typical ${r.typical.ms.toFixed(2)} ms (${r.typical.exp} cells), long ${r.long.ms.toFixed(2)} ms (${r.long.exp} cells), worst ${r.worst.ms.toFixed(1)} ms (${r.worst.exp} cells); sim tick walking ${r.tickWalkMs.toFixed(3)} ms, standing ${r.tickIdleMs.toFixed(3)} ms`);
    } finally { await browser.close(); }
  }

  // Screenshot: the Path overlay drawing the way round the depot.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1&world=yard' });
    try {
      const r = await page.evaluate(() => {
        const f = buildingFootprints().find(b => b.id === 'depot');
        rh.teleport(f.x + 1.2, f.z + f.d / 2 + 0.6);
        rh.send({ t: 'walkTo', x: Math.round((f.x - 0.8) * 100), z: Math.round((f.z - f.d / 2 - 1.5) * 100) });
        rh.step(2);
        const pts = walkPoints(rh.state, [].concat(...rh.state.trains.map(tr => window.__railhead.trainPoses(rh.state.track, tr))), Infinity).pts;
        return { n: pts.length, mode: rh.state.player.mode };
      });
      // The overlays are checked every 3 frames; on a busy test machine (software drawing) a frame can take
      // 400 ms, so wait up to 6 s for the overlay rather than a fixed 0.4 s.
      await page.waitForFunction(() => rh.overlays.path && rh.overlays.path.built, null, { timeout: 6000 }).catch(() => {});
      const ov =await page.evaluate(() => rh.overlays.path);
      if (!(r.n >= 2) || r.mode !== 'to') problems.push(`overlay: expected a path with corners round the depot, got ${r.n} points (mode ${r.mode})`);
      if (!ov.built) problems.push('overlay: the Path overlay was not drawn');
      await page.screenshot({ path: screenshotPath('paths-overlay-portrait') });
      if (errors.length) problems.push('overlay page: console errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  for (const n of notes) console.log('  ' + n);
  return problems;
};
