# Railhead

Railhead (working title) is a railroad game for phones, set in 1866. You run a small country station: you throw
the switches, sell and punch tickets, unload freight and cart it to the shops in town, and your crew builds a new
line east into wild country, with you joining in the work if you like. A town of 41 people lives beside the
station and a second town waits at the end of the line.

The whole game is one file, `index.html`. Open it in a browser and it plays. There is nothing to build or install
to play it.

**New here, or picking the project up on a new account? Read `docs/TRANSFER.md` first.** It says what moved with
this repository, what did not, how to set up, and what to read in what order.

## Where the work is

All of the work is on the branch **`ccr-59cb4c1f-rnscv9`**. The `main` branch holds only the first, empty
commit. Until the two are brought together (see `docs/TRANSFER.md`, "The branch"), look at the work branch.

State on 2026-11-14: version 13. The station day, the town, the buildings you can enter, the line and the six
join-in games played in the world are all built and tested (81 checks). Two bugs reported by the designer are
open; they are at the top of `backlog.md`.

## The documents

| Read this | To find out |
|---|---|
| `docs/TRANSFER.md` | How to take the project over: setup, what did not travel, the first session |
| `docs/STATE.md` | Exactly where the project is now: what plays, every switch, the layout of the file, the tests |
| `docs/HISTORY.md` | Where it came from: every stage and decision in order, and why direction changed |
| `docs/ROADMAP.md` | Where it is headed: next steps, decisions waiting on the designer, open questions |
| `backlog.md` | The todo list: known bugs and small jobs, the designer's reports first |
| `design-doc.md` | The design. Section 0 lists every decision (D1 to D34) and overrides the rest where they differ |
| `DEV_NOTES.md` | The builders' notes, one part per piece of work: how each system works and why |
| `CLAUDE.md` | The designer's house rules for any Claude session working here. Follow them |
| `plans/handover.md` | The short note a fresh lead session reads first |
| `plans/README.md` | An index of the plans folder (plans, art contracts, and the pages shown to the designer) |
| `plans/answers/` | The designer's saved answers to every survey and review page |
| `docs/Railhead_GDD_original_2026-10-31.pdf` | The designer's original design document, where it all began |

## Play it

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`) and open the address on a phone.
It is made for a phone held upright or sideways; a computer with a mouse works too. Progress saves in the browser.

Add switches to the address to change what you get, for example `index.html?d34=0` for the older join-in games
in a panel. Every switch is listed in `docs/STATE.md`.

## Test it

```
npm install          # once; fetches three.js r128 for the tests
npm test             # every check; must pass before every push
node tests/run-one.js check-boot   # one check by name
```

The checks open the game in Chromium through Playwright at phone size. Playwright comes already installed in
Claude's cloud sessions; on another machine see `docs/TRANSFER.md`, "Setting up".

## The folders

| Folder | Holds |
|---|---|
| `index.html` | The game: code and all art, about 6.7 MB |
| `tests/` | The checks, the bots that play the game, and saved games from older versions |
| `tools/pixelart/` | The programs that draw the pixel art and put it into `index.html` |
| `tools/context-usage.py` | Measures how full a Claude session's memory is (a house rule needs it) |
| `plans/` | Plans, technical plans, art contracts, review pages, the designer's answers |
| `docs/` | The transfer guide, state, history, roadmap, and the original design PDF |
