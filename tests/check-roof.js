// Check: the hub platform's canopy does not hide the player (D15, the wide platforms).
// - The canopy roof is its own mesh with its own material (not the shared kit material), so it can fade.
// - With the player under the canopy it fades to mostly see-through (opacity at most 0.2) and stops writing depth.
// - With the player far from it (out on the open ground behind the depot) it is solid again (opacity 1, writes depth).
// - Standing just off the canopy where it lies between the player and the camera also fades it.
// - Screenshots at phone size (portrait and landscape, start zoom 1.5): the player under the canopy, and the whole
//   hub platform, saved as test-output/wide-*.png.
// Places are read from the game (the canopy rectangles and the footprints), never fixed numbers.

const { openGame, screenshotPath } = require('./browser');

module.exports = async function checkRoof() {
  const problems = [];
  for (const orientation of ['portrait', 'landscape']) {
    const { browser, page, errors } = await openGame(orientation, { query: '?paused' });
    const R = (fn, arg) => page.evaluate(fn, arg);
    try {
      const info = await R(() => {
        const R = window.__railhead, B = R.buildings, m = B.roof && B.roof.mesh;
        return { ok: !!m, own: !!m && m.material !== B.meshes[0].material, transparent: !!m && m.material.transparent, rects: B.roofRects() };
      });
      if (!info.ok) { problems.push(`${orientation}: no canopy roof mesh`); continue; }
      if (!info.own) problems.push(`${orientation}: the canopy shares the buildings' material`);
      if (!info.transparent) problems.push(`${orientation}: the canopy material is not transparent`);
      if (info.rects.length !== 1) problems.push(`${orientation}: ${info.rects.length} canopies in the real start, expected 1 (the hub's)`);
      const c = info.rects[0];
      const put = async (x, z) => {
        await R(([x, z]) => { const S = window.__railhead.state; S.player.x = x; S.player.z = z; window.__railhead.camera.zoom = 1.5; }, [x, z]);
        await page.waitForTimeout(1500); // the camera's lag and the fade settle
        return R(() => { const r = window.__railhead.buildings.roof; return { op: r.mesh.material.opacity, dw: r.mesh.material.depthWrite }; });
      };
      // Under the canopy: halfway along, near its back edge (the cars standing at the platform would hide a player at its
      // track-side edge from the camera; that is the train, not the roof).
      const ux = c.x + (c.lx0 + c.lx1) / 2 + 2, uz = c.z + c.lz0 + 0.4;
      let r = await put(ux, uz);
      if (!(r.op <= 0.2)) problems.push(`${orientation}: under the canopy its opacity is ${r.op.toFixed(2)}, expected at most 0.2`);
      if (r.dw) problems.push(`${orientation}: under the canopy it still writes depth`);
      await page.screenshot({ path: screenshotPath('wide-under-canopy-' + orientation) });
      // Far away: behind the depot, well clear of the canopy.
      const fps = await R(() => window.__railhead.buildings.footprints().map(f => ({ id: f.id, x: f.x, z: f.z, w: f.w, d: f.d })));
      const dep = fps.find(f => f.id === 'depot');
      r = await put(dep.x - dep.w / 2 - 3, dep.z - dep.d / 2 - 2);
      if (!(r.op >= 0.999)) problems.push(`${orientation}: away from the canopy its opacity is ${r.op.toFixed(2)}, expected 1`);
      if (!r.dw) problems.push(`${orientation}: away from the canopy it does not write depth`);
      // Covered from the camera's view: a spot off the canopy's plan where it lies between the player and the camera.
      const cov = await R(c => {
        const R = window.__railhead, B = R.buildings, cy = R.camera.yaw, el = R.CFG.ISO_EL, top = B.platformTop;
        const dx = Math.sin(cy) * Math.cos(el), dz = Math.cos(cy) * Math.cos(el), dy = Math.sin(el);
        // Back from the canopy's middle along the line to the camera, until the head (1.2u up) sees it overhead.
        const t = (c.y - (top + 1.2)) / dy, x = c.x + (c.lx0 + c.lx1) / 2 - dx * t, z = c.z + (c.lz0 + c.lz1) / 2 - dz * t;
        const inPlan = x > c.x + c.lx0 - 3 && x < c.x + c.lx1 + 3 && z > c.z + c.lz0 - 3 && z < c.z + c.lz1 + 3;
        return { x, z, inPlan, want: B.roofWantFaded(x, top, z, cy, el) };
      }, c);
      if (!cov.want) problems.push(`${orientation}: a player hidden behind the canopy (at ${cov.x.toFixed(1)}, ${cov.z.toFixed(1)}) does not fade it`);
      console.log(`  ${orientation}: covered spot ${cov.inPlan ? 'within the near margin' : 'beyond the near margin'}`);
      // The whole hub platform at the start zoom, the player at its back middle (in front of the depot).
      const plat = fps.find(f => f.id === 'platform');
      await put(plat.x, plat.z - plat.d / 4);
      await page.screenshot({ path: screenshotPath('wide-hub-platform-' + orientation) });
      const calls = await R(() => window.__railhead.drawCalls);
      console.log(`  ${orientation}: draw calls on the hub platform ${calls}`);
      if (calls >= 100) problems.push(`${orientation}: ${calls} draw calls (budget under 100)`);
      if (errors.length) problems.push(`${orientation}: console errors: ${errors.join(' | ')}`);
    } finally {
      await browser.close();
    }
  }
  return problems;
};
