// Check: the rail crew (plans/d32-tech.md sections 3 and 11.5, Crew's). The line alone (the work train and the crew)
// is played on a bare state, as cwSimDays does, with a crew of 30 and seed 1866.
// - Every man's states through a day: bed, camp, the muster, aboard, tool, walk, work, the meal, aboard, the camp, bed.
// - No two men on one spot: no man stands within 0.5u of another, and walkers pass through each other only rarely.
// - Nobody works without his stage's tool; every man on the line stands on ground lnWalkable allows.
// - The six gangs at work in the morning of day 3, each with its own animations over the day; the meal at noon.
// - The same day twice, and the same after a save and reload in mid morning (the state through JSON).
// - The pace: 30 men finish in 13 to 15 working days, 5 men in 5.5 to 6.5 times that (cwSimDays).
// - cwTick under 0.1 ms a tick with 30 men; cwGang, cwDrawList and cwBoost as plan 11.4 signs them.
const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkCrew() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&dev=1' + (process.env.CREW_Q || '') });
  try {
    const day = await page.evaluate(() => {
      const R = window.__railhead, L = R.ln, LINE = L.LINE, bad = [], B = m => { if (bad.length < 14) bad.push(m); };
      const mk = () => ({ seed: 1866, time: 0, tick: 0, track: { world: 'proto' }, player: {}, dv: { ...L.dvNewStore(), crew: 30 } });
      const step = S => { S.time += 8; S.tick++; const ev = []; L.wtTick(S, ev); L.cw.cwTick(S, ev); return ev; };
      const clk = S => { const s = (S.time + 18000) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
      const hash = S => R.stateHash({ cw: S.cw, ln: S.ln });
      const S = mk(), seen = [], anims = {}, out = { bad, near: 0, pass: 0, manTicks: 0, gangs: null, meal: null, ms: 0, worst: 0, n: 0 };
      const ORDER = ['bed', 'camp', 'toTrain', 'ride', 'work', 'meal', 'work', 'toTrain', 'ride', 'toCamp', 'camp', 'bed'];
      const VALID = new Set(['bed', 'camp', 'toTrain', 'ride', 'tool', 'walk', 'work', 'rest', 'meal', 'toCamp', 'left', 'idle']);
      let mid = null, hMid = null;
      const moved = [], was = [];
      for (let i = 0; i < 2 * 10800; i++) {
        const t0 = performance.now();
        step(S);
        const dt = performance.now() - t0, d = Math.floor(S.time / 86400), sod = (S.time + 18000) % 86400, men = S.cw.men;
        if (d < 1) continue;                                   // (the second day: the fronts are spread and every gang is at work)
        if (sod >= 7 * 3600 && sod < 18 * 3600) { out.ms += dt; out.n++; out.worst = Math.max(out.worst, dt); }
        if (sod === 10 * 3600) { mid = JSON.parse(JSON.stringify(S)); hMid = hash(S); }
        men.forEach((m, k) => {
          if (!VALID.has(m.st)) B(`${clk(S)}: man ${k} is in the state "${m.st}"`);
          const q = seen[k] || (seen[k] = []);
          if (q[q.length - 1] !== m.st) q.push(m.st);
          if (m.st === 'work' && L.lnHours(S).work && !CW.TOOLS[m.stage].includes(m.tool)) B(`${clk(S)}: man ${k} works at stage ${m.stage} with ${m.tool}`);
          if (m.pl === 2 && !L.lnWalkable(S.seed, m.x, m.z, S.ln.f[1])) B(`${clk(S)}: man ${k} (${m.st}) stands where no one can, at ${m.x}, ${m.z}`);
          if (!(m.sta >= 0 && m.sta <= 100)) B(`man ${k}'s stamina is ${m.sta}`);
        });
        men.forEach((m, k) => { const q = m.x + ',' + m.z; if (m.mv || m.w > 0 || was[k] !== q) moved[k] = S.tick; was[k] = q; });
        for (let a = 0; a < men.length; a++) for (let b = a + 1; b < men.length; b++) {
          const A = men[a], Bm = men[b];
          if (!A.pl || A.pl !== Bm.pl) continue;
          const dd = Math.hypot(A.x - Bm.x, A.z - Bm.z);
          const am = S.tick - (moved[a] || 0) < 3, bm = S.tick - (moved[b] || 0) < 3;   // (walking, waiting for room on his way, or stopped this very moment)
          if (dd < 0.5 && !(am && bm)) { if (am || bm) out.pass++; else { out.near++; if (out.near <= 3) B(`${clk(S)}: men ${a} (${A.st} ${A.a}) and ${b} (${Bm.st} ${Bm.a}) stand ${dd.toFixed(2)} u apart at ${A.x}, ${A.z}`); } }
          else if (dd < 0.25) out.pass++;
        }
        out.manTicks += men.filter(m => m.pl).length;
        for (const q of L.cw.cwDrawList(S, 'line').concat(L.cw.cwDrawList(S, 'station'))) { anims[q.anim] = 1; if (!PIX_ATLAS.frames[`ppl/${q.who}/${q.anim}/se/${q.frame}`]) B(`no frame ppl/${q.who}/${q.anim}/se/${q.frame}`); if (q.held && !PIX_ATLAS.frames[q.held.key.replace('<dir>', 'se')]) B('no frame ' + q.held.key); if (q.prop && !PIX_ATLAS.frames[q.prop.key]) B('no frame ' + q.prop.key); }
        if (sod === 10.5 * 3600) {
          out.gangs = [0, 1, 2, 3, 4, 5].map(k => L.cw.cwGang(S, k));
          out.fronts = S.ln.f.slice();
          const dl = L.cw.cwDrawList(S, 'line');
          out.dl = { n: dl.length, keys: Object.keys(dl[0] || {}).join(','), ids: dl.every(q => Number.isInteger(q.id) && q.who && typeof q.name === 'string' && Number.isFinite(q.x) && Number.isFinite(q.z)) };
          out.props = CW_TEST.cwProps(S, 'line').map(q => q.key);
        }
        if (sod === 12.5 * 3600) { const G = CW_TEST.cwGeo(S); out.meal = { n: men.filter(m => m.st === 'meal' && m.a === 'eat').length, far: men.filter(m => m.pl === 2 && Math.hypot(m.x - G.camp, m.z - 9.2) > 10).length }; }
        if (sod === 15 * 3600) out.work = men.filter(m => m.st === 'work').length;
        // D34: the men at work on average through the working hours (a tie or rail gang made up to whole units moves
        // men about more, so one moment, 15:00 at the trestle, can catch a dozen at the tool row)
        if (L.lnHours(S).work) { out.wSum = (out.wSum || 0) + men.filter(m => m.st === 'work').length; out.wN = (out.wN || 0) + 1; }
      }
      out.seq = seen.map(q => q.join('>'));
      out.order = seen.map(q => { let j = 0; for (const s of q) if (s === ORDER[j]) j++; return j; });
      out.anims = Object.keys(anims).sort();
      out.hEnd = hash(S); out.log = S.ln.log.map(q => q.m);
      // the same again; and from the state saved in mid morning
      const S2 = mk(); for (let i = 0; i < 2 * 10800; i++) step(S2);
      out.hAgain = hash(S2);
      try { cwCheckSaveShape(mid); } catch (e) { B('the saved crew is refused: ' + e.message); }
      out.hMid2 = hash(mid);
      out.hMid = hMid;
      while (mid.time < S.time) step(mid);
      out.hReload = hash(mid);
      // a boost: the spikers within 12 m work at twice their pace for an hour
      const A = mk(), Bs = mk();
      for (let i = 0; i < 10800 + 2250; i++) { step(A); step(Bs); }   // day 2, 10:00
      const g = L.cw.cwGang(A, 1);
      L.cw.cwBoost(Bs, 1, g.length ? g[0].x : 0, 2, Bs.tick + 450);
      for (let i = 0; i < 450; i++) { step(A); step(Bs); }
      out.boost = [A.ln.f[1], Bs.ln.f[1], g.length];
      return out;
    });
    for (const b of day.bad) P(b);
    if (day.order.some(j => j < 12)) { const k = day.order.findIndex(j => j < 12); P(`man ${k}'s day does not run bed, camp, muster, aboard, work, meal, work, aboard, camp, bed: ${day.seq[k]}`); }
    if (day.seq.filter(s => /rest/.test(s)).length < 25) P(`only ${day.seq.filter(s => /rest/.test(s)).length} of 30 men rested in the day`);
    if (day.seq.some(s => /left/.test(s))) P('a man was left on the line on an ordinary day');
    if (day.near) P(`${day.near} times two men stood on one spot`);
    if (day.pass > day.manTicks * 0.004) P(`walkers passed through another man ${day.pass} times in ${day.manTicks} man-ticks`);
    if (!day.gangs || day.gangs.some(g => !g.length)) P('at 10:30 on day 2 not every stage has a gang: ' + (day.gangs || []).map(g => g.length).join(', '));
    if (day.gangs && day.gangs.reduce((a, g) => a + g.length, 0) !== 30) P('the gangs do not add up to 30 men');
    if (day.fronts) { const span = (day.fronts[0] - day.fronts[5]) * 1.4285714; if (!(span > 45 && span < 130)) P(`the work site is ${span.toFixed(0)} u long`); for (let k = 1; k < 6; k++) if (day.fronts[k - 1] - day.fronts[k] > 30) P(`the fronts of stages ${k} and ${k + 1} are ${(day.fronts[k - 1] - day.fronts[k]).toFixed(1)} m apart`); }
    for (const a of ['hook', 'axe', 'pick', 'shovel', 'rake', 'barrow', 'tip', 'tieFront', 'tieBack', 'tieDrop', 'railCarry', 'railDrop', 'maul', 'shoulder', 'walk', 'sit', 'eat', 'drink', 'idle']) if (!day.anims.includes(a)) P(`no man was ever drawn with the animation "${a}"`);
    if (!day.dl || day.dl.n < 25 || !day.dl.ids) P('cwDrawList(line) is not the townsfolk\'s shape for 30 men: ' + JSON.stringify(day.dl));
    if (!day.props || day.props.length < 6) P('the piles and the dinner spot are not listed');
    if (!day.meal || day.meal.n < 28 || day.meal.far) P('at 12:30 the men are not all eating at the dinner spot: ' + JSON.stringify(day.meal));
    const wAvg = day.wSum / day.wN, D34_ON = await page.evaluate(() => (0, eval)('D34').on);
    if (D34_ON ? !(wAvg >= 15) : !(day.work >= 15)) P(D34_ON ? `only ${wAvg.toFixed(1)} men are at work on average in the working hours` : `only ${day.work} men are at work at 15:00`);
    if (day.hEnd !== day.hAgain) P('the same two days twice give different states');
    if (day.hMid !== day.hMid2) P('the state changes through JSON (a save)');
    if (day.hEnd !== day.hReload) P('the day differs after a save and reload in mid morning');
    if (!(day.boost[2] > 0 && day.boost[1] > day.boost[0] + 1)) P('cwBoost does not speed a gang up: ' + JSON.stringify(day.boost));
    const ms = day.ms / day.n;
    if (ms > 0.1) P(`cwTick takes ${ms.toFixed(3)} ms a tick with 30 men (budget 0.1)`);
    console.log(`  day 2 with 30 men: ${day.log.map(m => m.toFixed(0)).join(', ')} m spiked on the first days; gangs at 10:30 ${day.gangs.map(g => g.length).join(', ')}; fronts ${day.fronts.map(v => v.toFixed(0)).join(', ')}; walkers brushed past ${day.pass} times in ${day.manTicks} man-ticks; cwTick ${ms.toFixed(4)} ms a tick (worst ${day.worst.toFixed(2)})`);
    // ---- The pace ----
    const pace = await page.evaluate(() => { const L = window.__railhead.ln, a = L.cw.cwSimDays(1866, 30, 30), b = L.cw.cwSimDays(1866, 5, 150), c = L.cw.cwSimDays(7, 30, 30); return { a: a.days, aDone: a.done, b: b.days, bDone: b.done, c: c.days, f: a.f, d34: (0, eval)('D34').on }; });
    if (pace.aDone < 0 || pace.a < 13 || pace.a > 15) P(`30 men finish the line in ${pace.a} working days (13 to 15)`);
    if (pace.c < 13 || pace.c > 15) P(`30 men of another seed finish in ${pace.c} working days`);
    // D34 (the honest minimums, DEV_NOTES "D34"): a tie takes two men and a rail four, so a crew of five can lay rails
    // only with four of its five men at once, and its gangs wait on each other more: 5 men now take about 7.5 times as
    // long as 30 (97 working days on this seed, was 77, 5.9 times). The window moves from 5.5 to 6.5 to 7 to 8 with
    // the designer's request; the 30 men's 13 to 15 days are unchanged. With ?d34=0 the old window holds.
    const lo = pace.d34 ? 7 : 5.5, hi = pace.d34 ? 8 : 6.5;
    if (pace.bDone < 0 || pace.b / pace.a < lo || pace.b / pace.a > hi) P(`5 men finish in ${pace.b} working days, ${(pace.b / pace.a).toFixed(2)} times the 30 men's ${pace.a} (${lo} to ${hi})`);
    console.log(`  the pace: 30 men ${pace.a} working days (another seed ${pace.c}), 5 men ${pace.b}: ${(pace.b / pace.a).toFixed(2)} times as long`);
    // ---- Seen: the work site in the middle of the morning ----
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
    const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    const seen = await page.evaluate(() => {
      const R = window.__railhead; R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(2);
      const S = R.state, T = 2 * 86400 + 5.5 * 3600;
      while (S.time < T) { S.time += 8; S.tick++; const ev = []; R.ln.wtTick(S, ev); R.ln.cw.cwTick(S, ev); }
      // D33: one world, so the work site is looked at in the station's own frame (the line's x plus D33.LX)
      R.pix.warm(true);
      // (D34: the busiest stretch of the work site, the most men and piles within 30u: the gangs can stand further apart
      // now that the rail gang works in fours, and a pile can be kept back behind the creek)
      const pts = S.cw.men.filter(m => m.pl === 2).map(m => m.x).concat(CW_TEST.cwProps(S, 'line').map(q => q.x));
      let mx = (S.ln.f[1] + S.ln.f[4]) / 2 * R.ln.LINE.M;
      if ((0, eval)('D34').on && pts.length) { let best = -1; for (const c of pts) { const n = pts.filter(x => Math.abs(x - c) < 30).length; if (n > best) { best = n; mx = c; } } }
      if (R.lnView.d33.on) { R.camera.zoom = 0.75; R.pix.pixLookAt(mx + R.lnView.d33.LX, 0); }   // (one step out, so the whole little team is in the picture)
      else { R.ln.lnSetView(S, 'line'); R.lnView.lookAt((S.ln.f[1] + S.ln.f[4]) / 2, 0); }
      return S.ln.f;
    });
    await frames(6);
    const drawn = await page.evaluate(() => { const X = window.__railhead.pix.PIX; return { men: X.drawn.filter(d => /^cw\d/.test(d.id || '') && /^ppl\/navvy/.test(d.key)).length, tools: X.drawn.filter(d => /^(tool|line\/(tie_loose|rail_carried|rail_loose))/.test(d.key)).length, props: X.drawn.filter(d => /^cq/.test(d.id || '')).length, errs: Object.keys(X.errs) }; });
    if (drawn.men < 8) P(`only ${drawn.men} rail men are drawn at the work site`);
    if (drawn.props < 2) P('the piles are not drawn at the work site');
    if (drawn.errs.length) P('the renderer reported: ' + drawn.errs.join(', '));
    await page.screenshot({ path: screenshotPath('d32-crew-site-portrait') });
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
