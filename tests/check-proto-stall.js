// Check: the prototype never stops progressing (D25; the designer's report of 2026-11-11: "partway into the day the
// trains stopped arriving even though I'd thrown the switches it pointed out").
//
// Three causes found playing the published page like a person would (following only the arrow and the Next job line,
// late, slow, leaving a switch wrong); each part below failed before the fix:
// 1. The page's game loop stopped (the clock, the trains, the player: everything) the first time the player picked
//    up goods for the town during the day: the Next job line's "put them in the storage shed" threw (pdBay(null)),
//    inside the frame, before the next frame was asked for. Here: a good for the town in hand at 09:00; the Next job
//    line and the arrow work (the arrow at the good's own bay), and the page keeps ticking at 4x with no errors.
// 2. Two trains from the same end, both held off the map (the line not clear while a late train left that way), came
//    in on the same tick at the same spot, one on top of the other, and each waited for the other for ever. Here: F1
//    and P2 (both from the east) due in at the same moment; a player throws every switch a train waits at; both
//    arrive, and two of the railroad's trains never stand on the same track at once.
// 3. The Next job line asked for the way in of a train that could not come in (its track still taken by a standing
//    train) ahead of that standing train's work, so the player walked off to far switches while the train holding
//    everything up stood. Here: P3 standing at track 1 at 14:00 with travellers coming, P4 due at 14:20 to track 1:
//    for half an hour the line never asks for P4's way in while P3 is there, and it names P3 (punch, send off, or
//    "P4 cannot come in yet: P3 ...").

const { openGame } = require('./browser');

module.exports = async function checkProtoStall() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    // ---- 1. Goods for the town in hand in the day: the page keeps running ----
    const one = await page.evaluate(async () => {
      const R = window.__railhead, S = R.newState(1866, 'proto');
      R.rr.protoDebugScenario(S, 9, 0, ['f1']);
      for (const r of S.rr.runs) if (r.ph === 'due') { r.ph = 'gone'; r.skipped = true; }   // nothing else comes: the line is about the goods
      const run = S.rr.runs.find(r => r.svc === 'f1' && r.ph === 'stand'), tr = S.trains[run.slot];
      const goods = [].concat(...tr.consist.map(c => R.cargo.itemsAt(S, { kind: 'CAR', stockId: c.id }))).filter(id => R.pg.pgShopOf(S.items.waybill[id]));
      if (!goods.length) return { err: 'no goods for the town aboard F1' };
      const id = goods[0];
      for (let i = 0; i < 400 && !R.carry.carryHeld(S).includes(id); i++) R.simTick(S, i === 0 ? [{ t: 'carryPick', id }] : []);
      if (!R.carry.carryHeld(S).includes(id)) return { err: 'the player could not pick up a good for the town from F1' };
      R.importSave(JSON.stringify({ state: S }));
      const out = { ph: R.state.pd.ph };
      try { const j = R.pdui.job(); out.key = j.key; out.t = j.t; out.hint = !!R.pdui.hint(); } catch (e) { out.threw = String(e); }
      const tag = R.cargo.itemTag(R.state.items.waybill[id]), bay = R.state.bayTags.storage.indexOf(tag), B = R.cargo.BLD_BAYS.storage.bays[bay];
      out.bayAt = B && { x: B.x, z: B.z };
      const t0 = R.state.tick;
      R.setSpeed(4); await new Promise(r => setTimeout(r, 1500)); R.setSpeed(0);
      out.ticks = R.state.tick - t0;
      return out;
    });
    if (one.err) P('1: ' + one.err);
    else {
      if (one.threw) P(`1: the Next job line threw with goods for the town in hand in the day: ${one.threw}`);
      else if (one.key !== 'stow') P(`1: the Next job line is '${one.key}', expected the goods put in the storage shed`);
      else if (!one.t || !one.bayAt || Math.hypot(one.t.x - one.bayAt.x, one.t.z - one.bayAt.z) > 0.01) P(`1: the arrow points at ${JSON.stringify(one.t)}, not the good's own bay ${JSON.stringify(one.bayAt)}`);
      if (!(one.ticks > 30)) P(`1: the page's game stopped with goods for the town in hand: ${one.ticks} ticks in 1.5 s at 4x`);
      console.log(`  1: goods in hand at 09:00: line '${one.key}', ${one.ticks} ticks in 1.5 s at 4x`);
    }
    if (errors.length) P('1: console errors: ' + errors.slice(0, 3).join(' | '));

    // ---- 2. Two trains from the same end let in on the same tick ----
    const two = await page.evaluate(() => {
      const R = window.__railhead, S = R.newState(1866, 'proto'), RR = R.rr;
      R.simTick(S, [{ t: 'pdStart' }]);
      const f1 = RR.rrDebugJump(S, 'f1'), p2 = S.rr.runs.find(r => r.svc === 'p2' && r.day === f1.day);
      // Both held off the map until now (as behind a late through train leaving east): both may come in this tick.
      S.time = Math.ceil((RR.rrEnterAt(p2) + 60) / 8) * 8;
      const log = [], tick0 = S.tick;
      let overlap = null, entered = {};
      for (let i = 0; i < 1350 && !(f1.ph === 'stand' && p2.ph === 'stand'); i++) {
        // A player who throws every switch a train waits at (when it can be thrown).
        const cmds = [];
        for (const tr of S.trains) if (tr.owner === 'rr' && tr.swWait !== undefined && tr.swWait !== null && !R.switchLockReason(S, tr.swWait)) cmds.push({ t: 'throwSwitch', sw: tr.swWait });
        const ev = R.simTick(S, cmds);
        for (const e of ev) if (e.t === 'rrEntered' || e.t === 'rrArrived') { const run = S.rr.runs.find(r => r.id === e.run); log.push(e.t + ' ' + run.svc + ' @' + (S.tick - tick0)); if (e.t === 'rrEntered') entered[run.svc] = S.tick; }
        // Never two of the railroad's trains on the same stretch of track.
        const on = S.trains.filter(tr => tr.owner === 'rr' && !tr.away && tr.consist.length);
        for (let a = 0; a < on.length && !overlap; a++) for (let b = a + 1; b < on.length && !overlap; b++) {
          const A = [], B = [];
          for (const [e, x, y] of trainSegsOf(R, S, on[a])) A.push([e, x, y]);
          for (const [e, x, y] of trainSegsOf(R, S, on[b])) B.push([e, x, y]);
          if (A.some(([e, x, y]) => B.some(([e2, x2, y2]) => e === e2 && x < y2 - 1e-6 && x2 < y - 1e-6))) overlap = `trains ${on[a].id} and ${on[b].id} at tick ${S.tick - tick0}`;
        }
      }
      function trainSegsOf(R, S, tr) {   // the track under a train: from its front back its length
        const out = [], T = S.track, rev = { e: tr.front.e, s: tr.front.s, d: -tr.front.d };
        R.trackWalk(T, rev, R.trainLength(tr), out);
        return out;
      }
      return { f1: f1.ph, p2: p2.ph, log, overlap, same: entered.f1 !== undefined && entered.f1 === entered.p2,
        status: S.trains.filter(tr => tr.owner === 'rr' && !tr.away).map(tr => tr.status) };
    });
    if (two.f1 !== 'stand' || two.p2 !== 'stand') P(`2: F1 and P2 held off the map together did not both come in (F1 ${two.f1}, P2 ${two.p2}; ${two.status.join(', ')}; ${two.log.join(', ')})`);
    if (two.same) P('2: F1 and P2 came in on the same tick at the same spot');
    if (two.overlap) P('2: two of the railroad\'s trains stood on the same track: ' + two.overlap);
    console.log(`  2: F1 and P2 due in together: ${two.log.join(', ')}`);

    // ---- 3. The Next job line while a train's track is taken ----
    const three = await page.evaluate(() => {
      const R = window.__railhead, S = R.newState(1866, 'proto');
      R.rr.protoDebugScenario(S, 14, 0, ['p3']);
      R.importSave(JSON.stringify({ state: S }));
      const X = R.state, p4 = X.rr.runs.find(r => r.svc === 'p4' && r.day === 0), seen = {};
      let bad = null, named = false;
      for (let i = 0; i < 225; i++) {   // half an hour; the player stands still
        R.simTick(X, []);
        if (i % 5) continue;
        const j = R.pdui.job();
        seen[j.text.replace(/[0-9]+/g, 'N')] = 1;
        if (/P3/.test(j.text)) named = true;
        if (!bad && /^sw/.test(j.key) && /for P4/.test(j.text)) bad = j.text;
      }
      return { bad, named, seen: Object.keys(seen), p4: p4.ph };
    });
    if (three.bad) P(`3: the Next job line asked for P4's way in while P3 still stands at its track: "${three.bad}"`);
    if (!three.named) P(`3: the Next job line never named P3, the train holding P4 up: ${three.seen.join(' | ')}`);
    console.log(`  3: P3 at track 1, P4 due: the line said ${three.seen.join(' | ')}`);
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
