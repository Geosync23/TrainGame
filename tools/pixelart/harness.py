# Renders one sprite frame: a fresh canvas, the object drawn around the world origin, shadows, outlines,
# then cropped to its pixels. The anchor is the pixel corner where the world origin (ground level) lands:
# draw the frame at (screenX - ax, screenY - ay), where (screenX, screenY) is the projected world position.
import numpy as np
import engine as E

CANVAS = (360, 300)
ORIGIN = (180, 200)


def render(draw, shadow=None, outline=True, canvas=CANVAS, origin=ORIGIN, shadows=True, post=None, after=None):
    """draw(): calls engine primitives. shadow: (x0, y0, x1, y1) MU rectangle at ground level that catches shadows."""
    E.begin(canvas[0], canvas[1], origin[0], origin[1])
    draw()
    if shadow is not None:
        E.shadow_catcher(*shadow)
    if shadows:
        E.cast_shadows()
    if outline:
        E.outlines()
    if after is not None:
        after()
    img = E.render_rgba()
    if post is not None:
        post(img)
    return crop(img, origin)


def crop(img, origin):
    a = img[..., 3] > 0
    if not a.any():
        return np.zeros((1, 1, 4), np.uint8), (0, 0)
    ys, xs = np.nonzero(a)
    r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return img[r0:r1, c0:c1].copy(), (origin[0] - c0, origin[1] - r0)
