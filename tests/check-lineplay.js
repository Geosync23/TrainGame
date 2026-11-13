// Check: riding out and walking the line (plans/d32-tech.md 1.6 and 11.5, Play's stage 1), in portrait and landscape,
// by real taps on the page (the dev panel's buttons, the line's bar, the ground, the men).
// - Ride out with the work train: "Ride out as a rail worker" at 06:00 sends the player to the muster (the station's
//   own walk), he boards over the plank walk while the train stands, the view rides with the crew car through the
//   station and fades as it leaves the map, stays dark on the line until the train brakes in, fades in and he steps
//   down beside the crew car; the station's player takes no commands meanwhile and the station's day goes on.
// - A save mid-ride (export and import, and a real page reload) restores exactly, and plays on to the same hash.
// - On the line: the camera is on him (within a native pixel of the screen's middle); a tap walks him straight there,
//   round the work train's cars to its far side (never inside them), and a tap beyond a natural border stops him at
//   it, standing on walkable ground. A save made on the line reloads to the same hash.
// - A tap on a man opens his Look card (name, stage, doing, stamina), the same man again his gang's, another tap
//   closes it without walking (men stood in for Crew's through cwDrawList and cwGang, as the real ones will come).
// - Back with the evening train ("Ride home" in the bar): to the crew car's steps, aboard at 18:20, dark on the way,
//   the station's view as the train backs in, off at the steps and over the plank walk to the muster, the station's
//   player his own again; the day's figures went on while he was away.
// - Ride out now (the dev panel) and Back now (the bar), at once; the dev panel's "Look at the line" is kept.
// - The bar's buttons are thumb-sized and inside the screen; no console errors. Screenshots lineplay-*.png.
// - The same commands twice in the sim give the same hash.
// D33 (one world): this check plays the PARKED separate-line build (the page's ?d33=0), whose screen switch,
// fades and look point it was written for. The same play in the one world is check-d33's.
const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkLinePlay() {
  const problems = [];
  // ---- The sim alone: the same ride twice gives the same hash ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d33=0' });
    try {
      const h = await page.evaluate(() => {
        const R = window.__railhead, run = () => {
          const S = R.newState(7, 'proto'), at = { 2: [{ t: 'pdStart' }, { t: 'dvSet', k: 'crew', v: 30 }], 4: [{ t: 'lpRide', how: 'train' }], 700: [{ t: 'lpWalk', x: 3000, z: -600 }], 900: [{ t: 'lpBack', how: 'train' }] };
          for (let i = 0; i < 6300; i++) R.simTick(S, at[S.tick] || []);
          return R.stateHash(S) + ' ' + (S.lp ? S.lp.ph : 'home') + ' ' + S.player.away;
        };
        return [run(), run()];
      });
      if (h[0] !== h[1]) problems.push(`the same ride twice gave different hashes: ${h.join(' / ')}`);
      if (!/ home undefined$/.test(h[0])) problems.push(`a day out and back in the sim did not end at the station: ${h[0]}`);
      if (errors.length) problems.push('console errors (sim): ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  for (const orient of ['portrait', 'landscape']) {
    const P = m => problems.push(`${orient}: ${m}`);
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&dev=1&d33=0' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      const step = n => page.evaluate(n => window.__railhead.step(n), n);
      const st = () => page.evaluate(() => {
        const R = window.__railhead, S = R.state, sod = (S.time + 5 * 3600) % 86400, g = (0, eval);
        return { sod, lp: S.lp ? JSON.parse(JSON.stringify(S.lp)) : null, away: S.player.away || null, P: [S.player.x, S.player.z, S.player.mode], tr: S.ln ? S.ln.tr.ph : null, view: S.ln ? S.ln.view : null,
          fade: g('lpFade')(S, sod), line: document.body.classList.contains('line'), bar: !document.getElementById('lpBar').hidden, lnBar: !document.getElementById('lnBar').hidden,
          card: !document.getElementById('lpCard').hidden, hash: R.hash(), stats: S.pd ? { ...S.pd.stats } : null, aw: S.ln && S.ln.awStats ? { ...S.ln.awStats } : null, tick: S.tick };
      });
      const until = async (pred, max, by) => { for (let i = 0; i < max; i++) { const s = await st(); if (pred(s)) return s; await step(by || 4); } return st(); };
      const skipLesson = () => page.evaluate(() => { const b = document.getElementById('pdLesson'); if (b && !b.hidden) document.getElementById('pdLesSkip').click(); const c = document.getElementById('pdSum'); if (c && !c.hidden) c.hidden = true; });
      const devTap = async row => {
        await skipLesson(); await frames(2);
        if (await page.evaluate(() => document.getElementById('devPanel').hidden)) await page.tap('#devBtn');
        await frames(3);
        const b = await page.$(`#devRows button[data-dv="${row}"]`);
        if (!b) { P(`the dev panel has no "${row}" button`); return false; }
        await b.tap(); await frames(2); return true;
      };
      const shot = async name => { await frames(4); await page.screenshot({ path: screenshotPath(`lineplay-${name}-${orient}`) }); };
      // the screen point of a point on the line (CSS px)
      const scr = (x, z, y) => page.evaluate(([x, z, y]) => window.__railhead.pix.pixToScreen(x, y || 0, z), [x, z, y]);
      const tapAt = async (x, z, y) => { const p = await scr(x, z, y); await page.touchscreen.tap(Math.round(p.x), Math.round(p.y)); await frames(2); return p; };
      const vp = page.viewportSize();
      // ---- The line on, 06:00 on the first day: ride out with the work train ----
      await page.evaluate(() => { const R = window.__railhead; R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(2); });
      await frames(3);
      const rows = await page.evaluate(() => { const r = window.__railhead.dv.rows(); return r.map(q => q.id + (q.grey ? ':grey' : '')); });
      for (const id of ['ride', 'rideNow', 'look']) if (!rows.includes(id)) P(`the dev panel has no row ${id}: ${rows.join(' ')}`);
      if (rows.some(r => /^back/.test(r))) P('the dev panel offers to come back while the player is at the station');
      await devTap('ride');
      await step(1); await frames(3);
      let s = await st();
      if (!s.lp || s.lp.ph !== 'muster' || s.away !== 'line' || s.P[2] !== 'to') P('"Ride out as a rail worker" did not send the player to the muster: ' + JSON.stringify(s));
      if (!s.bar) P('no bar while he walks to the muster');
      await shot('muster');
      // the station's player takes no commands now
      await page.evaluate(() => window.__railhead.send({ t: 'walkTo', x: 0, z: 0 }));
      await step(1);
      const s1 = await st();
      if (Math.hypot(s1.P[0] + 43, s1.P[1] + 13) > Math.hypot(s.P[0] + 43, s.P[1] + 13) + 0.01 && s1.lp.ph === 'muster') P('a walk command moved him away from the muster');
      s = await until(s => s.lp && s.lp.ph !== 'muster', 200);
      if (s.lp.ph !== 'board' || s.tr !== 'sStand') P(`he did not board while the train stood (${s.lp && s.lp.ph}, the train ${s.tr})`);
      s = await until(s => s.lp && s.lp.ph === 'aboardS', 60, 1);
      if (Math.abs(s.P[0] + 39.3) > 0.01 || Math.abs(s.P[1] + 2.6) > 0.01) P(`he did not walk the plank walk to the crew car's steps: ${s.P}`);
      await step(1); await frames(3);
      const hid = await page.evaluate(() => (window.__railhead.pix.PIX.order || []).filter(id => /agent|player/.test(id || '')).length);
      if (hid) P('the station\'s player is still drawn while he is in the crew car');
      // the view rides with the crew car (standing, then out of the station)
      await frames(4);
      const ride = await page.evaluate(() => { const R = window.__railhead, S = R.state, T = R.ln.lnTrain(S), c = T.cars[4], p = R.pix.pixToScreen((c.x0 + c.x1) / 2, 0, 0); return { p, w: innerWidth, h: innerHeight }; });
      if (Math.abs(ride.p.x - ride.w / 2) > 3 || Math.abs(ride.p.y - ride.h / 2) > 3) P(`the view is not on the crew car he is in: ${JSON.stringify(ride)}`);
      s = await until(s => s.tr === 'sOut', 400);
      await step(12);
      await shot('leaving');
      // ---- A save mid-ride: export, import, and the same hash after playing on ----
      s = await until(s => s.lp && s.lp.ph === 'ride', 200);
      if (!s.view || s.view !== 'line' || s.fade < 0.99) P(`as the train left the map the view did not go dark to the line (view ${s.view}, fade ${s.fade})`);
      await step(20);
      const mid = await page.evaluate(() => { const R = window.__railhead, j = R.exportSave(), h = R.hash(); const h2 = R.importSave(j); R.step(60); const h3 = R.hash(); R.importSave(j); R.step(60); return { h, h2, h3, h4: R.hash() }; });
      if (mid.h !== mid.h2) P('export and import mid-ride changed the state');
      if (mid.h3 !== mid.h4) P('a reloaded ride did not play on to the same state');
      s = await until(s => s.fade < 0.5, 300);
      if (s.lp.ph !== 'ride') P('the view faded in after the ride was over');
      await shot('rolling-in');
      s = await until(s => s.lp && s.lp.ph === 'line', 300);
      await frames(4);
      if (!s.line || !s.bar || s.lnBar) P(`on the line in person the page shows the wrong bar: ${JSON.stringify({ line: s.line, bar: s.bar, lnBar: s.lnBar })}`);
      const beside = await page.evaluate(() => { const R = window.__railhead, S = R.state, T = R.ln.lnTrain(S); return { d: Math.hypot(S.lp.x - T.steps.x, S.lp.z - T.steps.z), ok: R.ln.lnWalkable(S.seed, S.lp.x, S.lp.z, S.ln.f[1]) }; });
      if (beside.d > 1.5 || !beside.ok) P('he did not step down beside the crew car: ' + JSON.stringify(beside));
      await shot('stepped-down');
      // ---- On the line: the camera, walking by touch (the line's first lesson put aside: check-linelessons') ----
      await skipLesson(); await frames(2);
      const centre = () => page.evaluate(() => { const R = window.__railhead, S = R.state, p = R.pix.pixToScreen(S.lp.x, 0, S.lp.z), k = R.pix.PIX.scale / R.pix.PIX.dpr; return { dx: (p.x - innerWidth / 2) / k, dy: (p.y - innerHeight / 2) / k, ox: R.camera.ox, oz: R.camera.oz }; });
      let c = await centre();
      if (Math.abs(c.dx) > 1.01 || Math.abs(c.dy) > 1.01) P(`the view is not centred on him: ${c.dx.toFixed(2)}, ${c.dy.toFixed(2)} native px`);
      const p0 = s.lp;
      await tapAt(p0.x + 6, p0.z + 2);
      await step(1);
      s = await st();
      if (s.lp.tx === undefined || Math.hypot(s.lp.tx - (p0.x + 6), s.lp.tz - (p0.z + 2)) > 0.3) P('a tap on the ground did not walk him there: ' + JSON.stringify(s.lp));
      // smooth: between ticks the view stays on him (drawn at alpha 0.5 with the game running)
      const smooth = await page.evaluate(async () => {
        const R = window.__railhead, PIX = R.pix.PIX, out = [];
        R.setSpeed(1);
        for (let i = 0; i < 30; i++) { await new Promise(r => requestAnimationFrame(r)); out.push([PIX.camX, PIX.camY]); }
        R.setSpeed(0);
        return out;
      });
      const jumps = smooth.slice(1).map((q, i) => Math.hypot(q[0] - smooth[i][0], q[1] - smooth[i][1])).filter(v => v > 0), med = jumps.slice().sort((a, b) => a - b)[jumps.length >> 1] || 0;
      if (!jumps.length || Math.max(...jumps) > 2.5 * med + 1) P(`the view does not glide with him (camera steps ${jumps.map(v => v.toFixed(2)).join(' ')} native px)`);
      s = await until(s => s.lp.tx === undefined, 80, 2);
      await frames(4);
      c = await centre();
      if (Math.abs(c.dx) > 1.01 || Math.abs(c.dy) > 1.01) P(`after a walk the view is not centred on him: ${JSON.stringify(c)}`);
      // round the train to its far side, never inside it
      s = await st();
      const goal = { x: s.lp.x + 2, z: -4 };   // (straight across the crew car)
      await frames(3);
      await tapAt(goal.x, goal.z);
      await step(1);
      const g1 = await st();
      if (!g1.lp.tx || Math.hypot(g1.lp.tx - goal.x, g1.lp.tz - goal.z) > 0.3) P('the tap across the train went to ' + JSON.stringify(g1.lp) + ' for ' + JSON.stringify(goal));
      let inside = 0, arrived = null;
      for (let i = 0; i < 160; i++) {
        const q = await page.evaluate(() => { const R = window.__railhead, S = R.state, T = R.ln.lnTrain(S); R.step(1); return { x: S.lp.x, z: S.lp.z, tx: S.lp.tx, x0: T.cars[4].x0, x1: T.cars[0].x1 }; });
        if (q.x > q.x0 && q.x < q.x1 && Math.abs(q.z) < 2) inside++;
        if (q.tx === undefined) { arrived = q; break; }
      }
      if (inside) P(`walking to the train's far side he was inside its cars ${inside} times`);
      if (!arrived || Math.hypot(arrived.x - goal.x, arrived.z - goal.z) > 0.6) P('he did not get round the train to its far side: ' + JSON.stringify(arrived));
      await shot('far-side');
      // a tap beyond the near border: he stops at it, on walkable ground
      s = await st();
      const far = { x: s.lp.x + 3, z: 14 };   // (beyond the near border, which lies 11 to 14u from the line)
      await frames(3);
      const fp = await scr(far.x, far.z);
      await page.touchscreen.tap(Math.round(fp.x), Math.min(vp.height - 8, Math.round(fp.y))); await frames(2);
      await step(1);
      s = await st();
      const tgt = s.lp.tx !== undefined ? [s.lp.tx, s.lp.tz] : null;
      s = await until(s => s.lp.tx === undefined, 200, 2);
      const edge = await page.evaluate(() => { const R = window.__railhead, S = R.state, B = R.ln.lnBorder(S.seed, S.lp.x, 1); return { z: S.lp.z, d: B.d, ok: R.ln.lnWalkable(S.seed, S.lp.x, S.lp.z, S.ln.f[1]), next: R.ln.lnWalkable(S.seed, S.lp.x, S.lp.z + 0.4, S.ln.f[1]) }; });
      if (!tgt) P('a tap beyond the near border did not walk him');
      if (!edge.ok || edge.next || edge.z < 4) P('a walk towards the near border did not stop at it: ' + JSON.stringify(edge) + ' ' + JSON.stringify(far));
      // ---- A save on the line: a real reload ----
      const onLine = await page.evaluate(async () => { const R = window.__railhead; await R.saveGame(); return { h: R.hash(), tick: R.state.tick }; });
      await page.reload(); await waitReady(page);
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => {});
      const back = await page.evaluate(() => ({ h: window.__railhead.hash(), tick: window.__railhead.state.tick, ph: window.__railhead.state.lp && window.__railhead.state.lp.ph }));
      if (back.tick === onLine.tick && back.h !== onLine.h) P('a page reload on the line changed the state');
      if (back.tick !== onLine.tick && back.ph !== 'line') P(`after a page reload he is not on the line (tick ${back.tick} for ${onLine.tick}, ${back.ph})`);
      await frames(4);
      if (!(await st()).bar) P('after a reload the line\'s bar is not up');
      // ---- The men: a Look card (stand-ins for Crew's men, through cwDrawList and cwGang) ----
      s = await st();
      await page.evaluate(([x, z]) => {
        const men = [0, 1, 2, 3].map(i => ({ id: 'm' + i, who: 'worker', name: ['Pat Doyle', 'Sean Burke', 'Tom Hale', 'Ned Quinn'][i], stage: i < 2 ? 5 : 3, x: x + 3 + i * 1.6, y: 0, z: z + (i & 1 ? -1.4 : 1.2), f: 0, act: i ? 'work' : 'walk', stam: 0.9 - i * 0.2 }));
        window.__lpMen = men; window.__lpOrig = [window.cwDrawList, window.cwGang];
        window.cwDrawList = (S, place) => (place === 'line' ? window.__lpMen : []);
        window.cwGang = (S, k) => window.__lpMen.filter(m => m.stage === k).map((m, i) => ({ id: m.id, x: m.x, z: m.z, slot: i }));
      }, [s.lp.x, s.lp.z]);
      await step(1); await frames(4);
      const m0 = await page.evaluate(() => window.__lpMen[0]);
      await tapAt(m0.x, m0.z, 1.0);
      s = await st();
      const card1 = await page.evaluate(() => ({ t: document.getElementById('lpCardTitle').textContent, b: document.getElementById('lpCardBody').textContent }));
      if (!s.card || card1.t !== 'Pat Doyle' || !/Spiking/.test(card1.b) || !/Stamina: *90%/.test(card1.b) || !/walking/.test(card1.b)) P('a tap on a man did not open his Look card: ' + JSON.stringify(card1));
      if (s.lp.tx !== undefined) P('a tap on a man walked the player');
      await shot('look-man');
      await tapAt(m0.x, m0.z, 1.0);
      const card2 = await page.evaluate(() => ({ t: document.getElementById('lpCardTitle').textContent, b: document.getElementById('lpCardBody').textContent }));
      if (card2.t !== 'Spiking gang' || !/Men: 2/.test(card2.b) || !/Pat Doyle, Sean Burke/.test(card2.b)) P('a second tap on the man did not open his gang\'s card: ' + JSON.stringify(card2));
      await shot('look-gang');
      await tapAt(s.lp.x - 4, s.lp.z);
      await step(1);
      s = await st();
      if (s.card || s.lp.tx !== undefined) P('a tap away from the card did not just close it');
      await page.evaluate(() => { [window.cwDrawList, window.cwGang] = window.__lpOrig; });
      // ---- Back now, the look point, a ride when the train has gone, Ride out now ----
      await page.tap('#lpBtnBack');
      await step(1); await frames(4);
      s = await st();
      if (s.lp || s.away || s.view !== 'station' || s.line) P('"Back now" did not bring him to the station: ' + JSON.stringify({ lp: s.lp, away: s.away, view: s.view }));
      await devTap('look');
      await step(1); await frames(4);
      s = await st();
      if (s.view !== 'line' || !s.lnBar || s.bar) P('"Look at the line" did not show the line with the look-point bar');
      await page.tap('#lnBarBack'); await step(1);
      await devTap('ride');
      await step(1);
      s = await st();
      if (!s.lp || s.lp.ph !== 'line') P('with the train gone, "Ride out as a rail worker" did not take him there at once');
      await page.tap('#lpBtnBack'); await step(1);
      await devTap('rideNow');
      await step(1); await frames(4);
      s = await st();
      if (!s.lp || s.lp.ph !== 'line' || s.view !== 'line' || s.tr !== 'stand') P('"Ride out now" did not set him down on the line: ' + JSON.stringify({ lp: s.lp, view: s.view, tr: s.tr }));
      const lookRow = await page.evaluate(() => window.__railhead.dv.rows().map(r => r.id));
      if (lookRow.includes('look') || !lookRow.includes('backNow') || !lookRow.includes('backTrain')) P('on the line the dev panel\'s rows are wrong: ' + lookRow.join(' '));
      await page.evaluate(() => { const p = document.getElementById('devPanel'); if (!p.hidden) document.getElementById('devClose').click(); });
      // ---- The bar: thumb-sized, on the screen ----
      const btns = await page.evaluate(() => [...document.querySelectorAll('#lpBar button')].filter(b => !b.hidden && b.getClientRects().length).map(b => { const r = b.getBoundingClientRect(); return { id: b.id, w: r.width, h: r.height, l: r.left, r: r.right, t: r.top, b: r.bottom }; }));
      if (!btns.some(b => b.id === 'lpBtnHome') || !btns.some(b => b.id === 'lpBtnBack')) P('the line\'s bar lacks Ride home or Back now: ' + btns.map(b => b.id).join(','));
      for (const b of btns) if (b.h < 44 || b.w < 44 || b.l < 0 || b.r > vp.width || b.t < 0 || b.b > vp.height) P(`the bar's button ${b.id} is not thumb-sized on the screen: ${JSON.stringify(b)}`);
      await shot('bar');
      // ---- Home with the evening train ----
      const before = await st();
      await page.tap('#lpBtnHome');
      await step(1);
      s = await until(s => s.lp && s.lp.ph === 'aboardL', 80, 2);
      if (s.lp.ph !== 'aboardL') P('"Ride home" did not take him aboard the crew car: ' + JSON.stringify(s.lp));
      // to 18:20 and on (the line's day and the station's go on)
      await page.evaluate(() => { const R = window.__railhead; for (let i = 0; i < 9000 && ((R.state.time + 18000) % 86400) < 18 * 3600 + 21 * 60; i++) R.step(1); });
      s = await until(s => s.fade >= 0.99, 200);
      if (s.lp.ph !== 'aboardL' || s.view !== 'line') P(`riding home the view did not go dark on the line (${s.lp && s.lp.ph}, ${s.view})`);
      s = await until(s => s.lp && s.lp.ph === 'aboardS', 400);
      if (s.view !== 'station') P('as the train backed in the view did not come back to the station');
      await step(10); await shot('backing-in');
      s = await until(s => !s.lp, 400);
      if (s.lp || s.away || Math.hypot(s.P[0] + 43, s.P[1] + 13) > 0.01) P('off the evening train he did not end at the muster, his own man again: ' + JSON.stringify(s));
      if (!s.stats || !(s.stats.trains > before.stats.trains)) P(`the station's day did not go on while he was away (trains ${before.stats && before.stats.trains} then ${s.stats && s.stats.trains})`);
      if (!s.aw || !(s.aw.levers > 0)) P('no levers were thrown by the relief man while he was away: ' + JSON.stringify(s.aw));
      await page.evaluate(() => window.__railhead.send({ t: 'walkTo', x: -4000, z: -1300 }));
      await step(3);
      if ((await st()).P[2] !== 'to') P('back at the station the player does not walk');
      await shot('home');
      if (errors.length) P('console errors: ' + errors.slice(0, 4).join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  return problems;
};
