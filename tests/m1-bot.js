// A "reasonable player" bot for the M1 acceptance check (tests/check-m1.js, design-doc 22 "M1. The whistle-stop").
//
// The bot plays the real start through the game's own commands only: the same commands the page's taps and
// buttons send (walkTo, carryPick, carryPut, carryTool, useCar, useTelegraph, econOrder, contractAccept, stakeJob,
// jobWork, staffWindow, uncouple, takeWater, fuelTender, ttAssign, setBayTag, boardCar, stepOff, useSwitch). It never edits the state and uses
// no debug tools. It reads the state the way a player reads the screen (where things are, what a train waits for,
// what a contract still needs), and it reads each tick's events the way a player reads the messages.
//
// It walks like a player on a phone (and rides No. 1 between the stations, boardCar and stepOff, since D13): tap to walk never runs (running exists only with Shift on a keyboard), so the
// bot never sets run. It sends at most one command a tick, and only when the player is free (standing, no action
// in progress), except that staffing the ticket window and working the track job are interrupted when something
// more important comes up.
//
// What it does, most important first:
//   1. The first morning: accept the starting contracts and order their goods, cordwood and the materials for a
//      20u siding by telegraph; stake the siding (a 20u extension of the platform track's dead end); put No. 1 on
//      the timetable (a tap on the train, then Timetable). (The freight shed has a Hub bay by default since D4, so
//      no bay is retagged.)
//   2. The Willow Ford train's station work: water at the tower (at the hub as the train comes in, since D4),
//      wood on the tender (cords from the piles at the platform's west end, where the tender stands between runs, and
//      beside the water tower; since D13 two or more cords go on the handcart, up to 6, and onto the tender cord by
//      cord from it; a single cord, or one on the platform, by hand), goods for Willow Ford loaded into No. 1's boxcar at the hub, the run-around
//      at Willow Ford (uncouple the engine, water), unloading there and carrying the goods to the store's door.
//      Since D13 it rides No. 1: it boards the combine shortly before each departure (12 minutes at the hub, 20 at
//      Willow Ford, where until D7 the train left from the water tower's spout) and steps off once the train stands at the
//      other station (at the hub that is under the spout, where it takes water). It walks only after missing a train.
//   3. Freight at the hub: unload the Overland's set-out cars into the freight shed's bays (hand truck for crates,
//      sacks and kegs; long bundles by hand, cordwood on the handcart), then deliver from the bays to the business
//      doors; cordwood to the tender or the pile; track materials to the job's stakes.
//   4. Every morning at the telegraph: accept the towns' offers it can fill and order what open contracts still
//      need, plus cordwood: when fewer than 12 cords are at hand or coming, enough for 16.
//   2b. Switches (D20, manual): throw the switches the timetable needs (ttSwitchNeeds, the work board's list) at the
//      station it is at, and any switch No. 1 waits at (switchTask).
//   5. Otherwise: staff the hub's ticket window while travellers queue (06:00 to 21:00), else work the track job.
//      (Not Willow Ford's since D13: it is unstaffed, and its travellers pay the fare on arrival.)
//
// A new game has 8 cords at the hub's wood stage (D13), so day 1's afternoon train runs like every other (until D13
// the bot took No. 1 off the timetable for it, as no wood came before the 18:00 Overland).
//
// Use: const bot = botFactory(window.__railhead, mem) in the page (BOT_SRC is this function's source);
// each tick: const cmds = bot.decide(S); const ev = R.simTick(S, cmds); bot.observe(S, ev).
// bot.mem is plain data (JSON): copy it with a save to carry on after a reload exactly as before.

function botFactory(R, mem0) {
  const mem = mem0 || {
    setup: 0, telDay: -1, skip: {}, refusals: {}, last: null, notes: [],
    stats: { cmds: 0, picks: 0, puts: 0, doors: 0, fuel: 0, water: 0, uncouple: 0, tickets: 0, jobTicks: 0 },
  };
  const H = 3600, M = 60;
  const SC = R.CFG.SCALE;   // D15: places and distances in the world are x SC; people and items keep their size
  const sodOf = S => (S.time + 18000) % 86400, dayOf = S => Math.floor((S.time + 18000) / 86400);
  const I = S => S.items;
  const cm = v => Math.round(v * 100);
  const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const isLong = (S, id) => R.cargo.itemType(S, id) === 'longBundle';
  const held = S => R.carry.carryHeld(S);
  const no1 = S => S.trains[0];
  const runOf = S => R.tt.ttRunOf(S, 0);
  const svcStop = (S, run) => S.tt.services[run.svc].stops[run.i];
  const atHub = S => S.player.x < 100 * SC, atWF = S => S.player.x > 150 * SC;
  const skipped = (S, k) => mem.skip[k] !== undefined && mem.skip[k] > S.tick;
  const skip = (S, k, ticks) => { mem.skip[k] = S.tick + (ticks || 150); };
  let G = null; // fixed places, worked out once from the world (what a player sees on the map)
  function places(S) {
    if (G) return G;
    const hub = R.tt.ttStation(S, 'hub'), wf = R.tt.ttStation(S, 'willow'), B = R.cargo.BLD_BAYS.freightshed;
    const W = R.world.walk, grid = R.world.walkGrid(S.track);
    const open = (x, z) => { const cx = Math.floor((x - W.X0) / W.CELL), cz = Math.floor((z - W.Z0) / W.CELL); return cx >= 0 && cz >= 0 && cx < W.N && cz < W.NZ && grid.cost[cz * W.N + cx] > 0; };
    // Two cord piles: at the platform's west end, beside where the tender stands when a run ends (the train takes
    // water on the way in and leaves from the platform), and on open ground just west of the water tower, near the
    // spout (for wood wanted there: a run that still moves to the spout before it leaves).
    const piles = [[], []];
    for (let i = 0; i < 5; i++) { const x = hub.track.x0 - 1.0 * SC + i * 0.7, z = hub.track.z0 - 2.9 * SC; if (open(x, z)) piles[0].push([x, z]); }
    for (const dz of [-2.8 * SC, -2.8 * SC - 0.7]) for (let i = 0; i < 3; i++) { const x = hub.water.x - 4.3 * SC + i * 0.7, z = hub.track.z0 + dz; if (open(x, z)) piles[1].push([x, z]); }
    const pile = piles[0].concat(piles[1]);
    // Where to wait for a departure: open ground west of the water tower, a few steps from its spout.
    const stand = [[hub.water.x - 2.2 * SC, hub.track.z0 - 4.0 * SC], [hub.water.x - 3.0 * SC, hub.track.z0 - 4.0 * SC], [hub.water.x - 2.2 * SC, hub.track.z0 - 4.8 * SC]].find(([x, z]) => open(x, z)) || [hub.water.sx, hub.water.sz];
    // The dead end of the platform track (where the siding is staked) and the job's spot for materials.
    const T = S.track, ix = R.tt.trackIndex(T);
    const end = T.nodes.filter(N => ix.nodeEdges[N.id] && ix.nodeEdges[N.id].length === 1 && N.x > -50 * SC && N.x < 0 && Math.abs(N.z - hub.track.z0) < 0.2)[0];
    G = { hub, wf, bays: B.bays, pile, piles, stand, end, open,
      wfDrop: [wf.track.x0 + 2 * SC, wf.track.z0 - 4.2 * SC], wfWait: [R.pax.paxStation('willow', T).line.x, R.pax.paxStation('willow', T).line.z],
      hubWait: [R.pax.paxStation('hub', T).line.x, R.pax.paxStation('hub', T).line.z] };
    return G;
  }
  // ---- Reading the state ----
  function alive(S, fn) { const out = []; for (let i = 0; i < I(S).next; i++) if (I(S).alive[i] && fn(i, I(S).where[i], I(S).waybill[i])) out.push(i); return out; }
  function carOf(S, stockId) { for (const tr of S.trains) { const i = tr.consist.findIndex(c => c.id === stockId); if (i >= 0) return tr; } return null; }
  // A car of our own train (No. 1's stock ids 0 to 2 never change, also while split for the run-around).
  function carOfOurs(S, stockId) { return [0, 1, 2].includes(stockId) || (S.trains[0].consist.some(c => c.id === stockId)); }
  // Our train standing still at the hub (on the platform track, from the platform to the water tower).
  function no1AtHub(S) {
    const tr = no1(S);
    if (tr.v > 0 || tr.mode === 'route' || tr.cw > 0) return false;
    const ps = R.trainPoses(S.track, tr);
    return ps.length > 0 && ps.every(p => p.x > -12 * SC && p.x < 34 * SC && Math.abs(p.z - G.hub.track.z0) < 0.6 * SC);
  }
  function no1AtWF(S) {
    const tr = no1(S); if (tr.v > 0 || tr.mode === 'route') return false;
    const ps = R.trainPoses(S.track, tr); return ps.length > 0 && ps[0].x > 180 * SC;
  }
  const fuelRoom = S => { const L = no1(S).consist.find(c => c.k === 'loco'); return L ? L.fuel <= R.tt.FUEL_CAP - R.CFG.CORD_U : false; };
  const tag = (S, id) => R.cargo.itemTag(I(S).waybill[id]);
  const bizOf = (S, id) => { const k = I(S).waybill[id].consignee; return k && k.kind === 'BUSINESS' ? k.id : null; };
  const bayCount = (S, bay) => R.cargo.itemsAt(S, { kind: 'BAY', buildingId: 'freightshed', bay }).length;
  const onPile = (S, w) => w.kind === 'GROUND' && G.pile.some(([x, z]) => d2(w.x / 100, w.z / 100, x, z) < 0.3);
  const PILE_KEEP = [2, 3];   // cords kept on the platform pile and on the wood stage pile
  const onPileK = (w, k) => w.kind === 'GROUND' && G.piles[k].some(([x, z]) => d2(w.x / 100, w.z / 100, x, z) < 0.3);
  const pileCount = (S, k) => alive(S, (i, w, wb) => wb.commodity === 'cordwood' && (k === undefined ? onPile(S, w) : onPileK(w, k))).length;
  const cordsAtHub = S => alive(S, (i, w, wb) => wb.commodity === 'cordwood' && (w.kind !== 'CAR' || !carOfOurs(S, w.stockId)) && (w.kind !== 'GROUND' || w.x < 10000 * SC));
  const job = S => S.jobs.list[0] || null;
  // The handcart (D13: cordwood may ride it, up to 6): its tool index, whether the player pushes it, and whether a
  // spot is one it cannot reach (the platform and the dock).
  const CART_CAP = 6;
  const cartIdx = S => S.tools.findIndex(t => t.k === 'cart');
  const pushing = (S, k) => S.player.tool !== null && S.tools[S.player.tool].k === k;
  const noCart = (x, z) => R.carry.carryNoCartAt(x, z);
  // Room for cords right now: in the tender (No. 1 standing at the hub) and on the piles.
  function cordRoom(S) {
    const L = no1(S).consist.find(c => c.k === 'loco');
    const tender = no1AtHub(S) && L ? Math.floor((R.tt.FUEL_CAP - L.fuel) / R.CFG.CORD_U + 1e-9) : 0;
    return tender + Math.max(0, PILE_KEEP[0] - pileCount(S, 0)) + Math.max(0, PILE_KEEP[1] - pileCount(S, 1));
  }
  // Where an item is, for walking (null when not on the map or not reachable).
  function spotOf(S, id) {
    const w = I(S).where[id];
    if (w.kind === 'GROUND') return [w.x / 100, w.z / 100];
    if (w.kind === 'BAY') { const b = G.bays[w.bay]; return [b.x, b.z]; }
    if (w.kind === 'CAR') { const tr = carOf(S, w.stockId); if (!tr) return null; const d = R.interchange.carryCarDoor(S, w.stockId, S.player.x, S.player.z); return d ? [d.x, d.z] : null; }
    if (w.kind === 'CARRIED') return [S.player.x, S.player.z];
    return null;
  }
  // ---- Where each item should go next (null: it is where it belongs) ----
  function jobDrop(S, mat) {
    const j = job(S); if (!j) return null;
    const need = R.jobs.jobNeeds(S, j) || {};
    if (!(need[mat] > 0)) return null;
    const k = Math.min(j.stakes.length - 1, 1 + (alive(S, (i, w) => w.kind === 'STOCKPILE').length % 3));
    const [x, z] = j.stakes[k];
    return { x: Math.round(x), z: Math.round(z - 150 * SC) }; // 1.5u (x SC) north of a stake (away from the tracks)
  }
  function freePile(S) {
    const used = alive(S, (i, w, wb) => w.kind === 'GROUND' && wb.commodity === 'cordwood');
    for (let k = 0; k < 2; k++) {
      if (pileCount(S, k) >= PILE_KEEP[k]) continue;
      for (const [x, z] of G.piles[k]) if (!(pushing(S, 'cart') && noCart(x, z)) && !used.some(id => d2(I(S).where[id].x / 100, I(S).where[id].z / 100, x, z) < 0.3)) return { x: cm(x), z: cm(z) };
    }
    return null;
  }
  function bayFor(S, id) {
    const t = tag(S, id), tags = S.bayTags.freightshed;
    for (let b = 0; b < tags.length; b++) if (tags[b] === t && bayCount(S, b) < 8) return b;
    for (let b = 0; b < tags.length; b++) if (tags[b] === 'ANY' && bayCount(S, b) < 8) return b;
    return -1;
  }
  // dest: a carryPut payload, or a tender to fuel ({ fuel: true }).
  function destOf(S, id) {
    const w = I(S).where[id], wb = I(S).waybill[id], t = tag(S, id), biz = bizOf(S, id), carried = w.kind === 'CARRIED';
    if (w.kind === 'BUSINESS' || w.kind === 'STOCKPILE') return null;
    if (wb.commodity === 'cordwood') {
      if (no1AtHub(S) && fuelRoom(S)) return { fuel: true };
      if (w.kind === 'GROUND' && onPile(S, w)) return null;
      // Keep a few cords on the pile for the afternoon train; the rest wait in their flatcar until wanted.
      return freePile(S);
    }
    if (t === 'RAILHEAD') return jobDrop(S, wb.commodity);
    if (t === 'WILLOW') {
      // At Willow Ford: goods for the store go to its door, but while more goods for Willow Ford are still aboard
      // No. 1 (the train waits for them: station work) they are put down beside the car first, the door later.
      const drop = () => { const n = alive(S, (i, w2) => w2.kind === 'GROUND' && w2.x > 15000 * SC).length, P = S.player; return { x: cm(P.x + 0.5 * (n % 4) - 0.75), z: cm(P.z) }; };
      const aboard = () => alive(S, (i, w2) => w2.kind === 'CAR' && carOfOurs(S, w2.stockId) && tag(S, i) === 'WILLOW').length;
      if (atWF(S) || (w.kind === 'GROUND' && w.x > 15000 * SC)) return biz === 1 ? (carried && !mem.fromGround && aboard() ? drop() : { biz: 1 }) : (w.kind === 'GROUND' ? null : drop());
      if (w.kind === 'CAR' && w.stockId === 2) return null;      // aboard No. 1, on its way
      if (no1AtHub(S)) return { stock: 2 };
      if (w.kind === 'BAY') return null;
      const b = bayFor(S, id); return b >= 0 ? { b: 'freightshed', bay: b } : null;
    }
    if (biz !== null) {
      // Goods for a hub business: from a car into a bay (sorted), from a bay to the door. Long bundles go straight to the door.
      if (w.kind === 'BAY' || isLong(S, id) || carried && mem.fromBay && mem.fromBay[id]) return { biz };
      const b = bayFor(S, id); return b >= 0 ? { b: 'freightshed', bay: b } : { biz };
    }
    if (t === 'HUBWH') { if (w.kind === 'BAY') return null; const b = bayFor(S, id); return b >= 0 ? { b: 'freightshed', bay: b } : null; }
    return null;
  }
  // ---- Commands ----
  function send(S, c, why) { mem.last = { c, why, tick: S.tick }; mem.stats.cmds++; return [c]; }
  function putCmd(S, d) { return d.fuel ? { t: 'fuelTender', tr: 0 } : { t: 'carryPut', ...d }; }
  // Deliver the top carried item (or put it down here if it has nowhere to go).
  function deliverTop(S) {
    const h = held(S), id = h[h.length - 1];
    let d = destOf(S, id);
    if (d && skipped(S, 'put:' + id + ':' + JSON.stringify(d))) d = null;
    if (!d) { const P = S.player; d = { x: cm(P.x + 0.6), z: cm(P.z) }; mem.notes.push('put down where standing: item ' + id + ' at ' + S.tick); }
    mem.putKey = 'put:' + id + ':' + JSON.stringify(d);
    return send(S, putCmd(S, d), 'deliver ' + I(S).waybill[id].commodity);
  }
  // Take or leave the hand truck or the handcart so the next move uses the right carrier.
  // want: true or 'truck' (the hand truck), 'cart' (the handcart), false (by hand).
  function toolFor(S, want) {
    const P = S.player, has = P.tool !== null, k = want === true ? 'truck' : want || null;
    if (has && (!k || S.tools[P.tool].k !== k)) return send(S, { t: 'carryTool', tool: P.tool }, 'leave the ' + (S.tools[P.tool].k === 'truck' ? 'hand truck' : 'handcart'));
    if (k && !has) return k === 'cart' ? send(S, { t: 'carryTool', tool: cartIdx(S) }, 'take the handcart') : send(S, { t: 'carryTool', tool: 0 }, 'take the hand truck');
    return null;
  }
  function pick(S, id, why) { mem.pickKey = 'pick:' + id; mem.fromBay = mem.fromBay || {}; if (I(S).where[id].kind === 'BAY') mem.fromBay[id] = 1; else delete mem.fromBay[id]; mem.fromGround = I(S).where[id].kind === 'GROUND'; return send(S, { t: 'carryPick', id }, why); }
  // ---- The tasks ----
  // Items waiting to move at the hub, in the order the bot works them.
  function hubWork(S) {
    const out = [];
    for (let id = 0; id < I(S).next; id++) {
      if (!I(S).alive[id]) continue;
      const w = I(S).where[id];
      if (!(w.kind === 'CAR' || w.kind === 'BAY' || w.kind === 'GROUND')) continue;
      if (w.kind === 'CAR' && R.interchange.carryCarWhy(S, w.stockId)) continue;   // a moving car, or the Overland's crew at work
      if (w.kind === 'CAR' && w.stockId === 2 && !(no1AtHub(S) || no1AtWF(S))) continue;
      const sp = spotOf(S, id); if (!sp || sp[0] > 100 * SC) continue;
      if (skipped(S, 'pick:' + id)) continue;
      const d = destOf(S, id); if (!d) continue;
      out.push({ id, d, sp });
    }
    return out;
  }
  function rank(S, it) {
    const wb = I(S).waybill[it.id], w = I(S).where[it.id];
    if (it.d.stock === 2) return 0;                         // goods for Willow Ford onto the train
    if (it.d.fuel) return 1;                                // wood for the tender
    if (wb.commodity === 'cordwood') return 2;              // wood for the pile
    if (w.kind === 'CAR') return 3;                         // unload the set-out cars
    if (it.d.biz !== undefined) return 4;                   // deliver to the doors
    return 5;                                               // track materials and the rest
  }
  // One of No. 1's timetabled hub departures today is within t seconds (and not yet made).
  function depWithin(S, t) {
    const sod = sodOf(S), day = dayOf(S);
    return S.tt.services.some(v => v.train === 0 && v.last !== day && v.stops[0].dep !== null && v.stops[0].dep > sod && v.stops[0].dep - sod < t);
  }
  function freightTask(S, maxRank) {
    const P = S.player, h = held(S);
    if (h.length) {
      // With the handcart: more cords from close by, while there is somewhere for them (the tender or the piles).
      // (Since D20's slower walk, not with one of No. 1's hub departures less than 90 minutes off: putting each cord
      // away takes minutes, and the bot would miss the train.)
      if (pushing(S, 'cart') && h.length < CART_CAP && h.length < cordRoom(S) && !depWithin(S, 90 * M)) {
        const more = hubWork(S).filter(it => I(S).waybill[it.id].commodity === 'cordwood' && rank(S, it) <= 2 && !noCart(it.sp[0], it.sp[1]) && d2(it.sp[0], it.sp[1], P.x, P.z) < 8)
          .sort((a, b) => d2(a.sp[0], a.sp[1], P.x, P.z) - d2(b.sp[0], b.sp[1], P.x, P.z) || a.id - b.id);
        if (more.length) return pick(S, more[0].id, 'load the handcart with wood');
      }
      // With a hand truck that has room, take more from the same place for the same kind of destination.
      if (pushing(S, 'truck') && h.length < 3) {
        const top = h[h.length - 1], dk = JSON.stringify(Object.keys(destOf(S, top) || {}));
        const more = hubWork(S).filter(it => !isLong(S, it.id) && JSON.stringify(Object.keys(it.d)) === dk && d2(it.sp[0], it.sp[1], P.x, P.z) < 6 && rank(S, it) >= 3)
          .sort((a, b) => d2(a.sp[0], a.sp[1], P.x, P.z) - d2(b.sp[0], b.sp[1], P.x, P.z));
        if (more.length) return pick(S, more[0].id, 'load the hand truck');
      }
      return deliverTop(S);
    }
    const work = hubWork(S).filter(x => maxRank === undefined || rank(S, x) <= maxRank);
    if (!work.length) return P.tool !== null ? toolFor(S, false) : null;
    const near = (a, b) => d2(a.sp[0], a.sp[1], P.x, P.z) - d2(b.sp[0], b.sp[1], P.x, P.z) || a.id - b.id;
    const r = Math.min(...work.map(x => rank(S, x))), mine = work.filter(x => rank(S, x) === r);
    const long = mine.filter(x => isLong(S, x.id)).sort(near), small = mine.filter(x => !isLong(S, x.id)).sort(near);
    // Cords of wood (D13): two or more the handcart can reach, with room for two or more, go on the handcart, but it is
    // fetched from its spot (by the freight shed) only when no departure is near; once pushed it takes any cord it reaches.
    const cords = r <= 2 ? long.filter(x => I(S).waybill[x.id].commodity === 'cordwood' && !noCart(x.sp[0], x.sp[1])) : [];
    // (Since D20's slower walk, 1.8 pushing: a handcart round of wood takes up to two hours, so it is not started with
    // one of No. 1's hub departures less than two hours off: the bot would miss the train. Nor are more cords loaded
    // with one less than 90 minutes off: the bot puts away what it has and leaves the handcart.)
    if ((maxRank === undefined && cords.length >= 2 && cordRoom(S) >= 2 && !depWithin(S, 2 * H)) || (pushing(S, 'cart') && cords.length && !depWithin(S, 90 * M))) {
      if (!pushing(S, 'cart')) return toolFor(S, 'cart');
      return pick(S, cords[0].id, 'wood onto the handcart');
    }
    // The hand truck for crates, sacks and kegs going to the bays or the doors when there are two or more; long
    // bundles by hand (first, while the hands are free).
    const truck = small.length >= 2 && (r === 3 || r === 4);
    let it;
    if (pushing(S, 'cart')) return toolFor(S, false);
    if (P.tool !== null) { if (truck || (small.length && !long.length)) it = small[0]; else return toolFor(S, false); }
    else if (long.length) it = long[0];
    else if (truck) return toolFor(S, true);
    else it = small[0];
    return pick(S, it.id, ['load for Willow Ford', 'wood for the tender', 'wood to the pile', 'unload a set-out car', 'deliver', 'materials'][r]);
  }
  // At Willow Ford: unload goods for it from No. 1 and take them to the store.
  // (Since D20's slower walk: Willow Ford's store door is about 10 minutes' walk there and back from the platform, so
  // in the last 25 minutes before No. 1 leaves the bot only takes the goods off the train and puts them down on the
  // platform, then boards; it carries them to the door on its next visit. Before, it often missed the train and
  // walked back to the hub, about 2 hours, and the next run waited for it.)
  function wfHurry(S) { const run = runOf(S); return !!run && run.i === 1 && run.ph === 'at' && sodOf(S) >= svcStop(S, run).dep - 25 * M; }
  function wfWork(S) {
    const h = held(S), hurry = wfHurry(S);
    if (h.length && hurry && destOf(S, h[h.length - 1])) { const P = S.player, id = h[h.length - 1], d = { x: cm(P.x + 0.6), z: cm(P.z) };
      if (!skipped(S, 'put:' + id + ':' + JSON.stringify(d))) { mem.putKey = 'put:' + id + ':' + JSON.stringify(d); return send(S, putCmd(S, d), 'put ' + I(S).waybill[id].commodity + ' down on the platform: the train leaves soon'); } }
    if (h.length) return deliverTop(S);
    if (S.player.tool !== null) return null;
    const ids = alive(S, (i, w) => ((w.kind === 'CAR' && carOfOurs(S, w.stockId) && !R.interchange.carryCarWhy(S, w.stockId)) || (w.kind === 'GROUND' && w.x > 15000 * SC && !hurry)) && !skipped(S, 'pick:' + i))
      .filter(id => tag(S, id) === 'WILLOW' && destOf(S, id))
      .sort((a, b) => (I(S).where[a].kind === 'CAR' ? 0 : 1) - (I(S).where[b].kind === 'CAR' ? 0 : 1) || a - b);   // off the train first
    if (!ids.length) return null;
    return pick(S, ids[0], 'unload at Willow Ford');
  }
  // The timetable train's needs at the station the player is at.
  function trainTask(S) {
    const run = runOf(S), tr = no1(S);
    if (!run || !(run.ph === 'at' || /take water/.test(run.why || ''))) return null;   // water on the way in: 'go'
    const st = svcStop(S, run).st, here = st === 'hub' ? atHub(S) : atWF(S);
    if (!here) return null;
    const why = run.why || '';
    if (/uncouple the engine/.test(why) && tr.consist.length > 1 && !skipped(S, 'uncouple')) { mem.stats.uncouple++; mem.taskKey = 'uncouple'; return send(S, { t: 'uncouple', tr: 0, at: R.tt.ttEngineJoint(tr) }, 'uncouple for the run-around'); }
    const L = tr.consist.find(c => c.k === 'loco');
    // (Since D20's slower walk: while the uncoupled engine runs to Willow Ford's tower, go and meet it there, so the
    // water is taken as soon as it stands, rather than starting the walk when it calls.)
    if (st === 'willow' && /Running to the water tower/.test(why) && G.wf.water && !held(S).length && S.player.tool === null
      && d2(S.player.x, S.player.z, G.wf.water.sx, G.wf.water.sz) > 1.5 && !skipped(S, 'toTower')) { skip(S, 'toTower', 30); return send(S, { t: 'walkTo', x: cm(G.wf.water.sx), z: cm(G.wf.water.sz) }, 'meet the engine at the water tower'); }
    if (/take water/.test(why) && L && L.water < R.CFG.WATER_U - 0.1 && !skipped(S, 'water')) { if (S.player.tool !== null) return held(S).length ? deliverTop(S) : toolFor(S, false); mem.stats.water++; mem.taskKey = 'water'; return send(S, { t: 'takeWater' }, 'take water'); }
    return null;
  }
  // Switches (D20: they are manual): the timetable's list of switches to set (the work board's data, ttSwitchNeeds),
  // read like a player reads the board. At the station the bot is at: No. 1 waiting at a switch set against it (the
  // telegram), else the earliest switch still to set for one of No. 1's moves due within 3 game hours (only the first
  // move still to come for each switch counts: a later one may want it the other way). The switch must be free.
  function switchTask(S) {
    const here = st => st === 'hub' ? atHub(S) : st === 'willow' ? atWF(S) : false;
    const tr = no1(S), T = S.track;
    let sw = null;
    if (tr.swWait !== undefined) { const st = R.tt.swStation(S, T.switches[tr.swWait]); if (st && here(st.id)) sw = tr.swWait; }
    if (sw === null) {
      const seen = {};
      for (const n of R.tt.ttSwitchNeeds(S)) {
        if (n.passed || seen[n.sw]) continue;
        seen[n.sw] = 1;
        if (n.train === 0 && !n.set && here(n.station) && n.byTime - S.time < 3 * H) { sw = n.sw; break; }
      }
    }
    if (sw === null || skipped(S, 'sw:' + sw) || R.switchLockReason(S, sw)) return null;
    mem.taskKey = 'sw:' + sw; mem.stats.switches = (mem.stats.switches || 0) + 1;
    return send(S, { t: 'useSwitch', sw }, 'throw ' + R.tt.swName(sw) + ' for the timetable');
  }
  // Does the hub still owe the departing train anything (water, wood, goods for Willow Ford)?
  function hubOwes(S) {
    const run = runOf(S);
    if (run && run.ph === 'at' && run.i === 0 && run.why && !/its time/.test(run.why)) return true;
    if (run && run.i === 0 && run.ph === 'go') return true;               // the run has started: it moves to the spout
    if (no1AtHub(S) && fuelRoom(S) && cordsAtHub(S).length) return true;
    if (no1AtHub(S) && hubWork(S).some(it => it.d.stock === 2)) return true;
    return false;
  }
  function telegraphTask(S) {
    const day = dayOf(S), sod = sodOf(S);
    if (mem.telDay === day || !atHub(S)) return null;
    if (!(day === 0 || (sod >= 7 * H + 2 * M && sod < 11 * H + 30 * M))) return null;
    const k = R.econ.econTelegraphKey(), P = S.player;
    if (d2(P.x, P.z, k.x, k.z) > 2.5) { if (held(S).length) return deliverTop(S); return send(S, { t: 'useTelegraph' }, 'walk to the telegraph key'); }
    const E = S.econ;
    const offer = E.contracts.find(c => c.status === 'OFFERED' && c.due > S.time + 30 * H && !skipped(S, 'offer:' + c.id));
    if (offer) { mem.offerKey = 'offer:' + offer.id; return send(S, { t: 'contractAccept', id: offer.id }, 'accept ' + offer.commodity); }
    mem.telDay = day;
    const lines = [];
    for (const c of E.contracts) {
      if (c.status !== 'ACTIVE' && c.status !== 'LATE') continue;
      if (c.kind === 'STANDING' && c.due - S.time > 7 * 86400) continue;   // a weekly order, not the next weeks too
      const coming = alive(S, (i, w, wb) => wb.contractId === c.id && w.kind !== 'BUSINESS').length
        + E.orders.reduce((n, o) => n + o.lines.filter(l => l.contract === c.id).reduce((a, l) => a + l.n, 0), 0);
      const n = c.quantity - c.delivered - coming;
      if (n > 0) lines.push({ c: c.commodity, n, contract: c.id });
    }
    const cords = cordsAtHub(S).length + E.orders.reduce((n, o) => n + o.lines.filter(l => l.c === 'cordwood').reduce((a, l) => a + l.n, 0), 0);
    if (cords < 12) lines.push({ c: 'cordwood', n: 16 - cords });
    if (day === 0) lines.push({ c: 'ties', n: 4 }, { c: 'rails', n: 2 }, { c: 'spikes', n: 2 });
    if (!lines.length) return null;
    return send(S, { t: 'econOrder', lines }, 'order by telegraph');
  }
  // The first morning, in the order a player would do it.
  function setupTask(S) {
    if (mem.setup >= 4) return null;
    if (mem.setup === 0) mem.setup = 1;   // (before D4: retag the Outside bay for Hub goods; there is a Hub bay now)
    if (mem.setup === 1) {
      mem.setup = 2; const N = G.end;
      return send(S, { t: 'stakeJob', from: 'node', n: N.id, tx: cm(N.x - 20 * SC), tz: cm(N.z) }, 'stake a 20u (x SC) siding');
    }
    if (mem.setup === 2) { mem.setup = 3; return send(S, { t: 'useTrain', tr: 0 }, 'walk to No. 1'); }
    if (mem.setup === 3) { mem.setup = 4; return send(S, { t: 'ttAssign', tr: 0, on: true }, 'put No. 1 on the timetable'); }
    return null;
  }
  function tripTask(S) {
    const run = runOf(S), P = S.player;
    // To Willow Ford: the train has left the hub, or its hub work is done and it is due out soon.
    if (atHub(S) && run && run.i >= 1 && run.i <= 1) { if (held(S).length) return deliverTop(S); if (P.tool !== null) return toolFor(S, false); return send(S, { t: 'walkTo', x: cm(G.wfWait[0]), z: cm(G.wfWait[1]) }, 'walk to Willow Ford'); }
    // (Not before the morning's telegraph: since D4 the run starts 60 minutes early and can be ready before 07:02.)
    // Not too early either: Willow Ford is about 93 minutes' walk, the train takes about 85.
    // Since D13 it rides No. 1 instead: it boards the combine at the platform shortly before the departure (and keeps
    // selling tickets until then); the walk is only for a train it missed (the first rule above).
    if (atHub(S) && run && run.i === 0 && run.ph === 'at' && /its time/.test(run.why || '') && !hubOwes(S) && !held(S).length && P.tool === null && (mem.telDay === dayOf(S) || sodOf(S) >= 11 * H + 30 * M)
      && sodOf(S) >= svcStop(S, run).dep - boardLead(S) && !skipped(S, 'board')) return board(S, 'hub');
    // Where the combine's door was on Willow Ford's platform when the bot last stepped off there (the cars stand there
    // through the run-around); the line's spot until then.
    const wfDoor = () => mem.wfDoor || G.wfWait;
    // (Since D20, at the slower walk: the engine's run round its cars often ends only a minute before the departure,
    // too late to walk from the water tower to the combine; cars with no engine cannot be boarded. So while the engine
    // runs round, the bot waits on Willow Ford's platform by the line, beside the combine, as a player would.)
    const rounding = run && run.ra && !run.ra.done && run.ra.step >= 2 && run.ra.step <= 5 && !/take water|uncouple/.test(run.why || '');
    if (atWF(S) && run && run.i === 1 && run.ph === 'at' && rounding && !wfWork(S) && !held(S).length && P.tool === null
      && d2(P.x, P.z, wfDoor()[0], wfDoor()[1]) > 1 && !skipped(S, 'wfWait')) { skip(S, 'wfWait', 60); return send(S, { t: 'walkTo', x: cm(wfDoor()[0]), z: cm(wfDoor()[1]) }, 'wait on the platform by the combine\'s door for the run-around'); }
    // (Since D13 the bot rides No. 1 back: it boards once Willow Ford's work is done and the train waits for its time.)
    if (atWF(S) && run && run.i === 1 && run.ph === 'at' && /its time/.test(run.why || '') && !wfWork(S) && !held(S).length && P.tool === null
      && sodOf(S) >= svcStop(S, run).dep - 20 * M && !skipped(S, 'board')) return board(S, 'willow');
    // Back to the hub on foot once the train has left Willow Ford without the bot (or there is no train to meet) and the store has its goods.
    if (atWF(S) && (!run || run.i === 2 || (run.i === 0 && run.ph === 'go')) && !wfWork(S)) { if (held(S).length) return deliverTop(S); return send(S, { t: 'walkTo', x: cm(G.stand[0]), z: cm(G.stand[1]) }, 'walk back to the hub (to the water tower: the train takes water on the way in)'); }
    return null;
  }
  // How long before the departure to set off for the combine: 12 minutes, or more when it stands far off (at the water
  // tower, about 30u from the booth since the ticket booth and the station props): the walk at CFG.WALK u a minute (2.0 since D20) with a
  // quarter more for the way round things, and 3 minutes to spare.
  function boardLead(S) {
    const tr = no1(S), ps = R.trainPoses(S.track, tr), i = tr.consist.findIndex(c => c.id === 1), p = ps[i];
    const far = p ? Math.hypot(p.x - S.player.x, p.z - S.player.z) : 0;
    return Math.max(12, Math.ceil(far / R.CFG.WALK * 1.25) + 3) * M;
  }
  // No. 1's combine (stock 1) stands more than 8u from the water tower's stand (at the platform, not the spout).
  function combineFar(S) {
    const tr = no1(S), ps = R.trainPoses(S.track, tr), i = tr.consist.findIndex(c => c.id === 1), p = ps[i];
    return !!p && d2(p.x, p.z, G.stand[0], G.stand[1]) > 8;
  }
  // Board No. 1's combine (stock 1) at this station's platform, to ride to the other station (D13).
  function board(S, from) { mem.rideFrom = from; mem.taskKey = 'board'; return send(S, { t: 'boardCar', stock: 1 }, 'board No. 1 at ' + from); }
  // Aboard No. 1: step off once it stands at the other station (at Willow Ford's platform, or at the hub's water tower
  // on the way in, where the bot then takes water); otherwise sit and ride.
  function rideTask(S) {
    const tr = no1(S), standing = tr.v === 0 && (tr.mode === 'idle' || tr.mode === 'stop') && !(tr.cw > 0);
    const here = atHub(S) ? 'hub' : atWF(S) ? 'willow' : null;
    if (standing && here && here !== mem.rideFrom) { mem.stats.rides = (mem.stats.rides || 0) + 1; return send(S, { t: 'stepOff' }, 'step off at ' + here); }
    return [];
  }
  // A departure from the hub is near (or its run has started): the player should be at the station.
  function standby(S) {
    const run = runOf(S), sod = sodOf(S), day = dayOf(S);
    if (run && run.i === 0) return true;
    // The train coming in takes water on the way in (since D4): the bot answers its call from wherever it is at the
    // hub (trainTask), so it keeps selling tickets meanwhile; the train waits 10 minutes at the spout.
    if (run) return false;
    return S.tt.services.some(v => v.train === 0 && v.last !== day && sod >= v.stops[0].dep - 40 * M && sod < v.stops[0].dep + 6 * H);
  }
  const needsPile = S => pileCount(S, 0) < PILE_KEEP[0] || pileCount(S, 1) < PILE_KEEP[1];
  function queueAt(S, st) { return S.pax.list.filter(p => p.st === st && p.s === 'queue').length; }
  function windowTask(S, min) {
    const sod = sodOf(S), st = atHub(S) ? 'hub' : atWF(S) ? 'willow' : null;
    if (!st || sod < 6 * H || sod > 21 * H || queueAt(S, st) < min) return null;
    // Willow Ford is unstaffed (D13): its travellers board without a ticket and pay on arrival, so no need to sell there.
    if (R.pax.paxUnstaffed(S.track, st)) return null;
    if (S.pax.desk && S.pax.desk.st === st) return 'stay';
    if (held(S).length || S.player.tool !== null) return null;
    return send(S, { t: 'staffWindow', st }, 'staff the ticket window');
  }
  function jobTask(S) {
    const j = job(S);
    if (!j || !atHub(S) || skipped(S, 'job')) return null;
    if (S.player.use && S.player.use.k === 'job' || S.player.act && S.player.act.k === 'job') return 'stay';
    if (held(S).length) return deliverTop(S);
    if (S.player.tool !== null) return toolFor(S, false);
    const need = R.jobs.jobNeeds(S, j) || {};
    // Only start when the materials for the work are on site (a player reads the job's sign).
    if (Object.keys(need).some(k => need[k] > 0)) return null;
    mem.taskKey = 'job';
    return send(S, { t: 'jobWork', id: j.id }, 'work the siding');
  }
  // One decision: the most important thing to do now. Returns the commands for this tick ([] or one command).
  function decide(S) {
    places(S);
    const P = S.player;
    if (P.act && P.act.k !== 'job') return [];                       // an action in progress: wait for it
    if (P.ride) return rideTask(S);                                  // riding No. 1 (since D13)
    const walking = P.mode === 'to' || P.mode === 'dir';
    const working = (P.use && P.use.k === 'job') || (P.act && P.act.k === 'job');
    const staffed = !!S.pax.desk;
    if (walking && !working) return [];
    if ((working || staffed) && S.tick % 4) return [];             // look up from the work now and then
    // (Since D20's slower walk: once at the telegraph key, the bot finishes the morning's telegraph before going back
    // to the train's water or wood, as a player would; walking back and forth between the key and the water tower
    // (25u, 13 minutes each way) made it miss the 08:00 train.)
    const k = R.econ.econTelegraphKey();
    if (mem.telDay !== dayOf(S) && atHub(S) && !held(S).length && d2(P.x, P.z, k.x, k.z) <= 2.5) { const r = telegraphTask(S); if (r) return r; }
    const tasks = [setupTask, trainTask, switchTask, tripTask, telegraphTask];
    for (const f of tasks) { const r = f(S); if (r) return r; }
    if (atWF(S)) { const r = wfWork(S); if (r) return r; const w = windowTask(S, 1); return w === 'stay' || !w ? [] : w; }
    if (!atHub(S)) return [];
    if (standby(S)) {
      // A departure is near: stay by the water tower, doing only the train's own work (and tickets).
      // (Since D4 a run starts 60 minutes early and, with water taken on the way in, often only waits for its time
      // at the platform: then the bot keeps selling tickets.)
      const run = runOf(S), started = !!run, ready = started && run.i === 0 && run.ph === 'at' && /its time/.test(run.why || '');
      // (Since D20's slower walk: no wood to the pile, which can be 50u away (an hour there and back), in the last hour before boarding:
      // the bot would miss the train.)
      const soon = started && run.i === 0 && sodOf(S) >= svcStop(S, run).dep - boardLead(S) - 60 * M;
      const fr = freightTask(S, needsPile(S) && (!started || ready) && !soon ? 2 : 1); if (fr) return fr;
      if (!started || ready) { const win = windowTask(S, 1); if (win) return win === 'stay' ? [] : win; }
      else if (S.pax.desk) return send(S, { t: 'leaveWindow' }, 'leave the window: the train needs me');
      // (Since D20's slower walk: once the train is ready and waits for its time at the platform, the bot no longer
      // walks off to the water tower's stand, from where it often missed the train walking back to the combine; it
      // waits where it is (or on the platform, when it was working the siding) and boards in time, boardLead.)
      // (Also while it still waits for the bot's own last cord: the walk to the tower is not broken off, and from there
      // the combine is 20u back.)
      const atPlatform = started && run.i === 0 && run.ph === 'at' && !/water/.test(run.why || '');
      if ((ready || atPlatform) && combineFar(S)) return working ? send(S, { t: 'walkTo', x: cm(G.hubWait[0]), z: cm(G.hubWait[1]) }, 'wait on the platform for the train') : [];
      const [x, z] = G.stand;
      if (d2(P.x, P.z, x, z) > 3 && !working) return send(S, { t: 'walkTo', x: cm(x), z: cm(z) }, 'wait by the water tower for the train');
      if (working) return send(S, { t: 'walkTo', x: cm(x), z: cm(z) }, 'wait by the water tower for the train');
      return [];
    }
    const urgent = windowTask(S, 4); if (urgent) return urgent === 'stay' ? [] : urgent;
    const fr = freightTask(S); if (fr) return fr;
    const win = windowTask(S, 1); if (win) return win === 'stay' ? [] : win;
    const jb = jobTask(S); if (jb) return jb === 'stay' ? [] : jb;
    return [];
  }
  // Read the tick's messages: a refused command is not tried again for a while.
  function observe(S, ev) {
    for (const e of ev) {
      if (e.t === 'ticketSold') mem.stats.tickets++;
      if (e.t === 'rideOff' && e.st === 'willow') mem.wfDoor = [S.player.x, S.player.z];
      if (e.t === 'carryPicked') mem.stats.picks++;
      if (e.t === 'carryPut') mem.stats.puts++;
      if (e.t === 'bizDelivered') mem.stats.doors++;
      if (e.t === 'tenderFuelled') mem.stats.fuel++;
      if (/Refused$/.test(e.t) || e.t === 'blocked' || e.t === 'jobStopped' || e.t === 'noRoute' || e.t === 'notYourTrain') {
        const why = ((mem.last ? mem.last.c.t + ' -> ' : '') + e.t + ': ' + (e.why || '')).replace(/[0-9]+/g, 'N');
        mem.refusals[why] = (mem.refusals[why] || 0) + 1;
        const c = mem.last && mem.last.c;
        if (c) {
          if (c.t === 'carryPick') skip(S, 'pick:' + c.id);
          else if ((c.t === 'carryPut' || c.t === 'fuelTender') && mem.putKey) skip(S, mem.putKey);
          else if (c.t === 'contractAccept') skip(S, 'offer:' + c.id, 100000);
          else if (mem.taskKey && (c.t === 'uncouple' || c.t === 'takeWater' || c.t === 'jobWork' || c.t === 'boardCar' || c.t === 'useSwitch')) skip(S, mem.taskKey, 30);
        }
        if (e.t === 'jobStopped') skip(S, 'job', 75);
      }
    }
    if (S.player.act && S.player.act.k === 'job') mem.stats.jobTicks++;
  }
  return { mem, decide, observe };
}

module.exports = { botFactory, BOT_SRC: botFactory.toString() };
