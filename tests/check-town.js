// Check: the placeholder towns (M1 package 4, builder C5; design-doc 9 "Local delivery", 10, 11, 12, 15, 21).
// Part 1, the sim alone:
// - The businesses use goods at the documented weekly rates (section 11 per person and household, section 12
//   for the boarding house and the saloon): over 7 game days each good goes down by exactly the whole units its
//   rate gives; cordwood only in winter.
// - A new game offers no town contracts on day 1 (opening stock); a business low on a good offers a delivery
//   contract at 07:00 through the economy's contractOffer (2 weeks' worth, due in 4 days, +30% when it has none),
//   once, not again while the offer is open.
// - Delivery: the player carries flour to the general store's door (carryPut { biz }) and puts it down (0.2 game
//   minutes): the item is at BUSINESS 0, the contract is paid once, the money check and the item conservation
//   check pass. A hand truck of 3 flour is put down one after another. Goods for another business, the hub
//   warehouse or construction are refused at the door with a plain reason and stay in hand. A delivered item is
//   later used with reason 'business' once the shelf is empty (logged, from BUSINESS).
// - The town's buildings keep the section 6 clearances from every track edge and do not overlap any footprint;
//   the walk grid blocks them; every business door is reached on foot (useBiz, reachedBiz) from the platform
//   without entering a building.
// - Determinism: 7 game days with a delivery, twice, give the same hash. The v6 sample save loads with the
//   towns' opening stock.
// Part 2, the page by real touch (portrait and landscape): the door label shows the business name and what it
// wants, covers no button; a tap on the store's door delivers the flour (cash on screen goes up by the price);
// whiskey for the saloon tapped onto the store is refused with a message; export and import and a real page
// reload keep the towns. Draw calls with the town in view stay under 100. Screenshots town-hub-*, town-delivery-*.

const fs = require('fs');
const path = require('path');
const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkTown() {
  const problems = [];
  const v6 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v6.json'), 'utf8');
  // ---- Part 1: the sim ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      const t0 = Date.now();
      const r = await page.evaluate((v6) => {
        const R = window.__railhead, T = R.town, C = R.cargo, E = R.econ, out = {};
        const D = 86400, H = 3600, toTime = (day, hh) => day * D + hh * H - 5 * H; // day from 0
        const run = (st, until, cmds) => { const ev = []; let first = true; while (st.time < until) { ev.push(...R.simTick(st, first ? cmds || [] : [])); first = false; } return ev; };
        const wb = (c, kind, id, contractId) => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind, id }, contractId: contractId === undefined ? null : contractId, due: null });
        const used = (st, b, c) => st.items.used.filter(u => u.reason === 'business' && u.from.businessId === b && st.items.waybill[u.id].commodity === c).length;

        // 1. Rates (milli-units a week) as documented.
        out.rates = T.TOWN_BUSINESSES.map(B => B.id + ':' + T.townGoods(B).map(c => c + '=' + (B.uses[c] || 0) + '/' + (B.winter[c] || 0)).join(','));
        // 2. 7 game days of use (spring): each good down by floor(rate x 168 / 168000) whole units.
        const s1 = R.newState(1866), shelf0 = JSON.parse(JSON.stringify(s1.town));
        const ev1 = run(s1, 7 * D);
        out.week = [];
        for (const B of T.TOWN_BUSINESSES) for (const c of T.townGoods(B)) {
          const b = s1.town.biz[B.id], gone = shelf0.biz[B.id].shelf[c] - b.shelf[c] + used(s1, B.id, c) + b.short[c];
          const want = Math.floor(T.townRate(B, c, false) * 168 / T.TOWN.UNIT);
          if (gone !== want || b.acc[c] !== T.townRate(B, c, false) * 168 - want * T.TOWN.UNIT) out.week.push(`${B.name} ${c}: used ${gone}, want ${want} (acc ${b.acc[c]})`);
        }
        out.weekUsed = T.TOWN_BUSINESSES.reduce((n, B) => n + T.townGoods(B).reduce((m, c) => m + shelf0.biz[B.id].shelf[c] - s1.town.biz[B.id].shelf[c] + s1.town.biz[B.id].short[c], 0), 0);
        out.weekOffers = ev1.filter(e => e.t === 'contractOffered').map(e => { const k = s1.econ.contracts[e.id]; return k.counterparty + ':' + k.commodity + ':' + k.quantity; });
        out.weekMoney = E.econCheckMoney(s1); out.weekItems = C.itemCheckConservation(s1);
        // Winter (day 42): cordwood is used and offered; never in spring.
        const s2 = R.newState(1866); s2.time = toTime(42, 0); s2.tick = s2.time / 8;
        const ev2 = run(s2, toTime(45, 0));
        out.winter = { store: s2.town.biz[0].short.cordwood, willow: s2.town.biz[1].short.cordwood, boarding: s2.town.biz[4].short.cordwood,
          offered: ev2.filter(e => e.t === 'contractOffered').map(e => s2.econ.contracts[e.id]).filter(k => k.commodity === 'cordwood').map(k => k.counterparty).sort() };
        out.springCordwood = s1.town.biz[0].short.cordwood + s1.town.biz[0].acc.cordwood;

        // 3. Offers: none on day 1 of a new game; the store with no coffee offers at 07:00, once.
        const s3 = R.newState(1866);
        const ev3a = run(s3, 3 * H);
        out.day1 = ev3a.filter(e => e.t === 'contractOffered').length;
        const s4 = R.newState(1866); s4.town.biz[0].shelf.coffee = 0;
        const ev4a = run(s4, 2 * H - 8), mid = ev4a.filter(e => e.t === 'contractOffered').length;
        const ev4b = run(s4, 2 * H);
        const off = ev4b.filter(e => e.t === 'contractOffered').map(e => s4.econ.contracts[e.id]);
        const k4 = off[0];
        out.offer = { before: mid, n: off.length, biz: k4 && k4.counterparty, c: k4 && k4.commodity, q: k4 && k4.quantity, price: k4 && k4.pricePerUnit,
          base: E.econDeliveredPrice(s4.econ, 'coffee', 0), due: k4 && k4.due, wantDue: toTime(5, 0), status: k4 && k4.status };
        const ev4c = run(s4, toTime(1, 8));
        out.offerAgain = ev4c.filter(e => e.t === 'contractOffered').map(e => s4.econ.contracts[e.id].commodity);

        // 4. Delivery: flour in hand for the store's accepted flour contract.
        const s5 = R.newState(1866), k0 = s5.econ.contracts.find(k => k.counterparty === 0 && k.commodity === 'flour');
        k0.status = 'ACTIVE';
        const door = T.townDoor(0);
        s5.player.x = door.x + 4; s5.player.z = door.z + 2;
        const f = C.itemCreate(s5, wb('flour', 'BUSINESS', 0, k0.id), { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null).id;
        const cash0 = s5.econ.cash;
        const ev5 = []; let ticks = 0, putAt = -1;
        ev5.push(...R.simTick(s5, [{ t: 'carryPut', biz: 0 }]));
        for (let i = 0; i < 300 && !ev5.some(e => e.t === 'bizDelivered'); i++) { const e = R.simTick(s5, []); ev5.push(...e); ticks++; if (putAt < 0 && s5.player.act && s5.player.act.k === 'put') putAt = ticks; }
        const del = ev5.find(e => e.t === 'bizDelivered');
        out.deliver = { where: s5.items.where[f], paid: del && del.paid, price: k0.pricePerUnit, cash: s5.econ.cash - cash0, delivered: k0.delivered, items: k0.items.slice(),
          money: E.econCheckMoney(s5), cons: C.itemCheckConservation(s5), ledger: s5.econ.ledger.slice(-1)[0], dist: Math.hypot(s5.player.x - door.x, s5.player.z - door.z), putTicks: ticks - putAt };
        // Paid only once: contractDeliver again refuses.
        out.again = E.contractDeliver(s5, f, null);
        // 5. A hand truck of 3 flour: put down one after another at the door.
        const s6 = R.newState(1866), k6 = s6.econ.contracts.find(k => k.counterparty === 0 && k.commodity === 'flour'); k6.status = 'ACTIVE';
        s6.player.tool = 0;
        for (let i = 0; i < 3; i++) C.itemCreate(s6, wb('flour', 'BUSINESS', 0, k6.id), { kind: 'CARRIED', actorId: 'player', carrier: 'HANDTRUCK', slot: i }, null);
        s6.player.x = door.x + 3; s6.player.z = door.z + 1.5;
        const ev6 = run(s6, s6.time + 8 * 60, [{ t: 'carryPut', biz: 0 }]);
        out.truck = { delivered: k6.delivered, events: ev6.filter(e => e.t === 'bizDelivered').length, held: R.carry.carryHeld(s6).length, cash: s6.econ.cash - 250000, money: E.econCheckMoney(s6), cons: C.itemCheckConservation(s6) };
        // 6. Wrong goods refused at the door: whiskey for the saloon, warehouse flour, ties for construction.
        out.wrong = [['whiskey', 'BUSINESS', 3], ['flour', 'WAREHOUSE', 0], ['ties', 'CONSTRUCTION', 0]].map(([c, kind, id]) => {
          const st = R.newState(1866); st.player.x = door.x; st.player.z = door.z;
          const it = C.itemCreate(st, wb(c, kind, id), { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null).id;
          const ev = R.simTick(st, [{ t: 'carryPut', biz: 0 }]);
          const ref = ev.find(e => e.t === 'carryRefused');
          return { why: ref && ref.why, held: st.items.where[it].kind, mode: st.player.mode };
        });
        // ... and also when the put-down was started by a direct action (the sim checks again as it finishes).
        { const st = R.newState(1866); st.player.x = door.x; st.player.z = door.z;
          const it = C.itemCreate(st, wb('whiskey', 'BUSINESS', 3), { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null).id;
          st.player.act = { k: 'put', dest: { kind: 'BUSINESS', businessId: 0 }, left: 12 };
          const ev = R.simTick(st, []).concat(R.simTick(st, []));
          out.wrongFinish = { refused: ev.some(e => e.t === 'carryRefused'), at: st.items.where[it].kind }; }
        // 7. A delivered item is used up (reason 'business') once the shelf is empty.
        const s7 = R.newState(1866); s7.town.biz[0].shelf.flour = 0; s7.player.x = door.x; s7.player.z = door.z;
        const f7 = C.itemCreate(s7, wb('flour', 'BUSINESS', 0), { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null).id;
        const ev7 = run(s7, s7.time + 120, [{ t: 'carryPut', biz: 0 }]);
        const d7 = ev7.find(e => e.t === 'bizDelivered');
        run(s7, 3 * D);
        const u7 = s7.items.used.find(u => u.id === f7);
        out.consumed = { delivered: !!d7, paid: d7 && d7.paid, reason: u7 && u7.reason, from: u7 && u7.from, alive: s7.items.alive[f7], cons: C.itemCheckConservation(s7) };

        // 8. Buildings: clearances, overlaps, the walk grid, and every door reached on foot.
        const fps = R.buildings.footprints(), town = fps.filter(f => f.town !== undefined), Tk = s1.track;
        const dist = (f, x, z) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z; const lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.hypot(Math.max(0, Math.abs(lx) - f.w / 2), Math.max(0, Math.abs(lz) - f.d / 2)); };
        out.clear = [];
        for (const fp of town) for (const Ed of Tk.edges) {
          const need = Ed.cls === 'yard' ? 1.0 : 1.2, n = Math.max(1, Math.ceil(Ed.len / 0.25));
          for (let i = 0; i <= n; i++) { const p = R.edgeAt(Tk, Ed, Ed.len * i / n); if (dist(fp, p.x, p.z) < need - 1e-6) { out.clear.push(`${fp.id} ${dist(fp, p.x, p.z).toFixed(2)}u from edge ${Ed.id}`); break; } }
        }
        const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6;
        out.overlaps = [];
        for (const a of town) for (const b of fps) if (a !== b && overlap(a, b)) out.overlaps.push(a.id + '+' + b.id);
        const G = walkGrid(Tk);
        out.open = [];
        for (const fp of town) for (const [ax, az] of [[0, 0], [0.4, 0.4], [-0.4, -0.4]]) {
          const x = fp.x + ax * fp.w, z = fp.z + az * fp.d;
          if (G.cost[walkCell(x, z)] !== 0) out.open.push(fp.id);
        }
        const inB = (x, z) => town.find(fp => dist(fp, x, z) < 1e-6);
        out.doors = T.TOWN_BUSINESSES.map(B => {
          const st = R.newState(1866); st.player.x = 0; st.player.z = 11.6; // on the platform
          let reached = -1, entered = null;
          for (let i = 0; i < 1500 && reached < 0; i++) {
            const ev = R.simTick(st, i ? [] : [{ t: 'useBiz', biz: B.id }]);
            const b = inB(st.player.x, st.player.z); if (b && !entered) entered = b.id;
            if (ev.some(e => e.t === 'reachedBiz' && e.biz === B.id)) reached = i;
          }
          const d = T.townDoor(B.id);
          return { biz: B.id, reached, entered, dist: Math.hypot(st.player.x - d.x, st.player.z - d.z) };
        });

        // 9. Determinism: 7 game days with a delivery, twice.
        const script = st => { const k = st.econ.contracts.find(k => k.counterparty === 0 && k.commodity === 'flour'); k.status = 'ACTIVE';
          C.itemCreate(st, wb('flour', 'BUSINESS', 0, k.id), { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null); return st; };
        const sc = [{ tick: 5, cmd: { t: 'carryPut', biz: 0 } }, { tick: 400, cmd: { t: 'useBiz', biz: 3 } }];
        const a = R.simRun(script(R.newState(1866)), sc, 7 * 10800), b = R.simRun(script(R.newState(1866)), sc, 7 * 10800);
        out.det = { a: R.stateHash(a), b: R.stateHash(b), offers: a.econ.contracts.length, used: a.items.used.length, money: E.econCheckMoney(a), cons: C.itemCheckConservation(a) };
        // 10. The v6 sample save loads with the towns' opening stock.
        const fx = JSON.parse(v6), sv = R.migrate(JSON.parse(fx.save));
        out.old = { schema: sv.state.schemaVersion, town: JSON.stringify(sv.state.town) === JSON.stringify(T.townNewState()) };
        return out;
      }, v6);

      if (r.rates.join(' ') !== '0:beans=2550/0,clothing=510/0,coffee=850/0,cordwood=0/4000,flour=4250/0,lampoil=800/0,meat=1700/0,salt=850/0 1:beans=1500/0,clothing=300/0,coffee=500/0,cordwood=0/2000,flour=2500/0,lampoil=400/0,meat=1000/0,salt=500/0 2:lumber=2000/0,nails=500/0 3:whiskey=833/0 4:beans=667/0,coffee=133/0,cordwood=0/500,flour=667/0,lampoil=100/0,meat=333/0') problems.push('weekly rates are not the documented ones: ' + r.rates.join(' '));
      if (r.week.length) problems.push('7 days of use do not match the rates: ' + r.week.join('; '));
      if (r.weekMoney.length || r.weekItems.length) problems.push('7 days: money ' + r.weekMoney.join('; ') + ' items ' + r.weekItems.join('; '));
      if (r.winter.store !== 1 || r.winter.willow !== 0 || r.winter.offered.join() !== '0,1,4') problems.push('winter cordwood: ' + JSON.stringify(r.winter));
      if (r.springCordwood !== 0) problems.push('cordwood was used in spring');
      if (r.day1 !== 0) problems.push(`a new game offered ${r.day1} town contracts on day 1 (opening stock should last)`);
      const o = r.offer;
      if (o.before !== 0 || o.n !== 1 || o.biz !== 0 || o.c !== 'coffee' || o.q !== 2 || o.price !== Math.round(o.base * 130 / 100) || o.due !== o.wantDue || o.status !== 'OFFERED') problems.push('low stock offer: ' + JSON.stringify(o));
      if (r.offerAgain.includes('coffee')) problems.push('the store offered coffee again while its offer was open');
      const d = r.deliver;
      if (!d.where || d.where.kind !== 'BUSINESS' || d.where.businessId !== 0) problems.push('the delivered flour is not at the general store: ' + JSON.stringify(d.where));
      if (d.paid !== d.price || d.cash !== d.price || d.delivered !== 1 || d.ledger.category !== 'delivered') problems.push('delivery not paid under its contract: ' + JSON.stringify(d));
      if (d.money.length || d.cons.length) problems.push('after delivery: money ' + d.money.join('; ') + ' items ' + d.cons.join('; '));
      if (d.dist > 1.5) problems.push(`the player put the flour down ${d.dist.toFixed(2)}u from the door`);
      if (d.putTicks !== 2) problems.push(`the put-down at the door took ${d.putTicks} ticks (0.2 game minutes is 2 ticks)`);
      if (r.again.ok) problems.push('the same delivered item was paid twice');
      const t = r.truck;
      if (t.delivered !== 3 || t.events !== 3 || t.held !== 0 || t.money.length || t.cons.length) problems.push('hand truck of 3 flour: ' + JSON.stringify(t));
      for (const [i, w] of r.wrong.entries()) if (!w.why || !/will not take/.test(w.why) || w.held !== 'CARRIED' || w.mode !== 'idle') problems.push(`wrong goods ${i} not refused at the door: ${JSON.stringify(w)}`);
      if (!r.wrongFinish.refused || r.wrongFinish.at !== 'CARRIED') problems.push('wrong goods put down by a started action were not refused: ' + JSON.stringify(r.wrongFinish));
      const c = r.consumed;
      if (!c.delivered || c.paid !== 0 || c.reason !== 'business' || !c.from || c.from.kind !== 'BUSINESS' || c.from.businessId !== 0 || c.alive || c.cons.length) problems.push('a delivered item was not used up with reason business: ' + JSON.stringify(c));
      if (r.clear.length) problems.push('town buildings too close to track: ' + r.clear.join('; '));
      if (r.overlaps.length) problems.push('town buildings overlap: ' + r.overlaps.join(', '));
      if (r.open.length) problems.push('walk grid cells open inside town buildings: ' + [...new Set(r.open)].join(', '));
      for (const x of r.doors) if (x.reached < 0 || x.entered || x.dist > 1.5) problems.push('door of business ' + x.biz + ' not reached on foot: ' + JSON.stringify(x));
      if (r.det.a !== r.det.b || r.det.money.length || r.det.cons.length) problems.push('7 days twice: ' + JSON.stringify(r.det));
      if (!r.old.town) problems.push('the v6 sample save did not load with the towns\' opening stock: ' + JSON.stringify(r.old));
      console.log(`  7 days: ${r.weekUsed} units used, offers ${r.weekOffers.join(' ') || 'none'}; low coffee offer ${o.q} at ${o.price} cents (base ${o.base}); delivery paid ${d.paid} cents; doors reached in ${r.doors.map(x => x.reached).join('/')} ticks; 7 days twice ${r.det.a}; sim part ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      if (errors.length) problems.push('console errors (sim part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }

  // ---- Part 2: the page, by real touch ----
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const settle = () => page.waitForTimeout(150);
    try {
      // The town scenario (as rh.scenario('town') gives with ?debug=1), loaded as a save: flour in hand beside the store.
      await R(() => { const R = window.__railhead; R.importSave(JSON.stringify({ state: R.town.townDebugScenario(R.newState(1866)), ui: { yawIdx: 0, zoom: 1, speed: 1 } })); R.setSpeed(0); });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: screenshotPath('town-hub-' + orientation) });
      const lab = await R(() => {
        const el = document.querySelector('.townSign[data-biz="0"]');
        if (!el || el.style.visibility === 'hidden' || el.style.display === 'none') return { shown: false };
        const q = el.getBoundingClientRect(), over = [];
        for (const b of document.querySelectorAll('button')) { if (!b.offsetParent) continue; const p = b.getBoundingClientRect(); if (q.left < p.right && q.right > p.left && q.top < p.bottom && q.bottom > p.top) over.push(b.textContent || b.id); }
        return { shown: true, text: el.textContent, over, h: q.height, font: parseFloat(getComputedStyle(el).fontSize) };
      });
      if (!lab.shown || !/Hub General Store/.test(lab.text) || !/flour/.test(lab.text)) problems.push(`${orientation}: the store's door label does not show its name and wants: ${JSON.stringify(lab)}`);
      else if (lab.over.length) problems.push(`${orientation}: the door label covers buttons: ${lab.over.join(', ')}`);
      else if (lab.font < 14) problems.push(`${orientation}: the door label text is ${lab.font}px (14 or more to read on a phone)`);
      // Tap the store's door: walk there, put the flour down, paid under the contract.
      const cash0 = await page.textContent('#cash');
      const sp = await R(() => { const R = window.__railhead, d = R.town.townDoor(0); return R.toScreen(d.x, d.z, 0.5); });
      await page.touchscreen.tap(sp.x, sp.y); await settle();
      const n = await R(() => { const R = window.__railhead; for (let i = 0; i < 400; i++) { R.step(1); if (R.state.econ.contracts[0].delivered) return i; } return -1; });
      await page.waitForTimeout(700);
      const after = await R(() => { const R = window.__railhead, S = R.state, k = S.econ.contracts[0]; return { where: S.items.where[k.items[0]], price: k.pricePerUnit, cash: S.econ.cash, toast: document.getElementById('toast').textContent,
        money: R.econ.econCheckMoney(S), cons: R.cargo.itemCheckConservation(S), text: document.getElementById('cash').textContent }; });
      await page.screenshot({ path: screenshotPath('town-delivery-' + orientation) });
      if (n < 0 || !after.where || after.where.kind !== 'BUSINESS' || after.where.businessId !== 0) problems.push(`${orientation}: a tap on the store's door did not deliver the flour (${n} ticks, ${JSON.stringify(after.where)})`);
      if (after.cash !== 250000 + after.price || cash0 !== '$2,500.00' || after.text !== '$2,5' + (after.price / 100).toFixed(2).padStart(5, '0')) problems.push(`${orientation}: cash on screen ${cash0} -> ${after.text}, price ${after.price}`);
      if (!/Delivered the flour to the general store/.test(after.toast)) problems.push(`${orientation}: no delivery message: "${after.toast}"`);
      if (after.money.length || after.cons.length) problems.push(`${orientation}: after the delivery: money ${after.money.join('; ')} items ${after.cons.join('; ')}`);
      // Whiskey for the saloon, tapped onto the store: refused with a message, still in hand.
      await R(() => { const R = window.__railhead, S = R.state, w = R.cargo.itemsAt(S, { kind: 'GROUND' })[0]; R.cargo.itemMove(S, w, { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null); R.cargo.redraw(); });
      await page.waitForTimeout(300);
      const sp2 = await R(() => { const R = window.__railhead, d = R.town.townDoor(0); return R.toScreen(d.x, d.z, 0.5); });
      await page.touchscreen.tap(sp2.x, sp2.y); await settle();
      await R(() => window.__railhead.step(2)); await settle();
      const ref = await R(() => ({ toast: document.getElementById('toast').textContent, held: window.__railhead.carry.carryHeld(window.__railhead.state).length }));
      if (!/will not take the whiskey/.test(ref.toast) || ref.held !== 1) problems.push(`${orientation}: whiskey for the saloon was not refused at the store: ${JSON.stringify(ref)}`);
      // Busy: the train running past the station, the player walking down Main Street.
      await R(() => { const R = window.__railhead; R.send({ t: 'trainRun', tr: 0, dir: 1 }); R.send({ t: 'walkTo', x: 300, z: 350 }); R.step(30); });
      await page.waitForTimeout(900);
      const dc = await R(() => window.__railhead.drawCalls);
      if (dc >= 100) problems.push(`${orientation}: ${dc} draw calls with the town in view (limit 100)`);
      if (orientation === 'portrait') {
        // Export and import, then a real page reload, keep the towns.
        const ei = await R(() => { const R = window.__railhead, json = R.exportSave(), a = R.hash(); R.step(500); const b = R.hash(); R.importSave(json); const c = R.hash(); R.step(500); return { a, b, c, d: R.hash() }; });
        if (ei.a !== ei.c || ei.b !== ei.d) problems.push('export and import did not keep the towns: ' + JSON.stringify(ei));
        const before = await R(async () => { const R = window.__railhead; R.state.player.x = 0; R.state.player.z = 11.6; await R.saveGame(); return { h: R.hash(), town: JSON.stringify(R.state.town) }; });
        await page.reload(); await waitReady(page);
        const re = await R(() => ({ h: window.__railhead.hash(), town: JSON.stringify(window.__railhead.state.town) }));
        if (re.h !== before.h || re.town !== before.town) problems.push('a real reload changed the towns');
      }
      console.log(`  ${orientation}: door label "${lab.text}"; delivered by touch in ${n} ticks, cash ${cash0} -> ${after.text}; refused: "${ref.toast}"; draw calls ${dc} with the town in view`);
      if (errors.length) problems.push(`${orientation}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
