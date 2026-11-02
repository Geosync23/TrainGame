// Check: the station buildings (piece 3b).
// - Every building footprint keeps the section 6 clearance from every track edge, sampled every 0.25u:
//   platform and freight dock flush at 0.9u, other buildings 1.2u from main track, 1.0u from yard track (all x SC since D15).
// - Footprints keep clear of the switch stands and the spots where the player stands to throw them.
// - The platform top is 0.3u (found by a ray straight down onto the buildings mesh).
// - The platform is 20u long and 2.4u deep (D12; x SC since D15), with a canopy over its middle 10u only, the canopy kept
//   inside the platform's track-side edge.
// - No two footprints overlap (except the depot's office bay stepping onto the platform's back edge and the
//   lamps standing on it), and the hand truck and handcart parking spots stay clear of every footprint.
// - The buildings are 2 meshes (one KIT_MAT, one GLOW_MAT), and a busy scene stays under 100 draw calls.
// - Screenshots centred on the station, portrait and landscape, go to test-output/.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkBuildings() {
  const problems = [];
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused&world=yard' });
    try {
      if (orientation === 'portrait') {
        const found = await page.evaluate(() => {
          const R = window.__railhead, B = R.buildings, T = R.state.track, out = [], SC = R.CFG.SCALE;
          if (!B) return ['window.__railhead.buildings is missing'];
          const fps = B.footprints();
          const need = ['platform', 'depot', 'freightshed', 'freightdock', 'watertower', 'shanty'];
          for (const id of need) if (!fps.some(f => f.id === id)) out.push(`no footprint for ${id}`);
          if (fps.filter(f => f.kind === 'lamp').length < 2) out.push('fewer than 2 lamp posts');
          // Distance from a point to a footprint rectangle (0 inside).
          const dist = (f, x, z) => {
            const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z;
            const lx = dx * c - dz * s, lz = dx * s + dz * c;
            return Math.hypot(Math.max(0, Math.abs(lx) - f.w / 2), Math.max(0, Math.abs(lz) - f.d / 2));
          };
          for (const f of fps) {
            let worst = null;
            for (const E of T.edges) {
              const need = (f.flush ? 0.9 : (E.cls === 'yard' ? 1.0 : 1.2)) * SC;
              const n = Math.max(1, Math.ceil(E.len / 0.25));
              for (let i = 0; i <= n; i++) {
                const p = R.edgeAt(T, E, E.len * i / n), d = dist(f, p.x, p.z);
                if (d < need - 1e-6 && (!worst || d - need < worst.short)) worst = { short: d - need, e: E.id, d, need };
              }
            }
            if (worst) out.push(`${f.id} is ${worst.d.toFixed(3)}u from edge ${worst.e} (needs ${worst.need}u)`);
            for (const W of T.switches) for (const [x, z, what] of [[W.stand.x, W.stand.z, 'stand'], [W.stand.ux, W.stand.uz, 'throwing spot']]) {
              if (dist(f, x, z) < 0.5) out.push(`${f.id} is within 0.5u of switch ${W.id}'s ${what}`);
            }
          }
          // The platform must sit flush: its track-side edge within 0.9u to 0.95u of the main line.
          const plat = fps.find(f => f.id === 'platform');
          if (plat) {
            let best = Infinity;
            for (const E of T.edges) for (let i = 0; i <= 40; i++) { const p = R.edgeAt(T, E, E.len * i / 40); best = Math.min(best, dist(plat, p.x, p.z)); }
            if (best > 0.95 * SC) out.push(`platform edge is ${best.toFixed(3)}u from the track, not flush at ${0.9 * SC}u`);
            // Platform top: a ray straight down near the west end, away from the canopy and lamps.
            const rc = new THREE.Raycaster(new THREE.Vector3(plat.x - plat.w / 2 + 1.5 * SC, 20, plat.z + plat.d / 2 - 0.3), new THREE.Vector3(0, -1, 0));
            const hit = rc.intersectObject(B.meshes[0], false)[0];
            if (!hit) out.push('the ray down onto the platform hit nothing');
            else if (Math.abs(hit.point.y - 0.3) > 1e-3) out.push(`platform top is at ${hit.point.y.toFixed(3)}u, expected 0.3u`);
            // Size (D12): 20u along the track, 2.4u deep.
            if (Math.abs(plat.w - 20 * SC) > 1e-6 || Math.abs(plat.d - 2.4 * SC) > 1e-6) out.push(`platform is ${plat.w}u x ${plat.d}u, expected ${20 * SC}u x ${2.4 * SC}u`);
            // Canopy: the first thing a ray down meets, sampled along the platform's middle line.
            // The canopy roof is its own mesh (it turns see-through near the player), the posts and slab are in the buildings mesh.
            if (!B.roof || !B.roof.mesh) out.push('no canopy roof mesh (window.__railhead.buildings.roof.mesh)');
            const roofMeshes = [B.meshes[0]].concat(B.roof && B.roof.mesh ? [B.roof.mesh] : []);
            const topAt = (x, z) => { const h = new THREE.Raycaster(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0)).intersectObjects(roofMeshes, false)[0]; return h ? h.point.y : 0; };
            const zEdge = plat.z + plat.d / 2;
            for (let dx = -9.5 * SC; dx <= 9.5 * SC + 1e-9; dx += 0.5 * SC) {
              if (Math.abs(Math.abs(dx) - 5 * SC) < 0.3 * SC) continue;          // the canopy's own ends
              const y = topAt(plat.x + dx, zEdge - 0.25), want = Math.abs(dx) < 5 * SC;
              if (want !== y > 1.9) out.push(`canopy: at ${dx}u from the platform's middle the top is at ${y.toFixed(2)}u (${want ? 'expected the canopy' : 'expected no canopy'})`);
            }
            if (topAt(plat.x, zEdge + 0.02) > 1) out.push('canopy reaches past the platform\'s track-side edge');
          }
          // Footprints do not overlap one another (the depot's office bay may step onto the platform).
          const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6;
          for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
            const a = fps[i], b = fps[j], pair = [a.id, b.id].sort().join('+');
            if (pair === 'depot+platform' || pair === 'freightdock+freightshed') continue;
            if ((a.kind === 'lamp' && b.id === 'platform') || (b.kind === 'lamp' && a.id === 'platform')) continue; // lamps stand on it
            if (overlap(a, b)) out.push(`${a.id} overlaps ${b.id}`);
          }
          // The hand truck and handcart parking spots (W3) stay at least 0.3u clear of every footprint.
          for (const t of R.carry.TOOL_PARK) for (const f of fps) {
            const d = dist(f, t.x / 100, t.z / 100);
            if (d < 0.3 + (t.k === 'cart' ? 1.05 : 0.4)) out.push(`the ${t.k} parking spot is ${d.toFixed(2)}u from ${f.id}`);
          }
          // Two meshes: one with the shared kit material, one with the glow material.
          const [m, g] = B.meshes;
          if (!m.castShadow || !m.receiveShadow) out.push('buildings mesh does not cast and receive shadows');
          if (g.material === m.material) out.push('glow mesh does not use its own material');
          if (!(g.material.emissive && g.material.emissive.getHexString() === 'ffcf73')) out.push('glow mesh is not GLOW_MAT');
          let n = 0; m.parent.traverse(o => { if (o.name === 'buildings' || o.name === 'buildingGlow') n++; });
          if (n !== 2) out.push(`${n} building meshes, expected 2`);
          return out;
        });
        problems.push(...found);
      }
      // Centre the camera on the station: put the player on the platform (the camera follows the player).
      await page.evaluate(() => { const P = window.__railhead.state.player, k = window.__railhead.CFG.SCALE; P.x = -0.5 * k; P.z = 11.4 * k; });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: screenshotPath('buildings-' + orientation) });
      const calm = await page.evaluate(() => window.__railhead.drawCalls);
      // Busy: the train running past the station, the player walking.
      await page.evaluate(() => { const R = window.__railhead; R.send({ t: 'trainRun', tr: 0, dir: 1 }); R.send({ t: 'walkTo', x: 300, z: 1200 }); R.step(20); });
      await page.waitForTimeout(900);
      const busy = await page.evaluate(() => window.__railhead.drawCalls);
      await page.screenshot({ path: screenshotPath('buildings-busy-' + orientation) });
      if (busy >= 100) problems.push(`${orientation}: ${busy} draw calls in a busy scene (budget under 100)`);
      if (errors.length) problems.push(`${orientation}: console errors: ${errors.join(' | ')}`);
      console.log(`  ${orientation}: draw calls ${calm} at the station, ${busy} with the train running`);
    } finally {
      await browser.close();
    }
  }
  return problems;
};
