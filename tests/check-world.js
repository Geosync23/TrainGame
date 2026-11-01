// Check: the ground and the light (piece 3a).
// - The ground is flat (height 0) under every track edge and over the yard and station area.
// - There are hills somewhere (higher than 1u).
// - The drawn ground matches terrainHeight(): a ray cast straight down hits it at that height.
// - Day and night: noon keeps the approved brightness, night is darker but not black, lamps glow at night.
// - Screenshots at 05:30, noon, 19:30 and 23:00 game time in portrait, with draw calls reported.

const { openGame, screenshotPath } = require('./browser');

const SHOTS = [['0530', 0.5], ['1200', 7], ['1930', 14.5], ['2300', 18]]; // hours after the 05:00 start

module.exports = async function checkWorld() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    const r = await page.evaluate(() => {
      const S = window.__railhead.state, T = S.track, out = { trackBad: [], yardBad: [], meshBad: [] };
      for (const E of T.edges) {
        const k = Math.max(2, Math.ceil(E.len / 0.25));
        for (let i = 0; i <= k; i++) {
          const p = window.__railhead.edgeAt(T, E, E.len * i / k);
          // The centre line and both edges of the 1.5u ballast, plus a 4u margin each side.
          for (const o of [-4, -0.75, 0, 0.75, 4]) {
            const x = p.x - p.tz * o, z = p.z + p.tx * o, h = terrainHeight(x, z);
            if (h !== 0) out.trackBad.push(`edge ${E.id} at (${x.toFixed(2)}, ${z.toFixed(2)}): ${h}`);
          }
        }
      }
      for (let x = -25; x <= 25; x += 0.5) for (let z = -20; z <= 24; z += 0.5) {
        const h = terrainHeight(x, z);
        if (h !== 0) out.yardBad.push(`(${x}, ${z}): ${h}`);
      }
      let max = 0;
      for (let x = -64; x <= 64; x += 1) for (let z = -64; z <= 64; z += 1) max = Math.max(max, terrainHeight(x, z));
      out.maxHeight = max;
      // Ray cast down at sample points, including some on hills.
      const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
      const pts = [[0, 0], [-10.5, 11.2], [37.3, 41.9], [-45.1, -50.7], [52.6, -33.3], [-55.5, 30.25], [20.2, 55.9], [-30.7, -42.3]];
      let hillPts = 0;
      for (const [x, z] of pts) {
        ray.set(new THREE.Vector3(x, 100, z), down);
        const hit = ray.intersectObjects(TERRAIN.meshes, false)[0];
        const h = terrainHeight(x, z);
        if (h > 0.5) hillPts++;
        if (!hit) out.meshBad.push(`(${x}, ${z}): no ground hit`);
        else if (Math.abs(hit.point.y - h) > 1e-3) out.meshBad.push(`(${x}, ${z}): mesh ${hit.point.y.toFixed(3)}, terrainHeight ${h.toFixed(3)}`);
      }
      out.hillPts = hillPts;
      out.chunks = TERRAIN.meshes.length;
      // Light at a few times.
      const at = t => { const d = daylightAt(t); return { sun: d.sunI, hemi: d.hemiI, glow: d.glow, el: Math.asin(d.dir[1]) * 180 / Math.PI }; };
      out.noon = at(7 * 3600); out.night = at(18 * 3600); out.dawnish = at(1800);
      return out;
    });
    if (r.trackBad.length) problems.push(`ground not flat at the track (${r.trackBad.length} points), e.g. ${r.trackBad.slice(0, 3).join('; ')}`);
    if (r.yardBad.length) problems.push(`ground not flat in the yard area (${r.yardBad.length} points), e.g. ${r.yardBad.slice(0, 3).join('; ')}`);
    if (!(r.maxHeight > 1)) problems.push(`no hills: highest ground is ${r.maxHeight}u`);
    if (r.meshBad.length) problems.push(`drawn ground differs from terrainHeight: ${r.meshBad.join('; ')}`);
    if (r.hillPts < 2) problems.push(`only ${r.hillPts} ray sample points landed on hills; move the samples`);
    if (r.chunks !== 4) problems.push(`expected 4 ground chunks, found ${r.chunks}`);
    if (Math.abs(r.noon.sun - 0.8) > 0.03 || Math.abs(r.noon.hemi - 0.5) > 0.03) problems.push(`noon light changed: sun ${r.noon.sun.toFixed(2)}, sky ${r.noon.hemi.toFixed(2)} (approved 0.8, 0.5)`);
    if (!(r.night.sun < r.noon.sun / 2)) problems.push(`night is not darker: sun ${r.night.sun.toFixed(2)}`);
    if (!(r.night.hemi >= 0.25)) problems.push(`night sky light ${r.night.hemi.toFixed(2)} is too dark to read on a phone`);
    if (!(r.night.glow > 0.8) || !(r.noon.glow === 0)) problems.push(`lamps: glow ${r.noon.glow} at noon, ${r.night.glow} at night`);
    console.log(`  highest ground ${r.maxHeight.toFixed(2)}u; noon sun ${r.noon.sun.toFixed(2)} sky ${r.noon.hemi.toFixed(2)} at ${r.noon.el.toFixed(0)} deg; night sun ${r.night.sun.toFixed(2)} sky ${r.night.hemi.toFixed(2)}`);

    // Screenshots through the day. The game is paused, so set the clock and let a frame draw.
    const calls = [];
    for (const [name, hours] of SHOTS) {
      const dc = await page.evaluate((t) => new Promise((res) => {
        window.__railhead.state.time = t;
        requestAnimationFrame(() => requestAnimationFrame(() => res(window.__railhead.drawCalls)));
      }), Math.round(hours * 3600));
      await page.waitForTimeout(100);
      await page.screenshot({ path: screenshotPath('world-' + name + '-portrait') });
      calls.push(`${name.slice(0, 2)}:${name.slice(2)} ${dc}`);
      if (dc > 100) problems.push(`${name}: ${dc} draw calls (budget 100)`);
    }
    // A wide view at noon, zoomed out, to show the hills.
    const wide = await page.evaluate(() => new Promise((res) => {
      window.__railhead.state.time = 7 * 3600; window.__railhead.camera.zoom = 0.6;
      requestAnimationFrame(() => requestAnimationFrame(() => res(window.__railhead.drawCalls)));
    }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: screenshotPath('world-wide-portrait') });
    console.log(`  draw calls: ${calls.join(', ')}, zoomed out ${wide}`);
    if (wide > 100) problems.push(`zoomed out: ${wide} draw calls (budget 100)`);
    if (errors.length) problems.push(`console errors: ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
  return problems;
};
