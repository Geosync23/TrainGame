# Sprite module: people (owner: the people artist). Keys follow the contract (plans/proto-sprites.md):
# ppl/<who>/<anim>/<dir>, frames numbered /0, /1, ... by the pipeline. All four facings are drawn, lit from the
# upper left: the renderer must not mirror people. The drawing is in people.py (people v2, signed off) and
# people_d27.py (the D27 additions: seated travellers, the agent's handling, new townsfolk); see README-people.md.
import people as PE
import people_d27 as P27


def register(reg):
    for name, frames, meta in PE.build_all():
        reg.add(name, 'people', frames, meta, indexed=True)
    for name, frames, meta, indexed in P27.build_all():
        reg.add(name, 'people', frames, meta, indexed=indexed)
