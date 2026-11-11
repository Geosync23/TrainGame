// Check: the D27 world (plans/d27-tech.md section 8.2, the foundation's check): the layout at the D27 scale, its
// clearances, its walking distances and the migration of an old prototype save.
// - The layout's numbers (sections 1.3, 1.4, 2.2): tracks 1 and 3 at z -6 and 18.6, the four switches at x -72.9,
//   -62.5, 62.5, 72.9, legs of radius 20u, platform 1 60 x 9u (deck 0.375u), the raised cargo platform 52 x 14u at 1.6u
//   (car-floor height), its ramps, the freight house, the storage cells (2 x 40), the footbridges at x -14 and 14 (top
//   7.6, underside 7.2), the lever frames at (-33, -11) and (33, -11) with each switch's stand at its lever, the cart
//   crossing at x 37, the main street with six lots a side, the stock's sizes (PROTO_STOCK) and the schedule (9 runs).
// - Clearances: a standing train between the platforms (a car's half width under the deck edge's 2.3u), the bridges
//   over the tallest stack (the engine's 6.4u), the crossing clear of every standing train, the ramps clear of track
//   3's legs, no two buildings overlapping, nothing near the track but the decks; every train fits its straight and its
//   platform; the footbridge flights fall between the coach ends of every standing passenger train.
// - Walking (the player on the walk grid, in the sim): from the middle of platform 1 to each lever frame at most 36u;
//   the schedule board to the east frame at most 24u; platform 1 to the cargo platform by a footbridge at most 40u;
//   the storage to the main street by the cart path, pushing the platform cart, at most 120u; every shop door, pickup,
//   lever, storage cell, the parks and a boxcar's door spot at track 3 reachable; the cargo platform's faces are walls
//   (no step down onto track 2 or 3), its height 1.6u on it and sloping on the ramps (walkDeckY).
// - Saving: schema 19; save-v18.json migrates to the next morning on the D27 layout (trains and travellers cleared, the
//   goods kept and audited, the player at the schedule board); a new game's save reloads with the same hash.
// - The D27 switches start as each builder left them (on: board (P), handling (F), town (W), lessons (U); all on at the integration), ?d27=all turns them all on, and the stubs keep a day
//   running.
const fs = require('fs');
const path = require('path');
const { openGame, screenshotPath } = require('./browser');

const LIMITS = { leverFrame: 36, boardToEast: 24, footbridge: 40, cartToStreet: 120 };

module.exports = async function checkD27World() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    const r = await page.evaluate((LIMITS) => {
      const R = window.__railhead, D = R.d27, Pr = R.proto, Wd = R.world, S = R.state, T = S.track, P = D.PROTO, out = { bad: [], dist: {} }, B = m => out.bad.push(m);
      const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-6);
      // ---- The numbers ----
      if (S.schemaVersion !== 19 || R.CFG.SCHEMA_VERSION !== 19) B(`schema ${S.schemaVersion}, expected 19`);
      if (!near(P.M, 2.5 / 1.75)) B('PROTO.M is not 2.5u a 1.75 m person');
      if (P.D1 !== 6 || P.D3 !== 18.6) B(`tracks at z -${P.D1} and ${P.D3}`);
      const want = { W3: -72.9, W1: -62.5, E1: 62.5, E3: 72.9 };
      for (const [k, id] of Object.entries(Pr.PROTO_SW)) { const N = T.nodes[T.switches[id].node]; if (!near(N.x, want[k], 1e-3) || N.z !== 0) B(`switch ${k} at ${N.x}, ${N.z}`); }
      const arcs = T.edges.filter(E => E.k === 'A');
      if (arcs.length !== 8 || arcs.some(E => !near(E.R, 20, 1e-6))) B(`the legs' arcs: ${arcs.map(E => E.R).join(', ')} (want 8 of radius 20)`);
      const errs = R.trackValidate(T); if (errs.length) B('track validator: ' + errs.join('; '));
      for (const [nm, z, x0, x1] of [['track 1', -6, -40.9, 40.9], ['track 3', 18.6, -29.9, 29.9]]) for (let x = x0; x <= x1; x += 4) if (!Pr.protoTrackAt(T, z, x)) { B(`${nm} is not straight at x ${x.toFixed(1)}`); break; }
      const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      if (!eq([P.P1.x0, P.P1.x1, P.P1.z0, P.P1.z1], [-30, 30, -17.3, -8.3]) || P.DECK_Y !== 0.375) B(`platform 1: ${JSON.stringify(P.P1)}, deck ${P.DECK_Y}`);
      if (!eq([P.CARGO.x0, P.CARGO.x1, P.CARGO.z0, P.CARGO.z1], [-26, 26, 2.3, 16.3]) || P.DOCK_Y !== 1.6 || P.P2 !== P.CARGO) B(`the cargo platform: ${JSON.stringify(P.CARGO)}, deck ${P.DOCK_Y}`);
      if (!eq(P.RAMPS.map(q => [q.x0, q.x1, q.z0, q.z1]), [[-34, -26, 10.9, 13.9], [26, 34, 10.9, 13.9]])) B('the ramps');
      const cells = Object.values(P.STORE).reduce((n, b) => n + b.nc * b.nr, 0);
      if (cells !== 80 || Object.values(P.STORE).some(b => !near(b.cell * b.nc, b.x1 - b.x0, 1e-9) || !near(b.cell * b.nr, b.z1 - b.z0, 1e-9))) B(`the storage cells: ${cells}`);
      const FB = P.FB;
      if (!eq(FB.X, [-14, 14]) || FB.TOP !== 7.6 || FB.UNDER !== 7.2 || FB.OUT !== 24.5) B('the footbridges\' numbers');
      for (const [k, L] of Object.entries(D.PROTO_LEVERS)) { const W = T.switches[Pr.PROTO_SW[k]]; if (W.stand.x !== L.x || W.stand.z !== L.z || W.stand.ux !== L.ux || W.stand.uz !== L.uz) B(`switch ${k}'s stand is not its lever`); }
      if (!eq([P.LEVERS.W.x, P.LEVERS.W.z, P.LEVERS.E.x, P.LEVERS.E.z], [-33, -11, 33, -11])) B('the lever frames');
      if (T.crossings.length !== 2 || T.crossings.some(c => !near(c.x, 37, 0.01))) B(`the cart crossing's pads: ${JSON.stringify(T.crossings)}`);
      const St = D.PROTO_STOCK;
      if (St.loco.len !== 18 || St.cars.coach.len !== 13 || St.cars.boxcar.len !== 10 || St.cars.flatcar.len !== 10 || St.cars.coach.wid !== 4.2 || St.loco.h !== 6.4) B('the stock\'s sizes');
      if (St.coach.rows !== 7 || St.coach.seats !== 28 || St.boxcar.door.w !== 2.6) B('the stock\'s interiors');
      if (Pr.PROTO_SCHEDULE.length !== 9) B(`${Pr.PROTO_SCHEDULE.length} runs in the day, expected 9 (plans/d27-tech.md 8.5)`);
      if (D.TOWN27.buildings.length !== 12 || D.SHOPS27.length !== 12 || D.TOWN27.houses.length !== 8 || Object.keys(D.GOODS27).length !== 16) B('the town\'s or the goods\' tables are not complete');
      for (const sh of D.SHOPS27) if (!R.cargo.CARGO_TAGS[sh.tag]) B(`no cargo tag for ${sh.id}`);
      const daily = Object.values(D.SHOP_GOODS27.in).reduce((n, l) => n + l.reduce((m, q) => m + q[2], 0), 0);
      if (daily !== 8) B(`the day's goods for the town: ${daily}, expected 8 (D27 integration: half the goods, SHOP_GOODS27_HALF; the foundation's table had 14)`);
      if (JSON.stringify(D.flags()) !== JSON.stringify({ board: true, handling: true, town: true, lessons: true })) B(`the D27 switches: ${JSON.stringify(D.flags())} (expected on: board (P), handling (F), town (W), lessons (U); all on at the integration)`);
      // ---- Clearances ----
      const half = Math.max(St.cars.coach.wid, St.cars.boxcar.wid, St.loco.wid) / 2;
      if (!(half < P.EDGE)) B(`a car's half width ${half} reaches the deck edge (${P.EDGE} from its track)`);
      if (!(P.D1 - 2 * half > 1.5)) B('two trains on tracks 1 and 2 are too close');
      if (!(FB.UNDER - 0.34 > St.loco.h)) B(`the footbridges' underside ${FB.UNDER} does not clear the stack (${St.loco.h} over the rail top)`);
      const L = run => St.loco.len + run.cars * ((run.kind === 'pax' ? St.cars.coach.len : St.cars.boxcar.len) + 0.16);
      for (const run of Pr.PROTO_SCHEDULE) {
        if (run.through) continue;
        const front = P.STOP[run.track][run.to], dir = run.to === 'E' ? -1 : 1, tail = front + dir * L(run), lo = Math.min(front, tail), hi = Math.max(front, tail);
        const z = run.track === 't1' ? -P.D1 : P.D3, deck = run.track === 't1' ? P.P1 : P.CARGO;
        if (!Pr.protoTrackAt(T, z, lo) || !Pr.protoTrackAt(T, z, hi)) B(`${run.id} does not stand on its straight (x ${lo.toFixed(1)} to ${hi.toFixed(1)})`);
        if (lo < deck.x0 - 8 || hi > deck.x1 + 8) B(`${run.id} stands off its platform (x ${lo.toFixed(1)} to ${hi.toFixed(1)})`);
        if (run.track === 't1' && hi > P.XING_CART.x - 2.5) B(`${run.id} stands on the cart crossing`);
        if (run.kind === 'pax') {   // the coach ends: never beside a flight
          const ends = []; let a = St.loco.len + 0.16;
          for (let i = 0; i < run.cars; i++) { ends.push(front + dir * a, front + dir * (a + St.cars.coach.len)); a += St.cars.coach.len + 0.16; }
          for (const b of D.PROTO_LEVELS.filter(q => q.kind === 'bridge')) for (const s of b.parts.filter(q => q.k === 'stair' && q.plat === 'p1')) for (const e of ends) if (e > s.x0 - 0.3 && e < s.x1 + 0.3) B(`${run.id}: a coach end (x ${e.toFixed(1)}) stands beside ${b.id}'s flight`);
        }
      }
      for (const q of P.RAMPS) for (const E of T.edges) { const n = Math.ceil(E.len / 0.5); for (let i = 0; i <= n; i++) { const p = R.edgeAt(T, E, E.len * i / n); if (p.x > q.x0 - 1.5 && p.x < q.x1 + 1.5 && p.z > q.z0 - 2.5 && p.z < q.z1 + 2.5) { B(`ramp ${q.id} is within 2.5u of track (edge ${E.id})`); i = n; } } }
      const fps = Wd.buildingFootprints(), dist = (f, x, z) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.hypot(Math.max(0, Math.abs(lx) - f.w / 2), Math.max(0, Math.abs(lz) - f.d / 2)); };
      for (const f of fps) {
        if (f.flush) continue;
        for (const E of T.edges) { const n = Math.ceil(E.len / 0.5); for (let i = 0; i <= n; i++) { const p = R.edgeAt(T, E, E.len * i / n); if (dist(f, p.x, p.z) < 2.6) { B(`${f.id} is ${dist(f, p.x, p.z).toFixed(2)}u from track`); i = n; } } }
      }
      const box = f => { const t = Math.abs(Math.sin(f.yaw || 0)) > 0.5, w = t ? f.d : f.w, d = t ? f.w : f.d; return [f.x - w / 2, f.x + w / 2, f.z - d / 2, f.z + d / 2]; };
      for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
        const a = fps[i], b = fps[j];
        if (a.flush || b.flush) continue;
        const A = box(a), Bx = box(b);
        if (A[0] < Bx[1] - 1e-6 && Bx[0] < A[1] - 1e-6 && A[2] < Bx[3] - 1e-6 && Bx[2] < A[3] - 1e-6) B(`${a.id} overlaps ${b.id}`);
      }
      for (const l of D.TOWN27.lots) for (const m of D.TOWN27.lots) if (l !== m && l.x0 < m.x1 && m.x0 < l.x1 && l.z0 < m.z1 && m.z0 < l.z1) { B('two lots overlap'); break; }
      // ---- Heights and walls ----
      const y = (x, z) => D.walkDeckY(T, x, z);
      if (y(0, 12) !== 1.6 || !near(y(30, 12.4), 0.8, 0.05) || !near(y(-33.7, 12.4), 0.06, 0.1) || y(0, -12) !== 0.375 || y(-8.3, -38) !== 0.3 || y(0, -60) !== 0 || !near(y(14, -3), 7.6, 1e-6)) B(`walking heights: cargo ${y(0, 12)}, ramp ${y(30, 12.4)}, ramp foot ${y(-33.7, 12.4)}, platform 1 ${y(0, -12)}, boardwalk ${y(-8.3, -38)}, street ${y(0, -60)}, bridge ${y(14, -3)}`);
      const G = Wd.walkGrid(T), Wk = Wd.walk, cell = (x, z) => Math.floor((z - Wk.Z0) / Wk.CELL) * Wk.N + Math.floor((x - Wk.X0) / Wk.CELL);
      for (const [x, z0, z1] of [[0, 2.55, 1.6], [-20, 16.05, 17.0], [25.75, 6, 6]]) if (Pr.walkStep(G, cell(x, z0), cell(x + (z0 === z1 ? 0.5 : 0), z1))) B(`a walker steps off the cargo platform's face at x ${x}`);
      // ---- Walking ----
      const walk = (a, b, tool) => {
        const s = JSON.parse(JSON.stringify(S)), Pl = s.player;
        Pl.x = a[0]; Pl.z = a[1]; Pl.mode = 'idle';
        if (tool !== undefined) { Pl.tool = tool; s.tools[tool].x = Math.round(a[0] * 100); s.tools[tool].z = Math.round(a[1] * 100); }
        R.simTick(s, [{ t: 'walkTo', x: Math.round(b[0] * 100), z: Math.round(b[1] * 100) }]);
        let d = 0, px = Pl.x, pz = Pl.z, ms = 0;
        for (let i = 0; i < 6000 && s.player.mode !== 'idle'; i++) { const t0 = performance.now(); R.simTick(s, []); ms = Math.max(ms, performance.now() - t0); d += Math.hypot(s.player.x - px, s.player.z - pz); px = s.player.x; pz = s.player.z; }
        return { d, miss: Math.hypot(s.player.x - b[0], s.player.z - b[1]), ms };
      };
      const mid = [0, (P.P1.z0 + P.P1.z1) / 2], use = k => [D.PROTO_LEVERS[k].ux, D.PROTO_LEVERS[k].uz], board = [P.PLAYER.x, P.PLAYER.z];
      const legs = [
        ['platform 1 middle to the west lever frame', mid, use('W1'), LIMITS.leverFrame],
        ['platform 1 middle to the east lever frame', mid, use('E1'), LIMITS.leverFrame],
        ['the schedule board to the east lever frame', board, use('E3'), LIMITS.boardToEast],
        ['platform 1 to the cargo platform by the east footbridge', [FB.OUT + 1, -11.5], [FB.OUT + 1, 6.5], LIMITS.footbridge],
        ['platform 1 to the cargo platform by the west footbridge', [-FB.OUT - 1, -11.5], [-FB.OUT - 1, 6.5], LIMITS.footbridge],
      ];
      for (const [k, a, b, lim] of legs) {
        const w = walk(a, b);
        out.dist[k] = +w.d.toFixed(1);
        if (w.miss > 0.3) B(`${k}: the walk ended ${w.miss.toFixed(2)}u short`);
        if (!(w.d <= lim)) B(`${k}: ${w.d.toFixed(1)}u walked, at most ${lim}u`);
      }
      // The storage to the street, pushing the platform cart (by the east ramp, the crossing and the cart path).
      const cart = S.tools.findIndex(t => t.k === 'cart27');
      if (cart < 0) B('no platform cart among the tools');
      else {
        const w = walk([0, 12.4], [0, -40], cart);
        out.dist['the storage to the main street, pushing the cart'] = +w.d.toFixed(1); out.cartMs = +w.ms.toFixed(1);
        if (w.miss > 0.5) B(`the cart to the street: the walk ended ${w.miss.toFixed(2)}u short`);
        if (!(w.d <= LIMITS.cartToStreet)) B(`the cart to the street: ${w.d.toFixed(1)}u, at most ${LIMITS.cartToStreet}u`);
        const Gc = Wd.walkGrid(T, true);
        for (const b of D.PROTO_LEVELS.filter(q => q.kind === 'bridge')) if (Gc.cost[cell(b.x, -3)] > 0 || Gc.cost[cell(b.parts[1].xFoot - Math.sign(b.parts[1].xFoot) * 2, b.parts[1].z0 + 0.7)] > 0) B(`the cart may use footbridge ${b.id}`);
      }
      // Reachability from the start.
      const area = (G, x, z) => { const c = cell(x, z); return G.cost[c] > 0 ? G.comp[c] : -1; }, home = area(G, S.player.x, S.player.z);
      const nearOpen = (x, z) => { for (const r of [0, 0.25, 0.5, 0.75, 1]) for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (area(G, x + dx, z + dz) === home) return true; return false; };
      const places = [];
      for (const sh of D.SHOPS27) places.push([`${sh.id}'s door`, sh.door.x, sh.door.z], [`${sh.id}'s pickup`, sh.pickup.x, sh.pickup.z]);
      for (const [k, L] of Object.entries(D.PROTO_LEVERS)) places.push([`lever ${k}`, L.ux, L.uz]);
      for (const [blk, Bk] of Object.entries(P.STORE)) for (let c = 0; c < Bk.nc; c++) for (let rr = 0; rr < Bk.nr; rr++) { const q = D.storeCellAt(blk, c, rr); places.push([`cell ${blk}${c},${rr}`, q.x, q.z]); }
      for (const t of R.carry.TOOL_PARK) places.push([`${t.k} park`, t.x / 100, t.z / 100]);
      for (const [b, v] of Object.entries(R.cargo.BLD_BAYS)) v.bays.forEach((q, i) => places.push([`${b} bay ${i}`, q.x, q.z]));
      for (const x of [-20, -5, 5, 20]) places.push([`a boxcar's door spot at track 3 (x ${x})`, x, P.D3 - P.EDGE - 0.35 - 0.5]);
      P.TOWN_EXITS.forEach(([x, z], i) => places.push([`town exit ${i}`, x, z]));
      for (const [nm, x, z] of places) if (!nearOpen(x, z)) B(`${nm} (${x.toFixed(1)}, ${z.toFixed(1)}) cannot be reached from the start`);
      // ---- A new game's save reloads; the stubs keep a short run going with every switch on ----
      return out;
    }, LIMITS);
    for (const m of r.bad) P(m);
    console.log(`  walking (u): ${JSON.stringify(r.dist)}; slowest tick pushing the cart ${r.cartMs} ms`);
    // ---- The v18 save migrates to the next morning on the D27 layout ----
    const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v18.json'), 'utf8'));
    const m = await page.evaluate(json => {
      const R = window.__railhead, old = JSON.parse(json).state, oldAlive = old.items.alive.filter(Boolean).length, oldDay = old.pd.day;
      const st = R.migrate(JSON.parse(json)).state, P = R.d27.PROTO;
      const sod = (st.time + R.CFG.DAY_START_S) % 86400, day = Math.floor((st.time + R.CFG.DAY_START_S) / 86400);
      const places = st.items.where.filter(Boolean).map(w => w.kind);
      return { v: st.schemaVersion, world: st.track.world, xing: st.track.crossings.map(c => Math.round(c.x)), day, pdDay: st.pd.day, ph: st.pd.ph, sod, oldDay,
        trains: st.trains.filter(t => !t.away && t.consist.length).length, pax: st.pax.list.length, runs: st.rr.runs.length, player: [st.player.x, st.player.z, st.player.tool],
        alive: st.items.alive.filter(Boolean).length, oldAlive, audit: R.d27.itemAudit(st), places, tools: st.tools.map(t => t.k), board: [P.PLAYER.x, P.PLAYER.z] };
    }, fx.save);
    if (m.v !== 19 || m.world !== 'proto' || m.xing.some(x => x !== 37)) P(`save-v18 migrated: ${JSON.stringify({ v: m.v, world: m.world, xing: m.xing })}`);
    if (m.sod !== 6 * 3600 || m.day !== m.oldDay + 1 || m.pdDay !== m.day || m.ph !== 'morning') P(`save-v18 migrated to ${m.day} ${m.sod / 3600}h (${m.ph}), expected the next morning (day ${m.oldDay + 1}, 06:00)`);
    if (m.trains || m.pax || m.runs) P(`save-v18 migrated with ${m.trains} trains, ${m.pax} travellers, ${m.runs} runs (expected none)`);
    if (m.player[0] !== m.board[0] || m.player[1] !== m.board[1] || m.player[2] !== null) P(`save-v18 migrated with the player at ${m.player}`);
    if (m.alive < m.oldAlive || m.audit.length) P(`save-v18 migrated goods: ${m.oldAlive} before, ${m.alive} after; audit: ${m.audit.slice(0, 3).join('; ')}`);
    if (m.places.some(k => k === 'CAR' || k === 'CARRIED') || !m.tools.includes('cart27')) P(`save-v18 migrated: goods in ${[...new Set(m.places)]}, tools ${m.tools}`);
    console.log(`  save-v18: migrated to day ${m.day + 1} 06:00, ${m.alive} goods (${[...new Set(m.places)].join(', ')}), tools ${m.tools.join(', ')}`);
    // ---- A new game's save reloads with the same hash; a short run with every D27 switch on (the stubs) ----
    const h = await page.evaluate(() => { const R = window.__railhead; R.step(30); const a = R.hash(), b = R.importSave(R.exportSave()); return { a, b }; });
    if (h.a !== h.b) P(`a new game's save reloads with a different hash (${h.a}, ${h.b})`);
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d27=all' });
    try {
      const r = await page.evaluate(() => {
        const R = window.__railhead, S = R.newState(1866, 'proto'), ev = {};
        for (const k of ['board', 'handling', 'town', 'lessons']) if (!R.d27.d27On(S.track, k)) return { bad: 'd27=all did not turn ' + k + ' on' };
        R.simTick(S, [{ t: 'pdStart' }]);
        // A switchman sets each switch for the first train that needs it (no walking: the stubs are what is tested).
        // Until 20 minutes after the third stopping run's time to stand (T re-times the day: read from the schedule).
        const third = R.proto.PROTO_SCHEDULE.filter(v => !v.through).map(v => v.arr).sort((a, b) => a - b)[2], hours = (third + 1200 - 6 * 3600) / 3600;
        for (let i = 0; i < 450 * hours; i++) {
          const seen = new Set();
          for (const n of R.rr.rrSwitchNeeds(S)) if (!n.passed && !seen.has(n.sw)) { seen.add(n.sw); S.track.switches[n.sw].state = n.want === 'reverse' ? 'R' : 'N'; }
          R.pb.pbTestPunchAll(S);   // P (board on): every seated ticket punched, as the switchman sets the switches
          for (const run of S.rr.runs) if (run.ph === 'stand' && run.ready && S.time > run.dep) { const tr = S.trains[run.slot], sp = R.rr.rrWaveSpot(S, tr.id); S.player.x = sp.x; S.player.z = sp.z; for (const e of R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }])) { if (e.t === 'rrRefused') ev['refused: ' + e.why] = 1; ev[e.t] = (ev[e.t] || 0) + 1; } }
          for (const e of R.simTick(S, [])) ev[e.t] = (ev[e.t] || 0) + 1;
        }
        const cmds = ['pbEnter', 'pbWalk', 'pbPunch', 'pbLeave', 'frDoor', 'frTake', 'frPut', 'frCart', 'frDeliver', 'frPickup'].map(t => R.simTick(S, [{ t }]).filter(e => /Refused$/.test(e.t)).length);
        return { ev, cmds, hours, audit: R.d27.itemAudit(S), sod: (S.time + 18000) % 86400 / 3600, runs: S.rr.runs.filter(r => r.day === 0).map(r => r.svc + ':' + r.ph + (r.ready ? '+' : '')).join(' ') };
      });
      if (r.bad) P(r.bad);
      else {
        if (!(r.ev.rrArrived >= 3) || !(r.ev.rrWavedOff >= 1)) P(`with every D27 switch on (the stubs), ${r.ev.rrArrived || 0} trains came in and ${r.ev.rrWavedOff || 0} were sent off over ${r.hours.toFixed(1)} hours (${r.runs}; ${Object.keys(r.ev).filter(k => /^refused/.test(k)).join('; ')})`);
        if (r.cmds.some(n => n !== 1)) P(`the D27 commands with the stubs: refusals ${r.cmds}`);
        if (r.audit.length) P('with every D27 switch on: item audit: ' + r.audit.slice(0, 3).join('; '));
        console.log(`  every D27 switch on (the stubs): to ${r.sod.toFixed(1)}h, ${r.ev.rrArrived || 0} trains in, ${r.ev.rrWavedOff || 0} sent off, the commands each refused once`);
      }
      if (errors.length) P('d27=all: console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // ---- Screenshots (portrait and landscape): the station area with p2 and f1 standing, the cargo platform, the main
  // street, and the whole station zoomed out (test-output/d27-foundation-*.png) ----
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P(`${orient}: the atlas did not load`));
      await page.evaluate(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.rr.protoDebugScenario(R.newState(1866, 'proto'), 9, 45, ['p2', 'f1']) })); R.pdui.closeBoard(); });
      const shots = [['', 1.5, 14, -12], ['-cargo', 1.5, 6, 11], ['-street', 1.0, 0, -60], ['-overview', 0.4, 0, -8]];
      for (const [nm, zoom, x, z] of shots) {
        await page.evaluate(([zoom, x, z]) => { const R = window.__railhead; R.camera.zoom = zoom; R.pix.pixLookAt(x, z); }, [zoom, x, z]);
        await page.waitForTimeout(500);
        await page.screenshot({ path: screenshotPath(`d27-foundation${nm}-${orient}`) });
      }
      const st = await page.evaluate(() => ({ ms: +window.__railhead.pix.stats.msAvg.toFixed(2), items: window.__railhead.pix.stats.items, ground: window.__railhead.pix.stats.groundMs }));
      console.log(`  ${orient}: screenshots test-output/d27-foundation{,-cargo,-street,-overview}-${orient}.png; ground layer ${st.ground} ms, frame ${st.ms} ms average`);
      if (errors.length) P(`${orient} screenshots: console errors: ` + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
