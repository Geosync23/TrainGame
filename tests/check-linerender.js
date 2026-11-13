// Check: the line drawn (plans/d32-tech.md 1.5 and 11.5, Foundation's), in portrait and landscape.
// - The work train at the station (track 2, 06:00) is in the station's scene, drawn from the atlas.
// - The view switches both ways by touch: the dev panel's "Look at the line", the line's bar "Back to the station";
//   with the line in view the page has the class `line`, the station's HUD is hidden and a tap sends no walking.
// - The line at six places (the bridge, the woods, the cut, the rock, the river, the end of the line) and the railhead
//   at three zooms (scale 1, the default and close up): every chunk made, nothing missing from the atlas, no edge of
//   the ground in view (any point of the view has a tile); screenshots d32-line-*.png.
// - Chunks are redrawn as a front passes (the fronts moved on by the stand-in crew), at most one a frame, none stale
//   after a few frames; a chunk away from the roadbed is never redrawn.
// - Frame time: at scale 1 in the woods with the work train and 30 men standing in (a stand-in cwDrawList), the
//   average frame under 8 ms (reported; the test machine has no GPU, so the limit is 3 times that, as check-pixperf).
// - A one-finger drag looks along the line; the look point stays in the corridor.
const { openGame, screenshotPath } = require('./browser');

const PLACES = [['bridge', 544], ['woods', 700], ['cut', 1080], ['rock', 1400], ['river', 1800], ['end', 2500]];
const BUDGET_MS = 8, SLACK = 3;

module.exports = async function checkLineRender() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const P = m => problems.push(`${orient}: ${m}`);
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&dev=1' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      // ---- The station: the work train on track 2 at 06:00 ----
      await page.evaluate(() => { const R = window.__railhead; R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(2); R.pix.warm(true); R.pix.placePlayer(-20, -12); });
      await frames(6);
      const stn = await page.evaluate(() => { const R = window.__railhead, o = R.pix.PIX.order || []; return { wt: o.filter(id => /^wt\d$/.test(id || '')).length, keys: R.pix.PIX.drawn.filter(d => /^wt/.test(d.id || '')).map(d => d.key), dev: !document.getElementById('devBtn').hidden }; });
      if (stn.wt < 3) P(`the work train is not in the station's scene (${stn.wt} of its vehicles in view)`);
      if (!stn.keys.some(k => /crewcar|gondola|boxcar|flatcar|loco/.test(k))) P('the work train is not drawn from the atlas: ' + stn.keys.join(','));
      if (!stn.dev) P('no Dev button with ?dev=1');
      await page.screenshot({ path: screenshotPath(`d32-station-worktrain-${orient}`) });
      // ---- The view switch by touch ----
      await page.tap('#devBtn');
      await frames(3);
      await page.tap('#devRows button[data-dv="look"]');
      await page.evaluate(() => window.__railhead.step(1));
      await frames(4);
      let v = await page.evaluate(() => { const R = window.__railhead; return { on: R.lnView.on(), cls: document.body.classList.contains('line'), bar: !document.getElementById('lnBar').hidden, next: getComputedStyle(document.getElementById('nextJob')).display, panel: !document.getElementById('devPanel').hidden }; });
      if (!v.on || !v.cls || !v.bar) P('the dev panel\'s "Look at the line" did not bring the line into view: ' + JSON.stringify(v));
      if (v.next !== 'none') P('the station\'s Next job line shows over the line');
      const vp = page.viewportSize(), before = await page.evaluate(() => ({ mode: window.__railhead.state.player.mode, x: window.__railhead.state.player.x }));
      await page.touchscreen.tap(Math.round(vp.width / 2), Math.round(vp.height / 2));
      await page.evaluate(() => window.__railhead.step(2));
      const after = await page.evaluate(() => ({ mode: window.__railhead.state.player.mode, x: window.__railhead.state.player.x }));
      if (after.mode !== before.mode || after.x !== before.x) P('a tap on the line walked the station\'s player');
      await page.tap('#lnBarBack');
      await page.evaluate(() => window.__railhead.step(1));
      await frames(4);
      v = await page.evaluate(() => { const R = window.__railhead; return { on: R.lnView.on(), cls: document.body.classList.contains('line'), bar: !document.getElementById('lnBar').hidden, bld: (R.pix.PIX.order || []).length }; });
      if (v.on || v.cls || v.bar || !(v.bld > 5)) P('"Back to the station" did not bring the station back: ' + JSON.stringify(v));
      // ---- The line on its fifth day, mid-morning (the line alone played on) ----
      await page.evaluate(() => {
        const R = window.__railhead, S = R.state, T = 4 * 86400 + 5 * 3600;
        while (S.time < T) { S.time += 8; S.tick++; const ev = []; R.ln.wtTick(S, ev); R.ln.cw.cwTick(S, ev); }
        R.ln.lnSetView(S, 'line'); R.pix.warm(true);
        window.__miss = {};
        const ob = window.pixBlit; window.pixBlit = function (g, key, ...a) { const r = ob(g, key, ...a); if (!r && key) window.__miss[key] = 1; return r; };
      });
      await frames(5);
      const info = () => page.evaluate(() => {
        const R = window.__railhead, X = R.pix.PIX, st = R.lnView.stats, F = PIX_ATLAS.frames, L = R.ln, S = R.state;
        const cs = [[0, 0], [X.nw, 0], [0, X.nh], [X.nw, X.nh], [X.nw / 2, X.nh / 2]].map(([a, b]) => R.pix.pixUnproject(X.vx + a, X.vy + b, 0));
        return { scale: X.scale, missing: st.missing, stale: st.stale, chunks: st.chunks, items: st.items, noTile: cs.filter(c => !F[L.lnTile(S.seed, Math.floor(c.x), Math.floor(c.z))]).length, miss: Object.keys(window.__miss), focus: R.lnView.focus(), ms: R.pix.stats.msAvg };
      });
      const look = async (m, z) => { await page.evaluate(([m, z]) => window.__railhead.lnView.lookAt(m, z || 0), [m, z]); await frames(4); };
      const sane = (name, i) => { if (i.missing || i.stale) P(`${name}: ${i.missing} chunks missing, ${i.stale} stale`); if (i.noTile) P(`${name}: ${i.noTile} of the view's corners have no ground tile`); if (i.miss.length) P(`${name}: missing in the atlas: ${i.miss.slice(0, 6).join(', ')}`); };
      for (const [name, m] of PLACES) {
        await look(m);
        const i = await info();
        sane(name, i);
        if (Math.abs(i.focus.x - m * 1.4285714) > 0.5 || i.focus.place !== 'line') P(`${name}: the view looks at ${JSON.stringify(i.focus)}`);
        await page.screenshot({ path: screenshotPath(`d32-line-${name}-${orient}`) });
      }
      // The railhead at three zooms.
      const head = await page.evaluate(() => { const S = window.__railhead.state; return { x: S.ln.tr.x, ph: S.ln.tr.ph, f: S.ln.f.slice() }; });
      if (head.ph !== 'stand') P(`at 10:00 the work train is ${head.ph}`);
      const z0 = await page.evaluate(() => window.__railhead.camera.zoom);
      for (const [name, zoom] of [['far', z0 / 4], ['default', z0], ['near', z0 * 1.7]]) {
        await page.evaluate(z => { window.__railhead.camera.zoom = z; }, zoom);
        await look(head.x - 4);
        await frames(3);
        const i = await info();
        sane(`railhead ${name}`, i);
        if (name === 'far' && i.scale !== 1) P(`the far zoom is scale ${i.scale}, not 1`);
        if (name === 'default' && !(i.items >= 5)) P(`only ${i.items} things stand at the railhead`);
        const wt = await page.evaluate(() => window.__railhead.pix.PIX.drawn.filter(d => /^wt/.test(d.id || '')).length);
        if (!wt) P(`railhead ${name}: the work train is not drawn`);
        await page.screenshot({ path: screenshotPath(`d32-line-railhead-${name}-${orient}`) });
      }
      // ---- Chunks redrawn as a front passes (scale 1: the whole work site in view) ----
      await page.evaluate(() => { window.__railhead.camera.zoom = window.__railhead.camera.zoom; });
      await page.evaluate(z => { window.__railhead.camera.zoom = z / 4; window.__railhead.pix.warm(false); }, z0);
      await look(head.f[2]);
      await frames(20);
      const c0 = await page.evaluate(() => ({ ...window.__railhead.lnView.stats }));
      let worst = 0;
      for (let k = 0; k < 6; k++) {
        await page.evaluate(() => { const R = window.__railhead, S = R.state; for (let i = 0; i < 40; i++) { S.time += 8; S.tick++; const ev = []; R.ln.wtTick(S, ev); R.ln.cw.cwTick(S, ev); } });
        const b = await page.evaluate(() => window.__railhead.lnView.stats.rebuilt);
        await frames(1);
        const a = await page.evaluate(() => window.__railhead.lnView.stats);
        worst = Math.max(worst, a.rebuilt - b);
        await frames(12);
      }
      const c1 = await page.evaluate(() => ({ ...window.__railhead.lnView.stats, f: window.__railhead.state.ln.f.slice() }));
      if (!(c1.rebuilt > c0.rebuilt)) P(`no chunk was redrawn as the fronts moved ${(c1.f[2] - head.f[2]).toFixed(1)} m`);
      if (worst > 1) P(`${worst} chunks were redrawn in one frame`);
      if (c1.stale || c1.missing) P(`${c1.stale} chunks stale and ${c1.missing} missing after the fronts moved`);
      console.log(`  ${orient}: chunks redrawn as the fronts moved ${(c1.f[2] - head.f[2]).toFixed(1)} m: ${c1.rebuilt - c0.rebuilt} (at most ${worst} a frame; a chunk takes ${c1.ms.toFixed(1)} ms, the worst ${c1.worst.toFixed(1)})`);
      // ---- Frame time in the woods, scale 1, the train and 30 men ----
      await page.evaluate(() => {
        const R = window.__railhead, S = R.state, M = R.ln.LINE.M;
        S.ln.f = [760, 754, 748, 744, 734.9, 725.8]; S.ln.tr = { ph: 'stand', t: S.time, x: 717, x1: 717, ta: 24000 };
        window.cwDrawList = (S, place) => place !== 'line' ? [] : Array.from({ length: 30 }, (_, i) => { const st = i % 6, sp = R.ln.lnSpot(S, st, Math.floor(i / 6)); return { id: i, who: ['worker', 'porter', 'cowhand'][i % 3], x: sp.x, y: 0, z: sp.z, f: sp.f, act: i % 2 ? 'idle' : 'walk' }; });
        R.pix.warm(true);
      });
      await look(735);
      await frames(10);
      await page.evaluate(() => { window.__railhead.pix.warm(false); window.__railhead.pix.PIX.msHist.length = 0; });
      await frames(90);
      const perf = await info();
      const men = await page.evaluate(() => window.__railhead.pix.PIX.drawn.filter(d => /^cw/.test(d.id || '')).length);
      if (perf.scale !== 1) P(`the frame time was measured at scale ${perf.scale}`);
      if (men < 20) P(`only ${men} of the 30 stand-in men were drawn`);
      if (!(perf.items >= 40)) P(`only ${perf.items} things in the woods' frame`);
      if (perf.ms > BUDGET_MS * SLACK) P(`the line's frame takes ${perf.ms.toFixed(1)} ms on average in the woods (budget ${BUDGET_MS}, limit ${BUDGET_MS * SLACK} on the test machine)`);
      console.log(`  ${orient}: the woods at scale 1 with the train and 30 men: ${perf.items} things sorted, frame ${perf.ms.toFixed(2)} ms on average (budget ${BUDGET_MS}), ${perf.chunks} chunks kept`);
      sane('the woods at scale 1', perf);
      await page.screenshot({ path: screenshotPath(`d32-line-site-${orient}`) });
      // ---- A drag looks along the line ----
      await page.evaluate(z => { window.__railhead.camera.zoom = z; }, z0);
      await look(1300);
      const cdp = await page.context().newCDPSession(page);
      const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      const cx = Math.round(vp.width / 2), cy = Math.round(vp.height / 2);
      await touch('touchStart', cx, cy);
      for (let k = 1; k <= 8; k++) { await touch('touchMove', cx - k * 12, cy - k * 6); await frames(1); }
      await touch('touchEnd', 0, 0);
      await frames(3);
      const dragged = await page.evaluate(() => window.__railhead.lnView.focus());
      if (!(dragged.x > 1300 * 1.4285714 + 3)) P(`a drag to the left did not look further along the line (${(dragged.x / 1.4285714).toFixed(1)} m)`);
      await page.evaluate(() => window.__railhead.lnView.lookAt(-500, 300));
      await frames(2);
      await touch('touchStart', cx, cy);
      for (let k = 1; k <= 6; k++) { await touch('touchMove', cx + k * 20, cy + k * 30); await frames(1); }
      await touch('touchEnd', 0, 0);
      await frames(2);
      const edge = await page.evaluate(() => window.__railhead.lnView.focus());
      if (edge.x < -20 - 1e-6 || Math.abs(edge.z) > 62 + 1e-6) P(`the look point left the corridor: ${JSON.stringify(edge)}`);
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
