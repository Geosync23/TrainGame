# Taking Railhead over on a new account

Written 2026-11-14 by the lead session that built versions 1 to 13, for whoever opens this repository next: the
designer on a new account, and the Claude session that will work for them there. It assumes you know nothing
about the project.

Everything needed to carry on is in this repository. Nothing has to be remembered from the old account's
conversations.

## 1. What the project is, in a few lines

- A railroad game for phones, set in 1866. Working title Railhead (the repository is called TrainGame; CLAUDE.md
  still calls it "TBN Train Game").
- One file, `index.html`, holds the whole game: about 6.7 MB, most of it the pixel art, embedded.
- It started on 2026-10-31 from the designer's design document (`docs/Railhead_GDD_original_2026-10-31.pdf`),
  was first built as a 3D game with three.js, and since 2026-11-10 the game you get by default is drawn in 2D
  pixel art. The 3D worlds are still in the file, switched off.
- The designer decides what the game is. A Claude "lead" session plans, hires helper sessions to build, tests,
  and reports. The rules for that are in `CLAUDE.md`.

## 2. What travelled with the repository, and what did not

| Thing | Travelled? | What to do |
|---|---|---|
| The game, tests, tools, art sources | Yes | Nothing |
| The design, notes, plans, history | Yes | Read in the order in section 5 |
| The designer's answers to surveys | Yes, as copies in `plans/answers/` | The live pages stay on the old account |
| The playable link (`claude.ai/artifact/215immEY4Skh13fN9fN2db`) | No. It is private to the old account | Publish `index.html` again from the new account; you get a new link (section 4) |
| Every other `claude.ai/artifact/...` link in the notes | No | Treat them as history. The source of each page is in `plans/*.html` and can be published again |
| The old conversations | No | Not needed; the notes hold what matters |
| The old session's working copies of helpers' work | No | Not needed; everything was merged |
| The designer's usage budget rule | It is a habit, not a file | See section 7 |
| Phone notifications | Tied to the account's own Claude app | Work again once the new account's app is signed in |

## 3. The branch

The whole project is on `main`. On 2026-11-14 the designer asked the old lead to bring `main` up to date, and
it now holds every commit (about 600, from 2026-10-31).

Until then all the work lived on a branch called `ccr-59cb4c1f-rnscv9`, the one branch the old session was
allowed to push to. It is kept and is identical to `main` as of the transfer. Many notes name it; read that
name as "the work branch of the old account". It can be deleted once the new account is settled.

A new Claude session is usually given its own new branch to work on, starting from `main`. That is fine: work
there, test, and ask the designer before putting anything onto `main`.

To hand the repository itself to a new GitHub account: on github.com, Settings, then either "Collaborators"
(add the new account and keep the repository where it is) or "Transfer ownership" at the bottom of the page.
Then, on the new Claude account, connect GitHub and allow Claude to reach this repository.

## 4. Setting up

In a Claude cloud session, with the repository attached:

```
npm install                          # fetches three.js r128 for the tests
node tests/run-one.js check-boot     # one quick check that the game opens
npm test                             # every check, before every push
```

What the tests and tools need:

| Need | In Claude's cloud sessions | On another machine |
|---|---|---|
| Node 22 | Present | Install Node 22 |
| Playwright with Chromium (tests) | Present (version 1.63 when this was written). Do not install another | `npm install --no-save playwright@1.63` then `npx playwright install chromium` |
| three.js r128 | `npm install` | `npm install` |
| Python 3 with numpy and Pillow (only to redraw art) | Present | `pip install numpy pillow` |

Playwright is deliberately not listed in `package.json`: the cloud machine brings its own, and a second copy
would not find the browser.

The test machine cannot reach cdnjs, where the game loads three.js from. The tests serve the same release from
`node_modules` instead, so the page under test is unchanged.

**Publishing a playable link.** The lead publishes `index.html` with the Artifact tool. The first publish from
the new account makes a new private link; publishing the same file again later updates that link. Put the new
link at the top of `plans/handover.md` when you have it. The page loads three.js from cdnjs, which the artifact
host allows.

**Redrawing art.** `python3 tools/pixelart/build.py` draws the sheets, then `python3 tools/pixelart/embed.py`
writes them into `index.html`. `docs/STATE.md` has the details. `node tests/run-one.js check-atlas` guards the
size.

## 5. What to read, in order

A new lead session should read these before doing anything:

1. `CLAUDE.md`: the house rules. They are firm.
2. `plans/handover.md`: the short current note.
3. `docs/STATE.md`: where the project is.
4. `backlog.md`: the todo list; the designer's own reports are at the top.
5. `docs/ROADMAP.md`: what is next, and what waits on the designer.
6. `design-doc.md`, section 0: the decisions D1 to D34. Where section 0 and the rest of the design document
   differ, section 0 wins; much of the rest describes the larger game not yet built.
7. `DEV_NOTES.md`: do not read it end to end (it is about 2,100 long lines). Use its list of headings and read
   the part for the system you are about to touch. The parts that describe the game as it now plays are "Prototype
   (D25)", "D27", "D29", "D30", "D31", "D32", "D33", "D32 stage 3" and "D34". The earlier parts describe the
   parked 3D game.
8. `docs/HISTORY.md` when you want to know why something is the way it is.

## 6. How the work is done here

`CLAUDE.md` is the authority. The habits that grew around it:

- **The designer is new to code and git.** Plain words, no jargon, no emojis anywhere.
- **Plan, then build, then review.** Anything bigger than a small fix gets a short plan the designer agrees to
  first. One piece at a time.
- **Questions go to the designer as a survey page**: a published page with a choice per question, the lead's
  suggestion marked, a note box, and the answers saved in the page's own database. The designer says "answered";
  the lead reads the answers. Copy the pattern from `plans/d32-questions.html`. When everything waits on an
  answer, send a notification to the designer's phone with the link.
- **A lead and helpers.** The lead session hires helpers inside itself, each in its own working copy of the
  repository. Helpers commit often and never push. The lead merges, runs the full test, and pushes. Give each
  helper its own name prefix and section in `index.html` so their work does not collide; the past briefs in
  `plans/d27-tech.md` and `plans/d32-tech.md` show how the work was divided.
- **Test before every push.** `npm test`, all of it. A check known to wobble when the machine is busy may be
  run again alone (`docs/STATE.md` lists them); anything else that fails is fixed first. Do not run other heavy
  work while the full test runs; it makes more checks wobble.
- **Same result every time.** The game uses a seeded random number generator, never `Math.random()`.
- **Cut things are parked, never deleted.** Every replaced feature is still in the file behind a switch. The
  switches are listed in `docs/STATE.md`.
- **Old saves must still load.** The save format number is 19; new stores are added as optional fields.
- **Keep the notes current** in the same commit as the work: `design-doc.md` for decisions, `DEV_NOTES.md` for
  how it works, `backlog.md` for small bugs found on the side, `plans/handover.md` for the next session.
- **Memory.** Measure with `python3 tools/context-usage.py`; never hand over below 50%, never go above 80%.

## 7. The designer's budget rule

The designer watches two usage meters on their Claude plan, an overall one and one for the most capable model,
and has asked the lead to stop at 80% of either. The lead cannot read the meters and must ask the designer for a
reading. To spend less, the lead and the hardest system work used the most capable model, and play, town and
art work went to the next model down. The new account's plan and limits may differ: ask the designer at the
start what the limits are and how they want models used.

## 8. The first message for the new session

The designer can paste this to start:

> This is Railhead, a phone train game, taken over from another account. Everything is on `main`. Read `docs/TRANSFER.md` and follow its reading order, run `npm install` and the boot
> check, then tell me in a few plain lines where the project stands and what you suggest doing first. Do not
> build anything yet.

## 9. First jobs waiting

In the old lead's suggested order (`docs/ROADMAP.md` has the detail):

1. Publish `index.html` from the new account so the designer has a playable link again.
2. The two bugs the designer reported after playing version 13 (top of `backlog.md`): hold to walk does not work
   out on the line; the rail workers are not seen leaving their tents and boarding the work train in the morning.
3. The review survey owed to the designer: the provisional choices made while building the line, the one world,
   the bigger town and the join-in games have not been reviewed. They are gathered in `docs/ROADMAP.md`.
4. Then whatever the designer chooses next.

## 10. Things that will trip you

- `index.html` is too large to read whole. Search it (`grep -n "==== Section"` lists its sections) and read the
  part you need.
- The cloud test machine has no graphics chip. Frame times measured there are for comparing one build with
  another; they say little about a real phone.
- The full test takes a long time (about 80 checks, each opening the game several times). Start it in the
  background and do not edit the files it is testing while it runs.
- A helper once committed its link to `node_modules`; merged, it broke the tests with ELOOP errors. The fix, if
  it happens again: `git rm --cached node_modules; rm node_modules; npm install`.
- `CLAUDE.md` opens by calling the game 3D with an isometric three.js camera. That was true until 2026-11-10; the
  default game is now 2D pixel art from one fixed view, and three.js draws only the parked older worlds. The rules
  in `CLAUDE.md` still stand; its wording is the designer's to change.
- Notes older than 2026-11-10 describe the 3D game. Where an old note and `docs/STATE.md` disagree,
  `docs/STATE.md` is right.
- GitHub reports that the repository moved to `github.com/Geosync23/TrainGame`; the older lower-case address
  still works.
