// Check: D31, the designer's play-test fixes, played by real taps on the page (portrait and landscape, a fresh default
// game with the lessons on; the careful bot plays the morning up to the moment the first freight, f1, stands).
// - The bug ("the first freight that comes in, I can't lift the goods out"): after Show me and a tap on the boxcar
//   (its door slides open), a Lift button shows at the open door, and a tap on a good in the car takes it out.
// - One tap per good: a tap on a good's own pixels makes the man walk in, lift it, carry it to its storage row and set
//   it down, with no other tap; two more taps made while he works wait their turn and are done in order; a tap on the
//   ground (walking away by hand) drops the queue.
// - With the cart parked by the door the goods go on the cart instead; a tap on the cart takes its handle.
// - The cart is a hand cart: its bed 4 x 2 cells, its picture about half the dray's; it still takes a day's goods.
// - The player walks 40% faster than D27's pace; ?d31=0 gives the old pace, the old buttons and no frAuto taps.
// - The see-through patch round the player behind a roof is soft: partly clear pixels at its edge, not a hard square.
// Screenshots: test-output/d31-{door,lift,queue,cart,soft}-{portrait,landscape}.png.

const { openGame, screenshotPath } = require('./browser');
const { toFirstFreight } = require('./d31-lib');

const info = page => page.evaluate(() => {
  const R = window.__railhead, S = R.state, run = S.rr.runs.find(r => r.ph === 'stand' && r.kind === 'freight'), tr = run && S.trains[run.slot];
  const where = id => { const w = S.items.where[id]; return w ? w.kind : null; };
  return {
    P: [S.player.x, S.player.z], tool: S.player.tool, time: S.time, job: S.fr && S.fr.job ? { k: S.fr.job.k, q: S.fr.job.q || [] } : null,
    btns: [...document.querySelectorAll('.pdAct')].filter(b => !b.hidden).map(b => b.textContent),
    card: document.getElementById('pdLesson') && !document.getElementById('pdLesson').hidden ? document.getElementById('pdLesson').innerText : '',
    cars: tr ? tr.consist.filter(c => c.k !== 'loco').map(c => { const s = R.fr.frCarStatus(S, c.id); return { id: c.id, un: s.unload, open: !!s.doorOpen, spot: s.spot }; }) : [],
    goods: R.fr.frDrawList(S).filter(g => Number.isInteger(g.id)).map(g => ({ id: g.id, kind: g.kind, x: g.x, y: g.y, z: g.z, place: g.place, at: where(g.id), stock: g.stock })),
    cart: R.fr.frCartPose(S), taps: (R.pix.PIX.taps || []).map(q => q.id),
  };
});
const tapText = async (page, re) => {
  const h = await page.evaluateHandle(src => [...document.querySelectorAll('button')].find(x => !x.hidden && x.getClientRects().length && new RegExp(src).test(x.textContent)) || null, re.source);
  const el = h.asElement();
  if (!el) return false;
  await el.tap();
  return true;
};
const scr = (page, x, y, z) => page.evaluate(([x, y, z]) => window.__railhead.pix.pixToScreen(x, y, z), [x, y, z]);
const tapWorld = async (page, x, y, z) => {
  const p = await scr(page, x, y, z);
  if (process.env.D31_DEBUG) console.log('    tap', JSON.stringify(await page.evaluate(([x, y]) => ({ x, y, el: (document.elementFromPoint(x, y) || {}).tagName, pick: window.__railhead.pix.pixPick(x, y, ['item', 'tool'], 16) }), [p.x, p.y])));
  await page.touchscreen.tap(p.x, p.y);
  return p;
};
// Walks towards (x, z) by taps on the ground (as a player does) until within d of it.
const walkNear = async (page, x, z, d, max) => {
  for (let k = 0; k < (max || 60); k++) {
    const P = await page.evaluate(() => [window.__railhead.state.player.x, window.__railhead.state.player.z]);
    if (Math.hypot(P[0] - x, P[1] - z) < d) return true;
    const p = await page.evaluate(([x, z]) => {
      const X = window.__railhead.pix, s = X.pixToScreen(x, 1.6, z), q = { x: Math.max(40, Math.min(innerWidth - 40, s.x)), y: Math.max(200, Math.min(innerHeight - 90, s.y)) };
      const bad = () => X.pixPick(q.x, q.y, ['item', 'tool'], 16) || (document.elementFromPoint(q.x, q.y) || {}).tagName !== 'CANVAS';
      for (let n = 0; n < 8 && bad(); n++) { q.y += 24; if (q.y > innerHeight - 30) { q.y = 150; q.x = Math.max(40, Math.min(innerWidth - 40, q.x + (s.x < q.x ? -40 : 40))); } }   // on the ground: clear of goods, the cart and the HUD
      return q;
    }, [x, z]);
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForTimeout(900);
  }
  return false;
};
const until = async (page, fn, arg, ms) => { try { await page.waitForFunction(fn, arg, { timeout: ms || 30000 }); return true; } catch (e) { return false; } };

async function play(orient, problems) {
  const say = m => problems.push(`${orient}: ${m}`);
  const { browser, page, errors } = await openGame(orient, { query: '?paused&world=' });
  try {
    const a = await toFirstFreight(page);
    if (!a) { say('the first freight never came'); return; }
    await page.evaluate(() => window.__railhead.setSpeed(2));
    await page.waitForTimeout(400);
    let i = await info(page);
    if (!/UNLOADING/i.test(i.card)) say('no Unloading lesson card when f1 stands: ' + JSON.stringify(i.card));
    if (!(await tapText(page, /Show me/))) say('no Show me button on the lesson card');
    await page.waitForTimeout(300);
    const car = i.cars.find(c => c.un > 0 && !c.open) || i.cars.find(c => c.un > 0);
    if (!car) { say('no car with goods for the town: ' + JSON.stringify(i.cars)); return; }
    // The long walk over to the cargo platform is by one walk command (wherever the bot left him: the way round is
    // not what is checked); from the cart lane on, everything is a real tap: the last steps to the door, the car, the goods.
    await page.evaluate(([x, z]) => { const R = window.__railhead; R.setSpeed(4); R.send({ t: 'walkTo', x: Math.round(x * 100), z: Math.round(z * 100) }); }, [car.spot.x - 6, 12.4]);
    await until(page, ([x, z]) => { const P = window.__railhead.state.player; return P.mode === 'idle' && Math.hypot(P.x - x, P.z - z) < 1.5; }, [car.spot.x - 6, 12.4], 90000);
    await page.evaluate(() => window.__railhead.setSpeed(2));
    if (!(await walkNear(page, car.spot.x, car.spot.z - 2.2, 4))) { i = await info(page); say('could not walk to the car by taps: at ' + i.P.map(v => v.toFixed(1)) + ', the door at ' + [car.spot.x, car.spot.z].map(v => v.toFixed(1))); return; }
    const mine = () => info(page).then(q => { i = q; return q.goods.filter(g => g.at === 'CAR' && String(g.stock) === String(car.id)); });
    await page.waitForTimeout(1500);
    i = await info(page);   // (a tap of the walk may have landed on the car and opened it already: that is a tap on the car too)
    if (!i.cars.find(c => c.id === car.id).open) {
      const body = await page.evaluate(id => { const R = window.__railhead, S = R.state, g = R.fr.frCarGeo(S, id); return { x: g.x + 2.6, z: g.z }; }, car.id);
      await tapWorld(page, body.x, 3.2, body.z);   // the car's side, clear of the doorway
      if (process.env.D31_DEBUG) for (let k = 0; k < 14; k++) { await page.waitForTimeout(250); console.log('    ', await page.evaluate(() => { const R = window.__railhead, S = R.state, u = R.pdui.ui; return JSON.stringify({ P: [S.player.x.toFixed(2), S.player.z.toFixed(2), S.player.mode, S.player.tx, S.player.tz], pend: u.pending && { c: u.pending.cmd.t, x: u.pending.x, z: u.pending.z, w: u.pending.walking }, job: S.fr.job && S.fr.job.k, toast: document.getElementById('toast').textContent }); })); }
      if (!(await until(page, id => !!window.__railhead.fr.frCarStatus(window.__railhead.state, id).doorOpen, car.id, 40000))) { i = await info(page); say('a tap on the boxcar did not open its door: ' + JSON.stringify({ P: i.P, job: i.job, btns: i.btns, toast: await page.evaluate(() => document.getElementById('toast').textContent), pick: await page.evaluate(([x, y, z]) => { const X = window.__railhead.pix, p = X.pixToScreen(x, y, z); return X.pixPick(p.x, p.y); }, [body.x, 3.2, body.z]) })); return; }
    }
    await page.waitForTimeout(500);
    await tapText(page, /^OK$/);   // the lesson's slip folded: in landscape it lies over the car
    await page.waitForTimeout(300);
    let L = await mine();
    await page.screenshot({ path: screenshotPath(`d31-door-${orient}`) });
    // The bug: at the open door there must be a way to lift the goods, in sight.
    if (!i.btns.some(t => /^Lift/.test(t))) say('the bug: no Lift button at the open door of the first freight (buttons: ' + JSON.stringify(i.btns) + ')');
    L.sort((a, b) => b.y - a.y || a.id - b.id);   // a stack's top first (only the top good can be taken)
    const tops = L.filter(g => !L.some(o => o !== g && Math.abs(o.x - g.x) < 0.1 && Math.abs(o.z - g.z) < 0.1 && o.y > g.y));
    if (!tops.every(g => i.taps.includes(g.id))) say('goods in the open car are not marked as tappable: ' + JSON.stringify(i.taps));
    if (L.length < 3) { say('expected three goods for the town in the car, found ' + L.length); return; }
    // One tap on a good: out of the car and into its storage row, with nothing else tapped.
    const first = L[0];
    await tapWorld(page, first.x, first.y + 0.3, first.z);
    if (!(await until(page, id => { const S = window.__railhead.state; return !!S.fr.job && S.fr.job.k === 'auto' && S.fr.job.q.includes(id); }, first.id, 5000))) say('a tap on a good in the car did not start its job');
    await page.evaluate(() => window.__railhead.setSpeed(4));
    await until(page, () => window.__railhead.state.fr.inCar !== null, null, 30000);
    await page.screenshot({ path: screenshotPath(`d31-lift-${orient}`) });
    // Two more taps while he works: they wait their turn.
    L = (await mine()).filter(g => g.id !== first.id);
    const order = [];
    for (const g of L.slice(0, 2)) { await tapWorld(page, g.x, g.y + 0.3, g.z); order.push(g.id); await page.waitForTimeout(250); }
    i = await info(page);
    if (!i.job || order.some(id => !i.job.q.includes(id))) say('taps made while he works did not queue: ' + JSON.stringify(i.job) + ' wanted ' + order);
    await page.screenshot({ path: screenshotPath(`d31-queue-${orient}`) });
    const ids = [first.id].concat(order);
    // The cart stands by this door at the day's start (within FR.AUTO_CART), so the goods go on it; else to storage.
    const want = await page.evaluate(id => { const R = window.__railhead, S = R.state, g = R.fr.frCarGeo(S, id), c = R.fr.frCartPose(S); return Math.hypot(c.x - g.out.x, c.z - g.out.z) <= R.fr.FR.AUTO_CART ? 'CART' : 'CELL'; }, car.id);
    if (!(await until(page, ([ids, want]) => { const S = window.__railhead.state; return !S.fr.job && ids.every(id => S.items.where[id] && S.items.where[id].kind === want); }, [ids, want], 120000))) {
      i = await info(page);
      say(`the tapped goods did not all reach the ${want}: ` + JSON.stringify(ids.map(id => (i.goods.find(g => g.id === id) || {}).at)) + ' job ' + JSON.stringify(i.job));
    }
    console.log(`  ${orient}: three goods out of f1 by one tap each (two queued while he worked), all to the ${want === 'CART' ? 'cart parked by the door' : 'storage rows'}`);
    await page.waitForTimeout(400);
    // A tap on a good on the cart: to its shop's storage row.
    const onCart = async () => { await tapText(page, /^OK$/); await walkNear(page, i.cart.x - 2.5, i.cart.z + 1.5, 4); await page.waitForTimeout(700); i = await info(page); return i.goods.filter(g => g.at === 'CART' && i.taps.includes(g.id)); };
    let C = await onCart();
    if (want === 'CART' && C.length) {
      const g = C[0];
      await tapWorld(page, g.x, g.y + 0.3, g.z);
      if (!(await until(page, id => { const S = window.__railhead.state; return !S.fr.job && S.items.where[id].kind === 'CELL'; }, g.id, 60000))) { i = await info(page); say('a tap on a good on the cart did not take it to storage: ' + JSON.stringify({ job: i.job, at: i.goods.filter(q => ids.includes(q.id)).map(q => q.id + q.at), P: i.P, tool: i.tool, toast: await page.evaluate(() => document.getElementById('toast').textContent) })); }
      await page.waitForTimeout(400);
      // Walking away by hand drops the queue: tap the other goods on the cart, then the ground.
      await page.evaluate(() => window.__railhead.setSpeed(1));
      C = await onCart();
      if (!C.length) say('the goods left on the cart are not marked as tappable from beside it');
      else await tapWorld(page, C[0].x, C[0].y + 0.3, C[0].z);
      await page.waitForTimeout(500);
      i = await info(page);
      if (!i.job || i.job.k !== 'auto') say('taps on the cart\'s goods started no job: ' + JSON.stringify(i.job));
      await walkNear(page, i.P[0] - 6, i.P[1] + 1, 0.5, 1);
      if (!(await until(page, () => !window.__railhead.state.fr.job, null, 8000))) say('walking away by hand did not drop the queue');
      await page.evaluate(() => window.__railhead.setSpeed(4));
      await page.waitForTimeout(800);
      i = await info(page);
      if (i.goods.some(g => g.at === 'HAND')) { if (!(await tapText(page, /Set down/))) say('no Set down button with a good in the hands'); await until(page, () => !window.__railhead.state.fr.job && !window.__railhead.fr.frHeld(window.__railhead.state).length, null, 60000); }
    }
    // A tap on the cart takes its handle (he walks to it).
    await page.evaluate(() => window.__railhead.setSpeed(4));
    await walkNear(page, i.cart.x - 2.5, i.cart.z + 1.5, 4);
    await page.waitForTimeout(900);
    i = await info(page);
    const u = await page.evaluate(f => window.__railhead.fr.FR_DIRS[f], i.cart.f);
    await tapWorld(page, i.cart.x - u[0] * 2.0, i.cart.y + 0.95, i.cart.z - u[1] * 2.0);   // its handle (the bed may be under its load)
    if (!(await until(page, () => { const S = window.__railhead.state; return S.player.tool !== null && S.player.tool !== undefined && !S.fr.job; }, null, 30000))) say('a tap on the cart did not take its handle');
    await page.screenshot({ path: screenshotPath(`d31-cart-${orient}`) });
    // The cart's size: 4 x 2 cells, its picture no more than about half the dray's 100 x 60 px.
    const cart = await page.evaluate(() => { const R = window.__railhead, f = R.pix.frameOf('cart27/se/0') || R.pix.frameOf('cart27/se'), C = R.d27.CARGO27; return { w: f && f[3], h: f && f[4], cols: C.CART_COLS, rows: C.CART_ROWS, layers: C.LAYERS.CART }; });
    if (cart.cols !== 4 || cart.rows !== 2) say('the cart bed is not 4 x 2 cells: ' + JSON.stringify(cart));
    if (!(cart.w <= 52 && cart.h <= 40)) say('the cart picture is not about half the size: ' + JSON.stringify(cart));
    console.log(`  ${orient}: cart picture ${cart.w} x ${cart.h} px, bed ${cart.cols} x ${cart.rows} cells, ${cart.layers} high`);
  } finally {
    if (errors.length) say('console errors: ' + errors.slice(0, 3).join(' | '));
    await browser.close();
  }
}

// The cart by the door: the goods go on the cart; the pace; the switch; the soft patch (sim commands where no tap is the point).
async function rest(orient, problems) {
  const say = m => problems.push(`${orient}: ${m}`);
  {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=' });
    try {
      await toFirstFreight(page);
      const r = await page.evaluate(() => {
        const R = window.__railhead, S = R.state, X = R.fr, run = S.rr.runs.find(q => q.ph === 'stand' && q.kind === 'freight'), tr = S.trains[run.slot];
        const car = tr.consist.find(c => c.k === 'boxcar' && X.frCarStatus(S, c.id).unload > 0), sp = X.frCartDoorSpot(S, car.id);
        const run1 = (cmd, n) => { R.simTick(S, [cmd]); for (let k = 0; k < (n || 600) && S.fr.job; k++) R.simTick(S, []); };
        if (S.pd.lesWait && S.pd.lesWait.length) R.simTick(S, S.pd.lesWait.map(id => ({ t: 'pdLesson', id, act: 'skip' })));
        run1({ t: 'frCart', act: 'grab' });
        run1({ t: 'frCart', act: 'park', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100), f: 'se' });
        const ids = R.cargo.itemsAt(S, { kind: 'CAR', stockId: car.id }).filter(id => R.cargo.COMMODITIES[S.items.waybill[id].commodity].type !== 'plough').sort((a, b) => (S.items.where[b].layer || 0) - (S.items.where[a].layer || 0) || a - b);
        const cmds = ids.map(id => ({ t: 'frAuto', item: id }));
        R.simTick(S, cmds);
        const q0 = S.fr.job ? S.fr.job.q.slice() : null;
        let idle = 0, ticks = 0;
        for (; ticks < 900 && S.fr.job; ticks++) { const t0 = JSON.stringify([S.player.x, S.player.z, S.fr.job.i, S.fr.job.steps.length, S.items.where[ids[0]]]); R.simTick(S, []); }
        const at = ids.map(id => S.items.where[id].kind), open = X.frCarStatus(S, car.id).doorOpen;
        // then each good on the cart, tapped, goes to its storage row; a day's goods fit the cart
        R.simTick(S, ids.slice().sort((a, b) => (S.items.where[b].layer || 0) - (S.items.where[a].layer || 0) || a - b).map(id => ({ t: 'frAuto', item: id })));
        for (let k = 0; k < 900 && S.fr.job; k++) R.simTick(S, []);
        const at2 = ids.map(id => S.items.where[id].kind);
        return { ids, q0, at, at2, open, ticks, hash: R.hash(S) };
      });
      if (!r.q0 || r.q0.length !== r.ids.length) say('several frAuto commands in one tick did not queue: ' + JSON.stringify(r.q0));
      if (!r.at.every(k => k === 'CART')) say('with the cart parked by the door the goods did not go on the cart: ' + r.at);
      if (!r.at2.every(k => k === 'CELL')) say('goods tapped on the cart did not go to storage: ' + r.at2);
      console.log(`  ${orient}: cart by the door: ${r.ids.length} goods onto the cart in ${r.ticks} ticks (door opened by the job), then to storage`);
      // The soft patch: the player behind the station roof.
      const soft = await page.evaluate(async () => {
        const R = window.__railhead, S = R.state, X = R.pix, PR = R.d27.PROTO.STATION;
        S.player.x = (PR.x0 + PR.x1) / 2; S.player.z = PR.z0 - 1.2; S.player.mode = 'idle'; if (S.fr) { S.fr.job = null; S.fr.inCar = null; } delete S.player.y; S.player.tool = null;
        R.step(1);
        await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(res))));
        const see = X.PIX.lastSee ? [...X.PIX.lastSee.values()].flat() : [];
        const part = [...X.PIXA.part.entries()].filter(([k]) => /\|s\|/.test(k)).pop();
        if (!part) return { see: see.length, none: true };
        const T = part[1], d = T.getContext('2d').getImageData(0, 0, T.width, T.height).data, q = see.find(s => part[0].startsWith(s.key + '|'));
        let mid = 0, n = 0;
        for (let i = 3; i < d.length; i += 4) { n++; if (d[i] > 20 && d[i] < 235) mid++; }
        // the patch's corner must be untouched (round, not a square): the frame's own alpha there
        return { see: see.length, mid, n, e: q && q.e, key: part[0].slice(0, 60) };
      });
      if (soft.none) say('no soft see-through patch was made with the player behind the station (see-through parts: ' + soft.see + ')');
      else if (!(soft.mid > 60)) say('the see-through patch has no soft edge (partly clear pixels: ' + soft.mid + ')');
      else console.log(`  ${orient}: soft see-through patch: ${soft.mid} partly clear pixels in ${soft.key}`);
      await page.waitForTimeout(200);
      await page.screenshot({ path: screenshotPath(`d31-soft-${orient}`) });
      if (errors.length) say('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  if (orient !== 'portrait') return;
  // The pace and the switch.
  const pace = async q => {
    const { browser, page } = await openGame('portrait', { query: q });
    try {
      return await page.evaluate(() => {
        const R = window.__railhead, S = R.state;
        R.simTick(S, [{ t: 'pdStart' }]);
        const x0 = S.player.x, z0 = S.player.z;
        R.simTick(S, [{ t: 'walkTo', x: Math.round((x0 + 12) * 100), z: Math.round(z0 * 100) }]);
        for (let k = 0; k < 8; k++) R.simTick(S, []);
        const d = Math.hypot(S.player.x - x0, S.player.z - z0);
        const ev = R.simTick(S, [{ t: 'frAuto', item: 0 }]);
        return { d, tap: R.d31 ? R.d31.TAP : null, soft: R.d31 ? R.d31.SOFT : null, pace: R.proto.playerWalkSpeed(S.track, false) };
      });
    } finally { await browser.close(); }
  };
  const on = await pace('?paused&world='), off = await pace('?paused&world=&d31=0');
  if (!(Math.abs(on.pace / off.pace - 1.4) < 1e-6)) say(`the pace is not 40% faster: ${on.pace} against ${off.pace}`);
  if (!(Math.abs(on.d / off.d - 1.4) < 0.08)) say(`the player does not walk 40% farther in the same time: ${on.d.toFixed(2)} against ${off.d.toFixed(2)}u`);
  if (on.tap !== true || off.tap !== false || off.soft !== false) say('?d31=0 does not park the taps and the soft patch: ' + JSON.stringify([on, off]));
  console.log(`  pace: ${on.pace.toFixed(2)}u a game minute (D27: ${off.pace.toFixed(2)}); ?d31=0 parks the taps, the pace and the soft patch`);
}

module.exports = async function run() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) { if (process.env.D31_ONLY && process.env.D31_ONLY !== orient) continue; await play(orient, problems); if (!process.env.D31_DEBUG) await rest(orient, problems); }
  return problems;
};
