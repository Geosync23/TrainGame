// Shared by check-smooth.js and the D29 measurements (node tests/smooth-play.js [coach|freight] [portrait|landscape]
// [throttle]): plays a coach punch sequence or a freight handling sequence in real time at 1x in Chromium at phone size
// and records every drawn frame: the camera's exact top-left (native px), the agent's drawn anchor (native px, from the
// sprite actually drawn), the frame's key, the time between frames, the pixel frame's own time, the sim tick and the
// sim's own state (in a coach, punching, the job's step). Works on any build (reads only what was drawn).

const { openGame, screenshotPath } = require('./browser');

// In the page: drives the sequence each frame (as a player tapping the next button at once) and records.
function recorder(kind, maxS) {
  const R = window.__railhead, X = R.pix, PIX = X.PIX, rec = [], t0 = performance.now();
  let last = null, phase = 'start', stock = null;
  const S = () => R.state;
  const drive = () => {
    const s = S(), P = s.player;
    if (kind === 'coach') {
      const job = s.pb && s.pb.job;
      const left = s.pax.list.filter(p => p.stock === stock && p.s === 'sitting' && !p.punched && !p.through && p.to !== 'hub');
      if (phase === 'start') { R.send({ t: 'pbPunch', stock }); phase = 'punch'; return; }
      if (phase === 'punch' && !job) {
        if (left.length) R.send({ t: 'pbPunch', stock });
        else if (P.in) { R.send({ t: 'pbLeave' }); phase = 'leave'; }
      }
      if (phase === 'leave' && !P.in) phase = 'done';
    } else {
      const F = s.fr, h = R.fr.frJobHint(s);
      if (!F.job && h && h.cmd) R.send(h.cmd);
      if (performance.now() - t0 > maxS * 1000) phase = 'done';
    }
  };
  if (kind === 'coach') {
    const p = S().pax.list.filter(q => q.s === 'sitting' && !q.punched && !q.through && q.to !== 'hub');
    const by = {}; for (const q of p) by[q.stock] = (by[q.stock] || 0) + 1;
    stock = +Object.keys(by).sort((a, b) => by[b] - by[a])[0];
  }
  return new Promise(res => {
    const step = (ts) => {
      const s = S(), P = s.player;
      const ag = (X.drawn || []).find(d => d.hit && d.hit.k === 'player' && d.key && d.key.startsWith('ppl/agent'));
      const f = ag ? X.frameOf(ag.key) : null;
      const pb = s.pb && s.pb.job, fj = s.fr && s.fr.job, st = fj && fj.steps[fj.i];
      rec.push({
        ts, dt: last === null ? 0 : ts - last, ms: PIX.stats.ms, tick: s.tick,
        cx: X.view.camX, cy: X.view.camY, scale: X.view.scale, dpr: X.view.dpr,
        ax: ag && f ? ag.l + f[5] : null, ay: ag && f ? ag.t + f[6] : null, key: ag ? ag.key : null,
        in: !!P.in, inCar: s.fr ? s.fr.inCar : null, tool: P.tool,
        mode: P.mode, sx: P.x, sz: P.z,
        pb: pb ? pb.k + (pb.k === 'punch' ? ':' + pb.on + ':' + pb.acc : '') : null,
        fr: st ? st.s + (st.a ? ':' + st.a : '') + ':' + fj.i + ':' + (fj.t0 < 0 ? -1 : s.time - fj.t0) : null,
        punched: s.pb ? s.pb.tot.punched : 0,
        // the platform cart's drawn anchor, and the good being handled (in the hands, being lifted or set down)
        cart: (() => { const d = (X.drawn || []).find(q => q.hit && q.hit.k === 'tool' && q.key && q.key.startsWith('cart27/')); const g = d && X.frameOf(d.key); return g ? [d.l + g[5], d.t + g[6]] : null; })(),
        ph: (() => { const L = X.lists, f = L && L.frPose; return f ? f.phase + (f.fin ? '*' : '') + (f.dir ? ':' + f.dir : '') : null; })(),
        good: (() => { const L = (X.lists && X.lists.fr) || (R.fr && R.fr.frDrawList(s)) || [], q = L.find(o => o.place === 'hand' || o.place === 'moving'); if (!q) return null; const d = (X.drawn || []).find(o => o.hit && o.hit.k === 'item' && o.hit.id === q.id); const g = d && X.frameOf(d.key); return g ? [d.l + g[5], d.t + g[6], q.id, q.place] : null; })(),
      });
      last = ts;
      drive();
      if (phase === 'done' || performance.now() - t0 > (maxS + 20) * 1000) res(rec); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Plays one sequence; returns the frames and the screenshots' paths.
async function play(kind, orient, opts = {}) {
  const throttle = opts.throttle || 1, maxS = opts.maxS || (kind === 'coach' ? 60 : 40);
  const { browser, page, errors } = await openGame(orient, { query: '?paused&debug=1&world=proto&d27=board,handling,town' + (opts.query || '') });
  try {
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(k => { const R = window.__railhead; window.rh.scenario(k === 'coach' ? 'd27coach' : 'd27freight'); R.pix.warm(true); }, kind);
    if (opts.setup) await page.evaluate(opts.setup);
    await page.waitForTimeout(800);
    const cdp = await page.context().newCDPSession(page);
    if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    await page.evaluate(() => window.__railhead.setSpeed(1));
    const shots = [];
    await page.evaluate(src => { window.__smoothSrc = src; }, recorder.toString());
    const p = page.evaluate(([k, m]) => (0, eval)('(' + window.__smoothSrc + ')')(k, m), [kind, maxS]);
    for (const [name, pred] of opts.shotAt || []) {
      await page.waitForFunction(pred, null, { timeout: (maxS + 10) * 1000, polling: 50 }).catch(() => {});
      const path = screenshotPath(name);
      await page.screenshot({ path }); shots.push(path);
    }
    const rec = await p;
    if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const end = await page.evaluate(() => { const R = window.__railhead; return { hash: R.hash(), tick: R.state.tick }; });
    return { rec, shots, errors: errors.slice(), end };
  } finally { await browser.close(); }
}

// Summary figures of a recording: the agent's drawn steps per frame (native px), still runs while the sim walks him,
// the camera's steps, frame times, the sim's idle ticks inside a job.
function summarise(rec) {
  const out = { frames: rec.length };
  const st = [], camSt = [], dts = [], ms = [];
  let stillRun = 0, worstStill = 0, stillFrames = 0, walkFrames = 0, bigJumps = 0;
  // The time (ms) the agent stood still on screen while the sim walked him, measured from the frame his drawn point last changed.
  let lastMoveTs = null;
  for (let i = 1; i < rec.length; i++) {
    const a = rec[i - 1], b = rec[i];
    dts.push(b.dt); ms.push(b.ms);
    camSt.push(Math.hypot(b.cx - a.cx, b.cy - a.cy));
    if (a.ax === null || b.ax === null) continue;
    const d = Math.hypot(b.ax - a.ax, b.ay - a.ay);
    if (d > 12) continue;   // a jump of the scene (not part of the walk)
    st.push(d);
    if (d > 2.01) bigJumps++;
    // walking: the sim's point moved within the last tick or so
    const simMoving = Math.hypot(b.sx - a.sx, b.sz - a.sz) > 1e-6 || (i > 8 && Math.hypot(b.sx - rec[i - 8].sx, b.sz - rec[i - 8].sz) > 1e-6 && Math.hypot(rec[Math.min(rec.length - 1, i + 8)].sx - b.sx, rec[Math.min(rec.length - 1, i + 8)].sz - b.sz) > 1e-6);
    if (simMoving) {
      walkFrames++;
      if (d < 1e-6) { stillFrames++; stillRun += b.dt; worstStill = Math.max(worstStill, stillRun); } else stillRun = 0;
    } else stillRun = 0;
  }
  const pct = (arr, p) => { const s = arr.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
  out.agentStepMax = +Math.max(0, ...st).toFixed(2);
  out.agentStepsOver2 = bigJumps;
  out.walkFrames = walkFrames; out.stillWhileWalking = stillFrames; out.worstStillMs = Math.round(worstStill);
  out.camStepMax = +Math.max(0, ...camSt).toFixed(2);
  out.camStepP98 = +pct(camSt, 0.98).toFixed(2);
  out.dtAvg = +(dts.reduce((x, y) => x + y, 0) / Math.max(1, dts.length)).toFixed(1); out.dtP98 = +pct(dts, 0.98).toFixed(1); out.dtMax = +Math.max(0, ...dts).toFixed(1);
  out.msAvg = +(ms.reduce((x, y) => x + y, 0) / Math.max(1, ms.length)).toFixed(2); out.msP98 = +pct(ms, 0.98).toFixed(2);
  // the agent's screen offset from the view's middle (native px), and how much it wanders frame to frame
  const off = rec.filter(r => r.ax !== null).map(r => [r.ax - r.cx, r.ay - r.cy]);
  let wob = 0; for (let i = 1; i < off.length; i++) { const d = Math.hypot(off[i][0] - off[i - 1][0], off[i][1] - off[i - 1][1]); if (d < 12) wob = Math.max(wob, d); }
  out.screenWobbleMax = +wob.toFixed(2);
  // the cart and the handled good against the agent: how much their offset from him jumps frame to frame (native px)
  const rel = (k) => { let m = 0, n = 0; for (let i = 1; i < rec.length; i++) { const a = rec[i - 1], b = rec[i]; if (!a[k] || !b[k] || a.ax === null || b.ax === null || (k === 'good' && (a.good[2] !== b.good[2] || a.good[3] !== 'hand' || b.good[3] !== 'hand' || a.ph !== b.ph))) continue; const d = Math.hypot((b[k][0] - b.ax) - (a[k][0] - a.ax), (b[k][1] - b.ay) - (a[k][1] - a.ay)); if (d < 12) { m = Math.max(m, d); if (d > 2.01) n++; } } return [+m.toFixed(2), n]; };
  [out.cartVsAgentMax, out.cartVsAgentOver2] = rel('cart');
  [out.goodVsAgentMax, out.goodVsAgentOver2] = rel('good');
  // a good being lifted or set down (drawn 'moving'): its drawn step a frame (native px), and how many over 3
  let mg = 0, mgn = 0;
  // (a turn of the agent, his sprite's facing changing, moves what he holds with it: not counted)
  const dirOf = k => (k && k.split('/')[3]) || null;
  for (let i = 1; i < rec.length; i++) { const a = rec[i - 1].good, b = rec[i].good; if (!a || !b || a[2] !== b[2] || (a[3] !== 'moving' && b[3] !== 'moving') || dirOf(rec[i - 1].key) !== dirOf(rec[i].key)) continue; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 20) { mg = Math.max(mg, d); if (d > 4.01) mgn++; } }
  out.liftStepMax = +mg.toFixed(2); out.liftStepsOver4 = mgn;
  out.ticks = rec.length ? rec[rec.length - 1].tick - rec[0].tick : 0;
  out.punched = rec.length ? rec[rec.length - 1].punched - rec[0].punched : 0;
  return out;
}

module.exports = { play, summarise, recorder };

if (require.main === module && process.argv[2] !== 'gaps') {
  const { stopServer } = require('./browser');
  (async () => {
    const kind = process.argv[2] || 'coach', orient = process.argv[3] || 'portrait', throttle = +(process.argv[4] || 1);
    const r = await play(kind, orient, { throttle });
    console.log(JSON.stringify({ kind, orient, throttle, ...summarise(r.rec), errors: r.errors.slice(0, 3), end: r.end }));
    if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, JSON.stringify(r.rec));
    stopServer();
  })();
}

// In the page, sim only (a copy of the scenario's state, simTick): the same sequence tick by tick, counting the ticks of
// a job in which nothing visible advances (the player does not move, no timed action or climb runs on), and the ticks
// each punch or job takes.
function simGaps(kind, maxTicks) {
  const R = window.__railhead, s = JSON.parse(JSON.stringify(R.state)), out = { idle: 0, idleAt: [], ticks: 0, jobs: [], steps: {} };
  let stock = null, phase = 'start', cmd = [], jobStart = null;
  if (kind === 'coach') {
    const by = {}; for (const q of s.pax.list) if (q.s === 'sitting' && !q.punched && !q.through && q.to !== 'hub') by[q.stock] = (by[q.stock] || 0) + 1;
    stock = +Object.keys(by).sort((a, b) => by[b] - by[a])[0];
  }
  for (let n = 0; n < maxTicks && phase !== 'done'; n++) {
    const P = s.player;
    cmd = [];
    if (kind === 'coach') {
      const job = s.pb && s.pb.job, left = s.pax.list.filter(p => p.stock === stock && p.s === 'sitting' && !p.punched && !p.through && p.to !== 'hub');
      if (phase === 'start') { cmd.push({ t: 'pbPunch', stock }); phase = 'punch'; jobStart = s.tick; }
      else if (phase === 'punch' && !job) {
        if (left.length) { cmd.push({ t: 'pbPunch', stock }); jobStart = s.tick; }
        else if (P.in) { cmd.push({ t: 'pbLeave' }); phase = 'leave'; }
      } else if (phase === 'leave' && !P.in) phase = 'done';
    } else {
      const h = R.fr.frJobHint(s);
      if (!s.fr.job && h && h.cmd) { cmd.push(h.cmd); out.jobs.push(h.cmd.t); }
    }
    const x0 = P.x, z0 = P.z, y0 = P.y, I0 = P.in ? JSON.stringify(P.in) : null, pj = s.pb && s.pb.job ? JSON.stringify(s.pb.job) : null;
    const fj = s.fr && s.fr.job, fk = fj ? fj.i + ':' + (fj.t0 < 0 ? -1 : s.time - fj.t0) + ':' + fj.go : null, doors = JSON.stringify(s.fr && s.fr.doors);
    const busy = kind === 'coach' ? !!(s.pb.job || P.in) : !!(s.fr.job);
    const ev = R.simTick(s, cmd);
    out.ticks++;
    const moved = Math.hypot(P.x - x0, P.z - z0) > 1e-9 || P.y !== y0;
    if (kind === 'coach') {
      const J = s.pb.job, prog = J && J.k === 'punch' && J.on && J.acc > 0 && JSON.stringify(J) !== pj, climb = P.in && P.in.clm;
      for (const e of ev) if (e.t === 'pbPunched') out.jobs.push(s.tick - jobStart);
      const done = ev.some(e => e.t === 'pbPunched' || e.t === 'pbLeave');
      if (busy && !moved && !prog && !climb && !done && phase !== 'done') { out.idle++; out.idleAt.push(s.tick + ':' + (J ? J.k + (J.on ? 'on' : 'off') + J.acc : I0)); }
    } else {
      const fj2 = s.fr.job, fk2 = fj2 ? fj2.i + ':' + (fj2.t0 < 0 ? -1 : s.time - fj2.t0) + ':' + fj2.go : null;
      const st = fj2 && fj2.steps[fj2.i], acting = st && st.s === 'act' && fj2.t0 >= 0 && s.time - fj2.t0 > 0;
      const done = ev.some(e => /^fr(Taken|Put|Door|Stored|Delivered|Done|Unloaded|Loaded)$|^tool(Taken|Left)$/.test(e.t));
      if (st) out.steps[st.s + (st.a ? ':' + st.a : '')] = (out.steps[st.s + (st.a ? ':' + st.a : '')] || 0) + 1;
      if (busy && !moved && !acting && !done && JSON.stringify(s.fr.doors) === doors) { out.idle++; if (out.idleAt.length < 40) out.idleAt.push(s.tick + ':' + (st ? st.s + ':' + (st.a || '') : 'none') + ':' + fk + '>' + fk2); }
    }
  }
  return out;
}
module.exports.simGaps = simGaps;
if (require.main === module && process.argv[2] === 'gaps') {
  (async () => {
    const { openGame } = require('./browser'), { stopServer } = require('./browser');
    for (const kind of ['coach', 'freight']) {
      const { browser, page } = await openGame('portrait', { query: '?paused&debug=1&world=proto&d27=board,handling,town' });
      await page.evaluate(k => window.rh.scenario(k === 'coach' ? 'd27coach' : 'd27freight'), kind);
      const r = await page.evaluate(([src, k]) => (0, eval)('(' + src + ')')(k, k === 'coach' ? 400 : 300), [simGaps.toString(), kind]);
      console.log(kind, JSON.stringify(r));
      await browser.close();
    }
    stopServer();
  })();
}
