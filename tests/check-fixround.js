// Check: the three gaps fixed in the M1 fix round (D15, builder G).
// - Stockpile: a material put down at a construction job (its stockpile) is picked back up like any loose item
//   (carryPick walks to where it lies, the job forgets it, the job's needs go up, conservation holds); put down
//   again away from the job it stays on the ground, and beside the job it is on site again. A tap on it finds it
//   (itemHitAt). Opened bundles (placed ties, rails, spikes) are not items and cannot be picked up.
// - Switch inside a stopping track (the M0 test yard, whose hub stopping track has room for one; in the real start
//   the platform and the parallel tracks leave no room for a switch's diverging leg there): a switch built inside
//   the hub's stopping track splits its edge; the station's span then crosses the joints (same length as before,
//   pieces in a row, never onto the diverging leg), and a timetabled run from the hub (No. 1 standing over the
//   joints) to Willow Ford and back is not cancelled: it arrives at both and finishes. Willow Ford gets a switch too
//   when one can be built there.
// - Wrong bay: an item sorted into a bay whose tag does not match it gets a warning mark above its stack; a matching
//   item or an Any bay gets none; changing the bay's tag clears the mark; the mark costs no extra draw call.
// Screenshot: fixround-wrongbay-portrait.png.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkFixround() {
  const problems = [];
  await checkStockpile(problems);
  await checkSwitchInStation(problems);
  await checkWrongBay(problems);
  return problems;
};

async function checkStockpile(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, J = R.jobs, C = R.cargo, out = {};
      const S = J.jobDebugScenario(R.newState(1866)), job = S.jobs.list[0];
      const stock = C.itemsAt(S, { kind: 'STOCKPILE', jobId: 0 });
      const id = stock.find(i => S.items.waybill[i].commodity === 'ties');
      const site = job.site[id].slice(), needs0 = J.jobNeeds(S, job);
      const evs = [];
      evs.push(...R.simTick(S, [{ t: 'carryPick', id }]));
      for (let i = 0; i < 300 && !evs.some(e => e.t === 'carryPicked' || e.t === 'carryRefused'); i++) evs.push(...R.simTick(S, []));
      out.pick = { picked: evs.some(e => e.t === 'carryPicked' && e.id === id), refused: (evs.find(e => e.t === 'carryRefused') || {}).why || null,
        taken: evs.some(e => e.t === 'jobTaken' && e.item === id), where: S.items.where[id], siteLeft: job.site[id] || null,
        stock: C.itemsAt(S, { kind: 'STOCKPILE', jobId: 0 }).length, stock0: stock.length, needs0, needs: J.jobNeeds(S, job),
        cons: C.itemCheckConservation(S), dist: Math.hypot(S.player.x - site[0] / 100, S.player.z - site[1] / 100) };
      // Put it down 8u from the job's start, away from every stake: it stays on the ground.
      const far = (() => { for (let d = 6; d < 40; d += 2) for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) {
        const x = S.player.x + Math.cos(a * Math.PI / 4) * d, z = S.player.z + Math.sin(a * Math.PI / 4) * d;
        if (job.stakes.every(([sx, sz]) => Math.hypot(sx / 100 - x, sz / 100 - z) > 4)) return { x, z }; } return null; })();
      const ev2 = [];
      ev2.push(...R.simTick(S, [{ t: 'carryPut', x: Math.round(far.x * 100), z: Math.round(far.z * 100) }]));
      for (let i = 0; i < 400 && !ev2.some(e => e.t === 'carryPut' || e.t === 'carryRefused'); i++) ev2.push(...R.simTick(S, []));
      out.putFar = { put: ev2.some(e => e.t === 'carryPut'), where: S.items.where[id], refused: (ev2.find(e => e.t === 'carryRefused') || {}).why || null };
      // Pick it up again and put it back beside the job: on site again.
      const ev3 = [];
      ev3.push(...R.simTick(S, [{ t: 'carryPick', id }]));
      for (let i = 0; i < 400 && !ev3.some(e => e.t === 'carryPicked'); i++) ev3.push(...R.simTick(S, []));
      ev3.push(...R.simTick(S, [{ t: 'carryPut', x: site[0], z: site[1] }]));
      for (let i = 0; i < 400 && !ev3.some(e => e.t === 'carryPut'); i++) ev3.push(...R.simTick(S, []));
      out.back = { delivered: ev3.some(e => e.t === 'jobDelivered' && e.item === id), where: S.items.where[id], needs: J.jobNeeds(S, job), cons: C.itemCheckConservation(S) };
      // Work a little (a tie bundle is opened), then try to pick up the opened bundle: it is gone.
      R.simTick(S, [{ t: 'jobWork', id: 0 }]);
      const ev4 = [];
      for (let i = 0; i < 200; i++) ev4.push(...R.simTick(S, []));
      const opened = ev4.find(e => e.t === 'jobOpened');
      const ev5 = R.simTick(S, [{ t: 'carryPick', id: opened ? opened.item : -1 }]);
      out.opened = { opened: !!opened, refused: (ev5.find(e => e.t === 'carryRefused') || {}).why || null, ties: S.jobs.list[0].done.ties };
      // The tap: the live page's stockpile item is found by a tap on it.
      const P = J.jobDebugScenario(R.newState(1866));
      window.__railhead.importSave(JSON.stringify({ state: P, ui: { yawIdx: 0, zoom: 2, speed: 0 } }));
      return out;
    });
    const p = r.pick;
    if (!p.picked) problems.push('stockpile: a tie bundle on site could not be picked up: ' + p.refused);
    if (!p.taken) problems.push('stockpile: no jobTaken event for the item picked up');
    if (!p.where || p.where.kind !== 'CARRIED') problems.push('stockpile: the item picked up is not carried: ' + JSON.stringify(p.where));
    if (p.siteLeft) problems.push('stockpile: the job still remembers where the item picked up was');
    if (p.stock !== p.stock0 - 1) problems.push(`stockpile: ${p.stock} items on site after the pick-up, expected ${p.stock0 - 1}`);
    if (p.needs.ties !== p.needs0.ties + 1) problems.push(`stockpile: the job should need one more tie bundle (${JSON.stringify(p.needs0)} -> ${JSON.stringify(p.needs)})`);
    if (p.cons.length) problems.push('stockpile: conservation after the pick-up: ' + p.cons.join('; '));
    if (p.dist > 1.6) problems.push(`stockpile: the player picked it up from ${p.dist.toFixed(2)}u away`);
    if (!r.putFar.put || !r.putFar.where || r.putFar.where.kind !== 'GROUND') problems.push('stockpile: put down away from the job it should lie on the ground: ' + JSON.stringify(r.putFar));
    if (!r.back.delivered || !r.back.where || r.back.where.kind !== 'STOCKPILE') problems.push('stockpile: put back beside the job it should be on site again: ' + JSON.stringify(r.back.where));
    if (r.back.needs.ties !== p.needs0.ties) problems.push('stockpile: put back, the job\'s needs should be as before');
    if (r.back.cons.length) problems.push('stockpile: conservation after putting it back: ' + r.back.cons.join('; '));
    if (!r.opened.opened || !r.opened.refused || r.opened.ties < 1) problems.push('stockpile: an opened bundle should be gone (placed ties stay put): ' + JSON.stringify(r.opened));
    // The tap, in the live page.
    await page.waitForTimeout(300);
    const tap = await page.evaluate(async () => {
      const R = window.__railhead, S = R.state, id = R.cargo.itemsAt(S, { kind: 'STOCKPILE', jobId: 0 })[0];
      const at = S.jobs.list[0].site[id];
      R.camera.zoom = 2; R.camera.ox = at[0] / 100 - S.player.x; R.camera.oz = at[1] / 100 - S.player.z; R.camera.fx = S.player.x; R.camera.fz = S.player.z;
      R.cargo.redraw();
      await new Promise(r => setTimeout(r, 500));
      const pose = R.cargo.view.poses[id], p = R.toScreen(pose.x, pose.z, (pose.y + pose.top) / 2), hit = R.carry.itemHitAt(p.x, p.y);
      return { id, hit: hit && hit.id };
    });
    if (tap.hit !== tap.id) problems.push(`stockpile: a tap on the on-site item ${tap.id} found ${tap.hit}`);
    if (errors.length) problems.push('stockpile: console errors: ' + errors.join(' | '));
    console.log(`  stockpile: picked up from ${p.dist.toFixed(2)}u, needs ties ${p.needs0.ties} -> ${p.needs.ties} -> ${r.back.needs.ties}; opened bundle: "${r.opened.refused}"`);
  } finally { await browser.close(); }
}

async function checkSwitchInStation(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, TT = R.tt, out = { st: {} };
      const S = R.newState(1866), T = S.track, tr = S.trains[0];
      S.overland.phase = 'off';
      // Park No. 1 out of the way (the middle of the longest plain edge away from both stations) while building.
      const before = {};
      for (const id of ['hub', 'willow']) { const k = TT.ttStation(S, id).trk; before[id] = k && { len: k.len, segs: k.segs.length }; }
      const used = new Set(['hub', 'willow'].map(id => TT.ttStation(S, id).trk.e));
      const park = T.edges.filter(E => E.k === 'S' && !used.has(E.id) && !E.fixed).sort((a, b) => b.len - a.len)[0];
      tr.front = { e: park.id, s: park.len / 2 + R.trainLength(tr) / 2, d: 1 };
      // A switch inside each station's stopping track: the first plan that builds (try along the span, both ways, both sides).
      for (const id of ['hub', 'willow']) {
        const k = TT.ttStation(S, id).trk, E = T.edges[k.e], A = T.nodes[E.a], B = T.nodes[E.b];
        const ux = (B.x - A.x) / E.len, uz = (B.z - A.z) / E.len;
        let built = null;
        for (const frac of [0.3, 0.45, 0.6, 0.2, 0.7]) for (const fwd of [1, -1]) for (const side of [1, -1]) for (const out2 of [8, 12, 5]) {
          if (built) break;
          const s = k.s0 + (k.s1 - k.s0) * frac, x0 = A.x + ux * s, z0 = A.z + uz * s;
          for (const sgn of [1, -1]) {
            if (built) break;
            const c = { t: 'buildTrack', from: 'switch', e: E.id, s: Math.round(s * 1000), fwd, side, tx: Math.round((x0 + ux * fwd * 22 - uz * sgn * out2) * 100), tz: Math.round((z0 + uz * fwd * 22 + ux * sgn * out2) * 100) };
            const n0 = T.switches.length, ev = R.simTick(S, [c]);
            if (S.track.switches.length > n0 && ev.some(e => e.t === 'trackBuilt')) built = { c, sw: S.track.switches.length - 1 };
            else (out.why = out.why || []).push(JSON.stringify(ev.filter(e => /Refused|refused/.test(e.t))).slice(0, 160));
          }
        }
        const k2 = TT.ttStation(S, id).trk, W = built && S.track.switches[built.sw], N = W && S.track.nodes[W.node];
        out.st[id] = { built: !!built, before: before[id], after: k2 && { len: k2.len, segs: k2.segs.length, edges: k2.segs.map(g => g[0]) },
          swAt: N && { x: N.x, z: N.z }, trunkIn: W && k2 ? k2.segs.some(g => g[0] === W.trunk) : null,
          divIn: W && k2 ? k2.segs.some(g => g[0] === W.reverse) : null, valid: R.trackValidate(S.track) };
      }
      // No. 1 back at the hub's platform (the stopping track's west-bound end, like the timetable scenario), then a
      // short service: hub 08:00 -> Willow Ford -> hub, no stop actions.
      const hub = TT.ttStation(S, 'hub');
      if (hub.trk) {
        tr.front = { ...hub.trk.ends[1] }; tr.mode = 'idle'; tr.v = 0;
        const H = 3600;
        S.tt.services = [{ id: 0, name: 'Test', cls: 3, train: 0, days: 127, last: -1, stops: [
          { st: 'hub', arr: null, dep: 8 * H, acts: [] }, { st: 'willow', arr: 9 * H + 1800, dep: 10 * H, acts: [] }, { st: 'hub', arr: 12 * H, dep: null, acts: [] }] }];
        for (const L of tr.consist) if (L.k === 'loco') { L.fuel = 1e9; L.water = 1e9; }
        const log = [];
        for (let i = 0; i < 6000; i++) {
          const ev = R.simTick(S, []);
          for (const e of ev) if (/^tt(Started|Arrived|Departed|Done|Cancelled)$/.test(e.t)) log.push(e.t + (e.st ? ':' + e.st : '') + (e.why ? ':' + e.why : ''));
          if (ev.some(e => e.t === 'ttDone' || e.t === 'ttCancelled')) break;
        }
        out.log = log; out.status = tr.status;
      }
      return out;
    });
    for (const id of ['hub', 'willow']) {
      const s = r.st[id];
      if (!s.built && id !== 'hub') continue;   // the yard's Willow Ford has no room for a switch inside its stopping track
      if (!s.built) { problems.push(`switch in station: no switch could be built inside ${id}'s stopping track: ${[...new Set(r.why || [])].join(' | ')}`); continue; }
      if (s.valid && s.valid.length) problems.push(`switch in station: ${id}: the track fails validation: ${JSON.stringify(s.valid).slice(0, 200)}`);
      if (!s.after) { problems.push(`switch in station: ${id}'s stopping track is not found after the switch`); continue; }
      if (s.after.segs < 2) problems.push(`switch in station: ${id}'s span should cross the new joints (${s.after.segs} piece)`);
      if (Math.abs(s.after.len - s.before.len) > 0.45) problems.push(`switch in station: ${id}'s span is ${s.after.len.toFixed(2)}u long, was ${s.before.len.toFixed(2)}u`);
      if (s.divIn) problems.push(`switch in station: ${id}'s span runs onto the switch's diverging leg`);
    }
    const log = r.log || [];
    if (log.some(l => /Cancelled/.test(l))) problems.push('switch in station: the timetabled run was cancelled: ' + log.join(', '));
    if (!log.includes('ttArrived:willow') || !log.includes('ttDone') || log.filter(l => l === 'ttArrived:hub').length < 2) problems.push('switch in station: the run did not arrive at Willow Ford and back at the hub: ' + log.join(', ') + ' (' + r.status + ')');
    if (errors.length) problems.push('switch in station: console errors: ' + errors.join(' | '));
    console.log(`  switch in station: hub span ${r.st.hub.before && r.st.hub.before.len.toFixed(2)}u in ${r.st.hub.after && r.st.hub.after.segs} pieces, Willow Ford ${r.st.willow.before && r.st.willow.before.len.toFixed(2)}u in ${r.st.willow.after && r.st.willow.after.segs}; run: ${log.join(', ')}`);
  } finally { await browser.close(); }
}

async function checkWrongBay(problems) {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    const wait = () => page.evaluate(() => new Promise(r => setTimeout(r, 600)));
    const setup = await page.evaluate(() => {
      const R = window.__railhead, S = R.state, C = R.cargo, B = C.BLD_BAYS.freightshed;
      for (const n of ['blocks', 'locks', 'routes', 'path']) if (window.rh) window.rh.overlay(n, false);
      const b0 = B.bays[0];
      S.player.x = b0.x; S.player.z = b0.z + 3; R.camera.zoom = 2.5; R.camera.ox = 0; R.camera.oz = -3; R.camera.fx = S.player.x; R.camera.fz = S.player.z;
      const wb = town => ({ commodity: 'flour', originTownId: 'OUTSIDE', destTownId: town, consignee: { kind: 'BUSINESS', id: town }, contractId: null, due: null });
      // Bay 0 is Willow Ford's: a Willow Ford sack is right there.
      C.itemCreate(S, wb(1), { kind: 'BAY', buildingId: 'freightshed', bay: 0 }, null);
      C.redraw();
      return { tags: S.bayTags.freightshed.slice() };
    });
    await wait();
    const a = await page.evaluate(() => { const R = window.__railhead; return { calls: R.drawCalls, warn: R.cargo.view.warn.length, tags: R.cargo.view.tag.count, drawn: R.cargo.view.count }; });
    // A Hub town sack in Willow Ford's bay: wrong bay.
    const wrong = await page.evaluate(() => {
      const R = window.__railhead, S = R.state, C = R.cargo;
      const r = C.itemCreate(S, { commodity: 'flour', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null }, { kind: 'BAY', buildingId: 'freightshed', bay: 0 }, null);
      C.redraw(); return r.id;
    });
    await wait();
    const b = await page.evaluate(() => { const R = window.__railhead; return { calls: R.drawCalls, warn: R.cargo.view.warn.map(w => ({ ids: w.ids, y: w.y })), tags: R.cargo.view.tag.count, drawn: R.cargo.view.count }; });
    await page.screenshot({ path: screenshotPath('fixround-wrongbay-portrait') });
    // Make bay 0 an Any bay by command: the mark goes.
    await page.evaluate(() => { const R = window.__railhead; R.send({ t: 'setBayTag', b: 'freightshed', bay: 0, tag: 'ANY' }); R.step(1); });
    await wait();
    const c = await page.evaluate(() => { const R = window.__railhead; return { warn: R.cargo.view.warn.length, tags: R.cargo.view.tag.count }; });
    if (a.warn !== 0) problems.push(`wrong bay: ${a.warn} warning marks with only a matching item in the bay`);
    if (b.warn.length !== 1 || JSON.stringify(b.warn[0].ids) !== JSON.stringify([wrong])) problems.push('wrong bay: expected one mark for item ' + wrong + ', got ' + JSON.stringify(b.warn));
    if (b.tags !== a.tags + 2) problems.push(`wrong bay: the tag mesh should hold one more tag and one mark (${a.tags} -> ${b.tags})`);
    if (b.drawn !== a.drawn + 1) problems.push(`wrong bay: ${b.drawn} items counted as drawn, expected ${a.drawn + 1}`);
    if (b.calls > a.calls + 1) problems.push(`wrong bay: draw calls went from ${a.calls} to ${b.calls} (at most 1 more allowed)`);
    if (c.warn !== 0) problems.push(`wrong bay: ${c.warn} marks left after the bay was made an Any bay`);
    if (errors.length) problems.push('wrong bay: console errors: ' + errors.join(' | '));
    console.log(`  wrong bay: marks ${a.warn} -> ${b.warn.length} -> ${c.warn}; draw calls ${a.calls} -> ${b.calls}; bay tags ${JSON.stringify(setup.tags)}`);
  } finally { await browser.close(); }
}
