# People sprites

Made by `people.py` (the drawing) and `sprites_people.py` (registers them with the pipeline). Review pictures:
`python3 tools/pixelart/review_people.py` writes `out/people-contact.png`, `out/people-closeup.png` and
`out/people-testscene.png`.

## Keys

`ppl/<who>/<anim>/<dir>/<f>`, as in the contract (`plans/proto-sprites.md`).

- **All four facings are drawn: `se`, `ne`, `sw`, `nw`.** Each is lit from the upper left. **The renderer must
  NOT mirror people**: a mirrored frame would put the light on the wrong side. (This changes the contract's
  "the renderer mirrors se for sw and ne for nw" for people; decided by the lead, 2026-11-10.)
- Anchor: the point between the feet, at ground level. Alpha is hard (0 or 255); no shadow is baked in.

## What exists

| who | anims (frames) |
|---|---|
| `agent` | idle 2, walk 4, punch 3, carry 4, push 4, throw 3, **wave 2**, **lantern 2** |
| contract travellers: `man_top`, `man_bowler`, `man_bag` (carpetbag), `woman_bonnet`, `woman_shawl` (basket), `child`, each also `.b` | idle 2, walk 4, ticket 2, board 3 |
| **extra travellers**: `worker`, `worker.b` (working man), `porter`, `porter.b` (working man with a trunk on his shoulder) | idle 2, walk 4, ticket 2, board 3 |
| **extra townsfolk**: `cowhand`, `smith` (blacksmith), `storekeeper`, `barkeep` (saloon keeper) | idle 2, walk 4 |

The ones in bold are not in the contract yet; the lead asked to keep them, so the contract can add them.

- `wave`: waving a train off (play 0-1 back and forth). `lantern`: standing with a lit lantern (dusk).
- Walk frames: pass, stride, pass, stride; frame 0 also serves as standing. Idle frame 1 is a breath.
- `board`: foot on the step, up, in; frames are drawn 0, 2 and 4 px higher (meta `lift_px`).

## Meta for the renderer

- `ppl/agent/carry/<dir>`: `hands`, the offset in px from the feet to the carried item's anchor:
  se and sw (0, -5), ne and nw (0, -7). In ne and nw draw the item before the agent. The contract's default
  (0, -9) puts the committed 0.7u crate over the agent's head; even at (0, -5) a 14 x 10 px crate hides the face,
  so smaller carried goods (with no ground shadow) would look better.
- `ppl/agent/push/<dir>`: `grip`, the hands' offset (se, ne (5, -3); sw, nw (-5, -3)); the test scene stands the
  agent 2.1u behind the committed handcart's centre.

## How a frame is built (for changes)

Each type has a hand-drawn pixel map of head, hat and body (`TPL`, front and back). Arms, legs, hands, held
things and the walk come from pose tables (`LEGS`, `SKIRT`, `arm_pts`, `held`), so every type shares the timing.
`sw` and `nw` are the `se` and `ne` maps mirrored and then re-lit: in each row, the shades within each run of one
colour ramp are put back in their unmirrored order, which keeps the light on the left.
Palette swaps are in `SPECS` (roles such as hat, coat, vest, dress mapped to the shared ramps in `engine.py`).
