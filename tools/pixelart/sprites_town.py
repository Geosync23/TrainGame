# Sprite module: station, shed, shops, houses, trees, props, goods, handcarts, platforms, walkway, ground
# (owner: the buildings and town artist). A first version from the mockup's shapes, via town.py;
# the town artist takes this module and town.py over.
import town as TW
from registry import one


def register(reg):
    nb = dict(outline=False, shadows=False)
    # platforms (top at 0.75 u)
    for v in range(4):
        reg.add(f'platform.top.v{v}', 'platform', one(lambda: TW.platform_tile('', v), **nb),
                dict(anchor='tile corner (x, z) at ground level; covers x..x+1, z..z+1; top at 0.75 u'))
    for v in range(2):
        reg.add(f'platform.edge_s.v{v}', 'platform', one(lambda: TW.platform_tile('s', v), **nb),
                dict(anchor='tile corner; shows the lip on the +z side'))
    reg.add('platform.edge_e', 'platform', one(lambda: TW.platform_tile('e', 1), **nb), dict(anchor='tile corner; shows the +x end face'))
    reg.add('platform.corner_se', 'platform', one(lambda: TW.platform_tile('se', 1), **nb), dict(anchor='tile corner; +z lip and +x end'))
    for d, nm in (('s', '+z'), ('e', '+x'), ('n', '-z'), ('w', '-x')):
        reg.add(f'platform.steps_{d}', 'platform', one(lambda: TW.platform_steps(d), **nb), dict(anchor=f'tile corner; steps down towards {nm}'))
    # plank walkway over the tracks (uses the track helpers in track.py)
    reg.add('walkway.track', 'platform', one(lambda: TW.walkway_track(), **nb),
            dict(anchor='start of the piece (its -x end) on the track centre line; 1 unit wide, planks over one track'))
    reg.add('walkway.ground', 'platform', one(lambda: TW.walkway_ground(), **nb), dict(anchor='tile corner; plank path between tracks'))
    # ground
    for v in range(3):
        reg.add(f'ground.grass.v{v}', 'ground', one(lambda: TW.grass_tile(v, 8), **nb),
                dict(anchor='tile corner (x, z); covers 8 x 8 units; variants join without seams'))
    reg.add('ground.dirt', 'ground', one(lambda: TW.dirt_tile(2), **nb), dict(anchor='tile corner; covers 2 x 2 units (street, yard)'))
    # goods, handcarts, props
    sh = (-30, -30, 40, 30)
    for item in ('crate', 'sack', 'barrel'):
        for tag in (None, 'store', 'smithy', 'saloon'):
            fn = getattr(TW, item)
            reg.add(f'goods.{item}.{tag or "plain"}', 'props', one(lambda: fn(tag), shadow=sh),
                    dict(anchor='centre of the base', note='shop mark: store = green, smithy = blue, saloon = red'))
    for d, (axis, fac) in {'e': ('x', 1), 'w': ('x', -1), 's': ('z', 1), 'n': ('z', -1)}.items():
        for load in (False, True):
            reg.add(f'handcart.{"loaded" if load else "empty"}.{d}', 'props', one(lambda: TW.handcart(axis, fac, load), shadow=sh),
                    dict(anchor='centre of the cart bed at ground level; the handles trail 1.75 u behind'))
    reg.add('prop.lamp_post', 'props', one(lambda: TW.lamp_post(False), shadow=sh))
    reg.add('prop.lamp_post_lit', 'props', one(lambda: TW.lamp_post(True), shadow=sh), dict(note='evening'))
    reg.add('prop.water_barrel', 'props', one(lambda: TW.water_barrel(), shadow=sh))
    reg.add('prop.fence_x', 'props', one(lambda: TW.fence('x'), shadow=sh), dict(anchor='post at the -x end; 1 unit long'))
    reg.add('prop.fence_z', 'props', one(lambda: TW.fence('z'), shadow=sh), dict(anchor='post at the -z end; 1 unit long'))
    # buildings
    bs = (-60, -50, 80, 50)
    for k in range(3):
        reg.add(f'tree.{k + 1}', 'buildings', one(lambda: TW.tree(k), shadow=(-40, -40, 60, 40)))
    img = one(lambda: TW.depot(), shadow=bs)[0]
    x0, x1, yf, z0, z1 = TW.DEPOT_BOARD
    ax, ay = img[1]
    P = lambda x, z: [round(ax + 2 * (x - yf), 2), round(ay + (x + yf) - 1.5 * z, 2)]
    reg.add('building.depot', 'buildings', [img],
            dict(footprint=[4.25, 2.5], floor_u=0.75,
                 anchor='centre of the footprint at ground level; the building stands on the platform (floor 0.75 u up)',
                 board=dict(top_left=P(x0, z1), top_right=P(x1, z1), bottom_left=P(x0, z0),
                            note='the schedule board on the +z face, in sprite pixels; rows slope down 1 px per 2 px to the right')))
    reg.add('building.shed', 'buildings', one(lambda: TW.shed(), shadow=bs),
            dict(footprint=[2.75, 2.125], anchor='centre of the footprint at ground level'))
    for k in ('store', 'smithy', 'saloon'):
        p = TW.SHOPS[k]
        reg.add(f'building.{k}', 'buildings', one(lambda: TW.shop(k), shadow=bs, after=lambda: TW.shop_sign(k)),
                dict(footprint=[p['w'] / 4, p['depth'] / 4], porch_u=1.25,
                     anchor='centre of the building footprint at ground level; front (with boardwalk) faces +z'))
    for k in range(3):
        p = TW.HOUSES[k]
        reg.add(f'building.house{k + 1}', 'buildings', one(lambda: TW.house(k), shadow=bs),
                dict(footprint=[(p['x'][1] - p['x'][0]) / 4, (p['y'][1] - p['y'][0]) / 4]))
    reg.add('building.water_tower', 'buildings', one(lambda: TW.water_tower(), shadow=bs), dict(footprint=[2.5, 2.5]))
