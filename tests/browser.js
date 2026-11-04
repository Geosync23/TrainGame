// Shared helpers for the browser checks.
// Serves the project folder on a local web address (saving in the browser needs a real address,
// not a file path) and opens index.html in Chromium (via Playwright) at phone size.
//
// The test machine may not be able to reach cdnjs. When that happens, the exact
// same three.js release (r128, from the "three" 0.128.0 package in node_modules)
// is served in its place, so the page code under test is unchanged.

const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const THREE_LOCAL = path.join(ROOT, 'node_modules', 'three', 'build', 'three.min.js');
const OUT_DIR = path.join(ROOT, 'test-output');

const VIEWPORTS = {
  portrait: { width: 390, height: 844 },  // typical modern phone
  landscape: { width: 844, height: 390 },
};

let server = null, baseUrl = null;
function startServer() {
  if (server) return Promise.resolve(baseUrl);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };
  server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    baseUrl = `http://127.0.0.1:${server.address().port}/`;
    resolve(baseUrl);
  }));
}
function stopServer() { if (server) { server.close(); server = null; } }

let cdnReachable = null; // remembered after the first try, so a blocked cdnjs costs one timeout only

// Opens the game. options.fresh (default true) clears any saved game first.
async function openGame(viewportName, options = {}) {
  const url = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  // D22 (1): the first-time cards pause the game and stand over the middle of the screen. The checks written before
  // them open the game with the cards off (the player's Settings choice, kept in the browser), unless options.cards;
  // tests/check-explain.js checks the cards themselves. A choice already stored (a reload) is kept.
  if (!options.cards) await context.addInitScript(() => { try { if (localStorage.getItem('railhead-cards') === null) localStorage.setItem('railhead-cards', 'off'); } catch (e) { /* no storage */ } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.route(THREE_URL, async (route) => {
    if (cdnReachable !== false) {
      try {
        const res = await route.fetch({ timeout: 5000 });
        if (res.ok()) { cdnReachable = true; return route.fulfill({ response: res }); }
      } catch (e) { /* cdnjs unreachable: fall through to the local copy */ }
      cdnReachable = false;
    }
    route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(THREE_LOCAL, 'utf8') });
  });

  if (options.fresh !== false) {
    await page.goto(url + 'tests/blank.html');
    await page.evaluate(() => new Promise((res) => { const r = indexedDB.deleteDatabase('railhead'); r.onsuccess = r.onerror = r.onblocked = () => res(); }));
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* no storage */ } }); // the quick save lives here
  }
  await page.goto(url + 'index.html' + (options.query || ''));
  await waitReady(page);
  return { browser, context, page, errors, url };
}
async function waitReady(page) {
  await page.waitForFunction(() => window.__railhead && window.__railhead.ready, null, { timeout: 15000 });
  await page.waitForTimeout(300); // let a few frames render
}

function screenshotPath(name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  return path.join(OUT_DIR, name + '.png');
}

module.exports = { openGame, waitReady, screenshotPath, startServer, stopServer, VIEWPORTS, ROOT };
