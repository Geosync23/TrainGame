// Check: the bigger town (D32 stage 3, Town; plans/d32-tech.md 8.1 and 11.5; DEV_NOTES "D32 stage 3: the bigger town").
// - The people: everyone simulated in the town has a role, a home and a workplace (buildings that exist, each with a
//   door on the town graph), about 40 of them (the townsfolk; the hired hands lodge at the hotel), a sprite for idle,
//   walk, talk and benchSit, and a routine for his kind.
// - The houses: ten new ones of three kinds on 8u lots on the back lanes, each with a door node; none overlaps another
//   footprint, the camp, the muster, the wash or the map's edge; the town graph is joined and every edge is on open
//   ground of the walk grid (never on a track, a ramp, the crossing or a footbridge).
// - A week with scripted trains and the day's goods handed in each evening: on a weekday at 10:00 everyone with a
//   workplace is in it (a homemaker at home), the pupils at school; Sunday 10:30 everyone but the cowhands in church;
//   the noon meal at home or the hotel; at the head count (22:00) every townsperson is indoors at home (the cowhands
//   away on the range) and the head count has them home; nobody stands or walks on a blocked cell of the walk grid.
// - The rail men: on Saturday evening a third of the crew walks from the camp to the saloon and back, on Sunday evening
//   a quarter to the church, all back in camp by the head count, never on a blocked cell; the line's fronts after the
//   week are exactly those of the same week with ?tn=0 (the line's pace is untouched).
// - The same week twice gives the same hash; a save on Tuesday at 15:00 played on gives the same.
// - ?tn=0 is the D27 town: 19 people, no new houses, no S.tn.
// Screenshots: test-output/bigtown-lanes-portrait.png (the third lane and its houses by day), bigtown-street-portrait.png.
const { openGame, screenshotPath } = require('./browser');

const LIB = `window.__bt = (() => {
  const R = window.__railhead, TF = R.tf, TN = R.tn, D0 = R.CFG.DAY_START_S, sched = R.proto.PROTO_SCHEDULE, SG = R.d27.SHOP_GOODS27;
  // The trains scripted as in check-townsfolk (only S.rr.runs is read by the townsfolk); the day's goods for the town
  // handed in at 18:00 (events fed to the economy, as the delivery would give them).
  function trains(S) {
    const day = Math.floor((S.time + D0) / 86400);
    if (!S.rr.runs.some(r => r.day === day)) S.rr.runs = sched.map((sv, k) => ({ id: day * 20 + k, svc: sv.id, day, ph: 'due', slot: null, arr: day * 86400 + sv.arr - D0, dep: day * 86400 + sv.dep - D0, tArr: null, late: ((day * 7 + k * 3) % 5) * 600 }));
    for (const r of S.rr.runs) {
      if (r.ph === 'due' && S.time >= r.arr + r.late) { r.ph = 'stand'; r.tArr = S.time; }
      else if (r.ph === 'stand' && S.time >= Math.max(r.dep, r.tArr + 1200)) r.ph = 'gone';
    }
  }
  function goodsOf(wd) {
    const out = [];
    for (const run of Object.keys(SG.in)) for (const [shop, c, n] of SG.in[run]) for (let i = 0; i < n; i++) out.push({ t: 'frDelivered', shop, commodity: c });
    for (const [, shop, c, n] of ((SG.weekly[wd] || {}).in || [])) for (let i = 0; i < n; i++) out.push({ t: 'frDelivered', shop, commodity: c });
    return out;
  }
  // A week (or days) from a new game: deliver (true: the day's goods each evening), crew (a crew size), each(S, ev) per tick.
  function play({ days = 7, deliver = true, crew = 0, each = null, saveAt = null }) {
    const S = R.newState(1866, 'proto');
    S.rr.on = false;
    let saved = null, first = true;
    for (let t = 0; t < days * 10800 + 10 && TF.tfDay(S) < days; t++) {
      const cmds = [];
      if (first) { cmds.push({ t: 'pdStart' }); if (crew) cmds.push({ t: 'dvSet', k: 'crew', v: crew }); first = false; }
      if (S.pd.ph === 'summary' && S.pd.sum) cmds.push({ t: 'pdNextDay' });
      trains(S);
      const ev = R.simTick(S, cmds);
      const sod = (S.time + D0) % 86400;
      if (deliver && sod === 18 * 3600 && S.tn) ev.push(...TN.tnFeed(S, goodsOf(TF.tfDay(S) % 7)));
      if (each) each(S, ev);
      if (saveAt && !saved && TF.tfDay(S) === saveAt[0] && sod >= saveAt[1]) saved = JSON.stringify(S);
    }
    return { S, saved };
  }
  return { play, trains, goodsOf };
})();`;

module.exports = async function checkBigTown() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    await page.evaluate(LIB);
    // ---- The people, the houses, the graph ----
    const g = await page.evaluate(() => {
      const R = window.__railhead, S = R.state, T = S.track, TF = R.tf, TN = R.tn, G = TF.TOWN_GRAPH, Gw = walkGrid(T), PR = R.d27.PROTO, bad = [];
      const onBad = (x, z) => z > PR.P1.z1 - 2 || PR.RAMPS.some(q => x > q.x0 - 1 && x < q.x1 + 1 && z > q.z0 - 1 && z < q.z1 + 1)
        || Math.abs(x - PR.XING_CART.x) < PR.XING_CART.w && z > PR.XING_CART.z0 - 1 && z < PR.XING_CART.z1 + 1 || R.d27.walkLevelAt(T, x, z) > 0;
      for (const [a, b, l] of G.edges) {
        const A = G.nodes[a], B = G.nodes[b], n = Math.ceil(l / 0.2);
        for (let k = 0; k <= n; k++) {
          const x = A.x + (B.x - A.x) * k / n, z = A.z + (B.z - A.z) * k / n;
          if (!(Gw.cost[walkCell(x, z)] > 0)) { bad.push(`edge ${A.id}-${B.id} is blocked at (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
          if (onBad(x, z)) { bad.push(`edge ${A.id}-${B.id} is on the track, a ramp, the crossing or a footbridge at (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
        }
      }
      for (let j = 0; j < G.n; j++) if (G.dist[j] === Infinity) bad.push(`${G.nodes[j].id} cannot be reached from ${G.nodes[0].id}`);
      // the houses
      const T27 = R.d27.TOWN27, fps = buildingFootprints(), houses = T27.houses.filter(h => h.tn), kinds = {};
      const rectOf = f => { const c = Math.abs(Math.cos(f.yaw || 0)) > 0.5; const w = c ? f.w : f.d, d = c ? f.d : f.w; return [f.x - w / 2, f.x + w / 2, f.z - d / 2, f.z + d / 2]; };
      const hit = (a, b, m) => a[0] < b[1] + m && a[1] > b[0] - m && a[2] < b[3] + m && a[3] > b[2] - m;
      for (const h of houses) {
        kinds[h.tn] = (kinds[h.tn] || 0) + 1;
        const f = fps.find(q => q.id === h.id);
        if (!f) { bad.push(`house ${h.id} is not in the layout`); continue; }
        const r = rectOf(f);
        // (D32 joined: the two-room house's lot is 8.25u along the lane, its body being 7.5u long in the artist's art)
        if (Math.abs(r[1] - r[0] - 7.65) > 0.01 || Math.abs(r[3] - r[2] - (h.tn === 'two' ? 8.25 : 7.65)) > 0.01) bad.push(`house ${h.id} is not on an 8u lot: ${r.map(v => v.toFixed(2))}`);
        for (const o of fps) if (o.id !== h.id && !o.flush && hit(r, rectOf(o), 0.5)) bad.push(`house ${h.id} overlaps ${o.id}`);
        for (const [nm, q] of [['the camp', PR.CAMP], ['the muster', PR.MUSTER], ['the wash', PR.WASH]]) if (hit(r, [q.x0, q.x1, q.z0, q.z1], 1)) bad.push(`house ${h.id} is on ${nm}`);
        const B = PR.BOUNDS; if (r[0] < B.x0 + 2 || r[1] > B.x1 - 2 || r[2] < B.z0 + 2 || r[3] > B.z1 - 2) bad.push(`house ${h.id} is at the map's edge`);
        if (G.idx['door_' + h.id] === undefined) bad.push(`house ${h.id} has no door node`);
        else if (TF.townPath('door_' + h.id, 'wait1') === null) bad.push(`house ${h.id}'s door is not joined to platform 1`);
        const d = G.nodes[G.idx['door_' + h.id]];
        if (d && !(Gw.cost[walkCell(d.x, d.z)] > 0)) bad.push(`house ${h.id}'s door spot is blocked`);
      }
      // the people
      const blds = new Set(fps.map(b => b.id)), pk = R.pix.pixPersonKey;
      for (const a of TF.TF_AGENTS) {
        if (typeof a.role !== 'string' || !a.role) bad.push(`${a.name}: no role`);
        for (const b of [a.home, a.work]) if (!b) bad.push(`${a.name}: no home or no workplace`); else if (b !== 'edge' && !blds.has(b)) bad.push(`${a.name}: no building ${b}`);
        for (const b of [a.home, a.work]) if (b && TF.tfDoorOf(b) === undefined) bad.push(`${a.name}: no door for ${b}`);
        if (!TN.TN_ROUTINES[a.kind]) bad.push(`${a.name}: no routine ${a.kind}`);
        for (const act of ['idle', 'walk', 'talk', 'benchSit']) { const k = pk(a.who, act, 'se', 0); if (!k || k.indexOf('ppl/') !== 0) bad.push(`${a.name}: no sprite ppl/${a.who}/${act}`); }
      }
      const hh = TN.tnHouseholds();
      for (const h of hh) if (!h.earners.length) bad.push(`household ${h.id} (${h.name}) has nobody earning`);
      const empty = houses.filter(h => !hh.some(q => q.id === h.id)).map(h => h.id);
      return { bad, n: G.n, e: G.edges.length, agents: TF.TF_AGENTS.length, newp: TF.TF_AGENTS.filter(a => a.tn).length, houses: houses.length, kinds, hh: hh.length, empty };
    });
    g.bad.slice(0, 20).forEach(P);
    if (g.agents < 38 || g.agents > 44) P(`${g.agents} townsfolk (want about 40)`);
    if (g.houses !== 10 || Object.keys(g.kinds).length !== 3) P(`${g.houses} new houses of kinds ${JSON.stringify(g.kinds)} (want 10 of three kinds)`);
    if (g.empty.length) P('new houses nobody lives in: ' + g.empty.join(', '));
    console.log(`  town graph: ${g.n} nodes, ${g.e} edges, joined and on open ground; ${g.agents} townsfolk (${g.newp} new) in ${g.hh} households; ${g.houses} new houses ${JSON.stringify(g.kinds)}`);

    // ---- A week with deliveries and a crew of 30: the round, the head count, walls, the rail men ----
    const wk = await page.evaluate(() => {
      const R = window.__railhead, TF = R.tf, TN = R.tn, PR = R.d27.PROTO, D0 = R.CFG.DAY_START_S, out = { bad: [], walls: [], meal: { hotel: 0, home: 0 }, hc: [], crew: [], sat: null, sun: null, seen: { work: 0, school: 0, church: 0 } };
      const Gw = walkGrid(R.state.track), open = (x, z, r) => { if (Gw.cost[walkCell(x, z)] > 0) return true; for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (Gw.cost[walkCell(x + dx, z + dz)] > 0) return true; return false; };
      const t0 = performance.now();
      const r = window.__bt.play({ days: 7, crew: 30, saveAt: [1, 15 * 3600], each: (S, ev) => {
        const st = S.tf, now = TF.tfNow(S), wd = TF.tfDay(S) % 7, sod = (S.time + D0) % 86400, plans = TF.tfPlans(S.seed, st.day, TN.tnDayOf(S));
        if (S.tick % 4 === 0) {
          st.ag.forEach((a, i) => { const p = TF.tfPose(S, i, plans); if (!p.hidden && !open(p.x, p.z, p.act === 'walk' ? 0 : 0.7) && out.walls.length < 6) out.walls.push(`${TF.TF_AGENTS[i].id} at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) day ${st.day} ${(sod / 3600).toFixed(2)}h ${p.act}`); });
          if (S.cw) for (const m of S.cw.men) if (m.st === 'town' && m.pl === 1 && !open(m.x, m.z, 0.3) && out.walls.length < 6) out.walls.push(`rail man ${m.id} at (${m.x}, ${m.z}) day ${st.day} ${(sod / 3600).toFixed(2)}h`);
          if (S.tn) for (const q of TN.tnDrawList(S)) if (!open(q.x, q.z, 0) && out.walls.length < 6) out.walls.push(`${q.id} at (${q.x.toFixed(1)}, ${q.z.toFixed(1)})`);
        }
        if (wd < 5 && now === 36000) st.ag.forEach((a, i) => {
          const A = TF.TF_AGENTS[i], q = plans[i][a.e];
          if (A.kind === 'cowhand' || q.act === 'meet' || (a.go >= 0 && plans[i].slice(0, a.e).some(o => o.act === 'meet' && o.at > now - 7200))) return;
          const want = A.kind === 'homemaker' ? A.home : A.work;
          if (a.go < 0 && a.in === want) out.seen[A.kind === 'pupil' ? 'school' : 'work']++;
          else if (A.kind !== 'homemaker' && !(A.kind === 'barkeep' || A.kind === 'barmaid')) out.bad.push(`day ${st.day} 10:00: ${A.id} (${A.kind}) is not at ${want} (${a.in || 'outdoors'}, errand ${q.act} ${q.in || ''})`);
        });
        if (wd < 6 && now === 12 * 3600 + 1800) st.ag.forEach((a, i) => { const A = TF.TF_AGENTS[i]; if (a.go < 0 && a.in === 'shop_hotel' && A.work !== 'shop_hotel') out.meal.hotel++; else if (a.go < 0 && a.in === A.home && A.work !== A.home) out.meal.home++; });
        if (wd === 6 && now === 37800) st.ag.forEach((a, i) => { const A = TF.TF_AGENTS[i]; if (A.kind === 'cowhand') return; if (a.go < 0 && a.in === 'church') out.seen.church++; else out.bad.push(`Sunday 10:30: ${A.id} is not in church (${a.in || 'outdoors'})`); });
        for (const e of ev) if (e.t === 'hcDone') {
          const notHome = st.ag.map((a, i) => [TF.TF_AGENTS[i], a]).filter(([A, a]) => !(a.go < 0 && (a.in === A.home || (A.home === 'edge' && a.in === 'away')))).map(([A, a]) => A.id + ':' + (a.in || 'outdoors'));
          const roll = R.ln.cw.hcRoll(S).filter(p => /^tf_/.test(p.id) && p.at !== p.home);
          out.hc.push({ day: st.day, home: e.home, total: e.total, notHome, roll: roll.length, town: S.cw.men.filter(m => m.st === 'town').length });
        }
        for (const e of ev) if (e.t === 'tnCrewOut') out.crew.push(wd + ':' + e.to);
        if (S.cw && (wd === 5 || wd === 6)) {
          const n = S.cw.men.filter(m => m.st === 'town').length, inn = S.cw.men.filter(m => m.st === 'town' && m.pl === 0).length, key = wd === 5 ? 'sat' : 'sun';
          if (!out[key]) out[key] = { most: 0, inside: 0 };
          out[key].most = Math.max(out[key].most, n); out[key].inside = Math.max(out[key].inside, inn);
        }
      } });
      out.ms = Math.round(performance.now() - t0);
      out.hash = R.stateHash(r.S); out.fronts = r.S.ln.f.slice(); out.tn = r.S.tn.key; out.saloon = r.S.tn.tot.custom;
      // the same week again, and the Tuesday save played on to the end
      const r2 = window.__bt.play({ days: 7, crew: 30 });
      out.same = R.stateHash(r2.S) === out.hash;
      const S3 = JSON.parse(r.saved);
      R.tn.tnCheckSaveShape(S3);
      let first = true;
      while (TF.tfDay(S3) < 7) {
        window.__bt.trains(S3);
        const cmds = S3.pd.ph === 'summary' && S3.pd.sum ? [{ t: 'pdNextDay' }] : [];
        R.simTick(S3, cmds);
        const sod = (S3.time + D0) % 86400;
        if (sod === 18 * 3600) TN.tnFeed(S3, window.__bt.goodsOf(TF.tfDay(S3) % 7));
        first = false;
      }
      out.reload = R.stateHash(S3) === out.hash;
      return out;
    });
    wk.bad.slice(0, 12).forEach(P);
    wk.walls.forEach(w => P('on a blocked cell: ' + w));
    for (const h of wk.hc) {
      if (h.notHome.length) P(`day ${h.day} 22:00: not at home: ${h.notHome.slice(0, 8).join(', ')}`);
      if (h.roll) P(`day ${h.day} 22:00: the head count has ${h.roll} townsfolk out`);
    }
    if (wk.hc.length < 6) P(`only ${wk.hc.length} head counts in the week`);
    if (!wk.seen.work || !wk.seen.school || !wk.seen.church) P('the round was not seen: ' + JSON.stringify(wk.seen));
    if (!wk.meal.hotel || !wk.meal.home) P('the noon meal (home and the hotel): ' + JSON.stringify(wk.meal));
    const sat = wk.crew.filter(c => c === '5:saloon').length, sun = wk.crew.filter(c => c === '6:church').length;
    if (sat !== 10) P(`Saturday: ${sat} rail men went to the saloon (want 10 of 30)`);
    if (sun < 5 || sun > 8) P(`Sunday: ${sun} rail men went to evening prayers (want a quarter of 30)`);
    if (!wk.sat || !wk.sat.inside) P('Saturday: nobody was inside the saloon: ' + JSON.stringify(wk.sat));
    for (const h of wk.hc) if (h.town) P(`day ${h.day} 22:00: ${h.town} rail men still in town`);
    if (!wk.same) P('the same week twice gives different hashes');
    if (!wk.reload) P('a save on Tuesday at 15:00 played on does not end the same');
    console.log(`  a week with a crew of 30 (${wk.ms} ms): at work 10:00 ${wk.seen.work}, at school ${wk.seen.school}, in church ${wk.seen.church}; noon meal ${JSON.stringify(wk.meal)}; head counts ${wk.hc.map(h => h.home + '/' + h.total).join(' ')}; rail men out Saturday ${sat} (most inside ${wk.sat && wk.sat.inside}), Sunday ${sun}; ${wk.same ? 'the same twice' : 'DIFFERENT'}, ${wk.reload ? 'a save plays on the same' : 'a save DIFFERS'}`);

    // ---- The line's pace: the same week with ?tn=0 ----
    const off = await openGame('portrait', { query: '?paused&world=proto&tn=0' });
    try {
      await off.page.evaluate(LIB);
      const o = await off.page.evaluate(() => { const R = window.__railhead, r = window.__bt.play({ days: 7, crew: 30, deliver: false }); return { fronts: r.S.ln.f.slice(), agents: R.tf.TF_AGENTS.length, tn: r.S.tn === undefined, houses: R.d27.TOWN27.houses.length }; });
      if (JSON.stringify(o.fronts) !== JSON.stringify(wk.fronts)) P(`the line's fronts after the week differ from ?tn=0: ${JSON.stringify(wk.fronts)} against ${JSON.stringify(o.fronts)}`);
      if (o.agents !== 19 || !o.tn || o.houses !== 8) P(`?tn=0 is not the D27 town: ${JSON.stringify(o)}`);
      if (off.errors.length) P('console errors (?tn=0): ' + off.errors.slice(0, 3).join(' | '));
      console.log(`  the line after the week: ${wk.fronts.map(v => v.toFixed(1)).join(', ')} m, the same with ?tn=0; ?tn=0 has ${o.agents} townsfolk and ${o.houses} houses`);
    } finally { await off.browser.close(); }

    // ---- Seen: the third lane by day, the street ----
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
    await page.evaluate(() => { const R = window.__railhead; R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.step(2); const S = R.state; while ((S.time + 18000) % 86400 < 9.5 * 3600) R.simTick(S, []); R.pix.warm(true); });
    const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    for (let k = 0; k < 3; k++) { await page.evaluate(() => { const b = document.getElementById('pdLesson'); if (b && !b.hidden) document.getElementById('pdLesSkip').click(); }); await frames(2); }
    await page.evaluate(() => { window.__railhead.camera.zoom = 1.0; window.__railhead.pix.placePlayer(-43, -84); });
    await frames(8);
    // (D32 joined: the new houses are the artist's bld/cabin, bld/framehouse and bld/house2 now)
    const d1 = await page.evaluate(() => { const X = window.__railhead.pix.PIX; return { houses: X.drawn.filter(d => /^bld\/(house|cabin|framehouse)/.test(d.key)).length, errs: Object.keys(X.errs) }; });
    if (d1.houses < 6) P('the third lane: houses not drawn: ' + JSON.stringify(d1));
    await page.screenshot({ path: screenshotPath('bigtown-lanes-portrait') });
    await page.evaluate(() => { window.__railhead.pix.placePlayer(0, -70); });
    await frames(8);
    await page.screenshot({ path: screenshotPath('bigtown-street-portrait') });
    await page.evaluate(() => { window.__railhead.camera.zoom = 1.5; });
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
