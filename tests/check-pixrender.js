// Check: the pixel renderer (D25, builder R; plans/proto-tech.md section 6, plans/proto-sprites.md).
// - The atlas is decoded and drawn: the baked ground, the buildings, switch stands and points, trains by heading,
//   people (all four facings, never mirrored), goods with tags, the handcart; no placeholder shapes for anything the
//   art has.
// - The default view at phone size, portrait and landscape: centred on the player (2026-11-11), a whole scale (3 in portrait since the integration, the
//   lead's request) that shows platform 1 and the station round him (platform 2's east half and track 3 too in
//   landscape); the town by panning. The view keeps him centred as he walks (section 7).
// - A busy moment: a passenger train standing at platform 1 with travellers queueing at its doors, a freight train at
//   track 3, goods in the storage bays and on platform 2, the player carrying a crate.
// - Painter's order in the tricky cases: travellers behind the passenger train and behind / in front of the freight
//   train, the player under the canopy (drawn after him, and see-through), behind and in front of the storage shed,
//   the footbridge decks over the train beneath them, a walker on a deck between the deck and its near railing.
// - Footbridges: a walker on the stairs and on a deck is drawn at its height (from the bridges' geometry, or a height
//   the sim gives); someone under a deck stays below.
// - Zoom in whole steps (pinch or wheel move cam.zoom; the scale snaps), every scaled pixel a crisp square.
// - Picking matches what is drawn: a tap on the pixels of a switch stand, a coach, a traveller, a good, the store and
//   the player picks that thing; a tap near one (a thumb's margin) too; a tap on bare grass picks nothing.
// - The schedule board's text (pixBoardDraw), the frame time, no console errors. Screenshots in test-output/.

const { openGame, screenshotPath } = require('./browser');

// In the page: the busy moment (p1 at platform 1 and f1 at track 3 standing, from the sim with the switches set), goods
// in the storage bays and on platform 2, a crate in the player's hands; travellers from a stand-in ppDrawList (P's
// agreed shape) queueing at the coach doors, one of each facing, some by the freight train and the storage shed.
async function busy(page) {
  return page.evaluate(async () => {
    const R = window.__railhead, S = R.newState(1866, 'proto'), runOf = svc => S.rr.runs.find(q => q.svc === svc);
    R.simTick(S, []);
    S.track.switches[1].state = 'R'; S.track.switches[3].state = 'R';
    S.rr.runs.find(q => q.svc === 'x1').ph = 'gone';
    for (let i = 0; i < 4000 && !(runOf('p1').ph === 'stand' && runOf('f1').ph === 'stand'); i++) R.simTick(S, []);
    const wb = (c, kind, id) => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: kind || 'BUSINESS', id: id || 'store' }, contractId: null, due: null });
    const C = R.cargo;
    ['flour', 'hardware', 'whiskey', 'flour', 'beans', 'nails'].forEach((c, i) => C.itemCreate(S, wb(c), { kind: 'BAY', buildingId: 'storage', bay: i % 3 }, []));
    [[-9.5, 6.6, 'flour'], [-8.6, 6.6, 'whiskey'], [-7.7, 6.6, 'hardware']].forEach(([x, z, c]) => C.itemCreate(S, wb(c, 'OUTSIDE', 'out'), { kind: 'GROUND', x: Math.round(x * 100), z: Math.round(z * 100) }, []));
    C.itemCreate(S, wb('hardware'), { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, []);
    const PR = R.proto.PROTO, z1 = PR.P1.z1, st = R.world.buildingFootprints().find(f => f.id === 'storage');
    S.player.x = 2.0; S.player.z = z1 - 1.1; S.player.f = Math.PI;
    R.importSave(JSON.stringify({ state: S }));
    // Travellers: a line at each coach door (PP: doors at 1/4 and 3/4 of a coach), facing the track (sw); four more
    // facing each way; two by the freight train (behind it on platform 2, in front of it on the grass); two by the
    // storage shed (behind it, in front of it).
    const tr = R.state.trains[runOf('p1').slot], poses = R.trainPoses(R.state.track, tr), people = [];
    let id = 100;
    poses.forEach((p, i) => { if (p.k !== 'coach') return; for (const f of [0.25, 0.75]) for (let k = 0; k < 2; k++) people.push({ id: id++, x: p.x - p.len / 2 + f * p.len, z: z1 - 0.6 - 0.7 * k, f: 'sw', act: k === 0 && f === 0.25 ? 'ticket' : 'idle', who: ['man_top', 'woman_bonnet', 'man_bag', 'woman_shawl', 'child', 'man_bowler', 'worker', 'porter.b'][(id - 100) % 8] }); });
    [['se', 12, z1 - 3.5], ['ne', 13, z1 - 4], ['sw', 14, z1 - 3.5], ['nw', 15, z1 - 4]].forEach(([f, x, z]) => people.push({ id: id++, x, z, f, act: 'walk', who: 'man_bowler.b' }));
    // (D27: beside the middle of f1's first car; in front of it, clear of its 4u width)
    const half = (R.proto.PROTO_STOCK.cars.boxcar.wid || 2) / 2, zf = PR.D3 + half + 0.6;
    const fq = R.trainPoses(R.state.track, R.state.trains[runOf('f1').slot]).filter(p => p.k === 'boxcar').sort((a, c) => (Math.abs(a.x - zf - 1) * 8 / innerWidth + Math.abs(a.x + zf + 1) * 4 / innerHeight) - (Math.abs(c.x - zf - 1) * 8 / innerWidth + Math.abs(c.x + zf + 1) * 4 / innerHeight))[0];   // the car nearest the view's middle on screen (it looks at (0, -1))
    people.push({ id: 900, x: fq.x, z: PR.P2.z1 - 0.5, f: 'se', act: 'idle', who: 'woman_shawl' }, { id: 901, x: fq.x, z: zf, f: 'ne', act: 'idle', who: 'man_top.b' });
    const sx = st.x + 2.5, sz0 = st.z - (Math.abs(Math.sin(st.yaw)) > 0.5 ? st.w : st.d) / 2;
    people.push({ id: 902, x: sx, z: sz0 - 0.5, f: 'se', act: 'idle', who: 'child' }, { id: 903, x: sx, z: PR.P2.z1 - 0.6, f: 'nw', act: 'walk', who: 'man_bag' });
    window.__pixPeople = people;
    if (!window.__pixOrigDrawList) window.__pixOrigDrawList = typeof window.ppDrawList === 'function' ? window.ppDrawList : null;
    window.ppDrawList = () => window.__pixPeople;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // the loaded game's first frame sets its own view first
    R.pix.pixLookAt(0, -1);
    R.camera.zoom = 1.0;   // one step out (D27: in landscape too, the stock is twice D25's) so both trains and the people by them are in view
    await new Promise(r => setTimeout(r, 500));
    return { stand: [runOf('p1').ph, runOf('f1').ph], p1: tr.id, coach: tr.consist[2].id, f1: R.state.trains[runOf('f1').slot].id, people: people.length, fx: fq.x };
  });
}

module.exports = async function checkPixRender() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    const P = m => problems.push(`${orient}: ${m}`);
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      await page.waitForTimeout(300);
      // 1. The default view.
      const d = await page.evaluate(() => {
        const R = window.__railhead, X = R.pix, v = X.view, out = { bad: [] }, B = m => out.bad.push(m);
        const base = X.pixBaseScale(innerWidth * devicePixelRatio, innerHeight * devicePixelRatio);
        if (v.scale !== base) B(`the default scale is ${v.scale}, expected ${base}`);
        const on = (x, z, y, m) => { const p = R.toScreen(x, z, y || 0); return p.x >= -m && p.x <= innerWidth + m && p.y >= -m && p.y <= innerHeight + m; };
        const S = R.state, P = R.proto.PROTO;
        if (!on(S.player.x, S.player.z, 0, 0)) B('the player is not on the screen');
        // Since 2026-11-11 the view starts (and stays) centred on the player: his feet on the middle native pixel.
        const q = X.pixPlayerPoint(S.player.x, S.player.z), off = [Math.round(q.x) - v.vx - Math.floor(v.nw / 2), Math.round(q.y) - v.vy - Math.floor(v.nh / 2)];
        if (off[0] || off[1]) B(`the default view is not centred on the player (his feet ${off} native px from the middle)`);
        // What shows round him (he starts on platform 1 in front of the schedule board): portrait is narrow (about
        // 260 native px), so platform 2's east half, track 3 and the station's front show in landscape.
        // D27: things are about twice D25's size, so the default view (about 32u of track: plans/d27-tech.md 1.6) shows
        // platform 1 round him, track 1, the east footbridge's deck and the station's front; the cargo platform by panning.
        const tall = innerHeight > innerWidth, px = P.PLAYER.x;
        for (const [nm, x, z] of [['platform 1', px - 4, (P.P1.z0 + P.P1.z1) / 2], ['track 1 at the stop', px, -P.D1], ['the east footbridge', P.FB.X[1], -6], ['the station\'s front', P.STATION.x1 - 4, P.STATION.z1]])
          if (!on(x, z, 0, 0)) B(`${nm} is not on the screen`);
        const keys = X.drawn.map(r => r.key || '');
        for (const k of ['bld/station', 'bld/canopy', 'bld/schedboard', 'bld/footbridge/deck', 'ppl/agent/']) if (!keys.some(q => q.startsWith(k))) B(`nothing drawn from ${k}`);
        if (X.drawn.some(r => r.si < 0 && r.hit && r.hit.k !== 'tool')) B(`placeholder shapes drawn: ${X.drawn.filter(r => r.si < 0).map(r => r.id).join(', ')}`);
        out.scale = v.scale; out.native = [v.nw, v.nh];
        return out;
      });
      d.bad.forEach(P);
      await page.screenshot({ path: screenshotPath(`pixrender-default-${orient}`) });
      // The town by panning: drag up-left in steps (the view's offset), the shops come on screen.
      const town = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix;
        // (D27: each shop on its lot up the main street, SHOPS27)
        const miss = [];
        for (const sh of R.proto.PROTO_SHOPS) {
          X.pixLookAt(0, sh.door.z); await new Promise(r => setTimeout(r, 250));
          if (!X.drawn.some(r => (r.key || '').startsWith('bld/' + sh.bld))) miss.push('bld/' + sh.bld);
        }
        X.pixLookAt(0, -38); await new Promise(r => setTimeout(r, 250));
        return miss;
      });
      if (town.length) P(`the town's shops are not drawn when panned there: ${town.join(', ')}`);
      await page.screenshot({ path: screenshotPath(`pixrender-town-${orient}`) });
      // 2. The busy moment.
      const b = await busy(page);
      if (b.stand.join() !== 'stand,stand') P(`the two trains did not stand (${b.stand})`);
      const bs = await page.evaluate((b) => {
        const R = window.__railhead, X = R.pix, out = { bad: [] }, B = m => out.bad.push(m), keys = X.drawn.map(r => r.key || ''), n = p => keys.filter(k => k.startsWith(p)).length;
        // D27: the stock and the travellers are bigger than the view holds; each one whose anchor is in view must be drawn.
        const inV = (x, z, y) => { const p = R.toScreen(x, z, y || 0); return p.x >= 4 && p.x <= innerWidth - 4 && p.y >= 4 && p.y <= innerHeight - 4; };
        const vehIn = k => R.state.trains.reduce((m, tr) => m + R.trainPoses(R.state.track, tr).filter(p => p.k === k && inV(p.x, p.z, 1)).length, 0);
        const ppIn = window.__pixPeople.filter(q => inV(q.x, q.z, 0.5)).length + 1;
        if (!(n('veh/loco') >= vehIn('loco'))) B(`${n('veh/loco')} engines drawn, ${vehIn('loco')} in view`);
        if (!(n('veh/coach/') >= vehIn('coach'))) B(`${n('veh/coach/')} coaches drawn, ${vehIn('coach')} in view`);
        if (!(n('veh/boxcar') >= vehIn('boxcar'))) B(`${n('veh/boxcar')} boxcars drawn, ${vehIn('boxcar')} in view`);
        if (!(vehIn('loco') + vehIn('coach') >= 2 && vehIn('boxcar') >= 1)) B('the busy view does not hold both trains');
        if (!(n('ppl/') >= ppIn)) B(`${n('ppl/')} people drawn (expected the ${ppIn - 1} travellers in view and the agent)`);
        for (const dir of ['se', 'ne', 'sw', 'nw']) if (!keys.some(k => k.startsWith('ppl/') && k.includes('/' + dir + '/'))) B(`no person drawn facing ${dir}`);
        if (!keys.some(k => k.startsWith('ppl/agent/carry/'))) B('the agent is not drawn carrying');
        if (!keys.some(k => k.startsWith('goods/') && k.includes('/carried'))) B('the carried crate is not drawn');
        const goodsIn = R.pg.pgDrawList(R.state).filter(q => q.at === 'hand' || ((q.at === 'bay' || q.at === 'ground') && inV(q.x, q.z, 1.6))).length;
        if (!(n('goods/') >= goodsIn && goodsIn >= 4)) B(`${n('goods/')} goods drawn (${goodsIn} in view)`);
        if (!(n('tag/') >= 3)) B(`${n('tag/')} tags drawn`);
        if (!keys.some(k => k.startsWith('bld/freighthouse'))) B('the freight house (the storage shed) is not drawn');
        if (!(n('sw/points/') >= 1)) B('no switch points drawn');
        if (X.drawn.some(r => r.si < 0 && r.hit && r.hit.k !== 'tool')) B(`placeholder shapes drawn: ${X.drawn.filter(r => r.si < 0).map(r => r.id).join(', ')}`);
        // Painter's order (ids of the sorted items).
        const o = X.order, at = id => o.indexOf(id), coach = `tr${b.p1}/2`, f1 = o.filter(id => id && id.startsWith(`tr${b.f1}/`));
        const before = (a, c, why) => { if (at(a) < 0 || at(c) < 0) B(`${why}: not both drawn (${a} ${at(a)}, ${c} ${at(c)})`); else if (!(at(a) < at(c))) B(`${why}: ${a} is drawn after ${c}`); };
        before('pp100', `tr${b.p1}/1`, 'a traveller on platform 1 behind the first coach');
        const near = id => f1.find(t => { const it = R.pix.pixScene(0).find(q => q.id === t); return it && it.x0 <= b.fx && it.x1 >= b.fx; });
        const fc = near();
        if (fc) { before('pp900', fc, 'a traveller on platform 2 behind the freight train'); before(fc, 'pp901', 'a traveller in front of the freight train'); }
        else B(`no freight car drawn at x ${b.fx}`);
        before('pp902', 'storage/body', 'a traveller behind the storage shed'); before('storage/body', 'pp903', 'a traveller in front of the storage shed');
        for (const id of o.filter(q => q && q.startsWith('fb') && q.endsWith('/deck'))) for (const t of o.filter(q => q && q.startsWith(`tr${b.p1}/`))) {
          const A = R.pix.pixScene(0), di = A.find(q => q.id === id), ti = A.find(q => q.id === t);
          if (di && ti && di.x0 < ti.x1 && di.x1 > ti.x0) before(t, id, 'the bridge deck over the train beneath');
        }
        // See-through (the designer's rule): the coaches in front of the line, the shed in front of the traveller
        // behind it; not the shed for the one walking in front of it.
        const see = X.PIX.seeThrough;
        if (!see.some(id => id.startsWith(`tr${b.p1}/`))) B(`no coach turns see-through over the line behind it (${see.join(', ')})`);
        if (!see.some(id => id.startsWith('storage/'))) B(`the storage shed does not turn see-through over the traveller behind it (${see.join(', ')})`);
        if (see.some(id => id.startsWith('pp') || id === 'player')) B(`a person was made see-through: ${see.join(', ')}`);
        out.see = see.join(' ');
        out.ms = X.stats.ms; out.items = X.stats.items; out.draws = X.stats.draws;
        return out;
      }, b);
      bs.bad.forEach(P);
      await page.screenshot({ path: screenshotPath(`pixrender-busy-${orient}`) });
      // Frame time: the busy moment running at 1x for 2 seconds.
      const ft = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix;
        R.pix.setSpeed(1); X.PIX.msHist.length = 0; await new Promise(r => setTimeout(r, 2000)); R.pix.setSpeed(0);
        return { avg: +X.stats.msAvg.toFixed(2), max: +X.stats.msMax.toFixed(2), items: X.stats.items, draws: X.stats.draws };
      });
      console.log(`  ${orient}: scale ${d.scale} (${d.native.join(' x ')} native px); busy moment ${bs.items} items, ${bs.draws} sprite draws; frame ${ft.avg} ms average, ${ft.max} ms worst over 2 s at 1x`);
      if (!(ft.avg < 16)) P(`the frame takes ${ft.avg} ms on average`);
      // 3. Picking what is drawn (the busy moment, re-made: the run above moved things).
      await busy(page);
      const pk = await page.evaluate(() => {
        const R = window.__railhead, X = R.pix, v = X.view, D = X.drawn, out = { bad: [], tried: 0, ok: 0 }, B = m => out.bad.push(m);
        // A sprite's pixel as drawn: inside its frame, not in a see-through part over someone, not transparent.
        const solid = (d, nx, ny) => { const u = nx - d.l, w = ny - d.t; if (u < 0 || w < 0 || u >= d.w || w >= d.h) return false;
          if (d.see && d.see.some(r => u >= r[0] && w >= r[1] && u < r[2] && w < r[3])) return false; return d.si < 0 || alphaOf(d.si, d.fx + u, d.fy + w) > 0; };
        const cv = {}; const alphaOf = (si, x, y) => { let c = cv[si]; if (!c) { const im = X.PIXA.imgs[si], k = document.createElement('canvas'); k.width = im.width; k.height = im.height; const g = k.getContext('2d'); g.drawImage(im, 0, 0); c = cv[si] = { w: k.width, d: g.getImageData(0, 0, k.width, k.height).data }; } return c.d[4 * (y * c.w + x) + 3]; };
        const top = (nx, ny) => { for (let i = D.length - 1; i >= 0; i--) if (solid(D[i], nx, ny)) return D[i]; return null; };
        const css = (nx, ny) => [(nx + 0.5 - v.vx) * v.scale / v.dpr, (ny + 0.5 - v.vy) * v.scale / v.dpr];
        const same = (h, r) => h && r && h.k === r.k && h.id === r.id && h.stock === r.stock;
        const inView = d => { const [x, y] = css(d.l + d.w / 2, d.t + d.h / 2); return x > 8 && y > 8 && x < innerWidth - 8 && y < innerHeight - 8; };
        const want = { sw: 0, tr: 0, pp: 0, item: 0, bld: 0, player: 0 };
        for (const d of D) {
          if (!d.hit || !inView(d)) continue;
          // a pixel of this sprite that nothing drawn later covers, from its middle outwards
          let spot = null;
          const cx = d.l + (d.w >> 1), cy = d.t + (d.h >> 1);
          for (let r = 0; r < Math.max(d.w, d.h) && !spot; r++) for (let j = -r; j <= r && !spot; j++) for (const [u, w] of [[cx + j, cy - r], [cx + j, cy + r], [cx - r, cy + j], [cx + r, cy + j]]) if (!spot && top(u, w) === d) spot = [u, w];
          if (!spot) continue;
          out.tried++;
          const [x, y] = css(spot[0], spot[1]), h = X.pixPick(x, y);
          if (same(h, d.hit) && h.exact) { out.ok++; if (d.hit.k in want) want[d.hit.k]++; }
          else B(`a tap on ${d.key || d.id} (${d.hit.k} ${d.hit.id}) at (${x.toFixed(0)}, ${y.toFixed(0)}) picked ${JSON.stringify(h)}`);
        }
        // Each kind on the screen picked at least once (portrait shows them all; landscape's view may hold no stand).
        for (const [k, n] of Object.entries(want)) if (!n && (k !== 'sw' || innerHeight > innerWidth)) B(`no ${k} picked by a tap on its pixels`);
        out.kinds = want;
        // pickAt (the game's tap) gives the same for a coach and a switch stand.
        const coach = D.find(d => d.hit && d.hit.k === 'tr' && d.key && d.key.startsWith('veh/coach') && inView(d));
        if (coach) { const s = (() => { for (let u = coach.l; u < coach.l + coach.w; u++) for (let w = coach.t; w < coach.t + coach.h; w++) if (top(u, w) === coach) return [u, w]; })(); const [x, y] = css(s[0], s[1]), h = X.pickAt(x, y); if (!h || h.k !== 'tr' || h.stock !== coach.hit.stock) B(`pickAt on a coach gave ${JSON.stringify(h)}`); }
        const store = D.find(d => d.hit && d.hit.k === 'bld' && d.hit.shop);
        if (store && !(store.hit.door && Number.isFinite(store.hit.door.x))) B('a shop pick does not give its door spot');
        // A thumb's margin: 4 CSS px left of a traveller's leftmost pixel row picks them; bare grass picks nothing.
        const pp = D.filter(d => d.hit && d.hit.k === 'pp' && inView(d))[0];
        if (pp) {
          let s = null; for (let u = pp.l; u < pp.l + pp.w && !s; u++) for (let w = pp.t; w < pp.t + pp.h && !s; w++) if (top(u, w) === pp) s = [u, w];
          const [x, y] = css(s[0], s[1]), h = X.pixPick(x - 4, y);
          if (!(h && h.k === 'pp')) B(`a tap 4 px beside a traveller picked ${JSON.stringify(h)}`);
        }
        const g = R.toScreen(-40, 16, 0);
        X.pixLookAt(-40, 16);
        out.grassAt = g;
        return out;
      });
      await page.waitForTimeout(250);
      const grass = await page.evaluate(() => { const X = window.__railhead.pix; return X.pixPick(innerWidth / 2, innerHeight / 2); });
      if (grass) P(`a tap on bare grass picked ${JSON.stringify(grass)}`);
      pk.bad.slice(0, 8).forEach(P);
      console.log(`  ${orient}: picking: ${pk.ok} of ${pk.tried} things picked by a tap on their own visible pixels`);
      // 4. Footbridges: the player up the east bridge's stairs onto its deck (heights from the bridges' geometry), a
      // traveller on the west bridge's deck at a height the sim gives; someone under a deck stays below.
      await busy(page);
      const fb = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, out = { bad: [], ys: [] }, B = m => out.bad.push(m), frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const [W, E] = X.pixBridges().sort((a, b) => a.x - b.x);
        const sx = E.p1 === 'e' ? 1 : -1, F = R.proto.PROTO_FB, zs = (F.Z1[0] + F.Z1[1]) / 2;   // the middle of T's platform 1 flight
        X.placePlayer(E.x + sx * (F.HALF + F.RUN + 1), zs); await frame();
        for (let i = 0; i <= 14; i++) { X.placePlayer(E.x + sx * (F.HALF + F.RUN * (0.95 - i * 0.9 / 14)), zs); await frame(); out.ys.push(+X.PIX.wy.player.toFixed(2)); }
        for (const z of [-6.5, -5, -3.5]) { X.placePlayer(E.x, z); await frame(); }
        out.deckY = X.PIX.wy.player;
        if (Math.abs(out.deckY - F.TOP) > 0.01) B(`the player on the deck is drawn at y ${out.deckY}, not the deck's ${F.TOP}`);
        if (!(out.ys[0] < 1.2 && out.ys[out.ys.length - 1] > 5) || out.ys.some((y, i) => i && y < out.ys[i - 1] - 1e-6)) B(`up the stairs the heights are ${out.ys.join(' ')}`);
        const o = X.order, at = id => o.indexOf(id);
        if (!(at(E.id + '/deck') < at('player') && at('player') < at(E.id + '/rail'))) B(`the walker on the deck is not between the deck and its near railing (${at(E.id + '/deck')}, ${at('player')}, ${at(E.id + '/rail')})`);
        window.__pixPeople.push({ id: 950, x: W.x, z: -1.5, f: 'sw', act: 'walk', who: 'woman_bonnet', y: F.TOP }, { id: 951, x: W.x + (W.p1 === 'e' ? 1 : -1) * (F.HALF + F.RUN / 2), z: zs, f: 'ne', act: 'walk', who: 'man_top' });
        await frame();
        if (Math.abs(X.PIX.wy.pp950 - F.TOP) > 0.01) B(`a traveller given y ${F.TOP} is drawn at ${X.PIX.wy.pp950}`);
        if (!(X.PIX.wy.pp951 > F.TOP * 0.3 && X.PIX.wy.pp951 < F.TOP * 0.7)) B(`a traveller halfway up the stairs is drawn at y ${X.PIX.wy.pp951}`);
        X.pixLookAt(E.x - 2, -3);
        await frame(); await frame();
        out.under = null;
        return out;
      });
      fb.bad.forEach(P);
      await page.waitForTimeout(200);
      await page.screenshot({ path: screenshotPath(`pixrender-footbridge-${orient}`) });
      const below = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const E = X.pixBridges().sort((a, b) => a.x - b.x)[1];
        const P1 = R.proto.PROTO.P1;
        // Beside the deck on platform 1's edge (the strip under the deck itself is the bridge on T's walk grid, so nobody
        // walks under it: integrator, 2026-11-10).
        X.PIX.wy.player = 0; X.placePlayer(E.x + 1.2, P1.z1 - 0.3); await frame();
        const y = X.PIX.wy.player;
        // Under the canopy: the canopy is drawn after the player, see-through.
        X.placePlayer(0, (P1.z0 + P1.z1) / 2 - 0.8); await frame(); await frame();
        const o = X.order;
        return { y, canopy: X.canopyFade, order: o.indexOf('player') < o.indexOf('canopy') };
      });
      if (Math.abs(below.y - 0.375) > 0.01) P(`the player beside a deck on platform 1 is drawn at y ${below.y} (expected the platform's 0.375)`);
      if (!below.canopy || !below.order) P(`under the canopy: see-through ${below.canopy}, drawn after the player ${below.order}`);
      await page.screenshot({ path: screenshotPath(`pixrender-canopy-${orient}`) });
      // 5. The schedule board's text: U's rows through pixBoardDraw.
      const bd = await page.evaluate(async () => {
        const X = window.__railhead.pix;
        X.pixBoardDraw(['06:40 T1', { text: '09:15 T1', late: true }]);
        const sb = window.__railhead.proto.PROTO.SCHEDBOARD; X.pixLookAt(sb.x - 1, sb.z + 2); window.__railhead.camera.zoom = 3;
        await new Promise(r => setTimeout(r, 300));
        const rows = X.pixBoardRowsNow();
        return rows.map(r => r.text + (r.late ? '!' : '')).join('|');
      });
      if (bd !== '06:40 T1|09:15 T1!') P(`the board shows ${bd}`);
      await page.screenshot({ path: screenshotPath(`pixrender-board-${orient}`) });
      await page.evaluate(() => { window.__railhead.pix.pixBoardDraw(null); window.__railhead.camera.zoom = 1.5; });
      // 6. Zoom steps: whole scales, rising with cam.zoom, the default at 1.5; every native pixel a crisp square.
      if (orient === 'portrait') {
        const z = await page.evaluate(async () => {
          const R = window.__railhead, X = R.pix, out = { bad: [], steps: [] }, B = m => out.bad.push(m);
          X.pixLookAt(2, -6);
          for (const zm of [0.4, 0.75, 1.5, 2.25, 3, 4]) {
            R.camera.zoom = zm; await new Promise(r => setTimeout(r, 150));
            const s = X.view.scale; out.steps.push(s);
            if (!Number.isInteger(s) || s < 1 || s > 8) B(`zoom ${zm}: scale ${s}`);
            const cv = X.canvas, d = cv.getContext('2d').getImageData(0, Math.floor(cv.height / 2), cv.width, 1).data;
            for (let x = 1; x < cv.width; x++) if (x % s && (d[4 * x] !== d[4 * x - 4] || d[4 * x + 1] !== d[4 * x - 3] || d[4 * x + 2] !== d[4 * x - 2])) { B(`zoom ${zm}: the colour changes inside a scaled pixel at x ${x}`); break; }
          }
          if (out.steps.some((s, i) => i && s < out.steps[i - 1])) B(`scales do not rise with the zoom: ${out.steps}`);
          R.camera.zoom = 1.5;
          return out;
        });
        z.bad.forEach(P);
        console.log(`  zoom 0.4 to 4 gives scales ${z.steps.join(', ')}`);
        for (const [nm, zm] of [['z1', 0.6], ['z3', 2.25], ['z5', 4]]) {
          await page.evaluate((zm) => { const R = window.__railhead; R.camera.zoom = zm; R.pix.pixLookAt(6, -4); }, zm);
          await page.waitForTimeout(250);
          await page.screenshot({ path: screenshotPath(`pixrender-zoom-${nm}-portrait`) });
        }
      }
      // 7. The view follows the player (2026-11-11): while he walks along platform 2 (carrying the crate) his sprite's anchor (his feet) is
      // on the middle native pixel of the view every frame, and the view moves with him in whole pixels. A look away
      // (as a drag) stays while he stands, eases back once he walks; the Centre button snaps back.
      const fol = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, S = R.state, P2 = R.proto.PROTO.P2, z = R.proto.PROTO.P1.z0 + 2, out = { bad: [], n: 0, moved: 0 }, B = m => out.bad.push(m);   // (D27: along platform 1, behind the footbridge's flight)
        const raf = () => new Promise(r => requestAnimationFrame(r)), wait = ms => new Promise(r => setTimeout(r, ms));
        const feet = () => {
          const v = X.view, d = X.drawn.find(q => q.hit && q.hit.k === 'player'), f = d && X.frameOf(d.key);
          return d && f ? [d.l + f[5] - v.vx - Math.floor(v.nw / 2), d.t + f[6] - v.vy - Math.floor(v.nh / 2)] : null;
        };
        R.camera.zoom = 1.5; R.camera.ox = 0; R.camera.oz = 0;
        X.placePlayer(2, z); S.player.mode = 'idle'; S.player.use = null; S.player.act = null;
        await raf(); await raf();
        const vx0 = X.view.vx;
        R.send({ t: 'walkTo', x: 1800, z: Math.round(z * 100) }); X.setSpeed(1);
        await wait(300);
        for (let t0 = performance.now(); performance.now() - t0 < 1500;) {
          await raf();
          const f = feet(), v = X.view;
          if (!f) { B('the player was not drawn'); break; }
          out.n++;
          if (f[0] || f[1]) { B(`walking, his feet are ${f} native px from the view's middle`); break; }
          if (!Number.isInteger(v.vx) || !Number.isInteger(v.vy)) { B(`the view is not on whole pixels (${v.vx}, ${v.vy})`); break; }
        }
        out.moved = X.view.vx - vx0;
        if (!(out.moved > 20)) B(`the view moved ${out.moved} native px with him (expected it to follow)`);
        return out;
      });
      fol.bad.forEach(P);
      await page.screenshot({ path: screenshotPath(`pixrender-follow-${orient}`) });
      const back = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, S = R.state, P2 = R.proto.PROTO.P2, z = R.proto.PROTO.P1.z0 + 2, out = { bad: [] }, B = m => out.bad.push(m), c = R.camera;
        const wait = ms => new Promise(r => setTimeout(r, ms)), off = () => Math.hypot(c.ox, c.oz), centre = document.getElementById('centre');
        for (let i = 0; i < 100 && S.player.mode !== 'idle'; i++) await wait(100);   // he arrives
        await wait(300);   // and stands (a tick on)
        X.pixLookAt(S.player.x, S.player.z - 8); await wait(400);
        if (!(off() > 7)) B(`a look away while he stands did not stay (offset ${off().toFixed(2)})`);
        if (centre.hidden) B('the Centre button is hidden while the view looks away');
        R.send({ t: 'walkTo', x: Math.round((S.player.x - 7) * 100), z: Math.round(z * 100) });
        await wait(1600);
        if (S.player.mode === 'idle') B('he stopped before the look away could ease back (the check walks too short a way)');
        if (off() !== 0) B(`a look away did not ease back once he walked (offset ${off().toFixed(2)} after 1.6 s)`);
        X.setSpeed(0);
        X.pixLookAt(S.player.x + 6, S.player.z); await wait(150);
        centre.click(); await wait(150);
        if (off() !== 0 || !centre.hidden) B(`the Centre button did not snap back (offset ${off()}, hidden ${centre.hidden})`);
        return out;
      });
      back.bad.forEach(P);
      console.log(`  ${orient}: follow: ${fol.n} frames walking, feet on the view's middle pixel in each; the view moved ${fol.moved} native px`);
      await page.evaluate(() => { if (window.__pixOrigDrawList) window.ppDrawList = window.__pixOrigDrawList; });
      if (errors.length) P('console errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
module.exports.busy = busy;
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
