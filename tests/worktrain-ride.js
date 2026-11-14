// D34 (the designer: "when the player rides out on the work train, the train flickers and is a little janky"): rides
// out with the work train in real time in Chromium at phone size and records every drawn frame: the camera's exact
// top-left (native px), the crew car's drawn sprite (its whole-pixel place in the buffer) and where the renderer meant
// it to be (the car's exact projected point), the player's ride phase, the train's phase, the frame time and the chunks
// built. Then reports the crew car's motion on the screen frame by frame (it should stand still while the view rides
// with it), the frames where it is not drawn at all or drawn twice, the hand-over from the station's map to the line's
// country, and slow frames.
//   node tests/worktrain-ride.js [portrait|landscape] [throttle]      (DUMP=file.json writes the frames)
const { openGame } = require('./browser');

function recorder(maxS) {
  const R = window.__railhead, X = R.pix, PIX = X.PIX, rec = [], t0 = performance.now();
  return new Promise(res => {
    const step = () => {
      const S = R.state, Q = S.lp, ph = S.ln.tr.ph, cars = PIX.drawn.filter(d => /^wt\d/.test(d.id || '') && d.key && /^veh\//.test(d.key));
      const car = cars.filter(d => d.id === 'wt4'), T = (0, eval)('lnTrain')(S, (0, eval)('lpFrameSod')());
      const c = T.cars[T.cars.length - 1], at = T.at, LX = (0, eval)('D33').LX;
      const ex = c ? (0, eval)('pixProject')((c.x0 + c.x1) / 2 + (at === 'line' ? LX : 0), 0, c.z || 0) : null;
      rec.push({ t: performance.now() - t0, camX: PIX.camX, camY: PIX.camY, vx: PIX.vx, vy: PIX.vy, scale: PIX.scale, dpr: PIX.dpr, n: car.length, l: car[0] ? car[0].l : null, tp: car[0] ? car[0].t : null, ex: ex && ex.x, ey: ex && ex.y, at, lp: Q && Q.ph, ph, ms: PIX.stats.ms, built: PIX.lnStats.built + PIX.lnStats.rebuilt, tick: S.tick, cars: cars.length });
      if (performance.now() - t0 > maxS * 1000 || (Q && Q.ph === 'line')) { res(rec); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function rideOut(orient, throttle) {
  const { browser, page, errors } = await openGame(orient || 'portrait', { query: '?paused&world=proto' });
  try {
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 });
    if (throttle > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
    await page.evaluate(() => {
      const R = window.__railhead, S = R.state, sod = () => (S.time + 5 * 3600) % 86400;
      R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.step(2);
      R.send({ t: 'lpRide', how: 'train' });   // (the crew car tapped: as d33Tap does)
      for (let i = 0; i < 4000 && !(S.lp && S.lp.ph === 'aboardS' && sod() >= 6 * 3600 + 21 * 60); i++) R.step(1);
      R.warm && R.warm();
    });
    await page.evaluate(() => { (0, eval)('setSpeed')(1); });
    const rec = await page.evaluate(recorder, 60);
    return { rec, errors };
  } finally { await browser.close(); }
}

// The crew car on the screen, frame by frame: { moves: [native px a frame], jumps, gone, twice, slow, handover }.
function analyse(rec) {
  const out = { frames: rec.length, gone: 0, twice: 0, jumps: [], slow: [], handover: null, onScreen: [] };
  let last = null;
  for (let i = 0; i < rec.length; i++) {
    const r = rec[i];
    if (r.lp !== 'aboardS' && r.lp !== 'ride') { last = null; continue; }
    if (r.n === 0) { out.gone++; continue; }
    if (r.n > 1) out.twice++;
    const sx = r.l - r.camX, sy = r.tp - r.camY;   // where the car's sprite stands on the screen (native px)
    out.onScreen.push([+r.t.toFixed(0), +sx.toFixed(2), +sy.toFixed(2), r.at, r.ph]);
    if (last && r.tick !== undefined) {
      const d = Math.hypot(sx - last.sx, sy - last.sy);
      if (d > 0.75) out.jumps.push({ i, t: +r.t.toFixed(0), d: +d.toFixed(2), at: r.at, was: last.at, ph: r.ph, ms: +r.ms.toFixed(1), built: r.built - last.built });
    }
    if (r.ms > 20) out.slow.push({ i, ms: +r.ms.toFixed(1), at: r.at });
    if (last && last.at !== r.at) out.handover = { i, t: +r.t.toFixed(0), from: last.at, to: r.at };
    last = { sx, sy, at: r.at, built: r.built };
  }
  return out;
}

module.exports = { rideOut, analyse };
if (require.main === module) {
  (async () => {
    const { stopServer } = require('./browser');
    const { rec, errors } = await rideOut(process.argv[2] || 'portrait', +(process.argv[3] || 1));
    if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, JSON.stringify(rec));
    const a = analyse(rec);
    console.log(JSON.stringify({ frames: a.frames, gone: a.gone, twice: a.twice, jumps: a.jumps.length, firstJumps: a.jumps.slice(0, 12), slow: a.slow.slice(0, 8), handover: a.handover, errors: errors.slice(0, 3) }, null, 1));
    stopServer();
  })();
}
