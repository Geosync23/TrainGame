// Check: the cutaway view into the combine while the player rides (D15, builder V). Drawing only.
// - Before boarding every car is whole (the combine's whole draw range).
// - While riding mid-line: the combine's roof and the side and end walls nearer the camera are not drawn (its cut
//   geometry leaves them out), the far wall and end, the floor and the inside are; the player is drawn standing in the baggage end;
//   the travellers aboard are drawn seated in the passenger end, one per seat; the freight in the car is drawn in
//   the baggage end. The other cars stay whole. Draw calls stay under 100.
// - Turning the camera (the turn buttons, 4 steps) moves the open side: it is always the side facing the camera.
// - After stepping off at Willow Ford everything is whole again and nobody is drawn aboard.
// - Screenshots: test-output/cutaway-riding-{portrait,landscape}.png (start zoom 1.5), cutaway-turned-portrait.png.

const { openGame, screenshotPath } = require('./browser');

// In the page: a new real game with No. 1 on the timetable, run until the morning train is ready at the hub's platform.
const READY = `(() => {
  const R = window.__railhead, S = R.newState(1866);
  R.simTick(S, [{ t: 'ttAssign', tr: 0, on: true }]);
  for (let n = 0; n < 5000; n++) { const r = R.tt.ttRunOf(S, 0); if (r && r.ph === 'at' && /its time/.test(r.why || '')) break; R.simTick(S, []); }
  return S;
})()`;
const N_PAX = 7, N_ITEMS = 5;

// Loads the ready train, puts ticketed travellers on the platform by the combine's door and freight in the combine,
// boards the player and runs the train out to the middle of the line (x > 90). Returns what was set up.
async function setUp(page, zoom) {
  return page.evaluate(([src, nPax, nItems, zoom]) => {
    const R = window.__railhead, S0 = (0, eval)(src);
    R.importSave(JSON.stringify({ state: S0, ui: { yawIdx: 0, zoom, speed: 0 } }));
    R.camera.zoom = zoom;
    R.step(1);
    const S = R.state, K = R.pax.paxStation('hub'), d = R.ride.rideDoors().find(d => d.stock === 1), ev = [];
    for (let i = 0; i < nPax; i++) {
      const off = (i - (nPax - 1) / 2) * 0.7, x = d.sx - K.out[0] * 1.2 + K.along[0] * off, z = d.sz - K.out[1] * 1.2 + K.along[1] * off;
      const p = R.pax.paxAdd(S, 'hub', 'hub', 'willow', x, z, ev);
      p.s = 'wait'; p.fare = R.pax.paxFare('hub', 'willow'); p.tx = Math.round(x * 100); p.tz = Math.round(z * 100);
    }
    // Freight for Willow Ford in the combine's baggage end (a sack, a crate, a barrel, a bale and a keg).
    let moved = 0;
    for (const commodity of ['flour', 'tinned', 'lampoil', 'fabric', 'spikes'].slice(0, nItems)) {
      const wb = { commodity, originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null };
      if (R.cargo.itemCreate(S, wb, { kind: 'CAR', stockId: 1 }, ev).ok) moved++;
    }
    R.send({ t: 'boardCar', stock: 1 });
    for (let i = 0; i < 300 && !S.player.ride; i++) R.step(1);
    let left = false;
    for (let i = 0; i < 3000; i++) {
      R.step(1);
      const f = R.ride.rideCarOf(1), ps = R.trainPoses(R.state.track, f.tr)[f.i];
      if (R.state.trains[0].v > 0.5) left = true;
      if (left && ps.x > 90) break;
    }
    const aboard = R.state.pax.list.filter(p => p.s === 'aboard' && p.car === 1).length;
    return { riding: !!R.state.player.ride, moved, aboard, v: R.state.trains[0].v };
  }, [READY, N_PAX, N_ITEMS, zoom]);
}

// Checks the cutaway as drawn now; returns the problems and the summary.
async function inspect(page, label) {
  const problems = [];
  const c = await page.evaluate(() => {
    const R = window.__railhead, cw = R.cutaway(), aboard = R.state.pax.list.filter(p => p.s === 'aboard' && p.car === 1).length;
    const items = R.cargo.itemsAt(R.state, { kind: 'CAR', stockId: 1 }).length;
    return { ...cw, aboard, itemsIn: items, dc: R.drawCalls, ride: R.state.player.ride, PART: 0.40 * 1.6 };
  });
  const car = c.cars.find(x => x.stock === 1);
  if (!c.cut || !car) { problems.push(`${label}: the combine is not open while riding: ${JSON.stringify(c).slice(0, 300)}`); return { problems, c }; }
  const D = car.drawn, nearSide = c.cut.nearPlus ? 'sideP' : 'sideM', farSide = c.cut.nearPlus ? 'sideM' : 'sideP';
  const nearEnd = c.cut.nearEndPlus ? 'endP' : 'endM', farEnd = c.cut.nearEndPlus ? 'endM' : 'endP';
  if (car.whole) problems.push(`${label}: the combine is whole while riding`);
  if (D.roof) problems.push(`${label}: the combine's roof is still drawn`);
  if (car.side !== (c.cut.nearPlus ? 1 : -1)) problems.push(`${label}: the open side (${car.side}) is not the side facing the camera (near +z: ${c.cut.nearPlus})`);
  if (D[nearSide]) problems.push(`${label}: the camera-side wall is still drawn`);
  if (D[nearEnd]) problems.push(`${label}: the camera-side end wall is still drawn`);
  if (!D[farSide] || !D[farEnd]) problems.push(`${label}: the far wall or far end is not drawn (${JSON.stringify(D)})`);
  if (!D.inside) problems.push(`${label}: the floor and the inside are not drawn`);
  for (const o of c.cars) if (o.stock !== 1 && !o.whole) problems.push(`${label}: another car (${o.stock}) is open too`);
  const [hx, hz] = c.cut.half, P = c.cut.player;
  if (!P.visible) problems.push(`${label}: the player is not drawn inside the car`);
  if (!(P.local[0] > c.PART && P.local[0] < hx && Math.abs(P.local[2]) < hz)) problems.push(`${label}: the player is not standing in the baggage end (${P.local.map(v => v.toFixed(2))})`);
  if (P.local[1] < 1.2 || P.local[1] > 1.5) problems.push(`${label}: the player is not standing on the car's floor (y ${P.local[1].toFixed(2)})`);
  if (c.cut.seated.length !== Math.min(12, c.aboard) || !c.aboard) problems.push(`${label}: ${c.cut.seated.length} travellers drawn seated, ${c.aboard} aboard`);
  const seats = new Set();
  for (const s of c.cut.seated) {
    const [x, y, z] = s.local;
    if (!(x < c.PART && x > -hx && Math.abs(z) < hz)) problems.push(`${label}: traveller ${s.id} is drawn outside the passenger end (${s.local.map(v => v.toFixed(2))})`);
    if (Math.abs(y - (0.21 + 0.62 + 0.16) * 1.6) > 0.05) problems.push(`${label}: traveller ${s.id} is not sitting on a seat (hips at ${y.toFixed(2)})`);
    seats.add(x.toFixed(2) + ',' + z.toFixed(2));
  }
  if (seats.size !== c.cut.seated.length) problems.push(`${label}: two travellers share a seat`);
  if (c.cut.items.length !== c.itemsIn) problems.push(`${label}: ${c.cut.items.length} of the ${c.itemsIn} items in the combine are drawn`);
  for (const it of c.cut.items) if (!(it.local[0] > c.PART && it.local[0] < hx && Math.abs(it.local[2]) < hz)) problems.push(`${label}: item ${it.id} is drawn outside the baggage end`);
  if (c.dc >= 100) problems.push(`${label}: ${c.dc} draw calls (the budget is under 100)`);
  return { problems, c };
}

module.exports = async function checkCutaway() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  const settle = () => page.waitForTimeout(900);
  try {
    // Before boarding: whole.
    await page.evaluate(src => { const R = window.__railhead; R.importSave(JSON.stringify({ state: (0, eval)(src), ui: { yawIdx: 0, zoom: 1.5, speed: 0 } })); }, READY);
    await settle();
    const before = await page.evaluate(() => window.__railhead.cutaway());
    if (before.cut || before.cars.some(c => !c.whole)) problems.push('before boarding a car is already open: ' + JSON.stringify(before.cars));
    if (!before.cars.length) problems.push('no combine is drawn');

    const s = await setUp(page, 1.5);
    if (!s.riding) { problems.push('setup: the player did not board: ' + JSON.stringify(s)); return problems; }
    if (s.moved < 3) problems.push(`setup: only ${s.moved} items could be put in the combine`);
    if (s.aboard < 5) problems.push(`setup: only ${s.aboard} of ${N_PAX} travellers boarded`);
    await settle();
    const a = await inspect(page, 'riding mid-line');
    problems.push(...a.problems);
    await page.screenshot({ path: screenshotPath('cutaway-riding-portrait') });
    console.log(`  riding mid-line (portrait, zoom 1.5): ${a.c.cut ? a.c.cut.seated.length : 0} travellers seated, ${a.c.cut ? a.c.cut.items.length : 0} items, draw calls ${a.c.dc}, combine ${a.c.cars[0].n / 3} triangles; screenshot cutaway-riding-portrait.png`);

    // A close look (zoom 3.5) for the review.
    await page.evaluate(() => { window.__railhead.camera.zoom = 3.5; }); await settle();
    await page.screenshot({ path: screenshotPath('cutaway-close-portrait') });
    await page.evaluate(() => { window.__railhead.camera.zoom = 1.5; }); await settle();

    // Turning the camera moves the open side.
    const sides = [];
    for (let k = 0; k < 4; k++) {
      await page.tap('#rotR'); await settle();
      const t = await inspect(page, `turned ${k + 1}`);
      problems.push(...t.problems);
      if (t.c.cut) sides.push(t.c.cut.open + '/' + t.c.cut.end);
      if (k === 0) await page.screenshot({ path: screenshotPath('cutaway-turned-portrait') });
    }
    if (!(sides.some(x => /^1\//.test(x)) && sides.some(x => /^-1\//.test(x)))) problems.push(`turning the camera did not move the open side (open sides ${sides})`);
    console.log(`  turning the view right 4 times: open side ${sides.join(', ')}`);

    // On to Willow Ford, step off: all whole again.
    const off = await page.evaluate(() => {
      const R = window.__railhead;
      for (let i = 0; i < 3000; i++) { const r = R.tt.ttRunOf(R.state, 0); if (r && r.i === 1 && r.ph === 'at') break; R.step(1); }
      R.send({ t: 'stepOff' });
      for (let i = 0; i < 20 && R.state.player.ride; i++) R.step(1);
      return !R.state.player.ride;
    });
    await settle();
    const after = await page.evaluate(() => ({ cw: window.__railhead.cutaway(), vis: window.__railhead.ride.playerVisible }));
    if (!off) problems.push('could not step off at Willow Ford');
    if (after.cw.cut || after.cw.cars.some(c => !c.whole || Object.values(c.drawn).some(v => !v))) problems.push('after stepping off the combine is not whole: ' + JSON.stringify(after.cw.cars));
    if (!after.vis) problems.push('after stepping off the player is not drawn');
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }

  // Landscape.
  const L = await openGame('landscape', { query: '?paused' });
  try {
    const s = await setUp(L.page, 1.5);
    if (!s.riding) problems.push('landscape: the player did not board');
    await L.page.waitForTimeout(900);
    const a = await inspect(L.page, 'landscape');
    problems.push(...a.problems);
    await L.page.screenshot({ path: screenshotPath('cutaway-riding-landscape') });
    console.log(`  landscape: draw calls ${a.c.dc}; screenshot cutaway-riding-landscape.png`);
    if (L.errors.length) problems.push('landscape console errors: ' + L.errors.join(' | '));
  } finally { await L.browser.close(); }
  return problems;
};
