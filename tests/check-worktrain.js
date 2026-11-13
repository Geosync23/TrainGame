// Check: the work train (plans/d32-tech.md section 2 and 11.5, Foundation's). Three days played by the D27 bot
// (tests/proto-bot.js) with a rail crew of 30, against the same three days with the line off.
// - Out and back on time each day: at the station on track 2 from 05:50 (standing at 06:00 when the day opens), away
//   at 06:20, at the railhead by 06:55, the working day, away from the railhead at 18:20, back at the station 19:15 to
//   19:35 when the clock runs that far (the bot may end its day earlier: then the line's evening is played through by
//   the jump to the next morning and nothing is lost).
// - Where it stands at the station: the crew car x -40 to -27, the engine 3 to 21, clear of the switches and the cart
//   crossing; on the line the engine behind the spiked front, moving up through the day.
// - The station's day is untouched: every railroad train comes in and leaves at the very tick it does with the line
//   off (so p1 and p4 are not delayed), and no railroad train is ever within 6u of the work train on the map.
// - It waits for a clear road: it does not back in from the east while a railroad train for the east still stands or
//   is on its way out (the bot's late evening trains show it), and its times shift by the wait.
// - Supplies: topped up when the train reaches the railhead (the first day a starting stock), never above the cap.
// - Every day is a working day (no day of rest): a week of the line alone has seven days' metres in its log.
const { openGame } = require('./browser');
const { PROTO_BOT_SRC } = require('./proto-bot');

module.exports = async function checkWorkTrain() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    await page.evaluate(src => { window.__botsrc = src; }, PROTO_BOT_SRC);
    const run = line => page.evaluate(line => {
      const R = window.__railhead, L = R.ln, LINE = L.LINE, factory = (0, eval)('(' + window.__botsrc + ')'), S = R.newState(1866, 'proto'), bot = factory(R);
      const out = { bad: [], rr: [], wt: [], days: [], sup: [], minGap: 1e9, sum: [] }, B = m => { if (out.bad.length < 12) out.bad.push(m); };
      const clk = () => { const s = (S.time + 5 * 3600) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
      const dayOf = () => Math.floor((S.time + 5 * 3600) / 86400);
      let first = true, lastDay = -1;
      for (let k = 0; k < 3.2 * 86400 / 8; k++) {
        const cmds = bot.decide(S) || [];
        if (first && line) { cmds.push({ t: 'dvSet', k: 'crew', v: 30 }); }
        first = false;
        const day0 = dayOf(), ev = R.simTick(S, cmds); bot.observe(S, ev);
        for (const e of ev) {
          if (/^rr(Arrived|Left|Gone|WavedOff|Ready)$/.test(e.t)) out.rr.push(S.tick + ' ' + e.t + ' ' + e.run + ' ' + (e.late || 0));
          if (e.t === 'wtPhase') { out.wt.push(dayOf() + ' ' + clk() + ' ' + e.ph); if (e.ph === 'stand') out.sup.push({ ...S.ln.sup }); }
          if (e.t === 'pdSummary') out.sum.push({ day: e.sum.day, at: clk(), late: e.sum.late, trains: e.sum.trains, hc: e.sum.hc });
        }
        if (line && S.ln) {
          const T = L.lnTrain(S), sod = (S.time + 5 * 3600) % 86400;
          // 06:00, the day opens: standing at the station, in its place
          if (dayOf() !== lastDay && sod >= 6 * 3600 && sod < 6 * 3600 + 16) {
            lastDay = dayOf();
            const cc = T.cars[4], en = T.cars[0];
            if (T.ph !== 'sStand' || T.at !== 'station' || !cc || cc.x0 !== -40 || cc.x1 !== -27 || en.x0 !== 3 || en.x1 !== 21 || T.moving) B(`day ${lastDay} 06:00: the work train is ${T.ph} at ${T.at}, cars ${JSON.stringify(T.cars.map(c => [c.k, c.x0, c.x1]))}`);
            if (!T.steps || Math.abs(T.steps.x - R.d27.PROTO.PLANK.x) > 0.01 || T.steps.z !== -2.6) B('the crew car\'s steps are not at the plank walk: ' + JSON.stringify(T.steps));
            out.days.push({ day: lastDay, f6: S.ln.f[5], crew: S.ln.crew, on: S.ln.on });
          }
          if (T.at === 'station') {
            const x0 = T.cars[4].x0, x1 = T.cars[0].x1;
            for (const tr of S.trains) { if (tr.away || !tr.consist.length) continue; for (const p of R.trainPoses(S.track, tr)) { const dx = Math.max(0, x0 - (p.x + p.len / 2), (p.x - p.len / 2) - x1), dz = Math.abs(p.z); const d = Math.hypot(dx, Math.max(0, dz - 4)); out.minGap = Math.min(out.minGap, d); if (d < 6) B(`${clk()}: ${tr.name} is ${d.toFixed(1)} u from the work train at the station`); } }
          }
          if (T.ph === 'stand') {
            const en = T.cars[0].x1 / LINE.M;
            if (en > S.ln.f[5] + 1e-6 || en < S.ln.f[5] - LINE.ENGINE_BACK_M - LINE.MOVE_UP_M - 2) B(`${clk()}: the engine stands at ${en.toFixed(1)} m, the spiked front is at ${S.ln.f[5].toFixed(1)}`);
            if (T.cars[4].x0 < 0) B('the work train hangs over the junction');
          }
          if ((T.ph === 'out' || T.ph === 'back') && T.x > S.ln.f[5] * LINE.M) B(`${clk()}: the work train runs off the finished track (${(T.x / LINE.M).toFixed(1)} m)`);
          for (const k of Object.keys(S.ln.sup)) if (S.ln.sup[k] < 0 || S.ln.sup[k] > LINE.SUP[k].cap + 1e-9) B(`supply ${k} at ${S.ln.sup[k]}`);
        }
        if (dayOf() >= 2 && (S.time + 5 * 3600) % 86400 >= 20 * 3600) break;   // three days, to 20:00 on the third
      }
      out.end = { day: S.pd.day, ph: S.pd.ph, f: S.ln ? S.ln.f.slice() : null, log: S.ln ? S.ln.log : null, lnDays: S.ln ? S.ln.days : 0 };
      return out;
    }, line);
    const off = await run(false), on = await run(true);
    for (const b of on.bad) P(b);
    if (off.rr.join('|') !== on.rr.join('|')) {
      const i = off.rr.findIndex((l, k) => l !== on.rr[k]);
      P(`the railroad's trains differ with the line on (first at "${off.rr[i]}" against "${on.rr[i]}"; ${off.rr.length} and ${on.rr.length} events)`);
    }
    if (off.rr.length < 40) P(`only ${off.rr.length} railroad train events in three days`);
    if (JSON.stringify(off.sum.map(s => [s.day, s.late, s.trains])) !== JSON.stringify(on.sum.map(s => [s.day, s.late, s.trains]))) P('the days\' summaries differ with the line on');
    // the first day's phases, in full (the day opens at 06:00 with the train standing)
    const d0 = on.wt.filter(l => l.startsWith('0 ')).map(l => l.slice(2));
    for (const [i, w] of ['06:00 sStand', '06:20 sOut', '06:25 out', '06:45 stand'].entries()) if (d0[i] !== w) P(`day 1: the work train's phase ${i + 1} is "${d0[i]}", expected "${w}"`);
    // every phase event is at its time, whichever day it falls on
    const T = { sIn: '05:40', sStand: '05:50', sOut: '06:20', out: '06:25', back: '18:20', gap: '19:00', eIn: '19:05', eStand: '19:15', eOut: '19:35', home: '19:45' };
    // (the evening's phases at their times or later by the wait for a clear road, in step with each other)
    const mins = t => +t.slice(0, 2) * 60 + +t.slice(3), held = {};
    for (const l of on.wt.slice(1)) {
      const [d, t, ph] = l.split(' ');
      if (ph === 'stand') { if (!(t >= '06:45' && t <= '06:55')) P(`the work train reached the railhead at ${t}`); }
      else if (/^e(In|Stand|Out)$|^home$/.test(ph)) { const late = mins(t) - mins(T[ph]); if (late < 0 || late > 180 || (held[d] !== undefined && late < held[d])) P(`day ${d}: the work train's phase ${ph} came at ${t} (its time is ${T[ph]})`); held[d] = Math.max(held[d] || 0, late); }
      else if (T[ph] !== t) P(`the work train's phase ${ph} came at ${t}, expected ${T[ph]}`);
    }
    console.log(`  the evening's wait for a clear road, by day: ${Object.entries(held).map(([d, v]) => `day ${+d + 1} ${v} min`).join(', ')}`);
    if (on.days.length !== 3) P(`the work train stood at the station at 06:00 on ${on.days.length} of 3 days`);
    on.days.forEach((d, i) => { if (i && !(d.f6 - on.days[i - 1].f6 > 120)) P(`day ${i}: only ${(d.f6 - on.days[i - 1].f6).toFixed(1)} m were spiked (was the evening lost at the jump to the next morning?)`); });
    if (on.end.lnDays !== 3) P(`the line counts ${on.end.lnDays} working days after three days`);
    if (on.sup.length !== 3) P(`the supplies were brought ${on.sup.length} times in three days`);
    on.sup.forEach((s, i) => { if (s.rock < 110 || s.ties < 360 || s.rails < 48 || s.kegs < 10) P(`day ${i + 1}: the dump after the train came: ${JSON.stringify(s)}`); });
    if (on.sum.length < 2) P(`only ${on.sum.length} summaries in three days`);
    for (const s of on.sum) if (!s.hc || s.hc.total !== 30) P(`day ${s.day + 1}: the summary has no head count of 30: ${JSON.stringify(s.hc)}`);
    console.log(`  with the line on: ${on.rr.length} railroad train events, the same as with it off; nearest a railroad train came to the work train at the station: ${on.minGap > 1e8 ? 'never on the map together' : on.minGap.toFixed(1) + ' u'}`);
    console.log(`  spiked at 06:00 each day: ${on.days.map(d => d.f6.toFixed(0)).join(', ')} m; the days ended at ${on.sum.map(s => s.at).join(', ')}; summaries late trains ${on.sum.map(s => s.late).join(', ')}`);
    console.log(`  the work train's phases: ${on.wt.join(' | ')}`);
    // A week of the line alone: every day worked.
    const wk = await page.evaluate(() => { const r = window.__railhead.ln.cw.cwSimDays(5, 30, 8); return { days: r.days, log: r.log }; });
    if (wk.days !== 8 || wk.log.length !== 7 || wk.log.some((q, i) => q.day !== i || !(q.m > 100))) P('a week of the line: ' + JSON.stringify(wk));
    console.log(`  a week of the line alone (30 men): ${wk.log.map(q => q.m.toFixed(0)).join(', ')} m a day`);
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
