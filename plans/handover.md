# Handover: start building M0 piece 1

Written 2026-11-01 at the end of the first session. Read this, then `CLAUDE.md`, `DEV_NOTES.md` and `design-doc.md` (section 0 first).

## Where things stand

- Setup is done and pushed on branch `ccr-59cb4c1f-rnscv9`:
  - `index.html` is a placeholder (ground slab, isometric camera, 1 draw call).
  - The checks run with `npm test` (boot at phone size in portrait and landscape, and no `Math.random`).
  - `design-doc.md` is the PDF converted word for word, plus section 0 with decisions D1 to D8.
- The designer approved the plan for M0 piece 1 and said "start building".
  - Plan (Claude Docs, has the answers table): https://claude.ai/artifact/5ysP6CghXJwzq9pKJ9ivTS
  - Survey page with saved answers: https://claude.ai/artifact/Rff43eTxzRrdcunq21MC16 (read with ArtifactData, collection `survey`, doc `answers`).
- The answers are already written into design-doc section 0 (D7, D8) and into the plan.

## The job: M0 piece 1

Build everything in the plan. The plan is the reference; read it first. In short:

- **Player character:** the final low-poly chunky kit from the style test page, with procedural walk and idle animation (design-doc section 17).
  - Tap the ground to walk there.
  - Press and hold to walk towards the finger; let go to stop.
  - Walking is a straight line across open ground, stopping at obstacles.
  - The camera follows the character with a 0.2 s soft lag.
- **Test yard:** built in code, on the track graph of section 6: straight and arc edges, tangent continuity, switches (5u through leg, 10u radius 30-degree diverging leg) and blocks.
  - Layout: an oval loop, a passing siding with two switches, and a short dead-end spur.
- **Switch stands:** tap one to walk to it and throw it (0.5 game minutes). The target disc is green for normal and red for reverse. A switch is locked while a train is on it or on a set route.
- **Train:** 4-4-0 No. 1 with a combine and a boxcar, as final low-poly models (section 17, "Trains" subsection).
  - Movement follows section 7: path history, acceleration a = 2.0 x power / mass, braking 3.0, speed limits (yard 1.0, diverging 1.5 u/min), and stopping 0.5u before a block it has not reserved.
  - Tap the train to walk to it and open its panel: Forward, Back, Stop, Send to track.
  - Send to track finds a route (A*, length plus 20u per diverging switch), throws the switches instantly (as M0 allows), locks them and drives there.
- **Clock:** integer game seconds, a tick of 8 game seconds, 10 ticks per real second at 1x. Buttons for pause, 1x, 2x and 4x.
- **Camera:** two buttons to turn it 90 degrees, pinch to zoom 0.6x to 4x, two-finger drag to look away, and a Centre button. All buttons are at least 48 px.
- **Computer extras:** WASD, Shift, click, wheel, Z/X, arrow keys, C and Space.
- **Saving:** the whole GameState goes to IndexedDB as gzipped JSON with `schemaVersion`. Save every game hour and on `visibilitychange`; load it on open. Keep a sample save in `tests/fixtures/` so later builds are checked against it.
- **Determinism:** sfc32 seeded RNG, sorted iteration, and commands validated then applied or refused. The sim code must never touch three.js or the DOM.

### Checks to add (all in `npm test`)

- Track geometry and validation limits.
- Switch throw and lock.
- A yard move takes the right route and stops correctly.
- Determinism: two runs, same seed and commands, give the same state hash after 3 game days.
- Save, reload, and the hash matches; the fixture save loads.
- Touch: a tap walks, a hold walks towards the finger, a tap on a switch throws it, a pinch zooms.
- Screenshots in both orientations, with the draw calls reported. The budget is under 100; aim for about 15 to 25.

## Gotchas

- **cdnjs is blocked on the cloud test machine.** `tests/browser.js` serves the identical r128 file from `node_modules/three` instead. Run `npm install` first in a fresh container.
- **three.js r128 has no `BufferGeometryUtils` on the global build.** Write a small merge helper in the file. `InstancedMesh` exists in r128.
- **Art reference:** the style test page, "Railhead style and character tests", at https://claude.ai/artifact/LP1jb2HoXzyQ4wccMME4bQ. Read it with the Artifact tool's `read` action to match the low-poly scene and character pitch 1 (chunky). The designer signs off the look, so show screenshots.
- **No surfaces exactly on top of each other.** Lift ballast, ties and rails slightly so phones don't flicker.
- **Keep index.html in labelled sections** and update the section list in `DEV_NOTES.md`.
- **Talking to the designer:** they are new to git and Claude Code. Use plain words and no emojis.

## How to work

The plan is approved, but this is a big piece. Build it in steps:

1. Sim core and track.
2. Train.
3. Character and controls.
4. Models.
5. Saving.

Run `npm test` and commit after each step that passes. Hand the finished piece over for review with screenshots and the draw-call count.

## Open questions for the designer

None blocking piece 1. Still open in design-doc section 23: touch gestures for panels and the context menu (for M1), and the original design questions.
