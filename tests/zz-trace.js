// Scratch (not committed): trace the M1 bot around a time window.
const { openGame, stopServer } = require('/home/user/traingame/.claude/worktrees/agent-a67fbef3f71ad6674/tests/browser');
const { BOT_SRC } = require('/home/user/traingame/.claude/worktrees/agent-a67fbef3f71ad6674/tests/m1-bot');
(async () => {
  const [d0, h0, h1] = process.argv.slice(2).map(Number);
  const { browser, page } = await openGame('portrait', { query: '?paused' });
  const out = await page.evaluate(([src, d0, h0, h1]) => {
    const R = window.__railhead, bot = (0, eval)('(' + src + ')')(R), S = R.newState(1866), log = []; if (d0 < 0) { R.simTick(S, [{ t: 'ttAssign', tr: 0, on: true }]); R.simTick(S, [{ t: 'throwSwitch', sw: 1 }]); d0 = 0; }
    const sod = () => (S.time + 18000) % 86400, day = () => Math.floor((S.time + 18000) / 86400);
    let lastWhy = '';
    for (let k = 0; k < 8 * 10800; k++) {
      const c = bot.decide(S), ev = R.simTick(S, c); bot.observe(S, ev);
      if (day() === d0 && sod() >= h0 * 3600 && sod() <= h1 * 3600) {
        const run = R.tt.ttRunOf(S, 0), P = S.player;
        const line = `${String(Math.floor(sod() / 3600)).padStart(2, '0')}:${String(Math.floor(sod() % 3600 / 60)).padStart(2, '0')} run ${run ? run.i + '/' + run.ph + ' ' + (run.why || '') : '-'} tr ${S.trains[0].mode} v${S.trains[0].v.toFixed(2)} sw${S.trains[0].swWait} ra${run && run.ra ? JSON.stringify(run.ra).slice(0, 120) : ''} st ${S.trains[0].status} sws ${S.track.switches.map(w => w.state + (w.lever || '')).join('')} | P ${P.x.toFixed(1)},${P.z.toFixed(1)} ${P.mode}${P.ride ? ' ride' : ''}${P.act ? ' act ' + P.act.k : ''} | ${c.length ? JSON.stringify(c[0]) + ' ' + (bot.mem.last && bot.mem.last.why) : ''} ${ev.filter(e => /Refused|blocked|switch|tt/.test(e.t)).map(e => e.t + ':' + (e.why || '')).join(',')}`;
        if (c.length || line.split('|')[0] !== lastWhy || ev.some(e => /Refused|blocked|tt/.test(e.t))) log.push(line);
        lastWhy = line.split('|')[0];
      }
      if (day() > d0) break;
    }
    return log;
  }, [BOT_SRC, d0, h0, h1]);
  console.log(out.join('\n'));
  await browser.close(); stopServer();
})();
