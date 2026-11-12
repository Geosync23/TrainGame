// D30 (the designer: "Train animation is very juddery, let's smooth it out"). Shared by check-smooth.js's train case
// and the D30 measurements: plays a railroad train in real time in Chromium at phone size and records every drawn
// frame: each vehicle's drawn sprite (its anchor in native px, its heading frame), the exact point the renderer
// blended it to (the pose between the tick before and this one, projected, not rounded), the camera's exact top-left,
// the player's drawn point, the smoke puffs drawn, frame times and the sim's state (tick, alpha, speed, the train's v).
// Works on any build (reads only what was drawn, plus the page's prevPoses / curPoses).
//
//   node tests/train-play.js <setup> [portrait|landscape] [speed] [throttle]     (DUMP=file.json writes the frames)
//
// Setups (p1, three coaches, comes in from the west on track 1 through the W1 crossover and leaves east through E1):
//   platform  the player stands on platform 1 (the camera locked on him): the train comes in, brakes, stops, stands
//             a while, starts off and leaves;
//   walk      the same, the player walking east along platform 1 beside the train as it comes in and as it leaves;
//   curveW    the player stands by the W1 crossover: the train comes round its curves and straightens onto track 1;
//   curveE    the player stands by the E1 crossover: the train starts off from platform 1 and goes round its curves.

const { openGame } = require('./browser');
// a frame's drawn step may exceed its exact step by one step along the rails (2.24 px) at most; a car may stand still
// on screen until its exact point has moved STILL_PX
const JUMP_PX = 2.3, STILL_PX = 2.5;

// In the page: plays the setup and records each frame.
function trainRecorder(setup, maxS) {
  const R = window.__railhead, X = R.pix, PIX = X.PIX, rec = [], t0 = performance.now();
  const run = () => S.rr.runs.find(r => r.svc === 'p1' && r.day === 0);
  const trOf = () => { const r = run(); return r && r.slot !== null && r.slot !== undefined ? S.trains[r.slot] : null; };
  const setSw = () => { for (const n of rrSwitchNeeds(S)) { const W = S.track.switches.find(w => w.id === n.sw); if (W && !W.spring && !n.passed) W.state = n.want === 'reverse' ? 'R' : 'N'; } };
  let last = null, lastTick = -1, phase = 'in', standT = null, done = false;
  const z1 = PROTO.P1.z1 - 2.2;
  return new Promise(res => {
    const step = (ts) => {
      const tr = trOf(), rn = run();
      if (S.tick !== lastTick) {
        lastTick = S.tick; setSw();
        if (tr && rn.ph === 'stand' && phase === 'in') { phase = 'stand'; standT = S.tick; }
        if (phase === 'stand' && S.tick - standT >= 12) {
          phase = 'out'; rrDepart(S, rn, tr, [], false);
          if (setup === 'walk') R.send({ t: 'walkTo', x: 28, z: z1 });
        }
      }
      const ti = tr ? tr.id : -1, cp = curPoses && curPoses[ti] || [], pp = prevPoses && prevPoses[ti] || [];
      const a = speed > 0 ? acc : 1, blend = pp.length === cp.length;
      // exact: the blended pose as pixScene works it out (before any D30 change), projected
      const exact = cp.map((b, vi) => { const q = blend ? pp[vi] : b, x = lerp(q.x, b.x, a), z = lerp(q.z, b.z, a), yaw = lerpAngle(q.yaw, b.yaw, a), p = pixProject(x, 0, z); return [p.x, p.y, yaw, x, z]; });
      const stockIds = tr ? tr.consist.map(c => c.id) : [];
      const drawn = (X.drawn || []).filter(d => d.hit && d.hit.k === 'tr' && d.hit.id === ti && d.key && /^veh\//.test(d.key));
      const cars = stockIds.map(sid => { const d = drawn.find(q => q.hit.stock === sid); if (!d) return null; const f = X.frameOf(d.key); return [d.l + f[5], d.t + f[6], d.key]; });
      const ag = (X.drawn || []).find(d => d.hit && d.hit.k === 'player' && d.key && d.key.startsWith('ppl/agent')), af = ag ? X.frameOf(ag.key) : null;
      // the smoke: each puff drawn, matched to the nearest puff of PIX.smoke (numbered here) by where it should be
      const pd = (X.drawn || []).filter(d => d.key && d.key.startsWith('fx/smoke/')).map(d => { const f = X.frameOf(d.key); return [d.l + f[5], d.t + f[6], +d.key.split('/')[2]]; });
      PIX.__puffN = PIX.__puffN || 0;
      const pe = (PIX.smoke || []).map(q => { if (q.__id === undefined) q.__id = PIX.__puffN++; const y = (q.y0 || 3.7) + q.age * 1.4, p = pixProject(q.x + q.age * 0.6, y, q.z - q.age * 0.3); return [p.x, p.y, q.__id, q.age]; });
      const puffs = pd.map(d => { let best = null, bd = Infinity; for (const e of pe) { const k = Math.hypot(e[0] - d[0], e[1] - d[1]); if (k < bd) { bd = k; best = e; } } return [d[0], d[1], d[2], best ? best[2] : -1, best ? +best[3].toFixed(3) : null]; });
      rec.push({
        ts, dt: last === null ? 0 : ts - last, ms: PIX.stats.ms, tick: S.tick, alpha: a, speed, ph: rn ? rn.ph : null, v: tr ? tr.v : 0,
        cx: X.view.camX, cy: X.view.camY, ax: ag && af ? ag.l + af[5] : null, ay: ag && af ? ag.t + af[6] : null, px: S.player.x, pz: S.player.z,
        cars, exact, blend: cp.length ? blend && pp.some((q, i) => q.x !== cp[i].x || q.z !== cp[i].z) : null, smooth: PIX.SMOOTH_TRAINS === undefined ? null : !!PIX.SMOOTH_TRAINS, puffs,
      });
      last = ts;
      const front = cp[0];
      if (setup === 'curveW' && front && front.x > -5) done = true;
      if (phase === 'out' && front && front.x > (setup === 'curveE' ? 105 : 62)) done = true;
      if (phase === 'out' && !cp.length) done = true;
      if (done || performance.now() - t0 > maxS * 1000) res(rec); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Prepares the setup (sim only, fast) and plays it in real time.
async function playTrain(setup, orient, opts = {}) {
  const throttle = opts.throttle || 1, sp = opts.speed || 1, maxS = opts.maxS || 120 / sp;
  const { browser, page, errors } = await openGame(orient, { query: '?paused&debug=1&world=proto&d27=board,handling,town' + (opts.query || '') });
  try {
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => {});
    const prep = await page.evaluate(([setup, before]) => {
      const R = window.__railhead;
      DBG_SCENARIOS.d30train = () => protoDebugScenario(newState(CFG.SEED, 'proto'), 6, 25, []);
      window.rh.scenario('d30train'); R.pix.warm(true);
      if (before) (0, eval)(before);
      const run = () => S.rr.runs.find(r => r.svc === 'p1' && r.day === 0), trOf = () => { const r = run(); return r && r.slot !== null && r.slot !== undefined ? S.trains[r.slot] : null; };
      const setSw = () => { for (const n of rrSwitchNeeds(S)) { const W = S.track.switches.find(w => w.id === n.sw); if (W && !W.spring && !n.passed) W.state = n.want === 'reverse' ? 'R' : 'N'; } };
      const z1 = PROTO.P1.z1 - 2.2;
      // where the real-time part starts: the front at this x on the way in (curveE: standing, then sent off at once)
      const startX = { platform: -48, walk: -48, curveW: -95, curveE: null }[setup];
      for (let i = 0; i < 600; i++) {
        setSw(); R.step(1);
        const tr = trOf(), p = tr && curPoses[tr.id];
        if (startX !== null && p && p.length && p[0].x >= startX) break;
        if (startX === null && run().ph === 'stand') break;
      }
      if (setup === 'curveW') R.pix.placePlayer(-52, -14.5);
      if (setup === 'curveE') { R.pix.placePlayer(70, -12); rrDepart(S, run(), trOf(), [], false); }
      if (setup === 'walk') { R.pix.placePlayer(-26, z1); R.send({ t: 'walkTo', x: 26, z: z1 }); }
      R.step(1);
      return { tick: S.tick, x: S.player.x, z: S.player.z };
    }, [setup, opts.before || null]);
    if (opts.setup) await page.evaluate(opts.setup);
    await page.waitForTimeout(600);
    const cdp = await page.context().newCDPSession(page);
    if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    await page.evaluate(src => { window.__trainSrc = src; }, trainRecorder.toString());
    await page.evaluate(n => window.__railhead.setSpeed(n), sp);
    const rec = await page.evaluate(([k, m]) => (0, eval)('(' + window.__trainSrc + ')')(k, m), [setup, maxS]);
    if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    if (opts.shot) await page.screenshot({ path: require('./browser').screenshotPath(opts.shot) });
    return { rec, prep, errors: errors.slice() };
  } finally { await browser.close(); }
}

// Summary figures (native px unless named otherwise).
function summariseTrain(rec) {
  const out = { frames: rec.length };
  const pct = (arr, p) => { const s = arr.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
  const hdg = k => (k && k.split('/')[2]) || null;
  const dts = rec.slice(1).map(r => r.dt), ms = rec.map(r => r.ms);
  out.dtAvg = +(dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length)).toFixed(1); out.dtP98 = +pct(dts, 0.98).toFixed(1); out.dtMax = +Math.max(0, ...dts).toFixed(1);
  out.msAvg = +(ms.reduce((a, b) => a + b, 0) / Math.max(1, ms.length)).toFixed(2); out.msP98 = +pct(ms, 0.98).toFixed(2);
  out.ticks = rec.length ? rec[rec.length - 1].tick - rec[0].tick : 0;
  out.blendedFrames = rec.filter(r => r.blend).length; out.movingFrames = 0;
  // per car, frame to frame: the drawn step, the exact (blended, unrounded) step, still runs while the exact point moves
  const steps = [], err = [], stepErr = [];
  let straightPairs = 0, straightGapChanges = 0, straightGapMax = 0, jumps = 0, worstStillMs = 0, stillOver = 0, headingChanges = 0, flickers = 0, hdgJumpMax = 0, spacingChanges = 0, spacingMax = 0, railPhase = 0, railPhaseFrames = 0, moveFrames = 0;
  const nCars = Math.max(0, ...rec.map(r => r.cars.length));
  const still = Array(nCars).fill(0), stillAcc = Array(nCars).fill(0), hist = Array.from({ length: nCars }, () => []);
  // even steps: at each drawn step of a car, the exact motion since its last drawn step against that step (0 for a
  // car whose steps follow its exact motion evenly; a stall-then-catch-up or a jump shows as a large figure)
  const evenAcc = Array(nCars).fill(0); let evenMax = 0, evenN = 0;
  for (let i = 1; i < rec.length; i++) {
    const a = rec[i - 1], b = rec[i];
    let moving = false;
    for (let c = 0; c < nCars; c++) {
      const ca = a.cars[c], cb = b.cars[c], ea = a.exact[c], eb = b.exact[c];
      if (!ca || !cb || !ea || !eb) { still[c] = 0; stillAcc[c] = 0; continue; }
      const d = Math.hypot(cb[0] - ca[0], cb[1] - ca[1]), e = Math.hypot(eb[0] - ea[0], eb[1] - ea[1]);
      if (e > 30) continue;   // a jump of the scene
      if (e > 1e-4) moving = true;
      const sameHd = hdg(ca[2]) === hdg(cb[2]);
      if (sameHd) { steps.push(d); stepErr.push(Math.abs(d - e)); }
      else { headingChanges++; hdgJumpMax = Math.max(hdgJumpMax, Math.abs(d - e)); }
      err.push(Math.hypot(cb[0] - eb[0], cb[1] - eb[1]));
      // still on screen (no drawn change) while the exact point moved more than STILL_PX since it last changed (a
      // step along the rails is (2, 1), 2.24 px)
      if (d < 1e-6 && e > 1e-4) { still[c] += b.dt; stillAcc[c] += e; if (stillAcc[c] > STILL_PX) { stillOver++; worstStillMs = Math.max(worstStillMs, still[c]); } }
      else { still[c] = 0; stillAcc[c] = 0; }
      if (sameHd && d > e + JUMP_PX) jumps++;
      if (!sameHd) evenAcc[c] = 0;
      else { evenAcc[c] += e; if (d > 1e-6) { evenMax = Math.max(evenMax, Math.abs(evenAcc[c] - d)); evenN++; evenAcc[c] = 0; } }
      hist[c].push([i, hdg(cb[2])]);
    }
    if (moving) moveFrames++;
    // spacing between neighbouring cars: their drawn offset against the exact one (how far rounding bends it), and
    // changes of the drawn offset from frame to frame while the exact one stays (on a straight)
    for (let c = 1; c < nCars; c++) {
      const A0 = a.cars[c - 1], A1 = a.cars[c], B0 = b.cars[c - 1], B1 = b.cars[c], E0 = b.exact[c - 1], E1 = b.exact[c], F0 = a.exact[c - 1], F1 = a.exact[c];
      if (!A0 || !A1 || !B0 || !B1 || !E0 || !E1 || !F0 || !F1 || hdg(A0[2]) !== hdg(B0[2]) || hdg(A1[2]) !== hdg(B1[2])) continue;
      const da = [A1[0] - A0[0], A1[1] - A0[1]], db = [B1[0] - B0[0], B1[1] - B0[1]];
      const ea = [F1[0] - F0[0], F1[1] - F0[1]], eb = [E1[0] - E0[0], E1[1] - E0[1]];
      const ch = Math.hypot(db[0] - da[0], db[1] - da[1]), ech = Math.hypot(eb[0] - ea[0], eb[1] - ea[1]);
      if (ech < 0.05 && ch > 0) spacingChanges++;
      // on a straight (both heading e or w, the exact gap steady): how much the drawn gap changes in a frame
      if (ech < 0.05 && /^veh\/[a-z_]+\/[ew]($|\/)/.test(B0[2]) && /^veh\/[a-z_]+\/[ew]($|\/)/.test(B1[2]) && Math.abs(Math.sin(b.exact[c][2])) < 1e-6 && Math.abs(Math.sin(b.exact[c - 1][2])) < 1e-6) {
        straightPairs++; if (ch > 0) straightGapChanges++; straightGapMax = Math.max(straightGapMax, ch);
      }
      spacingMax = Math.max(spacingMax, Math.hypot(db[0] - eb[0], db[1] - eb[1]));
    }
    // rail phase on track 1 (heading e or w, z = -6): a point on the rail line has py - px / 2 = OY - OX / 2 + 8z; the
    // drawn anchor's offset from that line against the exact one (0 when the car steps along the rails' 2:1 line)
    for (let c = 0; c < nCars; c++) {
      const cb = b.cars[c], eb = b.exact[c];
      if (!cb || !eb || !/^veh\/[a-z_]+\/[ew]($|\/)/.test(cb[2]) || Math.abs(eb[4] + 6) > 1e-4) continue;
      const ph = (cb[1] - cb[0] / 2) - (eb[1] - eb[0] / 2);
      railPhase = Math.max(railPhase, Math.abs(ph)); railPhaseFrames++;
      if (!out._ph) out._ph = new Set(); out._ph.add(ph.toFixed(2));
    }
  }
  // heading flicker: a car's frame going A > B > A within 30 frames
  for (const h of hist) {
    let prev = null, prev2 = null;
    for (const [i, k] of h) { if (k !== (prev && prev[1])) { if (prev2 && prev2[1] === k && i - prev[0] < 30) flickers++; prev2 = prev; prev = [i, k]; } }
  }
  out.moveFrames = moveFrames;
  out.carStepMax = +Math.max(0, ...steps).toFixed(2); out.carStepP98 = +pct(steps, 0.98).toFixed(2);
  out.carStepVsExactMax = +Math.max(0, ...stepErr).toFixed(2);
  out.drawnVsExactMax = +Math.max(0, ...err).toFixed(2);
  out.stepEvenMax = +evenMax.toFixed(2); out.drawnSteps = evenN;
  out.jumps = jumps; out.stillOver = stillOver; out.worstStillMs = Math.round(worstStillMs);
  out.headingChanges = headingChanges; out.headingFlickers = flickers; out.headingJumpMax = +hdgJumpMax.toFixed(2);
  out.straightPairs = straightPairs; out.straightGapChanges = straightGapChanges; out.straightGapMax = +straightGapMax.toFixed(2);
  out.spacingChanges = spacingChanges; out.spacingVsExactMax = +spacingMax.toFixed(2);
  out.railPhaseMax = +railPhase.toFixed(2); out.railPhases = out._ph ? [...out._ph].sort().join(' ') : ''; delete out._ph;
  // on screen (minus the camera): the train's lead car, and the camera's own steps
  const scr = []; const cam = [];
  for (let i = 1; i < rec.length; i++) {
    const a = rec[i - 1], b = rec[i];
    cam.push(Math.hypot(b.cx - a.cx, b.cy - a.cy));
    if (a.cars[0] && b.cars[0] && a.exact[0] && b.exact[0] && a.cars[0][2] === b.cars[0][2]) {
      const d = Math.hypot((b.cars[0][0] - b.cx) - (a.cars[0][0] - a.cx), (b.cars[0][1] - b.cy) - (a.cars[0][1] - a.cy)), e = Math.hypot((b.exact[0][0] - b.cx) - (a.exact[0][0] - a.cx), (b.exact[0][1] - b.cy) - (a.exact[0][1] - a.cy));
      if (e < 30) scr.push(Math.abs(d - e));
    }
  }
  out.screenStepVsExactMax = +Math.max(0, ...scr).toFixed(2); out.camStepMax = +Math.max(0, ...cam).toFixed(2);
  // smoke: each puff's drawn step from one frame to the next (by its number), steps over 2 px; and where a new puff
  // first shows against the stack's lead car (its offset's spread, px)
  let pj = 0, pn = 0, born = [];
  for (let i = 1; i < rec.length; i++) for (const q of rec[i].puffs) {
    const o = rec[i - 1].puffs.find(p => p[3] === q[3]);
    if (o) { const d = Math.hypot(q[0] - o[0], q[1] - o[1]); pj = Math.max(pj, d); if (d > 2.01) pn++; }
    else if (q[3] >= 0 && rec[i].cars[0]) born.push([q[0] - rec[i].cars[0][0], q[1] - rec[i].cars[0][1]]);
  }
  out.puffStepMax = +pj.toFixed(2); out.puffStepsOver2 = pn;
  if (born.length) { const xs = born.map(b => b[0]), ys = born.map(b => b[1]); out.puffBornSpread = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map(v => +v.toFixed(1)); }
  return out;
}

module.exports = { playTrain, summariseTrain, trainRecorder, JUMP_PX, STILL_PX };

if (require.main === module) {
  const { stopServer } = require('./browser');
  (async () => {
    const setup = process.argv[2] || 'platform', orient = process.argv[3] || 'portrait', speed = +(process.argv[4] || 1), throttle = +(process.argv[5] || 1);
    const r = await playTrain(setup, orient, { speed, throttle, query: process.env.QUERY || '' });
    console.log(JSON.stringify({ setup, orient, speed, throttle, ...summariseTrain(r.rec), errors: r.errors.slice(0, 3) }));
    if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, JSON.stringify(r.rec));
    stopServer();
  })();
}
