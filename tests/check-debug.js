// Check: the debug tools (?debug=1).
// - Without ?debug=1: window.rh is undefined, there is no debug bar, and the draw calls are the same
//   as with debug on and every overlay hidden (so debug costs nothing when off).
// - With ?debug=1: each overlay draws (one extra draw call each); a screenshot of each lands in test-output/.
// - The debug bar opens with a real tap and its buttons are thumb-sized.
// - rh.scenario('siding') puts the train on the passing siding with switch 1 reversed; 'spur' heads into the spur.
// - rh.warp(32) runs the clock much faster than 1x; rh.setTime and rh.teleport work.
// - Debug on does not change the simulation: the same steps give the same hash with and without it.

const { openGame, screenshotPath } = require('./browser');

// Same steps from the same start; runs inside the page.
const STEPS = () => {
  const R = window.__railhead;
  R.send({ t: 'trainRun', tr: 0, dir: 1 }); R.step(30);
  R.send({ t: 'walkTo', x: 300, z: 900 }); R.step(30);
  return R.hash();
};

module.exports = async function checkDebug() {
  const problems = [];
  let offCalls = null, offHash = null;

  // 1. Debug off.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({ rh: typeof window.rh, bar: !!document.getElementById('dbgBar'), calls: window.__railhead.drawCalls }));
      offCalls = r.calls;
      if (r.rh !== 'undefined') problems.push('without ?debug=1, window.rh exists');
      if (r.bar) problems.push('without ?debug=1, the debug bar is in the page');
      offHash = await page.evaluate(STEPS);
      if (errors.length) problems.push('debug off: console errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }

  // 2. Debug on.
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1' });
  try {
    const frames = () => page.waitForTimeout(250);
    if (await page.evaluate(() => typeof window.rh) !== 'object') { problems.push('with ?debug=1, window.rh is missing'); return problems; }
    // Something for every overlay to show: a route for the train and a walk for the player.
    await page.evaluate(() => {
      const T = rh.state.track;
      const siding = T.edges.find(E => E.k === 'S' && E.cls === 'yard' && T.nodes[E.a].z > 17 && T.nodes[E.b].z > 17);
      rh.send({ t: 'trainSendTo', tr: 0, e: siding.id, s: Math.round(siding.len / 2 * 1000) });
      rh.step(40);
      rh.send({ t: 'walkTo', x: 400, z: 1700 }); rh.step(1);
    });
    await frames();
    const names = ['blocks', 'locks', 'routes', 'path'];
    await page.evaluate((n) => n.forEach(k => rh.overlay(k, false)), names);
    await frames();
    const hiddenCalls = await page.evaluate(() => rh.drawCalls);
    if (offCalls !== null && hiddenCalls !== offCalls) problems.push(`draw calls with debug off (${offCalls}) differ from debug on with overlays hidden (${hiddenCalls})`);
    for (const k of names) {
      await page.evaluate((k) => rh.overlay(k, true), k);
      await frames();
      const r = await page.evaluate((k) => ({ calls: rh.drawCalls, built: rh.overlays[k].built }), k);
      if (!r.built) problems.push(`overlay ${k} drew nothing`);
      if (r.calls !== hiddenCalls + 1) problems.push(`overlay ${k}: ${r.calls} draw calls, expected ${hiddenCalls + 1}`);
      await page.screenshot({ path: screenshotPath('debug-' + k) });
      await page.evaluate((k) => rh.overlay(k, false), k);
    }
    await page.evaluate((n) => n.forEach(k => rh.overlay(k, true)), names);
    // The bar: tap the toggle (real touch) to open it.
    await page.tap('#dbgToggle'); await frames();
    const bar = await page.evaluate(() => {
      const g = document.getElementById('dbgGrid');
      const sizes = [...document.querySelectorAll('#dbgBar button')].map(b => b.getBoundingClientRect()).map(r => Math.min(r.width, r.height));
      return { open: !g.hidden, minSize: Math.min(...sizes) };
    });
    if (!bar.open) problems.push('tapping the DBG button did not open the debug bar');
    if (bar.minSize < 48) problems.push(`a debug bar button is only ${bar.minSize}px (thumb minimum 48px)`);
    await page.tap('#dbgBar [data-ov="blocks"]'); await frames();
    if (await page.evaluate(() => rh.overlays.blocks.on)) problems.push('tapping Blocks in the debug bar did not hide the blocks overlay');
    await page.tap('#dbgBar [data-ov="blocks"]'); await frames();
    const allCalls = await page.evaluate(() => rh.drawCalls);
    await page.screenshot({ path: screenshotPath('debug-all') });
    console.log(`  draw calls: debug off ${offCalls}, debug on with overlays hidden ${hiddenCalls}, all overlays ${allCalls}`);

    // Scenarios.
    const sc = await page.evaluate(() => {
      const h = rh.scenario('siding'), S = rh.state, T = S.track, tr = S.trains[0];
      const segs = []; window.__railhead.trackWalk(T, { e: tr.front.e, s: tr.front.s, d: -tr.front.d }, window.__railhead.trainLength(tr), segs);
      const onSiding = segs.every(([e]) => T.edges[e].cls === 'yard' && T.nodes[T.edges[e].a].z > 14.5 && T.nodes[T.edges[e].b].z > 14.5);
      const out = { h, onSiding, sw0: T.switches[0].state, v: tr.v, h2: rh.scenario('siding') };
      // Leaving west from the siding goes out through switch 1 onto the main line.
      rh.send({ t: 'trainRun', tr: 0, dir: 1 }); rh.step(400);
      out.leftWest = window.__railhead.state.trains[0].front.e;
      out.leftEdgeCls = T.edges[window.__railhead.state.trains[0].front.e].cls;
      rh.scenario('spur');
      const W = rh.state.track.switches[2];
      for (let i = 0; i < 1500 && !(rh.state.trains[0].v === 0 && rh.state.tick > 50); i++) rh.step(1);
      out.spurStatus = rh.state.trains[0].status; out.spurSw = W.state;
      out.unknown = rh.scenario('nope');
      return out;
    });
    if (!sc.onSiding) problems.push("rh.scenario('siding'): the train is not wholly on the passing siding");
    if (sc.sw0 !== 'R') problems.push("rh.scenario('siding'): switch 1 is not reversed");
    if (sc.h !== sc.h2) problems.push("rh.scenario('siding') gave a different state the second time");
    if (sc.leftEdgeCls !== 'main') problems.push("from the siding scenario the train did not run out onto the main line");
    if (!/end of the track/.test(sc.spurStatus)) problems.push("rh.scenario('spur'): the train did not run to the end of the spur: " + sc.spurStatus);
    if (sc.unknown !== null) problems.push('an unknown scenario name did not return null');
    await page.evaluate(() => rh.scenario('siding')); await frames();
    await page.screenshot({ path: screenshotPath('debug-scenario-siding') });

    // ?scenario= in the address.
    await page.goto(page.url().replace('?paused&debug=1', '?paused&debug=1&scenario=siding'));
    await page.waitForFunction(() => window.__railhead && window.__railhead.ready);
    if (await page.evaluate(() => rh.state.track.switches[0].state) !== 'R') problems.push('?scenario=siding did not load the siding scenario');

    // Debug on keeps the sim the same: same steps from the same start, same hash.
    await page.evaluate(() => rh.scenario('yard'));
    const onHash = await page.evaluate(STEPS);
    if (onHash !== offHash) problems.push(`the same steps gave hash ${onHash} with debug on and ${offHash} with it off`);

    // setTime and teleport.
    const t = await page.evaluate(() => ({ time: rh.setTime(7 * 3600 + 3), tp: rh.teleport(3, 4), p: { x: rh.state.player.x, z: rh.state.player.z } }));
    if (t.time !== 7 * 3600) problems.push(`rh.setTime(25203) set ${t.time}, expected 25200`);
    if (t.p.x !== 3 || t.p.z !== 4) problems.push('rh.teleport(3, 4) did not move the player');

    // Time warp: game time gained in the same real time at 1x and at 32x.
    const gain = async (n) => page.evaluate(async (n) => {
      rh.warp(n); const t0 = rh.state.time; await new Promise(r => setTimeout(r, 1500)); const g = rh.state.time - t0; rh.warp(0); return g;
    }, n);
    const g1 = await gain(1), g32 = await gain(32);
    console.log(`  in 1.5 s real time: 1x gained ${g1} game s, 32x gained ${g32} game s (${(g32 / Math.max(1, g1)).toFixed(1)} times)`);
    if (!(g1 > 0)) problems.push('at 1x the clock did not move');
    if (!(g32 > 8 * g1)) problems.push(`32x warp gained only ${g32} game s against ${g1} at 1x`);
    if (await page.evaluate(() => { try { rh.warp(64); return true; } catch (e) { return false; } })) problems.push('rh.warp(64) was allowed (limit 32)');

    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
  return problems;
};
