// Check: freight handling (D27, builder F; plans/d27-tech.md section 4, section "freight handling (D27)" of index.html).
// Played through the touch-level commands (frDoor, frTake, frPut, frCart, walkTo, rrWaveOff, pdStart) with D27
// handling on (?d27=handling); a switchman sets the switches (they are T's):
// - every one of the 16 kinds of goods taken from a storage cell, set on the platform cart and back, each step by its
//   verb (carry, shoulder, roll, drag, truck, heave) and timed as FR.PICK_S says (to the tick); the hand truck fetched
//   for a truck good; the agent's pose (frPose) and the good's drawn place (frDrawList) follow the step's progress
//   (D29: a one-tick step, FR.MIN_S, has no middle in the sim, only in the drawing between ticks: it is sampled at its
//   start; and a step can start in the command's own tick, which is watched too);
// - stacking: crates four high in one storage cell, the fifth in the next; a sack refused on a crate stack, a crate on a
//   barrel, a barrel on a crate (the cart), a good under another; lifting off the fourth layer takes stackHigh's extra;
// - the boxcar door: shut at first (a take refused), FR.DOOR_S to slide open, frDoorOpen rising to 1; walking into the car
//   (frInCar, the player's y at the floor), out again; a walk given inside a car goes out through the door first;
//   Monday's f1 brings the plough on a flatcar at the back; no good in the doorway's aisle;
// - a whole day of the freight trains (f1, f2, f3) worked by a player who follows frJobHint: each unloaded, loaded and
//   sent off (frReady false while goods for the town are aboard), the summary's figures as the tables say, itemAudit
//   every game hour, no refusal, the same hash when the day is played twice, a save made mid-step reloading to the
//   same hash;
// - the page runs with handling on and no console errors.

const { openGame } = require('./browser');

module.exports = async function checkHandling() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d27=handling&goods27=full' });   // (D27 integration: the foundation's full table of goods, whose numbers this check counts; the game now has half: SHOP_GOODS27_HALF)
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, X = R.fr, D = R.d27, out = { bad: [], info: {} }, B = m => { if (out.bad.length < 60) out.bad.push(m); };
      const hm = S => { const s = (S.time + R.CFG.DAY_START_S) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
      if (!D.d27On(R.state.track, 'handling')) { B('?d27=handling did not turn handling on'); return out; }
      // A player that sends one command and ticks until it is done. Returns the events.
      function player(S) {
        const P = S.player, evs = [];
        const switchman = () => {
          const occ = R.occupiedSwitches(S);
          for (const tr of S.trains) if (tr.owner === 'rr' && tr.swWait !== undefined && tr.swWait !== null && tr.v === 0 && occ[tr.swWait] === undefined) { const W = S.track.switches[tr.swWait]; W.state = W.state === 'N' ? 'R' : 'N'; }
        };
        const tick = cmds => { switchman(); const e = R.simTick(S, cmds || []); for (const x of e) { x.time = S.time; evs.push(x); } return e; };
        const idle = () => !(S.fr && S.fr.job) && P.mode === 'idle' && !P.act && !P.use;
        const send = (cmd, each) => { const from = evs.length; tick([cmd]); if (each) each(); for (let n = 0; n < 4000 && !idle(); n++) { tick(); if (each) each(); } return evs.slice(from); };
        return { tick, send, evs, idle };
      }
      const refusals = e => e.filter(x => /Refused$/.test(x.t) || x.t === 'blocked');
      const wbFor = (c, shop) => shop ? { commodity: c, originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'BUSINESS', id: shop }, contractId: null, due: null }
        : { commodity: c, originTownId: 0, destTownId: 'OUTSIDE', consignee: { kind: 'OUTSIDE', id: 'out' }, contractId: null, due: null };

      // ---- 1. Every kind by its verb: storage > cart > storage ----
      {
        const S = R.newState(1866, 'proto'), P = S.player, pl = player(S);
        pl.tick([{ t: 'pdStart' }]);
        Object.assign(P, { x: -2, z: 12.4 });
        const verbs = {}, timing = [];
        for (const kind of Object.keys(D.GOODS27)) {
          const G = D.GOODS27[kind], c = G.commodities[0], w = X.frStoreSpot(S, null, kind, 'STORE');
          const made = R.cargo.itemCreate(S, wbFor(c, 'store'), w, null);
          if (!made.ok) { B(`${kind}: could not be made in storage (${made.why})`); continue; }
          const id = made.id, want = G.verb;
          // One step: the act's start (frStep), its end (frTaken / frPut), the pose and the drawn good half way.
          const step = (cmd, endT, where) => {
            let mid = null, a0 = null;
            const e = pl.send(cmd, () => {
              const J = S.fr.job, st = J && J.steps[J.i];
              if (st && st.s === 'act' && (st.a === 'pick' || st.a === 'put') && st.id === id && J.t0 >= 0 && !mid && (S.time - J.t0 >= st.dur / 2 || st.dur <= 8)) {   // (D29: a one-tick step is between ticks only in the drawing: sampled at its start)
                const pose = X.frPose(S), q = X.frDrawList(S).find(o => o.id === id);
                mid = { key: pose && pose.key, phase: pose && pose.phase, prog: pose && pose.prog, place: q && q.place, verb: st.verb, dur: st.dur };
              }
            });
            const start = e.find(x => x.t === 'frStep' && x.id === id && (x.a === 'pick' || x.a === 'put')), end = e.find(x => x.t === endT && x.id === id);
            for (const x of refusals(e)) B(`${kind}: ${JSON.stringify(cmd)}: ${x.t} ${x.why || ''}`);
            if (!start || !end) { B(`${kind}: ${cmd.t} did not ${endT === 'frTaken' ? 'take' : 'put'} it (${start ? 'started' : 'never started'})`); return null; }
            const took = end.time - start.time;   // whole ticks of 8 game seconds
            if (took !== Math.ceil(start.dur / 8) * 8) B(`${kind}: ${cmd.t} took ${took} s, its step is ${start.dur} s`);
            if (!mid || mid.place !== 'moving' || !(mid.dur <= 8 ? mid.prog >= 0 && mid.prog < 0.8 : mid.prog > 0.3 && mid.prog < 0.8)) B(`${kind}: half way through ${cmd.t} the good was drawn ${mid && mid.place} at ${mid && mid.prog}`);
            const wNow = S.items.where[id];
            if (!wNow || wNow.kind !== where) B(`${kind}: after ${cmd.t} it is at ${wNow && wNow.kind}, expected ${where}`);
            timing.push(`${kind} ${cmd.t} ${took}s ${mid && mid.key}`);
            return mid;
          };
          const m1 = step({ t: 'frTake', item: id }, 'frTaken', want === 'truck' ? 'TRUCK' : 'HAND');
          if (m1) { verbs[kind] = m1.verb; if (m1.verb !== want) B(`${kind}: taken by ${m1.verb}, GOODS27 says ${want}`); }
          if (want === 'truck' && (P.tool === null || P.tool === undefined || S.tools[P.tool].k !== 'truck')) B(`${kind}: taken without the hand truck`);
          const pose = X.frPose(S);
          if (!pose || pose.phase !== 'hold' || pose.verb !== (want === 'truck' ? 'truck' : want)) B(`${kind}: held with the pose ${JSON.stringify(pose)}`);
          step({ t: 'frPut', to: { kind: 'CART' } }, 'frPut', 'CART');
          step({ t: 'frTake', item: id }, 'frTaken', want === 'truck' ? 'TRUCK' : 'HAND');
          step({ t: 'frPut', to: { kind: 'CELL' } }, 'frPut', 'CELL');
          const audit = D.itemAudit(S);
          if (audit.length) B(`${kind}: audit: ${audit.slice(0, 2).join('; ')}`);
        }
        out.info.verbs = verbs;
        out.info.timing = timing.length;
      }
      // ---- 2. Stacking ----
      {
        const S = R.newState(1866, 'proto'), P = S.player, pl = player(S);
        pl.tick([{ t: 'pdStart' }]);
        Object.assign(P, { x: -2, z: 12.4 });
        const crates = [];
        for (let k = 0; k < 5; k++) { const w = X.frStoreSpot(S, null, 'crate', 'HOTEL'), m = R.cargo.itemCreate(S, wbFor('linen', 'hotel'), w, null); crates.push({ id: m.id, w: m.ok ? w : null }); }
        const L = crates.map(q => q.w && q.w.layer), C = crates.map(q => q.w && q.w.c + ',' + q.w.r);
        if (JSON.stringify(L) !== '[0,1,2,3,0]' || C[0] !== C[3] || C[4] === C[0]) B(`five crates stacked as layers ${JSON.stringify(L)} in cells ${JSON.stringify(C)} (expected four high, then the next cell)`);
        const sack = R.cargo.itemCreate(S, wbFor('flour', 'hotel'), X.frStoreSpot(S, null, 'sack', 'HOTEL'), null).id;
        let e = pl.send({ t: 'frTake', item: sack });
        const w0 = crates[0].w;
        e = pl.send({ t: 'frPut', to: { kind: 'CELL', block: w0.block, c: w0.c, r: w0.r } });
        if (!e.some(x => x.t === 'frRefused' && /one kind|high/.test(x.why))) B(`a sack put on a crate stack was not refused (${refusals(e).map(x => x.why)})`);
        pl.send({ t: 'frPut', to: { kind: 'CELL' } });
        e = pl.send({ t: 'frTake', item: crates[1].id });
        if (!e.some(x => x.t === 'frRefused' && /stacked on it/.test(x.why))) B('a crate under another was taken');
        e = pl.send({ t: 'frTake', item: crates[3].id });
        const high = e.find(x => x.t === 'frStep' && x.id === crates[3].id);
        if (!high || high.dur !== X.FR.PICK_S.carry + X.FR.HIGH_S) B(`lifting a crate off the fourth layer: a ${high && high.dur} s step (carry ${X.FR.PICK_S.carry} + stackHigh ${X.FR.HIGH_S}; the times are F's scaled by FR.TIME_K)`);
        pl.send({ t: 'frPut', to: { kind: 'CART', cell: 0 } });
        const barrel = R.cargo.itemCreate(S, wbFor('whiskey', 'saloon'), X.frStoreSpot(S, null, 'barrel', 'SALOON'), null).id;
        pl.send({ t: 'frTake', item: barrel });
        e = pl.send({ t: 'frPut', to: { kind: 'CART', cell: 0, layer: 1 } });
        // D31 (FR.CART_MIX): on the small cart a good sits on whatever is under it, so a barrel may stand on a crate
        // (in storage a stack is still one kind); nothing goes on the barrel (next).
        if (refusals(e).length || S.items.where[barrel].kind !== 'CART' || S.items.where[barrel].layer !== 1) B('a barrel was not stacked on a crate on the cart');
        pl.send({ t: 'frTake', item: barrel });
        pl.send({ t: 'frPut', to: { kind: 'CART', cell: 2 } });
        pl.send({ t: 'frTake', item: crates[2].id });
        e = pl.send({ t: 'frPut', to: { kind: 'CART', cell: 2, layer: 1 } });
        if (!e.some(x => x.t === 'frRefused' && /top of that/.test(x.why))) B(`a crate was stacked on a barrel on the cart (${refusals(e).map(x => x.why)})`);
        e = pl.send({ t: 'frPut', to: { kind: 'CART', cell: 0, layer: 1 } });
        if (refusals(e).length || S.items.where[crates[2].id].layer !== 1) B('a crate was not stacked on a crate on the cart');
        const audit = D.itemAudit(S);
        if (audit.length) B('stacking: audit: ' + audit.slice(0, 3).join('; '));
      }

      // ---- 3. The door, the car, the flatcar, a walk from inside a car ----
      {
        const S = X.frDebugScenario(R.rr.protoDebugScenario(R.newState(1866, 'proto'), 8, 30, ['f1']), 'd27freight'), P = S.player, pl = player(S);
        const run = S.rr.runs.find(q => q.svc === 'f1' && q.day === 0), tr = S.trains[run.slot], cars = tr.consist.slice(1);
        if (cars.map(c => c.k).join() !== 'boxcar,boxcar,boxcar,flatcar') B(`Monday's f1: ${cars.map(c => c.k).join()} (expected three boxcars and a flatcar for the plough)`);
        // (D27 integration: the goods the shop collects itself, FR.COLLECT (the plough), are not counted as the player's to unload)
        const coll = id => X.FR.COLLECT.includes(R.cargo.itemType(S, id)), all = [].concat(...cars.map(c => R.cargo.itemsAt(S, { kind: 'CAR', stockId: c.id })));
        const want = X.frRunIn(S, run).length, ab = X.frAboard(S, tr);
        if (ab.town + all.filter(coll).length !== want || want !== 7) B(`Monday's f1 brings ${ab.town} goods and ${all.filter(coll).length} collected, the tables say ${want} (7)`);
        for (const id of all) {
          const w = S.items.where[id], cr = X.frCR(w), [fx] = X.frFp(R.cargo.itemType(S, id), 'car');
          if (cr.c + fx > 4 && cr.c <= 6) B(`good ${id} stands in the doorway's aisle (cell ${w.cell})`);
          if (R.cargo.itemType(S, id) === 'plough' && cars.find(c => c.id === w.stockId).k !== 'flatcar') B('the plough is not on the flatcar');
        }
        if (R.rr.cgReady(S, run)) B('f1 is ready with its goods aboard');
        // (D27 integration: the town's goods are packed into the boxcar nearest the storage first, so the first boxcar with goods)
        const car = cars.find(c => c.k === 'boxcar' && X.frAboard(S, { consist: [c] }).ids.length), id = X.frAboard(S, { consist: [car] }).ids.find(q => X.frOnTop(S, q));
        let e = pl.send({ t: 'frTake', item: id });
        if (!e.some(x => x.t === 'frRefused' && /door/.test(x.why))) B('a good was taken through a shut door');
        const fr = [];
        e = pl.send({ t: 'frDoor', stock: car.id }, () => fr.push(X.frDoorOpen(S, car.id)));
        const st = e.find(x => x.t === 'frStep' && x.a === 'door'), done = e.find(x => x.t === 'frDoor');
        if (!st || st.dur !== X.FR.DOOR_S || !done || !done.open || done.time - st.time !== X.FR.DOOR_S) B(`the door: a ${st && st.dur} s step, done ${done && done.time - st.time} s after it started`);
        if (fr.some((v, i) => i && v < fr[i - 1]) || X.frDoorOpen(S, car.id) !== 1) B(`the door slid ${JSON.stringify(fr.map(v => +v.toFixed(2)))}`);
        let inside = null;
        e = pl.send({ t: 'frTake', item: id }, () => { if (X.frInCar(S) === car.id && inside === null) inside = { y: P.y, pose: X.frPose(S) }; });
        if (!inside || inside.y !== 1.6) B(`the player was not in the car on its floor (${JSON.stringify(inside)})`);
        if (X.frInCar(S) !== car.id || refusals(e).length) B(`after taking a good the player is in car ${X.frInCar(S)} (${refusals(e).map(x => x.why)})`);
        // A walk given in the car: out through the door, then on to where he was sent.
        const tx = 0, tz = 12.4;
        e = pl.send({ t: 'walkTo', x: tx * 100, z: tz * 100 });
        if (X.frInCar(S) !== null || P.y !== undefined || Math.hypot(P.x - tx, P.z - tz) > 0.3) B(`a walk from inside the car ended at (${P.x.toFixed(1)}, ${P.z.toFixed(1)}), in car ${X.frInCar(S)}, y ${P.y}`);
        if (S.items.where[id].kind !== 'HAND') B('the good was dropped on the way out');
        e = pl.send({ t: 'frPut', to: { kind: 'CELL' } });
        if (S.items.where[id].kind !== 'CELL' || refusals(e).length) B(`stacking the good: ${refusals(e).map(x => x.why)}`);
        const audit = D.itemAudit(S);
        if (audit.length) B('the car: audit: ' + audit.slice(0, 3).join('; '));
      }

      // ---- 4. A whole day of the freight trains, played by following frJobHint ----
      function playDay(saveAt) {
        const S = R.newState(1866, 'proto'), P = S.player, pl = player(S), log = { waved: [], ready0: {}, hours: 0, audit: [], refused: [], hints: 0, mid: null };
        pl.tick([{ t: 'pdStart' }]);
        S.rr.runs = S.rr.runs.filter(q => q.day !== 0 || (q.kind === 'freight' && !q.through));
        const auditHour = () => {
          if (saveAt && !log.mid && S.fr.job && S.fr.job.steps[S.fr.job.i] && S.fr.job.steps[S.fr.job.i].s === 'act' && S.fr.job.t0 >= 0 && S.time > saveAt) log.mid = JSON.stringify({ state: S });
          for (const x of pl.evs.splice(0)) { if (x.t === 'hour') { log.hours++; const a = D.itemAudit(S); if (a.length && log.audit.length < 5) log.audit.push(hm(S) + ' ' + a[0]); }
          if (/Refused$/.test(x.t) && log.refused.length < 8) log.refused.push(hm(S) + ' ' + x.t + ' ' + x.why);
          if (x.t === 'rrArrived') { const run = S.rr.runs.find(q => q.id === x.run); log.ready0[run.svc] = R.rr.cgReady(S, run); if (run.kind === 'freight') log.tIn = (log.tIn || 0) + X.frRunIn(S, run).length; }
          if (x.t === 'frDelivered' && x.collected) log.coll = (log.coll || 0) + 1; } };
        for (let guard = 0; guard < 30000 && S.pd.ph !== 'summary'; guard++) {
          auditHour();
          const ready = S.rr.runs.find(q => q.ph === 'stand' && q.ready);
          if (ready) {
            const tr = S.trains[ready.slot], sp = R.rr.rrWaveSpot(S, tr.id);
            pl.send({ t: 'walkTo', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) });
            pl.tick([{ t: 'rrWaveOff', tr: tr.id }]);
            log.waved.push(ready.svc + ' ' + hm(S));
            continue;
          }
          const h = X.frJobHint(S);
          if (h && h.cmd) { log.hints++; pl.send(h.cmd, auditHour); continue; }
          if (S.pd.ph === 'evening') { pl.tick([{ t: 'pdEndDay' }]); continue; }
          pl.tick();
        }
        auditHour();
        return { S, log, hash: R.stateHash(S) };
      }
      const a = playDay(R.CFG.DAY_START_S ? 9 * 3600 - R.CFG.DAY_START_S : 0), b = playDay(0), L = a.log, S = a.S;
      if (a.hash !== b.hash) B(`the same day played twice gave different hashes ${a.hash} and ${b.hash}`);
      if (L.waved.length !== 3) B(`freight trains sent off: ${L.waved.join(', ')} (expected f1, f2 and f3)`);
      for (const svc of ['f1', 'f2', 'f3']) if (L.ready0[svc] !== false) B(`${svc} was ready as it came in (${L.ready0[svc]})`);
      // (D27 integration: counted as the trains came in (the runs are gone once the day ends after midnight); the plough is
      // collected by its shop (FR.COLLECT), not unloaded by the player)
      const sum = S.pd.sum || {}, tIn = L.tIn || 0, coll = L.coll || 0;
      if (sum.unloaded + coll !== tIn || tIn !== 15) B(`the summary says ${sum.unloaded} unloaded and ${coll} collected by their shop; the tables bring ${tIn} on Monday (15)`);
      if (sum.loaded !== 6) B(`the summary says ${sum.loaded} loaded (expected 6: f2 4, f3 2)`);
      if (L.hours < 15) B(`only ${L.hours} game hours were audited`);
      for (const m of L.audit) B('the day: audit: ' + m);
      for (const m of L.refused) B('the day: refused: ' + m);
      // (D27 integration: a trip to town between trains may hand goods in from the cart, unstored: stored or delivered)
      if (S.fr.tot.unloaded + (L.coll || 0) !== 15 || S.fr.tot.stored + S.fr.tot.delivered < 15) B(`totals ${JSON.stringify(S.fr.tot)}`);
      out.info.day = { waved: L.waved, hints: L.hints, sum: { unloaded: sum.unloaded, loaded: sum.loaded, delivered: sum.delivered }, tot: S.fr.tot, hash: a.hash };
      // A save made in the middle of a step reloads and plays on to the same state.
      if (!L.mid) B('no save was made mid-step');
      else {
        const s1 = R.migrate(JSON.parse(L.mid)).state, s2 = R.migrate(JSON.parse(L.mid)).state;
        const j = s1.fr.job;
        out.info.mid = { k: j && j.k, step: j && j.steps[j.i] && j.steps[j.i].a, inCar: s1.fr.inCar };
        for (let k = 0; k < 40; k++) { R.simTick(s1, []); R.simTick(s2, []); }
        if (R.stateHash(s1) !== R.stateHash(s2)) B('a save made mid-step plays on to different states');
        if (!j || !j.steps.length) B('the mid-step save holds no job');
        const a2 = D.itemAudit(s1);
        if (a2.length) B('after the mid-step save: audit: ' + a2[0]);
      }
      return out;
    });
    problems.push(...r.bad);
    console.log(`  verbs: ${JSON.stringify(r.info.verbs)} (${r.info.timing} timed steps)`);
    if (r.info.day) console.log(`  a freight day by the hints: sent off ${r.info.day.waved.join(', ')}; ${r.info.day.hints} commands; summary ${JSON.stringify(r.info.day.sum)}; totals ${JSON.stringify(r.info.day.tot)}; hash ${r.info.day.hash}`);
    if (r.info.mid) console.log(`  saved mid-step: ${JSON.stringify(r.info.mid)}`);
    // ---- 5. The page itself, with handling on ----
    const p = await page.evaluate(() => {
      const R = window.__railhead, X = R.fr;
      R.step(400);
      const S = R.state, list = X.frDrawList(S);
      return { n: list.length, places: [...new Set(list.map(q => q.place))], audit: R.d27.itemAudit(S), cart: X.frCartPose(S), truck: X.frTruckPose(S), hint: X.frJobHint(S) };
    });
    if (p.n !== 6 || p.places.join() !== 'cell') problems.push(`the page's goods at dawn: ${p.n} drawn at ${p.places} (expected 6 in the storage cells)`);
    if (!p.cart || !p.truck) problems.push('the page draws no cart or no hand truck');
    if (p.audit.length) problems.push('the page: audit: ' + p.audit[0]);
    if (errors.length) problems.push('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
