# D32 wild country (Artist 2): the ground of the nine regions, as tile textures (X, Y in tile MU, 0 .. 4 per 1u
# cell; s the variant) in the format of sprites_ground.tile, and the same textures for the far-side terrain (which
# calls them with continuous coordinates, so the wall's foot runs on into the ground tiles without a seam).
# Every texture is noise per pixel, so any variant joins any other.
import numpy as np
import pal27  # noqa: F401
import pal_d32  # noqa: F401
import pal_wild  # noqa: F401
from engine import R, hash2
import country_d32 as C
import sprites_ground as SG

REGIONS = ('prairie', 'creek', 'hills', 'woods', 'rocks', 'river', 'canyon', 'pass', 'valley')


def _n(X, Y, s, cell=0.5):
    return hash2(np.floor(X / cell).astype(int) + s * 131, np.floor(Y / cell).astype(int) + s * 71) % 100


def _sel(m, a, b):
    return np.where(m, a, b)


def prairie(X, Y, s):
    """Home prairie: short grass, grama patches, flowers, a stone; 4 leans tall grass (darker blades)."""
    rr, ii = C.prairie(X, Y, s % 4)
    if s == 3:
        tall = _n(X, Y, 501, 0.5) < 22
        rr = _sel(tall, R('grass'), rr); ii = _sel(tall, 3, ii)
    return rr, ii


def creek(X, Y, s):
    """Creek bottoms: lush dark grass, damp patches of sedge, clover, a little mud."""
    n = _n(X, Y, s + 510); m = _n(X, Y, s + 511, 1.0)
    rr = np.full(X.shape, R('grass'))
    ii = _sel(n < 18, 1, _sel(n < 80, 2, 3))
    sedge = m < (20, 30, 14, 26)[s]
    rr = _sel(sedge, R('needle'), rr); ii = _sel(sedge, _sel(n < 50, 1, 2), ii)
    clover = _n(X, Y, s + 512, 0.5) < (3, 1, 5, 2)[s]
    rr = _sel(clover, R('cream'), rr); ii = _sel(clover, 1, ii)
    mud = (_n(X, Y, s + 513, 1.0) < (4, 8, 2, 6)[s]) & (n < 70)
    rr = _sel(mud, R('earth'), rr); ii = _sel(mud, 2, ii)
    return rr, ii


def hills(X, Y, s):
    """The hills: bunchgrass with dry patches, sandstone chips, a few flowers."""
    rr, ii = C.prairie(X, Y, (1, 3, 1, 0)[s])
    dry = _n(X, Y, s + 520, 1.0) < (35, 25, 45, 30)[s]
    rr = _sel(dry, R('dryslope'), rr); ii = _sel(dry, _sel(_n(X, Y, s + 521) < 40, 1, 2), ii)
    chip = _n(X, Y, s + 522, 0.5) < 4
    rr = _sel(chip, R('rock'), rr); ii = _sel(chip, 1, ii)
    return rr, ii


def woods(X, Y, s):
    """The big woods' floor: needles and duff, darker than the first batch's, moss, ferns, cones."""
    rr, ii = C.woodfloor(X, Y, s % 3)
    ii = np.minimum(ii + 1, 4)
    fern = _n(X, Y, s + 530, 0.5) < (6, 3, 9, 4)[s]
    rr = _sel(fern, R('grass'), rr); ii = _sel(fern, _sel(_n(X, Y, s + 531) < 50, 2, 3), ii)
    return rr, ii


def rocks(X, Y, s):
    """The rocks: bare sandstone and grit, cracks, lichen, a tuft."""
    rr, ii = C.rockground(X, Y, s % 3)
    if s == 3:
        peb = _n(X, Y, 541, 0.5) < 16
        rr = _sel(peb, R('rock'), rr); ii = _sel(peb, _sel(_n(X, Y, 542) < 50, 2, 3), ii)
    return rr, ii


def river(X, Y, s):
    """The river run: grass with sandy and gravelly patches, river cobbles."""
    rr, ii = C.prairie(X, Y, (0, 1, 0, 2)[s])
    sand = _n(X, Y, s + 550, 1.0) < (16, 26, 10, 20)[s]
    rr = _sel(sand, R('dirt'), rr); ii = _sel(sand, _sel(_n(X, Y, s + 551) < 50, 0, 1), ii)
    cob = _n(X, Y, s + 552, 0.5) < (3, 6, 2, 4)[s]
    rr = _sel(cob, R('rock'), rr); ii = _sel(cob, _sel(_n(X, Y, s + 553) < 50, 1, 2), ii)
    return rr, ii


def canyon(X, Y, s):
    """The canyon floor: red sand and slickrock, desert scrub specks, pale chips."""
    n = _n(X, Y, s + 560); m = _n(X, Y, s + 561, 1.0)
    rr = np.full(X.shape, R('redrock'))
    ii = _sel(m < 35, _sel(n < 20, 0, 1), _sel(n < 15, 2, 1))
    slick = (np.abs(np.mod(X * 0.6 + Y * 0.5 + s * 1.7, 2.6) - 1.3) < 0.12) & (m < 60)
    ii = _sel(slick, 3, ii)
    scrub = _n(X, Y, s + 562, 0.5) < (4, 7, 3, 5)[s]
    rr = _sel(scrub, R('sage'), rr); ii = _sel(scrub, _sel(n < 50, 2, 3), ii)
    chip = _n(X, Y, s + 563, 0.5) < 3
    rr = _sel(chip, R('rock'), rr); ii = _sel(chip, 0, ii)
    return rr, ii


def pass_(X, Y, s):
    """The pass: thin alpine grass on granite grit, scree pebbles, a lingering snow patch (4)."""
    n = _n(X, Y, s + 570); m = _n(X, Y, s + 571, 1.0)
    grit = m < (55, 40, 65, 50)[s]
    rr = _sel(grit, R('granite'), R('grass'))
    ii = _sel(grit, _sel(n < 25, 1, 2), _sel(n < 30, 1, 2))
    peb = _n(X, Y, s + 572, 0.5) < 5
    rr = _sel(peb, R('granite'), rr); ii = _sel(peb, _sel(_n(X, Y, s + 573) < 50, 0, 3), ii)
    if s == 3:
        snow = _n(X, Y, 574, 1.0) < 30
        rr = _sel(snow, R('snow'), rr); ii = _sel(snow, _sel(n < 70, 1, 2), ii)
    flower = _n(X, Y, s + 575, 0.5) < 2
    rr = _sel(flower, R('plum'), rr); ii = _sel(flower, 0, ii)
    return rr, ii


def valley(X, Y, s):
    """The far valley: lush pasture, clover and daisies, cropped grass."""
    n = _n(X, Y, s + 580); m = _n(X, Y, s + 581, 1.0)
    rr = np.full(X.shape, R('grass'))
    ii = _sel(n < 25, 0, _sel(n < 85, 1, 2))
    dark = m < 25
    ii = _sel(dark, np.minimum(ii + 1, 4), ii)
    fl = _n(X, Y, s + 582, 0.5) < (4, 2, 6, 3)[s]
    fc = _n(X, Y, s + 583)
    rr = _sel(fl, _sel(fc < 60, R('cream'), R('bloom')), rr); ii = _sel(fl, 0, ii)
    return rr, ii


TEX = {'prairie': prairie, 'creek': creek, 'hills': hills, 'woods': woods, 'rocks': rocks, 'river': river,
       'canyon': canyon, 'pass': pass_, 'valley': valley}
NOTES = {
    'prairie': 'home prairie: short grass, grama, flowers (1 green, 2 dry, 3 flowery, 4 tall grass)',
    'creek': 'creek bottoms: lush grass, sedge, clover, a little mud',
    'hills': 'the hills: bunchgrass and dry patches, sandstone chips',
    'woods': 'the big woods\' floor: needles, duff, moss, ferns (darker than tile/woodfloor)',
    'rocks': 'the rocks: bare sandstone, grit, cracks, lichen (4 pebbly)',
    'river': 'the river run: grass with sand and gravel, cobbles',
    'canyon': 'the canyon floor: red sand, slickrock, scrub',
    'pass': 'the pass: alpine grass on granite grit, scree (4 a snow patch)',
    'valley': 'the far valley: lush pasture, clover, daisies',
}


def blend(a, b, share):
    """A tile `share` of the way from region a's ground to b's: soft patches of b in a (patch noise 1 MU), dithered."""
    fa, fb = TEX[a], TEX[b]
    def f(X, Y, s):
        ra, ia = fa(X, Y, s)
        rb, ib = fb(X, Y, s)
        p = (_n(X, Y, s + 700, 1.0) * 0.7 + _n(X, Y, s + 701, 0.5) * 0.3) / 100.0
        m = p < share
        return np.where(m, rb, ra), np.where(m, ib, ia)
    return f


def tile(fn, s):
    return SG.tile(fn, s)
