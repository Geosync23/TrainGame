// Check: the prototype's trains (D25, builder T; plans/proto-tech.md section 2).
// - A whole day in the prototype with a scripted player who only walks and taps (walkTo, useSwitch, rrWaveOff): it
//   reads rrSwitchNeeds, walks to each switch stand in time (over the footbridges or the walkway) and throws the switch
//   for the next train, in and out, and walks up to each standing train's engine and waves it off at its time. All 10
//   runs come in and go out in schedule order (5 passenger trains at track 1, 3 freight trains at track 3, 2 through on
//   track 2); none is cancelled; the worst lateness is small (the schedule fits the real running times with a careful
//   player); never more than 3 of the railroad's trains on the map; every switch the player threw; the events of each
//   run come in order; the same day twice gives the same state hash (once saved and loaded mid-day).
// - A wrong switch: a through train meets a switch set against it, stops short of it and waits (trainSwitchWait, shown
//   late on the board, never cancelled), and runs on when the player throws it.
// - Wave-off refusals in the prototype: not stopped yet, too far from the engine, from the footbridge, a through train,
//   travellers still in line (ppReady false) and goods still to unload or load (pgReady false); a late wave-off makes
//   the next train at that end late (not cancelled).
// - rrSwitchNeeds lists every switch of every run (through runs too, all straight, split into in and out);
//   rrBoardRows has a row per run with track t1 / t2 / t3; rh.scenario('proto') and 'protop1' stand trains at their
//   tracks; rrDebugJump works in the prototype.
// - The footbridges: walkers on them have a height (walkBridgeY) following the stairs and the deck; a train passes under
//   a walker on the deck; the handcart cannot use them.
// - Screenshots at phone size, portrait and landscape: the scenario with two trains standing, and a through train
//   passing under the footbridges.

const { openGame, screenshotPath } = require('./browser');

// The scripted player, run in the page: returns the commands for this tick.
// A careful player: it knows the day's plan (rrSwitchNeeds, the standing trains) and picks the job whose latest start
// (its time less the walk to it, at 2u a minute and a third more for the way round) comes first. A switch whose next
// move is still blocked by an earlier one set the other way (a train still to pass it) is a job to walk to and wait at,
// once that train is moving. Waving off: at its time (or later by mem.waveLate[svc]) once it is ready.
function botSource() {
  return function protoBot(R, S, mem) {
    const P = S.player;
    if (S.pd && S.pd.ph === 'morning') return [{ t: 'pdStart' }];
    if (P.act) return [];
    const T = S.track, rows = R.rr.rrSwitchNeeds(S), bySw = {}, jobs = [];
    for (const n of rows) if (!n.passed) (bySw[n.sw] = bySw[n.sw] || []).push(n);
    const runById = id => S.rr.runs.find(q => q.id === id), moving = run => run && (run.ph === 'in' || (run.ph === 'out' && run.go));
    for (const [sw, list] of Object.entries(bySw)) {
      const W = T.switches[+sw], at = [W.stand.ux, W.stand.uz], first = list[0];
      if (!first.set) jobs.push({ k: 'sw', sw: +sw, at, time: first.byTime, ready: !R.switchLockReason(S, +sw), readyAt: S.time });
      else { const nx = list.find(n => n.want !== first.want); if (nx && moving(runById(first.run))) jobs.push({ k: 'sw', sw: +sw, at, time: nx.byTime, ready: false, readyAt: Math.max(S.time, first.byTime + 240) }); }
    }
    for (const run of S.rr.runs) {
      if (run.ph === 'in' && !run.through) {   // coming in: its wave-off is a job already, at its stopping place
        const Pp = R.proto.PROTO, x = Pp.STOP[run.track][run.to] - (run.to === 'E' ? 1 : -1) * 4.4, z = (run.track === 't1' ? -Pp.D1 : Pp.D3) - 1.72, lateBy = (mem.waveLate && mem.waveLate[run.svc]) || 0;
        jobs.push({ k: 'wave', tr: run.slot, at: [x, z], time: run.dep + lateBy, readyAt: run.dep + lateBy, ready: false });
      }
      if (run.ph !== 'stand') continue;
      const tr = S.trains[run.slot], sp = R.rr.rrWaveSpot(S, tr.id), lateBy = (mem.waveLate && mem.waveLate[run.svc]) || 0;
      const near = R.rr.rrEngineDist(S, tr) <= R.rr.RR.REACH && !R.proto.walkBridgeAt(T, P.x, P.z) && Math.hypot(P.x - sp.x, P.z - sp.z) < 2;
      jobs.push({ k: 'wave', tr: tr.id, at: [sp.x, sp.z], time: run.dep + lateBy, readyAt: run.dep + lateBy, ready: near && S.time >= run.dep + lateBy && (run.ready || S.time >= run.dep + lateBy + 300) });
    }
    if (!jobs.length) return [];
    const walkS = j => Math.hypot(j.at[0] - P.x, j.at[1] - P.z) * 1.33 / 2 * 60, key = j => j.k + (j.k === 'sw' ? j.sw : j.tr);
    jobs.sort((a, b) => (a.time - walkS(a)) - (b.time - walkS(b)) || a.time - b.time);
    // Look ahead over the three most pressing jobs: the order that makes them least late (walking between them at
    // 2u a minute, a third more for the way round, waiting for each to be ready) gives the next job.
    const top = jobs.slice(0, 3), dS = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) * 1.33 / 2 * 60;
    const cost = order => { let t = S.time, at = [P.x, P.z], c = 0; for (const q of order) { t = Math.max(t + dS(at, q.at), q.readyAt); const l = Math.max(0, t - q.time); c += l * l; t += 60; at = q.at; } return c; };
    const perms = a => a.length <= 1 ? [a] : [].concat(...a.map((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map(r => [x].concat(r))));
    let best = null, bc = Infinity, heldC = Infinity;
    for (const o of perms(top)) { const c = cost(o); if (c < bc) { bc = c; best = o[0]; } if (key(o[0]) === mem.job) heldC = Math.min(heldC, c); }
    // Keep to the job in hand unless another order is clearly better (two minutes' lateness).
    const held = jobs.find(q => key(q) === mem.job);
    const j = held && (held.ready || heldC <= bc + 120 * 120) ? held : best, here = Math.hypot(j.at[0] - P.x, j.at[1] - P.z) < 1.6;
    if (j.time - walkS(j) - S.time > 3 * 3600) return [];
    mem.job = key(j);
    if (j.k === 'sw' && j.ready) return P.mode === 'idle' || !P.use || P.use.id !== j.sw ? [{ t: 'useSwitch', sw: j.sw }] : [];
    if (j.k === 'wave' && j.ready) return [{ t: 'rrWaveOff', tr: j.tr }];
    if (here) return [];
    if (P.mode === 'to' && !P.use && Math.hypot(P.tx - j.at[0], P.tz - j.at[1]) < 0.5) return [];   // on the way already
    return [{ t: 'walkTo', x: Math.round(j.at[0] * 100), z: Math.round(j.at[1] * 100) }];
  };
}

module.exports = async function checkProtoTrains() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    try {
      if (orient === 'portrait') {
        // ---- A whole day with the scripted player, twice (the second saved and loaded at 10:00) ----
        const day = await page.evaluate((src) => {
          const R = window.__railhead, bot = eval('(' + src + ')'), B = R.proto.PROTO.BOUNDS;
          const playDay = (roundTrip, waveLate) => {
            let S = R.newState(1866, 'proto');
            const mem = { waveLate }, log = [], bad = [], thrown = [];
            let maxOn = 0;
            while (!(S.pd.ph === 'evening' || S.pd.ph === 'summary') && S.time < 17 * 3600) {
              if (roundTrip && S.time === 4 * 3600) S = JSON.parse(JSON.stringify(S));   // 10:00: saved and loaded
              const ev = R.simTick(S, bot(R, S, mem));
              for (const e of ev) {
                if (/^rr|^trainSwitchWait$/.test(e.t)) log.push({ ...e, time: S.time });
                if (e.t === 'switchThrown') thrown.push(e.sw);
              }
              let on = 0;
              for (const tr of S.trains) if (tr.owner === 'rr' && R.trainPoses(S.track, tr).some(p => p.x >= B.x0 && p.x <= B.x1)) on++;
              maxOn = Math.max(maxOn, on);
            }
            const runs = S.rr.runs.map(r => ({ svc: r.svc, ph: r.ph, through: !!r.through, arrLate: r.tArr === null ? null : r.tArr - r.arr, depLate: r.through ? null : r.tWave === null ? null : r.tWave - r.dep, tGone: r.tGone }));
            return { hash: R.stateHash(S), runs, maxOn, thrown: thrown.length, swThrown: [0, 1, 2, 3].map(k => thrown.filter(q => q === k).length), waits: log.filter(e => e.t === 'trainSwitchWait').length, ph: S.pd.ph, stats: S.pd.stats,
              order: S.rr.runs.map(r => r.svc + ':' + log.filter(e => e.run === r.id && e.t !== 'trainSwitchWait').map(e => e.t.slice(2)).join(',')), end: S.time,
              slotsFree: S.trains.filter(t => t.owner === 'rr').every(t => t.away && !t.consist.length), bad };
          };
          // The trains alone (integrator, 2026-11-10): P's travellers and F's goods are always ready here, as this player
          // neither punches nor unloads; check-proto-day.js plays the whole day with them (tests/proto-bot.js).
          const keep = { pp: window.ppReady, pg: window.pgReady };
          window.ppReady = () => true; window.pgReady = () => true;
          try {
            const t0 = performance.now(), a = playDay(false), ms = performance.now() - t0, b = playDay(true);
            const c = playDay(false, { p2: 60 * 60 });   // p2 (leaving west at 09:30) waved off an hour late
            return { a, b, c, ms };
          } finally { window.ppReady = keep.pp; window.pgReady = keep.pg; }
        }, botSource().toString());
        const A = day.a, fmt = s => s === null ? '-' : `${Math.round(s / 60)}m`;
        console.log(`  a day played in ${Math.round(day.ms)} ms, ended ${(A.end / 3600 + 6).toFixed(2)}h (${A.ph}); runs (arrival / departure lateness): ${A.runs.map(r => `${r.svc} ${r.ph} ${fmt(r.arrLate)}/${fmt(r.depLate)}`).join(', ')}`);
        console.log(`  switches thrown ${A.thrown}, waits at a switch ${A.waits}, at most ${A.maxOn} trains on the map; stats ${JSON.stringify(A.stats)}`);
        console.log(`  events: ${A.order.join(' | ')}`);
        problems.push(...A.bad);
        if (A.runs.length !== 10) problems.push(`${A.runs.length} runs, expected 10`);
        for (const r of A.runs) if (r.ph !== 'gone') problems.push(`${r.svc} did not leave (${r.ph})`);
        for (const r of A.runs) {
          const late = Math.max(r.arrLate || 0, r.depLate || 0);
          if (late > 5 * 60) problems.push(`${r.svc} was ${fmt(late)} late with a careful player (limit 5 minutes)`);
        }
        const want = { stop: 'Due,Entered,Arrived,Ready,WavedOff,Left', thru: 'Due,Entered,Passed,Left' };
        for (const o of A.order) { const [svc, seq] = o.split(':'), r = A.runs.find(q => q.svc === svc); if (seq !== (r.through ? want.thru : want.stop)) problems.push(`${svc}'s events: ${seq}`); }
        const leftOrder = A.runs.slice().sort((p, q) => p.tGone - q.tGone).map(r => r.svc).join(',');
        console.log(`  left in order ${leftOrder}`);
        // Every switch move is the player's: each switch is thrown over and back during the day (a train leaves a switch
        // as it was set, so the next train often needs no throw there: 20 throws in all).
        if (A.thrown < 16 || A.swThrown.some(n => n < 2)) problems.push(`switch throws: ${A.thrown} (per switch ${A.swThrown})`);
        if (A.maxOn > 3) problems.push(`${A.maxOn} of the railroad's trains on the map at once`);
        if (!A.slotsFree) problems.push('a train slot is still in use at the end of the day');
        if (A.ph !== 'evening' && A.ph !== 'summary') problems.push(`the day did not reach the evening (${A.ph})`);
        if (A.stats.trains !== 10) problems.push(`the day counted ${A.stats.trains} trains`);
        if (day.b.hash !== A.hash) problems.push(`the same day twice (saved and loaded at 10:00) gave a different result (${A.hash} / ${day.b.hash})`);
        const C = day.c, cl = svc => C.runs.find(r => r.svc === svc);
        console.log(`  p2 waved off an hour late: ${C.runs.map(r => `${r.svc} ${fmt(r.arrLate)}/${fmt(r.depLate)}`).join(', ')}`);
        if (C.runs.some(r => r.ph !== 'gone')) problems.push(`with p2 waved off late, not every run left: ${C.runs.filter(r => r.ph !== 'gone').map(r => r.svc + ' ' + r.ph)}`);
        if (!(cl('p2').depLate >= 60 * 60)) problems.push('p2 was not waved off late');
        if (!(cl('p3').arrLate > 5 * 60)) problems.push(`p3 (in from the west after the late p2 went out west) was not late (${fmt(cl('p3').arrLate)})`);

        // ---- A wrong switch, refusals, the needs, the board rows, the scenarios, the bridges ----
        const r = await page.evaluate(() => {
          const R = window.__railhead, Pr = R.proto, out = { bad: [] }, B = m => out.bad.push(m), SW = Pr.PROTO_SW;
          // x1 (through, west > east) meets W1 set against it, before the station.
          let S = R.newState(1866, 'proto');
          R.simTick(S, [{ t: 'pdStart' }]);
          const x1 = R.rr.rrDebugJump(S, 'x1');
          if (!x1) B('rrDebugJump found no x1');
          S.track.switches[SW.W1].state = 'R';
          const needs = R.rr.rrSwitchNeeds(S).filter(n => n.run === x1.id);
          out.needs = needs.map(n => `${n.sw}${n.want[0]}${n.move[0]}`).join(' ');
          if (needs.length !== 4 || needs.some(n => n.want !== 'normal')) B(`x1's switch needs: ${out.needs}`);
          if (needs.filter(n => n.move === 'in').length !== 2 || needs.find(n => n.sw === SW.W1).set) B(`x1's needs in/out or set: ${out.needs}`);
          const ev = [];
          for (let i = 0; i < 2000 && !ev.some(e => e.t === 'trainSwitchWait'); i++) ev.push(...R.simTick(S, []));
          const w = ev.find(e => e.t === 'trainSwitchWait');
          if (!w || w.sw !== SW.W1) B(`x1 did not wait at W1 (${JSON.stringify(w)})`);
          const tr = S.trains[x1.slot], front = () => R.edgeAt(S.track, S.track.edges[tr.front.e], tr.front.s).x;
          out.waitX = +front().toFixed(2);
          if (!(front() < Pr.PROTO.SW.W1)) B(`x1 ran past W1 (${front()})`);
          for (let i = 0; i < 225; i++) R.simTick(S, []);   // 30 minutes waiting (8 s a tick)
          if (x1.ph !== 'out' || x1.ph === 'cxl') B(`x1 waiting: ${x1.ph}`);
          const row = R.rr.rrBoardRows(S).find(q => q.run === x1.id);
          out.row = { state: row.state, late: row.late, track: row.track };
          if (!(row.late >= 10 * 60 && row.late < 60 * 60) || row.track !== 't2') B(`the board row of the waiting x1: ${JSON.stringify(out.row)}`);
          S.track.switches[SW.W1].state = 'N';
          for (let i = 0; i < 2000 && x1.ph !== 'gone'; i++) R.simTick(S, []);
          if (x1.ph !== 'gone') B('x1 did not leave once E1 was thrown');
          out.x1Late = x1.tArr - x1.arr;
          const rows = R.rr.rrBoardRows(S);
          if (rows.length !== 10 || rows.filter(q => q.track === 't1').length !== 5 || rows.filter(q => q.track === 't3').length !== 3 || rows.filter(q => q.track === 't2').length !== 2) B(`board rows: ${rows.map(q => q.svc + q.track).join(' ')}`);
          // Refusals with p2 and f1 standing (rh.scenario('proto')).
          S = R.rr.protoDebugScenario(R.newState(1866, 'proto'), 9, 20, ['p2', 'f1']);
          const p2 = S.rr.runs.find(q => q.svc === 'p2'), f1 = S.rr.runs.find(q => q.svc === 'f1'), tp = S.trains[p2.slot], tf = S.trains[f1.slot];
          const wave = (tr) => R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }]).filter(e => e.t === 'rrRefused' || e.t === 'rrWavedOff');
          const why = [];
          let e = wave(tp); why.push(e[0] && e[0].why);
          if (!(e[0] && e[0].t === 'rrRefused' && /Walk up/.test(e[0].why))) B(`far from p2's engine: ${JSON.stringify(e)}`);
          const sp = R.rr.rrWaveSpot(S, tp.id); S.player.x = sp.x; S.player.z = sp.z;
          // ppReady / pgReady false (P's and F's, replaced for this test: travellers still in line, goods aboard).
          const set = (nm, v) => { if (!window['__' + nm]) window['__' + nm] = window[nm]; window[nm] = v === null ? window['__' + nm] : () => v; };
          set('ppReady', false); e = wave(tp); why.push(e[0] && e[0].why); set('ppReady', null);
          if (!(e[0] && e[0].t === 'rrRefused' && /punch/.test(e[0].why))) B(`p2 with travellers in line: ${JSON.stringify(e)}`);
          const fs = R.rr.rrWaveSpot(S, tf.id); S.player.x = fs.x; S.player.z = fs.z;
          set('pgReady', false); e = wave(tf); why.push(e[0] && e[0].why); set('pgReady', null);
          if (!(e[0] && e[0].t === 'rrRefused' && /unloaded and loaded/.test(e[0].why))) B(`f1 with goods aboard: ${JSON.stringify(e)}`);
          S.player.x = sp.x; S.player.z = sp.z;
          // From the footbridge: on the east bridge's deck over track 1.
          const fb = Pr.PROTO_BRIDGES[1];
          S.player.x = fb.x; S.player.z = -4;
          e = wave(tp); why.push(e[0] && e[0].why);
          if (!(e[0] && /footbridge/.test(e[0].why))) B(`from the footbridge: ${JSON.stringify(e)}`);
          S.player.x = sp.x; S.player.z = sp.z;
          set('ppReady', true); e = wave(tp); set('ppReady', null);   // its travellers all punched (P's, replaced here)
          if (!(e[0] && e[0].t === 'rrWavedOff')) B(`p2 at its engine with everything ready was not waved off: ${JSON.stringify(e)}`);
          e = wave(tp); why.push(e[0] && e[0].why);
          if (!(e[0] && e[0].t === 'rrRefused')) B('p2 waved off twice');
          out.why = why;
          // The footbridges: heights along each path; a train passing under a walker on the deck.
          out.ys = Pr.PROTO_BRIDGES.map(b => b.path.map(([x, z, y]) => { const q = Pr.walkBridgeY(S.track, x + (x < b.x ? 0.2 : -0.2) * (Math.abs(x - b.x) > 1 ? 1 : 0), z); return q === null ? null : +q.toFixed(2); }));
          for (const [i, b] of Pr.PROTO_BRIDGES.entries()) {
            if (Math.abs(Pr.walkBridgeY(S.track, b.x, -3) - b.top) > 1e-6) B(`bridge ${b.id}: the deck's height`);
            if (b.under - 0.34 < 4.8) B(`bridge ${b.id}: the deck is ${(b.under - 0.34).toFixed(2)}u over the rail top (at least 4.8)`);
            if (Pr.walkBridgeY(S.track, b.x, -11) !== null) B(`bridge ${b.id}: a height on platform 1's ground`);
          }
          const G = R.world.walkGrid(S.track, true), Wk = R.world.walk;
          const cell = (x, z) => Math.floor((z - Wk.Z0) / Wk.CELL) * Wk.N + Math.floor((x - Wk.X0) / Wk.CELL);
          for (const b of Pr.PROTO_BRIDGES) if (G.cost[cell(b.x, -3)] > 0 || G.cost[cell(b.path[0][0] + (b.p1 === 'w' ? 1 : -1), b.path[0][1])] > 0) B(`the handcart may use bridge ${b.id}`);
          R.world.walkGrid(S.track);
          // A walker on the west bridge's deck over track 2 while x2 (through, east > west) passes beneath.
          S = R.newState(1866, 'proto'); R.simTick(S, [{ t: 'pdStart' }]);
          const x2 = R.rr.rrDebugJump(S, 'x2'), wb = Pr.PROTO_BRIDGES[0];
          S.player.x = wb.x; S.player.z = 0.3; S.player.mode = 'idle';
          let under = false, moved = false, ys = [];
          const ev2 = [];
          for (let i = 0; i < 3000 && x2.ph !== 'gone'; i++) {
            const q = R.simTick(S, i === 0 ? [{ t: 'walkTo', x: Math.round(wb.x * 100), z: -400 }] : []);
            ev2.push(...q);
            const t = S.trains[x2.slot];
            if (t && R.trainPoses(S.track, t).some(p => Math.abs(p.x - wb.x) < p.len / 2 && Math.abs(p.z) < 0.1)) under = true;
            if (S.player.z < -3.5) moved = true;
            if (i % 30 === 0) ys.push(Pr.walkBridgeY(S.track, S.player.x, S.player.z));
          }
          if (!under) B('x2 did not pass under the west footbridge');
          if (!moved) B(`the walker on the deck did not cross while x2 passed (at ${S.player.x.toFixed(2)}, ${S.player.z.toFixed(2)})`);
          if (ev2.some(e => e.t === 'blocked')) B('the walker on the deck was blocked by the train beneath');
          if (x2.ph !== 'gone') B(`x2: ${x2.ph}`);
          return out;
        });
        problems.push(...r.bad);
        console.log(`  x1 waited at W1 with its front at x ${r.waitX}, ${Math.round(r.x1Late / 60)} min late when it passed; its needs ${r.needs}; board row while waiting ${JSON.stringify(r.row)}`);
        console.log(`  refusals: ${r.why.join(' | ')}`);
        console.log(`  heights along the footbridges' paths: ${JSON.stringify(r.ys)}`);
      }
      // ---- rh.scenario('proto') drawn, and a through train under the footbridges ----
      const sc = await page.evaluate(async () => {
        const R = window.__railhead, out = {};
        R.importSave(JSON.stringify({ state: R.rr.protoDebugScenario(R.newState(1866, 'proto'), 9, 20, ['p2', 'f1']) }));
        const S = R.state;
        out.stand = S.rr.runs.filter(q => q.ph === 'stand').map(q => q.svc).sort().join();
        R.camera.zoom = 1.0; R.camera.ox = 0 - S.player.x; R.camera.oz = 0 - S.player.z;
        await new Promise(r => setTimeout(r, 400));
        return out;
      });
      if (sc.stand !== 'f1,p2') problems.push(`${orient}: rh.scenario('proto') stands ${sc.stand}`);
      await page.screenshot({ path: screenshotPath(`prototrains-scenario-${orient}`) });
      await page.evaluate(async () => {
        const R = window.__railhead;
        const S = R.rr.protoDebugScenario(R.newState(1866, 'proto'), 6, 45, ['p1']), x1 = S.rr.runs.find(q => q.svc === 'x1');
        S.rr.runs.find(q => q.svc === 'p1').ph = 'stand';
        S.player.x = R.proto.PROTO_BRIDGES[1].x; S.player.z = -2;   // on the east footbridge's deck
        for (let i = 0; i < 4000 && !(x1.ph === 'out' && S.trains[x1.slot] && R.trainPoses(S.track, S.trains[x1.slot])[0].x > 12); i++) {
          if (x1.ph === 'due' && S.time < R.rr.rrEnterAt(x1) - 120) S.time = R.rr.rrEnterAt(x1) - 120;
          R.simTick(S, []);
        }
        R.importSave(JSON.stringify({ state: S }));
        R.camera.zoom = 1.0; R.camera.ox = 6 - R.state.player.x; R.camera.oz = -2 - R.state.player.z;
        await new Promise(r => setTimeout(r, 400));
      });
      await page.screenshot({ path: screenshotPath(`prototrains-through-${orient}`) });
      if (orient === 'portrait') {
        // rh.scenario('proto') and 'protop1' on a debug page.
        const D = await openGame('portrait', { query: '?paused&debug=1&world=proto' });
        try {
          const got = await D.page.evaluate(() => ['proto', 'protop1'].map(n => { window.rh.scenario(n); return window.rh.state.rr.runs.filter(q => q.ph === 'stand').map(q => q.svc).sort().join('+'); }).join(' '));
          if (got !== 'f1+p2 p1') problems.push(`rh.scenario: ${got}`);
          if (D.errors.length) problems.push('debug page: console errors: ' + D.errors.join(' | '));
        } finally { await D.browser.close(); }
      }
      if (errors.length) problems.push(`${orient}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
module.exports.botSource = botSource;
