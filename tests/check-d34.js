// Check: D34, the join-in games in the world (DEV_NOTES "D34"). By real touches (Chromium's touch events through the
// DevTools protocol) at phone size, in portrait and landscape, in the one world with D34 on (the default):
// - For each of the six stages: the Join button beside the gang (thumb-sized, on the screen); a tap joins and the task
//   happens in the world: no panel, no camera jump; he takes his place with the gang's real men (a tie: one mate, a
//   rail: three, each a man of that gang lent to him and moving with him); his rounds are played by touches on the
//   world (the chalk line on the clump, the ring on the trench's front, the barrow's tip and the rake, the "Hup!" and the
//   carry, the count, the gauge and "Down!", the ring on the spike); each finished action moves the front exactly by
//   its work (a tie 0.6 m, a rail 4.55 m, a spike 0.15 m; clearing, digging and rock: wu / cost), measured inside the
//   tick that takes it; Leave lets his mates go.
// - With the men a task needs absent (a small crew's rail gang or tie men elsewhere): the game says why in a line and
//   nothing is done.
// - A save mid-carry (a tie in the air) loads into the same moment (same hash) and the tie is set as before.
// - The whole session's ticks and commands replayed from its start give the same hash.
// - No console errors. Screenshots test-output/d34-<game>-<orient>.png, each mid-round in the world.
const { openGame, screenshotPath } = require('./browser');

const NAMES = ['clear', 'dig', 'rock', 'ties', 'rails', 'spike'];
const UNIT = [0, 0, 0, 0.6, 4.55, 0.15];

module.exports = async function checkD34() {
  const problems = [];
  for (const orient of (process.env.D34_ORIENT ? [process.env.D34_ORIENT] : ['portrait', 'landscape'])) {
    const P = m => problems.push(`${orient}: ${m}`);
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&dev=1' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      const cdp = await page.context().newCDPSession(page);
      const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      // ---- To the line: day 2 of a crew of 15, 08:30; every tick and its events recorded ----
      const start = await page.evaluate(crew => {
        const R = window.__railhead, S = () => R.state, sod = () => (S().time + 5 * 3600) % 86400;
        R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.send({ t: 'dvSet', k: 'crew', v: crew }); R.step(2);
        for (let n = 0; n < 60000 && !(S().ln && S().ln.day >= 2 && sod() > 7.25 * 3600); n++) { const ph = S().pd.ph; if (ph === 'summary') R.send({ t: 'pdNextDay' }); else if (ph === 'morning') R.send({ t: 'pdStart' }); R.step(1); }
        R.send({ t: 'lpRide', how: 'now' }); R.step(2);
        window.__d34Rec = []; window.__d34Ev = []; window.__d34Save = R.exportSave();
        const orig = window.simTick;
        window.__d34Orig = orig;
        window.simTick = (St, cmds) => { const rec = St === R.state; if (rec) window.__d34Rec.push(JSON.parse(JSON.stringify(cmds))); const ev = orig(St, cmds); if (rec) for (const e of ev) if (/^(lg|lpRefused)/.test(e.t)) window.__d34Ev.push(Object.assign({ tick: St.tick }, e)); return ev; };
        return { ph: S().lp && S().lp.ph, d34: (0, eval)('D34').on };
      }, orient === 'portrait' ? 20 : 30);   // (a middling crew in portrait, the full crew of 30 in landscape)
      if (start.ph !== 'line') { P('could not get him onto the line'); continue; }
      if (!start.d34) { P('D34 is not on by default'); continue; }
      let T = 1000;
      const clock = t => page.evaluate(t => { (0, eval)('lgUi').clock = t; }, t);
      const tick = n => page.evaluate(n => window.__railhead.step(n), n || 1);
      const skipLesson = async () => { for (let i = 0; i < 8; i++) { const up = await page.evaluate(() => { const b = document.getElementById('pdLesson'); if (b && !b.hidden) { document.getElementById('pdLesSkip').click(); window.__railhead.step(1); return true; } return false; }); if (!up) return; await frames(2); } };
      // the game's clock moves on with the sim's (eight ticks a second at 1x)
      const at = async (t, type, x, y) => {
        const T0 = T; T = Math.max(T, t);
        const nt = Math.floor(T / 125) - Math.floor(T0 / 125); if (nt > 0) await tick(Math.min(nt, 40));
        await clock(T);
        if (type === 'touchStart') await skipLesson();
        if (type === 'touchEnd') await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [] });
        else if (type) await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
        await frames(1);
      };
      const st = () => page.evaluate(() => {
        const S = window.__railhead.state, g = (0, eval), Q = S.lp, j = Q && Q.j, r = g('lgW').r;
        const a = j && j.w ? g('lgWAnchor')() : null;
        return { j: j ? JSON.parse(JSON.stringify(j)) : null, tx: Q && Q.tx, x: Q && Q.x, z: Q && Q.z, f: S.ln.f.slice(), tick: S.tick,
          r: r ? JSON.parse(JSON.stringify(r, (key, v) => (key === 'c' && v && typeof v === 'object' && v.key ? { x: v.x } : v))) : null, a: a && g('lgWScr')(a.x, a.y, a.z),
          panel: !document.getElementById('lgPanel').hidden, chip: !document.getElementById('lgW').hidden ? document.getElementById('lgW').textContent : null };
      });
      const evs = () => page.evaluate(() => window.__d34Ev.splice(0));
      const shot = name => page.screenshot({ path: screenshotPath(`d34-${name}-${orient}`) });
      // a fresh round, ready for touches
      const roundUp = async (kind) => {
        for (let i = 0; i < 1500; i++) { await skipLesson(); const s = await st(); if (!s.j) { if (process.env.D34_DEBUG) console.log(orient, 'left while waiting for a round', JSON.stringify(await page.evaluate(() => [window.__d34Ev.filter(e => e.t === 'lgLeft' || e.t === 'lgWait').slice(-3), (window.__railhead.state.time + 18000) % 86400 / 3600]))); return null; } if (s.r && s.r.q === undefined && s.tx === undefined && (!kind || s.r.kind === kind)) return s; if (i > 30 && !s.r) { await tick(7); } await at(T + 125); }
        if (process.env.D34_DEBUG) console.log(orient, 'no round', kind, JSON.stringify(await st()), await page.evaluate(() => { const S = window.__railhead.state; return [(S.time + 18000) % 86400 / 3600, (0, eval)('lgW').msg]; }));
        return null;
      };
      const vp = page.viewportSize();
      // ---- The rounds, played well by touch (each returns when the round has sent its result) ----
      const play = {
        async 5() { const s = await roundUp(); if (!s) return 'no round'; const r = s.r, mine = r.pair ? [1, 3, 5].map(i => r.b[i]) : r.b; for (let i = 0; i < mine.length; i++) { await at(mine[i] - 120); if (i === 1) await shot('spike'); const a = (await st()).a; await at(mine[i], 'touchStart', a.x, a.y); await at(mine[i] + 40, 'touchEnd'); } return ''; },
        async 1() { const s = await roundUp(); if (!s) return 'no round'; const r = s.r; for (let i = 0; i < 4; i++) { await at(r.b[i] - 150); if (i === 2) await shot('dig'); const a = (await st()).a; await at(r.b[i], 'touchStart', a.x, a.y); await at(r.b[i] + 40, 'touchEnd'); } const a = (await st()).a; await at(r.b[4], 'touchStart', a.x, a.y); await at(r.b[4] + 40, 'touchMove', a.x, a.y - 30); await at(r.b[4] + 80, 'touchMove', a.x, a.y - 60); await at(r.b[4] + 90, 'touchEnd'); return ''; },
        async 0() {
          const s = await roundUp(); if (!s) return 'no round';
          for (let i = 0; i < 5; i++) {
            const c = (await st()).r; if (!c || c.q !== undefined) break;
            const m = await page.evaluate(() => { const g = (0, eval); return g('LGW_GAMES')[0].seg(g('lgW').r); }), dir = c.tree ? c.dir : 1;
            const mx = (m.x1 + m.x2) / 2, my = (m.y1 + m.y2) / 2, hx = (m.x2 - m.x1) / 2 * dir, hy = (m.y2 - m.y1) / 2 * dir, t = T + 450;
            if (i === 1) await shot('clear');
            await at(t, 'touchStart', mx - hx * 1.2, my - hy * 1.2);
            for (let q = 1; q <= 4; q++) await at(t + q * 35, 'touchMove', mx - hx * 1.2 + hx * 2.4 * q / 4, my - hy * 1.2 + hy * 2.4 * q / 4);
            await at(t + 150, 'touchEnd');
          }
          return '';
        },
        async 2() {
          let s = await roundUp('tip'); if (!s) return 'no barrow wheeled out';
          for (let i = 0; i < 400; i++) { const d = await page.evaluate(() => { const g = (0, eval), n = g('LGW_GAMES')[2].nose(); return n.x - g('lgCrossX')(window.__railhead.state); }); if (d > -0.15) break; await tick(1); await at(T + 20); }
          await shot('rock-tip');
          s = await st(); await at(T + 20, 'touchStart', s.a.x, s.a.y); await at(T + 60, 'touchEnd');
          s = await roundUp('rake'); if (!s) return 'no rake after the tip';
          const ends = await page.evaluate(() => { const g = (0, eval), S = window.__railhead.state, x = g('lgCrossX')(S); return [g('lgWScr')(x - 1.6, 0, 1.4), g('lgWScr')(x + 1.6, 0, 1.4)]; });
          await at(T + 20, 'touchStart', ends[0].x, ends[0].y);
          for (let sw = 0; sw < 40; sw++) { const [p, q] = sw % 2 ? [ends[1], ends[0]] : ends; for (let n = 1; n <= 6; n++) await at(T + 25, 'touchMove', p.x + (q.x - p.x) * n / 6, p.y + (q.y - p.y) * n / 6); if (sw === 1) await shot('rock-rake'); const c = (await st()).r; if (!c || c.q !== undefined) break; }
          await at(T + 20, 'touchEnd');
          return '';
        },
        async 3(save) {
          let s = await roundUp('hup'); if (!s) return 'no lift at the tie pile';
          const r = s.r; await at(r.tH - 250); await shot('ties-hup');
          s = await st(); const py = s.a.y; await at(r.tH, 'touchStart', s.a.x, py);
          const K = await page.evaluate(() => (0, eval)('lgWK')());
          let shotted = false, mates = [];
          for (let i = 0; i < 600; i++) {
            await tick(1);
            const his = await page.evaluate(t => { const g = (0, eval); return g('LGW_GAMES')[3].his(g('lgW').r, t); }, T + 30);
            await at(T + 30, 'touchMove', s.a.x, py + his * K);
            const c = await st();
            if (!c.j) return 'he left the tie gang mid-carry';
            if (c.j.ph === 'carry') {
              mates.push(await page.evaluate(() => { const S = window.__railhead.state, j = S.lp.j, m = S.cw.men[j.m[0]], d = (0, eval)('cwDrawList')(S, 'line').find(q => q.id === m.id); return { x: m.x, z: m.z, d: Math.hypot(m.x - S.lp.x, m.z - S.lp.z), anim: d && d.anim }; }));
              if (!shotted && i > 12) { shotted = true; await shot('ties-carry'); if (save) await save(); }
            }
            if (c.j.ph === 'at' && c.r && c.r.tD) break;
          }
          s = await st(); if (!s.r || !s.r.tD) return 'the tie never came to "Down!"';
          await at(s.r.tD - 120); await shot('ties-down'); await at(s.r.tD, 'touchEnd');
          const moved = mates.length > 1 && Math.hypot(mates[mates.length - 1].x - mates[0].x, mates[mates.length - 1].z - mates[0].z) > 2;
          if (!moved || mates.some(m => m.d > 4.5) || !mates.some(m => m.anim === 'tieFront')) return 'his mate did not carry the tie with him: ' + JSON.stringify(mates.slice(0, 3));
          return '';
        },
        async 4() {
          let s = await roundUp('count'); if (!s) return 'no count at the rail stack';
          const r = s.r; await at(r.c[1]); await shot('rails-count');
          s = await st(); const gx = s.a.x; await at(r.tL, 'touchStart', gx, s.a.y);
          const K = await page.evaluate(() => (0, eval)('lgWK')());
          let shotted = false, mates = [];
          for (let i = 0; i < 900; i++) {
            await tick(1);
            const raw = await page.evaluate(t => { const g = (0, eval), r = g('lgW').r; return r ? g('LGW_GAMES')[4].gauge(r, t) + r.dx : 0; }, T + 30);
            await at(T + 30, 'touchMove', gx + raw * 2 * K, s.a.y);
            const c = await st();
            if (!c.j) return 'he left the rail gang mid-carry';
            if (c.j.ph === 'carry') {
              mates.push(await page.evaluate(() => { const S = window.__railhead.state, j = S.lp.j, L = (0, eval)('cwDrawList')(S, 'line'); return j.m.map(id => { const m = S.cw.men[id], d = L.find(q => q.id === id); return { x: m.x, z: m.z, d: Math.hypot(m.x - S.lp.x, m.z - S.lp.z), anim: d && d.anim }; }); }));
              if (!shotted && i > 20) { shotted = true; await shot('rails-carry'); }
            }
            if (c.j.ph === 'at' && c.r && c.r.tD) break;
          }
          s = await st(); if (!s.r || !s.r.tD) return 'the rail never came to "Down!"';
          await at(s.r.tD - 100); await shot('rails-down'); await at(s.r.tD, 'touchEnd');
          const first = mates[0] || [], last = mates[mates.length - 1] || [];
          if (mates.length < 2 || first.some((m, i) => Math.hypot(last[i].x - m.x, last[i].z - m.z) < 2) || mates.some(ms => ms.some(m => m.d > 11)) || !mates.some(ms => ms.every(m => m.anim === 'railCarry'))) return 'the three did not carry the rail with him: ' + JSON.stringify(mates.slice(0, 2));
          return '';
        },
      };
      // ---- Each stage ----
      const order = [4, 3, 5, 1, 0, 2];
      let saved = null;
      for (const k of order) {
        await page.evaluate(() => { const R = window.__railhead, S = R.state, g = (0, eval); for (let i = 0; i < 12000 && !g('lnHours')(S).work; i++) R.step(1); });   // (after the meal, or the next morning)
        await page.evaluate(k => { const R = window.__railhead, S = R.state, g = (0, eval); for (let n = 0; n < 6 && g('lgNearStage')(S) !== k; n++) { const sp = g('lgSpot')(S, k, 1); R.send({ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }); R.step(1); for (let i = 0; i < 400 && S.lp.tx !== undefined; i++) R.step(1); } }, k);
        await frames(3); await skipLesson(); await frames(2);
        const jb = await page.evaluate(() => { const b = document.getElementById('lgJoin'), r = b.getBoundingClientRect(); return { hidden: b.hidden, t: b.textContent, k: +b.dataset.k, w: r.width, h: r.height, l: r.left, r: r.right, top: r.top, b: r.bottom }; });
        if (jb.hidden || jb.k !== k) { P(`beside the ${NAMES[k]} the Join button is ${jb.hidden ? 'not shown' : 'for stage ' + jb.k}: ` + JSON.stringify(await page.evaluate(() => { const S = window.__railhead.state, g = (0, eval); return { near: g('lgNearStage')(S), h: g('lnHours')(S), card: g('lpUi').cardFor, lp: { ph: S.lp.ph, x: S.lp.x, z: S.lp.z, j: !!S.lp.j, home: S.lp.home }, f: S.ln.f, tr: S.ln.tr.ph, sod: (S.time + 18000) % 86400 / 3600, walk: (() => { const R = window.__railhead, sp = g('lgSpot')(S, 0, 1), ev = R.simTick(S, [{ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }]), e2 = R.simTick(S, []); return { sp, ev: ev.concat(e2).filter(e => /^lp/.test(e.t)), tx: S.lp.tx, x: S.lp.x, z: S.lp.z, B: g('lpTrainBox')(S), wk: g('lnWalkable')(S.seed, S.lp.x, S.lp.z, S.ln.f[1]) }; })() }; }))); await shot(`fail-join-${NAMES[k]}`); continue; }
        if (jb.w < 44 || jb.h < 44 || jb.l < 0 || jb.r > vp.width || jb.top < 0 || jb.b > vp.height) P(`the Join button is not thumb-sized on the screen: ${JSON.stringify(jb)}`);
        // (the view stays on him: no jump, no other camera)
        const onHim = () => page.evaluate(() => { const S = window.__railhead.state, g = (0, eval), p = g('lpPose')(S), s = g('lgWScr')(p.x, 0, p.z); return Math.hypot(s.x - innerWidth / 2, s.y - innerHeight / 2); });
        const c0 = await onHim();
        await evs();
        let jev = [];
        for (let tries = 0; tries < 30; tries++) {
          await page.tap('#lgJoin');
          await tick(1); await frames(2);
          jev = await evs();
          const no = jev.find(e => e.t === 'lpRefused' && e.lg === k);
          if (!no) break;
          if (process.env.D34_DEBUG) console.log(orient, NAMES[k], 'refused, waiting for the gang:', no.why);
          await page.evaluate(k => { const R = window.__railhead, S = R.state, g = (0, eval); R.step(150); for (let n = 0; n < 6 && g('lgNearStage')(S) !== k; n++) { const sp = g('lgSpot')(S, k, 1); R.send({ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }); R.step(1); for (let i = 0; i < 400 && S.lp.tx !== undefined; i++) R.step(1); } }, k);
          await frames(3); await skipLesson(); await frames(2);
        }
        const c1 = await onHim();
        if (c0 > 12 || c1 > 12) P(`joining the ${NAMES[k]}: the view is not on him (${c0.toFixed(1)} and ${c1.toFixed(1)} px from the middle)`);
        await skipLesson();
        let s = await st();
        if (!s.j || s.j.k !== k || !s.j.w) { P(`a tap on "${jb.t}" did not start the ${NAMES[k]}'s task in the world: ${JSON.stringify(jev.slice(-2))}`); continue; }
        // his mates: the gang's own men, as many as the task takes
        const need = [0, 0, 0, 1, 3, -1][k];
        const mates = await page.evaluate(() => { const S = window.__railhead.state, j = S.lp.j; return j.m.map(id => ({ id, stage: S.cw.men[id].stage, lg: S.cw.men[id].lg, pl: S.cw.men[id].pl })); });
        if (need >= 0 && mates.length !== need) P(`the ${NAMES[k]}'s task has ${mates.length} mates, not ${need}`);
        if (mates.some(m => m.stage !== k || m.lg !== 1 || m.pl !== 2)) P(`a mate of the ${NAMES[k]} is not a man of that gang on the line: ${JSON.stringify(mates)}`);
        for (let i = 0; i < 600 && s.j && (s.j.ph === 'go' || s.tx !== undefined); i++) { await tick(1); if (i % 15 === 0) await at(T + 125); s = await st(); }
        if (s.panel) P(`the ${NAMES[k]}: the game panel is shown`);
        if (!s.chip) P(`the ${NAMES[k]}: the small chip with Leave is not shown`);
        // two actions, each moving its front exactly by its work
        let did = [];
        for (let a = 0; a < 2 && did.length < 2; a++) {
          const why = await play[k](k === 3 && orient === 'portrait' && !saved ? async () => {
            saved = await page.evaluate(() => { const R = window.__railhead; return { save: R.exportSave(), h: R.hash(), j: JSON.stringify(R.state.lp.j) }; });
          } : null);
          const gone = !(await st()).j;
          if (why && gone && did.length) break;   // (the meal or the end of the day ended his work after an action: enough)
          if (why) { P(`${NAMES[k]}: ${why}` + (/left/.test(why) ? ' ' + JSON.stringify(await page.evaluate(() => window.__d34Ev.filter(e => e.t === 'lgLeft' || e.t === 'lpRefused').slice(-3))) : '')); break; }
          for (let i = 0; i < 40; i++) { await at(T + 125); const e = (await evs()).filter(q => q.t === 'lgDid' && q.stage === k); did.push(...e); if (e.length) break; const w = (await page.evaluate(() => window.__d34Ev.slice(-3))).find(q => q.t === 'lgWait'); if (w && i > 20) break; }
        }
        if (!did.length) { P(`${NAMES[k]}: no action was taken by the sim`); await shot(`fail-${NAMES[k]}`); }
        else if (!did.some(e => e.wu > 0)) P(`${NAMES[k]}: none of his actions did any work (the front ahead never gave him room): ${JSON.stringify(did)}`);
        for (const e of did) {
          if (UNIT[k]) { if (Math.abs(e.m - UNIT[k]) > 0.0015) P(`${NAMES[k]}: one action moved the front ${e.m} m, not one ${NAMES[k]} (${UNIT[k]} m)`); }
          else {
            const c = await page.evaluate(([k, f]) => (0, eval)('lnCost')(k, f), [k, e.f0]);
            if (Math.abs(e.m * c - e.wu) > 0.01 * e.wu + 0.002) P(`${NAMES[k]}: the front moved ${e.m} m for ${e.wu} wu at ${c} wu a metre`);
          }
        }
        // Leave
        if (!(await st()).j) continue;   // (the meal came first: it ended his work, and his mates went to eat)
        await skipLesson();
        await page.tap('#lgWOut', { timeout: 5000 }).catch(e => P(`${NAMES[k]}: Leave could not be tapped: ${String(e).slice(0, 120)}`));
        await tick(1); await frames(2);
        const out = await page.evaluate(() => { const S = window.__railhead.state; return { j: !!S.lp.j, lent: S.cw.men.filter(m => m.lg).length, chip: !document.getElementById('lgW').hidden }; });
        if (out.j || out.lent || out.chip) P(`${NAMES[k]}: Leave did not end the task and let his mates go: ${JSON.stringify(out)}`);
      }
      // ---- A save mid-carry loads into the same moment, and the tie is set as before ----
      if (orient === 'portrait') {
        if (!saved) P('no save was made mid-carry');
        else {
          const re = await page.evaluate(sv => {
            const R = window.__railhead;
            window.simTick = window.__d34Orig;
            const keep = R.exportSave();
            R.importSave(sv.save);
            const h = R.hash(), j = JSON.stringify(R.state.lp.j), g = (0, eval);
            let set = null;
            for (let i = 0; i < 900 && !set; i++) {
              const S = R.state, jj = S.lp.j, cmds = jj && jj.ph === 'at' ? [{ t: 'lgDone', stage: 3, q: 90 }] : [];
              const ev = R.simTick(S, cmds); set = ev.find(e => e.t === 'lgDid') || null;
            }
            R.importSave(keep);
            return { h, j, same: h === sv.h && j === sv.j, set };
          }, saved);
          if (!re.same) P('a save made mid-carry did not load into the same moment: ' + JSON.stringify({ j0: saved.j, j1: re.j }));
          if (!re.set || Math.abs(re.set.m - 0.6) > 0.0015) P('after the reload the tie was not set as one tie: ' + JSON.stringify(re.set));
          await page.evaluate(() => { const R = window.__railhead, o = window.__d34Orig; window.simTick = (St, cmds) => { const rec = St === R.state; if (rec) window.__d34Rec.push(JSON.parse(JSON.stringify(cmds))); const ev = o(St, cmds); if (rec) for (const e of ev) if (/^(lg|lpRefused)/.test(e.t)) window.__d34Ev.push(Object.assign({ tick: St.tick }, e)); return ev; }; });
        }
      }
      // ---- The men a task needs absent: a crew of five, its rail gang (or tie men) elsewhere ----
      {
        const r = await page.evaluate(() => {
          const R = window.__railhead, S = R.state, g = (0, eval);
          R.send({ t: 'dvSet', k: 'crew', v: 5 }); R.step(2);
          const free = k => S.cw.men.filter(m => m.pl === 2 && m.stage === k && (m.st === 'work' || m.st === 'walk') && !m.lg).length;
          // (wait for a moment the rail gang, or the tie men, are short, walk up to them, and look again: they may be back)
          for (let tries = 0; tries < 200; tries++) {
            let k = -1;
            for (let i = 0; i < 4000 && k < 0; i++) { if (g('lnHours')(S).work && free(4) < 3) k = 4; else if (g('lnHours')(S).work && free(3) < 1) k = 3; else R.step(1); }
            if (k < 0) return { k };
            for (let n = 0; n < 6 && g('lgNearStage')(S) !== k; n++) { const sp = g('lgSpot')(S, k, 1); R.send({ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }); R.step(1); for (let i = 0; i < 400 && S.lp.tx !== undefined; i++) R.step(1); }
            if (g('lgNearStage')(S) === k && free(k) < (k === 4 ? 3 : 1) && g('lnHours')(S).work) return { k, near: k, free: free(k) };
            R.step(30);
          }
          return { k: -1 };
        });
        if (r.k < 0) P('with five men the rail gang and the tie men were never short: the absent case was not tried');
        else {
          await frames(3); await skipLesson(); await frames(2);
          const f0 = (await st()).f[r.k];
          const vis = await page.evaluate(() => !document.getElementById('lgJoin').hidden);
          if (!vis) P(`with the ${NAMES[r.k]} short of men the Join button is not there to try (near ${r.near})`);
          else {
            await evs();
            await page.tap('#lgJoin'); await tick(1); await frames(2);
            const e = (await evs()).find(q => q.t === 'lpRefused'), toast = await page.evaluate(() => document.getElementById('toast').textContent), s = await st();
            const want = r.k === 4 ? /rail takes four men/ : /tie takes two men/;
            if (!e || !want.test(e.why) || !want.test(toast)) P(`with the ${NAMES[r.k]} short of men (${r.free} free) the game did not say why: ${JSON.stringify({ e, toast })}`);
            if (s.j) P(`with the ${NAMES[r.k]} short of men he was still given the task`);
            await shot(`absent-${NAMES[r.k]}`);
            if (process.env.D34_DEBUG) console.log(orient, 'absent', NAMES[r.k], e && e.why, f0);
          }
        }
      }
      // ---- Replay: from the save at the start, the same ticks and commands give the same hash ----
      const rep = await page.evaluate(() => {
        const R = window.__railhead, rec = window.__d34Rec;
        window.simTick = window.__d34Orig;
        const h1 = R.hash(), n = rec.length, lg = rec.flat().filter(c => c.t === 'lgDone' || c.t === 'lgAct').length;
        R.importSave(window.__d34Save);
        for (const cmds of rec) window.simTick(R.state, cmds);
        return { h1, h2: R.hash(), n, lg };
      });
      if (rep.h1 !== rep.h2) P(`replaying the session's ${rep.n} ticks (${rep.lg} game commands) gave a different hash`);
      if (!rep.lg) P('no game command was sent in the session');
      if (errors.length) P('console errors: ' + errors.slice(0, 4).join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  return problems;
};
