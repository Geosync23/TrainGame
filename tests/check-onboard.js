// Check: tickets punched on board (D27, builder P; plans/d27-tech.md section 3), with D27 board on. A scripted morning
// on a copy of a new prototype game (the switches set by hand), as check-punch does for the D25 line:
// - Waiting: before p1 comes in its travellers (pbCome) walk in from the street's end and wait on platform 1, some on
//   the benches, the rest standing under the canopy; nobody lines up at a door.
// - Riders off: when p1 stands every coach holds through riders (punched, through) and riders for the Hub; the riders
//   for the Hub stand up, walk the aisle, climb down at an end and walk off the map (pbOff, paxGone). Nobody climbs
//   into a coach while a rider for the Hub is still in it.
// - Boarding and seating: each traveller walks to a usable coach end (never one on a footbridge), climbs, walks the
//   aisle and sits (pbSeated), in the seat the rule gives (pbPickSeat: nearest that end's door, window first,
//   alternating sides) at the moment it was given; one traveller a seat; the same seats in a second run.
// - Entering and punching: pbPunch from the platform walks the player to the nearest end and in (pbEnter; S.player.in,
//   the floor's height, pbCutaway names the coach, pbPlayerPose climbs); each pbPunch punches exactly one ticket
//   (pbPunched), the traveller holds the ticket out (pbDrawList 'sitTicket') while the agent punches (pbPlayerPose
//   'punch'), the mark shows (punched); a through rider's seat is refused; pbWalk to the next coach walks there over
//   the end platforms without stepping down (S.player.in never empty on the way), and every coach is punched.
// - The departure rule: the wave-off is refused while a ticket is unpunched, and while the player is still aboard
//   (pbWhyNotReady says why); a tap on the ground (walkTo) takes him to an end, down the steps and on to the spot;
//   then p1 is ready and sent off with everyone aboard (paxGone), pdCount punched matches, nobody missed.
// - The alternative rule kept (PB.RIDE_FREE): unpunched travellers ride free and are counted missed (pbMissed).
// - A heading-west train (p2) has its stove end east (pbCoachView 'w', sitters facing nw).
// - The same script twice gives the same hash; a save mid-boarding reloads with the same hash and plays on the same.
// - rh.scenario('d27coach'): travellers seated (unpunched) and waiting; pbCoachView's shape (29 seats, 15 benches).
// - With ?doorline=1 none of this runs (the D25 line keeps playing for check-punch).
// Screenshot (portrait): the d27coach scenario with the player punching in a coach (drawn by whatever R has so far).

const { openGame, screenshotPath } = require('./browser');

function script() {
  const R = window.__railhead, Pb = R.pb, S0 = R.newState(1866, 'proto'), out = { bad: [], notes: {} }, B = m => out.bad.push(m);
  const s = JSON.parse(JSON.stringify(S0)), evs = [], SW = R.proto.PROTO_SW, PB = Pb.PB;
  const tick = cmds => { const e = R.simTick(s, cmds || []); evs.push(...e); return e; };
  const L = () => s.pax.list, runOf = svc => s.rr.runs.find(q => q.svc === svc && q.day === 0);
  const P = s.player, seatsSeen = {}, seatErr = [];
  // Every tick: a traveller newly given a seat got the one pbPickSeat gives for the seats as they were before (in list order).
  const watchTick = cmds => {
    const was = new Map(L().map(p => [p.id, p.s]));
    const e = tick(cmds);
    // The seats as they were when this tick's travellers were given theirs: the tick's assignments taken out, the seats
    // of riders for the Hub who stood up this tick (after them in the list) put back.
    const fresh = L().filter(p => p.s === 'toCoach' && (was.get(p.id) === 'wait' || was.get(p.id) === 'bench')), before = JSON.parse(JSON.stringify(s.pb ? s.pb.cars : {}));
    for (const p of fresh) if (before[p.stock]) before[p.stock][p.seat] = -1;
    for (const p of L()) if (p.to === 'hub' && p.s === 'standing' && was.get(p.id) === 'sitting' && before[p.stock]) before[p.stock][p.seat] = p.id;
    for (const p of fresh) {
      const seats = before[p.stock] || [], want = Pb.pbPickSeat(seats, p.end);
      if (want !== p.seat) seatErr.push(`traveller ${p.id}: seat ${p.seat}, the rule gives ${want}`);
      if (before[p.stock]) before[p.stock][p.seat] = p.id;
      seatsSeen[p.id] = p.stock + ':' + p.seat;
      const g = Pb.pbGeo(s, p.stock), en = g && Pb.pbEnds(s, g).find(q => q.end === p.end);
      if (!en || !en.ok) B(`traveller ${p.id} sent to an unusable end ${p.end} of coach ${p.stock}`);
    }
    // Nobody climbs into a coach with a rider for the Hub still in it.
    for (const p of L()) if (p.to !== 'hub' && p.s === 'climb' && L().some(q => q.to === 'hub' && q.stock === p.stock && ['sitting', 'standing', 'aisle'].includes(q.s))) { B(`traveller ${p.id} climbs into coach ${p.stock} before its riders for the Hub are off`); break; }
    return e;
  };
  tick();
  s.track.switches[SW.W1].state = 'R';   // p1 in from the west to track 1
  const p1 = runOf('p1'), exitZ = Math.max(...R.proto.PROTO.TOWN_EXITS.map(e => e[1]));
  // 1. Waiting.
  let fromStreet = false, last = [];
  for (let i = 0; i < 2000 && p1.ph !== 'stand'; i++) {
    last = L().filter(p => p.run === p1.id && p.to !== 'hub' && !p.through).map(p => ({ ...p }));   // as they were the tick before it stood
    watchTick();
    for (const p of L()) if (p.run === p1.id && p.s === 'come' && p.z / 100 < exitZ + 1) fromStreet = true;
  }
  if (p1.ph !== 'stand') { B(`p1 did not come to stand (${p1.ph})`); return out; }
  const come = evs.find(e => e.t === 'pbCome' && e.run === p1.id), mine = () => L().filter(p => p.run === p1.id && p.to !== 'hub' && !p.through);
  if (!come) B('no pbCome event for p1');
  if (!fromStreet) B('p1\'s travellers did not walk in from the street\'s end');
  const m0 = mine();
  if (last.length !== m0.length) B(`${m0.length} travellers for p1 at its arrival, ${last.length} the tick before`);
  out.notes.travellers = m0.length;
  if (!(m0.length >= PB.PER_TRAIN[0] && m0.length <= PB.PER_TRAIN[1]) || (come && come.n !== m0.length)) B(`${m0.length} travellers for p1 (pbCome ${come && come.n}, expected ${PB.PER_TRAIN})`);
  const waiting = last.filter(p => p.s === 'wait' || p.s === 'bench');
  out.notes.atArrival = last.map(p => p.s).join(',');
  if (waiting.length < last.length - 2) B(`before p1's arrival only ${waiting.length} of ${last.length} wait on the platform`);
  if (!last.some(p => p.s === 'bench')) B('nobody waits on a bench');
  if (last.some(p => p.s === 'line')) B('a traveller lines up at a door');
  const P1 = R.proto.PROTO.P1;
  for (const p of waiting) if (!(p.x / 100 >= P1.x0 && p.x / 100 <= P1.x1 && p.z / 100 >= P1.z0 && p.z / 100 <= P1.z1) || R.proto.walkBridgeAt(s.track, p.x / 100, p.z / 100)) B(`traveller ${p.id} waits off platform 1 (${p.x / 100}, ${p.z / 100})`);
  const benchSeats = waiting.filter(p => p.s === 'bench').map(p => p.bs);
  if (new Set(benchSeats).size !== benchSeats.length) B('two travellers on one bench seat');
  // 2. The riders already aboard.
  const tr = s.trains[p1.slot], coaches = tr.consist.filter(c => c.k === 'coach');
  const riders = L().filter(p => p.run === p1.id && (p.to === 'hub' || p.through));
  for (const c of coaches) {
    const here = riders.filter(p => p.stock === c.id), hub = here.filter(p => p.to === 'hub'), thr = here.filter(p => p.through);
    if (!(hub.length >= PB.OFF[0] && hub.length <= PB.OFF[1]) || !(thr.length >= PB.THROUGH[0] && thr.length <= PB.THROUGH[1])) B(`coach ${c.id}: ${hub.length} riders for the Hub, ${thr.length} through riders`);
    if (here.some(p => p.s !== 'sitting' || !p.punched)) B(`coach ${c.id}: a rider aboard is not seated and punched`);
    const seats = s.pb.cars[c.id];
    if (!seats || seats.length !== Pb.PB_SEATS || here.some(p => seats[p.seat] !== p.id)) B(`coach ${c.id}: the seats do not hold its riders`);
  }
  if (Pb.pbReady(s, p1, tr)) B('pbReady with riders aboard and travellers waiting');
  out.notes.riders = `${riders.filter(p => p.to === 'hub').length} for the Hub, ${riders.filter(p => p.through).length} through`;
  // 3. Riders off, boarding and seating.
  const hubIds = riders.filter(p => p.to === 'hub').map(p => p.id), acts = new Set();
  for (let i = 0; i < 900 && (mine().some(p => p.s !== 'sitting') || L().some(p => hubIds.includes(p.id))); i++) {
    watchTick();
    for (const d of Pb.pbDrawList(s)) acts.add(d.act);
    if (!out.midBoard && mine().some(p => p.s === 'aisle') && mine().some(p => p.s === 'toCoach')) out.midBoard = JSON.stringify({ state: s });
  }
  if (mine().some(p => p.s !== 'sitting')) B(`not everyone took a seat: ${mine().map(p => p.s).join(',')}`);
  if (L().some(p => hubIds.includes(p.id))) B('riders for the Hub still on the map');
  const offN = evs.filter(e => e.t === 'pbOff' && e.run === p1.id).length, seatedN = evs.filter(e => e.t === 'pbSeated' && e.run === p1.id).length;
  if (offN !== hubIds.length) B(`${offN} pbOff events for ${hubIds.length} riders`);
  if (seatedN !== m0.length) B(`${seatedN} pbSeated events for ${m0.length} travellers`);
  if (evs.filter(e => e.t === 'paxGone').length !== hubIds.length) B('the riders for the Hub did not leave the map (paxGone)');
  for (const k of ['benchSit', 'walk', 'climb', 'sitDown', 'sit', 'standUp']) if (!acts.has(k)) B(`no '${k}' in pbDrawList`);
  if (seatErr.length) B('seats not as the rule: ' + seatErr.slice(0, 3).join('; '));
  const occ = {};
  for (const p of L()) if (p.s === 'sitting') { const k = p.stock + ':' + p.seat; if (occ[k]) B(`two travellers in seat ${k}`); occ[k] = 1; if (s.pb.cars[p.stock][p.seat] !== p.id) B(`seat ${k} does not hold traveller ${p.id}`); }
  out.seats = JSON.stringify(seatsSeen);
  if (!out.midBoard) B('no moment mid-boarding was seen');
  // The draw list's shape for the seated.
  for (const d of Pb.pbDrawList(s)) {
    if (!/^ppl\/[a-z_.]+\/(idle|walk|benchSit|climb|sitDown|sit|sitTicket|standUp)\/(se|ne|sw|nw)\/\d$/.test(d.key) || typeof d.y !== 'number') { B('a draw list entry: ' + JSON.stringify(d)); break; }
    if (d.act === 'sit' && (d.y !== R.proto.PROTO_STOCK.coach.floor || d.stock === null || d.seat < 0)) { B('a seated entry: ' + JSON.stringify(d)); break; }
  }
  // 4. The wave-off refused while tickets are unpunched.
  s.track.switches[SW.W1].state = 'N'; s.track.switches[SW.E1].state = 'R';
  const wave = () => { const ws = R.rr.rrWaveSpot(s, tr.id); Object.assign(P, { x: ws.x, z: ws.z, mode: 'idle', use: null, act: null }); return tick([{ t: 'rrWaveOff', tr: tr.id }]); };
  if (!/ticket/.test(Pb.pbWhyNotReady(s, p1, tr) || '')) B(`pbWhyNotReady before punching: ${Pb.pbWhyNotReady(s, p1, tr)}`);
  if (!wave().some(e => e.t === 'rrRefused')) B('p1 was waved off with tickets unpunched');
  // 5. Into the first coach with a ticket to punch, from the platform.
  const toPunch = c => L().filter(p => p.stock === c.id && p.s === 'sitting' && !p.punched);
  const order = coaches.slice().sort((a, b) => toPunch(b).length - toPunch(a).length);
  const c0 = order[0], thr0 = L().find(p => p.stock === c0.id && p.through);
  const t0 = evs.length;
  tick([{ t: 'pbPunch', tr: tr.id, stock: c0.id }]);
  if (!s.pb.job || s.pb.job.k !== 'enter') B('pbPunch from the platform did not set off to enter the coach');
  let sawClimb = false;
  for (let i = 0; i < 400 && !(P.in && !P.in.clm); i++) { tick(); const pose = Pb.pbPlayerPose(s); if (pose && pose.act === 'climb') sawClimb = true; }
  if (!P.in || P.in.stock !== c0.id) { B(`the player did not get into coach ${c0.id}: ${JSON.stringify(evs.slice(t0).filter(e => /^pb/.test(e.t)))}`); return out; }
  if (!evs.slice(t0).some(e => e.t === 'pbEnter' && e.stock === c0.id)) B('no pbEnter event');
  if (!sawClimb) B('the player\'s climb was never shown (pbPlayerPose)');
  if (JSON.stringify(Pb.pbCutaway(s)) !== JSON.stringify([c0.id])) B(`pbCutaway: ${JSON.stringify(Pb.pbCutaway(s))}`);
  if (P.y !== R.proto.PROTO_STOCK.coach.floor && P.y !== R.proto.PROTO_STOCK.coach.ends.deckY) B(`the player inside stands at y ${P.y}`);
  // A through rider's seat is refused.
  if (thr0 && !tick([{ t: 'pbPunch', tr: tr.id, stock: c0.id, seat: thr0.seat }]).some(e => e.t === 'pbRefused')) B('a through rider\'s ticket was taken');
  // Punch every coach: in this one by seat taps, then walk to the next over the end platforms (pbWalk), punching each.
  let sawTicket = null, sawPunch = null, punches = 0, crossed = 0;
  const punchOne = cmd => {
    const from = evs.length, n0 = L().filter(p => p.punched).length;
    tick([cmd]);
    for (let i = 0; i < 300 && !evs.slice(from).some(e => e.t === 'pbPunched' || e.t === 'pbRefused'); i++) {
      tick();
      if (!P.in) { B('the player left the train while punching'); return false; }
      const pose = Pb.pbPlayerPose(s);
      if (pose && pose.act === 'punch' && !sawPunch) { sawPunch = pose; sawTicket = Pb.pbDrawList(s).find(d => d.act === 'sitTicket') || null; out.punchState = JSON.stringify({ state: s }); }
    }
    const got = evs.slice(from).filter(e => e.t === 'pbPunched');
    if (got.length !== 1) { B(`a punch command gave ${got.length} punches (${JSON.stringify(evs.slice(from).filter(e => /^pb/.test(e.t)))})`); return false; }
    const p = L().find(q => q.id === got[0].id);
    if (!p || !p.punched || L().filter(q => q.punched).length !== n0 + 1) B('a punch did not mark exactly one traveller punched');
    if (cmd.seat !== undefined && p && p.seat !== cmd.seat) B(`the punch took seat ${p.seat}, not ${cmd.seat}`);
    const sl = Pb.pbSeatLocal(p.seat);
    if (Math.abs(P.in.s - sl.rx) > 1e-6 || P.in.f !== (sl.side === 'N' ? 'ne' : 'sw')) B(`the player punched from s ${P.in.s} facing ${P.in.f}, not beside row ${sl.row} facing across`);
    punches++;
    return true;
  };
  for (const c of order) {
    if (P.in.stock !== c.id) {
      const from = evs.length;
      tick([{ t: 'pbWalk', stock: c.id, s: 0 }]);
      for (let i = 0; i < 200 && !(P.in && P.in.stock === c.id && !P.in.ts); i++) { tick(); if (!P.in) { B('the player stepped down walking to the next coach'); return out; } }
      if (P.in.stock !== c.id) { B(`pbWalk did not reach coach ${c.id}: ${JSON.stringify(P.in)} ${JSON.stringify(evs.slice(from).filter(e => /^pb/.test(e.t)))}`); return out; }
      crossed++;
    }
    let guard = 0;
    while (toPunch(c).length && guard++ < 40) {
      const first = c === order[0] ? toPunch(c)[0] : null;
      if (!punchOne(first ? { t: 'pbPunch', tr: tr.id, stock: c.id, seat: first.seat } : { t: 'pbPunch', tr: tr.id, stock: c.id })) return out;
    }
    if (toPunch(c).length) B(`coach ${c.id} still has tickets to punch`);
  }
  if (punches !== m0.length) B(`${punches} punches for ${m0.length} travellers`);
  if (crossed < 1 && coaches.length > 1) B('never walked from coach to coach');
  out.notes.crossed = crossed;
  if (!sawPunch || !/^ppl\/agent\/punch\/(ne|sw)\/[0-2]$/.test(sawPunch.key)) B(`the agent's punch was not shown: ${JSON.stringify(sawPunch)}`);
  if (!sawTicket || !/^ppl\/[a-z_.]+\/sitTicket\/(se|nw|ne|sw)\/[01]$/.test(sawTicket.key)) B(`the traveller's ticket was not held out: ${JSON.stringify(sawTicket)}`);
  if (!Pb.pbDrawList(s).some(d => d.act === 'sit' && d.punched && !d.through)) B('no punched mark on a seated traveller');
  // 6. Still aboard: not ready, refused; a tap on the platform takes him off and on to it.
  if (Pb.pbReady(s, p1, tr) || !/off the train/.test(Pb.pbWhyNotReady(s, p1, tr) || '')) B(`ready with the player aboard (${Pb.pbWhyNotReady(s, p1, tr)})`);
  const tgt = { x: P.x, z: R.proto.PROTO.P1.z0 + 3 };
  tick([{ t: 'walkTo', x: Math.round(tgt.x * 100), z: Math.round(tgt.z * 100) }]);
  for (let i = 0; i < 200 && (P.in || P.mode === 'to'); i++) tick();
  if (P.in) B('a tap on the platform did not take the player off the train');
  else {
    if (!evs.some(e => e.t === 'pbLeave')) B('no pbLeave event');
    if (Math.hypot(P.x - tgt.x, P.z - tgt.z) > 0.6) B(`after stepping down the player did not walk on to the spot tapped (${P.x.toFixed(2)}, ${P.z.toFixed(2)})`);
    if (P.y !== undefined) B('S.player.y kept after stepping down');
  }
  if (!Pb.pbReady(s, p1, tr)) B(`p1 is not ready with everyone punched and the player off: ${Pb.pbWhyNotReady(s, p1, tr)}`);
  const st = Pb.pbRunStatus(s, p1);
  if (st.toPunch || st.boarding || st.off || st.waiting || st.punched !== m0.length || !st.ready) B(`p1's run status: ${JSON.stringify(st)}`);
  for (let i = 0; i < 40 && !p1.ready; i++) tick();
  const aboard = L().filter(p => p.stock !== null && coaches.some(c => c.id === p.stock)).length;
  const g0 = evs.filter(e => e.t === 'paxGone').length;
  wave();
  if (!evs.some(e => e.t === 'rrWavedOff' && e.run === p1.id)) B(`p1 was not sent off: ${JSON.stringify(evs.filter(e => e.t === 'rrRefused').slice(-1))}`);
  if (evs.filter(e => e.t === 'paxGone').length - g0 !== aboard) B('not everyone aboard left with the train');
  if (L().some(p => p.run === p1.id)) B('travellers of p1 left on the map');
  if (evs.some(e => e.t === 'pbMissed') || s.pd.stats.missed) B('travellers missed');
  if (s.pd.stats.punched !== m0.length || s.pb.tot.punched !== m0.length) B(`the day's figures: punched ${s.pd.stats.punched} (tot ${s.pb.tot.punched}), expected ${m0.length}`);
  if (coaches.some(c => s.pb.cars[c.id])) B('the seats of the coaches gone are still kept');
  // 7. The alternative rule (PB.RIDE_FREE) and a train heading west: p2.
  const p2 = runOf('p2');
  for (const q of s.rr.runs) if ((q.svc === 'x1' || q.svc === 'f1') && q.ph === 'due') q.ph = 'gone';
  const switchman = () => { const seen = new Set(); for (const n of R.rr.rrSwitchNeeds(s)) if (!n.passed && !seen.has(n.sw)) { seen.add(n.sw); s.track.switches[n.sw].state = n.want === 'reverse' ? 'R' : 'N'; } };
  for (let i = 0; i < 3000 && p2.ph !== 'stand'; i++) { switchman(); tick(); }   // the switches set by hand for every train (as check-d27world)
  if (p2.ph !== 'stand') B(`p2 did not come to stand (${p2.ph}; runs ${s.rr.runs.map(q => q.svc + ':' + q.ph).join(' ')}; trains ${s.trains.filter(t => t.owner === 'rr').map(t => t.id + ' ' + t.status).join(', ')}; switches ${s.track.switches.map(w => w.state).join('')})`);
  else {
    const tr2 = s.trains[p2.slot], v = Pb.pbCoachView(s, tr2.consist[1].id), C = R.proto.PROTO_STOCK.coach;
    if (!v || v.h !== 'w' || !(v.stove.x > v.cx) || v.seats.some(q => q.pos !== 'side' && q.f !== 'nw') || Math.abs(v.seats[0].x - (v.cx - (C.row0 + C.hipDx))) > 1e-6) B(`p2's coach view (heading west): ${JSON.stringify(v && { h: v.h, cx: v.cx, stove: v.stove, s0: v.seats[0] })}`);
    for (let i = 0; i < 300 && L().some(p => p.run === p2.id && p.to !== 'hub' && !p.through && p.s !== 'sitting'); i++) tick();
    const c = JSON.parse(JSON.stringify(s)), cr = c.rr.runs.find(q => q.id === p2.id), ctr = c.trains[cr.slot];
    const un = c.pax.list.filter(p => p.run === p2.id && p.s === 'sitting' && !p.punched).length;
    if (Pb.pbReady(c, cr, ctr)) B('p2 ready with tickets unpunched');
    Pb.PB.RIDE_FREE = true;
    const ready = Pb.pbReady(c, cr, ctr), ev2 = [], r = Pb.pbOnDepart(c, cr, ctr, ev2);
    Pb.PB.RIDE_FREE = false;
    if (!ready || !un || r.missed !== un || !ev2.some(e => e.t === 'pbMissed' && e.n === un) || c.pd.stats.missed !== un) B(`the ride-free rule: ready ${ready}, ${un} unpunched, missed ${r.missed}, stats ${c.pd.stats.missed}`);
    out.notes.rideFree = un;
  }
  // 8. Refusals outside a coach.
  for (const t of ['pbWalk', 'pbLeave']) if (!R.simTick(JSON.parse(JSON.stringify(S0)), [{ t, s: 1 }]).some(e => e.t === 'pbRefused')) B(`${t} outside a coach was not refused`);
  out.hash = R.stateHash(s);
  out.notes.events = [...new Set(evs.filter(e => /^pb/.test(e.t)).map(e => e.t))].sort().join(' ');
  return out;
}

module.exports = async function checkOnboard() {
  const problems = [], P = m => problems.push(m);
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
    try {
      await page.evaluate(src => { window.__onboard = (0, eval)('(' + src + ')'); }, script.toString());
      const a = await page.evaluate(() => window.__onboard());
      for (const b of a.bad) P(b);
      if (!a.bad.length || a.hash) {
        const b = await page.evaluate(() => window.__onboard());
        if (b.hash !== a.hash) P(`the same script twice gave different hashes (${a.hash}, ${b.hash})`);
        if (b.seats !== a.seats) P('the same script twice gave different seats');
      }
      // A save mid-boarding reloads with the same hash and plays on the same.
      if (a.midBoard) {
        const r = await page.evaluate(json => {
          const R = window.__railhead, A = JSON.parse(json).state, h0 = R.stateHash(A);
          const L = R.migrate(JSON.parse(json)).state, h1 = R.stateHash(L);
          for (let i = 0; i < 120; i++) { R.simTick(A, []); R.simTick(L, []); }
          return { h0, h1, a: R.stateHash(A), b: R.stateHash(L), ok: R.pb.pbCheckSaveShape(L) };
        }, a.midBoard);
        if (r.h0 !== r.h1) P(`a save mid-boarding reloaded with a different hash (${r.h0}, ${r.h1})`);
        if (r.a !== r.b) P(`after a reload mid-boarding the game went differently (${r.a}, ${r.b})`);
      }
      // A save mid-aisle (the player punching) reloads too.
      if (a.punchState) {
        const r = await page.evaluate(json => {
          const R = window.__railhead, A = JSON.parse(json).state, L = R.migrate(JSON.parse(json)).state;
          for (let i = 0; i < 60; i++) { R.simTick(A, []); R.simTick(L, []); }
          return { a: R.stateHash(A), b: R.stateHash(L), in: !!L.player.in };
        }, a.punchState);
        if (r.a !== r.b) P(`after a reload mid-aisle the game went differently (${r.a}, ${r.b})`);
      }
      // The debug scenario: travellers seated and waiting; the coach view's shape.
      const d = await page.evaluate(() => {
        const R = window.__railhead, Pb = R.pb, S = R.newState(1866, 'proto');
        R.importSave(JSON.stringify({ state: Pb.pbDebugScenario(R.rr.protoDebugScenario(S, 6, 55, ['p1'])) }));
        const s = R.state, tr = s.trains.find(t => t.owner === 'rr' && t.consist.length > 1), c = tr.consist.find(q => q.k === 'coach');
        const v = Pb.pbCoachView(s, c.id), L = s.pax.list;
        return { seated: L.filter(p => p.s === 'sitting' && !p.punched).length, waiting: L.filter(p => p.s === 'wait' || p.s === 'bench').length, hub: L.filter(p => p.to === 'hub').length,
          seats: v && v.seats.length, benches: v && v.benches.length, keys: v && [...new Set(v.benches.map(b => b.key))], lamps: v && v.lamps.length, who: v && v.seats.filter(q => q.who).length,
          st: Pb.pbCarStatus(s, c.id), cut: Pb.pbCutaway(s), pose: Pb.pbPlayerPose(s) };
      });
      if (!(d.seated > 0) || !(d.waiting > 0) || d.hub) P(`the d27coach scenario: ${d.seated} seated unpunched, ${d.waiting} waiting, ${d.hub} riders for the Hub`);
      if (d.seats !== 29 || d.benches !== 15 || d.lamps !== 2 || !(d.who > 0) || d.keys.some(k => !/^veh\/(seat|sidebench)\/(se|nw|ne|sw)$/.test(k))) P(`pbCoachView's shape: ${JSON.stringify(d)}`);
      if (!d.st || d.st.ends.length !== 2 || d.cut.length || d.pose !== null) P(`pbCarStatus / pbCutaway / pbPlayerPose outside: ${JSON.stringify(d)}`);
      console.log(`  p1: ${a.notes.travellers} travellers (at its arrival: ${a.notes.atArrival}), riders ${a.notes.riders}; coaches crossed inside ${a.notes.crossed}; ride-free alternative missed ${a.notes.rideFree}; hash ${a.hash}`);
      console.log(`  events: ${a.notes.events}; d27coach: ${d.seated} seated, ${d.waiting} waiting`);
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
      // Screenshot: the d27coach scenario with the player punching in a coach.
      await page.waitForFunction(() => window.__railhead.pix && window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => {});
      const sh = await page.evaluate(async () => {
        const R = window.__railhead, s = R.state, tr = s.trains.find(t => t.owner === 'rr' && t.consist.length > 1), c = tr.consist.find(q => q.k === 'coach' && s.pax.list.some(p => p.stock === q.id && p.s === 'sitting' && !p.punched));
        if (!c) return 'no coach to punch';
        R.send({ t: 'pbPunch', tr: tr.id, stock: c.id });
        for (let i = 0; i < 300 && !(s.pb.job && s.pb.job.k === 'punch' && s.pb.job.on); i++) R.step(1);
        if (R.pdui && R.pdui.closeBoard) R.pdui.closeBoard();
        R.camera.zoom = 1.5; R.pix.pixLookAt(s.player.x, s.player.z);
        await new Promise(r => setTimeout(r, 500));
        return s.pb.job && s.pb.job.on ? null : 'the player is not punching';
      });
      if (sh) P('screenshot: ' + sh);
      await page.screenshot({ path: screenshotPath('onboard-punch-portrait') });
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // With ?doorline=1 (check-punch's D25 line) none of this runs.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&doorline=1' });
    try {
      const r = await page.evaluate(() => {
        const R = window.__railhead, s = R.newState(1866, 'proto');
        R.simTick(s, []); s.track.switches[R.proto.PROTO_SW.W1].state = 'R';
        for (let i = 0; i < 1200; i++) R.simTick(s, []);
        return { on: R.pb.pbOn(s.track), pb: s.pb ? Object.keys(s.pb).length : 0, line: s.pax.list.filter(p => p.s === 'line').length };
      });
      if (r.on || r.pb || !(r.line > 0)) P(`?doorline=1: pbOn ${r.on}, S.pb ${r.pb} keys, ${r.line} in the D25 lines`);
      if (errors.length) P('doorline: console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  console.log('  screenshot: test-output/onboard-punch-portrait.png');
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
