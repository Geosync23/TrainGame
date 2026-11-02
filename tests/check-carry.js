// Check: the player carries freight (M1 package 1, design-doc 5 and 9).
// - Real touch taps: tap an item to walk there and pick it up (0.2 game minutes, 2 ticks), tap the ground to
//   put it down there, tap a tool's parking spot to take the hand truck.
// - Carrying limits: 1 by hand, 3 on the hand truck, 6 on the handcart; a long bundle is refused on the hand
//   truck; a loaded tool cannot be left; the handcart is stopped at the platform's edge.
// - The item conservation check passes after the run of moves.
// - Save and reload (export/import and a real page reload) keep what is carried and the tool.
// - Same commands, same result (state hash), and a different command list gives a different hash.
// - The no-handcart rectangles match the buildings' footprints.
// - Screenshots at phone size: carrying by hand, pushing a loaded hand truck. Draw calls are reported.

const { openGame, waitReady, screenshotPath } = require('./browser');

module.exports = async function checkCarry() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  const R = (fn, arg) => page.evaluate(fn, arg);
  const settle = () => page.waitForTimeout(150);
  const camSettle = () => page.waitForTimeout(900); // the camera follows the character with a soft lag
  try {
    // Items to work with, near the player, and the camera close in. (Placed as in M1 around the player, who then
    // started at -10.5, 11.2 and since D15 starts at those x 1.6; items keep their size and spacing.)
    await R(() => {
      const R = window.__railhead, C = R.cargo, S = R.state, P = S.player;
      const dx = Math.round(P.x * 100) + 1050, dz = Math.round(P.z * 100) - 1120;
      window.__off = { dx, dz };
      const wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null });
      const at = [['flour', -1050, 1000], ['salt', -1130, 940], ['beans', -1210, 940], ['coffee', -1290, 940], ['rails', -1370, 940],
        ['seed', -1130, 870], ['grain', -1210, 870], ['nails', -1290, 870], ['tinned', -1370, 870], ['hardware', -1450, 870]];
      window.__ids = {};
      for (const [c, x, z] of at) window.__ids[c] = C.itemCreate(S, wb(c), { kind: 'GROUND', x: x + dx, z: z + dz }, null).id;
      R.camera.zoom = 2;
    });
    await camSettle();
    const ids = await R(() => window.__ids);
    const where = id => R(id => JSON.stringify(window.__railhead.state.items.where[id]), id);
    const carriedN = () => R(() => window.__railhead.carry.carryHeld(window.__railhead.state).length);

    // 1. Tap the flour: walk there, then a 2-tick pick-up (0.2 game minutes) with the action showing.
    let sp = await R(id => { const R = window.__railhead, w = R.state.items.where[id]; return R.toScreen(w.x / 100, w.z / 100, 0.15); }, ids.flour);
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    let actTicks = 0, sawAct = false;
    for (let i = 0; i < 40; i++) {
      await R(() => window.__railhead.step(1));
      const a = await R(() => window.__railhead.state.player.act);
      if (a && a.k === 'pick') { sawAct = true; actTicks++; }
      if (JSON.parse(await where(ids.flour)).kind === 'CARRIED') break;
    }
    const wf = JSON.parse(await where(ids.flour));
    if (wf.kind !== 'CARRIED' || wf.carrier !== 'HAND') problems.push('tap on an item: it was not picked up by hand (' + JSON.stringify(wf) + ')');
    if (!sawAct || actTicks !== 2) problems.push(`pick-up should take 0.2 game minutes (2 ticks of 8 s); the action showed for ${actTicks} tick(s) before the item moved`);
    await camSettle();
    const text1 = await page.textContent('#carryText');
    if (!/Carrying: Flour \(W\)/.test(text1)) problems.push('carry readout by hand: "' + text1 + '"');
    if (!(await page.isVisible('#carryPut'))) problems.push('the Put down button is not shown while carrying');
    await page.screenshot({ path: screenshotPath('carry-hand-portrait') });
    const dcHand = await R(() => window.__railhead.drawCalls);

    // 2. By hand the limit is 1: a second item is refused.
    let ev = await R(id => window.__railhead.simTick(window.__railhead.state, [{ t: 'carryPick', id }]), ids.salt);
    if (!ev.some(e => e.t === 'carryRefused' && /hands are full/.test(e.why))) problems.push('a second item by hand was not refused');

    // 3. Tap the ground to put it down there.
    const p = await R(() => ({ x: window.__railhead.state.player.x, z: window.__railhead.state.player.z }));
    const gx = p.x + 1.2, gz = p.z + 0.8;
    // The spot may be on the platform's deck: tap where its surface is drawn (D15, taps land on a deck's top).
    sp = await R(([x, z]) => window.__railhead.toScreen(x, z, window.__railhead.feet.bldStandY(x, z)), [gx, gz]);
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    await R(() => window.__railhead.step(30));
    const wg = JSON.parse(await where(ids.flour));
    if (wg.kind !== 'GROUND' || Math.hypot(wg.x / 100 - gx, wg.z / 100 - gz) > 0.1) problems.push('tap on the ground while carrying: not put down there (' + JSON.stringify(wg) + ')');
    if (await carriedN() !== 0) problems.push('still carrying after putting down');
    // Moving cancels an action: start a pick-up, then walk away during it.
    await R(id => { const R = window.__railhead; R.send({ t: 'carryPick', id }); for (let i = 0; i < 40 && !R.state.player.act; i++) R.step(1); const o = window.__off; R.send({ t: 'walkTo', x: -1000 + o.dx, z: 1150 + o.dz }); R.step(10); }, ids.flour);
    if (JSON.parse(await where(ids.flour)).kind !== 'GROUND') problems.push('walking away during a pick-up did not cancel it');

    // 4. Take the hand truck by tapping its parking spot.
    await camSettle();
    sp = await R(() => { const R = window.__railhead, T = R.state.tools[0]; return R.toScreen(T.x / 100, T.z / 100, 0.4); });
    await page.touchscreen.tap(sp.x, sp.y); await settle();
    await R(() => window.__railhead.step(40));
    if (await R(() => window.__railhead.state.player.tool) !== 0) problems.push('tap on the hand truck spot: the hand truck was not taken');
    // A long bundle never goes on a hand truck.
    ev = await R(id => window.__railhead.simTick(window.__railhead.state, [{ t: 'carryPick', id }]), ids.rails);
    if (!ev.some(e => e.t === 'carryRefused' && /long bundle/i.test(e.why))) problems.push('a long bundle was not refused on the hand truck');
    // Three items on the hand truck (sent as commands), the fourth refused.
    const pick = async id => R(id => { const R = window.__railhead; R.send({ t: 'carryPick', id }); R.step(60); }, id);
    for (const c of ['salt', 'beans', 'coffee']) await pick(ids[c]);
    if (await carriedN() !== 3) problems.push('the hand truck holds ' + (await carriedN()) + ' items, not 3');
    ev = await R(id => window.__railhead.simTick(window.__railhead.state, [{ t: 'carryPick', id }]), ids.seed);
    if (!ev.some(e => e.t === 'carryRefused' && /full \(3/.test(e.why))) problems.push('a fourth item on the hand truck was not refused');
    ev = await R(() => { const R = window.__railhead; return R.simTick(R.state, [{ t: 'carryTool', tool: 0 }]).concat(...Array.from({ length: 30 }, () => R.simTick(R.state, []))); });
    if (!ev.some(e => e.t === 'carryRefused' && /Unload/.test(e.why))) problems.push('a loaded hand truck could be left');
    await R(() => { const R = window.__railhead, o = window.__off; R.send({ t: 'walkTo', x: -1000 + o.dx, z: 1180 + o.dz }); R.step(30); });
    await camSettle();
    const text3 = await page.textContent('#carryText');
    if (!/^Hand truck 3\/3/.test(text3)) problems.push('carry readout with the hand truck: "' + text3 + '"');
    await page.screenshot({ path: screenshotPath('carry-handtruck-portrait') });
    const dcTruck = await R(() => window.__railhead.drawCalls);

    // 5. Save and reload keep what is carried: export/import, then a real page reload.
    const saved = await R(async () => {
      const R = window.__railhead, h = R.hash(), h2 = R.importSave(R.exportSave());
      const ok = await R.saveGame();
      return { h, h2, ok, held: R.carry.carryHeld(R.state), tool: R.state.player.tool };
    });
    if (saved.h !== saved.h2) problems.push('export then import changed the state while carrying');
    if (!saved.ok) problems.push('saving to the browser failed');
    await page.reload(); await waitReady(page);
    const back = await R(() => { const R = window.__railhead; return { h: R.hash(), held: R.carry.carryHeld(R.state), tool: R.state.player.tool }; });
    if (back.h !== saved.h || JSON.stringify(back.held) !== JSON.stringify(saved.held) || back.tool !== saved.tool) problems.push('after reopening the page the carried items or the tool were different');

    // 6. Unload by the Put down button, leave the truck, take the handcart (all by command), 6 items, the 7th refused.
    for (let i = 0; i < 3; i++) { await page.tap('#carryPut'); await settle(); await R(() => window.__railhead.step(20)); }
    if (await carriedN() !== 0) problems.push('the Put down button did not unload the hand truck');
    await R(() => { const R = window.__railhead; R.send({ t: 'carryTool', tool: 0 }); R.step(60); R.send({ t: 'carryTool', tool: 1 }); R.step(60); });
    if (await R(() => window.__railhead.state.player.tool) !== 1) problems.push('could not swap the hand truck for the handcart');
    for (const c of ['salt', 'beans', 'coffee', 'seed', 'grain', 'nails']) await pick(ids[c]);
    if (await carriedN() !== 6) problems.push('the handcart holds ' + (await carriedN()) + ' items, not 6');
    ev = await R(id => window.__railhead.simTick(window.__railhead.state, [{ t: 'carryPick', id }]), ids.tinned);
    if (!ev.some(e => e.t === 'carryRefused' && /full \(6/.test(e.why))) problems.push('a seventh item on the handcart was not refused');
    // The handcart is stopped at the platform's edge.
    const plat = await R(() => {
      const R = window.__railhead, S = R.state, evs = [];
      // Towards the middle of the platform (M1: (0, 12.3), 0.4u south of its centre line; x 1.6 since D15).
      const f = R.buildings.footprints().find(f => f.id === 'platform'), to = { t: 'walkTo', x: Math.round(f.x * 100), z: Math.round((f.z + 0.4 * R.CFG.SCALE) * 100) };
      R.send(to);
      for (let i = 0; i < 200; i++) { R.step(1); }
      evs.push(...R.simTick(S, [to]));
      for (let i = 0; i < 5; i++) evs.push(...R.simTick(S, []));
      const inside = Math.abs(S.player.x - f.x) < f.w / 2 && Math.abs(S.player.z - f.z) < f.d / 2;
      return { inside, refused: evs.some(e => e.t === 'carryRefused' && /platform/.test(e.why)), x: S.player.x, z: S.player.z };
    });
    if (plat.inside) problems.push(`the handcart went onto the platform (player at ${plat.x.toFixed(2)}, ${plat.z.toFixed(2)})`);
    if (!plat.refused) problems.push('no "handcart cannot go on the platform" message at the platform edge');

    // 7. Item conservation after all those moves.
    const cons = await R(() => window.__railhead.cargo.itemCheckConservation(window.__railhead.state));
    if (cons.length) problems.push('item conservation: ' + cons.join('; '));

    // 8. The no-handcart rectangles match the platform and freight shed footprints (plus 0.2u).
    const rectOk = await R(() => {
      const R = window.__railhead, fp = R.buildings.footprints(), rects = R.carry.carryNoCartRects(), out = [];
      const pl = fp.find(f => f.id === 'platform'), sh = fp.filter(f => f.kind === 'freightshed');
      const box = fs => [Math.min(...fs.map(f => f.x - f.w / 2)) - 0.2, Math.max(...fs.map(f => f.x + f.w / 2)) + 0.2, Math.min(...fs.map(f => f.z - f.d / 2)) - 0.2, Math.max(...fs.map(f => f.z + f.d / 2)) + 0.2];
      for (const [want, got] of [[box([pl]), rects[0]], [box(sh), rects[1]]]) if (want.some((v, i) => Math.abs(v - got[i]) > 0.01)) out.push(JSON.stringify(want) + ' vs ' + JSON.stringify(got));
      return out;
    });
    if (rectOk.length) problems.push('no-handcart areas do not match the buildings: ' + rectOk.join('; '));

    // 9. Determinism: the same carrying commands from the same start give the same hash.
    const det = await R(() => {
      const R = window.__railhead, C = R.cargo;
      const run = drop => {
        const S = R.newState(42);
        const wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null });
        const k = R.CFG.SCALE;   // places in the yard, x 1.6 since D15
        const a = C.itemCreate(S, wb('flour'), { kind: 'GROUND', x: Math.round(-1000 * k), z: Math.round(1100 * k) }, null).id;
        const b = C.itemCreate(S, wb('salt'), { kind: 'GROUND', x: Math.round(-900 * k), z: Math.round(1000 * k) }, null).id;
        const script = [
          { tick: 0, cmd: { t: 'carryPick', id: a } },
          { tick: 40, cmd: { t: 'carryPut', b: 'freightshed', bay: 1 } },
          { tick: 120, cmd: { t: 'carryTool', tool: 0 } },
          { tick: 200, cmd: { t: 'carryPick', id: b } },
          { tick: 260, cmd: { t: 'carryPut', x: Math.round(-1200 * k), z: Math.round(1150 * k) } },
        ];
        R.simRun(S, drop ? script.slice(0, -1) : script, 400);
        return { h: R.stateHash(S), cons: C.itemCheckConservation(S).length };
      };
      return [run(false), run(false), run(true)];
    });
    if (det[0].h !== det[1].h) problems.push(`two identical carrying runs ended differently (${det[0].h} vs ${det[1].h})`);
    if (det[0].h === det[2].h) problems.push('a different carrying command list gave the same hash');
    if (det[0].cons) problems.push('item conservation failed in the determinism run');

    // 10. Cordwood on the handcart (D13), in the real start (a new game: 8 cords at the hub's wood stage).
    // Other long bundles stay by hand only; no long bundle on the hand truck; cords go onto the tender cord by cord.
    const cart = await R(() => {
      const R = window.__railhead, C = R.cargo, out = { bad: [] };
      const fresh = () => R.newState(1866, 'start');
      const cordsOf = S => C.itemsAt(S, { kind: 'GROUND' }).filter(i => S.items.waybill[i].commodity === 'cordwood');
      const run = (S, cmd, n) => { const ev = R.simTick(S, cmd ? [cmd] : []); for (let i = 0; i < (n || 0); i++) ev.push(...R.simTick(S, [])); return ev; };
      const held = S => R.carry.carryHeld(S);
      // The hand truck: a cord is refused.
      const S1 = fresh();
      run(S1, { t: 'carryTool', tool: 0 }, 150);
      if (S1.player.tool !== 0) out.bad.push('could not take the hand truck in the real start');
      let ev = run(S1, { t: 'carryPick', id: cordsOf(S1)[0] });
      if (!ev.some(e => e.t === 'carryRefused' && /hand truck/.test(e.why))) out.bad.push('a cord was not refused on the hand truck: ' + JSON.stringify(ev.filter(e => /Refused/.test(e.t))));
      if (C.itemCanMove(S1, cordsOf(S1)[0], { kind: 'CARRIED', actorId: 'player', carrier: 'HANDTRUCK', slot: 0 }) === null) out.bad.push('itemCanMove allows a cord on the hand truck');
      // The handcart: cords yes; ties, rails, lumber and poles no.
      const S = fresh(), cords = cordsOf(S);
      out.start = cords.length;
      run(S, { t: 'carryTool', tool: 1 }, 150);
      if (S.player.tool !== 1) out.bad.push('could not take the handcart in the real start');
      run(S, { t: 'carryPick', id: cords[0] }, 200);   // (D15: the wood stage is about 52u from the handcart's spot, some 140 ticks' walk)
      if (held(S).length !== 1 || S.items.where[cords[0]].carrier !== 'HANDCART') out.bad.push('a cord did not go on the handcart: ' + JSON.stringify(S.items.where[cords[0]]));
      const P = S.player, wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 0, consignee: { kind: 'CONSTRUCTION', id: 0 }, contractId: null, due: null });
      out.others = {};
      for (const c of ['ties', 'rails', 'lumber', 'poles']) {
        const id = C.itemCreate(S, wb(c), { kind: 'GROUND', x: Math.round((P.x + 0.6) * 100), z: Math.round(P.z * 100) }, null).id;
        const e2 = run(S, { t: 'carryPick', id });
        out.others[c] = (e2.find(e => e.t === 'carryRefused') || {}).why || 'not refused';
        if (!/by hand only/.test(out.others[c])) out.bad.push(c + ' was not refused on the handcart: ' + out.others[c]);
        C.itemConsume(S, id, 'construction', null);
      }
      for (let k = 1; k < 6; k++) run(S, { t: 'carryPick', id: cords[k] }, 120);
      out.loaded = held(S).length;
      if (out.loaded !== 6) out.bad.push('the handcart holds ' + out.loaded + ' cords, not 6');
      ev = run(S, { t: 'carryPick', id: cords[6] });
      if (!ev.some(e => e.t === 'carryRefused' && /full \(6/.test(e.why))) out.bad.push('a seventh cord on the handcart was not refused');
      // Onto the tender from the handcart, cord by cord (No. 1 at the platform, its tender 3 cords short).
      const L = S.trains[0].consist.find(c => c.k === 'loco');
      L.fuel = R.tt.FUEL_CAP - 3 * R.CFG.CORD_U;
      out.fuel = [];
      for (let k = 0; k < 3; k++) {
        const e3 = run(S, { t: 'fuelTender', tr: 0 }, 250);
        out.fuel.push({ held: held(S).length, cords: Math.round(L.fuel / R.CFG.CORD_U), onPlatform: R.carry.carryNoCartAt(S.player.x, S.player.z), refused: e3.filter(e => /Refused/.test(e.t)).map(e => e.why) });
      }
      if (out.fuel.map(f => f.held).join() !== '5,4,3' || out.fuel.map(f => f.cords).join() !== '2,3,4') out.bad.push('cords from the handcart onto the tender, one at a time: ' + JSON.stringify(out.fuel));
      if (out.fuel.some(f => f.onPlatform)) out.bad.push('the handcart went onto the platform to fuel the tender');
      out.used = S.items.used.filter(u => u.reason === 'fuel').length;
      if (out.used !== 3) out.bad.push(out.used + ' cords consumed as fuel, expected 3');
      out.cons = C.itemCheckConservation(S);
      if (out.cons.length) out.bad.push('item conservation with cords on the handcart: ' + out.cons.join('; '));
      // The conservation check still catches a long bundle that is not cordwood on the handcart.
      const S2 = fresh(), t = C.itemCreate(S2, wb('ties'), { kind: 'GROUND', x: 3000, z: -1000 }, null).id;
      S2.items.where[t] = { kind: 'CARRIED', actorId: 'player', carrier: 'HANDCART', slot: 0 };
      if (!C.itemCheckConservation(S2).length) out.bad.push('the conservation check missed a tie bundle on the handcart');
      // Drawn: show the loaded handcart in the page (3 cords left on it).
      R.importSave(JSON.stringify({ state: S })); R.camera.zoom = 2;
      R.send({ t: 'walkTo', x: Math.round((S.player.x - 3) * 100), z: Math.round((S.player.z + 2.2) * 100) }); R.step(40);
      return out;
    });
    problems.push(...cart.bad);
    await camSettle();
    await page.screenshot({ path: screenshotPath('carry-handcart-cords-portrait') });
    const dcCart = await R(() => window.__railhead.drawCalls);
    console.log(`  cords on the handcart: ${cart.start} at the wood stage, ${cart.loaded} loaded, fuel ${JSON.stringify(cart.fuel.map(f => f.held + ' left, tender ' + f.cords))}; refused: ${JSON.stringify(cart.others)}`);

    console.log(`  draw calls: carrying by hand ${dcHand}, pushing a loaded hand truck ${dcTruck}, the handcart with cords ${dcCart}; determinism hash ${det[0].h}`);
    if (dcTruck >= 100 || dcHand >= 100 || dcCart >= 100) problems.push('draw calls over 100');
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
  return problems;
};
