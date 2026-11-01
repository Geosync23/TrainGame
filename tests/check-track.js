// Check: the track graph. The test yard passes the validator (exact arcs, smooth joints,
// switch shape, curve radius, straights between reverse curves), and the validator does
// catch broken track.

const { openGame } = require('./browser');

module.exports = async function checkTrack() {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused&world=yard' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, out = {};
      const T = R.newState(1).track;
      out.yard = R.trackValidate(T);
      out.counts = { nodes: T.nodes.length, edges: T.edges.length, switches: T.switches.length };
      // Arc lengths are exact: walking an arc's full length lands exactly on its end node.
      out.arcEnds = T.edges.filter(E => E.k === 'A').map(E => {
        const p = R.edgeAt(T, E, E.len), B = T.nodes[E.b];
        return Math.hypot(p.x - B.x, p.z - B.z);
      });
      // Broken track 1: a main-line curve tighter than the 12u minimum.
      const T1 = R.trackNew(); const a = R.trackNode(T1, 0, 0);
      R.trackArc(T1, a, 1, 0, 6, 1, 45, 'main', 4);
      out.badRadius = R.trackValidate(T1);
      // Broken track 2: a corner (two straights meeting at an angle).
      const T2 = R.trackNew(); const p = R.trackNode(T2, 0, 0), q = R.trackNode(T2, 10, 0), w = R.trackNode(T2, 15, 5);
      R.trackStraight(T2, p, q, 'main', 4); R.trackStraight(T2, q, w, 'main', 4);
      out.corner = R.trackValidate(T2);
      // Broken track 3: reverse curves with no straight between them.
      const T3 = R.trackNew(); const s0 = R.trackNode(T3, 0, 0);
      const c1 = R.trackArc(T3, s0, 1, 0, 15, 1, 20, 'main', 4);
      R.trackArc(T3, c1.node, c1.hx, c1.hz, 15, -1, 20, 'main', 4);
      out.reverse = R.trackValidate(T3);
      return out;
    });
    const problems = [];
    if (r.yard.length) problems.push('test yard is not valid: ' + r.yard.join('; '));
    if (r.counts.switches !== 3) problems.push(`expected 3 switches, found ${r.counts.switches}`);
    if (r.arcEnds.some(d => d > 1e-9)) problems.push('an arc does not end exactly on its node');
    if (!r.badRadius.some(e => /radius/.test(e))) problems.push('validator missed a curve below the minimum radius');
    if (!r.corner.some(e => /smoothly/.test(e))) problems.push('validator missed a sharp corner');
    if (!r.reverse.some(e => /reverse curves/.test(e))) problems.push('validator missed reverse curves with no straight');
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    console.log(`  yard: ${r.counts.nodes} nodes, ${r.counts.edges} edges, ${r.counts.switches} switches`);
    return problems;
  } finally { await browser.close(); }
};
