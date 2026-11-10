# Sprite module: the pixel font (owner: pipeline). One frame per glyph, white, anchor at the left end of the
# baseline. Key: font/<character code>, e.g. font/65 for 'A'; PIX_ATLAS.extra['font/65'].adv is the advance.
import font as FT


def register(reg):
    for ch, (img, adv) in FT.glyphs().items():
        reg.add(f'font/{ord(ch)}', 'font', [(img, (0, FT.BASE))], dict(char=ch, extra={'adv': adv}))
