// Check: the helper arrows (D20 (6), "tutorial arrows that show you the flow").
//
// 1. A new game, portrait and landscape: after the welcome's OK the big arrow stands over the office desk with its
//    label "Office desk: take a contract", the dotted path is drawn, and no edge arrow shows (screenshot
//    arrows-first-*.png). The camera panned away: the arrow at the screen's edge shows, inside the screen, pointing
//    towards the desk (its angle matches the direction from the middle of the screen to the desk) with its name
//    (arrows-edge-*.png).
// 2. Each tutorial step (the tutorial bot of check-tutorial.js plays a game; the page loads its state at each new
//    step): the arrow stands over the right place: the desk (contract, order), the ticket counter inside the booth
//    (tickets), the work board (or, without one, the ticket counter) and then the switch (switch: the first switch
//    the next train needs when the timetable says so, else the platform switch), the Overland's car or the
//    interchange (unload), the bay with the item's tag (sort), the business's door (deliver). A later step's
//    screenshot: arrows-later-*.png.
// 3. Skip tutorial: no arrow, label, edge arrow or dots. The Arrows toggle (48 px or more) turns the hint arrow on:
//    with travellers in line at the hub's window it points there; off again, nothing; the choice is kept in the
//    browser (localStorage), not in the save; the save's hash does not change with the arrows.
// 4. Draw calls: the arrows add at most 2 (measured on the same frame with the arrows on and off). No console errors.

const { openGame, screenshotPath } = require('./browser');
const { tutBotFactory, RUNNER } = require('./check-tutorial');

const near = (a, b, d) => a && b && Math.hypot(a.x - b.x, a.z - b.z) <= (d || 0.05);

// In the page: what the arrows show now (after a couple of frames).
const READ = () => {
  const R = window.__railhead, t = R.guide.now(), vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0; };
  const box = id => { const b = document.getElementById(id).getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const A = R.guide.ui.arrow, D = R.guide.ui.dots;
  return { t, arrow: A && A.visible ? { x: A.position.x, z: A.position.z, y: A.position.y } : null, dots: D && D.visible ? D.count : 0,
    label: vis('guideLabel') ? document.getElementById('guideLabel').textContent : null, labelBox: vis('guideLabel') ? box('guideLabel') : null,
    edge: vis('guideEdge') ? { text: document.getElementById('guideEdgeText').textContent, ang: Number(document.getElementById('guideEdge').dataset.ang), box: box('guideEdgeArrow') } : null,
    toggle: vis('hintBtn') ? { ...box('hintBtn'), on: document.getElementById('hintBtn').getAttribute('aria-pressed') === 'true', text: document.getElementById('hintBtn').textContent } : null,
    vw: innerWidth, vh: innerHeight, dc: R.drawCalls };
};

module.exports = async function checkArrows() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused' });
    try {
      const frames = async () => { await page.waitForTimeout(450); };
      // ---- 1. The first step: the arrow over the office desk; panned away: the edge arrow ----
      await page.evaluate(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.step(2); R.send({ t: 'tgAnswer', id: R.state.tut.tg, b: 0 }); R.step(2);
        // The camera halfway between the player and the desk, so both are in view (in portrait the desk starts just
        // past the right edge at the start zoom, where the edge arrow points to it).
        const d = R.office.econDeskSpot(), P = R.state.player; R.camera.ox = (d.x - P.x) / 2; R.camera.oz = (d.z - P.z) / 2; });
      await frames();
      const a = await page.evaluate(READ);
      const desk = await page.evaluate(() => window.__railhead.office.econDeskSpot());
      await page.screenshot({ path: screenshotPath(`arrows-first-${orient}`) });
      if (!a.t || a.t.k !== 'desk' || !near(a.t, desk) || !near(a.arrow, desk)) problems.push(`${orient}: the first step's arrow should stand over the office desk: ${JSON.stringify({ t: a.t, arrow: a.arrow, desk })}`);
      if (a.label !== 'Office desk: take a contract') problems.push(`${orient}: the first step's label: ${a.label}`);
      if (a.edge) problems.push(`${orient}: no edge arrow while the desk is on screen`);
      if (!(a.dots > 0)) problems.push(`${orient}: the dotted path should show from the player to the desk`);
      if (!a.toggle || a.toggle.h < 48 || a.toggle.w < 48 || !a.toggle.on) problems.push(`${orient}: the Arrows toggle should show, on, at least 48 px: ${JSON.stringify(a.toggle)}`);
      if (a.labelBox && (a.labelBox.x < 0 || a.labelBox.r > a.vw || a.labelBox.y < 0)) problems.push(`${orient}: the label runs off the screen`);
      const dcOn = a.dc;
      // The same frame with the arrows off (the toggle), for the draw calls; then on again.
      await page.evaluate(() => window.__railhead.guide.setPref(false));
      await frames();
      const dcOff = (await page.evaluate(READ)).dc;
      await page.evaluate(() => window.__railhead.guide.setPref(true));
      if (dcOn - dcOff > 2) problems.push(`${orient}: the arrows add ${dcOn - dcOff} draw calls (at most 2)`);
      // Panned away (east, then north): the desk is off screen; the edge arrow points to it.
      for (const [ox, oz, tag] of [[70, 0, 'edge'], [0, -60, 'edge-north']]) {
        await page.evaluate(([ox, oz]) => { const R = window.__railhead; R.camera.ox = ox; R.camera.oz = oz; }, [ox, oz]);
        await frames();
        const e = await page.evaluate(READ);
        const want = await page.evaluate(d => { const s = window.__railhead.toScreen(d.x, d.z, 0); return Math.atan2(s.y - innerHeight / 2, s.x - innerWidth / 2); }, desk);
        if (tag === 'edge') await page.screenshot({ path: screenshotPath(`arrows-edge-${orient}`) });
        if (!e.edge) { problems.push(`${orient} ${tag}: the edge arrow should show while the desk is off screen: ${JSON.stringify(e)}`); continue; }
        let da = Math.abs(e.edge.ang - want); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > 0.08) problems.push(`${orient} ${tag}: the edge arrow points the wrong way (${e.edge.ang}, want ${want.toFixed(3)})`);
        if (e.edge.box.x < 0 || e.edge.box.y < 0 || e.edge.box.r > e.vw || e.edge.box.b > e.vh) problems.push(`${orient} ${tag}: the edge arrow is off the screen: ${JSON.stringify(e.edge.box)}`);
        if (e.edge.text !== 'Office desk') problems.push(`${orient} ${tag}: the edge arrow should name the desk: ${e.edge.text}`);
        if (e.label) problems.push(`${orient} ${tag}: the label should hide while the place is off screen`);
        console.log(`  ${orient} ${tag}: edge arrow at (${Math.round(e.edge.box.x + e.edge.box.w / 2)}, ${Math.round(e.edge.box.y + e.edge.box.h / 2)}) px, ${(e.edge.ang * 180 / Math.PI).toFixed(0)} degrees`);
      }
      await page.evaluate(() => { const R = window.__railhead; R.camera.ox = 0; R.camera.oz = 0; });
      console.log(`  ${orient}: first step: arrow at (${a.arrow.x.toFixed(1)}, ${a.arrow.z.toFixed(1)}), label "${a.label}", ${a.dots} dots; draw calls ${dcOn} with the arrows, ${dcOff} without`);

      // ---- 2. Every step: the arrow over the right place ----
      await page.evaluate(src => { window.__tutsrc = src; }, tutBotFactory.toString());
      await page.evaluate(RUNNER);
      await page.evaluate(() => { window.__arw = { X: window.__tut.start(1866), seen: {} }; });
      const keys = ['accept', 'order', 'tickets', 'switch', 'unload', 'sort', 'deliver'];
      const got = {};
      for (let guard = 0; guard < 40; guard++) {
        // Play on until a step not looked at yet, then load that state into the page.
        const k = await page.evaluate(() => {
          const R = window.__railhead, W = window.__arw;
          for (let i = 0; i < 21600; i++) {
            const c = R.tut.tutCurrent(W.X.S);
            if (W.X.S.tut.done) return null;
            if (!c) { window.__tut.step(W.X, 1); continue; }
            const key = c.key + (c.key === 'unload' && R.tut.tutTarget(W.X.S) ? '+car' : '');
            if (key !== 'welcome' && !W.seen[key]) { W.seen[key] = 1; R.importSave(JSON.stringify({ state: W.X.S })); return key; }
            window.__tut.step(W.X, 1);
          }
          return null;
        });
        if (!k) break;
        await frames();
        const r = await page.evaluate(READ);
        const exp = await page.evaluate(key => {
          const R = window.__railhead, S = R.state, t = R.tut.tutTarget(S);
          const spots = R.world.buildingSpots();
          const board = spots.find(p => /work.?board/i.test(p.kind)) || null;
          return { t, board: board && { x: board.x, z: board.z } };
        }, k);
        got[k] = { k: r.t && r.t.k, label: r.label || (r.edge && r.edge.text), arrow: r.arrow, dots: r.dots };
        const base = k.replace('+car', '');
        if (!r.t || !r.arrow) { problems.push(`${orient}: no arrow at the ${k} step`); continue; }
        if (!near(r.arrow, r.t)) problems.push(`${orient}: the arrow is not over its place at the ${k} step`);
        if (base === 'accept' || base === 'order') { if (r.t.k !== 'desk' || !near(r.t, exp.t)) problems.push(`${orient}: ${k}: the arrow should be over the office desk`); }
        else if (base === 'tickets') { if (r.t.k !== 'window' || !near(r.t, exp.t) || !/^Ticket window: sell tickets/.test(r.t.label)) problems.push(`${orient}: tickets: the arrow should be over the ticket counter: ${JSON.stringify(r.t)}`); }
        else if (base === 'switch') {
          // The work board first (the player away from it), then the switch once the board is seen.
          const b = await page.evaluate(() => {
            const R = window.__railhead, S = R.state, d = R.office.econDeskSpot();
            S.player.x = d.x; S.player.z = d.z; R.guide.ui.boardStep = -2;   // drawing test only: stand the player at the desk
            const first = R.guide.now();
            R.guide.ui.boardSeen = true;
            const then = R.guide.now();
            return { first, then };
          });
          if (!b.first || b.first.k !== 'board' || !/^Work board/.test(b.first.label)) problems.push(`${orient}: switch: the arrow should first point at the work board: ${JSON.stringify(b.first)}`);
          if (exp.board && !near(b.first, exp.board)) problems.push(`${orient}: switch: the work board arrow is not over the board's use spot`);
          if (!b.then || b.then.k !== 'switch' || !near(b.then, exp.t) || !/^Switch \d+: set it/.test(b.then.label)) problems.push(`${orient}: switch: then the arrow should be over the switch: ${JSON.stringify(b.then)}`);
          got[k].then = b.then && b.then.label;
          got[k].label = b.first && b.first.label;
        }
        else if (k === 'unload') { if (r.t.k !== 'meet' || !/^Interchange: meet the Overland/.test(r.t.label)) problems.push(`${orient}: unload (car not in): the arrow should point at the interchange: ${JSON.stringify(r.t)}`); }
        else if (k === 'unload+car') { if (r.t.k !== 'car' || !near(r.t, exp.t)) problems.push(`${orient}: unload: the arrow should be over the Overland's car`); }
        else if (base === 'sort') { if (r.t.k !== 'bay' || !near(r.t, exp.t) || !/^Freight shed: sort the crates/.test(r.t.label)) problems.push(`${orient}: sort: the arrow should be over the bay: ${JSON.stringify(r.t)}`); }
        else if (base === 'deliver') { if (r.t.k !== 'door' || !near(r.t, exp.t) || !/deliver at the door$/.test(r.t.label)) problems.push(`${orient}: deliver: the arrow should be over the door: ${JSON.stringify(r.t)}`); }
        if (k === 'sort') {
          // A later step's screenshot, the camera on the player (the bay in view).
          await frames();
          await page.screenshot({ path: screenshotPath(`arrows-later-${orient}`) });
        }
      }
      for (const k of keys) if (!got[k]) problems.push(`${orient}: the ${k} step was never looked at`);
      if (orient === 'portrait') for (const [k, g] of Object.entries(got)) console.log(`  ${k}: ${g.k} "${g.label}"${g.then ? ' then "' + g.then + '"' : ''}, ${g.dots} dots`);

      // ---- 3. Skip removes them; the toggle brings the hint arrow back ----
      await page.evaluate(() => { try { localStorage.removeItem('railhead-arrows'); } catch (e) { /* none */ } const R = window.__railhead; R.guide.ui.pref = null;
        R.importSave(JSON.stringify({ state: R.newState(1866) })); R.step(2); R.send({ t: 'tgAnswer', id: R.state.tut.tg, b: 1 }); R.step(2); });
      await frames();
      const s = await page.evaluate(READ);
      if (s.t || s.arrow || s.label || s.edge || s.dots) problems.push(`${orient}: after Skip tutorial the arrows should be gone: ${JSON.stringify(s)}`);
      if (!s.toggle || s.toggle.on || s.toggle.h < 48) problems.push(`${orient}: after Skip tutorial the Arrows toggle should show, off: ${JSON.stringify(s.toggle)}`);
      // Travellers come from 06:00: play to 07:30, then the toggle on.
      const h0 = await page.evaluate(() => { const R = window.__railhead; R.step(2 * 3600 / 8 + 120); return R.stateHash(R.state); });
      await page.tap('#hintBtn');
      await frames();
      const h = await page.evaluate(READ);
      const q = await page.evaluate(() => { const R = window.__railhead, S = R.state; let v = null; try { v = localStorage.getItem('railhead-arrows'); } catch (e) { /* none */ }
        return { queue: S.pax.list.filter(p => p.st === 'hub' && p.s === 'queue').length, stored: v, hash: R.stateHash(S) }; });
      if (!h.toggle || !h.toggle.on || h.toggle.text !== 'Arrows on') problems.push(`${orient}: the toggle should turn the arrows on: ${JSON.stringify(h.toggle)}`);
      if (q.stored !== 'on') problems.push(`${orient}: the toggle should be kept in the browser: ${q.stored}`);
      if (q.hash !== h0) problems.push(`${orient}: the arrows changed the game's state`);
      if (q.queue && (!h.t || h.t.k !== 'window' || !h.arrow)) problems.push(`${orient}: with ${q.queue} in line the hint arrow should point at the ticket window: ${JSON.stringify(h.t)}`);
      if (!q.queue) problems.push(`${orient}: no travellers in line at 07:30 to test the hint arrow`);
      await page.screenshot({ path: screenshotPath(`arrows-hint-${orient}`) });
      await page.tap('#hintBtn');
      await frames();
      const o = await page.evaluate(READ);
      if (o.t || o.arrow || o.label || o.edge || o.dots || !o.toggle || o.toggle.on) problems.push(`${orient}: the toggle off should hide the arrows: ${JSON.stringify(o)}`);
      console.log(`  ${orient}: skip: nothing shown, toggle ${Math.round(s.toggle.w)}x${Math.round(s.toggle.h)}; on: "${h.label || (h.edge && h.edge.text)}" (${q.queue} in line); off: nothing; screenshots arrows-first-${orient}.png, arrows-edge-${orient}.png, arrows-later-${orient}.png, arrows-hint-${orient}.png`);
      if (errors.length) problems.push(`${orient}: console errors: ` + errors.join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
