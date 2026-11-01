// Check: switches and trains, run in the game's own simulation (no drawing involved).
// - Sent to the passing siding, the train finds the way, sets the switch and stops at the spot.
// - A switch with a train on it refuses to move.
// - Changing a switch changes where a running train goes; at a dead end it stops 0.5u short.
// - A switch set against a train makes it wait 0.5u before the switch's block, and go on once thrown.
// - The player walks to a switch stand and throws it.

const { openGame } = require('./browser');

module.exports = async function checkTrains() {
  const { browser, page, errors } = await openGame('portrait', { query: '?paused' });
  try {
    const r = await page.evaluate(() => {
      const R = window.__railhead, out = {};
      const runUntil = (S, cmds, maxTicks, stopWhen) => {
        const evs = [];
        for (let i = 0; i < maxTicks; i++) {
          const e = R.simTick(S, i === 0 ? cmds : []);
          evs.push(...e);
          if (stopWhen && stopWhen(S, e)) break;
        }
        return evs;
      };
      const posXZ = (S, p) => R.edgeAt(S.track, S.track.edges[p.e], p.s);

      // 1. Send to the middle of the siding.
      let S = R.newState(1);
      const T = S.track;
      const siding = T.edges.find(E => E.k === 'S' && E.cls === 'yard' && T.nodes[E.a].z > 17 && T.nodes[E.b].z > 17);
      const target = { e: siding.id, s: siding.len / 2 };
      const evs = runUntil(S, [{ t: 'trainSendTo', tr: 0, e: target.e, s: Math.round(target.s * 1000) }], 20000,
        (st, e) => e.some(x => x.t === 'trainArrived'));
      const tr = S.trains[0];
      out.arrived = evs.some(x => x.t === 'trainArrived');
      out.noRoute = evs.filter(x => x.t === 'noRoute').map(x => x.why);
      const lead = tr.m > 0 ? tr.front : R.trackWalk(T, { e: tr.front.e, s: tr.front.s, d: -tr.front.d }, R.trainLength(tr)).pos;
      const a = posXZ(S, lead), b = R.edgeAt(T, siding, target.s);
      out.stopError = Math.hypot(a.x - b.x, a.z - b.z);
      out.ticks = S.tick;
      // 2. A switch under the train is locked.
      const occ = R.occupiedSwitches(S);
      const occIds = Object.keys(occ).map(Number);
      out.occupied = occIds;
      if (occIds.length) {
        const sw = occIds[0], before = T.switches[sw].state;
        const e2 = R.simTick(S, [{ t: 'throwSwitch', sw }]);
        out.lockEvent = e2.some(x => x.t === 'switchLocked' && x.sw === sw);
        out.lockKept = T.switches[sw].state === before;
      }

      // 3. Changing switch 3 (id 2) changes the path of a train running forward.
      const spurIds = (st) => {
        const T3 = st.track, W = T3.switches[2], ids = new Set([W.reverse]);
        // Every edge reachable from the diverging leg without passing back through the switch node.
        let grew = true;
        while (grew) { grew = false; for (const E of T3.edges) if (!ids.has(E.id) && E.a !== W.node && E.b !== W.node && [...ids].some(i => { const O = T3.edges[i]; return O.a === E.a || O.a === E.b || O.b === E.a || O.b === E.b; })) { ids.add(E.id); grew = true; } }
        return ids;
      };
      S = R.newState(1);
      const spur = spurIds(S);
      let enteredSpur = false;
      runUntil(S, [{ t: 'trainRun', tr: 0, dir: 1 }], 1500, (st) => { if (spur.has(st.trains[0].front.e)) enteredSpur = true; return false; });
      out.normalAvoidsSpur = !enteredSpur;
      S = R.newState(1);
      S.track.switches[2].state = 'R';
      runUntil(S, [{ t: 'trainRun', tr: 0, dir: 1 }], 3000, (st) => st.trains[0].v === 0 && st.tick > 50);
      const tr3 = S.trains[0];
      out.reverseInSpur = spur.has(tr3.front.e);
      out.spurStatus = tr3.status;
      const endEdge = S.track.edges[tr3.front.e];
      out.endGap = tr3.front.d > 0 ? endEdge.len - tr3.front.s : tr3.front.s;

      // 4. Switch set against: switch 2 (id 1) reversed; the train coming from its through leg waits.
      S = R.newState(1);
      S.track.switches[1].state = 'R';
      runUntil(S, [{ t: 'trainRun', tr: 0, dir: 1 }], 1000, (st) => st.trains[0].v === 0 && st.tick > 20);
      // The train must wait before the switch's block: 0.5u short of the far end of the through leg.
      const W1 = S.track.switches[1], leg = S.track.edges[W1.normal];
      const n1 = S.track.nodes[leg.a === W1.node ? leg.b : leg.a], f = posXZ(S, S.trains[0].front);
      out.againstGap = Math.hypot(f.x - n1.x, f.z - n1.z);
      out.againstStatus = S.trains[0].status;
      // Throwing it back lets the train go on.
      R.simTick(S, [{ t: 'throwSwitch', sw: 1 }]);
      runUntil(S, [], 60);
      out.movesAfterThrow = S.trains[0].v > 0;

      // 5. The player walks to switch 1 and throws it.
      S = R.newState(1);
      const evs5 = runUntil(S, [{ t: 'useSwitch', sw: 0 }], 400, (st, e) => e.some(x => x.t === 'switchThrown'));
      out.playerThrew = evs5.some(x => x.t === 'switchThrown' && x.sw === 0) && S.track.switches[0].state === 'R';
      out.throwTicks = S.tick;
      return out;
    });
    const problems = [];
    if (!r.arrived) problems.push('train sent to the siding did not arrive ' + JSON.stringify(r.noRoute));
    if (!(r.stopError < 0.5)) problems.push(`train stopped ${r.stopError.toFixed(3)}u from the target (limit 0.5u)`);
    if (!r.occupied.length) problems.push('expected the train on the siding to be standing on a switch');
    else if (!r.lockEvent || !r.lockKept) problems.push('a switch under the train could be thrown');
    if (!r.normalAvoidsSpur) problems.push('with switch 3 straight, the train went into the spur');
    if (!r.reverseInSpur) problems.push('with switch 3 turned, the train did not go into the spur');
    if (!(Math.abs(r.endGap - 0.5) < 0.05)) problems.push(`at the dead end the train stopped ${r.endGap.toFixed(3)}u short (expected 0.5u)`);
    if (!(Math.abs(r.againstGap - 0.5) < 0.05)) problems.push(`at a switch set against it the train stopped ${r.againstGap.toFixed(3)}u short (expected 0.5u)`);
    if (!/set against/.test(r.againstStatus)) problems.push('status did not say the switch is set against: ' + r.againstStatus);
    if (!r.movesAfterThrow) problems.push('train did not move on after the switch was thrown back');
    if (!r.playerThrew) problems.push('the player did not walk to switch 1 and throw it');
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    console.log(`  siding run: arrived after ${r.ticks} ticks, stopped ${r.stopError.toFixed(3)}u from target; dead-end gap ${r.endGap.toFixed(3)}u; player threw switch at tick ${r.throwTicks}`);
    return problems;
  } finally { await browser.close(); }
};
