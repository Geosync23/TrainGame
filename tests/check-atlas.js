// Check (placeholder, the D27 foundation): every atlas key the code asks for exists, and the atlas budget (700 KB of base64, target 600; plans/d27-tech.md 7.4).
// Owner: the integrator. The foundation wires this file into tests/run-all.js so the builders' checks land without touching the
// shared list; until its owner writes it, it passes with nothing checked. Replace the body, keep the export.
module.exports = async function CheckAtlas() {
  return [];
};
