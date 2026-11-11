// A careful player for the prototype (D25; plans/proto-tech.md section 9), for tests/check-proto-day.js.
//
// It plays through the game's own commands only, the ones the page's taps and buttons send: pdStart, walkTo,
// useSwitch, punch, rrWaveOff, carryPick, carryPut, carryTool, pgDeliver, pdEndDay, pdNextDay. It never edits the
// state and uses no debug tools. It reads the state as a player reads the screen: the schedule board (pdBoardRows),
// the switches each train needs (rrSwitchNeeds, the board's switch column and the Next job line), each coach's line
// (ppCarStatus, the Punch button's count), each freight car's goods (pgCarStatus, the car panel) and what is still to
// deliver (pgToDeliver), and each tick's events as a player reads the messages.
//
// It walks like a player on a phone (no running), sends at most one command a tick and only while the player is free
// (no action in hand, no punch under way, not walking to a pick or a put), except that it breaks off for a switch a
// train needs now.
//
// What it does, most important first:
//   1. The morning: reads the board (every row), then Start the day. The summary: Next day (while days are left).
//   2. Switches and send-offs (the plan of tests/check-prototrains.js' scripted player): the switch whose first move
//      wants it set and is not, or the next move once the train before has passed it; a ready train whose time has
//      come, from beside its engine. A job is taken now when it must be started within 5 game minutes (its time less
//      the walk to it) or a train waits at a switch; otherwise the work below, and when there is none, the player walks
//      ahead to the next job's place once it is under 20 minutes away, or sets a switch early for the next move over it
//      (the way out of a train still to come) when nothing comes over it first.
//   3. Tickets: at the standing passenger train due out first, the coach door with someone at the head of its line
//      (nearest first): one punch command, one ticket. Riders stepping off first: it waits beside the door.
//      D27 (P, board on): tickets punched on board instead: pbPunch at the nearest coach with a seated traveller to
//      punch (the player walks in at its nearer end), then seat by seat inside (this coach first, nearest first; the
//      next coach over the end platforms), waiting inside while travellers still take their seats, then pbLeave.
//   4. Freight by hand: the town's goods off each standing freight car into the storage shed's bay of their tag; the
//      railroad's goods from the shed's OUTSIDE bay into the train's cars until it has its load.
//   5. The evening: the handcart (the hand truck left at its spot first), sorted from the bays (as many as it holds: D27,
//      the platform cart's 16), each shop's goods handed in at its door (pgDeliver), again until nothing is left; the
//      handcart back at its spot (if an hour is left before the day's end); End the day.
// D27 foundation: the same play on the D27 layout (the lever frames, the raised cargo platform, the cart crossing and
// the main street); the numbers (carrying capacities, the day's end) are read from the game.
// D27 integration (every D27 switch on: board, handling, town, lessons): tickets punched on board (P's flow above);
// freight handled step by step by following F's frJobHint (each hint is a command the touch layer sends: frDoor,
// frTake, frPut, frCart, frDeliver, frPickup, or a walk out of a car), as the standing train's work in the plan; the
// evening and the trips to town between trains (when the hint offers one) by the same hints, then End the day;
// goods in hand and the cart put away (the hint, frCart park) before tickets and switches; a handling step under way
// is not broken off unless a switch or a send-off is due. Lessons: a lesson whose first card waits is answered with
// Show me or Skip (mem.lessons: 'mixed', the default, follows switches, tickets and unloading and skips the others on
// day 0, then on the next morning asks for Replay in Settings and skips every lesson as it comes; 'follow'; 'skip').
//
// Use: const bot = protoBotFactory(window.__railhead, mem) in the page (PROTO_BOT_SRC is this function's source);
// each tick: const cmds = bot.decide(S); const ev = R.simTick(S, cmds); bot.observe(S, ev).
// bot.mem is plain data (JSON): copy it with a save to carry on after a reload exactly as before.

function protoBotFactory(R, mem0) {
  const mem = mem0 || {
    days: 2, board: {}, skip: {}, refusals: {}, last: null, job: null, notes: [],
    stats: { cmds: 0, boardRows: 0, starts: 0, switches: 0, punches: 0, waves: 0, picks: 0, puts: 0, tools: 0, delivers: 0, ends: 0, nextDays: 0, walks: 0,
      doors: 0, takes: 0, frPuts: 0, carts: 0, pickups: 0, lessonsShown: 0, lessonsSkipped: 0, replays: 0, leaves: 0 },
    lessons: 'mixed', les: [],
  };
  for (const k of ['doors', 'takes', 'frPuts', 'carts', 'pickups', 'lessonsShown', 'lessonsSkipped', 'replays', 'leaves']) if (mem.stats[k] === undefined) mem.stats[k] = 0;
  const AHEAD_S = 1200, EARLY_S = 2 * 3600;
  const cm = v => Math.round(v * 100);
  const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  // The player's walk (u a game minute: 3 in the prototype since 2026-11-11, read from the game), a third more for the way round.
  const walkU = S => R.proto.playerWalkSpeed(S.track);
  const walkS = (P, x, z, S) => d2(P.x, P.z, x, z) * 1.33 / walkU(S) * 60;
  // D27 (handling on): goods in the hands or on the pushed hand truck are F's (frHeld).
  const handling = S => !!(R.d27 && R.d27.d27On(S.track, 'handling'));
  const held = S => handling(S) ? R.fr.frHeld(S) : R.carry.carryHeld(S);
  // The next handling step (F's frJobHint) as a command, or [] (a step under way, or nothing).
  const frHintKey = c => 'fr:' + c.t + ':' + (c.item !== undefined ? c.item : c.stock !== undefined ? c.stock : c.shop || c.act || '') + (c.to ? ':' + c.to.kind : '');
  const frNext = S => {
    const h = R.fr.frJobHint(S);
    if (!h || h.busy || !h.cmd) return null;
    const key = frHintKey(h.cmd);
    return skipped(S, key) ? null : { c: h.cmd, key, h };
  };
  const frDo = (S, n) => send(S, n.c, n.key);
  // Hands free (D27 handling): goods in hand put where the hint says; the pushed cart or hand truck left where it is.
  const frFree = S => {
    if (!handling(S)) return null;
    const P = S.player;
    if (held(S).length) { const n = frNext(S); return n ? frDo(S, n) : []; }
    if (P.tool !== null && P.tool !== undefined) return skipped(S, 'park') ? [] : send(S, { t: 'frCart', act: 'park', tool: P.tool }, 'park');
    return null;
  };
  const tagOf = (S, id) => R.cargo.itemTag(S.items.waybill[id]);
  const bayOf = (S, tag) => S.bayTags.storage.indexOf(tag);
  const inBay = (S, b) => R.cargo.itemsAt(S, { kind: 'BAY', buildingId: 'storage', bay: b });
  const skipped = (S, k) => mem.skip[k] !== undefined && mem.skip[k] > S.tick;
  const skip = (S, k, ticks) => { mem.skip[k] = S.tick + (ticks || 30); };
  const send = (S, c, key) => {
    mem.last = { c, key: key || null, tick: S.tick }; mem.stats.cmds++;
    const k = { pdStart: 'starts', useSwitch: 'switches', punch: 'punches', pbPunch: 'punches', rrWaveOff: 'waves', carryPick: 'picks', carryPut: 'puts', carryTool: 'tools', pgDeliver: 'delivers', pdEndDay: 'ends', pdNextDay: 'nextDays', walkTo: 'walks',
      frDoor: 'doors', frTake: 'takes', frPut: 'frPuts', frCart: 'carts', frDeliver: 'delivers', frPickup: 'pickups', pbLeave: 'leaves' }[c.t];
    if (k) mem.stats[k]++;
    return [c];
  };
  const walkTo = (S, x, z) => {
    const P = S.player;
    if (d2(P.x, P.z, x, z) < 0.6) return [];
    if (P.mode === 'to' && !P.use && d2(P.tx, P.tz, x, z) < 0.5) return [];   // on the way already
    return send(S, { t: 'walkTo', x: cm(x), z: cm(z) });
  };
  const onBoard = S => !!(R.pb && R.pb.pbOn && R.pb.pbOn(S.track));   // D27 (P): tickets punched on board (board on)
  const standing = S => S.rr.runs.filter(r => r.ph === 'stand' && !r.through && r.slot !== null && r.slot !== undefined).sort((a, b) => a.dep - b.dep);

  // ---- 2. to 4. The day's jobs: switches, send-offs and the work at each standing train, in one plan ----
  // Each job: { k ('sw' | 'wave' | 'work'), at: [x, z] (where it is done), time (when it should be done by), readyAt
  // (when it can start), dur (game seconds it takes there), run }. The plan: of the four most pressing (latest start
  // first), the order that makes them least late (squared), walking between them at the player's pace (a third more for the
  // way round); a send-off counts only after its train's work in that order (or once the train is ready).
  function jobsNow(S) {
    const P = S.player, T = S.track, rows = R.rr.rrSwitchNeeds(S), bySw = {}, jobs = [];
    for (const n of rows) if (!n.passed) (bySw[n.sw] = bySw[n.sw] || []).push(n);
    const runById = id => S.rr.runs.find(q => q.id === id), moving = run => run && (run.ph === 'in' || (run.ph === 'out' && run.go));
    for (const [sw, list] of Object.entries(bySw)) {
      const W = T.switches[+sw], at = [W.stand.ux, W.stand.uz], first = list[0];
      if (!first.set) jobs.push({ k: 'sw', sw: +sw, at, time: first.byTime, can: !R.switchLockReason(S, +sw), readyAt: S.time, dur: 30, move: first.move, run: runById(first.run), other: (list.find(n => n.want !== first.want) || { byTime: Infinity }).byTime });
      else { const nx = list.find(n => n.want !== first.want); if (nx && moving(runById(first.run))) jobs.push({ k: 'sw', sw: +sw, at, time: nx.byTime, can: false, readyAt: Math.max(S.time, first.byTime + 240), dur: 30 }); }
    }
    // A train waiting at a switch set against it (the Next job line's first job): throw it now, whatever comes after
    // (a train that came late can find the switch set for the next one's way already).
    for (const tr of S.trains) {
      if (tr.owner !== 'rr' || tr.swWait === undefined || tr.swWait === null) continue;
      const W = T.switches[tr.swWait];
      for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].k === 'sw' && jobs[i].sw === tr.swWait) jobs.splice(i, 1);
      jobs.push({ k: 'sw', sw: tr.swWait, at: [W.stand.ux, W.stand.uz], time: S.time - 1800, can: !R.switchLockReason(S, tr.swWait), readyAt: S.time, dur: 30, waiting: true });
    }
    for (const run of standing(S)) {
      const tr = S.trains[run.slot], w = workOf(S, run);
      if (w) jobs.push({ k: 'work', run, tr: tr.id, at: w.at, time: run.dep - w.dur, readyAt: S.time, dur: w.dur });
      const sp = R.rr.rrWaveSpot(S, tr.id);
      const near = R.rr.rrEngineDist(S, tr) <= R.rr.RR.REACH && !R.proto.walkBridgeAt(T, P.x, P.z) && d2(P.x, P.z, sp.x, sp.z) < 2;
      jobs.push({ k: 'wave', run, tr: tr.id, at: [sp.x, sp.z], time: run.dep, readyAt: run.dep, dur: 10, after: w ? 'work' + tr.id : null, ready: near && S.time >= run.dep && run.ready });
    }
    for (const j of jobs) j.key = j.k + (j.k === 'sw' ? j.sw : j.tr);
    return jobs;
  }
  // A standing train's work still to do: { at, dur } or null. Tickets: the line's length; freight: the trips with the
  // hand truck (three goods a trip) between the cars and the shed.
  function workOf(S, run) {
    const tr = S.trains[run.slot];
    if (run.kind === 'pax' && onBoard(S)) {
      // D27 (P): tickets punched on board: the travellers still to seat and punch, and getting off again.
      const rs = R.pb.pbRunStatus(S, run), inside = S.player.in && S.player.in.tr === tr.id;
      if (!rs.toPunch && !rs.boarding && !rs.waiting && !rs.off && !inside) return null;
      const sts = tr.consist.map(c => R.pb.pbCarStatus(S, c.id)).filter(Boolean), c = sts.find(x => x.toPunch > 0) || sts[0], e = c.ends.find(q => q.ok) || c.ends[0];
      return { at: inside ? [S.player.x, S.player.z] : [e.x, e.z], dur: 90 + (rs.toPunch + rs.boarding + rs.waiting) * 50 };
    }
    if (run.kind !== 'pax' && handling(S)) {
      // D27 (F): the town's goods still aboard and the railroad's still to load; the place of the next hint.
      const t = R.fr.frStanding(S).find(q => q.run === run), inCar = R.fr.frInCar(S), mine = inCar !== null && tr.consist.some(c => c.id === inCar);
      if (!t || (!t.town && !t.need && !mine && !held(S).length && !(S.fr && S.fr.job))) return null;
      const h = R.fr.frJobHint(S), at = h && Number.isFinite(h.x) ? [h.x, h.z] : [S.player.x, S.player.z];
      return { at, dur: 600 + (t.town + t.need) * 420 };
    }
    if (run.kind === 'pax') {
      const st = tr.consist.map(c => R.pp.ppCarStatus(S, c.id)).filter(s => s && s.line > 0);
      if (!st.length) return null;
      const n = st.reduce((a, s) => a + s.line, 0), sp = st[0].spot || st[0].doors[0].spot;
      return { at: [sp.x, sp.z], dur: 60 + n * 25 };
    }
    const off = pgOff(S, tr).length, st = R.pg.pgCarStatus(S, tr.consist[1].id), on = st ? st.load : 0;
    if (!off && !on && !held(S).length) return null;
    const ps = R.trainPoses(S.track, tr), mid = ps[ps.length >> 1];
    return { at: [mid.x, R.proto.PROTO.P2.z1 - 1], dur: 240 + (Math.ceil(off / 3) + Math.ceil(on / 3)) * 420 };
  }
  const pgOff = (S, tr) => [].concat(...tr.consist.filter(c => c.k !== 'loco').map(c => R.cargo.itemsAt(S, { kind: 'CAR', stockId: c.id }))).filter(id => tagOf(S, id) !== 'OUTSIDE');
  function plan(S, jobs) {
    const P = S.player;
    if (!jobs.length) return null;
    const wS = j => walkS(P, j.at[0], j.at[1], S);
    jobs.sort((a, b) => (a.time - wS(a)) - (b.time - wS(b)) || a.time - b.time);
    let top = jobs.slice(0, 4);
    // A send-off in the top four brings its train's work with it.
    for (const q of top.slice()) if (q.after && !top.some(o => o.key === q.after)) { const w = jobs.find(o => o.key === q.after); if (w) { top = top.slice(0, 3).filter(o => o !== q).concat([w, q]).slice(0, 4); } }
    const dS = (a, b) => d2(a[0], a[1], b[0], b[1]) * 1.33 / walkU(S) * 60;
    const cost = order => {
      let t = S.time, at = [P.x, P.z], c = 0;
      const done = {};
      for (const q of order) {
        let ready = q.readyAt;
        if (q.k === 'wave' && !q.run.ready) ready = done[q.after] !== undefined ? Math.max(ready, done[q.after]) : (q.after ? Infinity : ready);
        if (ready === Infinity) { c += 1e12; continue; }
        t = Math.max(t + dS(at, q.at), ready);
        const l = Math.max(0, t - q.time); c += l * l;
        t += q.dur; at = q.at; done[q.key] = t;
      }
      return c;
    };
    const perms = a => a.length <= 1 ? [a] : [].concat(...a.map((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map(r => [x].concat(r))));
    let best = null, bc = Infinity, heldC = Infinity;
    for (const o of perms(top)) { const c = cost(o); if (c < bc) { bc = c; best = o[0]; } if (o[0].key === mem.job) heldC = Math.min(heldC, c); }
    // Keep to the job in hand unless another order is clearly better (two minutes' lateness).
    const hj = top.find(q => q.key === mem.job);
    const j = hj && heldC <= bc + 120 * 120 ? hj : best;
    j.start = Math.max(j.time, j.readyAt) - wS(j);
    return j;
  }
  function doJob(S, j) {
    const P = S.player, here = d2(j.at[0], j.at[1], P.x, P.z) < 1.6;
    mem.job = j.key;
    if (j.k === 'work') return workAt(S, j.run) || (here ? [] : walkTo(S, j.at[0], j.at[1]));
    if (handling(S) && (P.tool !== null && P.tool !== undefined || held(S).length) && j.start - S.time > 300 && !j.waiting) {
      // D27: a switch or a send-off not yet due while handling freight with the cart or goods in hand: carry on with that.
      const n = frNext(S);
      if (n) return frDo(S, n);
    }
    if (handling(S)) { const f = frFree(S); if (f) return f; }   // D27: goods away and the cart left before a switch or a send-off
    else if (P.tool !== null && P.tool !== undefined) { const h = held(S); if (h.length) return putAway(S, h[h.length - 1]); }   // a switch or a send-off with the hand truck: fine, but goods first
    if (j.k === 'sw' && j.can) return P.mode === 'idle' || !P.use || P.use.id !== j.sw ? (skipped(S, 'sw' + j.sw) ? [] : send(S, { t: 'useSwitch', sw: j.sw }, 'sw' + j.sw)) : [];
    if (j.k === 'wave' && j.ready) return skipped(S, 'wave' + j.tr) ? [] : send(S, { t: 'rrWaveOff', tr: j.tr }, 'wave' + j.tr);
    if (here) return [];
    return walkTo(S, j.at[0], j.at[1]);
  }
  // Where a good in hand goes: the town's into its bay; the railroad's into a train that still wants it (else back).
  function putAway(S, id) {
    const tag = tagOf(S, id);
    if (tag !== 'OUTSIDE') return send(S, { t: 'carryPut', b: 'storage', bay: bayOf(S, tag) }, 'put' + id);
    for (const run of standing(S)) {
      if (run.kind !== 'freight') continue;
      const tr = S.trains[run.slot];
      for (const c of tr.consist) if (c.k !== 'loco' && !R.pg.pgPutCarWhy(S, id, c.id) && !skipped(S, 'load' + c.id)) return send(S, { t: 'carryPut', stock: c.id }, 'load' + c.id);
    }
    return send(S, { t: 'carryPut', b: 'storage', bay: bayOf(S, 'OUTSIDE') }, 'put' + id);
  }
  // The next command of a standing train's work, or null (nothing to do there just now).
  function workAt(S, run) {
    const P = S.player, h = held(S), tool = P.tool !== null && P.tool !== undefined ? S.tools[P.tool] : null, tr = S.trains[run.slot];
    if (run.kind === 'pax') {
      // Tickets need free hands: goods away and the hand truck back at its spot beside the shed first.
      if (handling(S)) { const f = frFree(S); if (f) return f; }
      else if (h.length) return putAway(S, h[h.length - 1]);
      if (tool) return send(S, { t: 'carryTool', tool: tool.id }, 'tool' + tool.id);
      if (onBoard(S)) {
        // D27 (P): in the train, the nearest traveller still to punch (this coach first), then off again; from the
        // platform, pbPunch at a coach with tickets to punch (it walks in at the nearer end); else wait at a coach end.
        const I = P.in, rs = R.pb.pbRunStatus(S, run), mineC = c => tr.consist.some(q => q.id === c);
        if (I && I.tr === tr.id) {
          if (I.out || I.clm < 0 || I.ts) return [];   // (D27 integration: on his way along the aisle already: the punch is not sent again every tick)
          const cands = S.pax.list.filter(p => p.s === 'sitting' && !p.punched && mineC(p.stock) && !skipped(S, 'punch' + p.stock + ':' + p.seat));
          const rx = p => R.pb.pbSeatLocal(p.seat).rx;
          cands.sort((a, b) => (a.stock === I.stock ? 0 : 1) - (b.stock === I.stock ? 0 : 1) || Math.abs(rx(a) - I.s) - Math.abs(rx(b) - I.s) || a.seat - b.seat);
          if (cands.length) return send(S, { t: 'pbPunch', tr: tr.id, stock: cands[0].stock, seat: cands[0].seat }, 'punch' + cands[0].stock + ':' + cands[0].seat);
          if (rs.boarding || rs.waiting || rs.off) return [];   // more to sit down: wait inside
          return send(S, { t: 'pbLeave' }, 'leave' + tr.id);
        }
        const sts = tr.consist.map(c => R.pb.pbCarStatus(S, c.id)).filter(Boolean);
        const dEnd = x => Math.min(...x.ends.filter(e => e.ok).map(e => d2(P.x, P.z, e.x, e.z)));
        const todo = sts.filter(x => x.toPunch > 0 && !skipped(S, 'punch' + x.stock)).sort((a, b) => dEnd(a) - dEnd(b));
        if (todo.length) return send(S, { t: 'pbPunch', tr: tr.id, stock: todo[0].stock }, 'punch' + todo[0].stock);
        if (rs.boarding || rs.waiting || rs.off) { const c = sts.find(x => x.boarding > 0) || sts[0], e = c.ends.find(q => q.ok) || c.ends[0]; return walkTo(S, e.x, e.z); }
        return null;
      }
      let best = null, wait = null;
      for (const c of tr.consist) {
        const s = R.pp.ppCarStatus(S, c.id);
        if (!s || !(s.line > 0)) continue;
        const sp = s.spot || (s.doors[0] && s.doors[0].spot);
        if (s.off > 0 || !(s.ready > 0) || !s.at) { if (!wait && sp) wait = sp; continue; }
        if (skipped(S, 'punch' + c.id)) continue;
        const d = sp ? d2(P.x, P.z, sp.x, sp.z) : 0;
        if (!best || d < best.d) best = { c, d };
      }
      if (best) return send(S, { t: 'punch', tr: tr.id, car: best.c.id }, 'punch' + best.c.id);
      if (wait) return walkTo(S, wait.x, wait.z);   // riders still stepping off, or the line still walking up
      return null;
    }
    if (handling(S)) {
      // D27 (F): the next handling step (frJobHint: unloading onto the cart, stacking, loading, out of the car).
      if (S.fr && S.fr.job) return [];
      const n = frNext(S);
      return n ? frDo(S, n) : null;
    }
    // Freight with the hand truck, three at a time: the town's goods off (nearest first), then the railroad's on.
    const truck = S.tools.find(t => t.k === 'truck'), cap = R.cargo.CARGO_CARRY_CAP[R.carry.carryCarrier(S)];   // D27: read from the game
    const off = pgOff(S, tr).filter(id => !skipped(S, 'pick' + id)), st = R.pg.pgCarStatus(S, tr.consist[1].id), want = st ? st.load : 0;
    const heldOut = h.filter(id => tagOf(S, id) === 'OUTSIDE').length, outs = inBay(S, bayOf(S, 'OUTSIDE')).filter(id => !skipped(S, 'pick' + id));
    if (!off.length && !(want > 0) && !h.length) return null;
    if (tool && tool.k !== 'truck') { if (h.length) return putAway(S, h[h.length - 1]); return send(S, { t: 'carryTool', tool: tool.id }, 'tool' + tool.id); }
    if (!tool && !h.length && truck && !skipped(S, 'tool' + truck.id)) return send(S, { t: 'carryTool', tool: truck.id }, 'tool' + truck.id);
    if (h.length < cap) {
      if (off.length && !heldOut) { const sp = id => R.interchange.carryCarDoor(S, S.items.where[id].stockId, P.x, P.z) || P; off.sort((a, b) => d2(P.x, P.z, sp(a).x, sp(a).z) - d2(P.x, P.z, sp(b).x, sp(b).z)); return send(S, { t: 'carryPick', id: off[0] }, 'pick' + off[0]); }
      if (!off.length && want > heldOut && outs.length && h.length === heldOut) return send(S, { t: 'carryPick', id: outs[0] }, 'pick' + outs[0]);
    }
    if (h.length) return putAway(S, h[h.length - 1]);
    return null;
  }

  // ---- 5. The evening ----
  function evening(S) {
    if (handling(S)) {
      // D27 (F): the evening by the hints (load the cart, to town, deliver, pick up, back to the OUT rows), then End the day.
      if (S.fr && S.fr.job) return [];
      const n = frNext(S);
      if (n) return frDo(S, n);
      const hh = R.fr.frJobHint(S);
      if (hh && (hh.busy || hh.cmd)) return [];   // a step under way, or a refused one waiting to be tried again
      const left = R.fr.frToDeliver(S), picks = R.fr.frPickups(S);
      if (Object.values(left).some(v => v) || Object.values(picks).some(v => v)) { if (!mem.notes.includes('goods left')) mem.notes.push('goods left'); }
      return send(S, { t: 'pdEndDay' });
    }
    const P = S.player, h = held(S), cart = S.tools.find(t => t.k === 'cart' || t.k === 'cart27'), carrier = R.carry.carryCarrier(S);   // D27: the platform cart is the handcart
    const cartCap = R.cargo.CARGO_CARRY_CAP[R.carry.TOOL_KINDS[cart.k].carrier];
    const shopGoods = () => S.bayTags.storage.map((tag, b) => tag === 'OUTSIDE' ? [] : inBay(S, b)).reduce((a, b) => a.concat(b), []);
    if (carrier === 'HAND' && h.length) { const id = h[h.length - 1], tag = tagOf(S, id); return send(S, { t: 'carryPut', b: 'storage', bay: bayOf(S, tag) }, 'put' + id); }
    const waiting = shopGoods().filter(id => !skipped(S, 'pick' + id));
    // Sort the cart: fill it from the bays, shop by shop, before setting off.
    if (waiting.length && (P.tool !== cart.id || h.length < cartCap) && !(P.tool === cart.id && h.length && mem.cartFull)) {
      if (P.tool !== null && P.tool !== cart.id) return send(S, { t: 'carryTool', tool: P.tool }, 'tool' + P.tool);   // the hand truck back first
      if (P.tool !== cart.id) return send(S, { t: 'carryTool', tool: cart.id }, 'tool' + cart.id);
      mem.cartFull = false;
      return send(S, { t: 'carryPick', id: waiting[0] }, 'pick' + waiting[0]);
    }
    if (h.length) {
      mem.cartFull = true;   // set off with what is aboard; back for the rest after
      const st = R.pg.pgCartStatus(S).byShop;
      const shop = ['store', 'smithy', 'saloon'].find(k => st[k] > 0 && !skipped(S, 'shop' + k));
      if (shop) return send(S, { t: 'pgDeliver', shop }, 'shop' + shop);
      return [];
    }
    mem.cartFull = false;
    // The handcart back at its spot if there is time (else the morning's first job), then End the day.
    const sod = (S.time + 18000) % 86400;
    if (P.tool !== null && P.tool !== undefined && sod < R.proto.PD.LATE_S - 3600) return send(S, { t: 'carryTool', tool: P.tool }, 'tool' + P.tool);   // D27: an hour before the day's end (PD.LATE_S)
    const left = R.pg.pgToDeliver(S);
    if (left.store + left.smithy + left.saloon > 0) { if (!mem.notes.includes('goods left')) mem.notes.push('goods left'); }
    return send(S, { t: 'pdEndDay' });
  }

  // D27 (U): a lesson's first card waiting (the page holds the clock): Show me or Skip, by mem.lessons.
  function lessons(S) {
    const D = S.pd, w = D.lesWait && D.lesWait[0];
    if (!w) return null;
    const mode = mem.lessons, follow = mode === 'follow' || (mode === 'mixed' && D.day === 0 && ['switches', 'board', 'unload'].includes(w));
    mem.les.push(`d${D.day} ${w} ${follow ? 'show' : 'skip'}`);
    mem.stats[follow ? 'lessonsShown' : 'lessonsSkipped']++;
    return send(S, { t: 'pdLesson', id: w, act: follow ? 'show' : 'skip' });
  }
  function decide(S) {
    const P = S.player, D = S.pd;
    const lw = lessons(S);
    if (lw) return lw;
    // D27 (U): on the second morning ('mixed'), Replay the lessons from Settings, to skip each as it comes.
    if (D.ph === 'morning' && D.day === 1 && mem.lessons === 'mixed' && !mem.replayed && R.d27 && R.d27.d27On(S.track, 'lessons')) { mem.replayed = true; mem.stats.replays++; return send(S, { t: 'pdLesson', act: 'replay' }); }
    if (D.ph === 'morning') {
      // Read the board (every row: time, train, track, switches, work), then start the day.
      if (mem.board[D.day] === undefined) { const rows = R.pdui.rows(S); mem.board[D.day] = rows.map(r => `${r.arr} ${r.id} t${r.track} ${r.switches} ${r.work}`); mem.stats.boardRows += rows.length; }
      return send(S, { t: 'pdStart' });
    }
    if (D.ph === 'summary') return D.day + 1 < mem.days ? send(S, { t: 'pdNextDay' }) : [];
    if (P.act) return [];
    if (D.ph === 'evening') return P.use || (S.pax.pp && S.pax.pp.job) || (S.pb && S.pb.job) ? [] : evening(S);
    const pj = S.pax && S.pax.pp && S.pax.pp.job;
    const jobs = jobsNow(S), j = plan(S, jobs);
    const waitAt = S.trains.find(tr => tr.owner === 'rr' && tr.swWait !== undefined && tr.swWait !== null);
    // On the way to throw a switch: keep going (the throw happens on arrival), unless a train waits at another one.
    if (P.use && P.use.k === 'sw' && P.mode === 'to' && !(waitAt && waitAt.swWait !== P.use.id)) return [];
    if (pj) return [];   // a punch under way (one ticket: a tick or two once there)
    if (S.pb && S.pb.job && !(waitAt && P.in)) return [];   // D27 (P): on the way into a coach, or a punch on board under way
    if (P.use && j && j.k === 'work' && j.key === mem.job) return [];   // a pick or a put under way for the job in hand
    if (S.fr && S.fr.job && !(waitAt) && !(j && j.k !== 'work' && j.start - S.time < 0)) return [];   // D27: a handling step under way (broken off only for a switch or send-off now due)
    if (j && (j.start - S.time < AHEAD_S || j.k === 'work')) {
      if (P.use && (P.use.k === 'pick' || P.use.k === 'put') && j.k !== 'work' && j.start - S.time > 60) return [];   // finish the carry first
      return doJob(S, j);
    }
    if (P.use) return [];
    // Nothing pressing: goods in hand away; then set a switch for the next move over it now, when nothing comes over it
    // first (a way out early only when the next train over it the other way is due well after it, or its train is
    // ready: a late train's way out set early would stop that train before it), soonest first.
    const h = held(S);
    if (handling(S)) {
      // D27 (F): the hint's step (goods in hand away, goods on the cart stacked, a trip to town when there is time
      // before the next train, the cart back to the cargo platform); else the cart left where it is.
      const n = frNext(S);
      // (a step that starts a new piece of work only with time in hand before the next job: the walk there, 20 minutes
      // of work and the walk on to the next job; walking off to the cart and being called back to a lever wastes the walk)
      const hx = n && Number.isFinite(n.h.x), there = hx ? walkS(P, n.h.x, n.h.z, S) * 1.4 : 0, back = j && hx ? d2(n.h.x, n.h.z, j.at[0], j.at[1]) * 1.9 / walkU(S) * 60 : 0;   // (the ways over the footbridges are longer than the straight line)
      const nearHint = hx && d2(P.x, P.z, n.h.x, n.h.z) < 4;
      if (n && (h.length || nearHint || !j || j.start - S.time > there + 1200 + back)) return frDo(S, n);
      if (h.length) return [];
    } else {
      if (h.length) return putAway(S, h[h.length - 1]);
      if (P.tool !== null && P.tool !== undefined) return send(S, { t: 'carryTool', tool: P.tool }, 'tool' + P.tool);
    }
    const early = jobs.filter(q => q.k === 'sw' && q.can && q.time - S.time < EARLY_S && (q.move !== 'out' || (q.run && (q.run.through || q.run.ready)) || q.other - q.time > 1800)).sort((a, b) => a.time - b.time)[0];
    if (early) return doJob(S, early);
    if (j) return doJob(S, j);   // walk ahead to the next job's place
    return [];
  }

  // Read the tick's messages: a refused command is not tried again for a while.
  function observe(S, ev) {
    for (const e of ev) {
      if (!(/Refused$/.test(e.t) || e.t === 'blocked' || (e.t === 'ppStopped' && e.why))) continue;
      const why = ((mem.last ? mem.last.c.t + ' -> ' : '') + e.t + ': ' + (e.why || '')).replace(/[0-9]+/g, 'N');
      mem.refusals[why] = (mem.refusals[why] || 0) + 1;
      if (mem.last && mem.last.key) skip(S, mem.last.key, mem.last.c.t === 'useSwitch' || mem.last.c.t === 'punch' ? 8 : 60);
    }
  }
  return { mem, decide, observe };
}

module.exports = { protoBotFactory, PROTO_BOT_SRC: protoBotFactory.toString() };
