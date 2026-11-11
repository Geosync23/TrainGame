// Check: the town's people (D27, builder W; plans/d27-tech.md section 5, section "the town (D27)" in index.html).
// - The town graph (TOWN_GRAPH): every node joined to every other; every edge on open ground of the player's walk
//   grid (no building, prop or track in the way) and off the track, the ramps, the cart crossing and the footbridges;
//   townPath gives a path of real edges.
// - The people (TF_AGENTS): 14 named townsfolk and the rest, each with a sprite in the atlas for idle, walk, talk and
//   benchSit; homes and work places that exist.
// - A week played (a switchman sets the switches, each ready train is sent off, every morning started, every summary
//   closed): at 10:00 on a weekday everyone with work is inside it (unless meeting a train); at 10:30 on Sunday
//   everyone but the cowhands is in church; a meeter stands on platform 1 when his train stands (and tfMeet is sent);
//   no one ever on the track, a ramp, the cart crossing or a footbridge; chats, bench sitting and going in and out
//   all happen; the cowhands come in for the evening.
// - The same week played twice gives the same townsfolk every day (hash of S.tf); a save made mid-day and loaded goes
//   on exactly as the game it came from; a save without S.tf re-plans and settles everyone; tfCheckSaveShape refuses a
//   damaged store.
// - A delivery handed in at a shop brings its keeper out to the door (talk) for a few minutes; tfAt follows him.
// - A walker with the player just ahead waits at most 6 game seconds, then walks on.
// - The cost: tfTick under 0.05 ms per tick on average over a busy day (all agents).
// - A screenshot of the street with the townsfolk drawn (test-output/d27-townsfolk-portrait.png: the renderer's
//   traveller drawing is borrowed for it until R draws tfDrawList itself).
const { openGame, screenshotPath } = require('./browser');

module.exports = async function CheckTownsfolk() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    // ---- The graph and the people ----
    const g = await page.evaluate(() => {
      const R = window.__railhead, S = R.state, T = S.track, TF = R.tf, G = TF.TOWN_GRAPH, Gw = walkGrid(T), P = R.d27.PROTO, bad = [];
      const onBad = (x, z) => z > P.P1.z1 - 2 || P.RAMPS.some(q => x > q.x0 - 1 && x < q.x1 + 1 && z > q.z0 - 1 && z < q.z1 + 1)
        || Math.abs(x - P.XING_CART.x) < P.XING_CART.w && z > P.XING_CART.z0 - 1 && z < P.XING_CART.z1 + 1 || R.d27.walkLevelAt(T, x, z) > 0;
      for (const [a, b, l] of G.edges) {
        const A = G.nodes[a], B = G.nodes[b], n = Math.ceil(l / 0.2);
        for (let k = 0; k <= n; k++) {
          const x = A.x + (B.x - A.x) * k / n, z = A.z + (B.z - A.z) * k / n;
          if (!(Gw.cost[walkCell(x, z)] > 0)) { bad.push(`edge ${A.id}-${B.id} is blocked at (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
          if (onBad(x, z)) { bad.push(`edge ${A.id}-${B.id} is on the track, a ramp, the crossing or a footbridge at (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
        }
      }
      for (let i = 0; i < G.n; i++) for (let j = 0; j < G.n; j++) if (G.dist[i * G.n + j] === Infinity) { bad.push(`${G.nodes[j].id} cannot be reached from ${G.nodes[i].id}`); i = G.n; break; }
      const path = TF.townPath('door_church', 'wait0');
      if (!path || path[0] !== 'door_church' || path[path.length - 1] !== 'wait0') bad.push('townPath from the church to platform 1: ' + JSON.stringify(path));
      else for (let k = 1; k < path.length; k++) { const a = G.idx[path[k - 1]], b = G.idx[path[k]]; if (!G.edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) bad.push(`townPath steps ${path[k - 1]} > ${path[k]} with no edge`); }
      // the people: sprites, homes, work
      const blds = new Set(buildingFootprints().map(b => b.id)), pk = R.pix.pixPersonKey;
      for (const a of TF.TF_AGENTS) {
        for (const b of [a.home, a.work]) if (b && b !== 'edge' && !blds.has(b)) bad.push(`${a.name}: no building ${b}`);
        for (const b of [a.home, a.work]) if (b && TF.tfDoorOf(b) === undefined) bad.push(`${a.name}: no door for ${b}`);
        if (!TF.TF_ROUTINES[a.kind]) bad.push(`${a.name}: no routine ${a.kind}`);
        for (const act of ['idle', 'walk', 'talk', 'benchSit']) { const k = pk(a.who, act, 'se', 0); if (!k || k.indexOf(`/${act}/`) < 0) bad.push(`${a.name}: no sprite ppl/${a.who}/${act}`); }
      }
      const named = TF.TF_AGENTS.filter(a => !/pupil|cowhand|laundress/.test(a.kind)).length;   // the 14 of plans/proto-sprites.md (the feed keeper's name is the builder's)
      return { bad, n: G.n, e: G.edges.length, agents: TF.TF_AGENTS.length, named, town: R.d27.d27On(T, 'town') };
    });
    g.bad.forEach(P);
    if (!g.town) P('D27 town is not switched on (WORLDS.proto.d27.town)');
    if (g.named < 14) P(`only ${g.named} named townsfolk (want 14)`);
    console.log(`  town graph: ${g.n} nodes, ${g.e} edges, all on open ground and joined; ${g.agents} townsfolk (${g.named} named)`);

    // ---- A week played twice (same hashes), the routines' checks ----
    const week = await page.evaluate(() => {
      const R = window.__railhead, TF = R.tf, P = R.d27.PROTO, out = { bad: [], days: [], ev: {}, acts: {}, meets: 0, meetsOk: 0, cow: 0, maxOut: 0 };
      const play = (check) => {
        const S = R.newState(1866, 'proto'), idx = id => TF.TF_AGENTS.findIndex(a => a.id === id);
        const meetRuns = { nell: ['p1', 'p3'], tom: ['p2'], ezra: ['f3'] }, seenStand = {};
        let sunday = false, weekday = false, saved = null;
        // The trains are scripted (the railroad's own trains need a player to punch and unload before they leave, which
        // is P's and F's to test): each run stands from its time plus a lateness of 0 to 40 minutes (fixed per day and
        // run) for 20 minutes or until its time to leave, then is gone. Only S.rr.runs is read by the townsfolk.
        S.rr.on = false;
        const sched = R.proto.PROTO_SCHEDULE, D0 = R.CFG.DAY_START_S;
        for (let t = 0; t < 7 * 10800 && TF.tfDay(S) < 7; t++) {
          const cmds = [], day = Math.floor((S.time + D0) / 86400);
          if (S.pd.ph === 'morning') cmds.push({ t: 'pdStart' });
          if (S.pd.ph === 'summary' && S.pd.sum) cmds.push({ t: 'pdNextDay' });
          if (!S.rr.runs.some(r => r.day === day)) S.rr.runs = sched.map((sv, k) => ({ id: day * 20 + k, svc: sv.id, day, ph: 'due', slot: null, arr: day * 86400 + sv.arr - D0, dep: day * 86400 + sv.dep - D0, tArr: null, late: ((day * 7 + k * 3) % 5) * 600 }));
          for (const r of S.rr.runs) {
            if (r.ph === 'due' && S.time >= r.arr + r.late) { r.ph = 'stand'; r.tArr = S.time; }
            else if (r.ph === 'stand' && S.time >= Math.max(r.dep, r.tArr + 1200)) r.ph = 'gone';
          }
          const ev = R.simTick(S, cmds);
          if (!check) continue;
          for (const e of ev) if (e.t === 'tfMeet' || e.t === 'rrArrived') out.ev[e.t === 'tfMeet' ? e.id : e.t] = (out.ev[e.t === 'tfMeet' ? e.id : e.t] || 0) + 1;
          const st = S.tf, now = TF.tfNow(S), wd = TF.tfDay(S) % 7;
          if (!st || st.day !== TF.tfDay(S)) { out.bad.push(`day ${TF.tfDay(S)} not planned at ${now}`); break; }
          const plans = TF.tfPlans(S.seed, st.day);
          // where everyone is: never on the track, a ramp, the crossing or a footbridge; what they do
          if (t % 4 === 0) {
            let outdoors = 0;
            st.ag.forEach((a, i) => {
              const p = TF.tfPose(S, i, plans);
              if (!p.hidden) outdoors++;
              out.acts[p.act] = (out.acts[p.act] || 0) + 1;
              if (TF.TF_AGENTS[i].kind === 'cowhand' && !p.hidden) out.cow++;
              if (p.z > P.P1.z1 - 2 || P.RAMPS.some(q => p.x > q.x0 && p.x < q.x1 && p.z > q.z0 && p.z < q.z1) || Math.abs(p.x - P.XING_CART.x) < 3 && p.z > P.XING_CART.z0 && p.z < P.XING_CART.z1 || R.d27.walkLevelAt(S.track, p.x, p.z) > 0)
                out.bad.push(`${TF.TF_AGENTS[i].id} at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) on day ${st.day} at ${(now / 3600).toFixed(2)}h`);
            });
            for (const q of TF.tfDrawList(S)) out.acts['draw:' + q.act] = (out.acts['draw:' + q.act] || 0) + 1;
            out.maxOut = Math.max(out.maxOut, outdoors);
          }
          // 10:00 on a weekday: everyone with work in it (unless meeting a train or walking back from one)
          if (wd < 5 && now >= 36000 && now < 36008) {
            weekday = true;
            st.ag.forEach((a, i) => { const A = TF.TF_AGENTS[i], q = plans[i][a.e]; if (A.work && q.act !== 'meet' && !(a.go >= 0 && plans[i].slice(0, a.e).some(o => o.act === 'meet' && o.at > now - 7200)) && !(a.go < 0 && a.in === A.work)) out.bad.push(`day ${st.day} 10:00: ${A.id} is not at work (${a.in || 'outdoors'}, errand ${q.act} ${q.in || ''})`); });
          }
          // 10:30 on Sunday: everyone but the cowhands in church
          if (wd === 6 && now >= 37800 && now < 37808) {
            sunday = true;
            st.ag.forEach((a, i) => { const A = TF.TF_AGENTS[i]; if (A.kind !== 'cowhand' && !(a.go < 0 && a.in === 'church')) out.bad.push(`Sunday 10:30: ${A.id} is not in church (${a.in || 'outdoors'})`); });
          }
          // meeters: on platform 1 while their train stands (its first 5 minutes)
          for (const [id, svcs] of Object.entries(meetRuns)) for (const svc of svcs) {
            const run = S.rr.runs.find(r => r.svc === svc && r.day === st.day), i = idx(id), a = st.ag[i], A = TF.TF_AGENTS[i];
            if (!run || run.ph !== 'stand' || S.time > run.tArr + 240) continue;
            const meets = (A.meets || []).some(([v, d]) => v === svc && (d === 'all' || wd < 6));
            if (!meets) continue;
            const key = st.day + svc;
            if (seenStand[key]) continue;
            seenStand[key] = 1; out.meets++;
            if (a.go < 0 && TF.TOWN_GRAPH.nodes[a.at].k === 'wait') out.meetsOk++;
            else out.bad.push(`day ${st.day}: ${id} is not on platform 1 when ${svc} stands (at ${TF.TOWN_GRAPH.nodes[a.at].id}${a.go >= 0 ? ' walking' : ''})`);
          }
          if (st.day === 2 && now >= 15 * 3600 && !saved) saved = JSON.stringify(S);
        }
        if (check) { if (!weekday) out.bad.push('no weekday 10:00 seen'); if (!sunday) out.bad.push('no Sunday 10:30 seen'); }
        return { final: JSON.stringify(S.tf), saved };
      };
      const t0 = performance.now(), a = play(true), ms = performance.now() - t0, b = play(false);
      out.same = a.final === b.final;
      out.ms = Math.round(ms);
      // a save made on day 2 at 15:00, run on 1500 ticks; the same saved again half way and loaded: the same at the end
      const S1 = JSON.parse(a.saved);
      let S2 = JSON.parse(a.saved);
      for (let i = 0; i < 1500; i++) { R.simTick(S1, []); R.simTick(S2, []); if (i === 700) S2 = JSON.parse(JSON.stringify(S2)); }
      out.reload = R.stateHash(S1) === R.stateHash(S2) && JSON.stringify(S1.tf) === JSON.stringify(S2.tf);
      // the same after a page-level import (the save's own path: migrate, tfCheckSaveShape)
      out.saved = a.saved;
      out.after1500 = JSON.stringify(S1.tf);
      // a save without S.tf: planned and settled at once
      const S3 = JSON.parse(a.saved); delete S3.tf; R.simTick(S3, []);
      out.noTf = S3.tf && S3.tf.ag.length === TF.TF_AGENTS.length && S3.tf.ag.every(q => q.go === -1) ? 'ok' : JSON.stringify(S3.tf).slice(0, 200);
      // damaged stores refused
      out.shape = [{ tf: null }, { tf: { day: 'x', ag: [] } }, { tf: { day: 1, ag: [{ e: 'a' }] } }].map(st => { try { TF.tfCheckSaveShape(st); return 'accepted'; } catch (e) { return 'refused'; } });
      out.shapeOk = TF.tfCheckSaveShape({}) === true && TF.tfCheckSaveShape({ tf: JSON.parse(a.final) }) === true;
      return out;
    });
    week.bad.slice(0, 12).forEach(P);
    if (week.bad.length > 12) P(`... and ${week.bad.length - 12} more`);
    if (!week.same) P('the same week played twice gave different townsfolk');
    if (!week.reload) P('a save loaded on day 2 at 15:00 did not go on as the game it came from');
    if (week.noTf !== 'ok') P('a save without S.tf: ' + week.noTf);
    if (week.shape.some(s => s !== 'refused') || !week.shapeOk) P(`tfCheckSaveShape: ${week.shape.join(', ')}, good ones ${week.shapeOk}`);
    if (!(week.meets >= 20) || week.meetsOk !== week.meets) P(`meeting trains: ${week.meetsOk} of ${week.meets} on platform 1`);
    if (!(Object.entries(week.ev).filter(([k]) => k !== 'rrArrived').reduce((n, [, v]) => n + v, 0) >= week.meets)) P(`tfMeet events: ${JSON.stringify(week.ev)} for ${week.meets} meetings`);
    for (const k of ['draw:walk', 'draw:idle', 'draw:talk', 'draw:benchSit', 'in']) if (!(week.acts[k] > 0)) P(`in a week nobody was ever ${k}`);
    if (!(week.cow > 0)) P('the cowhands never came to town');
    console.log(`  a week: ${week.meetsOk}/${week.meets} meetings on platform 1, up to ${week.maxOut} outdoors at once, samples ${JSON.stringify(week.acts)}, events ${JSON.stringify(week.ev)}, the same twice, a mid-day save goes on the same (${week.ms} ms for the week)`);

    // the page's own save path: import the day-2 save, run on, compare with the copy run in the page
    const imp = await page.evaluate((saved) => {
      const R = window.__railhead;
      R.importSave(JSON.stringify({ state: JSON.parse(saved) }));
      for (let i = 0; i < 1500; i++) R.simTick(R.state, []);
      return JSON.stringify(R.state.tf);
    }, week.saved);
    if (imp !== week.after1500) P('the day-2 save imported through the page went on differently');

    // ---- Delivery reaction, tfAt, waiting for the player, cost ----
    const misc = await page.evaluate(() => {
      const R = window.__railhead, TF = R.tf, out = {};
      const S = R.rr.protoDebugScenario(R.newState(1866, 'proto'), 10, 0, []);
      R.simTick(S, []);
      const i = TF.TF_AGENTS.findIndex(a => a.id === 'amos'), a = S.tf.ag[i];
      out.inBefore = a.in === 'shop_store' && TF.tfAt(S, 'store') && TF.tfAt(S, 'shop_store') && !TF.tfDrawList(S).some(q => q.id === 'tf_amos');
      TF.tfTick(S, [{ t: 'pgDelivered', shop: 'store', id: 1 }]);
      const d = TF.tfDrawList(S).find(q => q.id === 'tf_amos');
      out.out = !!d && d.act === 'talk' && TF.tfAt(S, 'store') && Math.abs(d.x - -9.1) < 0.2;
      for (let k = 0; k < 35; k++) R.simTick(S, []);
      out.back = !TF.tfDrawList(S).some(q => q.id === 'tf_amos') && TF.tfAt(S, 'store');
      // a keeper away (the feed store's at home at 22:00 on a weekday) is not in; a shop with no keeper never is
      const S2 = R.rr.protoDebugScenario(R.newState(1866, 'proto'), 22, 0, []); R.simTick(S2, []);
      out.away = TF.tfAt(S2, 'feed') === false && TF.tfAt(S2, 'nowhere') === false;
      // the player ahead: a walker waits once (6 s of the 8 s tick), then walks on
      const w = S.tf.ag.find(q => q.go >= 0) || null;
      if (w) {
        const G = TF.TOWN_GRAPH, A = G.nodes[w.at], B = G.nodes[w.seg], L = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L;
        w.s = 0; w.wait = 0; S.player.x = A.x + ux * 0.4; S.player.z = A.z + uz * 0.4;
        TF.tfTick(S, []); const s1 = w.s; TF.tfTick(S, []); const s2 = w.s;
        out.wait = [Math.round(s1 * 1000) / 1000, Math.round((s2 - s1) * 1000) / 1000];
      } else out.wait = 'nobody walking';
      // the railroad's real trains: day 0 with a switchman until p1 has stood 5 minutes: the hotelkeeper is on platform 1
      // as it comes in, tfMeet is sent, and she leaves after
      const Q = R.newState(1866, 'proto'), ni = TF.TF_AGENTS.findIndex(q => q.id === 'nell');
      let met = 0, onPlat = null, left = null;
      R.simTick(Q, [{ t: 'pdStart' }]);
      for (let k = 0; k < 600; k++) {
        const seen = new Set();
        for (const nd of R.rr.rrSwitchNeeds(Q)) if (!nd.passed && !seen.has(nd.sw)) { seen.add(nd.sw); Q.track.switches[nd.sw].state = nd.want === 'reverse' ? 'R' : 'N'; }
        for (const e of R.simTick(Q, [])) if (e.t === 'tfMeet' && e.id === 'nell') met++;
        const run = Q.rr.runs.find(r => r.svc === 'p1' && r.day === 0), a = Q.tf.ag[ni];
        if (run && run.ph === 'stand' && onPlat === null) onPlat = a.go < 0 && TF.TOWN_GRAPH.nodes[a.at].id === 'wait0';
        if (run && run.ph === 'stand' && Q.time > run.tArr + 400) { left = a.go >= 0 || TF.TOWN_GRAPH.nodes[a.at].id !== 'wait0'; break; }
      }
      out.real = { met, onPlat, left };
      // cost: tfTick alone over a weekday from 06:30 to 19:00 (the clock moved by hand, no trains)
      const C = R.newState(1866, 'proto'); C.time = 3600 + 1800; R.d27.d27On(C.track, 'town'); TF.tfTick(C, []);
      let walking = 0; const n = 5600, t0 = performance.now();
      for (let k = 0; k < n; k++) { C.time += 8; TF.tfTick(C, []); }
      out.msPerTick = (performance.now() - t0) / n;
      for (let k = 0; k < 400; k++) { C.time += 8; TF.tfTick(C, []); walking = Math.max(walking, C.tf.ag.filter(q => q.go >= 0).length); }
      out.agents = C.tf.ag.length;
      return out;
    });
    if (!misc.inBefore) P('at 10:00 the storekeeper is not in his store (tfAt)');
    if (!misc.out) P('a delivery at the store did not bring its keeper out to the door, talking');
    if (!misc.back) P('the storekeeper did not go back in after the delivery');
    if (!misc.away) P('tfAt: a keeper at home in his house, or a shop with no keeper, counted as in');
    if (!Array.isArray(misc.wait) || !(misc.wait[0] > 0 && misc.wait[0] < 0.1) || !(misc.wait[1] > 0.3)) P(`waiting for the player: moved ${JSON.stringify(misc.wait)} (want under 0.1u, then a full step)`);
    if (!(misc.real.met === 1 && misc.real.onPlat && misc.real.left)) P(`the hotelkeeper meeting the real p1 on day 0: ${JSON.stringify(misc.real)} (want met once, on platform 1, then gone)`);
    if (!(misc.msPerTick < 0.05)) P(`tfTick costs ${misc.msPerTick.toFixed(4)} ms a tick (limit 0.05 ms)`);
    console.log(`  delivery: the keeper steps out and back; waiting for the player ${JSON.stringify(misc.wait)}u; tfTick ${(misc.msPerTick * 1000).toFixed(1)} microseconds a tick for ${misc.agents} agents`);

    // ---- A screenshot of the street (the travellers' drawing borrowed for the townsfolk) ----
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
    await page.evaluate(() => {
      const R = window.__railhead;
      dbgScenario('d27town');
      if (R.pdui && R.pdui.closeBoard) R.pdui.closeBoard();
      const base = window.pixPeople;
      window.pixPeople = () => base().concat(R.tf.tfDrawList(R.state));
      Object.assign(R.state.player, { x: -4, z: -40 });   // the camera follows the player: stand him in the street
      R.camera.zoom = 1.5; R.pix.pixLookAt(-4, -44);
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: screenshotPath('d27-townsfolk-portrait') });
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
