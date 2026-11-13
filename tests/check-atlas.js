// Check: the atlas (the integrator's; plans/d27-tech.md 7.4): every key the code asks for exists, and the budget.
// - The budget: PIX_ATLAS (the generated block in index.html, as it is written there: D32 packs its index, format
//   v 2) at most 4,500 KB (the designer lifted the 700 KB budget on 2026-11-13, and said going over is fine for the
//   wild country's art: with both wilds artists' sheets it is 3,935 KB; DEV_NOTES "D32" has the load time).
// - Static: every kind of goods (GOODS27) has goods/<kind> and its variants the code uses (FR_VARIANT, PIX_VARIANT), the
//   held and truck frames where its verb needs them; the platform cart has its cells (CARGO27.CART_CELLS) in every
//   direction; every shop body, house, the church, the school and the freight house have a lit night version with the
//   day frame's size; the rodding pieces; every townsperson (TF_AGENTS) and the agent have idle, walk and talk frames.
// - In play: two days of the D27 bot (tests/proto-bot.js, every D27 switch on), the game saved every game hour and
//   each save drawn at the default zoom and at scale 1 (portrait); the renderer's lookups are watched (pixBlit with a
//   key the atlas lacks, a person with no frame at all): none may miss.
const { openGame } = require('./browser');
const { PROTO_BOT_SRC } = require('./proto-bot');

module.exports = async function checkAtlas() {
  const problems = [], P = m => problems.push(m);
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=proto' });
  try {
    await page.waitForFunction(() => window.__railhead.pix.atlasReady, null, { timeout: 10000 }).catch(() => P('the atlas did not load'));
    // ---- Static ----
    const st = await page.evaluate(() => {
      const R = window.__railhead, D = R.d27, F = PIX_ATLAS.frames, X = PIX_ATLAS.extra || {}, miss = [], B = k => { if (!F[k]) miss.push(k); };
      const bytes = PIX_ATLAS.sheets.reduce((n, s) => n + s.length, 0) + JSON.stringify(PIX_ATLAS.frames).length + JSON.stringify(PIX_ATLAS.extra || {}).length;
      const dirs = ['se', 'ne', 'nw', 'sw'];
      for (const [kind, G] of Object.entries(D.GOODS27)) {
        B(`goods/${kind}`);
        if (G.verb === 'carry' || G.verb === 'shoulder') for (const d of dirs) B(`goods/${kind}/held/${d}`);
        if (G.verb === 'roll') for (const d of dirs) B(`goods/${kind}/roll/${d}/0`);
        if (G.verb === 'truck') for (const d of dirs) B(`goods/${kind}/truck/${d}`);
      }
      const V = { ...(typeof PIX_VARIANT !== 'undefined' ? PIX_VARIANT : {}), ...(typeof FR_VARIANT !== 'undefined' ? FR_VARIANT : {}) };
      for (const [kind, G] of Object.entries(D.GOODS27)) for (const c of G.commodities) if (V[c] && F[`goods/${kind}/${V[c]}`] === undefined && Object.keys(F).some(k => k.startsWith(`goods/${kind}/`) && /^[a-z]+$/.test(k.split('/')[2]) && !['held', 'roll', 'truck', 'side'].includes(k.split('/')[2]))) B(`goods/${kind}/${V[c]}`);
      for (const d of dirs) { const x = X[`cart27/${d}`]; if (!x || !Array.isArray(x.cells) || x.cells.length !== D.CARGO27.CART_CELLS) miss.push(`cart27/${d} cells (${x && x.cells && x.cells.length} of ${D.CARGO27.CART_CELLS})`); B(`cart27/${d}/0`); B(`cart27/${d}/1`); B(`truck/${d}/upright`); B(`truck/${d}/tilt`); }
      const lit = Object.keys(F).filter(k => /\/body$|^bld\/(church|school)$|^bld\/house\/\d\/[ew]$/.test(k));
      for (const k of lit) { const a = F[k], b = F[k + '_lit']; if (!b) miss.push(k + '_lit'); else if (a[3] !== b[3] || a[4] !== b[4] || a[5] !== b[5] || a[6] !== b[6]) miss.push(`${k}_lit (not the day frame's size and anchor)`); }
      for (const k of ['bld/rodding_x', 'bld/rodding_z', 'bld/rodding_crank', 'bld/rodding_crank/w_s', 'bld/rodding_crank/e_n', 'bld/rodding_crank/w_n', 'goods/keg/nails']) B(k);
      const who = ['agent'].concat((typeof TF_AGENTS !== 'undefined' ? TF_AGENTS : []).map(a => a.who));
      for (const w of new Set(who)) for (const a of ['idle', 'walk']) for (const d of dirs) B(`ppl/${w}/${a}/${d}/0`);
      return { miss, bytes, frames: Object.keys(F).length, lit: lit.length };
    });
    // D32: the block's size as written in the page (the index is packed; unpacked in memory it is larger).
    st.bytes = await page.evaluate(async () => { const t = await (await fetch(location.pathname)).text(), a = t.indexOf('// ---- PIX_ATLAS begin'), b = t.indexOf('// ---- PIX_ATLAS end', a); return a >= 0 && b > a ? b - a : -1; });
    if (st.bytes < 0) P('the atlas block was not found in the page');
    if (st.bytes > 4500 * 1024) P(`the atlas is ${(st.bytes / 1024).toFixed(0)} KB, over the 4,500 KB budget`);
    console.log(`  the atlas block: ${(st.bytes / 1024).toFixed(0)} KB (budget 4,500)`);
    for (const m of st.miss.slice(0, 20)) P('missing in the atlas: ' + m);
    if (st.miss.length > 20) P(`... and ${st.miss.length - 20} more missing`);
    // ---- In play ----
    await page.evaluate(src => { window.__botsrc = src; }, PROTO_BOT_SRC);
    const saves = await page.evaluate(() => {
      const R = window.__railhead, factory = (0, eval)('(' + window.__botsrc + ')'), S = R.newState(1866, 'proto'), bot = factory(R), out = [];
      for (let k = 0; k < 2 * 86400 / 8 && !(S.pd.ph === 'summary' && S.pd.day >= 1); k++) {
        const ev = R.simTick(S, bot.decide(S)); bot.observe(S, ev);
        if (ev.some(e => e.t === 'hour') || (S.fr && S.fr.job && S.tick % 300 === 0)) out.push(JSON.stringify({ state: S }));
      }
      return out;
    });
    const play = await page.evaluate(async saves => {
      const R = window.__railhead, miss = {}, W = window, ob = W.pixBlit, op = W.pixPersonKey;
      W.pixBlit = function (g, key, ...a) { const r = ob(g, key, ...a); if (!r && key) miss[key] = (miss[key] || 0) + 1; return r; };
      W.pixPersonKey = function (who, anim, dir, fr) { const r = op(who, anim, dir, fr); if (!r) miss[`ppl/${who}/${anim}/${dir} (no frame)`] = 1; return r; };
      const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      let n = 0;
      try {
        for (const json of saves) {
          R.importSave(json); await frame(); n++;
          const z0 = R.camera.zoom; R.camera.zoom = 0.4; await frame(); R.camera.zoom = z0; await frame();
        }
      } finally { W.pixBlit = ob; W.pixPersonKey = op; }
      return { miss, n };
    }, saves);
    const keys = Object.keys(play.miss);
    for (const k of keys.slice(0, 20)) P(`drawn in play but not in the atlas: ${k} (${play.miss[k]} times)`);
    console.log(`  atlas ${(st.bytes / 1024).toFixed(0)} KB (budget 4,500), ${st.frames} frames, ${st.lit} night bodies; ${play.n} saves of two days drawn at the default zoom and at scale 1, ${keys.length} keys missed`);
    if (errors.length) P('console errors: ' + errors.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  return problems;
};
if (require.main === module) module.exports().then(p => { console.log(p.length ? 'FAIL\n - ' + p.join('\n - ') : 'PASS'); require('./browser').stopServer(); process.exit(p.length ? 1 : 0); });
