// Check: the prototype's screens (D25, builder U; plans/proto-tech.md sections 5 and 9).
// - The morning opens with the schedule board card: every train of the day (10 rows: passenger, freight and the two
//   through trains, with their tracks and times), the clock held while it is open, Start the day starts it.
// - The HUD keeps only the clock, the speeds and the Settings gear (cash, mail, Build, Work board, Look and the turn
//   buttons hidden); the arrows are on by default.
// - The Next job line through each step of a day, played by a scripted player through the buttons over the world
//   (Throw at a switch stand, Punch at a coach door, Send off at the engine, Unload and Load at a freight car door,
//   Deliver at a shop door): throw W1 for P1, punch the tickets at each coach with a line, throw the way out, send
//   P1 off, ... unload F1, load F1, send it off, the handcart and the deliveries in the evening, end the day.
//   The check fakes P (tickets) and F (goods): ppCarStatus, ppReady, ppPunchCmd, pgCarStatus, pgReady, pgOnDepart,
//   pgToDeliver, pgDeliverCmd and the goods in hand (plain page-side stand-ins), so it tests the screens alone;
//   check-proto-day.js plays the real pieces through the same commands (integrator, 2026-11-10).
// - pdHintTarget (for R's arrows) follows the job; pdBoardRows gives the rows R draws on the board in the world.
// - The first-day guide's sentences come as the first trains do; the summary card at the end of the day shows the
//   day's figures (S.pd.sum); Next day opens the next morning's board.
// - Nothing overlaps (the top row, the gear, the Next job line, the guide's slip, a long message, the buttons over
//   the world, the cards) in portrait and landscape; no console errors; screenshots to test-output/.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkProtoUi() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    const P = m => problems.push(`${orient}: ${m}`);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const frames = (ms) => page.waitForTimeout(ms || 250);
    // Visible HUD boxes that must not overlap one another.
    const overlaps = () => ev(() => {
      const ids = ['clock', 'speeds', 'setBtn', 'nextJob', 'pdGuide', 'toast', 'pdBoard', 'pdSum', 'guideLabel', 'guideEdge', 'carry', 'centre'];
      const els = ids.map(id => document.getElementById(id)).filter(e => e && !e.hidden && e.getClientRects().length && (e.id !== 'toast' || e.classList.contains('show')))
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
    const checkOverlap = async (when) => { for (const o of await overlaps()) P(`${when}: ${o}`); };
    const shot = name => page.screenshot({ path: screenshotPath(`protoui-${name}-${orient}`) });
    try {
      // ---- The morning ----
      const m = await ev(() => {
        const R = window.__railhead, S = R.state, U = R.pdui, vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; };
        const rows = U.rows();
        return { ph: S.pd.ph, board: vis('pdBoard'), rows: rows.map(r => [r.id, r.track, r.arr, r.dep, r.through, r.kind, r.board.st]), cardRows: document.querySelectorAll('#pdBoardRows .pdRow').length,
          start: document.getElementById('pdStart').textContent, job: U.job(), hint: U.hint(), clock: document.getElementById('clock').textContent,
          shown: ['clock', 'speeds', 'setBtn', 'nextJob'].filter(vis), hidden: ['cash', 'tgBtn', 'buildBtn', 'workBtn', 'officeBtn', 'lookBtn', 'rotL', 'rotR', 'hintBtn', 'alerts'].filter(vis),
          intro: document.getElementById('pdBoardIntro').textContent, arrows: R.guide.on() };
      });
      if (m.ph !== 'morning' || !m.board) P(`the morning: phase ${m.ph}, board card shown ${m.board}`);
      if (m.rows.length !== 10 || m.cardRows !== 10) P(`the board has ${m.rows.length} rows (card ${m.cardRows}), expected the day's 10 trains`);
      const want = { P1: [1, '06:40', '06:55'], X1: [2, '07:45', '07:45'], F1: [3, '08:45', '10:30'], F2: [3, '13:45', '15:10'], X2: [2, '12:45', '12:45'] };
      for (const [id, [trk, a, d]] of Object.entries(want)) { const r = m.rows.find(q => q[0] === id); if (!r || r[1] !== trk || r[2] !== a || r[3] !== d) P(`board row ${id}: ${JSON.stringify(r)}`); }
      if (m.rows.filter(r => r[4]).length !== 2 || m.rows.filter(r => r[5] === 'freight' && !r[4]).length !== 3) P('the board does not show 2 through trains and 3 freight trains');
      if (!/Start the day/.test(m.start)) P(`the morning card's button says "${m.start}"`);
      if (m.job.key !== 'morning' || m.hint) P(`the morning's job ${JSON.stringify(m.job)} / arrow while the card is open ${JSON.stringify(m.hint)}`);
      {
        const h = await ev(() => { const U = window.__railhead.pdui; U.closeBoard(); const t = U.hint(); U.openBoard(); return t; });
        if (!h || h.k !== 'board') P(`the morning's arrow (the board card closed): ${JSON.stringify(h)}`);
      }
      if (!/^Day 1\s+06:00$/.test(m.clock)) P(`the clock says "${m.clock}"`);
      if (m.shown.length !== 4) P(`HUD shown: ${m.shown}`);
      if (m.hidden.length) P(`HUD parts still shown in the prototype: ${m.hidden}`);
      if (!/board lists every train/.test(m.intro)) P('the first-day guide\'s first sentence is not on the morning board');
      if (!m.arrows) P('the helper arrows are not on by default in the prototype');
      await checkOverlap('morning');
      await shot('morning');
      // The clock waits while the board is open (a page not paused): Start the day starts it.
      {
        const r = await ev(async () => {
          const R = window.__railhead, U = R.pdui;
          U.closeBoard(); R.setSpeed(1); U.ui.boardFor = null;   // as a fresh page at 1x
          await new Promise(res => setTimeout(res, 300));
          const held = document.querySelector('#speeds button[data-speed="0"]').getAttribute('aria-pressed');
          const t0 = R.state.time; await new Promise(res => setTimeout(res, 400));
          return { held, still: R.state.time === t0, open: !document.getElementById('pdBoard').hidden };
        });
        if (!r.open || r.held !== 'true' || !r.still) P(`the clock is not held while the morning board is open (${JSON.stringify(r)})`);
      }
      await page.click('#pdStart');
      await frames(300);
      {
        const r = await ev(() => { const R = window.__railhead; R.setSpeed(0); R.step(1); return { ph: R.state.pd.ph, open: !document.getElementById('pdBoard').hidden, sp: document.querySelector('#speeds button[data-speed="1"]').getAttribute('aria-pressed') }; });
        if (r.ph !== 'day' || r.open) P(`Start the day: phase ${r.ph}, board still open ${r.open}`);
      }
      // ---- Fakes for P (tickets) and F (goods) until they land ----
      await ev(() => {
        const R = window.__railhead, F = window.__fake = { lines: {}, goods: {}, sent: [], deliver: { store: 0, smithy: 0, saloon: 0 } };
        const origSend = window.send;
        window.send = c => { F.sent.push(c); return origSend(c); };
        window.ppCarStatus = (S, stock) => (F.lines[stock] === undefined ? null : { stock, line: F.lines[stock], punched: 0, aboard: 0, spot: rrUiBeside(S, stock) });
        window.ppReady = (S, run, tr) => !tr || tr.consist.every(c => !(F.lines[c.id] > 0));
        window.ppPunchCmd = (S, c, ev) => { if (F.lines[c.car] > 0) { F.lines[c.car]--; pdCount(S, 'punched'); ev.push({ t: 'ppPunched', run: null, tr: c.tr, car: c.car }); } else ev.push({ t: 'ppRefused', why: 'Nobody is waiting' }); };
        window.pgCarStatus = (S, stock) => F.goods[stock] || null;
        window.pgReady = (S, run, tr) => !tr || tr.consist.every(c => !F.goods[c.id] || (!F.goods[c.id].unload && !F.goods[c.id].load));
        window.pgToDeliver = () => ({ ...F.deliver });
        window.pgOnDepart = () => ({ sold: 0, paid: 0, setDown: 0 });   // F's real goods stay in the car (the fakes count instead)
        window.pgDeliverCmd = (S, c, ev) => {
          const I = S.items;
          for (const id of carryHeld(S)) if (I.waybill[id].consignee.id === c.shop) { I.where[id] = null; I.alive[id] = false; F.deliver[c.shop]--; pdCount(S, 'delivered'); ev.push({ t: 'pgDelivered', shop: c.shop, id }); }
        };
        // Goods in the player's hands (plain item records, as F's would be).
        F.give = (consignee, n) => {
          const S = R.state, I = S.items;
          for (let k = 0; k < n; k++) { const id = I.next++; I.waybill[id] = { commodity: 'hardware', consignee, destTownId: 0 }; I.where[id] = { kind: 'CARRIED', actorId: 'player', slot: carryHeld(S).length }; I.alive[id] = true; }
        };
      });
      // ---- The scripted player: reads the Next job line and does it through the buttons ----
      const jobs = [];
      const job = () => ev(() => window.__railhead.pdui.job());
      // The player is put there (the check's shortcut for the walk) and the view looks at him, as the walk's follow would
      // (integrator: the closer default view leaves far places off screen, and a jump is not a walk).
      const goTo = async (x, z) => { await ev(([x, z]) => { const R = window.__railhead, S = R.state; Object.assign(S.player, { x, z, mode: 'idle', use: null, act: null }); R.pix.pixLookAt(x, z); }, [x, z]); await frames(700); };
      const actBtn = async (re) => {
        const r = await ev((src) => { const re = new RegExp(src); const b = [...document.querySelectorAll('.pdAct')].find(e => !e.hidden && e.style.visibility !== 'hidden' && re.test(e.textContent)); if (!b) return null; const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width, h: q.height, text: b.textContent }; }, re.source);
        return r;
      };
      const tapBtn = async (re, what) => {
        const b = await actBtn(re);
        if (!b) { P(`no "${re.source}" button for ${what}: ${JSON.stringify(await ev(() => ({ acts: window.__railhead.pdui.acts().map(a => a.text + ' ' + a.sub), btns: [...document.querySelectorAll('.pdAct')].map(e => e.textContent + (e.hidden ? ' hidden' : '')), pl: [window.__railhead.state.player.x, window.__railhead.state.player.z], needs: rrSwitchNeeds(window.__railhead.state).map(n => [n.run, n.sw, n.want, n.move, n.done, n.set, n.byTime - window.__railhead.state.time, switchLockReason(window.__railhead.state, n.sw)]), ph: window.__railhead.state.pd.ph, sw: window.__fake.sent.filter(c => /witch/.test(c.t)) })))}`); return false; }
        if (b.w < 44 || b.h < 44) P(`the ${b.text} button is ${b.w}x${b.h} px (under thumb size)`);
        await page.mouse.click(b.x, b.y);
        await frames(120);
        return true;
      };
      const stepUntil = (src, max) => ev(([src, max]) => { const R = window.__railhead, f = new Function('R', 'S', 'return (' + src + ')'); let i = 0; for (; i < max && !f(R, R.state); i++) R.step(1); return i < max; }, [src, max]);
      const shotsDone = {};
      let punchedTaps = 0, guard = 0, faked = {};
      const did = { throw: 0, punch: 0, send: 0, unload: 0, load: 0, fetch: 0, deliver: 0, cart: 0, sort: 0 };
      while (guard++ < 80) {
        const j = await job();
        if (!jobs.length || jobs[jobs.length - 1].key !== j.key) jobs.push({ key: j.key, text: j.text });
        const st = await ev(() => { const S = window.__railhead.state, r = svc => S.rr.runs.find(q => q.day === S.pd.day && q.svc === svc); return { ph: S.pd.ph, p1: r('p1') && r('p1').ph, f1: r('f1') && r('f1').ph, p1slot: r('p1') && r('p1').slot, f1slot: r('f1') && r('f1').slot, time: S.time }; });
        // The tickets and goods appear when P1 and F1 stand (fakes).
        if (st.p1 === 'stand' && !faked.p1) {
          faked.p1 = true;
          await ev(slot => { const S = window.__railhead.state, tr = S.trains[slot]; window.__fake.p1 = true; tr.consist.slice(1).forEach((c, i) => { window.__fake.lines[c.id] = [2, 0, 1][i] || 0; }); }, st.p1slot);
          continue;
        }
        if (st.f1 === 'stand' && !faked.f1) {
          faked.f1 = true;
          await ev(slot => { const S = window.__railhead.state, tr = S.trains[slot]; window.__fake.goods[tr.consist[1].id] = { unload: 2, load: 0 }; window.__fake.goods[tr.consist[2].id] = { unload: 0, load: 1 }; window.__fake.f1 = tr.consist.map(c => c.id); }, st.f1slot);
          continue;
        }
        if (st.ph === 'summary') break;
        if (/^(sw|wait)/.test(j.key)) {
          const sw = j.t.sw;
          await goTo(j.t.x, j.t.z);
          if (!shotsDone.sw) { shotsDone.sw = true; await checkOverlap('a switch to throw'); await shot('switch'); }
          const before = await ev(sw => window.__railhead.state.track.switches[sw].state, sw);
          if (!await tapBtn(/^Throw/, j.text)) break;
          if (!await stepUntil(`S.track.switches[${sw}].state !== '${before}'`, 40)) { P(`tapping Throw did not throw switch ${sw} (${j.text})`); break; }
          did.throw++;
        } else if (/^punch/.test(j.key)) {
          await goTo(j.t.x, j.t.z);
          if (!shotsDone.punch) { shotsDone.punch = true; await checkOverlap('punching tickets'); await shot('punch'); }
          if (!await tapBtn(/^Punch \(\d+\)/, j.text)) break;
          await ev(() => window.__railhead.step(2));
          did.punch++; punchedTaps++;
        } else if (/^send/.test(j.key)) {
          await goTo(j.t.x, j.t.z);
          if (!shotsDone.send) { shotsDone.send = true; await shot('sendoff'); }
          if (!await tapBtn(/^Send off/, j.text)) break;
          if (!await stepUntil(`S.rr.runs.some(r => r.ph === 'out' && 'send' + r.id === '${j.key}')`, 20)) { P(`Send off did not send the train (${j.text})`); break; }
          did.send++;
        } else if (/^unload/.test(j.key)) {
          await goTo(j.t.x, j.t.z);
          if (!shotsDone.freight) { shotsDone.freight = true; await checkOverlap('a freight car to unload'); await shot('freight'); }
          if (!await tapBtn(/^Unload/, j.text)) break;
          const used = await ev(() => { const F = window.__fake, c = F.sent.filter(q => q.t === 'useCar').pop(); if (c && F.goods[c.stock]) { pdCount(window.__railhead.state, 'unloaded', F.goods[c.stock].unload); F.goods[c.stock].unload = 0; } return c ? c.stock : null; });
          if (used === null) P('Unload did not open the car (no useCar)');
          await ev(() => { const R = window.__railhead; R.step(3); window.closeCarPanel && closeCarPanel(); });
          did.unload++;
        } else if (/^fetch/.test(j.key)) {
          await ev(() => window.__fake.give({ kind: 'OUTSIDE', id: 'out' }, 1));
          did.fetch++;
        } else if (/^load/.test(j.key)) {
          await goTo(j.t.x, j.t.z);
          if (!await tapBtn(/^Load/, j.text)) break;
          await ev(() => { const F = window.__fake, S = window.__railhead.state, c = F.sent.filter(q => q.t === 'useCar').pop(); if (c && F.goods[c.stock]) F.goods[c.stock].load = 0; for (const id of carryHeld(S)) { S.items.where[id] = null; S.items.alive[id] = false; } pdCount(S, 'loaded'); window.__railhead.step(3); closeCarPanel(); });
          did.load++;
        } else if (j.key === 'cart') {
          await ev(() => { window.__railhead.state.player.tool = 1; });
          did.cart++;
        } else if (j.key === 'sort') {
          await ev(() => window.__fake.give({ kind: 'BUSINESS', id: 'smithy' }, 2));
          did.sort++;
        } else if (/^deliver/.test(j.key)) {
          await goTo(j.t.x, j.t.z);
          await checkOverlap('a shop door');
          await shot('deliver');
          if (!await tapBtn(/^Deliver \(2\)/, j.text)) break;
          await ev(() => window.__railhead.step(1));
          did.deliver++;
        } else if (j.key === 'end') {
          await page.click('#nextJob');
          await frames(150);
          await ev(() => window.__railhead.step(1));
        } else if (j.key === 'summary') {
          await frames(300);
        } else if (/^(idle|held)/.test(j.key)) {
          // Nothing to do (held: the next train waits for another to leave its track; 2026-11-11): on to the next thing. After F1 has gone, the rest of the day is skipped to the evening
          // (the check's own shortcut), with goods for the blacksmith to deliver (fake).
          if (st.f1 === 'gone') {
            const busy = await ev(() => { const S = window.__railhead.state; return S.rr.runs.some(r => r.day === S.pd.day && !r.through && (r.ph === 'in' || r.ph === 'stand' || r.ph === 'out')); });
            if (!busy) {
              await ev(() => { const S = window.__railhead.state; for (const r of S.rr.runs) if (r.day === S.pd.day && (r.ph === 'due' || r.through)) { r.ph = 'gone'; r.skipped = true; } window.__fake.deliver.smithy = 2; window.__railhead.step(2); });
              continue;
            }
            const k = j.key;
            if (!await stepUntil(`window.__railhead.pdui.job().key !== ${JSON.stringify(k)} || !S.rr.runs.some(r => r.day === S.pd.day && !r.through && (r.ph === 'in' || r.ph === 'stand' || r.ph === 'out'))`, 3000)) { P(`stuck at "${j.text}"`); break; }
            continue;
          }
          if (st.p1 === 'out' || st.f1 === 'out') { await stepUntil(`S.rr.runs.every(r => r.ph !== 'out')`, 2000); continue; }
          const k = j.key;
          if (!await stepUntil(`window.__railhead.pdui.job().key !== ${JSON.stringify(k)} || S.rr.runs.some(r => r.day === S.pd.day && r.ph === 'stand' && ((r.svc === 'p1' && !window.__fake.p1) || (r.svc === 'f1' && !window.__fake.f1)))`, 3000)) { P(`stuck at "${j.text}"`); break; }
        } else { P(`unexpected job ${j.key}: ${j.text}`); break; }
      }
      console.log(`  ${orient}: jobs: ${jobs.map(j => j.text).join(' | ')}`);
      const seq = jobs.map(j => j.key.replace(/\d+$/, ''));
      const has = (re, what) => { if (!jobs.some(j => re.test(j.text))) P(`the Next job line never said ${what}`); };
      has(/^Throw switch W1 to track 1 for P1/, '"Throw switch W1 to track 1 for P1"');
      has(/^Punch tickets at coach 1 of P1 \(2 waiting\)/, '"Punch tickets at coach 1 of P1 (2 waiting)"');
      has(/^Punch tickets at coach 3 of P1/, 'to punch at coach 3');
      has(/^Throw switch E1 to track 1 for P1, its way out/, 'P1\'s way out');
      has(/^Send P1 off at the engine/, '"Send P1 off at the engine"');
      has(/^Throw switch E3 to track 3 for F1/, 'F1\'s way in (E3)');
      has(/^Unload F1's car 1 \(2 for the town\)/, '"Unload F1\'s car 1"');
      has(/^Load F1: fetch its goods from the storage shed/, 'to fetch F1\'s goods');
      has(/^Load the goods into F1's car 2/, 'to load F1\'s car 2');
      has(/^Send F1 off/, 'to send F1 off');
      has(/^Take the handcart/, 'to take the handcart');
      has(/^Sort the cart/, 'to sort the cart');
      has(/^Deliver 2 to the blacksmith/, '"Deliver 2 to the blacksmith"');
      has(/end the day/, 'to end the day');
      if (seq.indexOf('punch') > seq.indexOf('send') && seq.includes('send')) P('the Next job line asked to send P1 off before its tickets were punched');
      if (did.punch !== 3) P(`${did.punch} punches tapped, expected 3 (2 at coach 1, 1 at coach 3)`);
      // ---- The summary ----
      await frames(300);
      const s = await ev(() => {
        const R = window.__railhead, S = R.state, el = document.getElementById('pdSum');
        return { ph: S.pd.ph, open: !el.hidden, sum: S.pd.sum, text: el.textContent, guide: S.pd.guide, sentTypes: window.__fake.sent.map(c => c.t) };
      });
      if (s.ph !== 'summary' || !s.open) P(`the end of the day: phase ${s.ph}, summary card shown ${s.open}`);
      else {
        const m2 = s.sum;
        if (m2.punched !== 3 || m2.delivered !== 2 || m2.loaded !== 1 || m2.unloaded !== 2) P(`the summary's figures: ${JSON.stringify(m2)}`);
        const need = [`${m2.trains}: ${m2.onTime} on time, ${m2.late} late`, `${m2.punched} punched`, `${m2.unloaded} unloaded, ${m2.loaded} loaded, ${m2.delivered} delivered`];
        for (const n of need) if (!s.text.includes(n)) P(`the summary card does not say "${n}" (${s.text})`);
        if (!(m2.trains >= 3)) P(`the summary counts ${m2.trains} trains (P1, F1 and the others that came in)`);
      }
      if (s.guide !== 5) P(`the first-day guide reached step ${s.guide}, expected 5 (the evening)`);
      for (const t of ['useSwitch', 'punch', 'rrWaveOff', 'useCar', 'pgDeliver', 'pdEndDay']) if (!s.sentTypes.includes(t)) P(`no ${t} command was sent by the buttons`);
      await checkOverlap('summary');
      await shot('summary');
      // ---- Next day ----
      await page.click('#pdNextDay');
      await frames(150);
      const n = await ev(() => { const R = window.__railhead; R.step(1); return new Promise(res => setTimeout(() => res({ ph: R.state.pd.ph, day: R.state.pd.day, board: !document.getElementById('pdBoard').hidden, sum: !document.getElementById('pdSum').hidden, title: document.getElementById('pdBoardTitle').textContent }), 300)); });
      if (n.ph !== 'morning' || n.day !== 1 || !n.board || n.sum || !/day 2/.test(n.title)) P(`Next day: ${JSON.stringify(n)}`);
      // ---- A long message and the guide's slip: under the top rows, never over a button ----
      const g = await ev(async () => {
        const R = window.__railhead, S = R.state;
        R.pdui.closeBoard(); S.pd.day = 0; R.pdui.ui.boardDay = 0; S.pd.guide = 2; R.pdui.ui.guideSeen = 1;
        toast('A long message to see where it goes: Passenger 1 is waiting at switch W1, which is set against it; walk to the stand by the line and throw it to track 1.', 6000);
        await new Promise(res => setTimeout(res, 400));
        const vis = id => !document.getElementById(id).hidden;
        return { slip: vis('pdGuide'), text: document.getElementById('pdGuideText').textContent };
      });
      if (!g.slip || !/coach doors/.test(g.text)) P(`the first-day guide's slip: ${JSON.stringify(g)}`);
      await checkOverlap('a long message with the guide\'s slip');
      await shot('message');
      await page.click('#pdGuideOk'); await frames(150);
      if (await ev(() => !document.getElementById('pdGuide').hidden)) P('OK does not put the guide\'s slip away');
      // A tap on the schedule board in the world opens its card.
      const tb = await ev(async () => {
        const R = window.__railhead, S = R.state, sb = R.proto.PROTO.SCHEDBOARD;
        Object.assign(S.player, { x: sb.x, z: sb.z + 3 }); await new Promise(res => setTimeout(res, 700));
        const p = window.toScreen(sb.x, 1.8, sb.z); return p;
      });
      await page.mouse.click(tb.x, tb.y); await frames(200);
      if (await ev(() => document.getElementById('pdBoard').hidden)) P('a tap on the schedule board in the world does not open its card');
      if (errors.length) P('console errors: ' + errors.join(' | '));
    } catch (e) { P(String(e && e.stack || e)); } finally { await browser.close(); }
  }
  return problems;
};
