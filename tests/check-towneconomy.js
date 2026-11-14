// Check: the town's economy (D32 stage 3, Town; plans/d32-tech.md 8.4 and 11.5; DEV_NOTES "D32 stage 3: the bigger
// town"). Counts only: stock 0 to 12 by shop, open or shut, a purse 0 to 20 and a mood by household, travellers' custom.
// - A week of full deliveries (the day's goods for the town handed in each evening, as F's delivery gives them): every
//   shop open every day, every household paid every day, everyone content, the stock within 0 to 12.
// - A week of none (days counted from 0, as the sim does: the clock's Day 1 is day 0): every shop that keeps stock is
//   open with empty shelves on day 2 and shut on day 3; the shops without stock (barber, sheriff, assay office) stay open;
//   the households of shut shops go unpaid, worried after two days, unhappy after four, while the sheriff's, the
//   preacher's and the teacher's stay content; the people of a shut shop are not at work (its keeper at its door, the
//   others on their porches or at the saloon's door); the unhappy stand about the depot square in the evening; a
//   "Closed" card for each shut shop (tnPixItems); the dev panel's town line says so.
// - Travellers' custom: with no goods but travellers stepping off every day (pbOff), about one in three walks to the
//   hotel or the saloon and back to the station (each counted once), and those two stay open on it while the rest shut.
// - The same week twice gives the same hash; a save without S.tn gets it at its next 05:00; damaged stores refused.
// - On the page: a tap on a townsperson and on a home opens the Look card with the role, the purse and the mood; the
//   dev panel shows the town line. Screenshots test-output/towneconomy-{closed,square,look}-portrait.png.
const { openGame, screenshotPath } = require('./browser');

const LIB = `window.__te = (() => {
  const R = window.__railhead, TF = R.tf, TN = R.tn, D0 = R.CFG.DAY_START_S, sched = R.proto.PROTO_SCHEDULE, SG = R.d27.SHOP_GOODS27;
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
  // days from a new game (or S0): deliver the day's goods at 18:00; pax travellers stepping off at 11:00 and 16:00 each day.
  function play({ S0 = null, days = 7, deliver = true, pax = 0, each = null, until = null }) {
    const S = S0 || R.newState(1866, 'proto');
    S.rr.on = false;
    let first = !S0;
    for (let t = 0; t < days * 10800 + 10 && TF.tfDay(S) < days; t++) {
      const cmds = [];
      if (first) { cmds.push({ t: 'pdStart' }); first = false; }
      if (S.pd.ph === 'summary' && S.pd.sum) cmds.push({ t: 'pdNextDay' });
      trains(S);
      const ev = R.simTick(S, cmds);
      const sod = (S.time + D0) % 86400, day = TF.tfDay(S);
      if (deliver && sod === 18 * 3600 && S.tn) ev.push(...TN.tnFeed(S, goodsOf(day % 7)));
      if (pax && S.tn && (sod === 11 * 3600 || sod === 16 * 3600)) ev.push(...TN.tnFeed(S, Array.from({ length: pax }, (_, i) => ({ t: 'pbOff', run: day * 20 + (sod > 12 * 3600 ? 1 : 0), id: day * 100 + (sod > 12 * 3600 ? 50 : 0) + i }))));
      if (each) each(S, ev);
      if (until && until(S)) break;
    }
    return S;
  }
  return { play, goodsOf, trains };
})();`;

module.exports = async function checkTownEconomy() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    await page.evaluate(LIB);
    const r = await page.evaluate(() => {
      const R = window.__railhead, TF = R.tf, TN = R.tn, out = {};
      const H = TN.tnHouseholds(), USE = TN.TN.USE, shops = Object.keys(USE);
      // ---- full deliveries ----
      const full = { days: [], stockBad: [], hash: null };
      const S1 = window.__te.play({ days: 7, deliver: true, each: (S, ev) => {
        for (const e of ev) if (e.t === 'tnDay') {
          const st = S.tn;
          full.days.push({ day: e.day, shut: shops.filter(id => !st.shop[id].o), unpaid: H.filter(h => !st.home[h.id].lp).map(h => h.id), moods: H.map(h => TN.tnMood(st.home[h.id])).reduce((a, m) => a + m, 0) });
        }
        if (S.tn) for (const id of shops) { const s = S.tn.shop[id].s; if (!(s >= 0 && s <= TN.TN.CAP) && full.stockBad.length < 3) full.stockBad.push(id + ':' + s); }
      } });
      full.hash = R.stateHash(S1); full.stock = Object.fromEntries(shops.map(id => [id, S1.tn.shop[id].s])); full.tot = S1.tn.tot; full.dev = TN.tnDevLine(S1);
      full.same = R.stateHash(window.__te.play({ days: 7, deliver: true })) === full.hash;
      out.full = full;
      // ---- none ----
      const none = { days: [], atWork: [], square: [], cards: [], purse: {} };
      const idx = id => TF.TF_AGENTS.findIndex(a => a.id === id);
      const S2 = window.__te.play({ days: 8, deliver: false, each: (S, ev) => {
        const st = S.tn, now = TF.tfNow(S), day = TF.tfDay(S);
        for (const e of ev) if (e.t === 'tnDay') none.days.push({ day: e.day, empty: shops.filter(id => st.shop[id].s === 0), shut: shops.filter(id => !st.shop[id].o), moods: Object.fromEntries(H.map(h => [h.id, TN.tnMood(st.home[h.id])])), purse: Object.fromEntries(H.map(h => [h.id, st.home[h.id].p])) });
        if (day === 4 && now === 36000) {
          const plans = TF.tfPlans(S.seed, S.tf.day, TN.tnDayOf(S));
          for (const id of ['amos', 'will', 'gus', 'jake', 'elias', 'karl', 'clara']) { const i = idx(id), a = S.tf.ag[i], q = plans[i][a.e], G = TF.TOWN_GRAPH; none.atWork.push({ id, in: a.in || null, at: G.nodes[a.at].id, go: a.go, act: q.act }); }
          none.cards = TN.tnPixItems(S).map(it => it.id);
          none.dev = TN.tnDevLine(S);
        }
        if (day === 7 && now === 19.5 * 3600) {
          const G = TF.TOWN_GRAPH;
          S.tf.ag.forEach((a, i) => { if (a.go < 0 && !a.in && /^(sq_|street_s|bw[WE]_s)/.test(G.nodes[a.at].id)) none.square.push(TF.TF_AGENTS[i].id); });
          none.unhappy = H.filter(h => TN.tnMood(S.tn.home[h.id]) === 2).map(h => h.id);
        }
      } });
      none.look = { amos: TN.tnLook(S2, { k: 'tf', id: 'tf_amos' }), house10: TN.tnLook(S2, { k: 'bld', id: 'house10' }), store: TN.tnLook(S2, { k: 'bld', id: 'shop_store' }), tom: TN.tnLook(S2, { k: 'tf', id: 'tf_tom' }) };
      none.shopApi = TN.tnShop(S2, 'store'); none.homeApi = [TN.tnHome(S2, 'amos'), TN.tnHome(S2, 'tf_tom'), TN.tnHome(S2, 'house2')];
      out.none = none;
      // ---- travellers ----
      const tr = { custom: {}, walked: 0, gone: 0, inside: 0, maxVis: 0, open: [], ids: new Set() };
      const S3 = window.__te.play({ days: 6, deliver: false, pax: 10, each: (S, ev) => {
        for (const e of ev) if (e.t === 'tnCustom') tr.custom[e.shop] = (tr.custom[e.shop] || 0) + 1;
        for (const e of ev) if (e.t === 'tnDay') tr.open.push({ day: e.day, open: shops.filter(id => S.tn.shop[id].o) });
        if (S.tn) { tr.maxVis = Math.max(tr.maxVis, S.tn.vis.length); for (const v of S.tn.vis) { if (v.st === 'in') tr.inside = Math.max(tr.inside, 1); tr.ids.add(v.id); } }
        if (S.tn && S.tick % 8 === 0) tr.walked = Math.max(tr.walked, TN.tnDrawList(S).length);
      } });
      tr.vn = S3.tn.vn; tr.left = S3.tn.vis.length; tr.tot = S3.tn.tot.custom; tr.ids = tr.ids.size;
      out.tr = tr;
      // ---- saves ----
      const S4 = JSON.parse(JSON.stringify(S1)); delete S4.tn;
      const t0 = TF.tfDay(S4);
      let got = null;
      for (let i = 0; i < 11000 && !got; i++) { R.simTick(S4, []); if (S4.tn) got = { day: TF.tfDay(S4), sod: (S4.time + R.CFG.DAY_START_S) % 86400 }; }
      out.noTn = { t0, got };
      const bad = [];
      for (const [name, f] of [['a stock of 13', T => { T.tn.shop.store.s = 13; }], ['no shops', T => { T.tn.shop = null; }], ['a purse of -1', T => { T.tn.home.house1.p = -1; }], ['a visitor nowhere', T => { T.tn.vis = [{ st: 'go', at: 1.5, go: 2, s: 0 }]; }], ['a key that is not text', T => { T.tn.key = 3; }]]) {
        const T = JSON.parse(JSON.stringify(S1)); f(T);
        try { TN.tnCheckSaveShape(T); bad.push(name); } catch (e) { /* refused */ }
      }
      try { TN.tnCheckSaveShape(JSON.parse(JSON.stringify(S1))); } catch (e) { bad.push('a good store refused: ' + e.message); }
      out.shape = bad;
      return out;
    });
    // full
    const F = r.full;
    if (F.days.length < 6) P(`full deliveries: only ${F.days.length} mornings settled`);
    for (const d of F.days) {
      if (d.shut.length) P(`full deliveries, day ${d.day}: shut ${d.shut.join(', ')}`);
      if (d.unpaid.length) P(`full deliveries, day ${d.day}: unpaid ${d.unpaid.join(', ')}`);
      if (d.moods) P(`full deliveries, day ${d.day}: not everyone content`);
    }
    F.stockBad.forEach(s => P('a stock out of 0 to 12: ' + s));
    if (!F.same) P('full deliveries: the same week twice gives different hashes');
    console.log(`  full deliveries: ${F.days.length} mornings, every shop open, every household paid, all content; stock at the end ${JSON.stringify(F.stock)}; ${F.tot.delivered} goods in, ${F.tot.used} used; ${F.same ? 'the same twice' : 'DIFFERENT'}`);
    // none
    const N = r.none, day = d => N.days.find(q => q.day === d) || { empty: [], shut: [], moods: {} };
    const all9 = ['store', 'saloon', 'hotel', 'smithy', 'livery', 'newspaper', 'bank', 'undertaker', 'feed'];
    for (const id of all9) {
      if (!day(2).empty.includes(id) || day(2).shut.includes(id)) P(`no goods: ${id} is not open with empty shelves on day 2`);
      if (!day(3).shut.includes(id)) P(`no goods: ${id} is not shut by day 3`);
    }
    const d7 = day(7).moods, d5 = day(5).moods;
    for (const h of ['shop_store', 'house10', 'house9', 'shop_saloon', 'house11']) { if (!(d5[h] >= 1)) P(`no goods: household ${h} is not worried by day 5 (${d5[h]})`); if (d7[h] !== 2) P(`no goods: household ${h} is not unhappy on day 7 (${d7[h]})`); }
    for (const h of ['shop_sheriff', 'house4', 'house2', 'house8']) if (d7[h] !== 0) P(`no goods: household ${h} (always paid) is not content (${d7[h]})`);
    for (const w of N.atWork) {
      if (w.id === 'amos' || w.id === 'jake') { if (w.in || w.go >= 0 || !/^door_/.test(w.at)) P(`no goods, day 4 10:00: the keeper ${w.id} is not at his shut shop's door: ${JSON.stringify(w)}`); }
      else if (w.id === 'will' || w.id === 'gus') { if (w.in || w.go >= 0 || !/^door_(saloon|house)/.test(w.at)) P(`no goods, day 4 10:00: ${w.id} is not idle on his porch or at the saloon: ${JSON.stringify(w)}`); }
      else if (!w.in) P(`no goods, day 4 10:00: ${w.id} (paid) is not at work: ${JSON.stringify(w)}`);
    }
    if (N.cards.length !== 9) P(`no goods, day 4: ${N.cards.length} Closed cards (want 9)`);
    if (!/0 of 9 shops open/.test(N.dev || '')) P('the dev panel line on day 4: ' + N.dev);
    if (N.square.length < 5) P(`no goods, day 7 19:30: only ${N.square.length} people on the depot square (${N.square.join(', ')})`);
    const look = N.look;
    if (!look.amos || !look.amos.lines.some(l => /^Role: storekeeper/.test(l)) || !look.amos.lines.some(l => /^Purse: \d+ coin/.test(l)) || !look.amos.lines.some(l => /^Mood: unhappy/.test(l))) P('the Look card of Amos: ' + JSON.stringify(look.amos));
    if (!look.house10 || !look.house10.lines.some(l => /Home of the Abbotts/.test(l)) || !look.house10.lines.some(l => /^Mood: unhappy/.test(l))) P('the Look card of house 10: ' + JSON.stringify(look.house10));
    if (!look.store || !look.store.lines.some(l => /^Stock: 0 of 12/.test(l)) || !look.store.lines.some(l => /^Shut/.test(l))) P('the Look card of the store: ' + JSON.stringify(look.store));
    if (!look.tom || !look.tom.lines.some(l => /^Mood: content/.test(l))) P('the Look card of the sheriff: ' + JSON.stringify(look.tom));
    if (!N.shopApi || N.shopApi.stock !== 0 || N.shopApi.open !== false || N.shopApi.custom !== 0) P('tnShop(S, "store"): ' + JSON.stringify(N.shopApi));
    if (!N.homeApi[0] || N.homeApi[0].mood !== 2 || !(N.homeApi[0].pay >= 0) || !N.homeApi[1] || N.homeApi[1].mood !== 0 || !N.homeApi[2] || N.homeApi[2].mood !== 0) P('tnHome: ' + JSON.stringify(N.homeApi));
    console.log(`  no goods: empty shelves day 2 ${day(2).empty.length}, shut day 3 ${day(3).shut.length}, day 4 ${day(4).shut.length} of 9; day 7 moods ${JSON.stringify(Object.values(d7).reduce((a, m) => { a[m] = (a[m] || 0) + 1; return a; }, {}))}; on the square at 19:30 ${N.square.length}; Closed cards ${N.cards.length}; "${N.dev}"`);
    // travellers
    const T = r.tr;
    const cust = (T.custom.hotel || 0) + (T.custom.saloon || 0), steps = 6 * 2 * 10;
    if (cust < steps * 0.2 || cust > steps * 0.47) P(`travellers: ${cust} of ${steps} came into town (want about one in three)`);
    if (!T.custom.hotel || !T.custom.saloon) P('travellers: not both the hotel and the saloon had custom: ' + JSON.stringify(T.custom));
    if (T.tot !== cust || T.vn !== cust) P(`travellers: counted ${T.tot}, visitors ${T.vn}, events ${cust}`);
    if (!T.walked || !T.inside) P('travellers: none seen walking or inside');
    const last = T.open[T.open.length - 1] || { open: [] };
    if (!last.open.includes('hotel') || !last.open.includes('saloon') || last.open.length !== 2) P('travellers: on the last morning open are ' + JSON.stringify(last));
    console.log(`  travellers: ${cust} of ${steps} came into town (hotel ${T.custom.hotel}, saloon ${T.custom.saloon}), up to ${T.maxVis} at once, ${T.walked} walking at once, ${T.left} still in town at the end; on day ${last.day} open: ${last.open.join(', ')}`);
    // saves
    if (!r.noTn.got || r.noTn.got.day !== r.noTn.t0 + 1 || r.noTn.got.sod !== 5 * 3600) P('a save without S.tn did not get it at its next 05:00: ' + JSON.stringify(r.noTn));
    r.shape.forEach(n => P('tnCheckSaveShape: ' + (/refused/.test(n) ? n : 'accepted ' + n)));

    // ---- On the page: the shut store, the Look cards, the dev line, the evening square ----
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
    const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    const skipLessons = async () => { for (let k = 0; k < 3; k++) { await page.evaluate(() => { const b = document.getElementById('pdLesson'); if (b && !b.hidden) document.getElementById('pdLesSkip').click(); }); await frames(2); } };
    await page.evaluate(() => { const R = window.__railhead; R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.step(2); });
    await skipLessons();
    await page.evaluate(() => { const R = window.__railhead, S = R.state; window.__te.play({ S0: S, days: 4, deliver: false, until: S => R.tf.tfDay(S) === 3 && R.tf.tfNow(S) >= 10.5 * 3600 }); R.pix.warm(true); R.camera.zoom = 1.5; R.pix.placePlayer(-6, -40); });
    await frames(10); await skipLessons();
    const c = await page.evaluate(() => { const X = window.__railhead.pix.PIX; return { cards: X.drawn.filter(d => /closed/.test(d.key || '')).length, shut: Object.keys(window.__railhead.state.tn.shop).filter(id => !window.__railhead.state.tn.shop[id].o) }; });
    if (!c.shut.includes('store')) P('the page: the store is not shut on day 3: ' + JSON.stringify(c));
    await page.screenshot({ path: screenshotPath('towneconomy-closed-portrait') });
    // the Look card: a tap on a townsperson outdoors (the drawn list), then on a home
    const who = await page.evaluate(() => {
      const R = window.__railhead, L = window.tfDrawList(R.state).filter(q => q.act !== 'walk');
      for (const q of L) { const p = toScreen(q.x, 0.9, q.z); if (p.x > 40 && p.x < 350 && p.y > 260 && p.y < 700) { const h = pickAt(p.x, p.y); if (h && h.k === 'tf' && h.exact) return { id: q.id, x: p.x, y: p.y }; } }
      return null;
    });
    if (!who) P('the page: no townsperson outdoors to tap');
    else {
      await page.touchscreen.tap(who.x, who.y); await frames(3);
      const card = await page.evaluate(() => ({ shown: !document.getElementById('lookCard').hidden, text: document.getElementById('lookCard').innerText }));
      if (!card.shown || !/Role:/.test(card.text) || !/Mood:/.test(card.text) || !/Purse:/.test(card.text)) P(`the Look card for ${who.id}: ${JSON.stringify(card)}`);
      await page.screenshot({ path: screenshotPath('towneconomy-look-portrait') });
      await page.touchscreen.tap(195, 500); await frames(2);
      if (await page.evaluate(() => !document.getElementById('lookCard').hidden)) P('the Look card did not close on the next tap');
    }
    const home = await page.evaluate(() => {
      const R = window.__railhead, P = R.pix;
      P.placePlayer(-40, -78);
      return null;
    });
    await frames(8);
    const hp = await page.evaluate(() => { for (const id of ['house15', 'house16', 'house14']) { const h = window.__railhead.d27.TOWN27.houses.find(q => q.id === id); const p = toScreen(h.x, 2.5, h.z); const k = pickAt(p.x, p.y); if (k && k.k === 'bld' && k.id === id && k.exact) return { id, x: p.x, y: p.y }; } return null; });
    if (!hp) P('the page: no house to tap');
    else {
      await page.touchscreen.tap(hp.x, hp.y); await frames(3);
      const card = await page.evaluate(() => ({ shown: !document.getElementById('lookCard').hidden, text: document.getElementById('lookCard').innerText }));
      if (!card.shown || !/Home of/.test(card.text) || !/Mood:/.test(card.text)) P(`the Look card for ${hp.id}: ${JSON.stringify(card)}`);
      await page.touchscreen.tap(195, 500); await frames(2);
    }
    const dev = await page.evaluate(() => typeof dvStatusText === 'function' ? dvStatusText() : '');
    if (!/Town: \d+ of 9 shops open/.test(dev)) P('the dev panel has no town line: ' + dev.slice(-200));
    // the evening square on day 7
    await page.evaluate(() => { const R = window.__railhead, S = R.state; window.__te.play({ S0: S, days: 8, deliver: false, until: S => R.tf.tfDay(S) === 7 && R.tf.tfNow(S) >= 19.6 * 3600 }); R.pix.placePlayer(0, -36); R.camera.zoom = 1.5; });
    await frames(10); await skipLessons();
    await page.evaluate(() => { const b = document.getElementById('pdSummary'); if (b) b.hidden = true; });
    const sq = await page.evaluate(() => window.tfDrawList(window.__railhead.state).filter(q => q.z > -34 && q.z < -24 && Math.abs(q.x) < 26).length);
    if (sq < 4) P(`the evening square on day 7: ${sq} people drawn there`);
    await page.screenshot({ path: screenshotPath('towneconomy-square-portrait') });
    console.log(`  the page: the store shut and its card drawn (${c.cards} cards in view), Look cards for ${who && who.id} and ${hp && hp.id}, the dev line, ${sq} on the evening square`);
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
