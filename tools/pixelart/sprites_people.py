# Sprite module: people (owner: the people artist). The first version, made from the mockup's pixel maps by
# people.py; the people artist takes this module and people.py over.
import people as PE


def register(reg):
    for name, frames, meta in PE.build_all():
        reg.add(name, 'people', frames, meta)
