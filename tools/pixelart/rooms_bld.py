# D32 stage 3 (the buildings artist): the town's buildings in parts (floor, back, front, roof) and the interiors of
# their far walls. Keys and numbers: plans/d32-rooms-art.md (the Rooms builder's contract); what this art chose:
# plans/d32-art-buildings.md. The split itself: bldparts.py.
import numpy as np
import engine as E
import ptag  # noqa: F401
import bldparts as BP
from bldparts import TH, shelf_on_n, shelf_on_w, pegs_n, pegs_w, stairs_w
import town27 as T
from town import Frame

U = 4.0
UY = 16.0 / 3.0
BIG = dict(canvas=(500, 440), origin=(250, 320))
MID = dict(canvas=(300, 260), origin=(150, 190))

# floor heights (u) and eaves (u) from the Rooms contract
SHOP_FLOOR = {'smithy': 0.05, 'livery': 0.05, 'feed': 1.0}
SHOP_EAVE = {'livery': 5.2}


# ============================ the twelve shops ============================

def shop_rect(kind):
    sp = T.SPECS[kind]
    F = Frame(T.facing(kind))
    b1 = T.LOT_B if kind == 'livery' else T.FF_B
    return F.rect_w(-T.BODY_A, sp['bk'], T.BODY_A, b1)


def _dw(n):
    return n


def shop_interior_spec(kind):
    sp = T.SPECS[kind]
    X0, Y0, X1, Y1 = shop_rect(kind)
    zf = SHOP_FLOOR.get(kind, 0.3) * UY
    wh = T.wall_h(sp) if kind != 'hotel' else 4.6 * UY
    LN = X1 - X0          # the north wall's length (MU)
    LW = Y1 - Y0          # the west wall's
    west = sp['row'] == 'w'
    s = dict(rect=(X0, Y0, X1, Y1), zf=zf, wh=wh, cut='wood')
    W = {}
    if not west:
        s['wtop'] = sp['fh']
        # the east row's street front is the west wall: from inside, the door (glazed, a transom) and the shop windows
        mid = LW / 2.0
        W['w'] = [('door', mid - 2.8, mid + 2.8, 16.0, dict(glass=True, transom=True, trim='cream')),
                  ('window', 4.0, 13.0, 4.0, 15.0, dict(panes=(3, 2), curtain=None)),
                  ('window', LW - 13.0, LW - 4.0, 4.0, 15.0, dict(panes=(3, 2)))]
    else:
        W['w'] = []
    if kind == 'store':
        s.update(paper=('cream', 1, 'stripe'), motif='sage', dado=('wood', 6.4), frieze='green')
        W['n'] = [('window', 6.0, 12.0, 11.0, 19.0, dict(panes=(2, 2))), ('clock', 27.0, 19.5),
                  ('poster', 15.0, 21.0, 15.0, 21.5, dict(head='green'))]
        W['w'] = [('door', 28.0, 33.4, 16.0, dict(trim='green')), ('poster', 6.0, 11.0, 15.0, 21.0, dict(head='red')),
                  ('picture', 15.0, 21.0, 15.0, 20.0, dict(scene='land')), ('sconce', 25.0, 13.0)]
        def fix(sp_):
            shelf_on_w(Y0 + 3.0, Y0 + 14.0, X0, wh - 4.0, ['jars', 'tins', 'jars'], seed=3)
            pegs_n([X0 + 2.5, X0 + 4.5], Y0, 14.0 + zf, ['apron', 'basket'])
        s['fix'] = fix
    elif kind == 'hotel':
        s.update(paper=('slate', 1, 'diamond'), motif='cream', dado=('umber', 6.0), frieze='cream')
        W['n'] = [('picture', 4.0, 10.0, 10.0, 16.0, dict(scene='portrait', frame='brass')), ('clock', 15.0, 16.0),
                  ('mirror', 22.0, 27.0, 8.5, 17.0), ('sconce', 19.5, 9.0), ('sconce', 30.5, 9.0)]
        W['w'] = [('opening', 2.0, 7.0, 16.0), ('picture', 10.0, 16.0, 10.0, 15.0, dict(scene='ship')),
                  ('board', 36.0, 41.0, 8.0, 14.0, 'wood', 3)]                     # the room keys' board
        def fix(sp_):
            stairs_w(X0, Y1 - 12.0, Y0 + 6.0, zf, wh, w=4.0, ramp='umber')
            for k in range(6):                                                       # the keys on their hooks
                pegs_w([Y1 - 37.0 - k * 0.8], X0, zf + 12.0 - (k % 2) * 2.0, ['keys'])
        s['fix'] = fix
    elif kind == 'bank':
        s.update(paper=('umber', 0, 'plaster'), dado=('umber', 7.0), frieze='cream', base='umber')
        s['paper'] = ('cream', 1, 'diamond')
        s['motif'] = 'straw'
        W['n'] = [('vault', 26.0, 9.0, 6.5), ('picture', 6.0, 13.0, 12.0, 18.0, dict(scene='portrait')),
                  ('clock', 16.5, 18.0)]
        W['w'] = [('window', 6.0, 10.0, 7.0, 17.0, dict(panes=(1, 3))), ('window', 34.0, 38.0, 7.0, 17.0, dict(panes=(1, 3))),
                  ('poster', 16.0, 21.0, 12.0, 18.0, dict(head='brass')), ('board', 24.0, 29.0, 11.0, 18.0, 'cream', 0, 'chart')]
    elif kind == 'smithy':
        s.update(paper=('wood', 2, 'boards'), dado=None, base='wood', cut='wood')
        W['n'] = [('window', 22.0, 27.0, 8.0, 14.0, dict(panes=(2, 2), trim='wood'))]
        W['w'] = [('door', 30.0, 36.0, 17.0, dict(trim='wood', panels=False)), ('poster', 10.0, 14.0, 14.0, 19.0)]
        s['floor'] = ('earth', 'dirt')
        def fix(sp_):
            pegs_n([X0 + 4.0 + k * 2.2 for k in range(6)], Y0, zf + 17.0,
                   ['tongs', 'hammer', 'tongs', 'shoes', 'hammer', 'tongs'])
            pegs_w([Y1 - 4.0 - k * 2.4 for k in range(5)], X0, zf + 17.0, ['shoes', 'hammer', 'collar', 'tongs', 'shoes'])
        s['fix'] = fix
    elif kind == 'livery':
        s.update(paper=('wood', 2, 'boards'), dado=None, base=None, cut='wood')
        W['n'] = [('window', 10.0, 13.0, 12.0, 15.0, dict(panes=(1, 1), trim='wood')),
                  ('window', 40.0, 43.0, 12.0, 15.0, dict(panes=(1, 1), trim='wood'))]
        W['w'] = [('door', 16.0, 28.0, 20.0, dict(trim='cream', panels=False, double=True))]
        s['floor'] = ('earth', 'dirt')
        def fix(sp_):
            pegs_n([X0 + 18.0, X0 + 22.0, X0 + 26.0, X0 + 31.0, X0 + 50.0], Y0, zf + 14.0,
                   ['saddle', 'harness', 'collar', 'rope', 'harness'])
            pegs_w([Y1 - 6.0, Y1 - 10.0, Y1 - 34.0, Y1 - 38.0], X0, zf + 13.0, ['rope', 'sickle', 'harness', 'saddle'])
        s['fix'] = fix
    elif kind == 'feed':
        s.update(paper=('straw', 1, 'boards'), dado=None, base='wood', cut='wood')
        W['n'] = [('window', 14.0, 19.0, 6.0, 12.0, dict(panes=(2, 2), trim='brick')), ('poster', 24.0, 29.0, 8.0, 14.0, dict(head='brick')),
                  ('board', 3.0, 9.0, 7.0, 12.0, 'cream', 0, 'chart')]
        W['w'] = [('door', 26.0, 32.0, 14.0, dict(trim='brick', panels=False))]
        def fix(sp_):
            pegs_w([Y1 - 6.0, Y1 - 9.0, Y1 - 12.0], X0, zf + 12.0, ['rope', 'sickle', 'basket'])
        s['fix'] = fix
    elif kind == 'saloon':
        s.update(paper=('red', 1, 'diamond'), motif='brass', dado=('wood', 7.0), frieze='brass')
        W['n'] = [('mirror', 6.0, 26.0, 9.0, 17.0), ('picture', 28.5, 34.5, 10.0, 15.0, dict(scene='portrait')),
                  ('sconce', 3.5, 11.0)]
        W['w'] += [('picture', 30.0, 36.0, 17.5, 22.0, dict(scene='land'))]
        def fix(sp_):
            shelf_on_n(X0 + 5.0, X0 + 27.0, Y0, zf + 8.2, ['bottles'], seed=5, depth=1.6)
            pegs_n([X0 + 16.0], Y0, zf + 21.0, ['antlers'])
        s['fix'] = fix
    elif kind == 'newspaper':
        s.update(paper=('cream', 1, 'plaster'), dado=('slate', 5.4), frieze='slate')
        W['n'] = [('board', 4.0, 14.0, 9.0, 17.0, 'cream', 0, 'chart'), ('poster', 17.0, 21.0, 10.0, 16.0),
                  ('poster', 22.0, 26.0, 11.0, 17.0, dict(head='navy')), ('clock', 31.0, 17.0)]
        W['w'] += [('poster', 31.0, 35.0, 16.0, 21.0, dict(head='navy'))]
        def fix(sp_):
            shelf_on_n(X0 + 3.0, X0 + 15.0, Y0, zf + 6.4, ['books', 'books'], seed=7, depth=2.4)
        s['fix'] = fix
    elif kind == 'barber':
        s.update(paper=('cream', 1, 'stripe'), motif='red', dado=('red', 6.0), frieze='red')
        W['n'] = [('mirror', 5.0, 15.0, 9.0, 17.0), ('mirror', 19.0, 29.0, 9.0, 17.0), ('poster', 31.0, 35.0, 12.0, 17.0, dict(head='red'))]
        def fix(sp_):
            shelf_on_n(X0 + 4.0, X0 + 30.0, Y0, zf + 8.0, ['bottles', 'jars'], seed=11, depth=1.6)
            pegs_w([Y1 - 34.0, Y1 - 36.5], X0, zf + 14.0, ['coat', 'hat'])
        s['fix'] = fix
    elif kind == 'sheriff':
        s.update(paper=('rock', 1, 'stone'), dado=None, base='rock', cut='rock')
        W['n'] = [('window', 26.0, 30.0, 9.0, 14.0, dict(panes=(1, 1), trim='rock')),
                  ('poster', 4.0, 8.0, 10.0, 15.5, dict(face=True)), ('poster', 9.0, 13.0, 11.0, 16.5, dict(face=True)),
                  ('poster', 14.0, 18.0, 10.0, 15.5, dict(face=True, head='red')), ('board', 20.0, 24.0, 15.0, 19.0, 'wood', 3)]
        s['floor'] = ('flags', 'rock')
        def fix(sp_):
            pegs_n([X0 + 21.0 + k * 0.0 for k in range(1)], Y0, zf + 17.0, ['keys'])
            for k in range(3):
                pegs_w([Y1 - 34.0], X0, zf + 9.0 + k * 2.4, ['gun'])
            pegs_w([Y1 - 40.0], X0, zf + 15.0, ['hat'])
        s['fix'] = fix
    elif kind == 'undertaker':
        s.update(paper=('umber', 1, 'sprig'), motif='umber', dado=('umber', 6.0), frieze='umber', base='umber')
        s['paper'] = ('sage', 1, 'sprig')
        W['n'] = [('picture', 6.0, 11.0, 10.0, 16.0, dict(scene='portrait', frame='umber')), ('clock', 17.0, 15.0),
                  ('picture', 23.0, 29.0, 10.0, 15.0, dict(scene='land', frame='umber'))]
        def fix(sp_):
            pegs_n([X0 + 32.0, X0 + 34.0], Y0, zf + 15.0, ['hat', 'coat'])
        s['fix'] = fix
    elif kind == 'assay':
        s.update(paper=('rock', 1, 'stone'), dado=None, base='rock', cut='rock')
        W['n'] = [('board', 4.0, 12.0, 10.0, 16.0, 'cream', 0, 'chart'), ('board', 26.0, 33.0, 10.0, 17.0, 'cream', 0, 'map')]
        s['floor'] = ('flags', 'rock')
        def fix(sp_):
            shelf_on_n(X0 + 13.0, X0 + 24.0, Y0, zf + 9.0, ['flasks', 'jars'], seed=13, depth=1.8)
            shelf_on_n(X0 + 13.0, X0 + 24.0, Y0, zf + 15.0, ['books', 'flasks'], seed=17, depth=1.8)
        s['fix'] = fix
    s['walls'] = W
    s.setdefault('floor', ('planks', 'wood'))
    s['eave'] = SHOP_EAVE.get(kind, 4.6) * UY
    return s


def shop_whole(kind):
    after = lambda k=kind: (T.side_letters(k), T.front_letters(k), T.livery_letters() if k == 'livery' else None)
    return (lambda k=kind: T.body(k)), after


# ============================ church, school, houses, station ============================

def church_spec():
    A, B = 20.0, 32.0
    s = dict(rect=(-A, -B, A, B - 6.0), zf=0.3 * UY, wh=5.5 * UY, cut='cream', eave=7.0 * UY,
             paper=('cream', 0, 'plaster'), dado=('wood', 6.0), frieze='green',
             floors=[(-A, -B, A, B - 6.0), (-7.0, B - 8.0, 7.0, B + 6.0)])
    s['walls'] = {'n': [('arch', 15.0, 25.0, 7.0, 19.0, 'stained'), ('picture', 4.0, 9.0, 12.0, 18.0, dict(scene='text')),
                        ('picture', 31.0, 36.0, 12.0, 18.0, dict(scene='text'))],
                  'w': [('arch', 9.0, 13.0, 6.0, 18.0), ('arch', 21.0, 25.0, 6.0, 18.0), ('arch', 33.0, 37.0, 6.0, 18.0),
                        ('arch', 45.0, 49.0, 6.0, 18.0), ('sconce', 17.0, 12.0), ('sconce', 41.0, 12.0)]}
    def fix(sp_):
        # a cross on the north wall over the altar, a little gallery rail (the choir's place) along the north wall
        o = E.new_oid(True)
        E.box(-0.6, -B + TH, 22.0, 0.6, -B + TH + 0.6, 29.0, 'brass', shades=(0, 1, 2), oid=o, cast=False)
        E.box(-2.4, -B + TH, 26.0, 2.4, -B + TH + 0.6, 27.0, 'brass', shades=(0, 1, 2), oid=o, cast=False)
    s['fix'] = fix
    return s


def school_spec():
    A, B = 16.0, 22.0
    s = dict(rect=(-A, -B, A, B), zf=0.3 * UY, wh=4.6 * UY, cut='brick', eave=4.5 * UY,
             paper=('cream', 1, 'planks'), dado=('brick', 6.0), frieze='brick')
    s['walls'] = {'n': [('stripe', 19.5, 22.5, 'brick', 2, 'abc'), ('board', 3.0, 8.0, 10.0, 16.0, 'cream', 0, 'map'),
                        ('clock', 28.0, 15.0)],
                  'w': [('window', 6.0, 10.0, 5.0, 15.0, dict(panes=(2, 3))), ('window', 15.0, 19.0, 5.0, 15.0, dict(panes=(2, 3))),
                        ('window', 24.0, 28.0, 5.0, 15.0, dict(panes=(2, 3))), ('window', 33.0, 37.0, 5.0, 15.0, dict(panes=(2, 3))),
                        ('stripe', 19.5, 22.5, 'brick', 2, 'abc')]}
    def fix(sp_):
        pegs_w([B - 1.5, B - 3.5], -A, 0.3 * UY + 11.0, ['coat', 'hat'])
        pegs_n([A - 3.0, A - 5.0], -B, 0.3 * UY + 11.0, ['coat', 'basket'])
    s['fix'] = fix
    return s


HOUSE_IN = [
    dict(paper=('cream', 1, 'sprig'), motif='red', dado=('green', 5.0)),
    dict(paper=('wood', 1, 'logs'), dado=None, cut='wood'),
    dict(paper=('cream', 1, 'stripe'), motif='slate', dado=('slate', 5.0)),
    dict(paper=('straw', 1, 'boards'), dado=None),
]


def house_spec(k, f):
    F = Frame(f)
    A, B = 12.0, 10.0
    X0, Y0, X1, Y1 = F.rect_w(-A, -B, A, B)
    wh = 3.4 * UY if k != 2 else 4.2 * UY
    s = dict(rect=(X0, Y0, X1, Y1), zf=0.3 * UY, wh=wh, cut='wood', eave=wh, base='wood')
    s.update(HOUSE_IN[k])
    LW = Y1 - Y0
    # the west wall: the back door ('e' houses) or the front door ('w' houses, seen from behind) at the same place
    W = {'w': [('door', LW - 17.0, LW - 12.5, 15.0, dict(trim=['green', 'cream', 'cream', 'brick'][k])),
               ('window', 2.5, 6.5, 6.0, 11.0, dict(panes=(2, 2), curtain='red' if k != 1 else 'cream'))],
         'n': [('window', 8.0, 12.0, 6.0, 11.0, dict(panes=(2, 2), curtain='cream')),
               ('picture', 2.0, 6.0, 9.0, 13.0, dict(scene=['land', 'portrait', 'ship', 'land'][k]))]}
    if k == 1:
        W['n'] = [('hearth', 6.0, 14.0, 13.0), ('picture', 15.5, 18.5, 9.0, 12.0, dict(scene='portrait', frame='wood'))]
    s['walls'] = W
    def fix(sp_):
        shelf_on_n(X0 + 13.5 if k != 1 else X0 + 1.0, X0 + 18.5 if k != 1 else X0 + 5.5, Y0, s['zf'] + 11.0,
                   ['plates', 'jars'] if k != 1 else ['pots'], seed=20 + k, depth=1.4)
        pegs_w([Y1 - 10.5], X0, s['zf'] + 12.0, [['coat', 'hat', 'coat', 'apron'][k]])
        if k == 1:
            pegs_w([Y1 - 2.0], X0, s['zf'] + 12.0, ['gun'])
    s['fix'] = fix
    return s


def station_spec():
    import station27 as S
    A, B = S.ST['a'], S.ST['b']
    zf = S.P1_DECK
    X0, Y0, X1, Y1 = -A + 1.0, -B + 1.0, A - 1.0, B - 1.0
    s = dict(rect=(X0, Y0, X1, Y1), zf=zf, wh=S.ST['eave'], cut='wood', eave=S.ST['eave'],
             paper=('straw', 1, 'boards'), dado=('wood', 7.0), frieze='wood')
    # the waiting room (west), the ticket office (middle), the baggage room (east), as the front's doors suggest
    s['walls'] = {'n': [('window', 8.0, 12.0, 8.0, 17.0, dict(panes=(1, 2))), ('poster', 15.0, 20.0, 11.0, 18.0, dict(head='red')),
                        ('clock', 25.0, 20.0), ('board', 40.0, 46.0, 10.0, 17.0, 'cream', 0, 'chart'),
                        ('window', 52.0, 56.0, 8.0, 17.0, dict(panes=(1, 2)))],
                  'w': [('window', 14.0, 18.0, 8.0, 17.0, dict(panes=(1, 2))), ('board', 22.0, 30.0, 10.0, 17.0, 'cream', 0, 'map')]}
    # partitions: the ticket office's west wall (x -1) and the baggage room's (x 22), doorways near the back
    hatch = [('hatch', 22.0, 26.0, 8.0, 13.0), ('opening', 4.0, 8.0, 16.0)]
    s['parts'] = [(-2.0, Y0, -1.0, Y1, s['wh'], hatch),
                  (21.0, Y0, 22.0, Y1, s['wh'], [('opening', 4.0, 9.0, 16.0)])]
    def fix(sp_):
        pegs_n([X0 + 44.0, X0 + 46.0], Y0, zf + 15.0, ['coat', 'hat'])
        shelf_on_n(X0 + 37.0, X0 + 50.0, Y0, zf + 8.0, ['books', 'crates'], seed=31, depth=2.0)
    s['fix'] = fix
    return s


# ============================ making the parts ============================

def make_parts(draw, after, spec, opts, lit=True, lit_draw=None):
    """Render the whole (and its night version) with tags and the interior; split; crop each part.
    Returns (whole_frame, {part: frame}, stray_count). lit_draw: a separate night drawing (the station)."""
    canvas, origin = opts['canvas'], opts['origin']
    if lit and lit_draw is None:
        whole, wlit, tb, qz = BP.render_lit_full(draw, after=after, canvas=canvas, origin=origin)
    else:
        whole, tb, qz = BP.render_full(draw, after=after, canvas=canvas, origin=origin)
        wlit = BP.render_full(lit_draw, after=after, canvas=canvas, origin=origin)[0] if lit_draw else None
    idraw = lambda: BP.interior(spec)
    inner, ilit, itb, _ = BP.render_lit_full(idraw, canvas=canvas, origin=origin)
    floor = BP.render_full(lambda: BP.interior(spec, floor_only=True), canvas=canvas, origin=origin)[0]
    parts, stray = BP.split(whole, tb, qz, inner, itb, spec['eave'], lit=wlit, inner_lit=ilit, floor=floor)
    out = {}
    for k, img in parts.items():
        c = BP.crop(img, origin)
        if c is not None:
            out[k] = c
    # a night part identical to its day part is left out (the renderer then uses the day part)
    for k in ('front', 'roof', 'back'):
        if k + '_lit' in out and k in out and out[k][0].shape == out[k + '_lit'][0].shape and \
                (out[k][0] == out[k + '_lit'][0]).all():
            del out[k + '_lit']
    return BP.crop(whole, origin), out, stray


def all_buildings():
    """[(key prefix <B>, whole key, draw, after, spec, opts, lit, lit_draw, box)]."""
    import station27 as S
    out = []
    for kind in T.SPECS:
        f = T.facing(kind)
        draw, after = shop_whole(kind)
        out.append((f'bld/shop_{kind}/{f}', f'bld/shop_{kind}/{f}/body', draw, after, shop_interior_spec(kind), BIG,
                    True, None, T.part_box(kind, 'body')))
    out.append(('bld/church', 'bld/church', T.church, None, church_spec(), BIG, True, None, [-5.0, -8.0, 5.0, 8.0, 16.0]))
    out.append(('bld/school', 'bld/school', T.school, T.school_letters, school_spec(), BIG, True, None,
                [-4.0, -5.5, 4.0, 7.5, 7.5]))
    for k in range(4):
        for f in ('e', 'w'):
            out.append((f'bld/house/{k + 1}/{f}', f'bld/house/{k + 1}/{f}', (lambda k=k, f=f: T.house(k, f)), None,
                        house_spec(k, f), MID, True, None, T.house_box(k, f)))
    A, B = S.ST['a'] / U, S.ST['b'] / U
    out.append(('bld/station', 'bld/station', S.station_all, lambda: (S.station_name(), S.station_letters()),
                station_spec(), BIG, True, (lambda: S.station_all(True)), [-A, -B, A, B + 0.75, 8.0]))
    return out


# ============================ the new houses (houses_d32.py) ============================

NEW_NOTES = {}
NEW_KEYS = {'cabin': 'bld/cabin', 'framehouse': 'bld/framehouse', 'house2': 'bld/house2'}
DOOR_H_IN = 16.0


def new_house_spec(kind, v, f):
    import houses_d32 as HD
    D = HD.DIMS[kind]
    c = HD.VARIANTS[kind][v]
    F = Frame(f)
    A, B, wh = D['A'], D['B'], D['wh']
    X0, Y0, X1, Y1 = F.rect_w(-A, -B, A, B)
    zf = 0.3 * UY
    s = dict(rect=(X0, Y0, X1, Y1), zf=zf, wh=wh, cut='wood', eave=wh, base='wood')
    LN = X1 - X0
    # where the house's own doors are on the west wall (u from its south end): the back door of an 'e' house, the
    # front door of a 'w' house (local a is world -z for 'e', +z for 'w')
    def wu(a):
        y = -a if f == 'e' else a
        return Y1 - y
    def span(a0, a1):
        return min(wu(a0), wu(a1)), max(wu(a0), wu(a1))
    W = {'n': [], 'w': []}
    if kind == 'cabin':
        s.update(paper=(c['wall'], 1, 'logs'), dado=None)
        s['outside'] = lambda: HD.cabin_chimney(v, f)
        W['n'] = [('hearth', LN / 2 - 5.0, LN / 2 + 5.0, 12.0),
                  ('picture', LN / 2 + 6.0, LN / 2 + 9.0, 9.0, 12.0, dict(scene='portrait', frame='wood'))]
        if f == 'e':
            W['w'] = [('window',) + span(-3.0, 0.0) + (6.0, 10.0, dict(panes=(1, 2), curtain='red'))]
        else:
            W['w'] = [('door',) + span(-2.2, 2.2) + (DOOR_H_IN - 1.0, dict(trim=c['trim'], panels=False)),
                      ('window',) + span(4.4, 7.6) + (5.0, 10.0, dict(curtain='red')),
                      ('window',) + span(-7.6, -4.4) + (5.0, 10.0, dict(curtain='red'))]
        def fix(sp_):
            pegs_n([X0 + LN / 2 - 2.0], Y0, zf + 13.4, ['gun'])
            pegs_n([X0 + 2.0, X0 + 4.0], Y0, zf + 11.0, ['pan', 'herbs'])
            pegs_w([Y1 - 2.0], X0, zf + 11.5, ['coat'])
            shelf_on_w(Y0 + 2.0, Y0 + 8.0, X0, zf + 10.0, ['pots', 'jars'], seed=41, depth=1.4)
        s['fix'] = fix
    elif kind == 'framehouse':
        s.update(paper=('cream', 1, 'sprig') if v == 0 else ('straw', 1, 'stripe'), motif='red' if v == 0 else 'brick',
                 dado=(c['trim'] if c['trim'] != 'cream' else 'wood', 5.0))
        W['n'] = [('window', 6.0, 10.0, 6.0, 12.0, dict(panes=(2, 2), curtain='cream')), ('clock', 15.0, 13.0),
                  ('picture', 18.0, 22.0, 9.0, 13.0, dict(scene='land'))]
        if f == 'e':
            W['w'] = [('door',) + span(3.0, 7.0) + (DOOR_H_IN - 0.8, dict(trim=c['trim'])),
                      ('window',) + span(-8.0, -4.4) + (6.0, 11.0, dict(curtain='red'))]
        else:
            W['w'] = [('door',) + span(-6.8, -2.6) + (DOOR_H_IN, dict(trim=c['trim'])),
                      ('window',) + span(2.0, 6.0) + (5.5, 13.0, dict(curtain='red')),
                      ('picture',) + span(-11.0, -9.0) + (9.0, 12.0, dict(scene='portrait'))]
        def fix(sp_):
            shelf_on_n(X0 + 1.5, X0 + 5.5, Y0, zf + 11.0, ['plates', 'jars'], seed=43, depth=1.2)
            pegs_n([X0 + LN - 2.5], Y0, zf + 12.0, ['hat'])
        s['fix'] = fix
    else:
        s.update(paper=('cream', 1, 'plaster'), dado=('wood', 4.6))
        # the partition between the two rooms at local a = 0 (world z = 0), a doorway near the back
        door_u = 2.0 if f == 'e' else LN - 6.0
        s['parts'] = [(X0, -0.5, X1, 0.5, wh, [('opening', door_u, door_u + 4.0, 15.0),
                                                ('picture', LN / 2 - 2.0, LN / 2 + 2.0, 9.0, 13.0, dict(scene='land'))])]
        W['n'] = [('window', 6.0, 10.0, 6.0, 11.0, dict(panes=(2, 2), curtain='cream'))]
        if f == 'e':
            W['w'] = [('door',) + span(-2.0, 2.0) + (DOOR_H_IN - 0.8, dict(trim=c['trim'])),
                      ('window',) + span(-11.0, -7.4) + (6.0, 11.0, dict(curtain='red')),
                      ('window',) + span(7.4, 11.0) + (6.0, 11.0, dict(curtain='red'))]
        else:
            W['w'] = [('door',) + span(-11.6, -7.4) + (DOOR_H_IN - 0.6, dict(trim=c['trim'])),
                      ('door',) + span(3.4, 7.6) + (DOOR_H_IN - 0.6, dict(trim=c['trim'])),
                      ('window',) + span(-5.6, -2.0) + (5.5, 11.5, dict(curtain='red'))]
        def fix(sp_):
            shelf_on_n(X0 + 13.0, X0 + 18.0, Y0, zf + 11.0, ['pots', 'jars'], seed=47, depth=1.4)
            pegs_n([X0 + 2.0, X0 + 3.8], Y0, zf + 12.0, ['pan', 'washboard'])
            pegs_w([Y1 - 4.0], X0, zf + 12.0, ['coat'])
        s['fix'] = fix
    s['walls'] = W
    return s


def new_houses():
    import houses_d32 as HD
    out = []
    for kind, base in NEW_KEYS.items():
        for v in range(2):
            for f in ('e', 'w'):
                key = (base if v == 0 else base + '_b') + '/' + f
                NEW_NOTES[key] = (f'{kind}, colour variant {v + 1}; '
                                  + {'e': 'door to +x', 'w': 'door to -x, seen from behind'}[f])
                out.append((key, key, (lambda k=kind, v=v, f=f: HD.house(k, v, f)), None, new_house_spec(kind, v, f),
                            MID, True, None, HD.house_box(kind, f)))
    return out
