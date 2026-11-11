// Stand-in data for the pixel renderer's D27 drawing (builder R): until P, F and W fill pbDrawList, pbPlayerPose,
// pbCutaway, frDrawList, frPose, frCartPose, frTruckPose, frDoorOpen and tfDrawList, these scenes put the agreed shapes
// (plans/d27-tech.md 3.2, 4.6, 5.3; the foundation's stubs in index.html) on the page's own functions (window.<name>),
// built on the foundation's debug scenarios (protoDebugScenario: d27coach 06:55 p1 standing; d27freight 08:30 f1
// standing; d27town 10:00; d27evening 20:30). Used by check-interiors.js, check-pixperf.js and their screenshots.
// Each scene: await scene(page, opts) -> facts about it (stock ids, positions).

// In the page: put the stand-ins on (keeping the originals once), and the helpers the scenes share.
const SETUP = () => {
  const W = window, R = W.__railhead;
  const names = ['pbDrawList', 'pbPlayerPose', 'pbCutaway', 'pbCoachView', 'frDrawList', 'frPose', 'frCartPose', 'frTruckPose', 'frDoorOpen', 'tfDrawList'];
  if (!W.__pixOrig) { W.__pixOrig = {}; for (const n of names) W.__pixOrig[n] = W[n]; }
  for (const n of names) W[n] = W.__pixOrig[n];
  W.__standin = {
    restore() { for (const n of names) W[n] = W.__pixOrig[n]; },
    load(hh, mm, svcs) {
      const st = R.rr.protoDebugScenario(R.newState(1866, 'proto'), hh, mm, svcs);
      R.importSave(JSON.stringify({ state: st }));
      try { R.pdui.closeBoard(); } catch (e) { /* no board */ }
      return R.state;
    },
    train(svc) { const S = R.state, run = S.rr.runs.find(q => q.svc === svc); return run ? S.trains[run.slot] : null; },
    poses(tr) { return R.trainPoses(R.state.track, tr).map((p, vi) => ({ ...p, vi, car: tr.consist[vi], hd: R.pix.pixHeading(p.yaw) })); },
    layout(k, hd) { return PIX_ATLAS.extra[`veh/${k}_in/${hd}/floor`].layout; },
    frames: () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
    WHO: ['man_top', 'woman_bonnet', 'man_bag', 'woman_shawl', 'child', 'man_bowler', 'worker', 'porter', 'man_top.b', 'woman_bonnet.b', 'man_bowler.b', 'woman_shawl.b', 'child.b', 'man_bag.b', 'worker.b', 'porter.b'],
  };
};

// The coach cut away with sitters: p1 standing, its middle coach cut away, 20 of its 29 seats taken (some holding
// their tickets up, half punched with the mark in the hatband), one traveller walking the aisle, one climbing the
// end steps, the agent in the aisle punching (facing across it); the other coaches hold seated through riders (hidden
// inside them); travellers waiting on platform 1 and on its benches.
async function coach(page, opts = {}) {
  await page.evaluate(SETUP);
  return page.evaluate(async (opts) => {
    const W = window, R = W.__railhead, X = W.__standin, S = X.load(opts.hh || 6, opts.mm === undefined ? 55 : opts.mm, opts.svcs || ['p1']), P = R.proto.PROTO;
    const tr = X.train(opts.svc || 'p1'), ps = X.poses(tr), coaches = ps.filter(p => p.k === 'coach'), c = coaches[Math.min(1, coaches.length - 1)];
    const lay = X.layout('coach', c.hd), list = [];
    let id = 500;
    lay.seats.forEach((q, i) => {
      if ((i * 7) % 10 >= (opts.full ? 10 : 4)) return;
      list.push({ id: id++, who: X.WHO[i % X.WHO.length], x: c.x + q.x, y: lay.floor, z: c.z + q.z, f: q.f, act: i % 5 === 2 ? 'sitTicket' : 'sit', stock: c.car.id, seat: i, punched: i % 2 === 0, through: i % 3 === 0 });
    });
    const s = c.hd === 'w' ? -1 : 1;
    list.push({ id: id++, who: 'woman_shawl', x: c.x + 2.2 * s, y: lay.floor, z: c.z + 0.1, f: c.hd === 'w' ? 'nw' : 'se', act: 'walk', stock: c.car.id });
    list.push({ id: id++, who: 'man_bag', x: c.x - 6.15 * s, y: 1.15, z: c.z - 1.9, f: 'sw', act: 'climb', stock: c.car.id });
    for (const o of coaches) if (o !== c) [[-2.7, -0.86], [1.3, 0.86], [-0.1, -1.56]].forEach(([dx, dz], k) => list.push({ id: id++, who: X.WHO[(k + 5) % 16], x: o.x + dx, y: 1.6, z: o.z + dz, f: o.hd === 'w' ? 'nw' : 'se', act: 'sit', stock: o.car.id, seat: k, punched: true, through: true }));
    const z1 = P.P1.z1;
    [[-3, 'sw'], [-1.5, 'se'], [4, 'ne']].forEach(([dx, f], k) => list.push({ id: id++, who: X.WHO[(k + 9) % 16], x: c.x + dx, y: P.DECK_Y, z: z1 - 1.2 - k * 0.6, f, act: 'wait' }));
    P.BENCHES.slice(2, 4).forEach((b, k) => list.push({ id: id++, who: X.WHO[(k + 3) % 16], x: b.x, y: P.DECK_Y, z: b.z + 0.25, f: 'sw', act: 'benchSit' }));
    const me = { x: c.x - 0.75 * s, y: lay.floor, z: c.z, f: 'ne', act: opts.act || 'punch', stock: c.car.id };
    W.pbDrawList = () => list;
    W.pbCutaway = () => [c.car.id];
    W.pbPlayerPose = () => me;
    S.player.in = { tr: tr.id, stock: c.car.id, s: me.x - c.x };
    R.pix.placePlayer(me.x, me.z);
    await X.frames(); await X.frames();
    return { tr: tr.id, stock: String(c.car.id), cx: c.x, cz: c.z, hd: c.hd, sitters: list.filter(q => q.stock === c.car.id && /sit/.test(q.act)).map(q => ({ id: q.id, x: q.x, z: q.z, f: q.f, seat: q.seat })), others: coaches.filter(o => o !== c).map(o => String(o.car.id)), n: list.length };
  }, opts);
}

// The boxcar being unloaded: f1 standing at track 3, a boxcar near the view with its north door open, goods on its
// floor cells (crates, sacks, a barrel, a bale, a keg), the agent just inside the door with a crate (F's carry step),
// the platform cart at the loading edge with goods on its cells (two layers), the hand truck tilted with a barrel.
async function freight(page, opts = {}) {
  await page.evaluate(SETUP);
  return page.evaluate(async (opts) => {
    const W = window, R = W.__railhead, X = W.__standin, S = X.load(8, 30, ['f1']), P = R.proto.PROTO;
    const tr = X.train('f1'), ps = X.poses(tr), cars = ps.filter(p => p.k === 'boxcar'), c = cars.slice().sort((a, b) => Math.abs(a.x - (opts.x || 0)) - Math.abs(b.x - (opts.x || 0)))[0];
    const lay = X.layout('boxcar', c.hd), C = lay.cells, s = c.hd === 'w' ? -1 : 1, goods = [];
    let id = 700;
    const cell = (ci, ri) => ({ x: c.x + s * (C.x0 + C.size * (ci + 0.5)), z: c.z + C.z0 + C.size * (ri + 0.5) });
    [['crate', 'dry', 0, 0, 0, 'store'], ['crate', 'tins', 0, 0, 1, 'store'], ['crate', 'linen', 1, 0, 0, 'hotel'], ['sack', 'flour', 0, 2, 0, 'store'], ['sack', 'seed', 0, 3, 0, 'feed'],
      ['barrel', 'whiskey', 8, 1, 0, 'saloon'], ['keg', 'beer', 9, 3, 0, 'saloon'], ['bale', null, 9, 0, 0, 'livery'], ['paper', null, 10, 2, 0, 'newspaper'], ['strongbox', null, 1, 3, 0, 'bank']]
      .forEach(([kind, variant, ci, ri, layer, tag]) => { const p = cell(ci, ri); goods.push({ id: id++, kind, variant, tag, x: p.x, y: 1.6 + layer * 0.55, z: p.z, rot: 0, place: 'car', stock: c.car.id, layer }); });
    goods.push({ id: id++, kind: 'crate', variant: 'dry', tag: 'store', place: 'hand' });
    const cart = { x: c.x + 3.2 * s, y: P.DOCK_Y, z: c.z - 4.4, f: 'se', held: false };
    [['crate', 'dry', 0, 0, 'store'], ['crate', 'dry', 0, 1, 'store'], ['sack', 'flour', 1, 0, 'store'], ['keg', 'beer', 2, 0, 'saloon'], ['paper', null, 3, 0, 'newspaper'], ['crate', 'tins', 1, 1, 'store'], ['sack', 'grain', 4, 0, 'out'], ['crate', 'linen', 5, 0, 'hotel']]
      .forEach(([kind, variant, cellN, layer, tag]) => goods.push({ id: id++, kind, variant, tag, place: 'cart', cell: cellN % 8, layer: cellN >= 8 ? 1 : layer }));
    const truck = { x: c.x - 3.5 * s, y: P.DOCK_Y, z: c.z - 4.0, f: 'nw', tilt: true, held: false };
    goods.push({ id: id++, kind: 'barrel', variant: 'whiskey', tag: 'saloon', place: 'truck' });
    W.frDrawList = () => goods;
    W.frDoorOpen = (st, stock) => String(stock) === String(c.car.id) ? 1 : 0;
    W.frCartPose = () => cart;
    W.frTruckPose = () => truck;
    const me = { x: c.x + 0.4 * s, z: c.z - 1.3 };
    W.frPose = () => ({ verb: opts.verb || 'carry', phase: opts.phase || 'walk', prog: opts.prog === undefined ? 0.5 : opts.prog, f: opts.f || 'ne' });
    R.pix.placePlayer(me.x, me.z);
    await X.frames(); await X.frames();
    return { tr: tr.id, stock: String(c.car.id), cx: c.x, cz: c.z, hd: c.hd, goods: goods.length };
  }, opts);
}

// The cargo platform: the storage cells stacked (each shop's row with its kinds, the OUT rows), the cart on the cart
// lane loaded, the agent rolling a barrel (or carrying a sack on his shoulder: opts.verb).
async function cargo(page, opts = {}) {
  await page.evaluate(SETUP);
  return page.evaluate(async (opts) => {
    const W = window, R = W.__railhead, X = W.__standin, S = X.load(opts.hh || 9, 45, opts.svcs || ['f1']), P = R.proto.PROTO, D = R.d27, goods = [];
    let id = 800;
    const K = { store: [['crate', 'dry'], ['sack', 'flour'], ['crate', 'tins']], hotel: [['furniture', null], ['crate', 'linen'], ['keg', 'beer']], bank: [['strongbox', null]], smithy: [['ironBars', null], ['wheel', null], ['keg', 'beer']],
      livery: [['bale', null]], feed: [['sack', 'seed'], ['plough', null]], saloon: [['barrel', 'whiskey'], ['keg', 'beer'], ['piano', null]], newspaper: [['paper', null]],
      barber: [['crate', 'dry']], undertaker: [['lumber', null]], assay: [['sack', 'ore']] };
    const G = R.d27.GOODS27 || {};
    for (const sh of R.d27.SHOPS27 || []) {
      const ks = K[sh.id] || [];
      for (let c = sh.row.c0, n = 0; c <= sh.row.c1 && ks.length; c++, n++) {
        const [kind, variant] = ks[n % ks.length], g = G[kind] || { stack: 1, size: [0.8, 0.6, 0.55], cells: 1 };
        if (g.cells > 2 && n % 3) continue;
        const hgt = Math.min(g.stack, 1 + ((c * 7 + sh.row.r) % 4)), p = D.storeCellAt(sh.row.block, c, sh.row.r);
        for (let l = 0; l < hgt; l++) goods.push({ id: id++, kind, variant, tag: sh.id, x: p.x, y: p.y + l * g.size[2], z: p.z, rot: g.cells > 1 ? 0 : 0, place: 'cell', layer: l });
      }
    }
    for (const row of R.d27.STORE27_OUT || []) for (let c = row.c0; c <= Math.min(row.c1, row.c0 + 3); c++) { const p = D.storeCellAt(row.block, c, row.r); goods.push({ id: id++, kind: c % 2 ? 'sack' : 'hides', variant: c % 2 ? 'grain' : null, tag: 'out', x: p.x, y: p.y, z: p.z, place: 'cell', layer: 0 }); }
    const L = P.CART_LANE, cart = { x: opts.cx || 4, y: P.DOCK_Y, z: (L.z0 + L.z1) / 2, f: 'se', held: false };
    [0, 1, 2, 3, 4, 5].forEach(k => goods.push({ id: id++, kind: ['crate', 'sack', 'keg', 'crate', 'paper', 'sack'][k], variant: ['dry', 'seed', 'beer', 'tins', null, 'flour'][k], tag: ['store', 'feed', 'saloon', 'store', 'newspaper', 'store'][k], place: 'cart', cell: k, layer: 0 }));
    goods.push({ id: id++, kind: opts.held || 'barrel', variant: opts.held ? null : 'whiskey', tag: 'saloon', place: 'hand' });
    W.frDrawList = () => goods;
    W.frCartPose = () => cart;
    W.frTruckPose = () => null;
    W.frDoorOpen = () => 0;
    W.frPose = () => ({ verb: opts.verb || 'roll', phase: 'walk', prog: 0.3, f: opts.f || 'se' });
    R.pix.placePlayer(opts.px === undefined ? -2 : opts.px, opts.pz === undefined ? 12.4 : opts.pz);
    await X.frames(); await X.frames();
    return { goods: goods.length };
  }, opts);
}

// The street with townsfolk: 16 of them on the boardwalks and the street (walking, standing at doors on both rows,
// talking in pairs, one on a bench), goods out at shops' pickup spots on both rows, the agent on the street. opts.night:
// at 21:30 (lamps and windows lit).
async function town(page, opts = {}) {
  await page.evaluate(SETUP);
  return page.evaluate(async (opts) => {
    const W = window, R = W.__railhead, X = W.__standin, S = X.load(opts.night ? 21 : 10, opts.night ? 30 : 0, []), P = R.proto.PROTO, ST = P.STREET;
    const who = ['banker', 'hotelkeeper', 'vaquero', 'printer', 'barber', 'sheriff', 'undertaker', 'preacher', 'teacher', 'launderer', 'storekeeper', 'smith', 'barkeep', 'cowhand', 'cowhand.b', 'storekeeper.b'];
    const shops = R.d27.SHOPS27, list = [];
    who.forEach((w, i) => {
      const sh = shops[i % shops.length], k = i % 4;
      if (k === 0) list.push({ id: 't' + i, who: w, x: sh.door.x, y: sh.doorY, z: sh.door.z + 0.6, f: sh.side === 'W' ? 'se' : 'nw', act: 'idle' });
      else if (k === 1) list.push({ id: 't' + i, who: w, x: (i % 2 ? -3 : 3), z: sh.lot - 4 + (i % 3), f: i % 2 ? 'ne' : 'sw', act: 'walk', frame: i % 4 });
      else if (k === 2) { list.push({ id: 't' + i, who: w, x: sh.door.x + (sh.side === 'W' ? 0.2 : -0.2), y: sh.doorY, z: sh.lot + 2.5, f: 'ne', act: 'talk' }); }
      else list.push({ id: 't' + i, who: w, x: sh.side === 'W' ? -8.2 : 8.2, y: sh.doorY, z: sh.lot - 3, f: sh.side === 'W' ? 'nw' : 'se', act: i === 3 ? 'benchSit' : 'talk' });
    });
    const goods = [];
    let id = 900;
    for (const sh of shops.filter(q => (q.sends || []).length)) (sh.sends || []).forEach((k, n) => goods.push({ id: id++, kind: k, tag: 'out', x: sh.pickup.x + (sh.side === 'W' ? -0.5 : 0.5), y: sh.doorY, z: sh.pickup.z + n * 1.1, place: 'shop', shop: sh.id }));
    W.tfDrawList = () => list;
    W.frDrawList = () => goods;
    W.frPose = () => null; W.frCartPose = () => null; W.frTruckPose = () => null;
    R.pix.placePlayer(opts.px === undefined ? 1.5 : opts.px, opts.pz === undefined ? -60 : opts.pz);
    await X.frames(); await X.frames();
    return { folk: list.length, goods: goods.length };
  }, opts);
}

// The busiest station moment (plans/d27-tech.md 10.1): p2 at platform 1 with a coach cut away mid-punch (the coach
// scene), f1 standing at track 3 with a boxcar's door open and goods in it, the storage cells stacked, the cart loaded
// at the loading edge.
async function busy(page, opts = {}) {
  const c = await coach(page, { hh: 9, mm: 45, svcs: ['p2', 'f1'], svc: 'p2', ...opts });
  const f = await page.evaluate(async () => {
    const W = window, R = W.__railhead, X = W.__standin, P = R.proto.PROTO, D = R.d27, goods = [];
    const tr = X.train('f1'), c = X.poses(tr).filter(p => p.k === 'boxcar').sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0], lay = X.layout('boxcar', c.hd), C = lay.cells, s = c.hd === 'w' ? -1 : 1;
    let id = 1200;
    for (let k = 0; k < 14; k++) goods.push({ id: id++, kind: ['crate', 'sack', 'keg', 'barrel', 'paper'][k % 5], tag: ['store', 'feed', 'saloon', 'saloon', 'newspaper'][k % 5], x: c.x + s * (C.x0 + C.size * ((k % 7) + 2.5)), y: 1.6, z: c.z + C.z0 + C.size * (Math.floor(k / 7) + 0.5), place: 'car', stock: c.car.id });
    for (const B of Object.keys(P.STORE)) for (let r = 0; r < P.STORE[B].nr; r++) for (let q = 0; q < P.STORE[B].nc; q += 1) {
      if ((q + r) % 3 === 2) continue;
      const p = D.storeCellAt(B, q, r), n = 1 + ((q * 5 + r * 3) % 3);
      for (let l = 0; l < n; l++) goods.push({ id: id++, kind: ['crate', 'sack', 'paper'][(q + r) % 3], tag: ['store', 'feed', 'newspaper'][(q + r) % 3], x: p.x, y: p.y + l * 0.5, z: p.z, place: 'cell', layer: l });
    }
    for (let k = 0; k < 8; k++) goods.push({ id: id++, kind: k % 2 ? 'sack' : 'crate', tag: 'store', place: 'cart', cell: k, layer: 0 });
    W.frDrawList = () => goods;
    W.frDoorOpen = (st, stock) => String(stock) === String(c.car.id) ? 1 : 0;
    W.frCartPose = () => ({ x: c.x + 3 * s, y: P.DOCK_Y, z: c.z - 4.2, f: 'se', held: false });
    await X.frames();
    return { goods: goods.length, stock: String(c.car.id) };
  });
  return { ...c, freight: f };
}

module.exports = { SETUP, coach, freight, cargo, town, busy };
