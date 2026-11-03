// D20: switches are manual. Checks written before D20 run trains over switches that the game used to set by itself.
// useSwitchman(page) makes the page's test hooks act as if a switchman stood at every switch: each tick run through
// __railhead.simTick or __railhead.step first throws the switches the trains' routes still need (ttSwitchman, the
// first switch ahead each route needs thrown, when it is free). The game itself is unchanged; a check that is about
// switches (check-switches.js, check-trains.js) does not use this.
async function useSwitchman(page) {
  await page.evaluate(() => {
    const R = window.__railhead;
    if (R.__switchman) return;
    R.__switchman = true;
    const tick = R.simTick, step = R.step;
    R.simTick = (st, cmds) => tick(st, (cmds || []).concat(R.tt.ttSwitchman(st)));
    R.simRun = (st, script, ticks) => {
      const by = {};
      for (const s of script || []) (by[s.tick] = by[s.tick] || []).push(s.cmd);
      for (let i = 0; i < ticks; i++) R.simTick(st, by[st.tick] || []);
      return st;
    };
    R.step = n => { for (let i = 0; i < n; i++) { for (const c of R.tt.ttSwitchman(R.state)) R.send(c); step.call(R, 1); } };
  });
}
module.exports = { useSwitchman };
