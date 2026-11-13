// Check: the D27 working day end to end (the integrator's acceptance check; plans/d27-tech.md 8.4), with every D27 switch
// on (board, handling, town, lessons), played by the careful player in tests/proto-bot.js through touch-level commands
// only (the levers, punching on board, every handling step by F's frJobHint, the evening's deliveries and pickups, the
// lessons: on day 1 shown for switches, tickets and unloading and skipped for the others, on day 2 replayed from Settings
// and skipped as they come).
//
// Two game days from a new prototype game. Checked, each day:
// - every run of the schedule comes in and goes out (none cancelled, none left to go by itself), the stopping ones
//   waved off by the player, through switches only the player set at the lever frames (no switch changes otherwise);
// - every traveller who came was seated and punched (none missed);
// - every good the day's freight trains brought was unloaded, and every good for the railroad loaded; every good for
//   the town delivered at its own shop and every good the shops put out picked up (the day's figures, read from the
//   game's tables);
// - itemAudit (conservation, one place each, stacks without gaps, F's day audit) every game hour, and at each summary;
// - the summary's figures match what happened; the player ends each day (End the day) before the clock does;
// - lessons: each one shown or skipped as the bot chose, a replay on day 2;
// - the same two days twice give the same hash; a save made mid-handling (day 2, a step under way) and one made
//   mid-aisle (day 2, the player inside a coach) each reload with the same hash and play on to the same end;
// - no console errors.
// Reported: each run's lateness in and out, the bot's figures, the frame times of the busiest moments.
// Screenshots, portrait and landscape (test-output/d27-*.png): the morning at the board, a lesson card, a coach cut
// away mid-punch, a boxcar being unloaded with goods on the cart, the cargo platform stacked, the cart on the path to
// town, a delivery at a shop with the keeper at the door, the street with townsfolk, the night, the summary.

const { openGame, screenshotPath } = require('./browser');
const { PROTO_BOT_SRC } = require('./proto-bot');

const DAYS = 2, MAX_TICKS = 2 * 86400 / 8 + 100;

const RUNNER = `window.__d27 = (() => {
  const R = window.__railhead, factory = (0, eval)('(' + window.__botsrc + ')'), X = R.fr, D27 = R.d27;
  const hm = S => { const s = (S.time + 18000) % 86400; return 'day ' + (Math.floor((S.time + 18000) / 86400) + 1) + ' ' + String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
  const sod = S => (S.time + 18000) % 86400;
  function newRec() { return { days: {}, runs: {}, swOther: 0, shots: {}, sums: [], audit: [], hours: 0, needs: {}, sw0: {}, les: [], best: {} }; }
  function start(seed) { const S = R.newState(seed, 'proto'), bot = factory(R); return { S, bot, rec: newRec() }; }
  const dayRec = (rec, d) => rec.days[d] = rec.days[d] || { came: 0, seated: 0, punched: 0, missed: 0, inWant: 0, unWant: 0, collected: 0, outWant: 0, unloaded: 0, loaded: 0, stored: 0, delivered: 0, wrongShop: 0, putOut: 0, picked: 0,
    throws: 0, waves: 0, arrived: 0, onTime: 0, late: 0, worstLate: 0, soldOutside: 0, keeper: 0 };
  const save = S => JSON.stringify({ state: S });
  function step(Xr, n) {
    const { S, bot, rec } = Xr;
    for (let k = 0; k < n; k++) {
      const before = S.track.switches.map(w => w.state).join('');
      const cmds = bot.decide(S), ev = R.simTick(S, cmds);
      bot.observe(S, ev);
      const day = S.pd.day, D = dayRec(rec, day), after = S.track.switches.map(w => w.state).join('');
      let thrown = 0;
      for (const e of ev) {
        const run = e.run !== undefined && e.run !== null ? S.rr.runs.find(r => r.id === e.run) : null;
        if (e.t === 'switchThrown') { thrown++; D.throws++; }
        if (e.t === 'pbCome') D.came += e.n;
        if (e.t === 'pbSeated') D.seated++;
        if (e.t === 'pbPunched') D.punched++;
        if (e.t === 'pbMissed') D.missed += e.n;
        if (e.t === 'frUnloaded') D.unloaded++;
        if (e.t === 'frLoaded') D.loaded++;
        if (e.t === 'frStored') D.stored++;
        if (e.t === 'frDelivered') { D.delivered++; const wb = S.items.waybill[e.id]; if (!wb || wb.consignee.id !== e.shop) D.wrongShop++; if (e.keeper) D.keeper++; }
        if (e.t === 'frPutOut') D.putOut += (e.ids || []).length;
        if (e.t === 'frPicked') D.picked++;
        if (e.t === 'itemConsumed' && e.reason === 'soldOutside') D.soldOutside++;
        if (e.t === 'rrWavedOff' && !e.auto) D.waves++;
        if (e.t === 'pdLesson' || e.t === 'pdLessonDone' || e.t === 'pdLessonReplay') rec.les.push(hm(S) + ' ' + e.t + ' ' + (e.id || '') + (e.step !== undefined ? ' ' + e.step : '') + (e.skipped ? ' skipped' : ''));
        if (e.t === 'hour') { rec.hours++; const a = D27.itemAudit(S); if (a.length && rec.audit.length < 6) rec.audit.push(hm(S) + ': ' + a.slice(0, 2).join('; ')); }
        if (e.t === 'rrArrived' && run && run.kind === 'freight') { const L = X.frRunIn(S, run); D.inWant += L.length; D.unWant += L.filter(([, c]) => !X.FR.COLLECT.includes(R.cargo.COMMODITIES[c].type)).length; D.outWant += X.frRunOutN(S, run); }
        if (e.t === 'frDelivered' && e.collected) D.collected++;
        if (/^rr(Due|Arrived|WavedOff|Left|Cancelled|Passed)$/.test(e.t) && run) {
          const o = rec.runs[e.run] = rec.runs[e.run] || { svc: run.svc, day: run.day, through: !!run.through, ph: 'due', arrLate: null, depLate: null, auto: false };
          if (e.t === 'rrArrived') { o.arrLate = run.tArr - run.arr; o.ph = 'stand'; }
          if (e.t === 'rrPassed') { o.arrLate = e.late; o.ph = 'out'; }
          if (e.t === 'rrWavedOff') { o.depLate = run.tWave - run.dep; o.auto = !!e.auto; o.ph = 'out'; }
          if (e.t === 'rrLeft') o.ph = 'gone';
          if (e.t === 'rrCancelled') o.ph = 'cxl';
        }
        if (e.t === 'rrArrived' || (e.t === 'rrLeft' && e.through)) { const late = e.late || 0; D.arrived++; if (late > R.rr.RR.LATE_S) D.late++; else D.onTime++; D.worstLate = Math.max(D.worstLate, late); }
        if (e.t === 'pdSummary') {
          rec.sums.push({ ...e.sum, byPlayer: cmds.some(c => c.t === 'pdEndDay'), at: hm(S), audit: D27.itemAudit(S) });
          if (!rec.shots.summary) rec.shots.summary = { at: hm(S), save: save(S) };
        }
      }
      if (before !== after && !thrown) rec.swOther++;
      if (S.pd.ph === 'morning' && !rec.sw0[day]) rec.sw0[day] = S.track.switches.map(w => w.state);
      if (S.pd.ph === 'day') for (const q of R.rr.rrSwitchNeeds(S)) { const N = rec.needs[day] = rec.needs[day] || {}, kk = q.run + ':' + q.move + ':' + q.sw; if (!N[kk]) N[kk] = { sw: q.sw, st: q.want === 'reverse' ? 'R' : 'N', t: Infinity }; if (q.passed && N[kk].t === Infinity) N[kk].t = S.time; }
      // The moments for the screenshots (the best of each kind, by a score) and the mid-day saves of day 2.
      if (S.tick % 4 === 0) moments(Xr);
    }
  }
  function keep(rec, k, score, S) { if (score > 0 && (!rec.best[k] || score > rec.best[k])) { rec.best[k] = score; rec.shots[k] = { at: hm(S), save: save(S) }; } }
  function moments(Xr) {
    const { S, rec } = Xr, P = S.player, J = S.fr && S.fr.job, pbj = S.pb && S.pb.job;
    // A coach cut away mid-punch: the punch under way inside a coach, the more seated around him the better.
    if (P.in && pbj && pbj.k === 'punch' && pbj.on) keep(rec, 'punch', 1 + S.pax.list.filter(p => p.s === 'sitting' && p.stock === P.in.stock).length, S);
    // A boxcar being unloaded with goods on the cart: in the car or at its door with a good, the cart beside it loaded.
    const cart = X.frCartGoods(S).length;
    if (J && (J.k === 'take' || J.k === 'put') && S.rr.runs.some(r => r.kind === 'freight' && r.ph === 'stand') && (X.frInCar(S) !== null || X.frHeld(S).length) && cart) keep(rec, 'unload', cart * 2 + (X.frInCar(S) !== null ? 1 : 0), S);
    // The cargo platform stacked: the most goods in the storage cells (the player near them).
    let cells = 0; for (let i = 0; i < S.items.next; i++) if (S.items.alive[i] && S.items.where[i].kind === 'CELL') cells++;
    const cp = R.proto.PROTO.CARGO;
    if (P.x > cp.x0 && P.x < cp.x1 && P.z > cp.z0 && P.z < cp.z1) keep(rec, 'cargo', cells, S);
    // The cart on the path to town: pushed, loaded, between the crossing and the depot square.
    const cpose = X.frCartPose(S);
    if (cpose && cpose.held && cart && P.x > 15 && P.z < -12 && P.z > -31) keep(rec, 'path', cart + 1, S);
    // A delivery at a shop: handing in, the keeper out at the door (W's talk).
    if (J && J.k === 'deliver') { const st = J.steps[J.i], kp = R.fr.frKeeperDraw ? null : null; if (st && st.s === 'act' && (st.a === 'hand' || (st.a === 'keeper' && window.frKeeperState && (window.frKeeperState(S) || {}).carry))) keep(rec, 'deliver', 1 + (R.tf && window.tfDrawList ? window.tfDrawList(S).filter(q => q.act === 'talk').length : 0), S); }
    // The street with townsfolk (day 2, the moment most are out in the street), the night (the evening after 21:00).
    if (S.pd.day === 1 && sod(S) > 7 * 3600 && sod(S) < 19 * 3600 && S.tick % 40 === 0 && window.tfDrawList) keep(rec, 'street', window.tfDrawList(S).filter(q => q.z < -30 && q.z > -95 && Math.abs(q.x) < 14).length, S);
    if (S.pd.ph === 'evening' && sod(S) > 20.75 * 3600) keep(rec, 'night', 1, S);
    // The mid-day saves of day 2: mid-handling (a step under way), mid-aisle (inside a coach).
    if (S.pd.day === 1 && sod(S) > 9 * 3600) {
      if (!Xr.midH && J && J.steps && J.steps[J.i] && J.steps[J.i].s === 'act' && J.t0 >= 0) Xr.midH = { json: save(S), mem: JSON.stringify(Xr.bot.mem), hash: R.stateHash(S), at: hm(S) };
      if (!Xr.midA && P.in && pbj) Xr.midA = { json: save(S), mem: JSON.stringify(Xr.bot.mem), hash: R.stateHash(S), at: hm(S) };
    }
  }
  const done = S => S.pd.ph === 'summary' && S.pd.day >= ${DAYS - 1};
  function report(Xr) {
    const S = Xr.S, runs = Object.keys(Xr.rec.runs).map(Number).sort((a, b) => a - b).map(id => Xr.rec.runs[id]), minThrows = {};
    for (const d of Object.keys(Xr.rec.needs)) {
      const rows = Object.values(Xr.rec.needs[d]).sort((a, b) => a.t - b.t), st = (Xr.rec.sw0[d] || S.track.switches.map(w => w.state)).slice();
      let n = 0; for (const r of rows) if (st[r.sw] !== r.st) { n++; st[r.sw] = r.st; }
      minThrows[d] = n;
    }
    return { minThrows, runs, days: Xr.rec.days, sums: Xr.rec.sums, swOther: Xr.rec.swOther, audit: Xr.rec.audit, hours: Xr.rec.hours, hash: R.stateHash(S), tick: S.tick, at: hm(S),
      endAudit: D27.itemAudit(S), left: X.frToDeliver(S), picks: X.frPickups(S), les: Xr.rec.les, botLes: Xr.bot.mem.les,
      stats: Xr.bot.mem.stats, refusals: Xr.bot.mem.refusals, notes: Xr.bot.mem.notes, board: Xr.bot.mem.board, shotsAt: Object.fromEntries(Object.entries(Xr.rec.shots).map(([k, v]) => [k, v.at])),
      midH: Xr.midH && { hash: Xr.midH.hash, at: Xr.midH.at }, midA: Xr.midA && { hash: Xr.midA.hash, at: Xr.midA.at } };
  }
  function replay(mid, max) {
    const S = R.migrate(JSON.parse(mid.json)).state, loaded = R.stateHash(S), Xr = { S, bot: factory(R, JSON.parse(mid.mem)), rec: newRec() };
    for (let i = 0; i < max && !done(Xr.S); i++) step(Xr, 1);
    return { loaded, end: R.stateHash(Xr.S), tick: Xr.S.tick };
  }
  return { start, step, done, report, replay, hm };
})();`;

module.exports = async function checkD27Day() {
  const problems = [], P = m => problems.push(m);
  const t0 = Date.now();
  let shots = [];
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
    try {
      await page.evaluate(src => { window.__botsrc = src; }, PROTO_BOT_SRC);
      await page.evaluate(RUNNER);
      const flags = await page.evaluate(() => window.__railhead.d27.flags());
      if (Object.values(flags).some(v => !v)) P(`the D27 switches are not all on: ${JSON.stringify(flags)}`);
      // ---- Run A: two days ----
      await page.evaluate(() => { window.__A = window.__d27.start(1866); });
      for (let chunk = 0; chunk < 80; chunk++) {
        const fin = await page.evaluate(max => { const A = window.__A; for (let i = 0; i < 500; i++) { if (window.__d27.done(A.S) || A.S.tick > max) return true; window.__d27.step(A, 1); } return false; }, MAX_TICKS);
        if (fin) break;
      }
      const tA = Date.now();
      const A = await page.evaluate(() => window.__d27.report(window.__A));
      const W = await page.evaluate(() => { const sch = window.__railhead.proto.PROTO_SCHEDULE; return { runs: sch.length, stop: sch.filter(v => !v.through).length }; });
      // ---- The figures ----
      if (A.sums.length !== DAYS) P(`${A.sums.length} day summaries, expected ${DAYS} (ended at ${A.at})`);
      for (let d = 0; d < DAYS; d++) {
        const runs = A.runs.filter(r => r.day === d), D = A.days[d] || {}, sum = A.sums[d] || {}, tag = `day ${d + 1}`;
        if (runs.length !== W.runs) P(`${tag}: ${runs.length} runs, expected ${W.runs}`);
        const bad = runs.filter(r => r.ph !== 'gone' || r.auto);
        if (bad.length) P(`${tag}: runs not in and out: ${bad.map(r => `${r.svc} (${r.ph}${r.auto ? ', left alone' : ''})`).join(', ')}`);
        if (D.waves !== W.stop) P(`${tag}: ${D.waves} trains waved off by the player, expected ${W.stop}`);
        if (!(D.throws >= A.minThrows[d])) P(`${tag}: ${D.throws} switch throws, but the day's trains needed at least ${A.minThrows[d]}`);
        if (!(D.came > 0) || D.punched !== D.came || D.seated !== D.came || D.missed) P(`${tag}: travellers ${D.came} came, ${D.seated} seated, ${D.punched} punched, ${D.missed} missed`);
        if (D.unloaded !== D.unWant || D.loaded !== D.outWant) P(`${tag}: goods ${D.unloaded} unloaded of ${D.unWant} the trains brought for the player to unload (${D.collected} collected by their shop), ${D.loaded} loaded of ${D.outWant} for the railroad`);
        if (D.delivered !== D.inWant || D.wrongShop) P(`${tag}: ${D.delivered} goods delivered to the town of ${D.inWant} brought (${D.wrongShop} at the wrong shop)`);
        if (D.picked !== D.putOut) P(`${tag}: ${D.picked} goods picked up of ${D.putOut} the shops put out`);
        const want = { trains: D.arrived, onTime: D.onTime, late: D.late, punched: D.punched, missed: D.missed, unloaded: D.unloaded, delivered: D.delivered, seated: D.seated };
        const diff = Object.keys(want).filter(k => (sum[k] || 0) !== want[k]);
        if (diff.length) P(`${tag}: the summary says ${diff.map(k => `${k} ${sum[k]}`).join(', ')}; what happened: ${diff.map(k => `${k} ${want[k]}`).join(', ')}`);
        if (!sum.byPlayer) P(`${tag}: the day was not ended by the player (the summary came by itself at ${sum.at})`);
        if (sum.audit && sum.audit.length) P(`${tag}: itemAudit at the summary: ${sum.audit.slice(0, 2).join('; ')}`);
      }
      if (A.swOther) P(`a switch changed ${A.swOther} times without the player throwing it`);
      // D32 (the slower clock): the player gets 1.5 times as much done in a game hour, so the bot's evenings end
      // sooner (day 1 at 21:54) and the two days have fewer game hours to audit: 31 (35 at the old clock).
      // D31: the evening is one trip with the small cart, so the days end sooner still.
      if (A.hours < 28) P(`only ${A.hours} game hours audited`);
      for (const a of A.audit) P('itemAudit: ' + a);
      if (A.endAudit.length) P('itemAudit at the end: ' + A.endAudit.slice(0, 2).join('; '));
      if (!A.botLes.some(l => /show/.test(l)) || !A.botLes.some(l => /skip/.test(l)) || !A.les.some(l => /pdLessonReplay/.test(l))) P(`lessons: the bot did not both follow and skip them, with a replay (${A.botLes.join(', ')})`);
      if (Object.keys(A.board).length !== DAYS) P(`the bot did not read each morning's board`);
      // ---- Run B: the same again; the mid-day saves reloaded ----
      const B = await page.evaluate(max => { const Xr = window.__d27.start(1866); for (let i = 0; i < max && !window.__d27.done(Xr.S); i++) window.__d27.step(Xr, 1); return { hash: window.__railhead.stateHash(Xr.S), tick: Xr.S.tick }; }, MAX_TICKS);
      if (B.hash !== A.hash || B.tick !== A.tick) P(`the two days played twice gave different results (${A.hash} at tick ${A.tick}, ${B.hash} at tick ${B.tick})`);
      for (const [k, name] of [['midH', 'mid-handling'], ['midA', 'mid-aisle']]) {
        if (!A[k]) { P(`no save was made ${name} on day 2`); continue; }
        const C = await page.evaluate(([k, max]) => window.__d27.replay(window.__A[k], max), [k, MAX_TICKS]);
        if (C.loaded !== A[k].hash) P(`the save made ${name} (${A[k].at}) loaded with a different hash (${A[k].hash}, ${C.loaded})`);
        if (C.end !== A.hash || C.tick !== A.tick) P(`the two days reloaded ${name} (${A[k].at}) ended differently (${A.hash} at ${A.tick}, ${C.end} at ${C.tick})`);
      }
      const tC = Date.now();
      shots = await page.evaluate(() => Object.entries(window.__A.rec.shots).map(([k, s]) => ({ k, at: s.at, save: s.save })));
      for (const k of ['punch', 'unload', 'cargo', 'path', 'deliver', 'street', 'night', 'summary']) if (!shots.some(s => s.k === k)) P(`no ${k} moment recorded for the screenshots`);
      // ---- Report ----
      const mins = s => (s === null || s === undefined ? '-' : (s >= 0 ? '+' : '') + Math.round(s / 60));
      for (let d = 0; d < DAYS; d++) {
        const D = A.days[d] || {}, runs = A.runs.filter(r => r.day === d);
        console.log(`  day ${d + 1}: runs (minutes late in/out) ${runs.map(r => `${r.svc} ${mins(r.arrLate)}/${mins(r.depLate)}`).join(', ')}; worst ${Math.round((D.worstLate || 0) / 60)}`);
        console.log(`  day ${d + 1}: ${D.throws} throws (needed ${A.minThrows[d]}), ${D.waves} waved off; travellers ${D.came} came / ${D.seated} seated / ${D.punched} punched / ${D.missed} missed; goods ${D.unloaded}/${D.unWant} unloaded (${D.collected} collected by their shop), ${D.stored} stored, ${D.loaded}/${D.outWant} loaded, ${D.delivered}/${D.inWant} delivered (keeper took ${D.keeper}), ${D.picked}/${D.putOut} picked up; summary at ${(A.sums[d] || {}).at}`);
      }
      console.log(`  goods left at the end: to deliver ${JSON.stringify(A.left)}, at the shops ${JSON.stringify(A.picks)}`);
      console.log(`  bot ${JSON.stringify(A.stats)}; refusals ${JSON.stringify(A.refusals)}${A.notes.length ? '; notes ' + A.notes.join(', ') : ''}`);
      console.log(`  lessons: ${A.botLes.join(', ')}`);
      console.log(`  hashes: A ${A.hash} (tick ${A.tick}, ${A.at}), B ${B.hash}; mid-handling ${A.midH && A.midH.at}, mid-aisle ${A.midA && A.midA.at}; moments ${JSON.stringify(A.shotsAt)}`);
      console.log(`  run time: two days ${((tA - t0) / 1000).toFixed(1)} s, again and reloaded ${((tC - tA) / 1000).toFixed(1)} s; ${A.hours} game hours audited`);
      if (errors.length) P('portrait: console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // ---- Screenshots, portrait and landscape ----
  const frames = [];
  const LOOK = { cargo: [17, 8], street: [0, -60], path: null };
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P(`${orient}: the atlas did not load`));
      await page.waitForTimeout(400);
      if (await page.evaluate(() => document.getElementById('pdBoard').hidden)) P(`${orient}: the morning board is not open in a new game`);
      await page.screenshot({ path: screenshotPath(`d27-morning-${orient}`) });
      // A lesson card: Start the day; the switches lesson's first card holds the clock.
      const les = await page.evaluate(async () => {
        const R = window.__railhead; R.send({ t: 'pdStart' }); R.step(2);
        await new Promise(r => setTimeout(r, 500));
        const c = R.pdui.lesCard ? R.pdui.lesCard() : null;
        return { card: c, shown: !document.getElementById('pdLesson').hidden };
      });
      if (!les.shown || !les.card) P(`${orient}: no lesson card after Start the day (${JSON.stringify(les)})`);
      await page.screenshot({ path: screenshotPath(`d27-lesson-${orient}`) });
      for (const s of shots) {
        const f = await page.evaluate(async ([json, k, look]) => {
          const R = window.__railhead; R.importSave(json);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          if (look) R.pix.pixLookAt(look[0], look[1]);
          await new Promise(r => setTimeout(r, 700));
          const st = R.pix.stats;
          return { k, ms: +st.ms.toFixed(2), items: st.items, draws: st.draws, sum: !document.getElementById('pdSum').hidden, cut: R.pix.cut.slice() };
        }, [s.save, s.k, LOOK[s.k] || null]);
        await page.screenshot({ path: screenshotPath(`d27-${s.k}-${orient}`) });
        if (s.k === 'punch' && !f.cut.length) P(`${orient}: the punch moment: no coach drawn cut away`);
        // U's buttons over the world against the real P and F (portrait): at the punch moment a Punch button, at the
        // cargo platform and the delivery moments a goods button (Lift, Put, Deliver, Take or Leave cart): a tap sends its
        // command and the sim takes it (no refusal).
        if (orient === 'portrait' && ['punch', 'deliver', 'cargo'].includes(s.k)) {
          const tap = await page.evaluate(async k => {
            const R = window.__railhead, W = window, ost = W.simTick, seen = [];
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            await new Promise(r => setTimeout(r, 300));
            const want = k === 'punch' ? /Punch/ : /Lift|Put|Deliver|Pick up|Take cart|Leave cart|Open door|Close door/;
            const b = [...document.querySelectorAll('.pdAct')].find(x => !x.hidden && want.test(x.textContent));
            if (!b) return { none: [...document.querySelectorAll('.pdAct')].filter(x => !x.hidden).map(x => x.textContent) };
            W.simTick = function (S, cmds) { const ev = ost(S, cmds); for (const c of cmds || []) seen.push('cmd ' + c.t); for (const e of ev) if (/Refused$/.test(e.t)) seen.push('refused ' + e.why); return ev; };
            const label = b.textContent;
            try { b.click(); R.step(3); } finally { W.simTick = ost; }
            return { label, seen };
          }, s.k);
          if (tap.none) P(`${orient} ${s.k}: no button for it over the world (${tap.none.join(' / ')})`);
          else if (!tap.seen.some(x => /^cmd (pb|fr)/.test(x)) || tap.seen.some(x => /^refused/.test(x))) P(`${orient} ${s.k}: a tap on "${tap.label}": ${tap.seen.join(', ') || 'no command sent'}`);
          else console.log(`  ${s.k}: the "${tap.label}" button sent ${tap.seen.join(', ')}`);
        }
        if (s.k === 'summary' && !f.sum) P(`${orient}: the summary card is not shown`);
        frames.push(`${orient} ${s.k} (${s.at}): ${f.ms} ms, ${f.items} items, ${f.draws} sprites`);
      }
      if (errors.length) P(`${orient}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    } finally { await browser.close(); }
  }
  console.log('  frames (one frame each, unthrottled): ' + frames.join(' | '));
  console.log(`  screenshots: test-output/d27-{morning,lesson,${shots.map(s => s.k).join(',')}}-{portrait,landscape}.png`);
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
