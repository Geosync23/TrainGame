// Check: the railroad's trains (D24, builder TR; plans/rework-tech.md section 2).
// - A whole game day in the hub world with a scripted player (it walks to a switch stand and throws a switch a train
//   will need, the earliest first, and walks up to each standing train's engine and waves it off at its time): all 9
//   runs of the schedule come in from off the map, stand at their track, are waved off and leave off the map; the
//   worst lateness (arrival and departure) is small; never more than 2 of the railroad's trains on the map; the
//   events come in order for each run; item and money bookkeeping still balances; the same seed gives the same
//   result twice (state hash).
// - A new game: the first passenger train comes in from off the map and stops short of switch 2 (set against it) until
//   the player throws it; then it runs into the platform with its engine at the far end, clear of both switches.
// - The wave-off's refusals: too far from the engine, not stopped yet, goods for the hub aboard (cgReady false), not
//   one of the railroad's trains; a train left alone leaves by itself an hour after its time.
// - A run that cannot come in (its track taken) waits off the map and is cancelled after 6 game hours.
// - rrSwitchNeeds rows have ttSwitchNeeds' shape; rrBoardRows has a row per run; rrDebugJump jumps the clock to a run.
// - Screenshots at phone size, portrait and landscape: a train coming in (stopped short of switch 2) and standing at
//   the platform, and the busiest view (a passenger train of 4 coaches and a freight train of 5 cars standing, 200
//   walkers, zoomed out) with its draw calls (budget 100).

const { openGame, screenshotPath } = require('./browser');

// The scripted player, run in the page: returns the commands for this tick.
function botSource() {
  return function rrBot(R, S, mem) {
    const P = S.player;
    if (P.mode !== 'idle' || P.use || P.act) return [];
    // Per switch, the earliest move not yet made; a switch to throw is one whose earliest move wants it the other way.
    const firstBySw = {};
    for (const n of R.rr.rrSwitchNeeds(S)) if (!n.passed && firstBySw[n.sw] === undefined) firstBySw[n.sw] = n;
    const todo = Object.values(firstBySw).filter(n => !n.set && n.byTime - S.time < 3 * 3600 && !R.switchLockReason(S, n.sw)).sort((a, b) => a.byTime - b.byTime);
    // The next train to wave off: standing, soonest time first.
    const stand = S.rr.runs.filter(r => r.ph === 'stand').sort((a, b) => a.dep - b.dep)[0];
    const tr = stand && S.trains[stand.slot], near = tr && R.rr.rrEngineDist(S, tr) <= R.rr.RR.REACH;
    // At its time once its work is done (rrReady: with PX merged, a late traveller may still be walking up), and at
    // the latest 5 minutes after its time.
    if (near && S.time >= stand.dep && (stand.ready || S.time >= stand.dep + 300)) return [{ t: 'rrWaveOff', tr: tr.id }];
    const urgent = todo.find(n => n.byTime - S.time < 15 * 60);
    if (urgent) return [{ t: 'useSwitch', sw: urgent.sw }];
    if (tr && stand.dep - S.time < 25 * 60) {
      if (near) return [];   // wait by the engine for its time
      const sp = R.rr.rrWaveSpot(S, tr.id);
      return [{ t: 'walkTo', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }];
    }
    if (todo.length) return [{ t: 'useSwitch', sw: todo[0].sw }];
    return [];
  };
}

module.exports = async function checkRrTrains() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=hub' });
    try {
      if (orient === 'portrait') {
        // ---- A whole game day with the scripted player, twice from the same seed ----
        const day = await page.evaluate((src) => {
          const R = window.__railhead, bot = eval('(' + src + ')'), B = R.world.HUBW.BOUNDS;
          const playDay = (roundTrip) => {
            let S = R.newState(1866, 'hub');
            const mem = {}, log = [], bad = [];
            let maxOn = 0, waits = 0, cargoBad = null;
            const end = 18 * 3600;   // 23:00
            while (S.time < end) {
              if (roundTrip && S.time === 4.5 * 3600) S = JSON.parse(JSON.stringify(S));   // saved and loaded at 09:30 (p2 leaving, f1 standing)
              const ev = R.simTick(S, bot(R, S, mem));
              for (const e of ev) if (/^rr|^trainSwitchWait$/.test(e.t)) log.push({ ...e, time: S.time });
              if (ev.some(e => e.t === 'trainSwitchWait')) waits++;
              let on = 0;
              for (const tr of S.trains) if (tr.owner === 'rr' && R.trainPoses(S.track, tr).some(p => p.x >= B.x0 && p.x <= B.x1)) on++;
              maxOn = Math.max(maxOn, on);
              if (S.trains.some(t => t.owner !== 'rr' && !t.away && t.consist.length)) bad.push('a train other than the railroad\'s came onto the map');
              if (S.tick % 900 === 0 && !cargoBad) { const c = R.cargo.itemCheckConservation(S); if (c.length) cargoBad = c.join('; '); }
            }
            const runs = S.rr.runs.map(r => ({ svc: r.svc, ph: r.ph, arrLate: r.tArr === null ? null : r.tArr - r.arr, depLate: r.tWave === null ? null : r.tWave - r.dep, auto: !!r.auto, tIn: r.tIn, tGone: r.tGone }));
            return { hash: R.stateHash(S), runs, maxOn, waits, log: log.length, logSample: log.filter(e => e.t !== 'trainSwitchWait').map(e => `${e.t}:${e.run}`).join(' '), bad: bad.slice(0, 3), cargoBad,
              order: S.rr.runs.map(r => log.filter(e => e.run === r.id).map(e => e.t).join(',')), stuck: mem.stuck || 0, slotsFree: S.trains.filter(t => t.owner === 'rr').every(t => t.away && !t.consist.length) };
          };
          const t0 = performance.now(), a = playDay(false), ms = performance.now() - t0, b = playDay(true);
          return { a, sameHash: a.hash === b.hash, hashB: b.hash, ms };
        }, botSource().toString());
        const A = day.a;
        problems.push(...A.bad);
        if (A.cargoBad) problems.push('item bookkeeping over the day: ' + A.cargoBad);
        if (A.runs.length !== 9) problems.push(`${A.runs.length} runs planned for the day, expected 9`);
        const notGone = A.runs.filter(r => r.ph !== 'gone');
        if (notGone.length) problems.push('runs that did not come in and leave: ' + notGone.map(r => `${r.svc} (${r.ph})`).join(', '));
        const autos = A.runs.filter(r => r.auto);
        if (autos.length) problems.push('runs the scripted player never waved off (their crew left by itself): ' + autos.map(r => r.svc).join(', '));
        const worstArr = Math.max(...A.runs.map(r => r.arrLate === null ? 1e9 : r.arrLate)), worstDep = Math.max(...A.runs.map(r => r.depLate === null ? 1e9 : r.depLate));
        if (!(worstArr <= 5 * 60)) problems.push(`worst arrival lateness ${Math.round(worstArr / 60)} minutes (limit 5)`);
        if (!(worstDep <= 10 * 60)) problems.push(`worst departure lateness ${Math.round(worstDep / 60)} minutes (limit 10)`);
        if (A.maxOn > 2) problems.push(`${A.maxOn} railroad trains on the map at once (at most 2)`);
        if (A.maxOn < 2) problems.push('never two railroad trains at the hub at once (the schedule has passenger trains passing a standing freight train)');
        const wantOrder = 'rrDue,rrEntered,rrArrived,rrReady,rrWavedOff,rrLeft';
        A.order.forEach((o, i) => { if (o !== wantOrder) problems.push(`run ${A.runs[i].svc}'s events: ${o} (expected ${wantOrder})`); });
        if (!A.slotsFree) problems.push('the railroad\'s slots are not empty at the end of the day');
        if (!day.sameHash) problems.push(`the same day from the same seed (the second saved and loaded at 09:30) gave two hashes: ${A.hash} and ${day.hashB}`);
        console.log(`  a day with the scripted player (${Math.round(day.ms)} ms): ${A.runs.map(r => `${r.svc} in ${r.arrLate >= 0 ? '+' : ''}${Math.round(r.arrLate / 60)} out +${Math.round(r.depLate / 60)}`).join(', ')}; worst arrival ${Math.round(worstArr / 60)} min, departure ${Math.round(worstDep / 60)} min; at most ${A.maxOn} on the map; ${A.waits} waits at a switch; hash ${A.hash} twice: ${day.sameHash}`);

        // ---- Stopping short of a wrong switch, the stopping place, the needs rows, the wave-off's refusals ----
        const r = await page.evaluate(() => {
          const R = window.__railhead, out = { bad: [] }, P = m => out.bad.push(m), H = R.world.HUBW, SC = R.CFG.SCALE;
          const S = R.newState(1866, 'hub'), T = S.track;
          let ev = [], waitEv = null, entered = null;
          const run = (n, f) => { for (let i = 0; i < n; i++) { ev = R.simTick(S, f ? f() : []); for (const e of ev) { if (e.t === 'trainSwitchWait' && !waitEv) waitEv = { ...e, time: S.time }; if (e.t === 'rrEntered' && !entered) entered = { ...e, time: S.time }; } } };
          // The needs list for a new game: p1 wants switch 2 normal (it lies reverse).
          const needs = R.rr.rrSwitchNeeds(S.rr.on && (R.simTick(S, []), S));
          const n2 = needs.find(n => n.svc === 'p1' && n.sw === 2);
          if (!n2 || n2.want !== 'normal' || n2.set || n2.done || n2.move !== 'in') P('a new game\'s needs do not list switch 2 normal for p1, not set: ' + JSON.stringify(n2));
          const keys = ['svc', 'service', 'train', 'trainName', 'stop', 'move', 'station', 'stationName', 'sw', 'want', 'byTime', 'by', 'spring', 'set', 'passed', 'done'];
          for (const n of needs) { const miss = keys.filter(k => !(k in n)); if (miss.length) { P('an rrSwitchNeeds row lacks ' + miss.join(', ')); break; } }
          if (needs.some((n, i) => i && n.byTime < needs[i - 1].byTime)) P('rrSwitchNeeds rows are not in time order');
          out.needs = needs.map(n => `${n.by} ${n.svc} ${n.move} sw${n.sw} ${n.want}${n.spring ? ' (spring)' : ''}`).slice(0, 12);
          const rows = R.rr.rrBoardRows(S);
          if (rows.length !== 9 || rows.some(w => w.state !== 'Due')) P(`board rows: ${rows.length}, states ${rows.map(w => w.state).join(',')}`);
          // Run until p1 waits at switch 2.
          for (let i = 0; i < 900 && !waitEv; i++) run(1);
          const p1 = S.rr.runs.find(q => q.svc === 'p1'), tr = S.trains[p1.slot];
          if (!entered) P('p1 never came in');
          else {
            out.entered = { time: entered.time, x: R.edgeAt(T, T.edges[R.rr.rrEntry(T, 'W').e], R.rr.rrEntry(T, 'W').s).x };
            if (!(out.entered.x < H.BOUNDS.x0)) P('p1 did not come in from off the map');
          }
          if (!waitEv || waitEv.sw !== 2 || waitEv.tr !== p1.slot) P('p1 did not stop short of switch 2: ' + JSON.stringify(waitEv));
          const front = R.edgeAt(T, T.edges[tr.front.e], tr.front.s);
          out.waitAt = front.x;
          if (!(front.x < H.SW.PW && front.x > H.SW.PW - 2)) P(`p1 waits with its front at x ${front.x.toFixed(2)}, not just short of switch 2 (x ${H.SW.PW})`);
          if (tr.v !== 0 || !/switch/.test(tr.status)) P(`p1 is not standing at the switch: v ${tr.v}, "${tr.status}"`);
          // Refused: not stopped yet.
          ev = R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }]);
          if (!ev.some(e => e.t === 'rrRefused' && /not stopped/.test(e.why))) P('waving off a train coming in was not refused');
          // The player throws switch 2; p1 runs into the platform.
          ev = R.simTick(S, [{ t: 'throwSwitch', sw: 2 }]);
          let arrived = null;
          for (let i = 0; i < 900 && !arrived; i++) { ev = R.simTick(S, []); arrived = ev.find(e => e.t === 'rrArrived'); }
          if (!arrived) P('p1 did not arrive after switch 2 was thrown');
          else {
            const ps = R.trainPoses(T, tr), xs = ps.map(p => p.x);
            out.stand = { front: Math.max(...xs.map((x, i) => x + ps[i].len / 2)), back: Math.min(...xs.map((x, i) => x - ps[i].len / 2)), cars: ps.length };
            if (Math.abs(out.stand.front - (H.SW.PE - 5 * SC - R.rr.RR.CLEAR)) > 0.6) P(`p1's engine stops at x ${out.stand.front.toFixed(2)}, not at the platform's far end`);
            const occ = R.occupiedSwitches(S);
            if (occ[2] !== undefined || occ[3] !== undefined) P('p1 stands on a switch\'s leg (switches 2 or 3 occupied)');
            if (out.stand.back < H.PLATFORM.x0 || out.stand.front > H.PLATFORM.x1) P('p1 is not all along the platform');
            const row = R.rr.rrBoardRows(S).find(w => w.svc === 'p1');
            if (!row || row.state !== 'At the platform') P('the board row of p1 at the platform says ' + (row && row.state));
          }
          // Refusals: too far; goods aboard; not ours.
          S.player.x = 40; S.player.z = -20;
          ev = R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }]);
          if (!ev.some(e => e.t === 'rrRefused' && /Walk up/.test(e.why))) P('waving off from far away was not refused');
          const sp = R.rr.rrWaveSpot(S, tr.id);
          S.player.x = sp.x; S.player.z = sp.z;
          out.waveDist = R.rr.rrEngineDist(S, tr);
          const keep = window.cgReady;
          window.cgReady = () => false;
          ev = R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }]);
          window.cgReady = keep;
          if (!ev.some(e => e.t === 'rrRefused' && /Goods/.test(e.why))) P('waving off with goods for the hub aboard was not refused');
          ev = R.simTick(S, [{ t: 'rrWaveOff', tr: 0 }]);
          if (!ev.some(e => e.t === 'rrRefused')) P('waving off No. 1 was not refused');
          // Waved off early (before 07:00): fine.
          ev = R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }]);
          const w = ev.find(e => e.t === 'rrWavedOff');
          if (!w) P('waving off within reach was not done: ' + JSON.stringify(ev.filter(e => e.t === 'rrRefused')));
          else if (w.late !== 0) P('an early wave-off counted late ' + w.late);
          ev = R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }]);
          if (!ev.some(e => e.t === 'rrRefused' && /on its way/.test(e.why))) P('a second wave-off was not refused');
          let left = null;
          for (let i = 0; i < 900 && !left; i++) { ev = R.simTick(S, []); left = ev.find(e => e.t === 'rrLeft'); }
          if (!left) P('p1 did not leave the map after the wave-off');
          else out.leftAt = S.time;
          // The debug jump (a new game): to f2 (12:30 at the cargo track), skipping the runs before it.
          const S2 = R.newState(1866, 'hub');
          R.simTick(S2, []);
          const j = R.rr.rrDebugJump(S2, 'f2');
          if (!j || j.svc !== 'f2') P('rrDebugJump did not find f2');
          else {
            const skipped = S2.rr.runs.filter(q => q.skipped).map(q => q.svc).join(',');
            if (skipped !== 'p1,f1,p2,p3') P('rrDebugJump skipped ' + skipped);
            let en = null;
            for (let i = 0; i < 30 && !en; i++) { ev = R.simTick(S2, []); en = ev.find(e => e.t === 'rrEntered'); }
            if (!en || S2.rr.runs.find(q => q.id === en.run).svc !== 'f2') P('after rrDebugJump f2 did not come in within 4 minutes');
          }
          return out;
        });
        problems.push(...r.bad);
        console.log(`  new game: p1 came in at ${r.entered && Math.round(r.entered.time / 60)} min from x ${r.entered && r.entered.x}, waited at x ${r.waitAt && r.waitAt.toFixed(2)} short of switch 2; stands x ${r.stand && r.stand.back.toFixed(1)} to ${r.stand && r.stand.front.toFixed(1)} (${r.stand && r.stand.cars} vehicles); wave spot ${r.waveDist && r.waveDist.toFixed(2)}u from the engine`);
        console.log(`  needs at the start: ${r.needs.join('; ')}`);

        // ---- Unattended: the crew leaves by itself an hour late; a run that cannot come in is cancelled ----
        const u = await page.evaluate(() => {
          const R = window.__railhead, out = { bad: [] }, P = m => out.bad.push(m);
          const S = R.newState(1866, 'hub');
          S.track.switches[2].state = 'N';
          const evs = [];
          // Nobody waves p1 off; nobody throws switch 1 for... keep the freight train's track blocked: f1 stands and is
          // never waved off with goods "aboard" (cgReady false for f1), so f3 (17:00, cargo track) can never come in.
          const keep = window.cgReady;
          window.cgReady = (S2, run) => run.svc !== 'f1';
          while (S.time < 4 * 3600) for (const e of R.simTick(S, [])) evs.push({ ...e, time: S.time });
          const p1 = S.rr.runs.find(q => q.svc === 'p1');
          if (!p1.auto || p1.tWave - p1.dep !== 3600) P(`p1 left alone: auto ${p1.auto}, waved ${p1.tWave === null ? 'never' : (p1.tWave - p1.dep) / 60 + ' min after its time'} (expected 60)`);
          // Jump to just before f3 would come in; f1 still holds the cargo track.
          for (const q of S.rr.runs) if (q.ph === 'due' && q.svc !== 'f3') { q.ph = 'gone'; q.skipped = true; }
          const f3 = S.rr.runs.find(q => q.svc === 'f3');
          S.time = Math.floor((f3.arr - 3 * 3600) / 8) * 8;
          while (S.time < f3.arr + 6 * 3600 + 120) for (const e of R.simTick(S, [])) evs.push({ ...e, time: S.time });
          window.cgReady = keep;
          const f1 = S.rr.runs.find(q => q.svc === 'f1');
          if (f1.ph !== 'stand') P('f1 with goods aboard did not keep standing (' + f1.ph + ')');
          const cx = evs.find(e => e.t === 'rrCancelled');
          if (f3.ph !== 'cxl' || !cx) P('f3, its track taken all along, was not cancelled');
          else out.cxl = Math.round((cx.time - f3.arr) / 60);
          return out;
        });
        problems.push(...u.bad);
        console.log(`  left alone: p1's crew left an hour late; f3 cancelled ${u.cxl} min after its time`);
      }

      // ---- Screenshots: p1 coming in (stopped short of switch 2) and standing at the platform; the busiest view ----
      const look = async (name, zoom, fx, fz) => {
        await page.evaluate(([zoom, fx, fz]) => { const R = window.__railhead; R.camera.zoom = zoom; R.camera.ox = fx - R.state.player.x; R.camera.oz = fz - R.state.player.z; }, [zoom, fx, fz]);
        await page.waitForTimeout(600);
        const dc = await page.evaluate(() => window.__railhead.drawCalls);
        await page.screenshot({ path: screenshotPath(`rrtrains-${name}-${orient}`) });
        return dc;
      };
      const dc = {};
      const st1 = await page.evaluate(() => {
        const R = window.__railhead, S = R.state;
        for (let i = 0; i < 1200 && !S.trains[3].swWait && S.trains[3].swWait !== 0; i++) R.step(1);
        const tr = S.trains[3];
        return { wait: tr.swWait, x: tr.away ? null : R.edgeAt(S.track, S.track.edges[tr.front.e], tr.front.s).x };
      });
      if (st1.wait !== 2) problems.push(`${orient}: in the page, p1 is not waiting at switch 2 (${JSON.stringify(st1)})`);
      dc.comingIn = await look('comingin', 1.5, -14, -2);
      await page.evaluate(() => {
        const R = window.__railhead, S = R.state;
        R.send({ t: 'throwSwitch', sw: 2 });
        for (let i = 0; i < 900 && !(S.rr.runs[0] && S.rr.runs[0].ph === 'stand'); i++) R.step(1);
        R.step(3);
      });
      dc.standing = await look('standing', 1.5, 15, -2);
      // The busiest view: p4 (4 coaches) at the platform and f2 (5 cars) at the cargo track, 200 walkers, zoomed out.
      const busy = await page.evaluate(async () => {
        const R = window.__railhead, S = R.state;
        R.rr.rrDebugJump(S, 'f2');
        for (const W of S.track.switches) { W.state = 'N'; if (W.spring) W.lever = 'N'; }
        for (let i = 0; i < 1200 && !(S.rr.runs.find(q => q.svc === 'f2').ph === 'stand'); i++) R.step(1);
        R.rr.rrDebugJump(S, 'p4');
        for (let i = 0; i < 1200 && !(S.rr.runs.find(q => q.svc === 'p4').ph === 'stand'); i++) R.step(1);
        R.setCrowd && R.setCrowd(200);
        return S.trains.filter(t => t.owner === 'rr' && !t.away).map(t => t.consist.length);
      });
      if (busy.sort().join() !== '5,6') problems.push(`${orient}: the busiest view has railroad trains of ${busy.join(' and ')} vehicles (expected 5 and 6)`);
      dc.busiest = await look('busiest', 0.4, -12, -2);
      dc.busiestClose = await look('busiest-close', 1.0, -8, -4);
      await page.evaluate(() => { const R = window.__railhead; R.setCrowd && R.setCrowd(0); });
      console.log(`  ${orient}: draw calls coming in ${dc.comingIn}, standing ${dc.standing}, busiest (two trains, 200 walkers, zoom 0.4) ${dc.busiest}, the same at zoom 1.0 ${dc.busiestClose}`);
      for (const [k, v] of Object.entries(dc)) if (!(v < 100)) problems.push(`${orient}: ${v} draw calls (${k}), over the phone budget of 100`);
      if (errors.length) problems.push(`${orient}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
module.exports.botSource = botSource;
