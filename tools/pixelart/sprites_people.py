# Sprite module: people (owner: the people artist). Keys follow the contract (plans/proto-sprites.md):
# ppl/<who>/<anim>/<dir>, frames numbered /0, /1, ... by the pipeline. All four facings are drawn, lit from the
# upper left: the renderer must not mirror people. The drawing is in people.py; see README-people.md.
import people as PE


def register(reg):
    for name, frames, meta in PE.build_all():
        try:
            reg.add(name, 'people', frames, meta, indexed=True)
        except TypeError:          # an older registry without the indexed option
            reg.add(name, 'people', frames, meta)
