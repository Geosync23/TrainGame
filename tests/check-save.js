// Check: saving and loading.
// - Export and re-import give the identical state (same hash).
// - A save written to the browser's storage survives closing and reopening the page.
// - Every old save kept in tests/fixtures still loads, gives its recorded hash, and keeps running.
// - A damaged save (in IndexedDB or the quick save) does not stop the game: it starts fresh, keeps the
//   bad save under a 'broken-<time>' key, and logs no console errors.
// - Of the IndexedDB save and the quick save in localStorage, the one with the higher tick is loaded.
// - Settings' Start over (polish, 2026-11-11): asks first (Cancel keeps the game), then deletes this world's saves
//   (IndexedDB 'auto' and 'world-proto', the quick saves) and reloads to a new game; another world's save is kept.

const fs = require('fs');
const path = require('path');
const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkSave() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    // Play a little so the state is not the starting one.
    const before = await page.evaluate(async () => {
      const R = window.__railhead;
      R.send({ t: 'trainRun', tr: 0, dir: 1 }); R.send({ t: 'walkTo', x: -800, z: 1200 });
      R.step(150);
      const h = R.hash(), json = R.exportSave();
      const h2 = R.importSave(json);
      const ok = await R.saveGame();
      return { h, h2, ok, tick: R.state.tick };
    });
    if (before.h !== before.h2) problems.push('export then import changed the state');
    if (!before.ok) problems.push('saving to the browser failed');
    await page.reload();
    await waitReady(page);
    const after = await page.evaluate(() => ({ h: window.__railhead.hash(), tick: window.__railhead.state.tick }));
    if (after.h !== before.h) problems.push(`after reopening the page the game was different (tick ${after.tick} vs ${before.tick})`);
    // Old saves.
    const dir = path.join(__dirname, 'fixtures');
    const files = fs.readdirSync(dir).filter(f => /^save-v\d+\.json$/.test(f));
    if (!files.length) problems.push('no sample saves in tests/fixtures');
    for (const f of files) {
      const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      // A sample from the current version must load with its own hash. An older one goes through migrate(),
      // so its state changes: it must load with the hash recorded for this version by make-fixture.js.
      const r = await page.evaluate((fx) => {
        const R = window.__railhead, cur = R.newState(1).schemaVersion;
        const raw = R.stateHash(JSON.parse(fx.save).state);
        try { const h = R.importSave(fx.save); const t0 = R.state.tick; R.step(100); return { h, raw, cur, t0, tick: R.state.tick }; }
        catch (e) { return { err: String(e), raw, cur }; }
      }, fx);
      // D29: a sample of the current version may record the hash it loads with when a load-time step changes it on
      // purpose (protoLeversRealign: the switches' stands moved to the one lever frame), under loads like an older one.
      const want = r.cur === fx.schemaVersion ? (fx.loads && fx.loads['v' + r.cur]) || fx.hash : fx.loads && fx.loads['v' + r.cur];
      if (r.raw !== fx.hash) problems.push(`${f} is damaged: its own state no longer gives its recorded hash`);
      if (r.err) problems.push(`${f} did not load: ${r.err}`);
      else if (!want) problems.push(`${f} has no recorded hash for schema version ${r.cur}: run node tests/make-fixture.js`);
      else if (r.h !== want) problems.push(`${f} loaded with a different hash (${r.h} vs ${want})`);
      else if (r.t0 !== JSON.parse(fx.save).state.tick) problems.push(`${f} lost its game time when it loaded`);
      else console.log(`  ${f}: loads${r.cur === fx.schemaVersion ? '' : ' (migrated to v' + r.cur + ')'}, hash ${r.h}, ran on to tick ${r.tick}`);
    }
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
  await checkBadSave(problems);
  await checkNewestWins(problems);
  await checkWorldSaves(problems);
  await checkStartOver(problems);
  return problems;
};

// Writes saves straight into the browser's storage from a blank page of the same site, then opens the game.
async function plantAndOpen(page, url, idbJson, quickJson, query = '?paused&world=start') {
  await page.goto(url + 'tests/blank.html');
  await page.waitForTimeout(500); // let any save started by the game page as it closed finish first
  await page.evaluate(async ([idbJson, quickJson]) => {
    localStorage.clear();
    if (quickJson !== null) localStorage.setItem('railhead-quicksave', quickJson);
    await new Promise((res, rej) => {
      const r = indexedDB.open('railhead', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('saves');
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('saves', 'readwrite'), st = tx.objectStore('saves');
        st.clear();
        if (idbJson !== null) st.put({ gz: false, data: idbJson }, 'auto');
        tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error);
      };
      r.onerror = () => rej(r.error);
    });
  }, [idbJson, quickJson]);
  await page.goto(url + 'index.html' + query);
  await waitReady(page);
}
async function storedKeys(page) {
  return page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('railhead', 1);
    r.onsuccess = () => { const g = r.result.transaction('saves').objectStore('saves').getAllKeys(); g.onsuccess = () => { r.result.close(); res({ idb: g.result.map(String), ls: Object.keys(localStorage) }); }; };
  }));
}

async function checkBadSave(problems) {
  const { browser, page, errors, url } = await openGame('portrait', { query: '?paused' });
  try {
    const good = await page.evaluate(() => { window.__railhead.step(30); return window.__railhead.exportSave(); });
    // IndexedDB: the trains are missing. Quick save: a train in route mode with a broken route (fails when run).
    const a = JSON.parse(good); delete a.state.trains;
    const b = JSON.parse(good); b.state.tick = 999; Object.assign(b.state.trains[0], { mode: 'route', v: 1, route: { total: 5, left: 5 } });
    await plantAndOpen(page, url, JSON.stringify(a), JSON.stringify(b));
    const r = await page.evaluate(() => ({ tick: window.__railhead.state.tick, trains: window.__railhead.state.trains.length }));
    const keys = await storedKeys(page);
    if (r.tick !== 0 || r.trains !== 3) problems.push(`with damaged saves the game did not start fresh (tick ${r.tick})`); // a fresh game: No. 1, the Overland and its (empty) set-out cars
    if (!keys.idb.some(k => /^broken-\d+$/.test(k)) || keys.idb.includes('auto')) problems.push('the damaged IndexedDB save was not kept as broken-<time>: ' + JSON.stringify(keys.idb));
    if (!keys.ls.some(k => /^railhead-broken-\d+$/.test(k)) || keys.ls.includes('railhead-quicksave')) problems.push('the damaged quick save was not kept as railhead-broken-<time>: ' + JSON.stringify(keys.ls));
    // The fresh game runs.
    await page.evaluate(() => window.__railhead.step(20));
    if (errors.length) problems.push('console errors with a damaged save: ' + errors.join(' | '));
    else console.log('  damaged saves: fresh game started, bad saves kept as ' + keys.idb.concat(keys.ls).filter(k => /broken/.test(k)).join(', '));
  } finally { await browser.close(); }
}

async function checkNewestWins(problems) {
  const { browser, page, errors, url } = await openGame('portrait', { query: '?paused' });
  try {
    const s = await page.evaluate(() => {
      const R = window.__railhead;
      R.step(50); const a = R.exportSave(), ha = R.hash();
      R.send({ t: 'walkTo', x: 0, z: 0 }); R.step(50); const b = R.exportSave(), hb = R.hash();
      return { a, ha, b, hb };
    });
    await plantAndOpen(page, url, s.a, s.b); // quick save newer
    const q = await page.evaluate(() => ({ tick: window.__railhead.state.tick, h: window.__railhead.hash() }));
    if (q.h !== s.hb) problems.push(`a newer quick save lost to an older IndexedDB save (loaded tick ${q.tick})`);
    await plantAndOpen(page, url, s.b, s.a); // IndexedDB newer
    const i = await page.evaluate(() => ({ tick: window.__railhead.state.tick, h: window.__railhead.hash() }));
    if (i.h !== s.hb) problems.push(`a newer IndexedDB save lost to an older quick save (loaded tick ${i.tick})`);
    if (q.h === s.hb && i.h === s.hb) console.log(`  newest save wins: quick save and IndexedDB both checked (tick ${q.tick})`);
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
}

// D25 (2026-11-11): a save from another world (an old 3D game) must not open on the prototype's page; it is moved
// aside, not deleted, and comes back when the page is opened in its own world.
async function checkWorldSaves(problems) {
  const { browser, page, errors, url } = await openGame('portrait', { query: '?paused' });
  try {
    const s = await page.evaluate(() => { const R = window.__railhead; R.step(50); return { json: R.exportSave(), h: R.hash() }; });
    await plantAndOpen(page, url, s.json, s.json, '?paused');
    const p = await page.evaluate(() => ({ world: window.__railhead.state.track.world, tick: window.__railhead.state.tick }));
    const keys = await storedKeys(page);
    if (p.world !== 'proto' || p.tick !== 0) problems.push(`with an old start-world save the prototype's page opened ${p.world} at tick ${p.tick}`);
    if (!keys.idb.includes('world-start')) problems.push('the start-world IndexedDB save was not kept as world-start: ' + JSON.stringify(keys.idb));
    if (!keys.ls.includes('railhead-quicksave-start')) problems.push('the start-world quick save was not kept: ' + JSON.stringify(keys.ls));
    await page.goto(url + 'index.html?paused&world=start');
    await waitReady(page);
    const b = await page.evaluate(() => ({ world: window.__railhead.state.track.world, h: window.__railhead.hash() }));
    if (b.world !== 'start' || b.h !== s.h) problems.push(`opening ?world=start did not bring the start save back (${b.world})`);
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    else if (!problems.length) console.log('  saves by world: an old start save set aside on the prototype page and brought back with ?world=start');
  } finally { await browser.close(); }
}

// Polish (2026-11-11, the designer: "a button in the settings to reset the save file").
async function checkStartOver(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  const P = m => problems.push('start over: ' + m);
  try {
    // A prototype game played on, saved everywhere this world's game can be (and an old start-world save set aside).
    const s = await page.evaluate(async () => {
      const R = window.__railhead, h0 = R.hash();   // a new game, as the page starts one
      R.step(200);
      const json = R.exportSave(), tick = R.state.tick;
      await R.saveGame();
      localStorage.setItem('railhead-quicksave', json); localStorage.setItem('railhead-quicksave-proto', json); localStorage.setItem('railhead-quicksave-start', '{}');
      await new Promise((res, rej) => { const r = indexedDB.open('railhead', 1); r.onsuccess = () => { const db = r.result, tx = db.transaction('saves', 'readwrite'), st = tx.objectStore('saves'); st.put({ gz: false, data: json }, 'world-proto'); st.put({ gz: false, data: '{}' }, 'world-start'); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); }; });
      return { tick, world: R.state.track.world, h0 };
    });
    if (s.world !== 'proto' || !(s.tick > 0)) P(`the game to start over is not a played prototype game (${s.world}, tick ${s.tick})`);
    let keys = await storedKeys(page);
    if (!keys.idb.includes('auto') || !keys.idb.includes('world-proto') || !keys.ls.includes('railhead-quicksave')) P('the saves were not planted: ' + JSON.stringify(keys));
    // Settings > Start over asks; Cancel keeps everything.
    await page.evaluate(() => { window.__railhead.pdui.closeBoard(); document.getElementById('setBtn').click(); });   // (the morning's board stands over the panel)
    await page.click('#setReset');
    const ask = await page.evaluate(() => ({ shown: !document.getElementById('setResetAsk').hidden, text: document.getElementById('setResetAsk').textContent }));
    if (!ask.shown || !/This deletes your saved game\. Start over\?/.test(ask.text)) P(`no confirm step (${JSON.stringify(ask)})`);
    await page.screenshot({ path: screenshotPath('polish-reset-confirm-portrait') });
    await page.click('#setResetNo');
    keys = await storedKeys(page);
    const kept = await page.evaluate(() => ({ tick: window.__railhead.state.tick, ask: document.getElementById('setResetAsk').hidden }));
    if (kept.tick !== s.tick || !keys.idb.includes('auto') || !kept.ask) P('Cancel did not keep the game');
    // Yes: the page reloads into a new game; this world's saves are gone, the other world's kept.
    await page.click('#setReset');
    await Promise.all([page.waitForNavigation({ timeout: 15000 }), page.click('#setResetYes')]);
    await waitReady(page);
    const f = await page.evaluate(() => { const R = window.__railhead; return { tick: R.state.tick, world: R.state.track.world, h: R.hash() }; });
    keys = await storedKeys(page);
    if (f.tick !== 0 || f.world !== 'proto' || f.h !== s.h0) P(`after Start over the game is not new (world ${f.world}, tick ${f.tick})`);
    if (keys.idb.includes('world-proto') || keys.ls.includes('railhead-quicksave') || keys.ls.includes('railhead-quicksave-proto')) P('a save of this world is left: ' + JSON.stringify(keys));
    if (!keys.idb.includes('world-start') || !keys.ls.includes('railhead-quicksave-start')) P('another world\'s save was deleted: ' + JSON.stringify(keys));
    if (errors.length) P('console errors: ' + errors.join(' | '));
    else if (!problems.some(m => m.startsWith('start over'))) console.log(`  start over: asked first (Cancel kept tick ${s.tick}), then a new game (tick 0, a new game's hash); other world's save kept`);
  } finally { await browser.close(); }
}
