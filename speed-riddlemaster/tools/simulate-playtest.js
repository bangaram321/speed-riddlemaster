// Generates SIMULATED playtest data (bots, NOT humans) so playtest/analyze.js can be exercised
// before real players exist.   node tools/simulate-playtest.js [games] > playtest/sample-data.SIMULATED.json
const Matcher = require('../js/matcher.js');
const R = require('../js/riddles.js');
const N = +process.argv[2] || 40;
let seed = 99; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const knowP = { 1: .88, 2: .62, 3: .36 };
const junk = ['dog', 'cat', 'water', 'time', 'a big thing', 'idk', 'pasta', 'door'];
function typo(w) { if (w.length < 5 || rnd() < .5) return w; const i = 1 + Math.floor(rnd() * (w.length - 2)); return w.slice(0, i) + w.slice(i + 1); }

const games = [];
for (let g = 0; g < N; g++) {
  const skill = 0.75 + rnd() * 0.5;
  const mix = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];
  let lives = 3, score = 0, solved = 0; const log = [];
  for (const d of mix) {
    if (lives <= 0) break;
    const r = pick(R.filter(x => x.d === d));
    const guesses = []; let out, sec;
    if (rnd() < Math.min(.97, knowP[d] * skill)) {
      const w = rnd() < .15 ? pick(r.acc.length ? r.acc : [r.a]) : r.a, t = typo(w);
      if (rnd() < .06) guesses.push({ t: 'it is a ' + w + ' i think maybe', s: 'correct' }); else guesses.push({ t, s: Matcher.check(r, t).status });
      out = 'ok'; sec = +(2 + rnd() * 14).toFixed(1); solved++; score += 100 + Math.round(100 * (20 - sec) / 20);
    } else if (rnd() < .3) { out = 'time'; sec = 20; lives--; }
    else {
      if (rnd() < .2) guesses.push({ t: 'a big green thing', s: 'multiword' });
      const t = rnd() < .25 ? r.a + 'x' + r.a.slice(-1) : pick(junk); guesses.push({ t, s: Matcher.check(r, t).status });
      out = 'bad'; sec = +(3 + rnd() * 15).toFixed(1); lives--;
    }
    log.push({ id: r.id, d, out, sec, fuzzy: guesses.some(x => x.s === 'correct' && x.t !== r.a && !(r.acc || []).includes(x.t) && Matcher.check(r, x.t).fuzzy), guesses });
  }
  const won = lives > 0;
  games.push({ v: 1, id: 'sim' + g, at: '2026-01-01T00:00:00Z', won, score, solved, lives, rank: won ? 'Inspector' : 'Junior Gumshoe', riddles: log,
    device: { w: 390, h: 800, touch: rnd() < .6, sound: true, music: true },
    ratings: { fun: 3 + Math.floor(rnd() * 3), funny: 3 + Math.floor(rnd() * 3), fair: 2 + Math.floor(rnd() * 4), time: 2 + Math.floor(rnd() * 4), look: 4 + Math.floor(rnd() * 2) },
    notes: rnd() < .1 ? 'SIMULATED note: the timer felt harsh on mobile' : '' });
}
process.stdout.write(JSON.stringify(games));
