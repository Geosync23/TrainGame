// Check: the join-in games (plans/d32-tech.md 7.1 and 11.5, Play's stage 2), by real touches on the page in portrait and
// landscape (Chromium's touch events through the DevTools protocol: taps, swipes, press-hold-drag-release).
// - Beside each gang a thumb-sized Join button names it; a tap joins and the game panel comes up with Step out.
// - Each of the six games, played at good, fair and poor timing, gives a q of that word (good 75+, fair 45 to 74,
//   poor under 45), and the sim takes it (lgDone: the action counted, his last q).
// - The lift: three good rounds lift the men of his gang near him (cwBoost), poor rounds let it lapse.
// - The cap: a flood of lgDone commands (one a tick) is worth no more than one good man working the same time.
// - Step out mid-carry (a tie in the air): the panel goes, nothing is sent for the round, he stands with empty hands.
// - Replay: the ticks and commands of the whole session played again from its start give the same hash.
// - No console errors. Screenshots linegames-<stage>-<orient>.png, each mid-round.
const { openGame, screenshotPath } = require('./browser');

const WORD = q => (q >= 75 ? 'good' : q >= 45 ? 'fair' : 'poor');
const NAMES = ['clear', 'dig', 'rock', 'ties', 'rails', 'spike'];

module.exports = async function checkLineGames() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const P = m => problems.push(`${orient}: ${m}`);
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&dev=1' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      const cdp = await page.context().newCDPSession(page);
      const frames = n => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      // the line's lessons put by (check-linelessons' part): Skip on each card up, the skip done by a tick, until none is up
      const skipLesson = async () => { for (let i = 0; i < 8; i++) { const up = await page.evaluate(() => { const b = document.getElementById('pdLesson'); if (b && !b.hidden) { document.getElementById('pdLesSkip').click(); window.__railhead.step(1); return true; } return false; }); if (!up) return; await frames(2); } };
      // ---- To the line: day 3 of a crew of 30, 09:00, and every tick recorded for the replay ----
      const start = await page.evaluate(() => {
        const R = window.__railhead, S = () => R.state, sod = () => (S().time + 5 * 3600) % 86400;
        R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(2);
        for (let n = 0; n < 60000 && !(S().ln && S().ln.day >= 3 && sod() > 9 * 3600); n++) { const ph = S().pd.ph; if (ph === "summary") R.send({ t: "pdNextDay" }); else if (ph === "morning") R.send({ t: "pdStart" }); R.step(1); }   // (the station's days go on as the player's would)
        R.send({ t: 'lpRide', how: 'now' }); R.step(2);
        window.__lgRec = []; window.__lgSave = R.exportSave(); window.__lgH0 = R.hash();
        const orig = window.simTick;
        window.__lgOrig = orig;
        window.simTick = (St, cmds) => { if (St === R.state) window.__lgRec.push(JSON.parse(JSON.stringify(cmds))); return orig(St, cmds); };
        return { ph: S().lp && S().lp.ph };
      });
      if (start.ph !== 'line') { P('could not get him onto the line'); continue; }
      let T = 1000;
      const clock = t => page.evaluate(t => { (0, eval)('lgUi').clock = t; }, t);
      const rd = () => page.evaluate(() => { const r = (0, eval)('lgUi').r; return r ? JSON.parse(JSON.stringify(r)) : null; });
      const toScr = (x, y) => page.evaluate(([x, y]) => (0, eval)('lgToScreen')(x, y), [x, y]);
      const touch = async (type, x, y) => {
        if (type === 'touchEnd') { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [] }); return; }
        if (type === 'touchStart') {   // (a lesson card that came up meanwhile is put by first: the touch is for the game)
          const les = await page.evaluate(() => { const b = document.getElementById('pdLesson'); return b && !b.hidden ? b.dataset.les + ':' + b.dataset.step : ''; });
          if (les) { if (process.env.LG_DEBUG) console.log('  a lesson card was up: ' + les); await skipLesson(); }
        }
        const p = await toScr(x, y);
        if (!p || !(await page.evaluate(() => !document.getElementById('lgPanel').hidden))) throw new Error('a touch for the game with the game panel hidden');
        await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x: p.x, y: p.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
      };
      // at the game's time t: set the clock, then the touch, then a frame
      const at = async (t, type, x, y) => { T = Math.max(T, t); await clock(T); if (type) await touch(type, x, y); await frames(1); };
      const tap = async (t, x, y) => { await at(t, 'touchStart', x, y); await at(t + 40, 'touchEnd'); };
      const sim = () => page.evaluate(() => { const S = window.__railhead.state, j = S.lp && S.lp.j; return { j: j ? JSON.parse(JSON.stringify(j)) : null, tx: S.lp && S.lp.tx, tick: S.tick, bo: S.cw ? JSON.parse(JSON.stringify(S.cw.bo || [])) : [] }; });
      const settle = async () => { for (let i = 0; i < 60; i++) { const s = await sim(); if (s.tx === undefined) return s; await page.evaluate(() => window.__railhead.step(1)); } return sim(); };
      // a fresh round: wait for the last to clear, then a frame starts it
      const newRound = async () => {
        await page.evaluate(() => window.__railhead.step(10));
        await settle();
        for (let i = 0; i < 6; i++) { await at(T + 1200); const r = await rd(); if (r && r.q === undefined) return r; }
        return null;
      };
      // ---- The six games' players: good, fair and poor timing ----
      const E = { good: 0, fair: 170, poor: 300 };
      const play = {
        async 0(r, lv) {   // swipes along the chalk line (fair 20 degrees off, poor 40)
          let t = r.t0 + 300;
          for (let i = 0; i < 6; i++) {
            const c = await rd(); if (!c || c.q !== undefined) break;
            const m = c.m, dir = c.tree ? c.dir : 1, rot = { good: 0, fair: 20, poor: 40 }[lv] * Math.PI / 180;
            const mx = (m.x1 + m.x2) / 2, my = (m.y1 + m.y2) / 2, hx = (m.x2 - m.x1) / 2 * dir, hy = (m.y2 - m.y1) / 2 * dir;
            const ex = hx * Math.cos(rot) - hy * Math.sin(rot), ey = hx * Math.sin(rot) + hy * Math.cos(rot);
            await at(t, 'touchStart', mx - ex * 1.1, my - ey * 1.1);
            for (let s = 1; s <= 4; s++) await at(t + s * 35, 'touchMove', mx - ex * 1.1 + ex * 2.2 * s / 4, my - ey * 1.1 + ey * 2.2 * s / 4);
            await at(t + 150, 'touchEnd');
            if (i === 1) await shot(0);
            t += 600;
          }
        },
        async 1(r, lv) {   // four taps on the beat, then a flick up
          const e = E[lv];
          for (let i = 0; i < 4; i++) { await tap(r.b[i] + e, 180, 160); if (i === 2) await shot(1); }
          await at(r.b[4] + e, 'touchStart', 180, 160); await at(r.b[4] + e + 40, 'touchMove', 180, 120); await at(r.b[4] + e + 80, 'touchMove', 180, 80); await at(r.b[4] + e + 90, 'touchEnd');
        },
        async 2(r, lv) {   // tip on the cross (fair 20 off, poor 45), then rake (good: till level, fair: a little, poor: not at all)
          const err = { good: 0, fair: 20, poor: 45 }[lv];
          await tap(r.t0 + (r.mx + err - 54) / r.v, 180, 150);
          const sweeps = { good: 40, fair: 2, poor: 0 }[lv];
          let t = T + 100;
          if (sweeps) await at(t, 'touchStart', 30, 165);
          for (let i = 0; i < sweeps; i++) {
            for (let s = 1; s <= 8; s++) { t += 25; await at(t, 'touchMove', i % 2 ? 330 - 300 * s / 8 : 30 + 300 * s / 8, 165); }
            if (i === 1) await shot(2);
            const c = await rd(); if (!c || c.q !== undefined) break;
          }
          if (sweeps) await at(t + 20, 'touchEnd');
          for (let i = 0; i < 10; i++) { const c = await rd(); if (!c || c.q !== undefined) break; await at(T + 500); }
        },
        async 3(r, lv) {   // hold on "Hup!", keep level with him, let go on "Down!" on the mark
          const e = E[lv], off = { good: 0, fair: -15, poor: -40 }[lv];
          await at(r.tH + e, 'touchStart', r.px + off, 172);
          let t = T, shotDone = false, ended = false;
          for (let i = 0; i < 80; i++) {
            t += 50; await clock(t); await frames(1);
            const c = await rd(); if (!c || c.st !== 'carry') break;
            if (c.tD) { await at(c.tD + e, 'touchMove', c.M + off, 172); await at(c.tD + e + 10, 'touchEnd'); ended = true; break; }
            await at(t, 'touchMove', c.px + off, 172);
            if (!shotDone && i > 12) { shotDone = true; await shot(3); }
          }
          if (!ended) await at(T + 10, 'touchEnd');
        },
        async 4(r, lv) {   // hold on "Lift!", drag to keep the rail on the gauge line, let go on "Down!"
          const e = E[lv], keep = { good: 0, fair: 12, poor: null }[lv];
          const gx = 180;
          await at(r.tL + e, 'touchStart', gx, 160);
          const raw = t => { const k = t - r.tL; return r.A * Math.sin(k / 420 + r.ph) + k * 0.006; };
          let t = T, i = 0;
          for (; t < r.tD + e - 50; t += 60, i++) { if (keep !== null) await at(t, 'touchMove', gx + 2 * (raw(t) - keep), 160); else await at(t); if (i === 15) await shot(4); }
          if (keep !== null) await at(r.tD + e, 'touchMove', gx + 2 * (raw(r.tD + e) - keep), 160); else await at(r.tD + e);
          await at(r.tD + e + 5, 'touchEnd');
        },
        async 5(r, lv) {   // three blows on my beats (between the partner's)
          const e = E[lv], mine = [1, 3, 5].map(i => r.b[i]);
          for (let i = 0; i < 3; i++) { await tap(mine[i] + e, 196, 140); if (i === 1) await shot(5); }
        },
      };
      let shotWanted = -1;
      const shot = async k => { if (shotWanted !== k) return; shotWanted = -1; await page.screenshot({ path: screenshotPath(`linegames-${NAMES[k]}-${orient}`) }); };
      // the round's end: q set (the round runs on its own clock to its end if need be), then sent and taken
      const finish = async () => {
        let r = await rd();
        for (let i = 0; i < 12 && r && r.q === undefined; i++) { await at(T + 400); r = await rd(); }
        if (!r || r.q === undefined) return { q: null };
        await frames(2);
        const before = (await sim()).j;
        await page.evaluate(() => window.__railhead.step(1));
        const after = (await sim()).j;
        return { q: r.q, taken: !!after && !!before && after.n === before.n + 1 && after.q === r.q };
      };
      const vp = page.viewportSize();
      const levels = orient === 'portrait' ? ['good', 'fair', 'poor'] : ['good'];
      for (let k = 0; k < 6; k++) {
        // walk up to the gang (a command: walking by touch is check-lineplay's), then a real tap on Join
        await page.evaluate(k => { const R = window.__railhead, S = R.state, sp = (0, eval)('lgSpot')(S, k, 1); R.send({ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }); R.step(1); for (let i = 0; i < 400 && S.lp.tx !== undefined; i++) R.step(1); }, k);
        await frames(3); await skipLesson(); await frames(2);
        const jb = await page.evaluate(() => { const b = document.getElementById('lgJoin'); const r = b.getBoundingClientRect(); return { hidden: b.hidden, t: b.textContent, k: +b.dataset.k, w: r.width, h: r.height, l: r.left, r: r.right, top: r.top, b: r.bottom }; });
        if (jb.hidden || jb.k !== k) { P(`beside gang ${k} the Join button is ${jb.hidden ? 'not shown' : 'for gang ' + jb.k}`); continue; }
        if (jb.w < 44 || jb.h < 44 || jb.l < 0 || jb.r > vp.width || jb.top < 0 || jb.b > vp.height) P(`the Join button is not thumb-sized on the screen: ${JSON.stringify(jb)}`);
        await page.tap('#lgJoin');
        await page.evaluate(() => window.__railhead.step(1));
        await skipLesson();
        let s = await settle();
        if (!s.j || s.j.k !== k) { P(`a tap on "${jb.t}" did not join gang ${k}`); continue; }
        await frames(2); await skipLesson(); await frames(2);
        const ui = await page.evaluate(() => { const p = document.getElementById('lgPanel'), o = document.getElementById('lgOut').getBoundingClientRect(), c = document.getElementById('lgCv').getBoundingClientRect(); return { hidden: p.hidden, out: [o.width, o.height], cv: [c.width, c.height] }; });
        if (ui.hidden || ui.out[0] < 44 || ui.out[1] < 44 || ui.cv[1] < 120) P(`the game panel is not up as it should be: ${JSON.stringify(ui)}`);
        for (const lv of levels) {
          const r = await newRound();
          if (!r) { P(`${NAMES[k]}: no round started: ` + JSON.stringify(await page.evaluate(() => { const R = window.__railhead, S = R.state, g = (0, eval); return { lp: S.lp, sod: (S.time + 18000) % 86400, h: g('lnHours')(S), sp: S.lp.j && g('lgSpot')(S, S.lp.j.k, S.lp.j.side), r: g('lgUi').r && Object.keys(g('lgUi').r) }; }))); break; }
          shotWanted = lv === 'good' ? k : -1;
          await play[k](r, lv);
          const f = await finish();
          if (f.q === null) { P(`${NAMES[k]} (${lv}): the round did not end`); await page.screenshot({ path: screenshotPath(`linegames-fail-${orient}`) }); }
          else {
            if (WORD(f.q) !== lv) P(`${NAMES[k]} played ${lv} gave q ${f.q} (${WORD(f.q)})`);
            if (!f.taken) P(`${NAMES[k]} (${lv}): the sim did not take the round's result`);
          }
          if (process.env.LG_DEBUG) console.log(orient, NAMES[k], lv, f.q);
        }
        // ---- The lift (portrait, at the diggers): three good rounds lift the men near him, poor ones let it lapse ----
        if (orient === 'portrait' && k === 1) {
          for (let i = 0; i < 3; i++) { const r = await newRound(); await play[1](r, 'good'); await finish(); }
          s = await sim();
          const on = s.bo.find(b => b.stage === 1);
          if (!s.j.lift || s.j.lift <= s.tick || !on || !(on.k > 1.1)) P('three good rounds did not lift the diggers near him: ' + JSON.stringify({ lift: s.j.lift, tick: s.tick, bo: s.bo }));
          const lifted = await page.evaluate(() => document.getElementById('lgTitle').textContent);
          if (!/lifting \d+ men/.test(lifted)) P('the panel does not say whom he lifts: ' + lifted);
          for (let i = 0; i < 3; i++) { const r = await newRound(); await play[1](r, 'poor'); await finish(); }
          await page.evaluate(() => window.__railhead.step(30));
          s = await sim();
          if (s.j.lift || s.bo.some(b => b.stage === 1 && b.until > s.tick)) P('after poor rounds the lift did not lapse: ' + JSON.stringify({ lift: s.j.lift, bo: s.bo }));
        }
        // ---- Step out mid-carry (portrait, the ties): nothing left in the air ----
        if (orient === 'portrait' && k === 3) {
          const r = await newRound();
          const sent0 = await page.evaluate(() => (0, eval)('lgUi').sent.length);
          await at(r.tH, 'touchStart', r.px, 172);
          for (let i = 0; i < 10; i++) await at(T + 60, 'touchMove', 330 - i * 4, 172);
          const mid = await rd();
          if (!mid || mid.st !== 'carry') P('the tie was not in the air for the step-out test: ' + JSON.stringify(mid && { st: mid.st, tH: mid.tH, T, dbg: await page.evaluate(() => { const u = (0, eval)('lgUi'); return { frozen: u.frozen, ptr: u.ptr, les: !document.getElementById('pdLesson').hidden, top: (() => { const p = (0, eval)('lgToScreen')(330, 172); const e = document.elementFromPoint(p.x, p.y); return e && (e.id || e.className); })() }; }) }));
          // a second thumb on Step out while the first still holds the tie
          const hold = await toScr(290, 172), ob = await page.evaluate(() => { const o = document.getElementById('lgOut').getBoundingClientRect(); return { x: o.left + o.width / 2, y: o.top + o.height / 2 }; });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hold.x, y: hold.y, id: 1 }, { x: ob.x, y: ob.y, id: 2 }] });
          await frames(1);
          const still = await page.evaluate(() => !!(0, eval)('lgUi').r && (0, eval)('lgUi').ptr !== null);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: ob.x, y: ob.y, id: 2 }] });   // (the second thumb lifts; Chromium's touch emulation releases the points a touchEnd lists)
          if (!still) P('the first thumb did not still hold the tie as the second tapped Step out');
          if (!(await page.evaluate(() => (0, eval)('lgUi').left))) P('lifting the second thumb from Step out did not step out');
          await frames(1);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await frames(2);
          await page.evaluate(() => window.__railhead.step(1)); await frames(3);
          const out = await page.evaluate(() => { const R = window.__railhead, S = R.state, g = (0, eval), p = g('lpPose')(S); return { j: !!S.lp.j, r: !!g('lgUi').r, sent: g('lgUi').sent.length, panel: !document.getElementById('lgPanel').hidden, pose: p && { act: p.act, held: p.held || null, anim: p.anim || null, who: p.who || null } }; });
          if (out.j || out.r || out.panel) P('Step out mid-carry did not end his work with the gang: ' + JSON.stringify(out));
          if (out.sent !== sent0) P('Step out mid-carry still sent the round');
          if (!out.pose || out.pose.held || out.pose.anim || out.pose.who || out.pose.act !== 'idle') P('after Step out he is not standing empty-handed: ' + JSON.stringify(out.pose));
          await page.screenshot({ path: screenshotPath(`linegames-stepout-${orient}`) });
          continue;
        }
        const why = await page.evaluate(() => { const g = (0, eval), u = g('lgUi'), S = window.__railhead.state; return document.getElementById('lgPanel').hidden ? JSON.stringify({ left: u.left, j: S.lp.j, les: !document.getElementById('pdLesson').hidden && document.getElementById('pdLesson').dataset.les, set: g('setUi').open, dev: !document.getElementById('devPanel').hidden, view: S.ln.view }) : ''; });
        if (why) { P(`after the rounds of gang ${k} the game panel is not up: ${why}`); await page.screenshot({ path: screenshotPath(`linegames-fail-${orient}`) }); break; }
        await page.tap('#lgOut', { timeout: 5000 }).catch(async e => { P('Step out could not be tapped: ' + await page.evaluate(() => { const g = (0, eval), u = g('lgUi'), S = window.__railhead.state, p = document.getElementById('lgPanel'); return JSON.stringify({ hidden: p.hidden, rect: p.getBoundingClientRect(), left: u.left, j: S.lp.j, les: !document.getElementById('pdLesson').hidden && document.getElementById('pdLesson').className, set: g('setUi').open, view: S.ln.view, line: document.body.classList.contains('line'), disp: getComputedStyle(p).display }); })); }); await frames(2);
        await page.evaluate(() => window.__railhead.step(1));
        if ((await sim()).j) P(`Step out did not end his work with gang ${k}: ` + JSON.stringify(await page.evaluate(() => { const o = document.getElementById('lgOut').getBoundingClientRect(); return [o.left, o.top, o.width, document.elementFromPoint(o.left + o.width / 2, o.top + o.height / 2).id]; })));
      }
      // ---- Replay: from the save at the start, the same ticks and commands give the same hash ----
      const rep = await page.evaluate(() => {
        const R = window.__railhead, rec = window.__lgRec;
        window.simTick = window.__lgOrig;
        const h1 = R.hash(), n = rec.length, lg = rec.flat().filter(c => c.t === 'lgDone').length;
        R.importSave(window.__lgSave);
        for (const cmds of rec) window.simTick(R.state, cmds);
        return { h1, h2: R.hash(), n, lg };
      });
      if (rep.h1 !== rep.h2) P(`replaying the session's ${rep.n} ticks (${rep.lg} lgDone) gave a different hash`);
      if (!rep.lg) P('no lgDone was sent in the session');
      // ---- The cap (the sim alone): a flood of lgDone, one a tick, at the diggers ----
      if (orient === 'portrait') {
        const cap = await page.evaluate(() => {
          const R = window.__railhead, S = R.state, g = (0, eval), LG = g('LG'), sp = g('lgSpot')(S, 1, 1);
          R.send({ t: 'lpWalk', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) }); R.step(1);
          for (let i = 0; i < 400 && S.lp.tx !== undefined; i++) R.step(1);
          R.send({ t: 'lpJoin', stage: 1 }); R.step(1);
          for (let i = 0; i < 40 && S.lp.tx !== undefined; i++) R.step(1);
          const t0 = S.tick, n0 = S.lp.j ? S.lp.j.n : -1;
          let wu = 0;
          for (let i = 0; i < 400; i++) { const ev = R.simTick(S, [{ t: 'lgDone', stage: 1, q: 100 }]); for (const e of ev) if (e.t === 'lgDid') wu += e.wu; }
          const ticks = S.tick - t0, j = S.lp.j, most = LG.worth(100) * LG.rate() * ticks * g('DT_MIN');
          return { n: j ? j.n - n0 : -1, ticks, wu, most, MIN_T: LG.MIN_T };
        });
        if (cap.n < 0) P('could not join the diggers for the flood test');
        else {
          if (cap.n > Math.ceil(cap.ticks / cap.MIN_T) + 1) P(`a flood of lgDone was taken ${cap.n} times in ${cap.ticks} ticks`);
          if (cap.wu > cap.most + 1e-6) P(`a flood of lgDone did ${cap.wu.toFixed(2)} wu, more than one good man's ${cap.most.toFixed(2)}`);
          if (cap.n < 10) P(`under a flood of lgDone he did too little (${cap.n} actions)`);
        }
      }
      if (errors.length) P('console errors: ' + errors.slice(0, 4).join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  return problems;
};
