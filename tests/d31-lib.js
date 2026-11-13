// Shared by check-d31.js: brings a fresh default game (lessons on) to the moment the first freight (f1) stands, with the
// careful bot playing everything before it, so the freight can then be handled by real taps.
const { PROTO_BOT_SRC } = require('./proto-bot');
async function toFirstFreight(page) {
  await page.evaluate(src => { window.__botsrc = src; }, PROTO_BOT_SRC);
  return page.evaluate(() => {
    const R = window.__railhead, S = R.state, bot = (0, eval)('(' + window.__botsrc + ')')(R);
    for (let k = 0; k < 4000; k++) {
      const ev = R.simTick(S, bot.decide(S));
      bot.observe(S, ev);
      const a = ev.find(e => e.t === 'rrArrived' && S.rr.runs.find(r => r.id === e.run && r.kind === 'freight'));
      if (a) return { run: a.run, tick: S.tick, time: S.time };
    }
    return null;
  });
}
module.exports = { toFirstFreight };
