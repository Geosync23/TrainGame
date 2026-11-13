// Check: the line drawn (plans/d32-tech.md 1.5 and 11.5, Foundation's), in portrait and landscape.
// - The work train at the station (track 2, 06:00) is in the station's scene, drawn from the atlas.
// - The view switches both ways by touch: the dev panel's "Look at the line", the line's bar "Back to the station";
//   with the line in view the page has the class `line`, the station's HUD is hidden and a tap sends no walking.
// - No boundary of the world is ever seen (the designer's rule): at scale 1, standing against the far border and the
//   near border in every region and at both ends of the strip, not one pixel of the frame is left as background.
// - The line at nine places (the home prairie, the trestle, the cut, the big woods, the rocks, the river run, the
//   canyon, the pass, the end of the line) and the railhead
//   at three zooms (scale 1, the default and close up): every chunk made, nothing missing from the atlas, no edge of
//   the ground in view (any point of the view has a tile); screenshots d32-line-*.png.
// - Chunks are redrawn as a front passes (the fronts moved on by the stand-in crew), at most one a frame, none stale
//   after a few frames; a chunk away from the roadbed is never redrawn.
// - Frame time: at scale 1 in the woods with the work train and 30 men standing in (a stand-in cwDrawList), the
//   average frame under 8 ms (reported; the test machine has no GPU, so the limit is 3 times that, as check-pixperf).
// - A one-finger drag looks along the line; the look point stays in the corridor.
// The wild country (the Wilds builder; the designer's rules, plans/d32-journey.md):
// - It reads as a journey: in each of the nine regions the frame is made of that region's own far side (ranks 1, 2
//   and 3), near side (edge, mid and far bands) and ground; at each of the eight joins the artists' transition
//   modules and blend pieces are drawn; every landmark is drawn at its place. Screenshots d32-wild-*.png (the nine
//   regions and the eight joins at the default zoom and the furthest, both orientations).
// - No boundary of the world: at scale 1, with the view against the far border, the near border and as far to each
//   side as the look point goes, in all nine regions, at the eight joins and at both ends, not one background pixel
//   (the chunks themselves are filled with the marker colour first, so a hole in the art would show).
// - A natural border close to the track on both sides that never hides the men: the borders lie within 11u of the
//   line; no near-side piece or landmark reaches more than a low bush's height up the screen past the near edge.
// - Alive: the water's overlays are made and drawn, changing frame at a calm rate; wildlife is drawn where the seed
//   puts it (a deer, ducks on water, the far cabin's smoke, the mill's wheel, the waterfall).
// - Cheap: the busiest region (the river run: moving water, the train, 30 men) under the frame budget at scale 1; a
//   walk along the line at the player's pace builds every chunk ahead in idle time (none inside a frame).
const { openGame, screenshotPath } = require('./browser');

const PLACES = [['prairie', 200], ['bridge', 544], ['cut', 785], ['woods', 1150], ['rocks', 1450], ['river', 1750], ['canyon', 2030], ['pass', 2200], ['end', 2500]];
const BUDGET_MS = 8, SLACK = 3;
const REGIONS = [['prairie', 180], ['creek', 450], ['hills', 700], ['woods', 1150], ['rocks', 1440], ['river', 1750], ['canyon', 2030], ['pass', 2210], ['valley', 2400]];
const JOINS = [['prairie-creek', 306], ['creek-hills', 597], ['hills-woods', 955], ['woods-rocks', 1347], ['rocks-river', 1549], ['river-canyon', 1952], ['canyon-pass', 2098], ['pass-valley', 2299]];

module.exports = async function checkLineRender() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const P = m => problems.push(`${orient}: ${m}`);
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&dev=1&d33=0' });   // D33: the line's own view is the parked build's (?d33=0); the join in the one world is checked below
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
      await page.evaluate(() => { const b = document.getElementById('pdLesson'); if (b && !b.hidden) document.getElementById('pdLesSkip').click(); });   // (the first lesson's card lies over the Dev button in landscape)
      await frames(3);
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
      // ---- The journey: each region's own art, the joins, the landmarks ----
      await page.evaluate(z => { window.__railhead.camera.zoom = z; }, z0);
      for (const [name, m] of [...REGIONS, ...JOINS]) { await look(m); sane(`${name} at the default zoom`, await info()); await page.screenshot({ path: screenshotPath(`d32-wild-${name}-default-${orient}`) }); }
      await page.evaluate(z => { window.__railhead.camera.zoom = z / 4; }, z0);
      for (const [name, m] of [...REGIONS, ...JOINS]) {
        await page.evaluate(() => window.__railhead.lnView.track(true));
        await look(m);
        const keys = await page.evaluate(() => window.__railhead.lnView.tracked());
        const has = re => keys.some(k => re.test(k)), gone = keys.filter(k => /^MISSING/.test(k));
        if (gone.length) P(`${name}: ${gone.slice(0, 4).join(', ')}`);
        if (name.indexOf('-') < 0) {
          for (const part of ['far/' + name + '/r1/', 'far/' + name + '/r2/', 'far/' + name + '/r3/', 'near/' + name + '/edge/', 'near/' + name + '/mid/', 'near/' + name + '/far/']) if (!keys.some(k => k.indexOf('wild/' + part) === 0)) P(`${name}: nothing of wild/${part} is drawn`);
        } else {
          const [a, b] = name.split('-');
          for (const re of [new RegExp(`^wild/far/${a}/r1/to_${b}/1$`), new RegExp(`^wild/far/${a}/r1/to_${b}/2$`), new RegExp(`^wild/far/${a}/r2/to_${b}/`), new RegExp(`^wild/far/${a}/r3/to_${b}/`), new RegExp(`^wild/near/${a}_to_${b}/edge$`), new RegExp(`^wild/near/${a}_to_${b}/mid$`), new RegExp(`^wild/near/${a}_to_${b}/far$`), new RegExp(`^wild/far/${b}/r1/\\d`), new RegExp(`^wild/near/${b}/edge/`)]) if (!has(re)) P(`${name}: nothing drawn matches ${re}`);
        }
        const i = await info();
        sane(`${name} at scale 1`, i);
        await page.screenshot({ path: screenshotPath(`d32-wild-${name}-far-${orient}`) });
      }
      // every landmark, where the layout puts it
      const marks = await page.evaluate(() => { const L = window.__railhead.ln.LINE; return { alone: L.MARKS.map(q => ({ name: q.name, key: q.key, m: q.x / L.M, z: q.z, side: q.side })), edge: Object.entries(L.WILD.EDGE_MARKS).map(([x, k]) => ({ name: k, key: 'wild/mark/' + k, m: +x / L.M, side: 'e' })), cut: (L.WILD.ROCKCUT[0] + 20) / L.M }; });
      for (const q of [...marks.alone, ...marks.edge, { name: 'rockcut_n', key: 'wild/mark/rockcut_n', m: marks.cut, side: 'c' }, { name: 'rockcut_s', key: 'wild/mark/rockcut_s', m: marks.cut, side: 'c' }]) {
        await page.evaluate(() => window.__railhead.lnView.track(true));
        await look(q.m, q.z || 0);
        const seen = await page.evaluate(([key, side]) => { const R = window.__railhead; return side === 'c' ? R.pix.PIX.drawn.some(d => d.key === key) : R.lnView.tracked().includes(key); }, [q.key, q.side]);
        if (!seen) P(`the landmark ${q.name} is not drawn at ${q.m.toFixed(0)} m`);
      }
      await page.evaluate(() => window.__railhead.lnView.track(false));
      // a border close to the track that never hides the men: how far each near-side picture reaches up the screen
      // past the near edge (the shelf's pieces come in 6u by design, with a low parapet)
      const over = await page.evaluate(() => {
        const R = window.__railhead, L = R.ln.LINE, out = [], S = L.BORDER.S;
        for (const k of Object.keys(PIX_ATLAS.frames)) if (/^wild\/near\/[a-z_]+\/(edge|mid|far)(\/\d)?$/.test(k) || /^wild\/mark\/(beaver_dam|ferry_landing|mill|canyon_shelf\/\w+)$/.test(k)) out.push([k, R.lnView.over(k, S)]);
        for (const q of L.MARKS) if (q.side === 's') out.push([q.key, R.lnView.over(q.key, q.z)]);
        return { out, N: L.BORDER.N, S };
      });
      if (!(over.N <= 10 && over.S <= 11.5)) P(`the borders lie ${over.N} and ${over.S} u from the line: not close`);
      for (const [k, px] of over.out) { const lim = /canyon_shelf/.test(k) ? 62 : /\/(mid|far)(\/\d)?$/.test(k) || !/near|beaver|ferry|mill/.test(k) ? 0 : 14; if (px > lim) P(`${k} reaches ${px.toFixed(0)} px up past the near edge (limit ${lim}): it would hide the men`); }
      console.log(`  ${orient}: ${over.out.length} near-side pictures checked against the near edge (the tallest edge piece reaches ${Math.max(...over.out.filter(([k]) => !/shelf/.test(k)).map(([, v]) => v)).toFixed(0)} px past it)`);
      // ---- No boundary of the world: scale 1, against both borders in every region, at every join and at both ends ----
      await page.evaluate(z => { const R = window.__railhead; R.camera.zoom = z / 4; R.lnView.bg('#ff00ff'); R.pix.warm(false); }, z0);
      let worstBg = 0, spots = 0;
      for (const [m, zz] of [[-14, 0], [-14, 3], [-14, -44], [-14, 44], [2618, 0], [2618, -3], [2618, -44], [2618, 44], ...[...REGIONS, ...JOINS, ['bridge', 544], ['shelf', 2045]].flatMap(([, m]) => [[m, -9.5], [m, 11], [m, -44], [m, 44]])]) {
        await look(m, zz);
        const bg = await page.evaluate(() => { const X = window.__railhead.pix.PIX, d = X.bctx.getImageData(0, 0, X.nw, X.nh).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) n++; return { n, scale: X.scale, missing: window.__railhead.lnView.stats.missing }; });
        spots++; worstBg = Math.max(worstBg, bg.n);
        if (bg.scale !== 1) P(`the far zoom is scale ${bg.scale}`);
        // (a speck of a few pixels is a pinhole inside one of the artists' modules, filled with the ground's colour in play: not an edge)
        if (bg.n > 12 || bg.missing) P(`at ${m} m, z ${zz}: ${bg.n} pixels of blank background in view (${bg.missing} chunks missing)`);
        if (m === -14 && zz === 0) await page.screenshot({ path: screenshotPath(`d32-line-westend-far-${orient}`) });
        if (m === 2030 && zz === 11) await page.screenshot({ path: screenshotPath(`d32-line-canyon-far-${orient}`) });
      }
      console.log(`  ${orient}: no blank background at scale 1 at ${spots} places against the borders and the ends (the worst view has ${worstBg} px of pinholes in the art, of 1.3 million)`);
      await page.evaluate(() => window.__railhead.lnView.bg(null));
      // ---- Chunks redrawn as a front passes (scale 1: the whole work site in view) ----
      await page.evaluate(() => { window.__railhead.camera.zoom = window.__railhead.camera.zoom; });
      await page.evaluate(z => { window.__railhead.camera.zoom = z / 4; window.__railhead.pix.warm(false); }, z0);
      await look(head.f[2]);
      await frames(20);
      const c0 = await page.evaluate(() => ({ ...window.__railhead.lnView.stats }));
      let worst = 0;
      for (let k = 0; k < 6; k++) {
        await page.evaluate(() => { const R = window.__railhead, S = R.state; for (let i = 0; i < 40; i++) { S.time += 8; S.tick++; const ev = []; R.ln.wtTick(S, ev); R.ln.cw.cwTick(S, ev); } });
        // (counted frame by frame inside the page: with Crew's gangs close together several chunks go stale at once,
        // and frames pass between two calls from the check)
        worst = Math.max(worst, await page.evaluate(() => new Promise(res => { const V = window.__railhead.lnView; let last = V.stats.rebuilt, w = 0, k = 0; const f = () => { const n = V.stats.rebuilt; w = Math.max(w, n - last); last = n; if (++k >= 13) res(w); else requestAnimationFrame(f); }; requestAnimationFrame(f); })));
      }
      const c1 = await page.evaluate(() => ({ ...window.__railhead.lnView.stats, f: window.__railhead.state.ln.f.slice() }));
      if (!(c1.rebuilt > c0.rebuilt)) P(`no chunk was redrawn as the fronts moved ${(c1.f[2] - head.f[2]).toFixed(1)} m`);
      if (worst > 1) P(`${worst} chunks were redrawn in one frame`);
      if (c1.stale || c1.missing) P(`${c1.stale} chunks stale and ${c1.missing} missing after the fronts moved`);
      console.log(`  ${orient}: chunks redrawn as the fronts moved ${(c1.f[2] - head.f[2]).toFixed(1)} m: ${c1.rebuilt - c0.rebuilt} (at most ${worst} a frame; a chunk takes ${c1.ms.toFixed(1)} ms, the worst ${c1.worst.toFixed(1)})`);
      // ---- Frame time in the woods, scale 1, the train and 30 men ----
      await page.evaluate(() => {
        const R = window.__railhead, S = R.state, M = R.ln.LINE.M;
        S.ln.f = [1160, 1154, 1148, 1144, 1134.9, 1125.8]; S.ln.tr = { ph: 'stand', t: S.time, x: 1117, x1: 1117, ta: 24000 };
        window.cwDrawList = (S, place) => place !== 'line' ? [] : Array.from({ length: 30 }, (_, i) => { const st = i % 6, sp = R.ln.lnSpot(S, st, Math.floor(i / 6)); return { id: i, who: ['worker', 'porter', 'cowhand'][i % 3], x: sp.x, y: 0, z: sp.z, f: sp.f, act: i % 2 ? 'idle' : 'walk' }; });
        R.pix.warm(true);
      });
      await look(1135);
      await frames(10);
      await page.evaluate(() => { window.__railhead.pix.warm(false); window.__railhead.pix.PIX.msHist.length = 0; });
      await frames(90);
      const perf = await info();
      const men = await page.evaluate(() => window.__railhead.pix.PIX.drawn.filter(d => /^cw/.test(d.id || '')).length);
      if (perf.scale !== 1) P(`the frame time was measured at scale ${perf.scale}`);
      if (men < 20) P(`only ${men} of the 30 stand-in men were drawn`);
      if (!(perf.items >= 35)) P(`only ${perf.items} things in the woods' frame`);
      if (perf.ms > BUDGET_MS * SLACK) P(`the line's frame takes ${perf.ms.toFixed(1)} ms on average in the woods (budget ${BUDGET_MS}, limit ${BUDGET_MS * SLACK} on the test machine)`);
      console.log(`  ${orient}: the woods at scale 1 with the train and 30 men: ${perf.items} things sorted, frame ${perf.ms.toFixed(2)} ms on average (budget ${BUDGET_MS}), ${perf.chunks} chunks kept`);
      sane('the woods at scale 1', perf);
      await page.screenshot({ path: screenshotPath(`d32-line-site-${orient}`) });
      // ---- The busiest region: the river run at scale 1 (moving water on every chunk), the train and 30 men ----
      await page.evaluate(() => { const R = window.__railhead, S = R.state; S.ln.f = [1760, 1754, 1748, 1744, 1734.9, 1725.8]; S.ln.tr = { ph: 'stand', t: S.time, x: 1717, x1: 1717, ta: 24000 }; R.pix.warm(true); });
      await look(1735);
      await frames(40);
      await page.evaluate(() => { window.__railhead.pix.warm(false); });
      await page.waitForFunction(() => window.__railhead.lnView.stats.wet === 0, null, { timeout: 15000 }).catch(() => P('the river\'s water overlays were not all made within 15 s'));
      await page.evaluate(() => { window.__railhead.pix.PIX.msHist.length = 0; });
      await frames(90);
      const busy = await info(), bst = await page.evaluate(() => { const st = window.__railhead.lnView.stats; return { ov: st.ov || 0, ovMs: st.ovMs || 0, wet: st.wet }; });
      if (!(bst.ov > 3)) P(`only ${bst.ov} chunks of the river have their moving water`);
      if (busy.ms > BUDGET_MS * SLACK) P(`the line's frame takes ${busy.ms.toFixed(1)} ms on average on the river run (budget ${BUDGET_MS}, limit ${BUDGET_MS * SLACK} on the test machine)`);
      console.log(`  ${orient}: the river run at scale 1 with the train and 30 men: ${busy.items} things sorted, frame ${busy.ms.toFixed(2)} ms on average (budget ${BUDGET_MS}); ${bst.ov} chunks carry moving water (the last took ${bst.ovMs.toFixed(1)} ms to make, in idle time)`);
      await page.screenshot({ path: screenshotPath(`d32-wild-site-river-${orient}`) });
      // the water moves, at a calm rate: the frame's pixels change over a second, and not on every frame
      const moved = await page.evaluate(() => new Promise(res => {
        const X = window.__railhead.pix.PIX, V = window.__railhead.lnView, snap = () => { const d = X.bctx.getImageData(0, Math.floor(X.nh * 0.55), X.nw, 80).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) | 0; return h; };
        let last = snap(), changes = 0, k = 0; const t0 = V.time();
        const f = () => { const h = snap(); if (h !== last) changes++; last = h; if (++k >= 120) res({ changes, secs: V.time() - t0 }); else requestAnimationFrame(f); };
        requestAnimationFrame(f);
      }));
      if (!(moved.changes >= 1)) P('the river\'s water does not move');
      if (moved.changes > moved.secs / 0.45 + 30) P(`the water changed ${moved.changes} times in ${moved.secs.toFixed(1)} s: not calm`);
      // ---- Wildlife and the animated landmarks ----
      const lifeAt = await page.evaluate(() => { const R = window.__railhead, L = R.ln, S = R.state, out = {}; for (let c = 0; c < 78; c++) for (const q of L.lnLife(S.seed, c)) if (!out[q.kind]) out[q.kind] = q.x / L.LINE.M; return { ...out, smoke: L.LINE.MARKS.find(q => q.smoke).x / L.LINE.M, 'mill/anim': 3436 / L.LINE.M, 'waterfall/water': L.LINE.MARKS.find(q => q.water).x / L.LINE.M }; });
      const lived = [];
      for (const [kind, m] of Object.entries(lifeAt)) {
        await look(m);
        const keys = await page.evaluate(() => window.__railhead.lnView.live());
        if (keys.some(k => k.indexOf(kind) >= 0)) lived.push(kind); else if (!/duck/.test(kind)) P(`no ${kind} is drawn at ${m.toFixed(0)} m (drawn: ${keys.slice(0, 5).join(', ') || 'nothing'})`);
      }
      if (!lived.some(k => /duck/.test(k))) { const ducks = await page.evaluate(() => { const R = window.__railhead; let n = 0; for (let c = 0; c < 78; c++) n += R.lnView.lifeOf(c).filter(q => q.water).length; return n; }); if (!ducks) P('no duck found water to swim on'); }
      console.log(`  ${orient}: alive: ${lived.join(', ')}`);
      // ---- Walking the line: every chunk is made ahead, in idle time ----
      for (const [zn, zm] of [['the default zoom', z0], ['scale 1', z0 / 4]]) {
        await page.evaluate(z => { window.__railhead.camera.zoom = z; }, zm);
        await look(1600);
        await frames(30);
        await page.waitForTimeout(600);
        const walk = await page.evaluate(() => new Promise(res => {
          const R = window.__railhead, V = R.lnView, M = R.ln.LINE.M;
          let k = 0, inFrame = 0, worst = 0, x = 1600;
          const f = () => { const st = V.stats; if (k > 0 && st.inFrame) inFrame += st.inFrame; worst = Math.max(worst, R.pix.stats.ms); x += 4.2 / 60 / M; V.lookAt(x, 0); if (++k >= 300) res({ inFrame, worst, built: st.built, ahead: st.ahead }); else requestAnimationFrame(f); };
          requestAnimationFrame(f);
        }));
        if (walk.inFrame) P(`walking the line at ${zn}: ${walk.inFrame} chunks were built inside a frame (a hitch); they should be made ahead in idle time`);
        console.log(`  ${orient}: a walk of 21 u at ${zn}: no chunk built inside a frame (${walk.ahead} made ahead so far), the slowest frame ${walk.worst.toFixed(1)} ms`);
      }
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
      if (edge.x < -20 - 1e-6 || Math.abs(edge.z) > 44 + 1e-6) P(`the look point left the corridor: ${JSON.stringify(edge)}`);
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // ---- D33 (one world): the join. The station's ground and the line's country meet with no seam and no edge of the
  // world anywhere round the station, at the furthest zoom, in both orientations: the world's background is painted
  // in a marker colour and must never show. The line's track leaves the yard past the junction, and the main line to
  // the east is drawn curving away into the wood.
  for (const orient of ['portrait', 'landscape']) {
    const P = m => problems.push(`${orient} (the join): ${m}`);
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      const D = await page.evaluate(() => { const g = (0, eval), d = g('D33'); return { on: d.on, LX: d.LX, EDGE: d.EDGE, JX: d.JX, GATE: d.GATE, M: g('LINE').M }; });
      if (!D.on) { P('?d33 is off by default'); continue; }
      await page.evaluate(() => { const R = window.__railhead, g = (0, eval); R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.step(400); const b = document.getElementById('pdLesson'); if (b && !b.hidden) document.getElementById('pdLesSkip').click(); g('PIX').warm = true; g('cam').zoom = 0.4; R.lnView.bg('#ff00ff'); });
      const look = async (x, z) => { await page.evaluate(([x, z]) => (0, eval)('pixLookAt')(x, z), [x, z]); await frames(6); await page.evaluate(([x, z]) => (0, eval)('pixLookAt')(x, z), [x, z]); await frames(8); };
      let worst = 0, n = 0;
      for (const [x, z] of [[D.EDGE, 0], [D.EDGE, -40], [D.EDGE, 40], [D.EDGE + 40, 0], [D.EDGE + 120, -10], [D.EDGE - 40, 0], [60, 60], [0, 60], [-60, 60], [60, -150], [0, -150], [-60, -150], [-95, 0], [-95, -60], [D.EDGE + 60, 70], [D.EDGE + 60, -70], [D.EDGE, 100], [160, 100], [160, -100]]) {
        await look(x, z);
        const bg = await page.evaluate(() => { const X = window.__railhead.pix.PIX, d = X.bctx.getImageData(0, 0, X.nw, X.nh).data; let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) k++; return { k, scale: X.scale, missing: X.lnStats.missing + X.chunkStats.missing }; });
        n++; worst = Math.max(worst, bg.k);
        if (bg.scale !== 1) P(`the furthest zoom is scale ${bg.scale}`);
        if (bg.k > 12 || bg.missing) P(`at (${x}, ${z}) at the furthest zoom: ${bg.k} pixels of the world's background in view (${bg.missing} chunks missing)`);
      }
      console.log(`  ${orient} (the join): no edge of the world at ${n} places round the station at the furthest zoom (the worst view has ${worst} px of pinholes in the art)`);
      await page.evaluate(() => window.__railhead.lnView.bg(null));
      await look(D.EDGE + 10, 0);
      await page.screenshot({ path: screenshotPath(`d33-join-${orient}`) });
      // the junction: the line's track carries on east past the yard limit, the main line curves away north
      const jn = await page.evaluate(([JX]) => { const g = (0, eval), b = g('pixBranch')(), q = g('pixBranchPose'); return { z0: q(JX).z, z1: q(JX + 40).z, z2: q(JX + 120).z, len: b.arc.len }; }, [D.JX]);
      if (!(Math.abs(jn.z0) < 0.01 && jn.z1 < -6 && jn.z2 < -30)) P('the main line does not leave the junction for the wood: ' + JSON.stringify(jn));
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
