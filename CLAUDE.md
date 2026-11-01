# TBN Train Game

A train game for phones: 3D, seen from an isometric view, made with three.js in an HTML page that runs in the browser.

## Read first, every session
1. `DEV_NOTES.md`: how the project works, how to test it, and what's next. Its "Next" section names the current job.
2. `design-doc.md`: what the project is meant to be. It's the single source of truth for the design, with all open questions in its last section.

If either file doesn't exist yet, create it in the first session and keep it current from then on.

## How the game is built
- **One HTML file** (`index.html`) holding the whole game, so it can be opened, shared and published as a single page. Split it into more files only if I agree.
- **three.js loaded from cdnjs** at one fixed version, written out in full (for example `three.js/r128`), never "latest". Changing the version is its own reviewed step.
- **Isometric view:** an orthographic camera (no perspective) at a fixed isometric angle. Any change to the camera angle or zoom is a design decision for me.
- **The game must give the same result every time from the same start.** Use a seeded random number generator, never `Math.random()`, so a bug can be replayed and tests can compare one build with another.
- **Keep the file organised** in clearly labelled sections (for example `// ==== Section: track ====`), and keep a short list of the sections in `DEV_NOTES.md`.

## Phones first
- Design and test at phone size first, in both portrait and landscape; a computer is the second check.
- **Touch controls** first: taps, drags and pinch to zoom, with buttons big enough for a thumb. Mouse and keyboard can come as extras.
- **Keep it fast on a phone:** watch the number of draw calls (merge or reuse meshes, share materials, use instancing for repeated things like sleepers, rails and trees), keep textures small, and say in each handover how many draw calls a busy scene uses.
- **No surfaces lying exactly on top of each other** (they flicker on phones); lift one slightly instead.
- **Save the player's progress** in the browser so closing the page doesn't lose it, and check that an old save still loads after a change.

## Testing
- Every change is checked in a real browser (Playwright with Chromium) at phone size: the page loads with no errors in the console, the game runs, and a screenshot shows it looks right.
- As the game grows, add small check scripts for its main parts (laying track, trains moving and stopping, saving and loading) and a quick script that runs them all. Run it before every push.

## Talking to me
- I'm new to Claude Code and git. Explain things in plain language, with no jargon. When a technical word can't be avoided, say what it means the first time.
- No emojis in anything for me: messages, files, pages or commit messages.
- When you finish a piece of work, tell me in a few lines what you built, any judgement calls you made, and what the tests showed. If a test failed or a step was skipped, say so plainly.
- Ask me before decisions that are mine to make (what the project should do or look like). Don't ask about technical details you can sensibly decide yourself; just tell me what you chose.

## How we work
- **Plan before building.** Anything bigger than a small fix starts with a short plan I can review. Don't build it until I agree.
- **One piece at a time, then review.** Finish one piece of work, stop, and hand it over for review (with screenshots or a playable link where that helps). Don't start the next piece until I sign off.
- **Small, careful edits.** Change only what the task needs. Never rewrite a whole file when a small edit will do.
- **Test before saving to GitHub.** Run the project's checks before every push. Never push when a check fails. If there are no checks yet, suggest some.
- **Commit and push at the end of each piece of work**, with a clear message saying what changed and why, so nothing is lost when the session ends.
- **Found a small bug outside the current task?** Add it to `backlog.md` instead of fixing it on the side.
- **Keep the notes current.** Update `DEV_NOTES.md` as you go so a fresh session can pick up from it.
- **Update `design-doc.md` when a design decision is made**, in the same commit as the work that depends on it, and move answered questions out of its Open questions.

## My rules
- **Cut things are parked, never deleted.** When something is cut, mark it cut in `design-doc.md` (with the date and my reason) and keep it on record. Code already built for it stays switched off; taking it out is its own reviewed step.
- **Every page you publish for me leaves room for my answer.** A plan, survey or results page has a place on the page itself for me to comment and answer its questions, so nothing I write there is lost.
- **Don't create pull requests unless I ask.**
- **Questions for me always come as an interactive survey** (added 2026-11-01): a published page with a choice per question (your suggestion marked) and a note box, with my answers saved on the page so they are not lost. Always do this.
- **Workers stay inside the lead session** (added 2026-11-01): hire them as helpers within the session, not as separate sessions.

## Memory and handover
- From about 60% of your context, judge case by case whether to hand over: if a big task is coming up, hand over before starting it; otherwise keep working a little longer.
- 80% is the hard cap: never go above it.
- Warn me early when your memory is getting full, or when the next task looks big enough to fill it. Don't wait for the automatic summary.
- To hand over: write `plans/handover.md` for a fresh session (what you built, loose ends, gotchas, how to test, open questions for me), push it, and stop. A fresh session reads the latest handover note first.
- **Hand over on your own** (added 2026-11-01): when it is time, the lead writes and pushes the handover note, then starts the new lead session itself (on the same branch, told to read `plans/handover.md` first) without waiting to be asked, and tells me it has done so.
