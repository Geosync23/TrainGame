// Check: plank crossings (D15, design-doc 11 "Pathfinding"): track is walked across only at crossings.
// - The fixed crossings are there: both ends of the hub platform, one west of the freight shed over all three hub
//   tracks, both ends of Willow Ford's platform over its main and loop (pads where each meets a track).
// - Taps across track route via a crossing: from the platform to the strip between the platform track and the main,
//   and on to the Overland's side of the interchange; the walk arrives and passes over a crossing's pad.
// - No path crosses track elsewhere: many taps from many places (seeded), every step checked against the walk
//   grid's track cells; press and hold straight at the track stops at it; travellers walking from the platform
//   over a morning, and the drawn crowd of 200, never stand on track away from a crossing.
// - A train standing on a crossing blocks it: the walk goes round by another crossing and never into the train;
//   with the train gone the same tap takes the near crossing again.
// - A crossing staked with the Build tool (a tap on the track, then Stake it) is a construction job needing one tie
//   bundle; with the bundle put down beside it, one tap on the stakes sets its 10 planks; it then joins the
//   crossings and the walk across uses it (much shorter than before). It is drawn (planks in the track's merged mesh).
// - Switches and couplings are worked from either side of the track without crossing it.
// - Save and load keep a built crossing (export and import); an old save (schema 14 fixture) gets the fixed crossings.
// - Speed: the long walk grid search (hub to Willow Ford), and a search round by a crossing.
// Screenshots (phone size): crossing-hub-portrait.png, crossing-willow-landscape.png, crossing-job-portrait.png,
// crossing-built-portrait.png; draw calls at the hub.

const fs = require('fs');
const path = require('path');
const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkCrossings() {
  const problems = [];
  await checkSim(problems);
  await checkPage(problems);
  return problems;
};

async function checkSim(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v14.json'), 'utf8'));
    const r = await page.evaluate((fixture) => {
      const R = window.__railhead, SC = R.CFG.SCALE, bad = [], notes = [], P = m => bad.push(m);
      const poses = st => [].concat(...st.trains.map(tr => R.trainPoses(st.track, tr)));
      const G = st => R.world.walkGrid(st.track);
      const padAt = (st, x, z) => xingList(st.track).findIndex(p => { const dx = x - p.x, dz = z - p.z; return Math.abs(dx * p.hx + dz * p.hz) <= XING.W / 2 + 0.3 && Math.abs(dx * p.hz - dz * p.hx) <= XING.OPEN; });
      // Runs commands and records every step: steps onto shut track, straight steps across it, inside a train.
      const run = (st, cmds, maxTicks, stop) => {
        const pads = new Set(), trace = [];
        let onTrk = 0, across = 0, inT = 0, len = 0, px = st.player.x, pz = st.player.z;
        const evs = [];
        for (let i = 0; i < maxTicks; i++) {
          const e = R.simTick(st, i === 0 ? cmds : []);
          evs.push(...e);
          const Pl = st.player, g = G(st);
          if (walkOnTrack(g, Pl.x, Pl.z)) onTrk++;
          if (walkAcrossTrack(g, px, pz, Pl.x, Pl.z) && !walkOnTrack(g, px, pz)) across++;
          if (insideTrain(poses(st), Pl.x, Pl.z)) inT++;
          const k = padAt(st, Pl.x, Pl.z); if (k >= 0) pads.add(k);
          len += Math.hypot(Pl.x - px, Pl.z - pz); px = Pl.x; pz = Pl.z;
          trace.push([Pl.x, Pl.z]);
          if (stop ? stop(st, e, i) : (i > 0 && Pl.mode === 'idle' && !Pl.act)) break;
        }
        return { pads: [...pads], onTrk, across, inT, len, ticks: trace.length, evs, trace };
      };
      const walkTo = (x, z) => ({ t: 'walkTo', x: Math.round(x * 100), z: Math.round(z * 100) });
      const out = {};

      // 1. The fixed crossings.
      {
        const st = R.newState(1866), X = xingList(st.track), near = (x, z) => X.some(p => Math.abs(p.x - x) < 0.5 && Math.abs(p.z - z) < 0.5);
        out.fixed = X.map(p => [+p.x.toFixed(1), +p.z.toFixed(1)]);
        const pz = -R.world.TURN_OFF, W = R.world.WFORD;
        for (const [x, z, what] of [[-5.8, pz, 'hub platform west end, platform track'], [-5.8, 0, 'hub platform west end, main'], [31, pz, 'hub platform east end, platform track'],
          [31, 0, 'hub platform east end, main'], [-19.2, pz, 'freight shed crossing, platform track'], [-19.2, 0, 'freight shed crossing, main'],
          [-19.2, -pz, 'freight shed crossing, interchange'], [W.x + 9.5 * SC, W.z, 'Willow Ford west end, main'], [W.x + 30.4 * SC, W.z, 'Willow Ford east end, main']])
          if (!near(x, z)) P(`no crossing pad at ${what} (${x.toFixed(1)}, ${z.toFixed(1)})`);
        if (X.filter(p => p.x > W.x && Math.abs(p.z - (W.z + R.world.TURN_OFF)) < 0.6).length !== 2) P('Willow Ford\'s loop should have 2 crossing pads');
        // The pads are open on the walk grid; the track either side of them is not.
        const g = G(st);
        for (const p of X) {
          if (walkOnTrack(g, p.x, p.z) || !(g.cost[walkCell(p.x, p.z)] > 0)) P(`crossing pad at (${p.x}, ${p.z}) is not open`);
          if (!walkOnTrack(g, p.x + p.hx * (XING.W / 2 + 1), p.z + p.hz * (XING.W / 2 + 1))) P(`the track beside the pad at (${p.x}, ${p.z}) is open`);
        }
        const yard = xingList(R.newState(1, 'yard').track);
        if (yard.length < 4) P(`the test yard has ${yard.length} crossing pads`);
        R.newState(1866);
      }

      // 2. Taps across track route via a crossing.
      {
        const st = R.newState(1866), pz = -R.world.TURN_OFF;
        st.player.x = 12; st.player.z = pz - 4; // on the platform
        const a = run(st, [walkTo(12, -2.7)], 1500);
        out.toStrip = { len: a.len, ticks: a.ticks, pads: a.pads };
        if (Math.hypot(st.player.x - 12, st.player.z + 2.7) > 0.05) P(`platform to the strip beside the main: ended ${Math.hypot(st.player.x - 12, st.player.z + 2.7).toFixed(2)}u short`);
        if (!a.pads.length) P('platform to the strip beside the main: never walked over a crossing');
        if (a.onTrk || a.across) P(`platform to the strip beside the main: ${a.onTrk} steps on track, ${a.across} across it`);
        if (a.len < 2 * 6) P(`platform to the strip: walked only ${a.len.toFixed(1)}u (straight would be 6u: it must go round by a crossing)`);
        // On to the Overland's side of the interchange (south of all three hub tracks).
        const b = run(st, [walkTo(-40, -pz + 2)], 3000);
        out.toSouth = { len: b.len, ticks: b.ticks, pads: b.pads };
        if (Math.hypot(st.player.x + 40, st.player.z - (-pz + 2)) > 0.05) P('strip to the south of the interchange: did not arrive');
        if (b.pads.length < 2) P(`strip to the south of the interchange: walked over ${b.pads.length} crossing pads, expected at least 2 (main and interchange)`);
        if (b.onTrk || b.across) P(`strip to the south of the interchange: ${b.onTrk} steps on track, ${b.across} across it`);
      }

      // 3. No path crosses track elsewhere: seeded taps all over the hub and Willow Ford.
      {
        const st = R.newState(1866);
        let seed = 12345;
        const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        let onTrk = 0, across = 0, walks = 0, inT = 0, padsUsed = 0;
        for (let k = 0; k < 24; k++) {
          const atWF = k % 3 === 2, W = R.world.WFORD;
          const x = atWF ? W.x + rnd() * 60 * SC - 5 * SC : -40 + rnd() * 110, z = atWF ? W.z - 20 + rnd() * 30 : -25 + rnd() * 37;
          if (k % 6 === 5) { st.player.x = x; st.player.z = z; continue; } // jump to another area now and then
          const w = run(st, [walkTo(x, z)], 2500);
          walks++; onTrk += w.onTrk; across += w.across; inT += w.inT; if (w.pads.length) padsUsed++;
        }
        out.random = { walks, padsUsed };
        if (onTrk || across || inT) P(`random taps: ${onTrk} steps on track, ${across} straight across it, ${inT} inside a train`);
        if (padsUsed < 3) P(`random taps: only ${padsUsed} of ${walks} walks used a crossing`);
        // Press and hold straight at the track (south from the platform): stops at the track, does not cross.
        st.player.x = 20; st.player.z = -12; st.player.mode = 'idle';
        const h = run(st, [{ t: 'walkDir', a: 64 }], 120, (s, e, i) => i >= 119);
        out.hold = { z: st.player.z };
        if (h.onTrk || h.across || st.player.z > -5.46) P(`press and hold into the track crossed it or stood on it (z ${st.player.z.toFixed(2)})`);
        R.simTick(st, [{ t: 'walkDir', a: null }]);
      }

      // 4. A train standing on a crossing blocks it.
      {
        const st = R.newState(1866), T = st.track, pz = -R.world.TURN_OFF, tr = st.trains[0];
        const E = T.edges.find(E => E.k === 'S' && E.cls === 'yard' && Math.abs(T.nodes[E.b].x + 36 * SC) < 1e-6);
        tr.front = { e: E.id, s: T.nodes[E.a].x - 2.6, d: -1 }; // the train covers the platform's west-end crossing
        const ps = R.trainPoses(T, tr), x0 = Math.min(...ps.map(p => p.x - p.len / 2)), x1 = Math.max(...ps.map(p => p.x + p.len / 2));
        if (!(x0 < -5.8 - 2 && x1 > -5.8 + 2)) P(`test setup: the train stands from ${x0.toFixed(1)} to ${x1.toFixed(1)}, not over the crossing`);
        st.player.x = -5.8; st.player.z = pz - 3.5;
        const a = run(st, [walkTo(-5.8, -2.7)], 2500);
        const used = a.pads.map(k => xingList(T)[k].x);
        out.blocked = { len: a.len, pads: used };
        if (Math.hypot(st.player.x + 5.8, st.player.z + 2.7) > 0.05) P('train on a crossing: the walk round did not arrive');
        if (used.some(x => Math.abs(x + 5.8) < 1)) P('train on a crossing: the walk went over the blocked crossing');
        if (a.inT || a.onTrk || a.across) P(`train on a crossing: ${a.inT} steps inside the train, ${a.onTrk} on track, ${a.across} across it`);
        // The train leaves: the same tap goes over the near crossing.
        tr.front = { e: E.id, s: 19.2, d: -1 };
        st.player.x = -5.8; st.player.z = pz - 3.5;
        const b = run(st, [walkTo(-5.8, -2.7)], 2500);
        out.free = { len: b.len };
        if (!(b.len < a.len - 10)) P(`with the train gone the walk is ${b.len.toFixed(1)}u, against ${a.len.toFixed(1)}u round it`);
        // A train standing on the only way out (the test yard's station is inside the oval: with its east crossing taken
        // away, the west one is the only way out, and No. 1 stands over it): the player waits beside the track, then
        // goes on when it leaves.
        const st2 = R.newState(1, 'yard'), tr2 = st2.trains[0], z0 = 14 * SC;
        st2.track.crossings = st2.track.crossings.filter(p => p.x < 0);
        tr2.front = { e: 2, s: 11.2, d: 1 };   // from x 0 back to x -17.3, over the west crossing (x -10)
        const ps2 = R.trainPoses(st2.track, tr2), lo = Math.min(...ps2.map(p => p.x - p.len / 2)), hi = Math.max(...ps2.map(p => p.x + p.len / 2));
        if (!(lo < -6.25 * SC - 2 && hi > -6.25 * SC + 2)) P(`test setup: the yard train stands from ${lo.toFixed(1)} to ${hi.toFixed(1)}, not over the west crossing`);
        st2.player.x = 5; st2.player.z = z0 - 2.5;
        const c = run(st2, [walkTo(5, z0 + 2.5)], 150, (s, e, i) => i >= 149);
        if (c.inT || c.onTrk || c.across) P(`only ways blocked: ${c.inT} steps inside the train, ${c.onTrk} on track, ${c.across} across it`);
        if (st2.player.z > z0) P('only ways blocked: the player got across anyway');
        const stood = [st2.player.x, st2.player.z];
        tr2.front = { e: 0, s: 2 * SC, d: 1 };   // the train has gone west, off the station's crossings
        const d = run(st2, [walkTo(5, z0 + 2.5)], 600);
        if (Math.hypot(st2.player.x - 5, st2.player.z - z0 - 2.5) > 0.05 || d.inT || d.onTrk) P('only ways blocked: after the train left the walk did not arrive cleanly');
        out.waited = { stoodAt: stood.map(v => +v.toFixed(2)) };
        R.newState(1866);
      }

      // 5. A crossing staked and built by the player.
      {
        const st = R.newState(1866), T = st.track, pz = -R.world.TURN_OFF, ev = [];
        const nr = R.trackNearest(T, -40, pz);
        st.player.x = -40; st.player.z = pz - 3.5;
        const before = run(JSON.parse(JSON.stringify(st)), [walkTo(-40, -2.7)], 3000);
        R.simTick(st, [{ t: 'stakeCrossing', e: nr.e, s: Math.round(nr.s * 1000) }]).forEach(e => ev.push(e));
        const job = st.jobs.list[0];
        if (!job || !job.pad) { P('stakeCrossing made no crossing job: ' + JSON.stringify(ev.filter(e => /job/.test(e.t)))); return { bad, out }; }
        if (job.need.ties !== 1 || job.need.rails || job.need.spikes || job.need.hardware) P(`a crossing job should need one tie bundle only: ${JSON.stringify(job.need)}`);
        // Refusals: on top of it again, beside a switch.
        const again = R.simTick(st, [{ t: 'stakeCrossing', e: nr.e, s: Math.round(nr.s * 1000) }]).find(e => e.t === 'jobRefused');
        if (!again) P('a second crossing on the same spot was not refused');
        const W0 = T.switches[0], nsw = R.trackNearest(T, T.nodes[W0.node].x - 1, T.nodes[W0.node].z);
        const sw = R.simTick(st, [{ t: 'stakeCrossing', e: nsw.e, s: Math.round(nsw.s * 1000) }]).find(e => e.t === 'jobRefused');
        if (!sw) P('a crossing on a switch was not refused');
        // Put a tie bundle down beside it (an item on the ground within reach of the stakes), then work.
        const wb = { commodity: 'ties', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'CONSTRUCTION', id: job.id }, contractId: null, due: null };
        const it = R.cargo.itemCreate(st, wb, { kind: 'GROUND', x: Math.round(-38 * 100), z: Math.round((pz - 2.2) * 100) }, ev);
        R.simTick(st, []);
        for (const id of R.cargo.itemsAt(st, { kind: 'GROUND' })) jobDeliver(st, id, ev);
        if (!R.cargo.itemsAt(st, { kind: 'STOCKPILE', jobId: job.id }).length) P('the tie bundle beside the crossing job is not on its site');
        const n0 = xingList(T).length, t0 = st.tick;
        const w = run(st, [{ t: 'jobWork', id: job.id }], 600, (s, e) => e.some(x => x.t === 'jobDone' || x.t === 'jobStopped'));
        const done = w.evs.find(e => e.t === 'jobDone'), stopped = w.evs.find(e => e.t === 'jobStopped');
        out.job = { ticks: st.tick - t0, steps: w.evs.filter(e => e.t === 'jobStep').length, done: !!done, stopped: stopped && stopped.why };
        if (!done) P('the crossing job did not finish: ' + (stopped ? stopped.why : 'no stop'));
        if (xingList(T).length !== n0 + 1) P(`crossings ${n0} -> ${xingList(T).length} after the job`);
        if (w.onTrk || w.across) P(`building the crossing: ${w.onTrk} steps on track, ${w.across} across it`);
        if (st.jobs.list.length) P('the crossing job is still there after it finished');
        if (R.cargo.itemsAt(st, { kind: 'GROUND' }).some(id => st.items.waybill[id].commodity === 'ties' && st.items.where[id] && Math.hypot(st.items.where[id].x / 100 + 40, st.items.where[id].z / 100 - pz) < 6)) P('ties were left over after the crossing (10 planks should use the whole bundle)');
        if (R.cargo.itemCheckConservation(st).length) P('item conservation: ' + R.cargo.itemCheckConservation(st).join('; '));
        st.player.x = -40; st.player.z = pz - 3.5; st.player.mode = 'idle';
        const after = run(st, [walkTo(-40, -2.7)], 3000);
        out.built = { before: before.len, after: after.len, pads: after.pads.map(k => xingList(T)[k].x) };
        if (!after.pads.some(k => Math.abs(xingList(T)[k].x + 40) < 1)) P('the walk across did not use the new crossing');
        if (!(after.len < before.len / 3)) P(`the new crossing should shorten the walk: ${before.len.toFixed(1)}u before, ${after.len.toFixed(1)}u after`);
        if (after.onTrk || after.across) P(`over the new crossing: ${after.onTrk} steps on track, ${after.across} across it`);
        // Save and load keep it.
        const json = JSON.stringify({ state: st, ui: {} }), back = R.migrate(JSON.parse(json)).state;
        if (xingList(back.track).length !== xingList(T).length || !xingList(back.track).some(p => Math.abs(p.x + 40) < 1)) P('save and load lost the built crossing');
        const after2 = run(back, [walkTo(-40, pz - 3.5)], 3000);
        if (!(after2.len < before.len / 3)) P(`after save and load the walk back is ${after2.len.toFixed(1)}u (the crossing is not used)`);
        // An old save (schema 14) gets the fixed crossings.
        const old = R.migrate(JSON.parse(fixture.save)).state;
        out.oldSave = { version: old.schemaVersion, pads: xingList(old.track).length };
        if (old.schemaVersion !== R.CFG.SCHEMA_VERSION || xingList(old.track).length < 4) P(`the schema 14 fixture migrated to ${old.schemaVersion} with ${xingList(old.track).length} crossing pads`);
        R.newState(1866);
      }

      // 6. Switches and couplings from either side.
      {
        const sw = (st, id, x, z) => {
          st.player.x = x; st.player.z = z; st.player.mode = 'idle';
          const s0 = st.track.switches[id].state, w = run(st, [{ t: 'useSwitch', sw: id }], 1500, (s, e, i) => e.some(x => x.t === 'switchThrown' || x.t === 'blocked' || x.t === 'switchLocked') || i > 1400);
          return { thrown: st.track.switches[id].state !== s0, w, x: st.player.x, z: st.player.z };
        };
        const st = R.newState(1866);
        // Switch 1 (the platform switch at x 40 x SC): its stand is south of the line; thrown from the north too.
        const a = sw(st, 1, 66, -12), b = sw(st, 1, 66, 12);
        out.sw1 = { north: [a.x, a.z, a.w.len], south: [b.x, b.z, b.w.len] };
        if (!a.thrown || a.z > 0 || a.w.pads.length || a.w.onTrk) P(`switch 1 from the north side: thrown ${a.thrown}, ended at z ${a.z.toFixed(2)}, ${a.w.pads.length} crossings used`);
        if (!b.thrown || b.z < 0 || b.w.pads.length || b.w.onTrk) P(`switch 1 from the south side: thrown ${b.thrown}, ended at z ${b.z.toFixed(2)}, ${b.w.pads.length} crossings used`);
        // Switch 0 (the interchange switch): its stand is between the platform track and the main; from the interchange side.
        const c = sw(st, 0, 12, 3.4);
        if (!c.thrown || c.z < 0 || c.w.onTrk || c.w.across) P(`switch 0 from the south of the main: thrown ${c.thrown}, ended at z ${c.z.toFixed(2)}`);
        // Willow Ford's switches: from the north and from the south (its loop side).
        const W = R.world.WFORD, wsw = st.track.switches[2], nz = st.track.nodes[wsw.node];
        const d = sw(st, 2, nz.x + 2, nz.z - 6), e = sw(st, 2, nz.x - 4, nz.z + 6);
        if (!d.thrown || d.z > nz.z || d.w.pads.length) P(`Willow Ford switch 3 from the north: thrown ${d.thrown}, at z ${d.z.toFixed(2)}`);
        if (!e.thrown || e.z < nz.z || e.w.pads.length) P(`Willow Ford switch 3 from the south: thrown ${e.thrown}, at z ${e.z.toFixed(2)}`);
        // Couplings: No. 1 at the hub platform, uncoupled from the platform and from the strip on the other side.
        const cut = (fromZ) => {
          const s2 = R.newState(1866), tr = s2.trains[0], j = R.tt.ttJointAt(s2, tr, 2);
          s2.player.x = j.x; s2.player.z = fromZ;
          const w = run(s2, [{ t: 'uncouple', tr: 0, at: 2 }], 800, (s, e, i) => e.some(x => x.t === 'uncoupled' || x.t === 'ttRefused' || x.t === 'blocked') || i > 700);
          return { ok: w.evs.some(x => x.t === 'uncoupled'), z: s2.player.z, w, why: (w.evs.find(x => x.t === 'ttRefused') || {}).why };
        };
        const pz = -R.world.TURN_OFF, f = cut(pz - 4), g = cut(pz + 2.7);
        out.cut = { platform: f.z, strip: g.z };
        if (!f.ok || f.z > pz || f.w.pads.length) P(`uncoupling from the platform: ${f.ok} (${f.why || ''}), stood at z ${f.z.toFixed(2)}`);
        if (!g.ok || g.z < pz || g.w.pads.length || g.w.onTrk) P(`uncoupling from the far side: ${g.ok} (${g.why || ''}), stood at z ${g.z.toFixed(2)}`);
        R.newState(1866);
      }

      // 7. Travellers over a morning (No. 1 on the timetable): never on track away from a crossing.
      {
        const st = R.newState(1866);
        R.simTick(st, [{ t: 'ttAssign', tr: 0, on: true }]);
        let onT = 0, seen = 0, moved = 0;
        const last = {};
        for (let i = 0; i < 6 * 450; i++) {
          R.simTick(st, []);
          const g = G(st);
          for (const p of st.pax.list) {
            if (p.car !== null && p.car !== undefined) { delete last[p.id]; continue; }
            const x = p.x / 100, z = p.z / 100;
            seen++;
            if (walkOnTrack(g, x, z)) onT++;
            const l = last[p.id];
            if (l && (l[0] !== x || l[1] !== z)) { moved++; if (walkAcrossTrack(g, l[0], l[1], x, z) && !walkOnTrack(g, l[0], l[1])) onT++; }
            last[p.id] = [x, z];
          }
        }
        out.pax = { seen, moved, onT };
        if (onT) P(`travellers: ${onT} positions or steps on track away from a crossing`);
        if (!moved) P('travellers: none walked in 6 hours (the check saw nothing)');
        R.newState(1866);
      }

      // 8. Speed: the long search (hub to Willow Ford) and one round by a crossing.
      {
        const st = R.newState(1866), g = G(st), W = R.world.WFORD;
        const t0 = performance.now(); for (let i = 0; i < 3; i++) R.world.walkGridBuild(st.track); out.buildMs = (performance.now() - t0) / 3;
        const plan = (x, z, tx, tz) => { st.player.x = x; st.player.z = z; st.player.tx = tx; st.player.tz = tz; st.player.mode = 'to'; let ms = 0, exp = 0; for (let i = 0; i < 10; i++) { g.memo = null; const m = walkPlan(st, []); ms += m.ms; exp = m.expanded; } return { ms: ms / 10, exp }; };
        out.long = plan(7 * SC, -5.5 * SC, W.x + 18 * SC, W.z - 1.7 * SC);
        out.round = plan(-40, -9, -40, -2.7);
        out.south = plan(12, -10, 20, 5);
        if (out.long.ms > 50) P(`the long path search took ${out.long.ms.toFixed(1)} ms`);
        R.newState(1866);
      }
      return { bad, out };
    }, fixture);
    problems.push(...r.bad);
    const o = r.out;
    console.log(`  fixed crossing pads: ${JSON.stringify(o.fixed)}`);
    if (o.toStrip) console.log(`  platform to the strip: ${o.toStrip.len.toFixed(1)}u; strip to the interchange's far side ${o.toSouth.len.toFixed(1)}u; random taps ${o.random.walks} (${o.random.padsUsed} over a crossing); hold stopped at z ${o.hold.z.toFixed(2)}`);
    if (o.blocked) console.log(`  train on the crossing: round by x ${o.blocked.pads.join(', ')} ${o.blocked.len.toFixed(1)}u, ${o.free.len.toFixed(1)}u when it has gone; with no other way the player waited at ${o.waited.stoodAt}`);
    if (o.job) console.log(`  crossing job: ${o.job.steps} steps in ${o.job.ticks} ticks (${(o.job.ticks * 8 / 60).toFixed(1)} game min); walk across ${o.built.before.toFixed(1)}u before, ${o.built.after.toFixed(1)}u after; old save v${o.oldSave.version} with ${o.oldSave.pads} pads`);
    if (o.sw1) console.log(`  switch 1 from the north at (${o.sw1.north[0].toFixed(1)}, ${o.sw1.north[1].toFixed(1)}), from the south at (${o.sw1.south[0].toFixed(1)}, ${o.sw1.south[1].toFixed(1)}); uncoupled from z ${o.cut.platform.toFixed(2)} and z ${o.cut.strip.toFixed(2)}`);
    if (o.pax) console.log(`  travellers: ${o.seen || o.pax.seen} positions seen, ${o.pax.moved} steps`);
    if (o.long) console.log(`  speed: grid build ${o.buildMs.toFixed(1)} ms; hub to Willow Ford search ${o.long.ms.toFixed(2)} ms (${o.long.exp} cells); round by a crossing ${o.round.ms.toFixed(2)} ms (${o.round.exp} cells); platform to south of the main ${o.south.ms.toFixed(2)} ms (${o.south.exp} cells)`);
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
}

// The page: the crowd keeps off the track, the Build tool stakes a crossing by touch, screenshots and draw calls.
async function checkPage(problems) {
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&crowd=200' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const frames = () => R(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    const lookAt = async (x, z, zoom) => {
      await R(([x, z, zoom]) => { const R = window.__railhead, P = R.state.player; R.camera.zoom = zoom; R.camera.ox = x - P.x; R.camera.oz = z - P.z; R.camera.fx = P.x; R.camera.fz = P.z; }, [x, z, zoom]);
      await page.waitForTimeout(250); await frames();
    };
    try {
      if (orient === 'portrait') {
        // The crowd: 200 walkers at 4x for a while, sampled every frame.
        const c = await R(() => new Promise(res => {
          const R = window.__railhead, g = R.world.walkGrid(R.state.track);
          R.setSpeed(4);
          let n = 0, onT = 0, across = 0, samples = 0;
          const last = crowd.walkers.slice(0, crowd.n).map(w => [w.x, w.z]);
          const tick = () => {
            for (let i = 0; i < crowd.n; i++) {
              const w = crowd.walkers[i]; samples++;
              if (walkOnTrack(g, w.x, w.z)) onT++;
              if (walkAcrossTrack(g, last[i][0], last[i][1], w.x, w.z) && !walkOnTrack(g, last[i][0], last[i][1])) across++;
              last[i] = [w.x, w.z];
            }
            if (++n < 240) requestAnimationFrame(tick); else { R.setSpeed(0); res({ onT, across, samples }); }
          };
          requestAnimationFrame(tick);
        }));
        console.log(`  crowd: ${c.samples} walker positions, ${c.onT} on track, ${c.across} steps across it`);
        if (c.onT || c.across) problems.push(`crowd: ${c.onT} walker positions on track away from a crossing, ${c.across} steps across it`);
        // The fixed crossing at the hub platform's west end, close up (zoom 3), and draw calls at the start zoom.
        await lookAt(-5.8, -2.7, 2);
        await page.screenshot({ path: screenshotPath('crossing-hub-portrait') });
        await lookAt(8, -6, 1.5);
        const dc = await R(() => window.__railhead.drawCalls);
        console.log(`  draw calls at the hub (portrait, 1.5x, 200 walkers): ${dc}`);
        if (dc > 100) problems.push(`draw calls ${dc} at the hub`);
        // Build tool by touch: tap the platform track at x -40, Stake it.
        const cdp = await page.context().newCDPSession(page);
        const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });
        await R(() => { window.__railhead.CFG.HOLD_MS = 2000; const P = window.__railhead.state.player; P.x = -40; P.z = -9.5; });
        await lookAt(-40, -5.46, 2.5);
        await R(() => window.__railhead.setBuildMode(true));
        const p = await R(() => window.__railhead.toScreen(-40, -5.46, 0.3));
        await touch('touchStart', [p]); await page.waitForTimeout(40); await touch('touchEnd', []); await page.waitForTimeout(150); await frames();
        const lab = await R(() => ({ text: document.getElementById('buildLabel').textContent, btn: document.getElementById('buildLay').textContent, dis: document.getElementById('buildLay').disabled, hidden: document.getElementById('buildConfirm').hidden }));
        if (!/Plank crossing/.test(lab.text) || lab.hidden || lab.dis || lab.btn !== 'Stake it') problems.push(`build tool tap on a track: label "${lab.text}", button "${lab.btn}" (disabled ${lab.dis}, hidden ${lab.hidden})`);
        await page.screenshot({ path: screenshotPath('crossing-plan-portrait') });
        await page.click('#buildLay'); await page.waitForTimeout(100); await frames();
        const job = await R(() => { const S = window.__railhead.state; return S.jobs.list.map(j => ({ id: j.id, pad: !!j.pad })); });
        if (job.length !== 1 || !job[0].pad) problems.push('Stake it on a crossing plan made no crossing job: ' + JSON.stringify(job));
        else {
          // A tie bundle beside it, then work about half of it and look at it.
          await R(() => {
            const R = window.__railhead, S = R.state, ev = [], j = S.jobs.list[0];
            const wb = { commodity: 'ties', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'CONSTRUCTION', id: j.id }, contractId: null, due: null };
            R.cargo.itemCreate(S, wb, { kind: 'GROUND', x: -3800, z: Math.round((-5.46 - 2.6) * 100) }, ev);
            for (const id of R.cargo.itemsAt(S, { kind: 'GROUND' })) jobDeliver(S, id, ev);
            R.send({ t: 'jobWork', id: j.id });
            for (let i = 0; i < 200 && S.jobs.list.length && S.jobs.list[0].done.ties < 5; i++) R.step(1);
            R.step(1);
          });
          await lookAt(-40, -5.46, 2.5);
          await page.screenshot({ path: screenshotPath('crossing-job-portrait') });
          const fin = await R(() => { const R = window.__railhead, S = R.state; for (let i = 0; i < 400 && S.jobs.list.length; i++) R.step(1); return { left: S.jobs.list.length, pads: S.track.crossings.length, hash: R.hash() }; });
          if (fin.left) problems.push('the staked crossing did not finish in the page');
          await lookAt(-40, -5.46, 2.5);
          await page.screenshot({ path: screenshotPath('crossing-built-portrait') });
          // Save and reload the page: the crossing is still there.
          await R(() => window.__railhead.saveGame());
          await page.waitForTimeout(300);
          await page.reload();
          await page.waitForFunction(() => window.__railhead && window.__railhead.ready, null, { timeout: 15000 });
          const pads = await R(() => window.__railhead.state.track.crossings.filter(p => Math.abs(p.x + 40) < 1).length);
          if (pads !== 1) problems.push(`after a page reload the built crossing is ${pads ? 'there ' + pads + ' times' : 'gone'}`);
        }
      } else {
        // Willow Ford's crossings (landscape).
        await R(() => { const R = window.__railhead, P = R.state.player, W = R.world.WFORD; P.x = W.x + 20 * R.CFG.SCALE; P.z = W.z - 6; R.state.time = 6 * 3600; });
        await lookAt(await R(() => window.__railhead.world.WFORD.x + 20 * window.__railhead.CFG.SCALE), await R(() => window.__railhead.world.WFORD.z), 0.8);
        await page.screenshot({ path: screenshotPath('crossing-willow-landscape') });
        await lookAt(-12, -3, 1.6);
        const dc = await R(() => window.__railhead.drawCalls);
        console.log(`  draw calls at the hub (landscape, 200 walkers): ${dc}`);
        if (dc > 100) problems.push(`draw calls ${dc} at the hub (landscape)`);
      }
      if (errors.length) problems.push(`console errors (${orient}): ` + errors.join(' | '));
    } finally { await browser.close(); }
  }
}
