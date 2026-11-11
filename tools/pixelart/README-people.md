# People sprites

Made by `people.py` (the drawing, people v2), `people_d27.py` (the D27 additions, drawn with the same rig; people.py
is untouched, so every signed-off frame is unchanged) and `sprites_people.py` (registers both). Review pictures:
`python3 tools/pixelart/review_people.py` writes `out/people-contact.png` and `out/people-closeup.png`;
`python3 tools/pixelart/review_carry.py` (after `build.py`) writes `out/people-carry.png` (carried goods at the hands
offset and the handcart at its pusher offset, four facings).
`python3 tools/pixelart/review_d27.py` writes the D27 sheets: `out/people-d27-contact.png` (every new key),
`people-d27-handling.png` (the agent's handling, four facings, a stand-in crate or sack at `extra.hands`, a yellow
pixel at `extra.grip`), `people-d27-seated.png` (every traveller's seated, sitDown, standUp, benchSit and climb
frames, with a stand-in 5 px seat and the punched mark), `people-d27-town.png` (the townsfolk with who they are) and
`people-d27-coach.png` (a stand-in coach floor with rows of sitters and the agent punching in the aisle).

**People v2** (2026-11-11): the designer signed off the sample in `plans/pixel/people-v2/` (the richer style's form,
size and detail in our palette, light and outline rule; less colour, no blush, no bounce) at the sample's size: after
a 26 px trial the designer chose about 20. An adult is 20 px from heel to crown without the outline (a top hat adds
1), a child 14. The 14 px set
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

D27 adds (people_d27.py):

| who | anims (frames) |
|---|---|
| `agent` | lift 3, shoulder/idle 2, shoulder/walk 4, roll 4, drag 4, truck 4, heave 4, stackHigh 3, door 3, climb 2, handOver 2, pull 4 |
| every traveller (16 keys) | sit 2, sitTicket 2, sitDown 2, standUp 2, climb 2, benchSit 1 |
| new townsfolk: `banker`, `hotelkeeper`, `vaquero`, `printer`, `barber`, `sheriff`, `undertaker`, `preacher` (a book), `teacher` (books), `launderer` (a basket of washing), `storekeeper.b` (the feed and seed man), `cowhand.b` (the second cowhand) | idle 2, walk 4, talk 2, benchSit 1 |
| `cowhand`, `smith`, `storekeeper`, `barkeep` | + talk 2, benchSit 1 |
| `man_bowler`, `woman_shawl`, `child` (and `.b`), standing in as the assayer, a wife and the pupils | + talk 2 |
| `ppl/mark/punched/<dir>` | 1 (the punched ticket, 2 x 3 px) |

All together 2,288 keys (896 before), sheet-people 512 x 1308 px, 81.7 KB.

- `wave`: waving a train off (play 0-1 back and forth). `lantern`: standing with a lit lantern (dusk).
- Walk frames: pass, stride, pass, stride; frame 0 also serves as standing. Idle frame 1 is a breath.
- `board`: foot on the step, up, in; frames are drawn 0, 2 and 4 px higher (meta `lift_px`).
- Seated (`sit`, `sitTicket`, `benchSit`, the second `sitDown` and first `standUp` frame): the anchor is the floor
  straight below the hips (the seat's centre at floor level); the seat top is 5 px (0.64u) above it, seat to crown
  about 15 px. In a coach the luggage is in the rack (sit); on a platform bench it stands beside the feet (benchSit);
  a basket stays on the lap. `standUp` is `sitDown` backwards (the same pictures, stored once).
- `climb`: the coach end steps, a hand on the grab rail; no lift is drawn, the renderer raises the figure.
- `talk`: an open hand, then a nod; also the keeper taking a delivered good at the door.

## For the renderer (PIX_ATLAS.extra)

- `ppl/agent/carry/<dir>/<f>`: `hands`, the offset in px from the feet to the carried item's anchor:
  se, sw (0, -3); ne (5, -8), nw (-5, -8). In ne and nw draw the item before the agent (it shows past his shoulder).
- `ppl/agent/push/<dir>/<f>`: `grip`, the hands' offset (se, ne (5, -6); sw, nw (-5, -6)). The committed handcart's
  `pusher` offset (2.25u) still puts the handles in his hands.
- A person sorts as a box 2.5u tall (`PIX.PERSON_H` in index.html).
- D27, given per frame (`extra['ppl/agent/<anim>/<dir>/<f>']`): `hands` and `behind` on lift, shoulder/idle,
  shoulder/walk, stackHigh, handOver (where the held good's anchor goes, the carry convention; behind: draw the good
  before the agent); `grip` on roll, drag, truck, heave, door, pull (the midpoint of the hands, as the top-left of the
  hand pixel; for pull the one hand on the handle, behind him).
- `extra['ppl/<who>/sit|sitTicket/<dir>/<f>'].mark`: where the punched-ticket mark `ppl/mark/punched/<dir>` goes (its
  top-left pixel, from the sitter's anchor): on the hatband's forward end, or just under the collar.

## How a frame is built (for changes)

Each type is put together from parts (pixel maps, 13 columns, column 6 is x = 0): a hat or hair part (`HATS`), a face
or the back of the head (`FACES`, `BACKS`), and a body (`BODIES`; the child has its own `CHILD` maps). `TYPES` says
which parts each type uses. Arms are drawn from pose paths (`POSES`: 1 px wide; a level forearm is 2 px, lit on top and
shaded underneath, so the punching forearm reads against the coat),
legs from `LEGS` (the far leg never takes the outline's colour, so a stride reads), skirt hems from `SKIRT`, held
things from `HELD`. `sw` and `nw` are `se` and `ne` mirrored, then re-lit: in each row, each run of one colour ramp
gets its two end shades swapped, which puts the lit edge back on the left and keeps buttons and folds as drawn.
Palette swaps are in `SPECS` (roles such as hat, coat, vest, dress mapped to the shared ramps in `engine.py`).
