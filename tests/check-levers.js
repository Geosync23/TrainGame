// Check: the lever frames and the day's timing (D27, builder T; plans/d27-tech.md 2.2 and 8.3; D29: one frame).
// - The frames (PROTO.LEVERS, read from the data): D29 puts all four levers in one frame (C: W1 W3 E1 E3, west to
//   east) at platform 1's back edge within about 6u of x 0, its stage against the deck's back edge, the agent's spots on
//   platform 1, clear of the depot's door, the benches and the footbridges (?levers=two: D27's west and east frames, the
//   same checks but the one frame's place). Every switch's lever is in exactly one frame, the levers PITCH apart; each
//   switch's stand is its lever's post and use spot, and a switch is thrown only there (switchSpots gives no spot at
//   the points). From the middle of platform 1 the player throws each of the four switches over and back with
//   useSwitch alone (the page's Throw button and a tap on a lever send it): every throw happens with the agent at that
//   switch's lever. rrSwitchNeeds names each row's lever and frame.
// - A train waits at a switch set against it: p1 comes in from the west with W1 lying straight (it needs the turn-off):
//   it stops short of W1, waits there (shown late on the board, never cancelled) and comes in once the agent has
//   thrown W1 at its frame; leaving east with E1 set against it, it waits at E1 until the agent throws it at its
//   frame, then leaves.
// - The cars where they stand (protoCarEnds for P, protoCarDoors for F): the same places before a train comes in and
//   while it stands; every passenger run's coach ends on platform 1, none beside a footbridge's flight (a coach end
//   under a footbridge's deck is flagged bridge: that coach boards at its other end; every coach has an end to board
//   at); every freight run's doors along the loading edge with their door spots on the cargo platform's deck.
// - The day by the lever frames: two days played by the careful player of tests/proto-bot.js (the D25 flows: tickets
//   in line, goods by hand, the evening's deliveries; ?d27=0) through touch-level commands; every run in and out each
//   day, every switch change the agent's throw at that switch's lever in its frame, and the worst lateness (arrival
//   or departure, any run) at most 15 minutes: the schedule (PROTO_SCHEDULE, re-timed by T) fits the D27 walks.
// - Screenshots, portrait and landscape (d29-levers-*): the agent throwing W1 at its frame while a train is on its way.

const { openGame, screenshotPath } = require('./browser');
const { PROTO_BOT_SRC } = require('./proto-bot');

const LATE_LIMIT_MIN = 15, DAYS = 2;

module.exports = async function checkLevers() {
  const problems = [], P = m => problems.push(m);
  let shot = null;
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d27=0' });
    try {
      // ---- The frames, throwing at them, the needs' lever names ----
      const A = await page.evaluate(() => {
        const R = window.__railhead, Pr = R.proto, D = R.d27, out = { bad: [], throws: [] }, B = m => out.bad.push(m);
        const L = D.PROTO_LEVERS, F = Pr.PROTO.LEVERS, SW = Pr.PROTO_SW, PR = Pr.PROTO, T0 = R.newState(1866, 'proto').track;
        // D29: the frames in use (PROTO.LEVERS: one frame C by default, ?levers=two D27's W and E); every switch's lever in
        // exactly one of them, at its frame's z, the levers PITCH apart west to east in the frame's order.
        out.layout = PR.LEVER_FRAMES;
        const seen = {};
        for (const f of F.FRAMES) {
          const q = F[f], n = q.levers.length;
          q.levers.forEach((name, i) => {
            const lv = L[name];
            seen[name] = (seen[name] || 0) + 1;
            if (!lv || lv.frame !== f) { B(`lever ${name}: frame ${lv && lv.frame}, expected ${f}`); return; }
            if (Math.abs(lv.x - (q.x + (i - (n - 1) / 2) * F.PITCH)) > 1e-6 || lv.z !== q.z) B(`lever ${name} is not in its place in frame ${f} (${lv.x}, ${lv.z})`);
            if (Math.abs(lv.uz - lv.z - F.USE_DZ) > 1e-6 || lv.ux !== lv.x) B(`lever ${name}: its use spot (${lv.ux}, ${lv.uz})`);
          });
        }
        for (const name of Object.keys(SW)) if (seen[name] !== 1) B(`lever ${name} is in ${seen[name] || 0} frames`);
        out.frames = F.FRAMES.map(f => `${f} (${F[f].x}, ${F[f].z}): ${F[f].levers.join(' ')}`).join('; ');
        if (PR.LEVER_FRAMES === 'one') {
          // The one frame (D29: "consolidated but still near the track, not on the main platform"): at ground level just
          // off one end of platform 1 (its stage against the end of the planks, not on them), beside track 1 and clear
          // of a train on it, the footbridges' flights, the cart crossing and the cart path; the agent's spots on the
          // ground, reached from platform 1 without crossing a track (check-d27world walks there).
          const q = F[F.FRAMES[0]], half = F.STAGE[0] / 2, x0 = q.x - half, x1 = q.x + half, z0 = q.z - F.STAGE[1] / 2, z1 = q.z + F.STAGE[1] / 2, Dk = PR.P1_DECK;
          if (F.FRAMES.length !== 1) B(`one frame expected, ${F.FRAMES.length}`);
          if (q.y !== 0) B(`the frame stands at ${q.y}, not on the ground`);
          if (!(x1 <= Dk.x0 + 1e-6 && Dk.x0 - x1 < 1) && !(x0 >= Dk.x1 - 1e-6 && x0 - Dk.x1 < 1)) B(`the frame's stage (x ${x0} to ${x1}) is not just off an end of platform 1's planks (${Dk.x0} to ${Dk.x1})`);
          if (z0 < Dk.z0 || z1 > Dk.z1) B(`the frame's stage (z ${z0} to ${z1}) is not beside platform 1 (z ${Dk.z0} to ${Dk.z1})`);
          const clear = -6 - Math.max(...Object.values(D.PROTO_STOCK.cars).map(c => c.wid || 0), D.PROTO_STOCK.loco.wid || 0) / 2;
          if (!(z1 < clear)) B(`the frame's stage reaches z ${z1}, within a train's width of track 1 (${clear.toFixed(2)})`);
          for (const lv of Object.values(L)) if (D.walkDeckY(T0, lv.ux, lv.uz) !== 0) B(`lever ${lv.name}'s use spot (${lv.ux}, ${lv.uz}) is not on the ground`);
          for (const fb of Pr.PROTO_BRIDGES) for (const p of fb.parts) if (p.x1 > x0 && p.x0 < x1 && p.z1 > z0 && p.z0 < z1) B(`the frame overlaps footbridge ${fb.id}`);
          const X = PR.XING_CART, cp = PR.CART_PATH, pw = PR.PATH_W / 2;
          if (X.x + X.w / 2 > x0 && X.x - X.w / 2 < x1) B('the frame is in the cart crossing\'s way');
          for (let i = 1; i < cp.length; i++) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [q.x, q.z]]) {
            const [ax, az] = cp[i - 1], [bx, bz] = cp[i], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
            if (Math.hypot(ax + vx * t - x, az + vz * t - z) < pw) B(`the frame's stage is on the cart path at (${x}, ${z})`);
          }
        }
        let S = R.newState(1866, 'proto');
        R.simTick(S, [{ t: 'pdStart' }]);
        const T = S.track;
        for (const [name, id] of Object.entries(SW)) {
          const W = T.switches[id], lv = L[name];
          if (W.stand.ux !== lv.ux || W.stand.uz !== lv.uz || W.stand.x !== lv.x || W.stand.z !== lv.z) B(`switch ${name}: its stand is not its lever (${JSON.stringify(W.stand)})`);
          if (R.rr.protoLeverOf(T, id) !== lv) B(`protoLeverOf(${id}) is not lever ${name}`);
        }
        // The needs name their levers.
        const rows = R.rr.rrSwitchNeeds(S);
        const badRow = rows.find(n => !L[n.lever] || SW[n.lever] !== n.sw || n.frame !== L[n.lever].frame);
        if (!rows.length || badRow) B(`rrSwitchNeeds rows without the right lever: ${JSON.stringify(badRow || rows.length)}`);
        out.needs = rows.slice(0, 4).map(n => `${n.svc} ${n.lever}/${n.frame} ${n.want} by ${n.by}`).join(', ');
        // Nothing comes for a while: the first runs skipped (the throws are not locked by a train).
        for (const r of S.rr.runs) { r.ph = 'gone'; r.skipped = true; }
        const P = S.player;
        Object.assign(P, { x: 0, z: Pr.PROTO.P1.z1 - 2.2, mode: 'idle', use: null, act: null });
        for (const name of ['W1', 'W3', 'E1', 'E3', 'E3', 'E1', 'W3', 'W1']) {
          const id = SW[name], lv = L[name], st0 = T.switches[id].state, t0 = S.time;
          let ev = null;
          for (let i = 0; i < 400 && !ev; i++) ev = R.simTick(S, i === 0 ? [{ t: 'useSwitch', sw: id }] : []).find(e => e.t === 'switchThrown' || e.t === 'switchLocked' || e.t === 'blocked');
          const d = Math.hypot(P.x - lv.ux, P.z - lv.uz);
          out.throws.push(`${name} ${st0}>${T.switches[id].state} ${Math.round((S.time - t0) / 60)}m, ${d.toFixed(2)}u from its lever`);
          if (!ev || ev.t !== 'switchThrown' || ev.sw !== id) B(`useSwitch ${name}: ${JSON.stringify(ev)}`);
          else if (d > 0.6) B(`${name} was thrown ${d.toFixed(2)}u from its lever (at ${P.x.toFixed(2)}, ${P.z.toFixed(2)})`);
          if (T.switches[id].state === st0) B(`${name} did not change`);
        }
        return out;
      });
      problems.push(...A.bad);
      console.log(`  frames (${A.layout}): ${A.frames}`);
      console.log(`  throws from platform 1 (each over and back): ${A.throws.join('; ')}`);
      console.log(`  needs: ${A.needs}`);

      // ---- A train waits at a switch set against it, in and out ----
      const Bw = await page.evaluate(() => {
        const R = window.__railhead, Pr = R.proto, L = R.d27.PROTO_LEVERS, SW = Pr.PROTO_SW, out = { bad: [], log: [] }, B = m => out.bad.push(m);
        const keep = window.ppReady;
        window.ppReady = () => true;   // the travellers are P's; this part is about the switches
        try {
          const S = R.newState(1866, 'proto');
          R.simTick(S, [{ t: 'pdStart' }]);
          const p1 = R.rr.rrDebugJump(S, 'p1'), T = S.track, P = S.player, hm = () => { const s = (S.time + 18000) % 86400; return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}`; };
          T.switches.forEach(W => { W.state = 'N'; });   // W1 straight: against p1's way in (it needs the turn-off)
          Object.assign(P, { x: 0, z: Pr.PROTO.P1.z1 - 2.2, mode: 'idle', use: null, act: null });
          let wait = null;
          for (let i = 0; i < 2000 && !wait; i++) wait = R.simTick(S, []).find(e => e.t === 'trainSwitchWait');
          if (!wait || wait.sw !== SW.W1) { B(`p1 did not wait at W1: ${JSON.stringify(wait)}`); return out; }
          const tr = S.trains[p1.slot], fx = () => R.edgeAt(T, T.edges[tr.front.e], tr.front.s).x;
          out.log.push(`${hm()} p1 waits at W1, front x ${fx().toFixed(1)}`);
          if (!(fx() < Pr.PROTO.SW.W1)) B(`p1 ran past W1 (${fx()})`);
          for (let i = 0; i < 1000 && S.time < p1.arr + 15 * 60; i++) R.simTick(S, []);   // until a quarter of an hour past its time
          const row = R.rr.rrBoardRows(S).find(q => q.run === p1.id);
          if (p1.ph !== 'in' || !(fx() < Pr.PROTO.SW.W1)) B(`p1 waiting at W1 past its time: ${p1.ph}, front ${fx()}`);
          out.log.push(`${hm()} still waiting, the board shows ${row.state} ${Math.round(row.late / 60)} min late`);
          if (!(row.late >= 15 * 60)) B(`the board does not show p1 late while it waits: ${JSON.stringify({ state: row.state, late: row.late })}`);
          const nW1 = R.rr.rrSwitchNeeds(S).find(n => n.run === p1.id && n.sw === SW.W1);
          if (!nW1 || nW1.lever !== 'W1' || nW1.frame !== L.W1.frame || nW1.set) B(`p1's need of W1: ${JSON.stringify(nW1)}`);
          // The agent throws W1 at its frame.
          let th = null;
          for (let i = 0; i < 400 && !th; i++) th = R.simTick(S, i === 0 ? [{ t: 'useSwitch', sw: SW.W1 }] : []).find(e => e.t === 'switchThrown');
          const d = th ? Math.hypot(P.x - L.W1.ux, P.z - L.W1.uz) : null;
          out.log.push(`${hm()} W1 thrown ${d === null ? '-' : d.toFixed(2) + 'u from its lever'}`);
          if (!th || d > 0.6) B(`W1 not thrown at its lever (${d})`);
          for (let i = 0; i < 1000 && p1.ph !== 'stand'; i++) R.simTick(S, []);
          out.log.push(`${hm()} p1 ${p1.ph}, ${Math.round((p1.tArr - p1.arr) / 60)} min late`);
          if (p1.ph !== 'stand') { B(`p1 did not come in once W1 was thrown (${p1.ph})`); return out; }
          // Out: E1 lies straight (p1 needs the turn-off out of track 1); the wave-off from beside the engine.
          const sp = R.rr.rrWaveSpot(S, tr.id);
          Object.assign(P, { x: sp.x, z: sp.z, mode: 'idle', use: null, act: null });
          for (let i = 0; i < 100 && !p1.ready; i++) R.simTick(S, []);
          const wv = R.simTick(S, [{ t: 'rrWaveOff', tr: tr.id }]).find(e => e.t === 'rrWavedOff' || e.t === 'rrRefused');
          if (!wv || wv.t !== 'rrWavedOff') { B(`p1 not waved off: ${JSON.stringify(wv)}`); return out; }
          let w2 = null;
          for (let i = 0; i < 1000 && !w2; i++) w2 = R.simTick(S, []).find(e => e.t === 'trainSwitchWait');
          if (!w2 || w2.sw !== SW.E1) { B(`p1 leaving did not wait at E1: ${JSON.stringify(w2)} (${p1.ph})`); return out; }
          out.log.push(`${hm()} p1 leaving waits at E1, front x ${fx().toFixed(1)}`);
          if (!(fx() < Pr.PROTO.SW.E1)) B(`p1 ran past E1 (${fx()})`);
          let th2 = null;
          for (let i = 0; i < 400 && !th2; i++) th2 = R.simTick(S, i === 0 ? [{ t: 'useSwitch', sw: SW.E1 }] : []).find(e => e.t === 'switchThrown');
          const d2 = th2 ? Math.hypot(P.x - L.E1.ux, P.z - L.E1.uz) : null;
          out.log.push(`${hm()} E1 thrown ${d2 === null ? '-' : d2.toFixed(2) + 'u from its lever'}`);
          if (!th2 || d2 > 0.6) B(`E1 not thrown at its lever (${d2})`);
          for (let i = 0; i < 1500 && p1.ph !== 'gone'; i++) R.simTick(S, []);
          out.log.push(`${hm()} p1 ${p1.ph}`);
          if (p1.ph !== 'gone') B(`p1 did not leave once E1 was thrown (${p1.ph})`);
        } finally { window.ppReady = keep; }
        return out;
      });
      problems.push(...Bw.bad);
      console.log(`  a switch set against a train: ${Bw.log.join('; ')}`);

      // ---- The cars where they stand: coach ends (P) and freight doors (F) ----
      const C = await page.evaluate(() => {
        const R = window.__railhead, Pr = R.proto, PR = Pr.PROTO, out = { bad: [], ends: [], doors: [] }, B = m => out.bad.push(m);
        const flights = Pr.PROTO_BRIDGES.map(b => b.parts.find(p => p.k === 'stair' && p.plat === 'p1'));
        for (const sv of Pr.PROTO_SCHEDULE.filter(v => !v.through)) {
          const S0 = R.newState(1866, 'proto');
          R.simTick(S0, [{ t: 'pdStart' }]);
          const before = S0.rr.runs.find(r => r.svc === sv.id);
          const plan = sv.kind === 'pax' ? R.rr.protoCarEnds(S0, before) : R.rr.protoCarDoors(S0, before);
          const S = R.rr.protoDebugScenario(R.newState(1866, 'proto'), Math.floor(sv.arr / 3600), Math.floor(sv.arr % 3600 / 60), [sv.id]);
          const run = S.rr.runs.find(r => r.svc === sv.id && r.ph === 'stand');
          const now = sv.kind === 'pax' ? R.rr.protoCarEnds(S, run) : R.rr.protoCarDoors(S, run);
          if (plan.length !== sv.cars || now.length !== sv.cars) { B(`${sv.id}: ${plan.length} cars planned, ${now.length} standing, expected ${sv.cars}`); continue; }
          if (now.some(c => !Number.isInteger(c.stock)) || plan.some(c => c.stock !== null)) B(`${sv.id}: stock ids before ${plan.map(c => c.stock)} / standing ${now.map(c => c.stock)}`);
          if (sv.kind === 'pax') {
            let worst = 0, under = [];
            now.forEach((c, i) => {
              c.ends.forEach((e, j) => {
                const p = plan[i].ends[j];
                worst = Math.max(worst, Math.hypot(e.spot.x - p.spot.x, e.spot.z - p.spot.z));
                if (e.spot.x < PR.P1.x0 || e.spot.x > PR.P1.x1 || e.spot.z < PR.P1.z0 || e.spot.z > PR.P1.z1) B(`${sv.id} coach ${i} ${e.end} end: its spot (${e.spot.x.toFixed(2)}, ${e.spot.z.toFixed(2)}) is off platform 1`);
                const fl = flights.find(f => e.spot.x > f.x0 && e.spot.x < f.x1);
                if (fl) B(`${sv.id} coach ${i} ${e.end} end at x ${e.spot.x.toFixed(2)} stands beside a footbridge's flight (${fl.x0} to ${fl.x1})`);
                if (e.bridge) under.push(`${i}${e.end[0]}@${e.spot.x.toFixed(1)}`);
              });
              if (c.ends.every(e => e.bridge)) B(`${sv.id} coach ${i}: no end to board at`);
            });
            if (worst > 0.3) B(`${sv.id}: the coach ends planned and standing differ by ${worst.toFixed(2)}u`);
            out.ends.push(`${sv.id} (${sv.to}) ${now.map(c => c.ends.map(e => e.spot.x.toFixed(1)).join('/')).join(' ')}${under.length ? ' (under a deck: ' + under.join(' ') + ')' : ''}`);
          } else {
            let worst = 0;
            now.forEach((d, i) => {
              worst = Math.max(worst, Math.hypot(d.spot.x - plan[i].spot.x, d.spot.z - plan[i].spot.z));
              const E = PR.LOAD_EDGE;
              if (d.x0 < E.x0 || d.x1 > E.x1) B(`${sv.id} car ${i}: its door (${d.x0.toFixed(2)} to ${d.x1.toFixed(2)}) is not along the loading edge`);
              const y = R.d27.walkDeckY(S.track, d.spot.x, d.spot.z);
              if (Math.abs(y - PR.DOCK_Y) > 1e-6) B(`${sv.id} car ${i}: its door spot is at height ${y}, not on the cargo platform's deck`);
              if (Pr.walkBridgeAt(S.track, d.spot.x, d.spot.z)) B(`${sv.id} car ${i}: its door spot is on a footbridge`);
            });
            if (worst > 0.3) B(`${sv.id}: the doors planned and standing differ by ${worst.toFixed(2)}u`);
            out.doors.push(`${sv.id} (${sv.to}) ${now.map(d => d.x.toFixed(1)).join(' ')}`);
          }
        }
        return out;
      });
      problems.push(...C.bad);
      console.log(`  coach end spots (x): ${C.ends.join('; ')}`);
      console.log(`  freight doors (x): ${C.doors.join('; ')}`);

      // ---- Two days by the lever frames, with the D25 flows ----
      await page.evaluate(src => { window.__lvsrc = src; }, PROTO_BOT_SRC);
      const D = await page.evaluate(days => {
        const R = window.__railhead, L = R.d27.PROTO_LEVERS, SW = R.proto.PROTO_SW, name = Object.fromEntries(Object.entries(SW).map(([k, v]) => [v, k]));
        const S = R.newState(1866, 'proto'), bot = (0, eval)('(' + window.__lvsrc + ')')(R, null), out = { bad: [], runs: {}, throws: 0, byFrame: Object.fromEntries(R.proto.PROTO.LEVERS.FRAMES.map(f => [f, 0])), other: 0 };
        bot.mem.days = days;
        let shot = null;
        for (let i = 0; i < days * 86400 / 8 + 200; i++) {
          if (S.pd.ph === 'summary' && S.pd.day >= days - 1) break;
          const before = S.track.switches.map(w => w.state).join(''), cmds = bot.decide(S), ev = R.simTick(S, cmds);
          bot.observe(S, ev);
          let thrown = 0;
          for (const e of ev) {
            const run = e.run !== undefined && e.run !== null ? S.rr.runs.find(r => r.id === e.run) : null;
            if (e.t === 'switchThrown') {
              thrown++; out.throws++;
              const lv = L[name[e.sw]], d = Math.hypot(S.player.x - lv.ux, S.player.z - lv.uz);
              out.byFrame[lv.frame]++;
              if (d > 0.6 && out.bad.length < 5) out.bad.push(`day ${S.pd.day + 1}: ${lv.name} thrown ${d.toFixed(2)}u from its lever`);
            }
            if (run) {
              const o = out.runs[run.id] = out.runs[run.id] || { svc: run.svc, day: run.day, ph: 'due', a: null, d: null };
              if (e.t === 'rrArrived' || e.t === 'rrPassed') o.a = Math.max(0, run.tArr - run.arr);
              if (e.t === 'rrWavedOff') { o.d = Math.max(0, run.tWave - run.dep); if (e.auto) o.auto = true; }
              if (e.t === 'rrLeft') o.ph = 'gone';
              if (e.t === 'rrCancelled') o.ph = 'cxl';
            }
          }
          if (before !== S.track.switches.map(w => w.state).join('') && !thrown) out.other++;
          // The moment for the screenshots: day 1, the agent throwing W1 at its frame while a train is on its way.
          if (!shot && S.pd.day === 0 && thrown && Math.hypot(S.player.x - L.W1.ux, S.player.z - L.W1.uz) < 3 && S.rr.runs.some(r => r.ph === 'in' || r.ph === 'out')) shot = JSON.stringify({ state: S });
        }
        out.end = S.pd.ph + ' day ' + (S.pd.day + 1);
        out.shot = shot;
        return out;
      }, DAYS);
      problems.push(...D.bad);
      shot = D.shot;
      const W = await page.evaluate(() => window.__railhead.proto.PROTO_SCHEDULE.length);
      const runs = Object.values(D.runs), m = s => (s === null ? '-' : Math.round(s / 60));
      let worst = { late: 0, at: '' };
      for (let d = 0; d < DAYS; d++) {
        const rs = runs.filter(r => r.day === d);
        if (rs.length !== W) P(`day ${d + 1}: ${rs.length} runs, expected ${W}`);
        const bad = rs.filter(r => r.ph !== 'gone' || r.auto);
        if (bad.length) P(`day ${d + 1}: runs not in and out: ${bad.map(r => r.svc + ' ' + r.ph).join(', ')}`);
        for (const r of rs) for (const k of ['a', 'd']) if (r[k] !== null && r[k] > worst.late) worst = { late: r[k], at: `day ${d + 1} ${r.svc} ${k === 'a' ? 'in' : 'out'}` };
        console.log(`  day ${d + 1} (minutes late in/out): ${rs.map(r => `${r.svc} ${m(r.a)}/${m(r.d)}`).join(', ')}`);
      }
      console.log(`  ${D.throws} throws (by frame ${JSON.stringify(D.byFrame)}); worst lateness ${m(worst.late)} min (${worst.at}); ended ${D.end}`);
      if (D.other) P(`a switch changed ${D.other} times without the agent's throw`);
      if (!Object.values(D.byFrame).every(n => n > 0)) P(`throws at the frames: ${JSON.stringify(D.byFrame)}`);
      if (worst.late > LATE_LIMIT_MIN * 60) P(`the worst lateness was ${m(worst.late)} minutes (${worst.at}), over ${LATE_LIMIT_MIN}`);
      if (!shot) P('no moment with the agent throwing W1 at its frame while a train is on its way');
      if (errors.length) P('portrait: console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // ---- Screenshots ----
  if (shot) for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&d27=0' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P(`${orient}: the atlas did not load`));
      await page.evaluate(async json => {
        const R = window.__railhead; R.importSave(json);
        if (R.pdui.closeBoard) R.pdui.closeBoard();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const P = R.state.player; R.pix.pixLookAt(P.x + 4, P.z + 4);
        await new Promise(r => setTimeout(r, 600));
      }, shot);
      await page.screenshot({ path: screenshotPath(`d29-levers-${orient}`) });
      if (errors.length) P(`${orient}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    } finally { await browser.close(); }
  }
  console.log('  screenshots: test-output/d29-levers-{portrait,landscape}.png');
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
