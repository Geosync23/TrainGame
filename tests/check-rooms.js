// Check: D32 stage 3 (Rooms, plans/d32-tech.md 8.2, 8.3 and 8.5): every building entered, and the far town.
// - Every town building has a room; its walls are shut on the walk grid but for its doorway; its floor is open.
// - Each building opens by the three triggers (the player inside, within 1.2u of its doorway outside, a tap on it),
//   one at a time; the fade takes about 0.25 s and is soft (half-way there is a half-clear building, no hard patch).
// - The player walks in through the door (a walk from the street), and from behind the building he goes round to the
//   door: never through a wall.
// - The townsfolk: a whole day with the town live: they walk in and on to their spots and out again; no one, indoors
//   or out, ever stands in a wall; every indoor way keeps clear of solid furniture; drawn inside an open building in
//   its own order (the keeper behind his counter); hidden inside a shut one.
// - The camp's tents open the same way, one at a time; ?rooms=0 parks it all.
// - Frame time with a building open (4x throttled, the default zoom).
// - The far town: drawn at the end of track, no pixel of the world's background at the furthest zoom there in both
//   orientations, the dev jump and the last spike's cheer (the card, the townsfolk on the platform).
// Screenshots test-output/rooms-*.png and fartown-*.png.
const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkRooms() {
  const problems = [];
  const frames = (page, n) => page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const start = async (page) => {
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 });
    await page.evaluate(() => { const R = window.__railhead; R.pdui.closeBoard(); R.send({ t: 'pdStart' }); R.step(2); });
  };
  // (the lessons out of the way: their cards hold the clock and cover the screen)
  const NOL = `const nol = () => { const S = R.state; if (S.pd) { S.pd.les = S.pd.les || {}; for (const L of R.les.PD_LESSONS) S.pd.les[L.id] = -1; S.pd.lesWait = []; } for (const id of ['pdLesson', 'pdSum']) { const b = document.getElementById(id); if (b) b.hidden = true; } };`;
  const ev = (page, body, arg) => page.evaluate(`(async (A) => { const R = window.__railhead, g = (0, eval); ${NOL} ${body} })(${JSON.stringify(arg === undefined ? null : arg)})`);

  // ---------------- Part 1: the rooms, portrait ----------------
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
    const P = m => problems.push('rooms: ' + m);
    try {
      await start(page);
      // 1. A room for every town building; walls shut but the doorway; the floor open; spots' ways clear of furniture
      const geo = await ev(page, `
        const T = R.state.track, rooms = R.rm.rooms(), L = g('BLD_LAYOUTS').proto, G = g('walkGrid')(T), open = (x, z) => G.cost[g('walkCell')(x, z)] > 0;
        const want = L.filter(a => /^(shop|church|school|house27|station)$/.test(a.kind)).map(a => a.id);
        const out = { n: rooms.length, missing: want.filter(id => !rooms.some(r => r.id === id)), wallOpen: [], doorShut: [], floorShut: [], wayHits: [], kinds: {} };
        for (const r of rooms) {
          out.kinds[r.kind] = (out.kinds[r.kind] || 0) + 1;
          const d = r.door, fp = r.fp, Wl = R.rm.RM.WALL;
          // the wall's middle line, all round, every 0.25u: shut, except within the doorway
          const ring = [];
          for (let x = fp.x0 + 0.3; x <= fp.x1 - 0.3; x += 0.25) ring.push([x, fp.z0 + Wl / 2], [x, fp.z1 - Wl / 2]);
          for (let z = fp.z0 + 0.3; z <= fp.z1 - 0.3; z += 0.25) ring.push([fp.x0 + Wl / 2, z], [fp.x1 - Wl / 2, z]);
          for (const [x, z] of ring) { const a = Math.abs((x - d.x) * d.t[0] + (z - d.z) * d.t[1]); if (a > d.w / 2 + 0.3 && open(x, z)) { out.wallOpen.push(r.id + ' ' + x.toFixed(2) + ',' + z.toFixed(2)); break; } }
          if (!open(d.x + d.n[0] * 0.2, d.z + d.n[1] * 0.2)) out.doorShut.push(r.id);
          if (!open(d.ix, d.iz)) out.floorShut.push(r.id);
          for (const sp of r.spots) {
            const w = [[d.ix, d.iz]].concat(sp.path);
            for (let k = 1; k < w.length; k++) {
              const L = Math.hypot(w[k][0] - w[k - 1][0], w[k][1] - w[k - 1][1]), last = k === w.length - 1;
              for (let s = 0; s <= L; s += 0.1) {
                if (last && L - s < 1.3) break;   // (the last steps onto his seat or his bed)
                const x = w[k - 1][0] + (w[k][0] - w[k - 1][0]) * s / Math.max(L, 1e-9), z = w[k - 1][1] + (w[k][1] - w[k - 1][1]) * s / Math.max(L, 1e-9);
                const hit = r.furn.find(q => q.solid && Math.abs(x - q.x) < q.w / 2 - 0.05 && Math.abs(z - q.z) < q.d / 2 - 0.05);
                if (hit || x < r.x0 - 0.01 || x > r.x1 + 0.01 || z < r.z0 - 0.01 || z > r.z1 + 0.01) { out.wayHits.push(r.id + ' ' + sp.role + ' ' + (hit ? hit.k : 'the wall')); k = w.length; break; }
              }
            }
          }
        }
        return out;`);
      if (geo.missing.length) P('buildings without a room: ' + geo.missing.join(', '));
      if (geo.n < 23) P(`only ${geo.n} rooms`);
      if (geo.wallOpen.length) P('a wall open outside the doorway: ' + geo.wallOpen.slice(0, 4).join('; '));
      if (geo.doorShut.length) P('a doorway shut: ' + geo.doorShut.join(', '));
      if (geo.floorShut.length) P('a floor shut inside the door: ' + geo.floorShut.join(', '));
      if (geo.wayHits.length) P('an indoor way through furniture or a wall: ' + [...new Set(geo.wayHits)].slice(0, 6).join('; '));
      console.log(`  ${geo.n} rooms (${Object.entries(geo.kinds).map(([k, n]) => k + (n > 1 ? ' x' + n : '')).join(', ')}): walls shut but the doorway, floors open, every indoor way clear of solid furniture`);

      // 2. The three triggers, one at a time, for every building
      const trig = await ev(page, `
        const S = R.state, V = R.rm.view, rooms = R.rm.rooms(), bad = [], many = [];
        V.snap(true);
        const fr = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
        const far = () => { R.pix.placePlayer(0, -14.5, 0.375); };
        for (const r of rooms) {
          const d = r.door, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
          nol(); far(); V.tap(null); await fr();
          if (V.open) bad.push(r.id + ': open with nobody near (' + V.open + ')');
          R.pix.placePlayer(d.ix + d.n[0] * 0.6, d.iz + d.n[1] * 0.6); await fr();
          if (V.open !== r.id) bad.push(r.id + ': not open with him inside (' + V.open + ')');
          R.pix.placePlayer(d.x - d.n[0] * 1.0, d.z - d.n[1] * 1.0); await fr();
          if (V.open !== r.id) bad.push(r.id + ': not open with him 1u outside its door (' + V.open + ')');
          R.pix.placePlayer(d.x - d.n[0] * 2.5, d.z - d.n[1] * 2.5); await fr();
          if (V.open === r.id) bad.push(r.id + ': open with him 2.5u from its door');
          far(); await fr();
          if (!V.tapHit({ k: 'bld', id: r.id })) bad.push(r.id + ': a tap did not open it'); await fr();
          if (V.open !== r.id) bad.push(r.id + ': not open after a tap (' + V.open + ')');
          if (V.fade.filter(q => q[1] > 0.99).length !== 1) many.push(r.id + ': ' + JSON.stringify(V.fade));
          if (!R.rm.view.items().includes(r.id)) bad.push(r.id + ': no open item drawn');
        }
        // the tap is let go by a tap elsewhere, and by walking away
        V.tapHit({ k: 'bld', id: 'shop_store' }); await fr(); const a = V.open; V.tapHit(null); await fr(); const b = V.open;
        V.tapHit({ k: 'bld', id: 'shop_bank' }); await fr(); R.pix.placePlayer(0, -33); await fr(); const c = V.open;
        far(); V.tap(null); V.snap(false); await fr();
        return { bad, many, a, b, c, n: rooms.length };`);
      trig.bad.slice(0, 8).forEach(P);
      if (trig.many.length) P('more than one building open: ' + trig.many.slice(0, 3).join('; '));
      if (trig.a !== 'shop_store' || trig.b !== null || trig.c !== null) P(`a tapped building does not shut when he taps elsewhere or walks off (${trig.a}, ${trig.b}, ${trig.c})`);
      console.log(`  all ${trig.n} buildings open by each trigger (inside, 1u outside the door, a tap), not from 2.5u, one at a time; a tap elsewhere or a walk away shuts the tapped one`);

      // 3. The fade: real time, soft (half-clear half-way), and a real tap on the screen
      const fade = await ev(page, `
        const V = R.rm.view; V.snap(false); R.camera.zoom = 1.5;
        R.pix.placePlayer(-4, -38); await new Promise(r => setTimeout(r, 500));
        const p = R.pix.pixToScreen(-15.5, 2.5, -38);
        return { x: p.x, y: p.y };`);
      await page.touchscreen.tap(fade.x, fade.y);
      const f2 = await ev(page, `
        const V = R.rm.view, t0 = performance.now(), seen = [];
        while (performance.now() - t0 < 450) { await new Promise(r => requestAnimationFrame(r)); seen.push([Math.round(performance.now() - t0), (V.fade.find(q => q[0] === 'shop_store') || [0, 0])[1]]); }
        // a pixel of the shut store's front, before, half-way and open
        return { open: V.open, seen };`);
      if (f2.open !== 'shop_store') P('a real tap on the store did not open it (' + f2.open + ')');
      else {
        const mid = f2.seen.find(q => q[1] > 0.2 && q[1] < 0.8), full = f2.seen.find(q => q[1] >= 1);
        if (!mid) P('the fade has no in-between frame: ' + JSON.stringify(f2.seen.slice(0, 6)));
        if (!full || full[0] > 400) P('the fade took longer than 0.4 s: ' + JSON.stringify(full));
        else console.log(`  a real tap on the store opens it; the fade passes ${mid ? mid[1].toFixed(2) : '?'} at ${mid ? mid[0] : '?'} ms and is open at ${full[0]} ms (0.25 s asked)`);
      }

      // 4. The player walks in through the door, and round to it from behind
      const walk = await ev(page, `
        const S = R.state, rm = R.rm, out = [];
        for (const [id, from, to] of [['shop_store', [-3, -38], null], ['house2', [-27, -60], null], ['church', [0, -114], null], ['shop_saloon', [3, -38], null], ['shop_store', [-24, -38], 'behind']]) {
          const r = rm.rmRoom(id), d = r.door, tx = (r.x0 + r.x1) / 2, tz = (r.z0 + r.z1) / 2;
          nol(); R.pix.placePlayer(from[0], from[1]); S.player.mode = 'idle';
          R.send({ t: 'walkTo', x: Math.round(tx * 100), z: Math.round(tz * 100) });
          let thru = false, wall = null, inside = false, n = 0;
          for (; n < 600 && !inside; n++) {
            R.step(1); const x = S.player.x, z = S.player.z;
            const inFp = x > r.fp.x0 + 0.05 && x < r.fp.x1 - 0.05 && z > r.fp.z0 + 0.05 && z < r.fp.z1 - 0.05;
            if (inFp && !rm.rmRoomAt(x, z, 0)) wall = [x.toFixed(2), z.toFixed(2)];
            const a = (x - d.x) * d.t[0] + (z - d.z) * d.t[1], b = (x - d.x) * d.n[0] + (z - d.z) * d.n[1];
            if (Math.abs(a) < d.w / 2 && b > -0.3 && b < 0.6) thru = true;
            if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1 && Math.hypot(x - tx, z - tz) < 0.8) inside = true;
          }
          out.push({ id, to, thru, wall, inside, n, y: S.player.y === undefined ? R.d27.walkDeckY(S.track, S.player.x, S.player.z) : S.player.y });
        }
        return out;`);
      for (const w of walk) {
        if (!w.inside) P(`${w.id}${w.to ? ' (from ' + w.to + ')' : ''}: he did not walk in (${w.n} ticks)`);
        else if (!w.thru) P(`${w.id}: he got in without passing the doorway`);
        if (w.wall) P(`${w.id}: he stood in a wall at ${w.wall}`);
      }
      console.log('  the player walks in through the door of ' + walk.filter(w => w.inside && w.thru && !w.wall).map(w => w.id + (w.to ? ' (from ' + w.to + ', round to the door)' : '')).join(', ') + '; never in a wall');

      // 5. A day of the townsfolk: in to their spots and out again, never in a wall; drawn inside an open one, hidden in a shut one
      const day = await ev(page, `
        const S = R.state, rm = R.rm, rooms = rm.rooms(), tf = R.tf, t1 = S.time + 86400 - 600;
        const inWall = (x, z) => { for (const r of rooms) { const f = r.fp; if (x > f.x0 + 0.05 && x < f.x1 - 0.05 && z > f.z0 + 0.05 && z < f.z1 - 0.05 && !rm.rmRoomAt(x, z, 0)) return r.id; } return null; };
        const walkedIn = new Set(), atSpot = new Set(), walkedOut = new Set(), bad = [], roles = {};
        let n = 0, prev = new Map();
        R.pix.placePlayer(0, -14.5, 0.375);
        while (S.time < t1) {
          R.step(2); nol(); n++;
          for (const q of rm.rmPeople(S)) {
            const w = inWall(q.x, q.z); if (w) bad.push(q.id + ' in the wall of ' + w + ' (' + q.act + ')');
            const p = prev.get(q.id);
            if (q.act === 'walk') { (p && p.act !== 'walk' ? walkedOut : walkedIn).add(q.id); } else { atSpot.add(q.id + '@' + q.rm); roles[q.role] = (roles[q.role] || 0) + 1; }
            prev.set(q.id, q);
          }
          for (const q of tf.tfDrawList(S)) { const w = inWall(q.x, q.z); if (w) bad.push(q.id + ' outdoors in the wall of ' + w); }
        }
        return { n, walkedIn: walkedIn.size, walkedOut: walkedOut.size, atSpot: atSpot.size, roles, bad: [...new Set(bad)].slice(0, 6) };`);
      if (day.bad.length) P('someone in a wall: ' + day.bad.join('; '));
      if (day.walkedIn < 10) P(`only ${day.walkedIn} townsfolk seen walking in`);
      if (day.walkedOut < 5) P(`only ${day.walkedOut} townsfolk seen walking out`);
      for (const r of ['keeper', 'bed', 'pupil', 'teach', 'home']) if (!day.roles[r]) P(`nobody at a ${r} spot all day`);
      console.log(`  a day of the townsfolk (${day.n} looks): ${day.walkedIn} seen walking in, ${day.walkedOut} walking out, ${day.atSpot} at their spots (${Object.keys(day.roles).join(', ')}); nobody in a wall`);

      // 6. Drawn and sorted: the store at 10:00 on a weekday, open with him inside: the keeper behind his counter
      const draw = await ev(page, `
        const S = R.state, V = R.rm.view, d0 = Math.floor(S.time / 86400) * 86400 + 7 * 86400;   // the next Monday 10:00 (a week on: the same weekday)
        while (S.time < d0 + 5 * 3600) { R.step(200); nol(); }
        V.snap(true); R.camera.zoom = 1.5;
        const r = R.rm.rmRoom('shop_store'); R.pix.placePlayer(r.door.ix + r.door.n[0] * 1.5, r.door.iz + r.door.n[1] * 1.5);
        await new Promise(res => setTimeout(res, 400));
        const inner = V.inner('shop_store') || [], k = inner.indexOf('rmtf_amos'), cIx = inner.findIndex(id => id === 'shop_store/f' + r.furn.findIndex(q => q.k === 'counter'));
        const shut = R.rm.rmPeople(S).filter(q => q.rm !== 'shop_store').map(q => 'rm' + q.id);
        const order = R.pix.PIX.order || [], drawnShut = shut.filter(id => order.includes(id) || inner.includes(id));
        const pk = R.pix.PIX.drawn.filter(q => q.hit && q.hit.k === 'tf' && q.hit.id === 'tf_amos').length;
        return { inner, k, cIx, player: inner.includes('player'), drawnShut, pk, open: V.open, folk: R.rm.rmPeople(S).filter(q => q.rm === 'shop_store').map(q => q.id + ':' + q.role) };`);
      if (draw.open !== 'shop_store') P('the store is not open with him inside');
      if (draw.k < 0) P('the storekeeper is not drawn inside the open store: ' + JSON.stringify(draw.folk));
      else if (!(draw.cIx > draw.k)) P(`the counter is not drawn after (in front of) the storekeeper behind it (${draw.cIx} vs ${draw.k})`);
      if (!draw.player) P("the player is not drawn with the open store's insides");
      if (!draw.pk) P("the storekeeper's sprite was not drawn");
      if (draw.drawnShut.length) P('people inside shut buildings are drawn: ' + draw.drawnShut.join(', '));
      console.log(`  the open store's insides in order: ${draw.inner.length} things (the keeper ${draw.k}, his counter ${draw.cIx}, the player inside); nobody inside a shut building drawn`);
      await page.screenshot({ path: screenshotPath('rooms-store-portrait') });

      // 7. Screenshots: a home at night, the saloon in the evening, the church on Sunday, the school, a tent
      const shot = async (name, body) => { await ev(page, body); await frames(page, 6); await page.screenshot({ path: screenshotPath(name) }); };
      await shot('rooms-school-portrait', `const S = R.state; R.rm.view.snap(true); const r = R.rm.rmRoom('school'); R.pix.placePlayer(r.door.x - r.door.n[0] * 1.0, r.door.z - r.door.n[1] * 1.0); await new Promise(res => setTimeout(res, 300));`);
      await shot('rooms-saloon-evening-portrait', `const S = R.state, t = Math.floor(S.time / 86400) * 86400 + 15 * 3600; while (S.time < t) { R.step(200); nol(); } const r = R.rm.rmRoom('shop_saloon'); R.pix.placePlayer(r.door.x - r.door.n[0] * 1.0, r.door.z - r.door.n[1] * 1.0); await new Promise(res => setTimeout(res, 300));`);
      const sal = await ev(page, `return R.rm.rmPeople(R.state).filter(q => q.rm === 'shop_saloon').map(q => q.id + ':' + q.role);`);
      if (!sal.some(s => /keeper/.test(s))) P('no barkeep in the saloon in the evening: ' + sal.join(', '));
      await shot('rooms-home-night-portrait', `const S = R.state, t = Math.floor(S.time / 86400) * 86400 + 17.5 * 3600; while (S.time < t) { R.step(200); nol(); } const r = R.rm.rmRoom('house2'); R.pix.placePlayer(r.door.x - r.door.n[0] * 1.0, r.door.z - r.door.n[1] * 1.0); await new Promise(res => setTimeout(res, 300));`);
      const bed = await ev(page, `return R.rm.rmPeople(R.state).filter(q => q.role === 'bed').length;`);
      if (bed < 3) P(`only ${bed} townsfolk in bed at 22:30`);
      // the camp's tents (the starting crew of 5: two tents and the cook tent)
      const tent = await ev(page, `
        const S = R.state, V = R.rm.view, T = V.tents(); if (!T.length) return { none: true };
        const fr = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
        R.pix.placePlayer(T[0].x, T[0].z); await fr(); const a = V.open;
        R.pix.placePlayer(T[0].door.x, T[0].door.z + 1.0); await fr(); const b = V.open;
        R.pix.placePlayer(T[1].x, T[1].z); await fr(); const c = V.open, one = V.fade.filter(q => q[1] > 0.99).length;
        { const t = Math.floor(S.time / 86400) * 86400 + 18.7 * 3600; while (S.time < t) { R.step(100); nol(); } }   // (23:40: the men in their cots)
        R.pix.placePlayer(T[0].x, T[0].z); nol(); await new Promise(res => setTimeout(res, 300));
        const inner = V.inner(T[0].id) || [];
        return { n: T.length, a, b, c, one, cots: inner.filter(id => /^cpcot/.test(id)).length, abed: inner.filter(id => /^cpabed/.test(id)).length, player: inner.includes('player'), id0: T[0].id, id1: T[1].id };`);
      if (tent.none) P('no tents in the camp');
      else {
        if (tent.a !== tent.id0 || tent.b !== tent.id0 || tent.c !== tent.id1 || tent.one !== 1) P('the tents do not open one at a time: ' + JSON.stringify(tent));
        if (tent.cots < 1 || !tent.player) P('an open tent does not hold its cots and the player: ' + JSON.stringify(tent));
        console.log(`  ${tent.n} tents open one at a time (inside, at the door); tent 0 open holds ${tent.cots} cots, ${tent.abed} men in bed and the player`);
      }
      await frames(page, 4);
      await page.screenshot({ path: screenshotPath('rooms-tent-night-portrait') });

      // 8. Frame time with a building open (4x throttled), at the default zoom
      await ev(page, `const S = R.state; R.rm.view.snap(true); R.camera.zoom = 1.5; const t = Math.floor(S.time / 86400) * 86400 + 7 * 86400 + 5 * 3600; while (S.time < t) { R.step(400); nol(); } R.setSpeed(0);`);
      const cdp = await page.context().newCDPSession(page);
      const meas = async (open) => {
        await ev(page, `R.pix.placePlayer(-5, -52); R.rm.view.tap(A ? 'shop_hotel' : null); R.pix.warm(true); await new Promise(res => setTimeout(res, 400));`, open);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.waitForTimeout(300);
        const r = await page.evaluate(async () => {
          const X = window.__railhead.pix.PIX, out = [];
          for (let w = 0; w < 3; w++) { const ts = []; const t0 = performance.now(); let f = X.stats.frames; await new Promise(res => { const tick = () => { if (X.stats.frames !== f) { f = X.stats.frames; ts.push(X.stats.ms); } if (performance.now() - t0 < 1200) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); }); out.push(ts.reduce((a, b) => a + b, 0) / ts.length); }
          return { avg: Math.min(...out), scale: X.scale };
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        return r;
      };
      const shut = await meas(false), perf = await meas(true);
      // (the same view both times: he stands on the street beside it, opened by a tap; an open building may cost a little)
      if (!(perf.avg <= shut.avg + 2.5)) P(`a frame with the hotel open takes ${perf.avg.toFixed(2)} ms against ${shut.avg.toFixed(2)} ms shut (4x throttled; allowed 2.5 ms more)`);
      console.log(`  the hotel at the default zoom (scale ${perf.scale}), the same view, 4x throttled, best of 3 windows: shut ${shut.avg.toFixed(2)} ms a frame, open (with the hotelkeeper, the laundress and its furniture) ${perf.avg.toFixed(2)} ms`);
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }

  // ---------------- Part 2: ?rooms=0 parks it ----------------
  {
    const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto&rooms=0' });
    const P = m => problems.push('?rooms=0: ' + m);
    try {
      await start(page);
      const r = await ev(page, `
        const S = R.state, T = S.track, G = g('walkGrid')(T), rm = R.rm, r = rm.rmRoom('shop_store');
        R.pix.placePlayer(r.door.x - r.door.n[0] * 0.8, r.door.z - r.door.n[1] * 0.8); await new Promise(res => setTimeout(res, 200));
        const open = rm.view.open; for (let i = 0; i < 300; i++) R.step(4);
        return { on: rm.RM.ON, open, floor: G.cost[g('walkCell')(r.door.ix, r.door.iz)] > 0, people: rm.rmPeople(S).length, ti: S.tf.ag.some(a => a.ti !== undefined || a.xo !== undefined) };`);
      if (r.on || r.open || r.floor || r.people || r.ti) P('rooms are not parked: ' + JSON.stringify(r));
      else console.log('  ?rooms=0: no room opens, the floors are shut, nobody is drawn indoors, the townsfolk vanish at the door as before');
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }

  // ---------------- Part 3: the far town, both orientations ----------------
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    const P = m => problems.push(`far town (${orient}): ` + m);
    try {
      await start(page);
      const D = await ev(page, `const d = g('D33'), F = R.ft.FT; return { LX: d.LX, LEN: g('LINE').LEN, X0: F.FT.X0, X1: F.FT.X1, name: F.FT.NAME };`);
      // out on the line, at the end of track
      const atEnd = async (zoom, lz) => { await ev(page, `nol(); const S = R.state; if (!S.lp) { R.pix.placePlayer(g('D33').GATE + 0.6, 0.5); R.step(1); } nol(); S.lp.x = A[0]; S.lp.z = A[1]; R.step(1); R.camera.zoom = A[2]; g('PIX').warm = true; g('cam').ox = 0; g('cam').oz = 0;`, [D.LEN - 26, lz, zoom]); await frames(page, 8); };
      await atEnd(1.5, -2);
      const seen = await ev(page, `const o = g('PIX').order || []; return { depot: o.includes('ftdepot'), blds: o.filter(id => /^ftb\\d$/.test(id)).length, folk: o.filter(id => /^ftp/.test(id)).length, sign: o.includes('ftsign') };`);
      if (!seen.depot || seen.folk < 2) P('the far town is not drawn at the end of track: ' + JSON.stringify(seen));
      await page.screenshot({ path: screenshotPath(`fartown-end-${orient}`) });
      // the furthest zoom: no pixel of the world's background, from several places round the town
      await ev(page, `R.lnView.bg('#ff00ff');`);
      let worst = 0;
      for (const [x, z] of [[D.LEN, 0], [D.LEN, -60], [D.LEN, 60], [D.LEN - 120, -40], [D.LEN + 120, -60], [D.LEN + 140, 0], [D.LEN - 60, -70]]) {
        await atEnd(0.4, 4);
        await page.evaluate(([x, z]) => (0, eval)('pixLookAt')(x, z), [x + D.LX, z]); await frames(page, 6);
        await page.evaluate(([x, z]) => (0, eval)('pixLookAt')(x, z), [x + D.LX, z]); await frames(page, 8);
        const bg = await page.evaluate(() => { const X = window.__railhead.pix.PIX, d = X.bctx.getImageData(0, 0, X.nw, X.nh).data; let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) k++; return { k, scale: X.scale }; });
        worst = Math.max(worst, bg.k);
        if (bg.scale !== 1) P(`the furthest zoom is scale ${bg.scale}`);
        if (bg.k > 12) P(`looking at (${x}, ${z}) of the line at the furthest zoom: ${bg.k} pixels of the world's background`);
      }
      await ev(page, `R.lnView.bg(null);`);
      await atEnd(0.4, 4); await frames(page, 6);
      await page.screenshot({ path: screenshotPath(`fartown-far-${orient}`) });
      console.log(`  ${orient}: ${D.name} drawn at the end of track (the depot, ${seen.blds} buildings in view, ${seen.folk} townsfolk, the sign); no background at the furthest zoom from 7 places (worst ${worst} px)`);
      // the last spike: the dev jump (refused while the train is out), 30 men, played to the last spike, the cheer
      if (orient === 'portrait') {
        const ch = await ev(page, `
          const S = R.state; nol(); R.send({ t: 'lpBack', how: 'now' }); R.step(2); nol();
          // 30 men, then to 05:30 tomorrow: the work train is home
          R.send({ t: 'dvSet', k: 'crew', v: 30 }); R.step(1);
          const t0 = (Math.floor(S.time / 86400) + 1) * 86400 + 1800; while (S.time < t0) { R.step(100); nol(); }
          R.send({ t: 'ftJump' }); R.step(1);
          const f5 = S.ln.f[5];
          let done = -1, cheer = false, standAt = null;
          for (let i = 0; i < 9000 && !(done >= 0 && cheer); i++) { R.step(4); nol(); if (S.ln.done >= 0 && done < 0) done = S.time; if (g('ftCheering')(S)) { cheer = true; standAt = S.ln.tr.x; } }
          await new Promise(res => setTimeout(res, 200));
          const card = document.getElementById('ftCard');
          return { f5, done, cheer, standAt, card: !!card && !card.hidden, text: card ? card.textContent : '', spiked: S.ln.f[5], days: S.ln.days };`);
        if (!(ch.f5 >= 2470)) P('the dev jump did not bring the line near the end: ' + ch.f5);
        if (ch.done < 0) P(`the last spike never went in (spiked ${ch.spiked})`);
        if (!ch.cheer) P('the townsfolk did not cheer on the platform');
        if (!ch.card) P('no card for the last spike');
        else console.log(`  the dev jump to ${Math.round(ch.f5)} m, 30 men to the last spike (day ${ch.days} of the line); the card: "${ch.text.slice(0, 60)}..."; the town on the platform`);
        // the work train standing at the far town with the town cheering
        await ev(page, `const S = R.state; nol(); if (!S.lp) { R.pix.placePlayer(g('D33').GATE + 0.6, 0.5); R.step(1); } S.lp.x = g('LINE').LEN - 20; S.lp.z = 4; R.step(1); R.camera.zoom = 1.5; g('cam').ox = 0; g('cam').oz = 0; const sm = document.getElementById('pdSum'); if (sm) sm.hidden = true;`);
        await frames(page, 10);
        const crowd = await ev(page, `const S = R.state; return { n: (g('PIX').order || []).filter(id => /^ftp/.test(id)).length, lp: S.lp, away: S.player.away, cheer: g('ftCheering')(S), sod: g('rrSod')(S.time) / 3600 };`);
        if (crowd.n < 8) P(`only ${crowd.n} townsfolk in view on the platform at the cheer: ` + JSON.stringify(crowd));
        await page.screenshot({ path: screenshotPath('fartown-cheer-card-portrait') });
        const ok = await page.evaluate(() => { const b = document.getElementById('ftCardOk'); if (b) b.click(); const c = document.getElementById('ftCard'); return !!c && c.hidden; });
        if (!ok) P('the card does not close');
        await ev(page, `const S = R.state; S.lp.x = g('LINE').LEN - 34; S.lp.z = -1; R.step(1); g('cam').ox = 0; g('cam').oz = 0;`);
        await frames(page, 10);
        await page.screenshot({ path: screenshotPath('fartown-cheer-portrait') });
      }
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
