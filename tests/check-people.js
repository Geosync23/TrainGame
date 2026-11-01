// Check: the crowd (piece 4). With ?crowd=200 at phone size (portrait): no console errors, all three
// kits (and some women and children) are present, the total draw calls stay under 100, the frame time
// is measured over about 3 seconds (reported; fails only above 50 ms a frame, since headless Chromium
// draws without a real graphics chip), the walkers really move, and they freeze when the game is paused.
// Saves a close-up of a group of walkers and a zoomed-out view to test-output/.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkPeople() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?crowd=200&world=yard' });
  try {
    const info = await page.evaluate(() => window.__railhead.crowdInfo());
    if (info.count !== 200) problems.push(`expected 200 walkers, got ${info.count}`);
    for (const k of ['chunky', 'lanky', 'stocky']) if (!(info.kits[k] > 0)) problems.push(`no ${k} walkers`);
    if (!(info.women > 0)) problems.push('no women in the crowd');
    if (!(info.children > 0)) problems.push('no children in the crowd');
    console.log(`  kits: chunky ${info.kits.chunky}, lanky ${info.kits.lanky}, stocky ${info.kits.stocky}; women ${info.women}, children ${info.children}`);
    console.log(`  roles: ${Object.entries(info.roles).map(([k, v]) => `${k} ${v}`).join(', ')}`);

    // Draw calls of one whole frame, shadow pass included (the game's drawCalls figure counts both passes).
    const frameCalls = () => page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve({ c: window.__railhead.drawCalls, t: renderer.info.render.triangles })));
    }));
    // Frame time over about 3 seconds of real time (the first frame is left out).
    const frameTime = () => page.evaluate(() => new Promise((resolve) => {
      const times = []; let last = performance.now(); const t0 = last;
      function f(now) { times.push(now - last); last = now; if (now - t0 < 3000) requestAnimationFrame(f); else resolve(times.slice(1)); }
      requestAnimationFrame(f);
    }));
    const avgOf = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const withCrowd = await frameCalls(), ftWith = await frameTime();
    await page.evaluate(() => window.__railhead.setCrowd(0));
    const without = await frameCalls(), ftWithout = await frameTime();
    await page.evaluate(() => window.__railhead.setCrowd(200));
    await frameCalls();
    const crowdCalls = withCrowd.c - without.c;
    console.log(`  draw calls per frame (shadow pass included): ${withCrowd.c} with 200 walkers, ${without.c} without; the crowd costs ${crowdCalls} (${info.meshes} instanced meshes)`);
    console.log(`  triangles drawn per frame (both passes): ${withCrowd.t} with the crowd, ${without.t} without`);
    if (withCrowd.c >= 100) problems.push(`${withCrowd.c} draw calls with 200 walkers (budget under 100)`);
    if (crowdCalls > 30) problems.push(`the crowd costs ${crowdCalls} draw calls (expected 30 or fewer)`);

    // The crowd's own work on the processor each frame (moving walkers and posing limbs).
    const cpuMs = await page.evaluate(() => { const t = performance.now(); for (let i = 0; i < 60; i++) updateCrowd(1 / 60); return (performance.now() - t) / 60; });
    const gpu = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'), e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    const software = /swiftshader|llvmpipe|software/i.test(gpu);
    const aW = avgOf(ftWith), aWo = avgOf(ftWithout);
    console.log(`  frame time: ${aW.toFixed(1)} ms (${(1000 / aW).toFixed(1)} fps) with 200 walkers, ${aWo.toFixed(1)} ms (${(1000 / aWo).toFixed(1)} fps) without; crowd update ${cpuMs.toFixed(2)} ms per frame`);
    console.log(`  drawing on: ${gpu}${software ? ' (software drawing, no graphics chip: frame times say little about a phone)' : ''}`);
    if (cpuMs > 4) problems.push(`the crowd update takes ${cpuMs.toFixed(2)} ms per frame (limit 4 ms)`);
    if (!software && aW > 50) problems.push(`average frame time ${aW.toFixed(1)} ms is over 50 ms`);
    if (software && aW > 50) console.log('  note: the 50 ms frame limit is not applied here, because even the scene without the crowd is slower than that in software drawing');

    // The walkers move.
    const p1 = (await page.evaluate(() => window.__railhead.crowdInfo())).pos;
    await page.waitForTimeout(1000);
    const p2 = (await page.evaluate(() => window.__railhead.crowdInfo())).pos;
    const moved = p1.filter((p, i) => Math.hypot(p[0] - p2[i][0], p[1] - p2[i][1]) > 0.05).length;
    console.log(`  ${moved} of 200 walkers moved in 1 second`);
    if (moved < 50) problems.push(`only ${moved} walkers moved in a second`);

    // Paused: nobody moves.
    await page.evaluate(() => window.__railhead.setSpeed(0));
    await page.waitForTimeout(200);
    const q1 = (await page.evaluate(() => window.__railhead.crowdInfo())).pos;
    await page.waitForTimeout(600);
    const q2 = (await page.evaluate(() => window.__railhead.crowdInfo())).pos;
    const movedPaused = q1.filter((p, i) => p[0] !== q2[i][0] || p[1] !== q2[i][1]).length;
    if (movedPaused) problems.push(`${movedPaused} walkers moved while the game was paused`);

    // Close-up on the busiest group of walkers, then a wide view. Let them walk a moment first, then freeze.
    await page.evaluate(() => window.__railhead.setSpeed(1));
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const R = window.__railhead, pos = R.crowdInfo().pos;
      let best = null, bestN = -1;
      for (const p of pos) {
        const n = pos.filter(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 3).length;
        if (n > bestN) { bestN = n; best = p; }
      }
      R.setSpeed(0);
      R.camera.ox = best[0] - R.state.player.x; R.camera.oz = best[1] - R.state.player.z; R.camera.zoom = 2.6;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: screenshotPath('people-close') });
    await page.evaluate(() => { const c = window.__railhead.camera; c.ox = 0; c.oz = 0; c.zoom = 0.6; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: screenshotPath('people-wide') });
    if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
  return problems;
};
