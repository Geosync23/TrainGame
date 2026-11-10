# Sprite module: the station depot and canopy, the storage shed, the three shops (in three facings, split into
# parts for depth sorting), houses, church, water tower, trees, props, goods and tags, the handcart, platform
# tiles, the plank walkway and ground tiles. Owner: the buildings-and-town artist. Drawing code: town.py.
# Names follow the D25 sprite contract (plans/proto-sprites.md): bld/..., goods/..., tag/..., cart/<dir>.
import math
import town as TW
import engine as E
import harness as H
import numpy as np
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


def _shop(reg, kind):
    for f in ('e', 'w', 's'):
        F = TW.Frame(f)
        door = F.w(0.0, TW.SHOP_DOOR_B)
        parts = {
            'body': (lambda k=kind, f=f: TW.shop_body(k, f), lambda k=kind, f=f: TW.shop_letters(k, f),
                     _box_u(F, -18.8, -16.0, 18.8, TW.SHOP_FRONT + 1.8, TW.SHOP[kind]['fh'] + 4.4)),
            'walk': (lambda k=kind, f=f: TW.shop_walk(k, f), None,
                     _box_u(F, -TW.SHOP_A, TW.SHOP_FRONT + 1.2, TW.SHOP_A, TW.SHOP_B, 1.5)),
        }
        if kind != 'smithy':
            parts['awning'] = (lambda k=kind, f=f: TW.shop_awning(k, f), None,
                               _box_u(F, -TW.SHOP_A, TW.SHOP_FRONT + 1.8, TW.SHOP_A, TW.AWN_B, 14.4))
        else:
            parts['anvil'] = (lambda f=f: TW.shop_anvil(f), None, _box_u(F, -9.0, 8.2, -7.0, 12.0, 6.2))
        for part, (draw, after, bx) in parts.items():
            opts = FLAT if part == 'walk' else NOSHADOW
            reg.add(f'bld/shop_{kind}/{f}/{part}', 'town_shops', one(draw, after=after, **opts),
                    dict(anchor=CENTRE + ' of the whole shop (draw every part at the same point)',
                         box=bx, box_note='[x0, z0, x1, z1, height] in u from the anchor; sort the part on this box'))
        if f == LAYOUT_FACING[kind]:
            def draw_all(k=kind, f=f):
                TW.shop_all(k, f)
            reg.add(f'bld/shop_{kind}', 'town_shops', one(draw_all, after=lambda k=kind, f=f: TW.shop_letters(k, f), **NOSHADOW),
                    dict(anchor=CENTRE, footprint=[10, 8], facing=f,
                         front={'e': '+x', 'w': '-x', 's': '+z'}[f],
                         door=[round(door[0] / U, 3), round(door[1] / U, 3)],
                         door_note='the delivery spot on the boardwalk in front of the door, u from the anchor',
                         parts=[f'bld/shop_{kind}/{f}/{p}' for p in parts],
                         note='the whole shop as one picture; the parts are the same picture split for sorting'))


def register(reg):
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
            dict(anchor=CENTRE, footprint=[10, 2.4], height=3.2, doors='+z side (track 3): three freight doors',
                 bays=[round((-TW.STORAGE['a'] + d0 + 5.0) / U, 3) for d0 in TW.STORAGE_BAYS],
                 bays_note='x of each door centre, u from the anchor; the door sill is at z = +1.2 u'))
    reg.add('bld/storage_open', 'town_station', one(lambda: TW.storage(True), **NOSHADOW),
            dict(anchor=CENTRE, footprint=[10, 2.4], note='the same shed with its doors slid open: shelves of goods'))
    img = one(TW.schedboard, **NOSHADOW)
    ax, ay = img[0][1]
    reg.add('bld/schedboard', 'town_station', img, dict(anchor='between the two posts at ground level', footprint=[2.4, 0.3],
                                                      board=TW.schedboard_area(ax, ay)))
    # ---------------- shops ----------------
    for kind in TW.SHOPS:
        _shop(reg, kind)
    # ---------------- town scenery ----------------
    for k in range(3):
        p = TW.HOUSE[k]
        for f in ('s', 'e'):
            fp = [2 * p['a'] / U, 2 * p['b'] / U] if f == 's' else [2 * p['b'] / U, 2 * p['a'] / U]
            reg.add(f'bld/house/{k + 1}' + ('' if f == 's' else '/e'), 'town_scenery',
                    one(lambda k=k, f=f: TW.house(k, f), **NOSHADOW),
                    dict(anchor=CENTRE, footprint=fp, front='+z' if f == 's' else '+x'))
    reg.add('bld/church', 'town_scenery', one(TW.church, **NOSHADOW), dict(anchor='centre of the nave at ground level', footprint=[3.0, 6.0]))
    reg.add('bld/watertower', 'town_scenery', one(TW.water_tower, **NOSHADOW), dict(anchor=CENTRE, footprint=[2.5, 2.5]))
    trees = [('cottonwood', TW.tree_cottonwood), ('pine', TW.tree_pine), ('young', TW.tree_young)]
    for k, (nm, fn) in enumerate(trees):
        reg.add(f'bld/tree/{k + 1}', 'town_scenery', one(fn, **NOSHADOW), dict(anchor='foot of the trunk', kind=nm))
    reg.add('bld/lamp', 'town_props', one(lambda: TW.lamp_post(False), **NOSHADOW), dict(anchor='foot of the post'))
    reg.add('bld/lamp_lit', 'town_props', one(lambda: TW.lamp_post(True), **NOSHADOW), dict(anchor='foot of the post', note='evening'))
    reg.add('bld/fence_x', 'town_props', one(lambda: TW.fence('x'), **NOSHADOW), dict(anchor='the post at the -x end; 1 u long'))
    reg.add('bld/fence_z', 'town_props', one(lambda: TW.fence('z'), **NOSHADOW), dict(anchor='the post at the -z end; 1 u long'))
    reg.add('bld/hitch_x', 'town_props', one(lambda: TW.hitching_rail('x'), **NOSHADOW), dict(anchor='centre; 2 u along x'))
    reg.add('bld/hitch_z', 'town_props', one(lambda: TW.hitching_rail('z'), **NOSHADOW), dict(anchor='centre; 2 u along z'))
    reg.add('bld/bench_x', 'town_props', one(lambda: TW.bench('x'), **NOSHADOW), dict(anchor='centre; seat faces +z'))
    reg.add('bld/bench_z', 'town_props', one(lambda: TW.bench('z'), **NOSHADOW), dict(anchor='centre; seat faces +x'))
    reg.add('bld/horse', 'town_props', [TW.pixmap(TW.HORSE, ax=10, ay=15, outline=False)],
            dict(anchor='under the horse\'s middle, on the ground; stands along x, head to the +x side'))
    reg.add('prop/water_barrel', 'town_props', one(TW.water_barrel, **NOSHADOW), dict(anchor='centre of the base'))
    reg.add('prop/crates', 'town_props', one(TW.crate_stack, **NOSHADOW), dict(anchor='centre of the stack'))
    reg.add('prop/sacks', 'town_props', one(TW.sack_pile, **NOSHADOW), dict(anchor='centre of the pile'))
    reg.add('prop/barrels', 'town_props', one(TW.barrel_group, **NOSHADOW), dict(anchor='centre of the group'))
    reg.add('prop/shelf', 'town_props', one(TW.shelf, **NOSHADOW), dict(anchor='centre of the shelf; its back to -z'))
    for k, rows in enumerate(TW.TUFTS):
        reg.add(f'prop/tuft/{k + 1}', 'town_props', [TW.pixmap(rows)], dict(anchor='bottom middle', note='grass tuft or flowers'))
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
