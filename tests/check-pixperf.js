// Check (placeholder, the D27 foundation): the frame-time budget of plans/d27-tech.md 10.1 at the busiest scenes, portrait and landscape, with 4 times CPU throttling.
// Owner: R (the renderer). The foundation wires this file into tests/run-all.js so the builders' checks land without touching the
// shared list; until its owner writes it, it passes with nothing checked. Replace the body, keep the export.
module.exports = async function CheckPixperf() {
  return [];
};
