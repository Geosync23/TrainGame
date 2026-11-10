# Sprite module: the pixel font (owner: pipeline). One sprite per glyph, white, anchor at the baseline's left end.
import font as FT


def register(reg):
    for ch, (img, adv) in FT.glyphs().items():
        reg.add('font.' + ch, 'font', [(img, (0, FT.BASE))], dict(advance=adv))
