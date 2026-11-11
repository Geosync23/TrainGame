# People sprites

Made by `people.py` (the drawing) and `sprites_people.py` (registers them with the pipeline). Review pictures:
`python3 tools/pixelart/review_people.py` writes `out/people-contact.png` and `out/people-closeup.png`;
`python3 tools/pixelart/review_carry.py` (after `build.py`) writes `out/people-carry.png` (carried goods at the hands
offset and the handcart at its pusher offset, four facings).

**People v2** (2026-11-11): the designer signed off the sample in `plans/pixel/people-v2/` (the richer style's form,
size and detail in our palette, light and outline rule; less colour, no blush, no bounce), and the lead raised the size
to about 26 px. An adult is 26 px from heel to crown without the outline (a top hat adds 2), a child 18. The 14 px set
before it is parked in `people_v1.py`: kept for the record, not built (a module named `sprites_*.py` would be picked
up by `build.py`, so it has no such wrapper).

## Keys

`ppl/<who>/<anim>/<dir>/<f>`, as in the contract (`plans/proto-sprites.md`).

- **All four facings are drawn: `se`, `ne`, `sw`, `nw`.** Each is lit from the upper left. **The renderer must
  NOT mirror people**: a mirrored frame would put the light on the wrong side.
- Anchor: the point between the feet, at ground level. Alpha is hard (0 or 255); no shadow is baked in.

## What exists

| who | anims (frames) |
|---|---|
| `agent` | idle 2, walk 4, punch 3, carry 4, push 4, throw 3, wave 2, lantern 2 |
| travellers: `man_top`, `man_bowler`, `man_bag` (carpetbag), `woman_bonnet`, `woman_shawl` (basket), `child`, `worker`, `porter` (trunk on the shoulder), each also `.b` | idle 2, walk 4, ticket 2, board 3 |
| townsfolk: `cowhand`, `smith` (hammer), `storekeeper`, `barkeep` | idle 2, walk 4 |

320 keys, 896 frames.

- `wave`: waving a train off (play 0-1 back and forth). `lantern`: standing with a lit lantern (dusk).
- Walk frames: pass, stride, pass, stride; frame 0 also serves as standing. Idle frame 1 is a breath.
- `board`: foot on the step, up, in; frames are drawn 0, 2 and 4 px higher (meta `lift_px`).

## For the renderer (PIX_ATLAS.extra)

- `ppl/agent/carry/<dir>/<f>`: `hands`, the offset in px from the feet to the carried item's anchor:
  se, sw (0, -6); ne (6, -11), nw (-6, -11). In ne and nw draw the item before the agent (it shows past his shoulder).
- `ppl/agent/push/<dir>/<f>`: `grip`, the hands' offset (se, ne (6, -6); sw, nw (-6, -6)). The committed handcart's
  `pusher` offset (2.25u) still puts the handles in his hands.
- A person sorts as a box 3.25u tall (`PIX.PERSON_H` in index.html).

## How a frame is built (for changes)

Each type is put together from parts (pixel maps, 15 columns, column 7 is x = 0): a hat or hair part (`HATS`), a face
or the back of the head (`FACES`, `BACKS`), and a body (`BODIES`; the child has its own `CHILD` maps). `TYPES` says
which parts each type uses. Arms are drawn from pose paths (`POSES`: the inner line of the arm, thickened to 2 px,
lit on the outside or on top; a level forearm in front of the body is shaded underneath so it reads against the coat),
legs from `LEGS` (the far leg never takes the outline's colour, so a stride reads), skirt hems from `SKIRT`, held
things from `HELD`. `sw` and `nw` are `se` and `ne` mirrored, then re-lit: in each row, each run of one colour ramp
gets its two end shades swapped, which puts the lit edge back on the left and keeps buttons and folds as drawn.
Palette swaps are in `SPECS` (roles such as hat, coat, vest, dress mapped to the shared ramps in `engine.py`).
