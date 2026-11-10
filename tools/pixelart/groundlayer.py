# The ground layer: one image of everything that lies flat (grass, the street, ballast, ties and rails, platform
# decks, the plank walkway), drawn where the game has it (proto-layout.json), world origin at (OX, OY).
#
# build.py makes one engine canvas the size of the layer and calls ground(layer) on every sprites_*.py module that
# has it, lowest GROUND_ORDER first (default 50). All of them draw into the same depth buffer, so a higher surface
# wins wherever two overlap. Draw in MU with the engine's shapes (world x * 4, world z * 4); layer.mu(x, z) helps.
# Until a module sets REPLACES_GROUND_BASE = True, the pipeline lays a plain base first (grass, street, decks,
# walkway) so the layer is complete.
# A module may also cast shadows onto the layer: layer.caster(x0, z0, x1, z1, height_u) adds an invisible box
# (world units) whose shadow falls on the ground (for buildings and trees that are sprites).
import json, os
import numpy as np
import engine as E
from engine import R, box, hash2
import shapes as S

HERE = os.path.dirname(os.path.abspath(__file__))
U = 4.0
DECK_MU = 2.0          # contract: deck top drawn 3 px high (0.3 u is 1.6 MU; 3 px is 2 MU)


def load_layout(path=None):
    with open(path or os.path.join(HERE, 'proto-layout.json')) as f:
        return json.load(f)


class Layer:
    def __init__(self, layout):
        self.layout = layout
        p = layout['proj']
        self.W, self.H, self.OX, self.OY = p['W'], p['H'], p['OX'], p['OY']
        self.deck_px = p.get('DECK', 3)

    @staticmethod
    def mu(x, z):
        return x * U, z * U

    def caster(self, x0, z0, x1, z1, height_u):
        E._reg((x0 * U, z0 * U, 0, x1 * U, z1 * U, height_u * E.U_Y), True)


def tex_deck(face, X, Y, Z, idx):
    rr = np.full(X.shape, R('wood'))
    if face == 't':
        row = np.floor(Y / 2.0).astype(int)
        fy = Y - row * 2.0
        off = (row * 7) % 19
        seg = np.floor((X + off) / 19).astype(int)
        fx = (X + off) - seg * 19
        h = hash2(row, seg) % 9
        ii = np.where(h == 0, 0, np.where(h == 3, 2, 1))
        ii = np.where(fy < 0.55, 2, ii)
        ii = np.where(fx < 0.45, 2, ii)
        return rr, ii
    ii = np.where(Z > DECK_MU - 0.7, 2, 3)
    return rr, ii


def base(layer):
    """Placeholder ground until the town artist's module replaces it: the mockup's grass, the street, decks, walkway."""
    L = layer.layout
    def grass(X, Y):
        # the mockup's grass, with softer light and dark patches so the big layer does not stripe
        lf = (np.sin(X * 0.07 + Y * 0.03) + 0.8 * np.sin(Y * 0.09 - X * 0.05 + 1.3) + 0.5 * np.sin((X + Y) * 0.19)) / 2.3
        v = lf * 0.55 + (E.BAY - 0.5) * 0.9
        i = np.where(v > 0.5, 0, np.where(v > -0.42, 1, 2))
        h = hash2(np.floor(X * 2).astype(int), np.floor(Y * 2).astype(int)) % 97
        i = np.where(h == 3, 3, i); i = np.where((h == 7) & (i > 0), i - 1, i)
        return np.full(X.shape, R('grass')), i
    E.ground(grass)
    st = L.get('street')
    if st:
        def dirt(face, X, Y, Z, idx):
            hd = hash2(np.floor(X * 2).astype(int) + 5, np.floor(Y * 2).astype(int)) % 100
            ii = np.where(hd < 12, 0, np.where(hd > 95, 2, 1))
            return R('dirt'), ii
        box(st['x0'] * U, st['z0'] * U, -0.2, st['x1'] * U, st['z1'] * U, 0.05, 'dirt', tex=dirt, cast=False, faces='t')
    for b in L.get('buildings', []):
        if b.get('deck'):
            x0, x1 = (b['x'] - b['w'] / 2) * U, (b['x'] + b['w'] / 2) * U
            z0, z1 = (b['z'] - b['d'] / 2) * U, (b['z'] + b['d'] / 2) * U
            box(x0, z0, 0, x1, z1, DECK_MU, 'wood', tex=tex_deck, cast=False)
    w = L.get('walkway')
    if w:
        x0, x1 = (w['x'] - w['w'] / 2) * U, (w['x'] + w['w'] / 2) * U
        def planks(face, X, Y, Z, idx):
            if face == 't':
                return R('wood'), np.where((X % 1.0) < 0.3, 2, np.where(hash2(np.floor(X).astype(int), 3) % 3 == 0, 0, 1))
            return R('wood'), np.full(X.shape, 3)
        box(x0, w['z0'] * U, 0, x1, w['z1'] * U, 1.7, 'wood', tex=planks, cast=False, faces='tlr')


def build(modules, layout):
    """Returns the ground layer as an RGBA image (opaque)."""
    layer = Layer(layout)
    E.begin(layer.W, layer.H, layer.OX, layer.OY)
    if not any(getattr(m, 'REPLACES_GROUND_BASE', False) for m in modules):
        base(layer)
    for m in sorted([m for m in modules if hasattr(m, 'ground')], key=lambda m: getattr(m, 'GROUND_ORDER', 50)):
        m.ground(layer)
    E.cast_shadows()
    img = E.render_rgba()
    hole = img[..., 3] < 255
    img[hole] = (*E.PAL[R('grass'), 1], 255)
    return img
