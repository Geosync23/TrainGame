# Sprite module: rolling stock and steam (owner: pipeline, trains and track artist).
import math
import stock as ST
from registry import one

DIR_X = {'e': 1, 'w': -1}   # e: facing world +x (the viewer's lower right), w: facing -x (upper left)
ANCHOR = 'centre of the coupled length, on the track centre line, at ground level'


def register(reg):
    sh = (-34, -14, 44, 14)
    for d, s in DIR_X.items():
        for kind in ('passenger', 'freight'):
            fr = [one(lambda k=k: ST.loco(s, k * math.pi / 2, kind), shadow=sh)[0] for k in range(4)]
            reg.add(f'train.loco_{kind}.{d}', 'trains', fr,
                    dict(length=ST.LEN['loco'] / 4, anchor=ANCHOR,
                         frame_note='wheels and rods turning; play 0-1-2-3 while moving forwards, 3-2-1-0 backwards'))
            reg.add(f'train.tender_{kind}.{d}', 'trains', one(lambda: ST.tender(s, kind), shadow=sh),
                    dict(length=ST.LEN['tender'] / 4, anchor=ANCHOR))
        reg.add(f'train.coach.{d}', 'trains', one(lambda: ST.coach(s), shadow=sh), dict(length=ST.LEN['coach'] / 4, anchor=ANCHOR))
        reg.add(f'train.boxcar_closed.{d}', 'trains', one(lambda: ST.boxcar(s, False), shadow=sh),
                dict(length=ST.LEN['boxcar'] / 4, anchor=ANCHOR))
        reg.add(f'train.boxcar_open.{d}', 'trains', one(lambda: ST.boxcar(s, True), shadow=sh),
                dict(length=ST.LEN['boxcar'] / 4, anchor=ANCHOR))
        reg.add(f'train.flatcar_empty.{d}', 'trains', one(lambda: ST.flatcar(s, None), shadow=sh),
                dict(length=ST.LEN['flatcar'] / 4, anchor=ANCHOR))
        reg.add(f'train.flatcar_loaded.{d}', 'trains', one(lambda: ST.flatcar(s, 'goods'), shadow=sh),
                dict(length=ST.LEN['flatcar'] / 4, anchor=ANCHOR))
    for k, r in enumerate((1.4, 2.2, 3.0)):
        reg.add(f'fx.smoke{k + 1}', 'trains', one(lambda: ST.smoke(r, k + 3), outline=False, shadows=False),
                dict(anchor='the bottom of the puff'))
