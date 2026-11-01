// Check: switches and trains, run in the game's own simulation (no drawing involved).
// - Sent to the passing siding, the train finds the way, sets the switch and stops at the spot.
// - A switch with a train on it refuses to move.
// - Changing a switch changes where a running train goes; at a dead end it stops 0.5u short.
// - A switch set against a train makes it wait 0.5u before the switch's block, and go on once thrown.
// - The player walks to a switch stand and throws it.
// Regression checks for the piece 1 review and play-test:
// - Route locks are freed on arrival over a switch and on Stop mid-route (switches under the train
//   stay locked only while the train is on them).
// - A stopping train still stops 0.5u before a switch set against it.
// - A moving train never reverses at once (Forward/Back or Send to); bad Send-to spots are refused.
// - The player only throws a switch from within reach; letting go of a hold does not cancel a throw;
//   a walk to beyond the map edge ends.

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
      out.sidingDir = tr.m;
      out.locksAfterArrival = T.switches.map(W => W.lockedBy);
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

      // 6. Arrival over a switch: once the train has moved off it, the switch can be thrown again.
      {
        const st = R.newState(1), T6 = st.track;
        const sid = T6.edges.find(E => E.k === 'S' && E.cls === 'yard' && T6.nodes[E.a].z > 17 && T6.nodes[E.b].z > 17);
        runUntil(st, [{ t: 'trainSendTo', tr: 0, e: sid.id, s: Math.round(sid.len / 2 * 1000) }], 20000, (x, e) => e.some(v => v.t === 'trainArrived'));
        const under = Object.keys(R.occupiedSwitches(st)).map(Number);
        runUntil(st, [{ t: 'trainRun', tr: 0, dir: st.trains[0].m }], 3000, (x) => under.every(sw => R.occupiedSwitches(x)[sw] === undefined));
        R.simTick(st, [{ t: 'trainStop', tr: 0 }]); runUntil(st, [], 100);
        out.arriveUnder = under;
        out.arriveFreed = under.map(sw => R.switchLockReason(st, sw));
      }
      // 7. Stop mid-route while over a switch: no lock is left behind once the train is off it.
      {
        const st = R.newState(1), T7 = st.track;
        const sid = T7.edges.find(E => E.k === 'S' && E.cls === 'yard' && T7.nodes[E.a].z > 17 && T7.nodes[E.b].z > 17);
        runUntil(st, [{ t: 'trainSendTo', tr: 0, e: sid.id, s: Math.round(sid.len / 2 * 1000) }], 5000, (x) => Object.keys(R.occupiedSwitches(x)).length > 0);
        const under = Object.keys(R.occupiedSwitches(st)).map(Number);
        R.simTick(st, [{ t: 'trainStop', tr: 0 }]); runUntil(st, [], 100);
        out.stopLocks = T7.switches.map(W => W.lockedBy);
        runUntil(st, [{ t: 'trainRun', tr: 0, dir: st.trains[0].m }], 3000, (x) => under.every(sw => R.occupiedSwitches(x)[sw] === undefined));
        R.simTick(st, [{ t: 'trainStop', tr: 0 }]); runUntil(st, [], 100);
        out.stopUnder = under;
        out.stopFreed = under.map(sw => R.switchLockReason(st, sw));
      }
      // 8. Stop pressed just before a switch set against the train: it still stops 0.5u short.
      {
        const st = R.newState(1), t8 = st.trains[0];
        t8.front = { e: 2, s: 0, d: 1 }; t8.v = 4; t8.mode = 'run'; st.track.switches[1].state = 'R';
        for (let k = 0; k < 200 && 14 - 0.5 - t8.front.s >= 2.0; k++) R.simTick(st, []);
        R.simTick(st, [{ t: 'trainStop', tr: 0 }]); runUntil(st, [], 60);
        out.stopModeGap = st.track.edges[t8.front.e].len - t8.front.s;
        out.stopModeEdge = t8.front.e;
        out.stopModeOcc = Object.keys(R.occupiedSwitches(st)).length;
      }
      // 9. No instant reversal: Back while running forward brakes to a stop, then goes back.
      {
        const st = R.newState(1), t9 = st.trains[0];
        runUntil(st, [{ t: 'trainRun', tr: 0, dir: 1 }], 60);
        out.revV0 = t9.v;
        R.simTick(st, [{ t: 'trainRun', tr: 0, dir: -1 }]);
        out.revMAfter1 = t9.m;
        let flipV = null, flipped = false;
        for (let k = 0; k < 400 && !flipped; k++) { R.simTick(st, []); if (t9.m < 0) { flipped = true; flipV = t9.v; } }
        out.revFlipped = flipped; out.revFlipV = flipV;
        runUntil(st, [], 30);
        out.revMovesBack = t9.m < 0 && t9.v > 0;
        // Send to while moving: a target just behind the train is reached forward, round the loop, never by reversing.
        const st2 = R.newState(1);
        runUntil(st2, [{ t: 'trainRun', tr: 0, dir: 1 }], 60);
        R.simTick(st2, [{ t: 'trainSendTo', tr: 0, e: 2, s: 2000 }]);
        out.sendMovingM = st2.trains[0].m; out.sendMovingMode = st2.trains[0].mode;
        // A spot beyond the end of the edge is refused.
        const st3 = R.newState(1);
        const e3 = R.simTick(st3, [{ t: 'trainSendTo', tr: 0, e: 2, s: 999999 }]);
        out.badSpotRefused = e3.some(x => x.t === 'noRoute') && st3.trains[0].mode === 'idle';
      }
      // 10. Throw only within reach: with a train between the player and the stand, and the stand walled off
      //     (a ring of blocked walk-grid cells 2u to 2.6u round it, so path-finding cannot go round), the
      //     walk ends short; no throw. (Walking round a train to a stand is in check-paths.js.)
      {
        const st = R.newState(1), W = st.track.switches[0];
        st.trains[0].front = { e: 0, s: 7.8, d: 1 };
        st.player.x = W.stand.ux; st.player.z = 14 + (14 - W.stand.uz);
        const G = walkGrid(st.track);
        for (let i = 0; i < G.cost.length; i++) { const [x, z] = walkCentre(i), d = Math.hypot(x - W.stand.x, z - W.stand.z); if (d >= 2 && d <= 2.6) G.cost[i] = 0; }
        const e10 = runUntil(st, [{ t: 'useSwitch', sw: 0 }], 200);
        out.farThrow = e10.some(x => x.t === 'switchThrown');
        out.farBlocked = e10.some(x => x.t === 'blocked');
      }
      // 11. Letting go of a hold (walkDir null) during a throw does not cancel it.
      {
        const st = R.newState(1);
        runUntil(st, [{ t: 'useSwitch', sw: 0 }], 400, (x) => !!x.player.act);
        const e11 = runUntil(st, [{ t: 'walkDir', a: null }], 20);
        out.throwSurvivesRelease = e11.some(x => x.t === 'switchThrown');
      }
      // 13. Tapping the train from beyond its end: with the camera on the north side (view code 32),
      //     the player ends up further north (towards the camera) than with no view given.
      {
        const endZ = (view) => {
          const st = R.newState(1); st.player.x = -10.5; st.player.z = 11.2;
          runUntil(st, [{ t: 'useTrain', tr: 0, view }], 200, (x, e) => e.some(v => v.t === 'reachedTrain'));
          return st.player.z;
        };
        out.sideNoView = endZ(undefined); out.sideCamera = endZ(32);
      }
      // 12. A walk towards a point beyond the map edge ends at the edge.
      {
        const st = R.newState(1);
        runUntil(st, [{ t: 'walkTo', x: 1000000, z: 1120 }], 3000, (x) => x.player.mode === 'idle' && x.tick > 1);
        out.edgeWalkEnded = st.player.mode === 'idle';
      }
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
    if (r.sidingDir !== 1) problems.push('Send to the siding chose the slow tender-first route over the forward one');
    if (r.locksAfterArrival.some(x => x !== null)) problems.push('route locks left after arrival: ' + JSON.stringify(r.locksAfterArrival));
    if (!r.arriveUnder.length) problems.push('expected the siding arrival to end over a switch');
    if (r.arriveFreed.some(x => x !== null)) problems.push('after arriving over a switch and moving off, it stayed locked: ' + JSON.stringify(r.arriveFreed));
    if (r.stopLocks.some(x => x !== null)) problems.push('route locks left after Stop mid-route: ' + JSON.stringify(r.stopLocks));
    if (!r.stopUnder.length) problems.push('expected the stopped train to be over a switch');
    if (r.stopFreed.some(x => x !== null)) problems.push('after Stop mid-route and moving off, a switch stayed locked: ' + JSON.stringify(r.stopFreed));
    if (r.stopModeEdge !== 2 || r.stopModeGap < 0.5 - 1e-6 || r.stopModeOcc) problems.push(`a braking train ran past the stopping point (edge ${r.stopModeEdge}, gap ${r.stopModeGap})`);
    if (!(r.revV0 > 0.5) || r.revMAfter1 !== 1 || !r.revFlipped || r.revFlipV !== 0 || !r.revMovesBack) problems.push('Back while running forward did not brake to a stop first: ' + JSON.stringify([r.revV0, r.revMAfter1, r.revFlipped, r.revFlipV, r.revMovesBack]));
    if (r.sendMovingM !== 1 || r.sendMovingMode !== 'route') problems.push(`Send to while moving reversed the train or failed (m ${r.sendMovingM}, mode ${r.sendMovingMode})`);
    if (!r.badSpotRefused) problems.push('Send to a spot beyond the end of an edge was not refused');
    if (r.farThrow || !r.farBlocked) problems.push('the player threw a switch from beyond reach, or no "blocked" message came');
    if (!r.throwSurvivesRelease) problems.push('letting go of a hold cancelled a switch throw');
    if (!(r.sideCamera > r.sideNoView + 0.5)) problems.push(`tapping the train did not prefer the camera's side (z ${r.sideCamera} vs ${r.sideNoView})`);
    if (!r.edgeWalkEnded) problems.push('a walk towards a point beyond the map edge never ended');
    if (/\d/.test(r.againstStatus)) problems.push('status names a switch number: ' + r.againstStatus);
    if (errors.length) problems.push('console errors: ' + errors.join(' | '));
    console.log(`  siding run: arrived after ${r.ticks} ticks, stopped ${r.stopError.toFixed(3)}u from target; dead-end gap ${r.endGap.toFixed(3)}u; player threw switch at tick ${r.throwTicks}`);
    return problems;
  } finally { await browser.close(); }
};
