// Writes tools/pixelart/proto-layout.json: the prototype's layout (D25) exactly as the game has it, for the art
// pipeline (the ground layer and the buildings are baked where the game puts them). Run after any layout change:
//   node tools/pixelart/export-layout.js
// The game's protoLayoutExport() (index.html, section "pixel renderer (D25)") makes it; plans/proto-sprites.md says
// what each part means.
const fs = require('fs');
const path = require('path');
const { openGame, stopServer } = require('../../tests/browser');
(async () => {
  const { browser, page } = await openGame('portrait', { query: '?paused&world=proto' });
  const json = await page.evaluate(() => JSON.stringify(window.__railhead.proto.protoLayoutExport()));
  await browser.close(); stopServer();
  const file = path.join(__dirname, 'proto-layout.json');
  fs.writeFileSync(file, JSON.stringify(JSON.parse(json)) + '\n');
  console.log('wrote', file, json.length, 'bytes');
})();
