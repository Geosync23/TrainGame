// Check: the work board behind the ticket counter and the public schedule board (D20 (2)), and the patient ticket
// line (D20 (3)).
// Work board:
// - One at each station (the hub and Willow Ford), on the booth's inside wall (the depot's closed part) behind the
//   counter, facing the ticket window, lifted a little off the wall, in the boards' one mesh (no extra draw call).
// - Its rows (wbRows) are the trains coming in or leaving in the next 6 game hours at that station, soonest first,
//   with the right counts against the sim state: cars and their kinds, goods to unload (per tag), goods waiting to
//   load, travellers waiting to board (and how many have tickets), wood the engine needs (the dispatcher's figure).
// - The Overland is listed at the hub when it comes within the 6 hours, with what was ordered for that visit.
// - The card: a real tap on the board from inside the booth opens it (from the platform it does not: the board is
//   behind the front wall); Look and a tap on it opens it from anywhere; the Work board button shows only in the
//   booth. The card lists the same trains with the same counts, scrolls when long, and its buttons are 48 px or more.
// - Switches: the work board lists exactly the switches the real ttSwitchNeeds gives for each service (setting,
//   deadline, tick); then a stub of ttSwitchNeeds' own row shape checks the placing per row, the words (green
//   straight, red turn-off), deadlines and ticks, and the board in the world counts them.
// - The board in the world shows the next 3 trains in short (wbRows' first 3) and is repainted only on a change.
// Public schedule board: the columns train, from, to, arr, dep, platform, state at both stations (check-board.js has
// the rest). Ticket line: nobody leaves the line over 12 game hours with nobody selling.
// Screenshots: test-output/workboard-*.png (the booth with the board, the card) and schedule-*.png (the public board
// at the start zoom 1.5 and at 3, day and night).

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkWorkboard() {
  const problems = [], dcs = [];
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const P = s => problems.push(`${orientation}: ${s}`);
    const frames = ms => page.waitForTimeout(ms || 400);
    const look = (st, zoom, kind, x, z) => R(([st, zoom, kind, x, z]) => {
      const R = window.__railhead, S = R.state, b = R.board.list.find(b => b.st === st && b.kind === kind), c = R.camera, el = R.CFG.ISO_EL;
      if (x !== null) { S.player.x = x; S.player.z = z; S.player.mode = 'idle'; }
      c.zoom = zoom; c.yawIdx = 0;
      const k = (b.y - 0.5) / Math.tan(el), gx = b.x - Math.sin(Math.PI / 4) * k, gz = b.z - Math.cos(Math.PI / 4) * k;
      c.fx = S.player.x; c.fz = S.player.z; c.ox = gx - S.player.x; c.oz = gz - S.player.z;
    }, [st, zoom, kind, x === undefined ? null : x, z === undefined ? null : z]);
    try {
      // ---- 1. Where the work boards are ----
      const geo = await R(() => {
        const R = window.__railhead, B = R.board, CFG = R.CFG, WS = CFG.SCALE, out = [];
        for (const b of B.list.filter(b => b.kind === 'work')) {
          const K = R.pax.paxStation(b.st), at = R.world.layout.find(a => a.id === K.depot.id);
          const ox = b.x - at.x, oz = b.z - at.z, out_ = ox * K.out[0] + oz * K.out[1];
          const strip = B.booths().find(r => r.id === at.id && r.part === 'strip');
          const along = (b.x - K.staff.x) * K.along[0] + (b.z - K.staff.z) * K.along[1];
          out.push({ st: b.st, lift: out_ - B.BLD_BOOTH.z0 * WS, inStrip: out_ > B.BLD_BOOTH.z0 * WS && out_ < (B.BLD_BOOTH.wall - B.BLD_BOOTH.t) * WS,
            facing: Math.sin(b.yaw) * K.out[0] + Math.cos(b.yaw) * K.out[1], along, halfStrip: strip.w / 2, w: b.w, h: b.h, y0: b.y - b.h / 2, y1: b.y + b.h / 2 });
        }
        const m = B.mesh;
        return { out, quads: m ? m.geometry.index.count / 6 : 0, n: B.list.length, sched: B.list.filter(b => b.kind === 'sched').length, work: B.list.filter(b => b.kind === 'work').length, sign: B.list.filter(b => b.kind === 'sign').length };
      });
      for (const st of ['hub', 'willow']) {
        const g = geo.out.find(o => o.st === st);
        if (!g) { P(`no work board at ${st}`); continue; }
        if (!(g.lift > 0.03 && g.lift < 0.15)) P(`${st}'s work board is ${g.lift.toFixed(3)}u off the booth's inside wall (want lifted a little off it)`);
        if (!g.inStrip) P(`${st}'s work board is not inside the booth`);
        if (!(g.facing > 0.99)) P(`${st}'s work board does not face the ticket window (${g.facing.toFixed(2)})`);
        if (!(Math.abs(g.along) + g.w / 2 < g.halfStrip)) P(`${st}'s work board runs past the booth's end walls`);
        if (!(Math.abs(g.along) < 2.5)) P(`${st}'s work board is ${g.along.toFixed(2)}u from the counter along the wall (want behind it)`);
        if (!(g.w > 2 && g.h > 1.2 && g.y0 > 0.6 && g.y1 < 2.6)) P(`${st}'s work board size or height looks wrong: ${JSON.stringify(g)}`);
      }
      if (geo.quads !== geo.n || geo.work !== geo.sched || geo.sign !== geo.sched || geo.n !== 3 * geo.sched)   // D21: and a roof sign per depot
      P(`the boards should be one mesh with a quad per board (schedule and work): ${JSON.stringify(geo)}`);

      // ---- 2. Rows against the sim state: the passengers scenario (08:00, 6 in line, 4 ticketed), No. 1 at the hub
      // on the timetable, 3 goods for Willow Ford on the ground by the platform, 2 for the hub in No. 1's boxcar, and
      // one cord of wood on the tender ----
      const setup = await R(() => {
        const R0 = window.__railhead, S0 = R0.pax.paxDebugScenario(R0.newState(1866), 6, 4);
        R0.importSave(JSON.stringify({ state: S0 }));
        const R = window.__railhead, S = R.state;
        R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1);
        const hub = R.tt.ttStation(S, 'hub'), [x0, x1, z0, z1] = hub.area, K = R.pax.paxStation('hub');
        const box = S.trains[0].consist.find(c => c.k === 'boxcar');
        const wb = (town, id) => ({ commodity: 'flour', originTownId: 'OUTSIDE', destTownId: town, consignee: { kind: 'BUSINESS', id }, contractId: null, due: null });
        for (let i = 0; i < 3; i++) R.cargo.itemCreate(S, wb(1, 1), { kind: 'GROUND', x: Math.round((K.plat.x - 4 + i * 0.7) * 100), z: Math.round((K.plat.z) * 100) }, []);
        for (let i = 0; i < 2; i++) R.cargo.itemCreate(S, wb(0, 0), { kind: 'CAR', stockId: box.id }, []);
        const loco = S.trains[0].consist.find(c => c.k === 'loco');
        loco.fuel = R.CFG.CORD_U;
        R.importSave(R.exportSave());
        return { inArea: K.plat.x - 4 >= x0 && K.plat.x + 0 <= x1 && K.plat.z >= z0 && K.plat.z <= z1 };
      });
      if (!setup.inArea) P('the test goods were not put in the hub station area');
      const exp = await R(() => {
        // What the work board should say, worked out here from the state.
        const R = window.__railhead, S = R.state, D = S.tt, CFG = R.CFG, abs = S.time + CFG.DAY_START_S, day = Math.floor(abs / 86400), sod = abs % 86400, rows = [];
        for (const svc of D.services) svc.stops.forEach((p, i) => {
          if (p.st !== 'hub') return;
          const run = D.runs.find(r => r.svc === svc.id), t = p.arr !== null ? p.arr : p.dep;
          if (run ? run.i > i : svc.last === day) return;
          const at = !!run && run.i === i && run.ph === 'at';
          if (!at && t - sod > 6 * 3600) return;
          rows.push({ key: 's' + svc.id + ':' + i, t, at });
        });
        rows.sort((a, b) => a.t - b.t);
        const tr = S.trains[0], loco = tr.consist.find(c => c.k === 'loco'), svc = D.services[0], need = R.tt.ttWoodNeedU(S, svc, 0, tr), run = D.runs.find(r => r.svc === 0);
        const cords = run && run.wood ? 0 : loco.fuel < need ? Math.min(Math.floor((R.tt.FUEL_CAP - loco.fuel) / CFG.CORD_U + 1e-9), Math.ceil((need - loco.fuel) / CFG.CORD_U - 1e-9)) : 0;
        const waiting = S.pax.list.filter(p => p.st === 'hub' && p.to === 'willow' && ['queue', 'wait', 'board'].includes(p.s));
        return { keys: rows.map(r => r.key), cords, on: waiting.length, ticketed: waiting.filter(p => p.fare).length, cars: tr.consist.filter(c => c.k !== 'loco').map(c => c.k).sort() };
      });
      const rows = await R(() => window.__railhead.board.wbRows('hub'));
      const keys = rows.map(r => r.key);
      if (JSON.stringify(keys) !== JSON.stringify(exp.keys)) P(`the hub's work board lists ${JSON.stringify(keys)}, the timetable says ${JSON.stringify(exp.keys)} in the next 6 hours`);
      const r0 = rows.find(r => r.key === 's0:0'), r2 = rows.find(r => r.key === 's0:2');
      if (!r0) P('the 08:00 departure is not on the hub work board');
      else {
        if (r0.kind !== 'Mixed' || r0.cars.n !== exp.cars.length || JSON.stringify(r0.cars.kinds.map(k => k[0])) !== JSON.stringify(exp.cars)) P(`08:00 cars: ${JSON.stringify(r0.cars)} ${r0.kind}, want ${JSON.stringify(exp.cars)} (Mixed)`);
        if (r0.load.n !== 3 || JSON.stringify(r0.load.tags) !== '[["W",3]]') P(`08:00 goods to load: ${JSON.stringify(r0.load)}, want 3 for Willow Ford (W)`);
        if (r0.unload.n !== 2 || JSON.stringify(r0.unload.tags) !== '[["T",2]]') P(`08:00 goods to unload: ${JSON.stringify(r0.unload)}, want the 2 for the hub (T) in the boxcar`);
        if (r0.paxOn !== exp.on || r0.paxTicketed !== exp.ticketed || exp.on !== 10) P(`08:00 travellers waiting: ${r0.paxOn} (${r0.paxTicketed} ticketed), want ${exp.on} (${exp.ticketed})`);
        if (r0.wood !== exp.cords || !(exp.cords > 0)) P(`08:00 wood: ${r0.wood} cords, the dispatcher wants ${exp.cords}`);
        if (r0.dep !== '08:00' || r0.arr !== '' || r0.engine !== 'No. 1') P(`08:00 times or engine: ${JSON.stringify([r0.arr, r0.dep, r0.engine])}`);
      }
      if (!r2) P('the 13:00 arrival is not on the hub work board');
      else if (r2.arr !== '13:00' || r2.dep !== '' || r2.unload.n !== 0 || r2.load.n !== 0) P(`13:00 arrival: ${JSON.stringify(r2)} (want no goods: the hub's 2 come off at 08:00, the 3 go to Willow Ford)`);
      const wfRows = await R(() => window.__railhead.board.wbRows('willow'));
      const wf = wfRows.find(r => r.key === 's0:1');
      if (!wf) P(`the morning train is not on Willow Ford's work board: ${JSON.stringify(wfRows.map(r => r.key))}`);
      else if (wf.unload.n !== 3 || wf.paxOff !== 10 || wf.arr !== '09:30' || wf.dep !== '10:50') P(`Willow Ford's work board for the morning train: unload ${wf.unload.n} (want the 3 W goods), off ${wf.paxOff} (want 10), ${wf.arr} to ${wf.dep}`);

      // ---- 3. The card: a tap from the platform does nothing; from inside the booth it opens; Look; the button ----
      await look('hub', 2.5, 'work');
      await frames(800);
      const tapAt = () => R(() => { const R = window.__railhead, b = R.board.list.find(b => b.st === 'hub' && b.kind === 'work'); return R.toScreen(b.x, b.z, b.y); });
      let t = await tapAt();
      const outside = await R(t => ({ hit: window.__railhead.board.workBoardHitAt(t.x, t.y), btn: !document.getElementById('workBtn').hidden }), t);
      if (outside.hit) P('the work board answers a tap from the platform (it is behind the front wall)');
      if (!outside.btn) P('the Work board button should show on the hub\'s platform too (D22 (3): anywhere at the hub it walks to the board)');
      // Into the booth (staff the window), then tap the board.
      await R(() => { const R = window.__railhead; R.send({ t: 'staffWindow', st: 'hub' }); R.step(90); });
      await look('hub', 2.5, 'work', null);
      await frames(1500);
      const inBooth = await R(() => ({ st: window.__railhead.board.wbBoothStation(window.__railhead.state.player.x, window.__railhead.state.player.z), btn: !document.getElementById('workBtn').hidden }));
      if (inBooth.st !== 'hub') P('the player did not get into the hub booth');
      if (!inBooth.btn) P('the Work board button does not show in the booth');
      await page.screenshot({ path: screenshotPath('workboard-booth-' + orientation) });
      dcs.push({ what: `in the booth by the work board ${orientation} zoom 2.5`, dc: await R(() => window.__railhead.drawCalls) });
      t = await tapAt();
      await page.touchscreen.tap(t.x, t.y);
      await frames(500);
      const card = await R(() => {
        const c = document.getElementById('workCard'), body = document.getElementById('workBody');
        if (c.hidden) return null;
        const r = c.getBoundingClientRect(), btns = [...c.querySelectorAll('button'), document.getElementById('workBtn')].map(b => { const q = b.getBoundingClientRect(); return [q.width, q.height]; });
        return { title: document.getElementById('workTitle').textContent, blocks: [...body.querySelectorAll('.wbTrain')].map(d => ({ key: d.dataset.key, text: d.innerText })),
          now: window.__railhead.board.wbRows('hub'), overflow: getComputedStyle(body).overflowY, inView: r.top >= 0 && r.bottom <= window.innerHeight + 1, btns, moved: window.__railhead.state.player.mode };
      });
      if (!card) P('a tap on the work board from inside the booth did not open its card');
      else {
        if (!/Hub/.test(card.title)) P(`the card's title is "${card.title}"`);
        if (JSON.stringify(card.blocks.map(b => b.key)) !== JSON.stringify(keys)) P(`the card lists ${JSON.stringify(card.blocks.map(b => b.key))}, the board ${JSON.stringify(keys)}`);
        // Against the board's rows as they are now (tickets were sold and travellers boarded while the player walked in).
        const now = card.now.find(r => r.key === 's0:0') || { paxOn: -1 }, b0 = (card.blocks.find(b => b.key === 's0:0') || {}).text || '';
        const tags = t => t.length ? ' (' + t.map(([l, n]) => l + ' ' + n).join(', ') + ')' : '';
        for (const want of [`Load here: ${now.load.n}${tags(now.load.tags)}`, `Unload here: ${now.unload.n}${tags(now.unload.tags)}`, `${now.paxOn} waiting to board`, now.wood ? `${now.wood} cord` : 'Engine needs:', 'Cars: 2 (1 boxcar, 1 combine)', 'Mixed, No. 1', now.state])
          if (!b0.includes(want)) P(`the card's 08:00 block lacks "${want}": ${JSON.stringify(b0)}`);
        if (card.overflow !== 'auto') P(`the card's list does not scroll (overflow ${card.overflow})`);
        if (!card.inView) P('the card runs off the screen');
        if (card.btns.some(([w, h]) => w < 48 || h < 48)) P(`the card's buttons are under 48 px: ${JSON.stringify(card.btns)}`);
        if (card.moved !== 'idle') P(`a tap on the work board also moved the player (${card.moved})`);
      }
      await page.screenshot({ path: screenshotPath('workboard-card-' + orientation) });

      // ---- 4. Switches: from the real ttSwitchNeeds (D20 manual switches), then a stub of the same shape ----
      const native = await R(() => typeof ttSwitchNeeds === 'function');
      if (!native) P('ttSwitchNeeds is missing: the work board cannot list the switches to set');
      // 4a. The real function: every switch it lists for a service at the hub goes on one of that service's rows, with
      //     the same setting, deadline and tick; the card says it in words (green for normal, red for reverse).
      const real = await R(() => {
        const R = window.__railhead, S = R.state, rows = R.board.wbRows('hub'), svcs = [...new Set(rows.map(r => r.svc).filter(v => v !== 'overland'))];
        const need = R.tt.ttSwitchNeeds(S).filter(n => svcs.includes(n.svc)).map(n => [n.svc, n.sw, n.want, n.byTime, !!n.done]);
        const got = [];
        for (const r of rows) if (r.svc !== 'overland') for (const w of r.switches || []) got.push([r.svc, w.sw, w.want, w.by, w.done]);
        const key = x => JSON.stringify(x), sort = l => l.map(key).sort();
        const text = [...document.querySelectorAll('#workBody .wbSwRow')].map(d => d.textContent);
        return { need, got, same: JSON.stringify(sort(need)) === JSON.stringify(sort(got)), text, switches: rows.map(r => r.switches) };
      });
      if (real.switches.some(s => !Array.isArray(s) && s !== undefined && s !== null)) P(`work board switches are not lists: ${JSON.stringify(real.switches)}`);
      if (!real.need.length) P(`the real ttSwitchNeeds lists no switch for No. 1's services at the hub (want switch 1 at least)`);
      if (!real.same) P(`the work board's switches differ from ttSwitchNeeds: board ${JSON.stringify(real.got)}, ttSwitchNeeds ${JSON.stringify(real.need)}`);
      if (real.need.some(n => n[2] !== 'normal' && n[2] !== 'reverse')) P(`ttSwitchNeeds' want is not 'normal' or 'reverse': ${JSON.stringify(real.need)}`);
      if (!real.text.length || real.text.some(t => !/Switch \d+.*: (straight \(green\)|to the turn-off \(red\)), by \d\d:\d\d/.test(t))) P(`the card's switch lines from the real ttSwitchNeeds do not read "Switch n: straight (green) / to the turn-off (red), by hh:mm": ${JSON.stringify(real.text)}`);
      // 4b. A stub with the same shape as ttSwitchNeeds' rows, to test the placing and ticking exactly.
      const sw = await R(() => {
        const R = window.__railhead, S = R.state;
        window.__keepNeeds = window.ttSwitchNeeds;
        const row = (svc, sw, want, byTime, done) => ({ svc, service: 'x', train: 0, trainName: 'No. 1', stop: 0, move: 'leg', station: 'hub', stationName: 'Railhead', sw, want, byTime, by: '', spring: false, set: done, passed: false, done });
        window.ttSwitchNeeds = st => [row(0, 3, 'reverse', st.time + 1800, false), row(0, 1, 'normal', st.time + 600, true), row(1, 2, 'normal', st.time + 9000, false)];
        R.step(1);
        return {};
      });
      await frames(800);
      const sw1 = await R(() => {
        const R = window.__railhead, S = R.state, c = (S.time + R.CFG.DAY_START_S) % 86400, clk = t => String(Math.floor(t / 3600) % 24).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0');
        const rows = R.board.wbRows('hub'), b = [...document.querySelectorAll('#workBody .wbTrain')].find(d => d.dataset.key === 's0:0');
        const sws = b ? [...b.querySelectorAll('.wbSwRow')].map(d => ({ text: d.textContent, done: d.hasAttribute('data-done') })) : [];
        return { r0: rows.find(r => r.key === 's0:0').switches, r2: rows.find(r => r.key === 's0:2').switches, r1: rows.find(r => r.key === 's1:0').switches, sws, by: [clk(c + 600), clk(c + 1800)], world: R.board.list.find(x => x.kind === 'work' && x.st === 'hub').rows[0] };
      });
      if (!sw1.r0 || sw1.r0.length !== 2 || sw1.r0[0].sw !== 1 || !sw1.r0[0].done || sw1.r0[1].sw !== 3 || sw1.r0[1].done) P(`with ttSwitchNeeds the 08:00 row's switches are ${JSON.stringify(sw1.r0)} (want switch 1 done, then switch 3 to set, by deadline)`);
      if (!Array.isArray(sw1.r2) || sw1.r2.length || !sw1.r1 || sw1.r1.length !== 1 || sw1.r1[0].sw !== 2) P(`each switch should go with its own train's row (nearest its deadline): 13:00 ${JSON.stringify(sw1.r2)}, 14:00 ${JSON.stringify(sw1.r1)}`);
      if (sw1.sws.length !== 2 || !sw1.sws[0].done || sw1.sws[1].done || !sw1.sws[1].text.includes('Switch 3: to the turn-off (red), by ' + sw1.by[1]) || !sw1.sws[0].text.includes('Switch 1: straight (green), by ' + sw1.by[0]))
        P(`the card's switch list: ${JSON.stringify(sw1.sws)} (deadlines ${sw1.by})`);
      if (!sw1.world || !sw1.world.marks.some(m => m[0] === 'Sw 1/2')) P(`the board in the world does not count the switches (Sw 1/2): ${JSON.stringify(sw1.world)}`);
      await page.screenshot({ path: screenshotPath('workboard-card-switches-' + orientation) });
      await R(() => { window.ttSwitchNeeds = window.__keepNeeds; delete window.__keepNeeds; window.__railhead.step(1); });
      await frames(400);
      await page.screenshot({ path: screenshotPath('workboard-card-real-switches-' + orientation) });

      // ---- 5. The board in the world: the next 3 trains, repainted only on a change ----
      const world = await R(() => {
        const R = window.__railhead, b = R.board.list.find(x => x.kind === 'work' && x.st === 'hub'), w = R.board.wbRows('hub').slice(0, 3);
        return { lines: b.rows.map(l => l.time + ' ' + l.train), want: w.map(r => (r.arr || r.dep) + ' ' + r.short), red: R.board.redraws };
      });
      if (JSON.stringify(world.lines) !== JSON.stringify(world.want)) P(`the work board in the world shows ${JSON.stringify(world.lines)}, want ${JSON.stringify(world.want)}`);
      await frames(1000);
      if ((await R(() => window.__railhead.board.redraws)) !== world.red) P('the boards were repainted with nothing changing');
      // The card closes with its X; Look and a tap opens it from the platform.
      await page.click('#workClose');
      await R(() => { const R = window.__railhead, K = R.pax.paxStation('hub'); R.send({ t: 'walkTo', x: Math.round(K.line.x * 100), z: Math.round((K.line.z + 1) * 100) }); R.step(40); });
      await look('hub', 2.5, 'work', null);
      await frames(1200);
      await page.click('#lookBtn');
      t = await tapAt();
      await page.touchscreen.tap(t.x, t.y);
      await frames(400);
      const lk = await R(() => ({ open: !document.getElementById('workCard').hidden, look: !document.getElementById('lookCard').hidden }));
      if (!lk.open || lk.look) P(`Look and a tap on the work board should open its card (open ${lk.open}, Look card ${lk.look})`);
      await R(() => window.__railhead.board.closeWorkCard());

      // ---- 6. The Overland on the hub's work board (13:00: it comes at 18:00), with 3 goods ordered for it ----
      const ov = await R(() => {
        const R0 = window.__railhead, S0 = R0.newState(1866);
        S0.time = 8 * 3600;
        R0.importSave(JSON.stringify({ state: S0 }));
        const R = window.__railhead, S = R.state, due = S.time + 5 * 3600;   // the 18:00 visit
        S.econ.orders.push({ id: 900, t: S.time, due, lines: [{ c: 'flour', n: 3 }], cost: 0 });
        return R.board.wbRows('hub').find(r => r.overland) || null;
      });
      if (!ov || ov.arr !== '18:00' || ov.unload.n !== 3 || ov.cars.n !== 1) P(`the Overland's row at 13:00: ${JSON.stringify(ov)} (want 18:00, 3 goods in, 1 car)`);

      // ---- 7. The public schedule board's columns at both stations ----
      const sched = await R(() => { const R = window.__railhead; R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1); return ['hub', 'willow'].map(st => R.board.schedRows(R.state, st)); });
      for (const rs of sched) for (const r of rs) if (['train', 'from', 'to', 'arr', 'dep', 'plat', 'state'].some(k => typeof r[k] !== 'string') || !/^(On time|Late|Cancelled|Not running: needs an engine)$/.test(r.state)) P(`a schedule row lacks a column: ${JSON.stringify(r)}`);
      if (!sched[0].some(r => r.arr && r.from === 'Willow Ford') || !sched[1].some(r => r.arr && r.dep && r.from === 'Hub' && r.to === 'Hub')) P(`the schedule boards should list arrivals and departures with from and to: ${JSON.stringify(sched)}`);

      // ---- 8. Screenshots of the public board at the start zoom 1.5 and at 3, day and night ----
      for (const [when, time] of [['day', 2 * 3600], ['night', 23 * 3600]]) {
        await R(time => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1); R.state.time = time; R.step(1); }, time);
        for (const zoom of [1.5, 3]) {
          if (when === 'night' && zoom === 3) continue;
          const near = await R(() => { const K = window.__railhead.pax.paxStation('hub'); return { x: K.line.x - 6, z: K.line.z + 2 }; });
          await look('hub', zoom, 'sched', near.x, near.z);
          await frames(1500);
          await page.screenshot({ path: screenshotPath(`schedule-hub-${orientation}-z${zoom}-${when}`) });
          dcs.push({ what: `schedule board ${orientation} zoom ${zoom} ${when}`, dc: await R(() => window.__railhead.drawCalls) });
        }
      }

      // ---- 9. The ticket line is patient: 10 in line at the hub, nobody selling, 12 game hours ----
      const line = await R(() => {
        const R = window.__railhead, S = R.pax.paxDebugScenario(R.newState(1866), 10, 0), ids = S.pax.list.map(p => p.id);
        let gave = 0;
        for (let i = 0; i < 12 * 450; i++) for (const e of R.simTick(S, [])) if (e.t === 'paxGaveUp') gave++;
        return { gave, still: ids.filter(id => (S.pax.list.find(p => p.id === id) || {}).s === 'queue').length, rep: Object.values(S.pax.rep).reduce((a, b) => a + b, 0) };
      });
      if (line.gave || line.rep || line.still !== 10) P(`the ticket line over 12 game hours: ${line.gave} gave up (count ${line.rep}), ${line.still} of 10 still in line`);
      if (orientation === 'portrait') console.log(`  work board: hub rows ${keys.join(', ')}; 08:00 load ${r0 && r0.load.n}, unload ${r0 && r0.unload.n}, waiting ${r0 && r0.paxOn} (${r0 && r0.paxTicketed} ticketed), wood ${r0 && r0.wood}; switches from ttSwitchNeeds: ${real.need.length} for the hub's trains; ticket line after 12 h: ${line.still} of 10 still waiting`);
      if (errors.length) P(`console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  for (const d of dcs) if (!(d.dc < 100)) problems.push(`draw calls ${d.dc} (${d.what}), budget under 100`);
  console.log('  draw calls: ' + dcs.map(d => `${d.dc} ${d.what}`).join('; '));
  return problems;
};
