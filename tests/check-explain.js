// Check: explaining as it happens, room at the depot, switch choices (D22; the designer: "Why doesn't the game explain
// this? Stuff just starts happening. The work board is way too close to the schedule board, I can barely see and
// click it.").
// 1. First-time cards. A week of the M1 bot (tutorial skipped) through the page's own card hook: each card fires
//    once and only once (the Overland in, travellers off it, a traveller at the window, our train in at the hub, a
//    low tender, a contract offer, goods in the freight shed, a delivery paid, Saturday pay, the Overland taking cars
//    away), with 2 to 4 sentences and a place for Show me; with nobody at the switches, the switch needs (before
//    08:07) and the train waiting at switch 1. With the tutorial played, no card shows during the welcome and the
//    cards the tutorial teaches (offer, tickets, switches, the Overland's car, the shed, the delivery) are dropped,
//    not doubled. Real frames, portrait and landscape: the Overland card pauses the game (II pressed, the clock
//    stands), Show me by touch closes it, the game runs on at 4x and the helper arrow stands on the set-out car; the
//    game's hash after the same ticks is the same with cards on or off; the shown cards are kept in the save's ui part
//    (export and import), an old sample save has none shown; Settings turns them off (kept in the browser) and on.
// 2. Warnings ahead: in the bot's week every arrival warned of first shows between 30 game minutes and 30 minus 4
//    ticks before it, the Overland's words carry its real cars (the work board's row) and about 2 travellers, ours
//    their travellers and goods; the message (toast) and the Next job line say it.
// 3. The schedule board on its own posts on the platform, clear of the depot's front, the queue, the use spots and
//    the booth door (and not a footprint: the walk grid is unchanged); at zoom 1.5 it is at least 70 px tall on the
//    screen (the old one on the wall about 61); the WORK BOARD roof sign at least 40 px tall (was 28); the Work board button shows anywhere on the hub's
//    station area (not at Willow Ford's platform, but in its booth), and a real tap walks the player to the board and
//    opens its card. At the start zoom, with the ticket window's train orders card and the tutorial's arrow at the
//    work board, the card, the arrow's label, the roof sign and the schedule board do not overlap, nor do the HUD's
//    buttons (with Office, Work board and Centre all showing), portrait and landscape.
// 4. One line at the top: no Current task chip; the Next job line, the Arrows toggle and the gear, no overlaps.
// 5. A new game starts with switch 1 set straight (the work board lists it for the turn-off by 08:07); Willow Ford's
//    spring switches as before; old saves keep their switches.
// Screenshots explain-*.png.

const fs = require('fs');
const path = require('path');
const { openGame, screenshotPath } = require('./browser');
const { BOT_SRC } = require('./m1-bot');

const ALL = ['overlandIn', 'travellersOff', 'ticketLine', 'trainIn', 'switchWait', 'switchNeed', 'lowTender', 'offer', 'shedGoods', 'delivered', 'saturdayPay', 'overlandAway'];
const BOT_CARDS = ALL.filter(id => id !== 'switchWait' && id !== 'switchNeed');   // the bot throws its switches in time
const TAUGHT = ['offer', 'ticketLine', 'switchNeed', 'overlandIn', 'shedGoods', 'delivered'];
const HUD_IDS = ['clock', 'speeds', 'cash', 'buildBtn', 'tgBtn', 'rotL', 'rotR', 'lookBtn', 'officeBtn', 'workBtn', 'centre', 'tutTask', 'nextJob', 'alerts', 'fcard'];

// In the page: a game played by the bot through simTick, each tick's events handed to the cards' hook (what doTick
// does), every card closed with OK as it opens; what opened, and each warning when first seen.
const BOT_RUN = `window.__explainRun = (mode, ticks) => {
  const R = window.__railhead, C = R.cards, S = R.state, bot = (0, eval)('(' + window.__m1src + ')')(R), cards = [], warns = [], seen = {};
  C.CARD.GAP_MS = 0;
  const hm = () => { const t = S.time + 18000; return 'd' + (Math.floor(t / 86400) + 1) + ' ' + String(Math.floor(t % 86400 / 3600)).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0'); };
  const step = cmds => { const ev = R.simTick(S, cmds); bot.observe(S, ev); C.tick(ev); return ev; };
  step([]);
  let welcomeCards = 0;
  if (mode === 'skip') step([{ t: 'tutorialSkip' }]);
  else { for (let i = 0; i < 40; i++) { step([]); if (C.ui.open) { welcomeCards++; C.close(false); } } step([{ t: 'tgAnswer', id: S.tut.tg, b: 0 }]); }
  for (let i = 0; i < ticks; i++) {
    step(bot.decide(S));
    const o = C.ui.open;
    if (o) {
      const c = C.CARDS[o.id], text = document.getElementById('fcardText').textContent;
      cards.push({ id: o.id, at: hm(), title: document.getElementById('fcardTitle').textContent, text, place: !!c.place(S, o.v), showMe: !document.getElementById('fcardShow').hidden, tutStep: S.tut.step, paused: document.querySelector('#speeds [data-speed="0"]').getAttribute('aria-pressed') === 'true' });
      C.close(false);
    }
    const w = C.warn.now;
    if (w && !seen[w.key]) {
      seen[w.key] = true;
      const row = C.warnRows().find(q => q.key === w.key), ov = /^ov:/.test(w.key) ? R.board.wbRows('hub').find(r => r.overland) : null;
      warns.push({ key: w.key, at: hm(), d: row ? row.d : null, text: w.text, cars: ov ? ov.cars.n : null, toast: document.getElementById('toast').textContent, line: R.guide.job().text });
    }
  }
  return { cards, warns, welcomeCards, shown: C.shown(), tutDone: S.tut.done };
};`;

const sentences = t => t.split(/(?<=[.!?])\s+|(?<=[.!?])$/).map(s => s.trim()).filter(Boolean).length;

module.exports = async function checkExplain() {
  const problems = [], P = m => problems.push(m);
  const fixtures = fs.readdirSync(path.join(__dirname, 'fixtures')).filter(f => /^save-v\d+\.json$/.test(f)).map(f => ({ f, save: JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8')).save }));

  // ---------------- 1 and 2 in the sim with the page's card hook (portrait page) ----------------
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused', cards: true });
    try {
      await page.evaluate(src => { window.__m1src = src; }, BOT_SRC);
      await page.evaluate(BOT_RUN);
      // 5: switch 1 in a new game, Willow Ford's springs; old saves keep theirs.
      const sw = await page.evaluate(fx => {
        const R = window.__railhead, S = R.state, T = S.track, need = R.tt.ttSwitchNeeds(S)[0];
        const old = fx.map(({ f, save: raw }) => { const save = typeof raw === 'string' ? JSON.parse(raw) : raw, before = save.state.track && save.state.track.switches && save.state.track.switches[1] ? save.state.track.switches[1].state : null;
          const sv = R.migrate(JSON.parse(JSON.stringify(save))); return { f, before, after: sv.state.track.switches[1] ? sv.state.track.switches[1].state : null, cards: sv.ui && sv.ui.cards }; });
        const row = R.board.wbRows('hub').find(r => r.switches && r.switches.some(w => w.sw === 1));
        return { s1: T.switches[1].state, s2: [T.switches[2].spring, T.switches[2].lever], s3: [T.switches[3].spring, T.switches[3].lever], need, old,
          board: row ? row.switches.find(w => w.sw === 1) : null, yard: R.newState(1866, 'yard').track.switches.map(W => W.state).join('') };
      }, fixtures);
      if (sw.s1 !== 'N') P(`5: a new game's switch 1 should start set straight (N), is ${sw.s1}`);
      if (!sw.need || sw.need.sw !== 1 || sw.need.want !== 'reverse' || sw.need.by !== '08:07' || sw.need.done) P(`5: the first switch need should be switch 1 to the turn-off by 08:07, not done: ${JSON.stringify(sw.need)}`);
      if (!sw.board || sw.board.done || sw.board.want !== 'reverse') P(`5: the work board should list switch 1 for the turn-off, not set: ${JSON.stringify(sw.board)}`);
      if (!sw.s2[0] || sw.s2[1] !== 'N' || !sw.s3[0] || sw.s3[1] !== 'R') P(`5: Willow Ford's spring switches changed: ${JSON.stringify([sw.s2, sw.s3])}`);
      for (const o of sw.old) if (o.before !== null && o.before !== o.after && o.f !== 'save-v15.json') P(`5: ${o.f} should keep its switch 1 (${o.before}), loads with ${o.after}`);
      console.log(`  5: new game switch 1 ${sw.s1}, first need ${JSON.stringify({ sw: sw.need.sw, want: sw.need.want, by: sw.need.by, done: sw.need.done })}; yard switches ${sw.yard}; ${sw.old.length} old saves keep theirs`);

      // 1: the bot's week, tutorial skipped.
      const A = await page.evaluate(() => window.__explainRun('skip', 10800 * 7));
      const ids = A.cards.map(c => c.id);
      for (const id of BOT_CARDS) if (!ids.includes(id)) P(`1: the ${id} card never showed in the bot's week`);
      for (const id of new Set(ids)) if (ids.filter(x => x === id).length > 1) P(`1: the ${id} card showed ${ids.filter(x => x === id).length} times`);
      for (const c of A.cards) {
        const n = sentences(c.text);
        if (n < 2 || n > 4) P(`1: the ${c.id} card has ${n} sentences: ${c.text}`);
        if (!c.title || !c.place || !c.showMe) P(`1: the ${c.id} card needs a title and a Show me place: ${JSON.stringify(c)}`);
        if (!c.paused) P(`1: the ${c.id} card did not pause the game`);
      }
      console.log('  1: bot week, tutorial skipped: ' + A.cards.map(c => `${c.id} ${c.at}`).join(', '));
      for (const c of A.cards) console.log(`    ${c.id}: "${c.title}" ${c.text}`);
      // 2: the warnings seen in that week.
      const ov = A.warns.filter(w => /^ov:/.test(w.key)), ours = A.warns.filter(w => !/^ov:/.test(w.key));
      if (ov.length < 13) P(`2: the Overland should be warned of twice a day: ${ov.length} warnings in the week`);
      if (ours.length < 20) P(`2: our train's arrivals should be warned of: only ${ours.length} in the week`);
      for (const w of A.warns) {
        if (!(w.d > 1800 - 4 * 8 - 1e-9 && w.d <= 1800)) P(`2: a warning first seen ${w.d} game seconds before its arrival (want 30 minutes, within 4 ticks): ${w.key} ${w.at}`);
        if (w.toast !== w.text) P(`2: the message should say the warning: "${w.toast}" vs "${w.text}"`);
      }
      for (const w of ov) {
        const m = /^The Overland is due at (06:00|18:00) with (no goods of yours|(\d+) cars? of your goods) and about 2 travellers\.( It takes away the \d+ cars? on the interchange if they are empty\.)? Meet it at the interchange\.$/.exec(w.text);
        if (!m) P(`2: the Overland's warning reads "${w.text}"`);
        else if ((m[3] ? Number(m[3]) : 0) !== w.cars) P(`2: the Overland's warning says ${m[3] || 0} cars, the work board's row ${w.cars}: ${w.text}`);
      }
      for (const w of ours) if (!/^No\. 1 is due at (the hub|Willow Ford) at \d\d:\d\d( with [^.]+)?\.( She wants [^.]+\.)? Meet her at the platform\.$/.test(w.text)) P(`2: our train's warning reads "${w.text}"`);
      const lineOk = A.warns.filter(w => w.line === 'Next: ' + w.text.charAt(0).toLowerCase() + w.text.slice(1)).length;
      if (lineOk < A.warns.length * 0.5) P(`2: the Next job line said the warning only ${lineOk} times of ${A.warns.length}: ${JSON.stringify(A.warns.slice(0, 3).map(w => w.line))}`);
      console.log(`  2: ${ov.length} Overland and ${ours.length} train warnings, first seen ${Math.min(...A.warns.map(w => w.d))} to ${Math.max(...A.warns.map(w => w.d))} s ahead; the Next job line said ${lineOk} of them (else a switch came first)`);
      console.log(`    e.g. "${(ov.find(w => w.cars) || ov[0]).text}" / "${ours[0].text}"`);

      // 1: the switch cards, with nobody at the switches; then the shown list in the save.
      const B = await page.evaluate(() => {
        const R = window.__railhead, C = R.cards;
        R.importSave(JSON.stringify({ state: R.newState(1866) }));
        const S = R.state, out = [];
        R.office.ui.slide.id = null; R.office.ui.slide.queue = [];   // (no frames run in this loop: no telegram is sliding in)
        R.step(1); R.send({ t: 'tutorialSkip' });
        for (let i = 0; i < 450 * 4 && out.length < 8; i++) { R.step(1); const o = C.ui.open; if (o) { out.push({ id: o.id, t: S.time, text: document.getElementById('fcardText').textContent }); C.close(false); } }
        const json = R.exportSave(), ui = JSON.parse(json).ui;
        R.importSave(JSON.stringify({ state: JSON.parse(json).state }));   // a save without the list: none shown
        const none = C.shown().length;
        R.importSave(json);
        return { out, saved: ui.cards, none, back: C.shown() };
      });
      const at = id => { const c = B.out.find(c => c.id === id); return c ? c.t : null; };
      if (at('switchNeed') === null || at('switchNeed') + 18000 > 8 * 3600 + 7 * 60) P(`1: the switch card should show before 08:07 with nobody at the switches: ${JSON.stringify(B.out.map(c => c.id))}`);
      if (at('switchWait') === null || at('switchWait') + 18000 < 8 * 3600) P(`1: the waiting-at-a-switch card should show once No. 1 stops at switch 1 after 08:00: ${JSON.stringify(B.out.map(c => [c.id, c.t]))}`);
      if (JSON.stringify(B.saved) !== JSON.stringify(B.back) || !B.saved.includes('switchNeed') || B.none !== 0) P(`1: the shown cards should be kept in the save's ui part: ${JSON.stringify(B)}`);
      console.log(`  1: switches: ${B.out.map(c => c.id + ' ' + Math.floor((c.t + 18000) / 3600) + ':' + String(Math.floor((c.t + 18000) % 3600 / 60)).padStart(2, '0')).join(', ')}; saved ${B.saved.join(',')}`);
      for (const c of B.out.filter(c => /^switch/.test(c.id))) console.log(`    ${c.id}: ${c.text}`);

      // 1: with the tutorial played: nothing during the welcome; what it teaches is not doubled.
      await page.evaluate(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); });
      const T = await page.evaluate(() => window.__explainRun('tutorial', 10800 * 2));
      if (T.welcomeCards) P(`1: ${T.welcomeCards} cards showed during the tutorial's welcome`);
      for (const c of T.cards) if (TAUGHT.includes(c.id)) P(`1: the tutorial teaches ${c.id}, but its card showed too (${c.at}, step ${c.tutStep})`);
      for (const id of TAUGHT.filter(id => BOT_CARDS.includes(id))) if (!T.shown.includes(id) && T.tutDone) P(`1: ${id} should count as shown once the tutorial has taught it`);
      console.log(`  1: tutorial played (done ${T.tutDone}): cards ${T.cards.map(c => `${c.id} ${c.at} (step ${c.tutStep})`).join(', ')}; taught and dropped: ${TAUGHT.filter(id => T.shown.includes(id) && !T.cards.some(c => c.id === id)).join(', ')}`);
      if (errors.length) P('portrait sim: console errors: ' + errors.join(' | '));
    } catch (e) { P('sim part: ' + (e && e.stack || e)); }
    await browser.close();
  }

  // ---------------- In the page, by touch: portrait and landscape ----------------
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused', cards: true });
    const R = (f, a) => page.evaluate(f, a);
    const frames = async ms => { await page.waitForTimeout(ms || 450); };
    const tapSel = async sel => { const b = await page.$(sel); const r = b && await b.boundingBox(); if (!r) return false; await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await frames(300); return true; };
    const pressed = () => R(() => { const b = document.querySelector('#speeds [aria-pressed="true"]'); return b ? b.dataset.speed : null; });
    try {
      await page.evaluate(src => { window.__m1src = src; }, BOT_SRC);
      // 4: one line at the top, no Current task chip.
      const top = await R(() => ({ chip: !!document.getElementById('tutChip'), cur: [...document.querySelectorAll('.hud')].some(e => !e.hidden && /Current task/.test(e.textContent)), line: !document.getElementById('nextJob').hidden,
        tools: !document.getElementById('hintBtn').hidden && !!document.getElementById('hintBtn').getClientRects().length, gear: !!document.getElementById('setBtn').getClientRects().length }));
      if (top.chip || top.cur) P(`${orient} 4: the Current task chip should be gone`);
      if (!top.line || !top.tools || !top.gear) P(`${orient} 4: the Next job line, the Arrows toggle and the gear should show: ${JSON.stringify(top)}`);

      // 3: the schedule board's place and size, the roof sign.
      const bd = await R(() => {
        const R = window.__railhead, S = R.state, list = R.board.list, sched = list.find(b => b.kind === 'sched' && b.st === 'hub'), sign = list.find(b => b.kind === 'sign' && b.st === 'hub');
        const W = R.world, fp = W.footprints ? null : null, foots = R.buildings.footprints(), dep = foots.find(f => f.id === 'depot'), plat = foots.find(f => f.id === 'platform');
        const K = R.pax.paxStation('hub'), slots = R.pax.paxQueueSlots ? R.pax.paxQueueSlots(S, K) : [];
        const seg = b => { const c = Math.cos(b.yaw) * b.w / 2, s = -Math.sin(b.yaw) * b.w / 2; return [[b.x - c, b.z - s], [b.x + c, b.z + s]]; };
        const dSeg = (p, [[ax, az], [bx, bz]]) => { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(p[0] - ax - t * vx, p[1] - az - t * vz); };
        const g = seg(sched), qMin = Math.min(...slots.map(q => dSeg([q[0] / 100, q[1] / 100], g)));
        const spots = R.world.buildingSpots().filter(p => p.building === 'depot'), sMin = Math.min(...spots.map(p => dSeg([p.x, p.z], g)));
        const booth = R.board.booths().filter(b => b.id === 'depot'), bMin = Math.min(...booth.map(b => dSeg([b.x, b.z], g)));
        const inDepot = Math.abs(sched.x - dep.x) < dep.w / 2 + 0.3 && Math.abs(sched.z - dep.z) < dep.d / 2 + 0.3;
        const onPlat = Math.abs(sched.x - plat.x) < plat.w / 2 && Math.abs(sched.z - plat.z) < plat.d / 2;
        return { has: !!sched, post: sched && sched.post, inDepot, onPlat, qMin, sMin, bMin, foot: foots.some(f => f.kind === 'schedboard'), frontGap: (dep.z + dep.d / 2) - sched.z, sw: sign && sign.w, sh: sign && sign.h };
      });
      if (!bd.has || bd.post !== 'schedboard1') P(`${orient} 3: the hub's schedule board should stand on its posts (schedboard1): ${JSON.stringify(bd)}`);
      if (bd.inDepot || !bd.onPlat) P(`${orient} 3: the schedule board should be on the platform, clear of the depot: ${JSON.stringify(bd)}`);
      if (!(bd.qMin >= 0.5 && bd.sMin >= 1.5)) P(`${orient} 3: the schedule board should keep clear of the queue (${bd.qMin.toFixed(2)}u) and the depot's use spots (${bd.sMin.toFixed(2)}u)`);
      if (bd.foot) P(`${orient} 3: the schedule board's posts should not be a footprint (the walk grid stays as it was)`);
      // At zoom 1.5 from the platform in front of the window (the start zoom), and from beside it.
      const size = await R(() => {
        const R = window.__railhead, S = R.state, K = R.pax.paxStation('hub'), b = R.board.list.find(b => b.kind === 'sched' && b.st === 'hub');
        S.player.x = b.x - 2; S.player.z = b.z + 4; S.player.mode = 'idle'; R.camera.zoom = 1.5; R.camera.ox = 0; R.camera.oz = 0;
        return true; });
      await frames(900);
      const px = await R(() => {
        const R = window.__railhead, h = b => { const t = R.toScreen(b.x, b.z, b.y + b.h / 2), u = R.toScreen(b.x, b.z, b.y - b.h / 2); return Math.abs(u.y - t.y); };
        const b = R.board.list.find(b => b.kind === 'sched' && b.st === 'hub'), sg = R.board.list.find(b => b.kind === 'sign' && b.st === 'hub'), c = R.toScreen(b.x, b.z, b.y);
        return { sched: h(b), sign: h(sg), on: c.x > 0 && c.x < innerWidth && c.y > 0 && c.y < innerHeight, mode: b.mode };
      });
      // (The old board on the depot wall was 1.12 M1 = 1.79u tall, about 61 px at zoom 1.5; the new one is 2.2u.)
      if (px.sched < 70 || !px.on || px.mode !== 'big') P(`${orient} 3: at zoom 1.5 the schedule board should be on screen, at least 70 px tall (the old one about 61), in big letters: ${JSON.stringify(px)}`);
      if (px.sign < 40) P(`${orient} 3: the WORK BOARD roof sign should be at least 40 px tall at zoom 1.5 (was 28): ${px.sign.toFixed(1)}`);
      await page.screenshot({ path: screenshotPath(`explain-schedboard-${orient}`) });
      console.log(`  ${orient} 3: schedule board on ${bd.post}, ${bd.qMin.toFixed(2)}u from the queue, ${bd.sMin.toFixed(2)}u from the use spots, ${px.sched.toFixed(0)} px tall at zoom 1.5; roof sign ${px.sign.toFixed(0)} px`);

      // 3 and 4: no overlap at the start zoom: the train orders card (at the window), the tutorial's arrow label (the
      // work board), the roof sign and the schedule board; the HUD with Office, Work board and Centre.
      await R(() => { const R = window.__railhead; R.step(1); R.send({ t: 'tgAnswer', id: R.state.tut.tg, b: 0 }); R.step(1); R.cards.setPref(false); });
      for (const spot of ['line', 'desk', 'door']) {
        await R(spot => {
          const R = window.__railhead, S = R.state, K = R.pax.paxStation('hub'), d = R.office.econDeskSpot();
          const p = spot === 'line' ? K.line : spot === 'desk' ? d : { x: K.line.x + 1.5, z: K.line.z + 2.5 };
          S.player.x = p.x; S.player.z = p.z; S.player.mode = 'idle'; R.camera.zoom = 1.5; R.camera.ox = spot === 'desk' ? 4 : 0; R.camera.oz = 0;
        }, spot);
        await frames(900);
        const ov = await R(ids => {
          const R = window.__railhead, vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden', boxes = [];
          for (const id of ['ttCard', 'guideLabel']) { const e = document.getElementById(id); if (vis(e)) boxes.push({ id, r: e.getBoundingClientRect() }); }
          for (const b of R.board.list.filter(b => b.st === 'hub' && b.kind !== 'work' && b.shown !== false)) {   // (the roof sign is put away in the booth and its doorway)
            const c = Math.cos(b.yaw) * b.w / 2, s = -Math.sin(b.yaw) * b.w / 2, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => R.toScreen(b.x + u * c, b.z + u * s, b.y + v * b.h / 2));
            const r = { left: Math.min(...pts.map(p => p.x)), top: Math.min(...pts.map(p => p.y)), right: Math.max(...pts.map(p => p.x)), bottom: Math.max(...pts.map(p => p.y)) };
            if (r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight) boxes.push({ id: b.kind, r });
          }
          const hud = [];
          for (const id of ids) { const e = document.getElementById(id); if (vis(e)) hud.push({ id, r: e.getBoundingClientRect() }); }
          const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
          const out = [];
          for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(boxes[i].r, boxes[j].r)) out.push(boxes[i].id + '/' + boxes[j].id);
          for (const b of boxes.filter(b => b.id === 'ttCard' || b.id === 'guideLabel')) for (const h of hud) if (hit(b.r, h.r)) out.push(b.id + '/' + h.id);
          for (let i = 0; i < hud.length; i++) for (let j = i + 1; j < hud.length; j++) if (hit(hud[i].r, hud[j].r)) out.push(hud[i].id + '/' + hud[j].id);
          for (const h of hud) if (h.r.left < -0.5 || h.r.right > innerWidth + 0.5 || h.r.top < -0.5 || h.r.bottom > innerHeight + 0.5) out.push(h.id + ' off screen');
          return { out, seen: boxes.map(b => b.id), hud: hud.map(h => h.id), job: R.guide.job().text };
        }, HUD_IDS);
        if (ov.out.length) P(`${orient} 3: at the ${spot}, these overlap: ${ov.out.join(', ')} (shown: ${ov.seen.join(', ')}; HUD ${ov.hud.join(', ')})`);
        console.log(`  ${orient} 3: at the ${spot}: shown ${ov.seen.join(', ')}; HUD ${ov.hud.join(', ')}; ${ov.out.length ? 'OVERLAPS ' + ov.out.join(', ') : 'no overlaps'}`);
        if (spot === 'line') await page.screenshot({ path: screenshotPath(`explain-hub-platform-${orient}`) });
        if (spot === 'desk') await page.screenshot({ path: screenshotPath(`explain-workbtn-${orient}`) });
      }

      // 3: the Work board button anywhere on the hub's station area, and a real tap on it.
      const wb = await R(() => {
        const R = window.__railhead, S = R.state, out = {}, K = R.pax.paxStation('hub'), W = R.pax.paxStation('willow'), B = R.cargo.BLD_BAYS.freightshed.bays[0];
        const spots = { west: { x: K.plat.x - K.plat.w / 2 + 2, z: K.plat.z }, dock: B, line: K.line, tower: (R.tt.ttStation(S, 'hub').water || {}), wfPlatform: W ? W.line : null };
        return spots;
      });
      const seenAt = {};
      for (const [k, p] of Object.entries(wb)) {
        if (!p || p.x === undefined) continue;
        const x = p.sx !== undefined ? p.sx : p.x, z = p.sz !== undefined ? p.sz : p.z;
        await R(([x, z]) => { const S = window.__railhead.state; S.player.x = x; S.player.z = z; S.player.mode = 'idle'; window.__railhead.camera.ox = 0; }, [x, z]);
        await frames(250);
        seenAt[k] = await R(() => { const b = document.getElementById('workBtn'); return !b.hidden && !!b.getClientRects().length; });
      }
      for (const k of ['west', 'dock', 'line', 'tower']) if (!seenAt[k]) P(`${orient} 3: the Work board button should show at the hub (${k}): ${JSON.stringify(seenAt)}`);
      if (seenAt.wfPlatform) P(`${orient} 3: the Work board button should not show on Willow Ford's platform`);
      const wfBooth = await R(() => { const R = window.__railhead, S = R.state, sp = R.world.buildingSpots().find(p => p.building === 'wfdepot' && p.kind === 'workboard'); S.player.x = sp.x; S.player.z = sp.z; return true; });
      await frames(250);
      if (!(await R(() => !document.getElementById('workBtn').hidden))) P(`${orient} 3: the Work board button should show in Willow Ford's booth`);
      // From the platform's west end: a tap walks to the board and opens its card there.
      await R(p => { const S = window.__railhead.state; S.player.x = p.x; S.player.z = p.z; S.player.mode = 'idle'; }, wb.west);
      await frames(300);
      await tapSel('#workBtn');
      await R(() => { const R = window.__railhead; R.step(2); });
      let open = false;
      for (let k = 0; k < 40 && !open; k++) { await R(() => window.__railhead.step(20)); await frames(120); open = await R(() => window.__railhead.board.workUi.open && window.__railhead.board.workUi.st === 'hub'); }
      if (!open) P(`${orient} 3: a tap on the Work board button from the platform's west end should walk to the board and open its card`);
      await R(() => window.__railhead.board.closeWorkCard());
      console.log(`  ${orient} 3: Work board button at ${Object.entries(seenAt).map(([k, v]) => k + ' ' + (v ? 'shown' : 'hidden')).join(', ')}, Willow Ford's booth shown; tapped at the west end: ${open ? 'walked there, card open' : 'FAILED'}`);

      // 1: real frames: the Overland's card pauses the game; Show me by touch; the game runs on.
      await R(() => {
        const R = window.__railhead, C = R.cards;
        R.importSave(JSON.stringify({ state: R.newState(1866) }));
        const S = R.state, bot = (0, eval)('(' + window.__m1src + ')')(R);
        let ev = R.simTick(S, []); bot.observe(S, ev); ev = R.simTick(S, [{ t: 'tutorialSkip' }]); bot.observe(S, ev);
        while ((S.time + 18000) % 86400 < 18 * 3600 + 15 * 60) { ev = R.simTick(S, bot.decide(S)); bot.observe(S, ev); }
        C.setPref(true); C.load(C.CARDS ? Object.keys(C.CARDS).filter(id => id !== 'overlandIn' && id !== 'travellersOff') : []);
        C.CARD.GAP_MS = 1200;
        const P = S.player; P.x = -20; P.z = -9; P.mode = 'idle'; R.camera.zoom = 1.5;
      });
      await tapSel('#speeds [data-speed="4"]');
      let card = null;
      for (let k = 0; k < 80 && !card; k++) { await frames(200); card = await R(() => { const o = window.__railhead.cards.ui.open; return o ? o.id : null; }); }
      if (card !== 'overlandIn') P(`${orient} 1: the Overland's card should open in real time at 4x: ${card}`);
      else {
        const t0 = await R(() => window.__railhead.state.tick); await frames(700); const t1 = await R(() => window.__railhead.state.tick);
        if (t1 !== t0 || (await pressed()) !== '0') P(`${orient} 1: the card should pause the game (II pressed, the clock standing): ticks ${t0} -> ${t1}, pressed ${await pressed()}`);
        await page.screenshot({ path: screenshotPath(`explain-card-overland-${orient}`) });
        const fit = await R(() => { const r = document.getElementById('fcard').getBoundingClientRect(), b = [...document.querySelectorAll('#fcard button')].map(e => e.getBoundingClientRect()); return { inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, small: b.filter(q => q.height < 48 || q.width < 48).length }; });
        if (!fit.inside || fit.small) P(`${orient} 1: the card should fit the screen with buttons of 48 px or more: ${JSON.stringify(fit)}`);
        await tapSel('#fcardShow');
        const after = await R(() => { const R = window.__railhead, t = R.guide.now(), car = R.state.trains.find(t => t.owner === 'interchange'), ps = R.trainPoses(R.state.track, car);
          return { hidden: document.getElementById('fcard').hidden, t, near: t ? Math.min(...ps.map(p => Math.hypot(p.x - t.x, p.z - t.z))) : null, arrow: R.guide.ui.arrow && R.guide.ui.arrow.visible }; });
        await frames(600);
        const t2 = await R(() => window.__railhead.state.tick);
        if (!after.hidden || (await pressed()) !== '4' || !(t2 > t1)) P(`${orient} 1: Show me should close the card and the game run on at 4x: ${JSON.stringify(after)} pressed ${await pressed()} ticks ${t1} -> ${t2}`);
        if (!after.t || after.t.k !== 'car' || !(after.near < 0.1)) P(`${orient} 1: Show me should put the arrow on the Overland's car: ${JSON.stringify(after.t)} (${after.near})`);
        await tapSel('#speeds [data-speed="0"]');
        await frames(400);
        await page.screenshot({ path: screenshotPath(`explain-showme-${orient}`) });
        // The next card (travellers off it) waits its gap, then shows; OK by touch.
        let next = null;
        await tapSel('#speeds [data-speed="1"]');
        for (let k = 0; k < 20 && !next; k++) { await frames(200); next = await R(() => { const o = window.__railhead.cards.ui.open; return o ? o.id : null; }); }
        if (next !== 'travellersOff') P(`${orient} 1: the travellers' card should follow: ${next}`);
        await tapSel('#fcardOk');
        if ((await pressed()) !== '1') P(`${orient} 1: OK should let the game run on at 1x: ${await pressed()}`);
        await tapSel('#speeds [data-speed="0"]');
        console.log(`  ${orient} 1: real frames: ${card} paused the game (ticks ${t0} -> ${t1}); Show me: arrow on the car (${after.near.toFixed(2)}u), the game ran on at 4x (tick ${t2}); then ${next}, OK`);
      }

      // 1: Settings turns the cards off and on (kept in the browser).
      await tapSel('#setBtn');
      await page.screenshot({ path: screenshotPath(`explain-settings-${orient}`) });
      await tapSel('#setCards');
      const off = await R(() => { const R = window.__railhead, C = R.cards; C.load([]); C.tick([{ t: 'overlandPickedUp', cars: 1, sold: 0, paid: 0, stock: [] }]);
        return { open: !!C.ui.open, pref: localStorage.getItem('railhead-cards'), btn: document.getElementById('setCards').textContent }; });
      if (off.open || off.pref !== 'off' || off.btn !== 'Off') P(`${orient} 1: Settings should turn the cards off (kept in the browser): ${JSON.stringify(off)}`);
      await tapSel('#setCards');
      await tapSel('#settingsClose');
      const on = await R(() => { const R = window.__railhead, C = R.cards; C.CARD.GAP_MS = 0; C.load(Object.keys(C.CARDS).filter(id => id !== 'overlandAway')); C.tick([{ t: 'overlandPickedUp', cars: 1, sold: 0, paid: 0, stock: [] }]); const o = C.ui.open; C.close(false); return { id: o && o.id, pref: localStorage.getItem('railhead-cards') }; });
      if (on.id !== 'overlandAway' || on.pref !== 'on') P(`${orient} 1: Settings should turn the cards on again: ${JSON.stringify(on)}`);

      // 2: the warning in the Next job line and the message (real frames, the Overland at 18:00 the next day).
      await R(() => {
        const R = window.__railhead, S = R.state, bot = (0, eval)('(' + window.__m1src + ')')(R);
        R.cards.setPref(false);
        const end = (Math.floor((S.time + 18000) / 86400) + 1) * 86400 + 17 * 3600 + 29 * 60 - 18000;   // the next day, 17:29
        while (S.time < end) { const ev = R.simTick(S, bot.decide(S)); bot.observe(S, ev); }
        const sw = R.tt.ttSwitchNeeds(S).filter(n => !n.done);
        for (const n of sw) { const W = S.track.switches[n.sw]; if (W && !W.spring) W.state = n.want === 'reverse' ? 'R' : 'N'; }   // (screenshot only: no switch job in front of it)
        R.camera.zoom = 1.5;
      });
      await tapSel('#speeds [data-speed="1"]');
      let line = null;
      for (let k = 0; k < 30 && !line; k++) { await frames(200); line = await R(() => { const t = document.getElementById('nextJobText').textContent; return /Overland is due/.test(t) ? t : null; }); }
      await tapSel('#speeds [data-speed="0"]');
      const msg = await R(() => ({ toast: document.getElementById('toast').textContent, shown: document.getElementById('toast').classList.contains('show'), long: document.getElementById('nextJob').classList.contains('long'),
        clipped: (() => { const s = document.getElementById('nextJobText'); return s.scrollHeight > s.clientHeight + 1; })() }));
      if (!line || !/^Next: the Overland is due at 18:00 with/.test(line)) P(`${orient} 2: the Next job line should warn of the Overland: ${line}`);
      if (!msg.shown || !/^The Overland is due at 18:00/.test(msg.toast)) P(`${orient} 2: a message should warn of the Overland: ${JSON.stringify(msg)}`);
      if (msg.clipped) P(`${orient} 2: the warning should fit the Next job line (3 lines at most)`);
      await page.screenshot({ path: screenshotPath(`explain-warning-${orient}`) });
      console.log(`  ${orient} 2: "${line}"; message shown ${msg.shown}`);
      // No overlaps with the long line either.
      const ov2 = await R(ids => { const vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden', hud = [];
        for (const id of ids) { const e = document.getElementById(id); if (vis(e)) hud.push({ id, r: e.getBoundingClientRect() }); }
        const out = []; for (let i = 0; i < hud.length; i++) for (let j = i + 1; j < hud.length; j++) { const a = hud[i].r, b = hud[j].r; if (a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5) out.push(hud[i].id + '/' + hud[j].id); }
        return out; }, HUD_IDS);
      if (ov2.length) P(`${orient} 4: with a warning in the Next job line these overlap: ${ov2.join(', ')}`);

      // 1: cards on or off, the same ticks give the same hash (the pause only stops the clock).
      const h = await R(() => {
        const R = window.__railhead, C = R.cards, run = on => { R.importSave(JSON.stringify({ state: R.newState(1866) })); C.setPref(on); C.CARD.GAP_MS = 0; let n = 0;
          R.office.ui.slide.id = null; R.office.ui.slide.queue = [];   // (no frames run in this loop: no telegram is sliding in)
          R.step(1); R.send({ t: 'tutorialSkip' }); for (let i = 0; i < 1500; i++) { R.step(1); if (C.ui.open) { n++; C.close(i % 2 === 0); } } return [R.hash(), n]; };
        const a = run(true), b = run(false); C.setPref(true); return { a, b };
      });
      if (h.a[0] !== h.b[0] || h.a[1] < 2) P(`${orient} 1: cards on and off should give the same hash: ${JSON.stringify(h)}`);
      const dc = await R(() => window.__railhead.drawCalls);
      console.log(`  ${orient} 1: 1500 ticks with ${h.a[1]} cards: hash ${h.a[0]}, with cards off ${h.b[0]}; draw calls ${dc}`);
      if (errors.length) P(`${orient}: console errors: ` + errors.join(' | '));
    } catch (e) { P(`${orient}: ` + (e && e.stack || e)); }
    await browser.close();
  }
  return problems;
};
