// Check: the camp and the head count (plans/d32-tech.md sections 4 and 11.5, Crew's).
// - Tents by crew size (a tent to every four men: 5 men 2, 10 men 3, 15 men 4, 20 men 5, 25 men 7, 30 men 8), inside
//   the camp's rectangle and clear of each other; a cot each, no two men in one; the cook tent, table, fire, barrel.
// - The camp's day with 30 men: up after 05:05, at breakfast at 05:20, every man aboard by 06:20 (none misses the
//   train); back in the camp in the evening, at supper at 20:00, by the fire at 20:40, every man in his cot by 21:45.
// - Lit at night: the tents while men are up, the fire burning (it glows in the dark); dark and asleep at 22:30.
// - The head count at 22:00: every rail man home on an ordinary day; a man kept out on the line when the train goes
//   is reported by name and place, and joins his gang again next morning.
// - In the real game the townsfolk are counted too (the roll is the townsfolk and the rail men) and the day's summary
//   and the dev panel show the count.
// - Seen: the camp at supper, at night with the player among the tents (men in their cots), asleep from outside.
const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkCamp() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&dev=1' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, L = R.ln, LINE = L.LINE, PR = R.d27.PROTO, bad = [], B = m => { if (bad.length < 14) bad.push(m); };
      const mk = crew => ({ seed: 1866, time: 0, tick: 0, track: { world: 'proto' }, player: { x: 0, z: 0 }, dv: { ...L.dvNewStore(), crew } });
      const step = S => { S.time += 8; S.tick++; const ev = []; L.wtTick(S, ev); L.cw.cwTick(S, ev); return ev; };
      const out = { bad, tents: {}, day: {}, hc: [] };
      // ---- tents by crew size ----
      for (const n of LINE.CREW.slice(1)) {
        const S = mk(n); for (let i = 0; i < 20; i++) step(S);
        const it = L.cw.cpItems(S), backs = it.filter(q => /^camp\/tent\/back/.test(q.key)), C = PR.CAMP;
        out.tents[n] = backs.length;
        for (const q of it) { const b = q.box; if (q.x + b[0] < C.x0 || q.x + b[2] > C.x1 || q.z + b[1] < C.z0 || q.z + b[3] > C.z1) B(`crew ${n}: ${q.id} (${q.key}) is outside the camp`); if (!PIX_ATLAS.frames[q.key]) B('no frame ' + q.key); }
        for (let a = 0; a < backs.length; a++) for (let b = a + 1; b < backs.length; b++) if (Math.abs(backs[a].x - backs[b].x) < 4.5 && Math.abs(backs[a].z - backs[b].z) < 6) B(`crew ${n}: two tents overlap`);
        const cots = S.cw.men.map((m, i) => CW_TEST.cwCot(i));
        cots.forEach((c, i) => { const T = CW_TEST.cwTent(i >> 2); if (Math.abs(c.x - T.x) > 2.2 || Math.abs(c.z - T.z) > 2.9) B(`man ${i}'s cot is outside his tent`); for (let j = 0; j < i; j++) if (Math.hypot(c.x - cots[j].x, c.z - cots[j].z) < 0.8) B(`men ${i} and ${j} share a cot`); });
        for (const k of ['camp/cooktent/back', 'camp/table', 'camp/bench', 'camp/barrel', 'camp/toolrack']) if (!it.some(q => q.key === k || q.key === k + '_lit')) B(`crew ${n}: the camp has no ${k}`);
        if (S.cw.men.some(m => m.st !== 'bed') && n !== 0) B(`crew ${n}: at 05:05 not every man is in his cot`);
        const names = new Set(S.cw.men.map((m, i) => CW_TEST.cwName(S, i))), looks = new Set(S.cw.men.map(m => m.who));
        if (names.size !== n) B(`crew ${n}: two men share a name`);
        if (n >= 10 && looks.size < 3) B(`crew ${n}: only ${looks.size} looks among the men`);
      }
      { const S = mk(0); for (let i = 0; i < 40; i++) step(S); if (L.cw.cpItems(S).length) B('a camp stands with no crew'); }
      // ---- the camp's day, 30 men, the second day ----
      const S = mk(30), at = {}, marks = { 5.33: 'breakfast', 6.34: 'gone', 20: 'supper', 20.67: 'fire', 21.75: 'abed', 22.5: 'night' };
      let hc = null;
      for (let i = 0; i < 2 * 10800 - 10; i++) {
        const ev = step(S), d = Math.floor(S.time / 86400), sod = (S.time + 18000) % 86400;
        for (const e of ev) if (e.t === 'hcDone' && d === 1) hc = e;
        if (d !== 1) continue;
        for (const [h, name] of Object.entries(marks)) if (sod === Math.round(h * 450) * 8) {
          const c = {}; for (const m of S.cw.men) { const k = m.st + (m.st === 'camp' ? '/' + m.a : ''); c[k] = (c[k] || 0) + 1; }
          const it = L.cw.cpItems(S);
          at[name] = { c, lit: it.filter(q => /^camp\/tent\/roof_lit/.test(q.key)).length, fire: it.some(q => /^camp\/fire\/\d/.test(q.key)), dl: L.cw.cwDrawList(S, 'station').map(q => q.anim), ids: L.cw.cwDrawList(S, 'station').every(q => /^cw\d+$/.test(q.id)) };
        }
        for (const m of S.cw.men) if (m.pl === 1) { const C = PR.CAMP, inCamp = m.x > C.x0 - 0.5 && m.x < C.x1 + 0.5 && m.z > C.z0 && m.z < C.z1 + 0.5, onWay = m.x > -50 && m.x < -38 && m.z > -35 && m.z < -2; if (!inCamp && !onWay) B(`man ${m.id} (${m.st}) walks at ${m.x}, ${m.z}, off the camp and the way to the train`); }
      }
      out.day = at; out.hcDay = hc;
      // ---- a man kept out on the line ----
      const S2 = mk(30);
      let ev2 = [], kept = null;
      for (let i = 0; i < 10800 * 2; i++) {
        const sod = (S2.time + 18000) % 86400, d = Math.floor(S2.time / 86400);
        if (d === 0 && sod === 17 * 3600) { kept = S2.cw.men[7]; }
        if (d === 0 && kept && sod >= 17 * 3600 && sod < 18.4 * 3600 && kept.pl === 2) { kept.st = 'rest'; kept.a = 'sit'; kept.t = S2.time; }   // (he sits tight until the train has gone)
        for (const e of step(S2)) if (e.t === 'hcDone') ev2.push({ d, ...e, count: L.cw.hcCount(S2), st: kept.st });
        if (d === 1 && sod === 10 * 3600) out.keptNext = { st: kept.st, stage: kept.stage, pl: kept.pl };
      }
      out.hcKept = ev2; out.keptName = CW_TEST.cwName(S2, 7);
      return out;
    });
    for (const b of r.bad) P(b);
    const WANT = { 5: 2, 10: 3, 15: 4, 20: 5, 25: 7, 30: 8 };
    for (const [n, t] of Object.entries(WANT)) if (r.tents[n] !== t) P(`a crew of ${n} has ${r.tents[n]} tents, not ${t}`);
    const D = r.day, sum = (o, re) => Object.entries(o || {}).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
    if (!D.breakfast || sum(D.breakfast.c, /^camp/) < 28 || !D.breakfast.dl.includes('eat')) P('at 05:20 the men are not at breakfast: ' + JSON.stringify(D.breakfast && D.breakfast.c));
    if (!D.gone || sum(D.gone.c, /^ride$/) !== 30) P('at 06:20 not every man is aboard: ' + JSON.stringify(D.gone && D.gone.c));
    if (!D.supper || sum(D.supper.c, /^camp\/eat|^toCamp|^camp\/toSeat/) < 28 || !D.supper.fire) P('at 20:00 the men are not at supper by a burning fire: ' + JSON.stringify(D.supper && D.supper.c));
    if (!D.fire || sum(D.fire.c, /^camp/) !== 30 || D.fire.lit < 6 || !D.fire.dl.includes('sit') || !D.fire.ids) P('at 20:40 the men are not by the fire with the tents lit: ' + JSON.stringify(D.fire && [D.fire.c, D.fire.lit]));
    if (!D.abed || sum(D.abed.c, /^bed$/) !== 30) P('at 21:45 not every man is in his cot: ' + JSON.stringify(D.abed && D.abed.c));
    if (!D.night || D.night.lit || D.night.dl.length) P('at 22:30 the camp is not dark and asleep');
    if (!r.hcDay || r.hcDay.total !== 30 || r.hcDay.home !== 30) P('the head count of an ordinary day: ' + JSON.stringify(r.hcDay));
    const k0 = r.hcKept[0], k1 = r.hcKept[1];
    if (!k0 || k0.total !== 30 || k0.home !== 29 || k0.count.out.length !== 1 || k0.count.out[0].name !== r.keptName || !/^the line at \d+ m$/.test(k0.count.out[0].where) || k0.st !== 'left') P('a man left on the line is not reported by the head count: ' + JSON.stringify(k0));
    if (!r.keptNext || r.keptNext.pl !== 2 || r.keptNext.stage < 0 || r.keptNext.st === 'left') P('the man left on the line did not join his gang the next morning: ' + JSON.stringify(r.keptNext));
    if (!k1 || k1.home !== 30) P('the night after, the man is still not home: ' + JSON.stringify(k1));
    console.log(`  tents by crew: ${Object.entries(r.tents).map(([n, t]) => `${n} men ${t}`).join(', ')}; left on the line: "${k0 && k0.count.out[0] && k0.count.out[0].name}: ${k0 && k0.count.out[0] && k0.count.out[0].where}"`);
    // ---- The real game: the townsfolk counted, the summary and the dev panel ----
    const real = await page.evaluate(() => {
      const R = window.__railhead, S = R.newState(1866, 'proto');
      let hc = null, first = true, n = 0;
      while (!hc && n++ < 9000) { const ev = R.simTick(S, first ? [{ t: 'pdStart' }, { t: 'dvSet', k: 'crew', v: 10 }] : []); first = false; for (const e of ev) if (e.t === 'hcDone') hc = e; }
      const c = R.ln.cw.hcCount(S), roll = R.ln.cw.hcRoll(S);
      return { hc, total: c.total, home: c.home, out: c.out, tf: roll.filter(p => /^tf_/.test(p.id)).length, cw: roll.filter(p => /^cw/.test(p.id)).length, agents: R.tf.TF_AGENTS.length, clock: (S.time + 18000) % 86400, shape: roll.every(p => p.id && p.name && p.home && p.at), lnhc: S.ln.hc };
    });
    if (!real.hc) P('no head count at 22:00 in the real game');
    else {
      if (real.clock !== 22 * 3600) P(`the head count came at second ${real.clock} of the day`);
      if (real.tf !== real.agents || real.cw !== 10 || real.hc.total !== real.agents + 10 || !real.shape) P(`the roll is ${real.tf} townsfolk and ${real.cw} rail men (total ${real.hc.total}), expected ${real.agents} and 10`);
      // (with nobody playing the station the work train waits for a clear road in the evening, so the count may
      // rightly report the crew still aboard: who is out is printed, not judged)
      if (!real.lnhc || real.lnhc.total !== real.hc.total) P('the count is not kept for the dev panel and the summary');
      console.log(`  the real game at 22:00: ${real.hc.home} of ${real.hc.total} home (${real.tf} townsfolk, ${real.cw} rail men)${real.out.length ? '; out: ' + real.out.map(p => p.name + ' (' + p.where + ')').join(', ') : ''}`);
    }
    // ---- Seen ----
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
    const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    await page.evaluate(() => { const R = window.__railhead; R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(2); R.pix.warm(true); });
    const to = h => page.evaluate(h => { const R = window.__railhead, S = R.state, T = 86400 + Math.round(h * 450) * 8 - 5 * 3600; while (S.time < T) { S.time += 8; S.tick++; const ev = []; R.ln.wtTick(S, ev); R.ln.cw.cwTick(S, ev); } }, h);
    const drawn = () => page.evaluate(() => { const X = window.__railhead.pix.PIX, k = re => X.drawn.filter(d => re.test(d.key)).length; return { men: k(/^ppl\/navvy_.\/(sit|eat|drink|walk|idle)/), lie: k(/^ppl\/navvy_.\/lie/), cots: k(/^camp\/cot/), tents: k(/^camp\/tent\/roof/), lit: k(/^camp\/tent\/roof_lit/), fire: k(/^camp\/fire\/\d/), errs: Object.keys(X.errs) }; });
    await to(20.2); await page.evaluate(() => window.__railhead.pix.placePlayer(-58, -31)); await frames(6);
    const a = await drawn();
    if (a.men < 20 || !a.fire || a.tents < 4) P('the camp at supper is not drawn: ' + JSON.stringify(a));
    await page.screenshot({ path: screenshotPath('d32-camp-supper-portrait') });
    await to(21.8); await page.evaluate(() => window.__railhead.pix.placePlayer(-60, -40)); await frames(6);
    const b = await drawn();
    if (b.lie < 8 || b.cots < 8) P('with the player among the tents the men are not seen in their cots: ' + JSON.stringify(b));
    await page.screenshot({ path: screenshotPath('d32-camp-night-portrait') });
    await page.evaluate(() => window.__railhead.pix.placePlayer(-44, -28)); await frames(6);
    const c = await drawn();
    if (c.lie || c.cots || c.tents < 3) P('from outside the camp the tents are not closed: ' + JSON.stringify(c));
    if (a.errs.length || b.errs.length || c.errs.length) P('the renderer reported: ' + a.errs.concat(b.errs, c.errs).join(', '));
    await page.screenshot({ path: screenshotPath('d32-camp-asleep-portrait') });
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
