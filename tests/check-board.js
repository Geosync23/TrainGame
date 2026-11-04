// Check: the painted departure boards on the depots (D15, "Departure board: make it both") and the ticket booth
// (2026-11-03, "when selling tickets you should be inside the booth").
// Boards:
// - There is a board at both stations (the hub and Willow Ford, which is unstaffed), on its depot's front wall (the
//   platform side), beside the ticket window, facing the platform, lifted off the wall (not on top of it).
// - All boards are one mesh with no shadow (1 draw call) on one canvas texture.
// - Since D20 (2) the board is the public schedule board: each row has the columns train, from, to, arrival,
//   departure, platform and state; arrivals (a run's last stop) are listed too; its departures are the station card's
//   (the same times and destinations in the same order, and the same state where the card says On time, Late or
//   Cancelled), with No. 1 on the timetable. Below zoom 2.5 it is painted in its big layout, from 2.5 in columns,
//   repainted once when the zoom crosses that line.
// - A board is repainted only when its departures change (not every frame), and it changes when No. 1 leaves the hub.
// - A run cancelled today shows as Cancelled on the boards and the card.
// - A tap on a board (real touch) opens the station card from far away; a tap elsewhere puts it away; Look and then a
//   tap on a board opens it too.
// Booth:
// - A tap on the ticket window walks the player in through the depot's door to the counter behind the window, only
//   over open walk-grid cells; staffed there, tickets sell to the queue outside on the platform.
// - While the player is in the booth the depot's shell (roof and front wall) is see-through; out on the platform it is
//   solid again. Willow Ford's booth can be reached from its platform too (same walk-grid area).
// - A player saved inside the depot's closed part walks out.
// Draw calls are reported. Screenshots (phone size, portrait and landscape, zoom 1.5 and 3, day and night):
// test-output/board-*.png, and the player in the booth: test-output/booth-*.png.

const { openGame, screenshotPath } = require('./browser');

// The card's lines ("08:00 to Willow Ford: On time") as [{ time, to, state }].
const cardRows = page => page.evaluate(() => {
  const c = document.getElementById('ttCard');
  if (!c || c.hidden) return null;
  return [...document.querySelectorAll('#ttCardLines div')].map(d => d.textContent).filter(t => / to /.test(t)).map(t => {
    const m = /^(\d\d:\d\d) to (.+?): (.+)$/.exec(t);
    return m ? { time: m[1], to: m[2], state: m[3] } : { bad: t };
  });
});
// The schedule board's departures (rows with a departure time) against the card's: the same times and destinations
// in order (the card may list more: the board shows 4 rows, arrivals among them); the same state when the card's is
// short. Every row must have the board's columns.
const COLS = ['train', 'from', 'to', 'arr', 'dep', 'plat', 'state'];
function sameRows(board, card) {
  if (!card || board.some(r => COLS.some(c => typeof r[c] !== 'string'))) return false;
  const deps = board.filter(r => r.dep && r.to);
  if (deps.length > card.length) return false;
  return deps.every((b, i) => b.dep === card[i].time && b.to === card[i].to
    && (!/^(On time|Late|Cancelled)$/.test(card[i].state) || card[i].state === b.state));
}

module.exports = async function checkBoard() {
  const problems = [], P = s => problems.push(s), dcs = [];
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const frames = ms => page.waitForTimeout(ms || 400);
    // At least ms of real time AND at least n drawn frames. The shell's fade eases per drawn frame with dt capped at
    // 0.25 s, so it needs 3 frames to settle however slow they are; on a busy test machine (headless software GL at
    // 2 frames a second or less) 1500 ms alone can hold only 2.
    const drawnFrames = (ms, n) => page.evaluate(([ms, n]) => new Promise(res => {
      const t0 = performance.now(); let k = 0;
      const f = () => { k++; if (k >= n && performance.now() - t0 >= ms) res(); else requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }), [ms, n]);
    // Points the camera at a board (its middle), the player standing at (x, z).
    const look = (st, zoom, x, z) => R(([st, zoom, x, z]) => {
      const R = window.__railhead, S = R.state, b = R.board.list.find(b => b.st === st), c = R.camera, el = R.CFG.ISO_EL;
      if (x !== null) { S.player.x = x; S.player.z = z; S.player.mode = 'idle'; }
      c.zoom = zoom; c.yawIdx = 0;
      const k = (b.y - 0.5) / Math.tan(el), gx = b.x - Math.sin(Math.PI / 4) * k, gz = b.z - Math.cos(Math.PI / 4) * k;
      c.fx = S.player.x; c.fz = S.player.z; c.ox = gx - S.player.x; c.oz = gz - S.player.z;
    }, [st, zoom, x === undefined ? null : x, z === undefined ? null : z]);
    try {
      // ---- 1. Where the boards are ----
      const geo = await R(() => {
        const R = window.__railhead, B = R.board, out = [];
        for (const b of B.list.filter(b => b.kind === 'sched')) {
          const K = R.pax.paxStation(b.st), at = R.world.layout.find(a => a.id === K.depot.id), wall = B.BLD_BOOTH.wall * R.CFG.SCALE;
          const ox = b.x - at.x, oz = b.z - at.z, out_ = ox * K.out[0] + oz * K.out[1], along = (b.x - K.window.x) * K.along[0] + (b.z - K.window.z) * K.along[1];
          out.push({ st: b.st, depot: K.depot.id, staffed: !R.pax.paxUnstaffed(R.state.track, b.st), lift: out_ - wall, along, w: b.w, h: b.h, y: b.y,
            facing: Math.sin(b.yaw) * K.out[0] + Math.cos(b.yaw) * K.out[1], winY: B.BLD_BOOTH.winY.map(v => v * R.CFG.SCALE) });
        }
        const m = B.mesh;
        return { out, mesh: !!m, shadow: m && m.castShadow, quads: m ? m.geometry.index.count / 6 : 0, all: B.list.length, tex: m && !!m.material.map, own: m && m.material !== R.buildings.meshes[0].material };
      });
      for (const st of ['hub', 'willow']) {
        const g = geo.out.find(o => o.st === st);
        if (!g) { P(`${orientation}: no departure board at ${st}`); continue; }
        if (!(g.lift > 0.03 && g.lift < 0.15)) P(`${orientation}: ${st}'s board is ${g.lift.toFixed(3)}u in front of its depot's front wall (want lifted a little off it)`);
        if (!(g.facing > 0.99)) P(`${orientation}: ${st}'s board does not face the platform (${g.facing.toFixed(2)})`);
        const gap = Math.abs(g.along) - g.w / 2;
        if (!(gap > 0 && gap < 0.8)) P(`${orientation}: ${st}'s board is not beside the ticket window (edge ${gap.toFixed(2)}u from the window's middle)`);
        if (!(g.w > 1.8 && g.h > 1.4)) P(`${orientation}: ${st}'s board is small: ${g.w.toFixed(2)} x ${g.h.toFixed(2)}u`);
      }
      if (!geo.out.some(o => o.st === 'willow' && !o.staffed)) P(`${orientation}: Willow Ford should be unstaffed and still have its board`);
      // (D21: three quads per depot: the schedule board, the work board and the WORK BOARD roof sign.)
      if (!geo.mesh || geo.shadow || geo.quads !== geo.all || geo.all !== 3 * geo.out.length || !geo.tex || !geo.own) P(`${orientation}: the boards should be one mesh, a quad each, no shadow, own textured material: ${JSON.stringify(geo)}`);

      // ---- 2. Rows match the card; repainted only on change; a departure updates it ----
      await R(() => { const R = window.__railhead, S = R.state, K = R.pax.paxStation('hub'); R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1); S.player.x = K.line.x; S.player.z = K.line.z; });
      await frames(600);
      let rows = await R(() => window.__railhead.board.list.find(b => b.st === 'hub').rows), card = await cardRows(page);
      if (!rows.length) P(`${orientation}: the hub's board shows no trains with No. 1 on the timetable`);
      if (!sameRows(rows, card)) P(`${orientation}: the hub's board rows ${JSON.stringify(rows)} differ from the card's ${JSON.stringify(card)}`);
      // The new columns: the morning train out (no arrival, from nowhere) and its return (from Willow Ford, no departure).
      const out8 = rows.find(r => r.dep === '08:00'), in13 = rows.find(r => r.arr === '13:00');
      if (!out8 || out8.to !== 'Willow Ford' || out8.from !== '' || out8.arr !== '' || out8.plat !== '1' || out8.train !== 'Mixed AM') P(`${orientation}: the 08:00 departure's columns are wrong: ${JSON.stringify(out8)}`);
      if (!in13 || in13.from !== 'Willow Ford' || in13.to !== '' || in13.dep !== '') P(`${orientation}: the 13:00 arrival from Willow Ford is not on the board as an arrival: ${JSON.stringify(in13)}`);
      const wfRows = await R(() => { const R = window.__railhead; return { b: R.board.list.find(b => b.st === 'willow').rows, t: R.tt.ttBoard(R.state, 'willow').lines }; });
      if (!wfRows.b.length || wfRows.b.length !== wfRows.t.length || wfRows.b.some((r, i) => r.dep !== wfRows.t[i].time || r.to !== wfRows.t[i].to || !r.arr || r.from !== 'Hub')) P(`${orientation}: Willow Ford's board ${JSON.stringify(wfRows.b)} differs from its card's departures ${JSON.stringify(wfRows.t)} (or lacks the arrival times)`);
      const red0 = await R(() => window.__railhead.board.redraws);
      await frames(1000);
      const red1 = await R(() => window.__railhead.board.redraws);
      if (red1 !== red0) P(`${orientation}: the boards were repainted ${red1 - red0} times in a second with nothing changing (want only on a change)`);
      // The layout follows the zoom: big below 2.5, in columns from 2.5, one repaint of each schedule board on the change.
      const lay = await R(() => { const R = window.__railhead; R.camera.zoom = 1.5; return null; });
      await frames(400);
      const mz = await R(() => ({ m: window.__railhead.board.list.filter(b => b.kind === 'sched').map(b => b.mode), red: window.__railhead.board.redraws }));
      await R(() => { window.__railhead.camera.zoom = 3; });
      await frames(400);
      const mz3 = await R(() => ({ m: window.__railhead.board.list.filter(b => b.kind === 'sched').map(b => b.mode), red: window.__railhead.board.redraws }));
      if (mz.m.some(m => m !== 'big') || mz3.m.some(m => m !== 'full')) P(`${orientation}: the schedule boards' layouts at zoom 1.5 and 3: ${JSON.stringify(mz.m)} and ${JSON.stringify(mz3.m)} (want big, then full)`);
      if (mz3.red - mz.red !== mz.m.length) P(`${orientation}: the zoom change repainted ${mz3.red - mz.red} boards (want each schedule board once: ${mz.m.length})`);
      await R(() => { window.__railhead.camera.zoom = 1.5; });
      await frames(400);
      const red1b = await R(() => window.__railhead.board.redraws);
      const dep = await R(() => {
        const R = window.__railhead, S = R.state;
        for (let i = 0; i < 400; i++) { R.step(10); const run = S.tt.runs.find(r => r.svc === 0); if (run && run.i >= 1) return { ok: true, time: S.time }; }
        return { ok: false, time: S.time };
      });
      if (!dep.ok) P(`${orientation}: No. 1 did not leave the hub on the morning run (in the check)`);
      await R(() => { const R = window.__railhead, S = R.state, K = R.pax.paxStation('hub'); S.player.x = K.line.x; S.player.z = K.line.z; S.player.mode = 'idle'; });
      await frames(600);
      const after = await R(() => ({ rows: window.__railhead.board.list.find(b => b.st === 'hub').rows, red: window.__railhead.board.redraws }));
      card = await cardRows(page);
      if (after.rows.some(r => r.dep === '08:00')) P(`${orientation}: the hub's board still shows the 08:00 after No. 1 left: ${JSON.stringify(after.rows)}`);
      if (!(after.red > red1b)) P(`${orientation}: the boards were not repainted when No. 1 left`);
      if (!sameRows(after.rows, card)) P(`${orientation}: after the departure the board ${JSON.stringify(after.rows)} differs from the card ${JSON.stringify(card)}`);
      const rowText = r => `${r.train} ${r.from || '-'} > ${r.to || '-'} ${r.arr || '-'}/${r.dep || '-'} pl ${r.plat} ${r.state}`;
      console.log(`  ${orientation}: hub board before ${rows.map(rowText).join(', ')}; after No. 1 left ${after.rows.map(rowText).join(', ')}`);

      // ---- 3. Cancelled: a new game with No. 1 on the timetable and the clock jumped past 14:00, so the morning run
      // is too late to start ----
      await R(() => {
        const R = window.__railhead, S = R.newState(1866);
        R.importSave(JSON.stringify({ state: S })); R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1);
        const st = window.__railhead.state; st.time = 9 * 3600 + 10 * 60; R.step(1);
        const K = R.pax.paxStation('hub'); st.player.x = K.line.x; st.player.z = K.line.z;
      });
      await frames(600);
      rows = await R(() => window.__railhead.board.list.find(b => b.st === 'hub').rows); card = await cardRows(page);
      if (!rows.some(r => r.dep === '08:00' && r.state === 'Cancelled')) P(`${orientation}: a cancelled run should show as Cancelled: ${JSON.stringify(rows)}`);
      if (!sameRows(rows, card)) P(`${orientation}: with a cancelled run the board ${JSON.stringify(rows)} differs from the card ${JSON.stringify(card)}`);

      // ---- 4. A tap on the board opens the card; Look on it too ----
      await R(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1); });
      const far = await R(() => { const R = window.__railhead, K = R.pax.paxStation('hub'); return { x: K.line.x, z: K.line.z - 16 }; });
      await look('hub', 2, far.x, far.z);
      await frames(1500);
      const shown0 = await cardRows(page);
      if (shown0) P(`${orientation}: the card shows with the player far from the hub's board and window`);
      const tapAt = async st => R(st => { const R = window.__railhead, b = R.board.list.find(b => b.st === st); return R.toScreen(b.x, b.z, b.y); }, st);
      let t = await tapAt('hub');
      const hit = await R(t => window.__railhead.board.boardHitAt(t.x, t.y), t);
      if (hit !== 'hub') P(`${orientation}: the hub's board is not found at its own screen point (${hit})`);
      await page.touchscreen.tap(t.x, t.y);
      await frames(300);
      card = await cardRows(page);
      const title = await R(() => document.getElementById('ttCardTitle').textContent);
      rows = await R(() => window.__railhead.board.list.find(b => b.st === 'hub').rows);
      if (!card) P(`${orientation}: a tap on the hub's board did not open the card`);
      else {
        if (!/Hub/.test(title)) P(`${orientation}: the card opened from the hub's board is "${title}"`);
        if (!sameRows(rows, card)) P(`${orientation}: the card opened from the board ${JSON.stringify(card)} differs from the board ${JSON.stringify(rows)}`);
      }
      const moved = await R(() => window.__railhead.state.player.mode);
      if (moved !== 'idle') P(`${orientation}: a tap on the board also sent the player walking (${moved})`);
      await page.screenshot({ path: screenshotPath('board-tap-card-' + orientation) });
      const vp = page.viewportSize();
      await page.touchscreen.tap(vp.width / 2, vp.height - 140);
      await frames(300);
      if (await cardRows(page)) P(`${orientation}: a tap elsewhere did not put the card away`);
      // Look, then a tap on Willow Ford's board.
      await R(() => { const R = window.__railhead, S = R.state, b = R.board.list.find(b => b.st === 'willow'); S.player.x = b.x; S.player.z = b.z - 16; S.player.mode = 'idle'; });
      await look('willow', 2, null);
      await frames(1500);
      await page.click('#lookBtn');
      t = await tapAt('willow');
      await page.touchscreen.tap(t.x, t.y);
      await frames(300);
      card = await cardRows(page);
      const title2 = await R(() => document.getElementById('ttCardTitle').textContent);
      if (!card || !/Willow Ford/.test(title2)) P(`${orientation}: Look and a tap on Willow Ford's board did not open its card (${title2})`);
      if (await R(() => !document.getElementById('lookCard').hidden)) P(`${orientation}: Look on the board opened the Look card instead of the station card`);

      // ---- 5. Screenshots, day and night, and draw calls ----
      for (const [when, time] of [['day', 4 * 3600], ['night', 23 * 3600]]) {
        await R(time => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.send({ t: 'ttAssign', tr: 0, on: true }); R.step(1); R.state.time = time; R.step(1); }, time);
        for (const zoom of [1.5, 3]) {
          const near = await R(() => { const K = window.__railhead.pax.paxStation('hub'); return { x: K.line.x - 3, z: K.line.z + 1.2 }; });
          await look('hub', zoom, near.x, near.z);
          await frames(1500);
          await page.screenshot({ path: screenshotPath(`board-hub-${orientation}-z${zoom}-${when}`) });
          dcs.push({ what: `hub board ${orientation} zoom ${zoom} ${when}`, dc: await R(() => window.__railhead.drawCalls) });
        }
        if (orientation === 'portrait') {
          const b = await R(() => { const b = window.__railhead.board.list.find(b => b.st === 'willow'); return { x: b.x - 3, z: b.z + 4 }; });
          await look('willow', 3, b.x, b.z);
          await frames(1500);
          await page.screenshot({ path: screenshotPath(`board-willow-${orientation}-z3-${when}`) });
          dcs.push({ what: `Willow Ford board ${orientation} zoom 3 ${when}`, dc: await R(() => window.__railhead.drawCalls) });
        }
      }

      // ---- 6. The booth: walking in by the door, selling from the counter, the shell see-through ----
      const booth = await R(() => {
        const R0 = window.__railhead;
        R0.importSave(JSON.stringify({ state: R0.pax.paxDebugScenario(R0.newState(R0.CFG.SEED), 20, 20) }));
        const R = window.__railhead, S = R.state, K = R.pax.paxStation('hub'), G = R.world.walkGrid(S.track), W = R.world.walk;
        const cell = (x, z) => Math.floor((z - W.Z0) / W.CELL) * W.N + Math.floor((x - W.X0) / W.CELL);
        const inRect = (r, x, z) => { const c = Math.cos(r.yaw), s = Math.sin(r.yaw), dx = x - r.x, dz = z - r.z; return Math.abs(dx * c - dz * s) <= r.w / 2 && Math.abs(dx * s + dz * c) <= r.d / 2; };
        const bs = R.board.booths().filter(b => b.id === K.depot.id), strip = bs.find(b => b.part === 'strip'), door = bs.find(b => b.part === 'door');
        const start = { x: S.player.x, z: S.player.z };
        R.send({ t: 'staffWindow', st: 'hub' });
        let blocked = 0, viaDoor = false, on = null, sold0 = S.pax.sold.hub || 0;
        for (let i = 0; i < 80 && !on; i++) {
          R.step(1);
          if (!G.cost[cell(S.player.x, S.player.z)]) blocked++;
          if (inRect(door, S.player.x, S.player.z) && !inRect(strip, S.player.x, S.player.z)) viaDoor = true;
          if (S.pax.desk && S.pax.desk.on) on = i + 1;
        }
        const inStrip = inRect(strip, S.player.x, S.player.z), staffD = Math.hypot(S.player.x - K.staff.x, S.player.z - K.staff.z);
        for (let i = 0; i < 40; i++) R.step(1);
        // Willow Ford's booth is in the same walk-grid area as its platform.
        const KW = R.pax.paxStation('willow'), wfSame = G.comp[cell(KW.staff.x, KW.staff.z)] >= 0 && G.comp[cell(KW.staff.x, KW.staff.z)] === G.comp[cell(KW.line.x, KW.line.z)];
        return { start, on, blocked, viaDoor, inStrip, staffD, sold: (S.pax.sold.hub || 0) - sold0, wfSame, staffInside: inRect(strip, K.staff.x, K.staff.z), lineOut: !bs.some(r => inRect(r, K.line.x, K.line.z) && r.part === 'strip') };
      });
      if (!booth.staffInside) P(`${orientation}: the ticket spot is not inside the hub depot's booth`);
      if (!booth.lineOut) P(`${orientation}: the queue's start is inside the booth (it should be outside on the platform)`);
      if (!booth.on) P(`${orientation}: the player did not reach the booth's counter and staff it within 80 ticks`);
      if (booth.blocked) P(`${orientation}: the walk into the booth crossed ${booth.blocked} blocked cells`);
      if (!booth.viaDoor) P(`${orientation}: the player did not go in by the door`);
      if (!booth.inStrip || booth.staffD > 0.5) P(`${orientation}: staffed but not at the counter (${booth.staffD.toFixed(2)}u from it, in the booth: ${booth.inStrip})`);
      if (!(booth.sold >= 8)) P(`${orientation}: only ${booth.sold} tickets sold in 40 ticks from the booth (one every 30 game seconds is about 10)`);
      if (!booth.wfSame) P(`${orientation}: Willow Ford's booth cannot be reached from its platform`);
      await R(() => { window.__railhead.camera.zoom = 2.5; window.__railhead.camera.ox = 0; window.__railhead.camera.oz = 0; });
      await drawnFrames(1500, 6);
      const sh = await R(() => { const m = window.__railhead.board.shell.mesh.material; return { op: m.opacity, dw: m.depthWrite, dc: window.__railhead.drawCalls }; });
      if (!(sh.op <= 0.2) || sh.dw) P(`${orientation}: in the booth the depot's shell should be see-through: opacity ${sh.op.toFixed(2)}, depth writes ${sh.dw}`);
      await page.screenshot({ path: screenshotPath('booth-' + orientation) });
      dcs.push({ what: `in the booth ${orientation} zoom 2.5 (passengers scenario)`, dc: sh.dc });
      if (orientation === 'portrait') {
        await R(() => { window.__railhead.state.time = 23 * 3600; window.__railhead.camera.zoom = 3; });
        await frames(1200);
        await page.screenshot({ path: screenshotPath('booth-night-' + orientation) });
      }
      // Out again: the shell turns solid.
      await R(() => { const R = window.__railhead, K = R.pax.paxStation('hub'); R.send({ t: 'walkTo', x: Math.round(K.line.x * 100), z: Math.round((K.line.z + 1) * 100) }); R.step(40); });
      await drawnFrames(1500, 6);
      const sh2 = await R(() => { const m = window.__railhead.board.shell.mesh.material; return { op: m.opacity, dw: m.depthWrite, desk: window.__railhead.state.pax.desk }; });
      if (!(sh2.op >= 0.999) || !sh2.dw) P(`${orientation}: back on the platform the shell should be solid again: opacity ${sh2.op.toFixed(2)}`);
      if (sh2.desk) P(`${orientation}: walking out of the booth should stop the sales`);
      // A player saved inside the depot's closed part walks out.
      const esc = await R(() => {
        const R = window.__railhead, S = R.state, at = R.world.layout.find(a => a.id === 'depot'), K = R.pax.paxStation('hub');
        S.player.x = at.x - 1; S.player.z = at.z - 0.8; S.player.mode = 'idle';
        R.importSave(R.exportSave());
        R.send({ t: 'walkTo', x: Math.round(K.line.x * 100), z: Math.round(K.line.z * 100) }); R.step(90);   // (D20: the walk is 2.0)
        const P = R.state.player;
        return Math.hypot(P.x - K.line.x, P.z - K.line.z);
      });
      if (!(esc < 0.3)) P(`${orientation}: a player saved inside the depot did not walk out to the platform (${esc.toFixed(2)}u short)`);

      // ---- 7. The busy hub zoomed out (both boards' mesh and the shells in the frame) ----
      await R(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.setCrowd && R.setCrowd(200); R.camera.zoom = 0.4; R.camera.ox = 0; R.camera.oz = 0; });
      await frames(1500);
      const busy = await R(() => window.__railhead.drawCalls);
      dcs.push({ what: `hub zoomed out to 0.4 with 200 walkers ${orientation}`, dc: busy });
      await R(() => { const R = window.__railhead; R.setCrowd && R.setCrowd(0); });
      if (errors.length) P(`${orientation}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  for (const d of dcs) if (!(d.dc < 100)) problems.push(`draw calls ${d.dc} (${d.what}), budget under 100`);
  console.log('  draw calls: ' + dcs.map(d => `${d.dc} ${d.what}`).join('; '));
  return problems;
};
