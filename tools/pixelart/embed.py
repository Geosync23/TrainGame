#!/usr/bin/env python3
# Writes the pixel art (sprite sheets as base64 PNG, and the atlas) into index.html as one generated section:
#     // ==== Section: pixel art data (generated) ====
#     const PIXEL_ART = { atlas: {...}, sheets: { trains: 'data:image/png;base64,...', ... } };
#     // ==== End: pixel art data (generated) ====
# Run after build.py:  python3 tools/pixelart/embed.py [path/to/index.html]
# The first run puts the section just before "// ==== Section: random numbers (seeded) ====" (it only adds
# lines); later runs replace only the text between the two marker lines. Nothing else in the file changes.
import os, sys, json, base64

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
START = '// ==== Section: pixel art data (generated) ===='
END = '// ==== End: pixel art data (generated) ===='
ANCHOR = '// ==== Section: random numbers (seeded) ===='


def section():
    with open(os.path.join(OUT, 'atlas.json')) as f:
        atlas = json.load(f)
    sheets = {}
    for s in atlas['sheets']:
        with open(os.path.join(OUT, s['file']), 'rb') as f:
            sheets[s['name']] = 'data:image/png;base64,' + base64.b64encode(f.read()).decode('ascii')
    lines = [START,
             '// Made by tools/pixelart/build.py and written here by tools/pixelart/embed.py. Do not edit by hand:',
             '// change the art in tools/pixelart/ and run both scripts again. See tools/pixelart/README.md.',
             '// PIXEL_ART.atlas.sprites[name] = { sheet: index into atlas.sheets, frames: [[x, y, w, h, ax, ay], ...], notes }',
             '// PIXEL_ART.sheets[atlas.sheets[i].name] = the sheet as a PNG data URL.',
             'const PIXEL_ART = {',
             '  atlas: ' + json.dumps(atlas, separators=(',', ':')) + ',',
             '  sheets: {']
    for name, url in sheets.items():
        lines.append(f"    {json.dumps(name)}: '{url}',")
    lines += ['  },', '};', END]
    return '\n'.join(lines) + '\n'


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'index.html')
    path = os.path.abspath(path)
    with open(path, encoding='utf-8') as f:
        html = f.read()
    sec = section()
    if START in html:
        a = html.index(START)
        b = html.index(END, a) + len(END)
        if html[b:b + 1] == '\n':
            b += 1
        html = html[:a] + sec + html[b:]
    else:
        if ANCHOR not in html:
            raise SystemExit(f'cannot find {ANCHOR!r} in {path}')
        a = html.index(ANCHOR)
        html = html[:a] + sec + '\n' + html[a:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'wrote the pixel art section into {path}: {len(sec.encode("utf-8")) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
