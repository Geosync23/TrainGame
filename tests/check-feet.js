// Check: the player stands on the platforms and the freight dock (D15), drawing only.
// - On the hub platform, Willow Ford's platform and the freight shed's dock the drawn feet are at the deck
//   top (window.__railhead.buildings.platformTop, within 0.02u); on the ground beside them at 0.
// - The step at a deck's edge is short and smooth (no jump bigger than 0.06u per 0.02u walked).
// - What the player pushes (the hand truck) and the progress ring go up with the player.
// - A tap on a deck lands on its top (the walk target is where the deck was tapped), and the tap marker sits on it.
// - The sim is untouched: the player's state has no height.
// - Screenshots at phone size: on the platform with the hand truck, on the dock carrying an item.
// The decks are found from the buildings' footprints (the flush ones), never from fixed positions.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkFeet() {
  const problems = [];
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  const R = (fn, arg) => page.evaluate(fn, arg);
  const camSettle = () => page.waitForTimeout(900);
  const near = (a, b) => Math.abs(a - b) <= 0.02;
  try {
    const info = await R(() => {
      const R = window.__railhead, B = R.buildings;
      return { top: B.platformTop, decks: B.footprints().filter(f => f.flush).map(f => ({ id: f.id, kind: f.kind, x: f.x, z: f.z, w: f.w, d: f.d, yaw: f.yaw })) };
    });
    const top = info.top;
    const start = await R(() => ({ x: window.__railhead.state.player.x, z: window.__railhead.state.player.z }));
    const hub = info.decks.find(f => f.kind === 'platform'), dock = info.decks.find(f => f.id === 'freightdock'), wf = info.decks.find(f => f.kind === 'wfplatform');
    if (!hub || !dock || !wf) problems.push('expected the hub platform, the freight dock and Willow Ford\'s platform among the flush footprints: ' + JSON.stringify(info.decks.map(f => f.id)));
    // Put the player at (x, z) (state only; the drawing follows) and read the drawn feet a few frames later.
    const stand = async (x, z) => {
      await R(([x, z]) => { const P = window.__railhead.state.player; P.x = x; P.z = z; }, [x, z]);
      await page.waitForTimeout(120);
      return R(() => window.__railhead.feet.playerY);
    };
    // A point a given way inside or outside a deck, along its local x (its length).
    const along = (f, lx, lz) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw); return [f.x + lx * c + lz * s, f.z - lx * s + lz * c]; };
    for (const f of [hub, dock, wf].filter(Boolean)) {
      for (const [lx, lz] of [[0, 0], [f.w / 2 - 0.3, 0], [-f.w / 2 + 0.3, f.d / 2 - 0.25]]) {
        const [x, z] = along(f, lx, lz), y = await stand(x, z);
        if (!near(y, top)) problems.push(`on ${f.id} at (${x.toFixed(2)}, ${z.toFixed(2)}): feet drawn at ${y.toFixed(3)}, deck top ${top}`);
      }
      // Off the end of the deck, on the ground (flat round the stations).
      const [x, z] = along(f, f.w / 2 + 1.0, 0), y = await stand(x, z);
      if (!near(y, 0)) problems.push(`beside ${f.id} at (${x.toFixed(2)}, ${z.toFixed(2)}): feet drawn at ${y.toFixed(3)}, ground 0`);
      // The step at the end: smooth and short.
      const prof = await R(([f, top]) => {
        const F = window.__railhead.feet, c = Math.cos(f.yaw), s = Math.sin(f.yaw), out = [];
        for (let a = f.w / 2 - 0.4; a <= f.w / 2 + 0.4 + 1e-9; a += 0.02) out.push(F.bldStandY(f.x + a * c, f.z - a * s));
        return out;
      }, [f, top]);
      let maxJump = 0;
      for (let i = 1; i < prof.length; i++) maxJump = Math.max(maxJump, Math.abs(prof[i] - prof[i - 1]));
      const mono = prof.every((v, i) => i === 0 || v <= prof[i - 1] + 1e-9);
      if (!near(prof[0], top) || !near(prof[prof.length - 1], 0) || !mono || maxJump > 0.06)
        problems.push(`the step at ${f.id}'s end is not a short smooth step: ${prof.map(v => v.toFixed(2)).join(' ')}`);
    }

    // The hand truck goes up onto the platform with the player, and the progress ring floats over the head.
    if (hub) {
      await R(st => { const R = window.__railhead; R.state.player.x = st.x; R.state.player.z = st.z; R.send({ t: 'carryTool', tool: 0 }); for (let i = 0; i < 400 && R.state.player.tool !== 0; i++) R.step(1); }, start);
      const tool = await R(() => window.__railhead.state.player.tool);
      if (tool !== 0) problems.push('could not take the hand truck for the check (tool ' + tool + ')');
      const [x, z] = along(hub, -hub.w / 2 + 2.5, 0);   // near the end, out from under the canopy
      // Face along the platform, so the truck in front is on the deck too.
      await R(([x, z]) => { const P = window.__railhead.state.player; P.x = x; P.z = z; P.f = Math.PI / 2; window.__railhead.camera.zoom = 2; }, [x, z]);
      await camSettle();
      const t = await R(() => ({ y: window.__railhead.feet.playerY, tools: window.__railhead.feet.toolYs }));
      if (!near(t.y, top)) problems.push(`with the hand truck on the platform: feet at ${t.y.toFixed(3)}`);
      if (!near(t.tools[0], top)) problems.push(`the hand truck pushed on the platform is drawn at ${t.tools[0].toFixed(3)}, not on the deck (${top})`);
      await page.screenshot({ path: screenshotPath('feet-platform-truck-portrait') });
      // Leave the truck at its spot again (state only, for the next part).
      await R(() => { const S = window.__railhead.state; S.player.tool = null; });
    }

    // On the dock carrying an item by hand, mid pick-up so the progress ring shows.
    if (dock) {
      const [x, z] = along(dock, 0.4, 0.1);
      await R(([x, z]) => {
        const R = window.__railhead, C = R.cargo, S = R.state;
        const wb = c => ({ commodity: c, originTownId: 'OUTSIDE', destTownId: 1, consignee: { kind: 'BUSINESS', id: 0 }, contractId: null, due: null });
        C.itemCreate(S, wb('flour'), { kind: 'CARRIED', actorId: 'player', carrier: 'HAND', slot: 0 }, null);
        S.player.x = x; S.player.z = z; S.player.f = 0;
        S.player.act = { k: 'throw', left: 3, total: 6 };   // only to show the ring; never ticked
        R.cargo.redraw();
      }, [x, z]);
      await camSettle();
      const d = await R(() => ({ y: window.__railhead.feet.playerY, ring: window.__railhead.feet.actionRingY }));
      if (!near(d.y, top)) problems.push(`on the dock carrying: feet at ${d.y.toFixed(3)}`);
      if (!near(d.ring, top + 1.45)) problems.push(`the progress ring on the dock is at ${d.ring.toFixed(3)}, expected ${top + 1.45} (over the head)`);
      await page.screenshot({ path: screenshotPath('feet-dock-carry-portrait') });
      await R(() => { // put the item back down (state only), so the tap below is a walk
        const R = window.__railhead, S = R.state, id = R.carry.carryHeld(S)[0];
        S.player.act = null; S.items.where[id] = { kind: 'GROUND', x: Math.round(S.player.x * 100), z: Math.round(S.player.z * 100) }; R.cargo.redraw();
      });
    }

    // A tap on the hub platform's deck: the walk target is the tapped deck point and the marker sits on the deck.
    if (hub) {
      const [x, z] = along(hub, -hub.w / 2 + 1, 0.3), [px, pz] = along(hub, -hub.w / 2 + 2.5, 0);   // the far end, clear of the depot's windows
      await R(([px, pz]) => { const P = window.__railhead.state.player; P.x = px; P.z = pz; }, [px, pz]);
      await camSettle(); await camSettle();
      const sp = await R(([x, z, y]) => window.__railhead.toScreen(x, z, y), [x, z, top]);
      const g = await R(([a, b]) => { const g = window.__railhead.feet.deckGroundAt(a, b); return g && { x: g.x, y: g.y, z: g.z }; }, [sp.x, sp.y]);
      if (!g || Math.hypot(g.x - x, g.z - z) > 0.05 || !near(g.y, top)) problems.push(`a tap on the deck at (${x.toFixed(2)}, ${z.toFixed(2)}) lands at ${JSON.stringify(g)}`);
      await page.touchscreen.tap(sp.x, sp.y);
      await page.waitForTimeout(150);
      const ring = await R(() => window.__railhead.feet.ringY);
      if (!near(ring, top + 0.05)) problems.push(`the tap marker on the deck is at ${ring.toFixed(3)}, expected ${top + 0.05}`);
      await R(() => window.__railhead.step(40));
      const P = await R(() => ({ x: window.__railhead.state.player.x, z: window.__railhead.state.player.z, y: window.__railhead.state.player.y }));
      if (Math.hypot(P.x - x, P.z - z) > 0.3) problems.push(`walking to a tapped deck point: the player stopped at (${P.x.toFixed(2)}, ${P.z.toFixed(2)}), not (${x.toFixed(2)}, ${z.toFixed(2)})`);
      if (P.y !== undefined) problems.push('the player\'s state gained a height (the sim should stay at 0)');
    }
    console.log(`  deck top ${top}; decks: ${info.decks.map(f => f.id).join(', ')}`);
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
  return problems;
};
