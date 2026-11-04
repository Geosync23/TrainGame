// Check: timetable and dispatch for two stations (M1 package 6, builder C3; design-doc 7 and 8).
// - Coupling and uncoupling: a person at the joint uncouples (0.5 game minutes, the train standing); a move of
//   No. 1 into a standing cut couples it (the joined train keeps id 0; the cut's entry stays, empty); train ids never
//   change. A moving train stops CFG.STOP_GAP (0.8u since D15) short of a standing engine.
// - No. 1 fetches a car the Overland set out on the interchange (the real start, where the interchange is joined).
// - A service runs to time when its station work is done, and waits when it is not (goods for the station aboard).
// - Two timetable trains on the single-track spur never meet head-on: they meet at Willow Ford's loop; no block is
//   ever held by two trains, reservations never overlap, and the second train leaves only when the first is in.
// - A train low on wood stops at its next stop and waits; a cord carried from the wood stage onto the tender lets it go.
// - Water at the tower spout (2 game minutes), during the run-around at Willow Ford.
// - Run-around: after it the engine is at the other end, still facing the old way, and runs tender first at 60%.
// - Save and reload mid-service (export/import, and a real page reload) resume exactly.
// - Determinism: 2 game days of the real start with No. 1 on the timetable and a scripted player, twice, same hash.
// - By real touch: a tap on the gap between two vehicles uncouples there; Back couples again; a tap on a cord of
//   wood and then on the engine puts it on the tender; the Timetable button puts No. 1 on the timetable.
// - Screenshots timetable-board-portrait.png, timetable-runaround-portrait.png, timetable-landscape.png; draw calls.

const { openGame, waitReady, screenshotPath } = require('./browser');
const { useSwitchman } = require('./switchman'); // D20: a switchman throws the switches routes need (as the player would)

// Helpers defined in the page: an automatic player who does the station tasks (teleporting next to the work, so
// long runs stay short), and a tick runner that records what happens.
const HELPERS = `window.__c3 = (() => {
  const R = window.__railhead;
  const near = (st, x, z) => { st.player.x = x; st.player.z = z; st.player.mode = 'idle'; st.player.use = null; };
  // One tick with the automatic player for train trId. opts: { uncouple, water, wood, unload } (all on by default).
  function auto(st, trId, opts) {
    opts = opts || {};
    const tr = st.trains[trId], P = st.player, cmds = [], busy = P.mode !== 'idle' || P.act;
    if (!busy && opts.unload !== false && /station work/.test(tr.status)) {
      const ids = R.cargo.itemsAt(st, { kind: 'CAR', stockId: tr.consist.find(c => c.k !== 'loco').id }).concat(...tr.consist.map(c => R.cargo.itemsAt(st, { kind: 'CAR', stockId: c.id })));
      const held = R.carry.carryHeld(st);
      if (held.length) cmds.push({ t: 'carryPut', x: Math.round(P.x * 100), z: Math.round((P.z - 1) * 100) });
      else if (ids.length) { const d = R.interchange.carryCarDoor(st, st.items.where[ids[0]].stockId, P.x, P.z); near(st, d.x + d.ox * 0.5, d.z + d.oz * 0.5); cmds.push({ t: 'carryPick', id: ids[0] }); }
    } else if (!busy && opts.uncouple !== false && /uncouple the engine/.test(tr.status)) {
      const k = R.tt.ttEngineJoint(tr), j = R.tt.ttJointAt(st, tr, k); near(st, j.x + j.fz * R.tt.TT.BESIDE, j.z - j.fx * R.tt.TT.BESIDE); cmds.push({ t: 'uncouple', tr: trId, at: k });
    } else if (!busy && opts.water !== false && /take water/.test(tr.status)) {
      const t = R.tt.ttTenderAt(st, tr, tr.consist.find(c => c.k === 'loco').id);
      const ws = R.tt.ttStations(st).filter(s => s.water).sort((a, b) => Math.hypot(a.water.x - t.x, a.water.z - t.z) - Math.hypot(b.water.x - t.x, b.water.z - t.z))[0];
      near(st, ws.water.sx, ws.water.sz); cmds.push({ t: 'takeWater' });
    } else if (!busy && opts.wood !== false && /(load wood|low on wood)/.test(tr.status)) {
      const held = R.carry.carryHeld(st), cord = held.find(id => st.items.waybill[id].commodity === 'cordwood');
      if (cord !== undefined) { const t = R.tt.ttTenderAt(st, tr, tr.consist.find(c => c.k === 'loco').id); near(st, t.x + t.fz * R.tt.TT.BESIDE, t.z - t.fx * R.tt.TT.BESIDE); cmds.push({ t: 'fuelTender', tr: trId }); }
      else {
        let id = -1; for (let i = 0; i < st.items.next; i++) if (st.items.alive[i] && st.items.waybill[i].commodity === 'cordwood' && st.items.where[i].kind === 'GROUND') { id = i; break; }
        if (id < 0) { const ws = R.tt.ttStations(st).find(s => s.wood) ; id = R.cargo.itemCreate(st, { commodity: 'cordwood', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'CONSTRUCTION', id: 0 }, contractId: null, due: null }, { kind: 'GROUND', x: Math.round(ws.wood.x * 100), z: Math.round((ws.wood.z - 3.2) * 100) }, null) ? st.items.next - 1 : -1; }
        const w = st.items.where[id]; near(st, w.x / 100 + 0.6, w.z / 100); cmds.push({ t: 'carryPick', id });
      }
    }
    return R.simTick(st, cmds);
  }
  // Blocks each on-map train occupies.
  function blocksOf(st) {
    const ix = R.tt.trackIndex(st.track), out = {};
    for (const tr of st.trains) { const s = new Set(); for (const [e, a, b] of (tr.consist.length && !tr.away ? segs(st, tr) : [])) if (b - a > 1e-6) s.add(ix.block[e]); out[tr.id] = [...s]; }
    return out;
  }
  function segs(st, tr) { const out = []; R.trackWalk(st.track, { ...tr.front, d: -tr.front.d }, R.trainLength(tr), out); return out; }
  const hhmm = st => { const s = (st.time + 5 * 3600) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
  // Fast services for the M0 test yard (its stations are 40 to 60u apart).
  function yardServices(st, tr) {
    const M = 60;
    st.tt.services = [{ id: 0, name: 'Test Mixed', cls: 3, train: tr, days: 127, last: -1, stops: [
      { st: 'hub', arr: null, dep: 7 * 3600 + 30 * M, acts: ['work'] },
      { st: 'willow', arr: 7 * 3600 + 50 * M, dep: 8 * 3600 + 40 * M, acts: ['work', 'water'], turn: 'runaround' },
      { st: 'hub', arr: 9 * 3600 + 10 * M, dep: null, acts: ['work'] }] }];
  }
  function addEngine(st, name, front) {
    const id = st.trains.length;
    st.trains.push({ id, name, front, v: 0, mode: 'idle', m: 1, route: null, status: 'Stopped',
      consist: [{ id: 500 + id, k: 'loco', len: 5.2 * R.CFG.SCALE, mass: 3, power: 10, fuel: R.tt.FUEL_CAP, water: R.CFG.WATER_U }] });
    return id;
  }
  return { auto, blocksOf, hhmm, yardServices, addEngine, near };
})();`;

module.exports = async function checkTimetable() {
  const problems = [];
  // ---- Part 1: the sim alone ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      await useSwitchman(page);
      await page.evaluate(HELPERS);
      const r = await page.evaluate(() => {
        const R = window.__railhead, C = window.__c3, out = {}, SC = R.CFG.SCALE;
        out.gapWant = R.CFG.STOP_GAP; out.scale = SC; out.tfWant = 2.4 * SC;
        // 1. Uncouple and couple in the test yard.
        {
          const st = R.newState(1866, 'yard'), log = [];
          let t0 = null, t1 = null;
          R.simTick(st, [{ t: 'uncouple', tr: 0, at: 2 }]);
          for (let i = 0; i < 400 && t1 === null; i++) {
            if (st.player.act && st.player.act.k === 'cut' && t0 === null) t0 = st.time;
            const ev = R.simTick(st, []);
            if (ev.some(e => e.t === 'uncoupled')) t1 = st.time;
          }
          const cut = st.trains[st.trains.length - 1];
          out.uncouple = { took: t1 - t0 + 8, no1: st.trains[0].consist.map(c => c.id), cut: { id: cut.id, owner: cut.owner, cars: cut.consist.map(c => c.id) }, ids: st.trains.every((t, i) => t.id === i) };
          // Pull 3u away, stop, then back into it: couples on contact.
          R.simTick(st, [{ t: 'trainRun', tr: 0, dir: 1 }]);
          for (let i = 0; i < 40 && R.tt.trainObstacle(st, st.trains[0], R.trackWalk(st.track, { ...st.trains[0].front, d: -st.trains[0].front.d }, R.trainLength(st.trains[0])).pos, 10) && R.tt.trainObstacle(st, st.trains[0], R.trackWalk(st.track, { ...st.trains[0].front, d: -st.trains[0].front.d }, R.trainLength(st.trains[0])).pos, 10).gap < 3; i++) R.simTick(st, []);
          R.simTick(st, [{ t: 'trainStop', tr: 0 }]);
          for (let i = 0; i < 40; i++) R.simTick(st, []);
          out.pulledAway = R.tt.trainObstacle(st, st.trains[0], R.trackWalk(st.track, { ...st.trains[0].front, d: -st.trains[0].front.d }, R.trainLength(st.trains[0])).pos, 10);
          out.pulledAway = out.pulledAway && out.pulledAway.gap;
          R.simTick(st, [{ t: 'trainRun', tr: 0, dir: -1 }]);
          let coupled = null, vMax = 0;
          for (let i = 0; i < 400 && !coupled; i++) { const ev = R.simTick(st, []); vMax = Math.max(vMax, st.trains[0].v); const c = ev.find(e => e.t === 'coupled'); if (c) coupled = c; }
          out.couple = { ev: coupled, no1: st.trains[0].consist.map(c => c.id + (c.rev ? 'r' : '')), cutLeft: st.trains[cut.id].consist.length, status: st.trains[0].status, n: st.trains.length };
          for (let i = 0; i < 10; i++) R.simTick(st, []);
          out.couple.after = st.trains[0].status;
          out.cons1 = R.cargo.itemCheckConservation(st);
          // 2. A moving train stops 0.5u short of a standing engine.
          const s2 = R.newState(1866, 'yard'), tr = s2.trains[0];
          const ahead = R.trackWalk(s2.track, tr.front, 20 * SC).pos;
          C.addEngine(s2, 'No. 2', ahead);
          R.simTick(s2, [{ t: 'trainRun', tr: 0, dir: 1 }]);
          for (let i = 0; i < 600; i++) R.simTick(s2, []);
          const ob = R.tt.trainObstacle(s2, tr, tr.front, 30 * SC);
          out.gap = { gap: ob && ob.gap, v: tr.v, status: tr.status, other: ob && ob.other.id };
        }
        // 3. No. 1 fetches a set-out car from the interchange (the real start).
        {
          const st = R.interchange.withTestDelivery(R.newState(1866)), X = R.interchange;
          R.simTick(st, [{ t: 'ttAssign', tr: 0, on: false }]);   // D21: No. 1 starts on the timetable; the player drives her here
          let left = -1;
          for (let i = 0; i < 1500 && left < 0; i++) { const ev = R.simTick(st, []); if (ev.some(e => e.t === 'overlandLeft')) left = i; }
          const cut = X.interchangeCut(st), cars = cut.consist.map(c => c.id), items = cars.map(id => R.cargo.itemsAt(st, { kind: 'CAR', stockId: id }).length);
          const run = (cmd, until, max) => { R.simTick(st, [cmd]); for (let i = 0; i < max; i++) { const ev = R.simTick(st, []); if (until(ev)) return i; } return -1; };
          // Out onto the spur past switch 1, then back west onto the interchange cars (Send to a car couples it), then onto the main.
          const spur = R.trackNearest(st.track, 62 * SC, 0.3 * SC);
          const a = run({ t: 'trainSendTo', tr: 0, e: spur.e, s: Math.round(spur.s * 1000) }, ev => ev.some(e => e.t === 'trainArrived'), 1500);
          const cf = cut.front, near = R.trackWalk(st.track, { ...cf, d: -cf.d }, 1).pos;
          const b = run({ t: 'trainSendTo', tr: 0, e: near.e, s: Math.round(near.s * 1000) }, ev => ev.some(e => e.t === 'coupled'), 3000);
          for (let i = 0; i < 12; i++) R.simTick(st, []);
          const main = R.trackNearest(st.track, 20 * SC, 0);
          const c = run({ t: 'trainSendTo', tr: 0, e: main.e, s: Math.round(main.s * 1000) }, ev => ev.some(e => e.t === 'trainArrived'), 3000);
          const no1 = st.trains[0].consist.map(c => c.id);
          const fx = R.trainPoses(st.track, st.trains[0]).map(p => Math.round(p.x));
          out.fetch = { left, cars, items, a, b, c, no1, cutLeft: cut.consist.length, xs: fx, carried: cars.every(id => no1.includes(id)), itemsNow: cars.map(id => R.cargo.itemsAt(st, { kind: 'CAR', stockId: id }).length),
            cons: R.cargo.itemCheckConservation(st) };
        }
        // 4. A service runs to time when the work is done; waits when it is not (test yard, fast services).
        {
          const mk = withGoods => {
            const st = R.tt.ttDebugScenario(R.newState(1866, 'yard'));
            C.yardServices(st, 0);
            if (withGoods) R.cargo.itemCreate(st, { commodity: 'flour', originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 1 }, contractId: null, due: null }, { kind: 'CAR', stockId: 2 }, null);
            const log = [];
            for (let i = 0; i < 2600; i++) {
              const ev = C.auto(st, 0, { unload: withGoods === 'unload' });
              for (const e of ev) if (/^tt(Departed|Arrived|Done|Cancelled)$/.test(e.t)) log.push({ t: e.t, i: e.i, st: e.st, late: e.late, at: C.hhmm(st) });
              if (ev.some(e => e.t === 'ttDone' || e.t === 'ttCancelled')) break;
            }
            return { log, status: st.trains[0].status, items: R.cargo.itemsAt(st, { kind: 'CAR', stockId: 2 }).length, hash: R.stateHash(st) };
          };
          out.onTime = mk(false);
          out.notDone = mk('wait');
          out.doneLate = mk('unload');
        }
        // 5. Two timetable trains on the spur (the real start): they meet at Willow Ford.
        {
          const st = R.newState(1866), T = st.track;
          const wf = R.tt.ttStation(st, 'willow'), k = wf.trk;
          const no2 = C.addEngine(st, 'No. 2', { e: k.e, s: k.s1, d: 1 });
          const H = 3600;
          st.tt.services = [
            { id: 0, name: 'Down', cls: 3, train: 0, days: 127, last: -1, stops: [{ st: 'hub', arr: null, dep: 8 * H, acts: [] }, { st: 'willow', arr: 9 * H + 1200, dep: null, acts: [] }] },
            { id: 1, name: 'Up', cls: 3, train: no2, days: 127, last: -1, stops: [{ st: 'willow', arr: null, dep: 8 * H, acts: [] }, { st: 'hub', arr: 9 * H + 1200, dep: null, acts: [] }] }];
          st.overland.phase = 'off';
          const ev2 = []; let shared = 0, overlap = 0, started = false;
          for (let i = 0; i < 4000; i++) {
            const ev = R.simTick(st, []);
            for (const e of ev) if (/^tt(Departed|Arrived|Done)$/.test(e.t)) ev2.push({ t: e.t, tr: e.tr, st: e.st, at: C.hhmm(st), i });
            const b = C.blocksOf(st);
            const a0 = new Set(b[0]); if (b[no2].some(x => a0.has(x))) shared++;
            const r0 = st.tt.res.find(r => r.tr === 0), r1 = st.tt.res.find(r => r.tr === no2);
            if (r0 && r1 && r0.blocks.some(x => r1.blocks.includes(x))) overlap++;
            if (st.tt.runs.length) started = true; else if (started) break;
          }
          const d1 = ev2.find(e => e.t === 'ttDeparted' && e.tr === 0), d2 = ev2.find(e => e.t === 'ttDeparted' && e.tr === no2), a1 = ev2.find(e => e.t === 'ttArrived' && e.tr === 0 && e.st === 'willow');
          const a2 = ev2.find(e => e.t === 'ttArrived' && e.tr === no2 && e.st === 'hub');
          // Where No. 1 waited for the meet: on Willow Ford's loop (not the main, where No. 2 stood).
          out.meet = { ev: ev2, shared, overlap, d1, d2, a1, a2, no1Track: st.trains[0].front.e, mainEdge: k.e, ok: !!(d1 && d2 && a1 && a2 && d2.i > d1.i) };
          void T;
        }
        // 6. Low on wood: the train stops at its next stop and waits; a carried cord lets it go.
        {
          const st = R.tt.ttDebugScenario(R.newState(1866, 'yard'));
          C.yardServices(st, 0);
          const loco = st.trains[0].consist[0];
          const log = []; let waited = null, fuelled = 0, setLow = false;
          for (let i = 0; i < 2600; i++) {
            const run = R.tt.ttRunOf(st, 0);
            // On the way to Willow Ford, the tender is nearly empty (as after a long day).
            if (!setLow && run && run.i === 1 && run.ph === 'go' && st.trains[0].v > 0) { loco.fuel = 60; setLow = true; }
            const ev = C.auto(st, 0, { wood: waited !== null && st.time > waited + 600 });
            if (!waited && /low on wood/.test(st.trains[0].status)) waited = st.time;
            for (const e of ev) { if (e.t === 'tenderFuelled') fuelled++; if (/^tt(Departed|Arrived|Done)$/.test(e.t)) log.push(e.t + ' ' + e.i + ' ' + C.hhmm(st)); }
            if (ev.some(e => e.t === 'ttDone')) break;
          }
          out.wood = { log, setLow, waitedAt: waited, fuelled, fuel: loco.fuel };
          // The low-wood rule as a departure check: a train at stop 0 with 50u of wood waits; with 2 cords loaded it leaves.
          const s2 = R.tt.ttDebugScenario(R.newState(1866, 'yard'));
          C.yardServices(s2, 0); s2.trains[0].consist[0].fuel = 50;
          let w2 = null, dep2 = null, f2 = 0;
          for (let i = 0; i < 1200 && dep2 === null; i++) {
            const ev = C.auto(s2, 0, { wood: w2 !== null });
            if (w2 === null && /low on wood/.test(s2.trains[0].status)) w2 = C.hhmm(s2);
            for (const e of ev) { if (e.t === 'tenderFuelled') f2++; if (e.t === 'ttDeparted') dep2 = C.hhmm(s2); }
          }
          out.wood2 = { waited: w2, departed: dep2, fuelled: f2, fuel: s2.trains[0].consist[0].fuel, cons: R.cargo.itemCheckConservation(s2), used: s2.items.used.filter(u => u.reason === 'fuel').length };
        }
        // 7 and 8. Water at the tower and the run-around at Willow Ford (the real start), then tender-first running.
        {
          const st = R.newState(1866);
          R.simTick(st, [{ t: 'ttAssign', tr: 0, on: true }]);
          st.tt.services[1].train = null;
          const tr = st.trains[0];
          let waterStart = null, waterDone = null, raDone = null, vMaxTF = 0, vMaxFwd = 0, dep = null, snap = null;
          for (let i = 0; i < 6000; i++) {
            const run = R.tt.ttRunOf(st, 0);
            if (st.player.act && st.player.act.k === 'water' && waterStart === null) waterStart = st.time;
            const ev = C.auto(st, 0);
            if (ev.some(e => e.t === 'waterTaken') && waterDone === null) waterDone = st.time; // the first (Willow Ford); the run back takes water on the way in too
            if (ev.some(e => e.t === 'coupled')) raDone = { at: C.hhmm(st), cons: tr.consist.map(c => c.k + (c.rev ? 'r' : '')), facing: R.tt.trainFacing(tr) };
            if (ev.some(e => e.t === 'ttDeparted' && e.i === 1)) dep = { m: tr.m, tf: R.tt.tenderFirst(tr, tr.m) };
            if (run && run.i === 2 && run.ph === 'go' && dep) vMaxTF = Math.max(vMaxTF, tr.v);
            if (run && run.i === 1 && run.ph === 'go' && !dep) vMaxFwd = Math.max(vMaxFwd, tr.v);
            if (run && run.ph === 'at' && run.ra && run.ra.step === 2 && !snap) snap = JSON.stringify({ state: st });
            if (ev.some(e => e.t === 'ttDone')) break;
          }
          out.ra = { status: tr.status, log: [], waterTook: waterStart !== null && waterDone !== null ? waterDone - waterStart + 8 : null, raDone, dep, vMaxTF, vMaxFwd, water: tr.consist[2] ? null : null, waterNow: tr.consist.find(c => c.k === 'loco').water };
          // 9. Save mid-service (during the run-around) and load: the same future.
          if (!snap) out.saveMid = { noSnapshot: true };
          else {
            const a = R.migrate(JSON.parse(snap)).state, b = R.migrate(JSON.parse(snap)).state;
            const h0 = R.stateHash(a) === R.stateHash(JSON.parse(snap).state);
            for (let i = 0; i < 900; i++) { C.auto(a, 0); C.auto(b, 0); }
            out.saveMid = { sameAtLoad: h0, same: R.stateHash(a) === R.stateHash(b), runs: a.tt.runs.length, ph: a.tt.runs[0] && a.tt.runs[0].ph };
          }
        }
        // 10. Determinism: 2 game days of the real start, No. 1 on the timetable, the scripted player.
        {
          const go = () => {
            const st = R.newState(1866), log = [];
            R.simTick(st, [{ t: 'ttAssign', tr: 0, on: true }]);
            for (let i = 0; i < 2 * 10800; i++) { const ev = C.auto(st, 0); for (const e of ev) if (/^tt(Departed|Done|Cancelled)$/.test(e.t)) log.push(e.t + ' ' + e.svc + ' ' + C.hhmm(st) + (e.late ? ' late ' + Math.round(e.late / 60) : '')); }
            return { h: R.stateHash(st), log, cons: R.cargo.itemCheckConservation(st).length };
          };
          const a = go(), b = go();
          out.det = { same: a.h === b.h, h: a.h, log: a.log, cons: a.cons };
        }
        // 11. (D4) Water on the way in, departures from the platform, and the wood need that stays met.
        {
          const st = R.newState(1866), tr = st.trains[0], hub = R.tt.ttStation(st, 'hub'), log = [];
          R.simTick(st, [{ t: 'ttAssign', tr: 0, on: true }]);
          const maxX = () => Math.max(...R.trainPoses(st.track, tr).map(p => p.x));
          let wood = null;
          for (let i = 0; i < 2 * 10800; i++) {
            const run = R.tt.ttRunOf(st, 0);
            // The wood need at the hub, judged once on day 2's morning stop: low wood is wanted, a filled tender
            // stays met after burning a little (as on a move to the spout).
            if (!wood && run && run.svc === 0 && run.day === 1 && run.i === 0 && run.ph === 'at' && st.trains[0].mode === 'idle') {
              const L = tr.consist.find(c => c.k === 'loco'), f0 = L.fuel, stop = st.tt.services[0].stops[0];
              const need = R.tt.ttWoodNeedU(st, st.tt.services[0], 0, tr);
              L.fuel = 100 * SC; const low = R.tt.ttStopNeeds(st, run, tr, hub, stop).includes('wood');
              L.fuel = 365 * SC; const filled = R.tt.ttStopNeeds(st, run, tr, hub, stop).includes('wood');
              L.fuel = 346 * SC; const after = R.tt.ttStopNeeds(st, run, tr, hub, stop).includes('wood');
              L.fuel = f0; run.wood = false;
              wood = { need: Math.round(need), low, filled, after };
            }
            const ev = C.auto(st, 0);
            for (const e of ev) {
              if (e.t === 'waterTaken') { const r = R.tt.ttRunOf(st, 0); log.push({ t: 'water', i: r ? r.i : null, ph: r ? r.ph : null, at: C.hhmm(st) }); }
              if (e.t === 'ttDeparted' && e.i === 0) log.push({ t: 'dep', x: Math.round(maxX()), at: C.hhmm(st), late: e.late });
              if (e.t === 'ttArrived' && e.i === 2) log.push({ t: 'arr', late: e.late, at: C.hhmm(st) });
            }
          }
          out.inWater = { log, wood };
        }
        // 12. (D7) Platform work at Willow Ford on the timetable: at each visit the combine stands at the platform
        // for at least the dwell before it moves, the travellers for Willow Ford all step off there (none ride back),
        // those waiting in line board and pay on arrival at the hub, and after water at the spout beyond the platform
        // the train comes back to the platform and leaves from there, so travellers who came meanwhile board too.
        {
          const st = R.newState(1866), tr = st.trains[0], T = st.track, K = R.pax.paxStation('willow', T), slots = R.pax.paxQueueSlots(st, K);
          R.simTick(st, [{ t: 'ttAssign', tr: 0, on: true }]);
          // D20 (3): nobody gives up in the ticket line now, so a day of Willow Ford's own travellers (about 20) would
          // fill the combine's 12 seats ahead of this check's (boarding goes in id order). No new ones come there
          // here, so each visit's seats are for the travellers this check adds.
          st.pax.due.willow = 1e12;
          const comb = tr.consist.find(c => c.k === 'combine').id;
          const combAt = () => { const t = st.trains.find(o => o.consist.some(c => c.id === comb)), ps = R.trainPoses(T, t), p = ps[t.consist.findIndex(c => c.id === comb)]; return p.x.toFixed(3) + ',' + p.z.toFixed(3); };
          const atPlat = () => R.pax.paxCarsAt(st, K, { 0: R.trainPoses(T, tr) }).some(C => C.stock === comb);
          const add = (n, s, to) => { const ids = [], ev = []; for (let k = 0; k < n; k++) { const sl = slots[k % slots.length]; R.pax.paxAdd(st, s, s, to, sl[0] / 100, sl[1] / 100, ev); ids.push(st.pax.list[st.pax.list.length - 1].id); } return ids; };
          const visits = [];
          let v = null, back = 0, endAt = Infinity, wasAtPlat = false;
          for (let i = 0; i < 2 * 10800 && i < endAt; i++) {
            if (v && v.arr !== null && v.late === null && st.time >= v.arr + 25 * 60) v.late = add(2, 'willow', 'hub');
            if (v && v.arr !== null && v.moved === null && combAt() !== v.pos) v.moved = st.time - v.arr;
            wasAtPlat = atPlat();
            const ev = C.auto(st, 0);
            for (const e of ev) {
              if (e.t === 'ttDeparted' && e.i === 0) {
                // Six ticketed travellers for Willow Ford aboard the combine as it leaves the hub.
                for (const id of add(6, 'hub', 'willow')) { const p = st.pax.list.find(q => q.id === id); Object.assign(p, { s: 'aboard', car: comb, door: 0, fare: 40, path: [], tx: null, tz: null }); }
                v = { day: R.tt.ttRunOf(st, 0).day, svc: e.svc, forWF: st.pax.list.filter(p => p.s === 'aboard' && p.to === 'willow').map(p => p.id), arr: null, pos: null, moved: null, queue: [], late: null, ra: false, leftAtPlat: null, rodeOn: null, boarded: [], paid: [], off: [] };
                visits.push(v);
              }
              if (!v) continue;
              if (e.t === 'ttArrived' && e.i === 1) { v.arr = st.time; v.pos = combAt(); v.queue = add(4, 'willow', 'hub'); }
              if (e.t === 'ttRunAround') v.ra = true;
              if (e.t === 'paxAlighted' && e.st === 'willow' && v.forWF.includes(e.id)) v.off.push(e.id);
              if (e.t === 'paxBoarded' && e.st === 'willow') v.boarded.push(e.id);
              if (e.t === 'ttDeparted' && e.i === 1) { v.leftAtPlat = wasAtPlat; v.rodeOn = st.pax.list.filter(p => p.s === 'aboard' && p.to === 'willow').length; }
              if (e.t === 'farePaid' && e.st === 'hub' && e.from === 'willow') v.paid.push(e.id);
              if (e.t === 'ttArrived' && e.i === 2 && ++back === 3) endAt = i + 150;
            }
          }
          out.plat = visits.map(v => ({ svc: v.svc, day: v.day, ra: v.ra, moved: v.moved, forWF: v.forWF.length, off: v.off.length, rodeOn: v.rodeOn, leftAtPlat: v.leftAtPlat,
            queue: v.queue.length, queueBoarded: v.queue.filter(id => v.boarded.includes(id)).length, queuePaid: v.queue.filter(id => v.paid.includes(id)).length,
            late: v.late ? v.late.length : 0, lateBoarded: v.late ? v.late.filter(id => v.boarded.includes(id)).length : 0, money: R.econ.econCheckMoney(st).length }));
        }
        return out;
      });
      const u = r.uncouple;
      if (u.took < 30 || u.took > 40) problems.push(`uncoupling should take 0.5 game minutes, took ${u.took} s`);
      if (u.no1.join() !== '0,1' || u.cut.owner !== 'cut' || u.cut.cars.join() !== '2' || !u.ids) problems.push('uncoupling at the second joint should leave No. 1 with engine and combine and a cut with the boxcar: ' + JSON.stringify(u));
      if (!r.couple.ev || r.couple.no1.join() !== '0,1,2' || r.couple.cutLeft !== 0 || r.couple.n !== u.cut.id + 1) problems.push('backing into the cut should couple it: ' + JSON.stringify(r.couple));
      if (r.couple.ev && r.couple.status !== 'Coupling up') problems.push('a coupled train should stand "Coupling up" for 1 game minute, status ' + r.couple.status);
      if (r.cons1.length) problems.push('item conservation after coupling: ' + r.cons1.join('; '));
      if (!r.gap.gap || Math.abs(r.gap.gap - r.gapWant) > 0.02 || r.gap.v !== 0) problems.push(`a train should stop ${r.gapWant}u short of a standing engine: ` + JSON.stringify(r.gap));
      const f = r.fetch;
      if (f.left < 0 || !f.cars.length) problems.push('the Overland set out no cars in the real start: ' + JSON.stringify(f));
      else if (f.a < 0 || f.b < 0 || f.c < 0 || !f.carried || f.cutLeft !== 0 || f.itemsNow.join() !== f.items.join() || f.cons.length) problems.push('No. 1 should fetch the set-out cars from the interchange: ' + JSON.stringify(f));
      const dep0 = x => x.log.find(e => e.t === 'ttDeparted' && e.i === 1);
      if (!dep0(r.onTime) || dep0(r.onTime).late !== 0 || !r.onTime.log.some(e => e.t === 'ttDone')) problems.push('with the work done the service should leave Willow Ford on time: ' + JSON.stringify(r.onTime.log));
      if (dep0(r.notDone) || !/station work/.test(r.notDone.status)) problems.push('with goods for Willow Ford still aboard the service should wait: ' + JSON.stringify(r.notDone));
      if (!dep0(r.doneLate) || r.doneLate.items !== 0) problems.push('once the goods are unloaded the service should leave: ' + JSON.stringify(r.doneLate.log));
      const m = r.meet;
      if (!m.ok || m.shared || m.overlap) problems.push('two trains on the spur should meet at Willow Ford with no shared block or overlapping reservation: ' + JSON.stringify(m));
      if (m.ok && m.no1Track === m.mainEdge) problems.push('No. 1 should have taken Willow Ford\'s loop for the meet');
      if (!r.wood.setLow || !r.wood.waitedAt || !r.wood.fuelled || !r.wood.log.some(l => /ttDone/.test(l))) problems.push('a train low on wood should wait at its next stop and go once wood is carried to it: ' + JSON.stringify(r.wood));
      if (!r.wood2.waited || !r.wood2.departed || r.wood2.fuelled < 1 || r.wood2.cons.length || r.wood2.used !== r.wood2.fuelled) problems.push('low-wood departure check: ' + JSON.stringify(r.wood2));
      if (r.ra.waterTook === null || r.ra.waterTook < 120 || r.ra.waterTook > 128) problems.push('taking water should take 2 game minutes, took ' + r.ra.waterTook);
      if (!r.ra.raDone || r.ra.raDone.cons.join() !== 'combine,boxcar,loco' || r.ra.raDone.facing !== 1) problems.push('after the run-around the engine should be at the other end, facing the old way: ' + JSON.stringify(r.ra.raDone));
      if (!r.ra.dep || !r.ra.dep.tf) problems.push('after the run-around the train should leave tender first: ' + JSON.stringify(r.ra.dep));
      if (!(r.ra.vMaxTF > 2.0 / 2.4 * r.tfWant && r.ra.vMaxTF <= r.tfWant + 1e-9)) problems.push(`tender first the train should run at up to ${r.tfWant} u/min (60%), got ${r.ra.vMaxTF}`);
      if (!r.saveMid.sameAtLoad || !r.saveMid.same) problems.push('a save mid-run-around should load and resume exactly: ' + JSON.stringify(r.saveMid));
      if (!r.det.same) problems.push('2 game days with the timetable gave different hashes');
      if (r.det.cons) problems.push('item conservation failed over 2 game days with the timetable');
      if (r.det.log.filter(l => /ttDone/.test(l)).length < 3) problems.push('over 2 game days the Willow Ford services should run: ' + r.det.log.join(' | '));
      {
        const L = r.inWater.log, w = r.inWater.wood;
        const inW = L.filter(x => x.t === 'water' && x.i === 2 && x.ph === 'go'), deps = L.filter(x => x.t === 'dep'), arrs = L.filter(x => x.t === 'arr');
        if (inW.length < 3) problems.push('the run back to the hub should take water on the way in (under the spout, before the platform): ' + JSON.stringify(L));
        if (deps.length < 3 || deps.some(d => d.x > 19 * r.scale || d.late > 0)) problems.push('after water on the way in the hub departures should leave from the platform, on time: ' + JSON.stringify(deps));
        if (arrs.some(a => a.late > 10 * 60)) problems.push('water on the way in should not make the run back late: ' + JSON.stringify(arrs));
        if (!w || !w.low || w.filled || w.after) problems.push('the hub\'s wood need: wanted when low, met when filled, and still met after burning a little: ' + JSON.stringify(w));
        console.log(`  water on the way in: ${L.map(x => x.t + (x.i !== undefined && x.i !== null ? ' ' + x.i + x.ph : '') + (x.x !== undefined ? ' x ' + x.x : '') + (x.late ? ' late ' + Math.round(x.late / 60) : '') + ' ' + x.at).join(', ')}; wood need ${JSON.stringify(w)}`);
      }
      {
        const V = r.plat, dwell = 300;
        if (V.length < 3 || !V.some(v => !v.ra)) problems.push('platform work: expected 3 visits to Willow Ford, one at least without a run-around: ' + JSON.stringify(V));
        for (const v of V) {
          const tag = `Willow Ford visit (day ${v.day + 1}, service ${v.svc}${v.ra ? ', run-around' : ''})`;
          if (v.moved === null || v.moved < dwell) problems.push(`${tag}: the combine should stand at the platform at least ${dwell / 60} game minutes before it moves, moved after ${v.moved} s`);
          if (v.off !== v.forWF || v.rodeOn !== 0) problems.push(`${tag}: every traveller for Willow Ford should step off there (${v.off} of ${v.forWF}; ${v.rodeOn} still aboard as it left)`);
          if (v.queueBoarded !== v.queue || v.queuePaid !== v.queue) problems.push(`${tag}: the ${v.queue} waiting in line should board and pay on arrival at the hub (${v.queueBoarded} boarded, ${v.queuePaid} paid)`);
          if (!v.ra && (!v.leftAtPlat || v.lateBoarded !== v.late)) problems.push(`${tag}: after water at the spout the train should leave from the platform, taking those who came meanwhile (left at the platform ${v.leftAtPlat}, ${v.lateBoarded} of ${v.late} boarded)`);
          if (v.money) problems.push(`${tag}: the money check failed`);
        }
        console.log(`  platform work at Willow Ford: ${V.map(v => `day ${v.day + 1} svc ${v.svc}${v.ra ? ' (run-around)' : ''}: stood ${Math.round(v.moved / 60)} min before moving, ${v.off}/${v.forWF} off, ${v.rodeOn} rode on, line ${v.queueBoarded}/${v.queue} boarded ${v.queuePaid} paid at the hub, later ${v.lateBoarded}/${v.late}, left at the platform ${v.leftAtPlat}`).join('; ')}`);
      }
      console.log(`  coupling: uncouple ${u.took} s, coupled ${JSON.stringify(r.couple.ev)}; stop short of an engine at ${r.gap.gap && r.gap.gap.toFixed(3)}u`);
      console.log(`  fetch from the interchange: cars ${f.cars.join(',')} (items ${f.items.join(',')}) now in No. 1 at x ${f.xs.join(',')}`);
      console.log(`  on time: ${r.onTime.log.map(e => e.t.slice(2) + '@' + e.at + (e.late ? '+' + e.late : '')).join(' ')}; work not done: "${r.notDone.status}"; unloaded: ${r.doneLate.log.map(e => e.t.slice(2) + '@' + e.at).join(' ')}`);
      console.log(`  meet: ${m.ev.map(e => e.t.slice(2) + ' ' + e.tr + ' ' + e.st + ' ' + e.at).join(' | ')}`);
      console.log(`  low on wood: waited at ${r.wood2.waited}, ${r.wood2.fuelled} cord(s) carried, left ${r.wood2.departed}; mid-run: ${r.wood.log.join(' | ')}`);
      console.log(`  run-around: water ${r.ra.waterTook} s, coupled ${JSON.stringify(r.ra.raDone)}, tender first top speed ${r.ra.vMaxTF.toFixed(2)} (forward ${r.ra.vMaxFwd.toFixed(2)})`);
      console.log(`  2 game days (real start): ${r.det.log.join(' | ')}; hash ${r.det.h}`);
      if (errors.length) problems.push('console errors (sim part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  // ---- Part 2: real touch in the test yard scenario ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const settle = () => page.waitForTimeout(150);
    const SC = await page.evaluate(() => window.__railhead.CFG.SCALE);
    const stepUntil = (cond, max) => R(([c, m]) => { const f = new Function('R', 'return ' + c); const R = window.__railhead; for (let i = 0; i < m; i++) { if (f(R)) return i; R.step(1); } return f(R) ? m : -1; }, [cond, max]);
    try {
      await useSwitchman(page);
      await R(() => { window.rh.scenario('timetable'); for (const o of ['blocks', 'locks', 'routes', 'path']) window.rh.overlay(o, false); window.__railhead.camera.zoom = 2; });
      await R(() => { const R = window.__railhead; for (const s of R.state.tt.services) s.train = null; }); // off the timetable for the touch tests
      await page.waitForTimeout(900);
      // The order board card: the player stands by the hub's board.
      const card = await R(() => ({ shown: !document.getElementById('ttCard').hidden && document.getElementById('ttCard').style.visibility !== 'hidden', text: document.getElementById('ttCard').textContent }));
      if (!card.shown || !/train orders/.test(card.text)) problems.push('the hub\'s order board card should show near its board: ' + JSON.stringify(card));
      await page.screenshot({ path: screenshotPath('timetable-board-portrait') });
      const dcBoard = await R(() => window.__railhead.drawCalls);
      // Tap the gap between the combine and the boxcar (the player stands beside it, so it is on screen).
      const tele = async (x, z) => { await R(([x, z]) => { const P = window.__railhead.state.player; P.x = x; P.z = z; P.mode = 'idle'; }, [x, z]); await page.waitForTimeout(900); };
      const j2 = await R(() => { const R = window.__railhead, j = R.tt.ttJointAt(R.state, R.state.trains[0], 2); return j; });
      await tele(j2.x, j2.z + 1.6 * SC);
      const jp = await R(() => { const R = window.__railhead, j = R.tt.ttJointAt(R.state, R.state.trains[0], 2); return R.toScreen(j.x, j.z, 0.7 * R.CFG.SCALE); });
      await page.touchscreen.tap(jp.x, jp.y); await settle();
      const n1 = await stepUntil("R.state.trains[0].consist.length === 2", 300);
      if (n1 < 0) problems.push('a tap on the gap between two vehicles did not uncouple there');
      // Open the panel (tap the engine) and press Back: No. 1 backs into the boxcar and couples.
      const l0 = await R(() => { const R = window.__railhead, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; return p; });
      await tele(l0.x, l0.z + 1.8 * SC);
      const lp = await R(() => { const R = window.__railhead, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; return R.toScreen(p.x, p.z, 1.1 * R.CFG.SCALE); });
      await page.touchscreen.tap(lp.x, lp.y); await settle();
      await stepUntil("!document.getElementById('panel').hidden", 300);
      if (await page.isHidden('#panel')) problems.push('a tap on the engine did not open its panel');
      else {
        const bb = await page.$eval('#actBack', b => { const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: r.height }; });
        await page.touchscreen.tap(bb.x, bb.y); await settle();
        const n2 = await stepUntil("R.state.trains[0].consist.length === 3", 400);
        if (n2 < 0) problems.push('Back into the cut did not couple it');
        else if (!(await R(() => window.__railhead.state.trains[0].cw > 0))) problems.push('after coupling No. 1 should stand "Coupling up" for a game minute');
        await R(() => window.__railhead.step(10)); // coupled up
        await page.tap('#panelClose'); await settle();
      }
      // A cord of wood by tap, then a tap on the engine puts it on the tender.
      await R(() => { const R = window.__railhead; R.state.trains[0].consist[0].fuel = 200; });
      await tele(9 * SC, -10.8 * SC);
      const wp = await R(() => { const R = window.__railhead, S = R.state; let id = -1; for (let i = 0; i < S.items.next; i++) if (S.items.alive[i] && S.items.waybill[i].commodity === 'cordwood') { id = i; break; } const p = R.cargo.view.poses && R.cargo.view.poses[id]; return { id, ...R.toScreen(p ? p.x : S.items.where[id].x / 100, p ? p.z : S.items.where[id].z / 100, 0.15) }; });
      await page.touchscreen.tap(wp.x, wp.y); await settle();
      const picked = await stepUntil(`R.carry.carryHeld(R.state).includes(${wp.id})`, 400);
      if (picked < 0) problems.push('a tap on a cord of wood did not pick it up');
      await tele(12 * SC, -12.2 * SC);
      const ep = await R(() => { const R = window.__railhead, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; return R.toScreen(p.x, p.z, 1.1 * R.CFG.SCALE); });
      await page.touchscreen.tap(ep.x, ep.y); await settle();
      const fu = await stepUntil('R.state.trains[0].consist[0].fuel > 300', 400);
      if (fu < 0) problems.push('a tap on the engine while carrying wood did not put it on the tender: ' + JSON.stringify(await R(() => { const R = window.__railhead, S = R.state; return { toast: document.getElementById('toast').textContent, use: S.player.use, act: S.player.act, held: R.carry.carryHeld(S), tr: S.trains[0].status, mode: S.trains[0].mode, v: S.trains[0].v, fuel: S.trains[0].consist[0].fuel, cons: S.trains[0].consist.map(c => c.k) }; })));
      // The Timetable button in No. 1's panel.
      await stepUntil('R.state.player.mode === "idle" && !R.state.player.act', 100);
      const ep2 = await R(() => { const R = window.__railhead, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; return R.toScreen(p.x, p.z, 1.1 * R.CFG.SCALE); });
      await page.touchscreen.tap(ep2.x, ep2.y); await settle();
      await stepUntil("!document.getElementById('panel').hidden", 300);
      if (await page.isHidden('#panel')) problems.push('a tap on the engine did not open its panel (second time)');
      else {
          const tb = await page.$eval('#ttToggle', b => { const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: r.height, w: r.width, t: b.textContent }; });
          if (tb.h < 48 || tb.w < 48) problems.push('the Timetable button is smaller than 48 px');
          await page.touchscreen.tap(tb.x, tb.y); await settle();
          const on = await R(() => window.__railhead.state.tt.services.every(s => s.train === 0));
          if (!on) problems.push('the Timetable button did not put No. 1 on the timetable');
        await page.tap('#panelClose'); await settle();
      }
      // Run the service to the run-around at Willow Ford for a screenshot.
      await R(() => { const R = window.__railhead; R.state.time = 3 * 3600 - 1800 + 25 * 60; R.state.trains[0].consist[0].fuel = R.tt.FUEL_CAP; }); // a full tender: the hub stop's wood is done
      const ra = await stepUntil("(() => { const r = R.tt.ttRunOf(R.state, 0); if (r && /uncouple/.test(R.state.trains[0].status)) { const j = R.tt.ttJointAt(R.state, R.state.trains[0], R.tt.ttEngineJoint(R.state.trains[0])); R.state.player.x = j.x + j.fz * R.tt.TT.BESIDE; R.state.player.z = j.z - j.fx * R.tt.TT.BESIDE; if (R.state.player.mode === 'idle' && !R.state.player.act) R.send({ t: 'uncouple', tr: 0, at: R.tt.ttEngineJoint(R.state.trains[0]) }); } return r && r.ra && r.ra.step >= 2 && R.state.trains[0].v > 0; })()", 3000);
      if (ra < 0) problems.push('the service did not reach the run-around in the page');
      await R(() => { const R = window.__railhead, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; R.state.player.x = p.x; R.state.player.z = p.z - 2.5 * R.CFG.SCALE; R.state.player.mode = 'idle'; });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: screenshotPath('timetable-runaround-portrait') });
      const dcRa = await R(() => window.__railhead.drawCalls);
      if (dcBoard >= 100 || dcRa >= 100) problems.push(`draw calls should stay under 100 (board ${dcBoard}, run-around ${dcRa})`);
      console.log(`  touch: uncoupled by a tap on the joint, coupled by Back, Timetable on, a cord carried to the tender; draw calls board ${dcBoard}, run-around ${dcRa} (portrait)`);
      if (errors.length) problems.push('console errors (touch part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  // ---- Part 3: a real save mid-service in the real start, reloaded; landscape screenshot ----
  {
    const { browser, page, errors } = await openGame('landscape', { query: '?paused' });
    try {
      await useSwitchman(page);
      await page.evaluate(HELPERS);
      await page.evaluate(() => { const R = window.__railhead; R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1); for (let i = 0; i < 3 * 3600 / 8 + 500; i++) R.step(1); R.camera.zoom = 1.3; });
      const before = await page.evaluate(async () => { const R = window.__railhead; await R.saveGame(); const r = R.tt.ttRunOf(R.state, 0); return { h: R.hash(), tick: R.state.tick, run: r && { i: r.i, ph: r.ph } }; });
      await page.reload(); await waitReady(page);
      const after = await page.evaluate(() => ({ h: window.__railhead.hash(), tick: window.__railhead.state.tick }));
      if (!before.run) problems.push('the reload test was not mid-service');
      if (after.h !== before.h) problems.push(`a real reload mid-service gave a different state (${before.h} at tick ${before.tick}, ${after.h} at tick ${after.tick})`);
      const fut = await page.evaluate(() => { const R = window.__railhead, copy = JSON.parse(JSON.stringify(R.state)); R.step(300); R.simRun(copy, [], 300); return [R.hash(), R.hash(copy)]; });
      if (fut[0] !== fut[1]) problems.push('after the reload the service did not go on the same way');
      await page.evaluate(() => { const R = window.__railhead, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; if (p) { R.state.player.x = p.x - 2 * R.CFG.SCALE; R.state.player.z = p.z - 3 * R.CFG.SCALE; R.state.player.mode = 'idle'; } });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: screenshotPath('timetable-landscape') });
      const dc = await page.evaluate(() => window.__railhead.drawCalls);
      if (dc >= 100) problems.push('draw calls in landscape ' + dc);
      console.log(`  real reload mid-service (stop ${before.run && before.run.i}, ${before.run && before.run.ph}): hash ${after.h}; landscape draw calls ${dc}`);
      if (errors.length) problems.push('console errors (reload part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
