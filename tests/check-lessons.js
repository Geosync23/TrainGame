// Check: the D27 lessons and the D27 screens (builder U; plans/d27-tech.md section 6 and 8.3).
// The sim (one page, ?d27=all, P's and F's pieces replaced by stand-ins where a lesson reads them):
// - Each of the six lessons (switches, board, unload, load, delivery, pickup) triggers once at its moment and never
//   again; it does not trigger while the D27 part it teaches is off; its steps advance on their events (or a state
//   reached: the player at the lever frame, the cart at the open door, the cart in the street); a later step's event
//   completes the earlier ones too; the switches lesson played through by the real sim (pdStart, walk to the frame,
//   throw W1, P1 arrives).
// - The first card waits for Show me (S.pd.lesWait), later steps do not; Skip closes a lesson; Settings' replay starts
//   them all again; a lesson still open the next morning closes; the lessons are in the save (reload keeps them; the
//   same steps twice from the same start).
// The screens (portrait and landscape, ?d27=all with stand-ins for P and F):
// - The first card is a bottom sheet holding the clock (the clock does not move at 1x) until Show me; then the arrow
//   and the Next job line point at the step; a later step is a slip under the Next job line and the clock runs; OK
//   folds it; Skip closes the lesson; Settings has "Lessons: Replay".
// - The buttons for the D27 work, at most three at once: Step in, Punch (n), Step off (punching on board); Open door,
//   Take cart, Lift, Put (freight handling); Deliver (n), Pick up (n) (the evening), each sending its command; the
//   Next job line's D27 jobs; the summary's and the board's new figures (seated, stored, picked up).
// - Nothing overlaps; no console errors; screenshots test-output/lessons-{hold,slip,board,freight,evening}-<orient>.png.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkLessons() {
  const problems = [];
  // ---- The sim ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&d27=all' });
    const P = m => problems.push('sim: ' + m);
    try {
      const r = await page.evaluate(() => {
        const R = window.__railhead, L = R.les, W = R.world.WORLDS.proto, bad = [], B = m => bad.push(m), log = {};
        const fresh = () => { const S = R.newState(1866, 'proto'); R.simTick(S, []); return S; };
        const les = S => JSON.stringify(S.pd.les || {}) + ' wait ' + JSON.stringify(S.pd.lesWait || []);
        const step = (S, id) => (S.pd.les || {})[id];
        const tickEv = (S, evs) => { const ev = evs.slice(); L.pdLessonTick(S, ev); return ev.slice(evs.length); };
        const give = (S, tag, where) => { const I = S.items, id = I.next++; I.waybill[id] = tag === 'OUT' ? { commodity: 'hardware', consignee: { kind: 'OUTSIDE', id: 'out' }, destTownId: 'OUTSIDE' } : { commodity: 'hardware', consignee: { kind: 'BUSINESS', id: tag }, destTownId: 0 }; I.where[id] = where; I.alive[id] = true; return id; };
        if (L.PD_LESSON_IDS.join() !== 'switches,board,unload,load,delivery,pickup' || L.PD_LESSONS.filter(q => !/^ln/.test(q.id)).length !== 6) B('the six lessons: ' + L.PD_LESSONS.map(q => q.id));
        for (const q of L.PD_LESSONS) {
          if (q.steps.length < 2 || q.steps.length > 4) B(`${q.id}: ${q.steps.length} steps (2 to 4)`);
          for (const s of q.steps) if (typeof s.text !== 'function' || typeof s.short !== 'function' || typeof s.target !== 'function' || !(s.done || s.at)) B(`${q.id}: a step without text, short, target and done`);
        }
        // ---- Switches, played by the real sim ----
        let S = fresh();
        if (S.pd.les && Object.keys(S.pd.les).length) B('a new game starts with lessons ' + les(S));
        for (let i = 0; i < 5; i++) R.simTick(S, []);
        if (step(S, 'switches') !== undefined) B('the switches lesson opened before the day started');
        let ev = R.simTick(S, [{ t: 'pdStart' }]);
        if (step(S, 'switches') !== 0 || JSON.stringify(S.pd.lesWait) !== '["switches"]' || !ev.some(e => e.t === 'pdLesson' && e.id === 'switches' && e.step === 0)) B('pdStart: the switches lesson did not open at step 0 waiting for Show me: ' + les(S));
        const f = L.pdLesFirst(S);
        log.first = f && f.name + ' for ' + f.id;
        if (!f || f.name !== 'W1' || f.id !== 'P1') B('the first train\'s switch: ' + JSON.stringify(f));
        const Sw = JSON.stringify(S);
        const playSwitches = S => {
          const seen = [];
          const rec = ev => { for (const e of ev) if (e.t === 'pdLesson' || e.t === 'pdLessonDone') seen.push(e.t + ':' + e.id + ':' + (e.step !== undefined ? e.step : e.skipped)); };
          rec(R.simTick(S, []));
          Object.assign(S.player, { x: f.lever.ux, z: f.lever.uz, mode: 'idle', use: null, act: null });
          rec(R.simTick(S, []));
          const at1 = step(S, 'switches'), wait1 = S.pd.lesWait;
          rec(R.simTick(S, [{ t: 'throwSwitch', sw: f.sw }]));
          const at2 = step(S, 'switches');
          let i = 0;
          for (; i < 4000 && step(S, 'switches') !== -1; i++) {
            const cmds = [];
            for (const tr of S.trains) if (tr.owner === 'rr' && tr.swWait !== undefined && tr.swWait !== null && !R.switchLockReason(S, tr.swWait)) cmds.push({ t: 'throwSwitch', sw: tr.swWait });
            rec(R.simTick(S, cmds));
          }
          const p1 = S.rr.runs.find(q => q.svc === 'p1' && q.day === 0);
          return { at1, wait1, at2, end: step(S, 'switches'), ticks: i, p1: p1 && p1.ph, seen };
        };
        const a = playSwitches(S);
        log.switches = a;
        if (a.at1 !== 1 || a.wait1 !== undefined) B(`at the lever frame: step ${a.at1}, waiting ${JSON.stringify(a.wait1)} (expected step 1, nothing waiting)`);
        if (a.at2 !== 2) B(`throwing ${f.name}: step ${a.at2} (expected 2)`);
        if (a.end !== -1 || a.p1 !== 'stand') B(`P1 in: the lesson ${a.end}, P1 ${a.p1}`);
        const b = playSwitches(JSON.parse(Sw));
        if (JSON.stringify(a.seen) !== JSON.stringify(b.seen) || a.ticks !== b.ticks) B('the switches lesson differs from the same start: ' + JSON.stringify([a.seen, b.seen]));
        // Once only: the next pdDay does not open it again.
        tickEv(S, [{ t: 'pdDay', day: 1 }]);
        if (step(S, 'switches') !== -1) B('the switches lesson opened a second time');
        // ---- Board (P's events) ----
        W.d27.board = false;
        S = fresh(); R.simTick(S, [{ t: 'pdStart' }]);
        tickEv(S, [{ t: 'pbSeated', run: 0, id: 1 }]);
        if (step(S, 'board') !== undefined) B('the board lesson opened with board off');
        W.d27.board = true;
        ev = tickEv(S, [{ t: 'pbSeated', run: 0, id: 1 }]);
        if (step(S, 'board') !== 0 || !(S.pd.lesWait || []).includes('board')) B('pbSeated: the board lesson did not open waiting: ' + les(S));
        R.simTick(S, [{ t: 'pdLesson', id: 'board', act: 'show' }]);
        if ((S.pd.lesWait || []).includes('board') || step(S, 'board') !== 0) B('Show me: ' + les(S));
        tickEv(S, [{ t: 'pbPunched', run: 0, tr: 0, stock: 0, id: 1 }]);
        if (step(S, 'board') !== 2) B('a punch before stepping in (a later step) did not move the board lesson to step 2: ' + les(S));
        tickEv(S, [{ t: 'pbSeated', run: 0, id: 2 }]);
        if (step(S, 'board') !== 2) B('a second pbSeated changed the board lesson: ' + les(S));
        const p1 = S.rr.runs.find(q => q.svc === 'p1');
        tickEv(S, [{ t: 'rrWavedOff', run: p1.id, tr: 0, auto: false }]);
        if (step(S, 'board') !== -1) B('Send off did not finish the board lesson: ' + les(S));
        // Skip.
        let S2 = fresh(); R.simTick(S2, [{ t: 'pdStart' }]); tickEv(S2, [{ t: 'pbSeated', run: 0, id: 1 }]);
        ev = R.simTick(S2, [{ t: 'pdLesson', id: 'board', act: 'skip' }]);
        if (step(S2, 'board') !== -1 || (S2.pd.lesWait || []).includes('board') || !ev.some(e => e.t === 'pdLessonDone' && e.id === 'board' && e.skipped)) B('Skip: ' + les(S2));
        tickEv(S2, [{ t: 'pbSeated', run: 0, id: 3 }]);
        if (step(S2, 'board') !== -1) B('a skipped lesson opened again');
        // ---- Unload (F's events and a stand-in frCarStatus) ----
        const realCar = window.frCarStatus, realPick = window.frPickups;
        S = R.newState(1866, 'proto'); R.rr.protoDebugScenario(S, 8, 30, ['f1']);
        const f1 = S.rr.runs.find(q => q.svc === 'f1'), ftr = S.trains[f1.slot], car = ftr.consist[1];
        if (f1.ph !== 'stand') B('the scenario did not put F1 at its track: ' + f1.ph);
        const spot = window.rrUiBeside(S, car.id);
        const fake = { [car.id]: { unload: 2, load: 0, doorOpen: false, spot } };
        window.frCarStatus = (S, stock) => fake[stock] || null;
        try {
          W.d27.handling = false;
          tickEv(S, [{ t: 'rrArrived', run: f1.id, tr: ftr.id, late: 0 }]);
          if (step(S, 'unload') !== undefined) B('the unload lesson opened with handling off');
          W.d27.handling = true;
          tickEv(S, [{ t: 'rrArrived', run: f1.id, tr: ftr.id, late: 0 }]);
          if (step(S, 'unload') !== 0) B('F1 in: the unload lesson did not open: ' + les(S));
          const tgt = L.PD_LESSONS.find(q => q.id === 'unload').steps[0].target(S);
          if (!tgt || Math.hypot(tgt.x - spot.x, tgt.z - spot.z) > 0.01) B('the unload lesson\'s arrow is not at the closed door: ' + JSON.stringify(tgt));
          tickEv(S, [{ t: 'frDoor', stock: car.id, open: true }]);
          fake[car.id].doorOpen = true;
          if (step(S, 'unload') !== 1) B('the door open: ' + les(S));
          tickEv(S, []);
          if (step(S, 'unload') !== 1) B('the cart far away finished "bring the cart": ' + les(S));
          const cart = S.tools.find(t => t.k === 'cart27');
          cart.x = Math.round(spot.x * 100); cart.z = Math.round((spot.z + 1.5) * 100);
          tickEv(S, []);
          if (step(S, 'unload') !== 2) B('the cart at the open door: ' + les(S));
          const g = give(S, 'store', { kind: 'CART', tool: cart.id, cell: 0, layer: 0 });
          tickEv(S, [{ t: 'frPut', id: give(S, 'OUT', { kind: 'CART', tool: cart.id, cell: 1, layer: 0 }), to: { kind: 'CART' } }]);
          if (step(S, 'unload') !== 2) B('a good for the railroad on the cart counted as unloading: ' + les(S));
          tickEv(S, [{ t: 'frPut', id: g, to: { kind: 'CART', tool: cart.id, cell: 0, layer: 0 } }]);
          if (step(S, 'unload') !== 3) B('a good for the town on the cart: ' + les(S));
          const t3 = L.PD_LESSONS.find(q => q.id === 'unload').steps[3].target(S);
          if (!t3 || t3.k !== 'cell') B('the stacking step\'s arrow: ' + JSON.stringify(t3));
          tickEv(S, [{ t: 'frStored', id: g }]);
          if (step(S, 'unload') !== -1) B('stacked: ' + les(S));
          // ---- Load: a state that comes about (a freight train that takes goods away stands, unloaded) ----
          S = R.newState(1866, 'proto'); R.rr.protoDebugScenario(S, 13, 40, ['f2']);
          const f2 = S.rr.runs.find(q => q.svc === 'f2'), c2 = S.trains[f2.slot].consist[1];
          for (const k of Object.keys(fake)) delete fake[k];
          tickEv(S, []);
          if (step(S, 'load') !== undefined) B('the load lesson opened with no car status');
          fake[c2.id] = { unload: 1, load: 2, doorOpen: true, spot: window.rrUiBeside(S, c2.id) };
          tickEv(S, []);
          if (step(S, 'load') !== undefined) B('the load lesson opened before the train was unloaded');
          fake[c2.id].unload = 0;
          tickEv(S, []);
          if (step(S, 'load') !== 0) B('F2 unloaded: the load lesson did not open: ' + les(S));
          tickEv(S, []);
          if (step(S, 'load') !== 0) B('the load lesson moved on by itself');
          tickEv(S, [{ t: 'frPut', id: give(S, 'OUT', { kind: 'HAND', slot: 0 }), to: { kind: 'CART' } }]);
          if (step(S, 'load') !== 1) B('an OUT good on the cart: ' + les(S));
          tickEv(S, [{ t: 'frLoaded', run: f2.id, id: 1 }]);
          if (step(S, 'load') !== -1) B('loaded: ' + les(S));
          // ---- Delivery and pickup (the evening) ----
          S = fresh(); R.simTick(S, [{ t: 'pdStart' }]);
          window.frPickups = () => ({ bank: 1 });
          S.pd.ph = 'evening';
          tickEv(S, []);
          if (step(S, 'pickup') !== undefined) B('the pickup lesson opened before the delivery lesson was done');
          tickEv(S, [{ t: 'pdEvening' }]);
          if (step(S, 'delivery') !== 0) B('pdEvening: the delivery lesson did not open: ' + les(S));
          const cart2 = S.tools.find(t => t.k === 'cart27'), g2 = give(S, 'saloon', { kind: 'CART', tool: cart2.id, cell: 0, layer: 0 });
          tickEv(S, [{ t: 'frPut', id: g2, to: { kind: 'CART' } }]);
          if (step(S, 'delivery') !== 1) B('the town\'s goods on the cart: ' + les(S));
          tickEv(S, []);
          if (step(S, 'delivery') !== 1) B('the cart on the cargo platform counted as in town');
          cart2.x = 0; cart2.z = Math.round((R.d27.PROTO.STREET.z1 - 10) * 100);
          tickEv(S, []);
          if (step(S, 'delivery') !== 2) B('the cart in the street: ' + les(S));
          const t2 = L.PD_LESSONS.find(q => q.id === 'delivery').steps[2].target(S), sal = R.d27.SHOPS27.find(q => q.id === 'saloon');
          if (!t2 || Math.hypot(t2.x - sal.door.x, t2.z - sal.door.z) > 0.01) B('the delivery arrow is not at the saloon\'s door: ' + JSON.stringify(t2));
          tickEv(S, [{ t: 'frDelivered', shop: 'saloon', id: g2 }]);
          if (step(S, 'delivery') !== -1) B('delivered: ' + les(S));
          tickEv(S, []);
          if (step(S, 'pickup') !== 0) B('a pickup waiting after the delivery: the pickup lesson did not open: ' + les(S));
          const tp = L.PD_LESSONS.find(q => q.id === 'pickup').steps[0].target(S), bank = R.d27.SHOPS27.find(q => q.id === 'bank');
          if (!tp || Math.hypot(tp.x - bank.pickup.x, tp.z - bank.pickup.z) > 0.01) B('the pickup arrow: ' + JSON.stringify(tp));
          tickEv(S, [{ t: 'frPicked', shop: 'bank', id: 9 }]);
          if (step(S, 'pickup') !== 1) B('picked: ' + les(S));
          const out = give(S, 'OUT', { kind: 'CELL', block: 'E', c: 0, r: 2, layer: 0 });
          tickEv(S, [{ t: 'frStored', id: give(S, 'smithy', { kind: 'CELL', block: 'W', c: 5, r: 1, layer: 0 }) }]);
          if (step(S, 'pickup') !== 1) B('a town good stored finished the pickup lesson');
          tickEv(S, [{ t: 'frStored', id: out }]);
          if (step(S, 'pickup') !== -1) B('the pickup back in the OUT rows: ' + les(S));
        } finally { window.frCarStatus = realCar; window.frPickups = realPick; }
        // ---- The next morning closes a lesson still open; replay; the save ----
        S = fresh(); R.simTick(S, [{ t: 'pdStart' }]);
        L.pdLesNewDay(S);
        if (step(S, 'switches') !== -1 || S.pd.lesWait) B('the next morning did not close the open lesson: ' + les(S));
        ev = R.simTick(S, [{ t: 'pdLesson', act: 'replay' }]);
        if (Object.keys(S.pd.les).length || !ev.some(e => e.t === 'pdLessonReplay')) B('replay: ' + les(S));
        tickEv(S, [{ t: 'pdDay', day: 0 }]);
        if (step(S, 'switches') !== 0) B('after replay the switches lesson did not come again at the day\'s start');
        tickEv(S, [{ t: 'pbSeated', run: 0, id: 1 }]);
        const before = les(S);
        R.importSave(JSON.stringify({ state: S }));
        if (les(R.state) !== before) B(`the lessons after a reload: ${les(R.state)} (saved ${before})`);
        // A damaged lessons field is refused.
        let threw = false;
        try { R.importSave(JSON.stringify({ state: { ...S, pd: { ...S.pd, lesWait: ['nope'] } } })); } catch (e) { threw = true; }
        if (!threw && R.state.pd.lesWait && R.state.pd.lesWait.includes('nope')) B('a save with a bad lessons list loaded');
        // Lessons on by default (WORLDS); the guide parked with them.
        log.flags = R.d27.flags();
        return { bad, log };
      });
      for (const b of r.bad) P(b);
      console.log(`  sim: first switch ${r.log.first}; switches lesson ${JSON.stringify(r.log.switches.seen)} in ${r.log.switches.ticks} ticks`);
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  // The default page: lessons on, the D25 guide parked.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
    try {
      const r = await page.evaluate(() => { const R = window.__railhead; return { f: R.d27.flags(), guide: R.world.worldParked(R.state.track, 'guide') }; });
      if (!r.f.lessons || !r.guide) problems.push(`default: lessons ${r.f.lessons}, the D25 guide parked ${r.guide}`);
      if (errors.length) problems.push('default: console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // ---- The screens ----
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto&d27=all' });
    const P = m => problems.push(`${orient}: ${m}`);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const frames = ms => page.waitForTimeout(ms || 250);
    const shot = name => page.screenshot({ path: screenshotPath(`lessons-${name}-${orient}`) });
    const overlaps = () => ev(() => {
      const ids = ['clock', 'speeds', 'setBtn', 'nextJob', 'pdLesson', 'toast', 'pdBoard', 'pdSum', 'guideLabel', 'guideEdge', 'carry', 'centre'];
      const els = ids.map(id => document.getElementById(id)).filter(e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none' && (e.id !== 'toast' || e.classList.contains('show')))
        .concat([...document.querySelectorAll('.pdAct')].filter(e => !e.hidden && e.style.visibility !== 'hidden'));
      const r = els.map(e => ({ id: e.id || e.textContent, q: e.getBoundingClientRect() })).filter(o => o.q.width > 0);
      const out = [], W = innerWidth, H = innerHeight;
      for (const o of r) if (o.q.left < -1 || o.q.top < -1 || o.q.right > W + 1 || o.q.bottom > H + 1) out.push(`${o.id} off screen`);
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
        const a = r[i].q, b = r[j].q;
        if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) out.push(`${r[i].id} overlaps ${r[j].id}`);
      }
      return out;
    });
    const checkOverlap = async when => { for (const o of await overlaps()) P(`${when}: ${o}`); };
    const card = () => ev(() => { const e = document.getElementById('pdLesson'); return { shown: !e.hidden && getComputedStyle(e).display !== 'none', hold: e.classList.contains('hold'), title: document.getElementById('pdLesTitle').textContent, text: document.getElementById('pdLesText').textContent, show: getComputedStyle(document.getElementById('pdLesShow')).display !== 'none', ok: getComputedStyle(document.getElementById('pdLesOk')).display !== 'none', job: window.__railhead.pdui.job(), hint: window.__railhead.pdui.hint() }; });
    const goTo = async (x, z) => { await ev(([x, z]) => { const R = window.__railhead, S = R.state; Object.assign(S.player, { x, z, mode: 'idle', use: null, act: null }); R.pix.pixLookAt(x, z); R.pdui.ui.acts = null; }, [x, z]); await frames(500); };
    const btns = () => ev(() => [...document.querySelectorAll('.pdAct')].filter(e => !e.hidden && e.style.visibility !== 'hidden').map(e => { const q = e.getBoundingClientRect(); return { text: e.firstChild.textContent, sub: e.lastChild.textContent, x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width, h: q.height }; }));
    const tap = async (re, what) => {
      const b = (await btns()).find(q => re.test(q.text));
      if (!b) { P(`no "${re.source}" button ${what}: ${JSON.stringify((await btns()).map(q => q.text + ' ' + q.sub))} acts ${JSON.stringify(await ev(() => window.__railhead.pdui.acts().map(a => a.text)))}`); return null; }
      if (b.w < 44 || b.h < 44) P(`the ${b.text} button is ${b.w}x${b.h} px`);
      const n0 = await ev(() => window.__sent.length);
      await page.mouse.click(b.x, b.y); await frames(120);
      return ev(n0 => window.__sent.slice(n0), n0);
    };
    try {
      await ev(() => { window.__sent = []; const o = window.send; window.send = c => { window.__sent.push(c); return o(c); }; });
      // ---- The first card holds the clock ----
      await page.click('#pdStart'); await frames(150);
      await ev(() => { const R = window.__railhead; R.setSpeed(0); R.step(1); });
      await frames(300);
      let c = await card();
      if (!c.shown || !c.hold || !c.show || !/Switches \(1 of 3\)/.test(c.title) || !/levers are in the frame at the west end/.test(c.text)) P('the first card: ' + JSON.stringify(c));
      if (c.hint) P('the arrow shows while the first card waits for Show me: ' + JSON.stringify(c.hint));
      if (!/^Walk to the lever frame at the west end/.test(c.job.text)) P('the Next job line during the first card: ' + c.job.text);
      await checkOverlap('the first card');
      await shot('hold');
      const held = await ev(async () => {
        const R = window.__railhead; R.pdui.ui.lesHeld = null; R.setSpeed(1);
        await new Promise(res => setTimeout(res, 300));
        const t0 = R.state.time; await new Promise(res => setTimeout(res, 500));
        return { still: R.state.time === t0, p: document.querySelector('#speeds button[data-speed="0"]').getAttribute('aria-pressed') };
      });
      if (!held.still || held.p !== 'true') P('the clock runs while the first card waits: ' + JSON.stringify(held));
      await page.click('#pdLesShow'); await frames(200);
      const after = await ev(async () => { const R = window.__railhead, t0 = R.state.time; await new Promise(res => setTimeout(res, 600)); const t1 = R.state.time; R.setSpeed(0); return { ran: t1 > t0, wait: R.state.pd.lesWait || null }; });
      if (!after.ran || after.wait) P('Show me did not let the clock run: ' + JSON.stringify(after));
      c = await card();
      if (c.hold || !c.shown || !c.ok) P('after Show me the card is not a slip with OK: ' + JSON.stringify(c));
      const lev = await ev(() => window.__railhead.les.pdLesFirst(window.__railhead.state).lever);
      if (!c.hint || Math.hypot(c.hint.x - lev.ux, c.hint.z - lev.uz) > 0.01) P('the arrow after Show me is not at the lever frame: ' + JSON.stringify(c.hint));
      // ---- A later step: a slip, the clock runs ----
      await goTo(lev.ux, lev.uz);
      await ev(() => window.__railhead.step(1)); await frames(250);
      c = await card();
      if (!c.shown || c.hold || !/\(2 of 3\)/.test(c.title) || !/Pull lever W1 to set the way into track 1 for P1/.test(c.text)) P('the second step\'s slip: ' + JSON.stringify(c));
      if (!/^Pull lever W1/.test(c.job.text) || !c.hint || c.hint.k !== 'switch') P('the second step\'s line and arrow: ' + JSON.stringify([c.job.text, c.hint]));
      if (!(await btns()).some(b => /^Throw/.test(b.text))) P('no Throw button at the lever frame during the lesson');
      await checkOverlap('the slip');
      await shot('slip');
      const sp = await ev(async () => { const R = window.__railhead; R.setSpeed(1); const t0 = R.state.time; await new Promise(res => setTimeout(res, 500)); const t1 = R.state.time; R.setSpeed(0); return t1 > t0; });
      if (!sp) P('a later step held the clock');
      await page.click('#pdLesOk'); await frames(150);
      c = await card();
      if (c.shown) P('OK did not fold the slip');
      if (!/^Pull lever W1/.test(c.job.text)) P('the Next job line lost the step after OK: ' + c.job.text);
      // Skip.
      await ev(() => { window.__railhead.pdui.ui.lesFold = null; }); await frames(150);
      await page.click('#pdLesSkip'); await frames(100);
      await ev(() => window.__railhead.step(1)); await frames(150);
      const sk = await ev(() => ({ les: window.__railhead.state.pd.les, card: !document.getElementById('pdLesson').hidden, job: window.__railhead.pdui.job().text }));
      if (sk.les.switches !== -1 || sk.card || /^Pull lever/.test(sk.job)) P('Skip: ' + JSON.stringify(sk));
      // Settings: Lessons: Replay.
      await page.click('#setBtn'); await frames(150);
      const row = await ev(() => { const e = document.getElementById('setLesRow'); return !e.hidden && getComputedStyle(e).display !== 'none'; });
      if (!row) P('Settings has no Lessons row');
      else {
        await page.click('#setLessons'); await frames(100);
        await ev(() => window.__railhead.step(1));
        const rp = await ev(() => window.__railhead.state.pd.les);
        if (Object.keys(rp).length) P('Replay did not start the lessons again: ' + JSON.stringify(rp));
      }
      await ev(() => { window.closeSettings(); const S = window.__railhead.state; S.pd.les = {}; for (const id of window.__railhead.les.PD_LESSON_IDS) S.pd.les[id] = -1; delete S.pd.lesWait; });
      // ---- Stand-ins for P and F (their status functions, as the plan's shapes) ----
      await ev(() => {
        const F = window.__fake = { coach: {}, car: {}, pax: [], goods: [], pick: {} };
        window.pbCarStatus = (S, stock) => F.coach[stock] || null;
        window.pbDrawList = () => F.pax.slice();
        window.frCarStatus = (S, stock) => F.car[stock] || null;
        window.frDrawList = () => F.goods.slice();
        window.frPickups = () => ({ ...F.pick });
        window.frToDeliver = () => ({});
        window.frJobHint = () => null;
      });
      await ev(() => document.getElementById('toast').classList.remove('show'));   // Replay's message has been read
      // ---- Punching on board ----
      const pb = await ev(() => {
        const R = window.__railhead, X = R.newState(1866, 'proto');
        R.rr.protoDebugScenario(X, 6, 58, ['p1']);   // a fresh game with only P1 at its track, every lesson done
        X.pd.les = {}; for (const id of R.les.PD_LESSON_IDS) X.pd.les[id] = -1;
        for (const r of X.rr.runs) if (r.ph === 'due') { r.ph = 'gone'; r.skipped = true; }   // nothing else comes: the line is about this train's work
        R.importSave(JSON.stringify({ state: X }));
        const S = R.state;
        const run = S.rr.runs.find(q => q.svc === 'p1' && q.day === 0);
        if (!run || run.ph !== 'stand') return { err: 'P1 is not standing: ' + (run && run.ph) };
        const tr = S.trains[run.slot], c1 = tr.consist[1], at = window.rrUiBeside(S, c1.id);
        window.__fake.coach[c1.id] = { seated: 4, punched: 2, toPunch: 2, boarding: 0, off: 0, ends: [{ x: at.x - 4, z: at.z, steps: { x: at.x - 4, z: at.z } }, { x: at.x + 4, z: at.z, steps: { x: at.x + 4, z: at.z } }] };
        window.__fake.pax = [{ id: 7, who: 'man_bowler', x: at.x - 1, y: 1.6, z: at.z + 2.5, f: 'ne', act: 'sit', stock: c1.id, seat: 3, punched: false, through: false },
          { id: 8, who: 'woman_shawl', x: at.x + 2, y: 1.6, z: at.z + 2.5, f: 'sw', act: 'sit', stock: c1.id, seat: 9, punched: false, through: false },
          { id: 9, who: 'man_top', x: at.x, y: 1.6, z: at.z + 2.5, f: 'se', act: 'sit', stock: c1.id, seat: 5, punched: true, through: true }];
        return { tr: tr.id, stock: c1.id, end: { x: at.x - 4, z: at.z }, job: R.pdui.job() };
      });
      if (pb.err) P(pb.err);
      else {
        if (!/^Step into coach 1 of P1: 2 tickets to punch/.test(pb.job.text) || !pb.job.t) P('the Next job line for a coach to punch: ' + JSON.stringify(pb.job));
        await goTo(pb.end.x, pb.end.z);
        let sent = await tap(/^Step in/, 'at a coach end');
        if (sent && !sent.some(q => q.t === 'pbEnter' && q.tr === pb.tr && q.stock === pb.stock && q.end === 0)) P('Step in sent ' + JSON.stringify(sent));
        await ev(o => { const S = window.__railhead.state; S.player.in = { tr: o.tr, stock: o.stock, s: 0 }; }, pb);
        await goTo(pb.end.x + 3, pb.end.z + 2.5);
        const j = await ev(() => window.__railhead.pdui.job());
        if (!/^Punch the tickets in coach 1 of P1 \(2 to punch\)/.test(j.text) || !j.t || j.t.k !== 'pax') P('the Next job line inside a coach: ' + JSON.stringify(j));
        const bs = await btns();
        if (!bs.some(b => /^Step off/.test(b.text))) P('no Step off button inside a coach');
        if (bs.length > 3) P(`${bs.length} buttons over the world at once`);
        await shot('board');
        sent = await tap(/^Punch \(2\)/, 'beside a seated traveller');
        if (sent && !sent.some(q => q.t === 'pbPunch' && q.stock === pb.stock && q.seat === 3)) P('Punch sent ' + JSON.stringify(sent));
        sent = await tap(/^Step off/, 'inside a coach');
        if (sent && !sent.some(q => q.t === 'pbLeave')) P('Step off sent ' + JSON.stringify(sent));
        await checkOverlap('punching on board');
        await ev(() => { delete window.__railhead.state.player.in; });
      }
      // ---- Freight handling ----
      const fr = await ev(() => {
        const R = window.__railhead, X = R.newState(1866, 'proto');
        R.rr.protoDebugScenario(X, 8, 40, ['f1']);   // a fresh game with only F1 at its track, every lesson done
        X.pd.les = {}; for (const id of R.les.PD_LESSON_IDS) X.pd.les[id] = -1;
        for (const r of X.rr.runs) if (r.ph === 'due') { r.ph = 'gone'; r.skipped = true; }   // nothing else comes: the line is about this train's work
        R.importSave(JSON.stringify({ state: X }));
        const S = R.state;
        const run = S.rr.runs.find(q => q.svc === 'f1' && q.day === 0);
        if (!run || run.ph !== 'stand') return { err: 'F1 is not standing: ' + (run && run.ph) };
        const tr = S.trains[run.slot], c1 = tr.consist[1], at = window.rrUiBeside(S, c1.id);
        window.__fake.car[c1.id] = { unload: 3, load: 0, doorOpen: false, spot: { x: at.x, z: at.z } };
        return { stock: c1.id, at, job: R.pdui.job() };
      });
      if (fr.err) P(fr.err);
      else {
        if (!/^Open the door of F1's car 1 \(3 for the town\)/.test(fr.job.text)) P('the Next job line at a closed boxcar: ' + JSON.stringify(fr.job));
        await goTo(fr.at.x, fr.at.z);
        let sent = await tap(/^Open door/, 'at a boxcar door');
        if (sent && !sent.some(q => q.t === 'frDoor' && q.stock === fr.stock)) P('Open door sent ' + JSON.stringify(sent));
        const j = await ev(o => { window.__fake.car[o.stock].doorOpen = true; return window.__railhead.pdui.job(); }, fr);
        if (!/^Unload F1's car 1 onto the cart \(3 for the town\)/.test(j.text)) P('the Next job line at an open boxcar: ' + j.text);
        // The cart beside the door, a good in reach: Take cart and Lift; then a good in hand: Put on the cart.
        await ev(o => {
          const S = window.__railhead.state, cart = S.tools.find(t => t.k === 'cart27');
          cart.x = Math.round((o.at.x + 1.2) * 100); cart.z = Math.round(o.at.z * 100);
          window.__fake.goods = [{ id: 501, kind: 'crate', variant: 'dry', tag: 'STORE', x: o.at.x - 1, y: 1.6, z: o.at.z + 1, rot: 'x', frame: 0, place: { kind: 'CAR', stockId: o.stock } }];
        }, fr);
        await goTo(fr.at.x, fr.at.z);
        const bs = await btns();
        if (bs.length > 3) P(`${bs.length} buttons over the world at once at the boxcar: ${bs.map(b => b.text)}`);
        await shot('freight');
        await checkOverlap('a boxcar door with the cart');
        sent = await tap(/^Take cart/, 'beside the cart');
        if (sent && !sent.some(q => q.t === 'frCart' && q.act === 'grab')) P('Take cart sent ' + JSON.stringify(sent));
        // D31: Lift and Put in reach are the step-by-step buttons, parked behind D31.TAP (one tap per good, which
        // check-d31.js plays by real taps): checked here with the switch off, as ?d31=0 gives them.
        await ev(() => { window.__railhead.d31.TAP = false; });
        await goTo(fr.at.x, fr.at.z);
        sent = await tap(/^Lift/, 'beside a good');
        if (sent && !sent.some(q => q.t === 'frTake' && q.item === 501)) P('Lift sent ' + JSON.stringify(sent));
        await ev(() => { const S = window.__railhead.state, I = S.items, id = I.next++; I.waybill[id] = { commodity: 'hardware', consignee: { kind: 'BUSINESS', id: 'store' }, destTownId: 0 }; I.where[id] = { kind: 'HAND', slot: 0 }; I.alive[id] = true; window.__fake.goods = []; window.__fake.handId = id; });
        await goTo(fr.at.x + 0.5, fr.at.z);
        sent = await tap(/^Put/, 'with a good in hand beside the cart');
        if (sent && !sent.some(q => q.t === 'frPut' && q.to && q.to.kind === 'CART')) P('Put sent ' + JSON.stringify(sent));
        await ev(() => { window.__railhead.d31.TAP = true; });
        const st = await ev(o => { window.__fake.car[o.stock].unload = 0; window.__railhead.pdui.ui.jobTick = -1; return window.__railhead.pdui.job(); }, fr);
        if (!/^Stack the good for the town in their shops' rows \(general store first\)/.test(st.text) || !st.t || st.t.k !== 'cell') P('the Next job line with a good for the town in hand: ' + JSON.stringify(st));
        await ev(() => { const S = window.__railhead.state; S.items.where[window.__fake.handId] = null; S.items.alive[window.__fake.handId] = false; });
      }
      // ---- The evening: deliver what is on the cart, pick up ----
      const evn = await ev(() => {
        const R = window.__railhead, S = R.state, cart = S.tools.find(t => t.k === 'cart27'), I = S.items, id = I.next++;
        for (const r of S.rr.runs) if (r.day === S.pd.day) { r.ph = 'gone'; if (r.slot !== null && r.slot !== undefined && S.trains[r.slot]) S.trains[r.slot].away = true; }
        S.pd.ph = 'evening';
        I.waybill[id] = { commodity: 'hardware', consignee: { kind: 'BUSINESS', id: 'store' }, destTownId: 0 }; I.where[id] = { kind: 'CART', tool: cart.id, cell: 0, layer: 0 }; I.alive[id] = true;
        const sh = R.d27.SHOPS27.find(q => q.id === 'store');
        cart.x = Math.round((sh.door.x + 1) * 100); cart.z = Math.round((sh.door.z + 1) * 100);
        window.__fake.pick = { bank: 2 };
        R.pdui.ui.jobTick = -1;
        return { door: sh.door, job: R.pdui.job(), bank: R.d27.SHOPS27.find(q => q.id === 'bank').pickup };
      });
      if (!/^Deliver 1 to the general store/.test(evn.job.text)) P('the evening\'s Next job line with a good on the cart: ' + JSON.stringify(evn.job));
      await goTo(evn.door.x, evn.door.z);
      await shot('evening');
      await checkOverlap('a shop door with the cart');
      let sent = await tap(/^Deliver \(1\)/, 'at the store\'s door');
      if (sent && !sent.some(q => q.t === 'frDeliver' && q.shop === 'store')) P('Deliver sent ' + JSON.stringify(sent));
      await ev(() => { const S = window.__railhead.state; for (const id of window.__railhead.cargo.itemsAt(S, { kind: 'CART' })) { S.items.where[id] = null; S.items.alive[id] = false; } window.__railhead.pdui.ui.jobTick = -1; });
      const pj = await ev(() => window.__railhead.pdui.job());
      if (!/^Pick up 2 at the bank/.test(pj.text)) P('the evening\'s Next job line with a pickup waiting: ' + pj.text);
      await goTo(evn.bank.x, evn.bank.z);
      sent = await tap(/^Pick up \(2\)/, 'at the bank\'s pickup');
      if (sent && !sent.some(q => q.t === 'frPickup' && q.shop === 'bank')) P('Pick up sent ' + JSON.stringify(sent));
      // ---- The summary's and the board's new figures ----
      const sm = await ev(async () => {
        const R = window.__railhead, S = R.state;
        Object.assign(S.pd.stats, { seated: 11, punched: 10, missed: 1, unloaded: 6, stored: 6, loaded: 4, delivered: 5, picked: 3 });
        const fig = R.pdui.figures();
        R.pdui.openSum();
        await new Promise(res => setTimeout(res, 200));
        return { text: document.getElementById('pdSum').textContent, fig };
      });
      for (const want of ['11 seated, 10 punched', '6 unloaded, 6 stored, 4 loaded', '5 delivered, 3 picked up']) if (!sm.text.includes(want)) P(`the summary does not say "${want}": ${sm.text}`);
      if (!/11 seated, 10 punched/.test(sm.fig) || !/3 picked up/.test(sm.fig)) P('the board\'s figures so far: ' + sm.fig);
      await checkOverlap('the summary');
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
