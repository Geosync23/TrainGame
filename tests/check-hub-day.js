// Check: the station rework's flow end to end (D24; plans/rework-tech.md section 6, the integrator's acceptance
// check), played by the careful player in tests/hub-bot.js through touch-level commands only.
//
// Three game days in a new hub game (the bot throws the switches, checks the tickets aboard, unloads the freight
// trains at the cargo track, sorts and delivers the goods, waves every train off, and takes and orders the goods for
// the Hub businesses' contracts at the work board):
// - every one of the 27 runs comes in and leaves, none cancelled and none left by its crew alone; the worst arrival
//   and departure lateness are 15 game minutes or less;
// - tickets: nearly all travellers who rode are checked (at least 85 percent; the rest rode free);
// - every item ordered arrives on a freight train and is delivered at its business's door by the end;
// - cash at the end is above the start; the money rule and item conservation hold at every midnight;
// - the same three days twice give the same state hash, and so does a save and reload half way (day 2, 17:00);
// - no console errors.
// Screenshots at the busiest moments (two trains standing with the most travellers about; the freight train being
// unloaded), portrait and landscape: test-output/hubday-*.png, and the busiest draw-call count (budget 100).
// The sim runs headless in the page (simTick in large batches); only the screenshots are drawn.

const { openGame, screenshotPath } = require('./browser');
const { HUB_BOT_SRC } = require('./hub-bot');

const DAY = 10800, DAYS = 3, END = DAYS * DAY, MID = DAY + 12 * 450;   // 450 ticks a game hour; MID: day 2, 17:00

const RUNNER = `window.__hd = (() => {
  const R = window.__railhead, factory = (0, eval)('(' + window.__hdsrc + ')');
  const sod = S => (S.time + 18000) % 86400, day = S => Math.floor((S.time + 18000) / 86400);
  const hm = S => 'day ' + (day(S) + 1) + ' ' + String(Math.floor(sod(S) / 3600)).padStart(2, '0') + ':' + String(Math.floor(sod(S) % 3600 / 60)).padStart(2, '0');
  function newRec() { return { daily: [], ordered: 0, arrived: 0, orderedIds: [], delivered: 0, deliveredIds: {}, runs: {}, events: {}, busy: null, unload: null, fares: 0 }; }
  function start(seed) { const S = R.newState(seed, 'hub'), bot = factory(R); bot.mem.endTime = ${END} * 8; return { S, bot, rec: newRec() }; }
  // How busy the station is: trains standing, travellers on the map, goods off the train still to sort.
  function busyness(S) {
    const st = S.rr.runs.filter(r => r.ph === 'stand').length, pax = S.pax.list.length;
    return st * 1000 + pax;
  }
  function step(X, n) {
    const { S, bot, rec } = X;
    for (let k = 0; k < n; k++) {
      const cmds = bot.decide(S), ev = R.simTick(S, cmds);
      bot.observe(S, ev);
      for (const e of ev) {
        rec.events[e.t] = (rec.events[e.t] || 0) + 1;
        if (e.t === 'orderPlaced') rec.ordered += e.items;
        if (e.t === 'orderDelivered') { rec.arrived += e.items.length; rec.orderedIds.push(...e.items); }
        // Each run's story from the railroad's events (a game day's runs are dropped from S.rr the next day).
        if (/^rr(Due|Arrived|WavedOff|Left|Cancelled)$/.test(e.t)) {
          const run = S.rr.runs.find(r => r.id === e.run), o = rec.runs[e.run] = rec.runs[e.run] || { svc: run && run.svc, day: run && run.day, ph: 'due', arrLate: null, depLate: null, auto: false };
          if (e.t === 'rrArrived') { o.arrLate = run.tArr - run.arr; o.ph = 'stand'; }
          if (e.t === 'rrWavedOff') { o.depLate = run.tWave - run.dep; o.auto = !!e.auto; o.ph = 'out'; }
          if (e.t === 'rrLeft') o.ph = 'gone';
          if (e.t === 'rrCancelled') o.ph = 'cxl';
        }
        if (e.t === 'bizDelivered' && e.contract !== null) { rec.delivered++; rec.deliveredIds[e.id] = 1; }
      }
      const b = busyness(S);
      if (S.rr.runs.filter(r => r.ph === 'stand').length === 2 && (!rec.busy || b > rec.busy.b)) rec.busy = { b, at: hm(S), save: JSON.stringify({ state: S }) };
      const fr = S.rr.runs.find(r => r.ph === 'stand' && r.kind === 'freight'), carried = R.carry.carryHeld(S).length;
      if (fr && carried) { const aboard = R.rr.cgHubAboard(S, S.trains[fr.slot]); if (aboard > 0 && (!rec.unload || aboard > rec.unload.b)) rec.unload = { b: aboard, at: hm(S), save: JSON.stringify({ state: S }) }; }
      if (S.time % 86400 === 86400 - 18000) rec.daily.push({ at: hm(S), money: R.econ.econCheckMoney(S), cons: R.cargo.itemCheckConservation(S), cash: S.econ.cash });
    }
  }
  function report(X) {
    const S = X.S, runs = Object.keys(X.rec.runs).map(Number).sort((a, b) => a - b).map(id => X.rec.runs[id]).filter(r => r.day < ${DAYS});
    // Delivered: handed over at its business's door under its contract (bizDelivered, paid).
    const gone = X.rec.orderedIds.filter(id => X.rec.deliveredIds[id]).length;
    const where = X.rec.orderedIds.filter(id => !X.rec.deliveredIds[id]).map(id => S.items.alive[id] ? S.items.waybill[id].commodity + '@' + S.items.where[id].kind : id + ' used up');
    return { runs, tk: { checked: S.rr.tk.checked, missed: S.rr.tk.missed, cents: S.rr.tk.cents, missedCents: S.rr.tk.missedCents }, cash: S.econ.cash, hash: R.stateHash(S),
      money: R.econ.econCheckMoney(S), cons: R.cargo.itemCheckConservation(S), goneDelivered: gone, left: where, stats: X.bot.mem.stats, refusals: X.bot.mem.refusals, notes: X.bot.mem.notes.slice(0, 5),
      contracts: S.econ.contracts.map(k => k.id + ' ' + k.commodity + ' ' + k.status + ' ' + k.delivered + '/' + k.quantity) };
  }
  return { start, step, factory, newRec, report, hm };
})();`;

module.exports = async function checkHubDay() {
  const problems = [], P = m => problems.push(m);
  const t0 = Date.now();
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=hub' });
  let saves = [];
  try {
    await page.evaluate(src => { window.__hdsrc = src; }, HUB_BOT_SRC);
    await page.evaluate(RUNNER);
    // ---- Run A: three days, with a save at MID ----
    const start = await page.evaluate(() => { window.__A = window.__hd.start(1866); return window.__A.S.econ.cash; });
    for (let d = 0; d < DAYS; d++) {
      await page.evaluate(([n, mid]) => {
        const A = window.__A;
        for (let i = 0; i < n; i++) {
          window.__hd.step(A, 1);
          if (A.S.tick === mid) A.mid = { json: JSON.stringify({ state: A.S }), mem: JSON.stringify(A.bot.mem), hash: window.__railhead.stateHash(A.S) };
        }
      }, [DAY, MID]);
    }
    const tA = Date.now();
    const A = await page.evaluate(() => { const A = window.__A, r = window.__hd.report(A);
      return { ...r, rec: { daily: A.rec.daily, ordered: A.rec.ordered, arrived: A.rec.arrived, delivered: A.rec.delivered, n: A.rec.orderedIds.length, busyAt: A.rec.busy && A.rec.busy.at, unloadAt: A.rec.unload && A.rec.unload.at }, mid: A.mid && A.mid.hash, tick: A.S.tick }; });
    // Every run in and out, none cancelled.
    if (A.runs.length !== 9 * DAYS) P(`${A.runs.length} runs in the three days, expected ${9 * DAYS}`);
    const bad = A.runs.filter(r => r.ph !== 'gone' || r.auto || r.skipped);
    if (bad.length) P('runs not brought in and waved off: ' + bad.map(r => `${r.svc} day ${r.day + 1} (${r.ph}${r.auto ? ', its crew left alone' : ''})`).join(', '));
    const worstArr = Math.max(...A.runs.map(r => r.arrLate === null ? 1e9 : r.arrLate)), worstDep = Math.max(...A.runs.map(r => r.depLate === null ? 1e9 : r.depLate));
    if (!(worstArr <= 15 * 60)) P(`worst arrival lateness ${Math.round(worstArr / 60)} game minutes (limit 15)`);
    if (!(worstDep <= 15 * 60)) P(`worst departure lateness ${Math.round(worstDep / 60)} game minutes (limit 15)`);
    // Tickets.
    const rode = A.tk.checked + A.tk.missed;
    if (!(rode > 100) || !(A.tk.checked >= 0.85 * rode)) P(`tickets: ${A.tk.checked} checked of ${rode} who rode (at least 85 percent expected)`);
    // Goods: ordered, arrived, delivered.
    if (!(A.rec.ordered > 0) || A.rec.arrived !== A.rec.ordered) P(`goods: ${A.rec.ordered} items ordered, ${A.rec.arrived} arrived on the freight trains`);
    if (A.goneDelivered !== A.rec.n || A.left.length) P(`goods: ${A.goneDelivered} of the ${A.rec.n} items that arrived were delivered at a door; still on the map: ${A.left.join(', ')}`);
    // Money and items.
    if (!(A.cash > start)) P(`cash at the end ${A.cash} cents is not above the start (${start})`);
    if (A.rec.daily.length !== DAYS) P(`the midnight checks ran ${A.rec.daily.length} times, expected ${DAYS}`);
    for (const d of A.rec.daily) { if (d.money.length) P(`money check at ${d.at}: ${d.money.join('; ')}`); if (d.cons.length) P(`item conservation at ${d.at}: ${d.cons.join('; ')}`); }
    if (A.money.length || A.cons.length) P('money or items at the end: ' + A.money.concat(A.cons).join('; '));
    // ---- Run B: the same three days again; run C: the save half way, reloaded ----
    const B = await page.evaluate(n => { const X = window.__hd.start(1866); for (let d = 0; d < 3; d++) window.__hd.step(X, n / 3); return window.__railhead.stateHash(X.S); }, END);
    if (B !== A.hash) P(`the three days played twice gave different hashes (${A.hash}, ${B})`);
    const C = await page.evaluate(n => {
      const R = window.__railhead, A = window.__A, S = R.migrate(JSON.parse(A.mid.json)).state;
      const loaded = R.stateHash(S), X = { S, bot: window.__hd.factory(R, JSON.parse(A.mid.mem)), rec: window.__hd.newRec() };
      window.__hd.step(X, n - S.tick);
      return { loaded, end: R.stateHash(X.S) };
    }, END);
    if (!A.mid || C.loaded !== A.mid) P(`the save half way loaded with a different hash (${A.mid}, ${C.loaded})`);
    if (C.end !== A.hash) P(`the three days reloaded half way ended with a different hash (${A.hash}, ${C.end})`);
    const tC = Date.now();
    saves = await page.evaluate(() => [['busy', window.__A.rec.busy], ['unload', window.__A.rec.unload]].filter(([, s]) => s).map(([k, s]) => ({ k, at: s.at, save: s.save })));
    if (saves.length < 2) P('no busy moment recorded for the screenshots (two trains standing; a freight train being unloaded)');
    // ---- Report ----
    const mins = s => (s === null ? '-' : (s >= 0 ? '+' : '') + Math.round(s / 60));
    console.log(`  3 days: ${A.runs.length} runs, all in and out: ${!bad.length}; worst arrival ${Math.round(worstArr / 60)} min, departure ${Math.round(worstDep / 60)} min late`);
    console.log(`  runs (in/out, minutes late): ${A.runs.map(r => `${r.svc}d${r.day + 1} ${mins(r.arrLate)}/${mins(r.depLate)}`).join(', ')}`);
    console.log(`  tickets: ${A.tk.checked} checked ($${(A.tk.cents / 100).toFixed(2)}), ${A.tk.missed} rode free ($${(A.tk.missedCents / 100).toFixed(2)} lost), ${Math.round(100 * A.tk.checked / Math.max(1, rode))} percent checked`);
    console.log(`  goods: ${A.rec.ordered} ordered, ${A.rec.arrived} arrived, ${A.goneDelivered} delivered at the doors (${A.rec.delivered} deliveries); contracts ${A.contracts.join(', ')}`);
    console.log(`  cash $${(start / 100).toFixed(2)} -> $${(A.cash / 100).toFixed(2)}; bot ${JSON.stringify(A.stats)}; refusals ${JSON.stringify(A.refusals)}`);
    console.log(`  hashes: A ${A.hash}, B ${B}, reloaded at day 2 17:00 ${C.end}; busiest moments ${A.rec.busyAt} (two trains standing), ${A.rec.unloadAt} (unloading)`);
    console.log(`  run time: three days ${((tA - t0) / 1000).toFixed(1)} s, again and reloaded ${((tC - tA) / 1000).toFixed(1)} s`);
    if (errors.length) P('portrait: console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  // ---- Screenshots at the busy moments, portrait and landscape, and the draw calls ----
  let worstDc = 0;
  const dcs = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=hub' });
    try {
      for (const s of saves) {
        for (const [zoom, tag] of [[1.5, ''], [0.6, '-wide']]) {
          const dc = await page.evaluate(async ([json, k, zoom]) => {
            const R = window.__railhead; R.importSave(json);
            const S = R.state, P = S.player, st = S.rr.runs.filter(r => r.ph === 'stand').map(r => S.trains[r.slot]);
            // The view: the busy moment over the passenger train at the platform (zoomed out: both trains); the
            // unloading over the player at the freight train.
            const mid = tr => { const q = R.trainPoses(S.track, tr); return q.length ? q[q.length >> 1] : null; };
            const ps = st.map(mid).filter(Boolean), pax = S.rr.runs.find(r => r.ph === 'stand' && r.kind === 'pax'), pp = pax ? mid(S.trains[pax.slot]) : null;
            const at = k === 'unload' ? { x: P.x, z: P.z } : zoom < 1 && ps.length ? { x: ps.reduce((a, p) => a + p.x, 0) / ps.length, z: -4 } : pp ? { x: pp.x, z: -4 } : { x: P.x, z: P.z };
            R.camera.zoom = zoom; R.camera.ox = at.x - P.x; R.camera.oz = at.z - P.z;
            await new Promise(r => setTimeout(r, 900));
            return window.__railhead.drawCalls;
          }, [s.save, s.k, zoom]);
          await page.screenshot({ path: screenshotPath(`hubday-${s.k}${tag}-${orient}`) });
          dcs.push(`${s.k}${tag} ${orient} ${dc}`);
          worstDc = Math.max(worstDc, dc);
        }
      }
      if (errors.length) P(`${orient}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    } finally { await browser.close(); }
  }
  console.log(`  screenshots: ${saves.map(s => `hubday-${s.k}[-wide]-{portrait,landscape}.png (${s.at})`).join(', ')}; draw calls ${dcs.join(', ')}; busiest ${worstDc}`);
  if (worstDc > 100) P(`the busiest view takes ${worstDc} draw calls (budget 100)`);
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
