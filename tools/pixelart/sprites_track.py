# Sprite module: track, crossovers, buffer stops, switch stands (owner: pipeline, trains and track).
import track as TR
from registry import one

# Crossovers are made for each (track spacing, length along x), in game units. Change when the layout is fixed.
CROSSOVERS = [(3, 10), (5, 14)]


def register(reg):
    nb = dict(outline=False, shadows=False)
    reg.add('track.straight', 'track', one(lambda: TR.track_straight(), **nb),
            dict(anchor='start of the 1-unit piece (its -x end) on the track centre line', length=1))
    for sp, ln in CROSSOVERS:
        for kind in ('a', 'b'):
            for state in ('normal', 'reverse'):
                reg.add(f'track.crossover_{sp}u.{kind}.{state}', 'track',
                        one(lambda: TR.crossover(sp * 4, ln * 4, kind, state), **nb),
                        dict(anchor=f'x start of the piece on the centre line of the far track (z = 0); the near track is at z = +{sp}',
                             length=ln, spacing=sp,
                             note=('a: the crossover leaves the far track at x = 0 and joins the near track at x = length; '
                                   'b: leaves the near track at x = 0 and joins the far track. normal: both switches set '
                                   'for the straight tracks; reverse: set for the crossover')))
    for f in ('e', 'w'):
        reg.add(f'track.buffer.{f}', 'track', one(lambda: TR.buffer_stop(f), shadow=(-30, -14, 30, 14)),
                dict(anchor="the stop's beam on the track centre line; e stops trains running to +x, w stops trains running to -x"))
    for st in ('normal', 'reverse'):
        reg.add(f'prop.switch_stand.{st}', 'track', one(lambda: TR.switch_stand(st), shadow=(-20, -20, 30, 20)),
                dict(anchor='the stand base', note='normal: white target, set for the straight track; reverse: red target, set for the crossover'))
