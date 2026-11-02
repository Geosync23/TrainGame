// Check: hand-building track (M1 round B, D10 and D12), the game rules.
// - Without ?debug=1, by real touch: build mode, a drag on from the spur's dead end, then Stake it makes a
//   construction job and adds no track; a tap on the stakes starts work, which stops at once with "Out of ties".
// - An amber plan (needs earthwork) cannot be staked: the button is disabled and the command is refused with a
//   reason; a second job on the same track end is refused.
// - With the handbuild scenario's materials on site, one jobWork builds the whole 20u siding: ties, then the rail
//   pair, then spikes, stretch by stretch; the total game time is within 10% of the D12 step times plus walking;
//   the track joins, passes the validator, the job is gone, and a train is routed onto the new siding and arrives.
// - Missing materials stop the work with the right message (each of ties, rails, spikes and the hardware crate).
// - Carrying: a tie bundle put down beside the job is delivered to its stockpile.
// - Any other command (a walk) stops the work.
// - Cancel mid-job returns every tie, rail, spike and crate as items: the piece totals are unchanged and the item
//   conservation check passes, also with part-used bundles.
// - Save and reload mid-job (export/import and a real page reload) resume exactly: the same hash after the same ticks.
// - The same commands twice give the same hash.
// Screenshot: handbuild-portrait.png (the scenario part-built, with ?debug=1), with draw calls.

const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkHandbuild() {
  const problems = [];
  await checkTouch(problems);
  await checkRules(problems);
  await checkSaveReload(problems);
  await checkScreenshot(problems);
  return problems;
};

async function checkTouch(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) });
  const R = (fn, arg) => page.evaluate(fn, arg);
  const settle = () => page.waitForTimeout(120);
  const frames = () => R(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const scr = (x, z, y) => R(([x, z, y]) => window.__railhead.toScreen(x, z, y || 0), [x, z, y]);
  const lookAt = async (x, z, zoom) => {
    await R(([x, z, zoom]) => { const R = window.__railhead, P = R.state.player; R.camera.zoom = zoom; R.camera.ox = x - P.x; R.camera.oz = z - P.z; R.camera.fx = P.x; R.camera.fz = P.z; }, [x, z, zoom]);
    await page.waitForTimeout(200); await frames(); // a frame can take over 200 ms on a busy test machine
  };
  const drag = async (a, b, hold) => {
    const p0 = await scr(a.x, a.z, 0.2), p1 = await scr(b.x, b.z, 0);
    await touch('touchStart', [p0]);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: p0.x + (p1.x - p0.x) * i / 10, y: p0.y + (p1.y - p0.y) * i / 10 }]); await page.waitForTimeout(16); }
    await settle(); await frames();
    if (hold) await hold();
    await touch('touchEnd', []); await settle(); await frames();
  };
  const tapAt = async (x, z) => { const p = await scr(x, z, 0); await touch('touchStart', [p]); await page.waitForTimeout(40); await touch('touchEnd', []); await settle(); await frames(); };
  const label = () => R(() => { const el = document.getElementById('buildLabel'); return { text: el.textContent, k: el.dataset.k }; });
  try {
    const spur = await R(() => {
      const T = window.__railhead.state.track;
      const N = T.nodes.filter(N => T.edges.filter(E => E.a === N.id || E.b === N.id).length === 1).sort((a, b) => a.x - b.x)[0];
      const E = T.edges.find(E => E.a === N.id || E.b === N.id), O = T.nodes[E.a === N.id ? E.b : E.a], L = Math.hypot(N.x - O.x, N.z - O.z);
      return { n: N.id, x: N.x, z: N.z, hx: (N.x - O.x) / L, hz: (N.z - O.z) / L, edges: T.edges.length, k: window.__railhead.CFG.SCALE };
    });
    // This check is about jobs, not about telling a tap from press and hold (check-touch covers that). On a
    // heavily loaded test machine a touch can reach the page more than 220 ms after it starts, which the game
    // rightly reads as a hold; so this page allows a longer hold time.
    await R(() => { window.__railhead.CFG.HOLD_MS = 1500; });
    await page.tap('#buildBtn'); await settle();
    await lookAt(spur.x - 4 * spur.k, spur.z, 0.7);
    // An amber plan: 20u (x SC) on from the spur end runs onto the hills.
    let amber = null;
    await drag(spur, { x: spur.x + spur.hx * 20 * spur.k, z: spur.z + spur.hz * 20 * spur.k }, async () => { amber = await label(); });
    if (!amber || amber.k !== 'amber') problems.push(`amber: the 20u plan was not amber (${amber && amber.k}: ${amber && amber.text})`);
    if (!(await page.isDisabled('#buildLay'))) problems.push('amber: Stake it is not disabled for a plan that needs earthwork');
    const amberCmd = await R(() => window.__railhead.buildTool.cmd);
    const amberRes = await R((cmd) => { const R = window.__railhead, ev = R.simTick(JSON.parse(JSON.stringify(R.state)), [{ ...cmd, t: 'stakeJob' }]); return ev.find(e => /^job/.test(e.t)); }, amberCmd);
    if (!amberRes || amberRes.t !== 'jobRefused' || !/earthwork/.test(amberRes.why)) problems.push(`amber: stakeJob was not refused for earthwork (${JSON.stringify(amberRes)})`);
    await page.tap('#buildCancel'); await settle();
    // A green 6u (x SC) plan, staked by touch.
    let seen = null;
    await drag(spur, { x: spur.x + spur.hx * 6 * spur.k, z: spur.z + spur.hz * 6 * spur.k }, async () => { seen = await label(); });
    if (!seen || seen.k !== 'ok') problems.push(`stake: the 6u plan was not green (${seen && seen.k}: ${seen && seen.text})`);
    const btn = await page.locator('#buildLay').boundingBox();
    if (!btn || btn.width < 48 || btn.height < 48) problems.push('stake: the Stake it button is smaller than 48 px');
    if ((await page.textContent('#buildLay')).trim() !== 'Stake it') problems.push('stake: the button does not say Stake it');
    await page.tap('#buildLay'); await settle(); await frames();
    const st = await R(() => { const R = window.__railhead, S = R.state, j = S.jobs.list[0]; return { jobs: S.jobs.list.length, edges: S.track.edges.length, job: j && { len: j.len, need: j.need, stakes: j.stakes.length, count: j.count }, build: R.buildTool.on, toast: document.getElementById('toast').textContent }; });
    if (st.jobs !== 1) problems.push(`stake: ${st.jobs} jobs after Stake it, expected 1`);
    if (st.edges !== spur.edges) problems.push(`stake: Stake it added ${st.edges - spur.edges} track edges (a job must not be track)`);
    if (st.job && (st.job.count.ties !== 12 || st.job.need.ties !== 2 || st.job.need.rails !== 1 || st.job.need.spikes !== 1 || st.job.need.hardware !== 0)) problems.push('stake: wrong counts for 6u: ' + JSON.stringify(st.job));
    if (st.job && st.job.stakes !== 4) problems.push(`stake: ${st.job.stakes} stakes for 6u, expected 4 (0, 2.5, 5 x SC and the end)`);
    if (st.build) problems.push('stake: build mode stayed on after staking');
    if (!/staked/.test(st.toast)) problems.push(`stake: no message after staking ("${st.toast}")`);
    // The same track end again is refused.
    const again = await R((spur) => { const R = window.__railhead, ev = R.simTick(JSON.parse(JSON.stringify(R.state)), [{ t: 'stakeJob', from: 'node', n: spur.n, tx: Math.round((spur.x - 4 * spur.k) * 100), tz: Math.round(spur.z * 100) }]); return ev.find(e => /^job/.test(e.t)); }, spur);
    if (!again || again.t !== 'jobRefused') problems.push('stake: a second job on the same track end was not refused');
    // A buildTrack-style command with a fraction is refused.
    const frac = await R((spur) => { const R = window.__railhead, ev = R.simTick(JSON.parse(JSON.stringify(R.state)), [{ t: 'stakeJob', from: 'node', n: spur.n, tx: 0.5, tz: 0 }]); return ev.find(e => /^job/.test(e.t)); }, spur);
    if (!frac || frac.t !== 'jobRefused' || !/whole numbers/.test(frac.why)) problems.push('stake: a plan with a fraction was not refused');
    // A tap on the stakes starts work, which stops at once: nothing is on site.
    await lookAt(spur.x - 3 * spur.k, spur.z, 1);
    const ev0 = await R(() => window.__railhead.state.tick);
    // On a busy test machine a tap can arrive late enough to count as press and hold, so try up to 3 times.
    let work = null;
    for (let tries = 0; tries < 3; tries++) {
      await tapAt(spur.x - 3 * spur.k, spur.z);
      work = await R(() => { const R = window.__railhead; R.step(1); return { toast: document.getElementById('toast').textContent, use: R.state.player.use, act: R.state.player.act }; });
      if (/Out of ties/.test(work.toast)) break;
      await R(() => window.__railhead.send({ t: 'walkDir', a: null })); // end any hold walk before the next try
    }
    if (!/Out of ties/.test(work.toast)) problems.push(`work: tapping the job with nothing on site did not say "Out of ties" ("${work.toast}")`);
    if (work.use || work.act) problems.push('work: the player kept working with no materials');
    await page.screenshot({ path: screenshotPath('handbuild-staked-portrait') });
    if (errors.length) problems.push('touch: console errors: ' + errors.join(' | '));
    console.log(`  staked by touch: ${st.job && st.job.len.toFixed(2)}u, needs ${JSON.stringify(st.job && st.job.need)}; amber refused: "${amberRes && amberRes.why}"`);
  } finally { await browser.close(); }
}

// The rules, through the sim on copies of the state (no drawing).
async function checkRules(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, J = R.jobs, out = {}, SC = R.CFG.SCALE;
      out.SC = SC;
      const fresh = () => J.jobDebugScenario(R.newState(1866));
      const copy = S => JSON.parse(JSON.stringify(S));
      // Runs until the job is done or stopped (or a limit); records the steps and the walking.
      const work = (S, limit, id) => {
        const rec = { order: [], walk: 0, ticks: 0, stops: [], done: false, evs: [] };
        let ev = R.simTick(S, [{ t: 'jobWork', id: id || 0 }]); rec.ticks++;
        for (let i = 0; ; i++) {
          rec.evs.push(...ev.filter(e => /^job(Stopped|Done|Refused)$|^trackBuilt$/.test(e.t)));
          for (const e of ev) if (e.t === 'jobStep') rec.order.push(e.k[0]);
          if (ev.some(e => e.t === 'jobStopped')) { rec.stops.push(ev.find(e => e.t === 'jobStopped')); break; }
          if (ev.some(e => e.t === 'jobDone')) { rec.done = true; break; }
          if (i >= limit) break;
          if (S.player.mode === 'to') rec.walk++;
          ev = R.simTick(S, []); rec.ticks++;
        }
        return rec;
      };
      // 1. The whole siding with one jobWork.
      const S = fresh(), job0 = copy(S.jobs.list[0]), e0 = S.track.edges.length, tot0 = J.jobPieceTotals(S);
      out.job = { len: job0.len, count: job0.count, need: job0.need, site: Object.keys(job0.site).length, sw: job0.sw };
      const rec = work(S, 5000);
      out.done = rec.done; out.stops = rec.stops; out.ticks = rec.ticks; out.walk = rec.walk;
      out.order = rec.order.join('').replace(/(.)\1+/g, (m, c) => c + m.length);
      out.jobsLeft = S.jobs.list.length; out.edgesAdded = S.track.edges.length - e0;
      out.valid = R.trackValidate(S.track); out.cons = R.cargo.itemCheckConservation(S);
      out.consumed = S.items.used.filter(u => u.reason === 'construction').length; out.itemsAlive = S.items.alive.filter(Boolean).length;
      // The order rule at every step: a rail only on set ties, a spike only on a railed tie.
      { let t = 0, rl = 0, sp = 0, bad = null; const L = job0.len, n = job0.count.ties;
        for (const k of rec.order) {
          if (k === 't') t++;
          if (k === 'r') { const need = rl + 1 >= job0.count.rails ? n : Math.ceil(5 * SC * (rl + 1) * n / L - 0.5); if (t < need) bad = bad || `rail ${rl} before its ties`; rl++; }
          if (k === 's') { const tie = Math.floor(sp / 4), at = (tie + 0.5) * L / n; if (at > 5 * SC * rl + 1e-9 && rl < job0.count.rails) bad = bad || `spike ${sp} before its rail`; sp++; }
        }
        out.orderBad = bad; out.firsts = [rec.order.indexOf('t'), rec.order.indexOf('r'), rec.order.indexOf('s')]; }
      // A train is routed onto the new siding and arrives.
      const last = S.track.edges[S.track.edges.length - 1];
      let ev = R.simTick(S, [{ t: 'trainSendTo', tr: 0, e: last.id, s: Math.round(last.len / 2 * 1000) }]);
      out.routeSet = ev.some(e => e.t === 'routeSet'); out.arrived = -1;
      for (let i = 0; i < 6000 && out.routeSet; i++) { ev = R.simTick(S, []); if (ev.some(e => e.t === 'trainArrived')) { out.arrived = i; break; } }
      out.trainEdge = S.trains[0].front.e; out.lastEdge = last.id;
      // 2. Missing materials, one at a time.
      out.missing = {};
      for (const m of ['ties', 'rails', 'spikes', 'hardware']) {
        const S2 = fresh(), id = R.cargo.itemsAt(S2, { kind: 'STOCKPILE', jobId: 0 }).find(i => S2.items.waybill[i].commodity === m);
        R.cargo.itemMove(S2, id, { kind: 'GROUND', x: 0, z: 0 }, null);
        const rc = work(S2, 5000), stop = rc.stops[0];
        out.missing[m] = { stopped: !!stop, missing: stop && stop.missing, why: stop && stop.why, done: copy(S2.jobs.list[0].done), act: S2.player.act, use: S2.player.use, cons: R.cargo.itemCheckConservation(S2).length };
      }
      // 3. Carrying: a tie bundle put down beside the job is delivered (from the "ties missing" state).
      { const S3 = fresh(), id = R.cargo.itemsAt(S3, { kind: 'STOCKPILE', jobId: 0 }).find(i => S3.items.waybill[i].commodity === 'ties');
        R.cargo.itemMove(S3, id, { kind: 'GROUND', x: Math.round(S3.player.x * 100) + 300, z: Math.round(S3.player.z * 100) - 600 }, null);
        const q = J.jobPoint(S3.jobs.list[0], 8 * SC), side = S3.jobs.list[0].side;
        const evs = [];
        evs.push(...R.simTick(S3, [{ t: 'carryPick', id }]));
        for (let i = 0; i < 300 && !evs.some(e => e.t === 'carryPicked'); i++) evs.push(...R.simTick(S3, []));
        evs.push(...R.simTick(S3, [{ t: 'carryPut', x: Math.round((q.x - q.tz * side * 1.5 * SC) * 100), z: Math.round((q.z + q.tx * side * 1.5 * SC) * 100) }]));
        for (let i = 0; i < 300 && !evs.some(e => e.t === 'carryPut'); i++) evs.push(...R.simTick(S3, []));
        out.deliver = { picked: evs.some(e => e.t === 'carryPicked'), put: evs.some(e => e.t === 'carryPut'), delivered: evs.some(e => e.t === 'jobDelivered' && e.item === id),
          where: S3.items.where[id], site: S3.jobs.list[0].site[id] || null, needs: J.jobNeeds(S3, S3.jobs.list[0]) };
      }
      // 4. Any other command stops the work.
      { const S4 = fresh(); R.simTick(S4, [{ t: 'jobWork', id: 0 }]); for (let i = 0; i < 60; i++) R.simTick(S4, []);
        const before = copy(S4.jobs.list[0].done);
        R.simTick(S4, [{ t: 'walkTo', x: 0, z: 0 }]); for (let i = 0; i < 100; i++) R.simTick(S4, []);
        out.interrupt = { before, after: copy(S4.jobs.list[0].done), act: S4.player.act, use: S4.player.use }; }
      // 5. Cancel mid-job (in the spikes of stretch 1: ties, rails and spikes placed, bundles part used).
      { const S5 = fresh(), t0 = J.jobPieceTotals(S5);
        R.simTick(S5, [{ t: 'jobWork', id: 0 }]); for (let i = 0; i < 700; i++) R.simTick(S5, []);
        const mid = { done: copy(S5.jobs.list[0].done), loose: copy(S5.jobs.list[0].loose) };
        const ev5 = R.simTick(S5, [{ t: 'jobCancel', id: 0 }]);
        const t1 = J.jobPieceTotals(S5), parts = [];
        for (let i = 0; i < S5.items.next; i++) if (S5.items.alive[i] && S5.items.waybill[i].pieces !== undefined) parts.push(S5.items.waybill[i].commodity + ':' + S5.items.waybill[i].pieces);
        out.cancel = { mid, t0, t1, cons: R.cargo.itemCheckConservation(S5), jobs: S5.jobs.list.length, ev: ev5.find(e => e.t === 'jobCancelled'),
          stock: R.cargo.itemsAt(S5, { kind: 'STOCKPILE' }).length, act: S5.player.act, use: S5.player.use, parts,
          ground: R.cargo.itemsAt(S5, { kind: 'GROUND' }).length, edges: S5.track.edges.length - e0 };
        // Stake the same plan again: the returned items lie beside it and are on site again, and it can be built.
        const evs = R.simTick(S5, [{ t: 'stakeJob', ...job0.cmd }]);
        const j2 = S5.jobs.list[0];
        const rc = j2 ? work(S5, 5000, j2.id) : { done: false };
        out.restake = { staked: !!j2, done: rc.done, stops: rc.stops, cons: R.cargo.itemCheckConservation(S5), t: J.jobPieceTotals(S5) };
      }
      // 5b. A 6u (x SC) job (not a whole number of bundles) hands back the pieces it did not use as part-used bundles.
      { const S7 = R.newState(1866), T = S7.track;
        S7.overland.phase = 'off'; // this part runs past 06:00: keep the Overland's delivery out of the item list (B4)
        const N = T.nodes.filter(N => T.edges.filter(E => E.a === N.id || E.b === N.id).length === 1).sort((a, b) => a.x - b.x)[0];
        const wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'CONSTRUCTION', id: 0 }, contractId: null, due: null });
        for (const c of ['ties', 'ties', 'rails', 'spikes']) R.cargo.itemCreate(S7, wb(c), { kind: 'GROUND', x: Math.round((N.x - 3 * SC) * 100), z: Math.round((N.z - 1.5 * SC) * 100) }, null);
        R.simTick(S7, [{ t: 'stakeJob', from: 'node', n: N.id, tx: Math.round((N.x - 6 * SC) * 100), tz: Math.round(N.z * 100) }]);
        S7.player.x = N.x; S7.player.z = N.z - 2 * SC;
        const rc = work(S7, 3000, 0), parts = [];
        for (let i = 0; i < S7.items.next; i++) if (S7.items.alive[i]) parts.push(S7.items.waybill[i].commodity + ':' + (S7.items.waybill[i].pieces === undefined ? 'full' : S7.items.waybill[i].pieces));
        out.leftover = { done: rc.done, parts: parts.sort(), cons: R.cargo.itemCheckConservation(S7), ground: R.cargo.itemsAt(S7, { kind: 'GROUND' }).length };
        // Part-used bundles open like full ones: stake 4u more and use the 8 loose ties first.
        const N2 = S7.track.nodes[S7.track.nodes.length - 1];
        for (let i = 0; i < S7.items.next; i++) if (S7.items.alive[i]) R.cargo.itemMove(S7, i, { kind: 'GROUND', x: Math.round((N2.x - 1 - i * 0.3) * 100), z: Math.round((N2.z - 1.5) * 100) }, null);
        const ev7 = R.simTick(S7, [{ t: 'stakeJob', from: 'node', n: N2.id, tx: Math.round((N2.x - 3 * SC) * 100), tz: Math.round(N2.z * 100) }]);
        const j = S7.jobs.list[0];
        out.leftover.restaked = j ? { site: Object.keys(j.site).length, needs: J.jobNeeds(S7, j) } : ev7.find(e => /^job/.test(e.t));
      }
      // 6. Determinism: the same commands twice.
      const h = () => { const S6 = fresh(); R.simRun(S6, [{ tick: 0, cmd: { t: 'jobWork', id: 0 } }, { tick: 400, cmd: { t: 'walkTo', x: 1000, z: -1900 } }, { tick: 450, cmd: { t: 'jobWork', id: 0 } }], 2500); return R.stateHash(S6); };
      out.hashes = [h(), h()];
      out.tot0 = tot0;
      return out;
    });
    // D12's step times (30, 60 and 78 game s), quicker by SC since D15 so a job of the same shape takes the same real time.
    const D12 = (r.job.count.ties * 30 + r.job.count.rails * 60 + r.job.count.spikes * 78) / r.SC; // game seconds
    const total = r.ticks * 8, walk = r.walk * 8, workS = total - walk;
    if (Math.abs(r.job.len - 20 * r.SC) > 0.05) problems.push(`scenario: the siding is ${r.job.len.toFixed(3)}u, not ${20 * r.SC}u`);
    if (r.job.count.ties !== 40 || r.job.count.rails !== 4 || r.job.count.spikes !== 160) problems.push('scenario: wrong piece counts ' + JSON.stringify(r.job.count));
    if (JSON.stringify(r.job.need) !== JSON.stringify({ ties: 4, rails: 2, spikes: 2, hardware: 1 })) problems.push('scenario: wrong materials ' + JSON.stringify(r.job.need));
    if (r.job.site !== 9) problems.push(`scenario: ${r.job.site} items on site, expected 9`);
    if (!r.done) problems.push('build: one jobWork did not finish the siding: ' + JSON.stringify(r.stops));
    if (r.order !== 't10rs40t10rs40t10rs40t10rs40') problems.push('build: unexpected order of work ' + r.order);
    if (r.orderBad) problems.push('build: ' + r.orderBad);
    if (!(r.firsts[0] < r.firsts[1] && r.firsts[1] < r.firsts[2])) problems.push('build: the counts did not start ties, then rails, then spikes');
    if (Math.abs(workS - D12) > 0.1 * D12) problems.push(`build: work time ${workS} game s is not within 10% of the D12 figure ${D12}`);
    if (total > 1.1 * (D12 + walk)) problems.push(`build: total ${total} game s is over 10% more than D12 plus walking (${D12 + walk})`);
    if (r.jobsLeft !== 0) problems.push('build: the finished job was not removed');
    if (r.edgesAdded < 4) problems.push(`build: only ${r.edgesAdded} track edges were added`);
    if (r.valid.length) problems.push('build: the joined track fails the validator: ' + r.valid.join('; '));
    if (r.cons.length) problems.push('build: item conservation: ' + r.cons.join('; '));
    if (r.consumed !== 9 || r.itemsAlive !== 0) problems.push(`build: ${r.consumed} items used and ${r.itemsAlive} left, expected 9 used and none left`);
    if (!r.routeSet) problems.push('train: no route onto the new siding');
    else if (r.arrived < 0 || r.trainEdge !== r.lastEdge) problems.push(`train: did not arrive on the new siding (edge ${r.trainEdge}, siding ${r.lastEdge})`);
    const msg = { ties: /Out of ties/, rails: /Out of rails/, spikes: /Out of spikes/, hardware: /hardware crate/ };
    for (const m of Object.keys(msg)) {
      const x = r.missing[m];
      if (!x.stopped || x.missing !== m || !msg[m].test(x.why || '')) problems.push(`missing ${m}: work did not stop with the right message (${JSON.stringify(x)})`);
      if (x.act || x.use) problems.push(`missing ${m}: the player kept working`);
      if (x.cons) problems.push(`missing ${m}: item conservation failed`);
    }
    if (r.missing.ties.done.ties !== 30) problems.push(`missing ties: stopped after ${r.missing.ties.done.ties} ties, expected 30 (3 bundles)`);
    if (r.missing.hardware.done.rails !== 0 || r.missing.hardware.done.ties !== 10) problems.push('missing hardware: should stop at the first rail pair, after 10 ties: ' + JSON.stringify(r.missing.hardware.done));
    if (r.missing.spikes.done.spikes !== 80) problems.push(`missing spikes: stopped after ${r.missing.spikes.done.spikes} spikes, expected 80`);
    if (r.missing.rails.done.rails !== 2) problems.push(`missing rails: stopped after ${r.missing.rails.done.rails} rail pairs, expected 2`);
    const d = r.deliver;
    if (!d.picked || !d.put || !d.delivered || !d.where || d.where.kind !== 'STOCKPILE' || !d.site) problems.push('carrying: a tie bundle put down beside the job was not delivered: ' + JSON.stringify(d));
    if (d.needs && d.needs.ties !== 0) problems.push('carrying: the job still asks for ties after the delivery');
    const it = r.interrupt;
    if (it.act || it.use || JSON.stringify(it.before) !== JSON.stringify(it.after)) problems.push('interrupt: a walk did not stop the work ' + JSON.stringify(it));
    const c = r.cancel;
    if (!(c.mid.done.ties > 10 && c.mid.done.rails >= 1 && c.mid.done.spikes > 0)) problems.push('cancel: the mid-job point is not mid-job ' + JSON.stringify(c.mid));
    if (JSON.stringify(c.t0) !== JSON.stringify(c.t1)) problems.push(`cancel: material lost or made: before ${JSON.stringify(c.t0)}, after ${JSON.stringify(c.t1)}`);
    if (c.cons.length) problems.push('cancel: item conservation: ' + c.cons.join('; '));
    if (c.jobs !== 0 || !c.ev || c.stock !== 0 || c.act || c.use || c.edges !== 0) problems.push('cancel: the job, its stockpile or the work was not cleared ' + JSON.stringify({ jobs: c.jobs, stock: c.stock, act: c.act, edges: c.edges }));
    if (!r.restake.staked || !r.restake.done || r.restake.cons.length) problems.push('cancel: the same plan staked again with the returned materials did not build ' + JSON.stringify(r.restake));
    const lo = r.leftover;
    if (!lo.done || lo.cons.length || JSON.stringify(lo.parts) !== JSON.stringify(['spikes:32', 'ties:8'])) problems.push('leftover: a 6u job should hand back 8 ties and 32 spikes as part-used items: ' + JSON.stringify(lo));
    if (!lo.restaked || lo.restaked.site !== 2 || lo.restaked.needs.ties !== 0 || lo.restaked.needs.spikes !== 0) problems.push('leftover: part-used items beside a new job do not count for it: ' + JSON.stringify(lo.restaked));
    if (r.hashes[0] !== r.hashes[1]) problems.push(`determinism: two runs gave ${r.hashes[0]} and ${r.hashes[1]}`);
    if (errors.length) problems.push('rules: console errors: ' + errors.join(' | '));
    console.log(`  20u siding: ${r.ticks} ticks = ${(total / 60).toFixed(1)} game min (${(r.ticks / 10 / 60).toFixed(1)} real min at 1x); work ${(workS / 60).toFixed(1)} min against D12 ${(D12 / 60).toFixed(1)} min, walking ${(walk / 60).toFixed(1)} min; order ${r.order}`);
    console.log(`  train arrived on the new siding after ${r.arrived} ticks; cancel mid-job (${JSON.stringify(c.mid.done)}) gave back ${c.ev && c.ev.items} items, part-used: ${c.parts.join(', ') || 'none'}; a 6u job hands back ${r.leftover.parts.join(', ')}`);
  } finally { await browser.close(); }
}

// Save and reload mid-job: export/import and a real page reload, then the same ticks give the same hash.
async function checkSaveReload(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  try {
    const a = await page.evaluate(async () => {
      const R = window.__railhead, S = R.jobs.jobDebugScenario(R.newState(1866));
      R.simTick(S, [{ t: 'jobWork', id: 0 }]);
      for (let i = 0; i < 523; i++) R.simTick(S, []); // mid-step, part way along
      const json = JSON.stringify({ state: S, ui: { yawIdx: 0, zoom: 1, speed: 1 } });
      const ref = JSON.parse(JSON.stringify(S));
      for (let i = 0; i < 400; i++) R.simTick(ref, []);
      const h0 = R.importSave(json);
      R.step(400);
      const viaImport = R.hash();
      R.importSave(json);
      const ok = await R.saveGame();
      return { h0, act: S.player.act, done: S.jobs.list[0].done, ref: R.stateHash(ref), viaImport, saved: ok !== false };
    });
    if (!a.act || a.act.k !== 'job') problems.push('save: the saved state is not mid-step');
    if (a.viaImport !== a.ref) problems.push(`save: export/import mid-job did not resume exactly (${a.viaImport} vs ${a.ref})`);
    await page.reload(); await waitReady(page);
    const b = await page.evaluate(() => { const R = window.__railhead, h = R.hash(); R.step(400); return { h, after: R.hash(), act: R.state.player.act }; });
    if (b.h !== a.h0) problems.push(`save: the reloaded page has hash ${b.h}, saved ${a.h0}`);
    if (b.after !== a.ref) problems.push(`save: after a real reload the same ticks gave ${b.after}, expected ${a.ref}`);
    if (errors.length) problems.push('save: console errors: ' + errors.join(' | '));
    console.log(`  saved mid-job at ${JSON.stringify(a.done)}; reload resumes with the same hash ${b.after}`);
  } finally { await browser.close(); }
}

async function checkScreenshot(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1&scenario=handbuild&world=yard' });
  try {
    const r = await page.evaluate(async () => {
      const R = window.__railhead, out = {};
      out.jobs = R.state.jobs.list.length;
      R.send({ t: 'jobWork', id: 0 }); R.step(700);
      const P = R.state.player; R.camera.zoom = 1.3; R.camera.ox = 10 * R.CFG.SCALE - P.x; R.camera.oz = -16.5 * R.CFG.SCALE - P.z;
      await new Promise(r => setTimeout(r, 400));
      out.done = R.state.jobs.list[0].done; out.draw = R.drawCalls;
      return out;
    });
    if (r.jobs !== 1) problems.push('screenshot: the handbuild scenario has no job');
    await page.screenshot({ path: screenshotPath('handbuild-portrait') });
    if (errors.length) problems.push('screenshot: console errors: ' + errors.join(' | '));
    console.log(`  handbuild scenario part-built ${JSON.stringify(r.done)}: ${r.draw} draw calls`);
  } finally { await browser.close(); }
}

if (require.main === module) {
  module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
}
