// Check: prototype passengers (D25, builder P; plans/proto-tech.md section 3): the line and the punch.
// A scripted day in the prototype (the switches set by hand, as check-protoworld does), on a copy of a new game:
// - Before p1 comes in, its travellers walk in from the street's far end and stand in lines on platform 1 at the coach
//   door positions (ppLineSpots), which match where the coaches' doors really stop (the train's poses).
// - When it stands, the riders for the Hub step off first (no punch is taken at a coach until its riders are off) and
//   walk off up the street, leaving the map.
// - Each punch command punches exactly one ticket: the head of that door's line, who then boards (ppBoarded); the
//   player walks to the punch spot, the agent's punch and the traveller's ticket animation are shown (ppPlayerAct,
//   ppDrawList), the next in line steps up.
// - ppReady only once nobody is in line, boarding or stepping off (rrReady then); the wave-off leaves nobody behind;
//   pdCount's punched and missed match; the left-behind alternative (ppOnDepart with travellers in line) counts them
//   as missed and they walk home.
// - Through runs carry nobody; travellers use the atlas' people types; the same script twice gives the same hash.
// - Screenshots (portrait and landscape): lines at the coaches, and the agent punching, drawn by the pixel renderer.

const { openGame, screenshotPath } = require('./browser');

// The scripted day, run inside the page (a copy of a new prototype game, simTick). Returns the findings.
function script() {
  const R = window.__railhead, Pp = R.pp, S0 = R.newState(1866, 'proto'), out = { bad: [], notes: {} }, B = m => out.bad.push(m);
  const s = JSON.parse(JSON.stringify(S0)), evs = [], SW = R.proto.PROTO_SW;
  const tick = (cmds) => { const e = R.simTick(s, cmds || []); evs.push(...e); return e; };
  const runOf = svc => s.rr.runs.find(q => q.svc === svc && q.day === 0);
  const L = () => s.pax.list;
  tick();
  s.track.switches[SW.W1].state = 'R';   // p1 comes in from the west to track 1
  const p1 = runOf('p1');
  // 1. Lines form before the arrival.
  for (let i = 0; i < 2000 && p1.ph !== 'stand'; i++) {
    tick();
    const m = L().filter(p => p.run === p1.id);
    for (const p of m) if (p.s === 'come' && p.z < -5000 && !out.fromStreet) out.fromStreet = true;
    if (!out.lineState && m.length && m.every(p => p.s === 'line' && !p.path.length) && !s.pax.pp.due.some(d => d[1] === p1.id)) { out.lineState = JSON.stringify(s); out.notes.linedUp = (s.time + R.CFG.DAY_START_S) % 86400; out.notes.arrIn = p1.arr - s.time; }
  }
  if (!out.fromStreet) B('p1\'s travellers did not walk in from the street\'s end');
  if (!out.lineState) B('p1\'s travellers were never all in line before it stood');
  if (p1.ph !== 'stand') { B(`p1 did not come to stand (${p1.ph})`); return out; }
  const lineEv = evs.find(e => e.t === 'ppLine' && e.run === p1.id);
  if (!lineEv) B('no ppLine event for p1');
  const mine = L().filter(p => p.run === p1.id && p.to !== 'hub');
  out.notes.planned = lineEv ? lineEv.n : 0;
  if (!(mine.length >= Pp.PP.PER_TRAIN[0] && mine.length <= Pp.PP.PER_TRAIN[1])) B(`${mine.length} travellers for p1 (expected ${Pp.PP.PER_TRAIN})`);
  if (mine.some(p => p.s !== 'line')) B(`at p1's arrival not everyone is in line: ${mine.map(p => p.s).join(', ')}`);
  if (s.pax.pp.due.some(d => d[1] === p1.id)) B('travellers for p1 still to set off at its arrival');
  const firstLine = evs.findIndex(e => e.t === 'paxArrived'), arrIdx = evs.findIndex(e => e.t === 'rrArrived' && e.run === p1.id);
  if (!(firstLine >= 0 && firstLine < arrIdx)) B('travellers did not come before p1 arrived');
  // They came from the street's far end.
  const firstArr = evs.find(e => e.t === 'paxArrived');
  out.notes.firstCame = firstArr ? firstArr.id : null;
  const who = new Set(mine.map(p => p.who));
  for (const w of who) if (!/^(man_top|man_bowler|man_bag|woman_bonnet|woman_shawl|child|worker|porter)(\.b)?$/.test(w)) B(`a traveller of an unknown type: ${w}`);
  // The line spots are where the doors stopped: each door spot within a coach, a quarter of its length from its middle.
  const tr = s.trains[p1.slot], poses = R.trainPoses(s.track, tr), spots = Pp.ppLineSpots(s, p1);
  if (spots.length !== 2 * (tr.consist.length - 1)) B(`${spots.length} door spots for ${tr.consist.length - 1} coaches`);
  for (const sp of spots) {
    const ps = poses[sp.car + 1];
    if (!ps || Math.abs(Math.abs(sp.dx - ps.x) - ps.len / 4) > 0.05) B(`door ${sp.car}/${sp.door} at x ${sp.dx.toFixed(2)} is not a quarter along coach ${sp.car} (centre ${ps && ps.x.toFixed(2)})`);
    if (!(sp.dz < R.proto.PROTO.P1.z1 && sp.z < sp.dz && sp.z - 4 * Pp.PP.GAP > R.proto.PROTO.P1.z0)) B(`door ${sp.car}/${sp.door}'s line is not on platform 1`);
  }
  // Each traveller in line stands at its door's line, one behind another.
  for (const p of mine) {
    const sp = spots.find(q => q.car * 2 + q.door === p.ln);
    if (!sp || Math.abs(p.x / 100 - sp.x) > 0.05 || p.z / 100 > sp.z + 0.05 || Math.abs((sp.z - p.z / 100) / Pp.PP.GAP - Math.round((sp.z - p.z / 100) / Pp.PP.GAP)) * Pp.PP.GAP > 0.05) B(`traveller ${p.id} is not in its line (${p.x / 100}, ${p.z / 100})`);
  }
  out.notes.lines = spots.map(sp => mine.filter(p => p.ln === sp.car * 2 + sp.door).length).join(' ');
  out.standState = JSON.stringify(s);   // for the screenshot: the lines at the standing coaches
  // 2. Riders step off first.
  const riders = L().filter(p => p.run === p1.id && p.to === 'hub');
  out.notes.riders = riders.length;
  if (!(riders.length >= Pp.PP.OFF[0] && riders.length <= Pp.PP.OFF[1])) B(`${riders.length} riders stepping off (expected ${Pp.PP.OFF})`);
  if (Pp.ppReady(s, p1, tr)) B('ppReady while travellers are in line and riders aboard');
  // A punch at a coach with riders still aboard is refused.
  const rc = riders[0];
  if (rc) {
    const e = tick([{ t: 'punch', tr: tr.id, car: rc.car }]);
    if (!e.some(q => q.t === 'ppRefused')) B('a punch was taken at a coach whose riders had not stepped off');
  }
  for (let i = 0; i < 100 && L().some(p => p.to === 'hub' && (p.s === 'aboard' || p.s === 'step')); i++) tick();
  if (L().some(p => p.to === 'hub' && (p.s === 'aboard' || p.s === 'step'))) B('the riders did not all step off');
  const offN = evs.filter(e => e.t === 'ppOff' && e.run === p1.id).length;
  if (offN !== riders.length) B(`${offN} ppOff events for ${riders.length} riders`);
  // 3. Punching: one command, one ticket, the head of the line, who boards.
  let punches = 0, sawAct = null, sawTicket = null, guard = 0;
  while (L().some(p => p.run === p1.id && p.s === 'line') && guard++ < 20) {
    const status = tr.consist.slice(1).map(c => Pp.ppCarStatus(s, c.id)).find(c => c && c.line);
    if (!status) { B('travellers in line but no coach shows a line'); break; }
    const sp = spots.find(q => q.car === status.car && q.door === status.door), ln = status.car * 2 + status.door;
    const line0 = L().filter(p => p.run === p1.id && p.ln === ln && p.s === 'line').sort((a, b) => a.q - b.q), head = line0[0];
    const n0 = L().filter(p => p.run === p1.id && (p.s === 'line' || p.s === 'come')).length;
    const from = evs.length;
    tick([{ t: 'punch', tr: tr.id, car: status.stock }]);
    for (let i = 0; i < 400 && !evs.slice(from).some(e => e.t === 'ppPunched' || e.t === 'ppRefused' || e.t === 'ppStopped'); i++) {
      tick();
      const a = Pp.ppPlayerAct(s);
      if (a && !sawAct) { sawAct = a; const d = Pp.ppDrawList(s).find(q => q.act === 'ticket'); sawTicket = d || null; out.punchState = JSON.stringify(s); }
    }
    const got = evs.slice(from).filter(e => e.t === 'ppPunched');
    if (got.length !== 1) { B(`a punch command gave ${got.length} punches (${JSON.stringify(evs.slice(from).filter(e => /^pp/.test(e.t)))})`); break; }
    punches++;
    if (got[0].id !== head.id) B(`the punch took traveller ${got[0].id}, not the head of the line ${head.id} (status ${JSON.stringify(status)}, line ${JSON.stringify(line0.map(p => [p.id, p.q, p.ln, p.x, p.z]))}, evs ${JSON.stringify(evs.slice(from).filter(e => /^pp/.test(e.t)))}, player ${s.player.x.toFixed(2)},${s.player.z.toFixed(2)})`);
    if (Math.hypot(s.player.x - sp.px, s.player.z - sp.pz) > Pp.PP.NEAR) B('the player did not punch at the punch spot');
    const n1 = L().filter(p => p.run === p1.id && (p.s === 'line' || p.s === 'come')).length;
    if (n1 !== n0 - 1) B(`a punch took ${n0 - n1} from the lines`);
    for (let i = 0; i < 20 && L().find(p => p.id === head.id).s !== 'aboard'; i++) tick();
    if (L().find(p => p.id === head.id).s !== 'aboard') B(`traveller ${head.id} punched but did not board`);
    if (!evs.some(e => e.t === 'ppBoarded' && e.id === head.id)) B(`no ppBoarded for ${head.id}`);
    // The next in line stepped up to the head.
    const next = line0[1];
    if (next) { for (let i = 0; i < 10 && L().find(p => p.id === next.id).path.length; i++) tick(); const q = L().find(p => p.id === next.id); if (q.s === 'line' && Math.abs(q.z / 100 - sp.z) > 0.05) B('the next in line did not step up to the head'); }
  }
  if (punches !== mine.length) B(`${punches} punches for ${mine.length} travellers`);
  if (!sawAct || sawAct.act !== 'punch') B('the agent\'s punch was never shown (ppPlayerAct)');
  if (!sawTicket || !/^ppl\/[a-z_.]+\/ticket\/(se|ne|sw|nw)\/[01]$/.test(sawTicket.key)) B(`the traveller's ticket animation was not shown: ${JSON.stringify(sawTicket)}`);
  out.notes.punchAct = sawAct; out.notes.ticketKey = sawTicket && sawTicket.key;
  // The draw list: walk / idle / board keys of the atlas' shape.
  const keys = new Set();
  // 4. Ready, sent off, counts.
  for (let i = 0; i < 60 && !evs.some(e => e.t === 'rrReady' && e.run === p1.id); i++) { tick(); for (const d of Pp.ppDrawList(s)) keys.add(d.act); }
  if (!Pp.ppReady(s, p1, tr)) B('ppReady is false with nobody in line');
  if (!evs.some(e => e.t === 'rrReady' && e.run === p1.id)) B('p1 never became ready');
  const st = Pp.ppRunStatus(s, p1);
  if (st.on !== mine.length || st.line || st.waiting || st.off) B(`p1's run status: ${JSON.stringify(st)}`);
  s.track.switches[SW.W1].state = 'N'; s.track.switches[SW.E1].state = 'R';
  const ws = R.rr.rrWaveSpot(s, tr.id); Object.assign(s.player, { x: ws.x, z: ws.z, mode: 'idle' });   // beside the engine, clear of the footbridge's stair (T's wave spot)
  const before = L().length;
  tick([{ t: 'rrWaveOff', tr: tr.id }]);
  if (!evs.some(e => e.t === 'rrWavedOff' && e.run === p1.id)) B(`p1 was not sent off: ${JSON.stringify(evs.filter(e => e.t === 'rrRefused').slice(-1))}`);
  if (L().some(p => p.run === p1.id && p.to !== 'hub')) B('travellers of p1 left behind after it was sent off');
  if (evs.some(e => e.t === 'ppMissed')) B('ppMissed after a train sent off with an empty line');
  if (s.pd.stats.punched !== mine.length || s.pd.stats.missed !== 0) B(`the day's figures: punched ${s.pd.stats.punched}, missed ${s.pd.stats.missed} (expected ${mine.length}, 0)`);
  out.notes.leftWithTrain = before - L().length;
  // The riders reach the street's end and leave the map.
  for (let i = 0; i < 400 && L().some(p => p.run === p1.id); i++) tick();
  if (L().some(p => p.run === p1.id)) B(`riders of p1 still on the map: ${L().filter(p => p.run === p1.id).map(p => p.s + '@' + p.x / 100 + ',' + p.z / 100).join(' ')}`);
  const gone = evs.filter(e => e.t === 'paxGone').length;
  if (gone !== mine.length + riders.length) B(`${gone} paxGone events (expected ${mine.length + riders.length})`);
  for (const k of ['walk', 'board']) if (!keys.has(k) && k !== 'board') B(`no '${k}' in the draw list`);
  const drawn = Pp.ppDrawList(JSON.parse(out.punchState));
  for (const d of drawn) if (!/^ppl\/[a-z_.]+\/(idle|walk|ticket|board)\/(se|ne|sw|nw)\/\d$/.test(d.key) || typeof d.y !== 'number') B(`a draw list entry: ${JSON.stringify(d)}`);
  if (!drawn.some(d => d.y > 0)) B('nobody on the platform deck is drawn at its height');
  // 5. Through runs carry nobody.
  for (const r of s.rr.runs.filter(q => q.through)) {
    if (Pp.ppLineSpots(s, r).length) B(`through run ${r.svc} has line spots`);
    if (s.pax.pp.plan.includes(r.id)) B(`travellers planned for through run ${r.svc}`);
  }
  // 6. The left-behind alternative: p2 sent off with travellers still in line (ppOnDepart directly, whatever the wave-off rule).
  s.track.switches[SW.E1].state = 'R';
  const p2 = runOf('p2');
  for (const q of s.rr.runs) if ((q.svc === 'x1' || q.svc === 'f1') && q.ph === 'due') q.ph = 'gone';   // the through train (T's) and f1 (F's) out of the way here
  for (let i = 0; i < 3000 && p2.ph !== 'stand'; i++) tick();
  if (p2.ph !== 'stand') B(`p2 did not come to stand (${p2.ph}; runs ${s.rr.runs.map(q => q.svc + ':' + q.ph).join(' ')}, time ${s.time})`);
  else {
    const c = JSON.parse(JSON.stringify(s)), cr = c.rr.runs.find(q => q.id === p2.id), ctr = c.trains[cr.slot], ev2 = [];
    const inLine = c.pax.list.filter(p => p.run === p2.id && (p.s === 'line' || p.s === 'come')).length;
    const r = Pp.ppOnDepart(c, cr, ctr, ev2);
    if (!inLine || r.missed !== inLine || !ev2.some(e => e.t === 'ppMissed' && e.n === inLine) || c.pd.stats.missed !== inLine) B(`left behind: ${inLine} in line, missed ${r.missed}, stats ${c.pd.stats.missed}`);
    if (c.pax.list.some(p => p.run === p2.id && p.s !== 'left' && p.to !== 'hub')) B('a traveller left behind is not walking home');
    out.notes.p2missed = r.missed;
  }
  out.hash = R.stateHash(s);
  out.notes.events = [...new Set(evs.filter(e => /^pp/.test(e.t)).map(e => e.t))].sort().join(' ');
  return out;
}

module.exports = async function checkPunch() {
  const problems = [];
  let shared = null;
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    try {
      if (orient === 'portrait') {
        const a = await page.evaluate(script), b = await page.evaluate(script);
        problems.push(...a.bad);
        if (a.hash !== b.hash) problems.push(`the same script twice gave different results (${a.hash}, ${b.hash})`);
        console.log(`  all in line at ${a.notes.linedUp} s of the day (${a.notes.arrIn} s before p1 is due); travellers for p1 ${a.notes.planned} (lines by door: ${a.notes.lines}), riders off ${a.notes.riders}, left with the train ${a.notes.leftWithTrain}, ` +
          `p2 left behind (alternative) ${a.notes.p2missed}; punch ${JSON.stringify(a.notes.punchAct)}, ticket ${a.notes.ticketKey}; events: ${a.notes.events}; hash ${a.hash}`);
        shared = { line: a.lineState, stand: a.standState, punch: a.punchState };
      }
      if (!shared || !shared.line || !shared.punch) { problems.push(`${orient}: no states for the screenshots`); continue; }
      const shot = async (name, json, zoom, fx, fz) => {
        await page.evaluate(([json, zoom, fx, fz]) => {
          const R = window.__railhead; R.importSave(JSON.stringify({ state: JSON.parse(json) }));
          const P = R.state.player; R.camera.zoom = zoom; R.camera.ox = (fx === null ? P.x : fx) - P.x; R.camera.oz = (fz === null ? P.z : fz) - P.z;
        }, [json, zoom, fx, fz]);
        await page.waitForTimeout(500);
        await page.screenshot({ path: screenshotPath(`punch-${name}-${orient}`) });
      };
      await shot('line', shared.line, 1.6, -2, -8);
      await shot('stand', shared.stand, 1.6, -2, -8);
      await shot('punching', shared.punch, 2.6, null, null);
      if (errors.length) problems.push(`${orient}: console errors: ${errors.join(' | ')}`);
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
