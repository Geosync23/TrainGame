// Check: the real starting world (M1 package 9, design-doc 15).
// - A new game (no ?world=yard) is in the real start: the hub with its buildings and Willow Ford with its kit.
// - The spur from the hub's platform switch to Willow Ford's west switch is about 160u x SC (10 miles, 256u since D15).
// - The track passes the validator; every building keeps the section 6 clearance from every track edge;
//   no footprints overlap (except a depot's office bay on its platform, lamps on platforms, the shed's dock);
//   the hub's buildings and tool spots stand inside the hub boundary; each depot's use spots (ticket window,
//   telegraph, desk) are on its platform and can be walked to.
// - The interchange is joined to the hub's main track by a switch, and No. 1 can be routed to its end.
// - No. 1 is routed from the hub to Willow Ford's platform, on into the headshunt, back round the run-around
//   loop, and home to the hub's platform, arriving each time. The Overland still sets out its cars.
// - The ground is flat under all track (and 4u either side) and across the hub boundary; there are hills.
// - Same commands twice, same hash (with the Overland's test delivery, so it sets out cars). Walk grid build time, memory and a long walk's tick time are reported.
// - Draw calls in the busiest views (the hub with the train, the Overland's cars and 200 walkers, and Willow
//   Ford with the train) stay under 100, portrait and landscape; screenshots at noon of both stations.
// - (D13) A new game has 8 cords of wood on the ground at the hub's wood stage, off every footprint, on open walk
//   grid cells the handcart may reach; item conservation passes; the test yard (?world=yard) still starts with none.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkWorldStart() {
  const problems = [];
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      const r = await page.evaluate(() => {
        const R = window.__railhead, Wd = R.world, S = R.state, T = S.track, out = { bad: [] }, P = m => out.bad.push(m), SC = R.CFG.SCALE;
        if (T.world !== 'start') P(`a new game is in the "${T.world}" world, not the real start`);
        const St = Wd.stationsOf(T);
        if (!St.some(s => s.id === 'hub') || !St.some(s => s.id === 'willow')) P('STATIONS lacks the hub or Willow Ford');
        const fps = R.buildings.footprints(), ids = fps.map(f => f.id);
        for (const id of ['platform', 'depot', 'freightshed', 'freightdock', 'watertower', 'woodstage', 'wfplatform', 'wfdepot', 'wftower'])
          if (!ids.includes(id)) P(`no building ${id}`);
        if (fps.filter(f => f.kind === 'cabin').length < 3) P('fewer than 3 cabins at Willow Ford');
        const plat = fps.find(f => f.id === 'platform');
        // D12's 20u x 2.4u, x SC since D15, then 2.5 times as deep (the wide platforms): 32u x 9.6u; Willow Ford as deep.
        if (plat && (Math.abs(plat.w - 20 * SC) > 1e-6 || Math.abs(plat.d - 2.5 * 2.4 * SC) > 1e-6)) P(`hub platform is ${plat.w} x ${plat.d}, not ${20 * SC} x ${2.5 * 2.4 * SC} (D12, x SC since D15, 2.5 times as deep since the wide platforms)`);
        const wfp = fps.find(f => f.id === 'wfplatform');
        if (wfp && (Math.abs(wfp.w - 16 * SC) > 1e-6 || Math.abs(wfp.d - 2.5 * 2.4 * SC) > 1e-6)) P(`Willow Ford's platform is ${wfp.w} x ${wfp.d}, not ${16 * SC} x ${2.5 * 2.4 * SC}`);
        // The spur: the main-line edges between the hub's platform switch (x 40 x SC) and Willow Ford's west switch.
        const W1 = T.switches[2], wx = T.nodes[W1.node].x;
        out.spur = T.edges.filter(E => E.cls === 'main' && Math.min(T.nodes[E.a].x, T.nodes[E.b].x) >= 40 * SC - 1e-6 && Math.max(T.nodes[E.a].x, T.nodes[E.b].x) <= wx + 1e-6).reduce((n, E) => n + E.len, 0);
        if (Math.abs(out.spur - 160 * SC) > SC) P(`the spur is ${out.spur.toFixed(2)}u, not about ${160 * SC}u (10 miles)`);
        const errs = R.trackValidate(T);
        if (errs.length) P('track validator: ' + errs.join('; '));
        if (T.switches.length !== 4) P(`${T.switches.length} switches, expected 4 (interchange, platform track, 2 at Willow Ford)`);
        // (D13) The starting cords at the hub's wood stage.
        {
          const hub = R.tt.ttStation(S, 'hub'), ws = fps.find(f => f.id === 'woodstage'), Wk = Wd.walk, grid = Wd.walkGrid(T);
          const open = (x, z) => { const cx = Math.floor((x - Wk.X0) / Wk.CELL), cz = Math.floor((z - Wk.Z0) / Wk.CELL); return grid.cost[cz * Wk.N + cx] > 0; };
          const all = []; for (let i = 0; i < S.items.next; i++) if (S.items.alive[i]) all.push(i);
          const cords = all.filter(i => S.items.waybill[i].commodity === 'cordwood' && S.items.where[i].kind === 'GROUND');
          out.cords = cords.length;
          if (all.length !== 8 || cords.length !== 8) P(`a new game should start with exactly 8 cords (items: ${all.length}, cords on the ground: ${cords.length})`);
          for (const i of cords) {
            const x = S.items.where[i].x / 100, z = S.items.where[i].z / 100;
            if (Math.hypot(x - hub.wood.x, z - hub.wood.z) > 6 * SC) P(`cord ${i} at ${x}, ${z} is not at the wood stage`);
            if (fps.some(f => Math.abs(x - f.x) < f.w / 2 && Math.abs(z - f.z) < f.d / 2)) P(`cord ${i} lies inside a building's footprint`);
            if (!open(x, z) || R.carry.carryNoCartAt(x, z)) P(`cord ${i} is not on open ground the handcart can reach`);
          }
          if (!ws) P('no wood stage');
          const cons = R.cargo.itemCheckConservation(S);
          if (cons.length) P('item conservation in a new game: ' + cons.join('; '));
        }
        // Clearances (section 6), as check-buildings.js does for the test yard.
        const dist = (f, x, z) => {
          const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
          return Math.hypot(Math.max(0, Math.abs(lx) - f.w / 2), Math.max(0, Math.abs(lz) - f.d / 2));
        };
        out.minClear = Infinity;
        for (const f of fps) {
          for (const E of T.edges) {
            const need = (f.flush ? 0.9 : (E.cls === 'yard' ? 1.0 : 1.2)) * SC, n = Math.max(1, Math.ceil(E.len / 0.25));
            for (let i = 0; i <= n; i++) {
              const p = R.edgeAt(T, E, E.len * i / n), d = dist(f, p.x, p.z);
              if (!f.flush) out.minClear = Math.min(out.minClear, d - need);
              if (d < need - 1e-6) { P(`${f.id} is ${d.toFixed(3)}u from edge ${E.id} (needs ${need}u)`); break; }
            }
          }
          for (const W of T.switches) for (const [x, z] of [[W.stand.x, W.stand.z], [W.stand.ux, W.stand.uz]]) if (dist(f, x, z) < 0.5) P(`${f.id} is within 0.5u of switch ${W.id}'s stand`);
        }
        for (const pf of fps.filter(f => f.flush && f.kind !== 'freightshed')) {
          let best = Infinity;
          for (const E of T.edges) for (let i = 0; i <= 80; i++) { const p = R.edgeAt(T, E, E.len * i / 80); best = Math.min(best, dist(pf, p.x, p.z)); }
          if (best > 0.95 * SC) P(`${pf.id}'s edge is ${best.toFixed(3)}u from its track, not flush at ${0.9 * SC}u`);
        }
        const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6;
        for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
          const a = fps[i], b = fps[j], pair = [a.id, b.id].sort().join('+');
          if (['depot+platform', 'wfdepot+wfplatform', 'freightdock+freightshed'].includes(pair)) continue;
          if ((a.kind === 'lamp' && b.flush) || (b.kind === 'lamp' && a.flush)) continue;
          if (overlap(a, b)) P(`${a.id} overlaps ${b.id}`);
        }
        const H = Wd.HUB, inHub = (x, z) => x >= H.x0 && x <= H.x1 && z >= H.z0 && z <= H.z1;
        if (Math.abs(H.x1 - H.x0 - 120 * SC) > 1e-9 || Math.abs(H.z1 - H.z0 - 80 * SC) > 1e-9) P('the hub boundary is not 60 x 40 tiles');
        for (const f of fps.filter(f => f.x < 60 * SC)) if (!inHub(f.x, f.z)) P(`${f.id} stands outside the hub boundary`);
        for (const t of R.carry.TOOL_PARK) {
          if (!inHub(t.x / 100, t.z / 100)) P(`the ${t.k} spot is outside the hub boundary`);
          for (const f of fps) { const d = dist(f, t.x / 100, t.z / 100); if (d < 0.3 + (t.k === 'cart' ? 1.05 : 0.4)) P(`the ${t.k} parking spot is ${d.toFixed(2)}u from ${f.id}`); }
        }
        // Use spots: on the platform and open in the walk grid.
        const G = Wd.walkGrid(T), spots = Wd.buildingSpots();
        // The ticket spot is inside the depot's booth (behind the counter, 2026-11-03); the queue's start ('line') is on the platform.
        for (const st of St) for (const k of ['ticket', 'line', 'telegraph', 'desk']) {
          const sp = spots.find(s => s.building === st.depot && s.kind === k);
          if (!sp) { P(`${st.id}: no ${k} spot`); continue; }
          const pf = fps.find(f => f.id === st.platforms[0]);
          if (k === 'ticket') {
            const dp = fps.find(f => f.id === st.depot), strip = R.board.booths().find(b => b.id === st.depot && b.part === 'strip');
            if (!dp || dist(dp, sp.x, sp.z) > 1e-6 || !strip || dist(strip, sp.x, sp.z) > 1e-6) P(`${st.id}: the ticket spot is not in the depot's booth`);
          } else if (!pf || dist(pf, sp.x, sp.z) > 1e-6) P(`${st.id}: the ${k} spot is not on the platform`);
          const W = Wd.walk, i = Math.floor((sp.x - W.X0) / W.CELL), j = Math.floor((sp.z - W.Z0) / W.CELL);
          if (!G.cost[j * W.N + i]) P(`${st.id}: the ${k} spot cannot be walked to`);
        }
        out.spots = spots.length;
        // The interchange joins the hub by a switch: from its end, with switch 0 reversed, the track leads
        // through switch 0's diverging leg onto the main track.
        const ie = R.interchange.interchangeEdge(T), sw0 = T.switches[0];
        sw0.state = 'R';
        const seg = []; const w = R.trackWalk(T, { e: ie, s: 1, d: -1 }, 20 * SC, seg);
        if (w.blocked) P('from the interchange the track does not lead on: ' + w.blocked);
        if (!seg.some(([e]) => e === sw0.reverse) || w.pos.e !== sw0.trunk) P('the interchange is not joined to the main track through switch 0');
        sw0.state = 'N';
        // Routes: No. 1 to the interchange's lead, then hub -> Willow Ford -> headshunt -> loop -> hub.
        const go = (x, z, label) => {
          const n = R.trackNearest(T, x, z), ev = R.simTick(S, [{ t: 'trainSendTo', tr: 0, e: n.e, s: Math.round(n.s * 1000) }]);
          const nr = ev.find(e => e.t === 'noRoute');
          if (nr) { P(`${label}: no route (${nr.why})`); return; }
          let k = 0; while (k < 8000 && S.trains[0].mode !== 'idle') { R.simTick(S, []); k++; }
          const ps = R.trainPoses(T, S.trains[0]), st = S.trains[0].status;
          if (st !== 'Arrived') P(`${label}: ${st}`);
          out.routes.push(`${label} ${k} ticks`);
          return ps;
        };
        out.routes = [];
        const A = T.nodes[T.edges[ie].a], lead = T.edges.find(E => E.k === 'S' && E.cls === 'yard' && E.len < 2.5 * SC && Math.abs(T.nodes[E.a].z - 0.5 * A.z) < 1.5 * SC && T.nodes[E.a].x < 5 * SC);
        if (!lead) P('no lead track by the interchange');
        else {
          // From the platform track the way to the interchange reverses on the main line: out east past switch 1 first.
          go(52 * SC, 0, 'out onto the spur');
          const m = R.edgeAt(T, lead, lead.len / 2); go(m.x, m.z, 'back to the interchange lead');
        }
        const wf = St.find(s => s.id === 'willow'), hub = St.find(s => s.id === 'hub'), mid = (sp, f) => [sp.x0 + (sp.x1 - sp.x0) * f, sp.z0 + (sp.z1 - sp.z0) * f];
        let ps = go(...mid(wf.tracks.main, 0.5), 'hub to Willow Ford');
        if (ps && !(ps[0].x > wf.tracks.main.x0 - SC && ps[0].x < wf.tracks.main.x1 + 3 * SC)) P(`at Willow Ford the engine is at x ${ps[0].x.toFixed(1)}, not at the platform`);
        go(...mid(wf.tracks.headshunt, 0.9), 'on into the headshunt');
        ps = go(...mid(wf.tracks.loop, 0.5), 'back round the loop');
        if (ps && ps.some(p => Math.abs(p.z - wf.tracks.loop.z0) > 0.5 * SC)) P('the train is not wholly on the run-around loop');
        go(wf.tracks.main.x0 - 25 * SC, wf.tracks.main.z0, 'out past switch 2 onto the spur');
        go(...mid(wf.tracks.main, 0.5), 'back through switch 2 to the platform');
        ps = go(...mid(hub.tracks.platform, 0.9), 'home to the hub');
        // Flat ground under all track (and 4u either side), and across the hub boundary.
        const th = Wd.terrainHeight, Bd = Wd.WORLDS.start.bounds;
        out.trackBad = 0; out.hubBad = 0;
        for (const E of T.edges) {
          const n = Math.max(2, Math.ceil(E.len / 0.25));
          for (let i = 0; i <= n; i++) {
            const p = R.edgeAt(T, E, E.len * i / n);
            for (const o of [-4, -0.75, 0, 0.75, 4].map(v => v * SC)) {
              const x = p.x - p.tz * o, z = p.z + p.tx * o;
              if (x < Bd.x0 || x > Bd.x1 || z < Bd.z0 || z > Bd.z1) continue;
              if (th(x, z) !== 0) out.trackBad++;
            }
          }
        }
        for (let x = H.x0; x <= H.x1; x += 0.5) for (let z = H.z0; z <= H.z1; z += 0.5) if (th(x, z) !== 0) out.hubBad++;
        let mx = 0; for (let x = Bd.x0; x <= Bd.x1; x += 1) for (let z = Bd.z0; z <= Bd.z1; z += 1) mx = Math.max(mx, th(x, z));
        out.maxHeight = mx;
        // Same commands twice, same hash (2 game hours: the Overland's 06:00 visit and a run to Willow Ford).
        const script = [{ tick: 3, cmd: { t: 'trainRun', tr: 0, dir: 1 } }, { tick: 40, cmd: { t: 'walkTo', x: -2000 * SC, z: -1500 * SC } }, { tick: 400, cmd: { t: 'trainStop', tr: 0 } }];
        const run = () => R.simRun(R.interchange.withTestDelivery(R.newState(1866)), script, 900); // the Overland's fixed test delivery (C1: otherwise only ordered goods come)
        const s1 = run(), s2 = run();
        out.h1 = R.stateHash(s1); out.h2 = R.stateHash(s2);
        out.overland = { phase: s1.overland.phase, setOut: s1.trains.find(t => t.owner === 'interchange').consist.length, conservation: R.cargo.itemCheckConservation(s1) };
        // Walk grid: build time, memory, and a long walk (hub to Willow Ford) tick by tick.
        const t0 = performance.now(); for (let i = 0; i < 3; i++) Wd.walkGridBuild(T); out.buildMs = (performance.now() - t0) / 3;
        const g = Wd.walkGrid(T), gc = Wd.walkGrid(T, true), bytes = (q, ks) => ks.reduce((n, k) => n + q[k].byteLength, 0);
        // The search scratch (g, from, seen, dyn) is shared by the plain and the handcart grid (D15).
        out.cells = g.cost.length; out.mb = (bytes(g, ['cost', 'comp']) + bytes(gc, ['cost', 'comp']) + bytes(g.sc, ['g', 'from', 'seen', 'dyn']) * (g.sc === gc.sc ? 1 : 2)) / 1048576;
        const st = R.newState(1866);
        R.simTick(st, [{ t: 'walkTo', x: Math.round((Wd.WFORD.x + 18 * SC) * 100), z: Math.round((Wd.WFORD.z - 1.7 * SC) * 100) }]);
        let mxT = 0, sum = 0, nT = 0;
        for (let i = 0; i < 2000 && st.player.mode !== 'idle'; i++) { const t = performance.now(); R.simTick(st, []); const d = performance.now() - t; mxT = Math.max(mxT, d); sum += d; nT++; }
        out.walk = { ticks: nT, avg: sum / nT, max: mxT, end: Math.hypot(st.player.x - Wd.WFORD.x - 18 * SC, st.player.z - Wd.WFORD.z + 1.7 * SC) };
        // (D13) Only the real start has the starting cords. (Last: a test-yard state points the layout tables at the yard.)
        if (R.newState(1866, 'yard').items.next !== 0) P('the test yard should start with no items');
        R.newState(1866);
        return out;
      });
      problems.push(...r.bad);
      if (r.trackBad) problems.push(`ground not flat at the track: ${r.trackBad} sample points`);
      if (r.hubBad) problems.push(`ground not flat inside the hub boundary: ${r.hubBad} sample points`);
      if (!(r.maxHeight > 1)) problems.push(`no hills: highest ground ${r.maxHeight}u`);
      if (r.h1 !== r.h2) problems.push(`same commands, different hashes: ${r.h1} vs ${r.h2}`);
      if (!(r.overland.setOut >= 2)) problems.push(`the Overland set out ${r.overland.setOut} cars by 07:00 (phase ${r.overland.phase})`);
      if (r.overland.conservation.length) problems.push('item conservation: ' + r.overland.conservation.join('; '));
      if (r.walk.end > 1) problems.push(`a walk from the hub to Willow Ford ended ${r.walk.end.toFixed(1)}u short`);
      console.log(`  starting cords at the hub's wood stage: ${r.cords}`);
      console.log(`  spur ${r.spur.toFixed(2)}u; smallest building clearance margin ${r.minClear.toFixed(2)}u; ${r.spots} use spots; highest ground ${r.maxHeight.toFixed(2)}u`);
      console.log(`  routes: ${r.routes.join(', ')}`);
      console.log(`  walk grid ${r.cells} cells, built in ${r.buildMs.toFixed(1)} ms, ${r.mb.toFixed(1)} MB with the handcart grid; hub to Willow Ford on foot ${r.walk.ticks} ticks, ${r.walk.avg.toFixed(2)} ms a tick on average, ${r.walk.max.toFixed(1)} ms at most`);
      console.log(`  2 game hours twice: ${r.h1} / ${r.h2}; the Overland set out ${r.overland.setOut} cars`);
      if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  // Screenshots and draw calls at noon: the hub busy (train leaving, the Overland's cars set out, 200 walkers)
  // and Willow Ford with the train at its platform.
  for (const o of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(o, { query: '?paused&crowd=200' });
    try {
      const frame = () => page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res(window.__railhead.drawCalls)))));
      // The Overland comes in at 06:00 and sets out its cars by about 06:40.
      await page.evaluate(() => { const R = window.__railhead; R.interchange.withTestDelivery(R.state); R.state.time = 3600 - 80; R.step(330); R.send({ t: 'trainRun', tr: 0, dir: 1 }); R.step(30);
        const P = R.state.player, k = R.CFG.SCALE; P.x = 2 * k; P.z = -1.6 * k; P.mode = 'idle'; R.state.time = 7 * 3600; });
      await page.waitForTimeout(1200);
      const hub = await frame();
      await page.screenshot({ path: screenshotPath('world-start-hub-' + o) });
      const cars = await page.evaluate(() => window.__railhead.state.trains.find(t => t.owner === 'interchange').consist.length);
      await page.evaluate(() => { window.__railhead.camera.zoom = window.__railhead.CFG.ZOOM_MIN; });
      const hubWide = await frame();
      await page.screenshot({ path: screenshotPath('world-start-hub-wide-' + o) });
      // Willow Ford: No. 1 at its platform, the player on the platform.
      await page.evaluate(() => {
        const R = window.__railhead, S = R.state, T = S.track, wf = R.world.STATIONS.start[1].tracks.main, k = R.CFG.SCALE;
        const n = R.trackNearest(T, wf.x1 - k, wf.z1); S.trains[0].front = { e: n.e, s: n.s, d: T.nodes[T.edges[n.e].b].x > T.nodes[T.edges[n.e].a].x ? 1 : -1 };
        S.trains[0].mode = 'idle'; S.trains[0].v = 0; S.trains[0].route = null;
        const P = S.player; P.x = R.world.WFORD.x + 18 * k; P.z = R.world.WFORD.z - 1.7 * k; R.camera.zoom = 1.0; R.step(1);
      });
      await page.waitForTimeout(1200);
      const wfd = await frame();
      await page.screenshot({ path: screenshotPath('world-start-willow-' + o) });
      console.log(`  ${o}: draw calls hub busy ${hub} (${cars} set-out cars, 200 walkers), zoomed out ${hubWide}, Willow Ford ${wfd}`);
      for (const [k, v] of [['hub busy', hub], ['hub zoomed out', hubWide], ['Willow Ford', wfd]]) if (!(v < 100)) problems.push(`${o}: ${k}: ${v} draw calls (budget under 100)`);
      if (cars < 2) problems.push(`${o}: the busy hub view has ${cars} set-out cars`);
      if (errors.length) problems.push(`${o}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
