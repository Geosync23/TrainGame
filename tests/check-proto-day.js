// Check: the prototype's day end to end (D25; plans/proto-tech.md section 9, the integrator's acceptance check),
// played by the careful player in tests/proto-bot.js through touch-level commands only.
//
// Two game days from a new prototype game (the bot reads the board, sets every switch in and out, punches every
// ticket, sends the trains off, unloads and loads the freight trains, sorts the handcart, delivers to the three shops,
// ends the day and opens the next):
// - each day all the schedule's runs come in and go out (none cancelled), every one of them through switches the player
//   set (no switch changes but by the player's throws), the ones that stop waved off by the player (D27 foundation: the
//   numbers are read from the game's tables: 9 runs, 8 stopping, 14 goods for the shops, 6 for the railroad);
// - every traveller who came to a line was punched (none left behind), every good brought for the shops delivered at
//   its own shop's door, every good for the railroad loaded;
// - the player ends each day (End the day, before 22:00); the summary's figures match what happened (trains in and
//   on time, punched, left behind, unloaded, loaded, delivered), and items are conserved at each summary;
// - the same two days twice give the same state hash, and so does a save and reload mid-day (day 1, about 12:30);
// - the travellers' line spots never stand on a footbridge's stair or deck;
// - no console errors.
// Screenshots, portrait and landscape (test-output/protoday-*.png): the morning board, a busy moment (both trains
// standing, a line being punched, a train turned see-through over the agent; also close up without the buttons), the
// agent on a footbridge, the evening delivery at a shop door, the summary, and the station's TRAINS board close up
// (its two rows: the next two trains not gone). The busiest frame time and the number
// of sprites drawn are reported. The sim runs headless in the page (simTick in batches); only the screenshots are drawn.

const { openGame, screenshotPath } = require('./browser');
const { PROTO_BOT_SRC } = require('./proto-bot');

const DAYS = 2, MID = 3600 + 450 * 3 + 225;   // 450 ticks a game hour from 05:00: day 1, about 12:30
const MAX_TICKS = 2 * 86400 / 8;

const RUNNER = `window.__pd = (() => {
  const R = window.__railhead, factory = (0, eval)('(' + window.__pdsrc + ')');
  const hm = S => { const s = (S.time + 18000) % 86400; return 'day ' + (Math.floor((S.time + 18000) / 86400) + 1) + ' ' + String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
  function newRec() { return { days: {}, runs: {}, events: {}, swState: null, swOther: 0, shots: {}, sums: [], cons: [], lineOnBridge: [], needs: {}, sw0: {} }; }
  function start(seed) { const S = R.newState(seed, 'proto'), bot = factory(R); return { S, bot, rec: newRec() }; }
  const dayRec = (rec, d) => rec.days[d] = rec.days[d] || { line: 0, punched: 0, missed: 0, boarded: 0, unloaded: 0, loadedEv: 0, delivered: 0, wrongShop: 0, throws: 0, waves: 0, arrived: 0, passed: 0, onTime: 0, late: 0, worstLate: 0, soldOutside: 0 };
  function step(X, n, until) {
    const { S, bot, rec } = X;
    for (let k = 0; k < n; k++) {
      if (until && until(S)) return true;
      // Every switch change must come from the player's throw (switchThrown) this tick.
      const before = S.track.switches.map(w => w.state).join('');
      const cmds = bot.decide(S), ev = R.simTick(S, cmds);
      bot.observe(S, ev);
      const day = S.pd.day, D = dayRec(rec, day), after = S.track.switches.map(w => w.state).join('');
      let thrown = 0;
      for (const e of ev) {
        rec.events[e.t] = (rec.events[e.t] || 0) + 1;
        const run = e.run !== undefined && e.run !== null ? S.rr.runs.find(r => r.id === e.run) : null;
        if (e.t === 'switchThrown') { thrown++; D.throws++; }
        if (e.t === 'ppLine') D.line += e.n;
        if (e.t === 'ppPunched') D.punched++;
        if (e.t === 'ppMissed') D.missed += e.n;
        if (e.t === 'pgUnloaded' && R.pg.pgShopOf(S.items.waybill[e.id])) D.unloaded++;
        if (e.t === 'pgLoaded') D.loadedEv++;
        if (e.t === 'pgDelivered') { D.delivered++; if (S.items.waybill[e.id].consignee.id !== e.shop) D.wrongShop++; }
        if (e.t === 'itemConsumed' && e.reason === 'soldOutside') D.soldOutside++;
        if (e.t === 'rrWavedOff' && !e.auto) D.waves++;
        if (/^rr(Due|Arrived|WavedOff|Left|Cancelled|Passed)$/.test(e.t) && run) {
          const o = rec.runs[e.run] = rec.runs[e.run] || { svc: run.svc, day: run.day, through: !!run.through, ph: 'due', arrLate: null, depLate: null, auto: false };
          if (e.t === 'rrArrived') { o.arrLate = run.tArr - run.arr; o.ph = 'stand'; }
          if (e.t === 'rrPassed') { o.arrLate = e.late; o.ph = 'out'; }
          if (e.t === 'rrWavedOff') { o.depLate = run.tWave - run.dep; o.auto = !!e.auto; o.ph = 'out'; }
          if (e.t === 'rrLeft') o.ph = 'gone';
          if (e.t === 'rrCancelled') o.ph = 'cxl';
        }
        if ((e.t === 'rrArrived' || (e.t === 'rrLeft' && e.through))) { const late = e.late || 0; D.arrived++; if (late > R.rr.RR.LATE_S) D.late++; else D.onTime++; D.worstLate = Math.max(D.worstLate, late); }
        if (e.t === 'pdSummary') {
          rec.sums.push({ ...e.sum, byPlayer: cmds.some(c => c.t === 'pdEndDay'), at: hm(S) });
          rec.cons.push({ at: hm(S), bad: R.cargo.itemCheckConservation(S) });
          if (!rec.shots.summary) rec.shots.summary = { at: hm(S), save: JSON.stringify({ state: S }) };
        }
      }
      if (before !== after && !thrown) rec.swOther++;
      // D27 foundation: the switch settings the day's trains needed (the game's rrSwitchNeeds, the board's switch column),
      // in the order the trains passed them, so the fewest throws a day takes come from the game (each switch's changes
      // of setting, from how it lay at the morning), not from a number written here.
      if (S.pd.ph === 'morning' && !rec.sw0[day]) rec.sw0[day] = S.track.switches.map(w => w.state);
      if (S.pd.ph === 'day') for (const n of R.rr.rrSwitchNeeds(S)) { const N = rec.needs[day] = rec.needs[day] || {}, k = n.run + ':' + n.move + ':' + n.sw; if (!N[k]) N[k] = { sw: n.sw, st: n.want === 'reverse' ? 'R' : 'N', t: Infinity }; if (n.passed && N[k].t === Infinity) N[k].t = S.time; }
      // The travellers' line spots: never on a footbridge.
      if (S.tick % 20 === 0) for (const p of S.pax.list) if (p.s === 'line' && R.proto.walkBridgeAt(S.track, p.x / 100, p.z / 100) && rec.lineOnBridge.length < 5) rec.lineOnBridge.push([p.id, p.x, p.z]);
      // The moments for the screenshots.
      const st = S.rr.runs.filter(r => r.ph === 'stand'), J = S.pax.pp && S.pax.pp.job, P = S.player;
      if (st.length === 2 && J && J.on) {
        const inLine = S.pax.list.filter(p => p.s === 'line').length;
        if (!rec.shots.busy || inLine > rec.shots.busy.b) rec.shots.busy = { b: inLine, at: hm(S), save: JSON.stringify({ state: S }) };
      }
      if (!rec.shots.bridge && R.proto.walkBridgeY(S.track, P.x, P.z) > 4) rec.shots.bridge = { at: hm(S), save: JSON.stringify({ state: S }) };
      if (!rec.shots.deliver && P.act && P.act.k === 'hand') rec.shots.deliver = { at: hm(S), save: JSON.stringify({ state: S }) };
    }
    return false;
  }
  // Two days: until the second day's summary.
  const done = S => S.pd.ph === 'summary' && S.pd.day >= ${DAYS - 1};
  function report(X) {
    const S = X.S, runs = Object.keys(X.rec.runs).map(Number).sort((a, b) => a - b).map(id => X.rec.runs[id]);
    const minThrows = {};
    for (const d of Object.keys(X.rec.needs)) {
      const rows = Object.values(X.rec.needs[d]).sort((a, b) => a.t - b.t), st = (X.rec.sw0[d] || S.track.switches.map(w => w.state)).slice();
      let n = 0;
      for (const r of rows) if (st[r.sw] !== r.st) { n++; st[r.sw] = r.st; }
      minThrows[d] = n;
    }
    return { minThrows, runs, days: X.rec.days, sums: X.rec.sums, cons: X.rec.cons, swOther: X.rec.swOther, lineOnBridge: X.rec.lineOnBridge, hash: R.stateHash(S), tick: S.tick, at: hm(S),
      used: S.items.used.reduce((o, u) => { o[u.reason] = (o[u.reason] || 0) + 1; return o; }, {}), left: R.pg.pgToDeliver(S), consEnd: R.cargo.itemCheckConservation(S),
      stats: X.bot.mem.stats, refusals: X.bot.mem.refusals, notes: X.bot.mem.notes, board: X.bot.mem.board, shotsAt: Object.fromEntries(Object.entries(X.rec.shots).map(([k, v]) => [k, v.at])) };
  }
  return { start, step, done, factory, newRec, report, hm };
})();`;

module.exports = async function checkProtoDay() {
  const problems = [], P = m => problems.push(m);
  const t0 = Date.now();
  let shots = [];
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d27=0' });
    try {
      await page.evaluate(src => { window.__pdsrc = src; }, PROTO_BOT_SRC);
      await page.evaluate(RUNNER);
      // ---- Run A: two days, with a save mid-day ----
      await page.evaluate(() => { window.__A = window.__pd.start(1866); });
      let fin = false;
      for (let chunk = 0; chunk < 40 && !fin; chunk++) {
        fin = await page.evaluate(([mid, max]) => {
          const A = window.__A;
          for (let i = 0; i < 1000; i++) {
            if (window.__pd.done(A.S) || A.S.tick > max) return true;
            window.__pd.step(A, 1);
            if (A.S.tick === mid) A.mid = { json: JSON.stringify({ state: A.S }), mem: JSON.stringify(A.bot.mem), hash: window.__railhead.stateHash(A.S) };
          }
          return false;
        }, [MID, MAX_TICKS]);
      }
      const tA = Date.now();
      const A = await page.evaluate(() => { const r = window.__pd.report(window.__A); r.mid = window.__A.mid && window.__A.mid.hash; return r; });
      // D27 foundation: what a day holds, from the game's own tables (the schedule's runs, the stopping ones, the goods
      // for the shops and for the railroad), not written into the check.
      const W = await page.evaluate(() => { const R = window.__railhead, sch = R.proto.PROTO_SCHEDULE, PG = R.proto.PG;
        return { runs: sch.length, stop: sch.filter(v => !v.through).length, unload: Object.values(PG.UNLOAD).reduce((n, l) => n + l.length, 0), load: sch.reduce((n, v) => n + (v.load || 0), 0) }; });
      // ---- The figures ----
      if (A.sums.length !== DAYS) P(`${A.sums.length} day summaries, expected ${DAYS} (ended at ${A.at})`);
      for (let d = 0; d < DAYS; d++) {
        const runs = A.runs.filter(r => r.day === d), D = A.days[d] || {}, sum = A.sums[d] || {}, tag = `day ${d + 1}`;
        if (runs.length !== W.runs) P(`${tag}: ${runs.length} runs, expected ${W.runs}`);
        const bad = runs.filter(r => r.ph !== 'gone' || r.auto);
        if (bad.length) P(`${tag}: runs not in and out: ${bad.map(r => `${r.svc} (${r.ph}${r.auto ? ', left alone' : ''})`).join(', ')}`);
        if (D.waves !== W.stop) P(`${tag}: ${D.waves} trains waved off by the player, expected ${W.stop} (the through trains need none)`);
        if (!(A.minThrows[d] >= W.stop) || !(D.throws >= A.minThrows[d])) P(`${tag}: ${D.throws} switch throws, but the day's trains needed at least ${A.minThrows[d]} (every stopping train needs its way in and out)`);
        if (!(D.line > 0) || D.punched !== D.line || D.missed) P(`${tag}: travellers ${D.line} came to the lines, ${D.punched} punched, ${D.missed} left behind`);
        if (D.unloaded !== W.unload || D.delivered !== W.unload || D.wrongShop) P(`${tag}: goods ${D.unloaded} unloaded, ${D.delivered} delivered (${D.wrongShop} at the wrong shop), expected ${W.unload} and ${W.unload}`);
        if (D.soldOutside !== W.load) P(`${tag}: ${D.soldOutside} goods for the railroad went away, expected ${W.load}`);
        // The summary's figures against what happened.
        const want = { trains: D.arrived, onTime: D.onTime, late: D.late, punched: D.punched, missed: D.missed, unloaded: D.unloaded, loaded: D.soldOutside, delivered: D.delivered };
        const diff = Object.keys(want).filter(k => sum[k] !== want[k]);
        if (diff.length) P(`${tag}: the summary says ${diff.map(k => `${k} ${sum[k]}`).join(', ')}; what happened: ${diff.map(k => `${k} ${want[k]}`).join(', ')}`);
        if (sum.trains !== W.runs) P(`${tag}: the summary counts ${sum.trains} trains, expected ${W.runs}`);
        if (!sum.byPlayer) P(`${tag}: the day was not ended by the player (the summary came by itself at ${sum.at})`);
      }
      if (A.swOther) P(`a switch changed ${A.swOther} times without the player throwing it`);
      for (const c of A.cons) if (c.bad.length) P(`item conservation at ${c.at}: ${c.bad.slice(0, 3).join('; ')}`);
      if (A.consEnd.length) P('item conservation at the end: ' + A.consEnd.slice(0, 3).join('; '));
      if (A.left.store + A.left.smithy + A.left.saloon) P(`goods still to deliver at the end: ${JSON.stringify(A.left)}`);
      if (A.lineOnBridge.length) P(`travellers stood in line on a footbridge: ${JSON.stringify(A.lineOnBridge)}`);
      if (Object.keys(A.board).length !== DAYS || Object.values(A.board).some(r => r.length !== W.runs)) P(`the bot did not read the ${W.runs} rows of each morning's board: ${JSON.stringify(A.board).slice(0, 200)}`);
      // ---- Run B: the same again; run C: the save mid-day, reloaded ----
      const B = await page.evaluate(max => { const X = window.__pd.start(1866); for (let i = 0; i < max && !window.__pd.done(X.S); i++) window.__pd.step(X, 1); return { hash: window.__railhead.stateHash(X.S), tick: X.S.tick }; }, MAX_TICKS);
      if (B.hash !== A.hash || B.tick !== A.tick) P(`the two days played twice gave different results (${A.hash} at tick ${A.tick}, ${B.hash} at tick ${B.tick})`);
      const C = await page.evaluate(max => {
        const R = window.__railhead, A = window.__A, S = R.migrate(JSON.parse(A.mid.json)).state;
        const loaded = R.stateHash(S), X = { S, bot: window.__pd.factory(R, JSON.parse(A.mid.mem)), rec: window.__pd.newRec() };
        for (let i = 0; i < max && !window.__pd.done(X.S); i++) window.__pd.step(X, 1);
        return { loaded, end: R.stateHash(X.S), tick: X.S.tick };
      }, MAX_TICKS);
      if (!A.mid || C.loaded !== A.mid) P(`the save mid-day loaded with a different hash (${A.mid}, ${C.loaded})`);
      if (C.end !== A.hash || C.tick !== A.tick) P(`the two days reloaded mid-day ended differently (${A.hash} at ${A.tick}, ${C.end} at ${C.tick})`);
      const tC = Date.now();
      shots = await page.evaluate(() => Object.entries(window.__A.rec.shots).map(([k, s]) => ({ k, at: s.at, save: s.save })));
      for (const k of ['busy', 'bridge', 'deliver', 'summary']) if (!shots.some(s => s.k === k)) P(`no ${k} moment recorded for the screenshots`);
      // ---- Report ----
      const mins = s => (s === null || s === undefined ? '-' : (s >= 0 ? '+' : '') + Math.round(s / 60));
      for (let d = 0; d < DAYS; d++) {
        const D = A.days[d] || {}, runs = A.runs.filter(r => r.day === d);
        console.log(`  day ${d + 1}: runs (in/out, minutes late) ${runs.map(r => `${r.svc} ${mins(r.arrLate)}/${mins(r.depLate)}`).join(', ')}`);
        console.log(`  day ${d + 1}: ${D.throws} switch throws (the trains needed at least ${A.minThrows[d]}), ${D.waves} waved off, travellers ${D.line} in line / ${D.punched} punched / ${D.missed} left, goods ${D.unloaded} unloaded / ${D.soldOutside} loaded / ${D.delivered} delivered; summary ${JSON.stringify(A.sums[d])}`);
      }
      console.log(`  bot ${JSON.stringify(A.stats)}; refusals ${JSON.stringify(A.refusals)}${A.notes.length ? '; notes ' + A.notes.join(', ') : ''}`);
      console.log(`  hashes: A ${A.hash} (tick ${A.tick}, ${A.at}), B ${B.hash}, reloaded mid-day ${C.end}; moments ${JSON.stringify(A.shotsAt)}`);
      console.log(`  run time: two days ${((tA - t0) / 1000).toFixed(1)} s, again and reloaded ${((tC - tA) / 1000).toFixed(1)} s`);
      if (errors.length) P('portrait: console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // ---- Screenshots, portrait and landscape; the busiest frame ----
  const frames = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&d27=0' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P(`${orient}: the atlas did not load`));
      await page.waitForTimeout(400);
      // The morning board (a new game opens on it).
      if (await page.evaluate(() => document.getElementById('pdBoard').hidden)) P(`${orient}: the morning board is not open in a new game`);
      await page.screenshot({ path: screenshotPath(`protoday-morning-${orient}`) });
      for (const s of shots) {
        const f = await page.evaluate(async ([json, k]) => {
          const R = window.__railhead; R.importSave(json);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const S = R.state, P = S.player;
          R.pix.pixLookAt(P.x, P.z);   // the default zoom, looking at the agent
          await new Promise(r => setTimeout(r, 600));
          const st = R.pix.stats, see = R.pix.PIX.seeThrough || [];
          return { k, ms: +st.ms.toFixed(2), items: st.items, draws: st.draws, see, sum: !document.getElementById('pdSum').hidden };
        }, [s.save, s.k]);
        await page.screenshot({ path: screenshotPath(`protoday-${s.k}-${orient}`) });
        if (s.k === 'busy') {
          if (!f.see.some(id => /^tr/.test(id))) P(`${orient}: the busy moment: no train turned see-through over the agent (${f.see.join(', ')})`);
          // The busiest frame: the busy moment running at 1x for 2 seconds.
          const ft = await page.evaluate(async () => {
            const R = window.__railhead, X = R.pix;
            X.setSpeed(1); X.PIX.msHist.length = 0; await new Promise(r => setTimeout(r, 2000)); X.setSpeed(0);
            return { avg: +X.stats.msAvg.toFixed(2), max: +X.stats.msMax.toFixed(2), items: X.stats.items, draws: X.stats.draws };
          });
          f.run = ft;
          if (!(ft.avg < 16)) P(`${orient}: the busy moment's frames take ${ft.avg} ms on average`);
        }
        if (s.k === 'busy') {
          // The same moment closer, without the buttons over the world, to see the train turned see-through.
          await page.evaluate(async () => {
            const R = window.__railhead, P = R.state.player, st = document.createElement('style');
            st.id = 'pdShotHide'; st.textContent = '.pdAct, #guideLabel { visibility: hidden !important; }'; document.head.appendChild(st);
            window.__z0 = R.camera.zoom; R.camera.zoom = R.camera.zoom * 2; R.pix.pixLookAt(P.x, P.z);
            await new Promise(r => setTimeout(r, 500));
          });
          await page.screenshot({ path: screenshotPath(`protoday-busy-close-${orient}`) });
          await page.evaluate(() => { document.getElementById('pdShotHide').remove(); window.__railhead.camera.zoom = window.__z0; });
        }
        if (s.k === 'summary' && !f.sum) P(`${orient}: the summary card is not shown on the evening's summary`);
        frames.push(`${orient} ${s.k} (${s.at}): ${f.ms} ms, ${f.items} items, ${f.draws} sprites${f.run ? `; at 1x for 2 s ${f.run.avg} ms average, ${f.run.max} ms worst, ${f.run.draws} sprites` : ''}${f.see.length ? '; see-through ' + f.see.join(' ') : ''}`);
      }
      // The station's TRAINS board, close up (zoom in on the station building's front).
      const bs = shots.find(s => s.k === 'busy');
      if (bs) {
        const tb = await page.evaluate(async json => {
          const R = window.__railhead; R.importSave(json);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const st = R.world.buildingFootprints().find(f => f.id === 'station') || R.proto.PROTO.STATION;
          const x = st.x !== undefined ? st.x : (st.x0 + st.x1) / 2, z = st.z !== undefined ? st.z : (st.z0 + st.z1) / 2;
          R.camera.zoom = 4; R.pix.pixLookAt(x + 1, z + 2);
          await new Promise(r => setTimeout(r, 600));
          // Its two rows: the next two trains not gone, as the schedule board's card lists them.
          const want = R.pdui.rows().filter(r => r.state !== 'gone' && r.state !== 'cancelled').sort((a, b) => a.arrT - b.arrT).slice(0, 2).map(r => r.board.t + ' ' + r.board.id);
          return { shown: R.pix.pixBoardRowsNow().map(r => r.text), want };
        }, bs.save);
        if (tb.shown.join('|') !== tb.want.join('|') || tb.shown.some(t => !/^\d\d:\d\d [PFX]\d$/.test(t))) P(`${orient}: the station's TRAINS board shows ${tb.shown.join(' / ')}, expected ${tb.want.join(' / ')}`);
        await page.screenshot({ path: screenshotPath(`protoday-trainsboard-${orient}`) });
      }
      if (errors.length) P(`${orient}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    } finally { await browser.close(); }
  }
  console.log('  frames: ' + frames.join(' | '));
  console.log(`  screenshots: test-output/protoday-{morning,${shots.map(s => s.k).join(',')},busy-close,trainsboard}-{portrait,landscape}.png`);
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
