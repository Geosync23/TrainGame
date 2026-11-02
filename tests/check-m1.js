// Check: the M1 acceptance criteria (design-doc 22, "M1. The whistle-stop") that a script can check, played by the
// "reasonable player" bot in tests/m1-bot.js. The bot plays the real start through the game's own commands only.
//
// 1. A full game week (7 days) played by the bot alone: the imports it orders arrive on the Overland, are sorted
//    into the freight shed's bays and delivered to the business doors (and to Willow Ford's store by the train);
//    the Willow Ford train runs on schedule (every departure and arrival within 15 game minutes) while the bot does
//    the station work (water, wood, loading, run-around); the money rule (econCheckMoney) and the item conservation
//    check pass at the end of every day; one siding is built by hand from delivered materials; no console errors.
// 2. Pressure: the Overland and the Willow Ford train arriving within 10 game minutes give, at the same moment
//    (measured from the state), a queue at the hub's ticket window, an unsorted pile (goods still in the Overland's
//    set-out cars) and a waiting train (No. 1 standing at the hub owing wood or work). Screenshot m1-pressure-portrait.png.
// 3. Save and reload mid-week (day 4, 17:00, the train out on the line) gives the same hash at the end of the week;
//    the week played twice gives the same hash.
// Since D13 a new game has 8 cords at the hub's wood stage, so day 1's afternoon train runs too: all 14 services
// in the week (until D13 day 1's afternoon was a known gap, as no wood came before the 18:00 Overland).
// Not scriptable now: "the player can complete the tutorial with no debug tools" (the tutorial is built in round
// D) and the playtester gate (five outside playtesters, a designer gate).
// The sim runs headless in the page (simTick in large batches); only the screenshot is drawn.

const { openGame, screenshotPath } = require('./browser');
const { BOT_SRC } = require('./m1-bot');

const DAY = 10800, WEEK = 7 * DAY, MID = 3 * DAY + 12 * 450; // day 4, 17:00 (450 ticks a game hour)

// In the page: the bot, and a runner that records what the check needs.
const RUNNER = `window.__m1 = (() => {
  const R = window.__railhead, factory = (0, eval)('(' + window.__m1src + ')');
  const sod = S => (S.time + 18000) % 86400, day = S => Math.floor((S.time + 18000) / 86400);
  const hm = S => 'day ' + (day(S) + 1) + ' ' + String(Math.floor(sod(S) / 3600)).padStart(2, '0') + ':' + String(Math.floor(sod(S) % 3600 / 60)).padStart(2, '0');
  function newRec() { return { tt: [], daily: [], moves: { toBay: 0, fromBay: 0, toDoor: 0, toWillowStore: 0, toTrain: 0, toJob: 0, toCart: 0 }, ordered: 0, arrived: 0,
    events: {}, overlandIn: [], pressure: null, pressureDays: [], cancelled: [], jobDone: null, offers: 0, maxQueue: 0 }; }
  function start(seed) { return { S: R.newState(seed), bot: factory(R), rec: newRec() }; }
  function waitingTrain(S) {
    const tr = S.trains[0], ps = R.trainPoses(S.track, tr);
    if (tr.v > 0 || tr.mode === 'route' || !ps.length || !ps.every(p => p.x > -12 && p.x < 34 && p.z < -2.5 && p.z > -4.5)) return false;
    const L = tr.consist.find(c => c.k === 'loco'), run = R.tt.ttRunOf(S, 0);
    return (run && run.ph === 'at' && /^Waiting: (the station work|take water|load wood)/.test(run.why || '')) || (L && L.fuel <= R.tt.FUEL_CAP - 120);
  }
  function step(X, n) {
    const { S, bot, rec } = X;
    for (let k = 0; k < n; k++) {
      const before = S.overland.phase, cmds = bot.decide(S), ev = R.simTick(S, cmds);
      bot.observe(S, ev);
      if (before === 'in' && S.overland.phase !== 'in') rec.overlandIn.push({ t: S.time, day: day(S), at: hm(S) });
      for (const e of ev) {
        rec.events[e.t] = (rec.events[e.t] || 0) + 1;
        if (e.t === 'ttDeparted' || e.t === 'ttArrived') rec.tt.push({ t: e.t, svc: e.svc, i: e.i, st: e.st, late: e.late, day: day(S), at: hm(S), time: S.time });
        if (e.t === 'ttCancelled') rec.cancelled.push({ svc: e.svc, why: e.why, day: day(S), at: hm(S) });
        if (e.t === 'orderPlaced') rec.ordered += e.items;
        if (e.t === 'orderDelivered') rec.arrived += e.items.length;
        if (e.t === 'contractOffered') rec.offers++;
        if (e.t === 'jobDone') rec.jobDone = hm(S);
        if (e.t === 'itemMoved') {
          const f = e.from && e.from.kind, t = e.to && e.to.kind;
          if (t === 'BUSINESS') { rec.moves.toDoor++; if (e.to.businessId === 1) rec.moves.toWillowStore++; }
          if (t === 'CAR' && e.to.stockId === 2) rec.moves.toTrain++;
          if (t === 'STOCKPILE') rec.moves.toJob++;
          if (t === 'BAY') rec.moves.toBay = (rec.moves.toBay || 0) + 1;
          if (f === 'BAY') rec.moves.fromBay = (rec.moves.fromBay || 0) + 1;
          if (t === 'CARRIED' && e.to.carrier === 'HANDCART') rec.moves.toCart = (rec.moves.toCart || 0) + 1;
        }
      }
      // The pressure moment: the evening after both trains are in.
      const s = sod(S);
      if (s >= 18 * 3600 && s <= 21 * 3600) {
        const q = S.pax.list.filter(p => p.st === 'hub' && p.s === 'queue').length;
        rec.maxQueue = Math.max(rec.maxQueue, q);
        const cut = S.trains.find(t => t.owner === 'interchange');
        const unsorted = cut ? cut.consist.reduce((n, c) => n + R.cargo.itemsAt(S, { kind: 'CAR', stockId: c.id }).length, 0) : 0;
        const ovIn = rec.overlandIn.filter(o => o.day === day(S) && o.t <= S.time && (o.t + 18000) % 86400 >= 17 * 3600).pop();
        // (The evening arrival only: since D13 day 1's afternoon train runs and comes in about 18:31, so the morning's
        // return must not stand in for it while the evening train still waits at the spout.)
        const no1In = rec.tt.filter(r => r.t === 'ttArrived' && r.i === 2 && r.day === day(S) && r.st === 'hub' && (r.time + 18000) % 86400 >= 17 * 3600).pop();
        if (ovIn && no1In && q > 0 && unsorted > 0 && waitingTrain(S)) {
          const gapMin = Math.round(Math.abs(ovIn.t - no1In.time) / 60);
          if (!rec.pressureDays.some(p => p.day === day(S))) {
            const p = { day: day(S), at: hm(S), queue: q, unsorted, train: S.trains[0].status, fuel: Math.round(S.trains[0].consist.find(c => c.k === 'loco').fuel), overlandIn: ovIn.at, no1In: no1In.at, gapMin };
            rec.pressureDays.push(p);
            // Kept: the evening with the most goods still waiting in the set-out cars.
            if (gapMin <= 10 && (!rec.pressure || unsorted > rec.pressure.unsorted)) { rec.pressure = p; rec.pressureSave = JSON.stringify({ state: S }); }
          }
        }
      }
      if (S.time % 86400 === 86400 - 18000 || k === n - 1 && S.tick % DAYT === 0) {
        rec.daily.push({ day: day(S), money: R.econ.econCheckMoney(S), cons: R.cargo.itemCheckConservation(S), cash: S.econ.cash, at: hm(S) });
      }
    }
  }
  const DAYT = ${DAY};
  return { start, step, factory, hm, newRec };
})();`;

module.exports = async function checkM1() {
  const problems = [];
  const known = [];
  const t0 = Date.now();
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    await page.evaluate(src => { window.__m1src = src; }, BOT_SRC);
    await page.evaluate(RUNNER);
    // ---- Run A: the week, with a save at MID ----
    await page.evaluate(() => { window.__A = window.__m1.start(1866); });
    for (let d = 0; d < 7; d++) {
      await page.evaluate(([n, mid]) => {
        const A = window.__A;
        for (let i = 0; i < n; i++) {
          window.__m1.step(A, 1);
          if (A.S.tick === mid) { A.mid = { json: JSON.stringify({ state: A.S }), mem: JSON.stringify(A.bot.mem), hash: window.__railhead.stateHash(A.S) }; }
        }
      }, [DAY, MID]);
    }
    const tA = Date.now();
    const A = await page.evaluate(() => {
      const R = window.__railhead, A = window.__A, S = A.S;
      const k = S.econ.contracts.map(c => ({ id: c.id, kind: c.kind, biz: c.counterparty, c: c.commodity, q: c.quantity, status: c.status, period: c.period }));
      const left = []; for (let i = 0; i < S.items.next; i++) if (S.items.alive[i] && !/BUSINESS|STOCKPILE/.test(S.items.where[i].kind)) left.push(S.items.waybill[i].commodity + '@' + S.items.where[i].kind);
      const S0 = R.newState(1866), hub = R.tt.ttStation(S0, 'hub');
      const startCords = R.cargo.itemsAt(S0, { kind: 'GROUND' }).filter(i => S0.items.waybill[i].commodity === 'cordwood' && Math.hypot(S0.items.where[i].x / 100 - hub.wood.x, S0.items.where[i].z / 100 - hub.wood.z) < 6).length;
      const fares = S.econ.ledger.filter(L => L.category === 'fares'), onArr = fares.filter(L => L.ref && L.ref.kind === 'FARE');
      return { startCords, faresOnArrival: { n: onArr.length, cents: onArr.reduce((a, L) => a + L.amount, 0), byRoute: onArr.reduce((o, L) => { o[L.counterparty] = (o[L.counterparty] || 0) + 1; return o; }, {}) }, hash: R.stateHash(S), rec: A.rec, stats: A.bot.mem.stats, refusals: A.bot.mem.refusals, notes: A.bot.mem.notes, contracts: k, cash: S.econ.cash, money: R.econ.econCheckMoney(S), cons: R.cargo.itemCheckConservation(S),
        mid: A.mid ? A.mid.hash : null, tick: S.tick, jobs: S.jobs.list.length, edges: S.track.edges.length, left, sold: S.pax.sold, gaveUp: S.pax.rep,
        town: S.town.biz.map(b => b.id + ':' + Object.keys(b.shelf).filter(c => b.shelf[c] > 0).length + ' goods on the shelf') };
    });
    const r = A.rec;
    // 1. The week.
    for (const d of r.daily) {
      if (d.money.length) problems.push(`money check failed at the end of ${d.at}: ${d.money.join('; ')}`);
      if (d.cons.length) problems.push(`item conservation failed at the end of ${d.at}: ${d.cons.join('; ')}`);
    }
    if (r.daily.length < 7) problems.push(`the daily checks ran ${r.daily.length} times, expected 7`);
    if (A.money.length || A.cons.length) problems.push('money or conservation failed at the end of the week: ' + A.money.concat(A.cons).join('; '));
    if (!r.ordered || r.arrived !== r.ordered) problems.push(`imports: ${r.ordered} items ordered, ${r.arrived} arrived on the Overland`);
    if ((r.moves.toBay || 0) < 10 || (r.moves.fromBay || 0) < 5) problems.push('imports were not sorted into the bays: ' + JSON.stringify(r.moves));
    if (r.moves.toDoor < 20 || r.moves.toWillowStore < 2) problems.push('imports were not delivered to the business doors (hub and Willow Ford): ' + JSON.stringify(r.moves));
    const start = A.contracts.filter(c => c.id < 4);
    if (start.some(c => c.status !== 'DONE')) problems.push('the starting delivery contracts should all be done: ' + JSON.stringify(start));
    if (A.contracts.some(c => c.status === 'CANCELLED' || c.status === 'LATE')) problems.push('a contract went late or was cancelled: ' + JSON.stringify(A.contracts));
    const coffee = A.contracts.find(c => c.id === 4);
    if (!coffee || coffee.period < 1) problems.push('the standing coffee contract for Willow Ford got no week delivered: ' + JSON.stringify(coffee));
    // The timetable: every departure and arrival within 15 game minutes, all 14 services (day 1's afternoon too, D13).
    const late = r.tt.filter(x => x.late > 15 * 60);
    if (late.length) problems.push('the Willow Ford train ran more than 15 game minutes late: ' + late.map(x => `${x.t} svc ${x.svc} stop ${x.i} ${x.at} +${Math.round(x.late / 60)} min`).join('; '));
    const dep = r.tt.filter(x => x.t === 'ttDeparted' && x.i === 0).length, done = r.tt.filter(x => x.t === 'ttArrived' && x.i === 2).length;
    if (dep < 14 || done < 14) problems.push(`the Willow Ford services should run 14 times in the week (day 1's afternoon too), ran ${dep} departures and ${done} returns`);
    const day1pm = r.tt.filter(x => x.day === 0 && x.svc === 1);
    if (!day1pm.some(x => x.t === 'ttDeparted' && x.i === 0) || !day1pm.some(x => x.t === 'ttArrived' && x.i === 2)) problems.push('day 1\'s afternoon Willow Ford train did not run: ' + JSON.stringify(day1pm));
    if (r.cancelled.length) problems.push('services were cancelled: ' + JSON.stringify(r.cancelled));
    // The 8 starting cords (D13): at the hub's wood stage in the new game, and some went on the handcart.
    if (A.startCords !== 8) problems.push(`a new game should have 8 cords at the hub's wood stage, has ${A.startCords}`);
    if (!(r.moves.toCart > 0)) problems.push('the bot never put a cord on the handcart: ' + JSON.stringify(r.moves));
    if (!r.jobDone || A.jobs !== 0) problems.push('the siding was not finished by hand: ' + JSON.stringify({ done: r.jobDone, jobs: A.jobs, toJob: r.moves.toJob }));
    if (!(A.stats.tickets > 20)) problems.push('the bot sold few tickets: ' + A.stats.tickets);
    // 2. Pressure.
    if (!r.pressure) problems.push('no evening had the Overland and the Willow Ford train in within 10 game minutes with a queue, an unsorted pile and a waiting train: ' + JSON.stringify({ days: r.pressureDays, overland: r.overlandIn.map(o => o.at) }));
    // 3. Run B: the same week again gives the same hash. Run C: the mid-week save, reloaded, gives the same end.
    const B = await page.evaluate(n => { const X = window.__m1.start(1866); for (let d = 0; d < 7; d++) window.__m1.step(X, n / 7); return window.__railhead.stateHash(X.S); }, WEEK);
    if (B !== A.hash) problems.push(`the week played twice gave different hashes (${A.hash}, ${B})`);
    const tB = Date.now();
    const C = await page.evaluate(n => {
      const R = window.__railhead, A = window.__A, S = R.migrate(JSON.parse(A.mid.json)).state;
      const loaded = R.stateHash(S), X = { S, bot: window.__m1.factory(R, JSON.parse(A.mid.mem)), rec: window.__m1.newRec() };
      window.__m1.step(X, n - S.tick);
      return { loaded, end: R.stateHash(X.S) };
    }, WEEK);
    if (!A.mid || C.loaded !== A.mid) problems.push(`the mid-week save loaded with a different hash (${A.mid}, ${C.loaded})`);
    if (C.end !== A.hash) problems.push(`the week reloaded mid-week ended with a different hash (${A.hash}, ${C.end})`);
    const tC = Date.now();
    // The pressure moment, drawn.
    if (r.pressure) {
      const shot = await page.evaluate(() => {
        const R = window.__railhead; R.importSave(window.__A.rec.pressureSave);
        const P = R.state.player; R.camera.zoom = 0.6; R.camera.ox = -3 - P.x; R.camera.oz = -1 - P.z; return R.hash();
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: screenshotPath('m1-pressure-portrait') });
      const dc = await page.evaluate(() => window.__railhead.drawCalls);
      console.log(`  pressure screenshot: m1-pressure-portrait.png (draw calls ${dc}, hash ${shot})`);
    }
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    // Report.
    const fmt = x => `${x.at.slice(4)} ${x.st === 'hub' ? 'hub' : 'WF'} ${x.t === 'ttDeparted' ? 'dep' : 'arr'}${x.late > 0 ? ' +' + Math.round(x.late / 60) : x.late < 0 ? ' ' + Math.round(x.late / 60) : ''}`;
    console.log(`  week: ${r.ordered} items ordered, ${r.arrived} arrived; moves ${JSON.stringify(r.moves)}; cash $${(A.cash / 100).toFixed(2)}; tickets ${A.stats.tickets} (${JSON.stringify(A.sold)}), fares paid on arrival ${A.faresOnArrival.n} ($${(A.faresOnArrival.cents / 100).toFixed(2)}, ${JSON.stringify(A.faresOnArrival.byRoute)}), gave up ${JSON.stringify(A.gaveUp)}`);
    console.log(`  contracts: ${A.contracts.map(c => c.id + ' ' + c.c + ' ' + c.status + (c.kind === 'STANDING' ? ' (weeks ' + c.period + ')' : '')).join(', ')}; town offers in the week: ${r.offers}`);
    console.log(`  timetable (late in minutes): ${r.tt.map(fmt).join(', ')}`);
    console.log(`  worst lateness ${Math.max(...r.tt.map(x => x.late)) / 60 | 0} game minutes; cancelled ${JSON.stringify(r.cancelled)}`);
    console.log(`  siding finished ${r.jobDone}; bot: ${JSON.stringify(A.stats)}; refusals ${JSON.stringify(A.refusals)}`);
    console.log(`  pressure evenings: ${r.pressureDays.map(p => `${p.at} queue ${p.queue}, unsorted ${p.unsorted}, ${p.train} (Overland in ${p.overlandIn.slice(-5)}, No. 1 in ${p.no1In.slice(-5)}, ${p.gapMin} min apart)`).join('; ')}`);
    console.log(`  left at the end: ${A.left.join(', ') || 'nothing'}; hashes A ${A.hash} B ${B} reloaded ${C.end}`);
    console.log(`  run time: week ${((tA - t0) / 1000).toFixed(1)} s, again ${((tB - tA) / 1000).toFixed(1)} s, reload half ${((tC - tB) / 1000).toFixed(1)} s, total ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    for (const k of known) console.log('  KNOWN GAP (reported, not counted as a failure): ' + k);
  } finally { await browser.close(); }
  return problems;
};
