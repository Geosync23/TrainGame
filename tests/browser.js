// Shared helpers for the browser checks.
// Opens index.html in Chromium (via Playwright) at phone size.
//
// The test machine may not be able to reach cdnjs. When that happens, the exact
// same three.js release (r128, from the "three" 0.128.0 package in node_modules)
// is served in its place, so the page code under test is unchanged.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PAGE_URL = 'file://' + path.join(ROOT, 'index.html');
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const THREE_LOCAL = path.join(ROOT, 'node_modules', 'three', 'build', 'three.min.js');
const OUT_DIR = path.join(ROOT, 'test-output');

const VIEWPORTS = {
  portrait: { width: 390, height: 844 },  // typical modern phone
  landscape: { width: 844, height: 390 },
};

async function openGame(viewportName) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.route(THREE_URL, async (route) => {
    try {
      const res = await route.fetch({ timeout: 5000 });
      if (res.ok()) return route.fulfill({ response: res });
    } catch (e) { /* cdnjs unreachable: fall through to the local copy */ }
    route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(THREE_LOCAL, 'utf8') });
  });

  await page.goto(PAGE_URL);
  await page.waitForFunction(() => window.__railhead && window.__railhead.ready, null, { timeout: 10000 });
  await page.waitForTimeout(300); // let a few frames render
  return { browser, page, errors };
}

function screenshotPath(name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  return path.join(OUT_DIR, name + '.png');
}

module.exports = { openGame, screenshotPath, VIEWPORTS };
