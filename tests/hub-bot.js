// A careful player for the hub world (D24, the station rework), for tests/check-hub-day.js. The successor of the M1
// bot (tests/m1-bot.js) for the new flow: the railroad's trains come in from both ends of the line, the player sets the
// switches, checks the tickets aboard each passenger train, unloads each freight train at the cargo track, sorts the
// goods in the freight shed and carries them to the business doors, and waves every train off.
//
// It plays through the game's own commands only, the ones the page's taps and buttons send: walkTo, useSwitch,
// checkTickets, rrWaveOff, carryPick, carryPut, carryTool, contractAccept, econOrder, tgAnswer. It never edits the state
// and uses no debug tools. It reads the state as a player reads the screen and the work board (rrSwitchNeeds is the
// work board's switch list; pxCarStatus the Check tickets button's count; cgCarStatus the car panel), and each tick's
// events as a player reads the messages.
//
// It walks like a player on a phone (no running) and sends at most one command a tick, only while the player is free
// (standing, no action in hand), except that it breaks off a walk or a ticket check for a switch a train needs now.
//
// What it does, most important first:
//   1. Switches: the first move on each switch (the work board's list, soonest first) wants it set, it is not, and the
//      train gets there within 12 game minutes, or a train waits at it: walk to the stand and throw it.
//   2. Send off: a train standing at its track whose time has come, with its work done (TR's ready, every car's tickets
//      checked; for a freight train its goods for the Hub off), or 6 minutes past its time with tickets still coming
//      up: walk to its engine and wave it off. It goes to the engine a few minutes before.
//   3. Tickets: the car of a standing passenger train with the most travellers unchecked (the nearest on a tie).
//      The hand truck is left at its spot first (tickets are not checked pushing one).
//   4. Freight: goods for the Hub off a standing freight train: small goods into the freight shed's bays (by tag),
//      long bundles onto the cargo dock beside the car, so the train can leave.
//   5. Delivering: goods for a business from the bays, the dock or the yard to its door (the hand truck for two or
//      more small ones), but not with a passenger train standing or due within 35 minutes (checking needs free hands).
//   6. The work board, each morning and when offers are pinned: accept the Hub businesses' offers it can fill before
//      they are due and order what open contracts still need (they ride the next freight train). No order is sent
//      that could not arrive at least 10 game hours before the end of the run (mem.endTime), so everything ordered is
//      delivered.
//   7. Otherwise: wait at the platform's west end, between the inner throat and the platform.
//
// Use: const bot = hubBotFactory(window.__railhead, mem) in the page (HUB_BOT_SRC is this function's source);
// each tick: const cmds = bot.decide(S); const ev = R.simTick(S, cmds); bot.observe(S, ev).
// bot.mem is plain data (JSON): copy it with a save to carry on after a reload exactly as before.

function hubBotFactory(R, mem0) {
  const mem = mem0 || {
    endTime: null, boardDay: -1, skip: {}, refusals: {}, last: null, notes: [], origin: {},
    stats: { cmds: 0, switches: 0, checks: 0, waves: 0, picks: 0, puts: 0, doors: 0, orders: 0, accepted: 0, tool: 0 },
  };
  const H = 3600, M = 60;
  const cm = v => Math.round(v * 100);
  const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const I = S => S.items;
  const held = S => R.carry.carryHeld(S);
  const pushing = S => S.player.tool !== null && S.player.tool !== undefined;
  const skipped = (S, k) => mem.skip[k] !== undefined && mem.skip[k] > S.tick;
  const skip = (S, k, ticks) => { mem.skip[k] = S.tick + (ticks || 60); };
  const send = (S, c, why) => { mem.last = { c, why, tick: S.tick }; mem.stats.cmds++; return [c]; };
  const tag = (S, id) => R.cargo.itemTag(I(S).waybill[id]);
  const isLong = (S, id) => R.cargo.itemType(S, id) === 'longBundle';
  const bizOf = (S, id) => { const k = I(S).waybill[id].consignee; return k && k.kind === 'BUSINESS' ? k.id : null; };
  const runs = S => S.rr.runs;
  const trOf = (S, run) => (run.slot === null || run.slot === undefined ? null : S.trains[run.slot]);
  const standing = S => runs(S).filter(r => r.ph === 'stand' && trOf(S, r));
  let G = null;
  function places(S) {
    if (G) return G;
    const H2 = R.world.HUBW, B = R.cargo.BLD_BAYS.freightshed, dock = R.world.buildingFootprints().find(f => f.id === 'cargodock');
    // Spots on the cargo dock for long bundles taken off a freight car: a row along its track edge, west to east.
    const dockSpots = [];
    for (let row = 0; row < 3; row++) for (let x = dock.x - dock.w / 2 + 0.6; x < dock.x + dock.w / 2 - 0.6; x += 0.8) dockSpots.push([x, dock.z + dock.d / 2 - 0.7 - row * 0.8]);
    G = { bays: B.bays, dockSpots, wait: [H2.SW.PW + 1.2, -3.6], wb: R.guide.econWorkBoardSpot() };
    return G;
  }
  // ---- Where things are ----
  function carOf(S, stock) { for (const tr of S.trains) if (tr.consist.some(c => c.id === stock)) return tr; return null; }
  function spotOf(S, id) {
    const w = I(S).where[id];
    if (w.kind === 'GROUND') return [w.x / 100, w.z / 100];
    if (w.kind === 'BAY') { const b = G.bays[w.bay]; return [b.x, b.z]; }
    if (w.kind === 'CAR') { const d = R.interchange.carryCarDoor(S, w.stockId, S.player.x, S.player.z); return d ? [d.x, d.z] : null; }
    return null;
  }
  const bayCount = (S, bay) => R.cargo.itemsAt(S, { kind: 'BAY', buildingId: 'freightshed', bay }).length;
  function bayFor(S, id) {
    const t = tag(S, id), tags = S.bayTags.freightshed;
    for (let b = 0; b < tags.length; b++) if (tags[b] === t && bayCount(S, b) < 8) return b;
    for (let b = 0; b < tags.length; b++) if (tags[b] === 'ANY' && bayCount(S, b) < 8) return b;
    return -1;
  }
  // A free spot on the cargo dock, the nearest to the player (beside the car being unloaded).
  function freeDock(S) {
    const ground = R.cargo.itemsAt(S, { kind: 'GROUND' }).map(i => I(S).where[i]), P = S.player;
    let best = null;
    for (const [x, z] of G.dockSpots) {
      if (ground.some(w => d2(w.x / 100, w.z / 100, x, z) < 0.5)) continue;
      const d = d2(x, z, P.x, P.z);
      if (!best || d < best.d) best = { x: cm(x), z: cm(z), d };
    }
    return best && { x: best.x, z: best.z };
  }

  // Where an item should go next (a carryPut payload), or null: it is where it belongs for now. Off a freight car onto
  // the cargo dock beside it (quick, so the train can leave); small goods from the dock sorted into the freight shed's
  // bays by tag; from a bay (or a long bundle from the dock) to its business's door.
  function destOf(S, id) {
    const w = I(S).where[id], biz = bizOf(S, id), t = tag(S, id);
    if (w.kind === 'BUSINESS' || w.kind === 'STOCKPILE' || t === 'OUTSIDE') return null;
    const from = w.kind === 'CARRIED' ? mem.origin[id] : w.kind;
    if (from === 'CAR') { const f = freeDock(S); if (f) return f; const b = bayFor(S, id); return b >= 0 ? { b: 'freightshed', bay: b } : null; }
    if (from === 'GROUND' && !isLong(S, id)) { const b = bayFor(S, id); if (b >= 0) return { b: 'freightshed', bay: b }; }
    return biz !== null ? { biz } : null;
  }
  // ---- The railroad's trains ----
  // The first move not yet made on each switch, soonest first: those to throw (not set, the switch free).
  // A standing freight train's way out counts only from 15 minutes before its time and once its goods for the Hub are
  // off (it may stand long): until then the switches are set for the trains coming in.
  function switchTodo(S) {
    const first = {}, byId = {};
    for (const r of runs(S)) byId[r.id] = r;
    const leaving = r => r.ph !== 'stand' || r.kind === 'pax' || (S.time >= r.dep - 15 * M && R.rr.cgHubAboard(S, trOf(S, r)) === 0);
    for (const n of R.rr.rrSwitchNeeds(S)) if (!n.passed && first[n.sw] === undefined && !(n.move === 'out' && byId[n.run] && !leaving(byId[n.run]))) first[n.sw] = n;
    return Object.values(first).filter(n => !n.set && !R.switchLockReason(S, n.sw) && !skipped(S, 'sw:' + n.sw)).sort((a, b) => a.byTime - b.byTime);
  }
  function waitingAt(S) { for (const tr of S.trains) if (tr.owner === 'rr' && !tr.away && Number.isInteger(tr.swWait)) return tr.swWait; return null; }
  // lead: how soon the train gets there; a passenger train standing at the platform has its way out set at once (out:
  // true), so the walk to the engine comes after the tickets, not after a walk to a switch.
  function switchTask(S, lead, out) {
    const w = waitingAt(S), todo = switchTodo(S), byId = {};
    for (const r of runs(S)) byId[r.id] = r;
    const standOut = n => out && n.move === 'out' && byId[n.run] && byId[n.run].ph === 'stand' && byId[n.run].kind === 'pax';
    const n = todo.find(n => n.sw === w) || todo.find(n => n.byTime - S.time < lead || standOut(n));
    if (!n) return null;
    mem.stats.switches++;
    return send(S, { t: 'useSwitch', sw: n.sw }, `switch ${n.sw} ${n.want} for ${n.service}`);
  }
  function unchecked(S, tr) { return tr.consist.reduce((n, c) => { const p = R.px.pxCarStatus(S, c.id); return n + (p ? p.unchecked : 0); }, 0); }
  function hubAboard(S, tr) { return R.rr.cgHubAboard(S, tr); }
  // A standing run's work is done: TR's ready, and for a passenger train every ticket checked.
  function workDone(S, run, tr) { return !!run.ready && (run.kind === 'pax' ? unchecked(S, tr) === 0 : hubAboard(S, tr) === 0); }
  // The next train to send off now (or to walk to): { run, tr, go (wave now) } or null.
  function waveDue(S) {
    for (const run of standing(S).sort((a, b) => a.dep - b.dep)) {
      const tr = trOf(S, run);
      if (run.kind === 'freight' && hubAboard(S, tr)) continue;               // its goods for the Hub first
      const done = workDone(S, run, tr), late = S.time >= run.dep + 6 * M;
      if (S.time >= run.dep && (done || late)) return { run, tr, go: true };
      if (done && run.dep - S.time <= 4 * M) return { run, tr, go: false };   // walk up to the engine
    }
    return null;
  }
  function waveTask(S) {
    const w = waveDue(S);
    if (!w) return null;
    const near = R.rr.rrEngineDist(S, w.tr) <= R.rr.RR.REACH;
    if (w.go && near) { mem.stats.waves++; return send(S, { t: 'rrWaveOff', tr: w.tr.id }, 'send ' + w.run.name + ' off'); }
    if (near) return 'stay';
    if (pushing(S)) return held(S).length ? deliverTop(S) : leaveTool(S);
    const sp = R.rr.rrWaveSpot(S, w.tr.id);
    if (!sp || skipped(S, 'wave:' + w.run.id)) return null;
    mem.waveKey = 'wave:' + w.run.id;
    return send(S, { t: 'walkTo', x: cm(sp.x), z: cm(sp.z) }, 'to ' + w.run.name + '\'s engine');
  }
  function ticketTask(S, notCar) {
    let best = null;
    for (const run of standing(S)) {
      if (run.kind !== 'pax') continue;
      const tr = trOf(S, run);
      for (const c of tr.consist) {
        // The nearest car with travellers unchecked or walking up to it (the check waits for them), so the player
        // works along the train.
        const p = R.px.pxCarStatus(S, c.id);
        if (!p || !p.at || !(p.unchecked || p.boarding) || c.id === notCar || skipped(S, 'check:' + c.id)) continue;
        const d = d2(p.spot[0], p.spot[1], S.player.x, S.player.z);
        if (!best || d < best.d) best = { tr, c, n: p.unchecked, d };
      }
    }
    if (!best) return null;
    if (pushing(S)) return held(S).length ? deliverTop(S) : leaveTool(S);
    mem.checkKey = 'check:' + best.c.id; mem.stats.checks++;
    return send(S, { t: 'checkTickets', tr: best.tr.id, car: best.c.id }, `check ${best.n} tickets in car ${best.c.id}`);
  }
  // A freight train standing whose time to leave is within t seconds.
  function freightDue(S, t) { return standing(S).some(r => r.kind === 'freight' && r.dep - S.time < t); }
  // A passenger train standing, or due at the platform within t seconds.
  function paxSoon(S, t) { return runs(S).some(r => r.kind === 'pax' && (r.ph === 'stand' || ((r.ph === 'in' || r.ph === 'due') && r.arr - S.time < t))); }
  // ---- Carrying ----
  function leaveTool(S) { mem.stats.tool++; return send(S, { t: 'carryTool', tool: S.player.tool }, 'leave the hand truck'); }
  function pick(S, id, why) {
    mem.origin[id] = I(S).where[id].kind; mem.pickKey = 'pick:' + id; mem.stats.picks++;
    return send(S, { t: 'carryPick', id }, why);
  }
  function deliverTop(S) {
    const h = held(S), id = h[h.length - 1];
    let d = destOf(S, id);
    if (d && skipped(S, 'put:' + id + ':' + JSON.stringify(d))) d = null;
    if (!d) { const f = freeDock(S); d = f && d2(f.x / 100, f.z / 100, S.player.x, S.player.z) < 12 ? f : { x: cm(S.player.x + 0.6), z: cm(S.player.z - 0.6) }; mem.notes.push('put down: item ' + id + ' at ' + S.tick); }
    mem.putKey = 'put:' + id + ':' + JSON.stringify(d); mem.stats.puts++;
    return send(S, { t: 'carryPut', ...d }, 'put ' + I(S).waybill[id].commodity);
  }
  // Items to move: [{ id, d, sp, k }] (k: 'car' off a freight car, 'sort' into a bay, 'door' to a business).
  function work(S) {
    const out = [];
    for (let id = 0; id < I(S).next; id++) {
      if (!I(S).alive[id] || skipped(S, 'pick:' + id)) continue;
      const w = I(S).where[id];
      if (w.kind === 'CAR') { const tr = carOf(S, w.stockId); if (!tr || tr.owner !== 'rr' || R.interchange.carryCarWhy(S, w.stockId)) continue; }
      else if (w.kind !== 'BAY' && w.kind !== 'GROUND') continue;
      const d = destOf(S, id), sp = spotOf(S, id);
      if (!d || !sp) continue;
      out.push({ id, d, sp, k: w.kind === 'CAR' ? 'car' : d.b !== undefined ? 'sort' : 'door' });
    }
    return out;
  }
  const kindOf = from => (from === 'CAR' ? 'car' : from === 'GROUND' ? 'sort' : 'door');
  // noTruck: no hand truck round now (leaving it at its spot again takes a walk, and tickets are not checked pushing one).
  function freightTask(S, unloadOnly, noTruck) {
    const P = S.player, h = held(S), near = (a, b) => d2(a.sp[0], a.sp[1], P.x, P.z) - d2(b.sp[0], b.sp[1], P.x, P.z) || a.id - b.id;
    if (h.length) {
      if (pushing(S) && h.length < 3 && !unloadOnly) {   // more of the same kind close by, while the hand truck has room
        // (For the doors: only goods for the same business, so one round is one door.)
        const top = h[h.length - 1], k = kindOf(mem.origin[top]);
        const more = work(S).filter(it => it.k === k && !isLong(S, it.id) && d2(it.sp[0], it.sp[1], P.x, P.z) < 4 && (k !== 'door' || it.d.biz === bizOf(S, top))).sort(near);
        if (more.length) return pick(S, more[0].id, 'load the hand truck');
      }
      return deliverTop(S);
    }
    const all = work(S);
    const car = all.filter(it => it.k === 'car').sort(near);
    if (car.length) { if (pushing(S)) return leaveTool(S); return pick(S, car[0].id, 'unload the freight car onto the dock'); }
    if (unloadOnly) return pushing(S) ? leaveTool(S) : null;
    for (const k of ['sort', 'door']) {
      const list = all.filter(it => it.k === k), small = list.filter(it => !isLong(S, it.id)).sort(near), long = list.filter(it => isLong(S, it.id)).sort(near);
      if (!list.length) continue;
      if (pushing(S)) {
        const first = k === 'sort' ? small[0] : small.find(a => small.filter(b => b.d.biz === a.d.biz).length >= 2) || small[0];
        if (first && !noTruck) return pick(S, first.id, (k === 'sort' ? 'sort' : 'deliver') + ': onto the hand truck');
        return leaveTool(S);
      }
      // The hand truck for two or more small ones (for the doors: for one business).
      const two = k === 'sort' ? small.length >= 2 : small.some(a => small.filter(b => b.d.biz === a.d.biz).length >= 2);
      if (two && !noTruck) { mem.stats.tool++; return send(S, { t: 'carryTool', tool: 0 }, 'take the hand truck'); }
      const it = long[0] || small[0];
      return pick(S, it.id, (k === 'sort' ? 'sort ' : 'deliver ') + I(S).waybill[it.id].commodity);
    }
    return pushing(S) ? leaveTool(S) : null;
  }
  // ---- The work board: contracts and orders ----
  // A contract's goods on the map (not yet at the door) and still on order.
  function coming(S, k) {
    let n = 0;
    for (let i = 0; i < I(S).next; i++) if (I(S).alive[i] && I(S).waybill[i].contractId === k.id && I(S).where[i].kind !== 'BUSINESS') n++;
    return n + S.econ.orders.reduce((a, o) => a + o.lines.filter(l => l.contract === k.id).reduce((b, l) => b + l.n, 0), 0);
  }
  function boardTask(S) {
    const E = S.econ, due = R.econ.econNextVisit(S.time, 'hub');
    if (mem.endTime !== null && due > mem.endTime - 10 * H) return null;                     // too late to order: it would not be delivered
    const offer = E.contracts.find(k => k.status === 'OFFERED' && k.townId === 0 && k.due > due + 12 * H && !skipped(S, 'offer:' + k.id));
    const lines = [];
    for (const k of E.contracts) {
      if ((k.status !== 'ACTIVE' && k.status !== 'LATE') || k.townId !== 0) continue;
      const n = k.quantity - k.delivered - coming(S, k);
      if (n > 0) lines.push({ c: k.commodity, n, contract: k.id });
    }
    if (!offer && !lines.length) return null;
    if (paxSoon(S, 40 * M) || held(S).length || pushing(S)) return null;                     // later: the board is a walk away
    const wb = G.wb, P = S.player;
    if (d2(P.x, P.z, wb.x, wb.z) > 1.5) { if (skipped(S, 'board')) return null; mem.taskKey = 'board'; return send(S, { t: 'walkTo', x: cm(wb.x), z: cm(wb.z) }, 'to the work board'); }
    if (offer) { mem.offerKey = 'offer:' + offer.id; mem.stats.accepted++; return send(S, { t: 'contractAccept', id: offer.id }, 'accept ' + offer.commodity); }
    if (skipped(S, 'order')) return null;
    mem.stats.orders++; mem.taskKey = 'order';
    return send(S, { t: 'econOrder', lines }, 'order ' + lines.map(l => l.n + ' ' + l.c).join(', '));
  }
  // ---- One decision ----
  function decide(S) {
    places(S);
    const P = S.player, walking = P.mode === 'to', job = S.rr.tk && S.rr.tk.job;
    // The tutorial's welcome telegram: OK (a careful player reads it).
    if (S.tut && !S.tut.done && S.tut.step === 0 && !mem.welcomed) { mem.welcomed = true; return send(S, { t: 'tgAnswer', id: S.tut.tg, b: 0 }, 'OK the welcome'); }
    if (P.act) return [];                                                     // a throw or a pick in hand
    // Breaks off a walk or a ticket check only for a switch a train needs within 4 minutes (or waits at).
    if (walking && P.use && P.use.k === 'sw') return [];                     // on the way to a switch already
    if (walking) { const u = switchTask(S, 4 * M); return u || []; }
    if (job && job.on) {
      // Checking a car: only for a switch due now; or, while it only waits for travellers still walking up to it,
      // for a train to send off, a way out to set or another car to check.
      const u = switchTask(S, 4 * M); if (u) return u;
      const p = R.px.pxCarStatus(S, job.car);
      if (p && p.unchecked) return [];
      for (const f of [() => waveTask(S), () => switchTask(S, 12 * M, true), () => ticketTask(S, job.car)]) { const r = f(); if (r === 'stay') return []; if (r) return r; }
      return [];
    }
    // A switch a train waits at or reaches within 4 minutes; then a train to send off; tickets; the switches due
    // within 12 minutes.
    const tasks = [() => switchTask(S, 4 * M), () => waveTask(S), () => switchTask(S, 12 * M, true), () => ticketTask(S)];
    for (const f of tasks) { const r = f(); if (r === 'stay') return []; if (r) return r; }
    const sw = switchTask(S, 25 * M); if (sw) return sw;
    // Freight: unload whenever a freight train stands; deliver when no passenger train needs the player soon.
    const busy = paxSoon(S, 35 * M);
    const fr = freightTask(S, busy, paxSoon(S, 75 * M) || freightDue(S, 45 * M)); if (fr) return fr;
    if (!busy) { const b = boardTask(S); if (b) return b; }
    // Otherwise wait by the engine of the next train to send off, or between the inner throat and the platform.
    const next = standing(S).sort((a, b) => a.dep - b.dep)[0], sp = next && R.rr.rrWaveSpot(S, next.slot), at = sp ? [sp.x, sp.z] : G.wait;
    if (pushing(S)) return leaveTool(S);
    if (d2(P.x, P.z, at[0], at[1]) > (sp ? 1.5 : 3) && !skipped(S, 'idle')) { mem.taskKey = 'idle'; return send(S, { t: 'walkTo', x: cm(at[0]), z: cm(at[1]) }, sp ? 'wait by ' + next.name + '\'s engine' : 'wait by the platform'); }
    return [];
  }
  // Read the tick's messages: a refused command is not tried again for a while.
  function observe(S, ev) {
    for (const e of ev) {
      if (e.t === 'bizDelivered') mem.stats.doors++;
      if (/Refused$/.test(e.t) || e.t === 'blocked' || e.t === 'checkStopped' && e.why) {
        const why = ((mem.last ? mem.last.c.t + ' -> ' : '') + e.t + ': ' + (e.why || '')).replace(/[0-9]+/g, 'N');
        mem.refusals[why] = (mem.refusals[why] || 0) + 1;
        const c = mem.last && mem.last.c;
        if (c) {
          if (c.t === 'carryPick') skip(S, 'pick:' + c.id);
          else if (c.t === 'carryPut' && mem.putKey) skip(S, mem.putKey);
          else if (c.t === 'contractAccept') skip(S, 'offer:' + c.id, 100000);
          else if (c.t === 'useSwitch') skip(S, 'sw:' + c.sw, 8);
          else if (c.t === 'checkTickets' && mem.checkKey) skip(S, mem.checkKey, 8);
          else if (c.t === 'walkTo' && mem.waveKey) skip(S, mem.waveKey, 8);
          else if (mem.taskKey) skip(S, mem.taskKey, 30);
        }
      }
    }
  }
  return { mem, decide, observe };
}

module.exports = { hubBotFactory, HUB_BOT_SRC: hubBotFactory.toString() };
