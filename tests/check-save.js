// Check: saving and loading.
// - Export and re-import give the identical state (same hash).
// - A save written to the browser's storage survives closing and reopening the page.
// - Every old save kept in tests/fixtures still loads, gives its recorded hash, and keeps running.

const fs = require('fs');
const path = require('path');
const { openGame, waitReady } = require('./browser');

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
      const r = await page.evaluate((fx) => {
        const R = window.__railhead;
        try { const h = R.importSave(fx.save); R.step(100); return { h, tick: R.state.tick }; }
        catch (e) { return { err: String(e) }; }
      }, fx);
      if (r.err) problems.push(`${f} did not load: ${r.err}`);
      else if (r.h !== fx.hash) problems.push(`${f} loaded with a different hash (${r.h} vs ${fx.hash})`);
      else console.log(`  ${f}: loads, hash ${r.h}, ran on to tick ${r.tick}`);
    }
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    return problems;
  } finally { await browser.close(); }
};
