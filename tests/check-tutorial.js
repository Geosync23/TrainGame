// Check: the investor's tutorial (M1 package 8, builder D2; design-doc 16 "Onboarding", D13, and the M1 acceptance
// line "From a new game, the player can complete the tutorial with no debug tools").
//
// 1. A bot plays a new game (the real start) through the game's own commands only (the same commands the taps and
//    buttons send; no debug tools, no state edits) and does what each telegram asks: OK on the welcome, accept the
//    general store's flour offer and order the flour at the telegraph key, throw a switch (and back), sell tickets
//    at the window, unload an item from the Overland's set-out car, sort it into its bay, deliver it at the store's
//    door. Every step's telegram arrives in order and the tutorial ends within days 1 and 2; the money rule and item
//    conservation hold; the hint marker's place is on the map for every step that has one.
// 2. Skip tutorial (the welcome's second button) ends it at once; a day of play after it (the M1 bot) brings no
//    more tutorial telegrams.
// 3. Save and reload mid-tutorial (at the tickets step) loads with the same hash, resumes the same step and ends
//    with the same hash as the game played straight through; the game played twice gives the same hash.
// 4. An old save (every sample in tests/fixtures before schema 12) loads with the tutorial done and sends none.
// 5. In the page: the Current task chip and the telegram card (the tutorial's own drawing; D1's inbox is drawn
//    separately) for the first telegram and a later one, portrait and landscape, buttons at least 48 px, the
//    brass marker drawn over the step's place, no console errors. Screenshots tutorial-*.png.

const fs = require('fs');
const path = require('path');
const { openGame, screenshotPath } = require('./browser');
const { BOT_SRC } = require('./m1-bot');

const DAY = 10800;   // ticks in a game day

// The tutorial bot, evaluated in the page. It reads the step in hand (the Current task chip and the telegram's
// words) and the state a player sees, and sends at most one command a tick. Its memory is plain data.
function tutBotFactory(R, mem0) {
  const mem = mem0 || { sw: null, back: 0, wait: 0, refusals: 0, skip: false };
  const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  function decide(S) {
    const P = S.player, c = R.tut.tutCurrent(S);
    if (!c || P.act || P.mode === 'to' || S.tick < mem.wait) return [];
    const one = cmd => [cmd];
    const held = R.carry.carryHeld(S);
    if (c.key === 'welcome') return one({ t: 'tgAnswer', id: c.tg, b: mem.skip ? 1 : 0 });
    if (c.key === 'accept' || c.key === 'order') {
      const k = R.econ.econTelegraphKey();
      if (d2(P.x, P.z, k.x, k.z) > 2.5) return one({ t: 'useTelegraph' });
      const flour = S.econ.contracts.find(x => x.counterparty === 0 && x.commodity === 'flour');
      if (c.key === 'accept') return one({ t: 'contractAccept', id: flour.id });
      return one({ t: 'econOrder', lines: [{ c: 'flour', n: flour.quantity, contract: flour.id }] });
    }
    if (c.key === 'switch') { const t = R.tut.tutTarget(S); if (!t) return []; mem.sw = t.sw; return one({ t: 'useSwitch', sw: t.sw }); }
    // After the switch step: throw it back first, as the telegram says.
    if (mem.sw !== null && !mem.back) { mem.back = 1; return one({ t: 'useSwitch', sw: mem.sw }); }
    if (c.key === 'tickets' || (c.key === 'unload' && !R.tut.tutTarget(S))) return S.pax.desk ? [] : one({ t: 'staffWindow', st: 'hub' });
    if (c.key === 'unload') {
      const t = R.tut.tutTarget(S), ids = R.cargo.itemsAt(S, { kind: 'CAR', stockId: t.stock });
      return ids.length ? one({ t: 'carryPick', id: ids[0] }) : [];
    }
    if (c.key === 'sort') { const t = R.tut.tutTarget(S); return held.length ? one({ t: 'carryPut', b: 'freightshed', bay: t.bay }) : []; }
    if (c.key === 'deliver') {
      const t = R.tut.tutTarget(S);
      if (held.length) return one({ t: 'carryPut', biz: t.biz });
      return one({ t: 'carryPick', id: S.tut.item });
    }
    return [];
  }
  function observe(S, ev) {
    for (const e of ev) if (/Refused$/.test(e.t) || e.t === 'switchLocked') { mem.refusals++; mem.wait = S.tick + 20; }
  }
  return { mem, decide, observe };
}

const RUNNER = `window.__tut = (() => {
  const R = window.__railhead, factory = (0, eval)('(' + window.__tutsrc + ')');
  const hm = S => { const a = S.time + 18000, d = Math.floor(a / 86400), s = a % 86400; return 'day ' + (d + 1) + ' ' + String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
  function start(seed, skip) { const X = { S: R.newState(seed), bot: factory(R), rec: { steps: [], targets: {}, done: null, tgTut: 0, refused: [] } }; X.bot.mem.skip = !!skip; return X; }
  function step(X, n) {
    for (let k = 0; k < n; k++) {
      const { S, bot, rec } = X, ev = R.simTick(S, bot.decide(S));
      bot.observe(S, ev);
      for (const e of ev) {
        if (e.t === 'tutStep') rec.steps.push({ step: e.step, key: e.key, at: hm(S), tick: S.tick });
        if (e.t === 'tutDone') rec.done = { skipped: e.skipped, at: hm(S), tick: S.tick };
        if (e.t === 'telegram') { const g = S.tg.list.find(g => g.id === e.id); if (g && g.kind === 'tutorial') rec.tgTut++; }
        if (/Refused$/.test(e.t)) rec.refused.push(e.t + ': ' + (e.why || ''));
      }
      const c = R.tut.tutCurrent(S);
      if (c && !rec.targets[c.key]) { const t = R.tut.tutTarget(S); if (t) rec.targets[c.key] = { x: Math.round(t.x * 10) / 10, z: Math.round(t.z * 10) / 10, k: t.k }; }
      if (S.tut.done && X.stopAtDone) return;
    }
  }
  return { start, step, factory, hm };
})();`;

module.exports = async function checkTutorial() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    await page.evaluate(src => { window.__tutsrc = src; }, tutBotFactory.toString());
    await page.evaluate(src => { window.__m1src = src; }, BOT_SRC);
    await page.evaluate(RUNNER);

    // ---- 1. The bot completes the tutorial within days 1 and 2; a save at the tickets step ----
    const A = await page.evaluate((DAY) => {
      const R = window.__railhead, X = window.__tut.start(1866);
      let mid = null;
      for (let i = 0; i < 2 * DAY; i++) {
        window.__tut.step(X, 1);
        if (!mid && X.S.tut.step === 4) mid = { json: JSON.stringify({ state: X.S }), mem: JSON.stringify(X.bot.mem), hash: R.stateHash(X.S), tick: X.S.tick, step: X.S.tut.step };
      }
      const S = X.S, tut = S.tg.list.filter(g => g.kind === 'tutorial');
      window.__A = { mid };
      return { rec: X.rec, tut: S.tut, hash: R.stateHash(S), tick: S.tick, money: R.econ.econCheckMoney(S), cons: R.cargo.itemCheckConservation(S), mid: mid && { hash: mid.hash, tick: mid.tick, step: mid.step },
        tgs: tut.map(g => ({ id: g.id, title: g.title, body: g.body, from: g.from, buttons: g.buttons && g.buttons.map(b => b.label), step: g.ref && g.ref.step })), refusals: X.bot.mem.refusals,
        steps: R.tut.TUT_STEPS.map(s => s.key) };
    }, DAY);
    const keys = A.steps;
    const got = A.rec.steps.map(s => s.step);
    if (JSON.stringify(got) !== JSON.stringify(keys.map((_, i) => i))) problems.push('the tutorial steps did not all come in order: ' + JSON.stringify(A.rec.steps));
    if (!A.rec.done || A.rec.done.skipped || A.rec.done.tick > 2 * DAY) problems.push('the tutorial did not end (not skipped) within days 1 and 2: ' + JSON.stringify(A.rec.done));
    if (!A.tut.done || A.tut.skipped) problems.push('the tutorial state is not done: ' + JSON.stringify(A.tut));
    if (A.tgs.length !== keys.length || A.rec.tgTut !== keys.length) problems.push(`expected ${keys.length} tutorial telegrams, got ${A.tgs.length} (${A.rec.tgTut} sent)`);
    const w = A.tgs[0];
    if (!w || JSON.stringify(w.buttons) !== JSON.stringify(['OK', 'Skip tutorial'])) problems.push('the first telegram should have OK and Skip tutorial buttons: ' + JSON.stringify(w));
    if (A.tgs.slice(1).some(g => g.buttons)) problems.push('only the first tutorial telegram has buttons');
    if (A.tgs.some(g => g.from !== 'E. Hartwell, Boston')) problems.push('every tutorial telegram comes from the investor');
    if (A.tgs.some(g => /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(g.title + g.body))) problems.push('a tutorial telegram has an emoji');
    if (A.tgs.some(g => g.body.length > 320)) problems.push('a tutorial telegram is longer than 320 characters (phone reading): ' + A.tgs.filter(g => g.body.length > 320).map(g => g.title).join(', '));
    if (A.money.length || A.cons.length) problems.push('money or conservation failed: ' + A.money.concat(A.cons).join('; '));
    for (const k of ['accept', 'order', 'switch', 'tickets', 'unload', 'sort', 'deliver']) if (!A.rec.targets[k]) problems.push(`no hint marker place for the ${k} step`);
    const order = A.tgs.find(g => g.step === 2), unload = A.tgs.find(g => g.step === 5);
    if (order && !/Mon 18:00/.test(order.body)) problems.push('the order telegram should name the 18:00 Overland on day 1: ' + order.body);
    console.log('  steps: ' + A.rec.steps.map(s => `${s.key} ${s.at.slice(4)}`).join(', ') + `; ended ${A.rec.done && A.rec.done.at}; bot refusals ${A.refusals}`);
    console.log('  hint places: ' + Object.entries(A.rec.targets).map(([k, t]) => `${k} ${t.k} (${t.x}, ${t.z})`).join(', '));
    for (const g of A.tgs) console.log(`  telegram ${g.step}: "${g.title}" - ${g.body}${g.buttons ? ' [' + g.buttons.join(' | ') + ']' : ''}`);
    if (unload && !/18:00|interchange/.test(unload.body)) problems.push('the unload telegram should say where and when the car comes: ' + unload.body);

    // ---- 3. Save and reload mid-tutorial; the game played twice ----
    const C = await page.evaluate((DAY) => {
      const R = window.__railhead, m = window.__A.mid;
      if (!m) return null;
      const S = R.migrate(JSON.parse(m.json)).state, loaded = R.stateHash(S);
      const X = { S, bot: window.__tut.factory(R, JSON.parse(m.mem)), rec: { steps: [], targets: {}, done: null, tgTut: 0, refused: [] } };
      const step0 = S.tut.step;
      window.__tut.step(X, 2 * DAY - S.tick);
      const B = window.__tut.start(1866); window.__tut.step(B, 2 * DAY);
      return { loaded, step0, steps: X.rec.steps.map(s => s.step), end: R.stateHash(X.S), again: R.stateHash(B.S) };
    }, DAY);
    if (!C) problems.push('the bot never reached the tickets step, so no mid-tutorial save was made');
    else {
      if (C.loaded !== A.mid.hash) problems.push(`the mid-tutorial save loaded with a different hash (${A.mid.hash}, ${C.loaded})`);
      if (C.step0 !== 4 || C.steps[0] !== 5) problems.push(`the reloaded game should resume at the tickets step and send the unload telegram next: ${C.step0}, ${JSON.stringify(C.steps)}`);
      if (C.end !== A.hash) problems.push(`the reloaded game ended with a different hash (${A.hash}, ${C.end})`);
      if (C.again !== A.hash) problems.push(`the tutorial played twice gave different hashes (${A.hash}, ${C.again})`);
      console.log(`  save at ${A.mid.tick} (step ${A.mid.step}) loads ${C.loaded}; ends ${C.end}; again ${C.again}; straight ${A.hash}`);
    }

    // ---- 2. Skip tutorial ----
    const K = await page.evaluate((DAY) => {
      const R = window.__railhead, X = window.__tut.start(1866, true);
      window.__tut.step(X, 3);
      const after = { done: X.S.tut.done, skipped: X.S.tut.skipped, tick: X.S.tick, answered: X.S.tg.list[0] && X.S.tg.list[0].answered };
      // A day of real play after it, by the M1 bot.
      const f = (0, eval)('(' + window.__m1src + ')'), bot = f(R);
      let tutTg = 0, steps = 0;
      for (let i = 0; i < DAY; i++) {
        const ev = R.simTick(X.S, bot.decide(X.S)); bot.observe(X.S, ev);
        for (const e of ev) { if (e.t === 'tutStep') steps++; if (e.t === 'telegram' && X.S.tg.list.find(g => g.id === e.id && g.kind === 'tutorial')) tutTg++; }
      }
      const again = []; R.simTick(X.S, [{ t: 'tutorialSkip' }]).forEach(e => again.push(e.t));
      return { after, tutTg, steps, total: X.S.tg.list.filter(g => g.kind === 'tutorial').length, others: X.S.tg.list.filter(g => g.kind !== 'tutorial').length, again, target: R.tut.tutTarget(X.S), cur: R.tut.tutCurrent(X.S) };
    }, DAY);
    if (!K.after.done || !K.after.skipped || K.after.answered !== 1) problems.push('Skip tutorial did not end the tutorial at once: ' + JSON.stringify(K.after));
    if (K.tutTg || K.steps || K.total !== 1) problems.push(`after Skip tutorial ${K.tutTg} more tutorial telegrams came (${K.total} in the inbox, ${K.steps} steps)`);
    if (K.target || K.cur) problems.push('after Skip tutorial the hint and the Current task should be gone');
    if (!K.again.includes('tutRefused')) problems.push('a second tutorialSkip should be refused');
    console.log(`  skip: done at tick ${K.after.tick}; a day of play after it: ${K.tutTg} tutorial telegrams, ${K.others} other telegrams`);

    // ---- 4. Old saves: the tutorial counts as done ----
    const dir = path.join(__dirname, 'fixtures');
    for (const f of fs.readdirSync(dir).filter(f => /^save-v\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6)))) {
      const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (fx.schemaVersion >= 12) continue;
      const r = await page.evaluate(json => {
        const R = window.__railhead, S = R.migrate(JSON.parse(json)).state, n0 = S.tg.list.length;
        let tut = 0;
        for (let i = 0; i < 600; i++) for (const e of R.simTick(S, [])) if (e.t === 'tutStep' || (e.t === 'telegram' && S.tg.list.find(g => g.id === e.id && g.kind === 'tutorial'))) tut++;
        return { done: S.tut.done, tut, n0 };
      }, fx.save);
      if (!r.done || r.tut) problems.push(`${f}: an old save should load with the tutorial done and send none (${JSON.stringify(r)})`);
    }

    // ---- 5. Drawn: the chip, the card, the marker ----
    for (const orient of ['portrait', 'landscape']) {
      const pg = orient === 'portrait' ? page : (await openGame('landscape', { query: '?paused' })).page;
      const errs = orient === 'portrait' ? errors : [];
      if (orient === 'landscape') pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      // The first telegram: a new game after one tick, the chip tapped (the card opens and the telegram is read).
      await pg.evaluate(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.newState(1866) })); R.step(2); });
      await pg.waitForTimeout(300);
      await pg.tap('#tutChip');
      await pg.evaluate(() => window.__railhead.step(1));
      await pg.waitForTimeout(400);
      const a = await pg.evaluate(() => {
        const r = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { w: b.width, h: b.height, x: b.x, y: b.y, r: b.right, b: b.bottom }; };
        const btns = [...document.querySelectorAll('#tutBtns button')].map(b => ({ t: b.textContent, h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width }));
        return { chip: r('tutChip'), card: r('tutCard'), btns, title: document.getElementById('tutTitle').textContent, read: window.__railhead.state.tg.list[0].read, vw: innerWidth, vh: innerHeight };
      });
      await pg.screenshot({ path: screenshotPath(`tutorial-first-${orient}`) });
      if (!a.card || a.title !== 'Welcome to the Calder Valley') problems.push(`${orient}: the card should show the first telegram: ${JSON.stringify(a)}`);
      if (JSON.stringify(a.btns.map(b => b.t)) !== JSON.stringify(['OK', 'Skip tutorial'])) problems.push(`${orient}: the card's buttons should be OK and Skip tutorial: ${JSON.stringify(a.btns)}`);
      if (a.btns.some(b => b.h < 48 || b.w < 48) || !a.chip || a.chip.h < 48) problems.push(`${orient}: a tutorial button is under 48 px: ${JSON.stringify(a)}`);
      if (!a.read) problems.push(`${orient}: opening the card should mark the telegram read`);
      if (a.card && (a.card.r > a.vw || a.card.b > a.vh || a.card.x < 0)) problems.push(`${orient}: the card runs off the screen: ${JSON.stringify(a)}`);
      // OK by touch: the next step's telegram follows and the chip names it.
      await pg.tap('#tutBtns button');
      await pg.evaluate(() => window.__railhead.step(2));
      await pg.waitForTimeout(300);
      const b = await pg.evaluate(() => ({ chip: document.getElementById('tutChipText').textContent, card: document.getElementById('tutCard').hidden, step: window.__railhead.state.tut.step }));
      if (b.step !== 1 || b.chip !== 'Take a contract' || !b.card) problems.push(`${orient}: OK should close the card and the chip show the next task: ${JSON.stringify(b)}`);
      // A later telegram: the bot's game at the sort step, the card open, the marker over the bay.
      await pg.evaluate(src => { window.__tutsrc = src; }, tutBotFactory.toString());
      await pg.evaluate(RUNNER);
      const at = await pg.evaluate(() => {
        const R = window.__railhead, X = window.__tut.start(1866);
        for (let i = 0; i < 21600 && X.S.tut.step !== 6; i++) window.__tut.step(X, 1);
        R.importSave(JSON.stringify({ state: X.S }));
        const t = R.tut.tutTarget(R.state); R.camera.ox = t.x - R.state.player.x; R.camera.oz = t.z - R.state.player.z;
        return { step: R.state.tut.step, t };
      });
      await pg.waitForTimeout(300);
      await pg.tap('#tutChip');
      await pg.evaluate(() => window.__railhead.step(1));
      await pg.waitForTimeout(500);
      const c = await pg.evaluate(() => {
        const R = window.__railhead;
        return { title: document.getElementById('tutTitle').textContent, card: !document.getElementById('tutCard').hidden, btns: [...document.querySelectorAll('#tutBtns button')].map(b => b.textContent), dc: R.drawCalls };
      });
      await pg.screenshot({ path: screenshotPath(`tutorial-later-${orient}`) });
      if (at.step !== 6 || !c.card || c.title !== 'Sort it in the freight shed' || JSON.stringify(c.btns) !== '["Close"]') problems.push(`${orient}: the later telegram card: ${JSON.stringify({ at, c })}`);
      // The card closed: the brass marker over the bay (screenshot tutorial-marker-*.png).
      await pg.tap('#tutBtns button');
      await pg.waitForTimeout(400);
      const mk = await pg.evaluate(() => { const R = window.__railhead, t = R.tut.tutTarget(R.state); return { t, s: t ? R.toScreen(t.x, t.z, 3.6) : null, card: document.getElementById('tutCard').hidden }; });
      await pg.screenshot({ path: screenshotPath(`tutorial-marker-${orient}`) });
      if (!mk.card) problems.push(`${orient}: Close should close the card`);
      if (!mk.t || !mk.s || mk.s.x < 0 || mk.s.y < 0 || mk.s.x > a.vw || mk.s.y > a.vh) problems.push(`${orient}: the marker is not on the screen: ${JSON.stringify(mk)}`);
      console.log(`  ${orient}: chip ${Math.round(a.chip.w)}x${Math.round(a.chip.h)}, card ${Math.round(a.card.w)}x${Math.round(a.card.h)}, buttons ${a.btns.map(b => b.t + ' ' + Math.round(b.w) + 'x' + Math.round(b.h)).join(', ')}; marker at (${Math.round(mk.s.x)}, ${Math.round(mk.s.y)}) px; later step draw calls ${c.dc}; screenshots tutorial-first-${orient}.png, tutorial-later-${orient}.png, tutorial-marker-${orient}.png`);
      if (errs.length) problems.push(`${orient}: console errors: ` + errs.join(' | '));
      if (orient === 'landscape') await pg.context().browser().close();
    }
  } finally { await browser.close(); }
  return problems;
};
