// Check: the prototype's goods (D25, builder F; plans/proto-tech.md section 4, section "prototype goods (D25)").
// A scripted day in the prototype world, played through the touch-level commands (carryTool, carryPick, carryPut,
// walkTo, rrWaveOff, pgDeliver, pdStart, pdEndDay, pdNextDay); only the switches are set by the check itself (a
// switchman flips any switch a railroad train waits at) and the day holds only its three freight runs (the passenger
// and through runs are T's and P's, checked by their own checks):
// - a new game has the 6 goods for the railroad waiting in the storage shed's OUTSIDE bay, the bays tagged STORE,
//   SMITHY, SALOON, OUTSIDE;
// - f1 brings 6 goods for the shops (store 3, smithy 2, saloon 1): the hand truck takes them off, 3 onto platform 2
//   and then into the bays, 3 straight into the bays, each into its shop's bay; f1 is not ready until it is empty,
//   then it is sent off;
// - f2 loads 4 goods for the railroad from storage (a 5th is refused, a shop's good is refused), is not ready before
//   (D27 foundation: it brings 4 for the shops too, unloaded first);
// - f3 unloads 4 and loads 2; the hand truck goes back to its spot;
// - the evening: the handcart (D27: the platform cart, 16 slots) takes the shops' goods in two trips, crosses the tracks
//   only at the cart crossing (never between the platforms anywhere else), goes up the main street to each shop's door;
//   pgDeliver hands in only that shop's goods (a shop with nothing aboard refuses); every good reaches its own shop;
// - the summary counts what the tables say (D27: 14 unloaded, 6 loaded, 14 delivered); the next morning has 6 goods
//   waiting again;
// - items conserved all along; the same state hash when the day is played twice; no console errors;
// - screenshots: goods on platform 2 beside f1, the storage shed open with goods in its bays, the loaded handcart at the
//   general store's door (portrait and landscape).

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkProtoGoods() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, G = R.pg, X = R.proto;
      // One scripted day from a new prototype game. Returns { bad, hash, snaps, stats, ... }.
      function playDay() {
        const S = R.newState(1866, 'proto'), bad = [], B = m => { if (bad.length < 40) bad.push(m); }, snaps = {}, evs = [];
        const P = S.player, at = () => `${R.clockText ? R.clockText(S) : S.time} (${P.x.toFixed(1)}, ${P.z.toFixed(1)})`;
        // Day 0 at dawn.
        const out0 = G.pgOutWaiting(S);
        if (out0.length !== 6 || out0.some(id => S.items.where[id].kind !== 'BAY' || S.items.where[id].bay !== 3)) B(`dawn: ${out0.length} goods for the railroad, expected 6 in the storage shed's bay 4`);
        if (JSON.stringify(S.bayTags.storage) !== '["STORE","SMITHY","SALOON","OUTSIDE"]') B(`storage bay tags ${JSON.stringify(S.bayTags.storage)}`);
        let cartTrack = [];   // where the handcart went between the platforms
        const switchman = () => {
          const occ = R.occupiedSwitches ? R.occupiedSwitches(S) : {};
          for (const tr of S.trains) if (tr.owner === 'rr' && tr.swWait !== undefined && tr.swWait !== null && tr.v === 0 && occ[tr.swWait] === undefined) {
            const W = S.track.switches[tr.swWait]; W.state = W.state === 'N' ? 'R' : 'N';
          }
        };
        const tick = cmds => {
          switchman();
          const e = R.simTick(S, cmds || []);
          for (const x of e) { evs.push(x); if (x.t === 'carryRefused' || x.t === 'rrRefused' || x.t === 'itemRefused') x.__seen = false; }
          if (P.tool === 1 && P.z > -X.PROTO.D1 + 1.2 && P.z < X.PROTO.P2.z0 - 0.3) cartTrack.push([P.x, P.z]);   // between tracks 1 and 2, or 2 and the cargo platform
          return e;
        };
        tick([{ t: 'pdStart' }]);
        // Only the freight runs today (T's and P's runs are checked elsewhere).
        S.rr.runs = S.rr.runs.filter(q => q.kind === 'freight' && !q.through);
        const runOf = svc => S.rr.runs.find(q => q.svc === svc && q.day === 0);
        const until = (pred, max, what) => { for (let i = 0; i < (max || 20000); i++) { if (pred()) return true; tick(); } B(`timed out waiting for ${what} at ${at()}`); return false; };
        const idle = () => P.mode === 'idle' && !P.act && !P.use;
        // Send one command and wait until the player is idle again; refusals are problems unless expected.
        const act = (cmd, expectRefusal) => {
          const e = tick([cmd]);
          let all = e.slice();
          for (let i = 0; i < 4000 && !idle(); i++) all = all.concat(tick());
          const ref = all.filter(x => x.t === 'carryRefused' || x.t === 'rrRefused' || x.t === 'pgRefused' || x.t === 'blocked');
          if (!expectRefusal && ref.length) B(`${JSON.stringify(cmd)} at ${at()}: ${ref.map(x => x.t + ' ' + (x.why || '')).join('; ')}`);
          if (expectRefusal && !ref.length) B(`${JSON.stringify(cmd)} was not refused`);
          return all;
        };
        const trOf = svc => S.trains[runOf(svc).slot];
        const aboard = svc => G.pgAboard(S, trOf(svc));
        const tagOf = id => R.cargo.itemTag(S.items.waybill[id]);
        const bayOf = tag => S.bayTags.storage.indexOf(tag);
        const putTopInBay = () => { const h = G.carryHeld(S), id = h[h.length - 1]; act({ t: 'carryPut', b: 'storage', bay: bayOf(tagOf(id)) }); if (S.items.where[id].kind !== 'BAY' || S.items.where[id].bay !== bayOf(tagOf(id))) B(`item ${id} (${tagOf(id)}) is not in its bay`); };
        const waveOff = svc => {
          const run = runOf(svc), tr = trOf(svc), sp = R.rr.rrWaveSpot(S, tr.id);
          act({ t: 'walkTo', x: Math.round(sp.x * 100), z: Math.round(sp.z * 100) });
          act({ t: 'rrWaveOff', tr: tr.id });
          if (run.ph !== 'out' && run.ph !== 'gone') B(`${svc} was not sent off (${run.ph})`);
        };
        // ---- f1: unload 6 ----
        until(() => runOf('f1') && runOf('f1').ph === 'stand', 20000, 'f1 to stand at track 3');
        const f1 = aboard('f1');
        if (f1.town !== 6 || f1.out !== 0) B(`f1 brought ${f1.town} goods for the town and ${f1.out} for the railroad (expected 6 and 0)`);
        const byShop = {};
        for (const id of f1.ids) { const s = G.pgShopOf(S.items.waybill[id]); byShop[s] = (byShop[s] || 0) + 1; }
        if (JSON.stringify(byShop) !== '{"store":3,"smithy":2,"saloon":1}') B(`f1's goods by shop: ${JSON.stringify(byShop)}`);
        if (G.pgReady(S, runOf('f1'))) B('f1 is ready with goods for the town aboard');
        act({ t: 'carryTool', tool: 0 });
        if (P.tool !== 0) B('the hand truck was not taken');
        // Trip 1: 3 onto platform 2 (east of the shed, clear of the train in the view), then into the bays.
        for (const id of f1.ids.slice(0, 3)) act({ t: 'carryPick', id });
        if (G.carryHeld(S).length !== 3) B(`the hand truck holds ${G.carryHeld(S).length} after 3 picks`);
        // (D27: on the cargo platform's loading edge, beside the train; the cargo platform is P2's alias)
        const onDeck = [], LE = X.PROTO.LOAD_EDGE;
        for (let k = 0; k < 3; k++) { const h = G.carryHeld(S), id = h[h.length - 1]; onDeck.push(id); act({ t: 'carryPut', x: Math.round((10 + k * 0.9) * 100), z: Math.round((LE.z0 + 0.5 + (k % 2) * 0.7) * 100) }); }
        for (const id of onDeck) { const w = S.items.where[id]; if (w.kind !== 'GROUND' || !(w.z / 100 > X.PROTO.P2.z0 && w.z / 100 < X.PROTO.P2.z1)) B(`item ${id} is not on platform 2 (${JSON.stringify(w)})`); }
        act({ t: 'walkTo', x: 1050, z: Math.round((X.PROTO.CART_LANE.z0 + 1.2) * 100) });   // step back, so the screenshot shows them
        snaps.platform = JSON.stringify({ state: S });
        for (const id of onDeck) act({ t: 'carryPick', id });
        for (let k = 0; k < 3; k++) putTopInBay();
        // Trip 2: the other 3 straight into the bays.
        for (const id of f1.ids.slice(3)) act({ t: 'carryPick', id });
        for (let k = 0; k < 3; k++) putTopInBay();
        if (aboard('f1').town) B(`f1 still holds ${aboard('f1').town} goods for the town`);
        tick();
        if (!G.pgReady(S, runOf('f1'))) B('f1 is not ready once unloaded');
        if (!G.pgShedOpen(S)) B('the storage shed is not open while f1 stands at track 3');
        waveOff('f1');
        // ---- f2: load 4 (D27 foundation: it brings goods for the shops too, PG.UNLOAD.f2: unloaded first) ----
        until(() => runOf('f2') && runOf('f2').ph === 'stand', 20000, 'f2 to stand at track 3');
        if (G.pgReady(S, runOf('f2'))) B('f2 is ready before it is loaded');
        while (aboard('f2').town) { const ids = aboard('f2').ids.filter(id => tagOf(id) !== 'OUTSIDE').slice(0, 3); for (const id of ids) act({ t: 'carryPick', id }); for (let j = 0; j < ids.length; j++) putTopInBay(); }
        const outs = () => R.cargo.itemsAt(S, { kind: 'BAY', buildingId: 'storage', bay: 3 });
        const loadN = (svc, n) => {
          let left = n;
          while (left > 0) {
            const take = outs().slice(0, Math.min(3, left));
            for (const id of take) act({ t: 'carryPick', id });
            const cars = trOf(svc).consist.filter(c => c.k === 'boxcar');
            for (let k = 0; k < take.length; k++) act({ t: 'carryPut', stock: cars[(n - left + k) % cars.length].id });
            left -= take.length;
          }
        };
        loadN('f2', 4);
        if (aboard('f2').out !== 4) B(`f2 holds ${aboard('f2').out} goods for the railroad, expected 4`);
        // A fifth is refused; a shop's good is refused.
        { const o = outs()[0], sg = R.cargo.itemsAt(S, { kind: 'BAY', buildingId: 'storage', bay: 0 })[0], st = trOf('f2').consist[1].id;
          if (!/takes only 4/.test(G.pgPutCarWhy(S, o, st) || '')) B(`a 5th good for f2: ${G.pgPutCarWhy(S, o, st)}`);
          if (!/stay here/.test(G.pgPutCarWhy(S, sg, st) || '')) B(`a shop's good into f2: ${G.pgPutCarWhy(S, sg, st)}`);
          act({ t: 'carryPick', id: o }); act({ t: 'carryPut', stock: st }, true); act({ t: 'carryPut', b: 'storage', bay: 3 }); }
        tick();
        if (!G.pgReady(S, runOf('f2'))) B('f2 is not ready once loaded');
        waveOff('f2');
        // ---- f3: unload 4, load 2 ----
        until(() => runOf('f3') && runOf('f3').ph === 'stand', 20000, 'f3 to stand at track 3');
        const f3 = aboard('f3');
        if (f3.town !== 4 || f3.out !== 0) B(`f3 brought ${f3.town} goods for the town (expected 4)`);
        for (let k = 0; k < 4; k += 3) { const ids = aboard('f3').ids.slice(0, 3); for (const id of ids) act({ t: 'carryPick', id }); for (let j = 0; j < ids.length; j++) putTopInBay(); }
        if (G.pgReady(S, runOf('f3'))) B('f3 is ready before it is loaded');
        loadN('f3', 2);
        tick();
        if (!G.pgReady(S, runOf('f3'))) B('f3 is not ready once unloaded and loaded');
        waveOff('f3');
        act({ t: 'carryTool', tool: 0 });
        if (P.tool !== null) B('the hand truck was not left at its spot');
        // ---- The evening: the handcart to the shops ----
        until(() => S.pd.ph === 'evening', 20000, 'the evening');
        // What the day brought for each shop (PG.UNLOAD), and what goes away (the schedule's loads): from the game's tables.
        const want = G.pgToDeliver(S), brought = { store: 0, smithy: 0, saloon: 0 };
        for (const l of Object.values(G.PG.UNLOAD)) for (const [shop] of l) brought[shop]++;
        const nIn = brought.store + brought.smithy + brought.saloon, nOut = X.PROTO_SCHEDULE.reduce((n, v) => n + (v.load || 0), 0);
        if (JSON.stringify(want) !== JSON.stringify(brought)) B(`to deliver: ${JSON.stringify(want)}, brought ${JSON.stringify(brought)}`);
        act({ t: 'carryTool', tool: 1 });
        if (P.tool !== 1) B('the handcart was not taken');
        const cap = R.cargo.CARGO_CARRY_CAP[R.carry.carryCarrier(S)];   // D27: the platform cart holds 16
        const inBay = tag => R.cargo.itemsAt(S, { kind: 'BAY', buildingId: 'storage', bay: bayOf(tag) });
        const delivered = [];
        const deliver = (shop, snapName) => {
          const before = G.pgCartStatus(S).byShop;
          act({ t: 'pgDeliver', shop: 'nowhere' }, true);
          tick([{ t: 'pgDeliver', shop }]);
          for (let i = 0; i < 4000 && !(P.act && P.act.k === 'hand'); i++) tick();
          if (!(P.act && P.act.k === 'hand')) { B(`never reached the ${shop}'s door (${at()})`); return; }
          const d = G.pgDoorSpot(shop);
          if (Math.hypot(d.x - P.x, d.z - P.z) > R.CFG.REACH) B(`handing in ${Math.hypot(d.x - P.x, d.z - P.z).toFixed(2)}u from the ${shop}'s door`);
          if (snapName) snaps[snapName] = JSON.stringify({ state: S });
          let all = [];
          for (let i = 0; i < 100 && P.act; i++) all = all.concat(tick());
          const got = all.filter(x => x.t === 'pgDelivered');
          delivered.push(...got);
          if (got.length !== before[shop]) B(`the ${shop} took ${got.length}, the cart held ${before[shop]} for it`);
          const after = G.pgCartStatus(S).byShop;
          for (const k of ['store', 'smithy', 'saloon']) if (k !== shop && after[k] !== before[k]) B(`handing in at the ${shop} took the ${k}'s goods`);
          if (after[shop]) B(`goods for the ${shop} still in the cart after handing in`);
        };
        // Trip 1: the store's and the smithy's (as many as the cart holds, less one: a second trip for the rest).
        if (G.pgShedOpen(S)) B('the storage shed is open with no train and nobody near it');
        act({ t: 'carryPick', id: inBay('STORE')[0] });
        if (!G.pgShedOpen(S)) B('the storage shed is not open with the player at its bays');
        snaps.shed = JSON.stringify({ state: S });
        const first = Math.min(cap - 1, brought.store + brought.smithy);
        for (const id of inBay('STORE').concat(inBay('SMITHY')).slice(0, first - 1)) act({ t: 'carryPick', id });
        if (G.carryHeld(S).length !== first) B(`the handcart holds ${G.carryHeld(S).length}, expected ${first}`);
        deliver('store', 'cart');
        act({ t: 'pgDeliver', shop: 'saloon' }, true);   // nothing for the saloon aboard: refused
        deliver('smithy');
        // Trip 2: back for the rest.
        for (const id of inBay('STORE').concat(inBay('SMITHY'), inBay('SALOON'))) act({ t: 'carryPick', id });
        deliver('saloon');
        if (G.pgCartStatus(S).byShop.store) deliver('store');
        if (G.pgCartStatus(S).byShop.smithy) deliver('smithy');
        act({ t: 'carryTool', tool: 1 });
        if (P.tool !== null) B('the handcart was not left at its spot');
        // Every good handed in at its own shop; the cart crossed only at the walkway.
        for (const e of delivered) { const wb = S.items.waybill[e.id]; if (wb.consignee.id !== e.shop) B(`item ${e.id} for the ${wb.consignee.id} was handed in at the ${e.shop}`); }
        const left = G.pgToDeliver(S);
        if (left.store + left.smithy + left.saloon) B(`goods still to deliver: ${JSON.stringify(left)}`);
        const wk = X.PROTO.XING_CART.x;   // D27: the cart crossing
        const off = cartTrack.filter(([x]) => Math.abs(x - wk) > 2.2);
        if (!cartTrack.length) B('the handcart never crossed the tracks');
        if (off.length) B(`the handcart crossed the tracks away from the cart crossing, at ${off.slice(0, 3).map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}`);
        // The summary and the next morning.
        act({ t: 'pdEndDay' });
        const sum = S.pd.sum || {};
        if (sum.unloaded !== nIn || sum.loaded !== nOut || sum.delivered !== nIn) B(`summary: unloaded ${sum.unloaded}, loaded ${sum.loaded}, delivered ${sum.delivered} (expected ${nIn}, ${nOut}, ${nIn})`);
        const used = S.items.used.reduce((o, u) => { o[u.reason] = (o[u.reason] || 0) + 1; return o; }, {});
        if (used.business !== nIn || used.soldOutside !== nOut) B(`items used up: ${JSON.stringify(used)}`);
        const cons = R.cargo.itemCheckConservation(S);
        if (cons.length) B('conservation: ' + cons.slice(0, 3).join('; '));
        const unl = evs.filter(x => x.t === 'pgUnloaded').length, ld = evs.filter(x => x.t === 'pgLoaded').length;
        if (unl !== nIn || ld !== nOut) B(`events: ${unl} pgUnloaded, ${ld} pgLoaded (expected ${nIn}, ${nOut})`);
        tick([{ t: 'pdNextDay' }]);
        const out1 = G.pgOutWaiting(S);
        if (S.pd.ph !== 'morning' || out1.length !== 6) B(`next morning: phase ${S.pd.ph}, ${out1.length} goods waiting for the railroad`);
        if (R.cargo.itemCheckConservation(S).length) B('conservation broken at the next morning');
        return { bad, hash: R.stateHash(S), snaps, sum, ticks: S.tick, items: S.items.next, refused: evs.filter(x => x.t === 'pgRefused').map(x => x.why) };
      }
      const a = playDay(), b = playDay();
      return { bad: a.bad, h: [a.hash, b.hash], snaps: a.snaps, sum: a.sum, ticks: a.ticks, items: a.items, refused: a.refused };
    });
    problems.push(...r.bad);
    if (r.h[0] !== r.h[1]) problems.push(`the same day played twice gave different hashes ${r.h.join(' and ')}`);
    console.log(`  a scripted day: ${r.ticks} ticks, ${r.items} items made; summary ${JSON.stringify({ unloaded: r.sum.unloaded, loaded: r.sum.loaded, delivered: r.sum.delivered })}; refusals seen: ${r.refused.join(' | ')}; hash ${r.h[0]}`);
    // Screenshots of the three moments.
    const shot = async (name, snap, orient, fx, fz, zoom) => {
      if (orient === 'landscape') await page.setViewportSize({ width: 844, height: 390 }); else await page.setViewportSize({ width: 390, height: 844 });
      const info = await page.evaluate(async ([snap, fx, fz, zoom]) => {
        const R = window.__railhead;
        R.importSave(snap);
        R.camera.zoom = zoom; R.camera.ox = fx - R.state.player.x; R.camera.oz = fz - R.state.player.z;
        await new Promise(res => setTimeout(res, 600));
        // (the frame after a load also builds the ground layer once: measure a frame after it)
        for (let k = 0; k < 3; k++) await new Promise(res => requestAnimationFrame(res));
        return { ms: +R.pix.stats.ms.toFixed(2), items: R.pix.stats.items, list: R.pg.pgDrawList(R.state).length, open: R.pg.pgShedOpen(R.state) };
      }, [snap, fx, fz, zoom]);
      await page.screenshot({ path: screenshotPath(`protogoods-${name}-${orient}`) });
      return info;
    };
    const st = {};
    st.platform = await shot('platform2', r.snaps.platform, 'portrait', 11, 14, 3.0);
    st.shed = await shot('shed', r.snaps.shed, 'portrait', -1, 9, 2.0);
    st.cart = await shot('cart', r.snaps.cart, 'portrait', -6, -38, 2.0);
    st.cartL = await shot('cart', r.snaps.cart, 'landscape', -6, -38, 2.0);
    st.shedL = await shot('shed', r.snaps.shed, 'landscape', -1, 9, 2.0);
    if (!st.shed.open) problems.push('the storage shed is not shown open in the screenshot');
    for (const [k, v] of Object.entries(st)) if (!(v.ms < 50)) problems.push(`a frame took ${v.ms} ms (${k})`);
    console.log(`  frames: ${JSON.stringify(st)}`);
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
  return problems;
};
