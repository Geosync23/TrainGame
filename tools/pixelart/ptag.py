# Part tags for buildings that open up (D32 stage 3, the buildings artist).
#
# A building is drawn once, whole, exactly as before; while it is drawn every pixel the engine writes also records
# which part of the building it belongs to, in a tag buffer TB beside the engine's depth buffer:
#   BACK  the walls away from the viewer (north and west) and anything that stays when the building is opened
#   FRONT the walls towards the viewer (south, +z, and east, +x) and what stands in front of them
#   ROOF  the roof, its chimneys and dormers
#   FLOOR the floor
# The drawing code says what it is drawing with tag(mode) before its shapes. Two modes resolve by the face hit:
#   'walls'  a solid wall box: its top under the roof is ROOF, its +z and +x faces (the walls the view sees) FRONT
#   'gable'  a gable roof: the slopes are ROOF, the flat gable-end triangle (a wall) FRONT
# tag(None) (the default) leaves pixels untagged (NONE); nothing is changed in what the engine draws.
# The split itself is in bldparts.py.
import numpy as np
import engine as E

NONE, BACK, FRONT, ROOF, FLOOR = 0, 1, 2, 3, 4
NAMES = {NONE: 'none', BACK: 'back', FRONT: 'front', ROOF: 'roof', FLOOR: 'floor'}
CODE = {'back': BACK, 'front': FRONT, 'roof': ROOF, 'floor': FLOOR, None: NONE}

STATE = {'mode': None, 'on': False}
TB = [None]


def tag(mode):
    """Set the part the shapes drawn next belong to: 'back', 'front', 'roof', 'floor', 'walls', 'gable' or None."""
    STATE['mode'] = mode


def record(on=True):
    STATE['on'] = on


_orig_begin = E.begin
_orig_put = E.put


def _begin(*a, **k):
    _orig_begin(*a, **k)
    TB[0] = np.zeros((E.H, E.W), np.int8)
    STATE['mode'] = None


def _face(sl, m, t):
    X, Y, Z = E.ray(sl, np.broadcast_to(t, m.shape))
    X, Y, Z = X[m], Y[m], Z[m]
    if X.size == 0:
        return 's'
    if np.ptp(Z) < 1e-6:
        return 't'
    if np.ptp(Y) < 1e-6:
        return 'l'
    if np.ptp(X) < 1e-6:
        return 'r'
    return 's'


def _resolve(mode, sl, m, t):
    if mode in CODE:
        return CODE[mode]
    f = _face(sl, m, t)
    if mode == 'walls':
        return ROOF if f == 't' else FRONT
    if mode == 'gable':
        return ROOF if f in ('s', 't') else FRONT
    if mode == 'backwalls':          # a wall box at the back: its top cut edge and faces stay
        return BACK
    raise ValueError(mode)


def _put(sl, m, t, ramp, idx, pid, oid, lit):
    """engine.put with the part tag written beside the depth buffer (the same pixels, the same test)."""
    if not m.any():
        return
    x0p = E.X0P[sl]; y0p = E.Y0P[sl]
    t = np.broadcast_to(t, m.shape)
    if E.CLIP[0] is not None:
        xw = x0p + E.DX * t
        m = m & (xw >= E.CLIP[0][0] - 1e-6) & (xw < E.CLIP[0][1] - 1e-6)
    D = E.DX * x0p + E.DY * y0p + E.DD * t
    m = m & (D > E.DB[sl])
    if not m.any():
        return
    code = _resolve(STATE['mode'], sl, m, t) if STATE['mode'] is not None else NONE
    E.DB[sl][m] = D[m]
    E.RB[sl][m] = np.broadcast_to(ramp, m.shape)[m]
    E.IB[sl][m] = np.broadcast_to(idx, m.shape)[m]
    E.PB[sl][m] = pid; E.OB[sl][m] = oid
    E.LB[sl][m] = np.broadcast_to(lit, m.shape)[m]
    E.QX[sl][m] = (x0p + E.DX * t)[m]; E.QY[sl][m] = (y0p + E.DY * t)[m]; E.QZ[sl][m] = (E.DZ * t)[m]
    if TB[0] is not None and TB[0].shape == m.shape[:0] + E.DB.shape:
        TB[0][sl][m] = code


E.begin = _begin
E.put = _put
