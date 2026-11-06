// Check: the hub world (D24, the station rework's foundation; plans/rework-tech.md).
// - A new game (?world=hub, the page's default since D24) is in the hub world, schema 17, with the railroad's store on,
//   No. 1 parked (away), the Overland away, the railroad's two train slots empty, no timetable services, no tutorial.
// - The track passes the validator; the through line runs straight along z = 0 from past the map's west edge to past
//   its east edge (the railroad's trains stand off the map there); with every switch straight a train walks the whole
//   line; 4 switches (ids 0 to 3 west to east: cargo west, cargo east, platform west, platform east), each diverging
//   south to its section's bypass, each stand on the north (station) side; switch 0 is a spring switch.
// - Walking distances (the player walking on the walk grid, in the sim): between the two switches of the inner throat,
//   from each switch to the end of the platform or dock beside it, and along each section, within the figures
//   promised in plans/rework-tech.md.
// - Every place the player uses can be walked to from the start, without crossing the track: each switch's stand, the
//   depot's use spots, the platform, the cargo dock, the freight shed's bays, the cargo yard, the tool spots, the
//   business doors, the town exits and the M2 town area.
// - Buildings keep the section 6 clearances from the track (flush decks at 0.9u x SC), keep clear of the switch stands,
//   and do not overlap; the station tracks' spans are beside the platform and the docks; the parked systems are off
//   (the ticket window refuses, the Overland never comes, Willow Ford's store is not in this world).
// - Old worlds still open: ?world=start is the real start, ?world=yard the test yard.
// - Screenshots at phone size, portrait and landscape, at the start zoom and zoomed out; draw calls (with 200 walkers,
//   and with two trains standing at the platform and the cargo track, as the busiest view will be).

const { openGame, screenshotPath } = require('./browser');

// The walking distances this layout promises (u, on the walk grid), plans/rework-tech.md "Switches and distances".
const PROMISE = {
  'switch 1 to switch 2 (the inner throat)': 5.5,
  'switch 2 to the platform\'s west end': 4,
  'switch 3 to the platform\'s east end': 4,
  'switch 1 to the freight shed dock\'s east end': 4,
  'switch 0 to the cargo dock\'s west end': 4,
  'switch 2 to switch 3 (along the platform)': 40,
  'switch 0 to switch 1 (along the cargo track)': 44,
};

module.exports = async function checkHubWorld() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=hub' });
    try {
      if (orient === 'portrait') {
        const r = await page.evaluate((PROMISE) => {
          const R = window.__railhead, Wd = R.world, S = R.state, T = S.track, H = Wd.HUBW, out = { bad: [], dist: {} }, P = m => out.bad.push(m), SC = R.CFG.SCALE;
          // A new game.
          if (T.world !== 'hub') P(`a new game is in the "${T.world}" world, not the hub world`);
          if (S.schemaVersion !== 17) P(`schema ${S.schemaVersion}, expected 17`);
          if (!S.rr || S.rr.on !== true) P('the railroad\'s store is not switched on');
          if (S.trains.length !== 5 || S.trains.some((t, i) => t.id !== i)) P(`trains: ${S.trains.map(t => t.id + ':' + (t.owner || 'ours')).join(', ')} (expected No. 1, the Overland, its cut and 2 railroad slots)`);
          const no1 = S.trains[0];
          if (!no1.away || !no1.parked) P('No. 1 is not parked away');
          if (!S.trains[1].away || S.trains[2].consist.length) P('the Overland is not away or its cut not empty');
          for (const id of R.rr.RR.SLOTS) { const t = S.trains[id]; if (!t || t.owner !== 'rr' || !t.away || t.consist.length) P(`railroad slot ${id} is not an empty, away train of owner rr`); }
          if (S.tt.services.length) P('the hub world has timetable services (No. 1\'s runs are parked)');
          if (!S.tut.done) P('the tutorial runs in the hub world (parked until its rewrite)');
          if (!Wd.worldParked(T, 'overland') || !Wd.worldParked(T, 'counter') || !Wd.worldParked(T, 'willow') || !Wd.worldParked(T, 'no1') || !Wd.worldParked(T, 'interchange')) P('a parked flag is off in the hub world');
          // Track.
          const errs = R.trackValidate(T);
          if (errs.length) P('track validator: ' + errs.join('; '));
          if (R.interchange.interchangeEdge(T) !== -1) P('the hub world has an interchange track');
          const B = H.BOUNDS;
          if (H.LINE.x0 > B.x0 - 40 || H.LINE.x1 < B.x1 + 40) P('the through line does not run 40u past both map edges');
          for (let x = H.LINE.x0; x <= H.LINE.x1; x += 1) if (!R.rr.hubLineAt(T, x)) { P(`no through line at x ${x}`); break; }
          const saved = T.switches.map(W => W.state);
          for (const W of T.switches) W.state = 'N';
          const w = R.trackWalk(T, R.rr.rrEntry(T, 'W'), 1000);
          out.lineRun = w.moved;
          if (!(w.moved > H.LINE.x1 - H.LINE.x0 - 40)) P(`with every switch straight a train from the west end runs ${w.moved.toFixed(1)}u, not the whole line`);
          const pe = R.edgeAt(T, T.edges[w.pos.e], w.pos.s);
          if (Math.abs(pe.z) > 1e-9 || pe.x < B.x1 + 40) P('the straight run does not end on the line past the east edge');
          T.switches.forEach((W, i) => { W.state = saved[i]; });
          if (T.switches.length !== 4) P(`${T.switches.length} switches, expected 4`);
          const SW = R.rr.HUB_SW, Hx = H.SW;
          for (const [k, id] of Object.entries(SW)) {
            const W = T.switches[id], N = T.nodes[W.node];
            if (!W || Math.abs(N.x - Hx[k]) > 1e-9 || N.z !== 0) { P(`switch ${id} (${k}) is not at x ${Hx[k]} on the line`); continue; }
            const E = T.edges[W.reverse], far = T.nodes[E.a === W.node ? E.b : E.a];
            if (!(far.z > 0)) P(`switch ${id}'s diverging leg does not turn south`);
            if (!(W.stand.z < 0 && W.stand.uz < 0)) P(`switch ${id}'s stand is not on the north side`);
          }
          if (!T.switches[SW.CW].spring || T.switches[SW.CW].lever !== 'N') P('switch 0 is not a spring switch lying for the cargo track');
          if (T.switches[SW.PW].state !== 'R') P('switch 2 does not start set against the first train (for the bypass)');
          out.sw = T.switches.map(W => ({ id: W.id, x: T.nodes[W.node].x, stand: [W.stand.ux, W.stand.uz] }));
          // Footprints, clearances, overlaps.
          const fps = R.buildings.footprints(), ids = fps.map(f => f.id);
          for (const id of ['platform', 'depot', 'freightshed', 'freightdock', 'cargodock', 'watertower', 'woodstage']) if (!ids.includes(id)) P(`no building ${id}`);
          if (ids.includes('wfstore') || ids.includes('wfplatform') || ids.includes('wfdepot')) P('Willow Ford\'s buildings are in the hub world');
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
          for (const id of ['platform', 'cargodock', 'freightdock']) {
            const pf = fps.find(f => f.id === id);
            if (pf && Math.abs(dist(pf, pf.x, 0) - 0.9 * SC) > 1e-6) P(`${id}'s track-side edge is not flush at ${0.9 * SC}u from the line`);
          }
          const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6;
          for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
            const a = fps[i], b = fps[j], pair = [a.id, b.id].sort().join('+');
            if (['depot+platform', 'freightdock+freightshed'].includes(pair)) continue;
            if (((a.kind === 'lamp' || a.prop) && b.flush) || ((b.kind === 'lamp' || b.prop) && a.flush)) continue;
            if (overlap(a, b)) P(`${a.id} overlaps ${b.id}`);
          }
          // The station tracks' spans lie beside the platform and the docks.
          const st = Wd.stationsOf(T)[0];
          if (!st || st.id !== 'hub' || Wd.stationsOf(T).length !== 1) P('the hub world should have exactly one station, the hub');
          else {
            const pf = fps.find(f => f.id === 'platform'), k = st.tracks.platform;
            if (Math.abs(k.x0 - (pf.x - pf.w / 2)) > 1e-6 || Math.abs(k.x1 - (pf.x + pf.w / 2)) > 1e-6) P('the platform track\'s span is not the platform\'s length');
            const cd = fps.find(f => f.id === 'cargodock'), fd = fps.find(f => f.id === 'freightdock'), c = st.tracks.cargo;
            if (Math.abs(c.x0 - (cd.x - cd.w / 2)) > 1e-6 || Math.abs(c.x1 - (fd.x + fd.w / 2)) > 0.1) P('the cargo track\'s span is not the cargo dock with the freight shed\'s dock');
            for (const [nm, sp] of Object.entries(st.tracks)) for (const x of [sp.x0, sp.x1]) { const n = R.trackNearest(T, x, sp.z0); if (n.dist > 0.15) P(`the ${nm} span's end (${x}, ${sp.z0}) is not on the track`); }
          }
          // Walking: the player walks from a to b in the sim (a copy of the state); the distance walked, in u.
          const Wk = Wd.walk, G = Wd.walkGrid(T);
          const cell = (x, z) => Math.floor((z - Wk.Z0) / Wk.CELL) * Wk.N + Math.floor((x - Wk.X0) / Wk.CELL);
          const walk = (a, b) => {
            const s = JSON.parse(JSON.stringify(S)), Pl = s.player;
            Pl.x = a[0]; Pl.z = a[1]; Pl.mode = 'idle';
            R.simTick(s, [{ t: 'walkTo', x: Math.round(b[0] * 100), z: Math.round(b[1] * 100) }]);
            let d = 0, px = Pl.x, pz = Pl.z;
            for (let i = 0; i < 2000 && s.player.mode !== 'idle'; i++) { R.simTick(s, []); d += Math.hypot(s.player.x - px, s.player.z - pz); px = s.player.x; pz = s.player.z; }
            const miss = Math.hypot(s.player.x - b[0], s.player.z - b[1]);
            return { d: d + Math.hypot(Pl.x - a[0], Pl.z - a[1]) * 0, miss };
          };
          const spot = id => [T.switches[id].stand.ux, T.switches[id].stand.uz];
          const pts = {
            platW: [H.PLATFORM.x0 + 0.6, -3.0], platE: [H.PLATFORM.x1 - 0.6, -3.0],
            dockW: [H.CARGO.x0 + 0.6, -3.0], shedE: [H.CARGO.x1 - 0.6, -2.0],
          };
          const legs = {
            'switch 1 to switch 2 (the inner throat)': [spot(SW.CE), spot(SW.PW)],
            'switch 2 to the platform\'s west end': [spot(SW.PW), pts.platW],
            'switch 3 to the platform\'s east end': [spot(SW.PE), pts.platE],
            'switch 1 to the freight shed dock\'s east end': [spot(SW.CE), pts.shedE],
            'switch 0 to the cargo dock\'s west end': [spot(SW.CW), pts.dockW],
            'switch 2 to switch 3 (along the platform)': [spot(SW.PW), spot(SW.PE)],
            'switch 0 to switch 1 (along the cargo track)': [spot(SW.CW), spot(SW.CE)],
          };
          for (const [k, [a, b]] of Object.entries(legs)) {
            const r = walk(a, b);
            out.dist[k] = +r.d.toFixed(2);
            if (r.miss > 0.3) P(`${k}: the walk ended ${r.miss.toFixed(2)}u short`);
            if (!(r.d <= PROMISE[k])) P(`${k}: ${r.d.toFixed(2)}u walked, promised at most ${PROMISE[k]}u`);
          }
          // Reachability: one walk area from the player's start, with every place in it.
          const area = (x, z) => { const c = cell(x, z); return G.cost[c] > 0 ? G.comp[c] : -1; };
          const home = area(S.player.x, S.player.z);
          if (home < 0) P('the player starts on a blocked cell');
          const places = [];
          for (const W of T.switches) places.push([`switch ${W.id}'s stand`, W.stand.ux, W.stand.uz]);
          for (const sp of Wd.buildingSpots()) places.push([`${sp.building} ${sp.kind} spot`, sp.x, sp.z]);
          // A bay is worked from the dock in front of it (within reach): the nearest open cell within 1u.
          const nearOpen = (x, z) => { let best = null; for (let dz = -1; dz <= 1.001; dz += 0.25) for (let dx = -1; dx <= 1.001; dx += 0.25) { const c = cell(x + dx, z + dz); if (G.cost[c] > 0 && (!best || Math.hypot(dx, dz) < best[2])) best = [x + dx, z + dz, Math.hypot(dx, dz)]; } return best; };
          for (const [b, v] of Object.entries(R.cargo.BLD_BAYS)) v.bays.forEach((q, i) => { const o = nearOpen(q.x, q.z); if (!o) P(`${b} bay ${i}: no open cell within 1u`); else places.push([`${b} bay ${i} (from the dock)`, o[0], o[1]]); });
          for (const t of R.carry.TOOL_PARK) places.push([`${t.k} spot`, t.x / 100, t.z / 100]);
          for (const L of R.town.townPlaced().filter(L => L.biz !== null)) { const d = R.town.townDoor(L.biz); places.push([`${L.id} door`, d.x, d.z]); }
          H.TOWN_EXITS.forEach(([x, z], i) => places.push([`town exit ${i}`, x, z]));
          places.push(['the cargo yard', (H.YARD.x0 + H.YARD.x1) / 2, (H.YARD.z0 + H.YARD.z1) / 2], ['the cargo dock', -36, -3.0], ['the platform', 12.8, -6.0],
            ['the M2 town area', (H.TOWN.x0 + H.TOWN.x1) / 2, (H.TOWN.z0 + H.TOWN.z1) / 2]);
          for (const [nm, x, z] of places) { const a = area(x, z); if (a !== home) P(`${nm} (${x.toFixed(1)}, ${z.toFixed(1)}) ${a < 0 ? 'is on a blocked cell' : 'cannot be reached from the start'}`); }
          out.places = places.length;
          for (const L of R.town.townPlaced()) if (L.townId !== 0) P(`a town lot of town ${L.townId} (${L.id}) is in the hub world`);
          for (const t of R.carry.TOOL_PARK) for (const f of fps) { const d = dist(f, t.x / 100, t.z / 100); if (d < 0.3 + (t.k === 'cart' ? 1.05 : 0.4)) P(`the ${t.k} parking spot is ${d.toFixed(2)}u from ${f.id}`); }
          // The parked systems stay off: the ticket window refuses; a day passes with no Overland, no travellers, no
          // timetable run, no Willow Ford offer, and the railroad's store is unchanged by the stub.
          const s = JSON.parse(JSON.stringify(S)), evs = [];
          evs.push(...R.simTick(s, [{ t: 'staffWindow', st: 'hub' }]));
          if (!evs.some(e => e.t === 'deskLeft' && /closed/.test(e.why || ''))) P('staffWindow is not refused in the hub world');
          for (let i = 0; i < 24 * 450; i++) evs.push(...R.simTick(s, []));
          if (evs.some(e => /^overland/.test(e.t))) P('the Overland came in the hub world');
          if (s.pax.list.length) P(`${s.pax.list.length} M1 travellers came in the hub world`);
          if (s.tt.runs.length) P('a timetable run started in the hub world');
          if (s.econ.contracts.filter(k => k.counterparty === 1).length > S.econ.contracts.filter(k => k.counterparty === 1).length) P('Willow Ford\'s store offered a contract in the hub world');
          if (s.trains.some(t => !t.away && t.consist.length)) P('a train came onto the map before the railroad\'s trains are built');
          out.hash = R.stateHash(s);
          return out;
        }, PROMISE);
        problems.push(...r.bad);
        console.log(`  switches at x ${r.sw.map(w => w.x).join(', ')}; walking distances (u): ${Object.entries(r.dist).map(([k, v]) => `${k} ${v}`).join('; ')}`);
        console.log(`  the line runs ${r.lineRun.toFixed(0)}u with every switch straight; ${r.places} places reachable checked; closest building to track ${r.minClear.toFixed(2)}u past its clearance; a day of play hash ${r.hash}`);
        // Old worlds still open as before.
        const worlds = await page.evaluate(() => { const R = window.__railhead; return [R.newState(1866, 'start').track.world, R.newState(1866, 'yard').track.world, R.newState(1866).track.world]; });
        if (worlds.join() !== 'start,yard,hub') problems.push(`newState worlds: ${worlds.join()} (expected start, yard, hub)`);
      }
      // Screenshots: the start zoom (1.5), and zoomed out over the station (0.6 and 0.4), noon.
      const shot = async (name, zoom, fx, fz, crowd) => {
        await page.evaluate(([zoom, fx, fz, crowd]) => {
          const R = window.__railhead; R.camera.zoom = zoom; R.camera.ox = fx - R.state.player.x; R.camera.oz = fz - R.state.player.z;
          if (crowd !== undefined && R.setCrowd) R.setCrowd(crowd);
        }, [zoom, fx, fz, crowd]);
        await page.waitForTimeout(500);
        const dc = await page.evaluate(() => window.__railhead.drawCalls);
        await page.screenshot({ path: screenshotPath(`hubworld-${name}-${orient}`) });
        return dc;
      };
      await page.evaluate(() => { const R = window.__railhead; R.state.time = 7 * 3600; R.step(1); });
      const dc = {};
      dc.start = await shot('start', 1.5, 11.2, -3.3);
      dc.throat = await shot('throat', 1.5, -9, -3);
      dc.out06 = await shot('out06', 0.6, -10, -6);
      dc.out04 = await shot('out04', 0.4, -10, -10);
      dc.crowd = await shot('crowd200', 0.4, -10, -10, 200);
      // As the busiest view will be: two trains standing at the platform (an engine and 4 cars) and the cargo track (an
      // engine and 5 cars) with 200 walkers, zoomed out. Drawn only (the slots are filled in the page's state copy and
      // put back afterwards), with the models that exist now (TR makes the small cars).
      dc.trains = await page.evaluate(async () => {
        const R = window.__railhead, S = R.state, T = S.track, keep = JSON.stringify(S.trains);
        const fill = (id, x, n, car) => {
          const tr = S.trains[id], p = R.rr.hubLineAt(T, x);
          Object.assign(tr, { away: false, front: { e: p.e, s: p.s, d: 1 }, consist: [{ id: 1000 + id * 10, k: 'loco', len: 4.4 * 1.6, mass: 2.5, power: 8 }]
            .concat(Array.from({ length: n }, (_, i) => ({ id: 1001 + id * 10 + i, k: car, len: 2.2 * 1.6, mass: 0.5 }))) });
        };
        fill(3, 27, 4, 'combine'); fill(4, -16, 5, 'boxcar');
        R.importSave(JSON.stringify({ state: S }));
        await new Promise(r => setTimeout(r, 600));
        const d = R.drawCalls;
        return d;
      });
      await page.screenshot({ path: screenshotPath(`hubworld-trains-${orient}`) });
      await page.evaluate(() => { const R = window.__railhead, S = R.state; R.setCrowd && R.setCrowd(0); });
      console.log(`  ${orient}: draw calls start ${dc.start}, inner throat ${dc.throat}, zoomed out 0.6 ${dc.out06}, 0.4 ${dc.out04}, with 200 walkers ${dc.crowd}, with two standing trains and 200 walkers ${dc.trains}`);
      for (const [k, v] of Object.entries(dc)) if (!(v < 100)) problems.push(`${orient}: ${v} draw calls (${k}), over the phone budget of 100`);
      if (errors.length) problems.push(`${orient}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
