// Check: the evening's delivery and pickup (D27, builder F; plans/d27-tech.md 4.3 and 4.4, section "freight handling
// (D27)" of index.html). With D27 handling on (?d27=handling), from rh.scenario('d27evening') (Monday 20:30: day 0's
// goods for the town stacked in their storage rows, every run gone; the clock then set back to 08:00 so that all of
// the evening's work ends on Monday: the delivery is checked here, the time it takes is reported):
// - at 17:00 (here: the scenario's first tick) each shop that sends goods puts them out at its pickup spot: SHOP_GOODS27.pickups
//   plus Tuesday's weekly special (the undertaker's furniture), 7 goods for the railroad;
// - a player who follows frJobHint loads the cart from storage, pushes it down the east ramp, over the cart crossing
//   (the cart crosses tracks 1 and 2 nowhere else) and up the main street, delivers each shop's goods at its door
//   (frDeliver: each shop takes only its own; the keeper takes it, tfAt), comes back for the rest, picks up every
//   shop's goods (frPickup) and stacks them in the OUT rows; no refusal on the way, itemAudit every game hour;
//   frDeliver refused for a shop with nothing on the cart and with the cart far away;
// - the next day (Tuesday) the freight trains take those goods: f2 loads 5 (4 and the furniture), f3 2, all sold as
//   they leave;
// - goods not picked up stay at the shop, and the shop puts out nothing new while they wait;
// - the same hash when the evening is played twice; a save made mid-delivery plays on to the same state.

const { openGame } = require('./browser');

module.exports = async function checkDelivery() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d27=handling' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, X = R.fr, D = R.d27, out = { bad: [], info: {} }, B = m => { if (out.bad.length < 60) out.bad.push(m); };
      const hm = S => { const a = S.time + R.CFG.DAY_START_S, s = a % 86400; return 'd' + Math.floor(a / 86400) + ' ' + String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
      function player(S) {
        const P = S.player, evs = [];
        const switchman = () => {
          const occ = R.occupiedSwitches(S);
          for (const tr of S.trains) if (tr.owner === 'rr' && tr.swWait !== undefined && tr.swWait !== null && tr.v === 0 && occ[tr.swWait] === undefined) { const W = S.track.switches[tr.swWait]; W.state = W.state === 'N' ? 'R' : 'N'; }
        };
        const tick = cmds => { switchman(); const e = R.simTick(S, cmds || []); for (const x of e) { x.time = S.time; evs.push(x); } return e; };
        const idle = () => !(S.fr && S.fr.job) && P.mode === 'idle' && !P.act && !P.use;
        const send = (cmd, each) => { const from = evs.length; tick([cmd]); for (let n = 0; n < 6000 && !idle(); n++) { tick(); if (each) each(); } return evs.slice(from); };
        return { tick, send, evs, idle };
      }
      const P27 = D.PROTO, X27 = P27.XING_CART;
      // The evening, played by following the hints until nothing is left (not stopped at 23:00: the check is of the
      // delivery, the time it takes is reported). Returns the state and what was seen.
      function evening(saveAt) {
        const S = X.frDebugScenario(D.protoDebugEvening(R.newState(1866, 'proto')), 'd27evening'), P = S.player, pl = player(S);
        S.time -= 12.5 * 3600;   // the evening's work from 08:00, so that the whole of it ends on Monday (it is the delivery that is checked here, not the clock)
        const L = { hours: 0, audit: [], refused: [], delivered: [], wrong: [], across: [], hints: 0, mid: null, keeper: 0 }, shopOf = {};
        for (let i = 0; i < S.items.next; i++) if (S.items.alive[i]) { const wb = S.items.waybill[i]; if (wb.consignee.kind === 'BUSINESS') shopOf[i] = wb.consignee.id; }
        const town0 = Object.keys(shopOf).length;
        const watch = () => {
          for (const x of pl.evs.splice(0)) {
            if (x.t === 'hour') { L.hours++; const a = D.itemAudit(S); if (a.length && L.audit.length < 5) L.audit.push(hm(S) + ' ' + a[0]); }
            if ((/Refused$/.test(x.t) || x.t === 'blocked') && !L.expect && L.refused.length < 8) L.refused.push(hm(S) + ' ' + x.t + ' ' + (x.why || ''));
            if (x.t === 'frDelivered') { L.delivered.push(x.id); if (shopOf[x.id] !== x.shop) L.wrong.push(`${x.id} (for ${shopOf[x.id]}) at ${x.shop}`); if (x.keeper) L.keeper++; }
          }
          // The cart between tracks 1 and 2 (z -4.8 to -1.2) only on the crossing's planks.
          const c = X.frCartPose(S);
          if (c && c.z > -P27.D1 + 1.2 && c.z < -1.2 && Math.abs(c.x - X27.x) > X27.w / 2 + 0.6 && L.across.length < 3) L.across.push(`(${c.x.toFixed(1)}, ${c.z.toFixed(1)})`);
          if (saveAt && !L.mid && S.fr.job && S.fr.job.k === 'deliver' && S.fr.job.t0 >= 0 && S.fr.job.steps[S.fr.job.i] && S.fr.job.steps[S.fr.job.i].s === 'act') L.mid = JSON.stringify({ state: S });
        };
        pl.tick([]);
        L.put = X.frPickups(S); L.picksDay = S.fr.picks;
        L.firstHint = X.frJobHint(S);
        // Refusals: a shop with nothing on the cart; the cart far away.
        L.expect = true; L.r1 = pl.send({ t: 'frDeliver', shop: 'sheriff' }).filter(x => x.t === 'frRefused').map(x => x.why); watch(); L.expect = false;
        let first = null;
        for (let guard = 0; guard < 3000; guard++) {
          watch();
          const h = X.frJobHint(S);
          if (!h || !h.cmd) break;
          // The cart loaded and left on the cargo platform: a delivery is refused until it is brought.
          if (!L.r2 && h.cmd.t === 'frCart' && h.cmd.act === 'grab' && X.frCartGoods(S).some(id => shopOf[id] === 'store')) { L.expect = true; L.r2 = pl.send({ t: 'frDeliver', shop: 'store' }).filter(x => x.t === 'frRefused').map(x => x.why); watch(); L.expect = false; }
          if (h.cmd.t === 'frDeliver' && !first) first = hm(S);
          L.hints++;
          pl.send(h.cmd, watch);
        }
        watch();
        Object.assign(L, { town0, first, end: hm(S) });
        return { S, L, pl, hash: R.stateHash(S) };
      }
      const a = evening(true), b = evening(false), S = a.S, L = a.L;
      if (a.hash !== b.hash) B(`the same evening played twice gave different hashes ${a.hash} and ${b.hash}`);
      // The pickups put out.
      const want = { feed: 2, livery: 1, saloon: 1, newspaper: 1, assay: 1, undertaker: 1 };
      for (const [shop, n] of Object.entries(L.put)) if ((want[shop] || 0) !== n) B(`at 17:00 the ${shop} put out ${n} goods (expected ${want[shop] || 0})`);
      if (L.picksDay.day !== 0 || L.picksDay.put.length !== 6) B(`picks ${JSON.stringify(L.picksDay)}`);
      if (!L.r1.some(w => /Nothing on the cart/.test(w))) B(`a delivery to the sheriff (nothing for him) was not refused: ${L.r1}`);
      if (!L.r2 || !L.r2.some(w => /Bring the cart/.test(w))) B(`a delivery with the cart at the cargo platform was not refused: ${L.r2}`);
      if (!L.firstHint || !L.firstHint.cmd) B('no hint at the start of the evening');
      // Every good delivered to its own shop, every pickup brought back to the OUT rows.
      if (L.delivered.length !== L.town0 || L.town0 !== 15) B(`${L.delivered.length} of ${L.town0} goods for the town delivered (expected 15)`);
      for (const m of L.wrong) B('delivered to the wrong shop: ' + m);
      if (L.keeper !== L.delivered.length) B(`the keeper took ${L.keeper} of ${L.delivered.length}`);
      const left = X.frToDeliver(S);
      if (Object.values(left).some(n => n)) B(`still to deliver: ${JSON.stringify(left)}`);
      const outIds = []; for (let i = 0; i < S.items.next; i++) if (S.items.alive[i] && R.cargo.itemTag(S.items.waybill[i]) === 'OUTSIDE') outIds.push(i);
      const inRows = outIds.filter(i => { const w = S.items.where[i]; return w.kind === 'CELL' && D.STORE27_OUT.some(q => q.block === w.block && q.r === w.r && w.c >= q.c0 && w.c <= q.c1); });
      if (outIds.length !== 13 || inRows.length !== 13) B(`goods for the railroad: ${outIds.length} (expected 13: the 6 of day 0's dawn, which no train took in this scenario, and the 7 picked up), ${inRows.length} in the OUT rows (${outIds.map(i => S.items.where[i].kind).join(',')})`);
      if (Object.values(X.frPickups(S)).some(n => n)) B(`pickups left at shops: ${JSON.stringify(X.frPickups(S))}`);
      if (S.fr.tot.delivered !== 15 || S.fr.tot.picked !== 7) B(`totals ${JSON.stringify(S.fr.tot)}`);
      for (const m of L.across) B('the cart crossed between tracks 1 and 2 away from the crossing at ' + m);
      for (const m of L.audit) B('the evening: audit: ' + m);
      for (const m of L.refused) B('the evening: refused: ' + m);
      if (L.hours < 3) B(`only ${L.hours} game hours audited`);
      out.info.evening = { first: L.first, end: L.end, hints: L.hints, tot: S.fr.tot, hash: a.hash };
      // A save made mid-delivery plays on to the same state.
      if (!L.mid) B('no save was made mid-delivery');
      else {
        const s1 = R.migrate(JSON.parse(L.mid)).state, s2 = R.migrate(JSON.parse(L.mid)).state;
        for (let k = 0; k < 60; k++) { R.simTick(s1, []); R.simTick(s2, []); }
        if (R.stateHash(s1) !== R.stateHash(s2)) B('a save made mid-delivery plays on to different states');
        const au = D.itemAudit(s1);
        if (au.length) B('after the mid-delivery save: audit: ' + au[0]);
      }
      // ---- The next day (Tuesday): the freight trains load the goods picked up ----
      {
        const pl = a.pl, P = S.player, loaded = {}, sold = [];
        if (S.pd.ph !== 'summary') pl.tick([{ t: 'pdEndDay' }]);
        pl.tick([{ t: 'pdNextDay' }]); pl.tick([{ t: 'pdStart' }]);
        S.rr.runs = S.rr.runs.filter(q => q.day !== 1 || (q.kind === 'freight' && !q.through));
        const runOf = id => S.rr.runs.find(q => q.id === id);
        const watch = () => { for (const x of pl.evs.splice(0)) { if (x.t === 'frLoaded') { const svc = runOf(x.run).svc; loaded[svc] = (loaded[svc] || 0) + 1; } if (x.t === 'itemConsumed' && x.reason === 'soldOutside') sold.push(x.id); if (x.t === 'hour') { const au = D.itemAudit(S); if (au.length) B('Tuesday: audit: ' + au[0]); } } };
        let waved = 0;
        for (let guard = 0; guard < 30000 && waved < 3 && S.pd.ph !== 'summary'; guard++) {
          watch();
          const ready = S.rr.runs.find(q => q.day === 1 && q.ph === 'stand' && q.ready);
          if (ready) {
            const tr = S.trains[ready.slot], sp = R.rr.rrWaveSpot(S, tr.id);
            pl.send({ t: 'walkTo', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) });
            pl.tick([{ t: 'rrWaveOff', tr: tr.id }]); waved++;
            continue;
          }
          const h = X.frJobHint(S);
          if (h && h.cmd && S.pd.ph === 'day') { pl.send(h.cmd, watch); continue; }
          pl.tick();
        }
        for (let k = 0; k < 400; k++) pl.tick();
        watch();
        if (loaded.f2 !== 5 || loaded.f3 !== 2) B(`Tuesday's loads: ${JSON.stringify(loaded)} (expected f2 5, with the undertaker's furniture, and f3 2)`);
        const gone = outIds.filter(i => !S.items.alive[i]);
        if (gone.length !== 7 || sold.length !== 7) B(`of the 13 goods for the railroad, ${gone.length} have left by train (${sold.length} sold; expected 7)`);
        out.info.tuesday = { loaded, waved, end: hm(S) };
      }
      // ---- Goods not picked up stay; nothing new is put out while they wait ----
      {
        const S2 = R.newState(1866, 'proto'), pl = player(S2);
        pl.tick([{ t: 'pdStart' }]);
        S2.time = 17 * 3600 - R.CFG.DAY_START_S - 8;
        pl.tick(); pl.tick();
        const p0 = X.frPickups(S2), n0 = S2.items.next;
        S2.time += 86400; pl.tick(); pl.tick();
        const p1 = X.frPickups(S2);
        if (JSON.stringify(p0) !== JSON.stringify(p1) || S2.items.next !== n0) B(`a day later the uncollected pickups are ${JSON.stringify(p1)} (were ${JSON.stringify(p0)}), ${S2.items.next - n0} goods made`);
        if (S2.fr.picks.day !== 1 || S2.fr.picks.put.length) B(`day 1's pickups: ${JSON.stringify(S2.fr.picks)} (expected none put out)`);
        const au = D.itemAudit(S2);
        if (au.length) B('uncollected pickups: audit: ' + au[0]);
      }
      return out;
    });
    problems.push(...r.bad);
    if (r.info.evening) console.log(`  the evening by the hints: first delivery ${r.info.evening.first}, all done ${r.info.evening.end}; ${r.info.evening.hints} commands; totals ${JSON.stringify(r.info.evening.tot)}; hash ${r.info.evening.hash}`);
    if (r.info.tuesday) console.log(`  Tuesday: loaded ${JSON.stringify(r.info.tuesday.loaded)}, ${r.info.tuesday.waved} freight trains sent off by ${r.info.tuesday.end}`);
    if (errors.length) problems.push('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
