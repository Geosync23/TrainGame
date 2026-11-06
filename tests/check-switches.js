// Check: manual switches (D20). Run in the game's own simulation, in the real start.
// - A new game (D22 (7)): the platform switch (1) lies straight, for the main track, so the first departure needs it
//   thrown (its needs are not done); Willow Ford's run-around switches (2, 3) are spring switches, 2 lying for the
//   main track and 3 for the loop. The parts below that were written for D20's start (switch 1 lying for the
//   platform track) set it so first, as a player who threw it would have it.
// - No train ever throws a switch: a timetabled day played by the M1 bot (which throws switches only by walking to the
//   stand) changes a switch's lever only with a switchThrown event; a spring switch pushed over by a trailing train
//   springs back to its lever.
// - A facing switch set against a train's route: it stops CFG.STOP_GAP short of the switch, says so (status, the
//   trainSwitchWait event, a 'switch' alert and one telegram naming the switch), and goes on to arrive when it is
//   thrown right. The same for a spring switch's lever.
// - Trailing through a switch set against it (Send to, and Forward): it stops CFG.STOP_GAP short of the switch's
//   block, never on it; the switch and the train are unharmed; thrown right, it goes on.
// - A switch under a train, or one a moving train could not stop for, cannot be thrown.
// - Send to lists the switches to throw.
// - The needs data (ttSwitchNeeds): for a timetabled day, switch 1 reverse for both hub departures and both hub
//   arrivals, switch 2 normal (arrival and the engine's way back onto its cars) and switch 3 reverse (out of the
//   headshunt) at Willow Ford, with deadlines between the departure and the arrival, in time order; ticked off (done)
//   when set, not done when set wrong, passed once the train has made the move.
// - Save and load keep a train waiting at a switch (same hash as running on, it goes on when thrown), and the needs
//   data; the schema 15 sample save gets the spring switches.

const fs = require('fs');
const path = require('path');
const { openGame } = require('./browser');
const { BOT_SRC } = require('./m1-bot');

module.exports = async function checkSwitches() {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    const v15 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v15.json'), 'utf8')).save;
    const r = await page.evaluate(([src, v15]) => {
      const R = window.__railhead, out = {}, SC = R.CFG.SCALE, GAP = R.CFG.STOP_GAP, H = 450;
      out.gap = GAP;
      const factory = (0, eval)('(' + src + ')');
      const run = (S, n, stop) => { const evs = []; for (let i = 0; i < n; i++) { const e = R.simTick(S, []); evs.push(...e); if (stop && stop(S, e)) break; } return evs; };
      const xz = (S, p) => R.edgeAt(S.track, S.track.edges[p.e], p.s);
      const node = (S, sw) => S.track.nodes[S.track.switches[sw].node];
      const lead = (S, tr) => tr.m > 0 ? tr.front : R.trackWalk(S.track, { e: tr.front.e, s: tr.front.s, d: -tr.front.d }, R.trainLength(tr)).pos;
      const spot = (S, name, f) => { const k = R.world.STATIONS.start.find(s => s.id === name.split('.')[0]).tracks[name.split('.')[1]]; const x = k.x0 + (k.x1 - k.x0) * f, z = k.z0 + (k.z1 - k.z0) * f; const n = R.trackNearest(S.track, x, z); return { t: 'trainSendTo', tr: 0, e: n.e, s: Math.round(n.s * 1000) }; };

      // 1. A new game's switches; then D20's start (switch 1 for the platform track) for the parts below.
      let S = R.newState(1866);
      const W = S.track.switches;
      out.start = W.map(w => ({ state: w.state, spring: !!w.spring, lever: w.lever || null }));
      out.startNeeds = R.tt.ttSwitchNeeds(S).filter(n => n.sw === 1).map(n => n.done);
      const fresh = () => { const T = R.newState(1866); T.track.switches[1].state = 'R'; return T; };
      S = fresh();

      // 2. A facing switch (2, a spring switch's lever) set against the route to Willow Ford: No. 1 waits short of it.
      R.simTick(S, [{ t: 'throwSwitch', sw: 2 }]);
      let ev = R.simTick(S, [spot(S, 'willow.main', 0.5)]);
      const rs = ev.find(e => e.t === 'routeSet');
      out.sendThrows = rs ? rs.throws : null;
      ev = run(S, 6000, st => st.trains[0].v === 0 && st.trains[0].swWait !== undefined);
      let tr = S.trains[0];
      out.faceWait = tr.swWait; out.faceStatus = tr.status;
      { const p = xz(S, lead(S, tr)), n = node(S, 2); out.faceGap = Math.hypot(p.x - n.x, p.z - n.z); }
      out.faceEvent = ev.filter(e => e.t === 'trainSwitchWait').map(e => e.sw);
      run(S, 16);
      out.faceAlert = R.office.alertsOf(S).filter(a => a.k === 'switch').map(a => a.title);
      out.faceTelegrams = S.tg.list.filter(g => g.kind === 'switch').map(g => g.title);
      // Save and load while it waits: the same state; then thrown, it goes on and arrives.
      const json = R.exportSave(), copy = JSON.parse(JSON.stringify(S));
      out.saveSame = R.stateHash(R.migrate(JSON.parse(JSON.stringify({ state: JSON.parse(JSON.stringify(S)) }))).state) === R.stateHash(S);
      run(S, 40); run(copy, 40);
      out.saveRunSame = R.stateHash(S) === R.stateHash(copy) && S.trains[0].swWait === 2;
      out.lockedNow = R.switchLockReason(S, 2);
      ev = R.simTick(S, [{ t: 'throwSwitch', sw: 2 }]);
      out.faceThrown = ev.some(e => e.t === 'switchThrown');
      ev = run(S, 4000, (st, e) => e.some(x => x.t === 'trainArrived'));
      out.faceArrived = ev.some(e => e.t === 'trainArrived');
      out.faceOnMain = (() => { const ps = R.trainPoses(S.track, S.trains[0]); return ps.length && ps.every(p => Math.abs(p.z - R.world.WFORD.z) < 0.3); })();
      out.alertGone = !R.office.alertsOf(S).some(a => a.k === 'switch');
      out.saveJson = json;

      // 3. Trailing through a switch set against it: switch 1 thrown to the main track, No. 1 sent from the platform to
      //    the spur, and then run Forward: it stops short, never on the switch; the switch is unchanged.
      for (const how of ['send', 'run']) {
        const T = fresh(), t3 = T.trains[0];
        R.simTick(T, [{ t: 'throwSwitch', sw: 1 }]);
        const before = JSON.stringify(T.track.switches.map(w => [w.state, w.lever]));
        R.simTick(T, [how === 'send' ? { t: 'trainSendTo', tr: 0, e: T.track.switches[1].trunk, s: Math.round(T.track.edges[T.track.switches[1].trunk].len / 2 * 1000) } : { t: 'trainRun', tr: 0, dir: 1 }]);
        let onSw = false;
        run(T, 3000, st => { if (R.occupiedSwitches(st)[1] !== undefined) onSw = true; return st.trains[0].v === 0 && st.tick > 30; });
        const Wl = T.track.switches[1], leg = T.track.edges[Wl.reverse], far = T.track.nodes[leg.a === Wl.node ? leg.b : leg.a], p = xz(T, lead(T, t3));
        out['trail_' + how] = { gap: Math.hypot(p.x - far.x, p.z - far.z), onSw, same: JSON.stringify(T.track.switches.map(w => [w.state, w.lever])) === before, status: t3.status, cars: R.trainPoses(T.track, t3).length };
        R.simTick(T, [{ t: 'throwSwitch', sw: 1 }]);
        run(T, 200);
        out['trail_' + how].goesOn = R.occupiedSwitches(T)[1] === 0 || t3.v > 0;
      }

      // 4. A switch a moving train could not stop for is locked; one under it too. A facing non-spring switch (1)
      //    against a route from the spur back to the platform: it waits short of the switch node.
      {
        const T = fresh(), t4 = T.trains[0];
        R.simTick(T, [spot(T, 'willow.main', 0.5)]);
        let near = null, occ = null;
        run(T, 3000, st => {
          if (near === null && R.tt.switchApproach(st)[1] === 0 && R.occupiedSwitches(st)[1] === undefined) near = R.switchLockReason(st, 1);
          if (occ === null && R.occupiedSwitches(st)[1] === 0) { occ = R.switchLockReason(st, 1); const e = R.simTick(st, [{ t: 'throwSwitch', sw: 1 }]); out.occRefused = e.some(x => x.t === 'switchLocked') && st.track.switches[1].state === 'R'; }
          return occ !== null && R.occupiedSwitches(st)[1] === undefined;
        });
        out.approachLock = near; out.occLock = occ;
        R.simTick(T, [{ t: 'trainStop', tr: 0 }]); run(T, 200);
        R.simTick(T, [{ t: 'throwSwitch', sw: 1 }]);   // to the main track: against a way back to the platform
        R.simTick(T, [spot(T, 'hub.platform', 0.5)]);
        run(T, 3000, st => st.trains[0].v === 0 && st.trains[0].swWait !== undefined);
        const p = xz(T, lead(T, t4)), n = node(T, 1);
        out.face1 = { wait: t4.swWait, gap: Math.hypot(p.x - n.x, p.z - n.z) };
        R.simTick(T, [{ t: 'throwSwitch', sw: 1 }]);
        const e = run(T, 4000, (st, x) => x.some(y => y.t === 'trainArrived'));
        out.face1.arrived = e.some(x => x.t === 'trainArrived');
      }

      // 5. The needs data for a timetabled day, and a day played by the M1 bot with switch 1 set wrong at the start:
      //    the bot throws it (walking to the stand); no train throws a switch; spring switches spring back.
      {
        const T = fresh();
        R.simTick(T, [{ t: 'ttAssign', tr: 0, on: true }]);
        const N = R.tt.ttSwitchNeeds(T);
        out.needs = N.map(n => ({ svc: n.svc, sw: n.sw, want: n.want, move: n.move, by: n.by, byTime: n.byTime, st: n.station, done: n.done, set: n.set, spring: n.spring }));
        out.needsSorted = N.every((n, i) => !i || N[i - 1].byTime <= n.byTime);
        out.needsWindow = N.every(n => { const sv = T.tt.services[n.svc], a = sv.stops[n.stop], b = sv.stops[n.stop + 1], t0 = (n.move === 'leg' ? a.dep : a.arr) - 5 * 3600, t1 = (n.move === 'leg' ? b.arr : a.dep) - 5 * 3600; return n.byTime >= t0 - 60 && n.byTime <= t1; });
        R.simTick(T, [{ t: 'throwSwitch', sw: 1 }]);
        out.needsWrong = R.tt.ttSwitchNeeds(T).filter(n => n.sw === 1).map(n => n.done);
        const bot = factory(R);
        const levers = () => T.track.switches.map(w => w.spring ? w.lever : w.state);
        let prev = levers(), bad = [], pushed = 0, sprung = 0, throws = 0, prevState = T.track.switches.map(w => w.state);
        for (let i = 0; i < 9 * H; i++) {   // to 14:00: the morning service there and back
          const e = R.simTick(T, bot.decide(T)); bot.observe(T, e);
          const now = levers(), thrown = e.filter(x => x.t === 'switchThrown').map(x => x.sw);
          throws += thrown.length;
          now.forEach((v, k) => { if (v !== prev[k] && !thrown.includes(k)) bad.push(`switch ${k} at tick ${T.tick}`); });
          T.track.switches.forEach((w, k) => { if (w.spring && w.state !== prevState[k] && !thrown.includes(k)) { if (w.state !== w.lever) pushed++; else sprung++; } });
          prev = now; prevState = T.track.switches.map(w => w.state);
          if (i === 4 * H) out.midNeeds = R.tt.ttSwitchNeeds(T).filter(n => n.svc === 0).map(n => ({ sw: n.sw, passed: n.passed, done: n.done }));
        }
        out.botDay = { bad, pushed, sprung, throws, botThrows: bot.mem.stats.switches || 0, events: T.tt.runs.length,
          needs: R.tt.ttSwitchNeeds(T).filter(n => n.svc === 0).map(n => ({ sw: n.sw, passed: n.passed, done: n.done })),
          leversEnd: levers(), statesEnd: T.track.switches.map(w => w.state) };
        out.botDeparted = T.tt.services[0].last === 0 && !T.tt.runs.some(r => r.svc === 0);
        out.cancelled = T.tg.list.filter(g => /ancel/.test(g.title)).map(g => g.title);
        // The needs data survives a save and load.
        const a = JSON.stringify(R.tt.ttSwitchNeeds(T)), L = R.migrate(JSON.parse(JSON.stringify({ state: T }))).state;
        out.needsSaved = JSON.stringify(R.tt.ttSwitchNeeds(L)) === a;
      }

      // 6. The schema 15 sample save: Willow Ford's switches become spring switches; the platform switch keeps its place.
      {
        const sv = R.migrate(JSON.parse(v15)).state;
        out.v15 = { ver: sv.schemaVersion, sw: sv.track.switches.map(w => ({ state: w.state, spring: !!w.spring, lever: w.lever || null, lockedBy: w.lockedBy })) };
      }
      return out;
    }, [BOT_SRC, v15]);

    const problems = [];
    const want = [{ state: 'N', spring: false, lever: null }, { state: 'N', spring: false, lever: null }, { state: 'N', spring: true, lever: 'N' }, { state: 'R', spring: true, lever: 'R' }];
    if (JSON.stringify(r.start) !== JSON.stringify(want)) problems.push('a new game\'s switches (D22: switch 1 straight): ' + JSON.stringify(r.start));
    if (!r.startNeeds.length || r.startNeeds.some(d => d)) problems.push('a new game\'s switch 1 needs should all be still to do (D22): ' + JSON.stringify(r.startNeeds));
    // Facing.
    if (!r.sendThrows || !r.sendThrows.some(w => w.sw === 2 && w.want === 'normal')) problems.push('Send to did not list switch 2 to throw to normal: ' + JSON.stringify(r.sendThrows));
    if (r.faceWait !== 2) problems.push('No. 1 did not wait at switch 2 set against it: ' + r.faceStatus);
    if (!(Math.abs(r.faceGap - r.gap) < 0.05 || Math.abs(r.faceGap - 0.8) < 0.05)) problems.push(`No. 1 stopped ${r.faceGap}u from switch 2 (expected the stop gap)`);
    if (!/set against/.test(r.faceStatus)) problems.push('status: ' + r.faceStatus);
    if (JSON.stringify(r.faceEvent) !== '[2]') problems.push('trainSwitchWait events: ' + JSON.stringify(r.faceEvent));
    if (!r.faceAlert.some(t => /No\. 1 is waiting at switch 2/.test(t))) problems.push('no alert for the train waiting at the switch: ' + JSON.stringify(r.faceAlert));
    if (r.faceTelegrams.length !== 1 || !/No\. 1 is waiting at switch 2 \(Willow Ford\)/.test(r.faceTelegrams[0])) problems.push('telegrams for the switch: ' + JSON.stringify(r.faceTelegrams));
    if (!r.saveSame || !r.saveRunSame) problems.push('a save while waiting at a switch did not load and run on the same');
    if (r.lockedNow !== null) problems.push('the switch a train waits short of was locked: ' + r.lockedNow);
    if (!r.faceThrown || !r.faceArrived || !r.faceOnMain) problems.push('after the throw No. 1 did not go on to Willow Ford\'s main track');
    if (!r.alertGone) problems.push('the switch alert stayed after the train went on');
    // Trailing.
    for (const how of ['send', 'run']) {
      const t = r['trail_' + how];
      if (!(Math.abs(t.gap - 0.8) < 0.05) || t.onSw || !t.same || t.cars !== 3) problems.push(`trailing a switch set against it (${how}): ` + JSON.stringify(t));
      if (!t.goesOn) problems.push(`after the trailing switch was thrown (${how}) the train did not go on`);
    }
    // Locks.
    if (!/could not stop/.test(r.approachLock || '')) problems.push('a switch a moving train could not stop for was not locked: ' + r.approachLock);
    if (!/on it/.test(r.occLock || '') || !r.occRefused) problems.push('a switch under a train could be thrown: ' + r.occLock);
    if (r.face1.wait !== 1 || !(Math.abs(r.face1.gap - 0.8) < 0.05) || !r.face1.arrived) problems.push('facing switch 1 set against the way back: ' + JSON.stringify(r.face1));
    // The needs data.
    const sig = r.needs.map(n => `${n.svc}:${n.sw}:${n.want}:${n.move}`);
    const wantSig = ['0:1:reverse:leg', '0:2:normal:leg', '0:3:reverse:runaround', '0:2:normal:runaround', '0:1:reverse:leg', '1:1:reverse:leg', '1:2:normal:leg', '1:3:reverse:runaround', '1:2:normal:runaround', '1:1:reverse:leg'];
    if (JSON.stringify(sig) !== JSON.stringify(wantSig)) problems.push('the needs data for a timetabled day: ' + JSON.stringify(sig));
    if (!r.needsSorted || !r.needsWindow) problems.push('the needs deadlines are not in order or not between departure and arrival: ' + JSON.stringify(r.needs.map(n => n.by)));
    if (!r.needs.every(n => n.done && n.set)) problems.push('a new game\'s needs are not all set: ' + JSON.stringify(r.needs));
    if (!(r.needs[0].by >= '08:00' && r.needs[0].by <= '08:10') || r.needs[0].st !== 'hub') problems.push('switch 1 for the 08:00 departure: ' + JSON.stringify(r.needs[0]));
    if (!r.needs.filter(n => n.sw !== 1).every(n => n.st === 'willow' && n.spring)) problems.push('Willow Ford needs not at Willow Ford spring switches');
    if (r.needsWrong.some(d => d)) problems.push('with switch 1 set wrong its needs still show done');
    if (r.botDay.bad.length) problems.push('a switch changed without being thrown: ' + r.botDay.bad.slice(0, 5).join(', '));
    if (!(r.botDay.botThrows >= 1 && r.botDay.throws >= 1)) problems.push('the bot did not throw switch 1 for the timetable: ' + JSON.stringify(r.botDay));
    if (!(r.botDay.pushed >= 2 && r.botDay.sprung >= 2)) problems.push('the run-around did not push and spring back Willow Ford\'s spring switches: ' + JSON.stringify(r.botDay));
    if (JSON.stringify(r.botDay.leversEnd) !== JSON.stringify(r.botDay.statesEnd)) problems.push('a spring switch did not spring back: ' + JSON.stringify(r.botDay));
    if (!r.botDeparted || r.cancelled.length) problems.push('the morning service did not run through: ' + JSON.stringify(r.cancelled));
    if (!r.botDay.needs.every(n => n.passed && n.done)) problems.push('after the morning service its needs are not passed: ' + JSON.stringify(r.botDay.needs));
    if (!r.midNeeds || !r.midNeeds.some(n => n.passed) || r.midNeeds.every(n => n.passed)) problems.push('mid-run the needs are not partly passed: ' + JSON.stringify(r.midNeeds));
    if (!r.needsSaved) problems.push('the needs data changed through a save and load');
    if (!(r.v15.ver >= 16) || !r.v15.sw[2].spring || r.v15.sw[2].lever !== 'N' || !r.v15.sw[3].spring || r.v15.sw[3].lever !== 'R' || r.v15.sw.some(w => w.lockedBy !== null)) problems.push('the v15 sample save: ' + JSON.stringify(r.v15));
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    console.log(`  facing wait ${r.faceGap.toFixed(3)}u short of switch 2; trailing ${r.trail_send.gap.toFixed(3)}u (send), ${r.trail_run.gap.toFixed(3)}u (forward); bot day: ${r.botDay.botThrows} throw(s), springs pushed ${r.botDay.pushed} and back ${r.botDay.sprung}`);
    console.log('  needs: ' + r.needs.map(n => `${n.by} switch ${n.sw} ${n.want}${n.spring ? ' (spring)' : ''}`).join('; '));
    return problems;
  } finally { await browser.close(); }
};
