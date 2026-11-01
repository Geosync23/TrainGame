// Check: the page loads at phone size (portrait and landscape) with no console
// errors, three.js r128 is the version running, the scene draws, and a
// screenshot is saved to test-output/.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkBoot() {
  const problems = [];
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused' });
    try {
      const info = await page.evaluate(() => window.__railhead);
      if (info.threeRevision !== '128') problems.push(`${orientation}: three.js revision is ${info.threeRevision}, expected 128`);
      if (!(info.drawCalls > 0)) problems.push(`${orientation}: nothing was drawn`);
      if (errors.length) problems.push(`${orientation}: console errors: ${errors.join(' | ')}`);
      await page.screenshot({ path: screenshotPath('boot-' + orientation) });
      // A busier moment: the train running and the character walking beside it.
      await page.evaluate(() => { const R = window.__railhead; R.send({ t: 'trainRun', tr: 0, dir: -1 }); R.send({ t: 'walkTo', x: -400, z: 1250 }); R.step(25); });
      await page.waitForTimeout(900);
      const busy = await page.evaluate(() => window.__railhead.drawCalls);
      await page.screenshot({ path: screenshotPath('busy-' + orientation) });
      if (errors.length) problems.push(`${orientation}: console errors after running: ${errors.join(' | ')}`);
      if (busy > 100) problems.push(`${orientation}: ${busy} draw calls in a busy scene (budget 100)`);
      console.log(`  ${orientation}: draw calls ${info.drawCalls} at start, ${busy} with the train running`);
    } finally {
      await browser.close();
    }
  }
  return problems;
};
