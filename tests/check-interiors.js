// Check: the pixel renderer's D27 drawing (builder R; plans/d27-tech.md 3.2, 4.6, 5.3, 8.3, 10.1), on stand-in data in
// the agreed shapes (tests/pix-standin.js) until P, F and W fill their lists.
// - The cut-away coach: only the player's coach is cut away (the others stay whole, their seated riders hidden); its
//   floor first, then benches, sitters, the agent and the parts in painter's order (a sitter after his own bench and
//   the bench behind, before the bench in front; for sitters facing ne or nw the own bench after him), the sill last;
//   the punched mark drawn on punched sitters; a tap on a seated traveller picks him with his seat and coach; the camera
//   frames the coach.
// - The cut-away boxcar: its floor, the door (open), the goods on its cells in painter's order, the agent inside with a
//   crate, the sill last; a boxcar with its door shut and nobody at it stays whole; the cart (goods on its cells) and
//   the hand truck (tilted, a barrel on it) at F's poses.
// - Goods in every handling step: the agent's frame and the good for each of F's verbs.
// - Ramps and footbridges against people on the cargo platform; the townsfolk (walking, standing, talking, on a
//   bench), the east row's backs see-through over people at its doors, lamps lit at night.
// - The ground in chunks: made, cached, none missing in view.
// Screenshots test-output/d27-r-*.png (portrait and landscape; default zoom and overview).

const { openGame, screenshotPath } = require('./browser');
const SI = require('./pix-standin');

module.exports = async function checkInteriors() {
  const problems = [];
  for (const orient of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orient, { query: '?paused&world=proto' });
    const P = m => problems.push(`${orient}: ${m}`);
    const shot = async (name, zoom) => {
      await page.evaluate(z => { window.__railhead.camera.zoom = z; }, zoom);
      await page.waitForTimeout(900);
      await page.screenshot({ path: screenshotPath(`d27-r-${name}-${orient}`) });
    };
    try {
      await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
      await page.evaluate(() => window.__railhead.pix.warm(true));
      // ---- 1. The coach cut away with sitters ----
      const c = await SI.coach(page);
      await page.waitForTimeout(900);   // the camera frames the coach
      const co = await page.evaluate((c) => {
        const R = window.__railhead, X = R.pix, D = X.drawn, out = { bad: [] }, B = m => out.bad.push(m), id = `tr${c.tr}/`;
        const cutId = X.cut.find(q => q.startsWith(id));
        if (!cutId || X.cut.length !== 1) B(`cut away: ${X.cut.join(', ')} (expected only the player's coach)`);
        const idx = (pred) => D.findIndex(pred), lay = PIX_ATLAS.extra[`veh/coach_in/${c.hd}/floor`].layout;
        const floor = idx(d => d.key === `veh/coach_in/${c.hd}/floor`), sill = idx(d => d.key === `veh/coach_in/${c.hd}/sill`);
        if (floor < 0 || sill < 0) B(`the cut-away shell is not drawn (floor ${floor}, sill ${sill})`);
        if (D.some(d => d.key && d.key.startsWith('veh/coach_in/') && d.id !== cutId)) B('a second coach is drawn cut away');
        const inside = D.filter(d => d.id && d.id.startsWith(cutId + '/b'));
        if (inside.length < 10) B(`only ${inside.length} benches drawn`);
        let checked = 0;
        for (const s of c.sitters) {
          const si = idx(d => d.id === 'pb' + s.id && d.key && d.key.startsWith('ppl/'));
          if (si < 0) { B(`sitter ${s.id} is not drawn`); continue; }
          if (!(si > floor && si < sill)) B(`sitter ${s.id} is not between the floor and the sill`);
          const q = lay.seats[s.seat], side = Math.sign(q.z), bs = lay.benches.map((b, i) => ({ ...b, i })).filter(b => Math.sign(b.z) === side && b.row >= 0);
          const own = bs.reduce((a, b) => Math.abs(b.x - q.x) < Math.abs(a.x - q.x) ? b : a), front = bs.filter(b => b.x > own.x).sort((a, b) => a.x - b.x)[0], back = bs.filter(b => b.x < own.x).sort((a, b) => b.x - a.x)[0];
          const bi = b => idx(d => d.id === `${cutId}/b${b.i}`);
          const ownFirst = s.f === 'se' || s.f === 'sw';
          if (ownFirst ? !(bi(own) < si) : !(bi(own) > si)) B(`sitter ${s.id} (facing ${s.f}) and his bench: bench ${bi(own)}, sitter ${si}`);
          if (front && ownFirst && !(bi(front) > si)) B(`the bench in front of sitter ${s.id} is drawn before him`);
          if (back && !(bi(back) < si)) B(`the bench behind sitter ${s.id} is drawn after him`);
          checked++;
        }
        out.checked = checked;
        out.marks = D.filter(d => d.key && d.key.startsWith('ppl/mark/punched/')).length;
        if (!out.marks) B('no punched mark drawn');
        if (!D.some(d => d.id === 'player' && d.key && d.key.startsWith('ppl/agent/punch/'))) B('the agent is not drawn punching in the aisle');
        const pl = idx(d => d.id === 'player' && d.key && d.key.startsWith('ppl/'));
        if (!(pl > floor && pl < sill)) B('the agent is not drawn inside the cut-away coach');
        // The other coaches whole, their riders hidden.
        if (c.others.length && !D.some(d => d.key && d.key.startsWith('veh/coach/'))) B('no whole coach drawn beside the cut-away one');
        const hidden = R.pix.lists.pb.filter(q => c.others.includes(String(q.stock))).map(q => 'pb' + q.id);
        if (D.some(d => hidden.includes(d.id))) B('a rider inside a whole coach is drawn');
        // The camera frames the coach: its middle in the middle third of the view.
        const v = X.view, m = X.pixProject(c.cx, 1.6, c.cz), mx = m.x - v.vx, my = m.y - v.vy;
        if (Math.abs(mx - v.nw / 2) > v.nw / 3 || Math.abs(my - v.nh / 2) > v.nh / 3) B(`the camera does not frame the coach (its middle at ${mx.toFixed(0)}, ${my.toFixed(0)} in a ${v.nw} x ${v.nh} view)`);
        // A tap on a seated traveller's own visible pixel picks him, with his seat and coach.
        let picked = 0, tried = 0;
        const top = (nx, ny) => { for (let i = D.length - 1; i >= 0; i--) { const d = D[i], u = nx - d.l, w = ny - d.t; if (u >= 0 && w >= 0 && u < d.w && w < d.h && (d.si < 0 || X.PIXA && alpha(d.si, d.fx + u, d.fy + w))) return d; } return null; };
        const cv = {}, alpha = (si, x, y) => { let k = cv[si]; if (!k) { const im = X.PIXA.imgs[si], e = document.createElement('canvas'); e.width = im.width; e.height = im.height; const g = e.getContext('2d'); g.drawImage(im, 0, 0); k = cv[si] = { w: im.width, a: g.getImageData(0, 0, im.width, im.height).data }; } return k.a[4 * (y * k.w + x) + 3] > 0; };
        for (const d of D.filter(d => d.hit && d.hit.k === 'pp' && d.hit.seat !== undefined).slice(0, 8)) {
          let spot = null;
          for (let w = 0; w < d.h && !spot; w++) for (let u = 0; u < d.w && !spot; u++) if (top(d.l + u, d.t + w) === d) spot = [d.l + u, d.t + w];
          if (!spot) continue;
          tried++;
          const x = (spot[0] + 0.5 - v.vx) * v.scale / v.dpr, y = (spot[1] + 0.5 - v.vy) * v.scale / v.dpr, h = X.pixPick(x, y);
          if (h && h.k === 'pp' && h.id === d.hit.id && h.seat === d.hit.seat && String(h.stock) === c.stock) picked++;
          else B(`a tap on seated traveller ${d.hit.id} picked ${JSON.stringify(h)}`);
        }
        if (!tried) B('no seated traveller had a visible pixel to tap');
        out.picked = `${picked} of ${tried}`;
        return out;
      }, c);
      co.bad.forEach(P);
      console.log(`  ${orient}: coach cut away: ${co.checked} sitters in painter's order, ${co.marks} punched marks, taps on sitters picked ${co.picked}`);
      await shot('coach', 1.5);
      await shot('coach-close', 3);
      await shot('coach-overview', 0.4);
      // ---- 2. The boxcar being unloaded ----
      const f = await SI.freight(page);
      await page.waitForTimeout(900);
      const bx = await page.evaluate(async (f) => {
        const R = window.__railhead, X = R.pix, D = X.drawn, out = { bad: [] }, B = m => out.bad.push(m), W = window;
        const cutId = X.cut.find(q => D.some(d => d.id === q && d.key && d.key.startsWith('veh/boxcar_in/')));
        if (!cutId) B(`the boxcar is not cut away (${X.cut.join(', ')})`);
        const idx = pred => D.findIndex(pred), floor = idx(d => d.key === `veh/boxcar_in/${f.hd}/floor`), door = idx(d => d.key === `veh/boxcar_door/${f.hd}/3`), sill = idx(d => d.key === `veh/boxcar_in/${f.hd}/sill`);
        if (!(floor >= 0 && door > floor && sill > door)) B(`the boxcar's shell order: floor ${floor}, door ${door}, sill ${sill}`);
        const g = D.map((d, i) => ({ d, i })).filter(q => q.d.id && q.d.id.startsWith(cutId + '/g') && q.d.key.startsWith('goods/'));
        if (g.length < 8) B(`${g.length} goods drawn in the boxcar (10 on its floor)`);
        if (g.some(q => q.i < door || q.i > sill)) B('a good in the boxcar is drawn outside its shell');
        const gl = W.frDrawList().filter(q => q.place === 'car');
        for (const a of g) for (const b of g) {
          const A = gl.find(q => 'g' + q.id === a.d.id.split('/').pop()), Bq = gl.find(q => 'g' + q.id === b.d.id.split('/').pop());
          if (A && Bq && Math.abs(A.z - Bq.z) < 0.1 && A.x + 0.79 < Bq.x && !(a.i < b.i) && Math.abs(A.y - Bq.y) < 0.1) { B(`goods in a row out of order (${A.id} at x ${A.x.toFixed(1)} drawn after ${Bq.id} at ${Bq.x.toFixed(1)})`); break; }
        }
        const pl = D.map((d, i) => ({ d, i })).filter(q => q.d.id === 'player');
        if (!pl.some(q => q.d.key.startsWith('ppl/agent/carry/'))) B('the agent is not drawn carrying in the boxcar');
        if (!pl.some(q => q.d.key.startsWith('goods/crate/held/'))) B('the crate in his hands is not drawn');
        const cart = D.filter(d => d.id === 'tool1' || (d.hit && d.hit.k === 'tool' && d.key.startsWith('cart27/')));
        if (!D.some(d => d.key.startsWith('cart27/'))) B('the platform cart is not drawn');
        if (D.filter(d => d.key.startsWith('goods/') && D.some(e => e.key.startsWith('cart27/') && e.id === d.id)).length < 8) B('the goods on the cart are not all drawn');
        if (!D.some(d => d.key.startsWith('truck/') && d.key.endsWith('/tilt'))) B('the hand truck is not drawn tilted');
        if (!D.some(d => d.key.startsWith('goods/barrel/truck/'))) B('the barrel on the hand truck is not drawn');
        // Door shut and nobody at it: whole.
        W.frDoorOpen = () => 0; R.pix.placePlayer(0, 12.4);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (X.cut.length) B(`with its door shut and nobody at it a boxcar is cut away (${X.cut.join(', ')})`);
        out.goods = g.length; out.cart = cart.length;
        return out;
      }, f);
      bx.bad.forEach(P);
      console.log(`  ${orient}: boxcar cut away with ${bx.goods} goods in painter's order, the cart and the hand truck`);
      await SI.freight(page);
      await shot('boxcar', 1.5);
      await shot('boxcar-close', 3);
      await shot('boxcar-overview', 0.4);
      // ---- 3. Goods in every handling step ----
      await SI.cargo(page);
      const hs = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, W = window, out = { bad: [], seen: [] }, B = m => out.bad.push(m), frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const base = W.frDrawList().filter(q => q.place !== 'hand');
        const steps = [['carry', 'lift', 'crate', 'lift'], ['carry', 'walk', 'crate', 'carry'], ['carry', 'put', 'keg', 'lift'], ['shoulder', 'walk', 'sack', 'shoulder/idle'], ['roll', 'walk', 'barrel', 'roll'],
          ['drag', 'walk', 'lumber', 'drag'], ['heave', 'walk', 'piano', 'heave'], ['stackHigh', 'up', 'crate', 'stackHigh'], ['handOver', 'give', 'paper', 'handOver'], ['door', 'pull', null, 'door'], ['truck', 'walk', null, 'truck'], ['pull', 'walk', null, 'pull']];
        for (const [verb, phase, kind, anim] of steps) {
          W.frPose = () => ({ verb, phase, prog: 0.6, f: 'se' });
          W.frDrawList = () => kind ? base.concat([{ id: 9999, kind, tag: 'store', place: 'hand' }]) : base;
          await frame();
          const D = X.drawn.filter(d => d.id === 'player'), body = D.find(d => d.key.startsWith('ppl/agent/'));
          if (!body || !body.key.startsWith(`ppl/agent/${anim}/`)) B(`${verb} (${phase}): the agent is drawn as ${body && body.key} (expected ppl/agent/${anim}/...)`);
          if (kind && !D.some(d => d.key.startsWith(`goods/${kind}`))) B(`${verb}: the ${kind} is not drawn with him (${D.map(d => d.key).join(', ')})`);
          out.seen.push(body && body.key);
        }
        if (!X.drawn.some(d => d.key.startsWith('goods/') && d.id && d.id.startsWith('item'))) B('no goods drawn in the storage cells');
        return out;
      });
      hs.bad.forEach(P);
      console.log(`  ${orient}: handling steps drawn: ${hs.seen.length} (${hs.seen.map(k => k && k.split('/').slice(2, -2).join('/')).join(', ')})`);
      await SI.cargo(page);
      await shot('cargo', 1.5);
      await shot('cargo-overview', 0.4);
      // ---- 4. Ramps and footbridges against people on the cargo platform ----
      const rp = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, W = window, P = R.proto.PROTO, F = P.FB, out = { bad: [] }, B = m => out.bad.push(m), frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const E = P.RAMPS.find(q => q.id === 'ramp_e'), rz = (E.z0 + E.z1) / 2, rx = (E.x0 + E.x1) / 2;
        const fx = F.X[1] + 5, list = [
          { id: 1, who: 'man_top', x: rx, y: 0.8, z: rz, f: 'nw', act: 'walk' },
          { id: 2, who: 'woman_bonnet', x: fx, y: P.DOCK_Y, z: F.Z2[1] + 0.6, f: 'se', act: 'wait' },
          { id: 3, who: 'man_bag', x: fx, y: P.DOCK_Y, z: F.Z2[0] - 0.6, f: 'sw', act: 'wait' }];
        W.pbDrawList = () => list; R.camera.zoom = 1.5; X.pixLookAt(26, 8);
        await frame(); await frame();
        const o = X.order, at = id => o.indexOf(id), fl = o.find(q => q && q.endsWith('/stair_p2_e'));
        if (!(at('pb1') > at('ramp_e') && at('pb1') > at('dock'))) B(`a walker on the east ramp is not drawn after it and the cargo platform (${at('ramp_e')}, ${at('dock')}, ${at('pb1')})`);
        if (!fl) B('the east footbridge\'s cargo-side flight is not drawn');
        else { if (!(at('pb2') > at(fl))) B('a person on the cargo platform in front of a flight is drawn before it'); if (!(at('pb3') < at(fl))) B('a person on the cargo platform behind a flight is drawn after it'); }
        return out;
      });
      rp.bad.forEach(P);
      // ---- 5. The street with townsfolk, by day and at night ----
      const tw = await SI.town(page);
      await page.waitForTimeout(500);
      const tf = await page.evaluate(async () => {
        const R = window.__railhead, X = R.pix, D = X.drawn, out = { bad: [] }, B = m => out.bad.push(m), W = window;
        const drawn = D.filter(d => d.id && d.id.startsWith('tf') && d.key.startsWith('ppl/'));
        if (drawn.length < 4) B(`only ${drawn.length} townsfolk drawn`);
        for (const a of ['walk', 'talk', 'idle']) if (!drawn.some(d => d.key.includes(`/${a}/`))) out.missing = (out.missing || []).concat(a);
        // Each one standing at an east-row door (behind its building): the building turns see-through over him.
        const sh = R.d27.SHOPS27.find(q => q.side === 'E');
        W.tfDrawList = () => [{ id: 'east', who: 'barber', x: sh.door.x, y: sh.doorY, z: sh.door.z, f: 'nw', act: 'idle' }];
        X.pixLookAt(sh.door.x, sh.door.z); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (!X.PIX.seeThrough.some(id => id.startsWith(sh.bld + '/'))) B(`the ${sh.bld} does not turn see-through over a townsperson at its door (${X.PIX.seeThrough.join(', ')})`);
        out.n = drawn.length;
        return out;
      });
      tf.bad.forEach(P);
      if (tf.missing) console.log(`  ${orient}: townsfolk poses not in view: ${tf.missing.join(', ')}`);
      await SI.town(page);
      await shot('street', 1.5);
      await shot('street-overview', 0.4);
      await SI.town(page, { night: true });
      await page.waitForTimeout(400);
      const lit = await page.evaluate(() => window.__railhead.pix.drawn.filter(d => /_lit$/.test(d.key || '')).length);
      if (!lit) P('nothing drawn lit at night in the street');
      await shot('street-night', 1.5);
      // ---- 6. The ground's chunks ----
      const gr = await page.evaluate(() => window.__railhead.pix.chunks);
      if (!(gr.n > 0 && gr.missing === 0)) P(`the ground's chunks: ${JSON.stringify(gr)}`);
      console.log(`  ${orient}: ${tf.n} townsfolk drawn, ${lit} lit sprites at night; ground chunks: ${gr.built} made (last ${gr.ms.toFixed(1)} ms, worst ${gr.worst.toFixed(1)} ms), ${gr.n} cached`);
      if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
