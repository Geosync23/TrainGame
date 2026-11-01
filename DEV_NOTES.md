# Railhead: developer notes

Read this first every session, together with `design-doc.md` (the design) and `CLAUDE.md` (how we work).
A fresh session should also read `plans/handover.md` if it exists.

## What the project is

Railhead (working title) is an isometric, low-poly railroad game set in 1866, built for phones first.
The whole game is one file, `index.html`, using three.js r128 loaded from cdnjs.
The full design is in `design-doc.md`. The original PDF it was converted from is kept in `docs/`.

## Platform decisions (2026-11-01)

These override the original design document wherever they disagree. Details are in `design-doc.md`, section 0.

- Phones first, touch first, portrait and landscape. A computer with mouse and keyboard comes second.
- One HTML file, three.js r128 from cdnjs. There is no build step, no TypeScript and no Preact.
- The camera turns in 90-degree steps. The elevation is fixed at the true isometric angle.
- Size and speed targets are scaled down for phones (see design-doc section 0).

## How to test

1. Install the test tools once: `npm install`. This only fetches a copy of three.js r128 used by the tests.
2. Run every check: `npm test`. It must pass before every push.
3. Screenshots land in `test-output/`. That folder is not saved to git.

The checks open `index.html` in Chromium (through Playwright) at phone size (390 x 844 portrait, 844 x 390 landscape, with touch on).
They fail on any console error.

Network note: the cloud test machine cannot reach cdnjs, because its network policy blocks it.
When that happens, the test script serves the identical three.js r128 file from `node_modules/three` instead.
The page itself still points at cdnjs.

Current checks:
- `tests/check-boot.js`: the page loads in portrait and landscape with no errors, three.js is r128, and something is drawn. It saves screenshots.

## Sections of index.html

- `config`: tunable constants.
- `renderer and camera`: WebGL renderer, isometric orthographic camera, resize.
- `world (placeholder)`: lights and a ground slab.
- `main loop`: the render loop. It exposes `window.__railhead` for the tests.

## Draw calls

- Setup build: 1 draw call.

## Next

Write a short plan for the first playable slice of milestone M0, adapted for phones and one file, for the designer to review.
Do not build it until it is approved.
