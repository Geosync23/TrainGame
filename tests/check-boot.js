// Check: the page loads at phone size (portrait and landscape) with no console
// errors, three.js r128 is the version running, the scene draws, and a
// screenshot is saved to test-output/.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkBoot() {
  const problems = [];
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation);
    try {
      const info = await page.evaluate(() => window.__railhead);
      if (info.threeRevision !== '128') problems.push(`${orientation}: three.js revision is ${info.threeRevision}, expected 128`);
      if (!(info.drawCalls > 0)) problems.push(`${orientation}: nothing was drawn`);
      if (errors.length) problems.push(`${orientation}: console errors: ${errors.join(' | ')}`);
      await page.screenshot({ path: screenshotPath('boot-' + orientation) });
      console.log(`  ${orientation}: draw calls ${info.drawCalls}`);
    } finally {
      await browser.close();
    }
  }
  return problems;
};
