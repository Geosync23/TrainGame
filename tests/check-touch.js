// Check: touch controls on a phone-sized screen, with real touch events.
// - A tap on the ground walks the character there.
// - Press and hold walks towards the finger; letting go stops.
// - A tap on a switch stand walks there and throws it.
// - A tap on the train walks to it and opens its panel; Send to + a tap on a track sends it.
// - A pinch zooms.
// The game is paused and stepped by hand so the check does not depend on timing.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkTouch() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });
  const R = (fn, arg) => page.evaluate(fn, arg);
  const settle = () => page.waitForTimeout(120);
  const camSettle = () => page.waitForTimeout(900); // the camera follows the character with a soft lag
  try {
    // Tap the ground 2u east of the character.
    const p0 = await R(() => ({ ...window.__railhead.state.player }));
    let sp = await R(([x, z]) => window.__railhead.toScreen(x, z), [p0.x + 2, p0.z - 1]);
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    await R(() => window.__railhead.step(60));
    const p1 = await R(() => ({ ...window.__railhead.state.player }));
    const d1 = Math.hypot(p1.x - (p0.x + 2), p1.z - (p0.z - 1));
    if (!(d1 < 0.15)) problems.push(`tap to walk: ended ${d1.toFixed(2)}u from the tapped spot`);

    await camSettle();
    // Press and hold 4u to the north-west, step while holding, then let go.
    sp = await R(([x, z]) => window.__railhead.toScreen(x, z), [p1.x - 4, p1.z]);
    await touch('touchStart', [sp]);
    await page.waitForTimeout(450);      // longer than the hold threshold, so it counts as a hold
    await R(() => window.__railhead.step(6));
    const p2 = await R(() => ({ ...window.__railhead.state.player }));
    await touch('touchEnd', []); await settle();
    await R(() => window.__railhead.step(4));
    const p3 = await R(() => ({ ...window.__railhead.state.player }));
    const towards = Math.hypot(p1.x - 4 - p1.x, 0) - Math.hypot(p2.x - (p1.x - 4), p2.z - p1.z);
    if (!(towards > 1)) problems.push(`hold to walk: moved only ${towards.toFixed(2)}u towards the finger`);
    if (p3.mode !== 'idle' || Math.hypot(p3.x - p2.x, p3.z - p2.z) > 0.35) problems.push('hold to walk: did not stop after letting go');

    await camSettle();
    // Tap switch stand 1 (id 0).
    const st = await R(() => { const W = window.__railhead.state.track.switches[0]; return { ...W.stand, state: W.state }; });
    sp = await R(([x, z]) => window.__railhead.toScreen(x, z, 0.6), [st.x, st.z]);
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    await R(() => window.__railhead.step(80));
    const swState = await R(() => window.__railhead.state.track.switches[0].state);
    if (swState === st.state) problems.push('tap on switch stand: the switch was not thrown');

    await camSettle();
    // Tap the train: walk there, panel opens.
    // Pick the vehicle nearest the middle of the screen.
    sp = await R(() => {
      const R = window.__railhead, S = R.state;
      return R.trainPoses(S.track, S.trains[0]).map(v => R.toScreen(v.x, v.z, 1.1))
        .filter(p => p.x > 20 && p.x < innerWidth - 20 && p.y > 220 && p.y < innerHeight - 100)
        .sort((a, b) => Math.hypot(a.x - innerWidth / 2, a.y - innerHeight / 2) - Math.hypot(b.x - innerWidth / 2, b.y - innerHeight / 2))[0];
    });
    if (!sp) throw new Error('no part of the train is on screen to tap');
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    for (let i = 0; i < 40; i++) { await R(() => window.__railhead.step(10)); if (await page.isVisible('#panel')) break; }
    if (!(await page.isVisible('#panel'))) problems.push('tap on the train: its panel did not open');
    else {
      await page.screenshot({ path: screenshotPath('touch-panel-portrait') });
      // Send to: tap the button, then tap a track point on the siding.
      await page.tap('#actSend'); await camSettle();
      const tgt = await R(() => { const R = window.__railhead, T = R.state.track; const E = T.edges.find(E => E.k === 'S' && E.cls === 'yard' && T.nodes[E.a].z > 17); const p = R.edgeAt(T, E, E.len / 2); return { x: p.x, z: p.z, e: E.id }; });
      sp = await R(([x, z]) => window.__railhead.toScreen(x, z, 0.2), [tgt.x, tgt.z]);
      const onScreen = sp.x > 0 && sp.y > 0 && sp.x < 390 && sp.y < 844;
      if (onScreen) {
        await page.touchscreen.tap(sp.x, sp.y); await settle();
        await R(() => window.__railhead.step(1));
        const mode = await R(() => window.__railhead.state.trains[0].mode);
        if (mode !== 'route') problems.push(`send to: tapping the siding did not set a route (train mode ${mode})`);
      } else console.log('  send to: siding not on screen from here, skipped the tap');
    }

    // Pinch out with two fingers.
    const z0 = await R(() => window.__railhead.camera.zoom);
    await touch('touchStart', [{ x: 160, y: 420 }, { x: 230, y: 420 }]);
    for (let i = 1; i <= 5; i++) { await touch('touchMove', [{ x: 160 - i * 15, y: 420 }, { x: 230 + i * 15, y: 420 }]); await page.waitForTimeout(16); }
    await touch('touchEnd', []); await settle();
    const z1 = await R(() => window.__railhead.camera.zoom);
    if (!(z1 > z0 * 1.3)) problems.push(`pinch: zoom went from ${z0.toFixed(2)} to ${z1.toFixed(2)}`);

    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    console.log(`  walk ok ${d1.toFixed(3)}u; hold moved ${towards.toFixed(2)}u; zoom ${z0.toFixed(2)} -> ${z1.toFixed(2)}`);
    return problems;
  } finally { await browser.close(); }
};
