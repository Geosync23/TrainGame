// Check: the D32 world (plans/d32-tech.md 11.5, Foundation's): line building's base, with the line off and on.
// - The line's tables: 2,520 m, the plan's metres of each cost kind (460 m prairie, 284 brush, 600 woods, 270 hills, 80
//   the cut, 350 rock, 400 river, 16 the bridge) laid over the nine regions of the journey (plans/d32-journey.md), the
//   work model's totals (22,660 / 58,440 / 32,916 / 29,584 / 24,600 /
//   24,600 wu by stage, 192,800 in all), the gaps, the supplies.
// - The country: the same twice from a seed, another scatter from another seed, the regions in the same place for both;
//   every tile and every standing thing it asks for is in the atlas (a wilds key by its stand-in); it is thick with
//   small things; a natural border close along each side (far side 8.5 to 11.5u, near side 11 to 14u, closing to a
//   cutting at both ends), each region's belts and landmarks in place, walking stopped by the border and by water
//   (lnWalkable), the rivers and the creek beyond the near border.
// - Clearances at the station: the camp clear of every building, the creek and the cart path; the muster clear of
//   buildings and the lever frame; the standing work train (61u, crew car -40 to -27, engine 3 to 21) between the
//   switches, clear of the cart crossing, under the footbridges.
// - The line off (D33: the parked separate-line build, the page's ?d33=0): a new game has no S.dv, S.ln or S.cw and
//   still none after 300 ticks; the railroad's runs are the same with the line on (the work train is a scripted run,
//   not a railroad run: PROTO_SCHEDULE_WORK w1 and w2 on track 2). With D33 on (the default) a new game has the line
//   on with the starting crew: check-d33 plays it.
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
      if (Object.keys(wantKind).some(k => byKind[k] !== wantKind[k]) || Object.keys(byKind).length !== 9) B('the country\'s metres by kind: ' + JSON.stringify(byKind));
      const tot = [0, 0, 0, 0, 0, 0];
      for (let m = 60; m < 2520; m++) for (let s = 0; s < 6; s++) tot[s] += L.lnCost(s, m + 0.5);
      const wantTot = [22660, 58440, 32916, 29584, 24600, 24600];
      if (tot.some((v, i) => !near(v, wantTot[i], 1e-6))) B('wu by stage: ' + tot.join(', '));
      if (!near(tot.reduce((a, b) => a + b, 0), 192800, 1e-6)) B('the whole line is ' + tot.reduce((a, b) => a + b, 0) + ' wu, not 192,800');
      if (JSON.stringify(LINE.GAP) !== (R.lnView.d33.on ? '[0,5,5,4,9.1,4]' : '[0,6,6,4,9.1,9.1]')) B('the gaps: ' + JSON.stringify(LINE.GAP));
      if (LINE.SUP.rock.carry !== 110 || LINE.SUP.ties.carry !== 360 || LINE.SUP.rails.carry !== 48 || LINE.SUP.kegs.carry !== 10) B('the supplies carried');
      if (L.lnKindAt(100) !== 'prairie' || L.lnKindAt(540) !== 'bridge' || L.lnKindAt(800) !== 'cut' || L.lnKindAt(2519) !== 'prairie') B('lnKindAt');
      const regs = ['prairie', 'creek', 'hills', 'woods', 'rocks', 'river', 'canyon', 'pass', 'valley'], regM = {};
      for (const [a, b, , rg] of LINE.SEGS) if (a >= 60) regM[rg] = (regM[rg] || 0) + b - a;
      if (Object.keys(regM).join() !== regs.join() || Object.keys(LINE.REGIONS).join() !== regs.join()) B('the regions: ' + JSON.stringify(regM));
      N('the regions (m): ' + regs.map(k => k + ' ' + regM[k]).join(', '));
      if (L.lnRegionAt(-5) !== 'prairie' || L.lnRegionAt(2030) !== 'canyon' || L.lnRegionAt(2600) !== 'valley') B('lnRegionAt');
      // ---- The country ----
      const F = PIX_ATLAS.frames, miss = new Set();
      const sample = seed => { const o = []; for (let i = -300; i < 4000; i += 7) for (const j of [-90, -60, -31, -13, -9, -4, 0, 3, 10, 13, 16, 22, 30, 55, 90]) o.push(L.lnTile(seed, i, j)); return o; };
      const scat = seed => { const o = []; for (let ci = -30; ci < 500; ci += 3) for (let cj = -9; cj < 9; cj++) o.push(JSON.stringify(L.lnScatter(seed, ci, cj))); return o; };
      const a1 = sample(1866), a2 = sample(1866), b1 = sample(7), s1 = scat(1866), s2 = scat(1866), t1 = scat(7);
      if (a1.join() !== a2.join() || s1.join() !== s2.join()) B('the country is not the same twice from one seed');
      if (s1.join() === t1.join()) B('another seed gives the same scatter');
      for (const k of a1.concat(b1)) if (!F[k]) miss.add(k);
      let rows = 0, things = 0;
      for (const cell of s1.concat(t1)) for (const q of JSON.parse(cell)) { things++; if (q.row) rows++; if (!F[q.key] && !(q.alt ? F[q.alt] : q.alt === null)) miss.add(q.key + ' / ' + q.alt); if (!q.edge && q.row !== (Math.abs(q.z) <= LINE.ROW)) B('a thing\'s row flag is wrong'); }
      if (miss.size) B('missing in the atlas: ' + [...miss].slice(0, 12).join(', '));
      if (!(rows > 20 && things > 1000)) B(`the scatter is thin: ${things} things, ${rows} on the right of way`);
      for (const m of [100, 400, 700, 1000, 1400, 1800, 2030, 2200, 2400]) if (L.lnRegionCell(1866, Math.floor(m * LINE.M), 0) !== L.lnRegionCell(7, Math.floor(m * LINE.M), 0) || L.lnRegionCell(7, Math.floor(m * LINE.M), 0) !== L.lnRegionAt(m)) B(`the region at ${m} m moves with the seed`);
      // thick with small things: the open prairie has at least 6 a cell
      { let n = 0, cells = 0; for (let ci = 12; ci < 40; ci++) for (const cj of [-1, 0]) { cells++; n += L.lnScatter(1866, ci, cj).filter(q => !q.edge).length; } N(`the home prairie: ${(n / cells).toFixed(1)} things a cell of 8u`); if (n / cells < 6) B('the prairie is sparse: ' + (n / cells).toFixed(1) + ' things a cell'); }
      // the natural borders: straight, as the wilds artists' art is (the far wall's front line, the near side's edge),
      // closer in at the canyon's shelf (the near side) and the rock cut (both sides)
      const WD = LINE.WILD, BD = LINE.BORDER;
      for (const seed of [1866, 7]) for (let x = 60; x < LINE.LEN; x += 13) {
        if (Math.abs(x - 544 * LINE.M) < 14) continue;   // the creek's crossing
        const n = L.lnBorder(seed, x, -1), s = L.lnBorder(seed, x, 1), cut = x >= WD.ROCKCUT[0] && x < WD.ROCKCUT[1], shelf = x >= WD.SHELF[0] && x < WD.SHELF[1];
        if (n.d !== (cut ? WD.ROCKCUT[2] : BD.N) || s.d !== (cut ? WD.ROCKCUT[2] : shelf ? WD.SHELF[2] : BD.S) || n.end || s.end) { B(`the border at x ${x}: ${n.d.toFixed(2)} north, ${s.d.toFixed(2)} south`); break; }
        if (!L.lnWalkable(seed, x, -n.d + n.pad + 0.1) || !L.lnWalkable(seed, x, s.d - s.pad - 0.1) || L.lnWalkable(seed, x, -n.d + n.pad - 0.1) || L.lnWalkable(seed, x, s.d - s.pad + 0.1)) { B(`walking does not stop at the border at x ${x}`); break; }
        for (let z = -n.d + 0.5; z < s.d - 0.5; z += 1) if (L.lnWaterAt(seed, x, z) && Math.abs(x - 544 * LINE.M) > 12) { B(`water inside the corridor at ${x}, ${z.toFixed(1)}`); x = 1e9; break; }
      }
      if (!(BD.N <= 10 && BD.S <= 11.5)) B('the borders are not close to the track');
      if (L.lnBorder(1866, -15, -1).d > 4 || L.lnBorder(1866, -15, 1).d > 4 || L.lnBorder(1866, LINE.X1 - 5, 1).d > 4 || !L.lnBorder(1866, -15, 1).end) B('the borders do not close in at the strip\'s ends');
      if (L.lnWalkable(1866, LINE.X0 - 1, 0) || L.lnWalkable(1866, LINE.X1 + 1, 0) || !L.lnWalkable(1866, 100, 0)) B('walking at the strip\'s ends');
      if (L.lnWalkable(1866, 544 * LINE.M, 0) || L.lnWalkable(1866, 544 * LINE.M, 0, 530) || !L.lnWalkable(1866, 544 * LINE.M, 0, 560) || L.lnWalkable(1866, 544 * LINE.M, 6, 560)) B('the creek is walked through, or the built trestle is not');
      // the wilds artists' art: every module, piece, blend, landmark and tile the layout asks for is in the atlas;
      // no variant twice running on the far side; regions begin on multiples of 16u; nothing of the scatter stands
      // under the art; the ends' woods stay inside the straight borders
      {
        const miss = new Set(), need = k => { if (!F[k]) miss.add(k); };
        for (let row = 0; row < 6; row++) { let prev = ''; for (let n = -6; n < 236; n++) { const q = L.lnWildFar(1866, row, n); need(q.key); if (q.key === prev) B(`far side row ${row}: ${q.key} twice running at module ${n}`); prev = q.key; if (q.z !== -(BD.N + [0, 14, 30][Math.min(row, 2)] + (row > 2 ? 20 * (row - 2) : 0))) B(`far side row ${row} stands at z ${q.z}`); } }
        const seenTo = new Set(); for (let n = 0; n < 236; n++) { const k = L.lnWildFar(1866, 0, n).key; if (/\/to_/.test(k)) seenTo.add(k); }
        if (seenTo.size !== 16) B(`${seenTo.size} of the far side's 16 transition modules of rank 1 are used`);
        const blends = new Set(), marks = new Set();
        for (const band of ['edge', 'mid', 'far']) for (let n = -8; n < (band === 'edge' ? 470 : 235); n++) { const q = L.lnWildNear(1866, band, n); if (!q) continue; need(q.key); if (/_to_/.test(q.key)) blends.add(q.key); if (q.mark) marks.add(q.mark); }
        if (blends.size !== 24) B(`${blends.size} of the near side's 24 blend pieces are used`);
        for (const k of Object.values(WD.EDGE_MARKS)) if (!marks.has(k)) B(`the edge landmark ${k} is not on the line`);
        for (const q of LINE.MARKS) { need(q.key); const reg = Object.entries(LINE.REGIONS).find(([, R]) => R.marks.includes(q.name)); if (!reg || LINE.RUNS[L.lnRunIx(q.x)].k !== reg[0]) B(`the landmark ${q.name} is not in its region`); if (q.side !== 'c' && L.lnWalkable(1866, q.x, q.z)) B(`the landmark ${q.name} stands where a man can walk`); }
        for (const R of LINE.RUNS) if (Number.isFinite(R.x0) && R.x0 % 16) B(`${R.k} begins at ${R.x0} u`);
        for (let i = -40; i < 3700; i += 3) for (const j of [-8, 0, 8, 30, 90]) { const k = L.lnTileWild(1866, i, j); if (k) need(k); }
        const bl = new Set(); for (let i = 0; i < 3600; i++) for (let j = -6; j < 8; j++) { const k = L.lnTileWild(1866, i, j); if (k && /blend/.test(k)) bl.add(k); }
        if (bl.size !== 32) B(`${bl.size} of the 32 ground blend tiles are used`);
        if (miss.size) B('the wilds art asked for but not in the atlas: ' + [...miss].slice(0, 8).join(', '));
        for (let ci = -4; ci < 470; ci++) for (let cj = -4; cj <= 9; cj++) for (const q of L.lnScatter(1866, ci, cj)) {
          if (q.z < -BD.N + 0.3 || (q.z > BD.S - 0.5 && q.z < BD.S + WD.NEAR_END)) { B(`a scattered thing (${q.key}) under the wilds art at ${q.x.toFixed(0)}, ${q.z.toFixed(1)}`); ci = 1e9; break; }
        }
        // wildlife: some in every region that has any, never where a man can walk, the same from the same seed
        const life = {}; let lifeN = 0;
        for (let c = 0; c < 78; c++) for (const q of L.lnLife(1866, c)) { lifeN++; life[q.kind] = (life[q.kind] || 0) + 1; if (!q.water && L.lnWalkable(1866, q.x, q.z)) B(`a ${q.kind} stands in the men's way at ${q.x}, ${q.z}`); }
        N(`wildlife on the line (seed 1866): ${lifeN} beasts: ${JSON.stringify(life)}`);
        for (const k of ['deer', 'buffalo', 'duck', 'fox', 'prairie_dog']) if (!life[k]) B(`no ${k} anywhere on the line`);
        if (lifeN > 60) B(`${lifeN} beasts: not sparing`);
        if (JSON.stringify(L.lnLife(1866, 30)) !== JSON.stringify(L.lnLife(1866, 30))) B('the wildlife is not the same twice');
      }
      if (L.lnWaterAt(1866, 544 * LINE.M, 0) !== 2 || L.lnWaterAt(1866, 544 * LINE.M, 30) !== 2) B('no creek under the bridge');
      let riv = 0; for (let x = 1620 * LINE.M; x < 1900 * LINE.M; x += 20) { const d = LINE.BORDER.S; for (let z = d; z <= d + 6; z += 0.5) if (L.lnWaterAt(1866, x, z) === 2) { riv++; break; } }
      if (riv < 19) B('the river does not run close alongside the line in the river run');
      // trees on the right of way in the woods: about one per 6 m
      let trees = 0; for (let ci = Math.ceil(1000 * LINE.M / 8); ci < Math.floor(1260 * LINE.M / 8); ci++) for (let cj = -1; cj <= 0; cj++) for (const q of L.lnScatter(1866, ci, cj)) if (q.row && /pine|oak/.test(q.key)) trees++;
      N(`trees on the right of way in the big woods, 1,000 to 1,260 m: ${trees} (one per ${(260 / trees).toFixed(1)} m)`);
      if (!(trees >= 20 && trees <= 90)) B(`${trees} trees on 260 m of right of way in the woods`);
      // ---- Clearances ----
      const fps = R.buildings.footprints ? R.buildings.footprints() : [];
      const box = f => { const t = Math.abs(Math.sin(f.yaw || 0)) > 0.5, w = t ? f.d : f.w, d = t ? f.w : f.d; return { x0: f.x - w / 2, x1: f.x + w / 2, z0: f.z - d / 2, z1: f.z + d / 2 }; };
      const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
      out.nfp = fps.length;
      for (const f of fps) {
        if (f.kind === 'nature' || f.flush) continue;
        if (hit(box(f), P.CAMP)) B(`the camp overlaps ${f.id || f.kind}`);
        if (hit(box(f), P.MUSTER)) B(`the muster overlaps ${f.id || f.kind} (${f.key || ''} at ${f.x}, ${f.z})`);
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
      const S = R.newState(1866, 'proto'), d33 = R.lnView.d33.on;
      if (S.schemaVersion !== 19 || R.CFG.SCHEMA_VERSION !== 19) B('the schema is not 19');
      if (!d33) {
        if ('dv' in S || 'ln' in S || 'cw' in S || 'lp' in S || 'hw' in S || 'tn' in S || 'away' in S.player) B('a new game carries D32 stores');
        R.simTick(S, [{ t: 'pdStart' }]);
        for (let i = 0; i < 300; i++) R.simTick(S, []);
        if ('dv' in S || 'ln' in S || 'cw' in S) B('D32 stores appeared with the line off');
        const tr0 = L.lnTrain(S);
        if (tr0.at !== 'away' || tr0.cars.length || L.lnOn(S) || L.lnOpenWork(S, 0) !== 0 || L.lnWork(S, 0, 5) !== 5) B('the line\'s functions with the line off');
      } else {
        // D33: the line is part of the world from the first morning, with the starting crew
        if (!S.ln || !S.ln.on || S.ln.crew !== 5 || !S.cw || S.cw.men.length !== 5 || 'lp' in S || 'away' in S.player) B('a new game does not begin with the line on and a crew of 5');
        if (!S.ln.f.every((v, i) => v === LINE.F0[i]) || !(LINE.F0[0] > LINE.F0[5] && LINE.F0[5] * LINE.M > 60)) B('a new game\'s fronts: ' + S.ln.f.join(', '));
        R.simTick(S, [{ t: 'pdStart' }]);
        for (let i = 0; i < 300; i++) R.simTick(S, []);
        if (!(S.ln.f[5] >= LINE.F0[5])) B('the line went backwards');
      }
      const offRuns = S.rr.runs.map(q => q.svc + ':' + q.kind + ':' + q.arr).join();
      // ---- The clock and the player's pace ----
      if (L.clockRate(S.track) !== 5 || L.clockRate({ world: 'hub' }) !== 7.5 || L.clockRate({ world: 'start' }) !== 7.5) B(`the clock: ${L.clockRate(S.track)} ticks a second`);
      if (!near(L.playerK(S.track) * L.clockRate(S.track), R.CFG.TICKS_PER_REAL_S) || L.playerK({ world: 'hub' }) !== 1) B('the player\'s pace does not make up for the clock');
      if (L.LN_PACE.throwS !== 24) B(`a lever throw takes ${L.LN_PACE.throwS} s`);
      {
        const W = R.newState(3, 'proto'); R.simTick(W, [{ t: 'pdStart' }]);
        const x0 = W.player.x, z0 = W.player.z; W.player.x = -20; W.player.z = -14;
        R.simTick(W, [{ t: 'walkTo', x: 20, z: -14 }]);
        let perTick = 0; for (let i = 0; i < 10; i++) { const xa = W.player.x, za = W.player.z; R.simTick(W, []); perTick = Math.max(perTick, Math.hypot(W.player.x - xa, W.player.z - za)); }
        const v = R.proto.playerWalkSpeed(W.track, false), real = perTick * L.clockRate(W.track);
        out.walk = { perTick, v, realUPerS: real };
        if (!near(perTick, v * R.CFG.TICK_GAME_S / 60, 0.02)) B(`the player walks ${perTick.toFixed(3)} u a tick, his pace says ${(v * 8 / 60).toFixed(3)}`);
        if (!near(real, v / 1.5 * 8 / 60 * 7.5, 0.1)) B('the player\'s real speed changed');
      }
      // ---- Saving: the v19 fixture ----
      const fx = JSON.parse(v19), sv = R.migrate(JSON.parse(fx.save)), st = sv.state;
      out.v19 = R.stateHash(st); out.v19want = fx.loads.v19;
      if ('ln' in st || 'dv' in st) B('the v19 save gained a line');
      if (L.lnOn(st)) B('the line is on in the v19 save');
      for (let i = 0; i < 60; i++) R.simTick(st, []);
      if ('ln' in st || 'dv' in st) B('the v19 save gained a line after 60 ticks');   // (D33: an old save's line starts at its next morning, pdNextDay)
      // ---- The line on: three days through the commands ----
      const play = () => {
        // (the line with the day's own cycle but no railroad trains: nobody plays the station here, and a train left
        // standing at a switch would rightly keep the work train waiting; check-worktrain plays the station too)
        const G = R.newState(1866, 'proto'), log = [];
        G.rr.on = false;
        const clk = () => { const s = (G.time + 5 * 3600) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
        let ev = R.simTick(G, [{ t: 'pdStart' }, { t: 'dvSet', k: 'crew', v: 30 }]);
        const ph0 = G.ln && G.ln.tr.ph;
        if (!G.ln || !G.ln.on || G.ln.crew !== 30 || !G.ln.run || !(ph0 === 'sStand' || (d33 && ph0 === 'home'))) B('a crew of 30 chosen in the morning is not at work that day: ' + JSON.stringify(G.ln && G.ln.tr));
        const days = [];
        let save = null, minSup = 1e9;
        for (let d = 0; d < 3; d++) {
          for (let i = 0; i < 12000 && G.pd.ph !== 'summary'; i++) {
            ev = R.simTick(G, []);
            for (const e of ev) if (e.t === 'wtPhase' || e.t === 'hcDone' || e.t === 'lnDone') log.push(d + ' ' + clk() + ' ' + e.t + ' ' + (e.ph || e.home + '/' + e.total));
            const f = G.ln.f;
            for (let k = 1; k < 6; k++) if (f[k] > f[k - 1] - LINE.GAP[k] + 1e-6 && f[k] > LINE.F0[k] + 1e-6) { B(`day ${d} ${clk()}: front ${k} at ${f[k]} is inside its gap behind ${f[k - 1]}`); i = 1e9; break; }
            if (f[0] > f[1] + LINE.CLEAR_AHEAD + 1e-6) { B('the clearers ran ahead'); break; }
            for (const k of Object.keys(G.ln.sup)) minSup = Math.min(minSup, G.ln.sup[k]);
            if (d === 1 && !save && clk() === '10:00') { R.simTick(G, [{ t: 'dvSet', k: 'view', v: 'line' }]); save = JSON.stringify({ state: G }); }   // (D33: one world, so the view stays 'station')
          }
          days.push({ f6: G.ln.f[5], sum: G.pd.sum && G.pd.sum.hc, days: G.ln.days, hc: G.ln.hc });
          if (d < 2) R.simTick(G, [{ t: 'pdNextDay' }]);
        }
        return { G, log, days, save, minSup, hash: R.stateHash(G) };
      };
      {
        const G = R.newState(1866, 'proto');
        R.simTick(G, [{ t: 'pdStart' }, { t: 'dvSet', k: 'crew', v: 30 }]);
        for (let i = 0; i < 300; i++) R.simTick(G, []);
        if (G.rr.runs.map(q => q.svc + ':' + q.kind + ':' + q.arr).join() !== offRuns) B('the railroad\'s runs differ with the line on');
        if (G.rr.runs.some(q => q.kind === 'work')) B('a work run among the railroad\'s runs');
      }
      const A = play(), A2 = play();
      out.days = A.days; out.log = A.log.slice(0, 14);
      if (A.hash !== A2.hash) B('three line days are not the same twice');
      if (A.minSup < 0) B('a supply went below zero');
      const TOT = 30 + R.tf.TF_AGENTS.length;   // (Crew: the head count is the 30 rail men and the townsfolk; one townsman may still be out at 22:00)
      A.days.forEach((d, i) => {
        const grew = d.f6 - (i ? A.days[i - 1].f6 : LINE.F0[5]);
        if (!(grew > (i === 2 ? 80 : 120) && grew < 260)) B(   // (Crew: the third day is the day at the creek, where most of the crew goes to the trestle and back)
        `day ${i + 1}: ${grew.toFixed(1)} m spiked`);
        if (d.days !== i + 1) B(`day ${i + 1}: the line counts ${d.days} working days`);
        if (!d.sum || d.sum.total !== TOT || d.sum.home < TOT - 1) B(`day ${i + 1}: the summary's head count is ${JSON.stringify(d.sum)}`);
        if (!d.hc || d.hc.total !== TOT || d.hc.home < TOT - 1 || (d.hc.out || []).some(q => /the line|the work train/.test(q))) B(`day ${i + 1}: the 22:00 head count is ${JSON.stringify(d.hc)}`);
      });
      const first = A.log.filter(l => l.startsWith('0 ')).map(l => l.slice(2));
      // D33: the work train comes in at 06:05, stands from 06:15, leaves at 06:40 (the first train out) and runs in
      // one motion from the station to the railhead ('sOut' while it is on the station's map, then 'out'), standing
      // there a few minutes later; in the evening it holds just outside the junction ('gap') and backs in at 19:05.
      const wantLog = d33
        ? ['06:05 wtPhase sIn', '06:15 wtPhase sStand', '06:40 wtPhase sOut', '06:42 wtPhase out', '06:44 wtPhase stand', '18:20 wtPhase back', '19:00 wtPhase gap', '19:05 wtPhase eIn', '19:15 wtPhase eStand', '19:35 wtPhase eOut', '19:45 wtPhase home', '22:00 hcDone']
        : ['06:20 wtPhase sOut', '06:25 wtPhase out', '06:45 wtPhase stand', '18:20 wtPhase back', '19:00 wtPhase gap', '19:05 wtPhase eIn', '19:15 wtPhase eStand', '19:35 wtPhase eOut', '19:45 wtPhase home', '22:00 hcDone'];
      if (first.map(l => l.replace(/^(22:00 hcDone) \d+\/\d+$/, '$1')).join('|') !== wantLog.join('|')) B('the work train\'s first day: ' + first.join(' | '));
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
        if (s1.ln.view !== (d33 ? 'station' : 'line') || s1.ln.tr.ph !== 'stand') B('the save is not on the line');
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
    if (r.v19 !== r.v19want) P(`save-v19.json loads to the hash ${r.v19}, the fixture records ${r.v19want}`);
    // ---- Dev mode on the page ----
    const ui0 = await page.evaluate(() => ({ btn: document.getElementById('devBtn').hidden, row: document.getElementById('setDevRow').hidden, on: window.__railhead.dv.on(), cls: document.body.classList.contains('line') }));
    if (!ui0.btn || ui0.on) P('dev mode is on by default');
    if (ui0.cls) P('the page has the line\'s class with the line off');
    await page.evaluate(() => { const R = window.__railhead, b = document.getElementById('pdBoard'); if (b && !b.hidden) R.pdui.closeBoard(); R.guide.openSettings(); });
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
    // (stage 2: the hire rows are live; D33: "Ride out as a rail worker" and "Ride out now" are live, and "Look at
    // the line", the separate line screen's own row, is gone with it)
    const d33on = await page.evaluate(() => window.__railhead.lnView.d33.on);
    for (const id of ['crew', 'punch', 'load', 'deliver', ...(d33on ? ['ride', 'rideNow'] : ['ride:grey', 'look:grey']), 'skip', 'status']) if (!rows.includes(id)) P(`the dev panel has no row ${id} (rows: ${rows.join(' ')})`);
    await page.tap('#devRows button[data-dv="crew:30"]');
    await page.evaluate(() => window.__railhead.step(2));
    await page.waitForTimeout(500);
    const ui2 = await page.evaluate(() => { const S = window.__railhead.state; return { dv: S.dv, on: S.ln && S.ln.on, status: (document.getElementById('devStatus') || {}).textContent || '' }; });
    if (!ui2.dv || ui2.dv.crew !== 30 || !ui2.on) P('tapping Rail crew 30 did not start the line: ' + JSON.stringify(ui2.dv));
    if (!/Crew today: 30/.test(ui2.status) || !new RegExp('Spiked: ' + (d33on ? await page.evaluate(() => Math.floor(window.__railhead.ln.LINE.F0[5])) : 60) + ' of 2,520 m').test(ui2.status)) P('the dev panel\'s status: ' + ui2.status.replace(/\n/g, ' / '));
    await page.screenshot({ path: screenshotPath('d32-dev-panel-portrait') });
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
