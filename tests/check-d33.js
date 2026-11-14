// Check: D33, one world (the line joined to the station). A fresh default game, played by real taps from the first
// morning, at phone size (portrait; the join and the walk again in landscape):
// - a new game has the line on with the starting crew of 5, "a screen or so into construction": every stage already
//   under way just past the yard, no dev mode needed, no line screen (the page never takes the class `line`, no fade);
// - the first morning: the men are in the camp at 06:00, walk to the muster and BOARD the work train while it stands
//   (each man is drawn on the plank walk before he is aboard); it leaves at 06:40, before any passenger train has left;
// - the train runs out in one continuous motion (no jump between the station and the line) to the railhead, the men
//   get down and work there; through the day each of the six kinds of work is done, by men standing close together;
// - the player walks from the platform out along the line to the men by taps on the ground: the camera scrolls with
//   him the whole way (he stays in the middle of the screen), with no blank background at the furthest zoom on the
//   way (the world's marker colour never shows east, north or south of the station's map) and no screen switch; he is
//   "away" past the yard limit board and the station's own man again when he walks back;
// - riding: a tap on the crew car at the railhead, the ride home in the evening seen all the way, the men back to camp;
// - dev mode's crew size takes effect at once (30 men in the middle of the morning are at work the same day);
// - the line is longer the next morning; a save made out on the line reloads to the same hash; no console errors.
// Screenshots test-output/d33-*.png.
const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkD33() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const P = m => problems.push(`${orient}: ${m}`), full = orient === 'portrait';
    const { browser, page, errors } = await openGame(orient, { query: '?world=proto' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 15000 }).catch(() => P('the atlas did not load'));
      const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      const step = n => page.evaluate(n => { const R = window.__railhead; let left = n; while (left > 0) { R.step(Math.min(100, left)); left -= 100; } }, n);
      const st = () => page.evaluate(() => {
        const R = window.__railhead, S = R.state, g = (0, eval), sod = (S.time + 5 * 3600) % 86400, L = S.ln, C = S.cw, T = L ? g('lnTrain')(S) : null, D = g('D33');
        const men = C ? C.men.map(m => ({ st: m.st, pl: m.pl, a: m.a, stage: m.stage, x: m.pl === 2 ? m.x + D.LX : m.x, z: m.z })) : [];
        return { sod, hhmm: String(Math.floor(sod / 3600)).padStart(2, '0') + ':' + String(Math.floor(sod % 3600 / 60)).padStart(2, '0'), pd: S.pd.ph, on: !!(L && L.on), crew: L ? L.crew : -1, f: L ? L.f.slice() : null, ph: L ? L.tr.ph : null,
          front: T && T.at !== 'away' ? T.x + (T.at === 'line' ? D.LX : 0) : null, at: T ? T.at : null, men, lp: S.lp ? { ...S.lp } : null, away: S.player.away || null, P: [S.player.x, S.player.z], view: L ? L.view : null,
          line: document.body.classList.contains('line'), fade: !document.getElementById('lpFade').hidden, runs: S.rr.runs.map(r => r.id + ':' + r.ph), hash: R.hash(), dev: !document.getElementById('devBtn').hidden, tick: S.tick };
      });
      const lesson = () => page.evaluate(() => { const b = document.getElementById('pdLesson'); if (b && !b.hidden) document.getElementById('pdLesSkip').click(); });
      const scr = (x, z) => page.evaluate(([x, z]) => window.__railhead.pix.pixToScreen(x, 0, z), [x, z]);
      // a tap on the world at (x, z): refused when the point is off the screen or under a panel of the HUD
      const free = (px, py) => page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return !e || e === document.body || e.tagName === 'CANVAS'; }, [Math.round(px), Math.round(py)]);
      const tapAt = async (x, z) => { const p = await scr(x, z), vp = page.viewportSize(); if (p.x < 4 || p.y < 4 || p.x > vp.width - 4 || p.y > vp.height - 4 || !(await free(p.x, p.y))) return false; await page.touchscreen.tap(Math.round(p.x), Math.round(p.y)); await frames(2); return true; };
      const look = async (x, z, zoom) => { await page.evaluate(([x, z, zoom]) => { const g = (0, eval); if (zoom) g('cam').zoom = zoom; g('PIX').warm = true; g('pixLookAt')(x, z); }, [x, z, zoom || 0]); await frames(5); await page.evaluate(([x, z]) => (0, eval)('pixLookAt')(x, z), [x, z]); await frames(6); };
      const unlook = () => page.evaluate(() => { const g = (0, eval); g('cam').ox = 0; g('cam').oz = 0; g('cam').zoom = 1.5; g('PIX').warm = false; });
      const shot = async name => { await frames(3); await page.screenshot({ path: screenshotPath(`d33-${name}-${orient}`) }); };
      // the marker colour's pixels in view (the ground past the map's edges, wherever the wild country did not cover it)
      const blank = () => page.evaluate(() => { const X = window.__railhead.pix.PIX, d = X.bctx.getImageData(0, 0, X.nw, X.nh).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) n++; return n; });
      const D = await page.evaluate(() => { const g = (0, eval), D = g('D33'); return { LX: D.LX, GATE: D.GATE, EDGE: D.EDGE, JX: D.JX, M: g('LINE').M, DEP: g('LINE').T.DEP }; });
      const until = async (pred, max, by) => { for (let i = 0; i < max; i++) { const s = await st(); if (pred(s)) return s; await step(by || 8); await lesson(); } return st(); };

      // ---- A new game: the line is on, a crew of 5, a screen or so into construction, no dev mode, no line screen ----
      let s = await st();
      if (!s.on || s.crew !== 5 || s.men.length !== 5) P(`a new game's line: on ${s.on}, crew ${s.crew}, ${s.men.length} men (want on, 5, 5)`);
      if (s.dev) P('dev mode is on in a fresh game');
      if (s.hhmm !== '06:00') P(`a new game begins at ${s.hhmm}`);
      const f0 = s.f.slice();
      if (!(f0[0] > f0[1] && f0[1] > f0[2] && f0[2] > f0[3] && f0[3] > f0[4] && f0[4] > f0[5])) P(`the six stages are not all under way at the start: fronts ${f0.join(', ')}`);
      const head0 = f0[5] * D.M + D.LX, clear0 = f0[0] * D.M + D.LX;
      if (!(head0 > D.EDGE && head0 - D.EDGE < 110 && clear0 - head0 < 60)) P(`the railhead at the start is at world x ${head0.toFixed(0)} to ${clear0.toFixed(0)}: not a screen or so past the yard's edge (${D.EDGE})`);
      if (!s.men.every(m => m.pl === 1 && (m.st === 'camp' || m.st === 'toTrain') && m.x < -40)) P('at 06:00 the men are not in or by the camp: ' + JSON.stringify(s.men.map(m => [m.st, m.pl, Math.round(m.x)])));
      await page.tap('#pdStart'); await frames(3); await lesson();
      await page.evaluate(() => window.__railhead.setSpeed(0));
      if (full) { await look(-52, -30, 1.0); await shot('men-leave-camp'); await unlook(); }   // (06:00: the men are coming out of the camp for the muster)

      // ---- The men board, seen; the train leaves before any passenger train has left ----
      let seenPlank = new Set(), seenMuster = new Set(), maxJump = 0, lastFront = null, shotBoard = false, lineClass = false, fade = false;
      for (let i = 0; i < 1400; i++) {
        s = await st();
        lineClass = lineClass || s.line; fade = fade || s.fade;
        s.men.forEach((m, k) => { if (m.pl === 1 && m.st === 'toTrain' && m.a === 'board') seenPlank.add(k); if (m.pl === 1 && m.st === 'toTrain') seenMuster.add(k); });
        if (full && !shotBoard && seenPlank.size >= 2 && s.ph === 'sStand') { shotBoard = true; await look(-39, -8, 1.5); await shot('men-board'); await unlook(); }
        if (s.front !== null && lastFront !== null && s.sod >= D.DEP) maxJump = Math.max(maxJump, Math.abs(s.front - lastFront));
        lastFront = s.front;
        if (s.sod === D.DEP + 8 || (s.sod > D.DEP && s.sod <= D.DEP + 16 && i % 2 === 0)) {
          if (s.runs.some(r => /^p\d:(out|gone)$/.test(r))) P('a passenger train had left before the work train: ' + s.runs.join(' '));
          if (s.men.some(m => m.st !== 'ride')) P('the work train left without every man aboard: ' + JSON.stringify(s.men.map(m => m.st)));
        }
        if (full && s.ph === 'out' && s.front > 120 && !shotBoard.out) { shotBoard = { out: 1 }; await look(s.front - 20, 0, 0.5); await shot('train-on-its-way'); await unlook(); }
        if (s.ph === 'stand') break;
        await step(s.men.some(m => m.pl === 1 && m.st === 'toTrain') ? 2 : s.sod < D.DEP - 60 ? 8 : 1); await lesson();
      }
      if (s.ph !== 'stand') P(`the work train did not reach the railhead: ${s.ph} at ${s.hhmm}`);
      if (seenPlank.size !== 5 || seenMuster.size !== 5) P(`${seenMuster.size} of 5 men were seen walking to the train and ${seenPlank.size} boarding over the plank walk`);
      if (!(maxJump < 25)) P(`the work train jumped ${maxJump.toFixed(1)} u in a tick on its way out (one world: it should run all the way in view)`);
      if (!(s.sod < 7 * 3600)) P(`the work train reached the railhead at ${s.hhmm}`);
      if (lineClass || fade) P(`the page switched to a line screen on the way (class line ${lineClass}, fade ${fade})`);
      console.log(`  ${orient}: the men boarded (5 seen on the plank walk), the work train left at 06:40 and stood at the railhead at ${s.hhmm} (its front at world x ${s.front.toFixed(0)}; the longest step ${maxJump.toFixed(1)} u a tick)`);

      // ---- The player walks out from the platform to the men by taps: the camera scrolls, no blank, no switch ----
      // the furthest zoom, the world's blank marked (and every chunk made at once: a station chunk still being made
      // shows the page's background, which is the marker colour here, and that is the station's own old behaviour)
      await page.evaluate(() => { const R = window.__railhead, g = (0, eval); g('cam').zoom = 0.5; g('PIX').warm = true; R.lnView.bg('#ff00ff'); });
      await frames(4);
      let worstBlank = 0, crossed = null, maxOff = 0, taps = 0;
      const mid = async () => { const q = await page.evaluate(() => { const R = window.__railhead, S = R.state, g = (0, eval), D = g('D33'), Q = S.lp, w = Q && Q.ph === 'line' ? [Q.x + D.LX, Q.z] : [S.player.x, S.player.z], p = R.pix.pixToScreen(w[0], 0, w[1]); return { p, w, vw: innerWidth, vh: innerHeight }; }); return q; };
      for (let i = 0; i < 160; i++) {
        s = await st();
        const me = s.lp && s.lp.ph === 'line' ? [s.lp.x + D.LX, s.lp.z] : s.P, goal = s.f[5] * D.M + D.LX - 6;
        if (s.away && crossed === null) crossed = me[0];
        if (me[0] > goal - 1.5 && s.lp) break;
        const tx = Math.min(goal, me[0] + 22), tz = me[0] < 40 ? -12 : me[0] < D.GATE - 12 ? -9 + (me[0] - 40) / (D.GATE - 52) * 12.4 : me[0] < goal - 34 ? 6.6 : 3.4;   // (south of the standing work train, not through it)
        let got = await tapAt(tx, tz);
        for (const d of got ? [] : [16, 10, 6]) { if (await tapAt(Math.min(tx, me[0] + d), tz)) { got = true; break; } }
        if (got) taps++;
        await step(me[0] > D.GATE - 16 && me[0] < D.GATE + 4 ? 3 : 40); await lesson(); await frames(3);
        const b = await blank();
        if (b > 12 && worstBlank <= 12) await shot('blank');
        worstBlank = Math.max(worstBlank, b);
        const q = await mid(); if (i) maxOff = Math.max(maxOff, Math.hypot(q.p.x - q.vw / 2, q.p.y - q.vh / 2));
        if (full && i === 0) await shot('walk-0-platform');
        if (full && me[0] > D.GATE - 6 && me[0] < D.GATE + 16) await shot('walk-1-yard-limit');
        lineClass = lineClass || s.line; fade = fade || s.fade;
      }
      s = await st();
      if (!s.lp || s.lp.ph !== 'line') P(`the player did not reach the men on foot (${taps} taps): at ${JSON.stringify(s.P)}, lp ${JSON.stringify(s.lp)}`);
      else if (!(s.lp.x + D.LX > s.f[5] * D.M + D.LX - 12)) P(`the player stopped at world x ${(s.lp.x + D.LX).toFixed(0)}, short of the men`);
      if (crossed === null || Math.abs(crossed - D.GATE) > 3.5) P(`he became "away" at world x ${crossed}, not at the yard limit board (${D.GATE})`);
      if (s.away !== 'line') P('past the yard limit he is not away');
      if (worstBlank > 12) P(`${worstBlank} pixels of blank background were seen on the walk from the platform to the men at the furthest zoom`);
      if (maxOff > 40) P(`the camera did not stay on him on the walk (he was ${maxOff.toFixed(0)} px from the middle)`);
      if (lineClass || fade || s.view !== 'station') P('the walk out switched screens');
      console.log(`  ${orient}: walked from the platform to the men in ${taps} taps (away from world x ${crossed === null ? '?' : crossed.toFixed(1)}); the worst view had ${worstBlank} blank px; he stayed within ${maxOff.toFixed(0)} px of the middle`);
      // the join itself from four sides at the furthest zoom, and the default
      for (const [x, z] of [[D.EDGE, 0], [D.EDGE, -60], [D.EDGE, 40], [D.EDGE + 60, -30], [D.EDGE - 20, 60], [D.EDGE + 30, 70], [60, -150], [D.EDGE, -130]]) {
        await look(x, z, 0.5);
        const b = await blank();
        if (b > 12) P(`at the join (${x}, ${z}) at the furthest zoom: ${b} px of blank background`);
        if (x === D.EDGE && z === 0) await shot('join-far');
        if (x === D.EDGE && z === 40) await shot('join-south-far');
      }
      await page.evaluate(() => { window.__railhead.lnView.bg(null); (0, eval)('PIX').warm = false; });
      await unlook(); await frames(3);

      // ---- The men at their work, a little team: the six kinds through the day, close together ----
      const seen = new Set(), shots = {};
      let maxSpan = 0, idle = 0, samples = 0, far = 0;
      const NAMES = ['clearing', 'digging', 'rock', 'ties', 'rails', 'spiking'];
      s = await until(q => q.sod >= 7.6 * 3600, 300, 16);
      for (let i = 0; i < 400; i++) {
        s = await st();
        if (s.sod >= 17.9 * 3600 || s.ph !== 'stand') break;
        const hours = (s.sod >= 7 * 3600 && s.sod < 12 * 3600) || (s.sod >= 13 * 3600 && s.sod < 18 * 3600), wk = s.men.filter(m => m.pl === 2 && m.st === 'work');
        if (hours) {
          samples++;
          wk.forEach(m => seen.add(m.stage));
          if (wk.length > 1) maxSpan = Math.max(maxSpan, Math.max(...wk.map(m => m.x)) - Math.min(...wk.map(m => m.x)));
          if (s.men.some(m => m.pl === 2 && m.st === 'idle')) idle++;
          if (s.men.some(m => m.pl === 2 && m.x > D.EDGE + 260)) far++;
          if (full) for (const m of wk) if (!shots[m.stage]) { shots[m.stage] = 1; await look(m.x, m.z, 1.5); await shot('work-' + NAMES[m.stage]); await unlook(); }
          if (full && !shots.team && wk.length >= 4 && new Set(wk.map(m => m.stage)).size >= 4) { shots.team = 1; const xs = wk.map(m => m.x); await look((Math.min(...xs) + Math.max(...xs)) / 2, 0, 1.0); await shot('team'); await unlook(); }
        }
        await step(full ? 24 : 60); await lesson();
      }
      if (seen.size !== 6) P(`with 5 men only these kinds of work were done on day 1: ${[...seen].sort().map(k => NAMES[k]).join(', ')}`);
      // (D34: with the honest minimums a crew of five lays its rails four men at a time, a stretch in one go, so the rail
      // gang can stand a few units further back: about 60, at most 68 there)
      const spanMax = (await page.evaluate(() => (0, eval)('D34').on)) ? 68 : 62;
      if (maxSpan > spanMax) P(`the men at work were spread over ${maxSpan.toFixed(0)} u (a little team: at most about 60)`);
      if (idle > samples * 0.1) P(`a man stood idle in ${idle} of ${samples} looks`);
      if (far) P('the men worked far from the yard on day 1');
      console.log(`  ${orient}: day 1 with 5 men: all of ${[...seen].sort().map(k => NAMES[k]).join(', ')} seen; the men at work never more than ${maxSpan.toFixed(0)} u apart; a man idle in ${idle} of ${samples} looks`);

      // ---- A save out on the line reloads to the same hash (portrait) ----
      if (full) {
        const h = await page.evaluate(() => { const R = window.__railhead, a = R.hash(), txt = R.exportSave(); R.importSave(txt); return [a, R.hash(), !!R.state.lp]; });
        if (h[0] !== h[1] || !h[2]) P(`a save out on the line did not reload exactly: ${h.join(' ')}`);
      }

      // ---- Home with the evening train: a tap on the crew car, the ride seen, the men back to the camp ----
      s = await until(q => q.sod >= 16.9 * 3600, 400, 16);
      const carAt = () => page.evaluate(() => { const R = window.__railhead, S = R.state, g = (0, eval), T = g('lnTrain')(S), c = T.cars[T.cars.length - 1]; return c ? { x: (c.x0 + c.x1) / 2 + g('D33').LX, steps: T.steps.x + g('D33').LX, ph: T.ph } : { x: null, ph: T.ph }; });
      let car = await carAt();
      // walk a little west of the crew car (so it is drawn clear of the line's bar), then tap it
      for (let i = 0; i < 60; i++) {
        s = await st();
        if (!s.lp || s.lp.ph !== 'line' || s.sod > 18.1 * 3600) break;
        car = await carAt(); if (car.x === null) break;
        const me = s.lp.x + D.LX, spot = car.x - 13;
        if (Math.abs(me - spot) < 3) break;
        await lesson();
        await page.evaluate(() => { const c = document.getElementById('lpCardClose'); if (c && !document.getElementById('lpCard').hidden) c.click(); });
        // the first point towards the spot that is on the screen and not under a panel (walking west is up the
        // screen, where the line's bar sits in landscape, so the point is taken further south as needed)
        let moved = false;
        for (let zz = 5.5; zz <= 13 && !moved; zz += 1.5) for (let d = 16; d >= 4 && !moved; d -= 3) moved = await tapAt(me + Math.max(-d, Math.min(d, spot - me)), zz);
        await step(moved ? 30 : 10); await frames(2);
      }
      await frames(3);
      {
        await lesson();
        await page.evaluate(() => { const c = document.getElementById('lpCardClose'); if (c && !document.getElementById('lpCard').hidden) c.click(); });
        await frames(2);
        car = await carAt();
        if (car.x === null) P(`the work train was not at the railhead to board (${car.ph})`);
        const vp = page.viewportSize();
        let tapped = false;
        for (const [dx, y] of car.x === null ? [] : [-5, -3, -1, 1, 3, 5].flatMap(dx => [2.4, 1.6, 0.8, 3.4].map(y => [dx, y]))) {
          const p = await page.evaluate(([x, y]) => window.__railhead.pix.pixToScreen(x, y, 0), [car.x + dx, y]);
          if (p.x < 10 || p.y < 10 || p.x > vp.width - 10 || p.y > vp.height - 10 || !(await free(p.x, p.y))) continue;
          const hit = await page.evaluate(([px, py]) => { const h = window.__railhead.pix.pixPick(px, py); return h && h.k + ':' + (h.car || ''); }, [Math.round(p.x), Math.round(p.y)]);
          if (hit !== 'wt:crewcar') continue;
          await page.touchscreen.tap(Math.round(p.x), Math.round(p.y)); await frames(2); await step(1);
          tapped = true;
          if (!(await page.evaluate(() => { const Q = window.__railhead.state.lp; return !!(Q && (Q.home || Q.ph === 'aboardL')); }))) { await page.touchscreen.tap(Math.round(p.x), Math.round(p.y)); await frames(2); await step(1); }
          break;
        }
        if (!tapped) {   // the bar's own button does the same (in landscape the bar can lie over the car on the screen)
          const b = await page.$('#lpBtnHome');
          if (b && !(await b.isHidden())) { await b.tap(); tapped = 'bar'; }
        }
        if (!tapped) P('neither the crew car nor the bar\'s Ride home was there to board the work train');
        else if (tapped === 'bar') console.log(`  ${orient}: the crew car lay under the line's bar on the screen: boarded with the bar's Ride home button instead`);
        await frames(3); await step(2);
      }
      s = await until(q => !q.lp || q.lp.ph === 'aboardL' || q.sod > 18.45 * 3600, 400, 4);
      if (!s.lp || s.lp.ph !== 'aboardL') P(`boarding the work train at the railhead did not put him in the crew car: ${JSON.stringify(s.lp)} at ${s.hhmm}`);
      if (full) await shot('evening-aboard');
      maxJump = 0; lastFront = null; let shotHome = false;
      for (let i = 0; i < 2500; i++) {
        s = await st();
        lineClass = lineClass || s.line; fade = fade || s.fade;
        if (s.front !== null && lastFront !== null && (s.ph === 'back' || s.ph === 'eIn')) maxJump = Math.max(maxJump, Math.abs(s.front - lastFront));
        lastFront = s.front;
        if (full && !shotHome && s.ph === 'eIn' && s.front < 80) { shotHome = true; await shot('evening-return'); }
        if (!s.lp && s.ph !== 'eIn') break;
        await step(s.ph === 'back' || s.ph === 'eIn' ? 1 : 8);
      }
      if (s.lp || s.away) P(`he did not come home with the evening train: ${JSON.stringify(s.lp)} at ${s.hhmm}`);
      if (!(maxJump < 25)) P(`the work train jumped ${maxJump.toFixed(1)} u in a tick on its way home`);
      if (lineClass || fade) P('the ride home switched screens or faded');
      s = await until(q => q.men.every(m => m.pl === 1 && (m.st === 'camp' || m.st === 'toCamp')) || q.sod > 22 * 3600 || q.sod < 5 * 3600, 600, 8);
      if (!s.men.every(m => m.pl !== 2 && (m.st === 'camp' || m.st === 'toCamp' || m.st === 'bed'))) P(`the men were not back at the camp in the evening (${s.hhmm}): ${JSON.stringify(s.men.map(m => m.st))}`);
      console.log(`  ${orient}: home with the evening train at ${s.hhmm}; the men back at the camp`);
      if (full) { await look(-50, -30, 1.5); await shot('evening-camp'); await unlook(); }

      // ---- Dev mode's crew at once; the line longer next morning ----
      const fEve = s.f.slice();
      if (!(fEve[5] > f0[5] + 10)) P(`the line grew only ${(fEve[5] - f0[5]).toFixed(1)} m on day 1`);
      if (full) {
        s = await until(q => q.pd === 'summary' || (q.sod > 4 * 3600 && q.sod < 5.9 * 3600), 2000, 16);
        if (s.pd !== 'summary') P(`the day did not end: ${s.pd} at ${s.hhmm}`);
        else { await page.evaluate(() => { document.getElementById('pdLesson').hidden = true; }); await page.tap('#pdNextDay').catch(() => P('no Next day button')); await frames(3); await step(1); }
        s = await st();
        if (s.hhmm !== '06:00' || !(s.f[5] >= fEve[5]) || !(s.f[5] > f0[5])) P(`the next morning: ${s.hhmm}, spiked ${s.f[5]} (was ${f0[5]} at the start)`);
        if (!s.men.every(m => m.pl === 1 && m.x < -40)) P('the next morning at 06:00 the men are not at the camp');
        await page.evaluate(() => { const R = window.__railhead; R.send({ t: 'pdStart' }); R.step(1); });
        s = await until(q => q.sod >= 9.5 * 3600, 400, 16);
        await page.evaluate(() => { const R = window.__railhead; R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(2); });
        s = await until(q => q.sod >= 10.5 * 3600, 200, 16);
        const wk = s.men.filter(m => m.pl === 2 && (m.st === 'work' || m.st === 'walk' || m.st === 'tool'));
        if (s.men.length !== 30 || wk.length < 24) P(`30 men chosen at 09:30: ${s.men.length} men, ${wk.length} at or on the way to work an hour later (${JSON.stringify(s.men.reduce((a, m) => (a[m.st] = (a[m.st] || 0) + 1, a), {}))})`);
        s = await until(q => q.sod >= 11 * 3600 + 1200, 200, 16);
        { const xs = s.men.filter(m => m.pl === 2 && m.st === 'work').map(m => m.x); await look((Math.min(...xs) + Math.max(...xs)) / 2, 0, 1.0); await shot('team-30'); await unlook(); }
        console.log(`  ${orient}: the next morning the line was at ${s.f[5].toFixed(0)} m (${f0[5]} at the start); 30 men chosen at 09:30 were at work by 10:30`);
      }
      if (errors.length) P('console errors: ' + errors.slice(0, 4).join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
