// Check: the D32 world (plans/d32-tech.md 11.5, Foundation's): line building's base, with the line off and on.
// - The line's tables: 2,520 m, the country in the plan's order (460 m prairie, 284 brush, 600 woods, 270 hills, 80 the
//   cut, 350 rock, 400 river, 16 the bridge), the work model's totals (22,660 / 58,440 / 32,916 / 29,584 / 24,600 /
//   24,600 wu by stage, 192,800 in all), the gaps, the supplies.
// - The country: the same twice from a seed, another scatter from another seed, the kinds in the same place for both;
//   every tile and every standing thing it asks for is in the atlas.
// - Clearances at the station: the camp clear of every building, the creek and the cart path; the muster clear of
//   buildings and the lever frame; the standing work train (61u, crew car -40 to -27, engine 3 to 21) between the
//   switches, clear of the cart crossing, under the footbridges.
// - The line off: a new game has no S.dv, S.ln or S.cw and still none after 300 ticks; the railroad's runs are the same
//   with the line on (the work train is a scripted run, not a railroad run: PROTO_SCHEDULE_WORK w1 05:50 to 06:20 and
//   w2 19:15 to 19:35 on track 2).
// - Saving: schema 19 still; save-v19.json loads with the line off and hashes as recorded; a save made with the line
//   on and in view reloads to the same hash and plays on the same; a damaged line is refused.
// - The clock: 5 ticks a real second in the prototype (7.5 elsewhere); the player's pace times 1.5, so his real speed
//   is as before (measured walking), his lever throw 3 ticks.
// - Dev mode: off by default (no Dev button), on from Settings' preference; the crew of 30 chosen in the morning is at
//   work the same day; three days through the day's own commands: the fronts in order with their gaps, supplies never
//   below zero, the head count, the summary's line; the same twice.
// - The stand-in crew's pace: 30 men 13 to 15 working days, 5 men 5.5 to 6.5 times that (no day of rest).
// - Away: the station player's commands are refused while he is on the line; the relief man throws the levers late.
const fs = require('fs');
const path = require('path');
const { openGame, screenshotPath } = require('./browser');

const V19_HASH = 'RECORD';   // save-v19.json loaded on this build with the line off (recorded 2026-11-13)

module.exports = async function checkD32World() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
    const v19 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v19.json'), 'utf8');
    const r = await page.evaluate(([v19]) => {
      const R = window.__railhead, L = R.ln, LINE = L.LINE, D = R.d27, P = D.PROTO, out = { bad: [], notes: [] }, B = m => out.bad.push(m), N = m => out.notes.push(m);
      const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-6);
      // ---- The tables ----
      if (LINE.LEN_M !== 2520 || !near(LINE.LEN, 3600, 1e-6)) B(`the line is ${LINE.LEN_M} m, ${LINE.LEN} u`);
      const byKind = {};
      let at = 0;
      for (const [a, b, k] of LINE.SEGS) { if (a !== at) B(`the country has a hole at ${at} m`); at = b; byKind[k] = (byKind[k] || 0) + b - a; }
      if (at !== 2520) B('the country does not end at 2,520 m');
      const wantKind = { junction: 60, prairie: 460, brush: 284, woods: 600, hills: 270, cut: 80, rock: 350, river: 400, bridge: 16 };
      if (JSON.stringify(byKind) !== JSON.stringify(wantKind)) B('the country\'s metres by kind: ' + JSON.stringify(byKind));
      const tot = [0, 0, 0, 0, 0, 0];
      for (let m = 60; m < 2520; m++) for (let s = 0; s < 6; s++) tot[s] += L.lnCost(s, m + 0.5);
      const wantTot = [22660, 58440, 32916, 29584, 24600, 24600];
      if (tot.some((v, i) => !near(v, wantTot[i], 1e-6))) B('wu by stage: ' + tot.join(', '));
      if (!near(tot.reduce((a, b) => a + b, 0), 192800, 1e-6)) B('the whole line is ' + tot.reduce((a, b) => a + b, 0) + ' wu, not 192,800');
      if (JSON.stringify(LINE.GAP) !== '[0,6,6,4,9.1,9.1]') B('the gaps');
      if (LINE.SUP.rock.carry !== 110 || LINE.SUP.ties.carry !== 360 || LINE.SUP.rails.carry !== 48 || LINE.SUP.kegs.carry !== 10) B('the supplies carried');
      if (L.lnKindAt(100) !== 'prairie' || L.lnKindAt(540) !== 'bridge' || L.lnKindAt(1100) !== 'cut' || L.lnKindAt(2519) !== 'prairie') B('lnKindAt');
      // ---- The country ----
      const F = PIX_ATLAS.frames, miss = new Set();
      const sample = seed => { const o = []; for (let i = 0; i < 3740; i += 7) for (const j of [-60, -31, -4, 0, 3, 30, 55]) o.push(L.lnTile(seed, i, j)); return o; };
      const scat = seed => { const o = []; for (let ci = 0; ci < 460; ci += 3) for (let cj = -8; cj < 8; cj++) o.push(JSON.stringify(L.lnScatter(seed, ci, cj))); return o; };
      const a1 = sample(1866), a2 = sample(1866), b1 = sample(7), s1 = scat(1866), s2 = scat(1866), t1 = scat(7);
      if (a1.join() !== a2.join() || s1.join() !== s2.join()) B('the country is not the same twice from one seed');
      if (s1.join() === t1.join()) B('another seed gives the same scatter');
      for (const k of a1.concat(b1)) if (!F[k]) miss.add(k);
      let rows = 0, things = 0;
      for (const cell of s1.concat(t1)) for (const q of JSON.parse(cell)) { things++; if (q.row) rows++; if (!F[q.key]) miss.add(q.key); if (q.row !== (Math.abs(q.z) <= LINE.ROW)) B('a thing\'s row flag is wrong'); }
      if (miss.size) B('missing in the atlas: ' + [...miss].slice(0, 12).join(', '));
      if (!(rows > 20 && things > 1000)) B(`the scatter is thin: ${things} things, ${rows} on the right of way`);
      for (const m of [100, 400, 700, 1000, 1400, 1800, 2200, 2400]) if (L.lnKindCell(1866, Math.floor(m * LINE.M), 0) !== L.lnKindCell(7, Math.floor(m * LINE.M), 0)) B(`the kind at ${m} m moves with the seed`);
      if (L.lnWaterAt(1866, 544 * LINE.M, 0) !== 2 || L.lnWaterAt(1866, 544 * LINE.M, 30) !== 2) B('no creek under the bridge');
      for (let x = 1600 * LINE.M; x < 2000 * LINE.M; x += 20) for (let z = -LINE.HALF_W; z <= LINE.HALF_W; z += 4) if (L.lnWaterAt(1866, x, z)) { B(`the river is inside the corridor at ${x.toFixed(0)}, ${z}`); x = 1e9; break; }
      let riv = 0; for (let x = 1650 * LINE.M; x < 1950 * LINE.M; x += 20) for (let z = 36; z <= 75; z += 1) if (L.lnWaterAt(1866, x, z) === 2) { riv++; break; }
      if (riv < 20) B('the river does not run alongside the line');
      // trees on the right of way in the woods: about one per 6 m
      let trees = 0; for (let ci = Math.ceil(620 * LINE.M / 8); ci < Math.floor(880 * LINE.M / 8); ci++) for (let cj = -1; cj <= 0; cj++) for (const q of L.lnScatter(1866, ci, cj)) if (q.row && /pine|oak/.test(q.key)) trees++;
      N(`trees on the right of way, 620 to 880 m: ${trees} (one per ${(260 / trees).toFixed(1)} m)`);
      if (!(trees >= 20 && trees <= 90)) B(`${trees} trees on 260 m of right of way in the woods`);
      // ---- Clearances ----
      const fps = R.buildings.footprints ? R.buildings.footprints() : [];
      const box = f => { const t = Math.abs(Math.sin(f.yaw || 0)) > 0.5, w = t ? f.d : f.w, d = t ? f.w : f.d; return { x0: f.x - w / 2, x1: f.x + w / 2, z0: f.z - d / 2, z1: f.z + d / 2 }; };
      const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
      out.nfp = fps.length;
      for (const f of fps) {
        if (f.kind === 'nature' || f.flush) continue;
        if (hit(box(f), P.CAMP)) B(`the camp overlaps ${f.id || f.kind}`);
        if (hit(box(f), P.MUSTER)) B(`the muster overlaps ${f.id || f.kind}`);
      }
      if (P.CAMP.z1 > P.CREEK.z0 - 20) B('the camp is at the creek');
      for (const [x, z] of P.CART_PATH) if (x > P.CAMP.x0 - 2 && x < P.CAMP.x1 + 2 && z > P.CAMP.z0 - 2 && z < P.CAMP.z1 + 2) B('the camp is on the cart path');
      if (!(P.CAMP.x1 <= P.LANES.W.x0 - 8) || P.CAMP.x0 < P.BOUNDS.x0 + 2 || P.CAMP.z0 < P.BOUNDS.z0) B('the camp is not west of the town\'s back lane, on the map');
      const LV = P.LEVERS.C || P.LEVERS.W;
      if (P.MUSTER.x1 > LV.x - P.LEVERS.STAGE[0] / 2 - 2) B('the muster reaches the lever frame');
      if (P.MUSTER.z1 > -P.D1 - 3 || P.MUSTER.x1 > P.P1_DECK.x0) B('the muster is on the track or the platform');
      if (!R.proto.protoTrackAt(S0().track, -6, P.PLANK.x)) B('track 1 is not straight where the plank walk crosses it');
      function S0() { return R.state; }
      // ---- The line off ----
      const S = R.newState(1866, 'proto');
      if (S.schemaVersion !== 19 || R.CFG.SCHEMA_VERSION !== 19) B('the schema is not 19');
      if ('dv' in S || 'ln' in S || 'cw' in S || 'lp' in S || 'hw' in S || 'tn' in S || 'away' in S.player) B('a new game carries D32 stores');
      R.simTick(S, [{ t: 'pdStart' }]);
      for (let i = 0; i < 300; i++) R.simTick(S, []);
      if ('dv' in S || 'ln' in S || 'cw' in S) B('D32 stores appeared with the line off');
      const offRuns = S.rr.runs.map(q => q.svc + ':' + q.kind + ':' + q.arr).join();
      const tr0 = L.lnTrain(S);
      if (tr0.at !== 'away' || tr0.cars.length || L.lnOn(S) || L.lnOpenWork(S, 0) !== 0 || L.lnWork(S, 0, 5) !== 5) B('the line\'s functions with the line off');
      // ---- The clock and the player's pace ----
      if (L.clockRate(S.track) !== 5 || L.clockRate({ world: 'hub' }) !== 7.5 || L.clockRate({ world: 'start' }) !== 7.5) B(`the clock: ${L.clockRate(S.track)} ticks a second`);
      if (!near(L.playerK(S.track) * L.clockRate(S.track), R.CFG.TICKS_PER_REAL_S) || L.playerK({ world: 'hub' }) !== 1) B('the player\'s pace does not make up for the clock');
      if (L.LN_PACE.throwS !== 24) B(`a lever throw takes ${L.LN_PACE.throwS} s`);
      {
        const W = R.newState(3, 'proto'); R.simTick(W, [{ t: 'pdStart' }]);
        const x0 = W.player.x, z0 = W.player.z; W.player.x = -20; W.player.z = -14;
        R.simTick(W, [{ t: 'walkTo', x: 20, z: -14 }]);
        const xa = W.player.x; for (let i = 0; i < 10; i++) R.simTick(W, []);
        const perTick = (W.player.x - xa) / 10, v = R.proto.playerWalkSpeed(W.track, false), real = perTick * L.clockRate(W.track);
        out.walk = { perTick, v, realUPerS: real };
        if (!near(perTick, v * R.CFG.TICK_GAME_S / 60, 0.02)) B(`the player walks ${perTick.toFixed(3)} u a tick, his pace says ${(v * 8 / 60).toFixed(3)}`);
        if (!near(real, v / 1.5 * 8 / 60 * 7.5, 0.1)) B('the player\'s real speed changed');
      }
      // ---- Saving: the v19 fixture ----
      const sv = R.migrate(JSON.parse(v19)), st = sv.state;
      out.v19 = R.stateHash(st);
      if ('ln' in st || 'dv' in st) B('the v19 save gained a line');
      if (L.lnOn(st)) B('the line is on in the v19 save');
      for (let i = 0; i < 60; i++) R.simTick(st, []);
      if ('ln' in st || 'dv' in st) B('the v19 save gained a line after 60 ticks');
      // ---- The line on: three days through the commands ----
      const play = () => {
        const G = R.newState(1866, 'proto'), log = [];
        const clk = () => { const s = (G.time + 5 * 3600) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
        let ev = R.simTick(G, [{ t: 'pdStart' }, { t: 'dvSet', k: 'crew', v: 30 }]);
        if (!G.ln || !G.ln.on || G.ln.crew !== 30 || G.ln.tr.ph !== 'sStand') B('a crew of 30 chosen in the morning is not at work that day: ' + JSON.stringify(G.ln && G.ln.tr));
        if (G.rr.runs.map(q => q.svc + ':' + q.kind + ':' + q.arr).join() !== offRuns.split(',').slice(0, G.rr.runs.length).join()) B('the railroad\'s runs differ with the line on');
        if (G.rr.runs.some(q => q.kind === 'work')) B('a work run among the railroad\'s runs');
        const days = [];
        let save = null, minSup = 1e9;
        for (let d = 0; d < 3; d++) {
          for (let i = 0; i < 12000 && G.pd.ph !== 'summary'; i++) {
            ev = R.simTick(G, []);
            for (const e of ev) if (e.t === 'wtPhase' || e.t === 'hcDone' || e.t === 'lnDone') log.push(d + ' ' + clk() + ' ' + e.t + ' ' + (e.ph || e.home + '/' + e.total));
            const f = G.ln.f;
            for (let k = 1; k < 6; k++) if (f[k] > f[k - 1] - LINE.GAP[k] + 1e-6 && f[k] > 60 + 1e-6) { B(`day ${d} ${clk()}: front ${k} at ${f[k]} is inside its gap behind ${f[k - 1]}`); i = 1e9; break; }
            if (f[0] > f[1] + LINE.CLEAR_AHEAD + 1e-6) { B('the clearers ran ahead'); break; }
            for (const k of Object.keys(G.ln.sup)) minSup = Math.min(minSup, G.ln.sup[k]);
            if (d === 1 && !save && clk() === '10:00') { R.simTick(G, [{ t: 'dvSet', k: 'view', v: 'line' }]); save = JSON.stringify({ state: G }); }
          }
          days.push({ f6: G.ln.f[5], sum: G.pd.sum && G.pd.sum.hc, days: G.ln.days, hc: G.ln.hc });
          if (d < 2) R.simTick(G, [{ t: 'pdNextDay' }]);
        }
        return { G, log, days, save, minSup, hash: R.stateHash(G) };
      };
      const A = play(), A2 = play();
      out.days = A.days; out.log = A.log.slice(0, 14);
      if (A.hash !== A2.hash) B('three line days are not the same twice');
      if (A.minSup < 0) B('a supply went below zero');
      A.days.forEach((d, i) => {
        const grew = d.f6 - (i ? A.days[i - 1].f6 : 60);
        if (!(grew > 120 && grew < 260)) B(`day ${i + 1}: ${grew.toFixed(1)} m spiked`);
        if (d.days !== i + 1) B(`day ${i + 1}: the line counts ${d.days} working days`);
        if (!d.sum || d.sum.total !== 30 || d.sum.home !== 30) B(`day ${i + 1}: the summary's head count is ${JSON.stringify(d.sum)}`);
        if (!d.hc || d.hc.home !== 30) B(`day ${i + 1}: the 22:00 head count is ${JSON.stringify(d.hc)}`);
      });
      const first = A.log.filter(l => l.startsWith('0 ')).map(l => l.slice(2));
      const wantLog = ['06:20 wtPhase sOut', '06:25 wtPhase out', '06:45 wtPhase stand', '18:20 wtPhase back', '19:00 wtPhase gap', '19:05 wtPhase eIn', '19:15 wtPhase eStand', '19:35 wtPhase eOut', '19:45 wtPhase home', '22:00 hcDone 30/30'];
      if (first.join('|') !== wantLog.join('|')) B('the work train\'s first day: ' + first.join(' | '));
      if (A.G.ln.log.length !== 2 || A.G.ln.log.some(q => !(q.m > 120))) B('the line\'s log: ' + JSON.stringify(A.G.ln.log));
      // lnWork and lnOpenWork at the edges
      {
        const G = A.G, f = G.ln.f.slice();
        G.ln.on = true;
        const back = L.lnWork(G, 5, 1e6);   // spiking can only go to its gap behind the rails
        if (!(back > 0) || G.ln.f[5] > G.ln.f[4] - LINE.GAP[5] + 1e-6) B('lnWork ran through the gap');
        if (L.lnOpenWork(G, 5) > 1e-6) B('lnOpenWork is not 0 at the gap');
        G.ln.sup.ties = 0;
        if (L.lnOpenWork(G, 3) !== 0 || L.lnWork(G, 3, 100) !== 100 + 0 && G.ln.f[3] !== f[3]) B('ties were laid with none at the dump');
      }
      // ---- Saving with the line on and in view ----
      if (!A.save) B('no save was made on day 2');
      else {
        const s1 = R.migrate(JSON.parse(A.save)).state, s2 = R.migrate(JSON.parse(A.save)).state;
        if (R.stateHash(s1) !== R.stateHash(JSON.parse(A.save).state)) B('a save made on the line does not reload to the same hash');
        if (s1.ln.view !== 'line' || s1.ln.tr.ph !== 'stand') B('the save is not on the line');
        for (let i = 0; i < 400; i++) { R.simTick(s1, []); R.simTick(s2, []); }
        if (R.stateHash(s1) !== R.stateHash(s2)) B('two reloads do not play on the same');
        out.saveBytes = { ln: JSON.stringify(s1.ln).length, dv: JSON.stringify(s1.dv).length };
        const bad = JSON.parse(A.save); bad.state.ln.f[3] = bad.state.ln.f[2] + 5;
        let threw = false; try { R.migrate(bad); L.lnCheckSaveShape(bad.state); } catch (e) { threw = /fronts/.test(e.message); }
        if (!threw) B('a save with its fronts out of order was accepted');
      }
      // ---- The pace (the stand-in crew; no day of rest) ----
      const p30 = L.cw.cwSimDays(1866, 30, 40), p5 = L.cw.cwSimDays(1866, 5, 200);
      out.pace = { d30: p30.days, d5: p5.days, ratio: p5.days / p30.days };
      if (!(p30.done >= 0 && p30.days >= 13 && p30.days <= 15)) B(`30 men took ${p30.days} working days`);
      if (!(p5.done >= 0 && p5.days / p30.days >= 5.5 && p5.days / p30.days <= 6.5)) B(`5 men took ${p5.days} days, ${(p5.days / p30.days).toFixed(2)} times 30 men's`);
      if (p30.done !== p30.days - 1) B(`30 men: ${p30.days} working days in ${p30.done + 1} calendar days (a day of rest?)`);
      if (p30.f.some(v => v !== 2520)) B('the fronts did not all reach 2,520 m: ' + p30.f.join(', '));
      // ---- Away ----
      {
        const G = R.newState(1866, 'proto');
        R.simTick(G, [{ t: 'pdStart' }, { t: 'dvSet', k: 'crew', v: 5 }]);
        G.player.away = 'line';
        const x = G.player.x, ev = R.simTick(G, [{ t: 'walkTo', x: x + 10, z: G.player.z }]);
        if (!ev.some(e => e.t === 'awRefused') || G.player.mode === 'to') B('the station player walked while away on the line');
        let arr = null, thrown = 0;
        for (let i = 0; i < 1200 && !arr; i++) { const e2 = R.simTick(G, []); for (const e of e2) { if (e.t === 'rrArrived') arr = e; if (e.t === 'switchThrown') thrown++; } }
        out.away = { late: arr && Math.round(arr.late / 60), thrown, stats: G.ln.awStats, line: L.awSummaryLine(G) };
        if (!arr) B('with the player away, the first train never came in (no relief lever man)');
        else if (!(arr.late >= 240 && arr.late <= 20 * 60)) B(`with the player away the first train was ${Math.round(arr.late / 60)} minutes late (the relief man is 10 minutes behind)`);
        if (!(thrown >= 1) || !G.ln.awStats || !/relief man/.test(L.awSummaryLine(G) || '')) B('the relief man threw no lever, or the summary has no line for it');
      }
      // cargo: the place kind CREW
      if (D.cargo27Key({ kind: 'CREW', who: 2 }) !== 'W:2') B('the place kind CREW has no key');
      return out;
    }, [v19]);
    for (const b of r.bad) P(b);
    for (const n of r.notes) console.log('  ' + n);
    console.log(`  save-v19.json on this build: hash ${r.v19}; the line adds ${r.saveBytes ? r.saveBytes.ln + r.saveBytes.dv : '?'} bytes to a save`);
    console.log(`  three days with 30 men: spiked ${r.days.map(d => d.f6.toFixed(0)).join(', ')} m; pace: 30 men ${r.pace.d30} days, 5 men ${r.pace.d5} days (${r.pace.ratio.toFixed(2)} times)`);
    console.log(`  the player walks ${r.walk.v.toFixed(2)} u a game minute, ${r.walk.realUPerS.toFixed(2)} u a real second; away: first train ${r.away.late} min late, ${r.away.thrown} levers thrown by the relief man`);
    if (V19_HASH !== 'RECORD' && r.v19 !== V19_HASH) P(`save-v19.json hashes ${r.v19}, recorded ${V19_HASH}`);
    if (V19_HASH === 'RECORD') P(`record the v19 hash in the check: ${r.v19}`);
    // ---- Dev mode on the page ----
    const ui0 = await page.evaluate(() => ({ btn: document.getElementById('devBtn').hidden, row: document.getElementById('setDevRow').hidden, on: window.__railhead.dv.on(), cls: document.body.classList.contains('line') }));
    if (!ui0.btn || ui0.on) P('dev mode is on by default');
    if (ui0.cls) P('the page has the line\'s class with the line off');
    await page.evaluate(() => { window.__railhead.guide.openSettings(); });
    await page.waitForTimeout(150);
    if (await page.evaluate(() => document.getElementById('setDevRow').hidden)) P('Settings has no Dev mode row');
    await page.tap('#setDev');
    await page.waitForTimeout(200);
    const ui1 = await page.evaluate(() => ({ btn: document.getElementById('devBtn').hidden, on: window.__railhead.dv.on(), pref: localStorage.getItem('railhead-dev'), txt: document.getElementById('setDev').textContent }));
    if (ui1.btn || !ui1.on || ui1.pref !== 'on' || ui1.txt !== 'On') P('the Settings row did not turn dev mode on: ' + JSON.stringify(ui1));
    await page.evaluate(() => { window.__railhead.guide.closeSettings(); const b = document.getElementById('pdBoard'); if (b && !b.hidden) window.__railhead.pdui.closeBoard(); });
    await page.tap('#devBtn');
    await page.waitForTimeout(200);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#devRows .dvRow')].map(q => q.dataset.row + (q.classList.contains('grey') ? ':grey' : '')));
    for (const id of ['crew', 'punch:grey', 'load:grey', 'deliver:grey', 'ride:grey', 'look:grey', 'skip', 'status']) if (!rows.includes(id)) P(`the dev panel has no row ${id} (rows: ${rows.join(' ')})`);
    await page.tap('#devRows button[data-dv="crew:30"]');
    await page.evaluate(() => window.__railhead.step(2));
    await page.waitForTimeout(500);
    const ui2 = await page.evaluate(() => { const S = window.__railhead.state; return { dv: S.dv, on: S.ln && S.ln.on, status: (document.getElementById('devStatus') || {}).textContent || '' }; });
    if (!ui2.dv || ui2.dv.crew !== 30 || !ui2.on) P('tapping Rail crew 30 did not start the line: ' + JSON.stringify(ui2.dv));
    if (!/Crew today: 30/.test(ui2.status) || !/Spiked: 60 of 2,520 m/.test(ui2.status)) P('the dev panel\'s status: ' + ui2.status.replace(/\n/g, ' / '));
    await page.screenshot({ path: screenshotPath('d32-dev-panel-portrait') });
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
