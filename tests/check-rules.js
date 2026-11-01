// Check: house rules that can be read straight from the source.
// - No Math.random(): all randomness must go through the game's seeded generator,
//   so the same start always gives the same result.

const fs = require('fs');
const path = require('path');

module.exports = async function checkRules() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const problems = [];
  src.split('\n').forEach((line, i) => {
    if (/Math\.random\s*\(/.test(line)) problems.push(`index.html line ${i + 1}: uses Math.random()`);
  });
  return problems;
};
