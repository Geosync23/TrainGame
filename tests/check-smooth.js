// Check: punching and freight handling play smoothly (D29, the designer: handling "needs to be much smoother and more
// clear", punching "very hitchy when in the train"). In Chromium at phone size (portrait and landscape), at 1x in real
// time (tests/smooth-play.js): a coach punch sequence (the d27coach scenario: step in, walk the aisle, punch every
// seated ticket of the fullest coach one after another, step off) and a freight sequence (d27freight: F's frJobHint
// played as the next button tapped at once: the door, the cart, lifting goods out of the car, onto the cart, to the
// storage rows), recording every drawn frame:
// - the agent's drawn point (the sprite actually drawn) never jumps: each frame's step at most STEP_PX native px plus
//   STEP_PER_MS a millisecond of the frame's time (the climb up a coach's end steps is the fastest move, about 1.3 px a
//   frame at 60 fps; before D29 the agent in a coach jumped 0.4u, up to 10 native px, once a tick);
// - he never stands still on screen while the sim walks him for more than STILL_MS (before D29: 117 ms, a whole tick);
// - the camera (locked on him) never jumps either (the same bound) and he stays within a native pixel or so of the
//   view's middle from frame to frame;
// - the good in his hands and the cart he pushes stay with him (their offset from him changes by at most 2 native px a
//   frame while he holds or pushes them), and a good being lifted or set down moves at most 4 px a frame (before D29 it
//   stood still a tick, then jumped);
// - sim only, the same sequences tick by tick on a copy (smooth-play's simGaps): no tick inside a job in which nothing
//   advances (he neither moves nor works on a timed step), i.e. the steps of one job are chained; the punch and the
//   handling steps take the times in PB and FR (read from the data, not written here).
// Screenshots: test-output/d29-smooth-{coach-punch,coach-next,freight-lift,freight-carry}-{portrait,landscape}.png (as
// played) and d29-smooth-*-close-*.png (paused, zoomed in, the buttons over the world hidden).

//
// D30 (the designer: "Train animation is very juddery"), the trains (tests/train-play.js: p1 comes in through the W1
// crossover, brakes, stops on track 1, stands, starts off and leaves through E1), in real time, every drawn frame:
// - no car jumps: its drawn step in a frame is at most its exact (blended, unrounded) step plus one step along the
//   rails ((2, 1), 2.24 px), and the train is drawn between ticks (blended) whenever the sim moves it;
// - no car stands still on screen while its exact point has moved more than 2.5 px and it is drawn more than a step
//   (2.3 px) behind it (a missed step), and no car steps backwards against its motion;
// - even steps: each drawn step of a car is within 1.8 px (0.8 of a step; at 2x, where a frame's motion is about a
//   step, 2.3 px, one step) of the exact motion since its last step (steps of
//   (2, 1) follow the exact motion; a stall then a catch-up, or two steps for one, would break it);
// - on a straight the cars keep their spacing: the drawn gap between neighbours does not change from frame to frame
//   (before D30 it changed by a pixel in about 6 frames of 10), and on track 1 every car heading e or w sits on its rails'
//   2:1 pixel line (its offset across them the same as its exact point's);
// - no heading flicker: a car's frame never goes A > B > A within 30 frames;
// - the smoke puffs drift, never jump (at most 2 px a frame);
// - with ?d30=0 the old drawing comes back (the gaps change again), so the bound is known to bite.
// Cases: platform 1x portrait (the player standing on the platform), walk 1x landscape (walking beside it), curveW 1x
// portrait and curveE 2x landscape (by the crossovers' curves). SMOOTH_ONLY=train runs only these.

const SP = require('./smooth-play');
const TP = require('./train-play');
const { openGame } = require('./browser');
const STEP_PX = 1.6, STEP_PER_MS = 0.1, STILL_MS = 90, REL_PX = 2.01;

async function checkTrains(problems, notes) {
  const cases = [['platform', 'portrait', 1], ['walk', 'landscape', 1], ['curveW', 'portrait', 1], ['curveE', 'landscape', 2]];
  for (const [setup, orient, speed] of cases) {
    const P = m => problems.push(`train ${setup} ${orient} ${speed}x: ${m}`);
    let r;
    try { r = await TP.playTrain(setup, orient, { speed, shot: `d30-train-${setup}-${orient}`, maxS: setup === 'curveE' ? 25 : undefined }); } catch (e) { P('did not play: ' + (e && e.message)); continue; }
    const m = TP.summariseTrain(r.rec);
    notes.push(`train ${setup} ${orient} ${speed}x: ${JSON.stringify(m)}`);
    if (!(m.moveFrames > 200)) P(`the train moved in only ${m.moveFrames} frames`);
    const unblended = r.rec.filter(q => q.blend === false && Math.abs(q.v) > 1e-3).length;
    if (unblended) P(`${unblended} frames drew the running train at its tick position (not blended)`);
    // D32 (the slower clock, 5 ticks a real second): re-measured. In 'walk' the engine takes one diagonal pixel step (2, 2:
    // 2.83 px) as it leaves the straight for the leg's curve (its line on the rails moves over by a pixel there). At 7.5
    // ticks a second the exact motion in that frame (0.69 px) kept it under the limit (exact + 2.3); at 5 it is 0.46 px,
    // so the same step counts once. One such step is allowed there; the limit itself is unchanged.
    const jumpsOk = setup === 'walk' && speed === 1 ? 1 : 0;
    if (m.jumps > jumpsOk) P(`a car jumped ${m.jumps} times (a frame's drawn step more than its exact step + ${TP.JUMP_PX} px; largest step ${m.carStepMax} px)`);
    if (m.backSteps) P(`a car stepped backwards against its motion ${m.backSteps} times`);
    if (m.stepEvenMax > (speed > 1 ? 2.3 : 1.8)) P(`a car's steps were uneven: a drawn step against the exact motion since its last step differed by ${m.stepEvenMax} px (a step along the rails is 2.24 px)`);
    if (m.stillOver) P(`a car stood still on screen while the sim moved it more than ${TP.STILL_PX} px (${m.stillOver} frames, up to ${m.worstStillMs} ms)`);
    if (m.straightPairs < (setup === 'curveW' ? 30 : 100)) P(`only ${m.straightPairs} frames of neighbouring cars on a straight`);
    if (m.straightGapChanges > Math.max(2, m.straightPairs * 0.01)) P(`on a straight the gap between neighbouring cars changed ${m.straightGapChanges} times in ${m.straightPairs} (up to ${m.straightGapMax} px)`);
    if (m.straightGapMax > 1.01 * Math.SQRT2 * 2) P(`on a straight the gap between neighbouring cars changed by ${m.straightGapMax} px in a frame`);
    if (m.railPhaseMax > 0.01 && setup !== 'curveW') P(`a car on track 1 sat ${m.railPhaseMax} px off its rails' pixel line (${m.railPhases})`);
    if (m.headingFlickers) P(`a car's heading frame flickered ${m.headingFlickers} times`);
    if (m.puffStepsOver2) P(`a smoke puff jumped ${m.puffStepsOver2} times (up to ${m.puffStepMax} px)`);
    if (r.errors.length) P('console errors: ' + r.errors.slice(0, 3).join(' | '));
  }
  // The off switch: ?d30=0 draws the trains as before (each car rounded on its own): the gaps change again.
  try {
    const r = await TP.playTrain('platform', 'portrait', { speed: 2, query: '&d30=0' }), m = TP.summariseTrain(r.rec);
    notes.push(`train platform portrait 2x ?d30=0: ${JSON.stringify(m)}`);
    if (!(m.straightGapChanges > m.straightPairs * 0.2)) problems.push(`?d30=0 did not bring the old drawing back (gaps changed ${m.straightGapChanges} times in ${m.straightPairs})`);
  } catch (e) { problems.push('train ?d30=0: did not play: ' + (e && e.message)); }
}

module.exports = async function checkSmooth() {
  const problems = [], notes = [];
  await checkTrains(problems, notes);
  if (process.env.SMOOTH_ONLY === 'train') { console.log('check-smooth:\n  ' + notes.join('\n  ')); return problems; }
  for (const orient of ['portrait', 'landscape']) {
    for (const kind of ['coach', 'freight']) {
      const P = m => problems.push(`${orient}, ${kind}: ${m}`);
      const shotAt = kind === 'coach'
        ? [[`d29-smooth-coach-punch-${orient}`, () => { const s = window.__railhead.state, J = s.pb && s.pb.job; return !!(J && J.k === 'punch' && J.on && J.acc > 0); }],
          [`d29-smooth-coach-next-${orient}`, () => { const s = window.__railhead.state; return !!(s.player.in && !s.pb.job && s.pb.tot.punched > 0); }]]
        : [[`d29-smooth-freight-lift-${orient}`, () => { const L = window.__railhead.pix.lists, f = L && L.frPose; return !!(f && f.phase === 'pick' && f.prog > 0.3 && f.verb === 'carry'); }],
          [`d29-smooth-freight-carry-${orient}`, () => { const s = window.__railhead.state, J = s.fr.job, st = J && J.steps[J.i]; return !!(st && st.s === 'walk' && J.steps.slice(J.i).some(q => q.a === 'put') && window.__railhead.pix.PIX.target); }]];
      let r;
      try { r = await SP.play(kind, orient, { shotAt }); } catch (e) { P('did not play: ' + (e && e.message)); continue; }
      const m = SP.summarise(r.rec), rec = r.rec;
      // the frame-by-frame bound, scaled by each frame's time
      let worst = 0, worstAt = null, camWorst = 0;
      for (let i = 1; i < rec.length; i++) {
        const a = rec[i - 1], b = rec[i], lim = STEP_PX + STEP_PER_MS * b.dt;
        if (a.ax !== null && b.ax !== null) { const d = Math.hypot(b.ax - a.ax, b.ay - a.ay); if (d < 12 && d - lim > worst) { worst = d - lim; worstAt = `${b.key} at tick ${b.tick}`; } }
        const c = Math.hypot(b.cx - a.cx, b.cy - a.cy); if (c < 12) camWorst = Math.max(camWorst, c - lim);
      }
      notes.push(`${orient}, ${kind}: ${JSON.stringify(m)}`);
      if (worst > 0) P(`the agent's drawn point jumped ${(worst + STEP_PX).toFixed(2)} native px in a frame (${worstAt})`);
      if (camWorst > 0) P(`the camera jumped ${(camWorst + STEP_PX).toFixed(2)} native px in a frame`);
      if (m.worstStillMs > STILL_MS) P(`the agent stood still on screen for ${m.worstStillMs} ms while the sim walked him`);
      if (m.screenWobbleMax > 1.5) P(`the agent wandered ${m.screenWobbleMax} native px off the view's middle in a frame`);
      if (m.goodVsAgentOver2 > 0) P(`the good in his hands jumped against him ${m.goodVsAgentOver2} times (up to ${m.goodVsAgentMax} px)`);
      if (m.liftStepsOver4 > 0) P(`a good being lifted or set down jumped ${m.liftStepsOver4} times (up to ${m.liftStepMax} px in a frame)`);
      if (m.cartVsAgentOver2 > 0 && kind === 'freight') P(`the cart jumped against him ${m.cartVsAgentOver2} times (up to ${m.cartVsAgentMax} px)`);
      if (kind === 'coach' && !(m.punched >= 2)) P(`only ${m.punched} tickets punched`);
      if (kind === 'freight' && !(m.walkFrames > 300)) P(`only ${m.walkFrames} walking frames`);
      if (r.errors.length) P('console errors: ' + r.errors.slice(0, 3).join(' | '));
    }
  }
  // Close-ups (paused, zoomed in, the buttons over the world hidden): the punch with its cue and the traveller's
  // ticket, the flash and the next traveller outlined, a good lifted into the hands, a good carried to its marked cell.
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&debug=1&world=proto&d27=board,handling,town' });
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => {});
      await page.addStyleTag({ content: '.pdAct { display: none !important; }' });
      const until = (kind, pred, n) => page.evaluate(([kind, src, n]) => {
        const R = window.__railhead, f = (0, eval)('(' + src + ')');
        if (kind) { window.rh.scenario(kind); R.pix.warm(true); }
        for (let i = 0; i < n; i++) {
          const s = R.state;
          if (f(R, s)) return true;
          if (s.fr && !s.fr.job && !s.player.in && kind !== 'd27coach') { const h = R.fr.frJobHint(s); if (h && h.cmd) R.send(h.cmd); }
          R.step(1);
        }
        return false;
      }, [kind, pred.toString(), n || 400]);
      const shot = async (name, ok) => {
        if (!ok) { problems.push(`${orient}: close-up ${name}: the moment never came`); return; }
        await page.evaluate(() => { window.__railhead.camera.zoom = 3; });
        await page.waitForTimeout(250);
        await page.screenshot({ path: require('./browser').screenshotPath(`d29-smooth-${name}-close-${orient}`) });
      };
      let ok = await until('d27coach', (R, s) => { if (!s.pb.job && !s.player.in && !s._sent) { s._sent = 1; R.send({ t: 'pbPunch', stock: s.pax.list.find(p => p.s === 'sitting' && !p.punched && !p.through && p.to !== 'hub').stock }); } const J = s.pb.job; return !!(J && J.k === 'punch' && J.on && J.acc > 0); });
      await shot('coach-punch', ok);
      ok = await until(null, (R, s) => s.pb.tot.punched > 0, 50);
      await shot('coach-next', ok);
      ok = await until('d27freight', (R, s) => { const J = s.fr.job, st = J && J.steps[J.i]; return !!(st && st.a === 'pick' && J.t0 >= 0 && s.time - J.t0 > 0); }, 600);
      await shot('freight-lift', ok);
      ok = await until(null, (R, s) => { const J = s.fr.job, st = J && J.steps[J.i]; const tg = R.fr.frTarget(s); return !!(st && (st.s === 'walk' || st.s === 'go') && tg && tg.a === 'put' && Math.hypot(tg.x - s.player.x, tg.z - s.player.z) < 5); }, 600);
      await shot('freight-carry', ok);
      if (errors.length) problems.push(`${orient}: close-ups: console errors: ` + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  // Sim only: no idle ticks inside a job; the step times from the data.
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&debug=1&world=proto&d27=board,handling,town' });
    try {
      for (const kind of ['coach', 'freight']) {
        await page.evaluate(k => window.rh.scenario(k === 'coach' ? 'd27coach' : 'd27freight'), kind);
        const g = await page.evaluate(([src, k]) => (0, eval)('(' + src + ')')(k, k === 'coach' ? 400 : 300), [SP.simGaps.toString(), kind]);
        notes.push(`sim ${kind}: ${g.idle} idle ticks in ${g.ticks}; ${kind === 'coach' ? 'ticks a punch ' + JSON.stringify(g.jobs) : 'steps ' + JSON.stringify(g.steps)}`);
        if (g.idle) problems.push(`sim ${kind}: ${g.idle} ticks inside a job with nothing advancing (${g.idleAt.slice(0, 5).join(', ')})`);
      }
      const t = await page.evaluate(() => {
        const R = window.__railhead, PB = R.pb.PB, FR = R.fr.FR, s = JSON.parse(JSON.stringify(R.state)), out = { bad: [] };
        // a punch at the row: from the tick it starts to pbPunched, PB.PUNCH_S (whole ticks)
        window.rh.scenario('d27coach');
        const st = R.state, stock = st.pax.list.find(p => p.s === 'sitting' && !p.punched && !p.through && p.to !== 'hub').stock;
        R.send({ t: 'pbPunch', stock });
        let on = null, done = null;
        for (let i = 0; i < 300 && done === null; i++) { R.step(1); const J = st.pb.job; if (on === null && J && J.k === 'punch' && J.on) on = st.time - (J.acc || 0); if (st.pb.tot.punched) done = st.time; }
        out.punch = done !== null && on !== null ? done - on : null;
        if (out.punch !== Math.ceil(PB.PUNCH_S / 8) * 8) out.bad.push(`a punch took ${out.punch} game s (PB.PUNCH_S ${PB.PUNCH_S})`);
        if (!(PB.PUNCH_S <= 16)) out.bad.push(`PB.PUNCH_S is ${PB.PUNCH_S} (D29: about 15)`);
        if (!(FR.TIME_K <= 0.4 + 1e-9)) out.bad.push(`FR.TIME_K is ${FR.TIME_K} (D29: 0.4)`);
        const all = [FR.DOOR_S, FR.GRAB_S, FR.PARK_S, FR.HAND_S, ...Object.values(FR.PICK_S)];
        if (all.some(v => !(v >= 8) || v % 8)) out.bad.push(`a handling time is not a whole number of ticks of at least one: ${all.join(', ')}`);
        out.times = { punch: PB.PUNCH_S, door: FR.DOOR_S, pick: FR.PICK_S, grab: FR.GRAB_S, hand: FR.HAND_S };
        return out;
      });
      notes.push('times: ' + JSON.stringify(t.times));
      for (const b of t.bad) problems.push(b);
      if (errors.length) problems.push('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  console.log('check-smooth:\n  ' + notes.join('\n  '));
  return problems;
};
