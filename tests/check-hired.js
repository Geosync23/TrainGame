// Check: the hired station workers (D32 stage 2, Town; plans/d32-tech.md 7.3, 7.4 and 11.5).
// - A day with the player away on the line and 2 punchers, 3 loaders and 1 delivery man hired from dev mode: every
//   stopping train leaves with its work done (everyone punched, every good for the town unloaded, the railroad's goods
//   loaded), none by the grace rule; nobody missed, nothing left aboard; in the evening every good for the town is
//   delivered and every pickup fetched back to the OUT rows (nothing left in storage, at a shop, in a hand or on a
//   cart); the hands go home at night (the head count has them at the hotel) and come back in the morning; the
//   summary's line for them.
// - The same day with nobody hired: the away rules' counts (every traveller missed, the goods for the town left
//   aboard, the trains late by the relief man, levers thrown late), no good delivered but the shop's own collection.
// - The player at home (the scripted player of tests/proto-bot.js) with the same hands: they share the work, the player
//   and a hand never claim one good at the end of any tick, and the day is finished; the player's tap on a good in a
//   hand's keeping is refused; letting a loader go puts what he carries into storage.
// - itemAudit every game hour in every run; the same day twice gives the same hash; a save made mid-morning and
//   reloaded (the save's JSON) plays on to the same hash.
// - Seen (portrait and landscape): a puncher at work in the cut-away coach, loaders at a boxcar, the delivery man
//   handing in at a shop in town (test-output/hired-{punch,load,deliver}-{portrait,landscape}[-zoom].png); no
//   console errors.
const { openGame, screenshotPath } = require('./browser');
const { PROTO_BOT_SRC } = require('./proto-bot');

const RUN = `window.__hw = (() => {
  const R = window.__railhead;
  const hm = S => { const s = (S.time + 18000) % 86400; return 'day ' + (Math.floor((S.time + 18000) / 86400) + 1) + ' ' + String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
  const sod = S => (S.time + 18000) % 86400;
  // One game day from a new game: hire (p, l, d), the player away or played by the bot; at saveAt (ticks) a copy of the
  // state through JSON plays on beside it.
  function day({ p, l, d, away, bot, saveAt }) {
    const S = R.newState(1866, 'proto'), B = bot ? (0, eval)('(' + window.__botsrc + ')')(R) : null;
    const rec = { audit: [], hours: 0, overlap: [], c: {}, sent: [], unWant: 0, came: 0, sum: null, home: null, back: null, byPlayer: { punched: 0, stored: 0 } };
    R.simTick(S, [{ t: 'dvSet', k: 'punch', v: p }, { t: 'dvSet', k: 'load', v: l }, { t: 'dvSet', k: 'deliver', v: d }]);
    if (away) S.player.away = 'line';
    let copy = null;
    const t0 = performance.now();
    for (let i = 0; i < 10800 + 900 && !(rec.sum && rec.back); i++) {
      if (saveAt && S.tick === saveAt) copy = JSON.parse(JSON.stringify(S));
      const cmds = B ? B.decide(S) : [];
      const ev = R.simTick(S, cmds);
      if (B) B.observe(S, ev);
      for (const e of ev) {
        rec.c[e.t] = (rec.c[e.t] || 0) + (e.t === 'pbMissed' ? e.n : 1);
        if (e.t === 'hour') { rec.hours++; const a = R.d27.itemAudit(S); if (a.length && rec.audit.length < 4) rec.audit.push(hm(S) + ': ' + a.slice(0, 2).join('; ')); }
        if (e.t === 'hwSentOff') rec.sent.push({ run: S.rr.runs.find(r => r.id === e.run).svc, ready: e.ready, at: hm(S) });
        if (e.t === 'rrArrived') { const run = S.rr.runs.find(r => r.id === e.run); if (run.kind === 'freight') rec.unWant += R.fr.frRunIn(S, run).filter(([, c]) => !R.fr.FR.COLLECT.includes(R.cargo.COMMODITIES[c].type)).length; }
        if (e.t === 'pbSeated') rec.came++;
        if (e.t === 'pbPunched' && !e.by) rec.byPlayer.punched++;
        if (e.t === 'frStored' && !e.by) rec.byPlayer.stored++;
        if (e.t === 'pdSummary' && !rec.sum) {
          const I = S.items, left = { town: 0, shop: 0, crew: 0 };
          for (let k = 0; k < I.next; k++) { const w = I.alive[k] ? I.where[k] : null; if (!w) continue; if (w.kind === 'CREW') left.crew++; else if (w.kind === 'SHOP') left.shop++; else if (I.waybill[k].consignee && I.waybill[k].consignee.kind === 'BUSINESS') left.town++; }
          rec.sum = { ...e.sum, at: hm(S), left, aw: S.ln && S.ln.awStats ? { ...S.ln.awStats } : null, audit: R.d27.itemAudit(S) };
        }
      }
      const mine = HW_TEST.hwPlayerIds(S);
      if (S.hw) for (const m of S.hw.men) if (m.job && Number.isInteger(m.job.id) && mine.has(m.job.id) && rec.overlap.length < 4) rec.overlap.push(hm(S) + ': good ' + m.job.id);
      if (sod(S) === 23 * 3600 + 30 * 60 && !rec.home) rec.home = { roll: HW_TEST.hwRoll(S), count: R.ln.cw.hcCount(S) };
      if (rec.home && sod(S) === 6 * 3600 + 30 * 60 && !rec.back) rec.back = HW_TEST.hwRoll(S);
    }
    rec.ms = performance.now() - t0;
    rec.hash = R.stateHash(S);
    rec.hw = S.hw ? { tot: { ...S.hw.tot }, line: HW_TEST.hwSummaryLine(S) } : null;
    if (copy) {
      HW_TEST.hwCheckSaveShape(copy);
      const end = S.tick;
      while (copy.tick < end) R.simTick(copy, []);
      rec.reload = R.stateHash(copy);
    }
    return rec;
  }
  return { day, hm };
})();`;

module.exports = async function checkHired() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&dev=1' });
  try {
    await page.evaluate(src => { window.__botsrc = src; }, PROTO_BOT_SRC);
    await page.evaluate(RUN);
    // ---- the player away, 2 punchers, 3 loaders, 1 delivery man ----
    const A = await page.evaluate(() => window.__hw.day({ p: 2, l: 3, d: 1, away: true, saveAt: 2200 }));
    const A2 = await page.evaluate(() => window.__hw.day({ p: 2, l: 3, d: 1, away: true }));
    const s = A.sum || {};
    console.log(`  away, hired 2/3/1: ${A.sent.length} trains sent by their crews (${A.sent.filter(q => q.ready).length} with the work done); seated ${A.came}, punched ${s.punched}, missed ${s.missed}; unloaded ${s.unloaded} of ${A.unWant}, loaded ${s.loaded}, delivered ${s.delivered}, picked ${s.picked}; summary at ${s.at}; ${A.hours} hours audited; ${(A.ms / 1000).toFixed(2)} s`);
    console.log(`  the hands: ${A.hw && A.hw.line}`);
    if (!A.sum) P('away, hired: the day never reached its summary');
    if (A.sent.length < 7) P(`away, hired: only ${A.sent.length} stopping trains left`);
    for (const q of A.sent) if (!q.ready) P(`away, hired: ${q.run} left at ${q.at} with its work not done`);
    if (s.missed || A.c.pbMissed) P(`away, hired: ${s.missed || A.c.pbMissed} travellers missed`);
    if (s.punched !== A.came) P(`away, hired: ${s.punched} punched of ${A.came} seated`);
    if (s.unloaded !== A.unWant) P(`away, hired: ${s.unloaded} unloaded of ${A.unWant}`);
    if (s.aw && (s.aw.missed || s.aw.left)) P('away, hired: the away figures count work undone: ' + JSON.stringify(s.aw));
    if (s.left && (s.left.town || s.left.shop || s.left.crew)) P('away, hired: at the summary goods are still waiting: ' + JSON.stringify(s.left));
    if (!(s.delivered > 0) || !(s.picked > 0) || !(s.loaded > 0)) P(`away, hired: delivered ${s.delivered}, picked ${s.picked}, loaded ${s.loaded}`);
    if (!s.hw || !/2 punchers, 3 loaders, 1 delivery man: \d+ tickets punched/.test(s.hw)) P('away, hired: the summary has no line for the hands: ' + s.hw);
    if (A.audit.length || (s.audit && s.audit.length)) P('away, hired: itemAudit: ' + A.audit.concat(s.audit || []).slice(0, 3).join(' | '));
    if (A.hours < 18) P(`away, hired: only ${A.hours} hours audited`);
    if (!A.home || A.home.roll.length !== 6 || A.home.roll.some(q => q.at !== 'the hotel')) P('away, hired: at 23:30 the hands are not all home: ' + JSON.stringify(A.home && A.home.roll));
    if (A.home && !(A.home.count.total >= 6 + 19)) P(`away, hired: the head count holds ${A.home.count.total} (the townsfolk and the hands)`);
    if (!A.back || A.back.some(q => q.at === 'the hotel')) P('away, hired: the hands did not come to work the next morning: ' + JSON.stringify(A.back));
    if (A.hash !== A2.hash) P(`away, hired: the same day twice gives ${A.hash} and ${A2.hash}`);
    if (A.reload !== A.hash) P(`away, hired: a save made mid-morning plays on to ${A.reload}, not ${A.hash}`);
    if (A.overlap.length) P('away, hired: claims overlap: ' + A.overlap.join('; '));
    // ---- the player away, nobody hired ----
    const N = await page.evaluate(() => window.__hw.day({ p: 0, l: 0, d: 0, away: true }));
    const n = N.sum || {}, aw = n.aw || {};
    console.log(`  away, nobody hired: ${N.sent.length} trains sent by their crews (${N.sent.filter(q => q.ready).length} with the work done); away figures ${JSON.stringify(aw)}; delivered ${n.delivered}; summary at ${n.at}`);
    if (!N.sum) P('away, none: the day never reached its summary');
    if (N.sent.length < 7 || N.sent.some(q => q.ready)) P('away, none: the trains should all leave by the grace rule: ' + JSON.stringify(N.sent));
    if (aw.missed !== N.came || !(N.came > 0)) P(`away, none: ${aw.missed} missed of ${N.came} seated`);
    if (aw.left !== N.unWant) P(`away, none: ${aw.left} goods left aboard of ${N.unWant} brought for the town`);
    if (!(aw.late >= 7) || !(aw.levers > 0)) P(`away, none: trains late ${aw.late}, levers ${aw.levers}`);
    if (n.punched || n.unloaded || n.loaded || n.picked) P(`away, none: work done with nobody there: ${JSON.stringify(n)}`);
    if (N.hw) P('away, none: a store of hired men exists with nobody hired');
    if (N.audit.length) P('away, none: itemAudit: ' + N.audit.join(' | '));
    // ---- the player at home, played by the bot, with the same hands ----
    const H = await page.evaluate(() => window.__hw.day({ p: 2, l: 3, d: 1, away: false, bot: true }));
    const h = H.sum || {};
    console.log(`  at home with the hands: summary at ${h.at}; the player punched ${H.byPlayer.punched} and stored ${H.byPlayer.stored}, the hands ${JSON.stringify(H.hw && H.hw.tot)}; missed ${h.missed}; ${(H.ms / 1000).toFixed(2)} s`);
    if (!H.sum) P('at home: the day never reached its summary');
    if (H.overlap.length) P('at home: the player and a hand claim one good: ' + H.overlap.join('; '));
    if (H.audit.length || (h.audit && h.audit.length)) P('at home: itemAudit: ' + H.audit.concat(h.audit || []).slice(0, 3).join(' | '));
    if (h.missed) P(`at home: ${h.missed} travellers missed`);
    if (h.left && (h.left.town || h.left.shop)) P('at home: goods still waiting at the summary: ' + JSON.stringify(h.left));   // (a hand may still carry a good to its row when the player ends the day)
    if (!(H.hw && H.hw.tot.punched > 0 && H.hw.tot.unloaded > 0)) P('at home: the hands did no work: ' + JSON.stringify(H.hw));
    if (!(H.byPlayer.punched > 0 || H.byPlayer.stored > 0)) P('at home: the player did none of the work');
    // ---- a tap on a good in a hand's keeping; letting a loader go ----
    const T = await page.evaluate(() => {
      const R = window.__railhead, S = R.newState(1866, 'proto'), out = {};
      R.simTick(S, [{ t: 'dvSet', k: 'load', v: 1 }]);
      S.player.away = 'line';
      for (let i = 0; i < 10800; i++) { R.simTick(S, []); if (S.hw.men[0] && HW_TEST.hwHand(S, S.hw.men[0]) !== undefined) break; }
      const id = HW_TEST.hwHand(S, S.hw.men[0]);
      out.held = id !== undefined;
      delete S.player.away;
      const ev = R.simTick(S, [{ t: 'frAuto', item: id }]);
      out.refused = (ev.find(e => e.t === 'frRefused') || {}).why || null;
      const ev2 = R.simTick(S, [{ t: 'dvSet', k: 'load', v: 0 }]);
      out.after = S.items.where[id] && S.items.where[id].kind;
      out.men = S.hw.men.length;
      out.left = ev2.some(e => e.t === 'hwLeft');
      out.audit = R.d27.itemAudit(S);
      return out;
    });
    if (!T.held || T.refused !== 'A station hand has that') P('the player\'s tap on a good a hand carries: ' + JSON.stringify(T));
    if (T.after !== 'CELL' || T.men !== 0 || !T.left || T.audit.length) P('a loader let go with a good in his hands: ' + JSON.stringify(T));
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  // ---- Seen: portrait and landscape ----
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&d27=board,handling,town' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P(`${orient}: the atlas did not load`));
      const shots = await page.evaluate(() => {
        const R = window.__railhead, S = R.newState(1866, 'proto'), out = {};
        R.simTick(S, [{ t: 'dvSet', k: 'punch', v: 2 }, { t: 'dvSet', k: 'load', v: 3 }, { t: 'dvSet', k: 'deliver', v: 1 }]);
        S.player.away = 'line';
        const keep = (k, m, look) => { out[k] = { save: JSON.stringify({ state: S }), look, man: [m.x, Number.isFinite(m.y) ? m.y : 0, m.z], id: 'hw' + m.id }; };
        for (let i = 0; i < 10800 && Object.keys(out).length < 3; i++) {
          R.simTick(S, []);
          const men = S.hw.men;
          const pm = men.filter(m => m.in && !m.in.clm && m.steps && m.t0 >= 0 && (m.steps[m.i] || {}).a === 'punch').pop();
          if (!out.punch && pm && S.time % 64 === 0) keep('punch', pm, [pm.x, -12.6]);
          const ld = men.filter(m => m.k === 'load' && m.job && m.job.from && m.job.from.kind === 'CAR');
          if (!out.load && ld.length >= 2 && men.some(m => m.k === 'load' && m.car != null)) keep('load', ld[0], [ld[0].x + 2, 9]);
          const dm = men.find(m => m.k === 'deliver' && m.z < -36 && m.steps && (m.steps[m.i] || {}).a === 'hand' && m.t0 >= 0);
          if (!out.deliver && dm) keep('deliver', dm, [dm.x + 3, dm.z + 1]);
        }
        return out;
      });
      for (const k of ['punch', 'load', 'deliver']) {
        if (!shots[k]) { P(`${orient}: no moment found for ${k}`); continue; }
        const f = await page.evaluate(async ([json, look, man, id]) => {
          const R = window.__railhead, o = JSON.parse(json);
          delete o.state.player.away; o.state.player.x = look[0]; o.state.player.z = look[1];
          R.importSave(JSON.stringify(o));
          await new Promise(r => setTimeout(r, 3000));
          const S = R.state, L = { pb: HW_TEST.hwPbList(S), tf: HW_TEST.hwDrawList(S), cut: HW_TEST.hwCutaway(S) };
          return { cut: R.pix.cut.slice(), ms: R.pix.stats.ms, at: R.pix.pixToScreen(man[0], man[1], man[2]), inPb: L.pb.some(q => q.id === id), inTf: L.tf.some(q => q.id === id), myCut: L.cut.map(String) };
        }, [shots[k].save, shots[k].look, shots[k].man, shots[k].id]);
        await page.screenshot({ path: screenshotPath(`hired-${k}-${orient}`) });
        const vp = page.viewportSize(), cx = Math.max(130, Math.min(vp.width - 130, f.at.x)), cy = Math.max(130, Math.min(vp.height - 130, f.at.y));
        await page.screenshot({ path: screenshotPath(`hired-${k}-${orient}-zoom`), clip: { x: cx - 130, y: cy - 130, width: 260, height: 260 } });
        if (k === 'punch' && (!f.inPb || !f.myCut.length || f.cut.length < f.myCut.length)) P(`${orient}: the puncher is not drawn in a cut-away coach: ${JSON.stringify(f)}`);
        if (k !== 'punch' && !f.inTf) P(`${orient}: the ${k} hand is not in the draw list`);
        if (k === 'load' && !f.cut.length) P(`${orient}: the loaders' boxcar is not open to view`);
        if (f.ms > 8) P(`${orient}: ${k}: a frame took ${f.ms} ms`);
      }
      if (errors.length) P(`${orient}: console errors: ` + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
