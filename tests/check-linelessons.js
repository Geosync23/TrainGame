// Check: the line's lessons (plans/d32-tech.md 7.2 and 11.5, Play's stage 2), in the lesson system of D27 (the same
// cards, Show me and Skip, kept in S.pd.les, replayed from Settings).
// The sim:
// - Riding out (lnRide) opens the first time he is set down on the line, waiting for Show me; walking up to a gang and
//   joining one complete it. Each of the six stages' lessons (lnClear ... lnSpike) opens the first time he joins that
//   gang; his first action completes its first step, the third its second. Stepping out (lnLeave) opens the first
//   time he steps out; coming home (lnHome) at six o'clock on the line, done when he is home.
// - Each opens once and never again; Settings' replay starts them all again; they are in the save (the state as JSON
//   mid-day, played on with the same commands, gives the same hash).
// The page (portrait and landscape): the first card is up on the line with Show me (a real tap lets the clock run),
// the game panel waits while the first card of a stage's lesson holds the game, the card is inside the screen;
// Settings has the Lessons row on the line too. No console errors. Screenshots linelessons-*.png.
// D33 (one world): this check plays the PARKED separate-line build (the page's ?d33=0), whose screen switch,
// fades and look point it was written for. The same play in the one world is check-d33's.
const { openGame, screenshotPath } = require('./browser');

const LN = ['lnRide', 'lnClear', 'lnDig', 'lnRock', 'lnTies', 'lnRails', 'lnSpike', 'lnLeave', 'lnHome'];

module.exports = async function checkLineLessons() {
  const problems = [];
  // ---- The sim ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d33=0' });
    const P = m => problems.push('sim: ' + m);
    try {
      const r = await page.evaluate((LN) => {
        const R = window.__railhead, g = (0, eval), bad = [], B = m => bad.push(m), L = R.les;
        const ids = L.PD_LESSONS.map(q => q.id);
        for (const id of LN) if (!ids.includes(id)) B('no lesson ' + id);
        for (const q of L.PD_LESSONS.filter(q => /^ln/.test(q.id))) {
          if (q.steps.length < 2 || q.steps.length > 4) B(`${q.id}: ${q.steps.length} steps`);
          for (const s of q.steps) if (typeof s.text() !== 'string' || !s.text().length || typeof s.short() !== 'string' || s.target(null) !== null) B(`${q.id}: a step without words`);
          if (!q.title || !Array.isArray(q.pic)) B(`${q.id}: no title or picture`);
        }
        const S = R.newState(7, 'proto'), sod = () => (S.time + 18000) % 86400, les = () => JSON.stringify(Object.fromEntries(Object.entries(S.pd.les || {}).filter(([k]) => /^ln/.test(k))));
        const seen = [];
        // (with no command, the station's days go on as the player's would: the next morning, the day started)
        const tick = (cmds) => { cmds = cmds || (S.pd.ph === 'summary' ? [{ t: 'pdNextDay' }] : S.pd.ph === 'morning' ? [{ t: 'pdStart' }] : []); if (window.__lnRec) window.__lnRec.push(JSON.parse(JSON.stringify(cmds))); const ev = R.simTick(S, cmds); for (const e of ev) if ((e.t === 'pdLesson' || e.t === 'pdLessonDone') && /^ln/.test(e.id)) seen.push(e.id + ':' + (e.step !== undefined ? e.step : 'done')); return ev; };
        tick([{ t: 'pdStart' }, { t: 'dvSet', k: 'crew', v: 30 }]);
        for (let n = 0; n < 40000 && !(S.ln && S.ln.day >= 2 && sod() > 9 * 3600); n++) tick(S.pd.ph === "summary" ? [{ t: "pdNextDay" }] : S.pd.ph === "morning" ? [{ t: "pdStart" }] : []);
        if (Object.keys(S.pd.les || {}).some(k => /^ln/.test(k))) B('a line lesson opened before he went out: ' + les());
        // riding out
        tick([{ t: 'lpRide', how: 'now' }]);
        const st = id => (S.pd.les || {})[id];
        if (st('lnRide') !== 0 || !(S.pd.lesWait || []).includes('lnRide')) B('riding out: lnRide did not open waiting for Show me: ' + les());
        tick([{ t: 'pdLesson', id: 'lnRide', act: 'show' }]);
        const walkTo = (k) => { for (let n = 0; n < 4 && g('lgNearStage')(S) !== k; n++) { const sp = g('lgSpot')(S, k, 1); tick([{ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }]); for (let i = 0; i < 500 && S.lp.tx !== undefined; i++) tick(); } };   // (aimed again: the gang works on while he walks up)
        walkTo(1);
        if (st('lnRide') !== 1) B('walking up to a gang did not take lnRide to its second step: ' + les());
        // each stage: join, three actions, step out
        for (let k = 0; k < 6; k++) {
          walkTo(k);
          tick([{ t: 'lpJoin', stage: k }]);
          for (let i = 0; i < 40 && S.lp.tx !== undefined; i++) tick();
          const id = LN[k + 1];
          if (k === 0 && st('lnRide') !== -1) B('joining a gang did not finish lnRide: ' + les());
          if (st(id) !== 0) { B(`joining gang ${k} did not open ${id}: ` + les()); continue; }
          tick([{ t: 'pdLesson', id, act: 'show' }]);
          let n = 0;
          for (let i = 0; i < 3; i++) {
            for (let w = 0; w < 10; w++) tick();
            const ev = tick([{ t: 'lgDone', stage: k, q: 90 }]);
            if (ev.some(e => e.t === 'lgDid')) n++;
            if (i === 0 && st(id) !== 1) B(`${id}: his first action did not take it to step 2: ` + les());
          }
          if (n !== 3) B(`${id}: ${n} of 3 actions were taken`);
          if (st(id) !== -1) B(`${id}: three actions did not finish it: ` + les());
          tick([{ t: 'lpLeave' }]);
          if (k === 0 && st('lnLeave') !== 0) B('stepping out did not open lnLeave: ' + les());
          if (k === 0) tick([{ t: 'pdLesson', id: 'lnLeave', act: 'show' }]);
        }
        if (st('lnLeave') !== -1) B('walking on and joining again did not finish lnLeave: ' + les());
        // never twice: join the diggers again
        walkTo(1); const before = seen.length;
        tick([{ t: 'lpJoin', stage: 1 }]); for (let i = 0; i < 20; i++) tick();
        tick([{ t: 'lpLeave' }]);
        if (seen.length !== before) B('a lesson opened a second time: ' + seen.slice(before).join(' '));
        // the save: export and import keep the lessons and play on alike
        const S2 = JSON.parse(JSON.stringify(S));   // (a save: the state as JSON)
        if (R.stateHash(S2) !== R.stateHash(S)) B('the state as JSON is not the same state');
        window.__lnRec = [];
        // coming home: to six o'clock on the line
        for (let n = 0; n < 9000 && !(st('lnHome') === 0); n++) tick();
        if (st('lnHome') !== 0) B('six o\'clock on the line did not open lnHome: ' + les() + ' at ' + sod());
        tick([{ t: 'pdLesson', id: 'lnHome', act: 'show' }]);
        tick([{ t: 'lpBack', how: 'train' }]);
        for (let n = 0; n < 9000 && S.lp; n++) tick();
        if (S.lp || st('lnHome') !== -1) B('home with the evening train did not finish lnHome: ' + les());
        // replay (Settings): all again; riding out opens lnRide again
        tick([{ t: 'pdLesson', act: 'replay' }]);
        if (Object.keys(S.pd.les).length) B('replay did not clear the lessons');
        for (let n = 0; n < 12000 && !(sod() > 9 * 3600 && sod() < 10 * 3600 && S.ln.tr.ph === 'stand'); n++) tick();
        tick([{ t: 'lpRide', how: 'now' }]);
        if (st('lnRide') !== 0) B('after replay riding out did not open lnRide again: ' + les());
        const rec = window.__lnRec; window.__lnRec = null;
        for (const c of rec) R.simTick(S2, c);
        if (R.stateHash(S2) !== R.stateHash(S)) B('from a save made mid-day, the same ticks did not give the same state');
        return { bad, seen: seen.join(' ') };
      }, LN);
      for (const b of r.bad) P(b);
      if (process.env.LG_DEBUG) console.log('  sim: ' + r.seen);
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  // ---- The page ----
  for (const orient of ['portrait', 'landscape']) {
    const P = m => problems.push(`${orient}: ${m}`);
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&dev=1&d33=0' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      const vp = page.viewportSize();
      const card = () => page.evaluate(() => { const e = document.getElementById('pdLesson'), r = e.getBoundingClientRect(); return { shown: !e.hidden && getComputedStyle(e).display !== 'none', hold: e.classList.contains('hold'), title: document.getElementById('pdLesTitle').textContent, l: r.left, r: r.right, t: r.top, b: r.bottom, panel: !document.getElementById('lgPanel').hidden }; });
      const inside = (c, what) => { if (c.l < 0 || c.r > vp.width + 0.5 || c.t < 0 || c.b > vp.height + 0.5) P(`${what}: the card is not inside the screen: ${JSON.stringify(c)}`); };
      await page.evaluate(() => {
        const R = window.__railhead, S = () => R.state, sod = () => (S().time + 18000) % 86400;
        R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(2);
        for (let n = 0; n < 40000 && !(S().ln && S().ln.day >= 2 && sod() > 9 * 3600); n++) { const ph = S().pd.ph; if (ph === "summary") R.send({ t: "pdNextDay" }); else if (ph === "morning") R.send({ t: "pdStart" }); R.step(1); }
        const les = S().pd.les; for (const id of Object.keys(les)) if (!/^ln/.test(id)) les[id] = -1; delete S().pd.lesWait;   // (the station's lessons put by)
        const c = document.getElementById('pdSum'); if (c) c.hidden = true;
        R.send({ t: 'lpRide', how: 'now' }); R.step(1);
      });
      await frames(4);
      let c = await card();
      if (!c.shown || !c.hold || !/Out on the line/.test(c.title)) P('on the line the first lesson card is not up, holding the game: ' + JSON.stringify(c) + JSON.stringify(await page.evaluate(() => ({ les: window.__railhead.state.pd.les, w: window.__railhead.state.pd.lesWait, lp: window.__railhead.state.lp }))));
      inside(c, 'riding out');
      await page.screenshot({ path: screenshotPath(`linelessons-ride-${orient}`) });
      await page.tap('#pdLesShow'); await page.evaluate(() => window.__railhead.step(1)); await frames(3);
      if ((await page.evaluate(() => window.__railhead.state.pd.lesWait || [])).includes('lnRide')) P('Show me did not let the lesson run');
      // join the spikers: their lesson's first card holds the game; the panel waits
      await page.evaluate(() => { const R = window.__railhead, S = R.state, g = (0, eval); for (let n = 0; n < 4 && g('lgNearStage')(S) !== 5; n++) { const sp = g('lgSpot')(S, 5, 1); R.send({ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }); R.step(1); for (let i = 0; i < 500 && S.lp.tx !== undefined; i++) R.step(1); } });
      await frames(4);
      const jb = await page.evaluate(() => !document.getElementById('lgJoin').hidden);
      if (!jb) { P('no Join button beside the spikers'); continue; }
      await page.tap('#lgJoin');
      await page.evaluate(() => window.__railhead.step(1)); await frames(4);
      c = await card();
      if (!c.shown || !c.hold || !/Spiking/.test(c.title)) P('joining the spikers did not show their lesson\'s first card: ' + JSON.stringify(c));
      if (c.panel) P('the game panel is up while the lesson\'s first card holds the game');
      inside(c, 'spiking');
      await page.screenshot({ path: screenshotPath(`linelessons-spike-${orient}`) });
      await page.tap('#pdLesShow'); await page.evaluate(() => window.__railhead.step(1)); await frames(4);
      c = await card();
      if (!c.panel) P('after Show me the game panel did not come up');
      if (c.shown && c.hold) P('after Show me the card still holds the game');
      if (c.shown) inside(c, 'spiking, the slip');
      await page.screenshot({ path: screenshotPath(`linelessons-slip-${orient}`) });
      // Settings on the line: the Lessons row
      await page.tap('#setBtn'); await frames(4);
      const row = await page.evaluate(() => { const e = document.getElementById('setLesRow'); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; });
      if (!row) P('Settings on the line has no Lessons row');
      else {
        await page.tap('#setLessons'); await frames(2);
        await page.evaluate(() => window.__railhead.step(1));
        const les = await page.evaluate(() => window.__railhead.state.pd.les);
        if (Object.keys(les).some(k => /^ln/.test(k) && les[k] === -1)) P('Replay on the line did not start the line\'s lessons again: ' + JSON.stringify(les));
      }
      await page.evaluate(() => window.closeSettings());
      if (errors.length) P('console errors: ' + errors.slice(0, 4).join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  return problems;
};
