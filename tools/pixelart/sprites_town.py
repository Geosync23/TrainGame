# Sprite module: the station depot and canopy, the storage shed, the three shops (in three facings, split into
# parts for depth sorting), houses, church, water tower, trees, props, goods and tags, the handcart, platform
# tiles, the plank walkway and ground tiles. Owner: the buildings-and-town artist. Drawing code: town.py.
# Names follow the D25 sprite contract (plans/proto-sprites.md): bld/..., goods/..., tag/..., cart/<dir>.
import math
import town as TW
import engine as E
import harness as H
import numpy as np
from engine import box, hash2, new_oid
from registry import one as _one


def _pad(frames):
    """Grow a frame with clear pixels so its anchor lies inside it (a part of a building can sit away from the
    building's centre)."""
    out = []
    for img, (ax, ay) in frames:
        h, w = img.shape[:2]
        l, t = max(0, -ax), max(0, -ay)
        r, b = max(0, ax + 1 - w), max(0, ay + 1 - h)
        if l or t or r or b:
            img = np.pad(img, ((t, b), (l, r), (0, 0)))
            ax, ay = ax + l, ay + t
        out.append((img, (ax, ay)))
    return out


def one(draw, **kw):
    return _pad(_one(draw, **kw))

U = TW.U
CENTRE = 'the footprint centre at ground level (y = 0)'
NOSHADOW = dict(shadows=True)          # static things: self-shadowing only; their ground shadows are in the ground layer
MOVE_SH = (-30, -30, 40, 30)           # movable things keep a small contact shadow (translucent, see the pipeline)
FLAT = dict(outline=False, shadows=False)

# Contract facings for the shops. Shops face the street (x -3.2..3.2): the store and smithy stand west of it and
# face +x ('e'); the saloon stands east of it and faces -x ('w', seen from behind). 's' (front towards +z) is an
# extra so a shop can also stand along an east-west street.
LAYOUT_FACING = {'store': 'e', 'smithy': 'e', 'saloon': 'w'}
CART_DIRS = {'se': 'e', 'ne': 'n', 'sw': 's', 'nw': 'w'}


def _box_u(F, a0, b0, a1, b1, h):
    x0, z0, x1, z1 = F.rect_w(a0, b0, a1, b1)
    return [round(x0 / U, 3), round(z0 / U, 3), round(x1 / U, 3), round(z1 / U, 3), round(h / TW.UY, 3)]


GAME_KEYS = ('board', 'box', 'door', 'dressing', 'parts', 'facing', 'front', 'cartSlots', 'pusher', 'tag_at', 'bays', 'footprint',
             'underside', 'height', 'top_px')


class _Game:
    """Moves the fields the game needs (board areas, part boxes, door spots, cart slots ...) into meta['extra'],
    which build.py puts into PIX_ATLAS.extra[key]; the rest stays as notes in atlas.json."""
    def __init__(self, reg):
        self.reg = reg

    def add(self, name, group, frames, meta=None):
        meta = dict(meta or {})
        extra = {k: meta.pop(k) for k in GAME_KEYS if k in meta}
        if extra:
            meta['extra'] = extra
        self.reg.add(name, group, frames, meta)


def register(reg):
    reg = _Game(reg)
    # ---------------- station ----------------
    img = one(TW.station, after=lambda: (TW.station_name(), TW.station_board_rows()), **NOSHADOW)
    ax, ay = img[0][1]
    reg.add('bld/station', 'town_station', img,
            dict(anchor=CENTRE, footprint=[12, 5.5], height=4.9, front='+z (platform 1)',
                 board=TW.station_board_area(ax, ay), deck_mu=TW.DECK,
                 note='board-and-batten depot on a plinth at deck height; ticket window kept as decoration; '
                      'the RAILHEAD name board is on the +x end'))
    reg.add('bld/canopy', 'town_station', one(TW.canopy, **NOSHADOW),
            dict(anchor=CENTRE, footprint=[16, 4], underside=2.6, note='posts every 3.75 u along both long edges'))
    reg.add('bld/storage', 'town_station', one(lambda: TW.storage(False), **NOSHADOW),
            dict(anchor=CENTRE, footprint=[10, 2.4], height=3.2, doors='+z side (track 3): four freight doors, one per bay',
                 bays=[round((-TW.STORAGE['a'] + d0 + TW.STORAGE_DW / 2) / U, 3) for d0 in TW.STORAGE_BAYS],
                 bays_note='x of each door centre, u from the anchor; the door sill is at z = +1.2 u'))
    reg.add('bld/storage_open', 'town_station', one(lambda: TW.storage(True), **NOSHADOW),
            dict(anchor=CENTRE, footprint=[10, 2.4], note='the same shed with its doors slid open: shelves of goods'))
    img = one(TW.schedboard, **NOSHADOW)
    ax, ay = img[0][1]
    reg.add('bld/schedboard', 'town_station', img, dict(anchor='between the two posts at ground level', footprint=[2.4, 0.3],
                                                      board=TW.schedboard_area(ax, ay)))
    # ---------------- footbridges (platform 1 over tracks 1 and 2 to platform 2) ----------------
    FBA = 'the bridge anchor: x = the bridge centre line, z = 0 (track 2), ground level; draw every part there'
    boxes = TW.footbridge_boxes()
    parts = {'deck': TW.footbridge_deck, 'rail': TW.footbridge_rail}
    for k in range(3):
        parts[f'bent{k}'] = (lambda k=k: TW.footbridge_bent(k))
    for plat in ('p1', 'p2'):
        for d in ('e', 'w'):
            parts[f'stair_{plat}_{d}'] = (lambda p=plat, d=d: TW.footbridge_stair(p, d))
            parts[f'stair_{plat}_{d}_rail'] = (lambda p=plat, d=d: TW.footbridge_stair_rail(p, d))
    notes = {'deck': 'the span with its floor and far railing; walkers on it are drawn at walk_y',
             'rail': 'the near (+x) railing of the span: draw it after walkers on the deck',
             'bent0': 'trestle bent on platform 1', 'bent1': 'thin post pair at z -2.0 between tracks 1 and 2 '
                                                             '(0.85 u clear of each train)',
             'bent2': 'trestle bent on platform 2'}
    for nm, fn in parts.items():
        ex = dict(boxes[nm])
        bx = ex.pop('box')
        note = notes.get(nm, 'stair flight ' + nm[6:8] + (' near handrail' if nm.endswith('_rail') else '') +
                         ', running down towards ' + ('+x' if '_e' in nm else '-x'))
        reg.add(f'bld/footbridge/{nm}', 'town_bridge', one(fn, **NOSHADOW),
                dict(anchor=FBA, note=note, box=bx, height=ex))
    reg.add('prop/shelf', 'town_props', one(TW.shelf, **NOSHADOW), dict(anchor='centre of the shelf; its back to -z'))
    # ---------------- D27: the town at the new scale (town27.py, props27.py; registered by town27_reg.py) -------
    # The D25 shops, houses, church, water tower, trees, lamps, fences, hitching rails, benches, horse, tufts and the
    # saloon's free-standing sign are replaced by these (same keys where the meaning is the same).
    import town27_reg
    town27_reg.register(reg)
    # ---------------- goods, tags, cart ----------------
    for kind in ('crate', 'sack', 'barrel', 'keg', 'bale', 'mailSack', 'longBundle'):
        x, z, y = TW.GOODS_TOP[kind]
        reg.add(f'goods/{kind}', 'town_goods', one(lambda k=kind: TW.goods(k), shadow=MOVE_SH),
                dict(anchor='centre of the bottom face', tag_at=[round(2 * (x - z)), round(x + z - 1.5 * y)],
                     tag_note='pixel offset from the anchor where a tag/<shop> mark is centred (top front edge)'))
    for kind in ('crate', 'sack', 'barrel'):
        for tag in (None, 'store', 'smithy', 'saloon'):
            nm = f'goods/{kind}/carried' + (f'/{tag}' if tag else '')
            reg.add(nm, 'town_goods', one(lambda k=kind: TW.carried(k), after=lambda k=kind, t=tag: TW.carried_mark(k, t), **NOSHADOW),
                    dict(anchor='centre of the bottom face: put it at the hands (the item sits above that point)',
                         note='smaller version to carry at chest height, no ground shadow'
                              + (f'; {tag} mark on the front' if tag else '')))
    for kind in TW.TAG_PIX:
        reg.add(f'tag/{kind}', 'town_goods', [TW.tag_sprite(kind)], dict(anchor='centre'))
    for d, f in CART_DIRS.items():
        F = TW.Frame(f)
        push = F.w(0.0, -9.0)
        meta = dict(anchor='centre of the cart bed at ground level', cartSlots=TW.cart_slots(f),
                    slots_note='6 x [dx, dy] px from the anchor: the tops of the six load places',
                    pusher=[round(push[0] / U, 3), round(push[1] / U, 3)],
                    pusher_note='where the agent stands to push it, u from the anchor (the handles trail behind)')
        reg.add(f'cart/{d}', 'town_goods', one(lambda f=f: TW.handcart(f, False), shadow=MOVE_SH), meta)
        reg.add(f'cart/{d}/loaded', 'town_goods', one(lambda f=f: TW.handcart(f, True), shadow=MOVE_SH),
                dict(meta, note='a full evening load drawn in (crates, sacks, kegs), for menus or previews'))
    # ---------------- platforms, walkway, ground tiles ----------------
    TILE = 'tile corner (x, z) at ground level; covers x..x+1, z..z+1'
    for v in range(4):
        reg.add(f'plat/deck/v{v}', 'town_ground', one(lambda v=v: TW.platform_tile('', v), **FLAT), dict(anchor=TILE, top_px=3))
    for v in range(2):
        reg.add(f'plat/edge_s/v{v}', 'town_ground', one(lambda v=v: TW.platform_tile('s', v), **FLAT), dict(anchor=TILE + '; the +z lip'))
    reg.add('plat/edge_e', 'town_ground', one(lambda: TW.platform_tile('e', 1), **FLAT), dict(anchor=TILE + '; the +x end face'))
    reg.add('plat/corner_se', 'town_ground', one(lambda: TW.platform_tile('se', 1), **FLAT), dict(anchor=TILE))
    reg.add('plat/ramp_e', 'town_ground', one(lambda: TW.platform_ramp('e'), **FLAT), dict(anchor=TILE + '; slopes down towards +x'))
    reg.add('plat/ramp_w', 'town_ground', one(lambda: TW.platform_ramp('w'), **FLAT), dict(anchor=TILE + '; slopes down towards -x'))
    reg.add('plat/loading_edge', 'town_ground', one(lambda: TW.loading_edge(1), **FLAT),
            dict(anchor='the deck\'s +z edge at x; 1 u long: rubbing strip and bumper plates facing track 3'))
    reg.add('plat/walkway_track', 'town_ground', one(TW.walkway_track, **FLAT),
            dict(anchor='the -x end of the piece on the track centre line; 1 u wide, planks across one track'))
    reg.add('plat/walkway_ground', 'town_ground', one(TW.walkway_ground, **FLAT), dict(anchor=TILE))
    for v in range(3):
        reg.add(f'ground/grass/v{v}', 'town_ground', one(lambda v=v: TW.grass_tile(v, 4), **FLAT),
                dict(anchor='tile corner; covers 4 x 4 u; the variants join without seams'))
    reg.add('ground/dirt', 'town_ground', one(lambda: TW.dirt_tile(2), **FLAT), dict(anchor='tile corner; 2 x 2 u'))
    reg.add('ground/gravel', 'town_ground', one(lambda: TW.gravel_tile(2), **FLAT), dict(anchor='tile corner; 2 x 2 u (ballast shoulder)'))
    reg.add('street/tile', 'town_ground', one(lambda: TW.street_tile(2), **FLAT), dict(anchor='tile corner; 2 x 2 u, ruts along z'))
    reg.add('street/edge_w', 'town_ground', one(lambda: TW.street_edge_tile('w'), **FLAT), dict(anchor='tile corner; grass on the -x side'))
    reg.add('street/edge_e', 'town_ground', one(lambda: TW.street_edge_tile('e'), **FLAT), dict(anchor='tile corner; grass on the +x side'))


# ============================ the ground layer (town part) ============================
REPLACES_GROUND_BASE = True
GROUND_ORDER = 30          # before the track (40): the track's ballast and rails then sit on this grass


def _caster(x0, y0, z0, x1, y1, z1):
    """An invisible box (MU) that only casts a shadow onto the ground layer."""
    E._reg((x0, y0, z0, x1, y1, z1), True)


def ground(layer):
    L = layer.layout
    U_ = TW.U
    E.ground(lambda X, Y: TW.grass_at(X, Y))
    # ---- the street, running north (-z) away from the station, with ragged dithered edges and cart ruts
    st = L['street']
    sx0, sx1, sz0, sz1 = st['x0'] * U_, st['x1'] * U_, st['z0'] * U_, st['z1'] * U_
    yard = (-8.5 * U_, 6.0 * U_, sz1 - 3.0 * U_, -12.6 * U_)    # dirt yard where the street meets platform 1
    def street(X, Y):
        rr, ii = TW.grass_at(X, Y)
        bay = E.BAYER[np.floor(X + Y).astype(int) % 4, np.floor(2 * (X - Y)).astype(int) % 4]
        d_st = np.minimum(X - sx0, sx1 - X)                 # MU inside the street's edges
        in_st = (Y > sz0) & (Y < sz1 + 1.0) & ((d_st > 1.5) | ((d_st > -1.5) & (bay < (d_st + 1.5) / 3.0)))
        yx0, yx1, yz0, yz1 = yard
        d_y = np.minimum.reduce([X - yx0, yx1 - X, Y - yz0, yz1 - Y])
        in_y = (d_y > 1.5) | ((d_y > -1.5) & (bay < (d_y + 1.5) / 3.0))
        ruts = (('x', -1.3 * U_, 0.55), ('x', 1.2 * U_, 0.55))
        dr, di = TW.dirt_at(X, Y, ruts=ruts)
        dr2, di2 = TW.dirt_at(X, Y)
        di = np.where(Y > sz1 - 2.0 * U_, di2, di)            # the ruts fade out into the yard
        m = in_st | in_y
        return np.where(m, dr, rr), np.where(m, np.where(in_st, di, di2), ii)
    TW._flat(-11 * U_, 14 * U_, sz0 - 2 * U_, -12.0 * U_, street, z=0.02)
    stn = next(bb for bb in L['buildings'] if bb['kind'] == 'station')
    sx_0, sx_1 = (stn['x'] - stn['w'] / 2 - 1.0) * U_, (stn['x'] + stn['w'] / 2 + 1.0) * U_
    sz_0, sz_1 = (stn['z'] - stn['d'] / 2 - 1.0) * U_, (stn['z'] + stn['d'] / 2 + 3.0) * U_
    def forecourt(X, Y):
        rr, ii = TW.grass_at(X, Y)
        bay = E.BAYER[np.floor(X + Y).astype(int) % 4, np.floor(2 * (X - Y)).astype(int) % 4]
        d = np.minimum.reduce([X - sx_0, sx_1 - X, Y - sz_0, sz_1 - Y])
        m = (d > 1.5) | ((d > -1.5) & (bay < (d + 1.5) / 3.0))
        dr, di = TW.dirt_at(X, Y)
        return np.where(m, dr, rr), np.where(m, di, ii)
    TW._flat(sx_0 - 2, sx_1 + 2, sz_0 - 2, sz_1 + 2, forecourt, z=0.01)
    # ---- worn path from the yard down the station's east side to the platform 1 ramp
    def path(X, Y):
        rr, ii = TW.grass_at(X, Y)
        dr, di = TW.dirt_at(X, Y)
        hd = hash2(np.floor(X * 2).astype(int), np.floor(Y * 2).astype(int)) % 100
        m = hd < 82
        return np.where(m, dr, rr), np.where(m, di, ii)
    TW._flat(16.0 * U_, 18.0 * U_, -13.5 * U_, -6.0 * U_, path, z=0.03)
    # ---- platform decks, ramps at their ends, and platform 2's loading edge along track 3
    for b in L['buildings']:
        if not b.get('deck'):
            continue
        x0, x1 = (b['x'] - b['w'] / 2) * U_, (b['x'] + b['w'] / 2) * U_
        z0, z1 = (b['z'] - b['d'] / 2) * U_, (b['z'] + b['d'] / 2) * U_
        TW.deck(x0, x1, z0, z1, variant=1 if b['kind'] == 'p2deck' else 0)
        TW.deck_ramp(x1, z0 + 2.0, z1 - 2.0, 1, U_)
        TW.deck_ramp(x0, z0 + 2.0, z1 - 2.0, -1, U_)
        if b['kind'] == 'p2deck':
            o = new_oid(False)
            box(x0 + 8.0, z1, TW.DECK - 1.2, x1 - 8.0, z1 + 0.6, TW.DECK + 0.2, 'wood', shades=(2, 3, 3), oid=o, cast=False)
            for x in np.arange(x0 + 10.0, x1 - 8.0, 6.0):
                box(x, z1 + 0.6, TW.DECK - 1.1, x + 1.0, z1 + 0.8, TW.DECK, 'iron', shades=(1, 1, 2), oid=o, cast=False)
    # ---- the plank walkway across the tracks (boards across the way, just under the rail heads)
    w = L['walkway']
    TW.walk_planks((w['x'] - w['w'] / 2) * U_, (w['x'] + w['w'] / 2) * U_, w['z0'] * U_, w['z1'] * U_, z=1.6, along='z')
    # ---- the shops' boardwalks, and boardwalk between the store and the smithy
    for sp in L['shops']:
        b = next(bb for bb in L['buildings'] if bb['id'] == sp['bld'])
        f = 'e' if b['x'] < 0 else 'w'
        F = TW.Frame(f, b['x'] * U_, b['z'] * U_)
        def planks(lf, u, z, a, bb, idx, lit):
            if lf == 't':
                ii = np.where(np.mod(a, 1.6) < 0.45, 2, np.where(hash2(np.floor(a / 1.6).astype(int), 1) % 5 == 0, 0, 1))
                return None, ii
            return None, np.where(np.mod(u, 3.0) < 0.6, 3, idx)
        F.box(-TW.SHOP_A, TW.SHOP_FRONT + 1.2, 0, TW.SHOP_A, TW.SHOP_B, 1.5, 'wood', paint=planks,
              oid=new_oid(False), cast=False)
    TW.walk_planks(-6.15 * U_, -4.2 * U_, -39.0 * U_, -35.0 * U_, z=1.5, along='z')
    # ---- footbridges: their shadows on the ground (positions from the layout when it has them)
    for fb in footbridges(L):
        TW.footbridge_casters(fb['x'] * U_, fb['p1'], fb['p2'], lambda bb: _caster(*bb))
    # the saloon's hanging sign
    _caster(SIGN_AT[0] * U_ - 0.6, SIGN_AT[1] * U_ - 0.6, 0, SIGN_AT[0] * U_ + 0.6, SIGN_AT[1] * U_ + 0.6, 22.0)
    _caster(SIGN_AT[0] * U_ - 16.0, SIGN_AT[1] * U_ - 0.35, 11.0, SIGN_AT[0] * U_ - 1.4, SIGN_AT[1] * U_ + 0.35, 17.6)
    # ---- shadows of the buildings that stand on the layer (invisible casters)
    for b in L['buildings']:
        x, z = b['x'] * U_, b['z'] * U_
        if b['kind'] == 'station':
            A, B = TW.STATION['a'] - 1.0, TW.STATION['b'] - 1.0
            top = TW.DECK + TW.STATION['wall']
            _caster(x - A, z - B, 0, x + A, z + B, top)
            _caster(x - A, z - 5.0, top, x + A, z + 5.0, top + 6.0)
        elif b['kind'] == 'storage':
            A, B = TW.STORAGE['a'], TW.STORAGE['b']
            _caster(x - A, z - B, 0, x + A, z + B, TW.DECK + TW.STORAGE['wall'])
        elif b['kind'] == 'shop':
            f = 'e' if b['x'] < 0 else 'w'
            kind = next(sp['id'] for sp in L['shops'] if sp['bld'] == b['id'])
            F = TW.Frame(f, x, z)
            p = TW.SHOP[kind]
            _caster(*_wbox(F, -17.0, -15.0, 17.0, TW.SHOP_FRONT, 0, p['h']))
            _caster(*_wbox(F, -9.0, -15.0, 9.0, TW.SHOP_FRONT, p['h'], p['h'] + 4.0))
            _caster(*_wbox(F, -18.0, TW.SHOP_FRONT, 18.0, TW.SHOP_FRONT + 1.2, 0, p['fh']))
        elif b['kind'] == 'lamp':
            _caster(x - 0.45, z - 0.45, 0, x + 0.45, z + 0.45, 15.0)
    c = L['canopy']
    _caster(c['x0'] * U_, c['z0'] * U_, TW.CANOPY['under'], c['x1'] * U_, c['z1'] * U_, TW.CANOPY['under'] + 3.0)
    sb = L['schedboard']
    _caster(sb['x'] * U_ - TW.SCHED['a'], sb['z'] * U_ + 0.4, TW.SCHED['z0'], sb['x'] * U_ + TW.SCHED['a'],
            sb['z'] * U_ + 0.9, TW.SCHED['z1'])


def _wbox(F, a0, b0, a1, b1, z0, z1):
    x0, y0, x1, y1 = F.rect_w(a0, b0, a1, b1)
    return x0, y0, z0, x1, y1, z1


SIGN_AT = (4.0, -25.2)          # where the saloon's hanging sign stands (u)
FOOTBRIDGES = [dict(x=-5.0, p1='w', p2='w'), dict(x=6.5, p1='e', p2='e')]   # used until the layout has them


def footbridges(L):
    """The footbridges from proto-layout.json ('footbridges': [{x, ...}]) or the defaults above. Each gets the
    direction its stairs run down: away from the middle of the platforms unless the layout says ('p1', 'p2')."""
    out = []
    for fb in L.get('footbridges') or FOOTBRIDGES:
        x = fb['x'] if isinstance(fb, dict) else float(fb)
        d = 'w' if x < 0 else 'e'
        out.append(dict(x=x, p1=(fb.get('p1') or fb.get('dir') or d) if isinstance(fb, dict) else d,
                        p2=(fb.get('p2') or fb.get('dir') or d) if isinstance(fb, dict) else d))
    return out
