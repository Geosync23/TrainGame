// Check: the freight trains' goods (D24, builder CG; plans/rework-tech.md section 4).
// - Booking: in the hub world an order rides the first freight train due at least 3 game hours later (05:00 -> f1 at
//   08:00; 07:00 -> f2 at 12:30); an order that does not fit its train goes on the next one with room; the real start
//   still books on the Overland's 06:00 and 18:00.
// - Making up (rh.scenario('hubtrains') with orders placed first): cgConsist gives the cars the orders need (a flatcar
//   for long bundles) plus empty boxcars up to the run's count; cgLoad puts the orders into them as items with their
//   waybills (once per run), the orders are delivered; cgReady is false while goods for the hub are aboard.
// - Unloading with the existing carrying: from the freight train's cars onto the cargo dock (drawn on its deck), into
//   a freight shed bay from its dock, onto the cargo yard; a contract's goods carried on to the business door and paid;
//   cgReady flips once the hub's goods are off and cgUnloaded is said once; the car panel refuses a coach and a train
//   not standing at the cargo track (carryCarWhy); cgCarStatus counts what is aboard.
// - Leaving (cgOnDepart): goods for Outside in a freight car are sold (cgSold, the ledger), goods for the hub left
//   aboard are set down in the cargo yard (cgSetDown); items and money add up.
// - When the railroad's trains run (TR's rrTick): a new hub game's order arrives on freight f1 at the cargo track.
//   Skipped (and said so) while rrPlanDay is still the foundation's stub.
// - The standing coffee offer for Willow Ford is not among a hub game's starting offers, but still is in ?world=start.
// - Same start, same result: the whole flow twice gives the same state hash.
// - Screenshots of goods on the cargo dock (portrait and landscape); no console errors; draw calls.

const { openGame, screenshotPath } = require('./browser');

// The flow on a state st (in the page): orders, the hubtrains scenario, loading, unloading, delivering, leaving.
function flowSource() {
  return function flow(R, st) {
    const out = { bad: [] }, P = m => out.bad.push(m), RR = R.rr, C = R.cargo, E = R.econ, SC = R.CFG.SCALE;
    const evAll = [];
    const tick = cmds => { const ev = R.simTick(st, cmds || []); evAll.push(...ev); return ev; };
    const atKey = () => { const k = E.econTelegraphKey(); st.player.x = k.x; st.player.z = k.z; st.player.mode = 'idle'; };
    // Run a carry command until done (the item is where it should be), up to n ticks.
    const carry = (cmd, done, what, n) => {
      let ev = tick([cmd]);
      const ref = ev.find(e => e.t === 'carryRefused');
      if (ref) { P(`${what}: refused (${ref.why})`); return false; }
      for (let i = 0; i < (n || 1500) && !done(); i++) {
        ev = tick();
        const r = ev.find(e => e.t === 'carryRefused' || e.t === 'blocked');
        if (r) { P(`${what}: ${r.t} ${r.why || ''}`); return false; }
      }
      if (!done()) { P(`${what}: not done in time`); return false; }
      return true;
    };
    // 1. Orders at 05:00 (day 1): accept the general store's flour contract, then order 3 flour for it, 2 tie bundles
    //    (our own track work: a flatcar) and 2 coffee (the hub warehouse).
    atKey();
    const flourK = st.econ.contracts.find(k => k.counterparty === 0 && k.commodity === 'flour');
    tick([{ t: 'contractAccept', id: flourK.id }]);
    st.time = 0; // (the first tick moved the clock on 8 s; the order is placed at 05:00 sharp)
    let ev = tick([{ t: 'econOrder', lines: [{ c: 'flour', n: 3, contract: flourK.id }, { c: 'ties', n: 2 }, { c: 'coffee', n: 2 }] }]);
    const placed = ev.find(e => e.t === 'orderPlaced');
    const f1 = RR.RR_SCHEDULE.find(v => v.id === 'f1'), f1At = f1.arr - 5 * 3600;
    out.due = placed && placed.due;
    if (!placed) P('the order was not placed: ' + JSON.stringify(ev.filter(e => /Refused/.test(e.t))));
    else if (placed.due !== f1At) P(`an order at 05:00 is booked for ${placed.due}, not freight f1's arrival ${f1At} (08:00)`);
    // 2. The hubtrains scenario: the freight train f1 stands at the cargo track (made up by cgConsist).
    RR.rrDebugScenario(st);
    const run = st.rr.runs.find(r => r.kind === 'freight'), tr = st.trains[run.slot];
    out.consist = tr.consist.map(c => c.k).join(',');
    if (out.consist !== 'loco,boxcar,flatcar,boxcar,boxcar') P(`freight f1's consist is ${out.consist}, expected loco,boxcar,flatcar,boxcar,boxcar (flour and coffee in a boxcar, ties on a flatcar, then empty boxcars)`);
    ev = [];
    const ld = RR.cgLoad(st, run, tr, ev);
    out.loaded = ld;
    if (ld.items !== 7) P(`cgLoad put ${ld.items} items into the train, expected 7`);
    if (st.econ.orders.length) P('the order is still waiting after the train was loaded');
    if (!ev.some(e => e.t === 'orderDelivered' && e.items.length === 7)) P('no orderDelivered event with the 7 items');
    if (!ev.some(e => e.t === 'cgLoaded' && e.run === run.id && e.items === 7 && e.cars === 2)) P('no cgLoaded event (7 items in 2 cars)');
    const again = RR.cgLoad(st, run, tr, []);
    if (again.items) P('cgLoad loaded the same run twice');
    const inCar = C.itemsAt(st, { kind: 'CAR' });
    const flat = tr.consist[2], box = tr.consist[1];
    if (C.itemsAt(st, { kind: 'CAR', stockId: flat.id }).length !== 2) P('the ties are not on the flatcar');
    if (C.itemsAt(st, { kind: 'CAR', stockId: box.id }).length !== 5) P('the flour and coffee are not in the first boxcar');
    const flourIds = inCar.filter(id => st.items.waybill[id].commodity === 'flour');
    if (flourIds.some(id => st.items.waybill[id].contractId !== flourK.id || st.items.waybill[id].consignee.id !== 0)) P('the flour is not addressed to the general store under its contract');
    if (RR.cgReady(st, run, tr)) P('cgReady is true with goods for the hub aboard');
    const s0 = RR.cgCarStatus(st, box.id);
    out.status0 = s0;
    if (!s0 || s0.items !== 5 || s0.hub !== 5 || s0.out !== 0 || s0.used !== 5 || s0.cap !== 16 || s0.why !== null) P('cgCarStatus of the loaded boxcar: ' + JSON.stringify(s0));
    // The car panel: a coach is refused with its own reason; a train not standing at its track is refused.
    const pax = st.trains.find(t => t.owner === 'rr' && t !== tr);
    const coachWhy = R.interchange.carryCarWhy(st, pax.consist[1].id);
    if (!/coach carries travellers/.test(coachWhy || '')) P('a coach is not refused as a coach: ' + coachWhy);
    run.ph = 'in';
    const inWhy = R.interchange.carryCarWhy(st, box.id);
    run.ph = 'stand';
    if (!/stands at the cargo track/.test(inWhy || '')) P('a freight car is not refused while its train is coming in: ' + inWhy);
    if (R.interchange.carryCarWhy(st, box.id) !== null) P('a standing freight car is refused: ' + R.interchange.carryCarWhy(st, box.id));
    // 3. Unload. The cargo dock, the freight shed's bays, the cargo yard.
    const dock = R.world.buildingFootprints().find(f => f.id === 'cargodock'), Y = R.world.HUBW.YARD;
    const onDock = i => ({ x: Math.round((dock.x + dock.w / 2 - 2.2 - (i % 4) * 0.75) * 100), z: Math.round((dock.z + 0.6 - Math.floor(i / 4) * 0.8) * 100) });
    const pick = id => carry({ t: 'carryPick', id }, () => { const w = st.items.where[id]; return w && w.kind === 'CARRIED'; }, 'pick item ' + id + ' (' + st.items.waybill[id].commodity + ')');
    const putAt = (id, p, what) => carry({ t: 'carryPut', x: p.x, z: p.z }, () => { const w = st.items.where[id]; return w && w.kind === 'GROUND'; }, what);
    let k = 0;
    const docked = [];
    for (const id of inCar.filter(id => st.items.waybill[id].commodity !== 'coffee')) {   // flour and ties onto the dock
      if (!pick(id)) break;
      if (!putAt(id, onDock(k), 'put item ' + id + ' on the cargo dock')) break;
      docked.push(id); k++;
    }
    const coffee = inCar.filter(id => st.items.waybill[id].commodity === 'coffee');
    if (pick(coffee[0])) carry({ t: 'carryPut', b: 'freightshed', bay: 3 }, () => { const w = st.items.where[coffee[0]]; return w && w.kind === 'BAY'; }, 'put the coffee into the freight shed\'s Any bay');
    const yardAt = { x: Math.round((Y.x0 + 3) * 100), z: Math.round((Y.z1 - 1.5) * 100) };
    const readyBefore = RR.cgReady(st, run, tr);
    if (pick(coffee[1])) putAt(coffee[1], yardAt, 'put the coffee on the cargo yard');
    out.where = inCar.map(id => st.items.where[id] && st.items.where[id].kind).join(',');
    if (readyBefore) P('cgReady was true with one item still aboard');
    if (!RR.cgReady(st, run, tr)) P('cgReady is still false after every hub item was unloaded');
    for (const id of docked) {
      const w = st.items.where[id], x = w.x / 100, z = w.z / 100;
      if (!(Math.abs(x - dock.x) < dock.w / 2 && Math.abs(z - dock.z) < dock.d / 2)) P(`item ${id} put on the dock lies at ${x}, ${z}, off the dock`);
    }
    const wy = st.items.where[coffee[1]];
    if (!(wy && wy.x / 100 > Y.x0 && wy.x / 100 < Y.x1 && wy.z / 100 > Y.z0 && wy.z / 100 < Y.z1)) P('the coffee set down on the cargo yard is not in the yard: ' + JSON.stringify(wy));
    tick();
    const unl = evAll.filter(e => e.t === 'cgUnloaded');
    if (unl.length !== 1 || unl[0].run !== run.id) P(`cgUnloaded said ${unl.length} times for f1 (expected once)`);
    out.docked = docked;
    // 4. Deliver one sack of flour from the dock to the general store's door: paid under its contract.
    const cash0 = st.econ.cash, fl = docked.find(id => st.items.waybill[id].commodity === 'flour');
    if (pick(fl)) carry({ t: 'carryPut', biz: 0 }, () => { const w = st.items.where[fl]; return !w || w.kind === 'BUSINESS'; }, 'deliver the flour at the general store');
    const paid = evAll.find(e => e.t === 'contractDelivered' && e.item === fl);
    if (!paid || !(st.econ.cash > cash0)) P('the flour delivered at the general store was not paid for its contract');
    // 5. Leaving: goods for Outside in a car are sold, a hub item left aboard is set down in the cargo yard.
    const grain = C.itemCreate(st, { commodity: 'grain', originTownId: 0, destTownId: 'OUTSIDE', consignee: { kind: 'OUTSIDE', id: 0 }, contractId: null, due: null }, { kind: 'CAR', stockId: tr.consist[3].id }, null).id;
    const left = C.itemCreate(st, { commodity: 'salt', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'WAREHOUSE', id: 0 }, contractId: null, due: null }, { kind: 'CAR', stockId: tr.consist[4].id }, null).id;
    if (RR.cgReady(st, run, tr)) P('cgReady is true with a hub item (salt) aboard');
    const s3 = RR.cgCarStatus(st, tr.consist[3].id);
    if (!s3 || s3.out !== 1 || s3.hub !== 0) P('cgCarStatus does not count the grain for Outside: ' + JSON.stringify(s3));
    const cash1 = st.econ.cash;
    ev = [];
    const dep = RR.cgOnDepart(st, run, tr, ev);
    out.depart = dep;
    if (dep.sold !== 1 || !(dep.paid > 0) || st.econ.cash !== cash1 + dep.paid) P('the grain for Outside was not sold on leaving: ' + JSON.stringify(dep));
    if (!ev.some(e => e.t === 'cgSold' && e.items === 1) || !ev.some(e => e.t === 'cgSetDown' && e.items === 1)) P('no cgSold or cgSetDown event');
    if (st.items.alive[grain] || st.items.used.find(u => u.id === grain).reason !== 'soldOutside') P('the grain was not used up as sold Outside');
    const ws = st.items.where[left];
    if (!ws || ws.kind !== 'GROUND' || !(ws.x / 100 > Y.x0 && ws.x / 100 < Y.x1 && ws.z / 100 > Y.z0 && ws.z / 100 < Y.z1)) P('the salt left aboard was not set down in the cargo yard: ' + JSON.stringify(ws));
    if (C.itemsAt(st, { kind: 'CAR' }).filter(id => tr.consist.some(c => c.id === st.items.where[id].stockId)).length) P('items are still in the freight train after it left');
    const cons = C.itemCheckConservation(st), money = E.econCheckMoney(st);
    if (cons.length) P('item conservation: ' + cons.join('; '));
    if (money.length) P('money rule: ' + money.join('; '));
    out.hash = R.hash(st);
    return out;
  };
}

module.exports = async function checkFreight() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=hub' });
    try {
      await page.evaluate(`window.__cgFlow = (${flowSource().toString()})`);
      if (orient === 'portrait') {
        const r = await page.evaluate(() => {
          const R = window.__railhead, RR = R.rr, E = R.econ, bad = [], P = m => bad.push(m), H = 3600;
          // Booking times.
          const s = R.newState(1866, 'hub');
          if (RR.cgNextFreight(0) !== 3 * H) P(`05:00 books for ${RR.cgNextFreight(0)}, not f1 at 08:00`);
          if (RR.cgNextFreight(2 * H) !== 7.5 * H) P(`07:00 books for ${RR.cgNextFreight(2 * H)}, not f2 at 12:30`);
          if (RR.cgNextFreight(14 * H) !== 86400 + 3 * H) P(`19:00 books for ${RR.cgNextFreight(14 * H)}, not the next day's f1`);
          if (E.econNextVisit(0, 'hub') !== 3 * H || E.econNextVisit(0, 'start') !== 13 * H) P('econNextVisit does not branch on the world (hub f1 08:00, start the Overland 18:00)');
          // Spill: f1's 4 cars filled with 64 sacks of flour; one more sack goes on f2.
          const k = E.econTelegraphKey(); s.player.x = k.x; s.player.z = k.z;
          let ev = R.simTick(s, [{ t: 'econOrder', lines: [{ c: 'flour', n: 64 }] }]);
          const a = ev.find(e => e.t === 'orderPlaced');
          s.time = 0;
          ev = R.simTick(s, [{ t: 'econOrder', lines: [{ c: 'beans', n: 1 }] }]);
          const b = ev.find(e => e.t === 'orderPlaced');
          if (!a || a.due !== 3 * H || !b || b.due !== 7.5 * H) P(`spill: a full f1 then one more sack: booked ${a && a.due}, ${b && b.due} (expected f1 ${3 * H}, f2 ${7.5 * H})`);
          // The consist for a run with nothing ordered: empty boxcars, its count.
          const e5 = RR.cgConsist(R.newState(1866, 'hub'), RR.RR_SCHEDULE.find(v => v.id === 'f2'));
          if (e5.length !== 5 || e5.some(c => c.k !== 'boxcar')) P('f2 with nothing ordered is not 5 empty boxcars: ' + e5.map(c => c.k));
          // Starting offers: no Willow Ford coffee in the hub world; the others as before.
          const hub = R.newState(1866, 'hub').econ.contracts, start = R.newState(1866, 'start').econ.contracts;
          if (hub.some(c => c.counterparty === 1 || c.commodity === 'coffee')) P('a hub game still offers the standing coffee contract for Willow Ford');
          if (hub.length !== start.length - 1 || hub.some((c, i) => c.commodity !== start[i].commodity)) P('the hub game\'s other starting offers differ from the real start\'s');
          // The whole flow twice: same result.
          const o1 = window.__cgFlow(R, R.newState(1866, 'hub')), o2 = window.__cgFlow(R, R.newState(1866, 'hub'));
          o1.bad.forEach(P);
          if (o1.hash !== o2.hash) P(`the same flow twice gives different hashes (${o1.hash}, ${o2.hash})`);
          // TR's trains: if rrTick runs the schedule, an order placed in a new hub game arrives on f1 at the cargo track.
          let live = 'skipped: rrPlanDay is still the foundation stub (TR not merged)';
          if (RR.rrPlanDay(R.newState(1866, 'hub'), 0).length) {
            const g = R.newState(1866, 'hub'), kk = E.econTelegraphKey(); g.player.x = kk.x; g.player.z = kk.z;
            R.simTick(g, [{ t: 'econOrder', lines: [{ c: 'flour', n: 2 }, { c: 'rails', n: 1 }] }]);
            let stood = null;
            for (let i = 0; i < 4000 && !stood; i++) {
              for (const n of RR.rrSwitchNeeds(g)) if (!n.set && !n.spring) g.track.switches[n.sw].state = n.want === 'reverse' ? 'R' : 'N';
              R.simTick(g, []);
              stood = g.rr.runs.find(r => r.svc === 'f1' && r.ph === 'stand') || null;
            }
            if (!stood) P('with TR\'s trains running, freight f1 never stood at the cargo track');
            else {
              const t = g.trains[stood.slot], n = R.cargo.itemsAt(g, { kind: 'CAR' }).filter(id => t.consist.some(c => c.id === g.items.where[id].stockId)).length;
              if (n !== 3 || g.econ.orders.length) P(`the order placed at 05:00 did not arrive on f1 (${n} items aboard, ${g.econ.orders.length} orders waiting)`);
              live = `f1 stood at ${stood.tArr} with ${n} ordered items aboard`;
            }
          }
          return { bad, flow: o1, live };
        });
        problems.push(...r.bad.map(m => 'portrait: ' + m));
        console.log(`  flow: consist ${r.flow.consist}, loaded ${JSON.stringify(r.flow.loaded)}, after unloading ${r.flow.where}, departure ${JSON.stringify(r.flow.depart)}, hash ${r.flow.hash}`);
        console.log(`  live run: ${r.live}`);
      }
      // Goods on the cargo dock, drawn: the flow on the page's own state, then the camera on the dock.
      const shot = await page.evaluate(async () => {
        const R = window.__railhead;
        R.importSave(JSON.stringify({ state: R.newState(1866, 'hub') }));
        const o = window.__cgFlow(R, R.state);
        R.cargo.redraw();
        const S = R.state, dock = R.world.buildingFootprints().find(f => f.id === 'cargodock');
        S.player.x = dock.x + 6; S.player.z = dock.z - 1.5;
        R.camera.zoom = 2.2; R.camera.ox = dock.x + dock.w / 2 - 4 - S.player.x; R.camera.oz = dock.z - S.player.z;
        R.step(1);
        await new Promise(r => setTimeout(r, 900));
        const poses = R.cargo.view.poses || [], top = R.feet.bldStandY(dock.x, dock.z);
        const ys = o.docked.filter(id => S.items.alive[id] && S.items.where[id].kind === 'GROUND').map(id => poses[id] ? +poses[id].y.toFixed(3) : null);
        return { ys, top, dc: R.drawCalls };
      });
      if (!shot.ys.length || shot.ys.some(y => y === null || Math.abs(y - shot.top) > 0.02)) problems.push(`${orient}: goods on the cargo dock are not drawn on its deck (deck top ${shot.top}, item heights ${shot.ys.join(', ')})`);
      await page.screenshot({ path: screenshotPath(`freight-dock-${orient}`) });
      console.log(`  ${orient}: goods on the dock drawn at ${shot.ys.join(', ')} (deck top ${shot.top}); draw calls ${shot.dc}`);
      if (!(shot.dc < 100)) problems.push(`${orient}: ${shot.dc} draw calls, over the phone budget of 100`);
      if (errors.length) problems.push(`${orient}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  // The real start keeps Willow Ford's standing coffee offer.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=start' });
    try {
      const r = await page.evaluate(() => window.__railhead.state.econ.contracts.some(c => c.counterparty === 1 && c.commodity === 'coffee' && c.kind === 'STANDING'));
      if (!r) problems.push('?world=start: the standing coffee offer for Willow Ford is gone');
      if (errors.length) problems.push(`?world=start: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
