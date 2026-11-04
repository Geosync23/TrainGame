// Check: the office, telegrams, alerts and Look (M1 package 7, builder D1; design-doc D13 and 16).
// Part 1, the sim alone:
// - A new game has an empty inbox (schema 11); telegramSend keeps a telegram with its buttons; tgAnswer runs the
//   button's command and refuses a second answer; tgRead marks one or all read; bad telegrams are refused; at most
//   TG.MAX are kept.
// - The event table: town offers, the Overland coming in with an order, a contract late and then cancelled each
//   become a telegram; a train waiting past its time and an engine low on wood each send one telegram (not one a
//   tick) and show in alertsOf; a business with nothing on its shelf shows a 'stock' alert, a late contract a
//   'late' alert. The office desk is a use spot on the platform, useDesk walks there ('reachedDesk'), and orders
//   and contracts work from the desk. The office's Timetable tab can take one service off (ttAssign with svc).
// - Same commands, same hash (telegrams included); export and import keep the inbox; a v10 save gets an empty inbox.
// Part 2, the page in portrait, by real touch: tap the depot wall at the desk, the player walks there and the Office
// button (48 px or more) shows; it opens the office; the game keeps running with it open (not paused); each tab
// shows the right data (offers, market rows with an 8-week line, the ledger's categories, No. 1's wood and cars, the
// services' stop tables); + twice on flour and Send order takes $8.00 off the cash on screen and the money check
// passes; Start and Stop a service; a telegram slides in under the clock and the button's count goes up; a tap on
// it opens the inbox with that telegram, read; a telegram's button answers it; an alert icon moves the camera to the
// business; Look then a tap shows the card for an item (its waybill), No. 1 (consist, next stop, delay) and the
// general store (stock and wants); a tap elsewhere closes the card and Look is off after one look; walking away
// closes the office. Every visible button is 48 px or more and no two page elements overlap (bounding boxes), in
// several states. Draw calls are the same with the office open and closed.
// Part 3, landscape: the same tabs and the inbox, the layout checks, and the debug bar (?debug=1) not covered.
// Screenshots: office-<tab>-portrait/landscape, office-inbox-*, office-slide-portrait, office-look-*-portrait.

const fs = require('fs');
const path = require('path');
const { openGame, screenshotPath } = require('./browser');

// Page elements that must never overlap one another (when visible), measured by their bounding boxes in the page.
// The toast is a passing message and is left out.
function layoutProblems() {
  const ids = ['clock', 'speeds', 'cash', 'buildBtn', 'tgBtn', 'alerts', 'rotL', 'rotR', 'lookBtn', 'officeBtn', 'centre', 'carry', 'paxDesk', 'ride', 'rideBoard',
    'tutTask', 'tgSlide', 'office', 'inbox', 'lookCard', 'panel', 'telPanel', 'carPanel', 'dbgBar', 'nextJob', 'settings', 'workCard'];
  const vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const boxes = [];
  for (const id of ids) {
    const e = document.getElementById(id);
    if (!vis(e)) continue;
    if (id === 'alerts') { for (const b of e.children) if (vis(b)) boxes.push({ id: 'alert-' + b.dataset.k, r: b.getBoundingClientRect() }); continue; }
    if (id === 'tgSlide' && !e.classList.contains('show')) continue;
    if (id === 'dbgBar') { for (const b of e.querySelectorAll('#dbgToggle, #dbgGrid')) if (vis(b)) boxes.push({ id: b.id, r: b.getBoundingClientRect() }); continue; }
    boxes.push({ id, r: e.getBoundingClientRect() });
  }
  const out = [], W = innerWidth, H = innerHeight;
  for (const b of boxes) if (b.r.left < -0.5 || b.r.top < -0.5 || b.r.right > W + 0.5 || b.r.bottom > H + 0.5) out.push(b.id + ' off screen');
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i].r, b = boxes[j].r;
    if (a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5) out.push(boxes[i].id + '/' + boxes[j].id);
  }
  const small = [...document.querySelectorAll('button')].filter(b => vis(b) && b.offsetParent && getComputedStyle(b).visibility !== 'hidden' && (b.offsetHeight < 48 || b.offsetWidth < 48)).map(b => b.id || b.textContent);
  return { overlaps: out, small, shown: boxes.map(b => b.id) };
}

module.exports = async function checkOffice() {
  const problems = [];
  const v10 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v10.json'), 'utf8');
  // ---- Part 1: the sim ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      const r = await page.evaluate((v10) => {
        const R = window.__railhead, O = R.office, E = R.econ, out = {};
        const D = 86400, H = 3600, toTime = (day, hh) => day * D + hh * H - 5 * H;
        // D2's tutorial (from schema 12) sends its own telegrams in a new game: these games start with it over.
        // D22 (7): a new game's switch 1 lies straight; these games have it set for the platform track (as a player who
        // threw it would), so No. 1's runs go as before.
        const newS = () => { const st = R.newState(1866); if (st.tut) st.tut.done = true; st.track.switches[1].state = 'R'; return st; };
        const run = (st, until) => { const ev = []; while (st.time < until) ev.push(...R.simTick(st, [])); return ev; };
        // 1. The inbox and its commands.
        const s0 = newS();
        out.fresh = { schema: s0.schemaVersion, n: s0.tg.list.length, next: s0.tg.next };
        const ev0 = [];
        const a = O.telegramSend(s0, { from: 'Eastern investors', title: 'Welcome', body: 'Hello', buttons: [{ label: 'Walk', cmd: { t: 'walkTo', x: 300, z: -800 } }, { label: 'Skip', cmd: null }] }, ev0);
        out.sent = { ok: a.ok, ev: ev0.map(e => e.t).join(), g: JSON.stringify(s0.tg.list[0]) };
        out.badSend = [O.telegramSend(s0, { body: 'no title' }, null).ok, O.telegramSend(s0, { title: 'x', buttons: [{ label: 'a', cmd: { t: 'tgRead', id: 0 } }] }, null).ok,
          O.telegramSend(s0, { title: 'x', buttons: [1, 2, 3, 4] }, null).ok];
        let ev = R.simTick(s0, [{ t: 'tgAnswer', id: a.id, b: 0 }]);
        out.answer = { ev: ev.filter(e => /^tg/.test(e.t)).map(e => e.t + ':' + e.b).join(), answered: s0.tg.list[0].answered, read: s0.tg.list[0].read, walking: s0.player.mode, tx: s0.player.tx };
        ev = R.simTick(s0, [{ t: 'tgAnswer', id: a.id, b: 1 }, { t: 'tgAnswer', id: 99, b: 0 }]);
        out.again = ev.filter(e => e.t === 'tgRefused').length;
        O.telegramSend(s0, { title: 'Two' }, null); O.telegramSend(s0, { title: 'Three' }, null);
        R.simTick(s0, [{ t: 'tgRead', id: 1 }]);
        out.readOne = s0.tg.list.map(g => g.read).join();
        R.simTick(s0, [{ t: 'tgRead', id: -1 }]);
        out.readAll = s0.tg.list.every(g => g.read);
        for (let i = 0; i < O.TG.MAX + 20; i++) O.telegramSend(s0, { title: 'Many ' + i }, null);
        out.cap = { n: s0.tg.list.length, last: s0.tg.list[s0.tg.list.length - 1].title, next: s0.tg.next };

        // 2. The event table over 3 game days: town offers (day 3 07:00), an order at the desk comes on the Overland,
        //    a starting contract accepted and left late, No. 1 on the timetable waits at Willow Ford.
        const s1 = newS(), desk = O.econDeskSpot();
        s1.player.x = desk.x; s1.player.z = desk.z;
        ev = R.simTick(s1, [{ t: 'econOrder', lines: [{ c: 'flour', n: 2 }] }, { t: 'contractAccept', id: 0 }, { t: 'ttAssign', tr: 0, on: true }]);
        out.atDesk = { ordered: ev.some(e => e.t === 'orderPlaced'), accepted: s1.econ.contracts[0].status, money: E.econCheckMoney(s1) };
        const evs = run(s1, toTime(3, 12));
        const kinds = {};
        for (const g of s1.tg.list) kinds[g.kind] = (kinds[g.kind] || 0) + 1;
        out.events = { kinds, offers: evs.filter(e => e.t === 'contractOffered').length, overland: evs.filter(e => e.t === 'overlandArriving' && e.cars).length,
          late: evs.filter(e => e.t === 'contractLate').length, tgEv: evs.filter(e => e.t === 'telegram').length, n: s1.tg.list.length,
          titles: s1.tg.list.map(g => g.kind + ': ' + g.title) };
        out.alerts1 = O.alertsOf(s1).map(a => a.k + ':' + a.key);
        const evs2 = run(s1, toTime(8, 6));
        out.cancelled = { ev: evs2.filter(e => e.t === 'contractCancelled').length, tg: s1.tg.list.filter(g => g.kind === 'cancelled').length };
        out.money1 = E.econCheckMoney(s1);
        // 3. Low on wood: one telegram, not one a tick; the alert lasts while it is low.
        const s2 = newS();
        s2.trains[0].consist[0].fuel = 50;
        R.simRun(s2, [], 80);
        out.wood = { tg: s2.tg.list.filter(g => g.kind === 'wood').length, alert: O.alertsOf(s2).filter(a => a.k === 'wood').length };
        // 4. Out of stock: the general store with an empty shelf.
        for (const c of Object.keys(s2.town.biz[0].shelf)) s2.town.biz[0].shelf[c] = 0;
        out.stock = O.alertsOf(s2).filter(a => a.k === 'stock').map(a => a.biz + ':' + a.title);
        // 5. useDesk walks to the desk and says so.
        const s3 = newS();
        let reached = -1;
        for (let i = 0; i < 300 && reached < 0; i++) if (R.simTick(s3, i === 0 ? [{ t: 'useDesk' }] : []).some(e => e.t === 'reachedDesk')) reached = i;
        out.desk = { reached, d: Math.hypot(s3.player.x - desk.x, s3.player.z - desk.z), spot: desk };
        // 6. One service off, the other kept.
        const s4 = newS();
        R.simTick(s4, [{ t: 'ttAssign', tr: 0, on: true }]);
        R.simTick(s4, [{ t: 'ttAssign', tr: 0, on: false, svc: 1 }]);
        out.svcOff = s4.tt.services.map(s => s.train);
        // 7. Determinism and saving.
        const twice = () => { const st = newS(); st.player.x = desk.x; st.player.z = desk.z; R.simRun(st, [{ tick: 0, cmd: { t: 'contractAccept', id: 1 } }, { tick: 0, cmd: { t: 'ttAssign', tr: 0, on: true } }], 3 * 10800); return st; };
        const h1 = R.stateHash(twice()), h2 = R.stateHash(twice());
        out.det = { h1, h2 };
        const json = R.exportSave(), h0 = R.hash();
        O.telegramSend(R.state, { title: 'Saved one', buttons: [{ label: 'OK', cmd: null }] }, null);
        const json2 = R.exportSave(), hs = R.hash();
        R.importSave(json); const hBack = R.hash(); R.importSave(json2);
        out.save = { kept: R.hash() === hs && hBack === h0, n: R.state.tg.list.length };
        const old = R.migrate(JSON.parse(JSON.parse(v10).save));
        out.v10 = { schema: old.state.schemaVersion, tg: JSON.stringify(old.state.tg) };
        // A new game (tutorial on): the tutorial's first telegram comes through the same inbox.
        const s5 = R.newState(1866); R.simRun(s5, [], 2);
        out.tut = s5.tut ? s5.tg.list.map(g => g.kind + ':' + (g.buttons || []).map(b => b.label).join('/')).join() : 'tutorial:OK/Skip tutorial';
        return out;
      }, v10);
      if (r.fresh.schema < 11 || r.fresh.n !== 0) problems.push('a new game should be schema 11 or later with an empty inbox: ' + JSON.stringify(r.fresh));
      if (!r.sent.ok || r.sent.ev !== 'telegram' || !/"buttons":\[\{"label":"Walk","cmd":\{"t":"walkTo"/.test(r.sent.g) || !/"read":false,"answered":null/.test(r.sent.g)) problems.push('telegramSend: ' + JSON.stringify(r.sent));
      if (r.badSend.some(Boolean)) problems.push('bad telegrams were accepted: ' + r.badSend);
      if (r.answer.ev !== 'tgAnswered:0' || r.answer.answered !== 0 || !r.answer.read || r.answer.walking !== 'to' || Math.abs(r.answer.tx - 3) > 1e-9) problems.push('tgAnswer did not answer and run the button\'s command: ' + JSON.stringify(r.answer));
      if (r.again !== 2) problems.push('a second answer and an unknown telegram should both be refused: ' + r.again);
      if (r.readOne !== 'true,true,false' || !r.readAll) problems.push(`tgRead: ${r.readOne}, all ${r.readAll}`);
      if (r.cap.n !== 150 || r.cap.last !== 'Many 169') problems.push('the inbox should keep 150, newest last: ' + JSON.stringify(r.cap));
      if (!r.atDesk.ordered || r.atDesk.accepted !== 'ACTIVE' || r.atDesk.money.length) problems.push('ordering and accepting at the office desk: ' + JSON.stringify(r.atDesk));
      const k = r.events.kinds;
      if (!r.events.offers || k.offer !== r.events.offers) problems.push(`town offers (${r.events.offers}) should each give a telegram: ${JSON.stringify(k)}`);
      if (r.events.overland < 1 || k.overland !== r.events.overland) problems.push(`the Overland coming in with our order should give a telegram: ${r.events.overland} visits, ${k.overland} telegrams`);
      if (r.events.late < 1 || k.late !== r.events.late) problems.push(`a contract going late should give a telegram: ${r.events.late} late, ${k.late} telegrams`);
      if (k.wait !== 1) problems.push(`No. 1 waiting at Willow Ford should send exactly one telegram (sent ${k.wait})`);
      if (r.events.tgEv !== r.events.n) problems.push(`telegram events ${r.events.tgEv}, telegrams ${r.events.n}`);
      if (!r.alerts1.some(a => /^late:late:0$/.test(a)) || !r.alerts1.some(a => /^wait:/.test(a))) problems.push('alerts should list the late contract and the waiting train: ' + r.alerts1.join(', '));
      if (r.cancelled.ev !== 1 || r.cancelled.tg !== 1) problems.push('a cancelled contract should give one telegram: ' + JSON.stringify(r.cancelled));
      if (r.money1.length) problems.push('the money check failed after the telegram days: ' + r.money1.join('; '));
      if (r.wood.tg !== 1 || r.wood.alert !== 1) problems.push('low on wood: one telegram and one alert, got ' + JSON.stringify(r.wood));
      if (r.stock.length !== 1 || !/^0:Hub General Store/.test(r.stock[0])) problems.push('an empty general store should show one stock alert: ' + r.stock.join(', '));
      if (r.desk.reached < 0 || r.desk.d > 1.5) problems.push('useDesk did not reach the office desk: ' + JSON.stringify(r.desk));
      if (r.svcOff.join() !== '0,') problems.push('taking one service off should keep the other: ' + r.svcOff.join());
      if (r.det.h1 !== r.det.h2) problems.push('3 days twice gave different hashes: ' + JSON.stringify(r.det));
      if (!r.save.kept) problems.push('export and import did not keep the inbox');
      if (r.tut !== 'tutorial:OK/Skip tutorial') problems.push('a new game\'s first telegram should be the tutorial\'s, with OK and Skip tutorial: ' + r.tut);
      if (r.v10.schema < 11 || r.v10.tg !== '{"list":[],"next":0,"seen":{}}') problems.push('a v10 save should load with an empty inbox: ' + JSON.stringify(r.v10));
      console.log(`  sim: telegrams in 3 days ${JSON.stringify(k)}; alerts ${r.alerts1.length}; desk reached in ${r.desk.reached} ticks; hash ${r.det.h1}`);
      if (errors.length) problems.push('console errors (sim part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }

  // ---- Part 2 and 3: the page, by real touch ----
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const settle = (ms) => page.waitForTimeout(ms || 150);
    const tapAt = async p => { await page.touchscreen.tap(p.x, p.y); await settle(); };
    const tapSel = async sel => {
      const b = await page.locator(sel).first().boundingBox({ timeout: 20000 }).catch(() => null);
      if (!b) { problems.push(`${orient}: nothing to tap at ${sel}`); return false; }
      await tapAt({ x: b.x + b.width / 2, y: b.y + b.height / 2 }); return true;
    };
    const layout = async (what) => {
      const L = await page.evaluate(layoutProblems);
      if (L.overlaps.length) problems.push(`${orient}, ${what}: page elements overlap: ${L.overlaps.join(', ')}`);
      if (L.small.length) problems.push(`${orient}, ${what}: buttons under 48 px: ${L.small.join(', ')}`);
      return L;
    };
    // Wait for real frames (the camera and the page elements update once a frame); snapCam puts the camera on the player.
    const frames = n => R(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    const snapCam = async () => { await R(() => { const R = window.__railhead, c = R.camera; c.fx = R.state.player.x; c.fz = R.state.player.z; c.ox = 0; c.oz = 0; }); await frames(3); };
    const shot = name => page.screenshot({ path: screenshotPath(`office-${name}-${orient}`) });
    try {
      // The test machine draws in software and may be slow: the slide-in stays up 20 s here (4.5 s in play).
      await R(() => { window.__railhead.office.ui.slide.ms = 20000; window.__railhead.step(2); });
      // A new game opens with the tutorial's chip (D2) under the telegraph button: nothing overlaps it. Then skip it.
      await page.waitForFunction(() => !document.getElementById('tutTask') || !document.getElementById('tutTask').hidden, null, { timeout: 20000 }).catch(() => {});
      await frames(3);
      await layout('the tutorial chip showing');
      await R(() => { const R = window.__railhead; R.send({ t: 'tutorialSkip' }); R.send({ t: 'tgRead', id: -1 }); R.step(1); });
      // The desk by real touch.
      await R(() => { const R = window.__railhead, d = R.office.econDeskSpot(); R.state.player.x = d.x + 3; R.state.player.z = d.z + 0.6; R.step(1); });
      await snapCam();
      await layout('at the start');
      const dc0 = await R(() => window.__railhead.drawCalls);
      const sp = await R(() => { const R = window.__railhead, d = R.office.econDeskSpot(); return R.toScreen(d.wx, d.wz, d.wy); });
      await tapAt(sp);
      const n = await R(() => { const R = window.__railhead, d = R.office.econDeskSpot(), P = R.state.player; for (let i = 0; i < 200; i++) { if (P.mode === 'idle' && Math.hypot(P.x - d.x, P.z - d.z) < 0.05) return i; R.step(1); } return -1; });
      await settle(300);
      if (n < 0 || !(await page.isVisible('#officeBtn'))) problems.push(`${orient}: tapping the depot wall at the desk did not walk there and show the Office button (${n})`);
      const ob = await page.locator('#officeBtn').boundingBox();
      if (!ob || ob.width < 48 || ob.height < 48) problems.push(`${orient}: the Office button is under 48 px`);
      await tapSel('#officeBtn');
      if (!(await page.isVisible('#office'))) problems.push(`${orient}: the Office button did not open the office`);
      // Not paused: the clock runs with the office open.
      const t0 = await R(() => { window.__railhead.setSpeed(1); return window.__railhead.state.tick; });
      await settle(1000);
      const t1 = await R(() => { window.__railhead.setSpeed(0); return window.__railhead.state.tick; });
      if (t1 - t0 < 3) problems.push(`${orient}: the game did not run with the office open (${t1 - t0} ticks in a second at 1x)`);
      if (!(await page.isVisible('#office'))) problems.push(`${orient}: the office closed by itself while the game ran`);
      // Each tab.
      const tabs = {};
      for (const tab of ['contracts', 'market', 'ledger', 'trains', 'timetable']) {
        await tapSel(`#officeTabs button[data-tab="${tab}"]`);
        tabs[tab] = await R(() => {
          const b = document.getElementById('officeBody'), S = window.__railhead.state;
          return { text: b.textContent, accept: b.querySelectorAll('button[data-act="accept"]').length, offered: S.econ.contracts.filter(k => k.status === 'OFFERED').length,
            rows: b.querySelectorAll('.row[data-c]').length, sparks: b.querySelectorAll('svg.spark polyline').length, goods: window.__railhead.econ.ECON_ORDERABLE.length,
            ledgerRows: b.querySelectorAll('table tr').length, cards: b.querySelectorAll('.card').length, starts: b.querySelectorAll('button[data-act="ttOn"]').length, stops: b.querySelectorAll('button[data-act="ttOff"]').length,
            pressed: document.querySelector(`#officeTabs button[aria-pressed="true"]`).dataset.tab };
        });
        await settle(200);
        await shot(tab);
        if (tabs[tab].pressed !== tab) problems.push(`${orient}: the ${tab} tab did not open`);
      }
      const T = tabs;
      if (!T.contracts.offered || T.contracts.accept !== T.contracts.offered || !/Hub General Store/.test(T.contracts.text)) problems.push(`${orient}: the Contracts tab should list the ${T.contracts.offered} offers with Accept`);
      if (T.market.rows !== T.market.goods || T.market.sparks !== T.market.goods || !/buy \$4\.00, sell \$2\.50/.test(T.market.text)) problems.push(`${orient}: the Market tab should list ${T.market.goods} goods with buy and sell prices and a line each (${T.market.rows} rows, ${T.market.sparks} lines)`);
      if (!/Money in/.test(T.ledger.text) || !/Loans:/.test(T.ledger.text) || T.ledger.ledgerRows < 3) problems.push(`${orient}: the Ledger tab should show the totals table and loans`);
      if (!/No\. 1/.test(T.trains.text) || !/Wood 4 of 4 cords, water 100%/.test(T.trains.text) || !/combine 1/.test(T.trains.text) || !/Where: At Hub/.test(T.trains.text)) problems.push(`${orient}: the Trains tab should show No. 1 at the Hub with its wood, water and cars: ${T.trains.text.slice(0, 200)}`);
      // D21: a new game has No. 1 on both services, so each shows Stop (Start once taken off).
      if (T.timetable.cards !== 2 || T.timetable.stops !== 2 || T.timetable.starts !== 0 || !/09:30/.test(T.timetable.text) || !/run round/.test(T.timetable.text)) problems.push(`${orient}: the Timetable tab should show both services' stops with Stop (No. 1 on both from the start)`);
      // Stop and start the morning service by touch.
      await tapSel('#officeBody button[data-act="ttOff"][data-svc="0"]');
      const off = await R(() => window.__railhead.state.tt.services.map(s => s.train).join());
      await tapSel('#officeBody button[data-act="ttOn"][data-svc="0"]');
      const on = await R(() => window.__railhead.state.tt.services.map(s => s.train).join());
      if (off !== ',0' || on !== '0,0') problems.push(`${orient}: Stop and Start a service by touch: ${off} then ${on}`);
      // Ordering from the Market tab.
      await tapSel('#officeTabs button[data-tab="market"]');
      const cashBefore = await page.textContent('#cash');
      for (let i = 0; i < 2; i++) await tapSel('#officeBody button[data-act="inc"][data-c="flour"]');
      await tapSel('#officeSend');
      await settle(200);
      const ord = await R(() => ({ cash: document.getElementById('cash').textContent, orders: window.__railhead.state.econ.orders.length, check: window.__railhead.econ.econCheckMoney(window.__railhead.state) }));
      if (cashBefore !== '$2,500.00' || ord.cash !== '$2,492.00' || ord.orders !== 1 || ord.check.length) problems.push(`${orient}: ordering 2 flour from the Market tab: ${cashBefore} -> ${ord.cash}, orders ${ord.orders}, money check ${ord.check.join('; ')}`);
      await layout('office open');
      const dcOpen = await R(() => window.__railhead.drawCalls);
      // A telegram slides in under the clock (it waits while the office is open: close it first).
      await tapSel('#officeClose');
      await R(() => { const R = window.__railhead; R.office.telegramSend(R.state, { from: 'Eastern investors', title: 'Welcome to Railhead', body: 'Your line is open for business.', kind: 'tutorial',
        buttons: [{ label: 'Walk east', cmd: { t: 'walkTo', x: 900, z: -580 } }, { label: 'Not now', cmd: null }] }, null); });
      await settle(400);
      const slide = await R(() => { const s = document.getElementById('tgSlide'), c = document.getElementById('topleft').getBoundingClientRect(), r = s.getBoundingClientRect();
        return { show: s.classList.contains('show'), text: s.textContent, below: r.top >= c.bottom, left: r.left, count: document.getElementById('tgCount').textContent }; });
      if (!slide.show || !/Welcome to Railhead/.test(slide.text) || !slide.below || slide.count !== '1') problems.push(`${orient}: the telegram did not slide in under the clock with the count 1: ${JSON.stringify(slide)}`);
      await settle(1000);
      await layout('telegram sliding in');
      if (orient === 'portrait') await shot('slide');
      // Tap it: the inbox opens with it, read.
      await tapSel('#tgSlide');
      await settle(200);
      const ib = await R(() => ({ open: !document.getElementById('inbox').hidden, office: !document.getElementById('office').hidden, read: window.__railhead.state.tg.list[window.__railhead.state.tg.list.length - 1].read, btns: document.querySelectorAll('#inboxBody button[data-b]').length, count: document.getElementById('tgCount').textContent }));
      if (!ib.open || ib.office || !ib.read || ib.btns !== 2 || ib.count !== '') problems.push(`${orient}: tapping the telegram should open the inbox with it read and its 2 buttons: ${JSON.stringify(ib)}`);
      await shot('inbox');
      await layout('inbox open');
      await tapSel('#inboxBody button[data-b="0"]');
      const ans = await R(() => { const L = window.__railhead.state.tg.list; return { a: L[L.length - 1].answered, mode: window.__railhead.state.player.mode, inbox: !document.getElementById('inbox').hidden }; });
      if (ans.a !== 0 || ans.mode !== 'to' || ans.inbox) problems.push(`${orient}: the telegram's button did not answer it and run its command: ${JSON.stringify(ans)}`);
      await R(() => { const R = window.__railhead; R.send({ t: 'walkTo', x: Math.round(R.office.econDeskSpot().x * 100), z: Math.round(R.office.econDeskSpot().z * 100) }); R.step(30); });
      // The telegraph button opens and closes the inbox.
      await tapSel('#tgBtn');
      const ib2 = await R(() => !document.getElementById('inbox').hidden);
      await tapSel('#tgBtn');
      const ib3 = await R(() => !document.getElementById('inbox').hidden);
      if (!ib2 || ib3) problems.push(`${orient}: the telegraph button should open and close the inbox (${ib2}, ${ib3})`);
      // Alerts: the general store with an empty shelf, carrying an item (the carry readout shows too).
      await R(() => { const R = window.__railhead, S = R.state; for (const c of Object.keys(S.town.biz[0].shelf)) S.town.biz[0].shelf[c] = 0;
        const id = R.cargo.itemCreate(S, { commodity: 'salt', originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'WAREHOUSE', id: 0 }, contractId: null, due: null }, { kind: 'GROUND', x: Math.round(S.player.x * 100), z: Math.round(S.player.z * 100) }, null).id;
        R.cargo.itemMove(S, id, { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null); R.cargo.redraw(); });
      await page.waitForFunction(() => document.querySelector('#alerts button[data-k="stock"]'), null, { timeout: 30000 }).catch(() => {});
      await frames(3);
      const al = await R(() => [...document.querySelectorAll('#alerts button')].map(b => b.dataset.k + ':' + getComputedStyle(b).visibility));
      if (!al.includes('stock:visible')) problems.push(`${orient}: the out-of-stock alert icon did not show: ${al.join(', ')}`);
      await layout('alerts and carrying');
      await tapSel('#alerts button[data-k="stock"]');
      await settle(300);
      const camGo = await R(() => { const R = window.__railhead, c = R.camera, d = R.town.townDoor(0); return { dx: c.fx + c.ox - d.x, dz: c.fz + c.oz - d.z }; });
      if (Math.hypot(camGo.dx, camGo.dz) > 0.5) problems.push(`${orient}: the alert did not move the camera to the general store: ${JSON.stringify(camGo)}`);
      await settle(300);
      await layout('after an alert (Centre showing)');
      if (orient === 'portrait') await shot('alert');
      await R(() => { document.getElementById('centre').click(); const R = window.__railhead; R.cargo.itemMove(R.state, R.state.items.next - 1, { kind: 'GROUND', x: Math.round(R.state.player.x * 100) + 150, z: Math.round(R.state.player.z * 100) + 100 }, null); R.cargo.redraw(); });
      await snapCam();
      // Look: an item.
      const itemAt = await R(() => { const R = window.__railhead, p = R.cargo.view.poses[R.state.items.next - 1]; return R.toScreen(p.x, p.z, (p.y + p.top) / 2); });
      await tapSel('#lookBtn');
      const armed = await R(() => document.getElementById('lookBtn').getAttribute('aria-pressed'));
      await tapAt(itemAt);
      const look1 = await R(() => ({ open: !document.getElementById('lookCard').hidden, title: document.getElementById('lookTitle').textContent, body: document.getElementById('lookBody').textContent, armed: document.getElementById('lookBtn').getAttribute('aria-pressed'), mode: window.__railhead.state.player.mode }));
      if (armed !== 'true' || !look1.open || look1.title !== 'Waybill: Salt' || !/To: The hub warehouse/.test(look1.body) || !/Tag: H, Hub warehouse/.test(look1.body) || !/Now: On the ground/.test(look1.body) || look1.armed !== 'false')
        problems.push(`${orient}: Look at an item: ${JSON.stringify(look1)}`);
      if (orient === 'portrait') await shot('look-item');
      await layout('look card');
      // A tap elsewhere closes the card (and does not walk).
      await R(() => { window.__railhead.state.player.mode = 'idle'; });
      await tapAt({ x: 60, y: orient === 'portrait' ? 500 : 250 });
      const closed = await R(() => ({ hidden: document.getElementById('lookCard').hidden, mode: window.__railhead.state.player.mode }));
      if (!closed.hidden) problems.push(`${orient}: a tap elsewhere did not close the Look card`);
      // Look: No. 1 (the engine).
      const engAt = await R(() => { const R = window.__railhead, p = R.trainPoses(R.state.track, R.state.trains[0])[0]; R.state.player.x = p.x - 1; R.state.player.z = p.z - 2.2; R.step(1); return p; });
      await snapCam();
      const eng = await R(p => window.__railhead.toScreen(p.x, p.z, 1.3), engAt);
      await tapSel('#lookBtn'); await tapAt(eng);
      const look2 = await R(() => ({ title: document.getElementById('lookTitle').textContent, body: document.getElementById('lookBody').textContent }));
      if (look2.title !== 'No. 1' || !/Consist: engine, combine 1/.test(look2.body) || !/Next stop: On the timetable/.test(look2.body)) problems.push(`${orient}: Look at No. 1: ${JSON.stringify(look2)}`);
      if (orient === 'portrait') await shot('look-train');
      // Look: the general store.
      await R(() => { const R = window.__railhead, d = R.town.townDoor(0); R.state.player.x = d.x - 2; R.state.player.z = d.z + 2; R.step(1); });
      await snapCam();
      const door = await R(() => { const R = window.__railhead, d = R.town.townDoor(0); return R.toScreen(d.x, d.z, 0.5); });
      await tapSel('#lookBtn'); await tapAt(door);
      const look3 = await R(() => ({ title: document.getElementById('lookTitle').textContent, body: document.getElementById('lookBody').textContent }));
      if (look3.title !== 'Hub General Store' || !/Stock: .*flour 0/.test(look3.body) || !/Wants: /.test(look3.body)) problems.push(`${orient}: Look at the general store: ${JSON.stringify(look3)}`);
      if (orient === 'portrait') await shot('look-store');
      await tapAt({ x: 60, y: orient === 'portrait' ? 500 : 250 });
      // Walking away closes the office.
      await R(() => { const R = window.__railhead, d = R.office.econDeskSpot(); R.state.player.x = d.x; R.state.player.z = d.z; R.step(1); R.office.openOffice(); });
      await settle(200);
      const o1 = await page.isVisible('#office');
      await R(() => { const R = window.__railhead, d = R.office.econDeskSpot(); R.send({ t: 'walkTo', x: Math.round((d.x + 6) * 100), z: Math.round(d.z * 100) }); R.step(40); });
      await settle(200);
      if (!o1 || (await page.isVisible('#office'))) problems.push(`${orient}: walking away from the desk should close the office (open ${o1})`);
      // Draw calls: the panels are page elements only.
      await R(() => { const R = window.__railhead, d = R.office.econDeskSpot(); R.state.player.x = d.x; R.state.player.z = d.z; R.step(1); });
      await snapCam();
      const dcClosed = await R(() => window.__railhead.drawCalls);
      await R(() => window.__railhead.office.openOffice()); await settle(300);
      const dcOpen2 = await R(() => window.__railhead.drawCalls);
      if (dcClosed !== dcOpen2) problems.push(`${orient}: draw calls changed with the office open (${dcClosed} -> ${dcOpen2})`);
      if (dcOpen2 >= 100) problems.push(`${orient}: draw calls ${dcOpen2} (limit 100)`);
      console.log(`  ${orient}: desk reached in ${n} ticks; ${t1 - t0} ticks in 1 s with the office open; draw calls ${dc0} at the start, ${dcOpen} office open, ${dcClosed}/${dcOpen2} closed/open at the desk`);
      if (errors.length) problems.push(`console errors (${orient}): ` + errors.join(' | '));
    } finally { await browser.close(); }
  }

  // ---- The debug bar (?debug=1): alerts and panels do not cover it ----
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&debug=1' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    try {
      await R(() => { const R = window.__railhead, S = R.state; for (const B of S.town.biz) for (const c of Object.keys(B.shelf)) B.shelf[c] = 0; S.trains[0].consist[0].fuel = 50;
        S.econ.contracts[0].status = 'LATE'; R.step(8); });
      await page.waitForFunction(() => document.querySelectorAll('#alerts button').length >= 3, null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000);
      let n = 0;
      for (const grid of [false, true]) {
        if (!grid) n = await R(() => [...document.querySelectorAll('#alerts button')].filter(b => getComputedStyle(b).visibility === 'visible').length);
        if (grid) await R(() => document.getElementById('dbgToggle').click());
        await page.waitForTimeout(1500);
        const L = await page.evaluate(layoutProblems);
        if (L.overlaps.length) problems.push(`${orient}, ?debug=1${grid ? ' bar open' : ''}: page elements overlap: ${L.overlaps.join(', ')}`);
        if (L.small.length) problems.push(`${orient}, ?debug=1: buttons under 48 px: ${L.small.join(', ')}`);
      }
      if (n < 3) problems.push(`${orient}, ?debug=1: with the debug bar closed, at least three alert icons should show (${n})`);
      await page.screenshot({ path: screenshotPath(`office-alerts-debug-${orient}`) });
      if (errors.length) problems.push(`console errors (?debug=1, ${orient}): ` + errors.join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
