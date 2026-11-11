// Check (placeholder, the D27 foundation): waiting, riders off, boarding, seating (deterministic seats), entering, walking coach to coach, punching every seat, the train refused until all are punched and the player is off, the same hash twice, a save mid-boarding reloads (plans/d27-tech.md 3 and 8.3).
// Owner: P (boarding and punching on board). The foundation wires this file into tests/run-all.js so the builders' checks land without touching the
// shared list; until its owner writes it, it passes with nothing checked. Replace the body, keep the export.
module.exports = async function CheckOnboard() {
  return [];
};
