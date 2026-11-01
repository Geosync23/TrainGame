// Check: how hand-building track is drawn (D10, D12; builder B2). The rules are checked by B1's checks.
// In portrait and landscape, with ?debug=1&scenario=handbuild (a 20u siding with a switch, materials on site):
// - The page loads with no console errors; the stakes, string and sign (one merged mesh) and the sign's label show.
// - The label's words match jobNeeds: "ready to build" with everything on site, and the missing bundles when one
//   is taken away (portrait).
// - While the player works, the drawn placed ties, rail pieces and spikes equal the job's done counts (rail pieces:
//   the pieces of the done rail pairs), and the last placed tie stands at its spot (jobTieAt).
// - Mid-build the player swings the maul during a spike step.
// - Drawing never changes the game: the state hash after the work equals the same ticks run on a copy.
// - Draw calls in a busy scene (job in progress, materials on site, the train, 10 loose items) stay under 100,
//   and what the job drawing itself adds is reported.
// - On completion the job meshes and the label are gone and the laid track mesh has more ties.
// Screenshots: handbuild-look-staked-*, -needs-, -mid-*, -done-*, -cancel-ask-, -cancelled- (portrait and landscape).

const { openGame, screenshotPath } = require('./browser');

const NEEDS_TEXT = `(need, JOB_MAT, JOB_MATS) => {
  const parts = JOB_MATS.filter(m => need[m] > 0).map(m => need[m] + ' ' + (need[m] === 1 ? JOB_MAT[m].one : JOB_MAT[m].many));
  return parts.length ? parts.slice(0, -1).join(', ') + (parts.length > 1 ? ' and ' : '') + parts[parts.length - 1] : '';
}`;

module.exports = async function checkHandbuildLook() {
  const problems = [];
  const report = [];
  for (const o of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(o, { query: '?paused&debug=1&scenario=handbuild&world=yard' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const P = msg => problems.push(`${o}: ${msg}`);
    const frames = () => page.waitForTimeout(250);
    try {
      // Noon light, no debug overlays, the camera close in over the middle of the job.
      await R(() => {
        for (const k of ['blocks', 'locks', 'routes', 'path']) rh.overlay(k, false);
        rh.setTime(7 * 3600);
        const H = window.__railhead, S = H.state, j = S.jobs.list[0], m = H.jobs.jobPoint(j, j.len * 0.45), sg = H.jobSignSpot(j);
        H.camera.zoom = 1.7; H.camera.ox = (m.x + sg.x) / 2 - S.player.x; H.camera.oz = (m.z + sg.z) / 2 - S.player.z;
        // The train on the north main line just west of the job's switch, in view of the work. It must leave that
        // line before the job can join it (a train on the track being split), so it is moved away before the end.
        const T = S.track, tr = S.trains[0];
        const E = T.edges.find(E => E.k === 'S' && E.cls === 'main' && Math.abs(T.nodes[E.a].z + 14) < 1e-6 && Math.abs(T.nodes[E.b].z + 14) < 1e-6 && E.len > 20);
        const A = T.nodes[E.a], east = A.x > T.nodes[E.b].x, s = east ? 7 : E.len - 7;
        tr.front = { e: E.id, s, d: east ? -1 : 1 }; tr.mode = 'idle'; tr.v = 0;
        // Away: on the next edge west, facing back towards this line, so the cars trail away from it.
        window.__trainAway = () => { const w = east ? E.b : E.a, C = T.edges.find(F => F.id !== E.id && (F.a === w || F.b === w));
          tr.front = C.a === w ? { e: C.id, s: 1, d: -1 } : { e: C.id, s: C.len - 1, d: 1 }; };
        H.step(1); // redraw the train there
      });
      await page.waitForTimeout(900);
      const sign = () => R(() => [...document.querySelectorAll('.jobSign')].map(e => ({ text: e.textContent, needs: e.dataset.needs, vis: e.style.visibility })));
      const st0 = await R(() => {
        const v = window.__railhead.jobsView;
        return { statics: !!(v.statics && v.statics.visible && v.statics.geometry.attributes.position.count > 1000), jobs: window.__railhead.state.jobs.list.length };
      });
      if (st0.jobs !== 1) P(`the scenario should have 1 job, it has ${st0.jobs}`);
      if (!st0.statics) P('the stakes, string and sign mesh is not drawn');
      let sg = await sign();
      if (sg.length !== 1 || !/Job 1: ready to build/.test(sg[0].text) || sg[0].needs !== '') P('staked sign: ' + JSON.stringify(sg));
      else if (sg[0].vis !== 'visible') P('the sign label is hidden in the staked view');
      await page.screenshot({ path: screenshotPath('handbuild-look-staked-' + o) });

      if (o === 'portrait') {
        // Take a tie bundle and the spike kegs off site: the label lists exactly what jobNeeds says.
        const r = await R(src => {
          const H = window.__railhead, S = H.state, j = S.jobs.list[0], C = H.cargo, out = [];
          const ids = C.itemsAt(S, { kind: 'STOCKPILE', jobId: j.id });
          const take = [ids.find(i => S.items.waybill[i].commodity === 'ties'), ...ids.filter(i => S.items.waybill[i].commodity === 'spikes')];
          for (const id of take) { out.push([id, j.site[id]]); C.itemMove(S, id, { kind: 'GROUND', x: 0, z: 0 }, null); delete j.site[id]; }
          C.redraw();
          window.__taken = out;
          return eval(src)(H.jobs.jobNeeds(S, j), H.jobs.JOB_MAT, ['ties', 'rails', 'spikes', 'hardware']);
        }, NEEDS_TEXT);
        await frames();
        sg = await sign();
        if (r !== '1 tie bundle and 2 spike kegs') P('jobNeeds after taking materials away: ' + r);
        if (!sg.length || sg[0].needs !== r || !sg[0].text.includes('Job 1 needs') || !sg[0].text.includes(r)) P(`sign with materials missing: ${JSON.stringify(sg)}, expected "${r}"`);
        await page.screenshot({ path: screenshotPath('handbuild-look-needs-' + o) });
        await R(() => {
          const H = window.__railhead, S = H.state, j = S.jobs.list[0];
          for (const [id, at] of window.__taken) { H.cargo.itemMove(S, id, { kind: 'STOCKPILE', jobId: j.id }, null); j.site[id] = at; }
          H.cargo.redraw();
        });
        await frames();
        sg = await sign();
        if (!sg.length || sg[0].needs !== '') P('sign after putting the materials back: ' + JSON.stringify(sg));
      }

      // 10 loose items beside the job (not track materials), for the busy scene.
      await R(() => {
        const H = window.__railhead, S = H.state, j = S.jobs.list[0];
        const wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null });
        ['flour', 'salt', 'beans', 'coffee', 'seed', 'grain', 'nails', 'tinned', 'lumber', 'furniture'].forEach((c, i) => {
          const q = H.jobs.jobPoint(j, 6 + i * 0.9), off = j.side * 4.5;
          H.cargo.itemCreate(S, wb(c), { kind: 'GROUND', x: Math.round((q.x - q.tz * off) * 100), z: Math.round((q.z + q.tx * off) * 100) }, null);
        });
        H.cargo.redraw();
        window.__copy = JSON.stringify(S);
        H.send({ t: 'jobWork', id: j.id });
      });

      // Work: after each batch of ticks, the drawn placed pieces equal the done counts.
      let ticks = 0, mid = null;
      for (const target of [8, 30, 120, 260, 402, 700, 1100]) {
        await R(n => window.__railhead.step(n), target - ticks); ticks = target;
        await frames();
        const c = await R(() => {
          const H = window.__railhead, S = H.state, j = S.jobs.list[0], v = H.jobsView, pl = v.placed[j.id];
          const m = v.meshes, cnt = k => (m[k] && m[k].visible ? m[k].count : 0);
          let tieAt = null;
          if (j.done.ties) {
            const a = new Float32Array(16); m.tie.instanceMatrix.array.slice((pl.from.tie + j.done.ties - 1) * 16, (pl.from.tie + j.done.ties) * 16).forEach((x, i) => { a[i] = x; });
            const p = H.jobs.jobPoint(j, H.jobs.jobTieAt(j, j.done.ties - 1));
            tieAt = Math.hypot(a[12] - p.x, a[14] - p.z);
          }
          return { done: j.done, pl, cnt: { tie: cnt('tie'), rail: cnt('rail'), spike: cnt('spike') }, tieAt,
            wantRail: pl.railPiecesPerPair.slice(0, j.done.rails).reduce((a, b) => a + b, 0),
            act: S.player.act, maul: !!(v.maul && v.maul.visible) };
        });
        if (c.pl.ties !== c.done.ties || c.pl.spikes !== c.done.spikes || c.pl.railPieces !== c.wantRail)
          P(`after ${ticks} ticks the drawn placed pieces (${c.pl.ties} ties, ${c.pl.railPieces} rail pieces, ${c.pl.spikes} spikes) do not match done ${JSON.stringify(c.done)} (${c.wantRail} rail pieces)`);
        if (c.cnt.tie < c.done.ties || c.cnt.spike < c.done.spikes || c.cnt.rail < c.wantRail) P(`after ${ticks} ticks the visible instance counts ${JSON.stringify(c.cnt)} are below done`);
        if (c.tieAt !== null && c.tieAt > 0.01) P(`after ${ticks} ticks the last placed tie is ${c.tieAt.toFixed(3)}u from its spot`);
        if (target === 402) {
          mid = c;
          await R(() => { const H = window.__railhead; H.camera.ox = 0; H.camera.oz = 0; H.camera.zoom = 2; });
          await page.waitForTimeout(900);
          if (!c.act || c.act.step !== 'spike' || !c.maul) P('mid-build (402 ticks): the player should be driving a spike with the maul showing: ' + JSON.stringify({ act: c.act, maul: c.maul }));
          if (!(c.done.ties > 0 && c.done.rails > 0 && c.done.spikes > 0)) P('mid-build: expected ties, rails and spikes placed: ' + JSON.stringify(c.done));
          // Busy scene draw calls, and what the job drawing adds (its group hidden for one frame).
          await page.waitForTimeout(500);
          const dc = await R(() => window.__railhead.drawCalls);
          await page.screenshot({ path: screenshotPath('handbuild-look-mid-' + o) });
          // Hide the job group and the maul for a couple of frames (jobPose shows the maul again each frame, so
          // the figure without it is taken as the job group alone plus the maul's 1 call).
          await R(() => { window.__railhead.jobsView.group.visible = false; });
          await page.waitForTimeout(300);
          const without = await R(() => { const H = window.__railhead, n = H.drawCalls - 1; H.jobsView.group.visible = true; return n; });
          report.push(`${o}: busy hand-building scene ${dc} draw calls (job drawing adds about ${dc - without})`);
          if (dc >= 100) P(`busy hand-building scene uses ${dc} draw calls (limit 100)`);
        }
      }
      if (!mid) P('no mid-build sample');

      // Drawing never changes the game: the same ticks on a copy of the state give the same hash.
      const same = await R(n => {
        const H = window.__railhead, st = JSON.parse(window.__copy);
        H.simTick(st, [{ t: 'jobWork', id: st.jobs.list[0].id }]);
        for (let i = 1; i < n; i++) H.simTick(st, []);
        return H.stateHash(st) === H.hash();
      }, ticks);
      if (!same) P('the state after drawing the work differs from the same ticks run on a copy');

      // Finish: the job meshes and the label go, and the laid track has more ties.
      // Move the train off the line the job joins, and go back to work (the last step joins the track).
      await R(() => { window.__trainAway(); window.__railhead.send({ t: 'jobWork', id: 0 }); });
      const tb = await R(() => ({ edges: window.__railhead.state.track.edges.length, ties: window.__railhead.trackTieCount() }));
      for (let i = 0; i < 40; i++) {
        const left = await R(() => window.__railhead.state.jobs.list.length);
        if (!left) break;
        await R(() => window.__railhead.step(50)); ticks += 50;
      }
      await page.waitForTimeout(600);
      const fin = await R(() => {
        const H = window.__railhead, v = H.jobsView, m = v.meshes;
        return { jobs: H.state.jobs.list.length, edges: H.state.track.edges.length, ties: H.trackTieCount(), statics: !!v.statics,
          drawn: ['tie', 'rail', 'spike'].filter(k => m[k] && m[k].visible && m[k].count > 0), maul: !!(v.maul && v.maul.visible),
          labels: document.querySelectorAll('.jobSign').length, extras: v.extras.length };
      });
      if (fin.jobs) P(`the job did not finish in ${ticks} ticks`);
      if (fin.statics || fin.drawn.length || fin.maul || fin.labels || fin.extras) P('job drawing left behind after completion: ' + JSON.stringify(fin));
      if (!(fin.edges > tb.edges) || !(fin.ties > tb.ties)) P(`the laid track mesh did not take over: edges ${tb.edges} -> ${fin.edges}, ties ${tb.ties} -> ${fin.ties}`);
      await page.screenshot({ path: screenshotPath('handbuild-look-done-' + o) });
      if (errors.length) P('console errors: ' + errors.join(' | '));
    } catch (e) {
      P(String(e && e.stack || e));
    } finally {
      await browser.close();
    }
  }
  // Cancel job on the sign's label: real touch taps, the first only arms it ("Tap again to cancel").
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1&scenario=handbuild&world=yard' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    try {
      await R(() => { for (const k of ['blocks', 'locks', 'routes', 'path']) rh.overlay(k, false); window.__railhead.send({ t: 'jobWork', id: 0 }); window.__railhead.step(120); });
      await page.waitForTimeout(900);
      const box = async () => { const b = await page.$('.jobSign .jobCancel'); return b && b.boundingBox(); };
      let bb = await box();
      if (!bb || bb.width < 48 || bb.height < 48) problems.push('cancel: the Cancel job button is missing or smaller than 48 px: ' + JSON.stringify(bb));
      else {
        await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await page.waitForTimeout(200);
        const t1 = await R(() => ({ text: document.querySelector('.jobSign .jobCancel').textContent, jobs: window.__railhead.state.jobs.list.length }));
        if (t1.text !== 'Tap again to cancel' || t1.jobs !== 1) problems.push('cancel: the first tap should only ask again: ' + JSON.stringify(t1));
        await page.screenshot({ path: screenshotPath('handbuild-look-cancel-ask-portrait') });
        // The offer to cancel lasts 4 seconds; a screenshot on a busy test machine can take longer. So after the
        // screenshot, let it lapse and do the two taps back to back, as a player would.
        await page.waitForFunction(() => document.querySelector('.jobSign .jobCancel').textContent === 'Cancel job', null, { timeout: 8000 });
        bb = await box();
        await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await page.waitForFunction(() => document.querySelector('.jobSign .jobCancel').textContent === 'Tap again to cancel', null, { timeout: 3000 });
        bb = await box();
        await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await page.waitForTimeout(400);
        const t2 = await R(() => {
          const H = window.__railhead, v = H.jobsView;
          return { jobs: H.state.jobs.list.length, labels: document.querySelectorAll('.jobSign').length, statics: !!v.statics,
            drawn: ['tie', 'rail', 'spike'].filter(k => v.meshes[k] && v.meshes[k].visible), ground: H.cargo.itemsAt(H.state, { kind: 'GROUND' }).length };
        });
        if (t2.jobs || t2.labels || t2.statics || t2.drawn.length || !t2.ground) problems.push('cancel: after the second tap ' + JSON.stringify(t2));
        await page.screenshot({ path: screenshotPath('handbuild-look-cancelled-portrait') });
      }
      if (errors.length) problems.push('cancel: console errors: ' + errors.join(' | '));
    } catch (e) { problems.push('cancel: ' + String(e && e.stack || e)); } finally { await browser.close(); }
  }
  for (const r of report) console.log('  ' + r);
  return problems;
};
