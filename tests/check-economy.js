// Check: the economy core (M1 package 3, builder C1; design-doc 10, 19, 20, 21).
// Part 1, the sim alone:
// - A new game starts with $2,500.00, an empty ledger, section 21 prices (spring: lumber +10%), the starting
//   offers, and the money check passing.
// - Orders by telegraph: refused away from the key; at the key they are paid at once (one 'imports' ledger
//   entry), booked for the next Overland visit (6 game hours' lead), and that visit brings exactly what was
//   ordered, long bundles on a flatcar and the rest in a boxcar, with waybills to construction, the warehouse or
//   a contract's business. An order beyond the overdraft, or needing more than 6 cars, is refused.
//   With no order, the Overland brings no cars.
// - Selling Outside: a car of goods addressed Outside, taken on the pick-up, pays the market's sell price.
// - Contracts: accepted at the key; contractDeliver pays a delivered item once (refuses a second time, another
//   business, the wrong commodity, an item not handed over); a delivery contract is done after its quantity
//   (reputation +2); a late one pays 10% less a day and costs reputation; a standing contract is paid on
//   Saturday at 18:00; a declined offer cannot be accepted; offers expire; a late contract is cancelled after
//   5 days. contractOffer adds an offer for the placeholder towns.
// - The credit line: borrow, repay, refused beyond the limit; interest is charged on Monday; the market moves on
//   Monday within 70% to 140% of base and keeps its history.
// - The money check holds every 50 ticks over 3 game days of play, and catches 7 deliberately broken ledgers.
// - Lot fees stub. Determinism: the 3 days twice give the same hash. An old (v5) sample save loads with the
//   starting money and passes the money check.
// Part 2, the page (portrait, by real touch): tap the depot's bay window, the player walks to the telegraph key
// and the panel opens; + three times on flour and Send order (cash on screen drops by $12.00), accept the first
// offer, Ledger shows the entries; buttons are 48 px or more; walking away closes the panel; the Overland brings
// the order; export and import, and a real page reload, keep the money. Screenshots of the panel and the cash.
// Part 3, landscape: the panel and the cash display, nothing overlapping the buttons. Draw calls reported.

const fs = require('fs');
const path = require('path');
const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkEconomy() {
  const problems = [];
  const v5 = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v5.json'), 'utf8');
  // ---- Part 1: the sim ----
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
    try {
      const r = await page.evaluate((v5) => {
        const R = window.__railhead, E = R.econ, X = R.interchange, C = R.cargo, out = {};
        const D = 86400, H = 3600, toTime = (day, hh) => day * D + hh * H - 5 * H; // day from 0
        const run = (st, until, cmds) => { const ev = []; let first = true; while (st.time < until) { ev.push(...R.simTick(st, first ? cmds || [] : [])); first = false; } return ev; };
        const atKey = st => { const k = E.econTelegraphKey(); st.player.x = k.x; st.player.z = k.z; return st; };
        const led = st => st.econ.ledger;

        // 1. A new game.
        const s0 = R.newState(1866);
        out.start = { cash: s0.econ.cash, ledger: s0.econ.ledger.length, flour: s0.econ.market.buy.flour, lumber: s0.econ.market.buy.lumber, grainSell: s0.econ.market.sell.grain,
          offers: s0.econ.contracts.map(k => k.status + ':' + k.commodity + ':' + k.quantity + ':' + k.pricePerUnit), check: E.econCheckMoney(s0), schema: s0.schemaVersion };

        // 2. Orders.
        const s1 = R.newState(1866), kf = E.econTelegraphKey(); s1.player.x = kf.x + 8; s1.player.z = kf.z - 4; // away from the key
        let ev = R.simTick(s1, [{ t: 'econOrder', lines: [{ c: 'flour', n: 3 }] }]);
        out.farRefused = ev.some(e => e.t === 'econRefused' && /telegraph key/.test(e.why)) && s1.econ.ledger.length === 0;
        atKey(s1);
        const lines = [{ c: 'flour', n: 3 }, { c: 'ties', n: 2 }, { c: 'coffee', n: 1 }, { c: 'tools', n: 1 }];
        ev = R.simTick(s1, [{ t: 'econOrder', lines }]);
        const placed = ev.find(e => e.t === 'orderPlaced');
        out.order = { placed: !!placed, due: placed && placed.due, want: toTime(0, 18), cost: placed && placed.cost, cash: s1.econ.cash,
          ledger: led(s1).map(L => L.category + ':' + L.amount + ':' + L.counterparty), check: E.econCheckMoney(s1) };
        // Refusals: far beyond the overdraft, and more than 6 cars of goods for one visit.
        ev = R.simTick(s1, [{ t: 'econOrder', lines: [{ c: 'machinery', n: 30 }] }]);
        out.overdraft = (ev.find(e => e.t === 'econRefused') || {}).why || null;
        ev = R.simTick(s1, [{ t: 'econOrder', lines: [{ c: 'flour', n: 99 }, { c: 'beans', n: 20 }] }]);
        out.tooBig = (ev.find(e => e.t === 'econRefused') || {}).why || null;
        ev = R.simTick(s1, [{ t: 'econOrder', lines: [{ c: 'coal', n: 2 }] }, { t: 'econOrder', lines: [{ c: 'flour', n: 0 }] }]);
        out.badLines = ev.filter(e => e.t === 'econRefused').length;
        out.cashAfterRefusals = s1.econ.cash;
        // The morning visit (06:00) is too soon: nothing comes. The 18:00 visit brings exactly the order.
        const evAll = run(s1, toTime(0, 17));
        out.morning = evAll.filter(e => e.t === 'overlandArriving').map(e => e.cars);
        const evEve = run(s1, toTime(0, 20));
        const cut = X.interchangeCut(s1), got = {};
        out.evening = { arriving: evEve.filter(e => e.t === 'overlandArriving').map(e => e.cars), cars: cut.consist.map(c => c.k), delivered: evEve.filter(e => e.t === 'orderDelivered').map(e => e.items.length) };
        out.carsOf = {};
        for (const car of cut.consist) for (const id of C.itemsAt(s1, { kind: 'CAR', stockId: car.id })) {
          const wb = s1.items.waybill[id]; got[wb.commodity] = (got[wb.commodity] || 0) + 1;
          out.carsOf[wb.commodity] = car.k + ':' + wb.consignee.kind;
        }
        out.got = got; out.ordersLeft = s1.econ.orders.length; out.cons = C.itemCheckConservation(s1);

        // 3. No order: the Overland brings no cars (normal play has no fixed delivery).
        const s2 = R.newState(1866);
        const ev2 = run(s2, toTime(0, 20));
        out.noOrder = { arriving: ev2.filter(e => e.t === 'overlandArriving').map(e => e.cars), cut: X.interchangeCut(s2).consist.length, items: s2.items.next - 8 }; // (D13: a new game has 8 starting cords)

        // 4. Selling Outside: after the evening visit of s1, empty the boxcar, put 2 tool crates and a tie bundle for Outside on
        //    the flatcar (with the ties moved off), and let the next morning's pick-up take them.
        const flat = cut.consist.find(c => c.k === 'flatcar'), box = cut.consist.find(c => c.k === 'boxcar');
        let gx = 400;
        for (const car of [flat, box]) for (const id of C.itemsAt(s1, { kind: 'CAR', stockId: car.id })) C.itemMove(s1, id, { kind: 'GROUND', x: gx += 40, z: 2300 }, null);
        const outWb = c => ({ commodity: c, originTownId: 0, destTownId: 'OUTSIDE', consignee: { kind: 'OUTSIDE', id: 0 }, contractId: null, due: null });
        const exp = [C.itemCreate(s1, outWb('tools'), { kind: 'CAR', stockId: flat.id }, null).id, C.itemCreate(s1, outWb('tools'), { kind: 'CAR', stockId: flat.id }, null).id,
          C.itemCreate(s1, outWb('ties'), { kind: 'CAR', stockId: flat.id }, null).id];
        const cash4 = s1.econ.cash, sellTools = s1.econ.market.sell.tools, sellTies = s1.econ.market.sell.ties;
        const ev4 = run(s1, toTime(1, 9));
        const pick = ev4.find(e => e.t === 'overlandPickedUp');
        out.sold = { paid: pick && pick.paid, want: 2 * sellTools + sellTies, cash: s1.econ.cash - cash4, entries: led(s1).filter(L => L.category === 'exports').map(L => L.amount),
          consumed: exp.every(id => s1.items.used.some(u => u.id === id && u.reason === 'soldOutside')), check: E.econCheckMoney(s1) };

        // 5. Contracts.
        const s5 = atKey(R.newState(1866)), K = s5.econ.contracts;
        ev = R.simTick(s5, [{ t: 'contractAccept', id: 0 }, { t: 'contractDecline', id: 1 }, { t: 'contractAccept', id: 4 }]);
        out.accepted = K.map(k => k.status);
        ev = R.simTick(s5, [{ t: 'contractAccept', id: 1 }]);
        out.declinedThenAccept = ev.some(e => e.t === 'econRefused');
        const wbFor = (c, biz, contractId) => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'BUSINESS', id: biz }, contractId: contractId === undefined ? null : contractId, due: null });
        const hand = (wb, biz, consume) => { const id = C.itemCreate(s5, wb, { kind: 'BUSINESS', businessId: biz }, null).id; if (consume) C.itemConsume(s5, id, 'business', null); return id; };
        const cash5 = s5.econ.cash, price = K[0].pricePerUnit;
        const d1 = E.contractDeliver(s5, hand(wbFor('flour', 0, 0), 0, true), null);
        const first = d1.ok ? d1.amount : null;
        out.deliver = { first, price, again: E.contractDeliver(s5, s5.items.next - 1, null).ok,
          wrongBiz: E.contractDeliver(s5, hand(wbFor('flour', 3), 3, true), null).ok,
          wrongCommodity: E.contractDeliver(s5, hand(wbFor('salt', 0), 0, true), null).ok,
          notHanded: E.contractDeliver(s5, C.itemCreate(s5, wbFor('flour', 0), { kind: 'GROUND', x: 0, z: 0 }, null).id, null).ok };
        // Five more flour (waybills without a contract id, addressed to the store): the contract is done.
        for (let i = 0; i < 5; i++) E.contractDeliver(s5, hand(wbFor('flour', 0), 0, i % 2 === 0), null);
        out.done = { status: K[0].status, delivered: K[0].delivered, paid: s5.econ.cash - cash5, want: 6 * price, rep: s5.econ.reputation[0],
          entries: led(s5).filter(L => L.category === 'delivered').length };
        // A late delivery: accept the lumber offer, deliver 2 days after its due time: 20% off; then cancelled after 5 days.
        R.simTick(s5, [{ t: 'contractAccept', id: 2 }]);
        run(s5, K[2].due + 2 * D - 100);
        const dl = E.contractDeliver(s5, hand(wbFor('lumber', 2), 2, true), null);
        out.late = { status0: null, amount: dl.amount, want: Math.round(K[2].pricePerUnit * 0.8) };
        // The standing contract (Willow Ford coffee, 2 a week, first due at the end of Sunday): 2 delivered on Saturday
        // night are owed (not paid yet); the next week's period starts; they are paid on the next Saturday at 18:00.
        const cashSt = s5.econ.cash;
        E.contractDeliver(s5, hand(wbFor('coffee', 1), 1, true), null); E.contractDeliver(s5, hand(wbFor('coffee', 1), 1, true), null);
        out.standing = { owed: K[4].owed, want: 2 * K[4].pricePerUnit, unpaid: s5.econ.cash === cashSt, period: K[4].period, status: K[4].status, dueMoved: K[4].due === toTime(14, 0), rep1: s5.econ.reputation[1] };
        const evSat = run(s5, toTime(12, 18) + 8);
        out.standing.paid = evSat.filter(e => e.t === 'contractPaid').map(e => e.amount);
        out.standing.owedAfter = K[4].owed;
        out.late.cancelled = K[2].status; out.late.rep = s5.econ.reputation[0];
        out.expired = K[3].status; // the nails offer was never answered
        out.offer = E.contractOffer(s5, { kind: 'DELIVERY', counterparty: 1, commodity: 'salt', quantity: 3, due: s5.time + D }, null);
        out.offerBad = E.contractOffer(s5, { kind: 'DELIVERY', counterparty: 99, commodity: 'salt', quantity: 3, due: s5.time + D }, null).ok;
        out.offerPrice = s5.econ.contracts[out.offer.id] && s5.econ.contracts[out.offer.id].pricePerUnit;
        out.offerWant = Math.round(s5.econ.market.buy.salt * (125 + 3 * 12) / 100);
        out.check5 = E.econCheckMoney(s5);
        // Ordering for a contract: the waybill names the contract and its business.
        const s6 = atKey(R.newState(1866));
        R.simTick(s6, [{ t: 'contractAccept', id: 0 }]);
        R.simTick(s6, [{ t: 'econOrder', lines: [{ c: 'flour', n: 6, contract: 0 }] }]);
        run(s6, toTime(0, 20));
        // (D13: the 8 starting cords at the wood stage are not part of the order.)
        const ids6 = []; for (let i = 0; i < s6.items.next; i++) if (s6.items.alive[i] && s6.items.waybill[i].commodity !== 'cordwood') ids6.push(s6.items.waybill[i]);
        out.forContract = { n: ids6.length, ok: ids6.every(w => w.contractId === 0 && w.consignee.kind === 'BUSINESS' && w.consignee.id === 0 && w.commodity === 'flour') };
        const badFor = R.simTick(s6, [{ t: 'econOrder', lines: [{ c: 'beans', n: 1, contract: 0 }] }]);
        out.forWrong = badFor.some(e => e.t === 'econRefused');

        // 6. The credit line, interest and the market.
        const s7 = atKey(R.newState(1866));
        R.simTick(s7, [{ t: 'creditDraw', amount: 50000 }]);
        R.simTick(s7, [{ t: 'creditRepay', amount: 20000 }]);
        const ev7 = R.simTick(s7, [{ t: 'creditDraw', amount: 480000 }, { t: 'creditRepay', amount: 40000 }]);
        out.credit = { loan: s7.econ.loan, cash: s7.econ.cash, refused: ev7.filter(e => e.t === 'econRefused').length };
        const before = JSON.parse(JSON.stringify(s7.econ.market));
        const ev7b = run(s7, toTime(7, 0) + 8);
        const M = s7.econ.market, base = R.cargo.COMMODITIES;
        let moved = 0, outOfBounds = 0;
        for (const c of Object.keys(base)) { if (M.buy[c] !== before.buy[c]) moved++; if (base[c].buy !== null && (M.buy[c] < Math.round(base[c].buy * 0.7) || M.buy[c] > Math.round(base[c].buy * 1.4))) outOfBounds++; }
        out.week = { interest: ev7b.filter(e => e.t === 'interestPaid').map(e => e.amount), moved, outOfBounds, hist: M.history.flour.length, marketEvents: ev7b.filter(e => e.t === 'marketMoved').length,
          check: E.econCheckMoney(s7) };
        // Winter: 42 days in, flour costs 10% more than the walk alone gives.
        const s8 = R.newState(1866); s8.time = toTime(42, 0) - 8; R.simTick(s8, []);
        out.winter = { flour: s8.econ.market.buy.flour, walk: s8.econ.market.walk.flour, want: Math.max(280, Math.min(560, Math.round(400 * 1100 * s8.econ.market.walk.flour / 1e6))) };

        // 7. The money check over 3 game days of play, then 7 broken ledgers.
        const script = [
          { tick: 1, cmd: { t: 'useTelegraph' } },
          { tick: 120, cmd: { t: 'econOrder', lines: [{ c: 'flour', n: 6 }, { c: 'rails', n: 1 }] } },
          { tick: 121, cmd: { t: 'contractAccept', id: 0 } },
          { tick: 122, cmd: { t: 'creditDraw', amount: 100000 } },
          { tick: 200, cmd: { t: 'econOrder', lines: [{ c: 'beans', n: 4 }] } },
          { tick: 3000, cmd: { t: 'creditRepay', amount: 30000 } },
          { tick: 6000, cmd: { t: 'useTelegraph' } },
          { tick: 6200, cmd: { t: 'econOrder', lines: [{ c: 'lumber', n: 8 }] } },
        ];
        const byTick = {}; for (const s of script) (byTick[s.tick] = byTick[s.tick] || []).push(s.cmd);
        const s9 = R.newState(1866);
        let checks = 0, bad = [];
        const evs = [];
        for (let i = 0; i < 3 * 10800; i++) {
          evs.push(...R.simTick(s9, byTick[s9.tick] || []).filter(e => /^(orderPlaced|orderDelivered|reachedTelegraph|creditDrawn|creditRepaid|contractAccepted)$/.test(e.t)).map(e => e.t));
          if (i % 50 === 0) { checks++; const p = E.econCheckMoney(s9); if (p.length) bad.push(i + ': ' + p.join('; ')); }
        }
        out.days3 = { checks, bad: bad.slice(0, 3), events: evs, ledger: s9.econ.ledger.length, cash: s9.econ.cash, hash: R.stateHash(s9) };
        const brk = [
          st => { st.econ.cash += 1; },
          st => { st.econ.ledger[0].amount += 100; },
          st => { st.econ.ledger.pop(); },
          st => { st.econ.ledger[0].amount = 1.5; },
          st => { st.econ.ledger[0].category = 'gifts'; },
          st => { st.econ.loan += 1000; },
          st => { st.econ.ledger.push({ t: st.time, amount: 5000, category: 'delivered', counterparty: '', ref: null }); st.econ.cash += 5000; },
        ];
        out.broken = brk.map(f => { const c = JSON.parse(JSON.stringify(s9)); f(c); return E.econCheckMoney(c).length > 0; });
        out.det = R.stateHash(R.simRun(R.newState(1866), script, 3 * 10800));

        // 8. Lot fees stub.
        const s10 = R.newState(1866);
        out.lot = [E.econLotFee(s10, 'HOUSE', 0, null, null).amount, E.econLotFee(s10, 'BUSINESS', 1, null, null).amount, E.econLotFee(s10, 'BARN', 1, null, null).ok, s10.econ.cash, E.econCheckMoney(s10).length];

        // 9. An old (schema 5) sample save: loads with the starting money and passes the money check.
        const fx = JSON.parse(v5), sv = R.migrate(JSON.parse(fx.save));
        out.old = { schema: sv.state.schemaVersion, cash: sv.state.econ.cash, offers: sv.state.econ.contracts.length, check: E.econCheckMoney(sv.state) };
        return out;
      }, v5);

      const s = r.start;
      if (s.cash !== 250000 || s.ledger !== 0) problems.push(`a new game should start with $2,500.00 and an empty ledger (cash ${s.cash}, ${s.ledger} entries)`);
      if (s.flour !== 400 || s.lumber !== 880 || s.grainSell !== 180) problems.push(`starting prices: flour ${s.flour} (400), lumber ${s.lumber} (880, spring +10%), grain sell ${s.grainSell} (180)`);
      if (s.offers.length !== 5 || !s.offers.every(o => /^OFFERED/.test(o)) || s.offers[0] !== 'OFFERED:flour:6:500') problems.push('starting offers: ' + JSON.stringify(s.offers));
      if (s.check.length) problems.push('money check on a new game: ' + s.check.join('; '));
      if (!r.farRefused) problems.push('an order sent away from the telegraph key was not refused');
      const o = r.order;
      const cost = 3 * 400 + 2 * 300 + 600 + 1500;
      if (!o.placed || o.cost !== cost || o.cash !== 250000 - cost) problems.push(`the order was not charged right: ${JSON.stringify(o)} (want ${cost})`);
      if (o.due !== o.want) problems.push(`an order placed at 05:00 should come on the 18:00 Overland (due ${o.due}, want ${o.want})`);
      if (o.ledger.length !== 1 || o.ledger[0] !== `imports:${-cost}:Overland market`) problems.push('the order should make one imports ledger entry: ' + JSON.stringify(o.ledger));
      if (o.check.length) problems.push('money check after the order: ' + o.check.join('; '));
      if (!/Not enough money/.test(r.overdraft || '')) problems.push('an order beyond the overdraft was not refused: ' + r.overdraft);
      if (!/Too much for one train/.test(r.tooBig || '')) problems.push('an order needing more than 6 cars was not refused: ' + r.tooBig);
      if (r.badLines !== 2) problems.push(`orders of coal (bulk) or of 0 items should be refused (refusals ${r.badLines})`);
      if (r.cashAfterRefusals !== 250000 - cost) problems.push('a refused order changed the cash');
      if (r.morning.length !== 1 || r.morning[0] !== 0) problems.push('the 06:00 Overland should come with no cars (the order is for 18:00): ' + JSON.stringify(r.morning));
      if (JSON.stringify(r.got) !== JSON.stringify({ flour: 3, coffee: 1, tools: 1, ties: 2 }) && JSON.stringify(Object.entries(r.got).sort()) !== JSON.stringify(Object.entries({ flour: 3, ties: 2, coffee: 1, tools: 1 }).sort())) problems.push('the Overland did not bring exactly the order: ' + JSON.stringify(r.got));
      if (r.evening.cars.sort().join() !== 'boxcar,flatcar' || r.evening.delivered.join() !== '7') problems.push('the evening visit should set out a flatcar and a boxcar with the 7 items: ' + JSON.stringify(r.evening));
      const co = r.carsOf;
      if (co.ties !== 'flatcar:CONSTRUCTION' || co.flour !== 'boxcar:WAREHOUSE' || co.tools !== 'boxcar:WAREHOUSE' || co.coffee !== 'boxcar:WAREHOUSE') problems.push('ordered goods are in the wrong cars or addressed wrongly: ' + JSON.stringify(co));
      if (r.ordersLeft !== 0) problems.push('the delivered order is still waiting');
      if (r.cons.length) problems.push('item conservation after the delivery: ' + r.cons.join('; '));
      if (r.noOrder.arriving.join() !== '0,0' || r.noOrder.cut || r.noOrder.items) problems.push('with no order the Overland should bring nothing: ' + JSON.stringify(r.noOrder));
      const so = r.sold;
      if (!so.consumed || so.paid !== so.want || so.cash !== so.want || so.entries.length !== 3) problems.push('selling Outside did not pay the sell price: ' + JSON.stringify(so));
      if (so.check.length) problems.push('money check after selling Outside: ' + so.check.join('; '));
      if (r.accepted.join() !== 'ACTIVE,DECLINED,OFFERED,OFFERED,ACTIVE') problems.push('accept and decline: ' + r.accepted.join());
      if (!r.declinedThenAccept) problems.push('a declined offer could still be accepted');
      const d = r.deliver;
      if (d.first !== d.price || d.again || d.wrongBiz || d.wrongCommodity || d.notHanded) problems.push('contractDeliver: ' + JSON.stringify(d));
      if (r.done.status !== 'DONE' || r.done.paid !== r.done.want || r.done.rep !== 52 || r.done.entries !== 6) problems.push('a delivery contract fulfilled: ' + JSON.stringify(r.done));
      if (r.late.amount !== r.late.want) problems.push(`a delivery 2 days late should pay 20% less (${r.late.amount} vs ${r.late.want})`);
      if (r.late.cancelled !== 'CANCELLED' || r.late.rep !== 42) problems.push(`a contract 5 days late should be cancelled with reputation -10 (status ${r.late.cancelled}, reputation ${r.late.rep}, want 42)`);
      if (r.expired !== 'EXPIRED') problems.push('an unanswered offer should expire at its due time, status ' + r.expired);
      const st = r.standing;
      if (st.period !== 1 || st.status !== 'ACTIVE' || st.owed !== st.want || !st.unpaid || !st.dueMoved || st.rep1 !== 52 || st.owedAfter !== 0 || st.paid.join() !== String(st.want)) problems.push('a standing contract should be owed, then paid on Saturday at 18:00: ' + JSON.stringify(st));
      if (!r.offer.ok || r.offerBad || r.offerPrice !== r.offerWant) problems.push(`contractOffer: ${JSON.stringify(r.offer)}, bad business accepted ${r.offerBad}, price ${r.offerPrice} (want ${r.offerWant})`);
      if (r.check5.length) problems.push('money check after the contracts: ' + r.check5.join('; '));
      if (r.forContract.n !== 6 || !r.forContract.ok) problems.push('an order for a contract should bring 6 flour addressed to the store under that contract: ' + JSON.stringify(r.forContract));
      if (!r.forWrong) problems.push('ordering beans for a flour contract was not refused');
      if (r.credit.loan !== 30000 || r.credit.cash !== 280000 || r.credit.refused !== 2) problems.push('credit line: ' + JSON.stringify(r.credit));
      const w = r.week;
      if (w.interest.join() !== '300' || w.marketEvents !== 1 || w.moved < 10 || w.outOfBounds || w.hist !== 2) problems.push('Monday: interest and market move: ' + JSON.stringify(w));
      if (w.check.length) problems.push('money check after a week: ' + w.check.join('; '));
      if (r.winter.flour !== r.winter.want) problems.push('winter flour price: ' + JSON.stringify(r.winter));
      const d3 = r.days3;
      if (d3.bad.length) problems.push('the money check failed during 3 game days: ' + d3.bad.join(' | '));
      if (d3.checks < 600) problems.push('the money check ran only ' + d3.checks + ' times');
      for (const e of ['reachedTelegraph', 'orderPlaced', 'orderDelivered', 'creditDrawn', 'creditRepaid', 'contractAccepted']) if (!d3.events.includes(e)) problems.push('3 game days: no ' + e + ' event');
      if (r.broken.some(b => !b)) problems.push('the money check missed a broken ledger: ' + JSON.stringify(r.broken));
      if (r.det !== d3.hash) problems.push(`3 game days twice gave different hashes (${d3.hash} vs ${r.det})`);
      if (r.lot.join() !== '2500,6000,false,258500,0') problems.push('lot fees stub: ' + r.lot.join());
      if (r.old.cash !== 250000 || r.old.offers !== 5 || r.old.check.length || r.old.schema !== s.schema) problems.push('the v5 sample save does not load with the starting money: ' + JSON.stringify(r.old));
      console.log(`  order $${cost / 100} for 7 items came at 18:00 (${r.evening.cars.join('+')}); sold Outside ${so.paid} cents; 3 days: ${d3.checks} money checks, ${d3.ledger} ledger entries, cash ${d3.cash}, hash ${d3.hash}; broken ledgers caught ${r.broken.filter(Boolean).length}/7`);
      if (errors.length) problems.push('console errors (sim part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }

  // ---- Part 2: the page, portrait, by real touch ----
  {
    const { browser, page, errors, url } = await openGame('portrait', { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    const settle = () => page.waitForTimeout(150);
    try {
      await R(() => { const R = window.__railhead; const k0 = R.econ.econTelegraphKey(); R.state.player.x = k0.x - 3; R.state.player.z = k0.z + 0.8; R.step(1); });
      await page.waitForTimeout(1200); // the camera follows the player
      const sp = await R(() => { const R = window.__railhead, k = R.econ.econTelegraphKey(); return R.toScreen(k.wx, k.wz, k.wy); });
      await page.touchscreen.tap(sp.x, sp.y); await settle();
      const n = await R(() => { const R = window.__railhead; for (let i = 0; i < 400; i++) { if (R.econ.panel.open) return i; R.step(1); } return -1; });
      await settle();
      if (n < 0 || !(await page.isVisible('#telPanel'))) problems.push('tapping the depot\'s bay window did not walk to the telegraph key and open the panel');
      const near = await R(() => { const R = window.__railhead, k = R.econ.econTelegraphKey(), P = R.state.player; return Math.hypot(P.x - k.x, P.z - k.z); });
      if (near > 1.5) problems.push(`the player stopped ${near.toFixed(2)}u from the telegraph key`);
      const cashBefore = await page.textContent('#cash');
      for (let i = 0; i < 3; i++) { await page.locator('#telBody button[data-act="inc"][data-c="flour"]').tap(); await settle(); }
      const draftText = await page.textContent('#telBody .row');
      if (!/3 items, \$12\.00/.test(draftText)) problems.push('the order line should say 3 items, $12.00: ' + draftText);
      await page.waitForTimeout(800);
      await page.screenshot({ path: screenshotPath('economy-telegraph-order-portrait') });
      // Buttons at least 48 px.
      const small = await R(() => [...document.querySelectorAll('#telPanel button')].filter(b => b.offsetParent && (b.offsetHeight < 48 || b.offsetWidth < 48)).map(b => b.textContent));
      if (small.length) problems.push('telegraph panel buttons under 48 px: ' + small.join(', '));
      await page.locator('#telSend').tap(); await settle();
      const after = await R(() => ({ cash: window.__railhead.state.econ.cash, orders: window.__railhead.state.econ.orders.length, text: document.getElementById('cash').textContent }));
      await R(() => window.__railhead.step(1)); await settle();
      const cashText = await page.textContent('#cash');
      if (cashBefore !== '$2,500.00' || cashText !== '$2,488.00' || after.orders !== 1) problems.push(`Send order: cash on screen ${cashBefore} -> ${cashText} (want $2,488.00), orders ${after.orders}`);
      // Contracts: accept the first offer by touch.
      await page.locator('#telTabs button[data-tab="contracts"]').tap(); await settle();
      await page.screenshot({ path: screenshotPath('economy-telegraph-contracts-portrait') });
      await page.locator('#telBody button[data-act="accept"][data-id="0"]').tap(); await settle();
      const k0 = await R(() => window.__railhead.state.econ.contracts[0].status);
      if (k0 !== 'ACTIVE') problems.push('Accept by touch did not accept the offer: ' + k0);
      await settle();
      const orderFor = await page.locator('#telBody button[data-act="orderFor"][data-id="0"]').count();
      if (!orderFor) problems.push('an accepted contract shows no button to order its goods');
      await page.locator('#telTabs button[data-tab="ledger"]').tap(); await settle();
      const ledgerRows = await page.locator('#telBody .row .money').count();
      if (ledgerRows !== 1) problems.push(`the ledger tab should list the 1 entry, lists ${ledgerRows}`);
      await page.locator('#telBody button[data-act="borrow"]').tap(); await settle();
      const loan = await R(() => window.__railhead.state.econ.loan);
      if (loan !== 50000) problems.push('Borrow $500 by touch: loan ' + loan);
      await page.waitForTimeout(300);
      await page.screenshot({ path: screenshotPath('economy-telegraph-ledger-portrait') });
      // The cash readout does not cover a button.
      const overlap = await R(() => {
        const c = document.getElementById('cash').getBoundingClientRect(), out = [];
        for (const b of document.querySelectorAll('button')) { if (!b.offsetParent) continue; const q = b.getBoundingClientRect(); if (c.left < q.right && c.right > q.left && c.top < q.bottom && c.bottom > q.top) out.push(b.textContent || b.id); }
        return { out, w: c.width, h: c.height, top: c.top };
      });
      if (overlap.out.length) problems.push('the cash display overlaps buttons: ' + overlap.out.join(', '));
      // Walking away closes the panel.
      await R(() => window.__railhead.send({ t: 'walkTo', x: -1000, z: 1200 }));
      await R(() => window.__railhead.step(40)); await settle();
      if (await page.isVisible('#telPanel')) problems.push('the telegraph panel stayed open after walking away');
      await page.waitForTimeout(800);
      await page.screenshot({ path: screenshotPath('economy-cash-portrait') });
      const dc = await R(() => window.__railhead.drawCalls);
      // The Overland brings the order at 18:00.
      await R(() => { const R = window.__railhead; while (R.state.time < 14 * 3600) R.step(1); });
      const brought = await R(() => { const R = window.__railhead, cut = R.interchange.interchangeCut(R.state); return cut.consist.map(c => R.cargo.itemsAt(R.state, { kind: 'CAR', stockId: c.id }).map(id => R.state.items.waybill[id].commodity)).flat(); });
      if (brought.join() !== 'flour,flour,flour') problems.push('the Overland did not bring the 3 flour ordered by touch: ' + brought.join());
      // Export and import, then a real reload.
      const ei = await R(() => { const R = window.__railhead, json = R.exportSave(), a = R.hash(); R.step(50); const b = R.hash(); R.importSave(json); const c = R.hash(); R.step(50); return { a, b, c, d: R.hash(), cash: R.state.econ.cash, check: R.econ.econCheckMoney(R.state) }; });
      if (ei.a !== ei.c || ei.b !== ei.d || ei.check.length) problems.push('export and import did not keep the economy: ' + JSON.stringify(ei));
      const before = await R(async () => { const R = window.__railhead; await R.saveGame(); return { h: R.hash(), cash: R.state.econ.cash, led: R.state.econ.ledger.length }; });
      await page.reload(); await waitReady(page);
      const re = await R(() => ({ h: window.__railhead.hash(), cash: window.__railhead.state.econ.cash, led: window.__railhead.state.econ.ledger.length, text: document.getElementById('cash').textContent }));
      if (re.h !== before.h || re.cash !== before.cash || re.led !== before.led) problems.push(`a real reload changed the economy (${JSON.stringify(before)} vs ${JSON.stringify(re)})`);
      console.log(`  portrait: telegraph key reached in ${n} ticks; cash ${cashBefore} -> ${cashText}; cash display ${Math.round(overlap.w)}x${Math.round(overlap.h)} px; after reload ${re.text}; draw calls ${dc}`);
      if (dc >= 100) problems.push(`draw calls ${dc} (limit 100)`);
      if (errors.length) problems.push('console errors (page part): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }

  // ---- Part 3: landscape ----
  {
    const { browser, page, errors } = await openGame('landscape', { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    try {
      await R(() => { const R = window.__railhead; const k0 = R.econ.econTelegraphKey(); R.state.player.x = k0.x - 3; R.state.player.z = k0.z + 0.8; R.send({ t: 'useTelegraph' }); for (let i = 0; i < 300 && !R.econ.panel.open; i++) R.step(1); });
      await page.waitForTimeout(1200);
      if (!(await page.isVisible('#telPanel'))) problems.push('landscape: the telegraph panel did not open');
      await page.locator('#telTabs button[data-tab="contracts"]').tap(); await page.waitForTimeout(300);
      await page.screenshot({ path: screenshotPath('economy-telegraph-landscape') });
      const lay = await R(() => {
        const q = id => document.getElementById(id).getBoundingClientRect(), p = q('telPanel'), c = q('cash'), out = [];
        for (const id of ['buildBtn', 'speeds', 'clock', 'bottomleft']) { const b = q(id); if (p.left < b.right && p.right > b.left && p.top < b.bottom && p.bottom > b.top) out.push('panel/' + id); if (id !== 'clock' && c.left < b.right && c.right > b.left && c.top < b.bottom && c.bottom > b.top) out.push('cash/' + id); }
        return { out, inside: p.top >= 0 && p.bottom <= innerHeight && p.right <= innerWidth };
      });
      if (lay.out.length || !lay.inside) problems.push('landscape layout: ' + JSON.stringify(lay));
      await R(() => { document.getElementById('telClose').click(); });
      await page.waitForTimeout(500);
      await page.screenshot({ path: screenshotPath('economy-cash-landscape') });
      const dc = await R(() => window.__railhead.drawCalls);
      console.log(`  landscape: draw calls ${dc}`);
      if (dc >= 100) problems.push(`landscape draw calls ${dc} (limit 100)`);
      if (errors.length) problems.push('console errors (landscape): ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
