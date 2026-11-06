// Check: tickets on board (D24, builder PX; plans/rework-tech.md section 3), with the debug scenario 'hubtrains'
// (passenger run p1 standing at the platform, the freight run f1 at the cargo track).
// - Travellers: riders for the hub are aboard the standing passenger train (4 to 12); they step off first and walk to
//   the town exits (HUBW.TOWN_EXITS), where they leave the map. Those waiting on the platform for its way (4 to 12)
//   board it; pxReady is false until everyone due off is off and everyone waiting is aboard, then true.
// - checkTickets: the player walks to the car's spot on the platform and checks its travellers: each pays 40 cents
//   (PX.FARE) through the ledger ('fares', ref TICKET) and takes 6 game seconds (PX.CHECK_S): n tickets take
//   ceil(6n / 8) ticks of 8 game seconds; carChecked { n }. The player stands at the car while checking.
// - Walking away stops a check; what was checked stays checked. A car not standing at the platform is refused.
// - pxOnDepart: every unchecked traveller aboard rides free (fareMissed, S.rr.tk.missed and missedCents, no money
//   moved); everyone aboard leaves with the train.
// - The ticket counter is refused in the hub world; checkTickets is refused in the real start.
// - The same commands from the same start give the same state hash twice.
// - Screenshots at phone size, portrait and landscape: travellers boarding, and the player checking a car. No console errors.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkTickets() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=hub' });
    try {
      if (orient === 'portrait') {
        const r = await page.evaluate(() => {
          const R = window.__railhead, PX = R.px.PX, bad = [], P = m => bad.push(m), info = {};
          // The whole script on a state of its own (pure simulation), so it can be run twice for the hash.
          const play = (log) => {
            const st = R.rr.rrDebugScenario(R.newState(1866, 'hub')), run = st.rr.runs.find(q => q.kind === 'pax'), tr = st.trains[run.slot];
            const evs = [], tick = cmds => { const ev = R.simTick(st, cmds || []); evs.push(...ev); return ev; };
            const L = () => st.pax.list;
            tick();
            const riders = L().filter(p => p.to === 'hub').length, waiting = L().filter(p => p.to === run.to && (p.s === 'wait' || p.s === 'board')).length;
            if (log) {
              info.riders = riders; info.waiting = waiting;
              if (!(riders >= 4 && riders <= 12)) P(`${riders} riders for the hub aboard the arriving train (expected 4 to 12)`);
              if (!(waiting >= 4 && waiting <= 12)) P(`${waiting} travellers waiting for the train's way (expected 4 to 12)`);
              if (R.px.pxReady(st, run, tr)) P('pxReady is true while riders are still to step off');
              if (L().some(p => p.to === run.to && p.s === 'aboard')) P('a traveller boarded before the riders at the doors stepped off');
            }
            // Until everyone is off and on.
            let readyAt = -1;
            for (let i = 0; i < 400 && readyAt < 0; i++) { tick(); if (R.px.pxReady(st, run, tr)) readyAt = i; }
            const stocks = new Set(tr.consist.map(c => c.id)), aboard = L().filter(p => p.s === 'aboard' && stocks.has(p.car));
            if (log) {
              info.readyTicks = readyAt;
              if (readyAt < 0) P('pxReady never became true');
              if (aboard.length !== waiting) P(`${aboard.length} travellers aboard, expected the ${waiting} who were waiting`);
              if (aboard.some(p => p.to === 'hub')) P('a rider for the hub is still aboard when pxReady is true');
              if (aboard.some(p => p.chk)) P('a traveller who just boarded counts as checked');
              if (evs.filter(e => e.t === 'paxAlighted').length !== riders) P(`${evs.filter(e => e.t === 'paxAlighted').length} stepped off, expected ${riders}`);
              if (evs.filter(e => e.t === 'paxBoarded').length !== waiting) P(`${evs.filter(e => e.t === 'paxBoarded').length} boarded, expected ${waiting}`);
            }
            // Those who stepped off walk to a town exit and leave the map there.
            const exits = R.world.HUBW.TOWN_EXITS, offIds = new Set(evs.filter(e => e.t === 'paxAlighted').map(e => e.id)), lastAt = {};
            for (let i = 0; i < 600 && L().some(p => offIds.has(p.id)); i++) { tick(); for (const p of L()) if (offIds.has(p.id)) lastAt[p.id] = [p.x / 100, p.z / 100]; }
            if (log) {
              const gone = evs.filter(e => e.t === 'paxGone' && offIds.has(e.id)).length;
              if (gone !== riders) P(`${gone} of the ${riders} who stepped off left the map`);
              const far = Object.values(lastAt).filter(([x, z]) => !exits.some(e => Math.hypot(e[0] - x, e[1] - z) < 1.5)).length;
              if (far) P(`${far} travellers who stepped off left the map away from a town exit`);
            }
            // Checking the car with the most travellers.
            const byCar = {};
            for (const p of aboard) byCar[p.car] = (byCar[p.car] || 0) + 1;
            const cars = R.px.pxCars(st), car1 = cars.slice().sort((a, b) => (byCar[b.stock] || 0) - (byCar[a.stock] || 0))[0], n1 = byCar[car1.stock] || 0;
            const cash0 = st.econ.cash, led0 = st.econ.ledger.length;
            let from = evs.length;
            tick([{ t: 'checkTickets', tr: tr.id, car: car1.stock }]);
            let ticks = 0, started = -1, done = null, standOk = true;
            for (let i = 0; i < 400 && !done; i++) {
              const ev = tick();
              const J = st.rr.tk.job;
              done = ev.find(e => e.t === 'carChecked') || null;
              if ((J && J.on) || done) { ticks++; if (started < 0) started = i; }
              if (((J && J.on) || done) && !R.px.pxNearCar(st.player, R.px.pxCars(st).find(c => c.stock === car1.stock))) standOk = false;
            }
            const st1 = R.px.pxCarStatus(st, car1.stock);
            if (log) {
              info.car1 = { n: n1, ticks, walkTicks: started };
              if (!done) P('checking a car never finished (no carChecked)');
              else if (done.n !== n1) P(`carChecked n ${done.n}, expected ${n1}`);
              const want = Math.ceil(n1 * PX.CHECK_S / 8);
              // Counted: every tick the player checks, the one that reaches the car and the one with carChecked included.
              if (ticks !== want) P(`checking ${n1} tickets took ${ticks} ticks of checking, expected ${want} (6 game seconds each)`);
              if (st.econ.cash - cash0 !== n1 * PX.FARE) P(`checking earned ${st.econ.cash - cash0} cents, expected ${n1 * PX.FARE}`);
              const led = st.econ.ledger.slice(led0);
              if (led.length !== n1 || led.some(e => e.category !== 'fares' || e.amount !== PX.FARE || !e.ref || e.ref.kind !== 'TICKET')) P('the ledger does not hold one 40-cent fares entry (TICKET) per ticket checked');
              if (!standOk) P('the player was not standing at the car while checking');
              if (!st1 || st1.unchecked !== 0 || st1.checked !== n1) P(`car status after checking: ${JSON.stringify(st1)}`);
              if (st.rr.tk.checked !== n1 || st.rr.tk.cents !== n1 * PX.FARE) P(`S.rr.tk counts ${st.rr.tk.checked} checked, ${st.rr.tk.cents} cents`);
            }
            // Walking away from the next car part-way through keeps what was checked.
            const car2 = cars.filter(c => c !== car1 && byCar[c.stock] >= 2).sort((a, b) => byCar[b.stock] - byCar[a.stock])[0];
            let part = null;
            if (car2) {
              tick([{ t: 'checkTickets', tr: tr.id, car: car2.stock }]);
              for (let i = 0; i < 200 && !(st.rr.tk.job && st.rr.tk.job.on); i++) tick();
              tick();   // one ticket (8 game seconds: one checked)
              from = evs.length;
              tick([{ t: 'walkTo', x: Math.round(st.player.x * 100), z: Math.round((st.player.z - 4) * 100) }]);
              const s2 = R.px.pxCarStatus(st, car2.stock);
              part = { n: byCar[car2.stock], s2, stopped: evs.slice(from).some(e => e.t === 'checkStopped'), job: st.rr.tk.job };
              for (let i = 0; i < 20; i++) tick();
              if (log) {
                info.car2 = part;
                if (!part.stopped || part.job) P('walking away did not stop the ticket check');
                if (!(s2.checked >= 1 && s2.checked < part.n)) P(`after walking away part-way: ${s2.checked} of ${part.n} checked`);
                if (R.px.pxCarStatus(st, car2.stock).checked !== s2.checked) P('what was checked did not stay checked after walking away');
              }
            } else if (log) P('no second car with 2 or more travellers to test walking away');
            // Departure: everyone unchecked rides free.
            const unchecked = L().filter(p => p.s === 'aboard' && stocks.has(p.car) && !p.chk).length, cash1 = st.econ.cash, tkm = st.rr.tk.missed;
            const dev = [], res = R.px.pxOnDepart(st, run, tr, dev);
            if (log) {
              info.missed = res;
              if (res.missed !== unchecked || res.cents !== unchecked * PX.FARE) P(`pxOnDepart: ${JSON.stringify(res)}, expected ${unchecked} unchecked`);
              if (st.rr.tk.missed - tkm !== unchecked || st.rr.tk.missedCents !== st.rr.tk.missed * PX.FARE) P('S.rr.tk does not count the missed fares');
              if (st.econ.cash !== cash1) P('missed fares moved money');
              const fm = dev.find(e => e.t === 'fareMissed');
              if (unchecked && (!fm || fm.n !== unchecked || fm.run !== run.id)) P('no fareMissed event with the count');
              if (L().some(p => p.s === 'aboard' && stocks.has(p.car))) P('travellers stayed aboard after the train left');
              if (dev.filter(e => e.t === 'paxGone').length !== aboard.length) P('not everyone aboard left with the train (paxGone)');
            }
            // The ticket counter is closed in the hub world.
            const ev = tick([{ t: 'staffWindow', st: 'hub' }]), dl = ev.find(e => e.t === 'deskLeft');
            if (log && (!dl || !/checked on the train/.test(dl.why) || st.pax.desk)) P('the ticket counter was not refused in the hub world');
            // A car of the freight train cannot be checked.
            const fr = st.trains[st.rr.runs.find(q => q.kind === 'freight').slot], ev2 = tick([{ t: 'checkTickets', tr: fr.id, car: fr.consist[1].id }]);
            if (log && !ev2.some(e => e.t === 'pxRefused')) P('checking a freight car was not refused');
            for (let i = 0; i < 50; i++) tick();
            return R.hash(st);
          };
          const h1 = play(true), h2 = play(false);
          if (h1 !== h2) P(`same start, same commands: hash ${h1} then ${h2}`);
          // The real start: checking tickets on board is refused, the counter still works there.
          const so = R.newState(1866, 'start'), e1 = R.simTick(so, [{ t: 'checkTickets', tr: 0, car: 1 }]), e2 = R.simTick(so, [{ t: 'staffWindow', st: 'hub' }]);
          if (!e1.some(e => e.t === 'pxRefused')) P('checkTickets is not refused in the real start');
          if (e2.some(e => e.t === 'deskLeft') || !so.pax.desk) P('the ticket counter does not work in the real start any more');
          return { bad, info, h1 };
        });
        problems.push(...r.bad.map(m => 'portrait: ' + m));
        console.log('  ' + JSON.stringify(r.info));
      }
      // Screenshots in the page's own game: travellers boarding, then the player checking a car.
      const shot = await page.evaluate(async () => {
        const R = window.__railhead;
        R.importSave(JSON.stringify({ state: R.rr.rrDebugScenario(R.newState(1866, 'hub')) }));
        R.camera.yawIdx = 2; R.camera.yaw = Math.PI / 4 + Math.PI; R.camera.zoom = 1.3; R.camera.ox = 15 - R.state.player.x; R.camera.oz = -3 - R.state.player.z;
        R.step(6);
        await new Promise(r => setTimeout(r, 500));
        const S = R.state, boarding = S.pax.list.filter(p => p.s === 'board' || p.s === 'off').length;
        return { boarding };
      });
      if (!(shot.boarding > 0)) problems.push(`${orient}: nobody stepping off or boarding in the boarding screenshot`);
      await page.screenshot({ path: screenshotPath(`tickets-boarding-${orient}`) });
      const chk = await page.evaluate(async () => {
        const R = window.__railhead;
        for (let i = 0; i < 120 && !R.px.pxReady(R.state, R.state.rr.runs[0], R.state.trains[R.state.rr.runs[0].slot]); i++) R.step(1);
        const S = R.state, run = S.rr.runs[0], tr = S.trains[run.slot];
        const car = tr.consist.slice(1).map(c => c.id).sort((a, b) => R.px.pxCarStatus(S, b).unchecked - R.px.pxCarStatus(S, a).unchecked)[0];
        R.send({ t: 'checkTickets', tr: tr.id, car });
        for (let i = 0; i < 200 && !(S.rr.tk.job && S.rr.tk.job.on); i++) R.step(1);
        // Seen from the platform side (the camera turned half round), so the player is not behind the train.
        R.camera.yawIdx = 2; R.camera.yaw = Math.PI / 4 + Math.PI; R.camera.zoom = 1.4; R.camera.ox = 0; R.camera.oz = 0;
        await new Promise(r => setTimeout(r, 500));
        const C = R.px.pxCars().find(c => c.stock === car);
        return { on: !!(S.rr.tk.job && S.rr.tk.job.on), near: !!C && R.px.pxNearCar(S.player, C), dc: R.drawCalls };
      });
      if (!chk.on || !chk.near) problems.push(`${orient}: the player is not checking at the car for the screenshot (${JSON.stringify(chk)})`);
      await page.screenshot({ path: screenshotPath(`tickets-checking-${orient}`) });
      console.log(`  ${orient}: draw calls while checking ${chk.dc}`);
      if (!(chk.dc < 100)) problems.push(`${orient}: ${chk.dc} draw calls, over the phone budget of 100`);
      if (errors.length) problems.push(`${orient}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
