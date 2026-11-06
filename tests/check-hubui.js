// Check: the screen guidance for the station rework (D24, builder UI; plans/rework-tech.md "the split of work").
// Until TR's moving trains, PX's tickets and CG's goods are merged, the check stands two railroad trains at their tracks
// with the foundation's scenario (rrDebugScenario: a passenger train at the platform, a freight train at the cargo
// track) and puts small fakes of PX's and TR's parts in the page: pxCarStatus (travellers aboard per car), cgCarStatus
// (goods for the hub per car), the checkTickets command (checks a car at once) and the rrWaveOff command (the train
// leaves at once, or refuses with a reason). The page's own code is what is checked:
// - A new hub game starts the hub's tutorial: its steps in order (welcome, throw switch 2, check tickets, send off,
//   contract, order, unload, sort, deliver, send the freight train off, done), each with the Next job line's words and
//   the helper arrow's place (switch 2's stand, the car to check, the engine, the work board, the freight car).
// - The schedule board, the work board (painted and its card) and the train orders card read the railroad's runs:
//   standing, ready, late and coming-in trains.
// - After the tutorial the Next job line and the arrows follow the trains: a train waiting at a switch, tickets to
//   check, goods to unload, a train ready to send off.
// - The Check tickets buttons over the cars and Send off over the engine appear near the player only, are at least
//   48 px, work by touch (Send off from further away walks to the engine first) and show a refusal's reason.
// - Toasts for the railroad's events; the first-time cards show once; Settings' Train messages toggle.
// - Nothing overlaps the top-right buttons or the other HUD, portrait and landscape; no console errors; screenshots
//   of each tutorial step at phone size (test-output/hubui-*.png); draw calls with both trains standing.
const { openGame, screenshotPath } = require('./browser');

const HUD_IDS = ['clock', 'speeds', 'cash', 'buildBtn', 'tgBtn', 'rotL', 'rotR', 'lookBtn', 'officeBtn', 'workBtn', 'centre', 'tutTask', 'nextJob', 'alerts', 'fcard', 'panel'];

// The fakes (see the top): installed in the page, kept in window.__fx.
function installFakes() {
  // Integrator: the fakes keep the real pieces' shapes (pxCarStatus: aboard, checked, unchecked, off, boarding, seats,
  // checking, at, spot; cgCarStatus: stock, k, run, items, hub, out, used, cap, why), from the real ones with the
  // counts replaced; the real ones are kept in window.__real (part 8 runs on them).
  if (!window.__real) window.__real = { pxCarStatus: window.pxCarStatus, cgCarStatus: window.cgCarStatus, pxCheckCmd: window.pxCheckCmd, rrWaveOffCmd: window.rrWaveOffCmd };
  window.__fx = { pax: {}, goods: {}, refuse: null };
  window.pxCarStatus = (S, stock) => { const r = window.__real.pxCarStatus(S, stock), p = window.__fx.pax[stock]; if (!r) return null;
    const aboard = p ? p.aboard : 0, unchecked = p ? p.unchecked : 0; return { ...r, aboard, checked: aboard - unchecked, unchecked, off: 0, boarding: 0, checking: false }; };
  window.cgCarStatus = (S, stock) => { const r = window.__real.cgCarStatus(S, stock), n = window.__fx.goods[stock] || 0; return r && { ...r, items: n, hub: n, out: 0, used: n }; };
  window.pxCheckCmd = (S, c, ev) => { const p = window.__fx.pax[c.car], n = p ? p.unchecked : 0; if (p) p.unchecked = 0; ev.push({ t: 'carChecked', tr: c.tr, car: c.car, n }); };
  window.rrWaveOffCmd = (S, c, ev) => {
    const R = window.__railhead, tr = S.trains[c.tr], run = S.rr.runs.find(r => r.slot === c.tr && r.ph === 'stand');
    if (!tr || !run) { ev.push({ t: 'rrRefused', why: 'That train is not standing at its track' }); return; }
    if (window.__fx.refuse) { ev.push({ t: 'rrRefused', why: window.__fx.refuse }); return; }
    const i = tr.consist.findIndex(v => v.k === 'loco'), p = R.trainPoses(S.track, tr)[i];
    if (Math.hypot(p.x - S.player.x, p.z - S.player.z) > 3) { ev.push({ t: 'rrRefused', why: 'Stand by the engine to send it off' }); return; }
    Object.assign(run, { ph: 'gone', tWave: S.time, tGone: S.time, slot: null });
    Object.assign(tr, { away: true, consist: [] });
    ev.push({ t: 'rrWavedOff', run: run.id, tr: c.tr, late: Math.max(0, S.time - run.dep) });
  };
}
// A hub game with the two trains standing (the foundation's scenario), loaded as the page's game.
function loadTrains(opts) {
  const R = window.__railhead, st = R.rr.rrDebugScenario(R.newState(R.CFG.SEED, 'hub'));
  if (opts && opts.tutDone) Object.assign(st.tut, { done: true, skipped: true });
  R.importSave(JSON.stringify({ state: st }));
  const S = R.state, pt = S.trains[3], ft = S.trains[4];
  for (const r of S.rr.runs) if (r.ph === 'stand') r.ready = true;   // (TR's readiness: their shortest stand is over, everyone off and on)
  S.rr.cg.unloaded = S.rr.runs.filter(r => r.ph === 'stand' && r.kind === 'freight').map(r => r.id);   // (the fake goods: CG's own cgUnloaded is not said)
  window.__fx.pax = {}; window.__fx.goods = {};
  pt.consist.filter(c => c.k !== 'loco').forEach((c, i) => { window.__fx.pax[c.id] = { aboard: [5, 4, 0][i], unchecked: [3, 2, 0][i] }; });
  ft.consist.filter(c => c.k !== 'loco').forEach((c, i) => { window.__fx.goods[c.id] = [0, 2, 1, 0][i]; });
  R.camera.zoom = 1.5; R.camera.ox = 0; R.camera.oz = 0;
  return { pax: pt.consist.map(c => c.id), freight: ft.consist.map(c => c.id) };
}

module.exports = async function checkHubUi() {
  const problems = [];
  const P = m => problems.push(m);
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=hub', cards: true });
    const R = (f, a) => page.evaluate(f, a);
    const frames = ms => page.waitForTimeout(ms || 450);
    const shot = name => page.screenshot({ path: screenshotPath(`hubui-${name}-${orient}`) });
    // (Integrator: the railroad's buttons are placed again every frame and step a row up or down when a toast or a
    // label comes or goes, so the tap waits until the button stands still and is the topmost thing at its middle.)
    const tapEl = async el => {
      for (let i = 0; i < 12; i++) {
        const a = await el.boundingBox(); await frames(120); const r = await el.boundingBox();
        if (!a || !r) return false;
        const same = Math.abs(a.x - r.x) < 0.5 && Math.abs(a.y - r.y) < 0.5;
        const top = await el.evaluate((e, p) => { const t = document.elementFromPoint(p[0], p[1]); return !!t && (t === e || e.contains(t)); }, [r.x + r.width / 2, r.y + r.height / 2]);
        if (same && top) { await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await frames(250); return true; }
      }
      return false;
    };
    // Overlaps among the HUD and the railroad's buttons, and with the top-right column.
    const overlaps = () => R(ids => {
      const vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const boxes = ids.map(id => ({ id, e: document.getElementById(id) })).concat([...document.querySelectorAll('.rrBtn')].map((e, i) => ({ id: 'rrBtn' + i + ':' + e.textContent, e })))
        .filter(o => vis(o.e)).map(o => ({ id: o.id, r: o.e.getBoundingClientRect() }));
      const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5, out = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(boxes[i].r, boxes[j].r)) out.push(boxes[i].id + '/' + boxes[j].id);
      for (const b of boxes) if (b.r.left < -0.5 || b.r.right > innerWidth + 0.5 || b.r.top < -0.5 || b.r.bottom > innerHeight + 0.5) out.push(b.id + ' off screen');
      return { out, shown: boxes.map(b => b.id) };
    }, HUD_IDS);
    const rrBtns = () => R(() => [...document.querySelectorAll('.rrBtn')].filter(e => !e.hidden && getComputedStyle(e).visibility !== 'hidden')
      .map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, act: e.dataset.act, car: Number(e.dataset.car), tr: Number(e.dataset.tr), w: r.width, h: r.height }; }));
    const job = () => R(() => { const R = window.__railhead, j = R.guide.job(); return { text: j.text, t: j.t && { x: j.t.x, z: j.t.z, k: j.t.k, label: j.t.label, stock: j.t.stock } }; });
    const near = (a, b, d) => !!a && !!b && Math.hypot(a.x - b.x, a.z - b.z) < (d || 0.6);
    const tutStep = () => R(() => { const c = window.__railhead.tut.tutCurrent(window.__railhead.state); return c ? c.key : (window.__railhead.state.tut.done ? 'over' : 'none'); });
    try {
      await R(installFakes);

      // ---- 1. A new hub game: the hub's tutorial, step by step (the welcome, then switch 2) ----
      const start = await R(() => { const R = window.__railhead, S = R.state; R.step(1);
        return { world: S.track.world, done: S.tut.done, hubSteps: R.tut.tutSteps(S) === R.tut.TUT_HUB_STEPS, keys: R.tut.TUT_HUB_STEPS.map(s => s.key), step: S.tut.step,
          title: (S.tg.list.find(g => g.id === S.tut.tg) || {}).title, line: document.getElementById('nextJobText').textContent, sw2: S.track.switches[2].state }; });
      if (start.world !== 'hub' || start.done || !start.hubSteps) P(`${orient} 1: a new hub game should start the hub's own tutorial: ${JSON.stringify(start)}`);
      if (start.keys.join(',') !== 'welcome,throw,check,sendoff,accept,order,unload,sort,deliver,fsend,done') P(`${orient} 1: the hub tutorial's steps: ${start.keys.join(',')}`);
      if (start.step !== 0 || start.title !== 'Welcome to the Hub') P(`${orient} 1: the first telegram should be the hub's welcome: ${JSON.stringify(start)}`);
      await frames(500);
      await shot('tut-0-welcome');
      await R(() => { const R = window.__railhead; R.send({ t: 'tgAnswer', id: R.state.tut.tg, b: 0 }); R.step(2); });
      await frames(400);
      let k = await tutStep(), j = await job();
      const sw2 = await R(() => { const W = window.__railhead.state.track.switches[2]; return { x: W.stand.ux, z: W.stand.uz }; });
      if (k !== 'throw' || !/switch 2/.test(j.text) || !near(j.t, sw2)) P(`${orient} 1: after OK, the step should be switch 2 with the arrow at its stand: ${k} ${JSON.stringify(j)}`);
      await R(() => { const R = window.__railhead, S = R.state; S.player.x = -2; S.player.z = -4; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; R.guide.setPref(true); });
      await frames(600);
      await shot('tut-1-throw');
      // The player throws it (walks to the stand): the next step.
      await R(() => { const R = window.__railhead; R.send({ t: 'useSwitch', sw: 2 }); for (let i = 0; i < 80 && R.state.track.switches[2].state !== 'N'; i++) R.step(1); R.step(2); });
      k = await tutStep(); j = await job();
      if (k !== 'check' || !/wait for Passenger 1 at the platform/.test(j.text)) P(`${orient} 1: with switch 2 thrown the step should be checking tickets, waiting for Passenger 1: ${k} ${JSON.stringify(j)}`);
      console.log(`  ${orient} 1: tutorial welcome, then switch 2 (${JSON.stringify(sw2)}), then "${j.text}"`);

      // ---- 2. The first passenger train in: check tickets (the button by touch), send it off ----
      const ids = await R(loadTrains);
      await R(() => { const R = window.__railhead, S = R.state; Object.assign(S.tut, { done: false, skipped: false, step: 2, tg: -1, got: R.tut.TUT_GOT.read | R.tut.TUT_GOT.sw });
        R.guide.setPref(true); R.cards.setPref(false); S.player.x = 22; S.player.z = -4; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; });
      j = await job();
      const car1 = await R(stock => { const R = window.__railhead, S = R.state, d = R.interchange.carryCarDoor(S, stock, S.player.x, S.player.z); return d; }, ids.pax[1]);
      if (!j.t || j.t.stock !== ids.pax[1] || !/check tickets on car 1 of Passenger 1 \(3 unchecked\)/.test(j.text)) P(`${orient} 2: the Next job should be car 1's tickets (3 unchecked): ${JSON.stringify(j)}`);
      // Far from the train (the depot): no buttons over the cars.
      await R(() => { const S = window.__railhead.state; S.player.x = 8.5; S.player.z = -14; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; });
      await frames(500);
      let bs = await rrBtns();
      if (bs.length) P(`${orient} 2: no Check tickets or Send off button should show far from the train: ${JSON.stringify(bs)}`);
      // By car 1: its button (and car 2's), at least 48 px, clear of the HUD.
      await R(d => { const S = window.__railhead.state; S.player.x = d.x + d.ox * 0.5; S.player.z = d.z + d.oz * 0.5; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; }, car1);
      await frames(700);
      bs = await rrBtns();
      const b1 = bs.find(b => b.car === ids.pax[1]);
      if (!b1 || !/Check tickets \(3\)/.test(b1.text) || b1.h < 48 || b1.w < 48) P(`${orient} 2: by car 1 a Check tickets (3) button of 48 px or more should show: ${JSON.stringify(bs)}`);
      if (bs.some(b => b.car === ids.pax[3])) P(`${orient} 2: car 3 has nobody to check: no button`);
      let ov = await overlaps();
      if (ov.out.length) P(`${orient} 2: overlaps by the train: ${ov.out.join(', ')}`);
      await shot('tut-2-check');
      // A tap on the button: the car is checked (the fake PX), the tutorial goes on.
      const el = (await page.$$('.rrBtn')).filter(Boolean);
      let tapped = false;
      for (const e of el) if (await e.evaluate((e, car) => !e.hidden && Number(e.dataset.car) === car, ids.pax[1])) { tapped = await tapEl(e); break; }
      await R(() => window.__railhead.step(2));
      await frames(300);
      const after = await R(stock => ({ un: window.__fx.pax[stock].unchecked, toast: document.getElementById('toast').textContent }), ids.pax[1]);
      k = await tutStep();
      if (!tapped || after.un !== 0 || k !== 'sendoff') P(`${orient} 2: tapping Check tickets should check car 1 and move the tutorial to Send off: tapped ${tapped}, ${JSON.stringify(after)}, step ${k}`);
      if (!/Tickets checked: 3 travellers/.test(after.toast)) P(`${orient} 2: the toast should say the tickets checked: "${after.toast}"`);
      j = await job();
      const eng = await R(() => { const R = window.__railhead, S = R.state, tr = S.trains[3], p = R.trainPoses(S.track, tr)[0]; return { x: p.x, z: p.z }; });
      if (!j.t || j.t.k !== 'engine' || Math.hypot(j.t.x - eng.x, j.t.z - eng.z) > 2.5 || !/send Passenger 1 off/.test(j.text)) P(`${orient} 2: the Send off step should point at the engine: ${JSON.stringify(j)}`);
      // Send off with car 2 still unchecked: the train's crew refuses (the fake), the reason shows.
      await R(() => { window.__fx.refuse = 'Not everyone aboard has been checked'; });
      await R(t => { const S = window.__railhead.state; S.player.x = t.x; S.player.z = t.z; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; }, j.t);
      await frames(600);
      bs = await rrBtns();
      const sb = bs.find(b => b.act === 'send');
      if (!sb || sb.h < 48) P(`${orient} 2: by the engine a Send off button of 48 px or more should show: ${JSON.stringify(bs)}`);
      await shot('tut-3-sendoff');
      for (const e of await page.$$('.rrBtn')) if (await e.evaluate(e => !e.hidden && e.dataset.act === 'send')) { await tapEl(e); break; }
      // (The tap's click can land a moment after the tap returns under load, and the paused game only takes the
      // command at its next step: step until the toast changes, up to 2 seconds.)
      const waitToast = async re => { let t = ''; for (let i = 0; i < 10; i++) { await R(() => window.__railhead.step(1)); await frames(200); t = await R(() => document.getElementById('toast').textContent); if (re.test(t)) break; } return t; };
      const refused = await waitToast(/Not everyone aboard has been checked/);
      if (!/Not everyone aboard has been checked/.test(refused)) P(`${orient} 2: a refused Send off should show its reason: "${refused}"`);
      // From 6u away: the walk to the engine, then sent off.
      await R(e => { window.__fx.refuse = null; const S = window.__railhead.state; S.player.x = e.x - 6; S.player.z = -3.3; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; }, eng);
      await frames(600);
      let sent = false;
      for (const e of await page.$$('.rrBtn')) if (await e.evaluate(e => !e.hidden && e.dataset.act === 'send')) { sent = await tapEl(e); break; }
      for (let i = 0; i < 12; i++) { await R(() => window.__railhead.step(6)); await frames(120); }
      const gone = await R(() => { const S = window.__railhead.state; return { ph: S.rr.runs[0].ph, away: S.trains[3].away }; });
      k = await tutStep();
      if (!sent || gone.ph !== 'gone' || k !== 'accept') P(`${orient} 2: Send off from 6u should walk to the engine and send the train off, and the tutorial move to the contract: tapped ${sent}, ${JSON.stringify(gone)}, step ${k}`);
      console.log(`  ${orient} 2: Check tickets by touch (car 1), refusal shown, Send off with a walk; buttons ${bs.map(b => b.text + ' ' + Math.round(b.w) + 'x' + Math.round(b.h)).join(', ')}`);

      // ---- 3. The contract, the order (their goals), the freight train: unload, sort, deliver, send off ----
      j = await job();
      const wbs = await R(() => window.__railhead.guide.econWorkBoardSpot());
      if (!near(j.t, wbs) || !/take a contract at the work board/.test(j.text)) P(`${orient} 3: the contract step should point at the work board: ${JSON.stringify(j)}`);
      await R(() => { const S = window.__railhead.state; S.player.x = 4; S.player.z = -8; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; });
      await frames(600);
      await shot('tut-4-contract');
      await R(() => { const R = window.__railhead, U = R.state.tut, G = R.tut.TUT_GOT; U.got |= G.accept | G.order; R.step(2); });
      k = await tutStep(); j = await job();
      if (k !== 'unload' || !j.t || ![ids.freight[2], ids.freight[3]].includes(j.t.stock) || !/take the goods out of car [23] of Freight 1/.test(j.text)) P(`${orient} 3: the unload step should point at the freight car with goods: ${k} ${JSON.stringify(j)}`);
      await R(t => { const S = window.__railhead.state; S.player.x = t.x + 2; S.player.z = t.z - 1; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; }, j.t);
      await frames(700);
      bs = await rrBtns();
      if (bs.some(b => b.act === 'check')) P(`${orient} 3: no Check tickets buttons over freight cars`);
      await shot('tut-6-unload');
      // A tap on the freight car (the world): walks to it and opens the car panel (the command useCar).
      const tapCar = await R(stock => { const R = window.__railhead, S = R.state, tr = S.trains[4], i = tr.consist.findIndex(c => c.id === stock), p = R.trainPoses(S.track, tr)[i];
        R.hubui.tap({ k: 'tr', id: 4, stock }); R.step(1); return { use: S.player.use, mode: S.player.mode }; }, ids.freight[2]);
      if (!tapCar.use || tapCar.use.k === undefined) P(`${orient} 3: a tap on a freight car should walk to its door: ${JSON.stringify(tapCar)}`);
      await R(() => { const R = window.__railhead, U = R.state.tut, G = R.tut.TUT_GOT; U.got |= G.unload | G.sort | G.deliver; R.step(2); });
      k = await tutStep(); j = await job();
      if (k !== 'fsend' || !j.t || j.t.k !== 'engine' || !/send Freight 1 off/.test(j.text)) P(`${orient} 3: the last step should be sending Freight 1 off at its engine: ${k} ${JSON.stringify(j)}`);
      await R(t => { const S = window.__railhead.state; S.player.x = t.x; S.player.z = t.z; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; window.__fx.goods = {}; }, j.t);
      await frames(600);
      await shot('tut-9-fsend');
      for (const e of await page.$$('.rrBtn')) if (await e.evaluate(e => !e.hidden && e.dataset.act === 'send')) { await tapEl(e); break; }
      await R(() => window.__railhead.step(3));
      k = await tutStep();
      const last = await R(() => { const S = window.__railhead.state; return (S.tg.list.find(g => g.id === S.tut.tg) || {}).title; });
      if (k !== 'over' || last !== 'You have the way of it') P(`${orient} 3: sending Freight 1 off should end the tutorial with its last telegram: ${k}, "${last}"`);
      await frames(300);
      await shot('tut-10-done');
      console.log(`  ${orient} 3: contract at the work board, freight car ${ids.freight[2]}, Send off Freight 1, tutorial over`);

      // ---- 4. The boards, the work card and the train orders card ----
      await R(loadTrains, { tutDone: true });
      await R(() => { window.__railhead.guide.setPref(true); window.__railhead.cards.setPref(false); });
      const bd = await R(() => { const R = window.__railhead, S = R.state;
        const one = () => ({ sched: R.board.boardRows('hub'), work: R.board.workBoardLines('hub') });
        const a = one();
        window.__fx.pax[S.trains[3].consist[1].id].unchecked = 0; window.__fx.pax[S.trains[3].consist[2].id].unchecked = 0;
        const b = one();
        S.time = S.rr.runs[0].dep + 600;   // 10 minutes past its time
        const c = one();
        S.rr.runs[1].ph = 'in';            // (a train coming in)
        const d = one();
        S.rr.runs[1].ph = 'stand';
        return { a, b, c, d }; });
      const st = (rows, name) => (rows.find(r => r.train === name) || {}).state;
      if (st(bd.a.sched, 'Passenger 1') !== 'Boarding' || st(bd.a.sched, 'Freight 1') !== 'Unloading') P(`${orient} 4: the schedule board should show Passenger 1 boarding and Freight 1 unloading: ${JSON.stringify(bd.a.sched)}`);
      if (st(bd.b.sched, 'Passenger 1') !== 'Ready') P(`${orient} 4: with everyone checked Passenger 1 should be Ready: ${JSON.stringify(bd.b.sched)}`);
      if (!/^Late 10 min$/.test(st(bd.c.sched, 'Passenger 1') || '')) P(`${orient} 4: past its time it should be Late 10 min: ${JSON.stringify(bd.c.sched)}`);
      if (st(bd.d.sched, 'Freight 1') !== 'Coming in' && !/^Late/.test(st(bd.d.sched, 'Freight 1') || '')) P(`${orient} 4: a train coming in: ${JSON.stringify(bd.d.sched)}`);
      const wl = bd.a.work.find(l => l.train === 'Passenger 1'), wf = bd.a.work.find(l => l.train === 'Freight 1');
      if (!wl || !wl.marks.some(m => /^Tickets 4\/9$/.test(m[0])) || !wf || !wf.marks.some(m => /^Unload 3$/.test(m[0]))) P(`${orient} 4: the painted work board's lines: ${JSON.stringify(bd.a.work)}`);
      if (!bd.b.work.find(l => l.train === 'Passenger 1').marks.some(m => m[0] === 'Send off' && m[1])) P(`${orient} 4: a ready train's line should say Send off: ${JSON.stringify(bd.b.work)}`);
      // The work card.
      const card = await R(() => { const R = window.__railhead, S = R.state; S.time -= 600; R.board.openWorkCard('hub', false); return new Promise(res => setTimeout(() => res(document.getElementById('workBody').textContent), 300)); });
      if (!/Passenger 1/.test(card) || !/Freight 1/.test(card) || !/Tickets: 9 of 9 aboard checked/.test(card) || !/Unload here: 3/.test(card)) P(`${orient} 4: the work card should list both trains with their tickets and goods: ${card.slice(0, 300)}`);
      await shot('board-workcard');
      await R(() => window.__railhead.board.closeWorkCard());
      // The schedule board at zoom 3, and the train orders card by the platform's west end.
      await R(() => { const R = window.__railhead, S = R.state, b = R.board.list.find(b => b.kind === 'sched' && b.st === 'hub'); S.player.x = b.x - 1; S.player.z = b.z + 2; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; R.camera.zoom = 3; });
      await frames(900);
      await shot('board-schedule');
      await R(() => { const R = window.__railhead, S = R.state; S.player.x = -6; S.player.z = -4; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; R.camera.zoom = 1.5; });
      await frames(700);
      const tc = await R(() => { const e = document.getElementById('ttCard'); return { shown: !e.hidden, text: e.textContent }; });
      if (!tc.shown || !/Hub: next trains/.test(tc.text) || !/Passenger 1/.test(tc.text) || /No more departures today/.test(tc.text)) P(`${orient} 4: the train orders card should show the hub's next trains: ${JSON.stringify(tc)}`);
      await shot('board-orders');
      console.log(`  ${orient} 4: schedule ${bd.a.sched.map(r => r.train + ' ' + r.state).join(', ')}; late ${st(bd.c.sched, 'Passenger 1')}; orders card "${tc.text.slice(0, 80)}"`);

      // ---- 5. After the tutorial: the Next job line and arrows follow the trains ----
      await R(loadTrains, { tutDone: true });
      await R(() => { window.__railhead.guide.setPref(true); window.__railhead.cards.setPref(false); const S = window.__railhead.state; S.player.x = 8; S.player.z = -4; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; });
      const seq = [];
      j = await job(); seq.push(j.text);
      if (!/check tickets on Passenger 1, car/.test(j.text) || j.t.k !== 'car') P(`${orient} 5: first job should be checking tickets: ${JSON.stringify(j)}`);
      // A train stopped at a switch comes first.
      await R(() => { window.__railhead.state.trains[4].swWait = 1; });
      j = await job(); seq.push(j.text);
      const sw1 = await R(() => { const W = window.__railhead.state.track.switches[1]; return { x: W.stand.ux, z: W.stand.uz }; });
      if (!/Freight 1 waits at switch 1/.test(j.text) || !near(j.t, sw1)) P(`${orient} 5: a train waiting at a switch should come first: ${JSON.stringify(j)}`);
      await R(() => { delete window.__railhead.state.trains[4].swWait; for (const p of Object.values(window.__fx.pax)) p.unchecked = 0; });
      j = await job(); seq.push(j.text);
      if (!/unload Freight 1's car/.test(j.text)) P(`${orient} 5: with the tickets checked, unloading the freight train: ${JSON.stringify(j)}`);
      await R(() => { window.__fx.goods = {}; });
      j = await job(); seq.push(j.text);
      if (!/send (Passenger|Freight) 1 off/.test(j.text) || j.t.k !== 'engine') P(`${orient} 5: then a ready train to send off: ${JSON.stringify(j)}`);
      await R(() => { const S = window.__railhead.state; S.rr.runs.forEach(r => { r.ph = 'gone'; r.slot = null; }); S.trains[3].away = true; S.trains[4].away = true; });
      j = await job(); seq.push(j.text);
      console.log(`  ${orient} 5: ${seq.map(t => '"' + t + '"').join(' > ')}`);

      // ---- 6. The train panel (a tap on an engine), toasts, Settings, first-time cards ----
      await R(loadTrains, { tutDone: true });
      await R(() => { const R = window.__railhead; R.cards.setPref(false); R.hubui.tap({ k: 'tr', id: 3, stock: R.state.trains[3].consist[0].id }); });
      await frames(500);
      const pn = await R(() => { const v = id => { const e = document.getElementById(id); return !!e && !e.hidden && !!e.getClientRects().length; };
        const b = document.getElementById('rrPanelSend').getBoundingClientRect(); return { panel: v('panel'), rr: v('panelRr'), acts: v('panelActs'), info: document.getElementById('panelRrInfo').textContent, h: b.height, next: document.getElementById('rrPanelNext').textContent }; });
      if (!pn.panel || !pn.rr || pn.acts || pn.h < 48 || !/Tickets checked: 4 of 9/.test(pn.info) || !/Check car/.test(pn.next)) P(`${orient} 6: the engine's panel should show the railroad part (Send off, the next car) without the driving buttons: ${JSON.stringify(pn)}`);
      ov = await overlaps();
      if (ov.out.length) P(`${orient} 6: overlaps with the train panel open: ${ov.out.join(', ')}`);
      await shot('panel');
      await R(() => document.getElementById('panelClose').click());
      const msgs = await R(() => { const R = window.__railhead, out = {};
        for (const e of [{ t: 'rrDue', run: 0, mins: 30 }, { t: 'rrEntered', run: 0, tr: 3 }, { t: 'rrArrived', run: 1, tr: 4, track: 'cargo' }, { t: 'rrReady', run: 0, tr: 3 }, { t: 'rrWavedOff', run: 0, tr: 3, late: 300 }, { t: 'rrCancelled', run: 1, why: 'the line was blocked' }, { t: 'fareMissed', run: 0, n: 2, cents: 80 }]) {
          document.getElementById('toast').textContent = ''; R.hubui.onEvent(e); out[e.t] = document.getElementById('toast').textContent; }
        R.hubui.msgSetPref(false); document.getElementById('toast').textContent = ''; R.hubui.onEvent({ t: 'rrEntered', run: 0, tr: 3 }); out.off = document.getElementById('toast').textContent;
        R.hubui.onEvent({ t: 'rrRefused', why: 'Stand by the engine to send it off' }); out.refusedOff = document.getElementById('toast').textContent;
        R.guide.openSettings(); out.setting = document.getElementById('setTrainMsgs').textContent; R.guide.closeSettings(); R.hubui.msgSetPref(true);
        return out; });
      const want = { rrDue: /Passenger 1 is due at the platform at 06:40, from the west/, rrEntered: /coming in from the west/, rrArrived: /Freight 1 is in at the cargo track/, rrReady: /ready: send it off/, rrWavedOff: /on its way, 5 minutes late/, rrCancelled: /Freight 1 is cancelled: the line was blocked/, fareMissed: /2 travellers rode free on Passenger 1: \$0\.80/ };
      for (const [t, re] of Object.entries(want)) if (!re.test(msgs[t] || '')) P(`${orient} 6: the toast for ${t}: "${msgs[t]}"`);
      if (msgs.off || !/Stand by the engine/.test(msgs.refusedOff) || msgs.setting !== 'Off') P(`${orient} 6: with Train messages off only refusals show (and Settings says Off): ${JSON.stringify(msgs)}`);
      // First-time cards: once each.
      const cd = await R(() => { const R = window.__railhead, S = R.state; R.cards.setPref(true); R.cards.load(['offer']);   // (a contract offer's card is the real start's)
        const out = [];
        for (const ev of [[{ t: 'rrArrived', run: 0, tr: 3, track: 'platform' }], [{ t: 'rrArrived', run: 0, tr: 3, track: 'platform' }], [{ t: 'rrArrived', run: 1, tr: 4, track: 'cargo' }], [{ t: 'rrDue', run: 1, mins: 30 }], [{ t: 'rrReady', run: 0, tr: 3 }], [{ t: 'fareMissed', run: 0, n: 1, cents: 40 }]]) {
          R.cards.tick(ev);
          const open = R.cards.ui.open;
          out.push(open ? open.id : null);
          if (open) R.cards.close(false);
          R.cards.ui.closedAt = -1e9;
        }
        return { out, shown: R.cards.shown() }; });
      const wantCards = ['rrPaxIn', null, 'rrFreightIn', 'rrDue', 'rrReady', 'rrFareMissed'];
      if (JSON.stringify(cd.out) !== JSON.stringify(wantCards)) P(`${orient} 6: the first-time cards should show once each: ${JSON.stringify(cd.out)} (expected ${JSON.stringify(wantCards)})`);
      // A card on screen, at phone size.
      await R(() => { const R = window.__railhead; R.cards.load(['offer']); R.cards.tick([{ t: 'rrArrived', run: 0, tr: 3, track: 'platform' }]); });
      await frames(400);
      ov = await overlaps();
      if (ov.out.filter(o => !/fcard/.test(o) || /tgBtn|buildBtn|tutTask/.test(o)).length) P(`${orient} 6: overlaps with a card: ${ov.out.join(', ')}`);
      await shot('card');
      await R(() => window.__railhead.cards.close(false));
      console.log(`  ${orient} 6: panel "${pn.info.slice(0, 70)}"; cards ${cd.out.join(', ')}`);

      // ---- 7. Draw calls with both trains standing (nothing drawn is added: the buttons are page elements) ----
      await R(() => { const R = window.__railhead, S = R.state; S.player.x = 0; S.player.z = -4; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; R.camera.zoom = 1.5; R.cards.setPref(false); });
      await frames(800);
      const dc = await R(() => window.__railhead.drawCalls);
      ov = await overlaps();
      if (ov.out.length) P(`${orient} 7: overlaps at the platform with both trains: ${ov.out.join(', ')}`);
      if (dc > 100) P(`${orient} 7: ${dc} draw calls (budget 100)`);
      await shot('platform');
      console.log(`  ${orient} 7: ${dc} draw calls at the platform with both trains standing; HUD ${ov.shown.join(', ')}`);
      // ---- 8. The real pieces (integrator): PX's travellers and ticket check, CG's goods, TR's wave-off ----
      await R(() => { for (const [k, f] of Object.entries(window.__real)) window[k] = f; });
      const real = await R(() => {
        const R = window.__railhead, st = R.rr.rrDebugScenario(R.newState(R.CFG.SEED, 'hub'));
        Object.assign(st.tut, { done: true, skipped: true });
        R.importSave(JSON.stringify({ state: st }));
        R.cards.setPref(false); R.guide.setPref(true);
        const S = R.state, pt = S.trains[3], ft = S.trains[4], run = S.rr.runs.find(r => r.slot === 3);
        // Travellers step off and board (the train stands; PX).
        for (let i = 0; i < 300 && !R.rr.pxReady(S, run, pt); i++) R.step(1);
        // A crate for the Hub in the freight train's second car (CG's cgCarStatus counts it).
        const crate = R.cargo.itemCreate(S, { commodity: 'flour', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'WAREHOUSE', id: 0 }, contractId: null, due: null }, { kind: 'CAR', stockId: ft.consist[2].id }, null).id;
        const cars = pt.consist.slice(1).map(c => ({ stock: c.id, ...R.px.pxCarStatus(S, c.id) }));
        const rows = R.hubui.rows(), pr = rows.find(r => r.name === 'Passenger 1'), fr = rows.find(r => r.name === 'Freight 1');
        const tr = R.rr.rrBoardRows(S), tp = tr.find(r => r.svc === 'p1'), tf = tr.find(r => r.svc === 'f1');
        const j = R.guide.job();
        return { cars, crate, aboard: pr && pr.aboard, unchecked: pr && pr.unchecked, goods: fr && fr.goods, pState: pr && pr.state, fState: fr && fr.state,
          tr: { pOn: tp && tp.on, pOff: tp && tp.off, fUnload: tf && tf.unload, fLoad: tf && tf.load, pSw: tp && tp.switches.length },
          job: { text: j.text, t: j.t && { x: j.t.x, z: j.t.z, k: j.t.k, stock: j.t.stock } }, needs: R.rr.rrSwitchNeeds(S).filter(n => !n.done).map(n => n.svc + ':' + n.sw) };
      });
      const sum = real.cars.reduce((a, c) => a + c.unchecked, 0), board = real.cars.reduce((a, c) => a + c.aboard, 0);
      if (!(sum > 0) || real.unchecked !== sum || real.aboard !== board) P(`${orient} 8: the rows should count PX's travellers aboard and unchecked: ${JSON.stringify(real)}`);
      if (real.tr.pOn !== board || real.tr.pOff !== 0 || real.tr.fUnload !== 1 || real.tr.fLoad !== 0) P(`${orient} 8: rrBoardRows' off / on / unload / load: ${JSON.stringify(real.tr)} (aboard ${board})`);
      if (real.goods !== 1 || real.pState !== 'At the platform' || real.fState !== 'At the cargo track') P(`${orient} 8: the rows' goods and states with work to do: ${JSON.stringify(real)}`);
      const target = real.cars.filter(c => c.unchecked).sort((a, b) => Math.hypot(a.spot[0] - 8, a.spot[1] + 4) - Math.hypot(b.spot[0] - 8, b.spot[1] + 4));
      if (!real.job.t || real.job.t.k !== 'car' || !real.cars.some(c => c.stock === real.job.t.stock && c.unchecked && Math.hypot(c.spot[0] - real.job.t.x, c.spot[1] - real.job.t.z) < 0.05) || !/check tickets on Passenger 1, car \d \(\d+ unchecked\)/.test(real.job.text))
        P(`${orient} 8: the Next job should point at PX's checking spot of a car with travellers unchecked: ${JSON.stringify(real.job)} ${JSON.stringify(real.cars.map(c => [c.stock, c.unchecked, c.spot]))}`);
      // The Check tickets button over the car with the real count; a tap walks to PX's spot and checks the car.
      const c1 = target[0];
      await R(c => { const S = window.__railhead.state; S.player.x = c.spot[0] + 1; S.player.z = c.spot[1] - 1.2; S.player.mode = 'idle'; window.__railhead.camera.fx = S.player.x; window.__railhead.camera.fz = S.player.z; window.__railhead.camera.ox = 0; window.__railhead.camera.oz = 0; }, c1);
      await frames(700);
      bs = await rrBtns();
      const rb = bs.find(b => b.car === c1.stock);
      if (!rb || rb.text !== `Check tickets (${c1.unchecked})` || rb.act !== 'check') P(`${orient} 8: the Check tickets button should show PX's count (${c1.unchecked}): ${JSON.stringify(bs)}`);
      let tappedReal = false;
      for (const e of await page.$$('.rrBtn')) if (await e.evaluate((e, car) => !e.hidden && e.dataset.act === 'check' && Number(e.dataset.car) === car, c1.stock)) { tappedReal = await tapEl(e); break; }
      const chk = await R(c => { const R = window.__railhead, S = R.state; let ok = false;
        for (let i = 0; i < 200 && !ok; i++) { R.step(1); ok = R.px.pxCarStatus(S, c.stock).unchecked === 0 && !S.rr.tk.job; }
        return { ok, at: Math.hypot(S.player.x - c.spot[0], S.player.z - c.spot[1]), st: R.px.pxCarStatus(S, c.stock), checked: S.rr.tk.checked, toast: document.getElementById('toast').textContent }; }, c1);
      if (!tappedReal || !chk.ok || !(chk.at < 0.8) || chk.checked < c1.unchecked) P(`${orient} 8: a tap on Check tickets should walk to PX's spot and check the car: tapped ${tappedReal}, ${JSON.stringify(chk)}`);
      // Send off at the freight train's engine: refused by TR while the crate for the Hub is aboard, the reason shown.
      const fEng = await R(() => { const R = window.__railhead, S = R.state, sp = R.rr.rrWaveSpot(S, 4); S.player.x = sp.x; S.player.z = sp.z; S.player.mode = 'idle'; window.__railhead.camera.fx = sp.x; window.__railhead.camera.fz = sp.z; return sp; });
      await frames(700);
      for (const e of await page.$$('.rrBtn')) if (await e.evaluate(e => !e.hidden && e.dataset.act === 'send' && Number(e.dataset.tr) === 4)) { await tapEl(e); break; }
      await waitToast(/Goods for the hub are still aboard/);
      const refusedReal = await R(() => ({ toast: document.getElementById('toast').textContent, ph: window.__railhead.state.rr.runs.find(r => r.slot === 4).ph }));
      if (!/Goods for the hub are still aboard/.test(refusedReal.toast) || refusedReal.ph !== 'stand') P(`${orient} 8: Send off with goods aboard should be refused by the crew with its reason: ${JSON.stringify(refusedReal)} (at ${JSON.stringify(fEng)})`);
      // A tap on the joint between two of the railroad's cars does not uncouple them (they are the railroad's).
      const joint = await R(() => { const R = window.__railhead, S = R.state, tr = S.trains[4], j = R.tt.ttJointAt(S, tr, 2), p = R.toScreen(j.x, j.z, 0.7 * R.CFG.SCALE); return { x: p.x, y: p.y, n: tr.consist.length }; });
      await page.touchscreen.tap(joint.x, joint.y); await frames(200);
      const afterJoint = await R(() => { const R = window.__railhead; R.step(40); const S = R.state; return { n: S.trains[4].consist.length, cut: S.trains.filter(t => t.owner === 'cut' && t.consist.length).length, use: S.player.use }; });
      if (afterJoint.n !== joint.n || afterJoint.cut) P(`${orient} 8: a tap on the joint between two railroad cars uncoupled them: ${JSON.stringify(afterJoint)}`);
      console.log(`  ${orient} 8 (real pieces): ${board} aboard, ${sum} unchecked; "${real.job.text}"; button "${rb && rb.text}", checked at ${chk.at.toFixed(2)}u from PX's spot; refusal "${refusedReal.toast}"; joint tap kept ${afterJoint.n} vehicles`);
      if (errors.length) P(`${orient}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    } catch (e) {
      P(`${orient}: ${e && e.stack || e}`);
    } finally {
      await browser.close();
    }
  }
  return problems;
};
module.exports.installFakes = installFakes; module.exports.loadTrains = loadTrains;
