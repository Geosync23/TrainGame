// Check: clarity (D21, the designer: "it isn't clear where to take a contract, which is your train, why the hub says
// no engine on the timetable"). All five parts:
// 1. No. 1 starts on both Willow Ford runs in a new game (the test yard has none), and the morning train leaves the
//    hub at 08:00 with no command at all; the office still takes her off one run and puts her back; old saves load
//    with their services as saved; the tutorial's last telegram does not ask for what is already done (and does when
//    she was taken off).
// 2. Contracts at the work board: accept and order there (the same commands), still at the telegraph key, refused
//    away from all three with words naming the work board; the tutorial's contract step points at the work board and
//    its telegram says so. The offers are pinned on the board in the world and in its card. The roof sign "WORK
//    BOARD" stands over the booth door, is seen first from the platform at zoom 1.5 (nothing in front of it) and is at
//    least 24 px tall there; a real tap on it walks the player into the booth and opens the card, where Accept and the
//    order button work by touch (the money on screen goes down by the order's cost).
// 3. Your train: the plate "No. 1, yours" over No. 1 from the start (arrows on or off), 30 px tall at any zoom, and a
//    plain grey "Overland" plate over the Overland's engine; the yellow stripe on our engine and cars and on none of
//    the Overland's; the plates cost at most 1 draw call and change nothing in the game.
// 4. A run with no engine reads "Not running: needs an engine" on the public schedule board, the work board and the
//    station card (and "No engine" nowhere); a real tap on that row of the station card opens No. 1's panel with the
//    arrow at its Timetable button, whose tap puts her back on; the work board card's "Put an engine on it" does the
//    same; with her still on the other run the office opens at its Timetable tab instead.
// 5. The Next job line: shown at the start (48 px tall, nothing overlapping it, portrait and landscape), the tutorial's
//    step during the tutorial, then the most pressing job in words with game times (take a contract at the work board;
//    "sell tickets, N waiting at the hub"; "set switch 1 for the turn-off by 08:07"); the same place as the helper
//    arrows (one source of truth); a tap shows the arrow with the arrows off and a second tap hides it; Settings
//    hides it, kept in the browser across a reload. Screenshots clarity-*.png.

const fs = require('fs');
const path = require('path');
const { openGame, screenshotPath } = require('./browser');

const IDS = ['clock', 'speeds', 'cash', 'buildBtn', 'tgBtn', 'rotL', 'rotR', 'lookBtn', 'officeBtn', 'workBtn', 'centre', 'tutTask', 'nextJob', 'tgSlide', 'panel', 'office', 'inbox', 'workCard', 'settings', 'lookCard'];
const LAYOUT = ids => {
  const vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const boxes = [];
  for (const id of ids) {
    const e = document.getElementById(id);
    // (The slide-in counts once it has slid in: mid-slide it is partly off the screen on purpose.)
    if (!vis(e) || (id === 'tgSlide' && (!e.classList.contains('show') || !/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(e).transform)))) continue;
    boxes.push({ id, r: e.getBoundingClientRect() });
  }
  const out = [], W = innerWidth, H = innerHeight;
  for (const b of boxes) if (b.r.left < -0.5 || b.r.top < -0.5 || b.r.right > W + 0.5 || b.r.bottom > H + 0.5) out.push(b.id + ' off screen');
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i].r, b = boxes[j].r;
    if (a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5) out.push(boxes[i].id + '/' + boxes[j].id);
  }
  const n = document.getElementById('nextJob'), nr = vis(n) ? n.getBoundingClientRect() : null;
  return { overlaps: out, next: nr && { x: nr.x, y: nr.y, w: nr.width, h: nr.height, b: nr.bottom, text: n.textContent } };
};

module.exports = async function checkClarity() {
  const problems = [], P = m => problems.push(m);
  const fixtures = fs.readdirSync(path.join(__dirname, 'fixtures')).filter(f => /^save-v\d+\.json$/.test(f)).map(f => ({ f, save: JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8')).save }));
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused' });
    const R = (f, a) => page.evaluate(f, a);
    const frames = async (ms) => { await page.waitForTimeout(ms || 450); };
    const tapSel = async sel => { const b = await page.$(sel); if (b) await b.evaluate(e => e.scrollIntoView({ block: 'nearest' })); const r = b && await b.boundingBox(); if (!r) return false; await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await frames(300); return true; };
    try {
      // ---------------- 1 and 2 in the sim (once) ----------------
      if (orient === 'portrait') {
        const s = await R(fx => {
          const R = window.__railhead, out = {};
          const S = R.newState(1866); out.start = S.tt.services.map(v => v.train);
          out.yard = R.newState(1866, 'yard').tt.services.map(v => v.train);
          const dep = [];
          for (let i = 0; i < 3.5 * 3600 / 8; i++) for (const e of R.simTick(S, [])) if (e.t === 'ttDeparted') dep.push({ svc: e.svc, i: e.i, at: R.econ.econWhen(S.time) });
          out.departed = dep;
          const T = R.newState(1866);
          R.simTick(T, [{ t: 'ttAssign', tr: 0, on: false, svc: 1 }]); out.off = T.tt.services.map(v => v.train);
          R.simTick(T, [{ t: 'ttAssign', tr: 0, on: true, svc: 1 }]); out.back = T.tt.services.map(v => v.train);
          const last = R.tut.TUT_STEPS[R.tut.TUT_STEPS.length - 1];
          out.lastOn = last.body(R.newState(1866)); const U = R.newState(1866); U.tt.services[1].train = null; out.lastOff = last.body(U);
          // Old saves: the services as saved (no migration puts an engine on them).
          out.old = fx.map(({ f, save }) => { const raw = JSON.parse(save).state, m = R.migrate(JSON.parse(save)).state;
            return { f, raw: raw.tt ? raw.tt.services.map(v => v.train) : null, now: m.tt.services.map(v => v.train) }; });
          // Contracts at the work board (D21 (2)), the same commands; at the key; refused away from all.
          const at = (st, x, z) => { st.player.x = x; st.player.z = z; st.player.mode = 'idle'; };
          const w = R.guide.econWorkBoardSpot(), k = R.econ.econTelegraphKey();
          const A = R.newState(1866); R.simTick(A, []); at(A, w.x, w.z);
          const flour = A.econ.contracts.find(c => c.status === 'OFFERED' && c.commodity === 'flour');
          const evA = R.simTick(A, [{ t: 'contractAccept', id: flour.id }]);
          const cash0 = A.econ.cash, evO = R.simTick(A, [{ t: 'econOrder', lines: [{ c: 'flour', n: flour.quantity, contract: flour.id }] }]);
          out.board = { accepted: A.econ.contracts[flour.id].status, ordered: evO.some(e => e.t === 'orderPlaced'), paid: cash0 - A.econ.cash, booth: R.board.wbBoothStation(w.x, w.z) };
          const B = R.newState(1866); R.simTick(B, []); at(B, k.x, k.z);
          R.simTick(B, [{ t: 'contractAccept', id: 0 }]); out.key = B.econ.contracts[0].status;
          const C = R.newState(1866); R.simTick(C, []);
          const evC = R.simTick(C, [{ t: 'contractAccept', id: 0 }]); out.away = { status: C.econ.contracts[0].status, why: (evC.find(e => e.t === 'econRefused') || {}).why };
          // The tutorial's contract step: its place is the work board, its telegram names it.
          const D = R.newState(1866); R.simTick(D, []); R.simTick(D, [{ t: 'tgAnswer', id: D.tut.tg, b: 0 }]); R.simTick(D, []);
          out.tut = { cur: R.tut.tutCurrent(D), target: R.tut.tutTarget(D), body: D.tg.list.find(g => g.id === D.tut.tg).body, w };
          out.hash = [R.stateHash(A), R.stateHash(B)];
          return out;
        }, fixtures);
        if (s.start.join() !== '0,0') P(`1: a new game should start with No. 1 on both runs: ${s.start}`);
        if (s.yard.some(v => v !== null)) P(`1: the test yard should keep its services without an engine: ${s.yard}`);
        if (!s.departed.some(d => d.svc === 0 && d.i === 0 && /08:0\d/.test(d.at))) P(`1: the morning train should leave the hub at 08:00 with no command: ${JSON.stringify(s.departed)}`);
        if (s.off.join() !== '0,' || s.back.join() !== '0,0') P(`1: the office should still take No. 1 off one run and put her back: ${s.off} / ${s.back}`);
        if (/Put No\. 1 (back )?on the timetable/.test(s.lastOn) || !/runs both Willow Ford trains/.test(s.lastOn)) P(`1: the tutorial's last telegram asks for what is done: ${s.lastOn}`);
        if (!/Put No\. 1 back on the timetable/.test(s.lastOff)) P(`1: taken off, the last telegram should ask to put her back: ${s.lastOff}`);
        for (const o of s.old) if (o.raw ? o.raw.join() !== o.now.join() : o.now.some(v => v !== null)) P(`1: ${o.f} loads with its services changed: ${JSON.stringify(o)}`);
        if (s.board.accepted !== 'ACTIVE' || !s.board.ordered || !(s.board.paid > 0) || s.board.booth !== 'hub') P(`2: accepting and ordering at the work board: ${JSON.stringify(s.board)}`);
        if (s.key !== 'ACTIVE') P(`2: the telegraph key should still take contracts: ${s.key}`);
        if (s.away.status !== 'OFFERED' || !/work board/.test(s.away.why || '')) P(`2: away from the board, key and desk a contract is refused, naming the work board: ${JSON.stringify(s.away)}`);
        if (!s.tut.cur || s.tut.cur.key !== 'accept' || !s.tut.target || s.tut.target.k !== 'workboard' || Math.hypot(s.tut.target.x - s.tut.w.x, s.tut.target.z - s.tut.w.z) > 0.01) P(`2: the tutorial's contract step should point at the work board: ${JSON.stringify(s.tut)}`);
        if (!/work board/.test(s.tut.body) || /telegraph key/.test(s.tut.body)) P(`2: the contract telegram should name the work board: ${s.tut.body}`);
        console.log(`  1: a new game: services ${s.start}; departures with no command: ${s.departed.map(d => `svc ${d.svc} stop ${d.i} ${d.at}`).join(', ')}; ${s.old.length} old saves keep their services`);
        console.log(`  2: at the work board: accepted ${s.board.accepted}, ordered for $${(s.board.paid / 100).toFixed(2)}; away: "${s.away.why}"`);
      }

      // ---------------- The page: a new game ----------------
      await R(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.step(2); R.send({ t: 'tgAnswer', id: R.state.tut.tg, b: 0 }); R.step(2);
        for (let i = 0; i < 300; i++) R.step(1); R.camera.zoom = 1.5; R.camera.ox = 0; R.camera.oz = 0; });   // 05:40
      await frames(700);
      // 5: the Next job line at the start: the tutorial's step.
      const L0 = await R(LAYOUT, IDS), j0 = await R(() => window.__railhead.guide.job());
      if (!L0.next || L0.next.h < 48 || L0.next.w < 120) P(`${orient} 5: the Next job line should show at the start, 48 px tall: ${JSON.stringify(L0.next)}`);
      else if (!/^Tutorial: take a contract at the work board/.test(L0.next.text)) P(`${orient} 5: during the tutorial the line names its step: ${L0.next.text}`);
      if (L0.overlaps.length) P(`${orient} 5: page elements overlap at the start: ${L0.overlaps.join(', ')}`);
      if (j0.t && j0.t.k !== 'workboard') P(`${orient} 5: the line and the arrows should name the same place: ${JSON.stringify(j0)}`);
      // 3: the plate over No. 1 (with the camera on her) and the boards' real times.
      await R(() => { const R = window.__railhead, P = R.state.player, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; R.camera.ox = (p.x - P.x) * 0.6; R.camera.oz = (p.z - P.z) * 0.6; });
      await frames(700);
      await page.screenshot({ path: screenshotPath(`clarity-start-${orient}`) });
      const pl = await R(() => { const R = window.__railhead, sh = R.guide.plates.shown, p = R.trainPoses(R.state.track, R.state.trains[0])[0];
        return { sh, at: R.toScreen(p.x, p.z, 0), sched: R.board.schedRows(R.state, 'hub').map(r => r.state), dc: R.drawCalls }; });
      const mine = pl.sh.find(p => p.tr === 0);
      if (!mine || mine.text !== 'No. 1, yours' || !mine.ours) P(`${orient} 3: the plate "No. 1, yours" should stand over No. 1: ${JSON.stringify(pl.sh)}`);
      if (mine && Math.abs(mine.hPx - 30) > 0.5) P(`${orient} 3: the plate should be 30 px tall: ${mine.hPx}`);
      if (pl.sched.some(s => s !== 'On time')) P(`${orient} 1: the hub's schedule board should show real times (On time) at the start: ${pl.sched}`);
      // Plates are 30 px at other zooms too, cost at most 1 draw call and change nothing in the game.
      const z = await R(async () => {
        const R = window.__railhead, out = [], wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        for (const zz of [0.6, 3]) { R.camera.zoom = zz; await wait(); await wait(); out.push(R.guide.plates.shown.map(p => p.hPx)); }
        R.camera.zoom = 1.5; await wait(); await wait();
        const h0 = R.hash(), on = R.drawCalls; R.guide.plates.mesh.visible = false; R.guide.plates.mesh.material.visible = false; await wait(); await wait();
        const off = R.drawCalls; R.guide.plates.mesh.material.visible = true; await wait(); await wait();
        return { out, on, off, same: h0 === R.hash() };
      });
      if (z.out.some(l => l.some(h => Math.abs(h - 30) > 0.5))) P(`${orient} 3: plates should stay 30 px tall at any zoom: ${JSON.stringify(z.out)}`);
      if (z.on - z.off > 1) P(`${orient} 3: the plates cost ${z.on - z.off} draw calls (at most 1)`);
      if (!z.same) P(`${orient} 3: drawing the plates changed the game's state`);
      // The stripe: on our engine and cars, on none of the Overland's.
      const st = await R(() => {
        const R = window.__railhead, THREE = window.THREE, c = new THREE.Color(R.guide.OUR_STRIPE), out = [];
        R.three.scene.traverse(o => { if (o.isMesh && o.userData && o.userData.stock !== undefined && o.geometry.attributes.color) {
          const a = o.geometry.attributes.color; let has = false;
          for (let i = 0; i < a.count && !has; i++) has = Math.abs(a.getX(i) - c.r) < 1e-3 && Math.abs(a.getY(i) - c.g) < 1e-3 && Math.abs(a.getZ(i) - c.b) < 1e-3;
          const tr = R.state.trains[o.userData.train];
          out.push({ stock: o.userData.stock, ours: !!tr && tr.owner !== 'overland' && o.userData.stock < 100, has });
        } });
        return out;
      });
      if (!st.length || st.some(v => v.ours !== v.has)) P(`${orient} 3: the stripe should be on our engine and cars only: ${JSON.stringify(st)}`);

      // ---------------- 2: the work board from the platform, the sign, the card ----------------
      const sg = await R(() => {
        const R = window.__railhead, THREE = window.THREE, S = R.state, K = R.pax.paxStation('hub');
        S.player.x = K.line.x; S.player.z = K.line.z; S.player.mode = 'idle';     // on the platform in front of the window (drawing check)
        const b = R.board.list.find(b => b.kind === 'sign' && b.st === 'hub'); R.camera.zoom = 1.5; R.camera.ox = (b.x - S.player.x) * 0.5; R.camera.oz = (b.z - S.player.z) * 0.5;
        return !!b;
      });
      if (!sg) P(`${orient} 2: the hub's depot has no WORK BOARD roof sign`);
      await frames(900);
      await page.screenshot({ path: screenshotPath(`clarity-workboard-platform-${orient}`) });
      const seen = await R(() => {
        const R = window.__railhead, THREE = window.THREE, b = R.board.list.find(b => b.kind === 'sign' && b.st === 'hub');
        const c = R.toScreen(b.x, b.z, b.y), top = R.toScreen(b.x, b.z, b.y + b.h / 2), bot = R.toScreen(b.x, b.z, b.y - b.h / 2);
        const ray = new THREE.Raycaster(), v = new THREE.Vector2(c.x / innerWidth * 2 - 1, -(c.y / innerHeight) * 2 + 1);
        ray.setFromCamera(v, R.three.camera);
        const hits = ray.intersectObjects(R.three.scene.children, true);
        const first = hits.find(h => h.object.visible && h.object.name !== 'guideArrow' && h.object.name !== 'guideDots' && h.object.name !== 'trainPlates');
        const face = first && first.object === R.board.mesh ? R.board.list[Math.floor(first.faceIndex / 2)] : null;
        // Nothing of the page over it either.
        const el = document.elementFromPoint(c.x, c.y);
        // (Tapped a quarter of the way up from its foot: since D22 the sign is bigger and in landscape its middle comes
        // within a finger's reach of the Next job line, which a phone's touch adjustment would give the tap to.)
        const tap = R.toScreen(b.x, b.z, b.y - b.h / 4);
        return { c, tap, h: bot.y - top.y, first: first && first.object.name, kind: face && face.kind, st: face && face.st, el: el && el.tagName, onScreen: c.x > 0 && c.x < innerWidth && c.y > 0 && c.y < innerHeight };
      });
      if (!seen.onScreen || seen.kind !== 'sign' || seen.st !== 'hub' || seen.el !== 'CANVAS') P(`${orient} 2: the WORK BOARD sign should be seen first from the platform at zoom 1.5: ${JSON.stringify(seen)}`);
      if (!(seen.h >= 24)) P(`${orient} 2: the WORK BOARD sign should be at least 24 px tall at zoom 1.5: ${seen.h}`);
      // The world board's pinned offers (the hub's work board drawing).
      const pin = await R(() => { const R = window.__railhead, w = R.board.list.find(b => b.kind === 'work' && b.st === 'hub'); return { drawn: (w.offers || []).map(o => o.id), offers: R.state.econ.contracts.filter(k => k.status === 'OFFERED').map(k => k.id) }; });
      if (!pin.offers.length || pin.drawn.join() !== pin.offers.join()) P(`${orient} 2: the offers should be pinned on the work board in the world: ${JSON.stringify(pin)}`);
      // A real tap on the sign: the player walks in and the card opens with the offers.
      await page.touchscreen.tap(seen.tap.x, seen.tap.y);
      await frames(200);
      await R(() => { const R = window.__railhead; for (let i = 0; i < 300 && (R.state.player.mode === 'to' || i < 2); i++) R.step(1); });
      await frames(600);
      const card = await R(() => { const R = window.__railhead, P = R.state.player; return { open: R.board.workUi.open, booth: R.board.wbBoothStation(P.x, P.z), accept: document.querySelectorAll('#workBody [data-act="accept"]').length, cash: document.getElementById('cash').textContent }; });
      if (!card.open || card.booth !== 'hub' || !card.accept) P(`${orient} 2: a tap on the roof sign should walk into the booth and open the card with the offers: ${JSON.stringify(card)}`);
      await page.screenshot({ path: screenshotPath(`clarity-workcard-${orient}`) });
      if (card.accept) {
        await tapSel('#workBody [data-act="accept"]');
        const k1 = await R(() => { const R = window.__railhead; return { act: R.state.econ.contracts.filter(k => k.status === 'ACTIVE').length, order: !!document.querySelector('#workBody [data-act="orderFor"]') }; });
        if (!k1.act || !k1.order) P(`${orient} 2: Accept by touch on the work board card should take the contract and show its order button: ${JSON.stringify(k1)}`);
        if (k1.order) {
          await tapSel('#workBody [data-act="orderFor"]');
          const k2 = await R(() => { const R = window.__railhead; return { orders: R.state.econ.orders.length, cash: document.getElementById('cash').textContent, money: R.econ.econCheckMoney(R.state) }; });
          if (!k2.orders || k2.cash === card.cash) P(`${orient} 2: the card's order button should order the goods (cash on screen down): ${JSON.stringify({ k2, before: card.cash })}`);
          else console.log(`  ${orient} 2: by touch at the work board: accepted, ordered (${card.cash} to ${k2.cash})`);
        }
      }
      await R(() => window.__railhead.board.closeWorkCard());

      // ---------------- 4: a run with no engine ----------------
      await R(() => { const R = window.__railhead; R.send({ t: 'ttAssign', tr: 0, on: false }); R.step(1); });
      const ne = await R(() => {
        const R = window.__railhead, S = R.state, N = R.guide.TT_NO_ENGINE;
        const sched = R.board.schedRows(S, 'hub').map(r => r.state), wb = R.board.wbRows('hub').filter(r => r.svc !== 'overland').map(r => r.state), card = R.tt.ttBoard(S, 'hub').lines.map(l => l.state);
        const world = R.board.list.find(b => b.kind === 'work' && b.st === 'hub').rows.map(r => r.marks.map(m => m[0]).join(' '));
        return { N, sched, wb, card, world };
      });
      for (const [k, l] of [['schedule board', ne.sched], ['work board', ne.wb], ['station card', ne.card]]) if (!l.length || l.some(s => s !== ne.N)) P(`${orient} 4: the ${k} should say "${ne.N}": ${JSON.stringify(l)}`);
      if (JSON.stringify(ne).replace(/Not running: needs an engine/g, '').match(/No engine/i)) P(`${orient} 4: "No engine" wording is still shown: ${JSON.stringify(ne)}`);
      // The station card's row by real touch: No. 1's panel, the arrow at Timetable, then Timetable puts her on.
      await R(() => { const R = window.__railhead, P = R.state.player, b = R.board.list.find(b => b.kind === 'sched' && b.st === 'hub'); R.camera.ox = b.x - P.x; R.camera.oz = b.z - P.z + 2; R.guide.ttCardPin('hub'); });
      await frames(700);
      const row = await R(() => { const b = document.querySelector('#ttCard .ttNeed'), c = document.getElementById('ttCard'); if (!b || c.hidden || getComputedStyle(c).visibility === 'hidden') return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: r.height, text: b.textContent }; });
      await page.screenshot({ path: screenshotPath(`clarity-noengine-card-${orient}`) });
      if (!row || row.h < 48 || !/Not running: needs an engine/.test(row.text)) P(`${orient} 4: the station card's row should be a 48 px button reading "Not running: needs an engine": ${JSON.stringify(row)}`);
      else {
        await page.touchscreen.tap(row.x, row.y);
        await frames(700);
        const g = await R(() => { const R = window.__railhead, e = document.getElementById('guideEdge'), b = document.getElementById('ttToggle').getBoundingClientRect(), er = e.getBoundingClientRect();
          return { panel: !document.getElementById('panel').hidden, t: R.guide.now(), edge: !e.hidden, ex: er.x, ey: er.y + er.height / 2, br: b.right, by: b.y, bb: b.bottom }; });
        if (!g.panel || !g.t || g.t.el !== 'ttToggle' || !g.edge || g.ex < g.br || g.ey < g.by || g.ey > g.bb) P(`${orient} 4: tapping the row should open No. 1's panel with the arrow at Timetable: ${JSON.stringify(g)}`);
        await tapSel('#ttToggle');
        await R(() => window.__railhead.step(1));
        const on = await R(() => window.__railhead.state.tt.services.map(v => v.train));
        if (on.join() !== '0,0') P(`${orient} 4: Timetable after the row's tap should put No. 1 back on both runs: ${on}`);
        await tapSel('#panelClose');
      }
      // The work board card's button; with her still on the afternoon run, the office's Timetable tab instead (the
      // card lists the next 6 hours: the morning run).
      await R(() => { const R = window.__railhead; R.send({ t: 'ttAssign', tr: 0, on: false, svc: 0 }); R.step(1); R.board.openWorkCard('hub', false); });
      await frames(400);
      const eb = await page.$('#workBody [data-act="engine"]');
      if (!eb) { P(`${orient} 4: the work board card should have "Put an engine on it" for the morning run`); await R(() => window.__railhead.board.closeWorkCard()); }
      else {
        await tapSel('#workBody [data-act="engine"]');
        await R(() => { const R = window.__railhead; for (let i = 0; i < 400 && (R.state.player.mode === 'to' || i < 2); i++) R.step(1); });
        await frames(500);
        const of = await R(() => { const R = window.__railhead, u = R.office.ui.office; return { open: u.open, tab: u.tab, start: !!document.querySelector('#officeBody [data-act="ttOn"]') }; });
        await page.screenshot({ path: screenshotPath(`clarity-noengine-office-${orient}`) });
        if (!of.open || of.tab !== 'timetable' || !of.start) P(`${orient} 4: with No. 1 on the other run, "Put an engine on it" should open the office at its Timetable tab: ${JSON.stringify(of)}`);
        else { await tapSel('#officeBody [data-act="ttOn"]'); await R(() => window.__railhead.step(1)); }
        const on2 = await R(() => window.__railhead.state.tt.services.map(v => v.train));
        if (on2.join() !== '0,0') P(`${orient} 4: the office's Start should put No. 1 on the morning run: ${on2}`);
        await R(() => window.__railhead.office.ui.office.open && document.getElementById('officeClose').click());
      }

      // ---------------- 5: after Skip, the most pressing job; the tap; settings ----------------
      await R(() => { try { localStorage.removeItem('railhead-arrows'); localStorage.removeItem('railhead-nextjob'); } catch (e) { /* none */ } const R = window.__railhead; R.guide.ui.pref = null; R.guide.next.pref = null;
        R.importSave(JSON.stringify({ state: R.newState(1866) })); R.step(2); R.send({ t: 'tgAnswer', id: R.state.tut.tg, b: 1 }); R.step(2); R.camera.ox = 0; R.camera.oz = 0; });
      await frames(600);
      // D22 (7): a new game starts with switch 1 set straight, so the first job is to set it for the turn-off by 08:07;
      // thrown, the line goes on to the contract (as at the start before D22).
      const n0 = await R(() => { const R = window.__railhead, t = document.getElementById('nextJobText').textContent; R.send({ t: 'throwSwitch', sw: 1 }); R.step(2); return t; });
      if (n0 !== 'Next: set switch 1 for the turn-off by 08:07') P(`${orient} 5: at 05:00 after Skip, the line should say "Next: set switch 1 for the turn-off by 08:07" (D22: switch 1 starts straight): ${n0}`);
      await frames(600);
      const n1 = await R(() => { const R = window.__railhead; return { text: document.getElementById('nextJobText').textContent, job: R.guide.job(), hint: R.guide.hintTarget() }; });
      if (n1.text !== 'Next: take a contract at the work board' || !n1.hint || n1.hint.k !== 'workboard') P(`${orient} 5: at 05:00 after Skip, the line should say "Next: take a contract at the work board": ${JSON.stringify(n1)}`);
      // A tap shows the arrow (arrows off); a second tap hides it.
      const tap0 = await R(() => window.__railhead.guide.now());
      await tapSel('#nextJob'); await frames(500);
      const tap1 = await R(() => { const R = window.__railhead, A = R.guide.ui.arrow, t = R.guide.now(); return { t, arrow: !!A && A.visible, pressed: document.getElementById('nextJob').getAttribute('aria-pressed') }; });
      await tapSel('#nextJob'); await frames(400);
      const tap2 = await R(() => { const R = window.__railhead, A = R.guide.ui.arrow; return { t: R.guide.now(), arrow: !!A && A.visible }; });
      if (tap0 || !tap1.t || tap1.t.k !== n1.hint.k || Math.hypot(tap1.t.x - n1.hint.x, tap1.t.z - n1.hint.z) > 0.01 || !tap1.arrow || tap1.pressed !== 'true') P(`${orient} 5: a tap on the line should show the arrow at its place (the arrows off): ${JSON.stringify({ tap0, tap1, hint: n1.hint })}`);
      if (tap2.t || tap2.arrow) P(`${orient} 5: a second tap should hide the arrow again: ${JSON.stringify(tap2)}`);
      // Tickets with game words; a switch with its time.
      const n2 = await R(() => { const R = window.__railhead, S = R.state; S.econ.contracts.forEach(k => { if (k.status === 'OFFERED') k.status = 'DECLINED'; });   // drawing check: no offers left
        R.step(2 * 3600 / 8 + 120); const q = S.pax.list.filter(p => p.st === 'hub' && p.s === 'queue').length; R.guide.job();
        const a = R.guide.job().text;
        R.send({ t: 'throwSwitch', sw: 1 }); R.step(10); const need = R.tt.ttSwitchNeeds(S).find(n => !n.done); const b = R.guide.job().text;
        return { q, a, b, need: need && { sw: need.sw, want: need.want, by: need.by } }; });
      if (!n2.q || n2.a !== `Next: sell tickets, ${n2.q} waiting at the hub`) P(`${orient} 5: with travellers in line the line should say "Next: sell tickets, ${n2.q} waiting at the hub": ${n2.a}`);
      if (!n2.need) P(`${orient} 5: no switch need to test the line's words`);
      else if (n2.b !== `Next: set switch ${n2.need.sw} ${n2.need.want === 'reverse' ? 'for the turn-off' : 'straight'} by ${n2.need.by}`) P(`${orient} 5: the switch line: ${n2.b} (need ${JSON.stringify(n2.need)})`);
      if (orient === 'portrait') console.log(`  5: "${n0}"; "${n1.text}"; "${n2.a}"; "${n2.b}"`);
      await frames(900);   // the slide-in's move in (0.3 s) is over
      const L1 = await R(LAYOUT, IDS);
      if (L1.overlaps.length) P(`${orient} 5: page elements overlap after Skip: ${L1.overlaps.join(', ')}`);
      // Settings: hide the line; kept across a reload; on again.
      const gb = await R(() => { const g = document.getElementById('setBtn').getBoundingClientRect(); return { h: g.height, w: g.width }; });
      await tapSel('#setBtn'); await frames(300);
      await page.screenshot({ path: screenshotPath(`clarity-settings-${orient}`) });
      const sb = await R(() => { const b = document.getElementById('setNext').getBoundingClientRect(); return { open: !document.getElementById('settings').hidden, h: b.height, w: b.width }; });
      sb.gh = gb.h; sb.gw = gb.w;
      if (!sb.open || sb.h < 48 || sb.w < 48 || sb.gh < 48 || sb.gw < 48) P(`${orient} 5: Settings should open with 48 px buttons: ${JSON.stringify(sb)}`);
      const L2 = await R(LAYOUT, IDS);
      if (L2.overlaps.length) P(`${orient} 5: page elements overlap with Settings open: ${L2.overlaps.join(', ')}`);
      await tapSel('#setNext'); await frames(300);
      const off = await R(() => { let v = null; try { v = localStorage.getItem('railhead-nextjob'); } catch (e) { /* none */ } return { hidden: document.getElementById('nextJob').hidden, v }; });
      if (!off.hidden || off.v !== 'off') P(`${orient} 5: Settings should hide the line and keep the choice in the browser: ${JSON.stringify(off)}`);
      await R(() => window.__railhead.saveGame && window.__railhead.saveGame());
      await page.reload(); await page.waitForFunction(() => window.__railhead && window.__railhead.ready, null, { timeout: 15000 }); await frames(600);
      const rl = await R(() => document.getElementById('nextJob').hidden);
      if (!rl) P(`${orient} 5: the line should stay hidden after a reload`);
      await R(() => window.__railhead.guide.nextSetPref(true)); await frames(300);
      if (await R(() => document.getElementById('nextJob').hidden)) P(`${orient} 5: Settings on should show the line again`);

      // ---------------- 3: the Overland's plate ----------------
      await R(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.step(2); R.send({ t: 'tutorialSkip' });
        for (let i = 0; i < 2000 && (R.state.overland.phase === 'away' || R.state.overland.phase === 'in'); i++) R.step(1); });   // standing at the interchange
      await R(() => { const R = window.__railhead, O = R.state.trains.find(t => t.owner === 'overland'), p = R.trainPoses(R.state.track, O)[0], P = R.state.player; if (p) { R.camera.zoom = 1.5; R.camera.ox = p.x - P.x; R.camera.oz = p.z - P.z - 2; } });
      await frames(900);
      const ov = await R(() => { const R = window.__railhead; return { phase: R.state.overland.phase, sh: R.guide.plates.shown }; });
      await page.screenshot({ path: screenshotPath(`clarity-overland-${orient}`) });
      const op = ov.sh.find(p => !p.ours);
      if (!op || op.text !== 'Overland' || Math.abs(op.hPx - 30) > 0.5) P(`${orient} 3: the Overland's engine should carry a grey "Overland" plate: ${JSON.stringify(ov)}`);
      if (ov.sh.filter(p => p.ours).some(p => p.text !== 'No. 1, yours')) P(`${orient} 3: our plate's words: ${JSON.stringify(ov.sh)}`);
      console.log(`  ${orient}: Next job line ${Math.round(L0.next.w)}x${Math.round(L0.next.h)} at (${Math.round(L0.next.x)}, ${Math.round(L0.next.y)}); plates ${pl.sh.map(p => p.text).join(', ')} then ${ov.sh.map(p => p.text).join(', ')}; draw calls ${pl.dc} (plates +${z.on - z.off}); sign ${Math.round(seen.h)} px tall at zoom 1.5`);
      if (errors.length) P(`${orient}: console errors: ` + errors.join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
