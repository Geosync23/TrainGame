# Sprite module: people (owner: the people artist). Keys follow the contract (plans/proto-sprites.md):
# ppl/<who>/<anim>/<dir>, frames numbered /0, /1, ... by the pipeline. Only se and ne are drawn; the renderer
# mirrors them for sw and nw. The drawing itself is in people.py.
import people as PE


def register(reg):
    for name, frames, meta in PE.build_all():
        try:
            reg.add(name, 'people', frames, meta, indexed=True)
        except TypeError:          # an older registry without the indexed option
            reg.add(name, 'people', frames, meta)
