// Check: the prototype (D25, its foundation; plans/proto-tech.md).
// - A new game (the page's default since D25) is in the prototype world ('proto'), schema 18: the railroad's store on
//   with 3 empty train slots, the day store on (day 0, morning, 06:00), No. 1 and the Overland parked away, every
//   parked flag on (money, work board, contracts, ordering, building, telegrams, wood and water, the tutorial, the
//   town's businesses, the D22 cards, the D24 hub's screens and the hub world's own), every switch straight.
// - The track passes the validator; track 2 runs straight along z = 0 past both map edges; 4 switches (W3, W1, E1, E3,
//   ids 0 to 3) on track 2, W1 and E1 turning north to track 1 (z -6.03), W3 and E3 south to track 3 (z 10.48; spaced
//   out on 2026-11-10); track 1 and 3 straight from x -20 to 20; the walkway's two pads cross tracks 1 and 2 only.
// - The two footbridges (T, 2026-11-10): each deck over tracks 1 and 2 with its underside at least 4.8u over the rail
//   top, its stair flights on the platforms (inside the decks, clear of every building), bridge cells on the walk grid
//   with heights from the stairs to the deck; walkers cross on them (walked distances recorded), the handcart cannot.
// - Buildings keep the section 6 clearances, the decks are flush (1.44u) with their tracks, nothing overlaps, no
//   building is near a switch stand; the shops face the main street, which runs away from the station at right angles
//   to the tracks (the lead's change, 2026-11-10).
// - Walking distances (the player walking on the walk grid) within the plan's promises; every place the player uses
//   is reachable from the start, and platform 2 (with the storage bays and the track 3 stands) only by the walkway or
//   the footbridges; the walk from the nearest platform to every switch stand is under 20u.
// - Trains: the first passenger train waits at the west switch set against it, then (switch thrown) stands at
//   platform 1 short of the walkway and clear of every switch; the first freight train stands at track 3 beside
//   platform 2; both leave when sent off with the switches set; a through run is planned (T builds it).
// - The parked systems stay off over a day (no telegrams, no cash change, no town use, no tutorial, no Overland, no
//   timetable); the day goes morning > day > summary and the next morning starts at 06:00.
// - The older worlds still open in 3D (hub, start, yard), with no pixel canvas.
// - The pixel renderer draws the prototype: its canvas over the WebGL one, whole-number scale and whole zoom steps, a
//   tap goes from screen to world and back, a tap on a train picks it, no console errors; screenshots portrait and
//   landscape (start, zoomed out, two trains standing).

const { openGame, screenshotPath } = require('./browser');

// The walking distances the layout promises (u, on the walk grid), plans/proto-tech.md section 1.
// D27 foundation (plans/d27-tech.md 1.3, 1.4, 8.2): the D27 layout's: the lever frames by platform 1's ends (all four
// switches' levers), the cart crossing at x 37 (platform 2 is the raised cargo platform, reached from the ground by its
// ramps), the footbridges' flights out to x +-24.5, the main street behind the station; the over-the-bridge walks are
// measured with the crossing shut (crossings removed).
const PROMISE = {
  'platform 1 east end to the east lever frame (E1)': 9,
  'platform 1 west end to the west lever frame (W1)': 9,
  'platform 1 east end to platform 2 east end (the cart crossing and the east ramp)': 42,
  'platform 2 east end to the east lever frame (E3, over the cart crossing)': 43,
  'platform 2 west end to the west lever frame (W3, over the west footbridge)': 46,
  'the schedule board to the cart crossing': 26,
  'the station door side to the general store\'s door': 34,
  'platform 1 to platform 2 over the west footbridge': 40,
  'platform 1 to platform 2 over the east footbridge': 40,
  'platform 1 middle to switch W3 (the west lever frame)': 36,
  'platform 1 middle to switch E3 (the east lever frame)': 36,
};

module.exports = async function checkProtoWorld() {
  const problems = [];
  // The page's default world (no world named): the prototype.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=' });
    try {
      const w = await page.evaluate(() => ({ page: window.__railhead.world.PAGE_WORLD, world: window.__railhead.state.track.world, pix: window.__railhead.pix.pixOn() }));
      if (w.page !== 'proto' || w.world !== 'proto' || !w.pix) problems.push(`the default page is ${JSON.stringify(w)} (expected the prototype, drawn by the pixel renderer)`);
      if (errors.length) problems.push('default page: console errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&doorline=1' });   // D27 board on (P): this check plays the D25 line at the door
    try {
      if (orient === 'portrait') {
        const r = await page.evaluate((PROMISE) => {
          const R = window.__railhead, Wd = R.world, Pr = R.proto, S = R.state, T = S.track, P = Pr.PROTO, out = { bad: [], dist: {} }, B = m => out.bad.push(m), SC = R.CFG.SCALE;
          // A new game.
          if (T.world !== 'proto') B(`a new game is in the "${T.world}" world`);
          if (S.schemaVersion !== R.CFG.SCHEMA_VERSION || S.schemaVersion < 18) B(`schema ${S.schemaVersion}, expected ${R.CFG.SCHEMA_VERSION}`);
          if (!S.rr || !S.rr.on) B('the railroad\'s store is off');
          if (!S.pd || !S.pd.on || S.pd.day !== 0 || S.pd.ph !== 'morning') B(`the day store: ${JSON.stringify(S.pd && { on: S.pd.on, day: S.pd.day, ph: S.pd.ph })}`);
          if ((S.time + R.CFG.DAY_START_S) % 86400 !== 6 * 3600) B(`a new game starts at ${(S.time + R.CFG.DAY_START_S) / 3600}h, not 06:00`);
          if (S.trains.length !== 6 || S.trains.some((t, i) => t.id !== i)) B(`trains: ${S.trains.map(t => t.id + ':' + (t.owner || 'ours')).join(', ')}`);
          if (!S.trains[0].away || !S.trains[0].parked || !S.trains[1].away) B('No. 1 or the Overland is not parked away');
          for (const id of Pr.RR_WORLDS.proto.SLOTS) { const t = S.trains[id]; if (!t || t.owner !== 'rr' || !t.away || t.consist.length) B(`railroad slot ${id} is not empty and away`); }
          if (S.tt.services.length || !S.tut.done) B('timetable services or the tutorial in the prototype');
          for (const k of ['overland', 'interchange', 'willow', 'no1', 'counter', 'money', 'workboard', 'contracts', 'ordering', 'building', 'telegrams', 'fuel', 'tutorial', 'town', 'cards', 'hubui'])
            if (!Wd.worldParked(T, k)) B(`${k} is not parked in the prototype`);
          if (T.switches.some(W => W.state !== 'N' || W.spring)) B('a switch does not start straight (or is a spring switch)');
          // Track.
          const errs = R.trackValidate(T);
          if (errs.length) B('track validator: ' + errs.join('; '));
          const BD = P.BOUNDS;
          for (let x = P.LINE.x0; x <= P.LINE.x1; x += 1) if (!R.rr.hubLineAt(T, x)) { B(`no track 2 at x ${x}`); break; }
          if (P.LINE.x0 > BD.x0 - 40 || P.LINE.x1 < BD.x1 + 40) B('track 2 does not run 40u past both map edges');
          const saved = T.switches.map(W => W.state);
          T.switches.forEach(W => { W.state = 'N'; });
          const wk = R.trackWalk(T, R.rr.rrEntry(T, 'W'), 1000);
          if (!(wk.moved > P.LINE.x1 - (P.LINE.x0 + 2 + (Pr.RR_WORLDS.proto.ROOM || 32)) - 6)) B(`with every switch straight a train runs ${wk.moved.toFixed(1)}u, not the whole line`);
          T.switches.forEach((W, i) => { W.state = saved[i]; });
          if (T.switches.length !== 4) B(`${T.switches.length} switches, expected 4`);
          for (const [k, id] of Object.entries(Pr.PROTO_SW)) {
            const W = T.switches[id], N = T.nodes[W.node];
            if (Math.abs(N.x - P.SW[k]) > 1e-9 || N.z !== 0) B(`switch ${id} (${k}) is not at x ${P.SW[k]} on track 2`);
            const E = T.edges[W.reverse], far = T.nodes[E.a === W.node ? E.b : E.a];
            if (k[1] === '1' ? !(far.z < 0) : !(far.z > 0)) B(`switch ${id} (${k})'s leg turns the wrong way`);
          }
          for (const [nm, z] of [['track 1', -P.D1], ['track 3', P.D3]]) for (const x of [-20, -10, 0, 10, 20]) if (!Pr.protoTrackAt(T, z, x)) B(`${nm} is not straight at x ${x}`);
          out.d = { D1: P.D1, D3: P.D3, sw: P.SW };
          if (T.crossings.length !== 2 || T.crossings.some(c => Math.abs(c.x - P.XING_CART.x) > 0.01 || !(c.z < 0.01 && c.z > -P.D1 - 0.01))) B(`the cart crossing's pads: ${JSON.stringify(T.crossings)}`);
          // Footprints.
          const fps = R.world.buildingFootprints(), ids = fps.map(f => f.id);
          for (const id of ['platform1', 'platform2', 'station', 'storage', 'shop_store', 'shop_smithy', 'shop_saloon']) if (!ids.includes(id)) B(`no building ${id}`);
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
                if (d < need - 1e-6) { B(`${f.id} is ${d.toFixed(3)}u from edge ${E.id} (needs ${need}u)`); break; }
              }
            }
            if (f.kind !== 'leverframe') for (const W of T.switches) for (const [x, z] of [[W.stand.x, W.stand.z], [W.stand.ux, W.stand.uz]]) if (dist(f, x, z) < 0.5) B(`${f.id} is within 0.5u of switch ${W.id}'s stand`);   // (D27: the levers stand in their frame)
          }
          const p1 = fps.find(f => f.id === 'platform1'), p2 = fps.find(f => f.id === 'platform2');
          if (Math.abs((p1.z + p1.d / 2) - (-P.D1 - P.EDGE)) > 1e-6) B('platform 1 is not flush with track 1');   // D27: decks P.EDGE (2.3u) from their tracks
          if (Math.abs((p2.z - p2.d / 2) - P.EDGE) > 1e-6 || Math.abs((p2.z + p2.d / 2) - (P.D3 - P.EDGE)) > 1e-6) B('platform 2 is not flush with tracks 2 and 3');
          const overlap = (a, b) => Math.abs(a.x - b.x) < (Math.abs(Math.cos(a.yaw)) * a.w + Math.abs(Math.sin(a.yaw)) * a.d + Math.abs(Math.cos(b.yaw)) * b.w + Math.abs(Math.sin(b.yaw)) * b.d) / 2 - 1e-6
            && Math.abs(a.z - b.z) < (Math.abs(Math.sin(a.yaw)) * a.w + Math.abs(Math.cos(a.yaw)) * a.d + Math.abs(Math.sin(b.yaw)) * b.w + Math.abs(Math.cos(b.yaw)) * b.d) / 2 - 1e-6;
          for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
            const a = fps[i], b = fps[j];
            if (((a.kind === 'lamp' || a.kind === 'storage') && b.flush) || ((b.kind === 'lamp' || b.kind === 'storage') && a.flush)) continue;   // standing on a deck
            if (overlap(a, b)) B(`${a.id} overlaps ${b.id}`);
          }
          // The main street runs north from behind the station (at right angles to the tracks); each shop's front faces it.
          const ST = P.STREET;
          if (!(ST.z1 - ST.z0 > 3 * (ST.x1 - ST.x0))) B('the main street does not run away from the station (north)');
          for (const sh of Pr.PROTO_SHOPS) {
            if (!(sh.door.x > ST.x0 - (ST.walk || 1.2) && sh.door.x < ST.x1 + (ST.walk || 1.2) && sh.door.z > ST.z0 && sh.door.z < ST.z1)) B(`${sh.name}'s door (${sh.door.x.toFixed(1)}, ${sh.door.z.toFixed(1)}) is not on the main street`);   // (D27: on its boardwalk)
            const f = fps.find(q => q.id === sh.bld), fx = Math.sin(f.yaw), toSt = -Math.sign(f.x);
            if (Math.abs(fx) < 0.99 || Math.sign(fx) !== toSt) B(`${sh.name} does not face the main street`);
          }
          // Walking: the player walks from a to b in the sim (on a copy); the distance walked, in u.
          const Wk = Wd.walk, G = Wd.walkGrid(T);
          const cell = (x, z) => Math.floor((z - Wk.Z0) / Wk.CELL) * Wk.N + Math.floor((x - Wk.X0) / Wk.CELL);
          const walk = (a, b, shut) => {
            const s = JSON.parse(JSON.stringify(S)), Pl = s.player;
            if (shut) s.track.crossings = [];   // the walkway shut: over a footbridge
            Pl.x = a[0]; Pl.z = a[1]; Pl.mode = 'idle';
            R.simTick(s, [{ t: 'walkTo', x: Math.round(b[0] * 100), z: Math.round(b[1] * 100) }]);
            let d = 0, px = Pl.x, pz = Pl.z;
            for (let i = 0; i < 3000 && s.player.mode !== 'idle'; i++) { R.simTick(s, []); d += Math.hypot(s.player.x - px, s.player.z - pz); px = s.player.x; pz = s.player.z; }
            return { d, miss: Math.hypot(s.player.x - b[0], s.player.z - b[1]) };
          };
          const use = id => [T.switches[id].stand.ux, T.switches[id].stand.uz], SW = Pr.PROTO_SW, P1 = P.P1, P2 = P.P2;
          const p1z = P1.z1 - 0.5, p2z = P2.z0 + 2.0;   // clear of the footbridges' stair bands
          const FX = P.FB.OUT + 1;   // D27: just past the footbridges' flights
          const legs = {
            'platform 1 east end to the east lever frame (E1)': [[P1.x1 - 0.6, p1z], use(SW.E1)],
            'platform 1 west end to the west lever frame (W1)': [[P1.x0 + 0.6, p1z], use(SW.W1)],
            'platform 1 east end to platform 2 east end (the cart crossing and the east ramp)': [[P1.x1 - 0.6, p1z], [P2.x1 - 0.6, p2z]],
            'platform 2 east end to the east lever frame (E3, over the cart crossing)': [[P2.x1 - 0.6, p2z], use(SW.E3)],
            'platform 2 west end to the west lever frame (W3, over the west footbridge)': [[P2.x0 + 0.6, p2z], use(SW.W3)],
            'the schedule board to the cart crossing': [[S.player.x, S.player.z], [P.XING_CART.x, P.XING_CART.z0 - 0.5]],
            'the station door side to the general store\'s door': [[0, P1.z0 + 0.6], [Pr.PROTO_SHOPS[0].door.x, Pr.PROTO_SHOPS[0].door.z]],
            'platform 1 to platform 2 over the west footbridge': [[-FX, p1z - 3], [-FX, p2z + 2]],
            'platform 1 to platform 2 over the east footbridge': [[FX, p1z - 3], [FX, p2z + 2]],
            'platform 1 middle to switch W3 (the west lever frame)': [[0, p1z], use(SW.W3)],
            'platform 1 middle to switch E3 (the east lever frame)': [[0, p1z], use(SW.E3)],
          };
          for (const [k, [a, b]] of Object.entries(legs)) {
            const w = walk(a, b, /footbridge/.test(k));
            out.dist[k] = +w.d.toFixed(2);
            if (w.miss > 0.3) B(`${k}: the walk ended ${w.miss.toFixed(2)}u short`);
            if (!(w.d <= PROMISE[k])) B(`${k}: ${w.d.toFixed(2)}u walked, promised at most ${PROMISE[k]}u`);
          }
          // The footbridges.
          for (const b of Pr.PROTO_BRIDGES) {
            if (b.under - 0.34 < 4.8) B(`footbridge ${b.id}: its deck is ${(b.under - 0.34).toFixed(2)}u over the rail top`);
            const [deck, s1, s2] = b.parts;
            if (!(deck.z0 < -P.D1 - 1.2 && deck.z1 > 1.2)) B(`footbridge ${b.id}'s deck does not span tracks 1 and 2`);
            for (const [st, pl] of [[s1, P1], [s2, P2]]) {
              if (st.x0 < pl.x0 || st.x1 > pl.x1 || st.z0 < pl.z0 || st.z1 > pl.z1) B(`footbridge ${b.id}: a stair flight is off its platform`);
              for (const f of fps) if (!f.flush && f.kind !== 'p1deck' && dist(f, Math.max(st.x0, Math.min(st.x1, f.x)), Math.max(st.z0, Math.min(st.z1, f.z))) < 0.3) B(`footbridge ${b.id}'s stair is within 0.3u of ${f.id}`);
            }
            for (const W of T.switches) if (Math.hypot(W.stand.x - b.x, W.stand.z) < 8) B(`footbridge ${b.id} is near switch ${W.id}'s stand`);
            const y = (x, z) => Wd.walkGrid(T) && Pr.walkBridgeY(T, x, z);
            if (Math.abs(y(b.x, -3) - b.top) > 1e-6 || Math.abs(y(s1.xFoot + (s1.xTop - s1.xFoot) * 0.1, (s1.z0 + s1.z1) / 2) - (b.top * 0.1 + 0.375 * 0.9)) > 0.05 || y(b.x, P1.z0 + 0.5) !== null) B(`footbridge ${b.id}: heights wrong`);
          }
          // Reachability from the start; platform 2's side only by the walkway or the footbridges.
          const places = [];
          for (const W of T.switches) places.push([`switch ${W.id}'s stand`, W.stand.ux, W.stand.uz, false]);   // D27: every lever by platform 1
          const nearOpen = (G, x, z) => { let best = null; for (let dz = -1; dz <= 1.001; dz += 0.25) for (let dx = -1; dx <= 1.001; dx += 0.25) { const c = cell(x + dx, z + dz); if (G.cost[c] > 0 && (!best || Math.hypot(dx, dz) < best[2])) best = [x + dx, z + dz, Math.hypot(dx, dz)]; } return best; };
          for (const [b, v] of Object.entries(R.cargo.BLD_BAYS)) v.bays.forEach((q, i) => { const o = nearOpen(G, q.x, q.z); if (!o) B(`${b} bay ${i}: no open cell within 1u`); else places.push([`${b} bay ${i}`, o[0], o[1], true]); });
          for (const t of R.carry.TOOL_PARK) places.push([`${t.k} spot`, t.x / 100, t.z / 100, true]);
          for (const sh of Pr.PROTO_SHOPS) places.push([`${sh.name}'s door`, sh.door.x, sh.door.z, false]);
          P.TOWN_EXITS.forEach(([x, z], i) => places.push([`town exit ${i}`, x, z, false]));
          places.push(['platform 1', 0, p1z, false], ['platform 2', 10, p2z, true], ['the schedule board', P.SCHEDBOARD.x, P.SCHEDBOARD.z + 0.9, false]);
          const area = (G, x, z) => { const c = cell(x, z); return G.cost[c] > 0 ? G.comp[c] : -1; };
          const home = area(G, S.player.x, S.player.z);
          for (const [nm, x, z] of places) { const a = area(G, x, z); if (a !== home) B(`${nm} (${x.toFixed(1)}, ${z.toFixed(1)}) ${a < 0 ? 'is on a blocked cell' : 'cannot be reached from the start'}`); }
          const T2 = JSON.parse(JSON.stringify(T)); T2.crossings = [];
          const G2 = Wd.walkGridBuild(T2), home2 = area(G2, S.player.x, S.player.z);
          for (const [nm, x, z] of places) { const a = area(G2, x, z); if (a !== home2) B(`without the walkway, ${nm} cannot be reached (over the footbridges)`); }
          // Without the walkway and the footbridges (their cells shut), the island is cut off: no other way across.
          const N = Wk.N, NN = G2.cost.length, open = c => G2.cost[c] > 0 && !G2.br.id[c], seen = new Uint8Array(NN), q = [cell(S.player.x, S.player.z)];
          seen[q[0]] = 1;
          while (q.length) { const c = q.pop(), ci = c % N; for (const n of [ci < N - 1 ? c + 1 : -1, ci > 0 ? c - 1 : -1, c + N < NN ? c + N : -1, c - N]) if (n >= 0 && !seen[n] && open(n)) { seen[n] = 1; q.push(n); } }
          for (const [nm, x, z, island] of places) { const c = cell(x, z); if (island ? seen[c] : !seen[c]) B(`without the walkway and the footbridges, ${nm} ${island ? 'can still be reached: the track is crossed elsewhere' : 'cannot be reached'}`); }
          Wd.walkGrid(T);   // the grid in use again
          out.places = places.length;
          for (const t of R.carry.TOOL_PARK) for (const f of fps) if (!f.flush && dist(f, t.x / 100, t.z / 100) < 0.3 + (t.k === 'cart' ? 1.05 : t.k === 'cart27' ? 1.8 : 0.4)) B(`the ${t.k} parking spot is too close to ${f.id}`);
          // Trains: the first passenger train and the first freight train, with the switches set by hand.
          const s = JSON.parse(JSON.stringify(S)), evs = [], run = (n, cmds) => { for (let i = 0; i < n; i++) evs.push(...R.simTick(s, i === 0 ? cmds || [] : [])); };
          const runOf = svc => s.rr.runs.find(q => q.svc === svc && q.day === 0), standing = svc => { const q = runOf(svc); return q && q.ph === 'stand'; };
          if (s.rr.runs.length) B('runs planned before the first tick');
          run(1);
          if (s.rr.runs.length !== Pr.PROTO_SCHEDULE.length) B(`${s.rr.runs.length} runs planned, expected ${Pr.PROTO_SCHEDULE.length}`);
          if (!s.rr.runs.some(q => q.through)) B('no through run planned');
          for (let i = 0; i < 450 && !evs.some(e => e.t === 'trainSwitchWait'); i++) run(1);
          const wait = evs.find(e => e.t === 'trainSwitchWait');
          if (!wait || wait.sw !== SW.W1) B(`p1 did not wait at switch W1 set against it (${JSON.stringify(wait)})`);
          const throwSw = (id, st) => { s.track.switches[id].state = st; };
          throwSw(SW.W1, 'R');
          for (let i = 0; i < 900 && !standing('p1'); i++) run(1);
          if (!standing('p1')) B('p1 did not come to stand at platform 1');
          else {
            const tr = s.trains[runOf('p1').slot], ps = R.trainPoses(s.track, tr), xs = ps.map(p => [p.x - p.len / 2, p.x + p.len / 2]).flat();
            const x0 = Math.min(...xs), x1 = Math.max(...xs);
            out.p1 = [+x0.toFixed(2), +x1.toFixed(2)];
            // (D27: its coaches alongside platform 1; the engine may stand past its end, short of the cart crossing)
            if (ps.some(p => Math.abs(p.z + P.D1) > 0.01) || ps.slice(1).some(p => p.x - p.len / 2 < P1.x0 - 0.01 || p.x + p.len / 2 > P1.x1 + 0.01)) B(`p1 does not stand along platform 1 (x ${x0.toFixed(1)} to ${x1.toFixed(1)})`);
            if (x1 > P.XING_CART.x - 3.7 / 2) B(`p1 stands on the cart crossing (its front at x ${x1.toFixed(2)})`);
            const occ = R.occupiedSwitches(s);
            if (Object.values(occ).includes(tr.id)) B('p1 stands on a switch');
            throwSw(SW.W1, 'N'); throwSw(SW.E1, 'R');
            // P's travellers stand in line at the coach doors: punch every ticket first (one command, one ticket; the
            // wave-off is refused while anyone is in line: integrator, 2026-11-10).
            const Pp = R.pp;
            for (let k = 0; k < 40; k++) {
              const c = tr.consist.slice(1).map(q => Pp.ppCarStatus(s, q.id)).find(q => q && (q.line || q.off));
              if (!c) break;
              if (!c.line) { run(5); continue; }   // riders still stepping off that coach
              const from = evs.length;
              run(1, [{ t: 'punch', tr: tr.id, car: c.stock }]);
              for (let i = 0; i < 400 && !evs.slice(from).some(e => e.t === 'ppPunched' || e.t === 'ppRefused' || e.t === 'ppStopped'); i++) run(1);
            }
            for (let i = 0; i < 120 && !evs.some(e => e.t === 'rrReady' && e.run === runOf('p1').id); i++) run(1);
            if (!evs.some(e => e.t === 'rrReady' && e.run === runOf('p1').id)) B('p1 never became ready after every ticket was punched');
            const ws = R.rr.rrWaveSpot(s, tr.id);   // beside the engine, clear of the east footbridge's stair
            s.player.x = ws.x; s.player.z = ws.z; s.player.mode = 'idle';
            run(1, [{ t: 'rrWaveOff', tr: tr.id }]);
            if (!evs.some(e => e.t === 'rrWavedOff')) B(`p1 was not waved off: ${JSON.stringify(evs.filter(e => e.t === 'rrRefused').slice(-1))}`);
            for (let i = 0; i < 900 && runOf('p1').ph !== 'gone'; i++) run(1);
            if (runOf('p1').ph !== 'gone') B(`p1 did not leave (${runOf('p1').ph}, ${tr.status})`);
            throwSw(SW.E1, 'N');
          }
          // f1 comes in from the east to track 3 (E3 thrown), then leaves west (W3 thrown).
          throwSw(SW.E3, 'R');
          const xr = s.rr.runs.find(q => q.svc === 'x1'); if (xr) xr.ph = 'gone';   // the through train is T's: out of the way here
          for (let i = 0; i < 4000 && !standing('f1'); i++) run(1);
          if (!standing('f1')) B(`f1 did not come to stand at track 3 (${runOf('f1').ph})`);
          else {
            const tr = s.trains[runOf('f1').slot], ps = R.trainPoses(s.track, tr), xs = ps.map(p => [p.x - p.len / 2, p.x + p.len / 2]).flat();
            out.f1 = [+Math.min(...xs).toFixed(2), +Math.max(...xs).toFixed(2)];
            // (D27: a 58u freight train is longer than the 52u cargo platform: it stands on track 3's straight, alongside the whole platform)
            if (ps.some(p => Math.abs(p.z - P.D3) > 0.01) || !Pr.protoTrackAt(T, P.D3, Math.min(...xs)) || !Pr.protoTrackAt(T, P.D3, Math.max(...xs)) || !(Math.min(...xs) <= P2.x0 + 1 && Math.max(...xs) >= P2.x1 - 1)) B(`f1 does not stand along platform 2 (x ${out.f1})`);
            if (Object.values(R.occupiedSwitches(s)).includes(tr.id)) B('f1 stands on a switch');
            out.f1Late = runOf('f1').tArr - runOf('f1').arr;
          }
          // The parked systems over the rest of the day, and the day's phases.
          const cash = s.econ.cash, tgN = s.tg.inbox ? s.tg.inbox.length : JSON.stringify(s.tg).length, shelf = JSON.stringify(s.town);
          for (let i = 0; i < 16 * 450 && s.pd.ph !== 'summary'; i++) run(1);
          if (s.pd.ph !== 'summary') B(`the day did not end (phase ${s.pd.ph})`);
          if (!evs.some(e => e.t === 'pdDay')) B('the morning did not become the day');
          if (s.econ.cash !== cash) B('the cash changed in the prototype');
          if ((s.tg.inbox ? s.tg.inbox.length : JSON.stringify(s.tg).length) !== tgN) B('telegrams came in the prototype');
          if (JSON.stringify(s.town) !== shelf) B('the town\'s businesses used goods in the prototype');
          if (evs.some(e => /^overland|^tut|^tt[A-Z]|^contract/.test(e.t))) B(`parked events: ${[...new Set(evs.filter(e => /^overland|^tut|^tt[A-Z]|^contract/.test(e.t)).map(e => e.t))].join(', ')}`);
          run(1, [{ t: 'pdNextDay' }]);
          if (s.pd.ph !== 'morning' || s.pd.day !== 1 || (s.time + R.CFG.DAY_START_S) !== 86400 + 6 * 3600) B(`the next morning: ${s.pd.ph}, day ${s.pd.day}, time ${s.time}`);
          out.sum = s.pd.stats; out.evTypes = [...new Set(evs.map(e => e.t))].sort().join(' ');
          out.hash = R.stateHash(s);
          // The same day twice gives the same result.
          return out;
        }, PROMISE);
        problems.push(...r.bad);
        console.log(`  track 1 at z ${(-r.d.D1).toFixed(2)}, track 3 at z ${r.d.D3.toFixed(2)}; switches at x ${Object.entries(r.d.sw).map(([k, v]) => k + ' ' + v.toFixed(2)).join(', ')}`);
        console.log(`  walking distances (u): ${Object.entries(r.dist).map(([k, v]) => `${k} ${v}`).join('; ')}`);
        console.log(`  ${r.places} places reachable checked; closest building to track ${r.minClear.toFixed(2)}u past its clearance; p1 stood at x ${r.p1}, f1 at x ${r.f1} (${r.f1Late}s late); a day's hash ${r.hash}`);
        // The older worlds open as before, in 3D.
        const worlds = await page.evaluate(() => { const R = window.__railhead; return ['start', 'yard', 'hub', 'proto'].map(w => R.newState(1866, w).track.world).join(); });
        if (worlds !== 'start,yard,hub,proto') problems.push(`newState worlds: ${worlds}`);
      }
      // The pixel renderer.
      const pr = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, out = { bad: [] }, B = m => out.bad.push(m);
        const f0 = X.stats.frames; await new Promise(r => setTimeout(r, 400));
        if (!X.pixOn() || !(X.stats.frames > f0)) B('the pixel renderer is not drawing');
        const cv = X.canvas;
        if (!cv || cv.hidden || getComputedStyle(cv).display === 'none') B('no pixel canvas showing');
        const v = X.view;
        if (!Number.isInteger(v.scale) || v.scale < 1) B(`scale ${v.scale} is not a whole number`);
        if (cv && (cv.width !== Math.round(innerWidth * devicePixelRatio) || cv.height !== Math.round(innerHeight * devicePixelRatio))) B(`canvas ${cv.width} x ${cv.height}, not the screen's device pixels`);
        // The picture is not blank: many colours in the canvas.
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, cols = new Set();
        for (let i = 0; i < d.length; i += 4 * 97) cols.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
        out.colours = cols.size;
        if (cols.size < 8) B(`only ${cols.size} colours drawn`);
        // Screen to world and back.
        for (const [x, z] of [[0, -8], [10, 4], [-15, -20]]) {
          const p = R.toScreen(x, z, 0), g = R.three ? null : null, w = X.pixGroundAt(p.x, p.y, 0);
          if (Math.hypot(w.x - x, w.z - z) > 0.15) B(`screen and world disagree at (${x}, ${z}): back at (${w.x.toFixed(2)}, ${w.z.toFixed(2)})`);
        }
        // Whole zoom steps.
        const z0 = R.camera.zoom, s0 = X.view.scale;
        R.camera.zoom = z0 * 2; await new Promise(r => setTimeout(r, 200));
        if (X.view.scale !== Math.round(s0 * 2) && X.view.scale !== 8) B(`zoom x2 gives scale ${X.view.scale} (from ${s0})`);
        R.camera.zoom = z0; await new Promise(r => setTimeout(r, 200));
        out.scale = s0; out.ms = X.stats.ms; out.items = X.stats.items;
        return out;
      });
      problems.push(...pr.bad.map(b => `${orient}: ${b}`));
      const shot = async (name, zoom, fx, fz) => {
        await page.evaluate(([zoom, fx, fz]) => { const R = window.__railhead; R.camera.zoom = zoom; R.camera.ox = fx - R.state.player.x; R.camera.oz = fz - R.state.player.z; }, [zoom, fx, fz]);
        await page.waitForTimeout(400);
        await page.screenshot({ path: screenshotPath(`protoworld-${name}-${orient}`) });
        return page.evaluate(() => ({ ms: +window.__railhead.pix.stats.ms.toFixed(2), items: window.__railhead.pix.stats.items, fills: window.__railhead.pix.stats.fills, scale: window.__railhead.pix.view.scale }));
      };
      const st = {};
      st.start = await shot('start', 1.5, 9.5, -11);
      st.out = await shot('out', 0.75, 0, -12);
      // Two trains standing (p1 at platform 1, f1 at track 3), from the sim with the switches set.
      const picked = await page.evaluate(async () => {
        const R = window.__railhead, S = R.newState(1866, 'proto'), runOf = svc => S.rr.runs.find(q => q.svc === svc);
        R.simTick(S, []);
        S.track.switches[1].state = 'R'; S.track.switches[3].state = 'R';
        S.rr.runs.find(q => q.svc === 'x1').ph = 'gone';
        for (let i = 0; i < 4000 && !(runOf('p1').ph === 'stand' && runOf('f1').ph === 'stand'); i++) R.simTick(S, []);
        R.importSave(JSON.stringify({ state: S }));
        R.camera.zoom = 1.0; R.camera.ox = 0 - R.state.player.x; R.camera.oz = 0 - R.state.player.z;
        await new Promise(r => setTimeout(r, 500));
        const tr = R.state.trains[runOf('p1').slot], p = R.trainPoses(R.state.track, tr)[2], q = R.toScreen(p.x, p.z, 1.4);
        const hit = R.pix.pixPickTrain(q.x, q.y);
        return { stand: [runOf('p1').ph, runOf('f1').ph], hit: hit && hit.id === tr.id && hit.stock === tr.consist[2].id };
      });
      if (picked.stand.join() !== 'stand,stand') problems.push(`${orient}: the two trains did not stand (${picked.stand})`);
      if (!picked.hit) problems.push(`${orient}: a tap on a coach did not pick it`);
      st.trains = await shot('trains', 1.0, 0, 0);
      const gms = await page.evaluate(() => window.__railhead.pix.stats.groundMs);
      console.log(`  ${orient}: pixel view scale ${pr.scale} (device px per native px), ${pr.colours} colours sampled, the ground layer made in ${gms} ms; frame ${JSON.stringify(st)}`);
      for (const [k, v] of Object.entries(st)) if (!(v.ms < 50)) problems.push(`${orient}: a frame took ${v.ms} ms (${k})`);
      if (errors.length) problems.push(`${orient}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  // The older worlds are drawn in 3D, with no pixel canvas showing.
  for (const w of ['hub', 'start']) {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=' + w });
    try {
      const r = await page.evaluate(() => ({ world: window.__railhead.state.track.world, pix: window.__railhead.pix.pixOn(), cv: !!window.__railhead.pix.canvas && !window.__railhead.pix.canvas.hidden, dc: window.__railhead.drawCalls }));
      if (r.world !== w || r.pix || r.cv || !(r.dc > 0)) problems.push(`?world=${w}: ${JSON.stringify(r)} (expected the ${w} world in 3D)`);
      if (errors.length) problems.push(`?world=${w}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
