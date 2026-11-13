# D32 drawing helpers (the art for line building; owner: the D32 artist). Shapes in game units in a LOCAL frame that
# can face any way and tip: a = along the object, c = across it (to its left when a points away), h = up.
# Built on geom27's oriented box and cylinder, so they share the engine's depth buffer, light, outlines and shadows.
import math
import numpy as np
import pal27  # noqa: F401
import engine as E
from engine import R
from geom27 import obox, ocyl, B, CYV

UY = E.U_Y
UX = E.U_XZ


class Frame:
    """Local -> world. yaw: degrees, the game's convention (0 = +x, 90 = -z, north); pitch: degrees, lifts the +a end
    about the across axis through `pivot` (local a, h). origin: world (x, z, y) of local (0, 0, 0)."""

    def __init__(self, yaw=0.0, pitch=0.0, origin=(0.0, 0.0, 0.0), pivot=(0.0, 0.0), s=1.0):
        self.s = s          # scales local a and c (not h)
        y = math.radians(yaw)
        self.A0 = np.array([math.cos(y), -math.sin(y), 0.0])       # along, on the ground (x, z, y)
        self.C = np.array([math.sin(y), math.cos(y), 0.0])         # across (+c is +z when yaw = 0)
        p = math.radians(pitch)
        up = np.array([0.0, 0.0, 1.0])
        self.A = self.A0 * math.cos(p) + up * math.sin(p)
        self.H = -self.A0 * math.sin(p) + up * math.cos(p)
        self.o = np.array(origin, float)
        self.pv = pivot

    def pt(self, a, c, h):
        a, c = a * self.s, c * self.s
        pa, ph = self.pv
        pa = pa * self.s
        return self.o + self.A0 * pa + up3() * ph + self.A * (a - pa) + self.C * c + self.H * (h - ph)

    def box(self, a0, c0, h0, a1, c1, h1, ramp, tex=None, oid=0, cast=True, shades=None):
        cen = self.pt((a0 + a1) / 2, (c0 + c1) / 2, (h0 + h1) / 2)
        obox(cen, (self.A, self.C, self.H), (abs(a1 - a0) / 2 * self.s, abs(c1 - c0) / 2 * self.s, abs(h1 - h0) / 2), ramp,
             tex=tex, oid=oid, cast=cast, shades=shades)

    def cyl(self, p, axis, r, hl, ramp, tex=None, oid=0, cast=True, caps=True):
        ax = {'a': self.A, 'c': self.C, 'h': self.H}[axis] if isinstance(axis, str) else axis
        ref = None if axis != 'c' else self.A
        ocyl(self.pt(*p), ax, r, hl * self.s, ramp, tex=tex, oid=oid, cast=cast, ref=ref, caps=caps)

    def rod(self, p0, p1, r, ramp, oid=0, cast=True):
        """A thin rod from local p0 to p1 (a square section 2r)."""
        w0 = self.pt(*p0); w1 = self.pt(*p1)
        d = w1 - w0
        L = float(np.linalg.norm(d))
        if L < 1e-6:
            return
        a = d / L
        side = np.cross(a, (0, 0, 1.0))
        if np.linalg.norm(side) < 1e-6:
            side = np.array([1.0, 0, 0])
        side = side / np.linalg.norm(side)
        up = np.cross(side, a)
        obox((w0 + w1) / 2, (a, side, up), (L / 2, r, r), ramp, oid=oid, cast=cast)


def up3():
    return np.array([0.0, 0.0, 1.0])


def hashf(*k):
    """A float 0..1 from integers (stable)."""
    h = 0
    for v in k:
        h = (h * 1000003 + int(v) * 2654435761 + 12345) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    h ^= h >> 16
    return h / 4294967296.0


def grain(along='a'):
    """A wood-grain texture for obox faces: lines along the board, a knot now and then."""
    def tex(k, sgn, uvw, idx):
        u, v, w = uvw
        g = (np.floor((v + w) * 9.0).astype(int) * 7 + np.floor(u * 1.7).astype(int)) % 9
        ii = np.where(g == 0, np.minimum(idx + 1, 4), idx)
        return None, ii
    return tex
